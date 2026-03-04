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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    const ensureKey = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core Help Center & related entities
    ensureKey('help_categories', []); // HelpCategory[]
    ensureKey('help_articles', []); // HelpArticle[]
    ensureKey('article_videos', []); // ArticleVideo[]
    ensureKey('article_template_snippets', []); // ArticleTemplateSnippet[]
    ensureKey('carriers', []); // Carrier[]
    ensureKey('carrier_options', []); // CarrierOption[]
    ensureKey('support_requests', []); // SupportRequest[]
    // Settings objects stored as single JSON object or null
    if (localStorage.getItem('order_automation_settings') === null) {
      localStorage.setItem('order_automation_settings', 'null');
    }
    if (localStorage.getItem('payout_settings') === null) {
      localStorage.setItem('payout_settings', 'null');
    }
    ensureKey('canned_responses', []); // CannedResponse[]
    ensureKey('status_services', []); // StatusService[]
    ensureKey('status_incidents', []); // StatusIncident[]
    ensureKey('incident_reports', []); // IncidentReport[]

    // Legacy/example keys from skeleton (kept for compatibility, but unused here)
    ensureKey('users', []);
    ensureKey('products', []);
    ensureKey('carts', []);
    ensureKey('cartItems', []);

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data !== null ? JSON.parse(data) : defaultValue;
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

  // Helper: load single settings object (OrderAutomationSettings, PayoutSettings)
  _loadSettingsFromStore(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'null') {
      const now = new Date().toISOString();
      const base = Object.assign({}, defaultValue);
      if (!base.created_at) base.created_at = now;
      base.updated_at = now;
      this._saveSettingsToStore(key, base);
      return base;
    }
    try {
      const parsed = JSON.parse(raw);
      // If legacy data is stored as an array of settings, pick the most recent entry
      if (Array.isArray(parsed)) {
        const chosen = parsed[parsed.length - 1] || defaultValue;
        const now = new Date().toISOString();
        const base = Object.assign({}, defaultValue, chosen);
        if (!base.created_at) base.created_at = chosen.created_at || now;
        base.updated_at = chosen.updated_at || now;
        this._saveSettingsToStore(key, base);
        return base;
      }
      return parsed;
    } catch (e) {
      const now = new Date().toISOString();
      const base = Object.assign({}, defaultValue);
      if (!base.created_at) base.created_at = now;
      base.updated_at = now;
      this._saveSettingsToStore(key, base);
      return base;
    }
  }

  _saveSettingsToStore(key, settings) {
    localStorage.setItem(key, JSON.stringify(settings));
  }

  _findById(list, id) {
    if (!Array.isArray(list)) return null;
    return list.find(item => item && item.id === id) || null;
  }

  _indexById(list) {
    const index = {};
    if (!Array.isArray(list)) return index;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item && item.id != null) {
        index[item.id] = item;
      }
    }
    return index;
  }

  _getPrimaryVideoForArticle(articleId) {
    const videos = this._getFromStorage('article_videos', []);
    const forArticle = videos.filter(v => v.article_id === articleId);
    if (forArticle.length === 0) return null;
    let primary = forArticle.find(v => v.is_primary);
    if (!primary) {
      primary = forArticle.slice().sort((a, b) => {
        const ao = a.playlist_order != null ? a.playlist_order : 0;
        const bo = b.playlist_order != null ? b.playlist_order : 0;
        return ao - bo;
      })[0];
    }
    return primary || null;
  }

  // =============================
  // Interface implementations
  // =============================

  // getHelpCenterHomeData()
  getHelpCenterHomeData() {
    const categoriesRaw = this._getFromStorage('help_categories', []);
    const articlesRaw = this._getFromStorage('help_articles', []);

    const categories = categoriesRaw
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        icon: cat.icon || '',
        display_order: cat.display_order != null ? cat.display_order : 0
      }));

    const featured = articlesRaw.filter(a => !!a.is_featured);
    const featuredArticles = featured
      .slice()
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .map(a => {
        const category = categoriesRaw.find(c => c.id === a.category_id) || null;
        return {
          id: a.id,
          title: a.title,
          slug: a.slug,
          summary: a.summary || '',
          category_id: a.category_id,
          category_name: category ? category.name : '',
          article_type: a.article_type,
          integration_platform: a.integration_platform || 'none',
          popularity_score: a.popularity_score || 0,
          is_featured: !!a.is_featured,
          has_share_link: !!a.has_share_link,
          // Foreign key resolution: include full category object
          category: category
        };
      });

    return {
      categories,
      featured_articles: featuredArticles
    };
  }

  // searchHelpArticles(query, filters, sort, page, pageSize)
  searchHelpArticles(query, filters, sort, page, pageSize) {
    const q = (query || '').toLowerCase().trim();
    const allArticles = this._getFromStorage('help_articles', []);
    const categories = this._getFromStorage('help_categories', []);
    const videos = this._getFromStorage('article_videos', []);

    const categoryFilterIds = (filters && Array.isArray(filters.categoryIds)) ? filters.categoryIds : null;
    const sortMode = sort || 'most_relevant';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const matchesQuery = (article) => {
      if (!q) return true;
      const haystackParts = [];
      if (article.title) haystackParts.push(article.title);
      if (article.summary) haystackParts.push(article.summary);
      if (article.content) haystackParts.push(article.content);
      if (Array.isArray(article.search_keywords)) {
        haystackParts.push(article.search_keywords.join(' '));
      }
      const haystack = haystackParts.join(' ').toLowerCase();
      return haystack.indexOf(q) !== -1;
    };

    let filtered = allArticles.filter(a => {
      if (categoryFilterIds && categoryFilterIds.length > 0 && categoryFilterIds.indexOf(a.category_id) === -1) {
        return false;
      }
      return matchesQuery(a);
    });

    // Compute a simple relevance score when needed
    const computeRelevance = (article) => {
      if (!q) return 0;
      let score = 0;
      const title = (article.title || '').toLowerCase();
      const summary = (article.summary || '').toLowerCase();
      const content = (article.content || '').toLowerCase();
      if (title.indexOf(q) !== -1) score += 3;
      if (summary.indexOf(q) !== -1) score += 2;
      if (content.indexOf(q) !== -1) score += 1;
      return score;
    };

    filtered = filtered.slice().sort((a, b) => {
      if (sortMode === 'most_popular') {
        return (b.popularity_score || 0) - (a.popularity_score || 0);
      }
      if (sortMode === 'most_recent') {
        const ad = a.updated_at || a.created_at || '';
        const bd = b.updated_at || b.created_at || '';
        return (bd > ad ? 1 : bd < ad ? -1 : 0);
      }
      // most_relevant (default): primary by relevance, then popularity
      const ra = computeRelevance(a);
      const rb = computeRelevance(b);
      if (rb !== ra) return rb - ra;
      return (b.popularity_score || 0) - (a.popularity_score || 0);
    });

    const total_results = filtered.length;

    const start = (pageNum - 1) * size;
    const end = start + size;
    const paged = filtered.slice(start, end);

    const categoryIndex = this._indexById(categories);

    const results = paged.map(a => {
      const category = categoryIndex[a.category_id] || null;
      const primaryVideo = videos.find(v => v.article_id === a.id && v.is_primary) ||
        videos.find(v => v.article_id === a.id) || null;
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        summary: a.summary || '',
        category_id: a.category_id,
        category_name: category ? category.name : '',
        article_type: a.article_type,
        integration_platform: a.integration_platform || 'none',
        popularity_score: a.popularity_score || 0,
        has_share_link: !!a.has_share_link,
        has_video_tutorial: !!a.has_video_tutorial,
        primary_video_duration_seconds: primaryVideo ? primaryVideo.duration_seconds : null,
        // Foreign key resolution
        category: category
      };
    });

    // available_category_filters based on all filtered (pre-paging)
    const countsByCategory = {};
    for (let i = 0; i < filtered.length; i++) {
      const art = filtered[i];
      if (!countsByCategory[art.category_id]) countsByCategory[art.category_id] = 0;
      countsByCategory[art.category_id]++;
    }

    const available_category_filters = categories
      .filter(cat => countsByCategory[cat.id])
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        article_count: countsByCategory[cat.id] || 0
      }));

    return {
      total_results,
      page: pageNum,
      page_size: size,
      results,
      available_category_filters
    };
  }

  // getHelpCategoryPageData(categoryId, integrationPlatform, articleType)
  getHelpCategoryPageData(categoryId, integrationPlatform, articleType) {
    const categories = this._getFromStorage('help_categories', []);
    const allArticles = this._getFromStorage('help_articles', []);
    const videos = this._getFromStorage('article_videos', []);

    const category = categories.find(c => c.id === categoryId) || null;

    let articles = allArticles.filter(a => a.category_id === categoryId);

    if (integrationPlatform) {
      articles = articles.filter(a => (a.integration_platform || 'none') === integrationPlatform);
    }

    if (articleType) {
      articles = articles.filter(a => a.article_type === articleType);
    }

    const articlesOut = articles
      .slice()
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .map(a => {
        const primaryVideo = videos.find(v => v.article_id === a.id && v.is_primary) ||
          videos.find(v => v.article_id === a.id) || null;
        return {
          id: a.id,
          title: a.title,
          slug: a.slug,
          summary: a.summary || '',
          article_type: a.article_type,
          integration_platform: a.integration_platform || 'none',
          has_video_tutorial: !!a.has_video_tutorial,
          primary_video_duration_seconds: primaryVideo ? primaryVideo.duration_seconds : null,
          popularity_score: a.popularity_score || 0,
          is_featured: !!a.is_featured,
          // Foreign key resolution
          category: category
        };
      });

    // Build integration platform & article type filters based on available articles
    const integrationSet = new Set();
    const typeSet = new Set();
    for (let i = 0; i < allArticles.length; i++) {
      const a = allArticles[i];
      if (a.category_id !== categoryId) continue;
      if (a.integration_platform) integrationSet.add(a.integration_platform);
      if (a.article_type) typeSet.add(a.article_type);
    }

    const integration_platforms = Array.from(integrationSet).map(value => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
      icon: ''
    }));

    const article_types = Array.from(typeSet).map(value => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    return {
      category: category
        ? {
            id: category.id,
            name: category.name,
            description: category.description || '',
            icon: category.icon || '',
            display_order: category.display_order != null ? category.display_order : 0
          }
        : null,
      filters: {
        integration_platforms,
        article_types
      },
      articles: articlesOut
    };
  }

  // getHelpArticleDetail(articleSlug)
  getHelpArticleDetail(articleSlug) {
    const articles = this._getFromStorage('help_articles', []);
    const categories = this._getFromStorage('help_categories', []);
    const videosAll = this._getFromStorage('article_videos', []);
    const snippetsAll = this._getFromStorage('article_template_snippets', []);

    const article = articles.find(a => a.slug === articleSlug) || null;
    if (!article) {
      return {
        article: null,
        videos: [],
        template_snippets: [],
        related_articles: []
      };
    }

    const category = categories.find(c => c.id === article.category_id) || null;

    const videos = videosAll
      .filter(v => v.article_id === article.id)
      .map(v => Object.assign({}, v, {
        // Foreign key resolution
        article: article
      }));

    const template_snippets = snippetsAll
      .filter(s => s.article_id === article.id)
      .map(s => Object.assign({}, s, {
        // Foreign key resolution
        article: article
      }));

    const related_articles = articles
      .filter(a => a.category_id === article.category_id && a.id !== article.id)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        category_name: category ? category.name : ''
      }));

    return {
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        category_id: article.category_id,
        category_name: category ? category.name : '',
        article_type: article.article_type,
        integration_platform: article.integration_platform || 'none',
        summary: article.summary || '',
        content: article.content || '',
        url: article.url,
        share_url: article.share_url || null,
        has_share_link: !!article.has_share_link,
        has_carrier_comparison: !!article.has_carrier_comparison,
        has_video_tutorial: !!article.has_video_tutorial,
        contains_order_automation_link: !!article.contains_order_automation_link,
        contains_payout_settings_link: !!article.contains_payout_settings_link,
        contains_support_form_link: !!article.contains_support_form_link,
        contains_system_status_link: !!article.contains_system_status_link,
        created_at: article.created_at || null,
        updated_at: article.updated_at || null,
        // Foreign key resolution
        category: category
      },
      videos,
      template_snippets,
      related_articles
    };
  }

  // copyArticleShareUrl(articleId)
  copyArticleShareUrl(articleId) {
    const articles = this._getFromStorage('help_articles', []);
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        success: false,
        share_url: '',
        message: 'Article not found.'
      };
    }
    if (!article.has_share_link) {
      return {
        success: false,
        share_url: '',
        message: 'Share link is not available for this article.'
      };
    }
    const shareUrl = article.share_url || article.url || '';
    const result = {
      success: !!shareUrl,
      share_url: shareUrl,
      message: shareUrl ? 'Share URL retrieved successfully.' : 'Share URL is empty.'
    };

    // Instrumentation for task completion tracking
    try {
      if (result.success) {
        localStorage.setItem('task1_shareUrlCopy', JSON.stringify({ "article_id": article.id, "share_url": shareUrl, "success": true, "timestamp": new Date().toISOString() }));
      }
    } catch (e) {}

    return result;
  }

  // getCarrierComparisonFilterOptions(articleId)
  getCarrierComparisonFilterOptions(articleId) {
    const options = this._getFromStorage('carrier_options', []);
    const relevant = options.filter(o => o.article_id === articleId && o.is_active);

    const regionsMap = {};
    const weightRangeMap = {};

    for (let i = 0; i < relevant.length; i++) {
      const o = relevant[i];
      if (!regionsMap[o.region_code]) {
        regionsMap[o.region_code] = {
          code: o.region_code,
          label: o.region_label
        };
      }
      const key = o.min_weight_kg + '-' + o.max_weight_kg;
      if (!weightRangeMap[key]) {
        weightRangeMap[key] = {
          min_weight_kg: o.min_weight_kg,
          max_weight_kg: o.max_weight_kg,
          label: o.min_weight_kg + '\u2013' + o.max_weight_kg + ' kg'
        };
      }
    }

    const regions = Object.values(regionsMap);
    const weight_ranges = Object.values(weightRangeMap);

    const sort_options = [
      { value: 'delivery_time_asc', label: 'Delivery time (Low to High)' },
      { value: 'delivery_time_desc', label: 'Delivery time (High to Low)' },
      { value: 'price_asc', label: 'Price (Low to High)' },
      { value: 'price_desc', label: 'Price (High to Low)' }
    ];

    return {
      regions,
      weight_ranges,
      sort_options
    };
  }

  // getCarrierComparisonOptions(articleId, regionCode, minWeightKg, maxWeightKg, maxCostUsd, sortBy)
  getCarrierComparisonOptions(articleId, regionCode, minWeightKg, maxWeightKg, maxCostUsd, sortBy) {
    const optionsAll = this._getFromStorage('carrier_options', []);
    const carriers = this._getFromStorage('carriers', []);
    const carrierIndex = this._indexById(carriers);

    let options = optionsAll.filter(o => o.article_id === articleId && o.is_active);

    if (regionCode) {
      options = options.filter(o => o.region_code === regionCode);
    }

    const hasMin = typeof minWeightKg === 'number';
    const hasMax = typeof maxWeightKg === 'number';

    if (hasMin || hasMax) {
      options = options.filter(o => {
        const minW = o.min_weight_kg;
        const maxW = o.max_weight_kg;
        const minCheck = hasMin ? maxW >= minWeightKg : true;
        const maxCheck = hasMax ? minW <= maxWeightKg : true;
        return minCheck && maxCheck;
      });
    }

    if (typeof maxCostUsd === 'number') {
      options = options.filter(o => o.price_usd <= maxCostUsd);
    }

    const sortKey = sortBy || 'delivery_time_asc';

    options = options.slice().sort((a, b) => {
      if (sortKey === 'price_asc') {
        if (a.price_usd !== b.price_usd) return a.price_usd - b.price_usd;
        return a.delivery_time_min_days - b.delivery_time_min_days;
      }
      if (sortKey === 'price_desc') {
        if (a.price_usd !== b.price_usd) return b.price_usd - a.price_usd;
        return a.delivery_time_min_days - b.delivery_time_min_days;
      }
      if (sortKey === 'delivery_time_desc') {
        if (a.delivery_time_min_days !== b.delivery_time_min_days) {
          return b.delivery_time_min_days - a.delivery_time_min_days;
        }
        return a.price_usd - b.price_usd;
      }
      // default delivery_time_asc
      if (a.delivery_time_min_days !== b.delivery_time_min_days) {
        return a.delivery_time_min_days - b.delivery_time_min_days;
      }
      return a.price_usd - b.price_usd;
    });

    // Exclude options whose carrier record is not present in storage
    options = options.filter(o => !!carrierIndex[o.carrier_id]);

    const mappedOptions = options.map(o => {
      const carrier = carrierIndex[o.carrier_id] || null;
      return {
        carrier_option_id: o.id,
        carrier_id: o.carrier_id,
        carrier_name: carrier ? carrier.name : '',
        service_name: o.service_name || '',
        region_code: o.region_code,
        region_label: o.region_label,
        min_weight_kg: o.min_weight_kg,
        max_weight_kg: o.max_weight_kg,
        price_usd: o.price_usd,
        delivery_time_min_days: o.delivery_time_min_days,
        delivery_time_max_days: o.delivery_time_max_days,
        tracking_available: !!o.tracking_available,
        priority_level: o.priority_level || 'standard',
        is_active: !!o.is_active,
        // Foreign key resolution
        carrier: carrier
      };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task2_lastComparison', JSON.stringify({
        "article_id": articleId,
        "regionCode": regionCode || null,
        "minWeightKg": (typeof minWeightKg === 'number' ? minWeightKg : null),
        "maxWeightKg": (typeof maxWeightKg === 'number' ? maxWeightKg : null),
        "maxCostUsd": (typeof maxCostUsd === 'number' ? maxCostUsd : null),
        "sortBy": sortKey,
        "first_option_id": mappedOptions.length > 0 ? mappedOptions[0].carrier_option_id : null,
        "timestamp": new Date().toISOString()
      }));
    } catch (e) {}

    return {
      options: mappedOptions,
      applied_filters: {
        regionCode: regionCode || null,
        minWeightKg: typeof minWeightKg === 'number' ? minWeightKg : null,
        maxWeightKg: typeof maxWeightKg === 'number' ? maxWeightKg : null,
        maxCostUsd: typeof maxCostUsd === 'number' ? maxCostUsd : null,
        sortBy: sortKey
      }
    };
  }

  // getCarrierOptionDetail(carrierOptionId)
  getCarrierOptionDetail(carrierOptionId) {
    const options = this._getFromStorage('carrier_options', []);
    const carriers = this._getFromStorage('carriers', []);
    const articles = this._getFromStorage('help_articles', []);

    const carrier_option = options.find(o => o.id === carrierOptionId) || null;
    if (!carrier_option) {
      return {
        carrier_option: null,
        carrier: null,
        setup_article: null
      };
    }

    const carrier = carriers.find(c => c.id === carrier_option.carrier_id) || null;

    let setup_article = null;
    if (carrier && carrier.setup_article_id) {
      const art = articles.find(a => a.id === carrier.setup_article_id) || null;
      if (art) {
        setup_article = {
          id: art.id,
          title: art.title,
          slug: art.slug,
          summary: art.summary || ''
        };
      } else {
        // Fallback: create a minimal placeholder setup article when the full
        // article record is not present in storage so setup flows still work.
        setup_article = {
          id: carrier.setup_article_id,
          title: carrier.name || '',
          slug: carrier.setup_article_id,
          summary: ''
        };
      }
    }

    return {
      carrier_option: carrier_option,
      carrier: carrier,
      setup_article: setup_article
    };
  }

  // startCarrierSetup(carrierOptionId)
  startCarrierSetup(carrierOptionId) {
    const detail = this.getCarrierOptionDetail(carrierOptionId);
    if (!detail.carrier_option || !detail.setup_article) {
      return {
        success: false,
        setup_article_id: '',
        setup_article_slug: '',
        message: 'No setup instructions available for this carrier.'
      };
    }
    const result = {
      success: true,
      setup_article_id: detail.setup_article.id,
      setup_article_slug: detail.setup_article.slug,
      message: 'Carrier setup instructions ready.'
    };

    // Instrumentation for task completion tracking
    try {
      if (result.success) {
        localStorage.setItem('task2_selectedCarrierOptionId', carrierOptionId);
      }
    } catch (e) {}

    return result;
  }

  // startArticleVideo(videoId)
  startArticleVideo(videoId) {
    const videos = this._getFromStorage('article_videos', []);
    const articles = this._getFromStorage('help_articles', []);
    const video = videos.find(v => v.id === videoId) || null;
    if (!video) {
      return {
        success: false,
        video: null,
        playback_url: '',
        message: 'Video not found.'
      };
    }
    const article = articles.find(a => a.id === video.article_id) || null;
    const playback_url = video.video_url;
    const result = {
      success: true,
      video: Object.assign({}, video, {
        // Foreign key resolution
        article: article
      }),
      playback_url,
      message: 'Video playback started.'
    };

    // Instrumentation for task completion tracking
    try {
      if (result.success) {
        localStorage.setItem('task3_lastVideoStart', JSON.stringify({
          "video_id": video.id,
          "article_id": video.article_id,
          "duration_seconds": video.duration_seconds,
          "timestamp": new Date().toISOString()
        }));
      }
    } catch (e) {}

    return result;
  }

  // getSupportFormInitialData(sourceArticleId)
  getSupportFormInitialData(sourceArticleId) {
    const articles = this._getFromStorage('help_articles', []);
    const sourceArticle = sourceArticleId
      ? articles.find(a => a.id === sourceArticleId) || null
      : null;

    // Static category/topic configuration derived from enums
    const categories = [
      { value: 'shipping_fulfillment', label: 'Shipping & Fulfillment' },
      { value: 'store_setup', label: 'Store setup' },
      { value: 'store_integrations', label: 'Store integrations' },
      { value: 'payments_payouts', label: 'Payments & payouts' },
      { value: 'customer_support_messaging', label: 'Customer support & messaging' },
      { value: 'billing_subscriptions', label: 'Billing & subscriptions' },
      { value: 'other', label: 'Other' }
    ];

    const topics = [
      { value: 'downgrade_to_basic_plan', label: 'Downgrade to Basic plan', category: 'billing_subscriptions' },
      { value: 'upgrade_plan', label: 'Upgrade plan', category: 'billing_subscriptions' },
      { value: 'billing_question', label: 'Billing question', category: 'billing_subscriptions' },
      { value: 'technical_issue', label: 'Technical issue', category: 'other' },
      { value: 'refund_request', label: 'Refund request', category: 'payments_payouts' },
      { value: 'other', label: 'Other', category: 'other' }
    ];

    const required_fields = {
      account_id: true,
      store_name: true,
      contact_email: true
    };

    const defaults = {
      category: sourceArticle ? sourceArticle.category_id || '' : '',
      topic: '',
      source_article_id: sourceArticle ? sourceArticle.id : null
    };

    if (sourceArticle && sourceArticle.category_id === 'billing_subscriptions') {
      defaults.category = 'billing_subscriptions';
      defaults.topic = 'downgrade_to_basic_plan';
    }

    return {
      categories,
      topics,
      required_fields,
      defaults,
      // Foreign key resolution
      source_article: sourceArticle
    };
  }

  // submitSupportRequest(category, topic, subject, message, accountId, storeName, contactEmail, sourceArticleId)
  submitSupportRequest(category, topic, subject, message, accountId, storeName, contactEmail, sourceArticleId) {
    const supportRequests = this._getFromStorage('support_requests', []);
    const articles = this._getFromStorage('help_articles', []);

    const now = new Date().toISOString();
    const request = {
      id: this._generateId('sr'),
      category: category,
      topic: topic,
      subject: subject || '',
      message: message,
      account_id: accountId || null,
      store_name: storeName || null,
      contact_email: contactEmail || null,
      source_article_id: sourceArticleId || null,
      status: 'submitted',
      created_at: now,
      updated_at: now
    };

    supportRequests.push(request);
    this._saveToStorage('support_requests', supportRequests);

    const sourceArticle = sourceArticleId
      ? articles.find(a => a.id === sourceArticleId) || null
      : null;

    return Object.assign({}, request, {
      // Foreign key resolution
      source_article: sourceArticle
    });
  }

  // getOrderAutomationSettings()
  getOrderAutomationSettings() {
    const defaultSettings = {
      id: 'order_automation_settings',
      auto_cancel_unfulfilled_enabled: false,
      auto_cancel_after_days: null,
      created_at: null,
      updated_at: null
    };
    return this._loadSettingsFromStore('order_automation_settings', defaultSettings);
  }

  // updateOrderAutomationSettings(autoCancelUnfulfilledEnabled, autoCancelAfterDays)
  updateOrderAutomationSettings(autoCancelUnfulfilledEnabled, autoCancelAfterDays) {
    const current = this.getOrderAutomationSettings();
    current.auto_cancel_unfulfilled_enabled = !!autoCancelUnfulfilledEnabled;
    if (current.auto_cancel_unfulfilled_enabled && typeof autoCancelAfterDays === 'number') {
      current.auto_cancel_after_days = autoCancelAfterDays;
    } else if (!current.auto_cancel_unfulfilled_enabled) {
      current.auto_cancel_after_days = null;
    }
    current.updated_at = new Date().toISOString();
    this._saveSettingsToStore('order_automation_settings', current);
    return current;
  }

  // getPayoutSettings()
  getPayoutSettings() {
    const defaultSettings = {
      id: 'payout_settings',
      payout_frequency: 'monthly',
      minimum_payout_amount: 0,
      currency: 'usd',
      created_at: null,
      updated_at: null
    };
    return this._loadSettingsFromStore('payout_settings', defaultSettings);
  }

  // updatePayoutSettings(payoutFrequency, minimumPayoutAmount, currency)
  updatePayoutSettings(payoutFrequency, minimumPayoutAmount, currency) {
    const current = this.getPayoutSettings();
    current.payout_frequency = payoutFrequency;
    current.minimum_payout_amount = typeof minimumPayoutAmount === 'number' ? minimumPayoutAmount : current.minimum_payout_amount;
    current.currency = currency || current.currency;
    current.updated_at = new Date().toISOString();
    this._saveSettingsToStore('payout_settings', current);
    return current;
  }

  // openCannedResponseEditorFromSnippet(templateSnippetId)
  openCannedResponseEditorFromSnippet(templateSnippetId) {
    const snippets = this._getFromStorage('article_template_snippets', []);
    const articles = this._getFromStorage('help_articles', []);
    const snippet = snippets.find(s => s.id === templateSnippetId) || null;

    if (!snippet) {
      return {
        suggested_title: '',
        body: '',
        folder_suggestions: ['General'],
        source_article_id: null,
        source_template_snippet_id: null,
        source_article: null,
        source_template_snippet: null
      };
    }

    let suggested_title = snippet.title;
    if (/defective item return/i.test(snippet.title)) {
      suggested_title = 'Defective item return - template A';
    }

    const folder_suggestions = [];
    if (snippet.snippet_type === 'defective_item_return' || snippet.snippet_type === 'return_message') {
      folder_suggestions.push('Returns & refunds');
    }
    folder_suggestions.push('General');

    const sourceArticle = articles.find(a => a.id === snippet.article_id) || null;

    return {
      suggested_title,
      body: snippet.body,
      folder_suggestions,
      source_article_id: snippet.article_id,
      source_template_snippet_id: snippet.id,
      // Foreign key resolution
      source_article: sourceArticle,
      source_template_snippet: snippet
    };
  }

  // saveCannedResponse(title, body, folder, sourceArticleId, sourceTemplateSnippetId)
  saveCannedResponse(title, body, folder, sourceArticleId, sourceTemplateSnippetId) {
    const cannedResponses = this._getFromStorage('canned_responses', []);
    const articles = this._getFromStorage('help_articles', []);
    const snippets = this._getFromStorage('article_template_snippets', []);

    const now = new Date().toISOString();
    const source_type = (sourceArticleId || sourceTemplateSnippetId) ? 'article_template' : 'custom';

    const response = {
      id: this._generateId('cr'),
      title: title,
      body: body,
      folder: folder || null,
      source_type: source_type,
      source_article_id: sourceArticleId || null,
      source_template_snippet_id: sourceTemplateSnippetId || null,
      is_active: true,
      created_at: now,
      updated_at: now
    };

    cannedResponses.push(response);
    this._saveToStorage('canned_responses', cannedResponses);

    const sourceArticle = sourceArticleId
      ? articles.find(a => a.id === sourceArticleId) || null
      : null;
    const sourceSnippet = sourceTemplateSnippetId
      ? snippets.find(s => s.id === sourceTemplateSnippetId) || null
      : null;

    return Object.assign({}, response, {
      // Foreign key resolution
      source_article: sourceArticle,
      source_template_snippet: sourceSnippet
    });
  }

  // getSystemStatusOverview(serviceSlug)
  getSystemStatusOverview(serviceSlug) {
    const servicesAll = this._getFromStorage('status_services', []);
    const incidentsAll = this._getFromStorage('status_incidents', []);

    let services = servicesAll.slice();
    if (serviceSlug) {
      services = services.filter(s => s.slug === serviceSlug);
    }

    let incidents = incidentsAll.slice();
    if (serviceSlug) {
      const serviceIds = servicesAll.filter(s => s.slug === serviceSlug).map(s => s.id);
      incidents = incidents.filter(inc => {
        if (!Array.isArray(inc.affected_service_ids)) return false;
        return inc.affected_service_ids.some(id => serviceIds.indexOf(id) !== -1);
      });
    }

    const serviceIndex = this._indexById(servicesAll);

    const incidentsWithServices = incidents
      .slice()
      .sort((a, b) => {
        const ad = a.started_at || '';
        const bd = b.started_at || '';
        return (bd > ad ? 1 : bd < ad ? -1 : 0);
      })
      .map(inc => {
        const affected_services = Array.isArray(inc.affected_service_ids)
          ? inc.affected_service_ids.map(id => serviceIndex[id]).filter(Boolean)
          : [];
        return Object.assign({}, inc, {
          affected_services
        });
      });

    return {
      services,
      incidents: incidentsWithServices
    };
  }

  // getStatusIncidentDetail(incidentId)
  getStatusIncidentDetail(incidentId) {
    const incidents = this._getFromStorage('status_incidents', []);
    const services = this._getFromStorage('status_services', []);
    const incident = incidents.find(i => i.id === incidentId) || null;
    if (!incident) {
      return {
        incident: null,
        affected_services: []
      };
    }
    const serviceIndex = this._indexById(services);
    const affected_services = Array.isArray(incident.affected_service_ids)
      ? incident.affected_service_ids.map(id => serviceIndex[id]).filter(Boolean)
      : [];
    return {
      incident,
      affected_services
    };
  }

  // getIncidentReportFormConfig(incidentId)
  getIncidentReportFormConfig(incidentId) {
    const incidents = this._getFromStorage('status_incidents', []);
    const incident = incidents.find(i => i.id === incidentId) || null;

    const incident_summary = incident
      ? { id: incident.id, title: incident.title }
      : { id: incidentId, title: '' };

    const allowed_severities = ['low', 'medium', 'high'];
    const default_severity = 'medium';

    return {
      incident_summary,
      allowed_severities,
      default_severity
    };
  }

  // submitIncidentReport(incidentId, subject, severity, description)
  submitIncidentReport(incidentId, subject, severity, description) {
    const incidentReports = this._getFromStorage('incident_reports', []);
    const incidents = this._getFromStorage('status_incidents', []);

    const allowed = ['low', 'medium', 'high'];
    const sev = allowed.indexOf(severity) !== -1 ? severity : 'medium';

    const now = new Date().toISOString();
    const report = {
      id: this._generateId('ir'),
      incident_id: incidentId,
      subject: subject,
      severity: sev,
      description: description || '',
      created_at: now
    };

    incidentReports.push(report);
    this._saveToStorage('incident_reports', incidentReports);

    const incident = incidents.find(i => i.id === incidentId) || null;

    return Object.assign({}, report, {
      // Foreign key resolution
      incident: incident
    });
  }

  // getAboutHelpCenterContent()
  getAboutHelpCenterContent() {
    const title = 'About Help Center';
    const content = [
      '# Help Center',
      '',
      'This Help Center provides documentation, templates, and troubleshooting guides for your ecommerce dropshipping platform.',
      '',
      '- Browse categories like Store setup, Shipping & Fulfillment, and Billing & subscriptions.',
      '- Use the global search to quickly find policy templates, integration guides, and error resolutions.',
      '- Follow links in articles to open in-product settings such as payout configuration or order automation.'
    ].join('\n');

    const highlighted_links = [
      { label: 'Help Center home', target: 'help_center_home' },
      { label: 'Contact support', target: 'support_request_form' }
    ];

    return {
      title,
      content,
      highlighted_links
    };
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    const title = 'Terms of Use';
    const last_updated = '2024-01-01';
    const content = [
      '# Terms of Use',
      '',
      'By accessing and using this Help Center you agree to abide by the platform\'s main Terms of Service.',
      '',
      'The Help Center content is provided for informational purposes only and may be updated without notice.'
    ].join('\n');

    return {
      title,
      last_updated,
      content
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const title = 'Privacy Policy';
    const last_updated = '2024-01-01';
    const content = [
      '# Privacy Policy',
      '',
      'The Help Center stores limited usage data (such as article IDs, settings, and support requests) in order to operate features like search, templates, and incident reporting.',
      '',
      'No sensitive payment information is stored in this Help Center module. For full details, please review the platform\'s main Privacy Policy.'
    ].join('\n');

    return {
      title,
      last_updated,
      content
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
