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

  // -----------------------
  // Storage helpers
  // -----------------------

  _initStorage() {
    const arrayKeys = [
      'categories',
      'tags',
      'articles',
      'content_collections',
      'collection_items',
      'comments',
      'feed_configurations',
      'newsletter_subscriptions',
      'notes',
      'polls',
      'poll_options',
      'poll_responses',
      'programming_languages',
      'trends_comparisons',
      'events',
      'event_reminders',
      'static_pages',
      'contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single object for contact page info
    if (!localStorage.getItem('contact_page_info')) {
      localStorage.setItem(
        'contact_page_info',
        JSON.stringify({ supportEmail: '', socialProfiles: [] })
      );
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
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _getDateRangeFromPreset(presetId) {
    const now = new Date();
    let from = null;
    let to = null;

    switch (presetId) {
      case 'this_month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        from = start;
        to = end;
        break;
      }
      case 'last_30_days': {
        const end = now;
        const start = new Date(now.getTime());
        start.setDate(start.getDate() - 30);
        from = start;
        to = end;
        break;
      }
      case 'last_12_months': {
        const end = now;
        const start = new Date(now.getTime());
        start.setFullYear(start.getFullYear() - 1);
        from = start;
        to = end;
        break;
      }
      case 'next_month': {
        const year = now.getFullYear();
        const month = now.getMonth();
        const start = new Date(year, month + 1, 1, 0, 0, 0, 0);
        const end = new Date(year, month + 2, 0, 23, 59, 59, 999);
        from = start;
        to = end;
        break;
      }
      case 'this_week': {
        const day = now.getDay(); // 0=Sun
        const diffToMonday = (day + 6) % 7; // days since Monday
        const start = new Date(now.getTime());
        start.setDate(start.getDate() - diffToMonday);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime());
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        from = start;
        to = end;
        break;
      }
      default:
        from = null;
        to = null;
    }

    return { from, to };
  }

  _compareDatesAsc(a, b) {
    const da = this._parseDate(a) || new Date(0);
    const db = this._parseDate(b) || new Date(0);
    return da.getTime() - db.getTime();
  }

  _compareDatesDesc(a, b) {
    const da = this._parseDate(a) || new Date(0);
    const db = this._parseDate(b) || new Date(0);
    return db.getTime() - da.getTime();
  }

  // -----------------------
  // Required private helpers
  // -----------------------

  _getOrCreateFeedConfiguration() {
    const configs = this._getFromStorage('feed_configurations');
    const categories = this._getFromStorage('categories');

    if (configs.length === 0) {
      const topicOrder = categories.map((c) => c.slug);
      const config = {
        id: this._generateId('feed_config'),
        topicOrder: topicOrder,
        disabledTopics: [],
        updatedAt: this._nowIso()
      };
      const newConfigs = [config];
      this._saveToStorage('feed_configurations', newConfigs);
      return config;
    }

    const config = configs[0];

    // Ensure new categories are included in topicOrder
    const existingSlugs = new Set(config.topicOrder || []);
    let changed = false;
    categories.forEach((cat) => {
      if (!existingSlugs.has(cat.slug)) {
        config.topicOrder.push(cat.slug);
        existingSlugs.add(cat.slug);
        changed = true;
      }
    });

    if (!Array.isArray(config.disabledTopics)) {
      config.disabledTopics = [];
      changed = true;
    }

    if (changed) {
      config.updatedAt = this._nowIso();
      this._saveToStorage('feed_configurations', [config]);
    }

    return config;
  }

  _filterAndSortArticles(articles, filters, sortBy) {
    let result = Array.isArray(articles) ? articles.slice() : [];
    const f = filters || {};

    // Tag filters (topic hierarchy handled by using both tagIds and subtopicIds when caller wants)
    if (Array.isArray(f.tagIds) && f.tagIds.length > 0) {
      result = result.filter((a) => {
        const tagIds = Array.isArray(a.tagIds) ? a.tagIds : [];
        // Require ALL requested tags to be present
        return f.tagIds.every((id) => tagIds.includes(id));
      });
    }

    if (Array.isArray(f.subtopicIds) && f.subtopicIds.length > 0) {
      result = result.filter((a) => {
        const subtopicIds = Array.isArray(a.subtopicIds) ? a.subtopicIds : [];
        return f.subtopicIds.every((id) => subtopicIds.includes(id));
      });
    }

    // Date filters
    let dateFrom = f.dateFrom ? this._parseDate(f.dateFrom) : null;
    let dateTo = f.dateTo ? this._parseDate(f.dateTo) : null;

    if (f.datePresetId && (!dateFrom || !dateTo)) {
      const range = this._getDateRangeFromPreset(f.datePresetId);
      if (!dateFrom && range.from) dateFrom = range.from;
      if (!dateTo && range.to) dateTo = range.to;
    }

    if (dateFrom || dateTo) {
      result = result.filter((a) => {
        const d = this._parseDate(a.publishDate);
        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
    }

    // Reading time filters
    if (typeof f.minReadingTimeMinutes === 'number') {
      result = result.filter(
        (a) => typeof a.estimatedReadingTimeMinutes === 'number' && a.estimatedReadingTimeMinutes >= f.minReadingTimeMinutes
      );
    }

    if (typeof f.maxReadingTimeMinutes === 'number') {
      result = result.filter(
        (a) => typeof a.estimatedReadingTimeMinutes === 'number' && a.estimatedReadingTimeMinutes <= f.maxReadingTimeMinutes
      );
    }

    // Sorting
    const sortKey = sortBy || 'newest_first';
    if (sortKey === 'newest_first' || sortKey === 'most_recent' || sortKey === 'date_desc') {
      result.sort((a, b) => this._compareDatesDesc(a.publishDate, b.publishDate));
    } else if (sortKey === 'date_asc') {
      result.sort((a, b) => this._compareDatesAsc(a.publishDate, b.publishDate));
    } else {
      // default to newest first
      result.sort((a, b) => this._compareDatesDesc(a.publishDate, b.publishDate));
    }

    return result;
  }

  _getOrCreateContentCollection(name, collectionType) {
    const collections = this._getFromStorage('content_collections');
    let existing = collections.find(
      (c) => c.name === name && c.collectionType === collectionType
    );
    if (existing) {
      return existing;
    }

    const now = this._nowIso();
    const collection = {
      id: this._generateId('collection'),
      name: name,
      collectionType: collectionType,
      description: '',
      createdAt: now,
      updatedAt: now
    };
    collections.push(collection);
    this._saveToStorage('content_collections', collections);
    return collection;
  }

  _incrementPollVoteCount(pollId, optionId) {
    const pollResponses = this._getFromStorage('poll_responses');
    const options = this._getFromStorage('poll_options');

    // Single-agent: only one response per poll
    let existingResponse = pollResponses.find((r) => r.pollId === pollId);
    if (existingResponse) {
      // Do not change counts if already voted
      return existingResponse;
    }

    const option = options.find((o) => o.id === optionId && o.pollId === pollId);
    if (!option) {
      // Invalid option/poll combination; do not create response
      return null;
    }

    const updatedOptions = options.map((o) => {
      if (o.id === optionId && o.pollId === pollId) {
        const currentCount = typeof o.voteCount === 'number' ? o.voteCount : 0;
        return { ...o, voteCount: currentCount + 1 };
      }
      return o;
    });

    const response = {
      id: this._generateId('poll_response'),
      pollId: pollId,
      optionId: optionId,
      respondedAt: this._nowIso()
    };

    pollResponses.push(response);
    this._saveToStorage('poll_responses', pollResponses);
    this._saveToStorage('poll_options', updatedOptions);

    return response;
  }

  _scheduleEventReminderNotification(reminder) {
    // Placeholder for notification scheduling logic.
    // Intentionally left as a no-op for pure business logic.
    return reminder;
  }

  _simpleHash(str) {
    let hash = 0;
    if (!str || !str.length) return hash;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // to 32-bit int
    }
    return Math.abs(hash);
  }

  // -----------------------
  // Interface implementations
  // -----------------------

  // getPrimaryNavigationCategories()
  getPrimaryNavigationCategories() {
    const categories = this._getFromStorage('categories');
    return categories;
  }

  // getHomepageFeed()
  getHomepageFeed() {
    const configuration = this._getOrCreateFeedConfiguration();
    const categories = this._getFromStorage('categories');
    const articles = this._getFromStorage('articles');

    const disabled = new Set(configuration.disabledTopics || []);
    const catBySlug = {};
    categories.forEach((c) => {
      catBySlug[c.slug] = c;
    });

    const sections = [];
    (configuration.topicOrder || []).forEach((slug) => {
      if (disabled.has(slug)) return;
      const category = catBySlug[slug];
      if (!category) return;
      const articlesForCategory = articles
        .filter((a) => a.categorySlug === slug)
        .sort((a, b) => this._compareDatesDesc(a.publishDate, b.publishDate));
      sections.push({
        topicSlug: slug,
        topicName: category.name,
        articles: articlesForCategory
      });
    });

    return { configuration, sections };
  }

  // getActiveHomepagePoll()
  getActiveHomepagePoll() {
    const polls = this._getFromStorage('polls');
    const options = this._getFromStorage('poll_options');
    const pollResponses = this._getFromStorage('poll_responses');
    const articles = this._getFromStorage('articles');

    const activePolls = polls.filter(
      (p) => p.status === 'active' && p.widgetLocation === 'homepage_sidebar'
    );

    if (activePolls.length === 0) {
      return {
        poll: null,
        options: [],
        hasResponded: false,
        selectedOptionId: null,
        results: []
      };
    }

    // Choose the most recently created active poll
    activePolls.sort((a, b) => this._compareDatesDesc(a.createdAt, b.createdAt));
    const poll = activePolls[0];

    const pollOptionsRaw = options.filter((o) => o.pollId === poll.id);
    const pollOptions = pollOptionsRaw.map((o) => {
      const recommendedArticle = o.recommendedArticleId
        ? articles.find((a) => a.id === o.recommendedArticleId) || null
        : null;
      return {
        ...o,
        poll: poll,
        recommendedArticle: recommendedArticle
      };
    });

    const response = pollResponses.find((r) => r.pollId === poll.id) || null;
    const hasResponded = !!response;
    const selectedOptionId = response ? response.optionId : null;

    const totalVotes = pollOptionsRaw.reduce(
      (sum, o) => sum + (typeof o.voteCount === 'number' ? o.voteCount : 0),
      0
    );

    const results = pollOptionsRaw.map((o) => {
      const count = typeof o.voteCount === 'number' ? o.voteCount : 0;
      const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
      return {
        optionId: o.id,
        label: o.label,
        voteCount: count,
        percentage: percentage
      };
    });

    return {
      poll,
      options: pollOptions,
      hasResponded,
      selectedOptionId,
      results
    };
  }

  // submitPollResponse(pollId, optionId)
  submitPollResponse(pollId, optionId) {
    const polls = this._getFromStorage('polls');
    const allOptions = this._getFromStorage('poll_options');
    const articles = this._getFromStorage('articles');

    const poll = polls.find((p) => p.id === pollId) || null;
    if (!poll) {
      return {
        response: null,
        results: [],
        recommendedArticle: null
      };
    }

    const option = allOptions.find((o) => o.id === optionId && o.pollId === pollId) || null;
    if (!option) {
      return {
        response: null,
        results: [],
        recommendedArticle: null
      };
    }

    const response = this._incrementPollVoteCount(pollId, optionId);

    // Re-read options after increment
    const updatedOptionsRaw = this._getFromStorage('poll_options').filter(
      (o) => o.pollId === pollId
    );

    const totalVotes = updatedOptionsRaw.reduce(
      (sum, o) => sum + (typeof o.voteCount === 'number' ? o.voteCount : 0),
      0
    );

    const results = updatedOptionsRaw.map((o) => {
      const count = typeof o.voteCount === 'number' ? o.voteCount : 0;
      const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
      return {
        optionId: o.id,
        label: o.label,
        voteCount: count,
        percentage: percentage
      };
    });

    const refreshedOption = updatedOptionsRaw.find((o) => o.id === optionId) || option;
    const recommendedArticle = refreshedOption.recommendedArticleId
      ? articles.find((a) => a.id === refreshedOption.recommendedArticleId) || null
      : null;

    return {
      response,
      results,
      recommendedArticle
    };
  }

  // searchArticlesGlobal(query, filters, sortBy, sortOrder, page, pageSize)
  searchArticlesGlobal(query, filters, sortBy, sortOrder, page, pageSize) {
    const allArticles = this._getFromStorage('articles');
    const q = (query || '').toLowerCase().trim();
    let results = allArticles;

    if (q) {
      results = results.filter((a) => {
        const inTitle = (a.title || '').toLowerCase().includes(q);
        const inSummary = (a.summary || '').toLowerCase().includes(q);
        const inContent = (a.content || '').toLowerCase().includes(q);
        return inTitle || inSummary || inContent;
      });
    }

    const f = filters || {};

    if (Array.isArray(f.categorySlugs) && f.categorySlugs.length > 0) {
      const allowed = new Set(f.categorySlugs);
      results = results.filter((a) => allowed.has(a.categorySlug));
    }

    if (Array.isArray(f.tagIds) && f.tagIds.length > 0) {
      results = results.filter((a) => {
        const tagIds = Array.isArray(a.tagIds) ? a.tagIds : [];
        return f.tagIds.every((id) => tagIds.includes(id));
      });
    }

    if (Array.isArray(f.contentTypes) && f.contentTypes.length > 0) {
      const allowedTypes = new Set(f.contentTypes);
      results = results.filter((a) => allowedTypes.has(a.contentType));
    }

    if (typeof f.minReadingTimeMinutes === 'number') {
      results = results.filter(
        (a) => typeof a.estimatedReadingTimeMinutes === 'number' && a.estimatedReadingTimeMinutes >= f.minReadingTimeMinutes
      );
    }

    if (typeof f.maxReadingTimeMinutes === 'number') {
      results = results.filter(
        (a) => typeof a.estimatedReadingTimeMinutes === 'number' && a.estimatedReadingTimeMinutes <= f.maxReadingTimeMinutes
      );
    }

    let dateFrom = f.dateFrom ? this._parseDate(f.dateFrom) : null;
    let dateTo = f.dateTo ? this._parseDate(f.dateTo) : null;

    if (dateFrom || dateTo) {
      results = results.filter((a) => {
        const d = this._parseDate(a.publishDate);
        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
    }

    // Sorting
    const sBy = sortBy || 'relevance';
    const sOrder = (sortOrder || 'desc').toLowerCase();

    if (sBy === 'date') {
      results.sort((a, b) => {
        const cmp = this._compareDatesAsc(a.publishDate, b.publishDate);
        return sOrder === 'asc' ? cmp : -cmp;
      });
    } else {
      // basic relevance: primary by date desc (most recent), secondary by title match
      results.sort((a, b) => {
        const da = this._parseDate(a.publishDate) || new Date(0);
        const db = this._parseDate(b.publishDate) || new Date(0);
        const dateCmp = db.getTime() - da.getTime();
        if (dateCmp !== 0) return dateCmp;
        if (!q) return 0;
        const inTitleA = (a.title || '').toLowerCase().includes(q) ? 1 : 0;
        const inTitleB = (b.title || '').toLowerCase().includes(q) ? 1 : 0;
        return inTitleB - inTitleA;
      });
    }

    const total = results.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageResults = results.slice(start, end);

    return {
      results: pageResults,
      total,
      page: pg,
      pageSize: size
    };
  }

  // getSearchFilterOptions()
  getSearchFilterOptions() {
    const contentTypes = [
      { value: 'article', label: 'Articles' },
      { value: 'explainer', label: 'Explainers' },
      { value: 'guide', label: 'Guides' },
      { value: 'news', label: 'News' }
    ];

    const readingTimePresets = [
      { id: 'lt_5', label: 'Under 5 minutes', minMinutes: 0, maxMinutes: 4 },
      { id: '5_15', label: '5-15 minutes', minMinutes: 5, maxMinutes: 15 },
      { id: '15_plus', label: '15+ minutes', minMinutes: 15 }
    ];

    const datePresets = [
      { id: 'this_month', label: 'This Month' },
      { id: 'last_30_days', label: 'Last 30 Days' },
      { id: 'last_12_months', label: 'Last 12 Months' }
    ];

    return {
      contentTypes,
      readingTimePresets,
      datePresets
    };
  }

  // getCategoryFilterOptions(categorySlug)
  getCategoryFilterOptions(categorySlug) {
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');
    const articles = this._getFromStorage('articles');

    const category = categories.find((c) => c.slug === categorySlug) || null;

    const articlesForCategory = articles.filter((a) => a.categorySlug === categorySlug);

    const tagIdSet = new Set();
    const subtopicIdSet = new Set();
    let minMinutes = null;
    let maxMinutes = null;

    articlesForCategory.forEach((a) => {
      (a.tagIds || []).forEach((id) => tagIdSet.add(id));
      (a.subtopicIds || []).forEach((id) => subtopicIdSet.add(id));
      if (typeof a.estimatedReadingTimeMinutes === 'number') {
        if (minMinutes === null || a.estimatedReadingTimeMinutes < minMinutes) {
          minMinutes = a.estimatedReadingTimeMinutes;
        }
        if (maxMinutes === null || a.estimatedReadingTimeMinutes > maxMinutes) {
          maxMinutes = a.estimatedReadingTimeMinutes;
        }
      }
    });

    const tagFilters = tags.filter((t) => tagIdSet.has(t.id));
    const subtopicFilters = tags.filter((t) => subtopicIdSet.has(t.id));

    const datePresets = [
      { id: 'this_month', label: 'This Month' },
      { id: 'last_30_days', label: 'Last 30 Days' },
      { id: 'last_12_months', label: 'Last 12 Months' }
    ];

    const readingTimeRange = {
      minMinutes: minMinutes !== null ? minMinutes : 0,
      maxMinutes: maxMinutes !== null ? maxMinutes : 0
    };

    return {
      category,
      tagFilters,
      subtopicFilters,
      datePresets,
      readingTimeRange
    };
  }

  // getCategoryArticles(categorySlug, filters, sortBy, page, pageSize)
  getCategoryArticles(categorySlug, filters, sortBy, page, pageSize) {
    const categories = this._getFromStorage('categories');
    const articles = this._getFromStorage('articles');
    const category = categories.find((c) => c.slug === categorySlug) || null;

    const baseArticles = articles.filter((a) => a.categorySlug === categorySlug);
    const filtered = this._filterAndSortArticles(baseArticles, filters || {}, sortBy);

    const total = filtered.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageArticles = filtered.slice(start, end);

    return {
      category,
      articles: pageArticles,
      total,
      page: pg,
      pageSize: size
    };
  }

  // searchCategoryArticles(categorySlug, query, filters, sortBy, page, pageSize)
  searchCategoryArticles(categorySlug, query, filters, sortBy, page, pageSize) {
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('categories');
    const category = categories.find((c) => c.slug === categorySlug) || null;
    const q = (query || '').toLowerCase().trim();

    const baseArticles = articles.filter((a) => a.categorySlug === categorySlug);

    // Also allow matches on tag names/slugs/descriptions so topic-based searches work
    const tags = this._getFromStorage('tags');

    const textFiltered = q
      ? baseArticles.filter((a) => {
          const inTitle = (a.title || '').toLowerCase().includes(q);
          const inSummary = (a.summary || '').toLowerCase().includes(q);
          const inContent = (a.content || '').toLowerCase().includes(q);

          // Check associated tags for text matches (e.g., "Self-Driving Cars" topic)
          let inTags = false;
          const articleTagIds = (a.tagIds || []).concat(a.subtopicIds || []);
          if (Array.isArray(tags) && articleTagIds.length > 0) {
            for (let i = 0; i < articleTagIds.length && !inTags; i++) {
              const tag = tags.find((t) => t.id === articleTagIds[i]);
              if (tag) {
                const tagText = ((tag.name || '') + ' ' + (tag.slug || '') + ' ' + (tag.description || '')).toLowerCase();
                if (tagText.includes(q)) {
                  inTags = true;
                }
              }
            }
          }

          return inTitle || inSummary || inContent || inTags;
        })
      : baseArticles;

    const filtered = this._filterAndSortArticles(textFiltered, filters || {}, sortBy);

    const total = filtered.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageArticles = filtered.slice(start, end);

    return {
      category,
      articles: pageArticles,
      total,
      page: pg,
      pageSize: size
    };
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        category: null,
        tags: [],
        relatedArticles: []
      };
    }

    const category = categories.find((c) => c.slug === article.categorySlug) || null;

    const tagIdSet = new Set();
    (article.tagIds || []).forEach((id) => tagIdSet.add(id));
    (article.subtopicIds || []).forEach((id) => tagIdSet.add(id));

    const articleTags = tags.filter((t) => tagIdSet.has(t.id));

    const relatedArticles = articles
      .filter((a) => a.id !== articleId && a.categorySlug === article.categorySlug)
      .sort((a, b) => this._compareDatesDesc(a.publishDate, b.publishDate))
      .slice(0, 5);

    return {
      article,
      category,
      tags: articleTags,
      relatedArticles
    };
  }

  // getArticleComments(articleId, page, pageSize)
  getArticleComments(articleId, page, pageSize) {
    const commentsAll = this._getFromStorage('comments');
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;

    const filtered = commentsAll
      .filter((c) => c.articleId === articleId)
      .sort((a, b) => this._compareDatesAsc(a.createdAt, b.createdAt));

    const total = filtered.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * size;
    const end = start + size;

    const pageCommentsRaw = filtered.slice(start, end);
    const pageComments = pageCommentsRaw.map((c) => ({
      ...c,
      article: article
    }));

    return {
      comments: pageComments,
      total,
      page: pg,
      pageSize: size
    };
  }

  // postCommentOnArticle(articleId, commenterName, commenterEmail, body)
  postCommentOnArticle(articleId, commenterName, commenterEmail, body) {
    const comments = this._getFromStorage('comments');

    if (!articleId || !commenterName || !commenterEmail || !body) {
      return {
        success: false,
        comment: null,
        message: 'Missing required fields.'
      };
    }

    const comment = {
      id: this._generateId('comment'),
      articleId: articleId,
      commenterName: commenterName,
      commenterEmail: commenterEmail,
      body: body,
      createdAt: this._nowIso(),
      isApproved: true
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      comment,
      message: 'Comment submitted successfully.'
    };
  }

  // getFeedConfiguration()
  getFeedConfiguration() {
    return this._getOrCreateFeedConfiguration();
  }

  // updateFeedConfiguration(topicOrder, disabledTopics)
  updateFeedConfiguration(topicOrder, disabledTopics) {
    const configs = this._getFromStorage('feed_configurations');
    let config = null;

    if (configs.length === 0) {
      config = {
        id: this._generateId('feed_config'),
        topicOrder: Array.isArray(topicOrder) ? topicOrder.slice() : [],
        disabledTopics: Array.isArray(disabledTopics) ? disabledTopics.slice() : [],
        updatedAt: this._nowIso()
      };
      this._saveToStorage('feed_configurations', [config]);
    } else {
      config = configs[0];
      config.topicOrder = Array.isArray(topicOrder) ? topicOrder.slice() : [];
      config.disabledTopics = Array.isArray(disabledTopics)
        ? disabledTopics.slice()
        : [];
      config.updatedAt = this._nowIso();
      this._saveToStorage('feed_configurations', [config]);
    }

    return config;
  }

  // getNewsletterSubscriptionOptions()
  getNewsletterSubscriptionOptions() {
    const frequencies = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const categories = this._getFromStorage('categories');
    const categoryTopics = categories.map((c) => ({ id: c.slug, label: c.name }));

    const extraTopics = [
      { id: 'artificial_intelligence', label: 'Artificial Intelligence' },
      { id: 'data_science', label: 'Data Science' },
      { id: 'data_analytics', label: 'Data & Analytics' }
    ];

    const existingIds = new Set(categoryTopics.map((t) => t.id));
    const topicOptions = categoryTopics.slice();
    extraTopics.forEach((t) => {
      if (!existingIds.has(t.id)) {
        topicOptions.push(t);
      }
    });

    const formats = [
      { value: 'html', label: 'HTML' },
      { value: 'rich_content', label: 'Rich Content' },
      { value: 'plain_text', label: 'Plain Text' }
    ];

    return {
      frequencies,
      topicOptions,
      formats
    };
  }

  // subscribeToNewsletter(email, fullName, frequency, topicsOfInterest, format)
  subscribeToNewsletter(email, fullName, frequency, topicsOfInterest, format) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');

    if (!email || !fullName || !frequency || !Array.isArray(topicsOfInterest)) {
      return {
        success: false,
        subscription: null,
        message: 'Missing required fields.'
      };
    }

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      email: email,
      fullName: fullName,
      frequency: frequency,
      topicsOfInterest: topicsOfInterest.slice(),
      format: format || null,
      subscribedAt: this._nowIso(),
      isActive: true
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription,
      message: 'Subscription created successfully.'
    };
  }

  // getNotes()
  getNotes() {
    const notes = this._getFromStorage('notes');
    const articles = this._getFromStorage('articles');

    return notes.map((n) => ({
      ...n,
      relatedArticle: n.relatedArticleId
        ? articles.find((a) => a.id === n.relatedArticleId) || null
        : null
    }));
  }

  // createNote(title, body, relatedArticleId)
  createNote(title, body, relatedArticleId) {
    const notes = this._getFromStorage('notes');

    const note = {
      id: this._generateId('note'),
      title: title,
      body: body || '',
      relatedArticleId: relatedArticleId || null,
      createdAt: this._nowIso(),
      updatedAt: null
    };

    notes.push(note);
    this._saveToStorage('notes', notes);

    return note;
  }

  // updateNote(noteId, title, body, relatedArticleId)
  updateNote(noteId, title, body, relatedArticleId) {
    const notes = this._getFromStorage('notes');
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) {
      return null;
    }

    const updated = {
      ...notes[idx],
      title: title,
      body: body || '',
      relatedArticleId: relatedArticleId || null,
      updatedAt: this._nowIso()
    };

    notes[idx] = updated;
    this._saveToStorage('notes', notes);
    return updated;
  }

  // deleteNote(noteId)
  deleteNote(noteId) {
    const notes = this._getFromStorage('notes');
    const newNotes = notes.filter((n) => n.id !== noteId);
    const success = newNotes.length !== notes.length;
    if (success) {
      this._saveToStorage('notes', newNotes);
    }
    return { success };
  }

  // getProgrammingLanguages()
  getProgrammingLanguages() {
    return this._getFromStorage('programming_languages');
  }

  // getProgrammingTrendsComparison(languageIds, timeRangeType, presetRange, startYear, endYear)
  getProgrammingTrendsComparison(languageIds, timeRangeType, presetRange, startYear, endYear) {
    const allLangs = this._getFromStorage('programming_languages');
    const ids = Array.isArray(languageIds) ? languageIds : [];
    const languages = allLangs.filter((l) => ids.includes(l.id));

    let timeAxis = [];

    if (timeRangeType === 'preset') {
      const now = new Date();
      const currentYear = now.getFullYear();
      if (presetRange === 'last_5_years') {
        for (let y = currentYear - 4; y <= currentYear; y++) {
          timeAxis.push(y);
        }
      } else if (presetRange === 'last_10_years') {
        for (let y = currentYear - 9; y <= currentYear; y++) {
          timeAxis.push(y);
        }
      } else if (presetRange === 'last_12_months') {
        // Represent months as year*100 + monthIndex (1-12)
        const start = new Date(now.getTime());
        start.setMonth(start.getMonth() - 11);
        for (let i = 0; i < 12; i++) {
          const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
          const val = d.getFullYear() * 100 + (d.getMonth() + 1);
          timeAxis.push(val);
        }
      } else {
        // all_time or unknown: default to last 5 years
        const current = currentYear;
        for (let y = current - 4; y <= current; y++) {
          timeAxis.push(y);
        }
      }
    } else if (timeRangeType === 'custom') {
      const s = typeof startYear === 'number' ? startYear : null;
      const e = typeof endYear === 'number' ? endYear : null;
      if (s && e && e >= s) {
        for (let y = s; y <= e; y++) {
          timeAxis.push(y);
        }
      } else {
        const now = new Date();
        const currentYear = now.getFullYear();
        for (let y = currentYear - 4; y <= currentYear; y++) {
          timeAxis.push(y);
        }
      }
    } else {
      const now = new Date();
      const currentYear = now.getFullYear();
      for (let y = currentYear - 4; y <= currentYear; y++) {
        timeAxis.push(y);
      }
    }

    const series = languages.map((lang) => {
      const dataPoints = timeAxis.map((_, idx) => {
        const base = this._simpleHash(lang.slug || lang.name || '') % 50;
        const value = base + idx * 5;
        return {
          timeIndex: idx,
          value: value
        };
      });
      return {
        languageId: lang.id,
        dataPoints
      };
    });

    return {
      languages,
      timeAxis,
      series
    };
  }

  // saveTrendsComparison(name, languageIds, timeRangeType, presetRange, startYear, endYear)
  saveTrendsComparison(name, languageIds, timeRangeType, presetRange, startYear, endYear) {
    const comparisons = this._getFromStorage('trends_comparisons');

    const comparison = {
      id: this._generateId('trends_comparison'),
      name: name,
      languageIds: Array.isArray(languageIds) ? languageIds.slice() : [],
      timeRangeType: timeRangeType,
      presetRange: timeRangeType === 'preset' ? presetRange || null : null,
      startYear: timeRangeType === 'custom' ? startYear || null : null,
      endYear: timeRangeType === 'custom' ? endYear || null : null,
      createdAt: this._nowIso(),
      updatedAt: null
    };

    comparisons.push(comparison);
    this._saveToStorage('trends_comparisons', comparisons);

    return comparison;
  }

  // getSavedTrendsComparisons()
  getSavedTrendsComparisons() {
    const comparisons = this._getFromStorage('trends_comparisons');
    const languages = this._getFromStorage('programming_languages');

    return comparisons.map((c) => ({
      ...c,
      languages: Array.isArray(c.languageIds)
        ? c.languageIds
            .map((id) => languages.find((l) => l.id === id) || null)
            .filter((x) => x !== null)
        : []
    }));
  }

  // getEventsFilterOptions()
  getEventsFilterOptions() {
    const events = this._getFromStorage('events');
    const topicSet = new Set();
    events.forEach((e) => {
      if (e.topic) topicSet.add(e.topic);
    });

    const topics = Array.from(topicSet).map((t) => ({ value: t, label: t }));

    const datePresets = [
      { id: 'next_month', label: 'Next Month' },
      { id: 'this_month', label: 'This Month' },
      { id: 'this_week', label: 'This Week' }
    ];

    return {
      topics,
      datePresets
    };
  }

  // getEventsList(filters, sortBy, sortOrder, page, pageSize)
  getEventsList(filters, sortBy, sortOrder, page, pageSize) {
    const eventsAll = this._getFromStorage('events');
    const f = filters || {};

    let events = eventsAll.slice();

    if (f.topic) {
      const t = f.topic.toLowerCase();
      events = events.filter((e) => {
        const et = (e.topic || '').toLowerCase();
        return et === t || et.includes(t) || t.includes(et);
      });
    }

    // Date filters
    let dateFrom = f.startDateTimeFrom ? this._parseDate(f.startDateTimeFrom) : null;
    let dateTo = f.startDateTimeTo ? this._parseDate(f.startDateTimeTo) : null;

    if (f.datePresetId && (!dateFrom || !dateTo)) {
      const range = this._getDateRangeFromPreset(f.datePresetId);
      if (!dateFrom && range.from) dateFrom = range.from;
      if (!dateTo && range.to) dateTo = range.to;
    }

    if (dateFrom || dateTo) {
      events = events.filter((e) => {
        const d = this._parseDate(e.startDateTime);
        if (!d) return false;
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
      });
    }

    if (f.eventType) {
      events = events.filter((e) => e.eventType === f.eventType);
    }

    if (typeof f.isOnlineOnly === 'boolean') {
      if (f.isOnlineOnly) {
        events = events.filter((e) => e.isOnline === true);
      }
    }

    const sBy = sortBy || 'date';
    const sOrder = (sortOrder || 'asc').toLowerCase();

    if (sBy === 'date') {
      events.sort((a, b) => {
        const cmp = this._compareDatesAsc(a.startDateTime, b.startDateTime);
        return sOrder === 'asc' ? cmp : -cmp;
      });
    }

    const total = events.length;
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageEvents = events.slice(start, end);

    return {
      events: pageEvents,
      total,
      page: pg,
      pageSize: size
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const reminders = this._getFromStorage('event_reminders');

    const event = events.find((e) => e.id === eventId) || null;
    const existing = reminders.find((r) => r.eventId === eventId) || null;

    const existingReminder = existing
      ? {
          ...existing,
          event: event
        }
      : null;

    return {
      event,
      existingReminder
    };
  }

  // addOrUpdateEventReminder(eventId, reminderOffsetUnit, reminderOffsetValue)
  addOrUpdateEventReminder(eventId, reminderOffsetUnit, reminderOffsetValue) {
    const reminders = this._getFromStorage('event_reminders');
    let reminder = reminders.find((r) => r.eventId === eventId) || null;

    if (reminder) {
      reminder.reminderOffsetUnit = reminderOffsetUnit;
      reminder.reminderOffsetValue = reminderOffsetValue;
      reminder.isEnabled = true;
    } else {
      reminder = {
        id: this._generateId('event_reminder'),
        eventId: eventId,
        reminderOffsetUnit: reminderOffsetUnit,
        reminderOffsetValue: reminderOffsetValue,
        createdAt: this._nowIso(),
        isEnabled: true
      };
      reminders.push(reminder);
    }

    this._saveToStorage('event_reminders', reminders);
    this._scheduleEventReminderNotification(reminder);

    return reminder;
  }

  // getEventReminders()
  getEventReminders() {
    const reminders = this._getFromStorage('event_reminders');
    const events = this._getFromStorage('events');

    return reminders.map((r) => ({
      ...r,
      event: events.find((e) => e.id === r.eventId) || null
    }));
  }

  // getUserCollectionsSummary()
  getUserCollectionsSummary() {
    const collections = this._getFromStorage('content_collections');
    const items = this._getFromStorage('collection_items');

    const summary = collections.map((c) => {
      const count = items.filter((i) => i.collectionId === c.id).length;
      return {
        collection: c,
        articleCount: count
      };
    });

    return summary;
  }

  // getMyLibraryOverview()
  getMyLibraryOverview() {
    const collections = this._getFromStorage('content_collections');
    const items = this._getFromStorage('collection_items');
    const articles = this._getFromStorage('articles');

    const readingLists = [];
    const readingQueues = [];

    collections.forEach((c) => {
      const collectionItems = items
        .filter((i) => i.collectionId === c.id)
        .sort((a, b) => {
          const pa = typeof a.position === 'number' ? a.position : 0;
          const pb = typeof b.position === 'number' ? b.position : 0;
          if (pa !== pb) return pa - pb;
          return this._compareDatesAsc(a.addedAt, b.addedAt);
        });

      const detailedItems = collectionItems.map((ci) => ({
        collectionItem: ci,
        article: articles.find((a) => a.id === ci.articleId) || null
      }));

      const entry = {
        collection: c,
        items: detailedItems
      };

      if (c.collectionType === 'reading_list') {
        readingLists.push(entry);
      } else if (c.collectionType === 'reading_queue') {
        readingQueues.push(entry);
      }
    });

    return {
      readingLists,
      readingQueues
    };
  }

  // saveArticleToNewCollection(articleId, collectionName, collectionType)
  saveArticleToNewCollection(articleId, collectionName, collectionType) {
    const collections = this._getFromStorage('content_collections');
    const items = this._getFromStorage('collection_items');

    const now = this._nowIso();

    const collection = {
      id: this._generateId('collection'),
      name: collectionName,
      collectionType: collectionType,
      description: '',
      createdAt: now,
      updatedAt: now
    };

    collections.push(collection);
    this._saveToStorage('content_collections', collections);

    const collectionItem = {
      id: this._generateId('collection_item'),
      collectionId: collection.id,
      articleId: articleId,
      position: 1,
      addedAt: now
    };

    items.push(collectionItem);
    this._saveToStorage('collection_items', items);

    return {
      collection,
      collectionItem
    };
  }

  // saveArticleToExistingCollection(articleId, collectionId)
  saveArticleToExistingCollection(articleId, collectionId) {
    const items = this._getFromStorage('collection_items');

    const positions = items
      .filter((i) => i.collectionId === collectionId)
      .map((i) => (typeof i.position === 'number' ? i.position : 0));
    const nextPos = positions.length > 0 ? Math.max(...positions) + 1 : 1;

    const item = {
      id: this._generateId('collection_item'),
      collectionId: collectionId,
      articleId: articleId,
      position: nextPos,
      addedAt: this._nowIso()
    };

    items.push(item);
    this._saveToStorage('collection_items', items);

    return item;
  }

  // updateContentCollection(collectionId, name)
  updateContentCollection(collectionId, name) {
    const collections = this._getFromStorage('content_collections');
    const idx = collections.findIndex((c) => c.id === collectionId);
    if (idx === -1) return null;

    const updated = {
      ...collections[idx],
      name: name,
      updatedAt: this._nowIso()
    };

    collections[idx] = updated;
    this._saveToStorage('content_collections', collections);

    return updated;
  }

  // deleteContentCollection(collectionId)
  deleteContentCollection(collectionId) {
    const collections = this._getFromStorage('content_collections');
    const items = this._getFromStorage('collection_items');

    const newCollections = collections.filter((c) => c.id !== collectionId);
    const newItems = items.filter((i) => i.collectionId !== collectionId);

    const success = newCollections.length !== collections.length;

    if (success) {
      this._saveToStorage('content_collections', newCollections);
      this._saveToStorage('collection_items', newItems);
    }

    return { success };
  }

  // removeItemFromCollection(collectionItemId)
  removeItemFromCollection(collectionItemId) {
    const items = this._getFromStorage('collection_items');
    const newItems = items.filter((i) => i.id !== collectionItemId);
    const success = newItems.length !== items.length;

    if (success) {
      this._saveToStorage('collection_items', newItems);
    }

    return { success };
  }

  // getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find((p) => p.slug === pageSlug) || null;

    if (!page) {
      return {
        title: '',
        bodyHtml: ''
      };
    }

    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || ''
    };
  }

  // getContactPageInfo()
  getContactPageInfo() {
    const raw = localStorage.getItem('contact_page_info');
    if (!raw) {
      return {
        supportEmail: '',
        socialProfiles: []
      };
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        supportEmail: parsed.supportEmail || '',
        socialProfiles: Array.isArray(parsed.socialProfiles)
          ? parsed.socialProfiles
          : []
      };
    } catch (e) {
      return {
        supportEmail: '',
        socialProfiles: []
      };
    }
  }

  // submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    if (!name || !email || !message) {
      return {
        success: false,
        message: 'Missing required fields.'
      };
    }

    const messages = this._getFromStorage('contact_messages');

    const entry = {
      id: this._generateId('contact_message'),
      name: name,
      email: email,
      subject: subject || '',
      message: message,
      createdAt: this._nowIso()
    };

    messages.push(entry);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message submitted successfully.'
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
