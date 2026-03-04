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
  }

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const defaults = {
      // Core content
      articles: '[]',
      authors: '[]',
      bookmarks: '[]',
      reading_lists: '[]',
      reading_list_items: '[]',
      reading_queues: '[]',
      reading_queue_items: '[]',
      comments: '[]',
      // Account & settings
      account_profiles: 'null', // single object
      feed_settings: 'null',    // single object
      notification_settings: 'null', // single object
      // Newsletters & subs
      newsletters: '[]',
      newsletter_subscriptions: '[]',
      // Events & planner
      events: '[]',
      event_planners: 'null', // single default planner
      planner_items: '[]',
      // Static pages & contact
      about_content: 'null',
      contact_info: 'null',
      contact_messages: '[]',
      // Id counter
      idCounter: '1000'
    };

    for (const key in defaults) {
      if (!Object.prototype.hasOwnProperty.call(defaults, key)) continue;
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, defaults[key]);
      }
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
  }

  _saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  _getNextIdCounter() {
    const currentRaw = localStorage.getItem('idCounter');
    const current = currentRaw ? parseInt(currentRaw, 10) : 1000;
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _getArticleDate(article) {
    // Prefer publish_date, fall back to createdAt
    return this._parseDate(article.publish_date || article.createdAt);
  }

  _mapCategoryName(category) {
    const map = {
      technology: 'Technology',
      space: 'Space',
      consumer_tech: 'Consumer Tech',
      consumer_tech_reviews: 'Consumer Tech Reviews',
      cybersecurity: 'Cybersecurity',
      general_tech: 'General Tech',
      gaming: 'Gaming'
    };
    return map[category] || category || '';
  }

  _mapContentTypeName(contentType) {
    const map = {
      news: 'News',
      feature: 'Feature',
      longform: 'Longform',
      opinion: 'Opinion',
      review: 'Review'
    };
    return map[contentType] || contentType || '';
  }

  _mapEventTypeName(eventType) {
    const map = {
      launch: 'Launch',
      conference: 'Conference',
      webinar: 'Webinar',
      other: 'Other'
    };
    return map[eventType] || eventType || '';
  }

  _mapEventCategoryName(category) {
    const map = {
      space: 'Space',
      technology: 'Technology',
      consumer_tech: 'Consumer Tech',
      general_tech: 'General Tech'
    };
    return map[category] || category || '';
  }

  // ------------------------
  // Internal helpers required by spec
  // ------------------------

  _getOrCreateAccountProfile() {
    let profile = this._getFromStorage('account_profiles', null);
    if (!profile) {
      const now = this._nowIso();
      profile = {
        id: this._generateId('acct'),
        username: 'guest',
        email: '',
        password: '',
        display_name: '',
        bio: '',
        createdAt: now,
        updatedAt: now
      };
      this._saveToStorage('account_profiles', profile);
    }
    return profile;
  }

  _getOrCreateDefaultPlanner() {
    let planner = this._getFromStorage('event_planners', null);
    if (!planner) {
      const now = this._nowIso();
      planner = {
        id: this._generateId('planner'),
        name: 'My Planner',
        createdAt: now,
        updatedAt: now
      };
      this._saveToStorage('event_planners', planner);
    }
    return planner;
  }

  _getOrCreateFeedSettings() {
    let settings = this._getFromStorage('feed_settings', null);
    if (!settings) {
      const now = this._nowIso();
      settings = {
        id: this._generateId('feedset'),
        topic_ai_enabled: true,
        topic_robotics_enabled: true,
        topic_gaming_enabled: true,
        daily_article_volume_min: 20,
        last_updated: now
      };
      this._saveToStorage('feed_settings', settings);
    }
    return settings;
  }

  _getOrCreateNotificationSettings() {
    let settings = this._getFromStorage('notification_settings', null);
    if (!settings) {
      const now = this._nowIso();
      settings = {
        id: this._generateId('notifset'),
        push_enabled: false,
        cybersecurity_breaking_enabled: false,
        cybersecurity_min_severity: 'high',
        cybersecurity_alert_type: 'instant',
        general_tech_breaking_enabled: false,
        space_breaking_enabled: false,
        gaming_breaking_enabled: false,
        last_updated: now
      };
      this._saveToStorage('notification_settings', settings);
    }
    return settings;
  }

  _getOrCreateNewsletterSubscriptions(email) {
    if (!email) {
      // If no email, nothing to create yet
      return this._getFromStorage('newsletter_subscriptions', []);
    }
    const newsletters = this._getFromStorage('newsletters', []);
    let subs = this._getFromStorage('newsletter_subscriptions', []);
    const now = this._nowIso();

    let changed = false;
    for (const nl of newsletters) {
      const existing = subs.find(
        s => s.newsletterId === nl.id && s.email === email
      );
      if (!existing) {
        const sub = {
          id: this._generateId('nsub'),
          newsletterId: nl.id,
          email: email,
          subscribed: false,
          frequency: nl.default_frequency || null,
          delivery_time: null,
          createdAt: now,
          updatedAt: null
        };
        subs.push(sub);
        changed = true;
      }
    }

    if (changed) {
      this._saveToStorage('newsletter_subscriptions', subs);
    }
    return subs;
  }

  _createBookmarkIfNotExists(articleId) {
    const now = this._nowIso();
    let bookmarks = this._getFromStorage('bookmarks', []);
    let bookmark = bookmarks.find(b => b.articleId === articleId);
    if (!bookmark) {
      bookmark = {
        id: this._generateId('bm'),
        articleId: articleId,
        createdAt: now
      };
      bookmarks.push(bookmark);
      this._saveToStorage('bookmarks', bookmarks);
    }
    return bookmark;
  }

  _createReadingListAndItem(articleId, listName, description) {
    const now = this._nowIso();
    let lists = this._getFromStorage('reading_lists', []);
    let items = this._getFromStorage('reading_list_items', []);

    const listId = this._generateId('rlist');
    const list = {
      id: listId,
      name: listName,
      description: description || '',
      createdAt: now,
      updatedAt: null
    };
    lists.push(list);

    const itemId = this._generateId('rli');
    const item = {
      id: itemId,
      listId: listId,
      articleId: articleId,
      position: 1,
      addedAt: now
    };
    items.push(item);

    this._saveToStorage('reading_lists', lists);
    this._saveToStorage('reading_list_items', items);

    return { list, item };
  }

  _createReadingQueueAndItem(articleId, queueName, description, setAsDefault) {
    const now = this._nowIso();
    let queues = this._getFromStorage('reading_queues', []);
    let items = this._getFromStorage('reading_queue_items', []);

    if (setAsDefault) {
      // Clear default flag from others
      queues = queues.map(q => ({
        ...q,
        is_default: false
      }));
    }

    const queueId = this._generateId('rqueue');
    const queue = {
      id: queueId,
      name: queueName,
      description: description || '',
      is_default: !!setAsDefault,
      createdAt: now,
      updatedAt: null
    };
    queues.push(queue);

    const itemId = this._generateId('rqi');
    const item = {
      id: itemId,
      queueId: queueId,
      articleId: articleId,
      position: 1,
      addedAt: now,
      status: 'queued'
    };
    items.push(item);

    this._saveToStorage('reading_queues', queues);
    this._saveToStorage('reading_queue_items', items);

    return { queue, item };
  }

  _markEventInPlannerFlag(eventsArray) {
    const plannerItems = this._getFromStorage('planner_items', []);
    const inPlannerSet = new Set(
      plannerItems
        .filter(pi => pi.status !== 'canceled')
        .map(pi => pi.eventId)
    );

    return eventsArray.map(ev => ({
      ...ev,
      is_in_planner: inPlannerSet.has(ev.id)
    }));
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomeFeed(page = 1, page_size = 20)
  getHomeFeed(page, page_size) {
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof page_size === 'number' && page_size > 0 ? page_size : 20;

    const feedSettings = this._getOrCreateFeedSettings();
    const articles = this._getFromStorage('articles', []);
    const bookmarks = this._getFromStorage('bookmarks', []);

    const bookmarkedSet = new Set(bookmarks.map(b => b.articleId));

    let filtered = articles.slice();

    // Exclude gaming if disabled
    if (feedSettings.topic_gaming_enabled === false) {
      filtered = filtered.filter(a => a.category !== 'gaming');
    }

    // If AI or Robotics enabled, restrict to those topics
    if (feedSettings.topic_ai_enabled || feedSettings.topic_robotics_enabled) {
      filtered = filtered.filter(a => {
        const topics = Array.isArray(a.topics) ? a.topics : [];
        const hasAI = topics.includes('artificial_intelligence');
        const hasRobotics = topics.includes('robotics');
        if (feedSettings.topic_ai_enabled && hasAI) return true;
        if (feedSettings.topic_robotics_enabled && hasRobotics) return true;
        return false;
      });
    }

    // Sort newest first by publish_date
    filtered.sort((a, b) => {
      const da = this._getArticleDate(a) || new Date(0);
      const db = this._getArticleDate(b) || new Date(0);
      return db - da;
    });

    const total = filtered.length;
    const start = (effectivePage - 1) * effectivePageSize;
    const end = start + effectivePageSize;
    const slice = filtered.slice(start, end);

    const resultArticles = slice.map(a => ({
      article_id: a.id,
      title: a.title,
      summary: a.summary || '',
      image_url: a.image_url || '',
      category: a.category,
      category_name: this._mapCategoryName(a.category),
      content_type: a.content_type,
      content_type_name: this._mapContentTypeName(a.content_type),
      topics: Array.isArray(a.topics) ? a.topics : [],
      reading_time_minutes: a.reading_time_minutes,
      publish_date: a.publish_date || a.createdAt || null,
      rating_average: a.rating_average || null,
      rating_count: a.rating_count || 0,
      is_editors_pick: !!a.is_editors_pick,
      is_bookmarked: bookmarkedSet.has(a.id)
    }));

    return {
      page: effectivePage,
      page_size: effectivePageSize,
      total_results: total,
      articles: resultArticles
    };
  }

  // getArticleSearchFilterOptions()
  getArticleSearchFilterOptions() {
    return {
      categories: [
        { key: 'technology', label: 'Technology' },
        { key: 'space', label: 'Space' },
        { key: 'consumer_tech', label: 'Consumer Tech' },
        { key: 'consumer_tech_reviews', label: 'Consumer Tech Reviews' },
        { key: 'cybersecurity', label: 'Cybersecurity' },
        { key: 'general_tech', label: 'General Tech' },
        { key: 'gaming', label: 'Gaming' }
      ],
      content_types: [
        { key: 'news', label: 'News' },
        { key: 'feature', label: 'Feature' },
        { key: 'longform', label: 'Longform' },
        { key: 'opinion', label: 'Opinion' },
        { key: 'review', label: 'Review' }
      ],
      reading_time_buckets: [
        { key: 'under_10_minutes', label: 'Under 10 minutes', min_minutes: 0, max_minutes: 9 },
        { key: '10_to_15_minutes', label: '10-15 minutes', min_minutes: 10, max_minutes: 15 },
        { key: '15_plus_minutes', label: '15+ minutes', min_minutes: 15, max_minutes: 10000 }
      ],
      date_presets: [
        { key: 'last_30_days', label: 'Last 30 days' },
        { key: 'last_6_months', label: 'Last 6 months' },
        { key: 'previous_calendar_year', label: 'Previous calendar year' }
      ],
      sort_options: [
        { key: 'newest_first', label: 'Newest First' },
        { key: 'most_popular', label: 'Most Popular' },
        { key: 'editors_picks', label: "Editor's Picks" },
        { key: 'user_rating_high_to_low', label: 'User Rating - High to Low' }
      ]
    };
  }

  // searchArticles(...)
  searchArticles(
    query,
    category,
    content_types,
    topics,
    date_from,
    date_to,
    date_preset,
    min_reading_time_minutes,
    max_reading_time_minutes,
    reading_time_bucket,
    sort_by,
    page,
    page_size
  ) {
    const effectiveSortBy = sort_by || 'newest_first';
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof page_size === 'number' && page_size > 0 ? page_size : 20;

    const articles = this._getFromStorage('articles', []);
    const authors = this._getFromStorage('authors', []);
    const bookmarks = this._getFromStorage('bookmarks', []);

    const bookmarkedSet = new Set(bookmarks.map(b => b.articleId));

    let filtered = articles.slice();

    // Text query
    if (query && typeof query === 'string' && query.trim() !== '') {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(a => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        return (
          title.indexOf(q) !== -1 ||
          summary.indexOf(q) !== -1 ||
          content.indexOf(q) !== -1
        );
      });
    }

    // Category filter
    if (category && typeof category === 'string') {
      filtered = filtered.filter(a => a.category === category);
    }

    // Content types filter
    if (Array.isArray(content_types) && content_types.length > 0) {
      const ctSet = new Set(content_types);
      filtered = filtered.filter(a => ctSet.has(a.content_type));
    }

    // Topics filter (any match)
    if (Array.isArray(topics) && topics.length > 0) {
      const tSet = new Set(topics);
      filtered = filtered.filter(a => {
        const at = Array.isArray(a.topics) ? a.topics : [];
        return at.some(t => tSet.has(t));
      });
    }

    // Date range / presets
    let fromDate = date_from ? this._parseDate(date_from) : null;
    let toDate = date_to ? this._parseDate(date_to) : null;

    if (!fromDate && !toDate && date_preset) {
      const now = new Date();
      if (date_preset === 'last_30_days') {
        toDate = now;
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (date_preset === 'last_6_months') {
        toDate = now;
        const past = new Date(now);
        past.setMonth(past.getMonth() - 6);
        fromDate = past;
      } else if (date_preset === 'previous_calendar_year') {
        const year = now.getUTCFullYear() - 1;
        fromDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
        toDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      }
    }

    if (fromDate || toDate) {
      filtered = filtered.filter(a => {
        const d = this._getArticleDate(a);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    // Reading time filters
    let minRt = typeof min_reading_time_minutes === 'number' ? min_reading_time_minutes : null;
    let maxRt = typeof max_reading_time_minutes === 'number' ? max_reading_time_minutes : null;

    if (reading_time_bucket) {
      if (reading_time_bucket === 'under_10_minutes') {
        if (maxRt === null || maxRt > 9) maxRt = 9;
        if (minRt === null) minRt = 0;
      } else if (reading_time_bucket === '10_to_15_minutes') {
        if (minRt === null || minRt < 10) minRt = 10;
        if (maxRt === null || maxRt > 15) maxRt = 15;
      } else if (reading_time_bucket === '15_plus_minutes') {
        if (minRt === null || minRt < 15) minRt = 15;
      }
    }

    if (minRt !== null || maxRt !== null) {
      filtered = filtered.filter(a => {
        const rt = a.reading_time_minutes;
        if (typeof rt !== 'number') return false;
        if (minRt !== null && rt < minRt) return false;
        if (maxRt !== null && rt > maxRt) return false;
        return true;
      });
    }

    // Sorting
    if (effectiveSortBy === 'most_popular') {
      filtered.sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        if (pb !== pa) return pb - pa;
        const da = this._getArticleDate(a) || new Date(0);
        const db = this._getArticleDate(b) || new Date(0);
        return db - da;
      });
    } else if (effectiveSortBy === 'editors_picks') {
      filtered.sort((a, b) => {
        const ea = !!a.is_editors_pick;
        const eb = !!b.is_editors_pick;
        if (ea !== eb) return eb ? 1 : -1; // picks first
        const da = this._getArticleDate(a) || new Date(0);
        const db = this._getArticleDate(b) || new Date(0);
        return db - da;
      });
    } else if (effectiveSortBy === 'user_rating_high_to_low') {
      filtered.sort((a, b) => {
        const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        if (cb !== ca) return cb - ca;
        const da = this._getArticleDate(a) || new Date(0);
        const db = this._getArticleDate(b) || new Date(0);
        return db - da;
      });
    } else {
      // newest_first default
      filtered.sort((a, b) => {
        const da = this._getArticleDate(a) || new Date(0);
        const db = this._getArticleDate(b) || new Date(0);
        return db - da;
      });
    }

    const total = filtered.length;
    const start = (effectivePage - 1) * effectivePageSize;
    const end = start + effectivePageSize;
    const slice = filtered.slice(start, end);

    const results = slice.map(a => {
      const author = authors.find(au => au.id === a.primary_author_id) || null;
      return {
        article_id: a.id,
        title: a.title,
        slug: a.slug || null,
        summary: a.summary || '',
        image_url: a.image_url || '',
        category: a.category,
        category_name: this._mapCategoryName(a.category),
        content_type: a.content_type,
        content_type_name: this._mapContentTypeName(a.content_type),
        topics: Array.isArray(a.topics) ? a.topics : [],
        reading_time_minutes: a.reading_time_minutes,
        publish_date: a.publish_date || a.createdAt || null,
        popularity_score: typeof a.popularity_score === 'number' ? a.popularity_score : null,
        is_editors_pick: !!a.is_editors_pick,
        rating_average: typeof a.rating_average === 'number' ? a.rating_average : null,
        rating_count: typeof a.rating_count === 'number' ? a.rating_count : 0,
        rating_scale: typeof a.rating_scale === 'number' ? a.rating_scale : null,
        primary_author_id: a.primary_author_id || null,
        primary_author_name: author ? author.name : null,
        primary_author: author, // foreign key resolution
        is_bookmarked: bookmarkedSet.has(a.id)
      };
    });

    return {
      query: query || '',
      page: effectivePage,
      page_size: effectivePageSize,
      total_results: total,
      results: results
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const authors = this._getFromStorage('authors', []);
    const bookmarks = this._getFromStorage('bookmarks', []);

    const article = articles.find(a => a.id === articleId);
    if (!article) return null;

    const author = authors.find(au => au.id === article.primary_author_id) || null;
    const isBookmarked = bookmarks.some(b => b.articleId === article.id);

    return {
      article_id: article.id,
      title: article.title,
      slug: article.slug || null,
      summary: article.summary || '',
      content: article.content || '',
      image_url: article.image_url || '',
      category: article.category,
      category_name: this._mapCategoryName(article.category),
      content_type: article.content_type,
      content_type_name: this._mapContentTypeName(article.content_type),
      topics: Array.isArray(article.topics) ? article.topics : [],
      reading_time_minutes: article.reading_time_minutes,
      publish_date: article.publish_date || article.createdAt || null,
      popularity_score: typeof article.popularity_score === 'number' ? article.popularity_score : null,
      is_editors_pick: !!article.is_editors_pick,
      is_breaking: !!article.is_breaking,
      severity: article.severity || null,
      rating_average: typeof article.rating_average === 'number' ? article.rating_average : null,
      rating_count: typeof article.rating_count === 'number' ? article.rating_count : 0,
      rating_scale: typeof article.rating_scale === 'number' ? article.rating_scale : null,
      primary_author_id: article.primary_author_id || null,
      primary_author_name: author ? author.name : null,
      primary_author: author, // foreign key resolution
      is_bookmarked: isBookmarked,
      is_commenting_enabled: article.is_commenting_enabled !== false
    };
  }

  // bookmarkArticle(articleId, bookmark)
  bookmarkArticle(articleId, bookmark) {
    let bookmarks = this._getFromStorage('bookmarks', []);

    if (bookmark) {
      const existing = bookmarks.find(b => b.articleId === articleId);
      if (!existing) {
        const now = this._nowIso();
        const bm = {
          id: this._generateId('bm'),
          articleId: articleId,
          createdAt: now
        };
        bookmarks.push(bm);
        this._saveToStorage('bookmarks', bookmarks);
      }
    } else {
      const beforeLen = bookmarks.length;
      bookmarks = bookmarks.filter(b => b.articleId !== articleId);
      if (bookmarks.length !== beforeLen) {
        this._saveToStorage('bookmarks', bookmarks);
      }
    }

    const isBookmarked = bookmarks.some(b => b.articleId === articleId);

    return {
      article_id: articleId,
      is_bookmarked: isBookmarked,
      message: bookmark ? 'Article bookmarked' : 'Bookmark removed'
    };
  }

  // getBookmarks()
  getBookmarks() {
    const bookmarks = this._getFromStorage('bookmarks', []);
    const articles = this._getFromStorage('articles', []);

    // Sort by createdAt descending
    const sorted = bookmarks.slice().sort((a, b) => {
      const da = this._parseDate(a.createdAt) || new Date(0);
      const db = this._parseDate(b.createdAt) || new Date(0);
      return db - da;
    });

    const items = sorted.map(bm => {
      const article = articles.find(a => a.id === bm.articleId) || null;
      return {
        bookmark_id: bm.id,
        added_at: bm.createdAt,
        article_id: bm.articleId,
        title: article ? article.title : null,
        summary: article ? article.summary || '' : null,
        image_url: article ? article.image_url || '' : null,
        category: article ? article.category : null,
        category_name: article ? this._mapCategoryName(article.category) : null,
        content_type: article ? article.content_type : null,
        content_type_name: article ? this._mapContentTypeName(article.content_type) : null,
        reading_time_minutes: article ? article.reading_time_minutes : null,
        publish_date: article ? article.publish_date || article.createdAt || null : null,
        article: article // foreign key resolution
      };
    });

    return { bookmarks: items };
  }

  // removeBookmark(bookmarkId)
  removeBookmark(bookmarkId) {
    let bookmarks = this._getFromStorage('bookmarks', []);
    const beforeLen = bookmarks.length;
    bookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    const success = bookmarks.length !== beforeLen;
    if (success) {
      this._saveToStorage('bookmarks', bookmarks);
    }
    return {
      success: success,
      bookmark_id: bookmarkId,
      message: success ? 'Bookmark removed' : 'Bookmark not found'
    };
  }

  // saveArticleToNewReadingList(articleId, list_name, description)
  saveArticleToNewReadingList(articleId, list_name, description) {
    const { list, item } = this._createReadingListAndItem(articleId, list_name, description);

    return {
      list_id: list.id,
      list_name: list.name,
      created_at: list.createdAt,
      reading_list_item_id: item.id,
      position: item.position,
      message: 'Reading list created and article added'
    };
  }

  // saveArticleToExistingReadingList(articleId, listId)
  saveArticleToExistingReadingList(articleId, listId) {
    const now = this._nowIso();
    const lists = this._getFromStorage('reading_lists', []);
    let items = this._getFromStorage('reading_list_items', []);

    const list = lists.find(l => l.id === listId);
    if (!list) {
      return {
        list_id: listId,
        reading_list_item_id: null,
        position: null,
        added_at: null,
        message: 'Reading list not found'
      };
    }

    const positions = items
      .filter(i => i.listId === listId)
      .map(i => typeof i.position === 'number' ? i.position : 0);
    const nextPos = positions.length > 0 ? Math.max.apply(null, positions) + 1 : 1;

    const itemId = this._generateId('rli');
    const item = {
      id: itemId,
      listId: listId,
      articleId: articleId,
      position: nextPos,
      addedAt: now
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      list_id: listId,
      reading_list_item_id: itemId,
      position: nextPos,
      added_at: now,
      message: 'Article added to reading list'
    };
  }

  // getReadingListsOverview()
  getReadingListsOverview() {
    const lists = this._getFromStorage('reading_lists', []);
    const items = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const overview = lists.map(list => {
      const listItems = items
        .filter(i => i.listId === list.id)
        .sort((a, b) => {
          const pa = typeof a.position === 'number' ? a.position : 0;
          const pb = typeof b.position === 'number' ? b.position : 0;
          if (pa !== pb) return pa - pb;
          const da = this._parseDate(a.addedAt) || new Date(0);
          const db = this._parseDate(b.addedAt) || new Date(0);
          return da - db;
        })
        .map(i => {
          const article = articles.find(a => a.id === i.articleId) || null;
          return {
            reading_list_item_id: i.id,
            position: i.position,
            added_at: i.addedAt,
            article_id: i.articleId,
            title: article ? article.title : null,
            summary: article ? article.summary || '' : null,
            image_url: article ? article.image_url || '' : null,
            category: article ? article.category : null,
            category_name: article ? this._mapCategoryName(article.category) : null,
            reading_time_minutes: article ? article.reading_time_minutes : null,
            publish_date: article ? article.publish_date || article.createdAt || null : null,
            article: article // foreign key resolution
          };
        });

      return {
        list_id: list.id,
        name: list.name,
        description: list.description || '',
        created_at: list.createdAt,
        updated_at: list.updatedAt || null,
        items: listItems
      };
    });

    return { reading_lists: overview };
  }

  // createReadingList(name, description)
  createReadingList(name, description) {
    const now = this._nowIso();
    let lists = this._getFromStorage('reading_lists', []);
    const list = {
      id: this._generateId('rlist'),
      name: name,
      description: description || '',
      createdAt: now,
      updatedAt: null
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return {
      list_id: list.id,
      name: list.name,
      description: list.description,
      created_at: list.createdAt,
      message: 'Reading list created'
    };
  }

  // renameReadingList(listId, new_name)
  renameReadingList(listId, new_name) {
    const now = this._nowIso();
    let lists = this._getFromStorage('reading_lists', []);
    const list = lists.find(l => l.id === listId);
    if (!list) {
      return {
        list_id: listId,
        name: null,
        updated_at: null,
        message: 'Reading list not found'
      };
    }
    list.name = new_name;
    list.updatedAt = now;
    this._saveToStorage('reading_lists', lists);
    return {
      list_id: list.id,
      name: list.name,
      updated_at: list.updatedAt,
      message: 'Reading list renamed'
    };
  }

  // deleteReadingList(listId)
  deleteReadingList(listId) {
    let lists = this._getFromStorage('reading_lists', []);
    let items = this._getFromStorage('reading_list_items', []);
    const beforeLen = lists.length;
    lists = lists.filter(l => l.id !== listId);
    const success = lists.length !== beforeLen;
    if (success) {
      items = items.filter(i => i.listId !== listId);
      this._saveToStorage('reading_lists', lists);
      this._saveToStorage('reading_list_items', items);
    }
    return {
      success: success,
      list_id: listId,
      message: success ? 'Reading list deleted' : 'Reading list not found'
    };
  }

  // removeArticleFromReadingList(readingListItemId)
  removeArticleFromReadingList(readingListItemId) {
    let items = this._getFromStorage('reading_list_items', []);
    const beforeLen = items.length;
    items = items.filter(i => i.id !== readingListItemId);
    const success = items.length !== beforeLen;
    if (success) {
      this._saveToStorage('reading_list_items', items);
    }
    return {
      success: success,
      reading_list_item_id: readingListItemId,
      message: success ? 'Item removed from reading list' : 'Reading list item not found'
    };
  }

  // saveArticleToNewReadingQueue(articleId, queue_name, description, set_as_default)
  saveArticleToNewReadingQueue(articleId, queue_name, description, set_as_default) {
    const { queue, item } = this._createReadingQueueAndItem(
      articleId,
      queue_name,
      description,
      !!set_as_default
    );

    return {
      queue_id: queue.id,
      queue_name: queue.name,
      created_at: queue.createdAt,
      reading_queue_item_id: item.id,
      position: item.position,
      status: item.status,
      message: 'Reading queue created and article added'
    };
  }

  // saveArticleToExistingReadingQueue(articleId, queueId)
  saveArticleToExistingReadingQueue(articleId, queueId) {
    const now = this._nowIso();
    const queues = this._getFromStorage('reading_queues', []);
    let items = this._getFromStorage('reading_queue_items', []);

    const queue = queues.find(q => q.id === queueId);
    if (!queue) {
      return {
        queue_id: queueId,
        reading_queue_item_id: null,
        position: null,
        status: null,
        added_at: null,
        message: 'Reading queue not found'
      };
    }

    const positions = items
      .filter(i => i.queueId === queueId)
      .map(i => typeof i.position === 'number' ? i.position : 0);
    const nextPos = positions.length > 0 ? Math.max.apply(null, positions) + 1 : 1;

    const itemId = this._generateId('rqi');
    const item = {
      id: itemId,
      queueId: queueId,
      articleId: articleId,
      position: nextPos,
      addedAt: now,
      status: 'queued'
    };
    items.push(item);
    this._saveToStorage('reading_queue_items', items);

    return {
      queue_id: queueId,
      reading_queue_item_id: itemId,
      position: nextPos,
      status: 'queued',
      added_at: now,
      message: 'Article added to reading queue'
    };
  }

  // getReadingQueuesOverview()
  getReadingQueuesOverview() {
    const queues = this._getFromStorage('reading_queues', []);
    const items = this._getFromStorage('reading_queue_items', []);
    const articles = this._getFromStorage('articles', []);

    const overview = queues.map(queue => {
      const qItems = items
        .filter(i => i.queueId === queue.id)
        .sort((a, b) => {
          const pa = typeof a.position === 'number' ? a.position : 0;
          const pb = typeof b.position === 'number' ? b.position : 0;
          if (pa !== pb) return pa - pb;
          const da = this._parseDate(a.addedAt) || new Date(0);
          const db = this._parseDate(b.addedAt) || new Date(0);
          return da - db;
        })
        .map(i => {
          const article = articles.find(a => a.id === i.articleId) || null;
          return {
            reading_queue_item_id: i.id,
            position: i.position,
            status: i.status || 'queued',
            added_at: i.addedAt,
            article_id: i.articleId,
            title: article ? article.title : null,
            summary: article ? article.summary || '' : null,
            image_url: article ? article.image_url || '' : null,
            category: article ? article.category : null,
            category_name: article ? this._mapCategoryName(article.category) : null,
            reading_time_minutes: article ? article.reading_time_minutes : null,
            publish_date: article ? article.publish_date || article.createdAt || null : null,
            article: article // foreign key resolution
          };
        });

      return {
        queue_id: queue.id,
        name: queue.name,
        description: queue.description || '',
        is_default: !!queue.is_default,
        created_at: queue.createdAt,
        updated_at: queue.updatedAt || null,
        items: qItems
      };
    });

    return { reading_queues: overview };
  }

  // createReadingQueue(name, description, is_default)
  createReadingQueue(name, description, is_default) {
    const now = this._nowIso();
    let queues = this._getFromStorage('reading_queues', []);

    if (is_default) {
      queues = queues.map(q => ({
        ...q,
        is_default: false
      }));
    }

    const queue = {
      id: this._generateId('rqueue'),
      name: name,
      description: description || '',
      is_default: !!is_default,
      createdAt: now,
      updatedAt: null
    };

    queues.push(queue);
    this._saveToStorage('reading_queues', queues);

    return {
      queue_id: queue.id,
      name: queue.name,
      description: queue.description,
      is_default: queue.is_default,
      created_at: queue.createdAt,
      message: 'Reading queue created'
    };
  }

  // renameReadingQueue(queueId, new_name)
  renameReadingQueue(queueId, new_name) {
    const now = this._nowIso();
    let queues = this._getFromStorage('reading_queues', []);
    const queue = queues.find(q => q.id === queueId);
    if (!queue) {
      return {
        queue_id: queueId,
        name: null,
        updated_at: null,
        message: 'Reading queue not found'
      };
    }
    queue.name = new_name;
    queue.updatedAt = now;
    this._saveToStorage('reading_queues', queues);
    return {
      queue_id: queue.id,
      name: queue.name,
      updated_at: queue.updatedAt,
      message: 'Reading queue renamed'
    };
  }

  // deleteReadingQueue(queueId)
  deleteReadingQueue(queueId) {
    let queues = this._getFromStorage('reading_queues', []);
    let items = this._getFromStorage('reading_queue_items', []);
    const beforeLen = queues.length;
    queues = queues.filter(q => q.id !== queueId);
    const success = queues.length !== beforeLen;
    if (success) {
      items = items.filter(i => i.queueId !== queueId);
      this._saveToStorage('reading_queues', queues);
      this._saveToStorage('reading_queue_items', items);
    }
    return {
      success: success,
      queue_id: queueId,
      message: success ? 'Reading queue deleted' : 'Reading queue not found'
    };
  }

  // updateReadingQueueItemStatus(readingQueueItemId, status)
  updateReadingQueueItemStatus(readingQueueItemId, status) {
    let items = this._getFromStorage('reading_queue_items', []);
    const item = items.find(i => i.id === readingQueueItemId);
    if (!item) {
      return {
        reading_queue_item_id: readingQueueItemId,
        status: null,
        message: 'Reading queue item not found'
      };
    }
    item.status = status;
    this._saveToStorage('reading_queue_items', items);
    return {
      reading_queue_item_id: item.id,
      status: item.status,
      message: 'Reading queue item status updated'
    };
  }

  // removeArticleFromReadingQueue(readingQueueItemId)
  removeArticleFromReadingQueue(readingQueueItemId) {
    let items = this._getFromStorage('reading_queue_items', []);
    const beforeLen = items.length;
    items = items.filter(i => i.id !== readingQueueItemId);
    const success = items.length !== beforeLen;
    if (success) {
      this._saveToStorage('reading_queue_items', items);
    }
    return {
      success: success,
      reading_queue_item_id: readingQueueItemId,
      message: success ? 'Item removed from reading queue' : 'Reading queue item not found'
    };
  }

  // getArticleComments(articleId, page = 1, page_size = 20)
  getArticleComments(articleId, page, page_size) {
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof page_size === 'number' && page_size > 0 ? page_size : 20;

    const comments = this._getFromStorage('comments', []);

    const visible = comments.filter(c => {
      if (c.articleId !== articleId) return false;
      if (!c.status || c.status === 'visible') return true;
      return false;
    });

    visible.sort((a, b) => {
      const da = this._parseDate(a.createdAt) || new Date(0);
      const db = this._parseDate(b.createdAt) || new Date(0);
      return da - db;
    });

    const total = visible.length;
    const start = (effectivePage - 1) * effectivePageSize;
    const end = start + effectivePageSize;
    const slice = visible.slice(start, end);

    const items = slice.map(c => ({
      comment_id: c.id,
      content: c.content,
      author_username: c.author_username || null,
      author_display_name: c.author_display_name || null,
      created_at: c.createdAt
    }));

    return {
      article_id: articleId,
      page: effectivePage,
      page_size: effectivePageSize,
      total_results: total,
      comments: items
    };
  }

  // postCommentOnArticle(articleId, content)
  postCommentOnArticle(articleId, content) {
    const profile = this._getOrCreateAccountProfile();
    let comments = this._getFromStorage('comments', []);
    const now = this._nowIso();

    const comment = {
      id: this._generateId('cmt'),
      articleId: articleId,
      content: content,
      author_username: profile.username,
      author_display_name: profile.display_name || profile.username,
      status: 'visible',
      createdAt: now,
      editedAt: null
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);

    return {
      comment_id: comment.id,
      article_id: articleId,
      content: comment.content,
      author_username: comment.author_username,
      author_display_name: comment.author_display_name,
      created_at: comment.createdAt,
      message: 'Comment posted'
    };
  }

  // getAuthorProfile(authorId, recent_limit = 10)
  getAuthorProfile(authorId, recent_limit) {
    const limit = typeof recent_limit === 'number' && recent_limit > 0 ? recent_limit : 10;
    const authors = this._getFromStorage('authors', []);
    const articles = this._getFromStorage('articles', []);

    const author = authors.find(a => a.id === authorId);
    if (!author) return null;

    const authoredArticles = articles
      .filter(a => a.primary_author_id === authorId)
      .sort((a, b) => {
        const da = this._getArticleDate(a) || new Date(0);
        const db = this._getArticleDate(b) || new Date(0);
        return db - da;
      })
      .slice(0, limit)
      .map(a => ({
        article_id: a.id,
        title: a.title,
        summary: a.summary || '',
        image_url: a.image_url || '',
        category: a.category,
        category_name: this._mapCategoryName(a.category),
        content_type: a.content_type,
        content_type_name: this._mapContentTypeName(a.content_type),
        publish_date: a.publish_date || a.createdAt || null,
        rating_average: typeof a.rating_average === 'number' ? a.rating_average : null,
        rating_count: typeof a.rating_count === 'number' ? a.rating_count : 0
      }));

    return {
      author_id: author.id,
      name: author.name,
      slug: author.slug || null,
      bio: author.bio || '',
      photo_url: author.photo_url || '',
      title: author.title || '',
      is_followed: !!author.is_followed,
      followed_at: author.followed_at || null,
      recent_articles: authoredArticles
    };
  }

  // followAuthor(authorId, follow)
  followAuthor(authorId, follow) {
    const now = this._nowIso();
    let authors = this._getFromStorage('authors', []);
    const author = authors.find(a => a.id === authorId);
    if (!author) {
      return {
        author_id: authorId,
        is_followed: false,
        followed_at: null,
        message: 'Author not found'
      };
    }
    author.is_followed = !!follow;
    author.followed_at = follow ? now : null;
    this._saveToStorage('authors', authors);

    return {
      author_id: author.id,
      is_followed: author.is_followed,
      followed_at: author.followed_at,
      message: follow ? 'Author followed' : 'Author unfollowed'
    };
  }

  // createAccountProfile(username, email, password, display_name, bio)
  createAccountProfile(username, email, password, display_name, bio) {
    const existing = this._getFromStorage('account_profiles', null);
    const now = this._nowIso();

    let profile;
    if (existing && existing.id) {
      // Overwrite existing single-user profile
      profile = {
        ...existing,
        username: username,
        email: email,
        password: password,
        display_name: display_name || existing.display_name || '',
        bio: bio || existing.bio || '',
        updatedAt: now
      };
    } else {
      profile = {
        id: this._generateId('acct'),
        username: username,
        email: email,
        password: password,
        display_name: display_name || '',
        bio: bio || '',
        createdAt: now,
        updatedAt: now
      };
    }

    this._saveToStorage('account_profiles', profile);

    return {
      account_id: profile.id,
      username: profile.username,
      email: profile.email,
      display_name: profile.display_name,
      bio: profile.bio,
      created_at: profile.createdAt,
      message: 'Account profile created'
    };
  }

  // getAccountProfile()
  getAccountProfile() {
    const profile = this._getFromStorage('account_profiles', null);
    if (!profile) return null;
    return {
      account_id: profile.id,
      username: profile.username,
      email: profile.email,
      display_name: profile.display_name || '',
      bio: profile.bio || '',
      created_at: profile.createdAt || null,
      updated_at: profile.updatedAt || null
    };
  }

  // updateAccountProfile(username?, email?, password?, display_name?, bio?)
  updateAccountProfile(username, email, password, display_name, bio) {
    const now = this._nowIso();
    let profile = this._getFromStorage('account_profiles', null);
    if (!profile) {
      profile = this._getOrCreateAccountProfile();
    }

    if (typeof username === 'string') profile.username = username;
    if (typeof email === 'string') profile.email = email;
    if (typeof password === 'string') profile.password = password;
    if (typeof display_name === 'string') profile.display_name = display_name;
    if (typeof bio === 'string') profile.bio = bio;
    profile.updatedAt = now;

    this._saveToStorage('account_profiles', profile);

    return {
      account_id: profile.id,
      username: profile.username,
      email: profile.email,
      display_name: profile.display_name || '',
      bio: profile.bio || '',
      updated_at: profile.updatedAt,
      message: 'Account profile updated'
    };
  }

  // getFeedSettings()
  getFeedSettings() {
    const settings = this._getOrCreateFeedSettings();
    return {
      topic_ai_enabled: !!settings.topic_ai_enabled,
      topic_robotics_enabled: !!settings.topic_robotics_enabled,
      topic_gaming_enabled: !!settings.topic_gaming_enabled,
      daily_article_volume_min: settings.daily_article_volume_min,
      last_updated: settings.last_updated || null
    };
  }

  // updateFeedSettings(topic_ai_enabled?, topic_robotics_enabled?, topic_gaming_enabled?, daily_article_volume_min?)
  updateFeedSettings(
    topic_ai_enabled,
    topic_robotics_enabled,
    topic_gaming_enabled,
    daily_article_volume_min
  ) {
    const now = this._nowIso();
    const settings = this._getOrCreateFeedSettings();

    if (typeof topic_ai_enabled === 'boolean') settings.topic_ai_enabled = topic_ai_enabled;
    if (typeof topic_robotics_enabled === 'boolean') settings.topic_robotics_enabled = topic_robotics_enabled;
    if (typeof topic_gaming_enabled === 'boolean') settings.topic_gaming_enabled = topic_gaming_enabled;
    if (typeof daily_article_volume_min === 'number') settings.daily_article_volume_min = daily_article_volume_min;

    settings.last_updated = now;
    this._saveToStorage('feed_settings', settings);

    return {
      topic_ai_enabled: !!settings.topic_ai_enabled,
      topic_robotics_enabled: !!settings.topic_robotics_enabled,
      topic_gaming_enabled: !!settings.topic_gaming_enabled,
      daily_article_volume_min: settings.daily_article_volume_min,
      last_updated: settings.last_updated,
      message: 'Feed settings updated'
    };
  }

  // getNotificationSettings()
  getNotificationSettings() {
    const settings = this._getOrCreateNotificationSettings();
    return {
      push_enabled: !!settings.push_enabled,
      cybersecurity_breaking_enabled: !!settings.cybersecurity_breaking_enabled,
      cybersecurity_min_severity: settings.cybersecurity_min_severity || null,
      cybersecurity_alert_type: settings.cybersecurity_alert_type || null,
      general_tech_breaking_enabled: !!settings.general_tech_breaking_enabled,
      space_breaking_enabled: !!settings.space_breaking_enabled,
      gaming_breaking_enabled: !!settings.gaming_breaking_enabled,
      last_updated: settings.last_updated || null
    };
  }

  // updateNotificationSettings(...)
  updateNotificationSettings(
    push_enabled,
    cybersecurity_breaking_enabled,
    cybersecurity_min_severity,
    cybersecurity_alert_type,
    general_tech_breaking_enabled,
    space_breaking_enabled,
    gaming_breaking_enabled
  ) {
    const now = this._nowIso();
    const settings = this._getOrCreateNotificationSettings();

    if (typeof push_enabled === 'boolean') settings.push_enabled = push_enabled;
    if (typeof cybersecurity_breaking_enabled === 'boolean') settings.cybersecurity_breaking_enabled = cybersecurity_breaking_enabled;
    if (typeof cybersecurity_min_severity === 'string') settings.cybersecurity_min_severity = cybersecurity_min_severity;
    if (typeof cybersecurity_alert_type === 'string') settings.cybersecurity_alert_type = cybersecurity_alert_type;
    if (typeof general_tech_breaking_enabled === 'boolean') settings.general_tech_breaking_enabled = general_tech_breaking_enabled;
    if (typeof space_breaking_enabled === 'boolean') settings.space_breaking_enabled = space_breaking_enabled;
    if (typeof gaming_breaking_enabled === 'boolean') settings.gaming_breaking_enabled = gaming_breaking_enabled;

    settings.last_updated = now;
    this._saveToStorage('notification_settings', settings);

    return {
      push_enabled: !!settings.push_enabled,
      cybersecurity_breaking_enabled: !!settings.cybersecurity_breaking_enabled,
      cybersecurity_min_severity: settings.cybersecurity_min_severity || null,
      cybersecurity_alert_type: settings.cybersecurity_alert_type || null,
      general_tech_breaking_enabled: !!settings.general_tech_breaking_enabled,
      space_breaking_enabled: !!settings.space_breaking_enabled,
      gaming_breaking_enabled: !!settings.gaming_breaking_enabled,
      last_updated: settings.last_updated,
      message: 'Notification settings updated'
    };
  }

  // getNewsletterOptionsAndSubscriptions()
  getNewsletterOptionsAndSubscriptions() {
    const newsletters = this._getFromStorage('newsletters', []);
    const profile = this._getFromStorage('account_profiles', null);
    const storedEmail = localStorage.getItem('newsletter_email');
    const email = ((profile && profile.email) || storedEmail || '');

    const subs = this._getOrCreateNewsletterSubscriptions(email);

    const resultNewsletters = newsletters.map(nl => {
      const sub = subs.find(s => s.newsletterId === nl.id && s.email === email) || null;
      return {
        newsletter_id: nl.id,
        name: nl.name,
        slug: nl.slug || null,
        topic: nl.topic,
        description: nl.description || '',
        available_frequencies: Array.isArray(nl.available_frequencies) ? nl.available_frequencies : [],
        subscription: {
          subscribed: sub ? !!sub.subscribed : false,
          frequency: sub ? sub.frequency || null : null,
          delivery_time: sub ? sub.delivery_time || null : null
        }
      };
    });

    return {
      email: email,
      newsletters: resultNewsletters
    };
  }

  // updateNewsletterSubscriptions(email, subscriptions)
  updateNewsletterSubscriptions(email, subscriptions) {
    const now = this._nowIso();
    let subs = this._getFromStorage('newsletter_subscriptions', []);

    if (!Array.isArray(subscriptions)) subscriptions = [];

    const updated = [];

    for (const upd of subscriptions) {
      if (!upd || !upd.newsletterId) continue;
      const nid = upd.newsletterId;
      const existing = subs.find(s => s.newsletterId === nid && s.email === email);
      if (existing) {
        existing.subscribed = !!upd.subscribed;
        if (typeof upd.frequency === 'string') existing.frequency = upd.frequency;
        if (typeof upd.delivery_time === 'string') existing.delivery_time = upd.delivery_time;
        existing.updatedAt = now;
        updated.push(existing);
      } else {
        const sub = {
          id: this._generateId('nsub'),
          newsletterId: nid,
          email: email,
          subscribed: !!upd.subscribed,
          frequency: typeof upd.frequency === 'string' ? upd.frequency : null,
          delivery_time: typeof upd.delivery_time === 'string' ? upd.delivery_time : null,
          createdAt: now,
          updatedAt: now
        };
        subs.push(sub);
        updated.push(sub);
      }
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    if (email) {
      localStorage.setItem('newsletter_email', email);
    }

    const updatedPayload = updated.map(s => ({
      newsletter_id: s.newsletterId,
      subscribed: !!s.subscribed,
      frequency: s.frequency || null,
      delivery_time: s.delivery_time || null
    }));

    return {
      email: email,
      updated_subscriptions: updatedPayload,
      message: 'Newsletter subscriptions updated'
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    return {
      event_types: [
        { key: 'launch', label: 'Launch' },
        { key: 'conference', label: 'Conference' },
        { key: 'webinar', label: 'Webinar' },
        { key: 'other', label: 'Other' }
      ],
      categories: [
        { key: 'space', label: 'Space' },
        { key: 'technology', label: 'Technology' },
        { key: 'consumer_tech', label: 'Consumer Tech' },
        { key: 'general_tech', label: 'General Tech' }
      ],
      importance_levels: [
        { key: 'normal', label: 'Normal' },
        { key: 'high', label: 'High' },
        { key: 'critical', label: 'Critical' }
      ],
      sort_options: [
        { key: 'date_ascending', label: 'Date ascending' },
        { key: 'date_descending', label: 'Date descending' },
        { key: 'importance_descending', label: 'Importance descending' }
      ]
    };
  }

  // searchEvents(date_from, date_to, event_type, category, has_live_stream, importance, sort_by)
  searchEvents(
    date_from,
    date_to,
    event_type,
    category,
    has_live_stream,
    importance,
    sort_by
  ) {
    const effectiveSort = sort_by || 'date_ascending';
    const events = this._getFromStorage('events', []);

    let filtered = events.slice();

    let fromDate = date_from ? this._parseDate(date_from) : null;
    let toDate = date_to ? this._parseDate(date_to) : null;

    if (fromDate || toDate) {
      filtered = filtered.filter(ev => {
        const d = this._parseDate(ev.start_datetime);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    if (event_type && typeof event_type === 'string') {
      filtered = filtered.filter(ev => ev.event_type === event_type);
    }

    if (category && typeof category === 'string') {
      filtered = filtered.filter(ev => ev.category === category);
    }

    if (typeof has_live_stream === 'boolean') {
      filtered = filtered.filter(ev => !!ev.has_live_stream === has_live_stream);
    }

    if (importance && typeof importance === 'string') {
      filtered = filtered.filter(ev => ev.importance === importance);
    }

    if (effectiveSort === 'date_descending') {
      filtered.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return db - da;
      });
    } else if (effectiveSort === 'importance_descending') {
      const rank = { critical: 3, high: 2, normal: 1 };
      filtered.sort((a, b) => {
        const ra = rank[a.importance] || 0;
        const rb = rank[b.importance] || 0;
        if (rb !== ra) return rb - ra;
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      });
    } else {
      // date_ascending
      filtered.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      });
    }

    const withFlags = this._markEventInPlannerFlag(filtered);

    const results = withFlags.map(ev => ({
      event_id: ev.id,
      title: ev.title,
      description: ev.description || '',
      event_type: ev.event_type,
      event_type_name: this._mapEventTypeName(ev.event_type),
      category: ev.category,
      category_name: this._mapEventCategoryName(ev.category),
      start_datetime: ev.start_datetime,
      end_datetime: ev.end_datetime || null,
      location: ev.location || '',
      location_type: ev.location_type || null,
      provider: ev.provider || '',
      mission_name: ev.mission_name || '',
      has_live_stream: !!ev.has_live_stream,
      importance: ev.importance || 'normal',
      is_in_planner: !!ev.is_in_planner
    }));

    return { events: results };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const plannerItems = this._getFromStorage('planner_items', []);

    const ev = events.find(e => e.id === eventId);
    if (!ev) return null;

    const isInPlanner = plannerItems.some(pi => pi.eventId === eventId && pi.status !== 'canceled');

    return {
      event_id: ev.id,
      title: ev.title,
      description: ev.description || '',
      event_type: ev.event_type,
      event_type_name: this._mapEventTypeName(ev.event_type),
      category: ev.category,
      category_name: this._mapEventCategoryName(ev.category),
      start_datetime: ev.start_datetime,
      end_datetime: ev.end_datetime || null,
      location: ev.location || '',
      location_type: ev.location_type || null,
      provider: ev.provider || '',
      mission_name: ev.mission_name || '',
      has_live_stream: !!ev.has_live_stream,
      live_stream_url: ev.live_stream_url || '',
      importance: ev.importance || 'normal',
      is_in_planner: isInPlanner
    };
  }

  // addEventToPlanner(eventId, notes, reminder_enabled = true)
  addEventToPlanner(eventId, notes, reminder_enabled) {
    const planner = this._getOrCreateDefaultPlanner();
    let items = this._getFromStorage('planner_items', []);
    const now = this._nowIso();

    // If already in planner, just return existing
    let existing = items.find(i => i.plannerId === planner.id && i.eventId === eventId);
    if (!existing) {
      existing = {
        id: this._generateId('pli'),
        plannerId: planner.id,
        eventId: eventId,
        addedAt: now,
        notes: notes || '',
        reminder_enabled: typeof reminder_enabled === 'boolean' ? reminder_enabled : true,
        status: 'scheduled'
      };
      items.push(existing);
      this._saveToStorage('planner_items', items);
    }

    return {
      planner_id: planner.id,
      planner_item_id: existing.id,
      event_id: existing.eventId,
      added_at: existing.addedAt,
      reminder_enabled: !!existing.reminder_enabled,
      status: existing.status || 'scheduled',
      message: 'Event added to planner'
    };
  }

  // getPlannerOverview()
  getPlannerOverview() {
    const planner = this._getOrCreateDefaultPlanner();
    const items = this._getFromStorage('planner_items', []);
    const events = this._getFromStorage('events', []);

    const plannerItems = items
      .filter(i => i.plannerId === planner.id)
      .sort((a, b) => {
        const da = this._parseDate(a.addedAt) || new Date(0);
        const db = this._parseDate(b.addedAt) || new Date(0);
        return da - db;
      })
      .map(i => {
        const ev = events.find(e => e.id === i.eventId) || null;
        const eventObj = ev
          ? {
              event_id: ev.id,
              title: ev.title,
              start_datetime: ev.start_datetime,
              end_datetime: ev.end_datetime || null,
              event_type: ev.event_type,
              event_type_name: this._mapEventTypeName(ev.event_type),
              category: ev.category,
              category_name: this._mapEventCategoryName(ev.category),
              has_live_stream: !!ev.has_live_stream,
              live_stream_url: ev.live_stream_url || ''
            }
          : null;

        return {
          planner_item_id: i.id,
          added_at: i.addedAt,
          reminder_enabled: !!i.reminder_enabled,
          status: i.status || 'scheduled',
          event: eventObj
        };
      });

    return {
      planner_id: planner.id,
      name: planner.name,
      created_at: planner.createdAt || null,
      updated_at: planner.updatedAt || null,
      items: plannerItems
    };
  }

  // removePlannerItem(plannerItemId)
  removePlannerItem(plannerItemId) {
    let items = this._getFromStorage('planner_items', []);
    const beforeLen = items.length;
    items = items.filter(i => i.id !== plannerItemId);
    const success = items.length !== beforeLen;
    if (success) {
      this._saveToStorage('planner_items', items);
    }
    return {
      success: success,
      planner_item_id: plannerItemId,
      message: success ? 'Planner item removed' : 'Planner item not found'
    };
  }

  // getAboutContent()
  getAboutContent() {
    const about = this._getFromStorage('about_content', null);
    if (!about) {
      // Return empty fields if nothing stored; no mock domain data
      return {
        mission_statement: '',
        editorial_focus: '',
        coverage_areas: '',
        team_overview: ''
      };
    }
    return {
      mission_statement: about.mission_statement || '',
      editorial_focus: about.editorial_focus || '',
      coverage_areas: about.coverage_areas || '',
      team_overview: about.team_overview || ''
    };
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', null);
    if (!info) {
      return {
        contact_email: '',
        social_channels: [],
        help_resources: []
      };
    }
    return {
      contact_email: info.contact_email || '',
      social_channels: Array.isArray(info.social_channels) ? info.social_channels : [],
      help_resources: Array.isArray(info.help_resources) ? info.help_resources : []
    };
  }

  // submitContactMessage(name, email, subject, message)
  submitContactMessage(name, email, subject, message) {
    const now = this._nowIso();
    let messages = this._getFromStorage('contact_messages', []);
    const msg = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      submittedAt: now
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message_id: msg.id,
      submitted_at: now,
      response_message: 'Your message has been received.'
    };
  }
}

// Global export for browser and Node.js
if (typeof globalThis !== 'undefined') {
  globalThis.BusinessLogic = BusinessLogic;
  // Expose a singleton instance as WebsiteSDK for convenience
  globalThis.WebsiteSDK = new BusinessLogic();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
