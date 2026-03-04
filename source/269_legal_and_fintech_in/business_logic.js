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
    const keys = [
      'articles',
      'topics',
      'segments',
      'segment_subcategories',
      'tags',
      'comments',
      'reading_lists',
      'reading_list_items',
      'reading_queues',
      'reading_queue_items',
      'regulation_entries',
      'newsletter_subscriptions',
      'glossary_terms',
      'study_lists',
      'study_list_items',
      'comparisons',
      'events',
      'event_registrations',
      'contact_messages',
      'static_pages'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        // static_pages is an object map, others are arrays
        const initial = key === 'static_pages' ? {} : [];
        localStorage.setItem(key, JSON.stringify(initial));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('current_comparison_id')) {
      localStorage.setItem('current_comparison_id', '');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
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
    const currentRaw = localStorage.getItem('idCounter') || '1000';
    const current = parseInt(currentRaw, 10) || 1000;
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

  _toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // ----------------------
  // Label helpers
  // ----------------------

  _getRegionLabel(region) {
    const map = {
      european_union: 'European Union (EU)',
      united_states: 'United States (US)',
      united_kingdom: 'United Kingdom (UK)',
      global: 'Global',
      other: 'Other'
    };
    return map[region] || '';
  }

  _getJurisdictionLabel(jurisdiction) {
    const map = {
      european_union: 'European Union (EU)',
      united_states: 'United States (US)',
      united_kingdom: 'United Kingdom (UK)',
      global: 'Global',
      other: 'Other'
    };
    return map[jurisdiction] || '';
  }

  _getContentTypeLabel(contentType) {
    const map = {
      article: 'Article',
      guide: 'Guide',
      checklist: 'Checklist'
    };
    return map[contentType] || '';
  }

  _getLevelLabel(level) {
    const map = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      all_levels: 'All levels'
    };
    return map[level] || '';
  }

  _getReadingTimeLabel(minutes) {
    if (typeof minutes !== 'number' || isNaN(minutes)) return '';
    return minutes + ' min read';
  }

  _getYearLabel(year) {
    if (!year) return '';
    return String(year);
  }

  _getRegulationStatusLabel(status) {
    const map = {
      draft: 'Draft',
      proposed: 'Proposed',
      in_force: 'In force',
      repealed: 'Repealed',
      other: 'Other'
    };
    return map[status] || '';
  }

  _getImpactScoreLabel(score) {
    if (typeof score !== 'number' || isNaN(score)) return '';
    return 'Impact score: ' + score;
  }

  _getEventFormatLabel(format) {
    const map = {
      live_webinar: 'Live webinar',
      on_demand_webinar: 'On-demand webinar',
      in_person: 'In-person',
      virtual_conference: 'Virtual conference'
    };
    return map[format] || '';
  }

  _formatEventDateTime(start, end) {
    const startDate = this._toDate(start);
    if (!startDate) return '';
    const endDate = this._toDate(end);

    const optionsDate = { year: 'numeric', month: 'short', day: 'numeric' };
    const optionsTime = { hour: '2-digit', minute: '2-digit' };

    const datePart = startDate.toLocaleDateString(undefined, optionsDate);
    const timePart = startDate.toLocaleTimeString(undefined, optionsTime);

    if (endDate) {
      const endTimePart = endDate.toLocaleTimeString(undefined, optionsTime);
      return datePart + ' ' + timePart + ' - ' + endTimePart;
    }
    return datePart + ' ' + timePart;
  }

  _getNewsletterDigestTypeLabel(value) {
    const map = {
      legal_fintech_weekly_digest: 'Legal & Fintech Weekly Digest',
      regulation_tracker_updates: 'Regulation Tracker Updates',
      events_roundup: 'Events Roundup'
    };
    return map[value] || '';
  }

  _getNewsletterTopicLabel(value) {
    const map = {
      fintech: 'Fintech',
      data_privacy: 'Data privacy',
      crypto: 'Crypto',
      regulation: 'Regulation',
      compliance: 'Compliance'
    };
    return map[value] || '';
  }

  _getFrequencyLabel(value) {
    const map = {
      weekly: 'Weekly',
      monthly: 'Monthly',
      daily: 'Daily'
    };
    return map[value] || '';
  }

  _getJobRoleLabel(value) {
    const map = {
      product_manager: 'Product Manager',
      legal_counsel: 'Legal counsel',
      compliance_officer: 'Compliance officer',
      engineer: 'Engineer',
      other: 'Other'
    };
    return map[value] || '';
  }

  _getGlossaryCategoryLabel(value) {
    const map = {
      compliance: 'Compliance',
      legal: 'Legal',
      fintech: 'Fintech',
      data_privacy: 'Data privacy',
      other: 'Other'
    };
    return map[value] || '';
  }

  // ----------------------
  // Internal entity helpers
  // ----------------------

  _getOrCreateReadingList() {
    const lists = this._getFromStorage('reading_lists', []);
    let readingList;
    if (lists.length === 0) {
      readingList = {
        id: this._generateId('reading_list'),
        name: 'Reading list',
        itemIds: [],
        createdAt: this._nowISO()
      };
      lists.push(readingList);
      this._saveToStorage('reading_lists', lists);
    } else {
      readingList = lists[0];
      if (!Array.isArray(readingList.itemIds)) {
        readingList.itemIds = [];
        this._saveToStorage('reading_lists', lists);
      }
    }
    return { readingList, lists };
  }

  _getOrCreateReadingQueue() {
    const queues = this._getFromStorage('reading_queues', []);
    let readingQueue;
    if (queues.length === 0) {
      readingQueue = {
        id: this._generateId('reading_queue'),
        name: 'Reading queue',
        itemIds: [],
        createdAt: this._nowISO()
      };
      queues.push(readingQueue);
      this._saveToStorage('reading_queues', queues);
    } else {
      readingQueue = queues[0];
      if (!Array.isArray(readingQueue.itemIds)) {
        readingQueue.itemIds = [];
        this._saveToStorage('reading_queues', queues);
      }
    }
    return { readingQueue, queues };
  }

  _getOrCreateStudyList() {
    const lists = this._getFromStorage('study_lists', []);
    let studyList;
    if (lists.length === 0) {
      studyList = {
        id: this._generateId('study_list'),
        itemIds: [],
        createdAt: this._nowISO()
      };
      lists.push(studyList);
      this._saveToStorage('study_lists', lists);
    } else {
      studyList = lists[0];
      if (!Array.isArray(studyList.itemIds)) {
        studyList.itemIds = [];
        this._saveToStorage('study_lists', lists);
      }
    }
    return { studyList, lists };
  }

  _getOrCreateCurrentComparison() {
    const comparisons = this._getFromStorage('comparisons', []);
    let currentId = localStorage.getItem('current_comparison_id') || '';
    let comparison = comparisons.find(c => c.id === currentId);

    if (!comparison) {
      comparison = {
        id: this._generateId('comparison'),
        name: null,
        articleIds: [],
        isSaved: false,
        createdAt: this._nowISO()
      };
      comparisons.push(comparison);
      this._saveToStorage('comparisons', comparisons);
      localStorage.setItem('current_comparison_id', comparison.id);
    }

    if (!Array.isArray(comparison.articleIds)) {
      comparison.articleIds = [];
      this._saveToStorage('comparisons', comparisons);
    }

    return { comparison, comparisons };
  }

  // Apply filters and sorting to article collections
  _applyArticleFiltersAndSort(articles, filters, sort) {
    filters = filters || {};
    sort = sort || {};

    let result = articles.slice();

    result = result.filter(a => {
      if (filters.region && a.region && a.region !== filters.region) return false;
      if (filters.region && !a.region) return false;

      if (filters.jurisdiction && a.jurisdiction && a.jurisdiction !== filters.jurisdiction) return false;
      if (filters.jurisdiction && !a.jurisdiction) return false;

      if (filters.year) {
        const articleYear = a.year || (this._toDate(a.publishedAt) ? this._toDate(a.publishedAt).getFullYear() : null);
        if (articleYear !== filters.year) return false;
      }

      if (filters.contentTypes && Array.isArray(filters.contentTypes) && filters.contentTypes.length > 0) {
        if (!filters.contentTypes.includes(a.contentType)) return false;
      }

      if (filters.contentType && a.contentType !== filters.contentType) return false;

      if (filters.level && a.level && a.level !== filters.level) return false;
      if (filters.level && !a.level) return false;

      if (typeof filters.readingTimeMax === 'number') {
        if (typeof a.readingTimeMinutes === 'number') {
          if (a.readingTimeMinutes > filters.readingTimeMax) return false;
        } else {
          return false;
        }
      }

      if (filters.topicIds && Array.isArray(filters.topicIds) && filters.topicIds.length > 0) {
        const articleTopicIds = Array.isArray(a.topicIds) ? a.topicIds : [];
        const has = articleTopicIds.some(id => filters.topicIds.indexOf(id) !== -1);
        if (!has) return false;
      }

      if (filters.segmentIds && Array.isArray(filters.segmentIds) && filters.segmentIds.length > 0) {
        const articleSegmentIds = Array.isArray(a.segmentIds) ? a.segmentIds : [];
        const has = articleSegmentIds.some(id => filters.segmentIds.indexOf(id) !== -1);
        if (!has) return false;
      }

      if (filters.tagIds && Array.isArray(filters.tagIds) && filters.tagIds.length > 0) {
        const articleTagIds = Array.isArray(a.tagIds) ? a.tagIds : [];
        const has = articleTagIds.some(id => filters.tagIds.indexOf(id) !== -1);
        if (!has) return false;
      }

      if (filters.segmentSubcategoryId) {
        const subIds = Array.isArray(a.segmentSubcategoryIds) ? a.segmentSubcategoryIds : [];
        if (!subIds.includes(filters.segmentSubcategoryId)) return false;
      }

      return true;
    });

    const sortBy = sort.sortBy || 'relevance';
    result.sort((a, b) => {
      const dateA = this._toDate(a.publishedAt);
      const dateB = this._toDate(b.publishedAt);
      const popA = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
      const popB = typeof b.popularityScore === 'number' ? b.popularityScore : 0;

      if (sortBy === 'newest_first' || sortBy === 'relevance') {
        if (dateA && dateB) return dateB - dateA;
        if (dateA) return -1;
        if (dateB) return 1;
        return 0;
      }

      if (sortBy === 'oldest_first') {
        if (dateA && dateB) return dateA - dateB;
        if (dateA) return 1;
        if (dateB) return -1;
        return 0;
      }

      if (sortBy === 'most_popular') {
        if (popA !== popB) return popB - popA;
        if (dateA && dateB) return dateB - dateA;
        return 0;
      }

      return 0;
    });

    return result;
  }

  _applyRegulationFiltersAndSort(entries, filters, sort) {
    filters = filters || {};
    sort = sort || {};

    let result = entries.slice();

    result = result.filter(e => {
      if (filters.jurisdiction && e.jurisdiction !== filters.jurisdiction) return false;
      if (filters.topicId && e.topicId !== filters.topicId) return false;
      if (filters.status && e.status && e.status !== filters.status) return false;
      if (filters.status && !e.status) return false;

      const pubDate = this._toDate(e.publishedDate);
      if (filters.startDate) {
        const start = this._toDate(filters.startDate);
        if (start && pubDate && pubDate < start) return false;
      }
      if (filters.endDate) {
        const end = this._toDate(filters.endDate);
        if (end && pubDate && pubDate > end) return false;
      }
      return true;
    });

    const sortBy = sort.sortBy || 'impact_score_high_to_low';
    result.sort((a, b) => {
      const scoreA = typeof a.impactScore === 'number' ? a.impactScore : 0;
      const scoreB = typeof b.impactScore === 'number' ? b.impactScore : 0;
      const dateA = this._toDate(a.publishedDate);
      const dateB = this._toDate(b.publishedDate);

      if (sortBy === 'impact_score_high_to_low') {
        if (scoreA !== scoreB) return scoreB - scoreA;
        if (dateA && dateB) return dateB - dateA;
        return 0;
      }
      if (sortBy === 'impact_score_low_to_high') {
        if (scoreA !== scoreB) return scoreA - scoreB;
        if (dateA && dateB) return dateB - dateA;
        return 0;
      }
      if (sortBy === 'date_desc') {
        if (dateA && dateB) return dateB - dateA;
        if (dateA) return 1;
        if (dateB) return -1;
        return 0;
      }
      if (sortBy === 'date_asc') {
        if (dateA && dateB) return dateA - dateB;
        if (dateA) return -1;
        if (dateB) return 1;
        return 0;
      }
      return 0;
    });

    return result;
  }

  _applyEventFiltersAndSort(events, filters, sort) {
    filters = filters || {};
    sort = sort || {};

    let result = events.slice();

    result = result.filter(ev => {
      const start = this._toDate(ev.startDateTime);
      if (!start) return false;

      if (typeof filters.year === 'number') {
        if (start.getFullYear() !== filters.year) return false;
      }
      if (typeof filters.month === 'number') {
        if (start.getMonth() + 1 !== filters.month) return false;
      }
      if (filters.topicIds && Array.isArray(filters.topicIds) && filters.topicIds.length > 0) {
        const eventTopics = Array.isArray(ev.topicIds) ? ev.topicIds : [];
        const has = eventTopics.some(id => filters.topicIds.indexOf(id) !== -1);
        if (!has) return false;
      }
      if (filters.format && ev.format !== filters.format) return false;

      if (filters.includePast === false) {
        const now = new Date();
        if (start < now) return false;
      }

      return true;
    });

    const sortBy = sort.sortBy || 'date_asc';
    result.sort((a, b) => {
      const dateA = this._toDate(a.startDateTime);
      const dateB = this._toDate(b.startDateTime);
      if (sortBy === 'date_asc') {
        if (dateA && dateB) return dateA - dateB;
        if (dateA) return -1;
        if (dateB) return 1;
        return 0;
      }
      if (sortBy === 'date_desc') {
        if (dateA && dateB) return dateB - dateA;
        if (dateA) return 1;
        if (dateB) return -1;
        return 0;
      }
      return 0;
    });

    return result;
  }

  _validateNewsletterSubscriptionInput(digestType, topics, frequency, fullName, email, jobRole) {
    const allowedDigestTypes = [
      'legal_fintech_weekly_digest',
      'regulation_tracker_updates',
      'events_roundup'
    ];
    const allowedTopics = [
      'fintech',
      'data_privacy',
      'crypto',
      'regulation',
      'compliance'
    ];
    const allowedFrequencies = ['weekly', 'monthly', 'daily'];
    const allowedRoles = [
      'product_manager',
      'legal_counsel',
      'compliance_officer',
      'engineer',
      'other'
    ];

    if (!digestType || allowedDigestTypes.indexOf(digestType) === -1) {
      return 'Invalid digest type';
    }
    if (!Array.isArray(topics) || topics.length === 0) {
      return 'At least one topic must be selected';
    }
    const invalidTopic = topics.find(t => allowedTopics.indexOf(t) === -1);
    if (invalidTopic) {
      return 'Invalid topic: ' + invalidTopic;
    }
    if (!frequency || allowedFrequencies.indexOf(frequency) === -1) {
      return 'Invalid frequency';
    }
    if (!fullName || typeof fullName !== 'string') {
      return 'Full name is required';
    }
    if (!email || typeof email !== 'string' || email.indexOf('@') === -1) {
      return 'Valid email is required';
    }
    if (!jobRole || allowedRoles.indexOf(jobRole) === -1) {
      return 'Invalid job role';
    }
    return null;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomeContentOverview()
  getHomeContentOverview() {
    const articles = this._getFromStorage('articles', []);
    const topics = this._getFromStorage('topics', []);
    const segments = this._getFromStorage('segments', []);
    const events = this._getFromStorage('events', []);

    const featuredArticles = articles
      .slice()
      .sort((a, b) => {
        const popA = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const popB = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        if (popA !== popB) return popB - popA;
        const dateA = this._toDate(a.publishedAt);
        const dateB = this._toDate(b.publishedAt);
        if (dateA && dateB) return dateB - dateA;
        return 0;
      })
      .slice(0, 5);

    const recentArticles = articles
      .slice()
      .sort((a, b) => {
        const dateA = this._toDate(a.publishedAt);
        const dateB = this._toDate(b.publishedAt);
        if (dateA && dateB) return dateB - dateA;
        if (dateA) return 1;
        if (dateB) return -1;
        return 0;
      })
      .slice(0, 10);

    const topicCounts = {};
    for (const article of articles) {
      const ids = Array.isArray(article.topicIds) ? article.topicIds : [];
      for (const id of ids) {
        topicCounts[id] = (topicCounts[id] || 0) + 1;
      }
    }
    const featuredTopics = topics
      .slice()
      .sort((a, b) => {
        const countA = topicCounts[a.id] || 0;
        const countB = topicCounts[b.id] || 0;
        return countB - countA;
      })
      .slice(0, 5);

    const segmentCounts = {};
    for (const article of articles) {
      const ids = Array.isArray(article.segmentIds) ? article.segmentIds : [];
      for (const id of ids) {
        segmentCounts[id] = (segmentCounts[id] || 0) + 1;
      }
    }
    const featuredSegments = segments
      .slice()
      .sort((a, b) => {
        const countA = segmentCounts[a.id] || 0;
        const countB = segmentCounts[b.id] || 0;
        return countB - countA;
      })
      .slice(0, 5);

    const now = new Date();
    const upcomingEvents = events
      .filter(ev => {
        const start = this._toDate(ev.startDateTime);
        if (!start) return false;
        return start >= now;
      })
      .sort((a, b) => {
        const dateA = this._toDate(a.startDateTime);
        const dateB = this._toDate(b.startDateTime);
        if (dateA && dateB) return dateA - dateB;
        if (dateA) return -1;
        if (dateB) return 1;
        return 0;
      })
      .slice(0, 10);

    return {
      featuredArticles,
      recentArticles,
      featuredTopics,
      featuredSegments,
      upcomingEvents
    };
  }

  // getSearchFilterOptions()
  getSearchFilterOptions() {
    const regions = [
      { value: 'european_union', label: 'European Union (EU)' },
      { value: 'united_states', label: 'United States (US)' },
      { value: 'united_kingdom', label: 'United Kingdom (UK)' },
      { value: 'global', label: 'Global' },
      { value: 'other', label: 'Other' }
    ];

    const jurisdictions = [
      { value: 'european_union', label: 'European Union (EU)' },
      { value: 'united_states', label: 'United States (US)' },
      { value: 'united_kingdom', label: 'United Kingdom (UK)' },
      { value: 'multi_jurisdiction', label: 'Multi-jurisdiction' },
      { value: 'other', label: 'Other' }
    ];

    const contentTypes = [
      { value: 'article', label: 'Article' },
      { value: 'guide', label: 'Guide' },
      { value: 'checklist', label: 'Checklist' }
    ];

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const readingTimeRanges = [
      { maxMinutes: 5, label: 'Up to 5 minutes' },
      { maxMinutes: 10, label: 'Up to 10 minutes' },
      { maxMinutes: 15, label: 'Up to 15 minutes' },
      { maxMinutes: 20, label: 'Up to 20 minutes' }
    ];

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' },
      { value: 'most_popular', label: 'Most popular' }
    ];

    const articles = this._getFromStorage('articles', []);
    const yearsSet = new Set();
    for (const a of articles) {
      if (a.year) {
        yearsSet.add(a.year);
      } else if (a.publishedAt) {
        const d = this._toDate(a.publishedAt);
        if (d) yearsSet.add(d.getFullYear());
      }
    }
    const years = Array.from(yearsSet).sort((a, b) => b - a);

    return {
      regions,
      jurisdictions,
      years,
      contentTypes,
      levels,
      readingTimeRanges,
      sortOptions
    };
  }

  // searchArticles(query, filters, sort)
  searchArticles(query, filters, sort) {
    const allArticles = this._getFromStorage('articles', []);
    const q = (query || '').toLowerCase().trim();

    const topics = this._getFromStorage('topics', []);

    let base = allArticles;
    if (q) {
      const matchingTopicIds = topics
        .filter(t => ((t.name || '').toLowerCase().indexOf(q) !== -1))
        .map(t => t.id);

      base = allArticles.filter(a => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const body = (a.body || '').toLowerCase();
        const articleTopicIds = Array.isArray(a.topicIds) ? a.topicIds : [];
        const matchesText = title.indexOf(q) !== -1 || summary.indexOf(q) !== -1 || body.indexOf(q) !== -1;
        const matchesTopic = matchingTopicIds.length > 0 && articleTopicIds.some(id => matchingTopicIds.indexOf(id) !== -1);
        return matchesText || matchesTopic;
      });
    }

    const filteredAndSorted = this._applyArticleFiltersAndSort(base, filters, sort);

    const readingListItems = this._getFromStorage('reading_list_items', []);
    const readingQueueItems = this._getFromStorage('reading_queue_items', []);
    const { comparison } = this._getOrCreateCurrentComparison();

    const isBookmarkedSet = new Set(readingListItems.map(i => i.articleId));
    const inQueueSet = new Set(readingQueueItems.map(i => i.articleId));
    const inComparisonSet = new Set(Array.isArray(comparison.articleIds) ? comparison.articleIds : []);

    const results = filteredAndSorted.map(article => {
      const year = article.year || (this._toDate(article.publishedAt) ? this._toDate(article.publishedAt).getFullYear() : null);
      return {
        article,
        regionLabel: this._getRegionLabel(article.region),
        jurisdictionLabel: this._getJurisdictionLabel(article.jurisdiction),
        readingTimeLabel: this._getReadingTimeLabel(article.readingTimeMinutes),
        contentTypeLabel: this._getContentTypeLabel(article.contentType),
        levelLabel: this._getLevelLabel(article.level),
        yearLabel: this._getYearLabel(year),
        isBookmarked: isBookmarkedSet.has(article.id),
        isInReadingQueue: inQueueSet.has(article.id),
        isInComparison: inComparisonSet.has(article.id)
      };
    });

    return {
      results,
      total: results.length,
      appliedFilters: {
        region: filters && filters.region ? filters.region : undefined,
        jurisdiction: filters && filters.jurisdiction ? filters.jurisdiction : undefined,
        year: filters && filters.year ? filters.year : undefined,
        contentTypes: filters && filters.contentTypes ? filters.contentTypes : undefined,
        level: filters && filters.level ? filters.level : undefined,
        readingTimeMax: filters && typeof filters.readingTimeMax === 'number' ? filters.readingTimeMax : undefined
      }
    };
  }

  // getTopicOverview(topicId)
  getTopicOverview(topicId) {
    const topics = this._getFromStorage('topics', []);
    const topic = topics.find(t => t.id === topicId) || null;
    return topic;
  }

  // getTopicFilterOptions(topicId)
  getTopicFilterOptions(topicId) {
    // topicId not used for now, but kept for future topic-specific logic
    void topicId;

    const contentTypes = [
      { value: 'article', label: 'Article' },
      { value: 'guide', label: 'Guide' },
      { value: 'checklist', label: 'Checklist' }
    ];

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const regions = [
      { value: 'european_union', label: 'European Union (EU)' },
      { value: 'united_states', label: 'United States (US)' },
      { value: 'united_kingdom', label: 'United Kingdom (UK)' },
      { value: 'global', label: 'Global' },
      { value: 'other', label: 'Other' }
    ];

    const jurisdictions = [
      { value: 'european_union', label: 'European Union (EU)' },
      { value: 'united_states', label: 'United States (US)' },
      { value: 'united_kingdom', label: 'United Kingdom (UK)' },
      { value: 'multi_jurisdiction', label: 'Multi-jurisdiction' },
      { value: 'other', label: 'Other' }
    ];

    const readingTimeRanges = [
      { maxMinutes: 5, label: 'Up to 5 minutes' },
      { maxMinutes: 10, label: 'Up to 10 minutes' },
      { maxMinutes: 15, label: 'Up to 15 minutes' },
      { maxMinutes: 20, label: 'Up to 20 minutes' }
    ];

    const sortOptions = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' },
      { value: 'most_popular', label: 'Most popular' }
    ];

    return {
      contentTypes,
      levels,
      regions,
      jurisdictions,
      readingTimeRanges,
      sortOptions
    };
  }

  // getTopicContentList(topicId, filters, sort)
  getTopicContentList(topicId, filters, sort) {
    const allArticles = this._getFromStorage('articles', []);
    const topicArticles = allArticles.filter(a => {
      const ids = Array.isArray(a.topicIds) ? a.topicIds : [];
      return ids.indexOf(topicId) !== -1;
    });

    const filteredAndSorted = this._applyArticleFiltersAndSort(topicArticles, filters, sort);

    const readingListItems = this._getFromStorage('reading_list_items', []);
    const readingQueueItems = this._getFromStorage('reading_queue_items', []);

    const isBookmarkedSet = new Set(readingListItems.map(i => i.articleId));
    const inQueueSet = new Set(readingQueueItems.map(i => i.articleId));

    const items = filteredAndSorted.map(article => ({
      article,
      regionLabel: this._getRegionLabel(article.region),
      jurisdictionLabel: this._getJurisdictionLabel(article.jurisdiction),
      readingTimeLabel: this._getReadingTimeLabel(article.readingTimeMinutes),
      levelLabel: this._getLevelLabel(article.level),
      isBookmarked: isBookmarkedSet.has(article.id),
      isInReadingQueue: inQueueSet.has(article.id)
    }));

    return {
      items,
      total: items.length
    };
  }

  // getSegmentOverview(segmentId)
  getSegmentOverview(segmentId) {
    const segments = this._getFromStorage('segments', []);
    const segment = segments.find(s => s.id === segmentId) || null;
    return segment;
  }

  // getSegmentFilterOptions(segmentId)
  getSegmentFilterOptions(segmentId) {
    const subcategoriesRaw = this._getFromStorage('segment_subcategories', []);
    const segments = this._getFromStorage('segments', []);

    const subcategories = subcategoriesRaw
      .filter(sc => sc.segmentId === segmentId)
      .map(sc => {
        const segment = segments.find(s => s.id === sc.segmentId) || null;
        // foreign key resolution: segmentId -> segment
        return Object.assign({}, sc, { segment });
      });

    const contentTypes = [
      { value: 'article', label: 'Article' },
      { value: 'guide', label: 'Guide' },
      { value: 'checklist', label: 'Checklist' }
    ];

    const readingTimeRanges = [
      { maxMinutes: 5, label: 'Up to 5 minutes' },
      { maxMinutes: 10, label: 'Up to 10 minutes' },
      { maxMinutes: 12, label: 'Up to 12 minutes' },
      { maxMinutes: 15, label: 'Up to 15 minutes' }
    ];

    const sortOptions = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' },
      { value: 'most_popular', label: 'Most popular' }
    ];

    return {
      subcategories,
      contentTypes,
      readingTimeRanges,
      sortOptions
    };
  }

  // getSegmentContentList(segmentId, filters, sort)
  getSegmentContentList(segmentId, filters, sort) {
    filters = filters || {};
    const allArticles = this._getFromStorage('articles', []);
    const segmentArticles = allArticles.filter(a => {
      const ids = Array.isArray(a.segmentIds) ? a.segmentIds : [];
      return ids.indexOf(segmentId) !== -1;
    });

    const effectiveFilters = Object.assign({}, filters);
    if (filters.segmentSubcategoryId) {
      effectiveFilters.segmentSubcategoryId = filters.segmentSubcategoryId;
    }

    const filteredAndSorted = this._applyArticleFiltersAndSort(segmentArticles, effectiveFilters, sort);

    const readingListItems = this._getFromStorage('reading_list_items', []);
    const readingQueueItems = this._getFromStorage('reading_queue_items', []);

    const isBookmarkedSet = new Set(readingListItems.map(i => i.articleId));
    const inQueueSet = new Set(readingQueueItems.map(i => i.articleId));

    const items = filteredAndSorted.map(article => ({
      article,
      readingTimeLabel: this._getReadingTimeLabel(article.readingTimeMinutes),
      contentTypeLabel: this._getContentTypeLabel(article.contentType),
      isBookmarked: isBookmarkedSet.has(article.id),
      isInReadingQueue: inQueueSet.has(article.id)
    }));

    return {
      items,
      total: items.length
    };
  }

  // getSegmentPopularTags(segmentId)
  getSegmentPopularTags(segmentId) {
    const tags = this._getFromStorage('tags', []);
    const filtered = tags.filter(tag => {
      const segIds = Array.isArray(tag.segmentIds) ? tag.segmentIds : [];
      return segIds.indexOf(segmentId) !== -1;
    });

    return filtered.sort((a, b) => {
      const aScore = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
      const bScore = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
      return bScore - aScore;
    });
  }

  // getTagOverview(tagId)
  getTagOverview(tagId) {
    const tags = this._getFromStorage('tags', []);
    const tag = tags.find(t => t.id === tagId) || null;
    return tag;
  }

  // getTagContentList(tagId, sort)
  getTagContentList(tagId, sort) {
    const allArticles = this._getFromStorage('articles', []);
    const tagArticles = allArticles.filter(a => {
      const tagIds = Array.isArray(a.tagIds) ? a.tagIds : [];
      return tagIds.indexOf(tagId) !== -1;
    });

    const filteredAndSorted = this._applyArticleFiltersAndSort(tagArticles, {}, sort);

    const readingListItems = this._getFromStorage('reading_list_items', []);
    const readingQueueItems = this._getFromStorage('reading_queue_items', []);
    const tags = this._getFromStorage('tags', []);

    const isBookmarkedSet = new Set(readingListItems.map(i => i.articleId));
    const inQueueSet = new Set(readingQueueItems.map(i => i.articleId));

    const items = filteredAndSorted.map(article => ({
      article,
      readingTimeLabel: this._getReadingTimeLabel(article.readingTimeMinutes),
      isBookmarked: isBookmarkedSet.has(article.id),
      isInReadingQueue: inQueueSet.has(article.id)
    }));

    // Instrumentation for task completion tracking
    try {
      const tag = tags.find(t => t.id === tagId) || null;
      if (tag && tag.name === 'Startups' && sort && sort.sortBy === 'most_popular') {
        localStorage.setItem('task8_startupsTagSortedMostPopular', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      items,
      total: items.length
    };
  }

  // getRelatedTags(tagId)
  getRelatedTags(tagId) {
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);

    const relatedTagIdsSet = new Set();
    for (const a of articles) {
      const tagIds = Array.isArray(a.tagIds) ? a.tagIds : [];
      if (tagIds.indexOf(tagId) !== -1) {
        for (const otherId of tagIds) {
          if (otherId !== tagId) relatedTagIdsSet.add(otherId);
        }
      }
    }

    const relatedTags = tags.filter(t => relatedTagIdsSet.has(t.id));

    relatedTags.sort((a, b) => {
      const aScore = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
      const bScore = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
      return bScore - aScore;
    });

    return relatedTags;
  }

  // getArticleDetail(articleSlug)
  getArticleDetail(articleSlug) {
    const articles = this._getFromStorage('articles', []);
    const topics = this._getFromStorage('topics', []);
    const segments = this._getFromStorage('segments', []);
    const tags = this._getFromStorage('tags', []);
    const comments = this._getFromStorage('comments', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const readingQueueItems = this._getFromStorage('reading_queue_items', []);

    const article = articles.find(a => a.slug === articleSlug) || null;
    if (!article) {
      return {
        article: null,
        regionLabel: '',
        jurisdictionLabel: '',
        contentTypeLabel: '',
        levelLabel: '',
        readingTimeLabel: '',
        yearLabel: '',
        topicSummaries: [],
        segmentSummaries: [],
        tagSummaries: [],
        isBookmarked: false,
        isInReadingQueue: false,
        commentsPreview: []
      };
    }

    const topicSummaries = topics.filter(t => (Array.isArray(article.topicIds) ? article.topicIds : []).indexOf(t.id) !== -1);
    const segmentSummaries = segments.filter(s => (Array.isArray(article.segmentIds) ? article.segmentIds : []).indexOf(s.id) !== -1);
    const tagSummaries = tags.filter(t => (Array.isArray(article.tagIds) ? article.tagIds : []).indexOf(t.id) !== -1);

    const articleComments = comments
      .filter(c => c.articleId === article.id)
      .sort((a, b) => {
        const da = this._toDate(a.createdAt);
        const db = this._toDate(b.createdAt);
        if (da && db) return da - db;
        return 0;
      });

    const commentsPreview = articleComments.slice(0, 3).map(c => {
      const fullArticle = article; // same article
      return Object.assign({}, c, { article: fullArticle });
    });

    const isBookmarked = readingListItems.some(i => i.articleId === article.id);
    const isInReadingQueue = readingQueueItems.some(i => i.articleId === article.id);
    const year = article.year || (this._toDate(article.publishedAt) ? this._toDate(article.publishedAt).getFullYear() : null);

    // Instrumentation for task completion tracking
    try {
      if (article && article.id) {
        const openedRegRaw = localStorage.getItem('task4_openedRegulationEntry');
        if (openedRegRaw) {
          let openedReg = null;
          try {
            openedReg = JSON.parse(openedRegRaw);
          } catch (parseError) {
            openedReg = null;
          }
          if (openedReg && openedReg.entryId) {
            const allEntries = this._getFromStorage('regulation_entries', []);
            const regEntry = allEntries.find(e => e.id === openedReg.entryId) || null;
            if (regEntry && regEntry.relatedArticleId === article.id) {
              localStorage.setItem(
                'task4_openedRelatedArticle',
                JSON.stringify({
                  articleId: article.id,
                  slug: article.slug,
                  openedAt: this._nowISO()
                })
              );
            }
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article,
      regionLabel: this._getRegionLabel(article.region),
      jurisdictionLabel: this._getJurisdictionLabel(article.jurisdiction),
      contentTypeLabel: this._getContentTypeLabel(article.contentType),
      levelLabel: this._getLevelLabel(article.level),
      readingTimeLabel: this._getReadingTimeLabel(article.readingTimeMinutes),
      yearLabel: this._getYearLabel(year),
      topicSummaries,
      segmentSummaries,
      tagSummaries,
      isBookmarked,
      isInReadingQueue,
      commentsPreview
    };
  }

  // getArticleComments(articleId, offset, limit)
  getArticleComments(articleId, offset, limit) {
    offset = typeof offset === 'number' ? offset : 0;
    limit = typeof limit === 'number' ? limit : 20;

    const comments = this._getFromStorage('comments', []);
    const articles = this._getFromStorage('articles', []);

    const article = articles.find(a => a.id === articleId) || null;

    const all = comments
      .filter(c => c.articleId === articleId)
      .sort((a, b) => {
        const da = this._toDate(a.createdAt);
        const db = this._toDate(b.createdAt);
        if (da && db) return da - db;
        return 0;
      });

    const slice = all.slice(offset, offset + limit).map(c => Object.assign({}, c, { article }));

    return {
      comments: slice,
      total: all.length
    };
  }

  // getArticleShareLink(articleId)
  getArticleShareLink(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(a => a.id === articleId) || null;
    const url = article ? article.url : null;

    // Instrumentation for task completion tracking
    try {
      if (url) {
        localStorage.setItem(
          'task3_shareLinkCopied',
          JSON.stringify({ articleId: articleId, url: url, copiedAt: this._nowISO() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      url
    };
  }

  // getReadingList()
  getReadingList() {
    const { readingList } = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const items = (Array.isArray(readingList.itemIds) ? readingList.itemIds : [])
      .map(id => readingListItems.find(i => i.id === id))
      .filter(Boolean)
      .map(ri => {
        const article = articles.find(a => a.id === ri.articleId) || null;
        return {
          readingListItem: ri,
          article,
          readingTimeLabel: article ? this._getReadingTimeLabel(article.readingTimeMinutes) : '',
          contentTypeLabel: article ? this._getContentTypeLabel(article.contentType) : ''
        };
      });

    return {
      readingList,
      items,
      total: items.length
    };
  }

  // addArticleToReadingList(articleId, addedFrom)
  addArticleToReadingList(articleId, addedFrom) {
    addedFrom = addedFrom || 'other';

    const { readingList, lists } = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);

    const existing = readingListItems.find(i => i.articleId === articleId && readingList.itemIds.indexOf(i.id) !== -1);
    if (existing) {
      return {
        success: true,
        readingListItem: existing,
        total: readingList.itemIds.length,
        message: 'Article already in reading list'
      };
    }

    const item = {
      id: this._generateId('reading_list_item'),
      articleId,
      addedAt: this._nowISO(),
      addedFrom
    };

    readingListItems.push(item);
    readingList.itemIds.push(item.id);

    this._saveToStorage('reading_list_items', readingListItems);
    this._saveToStorage('reading_lists', lists);

    return {
      success: true,
      readingListItem: item,
      total: readingList.itemIds.length,
      message: 'Article added to reading list'
    };
  }

  // removeArticleFromReadingList(readingListItemId)
  removeArticleFromReadingList(readingListItemId) {
    const { readingList, lists } = this._getOrCreateReadingList();
    let readingListItems = this._getFromStorage('reading_list_items', []);

    readingList.itemIds = (Array.isArray(readingList.itemIds) ? readingList.itemIds : []).filter(id => id !== readingListItemId);
    readingListItems = readingListItems.filter(i => i.id !== readingListItemId);

    this._saveToStorage('reading_list_items', readingListItems);
    this._saveToStorage('reading_lists', lists);

    return {
      success: true,
      total: readingList.itemIds.length,
      message: 'Removed from reading list'
    };
  }

  // moveReadingListItemToQueue(readingListItemId)
  moveReadingListItemToQueue(readingListItemId) {
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const item = readingListItems.find(i => i.id === readingListItemId) || null;
    if (!item) {
      return {
        success: false,
        queueItem: null,
        message: 'Reading list item not found'
      };
    }

    const res = this.addArticleToReadingQueue(item.articleId, 'other');
    return {
      success: res.success,
      queueItem: res.queueItem,
      message: res.message
    };
  }

  // getReadingQueue()
  getReadingQueue() {
    const { readingQueue } = this._getOrCreateReadingQueue();
    const readingQueueItems = this._getFromStorage('reading_queue_items', []);
    const articles = this._getFromStorage('articles', []);

    const queueItems = (Array.isArray(readingQueue.itemIds) ? readingQueue.itemIds : [])
      .map(id => readingQueueItems.find(i => i.id === id))
      .filter(Boolean)
      .sort((a, b) => a.position - b.position);

    const items = queueItems.map((qi, index) => {
      const article = articles.find(a => a.id === qi.articleId) || null;
      return {
        queueItem: qi,
        article,
        readingTimeLabel: article ? this._getReadingTimeLabel(article.readingTimeMinutes) : '',
        contentTypeLabel: article ? this._getContentTypeLabel(article.contentType) : '',
        isNextUp: index === 0
      };
    });

    return {
      readingQueue,
      items,
      total: items.length
    };
  }

  // addArticleToReadingQueue(articleId, addedFrom, position)
  addArticleToReadingQueue(articleId, addedFrom, position) {
    addedFrom = addedFrom || 'other';

    const { readingQueue, queues } = this._getOrCreateReadingQueue();
    const readingQueueItems = this._getFromStorage('reading_queue_items', []);

    const queueItemsForQueue = readingQueueItems.filter(i => (Array.isArray(readingQueue.itemIds) ? readingQueue.itemIds : []).indexOf(i.id) !== -1);
    const existing = queueItemsForQueue.find(i => i.articleId === articleId);
    if (existing) {
      return {
        success: true,
        queueItem: existing,
        total: (Array.isArray(readingQueue.itemIds) ? readingQueue.itemIds.length : 0),
        message: 'Article already in reading queue'
      };
    }

    const newItem = {
      id: this._generateId('reading_queue_item'),
      articleId,
      position: 0,
      addedAt: this._nowISO(),
      addedFrom
    };

    const currentIds = Array.isArray(readingQueue.itemIds) ? readingQueue.itemIds.slice() : [];
    const items = queueItemsForQueue.slice();

    if (typeof position === 'number') {
      const maxPos = items.length + 1;
      let pos = position;
      if (pos < 1) pos = 1;
      if (pos > maxPos) pos = maxPos;

      const orderedItems = items.sort((a, b) => a.position - b.position);
      orderedItems.splice(pos - 1, 0, newItem);
      orderedItems.forEach((item, idx) => {
        item.position = idx + 1;
      });

      const remaining = readingQueueItems.filter(i => (Array.isArray(readingQueue.itemIds) ? readingQueue.itemIds : []).indexOf(i.id) === -1);
      const updatedAll = remaining.concat(orderedItems);

      readingQueue.itemIds = orderedItems.map(i => i.id);
      this._saveToStorage('reading_queue_items', updatedAll);
      this._saveToStorage('reading_queues', queues);

      return {
        success: true,
        queueItem: newItem,
        total: readingQueue.itemIds.length,
        message: 'Article added to reading queue'
      };
    } else {
      const newPos = items.length + 1;
      newItem.position = newPos;
      readingQueue.itemIds = currentIds.concat(newItem.id);
      readingQueueItems.push(newItem);

      this._saveToStorage('reading_queue_items', readingQueueItems);
      this._saveToStorage('reading_queues', queues);

      return {
        success: true,
        queueItem: newItem,
        total: readingQueue.itemIds.length,
        message: 'Article added to reading queue'
      };
    }
  }

  // removeReadingQueueItem(readingQueueItemId)
  removeReadingQueueItem(readingQueueItemId) {
    const { readingQueue, queues } = this._getOrCreateReadingQueue();
    let readingQueueItems = this._getFromStorage('reading_queue_items', []);

    const ids = Array.isArray(readingQueue.itemIds) ? readingQueue.itemIds : [];
    readingQueue.itemIds = ids.filter(id => id !== readingQueueItemId);

    const remainingForQueue = readingQueue.itemIds
      .map(id => readingQueueItems.find(i => i.id === id))
      .filter(Boolean)
      .sort((a, b) => a.position - b.position);

    remainingForQueue.forEach((item, idx) => {
      item.position = idx + 1;
    });

    const notInQueue = readingQueueItems.filter(i => ids.indexOf(i.id) === -1 && i.id !== readingQueueItemId);
    readingQueueItems = notInQueue.concat(remainingForQueue);

    this._saveToStorage('reading_queue_items', readingQueueItems);
    this._saveToStorage('reading_queues', queues);

    return {
      success: true,
      total: readingQueue.itemIds.length,
      message: 'Removed from reading queue'
    };
  }

  // reorderReadingQueue(orderedItemIds)
  reorderReadingQueue(orderedItemIds) {
    const { readingQueue, queues } = this._getOrCreateReadingQueue();
    let readingQueueItems = this._getFromStorage('reading_queue_items', []);

    const currentIds = Array.isArray(readingQueue.itemIds) ? new Set(readingQueue.itemIds) : new Set();
    const orderedSet = new Set(orderedItemIds || []);

    const intersectionIds = Array.from(orderedSet).filter(id => currentIds.has(id));
    const missingIds = Array.from(currentIds).filter(id => !orderedSet.has(id));
    const finalOrderIds = intersectionIds.concat(missingIds);

    const queueItemsMap = {};
    for (const item of readingQueueItems) {
      queueItemsMap[item.id] = item;
    }

    const orderedItems = finalOrderIds
      .map(id => queueItemsMap[id])
      .filter(Boolean);

    orderedItems.forEach((item, idx) => {
      item.position = idx + 1;
    });

    const notInQueue = readingQueueItems.filter(i => !currentIds.has(i.id));
    readingQueueItems = notInQueue.concat(orderedItems);

    readingQueue.itemIds = finalOrderIds;

    this._saveToStorage('reading_queue_items', readingQueueItems);
    this._saveToStorage('reading_queues', queues);

    return {
      readingQueue,
      items: orderedItems
    };
  }

  // getRegulationTrackerFilterOptions()
  getRegulationTrackerFilterOptions() {
    const jurisdictions = [
      { value: 'united_states', label: 'United States (US)' },
      { value: 'european_union', label: 'European Union (EU)' },
      { value: 'united_kingdom', label: 'United Kingdom (UK)' },
      { value: 'global', label: 'Global' },
      { value: 'other', label: 'Other' }
    ];

    const topics = this._getFromStorage('topics', []).filter(t => t.topicType === 'regulation' || t.topicType === 'mixed');

    const statuses = [
      { value: 'draft', label: 'Draft' },
      { value: 'proposed', label: 'Proposed' },
      { value: 'in_force', label: 'In force' },
      { value: 'repealed', label: 'Repealed' },
      { value: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { value: 'impact_score_high_to_low', label: 'Impact score - High to Low' },
      { value: 'impact_score_low_to_high', label: 'Impact score - Low to High' },
      { value: 'date_desc', label: 'Newest first' },
      { value: 'date_asc', label: 'Oldest first' }
    ];

    return {
      jurisdictions,
      topics,
      statuses,
      sortOptions
    };
  }

  // searchRegulationEntries(filters, sort)
  searchRegulationEntries(filters, sort) {
    const allEntries = this._getFromStorage('regulation_entries', []);
    const topics = this._getFromStorage('topics', []);
    const articles = this._getFromStorage('articles', []);

    const filteredAndSorted = this._applyRegulationFiltersAndSort(allEntries, filters, sort);

    const entries = filteredAndSorted.map(entry => {
      const topic = topics.find(t => t.id === entry.topicId) || null;
      const relatedArticle = entry.relatedArticleId ? (articles.find(a => a.id === entry.relatedArticleId) || null) : null;
      const entryWithRelations = Object.assign({}, entry, { topic, relatedArticle });
      return {
        entry: entryWithRelations,
        jurisdictionLabel: this._getJurisdictionLabel(entry.jurisdiction),
        topicName: topic ? topic.name : '',
        impactScoreLabel: this._getImpactScoreLabel(entry.impactScore),
        statusLabel: this._getRegulationStatusLabel(entry.status)
      };
    });

    // Instrumentation for task completion tracking
    try {
      if (entries && entries.length > 0) {
        localStorage.setItem(
          'task4_regulationSearchContext',
          JSON.stringify({
            filters: filters,
            sort: sort,
            topEntryId: (entries[0] && entries[0].entry && entries[0].entry.id) || null,
            timestamp: this._nowISO()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      entries,
      total: entries.length
    };
  }

  // getRegulationEntryDetail(regulationEntryId)
  getRegulationEntryDetail(regulationEntryId) {
    const allEntries = this._getFromStorage('regulation_entries', []);
    const topics = this._getFromStorage('topics', []);
    const articles = this._getFromStorage('articles', []);

    const entry = allEntries.find(e => e.id === regulationEntryId) || null;
    if (!entry) {
      return {
        entry: null,
        jurisdictionLabel: '',
        topicName: '',
        statusLabel: '',
        impactScoreLabel: '',
        relatedArticle: null
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task4_openedRegulationEntry',
        JSON.stringify({ entryId: regulationEntryId, openedAt: this._nowISO() })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const topic = topics.find(t => t.id === entry.topicId) || null;
    const relatedArticle = entry.relatedArticleId ? (articles.find(a => a.id === entry.relatedArticleId) || null) : null;
    const entryWithRelations = Object.assign({}, entry, { topic, relatedArticle });

    return {
      entry: entryWithRelations,
      jurisdictionLabel: this._getJurisdictionLabel(entry.jurisdiction),
      topicName: topic ? topic.name : '',
      statusLabel: this._getRegulationStatusLabel(entry.status),
      impactScoreLabel: this._getImpactScoreLabel(entry.impactScore),
      relatedArticle
    };
  }

  // getNewsletterSignupOptions()
  getNewsletterSignupOptions() {
    const digestTypes = [
      {
        value: 'legal_fintech_weekly_digest',
        label: 'Legal & Fintech Weekly Digest',
        description: 'Weekly roundup of legal and fintech insights'
      },
      {
        value: 'regulation_tracker_updates',
        label: 'Regulation Tracker Updates',
        description: 'Updates from the regulation tracker'
      },
      {
        value: 'events_roundup',
        label: 'Events Roundup',
        description: 'Upcoming events & webinars'
      }
    ];

    const topics = [
      { value: 'fintech', label: 'Fintech' },
      { value: 'data_privacy', label: 'Data privacy' },
      { value: 'crypto', label: 'Crypto' },
      { value: 'regulation', label: 'Regulation' },
      { value: 'compliance', label: 'Compliance' }
    ];

    const frequencies = [
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'daily', label: 'Daily' }
    ];

    const jobRoles = [
      { value: 'product_manager', label: 'Product Manager' },
      { value: 'legal_counsel', label: 'Legal counsel' },
      { value: 'compliance_officer', label: 'Compliance officer' },
      { value: 'engineer', label: 'Engineer' },
      { value: 'other', label: 'Other' }
    ];

    return {
      digestTypes,
      topics,
      frequencies,
      jobRoles
    };
  }

  // submitNewsletterSubscription(digestType, topics, frequency, fullName, email, jobRole)
  submitNewsletterSubscription(digestType, topics, frequency, fullName, email, jobRole) {
    const error = this._validateNewsletterSubscriptionInput(digestType, topics, frequency, fullName, email, jobRole);
    if (error) {
      return {
        subscription: null,
        success: false,
        message: error
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions', []);

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      digestType,
      topics: topics.slice(),
      frequency,
      fullName,
      email,
      jobRole,
      createdAt: this._nowISO()
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription,
      success: true,
      message: 'Subscription created'
    };
  }

  // getGlossaryCategoryOptions()
  getGlossaryCategoryOptions() {
    return [
      { value: 'compliance', label: 'Compliance' },
      { value: 'legal', label: 'Legal' },
      { value: 'fintech', label: 'Fintech' },
      { value: 'data_privacy', label: 'Data privacy' },
      { value: 'other', label: 'Other' }
    ];
  }

  // getGlossarySearchResults(query, filters)
  getGlossarySearchResults(query, filters) {
    filters = filters || {};
    const q = (query || '').toLowerCase().trim();

    const termsAll = this._getFromStorage('glossary_terms', []);
    const { studyList } = this._getOrCreateStudyList();
    const studyListItems = this._getFromStorage('study_list_items', []);

    const inStudySet = new Set(
      (Array.isArray(studyList.itemIds) ? studyList.itemIds : [])
        .map(id => studyListItems.find(i => i.id === id))
        .filter(Boolean)
        .map(i => i.glossaryTermId)
    );

    let filtered = termsAll.filter(t => {
      if (filters.category && t.category !== filters.category) return false;
      if (q) {
        const termLower = (t.term || '').toLowerCase();
        const defLower = (t.definition || '').toLowerCase();
        if (termLower.indexOf(q) === -1 && defLower.indexOf(q) === -1) return false;
      }
      return true;
    });

    filtered.sort((a, b) => (a.term || '').localeCompare(b.term || ''));

    const terms = filtered.map(t => ({
      term: t,
      categoryLabel: this._getGlossaryCategoryLabel(t.category),
      isInStudyList: inStudySet.has(t.id)
    }));

    return {
      terms,
      total: terms.length
    };
  }

  // addTermToStudyList(glossaryTermId)
  addTermToStudyList(glossaryTermId) {
    const { studyList, lists } = this._getOrCreateStudyList();
    const studyListItems = this._getFromStorage('study_list_items', []);

    const existing = studyListItems.find(i => i.glossaryTermId === glossaryTermId && studyList.itemIds.indexOf(i.id) !== -1);
    if (existing) {
      return {
        success: true,
        studyListItem: existing,
        total: studyList.itemIds.length,
        message: 'Term already in study list'
      };
    }

    const item = {
      id: this._generateId('study_list_item'),
      glossaryTermId,
      addedAt: this._nowISO()
    };

    studyListItems.push(item);
    studyList.itemIds.push(item.id);

    this._saveToStorage('study_list_items', studyListItems);
    this._saveToStorage('study_lists', lists);

    return {
      success: true,
      studyListItem: item,
      total: studyList.itemIds.length,
      message: 'Term added to study list'
    };
  }

  // getStudyList()
  getStudyList() {
    const { studyList } = this._getOrCreateStudyList();
    const studyListItems = this._getFromStorage('study_list_items', []);
    const glossaryTerms = this._getFromStorage('glossary_terms', []);

    const items = (Array.isArray(studyList.itemIds) ? studyList.itemIds : [])
      .map(id => studyListItems.find(i => i.id === id))
      .filter(Boolean)
      .map(sli => {
        const term = glossaryTerms.find(t => t.id === sli.glossaryTermId) || null;
        return {
          studyListItem: sli,
          term
        };
      });

    return {
      studyList,
      items,
      total: items.length
    };
  }

  // removeTermFromStudyList(studyListItemId)
  removeTermFromStudyList(studyListItemId) {
    const { studyList, lists } = this._getOrCreateStudyList();
    let studyListItems = this._getFromStorage('study_list_items', []);

    studyList.itemIds = (Array.isArray(studyList.itemIds) ? studyList.itemIds : []).filter(id => id !== studyListItemId);
    studyListItems = studyListItems.filter(i => i.id !== studyListItemId);

    this._saveToStorage('study_list_items', studyListItems);
    this._saveToStorage('study_lists', lists);

    return {
      success: true,
      total: studyList.itemIds.length,
      message: 'Removed from study list'
    };
  }

  // addArticleToComparison(articleId)
  addArticleToComparison(articleId) {
    const { comparison, comparisons } = this._getOrCreateCurrentComparison();
    const articles = this._getFromStorage('articles', []);

    const articleIds = Array.isArray(comparison.articleIds) ? comparison.articleIds : [];

    if (articleIds.indexOf(articleId) !== -1) {
      const compArticles = articleIds
        .map(id => articles.find(a => a.id === id))
        .filter(Boolean);
      return {
        comparison,
        articles: compArticles,
        success: true,
        message: 'Article already in comparison'
      };
    }

    if (articleIds.length >= 2) {
      const compArticles = articleIds
        .map(id => articles.find(a => a.id === id))
        .filter(Boolean);
      return {
        comparison,
        articles: compArticles,
        success: false,
        message: 'Comparison already has two items'
      };
    }

    comparison.articleIds.push(articleId);
    comparison.isSaved = false;

    this._saveToStorage('comparisons', comparisons);

    const compArticles = comparison.articleIds
      .map(id => articles.find(a => a.id === id))
      .filter(Boolean);

    return {
      comparison,
      articles: compArticles,
      success: true,
      message: 'Article added to comparison'
    };
  }

  // getCurrentComparison()
  getCurrentComparison() {
    const { comparison } = this._getOrCreateCurrentComparison();
    const articles = this._getFromStorage('articles', []);

    const articleObjs = (Array.isArray(comparison.articleIds) ? comparison.articleIds : [])
      .map(id => articles.find(a => a.id === id))
      .filter(Boolean)
      .map(a => {
        const year = a.year || (this._toDate(a.publishedAt) ? this._toDate(a.publishedAt).getFullYear() : null);
        return {
          article: a,
          jurisdictionLabel: this._getJurisdictionLabel(a.jurisdiction),
          regionLabel: this._getRegionLabel(a.region),
          levelLabel: this._getLevelLabel(a.level),
          contentTypeLabel: this._getContentTypeLabel(a.contentType),
          readingTimeLabel: this._getReadingTimeLabel(a.readingTimeMinutes),
          yearLabel: this._getYearLabel(year)
        };
      });

    return {
      comparison,
      articles: articleObjs
    };
  }

  // saveCurrentComparison(name)
  saveCurrentComparison(name) {
    const { comparison, comparisons } = this._getOrCreateCurrentComparison();

    if (typeof name === 'string' && name.trim().length > 0) {
      comparison.name = name.trim();
    }
    comparison.isSaved = true;

    this._saveToStorage('comparisons', comparisons);

    return {
      comparison,
      success: true,
      message: 'Comparison saved'
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);
    const topics = this._getFromStorage('topics', []);

    const monthMap = new Map();
    for (const ev of events) {
      const d = this._toDate(ev.startDateTime);
      if (!d) continue;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = y + '-' + m;
      if (!monthMap.has(key)) {
        const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
        monthMap.set(key, { year: y, month: m, label });
      }
    }
    const months = Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const eventTopics = topics.filter(t => t.topicType === 'event' || t.topicType === 'mixed');

    const formats = [
      { value: 'live_webinar', label: 'Live webinar' },
      { value: 'on_demand_webinar', label: 'On-demand webinar' },
      { value: 'in_person', label: 'In-person' },
      { value: 'virtual_conference', label: 'Virtual conference' }
    ];

    const sortOptions = [
      { value: 'date_asc', label: 'Soonest first' },
      { value: 'date_desc', label: 'Newest first' }
    ];

    return {
      months,
      topics: eventTopics,
      formats,
      sortOptions
    };
  }

  // searchEvents(filters, sort)
  searchEvents(filters, sort) {
    const eventsAll = this._getFromStorage('events', []);
    const topics = this._getFromStorage('topics', []);

    const filteredAndSorted = this._applyEventFiltersAndSort(eventsAll, filters, sort);

    const events = filteredAndSorted.map(ev => {
      const topicNames = (Array.isArray(ev.topicIds) ? ev.topicIds : [])
        .map(id => topics.find(t => t.id === id))
        .filter(Boolean)
        .map(t => t.name);

      return {
        event: ev,
        topicNames,
        formatLabel: this._getEventFormatLabel(ev.format),
        dateTimeLabel: this._formatEventDateTime(ev.startDateTime, ev.endDateTime),
        isRegistrationOpen: !!ev.registrationOpen
      };
    });

    return {
      events,
      total: events.length
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const topics = this._getFromStorage('topics', []);

    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        topicNames: [],
        formatLabel: '',
        dateTimeLabel: '',
        isRegistrationOpen: false
      };
    }

    const topicNames = (Array.isArray(event.topicIds) ? event.topicIds : [])
      .map(id => topics.find(t => t.id === id))
      .filter(Boolean)
      .map(t => t.name);

    return {
      event,
      topicNames,
      formatLabel: this._getEventFormatLabel(event.format),
      dateTimeLabel: this._formatEventDateTime(event.startDateTime, event.endDateTime),
      isRegistrationOpen: !!event.registrationOpen
    };
  }

  // registerForEvent(eventId, fullName, email, role)
  registerForEvent(eventId, fullName, email, role) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        registration: null,
        success: false,
        message: 'Event not found'
      };
    }

    if (!event.registrationOpen) {
      return {
        registration: null,
        success: false,
        message: 'Registration is closed for this event'
      };
    }

    if (!fullName || typeof fullName !== 'string') {
      return {
        registration: null,
        success: false,
        message: 'Full name is required'
      };
    }

    if (!email || typeof email !== 'string' || email.indexOf('@') === -1) {
      return {
        registration: null,
        success: false,
        message: 'Valid email is required'
      };
    }

    const allowedRoles = [
      'product_manager',
      'legal_counsel',
      'compliance_officer',
      'engineer',
      'other'
    ];
    if (allowedRoles.indexOf(role) === -1) {
      return {
        registration: null,
        success: false,
        message: 'Invalid role'
      };
    }

    const registrations = this._getFromStorage('event_registrations', []);

    const registration = {
      id: this._generateId('event_registration'),
      eventId,
      fullName,
      email,
      role,
      registeredAt: this._nowISO()
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      registration,
      success: true,
      message: 'Registration completed'
    };
  }

  // getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages', {});
    const page = pages && Object.prototype.hasOwnProperty.call(pages, pageSlug) ? pages[pageSlug] : null;
    if (!page) {
      return {
        title: '',
        body: '',
        lastUpdatedLabel: ''
      };
    }
    return page;
  }

  // submitContactMessage(fullName, email, subject, message)
  submitContactMessage(fullName, email, subject, message) {
    if (!fullName || typeof fullName !== 'string') {
      return { success: false, message: 'Full name is required' };
    }
    if (!email || typeof email !== 'string' || email.indexOf('@') === -1) {
      return { success: false, message: 'Valid email is required' };
    }
    if (!subject || typeof subject !== 'string') {
      return { success: false, message: 'Subject is required' };
    }
    if (!message || typeof message !== 'string') {
      return { success: false, message: 'Message is required' };
    }

    const contactMessages = this._getFromStorage('contact_messages', []);
    const item = {
      id: this._generateId('contact_message'),
      fullName,
      email,
      subject,
      message,
      createdAt: this._nowISO()
    };
    contactMessages.push(item);
    this._saveToStorage('contact_messages', contactMessages);

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