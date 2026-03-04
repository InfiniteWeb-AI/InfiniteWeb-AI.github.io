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
    // Initialize all data tables in localStorage if they do not exist
    const keys = [
      'tools',
      'tool_categories',
      'article_categories',
      'articles',
      'article_tool_references',
      'newsletter_subscriptions',
      'comments',
      'saved_tools',
      'comparison_sets',
      'startup_stack_recommendations',
      'startup_stack_recommendation_items',
      'contact_messages'
    ];

    for (const key of keys) {
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
      const parsed = JSON.parse(data);
      return parsed || [];
    } catch (e) {
      return [];
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // Helpers required by spec

  _getOrCreateSavedToolsStore() {
    let saved = this._getFromStorage('saved_tools');
    if (!Array.isArray(saved)) {
      saved = [];
      this._saveToStorage('saved_tools', saved);
    }
    return saved;
  }

  _getOrCreateComparisonSet() {
    let sets = this._getFromStorage('comparison_sets');
    let active = sets.find(function (s) { return s.is_active; });
    if (!active) {
      active = {
        id: this._generateId('comparison'),
        tool_ids: [],
        created_at: new Date().toISOString(),
        updated_at: null,
        is_active: true
      };
      sets.push(active);
      this._saveToStorage('comparison_sets', sets);
    }
    return active;
  }

  _createNewsletterSubscriptionRecord(email, topics, company_size_segment, source_page_type, source_article_id) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');
    const subscription = {
      id: this._generateId('newsletter'),
      email: email,
      topics: Array.isArray(topics) ? topics : [],
      company_size_segment: company_size_segment || null,
      created_at: new Date().toISOString(),
      source_page_type: source_page_type,
      source_article_id: source_article_id || null,
      is_confirmed: false
    };
    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);
    return subscription;
  }

  _createCommentRecord(articleId, name, email, body) {
    const comments = this._getFromStorage('comments');
    const comment = {
      id: this._generateId('comment'),
      article_id: articleId,
      name: name,
      email: email,
      body: body,
      created_at: new Date().toISOString(),
      status: 'pending',
      parent_comment_id: null,
      is_author_reply: false
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);
    return comment;
  }

  _applyToolListingFiltersAndSort(tools, filters, sort_by, sort_direction) {
    const f = filters || {};
    let result = tools.slice();

    if (Array.isArray(f.team_size_segments) && f.team_size_segments.length) {
      result = result.filter(function (t) {
        if (!Array.isArray(t.supported_company_sizes) || !t.supported_company_sizes.length) {
          return false;
        }
        return t.supported_company_sizes.some(function (size) {
          return f.team_size_segments.indexOf(size) !== -1;
        });
      });
    }

    if (typeof f.min_price_per_user_month === 'number') {
      result = result.filter(function (t) {
        return typeof t.starting_price_per_user_month === 'number' && t.starting_price_per_user_month >= f.min_price_per_user_month;
      });
    }

    if (typeof f.max_price_per_user_month === 'number') {
      result = result.filter(function (t) {
        return typeof t.starting_price_per_user_month === 'number' && t.starting_price_per_user_month <= f.max_price_per_user_month;
      });
    }

    if (typeof f.min_flat_monthly_price === 'number') {
      result = result.filter(function (t) {
        return typeof t.starting_price_per_month === 'number' && t.starting_price_per_month >= f.min_flat_monthly_price;
      });
    }

    if (typeof f.max_flat_monthly_price === 'number') {
      result = result.filter(function (t) {
        return typeof t.starting_price_per_month === 'number' && t.starting_price_per_month <= f.max_flat_monthly_price;
      });
    }

    if (Array.isArray(f.billing_models) && f.billing_models.length) {
      result = result.filter(function (t) {
        return t.billing_model && f.billing_models.indexOf(t.billing_model) !== -1;
      });
    }

    if (typeof f.has_free_forever_plan === 'boolean') {
      result = result.filter(function (t) {
        return !!t.has_free_forever_plan === f.has_free_forever_plan;
      });
    }

    if (typeof f.supports_unlimited_invoices === 'boolean') {
      result = result.filter(function (t) {
        return !!t.supports_unlimited_invoices === f.supports_unlimited_invoices;
      });
    }

    if (typeof f.supports_multi_currency === 'boolean') {
      result = result.filter(function (t) {
        return !!t.supports_multi_currency === f.supports_multi_currency;
      });
    }

    if (typeof f.includes_live_chat === 'boolean') {
      result = result.filter(function (t) {
        return !!t.includes_live_chat === f.includes_live_chat;
      });
    }

    if (typeof f.includes_time_tracking === 'boolean') {
      result = result.filter(function (t) {
        return !!t.includes_time_tracking === f.includes_time_tracking;
      });
    }

    if (Array.isArray(f.integrations) && f.integrations.length) {
      result = result.filter(function (t) {
        if (!Array.isArray(t.integrations) || !t.integrations.length) return false;
        return f.integrations.every(function (intKey) {
          return t.integrations.indexOf(intKey) !== -1;
        });
      });
    }

    if (typeof f.team_type === 'string' && f.team_type) {
      result = result.filter(function (t) {
        return t.team_type === f.team_type;
      });
    }

    if (typeof f.min_rating === 'number') {
      result = result.filter(function (t) {
        return typeof t.average_rating === 'number' && t.average_rating >= f.min_rating;
      });
    }

    const dir = (sort_direction === 'asc' || sort_direction === 'desc') ? sort_direction : 'asc';
    const factor = dir === 'asc' ? 1 : -1;
    const sortField = sort_by || 'rating';

    result.sort((a, b) => {
      let va;
      let vb;
      switch (sortField) {
        case 'name':
          va = (a.name || '').toLowerCase();
          vb = (b.name || '').toLowerCase();
          if (va < vb) return -1 * factor;
          if (va > vb) return 1 * factor;
          return 0;
        case 'price_per_user':
          va = typeof a.starting_price_per_user_month === 'number' ? a.starting_price_per_user_month : Number.MAX_VALUE;
          vb = typeof b.starting_price_per_user_month === 'number' ? b.starting_price_per_user_month : Number.MAX_VALUE;
          break;
        case 'price_flat':
          va = typeof a.starting_price_per_month === 'number' ? a.starting_price_per_month : Number.MAX_VALUE;
          vb = typeof b.starting_price_per_month === 'number' ? b.starting_price_per_month : Number.MAX_VALUE;
          break;
        case 'rating':
        default:
          va = typeof a.average_rating === 'number' ? a.average_rating : 0;
          vb = typeof b.average_rating === 'number' ? b.average_rating : 0;
          break;
      }
      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return 0;
    });

    return result;
  }

  _applyArticleListingFiltersAndSort(articles, filters, sort_by, sort_direction) {
    const f = filters || {};
    let result = articles.slice();

    if (typeof f.timeframe === 'string' && f.timeframe && f.timeframe !== 'all_time') {
      const now = new Date();
      if (f.timeframe === 'last_30_days') {
        const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        result = result.filter(a => {
          const d = this._parseDate(a.publish_date);
          return d && d >= cutoff;
        });
      } else {
        let months = 0;
        if (f.timeframe === 'last_3_months') months = 3;
        else if (f.timeframe === 'last_6_months') months = 6;
        else if (f.timeframe === 'last_12_months') months = 12;
        if (months > 0) {
          const cutoff = new Date(now.getTime());
          cutoff.setMonth(cutoff.getMonth() - months);
          result = result.filter(a => {
            const d = this._parseDate(a.publish_date);
            return d && d >= cutoff;
          });
        }
      }
    }

    if (typeof f.target_company_size_segment === 'string' && f.target_company_size_segment) {
      result = result.filter(a => a.target_company_size_segment === f.target_company_size_segment);
    }

    if (typeof f.min_rating === 'number') {
      result = result.filter(a => typeof a.rating === 'number' && a.rating >= f.min_rating);
    }

    if (typeof f.max_reading_time_minutes === 'number') {
      result = result.filter(a => typeof a.reading_time_minutes === 'number' && a.reading_time_minutes <= f.max_reading_time_minutes);
    }

    if (typeof f.type === 'string' && f.type) {
      result = result.filter(a => a.type === f.type);
    }

    const field = sort_by || 'date';
    const dir = (sort_direction === 'asc' || sort_direction === 'desc') ? sort_direction : 'desc';
    const factor = dir === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      let va;
      let vb;
      switch (field) {
        case 'rating':
          va = typeof a.rating === 'number' ? a.rating : 0;
          vb = typeof b.rating === 'number' ? b.rating : 0;
          break;
        case 'date':
        default:
          va = this._parseDate(a.publish_date) || new Date(0);
          vb = this._parseDate(b.publish_date) || new Date(0);
          break;
      }
      if (va < vb) return -1 * factor;
      if (va > vb) return 1 * factor;
      return 0;
    });

    return result;
  }

  _generateStartupStackItems(recommendation) {
    const tools = this._getFromStorage('tools') || [];
    const categories = this._getFromStorage('tool_categories') || [];
    const itemsStore = this._getFromStorage('startup_stack_recommendation_items') || [];

    const itemsByCategory = {};
    let estimatedTotal = 0;

    const relevantCats = categories.filter(c => c.id !== 'all_tools');

    for (let i = 0; i < relevantCats.length; i++) {
      const cat = relevantCats[i];
      const candidates = tools.filter(t => t.category_id === cat.id);
      if (!candidates.length) continue;

      let filtered = candidates.slice();

      if (recommendation.company_size_segment) {
        filtered = filtered.filter(t => {
          if (!Array.isArray(t.supported_company_sizes) || !t.supported_company_sizes.length) return true;
          return t.supported_company_sizes.indexOf(recommendation.company_size_segment) !== -1;
        });
      }

      filtered.sort((a, b) => {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (ra < rb) return 1;
        if (ra > rb) return -1;
        return 0;
      });

      const selected = filtered.slice(0, 3);
      if (!selected.length) continue;

      itemsByCategory[cat.id] = [];

      for (let j = 0; j < selected.length; j++) {
        const tool = selected[j];
        const item = {
          id: this._generateId('stack_item'),
          recommendation_id: recommendation.id,
          category_id: cat.id,
          tool_id: tool.id,
          rank: j + 1
        };
        itemsStore.push(item);
        itemsByCategory[cat.id].push(item);

        if (j === 0) {
          let cost = 0;
          if (typeof tool.starting_price_per_month === 'number') {
            cost = tool.starting_price_per_month;
          } else if (typeof tool.starting_price_per_user_month === 'number') {
            cost = tool.starting_price_per_user_month;
          }
          estimatedTotal += cost;
        }
      }
    }

    this._saveToStorage('startup_stack_recommendation_items', itemsStore);

    return {
      itemsByCategory: itemsByCategory,
      estimatedTotalMonthlyCost: estimatedTotal
    };
  }

  // Core interface implementations

  // getHomePageContent
  getHomePageContent() {
    const toolCategories = this._getFromStorage('tool_categories') || [];
    const articleCategories = this._getFromStorage('article_categories') || [];
    const articles = this._getFromStorage('articles') || [];

    const articleCategoriesById = {};
    for (let i = 0; i < articleCategories.length; i++) {
      const c = articleCategories[i];
      articleCategoriesById[c.id] = c;
    }

    const featured_articles = articles
      .filter(a => !!a.is_featured)
      .map(a => Object.assign({}, a, { category: articleCategoriesById[a.category_id] || null }));

    const sortedArticles = articles.slice().sort((a, b) => {
      const da = this._parseDate(a.publish_date) || new Date(0);
      const db = this._parseDate(b.publish_date) || new Date(0);
      return db - da;
    });

    const recent_articles = sortedArticles.slice(0, 5).map(a =>
      Object.assign({}, a, { category: articleCategoriesById[a.category_id] || null })
    );

    const primary_tool_categories = toolCategories.filter(c => !!c.is_primary);
    const primary_article_categories = articleCategories.slice();

    const show_startup_stack_wizard_banner = true;

    return {
      primary_tool_categories: primary_tool_categories,
      primary_article_categories: primary_article_categories,
      featured_articles: featured_articles,
      recent_articles: recent_articles,
      show_startup_stack_wizard_banner: show_startup_stack_wizard_banner
    };
  }

  // getToolCategories
  getToolCategories() {
    const categories = this._getFromStorage('tool_categories') || [];
    return categories.slice().sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
      return sa - sb;
    });
  }

  // getArticleCategories
  getArticleCategories() {
    const categories = this._getFromStorage('article_categories') || [];
    return categories.slice().sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
      return sa - sb;
    });
  }

  // getToolCategoryFilterOptions
  getToolCategoryFilterOptions(categoryId) {
    const categories = this._getFromStorage('tool_categories') || [];
    const tools = this._getFromStorage('tools') || [];

    let category = categories.find(c => c.id === categoryId);
    if (!category) {
      category = categories.find(c => c.id === 'all_tools') || null;
    }

    let minPerUser = Infinity;
    let maxPerUser = 0;
    let minFlat = Infinity;
    let maxFlat = 0;

    for (let i = 0; i < tools.length; i++) {
      const t = tools[i];
      if (typeof t.starting_price_per_user_month === 'number') {
        if (t.starting_price_per_user_month < minPerUser) minPerUser = t.starting_price_per_user_month;
        if (t.starting_price_per_user_month > maxPerUser) maxPerUser = t.starting_price_per_user_month;
      }
      if (typeof t.starting_price_per_month === 'number') {
        if (t.starting_price_per_month < minFlat) minFlat = t.starting_price_per_month;
        if (t.starting_price_per_month > maxFlat) maxFlat = t.starting_price_per_month;
      }
    }

    if (!isFinite(minPerUser)) minPerUser = 0;
    if (!isFinite(minFlat)) minFlat = 0;

    const team_size_segments = [
      { value: 'solo', label: 'Solo' },
      { value: 'one_to_ten', label: '1-10 employees' },
      { value: 'eleven_to_fifty', label: '11-50 employees' },
      { value: 'fifty_one_to_one_hundred', label: '51-100 employees' },
      { value: 'one_hundred_one_to_two_hundred_fifty', label: '101-250 employees' },
      { value: 'over_two_hundred_fifty', label: '250+ employees' }
    ];

    const billing_models = [
      { value: 'per_user_per_month', label: 'Per user / month' },
      { value: 'flat_monthly', label: 'Flat monthly' },
      { value: 'tiered', label: 'Tiered' },
      { value: 'free', label: 'Free' },
      { value: 'contact_sales', label: 'Contact sales' }
    ];

    const plan_types = [
      { value: 'free_forever', label: 'Free forever' },
      { value: 'free_trial', label: 'Free trial' },
      { value: 'paid_only', label: 'Paid only' }
    ];

    const rating_thresholds = [0, 1, 2, 3, 4, 4.5];

    const features = [
      { key: 'time_tracking', label: 'Time tracking' },
      { key: 'live_chat', label: 'Live chat' },
      { key: 'unlimited_invoices', label: 'Unlimited invoices' },
      { key: 'multi_currency', label: 'Multi-currency' }
    ];

    const integrations = [
      { key: 'gmail', label: 'Gmail' },
      { key: 'google_workspace', label: 'Google Workspace' },
      { key: 'slack', label: 'Slack' }
    ];

    const sort_options = [
      { value: 'rating_desc', label: 'Rating - High to Low' },
      { value: 'price_per_user_asc', label: 'Price per user - Low to High' },
      { value: 'price_flat_asc', label: 'Price (flat) - Low to High' },
      { value: 'name_asc', label: 'Name A-Z' }
    ];

    return {
      category: category,
      team_size_segments: team_size_segments,
      price_per_user_range: {
        min: minPerUser,
        max: maxPerUser,
        step: 1
      },
      flat_monthly_price_range: {
        min: minFlat,
        max: maxFlat,
        step: 1
      },
      billing_models: billing_models,
      plan_types: plan_types,
      rating_thresholds: rating_thresholds,
      features: features,
      integrations: integrations,
      sort_options: sort_options
    };
  }

  // getToolsForCategory
  getToolsForCategory(categoryId, filters, sort_by, sort_direction, page, page_size) {
    const allCategories = this._getFromStorage('tool_categories') || [];
    let category = allCategories.find(c => c.id === categoryId);
    if (!category) {
      category = allCategories.find(c => c.id === 'all_tools') || null;
    }

    const allTools = this._getFromStorage('tools') || [];
    const savedTools = this._getOrCreateSavedToolsStore();
    const comparisonSets = this._getFromStorage('comparison_sets') || [];
    const activeComparison = comparisonSets.find(s => s.is_active) || null;

    let tools = allTools;
    if (categoryId && categoryId !== 'all_tools') {
      tools = tools.filter(t => t.category_id === categoryId);
    }

    let sortField;
    let sortDir;
    if (sort_by === 'rating') {
      sortField = 'rating';
      sortDir = sort_direction || 'desc';
    } else if (sort_by === 'price_per_user') {
      sortField = 'price_per_user';
      sortDir = sort_direction || 'asc';
    } else if (sort_by === 'price_flat') {
      sortField = 'price_flat';
      sortDir = sort_direction || 'asc';
    } else if (sort_by === 'name') {
      sortField = 'name';
      sortDir = sort_direction || 'asc';
    } else {
      sortField = 'rating';
      sortDir = sort_direction || 'desc';
    }

    const filteredSorted = this._applyToolListingFiltersAndSort(tools, filters, sortField, sortDir);

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = filteredSorted.slice(start, end);

    const categoriesById = {};
    for (let i = 0; i < allCategories.length; i++) {
      const c = allCategories[i];
      categoriesById[c.id] = c;
    }

    const items = pageItems.map(t => {
      const is_saved = savedTools.some(st => st.tool_id === t.id);
      const is_in_comparison = activeComparison ? (activeComparison.tool_ids || []).indexOf(t.id) !== -1 : false;
      const display_price_per_user_month = typeof t.starting_price_per_user_month === 'number' ? t.starting_price_per_user_month : null;
      const display_flat_monthly_price = typeof t.starting_price_per_month === 'number' ? t.starting_price_per_month : null;
      const display_currency = t.billing_currency || 'USD';
      const categoryObj = categoriesById[t.category_id] || null;
      return {
        tool: Object.assign({}, t, { category: categoryObj }),
        category: categoryObj,
        is_saved: is_saved,
        is_in_comparison: is_in_comparison,
        display_price_per_user_month: display_price_per_user_month,
        display_flat_monthly_price: display_flat_monthly_price,
        display_currency: display_currency
      };
    });

    return {
      category: category,
      tools: items,
      total_count: filteredSorted.length,
      page: currentPage,
      page_size: size
    };
  }

  // getToolDetail
  getToolDetail(toolSlug) {
    const tools = this._getFromStorage('tools') || [];
    const categories = this._getFromStorage('tool_categories') || [];
    const savedTools = this._getOrCreateSavedToolsStore();
    const comparisonSets = this._getFromStorage('comparison_sets') || [];
    const articleToolRefs = this._getFromStorage('article_tool_references') || [];
    const articles = this._getFromStorage('articles') || [];
    const articleCategories = this._getFromStorage('article_categories') || [];

    const tool = tools.find(t => t.slug === toolSlug) || null;
    if (!tool) {
      return {
        tool: null,
        category: null,
        pricing_sections: [],
        key_features: [],
        integrations: [],
        pros: [],
        cons: [],
        is_saved: false,
        is_in_comparison: false,
        related_articles: [],
        table_of_contents: []
      };
    }

    const category = categories.find(c => c.id === tool.category_id) || null;
    const is_saved = savedTools.some(st => st.tool_id === tool.id);
    const activeComparison = comparisonSets.find(s => s.is_active) || null;
    const is_in_comparison = activeComparison ? (activeComparison.tool_ids || []).indexOf(tool.id) !== -1 : false;

    const pricing_sections = [];
    pricing_sections.push({
      plan_name: 'Starter',
      price_per_user_month: typeof tool.starting_price_per_user_month === 'number' ? tool.starting_price_per_user_month : null,
      flat_monthly_price: typeof tool.starting_price_per_month === 'number' ? tool.starting_price_per_month : null,
      billing_model: tool.billing_model || null,
      currency: tool.billing_currency || 'USD',
      key_limits: []
    });

    if (tool.supports_unlimited_invoices) {
      pricing_sections[0].key_limits.push('Unlimited invoices');
    }
    if (tool.has_free_forever_plan) {
      pricing_sections[0].key_limits.push('Free forever plan available');
    }

    const key_features = Array.isArray(tool.features) ? tool.features.slice() : [];
    const integ = Array.isArray(tool.integrations) ? tool.integrations.slice() : [];
    const pros = Array.isArray(tool.pros) ? tool.pros.slice() : [];
    const cons = Array.isArray(tool.cons) ? tool.cons.slice() : [];

    const toolArticleRefs = articleToolRefs.filter(ref => ref.tool_id === tool.id);
    const articleById = {};
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      articleById[a.id] = a;
    }
    const articleCategoryById = {};
    for (let j = 0; j < articleCategories.length; j++) {
      const c = articleCategories[j];
      articleCategoryById[c.id] = c;
    }

    const relatedArticlesMap = {};
    for (let k = 0; k < toolArticleRefs.length; k++) {
      const ref = toolArticleRefs[k];
      const a = articleById[ref.article_id];
      if (a && !relatedArticlesMap[a.id]) {
        relatedArticlesMap[a.id] = Object.assign({}, a, {
          category: articleCategoryById[a.category_id] || null
        });
      }
    }
    const related_articles = Object.keys(relatedArticlesMap).map(id => relatedArticlesMap[id]);

    const table_of_contents = ['overview', 'pricing', 'features', 'integrations', 'pros_cons'];

    // Instrumentation for task completion tracking
    try {
      if (tool) {
        localStorage.setItem('task8_toolViewed', JSON.stringify({ "tool_id": tool.id, "category_id": tool.category_id, "slug": tool.slug, "viewed_at": new Date().toISOString() }));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      tool: Object.assign({}, tool, { category: category }),
      category: category,
      pricing_sections: pricing_sections,
      key_features: key_features,
      integrations: integ,
      pros: pros,
      cons: cons,
      is_saved: is_saved,
      is_in_comparison: is_in_comparison,
      related_articles: related_articles,
      table_of_contents: table_of_contents
    };
  }

  // saveToolToBookmarks
  saveToolToBookmarks(toolId, sourceContext, note) {
    const tools = this._getFromStorage('tools') || [];
    const tool = tools.find(t => t.id === toolId);
    if (!tool) {
      const currentSaved = this._getOrCreateSavedToolsStore();
      return {
        success: false,
        message: 'Tool not found',
        saved_tool: null,
        current_saved_count: currentSaved.length
      };
    }

    let savedTools = this._getOrCreateSavedToolsStore();
    let saved = savedTools.find(st => st.tool_id === toolId);
    if (saved) {
      saved.source_context = sourceContext || saved.source_context || null;
      saved.note = typeof note === 'string' ? note : (saved.note || null);
      if (!saved.saved_at) {
        saved.saved_at = new Date().toISOString();
      }
    } else {
      saved = {
        id: this._generateId('savedtool'),
        tool_id: toolId,
        saved_at: new Date().toISOString(),
        source_context: sourceContext || null,
        note: typeof note === 'string' ? note : null
      };
      savedTools.push(saved);
    }
    this._saveToStorage('saved_tools', savedTools);

    return {
      success: true,
      message: 'Tool saved',
      saved_tool: saved,
      current_saved_count: savedTools.length
    };
  }

  // getSavedToolsList
  getSavedToolsList() {
    const savedTools = this._getOrCreateSavedToolsStore();
    const tools = this._getFromStorage('tools') || [];
    const categories = this._getFromStorage('tool_categories') || [];

    const categoriesById = {};
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      categoriesById[c.id] = c;
    }

    const toolsById = {};
    for (let j = 0; j < tools.length; j++) {
      const t = tools[j];
      toolsById[t.id] = t;
    }

    const items = savedTools.map(st => {
      const tool = toolsById[st.tool_id] || null;
      const category = tool ? (categoriesById[tool.category_id] || null) : null;
      return {
        saved_tool: st,
        tool: tool ? Object.assign({}, tool, { category: category }) : null,
        category: category
      };
    });

    // Instrumentation for task completion tracking
    try {
      if (savedTools && savedTools.length >= 3) {
        localStorage.setItem('task7_savedListViewed', JSON.stringify({ "saved_tool_ids": savedTools.map(st => st.tool_id), "viewed_at": new Date().toISOString() }));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      items: items,
      total_count: items.length
    };
  }

  // removeToolFromSaved
  removeToolFromSaved(toolId) {
    let savedTools = this._getOrCreateSavedToolsStore();
    const before = savedTools.length;
    savedTools = savedTools.filter(st => st.tool_id !== toolId);
    this._saveToStorage('saved_tools', savedTools);
    const after = savedTools.length;
    const success = after < before;
    return {
      success: success,
      message: success ? 'Tool removed from saved list' : 'Tool not found in saved list',
      current_saved_count: after
    };
  }

  // addToolToComparison
  addToolToComparison(toolId, sourceContext) {
    const tools = this._getFromStorage('tools') || [];
    const categories = this._getFromStorage('tool_categories') || [];
    const tool = tools.find(t => t.id === toolId);
    if (!tool) {
      return {
        comparison_set: null,
        tools: []
      };
    }

    let sets = this._getFromStorage('comparison_sets') || [];
    let active = sets.find(s => s.is_active);
    if (!active) {
      this._getOrCreateComparisonSet();
      sets = this._getFromStorage('comparison_sets') || [];
      active = sets.find(s => s.is_active);
    }

    if (!Array.isArray(active.tool_ids)) {
      active.tool_ids = [];
    }

    if (active.tool_ids.indexOf(toolId) === -1) {
      active.tool_ids.push(toolId);
      active.updated_at = new Date().toISOString();
      this._saveToStorage('comparison_sets', sets);
    }

    const categoriesById = {};
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      categoriesById[c.id] = c;
    }

    const toolsList = (active.tool_ids || []).map(id => {
      const t = tools.find(x => x.id === id) || null;
      const cat = t ? (categoriesById[t.category_id] || null) : null;
      if (!t) return null;
      return {
        tool: Object.assign({}, t, { category: cat }),
        category: cat
      };
    }).filter(x => x !== null);

    return {
      comparison_set: active,
      tools: toolsList
    };
  }

  // getActiveComparisonSet
  getActiveComparisonSet() {
    const tools = this._getFromStorage('tools') || [];
    const categories = this._getFromStorage('tool_categories') || [];
    let sets = this._getFromStorage('comparison_sets') || [];
    let active = sets.find(s => s.is_active);
    if (!active) {
      this._getOrCreateComparisonSet();
      sets = this._getFromStorage('comparison_sets') || [];
      active = sets.find(s => s.is_active);
    }

    const categoriesById = {};
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      categoriesById[c.id] = c;
    }

    const toolsList = (active.tool_ids || []).map(id => {
      const t = tools.find(x => x.id === id) || null;
      const cat = t ? (categoriesById[t.category_id] || null) : null;
      if (!t) return null;
      return {
        tool: Object.assign({}, t, { category: cat }),
        category: cat,
        features: Array.isArray(t.features) ? t.features.slice() : [],
        integrations: Array.isArray(t.integrations) ? t.integrations.slice() : []
      };
    }).filter(x => x !== null);

    // Instrumentation for task completion tracking
    try {
      if (active && Array.isArray(active.tool_ids) && active.tool_ids.length >= 2) {
        localStorage.setItem('task2_comparisonViewed', JSON.stringify({ "comparison_set_id": active.id, "tool_ids": (active.tool_ids || []).slice(), "viewed_at": new Date().toISOString() }));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      comparison_set: active,
      tools: toolsList
    };
  }

  // removeToolFromComparison
  removeToolFromComparison(toolId) {
    const tools = this._getFromStorage('tools') || [];
    const categories = this._getFromStorage('tool_categories') || [];
    let sets = this._getFromStorage('comparison_sets') || [];
    let active = sets.find(s => s.is_active);
    if (!active) {
      this._getOrCreateComparisonSet();
      sets = this._getFromStorage('comparison_sets') || [];
      active = sets.find(s => s.is_active);
    }

    if (!Array.isArray(active.tool_ids)) {
      active.tool_ids = [];
    }

    const idx = active.tool_ids.indexOf(toolId);
    if (idx !== -1) {
      active.tool_ids.splice(idx, 1);
      active.updated_at = new Date().toISOString();
      this._saveToStorage('comparison_sets', sets);
    }

    const categoriesById = {};
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      categoriesById[c.id] = c;
    }

    const toolsList = (active.tool_ids || []).map(id => {
      const t = tools.find(x => x.id === id) || null;
      const cat = t ? (categoriesById[t.category_id] || null) : null;
      if (!t) return null;
      return {
        tool: Object.assign({}, t, { category: cat }),
        category: cat
      };
    }).filter(x => x !== null);

    return {
      comparison_set: active,
      tools: toolsList
    };
  }

  // clearComparisonSet
  clearComparisonSet() {
    let sets = this._getFromStorage('comparison_sets') || [];
    let active = sets.find(s => s.is_active);
    if (!active) {
      this._getOrCreateComparisonSet();
      sets = this._getFromStorage('comparison_sets') || [];
      active = sets.find(s => s.is_active);
    }

    active.tool_ids = [];
    active.updated_at = new Date().toISOString();
    this._saveToStorage('comparison_sets', sets);

    return {
      success: true
    };
  }

  // getArticleCategoryFilterOptions
  getArticleCategoryFilterOptions(categoryId) {
    const categories = this._getFromStorage('article_categories') || [];
    let category = categories.find(c => c.id === categoryId);
    if (!category) {
      category = categories.find(c => c.id === 'all_articles') || null;
    }

    const timeframes = [
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_3_months', label: 'Last 3 months' },
      { value: 'last_6_months', label: 'Last 6 months' },
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'all_time', label: 'All time' }
    ];

    const company_size_segments = [
      { value: 'solo', label: 'Solo' },
      { value: 'one_to_ten', label: '1-10 employees' },
      { value: 'eleven_to_fifty', label: '11-50 employees' },
      { value: 'fifty_one_to_one_hundred', label: '51-100 employees' },
      { value: 'one_hundred_one_to_two_hundred_fifty', label: '101-250 employees' },
      { value: 'over_two_hundred_fifty', label: '250+ employees' }
    ];

    const rating_thresholds = [0, 1, 2, 3, 4];

    const reading_time_options = [
      { max_minutes: 5, label: 'Under 5 minutes' },
      { max_minutes: 10, label: 'Under 10 minutes' },
      { max_minutes: 15, label: 'Under 15 minutes' },
      { max_minutes: 30, label: 'Under 30 minutes' }
    ];

    const sort_options = [
      { value: 'date_desc', label: 'Newest first' },
      { value: 'rating_desc', label: 'Rating - High to Low' }
    ];

    return {
      category: category,
      timeframes: timeframes,
      company_size_segments: company_size_segments,
      rating_thresholds: rating_thresholds,
      reading_time_options: reading_time_options,
      sort_options: sort_options
    };
  }

  // getArticlesForCategory
  getArticlesForCategory(categoryId, filters, sort_by, sort_direction, page, page_size) {
    const articleCategories = this._getFromStorage('article_categories') || [];
    let category = articleCategories.find(c => c.id === categoryId);
    if (!category) {
      category = articleCategories.find(c => c.id === 'all_articles') || null;
    }

    let articles = this._getFromStorage('articles') || [];
    if (categoryId && categoryId !== 'all_articles') {
      articles = articles.filter(a => a.category_id === categoryId);
    }

    let sortField;
    let sortDir;
    if (sort_by === 'rating') {
      sortField = 'rating';
      sortDir = sort_direction || 'desc';
    } else {
      sortField = 'date';
      sortDir = sort_direction || 'desc';
    }

    const filteredSorted = this._applyArticleListingFiltersAndSort(articles, filters, sortField, sortDir);

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = filteredSorted.slice(start, end);

    const categoryById = {};
    for (let i = 0; i < articleCategories.length; i++) {
      const c = articleCategories[i];
      categoryById[c.id] = c;
    }

    const mappedArticles = pageItems.map(a => {
      return Object.assign({}, a, {
        category: categoryById[a.category_id] || null
      });
    });

    return {
      category: category,
      articles: mappedArticles,
      total_count: filteredSorted.length,
      page: currentPage,
      page_size: size
    };
  }

  // getArticleDetail
  getArticleDetail(articleSlug) {
    const articles = this._getFromStorage('articles') || [];
    const articleCategories = this._getFromStorage('article_categories') || [];
    const articleToolRefs = this._getFromStorage('article_tool_references') || [];
    const tools = this._getFromStorage('tools') || [];
    const toolCategories = this._getFromStorage('tool_categories') || [];
    const comments = this._getFromStorage('comments') || [];

    const article = articles.find(a => a.slug === articleSlug) || null;
    if (!article) {
      return {
        article: null,
        category: null,
        table_of_contents: [],
        tool_sections: [],
        has_newsletter_block: false,
        comments_count: 0
      };
    }

    const category = articleCategories.find(c => c.id === article.category_id) || null;

    const table_of_contents = Array.isArray(article.table_of_contents) ? article.table_of_contents.slice() : [];

    const refsForArticle = articleToolRefs.filter(ref => ref.article_id === article.id);

    const toolsById = {};
    for (let i = 0; i < tools.length; i++) {
      const t = tools[i];
      toolsById[t.id] = t;
    }

    const toolCategoryById = {};
    for (let j = 0; j < toolCategories.length; j++) {
      const c = toolCategories[j];
      toolCategoryById[c.id] = c;
    }

    const sectionsMap = {};
    for (let k = 0; k < refsForArticle.length; k++) {
      const ref = refsForArticle[k];
      if (!sectionsMap[ref.section_key]) {
        sectionsMap[ref.section_key] = [];
      }
      sectionsMap[ref.section_key].push(ref);
    }

    const tool_sections = Object.keys(sectionsMap).map(sectionKey => {
      const refs = sectionsMap[sectionKey].slice().sort((a, b) => {
        const pa = typeof a.position_in_section === 'number' ? a.position_in_section : 0;
        const pb = typeof b.position_in_section === 'number' ? b.position_in_section : 0;
        return pa - pb;
      });

      const toolsInSection = refs.map(ref => {
        const tool = toolsById[ref.tool_id] || null;
        if (!tool) return null;
        const cat = toolCategoryById[tool.category_id] || null;
        const toolWithCategory = Object.assign({}, tool, { category: cat });
        return {
          tool: toolWithCategory,
          position_in_section: ref.position_in_section,
          is_highlighted: !!ref.is_highlighted,
          custom_display_name: ref.custom_display_name || null,
          custom_display_price: typeof ref.custom_display_price === 'number' ? ref.custom_display_price : null,
          custom_display_rating: typeof ref.custom_display_rating === 'number' ? ref.custom_display_rating : null
        };
      }).filter(x => x !== null);

      const title = sectionKey.replace(/_/g, ' ').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
      return {
        section_key: sectionKey,
        section_title: title,
        tools: toolsInSection
      };
    });

    const comments_count = comments.filter(c => c.article_id === article.id && c.status === 'approved').length;
    const has_newsletter_block = true;

    // Instrumentation for task completion tracking
    try {
      if (article) {
        localStorage.setItem('task5_articleViewed', JSON.stringify({ "article_id": article.id, "category_id": article.category_id, "slug": article.slug, "viewed_at": new Date().toISOString(), "table_of_contents": Array.isArray(article.table_of_contents) ? article.table_of_contents.slice() : [] }));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article: Object.assign({}, article, { category: category }),
      category: category,
      table_of_contents: table_of_contents,
      tool_sections: tool_sections,
      has_newsletter_block: has_newsletter_block,
      comments_count: comments_count
    };
  }

  // getArticleComments
  getArticleComments(articleId) {
    const comments = this._getFromStorage('comments') || [];
    const articles = this._getFromStorage('articles') || [];
    const article = articles.find(a => a.id === articleId) || null;

    const approved = comments.filter(c => c.article_id === articleId && c.status === 'approved');
    approved.sort((a, b) => {
      const da = this._parseDate(a.created_at) || new Date(0);
      const db = this._parseDate(b.created_at) || new Date(0);
      return da - db;
    });

    return approved.map(c => Object.assign({}, c, { article: article }));
  }

  // submitComment
  submitComment(articleId, name, email, body) {
    if (!articleId || !name || !email || !body) {
      return {
        success: false,
        message: 'All fields are required',
        comment: null
      };
    }

    const articles = this._getFromStorage('articles') || [];
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return {
        success: false,
        message: 'Article not found',
        comment: null
      };
    }

    const comment = this._createCommentRecord(articleId, name, email, body);
    return {
      success: true,
      message: 'Comment submitted for review',
      comment: comment
    };
  }

  // submitNewsletterSubscription
  submitNewsletterSubscription(email, topics, company_size_segment, source_page_type, source_article_id) {
    if (!email || !Array.isArray(topics) || !topics.length || !source_page_type) {
      return {
        subscription: null,
        success: false,
        message: 'Email, topics, and source_page_type are required'
      };
    }

    const subscription = this._createNewsletterSubscriptionRecord(
      email,
      topics,
      company_size_segment,
      source_page_type,
      source_article_id
    );

    return {
      subscription: subscription,
      success: true,
      message: 'Subscription submitted'
    };
  }

  // searchSiteContent
  searchSiteContent(query, filters, page, page_size) {
    const q = (query || '').toLowerCase().trim();
    const f = filters || {};

    const tools = this._getFromStorage('tools') || [];
    const articles = this._getFromStorage('articles') || [];
    const toolCategories = this._getFromStorage('tool_categories') || [];
    const articleCategories = this._getFromStorage('article_categories') || [];

    const contentTypes = Array.isArray(f.content_types) && f.content_types.length
      ? f.content_types
      : ['tools', 'articles'];

    const toolCategoryById = {};
    for (let i = 0; i < toolCategories.length; i++) {
      const c = toolCategories[i];
      toolCategoryById[c.id] = c;
    }

    const articleCategoryById = {};
    for (let j = 0; j < articleCategories.length; j++) {
      const c = articleCategories[j];
      articleCategoryById[c.id] = c;
    }

    let matchedTools = [];
    if (contentTypes.indexOf('tools') !== -1) {
      matchedTools = tools
        .filter(t => {
          if (f.tool_category_id_filter && t.category_id !== f.tool_category_id_filter) return false;
          if (!q) return true;
          const text = ((t.name || '') + ' ' + (t.description || '') + ' ' + (t.summary || '')).toLowerCase();
          return text.indexOf(q) !== -1;
        })
        .map(t => Object.assign({}, t, { category: toolCategoryById[t.category_id] || null }));
    }

    let matchedArticles = [];
    if (contentTypes.indexOf('articles') !== -1) {
      matchedArticles = articles
        .filter(a => {
          if (f.article_category_id_filter && a.category_id !== f.article_category_id_filter) return false;
          if (!q) return true;
          const text = ((a.title || '') + ' ' + (a.excerpt || '') + ' ' + (a.body || '')).toLowerCase();
          return text.indexOf(q) !== -1;
        })
        .map(a => Object.assign({}, a, { category: articleCategoryById[a.category_id] || null }));
    }

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pagedTools = matchedTools.slice(start, end);
    const pagedArticles = matchedArticles.slice(start, end);

    return {
      query: query,
      tools: pagedTools,
      articles: pagedArticles,
      total_tools: matchedTools.length,
      total_articles: matchedArticles.length,
      page: currentPage,
      page_size: size
    };
  }

  // getStartupStackWizardOptions
  getStartupStackWizardOptions() {
    const company_size_options = [
      { value: 'solo', label: 'Solo' },
      { value: 'one_to_ten', label: '1-10 employees' },
      { value: 'eleven_to_fifty', label: '11-50 employees' },
      { value: 'fifty_one_to_one_hundred', label: '51-100 employees' },
      { value: 'one_hundred_one_to_two_hundred_fifty', label: '101-250 employees' },
      { value: 'over_two_hundred_fifty', label: '250+ employees' }
    ];

    const industry_options = [
      { value: 'saas', label: 'SaaS' },
      { value: 'technology', label: 'Technology' },
      { value: 'ecommerce', label: 'E-commerce' },
      { value: 'agency', label: 'Agency' },
      { value: 'marketplace', label: 'Marketplace' },
      { value: 'other', label: 'Other' }
    ];

    const budget_presets = [
      { max_monthly_budget: 50, label: 'Up to $50/month' },
      { max_monthly_budget: 100, label: 'Up to $100/month' },
      { max_monthly_budget: 200, label: 'Up to $200/month' },
      { max_monthly_budget: 500, label: 'Up to $500/month' }
    ];

    return {
      company_size_options: company_size_options,
      industry_options: industry_options,
      budget_presets: budget_presets
    };
  }

  // generateStartupStackRecommendation
  generateStartupStackRecommendation(company_size_segment, industry, monthly_budget_limit) {
    if (!company_size_segment || !industry || typeof monthly_budget_limit !== 'number') {
      return {
        recommendation: null,
        categories: [],
        estimated_total_monthly_cost: 0
      };
    }

    const recommendations = this._getFromStorage('startup_stack_recommendations') || [];
    const recommendation = {
      id: this._generateId('stack'),
      created_at: new Date().toISOString(),
      company_size_segment: company_size_segment,
      industry: industry,
      monthly_budget_limit: monthly_budget_limit,
      description: ''
    };
    recommendations.push(recommendation);
    this._saveToStorage('startup_stack_recommendations', recommendations);

    const generated = this._generateStartupStackItems(recommendation);
    const itemsByCategory = generated.itemsByCategory;
    const estimatedTotal = generated.estimatedTotalMonthlyCost;

    const toolCategories = this._getFromStorage('tool_categories') || [];
    const tools = this._getFromStorage('tools') || [];

    const toolsById = {};
    for (let i = 0; i < tools.length; i++) {
      const t = tools[i];
      toolsById[t.id] = t;
    }

    const categoriesById = {};
    for (let j = 0; j < toolCategories.length; j++) {
      const c = toolCategories[j];
      categoriesById[c.id] = c;
    }

    const categories = Object.keys(itemsByCategory).map(catId => {
      const category = categoriesById[catId] || null;
      const items = itemsByCategory[catId]
        .map(item => {
          const tool = toolsById[item.tool_id] || null;
          if (!tool) return null;
          return {
            recommendation_item: item,
            tool: Object.assign({}, tool, { category: category })
          };
        })
        .filter(x => x !== null);
      return {
        category: category,
        items: items
      };
    });

    return {
      recommendation: recommendation,
      categories: categories,
      estimated_total_monthly_cost: estimatedTotal
    };
  }

  // getStartupStackRecommendation
  getStartupStackRecommendation(recommendationId) {
    const recommendations = this._getFromStorage('startup_stack_recommendations') || [];
    const rec = recommendations.find(r => r.id === recommendationId) || null;
    if (!rec) {
      return {
        recommendation: null,
        categories: [],
        estimated_total_monthly_cost: 0
      };
    }

    const itemsStore = this._getFromStorage('startup_stack_recommendation_items') || [];
    const items = itemsStore.filter(i => i.recommendation_id === rec.id);

    const toolCategories = this._getFromStorage('tool_categories') || [];
    const tools = this._getFromStorage('tools') || [];

    const toolsById = {};
    for (let i = 0; i < tools.length; i++) {
      const t = tools[i];
      toolsById[t.id] = t;
    }

    const categoriesById = {};
    for (let j = 0; j < toolCategories.length; j++) {
      const c = toolCategories[j];
      categoriesById[c.id] = c;
    }

    const itemsByCategory = {};
    for (let k = 0; k < items.length; k++) {
      const item = items[k];
      if (!itemsByCategory[item.category_id]) {
        itemsByCategory[item.category_id] = [];
      }
      itemsByCategory[item.category_id].push(item);
    }

    const categories = Object.keys(itemsByCategory).map(catId => {
      const category = categoriesById[catId] || null;
      const sortedItems = itemsByCategory[catId].slice().sort((a, b) => {
        const ra = typeof a.rank === 'number' ? a.rank : 0;
        const rb = typeof b.rank === 'number' ? b.rank : 0;
        return ra - rb;
      });
      const mappedItems = sortedItems
        .map(item => {
          const tool = toolsById[item.tool_id] || null;
          if (!tool) return null;
          return {
            recommendation_item: item,
            tool: Object.assign({}, tool, { category: category })
          };
        })
        .filter(x => x !== null);
      return {
        category: category,
        items: mappedItems
      };
    });

    let estimatedTotal = 0;
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      if (cat.items && cat.items.length) {
        const t = cat.items[0].tool;
        if (t) {
          let cost = 0;
          if (typeof t.starting_price_per_month === 'number') {
            cost = t.starting_price_per_month;
          } else if (typeof t.starting_price_per_user_month === 'number') {
            cost = t.starting_price_per_user_month;
          }
          estimatedTotal += cost;
        }
      }
    }

    return {
      recommendation: rec,
      categories: categories,
      estimated_total_monthly_cost: estimatedTotal
    };
  }

  // submitContactMessage
  submitContactMessage(name, email, subject, message) {
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        message: 'All fields are required'
      };
    }

    const messages = this._getFromStorage('contact_messages') || [];
    const record = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      created_at: new Date().toISOString()
    };
    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message submitted'
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