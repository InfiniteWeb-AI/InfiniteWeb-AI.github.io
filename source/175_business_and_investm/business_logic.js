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

  // ----------------------
  // Storage & ID helpers
  // ----------------------

  _initStorage() {
    const arrayKeys = [
      'articles',
      'article_comments',
      'reading_list_items',
      'subscription_plans',
      'subscription_orders',
      'stocks',
      'watchlist_items',
      'newsletters',
      'newsletter_subscriptions',
      'content_preferences',
      'recommended_articles',
      'magazine_issues',
      'library_items',
      'events',
      'event_registrations',
      'courses',
      'course_lessons',
      'course_enrollments',
      'contact_form_submissions'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Seed placeholder articles needed for cross-entity references in flows/tests
    try {
      const articlesRaw = localStorage.getItem('articles');
      const existingArticles = articlesRaw ? JSON.parse(articlesRaw) : [];
      const existingIds = new Set(existingArticles.map((a) => a.id));
      const placeholderArticles = [];

      if (!existingIds.has('ceo_interview_renewable_energy_leader')) {
        placeholderArticles.push({
          id: 'ceo_interview_renewable_energy_leader',
          title: 'CEO Interview: Leading the Future of Renewable Energy',
          slug: 'ceo-interview-renewable-energy-leader',
          category: 'leadership',
          content_type: 'interview',
          labels: ['Interview', 'Leadership'],
          tags: ['renewable energy', 'clean energy', 'leadership'],
          excerpt:
            'In-depth conversation with a renewable energy CEO on financing, policy risk, and long-term strategy.',
          body: '',
          published_at: '2026-03-01T09:00:00Z',
          popularity_score: 0,
          estimated_read_time_minutes: 15,
          share_url: 'articles/ceo-interview-renewable-energy-leader.html',
          issue_id: null,
          is_featured: false,
          thumbnail_image_url: '',
          author_name: 'Editorial Team',
          comment_count: 0
        });
      }

      if (!existingIds.has('personal_finance_playbook_2026')) {
        placeholderArticles.push({
          id: 'personal_finance_playbook_2026',
          title: 'Personal Finance Playbook 2026',
          slug: 'personal-finance-playbook-2026',
          category: 'personal_finance',
          content_type: 'feature',
          labels: ['Feature'],
          tags: ['personal finance'],
          excerpt: '',
          body: '',
          published_at: '2026-01-15T09:00:00Z',
          popularity_score: 0,
          estimated_read_time_minutes: 10,
          share_url: 'articles/personal-finance-playbook-2026.html',
          issue_id: null,
          is_featured: false,
          thumbnail_image_url: '',
          author_name: 'Editorial Team',
          comment_count: 0
        });
      }

      if (!existingIds.has('founder_playbook_early_stage')) {
        placeholderArticles.push({
          id: 'founder_playbook_early_stage',
          title: 'Founder Playbook: Early-Stage Startup Lessons',
          slug: 'founder-playbook-early-stage',
          category: 'startups',
          content_type: 'feature',
          labels: ['Feature'],
          tags: ['startups', 'founders'],
          excerpt: '',
          body: '',
          published_at: '2024-02-15T09:00:00Z',
          popularity_score: 0,
          estimated_read_time_minutes: 12,
          share_url: 'articles/founder-playbook-early-stage.html',
          issue_id: 'february_2024',
          is_featured: false,
          thumbnail_image_url: '',
          author_name: 'Editorial Team',
          comment_count: 0
        });
      }

      if (!existingIds.has('ai_in_finance_feature_march_2024')) {
        placeholderArticles.push({
          id: 'ai_in_finance_feature_march_2024',
          title: 'AI in Finance: How Algorithms Are Reshaping Investing',
          slug: 'ai-in-finance-feature-march-2024',
          category: 'markets',
          content_type: 'feature',
          labels: ['Feature'],
          tags: ['ai in finance', 'fintech', 'automation'],
          excerpt: '',
          body: '',
          published_at: '2024-03-15T09:00:00Z',
          popularity_score: 0,
          estimated_read_time_minutes: 14,
          share_url: 'articles/ai-in-finance-feature-march-2024.html',
          issue_id: 'march_2024',
          is_featured: false,
          thumbnail_image_url: '',
          author_name: 'Editorial Team',
          comment_count: 0
        });
      }

      if (placeholderArticles.length > 0) {
        localStorage.setItem('articles', JSON.stringify(existingArticles.concat(placeholderArticles)));
      }
    } catch (e) {}

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('current_subscription_order_id')) {
      localStorage.setItem('current_subscription_order_id', '');
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
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ----------------------
  // Formatting helpers
  // ----------------------

  _formatCategoryName(category) {
    if (!category) return '';
    return category
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _formatContentTypeLabel(contentType) {
    if (!contentType) return '';
    if (contentType === 'q_and_a') return 'Q&A';
    return contentType
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _formatAccessTypeLabel(accessType) {
    if (!accessType) return '';
    return accessType
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _formatBillingPeriodLabel(period) {
    if (period === 'monthly') return 'Monthly';
    if (period === 'annual') return 'Annual';
    return '';
  }

  _formatCurrencySymbol(currency) {
    switch (currency) {
      case 'usd':
        return '$';
      case 'eur':
        return '€';
      case 'gbp':
        return '£';
      case 'cad':
        return 'C$';
      case 'aud':
        return 'A$';
      default:
        return '';
    }
  }

  _formatPrice(amount, currency, billingPeriod) {
    if (amount == null) return '';
    const symbol = this._formatCurrencySymbol(currency);
    const periodLabel = billingPeriod === 'annual' ? 'year' : 'month';
    return symbol + amount.toFixed(2) + ' / ' + periodLabel;
  }

  _formatDateDisplay(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  _formatTimeDisplay(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  _formatDurationMinutes(totalMinutes) {
    if (totalMinutes == null) return '';
    const minutes = Number(totalMinutes);
    if (Number.isNaN(minutes)) return '';
    if (minutes < 60) return minutes + ' min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return h + ' hr';
    return h + ' hr ' + m + ' min';
  }

  _detectCardBrand(cardNumber) {
    if (!cardNumber) return 'other';
    const num = cardNumber.replace(/\D/g, '');
    if (/^4[0-9]{6,}$/.test(num)) return 'visa';
    if (/^5[1-5][0-9]{5,}$/.test(num)) return 'mastercard';
    if (/^3[47][0-9]{5,}$/.test(num)) return 'amex';
    if (/^6(?:011|5[0-9]{2})[0-9]{3,}$/.test(num)) return 'discover';
    return 'other';
  }

  _caseInsensitiveIncludes(haystack, needle) {
    if (!needle) return true;
    if (!haystack) return false;
    return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
  }

  _withinDateRange(publishedAt, dateFrom, dateTo) {
    const d = new Date(publishedAt);
    if (Number.isNaN(d.getTime())) return false;
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  }

  _getDateRangeFromQuickId(date_range) {
    if (!date_range || date_range === 'all_time') return { from: null, to: null };
    const now = new Date();
    let from = null;
    if (date_range === 'last_24_hours') {
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (date_range === 'last_7_days') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (date_range === 'last_30_days') {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return { from, to: null };
  }

  // ----------------------
  // Required private helpers from spec
  // ----------------------

  _getOrCreateReadingListState() {
    let items = this._getFromStorage('reading_list_items');
    if (!Array.isArray(items)) items = [];
    this._saveToStorage('reading_list_items', items);
    return items;
  }

  _getOrCreateWatchlistState() {
    let items = this._getFromStorage('watchlist_items');
    if (!Array.isArray(items)) items = [];
    this._saveToStorage('watchlist_items', items);
    return items;
  }

  _getCurrentSubscriptionOrder() {
    const currentId = localStorage.getItem('current_subscription_order_id') || '';
    const orders = this._getFromStorage('subscription_orders');
    if (currentId) {
      const found = orders.find((o) => o.id === currentId && o.status === 'pending');
      if (found) return found;
    }
    // fallback: any pending order
    return orders.find((o) => o.status === 'pending') || null;
  }

  _getOrCreateContentPreferences() {
    let prefsArr = this._getFromStorage('content_preferences');
    if (!Array.isArray(prefsArr)) prefsArr = [];
    if (prefsArr.length === 0) {
      const now = new Date().toISOString();
      const settings = {
        id: 'content_preferences_1',
        selected_topics: [],
        email_frequency: 'never',
        last_updated: now
      };
      prefsArr.push(settings);
      this._saveToStorage('content_preferences', prefsArr);
      return settings;
    }
    return prefsArr[0];
  }

  _getOrCreateLibraryState() {
    let items = this._getFromStorage('library_items');
    if (!Array.isArray(items)) items = [];
    this._saveToStorage('library_items', items);
    return items;
  }

  _getCurrentCourseEnrollment(courseId) {
    const enrollments = this._getFromStorage('course_enrollments');
    return enrollments.find((e) => e.course_id === courseId) || null;
  }

  _getCurrentRecommendationsGeneration() {
    let recs = this._getFromStorage('recommended_articles');
    if (!Array.isArray(recs)) recs = [];
    // sort by rank ascending, then generated_at desc as tie-breaker
    recs.sort((a, b) => {
      const rankA = a.rank != null ? a.rank : Number.MAX_SAFE_INTEGER;
      const rankB = b.rank != null ? b.rank : Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      const da = a.generated_at ? new Date(a.generated_at).getTime() : 0;
      const db = b.generated_at ? new Date(b.generated_at).getTime() : 0;
      return db - da;
    });
    return recs;
  }

  _getCurrentEventRegistration(eventId) {
    const regs = this._getFromStorage('event_registrations');
    return regs.find((r) => r.event_id === eventId && r.registration_status === 'registered') || null;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageContent()
  getHomePageContent() {
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_items');
    const readingIds = new Set(readingList.map((i) => i.article_id));

    const featured_articles = articles
      .filter((a) => a.is_featured)
      .sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      })
      .map((article) => ({
        article,
        category_name: this._formatCategoryName(article.category),
        content_type_label: this._formatContentTypeLabel(article.content_type),
        is_saved_to_reading_list: readingIds.has(article.id)
      }));

    const trending_articles = [...articles]
      .sort((a, b) => {
        const pa = a.popularity_score != null ? a.popularity_score : 0;
        const pb = b.popularity_score != null ? b.popularity_score : 0;
        return pb - pa;
      })
      .map((article) => ({
        article,
        category_name: this._formatCategoryName(article.category),
        content_type_label: this._formatContentTypeLabel(article.content_type),
        is_saved_to_reading_list: readingIds.has(article.id)
      }));

    const beginnerGuides = this.searchBeginnerInvestingGuidesLast30Days();

    return {
      featured_articles,
      trending_articles,
      top_beginner_guides_last_30_days: beginnerGuides
    };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const content_type_options = [
      { id: 'guide', label: 'Guides' },
      { id: 'interview', label: 'Interviews' },
      { id: 'feature', label: 'Features' },
      { id: 'news', label: 'News' },
      { id: 'analysis', label: 'Analysis' },
      { id: 'opinion', label: 'Opinion' },
      { id: 'q_and_a', label: 'Q&A' },
      { id: 'profile', label: 'Profiles' }
    ];

    const date_range_options = [
      { id: 'last_24_hours', label: 'Last 24 hours' },
      { id: 'last_7_days', label: 'Last 7 days' },
      { id: 'last_30_days', label: 'Last 30 days' },
      { id: 'all_time', label: 'All time' }
    ];

    const sort_options = [
      { id: 'most_recent', label: 'Most Recent' },
      { id: 'most_popular', label: 'Most Popular' },
      { id: 'most_commented', label: 'Most Commented' },
      { id: 'relevance', label: 'Relevance' }
    ];

    return { content_type_options, date_range_options, sort_options };
  }

  // searchArticles(query, content_types, category, date_range, date_from, date_to, sort_by, page, page_size)
  searchArticles(query, content_types, category, date_range, date_from, date_to, sort_by, page, page_size) {
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_items');
    const readingIds = new Set(readingList.map((i) => i.article_id));

    const q = (query || '').trim().toLowerCase();

    let from = null;
    let to = null;
    if (date_range) {
      const r = this._getDateRangeFromQuickId(date_range);
      from = r.from;
      to = r.to;
    }
    if (date_from) {
      const df = new Date(date_from);
      if (!Number.isNaN(df.getTime())) from = df;
    }
    if (date_to) {
      const dt = new Date(date_to);
      if (!Number.isNaN(dt.getTime())) to = dt;
    }

    let filtered = articles.filter((a) => {
      // query match
      if (q) {
        const inTitle = this._caseInsensitiveIncludes(a.title, q);
        const inExcerpt = this._caseInsensitiveIncludes(a.excerpt, q);
        const inBody = this._caseInsensitiveIncludes(a.body, q);
        const inTags = Array.isArray(a.tags)
          ? a.tags.some((t) => this._caseInsensitiveIncludes(t, q))
          : false;
        if (!inTitle && !inExcerpt && !inBody && !inTags) return false;
      }
      // content types filter
      if (Array.isArray(content_types) && content_types.length > 0) {
        if (!content_types.includes(a.content_type)) return false;
      }
      // category filter
      if (category && a.category !== category) return false;
      // date range filter
      if (from || to) {
        if (!this._withinDateRange(a.published_at, from, to)) return false;
      }
      return true;
    });

    const sort = sort_by || 'relevance';
    if (sort === 'most_recent') {
      filtered.sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      });
    } else if (sort === 'most_popular') {
      filtered.sort((a, b) => {
        const pa = a.popularity_score != null ? a.popularity_score : 0;
        const pb = b.popularity_score != null ? b.popularity_score : 0;
        return pb - pa;
      });
    } else if (sort === 'most_commented') {
      filtered.sort((a, b) => {
        const ca = a.comment_count != null ? a.comment_count : 0;
        const cb = b.comment_count != null ? b.comment_count : 0;
        return cb - ca;
      });
    } else if (sort === 'relevance') {
      // simple relevance: popular & recent
      filtered.sort((a, b) => {
        const pa = a.popularity_score != null ? a.popularity_score : 0;
        const pb = b.popularity_score != null ? b.popularity_score : 0;
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        // weight popularity more
        const scoreA = pa * 2 + da / 1e11;
        const scoreB = pb * 2 + db / 1e11;
        return scoreB - scoreA;
      });
    }

    const total_results = filtered.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const pageItems = filtered.slice(start, end).map((article) => ({
      article,
      category_name: this._formatCategoryName(article.category),
      content_type_label: this._formatContentTypeLabel(article.content_type),
      is_saved_to_reading_list: readingIds.has(article.id),
      estimated_read_time_minutes: article.estimated_read_time_minutes || null
    }));

    return {
      total_results,
      page: p,
      page_size: ps,
      items: pageItems
    };
  }

  // getArticlesByCategory(category, content_type, sort_by, page, page_size)
  getArticlesByCategory(category, content_type, sort_by, page, page_size) {
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_items');
    const readingIds = new Set(readingList.map((i) => i.article_id));

    let filtered = articles.filter((a) => a.category === category);
    if (content_type) {
      filtered = filtered.filter((a) => a.content_type === content_type);
    }

    const sort = sort_by || 'most_recent';
    if (sort === 'most_recent') {
      filtered.sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      });
    } else if (sort === 'most_popular') {
      filtered.sort((a, b) => {
        const pa = a.popularity_score != null ? a.popularity_score : 0;
        const pb = b.popularity_score != null ? b.popularity_score : 0;
        return pb - pa;
      });
    } else if (sort === 'most_commented') {
      filtered.sort((a, b) => {
        const ca = a.comment_count != null ? a.comment_count : 0;
        const cb = b.comment_count != null ? b.comment_count : 0;
        return cb - ca;
      });
    }

    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    const items = filtered.slice(start, end).map((article) => ({
      article,
      category_name: this._formatCategoryName(article.category),
      content_type_label: this._formatContentTypeLabel(article.content_type),
      is_saved_to_reading_list: readingIds.has(article.id)
    }));

    return {
      category_name: this._formatCategoryName(category),
      items
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;
    const readingList = this._getFromStorage('reading_list_items');
    const isSaved = article ? readingList.some((i) => i.article_id === article.id) : false;

    if (!article) {
      return {
        article: null,
        category_name: '',
        content_type_label: '',
        is_saved_to_reading_list: false,
        labels: [],
        comment_count: 0,
        estimated_read_time_minutes: null
      };
    }

    return {
      article,
      category_name: this._formatCategoryName(article.category),
      content_type_label: this._formatContentTypeLabel(article.content_type),
      is_saved_to_reading_list: isSaved,
      labels: Array.isArray(article.labels) ? article.labels : [],
      comment_count: article.comment_count != null ? article.comment_count : 0,
      estimated_read_time_minutes: article.estimated_read_time_minutes || null
    };
  }

  // getArticleComments(articleId)
  getArticleComments(articleId) {
    const comments = this._getFromStorage('article_comments');
    return comments
      .filter((c) => c.article_id === articleId)
      .sort((a, b) => {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return da - db;
      });
  }

  // postArticleComment(articleId, content)
  postArticleComment(articleId, content) {
    const articles = this._getFromStorage('articles');
    const comments = this._getFromStorage('article_comments');

    const now = new Date().toISOString();
    const comment = {
      id: this._generateId('comment'),
      article_id: articleId,
      author_display_name: null,
      content,
      created_at: now,
      is_pinned: false
    };
    comments.push(comment);
    this._saveToStorage('article_comments', comments);

    const article = articles.find((a) => a.id === articleId);
    let newCount = comments.filter((c) => c.article_id === articleId).length;
    if (article) {
      article.comment_count = newCount;
      this._saveToStorage('articles', articles);
    }

    return {
      success: true,
      comment,
      new_comment_count: newCount,
      message: 'Comment posted.'
    };
  }

  // saveArticleToReadingList(articleId, source)
  saveArticleToReadingList(articleId, source) {
    let items = this._getOrCreateReadingListState();
    const existing = items.find((i) => i.article_id === articleId);
    if (existing) {
      return {
        success: true,
        reading_list_item: existing,
        already_saved: true,
        message: 'Article already in reading list.'
      };
    }
    const item = {
      id: this._generateId('readinglist'),
      article_id: articleId,
      saved_at: new Date().toISOString(),
      source: source || 'manual_save'
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);
    return {
      success: true,
      reading_list_item: item,
      already_saved: false,
      message: 'Article saved to reading list.'
    };
  }

  // removeArticleFromReadingList(articleId)
  removeArticleFromReadingList(articleId) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter((i) => i.article_id !== articleId);
    const after = items.length;
    this._saveToStorage('reading_list_items', items);
    const was_saved = before !== after;
    return {
      success: true,
      was_saved,
      message: was_saved ? 'Removed from reading list.' : 'Article not in reading list.'
    };
  }

  // getReadingListItems(sort_by)
  getReadingListItems(sort_by) {
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const joined = items.map((reading_list_item) => {
      const article = articles.find((a) => a.id === reading_list_item.article_id) || null;
      return {
        reading_list_item,
        article,
        category_name: article ? this._formatCategoryName(article.category) : '',
        content_type_label: article ? this._formatContentTypeLabel(article.content_type) : ''
      };
    });

    const sort = sort_by || 'date_saved_desc';
    joined.sort((a, b) => {
      if (sort === 'date_saved_asc' || sort === 'date_saved_desc') {
        const da = new Date(a.reading_list_item.saved_at).getTime();
        const db = new Date(b.reading_list_item.saved_at).getTime();
        return sort === 'date_saved_asc' ? da - db : db - da;
      }
      if (sort === 'title_asc') {
        const ta = a.article ? a.article.title || '' : '';
        const tb = b.article ? b.article.title || '' : '';
        return ta.localeCompare(tb);
      }
      if (sort === 'category') {
        return a.category_name.localeCompare(b.category_name);
      }
      if (sort === 'popularity') {
        const pa = a.article && a.article.popularity_score != null ? a.article.popularity_score : 0;
        const pb = b.article && b.article.popularity_score != null ? b.article.popularity_score : 0;
        return pb - pa;
      }
      // default
      const da = new Date(a.reading_list_item.saved_at).getTime();
      const db = new Date(b.reading_list_item.saved_at).getTime();
      return db - da;
    });

    return { items: joined };
  }

  // getSubscriptionPlans(access_type, billing_period, max_price_per_period, currency, only_active, sort_by)
  getSubscriptionPlans(access_type, billing_period, max_price_per_period, currency, only_active, sort_by) {
    let plans = this._getFromStorage('subscription_plans');

    if (only_active !== false) {
      plans = plans.filter((p) => p.is_active);
    }
    if (access_type) {
      plans = plans.filter((p) => p.access_type === access_type);
    }
    if (billing_period) {
      plans = plans.filter((p) => p.billing_period === billing_period);
    }
    if (currency) {
      plans = plans.filter((p) => p.currency === currency);
    }
    if (max_price_per_period != null) {
      const max = Number(max_price_per_period);
      plans = plans.filter((p) => p.price_per_period <= max);
    }

    const sort = sort_by || 'price_low_to_high';
    plans.sort((a, b) => {
      if (sort === 'price_low_to_high') {
        return a.price_per_period - b.price_per_period;
      }
      if (sort === 'price_high_to_low') {
        return b.price_per_period - a.price_per_period;
      }
      if (sort === 'featured') {
        const fa = a.is_featured ? 1 : 0;
        const fb = b.is_featured ? 1 : 0;
        return fb - fa;
      }
      if (sort === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return a.price_per_period - b.price_per_period;
    });

    return plans.map((plan) => ({
      plan,
      access_type_label: this._formatAccessTypeLabel(plan.access_type),
      billing_period_label: this._formatBillingPeriodLabel(plan.billing_period),
      price_display: this._formatPrice(plan.price_per_period, plan.currency, plan.billing_period),
      is_recommended: !!plan.is_featured
    }));
  }

  // startSubscriptionCheckout(planId)
  startSubscriptionCheckout(planId) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        order: null,
        plan: null,
        price_display: '',
        message: 'Plan not found.'
      };
    }
    const order = {
      id: this._generateId('suborder'),
      plan_id: plan.id,
      price_charged: plan.price_per_period,
      currency: plan.currency,
      payment_method: 'credit_card',
      card_last4: null,
      card_brand: null,
      card_expiry_month: null,
      card_expiry_year: null,
      status: 'pending',
      checkout_step: 'plan_selected',
      created_at: new Date().toISOString(),
      confirmed_at: null,
      external_reference: null
    };

    const orders = this._getFromStorage('subscription_orders');
    orders.push(order);
    this._saveToStorage('subscription_orders', orders);
    localStorage.setItem('current_subscription_order_id', order.id);

    return {
      order,
      plan,
      price_display: this._formatPrice(plan.price_per_period, plan.currency, plan.billing_period),
      message: 'Checkout started.'
    };
  }

  // getCurrentSubscriptionCheckout()
  getCurrentSubscriptionCheckout() {
    const order = this._getCurrentSubscriptionOrder();
    if (!order) {
      return { order: null, plan: null, price_display: '' };
    }
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === order.plan_id) || null;
    const price_display = plan
      ? this._formatPrice(plan.price_per_period, plan.currency, plan.billing_period)
      : '';
    return { order, plan, price_display };
  }

  // completeSubscriptionCheckoutWithCard(card_number, expiry_month, expiry_year, cvv)
  completeSubscriptionCheckoutWithCard(card_number, expiry_month, expiry_year, cvv) {
    let orders = this._getFromStorage('subscription_orders');
    const order = this._getCurrentSubscriptionOrder();
    if (!order) {
      return {
        success: false,
        order: null,
        message: 'No pending subscription checkout.'
      };
    }

    // Simple validation: presence
    if (!card_number || !cvv || !expiry_month || !expiry_year) {
      return {
        success: false,
        order,
        message: 'Incomplete card details.'
      };
    }

    order.payment_method = 'credit_card';
    order.card_last4 = String(card_number).slice(-4);
    order.card_brand = this._detectCardBrand(card_number);
    order.card_expiry_month = Number(expiry_month);
    order.card_expiry_year = Number(expiry_year);
    order.status = 'confirmed';
    order.checkout_step = 'completed';
    order.confirmed_at = new Date().toISOString();

    orders = orders.map((o) => (o.id === order.id ? order : o));
    this._saveToStorage('subscription_orders', orders);
    localStorage.setItem('current_subscription_order_id', '');

    return {
      success: true,
      order,
      message: 'Subscription confirmed.'
    };
  }

  // getStockScreenerFilterOptions()
  getStockScreenerFilterOptions() {
    const sector_options = [
      { id: 'technology', label: 'Technology' },
      { id: 'healthcare', label: 'Healthcare' },
      { id: 'financials', label: 'Financials' },
      { id: 'consumer_discretionary', label: 'Consumer Discretionary' },
      { id: 'consumer_staples', label: 'Consumer Staples' },
      { id: 'industrials', label: 'Industrials' },
      { id: 'utilities', label: 'Utilities' },
      { id: 'energy', label: 'Energy' },
      { id: 'materials', label: 'Materials' },
      { id: 'real_estate', label: 'Real Estate' },
      { id: 'communication_services', label: 'Communication Services' }
    ];

    const region_options = [
      { id: 'united_states', label: 'United States' },
      { id: 'europe', label: 'Europe' },
      { id: 'asia_pacific', label: 'Asia Pacific' },
      { id: 'latin_america', label: 'Latin America' },
      { id: 'global', label: 'Global' }
    ];

    const market_cap_presets = [
      { id: 'over_10b', label: 'Over $10B', min_value: 10000000000 },
      { id: 'over_100b', label: 'Over $100B', min_value: 100000000000 }
    ];

    const dividend_yield_presets = [
      { id: 'over_2_percent', label: '2%+', min_value: 2 },
      { id: 'over_4_percent', label: '4%+', min_value: 4 }
    ];

    const sort_options = [
      { id: 'dividend_yield_desc', label: 'Dividend Yield - High to Low' },
      { id: 'dividend_yield_asc', label: 'Dividend Yield - Low to High' },
      { id: 'market_cap_desc', label: 'Market Cap - High to Low' },
      { id: 'alphabetical', label: 'Alphabetical' }
    ];

    return {
      sector_options,
      region_options,
      market_cap_presets,
      dividend_yield_presets,
      sort_options
    };
  }

  // searchStocks(sector, min_market_cap, min_dividend_yield, region, exchange, sort_by, page, page_size)
  searchStocks(sector, min_market_cap, min_dividend_yield, region, exchange, sort_by, page, page_size) {
    const stocks = this._getFromStorage('stocks');
    const watchlist = this._getFromStorage('watchlist_items');
    const watchIds = new Set(watchlist.map((w) => w.stock_id));

    let filtered = stocks.filter((s) => {
      if (sector && s.sector !== sector) return false;
      if (region && s.region !== region) return false;
      if (min_market_cap != null) {
        const mmc = Number(min_market_cap);
        if (s.market_cap == null || s.market_cap < mmc) return false;
      }
      if (min_dividend_yield != null) {
        const mdy = Number(min_dividend_yield);
        if (s.dividend_yield == null || s.dividend_yield < mdy) return false;
      }
      if (exchange) {
        if (!this._caseInsensitiveIncludes(s.exchange || '', exchange)) return false;
      }
      return true;
    });

    const sort = sort_by || 'dividend_yield_desc';
    filtered.sort((a, b) => {
      if (sort === 'dividend_yield_desc' || sort === 'dividend_yield_asc') {
        const da = a.dividend_yield != null ? a.dividend_yield : -Infinity;
        const db = b.dividend_yield != null ? b.dividend_yield : -Infinity;
        return sort === 'dividend_yield_desc' ? db - da : da - db;
      }
      if (sort === 'market_cap_desc') {
        return (b.market_cap || 0) - (a.market_cap || 0);
      }
      if (sort === 'alphabetical') {
        return (a.symbol || '').localeCompare(b.symbol || '');
      }
      return (b.dividend_yield || 0) - (a.dividend_yield || 0);
    });

    const total_results = filtered.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 50;
    const start = (p - 1) * ps;
    const end = start + ps;

    const items = filtered.slice(start, end).map((stock) => ({
      stock,
      is_in_watchlist: watchIds.has(stock.id)
    }));

    return { total_results, items };
  }

  // addStockToWatchlist(stockId, added_source)
  addStockToWatchlist(stockId, added_source) {
    let items = this._getOrCreateWatchlistState();
    const existing = items.find((i) => i.stock_id === stockId);
    if (existing) {
      return {
        success: true,
        watchlist_item: existing,
        already_added: true,
        message: 'Stock already in watchlist.'
      };
    }
    const item = {
      id: this._generateId('watch'),
      stock_id: stockId,
      added_at: new Date().toISOString(),
      added_source: added_source || 'stock_screener'
    };
    items.push(item);
    this._saveToStorage('watchlist_items', items);
    return {
      success: true,
      watchlist_item: item,
      already_added: false,
      message: 'Stock added to watchlist.'
    };
  }

  // removeStockFromWatchlist(stockId)
  removeStockFromWatchlist(stockId) {
    let items = this._getFromStorage('watchlist_items');
    const before = items.length;
    items = items.filter((i) => i.stock_id !== stockId);
    const after = items.length;
    this._saveToStorage('watchlist_items', items);
    const was_in_watchlist = before !== after;
    return {
      success: true,
      was_in_watchlist,
      message: was_in_watchlist ? 'Removed from watchlist.' : 'Stock not in watchlist.'
    };
  }

  // getWatchlistItems(sort_by)
  getWatchlistItems(sort_by) {
    const items = this._getFromStorage('watchlist_items');
    const stocks = this._getFromStorage('stocks');

    let joined = items.map((watchlist_item) => {
      const stock = stocks.find((s) => s.id === watchlist_item.stock_id) || null;
      return { watchlist_item, stock };
    });

    const sort = sort_by || 'name_asc';
    joined.sort((a, b) => {
      if (sort === 'name_asc') {
        const na = a.stock ? a.stock.name || '' : '';
        const nb = b.stock ? b.stock.name || '' : '';
        return na.localeCompare(nb);
      }
      if (sort === 'market_cap_desc') {
        const ma = a.stock ? a.stock.market_cap || 0 : 0;
        const mb = b.stock ? b.stock.market_cap || 0 : 0;
        return mb - ma;
      }
      if (sort === 'price_change_desc') {
        const pa = a.stock ? a.stock.price_change || 0 : 0;
        const pb = b.stock ? b.stock.price_change || 0 : 0;
        return pb - pa;
      }
      if (sort === 'dividend_yield_desc') {
        const da = a.stock && a.stock.dividend_yield != null ? a.stock.dividend_yield : 0;
        const db = b.stock && b.stock.dividend_yield != null ? b.stock.dividend_yield : 0;
        return db - da;
      }
      return 0;
    });

    return joined;
  }

  // getNewsletters()
  getNewsletters() {
    const newsletters = this._getFromStorage('newsletters');
    const subs = this._getFromStorage('newsletter_subscriptions');

    return newsletters.map((newsletter) => {
      const sub = subs.find((s) => s.newsletter_id === newsletter.id && s.status !== 'unsubscribed');
      const current_status = sub ? sub.status : 'unsubscribed';
      return {
        newsletter,
        is_subscribed: current_status === 'active',
        current_status
      };
    });
  }

  // getNewsletterDetail(newsletterId)
  getNewsletterDetail(newsletterId) {
    const newsletters = this._getFromStorage('newsletters');
    const subs = this._getFromStorage('newsletter_subscriptions');
    const newsletter = newsletters.find((n) => n.id === newsletterId) || null;

    const regionAll = [
      { id: 'global', label: 'Global' },
      { id: 'us_markets', label: 'US Markets' },
      { id: 'europe_markets', label: 'Europe Markets' },
      { id: 'asia_markets', label: 'Asia Markets' }
    ];

    const deliveryAll = [
      { id: 'morning_before_8am', label: 'Morning (before 8 AM)' },
      { id: 'midday', label: 'Midday' },
      { id: 'afternoon', label: 'Afternoon' },
      { id: 'evening', label: 'Evening' }
    ];

    const frequencyAll = [
      { id: 'every_weekday', label: 'Every weekday (Mon–Fri)' },
      { id: 'daily', label: 'Daily' },
      { id: 'weekly', label: 'Weekly' },
      { id: 'monthly', label: 'Monthly' }
    ];

    let region_options = regionAll;
    let delivery_time_options = deliveryAll;
    let frequency_options = frequencyAll;

    if (newsletter) {
      if (Array.isArray(newsletter.supported_regions) && newsletter.supported_regions.length > 0) {
        region_options = regionAll.filter((r) => newsletter.supported_regions.includes(r.id));
      }
      if (Array.isArray(newsletter.supported_delivery_times) && newsletter.supported_delivery_times.length > 0) {
        delivery_time_options = deliveryAll.filter((d) => newsletter.supported_delivery_times.includes(d.id));
      }
      if (Array.isArray(newsletter.supported_frequencies) && newsletter.supported_frequencies.length > 0) {
        frequency_options = frequencyAll.filter((f) => newsletter.supported_frequencies.includes(f.id));
      }
    }

    const current_subscription = subs.find((s) => s.newsletter_id === newsletterId) || null;

    return {
      newsletter,
      region_options,
      delivery_time_options,
      frequency_options,
      current_subscription
    };
  }

  // subscribeOrUpdateNewsletter(newsletterId, email, region, delivery_time, frequency, status)
  subscribeOrUpdateNewsletter(newsletterId, email, region, delivery_time, frequency, status) {
    let subs = this._getFromStorage('newsletter_subscriptions');
    let subscription = subs.find((s) => s.newsletter_id === newsletterId && s.email === email) || null;

    const now = new Date().toISOString();
    const newStatus = status || 'active';

    if (!subscription) {
      subscription = {
        id: this._generateId('nlsub'),
        newsletter_id: newsletterId,
        email,
        region: region || null,
        delivery_time: delivery_time || null,
        frequency: frequency || null,
        status: newStatus,
        created_at: now,
        updated_at: now
      };
      subs.push(subscription);
    } else {
      if (region !== undefined) subscription.region = region;
      if (delivery_time !== undefined) subscription.delivery_time = delivery_time;
      if (frequency !== undefined) subscription.frequency = frequency;
      if (status !== undefined) subscription.status = status;
      subscription.updated_at = now;
      subs = subs.map((s) => (s.id === subscription.id ? subscription : s));
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription,
      message: 'Newsletter settings saved.'
    };
  }

  // getContentPreferenceOptions()
  getContentPreferenceOptions() {
    const topic_options = [
      {
        id: 'startups',
        label: 'Startups',
        description: 'Early-stage companies, founders, and startup ecosystems.'
      },
      {
        id: 'venture_capital',
        label: 'Venture Capital',
        description: 'VC funds, deals, and portfolio strategies.'
      },
      {
        id: 'personal_finance',
        label: 'Personal Finance',
        description: 'Budgeting, saving, and individual investing.'
      },
      {
        id: 'markets',
        label: 'Markets',
        description: 'Public markets, macro trends, and indices.'
      },
      {
        id: 'retirement',
        label: 'Retirement',
        description: 'Retirement planning, income strategies, and tax considerations.'
      }
    ];

    const email_frequency_options = [
      { id: 'daily_digest', label: 'Daily digest' },
      { id: 'weekly_digest', label: 'Weekly digest' },
      { id: 'monthly_digest', label: 'Monthly digest' },
      { id: 'never', label: 'Never' }
    ];

    return { topic_options, email_frequency_options };
  }

  // getContentPreferences()
  getContentPreferences() {
    const settings = this._getOrCreateContentPreferences();
    const options = this.getContentPreferenceOptions();

    const selected_topic_labels = (settings.selected_topics || []).map((id) => {
      const o = options.topic_options.find((t) => t.id === id);
      return o ? o.label : id;
    });

    const freqOption = options.email_frequency_options.find((f) => f.id === settings.email_frequency);
    const email_frequency_label = freqOption ? freqOption.label : '';

    return { settings, selected_topic_labels, email_frequency_label };
  }

  // updateContentPreferences(selected_topics, email_frequency)
  updateContentPreferences(selected_topics, email_frequency) {
    let prefsArr = this._getFromStorage('content_preferences');
    if (!Array.isArray(prefsArr) || prefsArr.length === 0) {
      prefsArr = [this._getOrCreateContentPreferences()];
    }
    let settings = prefsArr[0];

    if (Array.isArray(selected_topics)) {
      settings.selected_topics = selected_topics;
    }
    if (email_frequency) {
      settings.email_frequency = email_frequency;
    }
    settings.last_updated = new Date().toISOString();

    prefsArr[0] = settings;
    this._saveToStorage('content_preferences', prefsArr);

    return { success: true, settings, message: 'Content preferences updated.' };
  }

  // getRecommendedArticles(limit)
  getRecommendedArticles(limit) {
    const recLimit = limit && limit > 0 ? limit : 20;
    const recs = this._getCurrentRecommendationsGeneration();
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_items');
    const readingIds = new Set(readingList.map((i) => i.article_id));

    return recs
      .slice(0, recLimit)
      .map((recommendation) => {
        const article = articles.find((a) => a.id === recommendation.article_id) || null;
        return {
          recommendation,
          article,
          category_name: article ? this._formatCategoryName(article.category) : '',
          content_type_label: article ? this._formatContentTypeLabel(article.content_type) : '',
          is_saved_to_reading_list: article ? readingIds.has(article.id) : false
        };
      })
      .filter((item) => item.article);
  }

  // markRecommendationClicked(recommendationId)
  markRecommendationClicked(recommendationId) {
    let recs = this._getFromStorage('recommended_articles');
    const rec = recs.find((r) => r.id === recommendationId) || null;
    if (!rec) {
      return { success: false, recommendation: null };
    }
    rec.is_clicked = true;
    rec.clicked_at = new Date().toISOString();
    recs = recs.map((r) => (r.id === rec.id ? rec : r));
    this._saveToStorage('recommended_articles', recs);
    return { success: true, recommendation: rec };
  }

  // getMagazineOverview()
  getMagazineOverview() {
    const issues = this._getFromStorage('magazine_issues');
    const articles = this._getFromStorage('articles');

    let current_issue = issues.find((i) => i.is_current);
    if (!current_issue && issues.length > 0) {
      current_issue = [...issues].sort((a, b) => {
        const ya = a.year || 0;
        const yb = b.year || 0;
        if (ya !== yb) return yb - ya;
        const ma = a.month || 0;
        const mb = b.month || 0;
        return mb - ma;
      })[0];
    }

    let current_issue_highlights = [];
    let featured_themes = [];

    if (current_issue && Array.isArray(current_issue.table_of_contents)) {
      const ids = current_issue.table_of_contents;
      const issueArticles = articles.filter((a) => ids.includes(a.id));
      current_issue_highlights = issueArticles.slice(0, 5);

      const tagSet = new Set();
      issueArticles.forEach((a) => {
        if (Array.isArray(a.tags)) {
          a.tags.forEach((t) => tagSet.add(t));
        }
      });
      featured_themes = Array.from(tagSet).slice(0, 10);
    }

    return { current_issue, current_issue_highlights, featured_themes };
  }

  // getMagazineIssueArchive(year)
  getMagazineIssueArchive(year) {
    const issues = this._getFromStorage('magazine_issues');
    const libraryItems = this._getFromStorage('library_items');
    const savedIds = new Set(libraryItems.map((l) => l.issue_id));

    let filtered = issues;
    if (year != null) {
      filtered = issues.filter((i) => i.year === Number(year));
    }

    filtered.sort((a, b) => {
      const ya = a.year || 0;
      const yb = b.year || 0;
      if (ya !== yb) return yb - ya;
      const ma = a.month || 0;
      const mb = b.month || 0;
      return mb - ma;
    });

    return filtered.map((issue) => ({
      issue,
      year: issue.year,
      month: issue.month,
      is_saved_in_library: savedIds.has(issue.id)
    }));
  }

  // getMagazineIssueDetail(issueId)
  getMagazineIssueDetail(issueId) {
    const issues = this._getFromStorage('magazine_issues');
    const issue = issues.find((i) => i.id === issueId) || null;
    const libraryItems = this._getFromStorage('library_items');
    const is_saved_in_library = libraryItems.some((l) => l.issue_id === issueId);

    const articles = this._getFromStorage('articles');
    let issueArticles = [];
    if (issue) {
      if (Array.isArray(issue.table_of_contents) && issue.table_of_contents.length > 0) {
        issueArticles = articles.filter((a) => issue.table_of_contents.includes(a.id));
        // Fallback: if table_of_contents IDs don't resolve to articles, use issue_id linkage
        if (issueArticles.length === 0) {
          issueArticles = articles.filter((a) => a.issue_id === issueId);
        }
      } else {
        issueArticles = articles.filter((a) => a.issue_id === issueId);
      }
    }

    return { issue, is_saved_in_library, articles: issueArticles };
  }

  // saveIssueToLibrary(issueId)
  saveIssueToLibrary(issueId) {
    let items = this._getOrCreateLibraryState();
    const existing = items.find((i) => i.issue_id === issueId);
    if (existing) {
      return {
        success: true,
        library_item: existing,
        already_saved: true,
        message: 'Issue already in library.'
      };
    }
    const item = {
      id: this._generateId('lib'),
      issue_id: issueId,
      saved_at: new Date().toISOString()
    };
    items.push(item);
    this._saveToStorage('library_items', items);
    return {
      success: true,
      library_item: item,
      already_saved: false,
      message: 'Issue saved to library.'
    };
  }

  // removeIssueFromLibrary(issueId)
  removeIssueFromLibrary(issueId) {
    let items = this._getFromStorage('library_items');
    const before = items.length;
    items = items.filter((i) => i.issue_id !== issueId);
    const after = items.length;
    this._saveToStorage('library_items', items);
    const was_saved = before !== after;
    return {
      success: true,
      was_saved,
      message: was_saved ? 'Issue removed from library.' : 'Issue not in library.'
    };
  }

  // getLibraryItems(sort_by)
  getLibraryItems(sort_by) {
    const items = this._getFromStorage('library_items');
    const issues = this._getFromStorage('magazine_issues');

    let joined = items.map((library_item) => {
      const issue = issues.find((i) => i.id === library_item.issue_id) || null;
      return { library_item, issue };
    });

    const sort = sort_by || 'date_saved_desc';
    joined.sort((a, b) => {
      if (sort === 'date_saved_desc' || sort === 'date_saved_asc') {
        const da = new Date(a.library_item.saved_at).getTime();
        const db = new Date(b.library_item.saved_at).getTime();
        return sort === 'date_saved_asc' ? da - db : db - da;
      }
      if (sort === 'year_desc') {
        const ya = a.issue ? a.issue.year || 0 : 0;
        const yb = b.issue ? b.issue.year || 0 : 0;
        if (ya !== yb) return yb - ya;
        const ma = a.issue ? a.issue.month || 0 : 0;
        const mb = b.issue ? b.issue.month || 0 : 0;
        return mb - ma;
      }
      if (sort === 'title_asc') {
        const ta = a.issue ? a.issue.title || '' : '';
        const tb = b.issue ? b.issue.title || '' : '';
        return ta.localeCompare(tb);
      }
      const da = new Date(a.library_item.saved_at).getTime();
      const db = new Date(b.library_item.saved_at).getTime();
      return db - da;
    });

    return joined;
  }

  // getEvents(format, search_query, date_from, date_to, sort_by)
  getEvents(format, search_query, date_from, date_to, sort_by) {
    const events = this._getFromStorage('events');
    const q = (search_query || '').trim().toLowerCase();

    let from = null;
    let to = null;
    if (date_from) {
      const df = new Date(date_from);
      if (!Number.isNaN(df.getTime())) from = df;
    }
    if (date_to) {
      const dt = new Date(date_to);
      if (!Number.isNaN(dt.getTime())) to = dt;
    }

    let filtered = events.filter((e) => {
      if (format && e.format !== format) return false;
      if (q) {
        const inTitle = this._caseInsensitiveIncludes(e.title, q);
        const inDesc = this._caseInsensitiveIncludes(e.description, q);
        if (!inTitle && !inDesc) return false;
      }
      if (from || to) {
        if (!this._withinDateRange(e.start_datetime, from, to)) return false;
      }
      return true;
    });

    const sort = sort_by || 'date_soonest_first';
    filtered.sort((a, b) => {
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      if (sort === 'date_latest_first') return db - da;
      return da - db;
    });

    return filtered.map((event) => ({
      event,
      start_date_display: this._formatDateDisplay(event.start_datetime),
      start_time_display: this._formatTimeDisplay(event.start_datetime),
      format_label:
        event.format === 'webinar'
          ? 'Webinar'
          : event.format === 'in_person'
          ? 'In-person'
          : event.format === 'hybrid'
          ? 'Hybrid'
          : ''
    }));
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    if (!event) {
      return {
        event: null,
        start_date_display: '',
        start_time_display: '',
        duration_display: '',
        format_label: ''
      };
    }

    let duration_display = '';
    if (event.start_datetime && event.end_datetime) {
      const start = new Date(event.start_datetime).getTime();
      const end = new Date(event.end_datetime).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
        const diffMin = Math.round((end - start) / (60 * 1000));
        duration_display = this._formatDurationMinutes(diffMin);
      }
    }

    const format_label =
      event.format === 'webinar'
        ? 'Webinar'
        : event.format === 'in_person'
        ? 'In-person'
        : event.format === 'hybrid'
        ? 'Hybrid'
        : '';

    return {
      event,
      start_date_display: this._formatDateDisplay(event.start_datetime),
      start_time_display: this._formatTimeDisplay(event.start_datetime),
      duration_display,
      format_label
    };
  }

  // registerForEvent(eventId, full_name, timezone, reminder_option)
  registerForEvent(eventId, full_name, timezone, reminder_option) {
    let regs = this._getFromStorage('event_registrations');
    let registration = this._getCurrentEventRegistration(eventId);
    const now = new Date().toISOString();
    const rem = reminder_option || 'email_1_day_before';

    if (!registration) {
      registration = {
        id: this._generateId('eventreg'),
        event_id: eventId,
        full_name,
        timezone,
        reminder_option: rem,
        registration_status: 'registered',
        registered_at: now
      };
      regs.push(registration);
    } else {
      registration.full_name = full_name;
      registration.timezone = timezone;
      registration.reminder_option = rem;
      registration.registration_status = 'registered';
      regs = regs.map((r) => (r.id === registration.id ? registration : r));
    }

    this._saveToStorage('event_registrations', regs);

    return {
      success: true,
      registration,
      message: 'Event registration completed.'
    };
  }

  // getCourses(topic, difficulty, max_duration_minutes, sort_by, page, page_size)
  getCourses(topic, difficulty, max_duration_minutes, sort_by, page, page_size) {
    const courses = this._getFromStorage('courses');
    const enrollments = this._getFromStorage('course_enrollments');

    let filtered = courses.filter((c) => c.is_active);
    if (topic) {
      filtered = filtered.filter((c) => c.topic === topic);
    }
    if (difficulty) {
      filtered = filtered.filter((c) => c.difficulty === difficulty);
    }
    if (max_duration_minutes != null) {
      const max = Number(max_duration_minutes);
      filtered = filtered.filter((c) => c.duration_minutes <= max);
    }

    const sort = sort_by || 'rating_desc';
    filtered.sort((a, b) => {
      if (sort === 'rating_desc' || sort === 'rating_asc') {
        const ra = a.rating != null ? a.rating : 0;
        const rb = b.rating != null ? b.rating : 0;
        return sort === 'rating_desc' ? rb - ra : ra - rb;
      }
      if (sort === 'duration_asc') {
        return (a.duration_minutes || 0) - (b.duration_minutes || 0);
      }
      if (sort === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return (b.rating || 0) - (a.rating || 0);
    });

    const total_results = filtered.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    const items = filtered.slice(start, end).map((course) => {
      const enrollment = enrollments.find((e) => e.course_id === course.id && e.enrollment_status !== 'dropped');
      return {
        course,
        duration_display: this._formatDurationMinutes(course.duration_minutes),
        rating_display:
          course.rating != null
            ? course.rating.toFixed(1) + (course.rating_count != null ? ' (' + course.rating_count + ')' : '')
            : '',
        is_enrolled: !!enrollment
      };
    });

    return { total_results, items };
  }

  // getCourseDetail(courseId)
  getCourseDetail(courseId) {
    const courses = this._getFromStorage('courses');
    const lessons = this._getFromStorage('course_lessons');
    const enrollments = this._getFromStorage('course_enrollments');

    const course = courses.find((c) => c.id === courseId) || null;
    const courseLessons = lessons
      .filter((l) => l.course_id === courseId)
      .sort((a, b) => (a.lesson_number || 0) - (b.lesson_number || 0));

    const enrollment = enrollments.find((e) => e.course_id === courseId) || null;
    const is_enrolled = !!enrollment;

    return {
      course,
      duration_display: course ? this._formatDurationMinutes(course.duration_minutes) : '',
      rating_display:
        course && course.rating != null
          ? course.rating.toFixed(1) + (course.rating_count != null ? ' (' + course.rating_count + ')' : '')
          : '',
      lessons: courseLessons,
      is_enrolled,
      enrollment
    };
  }

  // enrollInCourse(courseId, study_reminder_frequency)
  enrollInCourse(courseId, study_reminder_frequency) {
    let enrollments = this._getFromStorage('course_enrollments');
    let enrollment = enrollments.find((e) => e.course_id === courseId) || null;
    const freq = study_reminder_frequency || 'two_times_per_week';
    const now = new Date().toISOString();

    if (!enrollment) {
      enrollment = {
        id: this._generateId('enroll'),
        course_id: courseId,
        enrollment_status: 'enrolled',
        study_reminder_frequency: freq,
        enrolled_at: now,
        last_accessed_at: null
      };
      enrollments.push(enrollment);
    } else {
      enrollment.enrollment_status = 'enrolled';
      enrollment.study_reminder_frequency = freq;
      enrollments = enrollments.map((e) => (e.id === enrollment.id ? enrollment : e));
    }

    this._saveToStorage('course_enrollments', enrollments);

    return {
      success: true,
      enrollment,
      message: 'Enrolled in course.'
    };
  }

  // updateCourseStudyReminder(courseId, study_reminder_frequency)
  updateCourseStudyReminder(courseId, study_reminder_frequency) {
    let enrollments = this._getFromStorage('course_enrollments');
    let enrollment = enrollments.find((e) => e.course_id === courseId) || null;
    const freq = study_reminder_frequency;

    const now = new Date().toISOString();

    if (!enrollment) {
      enrollment = {
        id: this._generateId('enroll'),
        course_id: courseId,
        enrollment_status: 'enrolled',
        study_reminder_frequency: freq,
        enrolled_at: now,
        last_accessed_at: null
      };
      enrollments.push(enrollment);
    } else {
      enrollment.study_reminder_frequency = freq;
      enrollments = enrollments.map((e) => (e.id === enrollment.id ? enrollment : e));
    }

    this._saveToStorage('course_enrollments', enrollments);

    return {
      success: true,
      enrollment,
      message: 'Study reminder updated.'
    };
  }

  // startCourse(courseId)
  startCourse(courseId) {
    const courses = this._getFromStorage('courses');
    const lessons = this._getFromStorage('course_lessons');
    let enrollments = this._getFromStorage('course_enrollments');

    const course = courses.find((c) => c.id === courseId) || null;
    const courseLessons = lessons
      .filter((l) => l.course_id === courseId)
      .sort((a, b) => (a.lesson_number || 0) - (b.lesson_number || 0));

    const now = new Date().toISOString();
    let enrollment = enrollments.find((e) => e.course_id === courseId) || null;

    if (!enrollment) {
      enrollment = {
        id: this._generateId('enroll'),
        course_id: courseId,
        enrollment_status: 'in_progress',
        study_reminder_frequency: 'two_times_per_week',
        enrolled_at: now,
        last_accessed_at: now
      };
      enrollments.push(enrollment);
    } else {
      enrollment.enrollment_status = 'in_progress';
      enrollment.last_accessed_at = now;
      enrollments = enrollments.map((e) => (e.id === enrollment.id ? enrollment : e));
    }

    this._saveToStorage('course_enrollments', enrollments);

    const initial_lesson = courseLessons.length > 0 ? courseLessons[0] : null;

    return {
      course,
      enrollment,
      lessons: courseLessons,
      initial_lesson
    };
  }

  // startCourseLesson(courseId, lesson_number)
  startCourseLesson(courseId, lesson_number) {
    const courses = this._getFromStorage('courses');
    const lessons = this._getFromStorage('course_lessons');
    let enrollments = this._getFromStorage('course_enrollments');

    const course = courses.find((c) => c.id === courseId) || null;
    const lesson = lessons.find((l) => l.course_id === courseId && l.lesson_number === lesson_number) || null;

    const now = new Date().toISOString();
    let enrollment = enrollments.find((e) => e.course_id === courseId) || null;

    if (!enrollment) {
      enrollment = {
        id: this._generateId('enroll'),
        course_id: courseId,
        enrollment_status: 'in_progress',
        study_reminder_frequency: 'two_times_per_week',
        enrolled_at: now,
        last_accessed_at: now
      };
      enrollments.push(enrollment);
    } else {
      enrollment.enrollment_status = 'in_progress';
      enrollment.last_accessed_at = now;
      enrollments = enrollments.map((e) => (e.id === enrollment.id ? enrollment : e));
    }

    this._saveToStorage('course_enrollments', enrollments);

    // Instrumentation for task completion tracking
    try {
      if (course && lesson) {
        const task9Value = {
          course_id: courseId,
          lesson_number: lesson_number,
          started_at: new Date().toISOString()
        };
        localStorage.setItem('task9_lastStartedLesson', JSON.stringify(task9Value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { course, lesson, enrollment };
  }

  // searchBeginnerInvestingGuidesLast30Days()
  searchBeginnerInvestingGuidesLast30Days() {
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_items');
    const readingIds = new Set(readingList.map((i) => i.article_id));

    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filtered = articles
      .filter((a) => {
        if (a.content_type !== 'guide') return false;
        if (!this._withinDateRange(a.published_at, from, null)) return false;
        const title = (a.title || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        const combined = title + ' ' + tags;
        return combined.includes('beginner') && combined.includes('invest');
      })
      .sort((a, b) => {
        const pa = a.popularity_score != null ? a.popularity_score : 0;
        const pb = b.popularity_score != null ? b.popularity_score : 0;
        return pb - pa;
      });

    return filtered.map((article, idx) => ({
      article,
      category_name: this._formatCategoryName(article.category),
      content_type_label: this._formatContentTypeLabel(article.content_type),
      popularity_rank: idx + 1,
      is_saved_to_reading_list: readingIds.has(article.id)
    }));
  }

  // getLeadershipInterviewsByKeyword(keyword, sort_by)
  getLeadershipInterviewsByKeyword(keyword, sort_by) {
    const articles = this._getFromStorage('articles');
    const q = (keyword || '').trim().toLowerCase();

    let filtered = articles.filter((a) => {
      const isLeadership = this._caseInsensitiveIncludes(a.category || '', 'leadership');
      const isInterview =
        a.content_type === 'interview' ||
        this._caseInsensitiveIncludes(a.content_type || '', 'interview') ||
        (Array.isArray(a.labels) && a.labels.some((l) => this._caseInsensitiveIncludes(l, 'interview')));
      return isLeadership && isInterview;
    });

    if (q) {
      filtered = filtered.filter((a) => {
        const inTitle = this._caseInsensitiveIncludes(a.title, q);
        const inExcerpt = this._caseInsensitiveIncludes(a.excerpt, q);
        const inBody = this._caseInsensitiveIncludes(a.body, q);
        const inTags = Array.isArray(a.tags)
          ? a.tags.some((t) => this._caseInsensitiveIncludes(t, q))
          : false;
        return inTitle || inExcerpt || inBody || inTags;
      });
    }

    const sort = sort_by || 'most_recent';
    if (sort === 'most_commented') {
      filtered.sort((a, b) => {
        const ca = a.comment_count != null ? a.comment_count : 0;
        const cb = b.comment_count != null ? b.comment_count : 0;
        return cb - ca;
      });
    } else {
      filtered.sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      });
    }

    return filtered.map((article) => ({
      article,
      category_name: this._formatCategoryName(article.category),
      content_type_label: this._formatContentTypeLabel(article.content_type),
      comment_count: article.comment_count != null ? article.comment_count : 0,
      labels: Array.isArray(article.labels) ? article.labels : []
    }));
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (e) {}
    }
    // Fallback empty structure (no mocked narrative content)
    return {
      title: '',
      mission_html: '',
      audience_html: '',
      editorial_focus_html: ''
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    const raw = localStorage.getItem('contact_page_content');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (e) {}
    }

    const topic_options = [
      { id: 'general', label: 'General inquiry' },
      { id: 'subscriptions', label: 'Subscriptions & billing' },
      { id: 'technical_support', label: 'Technical support' }
    ];

    return {
      support_email: '',
      press_email: '',
      mailing_address: '',
      topic_options
    };
  }

  // submitContactForm(name, email, subject, message, topic)
  submitContactForm(name, email, subject, message, topic) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const ticket_id = this._generateId('ticket');
    const record = {
      id: ticket_id,
      name,
      email,
      subject,
      message,
      topic: topic || 'general',
      submitted_at: new Date().toISOString()
    };
    submissions.push(record);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      ticket_id,
      message: 'Your message has been received.'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (e) {}
    }
    return {
      last_updated: '',
      sections: []
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