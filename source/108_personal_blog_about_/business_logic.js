// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

  // ----------------------------
  // Storage helpers
  // ----------------------------

  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    ensureArrayKey('articles');
    ensureArrayKey('tags');
    ensureArrayKey('comments');
    ensureArrayKey('reading_list_items');
    ensureArrayKey('favorite_articles');
    ensureArrayKey('photos');
    ensureArrayKey('favorite_photos');
    ensureArrayKey('polls');
    ensureArrayKey('poll_options');
    ensureArrayKey('poll_votes');
    ensureArrayKey('newsletter_subscriptions');
    ensureArrayKey('contact_messages');

    // About content is a single object
    if (!localStorage.getItem('about_content')) {
      const about = {
        title: '',
        body_html: '',
        hero_image_url: '',
        last_updated: ''
      };
      localStorage.setItem('about_content', JSON.stringify(about));
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
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
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

  // ----------------------------
  // Private helper functions
  // ----------------------------

  _getOrCreateReadingListStore() {
    const items = this._getFromStorage('reading_list_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('reading_list_items', []);
      return [];
    }
    return items;
  }

  _getOrCreateFavoriteArticlesStore() {
    const items = this._getFromStorage('favorite_articles', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('favorite_articles', []);
      return [];
    }
    return items;
  }

  _getOrCreateFavoritePhotosStore() {
    const items = this._getFromStorage('favorite_photos', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('favorite_photos', []);
      return [];
    }
    return items;
  }

  _persistSingleUserState() {
    // Re-save the main single-user state collections to ensure they exist and are persisted
    const readingList = this._getOrCreateReadingListStore();
    const favoriteArticles = this._getOrCreateFavoriteArticlesStore();
    const favoritePhotos = this._getOrCreateFavoritePhotosStore();
    const pollVotes = this._getFromStorage('poll_votes', []);

    this._saveToStorage('reading_list_items', readingList);
    this._saveToStorage('favorite_articles', favoriteArticles);
    this._saveToStorage('favorite_photos', favoritePhotos);
    this._saveToStorage('poll_votes', pollVotes);
  }

  _getCategoryName(categoryId) {
    const map = {
      training: 'Training',
      health: 'Health',
      competitions: 'Competitions',
      gear: 'Gear'
    };
    return map[categoryId] || categoryId || '';
  }

  _getPhotoCategoryLabel(categoryId) {
    const map = {
      competitions: 'Competitions',
      training: 'Training',
      portraits: 'Portraits',
      stable_life: 'Stable life'
    };
    return map[categoryId] || categoryId || '';
  }

  _paginateArray(items, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 10;
    const start = (p - 1) * ps;
    return items.slice(start, start + ps);
  }

  _getArticleYear(article) {
    if (!article || !article.published_at) return null;
    const d = new Date(article.published_at);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear();
  }

  _resolveArticleTags(article, allTags) {
    if (!article || !Array.isArray(article.tagIds) || !Array.isArray(allTags)) return [];
    const tagIdSet = new Set(article.tagIds);
    return allTags.filter(function (t) { return tagIdSet.has(t.id); });
  }

  _isArticleInReadingList(articleId, readingList) {
    return readingList.some(function (item) { return item.articleId === articleId; });
  }

  _isArticleFavorited(articleId, favoriteArticles) {
    return favoriteArticles.some(function (item) { return item.articleId === articleId; });
  }

  _isPhotoFavorited(photoId, favoritePhotos) {
    return favoritePhotos.some(function (item) { return item.photoId === photoId; });
  }

  _sortArticlesByPublishedAt(articles, sortOrder) {
    const order = sortOrder || 'newest_first';
    return articles.slice().sort(function (a, b) {
      const da = new Date(a.published_at || 0).getTime();
      const db = new Date(b.published_at || 0).getTime();
      if (order === 'oldest_first') {
        return da - db;
      }
      return db - da;
    });
  }

  _sortReadingListItems(items, sortBy) {
    const sortKey = sortBy || 'added_at_desc';
    return items.slice().sort(function (aObj, bObj) {
      const aItem = aObj.reading_list_item;
      const bItem = bObj.reading_list_item;
      const aArt = aObj.article || {};
      const bArt = bObj.article || {};

      if (sortKey === 'added_at_asc') {
        return new Date(aItem.added_at || 0) - new Date(bItem.added_at || 0);
      }
      if (sortKey === 'published_at_desc') {
        return new Date(bArt.published_at || 0) - new Date(aArt.published_at || 0);
      }
      if (sortKey === 'published_at_asc') {
        return new Date(aArt.published_at || 0) - new Date(bArt.published_at || 0);
      }
      // default added_at_desc
      return new Date(bItem.added_at || 0) - new Date(aItem.added_at || 0);
    });
  }

  // ----------------------------
  // Core interface implementations
  // ----------------------------

  // getHomepageContent()
  getHomepageContent() {
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);
    const readingList = this._getOrCreateReadingListStore();
    const favoriteArticles = this._getOrCreateFavoriteArticlesStore();

    const featuredArticlesRaw = articles.filter(function (a) { return !!a.is_featured; });

    const featured_articles = featuredArticlesRaw.map(function (article) {
      const categoryName = this._getCategoryName(article.category);
      const articleTags = this._resolveArticleTags(article, tags);
      const isInReadingList = this._isArticleInReadingList(article.id, readingList);
      const isFavorited = this._isArticleFavorited(article.id, favoriteArticles);
      return {
        article: article,
        category_name: categoryName,
        tags: articleTags,
        is_in_reading_list: isInReadingList,
        is_favorited: isFavorited
      };
    }.bind(this));

    const categories = ['training', 'health', 'competitions', 'gear'];
    const latest_by_category = categories.map(function (catId) {
      const catArticlesAll = articles.filter(function (a) { return a.category === catId; });
      const sorted = this._sortArticlesByPublishedAt(catArticlesAll, 'newest_first');
      const limited = sorted.slice(0, 10); // arbitrary limit
      const items = limited.map(function (article) {
        const categoryName = this._getCategoryName(article.category);
        const articleTags = this._resolveArticleTags(article, tags);
        const isInReadingList = this._isArticleInReadingList(article.id, readingList);
        const isFavorited = this._isArticleFavorited(article.id, favoriteArticles);
        return {
          article: article,
          tags: articleTags,
          is_in_reading_list: isInReadingList,
          is_favorited: isFavorited
        };
      }.bind(this));
      return {
        category_id: catId,
        category_name: this._getCategoryName(catId),
        articles: items
      };
    }.bind(this));

    return {
      featured_articles: featured_articles,
      latest_by_category: latest_by_category
    };
  }

  // searchArticles(query, category, page, pageSize)
  searchArticles(query, category, page, pageSize) {
    const q = (query || '').toString().trim().toLowerCase();
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);
    const readingList = this._getOrCreateReadingListStore();
    const favoriteArticles = this._getOrCreateFavoriteArticlesStore();

    let filtered = articles;
    if (category) {
      filtered = filtered.filter(function (a) { return a.category === category; });
    }
    if (q) {
      filtered = filtered.filter(function (a) {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        return title.indexOf(q) !== -1 || summary.indexOf(q) !== -1 || content.indexOf(q) !== -1;
      });
    }

    const sorted = this._sortArticlesByPublishedAt(filtered, 'newest_first');
    const total_results = sorted.length;
    const paged = this._paginateArray(sorted, page || 1, pageSize || 10);

    const results = paged.map(function (article) {
      const categoryName = this._getCategoryName(article.category);
      const articleTags = this._resolveArticleTags(article, tags);
      const isInReadingList = this._isArticleInReadingList(article.id, readingList);
      const isFavorited = this._isArticleFavorited(article.id, favoriteArticles);
      return {
        article: article,
        category_name: categoryName,
        tags: articleTags,
        is_in_reading_list: isInReadingList,
        is_favorited: isFavorited
      };
    }.bind(this));

    return {
      query: query,
      total_results: total_results,
      page: page || 1,
      page_size: pageSize || 10,
      results: results
    };
  }

  // getArticleFilterOptions(categoryId)
  getArticleFilterOptions(categoryId) {
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);

    const categoryArticles = articles.filter(function (a) { return a.category === categoryId; });

    const tagIdSet = new Set();
    categoryArticles.forEach(function (a) {
      if (Array.isArray(a.tagIds)) {
        a.tagIds.forEach(function (tid) { tagIdSet.add(tid); });
      }
    });

    const tag_filters = tags.filter(function (t) { return tagIdSet.has(t.id); });

    const yearSet = new Set();
    categoryArticles.forEach(function (a) {
      const year = this._getArticleYear(a);
      if (year) yearSet.add(year);
    }.bind(this));

    const yearsArr = Array.from(yearSet).sort(function (a, b) { return b - a; });
    const year_filters = yearsArr.map(function (year) {
      return {
        year: year,
        label: String(year),
        has_articles: true
      };
    });

    const sort_options = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' }
    ];

    return {
      category_id: categoryId,
      category_name: this._getCategoryName(categoryId),
      tag_filters: tag_filters,
      year_filters: year_filters,
      sort_options: sort_options
    };
  }

  // getArticlesForCategory(categoryId, filterTagId, filterYear, sortOrder, page, pageSize)
  getArticlesForCategory(categoryId, filterTagId, filterYear, sortOrder, page, pageSize) {
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);
    const readingList = this._getOrCreateReadingListStore();
    const favoriteArticles = this._getOrCreateFavoriteArticlesStore();

    let filtered = articles.filter(function (a) { return a.category === categoryId; });

    let appliedTagName = null;
    if (filterTagId) {
      filtered = filtered.filter(function (a) {
        return Array.isArray(a.tagIds) && a.tagIds.indexOf(filterTagId) !== -1;
      });
      const tagObj = tags.find(function (t) { return t.id === filterTagId; });
      appliedTagName = tagObj ? tagObj.name : null;
    }

    let yearNum = filterYear || null;
    if (filterYear) {
      filtered = filtered.filter(function (a) {
        const y = this._getArticleYear(a);
        return y === filterYear;
      }.bind(this));
    }

    const sorted = this._sortArticlesByPublishedAt(filtered, sortOrder || 'newest_first');
    const total_results = sorted.length;
    const p = page || 1;
    const ps = pageSize || 10;
    const paged = this._paginateArray(sorted, p, ps);

    const articlesOut = paged.map(function (article) {
      const categoryName = this._getCategoryName(article.category);
      const articleTags = this._resolveArticleTags(article, tags);
      const publishedYear = this._getArticleYear(article);
      const isInReadingList = this._isArticleInReadingList(article.id, readingList);
      const isFavorited = this._isArticleFavorited(article.id, favoriteArticles);
      return {
        article: article,
        category_name: categoryName,
        tags: articleTags,
        published_year: publishedYear,
        is_in_reading_list: isInReadingList,
        is_favorited: isFavorited
      };
    }.bind(this));

    return {
      category_id: categoryId,
      category_name: this._getCategoryName(categoryId),
      applied_filters: {
        tag_id: filterTagId || null,
        tag_name: appliedTagName,
        year: yearNum,
        sort_order: sortOrder || 'newest_first'
      },
      page: p,
      page_size: ps,
      total_results: total_results,
      articles: articlesOut
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);
    const commentsAll = this._getFromStorage('comments', []);
    const polls = this._getFromStorage('polls', []);
    const pollOptionsAll = this._getFromStorage('poll_options', []);
    const pollVotesAll = this._getFromStorage('poll_votes', []);
    const readingList = this._getOrCreateReadingListStore();
    const favoriteArticles = this._getOrCreateFavoriteArticlesStore();

    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    const categoryName = article ? this._getCategoryName(article.category) : '';
    const articleTags = this._resolveArticleTags(article, tags);

    const breadcrumbs = [];
    breadcrumbs.push({ label: 'Home', type: 'home' });
    if (article) {
      breadcrumbs.push({ label: categoryName, type: 'category' });
      if (articleTags.length > 0) {
        breadcrumbs.push({ label: articleTags[0].name, type: 'tag' });
      }
      breadcrumbs.push({ label: article.title, type: 'article' });
    }

    const isInReadingList = article ? this._isArticleInReadingList(article.id, readingList) : false;
    const isFavorited = article ? this._isArticleFavorited(article.id, favoriteArticles) : false;

    const commentsForArticle = commentsAll.filter(function (c) { return c.articleId === articleId; });
    const resolvedComments = commentsForArticle.map(function (c) {
      return Object.assign({}, c, { article: article || null });
    });

    // For simplicity, associate the first active poll with the article (if any)
    let pollRecord = polls.find(function (p) { return p.is_active; }) || null;
    let pollData = null;
    if (pollRecord) {
      const options = pollOptionsAll.filter(function (o) { return o.pollId === pollRecord.id; });
      const votes = pollVotesAll.filter(function (v) { return v.pollId === pollRecord.id; });
      const totalVotes = options.reduce(function (sum, o) {
        const count = typeof o.vote_count === 'number' ? o.vote_count : 0;
        return sum + count;
      }, 0);
      const userHasVoted = votes.length > 0;
      const userSelectedOptionId = userHasVoted ? votes[votes.length - 1].optionId : null;

      pollData = {
        poll: pollRecord,
        options: options,
        is_active: !!pollRecord.is_active,
        user_has_voted: userHasVoted,
        user_selected_option_id: userSelectedOptionId,
        total_votes: totalVotes
      };
    }

    return {
      article: article,
      category_name: categoryName,
      tags: articleTags,
      breadcrumbs: breadcrumbs,
      is_in_reading_list: isInReadingList,
      is_favorited: isFavorited,
      comments: resolvedComments,
      poll: pollData
    };
  }

  // saveArticleToReadingList(articleId)
  saveArticleToReadingList(articleId) {
    const readingList = this._getOrCreateReadingListStore();

    let existing = readingList.find(function (item) { return item.articleId === articleId; });
    if (existing) {
      // idempotent
      this._saveToStorage('reading_list_items', readingList);
      this._persistSingleUserState();
      return {
        success: true,
        message: 'Article is already in the reading list.',
        reading_list_item: existing,
        total_items: readingList.length
      };
    }

    const newItem = {
      id: this._generateId('rli'),
      articleId: articleId,
      added_at: new Date().toISOString()
    };
    readingList.push(newItem);
    this._saveToStorage('reading_list_items', readingList);
    this._persistSingleUserState();

    return {
      success: true,
      message: 'Article added to reading list.',
      reading_list_item: newItem,
      total_items: readingList.length
    };
  }

  // removeArticleFromReadingList(articleId)
  removeArticleFromReadingList(articleId) {
    const readingList = this._getOrCreateReadingListStore();
    const originalLength = readingList.length;
    const newList = readingList.filter(function (item) { return item.articleId !== articleId; });
    this._saveToStorage('reading_list_items', newList);
    this._persistSingleUserState();

    const removed = newList.length < originalLength;

    return {
      success: true,
      message: removed ? 'Article removed from reading list.' : 'Article was not in reading list.',
      total_items: newList.length
    };
  }

  // addArticleToFavorites(articleId)
  addArticleToFavorites(articleId) {
    const favorites = this._getOrCreateFavoriteArticlesStore();

    let existing = favorites.find(function (item) { return item.articleId === articleId; });
    if (existing) {
      this._saveToStorage('favorite_articles', favorites);
      this._persistSingleUserState();
      return {
        success: true,
        message: 'Article is already in favorites.',
        favorite: existing,
        total_favorites: favorites.length
      };
    }

    const newFav = {
      id: this._generateId('fav_art'),
      articleId: articleId,
      added_at: new Date().toISOString()
    };
    favorites.push(newFav);
    this._saveToStorage('favorite_articles', favorites);
    this._persistSingleUserState();

    return {
      success: true,
      message: 'Article added to favorites.',
      favorite: newFav,
      total_favorites: favorites.length
    };
  }

  // removeArticleFromFavorites(articleId)
  removeArticleFromFavorites(articleId) {
    const favorites = this._getOrCreateFavoriteArticlesStore();
    const originalLength = favorites.length;
    const newFavs = favorites.filter(function (item) { return item.articleId !== articleId; });
    this._saveToStorage('favorite_articles', newFavs);
    this._persistSingleUserState();

    const removed = newFavs.length < originalLength;

    return {
      success: true,
      message: removed ? 'Article removed from favorites.' : 'Article was not in favorites.',
      total_favorites: newFavs.length
    };
  }

  // submitArticleComment(articleId, author_name, author_email, body)
  submitArticleComment(articleId, author_name, author_email, body) {
    const commentsAll = this._getFromStorage('comments', []);
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(function (a) { return a.id === articleId; }) || null;

    const comment = {
      id: this._generateId('cmt'),
      articleId: articleId,
      author_name: author_name,
      author_email: author_email,
      body: body,
      created_at: new Date().toISOString(),
      is_approved: true
    };

    commentsAll.push(comment);
    this._saveToStorage('comments', commentsAll);

    const commentsForArticle = commentsAll.filter(function (c) { return c.articleId === articleId; });
    const resolvedComments = commentsForArticle.map(function (c) {
      return Object.assign({}, c, { article: article });
    });

    const returnedComment = Object.assign({}, comment, { article: article });

    return {
      success: true,
      message: 'Comment submitted.',
      comment: returnedComment,
      comments: resolvedComments
    };
  }

  // submitPollVote(pollId, optionId)
  submitPollVote(pollId, optionId) {
    const polls = this._getFromStorage('polls', []);
    const pollOptionsAll = this._getFromStorage('poll_options', []);
    const pollVotesAll = this._getFromStorage('poll_votes', []);

    const poll = polls.find(function (p) { return p.id === pollId; }) || null;
    if (!poll) {
      return {
        success: false,
        message: 'Poll not found.',
        poll: null,
        options: [],
        total_votes: 0,
        user_selected_option_id: null
      };
    }

    if (!poll.is_active) {
      const optionsInactive = pollOptionsAll.filter(function (o) { return o.pollId === pollId; });
      const totalInactive = optionsInactive.reduce(function (sum, o) {
        const count = typeof o.vote_count === 'number' ? o.vote_count : 0;
        return sum + count;
      }, 0);
      return {
        success: false,
        message: 'Poll is not active.',
        poll: poll,
        options: optionsInactive,
        total_votes: totalInactive,
        user_selected_option_id: null
      };
    }

    const option = pollOptionsAll.find(function (o) { return o.id === optionId && o.pollId === pollId; }) || null;
    if (!option) {
      const optionsForPollOnly = pollOptionsAll.filter(function (o) { return o.pollId === pollId; });
      const totalVotesOnly = optionsForPollOnly.reduce(function (sum, o) {
        const count = typeof o.vote_count === 'number' ? o.vote_count : 0;
        return sum + count;
      }, 0);
      return {
        success: false,
        message: 'Poll option not found for this poll.',
        poll: poll,
        options: optionsForPollOnly,
        total_votes: totalVotesOnly,
        user_selected_option_id: null
      };
    }

    const updatedPollOptions = pollOptionsAll.map(function (o) {
      if (o.id === optionId && o.pollId === pollId) {
        const currentCount = typeof o.vote_count === 'number' ? o.vote_count : 0;
        return Object.assign({}, o, { vote_count: currentCount + 1 });
      }
      return o;
    });

    const vote = {
      id: this._generateId('vote'),
      pollId: pollId,
      optionId: optionId,
      created_at: new Date().toISOString()
    };
    pollVotesAll.push(vote);

    this._saveToStorage('poll_options', updatedPollOptions);
    this._saveToStorage('poll_votes', pollVotesAll);
    this._persistSingleUserState();

    const optionsForPoll = updatedPollOptions.filter(function (o) { return o.pollId === pollId; });
    const totalVotes = optionsForPoll.reduce(function (sum, o) {
      const count = typeof o.vote_count === 'number' ? o.vote_count : 0;
      return sum + count;
    }, 0);

    return {
      success: true,
      message: 'Vote submitted.',
      poll: poll,
      options: optionsForPoll,
      total_votes: totalVotes,
      user_selected_option_id: optionId
    };
  }

  // getReadingListItems(groupBy, sortBy)
  getReadingListItems(groupBy, sortBy) {
    const readingList = this._getOrCreateReadingListStore();
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);

    const items = readingList.map(function (rli) {
      const article = articles.find(function (a) { return a.id === rli.articleId; }) || null;
      const categoryName = article ? this._getCategoryName(article.category) : '';
      const articleTags = this._resolveArticleTags(article, tags);
      return {
        reading_list_item: rli,
        article: article,
        category_name: categoryName,
        tags: articleTags
      };
    }.bind(this));

    const sortedItems = this._sortReadingListItems(items, sortBy || 'added_at_desc');

    const groupMode = groupBy || 'none';
    let groups = [];
    if (groupMode === 'category') {
      const mapByCat = {};
      sortedItems.forEach(function (itemObj) {
        const article = itemObj.article;
        const catId = article ? article.category : 'uncategorized';
        const catName = article ? this._getCategoryName(article.category) : 'Uncategorized';
        if (!mapByCat[catId]) {
          mapByCat[catId] = {
            category_id: catId,
            category_name: catName,
            items: []
          };
        }
        mapByCat[catId].items.push({
          reading_list_item: itemObj.reading_list_item,
          article: itemObj.article,
          tags: itemObj.tags
        });
      }.bind(this));
      groups = Object.keys(mapByCat).map(function (key) { return mapByCat[key]; });
    }

    // Instrumentation for task completion tracking
    try {
      if (groupBy === 'category') {
        localStorage.setItem('task5_readingListGroupedByCategory', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      group_by: groupMode,
      sort_by: sortBy || 'added_at_desc',
      total_items: readingList.length,
      items: groupMode === 'none' ? sortedItems : [],
      groups: groupMode === 'category' ? groups : []
    };
  }

  // getFavoritesOverview()
  getFavoritesOverview() {
    const favoriteArticles = this._getOrCreateFavoriteArticlesStore();
    const favoritePhotos = this._getOrCreateFavoritePhotosStore();
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);
    const photos = this._getFromStorage('photos', []);

    const articleEntries = favoriteArticles.map(function (fav) {
      const article = articles.find(function (a) { return a.id === fav.articleId; }) || null;
      const categoryName = article ? this._getCategoryName(article.category) : '';
      const articleTags = this._resolveArticleTags(article, tags);
      return {
        favorite: fav,
        article: article,
        category_name: categoryName,
        tags: articleTags
      };
    }.bind(this));

    const photoEntries = favoritePhotos.map(function (fav) {
      const photo = photos.find(function (p) { return p.id === fav.photoId; }) || null;
      return {
        favorite: fav,
        photo: photo
      };
    });

    return {
      articles: articleEntries,
      photos: photoEntries,
      total_favorite_articles: favoriteArticles.length,
      total_favorite_photos: favoritePhotos.length
    };
  }

  // getPhotoGalleryFilters()
  getPhotoGalleryFilters() {
    const photos = this._getFromStorage('photos', []);

    const yearSet = new Set();
    const categorySet = new Set();

    photos.forEach(function (p) {
      if (typeof p.year === 'number') {
        yearSet.add(p.year);
      }
      if (p.category) {
        categorySet.add(p.category);
      }
    });

    const yearsArr = Array.from(yearSet).sort(function (a, b) { return b - a; });
    const year_filters = yearsArr.map(function (year) {
      return {
        year: year,
        label: String(year),
        has_photos: true
      };
    });

    const categoriesArr = Array.from(categorySet);
    const category_filters = categoriesArr.map(function (catId) {
      return {
        id: catId,
        label: this._getPhotoCategoryLabel(catId)
      };
    }.bind(this));

    return {
      year_filters: year_filters,
      category_filters: category_filters
    };
  }

  // getGalleryPhotos(year, category, page, pageSize)
  getGalleryPhotos(year, category, page, pageSize) {
    const photos = this._getFromStorage('photos', []);
    const favoritePhotos = this._getOrCreateFavoritePhotosStore();

    let filtered = photos;
    if (typeof year === 'number') {
      filtered = filtered.filter(function (p) { return p.year === year; });
    }
    if (category) {
      filtered = filtered.filter(function (p) { return p.category === category; });
    }

    // Sort by taken_at desc, then by id
    filtered = filtered.slice().sort(function (a, b) {
      const da = new Date(a.taken_at || 0).getTime();
      const db = new Date(b.taken_at || 0).getTime();
      if (da !== db) return db - da;
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

    const total_results = filtered.length;
    const p = page || 1;
    const ps = pageSize || 24;
    const paged = this._paginateArray(filtered, p, ps);

    const photosOut = paged.map(function (photo) {
      const isFavorited = this._isPhotoFavorited(photo.id, favoritePhotos);
      return {
        photo: photo,
        is_favorited: isFavorited
      };
    }.bind(this));

    return {
      applied_filters: {
        year: typeof year === 'number' ? year : null,
        category: category || null
      },
      page: p,
      page_size: ps,
      total_results: total_results,
      photos: photosOut
    };
  }

  // addPhotoToFavorites(photoId)
  addPhotoToFavorites(photoId) {
    const favorites = this._getOrCreateFavoritePhotosStore();

    let existing = favorites.find(function (f) { return f.photoId === photoId; });
    if (existing) {
      this._saveToStorage('favorite_photos', favorites);
      this._persistSingleUserState();
      return {
        success: true,
        message: 'Photo is already in favorites.',
        favorite: existing,
        total_favorite_photos: favorites.length
      };
    }

    const newFav = {
      id: this._generateId('fav_photo'),
      photoId: photoId,
      added_at: new Date().toISOString()
    };
    favorites.push(newFav);
    this._saveToStorage('favorite_photos', favorites);
    this._persistSingleUserState();

    return {
      success: true,
      message: 'Photo added to favorites.',
      favorite: newFav,
      total_favorite_photos: favorites.length
    };
  }

  // removePhotoFromFavorites(photoId)
  removePhotoFromFavorites(photoId) {
    const favorites = this._getOrCreateFavoritePhotosStore();
    const originalLength = favorites.length;
    const newFavs = favorites.filter(function (f) { return f.photoId !== photoId; });
    this._saveToStorage('favorite_photos', newFavs);
    this._persistSingleUserState();

    const removed = newFavs.length < originalLength;

    return {
      success: true,
      message: removed ? 'Photo removed from favorites.' : 'Photo was not in favorites.',
      total_favorite_photos: newFavs.length
    };
  }

  // createNewsletterSubscription(name, email, wants_training_tips, wants_competition_updates, wants_merchandise_offers, frequency, email_format)
  createNewsletterSubscription(name, email, wants_training_tips, wants_competition_updates, wants_merchandise_offers, frequency, email_format) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);

    const subscription = {
      id: this._generateId('sub'),
      name: name,
      email: email,
      wants_training_tips: !!wants_training_tips,
      wants_competition_updates: !!wants_competition_updates,
      wants_merchandise_offers: !!wants_merchandise_offers,
      frequency: frequency,
      email_format: email_format,
      created_at: new Date().toISOString()
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      message: 'Subscription created.',
      subscription: subscription
    };
  }

  // getContactFormOptions()
  getContactFormOptions() {
    // Static options based on enum values
    const inquiry_types = [
      { value: 'nutrition_advice', label: 'Nutrition advice' },
      { value: 'general_question', label: 'General question' },
      { value: 'training', label: 'Training' },
      { value: 'health', label: 'Health' },
      { value: 'competition', label: 'Competition' },
      { value: 'other', label: 'Other' }
    ];

    return {
      inquiry_types: inquiry_types
    };
  }

  // submitContactMessage(name, email, subject, message, inquiry_type, relatedArticleId, related_article_published_date_text)
  submitContactMessage(name, email, subject, message, inquiry_type, relatedArticleId, related_article_published_date_text) {
    const contactMessages = this._getFromStorage('contact_messages', []);
    const articles = this._getFromStorage('articles', []);

    const storedMessage = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      inquiry_type: inquiry_type,
      relatedArticleId: relatedArticleId || null,
      related_article_published_date_text: related_article_published_date_text || null,
      created_at: new Date().toISOString()
    };

    contactMessages.push(storedMessage);
    this._saveToStorage('contact_messages', contactMessages);

    const relatedArticle = relatedArticleId
      ? (articles.find(function (a) { return a.id === relatedArticleId; }) || null)
      : null;

    const returnedMessage = Object.assign({}, storedMessage, {
      relatedArticle: relatedArticle
    });

    return {
      success: true,
      message: 'Contact message submitted.',
      contact_message: returnedMessage
    };
  }

  // getAboutContent()
  getAboutContent() {
    const about = this._getFromStorage('about_content', {
      title: '',
      body_html: '',
      hero_image_url: '',
      last_updated: ''
    });
    return {
      title: about.title || '',
      body_html: about.body_html || '',
      hero_image_url: about.hero_image_url || '',
      last_updated: about.last_updated || ''
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