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

  // Initialization
  _initStorage() {
    const keys = [
      'blog_articles',
      'reading_list_collections',
      'reading_list_items',
      'learning_paths',
      'learning_path_items',
      'article_comments',
      'services',
      'service_consultation_requests',
      'service_plans',
      'service_pricing_contact_requests',
      'case_studies',
      'case_study_compare_lists',
      'case_study_compare_items',
      'events',
      'webinar_registrations',
      'resources',
      'resource_requests',
      'case_study_cta_requests',
      'general_contact_requests'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
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
    return data ? JSON.parse(data) : [];
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

  // Label helpers
  _getCategoryLabel(category) {
    switch (category) {
      case 'cloud_infrastructure':
        return 'Cloud & Infrastructure';
      case 'cybersecurity':
        return 'Cybersecurity';
      case 'remote_work_security':
        return 'Remote Work Security';
      case 'it_management':
        return 'IT Management';
      case 'other':
        return 'Other';
      default:
        return category || '';
    }
  }

  _getAudienceLabel(audience) {
    switch (audience) {
      case 'small_business':
        return 'Small business';
      case 'mid_sized_business':
        return 'Mid-sized business';
      case 'enterprise':
        return 'Enterprise';
      case 'all_sizes':
        return 'All company sizes';
      default:
        return audience || '';
    }
  }

  _getIndustryLabel(industry) {
    switch (industry) {
      case 'healthcare':
        return 'Healthcare';
      case 'finance':
        return 'Finance';
      case 'manufacturing':
        return 'Manufacturing';
      case 'retail':
        return 'Retail';
      case 'other':
        return 'Other';
      default:
        return industry || '';
    }
  }

  _getEventTypeLabel(eventType) {
    switch (eventType) {
      case 'webinar':
        return 'Webinar';
      case 'conference':
        return 'Conference';
      case 'workshop':
        return 'Workshop';
      case 'virtual_event':
        return 'Virtual event';
      case 'in_person_event':
        return 'In-person event';
      default:
        return eventType || '';
    }
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _normalizeSearchText(text) {
    return (text || '').toString().toLowerCase();
  }

  _normalizeEnumValue(raw) {
    if (!raw) return null;
    let s = String(raw).trim();
    if (!s) return null;
    // already looks like enum
    if (/^[a-z0-9_]+$/.test(s)) return s;
    s = s.toLowerCase();
    s = s.replace(/\s+/g, '_');
    s = s.replace(/-/g, '_');
    s = s.replace(/\+/g, '_plus');
    s = s.replace(/employees/g, '').trim();
    s = s.replace(/_{2,}/g, '_');
    if (s.endsWith('_')) s = s.slice(0, -1);
    return s;
  }

  // Helper: get or create default Reading List
  _getOrCreateDefaultReadingList() {
    const collections = this._getFromStorage('reading_list_collections');
    let items = this._getFromStorage('reading_list_items');
    let collection = collections.find(function (c) { return c.is_default === true; });
    const now = this._nowIso();

    if (!collection) {
      collection = {
        id: this._generateId('rlc'),
        name: 'My Reading List',
        description: '',
        is_default: true,
        created_at: now,
        updated_at: now
      };
      collections.push(collection);
      this._saveToStorage('reading_list_collections', collections);
    }

    const collectionItems = items.filter(function (it) { return it.collection_id === collection.id; });
    return { collection: collection, items: collectionItems };
  }

  // Helper: get or create default Learning Path
  _getOrCreateDefaultLearningPath(learningPathName) {
    const paths = this._getFromStorage('learning_paths');
    let items = this._getFromStorage('learning_path_items');
    let path = paths[0] || null;
    const now = this._nowIso();

    if (!path) {
      path = {
        id: this._generateId('lp'),
        name: learningPathName || 'My Learning Path',
        description: '',
        created_at: now,
        updated_at: now
      };
      paths.push(path);
      this._saveToStorage('learning_paths', paths);
    } else if (learningPathName && path.name !== learningPathName) {
      path.name = learningPathName;
      path.updated_at = now;
      this._saveToStorage('learning_paths', paths);
    }

    const pathItems = items.filter(function (it) { return it.learning_path_id === path.id; });
    return { learning_path: path, items: pathItems };
  }

  // Helper: get or create Case Study compare list
  _getOrCreateCaseStudyCompareList() {
    const lists = this._getFromStorage('case_study_compare_lists');
    let list = lists[0] || null;
    const now = this._nowIso();

    if (!list) {
      list = {
        id: this._generateId('cscmp'),
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('case_study_compare_lists', lists);
    }

    const items = this._getFromStorage('case_study_compare_items').filter(function (it) {
      return it.compare_list_id === list.id;
    });

    return { compare_list: list, items: items };
  }

  // Helper: internal managed IT service pricing calculation
  _calculateManagedITServicePriceInternal(service, plan_code, employees_count, contract_term_months) {
    if (!service) return null;
    const plans = this._getFromStorage('service_plans');
    const plan = plans.find(function (p) {
      return p.service_id === service.id && p.code === plan_code;
    });
    if (!plan) return null;

    const pricePerEmployee = Number(plan.price_per_employee || 0);
    const baseMonthlyFee = Number(plan.base_monthly_fee || 0);
    const employees = Number(employees_count || 0);
    const termMonths = Number(contract_term_months || 0);

    if (employees <= 0 || termMonths <= 0) return null;

    const perEmployeeTotal = pricePerEmployee * employees;
    const subtotal = baseMonthlyFee + perEmployeeTotal;

    // Simple discount model: no discount unless explicit business rules are added later
    const discountsApplied = 0;
    const estimatedMonthlyCost = subtotal - discountsApplied;

    return {
      success: true,
      plan_code: plan.code,
      employees_count: employees,
      contract_term_months: termMonths,
      estimated_monthly_cost: estimatedMonthlyCost,
      breakdown: {
        base_monthly_fee: baseMonthlyFee,
        per_employee_total: perEmployeeTotal,
        discounts_applied: discountsApplied
      }
    };
  }

  // Helper: site-wide search index
  _searchContentIndex(query, filters) {
    const q = this._normalizeSearchText(query || '');
    const contentTypesFilter = filters && Array.isArray(filters.content_types) && filters.content_types.length
      ? filters.content_types
      : ['blog_article', 'case_study', 'resource', 'event'];

    const results = [];

    const includeType = function (type) {
      return contentTypesFilter.indexOf(type) !== -1;
    };

    // Blog articles
    if (includeType('blog_article')) {
      const articles = this._getFromStorage('blog_articles');
      for (let i = 0; i < articles.length; i++) {
        const a = articles[i];
        const haystack = [a.title, a.subtitle, a.summary, a.content].join(' ').toLowerCase();
        const tags = (a.tags || []).join(' ').toLowerCase();
        if (!q || haystack.indexOf(q) !== -1 || tags.indexOf(q) !== -1) {
          results.push({
            content_type: 'blog_article',
            title: a.title,
            slug: a.slug,
            snippet: a.summary || '',
            published_at: a.published_at || null,
            start_datetime: null,
            category_or_industry: this._getCategoryLabel(a.category),
            tags: a.tags || [],
            location: 'blog'
          });
        }
      }
    }

    // Case studies
    if (includeType('case_study')) {
      const studies = this._getFromStorage('case_studies');
      for (let i = 0; i < studies.length; i++) {
        const cs = studies[i];
        const haystack = [cs.title, cs.summary, cs.content].join(' ').toLowerCase();
        if (!q || haystack.indexOf(q) !== -1) {
          results.push({
            content_type: 'case_study',
            title: cs.title,
            slug: cs.slug,
            snippet: cs.summary || '',
            published_at: cs.published_at || null,
            start_datetime: null,
            category_or_industry: this._getIndustryLabel(cs.industry),
            tags: [],
            location: 'case_studies'
          });
        }
      }
    }

    // Resources
    if (includeType('resource')) {
      const resources = this._getFromStorage('resources');
      for (let i = 0; i < resources.length; i++) {
        const r = resources[i];
        const haystack = [r.title, r.description].join(' ').toLowerCase();
        const tags = (r.topic_tags || []).join(' ').toLowerCase();
        if (!q || haystack.indexOf(q) !== -1 || tags.indexOf(q) !== -1) {
          results.push({
            content_type: 'resource',
            title: r.title,
            slug: r.slug,
            snippet: r.description || '',
            published_at: null,
            start_datetime: null,
            category_or_industry: r.resource_type || '',
            tags: r.topic_tags || [],
            location: 'resources'
          });
        }
      }
    }

    // Events
    if (includeType('event')) {
      const events = this._getFromStorage('events');
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        const haystack = [ev.title, ev.description].join(' ').toLowerCase();
        const tags = (ev.topic_tags || []).join(' ').toLowerCase();
        if (!q || haystack.indexOf(q) !== -1 || tags.indexOf(q) !== -1) {
          results.push({
            content_type: 'event',
            title: ev.title,
            slug: ev.slug,
            snippet: ev.description || '',
            published_at: null,
            start_datetime: ev.start_datetime || null,
            category_or_industry: this._getEventTypeLabel(ev.event_type),
            tags: ev.topic_tags || [],
            location: 'events'
          });
        }
      }
    }

    return results;
  }

  // Interface: getHomeHeroContent
  getHomeHeroContent() {
    const stored = localStorage.getItem('home_hero_content');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fall through to default
      }
    }
    return {
      hero_title: 'Modern IT services for growing businesses',
      hero_subtitle: 'Cloud, security, and remote work expertise for SMBs',
      hero_body: 'Optimize your cloud spend, harden your cybersecurity posture, and support remote teams with an IT partner focused on business outcomes.',
      primary_cta_label: 'Explore services',
      primary_cta_destination: 'services_overview'
    };
  }

  // Interface: getHomeFeaturedBlogArticles
  getHomeFeaturedBlogArticles(limit) {
    const max = typeof limit === 'number' && limit > 0 ? limit : 3;
    const articles = this._getFromStorage('blog_articles');
    const sorted = articles
      .filter(function (a) { return !!a.is_featured; })
      .sort((a, b) => {
        const da = this._parseDate(a.published_at) || new Date(0);
        const db = this._parseDate(b.published_at) || new Date(0);
        return db - da;
      });

    const slice = sorted.slice(0, max);
    return slice.map(function (a) {
      return {
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        category: a.category,
        category_label: this._getCategoryLabel(a.category),
        audience_segment: a.audience_segment,
        audience_label: this._getAudienceLabel(a.audience_segment),
        published_at: a.published_at,
        is_featured: !!a.is_featured
      };
    }.bind(this));
  }

  // Interface: getHomeFeaturedCaseStudies
  getHomeFeaturedCaseStudies(limit) {
    const max = typeof limit === 'number' && limit > 0 ? limit : 3;
    const studies = this._getFromStorage('case_studies');
    const sorted = studies.sort((a, b) => {
      const da = this._parseDate(a.published_at) || new Date(0);
      const db = this._parseDate(b.published_at) || new Date(0);
      return db - da;
    });
    const slice = sorted.slice(0, max);
    return slice.map(function (cs) {
      return {
        title: cs.title,
        slug: cs.slug,
        summary: cs.summary,
        industry: cs.industry,
        industry_label: this._getIndustryLabel(cs.industry),
        downtime_reduction_percent: typeof cs.downtime_reduction_percent === 'number' ? cs.downtime_reduction_percent : null,
        cost_savings_percent: typeof cs.cost_savings_percent === 'number' ? cs.cost_savings_percent : null
      };
    }.bind(this));
  }

  // Interface: getHomeUpcomingEvents
  getHomeUpcomingEvents(limit) {
    const max = typeof limit === 'number' && limit > 0 ? limit : 3;
    const events = this._getFromStorage('events');
    const now = new Date();
    const upcoming = events
      .filter(function (ev) {
        const start = new Date(ev.start_datetime || 0);
        return !!ev.registration_open && !isNaN(start.getTime()) && start >= now;
      })
      .sort(function (a, b) {
        const da = new Date(a.start_datetime || 0);
        const db = new Date(b.start_datetime || 0);
        return da - db;
      });
    const slice = upcoming.slice(0, max);
    return slice.map(function (ev) {
      return {
        title: ev.title,
        slug: ev.slug,
        description: ev.description,
        event_type: ev.event_type,
        start_datetime: ev.start_datetime,
        timezone: ev.timezone || '',
        registration_open: !!ev.registration_open,
        is_webinar: ev.event_type === 'webinar'
      };
    });
  }

  // Interface: getBlogFilterOptions
  getBlogFilterOptions() {
    const articles = this._getFromStorage('blog_articles');

    const categories = [
      { value: 'cloud_infrastructure', label: 'Cloud & Infrastructure' },
      { value: 'cybersecurity', label: 'Cybersecurity' },
      { value: 'remote_work_security', label: 'Remote Work Security' },
      { value: 'it_management', label: 'IT Management' },
      { value: 'other', label: 'Other' }
    ];

    const audience_segments = [
      { value: 'small_business', label: 'Small business', company_size_label: '1–50 employees' },
      { value: 'mid_sized_business', label: 'Mid-sized business', company_size_label: '50–200 employees' },
      { value: 'enterprise', label: 'Enterprise', company_size_label: '200+ employees' },
      { value: 'all_sizes', label: 'All company sizes', company_size_label: '' }
    ];

    const yearsSet = new Set();
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      const d = this._parseDate(a.published_at);
      if (d) yearsSet.add(d.getUTCFullYear());
    }
    const years = Array.from(yearsSet).sort(function (a, b) { return a - b; });

    const now = new Date();
    const last12 = new Date(now.getTime());
    last12.setMonth(last12.getMonth() - 12);

    const date_presets = [];
    date_presets.push({
      value: 'last_12_months',
      label: 'Last 12 months',
      start_date: last12.toISOString().slice(0, 10),
      end_date: now.toISOString().slice(0, 10)
    });

    for (let i = 0; i < years.length; i++) {
      const y = years[i];
      date_presets.push({
        value: 'year_' + y,
        label: String(y),
        start_date: y + '-01-01',
        end_date: y + '-12-31'
      });
    }

    return {
      categories: categories,
      audience_segments: audience_segments,
      date_presets: date_presets,
      years: years
    };
  }

  // Interface: searchBlogArticles
  searchBlogArticles(query, filters, page, pageSize) {
    const articles = this._getFromStorage('blog_articles');
    let result = articles.slice();

    const q = this._normalizeSearchText(query || '');
    if (q) {
      result = result.filter(function (a) {
        const text = [a.title, a.subtitle, a.summary, a.content].join(' ').toLowerCase();
        const tags = (a.tags || []).join(' ').toLowerCase();
        return text.indexOf(q) !== -1 || tags.indexOf(q) !== -1;
      });
    }

    const f = filters || {};

    if (f.category) {
      result = result.filter(function (a) { return a.category === f.category; });
    }

    if (f.audience_segment) {
      result = result.filter(function (a) { return a.audience_segment === f.audience_segment; });
    }

    // Date preset handling
    let publishedFrom = f.published_from || null;
    let publishedTo = f.published_to || null;

    if (f.date_preset && (!publishedFrom && !publishedTo)) {
      if (f.date_preset === 'last_12_months') {
        const now = new Date();
        const last12 = new Date(now.getTime());
        last12.setMonth(last12.getMonth() - 12);
        publishedFrom = last12.toISOString().slice(0, 10);
        publishedTo = now.toISOString().slice(0, 10);
      } else if (f.date_preset.indexOf('year_') === 0) {
        const year = parseInt(f.date_preset.slice(5), 10);
        if (!isNaN(year)) {
          publishedFrom = year + '-01-01';
          publishedTo = year + '-12-31';
        }
      }
    }

    const fromDate = this._parseDate(publishedFrom);
    const toDate = this._parseDate(publishedTo);

    if (fromDate || toDate) {
      result = result.filter(function (a) {
        const d = new Date(a.published_at || 0);
        if (isNaN(d.getTime())) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate) {
          const toEnd = new Date(toDate.getTime());
          toEnd.setDate(toEnd.getDate() + 1);
          if (d >= toEnd) return false;
        }
        return true;
      });
    }

    // Company size overlap filter
    const csMin = typeof f.company_size_min === 'number' ? f.company_size_min : null;
    const csMax = typeof f.company_size_max === 'number' ? f.company_size_max : null;

    if (csMin !== null || csMax !== null) {
      result = result.filter(function (a) {
        const aMin = typeof a.company_size_min === 'number' ? a.company_size_min : null;
        const aMax = typeof a.company_size_max === 'number' ? a.company_size_max : null;
        if (aMin === null && aMax === null) return true;
        if (csMin !== null && aMax !== null && aMax < csMin) return false;
        if (csMax !== null && aMin !== null && aMin > csMax) return false;
        return true;
      });
    }

    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;
    const total = result.length;
    const start = (pageNum - 1) * size;
    const items = result.slice(start, start + size).map(function (a) {
      return {
        title: a.title,
        subtitle: a.subtitle,
        slug: a.slug,
        summary: a.summary,
        category: a.category,
        category_label: this._getCategoryLabel(a.category),
        audience_segment: a.audience_segment,
        audience_label: this._getAudienceLabel(a.audience_segment),
        company_size_label: a.company_size_label || '',
        tags: a.tags || [],
        published_at: a.published_at
      };
    }.bind(this));

    return {
      items: items,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // Interface: getArticleDetails
  getArticleDetails(articleSlug) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.slug === articleSlug; }) || null;
    if (!article) {
      return {
        article: null,
        category_label: null,
        audience_label: null,
        read_time_minutes: 0,
        related_articles: [],
        related_resources: []
      };
    }

    const wordCount = article.content
      ? article.content.split(/\s+/).filter(function (w) { return !!w; }).length
      : 0;
    const readTime = Math.max(1, Math.round(wordCount / 200));

    const relatedArticles = articles
      .filter(function (a) {
        if (a.id === article.id) return false;
        if (a.category === article.category) return true;
        const tagsA = a.tags || [];
        const tagsRef = article.tags || [];
        const overlap = tagsA.some(function (t) { return tagsRef.indexOf(t) !== -1; });
        return overlap;
      })
      .sort((a, b) => {
        const da = new Date(a.published_at || 0);
        const db = new Date(b.published_at || 0);
        return db - da;
      })
      .slice(0, 3)
      .map(function (a) {
        return {
          title: a.title,
          slug: a.slug,
          category_label: this._getCategoryLabel(a.category),
          published_at: a.published_at
        };
      }.bind(this));

    const resources = this._getFromStorage('resources');
    const relatedResourceIds = article.related_resource_ids || [];
    const relatedResources = resources
      .filter(function (r) { return relatedResourceIds.indexOf(r.id) !== -1; })
      .map(function (r) {
        return {
          title: r.title,
          slug: r.slug,
          description: r.description,
          resource_type: r.resource_type
        };
      });

    return {
      article: article,
      category_label: this._getCategoryLabel(article.category),
      audience_label: this._getAudienceLabel(article.audience_segment),
      read_time_minutes: readTime,
      related_articles: relatedArticles,
      related_resources: relatedResources
    };
  }

  // Interface: getArticleComments
  getArticleComments(articleSlug, page, pageSize) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.slug === articleSlug; }) || null;
    if (!article) {
      return { items: [], total: 0, page: 1, pageSize: typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20 };
    }

    const comments = this._getFromStorage('article_comments').filter(function (c) {
      return c.article_id === article.id && c.status === 'published';
    }).sort(function (a, b) {
      const da = new Date(a.created_at || 0);
      const db = new Date(b.created_at || 0);
      return da - db;
    });

    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const total = comments.length;
    const start = (pageNum - 1) * size;
    const items = comments.slice(start, start + size).map(function (c) {
      return {
        author_name: c.author_name,
        body: c.body,
        created_at: c.created_at
      };
    });

    return {
      items: items,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // Interface: postArticleComment
  postArticleComment(articleSlug, author_name, author_email, body, website_url) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.slug === articleSlug; }) || null;
    if (!article) {
      return { success: false, message: 'Article not found', comment: null };
    }

    const comments = this._getFromStorage('article_comments');
    const now = this._nowIso();
    const comment = {
      id: this._generateId('cmt'),
      article_id: article.id,
      author_name: author_name,
      author_email: author_email,
      body: body,
      website_url: website_url || null,
      created_at: now,
      status: 'pending'
    };
    comments.push(comment);
    this._saveToStorage('article_comments', comments);

    return {
      success: true,
      message: 'Comment submitted and is pending moderation',
      comment: comment
    };
  }

  // Interface: saveArticleToReadingList
  saveArticleToReadingList(articleSlug) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.slug === articleSlug; }) || null;
    if (!article) {
      return { success: false, message: 'Article not found', collection_name: null, total_items: 0 };
    }

    const rl = this._getOrCreateDefaultReadingList();
    const collection = rl.collection;
    const items = this._getFromStorage('reading_list_items');
    const existing = items.find(function (it) {
      return it.collection_id === collection.id && it.article_id === article.id;
    });

    if (!existing) {
      const now = this._nowIso();
      items.push({
        id: this._generateId('rli'),
        collection_id: collection.id,
        article_id: article.id,
        added_at: now
      });
      this._saveToStorage('reading_list_items', items);
    }

    const total = items.filter(function (it) { return it.collection_id === collection.id; }).length;

    return {
      success: true,
      message: 'Article saved to reading list',
      collection_name: collection.name,
      total_items: total
    };
  }

  // Interface: addArticleToLearningPath
  addArticleToLearningPath(articleSlug, learningPathName) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.slug === articleSlug; }) || null;
    if (!article) {
      return { success: false, message: 'Article not found', learning_path_name: null, position: null, total_items: 0 };
    }

    const lpData = this._getOrCreateDefaultLearningPath(learningPathName);
    const learningPath = lpData.learning_path;
    const items = this._getFromStorage('learning_path_items');

    const existing = items.find(function (it) {
      return it.learning_path_id === learningPath.id && it.article_id === article.id;
    });

    if (existing) {
      const totalExisting = items.filter(function (it) { return it.learning_path_id === learningPath.id; }).length;
      return {
        success: true,
        message: 'Article is already in the learning path',
        learning_path_name: learningPath.name,
        position: existing.position,
        total_items: totalExisting
      };
    }

    const pathItems = items.filter(function (it) { return it.learning_path_id === learningPath.id; });
    const maxPosition = pathItems.reduce(function (max, it) {
      return it.position > max ? it.position : max;
    }, 0);

    const now = this._nowIso();
    const newItem = {
      id: this._generateId('lpi'),
      learning_path_id: learningPath.id,
      article_id: article.id,
      position: maxPosition + 1,
      added_at: now
    };
    items.push(newItem);
    this._saveToStorage('learning_path_items', items);

    const total = items.filter(function (it) { return it.learning_path_id === learningPath.id; }).length;

    return {
      success: true,
      message: 'Article added to learning path',
      learning_path_name: learningPath.name,
      position: newItem.position,
      total_items: total
    };
  }

  // Interface: getArticleShareInfo
  getArticleShareInfo(articleSlug) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.slug === articleSlug; }) || null;
    if (!article) {
      return { permalink: '', title: '' };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_shareAction', JSON.stringify({
        article_slug: article.slug,
        permalink: article.permalink || '',
        triggered_at: this._nowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      permalink: article.permalink || '',
      title: article.title
    };
  }

  // Interface: getReadingList
  getReadingList() {
    const rl = this._getOrCreateDefaultReadingList();
    const collection = rl.collection;
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('blog_articles');

    const collectionItems = items
      .filter(function (it) { return it.collection_id === collection.id; })
      .map(function (it) {
        const article = articles.find(function (a) { return a.id === it.article_id; }) || null;
        if (!article) return null;
        return {
          article_slug: article.slug,
          saved_at: it.added_at,
          title: article.title,
          summary: article.summary,
          category_label: this._getCategoryLabel(article.category),
          audience_label: this._getAudienceLabel(article.audience_segment),
          published_at: article.published_at
        };
      }.bind(this))
      .filter(function (x) { return x !== null; });

    return {
      collection: collection,
      items: collectionItems
    };
  }

  // Interface: removeArticleFromReadingList
  removeArticleFromReadingList(articleSlug) {
    const rl = this._getOrCreateDefaultReadingList();
    const collection = rl.collection;
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.slug === articleSlug; }) || null;
    if (!article) {
      const totalExisting = items.filter(function (it) { return it.collection_id === collection.id; }).length;
      return { success: false, message: 'Article not found', total_items: totalExisting };
    }

    const filtered = items.filter(function (it) {
      return !(it.collection_id === collection.id && it.article_id === article.id);
    });
    this._saveToStorage('reading_list_items', filtered);

    const total = filtered.filter(function (it) { return it.collection_id === collection.id; }).length;
    return {
      success: true,
      message: 'Article removed from reading list',
      total_items: total
    };
  }

  // Interface: getLearningPath
  getLearningPath() {
    const lpData = this._getOrCreateDefaultLearningPath();
    const learningPath = lpData.learning_path;
    const items = this._getFromStorage('learning_path_items');
    const articles = this._getFromStorage('blog_articles');

    const pathItems = items
      .filter(function (it) { return it.learning_path_id === learningPath.id; })
      .sort(function (a, b) {
        if (a.position === b.position) {
          const da = new Date(a.added_at || 0);
          const db = new Date(b.added_at || 0);
          return da - db;
        }
        return a.position - b.position;
      })
      .map(function (it) {
        const article = articles.find(function (a) { return a.id === it.article_id; }) || null;
        if (!article) return null;
        return {
          article_slug: article.slug,
          position: it.position,
          added_at: it.added_at,
          title: article.title,
          category: article.category,
          category_label: this._getCategoryLabel(article.category),
          is_cybersecurity: article.category === 'cybersecurity'
        };
      }.bind(this))
      .filter(function (x) { return x !== null; });

    return {
      learning_path: learningPath,
      items: pathItems
    };
  }

  // Interface: reorderLearningPath
  reorderLearningPath(orderedArticleSlugs) {
    if (!Array.isArray(orderedArticleSlugs) || !orderedArticleSlugs.length) {
      return { success: false, message: 'orderedArticleSlugs must be a non-empty array', items: [] };
    }

    const lpData = this._getOrCreateDefaultLearningPath();
    const learningPath = lpData.learning_path;
    const items = this._getFromStorage('learning_path_items');
    const articles = this._getFromStorage('blog_articles');

    const pathItems = items.filter(function (it) { return it.learning_path_id === learningPath.id; });
    const currentSlugs = pathItems.map(function (it) {
      const article = articles.find(function (a) { return a.id === it.article_id; }) || null;
      return article ? article.slug : null;
    }).filter(function (s) { return s !== null; });

    if (currentSlugs.length !== orderedArticleSlugs.length) {
      return { success: false, message: 'orderedArticleSlugs must include all current learning path items', items: [] };
    }

    const currentSet = currentSlugs.slice().sort().join('|');
    const orderedSet = orderedArticleSlugs.slice().sort().join('|');
    if (currentSet !== orderedSet) {
      return { success: false, message: 'orderedArticleSlugs must match the existing learning path items', items: [] };
    }

    const slugToArticleId = {};
    for (let i = 0; i < articles.length; i++) {
      slugToArticleId[articles[i].slug] = articles[i].id;
    }

    // Update positions
    for (let i = 0; i < orderedArticleSlugs.length; i++) {
      const slug = orderedArticleSlugs[i];
      const articleId = slugToArticleId[slug];
      const item = items.find(function (it) {
        return it.learning_path_id === learningPath.id && it.article_id === articleId;
      });
      if (item) {
        item.position = i + 1;
      }
    }

    this._saveToStorage('learning_path_items', items);

    const updatedPathItems = items
      .filter(function (it) { return it.learning_path_id === learningPath.id; })
      .sort(function (a, b) { return a.position - b.position; })
      .map(function (it) {
        const article = articles.find(function (a) { return a.id === it.article_id; }) || null;
        return Object.assign({}, it, {
          learning_path: learningPath,
          article: article
        });
      });

    return {
      success: true,
      message: 'Learning path reordered',
      items: updatedPathItems
    };
  }

  // Interface: removeArticleFromLearningPath
  removeArticleFromLearningPath(articleSlug) {
    const lpData = this._getOrCreateDefaultLearningPath();
    const learningPath = lpData.learning_path;
    const items = this._getFromStorage('learning_path_items');
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.slug === articleSlug; }) || null;

    if (!article) {
      const totalExisting = items.filter(function (it) { return it.learning_path_id === learningPath.id; }).length;
      return { success: false, message: 'Article not found', total_items: totalExisting };
    }

    const remaining = items.filter(function (it) {
      return !(it.learning_path_id === learningPath.id && it.article_id === article.id);
    });

    // Re-normalize positions for this learning path
    const pathItems = remaining.filter(function (it) { return it.learning_path_id === learningPath.id; })
      .sort(function (a, b) { return a.position - b.position; });
    for (let i = 0; i < pathItems.length; i++) {
      pathItems[i].position = i + 1;
    }

    this._saveToStorage('learning_path_items', remaining);

    const total = pathItems.length;
    return {
      success: true,
      message: 'Article removed from learning path',
      total_items: total
    };
  }

  // Interface: getServicesOverview
  getServicesOverview() {
    const services = this._getFromStorage('services');
    const items = services.map(function (s) {
      let typeLabel = '';
      switch (s.service_type) {
        case 'managed_it_services':
          typeLabel = 'Managed IT Services';
          break;
        case 'it_consulting':
          typeLabel = 'IT Consulting';
          break;
        case 'security_services':
          typeLabel = 'Security Services';
          break;
        case 'cloud_services':
          typeLabel = 'Cloud Services';
          break;
        case 'other':
          typeLabel = 'Other';
          break;
        default:
          typeLabel = s.service_type || '';
      }
      return {
        name: s.name,
        slug: s.slug,
        short_description: s.short_description,
        service_type: s.service_type,
        service_type_label: typeLabel,
        has_24_7_support: !!s.has_24_7_support,
        show_pricing_calculator: !!s.show_pricing_calculator
      };
    });

    return { services: items };
  }

  // Interface: getServiceDetails
  getServiceDetails(serviceSlug) {
    const services = this._getFromStorage('services');
    const service = services.find(function (s) { return s.slug === serviceSlug; }) || null;
    if (!service) {
      return {
        service: null,
        features: [],
        has_24_7_support: false,
        sections: {
          overview_heading: '',
          features_heading: '',
          pricing_heading: ''
        }
      };
    }

    const sections = {
      overview_heading: 'Overview',
      features_heading: 'Key features',
      pricing_heading: 'Pricing'
    };

    return {
      service: service,
      features: service.features || [],
      has_24_7_support: !!service.has_24_7_support,
      sections: sections
    };
  }

  // Interface: getServicePricingConfig
  getServicePricingConfig(serviceSlug) {
    const services = this._getFromStorage('services');
    const service = services.find(function (s) { return s.slug === serviceSlug; }) || null;
    if (!service) {
      return {
        show_pricing_calculator: false,
        plans: [],
        allowed_contract_terms: []
      };
    }

    const plansAll = this._getFromStorage('service_plans');
    const plans = plansAll
      .filter(function (p) { return p.service_id === service.id; })
      .map(function (p) {
        return Object.assign({}, p, { service: service });
      });

    const termsSet = new Set();
    for (let i = 0; i < plans.length; i++) {
      if (typeof plans[i].min_term_months === 'number' && plans[i].min_term_months > 0) {
        termsSet.add(plans[i].min_term_months);
      }
    }
    if (!termsSet.size) {
      termsSet.add(12);
    }
    const allowedTerms = Array.from(termsSet).sort(function (a, b) { return a - b; });

    return {
      show_pricing_calculator: !!service.show_pricing_calculator,
      plans: plans,
      allowed_contract_terms: allowedTerms
    };
  }

  // Interface: calculateServicePricing
  calculateServicePricing(serviceSlug, plan_code, employees_count, contract_term_months) {
    const services = this._getFromStorage('services');
    const service = services.find(function (s) { return s.slug === serviceSlug; }) || null;
    if (!service || !service.show_pricing_calculator) {
      return {
        success: false,
        plan_code: plan_code,
        employees_count: employees_count,
        contract_term_months: contract_term_months,
        estimated_monthly_cost: 0,
        breakdown: {
          base_monthly_fee: 0,
          per_employee_total: 0,
          discounts_applied: 0
        }
      };
    }

    const result = this._calculateManagedITServicePriceInternal(service, plan_code, employees_count, contract_term_months);
    if (!result) {
      return {
        success: false,
        plan_code: plan_code,
        employees_count: employees_count,
        contract_term_months: contract_term_months,
        estimated_monthly_cost: 0,
        breakdown: {
          base_monthly_fee: 0,
          per_employee_total: 0,
          discounts_applied: 0
        }
      };
    }
    return result;
  }

  // Interface: submitServiceConsultationRequest
  submitServiceConsultationRequest(serviceSlug, name, email, company_size_range, monthly_it_budget, message) {
    const services = this._getFromStorage('services');
    const service = services.find(function (s) { return s.slug === serviceSlug; }) || null;
    if (!service) {
      return { success: false, message: 'Service not found', request: null };
    }

    const requests = this._getFromStorage('service_consultation_requests');
    const now = this._nowIso();
    const req = {
      id: this._generateId('scr'),
      service_id: service.id,
      name: name,
      email: email,
      company_size_range: company_size_range || null,
      monthly_it_budget: typeof monthly_it_budget === 'number' ? monthly_it_budget : null,
      message: message || '',
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('service_consultation_requests', requests);

    return {
      success: true,
      message: 'Consultation request submitted',
      request: req
    };
  }

  // Interface: submitServicePricingContactRequest
  submitServicePricingContactRequest(serviceSlug, plan_code, employees_count, contract_term_months, estimated_monthly_cost, name, email, preferred_start_date) {
    const services = this._getFromStorage('services');
    const service = services.find(function (s) { return s.slug === serviceSlug; }) || null;
    if (!service) {
      return { success: false, message: 'Service not found', request: null };
    }

    let validatedCost = null;
    const calc = this.calculateServicePricing(serviceSlug, plan_code || 'standard', employees_count, contract_term_months || 12);
    if (calc && calc.success) {
      validatedCost = calc.estimated_monthly_cost;
    } else if (typeof estimated_monthly_cost === 'number') {
      validatedCost = estimated_monthly_cost;
    }

    const requests = this._getFromStorage('service_pricing_contact_requests');
    const now = this._nowIso();

    const req = {
      id: this._generateId('spcr'),
      service_id: service.id,
      plan_code: plan_code || null,
      employees_count: employees_count,
      contract_term_months: contract_term_months || null,
      estimated_monthly_cost: validatedCost,
      name: name,
      email: email,
      preferred_start_date: preferred_start_date ? new Date(preferred_start_date).toISOString() : null,
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('service_pricing_contact_requests', requests);

    return {
      success: true,
      message: 'Pricing contact request submitted',
      request: req
    };
  }

  // Interface: getCaseStudyFilterOptions
  getCaseStudyFilterOptions() {
    const industries = [
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'finance', label: 'Finance' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'retail', label: 'Retail' },
      { value: 'other', label: 'Other' }
    ];

    const flags = [
      { value: 'is_cloud_migration', label: 'Cloud migration' }
    ];

    return {
      industries: industries,
      flags: flags
    };
  }

  // Interface: searchCaseStudies
  searchCaseStudies(query, filters, page, pageSize) {
    const studies = this._getFromStorage('case_studies');
    let result = studies.slice();

    const q = this._normalizeSearchText(query || '');
    if (q) {
      result = result.filter(function (cs) {
        const text = [cs.title, cs.summary, cs.content].join(' ').toLowerCase();
        return text.indexOf(q) !== -1;
      });
    }

    const f = filters || {};
    if (f.industry) {
      result = result.filter(function (cs) { return cs.industry === f.industry; });
    }
    if (typeof f.is_cloud_migration === 'boolean') {
      result = result.filter(function (cs) { return !!cs.is_cloud_migration === f.is_cloud_migration; });
    }

    const fromDate = this._parseDate(f.published_from);
    const toDate = this._parseDate(f.published_to);
    if (fromDate || toDate) {
      result = result.filter(function (cs) {
        const d = new Date(cs.published_at || 0);
        if (isNaN(d.getTime())) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate) {
          const toEnd = new Date(toDate.getTime());
          toEnd.setDate(toEnd.getDate() + 1);
          if (d >= toEnd) return false;
        }
        return true;
      });
    }

    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;
    const total = result.length;
    const start = (pageNum - 1) * size;

    const items = result.slice(start, start + size).map(function (cs) {
      return {
        title: cs.title,
        slug: cs.slug,
        summary: cs.summary,
        industry: cs.industry,
        industry_label: this._getIndustryLabel(cs.industry),
        is_cloud_migration: !!cs.is_cloud_migration,
        downtime_reduction_percent: typeof cs.downtime_reduction_percent === 'number' ? cs.downtime_reduction_percent : null,
        cost_savings_percent: typeof cs.cost_savings_percent === 'number' ? cs.cost_savings_percent : null
      };
    }.bind(this));

    return {
      items: items,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // Interface: getCaseStudyDetails
  getCaseStudyDetails(caseStudySlug) {
    const studies = this._getFromStorage('case_studies');
    const cs = studies.find(function (c) { return c.slug === caseStudySlug; }) || null;
    const compareData = this._getOrCreateCaseStudyCompareList();
    const inCompare = cs
      ? compareData.items.some(function (it) { return it.case_study_id === cs.id; })
      : false;

    return {
      case_study: cs,
      industry_label: cs ? this._getIndustryLabel(cs.industry) : null,
      is_in_compare_list: inCompare
    };
  }

  // Interface: toggleCaseStudyCompare
  toggleCaseStudyCompare(caseStudySlug, add) {
    const studies = this._getFromStorage('case_studies');
    const cs = studies.find(function (c) { return c.slug === caseStudySlug; }) || null;
    if (!cs) {
      return { success: false, message: 'Case study not found', total_compared: 0, compared_slugs: [] };
    }

    const compareData = this._getOrCreateCaseStudyCompareList();
    const list = compareData.compare_list;
    const items = this._getFromStorage('case_study_compare_items');

    let changed = false;
    if (add) {
      const exists = items.some(function (it) {
        return it.compare_list_id === list.id && it.case_study_id === cs.id;
      });
      if (!exists) {
        items.push({
          id: this._generateId('cscmpi'),
          compare_list_id: list.id,
          case_study_id: cs.id,
          added_at: this._nowIso()
        });
        changed = true;
      }
    } else {
      const newItems = items.filter(function (it) {
        return !(it.compare_list_id === list.id && it.case_study_id === cs.id);
      });
      if (newItems.length !== items.length) {
        this._saveToStorage('case_study_compare_items', newItems);
        const comparedSlugs = newItems
          .filter(function (it) { return it.compare_list_id === list.id; })
          .map(function (it) {
            const s = studies.find(function (c) { return c.id === it.case_study_id; });
            return s ? s.slug : null;
          })
          .filter(function (s) { return s !== null; });
        return {
          success: true,
          message: 'Case study removed from comparison list',
          total_compared: comparedSlugs.length,
          compared_slugs: comparedSlugs
        };
      }
    }

    if (changed) {
      this._saveToStorage('case_study_compare_items', items);
    }

    const finalItems = this._getFromStorage('case_study_compare_items').filter(function (it) {
      return it.compare_list_id === list.id;
    });
    const comparedSlugs = finalItems.map(function (it) {
      const s = studies.find(function (c) { return c.id === it.case_study_id; });
      return s ? s.slug : null;
    }).filter(function (s) { return s !== null; });

    return {
      success: true,
      message: add ? 'Case study added to comparison list' : 'No changes to comparison list',
      total_compared: comparedSlugs.length,
      compared_slugs: comparedSlugs
    };
  }

  // Interface: getCaseStudyCompareSummary
  getCaseStudyCompareSummary() {
    const compareData = this._getOrCreateCaseStudyCompareList();
    const list = compareData.compare_list;
    const items = this._getFromStorage('case_study_compare_items').filter(function (it) {
      return it.compare_list_id === list.id;
    });
    const studies = this._getFromStorage('case_studies');

    const summaryItems = items.map(function (it) {
      const cs = studies.find(function (c) { return c.id === it.case_study_id; }) || null;
      if (!cs) return null;
      return {
        title: cs.title,
        slug: cs.slug,
        industry_label: this._getIndustryLabel(cs.industry)
      };
    }.bind(this)).filter(function (x) { return x !== null; });

    return {
      total_compared: summaryItems.length,
      items: summaryItems
    };
  }

  // Interface: getCaseStudyComparison
  getCaseStudyComparison() {
    const compareData = this._getOrCreateCaseStudyCompareList();
    const list = compareData.compare_list;
    const items = this._getFromStorage('case_study_compare_items').filter(function (it) {
      return it.compare_list_id === list.id;
    });
    const studies = this._getFromStorage('case_studies');

    const outItems = items.map(function (it) {
      const cs = studies.find(function (c) { return c.id === it.case_study_id; }) || null;
      if (!cs) return null;
      return {
        case_study: cs,
        industry_label: this._getIndustryLabel(cs.industry),
        downtime_reduction_percent: typeof cs.downtime_reduction_percent === 'number' ? cs.downtime_reduction_percent : null,
        migration_timeline_weeks: typeof cs.migration_timeline_weeks === 'number' ? cs.migration_timeline_weeks : null,
        cost_savings_percent: typeof cs.cost_savings_percent === 'number' ? cs.cost_savings_percent : null
      };
    }.bind(this)).filter(function (x) { return x !== null; });

    return { items: outItems };
  }

  // Interface: submitCaseStudyCTARequest
  submitCaseStudyCTARequest(caseStudySlug, cta_type, name, email, message) {
    const studies = this._getFromStorage('case_studies');
    const cs = studies.find(function (c) { return c.slug === caseStudySlug; }) || null;
    if (!cs) {
      return { success: false, message: 'Case study not found', request: null };
    }

    const requests = this._getFromStorage('case_study_cta_requests');
    const now = this._nowIso();
    const req = {
      id: this._generateId('csctar'),
      case_study_id: cs.id,
      cta_type: cta_type || cs.primary_cta_type || null,
      name: name || null,
      email: email || null,
      message: message || '',
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('case_study_cta_requests', requests);

    return {
      success: true,
      message: 'Request submitted',
      request: req
    };
  }

  // Interface: searchEvents
  searchEvents(query, filters, page, pageSize) {
    const events = this._getFromStorage('events');
    let result = events.slice();

    const q = this._normalizeSearchText(query || '');
    if (q) {
      result = result.filter(function (ev) {
        const text = [ev.title, ev.description].join(' ').toLowerCase();
        const tags = (ev.topic_tags || []).join(' ').toLowerCase();
        return text.indexOf(q) !== -1 || tags.indexOf(q) !== -1;
      });
    }

    const f = filters || {};
    const fromDate = this._parseDate(f.start_date);
    const toDate = this._parseDate(f.end_date);
    if (fromDate || toDate) {
      result = result.filter(function (ev) {
        const d = new Date(ev.start_datetime || 0);
        if (isNaN(d.getTime())) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate) {
          const toEnd = new Date(toDate.getTime());
          toEnd.setDate(toEnd.getDate() + 1);
          if (d >= toEnd) return false;
        }
        return true;
      });
    }

    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;
    const total = result.length;
    const start = (pageNum - 1) * size;
    const items = result.slice(start, start + size);

    return {
      items: items,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // Interface: getEventDetails
  getEventDetails(eventSlug) {
    const events = this._getFromStorage('events');
    const ev = events.find(function (e) { return e.slug === eventSlug; }) || null;
    if (!ev) {
      return { event: null, is_webinar: false };
    }
    const isWebinar = ev.event_type === 'webinar' || ev.event_type === 'virtual_event';
    return {
      event: ev,
      is_webinar: isWebinar
    };
  }

  // Interface: registerForEvent
  registerForEvent(eventSlug, full_name, email, job_role, company_size_range) {
    const events = this._getFromStorage('events');
    const ev = events.find(function (e) { return e.slug === eventSlug; }) || null;
    if (!ev) {
      return { success: false, message: 'Event not found', registration: null, calendar_download_available: false };
    }
    if (!ev.registration_open) {
      return { success: false, message: 'Registration is closed for this event', registration: null, calendar_download_available: false };
    }

    const regs = this._getFromStorage('webinar_registrations');
    const now = this._nowIso();

    const normalizedJobRole = job_role ? this._normalizeEnumValue(job_role) : null;
    const normalizedCompanySize = company_size_range ? this._normalizeEnumValue(company_size_range) : null;

    const reg = {
      id: this._generateId('wr'),
      event_id: ev.id,
      full_name: full_name,
      email: email,
      job_role: normalizedJobRole,
      company_size_range: normalizedCompanySize,
      registered_at: now
    };

    regs.push(reg);
    this._saveToStorage('webinar_registrations', regs);

    const isWebinar = ev.event_type === 'webinar' || ev.event_type === 'virtual_event';

    return {
      success: true,
      message: 'Registration successful',
      registration: reg,
      calendar_download_available: isWebinar
    };
  }

  // Interface: getResourceDetails
  getResourceDetails(resourceSlug) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find(function (r) { return r.slug === resourceSlug; }) || null;
    return { resource: resource || null };
  }

  // Interface: requestResourceAccess
  requestResourceAccess(resourceSlug, name, email, role, notes_message) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find(function (r) { return r.slug === resourceSlug; }) || null;
    if (!resource) {
      return { success: false, message: 'Resource not found', request: null };
    }

    const requests = this._getFromStorage('resource_requests');
    const now = this._nowIso();
    const req = {
      id: this._generateId('rr'),
      resource_id: resource.id,
      name: name,
      email: email,
      role: role ? this._normalizeEnumValue(role) : null,
      notes_message: notes_message || '',
      requested_at: now
    };

    requests.push(req);
    this._saveToStorage('resource_requests', requests);

    return {
      success: true,
      message: 'Resource access requested',
      request: req
    };
  }

  // Interface: searchSiteContent
  searchSiteContent(query, filters, sort_by, page, pageSize) {
    const sortBy = sort_by || 'relevance';
    const resultsAll = this._searchContentIndex(query, filters || {});
    const q = this._normalizeSearchText(query || '');

    const scoreFor = function (item) {
      if (!q) return 0;
      const title = (item.title || '').toLowerCase();
      const snippet = (item.snippet || '').toLowerCase();
      let score = 0;
      if (title.indexOf(q) !== -1) score += 3;
      if (snippet.indexOf(q) !== -1) score += 1;
      return score;
    };

    const dateValue = function (item) {
      if (item.content_type === 'event') {
        const d = new Date(item.start_datetime || 0);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }
      if (item.published_at) {
        const d = new Date(item.published_at);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }
      return 0;
    };

    if (sortBy === 'date_desc') {
      resultsAll.sort(function (a, b) { return dateValue(b) - dateValue(a); });
    } else if (sortBy === 'date_asc') {
      resultsAll.sort(function (a, b) { return dateValue(a) - dateValue(b); });
    } else {
      resultsAll.sort(function (a, b) { return scoreFor(b) - scoreFor(a); });
    }

    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;
    const total = resultsAll.length;
    const start = (pageNum - 1) * size;
    const results = resultsAll.slice(start, start + size);

    return {
      results: results,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // Interface: submitGeneralContactRequest
  submitGeneralContactRequest(name, email, subject, message) {
    const requests = this._getFromStorage('general_contact_requests');
    const now = this._nowIso();
    const req = {
      id: this._generateId('gcr'),
      name: name,
      email: email,
      subject: subject || '',
      message: message,
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('general_contact_requests', requests);

    return {
      success: true,
      message: 'Contact request submitted',
      request: req
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
