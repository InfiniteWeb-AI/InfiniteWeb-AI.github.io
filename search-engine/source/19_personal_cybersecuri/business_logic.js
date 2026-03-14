/* eslint-disable no-var */
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
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const tableKeys = [
      "categories",
      "tags",
      "series",
      "articles",
      "article_tags",
      "collections",
      "collection_items",
      "article_comments",
      "feedback_reasons",
      "article_feedback",
      "article_feedback_reason_selections",
      "notification_settings",
      "static_pages",
      "contact_info",
      "contact_messages"
    ];

    for (let i = 0; i < tableKeys.length; i++) {
      const key = tableKeys[i];
      if (!localStorage.getItem(key)) {
        // Initialize arrays by default, some keys will be overwritten with objects below
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // authState as object
    if (!localStorage.getItem("authState")) {
      localStorage.setItem(
        "authState",
        JSON.stringify({ isAuthenticated: true, username: "testuser" })
      );
    }

    // contact_info as object
    if (!localStorage.getItem("contact_info")) {
      localStorage.setItem(
        "contact_info",
        JSON.stringify({ email: "", pgpPublicKeyBlock: "", otherChannels: [] })
      );
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // If parsing fails, reset to default
      const fallback = defaultValue !== undefined ? defaultValue : [];
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentRaw = localStorage.getItem("idCounter");
    const current = parseInt(currentRaw || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  // -------------------- Auth helpers --------------------

  _getAuthState() {
    return this._getFromStorage("authState", { isAuthenticated: false, username: null });
  }

  _setAuthState(state) {
    this._saveToStorage("authState", state || { isAuthenticated: false, username: null });
  }

  _requireAuthentication() {
    const auth = this._getAuthState();
    if (!auth || !auth.isAuthenticated) {
      throw new Error("Authentication required");
    }
    return auth;
  }

  // -------------------- Domain helpers --------------------

  _getOrCreateDefaultReadingList() {
    let collections = this._getFromStorage("collections", []);
    let defaultCollection = null;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].is_default_reading_list === true) {
        defaultCollection = collections[i];
        break;
      }
    }
    if (!defaultCollection) {
      const now = new Date().toISOString();
      defaultCollection = {
        id: this._generateId("collection"),
        name: "Reading List",
        description: "",
        is_default_reading_list: true,
        created_at: now
      };
      collections.push(defaultCollection);
      this._saveToStorage("collections", collections);
    }
    return defaultCollection;
  }

  _updateArticleCommentCount(articleId) {
    const comments = this._getFromStorage("article_comments", []);
    const articles = this._getFromStorage("articles", []);
    let count = 0;
    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      if (c.article_id === articleId && !c.is_deleted) {
        count++;
      }
    }
    let updated = false;
    for (let j = 0; j < articles.length; j++) {
      if (articles[j].id === articleId) {
        articles[j].comment_count = count;
        updated = true;
        break;
      }
    }
    if (updated) {
      this._saveToStorage("articles", articles);
    }
    return count;
  }

  _updateArticleRatingAggregates(articleId) {
    const feedback = this._getFromStorage("article_feedback", []);
    const articles = this._getFromStorage("articles", []);
    let sum = 0;
    let count = 0;
    for (let i = 0; i < feedback.length; i++) {
      if (feedback[i].article_id === articleId) {
        sum += feedback[i].rating_stars || 0;
        count++;
      }
    }
    const average = count > 0 ? sum / count : 0;
    let updated = false;
    for (let j = 0; j < articles.length; j++) {
      if (articles[j].id === articleId) {
        articles[j].average_rating = average;
        articles[j].rating_count = count;
        updated = true;
        break;
      }
    }
    if (updated) {
      this._saveToStorage("articles", articles);
    }
    return { average_rating: average, rating_count: count };
  }

  _copyTextToClipboard(text) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        // Fallback: store last copied text in localStorage
        localStorage.setItem("clipboardLastCopiedText", JSON.stringify({ text: text, copiedAt: new Date().toISOString() }));
      }
      return { success: true, message: "Link copied" };
    } catch (e) {
      return { success: false, message: "Failed to copy link" };
    }
  }

  _saveNotificationSettingsToStorage(settings) {
    this._saveToStorage("notification_settings", settings || []);
  }

  _buildArticleListItem(article, options) {
    options = options || {};
    const categories = options.categories || this._getFromStorage("categories", []);
    const articleTags = options.articleTags || this._getFromStorage("article_tags", []);
    const tags = options.tags || this._getFromStorage("tags", []);
    const bookmarkedIdsSet = options.bookmarkedIdsSet || null;

    const category = (function () {
      for (let i = 0; i < categories.length; i++) {
        if (categories[i].id === article.category_id) {
          return categories[i];
        }
      }
      return null;
    })();

    const tagLinks = [];
    for (let i = 0; i < articleTags.length; i++) {
      if (articleTags[i].article_id === article.id) {
        tagLinks.push(articleTags[i]);
      }
    }
    const tagObjects = [];
    for (let j = 0; j < tagLinks.length; j++) {
      const tagId = tagLinks[j].tag_id;
      for (let k = 0; k < tags.length; k++) {
        if (tags[k].id === tagId) {
          tagObjects.push(tags[k]);
          break;
        }
      }
    }

    const isBookmarked = bookmarkedIdsSet ? bookmarkedIdsSet.has(article.id) : false;

    return {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      categoryId: article.category_id,
      categoryName: category ? category.name : null,
      contentType: article.content_type,
      summary: article.summary || "",
      publishedAt: article.published_at || null,
      readingTimeMinutes: article.reading_time_minutes,
      upvotes: article.upvotes,
      averageRating: article.average_rating || 0,
      commentCount: article.comment_count || 0,
      difficulty: article.difficulty || "unspecified",
      challengeYear: article.challenge_year || null,
      tags: tagObjects.map(function (t) {
        return { id: t.id, slug: t.slug, name: t.name };
      }),
      isBookmarkedInReadingList: isBookmarked,
      readingStatus: article.reading_status || "not_started",
      // Foreign key resolution
      category: category,
      article: article
    };
  }

  _getDefaultReadingListBookmarkedIdsSet() {
    const defaultList = this._getOrCreateDefaultReadingList();
    const collectionItems = this._getFromStorage("collection_items", []);
    const set = new Set();
    for (let i = 0; i < collectionItems.length; i++) {
      if (collectionItems[i].collection_id === defaultList.id) {
        set.add(collectionItems[i].article_id);
      }
    }
    return set;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // -------------------- Interface implementations --------------------

  // login(username, password)
  login(username, password) {
    const validUsername = "testuser";
    const validPassword = "Password123!";
    let success = false;
    let isAuthenticated = false;
    let message = "Invalid username or password";

    if (username === validUsername && password === validPassword) {
      success = true;
      isAuthenticated = true;
      message = "Login successful";
      this._setAuthState({ isAuthenticated: true, username: username });
    } else {
      this._setAuthState({ isAuthenticated: false, username: null });
    }

    return { success: success, message: message, isAuthenticated: isAuthenticated };
  }

  // getCategoriesForNavigation()
  getCategoriesForNavigation() {
    const categories = this._getFromStorage("categories", []);
    return categories;
  }

  // getHomePageContent()
  getHomePageContent() {
    const articles = this._getFromStorage("articles", []);
    const categories = this._getFromStorage("categories", []);
    const articleTags = this._getFromStorage("article_tags", []);
    const tags = this._getFromStorage("tags", []);
    const bookmarkedIdsSet = this._getDefaultReadingListBookmarkedIdsSet();

    // Featured: sort by upvotes desc
    const articlesCopy1 = articles.slice();
    articlesCopy1.sort(function (a, b) {
      const ua = typeof a.upvotes === "number" ? a.upvotes : 0;
      const ub = typeof b.upvotes === "number" ? b.upvotes : 0;
      return ub - ua;
    });
    const featuredArticles = [];
    for (let i = 0; i < articlesCopy1.length && i < 5; i++) {
      featuredArticles.push(
        this._buildArticleListItem(articlesCopy1[i], {
          categories: categories,
          articleTags: articleTags,
          tags: tags,
          bookmarkedIdsSet: bookmarkedIdsSet
        })
      );
    }

    // Latest: sort by published_at desc
    const articlesCopy2 = articles.slice();
    articlesCopy2.sort((a, b) => {
      const da = this._parseDate(a.published_at);
      const db = this._parseDate(b.published_at);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });
    const latestArticles = [];
    for (let j = 0; j < articlesCopy2.length && j < 10; j++) {
      latestArticles.push(
        this._buildArticleListItem(articlesCopy2[j], {
          categories: categories,
          articleTags: articleTags,
          tags: tags,
          bookmarkedIdsSet: bookmarkedIdsSet
        })
      );
    }

    return { featuredArticles: featuredArticles, latestArticles: latestArticles };
  }

  // getPopularSeriesForHome()
  getPopularSeriesForHome() {
    const series = this._getFromStorage("series", []);
    const seriesCopy = series.slice();
    seriesCopy.sort(function (a, b) {
      const pa = typeof a.popularity_score === "number" ? a.popularity_score : 0;
      const pb = typeof b.popularity_score === "number" ? b.popularity_score : 0;
      return pb - pa;
    });
    // Return a short list, e.g., top 5
    return seriesCopy.slice(0, 5);
  }

  // getCategoryFilterOptions(categoryId)
  getCategoryFilterOptions(categoryId) {
    const articles = this._getFromStorage("articles", []);
    const articleTags = this._getFromStorage("article_tags", []);
    const tags = this._getFromStorage("tags", []);

    const filteredArticles = [];
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].category_id === categoryId) {
        filteredArticles.push(articles[i]);
      }
    }

    // availableTags
    const tagIdSet = new Set();
    for (let j = 0; j < articleTags.length; j++) {
      const at = articleTags[j];
      if (at && at.article_id) {
        for (let k = 0; k < filteredArticles.length; k++) {
          if (filteredArticles[k].id === at.article_id) {
            tagIdSet.add(at.tag_id);
            break;
          }
        }
      }
    }
    const availableTags = [];
    for (let m = 0; m < tags.length; m++) {
      if (tagIdSet.has(tags[m].id)) {
        availableTags.push(tags[m]);
      }
    }

    // difficultyOptions
    const difficultySet = new Set();
    for (let n = 0; n < filteredArticles.length; n++) {
      const diff = filteredArticles[n].difficulty;
      if (diff) {
        difficultySet.add(diff);
      }
    }
    const difficultyOptions = Array.from(difficultySet);

    // readingTimeRange & upvoteRange
    let minMinutes = null;
    let maxMinutes = null;
    let minUpvotes = null;
    let maxUpvotes = null;
    for (let p = 0; p < filteredArticles.length; p++) {
      const a = filteredArticles[p];
      const rt = a.reading_time_minutes;
      if (typeof rt === "number") {
        if (minMinutes === null || rt < minMinutes) minMinutes = rt;
        if (maxMinutes === null || rt > maxMinutes) maxMinutes = rt;
      }
      const uv = a.upvotes;
      if (typeof uv === "number") {
        if (minUpvotes === null || uv < minUpvotes) minUpvotes = uv;
        if (maxUpvotes === null || uv > maxUpvotes) maxUpvotes = uv;
      }
    }

    const availableSortOptions = [
      {
        value: "newest_first",
        label: "Newest first",
        description: "Most recently published first"
      },
      {
        value: "shortest_reading_time",
        label: "Shortest reading time",
        description: "Articles with the least reading time first"
      },
      {
        value: "highest_rated",
        label: "Highest rated",
        description: "Articles with the highest average rating first"
      },
      {
        value: "most_commented",
        label: "Most commented",
        description: "Articles with the most comments first"
      }
    ];

    return {
      availableTags: availableTags,
      difficultyOptions: difficultyOptions,
      readingTimeRange: { minMinutes: minMinutes, maxMinutes: maxMinutes },
      upvoteRange: { minUpvotes: minUpvotes, maxUpvotes: maxUpvotes },
      availableSortOptions: availableSortOptions
    };
  }

  // getCategoryArticles(categoryId, tagSlugs, dateFrom, dateTo, readingTimeMax, difficulty, minUpvotes, challengeYearFrom, challengeYearTo, sort, page, pageSize)
  getCategoryArticles(
    categoryId,
    tagSlugs,
    dateFrom,
    dateTo,
    readingTimeMax,
    difficulty,
    minUpvotes,
    challengeYearFrom,
    challengeYearTo,
    sort,
    page,
    pageSize
  ) {
    page = page || 1;
    pageSize = pageSize || 20;

    const articles = this._getFromStorage("articles", []);
    const categories = this._getFromStorage("categories", []);
    const articleTags = this._getFromStorage("article_tags", []);
    const tags = this._getFromStorage("tags", []);
    const bookmarkedIdsSet = this._getDefaultReadingListBookmarkedIdsSet();

    let filtered = [];
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (a.category_id === categoryId) {
        filtered.push(a);
      }
    }

    // Tag filter
    if (tagSlugs && tagSlugs.length > 0) {
      const filteredTagSlugs = tagSlugs.filter(function (s) { return !!s; });
      if (filteredTagSlugs.length > 0) {
        const tagIdBySlug = {};
        for (let t = 0; t < tags.length; t++) {
          tagIdBySlug[tags[t].slug] = tags[t].id;
        }
        const requiredTagIds = [];
        for (let rs = 0; rs < filteredTagSlugs.length; rs++) {
          const slug = filteredTagSlugs[rs];
          if (tagIdBySlug[slug]) {
            requiredTagIds.push(tagIdBySlug[slug]);
          }
        }
        if (requiredTagIds.length > 0) {
          filtered = filtered.filter(function (article) {
            const articleTagIds = [];
            for (let at = 0; at < articleTags.length; at++) {
              if (articleTags[at].article_id === article.id) {
                articleTagIds.push(articleTags[at].tag_id);
              }
            }
            // Require all specified tags to be present
            for (let q = 0; q < requiredTagIds.length; q++) {
              if (articleTagIds.indexOf(requiredTagIds[q]) === -1) {
                return false;
              }
            }
            return true;
          });
        }
      }
    }

    // Date filters
    const fromDate = this._parseDate(dateFrom);
    const toDate = this._parseDate(dateTo);
    if (fromDate || toDate) {
      filtered = filtered.filter((a) => {
        const d = this._parseDate(a.published_at);
        if (!d) return false;
        if (fromDate && d.getTime() < fromDate.getTime()) return false;
        if (toDate && d.getTime() > toDate.getTime()) return false;
        return true;
      });
    }

    if (typeof readingTimeMax === "number") {
      filtered = filtered.filter(function (a) {
        return typeof a.reading_time_minutes === "number" && a.reading_time_minutes <= readingTimeMax;
      });
    }

    if (difficulty) {
      filtered = filtered.filter(function (a) {
        return a.difficulty === difficulty;
      });
    }

    if (typeof minUpvotes === "number") {
      filtered = filtered.filter(function (a) {
        return typeof a.upvotes === "number" && a.upvotes >= minUpvotes;
      });
    }

    if (typeof challengeYearFrom === "number" || typeof challengeYearTo === "number") {
      filtered = filtered.filter(function (a) {
        const year = a.challenge_year;
        if (typeof year !== "number") return false;
        if (typeof challengeYearFrom === "number" && year < challengeYearFrom) return false;
        if (typeof challengeYearTo === "number" && year > challengeYearTo) return false;
        return true;
      });
    }

    // Sorting
    if (sort === "shortest_reading_time") {
      filtered.sort(function (a, b) {
        const ra = typeof a.reading_time_minutes === "number" ? a.reading_time_minutes : 0;
        const rb = typeof b.reading_time_minutes === "number" ? b.reading_time_minutes : 0;
        return ra - rb;
      });
    } else if (sort === "highest_rated") {
      filtered.sort(function (a, b) {
        const aa = typeof a.average_rating === "number" ? a.average_rating : 0;
        const ab = typeof b.average_rating === "number" ? b.average_rating : 0;
        return ab - aa;
      });
    } else if (sort === "most_commented") {
      filtered.sort(function (a, b) {
        const ca = typeof a.comment_count === "number" ? a.comment_count : 0;
        const cb = typeof b.comment_count === "number" ? b.comment_count : 0;
        return cb - ca;
      });
    } else {
      // default newest_first
      filtered.sort((a, b) => {
        const da = this._parseDate(a.published_at);
        const db = this._parseDate(b.published_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      });
    }

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = filtered.slice(start, end);

    const articlesOut = [];
    for (let z = 0; z < paged.length; z++) {
      articlesOut.push(
        this._buildArticleListItem(paged[z], {
          categories: categories,
          articleTags: articleTags,
          tags: tags,
          bookmarkedIdsSet: bookmarkedIdsSet
        })
      );
    }

    return {
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
      articles: articlesOut
    };
  }

  // getSearchFilterOptions()
  getSearchFilterOptions() {
    const tags = this._getFromStorage("tags", []);

    const contentTypeOptions = [
      { value: "guides_how_tos", label: "Guides / How-tos" },
      { value: "reviews", label: "Reviews" },
      { value: "articles", label: "Articles" },
      { value: "write_ups", label: "Write-ups" },
      { value: "series_parts", label: "Series parts" }
    ];

    const availableSortOptions = [
      {
        value: "relevance",
        label: "Best match",
        description: "Sort by relevance to your search query"
      },
      {
        value: "newest",
        label: "Newest",
        description: "Most recently published first"
      },
      {
        value: "most_commented",
        label: "Most commented",
        description: "Articles with the most comments first"
      },
      {
        value: "highest_rated",
        label: "Highest rated",
        description: "Articles with the highest average rating first"
      }
    ];

    return {
      contentTypeOptions: contentTypeOptions,
      topicTags: tags,
      availableSortOptions: availableSortOptions
    };
  }

  // searchArticles(query, contentTypes, tagSlugs, sort, page, pageSize)
  searchArticles(query, contentTypes, tagSlugs, sort, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 20;

    const rawQ = (query || "").toLowerCase();
    const q = rawQ.replace(/[^a-z0-9]+/g, "");
    const articles = this._getFromStorage("articles", []);
    const categories = this._getFromStorage("categories", []);
    const articleTags = this._getFromStorage("article_tags", []);
    const tags = this._getFromStorage("tags", []);
    const bookmarkedIdsSet = this._getDefaultReadingListBookmarkedIdsSet();

    let filtered = articles.slice();

    if (q) {
      filtered = filtered.filter(function (a) {
        const title = (a.title || "").toLowerCase();
        const summary = (a.summary || "").toLowerCase();
        const normTitle = title.replace(/[^a-z0-9]+/g, "");
        const normSummary = summary.replace(/[^a-z0-9]+/g, "");
        return normTitle.indexOf(q) !== -1 || normSummary.indexOf(q) !== -1;
      });
    }

    if (contentTypes && contentTypes.length > 0) {
      const setCT = new Set(contentTypes);
      filtered = filtered.filter(function (a) {
        return setCT.has(a.content_type);
      });
    }

    if (tagSlugs && tagSlugs.length > 0) {
      const filteredTagSlugs = tagSlugs.filter(function (s) { return !!s; });
      if (filteredTagSlugs.length > 0) {
        const tagIdBySlug = {};
        for (let t = 0; t < tags.length; t++) {
          tagIdBySlug[tags[t].slug] = tags[t].id;
        }
        const requiredTagIds = [];
        for (let rs = 0; rs < filteredTagSlugs.length; rs++) {
          const slug = filteredTagSlugs[rs];
          if (tagIdBySlug[slug]) {
            requiredTagIds.push(tagIdBySlug[slug]);
          }
        }
        if (requiredTagIds.length > 0) {
          filtered = filtered.filter(function (article) {
            const articleTagIds = [];
            for (let at = 0; at < articleTags.length; at++) {
              if (articleTags[at].article_id === article.id) {
                articleTagIds.push(articleTags[at].tag_id);
              }
            }
            for (let q2 = 0; q2 < requiredTagIds.length; q2++) {
              if (articleTagIds.indexOf(requiredTagIds[q2]) === -1) {
                return false;
              }
            }
            return true;
          });
        }
      }
    }

    // Sorting
    if (sort === "most_commented") {
      filtered.sort(function (a, b) {
        const ca = typeof a.comment_count === "number" ? a.comment_count : 0;
        const cb = typeof b.comment_count === "number" ? b.comment_count : 0;
        return cb - ca;
      });
    } else if (sort === "highest_rated") {
      filtered.sort(function (a, b) {
        const aa = typeof a.average_rating === "number" ? a.average_rating : 0;
        const ab = typeof b.average_rating === "number" ? b.average_rating : 0;
        return ab - aa;
      });
    } else if (sort === "newest") {
      filtered.sort((a, b) => {
        const da = this._parseDate(a.published_at);
        const db = this._parseDate(b.published_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      });
    } else {
      // relevance: simple score based on matches
      const withScores = filtered.map(function (a) {
        const title = (a.title || "").toLowerCase();
        const summary = (a.summary || "").toLowerCase();
        const normTitle = title.replace(/[^a-z0-9]+/g, "");
        const normSummary = summary.replace(/[^a-z0-9]+/g, "");
        let score = 0;
        if (q && normTitle.indexOf(q) !== -1) score += 2;
        if (q && normSummary.indexOf(q) !== -1) score += 1;
        return { article: a, score: score };
      });
      withScores.sort((x, y) => {
        if (y.score !== x.score) return y.score - x.score;
        const da = this._parseDate(x.article.published_at);
        const db = this._parseDate(y.article.published_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      });
      filtered = withScores.map(function (ws) { return ws.article; });
    }

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = filtered.slice(start, end);

    const results = [];
    for (let i = 0; i < paged.length; i++) {
      results.push(
        this._buildArticleListItem(paged[i], {
          categories: categories,
          articleTags: articleTags,
          tags: tags,
          bookmarkedIdsSet: bookmarkedIdsSet
        })
      );
    }

    return {
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
      results: results
    };
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage("articles", []);
    const categories = this._getFromStorage("categories", []);
    const tags = this._getFromStorage("tags", []);
    const articleTags = this._getFromStorage("article_tags", []);
    const seriesList = this._getFromStorage("series", []);
    const collections = this._getFromStorage("collections", []);
    const collectionItems = this._getFromStorage("collection_items", []);
    const bookmarkedIdsSet = this._getDefaultReadingListBookmarkedIdsSet();

    let article = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        article = articles[i];
        break;
      }
    }
    if (!article) {
      return null;
    }

    let category = null;
    for (let c = 0; c < categories.length; c++) {
      if (categories[c].id === article.category_id) {
        category = categories[c];
        break;
      }
    }

    const tagObjects = [];
    for (let at = 0; at < articleTags.length; at++) {
      if (articleTags[at].article_id === article.id) {
        const tagId = articleTags[at].tag_id;
        for (let t = 0; t < tags.length; t++) {
          if (tags[t].id === tagId) {
            tagObjects.push(tags[t]);
            break;
          }
        }
      }
    }

    let seriesMeta = null;
    if (article.series_id) {
      for (let s = 0; s < seriesList.length; s++) {
        if (seriesList[s].id === article.series_id) {
          seriesMeta = seriesList[s];
          break;
        }
      }
    }

    let seriesInfo = null;
    if (seriesMeta) {
      seriesInfo = {
        seriesId: seriesMeta.id,
        seriesTitle: seriesMeta.title,
        seriesSlug: seriesMeta.slug,
        seriesPartNumber: article.series_part_number || null,
        totalParts: seriesMeta.total_parts
      };
    }

    const collectionsContaining = [];
    for (let ci = 0; ci < collectionItems.length; ci++) {
      const item = collectionItems[ci];
      if (item.article_id === article.id) {
        for (let col = 0; col < collections.length; col++) {
          if (collections[col].id === item.collection_id) {
            collectionsContaining.push({
              collectionId: collections[col].id,
              name: collections[col].name,
              isDefaultReadingList: !!collections[col].is_default_reading_list
            });
            break;
          }
        }
      }
    }

    const auth = this._getAuthState();
    const canComment = !!(auth && auth.isAuthenticated);
    const canSubmitFeedback = !!(auth && auth.isAuthenticated);

    const details = {
      articleId: article.id,
      slug: article.slug,
      title: article.title,
      categoryId: article.category_id,
      categoryName: category ? category.name : null,
      contentType: article.content_type,
      summary: article.summary || "",
      contentHtml: article.content_html || "",
      publishedAt: article.published_at || null,
      updatedAt: article.updated_at || null,
      readingTimeMinutes: article.reading_time_minutes,
      upvotes: article.upvotes,
      difficulty: article.difficulty || "unspecified",
      commentCount: article.comment_count || 0,
      averageRating: article.average_rating || 0,
      ratingCount: article.rating_count || 0,
      challengeYear: article.challenge_year || null,
      recommendedTools: article.recommended_tools || [],
      tags: tagObjects,
      series: seriesInfo,
      readingStatus: article.reading_status || "not_started",
      isBookmarkedInReadingList: bookmarkedIdsSet.has(article.id),
      collectionsContaining: collectionsContaining,
      canComment: canComment,
      canSubmitFeedback: canSubmitFeedback,
      // Foreign key resolution
      category: category,
      article: article,
      seriesObject: seriesMeta || null
    };

    // Instrumentation for task completion tracking
    try {
      if (article && article.series_id && typeof article.series_part_number === "number") {
        const partNumber = article.series_part_number;
        if (partNumber >= 1 && partNumber <= 4 && partNumber % 1 === 0) {
          const rawSeriesOpened = localStorage.getItem("task7_seriesOpened");
          if (rawSeriesOpened) {
            let seriesOpened = null;
            try {
              seriesOpened = JSON.parse(rawSeriesOpened);
            } catch (e2) {
              seriesOpened = null;
            }
            if (seriesOpened && seriesOpened.seriesId && seriesOpened.seriesId === article.series_id) {
              let openedPartsData = null;
              const rawOpenedParts = localStorage.getItem("task7_openedParts");
              if (rawOpenedParts) {
                try {
                  openedPartsData = JSON.parse(rawOpenedParts);
                } catch (e3) {
                  openedPartsData = null;
                }
              }
              if (!openedPartsData || openedPartsData.seriesId !== article.series_id) {
                openedPartsData = {
                  seriesId: article.series_id,
                  partNumbers: [],
                  lastUpdatedAt: null
                };
              }
              if (!Array.isArray(openedPartsData.partNumbers)) {
                openedPartsData.partNumbers = [];
              }
              if (openedPartsData.partNumbers.indexOf(partNumber) === -1) {
                openedPartsData.partNumbers.push(partNumber);
              }
              openedPartsData.lastUpdatedAt = new Date().toISOString();
              localStorage.setItem("task7_openedParts", JSON.stringify(openedPartsData));
            }
          }
        }
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return details;
  }

  // getArticleComments(articleId, page, pageSize)
  getArticleComments(articleId, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 20;
    const comments = this._getFromStorage("article_comments", []);

    const filtered = [];
    for (let i = 0; i < comments.length; i++) {
      if (comments[i].article_id === articleId) {
        filtered.push(comments[i]);
      }
    }

    filtered.sort(function (a, b) {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return da - db;
    });

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = filtered.slice(start, end);

    const commentsOut = paged.map(function (c) {
      return {
        commentId: c.id,
        content: c.content,
        createdAt: c.created_at || null,
        updatedAt: c.updated_at || null,
        isDeleted: !!c.is_deleted,
        upvotes: typeof c.upvotes === "number" ? c.upvotes : 0
      };
    });

    return {
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
      comments: commentsOut
    };
  }

  // postArticleComment(articleId, content)
  postArticleComment(articleId, content) {
    try {
      this._requireAuthentication();
    } catch (e) {
      return {
        success: false,
        message: e.message || "Authentication required",
        comment: null,
        newTotalCommentCount: null
      };
    }

    const text = content || "";
    if (text.length < 15) {
      return {
        success: false,
        message: "Comment must be at least 15 characters.",
        comment: null,
        newTotalCommentCount: null
      };
    }

    const comments = this._getFromStorage("article_comments", []);
    const now = new Date().toISOString();

    const newComment = {
      id: this._generateId("comment"),
      article_id: articleId,
      content: text,
      created_at: now,
      updated_at: null,
      is_deleted: false,
      upvotes: 0
    };
    comments.push(newComment);
    this._saveToStorage("article_comments", comments);

    const newTotal = this._updateArticleCommentCount(articleId);

    return {
      success: true,
      message: "Comment posted successfully.",
      comment: {
        commentId: newComment.id,
        content: newComment.content,
        createdAt: newComment.created_at,
        updatedAt: newComment.updated_at
      },
      newTotalCommentCount: newTotal
    };
  }

  // toggleBookmarkDefaultReadingList(articleId)
  toggleBookmarkDefaultReadingList(articleId) {
    try {
      this._requireAuthentication();
    } catch (e) {
      return {
        success: false,
        message: e.message || "Authentication required",
        isBookmarked: false,
        collectionId: null,
        collectionName: null,
        totalItemsInCollection: 0
      };
    }

    const defaultList = this._getOrCreateDefaultReadingList();
    const collectionItems = this._getFromStorage("collection_items", []);

    let existingIndex = -1;
    for (let i = 0; i < collectionItems.length; i++) {
      if (
        collectionItems[i].collection_id === defaultList.id &&
        collectionItems[i].article_id === articleId
      ) {
        existingIndex = i;
        break;
      }
    }

    let isBookmarked = false;
    if (existingIndex >= 0) {
      collectionItems.splice(existingIndex, 1);
      isBookmarked = false;
    } else {
      const now = new Date().toISOString();
      collectionItems.push({
        id: this._generateId("collection_item"),
        collection_id: defaultList.id,
        article_id: articleId,
        added_at: now
      });
      isBookmarked = true;
    }

    this._saveToStorage("collection_items", collectionItems);

    let totalItems = 0;
    for (let j = 0; j < collectionItems.length; j++) {
      if (collectionItems[j].collection_id === defaultList.id) {
        totalItems++;
      }
    }

    return {
      success: true,
      message: isBookmarked ? "Added to Reading List" : "Removed from Reading List",
      isBookmarked: isBookmarked,
      collectionId: defaultList.id,
      collectionName: defaultList.name,
      totalItemsInCollection: totalItems
    };
  }

  // addArticleToCollection(articleId, collectionId)
  addArticleToCollection(articleId, collectionId) {
    try {
      this._requireAuthentication();
    } catch (e) {
      return {
        success: false,
        message: e.message || "Authentication required",
        collectionId: collectionId,
        collectionName: null,
        wasAlreadyInCollection: false
      };
    }

    const collections = this._getFromStorage("collections", []);
    const collectionItems = this._getFromStorage("collection_items", []);

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
        message: "Collection not found.",
        collectionId: collectionId,
        collectionName: null,
        wasAlreadyInCollection: false
      };
    }

    let existing = false;
    for (let j = 0; j < collectionItems.length; j++) {
      if (
        collectionItems[j].collection_id === collectionId &&
        collectionItems[j].article_id === articleId
      ) {
        existing = true;
        break;
      }
    }

    if (!existing) {
      const now = new Date().toISOString();
      collectionItems.push({
        id: this._generateId("collection_item"),
        collection_id: collectionId,
        article_id: articleId,
        added_at: now
      });
      this._saveToStorage("collection_items", collectionItems);
    }

    return {
      success: true,
      message: existing ? "Article was already in collection" : "Article added to collection",
      collectionId: collectionId,
      collectionName: collection.name,
      wasAlreadyInCollection: existing
    };
  }

  // createCollectionAndAddArticle(articleId, name, description)
  createCollectionAndAddArticle(articleId, name, description) {
    try {
      this._requireAuthentication();
    } catch (e) {
      return {
        success: false,
        message: e.message || "Authentication required",
        collection: null,
        articleAdded: false
      };
    }

    const collections = this._getFromStorage("collections", []);
    const collectionItems = this._getFromStorage("collection_items", []);
    const now = new Date().toISOString();

    const newCollection = {
      id: this._generateId("collection"),
      name: name,
      description: description || "",
      is_default_reading_list: false,
      created_at: now
    };
    collections.push(newCollection);
    this._saveToStorage("collections", collections);

    collectionItems.push({
      id: this._generateId("collection_item"),
      collection_id: newCollection.id,
      article_id: articleId,
      added_at: now
    });
    this._saveToStorage("collection_items", collectionItems);

    return {
      success: true,
      message: "Collection created and article added.",
      collection: {
        collectionId: newCollection.id,
        name: newCollection.name,
        description: newCollection.description,
        isDefaultReadingList: !!newCollection.is_default_reading_list,
        createdAt: newCollection.created_at
      },
      articleAdded: true
    };
  }

  // setArticleReadingStatus(articleId, readingStatus)
  setArticleReadingStatus(articleId, readingStatus) {
    try {
      this._requireAuthentication();
    } catch (e) {
      return {
        success: false,
        message: e.message || "Authentication required",
        readingStatus: null
      };
    }

    const allowed = ["not_started", "in_progress", "completed"];
    if (allowed.indexOf(readingStatus) === -1) {
      return {
        success: false,
        message: "Invalid reading status.",
        readingStatus: null
      };
    }

    const articles = this._getFromStorage("articles", []);
    let updated = false;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        articles[i].reading_status = readingStatus;
        updated = true;
        break;
      }
    }

    if (!updated) {
      return {
        success: false,
        message: "Article not found.",
        readingStatus: null
      };
    }

    this._saveToStorage("articles", articles);
    return {
      success: true,
      message: "Reading status updated.",
      readingStatus: readingStatus
    };
  }

  // copyArticleLinkToClipboard(articleId)
  copyArticleLinkToClipboard(articleId) {
    const baseUrl = "https://example.com";
    const url = baseUrl + "/article.html?articleId=" + encodeURIComponent(articleId);
    const result = this._copyTextToClipboard(url);
    return result;
  }

  // getFeedbackReasons()
  getFeedbackReasons() {
    const reasons = this._getFromStorage("feedback_reasons", []);
    return reasons;
  }

  // submitArticleFeedback(articleId, ratingStars, reasonCodes, comment)
  submitArticleFeedback(articleId, ratingStars, reasonCodes, comment) {
    try {
      this._requireAuthentication();
    } catch (e) {
      return {
        success: false,
        message: e.message || "Authentication required",
        feedbackId: null,
        newAverageRating: null,
        newRatingCount: null
      };
    }

    if (typeof ratingStars !== "number" || ratingStars < 1 || ratingStars > 5) {
      return {
        success: false,
        message: "ratingStars must be a number between 1 and 5.",
        feedbackId: null,
        newAverageRating: null,
        newRatingCount: null
      };
    }

    if (comment && comment.length > 0 && comment.length < 20) {
      return {
        success: false,
        message: "Comment must be at least 20 characters when provided.",
        feedbackId: null,
        newAverageRating: null,
        newRatingCount: null
      };
    }

    const feedbackList = this._getFromStorage("article_feedback", []);
    const reasonSelections = this._getFromStorage("article_feedback_reason_selections", []);

    const now = new Date().toISOString();

    const feedbackId = this._generateId("feedback");
    const newFeedback = {
      id: feedbackId,
      article_id: articleId,
      rating_stars: ratingStars,
      comment: comment || "",
      created_at: now
    };
    feedbackList.push(newFeedback);
    this._saveToStorage("article_feedback", feedbackList);

    if (reasonCodes && reasonCodes.length > 0) {
      for (let i = 0; i < reasonCodes.length; i++) {
        const code = reasonCodes[i];
        if (!code) continue;
        reasonSelections.push({
          id: this._generateId("feedback_reason_selection"),
          article_feedback_id: feedbackId,
          reason_code: code
        });
      }
      this._saveToStorage("article_feedback_reason_selections", reasonSelections);
    }

    const agg = this._updateArticleRatingAggregates(articleId);

    return {
      success: true,
      message: "Feedback submitted.",
      feedbackId: feedbackId,
      newAverageRating: agg.average_rating,
      newRatingCount: agg.rating_count
    };
  }

  // getSeriesFilterOptions()
  getSeriesFilterOptions() {
    const topicOptions = [
      { value: "web_application_security", label: "Web Application Security" },
      { value: "network_security", label: "Network Security" },
      { value: "osint", label: "OSINT" },
      { value: "general", label: "General" }
    ];

    const availableSortOptions = [
      {
        value: "most_popular",
        label: "Most popular",
        description: "Series with the highest popularity score first"
      },
      {
        value: "newest",
        label: "Newest",
        description: "Most recently created series first"
      }
    ];

    return {
      topicOptions: topicOptions,
      availableSortOptions: availableSortOptions
    };
  }

  // getSeriesList(topic, sort, page, pageSize)
  getSeriesList(topic, sort, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 20;

    const series = this._getFromStorage("series", []);
    let filtered = series.slice();

    if (topic) {
      filtered = filtered.filter(function (s) { return s.topic === topic; });
    }

    if (sort === "newest") {
      filtered.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    } else {
      // default most_popular
      filtered.sort(function (a, b) {
        const pa = typeof a.popularity_score === "number" ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === "number" ? b.popularity_score : 0;
        return pb - pa;
      });
    }

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = filtered.slice(start, end);

    return {
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
      series: paged
    };
  }

  // getSeriesDetails(seriesId)
  getSeriesDetails(seriesId) {
    const seriesList = this._getFromStorage("series", []);
    const articles = this._getFromStorage("articles", []);

    let series = null;
    for (let i = 0; i < seriesList.length; i++) {
      if (seriesList[i].id === seriesId) {
        series = seriesList[i];
        break;
      }
    }
    if (!series) {
      return null;
    }

    const parts = [];
    for (let j = 0; j < articles.length; j++) {
      if (articles[j].series_id === seriesId) {
        parts.push(articles[j]);
      }
    }

    // Fallback: if no explicit parts are linked to this series, synthesize
    // parts from existing articles so the series exposes at least some content.
    if (parts.length === 0 && typeof series.total_parts === "number" && series.total_parts > 0) {
      const fallbackArticles = articles.slice().sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return da - db;
      });
      const maxParts = Math.min(series.total_parts, fallbackArticles.length);
      for (let k = 0; k < maxParts; k++) {
        const fa = fallbackArticles[k];
        parts.push({
          id: fa.id,
          slug: fa.slug,
          title: fa.title,
          series_part_number: k + 1,
          reading_time_minutes: fa.reading_time_minutes,
          published_at: fa.published_at
        });
      }
    }

    parts.sort(function (a, b) {
      const pa = typeof a.series_part_number === "number" ? a.series_part_number : 0;
      const pb = typeof b.series_part_number === "number" ? b.series_part_number : 0;
      return pa - pb;
    });

    const partsOut = parts.map(function (a) {
      return {
        articleId: a.id,
        slug: a.slug,
        title: a.title,
        seriesPartNumber: a.series_part_number || null,
        readingTimeMinutes: a.reading_time_minutes,
        publishedAt: a.published_at || null
      };
    });

    // Instrumentation for task completion tracking
    try {
      if (
        series &&
        series.topic === "web_application_security" &&
        series.title &&
        typeof series.title === "string" &&
        series.title.toLowerCase().indexOf("web app penetration testing") !== -1
      ) {
        localStorage.setItem(
          "task7_seriesOpened",
          JSON.stringify({
            seriesId: series.id,
            title: series.title,
            openedAt: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      seriesId: series.id,
      title: series.title,
      slug: series.slug,
      description: series.description || "",
      topic: series.topic,
      totalParts: series.total_parts,
      estimatedTotalTimeMinutes: series.estimated_total_time_minutes || null,
      createdAt: series.created_at || null,
      updatedAt: series.updated_at || null,
      parts: partsOut
    };
  }

  // getReadingListArticles()
  getReadingListArticles() {
    try {
      this._requireAuthentication();
    } catch (e) {
      return {
        collectionId: null,
        collectionName: null,
        items: []
      };
    }

    const defaultList = this._getOrCreateDefaultReadingList();
    const collectionItems = this._getFromStorage("collection_items", []);
    const articles = this._getFromStorage("articles", []);
    const categories = this._getFromStorage("categories", []);

    const itemsOut = [];
    for (let i = 0; i < collectionItems.length; i++) {
      const ci = collectionItems[i];
      if (ci.collection_id !== defaultList.id) continue;

      let article = null;
      for (let a = 0; a < articles.length; a++) {
        if (articles[a].id === ci.article_id) {
          article = articles[a];
          break;
        }
      }
      if (!article) continue;

      let category = null;
      for (let c = 0; c < categories.length; c++) {
        if (categories[c].id === article.category_id) {
          category = categories[c];
          break;
        }
      }

      const item = {
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        categoryId: article.category_id,
        categoryName: category ? category.name : null,
        readingTimeMinutes: article.reading_time_minutes,
        addedAt: ci.added_at || null,
        readingStatus: article.reading_status || "not_started",
        upvotes: article.upvotes,
        publishedAt: article.published_at || null,
        // Foreign key resolution
        article: article,
        category: category
      };
      itemsOut.push(item);
    }

    return {
      collectionId: defaultList.id,
      collectionName: defaultList.name,
      items: itemsOut
    };
  }

  // getCollectionsOverview()
  getCollectionsOverview() {
    try {
      this._requireAuthentication();
    } catch (e) {
      return [];
    }

    const collections = this._getFromStorage("collections", []);
    const collectionItems = this._getFromStorage("collection_items", []);

    const counts = {};
    for (let i = 0; i < collectionItems.length; i++) {
      const cid = collectionItems[i].collection_id;
      if (!counts[cid]) counts[cid] = 0;
      counts[cid]++;
    }

    const overview = collections.map(function (c) {
      return {
        collectionId: c.id,
        name: c.name,
        description: c.description || "",
        isDefaultReadingList: !!c.is_default_reading_list,
        totalItems: counts[c.id] || 0,
        createdAt: c.created_at || null
      };
    });

    return overview;
  }

  // getCollectionItems(collectionId)
  getCollectionItems(collectionId) {
    try {
      this._requireAuthentication();
    } catch (e) {
      return {
        collectionId: collectionId,
        collectionName: null,
        isDefaultReadingList: false,
        items: []
      };
    }

    const collections = this._getFromStorage("collections", []);
    const collectionItems = this._getFromStorage("collection_items", []);
    const articles = this._getFromStorage("articles", []);
    const categories = this._getFromStorage("categories", []);

    let collection = null;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === collectionId) {
        collection = collections[i];
        break;
      }
    }

    if (!collection) {
      return {
        collectionId: collectionId,
        collectionName: null,
        isDefaultReadingList: false,
        items: []
      };
    }

    const itemsOut = [];
    for (let j = 0; j < collectionItems.length; j++) {
      const ci = collectionItems[j];
      if (ci.collection_id !== collectionId) continue;

      let article = null;
      for (let a = 0; a < articles.length; a++) {
        if (articles[a].id === ci.article_id) {
          article = articles[a];
          break;
        }
      }
      if (!article) continue;

      let category = null;
      for (let c = 0; c < categories.length; c++) {
        if (categories[c].id === article.category_id) {
          category = categories[c];
          break;
        }
      }

      itemsOut.push({
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        categoryId: article.category_id,
        categoryName: category ? category.name : null,
        readingTimeMinutes: article.reading_time_minutes,
        addedAt: ci.added_at || null,
        readingStatus: article.reading_status || "not_started",
        upvotes: article.upvotes,
        publishedAt: article.published_at || null,
        // Foreign key resolution
        article: article,
        category: category
      });
    }

    return {
      collectionId: collection.id,
      collectionName: collection.name,
      isDefaultReadingList: !!collection.is_default_reading_list,
      items: itemsOut
    };
  }

  // removeArticleFromCollection(collectionId, articleId)
  removeArticleFromCollection(collectionId, articleId) {
    try {
      this._requireAuthentication();
    } catch (e) {
      return { success: false, message: e.message || "Authentication required", remainingItems: 0 };
    }

    const collectionItems = this._getFromStorage("collection_items", []);
    let changed = false;

    for (let i = collectionItems.length - 1; i >= 0; i--) {
      if (
        collectionItems[i].collection_id === collectionId &&
        collectionItems[i].article_id === articleId
      ) {
        collectionItems.splice(i, 1);
        changed = true;
      }
    }

    if (changed) {
      this._saveToStorage("collection_items", collectionItems);
    }

    let remaining = 0;
    for (let j = 0; j < collectionItems.length; j++) {
      if (collectionItems[j].collection_id === collectionId) remaining++;
    }

    return {
      success: true,
      message: changed ? "Article removed from collection" : "Article not found in collection",
      remainingItems: remaining
    };
  }

  // renameCollection(collectionId, newName)
  renameCollection(collectionId, newName) {
    try {
      this._requireAuthentication();
    } catch (e) {
      return {
        success: false,
        message: e.message || "Authentication required",
        collectionId: collectionId,
        name: null
      };
    }

    const collections = this._getFromStorage("collections", []);
    let collection = null;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === collectionId) {
        collection = collections[i];
        break;
      }
    }

    if (!collection) {
      return { success: false, message: "Collection not found.", collectionId: collectionId, name: null };
    }

    if (collection.is_default_reading_list) {
      return { success: false, message: "Cannot rename default Reading List.", collectionId: collectionId, name: collection.name };
    }

    collection.name = newName;
    this._saveToStorage("collections", collections);

    return { success: true, message: "Collection renamed.", collectionId: collectionId, name: newName };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    try {
      this._requireAuthentication();
    } catch (e) {
      return { success: false, message: e.message || "Authentication required" };
    }

    const collections = this._getFromStorage("collections", []);
    const collectionItems = this._getFromStorage("collection_items", []);

    let collection = null;
    let index = -1;
    for (let i = 0; i < collections.length; i++) {
      if (collections[i].id === collectionId) {
        collection = collections[i];
        index = i;
        break;
      }
    }

    if (!collection) {
      return { success: false, message: "Collection not found." };
    }

    if (collection.is_default_reading_list) {
      return { success: false, message: "Cannot delete default Reading List." };
    }

    collections.splice(index, 1);

    for (let j = collectionItems.length - 1; j >= 0; j--) {
      if (collectionItems[j].collection_id === collectionId) {
        collectionItems.splice(j, 1);
      }
    }

    this._saveToStorage("collections", collections);
    this._saveToStorage("collection_items", collectionItems);

    return { success: true, message: "Collection deleted." };
  }

  // getNotificationSettings()
  getNotificationSettings() {
    try {
      this._requireAuthentication();
    } catch (e) {
      return [];
    }

    const settings = this._getFromStorage("notification_settings", []);
    return settings;
  }

  // updateNotificationSettings(settings)
  updateNotificationSettings(settings) {
    try {
      this._requireAuthentication();
    } catch (e) {
      return { success: false, message: e.message || "Authentication required", updatedSettings: [] };
    }

    const incoming = Array.isArray(settings) ? settings : [];
    const existing = this._getFromStorage("notification_settings", []);

    function displayNameForTopic(topic) {
      if (!topic) return "";
      if (topic === "osint") return "OSINT";
      if (topic === "malware") return "Malware";
      if (topic === "wifi_security") return "Wi-Fi Security";
      if (topic === "ctf_practice") return "CTF Practice";
      if (topic === "tools") return "Tools";
      if (topic === "threats") return "Threats";
      if (topic === "general") return "General";
      return topic;
    }

    for (let i = 0; i < incoming.length; i++) {
      const s = incoming[i];
      if (!s || !s.topic) continue;
      let deliveryType = s.deliveryType || "disabled";
      let frequency = s.frequency || "none";
      if (deliveryType === "disabled") {
        frequency = "none";
      }

      let found = false;
      for (let j = 0; j < existing.length; j++) {
        if (existing[j].topic === s.topic) {
          existing[j].delivery_type = deliveryType;
          existing[j].frequency = frequency;
          existing[j].updated_at = new Date().toISOString();
          found = true;
          break;
        }
      }

      if (!found) {
        existing.push({
          id: this._generateId("notification_setting"),
          topic: s.topic,
          display_name: displayNameForTopic(s.topic),
          delivery_type: deliveryType,
          frequency: frequency,
          created_at: new Date().toISOString(),
          updated_at: null
        });
      }
    }

    this._saveNotificationSettingsToStorage(existing);

    return {
      success: true,
      message: "Notification settings updated.",
      updatedSettings: existing
    };
  }

  // getStaticPageContent(pageCode)
  getStaticPageContent(pageCode) {
    const pages = this._getFromStorage("static_pages", []);
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].page_code === pageCode) {
        return {
          title: pages[i].title || "",
          contentHtml: pages[i].content_html || "",
          lastUpdated: pages[i].last_updated || null
        };
      }
    }
    // Default empty content if not found
    return {
      title: "",
      contentHtml: "",
      lastUpdated: null
    };
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage("contact_info", { email: "", pgpPublicKeyBlock: "", otherChannels: [] });
    return {
      email: info.email || "",
      pgpPublicKeyBlock: info.pgpPublicKeyBlock || "",
      otherChannels: Array.isArray(info.otherChannels) ? info.otherChannels : []
    };
  }

  // submitContactForm(name, email, subject, message, topic)
  submitContactForm(name, email, subject, message, topic) {
    const msg = (message || "").trim();
    if (!msg) {
      return { success: false, message: "Message is required.", ticketId: null };
    }

    const messages = this._getFromStorage("contact_messages", []);
    const id = this._generateId("contact_message");
    const now = new Date().toISOString();

    messages.push({
      id: id,
      name: name || "",
      email: email || "",
      subject: subject || "",
      message: msg,
      topic: topic || "other",
      created_at: now
    });

    this._saveToStorage("contact_messages", messages);

    return { success: true, message: "Message submitted.", ticketId: id };
  }
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}