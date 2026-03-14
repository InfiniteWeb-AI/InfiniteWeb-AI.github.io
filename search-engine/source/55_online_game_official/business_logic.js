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
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // =========================
  // Storage helpers
  // =========================

  _initStorage() {
    const keys = [
      'articles',
      'article_comments',
      'reading_list_items',
      'favorite_items',
      'collections',
      'collection_items',
      'newsletter_preferences',
      'notification_settings',
      'informational_pages',
      'support_page_data'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        // Arrays for most, object for support_page_data
        if (key === 'support_page_data') {
          localStorage.setItem(
            key,
            JSON.stringify({ faqs: [], troubleshootingSections: [], contactOptions: [] })
          );
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
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

  // =========================
  // User state helpers
  // =========================

  _getOrCreateUserState() {
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const favoriteItems = this._getFromStorage('favorite_items', []);
    const collections = this._getFromStorage('collections', []);
    const collectionItems = this._getFromStorage('collection_items', []);
    const newsletterList = this._getFromStorage('newsletter_preferences', []);
    const notificationList = this._getFromStorage('notification_settings', []);

    const newsletterPreferences = newsletterList[0] || null;
    const notificationSettings = notificationList[0] || null;

    return {
      readingListItems,
      favoriteItems,
      collections,
      collectionItems,
      newsletterPreferences,
      notificationSettings
    };
  }

  _persistUserState(state) {
    if (state.readingListItems) {
      this._saveToStorage('reading_list_items', state.readingListItems);
    }
    if (state.favoriteItems) {
      this._saveToStorage('favorite_items', state.favoriteItems);
    }
    if (state.collections) {
      this._saveToStorage('collections', state.collections);
    }
    if (state.collectionItems) {
      this._saveToStorage('collection_items', state.collectionItems);
    }
    if (state.newsletterPreferences !== undefined) {
      const list = state.newsletterPreferences ? [state.newsletterPreferences] : [];
      this._saveToStorage('newsletter_preferences', list);
    }
    if (state.notificationSettings !== undefined) {
      const list = state.notificationSettings ? [state.notificationSettings] : [];
      this._saveToStorage('notification_settings', list);
    }
  }

  // =========================
  // Formatting helpers
  // =========================

  _formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    // YYYY-MM-DD for consistency
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _formatViews(views) {
    if (views === null || views === undefined) return '0 views';
    const num = Number(views) || 0;
    const withCommas = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${withCommas} views`;
  }

  _formatReadingTimeLabel(minutes) {
    if (minutes === null || minutes === undefined) return '';
    const m = Number(minutes) || 0;
    return `${m} min read`;
  }

  _mapContentTypeLabel(contentType) {
    const map = {
      patch_notes: 'Patch Notes',
      esports: 'Esports',
      dev_blog: 'Developer Blog',
      guide: 'Guide',
      update_announcement: 'Update Announcement',
      server_status: 'Server Status',
      maintenance: 'Maintenance',
      community_story: 'Community Story',
      promotion: 'Promotion',
      other: 'Other'
    };
    return map[contentType] || 'Other';
  }

  _mapPlatformLabel(platform) {
    const map = {
      pc: 'PC',
      xbox: 'Xbox',
      playstation: 'PlayStation',
      switch: 'Switch',
      cross_platform: 'Cross-platform',
      other: 'Other'
    };
    return map[platform] || '';
  }

  _mapRegionLabel(region) {
    const map = {
      europe: 'Europe',
      north_america: 'North America',
      asia: 'Asia',
      south_america: 'South America',
      oceania: 'Oceania',
      global: 'Global',
      other: 'Other'
    };
    return map[region] || '';
  }

  _mapAudienceLevelLabel(audienceLevel) {
    const map = {
      beginner: 'Beginner',
      new_players: 'New Players',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      all_players: 'All Players'
    };
    return map[audienceLevel] || '';
  }

  _mapFrequencyLabel(freq) {
    const map = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly'
    };
    return map[freq] || '';
  }

  // =========================
  // Generic helpers
  // =========================

  _applyDateFilter(items, dateField, dateFrom, dateTo, datePreset) {
    let from = dateFrom ? new Date(dateFrom) : null;
    let to = dateTo ? new Date(dateTo) : null;

    const now = new Date();

    if (!dateFrom && !dateTo && datePreset) {
      if (datePreset === 'last_7_days') {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (datePreset === 'last_14_days') {
        from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      } else if (datePreset === 'last_30_days') {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (datePreset === 'last_6_months') {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 6);
        from = d;
      } else if (datePreset === 'this_year') {
        from = new Date(now.getFullYear(), 0, 1);
      }
      // 'all_time' or unknown: no filter
    }

    return items.filter((item) => {
      const value = item[dateField];
      if (!value) return false;
      const d = new Date(value);
      if (isNaN(d.getTime())) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }

  _paginate(items, page, pageSize) {
    const totalItems = items.length;
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * size;
    const end = start + size;
    const slice = items.slice(start, end);
    return { items: slice, totalItems, page: p, pageSize: size };
  }

  // Hierarchical matching: treat cross_platform as matching any platform,
  // and global as matching any region.
  _matchesPlatform(filterPlatform, articlePlatform) {
    if (!filterPlatform) return true;
    if (!articlePlatform) return false;
    if (articlePlatform === 'cross_platform') return true;
    return filterPlatform === articlePlatform;
  }

  _matchesRegion(filterRegion, articleRegion) {
    if (!filterRegion) return true;
    if (!articleRegion) return false;
    if (articleRegion === 'global') return true;
    return filterRegion === articleRegion;
  }

  // =========================
  // Interface implementations
  // =========================

  // 1) getHomeHighlights()
  getHomeHighlights() {
    const articles = this._getFromStorage('articles', []);

    const patchNotes = articles
      .filter((a) => a.contentType === 'patch_notes')
      .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        publishDate: a.publishDate || null,
        versionLabel: a.versionLabel || '',
        platform: a.platform || null,
        platformLabel: this._mapPlatformLabel(a.platform),
        publishDateLabel: this._formatDate(a.publishDate)
      }));

    const esportsNews = articles
      .filter((a) => a.contentType === 'esports')
      .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        publishDate: a.publishDate || null,
        views: a.views || 0,
        tags: a.tags || [],
        publishDateLabel: this._formatDate(a.publishDate)
      }));

    const devBlogs = articles
      .filter((a) => a.contentType === 'dev_blog')
      .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        publishDate: a.publishDate || null,
        tags: a.tags || [],
        publishDateLabel: this._formatDate(a.publishDate)
      }));

    const guides = articles
      .filter((a) => a.contentType === 'guide')
      .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate))
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        audienceLevel: a.audienceLevel || null,
        audienceLevelLabel: this._mapAudienceLevelLabel(a.audienceLevel),
        estimatedReadingTimeMinutes: a.estimatedReadingTimeMinutes || null,
        readingTimeLabel: this._formatReadingTimeLabel(a.estimatedReadingTimeMinutes),
        averageRating: a.averageRating || 0
      }));

    return { patchNotes, esportsNews, devBlogs, guides };
  }

  // 2) getUserContentSummary()
  getUserContentSummary() {
    const state = this._getOrCreateUserState();
    const readingListCount = (state.readingListItems || []).length;
    const favoritesCount = (state.favoriteItems || []).length;
    const collectionsCount = (state.collections || []).length;

    const pref = state.newsletterPreferences;
    const newsletterSubscribed = !!(pref && pref.isSubscribed);
    const newsletterFrequencyLabel = newsletterSubscribed
      ? this._mapFrequencyLabel(pref.frequency)
      : '';

    return {
      readingListCount,
      favoritesCount,
      collectionsCount,
      newsletterSubscribed,
      newsletterFrequencyLabel
    };
  }

  // 3) getPatchNotesFilterOptions()
  getPatchNotesFilterOptions() {
    const platformOptions = [
      { value: 'pc', label: 'PC' },
      { value: 'xbox', label: 'Xbox' },
      { value: 'playstation', label: 'PlayStation' },
      { value: 'switch', label: 'Switch' },
      { value: 'cross_platform', label: 'Cross-platform' },
      { value: 'other', label: 'Other' }
    ];

    const datePresetOptions = [
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_14_days', label: 'Last 14 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'this_year', label: 'This year' },
      { value: 'all_time', label: 'All time' }
    ];

    const sortOptions = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'oldest_first', label: 'Oldest First' },
      { value: 'version_desc', label: 'Version (High to Low)' },
      { value: 'version_asc', label: 'Version (Low to High)' }
    ];

    return { platformOptions, datePresetOptions, sortOptions };
  }

  // 4) getPatchNotesList(filters, sortBy, page, pageSize)
  getPatchNotesList(filters, sortBy, page, pageSize) {
    const allArticles = this._getFromStorage('articles', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const filterObj = filters || {};

    let items = allArticles.filter((a) => a.contentType === 'patch_notes');

    if (filterObj.platform) {
      items = items.filter((a) => this._matchesPlatform(filterObj.platform, a.platform));
    }

    if (filterObj.datePreset || filterObj.dateFrom || filterObj.dateTo) {
      items = this._applyDateFilter(
        items,
        'publishDate',
        filterObj.dateFrom,
        filterObj.dateTo,
        filterObj.datePreset
      );
    }

    const s = sortBy || 'newest_first';
    items.sort((a, b) => {
      if (s === 'oldest_first') {
        return new Date(a.publishDate) - new Date(b.publishDate);
      }
      if (s === 'version_desc' || s === 'version_asc') {
        const av = [a.versionMajor || 0, a.versionMinor || 0, a.versionPatch || 0];
        const bv = [b.versionMajor || 0, b.versionMinor || 0, b.versionPatch || 0];
        for (let i = 0; i < 3; i++) {
          if (av[i] !== bv[i]) {
            return s === 'version_desc' ? bv[i] - av[i] : av[i] - bv[i];
          }
        }
        return 0;
      }
      // default newest_first
      return new Date(b.publishDate) - new Date(a.publishDate);
    });

    const paged = this._paginate(items, page, pageSize);

    const outputItems = paged.items.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      publishDate: a.publishDate || null,
      publishDateLabel: this._formatDate(a.publishDate),
      platform: a.platform || null,
      platformLabel: this._mapPlatformLabel(a.platform),
      versionLabel: a.versionLabel || '',
      versionMajor: a.versionMajor || 0,
      versionMinor: a.versionMinor || 0,
      versionPatch: a.versionPatch || 0,
      contentTypeLabel: this._mapContentTypeLabel(a.contentType),
      isInReadingList: readingListItems.some((r) => r.articleId === a.id)
    }));

    return {
      items: outputItems,
      totalItems: paged.totalItems,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 5) getEsportsFilterOptions()
  getEsportsFilterOptions() {
    const categoryOptions = [
      { value: 'tournaments', label: 'Tournaments' },
      { value: 'general', label: 'General' }
    ];

    const datePresetOptions = [
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'this_year', label: 'This year' },
      { value: 'all_time', label: 'All time' }
    ];

    const sortOptions = [
      { value: 'most_viewed', label: 'Most Viewed' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'oldest_first', label: 'Oldest First' }
    ];

    return { categoryOptions, datePresetOptions, sortOptions };
  }

  // 6) getEsportsNewsList(filters, sortBy, page, pageSize)
  getEsportsNewsList(filters, sortBy, page, pageSize) {
    const allArticles = this._getFromStorage('articles', []);
    const filterObj = filters || {};

    let items = allArticles.filter((a) => a.contentType === 'esports');

    if (filterObj.datePreset || filterObj.dateFrom || filterObj.dateTo) {
      items = this._applyDateFilter(
        items,
        'publishDate',
        filterObj.dateFrom,
        filterObj.dateTo,
        filterObj.datePreset
      );
    }

    if (filterObj.category) {
      items = items.filter((a) => a.esportsCategoryId === filterObj.category);
    }

    if (typeof filterObj.isTournamentAnnouncement === 'boolean') {
      items = items.filter((a) => !!a.isTournamentAnnouncement === filterObj.isTournamentAnnouncement);
    }

    const s = sortBy || 'most_viewed';
    items.sort((a, b) => {
      if (s === 'newest_first') {
        return new Date(b.publishDate) - new Date(a.publishDate);
      }
      if (s === 'oldest_first') {
        return new Date(a.publishDate) - new Date(b.publishDate);
      }
      // default most_viewed
      const av = a.views || 0;
      const bv = b.views || 0;
      return bv - av;
    });

    const paged = this._paginate(items, page, pageSize);

    const outputItems = paged.items.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      publishDate: a.publishDate || null,
      publishDateLabel: this._formatDate(a.publishDate),
      views: a.views || 0,
      viewsLabel: this._formatViews(a.views || 0),
      tags: a.tags || [],
      isTournamentAnnouncement: !!a.isTournamentAnnouncement,
      contentTypeLabel: this._mapContentTypeLabel(a.contentType)
    }));

    return {
      items: outputItems,
      totalItems: paged.totalItems,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 7) getDeveloperBlogFilterOptions()
  getDeveloperBlogFilterOptions() {
    const articles = this._getFromStorage('articles', []);
    const devBlogs = articles.filter((a) => a.contentType === 'dev_blog');

    const tagSet = new Set();
    devBlogs.forEach((a) => {
      (a.tags || []).forEach((t) => tagSet.add(String(t)));
    });

    const tagOptions = Array.from(tagSet).map((t) => ({
      value: t,
      label: t.charAt(0).toUpperCase() + t.slice(1)
    }));

    const datePresetOptions = [
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_6_months', label: 'Last 6 months' },
      { value: 'this_year', label: 'This year' },
      { value: 'all_time', label: 'All time' }
    ];

    const sortOptions = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'oldest_first', label: 'Oldest First' }
    ];

    return { tagOptions, datePresetOptions, sortOptions };
  }

  // 8) getDeveloperBlogPosts(filters, sortBy, page, pageSize)
  getDeveloperBlogPosts(filters, sortBy, page, pageSize) {
    const allArticles = this._getFromStorage('articles', []);
    const filterObj = filters || {};

    let items = allArticles.filter((a) => a.contentType === 'dev_blog');

    if (filterObj.tag) {
      const tag = String(filterObj.tag).toLowerCase();
      items = items.filter((a) => (a.tags || []).some((t) => String(t).toLowerCase() === tag));
    }

    if (filterObj.datePreset || filterObj.dateFrom || filterObj.dateTo) {
      items = this._applyDateFilter(
        items,
        'publishDate',
        filterObj.dateFrom,
        filterObj.dateTo,
        filterObj.datePreset
      );
    }

    const s = sortBy || 'newest_first';
    items.sort((a, b) => {
      if (s === 'oldest_first') {
        return new Date(a.publishDate) - new Date(b.publishDate);
      }
      return new Date(b.publishDate) - new Date(a.publishDate);
    });

    const paged = this._paginate(items, page, pageSize);

    const outputItems = paged.items.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      publishDate: a.publishDate || null,
      publishDateLabel: this._formatDate(a.publishDate),
      tags: a.tags || [],
      contentTypeLabel: this._mapContentTypeLabel(a.contentType)
    }));

    return {
      items: outputItems,
      totalItems: paged.totalItems,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 9) getGuidesFilterOptions()
  getGuidesFilterOptions() {
    const audienceOptions = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'new_players', label: 'New Players' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_players', label: 'All Players' }
    ];

    const articles = this._getFromStorage('articles', []);
    const guides = articles.filter((a) => a.contentType === 'guide');

    let minMinutes = null;
    let maxMinutes = null;
    guides.forEach((g) => {
      const m = g.estimatedReadingTimeMinutes;
      if (m === null || m === undefined) return;
      const val = Number(m);
      if (isNaN(val)) return;
      if (minMinutes === null || val < minMinutes) minMinutes = val;
      if (maxMinutes === null || val > maxMinutes) maxMinutes = val;
    });

    if (minMinutes === null) minMinutes = 0;
    if (maxMinutes === null) maxMinutes = 60;

    const readingTimeRange = { minMinutes, maxMinutes };

    const sortOptions = [
      { value: 'highest_rated', label: 'Highest Rated' },
      { value: 'most_helpful', label: 'Most Helpful' },
      { value: 'newest_first', label: 'Newest First' }
    ];

    return { audienceOptions, readingTimeRange, sortOptions };
  }

  // 10) getGuidesList(filters, sortBy, page, pageSize)
  getGuidesList(filters, sortBy, page, pageSize) {
    const allArticles = this._getFromStorage('articles', []);
    const filterObj = filters || {};

    let items = allArticles.filter((a) => a.contentType === 'guide');

    if (filterObj.audienceLevel) {
      const level = filterObj.audienceLevel;
      // Treat beginner and new_players as a combined beginner bucket
      if (level === 'beginner' || level === 'new_players') {
        items = items.filter(
          (a) => a.audienceLevel === 'beginner' || a.audienceLevel === 'new_players'
        );
      } else {
        items = items.filter((a) => a.audienceLevel === level);
      }
    }

    if (
      typeof filterObj.minReadingTimeMinutes === 'number' ||
      typeof filterObj.maxReadingTimeMinutes === 'number'
    ) {
      const min =
        typeof filterObj.minReadingTimeMinutes === 'number'
          ? filterObj.minReadingTimeMinutes
          : 0;
      const max =
        typeof filterObj.maxReadingTimeMinutes === 'number'
          ? filterObj.maxReadingTimeMinutes
          : Number.MAX_SAFE_INTEGER;
      items = items.filter((a) => {
        const m = a.estimatedReadingTimeMinutes;
        if (m === null || m === undefined) return false;
        const val = Number(m) || 0;
        return val >= min && val <= max;
      });
    }

    const s = sortBy || 'highest_rated';
    items.sort((a, b) => {
      if (s === 'newest_first') {
        return new Date(b.publishDate) - new Date(a.publishDate);
      }
      if (s === 'most_helpful') {
        const ar = a.ratingCount || 0;
        const br = b.ratingCount || 0;
        if (br !== ar) return br - ar;
        const aa = a.averageRating || 0;
        const ba = b.averageRating || 0;
        return ba - aa;
      }
      // default highest_rated
      const aa = a.averageRating || 0;
      const ba = b.averageRating || 0;
      if (ba !== aa) return ba - aa;
      const ar = a.ratingCount || 0;
      const br = b.ratingCount || 0;
      return br - ar;
    });

    const paged = this._paginate(items, page, pageSize);

    const outputItems = paged.items.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      audienceLevel: a.audienceLevel || null,
      audienceLevelLabel: this._mapAudienceLevelLabel(a.audienceLevel),
      estimatedReadingTimeMinutes: a.estimatedReadingTimeMinutes || null,
      readingTimeLabel: this._formatReadingTimeLabel(a.estimatedReadingTimeMinutes),
      averageRating: a.averageRating || 0,
      ratingCount: a.ratingCount || 0,
      contentTypeLabel: this._mapContentTypeLabel(a.contentType)
    }));

    return {
      items: outputItems,
      totalItems: paged.totalItems,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 11) getSearchFilterOptions()
  getSearchFilterOptions() {
    const contentTypeOptions = [
      { value: 'patch_notes', label: 'Patch Notes' },
      { value: 'esports', label: 'Esports' },
      { value: 'dev_blog', label: 'Developer Blog' },
      { value: 'guide', label: 'Guide' },
      { value: 'update_announcement', label: 'Update Announcement' },
      { value: 'server_status', label: 'Server Status' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'community_story', label: 'Community Story' },
      { value: 'promotion', label: 'Promotion' },
      { value: 'other', label: 'Other' }
    ];

    const regionOptions = [
      { value: 'europe', label: 'Europe' },
      { value: 'north_america', label: 'North America' },
      { value: 'asia', label: 'Asia' },
      { value: 'south_america', label: 'South America' },
      { value: 'oceania', label: 'Oceania' },
      { value: 'global', label: 'Global' },
      { value: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'oldest_first', label: 'Oldest First' },
      { value: 'most_viewed', label: 'Most Viewed' }
    ];

    return { contentTypeOptions, regionOptions, sortOptions };
  }

  // 12) searchArticles(query, filters, sortBy, page, pageSize)
  searchArticles(query, filters, sortBy, page, pageSize) {
    const allArticles = this._getFromStorage('articles', []);
    const q = (query || '').trim().toLowerCase();
    const filterObj = filters || {};

    let items = allArticles.slice();

    if (q) {
      items = items.filter((a) => {
        const inTitle = (a.title || '').toLowerCase().includes(q);
        const inSummary = (a.summary || '').toLowerCase().includes(q);
        const inTags = (a.tags || [])
          .map((t) => String(t).toLowerCase())
          .some((t) => t.includes(q));
        return inTitle || inSummary || inTags;
      });
    }

    if (filterObj.contentTypes && Array.isArray(filterObj.contentTypes) && filterObj.contentTypes.length) {
      const set = new Set(filterObj.contentTypes);
      items = items.filter((a) => set.has(a.contentType));
    }

    if (filterObj.region) {
      items = items.filter((a) => this._matchesRegion(filterObj.region, a.region));
    }

    if (filterObj.datePreset || filterObj.dateFrom || filterObj.dateTo) {
      items = this._applyDateFilter(
        items,
        'publishDate',
        filterObj.dateFrom,
        filterObj.dateTo,
        filterObj.datePreset
      );
    }

    const s = sortBy || 'relevance';
    items.sort((a, b) => {
      if (s === 'newest_first') {
        return new Date(b.publishDate) - new Date(a.publishDate);
      }
      if (s === 'oldest_first') {
        return new Date(a.publishDate) - new Date(b.publishDate);
      }
      if (s === 'most_viewed') {
        const av = a.views || 0;
        const bv = b.views || 0;
        return bv - av;
      }
      // relevance: heuristic - newer and with more views
      const ad = new Date(a.publishDate).getTime() || 0;
      const bd = new Date(b.publishDate).getTime() || 0;
      const av = a.views || 0;
      const bv = b.views || 0;
      const aScore = ad + av * 1000;
      const bScore = bd + bv * 1000;
      return bScore - aScore;
    });

    const paged = this._paginate(items, page, pageSize);

    const outputItems = paged.items.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      contentType: a.contentType,
      contentTypeLabel: this._mapContentTypeLabel(a.contentType),
      publishDate: a.publishDate || null,
      publishDateLabel: this._formatDate(a.publishDate),
      region: a.region || null,
      regionLabel: this._mapRegionLabel(a.region),
      platform: a.platform || null,
      platformLabel: this._mapPlatformLabel(a.platform),
      versionLabel: a.versionLabel || '',
      views: a.views || 0
    }));

    return {
      items: outputItems,
      totalItems: paged.totalItems,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 13) getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const allArticles = this._getFromStorage('articles', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const favoriteItems = this._getFromStorage('favorite_items', []);
    const collections = this._getFromStorage('collections', []);
    const collectionItems = this._getFromStorage('collection_items', []);

    const article = allArticles.find((a) => a.id === articleId) || null;

    if (!article) {
      return {
        article: null,
        isInReadingList: false,
        isFavorite: false,
        collections: []
      };
    }

    const isInReadingList = readingListItems.some((r) => r.articleId === articleId);
    const isFavorite = favoriteItems.some((f) => f.articleId === articleId);

    const relatedCollectionIds = collectionItems
      .filter((ci) => ci.articleId === articleId)
      .map((ci) => ci.collectionId);

    const uniqueCollectionIds = Array.from(new Set(relatedCollectionIds));

    const relatedCollections = uniqueCollectionIds
      .map((cid) => collections.find((c) => c.id === cid))
      .filter((c) => !!c)
      .map((c) => ({ collectionId: c.id, collectionName: c.name }));

    const articleOut = {
      id: article.id,
      title: article.title,
      body: article.body || '',
      summary: article.summary || '',
      contentType: article.contentType,
      contentTypeLabel: this._mapContentTypeLabel(article.contentType),
      publishDate: article.publishDate || null,
      publishDateLabel: this._formatDate(article.publishDate),
      lastUpdatedAt: article.lastUpdatedAt || null,
      platform: article.platform || null,
      platformLabel: this._mapPlatformLabel(article.platform),
      region: article.region || null,
      regionLabel: this._mapRegionLabel(article.region),
      tags: article.tags || [],
      estimatedReadingTimeMinutes: article.estimatedReadingTimeMinutes || null,
      readingTimeLabel: this._formatReadingTimeLabel(article.estimatedReadingTimeMinutes),
      versionLabel: article.versionLabel || '',
      versionMajor: article.versionMajor || 0,
      versionMinor: article.versionMinor || 0,
      versionPatch: article.versionPatch || 0,
      views: article.views || 0,
      commentCount: article.commentCount || 0
    };

    return {
      article: articleOut,
      isInReadingList,
      isFavorite,
      collections: relatedCollections
    };
  }

  // 14) getArticleComments(articleId, page, pageSize)
  getArticleComments(articleId, page, pageSize) {
    const commentsAll = this._getFromStorage('article_comments', []);
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    let comments = commentsAll.filter(
      (c) => c.articleId === articleId && !c.isDeleted
    );

    comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const paged = this._paginate(comments, page, pageSize);

    // Foreign key resolution: include article object with each comment
    const outputComments = paged.items.map((c) => ({
      ...c,
      article: article
    }));

    return {
      comments: outputComments,
      totalItems: paged.totalItems,
      page: paged.page,
      pageSize: paged.pageSize
    };
  }

  // 15) postArticleComment(articleId, content)
  postArticleComment(articleId, content) {
    const trimmed = (content || '').trim();
    if (!trimmed) {
      return {
        success: false,
        comment: null,
        message: 'Comment content is required.'
      };
    }

    const comments = this._getFromStorage('article_comments', []);
    const articles = this._getFromStorage('articles', []);

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        success: false,
        comment: null,
        message: 'Article not found.'
      };
    }

    const nowIso = new Date().toISOString();
    const newComment = {
      id: this._generateId('comment'),
      articleId,
      content: trimmed,
      createdAt: nowIso,
      authorDisplayName: null,
      isDeleted: false
    };

    comments.push(newComment);
    this._saveToStorage('article_comments', comments);

    // Update article.commentCount
    article.commentCount = (article.commentCount || 0) + 1;
    this._saveToStorage('articles', articles);

    return {
      success: true,
      comment: newComment,
      message: 'Comment posted.'
    };
  }

  // 16) setArticleReadingListStatus(articleId, inReadingList)
  setArticleReadingListStatus(articleId, inReadingList) {
    const articles = this._getFromStorage('articles', []);
    const articleExists = articles.some((a) => a.id === articleId);
    if (!articleExists) {
      return {
        inReadingList: false,
        message: 'Article not found.'
      };
    }

    const state = this._getOrCreateUserState();
    let readingListItems = state.readingListItems || [];

    if (inReadingList) {
      if (!readingListItems.some((r) => r.articleId === articleId)) {
        const nowIso = new Date().toISOString();
        readingListItems.push({
          id: this._generateId('readinglist'),
          articleId,
          addedAt: nowIso,
          sortOrder: Date.now()
        });
      }
    } else {
      readingListItems = readingListItems.filter((r) => r.articleId !== articleId);
    }

    state.readingListItems = readingListItems;
    this._persistUserState(state);

    return {
      inReadingList: !!inReadingList,
      message: inReadingList ? 'Added to Reading List.' : 'Removed from Reading List.'
    };
  }

  // 17) getReadingListItems(sortBy, contentTypeFilter)
  getReadingListItems(sortBy, contentTypeFilter) {
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    let joined = readingListItems
      .map((r) => {
        const article = articles.find((a) => a.id === r.articleId) || null;
        return { readingListItem: r, article };
      })
      .filter((x) => x.article !== null);

    if (contentTypeFilter) {
      joined = joined.filter((x) => x.article.contentType === contentTypeFilter);
    }

    const s = sortBy || 'date_added_newest';
    joined.sort((a, b) => {
      if (s === 'date_added_oldest') {
        return new Date(a.readingListItem.addedAt) - new Date(b.readingListItem.addedAt);
      }
      if (s === 'content_type') {
        if (a.article.contentType < b.article.contentType) return -1;
        if (a.article.contentType > b.article.contentType) return 1;
        return 0;
      }
      // default date_added_newest
      return new Date(b.readingListItem.addedAt) - new Date(a.readingListItem.addedAt);
    });

    const items = joined.map(({ readingListItem, article }) => ({
      readingListItem,
      article: {
        id: article.id,
        title: article.title,
        summary: article.summary || '',
        contentType: article.contentType,
        contentTypeLabel: this._mapContentTypeLabel(article.contentType),
        publishDate: article.publishDate || null,
        publishDateLabel: this._formatDate(article.publishDate)
      }
    }));

    return {
      items,
      totalItems: items.length
    };
  }

  // 18) setArticleFavoriteStatus(articleId, isFavorite)
  setArticleFavoriteStatus(articleId, isFavorite) {
    const articles = this._getFromStorage('articles', []);
    const articleExists = articles.some((a) => a.id === articleId);
    if (!articleExists) {
      return {
        isFavorite: false,
        message: 'Article not found.'
      };
    }

    const state = this._getOrCreateUserState();
    let favoriteItems = state.favoriteItems || [];

    if (isFavorite) {
      if (!favoriteItems.some((f) => f.articleId === articleId)) {
        const nowIso = new Date().toISOString();
        favoriteItems.push({
          id: this._generateId('favorite'),
          articleId,
          addedAt: nowIso
        });
      }
    } else {
      favoriteItems = favoriteItems.filter((f) => f.articleId !== articleId);
    }

    state.favoriteItems = favoriteItems;
    this._persistUserState(state);

    return {
      isFavorite: !!isFavorite,
      message: isFavorite ? 'Added to Favorites.' : 'Removed from Favorites.'
    };
  }

  // 19) getFavoriteItems(sortBy, contentTypeFilter)
  getFavoriteItems(sortBy, contentTypeFilter) {
    const favoriteItems = this._getFromStorage('favorite_items', []);
    const articles = this._getFromStorage('articles', []);

    let joined = favoriteItems
      .map((f) => {
        const article = articles.find((a) => a.id === f.articleId) || null;
        return { favoriteItem: f, article };
      })
      .filter((x) => x.article !== null);

    if (contentTypeFilter) {
      joined = joined.filter((x) => x.article.contentType === contentTypeFilter);
    }

    const s = sortBy || 'date_favorited_newest';
    joined.sort((a, b) => {
      if (s === 'content_type') {
        if (a.article.contentType < b.article.contentType) return -1;
        if (a.article.contentType > b.article.contentType) return 1;
        return 0;
      }
      // default date_favorited_newest
      return new Date(b.favoriteItem.addedAt) - new Date(a.favoriteItem.addedAt);
    });

    const items = joined.map(({ favoriteItem, article }) => ({
      favoriteItem,
      article: {
        id: article.id,
        title: article.title,
        summary: article.summary || '',
        contentType: article.contentType,
        contentTypeLabel: this._mapContentTypeLabel(article.contentType),
        publishDate: article.publishDate || null,
        publishDateLabel: this._formatDate(article.publishDate)
      }
    }));

    return {
      items,
      totalItems: items.length
    };
  }

  // 20) createCollection(name, description)
  createCollection(name, description) {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return {
        collection: null,
        message: 'Collection name is required.'
      };
    }

    const collections = this._getFromStorage('collections', []);
    const nowIso = new Date().toISOString();

    const collection = {
      id: this._generateId('collection'),
      name: trimmedName,
      description: description || '',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    collections.push(collection);
    this._saveToStorage('collections', collections);

    return {
      collection,
      message: 'Collection created.'
    };
  }

  // Helper for adding an article to a collection entity directly
  _addArticleToCollectionInternal(articleId, collectionId) {
    const articles = this._getFromStorage('articles', []);
    const collections = this._getFromStorage('collections', []);
    const collectionItems = this._getFromStorage('collection_items', []);

    const article = articles.find((a) => a.id === articleId) || null;
    const collection = collections.find((c) => c.id === collectionId) || null;

    if (!article || !collection) {
      return {
        success: false,
        message: 'Article or collection not found.',
        collectionItem: null
      };
    }

    let existing = collectionItems.find(
      (ci) => ci.articleId === articleId && ci.collectionId === collectionId
    );

    if (!existing) {
      existing = {
        id: this._generateId('collectionitem'),
        collectionId,
        articleId,
        addedAt: new Date().toISOString(),
        sortOrder: Date.now()
      };
      collectionItems.push(existing);
      this._saveToStorage('collection_items', collectionItems);
    }

    return {
      success: true,
      message: 'Article added to collection.',
      collectionItem: existing
    };
  }

  // 21) createCollectionAndAddArticle(articleId, name, description)
  createCollectionAndAddArticle(articleId, name, description) {
    const collectionResult = this.createCollection(name, description);
    if (!collectionResult.collection) {
      return {
        collection: null,
        collectionItem: null,
        message: collectionResult.message
      };
    }

    const addResult = this._addArticleToCollectionInternal(
      articleId,
      collectionResult.collection.id
    );

    return {
      collection: collectionResult.collection,
      collectionItem: addResult.collectionItem,
      message: addResult.message
    };
  }

  // 22) addArticleToCollection(articleId, collectionId)
  addArticleToCollection(articleId, collectionId) {
    const res = this._addArticleToCollectionInternal(articleId, collectionId);
    return {
      collectionItem: res.collectionItem,
      message: res.message
    };
  }

  // 23) removeArticleFromCollection(collectionId, articleId)
  removeArticleFromCollection(collectionId, articleId) {
    const collectionItems = this._getFromStorage('collection_items', []);
    const before = collectionItems.length;

    const filtered = collectionItems.filter(
      (ci) => !(ci.collectionId === collectionId && ci.articleId === articleId)
    );

    const removed = before !== filtered.length;
    this._saveToStorage('collection_items', filtered);

    return {
      success: removed,
      message: removed ? 'Removed from collection.' : 'Item not found in collection.'
    };
  }

  // 24) getCollectionsOverview()
  getCollectionsOverview() {
    const collections = this._getFromStorage('collections', []);
    const collectionItems = this._getFromStorage('collection_items', []);

    const counts = {};
    collectionItems.forEach((ci) => {
      counts[ci.collectionId] = (counts[ci.collectionId] || 0) + 1;
    });

    const overview = collections.map((c) => ({
      collection: c,
      itemCount: counts[c.id] || 0
    }));

    return { collections: overview };
  }

  // 25) getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections', []);
    const collectionItems = this._getFromStorage('collection_items', []);
    const articles = this._getFromStorage('articles', []);

    const collection = collections.find((c) => c.id === collectionId) || null;

    const itemsJoined = collectionItems
      .filter((ci) => ci.collectionId === collectionId)
      .map((ci) => {
        const article = articles.find((a) => a.id === ci.articleId) || null;
        return { collectionItem: ci, article };
      })
      .filter((x) => x.article !== null)
      .map(({ collectionItem, article }) => ({
        collectionItem,
        article: {
          id: article.id,
          title: article.title,
          summary: article.summary || '',
          contentType: article.contentType,
          contentTypeLabel: this._mapContentTypeLabel(article.contentType),
          publishDate: article.publishDate || null,
          publishDateLabel: this._formatDate(article.publishDate)
        }
      }));

    return {
      collection,
      items: itemsJoined,
      itemCount: itemsJoined.length
    };
  }

  // 26) updateCollection(collectionId, name, description)
  updateCollection(collectionId, name, description) {
    const collections = this._getFromStorage('collections', []);
    const collection = collections.find((c) => c.id === collectionId) || null;

    if (!collection) {
      return {
        collection: null,
        message: 'Collection not found.'
      };
    }

    if (typeof name === 'string' && name.trim()) {
      collection.name = name.trim();
    }

    if (typeof description === 'string') {
      collection.description = description;
    }

    collection.updatedAt = new Date().toISOString();
    this._saveToStorage('collections', collections);

    return {
      collection,
      message: 'Collection updated.'
    };
  }

  // 27) deleteCollection(collectionId)
  deleteCollection(collectionId) {
    const collections = this._getFromStorage('collections', []);
    const collectionItems = this._getFromStorage('collection_items', []);

    const before = collections.length;
    const newCollections = collections.filter((c) => c.id !== collectionId);

    if (before === newCollections.length) {
      return {
        success: false,
        message: 'Collection not found.'
      };
    }

    const newItems = collectionItems.filter((ci) => ci.collectionId !== collectionId);

    this._saveToStorage('collections', newCollections);
    this._saveToStorage('collection_items', newItems);

    return {
      success: true,
      message: 'Collection deleted.'
    };
  }

  // 28) getNewsletterPreferences()
  getNewsletterPreferences() {
    const list = this._getFromStorage('newsletter_preferences', []);
    const preferences = list[0] || null;
    return { preferences };
  }

  // 29) updateNewsletterPreferences(email, frequency, topics, region, isSubscribed)
  updateNewsletterPreferences(email, frequency, topics, region, isSubscribed) {
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      return {
        preferences: null,
        message: 'Email is required.'
      };
    }

    if (!frequency || !['daily', 'weekly', 'monthly'].includes(frequency)) {
      return {
        preferences: null,
        message: 'Invalid frequency.'
      };
    }

    const list = this._getFromStorage('newsletter_preferences', []);
    let pref = list[0] || null;

    const nowIso = new Date().toISOString();

    if (!pref) {
      pref = {
        id: this._generateId('newsletterpref'),
        email: trimmedEmail,
        frequency,
        topicPatchNotesEnabled: false,
        topicEsportsEnabled: false,
        topicPromotionsEnabled: false,
        topicCommunityStoriesEnabled: false,
        topicGuidesEnabled: false,
        topicDevBlogEnabled: false,
        topicServerStatusEnabled: false,
        topicMaintenanceEnabled: false,
        region: region || null,
        isSubscribed: !!isSubscribed,
        createdAt: nowIso,
        updatedAt: nowIso
      };
    } else {
      pref.email = trimmedEmail;
      pref.frequency = frequency;
      pref.region = region || pref.region || null;
      pref.isSubscribed = !!isSubscribed;
      pref.updatedAt = nowIso;
    }

    const t = topics || {};

    if (typeof t.patchNotes === 'boolean') pref.topicPatchNotesEnabled = t.patchNotes;
    if (typeof t.esports === 'boolean') pref.topicEsportsEnabled = t.esports;
    if (typeof t.promotions === 'boolean') pref.topicPromotionsEnabled = t.promotions;
    if (typeof t.communityStories === 'boolean')
      pref.topicCommunityStoriesEnabled = t.communityStories;
    if (typeof t.guides === 'boolean') pref.topicGuidesEnabled = t.guides;
    if (typeof t.devBlog === 'boolean') pref.topicDevBlogEnabled = t.devBlog;
    if (typeof t.serverStatus === 'boolean')
      pref.topicServerStatusEnabled = t.serverStatus;
    if (typeof t.maintenance === 'boolean') pref.topicMaintenanceEnabled = t.maintenance;

    this._saveToStorage('newsletter_preferences', [pref]);

    return {
      preferences: pref,
      message: 'Newsletter preferences updated.'
    };
  }

  // 30) getNotificationSettings()
  getNotificationSettings() {
    const list = this._getFromStorage('notification_settings', []);
    const settings = list[0] || null;
    return { settings };
  }

  // 31) updateNotificationSettings(categories, delivery, quietHours)
  updateNotificationSettings(categories, delivery, quietHours) {
    const list = this._getFromStorage('notification_settings', []);
    let settings = list[0] || null;

    const nowIso = new Date().toISOString();

    if (!settings) {
      settings = {
        id: this._generateId('notifsettings'),
        categoryServerStatusEnabled: false,
        categoryMaintenanceEnabled: false,
        categoryPromotionalOffersEnabled: false,
        categoryEsportsNewsEnabled: false,
        categoryPatchNotesEnabled: false,
        categoryCommunityStoriesEnabled: false,
        categoryGuidesEnabled: false,
        deliveryInSiteEnabled: true,
        deliveryEmailEnabled: false,
        deliveryMobilePushEnabled: false,
        quietHoursEnabled: false,
        quietHoursStartTime: null,
        quietHoursEndTime: null,
        updatedAt: nowIso
      };
    }

    const c = categories || {};
    if (typeof c.serverStatusEnabled === 'boolean')
      settings.categoryServerStatusEnabled = c.serverStatusEnabled;
    if (typeof c.maintenanceEnabled === 'boolean')
      settings.categoryMaintenanceEnabled = c.maintenanceEnabled;
    if (typeof c.promotionalOffersEnabled === 'boolean')
      settings.categoryPromotionalOffersEnabled = c.promotionalOffersEnabled;
    if (typeof c.esportsNewsEnabled === 'boolean')
      settings.categoryEsportsNewsEnabled = c.esportsNewsEnabled;
    if (typeof c.patchNotesEnabled === 'boolean')
      settings.categoryPatchNotesEnabled = c.patchNotesEnabled;
    if (typeof c.communityStoriesEnabled === 'boolean')
      settings.categoryCommunityStoriesEnabled = c.communityStoriesEnabled;
    if (typeof c.guidesEnabled === 'boolean')
      settings.categoryGuidesEnabled = c.guidesEnabled;

    const d = delivery || {};
    if (typeof d.inSiteEnabled === 'boolean') settings.deliveryInSiteEnabled = d.inSiteEnabled;
    if (typeof d.emailEnabled === 'boolean') settings.deliveryEmailEnabled = d.emailEnabled;
    if (typeof d.mobilePushEnabled === 'boolean')
      settings.deliveryMobilePushEnabled = d.mobilePushEnabled;

    const q = quietHours || {};
    if (typeof q.enabled === 'boolean') settings.quietHoursEnabled = q.enabled;
    if (typeof q.startTime === 'string') settings.quietHoursStartTime = q.startTime;
    if (typeof q.endTime === 'string') settings.quietHoursEndTime = q.endTime;

    settings.updatedAt = nowIso;

    this._saveToStorage('notification_settings', [settings]);

    return {
      settings,
      message: 'Notification settings updated.'
    };
  }

  // 32) getInformationalPage(pageKey)
  getInformationalPage(pageKey) {
    const pages = this._getFromStorage('informational_pages', []);
    const entry = pages.find((p) => p.pageKey === pageKey) || null;

    if (!entry) {
      return {
        title: '',
        bodyHtml: '',
        lastUpdated: null
      };
    }

    return {
      title: entry.title || '',
      bodyHtml: entry.bodyHtml || '',
      lastUpdated: entry.lastUpdated || null
    };
  }

  // 33) getSupportPageData()
  getSupportPageData() {
    const data = this._getFromStorage('support_page_data', {
      faqs: [],
      troubleshootingSections: [],
      contactOptions: []
    });

    return {
      faqs: data.faqs || [],
      troubleshootingSections: data.troubleshootingSections || [],
      contactOptions: data.contactOptions || []
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
