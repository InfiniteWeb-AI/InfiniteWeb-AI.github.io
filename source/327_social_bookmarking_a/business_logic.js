// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  // Simple in-memory polyfill
  var store = {};
  var polyfill = {
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
  try {
    if (typeof globalThis !== "undefined" && !globalThis.localStorage) {
      globalThis.localStorage = polyfill;
    }
  } catch (e) {}
  return polyfill;
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
  }

  // ==========================
  // Storage helpers
  // ==========================

  _initStorage() {
    const keys = [
      'bookmarks',
      'saved_bookmarks',
      'collections',
      'collection_items',
      'categories',
      'tags',
      'comments',
      'curators',
      'follows'
    ];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
    // Single-account storage (for createAccount)
    if (!localStorage.getItem('account')) {
      localStorage.setItem('account', 'null');
    }
    // Content pages (can be overridden in storage)
    if (!localStorage.getItem('about_content')) {
      const about = {
        title: 'About This Bookmarking Service',
        contentSections: [
          {
            heading: 'What is this?',
            bodyHtml: '<p>A social bookmarking and link sharing website for curators and learners.</p>'
          },
          {
            heading: 'How it works',
            bodyHtml: '<p>Save bookmarks, organize them into collections, and discover resources from other curators.</p>'
          }
        ]
      };
      localStorage.setItem('about_content', JSON.stringify(about));
    }
    if (!localStorage.getItem('help_content')) {
      const help = {
        topics: [
          {
            slug: 'saving-bookmarks',
            title: 'Saving bookmarks',
            summary: 'How to save bookmarks and add them to collections.'
          },
          {
            slug: 'creating-collections',
            title: 'Creating collections',
            summary: 'Group related bookmarks together.'
          }
        ],
        bodies: {
          'saving-bookmarks': {
            slug: 'saving-bookmarks',
            title: 'Saving bookmarks',
            bodyHtml: '<p>Use the Save button on any bookmark to add it to your library or a collection.</p>'
          },
          'creating-collections': {
            slug: 'creating-collections',
            title: 'Creating collections',
            bodyHtml: '<p>Create collections from the Collections page or inline when saving a bookmark.</p>'
          }
        }
      };
      localStorage.setItem('help_content', JSON.stringify(help));
    }
    if (!localStorage.getItem('privacy_policy_content')) {
      const policy = {
        title: 'Privacy Policy',
        sections: [
          {
            heading: 'Overview',
            bodyHtml: '<p>This is a demo privacy policy stored in localStorage.</p>'
          }
        ]
      };
      localStorage.setItem('privacy_policy_content', JSON.stringify(policy));
    }
    if (!localStorage.getItem('terms_of_use_content')) {
      const terms = {
        title: 'Terms of Use',
        sections: [
          {
            heading: 'Overview',
            bodyHtml: '<p>These are demo terms of use stored in localStorage.</p>'
          }
        ]
      };
      localStorage.setItem('terms_of_use_content', JSON.stringify(terms));
    }

    if (!localStorage.getItem('idCounter')) {
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _slugify(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  _paginate(array, page, pageSize) {
    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const totalItems = array.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ps));
    const start = (p - 1) * ps;
    const end = start + ps;
    return {
      items: array.slice(start, end),
      pagination: {
        page: p,
        pageSize: ps,
        totalItems: totalItems,
        totalPages: totalPages
      }
    };
  }

  _isWithinDateRange(date, rangeId) {
    if (!date || !rangeId || rangeId === 'any') return true;
    const now = new Date();
    const ts = date.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    if (rangeId === 'last_7_days') {
      return ts >= now.getTime() - 7 * dayMs;
    }
    if (rangeId === 'last_30_days' || rangeId === 'this_month') {
      return ts >= now.getTime() - 30 * dayMs;
    }
    if (rangeId === 'older_than_30_days') {
      return ts < now.getTime() - 30 * dayMs;
    }
    return true;
  }

  _resolveCategory(categoryId, categoriesMap) {
    if (!categoryId) return null;
    return categoriesMap[categoryId] || null;
  }

  _resolveTags(tagIds, tagsMap) {
    if (!Array.isArray(tagIds)) return [];
    const result = [];
    for (let i = 0; i < tagIds.length; i++) {
      const t = tagsMap[tagIds[i]];
      if (t) result.push(t);
    }
    return result;
  }

  _buildCategoriesMap() {
    const categories = this._getFromStorage('categories');
    const map = {};
    for (let i = 0; i < categories.length; i++) {
      map[categories[i].id] = categories[i];
    }
    return map;
  }

  _buildTagsMap() {
    const tags = this._getFromStorage('tags');
    const map = {};
    for (let i = 0; i < tags.length; i++) {
      map[tags[i].id] = tags[i];
    }
    return map;
  }

  _buildBookmarksMap() {
    const bookmarks = this._getFromStorage('bookmarks');
    const map = {};
    for (let i = 0; i < bookmarks.length; i++) {
      map[bookmarks[i].id] = bookmarks[i];
    }
    return map;
  }

  _buildSavedBookmarksMap() {
    const saved = this._getFromStorage('saved_bookmarks');
    const map = {};
    for (let i = 0; i < saved.length; i++) {
      map[saved[i].id] = saved[i];
    }
    return map;
  }

  // ==========================
  // Private helpers from spec
  // ==========================

  // Find or create a SavedBookmark for the single current agent
  _getOrCreateSavedBookmark(bookmarkId, visibility) {
    const nowIso = this._nowIso();
    let saved = this._getFromStorage('saved_bookmarks');
    let existing = null;
    for (let i = 0; i < saved.length; i++) {
      if (saved[i].bookmarkId === bookmarkId && !saved[i].isDeleted) {
        existing = saved[i];
        break;
      }
    }
    if (existing) {
      return existing;
    }
    const newSaved = {
      id: this._generateId('saved'),
      bookmarkId: bookmarkId,
      personalTitle: null,
      notes: null,
      tagIds: [],
      visibility: visibility === 'private' ? 'private' : 'public',
      savedAt: nowIso,
      lastModifiedAt: nowIso,
      isDeleted: false
    };
    saved.push(newSaved);
    this._saveToStorage('saved_bookmarks', saved);
    return newSaved;
  }

  // Resolve collectionAction into a concrete Collection
  _getOrCreateCollectionFromAction(collectionAction) {
    if (!collectionAction || typeof collectionAction !== 'object') {
      return { success: false, error: 'invalid_collection_action', collection: null };
    }
    const mode = collectionAction.mode;
    let collections = this._getFromStorage('collections');
    if (mode === 'existing') {
      const cid = collectionAction.collectionId;
      if (!cid) {
        return { success: false, error: 'collection_id_required', collection: null };
      }
      for (let i = 0; i < collections.length; i++) {
        if (collections[i].id === cid) {
          return { success: true, collection: collections[i] };
        }
      }
      return { success: false, error: 'collection_not_found', collection: null };
    }
    if (mode === 'create_new') {
      const title = collectionAction.newCollectionTitle;
      if (!title) {
        return { success: false, error: 'collection_title_required', collection: null };
      }
      const visibility = collectionAction.newCollectionVisibility === 'public' ? 'public' : 'private';
      const nowIso = this._nowIso();
      const id = this._generateId('col');
      const slugBase = this._slugify(title);
      const shareSlug = slugBase ? slugBase + '-' + id : id;
      const publicShareUrl = 'https://example.com/collections/' + shareSlug;
      const newCollection = {
        id: id,
        title: title,
        description: null,
        visibility: visibility,
        bookmarkCount: 0,
        shareSlug: shareSlug,
        publicShareUrl: publicShareUrl,
        lastShareLinkCopiedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      collections.push(newCollection);
      this._saveToStorage('collections', collections);
      return { success: true, collection: newCollection };
    }
    return { success: false, error: 'invalid_collection_action_mode', collection: null };
  }

  // Apply filters for searchBookmarks on global bookmarks
  _applyBookmarkSearchFilters(bookmarks, filters) {
    if (!filters) return bookmarks.slice();
    const categoryId = filters.categoryId || null;
    const tagIds = Array.isArray(filters.tagIds) ? filters.tagIds : null;
    const datePostedRange = filters.datePostedRange || 'any';
    const minRating = typeof filters.minRating === 'number' ? filters.minRating : null;
    const minSaves = typeof filters.minSaves === 'number' ? filters.minSaves : null;
    const maxSaves = typeof filters.maxSaves === 'number' ? filters.maxSaves : null;
    const minComments = typeof filters.minComments === 'number' ? filters.minComments : null;

    const result = [];
    for (let i = 0; i < bookmarks.length; i++) {
      const b = bookmarks[i];
      if (categoryId && b.categoryId !== categoryId) continue;
      if (tagIds && tagIds.length > 0) {
        if (!Array.isArray(b.tagIds)) continue;
        let hasAny = false;
        for (let j = 0; j < tagIds.length; j++) {
          if (b.tagIds.indexOf(tagIds[j]) !== -1) {
            hasAny = true;
            break;
          }
        }
        if (!hasAny) continue;
      }
      const createdAt = this._parseDate(b.createdAt);
      if (!this._isWithinDateRange(createdAt, datePostedRange)) continue;
      if (minRating !== null) {
        const rating = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        if (rating < minRating) continue;
      }
      if (minSaves !== null) {
        const saves = typeof b.savesCount === 'number' ? b.savesCount : 0;
        if (saves < minSaves) continue;
      }
      if (maxSaves !== null) {
        const saves2 = typeof b.savesCount === 'number' ? b.savesCount : 0;
        if (saves2 > maxSaves) continue;
      }
      if (minComments !== null) {
        const comments = typeof b.commentsCount === 'number' ? b.commentsCount : 0;
        if (comments < minComments) continue;
      }
      result.push(b);
    }
    return result;
  }

  _updateCollectionBookmarkCount(collectionId) {
    const collectionItems = this._getFromStorage('collection_items');
    let collections = this._getFromStorage('collections');
    let count = 0;
    for (let i = 0; i < collectionItems.length; i++) {
      if (collectionItems[i].collectionId === collectionId) {
        count++;
      }
    }
    let updated = false;
    const nowIso = this._nowIso();
    for (let j = 0; j < collections.length; j++) {
      if (collections[j].id === collectionId) {
        collections[j].bookmarkCount = count;
        collections[j].updatedAt = nowIso;
        updated = true;
        break;
      }
    }
    if (updated) {
      this._saveToStorage('collections', collections);
    }
  }

  _recordCollectionShareCopy(collectionId) {
    let collections = this._getFromStorage('collections');
    const nowIso = this._nowIso();
    let updatedCollection = null;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === collectionId) {
        collections[i].lastShareLinkCopiedAt = nowIso;
        updatedCollection = collections[i];
        break;
      }
    }
    if (updatedCollection) {
      this._saveToStorage('collections', collections);
    }
    return updatedCollection;
  }

  // ==========================
  // Core interface implementations
  // ==========================

  // createAccount(username, password, confirmPassword)
  createAccount(username, password, confirmPassword) {
    if (!username || !password || !confirmPassword) {
      return {
        success: false,
        message: 'username_password_required',
        onboardingComplete: false
      };
    }
    if (password !== confirmPassword) {
      return {
        success: false,
        message: 'password_mismatch',
        onboardingComplete: false
      };
    }
    const existingRaw = localStorage.getItem('account');
    if (existingRaw && existingRaw !== 'null') {
      const existing = JSON.parse(existingRaw);
      if (existing && existing.username && existing.username !== username) {
        return {
          success: false,
          message: 'account_already_exists',
          onboardingComplete: !!existing.onboardingComplete
        };
      }
    }
    const account = {
      username: username,
      password: password,
      createdAt: this._nowIso(),
      onboardingComplete: true
    };
    localStorage.setItem('account', JSON.stringify(account));
    return {
      success: true,
      message: 'account_created',
      onboardingComplete: true
    };
  }

  // getHomeFeed(mode, timeRange, page, pageSize)
  getHomeFeed(mode, timeRange, page, pageSize) {
    const bookmarks = this._getFromStorage('bookmarks');
    const saved = this._getFromStorage('saved_bookmarks');
    const categoriesMap = this._buildCategoriesMap();
    const tagsMap = this._buildTagsMap();

    const effectiveMode = mode || 'personalized';
    const effectiveRange = timeRange || 'this_week';

    const filtered = [];
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = 0; i < bookmarks.length; i++) {
      const b = bookmarks[i];
      const createdAt = this._parseDate(b.createdAt);
      if (!createdAt) continue;
      if (effectiveRange === 'today') {
        if (createdAt.getTime() < now.getTime() - dayMs) continue;
      } else if (effectiveRange === 'this_week') {
        if (createdAt.getTime() < now.getTime() - 7 * dayMs) continue;
      } else if (effectiveRange === 'this_month') {
        if (createdAt.getTime() < now.getTime() - 30 * dayMs) continue;
      }
      filtered.push(b);
    }

    // For 'personalized', prefer saved bookmarks first; for 'trending', sort by savesCount
    if (effectiveMode === 'trending') {
      filtered.sort(function (a, b) {
        const sa = typeof a.savesCount === 'number' ? a.savesCount : 0;
        const sb = typeof b.savesCount === 'number' ? b.savesCount : 0;
        return sb - sa;
      });
    } else {
      // personalized: sort by whether saved, then by createdAt desc
      const savedSet = {};
      for (let i = 0; i < saved.length; i++) {
        if (!saved[i].isDeleted) {
          savedSet[saved[i].bookmarkId] = true;
        }
      }
      filtered.sort((a, b) => {
        const aSaved = savedSet[a.id] ? 1 : 0;
        const bSaved = savedSet[b.id] ? 1 : 0;
        if (aSaved !== bSaved) return bSaved - aSaved;
        const ad = this._parseDate(a.createdAt) || new Date(0);
        const bd = this._parseDate(b.createdAt) || new Date(0);
        return bd.getTime() - ad.getTime();
      });
    }

    const { items, pagination } = this._paginate(filtered, page, pageSize || 20);

    const resultBookmarks = [];
    for (let i = 0; i < items.length; i++) {
      const b = items[i];
      let savedBookmark = null;
      for (let j = 0; j < saved.length; j++) {
        if (!saved[j].isDeleted && saved[j].bookmarkId === b.id) {
          savedBookmark = saved[j];
          break;
        }
      }
      const category = this._resolveCategory(b.categoryId, categoriesMap);
      const tags = this._resolveTags(b.tagIds, tagsMap);
      const tagNames = [];
      for (let t = 0; t < tags.length; t++) tagNames.push(tags[t].name);

      resultBookmarks.push({
        id: b.id,
        title: b.title,
        url: b.url,
        description: b.description || '',
        categoryId: b.categoryId || null,
        categoryName: category ? category.name : null,
        category: category || null,
        tagIds: Array.isArray(b.tagIds) ? b.tagIds : [],
        tagNames: tagNames,
        tags: tags,
        ratingAverage: typeof b.ratingAverage === 'number' ? b.ratingAverage : 0,
        ratingCount: typeof b.ratingCount === 'number' ? b.ratingCount : 0,
        savesCount: typeof b.savesCount === 'number' ? b.savesCount : 0,
        commentsCount: typeof b.commentsCount === 'number' ? b.commentsCount : 0,
        thumbnailUrl: b.thumbnailUrl || null,
        createdAt: b.createdAt || null,
        isSavedByCurrentAgent: !!savedBookmark,
        savedBookmarkId: savedBookmark ? savedBookmark.id : null,
        personalTagIds: savedBookmark && Array.isArray(savedBookmark.tagIds) ? savedBookmark.tagIds : [],
        visibility: savedBookmark ? savedBookmark.visibility : null,
        savedAt: savedBookmark ? savedBookmark.savedAt : null
      });
    }

    // Featured collections: simple sort by recently updated
    const collections = this._getFromStorage('collections');
    collections.sort((a, b) => {
      const ad = this._parseDate(a.updatedAt || a.createdAt) || new Date(0);
      const bd = this._parseDate(b.updatedAt || b.createdAt) || new Date(0);
      return bd.getTime() - ad.getTime();
    });
    const featuredCollections = [];
    const maxFeatured = 10;
    for (let i = 0; i < collections.length && i < maxFeatured; i++) {
      const c = collections[i];
      featuredCollections.push({
        id: c.id,
        title: c.title,
        description: c.description || '',
        visibility: c.visibility,
        bookmarkCount: typeof c.bookmarkCount === 'number' ? c.bookmarkCount : 0,
        updatedAt: c.updatedAt || c.createdAt || null
      });
    }

    return {
      mode: effectiveMode,
      timeRange: effectiveRange,
      bookmarks: resultBookmarks,
      featuredCollections: featuredCollections,
      pagination: pagination
    };
  }

  // getExploreOverview()
  getExploreOverview() {
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');
    // Simple static shortcuts configuration
    const shortcuts = [
      {
        id: 'trending_this_month',
        label: 'Trending this month',
        description: 'Most saved bookmarks this month',
        shortcutType: 'trending_this_month'
      },
      {
        id: 'most_saved_today',
        label: 'Most saved today',
        description: 'Bookmarks gaining saves today',
        shortcutType: 'most_saved_today'
      }
    ];
    return {
      categories: categories,
      featuredTags: tags.filter(function (t) { return !!t.isFeatured; }),
      shortcuts: shortcuts
    };
  }

  // getBookmarkFilterOptions()
  getBookmarkFilterOptions() {
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');

    const datePostedRanges = [
      { id: 'any', label: 'Any time' },
      { id: 'last_7_days', label: 'Last 7 days' },
      { id: 'last_30_days', label: 'Last 30 days' },
      { id: 'this_month', label: 'This month' },
      { id: 'older_than_30_days', label: 'Older than 30 days' }
    ];

    const dateSavedRanges = [
      { id: 'any', label: 'Any time' },
      { id: 'last_7_days', label: 'Saved in the last 7 days' },
      { id: 'last_30_days', label: 'Saved in the last 30 days' },
      { id: 'older_than_30_days', label: 'Saved more than 30 days ago' }
    ];

    const ratingMinSteps = [0, 1, 2, 3, 4, 4.5];

    const savesPresets = [
      { label: 'Any saves', min: 0, max: Number.MAX_SAFE_INTEGER },
      { label: '5+ saves', min: 5, max: Number.MAX_SAFE_INTEGER },
      { label: '50+ saves', min: 50, max: Number.MAX_SAFE_INTEGER },
      { label: 'Up to 20 saves', min: 0, max: 20 }
    ];

    const commentsPresets = [
      { label: 'Any comments', min: 0 },
      { label: '10 or more comments', min: 10 }
    ];

    const sortOptions = [
      { id: 'relevance', label: 'Relevance' },
      { id: 'most_saved', label: 'Most Saved' },
      { id: 'rating_highest', label: 'Rating - Highest First' },
      { id: 'comments_highest', label: 'Comments - High to Low' },
      { id: 'date_posted_newest', label: 'Date Posted - Newest' },
      { id: 'date_posted_oldest', label: 'Date Posted - Oldest' },
      { id: 'date_saved_newest', label: 'Date Saved - Newest' },
      { id: 'title_az', label: 'Title (A–Z)' }
    ];

    return {
      categories: categories,
      tags: tags,
      datePostedRanges: datePostedRanges,
      dateSavedRanges: dateSavedRanges,
      ratingMinSteps: ratingMinSteps,
      savesPresets: savesPresets,
      commentsPresets: commentsPresets,
      sortOptions: sortOptions
    };
  }

  // searchBookmarks(query, filters, sortBy, page, pageSize)
  searchBookmarks(query, filters, sortBy, page, pageSize) {
    const bookmarks = this._getFromStorage('bookmarks');
    const saved = this._getFromStorage('saved_bookmarks');
    const categoriesMap = this._buildCategoriesMap();
    const tagsMap = this._buildTagsMap();

    const q = (query || '').trim().toLowerCase();

    let filtered = this._applyBookmarkSearchFilters(bookmarks, filters);

    if (q) {
      const textFiltered = [];
      for (let i = 0; i < filtered.length; i++) {
        const b = filtered[i];
        const tagText = Array.isArray(b.tagIds)
          ? b.tagIds.map(function (tid) {
              return tagsMap[tid] && tagsMap[tid].name ? tagsMap[tid].name : '';
            }).join('\n')
          : '';
        const haystack = (
          (b.title || '') + '\n' +
          (b.description || '') + '\n' +
          (b.url || '') + '\n' +
          tagText
        ).toLowerCase();
        if (haystack.indexOf(q) !== -1) {
          textFiltered.push(b);
        }
      }
      filtered = textFiltered;
    }

    const sort = sortBy || 'relevance';

    filtered.sort((a, b) => {
      if (sort === 'most_saved') {
        const sa = typeof a.savesCount === 'number' ? a.savesCount : 0;
        const sb = typeof b.savesCount === 'number' ? b.savesCount : 0;
        return sb - sa;
      }
      if (sort === 'rating_highest') {
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        return rb - ra;
      }
      if (sort === 'comments_highest') {
        const ca = typeof a.commentsCount === 'number' ? a.commentsCount : 0;
        const cb = typeof b.commentsCount === 'number' ? b.commentsCount : 0;
        return cb - ca;
      }
      if (sort === 'date_posted_newest') {
        const ad = this._parseDate(a.createdAt) || new Date(0);
        const bd = this._parseDate(b.createdAt) || new Date(0);
        return bd.getTime() - ad.getTime();
      }
      if (sort === 'date_posted_oldest') {
        const ad2 = this._parseDate(a.createdAt) || new Date(0);
        const bd2 = this._parseDate(b.createdAt) || new Date(0);
        return ad2.getTime() - bd2.getTime();
      }
      // relevance or unknown: simple heuristic by savesCount then createdAt desc
      const sa2 = typeof a.savesCount === 'number' ? a.savesCount : 0;
      const sb2 = typeof b.savesCount === 'number' ? b.savesCount : 0;
      if (sa2 !== sb2) return sb2 - sa2;
      const ad3 = this._parseDate(a.createdAt) || new Date(0);
      const bd3 = this._parseDate(b.createdAt) || new Date(0);
      return bd3.getTime() - ad3.getTime();
    });

    const { items, pagination } = this._paginate(filtered, page, pageSize || 20);

    const results = [];
    for (let i = 0; i < items.length; i++) {
      const b = items[i];
      let savedBookmark = null;
      for (let j = 0; j < saved.length; j++) {
        if (!saved[j].isDeleted && saved[j].bookmarkId === b.id) {
          savedBookmark = saved[j];
          break;
        }
      }
      const category = this._resolveCategory(b.categoryId, categoriesMap);
      const tags = this._resolveTags(b.tagIds, tagsMap);
      const tagNames = [];
      for (let t = 0; t < tags.length; t++) tagNames.push(tags[t].name);

      results.push({
        id: b.id,
        title: b.title,
        url: b.url,
        description: b.description || '',
        categoryId: b.categoryId || null,
        categoryName: category ? category.name : null,
        category: category || null,
        tagIds: Array.isArray(b.tagIds) ? b.tagIds : [],
        tagNames: tagNames,
        tags: tags,
        ratingAverage: typeof b.ratingAverage === 'number' ? b.ratingAverage : 0,
        ratingCount: typeof b.ratingCount === 'number' ? b.ratingCount : 0,
        savesCount: typeof b.savesCount === 'number' ? b.savesCount : 0,
        commentsCount: typeof b.commentsCount === 'number' ? b.commentsCount : 0,
        thumbnailUrl: b.thumbnailUrl || null,
        createdAt: b.createdAt || null,
        isSavedByCurrentAgent: !!savedBookmark,
        savedBookmarkId: savedBookmark ? savedBookmark.id : null,
        personalTagIds: savedBookmark && Array.isArray(savedBookmark.tagIds) ? savedBookmark.tagIds : [],
        visibility: savedBookmark ? savedBookmark.visibility : null,
        savedAt: savedBookmark ? savedBookmark.savedAt : null
      });
    }

    return {
      results: results,
      pagination: pagination
    };
  }

  // getBookmarkDetail(bookmarkId)
  getBookmarkDetail(bookmarkId) {
    const bookmarks = this._getFromStorage('bookmarks');
    const saved = this._getFromStorage('saved_bookmarks');
    const categoriesMap = this._buildCategoriesMap();
    const tagsMap = this._buildTagsMap();

    let bookmark = null;
    for (let i = 0; i < bookmarks.length; i++) {
      if (bookmarks[i].id === bookmarkId) {
        bookmark = bookmarks[i];
        break;
      }
    }
    if (!bookmark) {
      return null;
    }

    let savedBookmark = null;
    for (let j = 0; j < saved.length; j++) {
      if (!saved[j].isDeleted && saved[j].bookmarkId === bookmark.id) {
        savedBookmark = saved[j];
        break;
      }
    }

    const category = this._resolveCategory(bookmark.categoryId, categoriesMap);
    const tags = this._resolveTags(bookmark.tagIds, tagsMap);
    const tagNames = [];
    for (let t = 0; t < tags.length; t++) tagNames.push(tags[t].name);

    return {
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || '',
      categoryId: bookmark.categoryId || null,
      categoryName: category ? category.name : null,
      category: category || null,
      tagIds: Array.isArray(bookmark.tagIds) ? bookmark.tagIds : [],
      tagNames: tagNames,
      tags: tags,
      ratingAverage: typeof bookmark.ratingAverage === 'number' ? bookmark.ratingAverage : 0,
      ratingCount: typeof bookmark.ratingCount === 'number' ? bookmark.ratingCount : 0,
      savesCount: typeof bookmark.savesCount === 'number' ? bookmark.savesCount : 0,
      commentsCount: typeof bookmark.commentsCount === 'number' ? bookmark.commentsCount : 0,
      sourceSiteName: bookmark.sourceSiteName || null,
      thumbnailUrl: bookmark.thumbnailUrl || null,
      createdAt: bookmark.createdAt || null,
      lastUpdatedAt: bookmark.lastUpdatedAt || null,
      isActive: bookmark.isActive !== false,
      isSavedByCurrentAgent: !!savedBookmark,
      savedBookmarkId: savedBookmark ? savedBookmark.id : null,
      personalTitle: savedBookmark ? savedBookmark.personalTitle : null,
      personalNotes: savedBookmark ? savedBookmark.notes : null,
      personalTagIds: savedBookmark && Array.isArray(savedBookmark.tagIds) ? savedBookmark.tagIds : [],
      visibility: savedBookmark ? savedBookmark.visibility : null,
      savedAt: savedBookmark ? savedBookmark.savedAt : null
    };
  }

  // getBookmarkComments(bookmarkId, page, pageSize, sortBy)
  getBookmarkComments(bookmarkId, page, pageSize, sortBy) {
    const comments = this._getFromStorage('comments');
    const bookmarksMap = this._buildBookmarksMap();

    const filtered = [];
    for (let i = 0; i < comments.length; i++) {
      if (comments[i].bookmarkId === bookmarkId && !comments[i].isDeleted) {
        filtered.push(comments[i]);
      }
    }

    const sort = sortBy || 'newest';
    filtered.sort((a, b) => {
      const ad = this._parseDate(a.createdAt) || new Date(0);
      const bd = this._parseDate(b.createdAt) || new Date(0);
      if (sort === 'oldest') {
        return ad.getTime() - bd.getTime();
      }
      if (sort === 'most_liked') {
        const al = typeof a.likeCount === 'number' ? a.likeCount : 0;
        const bl = typeof b.likeCount === 'number' ? b.likeCount : 0;
        return bl - al;
      }
      // newest
      return bd.getTime() - ad.getTime();
    });

    const { items, pagination } = this._paginate(filtered, page, pageSize || 20);

    const resolvedComments = [];
    for (let i = 0; i < items.length; i++) {
      const c = items[i];
      resolvedComments.push({
        id: c.id,
        bookmarkId: c.bookmarkId,
        bookmark: bookmarksMap[c.bookmarkId] || null,
        content: c.content,
        authorDisplayName: c.authorDisplayName || null,
        isByCurrentAgent: !!c.isByCurrentAgent,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt || null,
        likeCount: typeof c.likeCount === 'number' ? c.likeCount : 0,
        isDeleted: !!c.isDeleted
      });
    }

    return {
      comments: resolvedComments,
      pagination: pagination
    };
  }

  // postBookmarkComment(bookmarkId, content)
  postBookmarkComment(bookmarkId, content) {
    if (!bookmarkId || !content) {
      return {
        success: false,
        comment: null,
        message: 'bookmark_id_and_content_required'
      };
    }
    const bookmarksMap = this._buildBookmarksMap();
    if (!bookmarksMap[bookmarkId]) {
      return {
        success: false,
        comment: null,
        message: 'bookmark_not_found'
      };
    }

    let comments = this._getFromStorage('comments');
    const nowIso = this._nowIso();
    const newComment = {
      id: this._generateId('cmt'),
      bookmarkId: bookmarkId,
      content: content,
      authorDisplayName: null,
      isByCurrentAgent: true,
      createdAt: nowIso,
      updatedAt: null,
      likeCount: 0,
      isDeleted: false
    };
    comments.push(newComment);
    this._saveToStorage('comments', comments);

    const commentWithBookmark = {
      id: newComment.id,
      bookmarkId: newComment.bookmarkId,
      bookmark: bookmarksMap[bookmarkId] || null,
      content: newComment.content,
      authorDisplayName: newComment.authorDisplayName,
      isByCurrentAgent: newComment.isByCurrentAgent,
      createdAt: newComment.createdAt,
      updatedAt: newComment.updatedAt,
      likeCount: newComment.likeCount,
      isDeleted: newComment.isDeleted
    };

    return {
      success: true,
      comment: commentWithBookmark,
      message: 'comment_posted'
    };
  }

  // saveBookmarkToCollection(bookmarkId, options)
  saveBookmarkToCollection(bookmarkId, options) {
    if (!bookmarkId) {
      return {
        success: false,
        savedBookmarkId: null,
        collectionId: null,
        collectionTitle: null,
        message: 'bookmark_id_required'
      };
    }

    const bookmarksMap = this._buildBookmarksMap();
    if (!bookmarksMap[bookmarkId]) {
      return {
        success: false,
        savedBookmarkId: null,
        collectionId: null,
        collectionTitle: null,
        message: 'bookmark_not_found'
      };
    }

    const visibility = options && options.saveVisibility === 'private' ? 'private' : 'public';
    const collectionAction = options && options.collectionAction ? options.collectionAction : null;

    const savedBookmark = this._getOrCreateSavedBookmark(bookmarkId, visibility);

    let collection = null;
    if (collectionAction) {
      const collResult = this._getOrCreateCollectionFromAction(collectionAction);
      if (!collResult.success) {
        return {
          success: false,
          savedBookmarkId: savedBookmark.id,
          collectionId: null,
          collectionTitle: null,
          message: collResult.error
        };
      }
      collection = collResult.collection;
    }

    if (collection) {
      let collectionItems = this._getFromStorage('collection_items');
      let exists = false;
      for (let i = 0; i < collectionItems.length; i++) {
        if (collectionItems[i].collectionId === collection.id && collectionItems[i].savedBookmarkId === savedBookmark.id) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        const nowIso = this._nowIso();
        const newItem = {
          id: this._generateId('ci'),
          collectionId: collection.id,
          savedBookmarkId: savedBookmark.id,
          addedAt: nowIso,
          orderIndex: null,
          notes: null
        };
        collectionItems.push(newItem);
        this._saveToStorage('collection_items', collectionItems);
        this._updateCollectionBookmarkCount(collection.id);
      }
    }

    return {
      success: true,
      savedBookmarkId: savedBookmark.id,
      collectionId: collection ? collection.id : null,
      collectionTitle: collection ? collection.title : null,
      message: 'bookmark_saved'
    };
  }

  // getMyBookmarksList(filters, sortBy, page, pageSize)
  getMyBookmarksList(filters, sortBy, page, pageSize) {
    let saved = this._getFromStorage('saved_bookmarks');
    const bookmarksMap = this._buildBookmarksMap();
    const categoriesMap = this._buildCategoriesMap();
    const tagsMap = this._buildTagsMap();

    const f = filters || {};
    const searchQuery = (f.searchQuery || '').trim().toLowerCase();
    const filterTagIds = Array.isArray(f.tagIds) ? f.tagIds : null;
    const filterCategoryId = f.categoryId || null;
    const dateSavedRange = f.dateSavedRange || 'any';
    const minSaves = typeof f.minSaves === 'number' ? f.minSaves : null;
    const maxSaves = typeof f.maxSaves === 'number' ? f.maxSaves : null;
    const visibilityFilter = f.visibility && f.visibility !== 'all' ? f.visibility : null;

    const filtered = [];

    for (let i = 0; i < saved.length; i++) {
      const sb = saved[i];
      if (sb.isDeleted) continue;
      const bookmark = bookmarksMap[sb.bookmarkId];
      if (!bookmark) continue;

      const savedAtDate = this._parseDate(sb.savedAt);
      if (!this._isWithinDateRange(savedAtDate, dateSavedRange)) continue;

      if (visibilityFilter && sb.visibility !== visibilityFilter) continue;

      if (filterCategoryId && bookmark.categoryId !== filterCategoryId) continue;

      if (filterTagIds && filterTagIds.length > 0) {
        const tagsOfSb = Array.isArray(sb.tagIds) ? sb.tagIds : [];
        let hasAny = false;
        for (let t = 0; t < filterTagIds.length; t++) {
          if (tagsOfSb.indexOf(filterTagIds[t]) !== -1) {
            hasAny = true;
            break;
          }
        }
        if (!hasAny) continue;
      }

      const savesCount = typeof bookmark.savesCount === 'number' ? bookmark.savesCount : 0;
      if (minSaves !== null && savesCount < minSaves) continue;
      if (maxSaves !== null && savesCount > maxSaves) continue;

      if (searchQuery) {
        const title = sb.personalTitle || bookmark.title || '';
        const haystack = (
          title + '\n' +
          (bookmark.description || '') + '\n' +
          (bookmark.url || '')
        ).toLowerCase();
        if (haystack.indexOf(searchQuery) === -1) continue;
      }

      filtered.push(sb);
    }

    const sort = sortBy || 'date_saved_newest';
    filtered.sort((a, b) => {
      if (sort === 'date_saved_oldest') {
        const ad = this._parseDate(a.savedAt) || new Date(0);
        const bd = this._parseDate(b.savedAt) || new Date(0);
        return ad.getTime() - bd.getTime();
      }
      if (sort === 'title_az') {
        const ba = bookmarksMap[a.bookmarkId] || {};
        const bb = bookmarksMap[b.bookmarkId] || {};
        const ta = (a.personalTitle || ba.title || '').toLowerCase();
        const tb = (b.personalTitle || bb.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      }
      // date_saved_newest default
      const ad2 = this._parseDate(a.savedAt) || new Date(0);
      const bd2 = this._parseDate(b.savedAt) || new Date(0);
      return bd2.getTime() - ad2.getTime();
    });

    const { items, pagination } = this._paginate(filtered, page, pageSize || 50);

    const results = [];
    for (let i = 0; i < items.length; i++) {
      const sb = items[i];
      const bookmark = bookmarksMap[sb.bookmarkId] || {};
      const category = this._resolveCategory(bookmark.categoryId, categoriesMap);
      const tagObjs = this._resolveTags(Array.isArray(sb.tagIds) ? sb.tagIds : [], tagsMap);
      const tagNames = [];
      for (let t = 0; t < tagObjs.length; t++) tagNames.push(tagObjs[t].name);

      results.push({
        savedBookmarkId: sb.id,
        bookmarkId: sb.bookmarkId,
        bookmark: bookmark || null,
        title: sb.personalTitle || bookmark.title || '',
        url: bookmark.url || null,
        personalTitle: sb.personalTitle || null,
        notes: sb.notes || null,
        categoryId: bookmark.categoryId || null,
        categoryName: category ? category.name : null,
        category: category || null,
        tagIds: Array.isArray(sb.tagIds) ? sb.tagIds : [],
        tagNames: tagNames,
        tags: tagObjs,
        ratingAverage: typeof bookmark.ratingAverage === 'number' ? bookmark.ratingAverage : 0,
        ratingCount: typeof bookmark.ratingCount === 'number' ? bookmark.ratingCount : 0,
        savesCount: typeof bookmark.savesCount === 'number' ? bookmark.savesCount : 0,
        commentsCount: typeof bookmark.commentsCount === 'number' ? bookmark.commentsCount : 0,
        visibility: sb.visibility,
        savedAt: sb.savedAt,
        thumbnailUrl: bookmark.thumbnailUrl || null
      });
    }

    // Instrumentation for task completion tracking
    try {
      if (
        filterTagIds &&
        filterTagIds.indexOf('niche-ml') !== -1 &&
        sort === 'date_saved_newest' &&
        results &&
        results.length > 0
      ) {
        localStorage.setItem(
          'task9_nicheMlFilterView',
          JSON.stringify({ "tagIds": filterTagIds, "sortBy": sort, "timestamp": this._nowIso() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      results: results,
      pagination: pagination
    };
  }

  // bulkAddBookmarksToCollection(savedBookmarkIds, collectionAction)
  bulkAddBookmarksToCollection(savedBookmarkIds, collectionAction) {
    if (!Array.isArray(savedBookmarkIds) || savedBookmarkIds.length === 0) {
      return {
        success: false,
        collectionId: null,
        collectionTitle: null,
        addedCount: 0,
        message: 'no_saved_bookmark_ids'
      };
    }

    const collResult = this._getOrCreateCollectionFromAction(collectionAction || {});
    if (!collResult.success || !collResult.collection) {
      return {
        success: false,
        collectionId: null,
        collectionTitle: null,
        addedCount: 0,
        message: collResult.error || 'collection_action_invalid'
      };
    }
    const collection = collResult.collection;

    let savedBookmarksMap = this._buildSavedBookmarksMap();
    let collectionItems = this._getFromStorage('collection_items');
    const existingSet = {};
    for (let i = 0; i < collectionItems.length; i++) {
      if (collectionItems[i].collectionId === collection.id) {
        existingSet[collectionItems[i].savedBookmarkId] = true;
      }
    }

    const nowIso = this._nowIso();
    let addedCount = 0;
    for (let i = 0; i < savedBookmarkIds.length; i++) {
      const sbId = savedBookmarkIds[i];
      if (!savedBookmarksMap[sbId]) continue;
      if (existingSet[sbId]) continue;
      collectionItems.push({
        id: this._generateId('ci'),
        collectionId: collection.id,
        savedBookmarkId: sbId,
        addedAt: nowIso,
        orderIndex: null,
        notes: null
      });
      addedCount++;
    }

    this._saveToStorage('collection_items', collectionItems);
    if (addedCount > 0) {
      this._updateCollectionBookmarkCount(collection.id);
    }

    return {
      success: true,
      collectionId: collection.id,
      collectionTitle: collection.title,
      addedCount: addedCount,
      message: 'bookmarks_added_to_collection'
    };
  }

  // bulkChangeSavedBookmarkVisibility(savedBookmarkIds, visibility)
  bulkChangeSavedBookmarkVisibility(savedBookmarkIds, visibility) {
    if (!Array.isArray(savedBookmarkIds) || savedBookmarkIds.length === 0) {
      return {
        success: false,
        updatedCount: 0
      };
    }
    if (visibility !== 'public' && visibility !== 'private') {
      return {
        success: false,
        updatedCount: 0
      };
    }
    let saved = this._getFromStorage('saved_bookmarks');
    const nowIso = this._nowIso();
    const idSet = {};
    for (let i = 0; i < savedBookmarkIds.length; i++) {
      idSet[savedBookmarkIds[i]] = true;
    }
    let updatedCount = 0;
    for (let i = 0; i < saved.length; i++) {
      if (idSet[saved[i].id] && !saved[i].isDeleted) {
        saved[i].visibility = visibility;
        saved[i].lastModifiedAt = nowIso;
        updatedCount++;
      }
    }
    if (updatedCount > 0) {
      this._saveToStorage('saved_bookmarks', saved);
    }
    return {
      success: true,
      updatedCount: updatedCount
    };
  }

  // bulkDeleteSavedBookmarks(savedBookmarkIds)
  bulkDeleteSavedBookmarks(savedBookmarkIds) {
    if (!Array.isArray(savedBookmarkIds) || savedBookmarkIds.length === 0) {
      return {
        success: false,
        deletedCount: 0,
        message: 'no_saved_bookmark_ids'
      };
    }
    let saved = this._getFromStorage('saved_bookmarks');
    let collectionItems = this._getFromStorage('collection_items');
    const idSet = {};
    for (let i = 0; i < savedBookmarkIds.length; i++) {
      idSet[savedBookmarkIds[i]] = true;
    }
    let deletedCount = 0;
    const nowIso = this._nowIso();
    for (let i = 0; i < saved.length; i++) {
      if (idSet[saved[i].id] && !saved[i].isDeleted) {
        saved[i].isDeleted = true;
        saved[i].lastModifiedAt = nowIso;
        deletedCount++;
      }
    }

    // Remove collection items referencing these saved bookmarks
    const remainingItems = [];
    for (let i = 0; i < collectionItems.length; i++) {
      if (!idSet[collectionItems[i].savedBookmarkId]) {
        remainingItems.push(collectionItems[i]);
      }
    }

    this._saveToStorage('saved_bookmarks', saved);
    this._saveToStorage('collection_items', remainingItems);

    return {
      success: true,
      deletedCount: deletedCount,
      message: 'saved_bookmarks_deleted'
    };
  }

  // updateSavedBookmarkTags(savedBookmarkId, tagIds)
  updateSavedBookmarkTags(savedBookmarkId, tagIds) {
    if (!savedBookmarkId || !Array.isArray(tagIds)) {
      return {
        success: false,
        savedBookmarkId: null,
        tagIds: []
      };
    }
    let saved = this._getFromStorage('saved_bookmarks');
    let tags = this._getFromStorage('tags');
    const tagsMap = {};
    for (let i = 0; i < tags.length; i++) tagsMap[tags[i].id] = tags[i];

    const nowIso = this._nowIso();
    let target = null;
    for (let i = 0; i < saved.length; i++) {
      if (saved[i].id === savedBookmarkId && !saved[i].isDeleted) {
        target = saved[i];
        break;
      }
    }
    if (!target) {
      return {
        success: false,
        savedBookmarkId: null,
        tagIds: []
      };
    }

    // Ensure Tag objects exist (lightweight creation if missing)
    for (let i = 0; i < tagIds.length; i++) {
      const tid = tagIds[i];
      if (!tagsMap[tid]) {
        const newTag = {
          id: tid,
          name: tid,
          description: null,
          usageCount: 0,
          isFeatured: false,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        tags.push(newTag);
        tagsMap[tid] = newTag;
      }
    }

    target.tagIds = tagIds.slice();
    target.lastModifiedAt = nowIso;
    this._saveToStorage('saved_bookmarks', saved);
    this._saveToStorage('tags', tags);

    return {
      success: true,
      savedBookmarkId: target.id,
      tagIds: target.tagIds.slice()
    };
  }

  // getCollectionsOverview(sortBy)
  getCollectionsOverview(sortBy) {
    let collections = this._getFromStorage('collections');
    const sort = sortBy || 'recently_updated';
    collections.sort((a, b) => {
      if (sort === 'title_az') {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      }
      if (sort === 'bookmark_count_desc') {
        const ca = typeof a.bookmarkCount === 'number' ? a.bookmarkCount : 0;
        const cb = typeof b.bookmarkCount === 'number' ? b.bookmarkCount : 0;
        return cb - ca;
      }
      // recently_updated default
      const ad = this._parseDate(a.updatedAt || a.createdAt) || new Date(0);
      const bd = this._parseDate(b.updatedAt || b.createdAt) || new Date(0);
      return bd.getTime() - ad.getTime();
    });
    return {
      collections: collections
    };
  }

  // createCollection(title, description, visibility)
  createCollection(title, description, visibility) {
    if (!title) {
      return {
        success: false,
        collection: null,
        message: 'title_required'
      };
    }
    const vis = visibility === 'public' ? 'public' : 'private';
    let collections = this._getFromStorage('collections');
    const nowIso = this._nowIso();
    const id = this._generateId('col');
    const slugBase = this._slugify(title);
    const shareSlug = slugBase ? slugBase + '-' + id : id;
    const publicShareUrl = 'https://example.com/collections/' + shareSlug;

    const collection = {
      id: id,
      title: title,
      description: description || null,
      visibility: vis,
      bookmarkCount: 0,
      shareSlug: shareSlug,
      publicShareUrl: publicShareUrl,
      lastShareLinkCopiedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);

    return {
      success: true,
      collection: collection,
      message: 'collection_created'
    };
  }

  // updateCollectionMetadata(collectionId, title, description, visibility)
  updateCollectionMetadata(collectionId, title, description, visibility) {
    let collections = this._getFromStorage('collections');
    let collection = null;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === collectionId) {
        collection = collections[i];
        break;
      }
    }
    if (!collection) {
      return {
        success: false,
        collection: null
      };
    }
    const nowIso = this._nowIso();
    if (typeof title === 'string' && title.length > 0) {
      collection.title = title;
    }
    if (typeof description === 'string') {
      collection.description = description;
    }
    if (visibility === 'public' || visibility === 'private') {
      collection.visibility = visibility;
    }
    collection.updatedAt = nowIso;
    this._saveToStorage('collections', collections);
    return {
      success: true,
      collection: collection
    };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    let collections = this._getFromStorage('collections');
    let collectionItems = this._getFromStorage('collection_items');

    let found = false;
    const remainingCollections = [];
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === collectionId) {
        found = true;
      } else {
        remainingCollections.push(collections[i]);
      }
    }

    if (!found) {
      return {
        success: false,
        message: 'collection_not_found'
      };
    }

    const remainingItems = [];
    for (let i = 0; i < collectionItems.length; i++) {
      if (collectionItems[i].collectionId !== collectionId) {
        remainingItems.push(collectionItems[i]);
      }
    }

    this._saveToStorage('collections', remainingCollections);
    this._saveToStorage('collection_items', remainingItems);

    return {
      success: true,
      message: 'collection_deleted'
    };
  }

  // getCollectionDetail(collectionId, filters, sortBy, page, pageSize)
  getCollectionDetail(collectionId, filters, sortBy, page, pageSize) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const bookmarksMap = this._buildBookmarksMap();
    const categoriesMap = this._buildCategoriesMap();
    const tagsMap = this._buildTagsMap();

    let collection = null;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === collectionId) {
        collection = collections[i];
        break;
      }
    }
    if (!collection) {
      return {
        collection: null,
        items: [],
        pagination: {
          page: 1,
          pageSize: pageSize || 50,
          totalItems: 0,
          totalPages: 1
        }
      };
    }

    const f = filters || {};
    const filterTagIds = Array.isArray(f.tagIds) ? f.tagIds : null;
    const visibilityFilter = f.visibility && f.visibility !== 'all' ? f.visibility : null;

    // Ensure SavedBookmark entries exist for any collection items that reference
    // savedBookmarkIds not present in saved_bookmarks (e.g. pre-populated demo data).
    let saved = this._getFromStorage('saved_bookmarks');
    const savedMap = {};
    for (let i = 0; i < saved.length; i++) {
      savedMap[saved[i].id] = saved[i];
    }
    let savedModified = false;
    for (let i = 0; i < collectionItems.length; i++) {
      if (collectionItems[i].collectionId === collectionId && !savedMap[collectionItems[i].savedBookmarkId]) {
        const nowIso = this._nowIso();
        const newSaved = {
          id: collectionItems[i].savedBookmarkId,
          bookmarkId: null,
          personalTitle: null,
          notes: collectionItems[i].notes || null,
          tagIds: [],
          visibility: 'public',
          savedAt: collectionItems[i].addedAt || nowIso,
          lastModifiedAt: collectionItems[i].addedAt || nowIso,
          isDeleted: false
        };
        saved.push(newSaved);
        savedMap[newSaved.id] = newSaved;
        savedModified = true;
      }
    }
    if (savedModified) {
      this._saveToStorage('saved_bookmarks', saved);
    }

    const rawItems = [];
    for (let i = 0; i < collectionItems.length; i++) {
      if (collectionItems[i].collectionId === collectionId) {
        const sb = savedMap[collectionItems[i].savedBookmarkId];
        if (!sb || sb.isDeleted) continue;
        const bookmark = bookmarksMap[sb.bookmarkId] || null;
        rawItems.push({ ci: collectionItems[i], sb: sb, bookmark: bookmark });
      }
    }

    const filtered = [];
    for (let i = 0; i < rawItems.length; i++) {
      const row = rawItems[i];
      const sb = row.sb;
      if (visibilityFilter && sb.visibility !== visibilityFilter) continue;
      if (filterTagIds && filterTagIds.length > 0) {
        const sbTags = Array.isArray(sb.tagIds) ? sb.tagIds : [];
        let hasAny = false;
        for (let t = 0; t < filterTagIds.length; t++) {
          if (sbTags.indexOf(filterTagIds[t]) !== -1) {
            hasAny = true;
            break;
          }
        }
        if (!hasAny) continue;
      }
      filtered.push(row);
    }

    const sort = sortBy || 'date_saved_newest';
    filtered.sort((a, b) => {
      const sbA = a.sb;
      const sbB = b.sb;
      if (sort === 'title_az') {
        const ta = (sbA.personalTitle || a.bookmark.title || '').toLowerCase();
        const tb = (sbB.personalTitle || b.bookmark.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      }
      // date_saved_newest default
      const ad = this._parseDate(sbA.savedAt) || new Date(0);
      const bd = this._parseDate(sbB.savedAt) || new Date(0);
      return bd.getTime() - ad.getTime();
    });

    const mappedSaved = [];
    for (let i = 0; i < filtered.length; i++) {
      mappedSaved.push(filtered[i].sb);
    }

    const { items: pageItems, pagination } = this._paginate(mappedSaved, page, pageSize || 50);

    const resultItems = [];
    for (let i = 0; i < pageItems.length; i++) {
      const sb = pageItems[i];
      const bookmark = bookmarksMap[sb.bookmarkId] || {};
      const category = this._resolveCategory(bookmark.categoryId, categoriesMap);
      const tagObjs = this._resolveTags(Array.isArray(sb.tagIds) ? sb.tagIds : [], tagsMap);
      const tagNames = [];
      for (let t = 0; t < tagObjs.length; t++) tagNames.push(tagObjs[t].name);

      resultItems.push({
        savedBookmarkId: sb.id,
        bookmarkId: sb.bookmarkId,
        bookmark: bookmark || null,
        title: sb.personalTitle || bookmark.title || '',
        url: bookmark.url || null,
        categoryId: bookmark.categoryId || null,
        categoryName: category ? category.name : null,
        category: category || null,
        tagIds: Array.isArray(sb.tagIds) ? sb.tagIds : [],
        tagNames: tagNames,
        tags: tagObjs,
        ratingAverage: typeof bookmark.ratingAverage === 'number' ? bookmark.ratingAverage : 0,
        ratingCount: typeof bookmark.ratingCount === 'number' ? bookmark.ratingCount : 0,
        savesCount: typeof bookmark.savesCount === 'number' ? bookmark.savesCount : 0,
        commentsCount: typeof bookmark.commentsCount === 'number' ? bookmark.commentsCount : 0,
        visibility: sb.visibility,
        savedAt: sb.savedAt,
        thumbnailUrl: bookmark.thumbnailUrl || null
      });
    }

    return {
      collection: collection,
      items: resultItems,
      pagination: pagination
    };
  }

  // moveOrCopyCollectionItems(sourceCollectionId, savedBookmarkIds, operation, targetCollectionAction)
  moveOrCopyCollectionItems(sourceCollectionId, savedBookmarkIds, operation, targetCollectionAction) {
    if (!sourceCollectionId || !Array.isArray(savedBookmarkIds) || savedBookmarkIds.length === 0) {
      return {
        success: false,
        sourceCollectionId: sourceCollectionId || null,
        targetCollectionId: null,
        movedCount: 0,
        copiedCount: 0,
        message: 'invalid_arguments'
      };
    }
    const op = operation === 'move' || operation === 'copy' ? operation : 'copy';
    const collResult = this._getOrCreateCollectionFromAction(targetCollectionAction || {});
    if (!collResult.success || !collResult.collection) {
      return {
        success: false,
        sourceCollectionId: sourceCollectionId,
        targetCollectionId: null,
        movedCount: 0,
        copiedCount: 0,
        message: collResult.error || 'invalid_collection_action'
      };
    }
    const targetCollection = collResult.collection;

    let collectionItems = this._getFromStorage('collection_items');
    const nowIso = this._nowIso();

    const savedSet = {};
    for (let i = 0; i < savedBookmarkIds.length; i++) {
      savedSet[savedBookmarkIds[i]] = true;
    }

    const existingInTarget = {};
    for (let i = 0; i < collectionItems.length; i++) {
      if (collectionItems[i].collectionId === targetCollection.id) {
        existingInTarget[collectionItems[i].savedBookmarkId] = true;
      }
    }

    let movedCount = 0;
    let copiedCount = 0;

    if (op === 'copy') {
      for (let i = 0; i < savedBookmarkIds.length; i++) {
        const sbId = savedBookmarkIds[i];
        if (existingInTarget[sbId]) continue;
        collectionItems.push({
          id: this._generateId('ci'),
          collectionId: targetCollection.id,
          savedBookmarkId: sbId,
          addedAt: nowIso,
          orderIndex: null,
          notes: null
        });
        copiedCount++;
      }
    } else {
      // move
      const remaining = [];
      for (let i = 0; i < collectionItems.length; i++) {
        const ci = collectionItems[i];
        if (ci.collectionId === sourceCollectionId && savedSet[ci.savedBookmarkId]) {
          // remove from source and add to target if not already there
          if (!existingInTarget[ci.savedBookmarkId]) {
            collectionItems.push({
              id: this._generateId('ci'),
              collectionId: targetCollection.id,
              savedBookmarkId: ci.savedBookmarkId,
              addedAt: nowIso,
              orderIndex: null,
              notes: null
            });
            existingInTarget[ci.savedBookmarkId] = true;
            movedCount++;
          }
        } else {
          remaining.push(ci);
        }
      }
      collectionItems = remaining;
    }

    this._saveToStorage('collection_items', collectionItems);
    this._updateCollectionBookmarkCount(sourceCollectionId);
    this._updateCollectionBookmarkCount(targetCollection.id);

    return {
      success: true,
      sourceCollectionId: sourceCollectionId,
      targetCollectionId: targetCollection.id,
      movedCount: movedCount,
      copiedCount: copiedCount,
      message: op === 'move' ? 'items_moved' : 'items_copied'
    };
  }

  // copyCollectionPublicLink(collectionId)
  copyCollectionPublicLink(collectionId) {
    let collections = this._getFromStorage('collections');
    let collection = null;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === collectionId) {
        collection = collections[i];
        break;
      }
    }
    if (!collection) {
      return {
        success: false,
        publicShareUrl: null,
        message: 'collection_not_found'
      };
    }
    if (collection.visibility !== 'public') {
      return {
        success: false,
        publicShareUrl: null,
        message: 'collection_not_public'
      };
    }
    if (!collection.publicShareUrl) {
      const slugBase = this._slugify(collection.title || collection.id);
      const shareSlug = slugBase ? slugBase + '-' + collection.id : collection.id;
      collection.shareSlug = shareSlug;
      collection.publicShareUrl = 'https://example.com/collections/' + shareSlug;
      collection.updatedAt = this._nowIso();
      this._saveToStorage('collections', collections);
    }
    this._recordCollectionShareCopy(collection.id);
    return {
      success: true,
      publicShareUrl: collection.publicShareUrl,
      message: 'public_link_copied'
    };
  }

  // getCommunityFilterOptions()
  getCommunityFilterOptions() {
    const tags = this._getFromStorage('tags');
    const bookmarkCountThresholds = [
      { value: 10, label: '10+ bookmarks' },
      { value: 50, label: '50+ bookmarks' },
      { value: 100, label: '100+ bookmarks' }
    ];
    const activityRanges = [
      { days: 1, label: 'Active today' },
      { days: 7, label: 'Active within 7 days' },
      { days: 30, label: 'Active within 30 days' }
    ];
    const sortOptions = [
      { id: 'most_bookmarks_saved', label: 'Most Bookmarks Saved' },
      { id: 'most_followers', label: 'Most Followers' },
      { id: 'recently_active', label: 'Recently Active' }
    ];
    return {
      topicTags: tags,
      bookmarkCountThresholds: bookmarkCountThresholds,
      activityRanges: activityRanges,
      sortOptions: sortOptions
    };
  }

  // searchCurators(query, filters, sortBy, page, pageSize)
  searchCurators(query, filters, sortBy, page, pageSize) {
    const curators = this._getFromStorage('curators');
    const follows = this._getFromStorage('follows');
    const tagsMap = this._buildTagsMap();

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const topicTagIds = Array.isArray(f.topicTagIds) ? f.topicTagIds : null;
    const minBookmarkCount = typeof f.minBookmarkCount === 'number' ? f.minBookmarkCount : null;
    const lastActiveWithinDays = typeof f.lastActiveWithinDays === 'number' ? f.lastActiveWithinDays : null;

    const followSet = {};
    for (let i = 0; i < follows.length; i++) {
      followSet[follows[i].curatorId] = true;
    }

    const filtered = [];
    const now = new Date();

    for (let i = 0; i < curators.length; i++) {
      const c = curators[i];

      if (q) {
        const haystack = (
          (c.displayName || '') + '\n' +
          (c.bio || '')
        ).toLowerCase();
        if (haystack.indexOf(q) === -1) continue;
      }

      if (topicTagIds && topicTagIds.length > 0) {
        const topics = Array.isArray(c.topicInterestTagIds) ? c.topicInterestTagIds : [];
        let hasAny = false;
        for (let t = 0; t < topicTagIds.length; t++) {
          if (topics.indexOf(topicTagIds[t]) !== -1) {
            hasAny = true;
            break;
          }
        }
        if (!hasAny) continue;
      }

      if (minBookmarkCount !== null) {
        const bc = typeof c.bookmarkCount === 'number' ? c.bookmarkCount : 0;
        if (bc < minBookmarkCount) continue;
      }

      if (lastActiveWithinDays !== null) {
        const lastActiveAt = this._parseDate(c.lastActiveAt);
        if (!lastActiveAt) continue;
        const diffMs = now.getTime() - lastActiveAt.getTime();
        const diffDays = diffMs / (24 * 60 * 60 * 1000);
        if (diffDays > lastActiveWithinDays) continue;
      }

      filtered.push(c);
    }

    const sort = sortBy || 'most_bookmarks_saved';
    filtered.sort((a, b) => {
      if (sort === 'most_followers') {
        const af = typeof a.followerCount === 'number' ? a.followerCount : 0;
        const bf = typeof b.followerCount === 'number' ? b.followerCount : 0;
        return bf - af;
      }
      if (sort === 'recently_active') {
        const ad = this._parseDate(a.lastActiveAt) || new Date(0);
        const bd = this._parseDate(b.lastActiveAt) || new Date(0);
        return bd.getTime() - ad.getTime();
      }
      // most_bookmarks_saved default
      const ab = typeof a.bookmarkCount === 'number' ? a.bookmarkCount : 0;
      const bb = typeof b.bookmarkCount === 'number' ? b.bookmarkCount : 0;
      return bb - ab;
    });

    const { items, pagination } = this._paginate(filtered, page, pageSize || 20);

    const results = [];
    for (let i = 0; i < items.length; i++) {
      const c = items[i];
      const topicTags = this._resolveTags(Array.isArray(c.topicInterestTagIds) ? c.topicInterestTagIds : [], tagsMap);
      results.push({
        id: c.id,
        displayName: c.displayName,
        bio: c.bio || '',
        avatarUrl: c.avatarUrl || null,
        topicInterestTagIds: Array.isArray(c.topicInterestTagIds) ? c.topicInterestTagIds : [],
        topicInterestTags: topicTags,
        bookmarkCount: typeof c.bookmarkCount === 'number' ? c.bookmarkCount : 0,
        lastActiveAt: c.lastActiveAt || null,
        followerCount: typeof c.followerCount === 'number' ? c.followerCount : 0,
        isFollowedByCurrentAgent: !!followSet[c.id]
      });
    }

    return {
      results: results,
      pagination: pagination
    };
  }

  // followCurator(curatorId, notificationsEnabled)
  followCurator(curatorId, notificationsEnabled) {
    if (!curatorId) {
      return {
        success: false,
        follow: null,
        message: 'curator_id_required'
      };
    }
    const curatorsMap = (function (curators) {
      const map = {};
      for (let i = 0; i < curators.length; i++) map[curators[i].id] = curators[i];
      return map;
    })(this._getFromStorage('curators'));

    if (!curatorsMap[curatorId]) {
      return {
        success: false,
        follow: null,
        message: 'curator_not_found'
      };
    }

    let follows = this._getFromStorage('follows');
    const notif = typeof notificationsEnabled === 'boolean' ? notificationsEnabled : true;

    let existing = null;
    for (let i = 0; i < follows.length; i++) {
      if (follows[i].curatorId === curatorId) {
        existing = follows[i];
        break;
      }
    }

    const nowIso = this._nowIso();
    if (existing) {
      existing.notificationsEnabled = notif;
      this._saveToStorage('follows', follows);
      return {
        success: true,
        follow: {
          id: existing.id,
          curatorId: existing.curatorId,
          curator: curatorsMap[curatorId] || null,
          followedAt: existing.followedAt,
          notificationsEnabled: existing.notificationsEnabled
        },
        message: 'follow_updated'
      };
    }

    const newFollow = {
      id: this._generateId('fol'),
      curatorId: curatorId,
      followedAt: nowIso,
      notificationsEnabled: notif
    };
    follows.push(newFollow);
    this._saveToStorage('follows', follows);

    return {
      success: true,
      follow: {
        id: newFollow.id,
        curatorId: curatorId,
        curator: curatorsMap[curatorId] || null,
        followedAt: newFollow.followedAt,
        notificationsEnabled: newFollow.notificationsEnabled
      },
      message: 'curator_followed'
    };
  }

  // getAboutContent()
  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    return raw ? JSON.parse(raw) : { title: '', contentSections: [] };
  }

  // getHelpContent(topicSlug)
  getHelpContent(topicSlug) {
    const raw = localStorage.getItem('help_content');
    if (!raw) {
      return {
        topics: [],
        selectedTopic: null
      };
    }
    const data = JSON.parse(raw);
    const topics = Array.isArray(data.topics) ? data.topics : [];
    const bodies = data.bodies || {};
    let selectedTopic = null;
    if (topicSlug && bodies[topicSlug]) {
      selectedTopic = bodies[topicSlug];
    }
    return {
      topics: topics,
      selectedTopic: selectedTopic
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    return raw ? JSON.parse(raw) : { title: '', sections: [] };
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    const raw = localStorage.getItem('terms_of_use_content');
    return raw ? JSON.parse(raw) : { title: '', sections: [] };
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