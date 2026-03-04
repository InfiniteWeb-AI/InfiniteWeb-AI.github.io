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

  // -------------------------------
  // Initialization & low-level helpers
  // -------------------------------

  _initStorage() {
    // Initialize all entity tables as empty arrays if not present
    const arrayKeys = [
      'articles',
      'article_categories',
      'tags',
      'comments',
      'saved_articles',
      'diy_build_parts_lists',
      'diy_parts',
      'projects',
      'project_parts',
      'example_protocols',
      'protocol_bookmarks',
      'tools',
      'safety_checklist_configs',
      'safety_checklists',
      'safety_checklist_items',
      'learning_path_templates',
      'learning_plans',
      'learning_plan_items',
      'glossary_terms',
      'my_glossary_items',
      'newsletter_subscriptions',
      'contact_messages'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // -------------------------------
  // Higher-level state helpers (single-user state)
  // -------------------------------

  _getOrCreateSavedArticlesState() {
    const savedArticles = this._getFromStorage('saved_articles', []);
    const readingList = savedArticles.filter(sa => sa.saveType === 'reading_list');
    const bookmarkedArticles = savedArticles.filter(sa => sa.saveType === 'bookmarked_article');
    return { savedArticles, readingList, bookmarkedArticles };
  }

  _getOrCreateProjectPlannerState() {
    const projects = this._getFromStorage('projects', []);
    const projectParts = this._getFromStorage('project_parts', []);
    return { projects, projectParts };
  }

  _getOrCreateMyGlossaryState() {
    const myGlossaryItems = this._getFromStorage('my_glossary_items', []);
    return { myGlossaryItems };
  }

  _getOrCreateNewsletterSubscriptionState() {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);
    return { subscriptions };
  }

  _persistState(storageKey, data) {
    this._saveToStorage(storageKey, data);
  }

  // Utility for resolving tags on an article
  _resolveArticleTags(article, tagsIndexByIdOrSlug) {
    const tagIdsOrSlugs = article && Array.isArray(article.tags) ? article.tags : [];
    return tagIdsOrSlugs
      .map(tid => tagsIndexByIdOrSlug[tid] || null)
      .filter(t => t !== null);
  }

  // Build lookup maps
  _indexById(array) {
    const map = {};
    for (const item of array) {
      if (item && item.id) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _indexTagsByIdAndSlug(tags) {
    const map = {};
    for (const tag of tags) {
      if (!tag) continue;
      if (tag.id) map[tag.id] = tag;
      if (tag.slug) map[tag.slug] = tag;
    }
    return map;
  }

  // -------------------------------
  // Interface implementations
  // -------------------------------

  // getHomePageContent
  getHomePageContent() {
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('article_categories', []);
    const tags = this._getFromStorage('tags', []);
    const tagsIndex = this._indexTagsByIdAndSlug(tags);
    const categoriesById = this._indexById(categories);

    const safetyCategory = categories.find(c =>
      c && (c.slug === 'safety' || (c.name && c.name.toLowerCase().includes('safety')))
    );

    const featuredSafetyArticles = articles
      .filter(a => a.isFeatured && safetyCategory && a.categoryId === safetyCategory.id)
      .map(article => ({
        article,
        category: categoriesById[article.categoryId] || null,
        tags: this._resolveArticleTags(article, tagsIndex)
      }));

    const featuredBeginnerArticles = articles
      .filter(a => a.isFeatured && a.difficulty === 'beginner')
      .map(article => ({
        article,
        category: categoriesById[article.categoryId] || null,
        tags: this._resolveArticleTags(article, tagsIndex)
      }));

    // safetyNoticeSummary from optional home_page_config or leave empty
    let safetyNoticeSummary = '';
    const homeConfigRaw = localStorage.getItem('home_page_config');
    if (homeConfigRaw) {
      try {
        const homeConfig = JSON.parse(homeConfigRaw);
        if (homeConfig && typeof homeConfig.safetyNoticeSummary === 'string') {
          safetyNoticeSummary = homeConfig.safetyNoticeSummary;
        }
      } catch (e) {}
    }

    // showNewsletterTeaser if no active subscription
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    const hasActive = subs.some(s => s && s.isActive);
    const showNewsletterTeaser = !hasActive;

    return {
      featuredSafetyArticles,
      featuredBeginnerArticles,
      safetyNoticeSummary,
      showNewsletterTeaser
    };
  }

  // getArticleCategories
  getArticleCategories() {
    return this._getFromStorage('article_categories', []);
  }

  // getArticleFilterOptions
  getArticleFilterOptions() {
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    const tags = this._getFromStorage('tags', []);

    const sortOptions = [
      { id: 'newest', label: 'Newest first', value: 'newest' },
      { id: 'oldest', label: 'Oldest first', value: 'oldest' },
      { id: 'rating_desc', label: 'Highest rated', value: 'rating_desc' },
      { id: 'comments_desc', label: 'Most commented', value: 'comments_desc' }
    ];

    const ratingThresholds = [3, 4, 4.5];
    const commentCountThresholds = [0, 5, 10];

    const articles = this._getFromStorage('articles', []);
    let minMinutes = 0;
    let maxMinutes = 0;
    const readingTimes = articles
      .map(a => a.readingTimeMinutes)
      .filter(v => typeof v === 'number' && !isNaN(v));
    if (readingTimes.length > 0) {
      minMinutes = Math.min.apply(null, readingTimes);
      maxMinutes = Math.max.apply(null, readingTimes);
    }

    const readingTimeRange = { minMinutes, maxMinutes };

    return {
      difficulties,
      tags,
      sortOptions,
      ratingThresholds,
      commentCountThresholds,
      readingTimeRange
    };
  }

  // getArticlesList(filters, sortBy, page, pageSize)
  getArticlesList(filters, sortBy, page, pageSize) {
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('article_categories', []);
    const tags = this._getFromStorage('tags', []);
    const tagsIndex = this._indexTagsByIdAndSlug(tags);
    const categoriesById = this._indexById(categories);

    const f = filters || {};
    let results = articles.slice();

    if (f.categoryId) {
      results = results.filter(a => a.categoryId === f.categoryId);
    }
    if (f.difficulty) {
      results = results.filter(a => a.difficulty === f.difficulty);
    }
    if (Array.isArray(f.tagIds) && f.tagIds.length > 0) {
      results = results.filter(a => {
        const atags = Array.isArray(a.tags) ? a.tags : [];
        return f.tagIds.some(tid => atags.indexOf(tid) !== -1);
      });
    }
    if (f.publicationDateFrom) {
      const fromDate = this._parseDate(f.publicationDateFrom);
      if (fromDate) {
        results = results.filter(a => {
          const d = this._parseDate(a.publicationDate);
          return d && d >= fromDate;
        });
      }
    }
    if (f.publicationDateTo) {
      const toDate = this._parseDate(f.publicationDateTo);
      if (toDate) {
        results = results.filter(a => {
          const d = this._parseDate(a.publicationDate);
          return d && d <= toDate;
        });
      }
    }
    if (typeof f.minReadingTimeMinutes === 'number') {
      results = results.filter(a => typeof a.readingTimeMinutes === 'number' && a.readingTimeMinutes >= f.minReadingTimeMinutes);
    }
    if (typeof f.maxReadingTimeMinutes === 'number') {
      results = results.filter(a => typeof a.readingTimeMinutes === 'number' && a.readingTimeMinutes <= f.maxReadingTimeMinutes);
    }
    if (typeof f.minAverageRating === 'number') {
      results = results.filter(a => typeof a.averageRating === 'number' && a.averageRating >= f.minAverageRating);
    }
    if (typeof f.minCommentCount === 'number') {
      results = results.filter(a => (a.commentCount || 0) >= f.minCommentCount);
    }

    const sortKey = sortBy || 'newest';
    results.sort((a, b) => {
      if (sortKey === 'oldest') {
        const da = this._parseDate(a.publicationDate) || new Date(0);
        const db = this._parseDate(b.publicationDate) || new Date(0);
        return da - db;
      }
      if (sortKey === 'rating_desc') {
        const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
        const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
        return rb - ra;
      }
      if (sortKey === 'comments_desc') {
        const ca = a.commentCount || 0;
        const cb = b.commentCount || 0;
        return cb - ca;
      }
      // default newest
      const da = this._parseDate(a.publicationDate) || new Date(0);
      const db = this._parseDate(b.publicationDate) || new Date(0);
      return db - da;
    });

    const totalCount = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    const wrapped = paged.map(article => ({
      article,
      category: categoriesById[article.categoryId] || null,
      tags: this._resolveArticleTags(article, tagsIndex)
    }));

    return {
      results: wrapped,
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  // searchArticles(query, filters, sortBy, page, pageSize)
  searchArticles(query, filters, sortBy, page, pageSize) {
    const q = (query || '').toLowerCase().trim();
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('article_categories', []);
    const tags = this._getFromStorage('tags', []);
    const exampleProtocols = this._getFromStorage('example_protocols', []);

    const tagsIndex = this._indexTagsByIdAndSlug(tags);
    const categoriesById = this._indexById(categories);

    const f = filters || {};

    // Pre-index protocols by articleId
    const protocolsByArticleId = {};
    for (const ptl of exampleProtocols) {
      if (!ptl || !ptl.articleId) continue;
      if (!protocolsByArticleId[ptl.articleId]) protocolsByArticleId[ptl.articleId] = [];
      protocolsByArticleId[ptl.articleId].push(ptl);
    }

    let results = articles.filter(a => {
      // text match
      if (q) {
        const text = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.content || '')).toLowerCase();
        const tokens = q.split(/\s+/).filter(tok => tok.length > 1);
        if (tokens.length === 0) {
          if (text.indexOf(q) === -1) return false;
        } else {
          const hasAllTokens = tokens.every(tok => text.indexOf(tok) !== -1);
          if (!hasAllTokens) return false;
        }
      }

      // basic filters
      if (f.categoryId && a.categoryId !== f.categoryId) return false;
      if (f.difficulty && a.difficulty !== f.difficulty) return false;
      if (typeof f.minAverageRating === 'number') {
        if (!(typeof a.averageRating === 'number' && a.averageRating >= f.minAverageRating)) return false;
      }
      if (typeof f.minCommentCount === 'number') {
        if ((a.commentCount || 0) < f.minCommentCount) return false;
      }

      // protocol-related filters
      const hasProtocolFilters =
        f.stimulationType ||
        f.targetAreaContains ||
        typeof f.currentIntensity === 'number' ||
        f.currentIntensityUnit ||
        typeof f.durationMinMinutes === 'number' ||
        typeof f.durationMaxMinutes === 'number';

      if (!hasProtocolFilters) return true;

      const protocols = protocolsByArticleId[a.id] || [];
      if (!protocols.length) return false;

      const targetSubstring = f.targetAreaContains ? f.targetAreaContains.toLowerCase() : null;

      const matches = protocols.some(p => {
        if (f.stimulationType && p.stimulationType !== f.stimulationType) return false;
        if (targetSubstring) {
          const ta = (p.targetArea || '').toLowerCase();
          if (ta.indexOf(targetSubstring) === -1) return false;
        }
        if (typeof f.currentIntensity === 'number') {
          if (typeof p.currentIntensity !== 'number' || p.currentIntensity !== f.currentIntensity) return false;
        }
        if (f.currentIntensityUnit && p.currentIntensityUnit !== f.currentIntensityUnit) return false;

        const pMin = typeof p.durationMinMinutes === 'number' ? p.durationMinMinutes : null;
        const pMax = typeof p.durationMaxMinutes === 'number' ? p.durationMaxMinutes : null;
        const fMin = typeof f.durationMinMinutes === 'number' ? f.durationMinMinutes : null;
        const fMax = typeof f.durationMaxMinutes === 'number' ? f.durationMaxMinutes : null;

        if (fMin === null && fMax === null) return true;

        // Overlap logic: [pMin,pMax] intersects [fMin,fMax]
        const effPMin = pMin !== null ? pMin : pMax;
        const effPMax = pMax !== null ? pMax : pMin;
        const effFMin = fMin !== null ? fMin : fMax;
        const effFMax = fMax !== null ? fMax : fMin;
        if (effPMin === null || effPMax === null || effFMin === null || effFMax === null) return false;
        return effPMin <= effFMax && effPMax >= effFMin;
      });

      return matches;
    });

    const sortKey = sortBy || 'relevance';
    results.sort((a, b) => {
      if (sortKey === 'newest') {
        const da = this._parseDate(a.publicationDate) || new Date(0);
        const db = this._parseDate(b.publicationDate) || new Date(0);
        return db - da;
      }
      if (sortKey === 'rating_desc') {
        const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
        const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
        return rb - ra;
      }
      // simple relevance: title match count then newest
      const qa = q;
      const score = (art) => {
        if (!qa) return 0;
        const t = (art.title || '').toLowerCase();
        const s = (art.summary || '').toLowerCase();
        const c = (art.content || '').toLowerCase();
        let sc = 0;
        if (t.indexOf(qa) !== -1) sc += 3;
        if (s.indexOf(qa) !== -1) sc += 2;
        if (c.indexOf(qa) !== -1) sc += 1;
        return sc;
      };
      const sa = score(a);
      const sb = score(b);
      if (sb !== sa) return sb - sa;
      const da = this._parseDate(a.publicationDate) || new Date(0);
      const db = this._parseDate(b.publicationDate) || new Date(0);
      return db - da;
    });

    const totalCount = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    const wrapped = paged.map(article => ({
      article,
      category: categoriesById[article.categoryId] || null,
      tags: this._resolveArticleTags(article, tagsIndex)
    }));

    return {
      results: wrapped,
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  // getArticleBySlug(slug)
  getArticleBySlug(slug) {
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('article_categories', []);
    const tags = this._getFromStorage('tags', []);
    const tagsIndex = this._indexTagsByIdAndSlug(tags);
    const categoriesById = this._indexById(categories);

    const article = articles.find(a => a.slug === slug) || null;
    if (!article) {
      return { article: null, category: null, tags: [] };
    }

    return {
      article,
      category: categoriesById[article.categoryId] || null,
      tags: this._resolveArticleTags(article, tagsIndex)
    };
  }

  // getArticleComments(articleId)
  getArticleComments(articleId) {
    const comments = this._getFromStorage('comments', []);
    const articles = this._getFromStorage('articles', []);
    const articleIndex = this._indexById(articles);

    const filtered = comments
      .filter(c => c.articleId === articleId)
      .sort((a, b) => {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return da - db;
      })
      .map(c => ({
        ...c,
        article: articleIndex[c.articleId] || null
      }));

    return filtered;
  }

  // postArticleComment(articleId, authorName, authorEmail, body)
  postArticleComment(articleId, authorName, authorEmail, body) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, comment: null, message: 'Article not found' };
    }

    if (!authorName || !authorEmail || !body) {
      return { success: false, comment: null, message: 'Name, email, and comment body are required' };
    }

    const comments = this._getFromStorage('comments', []);
    const newComment = {
      id: this._generateId('comment'),
      articleId,
      authorName,
      authorEmail,
      body,
      createdAt: this._nowIso(),
      isBySiteOwner: false
    };

    comments.push(newComment);
    this._saveToStorage('comments', comments);

    // Optionally update article.commentCount
    const updatedArticles = articles.map(a => {
      if (a.id === articleId) {
        const count = (a.commentCount || 0) + 1;
        return { ...a, commentCount: count };
      }
      return a;
    });
    this._saveToStorage('articles', updatedArticles);

    return { success: true, comment: newComment, message: 'Comment posted' };
  }

  // saveArticleToReadingList(articleId)
  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, savedArticle: null, message: 'Article not found' };
    }

    const state = this._getOrCreateSavedArticlesState();
    const existing = state.savedArticles.find(sa => sa.articleId === articleId && sa.saveType === 'reading_list');
    if (existing) {
      return { success: true, savedArticle: existing, message: 'Already in reading list' };
    }

    const savedArticle = {
      id: this._generateId('saved'),
      articleId,
      saveType: 'reading_list',
      savedAt: this._nowIso(),
      notes: null
    };

    state.savedArticles.push(savedArticle);
    this._persistState('saved_articles', state.savedArticles);

    return { success: true, savedArticle, message: 'Added to reading list' };
  }

  // bookmarkArticle(articleId, notes)
  bookmarkArticle(articleId, notes) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, savedArticle: null, message: 'Article not found' };
    }

    const state = this._getOrCreateSavedArticlesState();
    const existing = state.savedArticles.find(sa => sa.articleId === articleId && sa.saveType === 'bookmarked_article');
    if (existing) {
      const updated = { ...existing, notes: notes !== undefined ? notes : existing.notes };
      const updatedList = state.savedArticles.map(sa => (sa.id === existing.id ? updated : sa));
      this._persistState('saved_articles', updatedList);
      return { success: true, savedArticle: updated, message: 'Bookmark updated' };
    }

    const savedArticle = {
      id: this._generateId('saved'),
      articleId,
      saveType: 'bookmarked_article',
      savedAt: this._nowIso(),
      notes: notes || null
    };

    state.savedArticles.push(savedArticle);
    this._persistState('saved_articles', state.savedArticles);

    return { success: true, savedArticle, message: 'Article bookmarked' };
  }

  // getSavedArticles()
  getSavedArticles() {
    const state = this._getOrCreateSavedArticlesState();
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('article_categories', []);
    const tags = this._getFromStorage('tags', []);

    const articlesById = this._indexById(articles);
    const categoriesById = this._indexById(categories);
    const tagsIndex = this._indexTagsByIdAndSlug(tags);

    const wrap = (saved) => {
      const article = articlesById[saved.articleId] || null;
      return {
        savedArticle: saved,
        article,
        category: article ? categoriesById[article.categoryId] || null : null,
        tags: article ? this._resolveArticleTags(article, tagsIndex) : []
      };
    };

    const readingList = state.readingList.map(wrap);
    const bookmarkedArticles = state.bookmarkedArticles.map(wrap);

    return { readingList, bookmarkedArticles };
  }

  // removeSavedArticle(savedArticleId)
  removeSavedArticle(savedArticleId) {
    const state = this._getOrCreateSavedArticlesState();
    const beforeLen = state.savedArticles.length;
    const updated = state.savedArticles.filter(sa => sa.id !== savedArticleId);
    this._persistState('saved_articles', updated);
    const success = updated.length !== beforeLen;
    return { success, message: success ? 'Removed saved article' : 'Saved article not found' };
  }

  // getDIYPartsListForArticle(articleId)
  getDIYPartsListForArticle(articleId) {
    const partsLists = this._getFromStorage('diy_build_parts_lists', []);
    const components = this._getFromStorage('diy_parts', []);
    const articles = this._getFromStorage('articles', []);

    const partsList = partsLists.find(pl => pl.articleId === articleId) || null;
    if (!partsList) {
      return { partsList: null, components: [] };
    }

    const article = articles.find(a => a.id === partsList.articleId) || null;
    const partsListWithArticle = { ...partsList, article };

    const comps = components
      .filter(c => c.partsListId === partsList.id)
      .map(c => ({ ...c, partsList: partsListWithArticle }));

    return { partsList: partsListWithArticle, components: comps };
  }

  // savePartsListToProjectPlanner(partsListId, projectName)
  savePartsListToProjectPlanner(partsListId, projectName) {
    const partsLists = this._getFromStorage('diy_build_parts_lists', []);
    const components = this._getFromStorage('diy_parts', []);
    const articles = this._getFromStorage('articles', []);

    const partsList = partsLists.find(pl => pl.id === partsListId);
    if (!partsList) {
      return { project: null, projectParts: [] };
    }

    const article = articles.find(a => a.id === partsList.articleId) || null;
    const state = this._getOrCreateProjectPlannerState();

    const project = {
      id: this._generateId('project'),
      name: projectName || partsList.title || (article ? article.title : 'DIY Project'),
      sourceArticleId: partsList.articleId || null,
      sourcePartsListId: partsList.id,
      createdAt: this._nowIso(),
      updatedAt: null,
      notes: null
    };

    state.projects.push(project);

    const relatedComponents = components.filter(c => c.partsListId === partsList.id);
    const existingProjectParts = state.projectParts;
    const newProjectParts = relatedComponents.map(c => {
      const part = {
        id: this._generateId('projpart'),
        projectId: project.id,
        name: c.name,
        quantity: c.quantity !== undefined ? c.quantity : null,
        unit: c.unit || null,
        isOptional: !!c.isOptional,
        isPurchased: false,
        notes: c.notes || null
      };
      existingProjectParts.push(part);
      return part;
    });

    this._persistState('projects', state.projects);
    this._persistState('project_parts', existingProjectParts);

    return { project, projectParts: newProjectParts };
  }

  // getProjectsOverview()
  getProjectsOverview() {
    const state = this._getOrCreateProjectPlannerState();
    const parts = state.projectParts;
    const partsByProjectId = {};
    for (const p of parts) {
      if (!partsByProjectId[p.projectId]) partsByProjectId[p.projectId] = [];
      partsByProjectId[p.projectId].push(p);
    }

    const articles = this._getFromStorage('articles', []);
    const partsLists = this._getFromStorage('diy_build_parts_lists', []);
    const articlesById = this._indexById(articles);
    const partsListsById = this._indexById(partsLists);

    const overview = state.projects.map(project => {
      const projParts = partsByProjectId[project.id] || [];
      const componentCount = projParts.length;
      const completedComponentCount = projParts.filter(p => p.isPurchased).length;

      const sourceArticle = project.sourceArticleId ? articlesById[project.sourceArticleId] || null : null;
      const sourcePartsList = project.sourcePartsListId ? partsListsById[project.sourcePartsListId] || null : null;

      return {
        project,
        componentCount,
        completedComponentCount,
        sourceArticle,
        sourcePartsList
      };
    });

    overview.sort((a, b) => {
      const da = this._parseDate(a.project.createdAt) || new Date(0);
      const db = this._parseDate(b.project.createdAt) || new Date(0);
      return db - da;
    });

    return overview;
  }

  // getProjectDetail(projectId)
  getProjectDetail(projectId) {
    const state = this._getOrCreateProjectPlannerState();
    const project = state.projects.find(p => p.id === projectId) || null;
    const parts = state.projectParts.filter(pp => pp.projectId === projectId);

    if (!project) {
      return { project: null, parts: [] };
    }

    const articles = this._getFromStorage('articles', []);
    const partsLists = this._getFromStorage('diy_build_parts_lists', []);
    const articlesById = this._indexById(articles);
    const partsListsById = this._indexById(partsLists);

    const sourceArticle = project.sourceArticleId ? articlesById[project.sourceArticleId] || null : null;
    const sourcePartsList = project.sourcePartsListId ? partsListsById[project.sourcePartsListId] || null : null;

    const partsWithProject = parts.map(p => ({
      ...p,
      project,
      sourceArticle,
      sourcePartsList
    }));

    const projectWithSources = { ...project, sourceArticle, sourcePartsList };

    return { project: projectWithSources, parts: partsWithProject };
  }

  // updateProjectMetadata(projectId, name, notes)
  updateProjectMetadata(projectId, name, notes) {
    const state = this._getOrCreateProjectPlannerState();
    let updatedProject = null;
    const updatedProjects = state.projects.map(p => {
      if (p.id !== projectId) return p;
      updatedProject = {
        ...p,
        name: name !== undefined ? name : p.name,
        notes: notes !== undefined ? notes : p.notes,
        updatedAt: this._nowIso()
      };
      return updatedProject;
    });

    this._persistState('projects', updatedProjects);
    return { project: updatedProject };
  }

  // getExampleProtocolsForArticle(articleId)
  getExampleProtocolsForArticle(articleId) {
    const protocols = this._getFromStorage('example_protocols', []);
    const articles = this._getFromStorage('articles', []);
    const articleIndex = this._indexById(articles);

    return protocols
      .filter(p => p.articleId === articleId)
      .map(p => ({
        ...p,
        article: articleIndex[p.articleId] || null
      }));
  }

  // bookmarkProtocol(protocolId, label)
  bookmarkProtocol(protocolId, label) {
    const protocols = this._getFromStorage('example_protocols', []);
    const protocol = protocols.find(p => p.id === protocolId);
    if (!protocol) {
      return { protocolBookmark: null };
    }

    const bookmarks = this._getFromStorage('protocol_bookmarks', []);
    const existing = bookmarks.find(b => b.protocolId === protocolId);
    if (existing) {
      const updated = { ...existing, label: label !== undefined ? label : existing.label };
      const updatedList = bookmarks.map(b => (b.id === existing.id ? updated : b));
      this._saveToStorage('protocol_bookmarks', updatedList);
      return { protocolBookmark: updated };
    }

    const protocolBookmark = {
      id: this._generateId('protbookmark'),
      protocolId,
      articleId: protocol.articleId || null,
      bookmarkedAt: this._nowIso(),
      label: label || null
    };

    bookmarks.push(protocolBookmark);
    this._saveToStorage('protocol_bookmarks', bookmarks);

    return { protocolBookmark };
  }

  // getProtocolBookmarks()
  getProtocolBookmarks() {
    const bookmarks = this._getFromStorage('protocol_bookmarks', []);
    const protocols = this._getFromStorage('example_protocols', []);
    const articles = this._getFromStorage('articles', []);

    const protocolsById = this._indexById(protocols);
    const articlesById = this._indexById(articles);

    return bookmarks
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.bookmarkedAt) || new Date(0);
        const db = this._parseDate(b.bookmarkedAt) || new Date(0);
        return db - da;
      })
      .map(b => ({
        bookmark: b,
        protocol: protocolsById[b.protocolId] || null,
        article: b.articleId ? articlesById[b.articleId] || null : null
      }));
  }

  // removeProtocolBookmark(protocolBookmarkId)
  removeProtocolBookmark(protocolBookmarkId) {
    const bookmarks = this._getFromStorage('protocol_bookmarks', []);
    const beforeLen = bookmarks.length;
    const updated = bookmarks.filter(b => b.id !== protocolBookmarkId);
    this._saveToStorage('protocol_bookmarks', updated);
    const success = updated.length !== beforeLen;
    return { success, message: success ? 'Removed protocol bookmark' : 'Protocol bookmark not found' };
  }

  // getToolsOverview()
  getToolsOverview() {
    return this._getFromStorage('tools', []);
  }

  // getSafetyChecklistFormOptions()
  getSafetyChecklistFormOptions() {
    const stimulationTypes = ['tdcs', 'tacs', 'tms', 'other'];

    // Combine common defaults with any targets from example protocols
    const exampleProtocols = this._getFromStorage('example_protocols', []);
    const targetSet = new Set([
      'Motor cortex (M1)',
      'Dorsolateral prefrontal cortex (DLPFC)'
    ]);
    for (const p of exampleProtocols) {
      if (p && p.targetArea) targetSet.add(p.targetArea);
    }

    const targetAreas = Array.from(targetSet);

    const medicalConditionStatuses = [
      'no_known_neuro_psych_conditions',
      'has_neurological_conditions',
      'has_psychiatric_conditions',
      'other_or_unspecified'
    ];

    const currentIntensityUnits = ['ma', 'ua'];
    const sessionDurationUnits = ['seconds', 'minutes', 'hours'];

    return {
      stimulationTypes,
      targetAreas,
      medicalConditionStatuses,
      currentIntensityUnits,
      sessionDurationUnits
    };
  }

  // generateSafetyChecklist(...)
  generateSafetyChecklist(
    stimulationType,
    currentIntensity,
    currentIntensityUnit,
    sessionDuration,
    sessionDurationUnit,
    targetArea,
    medicalConditionStatus
  ) {
    const configs = this._getFromStorage('safety_checklist_configs', []);
    const checklists = this._getFromStorage('safety_checklists', []);
    const items = this._getFromStorage('safety_checklist_items', []);

    const config = {
      id: this._generateId('safetycfg'),
      stimulationType,
      currentIntensity,
      currentIntensityUnit,
      sessionDuration,
      sessionDurationUnit,
      targetArea,
      medicalConditionStatus,
      createdAt: this._nowIso()
    };
    configs.push(config);

    const checklist = {
      id: this._generateId('safetylist'),
      configId: config.id,
      generatedAt: this._nowIso(),
      itemIds: []
    };
    checklists.push(checklist);

    const generatedItems = [];
    let order = 1;

    const addItem = (text) => {
      const item = {
        id: this._generateId('safetyitem'),
        checklistId: checklist.id,
        order: order++,
        text,
        isCompleted: false
      };
      items.push(item);
      checklist.itemIds.push(item.id);
      generatedItems.push(item);
    };

    addItem('Confirm you have read and understood all site disclaimers and ethics guidelines before proceeding.');
    addItem('Ensure you are not exceeding recommended limits: ' + currentIntensity + ' ' + currentIntensityUnit + ' for ' + sessionDuration + ' ' + sessionDurationUnit + '.');
    addItem('Inspect skin at electrode sites for cuts, irritation, or broken skin before starting. Do not proceed if present.');
    addItem('Verify correct electrode placement for target area: ' + targetArea + '.');
    addItem('Use only properly prepared, well-moistened electrodes to reduce skin irritation.');
    addItem('Remain seated and avoid activities that could increase risk of falls during stimulation.');
    addItem('Have a way to immediately stop stimulation if you experience pain, burning, or severe discomfort.');

    if (stimulationType === 'tdcs') {
      addItem('Double-check polarity (anode vs cathode) and montage for the intended effect over ' + targetArea + '.');
    }

    if (medicalConditionStatus !== 'no_known_neuro_psych_conditions') {
      addItem('Discuss this stimulation plan with a qualified clinician given your medical history before proceeding.');
    } else {
      addItem('Consider consulting a qualified clinician even if you have no known neurological or psychiatric conditions.');
    }

    this._saveToStorage('safety_checklist_configs', configs);
    this._saveToStorage('safety_checklists', checklists);
    this._saveToStorage('safety_checklist_items', items);

    return { config, checklist, items: generatedItems };
  }

  // getSafetyChecklist(checklistId)
  getSafetyChecklist(checklistId) {
    const configs = this._getFromStorage('safety_checklist_configs', []);
    const checklists = this._getFromStorage('safety_checklists', []);
    const items = this._getFromStorage('safety_checklist_items', []);

    const checklist = checklists.find(c => c.id === checklistId) || null;
    if (!checklist) {
      return { config: null, checklist: null, items: [] };
    }

    const config = configs.find(c => c.id === checklist.configId) || null;
    const filteredItems = items
      .filter(i => i.checklistId === checklistId)
      .sort((a, b) => a.order - b.order)
      .map(i => ({ ...i, checklist }));

    const checklistWithConfig = { ...checklist, config };

    return { config, checklist: checklistWithConfig, items: filteredItems };
  }

  // getLearningPathTemplates()
  getLearningPathTemplates() {
    const templates = this._getFromStorage('learning_path_templates', []);
    const articles = this._getFromStorage('articles', []);
    const articlesById = this._indexById(articles);

    return templates.map(t => ({
      ...t,
      articles: Array.isArray(t.articleIds)
        ? t.articleIds.map(id => articlesById[id] || null)
        : []
    }));
  }

  // getLearningPathTemplateDetail(learningPathTemplateId)
  getLearningPathTemplateDetail(learningPathTemplateId) {
    const templates = this._getFromStorage('learning_path_templates', []);
    const articles = this._getFromStorage('articles', []);
    const articlesById = this._indexById(articles);

    const template = templates.find(t => t.id === learningPathTemplateId) || null;
    if (!template) {
      return { template: null, articles: [] };
    }

    const relatedArticles = Array.isArray(template.articleIds)
      ? template.articleIds.map(id => articlesById[id] || null)
      : [];

    return { template, articles: relatedArticles };
  }

  // getUserLearningPlans()
  getUserLearningPlans() {
    return this._getFromStorage('learning_plans', []);
  }

  // getSuggestedArticlesForLearningPlan(theme, difficulty, minReadingTimeMinutes)
  getSuggestedArticlesForLearningPlan(theme, difficulty, minReadingTimeMinutes) {
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('article_categories', []);
    const tags = this._getFromStorage('tags', []);
    const tagsIndex = this._indexTagsByIdAndSlug(tags);
    const categoriesById = this._indexById(categories);

    const t = (theme || '').toLowerCase().trim();

    let results = articles.filter(a => {
      if (difficulty && a.difficulty !== difficulty) return false;
      if (typeof minReadingTimeMinutes === 'number') {
        if (!(typeof a.readingTimeMinutes === 'number' && a.readingTimeMinutes >= minReadingTimeMinutes)) {
          return false;
        }
      }
      if (!t) return true;
      const text = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.content || '')).toLowerCase();
      if (text.indexOf(t) !== -1) return true;
      const atags = Array.isArray(a.tags) ? a.tags : [];
      return atags.some(tag => typeof tag === 'string' && tag.toLowerCase().indexOf(t) !== -1);
    });

    results.sort((a, b) => {
      const ra = typeof a.readingTimeMinutes === 'number' ? a.readingTimeMinutes : 0;
      const rb = typeof b.readingTimeMinutes === 'number' ? b.readingTimeMinutes : 0;
      if (ra !== rb) return ra - rb;
      const da = this._parseDate(a.publicationDate) || new Date(0);
      const db = this._parseDate(b.publicationDate) || new Date(0);
      return db - da;
    });

    return results.map(article => ({
      article,
      category: categoriesById[article.categoryId] || null,
      tags: this._resolveArticleTags(article, tagsIndex)
    }));
  }

  // createLearningPlan(name, theme, difficulty, minReadingTimeMinutes, startDate, totalWeeks, items)
  createLearningPlan(name, theme, difficulty, minReadingTimeMinutes, startDate, totalWeeks, items) {
    const plans = this._getFromStorage('learning_plans', []);
    const planItemsAll = this._getFromStorage('learning_plan_items', []);

    const plan = {
      id: this._generateId('lplan'),
      name: name || (theme + ' (' + difficulty + ')'),
      theme,
      difficulty,
      minReadingTimeMinutes: typeof minReadingTimeMinutes === 'number' ? minReadingTimeMinutes : null,
      startDate: this._parseDate(startDate) ? new Date(startDate).toISOString() : startDate,
      totalWeeks,
      createdAt: this._nowIso()
    };

    plans.push(plan);

    const createdItems = [];
    if (Array.isArray(items)) {
      for (const itm of items) {
        if (!itm || !itm.articleId || !itm.weekNumber) continue;
        const pi = {
          id: this._generateId('lplanitem'),
          learningPlanId: plan.id,
          weekNumber: itm.weekNumber,
          articleId: itm.articleId,
          notes: itm.notes || null
        };
        planItemsAll.push(pi);
        createdItems.push(pi);
      }
    }

    this._saveToStorage('learning_plans', plans);
    this._saveToStorage('learning_plan_items', planItemsAll);

    return { learningPlan: plan, planItems: createdItems };
  }

  // getGlossaryIndex(query, startingLetter)
  getGlossaryIndex(query, startingLetter) {
    const terms = this._getFromStorage('glossary_terms', []);
    const q = (query || '').toLowerCase().trim();
    const letter = startingLetter ? startingLetter.toLowerCase() : null;

    const termsById = this._indexById(terms);

    let results = terms.filter(t => {
      if (q) {
        const text = ((t.term || '') + ' ' + (t.definition || '') + ' ' + (t.details || '')).toLowerCase();
        if (text.indexOf(q) === -1) return false;
      }
      if (letter) {
        const first = (t.term || '').trim().charAt(0).toLowerCase();
        if (first !== letter) return false;
      }
      return true;
    });

    results = results.map(t => ({
      ...t,
      relatedTerms: Array.isArray(t.relatedTermIds)
        ? t.relatedTermIds.map(id => termsById[id] || null).filter(x => x !== null)
        : []
    }));

    results.sort((a, b) => {
      const ta = (a.term || '').toLowerCase();
      const tb = (b.term || '').toLowerCase();
      // Prefer terms whose main term text contains the query string, if provided
      if (q) {
        const aMatch = ta.indexOf(q) !== -1;
        const bMatch = tb.indexOf(q) !== -1;
        if (aMatch !== bMatch) {
          return aMatch ? -1 : 1;
        }
      }
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return 0;
    });

    return results;
  }

  // getGlossaryTermBySlug(slug)
  getGlossaryTermBySlug(slug) {
    const terms = this._getFromStorage('glossary_terms', []);
    const termsById = this._indexById(terms);

    const term = terms.find(t => t.slug === slug) || null;
    if (!term) {
      return { term: null, relatedTerms: [] };
    }

    const relatedTerms = Array.isArray(term.relatedTermIds)
      ? term.relatedTermIds.map(id => termsById[id] || null).filter(x => x !== null)
      : [];

    return { term, relatedTerms };
  }

  // addTermToMyGlossary(termId, notes)
  addTermToMyGlossary(termId, notes) {
    const terms = this._getFromStorage('glossary_terms', []);
    const term = terms.find(t => t.id === termId);
    if (!term) {
      return { myGlossaryItem: null };
    }

    const state = this._getOrCreateMyGlossaryState();
    const existing = state.myGlossaryItems.find(i => i.termId === termId);
    if (existing) {
      const updated = { ...existing, notes: notes !== undefined ? notes : existing.notes };
      const updatedList = state.myGlossaryItems.map(i => (i.id === existing.id ? updated : i));
      this._persistState('my_glossary_items', updatedList);
      return { myGlossaryItem: updated };
    }

    const myGlossaryItem = {
      id: this._generateId('myg'),
      termId,
      addedAt: this._nowIso(),
      notes: notes || null
    };

    state.myGlossaryItems.push(myGlossaryItem);
    this._persistState('my_glossary_items', state.myGlossaryItems);

    return { myGlossaryItem };
  }

  // getMyGlossaryItems()
  getMyGlossaryItems() {
    const state = this._getOrCreateMyGlossaryState();
    const terms = this._getFromStorage('glossary_terms', []);
    const termsById = this._indexById(terms);

    return state.myGlossaryItems.map(i => ({
      myGlossaryItem: i,
      term: termsById[i.termId] || null
    }));
  }

  // removeMyGlossaryItem(myGlossaryItemId)
  removeMyGlossaryItem(myGlossaryItemId) {
    const state = this._getOrCreateMyGlossaryState();
    const beforeLen = state.myGlossaryItems.length;
    const updated = state.myGlossaryItems.filter(i => i.id !== myGlossaryItemId);
    this._persistState('my_glossary_items', updated);
    const success = updated.length !== beforeLen;
    return { success, message: success ? 'Removed glossary item' : 'Glossary item not found' };
  }

  // getNewsletterPreferences()
  getNewsletterPreferences() {
    const { subscriptions } = this._getOrCreateNewsletterSubscriptionState();
    // Single-user: pick the latest active subscription, or latest if none active
    let subscription = null;
    const active = subscriptions.filter(s => s && s.isActive);
    if (active.length > 0) {
      subscription = active[active.length - 1];
    } else if (subscriptions.length > 0) {
      subscription = subscriptions[subscriptions.length - 1];
    }

    const availableTopics = [
      { id: 'safety_updates', label: 'Safety updates' },
      { id: 'research_summaries', label: 'Research summaries' },
      { id: 'diy_hardware', label: 'DIY hardware & build guides' },
      { id: 'site_updates', label: 'Site updates & announcements' }
    ];

    return { subscription, availableTopics };
  }

  // updateNewsletterSubscription(email, topics, frequency, format, isActive)
  updateNewsletterSubscription(email, topics, frequency, format, isActive) {
    if (!email) {
      return { subscription: null, message: 'Email is required' };
    }
    if (!Array.isArray(topics) || topics.length === 0) {
      return { subscription: null, message: 'At least one topic must be selected' };
    }

    const allowedFrequencies = ['daily', 'weekly', 'monthly'];
    const allowedFormats = ['html', 'plain_text'];
    if (allowedFrequencies.indexOf(frequency) === -1) {
      return { subscription: null, message: 'Invalid frequency' };
    }
    if (allowedFormats.indexOf(format) === -1) {
      return { subscription: null, message: 'Invalid format' };
    }

    const { subscriptions } = this._getOrCreateNewsletterSubscriptionState();

    const activeFlag = typeof isActive === 'boolean' ? isActive : true;

    let subscription = null;
    const updatedSubscriptions = subscriptions.map(s => {
      if (s.email === email) {
        subscription = {
          ...s,
          email,
          topics,
          frequency,
          format,
          isActive: activeFlag
        };
        return subscription;
      }
      return s;
    });

    if (!subscription) {
      subscription = {
        id: this._generateId('nls'),
        email,
        topics,
        frequency,
        format,
        createdAt: this._nowIso(),
        isActive: activeFlag
      };
      updatedSubscriptions.push(subscription);
    }

    this._persistState('newsletter_subscriptions', updatedSubscriptions);

    const message = activeFlag ? 'Subscription updated' : 'Subscription updated (inactive)';
    return { subscription, message };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (!raw) {
      return {
        mission: '',
        focus: '',
        contributors: [],
        reviewPractices: '',
        contentSources: ''
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        mission: obj.mission || '',
        focus: obj.focus || '',
        contributors: Array.isArray(obj.contributors) ? obj.contributors : [],
        reviewPractices: obj.reviewPractices || '',
        contentSources: obj.contentSources || ''
      };
    } catch (e) {
      return {
        mission: '',
        focus: '',
        contributors: [],
        reviewPractices: '',
        contentSources: ''
      };
    }
  }

  // getContactPageInfo()
  getContactPageInfo() {
    const raw = localStorage.getItem('contact_page_info');
    if (!raw) {
      return {
        contactEmail: '',
        supportLinks: []
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        contactEmail: obj.contactEmail || '',
        supportLinks: Array.isArray(obj.supportLinks) ? obj.supportLinks : []
      };
    } catch (e) {
      return {
        contactEmail: '',
        supportLinks: []
      };
    }
  }

  // submitContactForm(name, email, category, subject, message)
  submitContactForm(name, email, category, subject, message) {
    if (!name || !email || !subject || !message) {
      return { success: false, message: 'Name, email, subject, and message are required' };
    }

    const msgs = this._getFromStorage('contact_messages', []);
    const newMsg = {
      id: this._generateId('contactmsg'),
      name,
      email,
      category: category || null,
      subject,
      message,
      createdAt: this._nowIso()
    };
    msgs.push(newMsg);
    this._saveToStorage('contact_messages', msgs);

    return { success: true, message: 'Your message has been submitted.' };
  }

  // getDisclaimerEthicsContent()
  getDisclaimerEthicsContent() {
    const raw = localStorage.getItem('disclaimer_ethics_content');
    if (!raw) {
      return {
        legalDisclaimer: '',
        ethicalConsiderations: '',
        safetyPrinciples: '',
        dataAndContentPolicies: ''
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        legalDisclaimer: obj.legalDisclaimer || '',
        ethicalConsiderations: obj.ethicalConsiderations || '',
        safetyPrinciples: obj.safetyPrinciples || '',
        dataAndContentPolicies: obj.dataAndContentPolicies || ''
      };
    } catch (e) {
      return {
        legalDisclaimer: '',
        ethicalConsiderations: '',
        safetyPrinciples: '',
        dataAndContentPolicies: ''
      };
    }
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