// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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
      'article_bookmarks',
      'events',
      'event_rsvps',
      'forum_categories',
      'forum_topics',
      'forum_posts',
      'polls',
      'poll_options',
      'topic_subscriptions',
      'spam_reports',
      'classified_categories',
      'classified_listings',
      'message_threads',
      'messages',
      'businesses',
      'business_favorites'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Informational pages are stored as a key->page map object
    if (!localStorage.getItem('informational_pages')) {
      localStorage.setItem('informational_pages', JSON.stringify({}));
    }

    // Notification settings are created lazily via _getOrCreateNotificationSettings

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue;
    }
    try {
      return JSON.parse(data);
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : new Date(t);
  }

  _ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  _textMatches(text, query) {
    if (!query) return true;
    if (!text) return false;
    return String(text).toLowerCase().includes(String(query).toLowerCase());
  }

  _uniq(array) {
    return Array.from(new Set(array));
  }

  // -------------------- Required private helpers --------------------

  // Article bookmarks store
  _getOrCreateBookmarkStore() {
    let bookmarks = this._getFromStorage('article_bookmarks', []);
    if (!Array.isArray(bookmarks)) {
      bookmarks = [];
      this._saveToStorage('article_bookmarks', bookmarks);
    }
    return bookmarks;
  }

  // Notification settings singleton
  _getOrCreateNotificationSettings() {
    const key = 'notification_settings';
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through and recreate if corrupted
      }
    }
    const now = this._nowISO();
    const settings = {
      id: this._generateId('notificationSettings'),
      emergency_alerts_enabled: false,
      road_closures_enabled: false,
      sports_updates_enabled: true,
      forum_replies_frequency: 'immediate',
      updated_at: now
    };
    localStorage.setItem(key, JSON.stringify(settings));
    return settings;
  }

  // Distance helper – does not create mock distances, only returns existing distance_miles if present
  _computeDistanceFromZip(entity, referenceZip) {
    // If entity already has distance_miles computed relative to referenceZip, just return it.
    if (entity && typeof entity.distance_miles === 'number') {
      return entity.distance_miles;
    }
    // No distance information available; return null instead of mocking data
    return null;
  }

  // Message thread helper: find existing or create new for a listing
  _getOrCreateMessageThreadForListing(listingId, initialMessageBody) {
    const now = this._nowISO();
    const listings = this._getFromStorage('classified_listings', []);
    const listing = listings.find((l) => l.id === listingId) || null;

    let threads = this._getFromStorage('message_threads', []);
    let thread = threads.find((t) => t.listing_id === listingId) || null;

    if (!thread) {
      const subjectBase = listing ? listing.title : 'Classified listing';
      thread = {
        id: this._generateId('thread'),
        listing_id: listingId,
        subject: 'Inquiry about: ' + subjectBase,
        other_party_name: null,
        created_at: now,
        updated_at: now,
        last_message_preview: initialMessageBody || '',
        unread_count: 0
      };
      threads.push(thread);
      this._saveToStorage('message_threads', threads);
    }

    // Return thread with resolved listing for convenience
    return {
      ...thread,
      listing
    };
  }

  // -------------------- Homepage & Search --------------------

  // getHomepageHighlights(): { recent_news: Article[], upcoming_events: Event[], active_discussions: ForumTopic[] }
  getHomepageHighlights() {
    const now = this._nowISO();
    const nowDate = this._parseDate(now);

    const articles = this._getFromStorage('articles', []);
    const events = this._getFromStorage('events', []);
    const topics = this._getFromStorage('forum_topics', []);
    const categories = this._getFromStorage('forum_categories', []);

    const recent_news = [...articles]
      .sort((a, b) => {
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return bd - ad;
      })
      .slice(0, 5);

    const upcoming_events = events
      .filter((e) => {
        const d = this._parseDate(e.start_datetime);
        return d && d >= nowDate;
      })
      .sort((a, b) => {
        const ad = this._parseDate(a.start_datetime) || new Date(0);
        const bd = this._parseDate(b.start_datetime) || new Date(0);
        return ad - bd;
      })
      .slice(0, 5);

    const active_discussions_raw = [...topics]
      .sort((a, b) => {
        const aReplies = typeof a.reply_count === 'number' ? a.reply_count : 0;
        const bReplies = typeof b.reply_count === 'number' ? b.reply_count : 0;
        if (bReplies !== aReplies) return bReplies - aReplies;
        const ad = this._parseDate(a.updated_at || a.created_at) || new Date(0);
        const bd = this._parseDate(b.updated_at || b.created_at) || new Date(0);
        return bd - ad;
      })
      .slice(0, 5);

    const active_discussions = active_discussions_raw.map((topic) => ({
      ...topic,
      category: categories.find((c) => c.id === topic.category_id) || null
    }));

    return {
      recent_news,
      upcoming_events,
      active_discussions
    };
  }

  // searchSite(query: string, page: number = 1)
  searchSite(query, page = 1) {
    const q = (query || '').trim();
    if (!q) {
      return {
        articles: [],
        events: [],
        forum_topics: [],
        classified_listings: [],
        businesses: []
      };
    }

    const articles = this._getFromStorage('articles', []);
    const events = this._getFromStorage('events', []);
    const topics = this._getFromStorage('forum_topics', []);
    const categories = this._getFromStorage('forum_categories', []);
    const listings = this._getFromStorage('classified_listings', []);
    const classifiedCategories = this._getFromStorage('classified_categories', []);
    const businesses = this._getFromStorage('businesses', []);

    const lower = q.toLowerCase();

    const matchedArticles = articles.filter((a) => {
      const fields = [a.title, a.summary, a.body]
        .concat(this._ensureArray(a.tags).join(' '));
      return fields.some((f) => this._textMatches(f, lower));
    });

    const matchedEvents = events.filter((e) => {
      const fields = [e.title, e.description, e.location_name]
        .concat(this._ensureArray(e.tags).join(' '));
      return fields.some((f) => this._textMatches(f, lower));
    });

    const matchedTopics = topics
      .filter((t) => {
        const fields = [t.title, t.body].concat(this._ensureArray(t.tags).join(' '));
        return fields.some((f) => this._textMatches(f, lower));
      })
      .map((topic) => ({
        ...topic,
        category: categories.find((c) => c.id === topic.category_id) || null
      }));

    const matchedListings = listings
      .filter((l) => {
        const fields = [l.title, l.description].concat(this._ensureArray(l.tags).join(' '));
        return fields.some((f) => this._textMatches(f, lower));
      })
      .map((listing) => ({
        ...listing,
        category: classifiedCategories.find((c) => c.id === listing.category_id) || null
      }));

    const matchedBusinesses = businesses.filter((b) => {
      const fields = [b.name, b.description]
        .concat(this._ensureArray(b.cuisine_types).join(' '));
      return fields.some((f) => this._textMatches(f, lower));
    });

    return {
      articles: matchedArticles,
      events: matchedEvents,
      forum_topics: matchedTopics,
      classified_listings: matchedListings,
      businesses: matchedBusinesses
    };
  }

  // -------------------- News --------------------

  // getNewsFilterOptions()
  getNewsFilterOptions() {
    const articles = this._getFromStorage('articles', []);

    const categories = this._uniq(
      articles
        .map((a) => a.category)
        .filter((c) => c && typeof c === 'string')
    ).map((key) => ({
      key,
      label: key
    }));

    const tags = this._uniq(
      articles.reduce((acc, a) => {
        return acc.concat(this._ensureArray(a.tags));
      }, [])
    );

    const date_ranges = [
      { key: 'today', label: 'Today' },
      { key: 'last_7_days', label: 'Last 7 days' },
      { key: 'this_month', label: 'This month' },
      { key: 'all', label: 'All time' }
    ];

    return { date_ranges, categories, tags };
  }

  // searchNewsArticles(query?: string, filters?: object, page?: number)
  searchNewsArticles(query, filters = {}, page = 1) {
    let articles = this._getFromStorage('articles', []);
    const q = (query || '').trim();

    if (q) {
      const lower = q.toLowerCase();
      articles = articles.filter((a) => {
        const fields = [a.title, a.summary, a.body]
          .concat(this._ensureArray(a.tags).join(' '));
        return fields.some((f) => this._textMatches(f, lower));
      });
    }

    if (filters.category_key) {
      articles = articles.filter((a) => a.category === filters.category_key);
    }

    if (filters.tag) {
      articles = articles.filter((a) => this._ensureArray(a.tags).includes(filters.tag));
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filters.date_range_key) {
      if (filters.date_range_key === 'today') {
        const from = startOfToday;
        const to = new Date(startOfToday);
        to.setDate(to.getDate() + 1);
        articles = articles.filter((a) => {
          const d = this._parseDate(a.published_at);
          return d && d >= from && d < to;
        });
      } else if (filters.date_range_key === 'last_7_days') {
        const from = new Date(now);
        from.setDate(from.getDate() - 7);
        articles = articles.filter((a) => {
          const d = this._parseDate(a.published_at);
          return d && d >= from && d <= now;
        });
      } else if (filters.date_range_key === 'this_month') {
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        articles = articles.filter((a) => {
          const d = this._parseDate(a.published_at);
          return d && d >= from && d < to;
        });
      }
      // 'all' leaves list unchanged
    }

    if (filters.from_date || filters.to_date) {
      const from = filters.from_date ? this._parseDate(filters.from_date) : null;
      const to = filters.to_date ? this._parseDate(filters.to_date) : null;
      articles = articles.filter((a) => {
        const d = this._parseDate(a.published_at);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    const sortKey = filters.sort_key || 'newest_first';
    if (sortKey === 'oldest_first') {
      articles.sort((a, b) => {
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return ad - bd;
      });
    } else {
      // newest_first
      articles.sort((a, b) => {
        const ad = this._parseDate(a.published_at) || new Date(0);
        const bd = this._parseDate(b.published_at) || new Date(0);
        return bd - ad;
      });
    }

    const pageSize = 20;
    const total_results = articles.length;
    const start = (page - 1) * pageSize;
    const paged = articles.slice(start, start + pageSize);

    return {
      articles: paged,
      total_results,
      page
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;
    const bookmarks = this._getFromStorage('article_bookmarks', []);
    const is_bookmarked = !!bookmarks.find((b) => b.article_id === articleId);

    let related_articles = [];
    if (article) {
      related_articles = articles
        .filter((a) => a.id !== article.id)
        .filter((a) => a.category === article.category)
        .slice(0, 5);
    }

    return {
      article,
      is_bookmarked,
      related_articles
    };
  }

  // bookmarkArticle(articleId)
  bookmarkArticle(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        success: false,
        bookmark: null,
        message: 'Article not found'
      };
    }

    let bookmarks = this._getOrCreateBookmarkStore();
    let bookmark = bookmarks.find((b) => b.article_id === articleId) || null;
    if (!bookmark) {
      bookmark = {
        id: this._generateId('articleBookmark'),
        article_id: articleId,
        created_at: this._nowISO()
      };
      bookmarks.push(bookmark);
      this._saveToStorage('article_bookmarks', bookmarks);
    }

    // Resolve foreign key article_id -> article
    const enrichedBookmark = {
      ...bookmark,
      article
    };

    return {
      success: true,
      bookmark: enrichedBookmark,
      message: 'Article bookmarked'
    };
  }

  // getRelatedArticles(articleId)
  getRelatedArticles(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) return [];

    const related = articles
      .filter((a) => a.id !== article.id)
      .filter((a) => a.category === article.category)
      .slice(0, 10);

    return related;
  }

  // -------------------- Events --------------------

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    const date_ranges = [
      { key: 'today', label: 'Today' },
      { key: 'this_week', label: 'This Week' },
      { key: 'this_weekend', label: 'This Weekend' },
      { key: 'next_30_days', label: 'Next 30 Days' }
    ];

    const price_types = [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' },
      { value: 'donation', label: 'Donation' },
      { value: 'unknown', label: 'Unknown' }
    ];

    const audience_tags = this._uniq(
      events.reduce((acc, e) => acc.concat(this._ensureArray(e.audience_tags)), [])
    );

    return { date_ranges, price_types, audience_tags };
  }

  // searchEvents(filters?: object, sort_key?: string, page?: number)
  searchEvents(filters = {}, sort_key = 'date_soonest_first', page = 1) {
    let events = this._getFromStorage('events', []);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filters.date_range_key) {
      if (filters.date_range_key === 'today') {
        const from = startOfToday;
        const to = new Date(startOfToday);
        to.setDate(to.getDate() + 1);
        events = events.filter((e) => {
          const d = this._parseDate(e.start_datetime);
          return d && d >= from && d < to;
        });
      } else if (filters.date_range_key === 'this_week') {
        // Monday (1) to Sunday (0) range
        const day = startOfToday.getDay();
        const diffToMonday = (day === 0 ? -6 : 1 - day); // days to Monday
        const from = new Date(startOfToday);
        from.setDate(from.getDate() + diffToMonday);
        const to = new Date(from);
        to.setDate(to.getDate() + 7);
        events = events.filter((e) => {
          const d = this._parseDate(e.start_datetime);
          return d && d >= from && d < to;
        });
      } else if (filters.date_range_key === 'this_weekend') {
        const day = startOfToday.getDay(); // 0 Sun .. 6 Sat
        const daysUntilSaturday = (6 - day + 7) % 7;
        const saturday = new Date(startOfToday);
        saturday.setDate(saturday.getDate() + daysUntilSaturday);
        const sundayEnd = new Date(saturday);
        sundayEnd.setDate(sundayEnd.getDate() + 2); // up to Monday 00:00
        events = events.filter((e) => {
          const d = this._parseDate(e.start_datetime);
          return d && d >= saturday && d < sundayEnd;
        });
      } else if (filters.date_range_key === 'next_30_days') {
        const from = startOfToday;
        const to = new Date(startOfToday);
        to.setDate(to.getDate() + 30);
        events = events.filter((e) => {
          const d = this._parseDate(e.start_datetime);
          return d && d >= from && d < to;
        });
      }
    }

    if (filters.from_datetime || filters.to_datetime) {
      const from = filters.from_datetime ? this._parseDate(filters.from_datetime) : null;
      const to = filters.to_datetime ? this._parseDate(filters.to_datetime) : null;
      events = events.filter((e) => {
        const d = this._parseDate(e.start_datetime);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    if (filters.price_type) {
      events = events.filter((e) => e.price_type === filters.price_type);
    }

    if (filters.audience_tag) {
      events = events.filter((e) => this._ensureArray(e.audience_tags).includes(filters.audience_tag));
    }

    if (sort_key === 'date_latest_first') {
      events.sort((a, b) => {
        const ad = this._parseDate(a.start_datetime) || new Date(0);
        const bd = this._parseDate(b.start_datetime) || new Date(0);
        return bd - ad;
      });
    } else {
      // date_soonest_first
      events.sort((a, b) => {
        const ad = this._parseDate(a.start_datetime) || new Date(0);
        const bd = this._parseDate(b.start_datetime) || new Date(0);
        return ad - bd;
      });
    }

    const pageSize = 20;
    const total_results = events.length;
    const start = (page - 1) * pageSize;
    const paged = events.slice(start, start + pageSize);

    return {
      events: paged,
      total_results,
      page
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    const rsvps = this._getFromStorage('event_rsvps', []);
    const rsvpRaw = rsvps.find((r) => r.event_id === eventId) || null;

    const rsvp = rsvpRaw
      ? {
          ...rsvpRaw,
          event
        }
      : null;

    return { event, rsvp };
  }

  // rsvpToEvent(eventId, status)
  rsvpToEvent(eventId, status) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return null;
    }

    let rsvps = this._getFromStorage('event_rsvps', []);
    let rsvp = rsvps.find((r) => r.event_id === eventId) || null;
    const now = this._nowISO();

    if (!rsvp) {
      rsvp = {
        id: this._generateId('eventRsvp'),
        event_id: eventId,
        status,
        added_to_calendar: false,
        rsvp_at: now,
        updated_at: null
      };
      rsvps.push(rsvp);
    } else {
      rsvp.status = status;
      rsvp.updated_at = now;
    }

    this._saveToStorage('event_rsvps', rsvps);

    return {
      ...rsvp,
      event
    };
  }

  // updateEventCalendarStatus(eventId, added_to_calendar)
  updateEventCalendarStatus(eventId, added_to_calendar) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return null;
    }

    let rsvps = this._getFromStorage('event_rsvps', []);
    let rsvp = rsvps.find((r) => r.event_id === eventId) || null;
    const now = this._nowISO();

    if (!rsvp) {
      rsvp = {
        id: this._generateId('eventRsvp'),
        event_id: eventId,
        status: 'going',
        added_to_calendar: !!added_to_calendar,
        rsvp_at: now,
        updated_at: null
      };
      rsvps.push(rsvp);
    } else {
      rsvp.added_to_calendar = !!added_to_calendar;
      rsvp.updated_at = now;
    }

    this._saveToStorage('event_rsvps', rsvps);

    return {
      ...rsvp,
      event
    };
  }

  // getMyCalendarEvents(filters?)
  getMyCalendarEvents(filters = {}) {
    const events = this._getFromStorage('events', []);
    const rsvps = this._getFromStorage('event_rsvps', []);

    let items = rsvps.filter((r) => r.status !== 'not_going');

    if (filters.only_added_to_calendar) {
      items = items.filter((r) => r.added_to_calendar);
    }

    const from = filters.from_date ? this._parseDate(filters.from_date) : null;
    const to = filters.to_date ? this._parseDate(filters.to_date) : null;

    const result = [];
    for (const r of items) {
      const event = events.find((e) => e.id === r.event_id);
      if (!event) continue;
      if (from || to) {
        const d = this._parseDate(event.start_datetime);
        if (!d) continue;
        if (from && d < from) continue;
        if (to && d > to) continue;
      }
      const enrichedRsvp = { ...r, event };
      result.push({ event, rsvp: enrichedRsvp });
    }

    return result;
  }

  // -------------------- Forums --------------------

  // getForumCategories()
  getForumCategories() {
    return this._getFromStorage('forum_categories', []);
  }

  // getForumTopics(categoryId, sort_key?, page?)
  getForumTopics(categoryId, sort_key = 'latest_activity', page = 1) {
    const topics = this._getFromStorage('forum_topics', []);
    const categories = this._getFromStorage('forum_categories', []);

    let filtered = topics.filter((t) => t.category_id === categoryId);

    if (sort_key === 'most_replies') {
      filtered.sort((a, b) => {
        const ar = typeof a.reply_count === 'number' ? a.reply_count : 0;
        const br = typeof b.reply_count === 'number' ? b.reply_count : 0;
        return br - ar;
      });
    } else if (sort_key === 'newest_first') {
      filtered.sort((a, b) => {
        const ad = this._parseDate(a.created_at) || new Date(0);
        const bd = this._parseDate(b.created_at) || new Date(0);
        return bd - ad;
      });
    } else {
      // latest_activity
      filtered.sort((a, b) => {
        const ad = this._parseDate(a.updated_at || a.created_at) || new Date(0);
        const bd = this._parseDate(b.updated_at || b.created_at) || new Date(0);
        return bd - ad;
      });
    }

    const pageSize = 20;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return paged.map((topic) => ({
      ...topic,
      category: categories.find((c) => c.id === topic.category_id) || null
    }));
  }

  // searchForumTopics(query, page?)
  searchForumTopics(query, page = 1) {
    const q = (query || '').trim();
    if (!q) return [];

    const topics = this._getFromStorage('forum_topics', []);
    const categories = this._getFromStorage('forum_categories', []);
    const lower = q.toLowerCase();

    let filtered = topics.filter((t) => {
      const fields = [t.title, t.body].concat(this._ensureArray(t.tags).join(' '));
      return fields.some((f) => this._textMatches(f, lower));
    });

    const pageSize = 20;
    const start = (page - 1) * pageSize;
    filtered = filtered.slice(start, start + pageSize);

    return filtered.map((topic) => ({
      ...topic,
      category: categories.find((c) => c.id === topic.category_id) || null
    }));
  }

  // getDiscussionThread(topicId, reply_sort_key?, page?)
  getDiscussionThread(topicId, reply_sort_key = 'oldest_first', page = 1) {
    const topics = this._getFromStorage('forum_topics', []);
    const categories = this._getFromStorage('forum_categories', []);
    const posts = this._getFromStorage('forum_posts', []);
    const subs = this._getFromStorage('topic_subscriptions', []);

    const topicRaw = topics.find((t) => t.id === topicId) || null;
    const topic = topicRaw
      ? {
          ...topicRaw,
          category: categories.find((c) => c.id === topicRaw.category_id) || null
        }
      : null;

    let threadPosts = posts.filter((p) => p.topic_id === topicId && !p.is_deleted);

    if (reply_sort_key === 'most_liked') {
      threadPosts.sort((a, b) => {
        const al = typeof a.like_count === 'number' ? a.like_count : 0;
        const bl = typeof b.like_count === 'number' ? b.like_count : 0;
        if (bl !== al) return bl - al;
        const ad = this._parseDate(a.created_at) || new Date(0);
        const bd = this._parseDate(b.created_at) || new Date(0);
        return ad - bd;
      });
    } else if (reply_sort_key === 'newest_first') {
      threadPosts.sort((a, b) => {
        const ad = this._parseDate(a.created_at) || new Date(0);
        const bd = this._parseDate(b.created_at) || new Date(0);
        return bd - ad;
      });
    } else {
      // oldest_first
      threadPosts.sort((a, b) => {
        const ad = this._parseDate(a.created_at) || new Date(0);
        const bd = this._parseDate(b.created_at) || new Date(0);
        return ad - bd;
      });
    }

    const pageSize = 50;
    const start = (page - 1) * pageSize;
    const pagedPosts = threadPosts.slice(start, start + pageSize);

    const postsById = new Map();
    threadPosts.forEach((p) => postsById.set(p.id, p));

    const enrichedPosts = pagedPosts.map((p) => ({
      ...p,
      topic,
      parent_post: p.parent_post_id ? postsById.get(p.parent_post_id) || null : null
    }));

    const is_subscribed = !!subs.find((s) => s.topic_id === topicId && s.is_active);

    return {
      topic,
      posts: enrichedPosts,
      is_subscribed
    };
  }

  // replyToForumPost(postId, body, quote_original?)
  replyToForumPost(postId, body, quote_original = false) {
    if (!body || !postId) return null;

    const posts = this._getFromStorage('forum_posts', []);
    const topics = this._getFromStorage('forum_topics', []);
    const categories = this._getFromStorage('forum_categories', []);

    const parent = posts.find((p) => p.id === postId) || null;
    if (!parent) return null;

    const topicRaw = topics.find((t) => t.id === parent.topic_id) || null;
    const topic = topicRaw
      ? {
          ...topicRaw,
          category: categories.find((c) => c.id === topicRaw.category_id) || null
        }
      : null;

    let replyBody = body;
    if (quote_original && parent.body) {
      replyBody = '> ' + String(parent.body).replace(/\n/g, '\n> ') + '\n\n' + body;
    }

    const now = this._nowISO();
    const reply = {
      id: this._generateId('forumPost'),
      topic_id: parent.topic_id,
      parent_post_id: parent.id,
      body: replyBody,
      created_at: now,
      updated_at: null,
      like_count: 0,
      is_deleted: false
    };

    posts.push(reply);
    this._saveToStorage('forum_posts', posts);

    // update topic reply_count and updated_at
    if (topicRaw) {
      topicRaw.reply_count = (topicRaw.reply_count || 0) + 1;
      topicRaw.updated_at = now;
      this._saveToStorage('forum_topics', topics);
    }

    return {
      ...reply,
      topic,
      parent_post: parent
    };
  }

  // reportForumPost(postId, reason, details?)
  reportForumPost(postId, reason, details) {
    const posts = this._getFromStorage('forum_posts', []);
    const target = posts.find((p) => p.id === postId) || null;
    if (!target) return null;

    let reports = this._getFromStorage('spam_reports', []);
    const report = {
      id: this._generateId('spamReport'),
      post_id: postId,
      reason,
      details: details || '',
      created_at: this._nowISO(),
      resolved: false,
      resolved_at: null
    };

    reports.push(report);
    this._saveToStorage('spam_reports', reports);

    return {
      ...report,
      post: target
    };
  }

  // subscribeToTopic(topicId, subscribe)
  subscribeToTopic(topicId, subscribe) {
    const topics = this._getFromStorage('forum_topics', []);
    const categories = this._getFromStorage('forum_categories', []);
    const topicRaw = topics.find((t) => t.id === topicId) || null;
    if (!topicRaw) return null;

    const topic = {
      ...topicRaw,
      category: categories.find((c) => c.id === topicRaw.category_id) || null
    };

    let subs = this._getFromStorage('topic_subscriptions', []);
    let sub = subs.find((s) => s.topic_id === topicId) || null;

    if (subscribe) {
      if (!sub) {
        sub = {
          id: this._generateId('topicSubscription'),
          topic_id: topicId,
          subscribed_at: this._nowISO(),
          is_active: true
        };
        subs.push(sub);
      } else {
        sub.is_active = true;
      }
    } else {
      if (!sub) {
        return null;
      }
      sub.is_active = false;
    }

    this._saveToStorage('topic_subscriptions', subs);

    return {
      ...sub,
      topic
    };
  }

  // createForumTopicWithPoll(categoryId, title, body, poll_question, poll_options[], duration_days)
  createForumTopicWithPoll(categoryId, title, body, poll_question, poll_options, duration_days) {
    const categories = this._getFromStorage('forum_categories', []);
    const category = categories.find((c) => c.id === categoryId) || null;
    if (!category) return null;

    const topics = this._getFromStorage('forum_topics', []);
    const polls = this._getFromStorage('polls', []);
    const pollOptions = this._getFromStorage('poll_options', []);

    const now = this._nowISO();
    const nowDate = this._parseDate(now) || new Date();
    const closesAt = new Date(nowDate);
    closesAt.setDate(closesAt.getDate() + (duration_days || 0));

    const topic = {
      id: this._generateId('forumTopic'),
      category_id: categoryId,
      title,
      body,
      created_at: now,
      updated_at: now,
      reply_count: 0,
      view_count: 0,
      tags: [],
      has_poll: true,
      is_locked: false,
      is_pinned: false
    };

    topics.push(topic);
    this._saveToStorage('forum_topics', topics);

    // Create an initial post for the topic so discussion threads have a root post
    const forumPosts = this._getFromStorage('forum_posts', []);
    const initialPost = {
      id: this._generateId('forumPost'),
      topic_id: topic.id,
      parent_post_id: null,
      body,
      created_at: now,
      updated_at: now,
      like_count: 0,
      is_deleted: false
    };
    forumPosts.push(initialPost);
    this._saveToStorage('forum_posts', forumPosts);

    const poll = {
      id: this._generateId('poll'),
      topic_id: topic.id,
      question: poll_question,
      duration_days: duration_days,
      created_at: now,
      closes_at: closesAt.toISOString(),
      is_closed: false
    };

    polls.push(poll);
    this._saveToStorage('polls', polls);

    const createdOptions = [];
    (poll_options || []).forEach((label) => {
      const opt = {
        id: this._generateId('pollOption'),
        poll_id: poll.id,
        label,
        vote_count: 0
      };
      pollOptions.push(opt);
      createdOptions.push(opt);
    });

    this._saveToStorage('poll_options', pollOptions);

    const enrichedTopic = {
      ...topic,
      category
    };

    const enrichedPoll = {
      ...poll,
      topic: enrichedTopic
    };

    const enrichedOptions = createdOptions.map((opt) => ({
      ...opt,
      poll: enrichedPoll
    }));

    return {
      topic: enrichedTopic,
      poll: enrichedPoll,
      poll_options: enrichedOptions
    };
  }

  // -------------------- Classifieds & Lost & Found --------------------

  // getClassifiedCategories()
  getClassifiedCategories() {
    return this._getFromStorage('classified_categories', []);
  }

  // getClassifiedFilterOptions(categoryId?)
  getClassifiedFilterOptions(categoryId) {
    // categoryId is currently unused; options are generic
    const conditions = [
      { value: 'new', label: 'New' },
      { value: 'used', label: 'Used' },
      { value: 'refurbished', label: 'Refurbished' },
      { value: 'unspecified', label: 'Unspecified' }
    ];

    // Use common distance steps; these are configuration, not data rows
    const distance_options_miles = [1, 3, 5, 10, 25];

    const price_ranges = [
      { min: 0, max: 50, label: 'Under $50' },
      { min: 50, max: 100, label: '$50 - $100' },
      { min: 100, max: 200, label: '$100 - $200' },
      { min: 200, max: 500, label: '$200 - $500' }
    ];

    return { conditions, distance_options_miles, price_ranges };
  }

  // searchClassifiedListings(filters?, sort_key?, page?)
  searchClassifiedListings(filters = {}, sort_key = 'newest_first', page = 1) {
    const listingsRaw = this._getFromStorage('classified_listings', []);
    const categories = this._getFromStorage('classified_categories', []);

    let listings = listingsRaw.slice();

    if (filters.categoryId) {
      listings = listings.filter((l) => l.category_id === filters.categoryId);
    }

    if (filters.listing_type) {
      listings = listings.filter((l) => l.listing_type === filters.listing_type);
    }

    if (filters.query) {
      const lower = String(filters.query).toLowerCase();
      listings = listings.filter((l) => {
        const fields = [l.title, l.description].concat(this._ensureArray(l.tags).join(' '));
        return fields.some((f) => this._textMatches(f, lower));
      });
    }

    if (typeof filters.min_price === 'number') {
      listings = listings.filter((l) => typeof l.price === 'number' && l.price >= filters.min_price);
    }

    if (typeof filters.max_price === 'number') {
      listings = listings.filter((l) => typeof l.price === 'number' && l.price <= filters.max_price);
    }

    if (filters.condition) {
      listings = listings.filter((l) => l.condition === filters.condition);
    }

    if (filters.zip_code) {
      listings = listings.filter((l) => l.zip_code === filters.zip_code);
    }

    if (typeof filters.max_distance_miles === 'number') {
      const maxD = filters.max_distance_miles;
      listings = listings.filter((l) => {
        const d = this._computeDistanceFromZip(l, filters.zip_code || null);
        return typeof d === 'number' && d <= maxD;
      });
    }

    if (Array.isArray(filters.tags) && filters.tags.length > 0) {
      listings = listings.filter((l) => {
        const lt = this._ensureArray(l.tags);
        return filters.tags.some((tag) => lt.includes(tag));
      });
    }

    if (sort_key === 'price_low_to_high') {
      listings.sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const bp = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        return ap - bp;
      });
    } else if (sort_key === 'price_high_to_low') {
      listings.sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : 0;
        const bp = typeof b.price === 'number' ? b.price : 0;
        return bp - ap;
      });
    } else {
      // newest_first (default) by posted_at
      listings.sort((a, b) => {
        const ad = this._parseDate(a.posted_at) || new Date(0);
        const bd = this._parseDate(b.posted_at) || new Date(0);
        return bd - ad;
      });
    }

    const pageSize = 20;
    const total_results = listings.length;
    const start = (page - 1) * pageSize;
    const paged = listings.slice(start, start + pageSize);

    const enriched = paged.map((listing) => ({
      ...listing,
      category: categories.find((c) => c.id === listing.category_id) || null
    }));

    return {
      listings: enriched,
      total_results,
      page
    };
  }

  // getClassifiedListingDetail(listingId)
  getClassifiedListingDetail(listingId) {
    const listings = this._getFromStorage('classified_listings', []);
    const categories = this._getFromStorage('classified_categories', []);

    const listing = listings.find((l) => l.id === listingId) || null;
    if (!listing) return null;

    return {
      ...listing,
      category: categories.find((c) => c.id === listing.category_id) || null
    };
  }

  // createClassifiedListing(...)
  createClassifiedListing(
    categoryId,
    listing_type,
    title,
    description,
    price,
    currency,
    condition,
    location_text,
    zip_code,
    tags,
    date_lost,
    contact_method,
    contact_details,
    is_price_negotiable
  ) {
    const categories = this._getFromStorage('classified_categories', []);
    const category = categories.find((c) => c.id === categoryId) || null;
    if (!category) return null;

    const listings = this._getFromStorage('classified_listings', []);
    const now = this._nowISO();

    const listing = {
      id: this._generateId('classifiedListing'),
      category_id: categoryId,
      listing_type,
      title,
      description,
      price: typeof price === 'number' ? price : null,
      currency: currency || null,
      condition: condition || 'unspecified',
      location_text: location_text || null,
      zip_code: zip_code || null,
      latitude: null,
      longitude: null,
      distance_miles: null,
      status: 'active',
      posted_at: now,
      updated_at: null,
      tags: this._ensureArray(tags),
      date_lost: date_lost || null,
      contact_method,
      contact_details: contact_details || null,
      is_price_negotiable: !!is_price_negotiable
    };

    listings.push(listing);
    this._saveToStorage('classified_listings', listings);

    return {
      ...listing,
      category
    };
  }

  // contactListingSeller(listingId, message_body)
  contactListingSeller(listingId, message_body) {
    if (!message_body) return null;

    const threadWithListing = this._getOrCreateMessageThreadForListing(listingId, message_body);

    let messages = this._getFromStorage('messages', []);
    const now = this._nowISO();

    const message = {
      id: this._generateId('message'),
      thread_id: threadWithListing.id,
      body: message_body,
      sent_at: now,
      sender_type: 'me'
    };

    messages.push(message);
    this._saveToStorage('messages', messages);

    // Update thread timestamps & preview in storage
    let threads = this._getFromStorage('message_threads', []);
    const idx = threads.findIndex((t) => t.id === threadWithListing.id);
    if (idx !== -1) {
      threads[idx].updated_at = now;
      threads[idx].last_message_preview = message_body;
      this._saveToStorage('message_threads', threads);
    }

    const enrichedThread = threadWithListing; // already has listing
    const enrichedMessage = {
      ...message,
      thread: enrichedThread
    };

    return {
      thread: enrichedThread,
      message: enrichedMessage
    };
  }

  // -------------------- Businesses --------------------

  // getBusinessFilterOptions()
  getBusinessFilterOptions() {
    const businesses = this._getFromStorage('businesses', []);

    const categories = this._uniq(businesses.map((b) => b.category).filter(Boolean)).map((value) => ({
      value,
      label: value
    }));

    const cuisine_types = this._uniq(
      businesses.reduce((acc, b) => acc.concat(this._ensureArray(b.cuisine_types)), [])
    );

    const distances = this._uniq(
      businesses
        .map((b) => (typeof b.distance_miles === 'number' ? b.distance_miles : null))
        .filter((v) => typeof v === 'number')
        .map((v) => Math.round(v))
    ).sort((a, b) => a - b);

    const distance_options_miles = distances;

    const ratingFloors = this._uniq(
      businesses
        .map((b) => (typeof b.rating === 'number' ? Math.floor(b.rating) : null))
        .filter((v) => typeof v === 'number' && v >= 1)
    ).sort((a, b) => a - b);

    const rating_thresholds = ratingFloors;

    return { categories, cuisine_types, distance_options_miles, rating_thresholds };
  }

  // searchBusinesses(filters?, sort_key?, page?)
  searchBusinesses(filters = {}, sort_key = 'rating_high_to_low', page = 1) {
    const businessesRaw = this._getFromStorage('businesses', []);

    let businesses = businessesRaw.slice();

    if (filters.category_value) {
      businesses = businesses.filter((b) => b.category === filters.category_value);
    }

    if (Array.isArray(filters.cuisine_types) && filters.cuisine_types.length > 0) {
      businesses = businesses.filter((b) => {
        const cuisine = this._ensureArray(b.cuisine_types);
        return filters.cuisine_types.some((c) => cuisine.includes(c));
      });
    }

    if (filters.zip_code) {
      businesses = businesses.filter((b) => b.zip_code === filters.zip_code);
    }

    if (typeof filters.max_distance_miles === 'number') {
      const maxD = filters.max_distance_miles;
      businesses = businesses.filter((b) => {
        const d = this._computeDistanceFromZip(b, filters.zip_code || null);
        return typeof d === 'number' && d <= maxD;
      });
    }

    if (typeof filters.min_rating === 'number') {
      businesses = businesses.filter(
        (b) => typeof b.rating === 'number' && b.rating >= filters.min_rating
      );
    }

    if (filters.open_now) {
      businesses = businesses.filter((b) => b.is_open_now === true);
    }

    if (sort_key === 'distance_nearest_first') {
      businesses.sort((a, b) => {
        const ad = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
        const bd = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
        return ad - bd;
      });
    } else {
      // rating_high_to_low (default)
      businesses.sort((a, b) => {
        const ar = typeof a.rating === 'number' ? a.rating : 0;
        const br = typeof b.rating === 'number' ? b.rating : 0;
        if (br !== ar) return br - ar;
        const ad = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
        const bd = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
        return ad - bd;
      });
    }

    const pageSize = 20;
    const total_results = businesses.length;
    const start = (page - 1) * pageSize;
    const paged = businesses.slice(start, start + pageSize);

    return {
      businesses: paged,
      total_results,
      page
    };
  }

  // getBusinessDetail(businessId)
  getBusinessDetail(businessId) {
    const businesses = this._getFromStorage('businesses', []);
    const favorites = this._getFromStorage('business_favorites', []);

    const business = businesses.find((b) => b.id === businessId) || null;
    const is_favorite = !!favorites.find((f) => f.business_id === businessId);

    return { business, is_favorite };
  }

  // addBusinessToFavorites(businessId)
  addBusinessToFavorites(businessId) {
    const businesses = this._getFromStorage('businesses', []);
    const business = businesses.find((b) => b.id === businessId) || null;
    if (!business) return null;

    let favorites = this._getFromStorage('business_favorites', []);
    let favorite = favorites.find((f) => f.business_id === businessId) || null;

    if (!favorite) {
      favorite = {
        id: this._generateId('businessFavorite'),
        business_id: businessId,
        created_at: this._nowISO()
      };
      favorites.push(favorite);
      this._saveToStorage('business_favorites', favorites);
    }

    return {
      ...favorite,
      business
    };
  }

  // removeBusinessFromFavorites(businessId)
  removeBusinessFromFavorites(businessId) {
    const favorites = this._getFromStorage('business_favorites', []);
    const before = favorites.length;
    const filtered = favorites.filter((f) => f.business_id !== businessId);
    this._saveToStorage('business_favorites', filtered);
    return { success: filtered.length !== before };
  }

  // -------------------- Notification Settings --------------------

  // getNotificationSettings()
  getNotificationSettings() {
    return this._getOrCreateNotificationSettings();
  }

  // updateNotificationSettings(settings)
  updateNotificationSettings(settings) {
    const current = this._getOrCreateNotificationSettings();

    if (Object.prototype.hasOwnProperty.call(settings, 'emergency_alerts_enabled')) {
      current.emergency_alerts_enabled = !!settings.emergency_alerts_enabled;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'road_closures_enabled')) {
      current.road_closures_enabled = !!settings.road_closures_enabled;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'sports_updates_enabled')) {
      current.sports_updates_enabled = !!settings.sports_updates_enabled;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'forum_replies_frequency')) {
      current.forum_replies_frequency = settings.forum_replies_frequency;
    }

    current.updated_at = this._nowISO();

    localStorage.setItem('notification_settings', JSON.stringify(current));
    return current;
  }

  // -------------------- Messaging --------------------

  // getMessageThreads()
  getMessageThreads() {
    const threads = this._getFromStorage('message_threads', []);
    const listings = this._getFromStorage('classified_listings', []);

    return threads.map((t) => ({
      ...t,
      listing: listings.find((l) => l.id === t.listing_id) || null
    }));
  }

  // getMessageThreadDetail(threadId)
  getMessageThreadDetail(threadId) {
    const threads = this._getFromStorage('message_threads', []);
    const listings = this._getFromStorage('classified_listings', []);
    const messages = this._getFromStorage('messages', []);

    const threadRaw = threads.find((t) => t.id === threadId) || null;
    if (!threadRaw) {
      return { thread: null, messages: [] };
    }

    const thread = {
      ...threadRaw,
      listing: listings.find((l) => l.id === threadRaw.listing_id) || null
    };

    const threadMessages = messages
      .filter((m) => m.thread_id === threadId)
      .sort((a, b) => {
        const ad = this._parseDate(a.sent_at) || new Date(0);
        const bd = this._parseDate(b.sent_at) || new Date(0);
        return ad - bd;
      });

    const enrichedMessages = threadMessages.map((m) => ({
      ...m,
      thread
    }));

    return {
      thread,
      messages: enrichedMessages
    };
  }

  // sendMessage(threadId, body)
  sendMessage(threadId, body) {
    if (!body) return null;

    const threads = this._getFromStorage('message_threads', []);
    const listings = this._getFromStorage('classified_listings', []);
    const idx = threads.findIndex((t) => t.id === threadId);
    if (idx === -1) return null;

    const now = this._nowISO();
    threads[idx].updated_at = now;
    threads[idx].last_message_preview = body;
    this._saveToStorage('message_threads', threads);

    let messages = this._getFromStorage('messages', []);
    const message = {
      id: this._generateId('message'),
      thread_id: threadId,
      body,
      sent_at: now,
      sender_type: 'me'
    };
    messages.push(message);
    this._saveToStorage('messages', messages);

    const threadRaw = threads[idx];
    const thread = {
      ...threadRaw,
      listing: listings.find((l) => l.id === threadRaw.listing_id) || null
    };

    return {
      ...message,
      thread
    };
  }

  // -------------------- Informational Pages --------------------

  // getInformationalPage(page_key)
  getInformationalPage(page_key) {
    const pages = this._getFromStorage('informational_pages', {});
    const page = pages[page_key];
    if (!page) {
      return {
        title: '',
        body_html: ''
      };
    }
    return page;
  }
}

// Global export for browser and Node.js
if (typeof globalThis !== 'undefined') {
  // Attach class and a singleton instance for convenience
  globalThis.BusinessLogic = BusinessLogic;
  globalThis.WebsiteSDK = new BusinessLogic();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
