'use strict';

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

  // -------------------- Storage helpers --------------------
  _initStorage() {
    const arrayKeys = [
      'articles',
      'reading_lists',
      'reading_list_items',
      'article_bookmarks',
      'learning_paths',
      'learning_path_items',
      'weekly_plan_entries',
      'videos',
      'watch_later_playlists',
      'watch_later_items',
      'quizzes',
      'quiz_questions',
      'quiz_options',
      'quiz_attempts',
      'quiz_attempt_answers',
      'quiz_notes',
      'tools',
      'investment_goals',
      'glossary_terms',
      'favorite_glossary_terms',
      'stocks',
      'practice_watchlists',
      'watchlist_items',
      'contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    // Library view state is a single object, not an array
    if (!localStorage.getItem('library_view_state')) {
      localStorage.setItem('library_view_state', 'null');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
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

  _now() {
    return new Date().toISOString();
  }

  _slugify(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  _getOrCreateDefaultReadingList() {
    let lists = this._getFromStorage('reading_lists');
    let list = lists.find((l) => l.name === 'My Reading List') || lists[0];
    if (!list) {
      list = {
        id: this._generateId('readinglist'),
        name: 'My Reading List',
        description: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  _getOrCreateWatchLaterPlaylist() {
    let playlists = this._getFromStorage('watch_later_playlists');
    let playlist = playlists.find((p) => p.name === 'Watch Later') || playlists[0];
    if (!playlist) {
      playlist = {
        id: this._generateId('watchlater'),
        name: 'Watch Later',
        description: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      playlists.push(playlist);
      this._saveToStorage('watch_later_playlists', playlists);
    }
    return playlist;
  }

  _getOrCreatePracticeWatchlist() {
    let watchlists = this._getFromStorage('practice_watchlists');
    let watchlist = watchlists[0];
    if (!watchlist) {
      watchlist = {
        id: this._generateId('practicewatchlist'),
        name: 'Practice Watchlist',
        description: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      watchlists.push(watchlist);
      this._saveToStorage('practice_watchlists', watchlists);
    }
    return watchlist;
  }

  _getInvestmentCalculatorToolId() {
    let tools = this._getFromStorage('tools');
    let tool = tools.find((t) => {
      const name = (t.name || '').toLowerCase();
      const slug = (t.slug || '').toLowerCase();
      return (
        name === 'investment calculator' ||
        slug === 'investment-calculator' ||
        slug === 'investment_calculator'
      );
    });

    if (!tool) {
      tool = {
        id: this._generateId('tool'),
        name: 'Investment Calculator',
        slug: 'investment-calculator',
        description: 'Calculate recurring contributions to reach an investment goal.',
        url: null
      };
      tools.push(tool);
      this._saveToStorage('tools', tools);
    }

    return tool.id;
  }

  _getOrCreateLibraryViewState() {
    const raw = localStorage.getItem('library_view_state');
    let state = null;
    if (raw) {
      try {
        state = JSON.parse(raw);
      } catch (e) {
        state = null;
      }
    }
    if (!state) {
      state = {
        id: 'library_view_state_1',
        active_section: 'reading_list',
        updated_at: this._now()
      };
      localStorage.setItem('library_view_state', JSON.stringify(state));
    }
    return state;
  }

  _calculateRequiredContributionAmount(target_amount, years, annual_return_percent, contribution_frequency) {
    const r = annual_return_percent / 100;
    let n = 12;
    if (contribution_frequency === 'weekly') n = 52;
    else if (contribution_frequency === 'quarterly') n = 4;
    else if (contribution_frequency === 'yearly') n = 1;

    const periods = n * years;

    if (years <= 0 || periods <= 0) {
      return target_amount;
    }

    if (r <= 0) {
      return target_amount / periods;
    }

    const ratePerPeriod = r / n;
    const factor = (Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod;
    if (factor === 0) return target_amount / periods;
    return target_amount / factor;
  }

  _getWeekStartISO(date) {
    const d = date ? new Date(date) : new Date();
    const day = d.getUTCDay(); // 0 (Sun) - 6 (Sat)
    const diff = (day + 6) % 7; // days since Monday
    d.setUTCDate(d.getUTCDate() - diff);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }

  // -------------------- Core interface implementations --------------------

  // getHomeOverview()
  getHomeOverview() {
    const articles = this._getFromStorage('articles');
    const videos = this._getFromStorage('videos');
    const learning_paths = this._getFromStorage('learning_paths');
    const tools = this._getFromStorage('tools');

    const sortByDateDesc = (arr, primaryField, fallbackField) => {
      return arr
        .slice()
        .sort((a, b) => {
          const aDate = a[primaryField] || a[fallbackField];
          const bDate = b[primaryField] || b[fallbackField];
          const aVal = aDate ? new Date(aDate).getTime() : 0;
          const bVal = bDate ? new Date(bDate).getTime() : 0;
          return bVal - aVal;
        });
    };

    const latest_articles = sortByDateDesc(articles, 'published_at', 'created_at');
    const featured_articles = latest_articles.slice(0, 3);
    const featured_videos = sortByDateDesc(videos, 'published_at', 'created_at').slice(0, 3);
    const featured_learning_paths = sortByDateDesc(
      learning_paths,
      'created_at',
      'updated_at'
    ).slice(0, 3);
    const featured_tools = tools.slice(0, 3);

    return {
      featured_articles,
      latest_articles,
      featured_videos,
      featured_learning_paths,
      featured_tools
    };
  }

  // globalSearchContent(query)
  globalSearchContent(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return {
        articles: [],
        videos: [],
        learning_paths: [],
        glossary_terms: []
      };
    }

    const contains = (text) => (text || '').toLowerCase().includes(q);

    const articles = this._getFromStorage('articles').filter((a) => {
      return (
        contains(a.title) ||
        contains(a.summary) ||
        contains(a.content) ||
        (Array.isArray(a.topic_tags) && a.topic_tags.some((t) => contains(t)))
      );
    });

    const videos = this._getFromStorage('videos').filter((v) => {
      return (
        contains(v.title) ||
        contains(v.description) ||
        (Array.isArray(v.topic_tags) && v.topic_tags.some((t) => contains(t)))
      );
    });

    const learning_paths = this._getFromStorage('learning_paths').filter((lp) => {
      return (
        contains(lp.title) ||
        contains(lp.description) ||
        (Array.isArray(lp.topic_tags) && lp.topic_tags.some((t) => contains(t)))
      );
    });

    const glossary_terms = this._getFromStorage('glossary_terms').filter((gt) => {
      return contains(gt.term) || contains(gt.definition);
    });

    return {
      articles,
      videos,
      learning_paths,
      glossary_terms
    };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');

    const publicationYearsSet = new Set();
    articles.forEach((a) => {
      if (typeof a.publication_year === 'number') {
        publicationYearsSet.add(a.publication_year);
      }
    });

    const publication_years = Array.from(publicationYearsSet).sort((a, b) => b - a);

    const level_options = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const reading_time_max_values = [5, 10, 15, 20, 30];
    const rating_min_values = [3, 4, 4.5, 5];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'newest_first', label: 'Newest first' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'reading_time_shortest_first', label: 'Reading time: Shortest first' }
    ];

    return {
      level_options,
      publication_years,
      reading_time_max_values,
      rating_min_values,
      sort_options
    };
  }

  // searchArticles(query, filters, sort_by, page, page_size)
  searchArticles(query, filters, sort_by = 'relevance', page = 1, page_size = 20) {
    const q = (query || '').trim().toLowerCase();
    const filterObj = filters || {};

    const articles = this._getFromStorage('articles');
    const reading_list_items = this._getFromStorage('reading_list_items');
    const bookmarks = this._getFromStorage('article_bookmarks');

    const contains = (text) => (text || '').toLowerCase().includes(q);

    let results = articles.filter((a) => {
      if (q) {
        const matchesQuery =
          contains(a.title) ||
          contains(a.summary) ||
          contains(a.content) ||
          (Array.isArray(a.topic_tags) && a.topic_tags.some((t) => contains(t)));
        if (!matchesQuery) return false;
      }

      if (filterObj.level && a.level !== filterObj.level) return false;

      if (
        typeof filterObj.max_reading_time_minutes === 'number' &&
        typeof a.reading_time_minutes === 'number' &&
        a.reading_time_minutes > filterObj.max_reading_time_minutes
      ) {
        return false;
      }

      if (
        typeof filterObj.publication_year === 'number' &&
        a.publication_year !== filterObj.publication_year
      ) {
        return false;
      }

      if (filterObj.published_after) {
        const after = new Date(filterObj.published_after).getTime();
        const pub = a.published_at ? new Date(a.published_at).getTime() : 0;
        if (!(pub > after)) return false;
      }

      if (typeof filterObj.min_rating === 'number') {
        const rating = typeof a.rating === 'number' ? a.rating : 0;
        if (rating < filterObj.min_rating) return false;
      }

      return true;
    });

    if (sort_by === 'newest_first' || sort_by === 'relevance') {
      results.sort((a, b) => {
        const ad = a.published_at || a.created_at;
        const bd = b.published_at || b.created_at;
        const av = ad ? new Date(ad).getTime() : 0;
        const bv = bd ? new Date(bd).getTime() : 0;
        return bv - av;
      });
    } else if (sort_by === 'rating_high_to_low') {
      results.sort((a, b) => {
        const ar = typeof a.rating === 'number' ? a.rating : 0;
        const br = typeof b.rating === 'number' ? b.rating : 0;
        if (br !== ar) return br - ar;
        const ac = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const bc = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return bc - ac;
      });
    } else if (sort_by === 'reading_time_shortest_first') {
      results.sort((a, b) => {
        const at = typeof a.reading_time_minutes === 'number' ? a.reading_time_minutes : 0;
        const bt = typeof b.reading_time_minutes === 'number' ? b.reading_time_minutes : 0;
        return at - bt;
      });
    }

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = results.slice(start, end);

    const items = paged.map((article) => {
      const is_in_reading_list = reading_list_items.some(
        (rli) => rli.article_id === article.id
      );
      const is_bookmarked = bookmarks.some((b) => b.article_id === article.id);
      return { article, is_in_reading_list, is_bookmarked };
    });

    return {
      total_count,
      page,
      page_size,
      items
    };
  }

  // addArticleToReadingList(articleId)
  addArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, reading_list_item: null, current_count: 0, message: 'Article not found' };
    }

    const reading_list = this._getOrCreateDefaultReadingList();
    let items = this._getFromStorage('reading_list_items');

    const existing = items.find(
      (i) => i.reading_list_id === reading_list.id && i.article_id === articleId
    );

    if (existing) {
      const current_count = items.filter((i) => i.reading_list_id === reading_list.id).length;
      return {
        success: true,
        reading_list_item: existing,
        current_count,
        message: 'Article already in reading list'
      };
    }

    const sort_index = items
      .filter((i) => i.reading_list_id === reading_list.id)
      .reduce((max, i) => (typeof i.sort_index === 'number' && i.sort_index > max ? i.sort_index : max), 0) + 1;

    const reading_list_item = {
      id: this._generateId('readinglistitem'),
      reading_list_id: reading_list.id,
      article_id: articleId,
      added_at: this._now(),
      sort_index
    };

    items.push(reading_list_item);
    this._saveToStorage('reading_list_items', items);

    const current_count = items.filter((i) => i.reading_list_id === reading_list.id).length;
    return {
      success: true,
      reading_list_item,
      current_count,
      message: 'Article added to reading list'
    };
  }

  // removeArticleFromReadingList(articleId)
  removeArticleFromReadingList(articleId) {
    const reading_list = this._getOrCreateDefaultReadingList();
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter(
      (i) => !(i.reading_list_id === reading_list.id && i.article_id === articleId)
    );
    this._saveToStorage('reading_list_items', items);
    const removed = before !== items.length;
    return {
      success: removed,
      message: removed ? 'Removed from reading list' : 'Item not found in reading list'
    };
  }

  // getReadingListContents()
  getReadingListContents() {
    const reading_list = this._getOrCreateDefaultReadingList();
    const itemsAll = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const items = itemsAll
      .filter((i) => i.reading_list_id === reading_list.id)
      .sort((a, b) => {
        const ai = typeof a.sort_index === 'number' ? a.sort_index : 0;
        const bi = typeof b.sort_index === 'number' ? b.sort_index : 0;
        return ai - bi;
      })
      .map((reading_list_item) => {
        const article = articles.find((a) => a.id === reading_list_item.article_id) || null;
        return { reading_list_item, article };
      });

    return { reading_list, items };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;

    if (!article) {
      return {
        article: null,
        is_bookmarked: false,
        is_in_reading_list: false,
        learning_paths_including: [],
        related_articles: []
      };
    }

    const reading_list_items = this._getFromStorage('reading_list_items');
    const bookmarks = this._getFromStorage('article_bookmarks');
    const learning_paths = this._getFromStorage('learning_paths');
    const learning_path_items = this._getFromStorage('learning_path_items');

    const is_in_reading_list = reading_list_items.some((i) => i.article_id === articleId);
    const is_bookmarked = bookmarks.some((b) => b.article_id === articleId);

    const learning_path_ids = learning_path_items
      .filter((li) => li.content_type === 'article' && li.content_id === articleId)
      .map((li) => li.learning_path_id);

    const learning_paths_including = learning_paths.filter((lp) =>
      learning_path_ids.includes(lp.id)
    );

    const topicTags = Array.isArray(article.topic_tags) ? article.topic_tags : [];
    const related_articles = articles
      .filter((a) => {
        if (a.id === article.id) return false;
        if (!Array.isArray(a.topic_tags)) return false;
        return a.topic_tags.some((tag) => topicTags.includes(tag));
      })
      .slice(0, 5);

    return {
      article,
      is_bookmarked,
      is_in_reading_list,
      learning_paths_including,
      related_articles
    };
  }

  // bookmarkArticle(articleId)
  bookmarkArticle(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, bookmark: null, message: 'Article not found' };
    }

    let bookmarks = this._getFromStorage('article_bookmarks');
    let existing = bookmarks.find((b) => b.article_id === articleId);
    if (existing) {
      return { success: true, bookmark: existing, message: 'Already bookmarked' };
    }

    const bookmark = {
      id: this._generateId('articlebookmark'),
      article_id: articleId,
      bookmarked_at: this._now()
    };
    bookmarks.push(bookmark);
    this._saveToStorage('article_bookmarks', bookmarks);

    return { success: true, bookmark, message: 'Article bookmarked' };
  }

  // removeArticleBookmark(articleId)
  removeArticleBookmark(articleId) {
    let bookmarks = this._getFromStorage('article_bookmarks');
    const before = bookmarks.length;
    bookmarks = bookmarks.filter((b) => b.article_id !== articleId);
    this._saveToStorage('article_bookmarks', bookmarks);
    const removed = before !== bookmarks.length;
    return {
      success: removed
    };
  }

  // getBookmarkedArticles()
  getBookmarkedArticles() {
    const bookmarks = this._getFromStorage('article_bookmarks');
    const articles = this._getFromStorage('articles');

    const result = bookmarks
      .slice()
      .sort((a, b) => {
        const at = a.bookmarked_at ? new Date(a.bookmarked_at).getTime() : 0;
        const bt = b.bookmarked_at ? new Date(b.bookmarked_at).getTime() : 0;
        return bt - at;
      })
      .map((bookmark) => {
        const article = articles.find((a) => a.id === bookmark.article_id) || null;
        return { bookmark, article };
      });

    return { bookmarks: result };
  }

  // addArticleToLearningPaths(articleId, learningPathIds)
  addArticleToLearningPaths(articleId, learningPathIds) {
    const lpIds = Array.isArray(learningPathIds) ? learningPathIds : [];
    if (!lpIds.length) {
      return { success: false, updated_learning_paths: [] };
    }

    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, updated_learning_paths: [] };
    }

    let learning_paths = this._getFromStorage('learning_paths');
    let items = this._getFromStorage('learning_path_items');

    const updated_learning_paths = [];

    lpIds.forEach((lpId) => {
      const lp = learning_paths.find((l) => l.id === lpId);
      if (!lp) return;

      const existingItem = items.find(
        (it) =>
          it.learning_path_id === lpId &&
          it.content_type === 'article' &&
          it.content_id === articleId
      );
      if (existingItem) {
        updated_learning_paths.push(lp);
        return;
      }

      const order_index =
        items
          .filter((it) => it.learning_path_id === lpId)
          .reduce(
            (max, it) =>
              typeof it.order_index === 'number' && it.order_index > max
                ? it.order_index
                : max,
            0
          ) + 1;

      const newItem = {
        id: this._generateId('learningpathitem'),
        learning_path_id: lpId,
        content_type: 'article',
        content_id: articleId,
        order_index,
        added_at: this._now(),
        is_completed: false,
        completed_at: null
      };

      items.push(newItem);
      this._recalculateLearningPathAggregates(lpId, learning_paths, items, articles);
      const updatedLp = learning_paths.find((l) => l.id === lpId);
      if (updatedLp) updated_learning_paths.push(updatedLp);
    });

    this._saveToStorage('learning_paths', learning_paths);
    this._saveToStorage('learning_path_items', items);

    return { success: true, updated_learning_paths };
  }

  _recalculateLearningPathAggregates(learningPathId, learning_paths, items, articles, videos) {
    const lp = learning_paths.find((l) => l.id === learningPathId);
    if (!lp) return;

    const lpItems = items.filter((it) => it.learning_path_id === learningPathId);
    const vids = videos || this._getFromStorage('videos');

    let totalMinutes = 0;

    lpItems.forEach((it) => {
      if (it.content_type === 'article') {
        const art = articles.find((a) => a.id === it.content_id);
        if (art && typeof art.reading_time_minutes === 'number') {
          totalMinutes += art.reading_time_minutes;
        }
      } else if (it.content_type === 'video') {
        const vid = vids.find((v) => v.id === it.content_id);
        if (vid && typeof vid.duration_minutes === 'number') {
          totalMinutes += vid.duration_minutes;
        }
      }
    });

    lp.total_reading_time_minutes = totalMinutes;
    lp.item_count = lpItems.length;
    lp.updated_at = this._now();
  }

  // createLearningPathFromArticles(title, description, level, articleIds)
  createLearningPathFromArticles(title, description, level, articleIds) {
    const ids = Array.isArray(articleIds) ? articleIds : [];
    const articles = this._getFromStorage('articles');
    const learning_paths = this._getFromStorage('learning_paths');
    const items = this._getFromStorage('learning_path_items');

    const includedArticles = ids
      .map((id) => articles.find((a) => a.id === id))
      .filter((a) => !!a);

    const totalMinutes = includedArticles.reduce((sum, a) => {
      return sum + (typeof a.reading_time_minutes === 'number' ? a.reading_time_minutes : 0);
    }, 0);

    const lp = {
      id: this._generateId('learningpath'),
      title: title || 'Custom Learning Path',
      slug: this._slugify(title || 'custom-learning-path'),
      description: description || null,
      level: level || null,
      topic_tags: null,
      total_reading_time_minutes: totalMinutes,
      item_count: includedArticles.length,
      origin_type: 'user_created',
      is_following: false,
      followed_at: null,
      created_at: this._now(),
      updated_at: this._now()
    };

    learning_paths.push(lp);

    const newItems = includedArticles.map((a, index) => {
      const item = {
        id: this._generateId('learningpathitem'),
        learning_path_id: lp.id,
        content_type: 'article',
        content_id: a.id,
        order_index: index + 1,
        added_at: this._now(),
        is_completed: false,
        completed_at: null
      };
      items.push(item);
      return item;
    });

    this._saveToStorage('learning_paths', learning_paths);
    this._saveToStorage('learning_path_items', items);

    return {
      learning_path: lp,
      items: newItems
    };
  }

  // addArticlesToExistingLearningPath(learningPathId, articleIds)
  addArticlesToExistingLearningPath(learningPathId, articleIds) {
    const ids = Array.isArray(articleIds) ? articleIds : [];
    let learning_paths = this._getFromStorage('learning_paths');
    let items = this._getFromStorage('learning_path_items');
    const articles = this._getFromStorage('articles');

    const lp = learning_paths.find((l) => l.id === learningPathId);
    if (!lp) {
      return { learning_path: null, items: [] };
    }

    ids.forEach((articleId) => {
      const article = articles.find((a) => a.id === articleId);
      if (!article) return;

      const existing = items.find(
        (it) =>
          it.learning_path_id === learningPathId &&
          it.content_type === 'article' &&
          it.content_id === articleId
      );
      if (existing) return;

      const order_index =
        items
          .filter((it) => it.learning_path_id === learningPathId)
          .reduce(
            (max, it) =>
              typeof it.order_index === 'number' && it.order_index > max
                ? it.order_index
                : max,
            0
          ) + 1;

      const newItem = {
        id: this._generateId('learningpathitem'),
        learning_path_id: learningPathId,
        content_type: 'article',
        content_id: articleId,
        order_index,
        added_at: this._now(),
        is_completed: false,
        completed_at: null
      };
      items.push(newItem);
    });

    this._recalculateLearningPathAggregates(learningPathId, learning_paths, items, articles);

    learning_paths = this._getFromStorage('learning_paths');
    const updatedLp = learning_paths.find((l) => l.id === learningPathId) || lp;
    const lpItems = items
      .filter((it) => it.learning_path_id === learningPathId)
      .sort((a, b) => a.order_index - b.order_index);

    this._saveToStorage('learning_paths', learning_paths);
    this._saveToStorage('learning_path_items', items);

    return {
      learning_path: updatedLp,
      items: lpItems
    };
  }

  // getLearningPathsList(filters, sort_by, page, page_size)
  getLearningPathsList(filters, sort_by = 'recommended', page = 1, page_size = 20) {
    const filterObj = filters || {};
    const learning_paths = this._getFromStorage('learning_paths');

    const q = (filterObj.query || '').trim().toLowerCase();

    let results = learning_paths.filter((lp) => {
      if (q) {
        const contains = (text) => (text || '').toLowerCase().includes(q);
        const matchesQuery =
          contains(lp.title) ||
          contains(lp.description) ||
          (Array.isArray(lp.topic_tags) && lp.topic_tags.some((t) => contains(t)));
        if (!matchesQuery) return false;
      }

      if (filterObj.level && lp.level !== filterObj.level) return false;

      if (
        typeof filterObj.max_total_reading_time_minutes === 'number' &&
        typeof lp.total_reading_time_minutes === 'number' &&
        lp.total_reading_time_minutes > filterObj.max_total_reading_time_minutes
      ) {
        return false;
      }

      if (filterObj.topic_tag) {
        if (!Array.isArray(lp.topic_tags)) return false;
        if (!lp.topic_tags.includes(filterObj.topic_tag)) return false;
      }

      return true;
    });

    if (sort_by === 'shortest_first') {
      results.sort((a, b) => {
        const at = typeof a.total_reading_time_minutes === 'number' ? a.total_reading_time_minutes : 0;
        const bt = typeof b.total_reading_time_minutes === 'number' ? b.total_reading_time_minutes : 0;
        return at - bt;
      });
    } else if (sort_by === 'newest_first') {
      results.sort((a, b) => {
        const ad = a.created_at || a.updated_at;
        const bd = b.created_at || b.updated_at;
        const av = ad ? new Date(ad).getTime() : 0;
        const bv = bd ? new Date(bd).getTime() : 0;
        return bv - av;
      });
    } else {
      // 'recommended' - simple heuristic: system_defined first, then newest
      results.sort((a, b) => {
        if (a.origin_type !== b.origin_type) {
          return a.origin_type === 'system_defined' ? -1 : 1;
        }
        const ad = a.created_at || a.updated_at;
        const bd = b.created_at || b.updated_at;
        const av = ad ? new Date(ad).getTime() : 0;
        const bv = bd ? new Date(bd).getTime() : 0;
        return bv - av;
      });
    }

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = results.slice(start, end);

    const items = paged.map((lp) => ({
      learning_path: lp,
      is_following: !!lp.is_following
    }));

    return {
      total_count,
      page,
      page_size,
      items
    };
  }

  // getLearningPathDetail(learningPathId)
  getLearningPathDetail(learningPathId) {
    const learning_paths = this._getFromStorage('learning_paths');
    const learning_path = learning_paths.find((lp) => lp.id === learningPathId) || null;

    if (!learning_path) {
      return {
        learning_path: null,
        items: [],
        progress: { completed_count: 0, total_count: 0 },
        weekly_plan_entry: null
      };
    }

    const itemsAll = this._getFromStorage('learning_path_items');
    const articles = this._getFromStorage('articles');
    const videos = this._getFromStorage('videos');
    const weekly_plan_entries = this._getFromStorage('weekly_plan_entries');

    const pathItemsRaw = itemsAll
      .filter((it) => it.learning_path_id === learningPathId)
      .sort((a, b) => a.order_index - b.order_index);

    const items = pathItemsRaw.map((learning_path_item) => {
      let article = null;
      let video = null;
      if (learning_path_item.content_type === 'article') {
        article = articles.find((a) => a.id === learning_path_item.content_id) || null;
      } else if (learning_path_item.content_type === 'video') {
        video = videos.find((v) => v.id === learning_path_item.content_id) || null;
      }
      return { learning_path_item, article, video };
    });

    const completed_count = pathItemsRaw.filter((it) => it.is_completed).length;
    const total_count = pathItemsRaw.length;

    const weeklyEntries = weekly_plan_entries
      .filter((e) => e.learning_path_id === learningPathId)
      .sort((a, b) => {
        const at = a.added_at ? new Date(a.added_at).getTime() : 0;
        const bt = b.added_at ? new Date(b.added_at).getTime() : 0;
        return bt - at;
      });

    const weekly_plan_entry = weeklyEntries[0] || null;

    return {
      learning_path,
      items,
      progress: { completed_count, total_count },
      weekly_plan_entry
    };
  }

  // followLearningPath(learningPathId)
  followLearningPath(learningPathId) {
    const learning_paths = this._getFromStorage('learning_paths');
    const lp = learning_paths.find((l) => l.id === learningPathId) || null;
    if (!lp) return { learning_path: null };

    lp.is_following = true;
    lp.followed_at = this._now();
    lp.updated_at = this._now();

    this._saveToStorage('learning_paths', learning_paths);
    return { learning_path: lp };
  }

  // unfollowLearningPath(learningPathId)
  unfollowLearningPath(learningPathId) {
    const learning_paths = this._getFromStorage('learning_paths');
    const lp = learning_paths.find((l) => l.id === learningPathId) || null;
    if (!lp) return { learning_path: null };

    lp.is_following = false;
    lp.followed_at = null;
    lp.updated_at = this._now();

    this._saveToStorage('learning_paths', learning_paths);
    return { learning_path: lp };
  }

  // addLearningPathToWeeklyPlan(learningPathId, target_week_start)
  addLearningPathToWeeklyPlan(learningPathId, target_week_start) {
    const learning_paths = this._getFromStorage('learning_paths');
    const lp = learning_paths.find((l) => l.id === learningPathId) || null;
    if (!lp) return { weekly_plan_entry: null };

    const weekly_plan_entries = this._getFromStorage('weekly_plan_entries');
    const weekStart = target_week_start || this._getWeekStartISO();

    // Optional: avoid duplicates for same path/week
    let existing = weekly_plan_entries.find(
      (e) => e.learning_path_id === learningPathId && e.target_week_start === weekStart
    );

    if (!existing) {
      existing = {
        id: this._generateId('weeklyplanentry'),
        learning_path_id: learningPathId,
        target_week_start: weekStart,
        status: 'not_started',
        added_at: this._now(),
        updated_at: this._now()
      };
      weekly_plan_entries.push(existing);
      this._saveToStorage('weekly_plan_entries', weekly_plan_entries);
    }

    return { weekly_plan_entry: existing };
  }

  // getWeeklyPlanEntries()
  getWeeklyPlanEntries() {
    const weekly_plan_entries = this._getFromStorage('weekly_plan_entries');
    const learning_paths = this._getFromStorage('learning_paths');

    const entries = weekly_plan_entries.map((weekly_plan_entry) => {
      const learning_path =
        learning_paths.find((lp) => lp.id === weekly_plan_entry.learning_path_id) || null;
      return { weekly_plan_entry, learning_path };
    });

    return { entries };
  }

  // updateLearningPathItemCompletion(learningPathItemId, is_completed)
  updateLearningPathItemCompletion(learningPathItemId, is_completed) {
    const items = this._getFromStorage('learning_path_items');
    const item = items.find((it) => it.id === learningPathItemId) || null;
    if (!item) {
      return {
        learning_path_item: null,
        progress: { completed_count: 0, total_count: 0 }
      };
    }

    item.is_completed = !!is_completed;
    item.completed_at = item.is_completed ? this._now() : null;

    const learningPathId = item.learning_path_id;

    const pathItems = items.filter((it) => it.learning_path_id === learningPathId);
    const completed_count = pathItems.filter((it) => it.is_completed).length;
    const total_count = pathItems.length;

    this._saveToStorage('learning_path_items', items);

    return {
      learning_path_item: item,
      progress: { completed_count, total_count }
    };
  }

  // reorderLearningPathItems(learningPathId, orderedItemIds)
  reorderLearningPathItems(learningPathId, orderedItemIds) {
    const orderIds = Array.isArray(orderedItemIds) ? orderedItemIds : [];
    const items = this._getFromStorage('learning_path_items');

    const pathItems = items.filter((it) => it.learning_path_id === learningPathId);
    const others = items.filter((it) => it.learning_path_id !== learningPathId);

    const idToItem = {};
    pathItems.forEach((it) => {
      idToItem[it.id] = it;
    });

    const reordered = [];
    orderIds.forEach((id, index) => {
      const it = idToItem[id];
      if (it) {
        it.order_index = index + 1;
        reordered.push(it);
      }
    });

    pathItems
      .filter((it) => !orderIds.includes(it.id))
      .forEach((it) => {
        reordered.push(it);
      });

    reordered.sort((a, b) => a.order_index - b.order_index);

    const newItems = others.concat(reordered);
    this._saveToStorage('learning_path_items', newItems);

    return {
      items: reordered
    };
  }

  // removeLearningPathItem(learningPathItemId)
  removeLearningPathItem(learningPathItemId) {
    let items = this._getFromStorage('learning_path_items');
    const before = items.length;
    items = items.filter((it) => it.id !== learningPathItemId);
    this._saveToStorage('learning_path_items', items);
    return { success: before !== items.length };
  }

  // getVideoFilterOptions()
  getVideoFilterOptions() {
    const duration_max_values = [5, 10, 15, 20, 30];
    const rating_min_values = [3, 4, 4.5, 5];

    const sort_options = [
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'most_viewed', label: 'Most Viewed' },
      { value: 'newest_first', label: 'Newest first' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return { duration_max_values, rating_min_values, sort_options };
  }

  // searchVideos(query, filters, sort_by, page, page_size)
  searchVideos(query, filters, sort_by = 'most_popular', page = 1, page_size = 20) {
    const q = (query || '').trim().toLowerCase();
    const filterObj = filters || {};

    const videos = this._getFromStorage('videos');
    const watch_later_items = this._getFromStorage('watch_later_items');
    const playlist = this._getOrCreateWatchLaterPlaylist();

    const contains = (text) => (text || '').toLowerCase().includes(q);

    let results = videos.filter((v) => {
      if (q) {
        const matchesQuery =
          contains(v.title) ||
          contains(v.description) ||
          (Array.isArray(v.topic_tags) && v.topic_tags.some((t) => contains(t)));
        if (!matchesQuery) return false;
      }

      if (
        typeof filterObj.max_duration_minutes === 'number' &&
        typeof v.duration_minutes === 'number' &&
        v.duration_minutes > filterObj.max_duration_minutes
      ) {
        return false;
      }

      if (typeof filterObj.min_rating === 'number') {
        const rating = typeof v.rating === 'number' ? v.rating : 0;
        if (rating < filterObj.min_rating) return false;
      }

      return true;
    });

    if (sort_by === 'most_popular' || sort_by === 'most_viewed') {
      results.sort((a, b) => {
        const av = typeof a.view_count === 'number' ? a.view_count : 0;
        const bv = typeof b.view_count === 'number' ? b.view_count : 0;
        return bv - av;
      });
    } else if (sort_by === 'newest_first') {
      results.sort((a, b) => {
        const ad = a.published_at || a.created_at;
        const bd = b.published_at || b.created_at;
        const av = ad ? new Date(ad).getTime() : 0;
        const bv = bd ? new Date(bd).getTime() : 0;
        return bv - av;
      });
    } else if (sort_by === 'rating_high_to_low') {
      results.sort((a, b) => {
        const ar = typeof a.rating === 'number' ? a.rating : 0;
        const br = typeof b.rating === 'number' ? b.rating : 0;
        if (br !== ar) return br - ar;
        const ac = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const bc = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return bc - ac;
      });
    }

    const total_count = results.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = results.slice(start, end);

    const items = paged.map((video) => {
      const is_in_watch_later = watch_later_items.some(
        (it) => it.playlist_id === playlist.id && it.video_id === video.id
      );
      return { video, is_in_watch_later };
    });

    return {
      total_count,
      page,
      page_size,
      items
    };
  }

  // addVideoToWatchLater(videoId)
  addVideoToWatchLater(videoId) {
    const videos = this._getFromStorage('videos');
    const video = videos.find((v) => v.id === videoId);
    if (!video) {
      return { watch_later_item: null, playlist: null };
    }

    const playlist = this._getOrCreateWatchLaterPlaylist();
    let items = this._getFromStorage('watch_later_items');

    let existing = items.find(
      (it) => it.playlist_id === playlist.id && it.video_id === videoId
    );

    if (existing) {
      return { watch_later_item: existing, playlist };
    }

    const sort_index =
      items
        .filter((it) => it.playlist_id === playlist.id)
        .reduce(
          (max, it) =>
            typeof it.sort_index === 'number' && it.sort_index > max ? it.sort_index : max,
          0
        ) + 1;

    const watch_later_item = {
      id: this._generateId('watchlateritem'),
      playlist_id: playlist.id,
      video_id: videoId,
      added_at: this._now(),
      sort_index
    };

    items.push(watch_later_item);
    this._saveToStorage('watch_later_items', items);

    return { watch_later_item, playlist };
  }

  // removeVideoFromWatchLater(videoId)
  removeVideoFromWatchLater(videoId) {
    const playlist = this._getOrCreateWatchLaterPlaylist();
    let items = this._getFromStorage('watch_later_items');
    const before = items.length;
    items = items.filter(
      (it) => !(it.playlist_id === playlist.id && it.video_id === videoId)
    );
    this._saveToStorage('watch_later_items', items);
    return { success: before !== items.length };
  }

  // getWatchLaterPlaylist()
  getWatchLaterPlaylist() {
    const playlist = this._getOrCreateWatchLaterPlaylist();
    const itemsAll = this._getFromStorage('watch_later_items');
    const videos = this._getFromStorage('videos');

    const items = itemsAll
      .filter((it) => it.playlist_id === playlist.id)
      .sort((a, b) => {
        const ai = typeof a.sort_index === 'number' ? a.sort_index : 0;
        const bi = typeof b.sort_index === 'number' ? b.sort_index : 0;
        return ai - bi;
      })
      .map((watch_later_item) => {
        const video = videos.find((v) => v.id === watch_later_item.video_id) || null;
        return { watch_later_item, video };
      });

    return { playlist, items };
  }

  // getQuizzesList(filters)
  getQuizzesList(filters) {
    const filterObj = filters || {};
    const quizzes = this._getFromStorage('quizzes');
    const attempts = this._getFromStorage('quiz_attempts');

    const q = (filterObj.query || '').trim().toLowerCase();

    const result = quizzes
      .filter((quiz) => {
        if (filterObj.level && quiz.level !== filterObj.level) return false;
        if (filterObj.topic_tag) {
          if (!Array.isArray(quiz.topic_tags)) return false;
          if (!quiz.topic_tags.includes(filterObj.topic_tag)) return false;
        }
        if (q) {
          const contains = (text) => (text || '').toLowerCase().includes(q);
          if (!contains(quiz.title)) return false;
        }
        return true;
      })
      .map((quiz) => {
        const quizAttempts = attempts.filter((a) => a.quiz_id === quiz.id);
        const last_attempt = quizAttempts
          .slice()
          .sort((a, b) => {
            const at = a.submitted_at || a.started_at;
            const bt = b.submitted_at || b.started_at;
            const av = at ? new Date(at).getTime() : 0;
            const bv = bt ? new Date(bt).getTime() : 0;
            return bv - av;
          })[0] || null;
        return { quiz, last_attempt };
      });

    return { quizzes: result };
  }

  // getQuizDetail(quizId)
  getQuizDetail(quizId) {
    const quizzes = this._getFromStorage('quizzes');
    const attempts = this._getFromStorage('quiz_attempts');

    const quiz = quizzes.find((q) => q.id === quizId) || null;
    const quizAttempts = attempts.filter((a) => a.quiz_id === quizId);
    const last_attempt = quizAttempts
      .slice()
      .sort((a, b) => {
        const at = a.submitted_at || a.started_at;
        const bt = b.submitted_at || b.started_at;
        const av = at ? new Date(at).getTime() : 0;
        const bv = bt ? new Date(bt).getTime() : 0;
        return bv - av;
      })[0] || null;

    return { quiz, last_attempt };
  }

  // startQuizAttempt(quizId)
  startQuizAttempt(quizId) {
    const quizzes = this._getFromStorage('quizzes');
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) {
      return { attempt: null, questions: [] };
    }

    const questionsAll = this._getFromStorage('quiz_questions');
    const optionsAll = this._getFromStorage('quiz_options');

    const questions = questionsAll
      .filter((q) => q.quiz_id === quizId)
      .sort((a, b) => a.order_index - b.order_index)
      .map((question) => {
        const options = optionsAll
          .filter((o) => o.question_id === question.id)
          .sort((a, b) => a.order_index - b.order_index);
        return { question, options };
      });

    const attempt = {
      id: this._generateId('quizattempt'),
      quiz_id: quizId,
      started_at: this._now(),
      submitted_at: null,
      status: 'in_progress',
      score: null,
      total_questions: questions.length
    };

    const attempts = this._getFromStorage('quiz_attempts');
    attempts.push(attempt);
    this._saveToStorage('quiz_attempts', attempts);

    return { attempt, questions };
  }

  // answerQuizQuestion(attemptId, questionId, selectedOptionId)
  answerQuizQuestion(attemptId, questionId, selectedOptionId) {
    const attempts = this._getFromStorage('quiz_attempts');
    const attempt = attempts.find((a) => a.id === attemptId);
    if (!attempt) {
      return { answer: null };
    }

    const optionsAll = this._getFromStorage('quiz_options');
    const option = optionsAll.find((o) => o.id === selectedOptionId && o.question_id === questionId);
    const is_correct = option ? !!option.is_correct : false;

    let answers = this._getFromStorage('quiz_attempt_answers');
    let answer = answers.find(
      (ans) => ans.attempt_id === attemptId && ans.question_id === questionId
    );

    if (answer) {
      answer.selected_option_id = selectedOptionId;
      answer.is_correct = is_correct;
    } else {
      answer = {
        id: this._generateId('quizattemptanswer'),
        attempt_id: attemptId,
        question_id: questionId,
        selected_option_id: selectedOptionId,
        is_correct
      };
      answers.push(answer);
    }

    this._saveToStorage('quiz_attempt_answers', answers);

    return { answer };
  }

  // submitQuizAttempt(attemptId)
  submitQuizAttempt(attemptId) {
    const attempts = this._getFromStorage('quiz_attempts');
    const attempt = attempts.find((a) => a.id === attemptId);
    if (!attempt) {
      return {
        attempt: null,
        score: 0,
        total_questions: 0,
        correct_count: 0,
        incorrect_count: 0,
        question_results: []
      };
    }

    const questionsAll = this._getFromStorage('quiz_questions');
    const optionsAll = this._getFromStorage('quiz_options');
    const answersAll = this._getFromStorage('quiz_attempt_answers');

    const questions = questionsAll
      .filter((q) => q.quiz_id === attempt.quiz_id)
      .sort((a, b) => a.order_index - b.order_index);

    const answers = answersAll.filter((a) => a.attempt_id === attemptId);

    let correct_count = 0;
    const question_results = questions.map((question) => {
      const selectedAnswer = answers.find((a) => a.question_id === question.id) || null;
      const options = optionsAll.filter((o) => o.question_id === question.id);
      const correct_option = options.find((o) => o.is_correct) || null;
      const selected_option = selectedAnswer
        ? options.find((o) => o.id === selectedAnswer.selected_option_id) || null
        : null;
      const is_correct = selectedAnswer ? !!selectedAnswer.is_correct : false;
      if (is_correct) correct_count += 1;
      return { question, selected_option, is_correct, correct_option };
    });

    const total_questions = questions.length;
    const incorrect_count = total_questions - correct_count;
    const score = total_questions > 0 ? (correct_count / total_questions) * 100 : 0;

    attempt.submitted_at = this._now();
    attempt.status = 'completed';
    attempt.score = score;
    attempt.total_questions = total_questions;

    this._saveToStorage('quiz_attempts', attempts);

    return {
      attempt,
      score,
      total_questions,
      correct_count,
      incorrect_count,
      question_results
    };
  }

  // getQuizResultsAndNote(quizId)
  getQuizResultsAndNote(quizId) {
    const attempts = this._getFromStorage('quiz_attempts');
    const notes = this._getFromStorage('quiz_notes');

    const quizAttempts = attempts.filter((a) => a.quiz_id === quizId);
    const last_attempt = quizAttempts
      .slice()
      .sort((a, b) => {
        const at = a.submitted_at || a.started_at;
        const bt = b.submitted_at || b.started_at;
        const av = at ? new Date(at).getTime() : 0;
        const bv = bt ? new Date(bt).getTime() : 0;
        return bv - av;
      })[0] || null;

    const quiz_note = notes.find((n) => n.quiz_id === quizId) || null;

    return { last_attempt, quiz_note };
  }

  // saveQuizNote(quizId, note_text)
  saveQuizNote(quizId, note_text) {
    let notes = this._getFromStorage('quiz_notes');
    let note = notes.find((n) => n.quiz_id === quizId);
    const now = this._now();

    if (note) {
      note.note_text = note_text;
      note.updated_at = now;
    } else {
      note = {
        id: this._generateId('quiznote'),
        quiz_id: quizId,
        note_text,
        created_at: now,
        updated_at: null
      };
      notes.push(note);
    }

    this._saveToStorage('quiz_notes', notes);

    return { quiz_note: note };
  }

  // getAllQuizNotes()
  getAllQuizNotes() {
    const notes = this._getFromStorage('quiz_notes');
    const quizzes = this._getFromStorage('quizzes');

    const result = notes.map((note) => {
      const quiz = quizzes.find((q) => q.id === note.quiz_id) || null;
      return { quiz, note };
    });

    return { notes: result };
  }

  // getToolsList()
  getToolsList() {
    const tools = this._getFromStorage('tools');
    return { tools };
  }

  // calculateInvestmentContribution(target_amount, years, annual_return_percent, contribution_frequency)
  calculateInvestmentContribution(target_amount, years, annual_return_percent, contribution_frequency) {
    const required_contribution_amount = this._calculateRequiredContributionAmount(
      target_amount,
      years,
      annual_return_percent,
      contribution_frequency
    );

    return {
      target_amount,
      years,
      annual_return_percent,
      contribution_frequency,
      required_contribution_amount
    };
  }

  // saveInvestmentGoal(name, target_amount, years, annual_return_percent, contribution_frequency, required_contribution_amount, note)
  saveInvestmentGoal(
    name,
    target_amount,
    years,
    annual_return_percent,
    contribution_frequency,
    required_contribution_amount,
    note
  ) {
    const tool_id = this._getInvestmentCalculatorToolId();
    const goals = this._getFromStorage('investment_goals');

    const goal = {
      id: this._generateId('investmentgoal'),
      tool_id,
      name: name || 'Investment goal',
      target_amount,
      years,
      annual_return_percent,
      contribution_frequency,
      required_contribution_amount,
      note: note || null,
      created_at: this._now(),
      updated_at: null
    };

    goals.push(goal);
    this._saveToStorage('investment_goals', goals);

    return { investment_goal: goal };
  }

  // getInvestmentGoals()
  getInvestmentGoals() {
    const goals = this._getFromStorage('investment_goals');
    return { goals };
  }

  // searchGlossaryTerms(query)
  searchGlossaryTerms(query) {
    const q = (query || '').trim().toLowerCase();
    const termsAll = this._getFromStorage('glossary_terms');
    const favorites = this._getFromStorage('favorite_glossary_terms');

    const resultTerms = termsAll.filter((t) => {
      if (!q) return true;
      const contains = (text) => (text || '').toLowerCase().includes(q);
      return contains(t.term) || contains(t.definition);
    });

    const terms = resultTerms.map((term) => {
      const is_favorite = favorites.some((f) => f.glossary_term_id === term.id);
      return { term, is_favorite };
    });

    return { terms };
  }

  // addFavoriteGlossaryTerm(glossaryTermId)
  addFavoriteGlossaryTerm(glossaryTermId) {
    const terms = this._getFromStorage('glossary_terms');
    const term = terms.find((t) => t.id === glossaryTermId);
    if (!term) {
      return { favorite: null };
    }

    const favorites = this._getFromStorage('favorite_glossary_terms');
    let existing = favorites.find((f) => f.glossary_term_id === glossaryTermId);
    if (existing) {
      return { favorite: existing };
    }

    const favorite = {
      id: this._generateId('favoriteglossaryterm'),
      glossary_term_id: glossaryTermId,
      added_at: this._now()
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_glossary_terms', favorites);

    return { favorite };
  }

  // removeFavoriteGlossaryTerm(glossaryTermId)
  removeFavoriteGlossaryTerm(glossaryTermId) {
    let favorites = this._getFromStorage('favorite_glossary_terms');
    const before = favorites.length;
    favorites = favorites.filter((f) => f.glossary_term_id !== glossaryTermId);
    this._saveToStorage('favorite_glossary_terms', favorites);
    return { success: before !== favorites.length };
  }

  // getFavoriteGlossaryTerms()
  getFavoriteGlossaryTerms() {
    const favorites = this._getFromStorage('favorite_glossary_terms');
    const termsAll = this._getFromStorage('glossary_terms');

    const terms = favorites
      .slice()
      .sort((a, b) => {
        const at = a.added_at ? new Date(a.added_at).getTime() : 0;
        const bt = b.added_at ? new Date(b.added_at).getTime() : 0;
        return bt - at;
      })
      .map((fav) => {
        return termsAll.find((t) => t.id === fav.glossary_term_id) || null;
      })
      .filter((t) => !!t);

    return { terms };
  }

  // getPracticeOverview()
  getPracticeOverview() {
    const watchlist = this._getOrCreatePracticeWatchlist();
    const watchlist_items = this._getFromStorage('watchlist_items');

    const watchlist_stock_count = watchlist_items.filter(
      (it) => it.watchlist_id === watchlist.id
    ).length;

    const suggested_workflows = ['build_low_volatility_us_dividend_watchlist'];

    return { practice_watchlist: watchlist, watchlist_stock_count, suggested_workflows };
  }

  // getStockFilterOptions()
  getStockFilterOptions() {
    const markets = [
      { value: 'us', label: 'US' },
      { value: 'international', label: 'International' }
    ];

    const volatility_levels = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' }
    ];

    const dividend_yield_min_values = [1, 2, 3, 4, 5];

    return { markets, volatility_levels, dividend_yield_min_values };
  }

  // searchStocks(filters, page, page_size)
  searchStocks(filters, page = 1, page_size = 50) {
    const filterObj = filters || {};
    const stocksAll = this._getFromStorage('stocks');
    const watchlist_items = this._getFromStorage('watchlist_items');
    const watchlist = this._getOrCreatePracticeWatchlist();

    let stocks = stocksAll.filter((s) => {
      if (filterObj.market && s.market !== filterObj.market) return false;
      if (filterObj.volatility_level && s.volatility_level !== filterObj.volatility_level)
        return false;
      if (typeof filterObj.min_dividend_yield_percent === 'number') {
        const dy = typeof s.dividend_yield_percent === 'number' ? s.dividend_yield_percent : 0;
        if (dy < filterObj.min_dividend_yield_percent) return false;
      }
      return true;
    });

    stocks.sort((a, b) => {
      const ay = typeof a.dividend_yield_percent === 'number' ? a.dividend_yield_percent : 0;
      const by = typeof b.dividend_yield_percent === 'number' ? b.dividend_yield_percent : 0;
      return by - ay;
    });

    const total_count = stocks.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = stocks.slice(start, end);

    const resultStocks = paged.map((stock) => {
      const is_in_watchlist = watchlist_items.some(
        (it) => it.watchlist_id === watchlist.id && it.stock_id === stock.id
      );
      return { stock, is_in_watchlist };
    });

    return {
      total_count,
      page,
      page_size,
      stocks: resultStocks
    };
  }

  // addStockToPracticeWatchlist(stockId)
  addStockToPracticeWatchlist(stockId) {
    const stocks = this._getFromStorage('stocks');
    const stock = stocks.find((s) => s.id === stockId);
    if (!stock) {
      return { watchlist_item: null, watchlist: null };
    }

    const watchlist = this._getOrCreatePracticeWatchlist();
    let items = this._getFromStorage('watchlist_items');

    let existing = items.find(
      (it) => it.watchlist_id === watchlist.id && it.stock_id === stockId
    );
    if (existing) {
      return { watchlist_item: existing, watchlist };
    }

    const watchlist_item = {
      id: this._generateId('watchlistitem'),
      watchlist_id: watchlist.id,
      stock_id: stockId,
      added_at: this._now(),
      note: null
    };

    items.push(watchlist_item);
    this._saveToStorage('watchlist_items', items);

    return { watchlist_item, watchlist };
  }

  // removeStockFromPracticeWatchlist(stockId)
  removeStockFromPracticeWatchlist(stockId) {
    const watchlist = this._getOrCreatePracticeWatchlist();
    let items = this._getFromStorage('watchlist_items');
    const before = items.length;
    items = items.filter(
      (it) => !(it.watchlist_id === watchlist.id && it.stock_id === stockId)
    );
    this._saveToStorage('watchlist_items', items);
    return { success: before !== items.length };
  }

  // getPracticeWatchlist()
  getPracticeWatchlist() {
    const watchlist = this._getOrCreatePracticeWatchlist();
    const itemsAll = this._getFromStorage('watchlist_items');
    const stocks = this._getFromStorage('stocks');

    const items = itemsAll
      .filter((it) => it.watchlist_id === watchlist.id)
      .sort((a, b) => {
        const at = a.added_at ? new Date(a.added_at).getTime() : 0;
        const bt = b.added_at ? new Date(b.added_at).getTime() : 0;
        return at - bt;
      })
      .map((watchlist_item) => {
        const stock = stocks.find((s) => s.id === watchlist_item.stock_id) || null;
        return { watchlist_item, stock };
      });

    return { watchlist, items };
  }

  // renamePracticeWatchlist(name)
  renamePracticeWatchlist(name) {
    const watchlists = this._getFromStorage('practice_watchlists');
    const watchlist = watchlists[0] || null;
    if (!watchlist) {
      const newWatchlist = {
        id: this._generateId('practicewatchlist'),
        name: name || 'Practice Watchlist',
        description: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      watchlists.push(newWatchlist);
      this._saveToStorage('practice_watchlists', watchlists);
      return { watchlist: newWatchlist };
    }

    watchlist.name = name;
    watchlist.updated_at = this._now();
    this._saveToStorage('practice_watchlists', watchlists);

    return { watchlist };
  }

  // updateWatchlistItemNote(watchlistItemId, note)
  updateWatchlistItemNote(watchlistItemId, note) {
    const items = this._getFromStorage('watchlist_items');
    const item = items.find((it) => it.id === watchlistItemId) || null;
    if (!item) return { watchlist_item: null };
    item.note = note;
    this._saveToStorage('watchlist_items', items);
    return { watchlist_item: item };
  }

  // reorderWatchlistItems(orderedItemIds)
  reorderWatchlistItems(orderedItemIds) {
    const ids = Array.isArray(orderedItemIds) ? orderedItemIds : [];
    let items = this._getFromStorage('watchlist_items');

    const idToItem = {};
    items.forEach((it) => {
      idToItem[it.id] = it;
    });

    const reordered = [];
    ids.forEach((id) => {
      if (idToItem[id]) {
        reordered.push(idToItem[id]);
      }
    });

    items
      .filter((it) => !ids.includes(it.id))
      .forEach((it) => {
        reordered.push(it);
      });

    this._saveToStorage('watchlist_items', reordered);

    return { items: reordered };
  }

  // getLibrarySection(section)
  getLibrarySection(section) {
    const sec = section;
    let reading_list = null;
    let reading_list_items = [];
    let watch_later_playlist = null;
    let watch_later_items = [];
    let bookmarks = [];
    let weekly_plan_entries = [];
    let quiz_notes = [];
    let goals = [];

    if (sec === 'reading_list') {
      const rl = this.getReadingListContents();
      reading_list = rl.reading_list;
      reading_list_items = rl.items;
    } else if (sec === 'watch_later') {
      const wl = this.getWatchLaterPlaylist();
      watch_later_playlist = wl.playlist;
      watch_later_items = wl.items;
    } else if (sec === 'bookmarks') {
      const bm = this.getBookmarkedArticles();
      bookmarks = bm.bookmarks;
    } else if (sec === 'weekly_plan') {
      const wp = this.getWeeklyPlanEntries();
      weekly_plan_entries = wp.entries;
    } else if (sec === 'quiz_notes') {
      const qn = this.getAllQuizNotes();
      quiz_notes = qn.notes;
    } else if (sec === 'goals') {
      const g = this.getInvestmentGoals();
      goals = g.goals;
    }

    return {
      section: sec,
      reading_list,
      reading_list_items,
      watch_later_playlist,
      watch_later_items,
      bookmarks,
      weekly_plan_entries,
      quiz_notes,
      goals
    };
  }

  // setActiveLibrarySection(section)
  setActiveLibrarySection(section) {
    const state = this._getOrCreateLibraryViewState();
    state.active_section = section;
    state.updated_at = this._now();
    localStorage.setItem('library_view_state', JSON.stringify(state));
    return { library_view_state: state };
  }

  // getLibraryViewState()
  getLibraryViewState() {
    return this._getOrCreateLibraryViewState();
  }

  // getAboutContent()
  getAboutContent() {
    const headline = 'Independent education on stock markets and long-term investing.';
    const body_html =
      '<p>We help individual investors understand the stock market, index funds, and long-term investing strategies without the hype.</p>';
    const mission_points = [
      'Teach core investing concepts in plain language',
      'Prioritize risk management and diversification',
      'Encourage long-term, evidence-based decision making'
    ];
    const risk_disclaimers_html =
      '<p>All investing involves risk, including the possible loss of principal. Nothing on this site constitutes financial advice.</p>';
    const editorial_standards_html =
      '<p>Our content is independently researched and reviewed. We do not accept compensation for favorable coverage of any investment product.</p>';

    return {
      headline,
      body_html,
      mission_points,
      risk_disclaimers_html,
      editorial_standards_html
    };
  }

  // submitContactMessage(name, email, topic, message)
  submitContactMessage(name, email, topic, message) {
    const contact_messages = this._getFromStorage('contact_messages');
    const ticket_id = this._generateId('ticket');
    const entry = {
      id: ticket_id,
      name,
      email,
      topic: topic || null,
      message,
      created_at: this._now()
    };
    contact_messages.push(entry);
    this._saveToStorage('contact_messages', contact_messages);

    return {
      success: true,
      ticket_id,
      message: 'Your message has been received. We will get back to you soon.'
    };
  }

  // getHelpAndPoliciesContent()
  getHelpAndPoliciesContent() {
    const faq_sections = [
      {
        title: 'Using your learning library',
        entries: [
          {
            question: 'How do I save articles to read later?',
            answer_html:
              '<p>Use the bookmark or \'Add to Reading List\' icon on any article card or page. Saved articles appear in your Library under the Reading List and Bookmarks sections.</p>'
          },
          {
            question: 'What is the Weekly Plan?',
            answer_html:
              '<p>The Weekly Plan helps you schedule learning paths for a specific week so you can track progress over time.</p>'
          }
        ]
      },
      {
        title: 'Account & privacy',
        entries: [
          {
            question: 'Do you share my data with third parties?',
            answer_html:
              '<p>We do not sell your personal information. See the Privacy Policy below for full details.</p>'
          }
        ]
      }
    ];

    const privacy_policy_html =
      '<p>We store only the minimum data required to provide your reading lists, quiz history, and goals. Data is not sold to third parties.</p>';

    const terms_of_use_html =
      '<p>All content is provided for educational purposes only and does not constitute investment, tax, or legal advice.</p>';

    const risk_disclaimer_html =
      '<p>Investing in stocks, options, and other securities involves risk. Past performance is not a guarantee of future results.</p>';

    const navigation_help_html =
      '<p>Use the Library to access your Reading List, Watch Later playlist, Bookmarks, Weekly Plan, Quiz Notes, and Goals. Each section keeps your saved learning resources organized in one place.</p>';

    return {
      faq_sections,
      privacy_policy_html,
      terms_of_use_html,
      risk_disclaimer_html,
      navigation_help_html
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
