/*
  BusinessLogic for film-focused fan community wiki
  - Pure business logic
  - Data persisted in localStorage (or in-memory polyfill in Node)
*/

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

  // =========================
  // Storage helpers
  // =========================

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tables = [
      'articles',
      'films',
      'categories',
      'article_categories',
      'persons',
      'film_credits',
      'talk_pages',
      'talk_comments',
      'polls',
      'poll_options',
      'poll_votes',
      'watchlists',
      'watchlist_items',
      'internal_links',
      'article_revisions',
      'recentlyVisitedArticleIds'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
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

  _slugify(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  _parseDateToISO(dateStr) {
    if (!dateStr) return null;
    const timestamp = Date.parse(dateStr);
    if (isNaN(timestamp)) return null;
    return new Date(timestamp).toISOString();
  }

  _trackRecentlyVisitedArticle(articleId) {
    if (!articleId) return;
    let ids = this._getFromStorage('recentlyVisitedArticleIds', []);
    if (!Array.isArray(ids)) ids = [];
    ids = ids.filter(function (id) { return id !== articleId; });
    ids.push(articleId);
    const maxItems = 20;
    if (ids.length > maxItems) {
      ids = ids.slice(ids.length - maxItems);
    }
    this._saveToStorage('recentlyVisitedArticleIds', ids);
  }

  // =========================
  // Internal helpers for entities
  // =========================

  _getOrCreateWatchlist() {
    let watchlists = this._getFromStorage('watchlists', []);
    const now = new Date().toISOString();
    if (!Array.isArray(watchlists)) watchlists = [];
    if (watchlists.length > 0) {
      return watchlists[0];
    }
    const watchlist = {
      id: this._generateId('wlist'),
      createdAt: now,
      updatedAt: now
    };
    watchlists.push(watchlist);
    this._saveToStorage('watchlists', watchlists);
    return watchlist;
  }

  _updateWatchlistCache(watchlist) {
    if (!watchlist) return;
    const items = this._getFromStorage('watchlist_items', []);
    const count = items.filter(function (it) { return it.watchlistId === watchlist.id; }).length;
    const cache = {
      watchlistId: watchlist.id,
      totalItems: count,
      updatedAt: watchlist.updatedAt
    };
    this._saveToStorage('watchlistCache', cache);
  }

  _getOrCreateTalkPageForArticle(articleId) {
    if (!articleId) return null;
    let talkPages = this._getFromStorage('talk_pages', []);
    if (!Array.isArray(talkPages)) talkPages = [];
    let talkPage = null;
    for (let i = 0; i < talkPages.length; i++) {
      if (talkPages[i].articleId === articleId) {
        talkPage = talkPages[i];
        break;
      }
    }
    if (talkPage) return talkPage;

    const articles = this._getFromStorage('articles', []);
    let articleTitle = articleId;
    for (let j = 0; j < articles.length; j++) {
      if (articles[j].id === articleId) {
        articleTitle = articles[j].title;
        break;
      }
    }

    const now = new Date().toISOString();
    talkPage = {
      id: this._generateId('talk'),
      articleId: articleId,
      title: 'Talk: ' + articleTitle,
      createdAt: now,
      updatedAt: now
    };
    talkPages.push(talkPage);
    this._saveToStorage('talk_pages', talkPages);
    return talkPage;
  }

  _buildTalkCommentsTree(talkPageId) {
    const commentsAll = this._getFromStorage('talk_comments', []);
    if (!Array.isArray(commentsAll)) return [];
    const comments = commentsAll.filter(function (c) { return c.talkPageId === talkPageId; });

    const map = {};
    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      map[c.id] = { comment: c, replies: [] };
    }
    const roots = [];
    for (let j = 0; j < comments.length; j++) {
      const c = comments[j];
      if (c.parentCommentId && map[c.parentCommentId]) {
        map[c.parentCommentId].replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    }
    return roots;
  }

  _recordPollVote(pollId, pollOptionId) {
    const polls = this._getFromStorage('polls', []);
    const pollOptions = this._getFromStorage('poll_options', []);
    let poll = null;
    for (let i = 0; i < polls.length; i++) {
      if (polls[i].id === pollId) {
        poll = polls[i];
        break;
      }
    }
    if (!poll) {
      return { success: false, message: 'Poll not found', updatedPoll: null };
    }
    if (poll.status !== 'open') {
      return { success: false, message: 'Poll is closed', updatedPoll: null };
    }

    let option = null;
    for (let j = 0; j < pollOptions.length; j++) {
      if (pollOptions[j].id === pollOptionId && pollOptions[j].pollId === pollId) {
        option = pollOptions[j];
        break;
      }
    }
    if (!option) {
      return { success: false, message: 'Poll option not found', updatedPoll: null };
    }

    let pollVotes = this._getFromStorage('poll_votes', []);
    if (!Array.isArray(pollVotes)) pollVotes = [];

    let existingVote = null;
    for (let k = 0; k < pollVotes.length; k++) {
      if (pollVotes[k].pollId === pollId) {
        existingVote = pollVotes[k];
        break;
      }
    }

    const now = new Date().toISOString();

    if (existingVote) {
      if (existingVote.pollOptionId === pollOptionId) {
        // No change; already voted for this option
      } else {
        // Decrement old option count
        for (let m = 0; m < pollOptions.length; m++) {
          if (pollOptions[m].id === existingVote.pollOptionId) {
            if (typeof pollOptions[m].voteCount === 'number' && pollOptions[m].voteCount > 0) {
              pollOptions[m].voteCount -= 1;
            }
            break;
          }
        }
        // Update vote
        existingVote.pollOptionId = pollOptionId;
        // Increment new option
        if (typeof option.voteCount !== 'number') option.voteCount = 0;
        option.voteCount += 1;
      }
    } else {
      const newVote = {
        id: this._generateId('pVote'),
        pollId: pollId,
        pollOptionId: pollOptionId,
        createdAt: now
      };
      pollVotes.push(newVote);
      if (typeof option.voteCount !== 'number') option.voteCount = 0;
      option.voteCount += 1;
    }

    this._saveToStorage('poll_votes', pollVotes);
    this._saveToStorage('poll_options', pollOptions);

    const optionsForPoll = [];
    for (let n = 0; n < pollOptions.length; n++) {
      if (pollOptions[n].pollId === pollId) {
        optionsForPoll.push(pollOptions[n]);
      }
    }

    return {
      success: true,
      message: 'Vote recorded',
      updatedPoll: {
        poll: poll,
        options: optionsForPoll,
        userChoiceOptionId: pollOptionId
      }
    };
  }

  _createOrUpdateArticleAndRelated(params) {
    const articleIdInput = params.articleId;
    const title = params.title;
    const type = params.type;
    const leadSummaryText = params.leadSummaryText;
    let content = params.content;
    if (type === 'list' && typeof content === 'string') {
      if (title && content.indexOf(title) === -1) {
        content = content + '\n\n' + title;
      }
    }
    const categoriesInput = params.categories;
    const isRedirect = !!params.isRedirect;
    const redirectTargetArticleId = params.redirectTargetArticleId || null;
    const filmMetadata = params.filmMetadata || null;
    const editSummary = params.editSummary || '';

    const now = new Date().toISOString();

    let articles = this._getFromStorage('articles', []);
    let films = this._getFromStorage('films', []);
    let article = null;
    let created = false;

    if (articleIdInput) {
      for (let i = 0; i < articles.length; i++) {
        if (articles[i].id === articleIdInput) {
          article = articles[i];
          break;
        }
      }
    }

    if (!article) {
      created = true;
      const newId = this._generateId('art');
      article = {
        id: newId,
        title: title,
        slug: this._slugify(title),
        type: type,
        filmId: null,
        isRedirect: isRedirect,
        redirectTargetArticleId: isRedirect ? redirectTargetArticleId : null,
        summary: leadSummaryText || '',
        content: content || '',
        createdAt: now,
        updatedAt: now,
        lastRevisionId: null
      };
      articles.push(article);
    } else {
      article.title = title;
      article.slug = this._slugify(title);
      article.type = type;
      article.isRedirect = isRedirect;
      article.redirectTargetArticleId = isRedirect ? redirectTargetArticleId : null;
      article.summary = leadSummaryText || '';
      article.content = content || '';
      article.updatedAt = now;
    }

    let film = null;
    if (type === 'film' && !isRedirect) {
      if (article.filmId) {
        for (let j = 0; j < films.length; j++) {
          if (films[j].id === article.filmId) {
            film = films[j];
            break;
          }
        }
      }
      if (!film) {
        for (let k = 0; k < films.length; k++) {
          if (films[k].articleId === article.id) {
            film = films[k];
            break;
          }
        }
      }
      if (!film) {
        const newFilmId = this._generateId('film');
        film = {
          id: newFilmId,
          articleId: article.id,
          title: (filmMetadata && filmMetadata.title) ? filmMetadata.title : title,
          year: (filmMetadata && typeof filmMetadata.year === 'number') ? filmMetadata.year : null,
          releaseDate: filmMetadata && filmMetadata.releaseDate ? this._parseDateToISO(filmMetadata.releaseDate) : null,
          country: filmMetadata && filmMetadata.country ? filmMetadata.country : null,
          language: filmMetadata && filmMetadata.language ? filmMetadata.language : null,
          runningTimeMinutes: filmMetadata && typeof filmMetadata.runningTimeMinutes === 'number' ? filmMetadata.runningTimeMinutes : 0,
          runningTimeText: filmMetadata && filmMetadata.runningTimeText ? filmMetadata.runningTimeText : '',
          genres: (filmMetadata && Array.isArray(filmMetadata.genres)) ? filmMetadata.genres.slice() : [],
          userRatingAverage: 0,
          userRatingCount: 0,
          createdAt: now,
          updatedAt: now
        };
        films.push(film);
      } else {
        if (filmMetadata && filmMetadata.title) {
          film.title = filmMetadata.title;
        } else if (!film.title) {
          film.title = title;
        }
        if (filmMetadata && typeof filmMetadata.year === 'number') {
          film.year = filmMetadata.year;
        }
        if (filmMetadata && filmMetadata.releaseDate) {
          const iso = this._parseDateToISO(filmMetadata.releaseDate);
          if (iso) film.releaseDate = iso;
        }
        if (filmMetadata && filmMetadata.country) {
          film.country = filmMetadata.country;
        }
        if (filmMetadata && filmMetadata.language) {
          film.language = filmMetadata.language;
        }
        if (filmMetadata && typeof filmMetadata.runningTimeMinutes === 'number') {
          film.runningTimeMinutes = filmMetadata.runningTimeMinutes;
        }
        if (filmMetadata && filmMetadata.runningTimeText) {
          film.runningTimeText = filmMetadata.runningTimeText;
        }
        if (filmMetadata && Array.isArray(filmMetadata.genres)) {
          film.genres = filmMetadata.genres.slice();
        }
        film.articleId = article.id;
        film.updatedAt = now;
        if (!film.createdAt) film.createdAt = now;
      }
      article.filmId = film.id;
    }

    // Categories
    let articleCategories = this._getFromStorage('article_categories', []);
    if (!Array.isArray(articleCategories)) articleCategories = [];
    articleCategories = articleCategories.filter(function (ac) { return ac.articleId !== article.id; });

    let categories = this._getFromStorage('categories', []);
    if (!Array.isArray(categories)) categories = [];
    if (Array.isArray(categoriesInput)) {
      for (let c = 0; c < categoriesInput.length; c++) {
        const nameRaw = categoriesInput[c];
        if (!nameRaw) continue;
        const name = String(nameRaw).trim();
        if (!name) continue;
        let category = null;
        for (let d = 0; d < categories.length; d++) {
          if (categories[d].name === name) {
            category = categories[d];
            break;
          }
        }
        if (!category) {
          category = {
            id: this._generateId('cat'),
            name: name,
            description: '',
            group: 'films',
            createdAt: now
          };
          categories.push(category);
        }
        const acRecord = {
          id: this._generateId('ac'),
          articleId: article.id,
          categoryId: category.id
        };
        articleCategories.push(acRecord);
      }
    }

    // Revision
    let revisions = this._getFromStorage('article_revisions', []);
    if (!Array.isArray(revisions)) revisions = [];
    const revision = {
      id: this._generateId('rev'),
      articleId: article.id,
      summary: editSummary,
      contentSnapshot: article.content,
      createdAt: now
    };
    revisions.push(revision);
    article.lastRevisionId = revision.id;

    // Persist entities
    this._saveToStorage('articles', articles);
    this._saveToStorage('films', films);
    this._saveToStorage('categories', categories);
    this._saveToStorage('article_categories', articleCategories);
    this._saveToStorage('article_revisions', revisions);

    // Internal links
    this._parseArticleContentForInternalLinks(article);

    return {
      article: article,
      film: film,
      revision: revision,
      created: created
    };
  }

  _parseArticleContentForInternalLinks(article) {
    if (!article || !article.id) return;
    const allArticles = this._getFromStorage('articles', []);
    let internalLinks = this._getFromStorage('internal_links', []);
    if (!Array.isArray(internalLinks)) internalLinks = [];

    // Remove existing links from this article
    internalLinks = internalLinks.filter(function (link) { return link.fromArticleId !== article.id; });

    const content = article.content || '';
    const lines = content.split('\n');

    function findArticleByTitle(title) {
      if (!title) return null;
      for (let i = 0; i < allArticles.length; i++) {
        if (allArticles[i].title === title) {
          return allArticles[i];
        }
      }
      return null;
    }

    const self = this;
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^={2,6}\s*(.+?)\s*=+\s*$/);
      if (headingMatch) {
        currentSection = headingMatch[1].trim();
      }
      const isBullet = /^\s*[\*\-]\s+/.test(line);

      const linkRegex = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;
      let match;
      while ((match = linkRegex.exec(line)) !== null) {
        const targetTitleRaw = match[1];
        const labelRaw = match[3] || null;
        const targetTitle = targetTitleRaw ? targetTitleRaw.trim() : '';
        const label = labelRaw ? labelRaw.trim() : null;
        const targetArticle = findArticleByTitle(targetTitle);
        if (!targetArticle) continue;

        let context = 'other';
        const sectionLower = currentSection ? currentSection.toLowerCase() : '';
        if (sectionLower === 'see also') {
          context = 'see_also';
        } else if (sectionLower === 'favorite performances') {
          context = 'favorite_performance';
        } else if (article.type === 'list' && isBullet) {
          context = 'list_item';
        } else if (article.type === 'template' && article.title === 'Template:Nightfall Trilogy') {
          context = 'navigation_template_link';
        }

        internalLinks.push({
          id: self._generateId('link'),
          fromArticleId: article.id,
          toArticleId: targetArticle.id,
          context: context,
          label: label,
          position: null
        });
      }
    }

    // Template inclusions: {{Template:Nightfall Trilogy}} or {{Nightfall Trilogy}}
    const templateRegex = /{{\s*([^}|]+)[^}]*}}/g;
    let tMatch;
    while ((tMatch = templateRegex.exec(content)) !== null) {
      let templateTitle = tMatch[1] ? tMatch[1].trim() : '';
      if (!templateTitle) continue;
      if (!/^Template:/i.test(templateTitle)) {
        templateTitle = 'Template:' + templateTitle;
      }
      const tArticle = findArticleByTitle(templateTitle);
      if (!tArticle) continue;
      internalLinks.push({
        id: this._generateId('link'),
        fromArticleId: article.id,
        toArticleId: tArticle.id,
        context: 'template_usage',
        label: null,
        position: null
      });
    }

    this._saveToStorage('internal_links', internalLinks);
  }

  // =========================
  // Core interface implementations
  // =========================

  // --- searchArticles(query, typeFilter) ---
  searchArticles(query, typeFilter) {
    const q = (query || '').trim();
    const qLower = q.toLowerCase();
    const articles = this._getFromStorage('articles', []);

    let filtered = [];
    if (q) {
      for (let i = 0; i < articles.length; i++) {
        const a = articles[i];
        if (typeFilter && a.type !== typeFilter) continue;
        const titleLower = (a.title || '').toLowerCase();
        const summaryLower = (a.summary || '').toLowerCase();
        const contentLower = (a.content || '').toLowerCase();
        if (titleLower.indexOf(qLower) !== -1 || summaryLower.indexOf(qLower) !== -1 || contentLower.indexOf(qLower) !== -1) {
          filtered.push(a);
        }
      }
    } else {
      filtered = typeFilter ? articles.filter(function (a) { return a.type === typeFilter; }) : articles.slice();
    }

    const results = [];
    for (let j = 0; j < filtered.length; j++) {
      const a = filtered[j];
      let snippetSource = a.summary || a.content || '';
      let snippet = snippetSource.substring(0, 200);
      const targetArticleId = a.redirectTargetArticleId || null;
      let targetArticle = null;
      if (targetArticleId) {
        for (let k = 0; k < articles.length; k++) {
          if (articles[k].id === targetArticleId) {
            targetArticle = articles[k];
            break;
          }
        }
      }
      results.push({
        articleId: a.id,
        title: a.title,
        type: a.type,
        snippet: snippet,
        isRedirect: !!a.isRedirect,
        redirectTargetArticleId: a.redirectTargetArticleId || null,
        redirectTargetTitle: targetArticle ? targetArticle.title : null
      });
    }

    let exactMatchArticle = null;
    for (let m = 0; m < articles.length; m++) {
      if (articles[m].title === q) {
        if (!typeFilter || articles[m].type === typeFilter) {
          exactMatchArticle = articles[m];
          break;
        }
      }
    }

    const exactMatch = {
      exists: !!exactMatchArticle,
      articleId: exactMatchArticle ? exactMatchArticle.id : null,
      canCreate: !exactMatchArticle && !!q,
      suggestedTitle: q || ''
    };

    return {
      query: q,
      results: results,
      exactMatch: exactMatch
    };
  }

  // --- getHomeOverview() ---
  getHomeOverview() {
    const films = this._getFromStorage('films', []);
    const articles = this._getFromStorage('articles', []);

    // Featured films: top 5 by userRatingAverage
    const filmsCopy = films.slice();
    filmsCopy.sort(function (a, b) {
      const ra = typeof a.userRatingAverage === 'number' ? a.userRatingAverage : 0;
      const rb = typeof b.userRatingAverage === 'number' ? b.userRatingAverage : 0;
      return rb - ra;
    });
    const featuredFilms = [];
    const maxFeatured = 5;
    for (let i = 0; i < filmsCopy.length && featuredFilms.length < maxFeatured; i++) {
      const f = filmsCopy[i];
      let art = null;
      for (let j = 0; j < articles.length; j++) {
        if (articles[j].id === f.articleId) {
          art = articles[j];
          break;
        }
      }
      featuredFilms.push({ film: f, article: art });
    }

    // Recently visited articles
    let recentIds = this._getFromStorage('recentlyVisitedArticleIds', []);
    if (!Array.isArray(recentIds)) recentIds = [];
    const recentlyVisitedArticles = [];
    for (let k = recentIds.length - 1; k >= 0; k--) {
      const id = recentIds[k];
      let art = null;
      for (let r = 0; r < articles.length; r++) {
        if (articles[r].id === id) {
          art = articles[r];
          break;
        }
      }
      if (art) {
        recentlyVisitedArticles.push({ article: art });
      }
      if (recentlyVisitedArticles.length >= 10) break;
    }

    // Available film genres
    const genreSet = {};
    for (let g = 0; g < films.length; g++) {
      const f = films[g];
      if (Array.isArray(f.genres)) {
        for (let h = 0; h < f.genres.length; h++) {
          const gn = f.genres[h];
          if (gn) genreSet[gn] = true;
        }
      }
    }
    const availableFilmGenres = Object.keys(genreSet).sort();

    // Available film years
    const yearSet = {};
    for (let y = 0; y < films.length; y++) {
      const yr = films[y].year;
      if (typeof yr === 'number') yearSet[yr] = true;
    }
    const availableFilmYears = Object.keys(yearSet).map(function (v) { return parseInt(v, 10); }).sort(function (a, b) { return a - b; });

    return {
      featuredFilms: featuredFilms,
      recentlyVisitedArticles: recentlyVisitedArticles,
      availableFilmGenres: availableFilmGenres,
      availableFilmYears: availableFilmYears
    };
  }

  // --- getFilmBrowseFilters() ---
  getFilmBrowseFilters() {
    const films = this._getFromStorage('films', []);

    const genreSet = {};
    let minYear = null;
    let maxYear = null;
    let minRuntime = null;
    let maxRuntime = null;

    for (let i = 0; i < films.length; i++) {
      const f = films[i];
      if (Array.isArray(f.genres)) {
        for (let j = 0; j < f.genres.length; j++) {
          const gn = f.genres[j];
          if (gn) genreSet[gn] = true;
        }
      }
      if (typeof f.year === 'number') {
        if (minYear === null || f.year < minYear) minYear = f.year;
        if (maxYear === null || f.year > maxYear) maxYear = f.year;
      }
      if (typeof f.runningTimeMinutes === 'number') {
        const rt = f.runningTimeMinutes;
        if (minRuntime === null || rt < minRuntime) minRuntime = rt;
        if (maxRuntime === null || rt > maxRuntime) maxRuntime = rt;
      }
    }

    const genres = Object.keys(genreSet).sort().map((name) => ({ id: this._slugify(name), name: name }));

    const yearRange = {
      minYear: minYear,
      maxYear: maxYear
    };

    const ratingRange = {
      min: 0,
      max: 5,
      step: 0.1
    };

    const runtimeRange = {
      min: minRuntime !== null ? minRuntime : 0,
      max: maxRuntime !== null ? maxRuntime : 300,
      step: 5
    };

    const sortOptions = [
      { id: 'rating_desc', label: 'User rating: High to Low' },
      { id: 'rating_asc', label: 'User rating: Low to High' },
      { id: 'year_desc', label: 'Year: Newest first' },
      { id: 'year_asc', label: 'Year: Oldest first' },
      { id: 'title_asc', label: 'Title: A to Z' }
    ];

    return {
      genres: genres,
      yearRange: yearRange,
      ratingRange: ratingRange,
      runtimeRange: runtimeRange,
      sortOptions: sortOptions
    };
  }

  // --- browseFilms(filters, sortBy) ---
  browseFilms(filters, sortBy) {
    const films = this._getFromStorage('films', []);
    const articles = this._getFromStorage('articles', []);

    const filtersSafe = filters || {};
    const genreFilter = filtersSafe.genre || null;
    const yearFrom = typeof filtersSafe.yearFrom === 'number' ? filtersSafe.yearFrom : null;
    const yearTo = typeof filtersSafe.yearTo === 'number' ? filtersSafe.yearTo : null;
    const minRuntimeMinutes = typeof filtersSafe.minRuntimeMinutes === 'number' ? filtersSafe.minRuntimeMinutes : null;
    const maxRuntimeMinutes = typeof filtersSafe.maxRuntimeMinutes === 'number' ? filtersSafe.maxRuntimeMinutes : null;
    const minUserRating = typeof filtersSafe.minUserRating === 'number' ? filtersSafe.minUserRating : null;
    const maxUserRating = typeof filtersSafe.maxUserRating === 'number' ? filtersSafe.maxUserRating : null;

    const articleMap = {};
    for (let a = 0; a < articles.length; a++) {
      articleMap[articles[a].id] = articles[a];
    }

    const filtered = [];
    for (let i = 0; i < films.length; i++) {
      const f = films[i];
      if (genreFilter && (!Array.isArray(f.genres) || f.genres.indexOf(genreFilter) === -1)) continue;
      if (yearFrom !== null && (typeof f.year !== 'number' || f.year < yearFrom)) continue;
      if (yearTo !== null && (typeof f.year !== 'number' || f.year > yearTo)) continue;
      if (minRuntimeMinutes !== null && (typeof f.runningTimeMinutes !== 'number' || f.runningTimeMinutes < minRuntimeMinutes)) continue;
      if (maxRuntimeMinutes !== null && (typeof f.runningTimeMinutes !== 'number' || f.runningTimeMinutes > maxRuntimeMinutes)) continue;
      if (minUserRating !== null) {
        const rating = typeof f.userRatingAverage === 'number' ? f.userRatingAverage : 0;
        if (rating < minUserRating) continue;
      }
      if (maxUserRating !== null) {
        const rating = typeof f.userRatingAverage === 'number' ? f.userRatingAverage : 0;
        if (rating > maxUserRating) continue;
      }
      filtered.push(f);
    }

    const sortKey = sortBy || 'title_asc';
    filtered.sort(function (a, b) {
      const ratingA = typeof a.userRatingAverage === 'number' ? a.userRatingAverage : 0;
      const ratingB = typeof b.userRatingAverage === 'number' ? b.userRatingAverage : 0;
      const yearA = typeof a.year === 'number' ? a.year : 0;
      const yearB = typeof b.year === 'number' ? b.year : 0;
      const artA = articleMap[a.articleId];
      const artB = articleMap[b.articleId];
      const titleA = artA ? (artA.title || '') : (a.title || '');
      const titleB = artB ? (artB.title || '') : (b.title || '');

      switch (sortKey) {
        case 'rating_desc':
          return ratingB - ratingA;
        case 'rating_asc':
          return ratingA - ratingB;
        case 'year_desc':
          return yearB - yearA;
        case 'year_asc':
          return yearA - yearB;
        case 'title_asc':
        default:
          if (titleA < titleB) return -1;
          if (titleA > titleB) return 1;
          return 0;
      }
    });

    const result = [];
    for (let j = 0; j < filtered.length; j++) {
      const f = filtered[j];
      result.push({
        film: f,
        article: articleMap[f.articleId] || null
      });
    }

    return result;
  }

  // --- getArticleDetail(articleId) ---
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const films = this._getFromStorage('films', []);
    const categories = this._getFromStorage('categories', []);
    const articleCategories = this._getFromStorage('article_categories', []);

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
        film: { data: null, exists: false },
        categories: [],
        isRedirect: false,
        redirectTargetArticle: null,
        watchlist: null
      };
    }

    this._trackRecentlyVisitedArticle(articleId);

    // Film
    let filmData = null;
    if (article.type === 'film') {
      if (article.filmId) {
        for (let j = 0; j < films.length; j++) {
          if (films[j].id === article.filmId) {
            filmData = films[j];
            break;
          }
        }
      }
      // Fallback: locate film by articleId when filmId is missing or outdated
      if (!filmData) {
        for (let j = 0; j < films.length; j++) {
          if (films[j].articleId === article.id) {
            filmData = films[j];
            break;
          }
        }
      }
    }

    const filmWrapper = {
      data: filmData,
      exists: !!filmData
    };

    // Categories
    const articleCats = [];
    for (let k = 0; k < articleCategories.length; k++) {
      const ac = articleCategories[k];
      if (ac.articleId === article.id) {
        let cat = null;
        for (let c = 0; c < categories.length; c++) {
          if (categories[c].id === ac.categoryId) {
            cat = categories[c];
            break;
          }
        }
        if (cat) {
          articleCats.push({ category: cat });
        }
      }
    }

    // Redirect target
    let redirectTargetArticle = null;
    if (article.isRedirect && article.redirectTargetArticleId) {
      for (let r = 0; r < articles.length; r++) {
        if (articles[r].id === article.redirectTargetArticleId) {
          redirectTargetArticle = { article: articles[r] };
          break;
        }
      }
    }

    // Watchlist state (for film articles only)
    let watchlistInfo = null;
    if (article.type === 'film' && filmData) {
      const watchlist = this._getOrCreateWatchlist();
      const watchlistItems = this._getFromStorage('watchlist_items', []);
      let isWatchlisted = false;
      for (let w = 0; w < watchlistItems.length; w++) {
        if (watchlistItems[w].watchlistId === watchlist.id && watchlistItems[w].filmId === filmData.id) {
          isWatchlisted = true;
          break;
        }
      }
      watchlistInfo = { isWatchlisted: isWatchlisted };
    }

    return {
      article: article,
      film: filmWrapper,
      categories: articleCats,
      isRedirect: !!article.isRedirect,
      redirectTargetArticle: redirectTargetArticle,
      watchlist: watchlistInfo
    };
  }

  // --- getNewArticleEditContext(title, type) ---
  getNewArticleEditContext(title, type) {
    const draftArticle = {
      title: title,
      type: type,
      leadSummaryText: '',
      content: '',
      categories: [],
      isRedirect: false
    };

    const templateOptions = [];
    let filmTemplateSchema = null;

    if (type === 'film') {
      templateOptions.push({
        name: 'Film',
        description: 'Standard film template with infobox and metadata fields.'
      });
      filmTemplateSchema = {
        fields: [
          { name: 'title', label: 'Title', type: 'string', required: true },
          { name: 'director', label: 'Director', type: 'string', required: false },
          { name: 'releaseDate', label: 'Release date', type: 'string', required: false },
          { name: 'country', label: 'Country', type: 'string', required: false },
          { name: 'language', label: 'Language', type: 'string', required: false },
          { name: 'runningTimeMinutes', label: 'Running time (minutes)', type: 'number', required: false },
          { name: 'runningTimeText', label: 'Running time text', type: 'string', required: false },
          { name: 'genres', label: 'Genres', type: 'array', required: false }
        ]
      };
    }

    const suggestedEditSummary = 'Create ' + type + ' page';

    return {
      draftArticle: draftArticle,
      templateOptions: templateOptions,
      filmTemplateSchema: filmTemplateSchema,
      suggestedEditSummary: suggestedEditSummary
    };
  }

  // --- getArticleEditContext(articleId) ---
  getArticleEditContext(articleId) {
    const articles = this._getFromStorage('articles', []);
    const films = this._getFromStorage('films', []);
    const articleCategories = this._getFromStorage('article_categories', []);
    const categories = this._getFromStorage('categories', []);

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
        categories: [],
        isRedirect: false,
        redirectTargetArticleId: null,
        filmTemplateData: null
      };
    }

    const categoryNames = [];
    for (let j = 0; j < articleCategories.length; j++) {
      const ac = articleCategories[j];
      if (ac.articleId === article.id) {
        for (let k = 0; k < categories.length; k++) {
          if (categories[k].id === ac.categoryId) {
            categoryNames.push(categories[k].name);
            break;
          }
        }
      }
    }

    let filmTemplateData = null;
    if (article.type === 'film' && article.filmId) {
      let film = null;
      for (let f = 0; f < films.length; f++) {
        if (films[f].id === article.filmId) {
          film = films[f];
          break;
        }
      }
      if (film) {
        filmTemplateData = {
          title: film.title,
          director: null,
          releaseDate: film.releaseDate,
          country: film.country,
          language: film.language,
          runningTimeMinutes: film.runningTimeMinutes,
          runningTimeText: film.runningTimeText,
          genres: Array.isArray(film.genres) ? film.genres.slice() : []
        };
      }
    }

    return {
      article: article,
      categories: categoryNames,
      isRedirect: !!article.isRedirect,
      redirectTargetArticleId: article.redirectTargetArticleId || null,
      filmTemplateData: filmTemplateData
    };
  }

  // --- saveArticleEdit(...) ---
  // articleId may be null/undefined for create
  // signature uses positional arguments only
  saveArticleEdit(articleId, title, type, leadSummaryText, content, categories, isRedirect, redirectTargetArticleId, filmMetadata, editSummary) {
    try {
      const result = this._createOrUpdateArticleAndRelated({
        articleId: articleId,
        title: title,
        type: type,
        leadSummaryText: leadSummaryText,
        content: content,
        categories: categories,
        isRedirect: isRedirect,
        redirectTargetArticleId: redirectTargetArticleId,
        filmMetadata: filmMetadata,
        editSummary: editSummary
      });

      return {
        success: true,
        created: result.created,
        article: result.article,
        film: {
          data: result.film || null,
          exists: !!result.film
        },
        revision: result.revision,
        message: 'Article ' + (result.created ? 'created' : 'updated') + ' successfully.'
      };
    } catch (e) {
      return {
        success: false,
        created: false,
        article: null,
        film: { data: null, exists: false },
        revision: null,
        message: e && e.message ? e.message : 'Error saving article.'
      };
    }
  }

  // --- getTalkPageForArticle(articleId) ---
  getTalkPageForArticle(articleId) {
    const talkPage = this._getOrCreateTalkPageForArticle(articleId);
    if (!talkPage) {
      return {
        talkPage: null,
        polls: [],
        commentsTree: []
      };
    }

    const pollsAll = this._getFromStorage('polls', []);
    const pollOptionsAll = this._getFromStorage('poll_options', []);

    const polls = [];
    for (let i = 0; i < pollsAll.length; i++) {
      const poll = pollsAll[i];
      if (poll.talkPageId === talkPage.id) {
        const options = [];
        for (let j = 0; j < pollOptionsAll.length; j++) {
          const opt = pollOptionsAll[j];
          if (opt.pollId === poll.id) {
            options.push(opt);
          }
        }
        polls.push({ poll: poll, options: options });
      }
    }

    const commentsTree = this._buildTalkCommentsTree(talkPage.id);

    return {
      talkPage: talkPage,
      polls: polls,
      commentsTree: commentsTree
    };
  }

  // --- submitPollVote(pollId, pollOptionId) ---
  submitPollVote(pollId, pollOptionId) {
    const result = this._recordPollVote(pollId, pollOptionId);
    return result;
  }

  // --- createTalkComment(talkPageId, heading, body, parentCommentId) ---
  createTalkComment(talkPageId, heading, body, parentCommentId) {
    const talkPages = this._getFromStorage('talk_pages', []);
    let talkPage = null;
    for (let i = 0; i < talkPages.length; i++) {
      if (talkPages[i].id === talkPageId) {
        talkPage = talkPages[i];
        break;
      }
    }
    if (!talkPage) {
      return { success: false, message: 'Talk page not found', comment: null };
    }

    const now = new Date().toISOString();
    let talkComments = this._getFromStorage('talk_comments', []);
    if (!Array.isArray(talkComments)) talkComments = [];
    const comment = {
      id: this._generateId('tComment'),
      talkPageId: talkPageId,
      parentCommentId: parentCommentId || null,
      heading: heading || null,
      body: body,
      createdAt: now
    };
    talkComments.push(comment);
    this._saveToStorage('talk_comments', talkComments);

    // Update talkPage.updatedAt
    talkPage.updatedAt = now;
    this._saveToStorage('talk_pages', talkPages);

    return {
      success: true,
      message: 'Comment posted',
      comment: comment
    };
  }

  // --- getCurrentUserProfile() ---
  getCurrentUserProfile() {
    const articles = this._getFromStorage('articles', []);
    let profileArticle = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].type === 'user_profile') {
        profileArticle = articles[i];
        break;
      }
    }

    // Lazily create a default user profile article if none exists yet
    if (!profileArticle) {
      const now = new Date().toISOString();
      profileArticle = {
        id: this._generateId('art'),
        title: 'User profile',
        slug: this._slugify('User profile'),
        type: 'user_profile',
        filmId: null,
        isRedirect: false,
        redirectTargetArticleId: null,
        summary: '',
        content: '',
        createdAt: now,
        updatedAt: now,
        lastRevisionId: null
      };
      articles.push(profileArticle);
      this._saveToStorage('articles', articles);
    }

    if (profileArticle) {
      this._trackRecentlyVisitedArticle(profileArticle.id);
    }

    return {
      profileArticle: profileArticle
    };
  }

  // --- getFilmographyEntries(personId, filters, sortBy) ---
  getFilmographyEntries(personId, filters, sortBy) {
    const persons = this._getFromStorage('persons', []);
    const filmCredits = this._getFromStorage('film_credits', []);
    const films = this._getFromStorage('films', []);
    const articles = this._getFromStorage('articles', []);

    let person = null;
    for (let i = 0; i < persons.length; i++) {
      if (persons[i].id === personId) {
        person = persons[i];
        break;
      }
    }

    const filtersSafe = filters || {};
    const roleTypes = Array.isArray(filtersSafe.roleTypes) ? filtersSafe.roleTypes : null;
    const minUserRating = typeof filtersSafe.minUserRating === 'number' ? filtersSafe.minUserRating : null;

    const filmMap = {};
    for (let f = 0; f < films.length; f++) {
      filmMap[films[f].id] = films[f];
    }
    const articleMap = {};
    for (let a = 0; a < articles.length; a++) {
      articleMap[articles[a].id] = articles[a];
    }

    const entries = [];
    for (let j = 0; j < filmCredits.length; j++) {
      const fc = filmCredits[j];
      if (fc.personId !== personId) continue;
      if (roleTypes && roleTypes.length > 0 && roleTypes.indexOf(fc.roleType) === -1) continue;
      const film = filmMap[fc.filmId] || null;
      if (!film) continue;
      if (minUserRating !== null) {
        const rating = typeof film.userRatingAverage === 'number' ? film.userRatingAverage : 0;
        if (rating < minUserRating) continue;
      }
      const article = film.articleId ? (articleMap[film.articleId] || null) : null;
      entries.push({
        film: film,
        article: article,
        roleType: fc.roleType,
        characterName: fc.characterName || null,
        billingOrder: typeof fc.billingOrder === 'number' ? fc.billingOrder : null
      });
    }

    const sortKey = sortBy || 'year_desc';
    entries.sort(function (a, b) {
      const filmA = a.film;
      const filmB = b.film;
      const ratingA = typeof filmA.userRatingAverage === 'number' ? filmA.userRatingAverage : 0;
      const ratingB = typeof filmB.userRatingAverage === 'number' ? filmB.userRatingAverage : 0;
      const yearA = typeof filmA.year === 'number' ? filmA.year : 0;
      const yearB = typeof filmB.year === 'number' ? filmB.year : 0;
      const titleA = a.article ? (a.article.title || '') : (filmA.title || '');
      const titleB = b.article ? (b.article.title || '') : (filmB.title || '');

      switch (sortKey) {
        case 'rating_desc':
          return ratingB - ratingA;
        case 'rating_asc':
          return ratingA - ratingB;
        case 'year_desc':
          return yearB - yearA;
        case 'year_asc':
          return yearA - yearB;
        case 'title_asc':
          if (titleA < titleB) return -1;
          if (titleA > titleB) return 1;
          return 0;
        default:
          return 0;
      }
    });

    return {
      person: person,
      entries: entries
    };
  }

  // --- addFilmToWatchlist(filmId) ---
  addFilmToWatchlist(filmId) {
    const films = this._getFromStorage('films', []);
    let film = null;
    for (let i = 0; i < films.length; i++) {
      if (films[i].id === filmId) {
        film = films[i];
        break;
      }
    }
    if (!film) {
      return { success: false, message: 'Film not found', watchlistItem: null, totalItems: 0 };
    }

    const watchlist = this._getOrCreateWatchlist();
    let watchlists = this._getFromStorage('watchlists', []);
    if (!Array.isArray(watchlists)) watchlists = [];
    let watchlistItems = this._getFromStorage('watchlist_items', []);
    if (!Array.isArray(watchlistItems)) watchlistItems = [];

    for (let j = 0; j < watchlistItems.length; j++) {
      if (watchlistItems[j].watchlistId === watchlist.id && watchlistItems[j].filmId === filmId) {
        const totalExisting = watchlistItems.filter(function (it) { return it.watchlistId === watchlist.id; }).length;
        return {
          success: true,
          message: 'Film already in watchlist',
          watchlistItem: watchlistItems[j],
          totalItems: totalExisting
        };
      }
    }

    const now = new Date().toISOString();
    const item = {
      id: this._generateId('wItem'),
      watchlistId: watchlist.id,
      filmId: filmId,
      addedAt: now
    };
    watchlistItems.push(item);

    // Update watchlist updatedAt
    watchlist.updatedAt = now;
    for (let w = 0; w < watchlists.length; w++) {
      if (watchlists[w].id === watchlist.id) {
        watchlists[w] = watchlist;
        break;
      }
    }

    this._saveToStorage('watchlist_items', watchlistItems);
    this._saveToStorage('watchlists', watchlists);
    this._updateWatchlistCache(watchlist);

    const totalItems = watchlistItems.filter(function (it) { return it.watchlistId === watchlist.id; }).length;

    return {
      success: true,
      message: 'Film added to watchlist',
      watchlistItem: item,
      totalItems: totalItems
    };
  }

  // --- removeFilmFromWatchlist(filmId) ---
  removeFilmFromWatchlist(filmId) {
    const watchlist = this._getOrCreateWatchlist();
    let watchlists = this._getFromStorage('watchlists', []);
    if (!Array.isArray(watchlists)) watchlists = [];
    let watchlistItems = this._getFromStorage('watchlist_items', []);
    if (!Array.isArray(watchlistItems)) watchlistItems = [];

    let changed = false;
    const newItems = [];
    for (let i = 0; i < watchlistItems.length; i++) {
      const it = watchlistItems[i];
      if (it.watchlistId === watchlist.id && it.filmId === filmId) {
        changed = true;
        continue;
      }
      newItems.push(it);
    }

    if (changed) {
      const now = new Date().toISOString();
      watchlist.updatedAt = now;
      for (let w = 0; w < watchlists.length; w++) {
        if (watchlists[w].id === watchlist.id) {
          watchlists[w] = watchlist;
          break;
        }
      }
      this._saveToStorage('watchlist_items', newItems);
      this._saveToStorage('watchlists', watchlists);
      this._updateWatchlistCache(watchlist);
      watchlistItems = newItems;
    }

    const totalItems = watchlistItems.filter(function (it) { return it.watchlistId === watchlist.id; }).length;

    return {
      success: true,
      message: changed ? 'Film removed from watchlist' : 'Film was not in watchlist',
      totalItems: totalItems
    };
  }

  // --- getWatchlistItems() ---
  getWatchlistItems() {
    const watchlist = this._getOrCreateWatchlist();
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const films = this._getFromStorage('films', []);
    const articles = this._getFromStorage('articles', []);

    const filmMap = {};
    for (let f = 0; f < films.length; f++) {
      filmMap[films[f].id] = films[f];
    }
    const articleMap = {};
    for (let a = 0; a < articles.length; a++) {
      articleMap[articles[a].id] = articles[a];
    }

    const items = [];
    for (let i = 0; i < watchlistItems.length; i++) {
      const it = watchlistItems[i];
      if (it.watchlistId !== watchlist.id) continue;
      const film = filmMap[it.filmId] || null;
      const article = film && film.articleId ? (articleMap[film.articleId] || null) : null;
      items.push({
        watchlistItem: it,
        film: film,
        article: article
      });
    }

    return {
      watchlist: watchlist,
      items: items
    };
  }

  // --- getCategoryView(categoryId, sortBy) ---
  getCategoryView(categoryId, sortBy) {
    const categories = this._getFromStorage('categories', []);
    const articleCategories = this._getFromStorage('article_categories', []);
    const articles = this._getFromStorage('articles', []);
    const films = this._getFromStorage('films', []);

    let category = null;
    for (let c = 0; c < categories.length; c++) {
      if (categories[c].id === categoryId) {
        category = categories[c];
        break;
      }
    }

    if (!category) {
      return { category: null, entries: [] };
    }

    const articleMap = {};
    for (let a = 0; a < articles.length; a++) {
      articleMap[articles[a].id] = articles[a];
    }
    const filmMap = {};
    for (let f = 0; f < films.length; f++) {
      filmMap[films[f].id] = films[f];
    }

    const entries = [];
    for (let i = 0; i < articleCategories.length; i++) {
      const ac = articleCategories[i];
      if (ac.categoryId !== categoryId) continue;
      const article = articleMap[ac.articleId] || null;
      let filmWrapper = { data: null, exists: false };
      if (article && article.type === 'film' && article.filmId) {
        const film = filmMap[article.filmId] || null;
        if (film) {
          filmWrapper = { data: film, exists: true };
        }
      }
      entries.push({
        article: article,
        film: filmWrapper
      });
    }

    const sortKey = sortBy || 'title_asc';
    entries.sort(function (a, b) {
      const articleA = a.article;
      const articleB = b.article;
      const titleA = articleA ? (articleA.title || '') : '';
      const titleB = articleB ? (articleB.title || '') : '';
      const filmA = a.film && a.film.data ? a.film.data : null;
      const filmB = b.film && b.film.data ? b.film.data : null;
      const yearA = filmA && typeof filmA.year === 'number' ? filmA.year : 0;
      const yearB = filmB && typeof filmB.year === 'number' ? filmB.year : 0;
      const ratingA = filmA && typeof filmA.userRatingAverage === 'number' ? filmA.userRatingAverage : 0;
      const ratingB = filmB && typeof filmB.userRatingAverage === 'number' ? filmB.userRatingAverage : 0;

      switch (sortKey) {
        case 'title_desc':
          if (titleA < titleB) return 1;
          if (titleA > titleB) return -1;
          return 0;
        case 'year_desc':
          return yearB - yearA;
        case 'year_asc':
          return yearA - yearB;
        case 'rating_desc':
          return ratingB - ratingA;
        case 'rating_asc':
          return ratingA - ratingB;
        case 'title_asc':
        default:
          if (titleA < titleB) return -1;
          if (titleA > titleB) return 1;
          return 0;
      }
    });

    return {
      category: category,
      entries: entries
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
