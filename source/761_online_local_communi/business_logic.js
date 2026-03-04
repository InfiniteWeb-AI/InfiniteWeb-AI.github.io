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

  _initStorage() {
    const keys = [
      "events",
      "newsletter_subscriptions",
      "restaurants",
      "articles",
      "comments",
      "deals",
      "rental_listings",
      "rental_inquiries",
      "saved_items",
      "search_filters",
      "static_pages",
      "contact_messages"
    ];
    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });
    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
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
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _getCurrentDateTime() {
    return new Date().toISOString();
  }

  _applyListFiltersAndSorting(items, options) {
    const {
      filterFn = null,
      sortFn = null,
      page = 1,
      page_size = 20
    } = options || {};
    let result = Array.isArray(items) ? items.slice() : [];
    if (filterFn) {
      result = result.filter(filterFn);
    }
    if (sortFn) {
      result.sort(sortFn);
    }
    const total = result.length;
    const start = (Math.max(page, 1) - 1) * page_size;
    const paged = result.slice(start, start + page_size);
    return { items: paged, total };
  }

  _truncateText(text, maxLength) {
    if (!text || typeof text !== "string") return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1).trimEnd() + "…";
  }

  _formatDate(date) {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  _formatTime(date) {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  _formatDateTime(date) {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return (
      this._formatDate(d) +
      " " +
      d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    );
  }

  _formatPrice(value) {
    if (value === null || value === undefined) return "";
    if (value === 0) return "Free";
    return "$" + value.toFixed(2).replace(/\.00$/, "");
  }

  _formatDistance(distance_miles) {
    if (distance_miles === null || distance_miles === undefined) return "";
    const v = Number(distance_miles);
    if (!Number.isFinite(v)) return "";
    return v.toFixed(1).replace(/\.0$/, "") + " miles";
  }

  _mapEventCategoryLabel(value) {
    const map = {
      family_kids: "Family & Kids",
      arts_culture: "Arts & Culture",
      food_drink: "Food & Drink",
      community: "Community",
      sports: "Sports",
      music: "Music",
      education: "Education",
      other: "Other"
    };
    return map[value] || "Other";
  }

  _mapArticleSectionLabel(value) {
    const map = {
      news: "News",
      arts_culture: "Arts & Culture",
      food_drink: "Food & Drink",
      transportation: "Transportation",
      housing: "Housing",
      deals: "Deals",
      community: "Community",
      other: "Other"
    };
    return map[value] || "Other";
  }

  _mapDealCategoryLabel(value) {
    const map = {
      food_drink: "Food & Drink",
      coffee: "Coffee",
      cafes: "Cafés",
      retail: "Retail",
      services: "Services",
      entertainment: "Entertainment",
      other: "Other"
    };
    return map[value] || "Other";
  }

  _mapPriceLevelDisplay(value) {
    const map = {
      one_dollar: "$",
      two_dollar: "$$",
      three_dollar: "$$$",
      four_dollar: "$$$$"
    };
    return map[value] || "";
  }

  _estimateReadingTimeMinutes(text) {
    if (!text || typeof text !== "string") return 1;
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  }

  _parseDateInput(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  _combineDateAndTime(dateInput, timeString) {
    const date = this._parseDateInput(dateInput);
    if (!date || !timeString) return null;
    const time = String(timeString).trim();
    let hours = 0;
    let minutes = 0;
    const ampmMatch = time.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/i);
    if (ampmMatch) {
      hours = parseInt(ampmMatch[1], 10);
      minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
      const ampm = ampmMatch[3].toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
    } else {
      const parts = time.split(":");
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    }
    const d = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      0,
      0
    );
    return d.toISOString();
  }

  _getCurrentMonthRange() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: first, end: last };
  }

  _saveItemInternal(item_type, item_id, source_page) {
    const saved_items = this._getFromStorage("saved_items");
    const now = this._getCurrentDateTime();
    const existingIndex = saved_items.findIndex(
      (s) => s.item_type === item_type && s.item_id === item_id
    );
    let saved_item;
    let already_saved = false;
    if (existingIndex !== -1) {
      saved_item = { ...saved_items[existingIndex] };
      already_saved = true;
      saved_item.saved_at = now;
      if (source_page) {
        saved_item.source_page = source_page;
      }
      saved_items[existingIndex] = saved_item;
    } else {
      saved_item = {
        id: this._generateId("saved"),
        item_type,
        item_id,
        saved_at: now,
        source_page: source_page || "other"
      };
      saved_items.push(saved_item);
    }
    this._saveToStorage("saved_items", saved_items);
    return { saved_item, already_saved };
  }

  // Interface: getHomePageOverview
  getHomePageOverview() {
    const articles = this._getFromStorage("articles").filter(
      (a) => a.status === "published"
    );
    const events = this._getFromStorage("events").filter(
      (e) => e.status === "published"
    );
    const deals = this._getFromStorage("deals").filter(
      (d) => d.status === "active"
    );
    const restaurants = this._getFromStorage("restaurants").filter(
      (r) => r.status === "active"
    );
    const saved_items = this._getFromStorage("saved_items");
    const now = new Date();

    const isSaved = (type, id) =>
      saved_items.some((s) => s.item_type === type && s.item_id === id);

    const featured_articles = articles
      .slice()
      .sort(
        (a, b) =>
          new Date(b.published_at).getTime() -
          new Date(a.published_at).getTime()
      )
      .slice(0, 5)
      .map((article) => ({
        article,
        section_label: this._mapArticleSectionLabel(article.section),
        published_date_display: this._formatDate(article.published_at),
        summary_truncated: this._truncateText(article.summary || article.content || "", 160),
        is_saved: isSaved("article", article.id)
      }));

    const upcoming_events = events
      .filter((e) => {
        const d = new Date(e.start_datetime);
        return d >= now;
      })
      .sort(
        (a, b) =>
          new Date(a.start_datetime).getTime() -
          new Date(b.start_datetime).getTime()
      )
      .slice(0, 5)
      .map((event) => ({
        event,
        category_label: this._mapEventCategoryLabel(event.category),
        start_date_display: this._formatDate(event.start_datetime),
        start_time_display: this._formatTime(event.start_datetime),
        venue_display: event.venue_name || "",
        price_display:
          event.is_free || event.ticket_price === 0
            ? "Free"
            : this._formatPrice(event.ticket_price),
        distance_label: this._formatDistance(event.distance_miles),
        is_saved: isSaved("event", event.id)
      }));

    const activeDeals = deals.filter((d) => {
      const exp = new Date(d.expiry_date);
      return !Number.isNaN(exp.getTime()) && exp >= now && d.status === "active";
    });

    const top_deals = activeDeals
      .slice()
      .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0))
      .slice(0, 5)
      .map((deal) => ({
        deal,
        discount_display: (deal.discount_percent || 0) + "% off",
        expiry_date_display: this._formatDate(deal.expiry_date),
        category_label: this._mapDealCategoryLabel(deal.category),
        is_saved: isSaved("deal", deal.id)
      }));

    const dining_highlights = restaurants
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map((restaurant) => ({
        restaurant,
        rating_display:
          restaurant.rating != null ? restaurant.rating.toFixed(1) : "",
        price_level_display: this._mapPriceLevelDisplay(restaurant.price_level),
        distance_label: this._formatDistance(restaurant.distance_miles),
        is_saved: isSaved("restaurant", restaurant.id)
      }));

    const saved_items_summary = {
      total_saved: saved_items.length,
      events_count: saved_items.filter((s) => s.item_type === "event").length,
      articles_count: saved_items.filter((s) => s.item_type === "article").length,
      restaurants_count: saved_items.filter((s) => s.item_type === "restaurant").length,
      deals_count: saved_items.filter((s) => s.item_type === "deal").length
    };

    const quick_actions = [
      {
        action_id: "submit_event",
        label: "Submit an Event",
        description: "Share your community event with local readers."
      },
      {
        action_id: "view_saved_items",
        label: "View Saved Items",
        description: "See your saved events, articles, restaurants, and deals."
      },
      {
        action_id: "sign_up_newsletter",
        label: "Sign Up for Newsletter",
        description: "Get local stories and events delivered to your inbox."
      }
    ];

    return {
      featured_articles,
      upcoming_events,
      top_deals,
      dining_highlights,
      saved_items_summary,
      quick_actions
    };
  }

  // Interface: getSearchFilterOptions
  getSearchFilterOptions() {
    return {
      content_types: [
        { value: "all", label: "All" },
        { value: "articles", label: "Articles" },
        { value: "events", label: "Events" },
        { value: "deals", label: "Deals" },
        { value: "listings", label: "Housing Listings" }
      ],
      date_ranges: [
        { value: "any_time", label: "Any time" },
        { value: "last_24_hours", label: "Last 24 hours" },
        { value: "last_7_days", label: "Last 7 days" },
        { value: "last_30_days", label: "Last 30 days" },
        { value: "custom", label: "Custom range" }
      ],
      sort_options: [
        { value: "relevance", label: "Relevance" },
        { value: "newest_first", label: "Newest first" },
        { value: "oldest_first", label: "Oldest first" }
      ]
    };
  }

  // Interface: searchSiteContent
  searchSiteContent(
    keyword,
    content_type,
    date_range,
    start_date,
    end_date,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const kw = keyword ? String(keyword).toLowerCase() : "";
    const articles = this._getFromStorage("articles").filter(
      (a) => a.status === "published"
    );
    const events = this._getFromStorage("events").filter(
      (e) => e.status === "published"
    );
    const deals = this._getFromStorage("deals").filter(
      (d) => d.status === "active"
    );
    const listings = this._getFromStorage("rental_listings").filter(
      (l) => l.status === "active"
    );
    const saved_items = this._getFromStorage("saved_items");

    const now = new Date();
    let rangeStart = null;
    let rangeEnd = null;

    if (date_range === "last_24_hours") {
      rangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (date_range === "last_7_days") {
      rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (date_range === "last_30_days") {
      rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (date_range === "custom") {
      rangeStart = this._parseDateInput(start_date);
      rangeEnd = this._parseDateInput(end_date);
    }

    const inDateRange = (dateVal) => {
      if (!rangeStart && !rangeEnd) return true;
      const d = this._parseDateInput(dateVal);
      if (!d) return false;
      if (rangeStart && d < rangeStart) return false;
      if (rangeEnd && d > rangeEnd) return false;
      return true;
    };

    const matchesKeyword = (textParts) => {
      if (!kw) return true;
      const combined = textParts
        .filter((t) => t)
        .join(" ")
        .toLowerCase();
      return combined.indexOf(kw) !== -1;
    };

    const isSaved = (type, id) =>
      saved_items.some((s) => s.item_type === type && s.item_id === id);

    const results = [];

    const includeType = (type) =>
      !content_type || content_type === "all" || content_type === type;

    if (includeType("articles")) {
      articles.forEach((a) => {
        if (
          !matchesKeyword([a.title, a.summary, a.content, (a.tags || []).join(" ")])
        ) {
          return;
        }
        if (!inDateRange(a.published_at)) return;
        results.push({
          result_type: "article",
          item_id: a.id,
          title: a.title,
          snippet: this._truncateText(a.summary || a.content || "", 160),
          section_or_category_label: this._mapArticleSectionLabel(a.section),
          primary_date: a.published_at,
          primary_date_display: this._formatDate(a.published_at),
          distance_label: "",
          rating_display: "",
          price_display: "",
          thumbnail_url: a.hero_image_url || "",
          is_saved: isSaved("article", a.id),
          detail_page_type: "article_detail"
        });
      });
    }

    if (includeType("events")) {
      events.forEach((e) => {
        if (
          !matchesKeyword([
            e.title,
            e.description,
            e.venue_name,
            e.city,
            e.state
          ])
        ) {
          return;
        }
        if (!inDateRange(e.start_datetime)) return;
        results.push({
          result_type: "event",
          item_id: e.id,
          title: e.title,
          snippet: this._truncateText(e.description || "", 160),
          section_or_category_label: this._mapEventCategoryLabel(e.category),
          primary_date: e.start_datetime,
          primary_date_display: this._formatDateTime(e.start_datetime),
          distance_label: this._formatDistance(e.distance_miles),
          rating_display: "",
          price_display:
            e.is_free || e.ticket_price === 0
              ? "Free"
              : this._formatPrice(e.ticket_price),
          thumbnail_url: "",
          is_saved: isSaved("event", e.id),
          detail_page_type: "event_detail"
        });
      });
    }

    if (includeType("deals")) {
      deals.forEach((d) => {
        if (!matchesKeyword([d.title, d.description, d.business_name])) {
          return;
        }
        if (!inDateRange(d.expiry_date)) return;
        results.push({
          result_type: "deal",
          item_id: d.id,
          title: d.title,
          snippet: this._truncateText(d.description || "", 160),
          section_or_category_label: this._mapDealCategoryLabel(d.category),
          primary_date: d.expiry_date,
          primary_date_display: this._formatDate(d.expiry_date),
          distance_label: "",
          rating_display: "",
          price_display: d.deal_price != null
            ? this._formatPrice(d.deal_price)
            : "",
          thumbnail_url: "",
          is_saved: isSaved("deal", d.id),
          detail_page_type: "deal_detail"
        });
      });
    }

    if (includeType("listings")) {
      listings.forEach((l) => {
        if (!matchesKeyword([l.title, l.description, l.city, l.state])) {
          return;
        }
        if (!inDateRange(l.posted_at)) return;
        results.push({
          result_type: "rental_listing",
          item_id: l.id,
          title: l.title,
          snippet: this._truncateText(l.description || "", 160),
          section_or_category_label: "Housing",
          primary_date: l.posted_at,
          primary_date_display: this._formatDate(l.posted_at),
          distance_label: this._formatDistance(l.distance_miles),
          rating_display: "",
          price_display: this._formatPrice(l.monthly_rent),
          thumbnail_url: "",
          is_saved: false,
          detail_page_type: "rental_listing_detail"
        });
      });
    }

    // Sorting
    let sorted = results.slice();
    if (sort_by === "newest_first") {
      sorted.sort(
        (a, b) =>
          new Date(b.primary_date).getTime() -
          new Date(a.primary_date).getTime()
      );
    } else if (sort_by === "oldest_first") {
      sorted.sort(
        (a, b) =>
          new Date(a.primary_date).getTime() -
          new Date(b.primary_date).getTime()
      );
    } else {
      // relevance or default: keep insertion order
    }

    const total_results = sorted.length;
    const startIndex = (Math.max(page, 1) - 1) * page_size;
    const paged = sorted.slice(startIndex, startIndex + page_size);

    return {
      results: paged,
      total_results,
      page,
      page_size
    };
  }

  // Interface: getArticleDetail
  getArticleDetail(articleId) {
    const articles = this._getFromStorage("articles");
    const article = articles.find((a) => a.id === articleId) || null;
    const saved_items = this._getFromStorage("saved_items");
    const is_saved =
      !!article &&
      saved_items.some(
        (s) => s.item_type === "article" && s.item_id === article.id
      );

    const section_label = article
      ? this._mapArticleSectionLabel(article.section)
      : "";
    const published_date_display = article
      ? this._formatDate(article.published_at)
      : "";
    const contentForReadingTime =
      (article && (article.content || article.summary)) || "";
    const reading_time_minutes = this._estimateReadingTimeMinutes(
      contentForReadingTime
    );

    // Related articles: same section, published, newest
    let related_articles = [];
    if (article) {
      const others = articles.filter(
        (a) =>
          a.id !== article.id &&
          a.status === "published" &&
          a.section === article.section
      );
      related_articles = others
        .slice()
        .sort(
          (a, b) =>
            new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime()
        )
        .slice(0, 3)
        .map((a) => ({
          article: a,
          section_label: this._mapArticleSectionLabel(a.section),
          published_date_display: this._formatDate(a.published_at)
        }));
    }

    const comments = this._getFromStorage("comments").filter(
      (c) => c.article_id === articleId
    );
    const comments_count = comments.length;

    return {
      article,
      section_label,
      published_date_display,
      reading_time_minutes,
      is_saved,
      related_articles,
      comments_count
    };
  }

  // Interface: saveArticleToReadingList
  saveArticleToReadingList(articleId) {
    const { saved_item, already_saved } = this._saveItemInternal(
      "article",
      articleId,
      "article_detail"
    );
    const saved_items = this._getFromStorage("saved_items");
    const total_saved_articles = saved_items.filter(
      (s) => s.item_type === "article"
    ).length;
    return {
      success: true,
      saved_item_id: saved_item.id,
      already_saved,
      message: already_saved
        ? "Article was already in your Reading List."
        : "Article added to your Reading List.",
      total_saved_articles
    };
  }

  // Interface: getArticleComments
  getArticleComments(articleId, page = 1, page_size = 20) {
    const commentsAll = this._getFromStorage("comments").filter(
      (c) => c.article_id === articleId
    );
    const start = (Math.max(page, 1) - 1) * page_size;
    const paged = commentsAll.slice(start, start + page_size);
    const comments = paged.map((comment) => ({
      comment,
      display_name: comment.display_name,
      body: comment.body,
      created_date_display: this._formatDate(comment.created_at),
      status: comment.status
    }));
    return {
      comments,
      total_comments: commentsAll.length,
      page,
      page_size
    };
  }

  // Interface: postArticleComment
  postArticleComment(articleId, display_name, email, body) {
    const comments = this._getFromStorage("comments");
    const now = this._getCurrentDateTime();
    const comment = {
      id: this._generateId("comment"),
      article_id: articleId,
      display_name,
      email,
      body,
      created_at: now,
      status: "pending"
    };
    comments.push(comment);
    this._saveToStorage("comments", comments);
    return {
      success: true,
      comment,
      requires_moderation: true,
      message: "Your comment has been submitted and is awaiting moderation."
    };
  }

  // Interface: getEventsFilterOptions
  getEventsFilterOptions() {
    return {
      categories: [
        { value: "family_kids", label: "Family & Kids" },
        { value: "arts_culture", label: "Arts & Culture" },
        { value: "food_drink", label: "Food & Drink" },
        { value: "community", label: "Community" },
        { value: "sports", label: "Sports" },
        { value: "music", label: "Music" },
        { value: "education", label: "Education" },
        { value: "other", label: "Other" }
      ],
      date_presets: [
        { value: "today", label: "Today" },
        { value: "this_week", label: "This Week" },
        { value: "this_weekend", label: "This Weekend" },
        { value: "custom_range", label: "Custom Range" }
      ],
      time_of_day_options: [
        { value: "any_time", label: "Any time" },
        {
          value: "after_5pm",
          label: "After 5:00 PM",
          start_time: "17:00",
          end_time: null
        },
        {
          value: "morning",
          label: "Morning",
          start_time: "06:00",
          end_time: "12:00"
        },
        {
          value: "afternoon",
          label: "Afternoon",
          start_time: "12:00",
          end_time: "17:00"
        },
        {
          value: "evening",
          label: "Evening",
          start_time: "17:00",
          end_time: "23:59"
        }
      ],
      price_ranges: [
        { id: "free", label: "Free", min_price: 0, max_price: 0 },
        { id: "upto_25", label: "Up to $25", min_price: 0, max_price: 25 },
        { id: "25_50", label: "$25–$50", min_price: 25, max_price: 50 },
        { id: "50_plus", label: "$50+", min_price: 50, max_price: null }
      ],
      distance_options: [
        { miles: 1, label: "Within 1 mile" },
        { miles: 5, label: "Within 5 miles" },
        { miles: 10, label: "Within 10 miles" },
        { miles: 25, label: "Within 25 miles" }
      ],
      sort_options: [
        { value: "date_soonest", label: "Date – Soonest" },
        { value: "date_latest", label: "Date – Latest" },
        { value: "price_low_high", label: "Price – Low to High" },
        { value: "price_high_low", label: "Price – High to Low" }
      ]
    };
  }

  // Interface: listEvents
  listEvents(
    start_date,
    end_date,
    category,
    min_price,
    max_price,
    zip_code,
    max_distance_miles,
    time_of_day,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const eventsRaw = this._getFromStorage("events").filter(
      (e) => e.status === "published"
    );
    const start = this._parseDateInput(start_date);
    const end = this._parseDateInput(end_date);
    const hasPriceFilter =
      min_price != null || max_price != null;
    const minPrice = min_price != null ? Number(min_price) : null;
    const maxPrice = max_price != null ? Number(max_price) : null;

    const filterFn = (e) => {
      const startDt = this._parseDateInput(e.start_datetime);
      if (start && startDt && startDt < start) return false;
      if (end && startDt && startDt > end) return false;
      if (category && e.category !== category) return false;
      if (hasPriceFilter) {
        const priceVal =
          e.ticket_price != null ? Number(e.ticket_price) : 0;
        if (minPrice != null && priceVal < minPrice) return false;
        if (maxPrice != null && priceVal > maxPrice) return false;
      }
      if (max_distance_miles != null && e.distance_miles != null) {
        if (Number(e.distance_miles) > Number(max_distance_miles)) return false;
      }
      if (time_of_day && time_of_day !== "any_time" && startDt) {
        const hour = startDt.getHours();
        if (
          time_of_day === "after_5pm" ||
          time_of_day === "after_17_00"
        ) {
          if (hour < 17) return false;
        }
      }
      return true;
    };

    const sortFn = (a, b) => {
      if (sort_by === "date_soonest") {
        return (
          new Date(a.start_datetime).getTime() -
          new Date(b.start_datetime).getTime()
        );
      }
      if (sort_by === "date_latest") {
        return (
          new Date(b.start_datetime).getTime() -
          new Date(a.start_datetime).getTime()
        );
      }
      if (sort_by === "price_low_high") {
        const ap = a.ticket_price != null ? a.ticket_price : 0;
        const bp = b.ticket_price != null ? b.ticket_price : 0;
        return ap - bp;
      }
      if (sort_by === "price_high_low") {
        const ap = a.ticket_price != null ? a.ticket_price : 0;
        const bp = b.ticket_price != null ? b.ticket_price : 0;
        return bp - ap;
      }
      return (
        new Date(a.start_datetime).getTime() -
        new Date(b.start_datetime).getTime()
      );
    };

    const { items, total } = this._applyListFiltersAndSorting(eventsRaw, {
      filterFn,
      sortFn,
      page,
      page_size
    });

    const saved_items = this._getFromStorage("saved_items");
    const isSaved = (id) =>
      saved_items.some((s) => s.item_type === "event" && s.item_id === id);

    const events = items.map((event) => ({
      event,
      category_label: this._mapEventCategoryLabel(event.category),
      start_date_display: this._formatDate(event.start_datetime),
      start_time_display: this._formatTime(event.start_datetime),
      end_time_display: this._formatTime(event.end_datetime),
      venue_display: event.venue_name || "",
      price_display:
        event.is_free || event.ticket_price === 0
          ? "Free"
          : this._formatPrice(event.ticket_price),
      distance_label: this._formatDistance(event.distance_miles),
      is_saved: isSaved(event.id)
    }));

    return {
      events,
      total_events: total,
      page,
      page_size
    };
  }

  // Interface: getEventDetail
  getEventDetail(eventId) {
    const events = this._getFromStorage("events");
    const event = events.find((e) => e.id === eventId) || null;
    const saved_items = this._getFromStorage("saved_items");
    const is_saved =
      !!event &&
      saved_items.some(
        (s) => s.item_type === "event" && s.item_id === event.id
      );

    if (!event) {
      return {
        event: null,
        category_label: "",
        date_display: "",
        time_display: "",
        venue_display: "",
        full_address_display: "",
        price_display: "",
        distance_label: "",
        is_free_label: "",
        map_embed_token: null,
        is_saved: false
      };
    }

    const date_display = this._formatDate(event.start_datetime);
    const startTime = this._formatTime(event.start_datetime);
    const endTime = this._formatTime(event.end_datetime);
    const time_display = endTime ? `${startTime} – ${endTime}` : startTime;

    const addressParts = [
      event.address_line1,
      event.address_line2,
      event.city,
      event.state,
      event.zip_code
    ].filter(Boolean);
    const full_address_display = addressParts.join(", ");

    const price_display =
      event.is_free || event.ticket_price === 0
        ? "Free"
        : this._formatPrice(event.ticket_price);

    const distance_label = this._formatDistance(event.distance_miles);
    const is_free_label = event.is_free ? "Free event" : "";

    return {
      event,
      category_label: this._mapEventCategoryLabel(event.category),
      date_display,
      time_display,
      venue_display: event.venue_name || "",
      full_address_display,
      price_display,
      distance_label,
      is_free_label,
      map_embed_token: null,
      is_saved
    };
  }

  // Interface: saveEventToSavedItems
  saveEventToSavedItems(eventId, source_page) {
    const { saved_item, already_saved } = this._saveItemInternal(
      "event",
      eventId,
      source_page || "events"
    );
    const saved_items = this._getFromStorage("saved_items");
    const total_saved_events = saved_items.filter(
      (s) => s.item_type === "event"
    ).length;
    return {
      success: true,
      saved_item_id: saved_item.id,
      already_saved,
      message: already_saved
        ? "Event was already in your Saved Events."
        : "Event added to your Saved Events.",
      total_saved_events
    };
  }

  // Interface: getNewsletterSignupOptions
  getNewsletterSignupOptions() {
    return {
      topics: [
        {
          value: "food_drink",
          label: "Food & Drink",
          description: "Restaurant reviews, bar openings, and recipes."
        },
        {
          value: "arts_culture",
          label: "Arts & Culture",
          description: "Exhibits, performances, and local artists."
        },
        {
          value: "events",
          label: "Events",
          description: "Highlights of upcoming local events."
        },
        {
          value: "housing",
          label: "Housing",
          description: "Rental listings and housing news."
        },
        {
          value: "deals",
          label: "Deals",
          description: "Local discounts and special offers."
        },
        {
          value: "news",
          label: "News",
          description: "Local breaking news and top stories."
        },
        {
          value: "transportation",
          label: "Transportation",
          description: "Transit updates and biking news."
        },
        {
          value: "family_kids",
          label: "Family & Kids",
          description: "Family-friendly activities and guides."
        }
      ],
      frequencies: [
        { value: "daily", label: "Daily" },
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" }
      ]
    };
  }

  // Interface: createNewsletterSubscription
  createNewsletterSubscription(
    name,
    email,
    topics,
    frequency,
    consent_to_terms
  ) {
    const subscriptions = this._getFromStorage("newsletter_subscriptions");
    const allowedFreq = ["daily", "weekly", "monthly"];
    const freq = allowedFreq.includes(frequency) ? frequency : "daily";
    const now = this._getCurrentDateTime();
    const subscription = {
      id: this._generateId("newsletter"),
      name,
      email,
      topics: Array.isArray(topics) ? topics.slice() : [],
      frequency: freq,
      consent_to_terms: !!consent_to_terms,
      status: "active",
      created_at: now,
      updated_at: now
    };
    subscriptions.push(subscription);
    this._saveToStorage("newsletter_subscriptions", subscriptions);
    return {
      success: true,
      subscription,
      message: "Subscription created."
    };
  }

  // Interface: getDiningFilterOptions
  getDiningFilterOptions() {
    return {
      cuisine_types: [
        { value: "italian", label: "Italian" },
        { value: "coffee", label: "Coffee" },
        { value: "mexican", label: "Mexican" },
        { value: "asian", label: "Asian" },
        { value: "american", label: "American" },
        { value: "bakery", label: "Bakery" }
      ],
      categories: [
        { value: "coffee_shop", label: "Coffee Shop" },
        { value: "cafe", label: "Café" },
        { value: "restaurant", label: "Restaurant" },
        { value: "bar", label: "Bar" }
      ],
      rating_thresholds: [
        { value: 3.5, label: "3.5+ stars" },
        { value: 4.0, label: "4.0+ stars" },
        { value: 4.5, label: "4.5+ stars" }
      ],
      price_levels: [
        { value: "one_dollar", label: "Budget", symbol: "$" },
        { value: "two_dollar", label: "Moderate", symbol: "$$" },
        { value: "three_dollar", label: "Expensive", symbol: "$$$" },
        { value: "four_dollar", label: "Very Expensive", symbol: "$$$$" }
      ],
      distance_options: [
        { miles: 1, label: "Within 1 mile" },
        { miles: 3, label: "Within 3 miles" },
        { miles: 5, label: "Within 5 miles" },
        { miles: 10, label: "Within 10 miles" }
      ],
      sort_options: [
        { value: "rating_high_low", label: "Rating – High to Low" },
        { value: "distance_near_far", label: "Distance – Near to Far" },
        { value: "price_low_high", label: "Price – Low to High" }
      ]
    };
  }

  // Interface: listRestaurants
  listRestaurants(
    zip_code,
    max_distance_miles,
    min_rating,
    price_levels,
    category,
    cuisine_type,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const all = this._getFromStorage("restaurants").filter(
      (r) => r.status === "active"
    );
    const minRating = min_rating != null ? Number(min_rating) : null;
    const priceSet = Array.isArray(price_levels)
      ? new Set(price_levels)
      : null;

    const filterFn = (r) => {
      if (max_distance_miles != null && r.distance_miles != null) {
        if (Number(r.distance_miles) > Number(max_distance_miles)) return false;
      }
      if (minRating != null && r.rating != null) {
        if (Number(r.rating) < minRating) return false;
      }
      if (priceSet && priceSet.size > 0) {
        if (!priceSet.has(r.price_level)) return false;
      }
      if (category && r.category && r.category !== category) return false;
      if (cuisine_type && r.cuisine_type && r.cuisine_type !== cuisine_type)
        return false;
      return true;
    };

    const sortFn = (a, b) => {
      if (sort_by === "rating_high_low") {
        const ar = a.rating != null ? a.rating : 0;
        const br = b.rating != null ? b.rating : 0;
        return br - ar;
      }
      if (sort_by === "distance_near_far") {
        const ad = a.distance_miles != null ? a.distance_miles : Infinity;
        const bd = b.distance_miles != null ? b.distance_miles : Infinity;
        return ad - bd;
      }
      if (sort_by === "price_low_high") {
        const mapOrder = {
          one_dollar: 1,
          two_dollar: 2,
          three_dollar: 3,
          four_dollar: 4
        };
        const ap = mapOrder[a.price_level] || 99;
        const bp = mapOrder[b.price_level] || 99;
        return ap - bp;
      }
      const br = b.rating != null ? b.rating : 0;
      const ar = a.rating != null ? a.rating : 0;
      return br - ar;
    };

    const { items, total } = this._applyListFiltersAndSorting(all, {
      filterFn,
      sortFn,
      page,
      page_size
    });

    const saved_items = this._getFromStorage("saved_items");
    const isSaved = (id) =>
      saved_items.some((s) => s.item_type === "restaurant" && s.item_id === id);

    const restaurants = items.map((restaurant) => ({
      restaurant,
      rating_display:
        restaurant.rating != null ? restaurant.rating.toFixed(1) : "",
      price_level_display: this._mapPriceLevelDisplay(restaurant.price_level),
      distance_label: this._formatDistance(restaurant.distance_miles),
      is_saved: isSaved(restaurant.id)
    }));

    return {
      restaurants,
      total_restaurants: total,
      page,
      page_size
    };
  }

  // Interface: getRestaurantDetail
  getRestaurantDetail(restaurantId) {
    const restaurants = this._getFromStorage("restaurants");
    const restaurant = restaurants.find((r) => r.id === restaurantId) || null;
    const deals = this._getFromStorage("deals").filter(
      (d) => d.status === "active"
    );
    const saved_items = this._getFromStorage("saved_items");

    if (!restaurant) {
      return {
        restaurant: null,
        price_level_display: "",
        rating_display: "",
        distance_label: "",
        address_display: "",
        hours_parsed: [],
        is_saved: false,
        related_deals: []
      };
    }

    const is_saved = saved_items.some(
      (s) => s.item_type === "restaurant" && s.item_id === restaurant.id
    );

    const addressParts = [
      restaurant.address_line1,
      restaurant.address_line2,
      restaurant.city,
      restaurant.state,
      restaurant.zip_code
    ].filter(Boolean);
    const address_display = addressParts.join(", ");

    // Parse hours string into simple structure if possible
    let hours_parsed = [];
    if (restaurant.hours && typeof restaurant.hours === "string") {
      const lines = restaurant.hours.split(/\n+/);
      hours_parsed = lines
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({
          day: line,
          open: "",
          close: ""
        }));
    }

    const related_deals = deals
      .filter(
        (d) =>
          d.restaurant_id === restaurant.id ||
          (d.business_name &&
            restaurant.name &&
            d.business_name.toLowerCase().indexOf(
              restaurant.name.toLowerCase()
            ) !== -1)
      )
      .map((deal) => ({
        deal,
        discount_display: (deal.discount_percent || 0) + "% off",
        expiry_date_display: this._formatDate(deal.expiry_date)
      }));

    return {
      restaurant,
      price_level_display: this._mapPriceLevelDisplay(restaurant.price_level),
      rating_display:
        restaurant.rating != null ? restaurant.rating.toFixed(1) : "",
      distance_label: this._formatDistance(restaurant.distance_miles),
      address_display,
      hours_parsed,
      is_saved,
      related_deals
    };
  }

  // Interface: saveRestaurantFavorite
  saveRestaurantFavorite(restaurantId, source_page) {
    const { saved_item, already_saved } = this._saveItemInternal(
      "restaurant",
      restaurantId,
      source_page || "dining"
    );
    const saved_items = this._getFromStorage("saved_items");
    const total_saved_restaurants = saved_items.filter(
      (s) => s.item_type === "restaurant"
    ).length;
    return {
      success: true,
      saved_item_id: saved_item.id,
      already_saved,
      message: already_saved
        ? "Restaurant was already in your favorites."
        : "Restaurant added to your favorites.",
      total_saved_restaurants
    };
  }

  // Interface: getSavedItems
  getSavedItems(item_type, page = 1, page_size = 50) {
    const saved_items = this._getFromStorage("saved_items");
    const filtered = item_type && item_type !== "all"
      ? saved_items.filter((s) => s.item_type === item_type)
      : saved_items.slice();

    const start = (Math.max(page, 1) - 1) * page_size;
    const paged = filtered.slice(start, start + page_size);

    const events = this._getFromStorage("events");
    const articles = this._getFromStorage("articles");
    const restaurants = this._getFromStorage("restaurants");
    const deals = this._getFromStorage("deals");

    const findItem = (type, id) => {
      if (type === "event") return events.find((e) => e.id === id) || null;
      if (type === "article")
        return articles.find((a) => a.id === id) || null;
      if (type === "restaurant")
        return restaurants.find((r) => r.id === id) || null;
      if (type === "deal") return deals.find((d) => d.id === id) || null;
      return null;
    };

    const items = paged.map((saved_item) => {
      const item = findItem(saved_item.item_type, saved_item.item_id);
      let title = "";
      let summary = "";
      let primary_date_display = "";
      let category_or_section_label = "";
      let price_display = "";
      let distance_label = "";
      let rating_display = "";

      if (saved_item.item_type === "event" && item) {
        title = item.title;
        summary = this._truncateText(item.description || "", 160);
        primary_date_display = this._formatDateTime(item.start_datetime);
        category_or_section_label = this._mapEventCategoryLabel(item.category);
        price_display =
          item.is_free || item.ticket_price === 0
            ? "Free"
            : this._formatPrice(item.ticket_price);
        distance_label = this._formatDistance(item.distance_miles);
      } else if (saved_item.item_type === "article" && item) {
        title = item.title;
        summary = this._truncateText(item.summary || item.content || "", 160);
        primary_date_display = this._formatDate(item.published_at);
        category_or_section_label = this._mapArticleSectionLabel(item.section);
      } else if (saved_item.item_type === "restaurant" && item) {
        title = item.name;
        summary = this._truncateText(item.description || "", 160);
        category_or_section_label = item.cuisine_type || "";
        price_display = this._mapPriceLevelDisplay(item.price_level);
        distance_label = this._formatDistance(item.distance_miles);
        rating_display =
          item.rating != null ? item.rating.toFixed(1) : "";
      } else if (saved_item.item_type === "deal" && item) {
        title = item.title;
        summary = this._truncateText(item.description || "", 160);
        primary_date_display = this._formatDate(item.expiry_date);
        category_or_section_label = this._mapDealCategoryLabel(item.category);
        price_display =
          item.deal_price != null
            ? this._formatPrice(item.deal_price)
            : "";
      }

      return {
        saved_item,
        item_type: saved_item.item_type,
        item_id: saved_item.item_id,
        title,
        summary,
        primary_date_display,
        category_or_section_label,
        price_display,
        distance_label,
        rating_display,
        item
      };
    });

    return {
      items,
      total_items: filtered.length,
      page,
      page_size
    };
  }

  // Interface: removeSavedItem
  removeSavedItem(savedItemId) {
    const saved_items = this._getFromStorage("saved_items");
    const index = saved_items.findIndex((s) => s.id === savedItemId);
    if (index === -1) {
      return {
        success: false,
        message: "Saved item not found."
      };
    }
    saved_items.splice(index, 1);
    this._saveToStorage("saved_items", saved_items);
    return {
      success: true,
      message: "Saved item removed."
    };
  }

  // Interface: getReadingList
  getReadingList(page = 1, page_size = 50) {
    const saved_items = this._getFromStorage("saved_items").filter(
      (s) => s.item_type === "article"
    );
    // Sort by saved_at desc
    saved_items.sort(
      (a, b) =>
        new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
    );
    const articlesAll = this._getFromStorage("articles");

    const start = (Math.max(page, 1) - 1) * page_size;
    const pagedSaved = saved_items.slice(start, start + page_size);

    const articles = pagedSaved.map((saved_item) => {
      const article =
        articlesAll.find((a) => a.id === saved_item.item_id) || null;
      return {
        saved_item,
        article,
        section_label: article
          ? this._mapArticleSectionLabel(article.section)
          : "",
        published_date_display: article
          ? this._formatDate(article.published_at)
          : ""
      };
    });

    return {
      articles,
      total_articles: saved_items.length,
      page,
      page_size
    };
  }

  // Interface: getHousingFilterOptions
  getHousingFilterOptions() {
    return {
      listing_types: [
        { value: "rental", label: "Rental" },
        { value: "sublet", label: "Sublet" },
        { value: "room", label: "Room" },
        { value: "other", label: "Other" }
      ],
      bedroom_options: [
        { value: 0, label: "Studio" },
        { value: 1, label: "1 bedroom" },
        { value: 2, label: "2 bedrooms" },
        { value: 3, label: "3 bedrooms" },
        { value: 4, label: "4+ bedrooms" }
      ],
      price_ranges: [
        { id: "up_to_1200", label: "Up to $1,200", min_rent: 0, max_rent: 1200 },
        { id: "1200_2000", label: "$1,200–$2,000", min_rent: 1200, max_rent: 2000 },
        { id: "2000_plus", label: "$2,000+", min_rent: 2000, max_rent: null }
      ],
      distance_options: [
        { miles: 1, label: "Within 1 mile" },
        { miles: 3, label: "Within 3 miles" },
        { miles: 5, label: "Within 5 miles" },
        { miles: 10, label: "Within 10 miles" }
      ],
      sort_options: [
        { value: "price_low_high", label: "Price – Low to High" },
        { value: "price_high_low", label: "Price – High to Low" },
        { value: "distance_near_far", label: "Distance – Near to Far" },
        { value: "newest_first", label: "Newest First" }
      ]
    };
  }

  // Interface: listRentalListings
  listRentalListings(
    listing_type,
    zip_code,
    max_distance_miles,
    bedrooms,
    min_rent,
    max_rent,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const all = this._getFromStorage("rental_listings").filter(
      (l) => l.status === "active"
    );
    const minRent = min_rent != null ? Number(min_rent) : null;
    const maxRent = max_rent != null ? Number(max_rent) : null;
    const bedroomsVal = bedrooms != null ? Number(bedrooms) : null;

    const filterFn = (l) => {
      if (listing_type && l.listing_type !== listing_type) return false;
      if (max_distance_miles != null && l.distance_miles != null) {
        if (Number(l.distance_miles) > Number(max_distance_miles)) return false;
      }
      if (bedroomsVal != null && l.bedrooms != null) {
        if (Number(l.bedrooms) !== bedroomsVal) return false;
      }
      if (minRent != null && Number(l.monthly_rent) < minRent) return false;
      if (maxRent != null && Number(l.monthly_rent) > maxRent) return false;
      return true;
    };

    const sortFn = (a, b) => {
      if (sort_by === "price_low_high") {
        return a.monthly_rent - b.monthly_rent;
      }
      if (sort_by === "price_high_low") {
        return b.monthly_rent - a.monthly_rent;
      }
      if (sort_by === "distance_near_far") {
        const ad = a.distance_miles != null ? a.distance_miles : Infinity;
        const bd = b.distance_miles != null ? b.distance_miles : Infinity;
        return ad - bd;
      }
      if (sort_by === "newest_first") {
        const ap = a.posted_at ? new Date(a.posted_at).getTime() : 0;
        const bp = b.posted_at ? new Date(b.posted_at).getTime() : 0;
        return bp - ap;
      }
      return a.monthly_rent - b.monthly_rent;
    };

    const { items, total } = this._applyListFiltersAndSorting(all, {
      filterFn,
      sortFn,
      page,
      page_size
    });

    const listings = items.map((rental) => ({
      rental,
      title: rental.title,
      monthly_rent: rental.monthly_rent,
      bedrooms: rental.bedrooms,
      distance_label: this._formatDistance(rental.distance_miles),
      posted_date_display: this._formatDate(rental.posted_at)
    }));

    return {
      listings,
      total_listings: total,
      page,
      page_size
    };
  }

  // Interface: getRentalListingDetail
  getRentalListingDetail(rentalListingId) {
    const listings = this._getFromStorage("rental_listings");
    const rental = listings.find((l) => l.id === rentalListingId) || null;

    if (!rental) {
      return {
        rental: null,
        full_address_display: "",
        distance_label: "",
        posted_date_display: "",
        contact_options: {
          contact_name: "",
          contact_email: "",
          contact_phone: ""
        }
      };
    }

    const addressParts = [
      rental.address_line1,
      rental.address_line2,
      rental.city,
      rental.state,
      rental.zip_code
    ].filter(Boolean);
    const full_address_display = addressParts.join(", ");

    const distance_label = this._formatDistance(rental.distance_miles);
    const posted_date_display = this._formatDate(rental.posted_at);

    const contact_options = {
      contact_name: rental.contact_name || "",
      contact_email: rental.contact_email || "",
      contact_phone: rental.contact_phone || ""
    };

    return {
      rental,
      full_address_display,
      distance_label,
      posted_date_display,
      contact_options
    };
  }

  // Interface: sendRentalInquiry
  sendRentalInquiry(rentalListingId, sender_name, sender_email, message) {
    const listings = this._getFromStorage("rental_listings");
    const rental = listings.find((l) => l.id === rentalListingId);
    if (!rental) {
      return {
        success: false,
        inquiry: null,
        message: "Rental listing not found."
      };
    }
    const inquiries = this._getFromStorage("rental_inquiries");
    const inquiry = {
      id: this._generateId("inquiry"),
      rental_listing_id: rentalListingId,
      sender_name,
      sender_email,
      message,
      sent_at: this._getCurrentDateTime()
    };
    inquiries.push(inquiry);
    this._saveToStorage("rental_inquiries", inquiries);
    return {
      success: true,
      inquiry,
      message: "Inquiry sent to landlord."
    };
  }

  // Interface: getDealsFilterOptions
  getDealsFilterOptions() {
    return {
      categories: [
        { value: "food_drink", label: "Food & Drink" },
        { value: "coffee", label: "Coffee" },
        { value: "cafes", label: "Cafés" },
        { value: "retail", label: "Retail" },
        { value: "services", label: "Services" },
        { value: "entertainment", label: "Entertainment" },
        { value: "other", label: "Other" }
      ],
      discount_thresholds: [
        { value: 10, label: "10% or more" },
        { value: 20, label: "20% or more" },
        { value: 30, label: "30% or more" },
        { value: 50, label: "50% or more" }
      ],
      expiry_ranges: [
        { value: "any_time", label: "Any time" },
        { value: "this_week", label: "This week" },
        { value: "this_month", label: "This month" },
        { value: "custom", label: "Custom range" }
      ],
      sort_options: [
        { value: "discount_high_low", label: "Discount – High to Low" },
        { value: "expiry_soonest", label: "Expiry – Soonest" },
        { value: "newest_first", label: "Newest First" }
      ]
    };
  }

  // Interface: listDeals
  listDeals(
    category,
    min_discount_percent,
    expiry_range,
    custom_expiry_end_date,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const dealsAll = this._getFromStorage("deals").filter(
      (d) => d.status === "active"
    );
    const restaurants = this._getFromStorage("restaurants");
    const saved_items = this._getFromStorage("saved_items");

    const minDiscount =
      min_discount_percent != null ? Number(min_discount_percent) : null;

    let expiryEnd = null;
    if (expiry_range === "this_month") {
      expiryEnd = this._getCurrentMonthRange().end;
    } else if (expiry_range === "this_week") {
      const now = new Date();
      const endOfWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + (7 - now.getDay()),
        23,
        59,
        59,
        999
      );
      expiryEnd = endOfWeek;
    } else if (expiry_range === "custom") {
      expiryEnd = this._parseDateInput(custom_expiry_end_date);
    }

    const filterFn = (d) => {
      if (category && d.category !== category) return false;
      if (minDiscount != null) {
        if ((d.discount_percent || 0) < minDiscount) return false;
      }
      if (expiryEnd) {
        const exp = this._parseDateInput(d.expiry_date);
        if (!exp || exp > expiryEnd) return false;
      }
      return true;
    };

    const sortFn = (a, b) => {
      if (sort_by === "discount_high_low") {
        return (b.discount_percent || 0) - (a.discount_percent || 0);
      }
      if (sort_by === "expiry_soonest") {
        return (
          new Date(a.expiry_date).getTime() -
          new Date(b.expiry_date).getTime()
        );
      }
      if (sort_by === "newest_first") {
        const ac = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bc = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bc - ac;
      }
      return (b.discount_percent || 0) - (a.discount_percent || 0);
    };

    const { items, total } = this._applyListFiltersAndSorting(dealsAll, {
      filterFn,
      sortFn,
      page,
      page_size
    });

    const deals = items.map((deal) => {
      let associated_restaurant_name = "";
      if (deal.restaurant_id) {
        const r = restaurants.find((rest) => rest.id === deal.restaurant_id);
        if (r) associated_restaurant_name = r.name;
      }
      const is_saved = saved_items.some(
        (s) => s.item_type === "deal" && s.item_id === deal.id
      );
      return {
        deal,
        discount_display: (deal.discount_percent || 0) + "% off",
        expiry_date_display: this._formatDate(deal.expiry_date),
        category_label: this._mapDealCategoryLabel(deal.category),
        associated_restaurant_name,
        is_saved
      };
    });

    return {
      deals,
      total_deals: total,
      page,
      page_size
    };
  }

  // Interface: getDealDetail
  getDealDetail(dealId) {
    const deals = this._getFromStorage("deals");
    const restaurants = this._getFromStorage("restaurants");
    const saved_items = this._getFromStorage("saved_items");
    const deal = deals.find((d) => d.id === dealId) || null;

    if (!deal) {
      return {
        deal: null,
        discount_display: "",
        expiry_date_display: "",
        category_label: "",
        business_display: "",
        associated_restaurant: null,
        is_saved: false
      };
    }

    const associated_restaurant = deal.restaurant_id
      ? restaurants.find((r) => r.id === deal.restaurant_id) || null
      : null;

    const business_display =
      deal.business_name ||
      (associated_restaurant ? associated_restaurant.name : "") ||
      "";

    const is_saved = saved_items.some(
      (s) => s.item_type === "deal" && s.item_id === deal.id
    );

    return {
      deal,
      discount_display: (deal.discount_percent || 0) + "% off",
      expiry_date_display: this._formatDate(deal.expiry_date),
      category_label: this._mapDealCategoryLabel(deal.category),
      business_display,
      associated_restaurant,
      is_saved
    };
  }

  // Interface: saveDealToSavedItems
  saveDealToSavedItems(dealId, source_page) {
    const { saved_item, already_saved } = this._saveItemInternal(
      "deal",
      dealId,
      source_page || "deals"
    );
    const saved_items = this._getFromStorage("saved_items");
    const total_saved_deals = saved_items.filter(
      (s) => s.item_type === "deal"
    ).length;
    return {
      success: true,
      saved_item_id: saved_item.id,
      already_saved,
      message: already_saved
        ? "Deal was already in your Saved Offers."
        : "Deal added to your Saved Offers.",
      total_saved_deals
    };
  }

  // Interface: getSubmitEventFormConfig
  getSubmitEventFormConfig() {
    return {
      categories: [
        { value: "family_kids", label: "Family & Kids" },
        { value: "arts_culture", label: "Arts & Culture" },
        { value: "food_drink", label: "Food & Drink" },
        { value: "community", label: "Community" },
        { value: "sports", label: "Sports" },
        { value: "music", label: "Music" },
        { value: "education", label: "Education" },
        { value: "other", label: "Other" }
      ],
      price_help_text: "Enter the typical per-person ticket price. Use 0 for free events.",
      free_event_hint: "Check 'Free' or enter 0 in price for free community events.",
      default_start_time: "14:00",
      validation_rules: {
        title_min_length: 3,
        description_min_length: 10
      }
    };
  }

  // Interface: submitCommunityEvent
  submitCommunityEvent(
    title,
    date,
    start_time,
    end_time,
    venue_name,
    address_line1,
    city,
    state,
    zip_code,
    category,
    ticket_price,
    is_free,
    description
  ) {
    const events = this._getFromStorage("events");
    const eventDate = this._parseDateInput(date) || new Date();
    const start_iso = this._combineDateAndTime(eventDate, start_time || "00:00");
    const end_iso = end_time
      ? this._combineDateAndTime(eventDate, end_time)
      : null;
    const priceVal =
      ticket_price != null ? Number(ticket_price) : (is_free ? 0 : null);
    const freeFlag = is_free != null ? !!is_free : priceVal === 0;

    const now = this._getCurrentDateTime();

    const event = {
      id: this._generateId("event"),
      title,
      category: category || "community",
      description,
      start_datetime: start_iso,
      end_datetime: end_iso,
      venue_name,
      address_line1: address_line1 || "",
      address_line2: "",
      city: city || "",
      state: state || "",
      zip_code: zip_code || "",
      distance_miles: null,
      ticket_price: priceVal,
      is_free: freeFlag,
      external_ticket_url: "",
      source: "user_submitted",
      status: "draft",
      created_at: now,
      updated_at: now
    };

    events.push(event);
    this._saveToStorage("events", events);

    return {
      success: true,
      event,
      moderation_status: "pending_review",
      message: "Your event has been submitted and is pending review."
    };
  }

  // Interface: getStaticPageContent
  getStaticPageContent(page_id) {
    const pages = this._getFromStorage("static_pages");
    let page = pages.find((p) => p.page_id === page_id) || null;
    if (!page) {
      const now = this._getCurrentDateTime();
      let title = "";
      if (page_id === "about") title = "About";
      else if (page_id === "privacy_policy") title = "Privacy Policy";
      else if (page_id === "terms_of_use") title = "Terms of Use";
      else title = "";
      page = {
        page_id,
        title,
        body_html: "",
        last_updated: now
      };
    }
    return page;
  }

  // Interface: getContactPageConfig
  getContactPageConfig() {
    return {
      topics: [
        {
          value: "general_feedback",
          label: "General Feedback",
          description: "Share comments or suggestions about the magazine."
        },
        {
          value: "partnerships",
          label: "Partnerships",
          description: "Inquire about partnerships or collaborations."
        },
        {
          value: "advertising",
          label: "Advertising",
          description: "Ask about advertising opportunities."
        }
      ],
      help_text:
        "Use this form to contact the local magazine team. We typically respond within 2–3 business days."
    };
  }

  // Interface: submitContactForm
  submitContactForm(name, email, topic, subject, message) {
    const contacts = this._getFromStorage("contact_messages");
    const ticket_id = this._generateId("contact");
    const record = {
      id: ticket_id,
      name,
      email,
      topic: topic || "",
      subject,
      message,
      submitted_at: this._getCurrentDateTime()
    };
    contacts.push(record);
    this._saveToStorage("contact_messages", contacts);
    return {
      success: true,
      message: "Your message has been sent.",
      ticket_id
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
