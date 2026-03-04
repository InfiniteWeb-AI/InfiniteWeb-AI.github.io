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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const arrayKeys = [
      'jokes',
      'categories',
      'collections',
      'collection_items',
      'favorites',
      'reading_list_items',
      'category_follows',
      'joke_reports',
      'tags',
      'joke_previews'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('content_preferences')) {
      // Leave unset; _getOrCreateContentPreferences will create defaults on demand
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      return fallback !== undefined ? fallback : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
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

  _startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  _dateRangeFromLabel(label) {
    const now = new Date();
    const end = now;
    let start = null;
    switch (label) {
      case 'today': {
        start = this._startOfToday();
        break;
      }
      case 'this_week':
      case 'last_7_days': {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      }
      case 'all_time':
      default:
        start = null;
        break;
    }
    return { start, end };
  }

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  // ----------------------
  // Content preferences helpers
  // ----------------------

  _getOrCreateContentPreferences() {
    const raw = localStorage.getItem('content_preferences');
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
          return obj;
        }
      } catch (e) {}
    }
    const defaults = {
      id: 'content_pref_1',
      cleanOnly: false,
      preferredCategoryIds: [],
      blockedCategoryIds: [],
      maxJokeLengthChars: 10000,
      homepageSortOrder: 'recommended',
      updatedAt: this._nowIso()
    };
    localStorage.setItem('content_preferences', JSON.stringify(defaults));
    return defaults;
  }

  _saveContentPreferences(prefs) {
    const toSave = {
      id: prefs.id || 'content_pref_1',
      cleanOnly: !!prefs.cleanOnly,
      preferredCategoryIds: Array.isArray(prefs.preferredCategoryIds) ? prefs.preferredCategoryIds : [],
      blockedCategoryIds: Array.isArray(prefs.blockedCategoryIds) ? prefs.blockedCategoryIds : [],
      maxJokeLengthChars: typeof prefs.maxJokeLengthChars === 'number' ? prefs.maxJokeLengthChars : 10000,
      homepageSortOrder: prefs.homepageSortOrder || 'recommended',
      updatedAt: this._nowIso()
    };
    localStorage.setItem('content_preferences', JSON.stringify(toSave));
    return toSave;
  }

  // Internal helper to inject ContentPreference settings into joke lists
  _applyContentPreferencesToQuery(jokes, options) {
    const opts = options || {};
    const prefs = this._getOrCreateContentPreferences();
    let result = Array.isArray(jokes) ? jokes.slice() : [];

    // Clean-only filter
    if (prefs.cleanOnly) {
      result = result.filter((j) => j && j.contentRating === 'clean');
    }

    // Max length filter
    if (typeof prefs.maxJokeLengthChars === 'number') {
      result = result.filter((j) => j && typeof j.lengthChars === 'number' && j.lengthChars <= prefs.maxJokeLengthChars);
    }

    // Blocked categories
    if (!opts.ignoreCategoryBlocks && Array.isArray(prefs.blockedCategoryIds) && prefs.blockedCategoryIds.length > 0) {
      const blocked = new Set(prefs.blockedCategoryIds);
      result = result.filter((j) => j && !blocked.has(j.categoryId));
    }

    return result;
  }

  // ----------------------
  // Collection helpers
  // ----------------------

  _getOrCreateCollectionItemOrder(collectionId) {
    const items = this._getFromStorage('collection_items', []);
    const filtered = items.filter((ci) => ci.collectionId === collectionId);
    if (filtered.length === 0) return 1;
    const maxOrder = filtered.reduce((max, ci) => (typeof ci.order === 'number' && ci.order > max ? ci.order : max), 0);
    return maxOrder + 1;
  }

  // ----------------------
  // Random feed helper
  // ----------------------

  _selectRandomJokes(pageSize, refreshToken) {
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const allJokes = this._getFromStorage('jokes', []);
    const eligible = this._applyContentPreferencesToQuery(
      allJokes.filter((j) => j && j.status === 'published' && (j.isRandomEligible === true || typeof j.isRandomEligible === 'undefined')),
      { ignoreCategoryBlocks: false }
    );

    // Simple Fisher-Yates shuffle
    const arr = eligible.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }

    return arr.slice(0, size);
  }

  // ----------------------
  // Reading list helper
  // ----------------------

  _persistReadingList(items) {
    const list = Array.isArray(items) ? items : [];
    this._saveToStorage('reading_list_items', list);
  }

  // ----------------------
  // Foreign key resolution helper
  // ----------------------

  _attachCategoryToJoke(joke, categoriesById) {
    if (!joke) return joke;
    const cat = categoriesById ? categoriesById[joke.categoryId] : null;
    return {
      ...joke,
      categoryName: cat ? cat.name : joke.categoryName || null,
      category: cat || null
    };
  }

  _buildCategoriesById() {
    const categories = this._getFromStorage('categories', []);
    const map = {};
    categories.forEach((c) => {
      if (c && c.id) map[c.id] = c;
    });
    return map;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomeFeed(cursor, pageSize)
  getHomeFeed(cursor, pageSize) {
    const prefs = this._getOrCreateContentPreferences();
    const categoriesById = this._buildCategoriesById();
    const jokesRaw = this._getFromStorage('jokes', []);
    const favorites = this._getFromStorage('favorites', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const follows = this._getFromStorage('category_follows', []);

    const favoriteIds = new Set(favorites.map((f) => f.jokeId));
    const readingIds = new Set(readingListItems.map((r) => r.jokeId));
    const followedCategoryIds = new Set(
      follows.filter((f) => f.isActive).map((f) => f.categoryId)
    );

    let jokes = jokesRaw.filter((j) => j && j.status === 'published');
    jokes = this._applyContentPreferencesToQuery(jokes, { ignoreCategoryBlocks: false });

    const preferred = new Set(Array.isArray(prefs.preferredCategoryIds) ? prefs.preferredCategoryIds : []);

    const sortOrder = prefs.homepageSortOrder || 'recommended';

    const scoreForJoke = (j) => {
      let score = 0;
      if (preferred.has(j.categoryId)) score += 3;
      if (followedCategoryIds.has(j.categoryId)) score += 2;
      if (sortOrder === 'recommended') {
        score += (j.rating || 0) * 2 + (j.ratingCount || 0) * 0.01 + (this._parseDate(j.postedAt) || new Date(0)).getTime() / 1e11;
      } else if (sortOrder === 'top_rated') {
        score += (j.rating || 0) * 2 + (j.ratingCount || 0) * 0.01;
      } else if (sortOrder === 'most_recent') {
        score += (this._parseDate(j.postedAt) || new Date(0)).getTime() / 1e11;
      } else if (sortOrder === 'most_shared') {
        score += (j.shareCount || 0);
      }
      return score;
    };

    jokes.sort((a, b) => scoreForJoke(b) - scoreForJoke(a));

    const startIndex = cursor != null && cursor !== undefined && cursor !== '' ? parseInt(cursor, 10) || 0 : 0;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const slice = jokes.slice(startIndex, startIndex + size);
    const nextCursor = startIndex + size < jokes.length ? String(startIndex + size) : null;

    const resultJokes = slice.map((j) => {
      const withCategory = this._attachCategoryToJoke(j, categoriesById);
      return {
        id: withCategory.id,
        text: withCategory.text,
        categoryId: withCategory.categoryId,
        categoryName: withCategory.categoryName,
        category: withCategory.category || null,
        language: withCategory.language,
        contentRating: withCategory.contentRating,
        rating: withCategory.rating,
        ratingCount: withCategory.ratingCount,
        lengthChars: withCategory.lengthChars,
        tags: withCategory.tags || [],
        postedAt: withCategory.postedAt,
        shareCount: withCategory.shareCount,
        permalink: withCategory.permalink,
        isFavorited: favoriteIds.has(withCategory.id),
        isInReadingList: readingIds.has(withCategory.id),
        isClean: withCategory.contentRating === 'clean'
      };
    });

    return {
      jokes: resultJokes,
      cursor: nextCursor,
      hasMore: nextCursor !== null
    };
  }

  // getHighlightedCategories()
  getHighlightedCategories() {
    const categories = this._getFromStorage('categories', []);
    const follows = this._getFromStorage('category_follows', []);
    const followedSet = new Set(
      follows.filter((f) => f.isActive).map((f) => f.categoryId)
    );

    // Simple heuristic: sort by popularityScore desc then jokeCount desc
    const sorted = categories.slice().sort((a, b) => {
      const psA = a.popularityScore || 0;
      const psB = b.popularityScore || 0;
      if (psB !== psA) return psB - psA;
      const jcA = a.jokeCount || 0;
      const jcB = b.jokeCount || 0;
      return jcB - jcA;
    });

    return sorted.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      overallAverageRating: c.overallAverageRating || 0,
      jokeCount: c.jokeCount || 0,
      popularityScore: c.popularityScore || 0,
      isFollowed: followedSet.has(c.id)
    }));
  }

  // getBrowseFilterOptions()
  getBrowseFilterOptions() {
    const categories = this._getFromStorage('categories', []);

    const languages = [
      { value: 'english', label: 'English' },
      { value: 'spanish', label: 'Spanish' },
      { value: 'french', label: 'French' },
      { value: 'german', label: 'German' },
      { value: 'other', label: 'Other' }
    ];

    const contentRatings = [
      { value: 'clean', label: 'Clean' },
      { value: 'nsfw', label: 'NSFW / Adult' }
    ];

    const sortOptions = [
      { value: 'top_rated', label: 'Top Rated' },
      { value: 'most_shared', label: 'Most Shared' },
      { value: 'most_recent', label: 'Most Recent' }
    ];

    const dateRanges = [
      { value: 'today', label: 'Today' },
      { value: 'this_week', label: 'This Week' },
      { value: 'last_7_days', label: 'Last 7 Days' },
      { value: 'all_time', label: 'All Time' }
    ];

    const lengthPresets = [
      { maxChars: 120, label: 'Up to 120 characters' },
      { maxChars: 200, label: 'Up to 200 characters' },
      { maxChars: 250, label: 'Up to 250 characters' },
      { maxChars: 400, label: 'Up to 400 characters' }
    ];

    const ratingThresholds = [
      { minRating: 3.0, label: '3.0 stars and up' },
      { minRating: 4.0, label: '4.0 stars and up' },
      { minRating: 4.5, label: '4.5 stars and up' }
    ];

    return {
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      languages,
      contentRatings,
      sortOptions,
      dateRanges,
      lengthPresets,
      ratingThresholds
    };
  }

  // searchJokes(query, filters, sortOrder, page, pageSize)
  searchJokes(query, filters, sortOrder, page, pageSize) {
    const q = this._normalizeString(query || '');
    const f = filters || {};
    const sort = sortOrder || 'top_rated';
    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    const categoriesById = this._buildCategoriesById();
    const favorites = this._getFromStorage('favorites', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const favoriteIds = new Set(favorites.map((x) => x.jokeId));
    const readingIds = new Set(readingListItems.map((x) => x.jokeId));

    let jokes = this._getFromStorage('jokes', []).filter((j) => j && j.status === 'published');

    // Text query
    if (q) {
      jokes = jokes.filter((j) => this._normalizeString(j.text).includes(q));
    }

    // Rating filters
    if (typeof f.minRating === 'number') {
      jokes = jokes.filter((j) => (j.rating || 0) >= f.minRating);
    }
    if (typeof f.maxRating === 'number') {
      jokes = jokes.filter((j) => (j.rating || 0) <= f.maxRating);
    }

    // Length filters
    if (typeof f.minLengthChars === 'number') {
      jokes = jokes.filter((j) => (j.lengthChars || 0) >= f.minLengthChars);
    }
    if (typeof f.maxLengthChars === 'number') {
      jokes = jokes.filter((j) => (j.lengthChars || 0) <= f.maxLengthChars);
    }

    // Language
    if (f.language) {
      jokes = jokes.filter((j) => j.language === f.language);
    }

    // Content rating
    if (f.contentRating) {
      jokes = jokes.filter((j) => j.contentRating === f.contentRating);
    }

    // Category
    if (f.categoryId) {
      jokes = jokes.filter((j) => j.categoryId === f.categoryId);
    }

    // Clean-only override in filters
    if (f.cleanOnly) {
      jokes = jokes.filter((j) => j.contentRating === 'clean');
    }

    // Date range
    if (f.postedFrom || f.postedTo || f.postedDateRange) {
      let start = null;
      let end = null;
      if (f.postedFrom || f.postedTo) {
        start = this._parseDate(f.postedFrom) || null;
        end = this._parseDate(f.postedTo) || null;
      } else if (f.postedDateRange) {
        const range = this._dateRangeFromLabel(f.postedDateRange);
        start = range.start;
        end = range.end;
      }
      jokes = jokes.filter((j) => {
        const d = this._parseDate(j.postedAt);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    // Apply global content preferences (but ignore category blocks so user can override)
    jokes = this._applyContentPreferencesToQuery(jokes, { ignoreCategoryBlocks: true });

    // Sorting
    jokes.sort((a, b) => {
      if (sort === 'most_recent') {
        const da = this._parseDate(a.postedAt) || new Date(0);
        const db = this._parseDate(b.postedAt) || new Date(0);
        return db - da;
      }
      if (sort === 'most_shared') {
        const sa = a.shareCount || 0;
        const sb = b.shareCount || 0;
        return sb - sa;
      }
      // default top_rated
      const ra = a.rating || 0;
      const rb = b.rating || 0;
      if (rb !== ra) return rb - ra;
      const rca = a.ratingCount || 0;
      const rcb = b.ratingCount || 0;
      if (rcb !== rca) return rcb - rca;
      const da = this._parseDate(a.postedAt) || new Date(0);
      const db = this._parseDate(b.postedAt) || new Date(0);
      return db - da;
    });

    const totalResults = jokes.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / size));
    const startIndex = (pageNum - 1) * size;
    const pageSlice = jokes.slice(startIndex, startIndex + size);

    const results = pageSlice.map((j) => {
      const withCategory = this._attachCategoryToJoke(j, categoriesById);
      return {
        id: withCategory.id,
        text: withCategory.text,
        categoryId: withCategory.categoryId,
        categoryName: withCategory.categoryName,
        category: withCategory.category || null,
        language: withCategory.language,
        contentRating: withCategory.contentRating,
        rating: withCategory.rating,
        ratingCount: withCategory.ratingCount,
        lengthChars: withCategory.lengthChars,
        tags: withCategory.tags || [],
        postedAt: withCategory.postedAt,
        shareCount: withCategory.shareCount,
        permalink: withCategory.permalink,
        isFavorited: favoriteIds.has(withCategory.id),
        isInReadingList: readingIds.has(withCategory.id),
        isClean: withCategory.contentRating === 'clean'
      };
    });

    return {
      results,
      page: pageNum,
      pageSize: size,
      totalResults,
      totalPages
    };
  }

  // getJokeDetail(jokeId)
  getJokeDetail(jokeId) {
    const jokes = this._getFromStorage('jokes', []);
    const joke = jokes.find((j) => j.id === jokeId) || null;
    if (!joke) {
      return {
        joke: null,
        isFavorited: false,
        isInReadingList: false,
        inCollections: []
      };
    }

    const categoriesById = this._buildCategoriesById();
    const favorites = this._getFromStorage('favorites', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const collectionItems = this._getFromStorage('collection_items', []);
    const collections = this._getFromStorage('collections', []);

    const withCategory = this._attachCategoryToJoke(joke, categoriesById);

    const isFavorited = favorites.some((f) => f.jokeId === jokeId);
    const isInReadingList = readingListItems.some((r) => r.jokeId === jokeId);

    const inCollections = collectionItems
      .filter((ci) => ci.jokeId === jokeId)
      .map((ci) => {
        const col = collections.find((c) => c.id === ci.collectionId) || null;
        return {
          collectionId: ci.collectionId,
          collectionName: col ? col.name : null,
          isPinned: col ? !!col.isPinned : false,
          collection: col // foreign key resolution
        };
      });

    return {
      joke: {
        id: withCategory.id,
        text: withCategory.text,
        categoryId: withCategory.categoryId,
        categoryName: withCategory.categoryName,
        category: withCategory.category || null,
        language: withCategory.language,
        contentRating: withCategory.contentRating,
        rating: withCategory.rating,
        ratingCount: withCategory.ratingCount,
        lengthChars: withCategory.lengthChars,
        tags: withCategory.tags || [],
        postedAt: withCategory.postedAt,
        shareCount: withCategory.shareCount,
        permalink: withCategory.permalink,
        status: withCategory.status,
        createdAt: withCategory.createdAt,
        updatedAt: withCategory.updatedAt || null
      },
      isFavorited,
      isInReadingList,
      inCollections
    };
  }

  // setJokeFavorite(jokeId, isFavorite, source)
  setJokeFavorite(jokeId, isFavorite, source) {
    let favorites = this._getFromStorage('favorites', []);
    const now = this._nowIso();
    const existingIndex = favorites.findIndex((f) => f.jokeId === jokeId);

    if (isFavorite) {
      if (existingIndex === -1) {
        favorites.push({
          id: this._generateId('fav'),
          jokeId,
          source: source || 'other',
          addedAt: now
        });
      } else {
        favorites[existingIndex].source = source || favorites[existingIndex].source;
        favorites[existingIndex].addedAt = now;
      }
      this._saveToStorage('favorites', favorites);
      return { success: true, isFavorite: true, message: 'Joke marked as favorite.' };
    }

    if (existingIndex !== -1) {
      favorites.splice(existingIndex, 1);
      this._saveToStorage('favorites', favorites);
    }
    return { success: true, isFavorite: false, message: 'Joke removed from favorites.' };
  }

  // listCollections()
  listCollections() {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);
    const counts = {};
    items.forEach((ci) => {
      counts[ci.collectionId] = (counts[ci.collectionId] || 0) + 1;
    });
    return collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      isPinned: !!c.isPinned,
      jokeCount: counts[c.id] || 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt || null
    }));
  }

  // createCollection(name, description, isPinned)
  createCollection(name, description, isPinned) {
    const collections = this._getFromStorage('collections', []);
    const now = this._nowIso();
    const collection = {
      id: this._generateId('col'),
      name: name,
      description: description || '',
      isPinned: !!isPinned,
      createdAt: now,
      updatedAt: null
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);
    return { collection };
  }

  // updateCollection(collectionId, name, description, isPinned)
  updateCollection(collectionId, name, description, isPinned) {
    const collections = this._getFromStorage('collections', []);
    const idx = collections.findIndex((c) => c.id === collectionId);
    if (idx === -1) {
      return { collection: null };
    }
    if (name !== undefined) collections[idx].name = name;
    if (description !== undefined) collections[idx].description = description;
    if (isPinned !== undefined) collections[idx].isPinned = !!isPinned;
    collections[idx].updatedAt = this._nowIso();
    this._saveToStorage('collections', collections);
    return { collection: collections[idx] };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    let collections = this._getFromStorage('collections', []);
    const initialLen = collections.length;
    collections = collections.filter((c) => c.id !== collectionId);
    this._saveToStorage('collections', collections);

    let items = this._getFromStorage('collection_items', []);
    items = items.filter((ci) => ci.collectionId !== collectionId);
    this._saveToStorage('collection_items', items);

    const success = collections.length < initialLen;
    return {
      success,
      message: success ? 'Collection deleted.' : 'Collection not found.'
    };
  }

  // addJokeToCollection(jokeId, collectionId)
  addJokeToCollection(jokeId, collectionId) {
    const collections = this._getFromStorage('collections', []);
    const jokes = this._getFromStorage('jokes', []);
    const items = this._getFromStorage('collection_items', []);

    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      return { success: false, collectionItemId: null, message: 'Collection not found.' };
    }
    const joke = jokes.find((j) => j.id === jokeId);
    if (!joke) {
      return { success: false, collectionItemId: null, message: 'Joke not found.' };
    }

    const existing = items.find((ci) => ci.collectionId === collectionId && ci.jokeId === jokeId);
    if (existing) {
      return { success: true, collectionItemId: existing.id, message: 'Joke already in collection.' };
    }

    const order = this._getOrCreateCollectionItemOrder(collectionId);
    const item = {
      id: this._generateId('colitem'),
      collectionId,
      jokeId,
      order,
      addedAt: this._nowIso()
    };
    items.push(item);
    this._saveToStorage('collection_items', items);

    return { success: true, collectionItemId: item.id, message: 'Joke added to collection.' };
  }

  // removeJokeFromCollection(collectionId, jokeId)
  removeJokeFromCollection(collectionId, jokeId) {
    let items = this._getFromStorage('collection_items', []);
    const initialLen = items.length;
    items = items.filter((ci) => !(ci.collectionId === collectionId && ci.jokeId === jokeId));
    this._saveToStorage('collection_items', items);
    const success = items.length < initialLen;
    return {
      success,
      message: success ? 'Joke removed from collection.' : 'Joke not found in collection.'
    };
  }

  // reorderCollectionItems(collectionId, orderedJokeIds)
  reorderCollectionItems(collectionId, orderedJokeIds) {
    const items = this._getFromStorage('collection_items', []);
    const idToItem = {};
    items.forEach((ci) => {
      if (ci.collectionId === collectionId) {
        idToItem[ci.jokeId] = ci;
      }
    });

    let orderCounter = 1;
    if (Array.isArray(orderedJokeIds)) {
      orderedJokeIds.forEach((jid) => {
        const ci = idToItem[jid];
        if (ci) {
          ci.order = orderCounter++;
        }
      });
    }

    // Any remaining items (not mentioned) keep their relative order but move to the end
    const remaining = Object.values(idToItem).filter((ci) => typeof ci.order !== 'number' || ci.order < 1);
    remaining.sort((a, b) => {
      const oa = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
      const ob = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
      return oa - ob;
    });
    remaining.forEach((ci) => {
      ci.order = orderCounter++;
    });

    this._saveToStorage('collection_items', items);
    return { success: true };
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);
    const jokes = this._getFromStorage('jokes', []);
    const categoriesById = this._buildCategoriesById();

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return {
        collection: null,
        jokes: []
      };
    }

    const collectionItems = items
      .filter((ci) => ci.collectionId === collectionId)
      .sort((a, b) => {
        const oa = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
        const ob = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
        if (oa !== ob) return oa - ob;
        const da = this._parseDate(a.addedAt) || new Date(0);
        const db = this._parseDate(b.addedAt) || new Date(0);
        return da - db;
      });

    const resultJokes = collectionItems.map((ci) => {
      const joke = jokes.find((j) => j.id === ci.jokeId) || null;
      const withCategory = this._attachCategoryToJoke(joke, categoriesById);
      return {
        collectionItemId: ci.id,
        order: ci.order,
        addedAt: ci.addedAt,
        joke: withCategory
          ? {
              id: withCategory.id,
              text: withCategory.text,
              categoryId: withCategory.categoryId,
              categoryName: withCategory.categoryName,
              category: withCategory.category || null,
              language: withCategory.language,
              rating: withCategory.rating,
              lengthChars: withCategory.lengthChars,
              contentRating: withCategory.contentRating
            }
          : null
      };
    });

    return {
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description || '',
        isPinned: !!collection.isPinned,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt || null
      },
      jokes: resultJokes
    };
  }

  // getCategoriesIndex()
  getCategoriesIndex() {
    const categories = this._getFromStorage('categories', []);
    const follows = this._getFromStorage('category_follows', []);
    const followedSet = new Set(
      follows.filter((f) => f.isActive).map((f) => f.categoryId)
    );

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      overallAverageRating: c.overallAverageRating || 0,
      jokeCount: c.jokeCount || 0,
      popularityScore: c.popularityScore || 0,
      isFollowed: followedSet.has(c.id)
    }));
  }

  // getCategoryTimeRangeSummary(categoryId, timeRange)
  getCategoryTimeRangeSummary(categoryId, timeRange) {
    const categoriesById = this._buildCategoriesById();
    const category = categoriesById[categoryId] || null;

    const jokes = this._getFromStorage('jokes', []).filter(
      (j) => j && j.status === 'published' && j.categoryId === categoryId
    );

    const rangeLabel = timeRange || 'all_time';
    const range = this._dateRangeFromLabel(rangeLabel);
    const filtered = jokes.filter((j) => {
      const d = this._parseDate(j.postedAt);
      if (!d) return false;
      if (range.start && d < range.start) return false;
      if (range.end && d > range.end) return false;
      return true;
    });

    const jokeCount = filtered.length;
    let averageRating = 0;
    if (jokeCount > 0) {
      const sum = filtered.reduce((acc, j) => acc + (j.rating || 0), 0);
      averageRating = sum / jokeCount;
    }

    return {
      categoryId,
      categoryName: category ? category.name : null,
      category: category || null,
      timeRange: rangeLabel,
      averageRating,
      jokeCount
    };
  }

  // getCategoryJokes(categoryId, timeRange, filters, sortOrder, page, pageSize)
  getCategoryJokes(categoryId, timeRange, filters, sortOrder, page, pageSize) {
    const categoriesById = this._buildCategoriesById();
    const category = categoriesById[categoryId] || null;
    const f = filters || {};
    const sort = sortOrder || 'top_rated';
    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    const favorites = this._getFromStorage('favorites', []);
    const favoriteIds = new Set(favorites.map((x) => x.jokeId));

    let jokes = this._getFromStorage('jokes', []).filter(
      (j) => j && j.status === 'published' && j.categoryId === categoryId
    );

    const rangeLabel = timeRange || 'all_time';
    const range = this._dateRangeFromLabel(rangeLabel);
    jokes = jokes.filter((j) => {
      const d = this._parseDate(j.postedAt);
      if (!d) return false;
      if (range.start && d < range.start) return false;
      if (range.end && d > range.end) return false;
      return true;
    });

    // Filters
    if (typeof f.minRating === 'number') {
      jokes = jokes.filter((j) => (j.rating || 0) >= f.minRating);
    }
    if (typeof f.maxRating === 'number') {
      jokes = jokes.filter((j) => (j.rating || 0) <= f.maxRating);
    }
    if (typeof f.minLengthChars === 'number') {
      jokes = jokes.filter((j) => (j.lengthChars || 0) >= f.minLengthChars);
    }
    if (typeof f.maxLengthChars === 'number') {
      jokes = jokes.filter((j) => (j.lengthChars || 0) <= f.maxLengthChars);
    }
    if (f.language) {
      jokes = jokes.filter((j) => j.language === f.language);
    }
    if (f.contentRating) {
      jokes = jokes.filter((j) => j.contentRating === f.contentRating);
    }

    // Apply global content preferences (ignore category blocks because category fixed)
    jokes = this._applyContentPreferencesToQuery(jokes, { ignoreCategoryBlocks: true });

    // Sort
    jokes.sort((a, b) => {
      if (sort === 'most_recent') {
        const da = this._parseDate(a.postedAt) || new Date(0);
        const db = this._parseDate(b.postedAt) || new Date(0);
        return db - da;
      }
      if (sort === 'most_shared') {
        const sa = a.shareCount || 0;
        const sb = b.shareCount || 0;
        return sb - sa;
      }
      const ra = a.rating || 0;
      const rb = b.rating || 0;
      if (rb !== ra) return rb - ra;
      const rca = a.ratingCount || 0;
      const rcb = b.ratingCount || 0;
      if (rcb !== rca) return rcb - rca;
      const da = this._parseDate(a.postedAt) || new Date(0);
      const db = this._parseDate(b.postedAt) || new Date(0);
      return db - da;
    });

    const totalInRange = jokes.length;
    const totalPages = Math.max(1, Math.ceil(totalInRange / size));
    const startIndex = (pageNum - 1) * size;
    const pageSlice = jokes.slice(startIndex, startIndex + size);

    const jokesResult = pageSlice.map((j) => {
      const withCategory = this._attachCategoryToJoke(j, categoriesById);
      return {
        id: withCategory.id,
        text: withCategory.text,
        language: withCategory.language,
        contentRating: withCategory.contentRating,
        rating: withCategory.rating,
        ratingCount: withCategory.ratingCount,
        lengthChars: withCategory.lengthChars,
        tags: withCategory.tags || [],
        postedAt: withCategory.postedAt,
        shareCount: withCategory.shareCount,
        permalink: withCategory.permalink,
        categoryId: withCategory.categoryId,
        categoryName: withCategory.categoryName,
        category: withCategory.category || null,
        isFavorited: favoriteIds.has(withCategory.id)
      };
    });

    // Summary metrics for current range
    let currentRangeAverageRating = 0;
    if (totalInRange > 0) {
      const sum = jokes.reduce((acc, j) => acc + (j.rating || 0), 0);
      currentRangeAverageRating = sum / totalInRange;
    }

    return {
      category: {
        id: categoryId,
        name: category ? category.name : null,
        description: category ? category.description || '' : '',
        isFollowed: false, // can be enriched by caller using getCategoriesIndex if needed
        currentRangeAverageRating,
        currentRangeJokeCount: totalInRange
      },
      jokes: jokesResult,
      page: pageNum,
      totalPages
    };
  }

  // setCategoryFollowStatus(categoryId, isActive)
  setCategoryFollowStatus(categoryId, isActive) {
    const follows = this._getFromStorage('category_follows', []);
    const idx = follows.findIndex((f) => f.categoryId === categoryId);
    const now = this._nowIso();

    if (idx === -1) {
      const follow = {
        id: this._generateId('catfollow'),
        categoryId,
        isActive: !!isActive,
        followedAt: now
      };
      follows.push(follow);
      this._saveToStorage('category_follows', follows);
      return { isActive: !!isActive, followedAt: follow.followedAt };
    }

    follows[idx].isActive = !!isActive;
    if (isActive) {
      follows[idx].followedAt = now;
    }
    this._saveToStorage('category_follows', follows);
    return { isActive: !!isActive, followedAt: follows[idx].followedAt };
  }

  // getRandomJokes(pageSize, refreshToken)
  getRandomJokes(pageSize, refreshToken) {
    const categoriesById = this._buildCategoriesById();
    const favorites = this._getFromStorage('favorites', []);
    const favoriteIds = new Set(favorites.map((f) => f.jokeId));

    const jokes = this._selectRandomJokes(pageSize, refreshToken).map((j) => {
      const withCategory = this._attachCategoryToJoke(j, categoriesById);
      return {
        id: withCategory.id,
        text: withCategory.text,
        categoryId: withCategory.categoryId,
        categoryName: withCategory.categoryName,
        category: withCategory.category || null,
        language: withCategory.language,
        contentRating: withCategory.contentRating,
        rating: withCategory.rating,
        ratingCount: withCategory.ratingCount,
        lengthChars: withCategory.lengthChars,
        postedAt: withCategory.postedAt,
        shareCount: withCategory.shareCount,
        permalink: withCategory.permalink,
        isFavorited: favoriteIds.has(withCategory.id)
      };
    });

    const newToken = this._generateId('rand');
    return {
      jokes,
      refreshToken: newToken
    };
  }

  // submitJokeReport(jokeId, reason, comment, source)
  submitJokeReport(jokeId, reason, comment, source) {
    const allowedReasons = new Set([
      'not_funny',
      'spam',
      'offensive',
      'nsfw',
      'duplicate',
      'wrong_language',
      'other'
    ]);
    const allowedSources = new Set([
      'random_feed',
      'joke_detail',
      'browse',
      'category',
      'home',
      'other'
    ]);

    const finalReason = allowedReasons.has(reason) ? reason : 'other';
    const finalSource = allowedSources.has(source) ? source : 'other';

    const reports = this._getFromStorage('joke_reports', []);
    const report = {
      id: this._generateId('report'),
      jokeId,
      reason: finalReason,
      comment: comment || '',
      createdAt: this._nowIso(),
      status: 'open',
      source: finalSource
    };
    reports.push(report);
    this._saveToStorage('joke_reports', reports);

    return {
      reportId: report.id,
      status: report.status,
      createdAt: report.createdAt
    };
  }

  // getFavoriteJokes(page, pageSize)
  getFavoriteJokes(page, pageSize) {
    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;

    const favorites = this._getFromStorage('favorites', []);
    const jokes = this._getFromStorage('jokes', []);
    const categoriesById = this._buildCategoriesById();

    const sortedFavs = favorites.slice().sort((a, b) => {
      const da = this._parseDate(a.addedAt) || new Date(0);
      const db = this._parseDate(b.addedAt) || new Date(0);
      return db - da;
    });

    const totalResults = sortedFavs.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / size));
    const startIndex = (pageNum - 1) * size;
    const slice = sortedFavs.slice(startIndex, startIndex + size);

    const resultJokes = slice
      .map((f) => jokes.find((j) => j.id === f.jokeId) || null)
      .filter((j) => !!j)
      .map((j) => {
        const withCategory = this._attachCategoryToJoke(j, categoriesById);
        return {
          id: withCategory.id,
          text: withCategory.text,
          categoryId: withCategory.categoryId,
          categoryName: withCategory.categoryName,
          category: withCategory.category || null,
          language: withCategory.language,
          rating: withCategory.rating,
          lengthChars: withCategory.lengthChars,
          contentRating: withCategory.contentRating,
          postedAt: withCategory.postedAt
        };
      });

    return {
      jokes: resultJokes,
      page: pageNum,
      totalPages
    };
  }

  // getReadingListItems(page, pageSize)
  getReadingListItems(page, pageSize) {
    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;

    const items = this._getFromStorage('reading_list_items', []);
    const jokes = this._getFromStorage('jokes', []);
    const categoriesById = this._buildCategoriesById();

    const sorted = items.slice().sort((a, b) => {
      const da = this._parseDate(a.addedAt) || new Date(0);
      const db = this._parseDate(b.addedAt) || new Date(0);
      return db - da;
    });

    const totalResults = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / size));
    const startIndex = (pageNum - 1) * size;
    const slice = sorted.slice(startIndex, startIndex + size);

    const resultItems = slice.map((item) => {
      const joke = jokes.find((j) => j.id === item.jokeId) || null;
      const withCategory = joke ? this._attachCategoryToJoke(joke, categoriesById) : null;
      return {
        readingListItemId: item.id,
        addedAt: item.addedAt,
        source: item.source,
        sourceUrl: item.sourceUrl || null,
        joke: withCategory
          ? {
              id: withCategory.id,
              text: withCategory.text,
              categoryId: withCategory.categoryId,
              categoryName: withCategory.categoryName,
              category: withCategory.category || null,
              language: withCategory.language,
              rating: withCategory.rating,
              lengthChars: withCategory.lengthChars
            }
          : null
      };
    });

    return {
      items: resultItems,
      page: pageNum,
      totalPages
    };
  }

  // addToReadingListByJokeId(jokeId, source, sourceUrl)
  addToReadingListByJokeId(jokeId, source, sourceUrl) {
    const jokes = this._getFromStorage('jokes', []);
    const joke = jokes.find((j) => j.id === jokeId);
    if (!joke) {
      return { readingListItemId: null, addedAt: null };
    }

    let items = this._getFromStorage('reading_list_items', []);
    const idx = items.findIndex((it) => it.jokeId === jokeId);
    const now = this._nowIso();

    if (idx === -1) {
      const item = {
        id: this._generateId('read'),
        jokeId,
        source: source || 'copied_link',
        sourceUrl: sourceUrl || joke.permalink || null,
        addedAt: now
      };
      items.push(item);
      this._persistReadingList(items);
      return { readingListItemId: item.id, addedAt: item.addedAt };
    }

    items[idx].source = source || items[idx].source;
    items[idx].sourceUrl = sourceUrl || items[idx].sourceUrl;
    items[idx].addedAt = now;
    this._persistReadingList(items);
    return { readingListItemId: items[idx].id, addedAt: items[idx].addedAt };
  }

  // removeFromReadingList(readingListItemId)
  removeFromReadingList(readingListItemId) {
    let items = this._getFromStorage('reading_list_items', []);
    const initialLen = items.length;
    items = items.filter((it) => it.id !== readingListItemId);
    this._persistReadingList(items);
    return { success: items.length < initialLen };
  }

  // getContentPreferences()
  getContentPreferences() {
    const prefs = this._getOrCreateContentPreferences();
    return {
      cleanOnly: !!prefs.cleanOnly,
      preferredCategoryIds: Array.isArray(prefs.preferredCategoryIds) ? prefs.preferredCategoryIds : [],
      blockedCategoryIds: Array.isArray(prefs.blockedCategoryIds) ? prefs.blockedCategoryIds : [],
      maxJokeLengthChars: prefs.maxJokeLengthChars,
      homepageSortOrder: prefs.homepageSortOrder,
      updatedAt: prefs.updatedAt
    };
  }

  // updateContentPreferences(cleanOnly, preferredCategoryIds, blockedCategoryIds, maxJokeLengthChars, homepageSortOrder)
  updateContentPreferences(cleanOnly, preferredCategoryIds, blockedCategoryIds, maxJokeLengthChars, homepageSortOrder) {
    const current = this._getOrCreateContentPreferences();
    const updated = { ...current };

    if (cleanOnly !== undefined) updated.cleanOnly = !!cleanOnly;
    if (preferredCategoryIds !== undefined) updated.preferredCategoryIds = Array.isArray(preferredCategoryIds) ? preferredCategoryIds : [];
    if (blockedCategoryIds !== undefined) updated.blockedCategoryIds = Array.isArray(blockedCategoryIds) ? blockedCategoryIds : [];
    if (maxJokeLengthChars !== undefined && typeof maxJokeLengthChars === 'number') {
      updated.maxJokeLengthChars = maxJokeLengthChars;
    }
    if (homepageSortOrder !== undefined) updated.homepageSortOrder = homepageSortOrder;

    const saved = this._saveContentPreferences(updated);
    return {
      preferences: {
        cleanOnly: saved.cleanOnly,
        preferredCategoryIds: saved.preferredCategoryIds,
        blockedCategoryIds: saved.blockedCategoryIds,
        maxJokeLengthChars: saved.maxJokeLengthChars,
        homepageSortOrder: saved.homepageSortOrder,
        updatedAt: saved.updatedAt
      }
    };
  }

  // resetContentPreferencesToDefault()
  resetContentPreferencesToDefault() {
    const defaults = {
      id: 'content_pref_1',
      cleanOnly: false,
      preferredCategoryIds: [],
      blockedCategoryIds: [],
      maxJokeLengthChars: 10000,
      homepageSortOrder: 'recommended',
      updatedAt: this._nowIso()
    };
    localStorage.setItem('content_preferences', JSON.stringify(defaults));
    return {
      preferences: {
        cleanOnly: defaults.cleanOnly,
        preferredCategoryIds: defaults.preferredCategoryIds,
        blockedCategoryIds: defaults.blockedCategoryIds,
        maxJokeLengthChars: defaults.maxJokeLengthChars,
        homepageSortOrder: defaults.homepageSortOrder,
        updatedAt: defaults.updatedAt
      }
    };
  }

  // getSubmitJokeMetadata()
  getSubmitJokeMetadata() {
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);

    const languages = [
      { value: 'english', label: 'English' },
      { value: 'spanish', label: 'Spanish' },
      { value: 'french', label: 'French' },
      { value: 'german', label: 'German' },
      { value: 'other', label: 'Other' }
    ];

    const contentRatings = [
      { value: 'clean', label: 'Clean / General Audience' },
      { value: 'nsfw', label: 'NSFW / Adult' }
    ];

    // Basic limits; can be adjusted without affecting storage model
    const minTextLengthChars = 1;
    const maxTextLengthChars = 5000;

    const featuredTags = tags.filter((t) => t && t.isFeatured);

    return {
      categories,
      languages,
      contentRatings,
      featuredTags,
      minTextLengthChars,
      maxTextLengthChars
    };
  }

  // previewJokeSubmission(text, categoryId, language, contentRating, tags)
  previewJokeSubmission(text, categoryId, language, contentRating, tags) {
    const categoriesById = this._buildCategoriesById();
    const validationErrors = [];

    const trimmedText = (text || '').toString();
    if (!trimmedText || !trimmedText.trim()) {
      validationErrors.push('Text is required.');
    }

    if (!categoryId || !categoriesById[categoryId]) {
      validationErrors.push('Valid categoryId is required.');
    }

    const allowedLanguages = new Set(['english', 'spanish', 'french', 'german', 'other']);
    if (!allowedLanguages.has(language)) {
      validationErrors.push('Invalid language.');
    }

    const allowedContentRatings = new Set(['clean', 'nsfw']);
    if (!allowedContentRatings.has(contentRating)) {
      validationErrors.push('Invalid contentRating.');
    }

    const tagsArray = Array.isArray(tags) ? tags : [];
    const lengthChars = trimmedText.length;

    const previewId = this._generateId('preview');
    const previews = this._getFromStorage('joke_previews', []);
    previews.push({
      id: previewId,
      text: trimmedText,
      categoryId,
      language,
      contentRating,
      tags: tagsArray,
      lengthChars,
      createdAt: this._nowIso()
    });
    this._saveToStorage('joke_previews', previews);

    const category = categoriesById[categoryId] || null;

    return {
      previewId,
      joke: {
        text: trimmedText,
        categoryId,
        categoryName: category ? category.name : null,
        category,
        language,
        contentRating,
        tags: tagsArray,
        lengthChars
      },
      validationErrors
    };
  }

  // publishJokeFromPreview(previewId)
  publishJokeFromPreview(previewId) {
    let previews = this._getFromStorage('joke_previews', []);
    const idx = previews.findIndex((p) => p.id === previewId);
    if (idx === -1) {
      return {
        success: false,
        jokeId: null,
        permalink: null,
        message: 'Preview not found.'
      };
    }

    const preview = previews[idx];
    const jokes = this._getFromStorage('jokes', []);
    const now = this._nowIso();

    const jokeId = this._generateId('joke');
    const permalink = 'joke_detail.html?id=' + encodeURIComponent(jokeId);

    const joke = {
      id: jokeId,
      text: preview.text,
      categoryId: preview.categoryId,
      language: preview.language,
      contentRating: preview.contentRating,
      rating: 0,
      ratingCount: 0,
      lengthChars: preview.lengthChars,
      tags: Array.isArray(preview.tags) ? preview.tags : [],
      postedAt: now,
      shareCount: 0,
      isRandomEligible: true,
      status: 'published',
      permalink,
      createdAt: now,
      updatedAt: null
    };

    jokes.push(joke);
    this._saveToStorage('jokes', jokes);

    // Remove preview after publishing
    previews.splice(idx, 1);
    this._saveToStorage('joke_previews', previews);

    return {
      success: true,
      jokeId,
      permalink,
      message: 'Joke published successfully.'
    };
  }

  // getRelatedJokesForDetail(jokeId, limit)
  getRelatedJokesForDetail(jokeId, limit) {
    const jokes = this._getFromStorage('jokes', []);
    const categoriesById = this._buildCategoriesById();
    const target = jokes.find((j) => j.id === jokeId);
    if (!target) return [];

    const max = typeof limit === 'number' && limit > 0 ? limit : 5;

    const base = jokes.filter((j) => j.status === 'published' && j.id !== jokeId);

    const targetTags = new Set(Array.isArray(target.tags) ? target.tags : []);

    const scored = base.map((j) => {
      let score = 0;
      if (j.categoryId === target.categoryId) score += 3;
      const tags = Array.isArray(j.tags) ? j.tags : [];
      const sharedTags = tags.filter((t) => targetTags.has(t));
      score += sharedTags.length;
      score += (j.rating || 0) * 0.5;
      return { joke: j, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, max).map((s) => {
      const withCategory = this._attachCategoryToJoke(s.joke, categoriesById);
      return {
        id: withCategory.id,
        text: withCategory.text,
        categoryId: withCategory.categoryId,
        categoryName: withCategory.categoryName,
        category: withCategory.category || null,
        rating: withCategory.rating,
        lengthChars: withCategory.lengthChars
      };
    });

    return top;
  }
}

// Global exposure for browser & Node.js
if (typeof globalThis !== 'undefined') {
  // Attach class and a default instance without referencing window/document directly
  globalThis.BusinessLogic = BusinessLogic;
  globalThis.WebsiteSDK = new BusinessLogic();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
