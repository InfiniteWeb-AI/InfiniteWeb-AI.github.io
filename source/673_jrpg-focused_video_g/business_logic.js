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

  // ---------------------------
  // Initialization & Storage
  // ---------------------------
  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entities
    ensure('games', []); // Game
    ensure('articles', []); // Article
    ensure('top_list_entries', []); // TopListEntry
    ensure('comments', []); // Comment

    // Single-user library & collections
    ensure('reading_list_items', []); // ReadingListItem
    ensure('wishlist_items', []); // WishlistItem
    ensure('bookmark_items', []); // BookmarkItem
    ensure('followed_release_items', []); // FollowedReleaseItem
    ensure('collections', []); // Collection
    ensure('collection_items', []); // CollectionItem
    ensure('article_ratings', []); // ArticleRating
    ensure('newsletter_subscriptions', []); // NewsletterSubscription

    // Misc supporting tables
    ensure('static_pages', []); // simple {slug,title,body,lastUpdatedAt}
    ensure('contact_messages', []); // stored contact form submissions

    // ID counter
    if (localStorage.getItem('idCounter') === null) {
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

  // ---------------------------
  // Generic helpers
  // ---------------------------
  _normalizeString(str) {
    return (str == null ? '' : String(str)).toLowerCase();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareDatesDesc(a, b) {
    const da = this._parseDate(a);
    const db = this._parseDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db.getTime() - da.getTime();
  }

  _labelFromEnum(value) {
    if (!value) return '';
    return String(value)
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _getPlatformLabel(value) {
    switch (value) {
      case 'nintendo_switch': return 'Nintendo Switch';
      case 'ps5': return 'PS5';
      case 'ps4': return 'PS4';
      case 'pc': return 'PC';
      case 'xbox_series_x': return 'Xbox Series X';
      case 'xbox_one': return 'Xbox One';
      default: return value || '';
    }
  }

  // Basic article filter/sort helper used in several interfaces
  _filterAndSortArticles(articles, filterFn, sortBy, options = {}) {
    const filtered = typeof filterFn === 'function' ? articles.filter(filterFn) : articles.slice();

    const sortKey = sortBy || options.defaultSort || 'most_recent';

    const getRating = (a) => (typeof a.ratingStars === 'number' ? a.ratingStars : 0);
    const getHelpfulness = (a) => (typeof a.helpfulnessRating === 'number' ? a.helpfulnessRating : 0);
    const getPopularity = (a) => (typeof a.popularityScore === 'number' ? a.popularityScore : 0);

    filtered.sort((a, b) => {
      if (sortKey === 'rating_desc') {
        const diff = getRating(b) - getRating(a);
        if (diff !== 0) return diff;
        return this._compareDatesDesc(a.publishedAt, b.publishedAt);
      }
      if (sortKey === 'helpfulness_rating_desc') {
        const diff = getHelpfulness(b) - getHelpfulness(a);
        if (diff !== 0) return diff;
        return this._compareDatesDesc(a.publishedAt, b.publishedAt);
      }
      if (sortKey === 'popularity_desc') {
        const diff = getPopularity(b) - getPopularity(a);
        if (diff !== 0) return diff;
        return this._compareDatesDesc(a.publishedAt, b.publishedAt);
      }
      // default 'most_recent'
      return this._compareDatesDesc(a.publishedAt, b.publishedAt);
    });

    return filtered;
  }

  // ---------------------------
  // Single-user state helpers
  // ---------------------------
  _loadSingleUserState() {
    return {
      readingListItems: this._getFromStorage('reading_list_items'),
      wishlistItems: this._getFromStorage('wishlist_items'),
      bookmarkItems: this._getFromStorage('bookmark_items'),
      followedReleaseItems: this._getFromStorage('followed_release_items'),
      collections: this._getFromStorage('collections'),
      collectionItems: this._getFromStorage('collection_items'),
      articleRatings: this._getFromStorage('article_ratings'),
      newsletterSubscriptions: this._getFromStorage('newsletter_subscriptions')
    };
  }

  _persistSingleUserState(state) {
    if (state.readingListItems) this._saveToStorage('reading_list_items', state.readingListItems);
    if (state.wishlistItems) this._saveToStorage('wishlist_items', state.wishlistItems);
    if (state.bookmarkItems) this._saveToStorage('bookmark_items', state.bookmarkItems);
    if (state.followedReleaseItems) this._saveToStorage('followed_release_items', state.followedReleaseItems);
    if (state.collections) this._saveToStorage('collections', state.collections);
    if (state.collectionItems) this._saveToStorage('collection_items', state.collectionItems);
    if (state.articleRatings) this._saveToStorage('article_ratings', state.articleRatings);
    if (state.newsletterSubscriptions) this._saveToStorage('newsletter_subscriptions', state.newsletterSubscriptions);
  }

  // ---------------------------
  // Relation resolvers
  // ---------------------------
  _resolveTopListEntryRelations(entry, games, allArticles) {
    const game = games.find((g) => g.id === entry.gameId) || null;
    const reviewArticle = allArticles.find((a) => a.id === entry.reviewArticleId) || null;
    let reviewArticleWithGame = reviewArticle;
    if (reviewArticle) {
      const reviewGame = games.find((g) => g.id === reviewArticle.gameId) || null;
      reviewArticleWithGame = { ...reviewArticle, game: reviewGame };
    }
    return {
      ...entry,
      game,
      reviewArticle: reviewArticleWithGame
    };
  }

  _resolveArticleRelations(articles) {
    const allGames = this._getFromStorage('games');
    const allTopListEntries = this._getFromStorage('top_list_entries');
    const allArticles = this._getFromStorage('articles');

    return (articles || []).map((article) => {
      if (!article) return article;
      const game = article.gameId ? (allGames.find((g) => g.id === article.gameId) || null) : null;
      let topListEntries = [];
      if (article.type === 'top_list') {
        const entries = allTopListEntries.filter((e) => e.topListArticleId === article.id);
        topListEntries = entries.map((e) => this._resolveTopListEntryRelations(e, allGames, allArticles));
      }
      return {
        ...article,
        game,
        topListEntries
      };
    });
  }

  _getOrCreateCollectionByName(name, description) {
    const state = this._loadSingleUserState();
    const collections = state.collections || [];
    const nameNorm = this._normalizeString(name);
    let existing = collections.find((c) => this._normalizeString(c.name) === nameNorm);
    if (existing) {
      return { collection: existing, created: false };
    }
    const newCollection = {
      id: this._generateId('collection'),
      name,
      description: description || '',
      createdAt: new Date().toISOString()
    };
    collections.push(newCollection);
    state.collections = collections;
    this._persistSingleUserState(state);
    return { collection: newCollection, created: true };
  }

  // ---------------------------
  // Interface: getHomepageContent
  // ---------------------------
  getHomepageContent() {
    const articles = this._getFromStorage('articles');
    const byType = (type) => articles.filter((a) => a.type === type);

    const reviews = byType('review');
    const guides = byType('guide');
    const news = byType('news');
    const features = byType('feature');
    const topLists = byType('top_list');

    const sortByPublishedDesc = (a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt);

    const featuredReviewsRaw = reviews
      .slice()
      .sort((a, b) => {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        if (pb !== pa) return pb - pa;
        return sortByPublishedDesc(a, b);
      })
      .slice(0, 5);

    const latestReviewsRaw = reviews.slice().sort(sortByPublishedDesc).slice(0, 10);
    const latestGuidesRaw = guides.slice().sort(sortByPublishedDesc).slice(0, 10);
    const latestNewsRaw = news.slice().sort(sortByPublishedDesc).slice(0, 10);
    const latestFeaturesRaw = features.slice().sort(sortByPublishedDesc).slice(0, 10);
    const latestTopListsRaw = topLists.slice().sort(sortByPublishedDesc).slice(0, 10);

    const featuredReviews = this._resolveArticleRelations(featuredReviewsRaw);
    const latestReviews = this._resolveArticleRelations(latestReviewsRaw);
    const latestGuides = this._resolveArticleRelations(latestGuidesRaw);
    const latestNews = this._resolveArticleRelations(latestNewsRaw);
    const latestFeatures = this._resolveArticleRelations(latestFeaturesRaw);
    const latestTopLists = this._resolveArticleRelations(latestTopListsRaw);

    const gameFinderPromo = {
      title: 'Find Your Next JRPG',
      subtitle: 'Use the JRPG Game Finder tool',
      description: 'Filter by platform, length, battle system, and more to discover your next JRPG on any platform.'
    };

    const newsletterPromo = {
      title: 'JRPG Newsletter',
      description: 'Get weekly JRPG recommendations, guides, and news tailored to your favorite genres and platforms.'
    };

    return {
      featuredReviews,
      latestReviews,
      latestGuides,
      latestNews,
      latestFeatures,
      latestTopLists,
      gameFinderPromo,
      newsletterPromo
    };
  }

  // ---------------------------
  // Interface: getSearchFilterOptions
  // ---------------------------
  getSearchFilterOptions() {
    const articles = this._getFromStorage('articles');
    const yearsSet = new Set();
    const platformsSet = new Set();
    const articleTypesSet = new Set();

    const games = this._getFromStorage('games');
    const gameById = new Map(games.map((g) => [g.id, g]));

    articles.forEach((a) => {
      if (typeof a.publishedYear === 'number') {
        yearsSet.add(a.publishedYear);
      }
      if (a.type) {
        articleTypesSet.add(a.type);
      }
      const addPlatform = (p) => { if (p) platformsSet.add(p); };
      if (Array.isArray(a.platforms)) {
        a.platforms.forEach(addPlatform);
      }
      if (a.primaryPlatform) addPlatform(a.primaryPlatform);
      if ((!a.platforms || a.platforms.length === 0) && !a.primaryPlatform && a.gameId) {
        const g = gameById.get(a.gameId);
        if (g) {
          if (Array.isArray(g.platforms)) g.platforms.forEach(addPlatform);
          if (g.primaryPlatform) addPlatform(g.primaryPlatform);
        }
      }
    });

    const years = Array.from(yearsSet)
      .sort((a, b) => b - a)
      .map((year) => ({ year, label: String(year) }));

    const platforms = Array.from(platformsSet)
      .sort()
      .map((value) => ({ value, label: this._getPlatformLabel(value) }));

    const articleTypes = Array.from(articleTypesSet)
      .sort()
      .map((value) => ({ value, label: this._labelFromEnum(value) }));

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'helpfulness_rating_desc', label: 'Helpfulness Rating: High to Low' },
      { value: 'most_recent', label: 'Most Recent' }
    ];

    return {
      years,
      platforms,
      articleTypes,
      sortOptions
    };
  }

  // ---------------------------
  // Interface: searchArticles
  // ---------------------------
  searchArticles(query, publishedYear, platform, articleType, sortBy, page = 1, pageSize = 20) {
    const articles = this._getFromStorage('articles');
    const games = this._getFromStorage('games');
    const gameById = new Map(games.map((g) => [g.id, g]));
    const q = this._normalizeString(query || '');
    const tokens = q.split(/\s+/).filter(Boolean);

    const filtered = articles.filter((a) => {
      if (articleType && a.type !== articleType) return false;
      if (typeof publishedYear === 'number' && a.publishedYear !== publishedYear) return false;

      if (platform) {
        let matchesPlatform = false;
        const plat = platform;
        if (a.primaryPlatform === plat) matchesPlatform = true;
        if (!matchesPlatform && Array.isArray(a.platforms) && a.platforms.includes(plat)) matchesPlatform = true;
        if (!matchesPlatform && a.gameId) {
          const g = gameById.get(a.gameId);
          if (g) {
            if (g.primaryPlatform === plat) matchesPlatform = true;
            if (Array.isArray(g.platforms) && g.platforms.includes(plat)) matchesPlatform = true;
          }
        }
        if (!matchesPlatform) return false;
      }

      if (!q) return true;

      const game = a.gameId ? gameById.get(a.gameId) : null;
      const haystack = [
        a.title,
        a.summary,
        a.body,
        a.helpfulSnippet,
        game && game.title,
        game && game.description,
        game && Array.isArray(game.keywords) ? game.keywords.join(' ') : ''
      ].join(' ');
      const hay = this._normalizeString(haystack);
      return tokens.every((t) => hay.includes(t));
    });

    // Sorting
    const sortKey = sortBy || 'relevance';
    if (sortKey === 'helpfulness_rating_desc' || sortKey === 'most_recent') {
      const sorted = this._filterAndSortArticles(filtered, null, sortKey, { defaultSort: 'most_recent' });
      return this._paginateAndReturnSearch(sorted, sortKey, page, pageSize);
    }

    // Basic relevance: title match > summary/body > others
    const scored = filtered.map((a) => {
      if (!q) return { article: a, score: 0 };
      const game = a.gameId ? gameById.get(a.gameId) : null;
      const title = this._normalizeString(a.title);
      const summary = this._normalizeString(a.summary);
      const body = this._normalizeString(a.body);
      const gameTitle = this._normalizeString(game && game.title);

      let score = 0;
      tokens.forEach((t) => {
        if (title.includes(t)) score += 5;
        if (summary.includes(t)) score += 3;
        if (body.includes(t)) score += 1;
        if (gameTitle.includes(t)) score += 2;
      });

      return { article: a, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return this._compareDatesDesc(a.article.publishedAt, b.article.publishedAt);
    });

    const sortedArticles = scored.map((s) => s.article);
    return this._paginateAndReturnSearch(sortedArticles, 'relevance', page, pageSize);
  }

  _paginateAndReturnSearch(sortedArticles, appliedSort, page, pageSize) {
    const totalCount = sortedArticles.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = sortedArticles.slice(start, end);
    const resolved = this._resolveArticleRelations(pageItems);
    return {
      results: resolved,
      totalCount,
      page,
      pageSize,
      appliedSort
    };
  }

  // ---------------------------
  // Interface: getRecommendationFilterOptions
  // ---------------------------
  getRecommendationFilterOptions() {
    const articles = this._getFromStorage('articles');
    const recs = articles.filter((a) => a.type === 'review' && a.isRecommendation);

    const platformsSet = new Set();
    recs.forEach((a) => {
      const addPlat = (p) => { if (p) platformsSet.add(p); };
      if (Array.isArray(a.platforms)) a.platforms.forEach(addPlat);
      if (a.primaryPlatform) addPlat(a.primaryPlatform);
    });

    const platforms = Array.from(platformsSet)
      .sort()
      .map((value) => ({ value, label: this._getPlatformLabel(value) }));

    let minHours = null;
    let maxHours = null;
    recs.forEach((a) => {
      if (typeof a.mainStoryLengthHours === 'number') {
        if (minHours === null || a.mainStoryLengthHours < minHours) minHours = a.mainStoryLengthHours;
        if (maxHours === null || a.mainStoryLengthHours > maxHours) maxHours = a.mainStoryLengthHours;
      }
    });

    const lengthRange = {
      minHours: minHours !== null ? minHours : 0,
      maxHours: maxHours !== null ? maxHours : 0
    };

    const ratingOptions = [
      { minStars: 0, label: 'All ratings' },
      { minStars: 3, label: '3 stars & up' },
      { minStars: 4, label: '4 stars & up' },
      { minStars: 4.5, label: '4.5 stars & up' }
    ];

    const sortOptions = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'most_recent', label: 'Most Recent' }
    ];

    return { platforms, lengthRange, ratingOptions, sortOptions };
  }

  // ---------------------------
  // Interface: getRecommendationArticles
  // ---------------------------
  getRecommendationArticles(platform, minMainStoryLengthHours, maxMainStoryLengthHours, minRatingStars, sortBy, page = 1, pageSize = 20) {
    const articles = this._getFromStorage('articles');
    const games = this._getFromStorage('games');
    const gameById = new Map(games.map((g) => [g.id, g]));

    const recs = articles.filter((a) => a.type === 'review' && a.isRecommendation);

    const filtered = recs.filter((a) => {
      if (platform) {
        let matchesPlatform = false;
        const plat = platform;
        if (a.primaryPlatform === plat) matchesPlatform = true;
        if (!matchesPlatform && Array.isArray(a.platforms) && a.platforms.includes(plat)) matchesPlatform = true;
        if (!matchesPlatform && a.gameId) {
          const g = gameById.get(a.gameId);
          if (g) {
            if (g.primaryPlatform === plat) matchesPlatform = true;
            if (Array.isArray(g.platforms) && g.platforms.includes(plat)) matchesPlatform = true;
          }
        }
        if (!matchesPlatform) return false;
      }

      if (typeof minMainStoryLengthHours === 'number') {
        if (typeof a.mainStoryLengthHours !== 'number' || a.mainStoryLengthHours < minMainStoryLengthHours) return false;
      }
      if (typeof maxMainStoryLengthHours === 'number') {
        if (typeof a.mainStoryLengthHours !== 'number' || a.mainStoryLengthHours > maxMainStoryLengthHours) return false;
      }
      if (typeof minRatingStars === 'number') {
        const rating = typeof a.ratingStars === 'number' ? a.ratingStars : 0;
        if (rating < minRatingStars) return false;
      }
      return true;
    });

    const sorted = this._filterAndSortArticles(filtered, null, sortBy || 'rating_desc', { defaultSort: 'rating_desc' });
    const totalCount = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = sorted.slice(start, end);
    const resolved = this._resolveArticleRelations(pageItems);
    return { articles: resolved, totalCount, page, pageSize };
  }

  // ---------------------------
  // Interface: getNewsFilterOptions
  // ---------------------------
  getNewsFilterOptions() {
    const articles = this._getFromStorage('articles');
    const news = articles.filter((a) => a.type === 'news');

    const platformsSet = new Set();
    const releaseYearsSet = new Set();
    const releaseWindowsSet = new Set();
    const tagsSet = new Set();

    news.forEach((a) => {
      const addPlat = (p) => { if (p) platformsSet.add(p); };
      if (Array.isArray(a.platforms)) a.platforms.forEach(addPlat);
      if (a.primaryPlatform) addPlat(a.primaryPlatform);
      if (typeof a.releaseYear === 'number') releaseYearsSet.add(a.releaseYear);
      if (a.releaseWindow) releaseWindowsSet.add(a.releaseWindow);
      if (Array.isArray(a.tags)) a.tags.forEach((t) => { if (t) tagsSet.add(t); });
    });

    const platforms = Array.from(platformsSet)
      .sort()
      .map((value) => ({ value, label: this._getPlatformLabel(value) }));

    const releaseYears = Array.from(releaseYearsSet)
      .sort((a, b) => a - b)
      .map((year) => ({ year, label: String(year) }));

    const releaseWindows = Array.from(releaseWindowsSet)
      .sort()
      .map((value) => ({ value, label: this._labelFromEnum(value) }));

    const tagOptions = Array.from(tagsSet)
      .sort()
      .map((tag) => ({ tag, label: tag }));

    const sortOptions = [
      { value: 'most_recent', label: 'Most Recent' },
      { value: 'most_popular', label: 'Most Popular' }
    ];

    return { platforms, releaseYears, releaseWindows, tagOptions, sortOptions };
  }

  // ---------------------------
  // Interface: getNewsArticles
  // ---------------------------
  getNewsArticles(platform, releaseYear, releaseWindow, tag, sortBy, page = 1, pageSize = 20) {
    const articles = this._getFromStorage('articles');
    const news = articles.filter((a) => a.type === 'news');
    const tagNorm = this._normalizeString(tag || '');

    const filtered = news.filter((a) => {
      if (platform) {
        const plat = platform;
        let matchesPlatform = false;
        if (a.primaryPlatform === plat) matchesPlatform = true;
        if (!matchesPlatform && Array.isArray(a.platforms) && a.platforms.includes(plat)) matchesPlatform = true;
        if (!matchesPlatform) return false;
      }
      if (typeof releaseYear === 'number' && a.releaseYear !== releaseYear) return false;
      if (releaseWindow && a.releaseWindow !== releaseWindow) return false;

      if (tagNorm) {
        const tagsArr = Array.isArray(a.tags) ? a.tags : [];
        const hasTag = tagsArr.some((t) => {
          if (!t) return false;
          const n = this._normalizeString(t);
          if (n === tagNorm) return true;
          // handle "Release Date" vs "release_date"
          if (tagNorm === 'release date' && n === 'release_date') return true;
          if (tagNorm === 'release_date' && n === 'release date') return true;
          return false;
        });
        const releaseTagFallback = tagNorm === 'release date' || tagNorm === 'release_date';
        if (!hasTag) {
          if (!(releaseTagFallback && a.isReleaseNews)) return false;
        }
      }

      return true;
    });

    let sorted;
    const sortKey = sortBy || 'most_recent';
    if (sortKey === 'most_popular') {
      sorted = filtered.slice().sort((a, b) => {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        if (pb !== pa) return pb - pa;
        return this._compareDatesDesc(a.publishedAt, b.publishedAt);
      });
    } else {
      sorted = filtered.slice().sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt));
    }

    const totalCount = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = sorted.slice(start, end);
    const resolved = this._resolveArticleRelations(pageItems);
    return { articles: resolved, totalCount, page, pageSize };
  }

  // ---------------------------
  // Interface: getFeatureFilterOptions
  // ---------------------------
  getFeatureFilterOptions() {
    const articles = this._getFromStorage('articles');
    const features = articles.filter((a) => a.type === 'feature');

    const narrativeTagsSet = new Set();
    features.forEach((a) => {
      if (Array.isArray(a.tags)) {
        a.tags.forEach((t) => {
          const n = this._normalizeString(t);
          if (n === 'story' || n === 'narrative' || n === 'writing') {
            narrativeTagsSet.add(t);
          }
        });
      }
    });

    const narrativeTags = Array.from(narrativeTagsSet)
      .sort()
      .map((tag) => ({ tag, label: tag }));

    const minWordCountOptions = [
      { minWords: 0, label: 'All lengths' },
      { minWords: 1000, label: '1000+ words' },
      { minWords: 3000, label: '3000+ words' }
    ];

    const ratingOptions = [
      { minStars: 0, label: 'All ratings' },
      { minStars: 3, label: '3 stars & up' },
      { minStars: 4, label: '4 stars & up' }
    ];

    const sortOptions = [
      { value: 'popularity_desc', label: 'Most Popular' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'most_recent', label: 'Most Recent' }
    ];

    return { narrativeTags, minWordCountOptions, ratingOptions, sortOptions };
  }

  // ---------------------------
  // Interface: getFeatureArticles
  // ---------------------------
  getFeatureArticles(tag, minWordCount, minRatingStars, sortBy, page = 1, pageSize = 20) {
    const articles = this._getFromStorage('articles');
    const features = articles.filter((a) => a.type === 'feature');
    const tagNorm = this._normalizeString(tag || '');

    const filtered = features.filter((a) => {
      if (tagNorm) {
        const tagsArr = Array.isArray(a.tags) ? a.tags : [];
        const hasTag = tagsArr.some((t) => this._normalizeString(t) === tagNorm);
        if (!hasTag) return false;
      }
      if (typeof minWordCount === 'number') {
        const wc = typeof a.wordCount === 'number' ? a.wordCount : 0;
        if (wc < minWordCount) return false;
      }
      if (typeof minRatingStars === 'number') {
        const rating = typeof a.ratingStars === 'number' ? a.ratingStars : 0;
        if (rating < minRatingStars) return false;
      }
      return true;
    });

    const sorted = this._filterAndSortArticles(filtered, null, sortBy || 'popularity_desc', { defaultSort: 'popularity_desc' });
    const totalCount = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = sorted.slice(start, end);
    const resolved = this._resolveArticleRelations(pageItems);
    return { articles: resolved, totalCount, page, pageSize };
  }

  // ---------------------------
  // Interface: getGuideFilterOptions
  // ---------------------------
  getGuideFilterOptions() {
    const articles = this._getFromStorage('articles');
    const guides = articles.filter((a) => a.type === 'guide');
    const games = this._getFromStorage('games');
    const gameById = new Map(games.map((g) => [g.id, g]));

    const guideTypesSet = new Set();
    const platformsSet = new Set();
    const difficultiesSet = new Set();
    let minYear = null;
    let maxYear = null;
    let minHours = null;
    let maxHours = null;

    guides.forEach((g) => {
      if (g.guideType) guideTypesSet.add(g.guideType);

      const addPlat = (p) => { if (p) platformsSet.add(p); };
      if (Array.isArray(g.platforms)) g.platforms.forEach(addPlat);
      if (g.primaryPlatform) addPlat(g.primaryPlatform);

      if (g.gameId) {
        const game = gameById.get(g.gameId);
        if (game && typeof game.releaseYear === 'number') {
          if (minYear === null || game.releaseYear < minYear) minYear = game.releaseYear;
          if (maxYear === null || game.releaseYear > maxYear) maxYear = game.releaseYear;
        }
      }

      if (typeof g.estimatedCompletionTimeHours === 'number') {
        if (minHours === null || g.estimatedCompletionTimeHours < minHours) minHours = g.estimatedCompletionTimeHours;
        if (maxHours === null || g.estimatedCompletionTimeHours > maxHours) maxHours = g.estimatedCompletionTimeHours;
      }

      if (g.difficulty) difficultiesSet.add(g.difficulty);
    });

    const guideTypes = Array.from(guideTypesSet)
      .sort()
      .map((value) => ({ value, label: this._labelFromEnum(value) }));

    const platforms = Array.from(platformsSet)
      .sort()
      .map((value) => ({ value, label: this._getPlatformLabel(value) }));

    const releaseYearRange = {
      minYear: minYear !== null ? minYear : null,
      maxYear: maxYear !== null ? maxYear : null
    };

    const completionTimeRange = {
      minHours: minHours !== null ? minHours : 0,
      maxHours: maxHours !== null ? maxHours : 0
    };

    const difficultyOptions = Array.from(difficultiesSet)
      .sort()
      .map((value) => ({ value, label: this._labelFromEnum(value) }));

    const sortOptions = [
      { value: 'popularity_desc', label: 'Most Popular' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'most_recent', label: 'Most Recent' }
    ];

    return { guideTypes, platforms, releaseYearRange, completionTimeRange, difficultyOptions, sortOptions };
  }

  // ---------------------------
  // Interface: getGuideArticles
  // ---------------------------
  getGuideArticles(guideType, platform, minReleaseYear, maxReleaseYear, minEstimatedCompletionTimeHours, maxEstimatedCompletionTimeHours, difficulty, sortBy, page = 1, pageSize = 20) {
    const articles = this._getFromStorage('articles');
    const games = this._getFromStorage('games');
    const gameById = new Map(games.map((g) => [g.id, g]));

    const guides = articles.filter((a) => a.type === 'guide');

    const filtered = guides.filter((g) => {
      if (guideType && g.guideType !== guideType) return false;

      if (platform) {
        const plat = platform;
        let matchesPlat = false;
        if (g.primaryPlatform === plat) matchesPlat = true;
        if (!matchesPlat && Array.isArray(g.platforms) && g.platforms.includes(plat)) matchesPlat = true;
        if (!matchesPlat && g.gameId) {
          const game = gameById.get(g.gameId);
          if (game) {
            if (game.primaryPlatform === plat) matchesPlat = true;
            if (Array.isArray(game.platforms) && game.platforms.includes(plat)) matchesPlat = true;
          }
        }
        if (!matchesPlat) return false;
      }

      if (typeof minReleaseYear === 'number' || typeof maxReleaseYear === 'number') {
        let year = null;
        if (g.gameId) {
          const game = gameById.get(g.gameId);
          if (game && typeof game.releaseYear === 'number') year = game.releaseYear;
        }
        if (year === null) return false;
        if (typeof minReleaseYear === 'number' && year < minReleaseYear) return false;
        if (typeof maxReleaseYear === 'number' && year > maxReleaseYear) return false;
      }

      if (typeof minEstimatedCompletionTimeHours === 'number') {
        if (typeof g.estimatedCompletionTimeHours !== 'number' || g.estimatedCompletionTimeHours < minEstimatedCompletionTimeHours) return false;
      }
      if (typeof maxEstimatedCompletionTimeHours === 'number') {
        if (typeof g.estimatedCompletionTimeHours !== 'number' || g.estimatedCompletionTimeHours > maxEstimatedCompletionTimeHours) return false;
      }

      if (difficulty && g.difficulty !== difficulty) return false;
      return true;
    });

    const sorted = this._filterAndSortArticles(filtered, null, sortBy || 'most_recent', { defaultSort: 'most_recent' });
    const totalCount = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = sorted.slice(start, end);
    const resolved = this._resolveArticleRelations(pageItems);
    return { articles: resolved, totalCount, page, pageSize };
  }

  // ---------------------------
  // Interface: getTopListFilterOptions
  // ---------------------------
  getTopListFilterOptions() {
    const articles = this._getFromStorage('articles');
    const topLists = articles.filter((a) => a.type === 'top_list');
    const yearsSet = new Set();
    topLists.forEach((a) => {
      if (typeof a.publishedYear === 'number') yearsSet.add(a.publishedYear);
    });

    const publishedYears = Array.from(yearsSet)
      .sort((a, b) => a - b)
      .map((year) => ({ year, label: String(year) }));

    const sortOptions = [
      { value: 'popularity_desc', label: 'Most Popular' },
      { value: 'most_recent', label: 'Most Recent' }
    ];

    return { publishedYears, sortOptions };
  }

  // ---------------------------
  // Interface: getTopListArticles
  // ---------------------------
  getTopListArticles(maxPublishedYear, minPublishedYear, titleQuery, sortBy, page = 1, pageSize = 20) {
    const articles = this._getFromStorage('articles');
    const topLists = articles.filter((a) => a.type === 'top_list');
    const titleNorm = this._normalizeString(titleQuery || '');

    const filtered = topLists.filter((a) => {
      if (typeof maxPublishedYear === 'number' && a.publishedYear > maxPublishedYear) return false;
      if (typeof minPublishedYear === 'number' && a.publishedYear < minPublishedYear) return false;
      if (titleNorm) {
        const t = this._normalizeString(a.title);
        if (!t.includes(titleNorm)) return false;
      }
      return true;
    });

    let sorted;
    const sortKey = sortBy || 'most_recent';
    if (sortKey === 'popularity_desc') {
      sorted = filtered.slice().sort((a, b) => {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        if (pb !== pa) return pb - pa;
        return this._compareDatesDesc(a.publishedAt, b.publishedAt);
      });
    } else {
      sorted = filtered.slice().sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt));
    }

    const totalCount = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = sorted.slice(start, end);
    const resolved = this._resolveArticleRelations(pageItems);
    return { articles: resolved, totalCount, page, pageSize };
  }

  // ---------------------------
  // Interface: getGameFinderOptions
  // ---------------------------
  getGameFinderOptions() {
    const games = this._getFromStorage('games');

    const platformsSet = new Set();
    const genresSet = new Set();
    const difficultiesSet = new Set();
    let minHours = null;
    let maxHours = null;
    let minYear = null;
    let maxYear = null;

    games.forEach((g) => {
      const addPlat = (p) => { if (p) platformsSet.add(p); };
      if (Array.isArray(g.platforms)) g.platforms.forEach(addPlat);
      if (g.primaryPlatform) addPlat(g.primaryPlatform);

      if (Array.isArray(g.genres)) g.genres.forEach((gn) => { if (gn) genresSet.add(gn); });

      if (g.defaultDifficulty) difficultiesSet.add(g.defaultDifficulty);

      if (typeof g.gameLengthHours === 'number') {
        if (minHours === null || g.gameLengthHours < minHours) minHours = g.gameLengthHours;
        if (maxHours === null || g.gameLengthHours > maxHours) maxHours = g.gameLengthHours;
      }

      if (typeof g.releaseYear === 'number') {
        if (minYear === null || g.releaseYear < minYear) minYear = g.releaseYear;
        if (maxYear === null || g.releaseYear > maxYear) maxYear = g.releaseYear;
      }
    });

    const platforms = Array.from(platformsSet)
      .sort()
      .map((value) => ({ value, label: this._getPlatformLabel(value) }));

    const genres = Array.from(genresSet)
      .sort()
      .map((value) => ({ value, label: this._labelFromEnum(value) }));

    const difficulties = Array.from(difficultiesSet)
      .sort()
      .map((value) => ({ value, label: this._labelFromEnum(value) }));

    const lengthHoursRange = {
      minHours: minHours !== null ? minHours : 0,
      maxHours: maxHours !== null ? maxHours : 0
    };

    const releaseYearRange = {
      minYear: minYear !== null ? minYear : null,
      maxYear: maxYear !== null ? maxYear : null
    };

    return { platforms, genres, difficulties, lengthHoursRange, releaseYearRange };
  }

  // ---------------------------
  // Interface: runGameFinder
  // ---------------------------
  runGameFinder(platform, minHours, maxHours, genre, difficulty, releaseYearStart, releaseYearEnd, page = 1, pageSize = 20) {
    const games = this._getFromStorage('games');
    const articles = this._getFromStorage('articles');

    const filteredGames = games.filter((g) => {
      if (!g.isJrpg) return false;

      if (platform) {
        const plat = platform;
        let matchesPlat = false;
        if (g.primaryPlatform === plat) matchesPlat = true;
        if (!matchesPlat && Array.isArray(g.platforms) && g.platforms.includes(plat)) matchesPlat = true;
        if (!matchesPlat) return false;
      }

      if (typeof minHours === 'number' || typeof maxHours === 'number') {
        if (typeof g.gameLengthHours !== 'number') return false;
        if (typeof minHours === 'number' && g.gameLengthHours < minHours) return false;
        if (typeof maxHours === 'number' && g.gameLengthHours > maxHours) return false;
      }

      if (genre) {
        const genresArr = Array.isArray(g.genres) ? g.genres : [];
        if (!genresArr.includes(genre)) return false;
      }

      if (difficulty && g.defaultDifficulty !== difficulty) return false;

      if (typeof releaseYearStart === 'number' && g.releaseYear < releaseYearStart) return false;
      if (typeof releaseYearEnd === 'number' && g.releaseYear > releaseYearEnd) return false;

      return true;
    });

    // Determine primary article per game (most recent review, fallback to any article)
    const resultsFull = filteredGames.map((game) => {
      const gameArticles = articles.filter((a) => a.gameId === game.id);
      let primaryArticle = null;
      const reviews = gameArticles.filter((a) => a.type === 'review');
      const sourceArr = reviews.length ? reviews : gameArticles;
      if (sourceArr.length) {
        sourceArr.sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt));
        primaryArticle = sourceArr[0];
      }
      let primaryResolved = null;
      if (primaryArticle) {
        primaryResolved = this._resolveArticleRelations([primaryArticle])[0];
      }
      return { game, primaryArticle: primaryResolved };
    });

    const totalCount = resultsFull.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = resultsFull.slice(start, end);

    return {
      results: pageItems,
      totalCount,
      page,
      pageSize
    };
  }

  // ---------------------------
  // Interface: getArticleDetail
  // ---------------------------
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;

    if (!article) {
      return {
        article: null,
        game: null,
        topListEntries: [],
        comments: [],
        userState: {
          inReadingList: false,
          inWishlist: false,
          isBookmarked: false,
          isReleaseFollowed: false,
          userRating: null,
          availableCollections: []
        }
      };
    }

    const [resolvedArticle] = this._resolveArticleRelations([article]);
    const game = resolvedArticle.game || null;
    const topListEntries = resolvedArticle.topListEntries || [];

    const allComments = this._getFromStorage('comments');
    const articleComments = allComments
      .filter((c) => c.articleId === articleId)
      .map((c) => ({ ...c, article }));

    const state = this._loadSingleUserState();

    const inReadingList = (state.readingListItems || []).some((i) => i.articleId === articleId);
    const inWishlist = (state.wishlistItems || []).some((i) => i.articleId === articleId);
    const isBookmarked = (state.bookmarkItems || []).some((i) => i.articleId === articleId);
    const isReleaseFollowed = (state.followedReleaseItems || []).some((i) => i.articleId === articleId && i.isActive);

    const ratingEntry = (state.articleRatings || []).slice().reverse().find((r) => r.articleId === articleId) || null;
    const userRating = ratingEntry ? ratingEntry.rating : null;

    const collections = state.collections || [];
    const collectionItems = state.collectionItems || [];

    const availableCollections = collections.map((c) => {
      const containsArticle = collectionItems.some((ci) => ci.collectionId === c.id && ci.articleId === articleId);
      return { collection: c, containsArticle };
    });

    return {
      article: resolvedArticle,
      game,
      topListEntries,
      comments: articleComments,
      userState: {
        inReadingList,
        inWishlist,
        isBookmarked,
        isReleaseFollowed,
        userRating,
        availableCollections
      }
    };
  }

  // ---------------------------
  // Interface: submitComment
  // ---------------------------
  submitComment(articleId, authorName, body) {
    const articles = this._getFromStorage('articles');
    const comments = this._getFromStorage('comments');

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { success: false, comment: null, updatedCommentCount: 0, message: 'Article not found.' };
    }
    if (article.commentEnabled === false) {
      return { success: false, comment: null, updatedCommentCount: article.commentCount || 0, message: 'Comments are disabled for this article.' };
    }

    const newComment = {
      id: this._generateId('comment'),
      articleId,
      authorName,
      body,
      createdAt: new Date().toISOString(),
      isVisible: true
    };

    comments.push(newComment);
    this._saveToStorage('comments', comments);

    // Update article.commentCount
    const updatedArticles = articles.map((a) => {
      if (a.id !== articleId) return a;
      const currentCount = typeof a.commentCount === 'number' ? a.commentCount : 0;
      return { ...a, commentCount: currentCount + 1 };
    });
    this._saveToStorage('articles', updatedArticles);

    const updatedArticle = updatedArticles.find((a) => a.id === articleId) || article;
    const updatedCommentCount = updatedArticle.commentCount || 0;

    return {
      success: true,
      comment: newComment,
      updatedCommentCount,
      message: 'Comment submitted successfully.'
    };
  }

  // ---------------------------
  // Interface: addToReadingList
  // ---------------------------
  addToReadingList(articleId) {
    const state = this._loadSingleUserState();
    const list = state.readingListItems || [];
    const existing = list.find((i) => i.articleId === articleId) || null;

    if (existing) {
      return {
        success: true,
        item: existing,
        totalReadingListCount: list.length,
        alreadyInList: true,
        message: 'Article is already in the reading list.'
      };
    }

    const newItem = {
      id: this._generateId('reading_list_item'),
      articleId,
      addedAt: new Date().toISOString()
    };

    list.push(newItem);
    state.readingListItems = list;
    this._persistSingleUserState(state);

    return {
      success: true,
      item: newItem,
      totalReadingListCount: list.length,
      alreadyInList: false,
      message: 'Article added to reading list.'
    };
  }

  // ---------------------------
  // Interface: removeFromReadingList
  // ---------------------------
  removeFromReadingList(articleId) {
    const state = this._loadSingleUserState();
    const list = state.readingListItems || [];
    const initialLen = list.length;
    const filtered = list.filter((i) => i.articleId !== articleId);
    state.readingListItems = filtered;
    this._persistSingleUserState(state);

    const success = filtered.length !== initialLen;
    return {
      success,
      totalReadingListCount: filtered.length,
      message: success ? 'Article removed from reading list.' : 'Article was not in the reading list.'
    };
  }

  // ---------------------------
  // Interface: addToWishlist
  // ---------------------------
  addToWishlist(articleId) {
    const state = this._loadSingleUserState();
    const wishlist = state.wishlistItems || [];
    const existing = wishlist.find((i) => i.articleId === articleId) || null;

    if (existing) {
      return {
        success: true,
        item: existing,
        totalWishlistCount: wishlist.length,
        alreadyInWishlist: true,
        message: 'Article is already in the wishlist.'
      };
    }

    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;

    const newItem = {
      id: this._generateId('wishlist_item'),
      articleId,
      gameId: article && article.gameId ? article.gameId : null,
      addedAt: new Date().toISOString()
    };

    wishlist.push(newItem);
    state.wishlistItems = wishlist;
    this._persistSingleUserState(state);

    return {
      success: true,
      item: newItem,
      totalWishlistCount: wishlist.length,
      alreadyInWishlist: false,
      message: 'Article added to wishlist.'
    };
  }

  // ---------------------------
  // Interface: removeFromWishlist
  // ---------------------------
  removeFromWishlist(articleId) {
    const state = this._loadSingleUserState();
    const wishlist = state.wishlistItems || [];
    const initialLen = wishlist.length;
    const filtered = wishlist.filter((i) => i.articleId !== articleId);
    state.wishlistItems = filtered;
    this._persistSingleUserState(state);

    const success = filtered.length !== initialLen;
    return {
      success,
      totalWishlistCount: filtered.length,
      message: success ? 'Article removed from wishlist.' : 'Article was not in the wishlist.'
    };
  }

  // ---------------------------
  // Interface: bookmarkGuideArticle
  // ---------------------------
  bookmarkGuideArticle(articleId) {
    const state = this._loadSingleUserState();
    const bookmarks = state.bookmarkItems || [];
    const existing = bookmarks.find((i) => i.articleId === articleId) || null;

    if (existing) {
      return {
        success: true,
        item: existing,
        totalBookmarkCount: bookmarks.length,
        alreadyBookmarked: true,
        message: 'Guide is already bookmarked.'
      };
    }

    const newItem = {
      id: this._generateId('bookmark_item'),
      articleId,
      addedAt: new Date().toISOString()
    };

    bookmarks.push(newItem);
    state.bookmarkItems = bookmarks;
    this._persistSingleUserState(state);

    return {
      success: true,
      item: newItem,
      totalBookmarkCount: bookmarks.length,
      alreadyBookmarked: false,
      message: 'Guide bookmarked.'
    };
  }

  // ---------------------------
  // Interface: removeBookmark
  // ---------------------------
  removeBookmark(articleId) {
    const state = this._loadSingleUserState();
    const bookmarks = state.bookmarkItems || [];
    const initialLen = bookmarks.length;
    const filtered = bookmarks.filter((i) => i.articleId !== articleId);
    state.bookmarkItems = filtered;
    this._persistSingleUserState(state);

    const success = filtered.length !== initialLen;
    return {
      success,
      totalBookmarkCount: filtered.length,
      message: success ? 'Bookmark removed.' : 'Guide was not bookmarked.'
    };
  }

  // ---------------------------
  // Interface: followRelease
  // ---------------------------
  followRelease(articleId, notes) {
    const state = this._loadSingleUserState();
    const follows = state.followedReleaseItems || [];
    const existing = follows.find((i) => i.articleId === articleId) || null;

    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        if (typeof notes === 'string' && notes.length) existing.notes = notes;
        state.followedReleaseItems = follows;
        this._persistSingleUserState(state);
      }
      return {
        success: true,
        item: existing,
        totalFollowedReleasesCount: follows.filter((f) => f.isActive).length,
        alreadyFollowing: existing.isActive,
        message: existing.isActive ? 'Already following this release.' : 'Release follow reactivated.'
      };
    }

    const newItem = {
      id: this._generateId('followed_release_item'),
      articleId,
      addedAt: new Date().toISOString(),
      isActive: true,
      notes: notes || ''
    };

    follows.push(newItem);
    state.followedReleaseItems = follows;
    this._persistSingleUserState(state);

    return {
      success: true,
      item: newItem,
      totalFollowedReleasesCount: follows.filter((f) => f.isActive).length,
      alreadyFollowing: false,
      message: 'Now following this release.'
    };
  }

  // ---------------------------
  // Interface: unfollowRelease
  // ---------------------------
  unfollowRelease(articleId) {
    const state = this._loadSingleUserState();
    const follows = state.followedReleaseItems || [];
    const item = follows.find((i) => i.articleId === articleId && i.isActive) || null;

    if (!item) {
      return {
        success: false,
        totalFollowedReleasesCount: follows.filter((f) => f.isActive).length,
        message: 'Release was not being followed.'
      };
    }

    item.isActive = false;
    state.followedReleaseItems = follows;
    this._persistSingleUserState(state);

    return {
      success: true,
      totalFollowedReleasesCount: follows.filter((f) => f.isActive).length,
      message: 'Release unfollowed.'
    };
  }

  // ---------------------------
  // Interface: getUserCollections
  // ---------------------------
  getUserCollections() {
    const state = this._loadSingleUserState();
    const collections = state.collections || [];
    const items = state.collectionItems || [];

    return collections.map((c) => {
      const count = items.filter((i) => i.collectionId === c.id).length;
      return { collection: c, articleCount: count };
    });
  }

  // ---------------------------
  // Interface: createCollection
  // ---------------------------
  createCollection(name, description) {
    const { collection, created } = this._getOrCreateCollectionByName(name, description);
    return {
      success: true,
      collection,
      message: created ? 'Collection created.' : 'Collection already existed.'
    };
  }

  // ---------------------------
  // Interface: addArticleToCollection
  // ---------------------------
  addArticleToCollection(collectionId, articleId) {
    const state = this._loadSingleUserState();
    const collections = state.collections || [];
    const collectionItems = state.collectionItems || [];

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return { success: false, collectionItem: null, message: 'Collection not found.' };
    }

    const existing = collectionItems.find((ci) => ci.collectionId === collectionId && ci.articleId === articleId) || null;
    if (existing) {
      return { success: true, collectionItem: existing, message: 'Article is already in the collection.' };
    }

    const orderIndexBase = collectionItems
      .filter((ci) => ci.collectionId === collectionId)
      .reduce((max, ci) => (typeof ci.orderIndex === 'number' && ci.orderIndex > max ? ci.orderIndex : max), 0);

    const newItem = {
      id: this._generateId('collection_item'),
      collectionId,
      articleId,
      addedAt: new Date().toISOString(),
      orderIndex: orderIndexBase + 1
    };

    collectionItems.push(newItem);
    state.collectionItems = collectionItems;
    this._persistSingleUserState(state);

    return { success: true, collectionItem: newItem, message: 'Article added to collection.' };
  }

  // ---------------------------
  // Interface: removeArticleFromCollection
  // ---------------------------
  removeArticleFromCollection(collectionId, articleId) {
    const state = this._loadSingleUserState();
    const collectionItems = state.collectionItems || [];
    const initialLen = collectionItems.length;
    const filtered = collectionItems.filter((ci) => !(ci.collectionId === collectionId && ci.articleId === articleId));
    state.collectionItems = filtered;
    this._persistSingleUserState(state);

    const success = filtered.length !== initialLen;
    return { success, message: success ? 'Article removed from collection.' : 'Article was not in the collection.' };
  }

  // ---------------------------
  // Interface: rateArticle
  // ---------------------------
  rateArticle(articleId, rating, source) {
    const value = Number(rating);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      return {
        articleRating: null,
        updatedUserRating: null,
        message: 'Rating must be between 1 and 5.'
      };
    }

    const state = this._loadSingleUserState();
    const ratings = state.articleRatings || [];
    const now = new Date().toISOString();

    let existing = ratings.find((r) => r.articleId === articleId) || null;
    if (existing) {
      existing.rating = value;
      existing.source = source;
      existing.ratedAt = now;
    } else {
      existing = {
        id: this._generateId('article_rating'),
        articleId,
        rating: value,
        ratedAt: now,
        source
      };
      ratings.push(existing);
    }

    state.articleRatings = ratings;
    this._persistSingleUserState(state);

    // Update Article.userRating for convenience
    const articles = this._getFromStorage('articles');
    const updatedArticles = articles.map((a) => {
      if (a.id !== articleId) return a;
      return { ...a, userRating: value };
    });
    this._saveToStorage('articles', updatedArticles);

    return {
      articleRating: existing,
      updatedUserRating: value,
      message: 'Article rated successfully.'
    };
  }

  // ---------------------------
  // Interface: getMyLibraryOverview
  // ---------------------------
  getMyLibraryOverview() {
    const state = this._loadSingleUserState();
    const articles = this._getFromStorage('articles');
    const games = this._getFromStorage('games');

    const articleById = new Map(articles.map((a) => [a.id, a]));
    const gameById = new Map(games.map((g) => [g.id, g]));

    // Pre-resolve all articles once for richer data
    const resolvedArticles = this._resolveArticleRelations(articles);
    const resolvedById = new Map(resolvedArticles.map((a) => [a.id, a]));

    const readingList = (state.readingListItems || []).map((item) => {
      const article = resolvedById.get(item.articleId) || null;
      return { item, article };
    });

    const wishlist = (state.wishlistItems || []).map((item) => {
      const article = resolvedById.get(item.articleId) || null;
      const game = item.gameId ? (gameById.get(item.gameId) || (article && article.game) || null) : (article && article.game) || null;
      return { item, article, game };
    });

    const bookmarks = (state.bookmarkItems || []).map((item) => {
      const article = resolvedById.get(item.articleId) || null;
      return { item, article };
    });

    const followedReleases = (state.followedReleaseItems || []).map((item) => {
      const article = resolvedById.get(item.articleId) || null;
      return { item, article };
    });

    const collections = (state.collections || []).map((collection) => {
      const collectionItems = (state.collectionItems || []).filter((ci) => ci.collectionId === collection.id);
      const items = collectionItems.map((collectionItem) => {
        const article = resolvedById.get(collectionItem.articleId) || null;
        return { collectionItem, article };
      });
      return { collection, items };
    });

    return {
      readingList,
      wishlist,
      bookmarks,
      followedReleases,
      collections
    };
  }

  // ---------------------------
  // Interface: getNewsletterPreferencesOptions
  // ---------------------------
  getNewsletterPreferencesOptions() {
    const genres = [
      { value: 'turn_based', label: 'Turn-based' },
      { value: 'tactics', label: 'Tactics' },
      { value: 'action_rpg', label: 'Action RPG' },
      { value: 'strategy_rpg', label: 'Strategy RPG' },
      { value: 'mmorpg', label: 'MMORPG' },
      { value: 'other', label: 'Other' }
    ];

    const platforms = [
      { value: 'ps5', label: 'PS5' },
      { value: 'ps4', label: 'PS4' },
      { value: 'nintendo_switch', label: 'Nintendo Switch' },
      { value: 'pc', label: 'PC' },
      { value: 'xbox_series_x', label: 'Xbox Series X' },
      { value: 'xbox_one', label: 'Xbox One' }
    ];

    const emailFrequencies = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    return { genres, platforms, emailFrequencies };
  }

  // ---------------------------
  // Interface: subscribeToNewsletter
  // ---------------------------
  subscribeToNewsletter(email, favoriteGenres, preferredPlatforms, emailFrequency, interestNote) {
    const state = this._loadSingleUserState();
    const subs = state.newsletterSubscriptions || [];

    const now = new Date().toISOString();

    // Single-user: update existing subscription for same email, or create new
    let existing = subs.find((s) => s.email === email) || null;
    if (existing) {
      existing.favoriteGenres = Array.isArray(favoriteGenres) ? favoriteGenres : [];
      existing.preferredPlatforms = Array.isArray(preferredPlatforms) ? preferredPlatforms : [];
      existing.emailFrequency = emailFrequency;
      existing.interestNote = interestNote || '';
      existing.isActive = true;
    } else {
      existing = {
        id: this._generateId('newsletter_subscription'),
        email,
        favoriteGenres: Array.isArray(favoriteGenres) ? favoriteGenres : [],
        preferredPlatforms: Array.isArray(preferredPlatforms) ? preferredPlatforms : [],
        emailFrequency,
        interestNote: interestNote || '',
        subscribedAt: now,
        isActive: true
      };
      subs.push(existing);
    }

    state.newsletterSubscriptions = subs;
    this._persistSingleUserState(state);

    return {
      subscription: existing,
      message: 'Subscription saved.'
    };
  }

  // ---------------------------
  // Interface: getStaticPageContent
  // ---------------------------
  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find((p) => p.slug === pageSlug) || null;
    if (!page) {
      return {
        title: '',
        body: '',
        lastUpdatedAt: ''
      };
    }
    return {
      title: page.title || '',
      body: page.body || '',
      lastUpdatedAt: page.lastUpdatedAt || ''
    };
  }

  // ---------------------------
  // Interface: sendContactMessage
  // ---------------------------
  sendContactMessage(name, email, subject, message) {
    const messages = this._getFromStorage('contact_messages');
    const newMessage = {
      id: this._generateId('contact_message'),
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString()
    };
    messages.push(newMessage);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message received.'
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
