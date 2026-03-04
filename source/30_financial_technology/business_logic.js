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

  // ---------------------- Initialization & Utilities ----------------------

  _initStorage() {
    const keysWithDefaults = {
      articles: [],
      reading_lists: [],
      reading_list_items: [],
      financial_institutions: [],
      deposit_products: [],
      comparison_sets: [],
      comparison_items: [],
      assets: [],
      price_alerts: [],
      newsletter_topics: [],
      newsletter_profiles: [],
      newsletter_subscriptions: [],
      companies: [],
      watchlists: [],
      watchlist_items: [],
      company_collections: [],
      company_collection_items: [],
      payment_app_reviews: [],
      app_lists: [],
      app_list_items: [],
      content_categories: [],
      account_tab_states: [],
      contact_requests: [] // internal use for submitContactRequest
    };

    Object.keys(keysWithDefaults).forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(keysWithDefaults[key]));
      }
    });

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ---------------------- Private helpers (specified) ----------------------

  // Internal helper to get or create the active ComparisonSet for a given comparison_type
  _getOrCreateComparisonSet(comparisonType) {
    let comparisonSets = this._getFromStorage("comparison_sets");
    const now = this._nowIso();

    let existing = comparisonSets.find((s) => s.comparison_type === comparisonType);
    if (!existing) {
      existing = {
        id: this._generateId("comparison_set"),
        comparison_type: comparisonType,
        title:
          comparisonType === "deposit_product"
            ? "Deposit Product Comparison"
            : "Payment App Comparison",
        created_at: now
      };
      comparisonSets.push(existing);
      this._saveToStorage("comparison_sets", comparisonSets);
    }

    return existing;
  }

  // Internal helper to find an existing ReadingList by name or create it
  _getOrCreateReadingListByName(name, description) {
    let lists = this._getFromStorage("reading_lists");
    const now = this._nowIso();
    let existing = lists.find((l) => l.name === name);
    if (existing) return existing;

    const newList = {
      id: this._generateId("reading_list"),
      name,
      description: description || "",
      created_at: now,
      updated_at: now,
      is_default: false
    };
    lists.push(newList);
    this._saveToStorage("reading_lists", lists);
    return newList;
  }

  // Internal helper to find or create an AppList by name
  _getOrCreateAppListByName(name, description) {
    let lists = this._getFromStorage("app_lists");
    const now = this._nowIso();
    let existing = lists.find((l) => l.name === name);
    if (existing) return existing;

    const newList = {
      id: this._generateId("app_list"),
      name,
      description: description || "",
      created_at: now,
      updated_at: now
    };
    lists.push(newList);
    this._saveToStorage("app_lists", lists);
    return newList;
  }

  // Internal helper to load or create a NewsletterProfile based on email
  _getOrCreateNewsletterProfile(email) {
    let profiles = this._getFromStorage("newsletter_profiles");
    const now = this._nowIso();
    let existing = profiles.find((p) => p.email === email);
    if (existing) return existing;

    const profile = {
      id: this._generateId("newsletter_profile"),
      email,
      region: "global",
      consent_given: false,
      created_at: now,
      updated_at: now
    };
    profiles.push(profile);
    this._saveToStorage("newsletter_profiles", profiles);
    return profile;
  }

  // Helper to get current/primary newsletter profile when no email passed
  _getCurrentNewsletterProfile() {
    const profiles = this._getFromStorage("newsletter_profiles");
    if (!profiles.length) return null;
    // Choose the one with latest updated_at, fallback to first
    let current = profiles[0];
    for (let i = 1; i < profiles.length; i++) {
      const p = profiles[i];
      if (p.updated_at && current.updated_at && p.updated_at > current.updated_at) {
        current = p;
      }
    }
    return current;
  }

  // Internal helper to persist and load the active tab state
  _persistAccountTabState(action, activeTab) {
    let states = this._getFromStorage("account_tab_states");
    const now = this._nowIso();

    if (action === "get") {
      if (!states.length) {
        const state = {
          id: this._generateId("account_tab_state"),
          active_tab: "reading_lists",
          updated_at: now
        };
        states.push(state);
        this._saveToStorage("account_tab_states", states);
        return state;
      }
      return states[0];
    }

    if (action === "set") {
      let state;
      if (!states.length) {
        state = {
          id: this._generateId("account_tab_state"),
          active_tab: activeTab,
          updated_at: now
        };
        states.push(state);
      } else {
        state = states[0];
        state.active_tab = activeTab;
        state.updated_at = now;
      }
      this._saveToStorage("account_tab_states", states);
      return state;
    }

    return null;
  }

  // ---------------------- Interface Implementations ----------------------

  // getHomepageNewsFeed(maxFeatured?, maxLatest?)
  getHomepageNewsFeed(maxFeatured = 5, maxLatest = 10) {
    const articles = this._getFromStorage("articles");
    const categories = this._getFromStorage("content_categories");

    const sortedByDate = [...articles].sort((a, b) => {
      const da = this._parseDate(a.publish_date);
      const db = this._parseDate(b.publish_date);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });

    const featured = [...articles]
      .sort((a, b) => {
        const pa = typeof a.popularity_score === "number" ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === "number" ? b.popularity_score : 0;
        if (pb !== pa) return pb - pa;
        const da = this._parseDate(a.publish_date);
        const db = this._parseDate(b.publish_date);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      })
      .slice(0, maxFeatured);

    const latest = sortedByDate.slice(0, maxLatest);

    const mapWithMeta = (article) => {
      const category = categories.find((c) => c.id === article.category_id) || null;
      return {
        article: this._clone(article),
        category_name: category ? category.name : null,
        primary_topic: article.primary_topic || null
      };
    };

    return {
      featured_articles: featured.map(mapWithMeta),
      latest_articles: latest.map((article) => {
        const category = categories.find((c) => c.id === article.category_id) || null;
        return {
          article: this._clone(article),
          category_name: category ? category.name : null
        };
      })
    };
  }

  // searchGlobalContent(query, includeArticles?, includeCompanies?, includeDepositProducts?, includePaymentAppReviews?, limitPerType?)
  searchGlobalContent(
    query,
    includeArticles = true,
    includeCompanies = true,
    includeDepositProducts = true,
    includePaymentAppReviews = true,
    limitPerType = 5
  ) {
    const q = (query || "").toLowerCase().trim();

    const result = {
      articles: [],
      companies: [],
      deposit_products: [],
      payment_app_reviews: []
    };

    if (!q) {
      return result;
    }

    if (includeArticles) {
      const articles = this._getFromStorage("articles");
      result.articles = articles
        .filter((a) => {
          const haystack = [a.title, a.summary, a.content, a.primary_topic]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          const tags = Array.isArray(a.tags) ? a.tags.join(" ").toLowerCase() : "";
          return haystack.includes(q) || tags.includes(q);
        })
        .slice(0, limitPerType)
        .map((a) => this._clone(a));
    }

    if (includeCompanies) {
      const companies = this._getFromStorage("companies");
      result.companies = companies
        .filter((c) => {
          const name = (c.name || "").toLowerCase();
          const ticker = (c.ticker_symbol || "").toLowerCase();
          return name.includes(q) || ticker.includes(q);
        })
        .slice(0, limitPerType)
        .map((c) => this._clone(c));
    }

    if (includeDepositProducts) {
      const products = this._getFromStorage("deposit_products");
      const institutions = this._getFromStorage("financial_institutions");
      result.deposit_products = products
        .filter((p) => {
          const name = (p.name || "").toLowerCase();
          const inst = institutions.find((i) => i.id === p.institution_id);
          const instName = (inst && inst.name ? inst.name : "").toLowerCase();
          return name.includes(q) || instName.includes(q);
        })
        .slice(0, limitPerType)
        .map((p) => this._clone(p));
    }

    if (includePaymentAppReviews) {
      const apps = this._getFromStorage("payment_app_reviews");
      result.payment_app_reviews = apps
        .filter((app) => {
          const name = (app.app_name || "").toLowerCase();
          const summary = (app.summary || "").toLowerCase();
          return name.includes(q) || summary.includes(q);
        })
        .slice(0, limitPerType)
        .map((a) => this._clone(a));
    }

    return result;
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const articles = this._getFromStorage("articles");

    const contentTypeSet = new Set();
    const tagSet = new Set();

    articles.forEach((a) => {
      if (a.content_type) contentTypeSet.add(a.content_type);
      if (Array.isArray(a.tags)) {
        a.tags.forEach((t) => tagSet.add(t));
      }
    });

    // Static date presets (configuration, not content mocking)
    const date_presets = [
      { id: "last_7_days", label: "Last 7 days", range_days: 7 },
      { id: "last_30_days", label: "Last 30 days", range_days: 30 },
      { id: "last_90_days", label: "Last 90 days", range_days: 90 },
      { id: "last_365_days", label: "Last 12 months", range_days: 365 }
    ];

    return {
      date_presets,
      content_types: Array.from(contentTypeSet),
      tags: Array.from(tagSet)
    };
  }

  // searchArticles(query?, datePreset?, dateFrom?, dateTo?, tags?, contentTypes?, sortBy?, page?, pageSize?)
  searchArticles(
    query,
    datePreset,
    dateFrom,
    dateTo,
    tags,
    contentTypes,
    sortBy = "newest_first",
    page = 1,
    pageSize = 20
  ) {
    const allArticles = this._getFromStorage("articles");
    const readingListItems = this._getFromStorage("reading_list_items");
    const categories = this._getFromStorage("content_categories");

    const q = (query || "").toLowerCase().trim();
    let filtered = allArticles.filter((a) => {
      if (q) {
        const haystack = [a.title, a.summary, a.content, a.primary_topic]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const tagsStr = Array.isArray(a.tags) ? a.tags.join(" ").toLowerCase() : "";
        if (!haystack.includes(q) && !tagsStr.includes(q)) return false;
      }

      // Date filtering
      let includeByDate = true;
      const pubDate = this._parseDate(a.publish_date);

      if (datePreset) {
        const now = new Date();
        let days = 0;
        if (datePreset === "last_7_days") days = 7;
        else if (datePreset === "last_30_days") days = 30;
        else if (datePreset === "last_90_days") days = 90;
        else if (datePreset === "last_365_days") days = 365;
        if (days && pubDate) {
          const minDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          includeByDate = pubDate >= minDate;
        }
      } else {
        const fromDate = this._parseDate(dateFrom);
        const toDate = this._parseDate(dateTo);
        if (fromDate && pubDate && pubDate < fromDate) includeByDate = false;
        if (toDate && pubDate && pubDate > toDate) includeByDate = false;
      }

      if (!includeByDate) return false;

      // Tag filtering (require all specified tags)
      if (Array.isArray(tags) && tags.length) {
        const articleTags = Array.isArray(a.tags) ? a.tags : [];
        const hasAll = tags.every((t) => articleTags.includes(t));
        if (!hasAll) return false;
      }

      // Content type filtering
      if (Array.isArray(contentTypes) && contentTypes.length) {
        if (!contentTypes.includes(a.content_type)) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === "oldest_first") {
        const da = this._parseDate(a.publish_date);
        const db = this._parseDate(b.publish_date);
        return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
      } else if (sortBy === "most_popular") {
        const pa = typeof a.popularity_score === "number" ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === "number" ? b.popularity_score : 0;
        if (pb !== pa) return pb - pa;
        const da = this._parseDate(a.publish_date);
        const db = this._parseDate(b.publish_date);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      } else {
        // newest_first default
        const da = this._parseDate(a.publish_date);
        const db = this._parseDate(b.publish_date);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      }
    });

    const total_results = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end);

    const resultItems = pageItems.map((article) => {
      const is_saved = readingListItems.some((i) => i.article_id === article.id);
      const category = categories.find((c) => c.id === article.category_id) || null;
      return {
        article: this._clone(article),
        category_name: category ? category.name : null,
        is_saved
      };
    });

    return {
      total_results,
      page,
      page_size: pageSize,
      articles: resultItems
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage("articles");
    const categories = this._getFromStorage("content_categories");
    const readingLists = this._getFromStorage("reading_lists");
    const readingListItems = this._getFromStorage("reading_list_items");

    const article = articles.find((a) => a.id === articleId) || null;

    // Instrumentation for task completion tracking
    try {
      // Load deposit products once for task_2 and task_8 related tracking
      const depositProducts = this._getFromStorage("deposit_products");

      if (Array.isArray(depositProducts) && depositProducts.length > 0) {
        // Task 2: task2_openedReviewDepositProductIds
        const reviewMatches = depositProducts.filter(
          (p) => p && p.review_article_id === articleId
        );
        if (reviewMatches.length > 0) {
          let task2Ids = [];
          const rawTask2 = localStorage.getItem("task2_openedReviewDepositProductIds");
          if (rawTask2) {
            try {
              const parsed = JSON.parse(rawTask2);
              if (Array.isArray(parsed)) task2Ids = parsed;
            } catch (e) {}
          }
          reviewMatches.forEach((p) => {
            if (p && typeof p.id === "string" && !task2Ids.includes(p.id)) {
              task2Ids.push(p.id);
            }
          });
          localStorage.setItem(
            "task2_openedReviewDepositProductIds",
            JSON.stringify(task2Ids)
          );
        }

        // Task 8: task8_openedRelatedDepositProductIds
        const relatedMatches = depositProducts.filter(
          (p) =>
            p &&
            Array.isArray(p.related_article_ids) &&
            p.related_article_ids.includes(articleId)
        );
        if (relatedMatches.length > 0) {
          let task8RelatedIds = [];
          const rawTask8Related = localStorage.getItem(
            "task8_openedRelatedDepositProductIds"
          );
          if (rawTask8Related) {
            try {
              const parsed = JSON.parse(rawTask8Related);
              if (Array.isArray(parsed)) task8RelatedIds = parsed;
            } catch (e) {}
          }
          relatedMatches.forEach((p) => {
            if (p && typeof p.id === "string" && !task8RelatedIds.includes(p.id)) {
              task8RelatedIds.push(p.id);
            }
          });
          localStorage.setItem(
            "task8_openedRelatedDepositProductIds",
            JSON.stringify(task8RelatedIds)
          );
        }
      }

      // Task 5: task5_openedFromCopyArticleIds
      let copiedIds = [];
      const rawCopied = localStorage.getItem("task5_copiedArticleIds");
      if (rawCopied) {
        try {
          const parsed = JSON.parse(rawCopied);
          if (Array.isArray(parsed)) copiedIds = parsed;
        } catch (e) {}
      }
      if (copiedIds.includes(articleId)) {
        let openedFromCopyIds = [];
        const rawOpenedFromCopy = localStorage.getItem(
          "task5_openedFromCopyArticleIds"
        );
        if (rawOpenedFromCopy) {
          try {
            const parsed = JSON.parse(rawOpenedFromCopy);
            if (Array.isArray(parsed)) openedFromCopyIds = parsed;
          } catch (e) {}
        }
        if (!openedFromCopyIds.includes(articleId)) {
          openedFromCopyIds.push(articleId);
          localStorage.setItem(
            "task5_openedFromCopyArticleIds",
            JSON.stringify(openedFromCopyIds)
          );
        }
      }
    } catch (e) {
      if (typeof console !== "undefined" && console.error) {
        console.error("Instrumentation error in getArticleDetail:", e);
      }
    }

    if (!article) {
      return {
        article: null,
        category_name: null,
        is_saved: false,
        saved_to_lists: [],
        related_articles: []
      };
    }

    const category = categories.find((c) => c.id === article.category_id) || null;
    const is_saved = readingListItems.some((i) => i.article_id === articleId);

    const listIds = readingListItems
      .filter((i) => i.article_id === articleId)
      .map((i) => i.reading_list_id);
    const saved_to_lists = readingLists.filter((l) => listIds.includes(l.id));

    const allArticles = articles;
    const related_articles = Array.isArray(article.related_article_ids)
      ? article.related_article_ids
          .map((id) => allArticles.find((a) => a.id === id))
          .filter(Boolean)
      : [];

    return {
      article: this._clone(article),
      category_name: category ? category.name : null,
      is_saved,
      saved_to_lists: saved_to_lists.map((l) => this._clone(l)),
      related_articles: related_articles.map((a) => this._clone(a))
    };
  }

  // copyArticleLink(articleId)
  copyArticleLink(articleId) {
    const articles = this._getFromStorage("articles");
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        url: "",
        message: "Article not found"
      };
    }

    // Instrumentation for task completion tracking (task 5: copied article IDs)
    try {
      let copiedIds = [];
      const rawCopied = localStorage.getItem("task5_copiedArticleIds");
      if (rawCopied) {
        try {
          const parsed = JSON.parse(rawCopied);
          if (Array.isArray(parsed)) copiedIds = parsed;
        } catch (e) {}
      }
      if (!copiedIds.includes(articleId)) {
        copiedIds.push(articleId);
      }
      localStorage.setItem("task5_copiedArticleIds", JSON.stringify(copiedIds));
    } catch (e) {
      if (typeof console !== "undefined" && console.error) {
        console.error("Instrumentation error in copyArticleLink:", e);
      }
    }

    // We cannot access the clipboard here; just return the URL
    return {
      success: true,
      url: article.url,
      message: "Link ready to copy"
    };
  }

  // getReadingListsOverview()
  getReadingListsOverview() {
    const lists = this._getFromStorage("reading_lists");
    const items = this._getFromStorage("reading_list_items");

    return lists.map((list) => {
      const count = items.filter((i) => i.reading_list_id === list.id).length;
      return {
        reading_list: this._clone(list),
        article_count: count
      };
    });
  }

  // createReadingList(name, description?, setAsDefault?)
  createReadingList(name, description = "", setAsDefault = false) {
    let lists = this._getFromStorage("reading_lists");
    const now = this._nowIso();

    if (setAsDefault) {
      lists = lists.map((l) => ({ ...l, is_default: false }));
    }

    const newList = {
      id: this._generateId("reading_list"),
      name,
      description,
      created_at: now,
      updated_at: now,
      is_default: !!setAsDefault
    };

    lists.push(newList);
    this._saveToStorage("reading_lists", lists);

    return this._clone(newList);
  }

  // addArticleToReadingList(articleId, readingListId)
  addArticleToReadingList(articleId, readingListId) {
    const now = this._nowIso();
    const lists = this._getFromStorage("reading_lists");
    const articles = this._getFromStorage("articles");
    let items = this._getFromStorage("reading_list_items");

    const list = lists.find((l) => l.id === readingListId);
    const article = articles.find((a) => a.id === articleId);

    if (!list || !article) {
      return {
        reading_list_item: null,
        total_items_in_list: items.filter((i) => i.reading_list_id === readingListId).length
      };
    }

    let existing = items.find(
      (i) => i.reading_list_id === readingListId && i.article_id === articleId
    );

    if (!existing) {
      existing = {
        id: this._generateId("reading_list_item"),
        reading_list_id: readingListId,
        article_id: articleId,
        added_at: now,
        position: items.filter((i) => i.reading_list_id === readingListId).length + 1
      };
      items.push(existing);
      this._saveToStorage("reading_list_items", items);
    }

    const total = items.filter((i) => i.reading_list_id === readingListId).length;

    return {
      reading_list_item: this._clone(existing),
      total_items_in_list: total
    };
  }

  // getReadingListDetail(readingListId)
  getReadingListDetail(readingListId) {
    const lists = this._getFromStorage("reading_lists");
    const items = this._getFromStorage("reading_list_items");
    const articles = this._getFromStorage("articles");

    const list = lists.find((l) => l.id === readingListId) || null;
    if (!list) {
      return {
        reading_list: null,
        items: []
      };
    }

    const listItems = items
      .filter((i) => i.reading_list_id === readingListId)
      .sort((a, b) => {
        const pa = typeof a.position === "number" ? a.position : 0;
        const pb = typeof b.position === "number" ? b.position : 0;
        return pa - pb;
      });

    const resultItems = listItems.map((item) => {
      const article = articles.find((a) => a.id === item.article_id) || null;
      return {
        reading_list_item: this._clone(item),
        article: this._clone(article)
      };
    });

    return {
      reading_list: this._clone(list),
      items: resultItems
    };
  }

  // renameReadingList(readingListId, newName)
  renameReadingList(readingListId, newName) {
    let lists = this._getFromStorage("reading_lists");
    const now = this._nowIso();
    const list = lists.find((l) => l.id === readingListId);
    if (!list) return null;

    list.name = newName;
    list.updated_at = now;

    this._saveToStorage("reading_lists", lists);
    return this._clone(list);
  }

  // deleteReadingList(readingListId)
  deleteReadingList(readingListId) {
    let lists = this._getFromStorage("reading_lists");
    let items = this._getFromStorage("reading_list_items");

    const listIndex = lists.findIndex((l) => l.id === readingListId);
    if (listIndex === -1) {
      return { success: false, message: "Reading list not found" };
    }

    lists.splice(listIndex, 1);
    items = items.filter((i) => i.reading_list_id !== readingListId);

    this._saveToStorage("reading_lists", lists);
    this._saveToStorage("reading_list_items", items);

    return { success: true, message: "Reading list deleted" };
  }

  // removeArticleFromReadingList(readingListId, articleId)
  removeArticleFromReadingList(readingListId, articleId) {
    let items = this._getFromStorage("reading_list_items");
    const beforeLen = items.length;
    items = items.filter(
      (i) => !(i.reading_list_id === readingListId && i.article_id === articleId)
    );
    const changed = items.length !== beforeLen;
    if (changed) {
      this._saveToStorage("reading_list_items", items);
    }
    return changed;
  }

  // getDepositProductFilterOptions(listingType)
  getDepositProductFilterOptions(listingType) {
    const products = this._getFromStorage("deposit_products");
    const filtered = products.filter((p) => p.listing_type === listingType);

    const providerSet = new Set();
    const bankTypeSet = new Set();
    const termSet = new Set();
    const currencySet = new Set();

    filtered.forEach((p) => {
      if (p.provider_type) providerSet.add(p.provider_type);
      if (p.bank_type) bankTypeSet.add(p.bank_type);
      if (typeof p.term_months === "number") termSet.add(p.term_months);
      if (p.currency) currencySet.add(p.currency);
    });

    return {
      provider_types: Array.from(providerSet),
      bank_types: Array.from(bankTypeSet),
      term_options_months: Array.from(termSet).sort((a, b) => a - b),
      currency_options: Array.from(currencySet)
    };
  }

  // listDepositProducts(listingType, providerType?, bankType?, termMonths?, apyMin?, minimumDepositMax?, monthlyFeeMax?, currency?, sortBy?, page?, pageSize?)
  listDepositProducts(
    listingType,
    providerType,
    bankType,
    termMonths,
    apyMin,
    minimumDepositMax,
    monthlyFeeMax,
    currency = "USD",
    sortBy = "apy_desc",
    page = 1,
    pageSize = 25
  ) {
    const products = this._getFromStorage("deposit_products");
    const institutions = this._getFromStorage("financial_institutions");
    const comparisonSets = this._getFromStorage("comparison_sets");
    const comparisonItems = this._getFromStorage("comparison_items");

    const comparisonSet = comparisonSets.find(
      (s) => s.comparison_type === "deposit_product"
    );

    let filtered = products.filter((p) => p.listing_type === listingType);

    if (providerType) {
      filtered = filtered.filter((p) => p.provider_type === providerType);
    }

    if (bankType) {
      filtered = filtered.filter((p) => p.bank_type === bankType);
    }

    if (typeof termMonths === "number") {
      filtered = filtered.filter((p) => p.term_months === termMonths);
    }

    if (typeof apyMin === "number") {
      filtered = filtered.filter((p) => typeof p.apy === "number" && p.apy >= apyMin);
    }

    if (typeof minimumDepositMax === "number") {
      filtered = filtered.filter((p) => {
        if (typeof p.minimum_deposit === "number") {
          return p.minimum_deposit <= minimumDepositMax;
        }
        // Treat undefined as 0 requirement
        return 0 <= minimumDepositMax;
      });
    }

    if (typeof monthlyFeeMax === "number") {
      filtered = filtered.filter((p) => {
        const fee = typeof p.monthly_fee === "number" ? p.monthly_fee : 0;
        return fee <= monthlyFeeMax;
      });
    }

    if (currency) {
      filtered = filtered.filter((p) => !p.currency || p.currency === currency);
    }

    // Sorting
    filtered.sort((a, b) => {
      const apyA = typeof a.apy === "number" ? a.apy : 0;
      const apyB = typeof b.apy === "number" ? b.apy : 0;
      if (sortBy === "apy_asc") {
        return apyA - apyB;
      }
      // default apy_desc
      return apyB - apyA;
    });

    const total_results = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageProducts = filtered.slice(start, end);

    const resultProducts = pageProducts.map((p) => {
      const institution = institutions.find((i) => i.id === p.institution_id) || null;
      const is_in_comparison = !!(
        comparisonSet &&
        comparisonItems.some(
          (ci) =>
            ci.comparison_set_id === comparisonSet.id &&
            ci.item_type === "deposit_product" &&
            ci.item_id === p.id
        )
      );
      return {
        deposit_product: this._clone(p),
        institution: this._clone(institution),
        is_in_comparison
      };
    });

    return {
      total_results,
      page,
      page_size: pageSize,
      products: resultProducts
    };
  }

  // getDepositProductDetail(depositProductId)
  getDepositProductDetail(depositProductId) {
    const products = this._getFromStorage("deposit_products");
    const institutions = this._getFromStorage("financial_institutions");
    const articles = this._getFromStorage("articles");
    const comparisonSets = this._getFromStorage("comparison_sets");
    const comparisonItems = this._getFromStorage("comparison_items");

    const depositProduct = products.find((p) => p.id === depositProductId) || null;
    if (!depositProduct) {
      return {
        deposit_product: null,
        institution: null,
        review_article: null,
        related_articles: [],
        is_in_comparison: false,
        is_favorite_in_comparison: false
      };
    }

    const institution = institutions.find((i) => i.id === depositProduct.institution_id) || null;

    let review_article = depositProduct.review_article_id
      ? articles.find((a) => a.id === depositProduct.review_article_id) || null
      : null;

    let related_articles = Array.isArray(depositProduct.related_article_ids)
      ? depositProduct.related_article_ids
          .map((id) => articles.find((a) => a.id === id))
          .filter(Boolean)
      : [];

    // Fallback: if no explicit review or related articles are found, associate a generic article
    if (!review_article && (!related_articles || related_articles.length === 0)) {
      if (Array.isArray(articles) && articles.length > 0) {
        review_article = articles[0];
      }
    }

    const comparisonSet = comparisonSets.find(
      (s) => s.comparison_type === "deposit_product"
    );

    let is_in_comparison = false;
    let is_favorite_in_comparison = false;

    if (comparisonSet) {
      const items = comparisonItems.filter(
        (ci) =>
          ci.comparison_set_id === comparisonSet.id &&
          ci.item_type === "deposit_product" &&
          ci.item_id === depositProduct.id
      );
      is_in_comparison = items.length > 0;
      is_favorite_in_comparison = items.some((ci) => ci.is_favorite);
    }

    // Instrumentation for task completion tracking (task 8: opened deposit products)
    try {
      let openedIds = [];
      const rawOpened = localStorage.getItem("task8_openedDepositProductIds");
      if (rawOpened) {
        try {
          const parsed = JSON.parse(rawOpened);
          if (Array.isArray(parsed)) openedIds = parsed;
        } catch (e) {}
      }
      if (!openedIds.includes(depositProductId)) {
        openedIds.push(depositProductId);
      }
      localStorage.setItem("task8_openedDepositProductIds", JSON.stringify(openedIds));
    } catch (e) {
      if (typeof console !== "undefined" && console.error) {
        console.error("Instrumentation error in getDepositProductDetail:", e);
      }
    }

    return {
      deposit_product: this._clone(depositProduct),
      institution: this._clone(institution),
      review_article: this._clone(review_article),
      related_articles: related_articles.map((a) => this._clone(a)),
      is_in_comparison,
      is_favorite_in_comparison
    };
  }

  // addDepositProductToComparison(depositProductId)
  addDepositProductToComparison(depositProductId) {
    const comparisonSet = this._getOrCreateComparisonSet("deposit_product");
    let items = this._getFromStorage("comparison_items");
    const now = this._nowIso();

    let existing = items.find(
      (ci) =>
        ci.comparison_set_id === comparisonSet.id &&
        ci.item_type === "deposit_product" &&
        ci.item_id === depositProductId
    );

    if (!existing) {
      existing = {
        id: this._generateId("comparison_item"),
        comparison_set_id: comparisonSet.id,
        item_type: "deposit_product",
        item_id: depositProductId,
        is_favorite: false,
        added_at: now
      };
      items.push(existing);
      this._saveToStorage("comparison_items", items);
    }

    const setItems = items.filter((i) => i.comparison_set_id === comparisonSet.id);

    return {
      comparison_set: this._clone(comparisonSet),
      items: setItems.map((i) => this._clone(i))
    };
  }

  // addPaymentAppToComparison(paymentAppReviewId)
  addPaymentAppToComparison(paymentAppReviewId) {
    const comparisonSet = this._getOrCreateComparisonSet("payment_app_review");
    let items = this._getFromStorage("comparison_items");
    const now = this._nowIso();

    let existing = items.find(
      (ci) =>
        ci.comparison_set_id === comparisonSet.id &&
        ci.item_type === "payment_app_review" &&
        ci.item_id === paymentAppReviewId
    );

    if (!existing) {
      existing = {
        id: this._generateId("comparison_item"),
        comparison_set_id: comparisonSet.id,
        item_type: "payment_app_review",
        item_id: paymentAppReviewId,
        is_favorite: false,
        added_at: now
      };
      items.push(existing);
      this._saveToStorage("comparison_items", items);
    }

    const setItems = items.filter((i) => i.comparison_set_id === comparisonSet.id);

    return {
      comparison_set: this._clone(comparisonSet),
      items: setItems.map((i) => this._clone(i))
    };
  }

  // getActiveComparisonSet(comparisonType)
  getActiveComparisonSet(comparisonType) {
    const comparisonSets = this._getFromStorage("comparison_sets");
    const comparisonItems = this._getFromStorage("comparison_items");
    const depositProducts = this._getFromStorage("deposit_products");
    const financialInstitutions = this._getFromStorage("financial_institutions");
    const paymentAppReviews = this._getFromStorage("payment_app_reviews");

    const comparison_set =
      comparisonSets.find((s) => s.comparison_type === comparisonType) || null;

    if (!comparison_set) {
      return {
        comparison_set: null,
        items: []
      };
    }

    const itemsRaw = comparisonItems.filter(
      (ci) => ci.comparison_set_id === comparison_set.id
    );

    const items = itemsRaw.map((ci) => {
      let deposit_product = null;
      let financial_institution = null;
      let payment_app_review = null;

      if (ci.item_type === "deposit_product") {
        deposit_product = depositProducts.find((p) => p.id === ci.item_id) || null;
        if (deposit_product) {
          financial_institution =
            financialInstitutions.find((fi) => fi.id === deposit_product.institution_id) || null;
        }
      } else if (ci.item_type === "payment_app_review") {
        payment_app_review =
          paymentAppReviews.find((app) => app.id === ci.item_id) || null;
      }

      return {
        comparison_item: this._clone(ci),
        deposit_product: this._clone(deposit_product),
        financial_institution: this._clone(financial_institution),
        payment_app_review: this._clone(payment_app_review)
      };
    });

    return {
      comparison_set: this._clone(comparison_set),
      items
    };
  }

  // setComparisonFavorite(comparisonSetId, itemId)
  setComparisonFavorite(comparisonSetId, itemId) {
    let comparisonSets = this._getFromStorage("comparison_sets");
    let comparisonItems = this._getFromStorage("comparison_items");

    const set = comparisonSets.find((s) => s.id === comparisonSetId);
    if (!set) return null;

    // itemId may be a ComparisonItem.id or the underlying item_id (e.g. deposit product or app id)
    comparisonItems = comparisonItems.map((ci) => {
      if (ci.comparison_set_id !== comparisonSetId) return ci;
      const matches = ci.id === itemId || ci.item_id === itemId;
      return {
        ...ci,
        is_favorite: matches
      };
    });

    this._saveToStorage("comparison_items", comparisonItems);
    return this._clone(set);
  }

  // removeItemFromComparison(comparisonSetId, comparisonItemId)
  removeItemFromComparison(comparisonSetId, comparisonItemId) {
    let items = this._getFromStorage("comparison_items");
    const before = items.length;
    items = items.filter(
      (ci) => !(ci.comparison_set_id === comparisonSetId && ci.id === comparisonItemId)
    );
    const changed = items.length !== before;
    if (changed) {
      this._saveToStorage("comparison_items", items);
    }
    return changed;
  }

  // clearComparisonSet(comparisonType)
  clearComparisonSet(comparisonType) {
    const comparisonSets = this._getFromStorage("comparison_sets");
    let comparisonItems = this._getFromStorage("comparison_items");

    const set = comparisonSets.find((s) => s.comparison_type === comparisonType);
    if (!set) return false;

    const before = comparisonItems.length;
    comparisonItems = comparisonItems.filter((ci) => ci.comparison_set_id !== set.id);
    const changed = comparisonItems.length !== before;
    if (changed) {
      this._saveToStorage("comparison_items", comparisonItems);
    }
    return changed;
  }

  // searchAssets(query, assetTypes?, maxResults?)
  searchAssets(query, assetTypes, maxResults = 10) {
    const q = (query || "").toLowerCase().trim();
    if (!q) return [];

    const assets = this._getFromStorage("assets");
    let filtered = assets.filter((a) => {
      const name = (a.name || "").toLowerCase();
      const symbol = (a.symbol || "").toLowerCase();
      return name.includes(q) || symbol.includes(q);
    });

    if (Array.isArray(assetTypes) && assetTypes.length) {
      const set = new Set(assetTypes);
      filtered = filtered.filter((a) => set.has(a.asset_type));
    }

    return filtered.slice(0, maxResults).map((a) => this._clone(a));
  }

  // createPriceAlert(assetId, conditionType, thresholdPrice, currency, frequency)
  createPriceAlert(assetId, conditionType, thresholdPrice, currency = "USD", frequency) {
    const now = this._nowIso();
    const alerts = this._getFromStorage("price_alerts");

    const alert = {
      id: this._generateId("price_alert"),
      asset_id: assetId,
      condition_type: conditionType,
      threshold_price: thresholdPrice,
      currency,
      frequency,
      is_active: true,
      created_at: now,
      last_triggered_at: null
    };

    alerts.push(alert);
    this._saveToStorage("price_alerts", alerts);

    return this._clone(alert);
  }

  // getPriceAlerts()
  getPriceAlerts() {
    const alerts = this._getFromStorage("price_alerts");
    const assets = this._getFromStorage("assets");

    return alerts.map((alert) => {
      const asset = assets.find((a) => a.id === alert.asset_id) || null;
      return {
        price_alert: this._clone(alert),
        asset: this._clone(asset)
      };
    });
  }

  // updatePriceAlert(priceAlertId, conditionType?, thresholdPrice?, frequency?, isActive?)
  updatePriceAlert(priceAlertId, conditionType, thresholdPrice, frequency, isActive) {
    let alerts = this._getFromStorage("price_alerts");
    const alert = alerts.find((a) => a.id === priceAlertId);
    if (!alert) return null;

    if (conditionType !== undefined && conditionType !== null) {
      alert.condition_type = conditionType;
    }
    if (typeof thresholdPrice === "number") {
      alert.threshold_price = thresholdPrice;
    }
    if (frequency !== undefined && frequency !== null) {
      alert.frequency = frequency;
    }
    if (typeof isActive === "boolean") {
      alert.is_active = isActive;
    }

    this._saveToStorage("price_alerts", alerts);
    return this._clone(alert);
  }

  // deletePriceAlert(priceAlertId)
  deletePriceAlert(priceAlertId) {
    let alerts = this._getFromStorage("price_alerts");
    const before = alerts.length;
    alerts = alerts.filter((a) => a.id !== priceAlertId);
    const changed = alerts.length !== before;
    if (changed) {
      this._saveToStorage("price_alerts", alerts);
    }
    return changed;
  }

  // getNewsletterTopicsAndPreferences()
  getNewsletterTopicsAndPreferences() {
    const topics = this._getFromStorage("newsletter_topics");
    const subscriptions = this._getFromStorage("newsletter_subscriptions");
    const profile = this._getCurrentNewsletterProfile();

    const topicEntries = topics.map((topic) => {
      let subscription = null;
      if (profile) {
        subscription =
          subscriptions.find(
            (s) => s.profile_id === profile.id && s.topic_id === topic.id
          ) || null;
      }
      return {
        topic: this._clone(topic),
        subscription: this._clone(subscription)
      };
    });

    return {
      profile: this._clone(profile),
      topics: topicEntries
    };
  }

  // submitNewsletterSignup(email, region, consentGiven, selections)
  submitNewsletterSignup(email, region, consentGiven, selections) {
    const now = this._nowIso();
    let topics = this._getFromStorage("newsletter_topics");
    let subscriptions = this._getFromStorage("newsletter_subscriptions");

    const profile = this._getOrCreateNewsletterProfile(email);
    profile.region = region;
    profile.consent_given = !!consentGiven;
    profile.updated_at = now;

    // Persist updated profile
    let profiles = this._getFromStorage("newsletter_profiles");
    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx !== -1) {
      profiles[idx] = profile;
    } else {
      profiles.push(profile);
    }
    this._saveToStorage("newsletter_profiles", profiles);

    // Apply selections
    if (Array.isArray(selections)) {
      selections.forEach((sel) => {
        if (!sel || !sel.topicId) return;
        const topicExists = topics.some((t) => t.id === sel.topicId);
        if (!topicExists) return;

        let sub = subscriptions.find(
          (s) => s.profile_id === profile.id && s.topic_id === sel.topicId
        );

        if (!sub) {
          sub = {
            id: this._generateId("newsletter_subscription"),
            profile_id: profile.id,
            topic_id: sel.topicId,
            frequency: sel.frequency,
            enabled: !!sel.enabled,
            created_at: now,
            updated_at: now
          };
          subscriptions.push(sub);
        } else {
          sub.frequency = sel.frequency;
          sub.enabled = !!sel.enabled;
          sub.updated_at = now;
        }
      });
    }

    this._saveToStorage("newsletter_subscriptions", subscriptions);

    const subsForProfile = subscriptions.filter((s) => s.profile_id === profile.id);

    return {
      profile: this._clone(profile),
      subscriptions: subsForProfile.map((s) => this._clone(s))
    };
  }

  // updateNewsletterSubscriptions(updates)
  updateNewsletterSubscriptions(updates) {
    let subscriptions = this._getFromStorage("newsletter_subscriptions");
    const topics = this._getFromStorage("newsletter_topics");
    let profile = this._getCurrentNewsletterProfile();
    const now = this._nowIso();

    if (!profile) {
      // Create a generic profile if none exists yet
      profile = this._getOrCreateNewsletterProfile("unknown@local");
      profile.region = "global";
      profile.consent_given = true;
      profile.updated_at = now;
      let profiles = this._getFromStorage("newsletter_profiles");
      const idx = profiles.findIndex((p) => p.id === profile.id);
      if (idx !== -1) profiles[idx] = profile;
      else profiles.push(profile);
      this._saveToStorage("newsletter_profiles", profiles);
    }

    if (Array.isArray(updates)) {
      updates.forEach((upd) => {
        if (!upd || !upd.topicId) return;
        const topicExists = topics.some((t) => t.id === upd.topicId);
        if (!topicExists) return;

        let sub = subscriptions.find(
          (s) => s.profile_id === profile.id && s.topic_id === upd.topicId
        );

        if (!sub) {
          sub = {
            id: this._generateId("newsletter_subscription"),
            profile_id: profile.id,
            topic_id: upd.topicId,
            frequency: upd.frequency || "weekly",
            enabled: typeof upd.enabled === "boolean" ? upd.enabled : true,
            created_at: now,
            updated_at: now
          };
          subscriptions.push(sub);
        } else {
          if (upd.frequency) sub.frequency = upd.frequency;
          if (typeof upd.enabled === "boolean") sub.enabled = upd.enabled;
          sub.updated_at = now;
        }
      });
    }

    this._saveToStorage("newsletter_subscriptions", subscriptions);

    const subsForProfile = subscriptions.filter((s) => s.profile_id === profile.id);
    return subsForProfile.map((s) => this._clone(s));
  }

  // getCompanyDirectoryFilterOptions()
  getCompanyDirectoryFilterOptions() {
    const companies = this._getFromStorage("companies");

    const sectorSet = new Set();
    const industrySet = new Set();
    const isBankSet = new Set();
    const isFintechSet = new Set();

    companies.forEach((c) => {
      if (c.sector) sectorSet.add(c.sector);
      if (c.industry) industrySet.add(c.industry);
      if (typeof c.is_bank === "boolean") isBankSet.add(c.is_bank);
      if (typeof c.is_fintech === "boolean") isFintechSet.add(c.is_fintech);
    });

    return {
      sectors: Array.from(sectorSet),
      industries: Array.from(industrySet),
      is_bank_options: Array.from(isBankSet),
      is_fintech_options: Array.from(isFintechSet)
    };
  }

  // listCompanies(sector?, industry?, isBank?, isFintech?, searchQuery?, sortBy?, page?, pageSize?)
  listCompanies(
    sector,
    industry,
    isBank,
    isFintech,
    searchQuery,
    sortBy = "name_asc",
    page = 1,
    pageSize = 25
  ) {
    const companies = this._getFromStorage("companies");
    const q = (searchQuery || "").toLowerCase().trim();

    let filtered = companies.filter((c) => {
      if (sector && c.sector !== sector) return false;
      if (industry && c.industry !== industry) return false;
      if (typeof isBank === "boolean" && c.is_bank !== isBank) return false;
      if (typeof isFintech === "boolean" && c.is_fintech !== isFintech) return false;
      if (q) {
        const name = (c.name || "").toLowerCase();
        const ticker = (c.ticker_symbol || "").toLowerCase();
        if (!name.includes(q) && !ticker.includes(q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === "market_cap_desc") {
        const ma = typeof a.market_cap === "number" ? a.market_cap : 0;
        const mb = typeof b.market_cap === "number" ? b.market_cap : 0;
        return mb - ma;
      }
      if (sortBy === "market_cap_asc") {
        const ma = typeof a.market_cap === "number" ? a.market_cap : 0;
        const mb = typeof b.market_cap === "number" ? b.market_cap : 0;
        return ma - mb;
      }
      if (sortBy === "name_desc") {
        return (b.name || "").localeCompare(a.name || "");
      }
      // name_asc default
      return (a.name || "").localeCompare(b.name || "");
    });

    const total_results = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageCompanies = filtered.slice(start, end).map((c) => this._clone(c));

    return {
      total_results,
      page,
      page_size: pageSize,
      companies: pageCompanies
    };
  }

  // createWatchlist(name, description?)
  createWatchlist(name, description = "") {
    const now = this._nowIso();
    let watchlists = this._getFromStorage("watchlists");

    const watchlist = {
      id: this._generateId("watchlist"),
      name,
      description,
      created_at: now,
      updated_at: now
    };

    watchlists.push(watchlist);
    this._saveToStorage("watchlists", watchlists);

    return this._clone(watchlist);
  }

  // addCompanyToWatchlist(companyId, watchlistId)
  addCompanyToWatchlist(companyId, watchlistId) {
    const now = this._nowIso();
    const companies = this._getFromStorage("companies");
    const watchlists = this._getFromStorage("watchlists");
    let items = this._getFromStorage("watchlist_items");

    const company = companies.find((c) => c.id === companyId);
    const watchlist = watchlists.find((w) => w.id === watchlistId);
    if (!company || !watchlist) return null;

    let existing = items.find(
      (i) => i.watchlist_id === watchlistId && i.company_id === companyId
    );

    if (!existing) {
      existing = {
        id: this._generateId("watchlist_item"),
        watchlist_id: watchlistId,
        company_id: companyId,
        added_at: now,
        position: items.filter((i) => i.watchlist_id === watchlistId).length + 1
      };
      items.push(existing);
      this._saveToStorage("watchlist_items", items);
    }

    return this._clone(existing);
  }

  // getWatchlists()
  getWatchlists() {
    const watchlists = this._getFromStorage("watchlists");
    const items = this._getFromStorage("watchlist_items");

    return watchlists.map((w) => {
      const count = items.filter((i) => i.watchlist_id === w.id).length;
      return {
        watchlist: this._clone(w),
        company_count: count
      };
    });
  }

  // getWatchlistDetail(watchlistId, sortBy?)
  getWatchlistDetail(watchlistId, sortBy = "market_cap_desc") {
    const watchlists = this._getFromStorage("watchlists");
    const items = this._getFromStorage("watchlist_items");
    const companies = this._getFromStorage("companies");

    const watchlist = watchlists.find((w) => w.id === watchlistId) || null;
    if (!watchlist) {
      return {
        watchlist: null,
        items: []
      };
    }

    const watchlistItems = items.filter((i) => i.watchlist_id === watchlistId);

    const joined = watchlistItems.map((wi) => {
      const company = companies.find((c) => c.id === wi.company_id) || null;
      return {
        watchlist_item: this._clone(wi),
        company: this._clone(company)
      };
    });

    joined.sort((a, b) => {
      const ca = a.company || {};
      const cb = b.company || {};
      if (sortBy === "name_asc") {
        return (ca.name || "").localeCompare(cb.name || "");
      }
      if (sortBy === "name_desc") {
        return (cb.name || "").localeCompare(ca.name || "");
      }
      // market_cap_desc default
      const ma = typeof ca.market_cap === "number" ? ca.market_cap : 0;
      const mb = typeof cb.market_cap === "number" ? cb.market_cap : 0;
      return mb - ma;
    });

    return {
      watchlist: this._clone(watchlist),
      items: joined
    };
  }

  // listFundingTrackerCompanies(year?, industry?, sector?, isFintech?, sortBy?, page?, pageSize?)
  listFundingTrackerCompanies(
    year,
    industry,
    sector,
    isFintech,
    sortBy = "total_funding_desc",
    page = 1,
    pageSize = 25
  ) {
    const companies = this._getFromStorage("companies");

    let filtered = companies.filter((c) => {
      if (typeof year === "number" && c.last_funding_year !== year) return false;
      if (industry && c.industry !== industry) return false;
      if (sector && c.sector !== sector) return false;
      if (typeof isFintech === "boolean" && c.is_fintech !== isFintech) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const fa = typeof a.total_funding === "number" ? a.total_funding : 0;
      const fb = typeof b.total_funding === "number" ? b.total_funding : 0;
      if (sortBy === "total_funding_asc") return fa - fb;
      return fb - fa; // total_funding_desc default
    });

    const total_results = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageCompanies = filtered.slice(start, end).map((c) => this._clone(c));

    return {
      total_results,
      page,
      page_size: pageSize,
      companies: pageCompanies
    };
  }

  // getCompanyProfile(companyId)
  getCompanyProfile(companyId) {
    const companies = this._getFromStorage("companies");
    const company = companies.find((c) => c.id === companyId) || null;
    return this._clone(company);
  }

  // createCompanyCollection(name, description?)
  createCompanyCollection(name, description = "") {
    const now = this._nowIso();
    let collections = this._getFromStorage("company_collections");

    const collection = {
      id: this._generateId("company_collection"),
      name,
      description,
      created_at: now,
      updated_at: now
    };

    collections.push(collection);
    this._saveToStorage("company_collections", collections);

    return this._clone(collection);
  }

  // addCompanyToCollection(companyId, collectionId, notes?)
  addCompanyToCollection(companyId, collectionId, notes = "") {
    const now = this._nowIso();
    const companies = this._getFromStorage("companies");
    const collections = this._getFromStorage("company_collections");
    let items = this._getFromStorage("company_collection_items");

    const company = companies.find((c) => c.id === companyId);
    const collection = collections.find((c) => c.id === collectionId);
    if (!company || !collection) return null;

    let existing = items.find(
      (i) => i.collection_id === collectionId && i.company_id === companyId
    );

    if (!existing) {
      existing = {
        id: this._generateId("company_collection_item"),
        collection_id: collectionId,
        company_id: companyId,
        added_at: now,
        notes
      };
      items.push(existing);
      this._saveToStorage("company_collection_items", items);
    } else if (notes) {
      existing.notes = notes;
      this._saveToStorage("company_collection_items", items);
    }

    return this._clone(existing);
  }

  // getCompanyCollections()
  getCompanyCollections() {
    const collections = this._getFromStorage("company_collections");
    return collections.map((c) => this._clone(c));
  }

  // getPaymentAppReviewFilterOptions()
  getPaymentAppReviewFilterOptions() {
    const apps = this._getFromStorage("payment_app_reviews");
    const appTypeSet = new Set();

    apps.forEach((a) => {
      if (a.app_type) appTypeSet.add(a.app_type);
    });

    // Static rating steps config
    const min_rating_steps = [0, 1, 2, 3, 3.5, 4, 4.5, 5];

    const publish_date_presets = [
      { id: "last_6_months", label: "Last 6 months" },
      { id: "last_12_months", label: "Last 12 months" },
      { id: "since_2023", label: "Since 2023" }
    ];

    return {
      app_types: Array.from(appTypeSet),
      min_rating_steps,
      publish_date_presets
    };
  }

  // listPaymentAppReviews(appType?, minUserRating?, publishDateFrom?, publishDateTo?, sortBy?, page?, pageSize?)
  listPaymentAppReviews(
    appType,
    minUserRating,
    publishDateFrom,
    publishDateTo,
    sortBy = "user_rating_desc",
    page = 1,
    pageSize = 20
  ) {
    const apps = this._getFromStorage("payment_app_reviews");

    let filtered = apps.filter((app) => {
      if (appType && app.app_type !== appType) return false;
      if (typeof minUserRating === "number" && app.user_rating < minUserRating) return false;

      const pubDate = this._parseDate(app.publish_date);
      const from = this._parseDate(publishDateFrom);
      const to = this._parseDate(publishDateTo);

      if (from && pubDate && pubDate < from) return false;
      if (to && pubDate && pubDate > to) return false;

      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === "publish_date_desc") {
        const da = this._parseDate(a.publish_date);
        const db = this._parseDate(b.publish_date);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      }
      if (sortBy === "publish_date_asc") {
        const da = this._parseDate(a.publish_date);
        const db = this._parseDate(b.publish_date);
        return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
      }
      if (sortBy === "user_rating_asc") {
        return a.user_rating - b.user_rating;
      }
      // user_rating_desc default
      return b.user_rating - a.user_rating;
    });

    const total_results = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageApps = filtered.slice(start, end).map((a) => this._clone(a));

    return {
      total_results,
      page,
      page_size: pageSize,
      apps: pageApps
    };
  }

  // getPaymentAppReviewDetail(paymentAppReviewId)
  getPaymentAppReviewDetail(paymentAppReviewId) {
    const apps = this._getFromStorage("payment_app_reviews");
    const app = apps.find((a) => a.id === paymentAppReviewId) || null;
    return this._clone(app);
  }

  // getAppListsOverview()
  getAppListsOverview() {
    const lists = this._getFromStorage("app_lists");
    const items = this._getFromStorage("app_list_items");

    return lists.map((l) => {
      const count = items.filter((i) => i.app_list_id === l.id).length;
      return {
        app_list: this._clone(l),
        app_count: count
      };
    });
  }

  // createAppList(name, description?)
  createAppList(name, description = "") {
    const now = this._nowIso();
    let lists = this._getFromStorage("app_lists");

    const list = {
      id: this._generateId("app_list"),
      name,
      description,
      created_at: now,
      updated_at: now
    };

    lists.push(list);
    this._saveToStorage("app_lists", lists);

    return this._clone(list);
  }

  // addPaymentAppToList(paymentAppReviewId, appListId, note?)
  addPaymentAppToList(paymentAppReviewId, appListId, note = "") {
    const now = this._nowIso();
    const apps = this._getFromStorage("payment_app_reviews");
    const lists = this._getFromStorage("app_lists");
    let items = this._getFromStorage("app_list_items");

    const app = apps.find((a) => a.id === paymentAppReviewId);
    const list = lists.find((l) => l.id === appListId);
    if (!app || !list) return null;

    let existing = items.find(
      (i) => i.app_list_id === appListId && i.payment_app_review_id === paymentAppReviewId
    );

    if (!existing) {
      existing = {
        id: this._generateId("app_list_item"),
        app_list_id: appListId,
        payment_app_review_id: paymentAppReviewId,
        added_at: now,
        note
      };
      items.push(existing);
      this._saveToStorage("app_list_items", items);
    } else if (note) {
      existing.note = note;
      this._saveToStorage("app_list_items", items);
    }

    return this._clone(existing);
  }

  // updateAppListItemNote(appListItemId, note)
  updateAppListItemNote(appListItemId, note) {
    let items = this._getFromStorage("app_list_items");
    const item = items.find((i) => i.id === appListItemId);
    if (!item) return null;

    item.note = note;
    this._saveToStorage("app_list_items", items);
    return this._clone(item);
  }

  // getAppListDetail(appListId)
  getAppListDetail(appListId) {
    const lists = this._getFromStorage("app_lists");
    const items = this._getFromStorage("app_list_items");
    const apps = this._getFromStorage("payment_app_reviews");

    const list = lists.find((l) => l.id === appListId) || null;
    if (!list) {
      return {
        app_list: null,
        items: []
      };
    }

    const listItems = items.filter((i) => i.app_list_id === appListId);

    const joined = listItems.map((li) => {
      const app = apps.find((a) => a.id === li.payment_app_review_id) || null;
      return {
        app_list_item: this._clone(li),
        payment_app_review: this._clone(app)
      };
    });

    return {
      app_list: this._clone(list),
      items: joined
    };
  }

  // getAccountOverview()
  getAccountOverview() {
    const readingLists = this._getFromStorage("reading_lists");
    const watchlists = this._getFromStorage("watchlists");
    const priceAlerts = this._getFromStorage("price_alerts");
    const newsletterSubscriptions = this._getFromStorage("newsletter_subscriptions");

    const reading_list_count = readingLists.length;
    const watchlist_count = watchlists.length;
    const price_alert_count = priceAlerts.length;
    const newsletter_subscription_count = newsletterSubscriptions.filter(
      (s) => s.enabled
    ).length;

    return {
      reading_list_count,
      watchlist_count,
      price_alert_count,
      newsletter_subscription_count
    };
  }

  // getAccountActiveTab()
  getAccountActiveTab() {
    const state = this._persistAccountTabState("get");
    return this._clone(state);
  }

  // setAccountActiveTab(activeTab)
  setAccountActiveTab(activeTab) {
    const allowed = ["reading_lists", "watchlists", "price_alerts", "newsletters"];
    const tab = allowed.includes(activeTab) ? activeTab : "reading_lists";
    const state = this._persistAccountTabState("set", tab);
    return this._clone(state);
  }

  // getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const nowIso = this._nowIso();
    const pages = {
      about: {
        title: "About",
        content_html: "<h1>About</h1><p>Information about this site.</p>",
        last_updated: nowIso
      },
      help_faq: {
        title: "Help & FAQ",
        content_html: "<h1>Help & FAQ</h1><p>Frequently asked questions.</p>",
        last_updated: nowIso
      },
      privacy_policy: {
        title: "Privacy Policy",
        content_html: "<h1>Privacy Policy</h1><p>Our privacy practices.</p>",
        last_updated: nowIso
      },
      terms_of_use: {
        title: "Terms of Use",
        content_html: "<h1>Terms of Use</h1><p>Website terms of use.</p>",
        last_updated: nowIso
      },
      contact: {
        title: "Contact",
        content_html: "<h1>Contact</h1><p>How to contact us.</p>",
        last_updated: nowIso
      }
    };

    const page = pages[pageSlug] || {
      title: "",
      content_html: "",
      last_updated: nowIso
    };

    return this._clone(page);
  }

  // submitContactRequest(name, email, topic, message)
  submitContactRequest(name, email, topic, message) {
    const now = this._nowIso();
    let requests = this._getFromStorage("contact_requests");

    const ticketId = this._generateId("ticket");
    const request = {
      id: ticketId,
      name,
      email,
      topic: topic || null,
      message,
      created_at: now
    };

    requests.push(request);
    this._saveToStorage("contact_requests", requests);

    return {
      success: true,
      ticket_id: ticketId,
      message: "Your request has been received."
    };
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
