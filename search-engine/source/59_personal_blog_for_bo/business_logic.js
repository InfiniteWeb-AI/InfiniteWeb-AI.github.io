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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const keys = [
      "reviews",
      "authors",
      "comments",
      "reading_lists",
      "reading_list_items",
      "review_interactions",
      "tags",
      "review_tags",
      "newsletter_subscriptions",
      "contact_messages"
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single-user account object
    if (!localStorage.getItem("account")) {
      localStorage.setItem("account", "null");
    }

    // About page content (optional, initialized lazily in getter as well)
    if (!localStorage.getItem("about_page")) {
      const about = {
        title: "About This Blog",
        bodyMarkdown:
          "Welcome to my personal blog for book and movie reviews. All opinions are my own.",
        sections: [
          {
            heading: "Purpose",
            contentMarkdown:
              "I write concise, honest reviews of books and movies I enjoy (or sometimes dislike)."
          }
        ]
      };
      localStorage.setItem("about_page", JSON.stringify(about));
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  // ---------------------- Core helpers (private) ----------------------

  // Internal helper to fetch or create a built-in ReadingList (favorites, watchlist, save_for_later)
  _getOrCreateDefaultReadingList(listType) {
    const validTypes = ["favorites", "watchlist", "save_for_later"];
    if (!validTypes.includes(listType)) {
      throw new Error("Invalid default listType: " + listType);
    }

    const now = new Date().toISOString();
    let lists = this._getFromStorage("reading_lists", []);

    let list = lists.find((l) => l.listType === listType && l.isDefault === true);

    if (!list) {
      let name;
      if (listType === "favorites") name = "Favorites";
      else if (listType === "watchlist") name = "Watchlist";
      else name = "Save for Later";

      list = {
        id: this._generateId("reading_list"),
        name,
        listType,
        description: "",
        isDefault: true,
        createdAt: now,
        updatedAt: null
      };
      lists.push(list);
      this._saveToStorage("reading_lists", lists);
    }

    return list;
  }

  // Internal helper to fetch or create a ReviewInteraction record
  _getOrCreateReviewInteraction(reviewId) {
    let interactions = this._getFromStorage("review_interactions", []);
    let interaction = interactions.find((ri) => ri.reviewId === reviewId);

    if (!interaction) {
      interaction = {
        id: this._generateId("review_interaction"),
        reviewId,
        isRead: false,
        readAt: null,
        isSavedForLater: false,
        savedForLaterAt: null,
        isLiked: false,
        likedAt: null
      };
      interactions.push(interaction);
      this._saveToStorage("review_interactions", interactions);
    }

    return interaction;
  }

  // Internal helper to apply filter and sorting parameters to a collection of reviews
  _applyReviewFiltersAndSorting(reviews, filters = {}, sortBy) {
    let result = Array.isArray(reviews) ? reviews.slice() : [];

    const {
      genre,
      dateRangePreset,
      dateFrom,
      dateTo,
      minRating,
      maxRating,
      minPublicationYear,
      maxPublicationYear,
      minReleaseYear,
      maxReleaseYear,
      minRuntimeMinutes,
      maxRuntimeMinutes
    } = filters || {};

    // Genre filter
    if (genre) {
      result = result.filter((r) => (r.genre || "") === genre);
    }

    // Date range / publishedAt filter
    let effectiveDateFrom = null;
    let effectiveDateTo = null;

    const now = new Date();
    if (dateRangePreset && dateRangePreset !== "custom") {
      if (dateRangePreset === "last_6_months") {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 6);
        effectiveDateFrom = d;
      } else if (dateRangePreset === "last_12_months") {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 12);
        effectiveDateFrom = d;
      } else if (dateRangePreset === "this_year") {
        effectiveDateFrom = new Date(now.getFullYear(), 0, 1);
      } else if (dateRangePreset === "all_time") {
        // no date filter
      }
    } else if (dateRangePreset === "custom") {
      if (dateFrom) effectiveDateFrom = new Date(dateFrom);
      if (dateTo) effectiveDateTo = new Date(dateTo);
    } else {
      // No preset provided, but explicit dates may exist
      if (dateFrom) effectiveDateFrom = new Date(dateFrom);
      if (dateTo) effectiveDateTo = new Date(dateTo);
    }

    if (effectiveDateFrom || effectiveDateTo) {
      result = result.filter((r) => {
        if (!r.publishedAt) return false;
        const d = new Date(r.publishedAt);
        if (effectiveDateFrom && d < effectiveDateFrom) return false;
        if (effectiveDateTo && d > effectiveDateTo) return false;
        return true;
      });
    }

    // Rating filter
    if (typeof minRating === "number") {
      result = result.filter((r) => typeof r.rating === "number" && r.rating >= minRating);
    }
    if (typeof maxRating === "number") {
      result = result.filter((r) => typeof r.rating === "number" && r.rating <= maxRating);
    }

    // Publication year (books)
    if (typeof minPublicationYear === "number") {
      result = result.filter(
        (r) => typeof r.publicationYear === "number" && r.publicationYear >= minPublicationYear
      );
    }
    if (typeof maxPublicationYear === "number") {
      result = result.filter(
        (r) => typeof r.publicationYear === "number" && r.publicationYear <= maxPublicationYear
      );
    }

    // Release year (movies)
    if (typeof minReleaseYear === "number") {
      result = result.filter(
        (r) => typeof r.releaseYear === "number" && r.releaseYear >= minReleaseYear
      );
    }
    if (typeof maxReleaseYear === "number") {
      result = result.filter(
        (r) => typeof r.releaseYear === "number" && r.releaseYear <= maxReleaseYear
      );
    }

    // Runtime (movies)
    if (typeof minRuntimeMinutes === "number") {
      result = result.filter(
        (r) => typeof r.runtimeMinutes === "number" && r.runtimeMinutes >= minRuntimeMinutes
      );
    }
    if (typeof maxRuntimeMinutes === "number") {
      result = result.filter(
        (r) => typeof r.runtimeMinutes === "number" && r.runtimeMinutes <= maxRuntimeMinutes
      );
    }

    // Sorting
    const safeNumber = (v, fallback = 0) => (typeof v === "number" ? v : fallback);
    const safeDate = (v) => (v ? new Date(v).getTime() : 0);

    const sortKey = sortBy || "newest_first";

    result.sort((a, b) => {
      switch (sortKey) {
        case "rating_high_to_low":
          return safeNumber(b.rating) - safeNumber(a.rating);
        case "rating_low_to_high":
          return safeNumber(a.rating) - safeNumber(b.rating);
        case "most_popular":
          return safeNumber(b.popularityScore) - safeNumber(a.popularityScore);
        case "oldest_first":
          return safeDate(a.publishedAt) - safeDate(b.publishedAt);
        case "release_year_oldest_first":
          return safeNumber(a.releaseYear) - safeNumber(b.releaseYear);
        case "release_year_newest_first":
          return safeNumber(b.releaseYear) - safeNumber(a.releaseYear);
        case "newest_first":
        default:
          return safeDate(b.publishedAt) - safeDate(a.publishedAt);
      }
    });

    return result;
  }

  // Internal helper to create or update the single user's account
  _persistSingleUserAccount(accountData) {
    const existingRaw = localStorage.getItem("account");
    let existing = null;
    if (existingRaw && existingRaw !== "null") {
      try {
        existing = JSON.parse(existingRaw);
      } catch (e) {
        existing = null;
      }
    }

    const now = new Date().toISOString();

    const merged = {
      username: "",
      email: "",
      defaultNewsletterOptIn: false,
      createdAt: existing && existing.createdAt ? existing.createdAt : now,
      ...(existing || {}),
      ...(accountData || {})
    };

    localStorage.setItem("account", JSON.stringify(merged));
    return merged;
  }

  // Validate/sanitize newsletter frequencies
  _validateNewsletterFrequencies(mainFrequency, booksFrequency, moviesFrequency) {
    const allowedMain = ["none", "daily", "weekly", "monthly", "custom_per_category"];
    const allowedSub = ["none", "daily", "weekly", "monthly"];

    let mf = allowedMain.includes(mainFrequency) ? mainFrequency : "none";
    let bf = booksFrequency;
    let mvf = moviesFrequency;

    if (mf !== "custom_per_category") {
      bf = null;
      mvf = null;
    } else {
      if (!allowedSub.includes(bf || "")) bf = "none";
      if (!allowedSub.includes(mvf || "")) mvf = "none";
    }

    return { mainFrequency: mf, booksFrequency: bf, moviesFrequency: mvf };
  }

  // Utility: resolve tags for a single review
  _getTagsForReview(reviewId) {
    const tags = this._getFromStorage("tags", []);
    const reviewTags = this._getFromStorage("review_tags", []);
    const tagIds = reviewTags
      .filter((rt) => rt.reviewId === reviewId)
      .map((rt) => rt.tagId);
    return tags.filter((t) => tagIds.includes(t.id));
  }

  // Utility: resolve author for a review
  _getAuthorForReview(review) {
    const authors = this._getFromStorage("authors", []);
    return authors.find((a) => a.id === review.authorId) || null;
  }

  // ---------------------- Interface implementations ----------------------

  // getHomeFeed(sortBy, page, pageSize)
  getHomeFeed(sortBy, page, pageSize) {
    const reviews = this._getFromStorage("reviews", []);
    const authors = this._getFromStorage("authors", []);
    const interactions = this._getFromStorage("review_interactions", []);

    // We only support 'newest_first' and 'most_popular' here
    const sortKey = sortBy || "newest_first";

    const safeDate = (v) => (v ? new Date(v).getTime() : 0);
    const safeNumber = (v, fallback = 0) => (typeof v === "number" ? v : fallback);

    let sorted = reviews.slice();
    sorted.sort((a, b) => {
      if (sortKey === "most_popular") {
        return safeNumber(b.popularityScore) - safeNumber(a.popularityScore);
      }
      // default newest_first
      return safeDate(b.publishedAt) - safeDate(a.publishedAt);
    });

    const pageNum = typeof page === "number" && page > 0 ? page : 1;
    const size = typeof pageSize === "number" && pageSize > 0 ? pageSize : 10;
    const totalCount = sorted.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageItems = sorted.slice(start, end);

    const items = pageItems.map((review) => {
      const author = authors.find((a) => a.id === review.authorId) || null;
      const interaction = interactions.find((ri) => ri.reviewId === review.id) || {};

      const body = review.body || "";
      const excerpt = body.length > 200 ? body.slice(0, 197) + "..." : body;

      const item = {
        reviewId: review.id,
        title: review.title,
        slug: review.slug || null,
        excerpt,
        contentType: review.content_type,
        genre: review.genre || null,
        rating: review.rating,
        publishedAt: review.publishedAt,
        thumbnailUrl: review.thumbnailUrl || null,
        authorName: author ? author.name : "",
        likeCount: typeof review.likeCount === "number" ? review.likeCount : 0,
        commentCount: typeof review.commentCount === "number" ? review.commentCount : 0,
        popularityScore:
          typeof review.popularityScore === "number" ? review.popularityScore : 0,
        publicationYear:
          typeof review.publicationYear === "number" ? review.publicationYear : null,
        releaseYear: typeof review.releaseYear === "number" ? review.releaseYear : null,
        runtimeMinutes:
          typeof review.runtimeMinutes === "number" ? review.runtimeMinutes : null,
        isRead: !!interaction.isRead,
        isSavedForLater: !!interaction.isSavedForLater,
        isLiked: !!interaction.isLiked
      };

      // Foreign key resolution: reviewId -> review
      item.review = { ...review };
      if (review.authorId) {
        item.review.author = author || null;
      }

      return item;
    });

    return {
      items,
      totalCount,
      page: pageNum,
      pageSize: size,
      sortBy: sortKey
    };
  }

  // markReviewAsRead(reviewId)
  markReviewAsRead(reviewId) {
    if (!reviewId) {
      return {
        success: false,
        isRead: false,
        readAt: null,
        message: "reviewId is required"
      };
    }

    let interactions = this._getFromStorage("review_interactions", []);
    let interaction = interactions.find((ri) => ri.reviewId === reviewId);

    const now = new Date().toISOString();

    if (!interaction) {
      interaction = {
        id: this._generateId("review_interaction"),
        reviewId,
        isRead: true,
        readAt: now,
        isSavedForLater: false,
        savedForLaterAt: null,
        isLiked: false,
        likedAt: null
      };
      interactions.push(interaction);
    } else {
      interaction.isRead = true;
      interaction.readAt = now;
    }

    this._saveToStorage("review_interactions", interactions);

    return {
      success: true,
      isRead: true,
      readAt: interaction.readAt,
      message: "Review marked as read"
    };
  }

  // getReviewFilterOptions(context, contentType)
  getReviewFilterOptions(context, contentType) {
    const reviewsAll = this._getFromStorage("reviews", []);
    const tagsAll = this._getFromStorage("tags", []);
    const reviewTags = this._getFromStorage("review_tags", []);

    // Filter by contentType if provided
    const reviews = contentType
      ? reviewsAll.filter((r) => r.content_type === contentType)
      : reviewsAll.slice();

    // Genres
    const genreCounts = {};
    reviews.forEach((r) => {
      if (!r.genre) return;
      genreCounts[r.genre] = (genreCounts[r.genre] || 0) + 1;
    });
    const genres = Object.keys(genreCounts)
      .sort()
      .map((name) => ({ name, count: genreCounts[name] }));

    // Tags + counts with respect to contentType
    const tags = tagsAll.map((tag) => {
      const relatedReviewIds = reviewTags
        .filter((rt) => rt.tagId === tag.id)
        .map((rt) => rt.reviewId);
      const count = reviews.filter((r) => relatedReviewIds.includes(r.id)).length;
      return {
        id: tag.id,
        name: tag.name,
        slug: tag.slug || null,
        count
      };
    });

    // Rating buckets
    const buckets = [
      { label: "0 - 1.9 stars", minRating: 0, maxRating: 1.9 },
      { label: "2.0 - 2.9 stars", minRating: 2.0, maxRating: 2.9 },
      { label: "3.0 - 3.9 stars", minRating: 3.0, maxRating: 3.9 },
      { label: "4.0 - 5.0 stars", minRating: 4.0, maxRating: 5.0 }
    ];

    const ratingBuckets = buckets.map((b) => {
      const count = reviews.filter((r) => {
        const rating = typeof r.rating === "number" ? r.rating : null;
        if (rating === null) return false;
        return rating >= b.minRating && rating <= b.maxRating;
      }).length;
      return { ...b, count };
    });

    // Date presets
    const datePresets = [
      {
        id: "last_6_months",
        label: "Last 6 months",
        description: "Reviews published within the last 6 months"
      },
      {
        id: "last_12_months",
        label: "Last 12 months",
        description: "Reviews published within the last year"
      },
      {
        id: "this_year",
        label: "This year",
        description: "Reviews published since January 1st of this year"
      },
      {
        id: "all_time",
        label: "All time",
        description: "All reviews regardless of date"
      }
    ];

    // Publication years range (for books)
    let pubYears = reviews
      .map((r) => r.publicationYear)
      .filter((y) => typeof y === "number");
    const publicationYearsRange = {
      minYear: pubYears.length ? Math.min(...pubYears) : null,
      maxYear: pubYears.length ? Math.max(...pubYears) : null
    };

    // Release years range (for movies)
    let relYears = reviews
      .map((r) => r.releaseYear)
      .filter((y) => typeof y === "number");
    const releaseYearsRange = {
      minYear: relYears.length ? Math.min(...relYears) : null,
      maxYear: relYears.length ? Math.max(...relYears) : null
    };

    // Runtime range (movies)
    let runtimes = reviews
      .map((r) => r.runtimeMinutes)
      .filter((m) => typeof m === "number");
    const runtimeRange = {
      minMinutes: runtimes.length ? Math.min(...runtimes) : null,
      maxMinutes: runtimes.length ? Math.max(...runtimes) : null
    };

    return {
      genres,
      tags,
      ratingBuckets,
      datePresets,
      publicationYearsRange,
      releaseYearsRange,
      runtimeRange
    };
  }

  // getReviewsListing(contentType, filters, sortBy, page, pageSize)
  getReviewsListing(contentType, filters, sortBy, page, pageSize) {
    const allReviews = this._getFromStorage("reviews", []);
    const authors = this._getFromStorage("authors", []);
    const interactions = this._getFromStorage("review_interactions", []);

    let filtered = contentType
      ? allReviews.filter((r) => r.content_type === contentType)
      : allReviews.slice();

    filtered = this._applyReviewFiltersAndSorting(filtered, filters || {}, sortBy);

    const pageNum = typeof page === "number" && page > 0 ? page : 1;
    const size = typeof pageSize === "number" && pageSize > 0 ? pageSize : 20;
    const totalCount = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end);

    const items = pageItems.map((review) => {
      const author = authors.find((a) => a.id === review.authorId) || null;
      const interaction = interactions.find((ri) => ri.reviewId === review.id) || {};
      const tags = this._getTagsForReview(review.id);

      const item = {
        reviewId: review.id,
        title: review.title,
        slug: review.slug || null,
        contentType: review.content_type,
        genre: review.genre || null,
        rating: review.rating,
        ratingCount: typeof review.ratingCount === "number" ? review.ratingCount : 0,
        publishedAt: review.publishedAt,
        publicationYear:
          typeof review.publicationYear === "number" ? review.publicationYear : null,
        releaseYear: typeof review.releaseYear === "number" ? review.releaseYear : null,
        runtimeMinutes:
          typeof review.runtimeMinutes === "number" ? review.runtimeMinutes : null,
        thumbnailUrl: review.thumbnailUrl || null,
        authorName: author ? author.name : "",
        tags,
        likeCount: typeof review.likeCount === "number" ? review.likeCount : 0,
        commentCount: typeof review.commentCount === "number" ? review.commentCount : 0,
        popularityScore:
          typeof review.popularityScore === "number" ? review.popularityScore : 0,
        isRead: !!interaction.isRead,
        isSavedForLater: !!interaction.isSavedForLater,
        isLiked: !!interaction.isLiked
      };

      // Foreign key resolution: reviewId -> review
      item.review = { ...review };
      if (review.authorId) {
        item.review.author = author || null;
      }

      return item;
    });

    // appliedFilters echo
    const appliedFilters = {
      genre: (filters && filters.genre) || null,
      dateRangePreset: (filters && filters.dateRangePreset) || null,
      minRating: filters && typeof filters.minRating === "number" ? filters.minRating : null,
      maxRating: filters && typeof filters.maxRating === "number" ? filters.maxRating : null,
      minPublicationYear:
        filters && typeof filters.minPublicationYear === "number"
          ? filters.minPublicationYear
          : null,
      minReleaseYear:
        filters && typeof filters.minReleaseYear === "number"
          ? filters.minReleaseYear
          : null,
      minRuntimeMinutes:
        filters && typeof filters.minRuntimeMinutes === "number"
          ? filters.minRuntimeMinutes
          : null,
      maxRuntimeMinutes:
        filters && typeof filters.maxRuntimeMinutes === "number"
          ? filters.maxRuntimeMinutes
          : null
    };

    return {
      items,
      totalCount,
      page: pageNum,
      pageSize: size,
      appliedFilters,
      sortBy: sortBy || "newest_first"
    };
  }

  // getReviewDetail(reviewId)
  getReviewDetail(reviewId) {
    const reviews = this._getFromStorage("reviews", []);
    const authors = this._getFromStorage("authors", []);
    const interactions = this._getFromStorage("review_interactions", []);

    const review = reviews.find((r) => r.id === reviewId) || null;
    if (!review) {
      return {
        review: null,
        author: null,
        tags: [],
        userInteraction: {
          isRead: false,
          isSavedForLater: false,
          isLiked: false,
          isInFavorites: false,
          isInWatchlist: false
        }
      };
    }

    const author = authors.find((a) => a.id === review.authorId) || null;
    const tags = this._getTagsForReview(review.id);
    const interaction = interactions.find((ri) => ri.reviewId === review.id) || {};

    // Favorites / watchlist membership
    const lists = this._getFromStorage("reading_lists", []);
    const items = this._getFromStorage("reading_list_items", []);

    const favoritesList = lists.find((l) => l.listType === "favorites");
    const watchlistList = lists.find((l) => l.listType === "watchlist");

    const isInFavorites = !!(
      favoritesList && items.some((it) => it.listId === favoritesList.id && it.reviewId === review.id)
    );
    const isInWatchlist = !!(
      watchlistList && items.some((it) => it.listId === watchlistList.id && it.reviewId === review.id)
    );

    const reviewCopy = { ...review };
    if (review.authorId) {
      reviewCopy.author = author || null;
    }

    return {
      review: reviewCopy,
      author,
      tags,
      userInteraction: {
        isRead: !!interaction.isRead,
        isSavedForLater: !!interaction.isSavedForLater,
        isLiked: !!interaction.isLiked,
        isInFavorites,
        isInWatchlist
      }
    };
  }

  // getReviewComments(reviewId, page, pageSize)
  getReviewComments(reviewId, page, pageSize) {
    const commentsAll = this._getFromStorage("comments", []);
    const reviews = this._getFromStorage("reviews", []);

    const related = commentsAll
      .filter((c) => c.reviewId === reviewId && !c.isDeleted)
      .sort((a, b) => {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return da - db; // oldest first
      });

    const pageNum = typeof page === "number" && page > 0 ? page : 1;
    const size = typeof pageSize === "number" && pageSize > 0 ? pageSize : 20;
    const totalCount = related.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageItems = related.slice(start, end);

    const review = reviews.find((r) => r.id === reviewId) || null;

    const items = pageItems.map((c) => ({
      ...c,
      // Foreign key resolution: reviewId -> review
      review
    }));

    return {
      items,
      totalCount,
      page: pageNum,
      pageSize: size
    };
  }

  // postReviewComment(reviewId, authorName, content)
  postReviewComment(reviewId, authorName, content) {
    if (!reviewId) {
      return { success: false, comment: null, message: "reviewId is required" };
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return { success: false, comment: null, message: "content is required" };
    }

    const now = new Date().toISOString();
    let comments = this._getFromStorage("comments", []);
    const comment = {
      id: this._generateId("comment"),
      reviewId,
      authorName: authorName || "You",
      content,
      createdAt: now,
      updatedAt: null,
      isDeleted: false
    };

    comments.push(comment);
    this._saveToStorage("comments", comments);

    // Increment review.commentCount
    let reviews = this._getFromStorage("reviews", []);
    const idx = reviews.findIndex((r) => r.id === reviewId);
    if (idx !== -1) {
      const r = reviews[idx];
      r.commentCount = (typeof r.commentCount === "number" ? r.commentCount : 0) + 1;
      reviews[idx] = r;
      this._saveToStorage("reviews", reviews);
    }

    return {
      success: true,
      comment,
      message: "Comment posted"
    };
  }

  // likeReview(reviewId, isLiked)
  likeReview(reviewId, isLiked) {
    if (!reviewId) {
      return { success: false, isLiked: false, likeCount: 0, message: "reviewId is required" };
    }

    const likeFlag = !!isLiked;

    let interactions = this._getFromStorage("review_interactions", []);
    let interaction = interactions.find((ri) => ri.reviewId === reviewId);

    const now = new Date().toISOString();

    let previousIsLiked = false;

    if (!interaction) {
      interaction = {
        id: this._generateId("review_interaction"),
        reviewId,
        isRead: false,
        readAt: null,
        isSavedForLater: false,
        savedForLaterAt: null,
        isLiked: likeFlag,
        likedAt: likeFlag ? now : null
      };
      interactions.push(interaction);
    } else {
      previousIsLiked = !!interaction.isLiked;
      interaction.isLiked = likeFlag;
      interaction.likedAt = likeFlag ? now : null;
    }

    this._saveToStorage("review_interactions", interactions);

    // Update review.likeCount
    let reviews = this._getFromStorage("reviews", []);
    const idx = reviews.findIndex((r) => r.id === reviewId);
    let likeCount = 0;
    if (idx !== -1) {
      const r = reviews[idx];
      likeCount = typeof r.likeCount === "number" ? r.likeCount : 0;
      if (!previousIsLiked && likeFlag) likeCount += 1;
      if (previousIsLiked && !likeFlag) likeCount = Math.max(0, likeCount - 1);
      r.likeCount = likeCount;
      reviews[idx] = r;
      this._saveToStorage("reviews", reviews);
    }

    return {
      success: true,
      isLiked: likeFlag,
      likeCount,
      message: likeFlag ? "Review liked" : "Review like removed"
    };
  }

  // getUserReadingLists()
  getUserReadingLists() {
    const lists = this._getFromStorage("reading_lists", []);
    const items = this._getFromStorage("reading_list_items", []);

    return lists.map((list) => {
      const itemsCount = items.filter((i) => i.listId === list.id).length;
      return {
        id: list.id,
        name: list.name,
        listType: list.listType,
        description: list.description || "",
        isDefault: !!list.isDefault,
        itemsCount,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt || null
      };
    });
  }

  // createReadingList(name, description)
  createReadingList(name, description) {
    if (!name || !name.trim()) {
      return { success: false, list: null, message: "name is required" };
    }

    const now = new Date().toISOString();
    let lists = this._getFromStorage("reading_lists", []);

    const list = {
      id: this._generateId("reading_list"),
      name: name.trim(),
      listType: "custom",
      description: description || "",
      isDefault: false,
      createdAt: now,
      updatedAt: null
    };

    lists.push(list);
    this._saveToStorage("reading_lists", lists);

    return { success: true, list, message: "Reading list created" };
  }

  // updateReadingList(listId, name, description)
  updateReadingList(listId, name, description) {
    if (!listId) {
      return { success: false, list: null, message: "listId is required" };
    }

    let lists = this._getFromStorage("reading_lists", []);
    const idx = lists.findIndex((l) => l.id === listId);
    if (idx === -1) {
      return { success: false, list: null, message: "Reading list not found" };
    }

    const now = new Date().toISOString();
    const list = lists[idx];

    if (typeof name === "string" && name.trim()) {
      list.name = name.trim();
    }
    if (typeof description === "string") {
      list.description = description;
    }
    list.updatedAt = now;
    lists[idx] = list;

    this._saveToStorage("reading_lists", lists);

    return { success: true, list, message: "Reading list updated" };
  }

  // deleteReadingList(listId)
  deleteReadingList(listId) {
    if (!listId) {
      return { success: false, message: "listId is required" };
    }

    let lists = this._getFromStorage("reading_lists", []);
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return { success: false, message: "Reading list not found" };
    }
    if (list.isDefault) {
      return { success: false, message: "Default reading lists cannot be deleted" };
    }

    lists = lists.filter((l) => l.id !== listId);
    this._saveToStorage("reading_lists", lists);

    // Remove items from this list
    let items = this._getFromStorage("reading_list_items", []);
    items = items.filter((i) => i.listId !== listId);
    this._saveToStorage("reading_list_items", items);

    return { success: true, message: "Reading list deleted" };
  }

  // addReviewToDefaultList(listType, reviewId)
  addReviewToDefaultList(listType, reviewId) {
    const allowed = ["favorites", "watchlist", "save_for_later"];
    if (!allowed.includes(listType)) {
      return {
        success: false,
        listId: null,
        listType,
        listName: null,
        alreadyInList: false,
        addedAt: null,
        message: "Invalid listType"
      };
    }
    if (!reviewId) {
      return {
        success: false,
        listId: null,
        listType,
        listName: null,
        alreadyInList: false,
        addedAt: null,
        message: "reviewId is required"
      };
    }

    const list = this._getOrCreateDefaultReadingList(listType);
    let items = this._getFromStorage("reading_list_items", []);

    const existing = items.find((i) => i.listId === list.id && i.reviewId === reviewId);
    const now = new Date().toISOString();

    if (existing) {
      // Ensure ReviewInteraction for save_for_later stays in sync
      if (listType === "save_for_later") {
        const interaction = this._getOrCreateReviewInteraction(reviewId);
        interaction.isSavedForLater = true;
        interaction.savedForLaterAt = interaction.savedForLaterAt || now;
        let interactions = this._getFromStorage("review_interactions", []);
        const idx = interactions.findIndex((ri) => ri.id === interaction.id);
        if (idx !== -1) {
          interactions[idx] = interaction;
          this._saveToStorage("review_interactions", interactions);
        }
      }

      return {
        success: true,
        listId: list.id,
        listType: list.listType,
        listName: list.name,
        alreadyInList: true,
        addedAt: existing.addedAt,
        message: "Review already in list"
      };
    }

    const item = {
      id: this._generateId("reading_list_item"),
      listId: list.id,
      reviewId,
      addedAt: now,
      notes: null,
      position: null
    };

    items.push(item);
    this._saveToStorage("reading_list_items", items);

    if (listType === "save_for_later") {
      const interaction = this._getOrCreateReviewInteraction(reviewId);
      interaction.isSavedForLater = true;
      interaction.savedForLaterAt = now;
      let interactions = this._getFromStorage("review_interactions", []);
      const idx = interactions.findIndex((ri) => ri.id === interaction.id);
      if (idx !== -1) {
        interactions[idx] = interaction;
        this._saveToStorage("review_interactions", interactions);
      }
    }

    return {
      success: true,
      listId: list.id,
      listType: list.listType,
      listName: list.name,
      alreadyInList: false,
      addedAt: now,
      message: "Review added to list"
    };
  }

  // addReviewToCustomList(listId, reviewId)
  addReviewToCustomList(listId, reviewId) {
    if (!listId) {
      return {
        success: false,
        listId: null,
        addedAt: null,
        alreadyInList: false,
        message: "listId is required"
      };
    }
    if (!reviewId) {
      return {
        success: false,
        listId,
        addedAt: null,
        alreadyInList: false,
        message: "reviewId is required"
      };
    }

    const lists = this._getFromStorage("reading_lists", []);
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return {
        success: false,
        listId,
        addedAt: null,
        alreadyInList: false,
        message: "Reading list not found"
      };
    }

    let items = this._getFromStorage("reading_list_items", []);
    const existing = items.find((i) => i.listId === listId && i.reviewId === reviewId);
    const now = new Date().toISOString();

    if (existing) {
      return {
        success: true,
        listId,
        addedAt: existing.addedAt,
        alreadyInList: true,
        message: "Review already in list"
      };
    }

    const item = {
      id: this._generateId("reading_list_item"),
      listId,
      reviewId,
      addedAt: now,
      notes: null,
      position: null
    };

    items.push(item);
    this._saveToStorage("reading_list_items", items);

    return {
      success: true,
      listId,
      addedAt: now,
      alreadyInList: false,
      message: "Review added to list"
    };
  }

  // removeReviewFromReadingList(listId, reviewId)
  removeReviewFromReadingList(listId, reviewId) {
    if (!listId || !reviewId) {
      return {
        success: false,
        listId,
        reviewId,
        message: "listId and reviewId are required"
      };
    }

    let items = this._getFromStorage("reading_list_items", []);
    const existing = items.find((i) => i.listId === listId && i.reviewId === reviewId);
    if (!existing) {
      return {
        success: false,
        listId,
        reviewId,
        message: "Review is not in the specified list"
      };
    }

    items = items.filter((i) => !(i.listId === listId && i.reviewId === reviewId));
    this._saveToStorage("reading_list_items", items);

    // If this is the Save for Later default list, update ReviewInteraction
    const lists = this._getFromStorage("reading_lists", []);
    const list = lists.find((l) => l.id === listId);
    if (list && list.listType === "save_for_later") {
      let interactions = this._getFromStorage("review_interactions", []);
      const idx = interactions.findIndex((ri) => ri.reviewId === reviewId);
      if (idx !== -1) {
        interactions[idx].isSavedForLater = false;
        interactions[idx].savedForLaterAt = null;
        this._saveToStorage("review_interactions", interactions);
      }
    }

    return {
      success: true,
      listId,
      reviewId,
      message: "Review removed from list"
    };
  }

  // getReadingListItems(listId, sortBy, page, pageSize)
  getReadingListItems(listId, sortBy, page, pageSize) {
    if (!listId) {
      return {
        list: null,
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: typeof pageSize === "number" && pageSize > 0 ? pageSize : 20
      };
    }

    const lists = this._getFromStorage("reading_lists", []);
    const list = lists.find((l) => l.id === listId) || null;
    const allItems = this._getFromStorage("reading_list_items", []);
    const reviews = this._getFromStorage("reviews", []);
    const authors = this._getFromStorage("authors", []);

    let filteredItems = allItems.filter((i) => i.listId === listId);

    // Sort items
    const sortKey = sortBy || "date_added_newest_first";

    filteredItems.sort((a, b) => {
      if (sortKey === "date_added_oldest_first") {
        return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      }
      if (sortKey === "rating_high_to_low") {
        const ra = reviews.find((r) => r.id === a.reviewId);
        const rb = reviews.find((r) => r.id === b.reviewId);
        const na = ra && typeof ra.rating === "number" ? ra.rating : 0;
        const nb = rb && typeof rb.rating === "number" ? rb.rating : 0;
        return nb - na;
      }
      // default date_added_newest_first
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });

    const pageNum = typeof page === "number" && page > 0 ? page : 1;
    const size = typeof pageSize === "number" && pageSize > 0 ? pageSize : 20;
    const totalCount = filteredItems.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageItems = filteredItems.slice(start, end);

    const items = pageItems.map((li) => {
      const review = reviews.find((r) => r.id === li.reviewId) || null;
      const author = review ? authors.find((a) => a.id === review.authorId) || null : null;

      const item = {
        reviewId: li.reviewId,
        title: review ? review.title : "",
        slug: review ? review.slug || null : null,
        contentType: review ? review.content_type : null,
        genre: review ? review.genre || null : null,
        rating: review && typeof review.rating === "number" ? review.rating : null,
        thumbnailUrl: review ? review.thumbnailUrl || null : null,
        authorName: author ? author.name : "",
        addedAt: li.addedAt,
        position: typeof li.position === "number" ? li.position : null
      };

      // Foreign key resolution: reviewId -> review
      item.review = review ? { ...review } : null;
      if (item.review && review.authorId) {
        item.review.author = author || null;
      }

      // Foreign key resolution: listId -> reading list
      item.list = list ? { ...list } : null;

      return item;
    });

    return {
      list,
      items,
      totalCount,
      page: pageNum,
      pageSize: size
    };
  }

  // searchReviews(query, filters, sortBy, page, pageSize)
  searchReviews(query, filters, sortBy, page, pageSize) {
    const q = (query || "").toLowerCase().trim();
    const reviews = this._getFromStorage("reviews", []);
    const authors = this._getFromStorage("authors", []);
    const tags = this._getFromStorage("tags", []);
    const reviewTags = this._getFromStorage("review_tags", []);

    const f = filters || {};
    const contentType = f.contentType || null;
    const genre = f.genre || null;
    const tagIds = Array.isArray(f.tagIds) ? f.tagIds : [];
    const minRating = typeof f.minRating === "number" ? f.minRating : null;
    const maxRating = typeof f.maxRating === "number" ? f.maxRating : null;

    // Pre-build map of reviewId -> tagIds
    const reviewIdToTagIds = {};
    reviewTags.forEach((rt) => {
      if (!reviewIdToTagIds[rt.reviewId]) reviewIdToTagIds[rt.reviewId] = [];
      reviewIdToTagIds[rt.reviewId].push(rt.tagId);
    });

    let filtered = reviews.filter((r) => {
      if (contentType && r.content_type !== contentType) return false;
      if (genre && r.genre !== genre) return false;
      if (minRating !== null && (typeof r.rating !== "number" || r.rating < minRating)) return false;
      if (maxRating !== null && (typeof r.rating !== "number" || r.rating > maxRating)) return false;
      if (tagIds.length) {
        const rTagIds = reviewIdToTagIds[r.id] || [];
        const hasAny = tagIds.some((id) => rTagIds.includes(id));
        if (!hasAny) return false;
      }
      return true;
    });

    // Compute basic relevance score
    const qTokens = q ? q.split(/\s+/).filter(Boolean) : [];

    const scored = filtered.map((r) => {
      let score = 0;
      if (!qTokens.length) {
        score = 0;
      } else {
        const title = (r.title || "").toLowerCase();
        const body = (r.body || "").toLowerCase();
        const tagsSummary = (r.tagsSummary || "").toLowerCase();

        qTokens.forEach((token) => {
          if (title.includes(token)) score += 3;
          if (body.includes(token)) score += 1;
          if (tagsSummary.includes(token)) score += 2;
        });
      }
      return { review: r, relevanceScore: score };
    });

    // Sorting
    const sortKey = sortBy || "relevance";
    scored.sort((a, b) => {
      if (sortKey === "date_newest") {
        return new Date(b.review.publishedAt || 0) - new Date(a.review.publishedAt || 0);
      }
      if (sortKey === "rating_high_to_low") {
        const ra = typeof a.review.rating === "number" ? a.review.rating : 0;
        const rb = typeof b.review.rating === "number" ? b.review.rating : 0;
        return rb - ra;
      }
      // default relevance
      return b.relevanceScore - a.relevanceScore;
    });

    const pageNum = typeof page === "number" && page > 0 ? page : 1;
    const size = typeof pageSize === "number" && pageSize > 0 ? pageSize : 20;
    const totalCount = scored.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageItems = scored.slice(start, end);

    const items = pageItems.map(({ review }) => {
      const author = authors.find((a) => a.id === review.authorId) || null;
      const reviewTagsIds = reviewIdToTagIds[review.id] || [];
      const reviewTagsObjects = tags.filter((t) => reviewTagsIds.includes(t.id));

      const body = review.body || "";
      const snippet = body.length > 200 ? body.slice(0, 197) + "..." : body;

      const item = {
        reviewId: review.id,
        title: review.title,
        slug: review.slug || null,
        snippet,
        contentType: review.content_type,
        genre: review.genre || null,
        rating: review.rating,
        publishedAt: review.publishedAt,
        thumbnailUrl: review.thumbnailUrl || null,
        authorName: author ? author.name : "",
        tags: reviewTagsObjects
      };

      // Foreign key resolution: reviewId -> review
      item.review = { ...review };
      if (review.authorId) {
        item.review.author = author || null;
      }

      return item;
    });

    const appliedFilters = {
      contentType,
      genre,
      tagIds,
      minRating,
      maxRating
    };

    return {
      items,
      totalCount,
      page: pageNum,
      pageSize: size,
      appliedFilters,
      sortBy: sortKey
    };
  }

  // getAuthorProfile(authorId)
  getAuthorProfile(authorId) {
    const authors = this._getFromStorage("authors", []);
    const reviews = this._getFromStorage("reviews", []);

    const author = authors.find((a) => a.id === authorId) || null;

    const authoredReviews = reviews.filter((r) => r.authorId === authorId);

    const reviewsList = authoredReviews.map((r) => {
      const item = {
        reviewId: r.id,
        title: r.title,
        slug: r.slug || null,
        contentType: r.content_type,
        genre: r.genre || null,
        rating: r.rating,
        publishedAt: r.publishedAt,
        thumbnailUrl: r.thumbnailUrl || null
      };
      // Foreign key resolution: reviewId -> review
      item.review = { ...r };
      if (r.authorId) {
        item.review.author = author || null;
      }
      return item;
    });

    return {
      author,
      reviews: reviewsList
    };
  }

  // followAuthor(authorId, isFollowed)
  followAuthor(authorId, isFollowed) {
    if (!authorId) {
      return { success: false, isFollowed: false, followersCount: 0, message: "authorId is required" };
    }

    let authors = this._getFromStorage("authors", []);
    const idx = authors.findIndex((a) => a.id === authorId);
    if (idx === -1) {
      return {
        success: false,
        isFollowed: false,
        followersCount: 0,
        message: "Author not found"
      };
    }

    const author = authors[idx];
    const prev = !!author.isFollowed;
    const next = !!isFollowed;

    let followersCount = typeof author.followersCount === "number" ? author.followersCount : 0;
    if (!prev && next) followersCount += 1;
    if (prev && !next) followersCount = Math.max(0, followersCount - 1);

    author.isFollowed = next;
    author.followersCount = followersCount;
    authors[idx] = author;

    this._saveToStorage("authors", authors);

    return {
      success: true,
      isFollowed: next,
      followersCount,
      message: next ? "Author followed" : "Author unfollowed"
    };
  }

  // getNewsletterSubscription()
  getNewsletterSubscription() {
    const subs = this._getFromStorage("newsletter_subscriptions", []);
    let subscription = null;
    if (subs.length) {
      subscription = subs.find((s) => s.isActive !== false) || subs[0];
    }
    return { subscription: subscription || null };
  }

  // saveNewsletterSubscription(email, name, mainFrequency, booksFrequency, moviesFrequency, sendOnlyHighRated, minRating)
  saveNewsletterSubscription(
    email,
    name,
    mainFrequency,
    booksFrequency,
    moviesFrequency,
    sendOnlyHighRated,
    minRating
  ) {
    if (!email || !email.trim()) {
      return {
        success: false,
        subscription: null,
        message: "email is required"
      };
    }

    const sanitized = this._validateNewsletterFrequencies(
      mainFrequency,
      booksFrequency,
      moviesFrequency
    );

    const mf = sanitized.mainFrequency;
    const bf = sanitized.booksFrequency;
    const mvf = sanitized.moviesFrequency;

    let subs = this._getFromStorage("newsletter_subscriptions", []);

    const emailLower = email.toLowerCase();
    let idx = subs.findIndex((s) => (s.email || "").toLowerCase() === emailLower);

    const now = new Date().toISOString();

    let subscription;
    if (idx === -1) {
      subscription = {
        id: this._generateId("newsletter_subscription"),
        email,
        name: name || "",
        mainFrequency: mf,
        booksFrequency: mf === "custom_per_category" ? bf : null,
        moviesFrequency: mf === "custom_per_category" ? mvf : null,
        sendOnlyHighRated: !!sendOnlyHighRated,
        minRating:
          sendOnlyHighRated && typeof minRating === "number"
            ? minRating
            : sendOnlyHighRated
            ? 4
            : null,
        isActive: mf !== "none",
        createdAt: now,
        updatedAt: null
      };
      subs.push(subscription);
    } else {
      subscription = subs[idx];
      subscription.email = email;
      subscription.name = name || subscription.name || "";
      subscription.mainFrequency = mf;
      subscription.booksFrequency = mf === "custom_per_category" ? bf : null;
      subscription.moviesFrequency = mf === "custom_per_category" ? mvf : null;
      subscription.sendOnlyHighRated = !!sendOnlyHighRated;
      subscription.minRating = subscription.sendOnlyHighRated
        ? typeof minRating === "number"
          ? minRating
          : subscription.minRating || 4
        : null;
      subscription.isActive = mf !== "none";
      subscription.updatedAt = now;
      subs[idx] = subscription;
    }

    this._saveToStorage("newsletter_subscriptions", subs);

    return {
      success: true,
      subscription,
      message: "Newsletter subscription saved"
    };
  }

  // createContactMessage(name, email, message)
  createContactMessage(name, email, message) {
    if (!name || !name.trim()) {
      return {
        contactMessage: null,
        success: false,
        messageText: "name is required"
      };
    }
    if (!email || !email.trim()) {
      return {
        contactMessage: null,
        success: false,
        messageText: "email is required"
      };
    }
    if (!message || !message.trim()) {
      return {
        contactMessage: null,
        success: false,
        messageText: "message is required"
      };
    }

    const now = new Date().toISOString();
    let messages = this._getFromStorage("contact_messages", []);

    const contactMessage = {
      id: this._generateId("contact_message"),
      name: name.trim(),
      email: email.trim(),
      message,
      createdAt: now,
      status: "new"
    };

    messages.push(contactMessage);
    this._saveToStorage("contact_messages", messages);

    return {
      contactMessage,
      success: true,
      messageText: message
    };
  }

  // createAccount(username, email, password)
  createAccount(username, email, password) {
    if (!username || !username.trim()) {
      return {
        success: false,
        account: null,
        message: "username is required"
      };
    }
    if (!email || !email.trim()) {
      return {
        success: false,
        account: null,
        message: "email is required"
      };
    }
    if (!password || !password.trim()) {
      return {
        success: false,
        account: null,
        message: "password is required"
      };
    }

    const now = new Date().toISOString();

    const account = this._persistSingleUserAccount({
      username: username.trim(),
      email: email.trim(),
      createdAt: now,
      defaultNewsletterOptIn: true
    });

    return {
      success: true,
      account,
      message: "Account created/updated"
    };
  }

  // getAccountProfile()
  getAccountProfile() {
    const raw = localStorage.getItem("account");
    let account = null;
    if (raw && raw !== "null") {
      try {
        account = JSON.parse(raw);
      } catch (e) {
        account = null;
      }
    }
    return { account };
  }

  // updateAccountPreferences(defaultNewsletterOptIn)
  updateAccountPreferences(defaultNewsletterOptIn) {
    const account = this._persistSingleUserAccount({
      defaultNewsletterOptIn:
        typeof defaultNewsletterOptIn === "boolean" ? defaultNewsletterOptIn : undefined
    });

    return {
      account,
      success: true,
      message: "Account preferences updated"
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem("about_page");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (e) {
        // fall through to default
      }
    }

    const about = {
      title: "About This Blog",
      bodyMarkdown:
        "Welcome to my personal blog for book and movie reviews. All opinions are my own.",
      sections: [
        {
          heading: "Purpose",
          contentMarkdown:
            "I write concise, honest reviews of books and movies I enjoy (or sometimes dislike)."
        }
      ]
    };
    localStorage.setItem("about_page", JSON.stringify(about));
    return about;
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
