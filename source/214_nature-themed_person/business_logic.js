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
    const keys = [
      'categories',
      'topics',
      'tags',
      'series',
      'authors',
      'author_follows',
      'articles',
      'article_tags',
      'reading_lists',
      'reading_list_items',
      'saved_items',
      'comments',
      'feed_preferences',
      'reading_preferences',
      'contact_messages',
      'about_page_content',
      'contact_page_content',
      'privacy_policy_content',
      'terms_and_conditions_content'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        // Use sensible defaults: arrays for collections, null for singleton content blobs
        let defaultValue;
        if (
          key === 'about_page_content' ||
          key === 'contact_page_content' ||
          key === 'privacy_policy_content' ||
          key === 'terms_and_conditions_content'
        ) {
          defaultValue = null;
        } else {
          defaultValue = [];
        }
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
    try {
      const parsed = JSON.parse(data);
      if (parsed === null || typeof parsed === 'undefined') {
        return typeof defaultValue === 'undefined' ? [] : defaultValue;
      }
      return parsed;
    } catch (e) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _persistState(updates) {
    if (!updates || typeof updates !== 'object') return;
    const keys = Object.keys(updates);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      this._saveToStorage(key, updates[key]);
    }
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return (prefix || 'id') + '_' + this._getNextIdCounter();
  }

  // ----------------------
  // Generic helpers
  // ----------------------

  _indexById(list) {
    const map = {};
    if (!Array.isArray(list)) return map;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item && item.id != null) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _parseDate(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  _dateToISO(date) {
    return date instanceof Date ? date.toISOString() : new Date().toISOString();
  }

  _arraysIntersect(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return false;
    const setB = {};
    for (let i = 0; i < b.length; i++) {
      setB[b[i]] = true;
    }
    for (let j = 0; j < a.length; j++) {
      if (setB[a[j]]) return true;
    }
    return false;
  }

  _stringIncludes(haystack, needle) {
    if (!haystack || !needle) return false;
    return String(haystack).toLowerCase().indexOf(String(needle).toLowerCase()) !== -1;
  }

  _buildArticlePreview(article, categoriesById, authorsById, readingListItems, savedItems) {
    const category = categoriesById[article.categoryId] || null;
    const author = authorsById[article.authorId] || null;

    let isBookmarked = false;
    for (let i = 0; i < savedItems.length; i++) {
      if (savedItems[i].articleId === article.id) {
        isBookmarked = true;
        break;
      }
    }

    let inReadingListsCount = 0;
    for (let j = 0; j < readingListItems.length; j++) {
      if (readingListItems[j].articleId === article.id) {
        inReadingListsCount++;
      }
    }

    return {
      articleId: article.id,
      title: article.title,
      excerpt: article.excerpt || '',
      categoryId: article.categoryId,
      categoryName: category ? category.name : null,
      category: category || null,
      publishDate: article.publishDate,
      readingTimeMinutes: article.readingTimeMinutes,
      contentType: article.contentType,
      topics: Array.isArray(article.topics) ? article.topics : [],
      tags: Array.isArray(article.tags) ? article.tags : [],
      authorId: article.authorId,
      authorName: author ? author.name : null,
      author: author || null,
      averageRating: typeof article.averageRating === 'number' ? article.averageRating : null,
      likesCount: typeof article.likesCount === 'number' ? article.likesCount : 0,
      skillLevel: article.skillLevel || null,
      trailLengthMiles: typeof article.trailLengthMiles === 'number' ? article.trailLengthMiles : null,
      estimatedTrailDurationHours: typeof article.estimatedTrailDurationHours === 'number' ? article.estimatedTrailDurationHours : null,
      nearestCity: article.nearestCity || null,
      distanceFromNearestCityMiles: typeof article.distanceFromNearestCityMiles === 'number' ? article.distanceFromNearestCityMiles : null,
      difficulty: article.difficulty || null,
      isBookmarked: isBookmarked,
      inReadingListsCount: inReadingListsCount
    };
  }

  // ----------------------
  // Helper: preference & reading list records
  // ----------------------

  _getOrCreateFeedPreferences() {
    let prefsArr = this._getFromStorage('feed_preferences', []);
    if (!Array.isArray(prefsArr)) {
      prefsArr = [];
    }
    let prefs = prefsArr[0];
    if (!prefs) {
      prefs = {
        id: 'default',
        selectedTopicIds: [],
        topicPriorityOrder: [],
        minPublishDate: null,
        maxReadingTimeMinutes: null,
        includedContentTypes: [],
        lastUpdatedAt: this._dateToISO(new Date())
      };
      prefsArr = [prefs];
      this._saveToStorage('feed_preferences', prefsArr);
    }
    return prefs;
  }

  _getOrCreateReadingPreferences() {
    let prefsArr = this._getFromStorage('reading_preferences', []);
    if (!Array.isArray(prefsArr)) {
      prefsArr = [];
    }
    let prefs = prefsArr[0];
    if (!prefs) {
      prefs = {
        id: 'default',
        theme: 'light',
        fontSize: 'medium',
        lineSpacing: 'normal',
        showReadingProgressBar: false,
        lastUpdatedAt: this._dateToISO(new Date())
      };
      prefsArr = [prefs];
      this._saveToStorage('reading_preferences', prefsArr);
    }
    return prefs;
  }

  _saveFeedPreferences(prefs) {
    const arr = [prefs];
    this._saveToStorage('feed_preferences', arr);
  }

  _saveReadingPreferences(prefs) {
    const arr = [prefs];
    this._saveToStorage('reading_preferences', arr);
  }

  _getOrCreateReadingListByName(name) {
    const trimmed = String(name || '').trim();
    const targetName = trimmed || 'Untitled list';
    let lists = this._getFromStorage('reading_lists', []);
    let found = null;
    for (let i = 0; i < lists.length; i++) {
      const l = lists[i];
      if (l && typeof l.name === 'string' && l.name.toLowerCase() === targetName.toLowerCase()) {
        found = l;
        break;
      }
    }
    if (found) {
      return { list: found, created: false };
    }
    const now = this._dateToISO(new Date());
    const newList = {
      id: this._generateId('reading_list'),
      name: targetName,
      description: '',
      createdAt: now,
      updatedAt: now
    };
    lists.push(newList);
    this._saveToStorage('reading_lists', lists);
    return { list: newList, created: true };
  }

  _getOrCreateAuthorFollowRecord(authorId) {
    let follows = this._getFromStorage('author_follows', []);
    let follow = null;
    for (let i = 0; i < follows.length; i++) {
      if (follows[i].authorId === authorId) {
        follow = follows[i];
        break;
      }
    }
    if (follow) return follow;
    follow = {
      id: this._generateId('author_follow'),
      authorId: authorId,
      followedAt: this._dateToISO(new Date()),
      updateChannel: 'onsite',
      receiveNotifications: true
    };
    follows.push(follow);
    this._saveToStorage('author_follows', follows);
    return follow;
  }

  _getOrCreateSavedItemsCollection() {
    const saved = this._getFromStorage('saved_items', []);
    return Array.isArray(saved) ? saved : [];
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getMainNavigationCategories
  getMainNavigationCategories() {
    // Simple passthrough of categories stored in localStorage
    const categories = this._getFromStorage('categories', []);
    return categories.map(function (c) {
      return {
        id: c.id,
        name: c.name,
        description: c.description || ''
      };
    });
  }

  // getHomeFeed(page = 1, pageSize = 20, sort = 'personalized')
  getHomeFeed(page, pageSize, sort) {
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const effectiveSort = sort || 'personalized';

    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('categories', []);
    const authors = this._getFromStorage('authors', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const savedItems = this._getOrCreateSavedItemsCollection();

    const categoriesById = this._indexById(categories);
    const authorsById = this._indexById(authors);

    const feedPrefs = this._getOrCreateFeedPreferences();

    // Apply feed preferences filters
    const filtered = [];
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];

      // Topics filter
      if (Array.isArray(feedPrefs.selectedTopicIds) && feedPrefs.selectedTopicIds.length > 0) {
        const articleTopics = Array.isArray(a.topics) ? a.topics : [];
        if (!this._arraysIntersect(articleTopics, feedPrefs.selectedTopicIds)) {
          continue;
        }
      }

      // Date filter (min publish date)
      if (feedPrefs.minPublishDate) {
        const minDate = this._parseDate(feedPrefs.minPublishDate);
        const pubDate = this._parseDate(a.publishDate);
        if (minDate && pubDate && pubDate.getTime() < minDate.getTime()) {
          continue;
        }
      }

      // Reading time filter
      if (typeof feedPrefs.maxReadingTimeMinutes === 'number') {
        if (typeof a.readingTimeMinutes !== 'number' || a.readingTimeMinutes > feedPrefs.maxReadingTimeMinutes) {
          continue;
        }
      }

      // Content types filter
      if (Array.isArray(feedPrefs.includedContentTypes) && feedPrefs.includedContentTypes.length > 0) {
        if (feedPrefs.includedContentTypes.indexOf(a.contentType) === -1) {
          continue;
        }
      }

      filtered.push(a);
    }

    // Sorting
    const topicPriorityOrder = Array.isArray(feedPrefs.topicPriorityOrder) ? feedPrefs.topicPriorityOrder : [];

    function getTopicPriorityScore(article) {
      if (!topicPriorityOrder.length || !Array.isArray(article.topics)) return topicPriorityOrder.length + 1;
      let best = topicPriorityOrder.length + 1;
      for (let i = 0; i < article.topics.length; i++) {
        const idx = topicPriorityOrder.indexOf(article.topics[i]);
        if (idx !== -1 && idx < best) best = idx;
      }
      return best;
    }

    const sorted = filtered.slice();

    sorted.sort((a, b) => {
      if (effectiveSort === 'newest_first') {
        const da = this._parseDate(a.publishDate);
        const db = this._parseDate(b.publishDate);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      }
      if (effectiveSort === 'most_liked') {
        const la = typeof a.likesCount === 'number' ? a.likesCount : 0;
        const lb = typeof b.likesCount === 'number' ? b.likesCount : 0;
        return lb - la;
      }
      // 'personalized' or default: primary sort by topic priority, then newest
      const sa = getTopicPriorityScore(a);
      const sb = getTopicPriorityScore(b);
      if (sa !== sb) return sa - sb;
      const da = this._parseDate(a.publishDate);
      const db = this._parseDate(b.publishDate);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });

    const totalCount = sorted.length;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const endIndex = startIndex + effectivePageSize;
    const pageItems = sorted.slice(startIndex, endIndex);

    const previews = [];
    for (let i = 0; i < pageItems.length; i++) {
      const preview = this._buildArticlePreview(pageItems[i], categoriesById, authorsById, readingListItems, savedItems);
      previews.push(preview);
    }

    const appliedPrefs = {
      selectedTopicIds: Array.isArray(feedPrefs.selectedTopicIds) ? feedPrefs.selectedTopicIds.slice() : [],
      topicPriorityOrder: Array.isArray(feedPrefs.topicPriorityOrder) ? feedPrefs.topicPriorityOrder.slice() : [],
      minPublishDate: feedPrefs.minPublishDate || null,
      maxReadingTimeMinutes: typeof feedPrefs.maxReadingTimeMinutes === 'number' ? feedPrefs.maxReadingTimeMinutes : null,
      includedContentTypes: Array.isArray(feedPrefs.includedContentTypes) ? feedPrefs.includedContentTypes.slice() : []
    };

    return {
      items: previews,
      totalCount: totalCount,
      page: effectivePage,
      pageSize: effectivePageSize,
      isPersonalized: true,
      appliedPreferences: appliedPrefs
    };
  }

  // getFeaturedSeriesForHome()
  getFeaturedSeriesForHome() {
    const seriesList = this._getFromStorage('series', []);
    return seriesList.map(function (s) {
      return {
        seriesId: s.id,
        title: s.title,
        slug: s.slug,
        description: s.description || '',
        coverImageUrl: s.coverImageUrl || ''
      };
    });
  }

  // getCategoryFilterOptions(categoryId)
  getCategoryFilterOptions(categoryId) {
    const articles = this._getFromStorage('articles', []);
    const topics = this._getFromStorage('topics', []);
    const tags = this._getFromStorage('tags', []);

    const filtered = [];
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].categoryId === categoryId) {
        filtered.push(articles[i]);
      }
    }

    const difficultiesSet = {};
    const skillLevelsSet = {};
    const contentTypesSet = {};
    const tagNamesSet = {};
    const topicIdsSet = {};

    let minRT = null;
    let maxRT = null;
    let minLikes = null;
    let maxLikes = null;
    let minTrail = null;
    let maxTrail = null;
    let hasLocationFilter = false;

    for (let i = 0; i < filtered.length; i++) {
      const a = filtered[i];

      if (a.difficulty) difficultiesSet[a.difficulty] = true;
      if (a.skillLevel) skillLevelsSet[a.skillLevel] = true;
      if (a.contentType) contentTypesSet[a.contentType] = true;

      if (typeof a.readingTimeMinutes === 'number') {
        if (minRT === null || a.readingTimeMinutes < minRT) minRT = a.readingTimeMinutes;
        if (maxRT === null || a.readingTimeMinutes > maxRT) maxRT = a.readingTimeMinutes;
      }

      if (typeof a.likesCount === 'number') {
        if (minLikes === null || a.likesCount < minLikes) minLikes = a.likesCount;
        if (maxLikes === null || a.likesCount > maxLikes) maxLikes = a.likesCount;
      }

      if (typeof a.trailLengthMiles === 'number') {
        if (minTrail === null || a.trailLengthMiles < minTrail) minTrail = a.trailLengthMiles;
        if (maxTrail === null || a.trailLengthMiles > maxTrail) maxTrail = a.trailLengthMiles;
      }

      if (a.locationCity || a.primaryLandmark || a.nearestCity) {
        hasLocationFilter = true;
      }

      if (Array.isArray(a.tags)) {
        for (let t = 0; t < a.tags.length; t++) {
          tagNamesSet[a.tags[t]] = true;
        }
      }

      if (Array.isArray(a.topics)) {
        for (let t2 = 0; t2 < a.topics.length; t2++) {
          topicIdsSet[a.topics[t2]] = true;
        }
      }
    }

    const difficulties = Object.keys(difficultiesSet);
    const skillLevels = Object.keys(skillLevelsSet);
    const contentTypes = Object.keys(contentTypesSet);

    const availableTags = [];
    const tagNames = Object.keys(tagNamesSet);
    for (let i = 0; i < tagNames.length; i++) {
      const name = tagNames[i];
      let tagObj = null;
      for (let j = 0; j < tags.length; j++) {
        if (tags[j].name === name) {
          tagObj = tags[j];
          break;
        }
      }
      if (!tagObj) {
        const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        tagObj = { id: slug || name, name: name, slug: slug || name };
      }
      availableTags.push(tagObj);
    }

    const availableTopics = [];
    const topicIds = Object.keys(topicIdsSet);
    for (let i = 0; i < topicIds.length; i++) {
      const id = topicIds[i];
      for (let j = 0; j < topics.length; j++) {
        if (topics[j].id === id) {
          availableTopics.push(topics[j]);
          break;
        }
      }
    }

    const availableSortOptions = [
      {
        id: 'default',
        label: 'Recommended',
        description: 'Default recommended ordering for this category.'
      },
      {
        id: 'newest_first',
        label: 'Newest first',
        description: 'Most recently published articles first.'
      },
      {
        id: 'most_liked',
        label: 'Most liked',
        description: 'Sort by likes count high to low.'
      },
      {
        id: 'user_rating_desc',
        label: 'User rating  High to Low',
        description: 'Sort by average user rating from highest to lowest.'
      },
      {
        id: 'reading_time_asc',
        label: 'Shortest reading time',
        description: 'Shortest reading time first.'
      }
    ];

    return {
      difficulties: difficulties,
      hasLocationFilter: hasLocationFilter,
      readingTimeRange: {
        min: minRT === null ? 0 : minRT,
        max: maxRT === null ? 0 : maxRT
      },
      likesRange: {
        min: minLikes === null ? 0 : minLikes,
        max: maxLikes === null ? 0 : maxLikes
      },
      trailLengthRangeMiles: {
        min: minTrail === null ? 0 : minTrail,
        max: maxTrail === null ? 0 : maxTrail
      },
      skillLevels: skillLevels,
      contentTypes: contentTypes,
      availableTags: availableTags,
      availableTopics: availableTopics,
      availableSortOptions: availableSortOptions
    };
  }

  // getCategoryArticles(categoryId, filters, sort, page, pageSize)
  getCategoryArticles(categoryId, filters, sort, page, pageSize) {
    const effectiveFilters = filters || {};
    const effectiveSort = sort || 'default';
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('categories', []);
    const authors = this._getFromStorage('authors', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const savedItems = this._getOrCreateSavedItemsCollection();

    const categoriesById = this._indexById(categories);
    const authorsById = this._indexById(authors);

    const filtered = [];

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (a.categoryId !== categoryId) continue;

      // locationCity filter (match either locationCity or nearestCity)
      if (effectiveFilters.locationCity) {
        const lc = (a.locationCity || '').toLowerCase();
        const nc = (a.nearestCity || '').toLowerCase();
        const target = String(effectiveFilters.locationCity).toLowerCase();
        if (lc !== target && nc !== target) continue;
      }

      // primaryLandmark filter
      if (effectiveFilters.primaryLandmark) {
        const landmark = (a.primaryLandmark || '').toLowerCase();
        const targetLm = String(effectiveFilters.primaryLandmark).toLowerCase();
        if (landmark !== targetLm) continue;
      }

      // radiusMiles with nearestCity context
      if (typeof effectiveFilters.radiusMiles === 'number') {
        if (typeof a.distanceFromNearestCityMiles !== 'number') continue;
        if (a.distanceFromNearestCityMiles > effectiveFilters.radiusMiles) continue;
      }

      // difficulty
      if (effectiveFilters.difficulty) {
        if (a.difficulty !== effectiveFilters.difficulty) continue;
      }

      // Trail length range
      if (typeof effectiveFilters.minTrailLengthMiles === 'number') {
        if (typeof a.trailLengthMiles !== 'number' || a.trailLengthMiles < effectiveFilters.minTrailLengthMiles) continue;
      }
      if (typeof effectiveFilters.maxTrailLengthMiles === 'number') {
        if (typeof a.trailLengthMiles !== 'number' || a.trailLengthMiles > effectiveFilters.maxTrailLengthMiles) continue;
      }

      // Reading time range
      if (typeof effectiveFilters.minReadingTimeMinutes === 'number') {
        if (typeof a.readingTimeMinutes !== 'number' || a.readingTimeMinutes < effectiveFilters.minReadingTimeMinutes) continue;
      }
      if (typeof effectiveFilters.maxReadingTimeMinutes === 'number') {
        if (typeof a.readingTimeMinutes !== 'number' || a.readingTimeMinutes > effectiveFilters.maxReadingTimeMinutes) continue;
      }

      // Date range
      if (effectiveFilters.startDate) {
        const start = this._parseDate(effectiveFilters.startDate);
        const pub = this._parseDate(a.publishDate);
        if (start && pub && pub.getTime() < start.getTime()) continue;
      }
      if (effectiveFilters.endDate) {
        const end = this._parseDate(effectiveFilters.endDate);
        const pub2 = this._parseDate(a.publishDate);
        if (end && pub2 && pub2.getTime() > end.getTime()) continue;
      }

      // Tags
      if (Array.isArray(effectiveFilters.tagNames) && effectiveFilters.tagNames.length > 0) {
        const articleTags = Array.isArray(a.tags) ? a.tags : [];
        if (!this._arraysIntersect(articleTags, effectiveFilters.tagNames)) continue;
      }

      // Topics
      if (Array.isArray(effectiveFilters.topicIds) && effectiveFilters.topicIds.length > 0) {
        const articleTopics = Array.isArray(a.topics) ? a.topics : [];
        if (!this._arraysIntersect(articleTopics, effectiveFilters.topicIds)) continue;
      }

      // Likes
      if (typeof effectiveFilters.minLikesCount === 'number') {
        const likes = typeof a.likesCount === 'number' ? a.likesCount : 0;
        if (likes < effectiveFilters.minLikesCount) continue;
      }

      // Rating
      if (typeof effectiveFilters.minAverageRating === 'number') {
        const rating = typeof a.averageRating === 'number' ? a.averageRating : 0;
        if (rating < effectiveFilters.minAverageRating) continue;
      }

      // Skill level
      if (effectiveFilters.skillLevel) {
        if (a.skillLevel !== effectiveFilters.skillLevel) continue;
      }

      // Content types
      if (Array.isArray(effectiveFilters.contentTypes) && effectiveFilters.contentTypes.length > 0) {
        if (effectiveFilters.contentTypes.indexOf(a.contentType) === -1) continue;
      }

      // nearestCity explicit filter
      if (effectiveFilters.nearestCity) {
        const nc2 = (a.nearestCity || '').toLowerCase();
        const targetNc2 = String(effectiveFilters.nearestCity).toLowerCase();
        if (nc2 !== targetNc2) continue;
      }

      filtered.push(a);
    }

    const sorted = filtered.slice();

    sorted.sort((a, b) => {
      if (effectiveSort === 'user_rating_desc') {
        const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
        const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
        if (rb !== ra) return rb - ra;
      } else if (effectiveSort === 'most_liked') {
        const la = typeof a.likesCount === 'number' ? a.likesCount : 0;
        const lb = typeof b.likesCount === 'number' ? b.likesCount : 0;
        if (lb !== la) return lb - la;
      } else if (effectiveSort === 'newest_first') {
        const da = this._parseDate(a.publishDate);
        const db = this._parseDate(b.publishDate);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        if (tb !== ta) return tb - ta;
      } else if (effectiveSort === 'reading_time_asc') {
        const rta = typeof a.readingTimeMinutes === 'number' ? a.readingTimeMinutes : Number.MAX_SAFE_INTEGER;
        const rtb = typeof b.readingTimeMinutes === 'number' ? b.readingTimeMinutes : Number.MAX_SAFE_INTEGER;
        if (rta !== rtb) return rta - rtb;
      } else {
        // default: newest first
        const da2 = this._parseDate(a.publishDate);
        const db2 = this._parseDate(b.publishDate);
        const ta2 = da2 ? da2.getTime() : 0;
        const tb2 = db2 ? db2.getTime() : 0;
        if (tb2 !== ta2) return tb2 - ta2;
      }
      return 0;
    });

    const totalCount = sorted.length;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const endIndex = startIndex + effectivePageSize;
    const slice = sorted.slice(startIndex, endIndex);

    const items = [];
    for (let i = 0; i < slice.length; i++) {
      items.push(this._buildArticlePreview(slice[i], categoriesById, authorsById, readingListItems, savedItems));
    }

    const appliedFilters = {
      locationCity: effectiveFilters.locationCity || null,
      primaryLandmark: effectiveFilters.primaryLandmark || null,
      radiusMiles: typeof effectiveFilters.radiusMiles === 'number' ? effectiveFilters.radiusMiles : null,
      difficulty: effectiveFilters.difficulty || null,
      minTrailLengthMiles: typeof effectiveFilters.minTrailLengthMiles === 'number' ? effectiveFilters.minTrailLengthMiles : null,
      maxTrailLengthMiles: typeof effectiveFilters.maxTrailLengthMiles === 'number' ? effectiveFilters.maxTrailLengthMiles : null,
      minReadingTimeMinutes: typeof effectiveFilters.minReadingTimeMinutes === 'number' ? effectiveFilters.minReadingTimeMinutes : null,
      maxReadingTimeMinutes: typeof effectiveFilters.maxReadingTimeMinutes === 'number' ? effectiveFilters.maxReadingTimeMinutes : null,
      startDate: effectiveFilters.startDate || null,
      endDate: effectiveFilters.endDate || null,
      tagNames: Array.isArray(effectiveFilters.tagNames) ? effectiveFilters.tagNames.slice() : [],
      topicIds: Array.isArray(effectiveFilters.topicIds) ? effectiveFilters.topicIds.slice() : [],
      minLikesCount: typeof effectiveFilters.minLikesCount === 'number' ? effectiveFilters.minLikesCount : null,
      minAverageRating: typeof effectiveFilters.minAverageRating === 'number' ? effectiveFilters.minAverageRating : null,
      skillLevel: effectiveFilters.skillLevel || null,
      contentTypes: Array.isArray(effectiveFilters.contentTypes) ? effectiveFilters.contentTypes.slice() : [],
      nearestCity: effectiveFilters.nearestCity || null
    };

    return {
      items: items,
      totalCount: totalCount,
      page: effectivePage,
      pageSize: effectivePageSize,
      appliedFilters: appliedFilters
    };
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('categories', []);
    const authors = this._getFromStorage('authors', []);
    const seriesList = this._getFromStorage('series', []);
    const comments = this._getFromStorage('comments', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const readingLists = this._getFromStorage('reading_lists', []);

    const categoriesById = this._indexById(categories);
    const authorsById = this._indexById(authors);
    const seriesById = this._indexById(seriesList);
    const readingListsById = this._indexById(readingLists);

    let article = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        article = articles[i];
        break;
      }
    }

    if (!article) {
      return {
        article: null,
        author: null,
        readingState: {
          isBookmarked: false,
          inReadingLists: [],
          appliedReadingPreferences: this._getOrCreateReadingPreferences()
        },
        commentsPreview: [],
        relatedArticles: []
      };
    }

    const category = categoriesById[article.categoryId] || null;
    const author = authorsById[article.authorId] || null;
    const series = article.seriesId ? seriesById[article.seriesId] || null : null;

    const savedItems = this._getOrCreateSavedItemsCollection();
    let isBookmarked = false;
    for (let i = 0; i < savedItems.length; i++) {
      if (savedItems[i].articleId === article.id) {
        isBookmarked = true;
        break;
      }
    }

    const inReadingLists = [];
    for (let i = 0; i < readingListItems.length; i++) {
      const item = readingListItems[i];
      if (item.articleId === article.id) {
        const rl = readingListsById[item.readingListId];
        if (rl) {
          inReadingLists.push({
            readingListId: rl.id,
            readingListName: rl.name
          });
        }
      }
    }

    const readingPrefs = this._getOrCreateReadingPreferences();

    // Comments preview (first few, ordered by createdAt ascending)
    const articleComments = [];
    for (let i = 0; i < comments.length; i++) {
      if (comments[i].articleId === article.id) {
        articleComments.push(comments[i]);
      }
    }
    articleComments.sort((a, b) => {
      const da = this._parseDate(a.createdAt);
      const db = this._parseDate(b.createdAt);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return ta - tb;
    });
    const previewComments = articleComments.slice(0, 5).map((c) => {
      return {
        id: c.id,
        articleId: c.articleId,
        content: c.content,
        createdAt: c.createdAt,
        status: c.status,
        // Foreign key resolution
        article: article
      };
    });

    // Related articles (same category, excluding current)
    const relatedArticles = [];
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (a.id === article.id) continue;
      if (a.categoryId !== article.categoryId) continue;
      relatedArticles.push(a);
    }
    relatedArticles.sort((a, b) => {
      const da = this._parseDate(a.publishDate);
      const db = this._parseDate(b.publishDate);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });

    const related = relatedArticles.slice(0, 5).map((a) => {
      const cat = categoriesById[a.categoryId] || null;
      return {
        articleId: a.id,
        title: a.title,
        categoryName: cat ? cat.name : null,
        publishDate: a.publishDate,
        readingTimeMinutes: a.readingTimeMinutes
      };
    });

    // Build article object with resolved references
    const articleResult = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt || '',
      categoryId: article.categoryId,
      categoryName: category ? category.name : null,
      category: category,
      publishDate: article.publishDate,
      readingTimeMinutes: article.readingTimeMinutes,
      contentType: article.contentType,
      topics: Array.isArray(article.topics) ? article.topics : [],
      tags: Array.isArray(article.tags) ? article.tags : [],
      locationCity: article.locationCity || null,
      locationRegion: article.locationRegion || null,
      locationCountry: article.locationCountry || null,
      primaryLandmark: article.primaryLandmark || null,
      nearestCity: article.nearestCity || null,
      distanceFromNearestCityMiles: typeof article.distanceFromNearestCityMiles === 'number' ? article.distanceFromNearestCityMiles : null,
      trailLengthMiles: typeof article.trailLengthMiles === 'number' ? article.trailLengthMiles : null,
      estimatedTrailDurationHours: typeof article.estimatedTrailDurationHours === 'number' ? article.estimatedTrailDurationHours : null,
      difficulty: article.difficulty || null,
      skillLevel: article.skillLevel || null,
      averageRating: typeof article.averageRating === 'number' ? article.averageRating : null,
      ratingCount: typeof article.ratingCount === 'number' ? article.ratingCount : 0,
      likesCount: typeof article.likesCount === 'number' ? article.likesCount : 0,
      isFeatured: !!article.isFeatured,
      seriesId: article.seriesId || null,
      seriesTitle: series ? series.title : null,
      seriesPartNumber: typeof article.seriesPartNumber === 'number' ? article.seriesPartNumber : null,
      seriesPartLabel: article.seriesPartLabel || null,
      series: series
    };

    const authorResult = author
      ? {
          id: author.id,
          name: author.name,
          slug: author.slug || null,
          avatarUrl: author.avatarUrl || null,
          bio: author.bio || '',
          primaryTopics: Array.isArray(author.primaryTopics) ? author.primaryTopics : [],
          totalPostsCount: typeof author.totalPostsCount === 'number' ? author.totalPostsCount : 0,
          websiteUrl: author.websiteUrl || null,
          isFollowed: false
        }
      : null;

    if (authorResult) {
      const follows = this._getFromStorage('author_follows', []);
      for (let i = 0; i < follows.length; i++) {
        if (follows[i].authorId === authorResult.id) {
          authorResult.isFollowed = true;
          break;
        }
      }
    }

    // Instrumentation for task completion tracking (task_5)
    try {
      const categoryName = category ? category.name : null;
      const publishDateObj = this._parseDate(article.publishDate);
      const year = publishDateObj ? publishDateObj.getFullYear() : null;
      const tags = Array.isArray(article.tags) ? article.tags : [];
      const hasWildlifeTag =
        tags.indexOf('Wildlife gear') !== -1 || tags.indexOf('Wildlife photography gear') !== -1;

      if (categoryName === 'Photography' && year === 2023 && hasWildlifeTag) {
        const existingRaw = localStorage.getItem('task5_comparedArticleIds');
        let existingIds;
        try {
          existingIds = existingRaw ? JSON.parse(existingRaw) : [];
        } catch (e2) {
          existingIds = [];
        }
        if (!Array.isArray(existingIds)) {
          existingIds = [];
        }
        if (existingIds.indexOf(articleId) === -1) {
          existingIds.push(articleId);
          localStorage.setItem('task5_comparedArticleIds', JSON.stringify(existingIds));
        }
      }
    } catch (e) {
      console.error('Instrumentation error (task_5):', e);
    }

    return {
      article: articleResult,
      author: authorResult,
      readingState: {
        isBookmarked: isBookmarked,
        inReadingLists: inReadingLists,
        appliedReadingPreferences: {
          theme: readingPrefs.theme,
          fontSize: readingPrefs.fontSize,
          lineSpacing: readingPrefs.lineSpacing,
          showReadingProgressBar: readingPrefs.showReadingProgressBar
        }
      },
      commentsPreview: previewComments,
      relatedArticles: related
    };
  }

  // getCommentsForArticle(articleId, page, pageSize)
  getCommentsForArticle(articleId, page, pageSize) {
    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    const comments = this._getFromStorage('comments', []);
    const articles = this._getFromStorage('articles', []);

    let article = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        article = articles[i];
        break;
      }
    }

    const filtered = [];
    for (let i = 0; i < comments.length; i++) {
      if (comments[i].articleId === articleId) {
        filtered.push(comments[i]);
      }
    }

    filtered.sort((a, b) => {
      const da = this._parseDate(a.createdAt);
      const db = this._parseDate(b.createdAt);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return ta - tb;
    });

    const totalCount = filtered.length;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const endIndex = startIndex + effectivePageSize;
    const pageItems = filtered.slice(startIndex, endIndex);

    const items = pageItems.map(function (c) {
      return {
        id: c.id,
        articleId: c.articleId,
        content: c.content,
        createdAt: c.createdAt,
        status: c.status,
        article: article
      };
    });

    return {
      items: items,
      totalCount: totalCount,
      page: effectivePage,
      pageSize: effectivePageSize
    };
  }

  // addCommentToArticle(articleId, content)
  addCommentToArticle(articleId, content) {
    if (!articleId) {
      return { success: false, comment: null, message: 'articleId is required' };
    }
    const trimmedContent = String(content || '').trim();
    if (!trimmedContent) {
      return { success: false, comment: null, message: 'content is required' };
    }

    const articles = this._getFromStorage('articles', []);
    let exists = false;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      return { success: false, comment: null, message: 'Article not found' };
    }

    const comments = this._getFromStorage('comments', []);
    const now = this._dateToISO(new Date());
    const comment = {
      id: this._generateId('comment'),
      articleId: articleId,
      content: trimmedContent,
      createdAt: now,
      status: 'published'
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      comment: comment,
      message: 'Comment added successfully'
    };
  }

  // saveArticleItem(articleId, destinationType, source, readingListId, newReadingListName, newReadingListDescription)
  saveArticleItem(articleId, destinationType, source, readingListId, newReadingListName, newReadingListDescription) {
    if (!articleId) {
      return { success: false, message: 'articleId is required' };
    }
    if (!destinationType) {
      return { success: false, message: 'destinationType is required' };
    }

    const articles = this._getFromStorage('articles', []);
    let article = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        article = articles[i];
        break;
      }
    }
    if (!article) {
      return { success: false, message: 'Article not found' };
    }

    if (destinationType === 'saved_items') {
      let savedItems = this._getOrCreateSavedItemsCollection();
      let existing = null;
      for (let i = 0; i < savedItems.length; i++) {
        if (savedItems[i].articleId === articleId) {
          existing = savedItems[i];
          break;
        }
      }
      if (!existing) {
        existing = {
          id: this._generateId('saved_item'),
          articleId: articleId,
          savedAt: this._dateToISO(new Date()),
          source: source || 'article_page'
        };
        savedItems.push(existing);
        this._saveToStorage('saved_items', savedItems);
      }
      // Foreign key resolution for savedItem
      const savedItemWithArticle = {
        id: existing.id,
        articleId: existing.articleId,
        savedAt: existing.savedAt,
        source: existing.source,
        article: article
      };
      return {
        success: true,
        destinationType: 'saved_items',
        createdNewList: false,
        readingList: null,
        savedItem: savedItemWithArticle,
        totalItemsInDestination: savedItems.length,
        message: 'Article saved to default saved items'
      };
    }

    if (destinationType === 'reading_list') {
      let lists = this._getFromStorage('reading_lists', []);
      let list = null;
      let createdNewList = false;

      if (readingListId) {
        for (let i = 0; i < lists.length; i++) {
          if (lists[i].id === readingListId) {
            list = lists[i];
            break;
          }
        }
      }

      if (!list && newReadingListName) {
        const result = this._getOrCreateReadingListByName(newReadingListName);
        list = result.list;
        createdNewList = result.created;
        if (createdNewList && newReadingListDescription) {
          list.description = newReadingListDescription;
          list.updatedAt = this._dateToISO(new Date());
          // persist description update
          lists = this._getFromStorage('reading_lists', []);
          for (let i = 0; i < lists.length; i++) {
            if (lists[i].id === list.id) {
              lists[i] = list;
              break;
            }
          }
          this._saveToStorage('reading_lists', lists);
        }
      }

      if (!list) {
        const result = this._getOrCreateReadingListByName('Untitled list');
        list = result.list;
        createdNewList = result.created;
      }

      let rlItems = this._getFromStorage('reading_list_items', []);
      let exists = false;
      for (let i = 0; i < rlItems.length; i++) {
        if (rlItems[i].readingListId === list.id && rlItems[i].articleId === articleId) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        rlItems.push({
          id: this._generateId('reading_list_item'),
          readingListId: list.id,
          articleId: articleId,
          addedAt: this._dateToISO(new Date())
        });
        this._saveToStorage('reading_list_items', rlItems);
      }

      // Recalculate itemsCount for this list
      let count = 0;
      for (let i = 0; i < rlItems.length; i++) {
        if (rlItems[i].readingListId === list.id) count++;
      }

      list.updatedAt = this._dateToISO(new Date());
      // persist updatedAt
      let lists2 = this._getFromStorage('reading_lists', []);
      for (let i = 0; i < lists2.length; i++) {
        if (lists2[i].id === list.id) {
          lists2[i] = list;
          break;
        }
      }
      this._saveToStorage('reading_lists', lists2);

      const readingListResult = {
        id: list.id,
        name: list.name,
        description: list.description || '',
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        itemsCount: count
      };

      return {
        success: true,
        destinationType: 'reading_list',
        createdNewList: createdNewList,
        readingList: readingListResult,
        savedItem: null,
        totalItemsInDestination: count,
        message: 'Article saved to reading list'
      };
    }

    return {
      success: false,
      message: 'Unsupported destinationType'
    };
  }

  // getReadingListsOverview()
  getReadingListsOverview() {
    const lists = this._getFromStorage('reading_lists', []);
    const items = this._getFromStorage('reading_list_items', []);

    const counts = {};
    for (let i = 0; i < items.length; i++) {
      const rlId = items[i].readingListId;
      counts[rlId] = (counts[rlId] || 0) + 1;
    }

    return lists.map(function (l) {
      return {
        id: l.id,
        name: l.name,
        description: l.description || '',
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
        itemsCount: counts[l.id] || 0
      };
    });
  }

  // getReadingListDetail(readingListId)
  getReadingListDetail(readingListId) {
    const lists = this._getFromStorage('reading_lists', []);
    const rlItems = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('categories', []);

    const categoriesById = this._indexById(categories);
    const articlesById = this._indexById(articles);

    let list = null;
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].id === readingListId) {
        list = lists[i];
        break;
      }
    }

    if (!list) {
      return {
        readingList: null,
        items: []
      };
    }

    const items = [];
    for (let i = 0; i < rlItems.length; i++) {
      const item = rlItems[i];
      if (item.readingListId !== readingListId) continue;
      const article = articlesById[item.articleId] || null;
      const category = article ? categoriesById[article.categoryId] || null : null;
      items.push({
        readingListItemId: item.id,
        articleId: article ? article.id : item.articleId,
        title: article ? article.title : null,
        categoryName: category ? category.name : null,
        publishDate: article ? article.publishDate : null,
        readingTimeMinutes: article ? article.readingTimeMinutes : null,
        contentType: article ? article.contentType : null,
        addedAt: item.addedAt,
        article: article
      });
    }

    return {
      readingList: {
        id: list.id,
        name: list.name,
        description: list.description || '',
        createdAt: list.createdAt,
        updatedAt: list.updatedAt
      },
      items: items
    };
  }

  // renameReadingList(readingListId, newName)
  renameReadingList(readingListId, newName) {
    const lists = this._getFromStorage('reading_lists', []);
    let list = null;
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].id === readingListId) {
        list = lists[i];
        break;
      }
    }
    if (!list) {
      return { success: false, readingList: null, message: 'Reading list not found' };
    }
    list.name = String(newName || '').trim() || list.name;
    list.updatedAt = this._dateToISO(new Date());
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].id === list.id) {
        lists[i] = list;
        break;
      }
    }
    this._saveToStorage('reading_lists', lists);
    return {
      success: true,
      readingList: {
        id: list.id,
        name: list.name,
        description: list.description || '',
        updatedAt: list.updatedAt
      },
      message: 'Reading list renamed'
    };
  }

  // deleteReadingList(readingListId)
  deleteReadingList(readingListId) {
    let lists = this._getFromStorage('reading_lists', []);
    let rlItems = this._getFromStorage('reading_list_items', []);

    const originalLength = lists.length;
    lists = lists.filter(function (l) {
      return l.id !== readingListId;
    });
    rlItems = rlItems.filter(function (i) {
      return i.readingListId !== readingListId;
    });

    this._persistState({
      reading_lists: lists,
      reading_list_items: rlItems
    });

    const success = lists.length < originalLength;
    return {
      success: success,
      message: success ? 'Reading list deleted' : 'Reading list not found'
    };
  }

  // removeArticleFromReadingList(readingListItemId)
  removeArticleFromReadingList(readingListItemId) {
    let rlItems = this._getFromStorage('reading_list_items', []);
    let readingListId = null;
    for (let i = 0; i < rlItems.length; i++) {
      if (rlItems[i].id === readingListItemId) {
        readingListId = rlItems[i].readingListId;
        break;
      }
    }

    if (!readingListId) {
      return { success: false, remainingItemsCount: 0, message: 'Reading list item not found' };
    }

    rlItems = rlItems.filter(function (i) {
      return i.id !== readingListItemId;
    });
    this._saveToStorage('reading_list_items', rlItems);

    let remaining = 0;
    for (let i = 0; i < rlItems.length; i++) {
      if (rlItems[i].readingListId === readingListId) remaining++;
    }

    // Update list updatedAt
    let lists = this._getFromStorage('reading_lists', []);
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].id === readingListId) {
        lists[i].updatedAt = this._dateToISO(new Date());
        break;
      }
    }
    this._saveToStorage('reading_lists', lists);

    return {
      success: true,
      remainingItemsCount: remaining,
      message: 'Article removed from reading list'
    };
  }

  // getSavedItems()
  getSavedItems() {
    const savedItems = this._getOrCreateSavedItemsCollection();
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('categories', []);

    const articlesById = this._indexById(articles);
    const categoriesById = this._indexById(categories);

    return savedItems.map(function (s) {
      const article = articlesById[s.articleId] || null;
      const category = article ? categoriesById[article.categoryId] || null : null;
      return {
        savedItemId: s.id,
        articleId: s.articleId,
        title: article ? article.title : null,
        categoryName: category ? category.name : null,
        publishDate: article ? article.publishDate : null,
        readingTimeMinutes: article ? article.readingTimeMinutes : null,
        contentType: article ? article.contentType : null,
        savedAt: s.savedAt,
        source: s.source,
        article: article
      };
    });
  }

  // moveSavedItemToReadingList(savedItemId, readingListId, newReadingListName)
  moveSavedItemToReadingList(savedItemId, readingListId, newReadingListName) {
    let savedItems = this._getOrCreateSavedItemsCollection();
    const articles = this._getFromStorage('articles', []);

    let savedItem = null;
    for (let i = 0; i < savedItems.length; i++) {
      if (savedItems[i].id === savedItemId) {
        savedItem = savedItems[i];
        break;
      }
    }
    if (!savedItem) {
      return { success: false, readingList: null, removedSavedItem: false, message: 'Saved item not found' };
    }

    let article = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === savedItem.articleId) {
        article = articles[i];
        break;
      }
    }
    if (!article) {
      return { success: false, readingList: null, removedSavedItem: false, message: 'Article for saved item not found' };
    }

    let lists = this._getFromStorage('reading_lists', []);
    let list = null;
    if (readingListId) {
      for (let i = 0; i < lists.length; i++) {
        if (lists[i].id === readingListId) {
          list = lists[i];
          break;
        }
      }
    }

    if (!list) {
      const result = this._getOrCreateReadingListByName(newReadingListName || 'Untitled list');
      list = result.list;
      lists = this._getFromStorage('reading_lists', []);
    }

    let rlItems = this._getFromStorage('reading_list_items', []);
    let exists = false;
    for (let i = 0; i < rlItems.length; i++) {
      if (rlItems[i].readingListId === list.id && rlItems[i].articleId === article.id) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      rlItems.push({
        id: this._generateId('reading_list_item'),
        readingListId: list.id,
        articleId: article.id,
        addedAt: this._dateToISO(new Date())
      });
      this._saveToStorage('reading_list_items', rlItems);
    }

    // Remove saved item
    savedItems = savedItems.filter(function (s) {
      return s.id !== savedItemId;
    });
    this._saveToStorage('saved_items', savedItems);

    // Calculate list items count
    let count = 0;
    for (let i = 0; i < rlItems.length; i++) {
      if (rlItems[i].readingListId === list.id) count++;
    }

    const readingListResult = {
      id: list.id,
      name: list.name,
      itemsCount: count
    };

    return {
      success: true,
      readingList: readingListResult,
      removedSavedItem: true,
      message: 'Saved item moved to reading list'
    };
  }

  // removeSavedItem(savedItemId)
  removeSavedItem(savedItemId) {
    let savedItems = this._getOrCreateSavedItemsCollection();
    const originalLength = savedItems.length;
    savedItems = savedItems.filter(function (s) {
      return s.id !== savedItemId;
    });
    this._saveToStorage('saved_items', savedItems);
    const success = savedItems.length < originalLength;
    return {
      success: success,
      message: success ? 'Saved item removed' : 'Saved item not found'
    };
  }

  // getSearchFilterOptions(query)
  getSearchFilterOptions(query) {
    const articles = this._getFromStorage('articles', []);
    const topics = this._getFromStorage('topics', []);

    // Optionally limit articles by query for contextual filters
    const filtered = [];
    if (query) {
      for (let i = 0; i < articles.length; i++) {
        const a = articles[i];
        if (this._stringIncludes(a.title, query) || this._stringIncludes(a.excerpt, query) || this._stringIncludes(a.content, query)) {
          filtered.push(a);
        }
      }
    } else {
      for (let i = 0; i < articles.length; i++) filtered.push(articles[i]);
    }

    let minRT = null;
    let maxRT = null;
    let earliest = null;
    let latest = null;
    const contentTypesSet = {};

    for (let i = 0; i < filtered.length; i++) {
      const a = filtered[i];
      if (typeof a.readingTimeMinutes === 'number') {
        if (minRT === null || a.readingTimeMinutes < minRT) minRT = a.readingTimeMinutes;
        if (maxRT === null || a.readingTimeMinutes > maxRT) maxRT = a.readingTimeMinutes;
      }
      const d = this._parseDate(a.publishDate);
      if (d) {
        const t = d.getTime();
        if (earliest === null || t < earliest) earliest = t;
        if (latest === null || t > latest) latest = t;
      }
      if (a.contentType) contentTypesSet[a.contentType] = true;
    }

    const contentTypes = Object.keys(contentTypesSet);

    return {
      readingTimeRange: {
        min: minRT === null ? 0 : minRT,
        max: maxRT === null ? 0 : maxRT
      },
      dateRange: {
        earliest: earliest === null ? null : new Date(earliest).toISOString(),
        latest: latest === null ? null : new Date(latest).toISOString()
      },
      topics: topics.map(function (t) {
        return {
          id: t.id,
          name: t.name,
          description: t.description || ''
        };
      }),
      contentTypes: contentTypes
    };
  }

  // searchContent(query, filters, sort, page, pageSize)
  searchContent(query, filters, sort, page, pageSize) {
    const q = String(query || '').trim();
    const effectiveFilters = filters || {};
    const effectiveSort = sort || 'relevance';

    // Instrumentation for task completion tracking (task_6)
    try {
      const normalizedQuery = String(query || '').toLowerCase();
      if (normalizedQuery.indexOf('birdwatching tips') !== -1) {
        const toStore = {
          query: q,
          filters: {
            minReadingTimeMinutes:
              typeof effectiveFilters.minReadingTimeMinutes === 'number'
                ? effectiveFilters.minReadingTimeMinutes
                : null,
            maxReadingTimeMinutes:
              typeof effectiveFilters.maxReadingTimeMinutes === 'number'
                ? effectiveFilters.maxReadingTimeMinutes
                : null,
            startDate: effectiveFilters.startDate || null,
            endDate: effectiveFilters.endDate || null,
            topicIds: Array.isArray(effectiveFilters.topicIds) ? effectiveFilters.topicIds.slice() : [],
            contentTypes: Array.isArray(effectiveFilters.contentTypes) ? effectiveFilters.contentTypes.slice() : []
          },
          sort: effectiveSort
        };
        localStorage.setItem('task6_searchParams', JSON.stringify(toStore));
      }
    } catch (e) {
      console.error('Instrumentation error (task_6):', e);
    }

    const effectivePage = typeof page === 'number' && page > 0 ? page : 1;
    const effectivePageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    const articles = this._getFromStorage('articles', []);
    const seriesList = this._getFromStorage('series', []);

    const results = [];

    // Article matches
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];

      if (q) {
        const matches =
          this._stringIncludes(a.title, q) ||
          this._stringIncludes(a.excerpt, q) ||
          this._stringIncludes(a.content, q);
        if (!matches) continue;
      }

      // Apply filters
      if (typeof effectiveFilters.minReadingTimeMinutes === 'number') {
        if (typeof a.readingTimeMinutes !== 'number' || a.readingTimeMinutes < effectiveFilters.minReadingTimeMinutes) continue;
      }
      if (typeof effectiveFilters.maxReadingTimeMinutes === 'number') {
        if (typeof a.readingTimeMinutes !== 'number' || a.readingTimeMinutes > effectiveFilters.maxReadingTimeMinutes) continue;
      }
      if (effectiveFilters.startDate) {
        const start = this._parseDate(effectiveFilters.startDate);
        const pub = this._parseDate(a.publishDate);
        if (start && pub && pub.getTime() < start.getTime()) continue;
      }
      if (effectiveFilters.endDate) {
        const end = this._parseDate(effectiveFilters.endDate);
        const pub2 = this._parseDate(a.publishDate);
        if (end && pub2 && pub2.getTime() > end.getTime()) continue;
      }
      if (Array.isArray(effectiveFilters.topicIds) && effectiveFilters.topicIds.length > 0) {
        const articleTopics = Array.isArray(a.topics) ? a.topics : [];
        if (!this._arraysIntersect(articleTopics, effectiveFilters.topicIds)) continue;
      }
      if (Array.isArray(effectiveFilters.contentTypes) && effectiveFilters.contentTypes.length > 0) {
        if (effectiveFilters.contentTypes.indexOf(a.contentType) === -1) continue;
      }
      if (typeof effectiveFilters.minLikesCount === 'number') {
        const likes = typeof a.likesCount === 'number' ? a.likesCount : 0;
        if (likes < effectiveFilters.minLikesCount) continue;
      }

      results.push({
        resultType: 'article',
        article: {
          articleId: a.id,
          title: a.title,
          excerpt: a.excerpt || '',
          categoryName: null,
          publishDate: a.publishDate,
          readingTimeMinutes: a.readingTimeMinutes,
          contentType: a.contentType,
          authorName: null,
          isBookmarked: false
        },
        series: null,
        matchedSnippet: a.excerpt || ''
      });
    }

    // Series matches
    for (let i = 0; i < seriesList.length; i++) {
      const s = seriesList[i];
      if (q) {
        const matches = this._stringIncludes(s.title, q) || this._stringIncludes(s.description, q);
        if (!matches) continue;
      }
      results.push({
        resultType: 'series',
        article: null,
        series: {
          seriesId: s.id,
          title: s.title,
          slug: s.slug,
          description: s.description || '',
          coverImageUrl: s.coverImageUrl || ''
        },
        matchedSnippet: s.description || ''
      });
    }

    // Enrich article results with categoryName, authorName, bookmark state
    const categories = this._getFromStorage('categories', []);
    const authors = this._getFromStorage('authors', []);
    const savedItems = this._getOrCreateSavedItemsCollection();

    const categoriesById = this._indexById(categories);
    const authorsById = this._indexById(authors);

    const savedIdsSet = {};
    for (let i = 0; i < savedItems.length; i++) {
      savedIdsSet[savedItems[i].articleId] = true;
    }

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.resultType === 'article') {
        const articleId = r.article.articleId;
        const article = (function () {
          for (let j = 0; j < articles.length; j++) {
            if (articles[j].id === articleId) return articles[j];
          }
          return null;
        })();
        if (article) {
          const cat = categoriesById[article.categoryId] || null;
          const auth = authorsById[article.authorId] || null;
          r.article.categoryName = cat ? cat.name : null;
          r.article.authorName = auth ? auth.name : null;
          r.article.isBookmarked = !!savedIdsSet[articleId];
        }
      }
    }

    // Sorting
    results.sort((a, b) => {
      if (effectiveSort === 'date_desc') {
        const pa = a.resultType === 'article' ? this._parseDate(a.article.publishDate) : null;
        const pb = b.resultType === 'article' ? this._parseDate(b.article.publishDate) : null;
        const ta = pa ? pa.getTime() : 0;
        const tb = pb ? pb.getTime() : 0;
        return tb - ta;
      }
      if (effectiveSort === 'date_asc') {
        const pa = a.resultType === 'article' ? this._parseDate(a.article.publishDate) : null;
        const pb = b.resultType === 'article' ? this._parseDate(b.article.publishDate) : null;
        const ta = pa ? pa.getTime() : 0;
        const tb = pb ? pb.getTime() : 0;
        return ta - tb;
      }
      if (effectiveSort === 'likes_desc') {
        const la = a.resultType === 'article'
          ? (function () {
              const art = (function () {
                for (let j = 0; j < articles.length; j++) {
                  if (articles[j].id === a.article.articleId) return articles[j];
                }
                return null;
              })();
              return art && typeof art.likesCount === 'number' ? art.likesCount : 0;
            })()
          : 0;
        const lb = b.resultType === 'article'
          ? (function () {
              const art = (function () {
                for (let j = 0; j < articles.length; j++) {
                  if (articles[j].id === b.article.articleId) return articles[j];
                }
                return null;
              })();
              return art && typeof art.likesCount === 'number' ? art.likesCount : 0;
            })()
          : 0;
        return lb - la;
      }
      // default 'relevance': keep insertion order (already grouped by query match)
      return 0;
    });

    const totalCount = results.length;
    const startIndex = (effectivePage - 1) * effectivePageSize;
    const endIndex = startIndex + effectivePageSize;
    const pageItems = results.slice(startIndex, endIndex);

    return {
      items: pageItems,
      totalCount: totalCount,
      page: effectivePage,
      pageSize: effectivePageSize
    };
  }

  // getSeriesDetails(seriesId, year, month)
  getSeriesDetails(seriesId, year, month) {
    const seriesList = this._getFromStorage('series', []);
    const articles = this._getFromStorage('articles', []);

    let series = null;
    for (let i = 0; i < seriesList.length; i++) {
      if (seriesList[i].id === seriesId) {
        series = seriesList[i];
        break;
      }
    }

    if (!series) {
      return {
        series: null,
        entries: [],
        filteredYear: year || null,
        filteredMonth: month || null
      };
    }

    const entries = [];
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (a.seriesId !== seriesId) continue;
      const pub = this._parseDate(a.publishDate);
      if (year && pub && pub.getFullYear() !== year) continue;
      if (month && pub && pub.getMonth() + 1 !== month) continue;
      entries.push({
        articleId: a.id,
        title: a.title,
        seriesPartNumber: typeof a.seriesPartNumber === 'number' ? a.seriesPartNumber : null,
        seriesPartLabel: a.seriesPartLabel || null,
        publishDate: a.publishDate,
        readingTimeMinutes: a.readingTimeMinutes,
        article: a
      });
    }

    return {
      series: {
        id: series.id,
        title: series.title,
        slug: series.slug,
        description: series.description || '',
        coverImageUrl: series.coverImageUrl || '',
        createdAt: series.createdAt || null,
        updatedAt: series.updatedAt || null
      },
      entries: entries,
      filteredYear: year || null,
      filteredMonth: month || null
    };
  }

  // getAuthorProfile(authorId)
  getAuthorProfile(authorId) {
    const authors = this._getFromStorage('authors', []);
    const articles = this._getFromStorage('articles', []);
    const follows = this._getFromStorage('author_follows', []);

    let author = null;
    for (let i = 0; i < authors.length; i++) {
      if (authors[i].id === authorId) {
        author = authors[i];
        break;
      }
    }
    if (!author) {
      return {
        author: null,
        isFollowed: false,
        followSettings: null,
        recentArticles: []
      };
    }

    let followRecord = null;
    for (let i = 0; i < follows.length; i++) {
      if (follows[i].authorId === authorId) {
        followRecord = follows[i];
        break;
      }
    }

    const recentArticles = [];
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].authorId === authorId) {
        recentArticles.push(articles[i]);
      }
    }
    recentArticles.sort((a, b) => {
      const da = this._parseDate(a.publishDate);
      const db = this._parseDate(b.publishDate);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });

    const recent = recentArticles.slice(0, 20).map(function (a) {
      return {
        articleId: a.id,
        title: a.title,
        categoryName: null,
        publishDate: a.publishDate,
        readingTimeMinutes: a.readingTimeMinutes
      };
    });

    return {
      author: {
        id: author.id,
        name: author.name,
        slug: author.slug || null,
        avatarUrl: author.avatarUrl || null,
        bio: author.bio || '',
        primaryTopics: Array.isArray(author.primaryTopics) ? author.primaryTopics : [],
        totalPostsCount: typeof author.totalPostsCount === 'number' ? author.totalPostsCount : 0,
        websiteUrl: author.websiteUrl || null
      },
      isFollowed: !!followRecord,
      followSettings: followRecord
        ? {
            updateChannel: followRecord.updateChannel,
            receiveNotifications: followRecord.receiveNotifications
          }
        : null,
      recentArticles: recent
    };
  }

  // followAuthor(authorId, updateChannel, receiveNotifications)
  followAuthor(authorId, updateChannel, receiveNotifications) {
    if (!authorId) {
      return { success: false, follow: null, message: 'authorId is required' };
    }
    const validChannel = updateChannel === 'email' ? 'email' : 'onsite';
    const receive = !!receiveNotifications;

    const follow = this._getOrCreateAuthorFollowRecord(authorId);
    follow.updateChannel = validChannel;
    follow.receiveNotifications = receive;

    let follows = this._getFromStorage('author_follows', []);
    let found = false;
    for (let i = 0; i < follows.length; i++) {
      if (follows[i].id === follow.id) {
        follows[i] = follow;
        found = true;
        break;
      }
    }
    if (!found) {
      follows.push(follow);
    }
    this._saveToStorage('author_follows', follows);

    return {
      success: true,
      follow: follow,
      message: 'Author follow settings updated'
    };
  }

  // getSettingsPageData()
  getSettingsPageData() {
    const topics = this._getFromStorage('topics', []);
    const feedPrefs = this._getOrCreateFeedPreferences();
    const readingPrefs = this._getOrCreateReadingPreferences();

    return {
      topics: topics.map(function (t) {
        return {
          id: t.id,
          name: t.name,
          description: t.description || ''
        };
      }),
      feedPreferences: {
        selectedTopicIds: Array.isArray(feedPrefs.selectedTopicIds) ? feedPrefs.selectedTopicIds.slice() : [],
        topicPriorityOrder: Array.isArray(feedPrefs.topicPriorityOrder) ? feedPrefs.topicPriorityOrder.slice() : [],
        minPublishDate: feedPrefs.minPublishDate || null,
        maxReadingTimeMinutes: typeof feedPrefs.maxReadingTimeMinutes === 'number' ? feedPrefs.maxReadingTimeMinutes : null,
        includedContentTypes: Array.isArray(feedPrefs.includedContentTypes) ? feedPrefs.includedContentTypes.slice() : [],
        lastUpdatedAt: feedPrefs.lastUpdatedAt
      },
      readingPreferences: {
        theme: readingPrefs.theme,
        fontSize: readingPrefs.fontSize,
        lineSpacing: readingPrefs.lineSpacing,
        showReadingProgressBar: readingPrefs.showReadingProgressBar,
        lastUpdatedAt: readingPrefs.lastUpdatedAt
      }
    };
  }

  // saveUserPreferences(feedPreferences, readingPreferences)
  saveUserPreferences(feedPreferences, readingPreferences) {
    let feedPrefs = this._getOrCreateFeedPreferences();
    let readingPrefs = this._getOrCreateReadingPreferences();
    const now = this._dateToISO(new Date());

    if (feedPreferences && typeof feedPreferences === 'object') {
      if (Array.isArray(feedPreferences.selectedTopicIds)) {
        feedPrefs.selectedTopicIds = feedPreferences.selectedTopicIds.slice();
      }
      if (Array.isArray(feedPreferences.topicPriorityOrder)) {
        feedPrefs.topicPriorityOrder = feedPreferences.topicPriorityOrder.slice();
      }
      if (typeof feedPreferences.minPublishDate === 'string' || feedPreferences.minPublishDate === null) {
        feedPrefs.minPublishDate = feedPreferences.minPublishDate;
      }
      if (typeof feedPreferences.maxReadingTimeMinutes === 'number' || feedPreferences.maxReadingTimeMinutes === null) {
        feedPrefs.maxReadingTimeMinutes = feedPreferences.maxReadingTimeMinutes;
      }
      if (Array.isArray(feedPreferences.includedContentTypes)) {
        feedPrefs.includedContentTypes = feedPreferences.includedContentTypes.slice();
      }
      feedPrefs.lastUpdatedAt = now;
      this._saveFeedPreferences(feedPrefs);
    }

    if (readingPreferences && typeof readingPreferences === 'object') {
      if (readingPreferences.theme) {
        if (readingPreferences.theme === 'light' || readingPreferences.theme === 'sepia' || readingPreferences.theme === 'dark') {
          readingPrefs.theme = readingPreferences.theme;
        }
      }
      if (readingPreferences.fontSize) {
        if (readingPreferences.fontSize === 'small' || readingPreferences.fontSize === 'medium' || readingPreferences.fontSize === 'large') {
          readingPrefs.fontSize = readingPreferences.fontSize;
        }
      }
      if (readingPreferences.lineSpacing) {
        if (readingPreferences.lineSpacing === 'normal' || readingPreferences.lineSpacing === 'increased' || readingPreferences.lineSpacing === 'extra') {
          readingPrefs.lineSpacing = readingPreferences.lineSpacing;
        }
      }
      if (typeof readingPreferences.showReadingProgressBar === 'boolean') {
        readingPrefs.showReadingProgressBar = readingPreferences.showReadingProgressBar;
      }
      readingPrefs.lastUpdatedAt = now;
      this._saveReadingPreferences(readingPrefs);
    }

    return {
      success: true,
      feedPreferences: feedPrefs,
      readingPreferences: readingPrefs,
      message: 'Preferences saved'
    };
  }

  // getReadingPreferences()
  getReadingPreferences() {
    const prefs = this._getOrCreateReadingPreferences();
    return {
      theme: prefs.theme,
      fontSize: prefs.fontSize,
      lineSpacing: prefs.lineSpacing,
      showReadingProgressBar: prefs.showReadingProgressBar
    };
  }

  // getArchiveFilterOptions(year, month)
  getArchiveFilterOptions(year, month) {
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);

    const availableYearsSet = {};
    const availableMonthsSet = {};
    const categoryIdsSet = {};
    const tagNamesSet = {};

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      const d = this._parseDate(a.publishDate);
      if (!d) continue;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;

      if (year && y !== year) continue;
      if (month && m !== month) continue;

      availableYearsSet[y] = true;
      availableMonthsSet[m] = true;

      if (a.categoryId) categoryIdsSet[a.categoryId] = true;

      if (Array.isArray(a.tags)) {
        for (let t = 0; t < a.tags.length; t++) {
          tagNamesSet[a.tags[t]] = true;
        }
      }
    }

    const availableYears = Object.keys(availableYearsSet)
      .map(function (y) {
        return parseInt(y, 10);
      })
      .sort(function (a, b) {
        return a - b;
      });

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    const availableMonths = Object.keys(availableMonthsSet)
      .map(function (m) {
        const mi = parseInt(m, 10);
        return {
          month: mi,
          label: monthNames[mi - 1]
        };
      })
      .sort(function (a, b) {
        return a.month - b.month;
      });

    const categoriesById = this._indexById(categories);
    const availableCategories = Object.keys(categoryIdsSet).map(function (id) {
      const c = categoriesById[id];
      return {
        id: id,
        name: c ? c.name : id
      };
    });

    const availableTags = [];
    const tagNames = Object.keys(tagNamesSet);
    for (let i = 0; i < tagNames.length; i++) {
      const name = tagNames[i];
      let tagObj = null;
      for (let j = 0; j < tags.length; j++) {
        if (tags[j].name === name) {
          tagObj = tags[j];
          break;
        }
      }
      if (!tagObj) {
        const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        tagObj = { id: slug || name, name: name, slug: slug || name };
      }
      availableTags.push(tagObj);
    }

    return {
      availableYears: availableYears,
      availableMonths: availableMonths,
      availableCategories: availableCategories,
      availableTags: availableTags
    };
  }

  // getArchivePosts(year, month, filters, sort)
  getArchivePosts(year, month, filters, sort) {
    const effectiveFilters = filters || {};
    const effectiveSort = sort || 'date_desc';

    const articles = this._getFromStorage('articles', []);

    const items = [];
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      const d = this._parseDate(a.publishDate);
      if (!d) continue;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      if (y !== year || m !== month) continue;

      if (effectiveFilters.categoryId && a.categoryId !== effectiveFilters.categoryId) continue;

      if (Array.isArray(effectiveFilters.tagNames) && effectiveFilters.tagNames.length > 0) {
        const articleTags = Array.isArray(a.tags) ? a.tags : [];
        if (!this._arraysIntersect(articleTags, effectiveFilters.tagNames)) continue;
      }

      if (Array.isArray(effectiveFilters.topicIds) && effectiveFilters.topicIds.length > 0) {
        const articleTopics = Array.isArray(a.topics) ? a.topics : [];
        if (!this._arraysIntersect(articleTopics, effectiveFilters.topicIds)) continue;
      }

      items.push(a);
    }

    items.sort((a, b) => {
      if (effectiveSort === 'date_asc') {
        const da = this._parseDate(a.publishDate);
        const db = this._parseDate(b.publishDate);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return ta - tb;
      }
      if (effectiveSort === 'most_liked') {
        const la = typeof a.likesCount === 'number' ? a.likesCount : 0;
        const lb = typeof b.likesCount === 'number' ? b.likesCount : 0;
        return lb - la;
      }
      // default date_desc
      const da2 = this._parseDate(a.publishDate);
      const db2 = this._parseDate(b.publishDate);
      const ta2 = da2 ? da2.getTime() : 0;
      const tb2 = db2 ? db2.getTime() : 0;
      return tb2 - ta2;
    });

    const resultItems = items.map(function (a) {
      return {
        articleId: a.id,
        title: a.title,
        categoryName: null,
        publishDate: a.publishDate,
        readingTimeMinutes: a.readingTimeMinutes,
        contentType: a.contentType,
        tags: Array.isArray(a.tags) ? a.tags : []
      };
    });

    return {
      items: resultItems,
      totalCount: resultItems.length
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored && typeof stored === 'object') {
      return {
        title: stored.title || '',
        mission: stored.mission || '',
        themes: Array.isArray(stored.themes) ? stored.themes : [],
        authorBio: stored.authorBio || '',
        readingListsInfo: stored.readingListsInfo || ''
      };
    }
    return {
      title: '',
      mission: '',
      themes: [],
      authorBio: '',
      readingListsInfo: ''
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    const stored = this._getFromStorage('contact_page_content', null);
    if (stored && typeof stored === 'object') {
      return {
        introText: stored.introText || '',
        allowedInquiryTypes: Array.isArray(stored.allowedInquiryTypes) ? stored.allowedInquiryTypes : [],
        contactEmail: stored.contactEmail || ''
      };
    }
    return {
      introText: '',
      allowedInquiryTypes: [],
      contactEmail: ''
    };
  }

  // submitContactMessage(name, email, subject, message)
  submitContactMessage(name, email, subject, message) {
    const trimmedName = String(name || '').trim();
    const trimmedEmail = String(email || '').trim();
    const trimmedSubject = String(subject || '').trim();
    const trimmedMessage = String(message || '').trim();

    if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      return {
        success: false,
        messageId: null,
        message: 'All fields are required'
      };
    }

    const messages = this._getFromStorage('contact_messages', []);
    const msg = {
      id: this._generateId('contact_message'),
      name: trimmedName,
      email: trimmedEmail,
      subject: trimmedSubject,
      message: trimmedMessage,
      createdAt: this._dateToISO(new Date())
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      messageId: msg.id,
      message: 'Message submitted'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_policy_content', null);
    if (stored && Array.isArray(stored.sections)) {
      return {
        sections: stored.sections
      };
    }
    return {
      sections: []
    };
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const stored = this._getFromStorage('terms_and_conditions_content', null);
    if (stored && Array.isArray(stored.sections)) {
      return {
        sections: stored.sections
      };
    }
    return {
      sections: []
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