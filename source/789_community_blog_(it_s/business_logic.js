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

  // ---------------------- Initialization & Storage Helpers ----------------------

  _initStorage() {
    const keys = [
      'tags',
      'categories',
      'authors',
      'articles',
      'comments',
      'bookmarks',
      'reading_lists',
      'reading_list_items',
      'author_follows',
      'feed_preferences',
      'content_reports',
      'questions',
      'answers',
      'question_bookmarks',
      'question_follows',
      'static_pages',
      'contact_messages'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Optional current author id (used when creating articles)
    if (!localStorage.getItem('current_author_id')) {
      // Do not create an author record here (no mock data); only store id placeholder if needed later
      localStorage.setItem('current_author_id', 'author_current');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? defaultValue : parsed;
    } catch (e) {
      return defaultValue;
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

  _slugify(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  _compareDatesDesc(a, b) {
    const da = a ? new Date(a).getTime() : 0;
    const db = b ? new Date(b).getTime() : 0;
    return db - da;
  }

  _compareDatesAsc(a, b) {
    const da = a ? new Date(a).getTime() : 0;
    const db = b ? new Date(b).getTime() : 0;
    return da - db;
  }

  _paginate(array, page = 1, pageSize = 20) {
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * size;
    const end = start + size;
    const items = array.slice(start, end);
    const hasMore = end < array.length;
    const nextPage = hasMore ? p + 1 : null;
    return { items, page: p, pageSize: size, hasMore, nextPage };
  }

  _getTagsByIds(tagIds) {
    const tags = this._getFromStorage('tags', []);
    const idSet = new Set(tagIds || []);
    return tags.filter((t) => idSet.has(t.id));
  }

  _getTagsBySlugs(slugs) {
    const tags = this._getFromStorage('tags', []);
    const slugSet = new Set((slugs || []).map((s) => String(s).toLowerCase()));
    return tags.filter((t) => slugSet.has(String(t.slug).toLowerCase()));
  }

  _getTagIdBySlug(slug) {
    if (!slug) return null;
    const tags = this._getFromStorage('tags', []);
    const lower = String(slug).toLowerCase();
    const tag = tags.find((t) => String(t.slug).toLowerCase() === lower);
    return tag ? tag.id : null;
  }

  _getTagIdsBySlugs(slugs) {
    const tags = this._getFromStorage('tags', []);
    const slugSet = new Set((slugs || []).map((s) => String(s).toLowerCase()));
    return tags
      .filter((t) => slugSet.has(String(t.slug).toLowerCase()))
      .map((t) => t.id);
  }

  _getCategoryById(id) {
    const categories = this._getFromStorage('categories', []);
    return categories.find((c) => c.id === id) || null;
  }

  _getAuthorById(id) {
    const authors = this._getFromStorage('authors', []);
    return authors.find((a) => a.id === id) || null;
  }

  _getCurrentAuthorId() {
    return localStorage.getItem('current_author_id') || 'author_current';
  }

  // ---------------------- Required Helper Stores ----------------------

  _getOrCreateBookmarksStore() {
    let bookmarks = this._getFromStorage('bookmarks', null);
    if (!Array.isArray(bookmarks)) {
      bookmarks = [];
      this._saveToStorage('bookmarks', bookmarks);
    }
    return bookmarks;
  }

  _getOrCreateReadingListsStore() {
    let readingLists = this._getFromStorage('reading_lists', null);
    if (!Array.isArray(readingLists)) {
      readingLists = [];
      this._saveToStorage('reading_lists', readingLists);
    }

    let readingListItems = this._getFromStorage('reading_list_items', null);
    if (!Array.isArray(readingListItems)) {
      readingListItems = [];
      this._saveToStorage('reading_list_items', readingListItems);
    }

    return { readingLists, readingListItems };
  }

  _getOrCreateFeedPreferencesStore() {
    let list = this._getFromStorage('feed_preferences', null);
    if (!Array.isArray(list)) {
      list = [];
    }
    if (list.length === 0) {
      const prefs = {
        id: 'feed_pref_' + this._getNextIdCounter(),
        followedTagIds: [],
        mutedTagIds: [],
        updatedAt: this._now()
      };
      list.push(prefs);
      this._saveToStorage('feed_preferences', list);
      return prefs;
    }
    return list[0];
  }

  _saveFeedPreferences(preferences) {
    let list = this._getFromStorage('feed_preferences', null);
    if (!Array.isArray(list)) {
      list = [];
    }
    if (list.length === 0) {
      list.push(preferences);
    } else {
      list[0] = preferences;
    }
    this._saveToStorage('feed_preferences', list);
  }

  _getOrCreateFollowsStore() {
    let authorFollows = this._getFromStorage('author_follows', null);
    if (!Array.isArray(authorFollows)) {
      authorFollows = [];
      this._saveToStorage('author_follows', authorFollows);
    }

    let questionFollows = this._getFromStorage('question_follows', null);
    if (!Array.isArray(questionFollows)) {
      questionFollows = [];
      this._saveToStorage('question_follows', questionFollows);
    }

    return { authorFollows, questionFollows };
  }

  // ---------------------- Foreign Key Resolution Helpers ----------------------

  _enrichArticleWithRelations(article) {
    if (!article || typeof article !== 'object') return article;
    const enriched = { ...article };

    if (article.authorId && !enriched.author) {
      enriched.author = this._getAuthorById(article.authorId);
    }

    if (article.categoryId && !enriched.category) {
      enriched.category = this._getCategoryById(article.categoryId);
    }

    if (Array.isArray(article.tagIds) && !enriched.tags) {
      enriched.tags = this._getTagsByIds(article.tagIds);
    }

    return enriched;
  }

  _enrichQuestionWithRelations(question) {
    if (!question || typeof question !== 'object') return question;
    const enriched = { ...question };

    if (question.categoryId && !enriched.category) {
      enriched.category = this._getCategoryById(question.categoryId);
    }

    if (Array.isArray(question.tagIds) && !enriched.tags) {
      enriched.tags = this._getTagsByIds(question.tagIds);
    }

    return enriched;
  }

  _enrichCommentWithRelations(comment) {
    if (!comment || typeof comment !== 'object') return comment;
    const enriched = { ...comment };

    // contentId -> content (Article, Question, Answer)
    if (comment.contentId && !enriched.content) {
      if (comment.contentType === 'article') {
        const articles = this._getFromStorage('articles', []);
        const article = articles.find((a) => a.id === comment.contentId) || null;
        enriched.content = article ? this._enrichArticleWithRelations(article) : null;
      } else if (comment.contentType === 'question') {
        const questions = this._getFromStorage('questions', []);
        const question = questions.find((q) => q.id === comment.contentId) || null;
        enriched.content = question ? this._enrichQuestionWithRelations(question) : null;
      } else if (comment.contentType === 'answer') {
        const answers = this._getFromStorage('answers', []);
        const answer = answers.find((a) => a.id === comment.contentId) || null;
        enriched.content = answer || null;
      } else {
        enriched.content = null;
      }
    }

    // parentCommentId -> parentComment
    if (comment.parentCommentId && !enriched.parentComment) {
      const comments = this._getFromStorage('comments', []);
      enriched.parentComment = comments.find((c) => c.id === comment.parentCommentId) || null;
    }

    return enriched;
  }

  _isArticlePublic(article) {
    return (
      article &&
      article.visibility === 'public' &&
      article.status === 'published'
    );
  }

  // ---------------------- Interface: getHomeFeedItems ----------------------

  getHomeFeedItems(page = 1, pageSize = 20, contentTypes) {
    const includeArticles = !contentTypes || contentTypes.includes('article');
    const includeQuestions = !contentTypes || contentTypes.includes('question');

    const articles = this._getFromStorage('articles', []);
    const questions = this._getFromStorage('questions', []);
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);
    const bookmarks = this._getOrCreateBookmarksStore();
    const questionBookmarks = this._getFromStorage('question_bookmarks', []);
    const { questionFollows } = this._getOrCreateFollowsStore();
    const preferences = this._getOrCreateFeedPreferencesStore();

    const followedTagIds = new Set(preferences.followedTagIds || []);
    const mutedTagIds = new Set(preferences.mutedTagIds || []);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const tagMapById = new Map(tags.map((t) => [t.id, t]));
    const tagMapBySlug = new Map(tags.map((t) => [String(t.slug).toLowerCase(), t]));
    const bookmarkedArticleIds = new Set(bookmarks.map((b) => b.articleId));
    const bookmarkedQuestionIds = new Set(questionBookmarks.map((b) => b.questionId));
    const followedQuestionIds = new Set(questionFollows.map((f) => f.questionId));

    const items = [];

    if (includeArticles) {
      articles.forEach((article) => {
        if (!this._isArticlePublic(article)) return;

        const artTagIds = article.tagIds || [];
        if (artTagIds.some((id) => mutedTagIds.has(id))) {
          return; // muted
        }

        const articleTags = artTagIds
          .map((id) => tagMapById.get(id))
          .filter((t) => !!t);
        const tagSlugs = articleTags.map((t) => t.slug);
        const tagNames = articleTags.map((t) => t.name);
        const category = categoryMap.get(article.categoryId) || null;

        const followedOverlapCount = artTagIds.filter((id) => followedTagIds.has(id)).length;
        const popularityScore =
          (article.popularityScore || 0) +
          (article.viewCount || 0) * 0.1 +
          (article.upvoteCount || 0) * 2 +
          (article.bookmarkCount || 0) * 3 +
          followedOverlapCount * 50;

        items.push({
          type: 'article',
          _score: popularityScore,
          article: {
            id: article.id,
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt || '',
            difficulty: article.difficulty,
            categoryName: category ? category.name : null,
            tagSlugs,
            tagNames,
            publicationDate: article.publicationDate,
            averageRating: article.averageRating || 0,
            upvoteCount: article.upvoteCount || 0,
            viewCount: article.viewCount || 0,
            isBookmarked: bookmarkedArticleIds.has(article.id)
          }
        });
      });
    }

    if (includeQuestions) {
      questions.forEach((question) => {
        if (!question) return;

        const tagIds = question.tagIds || [];
        if (tagIds.some((id) => mutedTagIds.has(id))) {
          return; // muted
        }

        const questionTags = tagIds
          .map((id) => tagMapById.get(id))
          .filter((t) => !!t);
        const tagSlugs = questionTags.map((t) => t.slug);
        const tagNames = questionTags.map((t) => t.name);
        const category = categoryMap.get(question.categoryId) || null;

        const followedOverlapCount = tagIds.filter((id) => followedTagIds.has(id)).length;
        const popularityScore =
          (question.viewCount || 0) * 0.1 +
          (question.voteCount || 0) * 2 +
          (question.answerCount || 0) * 5 +
          followedOverlapCount * 50;

        items.push({
          type: 'question',
          _score: popularityScore,
          question: {
            id: question.id,
            title: question.title,
            slug: question.slug,
            categoryName: category ? category.name : null,
            tagSlugs,
            tagNames,
            createdAt: question.createdAt,
            answerCount: question.answerCount || 0,
            viewCount: question.viewCount || 0,
            voteCount: question.voteCount || 0,
            isAnswered: !!question.isAnswered,
            isBookmarked: bookmarkedQuestionIds.has(question.id),
            isFollowed: followedQuestionIds.has(question.id)
          }
        });
      });
    }

    items.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      const aDate = a.type === 'article' ? a.article.publicationDate : a.question.createdAt;
      const bDate = b.type === 'article' ? b.article.publicationDate : b.question.createdAt;
      return this._compareDatesDesc(aDate, bDate);
    });

    const { items: pageItems, hasMore, nextPage } = this._paginate(items, page, pageSize);

    // Strip internal _score
    const cleanItems = pageItems.map((i) => {
      const { _score, ...rest } = i;
      return rest;
    });

    return {
      items: cleanItems,
      nextPage,
      hasMore
    };
  }

  // ---------------------- Interface: searchAllContent ----------------------

  searchAllContent(query, maxArticles = 10, maxQuestions = 10) {
    const q = (query || '').trim().toLowerCase();
    const articles = this._getFromStorage('articles', []);
    const questions = this._getFromStorage('questions', []);
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const tagMap = new Map(tags.map((t) => [t.id, t]));

    let matchedArticles = articles.filter((a) => this._isArticlePublic(a));
    if (q) {
      matchedArticles = matchedArticles.filter((a) => {
        const haystack = ((a.title || '') + ' ' + (a.excerpt || '') + ' ' + (a.body || '')).toLowerCase();
        return haystack.includes(q);
      });
    }

    matchedArticles.sort((a, b) => this._compareDatesDesc(a.publicationDate, b.publicationDate));
    matchedArticles = matchedArticles.slice(0, maxArticles);

    const articleResults = matchedArticles.map((article) => {
      const articleTags = (article.tagIds || [])
        .map((id) => tagMap.get(id))
        .filter((t) => !!t);
      const tagSlugs = articleTags.map((t) => t.slug);
      const category = categoryMap.get(article.categoryId) || null;
      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || '',
        difficulty: article.difficulty,
        categoryName: category ? category.name : null,
        tagSlugs,
        publicationDate: article.publicationDate,
        averageRating: article.averageRating || 0
      };
    });

    let matchedQuestions = questions;
    if (q) {
      matchedQuestions = matchedQuestions.filter((question) => {
        const haystack = ((question.title || '') + ' ' + (question.body || '')).toLowerCase();
        return haystack.includes(q);
      });
    }

    matchedQuestions.sort((a, b) => this._compareDatesDesc(a.createdAt, b.createdAt));
    matchedQuestions = matchedQuestions.slice(0, maxQuestions);

    const questionResults = matchedQuestions.map((question) => {
      const questionTags = (question.tagIds || [])
        .map((id) => tagMap.get(id))
        .filter((t) => !!t);
      const tagSlugs = questionTags.map((t) => t.slug);
      const category = categoryMap.get(question.categoryId) || null;
      return {
        id: question.id,
        title: question.title,
        slug: question.slug,
        categoryName: category ? category.name : null,
        tagSlugs,
        createdAt: question.createdAt,
        answerCount: question.answerCount || 0
      };
    });

    return {
      articles: articleResults,
      questions: questionResults
    };
  }

  // ---------------------- Interface: getArticleSearchConfig ----------------------

  getArticleSearchConfig() {
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);

    const difficulties = ['beginner', 'intermediate', 'advanced'];

    const sortOptions = [
      { id: 'most_popular', label: 'Most Popular' },
      { id: 'rating_high_to_low', label: 'Rating: High to Low' },
      { id: 'most_upvoted', label: 'Most Upvoted' },
      { id: 'newest', label: 'Newest' },
      { id: 'oldest', label: 'Oldest' }
    ];

    const dateRangePresets = [
      {
        id: 'last_6_months',
        label: 'Last 6 Months',
        description: 'Articles from the last 6 months'
      },
      {
        id: 'this_year',
        label: 'This Year',
        description: 'Articles published this calendar year'
      },
      {
        id: 'since_2021',
        label: 'Since 2021',
        description: 'Articles published in 2021 or later'
      }
    ];

    const popularTags = [...tags].sort((a, b) => {
      const aScore = (a.articleCount || 0) + (a.questionCount || 0);
      const bScore = (b.articleCount || 0) + (b.questionCount || 0);
      if (bScore !== aScore) return bScore - aScore;
      return String(a.name).localeCompare(String(b.name));
    });

    return {
      difficulties,
      sortOptions,
      dateRangePresets,
      categories,
      popularTags
    };
  }

  // ---------------------- Interface: searchArticles ----------------------

  searchArticles(query, tagSlug, filters, sortBy = 'newest', page = 1, pageSize = 20) {
    const q = (query || '').trim().toLowerCase();
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);
    const bookmarks = this._getOrCreateBookmarksStore();

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const tagMap = new Map(tags.map((t) => [t.id, t]));
    const tagMapBySlug = new Map(tags.map((t) => [String(t.slug).toLowerCase(), t]));
    const bookmarkedArticleIds = new Set(bookmarks.map((b) => b.articleId));

    let results = articles.filter((a) => this._isArticlePublic(a));

    if (q) {
      results = results.filter((a) => {
        const haystack = ((a.title || '') + ' ' + (a.excerpt || '') + ' ' + (a.body || '')).toLowerCase();
        return haystack.includes(q);
      });
    }

    if (tagSlug) {
      const tag = tagMapBySlug.get(String(tagSlug).toLowerCase());
      if (tag) {
        results = results.filter((a) => Array.isArray(a.tagIds) && a.tagIds.includes(tag.id));
      } else {
        const slugLower = String(tagSlug).toLowerCase();
        // Fallback: treat article tagIds themselves as slugs/ids when the tag record is missing
        results = results.filter(
          (a) =>
            Array.isArray(a.tagIds) &&
            a.tagIds.some((id) => String(id).toLowerCase() === slugLower)
        );
      }
    }

    if (filters && typeof filters === 'object') {
      const f = filters;
      if (Array.isArray(f.difficultyLevels) && f.difficultyLevels.length > 0) {
        const set = new Set(f.difficultyLevels.map((d) => String(d).toLowerCase()));
        results = results.filter((a) => set.has(String(a.difficulty).toLowerCase()));
      }

      if (f.fromDate) {
        const fromTime = new Date(f.fromDate).getTime();
        results = results.filter((a) => new Date(a.publicationDate).getTime() >= fromTime);
      }

      if (f.toDate) {
        const toTime = new Date(f.toDate).getTime();
        results = results.filter((a) => new Date(a.publicationDate).getTime() <= toTime);
      }

      if (typeof f.minYear === 'number') {
        results = results.filter((a) => {
          const year = new Date(a.publicationDate).getFullYear();
          return year >= f.minYear;
        });
      }

      if (typeof f.maxYear === 'number') {
        results = results.filter((a) => {
          const year = new Date(a.publicationDate).getFullYear();
          return year <= f.maxYear;
        });
      }

      if (Array.isArray(f.categoryIds) && f.categoryIds.length > 0) {
        const set = new Set(f.categoryIds);
        results = results.filter((a) => set.has(a.categoryId));
      }

      if (Array.isArray(f.requiredTagSlugs) && f.requiredTagSlugs.length > 0) {
        const requiredTagIds = this._getTagIdsBySlugs(f.requiredTagSlugs);
        results = results.filter((a) => {
          const artTagIds = new Set(a.tagIds || []);
          return requiredTagIds.every((id) => artTagIds.has(id));
        });
      }
    }

    // Sorting
    const sortKey = String(sortBy || 'newest');
    results.sort((a, b) => {
      switch (sortKey) {
        case 'most_popular': {
          const aScore =
            (a.popularityScore || 0) +
            (a.viewCount || 0) * 0.1 +
            (a.upvoteCount || 0) * 2 +
            (a.bookmarkCount || 0) * 3;
          const bScore =
            (b.popularityScore || 0) +
            (b.viewCount || 0) * 0.1 +
            (b.upvoteCount || 0) * 2 +
            (b.bookmarkCount || 0) * 3;
          if (bScore !== aScore) return bScore - aScore;
          return this._compareDatesDesc(a.publicationDate, b.publicationDate);
        }
        case 'rating_high_to_low': {
          const aRating = a.averageRating || 0;
          const bRating = b.averageRating || 0;
          if (bRating !== aRating) return bRating - aRating;
          const aCount = a.ratingCount || 0;
          const bCount = b.ratingCount || 0;
          if (bCount !== aCount) return bCount - aCount;
          return this._compareDatesDesc(a.publicationDate, b.publicationDate);
        }
        case 'most_upvoted': {
          const aUp = a.upvoteCount || 0;
          const bUp = b.upvoteCount || 0;
          if (bUp !== aUp) return bUp - aUp;
          return this._compareDatesDesc(a.publicationDate, b.publicationDate);
        }
        case 'oldest':
          return this._compareDatesAsc(a.publicationDate, b.publicationDate);
        case 'newest':
        default:
          return this._compareDatesDesc(a.publicationDate, b.publicationDate);
      }
    });

    // Instrumentation for task completion tracking
    try {
      if (q && q.includes('phishing')) {
        const value = {
          query,
          tagSlug,
          filters,
          sortBy,
          resultArticleIds: results.map(a => a.id),
          executedAt: this._now()
        };
        localStorage.setItem('task1_articleSearchContext', JSON.stringify(value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const totalCount = results.length;
    const { items: paged, page: curPage, pageSize: curSize, hasMore } = this._paginate(
      results,
      page,
      pageSize
    );

    const items = paged.map((article) => {
      const category = categoryMap.get(article.categoryId) || null;
      const articleTags = (article.tagIds || [])
        .map((id) => tagMap.get(id))
        .filter((t) => !!t);
      const tagSlugs = articleTags.map((t) => t.slug);
      const tagNames = articleTags.map((t) => t.name);
      const author = this._getAuthorById(article.authorId);

      const enrichedArticle = this._enrichArticleWithRelations(article);

      return {
        article: enrichedArticle,
        categoryName: category ? category.name : null,
        tagSlugs,
        tagNames,
        authorName: author ? author.name : null,
        isBookmarked: bookmarkedArticleIds.has(article.id)
      };
    });

    return {
      totalCount,
      items,
      page: curPage,
      pageSize: curSize,
      hasMore
    };
  }

  // ---------------------- Interface: toggleArticleBookmark ----------------------

  toggleArticleBookmark(articleId) {
    const articles = this._getFromStorage('articles', []);
    const articleIndex = articles.findIndex((a) => a.id === articleId);
    if (articleIndex === -1) {
      return {
        success: false,
        isBookmarked: false,
        bookmarkCount: 0,
        message: 'Article not found'
      };
    }

    let bookmarks = this._getOrCreateBookmarksStore();
    const existingIndex = bookmarks.findIndex((b) => b.articleId === articleId);
    let isBookmarked;

    if (existingIndex !== -1) {
      // remove bookmark
      bookmarks.splice(existingIndex, 1);
      isBookmarked = false;
      articles[articleIndex].bookmarkCount = Math.max(
        0,
        (articles[articleIndex].bookmarkCount || 0) - 1
      );
    } else {
      // add bookmark
      const bookmark = {
        id: this._generateId('bookmark'),
        articleId,
        createdAt: this._now()
      };
      bookmarks.push(bookmark);
      isBookmarked = true;
      articles[articleIndex].bookmarkCount = (articles[articleIndex].bookmarkCount || 0) + 1;
    }

    this._saveToStorage('bookmarks', bookmarks);
    this._saveToStorage('articles', articles);

    return {
      success: true,
      isBookmarked,
      bookmarkCount: articles[articleIndex].bookmarkCount || 0,
      message: isBookmarked ? 'Article bookmarked' : 'Bookmark removed'
    };
  }

  // ---------------------- Interface: getTagContext ----------------------

  getTagContext(tagSlug) {
    const tags = this._getFromStorage('tags', []);
    const lower = String(tagSlug || '').toLowerCase();
    const tag = tags.find((t) => String(t.slug).toLowerCase() === lower) || null;
    return { tag };
  }

  // ---------------------- Interface: addArticleToReadingList ----------------------

  addArticleToReadingList(articleId, readingListId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        readingListItem: null,
        alreadyInList: false,
        message: 'Article not found'
      };
    }

    const { readingLists, readingListItems } = this._getOrCreateReadingListsStore();
    const readingList = readingLists.find((rl) => rl.id === readingListId);
    if (!readingList) {
      return {
        success: false,
        readingListItem: null,
        alreadyInList: false,
        message: 'Reading list not found'
      };
    }

    const existing = readingListItems.find(
      (item) => item.articleId === articleId && item.readingListId === readingListId
    );
    if (existing) {
      return {
        success: true,
        readingListItem: existing,
        alreadyInList: true,
        message: 'Article already in reading list'
      };
    }

    const order = readingListItems.filter((i) => i.readingListId === readingListId).length + 1;
    const readingListItem = {
      id: this._generateId('reading_list_item'),
      readingListId,
      articleId,
      addedAt: this._now(),
      notes: null,
      order
    };

    readingListItems.push(readingListItem);
    readingList.articleCount = (readingList.articleCount || 0) + 1;
    article.readingListSaveCount = (article.readingListSaveCount || 0) + 1;

    this._saveToStorage('reading_list_items', readingListItems);
    this._saveToStorage('reading_lists', readingLists);
    this._saveToStorage('articles', articles);

    return {
      success: true,
      readingListItem,
      alreadyInList: false,
      message: 'Article added to reading list'
    };
  }

  // ---------------------- Interface: removeArticleFromReadingList ----------------------

  removeArticleFromReadingList(readingListId, articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    const { readingLists, readingListItems } = this._getOrCreateReadingListsStore();
    const readingList = readingLists.find((rl) => rl.id === readingListId) || null;

    const index = readingListItems.findIndex(
      (item) => item.readingListId === readingListId && item.articleId === articleId
    );

    if (index === -1) {
      return {
        success: false,
        message: 'Article not found in reading list'
      };
    }

    readingListItems.splice(index, 1);

    if (readingList) {
      readingList.articleCount = Math.max(0, (readingList.articleCount || 0) - 1);
    }

    if (article) {
      article.readingListSaveCount = Math.max(0, (article.readingListSaveCount || 0) - 1);
    }

    this._saveToStorage('reading_list_items', readingListItems);
    this._saveToStorage('reading_lists', readingLists);
    this._saveToStorage('articles', articles);

    return {
      success: true,
      message: 'Article removed from reading list'
    };
  }

  // ---------------------- Interface: getArticleDetail ----------------------

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const authors = this._getFromStorage('authors', []);
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);
    const bookmarks = this._getOrCreateBookmarksStore();
    const readingLists = this._getFromStorage('reading_lists', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        author: null,
        category: null,
        tags: [],
        isBookmarked: false,
        readingListsContaining: [],
        relatedArticles: []
      };
    }

    const author = authors.find((a) => a.id === article.authorId) || null;
    const category = categories.find((c) => c.id === article.categoryId) || null;
    const articleTags = this._getTagsByIds(article.tagIds || []);

    const isBookmarked = bookmarks.some((b) => b.articleId === articleId);

    const containingListIds = new Set(
      readingListItems.filter((i) => i.articleId === articleId).map((i) => i.readingListId)
    );
    const readingListsContaining = readingLists.filter((rl) => containingListIds.has(rl.id));

    const relatedArticles = articles
      .filter((a) => a.id !== articleId && a.categoryId === article.categoryId)
      .sort((a, b) => this._compareDatesDesc(a.publicationDate, b.publicationDate))
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        publicationDate: a.publicationDate
      }));

    const enrichedArticle = this._enrichArticleWithRelations(article);

    return {
      article: enrichedArticle,
      author,
      category,
      tags: articleTags,
      isBookmarked,
      readingListsContaining,
      relatedArticles
    };
  }

  // ---------------------- Interface: getArticleComments ----------------------

  getArticleComments(articleId) {
    const comments = this._getFromStorage('comments', []);

    const articleComments = comments.filter(
      (c) => c.contentType === 'article' && c.contentId === articleId
    );

    const replyCountMap = new Map();
    comments.forEach((c) => {
      if (c.parentCommentId) {
        const cnt = replyCountMap.get(c.parentCommentId) || 0;
        replyCountMap.set(c.parentCommentId, cnt + 1);
      }
    });

    const result = articleComments.map((c) => {
      const enrichedComment = this._enrichCommentWithRelations(c);
      return {
        comment: enrichedComment,
        authorName: null,
        authorAvatarUrl: null,
        replyCount: replyCountMap.get(c.id) || 0
      };
    });

    return result;
  }

  // ---------------------- Interface: createArticleComment ----------------------

  createArticleComment(articleId, body, commentType, parentCommentId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId);

    if (!article) {
      return {
        comment: null,
        articleCommentCount: 0
      };
    }

    const comments = this._getFromStorage('comments', []);
    const comment = {
      id: this._generateId('comment'),
      contentType: 'article',
      contentId: articleId,
      parentCommentId: parentCommentId || null,
      body,
      commentType: commentType || 'general',
      createdAt: this._now(),
      updatedAt: null,
      upvoteCount: 0,
      isPinned: false
    };

    comments.push(comment);
    article.commentCount = (article.commentCount || 0) + 1;

    this._saveToStorage('comments', comments);
    this._saveToStorage('articles', articles);

    const enrichedComment = this._enrichCommentWithRelations(comment);

    return {
      comment: enrichedComment,
      articleCommentCount: article.commentCount || 0
    };
  }

  // ---------------------- Interface: getContentReportReasons ----------------------

  getContentReportReasons() {
    return [
      {
        id: 'promoting_malicious_or_illegal_content',
        label: 'Promoting malicious or illegal content',
        description: 'Content appears to promote malware, illegal activity, or harmful downloads.'
      },
      {
        id: 'spam',
        label: 'Spam',
        description: 'Unrelated advertising, repetitive posts, or obvious spam.'
      },
      {
        id: 'harassment_or_abuse',
        label: 'Harassment or abuse',
        description: 'Content includes personal attacks, hate, or harassment.'
      },
      {
        id: 'self_promotion_or_advertising',
        label: 'Self-promotion or advertising',
        description: 'Overly promotional content not useful to the community.'
      },
      {
        id: 'off_topic',
        label: 'Off-topic',
        description: 'Does not relate to security or the current discussion.'
      },
      {
        id: 'other',
        label: 'Other',
        description: 'Something else that does not fit the above reasons.'
      }
    ];
  }

  // ---------------------- Interface: createContentReport ----------------------

  createContentReport(contentType, contentId, reason, description) {
    const validTypes = new Set(['article', 'question', 'answer', 'comment']);
    if (!validTypes.has(contentType)) {
      throw new Error('Invalid contentType for report');
    }

    const reports = this._getFromStorage('content_reports', []);
    const report = {
      id: this._generateId('content_report'),
      contentType,
      contentId,
      reason,
      description: description || null,
      createdAt: this._now(),
      status: 'open',
      resolvedAt: null
    };

    reports.push(report);
    this._saveToStorage('content_reports', reports);

    return report;
  }

  // ---------------------- Interface: getTagDirectory ----------------------

  getTagDirectory(query, sortBy = 'alphabetical', page = 1, pageSize = 50) {
    const tags = this._getFromStorage('tags', []);
    const q = (query || '').trim().toLowerCase();

    let filtered = tags;
    if (q) {
      filtered = filtered.filter((t) => {
        const name = String(t.name || '').toLowerCase();
        const slug = String(t.slug || '').toLowerCase();
        return name.includes(q) || slug.includes(q);
      });
    }

    const sortKey = String(sortBy || 'alphabetical');
    filtered.sort((a, b) => {
      if (sortKey === 'popularity') {
        const aScore = (a.articleCount || 0) + (a.questionCount || 0);
        const bScore = (b.articleCount || 0) + (b.questionCount || 0);
        if (bScore !== aScore) return bScore - aScore;
        return String(a.name).localeCompare(String(b.name));
      }
      // alphabetical
      return String(a.name).localeCompare(String(b.name));
    });

    const { items, page: curPage, hasMore } = this._paginate(filtered, page, pageSize);

    return {
      tags: items,
      page: curPage,
      hasMore
    };
  }

  // ---------------------- Interface: searchTags ----------------------

  searchTags(query, limit = 20) {
    const tags = this._getFromStorage('tags', []);
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return tags.slice(0, limit);
    }
    const filtered = tags.filter((t) => {
      const name = String(t.name || '').toLowerCase();
      const slug = String(t.slug || '').toLowerCase();
      return name.includes(q) || slug.includes(q);
    });

    filtered.sort((a, b) => {
      const aScore = (a.articleCount || 0) + (a.questionCount || 0);
      const bScore = (b.articleCount || 0) + (b.questionCount || 0);
      if (bScore !== aScore) return bScore - aScore;
      return String(a.name).localeCompare(String(b.name));
    });

    return filtered.slice(0, limit);
  }

  // ---------------------- Interface: getAuthorProfile ----------------------

  getAuthorProfile(authorId) {
    const authors = this._getFromStorage('authors', []);
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);
    const { authorFollows } = this._getOrCreateFollowsStore();

    const author = authors.find((a) => a.id === authorId) || null;
    if (!author) {
      return {
        author: null,
        isFollowed: false,
        topTags: [],
        stats: {
          articleCount: 0,
          followerCount: 0,
          averageArticleRating: 0
        },
        recentArticles: []
      };
    }

    const isFollowed = authorFollows.some((f) => f.authorId === authorId);

    const authorArticles = articles.filter((a) => a.authorId === authorId);
    const articleCount = authorArticles.length;
    const followerCount = author.followerCount || authorFollows.filter((f) => f.authorId === authorId).length;
    const avgRating =
      authorArticles.length > 0
        ? authorArticles.reduce((sum, a) => sum + (a.averageRating || 0), 0) /
          authorArticles.length
        : 0;

    const tagMapBySlug = new Map(tags.map((t) => [String(t.slug).toLowerCase(), t]));
    const tagMapByName = new Map(tags.map((t) => [String(t.name).toLowerCase(), t]));
    const topics = Array.isArray(author.topics) ? author.topics : [];

    const topTags = topics
      .map((topic) => {
        const key = String(topic || '').toLowerCase();
        return tagMapBySlug.get(key) || tagMapByName.get(key) || null;
      })
      .filter((t) => !!t);

    const recentArticles = authorArticles
      .slice()
      .sort((a, b) => this._compareDatesDesc(a.publicationDate, b.publicationDate))
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        publicationDate: a.publicationDate,
        averageRating: a.averageRating || 0,
        upvoteCount: a.upvoteCount || 0
      }));

    return {
      author,
      isFollowed,
      topTags,
      stats: {
        articleCount,
        followerCount,
        averageArticleRating: avgRating
      },
      recentArticles
    };
  }

  // ---------------------- Interface: getAuthorArticles ----------------------

  getAuthorArticles(authorId, sortBy = 'newest', page = 1, pageSize = 20) {
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('categories', []);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    let filtered = articles.filter(
      (a) => a.authorId === authorId && this._isArticlePublic(a)
    );

    const sortKey = String(sortBy || 'newest');
    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'rating_high_to_low': {
          const aRating = a.averageRating || 0;
          const bRating = b.averageRating || 0;
          if (bRating !== aRating) return bRating - aRating;
          return this._compareDatesDesc(a.publicationDate, b.publicationDate);
        }
        case 'newest':
        default:
          return this._compareDatesDesc(a.publicationDate, b.publicationDate);
      }
    });

    const totalCount = filtered.length;
    const { items: paged, page: curPage, pageSize: curSize, hasMore } = this._paginate(
      filtered,
      page,
      pageSize
    );

    const items = paged.map((article) => {
      const category = categoryMap.get(article.categoryId) || null;
      const enrichedArticle = this._enrichArticleWithRelations(article);
      return {
        article: enrichedArticle,
        categoryName: category ? category.name : null
      };
    });

    return {
      totalCount,
      items,
      page: curPage,
      pageSize: curSize,
      hasMore
    };
  }

  // ---------------------- Interface: toggleAuthorFollow ----------------------

  toggleAuthorFollow(authorId) {
    const authors = this._getFromStorage('authors', []);
    const author = authors.find((a) => a.id === authorId);
    if (!author) {
      return {
        success: false,
        isFollowed: false,
        followerCount: 0
      };
    }

    const { authorFollows } = this._getOrCreateFollowsStore();
    const index = authorFollows.findIndex((f) => f.authorId === authorId);
    let isFollowed;

    if (index !== -1) {
      authorFollows.splice(index, 1);
      isFollowed = false;
      author.followerCount = Math.max(0, (author.followerCount || 0) - 1);
    } else {
      const follow = {
        id: this._generateId('author_follow'),
        authorId,
        createdAt: this._now()
      };
      authorFollows.push(follow);
      isFollowed = true;
      author.followerCount = (author.followerCount || 0) + 1;
    }

    this._saveToStorage('author_follows', authorFollows);
    this._saveToStorage('authors', authors);

    return {
      success: true,
      isFollowed,
      followerCount: author.followerCount || 0
    };
  }

  // ---------------------- Interface: getPostEditorConfig ----------------------

  getPostEditorConfig() {
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);

    const articleCategories = categories.filter(
      (c) => c.applicableTo === 'articles' || c.applicableTo === 'both'
    );

    const difficulties = ['beginner', 'intermediate', 'advanced'];

    const tagSuggestions = [...tags].sort((a, b) => {
      const aScore = (a.articleCount || 0) + (a.questionCount || 0);
      const bScore = (b.articleCount || 0) + (b.questionCount || 0);
      if (bScore !== aScore) return bScore - aScore;
      return String(a.name).localeCompare(String(b.name));
    });

    const visibilityOptions = ['public', 'private', 'unlisted'];

    return {
      categories: articleCategories,
      difficulties,
      tagSuggestions,
      visibilityOptions
    };
  }

  // ---------------------- Interface: createArticle ----------------------

  createArticle(title, body, categoryId, difficulty, tagIds, visibility, status = 'published') {
    const now = this._now();
    const articles = this._getFromStorage('articles', []);

    const article = {
      id: this._generateId('article'),
      title,
      slug: this._slugify(title),
      body,
      excerpt: (body || '').slice(0, 280),
      authorId: this._getCurrentAuthorId(),
      categoryId,
      difficulty,
      tagIds: Array.isArray(tagIds) ? tagIds : [],
      publicationDate: now,
      createdAt: now,
      updatedAt: null,
      visibility,
      status,
      averageRating: 0,
      ratingCount: 0,
      upvoteCount: 0,
      viewCount: 0,
      popularityScore: 0,
      commentCount: 0,
      bookmarkCount: 0,
      readingListSaveCount: 0
    };

    articles.push(article);
    this._saveToStorage('articles', articles);

    return article;
  }

  // ---------------------- Interface: getReadingLists ----------------------

  getReadingLists() {
    const readingLists = this._getFromStorage('reading_lists', []);
    return readingLists;
  }

  // ---------------------- Interface: createReadingList ----------------------

  createReadingList(name, description, isDefault = false) {
    const readingLists = this._getFromStorage('reading_lists', []);
    const now = this._now();

    const readingList = {
      id: this._generateId('reading_list'),
      name,
      description: description || null,
      createdAt: now,
      updatedAt: null,
      articleCount: 0,
      isDefault: !!isDefault
    };

    readingLists.push(readingList);
    this._saveToStorage('reading_lists', readingLists);

    return readingList;
  }

  // ---------------------- Interface: getReadingListDetail ----------------------

  getReadingListDetail(readingListId) {
    const readingLists = this._getFromStorage('reading_lists', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);

    const readingList = readingLists.find((rl) => rl.id === readingListId) || null;

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const tagMap = new Map(tags.map((t) => [t.id, t]));

    const items = readingListItems
      .filter((item) => item.readingListId === readingListId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((item) => {
        const article = articles.find((a) => a.id === item.articleId) || null;
        const categoryName = article && categoryMap.get(article.categoryId)
          ? categoryMap.get(article.categoryId).name
          : null;
        const tagSlugs = (article && article.tagIds
          ? article.tagIds.map((id) => tagMap.get(id)).filter((t) => !!t)
          : []
        ).map((t) => t.slug);

        const enrichedArticle = article ? this._enrichArticleWithRelations(article) : null;
        const enrichedItem = {
          ...item,
          readingList,
          article: enrichedArticle
        };

        return {
          readingListItem: enrichedItem,
          article: enrichedArticle,
          categoryName,
          tagSlugs
        };
      });

    return {
      readingList,
      items
    };
  }

  // ---------------------- Interface: renameReadingList ----------------------

  renameReadingList(readingListId, name) {
    const readingLists = this._getFromStorage('reading_lists', []);
    const readingList = readingLists.find((rl) => rl.id === readingListId) || null;
    if (!readingList) {
      return null;
    }
    readingList.name = name;
    readingList.updatedAt = this._now();
    this._saveToStorage('reading_lists', readingLists);
    return readingList;
  }

  // ---------------------- Interface: deleteReadingList ----------------------

  deleteReadingList(readingListId) {
    let readingLists = this._getFromStorage('reading_lists', []);
    let readingListItems = this._getFromStorage('reading_list_items', []);

    const index = readingLists.findIndex((rl) => rl.id === readingListId);
    if (index === -1) {
      return {
        success: false,
        message: 'Reading list not found'
      };
    }

    readingLists.splice(index, 1);
    readingListItems = readingListItems.filter((item) => item.readingListId !== readingListId);

    this._saveToStorage('reading_lists', readingLists);
    this._saveToStorage('reading_list_items', readingListItems);

    return {
      success: true,
      message: 'Reading list deleted'
    };
  }

  // ---------------------- Interface: getBookmarkedArticles ----------------------

  getBookmarkedArticles(query, tagSlugs, sortBy = 'newest', page = 1, pageSize = 20) {
    const bookmarks = this._getOrCreateBookmarksStore();
    const articles = this._getFromStorage('articles', []);
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const tagMap = new Map(tags.map((t) => [t.id, t]));
    const q = (query || '').trim().toLowerCase();

    const filterTagIds = this._getTagIdsBySlugs(tagSlugs || []);
    const filterTagIdSet = new Set(filterTagIds);

    let joined = bookmarks
      .map((bookmark) => {
        const article = articles.find((a) => a.id === bookmark.articleId) || null;
        if (!article) return null;
        return { bookmark, article };
      })
      .filter((x) => !!x);

    if (q) {
      joined = joined.filter(({ article }) => {
        const haystack = ((article.title || '') + ' ' + (article.excerpt || '')).toLowerCase();
        return haystack.includes(q);
      });
    }

    if (filterTagIdSet.size > 0) {
      joined = joined.filter(({ article }) => {
        const ids = new Set(article.tagIds || []);
        for (const id of filterTagIdSet) {
          if (ids.has(id)) return true;
        }
        return false;
      });
    }

    const sortKey = String(sortBy || 'newest');
    joined.sort((a, b) => {
      const artA = a.article;
      const artB = b.article;
      switch (sortKey) {
        case 'most_popular': {
          const aScore =
            (artA.popularityScore || 0) +
            (artA.viewCount || 0) * 0.1 +
            (artA.upvoteCount || 0) * 2 +
            (artA.bookmarkCount || 0) * 3;
          const bScore =
            (artB.popularityScore || 0) +
            (artB.viewCount || 0) * 0.1 +
            (artB.upvoteCount || 0) * 2 +
            (artB.bookmarkCount || 0) * 3;
          if (bScore !== aScore) return bScore - aScore;
          return this._compareDatesDesc(artA.publicationDate, artB.publicationDate);
        }
        case 'rating_high_to_low': {
          const aRating = artA.averageRating || 0;
          const bRating = artB.averageRating || 0;
          if (bRating !== aRating) return bRating - aRating;
          return this._compareDatesDesc(artA.publicationDate, artB.publicationDate);
        }
        case 'newest':
        default:
          return this._compareDatesDesc(a.bookmark.createdAt, b.bookmark.createdAt);
      }
    });

    const totalCount = joined.length;
    const { items: paged, page: curPage, pageSize: curSize, hasMore } = this._paginate(
      joined,
      page,
      pageSize
    );

    const items = paged.map(({ bookmark, article }) => {
      const category = categoryMap.get(article.categoryId) || null;
      const bookmarkWithArticle = {
        ...bookmark,
        article: this._enrichArticleWithRelations(article)
      };
      const enrichedArticle = this._enrichArticleWithRelations(article);
      return {
        bookmark: bookmarkWithArticle,
        article: enrichedArticle,
        categoryName: category ? category.name : null
      };
    });

    return {
      totalCount,
      items,
      page: curPage,
      pageSize: curSize,
      hasMore
    };
  }

  // ---------------------- Interface: removeArticleBookmark ----------------------

  removeArticleBookmark(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    let bookmarks = this._getOrCreateBookmarksStore();
    const index = bookmarks.findIndex((b) => b.articleId === articleId);

    if (index === -1) {
      return {
        success: false,
        message: 'Bookmark not found'
      };
    }

    bookmarks.splice(index, 1);
    if (article) {
      article.bookmarkCount = Math.max(0, (article.bookmarkCount || 0) - 1);
    }

    this._saveToStorage('bookmarks', bookmarks);
    this._saveToStorage('articles', articles);

    return {
      success: true,
      message: 'Bookmark removed'
    };
  }

  // ---------------------- Interface: getFeedPreferencesDetail ----------------------

  getFeedPreferencesDetail() {
    const preferences = this._getOrCreateFeedPreferencesStore();
    const tags = this._getFromStorage('tags', []);

    const followedTagIds = new Set(preferences.followedTagIds || []);
    const mutedTagIds = new Set(preferences.mutedTagIds || []);

    const followedTags = tags.filter((t) => followedTagIds.has(t.id));
    const mutedTags = tags.filter((t) => mutedTagIds.has(t.id));

    const enrichedPreferences = {
      ...preferences,
      followedTags,
      mutedTags
    };

    return {
      preferences: enrichedPreferences,
      followedTags,
      mutedTags
    };
  }

  // ---------------------- Interface: updateFeedPreferences ----------------------

  updateFeedPreferences(followedTagIds, mutedTagIds) {
    const preferences = this._getOrCreateFeedPreferencesStore();

    if (Array.isArray(followedTagIds)) {
      preferences.followedTagIds = [...followedTagIds];
    }
    if (Array.isArray(mutedTagIds)) {
      preferences.mutedTagIds = [...mutedTagIds];
    }
    preferences.updatedAt = this._now();

    this._saveFeedPreferences(preferences);
    return preferences;
  }

  // ---------------------- Interface: getQuestionSearchConfig ----------------------

  getQuestionSearchConfig() {
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);

    const questionCategories = categories.filter(
      (c) => c.applicableTo === 'questions' || c.applicableTo === 'both'
    );

    const sortOptions = [
      { id: 'newest', label: 'Newest' },
      { id: 'most_answered', label: 'Most Answered' },
      { id: 'most_viewed', label: 'Most Viewed' }
    ];

    const tagSuggestions = [...tags].sort((a, b) => {
      const aScore = a.questionCount || 0;
      const bScore = b.questionCount || 0;
      if (bScore !== aScore) return bScore - aScore;
      return String(a.name).localeCompare(String(b.name));
    });

    return {
      categories: questionCategories,
      sortOptions,
      tagSuggestions
    };
  }

  // ---------------------- Interface: getQuestionList ----------------------

  getQuestionList(query, filters, sortBy = 'newest', page = 1, pageSize = 20) {
    const questions = this._getFromStorage('questions', []);
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);
    const questionBookmarks = this._getFromStorage('question_bookmarks', []);
    const { questionFollows } = this._getOrCreateFollowsStore();

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const tagMap = new Map(tags.map((t) => [t.id, t]));

    const bookmarkedQuestionIds = new Set(questionBookmarks.map((b) => b.questionId));
    const followedQuestionIds = new Set(questionFollows.map((f) => f.questionId));

    const q = (query || '').trim().toLowerCase();

    let filtered = questions;

    if (q) {
      filtered = filtered.filter((question) => {
        const haystack = ((question.title || '') + ' ' + (question.body || '')).toLowerCase();
        return haystack.includes(q);
      });
    }

    if (filters && typeof filters === 'object') {
      const f = filters;

      if (Array.isArray(f.categoryIds) && f.categoryIds.length > 0) {
        const set = new Set(f.categoryIds);
        filtered = filtered.filter((qst) => set.has(qst.categoryId));
      }

      if (Array.isArray(f.tagSlugs) && f.tagSlugs.length > 0) {
        const filterIds = this._getTagIdsBySlugs(f.tagSlugs);
        const filterSet = new Set(filterIds);
        filtered = filtered.filter((qst) => {
          const ids = new Set(qst.tagIds || []);
          for (const id of filterSet) {
            if (ids.has(id)) return true;
          }
          return false;
        });
      }
    }

    const sortKey = String(sortBy || 'newest');
    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'most_answered': {
          const aCount = a.answerCount || 0;
          const bCount = b.answerCount || 0;
          if (bCount !== aCount) return bCount - aCount;
          return this._compareDatesDesc(a.createdAt, b.createdAt);
        }
        case 'most_viewed': {
          const aViews = a.viewCount || 0;
          const bViews = b.viewCount || 0;
          if (bViews !== aViews) return bViews - aViews;
          return this._compareDatesDesc(a.createdAt, b.createdAt);
        }
        case 'newest':
        default:
          return this._compareDatesDesc(a.createdAt, b.createdAt);
      }
    });

    const totalCount = filtered.length;
    const { items: paged, page: curPage, pageSize: curSize, hasMore } = this._paginate(
      filtered,
      page,
      pageSize
    );

    const items = paged.map((question) => {
      const category = categoryMap.get(question.categoryId) || null;
      const questionTags = (question.tagIds || [])
        .map((id) => tagMap.get(id))
        .filter((t) => !!t);
      const tagSlugs = questionTags.map((t) => t.slug);
      const tagNames = questionTags.map((t) => t.name);

      const enrichedQuestion = this._enrichQuestionWithRelations(question);

      return {
        question: enrichedQuestion,
        categoryName: category ? category.name : null,
        tagSlugs,
        tagNames,
        isBookmarked: bookmarkedQuestionIds.has(question.id),
        isFollowed: followedQuestionIds.has(question.id)
      };
    });

    return {
      totalCount,
      items,
      page: curPage,
      pageSize: curSize,
      hasMore
    };
  }

  // ---------------------- Interface: getQuestionEditorConfig ----------------------

  getQuestionEditorConfig() {
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);

    const questionCategories = categories.filter(
      (c) => c.applicableTo === 'questions' || c.applicableTo === 'both'
    );

    const tagSuggestions = [...tags].sort((a, b) => {
      const aScore = a.questionCount || 0;
      const bScore = b.questionCount || 0;
      if (bScore !== aScore) return bScore - aScore;
      return String(a.name).localeCompare(String(b.name));
    });

    return {
      categories: questionCategories,
      tagSuggestions
    };
  }

  // ---------------------- Interface: createQuestion ----------------------

  createQuestion(title, body, categoryId, tagIds) {
    const now = this._now();
    const questions = this._getFromStorage('questions', []);

    const question = {
      id: this._generateId('question'),
      title,
      slug: this._slugify(title),
      body,
      categoryId,
      tagIds: Array.isArray(tagIds) ? tagIds : [],
      createdAt: now,
      updatedAt: null,
      answerCount: 0,
      viewCount: 0,
      voteCount: 0,
      bookmarkCount: 0,
      followCount: 0,
      isAnswered: false,
      lastActivityAt: now
    };

    questions.push(question);
    this._saveToStorage('questions', questions);

    return question;
  }

  // ---------------------- Interface: getQuestionDetail ----------------------

  getQuestionDetail(questionId) {
    const questions = this._getFromStorage('questions', []);
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);
    const answers = this._getFromStorage('answers', []);
    const comments = this._getFromStorage('comments', []);
    const questionBookmarks = this._getFromStorage('question_bookmarks', []);
    const { questionFollows } = this._getOrCreateFollowsStore();

    const question = questions.find((q) => q.id === questionId) || null;
    if (!question) {
      return {
        question: null,
        category: null,
        tags: [],
        answers: [],
        questionComments: [],
        isBookmarked: false,
        isFollowed: false
      };
    }

    const category = categories.find((c) => c.id === question.categoryId) || null;
    const questionTags = this._getTagsByIds(question.tagIds || []);

    const questionAnswers = answers.filter((a) => a.questionId === questionId);
    const answerComments = comments.filter((c) => c.contentType === 'answer');
    const questionComments = comments
      .filter((c) => c.contentType === 'question' && c.contentId === questionId)
      .map((c) => this._enrichCommentWithRelations(c));

    const answersWithComments = questionAnswers.map((answer) => {
      const commentsForAnswer = answerComments
        .filter((c) => c.contentId === answer.id)
        .map((c) => this._enrichCommentWithRelations(c));

      const enrichedAnswer = {
        ...answer,
        question
      };

      return {
        answer: enrichedAnswer,
        comments: commentsForAnswer
      };
    });

    const isBookmarked = questionBookmarks.some((b) => b.questionId === questionId);
    const isFollowed = questionFollows.some((f) => f.questionId === questionId);

    const enrichedQuestion = this._enrichQuestionWithRelations(question);

    return {
      question: enrichedQuestion,
      category,
      tags: questionTags,
      answers: answersWithComments,
      questionComments,
      isBookmarked,
      isFollowed
    };
  }

  // ---------------------- Interface: createAnswer ----------------------

  createAnswer(questionId, body) {
    const answers = this._getFromStorage('answers', []);
    const questions = this._getFromStorage('questions', []);

    const question = questions.find((q) => q.id === questionId) || null;
    if (!question) {
      return null;
    }

    const now = this._now();
    const answer = {
      id: this._generateId('answer'),
      questionId,
      body,
      createdAt: now,
      updatedAt: null,
      voteCount: 0,
      isAccepted: false
    };

    answers.push(answer);
    question.answerCount = (question.answerCount || 0) + 1;
    question.lastActivityAt = now;

    this._saveToStorage('answers', answers);
    this._saveToStorage('questions', questions);

    return answer;
  }

  // ---------------------- Interface: createQuestionOrAnswerComment ----------------------

  createQuestionOrAnswerComment(contentType, contentId, body, parentCommentId) {
    const valid = new Set(['question', 'answer']);
    if (!valid.has(contentType)) {
      throw new Error('contentType must be "question" or "answer"');
    }

    const comments = this._getFromStorage('comments', []);
    const now = this._now();

    const comment = {
      id: this._generateId('comment'),
      contentType,
      contentId,
      parentCommentId: parentCommentId || null,
      body,
      commentType: 'general',
      createdAt: now,
      updatedAt: null,
      upvoteCount: 0,
      isPinned: false
    };

    comments.push(comment);

    if (contentType === 'question') {
      const questions = this._getFromStorage('questions', []);
      const question = questions.find((q) => q.id === contentId) || null;
      if (question) {
        question.lastActivityAt = now;
        this._saveToStorage('questions', questions);
      }
    }

    this._saveToStorage('comments', comments);

    return this._enrichCommentWithRelations(comment);
  }

  // ---------------------- Interface: toggleQuestionFollow ----------------------

  toggleQuestionFollow(questionId) {
    const questions = this._getFromStorage('questions', []);
    const question = questions.find((q) => q.id === questionId) || null;
    if (!question) {
      return {
        success: false,
        isFollowed: false,
        followCount: 0
      };
    }

    const { questionFollows } = this._getOrCreateFollowsStore();
    const index = questionFollows.findIndex((f) => f.questionId === questionId);
    let isFollowed;

    if (index !== -1) {
      questionFollows.splice(index, 1);
      isFollowed = false;
      question.followCount = Math.max(0, (question.followCount || 0) - 1);
    } else {
      const follow = {
        id: this._generateId('question_follow'),
        questionId,
        createdAt: this._now()
      };
      questionFollows.push(follow);
      isFollowed = true;
      question.followCount = (question.followCount || 0) + 1;
    }

    this._saveToStorage('question_follows', questionFollows);
    this._saveToStorage('questions', questions);

    return {
      success: true,
      isFollowed,
      followCount: question.followCount || 0
    };
  }

  // ---------------------- Interface: toggleQuestionBookmark ----------------------

  toggleQuestionBookmark(questionId) {
    const questions = this._getFromStorage('questions', []);
    const question = questions.find((q) => q.id === questionId) || null;
    if (!question) {
      return {
        success: false,
        isBookmarked: false,
        bookmarkCount: 0
      };
    }

    let questionBookmarks = this._getFromStorage('question_bookmarks', []);
    const index = questionBookmarks.findIndex((b) => b.questionId === questionId);
    let isBookmarked;

    if (index !== -1) {
      questionBookmarks.splice(index, 1);
      isBookmarked = false;
      question.bookmarkCount = Math.max(0, (question.bookmarkCount || 0) - 1);
    } else {
      const bookmark = {
        id: this._generateId('question_bookmark'),
        questionId,
        createdAt: this._now()
      };
      questionBookmarks.push(bookmark);
      isBookmarked = true;
      question.bookmarkCount = (question.bookmarkCount || 0) + 1;
    }

    this._saveToStorage('question_bookmarks', questionBookmarks);
    this._saveToStorage('questions', questions);

    return {
      success: true,
      isBookmarked,
      bookmarkCount: question.bookmarkCount || 0
    };
  }

  // ---------------------- Interface: getStaticPage ----------------------

  getStaticPage(slug) {
    const staticPages = this._getFromStorage('static_pages', []);
    const page = staticPages.find((p) => p.slug === slug) || null;

    if (!page) {
      return {
        title: slug || '',
        body: '',
        lastUpdated: ''
      };
    }

    return {
      title: page.title || '',
      body: page.body || '',
      lastUpdated: page.lastUpdated || ''
    };
  }

  // ---------------------- Interface: submitContactMessage ----------------------

  submitContactMessage(name, email, subject, message, category) {
    const contactMessages = this._getFromStorage('contact_messages', []);

    const msg = {
      id: this._generateId('contact_msg'),
      name,
      email,
      subject,
      message,
      category: category || null,
      createdAt: this._now()
    };

    contactMessages.push(msg);
    this._saveToStorage('contact_messages', contactMessages);

    return {
      success: true,
      messageId: msg.id
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