/* eslint-disable no-var */
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
  }

  // ------------------------
  // Storage helpers
  // ------------------------
  _initStorage() {
    const keys = [
      'articles',
      'help_categories',
      'saved_articles',
      'notes',
      'note_article_links',
      'article_feedback',
      'chat_sessions',
      'chat_article_suggestions',
      'support_tickets',
      'community_categories',
      'community_threads',
      'community_replies',
      'followed_threads',
      'return_orders',
      'return_requests',
      'article_sections',
      'troubleshooting_steps',
      'troubleshooting_sessions',
      'app_settings'
    ];

    for (let i = 0; i < keys.length; i++) {
      if (localStorage.getItem(keys[i]) == null) {
        localStorage.setItem(keys[i], JSON.stringify([]));
      }
    }

    if (localStorage.getItem('idCounter') == null) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed minimal default records required for tests when storage is empty
    // --- Seed core articles ---
    let articlesRaw = localStorage.getItem('articles');
    let articles = [];
    if (articlesRaw) {
      try {
        articles = JSON.parse(articlesRaw) || [];
      } catch (e) {
        articles = [];
      }
    }

    const ensureArticle = (article) => {
      if (!articles.some((a) => a && a.id === article.id)) {
        articles.push(article);
      }
    };

    const nowIso = new Date().toISOString();

    // Short troubleshooting guide for login issues (ties into generated troubleshooting_steps)
    ensureArticle({
      id: 'cant_log_in_short_guide',
      title: "Short guide: Can't log in to your account",
      slug: 'cant-log-in-short-guide',
      category_key: 'account_security',
      topics: ['Login issues', 'Password', 'Two-factor authentication'],
      language: 'en',
      content_type: 'troubleshooting_guide',
      has_video: false,
      last_updated: nowIso,
      is_active: true,
      search_keywords: ["can't log in", 'cannot log in', 'login help', 'short troubleshooting guide'],
      is_chat_suggestable: false,
      chat_topics: ['account_issues'],
      rating_count: 0,
      rating_average: null,
      steps_count: 3
    });

    // Tracking number help article used for chat suggestions
    ensureArticle({
      id: 'where_to_find_tracking_number',
      title: 'Where to find your tracking number',
      slug: 'where-to-find-tracking-number',
      category_key: 'orders_returns',
      topics: ['Delivery & Tracking', 'Tracking number'],
      language: 'en',
      content_type: 'standard_article',
      has_video: false,
      last_updated: nowIso,
      is_active: true,
      search_keywords: ['tracking number', 'find tracking number', 'delivery tracking', 'order tracking'],
      is_chat_suggestable: true,
      chat_topics: ['delivery_tracking'],
      rating_count: 0,
      rating_average: null,
      steps_count: 0
    });

    // Spanish shipping video guide ("envio" search)
    ensureArticle({
      id: 'es_envio_video_guide',
      title: 'Gu de envo y seguimiento de paquetes (video)',
      slug: 'guia-envio-seguimiento-video',
      category_key: 'orders_returns',
      topics: ['Envo', 'Seguimiento de pedidos'],
      language: 'es',
      content_type: 'video_guide',
      has_video: true,
      last_updated: nowIso,
      is_active: true,
      search_keywords: ['envio', 'envo', 'envios', 'envos', 'seguimiento', 'envio de paquetes'],
      is_chat_suggestable: true,
      chat_topics: ['delivery_tracking'],
      rating_count: 0,
      rating_average: null,
      steps_count: 0
    });

    // FAQ article for enabling two-factor authentication (2FA)
    ensureArticle({
      id: 'faq_enable_2fa',
      title: 'Enable two-factor authentication (2FA) for your account',
      slug: 'enable-two-factor-authentication',
      category_key: 'account_security',
      topics: ['Security', 'Two-factor authentication'],
      language: 'en',
      content_type: 'faq_article',
      has_video: false,
      last_updated: nowIso,
      is_active: true,
      search_keywords: ['two-factor authentication', '2fa', 'sms codes', 'security'],
      is_chat_suggestable: false,
      chat_topics: ['account_issues'],
      rating_count: 0,
      rating_average: null,
      steps_count: 0
    });

    localStorage.setItem('articles', JSON.stringify(articles));

    // --- Seed additional article sections needed for 2FA FAQ (SMS section) ---
    let sectionsRaw = localStorage.getItem('article_sections');
    let sections = [];
    if (sectionsRaw) {
      try {
        sections = JSON.parse(sectionsRaw) || [];
      } catch (e) {
        sections = [];
      }
    }

    const ensureSection = (section) => {
      if (!sections.some((s) => s && s.id === section.id)) {
        sections.push(section);
      }
    };

    // SMS-related section nested under Methods tab for 2FA FAQ
    ensureSection({
      id: 'sec_2fa_sms_accordion',
      articleId: 'faq_enable_2fa',
      title: 'Use SMS text messages',
      section_type: 'accordion',
      parent_section_id: 'sec_2fa_methods_tab',
      order: 4,
      is_expandable: true,
      is_default_open: false
    });

    localStorage.setItem('article_sections', JSON.stringify(sections));
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultValue;
    try {
      return JSON.parse(raw);
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

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _tokenize(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .split(/[^a-z0-9áéíóúñü]+/i)
      .filter(Boolean);
  }

  // ------------------------
  // Private helpers (from spec)
  // ------------------------

  _getOrCreateAppSettings() {
    let settingsArr = this._getFromStorage('app_settings');
    if (!Array.isArray(settingsArr)) settingsArr = [];

    if (settingsArr.length > 0) {
      return settingsArr[0];
    }

    const settings = {
      id: this._generateId('appsettings'),
      language: 'en',
      chat_minimized: true,
      last_updated: this._nowISO()
    };
    settingsArr.push(settings);
    this._saveToStorage('app_settings', settingsArr);
    return settings;
  }

  _getOrCreateChatSession() {
    let sessions = this._getFromStorage('chat_sessions');
    if (!Array.isArray(sessions)) sessions = [];

    let session = sessions.find((s) => s.status === 'open');
    if (session) {
      return session;
    }

    session = {
      id: this._generateId('chatsession'),
      topic: null,
      input_draft: '',
      started_at: this._nowISO(),
      ended_at: null,
      status: 'open',
      is_minimized: false
    };
    sessions.push(session);
    this._saveToStorage('chat_sessions', sessions);
    return session;
  }

  _getCurrentLanguage(explicitLanguage) {
    if (explicitLanguage) return explicitLanguage;
    const settings = this._getOrCreateAppSettings();
    return settings.language || 'en';
  }

  _getCurrentTroubleshootingSession(sessionId) {
    let sessions = this._getFromStorage('troubleshooting_sessions');
    if (!Array.isArray(sessions)) sessions = [];

    const session = sessions.find((s) => s.id === sessionId) || null;
    if (!session) return null;

    return session;
  }

  // ------------------------
  // Utility helpers for search and sorting
  // ------------------------

  _matchesArticleQuery(article, query) {
    if (!query) return true;
    const q = String(query).toLowerCase();
    if (article.title && article.title.toLowerCase().includes(q)) return true;
    if (article.body && article.body.toLowerCase().includes(q)) return true;
    if (Array.isArray(article.search_keywords)) {
      for (let i = 0; i < article.search_keywords.length; i++) {
        const kw = article.search_keywords[i];
        if (kw && String(kw).toLowerCase().includes(q)) return true;
      }
    }
    return false;
  }

  _filterArticlesByLastUpdatedRange(articles, range) {
    if (!range || range === 'any_time') return articles;
    const now = new Date();
    let cutoff = null;
    if (range === 'past_30_days') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === 'past_12_months') {
      cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    } else {
      return articles;
    }
    return articles.filter((a) => {
      if (!a.last_updated) return false;
      const d = new Date(a.last_updated);
      return d >= cutoff;
    });
  }

  _sortArticles(list, sort_by) {
    const arr = list.slice();
    if (sort_by === 'rating_desc') {
      arr.sort((a, b) => {
        const ra = a.rating_average || 0;
        const rb = b.rating_average || 0;
        if (rb !== ra) return rb - ra;
        const rc = (b.rating_count || 0) - (a.rating_count || 0);
        if (rc !== 0) return rc;
        return 0;
      });
    } else if (sort_by === 'last_updated_desc') {
      arr.sort((a, b) => {
        const da = a.last_updated ? new Date(a.last_updated).getTime() : 0;
        const db = b.last_updated ? new Date(b.last_updated).getTime() : 0;
        return db - da;
      });
    } else if (sort_by === 'most_viewed') {
      // No view count field; approximate with rating_count
      arr.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
    }
    // 'relevance' or unknown: keep original order (already filtered by relevance)
    return arr;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getAppSettings
  getAppSettings() {
    const settings = this._getOrCreateAppSettings();
    return { settings };
  }

  // updateLanguage(language)
  updateLanguage(language) {
    const allowed = ['en', 'es'];
    const lang = allowed.indexOf(language) >= 0 ? language : 'en';
    let settingsArr = this._getFromStorage('app_settings');
    if (!Array.isArray(settingsArr) || settingsArr.length === 0) {
      this._getOrCreateAppSettings();
      settingsArr = this._getFromStorage('app_settings');
    }
    const settings = settingsArr[0];
    settings.language = lang;
    settings.last_updated = this._nowISO();
    settingsArr[0] = settings;
    this._saveToStorage('app_settings', settingsArr);
    return { settings };
  }

  // getHelpCenterHomeView()
  getHelpCenterHomeView() {
    const language = this._getCurrentLanguage();
    const categories = this._getFromStorage('help_categories');
    const articles = this._getFromStorage('articles');

    const activeArticles = articles.filter(
      (a) => a.is_active && a.language === language
    );

    // Featured: highest rated per category
    const featuredArticles = [];
    for (let i = 0; i < activeArticles.length; i++) {
      const art = activeArticles[i];
      const cat = categories.find((c) => c.key === art.category_key) || null;
      featuredArticles.push({
        articleId: art.id,
        title: art.title,
        category_key: art.category_key,
        category_name: cat ? cat.name : '',
        rating_average: art.rating_average || 0,
        last_updated: art.last_updated || null,
        article: art // foreign key resolution
      });
    }

    featuredArticles.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));

    const communityCategories = this._getFromStorage('community_categories');

    const quickLinks = {
      hasFaq: categories.some((c) => c.is_faq_category === true),
      hasCommunity: communityCategories.length > 0,
      hasContact: true,
      hasReturns:
        categories.some((c) => c.key === 'returns_exchanges') ||
        this._getFromStorage('return_orders').length > 0
    };

    return {
      language,
      categories,
      featuredArticles,
      quickLinks
    };
  }

  // searchArticles(query, filters, sort_by, page, page_size)
  searchArticles(query, filters, sort_by = 'relevance', page = 1, page_size = 20) {
    filters = filters || {};
    const language = this._getCurrentLanguage(filters.language);
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('help_categories');

    let results = articles.filter((a) => a.is_active && a.language === language);

    if (filters.category_keys && filters.category_keys.length) {
      const allowed = filters.category_keys;
      results = results.filter((a) => allowed.indexOf(a.category_key) >= 0);
    }

    if (filters.topics && filters.topics.length) {
      results = results.filter((a) => {
        if (!Array.isArray(a.topics)) return false;
        return a.topics.some((t) => filters.topics.indexOf(t) >= 0);
      });
    }

    if (filters.content_types && filters.content_types.length) {
      results = results.filter(
        (a) => filters.content_types.indexOf(a.content_type) >= 0
      );
    }

    if (filters.last_updated_range) {
      results = this._filterArticlesByLastUpdatedRange(
        results,
        filters.last_updated_range
      );
    }

    if (query) {
      results = results.filter((a) => this._matchesArticleQuery(a, query));
    }

    results = this._sortArticles(results, sort_by);

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = results.slice(start, end).map((a) => {
      const cat = categories.find((c) => c.key === a.category_key) || null;
      return {
        articleId: a.id,
        title: a.title,
        snippet: a.body ? String(a.body).slice(0, 200) : '',
        category_key: a.category_key,
        category_name: cat ? cat.name : '',
        topics: a.topics || [],
        language: a.language,
        content_type: a.content_type,
        has_video: !!a.has_video,
        steps_count: a.steps_count || null,
        rating_average: a.rating_average || 0,
        rating_count: a.rating_count || 0,
        last_updated: a.last_updated || null,
        article: a // foreign key resolution
      };
    });

    return {
      query,
      total_count,
      page,
      page_size,
      results: pageItems
    };
  }

  // getSearchFilterOptions()
  getSearchFilterOptions() {
    const categories = this._getFromStorage('help_categories');
    const articles = this._getFromStorage('articles');

    const topicSet = {};
    const typeSet = {};
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (Array.isArray(a.topics)) {
        for (let j = 0; j < a.topics.length; j++) {
          const t = a.topics[j];
          if (t) topicSet[t] = true;
        }
      }
      if (a.content_type) typeSet[a.content_type] = true;
    }

    const topics = Object.keys(topicSet).sort();
    const content_types = Object.keys(typeSet).sort().map((val) => ({
      value: val,
      label: val
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const last_updated_ranges = [
      { value: 'any_time', label: 'Any time' },
      { value: 'past_30_days', label: 'Past 30 days' },
      { value: 'past_12_months', label: 'Past 12 months' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'last_updated_desc', label: 'Last updated' },
      { value: 'most_viewed', label: 'Most viewed' }
    ];

    const languages = [
      { code: 'en', label: 'English' },
      { code: 'es', label: 'Español' }
    ];

    return {
      categories,
      topics,
      content_types,
      last_updated_ranges,
      sort_options,
      languages
    };
  }

  // getCategoryListingView(category_key, filters, sort_by, view_mode)
  getCategoryListingView(category_key, filters, sort_by = 'relevance', view_mode = 'standard') {
    filters = filters || {};
    const language = this._getCurrentLanguage();
    const categories = this._getFromStorage('help_categories');
    const articles = this._getFromStorage('articles');

    const category = categories.find((c) => c.key === category_key) || null;

    let list = articles.filter(
      (a) =>
        a.is_active &&
        a.language === language &&
        a.category_key === category_key
    );

    if (filters.topics && filters.topics.length) {
      list = list.filter((a) => {
        if (!Array.isArray(a.topics)) return false;
        return a.topics.some((t) => filters.topics.indexOf(t) >= 0);
      });
    }

    if (filters.content_types && filters.content_types.length) {
      list = list.filter(
        (a) => filters.content_types.indexOf(a.content_type) >= 0
      );
    }

    if (sort_by === 'last_updated_desc') {
      list.sort((a, b) => {
        const da = a.last_updated ? new Date(a.last_updated).getTime() : 0;
        const db = b.last_updated ? new Date(b.last_updated).getTime() : 0;
        return db - da;
      });
    } else if (sort_by === 'popularity') {
      list.sort((a, b) => {
        const ra = a.rating_average || 0;
        const rb = b.rating_average || 0;
        if (rb !== ra) return rb - ra;
        return (b.rating_count || 0) - (a.rating_count || 0);
      });
    }

    const items = list.map((a) => ({
      articleId: a.id,
      title: a.title,
      is_faq_style:
        view_mode === 'faq' || a.content_type === 'faq_article',
      topics: a.topics || [],
      content_type: a.content_type,
      rating_average: a.rating_average || 0,
      last_updated: a.last_updated || null,
      article: a // foreign key resolution
    }));

    return {
      category,
      view_mode,
      articles: items
    };
  }

  // getCategoryFilterOptions(category_key)
  getCategoryFilterOptions(category_key) {
    const language = this._getCurrentLanguage();
    const articles = this._getFromStorage('articles');

    const topicSet = {};
    const typeSet = {};

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (!a.is_active || a.language !== language) continue;
      if (a.category_key !== category_key) continue;

      if (Array.isArray(a.topics)) {
        for (let j = 0; j < a.topics.length; j++) {
          const t = a.topics[j];
          if (t) topicSet[t] = true;
        }
      }
      if (a.content_type) typeSet[a.content_type] = true;
    }

    const topics = Object.keys(topicSet).sort();
    const content_types = Object.keys(typeSet).sort().map((val) => ({
      value: val,
      label: val
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    return {
      topics,
      content_types
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('help_categories');
    const sectionsAll = this._getFromStorage('article_sections');
    const stepsAll = this._getFromStorage('troubleshooting_steps');
    const savedArticles = this._getFromStorage('saved_articles');
    const feedbacks = this._getFromStorage('article_feedback');

    const article = articles.find((a) => a.id === articleId) || null;
    const category = article
      ? categories.find((c) => c.key === article.category_key) || null
      : null;

    const metadata = article
      ? {
          category_name: category ? category.name : '',
          language_label: article.language === 'es' ? 'Español' : 'English',
          content_type_label: article.content_type,
          rating_average: article.rating_average || 0,
          rating_count: article.rating_count || 0,
          last_updated: article.last_updated || null,
          steps_count: article.steps_count || null,
          has_video: !!article.has_video
        }
      : null;

    const sectionsRaw = sectionsAll.filter((s) => s.articleId === articleId);
    const sections = sectionsRaw.map((s) => {
      const parent = s.parent_section_id
        ? sectionsRaw.find((p) => p.id === s.parent_section_id) || null
        : null;
      return Object.assign({}, s, {
        article,
        parent_section: parent
      });
    });

    const troubleshooting_steps = stepsAll
      .filter((st) => st.articleId === articleId)
      .sort((a, b) => (a.step_number || 0) - (b.step_number || 0))
      .map((st) => Object.assign({}, st, { article }));

    const is_saved = savedArticles.some((s) => s.articleId === articleId);
    const articleFeedbacks = feedbacks
      .filter((f) => f.articleId === articleId)
      .sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    const lastFeedback = articleFeedbacks[0] || null;

    const user_state = {
      is_saved,
      user_feedback: lastFeedback ? lastFeedback.rating : null
    };

    // Instrumentation for task completion tracking
    try {
      if (articleId === 'faq_enable_2fa') {
        localStorage.setItem(
          'task8_2faFaqArticleOpened',
          JSON.stringify({ articleId: articleId, opened_at: this._nowISO() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article,
      category,
      metadata,
      sections,
      troubleshooting_steps,
      user_state
    };
  }

  // saveArticleToFavorites(articleId)
  saveArticleToFavorites(articleId) {
    let savedArticles = this._getFromStorage('saved_articles');
    if (!Array.isArray(savedArticles)) savedArticles = [];

    const existing = savedArticles.find((s) => s.articleId === articleId);
    if (existing) {
      return { savedArticle: existing, was_already_saved: true };
    }

    const savedArticle = {
      id: this._generateId('savedarticle'),
      articleId,
      saved_at: this._nowISO()
    };
    savedArticles.push(savedArticle);
    this._saveToStorage('saved_articles', savedArticles);

    return { savedArticle, was_already_saved: false };
  }

  // removeArticleFromFavorites(articleId)
  removeArticleFromFavorites(articleId) {
    let savedArticles = this._getFromStorage('saved_articles');
    if (!Array.isArray(savedArticles)) savedArticles = [];

    const before = savedArticles.length;
    savedArticles = savedArticles.filter((s) => s.articleId !== articleId);
    this._saveToStorage('saved_articles', savedArticles);

    return { success: savedArticles.length < before };
  }

  // getSavedArticlesView(sort_by, group_by)
  getSavedArticlesView(sort_by = 'saved_at_desc', group_by = 'none') {
    let savedArticles = this._getFromStorage('saved_articles');
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('help_categories');

    const items = savedArticles.map((sa) => {
      const article = articles.find((a) => a.id === sa.articleId) || null;
      const category = article
        ? categories.find((c) => c.key === article.category_key) || null
        : null;
      return {
        savedArticle: sa,
        article_title: article ? article.title : '',
        category_key: article ? article.category_key : null,
        category_name: category ? category.name : '',
        language: article ? article.language : null,
        content_type: article ? article.content_type : null,
        last_updated: article ? article.last_updated || null : null,
        rating_average: article ? article.rating_average || 0 : 0,
        article // foreign key resolution
      };
    });

    if (sort_by === 'saved_at_desc') {
      items.sort((a, b) => {
        const da = a.savedArticle.saved_at
          ? new Date(a.savedArticle.saved_at).getTime()
          : 0;
        const db = b.savedArticle.saved_at
          ? new Date(b.savedArticle.saved_at).getTime()
          : 0;
        return db - da;
      });
    } else if (sort_by === 'category') {
      items.sort((a, b) => {
        if (a.category_name < b.category_name) return -1;
        if (a.category_name > b.category_name) return 1;
        return 0;
      });
    } else if (sort_by === 'last_updated_desc') {
      items.sort((a, b) => {
        const da = a.last_updated ? new Date(a.last_updated).getTime() : 0;
        const db = b.last_updated ? new Date(b.last_updated).getTime() : 0;
        return db - da;
      });
    }

    // group_by is accepted but not altering structure; caller can group client-side

    return { items };
  }

  // submitArticleFeedback(articleId, rating)
  submitArticleFeedback(articleId, rating) {
    let feedbacks = this._getFromStorage('article_feedback');
    if (!Array.isArray(feedbacks)) feedbacks = [];

    const feedback = {
      id: this._generateId('articlefeedback'),
      articleId,
      rating: rating === 'negative' ? 'negative' : 'positive',
      created_at: this._nowISO()
    };

    feedbacks.push(feedback);
    this._saveToStorage('article_feedback', feedbacks);

    return { feedback };
  }

  // getNotesListView(context_articleId)
  getNotesListView(context_articleId) {
    const notes = this._getFromStorage('notes');
    const links = this._getFromStorage('note_article_links');

    const items = notes.map((note) => {
      const noteLinks = links.filter((l) => l.noteId === note.id);
      const body_preview = note.body
        ? String(note.body).slice(0, 200)
        : '';
      return {
        note,
        body_preview,
        linked_articles_count: noteLinks.length
      };
    });

    return {
      notes: items,
      context_articleId: context_articleId || null
    };
  }

  // getNoteDetail(noteId)
  getNoteDetail(noteId) {
    const notes = this._getFromStorage('notes');
    const links = this._getFromStorage('note_article_links');
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('help_categories');

    const note = notes.find((n) => n.id === noteId) || null;

    const linked = links.filter((l) => l.noteId === noteId);
    const linked_articles = linked.map((l) => {
      const article = articles.find((a) => a.id === l.articleId) || null;
      const category = article
        ? categories.find((c) => c.key === article.category_key) || null
        : null;
      return {
        articleId: l.articleId,
        title: article ? article.title : '',
        category_key: article ? article.category_key : null,
        category_name: category ? category.name : '',
        language: article ? article.language : null,
        article // foreign key resolution
      };
    });

    return { note, linked_articles };
  }

  // createNote(title, body)
  createNote(title, body) {
    let notes = this._getFromStorage('notes');
    if (!Array.isArray(notes)) notes = [];

    const now = this._nowISO();
    const note = {
      id: this._generateId('note'),
      title: title || '',
      body: body || '',
      created_at: now,
      updated_at: now
    };

    notes.push(note);
    this._saveToStorage('notes', notes);

    return { note };
  }

  // updateNote(noteId, title, body)
  updateNote(noteId, title, body) {
    let notes = this._getFromStorage('notes');
    if (!Array.isArray(notes)) notes = [];

    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) {
      return { note: null };
    }

    const note = notes[idx];
    if (typeof title === 'string') note.title = title;
    if (typeof body === 'string') note.body = body;
    note.updated_at = this._nowISO();
    notes[idx] = note;
    this._saveToStorage('notes', notes);

    return { note };
  }

  // deleteNote(noteId)
  deleteNote(noteId) {
    let notes = this._getFromStorage('notes');
    let links = this._getFromStorage('note_article_links');

    const before = notes.length;
    notes = notes.filter((n) => n.id !== noteId);
    links = links.filter((l) => l.noteId !== noteId);

    this._saveToStorage('notes', notes);
    this._saveToStorage('note_article_links', links);

    return { success: notes.length < before };
  }

  // getNotesForArticleLinking(articleId)
  getNotesForArticleLinking(articleId) {
    const notes = this._getFromStorage('notes');
    // articleId not used for filtering here but kept for interface parity
    return {
      existing_notes: notes
    };
  }

  // createNoteWithArticleLink(title, articleId, body)
  createNoteWithArticleLink(title, articleId, body) {
    let notes = this._getFromStorage('notes');
    let links = this._getFromStorage('note_article_links');

    const now = this._nowISO();
    const note = {
      id: this._generateId('note'),
      title: title || '',
      body: body || '',
      created_at: now,
      updated_at: now
    };
    notes.push(note);

    const note_article_link = {
      id: this._generateId('notearticlelink'),
      noteId: note.id,
      articleId,
      created_at: now
    };
    links.push(note_article_link);

    this._saveToStorage('notes', notes);
    this._saveToStorage('note_article_links', links);

    return { note, note_article_link };
  }

  // addArticleLinkToExistingNote(noteId, articleId)
  addArticleLinkToExistingNote(noteId, articleId) {
    let links = this._getFromStorage('note_article_links');
    if (!Array.isArray(links)) links = [];

    const link = {
      id: this._generateId('notearticlelink'),
      noteId,
      articleId,
      created_at: this._nowISO()
    };
    links.push(link);
    this._saveToStorage('note_article_links', links);

    return { note_article_link: link };
  }

  // openChatWidget()
  openChatWidget() {
    const chat_session = this._getOrCreateChatSession();

    const available_topics = [
      { topic: 'delivery_tracking', label: 'Delivery & Tracking' },
      { topic: 'orders_returns', label: 'Orders & Returns' },
      { topic: 'billing_payments', label: 'Billing & Payments' },
      { topic: 'account_issues', label: 'Account issues' },
      { topic: 'other', label: 'Other' }
    ];

    return {
      chat_session,
      available_topics
    };
  }

  // setChatTopic(topic)
  setChatTopic(topic) {
    let sessions = this._getFromStorage('chat_sessions');
    if (!Array.isArray(sessions)) sessions = [];

    let session = sessions.find((s) => s.status === 'open');
    if (!session) {
      session = this._getOrCreateChatSession();
      sessions = this._getFromStorage('chat_sessions');
    }

    session.topic = topic;
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('chat_sessions', sessions);

    return { chat_session: session };
  }

  // updateChatInputDraft(draft_text)
  updateChatInputDraft(draft_text) {
    let sessions = this._getFromStorage('chat_sessions');
    if (!Array.isArray(sessions)) sessions = [];

    let session = sessions.find((s) => s.status === 'open');
    if (!session) {
      session = this._getOrCreateChatSession();
      sessions = this._getFromStorage('chat_sessions');
    }

    session.input_draft = draft_text || '';
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('chat_sessions', sessions);

    return { chat_session: session };
  }

  // getChatArticleSuggestions()
  getChatArticleSuggestions() {
    const chat_session = this._getOrCreateChatSession();
    const language = this._getCurrentLanguage();
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('help_categories');

    // Clear previous suggestions for this session
    let suggestionsAll = this._getFromStorage('chat_article_suggestions');
    suggestionsAll = suggestionsAll.filter(
      (s) => s.chatSessionId !== chat_session.id
    );

    const inputTokens = this._tokenize(chat_session.input_draft || '');

    let candidates = articles.filter((a) => a.is_active && a.language === language);

    // Filter by topic if available
    if (chat_session.topic) {
      candidates = candidates.filter((a) => {
        if (!Array.isArray(a.chat_topics)) return true;
        return a.chat_topics.indexOf(chat_session.topic) >= 0;
      });
    }

    // Basic scoring
    const scored = [];
    for (let i = 0; i < candidates.length; i++) {
      const a = candidates[i];
      let score = 0;
      if (chat_session.topic && Array.isArray(a.chat_topics)) {
        if (a.chat_topics.indexOf(chat_session.topic) >= 0) score += 5;
      }
      if (inputTokens.length) {
        const textTokens = this._tokenize(
          (a.title || '') + ' ' + (a.body || '')
        ).concat(Array.isArray(a.search_keywords) ? a.search_keywords : []);
        for (let t = 0; t < inputTokens.length; t++) {
          const tok = inputTokens[t];
          if (textTokens.join(' ').toLowerCase().indexOf(tok) >= 0) {
            score += 1;
          }
        }
      }
      if (score > 0 || !inputTokens.length) {
        scored.push({ article: a, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const now = this._nowISO();
    const suggestions = [];
    const maxSuggestions = 5;
    for (let i = 0; i < scored.length && suggestions.length < maxSuggestions; i++) {
      const a = scored[i].article;
      const suggestion = {
        id: this._generateId('chatsuggestion'),
        chatSessionId: chat_session.id,
        articleId: a.id,
        created_at: now,
        selected: false
      };
      suggestionsAll.push(suggestion);
      const category = categories.find((c) => c.key === a.category_key) || null;
      suggestions.push({
        suggestionId: suggestion.id,
        articleId: a.id,
        title: a.title,
        snippet: a.body ? String(a.body).slice(0, 200) : '',
        category_name: category ? category.name : '',
        matches_topic: !!(
          chat_session.topic &&
          Array.isArray(a.chat_topics) &&
          a.chat_topics.indexOf(chat_session.topic) >= 0
        ),
        article: a // foreign key resolution
      });
    }

    this._saveToStorage('chat_article_suggestions', suggestionsAll);

    return { suggestions };
  }

  // selectChatArticleSuggestion(suggestionId)
  selectChatArticleSuggestion(suggestionId) {
    let suggestionsAll = this._getFromStorage('chat_article_suggestions');
    if (!Array.isArray(suggestionsAll)) suggestionsAll = [];

    const idx = suggestionsAll.findIndex((s) => s.id === suggestionId);
    if (idx === -1) {
      return { selected_suggestion: null, article_preview: null };
    }

    const selected = suggestionsAll[idx];
    selected.selected = true;
    suggestionsAll[idx] = selected;
    this._saveToStorage('chat_article_suggestions', suggestionsAll);

    const articles = this._getFromStorage('articles');
    const chatSessions = this._getFromStorage('chat_sessions');

    const article = articles.find((a) => a.id === selected.articleId) || null;
    const chatSession = chatSessions.find((c) => c.id === selected.chatSessionId) || null;

    const selected_suggestion = Object.assign({}, selected, {
      article,
      chatSession
    });

    const article_preview = {
      articleId: article ? article.id : selected.articleId,
      title: article ? article.title : ''
    };

    return {
      selected_suggestion,
      article_preview
    };
  }

  // minimizeChatWidget()
  minimizeChatWidget() {
    let sessions = this._getFromStorage('chat_sessions');
    if (!Array.isArray(sessions)) sessions = [];

    let session = sessions.find((s) => s.status === 'open');
    if (!session) {
      session = this._getOrCreateChatSession();
      sessions = this._getFromStorage('chat_sessions');
    }

    session.is_minimized = true;
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('chat_sessions', sessions);

    const settings = this._getOrCreateAppSettings();
    const settingsArr = [Object.assign({}, settings, {
      chat_minimized: true,
      last_updated: this._nowISO()
    })];
    this._saveToStorage('app_settings', settingsArr);

    return {
      chat_session: session,
      app_settings: settingsArr[0]
    };
  }

  // closeChatWidget()
  closeChatWidget() {
    let sessions = this._getFromStorage('chat_sessions');
    if (!Array.isArray(sessions)) sessions = [];

    let session = sessions.find((s) => s.status === 'open');
    if (!session) {
      return { chat_session: null };
    }

    session.status = 'closed';
    session.ended_at = this._nowISO();
    session.is_minimized = true;

    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('chat_sessions', sessions);

    return { chat_session: session };
  }

  // startTroubleshootingSession(articleId)
  startTroubleshootingSession(articleId) {
    const articles = this._getFromStorage('articles');
    const stepsAll = this._getFromStorage('troubleshooting_steps');

    const article = articles.find((a) => a.id === articleId) || null;
    const steps = stepsAll
      .filter((s) => s.articleId === articleId)
      .sort((a, b) => (a.step_number || 0) - (b.step_number || 0));

    const session = {
      id: this._generateId('troubleshootingsession'),
      articleId,
      started_at: this._nowISO(),
      current_step_number: steps.length ? steps[0].step_number || 1 : 1,
      is_completed: steps.length === 0
    };

    let sessions = this._getFromStorage('troubleshooting_sessions');
    if (!Array.isArray(sessions)) sessions = [];
    sessions.push(session);
    this._saveToStorage('troubleshooting_sessions', sessions);

    const current_step = steps.length
      ? Object.assign({}, steps[0], { article })
      : null;

    return {
      session: Object.assign({}, session, { article }),
      current_step,
      total_steps: steps.length
    };
  }

  // getTroubleshootingSession(sessionId)
  getTroubleshootingSession(sessionId) {
    const session = this._getCurrentTroubleshootingSession(sessionId);
    if (!session) {
      return { session: null, current_step: null, total_steps: 0 };
    }

    const articles = this._getFromStorage('articles');
    const stepsAll = this._getFromStorage('troubleshooting_steps');

    const article = articles.find((a) => a.id === session.articleId) || null;
    const steps = stepsAll
      .filter((s) => s.articleId === session.articleId)
      .sort((a, b) => (a.step_number || 0) - (b.step_number || 0));

    let current_step = null;
    if (steps.length) {
      current_step = steps.find(
        (s) => s.step_number === session.current_step_number
      );
      if (!current_step) {
        current_step = steps[steps.length - 1];
      }
    }

    const decoratedStep = current_step
      ? Object.assign({}, current_step, { article })
      : null;

    return {
      session: Object.assign({}, session, { article }),
      current_step: decoratedStep,
      total_steps: steps.length
    };
  }

  // getContactFormOptions()
  getContactFormOptions() {
    const categories = [
      { value: 'orders_shipping', label: 'Orders & Shipping' },
      { value: 'billing_payments', label: 'Billing & Payments' },
      { value: 'technical_support', label: 'Technical support' },
      { value: 'account_issues', label: 'Account issues' },
      { value: 'returns_exchanges', label: 'Returns & Exchanges' },
      { value: 'other', label: 'Other' }
    ];

    const urgency_levels = [
      { value: 'low', label: 'Low (response within 24 hours)', expected_response_time_hours: 24 },
      { value: 'medium', label: 'Medium (response within 8 hours)', expected_response_time_hours: 8 },
      { value: 'high', label: 'High (response within 4 hours)', expected_response_time_hours: 4 }
    ];

    const contact_methods = [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'chat', label: 'Chat' }
    ];

    const time_windows = [
      { value: 'morning_9_12', label: '9:00 AM – 12:00 PM' },
      { value: 'afternoon_12_2', label: '12:00 PM – 2:00 PM' },
      { value: 'afternoon_2_4', label: '2:00 PM – 4:00 PM' },
      { value: 'evening_4_6', label: '4:00 PM – 6:00 PM' },
      { value: 'anytime', label: 'Anytime' }
    ];

    return {
      categories,
      urgency_levels,
      contact_methods,
      time_windows
    };
  }

  // getContactSelfServiceSuggestions(category, subject, description)
  getContactSelfServiceSuggestions(category, subject, description) {
    const language = this._getCurrentLanguage();
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('help_categories');

    let candidates = articles.filter((a) => a.is_active && a.language === language);

    const mappedCategoryKeys = [];
    if (category === 'orders_shipping') {
      mappedCategoryKeys.push('orders_returns', 'returns_exchanges');
    } else if (category === 'billing_payments') {
      mappedCategoryKeys.push('billing_payments');
    } else if (category === 'technical_support') {
      mappedCategoryKeys.push('general', 'account_security');
    } else if (category === 'account_issues') {
      mappedCategoryKeys.push('account_security');
    } else if (category === 'returns_exchanges') {
      mappedCategoryKeys.push('returns_exchanges');
    }

    if (mappedCategoryKeys.length) {
      candidates = candidates.filter(
        (a) => mappedCategoryKeys.indexOf(a.category_key) >= 0
      );
    }

    const text = ((subject || '') + ' ' + (description || '')).trim();
    if (text) {
      candidates = candidates.filter((a) => this._matchesArticleQuery(a, text));
    }

    candidates.sort((a, b) => {
      const ra = a.rating_average || 0;
      const rb = b.rating_average || 0;
      if (rb !== ra) return rb - ra;
      return (b.rating_count || 0) - (a.rating_count || 0);
    });

    const suggested_articles = candidates.slice(0, 5).map((a) => {
      const cat = categories.find((c) => c.key === a.category_key) || null;
      return {
        articleId: a.id,
        title: a.title,
        category_name: cat ? cat.name : ''
      };
    });

    return { suggested_articles };
  }

  // submitSupportTicket(...)
  submitSupportTicket(
    category,
    subject,
    description,
    urgency,
    preferred_contact_method,
    preferred_contact_time_window,
    phone_number,
    related_order_number
  ) {
    let tickets = this._getFromStorage('support_tickets');
    if (!Array.isArray(tickets)) tickets = [];

    const urgencyOptions = {
      low: 24,
      medium: 8,
      high: 4
    };

    const expected_response_time_hours =
      urgencyOptions[urgency] != null ? urgencyOptions[urgency] : 24;

    const now = this._nowISO();
    const ticket = {
      id: this._generateId('supportticket'),
      category,
      subject: subject || '',
      description: description || '',
      urgency,
      preferred_contact_method,
      preferred_contact_time_window: preferred_contact_time_window || 'anytime',
      phone_number: preferred_contact_method === 'phone' ? (phone_number || '') : null,
      status: 'submitted',
      expected_response_time_hours,
      reference_number: 'T-' + this._getNextIdCounter(),
      related_order_number: related_order_number || null,
      created_at: now,
      updated_at: now
    };

    tickets.push(ticket);
    this._saveToStorage('support_tickets', tickets);

    const confirmation_message =
      'Your request has been submitted. Reference: ' + ticket.reference_number;

    return {
      ticket,
      confirmation_message
    };
  }

  // getCommunityHomeView()
  getCommunityHomeView() {
    const categories = this._getFromStorage('community_categories');
    const threads = this._getFromStorage('community_threads');

    const featured_threads = threads
      .slice()
      .sort((a, b) => {
        if ((b.reply_count || 0) !== (a.reply_count || 0)) {
          return (b.reply_count || 0) - (a.reply_count || 0);
        }
        const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return db - da;
      })
      .slice(0, 5)
      .map((t) => {
        const category = t.categoryId
          ? categories.find((c) => c.id === t.categoryId) || null
          : null;
        return Object.assign({}, t, { category });
      });

    return {
      categories,
      featured_threads
    };
  }

  // getCommunityFilterOptions()
  getCommunityFilterOptions() {
    const categories = this._getFromStorage('community_categories');
    const threads = this._getFromStorage('community_threads');

    const statuses = [
      { value: 'open', label: 'Open' },
      { value: 'answered', label: 'Answered' },
      { value: 'closed', label: 'Closed' }
    ];

    const sort_options = [
      { value: 'most_replies', label: 'Most replies' },
      { value: 'most_recent', label: 'Most recent' },
      { value: 'relevance', label: 'Relevance' }
    ];

    const tagSet = {};
    for (let i = 0; i < threads.length; i++) {
      const t = threads[i];
      if (Array.isArray(t.tags)) {
        for (let j = 0; j < t.tags.length; j++) {
          const tg = t.tags[j];
          if (tg) tagSet[tg] = true;
        }
      }
    }

    const tags = Object.keys(tagSet).sort();

    return {
      statuses,
      categories,
      sort_options,
      tags
    };
  }

  // searchCommunityThreads(query, filters, sort_by)
  searchCommunityThreads(query, filters, sort_by = 'relevance') {
    filters = filters || {};
    const threads = this._getFromStorage('community_threads');
    const categories = this._getFromStorage('community_categories');

    let list = threads.slice();

    if (query) {
      const q = String(query).toLowerCase();
      list = list.filter((t) => {
        const text = ((t.title || '') + ' ' + (t.body || '')).toLowerCase();
        return text.indexOf(q) >= 0;
      });
    }

    if (filters.status_list && filters.status_list.length) {
      list = list.filter(
        (t) => filters.status_list.indexOf(t.status) >= 0
      );
    }

    if (filters.categoryId) {
      list = list.filter((t) => t.categoryId === filters.categoryId);
    }

    if (filters.tags && filters.tags.length) {
      list = list.filter((t) => {
        if (!Array.isArray(t.tags)) return false;
        return t.tags.some((tg) => filters.tags.indexOf(tg) >= 0);
      });
    }

    if (sort_by === 'most_replies') {
      list.sort((a, b) => (b.reply_count || 0) - (a.reply_count || 0));
    } else if (sort_by === 'most_recent') {
      list.sort((a, b) => {
        const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return db - da;
      });
    }

    const items = list.map((t) => {
      const category = t.categoryId
        ? categories.find((c) => c.id === t.categoryId) || null
        : null;
      const preview_text = t.body ? String(t.body).slice(0, 200) : '';
      return {
        thread: Object.assign({}, t, { category }),
        category_name: category ? category.name : '',
        preview_text
      };
    });

    return { threads: items };
  }

  // getCommunityThreadDetail(threadId)
  getCommunityThreadDetail(threadId) {
    const threads = this._getFromStorage('community_threads');
    const repliesAll = this._getFromStorage('community_replies');
    const categories = this._getFromStorage('community_categories');
    const followed = this._getFromStorage('followed_threads');

    const threadRaw = threads.find((t) => t.id === threadId) || null;
    const category = threadRaw && threadRaw.categoryId
      ? categories.find((c) => c.id === threadRaw.categoryId) || null
      : null;

    const thread = threadRaw
      ? Object.assign({}, threadRaw, { category })
      : null;

    const replies = repliesAll
      .filter((r) => r.threadId === threadId)
      .map((r) => Object.assign({}, r, { thread }));

    const accepted_answer = threadRaw && threadRaw.accepted_reply_id
      ? repliesAll.find((r) => r.id === threadRaw.accepted_reply_id) || null
      : null;

    const accepted_with_thread = accepted_answer
      ? Object.assign({}, accepted_answer, { thread })
      : null;

    const is_following = followed.some((f) => f.threadId === threadId);

    const user_state = { is_following };

    return {
      thread,
      replies,
      category,
      accepted_answer: accepted_with_thread,
      user_state
    };
  }

  // addCommunityReply(threadId, body)
  addCommunityReply(threadId, body) {
    let repliesAll = this._getFromStorage('community_replies');
    let threads = this._getFromStorage('community_threads');

    const reply = {
      id: this._generateId('communityreply'),
      threadId,
      body: body || '',
      created_at: this._nowISO(),
      is_accepted_answer: false
    };

    repliesAll.push(reply);
    this._saveToStorage('community_replies', repliesAll);

    const idx = threads.findIndex((t) => t.id === threadId);
    if (idx !== -1) {
      const t = threads[idx];
      t.reply_count = (t.reply_count || 0) + 1;
      t.updated_at = this._nowISO();
      threads[idx] = t;
      this._saveToStorage('community_threads', threads);
    }

    return { reply };
  }

  // followCommunityThread(threadId)
  followCommunityThread(threadId) {
    let followed = this._getFromStorage('followed_threads');
    if (!Array.isArray(followed)) followed = [];

    const existing = followed.find((f) => f.threadId === threadId);
    if (existing) {
      return { followed_thread: existing };
    }

    const followed_thread = {
      id: this._generateId('followedthread'),
      threadId,
      followed_at: this._nowISO()
    };

    followed.push(followed_thread);
    this._saveToStorage('followed_threads', followed);

    return { followed_thread };
  }

  // unfollowCommunityThread(threadId)
  unfollowCommunityThread(threadId) {
    let followed = this._getFromStorage('followed_threads');
    if (!Array.isArray(followed)) followed = [];
    const before = followed.length;
    followed = followed.filter((f) => f.threadId !== threadId);
    this._saveToStorage('followed_threads', followed);
    return { success: followed.length < before };
  }

  // getFollowedThreadsView(sort_by)
  getFollowedThreadsView(sort_by = 'most_recent_activity') {
    const followed = this._getFromStorage('followed_threads');
    const threads = this._getFromStorage('community_threads');
    const repliesAll = this._getFromStorage('community_replies');
    const categories = this._getFromStorage('community_categories');

    const items = followed.map((f) => {
      const threadRaw = threads.find((t) => t.id === f.threadId) || null;
      const category = threadRaw && threadRaw.categoryId
        ? categories.find((c) => c.id === threadRaw.categoryId) || null
        : null;
      const thread = threadRaw
        ? Object.assign({}, threadRaw, { category })
        : null;
      const replies = repliesAll.filter((r) => r.threadId === f.threadId);
      let latest_reply_at = thread ? thread.created_at || null : null;
      for (let i = 0; i < replies.length; i++) {
        const d = replies[i].created_at
          ? new Date(replies[i].created_at).getTime()
          : 0;
        const cur = latest_reply_at
          ? new Date(latest_reply_at).getTime()
          : 0;
        if (d > cur) latest_reply_at = replies[i].created_at;
      }
      return {
        thread,
        followed_thread: f,
        category_name: category ? category.name : '',
        latest_reply_at
      };
    });

    if (sort_by === 'most_recent_activity') {
      items.sort((a, b) => {
        const da = a.latest_reply_at
          ? new Date(a.latest_reply_at).getTime()
          : 0;
        const db = b.latest_reply_at
          ? new Date(b.latest_reply_at).getTime()
          : 0;
        return db - da;
      });
    } else if (sort_by === 'thread_created_at') {
      items.sort((a, b) => {
        const da = a.thread && a.thread.created_at
          ? new Date(a.thread.created_at).getTime()
          : 0;
        const db = b.thread && b.thread.created_at
          ? new Date(b.thread.created_at).getTime()
          : 0;
        return db - da;
      });
    }

    return { threads: items };
  }

  // getFaqHomeView()
  getFaqHomeView() {
    const language = this._getCurrentLanguage();
    const categories = this._getFromStorage('help_categories');
    const articles = this._getFromStorage('articles');

    const faqCategories = categories.filter((c) => c.is_faq_category === true);

    const top_questions_by_category = faqCategories.map((cat) => {
      const arts = articles
        .filter(
          (a) =>
            a.is_active &&
            a.language === language &&
            a.category_key === cat.key &&
            a.content_type === 'faq_article'
        )
        .slice(0, 5)
        .map((a) => ({ articleId: a.id, title: a.title, article: a }));

      return {
        category_key: cat.key,
        category_name: cat.name,
        articles: arts
      };
    });

    return {
      categories: faqCategories,
      top_questions_by_category
    };
  }

  // searchFaqArticles(query, category_key)
  searchFaqArticles(query, category_key) {
    const language = this._getCurrentLanguage();
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('help_categories');

    let list = articles.filter(
      (a) =>
        a.is_active &&
        a.language === language &&
        a.content_type === 'faq_article'
    );

    if (category_key) {
      list = list.filter((a) => a.category_key === category_key);
    }

    if (query) {
      list = list.filter((a) => this._matchesArticleQuery(a, query));
    }

    const results = list.map((a) => {
      const cat = categories.find((c) => c.key === a.category_key) || null;
      return {
        articleId: a.id,
        title: a.title,
        category_key: a.category_key,
        category_name: cat ? cat.name : '',
        article: a
      };
    });

    // Instrumentation for task completion tracking
    try {
      if (category_key === 'account_security') {
        localStorage.setItem('task8_accountSecurityFaqVisited', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { results };
  }

  // getReturnsLandingView()
  getReturnsLandingView() {
    // Static descriptive content; no domain data is mocked
    const policy_summary =
      'You can return eligible items within the return window stated on your order confirmation. Items must be in their original condition, with all accessories and packaging included.';
    const eligibility_rules =
      'Most items delivered within the last 30 days and marked as return-eligible in your order history can be returned. Some items may be final sale; check your order details for eligibility.';

    const has_self_service_wizard = true;

    return {
      policy_summary,
      eligibility_rules,
      has_self_service_wizard
    };
  }

  // getReturnEligibleOrders()
  getReturnEligibleOrders() {
    const orders = this._getFromStorage('return_orders');
    const eligible = orders.filter((o) => o.is_eligible_for_return === true);
    return eligible;
  }

  // getReturnSchedulingOptions(orderId)
  getReturnSchedulingOptions(orderId) {
    const orders = this._getFromStorage('return_orders');
    const order = orders.find((o) => o.id === orderId) || null;

    // If no order, still return an empty structure
    const today = new Date();
    // Earliest next day
    const earliestDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const available_dates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(earliestDate.getTime() + i * 24 * 60 * 60 * 1000);
      available_dates.push(d.toISOString().slice(0, 10));
    }

    return {
      earliest_available_date: available_dates[0] || today.toISOString().slice(0, 10),
      available_dates
    };
  }

  // getReturnMethodOptions()
  getReturnMethodOptions() {
    const methods = [
      { value: 'drop_off_partner_location', label: 'Drop off at partner location' },
      { value: 'mail_in', label: 'Mail-in return' },
      { value: 'pickup_courier', label: 'Courier pickup' }
    ];
    return { methods };
  }

  // confirmReturnRequest(orderId, reason, scheduled_date, return_method, notes)
  confirmReturnRequest(orderId, reason, scheduled_date, return_method, notes) {
    let requests = this._getFromStorage('return_requests');
    if (!Array.isArray(requests)) requests = [];

    const now = this._nowISO();
    const return_request = {
      id: this._generateId('returnrequest'),
      orderId,
      reason,
      scheduled_date,
      return_method,
      status: 'confirmed',
      notes: notes || null,
      created_at: now,
      updated_at: now
    };

    requests.push(return_request);
    this._saveToStorage('return_requests', requests);

    // Optionally update order status
    let orders = this._getFromStorage('return_orders');
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      const o = orders[idx];
      o.status = 'returned';
      orders[idx] = o;
      this._saveToStorage('return_orders', orders);
    }

    return { return_request };
  }

  // getStaticPageContent(page_key)
  getStaticPageContent(page_key) {
    let title = '';
    let body = '';

    if (page_key === 'about') {
      title = 'About';
      body =
        'This help center provides answers to common questions about your orders, billing, account security, and more.';
    } else if (page_key === 'privacy_policy') {
      title = 'Privacy Policy';
      body =
        'We respect your privacy and only use your information to provide and improve our services. See the full policy on our website.';
    } else if (page_key === 'terms_of_use') {
      title = 'Terms of Use';
      body =
        'By using this help center, you agree to the terms and conditions governing use of our services.';
    } else {
      title = 'Information';
      body = 'Content not available for the requested page key.';
    }

    return { title, body };
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