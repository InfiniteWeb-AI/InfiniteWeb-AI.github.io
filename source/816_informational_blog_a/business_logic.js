// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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
  }

  _initStorage() {
    const keys = [
      'categories',
      'tags',
      'articles',
      'article_notes',
      'comments',
      'reading_lists',
      'reading_list_items',
      'collections',
      'collection_items',
      'saved_link_folders',
      'saved_links',
      'glossary_terms',
      'my_glossary_terms',
      'tools',
      'newsletter_subscriptions',
      'watch_later_items'
    ];
    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
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
    const currentRaw = localStorage.getItem('idCounter');
    const current = currentRaw ? parseInt(currentRaw, 10) : 1000;
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  // Helpers

  _normalizeSearchFilters(filters) {
    if (!filters) return {};
    const normalized = {};
    if (filters.difficulty) normalized.difficulty = String(filters.difficulty);
    if (filters.gameType) normalized.gameType = String(filters.gameType);
    if (filters.contentType) normalized.contentType = String(filters.contentType);
    if (filters.location) normalized.location = String(filters.location);

    if (filters.minReadingTimeMinutes != null) {
      const v = Number(filters.minReadingTimeMinutes);
      if (!isNaN(v)) normalized.minReadingTimeMinutes = v;
    }
    if (filters.maxReadingTimeMinutes != null) {
      const v = Number(filters.maxReadingTimeMinutes);
      if (!isNaN(v)) normalized.maxReadingTimeMinutes = v;
    }
    if (filters.dateFrom) normalized.dateFrom = String(filters.dateFrom);
    if (filters.dateTo) normalized.dateTo = String(filters.dateTo);
    if (Array.isArray(filters.tagIds)) normalized.tagIds = filters.tagIds.slice();
    return normalized;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _sortArticlesArray(articles, sortBy) {
    const arr = articles.slice();
    if (!sortBy || sortBy === 'newest') {
      arr.sort((a, b) => {
        const da = this._parseDate(a.datePublished) || new Date(0);
        const db = this._parseDate(b.datePublished) || new Date(0);
        return db - da;
      });
    } else if (sortBy === 'oldest') {
      arr.sort((a, b) => {
        const da = this._parseDate(a.datePublished) || new Date(0);
        const db = this._parseDate(b.datePublished) || new Date(0);
        return da - db;
      });
    } else if (sortBy === 'most_popular' || sortBy === 'most_read') {
      arr.sort((a, b) => {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        return pb - pa;
      });
    }
    return arr;
  }

  _joinArticleDisplayFields(articles) {
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');
    return articles.map(a => {
      const category = categories.find(c => c.id === a.categoryId) || null;
      const tagSummaries = Array.isArray(a.tagIds)
        ? a.tagIds
            .map(tid => {
              const t = tags.find(tt => tt.id === tid);
              return t ? { id: t.id, name: t.name, slug: t.slug } : null;
            })
            .filter(Boolean)
        : [];
      return {
        ...a,
        categoryName: category ? category.name : null,
        category,
        tagSummaries
      };
    });
  }

  _findArticleById(articleId) {
    const articles = this._getFromStorage('articles');
    return articles.find(a => a.id === articleId) || null;
  }

  _findCategoryById(categoryId) {
    const categories = this._getFromStorage('categories');
    return categories.find(c => c.id === categoryId) || null;
  }

  _findTagById(tagId) {
    const tags = this._getFromStorage('tags');
    return tags.find(t => t.id === tagId) || null;
  }

  _getOrCreateDefaultReadingList() {
    const readingLists = this._getFromStorage('reading_lists');
    let list = readingLists.find(rl => rl.isDefault);
    if (!list) {
      list = {
        id: this._generateId('rl'),
        name: 'My Reading List',
        description: null,
        isDefault: true,
        totalReadingTimeMinutes: 0,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      readingLists.push(list);
      this._saveToStorage('reading_lists', readingLists);
    }
    return list;
  }

  _recalculateReadingListTotals(readingListId) {
    const readingLists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const list = readingLists.find(rl => rl.id === readingListId);
    if (!list) return null;

    const listItems = items.filter(it => it.readingListId === readingListId);
    let totalMinutes = 0;
    for (const it of listItems) {
      const art = articles.find(a => a.id === it.articleId);
      if (art && typeof art.readingTimeMinutes === 'number') {
        totalMinutes += art.readingTimeMinutes;
      }
    }
    list.totalReadingTimeMinutes = totalMinutes;
    list.updatedAt = this._now();

    this._saveToStorage('reading_lists', readingLists);

    return {
      ...list,
      articleCount: listItems.length
    };
  }

  _getOrCreateCollectionByName(name) {
    const collections = this._getFromStorage('collections');
    let col = collections.find(c => c.name.toLowerCase() === String(name).toLowerCase());
    if (!col) {
      col = {
        id: this._generateId('col'),
        name: String(name),
        description: null,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      collections.push(col);
      this._saveToStorage('collections', collections);
    }
    return col;
  }

  _calculateChipBreakdownLogic(numberOfPlayers, buyInPerPlayer, denominations) {
    const numPlayers = Number(numberOfPlayers);
    const buyIn = Number(buyInPerPlayer);
    if (!Array.isArray(denominations) || denominations.length === 0 || numPlayers <= 0 || buyIn <= 0) {
      return {
        perPlayer: [],
        totalBank: 0,
        totalChips: 0,
        recommendedSetSize: 0
      };
    }
    const denoms = denominations
      .map(d => Number(d))
      .filter(d => !isNaN(d) && d > 0)
      .sort((a, b) => a - b);
    if (denoms.length === 0) {
      return {
        perPlayer: [],
        totalBank: 0,
        totalChips: 0,
        recommendedSetSize: 0
      };
    }

    // Target chips per player: 50 for small games, scaled slightly by buy-in
    const targetChipsPerPlayer = Math.max(40, Math.min(100, Math.round(buyIn * 2)));
    const n = denoms.length;
    let weights;
    if (n === 1) weights = [1];
    else if (n === 2) weights = [3, 1];
    else if (n === 3) weights = [4, 3, 2];
    else weights = [5, 4, 3, 2].slice(0, n);
    const weightSum = weights.reduce((sum, w) => sum + w, 0);

    // First pass: distribute chips by weight
    let perPlayer = denoms.map((denom, idx) => {
      const share = targetChipsPerPlayer * (weights[idx] / weightSum);
      return {
        denomination: denom,
        count: Math.max(1, Math.round(share))
      };
    });

    // Adjust counts to better match buy-in value
    const totalValuePerPlayer = () =>
      perPlayer.reduce((sum, row) => sum + row.denomination * row.count, 0);

    let value = totalValuePerPlayer();
    if (value === 0) {
      perPlayer = denoms.map(denom => ({ denomination: denom, count: 1 }));
      value = totalValuePerPlayer();
    }

    // Scale counts up or down to approximate the target buy-in
    const maxIterations = 20;
    let iterations = 0;
    while (iterations < maxIterations && Math.abs(value - buyIn) / buyIn > 0.15) {
      const factor = buyIn / value;
      perPlayer = perPlayer.map(row => {
        const newCount = Math.max(1, Math.round(row.count * factor));
        return { ...row, count: newCount };
      });
      value = totalValuePerPlayer();
      iterations += 1;
      if (value === 0) break;
    }

    const totalChipsPerPlayer = perPlayer.reduce((sum, row) => sum + row.count, 0);
    const totalBank = buyIn * numPlayers;
    const totalChips = totalChipsPerPlayer * numPlayers;
    const recommendedSetSize = Math.round(totalChips * 1.2);

    const breakdown = {
      perPlayer: perPlayer.map(row => ({
        denomination: row.denomination,
        denominationLabel: '$' + row.denomination.toString(),
        count: row.count
      })),
      totalBank,
      totalChips,
      recommendedSetSize
    };

    const lines = [];
    lines.push('Home game chip breakdown');
    lines.push('Players: ' + numPlayers);
    lines.push('Buy-in per player: $' + buyIn.toFixed(2));
    lines.push('Total bank: $' + totalBank.toFixed(2));
    lines.push('Per player chips:');
    for (const row of breakdown.perPlayer) {
      lines.push('  ' + row.denominationLabel + ' x ' + row.count);
    }
    lines.push('Total chips in play: ' + totalChips);
    lines.push('Recommended set size (including extras): ' + recommendedSetSize);

    return {
      breakdown,
      breakdownText: lines.join('\n')
    };
  }

  // ------------- Interface implementations -------------

  // getNavigationCategories
  getNavigationCategories() {
    const categories = this._getFromStorage('categories');
    const sorted = categories.slice().sort((a, b) => {
      const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
      const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
      return sa - sb;
    });
    return sorted;
  }

  // getHomepageContent
  getHomepageContent() {
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');
    const articlesRaw = this._getFromStorage('articles');
    const articles = this._joinArticleDisplayFields(articlesRaw);

    // heroCategories: simple list of categories
    const heroCategories = categories.map(c => ({
      categoryId: c.id,
      categoryKey: c.key,
      categoryName: c.name,
      description: c.description || null,
      category: c
    }));

    // recentArticlesByCategory
    const recentArticlesByCategory = categories.map(c => {
      const catArticles = articles
        .filter(a => a.categoryId === c.id)
        .sort((a, b) => {
          const da = this._parseDate(a.datePublished) || new Date(0);
          const db = this._parseDate(b.datePublished) || new Date(0);
          return db - da;
        })
        .slice(0, 10)
        .map(a => ({
          articleId: a.id,
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt || '',
          categoryName: a.categoryName,
          readingTimeMinutes: a.readingTimeMinutes,
          difficulty: a.difficulty || null,
          contentType: a.contentType,
          datePublished: a.datePublished,
          isFeatured: !!a.isFeatured,
          article: a
        }));
      return {
        categoryId: c.id,
        categoryName: c.name,
        articles: catArticles
      };
    });

    // popularArticles across all
    const popularArticles = articles
      .slice()
      .sort((a, b) => {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        return pb - pa;
      })
      .slice(0, 20)
      .map(a => ({
        articleId: a.id,
        title: a.title,
        slug: a.slug,
        categoryName: a.categoryName,
        readingTimeMinutes: a.readingTimeMinutes,
        difficulty: a.difficulty || null,
        contentType: a.contentType,
        datePublished: a.datePublished,
        popularityScore: typeof a.popularityScore === 'number' ? a.popularityScore : 0,
        article: a
      }));

    const tagCloud = tags.map(t => ({
      tagId: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description || null,
      tag: t
    }));

    return {
      heroCategories,
      recentArticlesByCategory,
      popularArticles,
      tagCloud
    };
  }

  // getSearchFilterOptions
  getSearchFilterOptions() {
    return {
      difficultyOptions: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }
      ],
      readingTimeRanges: [
        { min: 0, max: 5, label: 'Under 5 minutes' },
        { min: 5, max: 10, label: '5-10 minutes' },
        { min: 10, max: 20, label: '10-20 minutes' },
        { min: 20, max: 999, label: '20+ minutes' }
      ],
      gameTypeOptions: [
        { value: 'tournament', label: 'Tournament' },
        { value: 'cash', label: 'Cash' },
        { value: 'mixed', label: 'Mixed' },
        { value: 'general', label: 'General' }
      ],
      contentTypeOptions: [
        { value: 'article', label: 'Article' },
        { value: 'video', label: 'Video' }
      ],
      locationOptions: [
        { value: 'casino', label: 'Casino' },
        { value: 'home_game', label: 'Home game' },
        { value: 'online', label: 'Online' },
        { value: 'not_applicable', label: 'Not applicable' }
      ],
      sortOptions: [
        { value: 'newest', label: 'Newest' },
        { value: 'oldest', label: 'Oldest' },
        { value: 'most_popular', label: 'Most popular' },
        { value: 'most_read', label: 'Most read' }
      ]
    };
  }

  // searchArticles(query, filters, sortBy, page, pageSize)
  searchArticles(query, filters, sortBy, page, pageSize) {
    const q = (query || '').toLowerCase().trim();
    const allArticlesRaw = this._getFromStorage('articles');
    const allArticles = this._joinArticleDisplayFields(allArticlesRaw);
    const f = this._normalizeSearchFilters(filters || {});

    let results = allArticles.filter(a => {
      if (q) {
        const text = (a.title || '') + ' ' + (a.excerpt || '') + ' ' + (a.content || '');
        if (!text.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (f.difficulty && a.difficulty !== f.difficulty) return false;
      if (f.gameType && a.gameType !== f.gameType) return false;
      if (f.contentType && a.contentType !== f.contentType) return false;
      if (f.location && a.location !== f.location) return false;

      if (typeof f.minReadingTimeMinutes === 'number') {
        if (typeof a.readingTimeMinutes === 'number' && a.readingTimeMinutes < f.minReadingTimeMinutes) {
          return false;
        }
      }
      if (typeof f.maxReadingTimeMinutes === 'number') {
        if (typeof a.readingTimeMinutes === 'number' && a.readingTimeMinutes > f.maxReadingTimeMinutes) {
          return false;
        }
      }

      if (f.dateFrom) {
        const df = this._parseDate(f.dateFrom);
        const ap = this._parseDate(a.datePublished);
        if (df && ap && ap < df) return false;
      }
      if (f.dateTo) {
        const dt = this._parseDate(f.dateTo);
        const ap = this._parseDate(a.datePublished);
        if (dt && ap && ap > dt) return false;
      }

      return true;
    });

    results = this._sortArticlesArray(results, sortBy);

    const totalResults = results.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    const mapped = paged.map(a => ({
      articleId: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt || '',
      categoryName: a.categoryName,
      readingTimeMinutes: a.readingTimeMinutes,
      difficulty: a.difficulty || null,
      gameType: a.gameType || null,
      location: a.location || null,
      contentType: a.contentType,
      datePublished: a.datePublished,
      popularityScore: typeof a.popularityScore === 'number' ? a.popularityScore : 0,
      article: a
    }));

    return {
      results: mapped,
      totalResults,
      page: pg,
      pageSize: ps
    };
  }

  // getCategoryFilterOptions(categoryId)
  getCategoryFilterOptions(categoryId) {
    const category = this._findCategoryById(categoryId);
    const articles = this._getFromStorage('articles');
    const tags = this._getFromStorage('tags');

    const categoryArticles = category ? articles.filter(a => a.categoryId === category.id) : [];

    const tagIdSet = new Set();
    for (const a of categoryArticles) {
      if (Array.isArray(a.tagIds)) {
        for (const tid of a.tagIds) tagIdSet.add(tid);
      }
    }
    const tagOptions = Array.from(tagIdSet).map(tid => {
      const t = tags.find(tt => tt.id === tid);
      return t
        ? {
            tagId: t.id,
            name: t.name,
            slug: t.slug,
            tag: t
          }
        : null;
    }).filter(Boolean);

    return {
      difficultyOptions: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }
      ],
      readingTimeRanges: [
        { min: 0, max: 5, label: 'Under 5 minutes' },
        { min: 5, max: 10, label: '5-10 minutes' },
        { min: 10, max: 20, label: '10-20 minutes' },
        { min: 20, max: 999, label: '20+ minutes' }
      ],
      gameTypeOptions: [
        { value: 'tournament', label: 'Tournament' },
        { value: 'cash', label: 'Cash' },
        { value: 'mixed', label: 'Mixed' },
        { value: 'general', label: 'General' }
      ],
      locationOptions: [
        { value: 'casino', label: 'Casino' },
        { value: 'home_game', label: 'Home game' },
        { value: 'online', label: 'Online' },
        { value: 'not_applicable', label: 'Not applicable' }
      ],
      tagOptions,
      sortOptions: [
        { value: 'newest', label: 'Newest' },
        { value: 'oldest', label: 'Oldest' },
        { value: 'most_popular', label: 'Most popular' },
        { value: 'most_read', label: 'Most read' }
      ]
    };
  }

  // getCategoryListing(categoryId, searchTerm, filters, sortBy, page, pageSize)
  getCategoryListing(categoryId, searchTerm, filters, sortBy, page, pageSize) {
    const category = this._findCategoryById(categoryId);
    const allArticlesRaw = this._getFromStorage('articles');
    const allArticles = this._joinArticleDisplayFields(allArticlesRaw);
    const f = this._normalizeSearchFilters(filters || {});
    const q = (searchTerm || '').toLowerCase().trim();

    let results = allArticles.filter(a => {
      if (!category || a.categoryId !== category.id) return false;

      if (q) {
        const text = (a.title || '') + ' ' + (a.excerpt || '') + ' ' + (a.content || '');
        if (!text.toLowerCase().includes(q)) return false;
      }

      if (f.difficulty && a.difficulty !== f.difficulty) return false;
      if (f.gameType && a.gameType !== f.gameType) return false;
      if (f.location && a.location !== f.location) return false;

      if (typeof f.minReadingTimeMinutes === 'number') {
        if (typeof a.readingTimeMinutes === 'number' && a.readingTimeMinutes < f.minReadingTimeMinutes) {
          return false;
        }
      }
      if (typeof f.maxReadingTimeMinutes === 'number') {
        if (typeof a.readingTimeMinutes === 'number' && a.readingTimeMinutes > f.maxReadingTimeMinutes) {
          return false;
        }
      }

      if (Array.isArray(f.tagIds) && f.tagIds.length > 0) {
        const articleTagIds = Array.isArray(a.tagIds) ? a.tagIds : [];
        const hasTag = f.tagIds.some(tid => articleTagIds.indexOf(tid) !== -1);
        if (!hasTag) return false;
      }

      return true;
    });

    results = this._sortArticlesArray(results, sortBy);

    const totalResults = results.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    const mapped = paged.map(a => ({
      articleId: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt || '',
      categoryName: a.categoryName,
      readingTimeMinutes: a.readingTimeMinutes,
      difficulty: a.difficulty || null,
      gameType: a.gameType || null,
      location: a.location || null,
      contentType: a.contentType,
      datePublished: a.datePublished,
      article: a
    }));

    return {
      category: category
        ? {
            id: category.id,
            key: category.key,
            name: category.name,
            description: category.description || null
          }
        : null,
      results: mapped,
      totalResults,
      page: pg,
      pageSize: ps
    };
  }

  // getTagFilterOptions(tagId)
  getTagFilterOptions(tagId) {
    // tagId not needed for options, but kept for interface compatibility
    return {
      contentTypeOptions: [
        { value: 'article', label: 'Article' },
        { value: 'video', label: 'Video' }
      ],
      sortOptions: [
        { value: 'newest', label: 'Newest' },
        { value: 'oldest', label: 'Oldest' },
        { value: 'most_popular', label: 'Most popular' },
        { value: 'most_read', label: 'Most read' }
      ]
    };
  }

  // getTagListing(tagId, filters, sortBy, page, pageSize)
  getTagListing(tagId, filters, sortBy, page, pageSize) {
    const tag = this._findTagById(tagId);
    const allArticlesRaw = this._getFromStorage('articles');
    const allArticles = this._joinArticleDisplayFields(allArticlesRaw);

    const contentType = filters && filters.contentType ? String(filters.contentType) : null;
    const dateFrom = filters && filters.dateFrom ? String(filters.dateFrom) : null;
    const dateTo = filters && filters.dateTo ? String(filters.dateTo) : null;

    let results = allArticles.filter(a => {
      if (!tag) return false;
      const tagIds = Array.isArray(a.tagIds) ? a.tagIds : [];
      if (tagIds.indexOf(tag.id) === -1) return false;

      if (contentType && a.contentType !== contentType) return false;

      if (dateFrom) {
        const df = this._parseDate(dateFrom);
        const ap = this._parseDate(a.datePublished);
        if (df && ap && ap < df) return false;
      }
      if (dateTo) {
        const dt = this._parseDate(dateTo);
        const ap = this._parseDate(a.datePublished);
        if (dt && ap && ap > dt) return false;
      }

      return true;
    });

    results = this._sortArticlesArray(results, sortBy);

    const totalResults = results.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    const mapped = paged.map(a => ({
      articleId: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt || '',
      categoryName: a.categoryName,
      readingTimeMinutes: a.readingTimeMinutes,
      difficulty: a.difficulty || null,
      contentType: a.contentType,
      datePublished: a.datePublished,
      article: a
    }));

    return {
      tag: tag
        ? {
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            description: tag.description || null
          }
        : null,
      results: mapped,
      totalResults,
      page: pg,
      pageSize: ps
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articlesRaw = this._getFromStorage('articles');
    const articleBase = articlesRaw.find(a => a.id === articleId) || null;
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');
    const glossaryTermsAll = this._getFromStorage('glossary_terms');
    const notesAll = this._getFromStorage('article_notes');
    const commentsAll = this._getFromStorage('comments');

    if (!articleBase) {
      return {
        article: null,
        glossaryTerms: [],
        notes: null,
        comments: [],
        newsletterForm: {
          isEnabled: false,
          availableTopics: [],
          frequencyOptions: [],
          preselectedTopics: []
        }
      };
    }

    const category = categories.find(c => c.id === articleBase.categoryId) || null;
    const tagSummaries = Array.isArray(articleBase.tagIds)
      ? articleBase.tagIds
          .map(tid => {
            const t = tags.find(tt => tt.id === tid);
            return t ? { id: t.id, name: t.name, slug: t.slug } : null;
          })
          .filter(Boolean)
      : [];

    const article = {
      id: articleBase.id,
      title: articleBase.title,
      slug: articleBase.slug,
      content: articleBase.content || '',
      excerpt: articleBase.excerpt || '',
      category: category
        ? { id: category.id, key: category.key, name: category.name }
        : null,
      categoryId: articleBase.categoryId,
      readingTimeMinutes: articleBase.readingTimeMinutes,
      difficulty: articleBase.difficulty || null,
      gameType: articleBase.gameType || null,
      location: articleBase.location || null,
      contentType: articleBase.contentType,
      tagSummaries,
      glossaryTermIds: Array.isArray(articleBase.glossaryTermIds) ? articleBase.glossaryTermIds.slice() : [],
      datePublished: articleBase.datePublished,
      isFeatured: !!articleBase.isFeatured,
      popularityScore: typeof articleBase.popularityScore === 'number' ? articleBase.popularityScore : 0,
      videoUrl: articleBase.videoUrl || null,
      videoDurationMinutes: articleBase.videoDurationMinutes || null
    };

    const glossaryTerms = Array.isArray(article.glossaryTermIds)
      ? article.glossaryTermIds
          .map(gid => glossaryTermsAll.find(gt => gt.id === gid) || null)
          .filter(Boolean)
      : [];

    const note = notesAll.find(n => n.articleId === articleId) || null;
    const noteWithFk = note
      ? {
          ...note,
          article
        }
      : null;

    const articleComments = commentsAll
      .filter(c => c.articleId === articleId)
      .map(c => ({
        ...c,
        article
      }));

    const newsletterForm = {
      isEnabled: true,
      availableTopics: [
        { value: 'general_strategy', label: 'General strategy' },
        { value: 'home_games_chip_sets', label: 'Home games & chip sets' },
        { value: 'tournament_tips', label: 'Tournament tips' }
      ],
      frequencyOptions: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' }
      ],
      preselectedTopics: []
    };

    return {
      article,
      glossaryTerms,
      notes: noteWithFk,
      comments: articleComments,
      newsletterForm
    };
  }

  // addArticleToReadingList(articleId, readingListId, newListName)
  addArticleToReadingList(articleId, readingListId, newListName) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, readingList: null, message: 'Article not found' };
    }

    let readingLists = this._getFromStorage('reading_lists');
    let items = this._getFromStorage('reading_list_items');

    let list = null;
    if (newListName) {
      list = {
        id: this._generateId('rl'),
        name: String(newListName),
        description: null,
        isDefault: false,
        totalReadingTimeMinutes: 0,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      readingLists.push(list);
      this._saveToStorage('reading_lists', readingLists);
    } else if (readingListId) {
      list = readingLists.find(rl => rl.id === readingListId) || null;
    } else {
      list = this._getOrCreateDefaultReadingList();
      readingLists = this._getFromStorage('reading_lists');
    }

    if (!list) {
      return { success: false, readingList: null, message: 'Reading list not found' };
    }

    const existing = items.find(it => it.readingListId === list.id && it.articleId === articleId);
    if (!existing) {
      const maxOrder = items
        .filter(it => it.readingListId === list.id)
        .reduce((max, it) => (typeof it.order === 'number' && it.order > max ? it.order : max), 0);
      const item = {
        id: this._generateId('rli'),
        readingListId: list.id,
        articleId,
        order: maxOrder + 1,
        addedAt: this._now()
      };
      items.push(item);
      this._saveToStorage('reading_list_items', items);
    }

    const updatedList = this._recalculateReadingListTotals(list.id);

    return {
      success: true,
      readingList: updatedList,
      message: 'Article added to reading list'
    };
  }

  // getReadingListsSummary
  getReadingListsSummary() {
    const readingLists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const result = readingLists.map(rl => {
      const rlItems = items.filter(it => it.readingListId === rl.id);
      return {
        id: rl.id,
        name: rl.name,
        description: rl.description || null,
        isDefault: !!rl.isDefault,
        totalReadingTimeMinutes: typeof rl.totalReadingTimeMinutes === 'number' ? rl.totalReadingTimeMinutes : 0,
        articleCount: rlItems.length,
        createdAt: rl.createdAt || null,
        updatedAt: rl.updatedAt || null
      };
    });
    return result;
  }

  // getReadingListDetail(readingListId)
  getReadingListDetail(readingListId) {
    const readingLists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const rl = readingLists.find(r => r.id === readingListId) || null;
    if (!rl) {
      return {
        id: null,
        name: null,
        description: null,
        isDefault: false,
        totalReadingTimeMinutes: 0,
        articleCount: 0,
        articles: []
      };
    }

    const listItems = items
      .filter(it => it.readingListId === rl.id)
      .sort((a, b) => {
        const oa = typeof a.order === 'number' ? a.order : 0;
        const ob = typeof b.order === 'number' ? b.order : 0;
        return oa - ob;
      });

    const mappedArticles = listItems.map(it => {
      const art = articles.find(a => a.id === it.articleId) || null;
      return {
        readingListItemId: it.id,
        articleId: it.articleId,
        title: art ? art.title : null,
        slug: art ? art.slug : null,
        categoryName: art ? this._findCategoryById(art.categoryId)?.name || null : null,
        readingTimeMinutes: art && typeof art.readingTimeMinutes === 'number' ? art.readingTimeMinutes : 0,
        difficulty: art ? art.difficulty || null : null,
        contentType: art ? art.contentType : null,
        order: it.order,
        addedAt: it.addedAt || null,
        article: art
      };
    });

    // Ensure totals are in sync
    const totalReadingTimeMinutes =
      typeof rl.totalReadingTimeMinutes === 'number'
        ? rl.totalReadingTimeMinutes
        : mappedArticles.reduce((sum, a) => sum + (a.readingTimeMinutes || 0), 0);

    return {
      id: rl.id,
      name: rl.name,
      description: rl.description || null,
      isDefault: !!rl.isDefault,
      totalReadingTimeMinutes,
      articleCount: mappedArticles.length,
      articles: mappedArticles
    };
  }

  // renameReadingList(readingListId, newName)
  renameReadingList(readingListId, newName) {
    const readingLists = this._getFromStorage('reading_lists');
    const rl = readingLists.find(r => r.id === readingListId) || null;
    if (!rl) {
      return { success: false, readingList: null, message: 'Reading list not found' };
    }
    rl.name = String(newName);
    rl.updatedAt = this._now();
    this._saveToStorage('reading_lists', readingLists);

    const items = this._getFromStorage('reading_list_items');
    const articleCount = items.filter(it => it.readingListId === rl.id).length;

    return {
      success: true,
      readingList: {
        id: rl.id,
        name: rl.name,
        description: rl.description || null,
        isDefault: !!rl.isDefault,
        totalReadingTimeMinutes: typeof rl.totalReadingTimeMinutes === 'number' ? rl.totalReadingTimeMinutes : 0,
        articleCount
      },
      message: 'Reading list renamed'
    };
  }

  // removeArticleFromReadingList(readingListItemId)
  removeArticleFromReadingList(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    const item = items.find(it => it.id === readingListItemId) || null;
    if (!item) {
      return { success: false, readingListId: null, totalReadingTimeMinutes: 0, articleCount: 0, message: 'Item not found' };
    }
    const readingListId = item.readingListId;
    items = items.filter(it => it.id !== readingListItemId);
    this._saveToStorage('reading_list_items', items);

    const updatedList = this._recalculateReadingListTotals(readingListId);

    return {
      success: true,
      readingListId,
      totalReadingTimeMinutes: updatedList ? updatedList.totalReadingTimeMinutes : 0,
      articleCount: updatedList ? updatedList.articleCount : 0,
      message: 'Article removed from reading list'
    };
  }

  // addArticleToCollection(articleId, collectionId, newCollectionName)
  addArticleToCollection(articleId, collectionId, newCollectionName) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, collection: null, message: 'Article not found' };
    }

    let collections = this._getFromStorage('collections');
    let items = this._getFromStorage('collection_items');

    let collection = null;
    if (newCollectionName) {
      collection = this._getOrCreateCollectionByName(newCollectionName);
      collections = this._getFromStorage('collections');
    } else if (collectionId) {
      collection = collections.find(c => c.id === collectionId) || null;
    }

    if (!collection) {
      return { success: false, collection: null, message: 'Collection not found' };
    }

    const existing = items.find(it => it.collectionId === collection.id && it.articleId === articleId);
    if (!existing) {
      const maxOrder = items
        .filter(it => it.collectionId === collection.id)
        .reduce((max, it) => (typeof it.order === 'number' && it.order > max ? it.order : max), 0);
      const item = {
        id: this._generateId('coli'),
        collectionId: collection.id,
        articleId,
        order: maxOrder + 1,
        addedAt: this._now()
      };
      items.push(item);
      this._saveToStorage('collection_items', items);
    }

    const count = items.filter(it => it.collectionId === collection.id).length;
    collection.updatedAt = this._now();
    this._saveToStorage('collections', collections);

    return {
      success: true,
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description || null,
        articleCount: count,
        createdAt: collection.createdAt || null,
        updatedAt: collection.updatedAt || null
      },
      message: 'Article added to collection'
    };
  }

  // getCollectionsSummary
  getCollectionsSummary() {
    const collections = this._getFromStorage('collections');
    const items = this._getFromStorage('collection_items');
    return collections.map(c => {
      const count = items.filter(it => it.collectionId === c.id).length;
      return {
        id: c.id,
        name: c.name,
        description: c.description || null,
        articleCount: count,
        createdAt: c.createdAt || null,
        updatedAt: c.updatedAt || null
      };
    });
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const items = this._getFromStorage('collection_items');
    const articles = this._getFromStorage('articles');

    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return {
        id: null,
        name: null,
        description: null,
        articleCount: 0,
        articles: []
      };
    }

    const colItems = items
      .filter(it => it.collectionId === collection.id)
      .sort((a, b) => {
        const oa = typeof a.order === 'number' ? a.order : 0;
        const ob = typeof b.order === 'number' ? b.order : 0;
        return oa - ob;
      });

    const mappedArticles = colItems.map(it => {
      const art = articles.find(a => a.id === it.articleId) || null;
      return {
        collectionItemId: it.id,
        articleId: it.articleId,
        title: art ? art.title : null,
        slug: art ? art.slug : null,
        categoryName: art ? this._findCategoryById(art.categoryId)?.name || null : null,
        readingTimeMinutes: art && typeof art.readingTimeMinutes === 'number' ? art.readingTimeMinutes : 0,
        contentType: art ? art.contentType : null,
        order: it.order,
        addedAt: it.addedAt || null,
        article: art
      };
    });

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description || null,
      articleCount: mappedArticles.length,
      articles: mappedArticles
    };
  }

  // renameCollection(collectionId, newName)
  renameCollection(collectionId, newName) {
    const collections = this._getFromStorage('collections');
    const c = collections.find(col => col.id === collectionId) || null;
    if (!c) {
      return { success: false, collection: null, message: 'Collection not found' };
    }
    c.name = String(newName);
    c.updatedAt = this._now();
    this._saveToStorage('collections', collections);

    const items = this._getFromStorage('collection_items');
    const count = items.filter(it => it.collectionId === c.id).length;

    return {
      success: true,
      collection: {
        id: c.id,
        name: c.name,
        description: c.description || null,
        articleCount: count
      },
      message: 'Collection renamed'
    };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    const collections = this._getFromStorage('collections');
    const existing = collections.find(c => c.id === collectionId) || null;
    if (!existing) {
      return { success: false, message: 'Collection not found' };
    }
    const newCollections = collections.filter(c => c.id !== collectionId);
    this._saveToStorage('collections', newCollections);

    const items = this._getFromStorage('collection_items');
    const newItems = items.filter(it => it.collectionId !== collectionId);
    this._saveToStorage('collection_items', newItems);

    return {
      success: true,
      message: 'Collection deleted'
    };
  }

  // removeArticleFromCollection(collectionItemId)
  removeArticleFromCollection(collectionItemId) {
    let items = this._getFromStorage('collection_items');
    const item = items.find(it => it.id === collectionItemId) || null;
    if (!item) {
      return { success: false, collectionId: null, remainingCount: 0, message: 'Item not found' };
    }
    const collectionId = item.collectionId;
    items = items.filter(it => it.id !== collectionItemId);
    this._saveToStorage('collection_items', items);

    const remainingCount = items.filter(it => it.collectionId === collectionId).length;

    return {
      success: true,
      collectionId,
      remainingCount,
      message: 'Article removed from collection'
    };
  }

  // addArticleToSavedLinks(articleId, folderId)
  addArticleToSavedLinks(articleId, folderId) {
    const articles = this._getFromStorage('articles');
    const savedLinks = this._getFromStorage('saved_links');

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return { success: false, savedLink: null, message: 'Article not found' };
    }

    const existing = savedLinks.find(sl => sl.articleId === articleId && sl.folderId === (folderId || null));
    if (existing) {
      return {
        success: true,
        savedLink: {
          ...existing,
          articleSlug: article.slug,
          article
        },
        message: 'Link already saved'
      };
    }

    const link = {
      id: this._generateId('sl'),
      articleId,
      title: article.title,
      url: '/articles/' + article.slug,
      folderId: folderId || null,
      createdAt: this._now()
    };
    savedLinks.push(link);
    this._saveToStorage('saved_links', savedLinks);

    return {
      success: true,
      savedLink: {
        ...link,
        articleSlug: article.slug,
        article
      },
      message: 'Link saved'
    };
  }

  // getSavedLinksAndFolders
  getSavedLinksAndFolders() {
    const folders = this._getFromStorage('saved_link_folders');
    const links = this._getFromStorage('saved_links');
    const articles = this._getFromStorage('articles');

    const folderSummaries = folders.map(f => {
      const count = links.filter(l => l.folderId === f.id).length;
      return {
        id: f.id,
        name: f.name,
        description: f.description || null,
        linkCount: count,
        createdAt: f.createdAt || null,
        updatedAt: f.updatedAt || null
      };
    });

    const linkSummaries = links.map(l => {
      const article = articles.find(a => a.id === l.articleId) || null;
      return {
        id: l.id,
        articleId: l.articleId,
        title: l.title,
        articleSlug: article ? article.slug : null,
        folderId: l.folderId || null,
        createdAt: l.createdAt || null,
        article
      };
    });

    return {
      folders: folderSummaries,
      links: linkSummaries
    };
  }

  // createFolderAndAssignSavedLinks(folderName, savedLinkIds)
  createFolderAndAssignSavedLinks(folderName, savedLinkIds) {
    const folders = this._getFromStorage('saved_link_folders');
    const links = this._getFromStorage('saved_links');

    const folder = {
      id: this._generateId('slf'),
      name: String(folderName),
      description: null,
      createdAt: this._now(),
      updatedAt: this._now()
    };
    folders.push(folder);
    this._saveToStorage('saved_link_folders', folders);

    const ids = Array.isArray(savedLinkIds) ? savedLinkIds : [];
    const updatedLinks = [];

    for (const id of ids) {
      const link = links.find(l => l.id === id);
      if (link) {
        link.folderId = folder.id;
        updatedLinks.push({ id: link.id, folderId: folder.id, folder });
      }
    }
    this._saveToStorage('saved_links', links);

    return {
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        description: folder.description,
        linkCount: updatedLinks.length
      },
      updatedLinks,
      message: 'Folder created and links assigned'
    };
  }

  // moveSavedLinksToFolder(folderId, savedLinkIds)
  moveSavedLinksToFolder(folderId, savedLinkIds) {
    const folders = this._getFromStorage('saved_link_folders');
    const links = this._getFromStorage('saved_links');

    const folder = folders.find(f => f.id === folderId) || null;
    if (!folder) {
      return { success: false, updatedLinks: [], message: 'Folder not found' };
    }

    const ids = Array.isArray(savedLinkIds) ? savedLinkIds : [];
    const updatedLinks = [];

    for (const id of ids) {
      const link = links.find(l => l.id === id);
      if (link) {
        link.folderId = folder.id;
        updatedLinks.push({ id: link.id, folderId: folder.id, folder });
      }
    }
    this._saveToStorage('saved_links', links);

    return {
      success: true,
      updatedLinks,
      message: 'Links moved to folder'
    };
  }

  // removeSavedLink(savedLinkId)
  removeSavedLink(savedLinkId) {
    const links = this._getFromStorage('saved_links');
    const existing = links.find(l => l.id === savedLinkId) || null;
    if (!existing) {
      return { success: false, message: 'Saved link not found' };
    }
    const newLinks = links.filter(l => l.id !== savedLinkId);
    this._saveToStorage('saved_links', newLinks);
    return {
      success: true,
      message: 'Saved link removed'
    };
  }

  // addArticleToWatchLater(articleId, fromTag)
  addArticleToWatchLater(articleId, fromTag) {
    const articles = this._getFromStorage('articles');
    const queue = this._getFromStorage('watch_later_items');

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return { success: false, watchLaterItem: null, message: 'Article not found' };
    }

    const existing = queue.find(q => q.articleId === articleId);
    if (existing) {
      return {
        success: true,
        watchLaterItem: {
          ...existing,
          article
        },
        message: 'Already in Watch Later'
      };
    }

    const item = {
      id: this._generateId('wli'),
      articleId,
      fromTag: fromTag || null,
      addedAt: this._now()
    };
    queue.push(item);
    this._saveToStorage('watch_later_items', queue);

    return {
      success: true,
      watchLaterItem: {
        ...item,
        article
      },
      message: 'Added to Watch Later'
    };
  }

  // getWatchLaterItems
  getWatchLaterItems() {
    const queue = this._getFromStorage('watch_later_items');
    const articles = this._getFromStorage('articles');

    return queue.map(it => {
      const article = articles.find(a => a.id === it.articleId) || null;
      return {
        watchLaterItemId: it.id,
        articleId: it.articleId,
        title: article ? article.title : null,
        slug: article ? article.slug : null,
        videoDurationMinutes: article && typeof article.videoDurationMinutes === 'number' ? article.videoDurationMinutes : null,
        contentType: article ? article.contentType : null,
        datePublished: article ? article.datePublished : null,
        fromTag: it.fromTag || null,
        addedAt: it.addedAt || null,
        article
      };
    });
  }

  // removeWatchLaterItem(watchLaterItemId)
  removeWatchLaterItem(watchLaterItemId) {
    const queue = this._getFromStorage('watch_later_items');
    const existing = queue.find(it => it.id === watchLaterItemId) || null;
    if (!existing) {
      return { success: false, message: 'Watch Later item not found' };
    }
    const newQueue = queue.filter(it => it.id !== watchLaterItemId);
    this._saveToStorage('watch_later_items', newQueue);
    return {
      success: true,
      message: 'Removed from Watch Later'
    };
  }

  // getArticleNotes(articleId)
  getArticleNotes(articleId) {
    const notes = this._getFromStorage('article_notes');
    const note = notes.find(n => n.articleId === articleId) || null;
    if (!note) return null;
    const article = this._findArticleById(articleId);
    return {
      ...note,
      article
    };
  }

  // saveArticleNote(articleId, body)
  saveArticleNote(articleId, body) {
    const notes = this._getFromStorage('article_notes');
    const now = this._now();
    let note = notes.find(n => n.articleId === articleId) || null;
    if (!note) {
      note = {
        id: this._generateId('an'),
        articleId,
        body: String(body),
        createdAt: now,
        updatedAt: now
      };
      notes.push(note);
    } else {
      note.body = String(body);
      note.updatedAt = now;
    }
    this._saveToStorage('article_notes', notes);

    // Instrumentation for task completion tracking (task3_noteSavedWithBreakdown)
    try {
      if (typeof note.body === 'string' && note.body.includes('Home game chip breakdown')) {
        localStorage.setItem(
          'task3_noteSavedWithBreakdown',
          JSON.stringify({
            articleId,
            body,
            savedAt: this._now()
          })
        );
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (_) {}
    }

    const article = this._findArticleById(articleId);
    return {
      success: true,
      note: {
        ...note,
        article
      },
      message: 'Note saved'
    };
  }

  // addGlossaryTermToMyGlossary(glossaryTermId, sourceArticleId, notes)
  addGlossaryTermToMyGlossary(glossaryTermId, sourceArticleId, notes) {
    const glossaryTerms = this._getFromStorage('glossary_terms');
    const myTerms = this._getFromStorage('my_glossary_terms');

    const term = glossaryTerms.find(t => t.id === glossaryTermId) || null;
    if (!term) {
      return { success: false, myGlossaryTerm: null, message: 'Glossary term not found' };
    }

    let myTerm = myTerms.find(mt => mt.glossaryTermId === glossaryTermId) || null;
    const now = this._now();
    if (!myTerm) {
      myTerm = {
        id: this._generateId('mgt'),
        glossaryTermId,
        sourceArticleId: sourceArticleId || null,
        notes: notes || null,
        addedAt: now
      };
      myTerms.push(myTerm);
    } else {
      myTerm.sourceArticleId = sourceArticleId || myTerm.sourceArticleId || null;
      if (notes != null) myTerm.notes = notes;
    }
    this._saveToStorage('my_glossary_terms', myTerms);

    const article = sourceArticleId ? this._findArticleById(sourceArticleId) : null;

    return {
      success: true,
      myGlossaryTerm: {
        ...myTerm,
        glossaryTerm: term,
        sourceArticle: article
      },
      message: 'Term added to My Glossary'
    };
  }

  // getMyGlossaryTerms(searchTerm) 
  getMyGlossaryTerms(searchTerm) {
    const glossaryTerms = this._getFromStorage('glossary_terms');
    const myTerms = this._getFromStorage('my_glossary_terms');
    const q = (searchTerm || '').toLowerCase().trim();

    return myTerms
      .map(mt => {
        const term = glossaryTerms.find(t => t.id === mt.glossaryTermId) || null;
        return { mt, term };
      })
      .filter(pair => {
        if (!pair.term) return false;
        if (!q) return true;
        const combined = (pair.term.term || '') + ' ' + (pair.term.definition || '') + ' ' + (pair.mt.notes || '');
        return combined.toLowerCase().includes(q);
      })
      .map(pair => ({
        myGlossaryTermId: pair.mt.id,
        glossaryTermId: pair.mt.glossaryTermId,
        term: pair.term.term,
        slug: pair.term.slug,
        definition: pair.term.definition,
        example: pair.term.example || null,
        sourceArticleId: pair.mt.sourceArticleId || null,
        notes: pair.mt.notes || null,
        addedAt: pair.mt.addedAt || null,
        glossaryTerm: pair.term,
        sourceArticle: pair.mt.sourceArticleId ? this._findArticleById(pair.mt.sourceArticleId) : null
      }));
  }

  // removeMyGlossaryTerm(myGlossaryTermId)
  removeMyGlossaryTerm(myGlossaryTermId) {
    const myTerms = this._getFromStorage('my_glossary_terms');
    const existing = myTerms.find(mt => mt.id === myGlossaryTermId) || null;
    if (!existing) {
      return { success: false, message: 'My Glossary term not found' };
    }
    const newTerms = myTerms.filter(mt => mt.id !== myGlossaryTermId);
    this._saveToStorage('my_glossary_terms', newTerms);
    return {
      success: true,
      message: 'Term removed from My Glossary'
    };
  }

  // submitComment(articleId, name, body)
  submitComment(articleId, name, body) {
    const comments = this._getFromStorage('comments');
    const article = this._findArticleById(articleId);
    if (!article) {
      return { success: false, comment: null, message: 'Article not found' };
    }

    const comment = {
      id: this._generateId('cmt'),
      articleId,
      name: String(name),
      body: String(body),
      createdAt: this._now(),
      status: 'pending'
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      comment: {
        ...comment,
        article
      },
      message: 'Comment submitted'
    };
  }

  // submitNewsletterSubscription(name, email, topics, frequency, sourceArticleId)
  submitNewsletterSubscription(name, email, topics, frequency, sourceArticleId) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    const allowedFrequencies = ['daily', 'weekly', 'monthly'];
    const freq = allowedFrequencies.indexOf(frequency) !== -1 ? frequency : 'weekly';

    const subscription = {
      id: this._generateId('ns'),
      name: String(name),
      email: String(email),
      topics: Array.isArray(topics) ? topics.slice() : [],
      frequency: freq,
      sourceArticleId: sourceArticleId || null,
      createdAt: this._now()
    };
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscriptionId: subscription.id,
      message: 'Subscription saved'
    };
  }

  // getToolsIndex
  getToolsIndex() {
    return this._getFromStorage('tools');
  }

  // getToolDetail(toolSlug)
  getToolDetail(toolSlug) {
    const tools = this._getFromStorage('tools');
    const tool = tools.find(t => t.slug === toolSlug) || null;
    return { tool: tool || null };
  }

  // getHomeGameChipCalculatorConfig
  getHomeGameChipCalculatorConfig() {
    return {
      availableDenominations: [
        { value: 0.25, label: '$0.25' },
        { value: 1, label: '$1' },
        { value: 5, label: '$5' },
        { value: 25, label: '$25' },
        { value: 100, label: '$100' }
      ],
      defaultSelectedDenominations: [0.25, 1, 5, 25],
      defaultNumberOfPlayers: 6,
      defaultBuyInPerPlayer: 20
    };
  }

  // calculateHomeGameChipBreakdown(numberOfPlayers, buyInPerPlayer, denominations)
  calculateHomeGameChipBreakdown(numberOfPlayers, buyInPerPlayer, denominations) {
    const result = this._calculateChipBreakdownLogic(numberOfPlayers, buyInPerPlayer, denominations);
    if (!result || !result.breakdown) {
      return {
        success: false,
        breakdown: {
          perPlayer: [],
          totalBank: 0,
          totalChips: 0,
          recommendedSetSize: 0
        },
        breakdownText: '',
        message: 'Unable to calculate breakdown'
      };
    }

    // Instrumentation for task completion tracking (task3_calculatorRun)
    try {
      // This branch corresponds to a successful calculation
      localStorage.setItem(
        'task3_calculatorRun',
        JSON.stringify({
          numberOfPlayers,
          buyInPerPlayer,
          denominations: Array.isArray(denominations) ? denominations.slice() : denominations,
          breakdownText: result.breakdownText,
          calculatedAt: this._now()
        })
      );
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (_) {}
    }

    return {
      success: true,
      breakdown: result.breakdown,
      breakdownText: result.breakdownText,
      message: 'Breakdown calculated'
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    return {
      title: '',
      body: '',
      sections: []
    };
  }

  // getContactPageContent
  getContactPageContent() {
    const raw = localStorage.getItem('contact_page_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    return {
      introText: '',
      responseExpectations: ''
    };
  }

  // submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    // No persistence defined for contact messages; simulate success
    return {
      success: true,
      message: 'Message submitted'
    };
  }

  // getHelpFaqContent
  getHelpFaqContent() {
    const raw = localStorage.getItem('help_faq_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    return {
      sections: []
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    return {
      title: '',
      body: '',
      lastUpdated: ''
    };
  }

  // getTermsOfUseContent
  getTermsOfUseContent() {
    const raw = localStorage.getItem('terms_of_use_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    return {
      title: '',
      body: '',
      lastUpdated: ''
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
