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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'articles',
      'topics',
      'products',
      'collections',
      'collection_items',
      'favorites',
      'comments',
      'article_feedback',
      'troubleshooting_wizard_sessions',
      'support_chat_sessions',
      'support_requests',
      'developer_sections',
      'code_examples'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('currentWizardSessionId')) {
      localStorage.setItem('currentWizardSessionId', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    const parsed = data ? JSON.parse(data) : [];

    // Ensure a synthetic "general" topic exists when articles reference it
    if (key === 'topics') {
      const hasGeneralTopic = parsed.some(t => t && t.key === 'general');
      if (!hasGeneralTopic) {
        const articlesRaw = localStorage.getItem('articles');
        const articles = articlesRaw ? JSON.parse(articlesRaw) : [];
        const hasGeneralArticles = articles.some(a => a && a.topic_id === 'general');
        if (hasGeneralArticles)          parsed.push({
            id: 'general',
            key: 'general',
            name: 'General',
            description: 'General FlowSync guides and troubleshooting articles.',
            default_sort: 'relevance'
          });
        }
      }
    

    return parsed;
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

  // ----------------------
  // Entity lookup helpers
  // ----------------------

  _getArticleById(id) {
    const articles = this._getFromStorage('articles');
    return articles.find(a => a.id === id) || null;
  }

  _getTopicById(id) {
    const topics = this._getFromStorage('topics');
    return topics.find(t => t.id === id) || null;
  }

  _getProductById(id) {
    const products = this._getFromStorage('products');
    return products.find(p => p.id === id) || null;
  }

  _getWizardSessionById(id) {
    const sessions = this._getFromStorage('troubleshooting_wizard_sessions');
    return sessions.find(s => s.id === id) || null;
  }

  _getDeveloperSectionById(id) {
    const sections = this._getFromStorage('developer_sections');
    return sections.find(s => s.id === id) || null;
  }

  _getCodeExampleById(id) {
    const examples = this._getFromStorage('code_examples');
    return examples.find(c => c.id === id) || null;
  }

  // ----------------------
  // Relation resolvers (FK expansion)
  // ----------------------

  _withArticleRelations(article) {
    if (!article) return null;
    const topics = this._getFromStorage('topics');
    const products = this._getFromStorage('products');
    const topic = topics.find(t => t.id === article.topic_id) || null;
    const product = products.find(p => p.id === article.product_id) || null;
    return Object.assign({}, article, { topic, product });
  }

  _withCommentRelations(comment) {
    if (!comment) return null;
    const article = this._getArticleById(comment.article_id);
    return Object.assign({}, comment, { article: this._withArticleRelations(article) });
  }

  _withCollectionItemRelations(collectionItem) {
    if (!collectionItem) return null;
    const article = this._getArticleById(collectionItem.article_id);
    return Object.assign({}, collectionItem, { article: this._withArticleRelations(article) });
  }

  _withSupportChatRelations(chatSession) {
    if (!chatSession) return null;
    const relatedArticle = chatSession.related_article_id
      ? this._withArticleRelations(this._getArticleById(chatSession.related_article_id))
      : null;
    const wizardSession = chatSession.via_wizard_session_id
      ? this._withWizardRelations(this._getWizardSessionById(chatSession.via_wizard_session_id))
      : null;
    return Object.assign({}, chatSession, {
      relatedArticle,
      wizardSession
    });
  }

  _withWizardRelations(wizardSession) {
    if (!wizardSession) return null;
    const selectedProduct = wizardSession.selected_product_id
      ? this._getProductById(wizardSession.selected_product_id)
      : null;
    const chosenArticle = wizardSession.chosen_article_id
      ? this._withArticleRelations(this._getArticleById(wizardSession.chosen_article_id))
      : null;
    return Object.assign({}, wizardSession, {
      selectedProduct,
      chosenArticle
    });
  }

  _withSupportRequestRelations(request) {
    if (!request) return null;
    const originArticle = request.origin_article_id
      ? this._withArticleRelations(this._getArticleById(request.origin_article_id))
      : null;
    return Object.assign({}, request, { originArticle });
  }

  _withDeveloperSectionRelations(section) {
    if (!section) return null;
    const article = this._withArticleRelations(this._getArticleById(section.article_id));
    return Object.assign({}, section, { article });
  }

  _withCodeExampleRelations(example) {
    if (!example) return null;
    const article = this._withArticleRelations(this._getArticleById(example.article_id));
    const section = example.section_id ? this._getDeveloperSectionById(example.section_id) : null;
    return Object.assign({}, example, { article, section });
  }

  // ----------------------
  // Helper: wizard session
  // ----------------------

  _getOrCreateCurrentWizardSession() {
    const sessions = this._getFromStorage('troubleshooting_wizard_sessions');
    const currentId = localStorage.getItem('currentWizardSessionId') || '';
    let session = currentId ? sessions.find(s => s.id === currentId) : null;

    if (!session || session.status === 'completed') {
      const newSession = {
        id: this._generateId('wizard'),
        selected_product_id: null,
        selected_platform: null,
        issue_type: null,
        symptoms: [],
        symptom_values: [],
        status: 'in_progress',
        recommended_article_ids: [],
        chosen_article_id: null,
        created_at: new Date().toISOString(),
        completed_at: null
      };
      sessions.push(newSession);
      this._saveToStorage('troubleshooting_wizard_sessions', sessions);
      localStorage.setItem('currentWizardSessionId', newSession.id);
      session = newSession;
    }

    return session;
  }

  // ----------------------
  // Helper: favorites/collections persistence
  // ----------------------

  _persistFavoritesState(favorites) {
    this._saveToStorage('favorites', favorites);
  }

  _persistCollectionsState(collections, collectionItems) {
    if (collections) this._saveToStorage('collections', collections);
    if (collectionItems) this._saveToStorage('collection_items', collectionItems);
  }

  // ----------------------
  // Helper: formatting / filters / sort
  // ----------------------

  _formatPlatformLabel(value) {
    if (!value) return '';
    const map = {
      windows: 'Windows',
      macos: 'macOS',
      web: 'Web',
      mobile: 'Mobile',
      mobile_app: 'Mobile app',
      linux: 'Linux',
      other: 'Other'
    };
    return map[value] || value;
  }

  _formatLanguageLabel(value) {
    if (!value) return '';
    const map = {
      english: 'English',
      spanish: 'Spanish',
      french: 'French',
      german: 'German',
      japanese: 'Japanese',
      other: 'Other'
    };
    return map[value] || value;
  }

  _formatIntegrationLabel(value) {
    if (!value) return '';
    const map = {
      slack: 'Slack',
      google_calendar: 'Google Calendar',
      microsoft_teams: 'Microsoft Teams',
      zoom: 'Zoom',
      salesforce: 'Salesforce',
      other: 'Other'
    };
    return map[value] || value;
  }

  _formatAudienceRoleLabel(value) {
    if (!value) return '';
    const map = {
      workspace_admins: 'Workspace admins',
      project_owners: 'Project owners',
      end_users: 'End users',
      developers: 'Developers',
      billing_admins: 'Billing admins',
      other: 'Other'
    };
    return map[value] || value;
  }

  _formatPlanLabel(value) {
    if (!value) return '';
    const map = {
      team_pro: 'Team Pro',
      team_basic: 'Team Basic',
      enterprise: 'Enterprise',
      personal: 'Personal',
      other: 'Other'
    };
    return map[value] || value;
  }

  _formatBillingMethodLabel(value) {
    if (!value) return '';
    const map = {
      credit_card: 'Credit card',
      bank_transfer: 'Bank transfer',
      paypal: 'PayPal',
      invoice: 'Invoice',
      other: 'Other'
    };
    return map[value] || value;
  }

  _formatRegionLabel(value) {
    if (!value) return '';
    const map = {
      united_states: 'United States',
      canada: 'Canada',
      united_kingdom: 'United Kingdom',
      european_union: 'European Union',
      australia: 'Australia',
      other: 'Other'
    };
    return map[value] || value;
  }

  _searchMatchArticle(article, query) {
    if (!query) return true;
    const q = String(query).toLowerCase().trim();
    const haystack = [article.title, article.summary, article.body]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!q) return true;

    // First try a direct substring match on the full query
    if (haystack.indexOf(q) !== -1) return true;

    // Fallback: require that all substantive query terms appear somewhere in the text
    const terms = q.split(/\s+/).filter(t => t.length > 1);
    if (terms.length === 0) {
      return haystack.indexOf(q) !== -1;
    }
    return terms.every(t => haystack.indexOf(t) !== -1);
  }

  _isWithinLastUpdatedRange(dateStr, range) {
    if (!range || range === 'any_time') return true;
    if (!dateStr) return false;
    const updated = new Date(dateStr).getTime();
    if (isNaN(updated)) return false;
    const now = Date.now();
    let deltaMs = 0;
    if (range === 'last_30_days') {
      deltaMs = 30 * 24 * 60 * 60 * 1000;
    } else if (range === 'last_90_days') {
      deltaMs = 90 * 24 * 60 * 60 * 1000;
    } else if (range === 'last_12_months') {
      deltaMs = 365 * 24 * 60 * 60 * 1000;
    } else {
      return true;
    }
    return updated >= now - deltaMs;
  }

  _applySortToArticles(articles, sort) {
    const arr = articles.slice();
    const s = sort || 'relevance';

    if (s === 'newest_first') {
      arr.sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da;
      });
    } else if (s === 'rating_high_to_low') {
      arr.sort((a, b) => {
        const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
        return rb - ra;
      });
    } else if (s === 'most_viewed') {
      arr.sort((a, b) => {
        const va = typeof a.view_count === 'number' ? a.view_count : 0;
        const vb = typeof b.view_count === 'number' ? b.view_count : 0;
        return vb - va;
      });
    } else {
      // relevance: simple heuristic based on view_count then created_at
      arr.sort((a, b) => {
        const va = typeof a.view_count === 'number' ? a.view_count : 0;
        const vb = typeof b.view_count === 'number' ? b.view_count : 0;
        if (vb !== va) return vb - va;
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da;
      });
    }
    return arr;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomeOverview()
  getHomeOverview() {
    const topics = this._getFromStorage('topics');
    const articles = this._getFromStorage('articles');

    const featured = articles.filter(a => a.is_featured);
    const featuredArticles = featured.map(a => this._withArticleRelations(a));

    // popularSearches derived from tags to avoid mocking
    const tagCounts = {};
    for (const a of articles) {
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          if (!t) continue;
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
    }
    const popularSearches = Object.keys(tagCounts)
      .sort((a, b) => tagCounts[b] - tagCounts[a])
      .slice(0, 5)
      .map(t => ({
        query: t.replace(/_/g, ' '),
        label: t.replace(/_/g, ' ')
      }));

    // quickLinks based on topics if available
    const quickLinks = [];
    const passwordTopic = topics.find(t => t.key === 'general');
    if (passwordTopic) {
      const pwdArticle = articles.find(a => a.topic_id === passwordTopic.id && /password/i.test(a.title));
      if (pwdArticle) {
        quickLinks.push({
          type: 'password_reset',
          label: pwdArticle.title,
          articleId: pwdArticle.id
        });
      }
    }
    const billingTopic = topics.find(t => t.key === 'billing_accounts');
    if (billingTopic) {
      const billArticle = articles.find(a => a.topic_id === billingTopic.id);
      if (billArticle) {
        quickLinks.push({
          type: 'billing',
          label: billArticle.title,
          articleId: billArticle.id
        });
      }
    }
    const syncTopic = topics.find(t => t.key === 'sync_issues');
    if (syncTopic) {
      const syncArticle = articles.find(a => a.topic_id === syncTopic.id);
      if (syncArticle) {
        quickLinks.push({
          type: 'sync_issues',
          label: syncArticle.title,
          articleId: syncArticle.id
        });
      }
    }

    return {
      topics,
      featuredArticles,
      popularSearches,
      quickLinks
    };
  }

  // getPrimaryTopicsForNavigation()
  getPrimaryTopicsForNavigation() {
    const topics = this._getFromStorage('topics');
    return topics;
  }

  // getActiveProducts()
  getActiveProducts() {
    const products = this._getFromStorage('products');
    return products.filter(p => p.active);
  }

  // getSearchFilterOptions()
  getSearchFilterOptions() {
    const articles = this._getFromStorage('articles');
    const products = this._getFromStorage('products');
    const topics = this._getFromStorage('topics');

    const productOptions = products.map(p => ({ key: p.key, name: p.name }));

    const platformCounts = {};
    const versionLabelCounts = {};
    const languageCounts = {};
    const difficultyCounts = {};
    const tagCounts = {};

    for (const a of articles) {
      if (a.platform) {
        platformCounts[a.platform] = (platformCounts[a.platform] || 0) + 1;
      }
      if (a.version_label) {
        versionLabelCounts[a.version_label] = (versionLabelCounts[a.version_label] || 0) + 1;
      }
      if (a.language) {
        languageCounts[a.language] = (languageCounts[a.language] || 0) + 1;
      }
      if (a.difficulty) {
        difficultyCounts[a.difficulty] = (difficultyCounts[a.difficulty] || 0) + 1;
      }
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          if (!t) continue;
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
    }

    const platforms = Object.keys(platformCounts).map(value => ({
      value,
      label: this._formatPlatformLabel(value)
    }));

    const versionLabels = Object.keys(versionLabelCounts).map(value => ({
      value,
      label: value
    }));

    const languages = Object.keys(languageCounts).map(value => ({
      value,
      label: this._formatLanguageLabel(value)
    }));

    // Static lastUpdatedRanges since they are intrinsic filter choices
    const lastUpdatedRanges = [
      { value: 'any_time', label: 'Any time' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_90_days', label: 'Last 90 days' },
      { value: 'last_12_months', label: 'Within the last 12 months' }
    ];

    const difficulties = Object.keys(difficultyCounts).map(value => ({
      value,
      label: value === 'not_applicable' ? 'Not applicable' : value.charAt(0).toUpperCase() + value.slice(1),
      articleCount: difficultyCounts[value]
    }));

    const tags = Object.keys(tagCounts).map(value => ({
      value,
      label: value,
      articleCount: tagCounts[value]
    }));

    const topicOptions = topics.map(t => ({ key: t.key, name: t.name }));

    return {
      products: productOptions,
      platforms,
      versionLabels,
      languages,
      lastUpdatedRanges,
      difficulties,
      tags,
      topics: topicOptions
    };
  }

  // getGlobalSearchResults(query, filters, sort, page, pageSize)
  getGlobalSearchResults(query, filters, sort, page, pageSize) {
    const articles = this._getFromStorage('articles');
    const topics = this._getFromStorage('topics');
    const products = this._getFromStorage('products');

    const f = filters || {};
    const s = sort || 'relevance';
    const pg = page || 1;
    const ps = pageSize || 20;

    // Step 1: filter by query only (for facets)
    let base = articles.filter(a => this._searchMatchArticle(a, query));

    // Build availableFilters from base
    const availableProducts = {};
    const availablePlatforms = {};
    const availableVersionLabels = {};
    const availableLanguages = {};
    const availableDifficulties = {};
    const availableTags = {};
    const availableTopics = {};

    for (const a of base) {
      if (a.product_id) {
        const prod = products.find(p => p.id === a.product_id);
        if (prod) {
          const key = prod.key;
          if (!availableProducts[key]) {
            availableProducts[key] = { key, name: prod.name, articleCount: 0 };
          }
          availableProducts[key].articleCount++;
        }
      }
      if (a.platform) {
        const v = a.platform;
        if (!availablePlatforms[v]) {
          availablePlatforms[v] = {
            value: v,
            label: this._formatPlatformLabel(v),
            articleCount: 0
          };
        }
        availablePlatforms[v].articleCount++;
      }
      if (a.version_label) {
        const v = a.version_label;
        if (!availableVersionLabels[v]) {
          availableVersionLabels[v] = { value: v, label: v, articleCount: 0 };
        }
        availableVersionLabels[v].articleCount++;
      }
      if (a.language) {
        const v = a.language;
        if (!availableLanguages[v]) {
          availableLanguages[v] = {
            value: v,
            label: this._formatLanguageLabel(v),
            articleCount: 0
          };
        }
        availableLanguages[v].articleCount++;
      }
      if (a.difficulty) {
        const v = a.difficulty;
        if (!availableDifficulties[v]) {
          availableDifficulties[v] = {
            value: v,
            label: v === 'not_applicable' ? 'Not applicable' : v.charAt(0).toUpperCase() + v.slice(1),
            articleCount: 0
          };
        }
        availableDifficulties[v].articleCount++;
      }
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          if (!t) continue;
          if (!availableTags[t]) {
            availableTags[t] = { value: t, label: t, articleCount: 0 };
          }
          availableTags[t].articleCount++;
        }
      }
      if (a.topic_id) {
        const topic = topics.find(tp => tp.id === a.topic_id);
        if (topic) {
          const key = topic.key;
          if (!availableTopics[key]) {
            availableTopics[key] = { key, name: topic.name, articleCount: 0 };
          }
          availableTopics[key].articleCount++;
        }
      }
    }

    // Step 2: apply filters to base
    let filtered = base;

    if (f.productKey) {
      const productIds = products
        .filter(p => p.key === f.productKey)
        .map(p => p.id);
      filtered = filtered.filter(a => productIds.indexOf(a.product_id) !== -1);
    }

    if (f.platform) {
      filtered = filtered.filter(a => a.platform === f.platform);
    }

    if (f.versionLabel) {
      filtered = filtered.filter(a => a.version_label === f.versionLabel);
    }

    if (f.language) {
      filtered = filtered.filter(a => a.language === f.language);
    }

    if (f.lastUpdatedRange) {
      filtered = filtered.filter(a => this._isWithinLastUpdatedRange(a.last_updated_at, f.lastUpdatedRange));
    }

    if (f.difficulty) {
      filtered = filtered.filter(a => a.difficulty === f.difficulty);
    }

    if (Array.isArray(f.tags) && f.tags.length > 0) {
      filtered = filtered.filter(a => {
        if (!Array.isArray(a.tags)) return false;
        return f.tags.some(t => a.tags.indexOf(t) !== -1);
      });
    }

    if (f.topicKey) {
      const topicIds = topics
        .filter(t => t.key === f.topicKey)
        .map(t => t.id);
      filtered = filtered.filter(a => topicIds.indexOf(a.topic_id) !== -1);
    }

    const sorted = this._applySortToArticles(filtered, s);
    const totalCount = sorted.length;
    const start = (pg - 1) * ps;
    const pageItems = sorted.slice(start, start + ps).map(a => this._withArticleRelations(a));

    const availableFilters = {
      products: Object.values(availableProducts),
      platforms: Object.values(availablePlatforms),
      versionLabels: Object.values(availableVersionLabels),
      languages: Object.values(availableLanguages),
      lastUpdatedRanges: [
        { value: 'any_time', label: 'Any time' },
        { value: 'last_30_days', label: 'Last 30 days' },
        { value: 'last_90_days', label: 'Last 90 days' },
        { value: 'last_12_months', label: 'Within the last 12 months' }
      ],
      difficulties: Object.values(availableDifficulties),
      tags: Object.values(availableTags),
      topics: Object.values(availableTopics)
    };

    return {
      query,
      filters: {
        productKey: f.productKey || null,
        platform: f.platform || null,
        versionLabel: f.versionLabel || null,
        language: f.language || null,
        lastUpdatedRange: f.lastUpdatedRange || null,
        difficulty: f.difficulty || null,
        tags: f.tags || [],
        topicKey: f.topicKey || null
      },
      sort: s,
      page: pg,
      pageSize: ps,
      totalCount,
      articles: pageItems,
      availableFilters
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const topics = this._getFromStorage('topics');
    const products = this._getFromStorage('products');
    const favorites = this._getFromStorage('favorites');
    const feedbacks = this._getFromStorage('article_feedback');
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        topic: null,
        product: null,
        isFavorite: false,
        userFeedback: { hasSubmitted: false, wasHelpful: false },
        relatedArticles: [],
        collectionsContainingArticle: []
      };
    }

    const topic = topics.find(t => t.id === article.topic_id) || null;
    const product = products.find(p => p.id === article.product_id) || null;

    const favoriteRecord = favorites.find(f => f.article_id === articleId && f.is_favorite);
    const isFavorite = !!favoriteRecord;

    const fb = feedbacks.find(f => f.article_id === articleId) || null;
    const userFeedback = fb
      ? { hasSubmitted: true, wasHelpful: !!fb.was_helpful }
      : { hasSubmitted: false, wasHelpful: false };

    const relatedArticles = Array.isArray(article.related_article_ids)
      ? article.related_article_ids
          .map(id => this._getArticleById(id))
          .filter(Boolean)
          .map(a => this._withArticleRelations(a))
      : [];

    const collectionIds = collectionItems
      .filter(ci => ci.article_id === articleId)
      .map(ci => ci.collection_id);
    const collectionsContainingArticle = collections.filter(c => collectionIds.indexOf(c.id) !== -1);

    // Instrumentation for task completion tracking
    try {
      if (
        article &&
        topic &&
        topic.key === 'billing_accounts' &&
        article.plan === 'team_pro' &&
        article.billing_method === 'credit_card' &&
        article.region === 'united_states'
      ) {
        const title = article.title || '';
        const hasCancelKeyword = /cancel|cancellation/i.test(title);
        const hasMonthlyKeyword = /monthly/i.test(title);
        if (hasCancelKeyword && hasMonthlyKeyword) {
          localStorage.setItem('task5_cancellationArticleId', article.id);
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article: this._withArticleRelations(article),
      topic,
      product,
      isFavorite,
      userFeedback,
      relatedArticles,
      collectionsContainingArticle
    };
  }

  // setArticleFavorite(articleId, isFavorite)
  setArticleFavorite(articleId, isFavorite) {
    const favorites = this._getFromStorage('favorites');
    let record = favorites.find(f => f.article_id === articleId);
    const now = new Date().toISOString();

    if (!record) {
      record = {
        id: this._generateId('fav'),
        article_id: articleId,
        is_favorite: !!isFavorite,
        favorited_at: isFavorite ? now : null
      };
      favorites.push(record);
    } else {
      record.is_favorite = !!isFavorite;
      record.favorited_at = isFavorite ? now : record.favorited_at;
    }

    this._persistFavoritesState(favorites);

    return {
      success: true,
      isFavorite: !!isFavorite,
      favoritedAt: record.favorited_at || null
    };
  }

  // submitArticleFeedback(articleId, wasHelpful)
  submitArticleFeedback(articleId, wasHelpful) {
    const feedbacks = this._getFromStorage('article_feedback');
    const articles = this._getFromStorage('articles');
    const now = new Date().toISOString();

    let fb = feedbacks.find(f => f.article_id === articleId);
    const prevWasHelpful = fb ? fb.was_helpful : null;

    if (!fb) {
      fb = {
        id: this._generateId('afb'),
        article_id: articleId,
        was_helpful: !!wasHelpful,
        submitted_at: now
      };
      feedbacks.push(fb);
    } else {
      fb.was_helpful = !!wasHelpful;
      fb.submitted_at = now;
    }

    this._saveToStorage('article_feedback', feedbacks);

    const article = articles.find(a => a.id === articleId);
    if (article) {
      if (typeof article.helpful_yes_count !== 'number') article.helpful_yes_count = 0;
      if (typeof article.helpful_no_count !== 'number') article.helpful_no_count = 0;

      if (prevWasHelpful === true) {
        article.helpful_yes_count = Math.max(0, article.helpful_yes_count - 1);
      } else if (prevWasHelpful === false) {
        article.helpful_no_count = Math.max(0, article.helpful_no_count - 1);
      }

      if (wasHelpful) {
        article.helpful_yes_count += 1;
      } else {
        article.helpful_no_count += 1;
      }

      this._saveToStorage('articles', articles);
    }

    return {
      success: true,
      wasHelpful: !!wasHelpful,
      submittedAt: now,
      helpfulYesCount: article ? article.helpful_yes_count : 0,
      helpfulNoCount: article ? article.helpful_no_count : 0
    };
  }

  // getArticleCollectionsContext(articleId)
  getArticleCollectionsContext(articleId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const result = collections.map(c => {
      const containsArticle = collectionItems.some(
        ci => ci.collection_id === c.id && ci.article_id === articleId
      );
      return {
        collection: c,
        containsArticle
      };
    });

    return { collections: result };
  }

  // createCollection(name, description, initialArticleId)
  createCollection(name, description, initialArticleId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const now = new Date().toISOString();

    const collection = {
      id: this._generateId('col'),
      name: name,
      description: description || '',
      created_at: now,
      updated_at: now
    };

    collections.push(collection);

    const items = [];
    if (initialArticleId) {
      const item = {
        id: this._generateId('coli'),
        collection_id: collection.id,
        article_id: initialArticleId,
        position: 1,
        added_at: now
      };
      collectionItems.push(item);
      items.push(this._withCollectionItemRelations(item));
    }

    this._persistCollectionsState(collections, collectionItems);

    return {
      collection,
      items
    };
  }

  // addArticleToCollection(collectionId, articleId)
  addArticleToCollection(collectionId, articleId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const now = new Date().toISOString();

    const collection = collections.find(c => c.id === collectionId) || null;

    const currentItems = collectionItems.filter(ci => ci.collection_id === collectionId);
    let maxPos = 0;
    for (const ci of currentItems) {
      if (typeof ci.position === 'number' && ci.position > maxPos) {
        maxPos = ci.position;
      }
    }

    const item = {
      id: this._generateId('coli'),
      collection_id: collectionId,
      article_id: articleId,
      position: maxPos + 1,
      added_at: now
    };

    collectionItems.push(item);

    if (collection) {
      collection.updated_at = now;
    }

    this._persistCollectionsState(collections, collectionItems);

    return {
      collectionItem: this._withCollectionItemRelations(item),
      collection
    };
  }

  // removeArticleFromCollection(collectionId, articleId)
  removeArticleFromCollection(collectionId, articleId) {
    let collectionItems = this._getFromStorage('collection_items');
    const beforeLen = collectionItems.length;
    collectionItems = collectionItems.filter(
      ci => !(ci.collection_id === collectionId && ci.article_id === articleId)
    );
    this._saveToStorage('collection_items', collectionItems);
    const success = collectionItems.length !== beforeLen;
    return { success };
  }

  // reorderCollectionArticles(collectionId, orderedArticleIds)
  reorderCollectionArticles(collectionId, orderedArticleIds) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const orderMap = {};
    orderedArticleIds.forEach((id, index) => {
      orderMap[id] = index + 1;
    });

    let maxPos = orderedArticleIds.length;

    for (const ci of collectionItems) {
      if (ci.collection_id !== collectionId) continue;
      if (orderMap[ci.article_id]) {
        ci.position = orderMap[ci.article_id];
      } else {
        maxPos += 1;
        ci.position = maxPos;
      }
    }

    const now = new Date().toISOString();
    const collection = collections.find(c => c.id === collectionId) || null;
    if (collection) {
      collection.updated_at = now;
    }

    this._persistCollectionsState(collections, collectionItems);

    const items = collectionItems
      .filter(ci => ci.collection_id === collectionId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      })
      .map(ci => ({
        collectionItem: this._withCollectionItemRelations(ci),
        article: this._withArticleRelations(this._getArticleById(ci.article_id))
      }));

    return {
      collection,
      items
    };
  }

  // getArticleComments(articleId)
  getArticleComments(articleId) {
    const comments = this._getFromStorage('comments');
    const filtered = comments
      .filter(c => c.article_id === articleId)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    return filtered.map(c => this._withCommentRelations(c));
  }

  // addArticleComment(articleId, authorDisplayName, content)
  addArticleComment(articleId, authorDisplayName, content) {
    const comments = this._getFromStorage('comments');
    const now = new Date().toISOString();

    const comment = {
      id: this._generateId('cmt'),
      article_id: articleId,
      author_display_name: authorDisplayName || '',
      content: content,
      created_at: now
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    return {
      comment: this._withCommentRelations(comment)
    };
  }

  // startSupportChat(relatedArticleId, startedFromWizard)
  startSupportChat(relatedArticleId, startedFromWizard) {
    const sessions = this._getFromStorage('support_chat_sessions');
    const now = new Date().toISOString();

    let viaWizardSessionId = null;
    if (startedFromWizard) {
      const wizard = this._getOrCreateCurrentWizardSession();
      viaWizardSessionId = wizard.id;
    }

    const chatSession = {
      id: this._generateId('chat'),
      related_article_id: relatedArticleId || null,
      via_wizard_session_id: viaWizardSessionId,
      status: 'open',
      started_at: now,
      ended_at: null
    };

    sessions.push(chatSession);
    this._saveToStorage('support_chat_sessions', sessions);

    return {
      chatSession: this._withSupportChatRelations(chatSession)
    };
  }

  // getFavoriteArticles()
  getFavoriteArticles() {
    const favorites = this._getFromStorage('favorites');
    const articles = this._getFromStorage('articles');

    const favs = favorites
      .filter(f => f.is_favorite)
      .sort((a, b) => {
        const da = new Date(a.favorited_at || 0).getTime();
        const db = new Date(b.favorited_at || 0).getTime();
        return db - da;
      });

    const result = [];
    for (const f of favs) {
      const art = articles.find(a => a.id === f.article_id);
      if (art) {
        result.push(this._withArticleRelations(art));
      }
    }
    return result;
  }

  // getCollectionsOverview()
  getCollectionsOverview() {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const overview = collections.map(c => {
      const count = collectionItems.filter(ci => ci.collection_id === c.id).length;
      return { collection: c, articleCount: count };
    });

    return overview;
  }

  // renameCollection(collectionId, newName)
  renameCollection(collectionId, newName) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find(c => c.id === collectionId) || null;
    const now = new Date().toISOString();

    if (collection) {
      collection.name = newName;
      collection.updated_at = now;
      this._saveToStorage('collections', collections);
    }

    return { collection };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    let collections = this._getFromStorage('collections');
    let collectionItems = this._getFromStorage('collection_items');

    const beforeLen = collections.length;
    collections = collections.filter(c => c.id !== collectionId);
    collectionItems = collectionItems.filter(ci => ci.collection_id !== collectionId);

    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', collectionItems);

    return { success: collections.length !== beforeLen };
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const collection = collections.find(c => c.id === collectionId) || null;

    const items = collectionItems
      .filter(ci => ci.collection_id === collectionId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      })
      .map(ci => ({
        collectionItem: this._withCollectionItemRelations(ci),
        article: this._withArticleRelations(this._getArticleById(ci.article_id))
      }));

    return { collection, items };
  }

  // getTopicOverview(topicKey)
  getTopicOverview(topicKey) {
    const topics = this._getFromStorage('topics');
    const topic = topics.find(t => t.key === topicKey) || null;
    const defaultSort = topic && topic.default_sort ? topic.default_sort : 'relevance';
    return { topic, defaultSort };
  }

  // getTopicFilterOptions(topicKey)
  getTopicFilterOptions(topicKey) {
    const topics = this._getFromStorage('topics');
    const articles = this._getFromStorage('articles');

    const topic = topics.find(t => t.key === topicKey) || null;
    if (!topic) {
      return {
        productVersions: [],
        integrationTypes: [],
        audienceRoles: [],
        plans: [],
        billingMethods: [],
        regions: [],
        tags: []
      };
    }

    const topicArticles = articles.filter(a => a.topic_id === topic.id);

    const productVersionSet = {};
    const integrationTypeSet = {};
    const audienceRoleSet = {};
    const planSet = {};
    const billingMethodSet = {};
    const regionSet = {};
    const tagSet = {};

    for (const a of topicArticles) {
      if (a.version_label) {
        productVersionSet[a.version_label] = true;
      }
      if (a.integration_type) {
        integrationTypeSet[a.integration_type] = true;
      }
      if (a.audience_role) {
        audienceRoleSet[a.audience_role] = true;
      }
      if (a.plan) {
        planSet[a.plan] = true;
      }
      if (a.billing_method) {
        billingMethodSet[a.billing_method] = true;
      }
      if (a.region) {
        regionSet[a.region] = true;
      }
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          if (!t) continue;
          tagSet[t] = true;
        }
      }
    }

    const productVersions = Object.keys(productVersionSet).map(v => ({ label: v, value: v }));

    const integrationTypes = Object.keys(integrationTypeSet).map(v => ({
      value: v,
      label: this._formatIntegrationLabel(v)
    }));

    const audienceRoles = Object.keys(audienceRoleSet).map(v => ({
      value: v,
      label: this._formatAudienceRoleLabel(v)
    }));

    const plans = Object.keys(planSet).map(v => ({
      value: v,
      label: this._formatPlanLabel(v)
    }));

    const billingMethods = Object.keys(billingMethodSet).map(v => ({
      value: v,
      label: this._formatBillingMethodLabel(v)
    }));

    const regions = Object.keys(regionSet).map(v => ({
      value: v,
      label: this._formatRegionLabel(v)
    }));

    const tags = Object.keys(tagSet).map(v => ({ value: v, label: v }));

    return {
      productVersions,
      integrationTypes,
      audienceRoles,
      plans,
      billingMethods,
      regions,
      tags
    };
  }

  // getTopicArticles(topicKey, filters, sort, page, pageSize)
  getTopicArticles(topicKey, filters, sort, page, pageSize) {
    const topics = this._getFromStorage('topics');
    const articles = this._getFromStorage('articles');

    const topic = topics.find(t => t.key === topicKey) || null;
    const f = filters || {};
    const s = sort || 'newest_first';
    const pg = page || 1;
    const ps = pageSize || 20;

    if (!topic) {
      return {
        topic: null,
        filters: {
          productVersionLabel: null,
          integrationType: null,
          audienceRole: null,
          plan: null,
          billingMethod: null,
          region: null,
          tags: [],
          language: null
        },
        sort: s,
        page: pg,
        pageSize: ps,
        totalCount: 0,
        articles: []
      };
    }

    let filtered = articles.filter(a => a.topic_id === topic.id);

    if (f.productVersionLabel) {
      filtered = filtered.filter(a => a.version_label === f.productVersionLabel);
    }
    if (f.integrationType) {
      filtered = filtered.filter(a => a.integration_type === f.integrationType);
    }
    if (f.audienceRole) {
      filtered = filtered.filter(a => a.audience_role === f.audienceRole);
    }
    if (f.plan) {
      filtered = filtered.filter(a => a.plan === f.plan);
    }
    if (f.billingMethod) {
      filtered = filtered.filter(a => a.billing_method === f.billingMethod);
    }
    if (f.region) {
      filtered = filtered.filter(a => a.region === f.region);
    }
    if (Array.isArray(f.tags) && f.tags.length > 0) {
      filtered = filtered.filter(a => {
        if (!Array.isArray(a.tags)) return false;
        return f.tags.some(t => a.tags.indexOf(t) !== -1);
      });
    }
    if (f.language) {
      filtered = filtered.filter(a => a.language === f.language);
    }

    // Instrumentation for task completion tracking
    try {
      if (
        topic &&
        topic.key === 'billing_accounts' &&
        filters &&
        filters.plan === 'team_pro' &&
        filters.billingMethod === 'credit_card' &&
        filters.region === 'united_states'
      ) {
        localStorage.setItem(
          'task5_billingFilterParams',
          JSON.stringify({
            topicKey: topicKey,
            plan: filters.plan || null,
            billingMethod: filters.billingMethod || null,
            region: filters.region || null,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const sorted = this._applySortToArticles(filtered, s);
    const totalCount = sorted.length;
    const start = (pg - 1) * ps;
    const pageItems = sorted.slice(start, start + ps).map(a => this._withArticleRelations(a));

    return {
      topic,
      filters: {
        productVersionLabel: f.productVersionLabel || null,
        integrationType: f.integrationType || null,
        audienceRole: f.audienceRole || null,
        plan: f.plan || null,
        billingMethod: f.billingMethod || null,
        region: f.region || null,
        tags: f.tags || [],
        language: f.language || null
      },
      sort: s,
      page: pg,
      pageSize: ps,
      totalCount,
      articles: pageItems
    };
  }

  // getDevelopersOverview()
  getDevelopersOverview() {
    const articles = this._getFromStorage('articles');
    const devArticles = articles.filter(a => a.is_developer_doc);

    const highlighted = this._applySortToArticles(devArticles, 'most_viewed').slice(0, 3);
    const highlightedArticles = highlighted.map(a => this._withArticleRelations(a));

    const sections = [];
    if (devArticles.length > 0) {
      sections.push({
        title: 'API reference',
        description: 'Developer and API documentation for FlowSync.',
        articles: devArticles.map(a => this._withArticleRelations(a))
      });
    }

    return {
      highlightedArticles,
      sections
    };
  }

  // getDeveloperSearchResults(query, page, pageSize)
  getDeveloperSearchResults(query, page, pageSize) {
    const articles = this._getFromStorage('articles');
    const devArticles = articles.filter(a => a.is_developer_doc);

    const pg = page || 1;
    const ps = pageSize || 20;

    const filtered = devArticles.filter(a => this._searchMatchArticle(a, query));
    const sorted = this._applySortToArticles(filtered, 'relevance');
    const totalCount = sorted.length;
    const start = (pg - 1) * ps;
    const pageItems = sorted.slice(start, start + ps).map(a => this._withArticleRelations(a));

    return {
      query,
      page: pg,
      pageSize: ps,
      totalCount,
      articles: pageItems
    };
  }

  // getDeveloperArticleSections(articleId)
  getDeveloperArticleSections(articleId) {
    const sections = this._getFromStorage('developer_sections');
    const filtered = sections
      .filter(s => s.article_id === articleId)
      .sort((a, b) => {
        const oa = typeof a.order_index === 'number' ? a.order_index : 0;
        const ob = typeof b.order_index === 'number' ? b.order_index : 0;
        return oa - ob;
      });
    return filtered.map(s => this._withDeveloperSectionRelations(s));
  }

  // getSectionCodeExamples(sectionId)
  getSectionCodeExamples(sectionId) {
    const examples = this._getFromStorage('code_examples');
    const filtered = examples.filter(e => e.section_id === sectionId);
    return filtered.map(e => this._withCodeExampleRelations(e));
  }

  // copyCodeExample(codeExampleId)
  copyCodeExample(codeExampleId) {
    const examples = this._getFromStorage('code_examples');
    const index = examples.findIndex(e => e.id === codeExampleId);

    if (index === -1) {
      return {
        codeExample: null,
        code: ''
      };
    }

    const now = new Date().toISOString();
    const example = examples[index];
    const currentCount = typeof example.copy_count === 'number' ? example.copy_count : 0;
    example.copy_count = currentCount + 1;
    example.last_copied_at = now;

    examples[index] = example;
    this._saveToStorage('code_examples', examples);

    return {
      codeExample: this._withCodeExampleRelations(example),
      code: example.code
    };
  }

  // startTroubleshootingWizard()
  startTroubleshootingWizard() {
    const wizardSession = this._getOrCreateCurrentWizardSession();
    return { wizardSession: this._withWizardRelations(wizardSession) };
  }

  // getTroubleshootingWizardState()
  getTroubleshootingWizardState() {
    const wizardSession = this._getOrCreateCurrentWizardSession();
    return { wizardSession: this._withWizardRelations(wizardSession) };
  }

  // setTroubleshootingWizardProduct(productId)
  setTroubleshootingWizardProduct(productId) {
    const sessions = this._getFromStorage('troubleshooting_wizard_sessions');
    const wizard = this._getOrCreateCurrentWizardSession();

    const idx = sessions.findIndex(s => s.id === wizard.id);
    if (idx !== -1) {
      sessions[idx].selected_product_id = productId;
      this._saveToStorage('troubleshooting_wizard_sessions', sessions);
      return { wizardSession: this._withWizardRelations(sessions[idx]) };
    }

    return { wizardSession: this._withWizardRelations(wizard) };
  }

  // setTroubleshootingWizardPlatform(platform)
  setTroubleshootingWizardPlatform(platform) {
    const sessions = this._getFromStorage('troubleshooting_wizard_sessions');
    const wizard = this._getOrCreateCurrentWizardSession();

    const idx = sessions.findIndex(s => s.id === wizard.id);
    if (idx !== -1) {
      sessions[idx].selected_platform = platform;
      this._saveToStorage('troubleshooting_wizard_sessions', sessions);
      return { wizardSession: this._withWizardRelations(sessions[idx]) };
    }

    return { wizardSession: this._withWizardRelations(wizard) };
  }

  // setTroubleshootingWizardIssueType(issueType)
  setTroubleshootingWizardIssueType(issueType) {
    const sessions = this._getFromStorage('troubleshooting_wizard_sessions');
    const wizard = this._getOrCreateCurrentWizardSession();

    const idx = sessions.findIndex(s => s.id === wizard.id);
    if (idx !== -1) {
      sessions[idx].issue_type = issueType;
      this._saveToStorage('troubleshooting_wizard_sessions', sessions);
      return { wizardSession: this._withWizardRelations(sessions[idx]) };
    }

    return { wizardSession: this._withWizardRelations(wizard) };
  }

  // setTroubleshootingWizardSymptoms(symptoms)
  setTroubleshootingWizardSymptoms(symptoms) {
    const sessions = this._getFromStorage('troubleshooting_wizard_sessions');
    const wizard = this._getOrCreateCurrentWizardSession();

    const idx = sessions.findIndex(s => s.id === wizard.id);
    if (idx !== -1) {
      sessions[idx].symptoms = Array.isArray(symptoms) ? symptoms.slice() : [];
      sessions[idx].symptom_values = Array.isArray(symptoms) ? symptoms.slice() : [];
      this._saveToStorage('troubleshooting_wizard_sessions', sessions);
      return { wizardSession: this._withWizardRelations(sessions[idx]) };
    }

    return { wizardSession: this._withWizardRelations(wizard) };
  }

  // getTroubleshootingWizardResults()
  getTroubleshootingWizardResults() {
    const sessions = this._getFromStorage('troubleshooting_wizard_sessions');
    const wizard = this._getOrCreateCurrentWizardSession();
    const articles = this._getFromStorage('articles');
    const topics = this._getFromStorage('topics');

    let filtered = articles.slice();

    if (wizard.selected_product_id) {
      filtered = filtered.filter(a => a.product_id === wizard.selected_product_id);
    }
    if (wizard.selected_platform) {
      filtered = filtered.filter(a => a.platform === wizard.selected_platform);
    }

    if (wizard.issue_type === 'sync_errors') {
      const syncTopicIds = topics
        .filter(t => t.key === 'sync_issues')
        .map(t => t.id);
      filtered = filtered.filter(a => {
        const inSyncTopic = syncTopicIds.indexOf(a.topic_id) !== -1;
        const hasTag = Array.isArray(a.tags)
          ? a.tags.some(t => /sync/i.test(t) || /error/i.test(t))
          : false;
        return inSyncTopic || hasTag;
      });
    } else if (wizard.issue_type) {
      filtered = filtered.filter(a => {
        if (!Array.isArray(a.tags)) return false;
        return a.tags.some(t => t === wizard.issue_type);
      });
    }

    const sorted = this._applySortToArticles(filtered, 'relevance');
    const recommended = sorted.slice(0, 10);

    const recommendedIds = recommended.map(a => a.id);

    const idx = sessions.findIndex(s => s.id === wizard.id);
    if (idx !== -1) {
      sessions[idx].recommended_article_ids = recommendedIds;
      this._saveToStorage('troubleshooting_wizard_sessions', sessions);
    }

    const wizardSession = idx !== -1 ? sessions[idx] : wizard;

    return {
      wizardSession: this._withWizardRelations(wizardSession),
      recommendedArticles: recommended.map(a => this._withArticleRelations(a))
    };
  }

  // submitSupportRequest(name, email, subject, description, urgency, originArticleId, originContext)
  submitSupportRequest(name, email, subject, description, urgency, originArticleId, originContext) {
    const requests = this._getFromStorage('support_requests');
    const now = new Date().toISOString();

    const supportRequest = {
      id: this._generateId('sr'),
      name,
      email,
      subject,
      description,
      urgency,
      status: 'submitted',
      origin_article_id: originArticleId || null,
      origin_context: originContext || 'other',
      created_at: now
    };

    requests.push(supportRequest);
    this._saveToStorage('support_requests', requests);

    return {
      supportRequest: this._withSupportRequestRelations(supportRequest),
      successMessage: 'Your support request has been submitted.'
    };
  }

  // getAboutContent()
  getAboutContent() {
    const topics = this._getFromStorage('topics');

    const selfServiceHighlights = topics.map(t => ({
      label: t.name,
      description: t.description || '',
      topicKey: t.key
    }));

    return {
      title: 'About the FlowSync Knowledge Base',
      body:
        'This knowledge base helps you configure, troubleshoot, and get the most out of FlowSync products. Use search, topics, favorites, and collections to quickly find and organize the articles that matter to you.',
      selfServiceHighlights,
      supportLinkHint: 'If you cannot resolve an issue using these articles, use the Contact support links to submit a request.'
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