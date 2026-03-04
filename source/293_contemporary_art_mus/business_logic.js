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
    const defaults = {
      articles: [
        {
          id: 'art_2025_03_new_wing_ticket_prices',
          title: 'Who Can Afford to Enter the New Wing?',
          subtitle: 'An opinion on architecture, access, and ticket prices',
          slug: 'who-can-afford-to-enter-the-new-wing',
          url: 'article.html?id=art_2025_03_new_wing_ticket_prices',
          article_section: 'opinion',
          content_type: 'opinion_article',
          article_status: 'published',
          publish_date: '2025-03-15T10:00:00Z',
          updated_date: '2025-03-16T09:00:00Z',
          excerpt: 'The new wing is dazzling, but ticket prices risk turning its public spaces into luxury lobbies.',
          body: 'This opinion essay examines how new wing ticket prices intersect with architecture, donors, and long-term public trust. When new wing ticket prices climb faster than wages, the institution quietly redraws the map of who feels welcome inside.',
          tag_ids: ['performance'],
          related_exhibition_id: 'exh_2026_02_new_wing_panorama',
          rating: 0,
          ticket_price: null,
          ticket_price_currency: null,
          allows_comments: true,
          is_archived: false,
          hero_image_url: null,
          created_at: '2025-03-10T09:00:00Z',
          comment_count: 2
        },
        {
          id: 'art_2023_01_performance_archive_1',
          title: 'Opening Gestures: Performance Season Launches 2023',
          subtitle: 'Intimate scores for a small black box',
          slug: 'opening-gestures-performance-season-launches-2023',
          url: 'article.html?id=art_2023_01_performance_archive_1',
          article_section: 'performance',
          content_type: 'feature',
          article_status: 'published',
          publish_date: '2023-01-05T12:00:00Z',
          updated_date: '2023-01-06T09:00:00Z',
          excerpt: 'Three new performance residencies open the year with slow, durational works.',
          body: 'The museum\'s performance program begins 2023 with a trio of residencies that stretch attention and time. Each artist uses the galleries as a stage, inviting visitors to drift in and out of the work.',
          tag_ids: ['performance'],
          related_exhibition_id: null,
          rating: 0,
          ticket_price: null,
          ticket_price_currency: null,
          allows_comments: false,
          is_archived: true,
          hero_image_url: null,
          created_at: '2023-01-02T09:00:00Z',
          comment_count: 0
        },
        {
          id: 'art_2023_01_performance_archive_2',
          title: 'Bodies in Code: Performance Experiments in January',
          subtitle: 'Choreographing live motion with sensors and projection',
          slug: 'bodies-in-code-performance-experiments-january',
          url: 'article.html?id=art_2023_01_performance_archive_2',
          article_section: 'performance',
          content_type: 'feature',
          article_status: 'published',
          publish_date: '2023-01-12T18:00:00Z',
          updated_date: '2023-01-13T09:00:00Z',
          excerpt: 'A midwinter program pairs dancers with live-coding musicians.',
          body: 'In this performance series, dancers wear motion sensors that drive real-time projections. The result is a feedback loop between choreography and code that makes each night distinct.',
          tag_ids: ['performance'],
          related_exhibition_id: null,
          rating: 0,
          ticket_price: null,
          ticket_price_currency: null,
          allows_comments: false,
          is_archived: true,
          hero_image_url: null,
          created_at: '2023-01-08T09:00:00Z',
          comment_count: 0
        },
        {
          id: 'art_2023_01_performance_archive_3',
          title: 'Walking Scores: Performance in the City Streets',
          subtitle: 'Participants turn sidewalks into a distributed stage',
          slug: 'walking-scores-performance-city-streets',
          url: 'article.html?id=art_2023_01_performance_archive_3',
          article_section: 'performance',
          content_type: 'feature',
          article_status: 'published',
          publish_date: '2023-01-25T15:30:00Z',
          updated_date: '2023-01-26T09:00:00Z',
          excerpt: 'An artist invites visitors to follow simple scores that reframe everyday commutes as performance.',
          body: 'For this project, the artist distributes pocket-sized scores that ask participants to count windows, follow shadows, or walk only where they see reflections. The city becomes an expanded stage for quiet, distributed performance.',
          tag_ids: ['performance'],
          related_exhibition_id: null,
          rating: 0,
          ticket_price: null,
          ticket_price_currency: null,
          allows_comments: false,
          is_archived: true,
          hero_image_url: null,
          created_at: '2023-01-20T09:00:00Z',
          comment_count: 0
        },
        {
          id: 'art_2025_04_fragments_city_review',
          title: 'Review: Fragments of the City',
          subtitle: 'A quietly radical survey of everyday urban scenes',
          slug: 'review-fragments-of-the-city',
          url: 'article.html?id=art_2025_04_fragments_city_review',
          article_section: 'reviews',
          content_type: 'review',
          article_status: 'published',
          publish_date: '2025-04-20T12:00:00Z',
          updated_date: '2025-04-21T09:00:00Z',
          excerpt: 'A budget-friendly exhibition that rewards slow looking and repeat visits.',
          body: 'This review considers how the exhibition foregrounds small urban details while remaining accessible to visitors on limited budgets. With modest ticket prices and generous late hours, it is an ideal option for budget visits.',
          tag_ids: ['photography'],
          related_exhibition_id: null,
          rating: 4.5,
          ticket_price: 12,
          ticket_price_currency: 'USD',
          allows_comments: true,
          is_archived: false,
          hero_image_url: null,
          created_at: '2025-04-15T10:00:00Z',
          comment_count: 1
        },
        {
          id: 'art_2024_11_night_spectacle_review',
          title: 'Review: Night Spectacles on a Shoestring',
          subtitle: 'Big atmospheres with small ticket prices',
          slug: 'review-night-spectacles-shoestring',
          url: 'article.html?id=art_2024_11_night_spectacle_review',
          article_section: 'reviews',
          content_type: 'review',
          article_status: 'published',
          publish_date: '2024-11-05T19:00:00Z',
          updated_date: '2024-11-06T09:00:00Z',
          excerpt: 'An after-hours program that proves great art experiences do not need luxury budgets.',
          body: 'The exhibition assembles light-based installations and performances with a surprisingly low ticket price, making it a standout choice for budget-conscious visitors.',
          tag_ids: ['digital_art', 'performance'],
          related_exhibition_id: 'exh_2026_02_new_wing_panorama',
          rating: 4.2,
          ticket_price: 10,
          ticket_price_currency: 'USD',
          allows_comments: true,
          is_archived: false,
          hero_image_url: null,
          created_at: '2024-10-20T10:00:00Z',
          comment_count: 0
        },
        {
          id: 'art_2024_02_curator_interview_light',
          title: 'Interview: Curator on Architectures of Light',
          subtitle: 'How the new wing reframes daylight as a material',
          slug: 'interview-curator-architectures-of-light',
          url: 'article.html?id=art_2024_02_curator_interview_light',
          article_section: 'features',
          content_type: 'interview',
          article_status: 'published',
          publish_date: '2024-02-10T10:00:00Z',
          updated_date: '2024-02-10T10:00:00Z',
          excerpt: 'A wide-ranging interview about the new wing and its relationship to light.',
          body: 'In this interview, the curator explains how the new wing was conceived, how interviews with visitors shaped the galleries, and why daylight was treated as a central material.',
          tag_ids: ['digital_art'],
          related_exhibition_id: 'exh_2026_02_new_wing_panorama',
          rating: 0,
          ticket_price: null,
          ticket_price_currency: null,
          allows_comments: true,
          is_archived: false,
          hero_image_url: null,
          created_at: '2024-02-05T09:00:00Z',
          comment_count: 0
        },
        {
          id: 'art_2024_05_artist_interview_archives',
          title: 'Interview: Artist on Digital Performance Archives',
          subtitle: 'Saving liveness for future audiences',
          slug: 'interview-artist-digital-performance-archives',
          url: 'article.html?id=art_2024_05_artist_interview_archives',
          article_section: 'features',
          content_type: 'interview',
          article_status: 'published',
          publish_date: '2024-05-18T14:00:00Z',
          updated_date: '2024-05-18T14:00:00Z',
          excerpt: 'An interview about recording performance works without flattening them.',
          body: 'Through this interview, the artist reflects on how interviews, rehearsal videos, and notation all contribute to a living archive of performance.',
          tag_ids: ['performance'],
          related_exhibition_id: null,
          rating: 0,
          ticket_price: null,
          ticket_price_currency: null,
          allows_comments: true,
          is_archived: false,
          hero_image_url: null,
          created_at: '2024-05-10T09:00:00Z',
          comment_count: 0
        },
        {
          id: 'art_2024_08_team_interview_newwing',
          title: 'Interview: Design Team Behind the New Wing',
          subtitle: 'Collaborative interviews on circulation and public space',
          slug: 'interview-design-team-new-wing',
          url: 'article.html?id=art_2024_08_team_interview_newwing',
          article_section: 'features',
          content_type: 'interview',
          article_status: 'published',
          publish_date: '2024-08-02T09:30:00Z',
          updated_date: '2024-08-02T09:30:00Z',
          excerpt: 'The architects and curators share an interview about designing for large crowds and quiet corners.',
          body: 'In this extended interview, members of the design team discuss how interviews with staff and visitors influenced circulation patterns in the new wing.',
          tag_ids: ['digital_art'],
          related_exhibition_id: 'exh_2026_02_new_wing_panorama',
          rating: 0,
          ticket_price: null,
          ticket_price_currency: null,
          allows_comments: true,
          is_archived: false,
          hero_image_url: null,
          created_at: '2024-07-20T09:00:00Z',
          comment_count: 0
        },
        {
          id: 'art_2024_12_interview_community_access',
          title: 'Interview: Community Organizer on Museum Access',
          subtitle: 'Ticket policies, outreach, and interviews with neighbors',
          slug: 'interview-community-organizer-museum-access',
          url: 'article.html?id=art_2024_12_interview_community_access',
          article_section: 'opinion',
          content_type: 'interview',
          article_status: 'published',
          publish_date: '2024-12-12T16:00:00Z',
          updated_date: '2024-12-12T16:00:00Z',
          excerpt: 'An interview about how pricing strategies shape who feels invited into the museum.',
          body: 'This interview with a community organizer touches on free days, transit access, and how interviews with local residents informed new ticketing pilots.',
          tag_ids: ['performance'],
          related_exhibition_id: null,
          rating: 0,
          ticket_price: null,
          ticket_price_currency: null,
          allows_comments: true,
          is_archived: false,
          hero_image_url: null,
          created_at: '2024-12-01T09:00:00Z',
          comment_count: 0
        }
      ],
      exhibitions: [],
      events: [],
      tags: [],
      topic_subscriptions: [],
      article_lists: [],
      article_list_items: [],
      saved_exhibitions: [],
      scheduled_events: [],
      comments: [],
      static_pages: [],
      contact_messages: [],
      // single object (or null)
      account_settings: null
    };

    Object.keys(defaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaults[key]));
      }
    });

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      // corrupted data, reset to default
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentStr = localStorage.getItem('idCounter');
    const current = currentStr ? parseInt(currentStr, 10) : 1000;
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateEntityId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _persistSingleUserState() {
    // Single-user state is already persisted via _saveToStorage.
    // This is a placeholder to satisfy the required helper signature.
  }

  // Resolve Tag by slug
  _resolveTagBySlug(slug) {
    const tags = this._getFromStorage('tags', []);
    return tags.find((t) => t.slug === slug) || null;
  }

  // Generic timeframe filter helper (based on publish_date)
  _applyTimeframeFilter(articles, timeframe) {
    if (!timeframe || timeframe === 'all_time') return articles;

    const now = new Date();
    let days = null;
    switch (timeframe) {
      case 'last_30_days':
        days = 30;
        break;
      case 'last_3_months':
        days = 90;
        break;
      case 'last_6_months':
        days = 182;
        break;
      case 'last_12_months':
        days = 365;
        break;
      default:
        return articles;
    }
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return articles.filter((a) => {
      const d = this._parseDate(a.publish_date);
      return d && d >= cutoff;
    });
  }

  // Common article filter/sort logic
  _filterAndSortArticles(articles, options) {
    const opts = options || {};
    let res = articles.slice();

    if (opts.article_section) {
      res = res.filter((a) => a.article_section === opts.article_section);
    }
    if (opts.content_type) {
      res = res.filter((a) => a.content_type === opts.content_type);
    }
    if (typeof opts.year === 'number') {
      res = res.filter((a) => {
        const d = this._parseDate(a.publish_date);
        return d && d.getFullYear() === opts.year;
      });
    }
    if (typeof opts.rating_min === 'number') {
      res = res.filter((a) => typeof a.rating === 'number' && a.rating >= opts.rating_min);
    }
    if (typeof opts.ticket_price_max === 'number') {
      res = res.filter((a) => typeof a.ticket_price === 'number' && a.ticket_price <= opts.ticket_price_max);
    }

    if (opts.timeframe) {
      res = this._applyTimeframeFilter(res, opts.timeframe);
    }

    const sort = opts.sort || 'newest_first';

    const byPublishDesc = (a, b) => {
      const da = this._parseDate(a.publish_date) || new Date(0);
      const db = this._parseDate(b.publish_date) || new Date(0);
      return db - da;
    };
    const byPublishAsc = (a, b) => {
      const da = this._parseDate(a.publish_date) || new Date(0);
      const db = this._parseDate(b.publish_date) || new Date(0);
      return da - db;
    };

    if (sort === 'newest_first') {
      res.sort(byPublishDesc);
    } else if (sort === 'oldest_first') {
      res.sort(byPublishAsc);
    } else if (sort === 'highest_rated') {
      res.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        return byPublishDesc(a, b);
      });
    } else if (sort === 'lowest_price') {
      res.sort((a, b) => {
        const pa = typeof a.ticket_price === 'number' ? a.ticket_price : Number.POSITIVE_INFINITY;
        const pb = typeof b.ticket_price === 'number' ? b.ticket_price : Number.POSITIVE_INFINITY;
        if (pa !== pb) return pa - pb;
        return byPublishDesc(a, b);
      });
    }

    return res;
  }

  // Resolve foreign keys on simple objects where needed
  _resolveForeignKeys(entity) {
    if (!entity || typeof entity !== 'object') return entity;

    const articles = this._getFromStorage('articles', []);
    const exhibitions = this._getFromStorage('exhibitions', []);
    const events = this._getFromStorage('events', []);
    const tags = this._getFromStorage('tags', []);
    const articleLists = this._getFromStorage('article_lists', []);

    const clone = Object.assign({}, entity);

    if (Object.prototype.hasOwnProperty.call(clone, 'article_id')) {
      clone.article = articles.find((a) => a.id === clone.article_id) || null;
    }
    if (Object.prototype.hasOwnProperty.call(clone, 'related_exhibition_id')) {
      clone.related_exhibition = exhibitions.find((e) => e.id === clone.related_exhibition_id) || null;
    }
    if (Object.prototype.hasOwnProperty.call(clone, 'exhibition_id')) {
      clone.exhibition = exhibitions.find((e) => e.id === clone.exhibition_id) || null;
    }
    if (Object.prototype.hasOwnProperty.call(clone, 'event_id')) {
      clone.event = events.find((ev) => ev.id === clone.event_id) || null;
    }
    if (Object.prototype.hasOwnProperty.call(clone, 'tag_id')) {
      clone.tag = tags.find((t) => t.id === clone.tag_id) || null;
    }
    if (Object.prototype.hasOwnProperty.call(clone, 'article_list_id')) {
      clone.article_list = articleLists.find((l) => l.id === clone.article_list_id) || null;
    }

    return clone;
  }

  // Helper to paginate arrays
  _paginate(items, page, page_size) {
    const p = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;
    const total = items.length;
    const total_pages = Math.max(1, Math.ceil(total / size));
    const start = (p - 1) * size;
    const end = start + size;
    return {
      items: items.slice(start, end),
      total_results: total,
      page: p,
      page_size: size,
      total_pages: total_pages
    };
  }

  // Helper to find or create a named ArticleList
  _getOrCreateArticleListByName(listName, listType, createIfNotExists) {
    const create = typeof createIfNotExists === 'boolean' ? createIfNotExists : true;
    let lists = this._getFromStorage('article_lists', []);
    let list = lists.find((l) => l.name === listName && l.list_type === listType);

    if (!list && create) {
      list = {
        id: this._generateEntityId('articlelist'),
        name: listName,
        description: null,
        list_type: listType,
        created_at: this._nowISO(),
        updated_at: null
      };
      lists.push(list);
      this._saveToStorage('article_lists', lists);
      this._persistSingleUserState();
    }

    return list || null;
  }

  // -------------------- Core interface implementations --------------------

  // getHomepageContent(maxNewsArticles, maxFeaturedArticles, maxExhibitions, maxEvents)
  getHomepageContent(maxNewsArticles, maxFeaturedArticles, maxExhibitions, maxEvents) {
    const articles = this._getFromStorage('articles', []);
    const exhibitions = this._getFromStorage('exhibitions', []);
    const events = this._getFromStorage('events', []);

    const maxNews = typeof maxNewsArticles === 'number' ? maxNewsArticles : 5;
    const maxFeat = typeof maxFeaturedArticles === 'number' ? maxFeaturedArticles : 4;
    const maxExh = typeof maxExhibitions === 'number' ? maxExhibitions : 4;
    const maxEvt = typeof maxEvents === 'number' ? maxEvents : 4;

    const publishedNews = articles
      .filter((a) => a.article_section === 'news' && a.article_status === 'published')
      .sort((a, b) => {
        const da = this._parseDate(a.publish_date) || new Date(0);
        const db = this._parseDate(b.publish_date) || new Date(0);
        return db - da;
      });

    const latest_news = publishedNews.slice(0, maxNews).map((a) => ({
      id: a.id,
      title: a.title,
      subtitle: a.subtitle || null,
      excerpt: a.excerpt || null,
      url: a.url,
      publish_date: a.publish_date,
      hero_image_url: a.hero_image_url || null
    }));

    const latestNewsIds = new Set(latest_news.map((n) => n.id));

    const publishedArticles = articles
      .filter((a) => a.article_status === 'published' && !latestNewsIds.has(a.id))
      .sort((a, b) => {
        const da = this._parseDate(a.publish_date) || new Date(0);
        const db = this._parseDate(b.publish_date) || new Date(0);
        return db - da;
      });

    const featured_articles = publishedArticles.slice(0, maxFeat).map((a) => ({
      id: a.id,
      title: a.title,
      article_section: a.article_section,
      content_type: a.content_type,
      url: a.url,
      hero_image_url: a.hero_image_url || null
    }));

    const highlighted_exhibitions = exhibitions
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.opening_date) || new Date(0);
        const db = this._parseDate(b.opening_date) || new Date(0);
        return da - db;
      })
      .slice(0, maxExh);

    const now = new Date();
    const upcoming_events = events
      .filter((ev) => {
        const d = this._parseDate(ev.start_datetime);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      })
      .slice(0, maxEvt);

    return {
      latest_news,
      featured_articles,
      highlighted_exhibitions,
      upcoming_events
    };
  }

  // getHomepageTopics()
  getHomepageTopics() {
    const tags = this._getFromStorage('tags', []);
    // Optionally sort alphabetically
    return tags.slice().sort((a, b) => a.name.localeCompare(b.name));
  }

  // getSearchFilterOptions()
  getSearchFilterOptions() {
    const articles = this._getFromStorage('articles', []);

    const articleSectionsSet = new Set();
    const contentTypesSet = new Set();
    const yearsSet = new Set();

    articles.forEach((a) => {
      if (a.article_section) articleSectionsSet.add(a.article_section);
      if (a.content_type) contentTypesSet.add(a.content_type);
      const d = this._parseDate(a.publish_date);
      if (d) yearsSet.add(d.getFullYear());
    });

    const toLabel = (val) => val.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const article_sections = Array.from(articleSectionsSet).sort().map((val) => ({
      value: val,
      label: toLabel(val)
    }));

    const content_types = Array.from(contentTypesSet).sort().map((val) => ({
      value: val,
      label: toLabel(val)
    }));

    const years = Array.from(yearsSet).sort((a, b) => b - a);

    const rating_buckets = [
      { min_rating: 1, label: '1 star & up' },
      { min_rating: 2, label: '2 stars & up' },
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 5, label: '5 stars' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' },
      { value: 'highest_rated', label: 'Highest rated' },
      { value: 'lowest_price', label: 'Lowest ticket price' }
    ];

    return {
      article_sections,
      content_types,
      years,
      rating_buckets,
      sort_options
    };
  }

  // searchArticles(query, filters, sort, page, page_size)
  searchArticles(query, filters, sort, page, page_size) {
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = articles.filter((a) => a.article_status === 'published');

    if (q) {
      results = results.filter((a) => {
        const haystack = [a.title, a.subtitle, a.excerpt, a.body]
          .filter(Boolean)
          .join(' ') 
          .toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    results = this._filterAndSortArticles(results, {
      article_section: f.article_section,
      content_type: f.content_type,
      year: typeof f.year === 'number' ? f.year : undefined,
      rating_min: typeof f.rating_min === 'number' ? f.rating_min : undefined,
      ticket_price_max: typeof f.ticket_price_max === 'number' ? f.ticket_price_max : undefined,
      sort: sort || 'relevance'
    });

    if (!sort || sort === 'relevance') {
      // Simple relevance: already filtered; order by newest
      results.sort((a, b) => {
        const da = this._parseDate(a.publish_date) || new Date(0);
        const db = this._parseDate(b.publish_date) || new Date(0);
        return db - da;
      });
    }

    const pagination = this._paginate(results, page, page_size || 10);

    const mappedResults = pagination.items.map((a) => {
      const tag_names = Array.isArray(a.tag_ids)
        ? a.tag_ids
            .map((id) => {
              const t = tags.find((tg) => tg.id === id);
              return t ? t.name : null;
            })
            .filter(Boolean)
        : [];
      return {
        id: a.id,
        title: a.title,
        subtitle: a.subtitle || null,
        excerpt: a.excerpt || null,
        url: a.url,
        article_section: a.article_section,
        content_type: a.content_type,
        publish_date: a.publish_date,
        rating: typeof a.rating === 'number' ? a.rating : null,
        ticket_price: typeof a.ticket_price === 'number' ? a.ticket_price : null,
        ticket_price_currency: a.ticket_price_currency || null,
        tag_names,
        hero_image_url: a.hero_image_url || null
      };
    });

    return {
      results: mappedResults,
      total_results: pagination.total_results,
      page: pagination.page,
      page_size: pagination.page_size,
      total_pages: pagination.total_pages,
      applied_filters: {
        article_section: f.article_section || null,
        content_type: f.content_type || null,
        year: typeof f.year === 'number' ? f.year : null,
        rating_min: typeof f.rating_min === 'number' ? f.rating_min : null,
        ticket_price_max: typeof f.ticket_price_max === 'number' ? f.ticket_price_max : null
      }
    };
  }

  // getExhibitionFilterOptions()
  getExhibitionFilterOptions() {
    const status_options = [
      { value: 'upcoming', label: 'Upcoming' },
      { value: 'current', label: 'Current' },
      { value: 'past', label: 'Past' }
    ];

    const sort_options = [
      { value: 'opening_soon', label: 'Opening soon' },
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' }
    ];

    return { status_options, sort_options };
  }

  // getExhibitions(status, start_date, end_date, sort, page, page_size)
  getExhibitions(status, start_date, end_date, sort, page, page_size) {
    const exhibitions = this._getFromStorage('exhibitions', []);

    let res = exhibitions.slice();

    if (status) {
      res = res.filter((e) => e.status === status);
    }

    const start = start_date ? this._parseDate(start_date) : null;
    const end = end_date ? this._parseDate(end_date) : null;

    if (start) {
      res = res.filter((e) => {
        const d = this._parseDate(e.opening_date);
        return d && d >= start;
      });
    }
    if (end) {
      res = res.filter((e) => {
        const d = this._parseDate(e.opening_date);
        return d && d <= end;
      });
    }

    const sortVal = sort || 'opening_soon';

    res.sort((a, b) => {
      const da = this._parseDate(a.opening_date) || new Date(0);
      const db = this._parseDate(b.opening_date) || new Date(0);
      if (sortVal === 'opening_soon') return da - db;
      if (sortVal === 'newest_first') return db - da;
      if (sortVal === 'oldest_first') return da - db;
      return da - db;
    });

    const pagination = this._paginate(res, page, page_size || 12);

    return {
      exhibitions: pagination.items,
      total_results: pagination.total_results,
      page: pagination.page,
      page_size: pagination.page_size,
      total_pages: pagination.total_pages
    };
  }

  // getExhibitionDetail(exhibitionId)
  getExhibitionDetail(exhibitionId) {
    const exhibitions = this._getFromStorage('exhibitions', []);
    const articles = this._getFromStorage('articles', []);
    const savedExhibitions = this._getFromStorage('saved_exhibitions', []);

    const exhibition = exhibitions.find((e) => e.id === exhibitionId) || null;

    const related_articles = articles.filter(
      (a) => a.related_exhibition_id === exhibitionId && a.article_status === 'published'
    );

    const is_bookmarked = savedExhibitions.some((s) => s.exhibition_id === exhibitionId);

    return {
      exhibition,
      related_articles,
      is_bookmarked
    };
  }

  // saveExhibition(exhibitionId)
  saveExhibition(exhibitionId) {
    const exhibitions = this._getFromStorage('exhibitions', []);
    const savedExhibitions = this._getFromStorage('saved_exhibitions', []);

    const exhibition = exhibitions.find((e) => e.id === exhibitionId);
    if (!exhibition) {
      return { success: false, saved_exhibition: null, message: 'Exhibition not found' };
    }

    let existing = savedExhibitions.find((s) => s.exhibition_id === exhibitionId);
    if (existing) {
      return { success: true, saved_exhibition: existing, message: 'Already bookmarked' };
    }

    const saved_exhibition = {
      id: this._generateEntityId('savedexh'),
      exhibition_id: exhibitionId,
      saved_at: this._nowISO()
    };

    savedExhibitions.push(saved_exhibition);
    this._saveToStorage('saved_exhibitions', savedExhibitions);
    this._persistSingleUserState();

    return { success: true, saved_exhibition, message: 'Exhibition bookmarked' };
  }

  // unsaveExhibition(savedExhibitionId)
  unsaveExhibition(savedExhibitionId) {
    let savedExhibitions = this._getFromStorage('saved_exhibitions', []);
    const before = savedExhibitions.length;
    savedExhibitions = savedExhibitions.filter((s) => s.id !== savedExhibitionId);
    const after = savedExhibitions.length;
    const success = after < before;

    this._saveToStorage('saved_exhibitions', savedExhibitions);
    this._persistSingleUserState();

    return {
      success,
      message: success ? 'Exhibition removed from bookmarks' : 'Saved exhibition not found'
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    let min_price = null;
    let max_price = null;
    let supports_free_only = false;

    events.forEach((ev) => {
      if (typeof ev.price === 'number') {
        if (min_price === null || ev.price < min_price) min_price = ev.price;
        if (max_price === null || ev.price > max_price) max_price = ev.price;
        if (ev.price === 0) supports_free_only = true;
      }
      if (ev.is_free) supports_free_only = true;
    });

    return {
      price_filters: {
        supports_free_only,
        min_price: min_price === null ? 0 : min_price,
        max_price: max_price === null ? 0 : max_price
      }
    };
  }

  // getEventsCalendarMonth(year, month, filters)
  getEventsCalendarMonth(year, month, filters) {
    const events = this._getFromStorage('events', []);
    const f = filters || {};

    const y = year;
    const m = month; // 1-12

    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    let res = events.filter((ev) => {
      const d = this._parseDate(ev.start_datetime);
      return d && d >= start && d <= end;
    });

    if (f.free_only) {
      res = res.filter((ev) => ev.is_free || ev.price === 0);
    } else {
      if (typeof f.price_min === 'number') {
        res = res.filter((ev) => typeof ev.price === 'number' && ev.price >= f.price_min);
      }
      if (typeof f.price_max === 'number') {
        res = res.filter((ev) => typeof ev.price === 'number' && ev.price <= f.price_max);
      }
    }

    const map = new Map(); // date string -> events

    res.forEach((ev) => {
      const d = this._parseDate(ev.start_datetime);
      if (!d) return;
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    });

    const events_by_date = Array.from(map.keys())
      .sort()
      .map((date) => ({ date, events: map.get(date) }));

    return { events_by_date };
  }

  // getEventsList(start_date, end_date, filters, sort, page, page_size)
  getEventsList(start_date, end_date, filters, sort, page, page_size) {
    const events = this._getFromStorage('events', []);
    const f = filters || {};

    const start = start_date ? this._parseDate(start_date) : null;
    const end = end_date ? this._parseDate(end_date) : null;

    let res = events.slice();

    if (start) {
      res = res.filter((ev) => {
        const d = this._parseDate(ev.start_datetime);
        return d && d >= start;
      });
    }
    if (end) {
      res = res.filter((ev) => {
        const d = this._parseDate(ev.start_datetime);
        return d && d <= end;
      });
    }

    if (f.free_only) {
      res = res.filter((ev) => ev.is_free || ev.price === 0);
    } else {
      if (typeof f.price_min === 'number') {
        res = res.filter((ev) => typeof ev.price === 'number' && ev.price >= f.price_min);
      }
      if (typeof f.price_max === 'number') {
        res = res.filter((ev) => typeof ev.price === 'number' && ev.price <= f.price_max);
      }
    }

    const sortVal = sort || 'date_ascending';

    res.sort((a, b) => {
      const da = this._parseDate(a.start_datetime) || new Date(0);
      const db = this._parseDate(b.start_datetime) || new Date(0);
      if (sortVal === 'date_ascending') return da - db;
      if (sortVal === 'date_descending') return db - da;
      return da - db;
    });

    const pagination = this._paginate(res, page, page_size || 20);

    return {
      events: pagination.items,
      total_results: pagination.total_results,
      page: pagination.page,
      page_size: pagination.page_size,
      total_pages: pagination.total_pages
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const scheduled = this._getFromStorage('scheduled_events', []);

    const event = events.find((ev) => ev.id === eventId) || null;
    const is_in_schedule = scheduled.some((s) => s.event_id === eventId);

    return { event, is_in_schedule };
  }

  // saveEventToSchedule(eventId)
  saveEventToSchedule(eventId) {
    const events = this._getFromStorage('events', []);
    const scheduled = this._getFromStorage('scheduled_events', []);

    const event = events.find((ev) => ev.id === eventId);
    if (!event) {
      return { success: false, scheduled_event: null, message: 'Event not found' };
    }

    let existing = scheduled.find((s) => s.event_id === eventId);
    if (existing) {
      return { success: true, scheduled_event: existing, message: 'Event already in schedule' };
    }

    const scheduled_event = {
      id: this._generateEntityId('scheduledevt'),
      event_id: eventId,
      saved_at: this._nowISO()
    };

    scheduled.push(scheduled_event);
    this._saveToStorage('scheduled_events', scheduled);
    this._persistSingleUserState();

    return { success: true, scheduled_event, message: 'Event saved to schedule' };
  }

  // unsaveScheduledEvent(scheduledEventId)
  unsaveScheduledEvent(scheduledEventId) {
    let scheduled = this._getFromStorage('scheduled_events', []);
    const before = scheduled.length;
    scheduled = scheduled.filter((s) => s.id !== scheduledEventId);
    const after = scheduled.length;
    const success = after < before;

    this._saveToStorage('scheduled_events', scheduled);
    this._persistSingleUserState();

    return {
      success,
      message: success ? 'Event removed from schedule' : 'Scheduled event not found'
    };
  }

  // getTagPageContent(tagSlug, timeframe, sort, page, page_size)
  getTagPageContent(tagSlug, timeframe, sort, page, page_size) {
    const tag = this._resolveTagBySlug(tagSlug);
    const articles = this._getFromStorage('articles', []);
    const topicSubscriptions = this._getFromStorage('topic_subscriptions', []);

    if (!tag) {
      return {
        tag: null,
        articles: [],
        total_results: 0,
        page: 1,
        page_size: page_size || 10,
        total_pages: 1,
        available_timeframes: [
          { value: 'all_time', label: 'All time' },
          { value: 'last_30_days', label: 'Last 30 days' },
          { value: 'last_3_months', label: 'Last 3 months' },
          { value: 'last_6_months', label: 'Last 6 months' },
          { value: 'last_12_months', label: 'Last 12 months' }
        ],
        current_subscription: { exists: false, subscription: null }
      };
    }

    let taggedArticles = articles.filter(
      (a) => Array.isArray(a.tag_ids) && a.tag_ids.indexOf(tag.id) !== -1 && a.article_status === 'published'
    );

    taggedArticles = this._applyTimeframeFilter(taggedArticles, timeframe || 'all_time');

    const sortVal = sort || 'newest_first';
    taggedArticles = this._filterAndSortArticles(taggedArticles, { sort: sortVal });

    const pagination = this._paginate(taggedArticles, page, page_size || 10);

    // Enrich articles with related_exhibition if present
    const exhibitions = this._getFromStorage('exhibitions', []);
    const pagedArticles = pagination.items.map((a) => {
      const clone = Object.assign({}, a);
      if (clone.related_exhibition_id) {
        clone.related_exhibition = exhibitions.find((e) => e.id === clone.related_exhibition_id) || null;
      }
      return clone;
    });

    const available_timeframes = [
      { value: 'all_time', label: 'All time' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_3_months', label: 'Last 3 months' },
      { value: 'last_6_months', label: 'Last 6 months' },
      { value: 'last_12_months', label: 'Last 12 months' }
    ];

    const subscription = topicSubscriptions.find((s) => s.tag_id === tag.id) || null;

    return {
      tag,
      articles: pagedArticles,
      total_results: pagination.total_results,
      page: pagination.page,
      page_size: pagination.page_size,
      total_pages: pagination.total_pages,
      available_timeframes,
      current_subscription: {
        exists: !!subscription,
        subscription: subscription ? this._resolveForeignKeys(subscription) : null
      }
    };
  }

  // subscribeToTopic(tagId, email, frequency, only_new_articles)
  subscribeToTopic(tagId, email, frequency, only_new_articles) {
    const tags = this._getFromStorage('tags', []);
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) {
      return {
        subscription: null,
        created: false,
        message: 'Tag not found'
      };
    }

    let subs = this._getFromStorage('topic_subscriptions', []);
    let sub = subs.find((s) => s.tag_id === tagId && s.email === email);
    let created = false;

    if (!sub) {
      sub = {
        id: this._generateEntityId('topicsub'),
        tag_id: tagId,
        email: email,
        frequency: frequency,
        only_new_articles: typeof only_new_articles === 'boolean' ? only_new_articles : true,
        created_at: this._nowISO(),
        last_sent_at: null
      };
      subs.push(sub);
      created = true;
    } else {
      sub.frequency = frequency;
      if (typeof only_new_articles === 'boolean') {
        sub.only_new_articles = only_new_articles;
      }
    }

    this._saveToStorage('topic_subscriptions', subs);
    this._persistSingleUserState();

    return {
      subscription: this._resolveForeignKeys(sub),
      created,
      message: created ? 'Subscription created' : 'Subscription updated'
    };
  }

  // getTopicSubscriptionStatus(tagId)
  getTopicSubscriptionStatus(tagId) {
    const subs = this._getFromStorage('topic_subscriptions', []);
    const sub = subs.find((s) => s.tag_id === tagId) || null;

    return {
      exists: !!sub,
      subscription: sub ? this._resolveForeignKeys(sub) : null
    };
  }

  // getOpinionArticles(query, sort, page, page_size)
  getOpinionArticles(query, sort, page, page_size) {
    const articles = this._getFromStorage('articles', []);

    const q = (query || '').trim().toLowerCase();
    let res = articles.filter(
      (a) => a.article_section === 'opinion' && a.article_status === 'published'
    );

    if (q) {
      res = res.filter((a) => {
        const haystack = [a.title, a.subtitle, a.excerpt, a.body]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    const sortVal = sort || 'newest_first';
    res = this._filterAndSortArticles(res, { sort: sortVal });

    const pagination = this._paginate(res, page, page_size || 10);

    return {
      articles: pagination.items,
      total_results: pagination.total_results,
      page: pagination.page,
      page_size: pagination.page_size,
      total_pages: pagination.total_pages
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const tagsAll = this._getFromStorage('tags', []);
    const exhibitions = this._getFromStorage('exhibitions', []);
    const lists = this._getFromStorage('article_lists', []);
    const listItems = this._getFromStorage('article_list_items', []);

    const article = articles.find((a) => a.id === articleId) || null;

    let tags = [];
    let related_exhibition = null;

    if (article) {
      if (Array.isArray(article.tag_ids)) {
        tags = article.tag_ids
          .map((id) => tagsAll.find((t) => t.id === id) || null)
          .filter(Boolean);
      }
      if (article.related_exhibition_id) {
        related_exhibition = exhibitions.find((e) => e.id === article.related_exhibition_id) || null;
      }
    }

    const listIds = listItems
      .filter((li) => li.article_id === articleId)
      .map((li) => li.article_list_id);

    const uniqueListIds = Array.from(new Set(listIds));
    const is_saved_in_lists = lists.filter((l) => uniqueListIds.indexOf(l.id) !== -1);

    const allows_comments = !!(article && article.allows_comments);

    return {
      article,
      tags,
      related_exhibition,
      is_saved_in_lists,
      allows_comments
    };
  }

  // getArticleComments(articleId, sort)
  getArticleComments(articleId, sort) {
    const comments = this._getFromStorage('comments', []);

    let res = comments.filter(
      (c) => c.article_id === articleId && c.status === 'published'
    );

    const sortVal = sort || 'newest_first';

    res.sort((a, b) => {
      const da = this._parseDate(a.created_at) || new Date(0);
      const db = this._parseDate(b.created_at) || new Date(0);
      if (sortVal === 'newest_first') return db - da;
      if (sortVal === 'oldest_first') return da - db;
      return db - da;
    });

    return res.map((c) => this._resolveForeignKeys(c));
  }

  // postArticleComment(articleId, author_name, author_email, body)
  postArticleComment(articleId, author_name, author_email, body) {
    const articles = this._getFromStorage('articles', []);
    const comments = this._getFromStorage('comments', []);

    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { comment: null, success: false, message: 'Article not found' };
    }
    if (!article.allows_comments) {
      return { comment: null, success: false, message: 'Comments are disabled for this article' };
    }

    const comment = {
      id: this._generateEntityId('comment'),
      article_id: articleId,
      author_name,
      author_email,
      body,
      created_at: this._nowISO(),
      status: 'published'
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    // update article comment_count
    article.comment_count = typeof article.comment_count === 'number'
      ? article.comment_count + 1
      : 1;
    this._saveToStorage('articles', articles);

    this._persistSingleUserState();

    return { comment, success: true, message: 'Comment posted' };
  }

  // getArchiveFilterOptions()
  getArchiveFilterOptions() {
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);

    const archived = articles.filter((a) => a.is_archived);

    const yearsSet = new Set();
    const monthsSet = new Set(); // number 1-12
    const tagIdsSet = new Set();

    archived.forEach((a) => {
      const d = this._parseDate(a.publish_date);
      if (d) {
        yearsSet.add(d.getFullYear());
        monthsSet.add(d.getMonth() + 1);
      }
      if (Array.isArray(a.tag_ids)) {
        a.tag_ids.forEach((id) => tagIdsSet.add(id));
      }
    });

    const years = Array.from(yearsSet).sort((a, b) => b - a);

    const monthLabels = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const months = Array.from(monthsSet)
      .sort((a, b) => a - b)
      .map((m) => ({ value: m, label: monthLabels[m - 1] }));

    const categories = Array.from(tagIdsSet)
      .map((id) => tags.find((t) => t.id === id) || null)
      .filter(Boolean)
      .map((tag) => ({ value: tag.slug, label: tag.name }));

    return { years, months, categories };
  }

  // getArchiveArticles(year, month, category, page, page_size)
  getArchiveArticles(year, month, category, page, page_size) {
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);

    let res = articles.filter((a) => a.is_archived);

    res = res.filter((a) => {
      const d = this._parseDate(a.publish_date);
      return d && d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    if (category) {
      const tag = tags.find((t) => t.slug === category);
      if (tag) {
        res = res.filter(
          (a) => Array.isArray(a.tag_ids) && a.tag_ids.indexOf(tag.id) !== -1
        );
      } else {
        res = [];
      }
    }

    res.sort((a, b) => {
      const da = this._parseDate(a.publish_date) || new Date(0);
      const db = this._parseDate(b.publish_date) || new Date(0);
      return db - da;
    });

    const pagination = this._paginate(res, page, page_size || 20);

    return {
      articles: pagination.items,
      total_results: pagination.total_results,
      page: pagination.page,
      page_size: pagination.page_size,
      total_pages: pagination.total_pages
    };
  }

  // saveMultipleArticlesToNamedList(articleIds, listName, listType, createIfNotExists, replaceExistingItems)
  saveMultipleArticlesToNamedList(articleIds, listName, listType, createIfNotExists, replaceExistingItems) {
    const articleIdsArr = Array.isArray(articleIds) ? articleIds : [];
    const replace = typeof replaceExistingItems === 'boolean' ? replaceExistingItems : false;

    let list = this._getOrCreateArticleListByName(listName, listType, createIfNotExists);
    if (!list) {
      return {
        article_list: null,
        items_added: [],
        created_new_list: false,
        message: 'List not found and creation not allowed'
      };
    }

    let items = this._getFromStorage('article_list_items', []);

    if (replace) {
      items = items.filter((i) => i.article_list_id !== list.id);
    }

    const existingForList = items.filter((i) => i.article_list_id === list.id);
    let positionBase = existingForList.length
      ? Math.max.apply(null, existingForList.map((i) => typeof i.position === 'number' ? i.position : 0))
      : 0;

    const now = this._nowISO();
    const items_added = [];

    articleIdsArr.forEach((articleId) => {
      const already = items.find(
        (i) => i.article_list_id === list.id && i.article_id === articleId
      );
      if (already) return;
      positionBase += 1;
      const item = {
        id: this._generateEntityId('alistitem'),
        article_list_id: list.id,
        article_id: articleId,
        position: positionBase,
        added_at: now
      };
      items.push(item);
      items_added.push(item);
    });

    list.updated_at = this._nowISO();

    // persist
    let lists = this._getFromStorage('article_lists', []);
    lists = lists.map((l) => (l.id === list.id ? list : l));

    this._saveToStorage('article_lists', lists);
    this._saveToStorage('article_list_items', items);
    this._persistSingleUserState();

    const created_new_list = false; // creation handled in _getOrCreateArticleListByName

    return {
      article_list: list,
      items_added,
      created_new_list,
      message: 'Articles saved to list'
    };
  }

  // saveArticleToNamedList(articleId, listName, listType, createIfNotExists)
  saveArticleToNamedList(articleId, listName, listType, createIfNotExists) {
    const list = this._getOrCreateArticleListByName(listName, listType, createIfNotExists);

    if (!list) {
      return {
        article_list: null,
        article_list_item: null,
        created_new_list: false,
        message: 'List not found and creation not allowed'
      };
    }

    let items = this._getFromStorage('article_list_items', []);
    let existing = items.find(
      (i) => i.article_list_id === list.id && i.article_id === articleId
    );

    if (existing) {
      return {
        article_list: list,
        article_list_item: existing,
        created_new_list: false,
        message: 'Article already in list'
      };
    }

    const forList = items.filter((i) => i.article_list_id === list.id);
    const nextPos = forList.length
      ? Math.max.apply(null, forList.map((i) => typeof i.position === 'number' ? i.position : 0)) + 1
      : 1;

    const article_list_item = {
      id: this._generateEntityId('alistitem'),
      article_list_id: list.id,
      article_id: articleId,
      position: nextPos,
      added_at: this._nowISO()
    };

    items.push(article_list_item);
    list.updated_at = this._nowISO();

    let lists = this._getFromStorage('article_lists', []);
    const isNewList = !lists.find((l) => l.id === list.id);
    if (isNewList) {
      lists.push(list);
    } else {
      lists = lists.map((l) => (l.id === list.id ? list : l));
    }

    this._saveToStorage('article_lists', lists);
    this._saveToStorage('article_list_items', items);
    this._persistSingleUserState();

    return {
      article_list: list,
      article_list_item,
      created_new_list: isNewList,
      message: 'Article saved to list'
    };
  }

  // getUserArticleLists()
  getUserArticleLists() {
    const lists = this._getFromStorage('article_lists', []);
    const items = this._getFromStorage('article_list_items', []);

    return lists.map((list) => {
      const item_count = items.filter((i) => i.article_list_id === list.id).length;
      return { article_list: list, item_count };
    });
  }

  // renameArticleList(articleListId, newName)
  renameArticleList(articleListId, newName) {
    let lists = this._getFromStorage('article_lists', []);
    const list = lists.find((l) => l.id === articleListId);

    if (!list) {
      return { article_list: null, success: false, message: 'List not found' };
    }

    list.name = newName;
    list.updated_at = this._nowISO();

    lists = lists.map((l) => (l.id === list.id ? list : l));
    this._saveToStorage('article_lists', lists);
    this._persistSingleUserState();

    return { article_list: list, success: true, message: 'List renamed' };
  }

  // deleteArticleList(articleListId)
  deleteArticleList(articleListId) {
    let lists = this._getFromStorage('article_lists', []);
    let items = this._getFromStorage('article_list_items', []);

    const before = lists.length;
    lists = lists.filter((l) => l.id !== articleListId);
    const after = lists.length;

    const success = after < before;

    if (success) {
      items = items.filter((i) => i.article_list_id !== articleListId);
      this._saveToStorage('article_lists', lists);
      this._saveToStorage('article_list_items', items);
      this._persistSingleUserState();
    }

    return {
      success,
      message: success ? 'List deleted' : 'List not found'
    };
  }

  // removeArticleFromList(articleListItemId)
  removeArticleFromList(articleListItemId) {
    let items = this._getFromStorage('article_list_items', []);
    const before = items.length;
    items = items.filter((i) => i.id !== articleListItemId);
    const after = items.length;
    const success = after < before;

    this._saveToStorage('article_list_items', items);
    this._persistSingleUserState();

    return {
      success,
      message: success ? 'Article removed from list' : 'Item not found'
    };
  }

  // getReviewFilterOptions()
  getReviewFilterOptions() {
    const articles = this._getFromStorage('articles', []);
    const reviews = articles.filter((a) => a.content_type === 'review');

    let min_price = null;
    let max_price = null;

    reviews.forEach((r) => {
      if (typeof r.ticket_price === 'number') {
        if (min_price === null || r.ticket_price < min_price) min_price = r.ticket_price;
        if (max_price === null || r.ticket_price > max_price) max_price = r.ticket_price;
      }
    });

    const rating_options = [
      { min_rating: 1, label: '1 star & up' },
      { min_rating: 2, label: '2 stars & up' },
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 5, label: '5 stars' }
    ];

    const price_range = {
      min_price: min_price === null ? 0 : min_price,
      max_price: max_price === null ? 0 : max_price
    };

    const sort_options = [
      { value: 'highest_rated', label: 'Highest rated' },
      { value: 'lowest_price', label: 'Lowest ticket price' },
      { value: 'newest_first', label: 'Newest first' }
    ];

    return { rating_options, price_range, sort_options };
  }

  // getReviewArticles(ticket_price_max, rating_min, sort, page, page_size)
  getReviewArticles(ticket_price_max, rating_min, sort, page, page_size) {
    const articles = this._getFromStorage('articles', []);

    let res = articles.filter(
      (a) => a.content_type === 'review' && a.article_status === 'published'
    );

    if (typeof ticket_price_max === 'number') {
      res = res.filter(
        (a) => typeof a.ticket_price === 'number' && a.ticket_price <= ticket_price_max
      );
    }

    if (typeof rating_min === 'number') {
      res = res.filter((a) => typeof a.rating === 'number' && a.rating >= rating_min);
    }

    const sortVal = sort || 'highest_rated';

    if (sortVal === 'highest_rated') {
      res.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const da = this._parseDate(a.publish_date) || new Date(0);
        const db = this._parseDate(b.publish_date) || new Date(0);
        return db - da;
      });
    } else if (sortVal === 'lowest_price') {
      res.sort((a, b) => {
        const pa = typeof a.ticket_price === 'number' ? a.ticket_price : Number.POSITIVE_INFINITY;
        const pb = typeof b.ticket_price === 'number' ? b.ticket_price : Number.POSITIVE_INFINITY;
        if (pa !== pb) return pa - pb;
        const da = this._parseDate(a.publish_date) || new Date(0);
        const db = this._parseDate(b.publish_date) || new Date(0);
        return db - da;
      });
    } else if (sortVal === 'newest_first') {
      res.sort((a, b) => {
        const da = this._parseDate(a.publish_date) || new Date(0);
        const db = this._parseDate(b.publish_date) || new Date(0);
        return db - da;
      });
    }

    const pagination = this._paginate(res, page, page_size || 10);

    return {
      reviews: pagination.items,
      total_results: pagination.total_results,
      page: pagination.page,
      page_size: pagination.page_size,
      total_pages: pagination.total_pages
    };
  }

  // getSavedExhibitions()
  getSavedExhibitions() {
    const saved = this._getFromStorage('saved_exhibitions', []);
    const exhibitions = this._getFromStorage('exhibitions', []);

    return saved.map((s) => ({
      saved_exhibition: this._resolveForeignKeys(s),
      exhibition: exhibitions.find((e) => e.id === s.exhibition_id) || null
    }));
  }

  // getScheduledEvents()
  getScheduledEvents() {
    const scheduled = this._getFromStorage('scheduled_events', []);
    const events = this._getFromStorage('events', []);

    return scheduled.map((s) => ({
      scheduled_event: this._resolveForeignKeys(s),
      event: events.find((e) => e.id === s.event_id) || null
    }));
  }

  // getUserTopicSubscriptions()
  getUserTopicSubscriptions() {
    const subs = this._getFromStorage('topic_subscriptions', []);
    const tags = this._getFromStorage('tags', []);

    return subs.map((s) => ({
      subscription: this._resolveForeignKeys(s),
      tag: tags.find((t) => t.id === s.tag_id) || null
    }));
  }

  // getAccountSettings()
  getAccountSettings() {
    const settings = this._getFromStorage('account_settings', null);
    if (!settings) return null;

    // enrich with preferred_topics for convenience
    const tags = this._getFromStorage('tags', []);
    const preferredIds = Array.isArray(settings.preferred_topic_ids)
      ? settings.preferred_topic_ids
      : [];
    const preferred_topics = preferredIds
      .map((id) => tags.find((t) => t.id === id) || null)
      .filter(Boolean);

    const clone = Object.assign({}, settings);
    clone.preferred_topics = preferred_topics;
    return clone;
  }

  // signUpAndSetPreferences(username, email, password, preferred_topic_ids, general_update_frequency)
  signUpAndSetPreferences(username, email, password, preferred_topic_ids, general_update_frequency) {
    const now = this._nowISO();

    const account = {
      id: this._generateEntityId('acct'),
      username,
      email,
      password,
      general_update_frequency,
      preferred_topic_ids: Array.isArray(preferred_topic_ids) ? preferred_topic_ids : [],
      onboarding_completed: true,
      created_at: now,
      updated_at: now
    };

    this._saveToStorage('account_settings', account);
    this._persistSingleUserState();

    return account;
  }

  // updateAccountPreferences(preferred_topic_ids, general_update_frequency)
  updateAccountPreferences(preferred_topic_ids, general_update_frequency) {
    let account = this._getFromStorage('account_settings', null);
    const now = this._nowISO();

    if (!account) {
      account = {
        id: this._generateEntityId('acct'),
        username: '',
        email: '',
        password: '',
        general_update_frequency,
        preferred_topic_ids: Array.isArray(preferred_topic_ids) ? preferred_topic_ids : [],
        onboarding_completed: true,
        created_at: now,
        updated_at: now
      };
    } else {
      account.general_update_frequency = general_update_frequency;
      account.preferred_topic_ids = Array.isArray(preferred_topic_ids)
        ? preferred_topic_ids
        : [];
      account.onboarding_completed = true;
      account.updated_at = now;
    }

    this._saveToStorage('account_settings', account);
    this._persistSingleUserState();

    return account;
  }

  // getAvailableTopics()
  getAvailableTopics() {
    return this._getFromStorage('tags', []);
  }

  // getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages', []);
    const page = pages.find((p) => p.slug === pageSlug) || null;

    return {
      title: page ? page.title : '',
      body_html: page ? page.body_html : ''
    };
  }

  // submitContactMessage(name, email, subject, message, reason)
  submitContactMessage(name, email, subject, message, reason) {
    const msgs = this._getFromStorage('contact_messages', []);

    const entry = {
      id: this._generateEntityId('contact'),
      name,
      email,
      subject,
      message,
      reason: reason || null,
      created_at: this._nowISO()
    };

    msgs.push(entry);
    this._saveToStorage('contact_messages', msgs);

    return {
      success: true,
      message: 'Message submitted'
    };
  }

  // getMyLibraryOverview()
  getMyLibraryOverview() {
    const article_lists = this.getUserArticleLists();
    const saved_exhibitions = this.getSavedExhibitions();
    const scheduled_events = this.getScheduledEvents();
    const topic_subscriptions = this.getUserTopicSubscriptions();
    const account_settings = this.getAccountSettings();

    return {
      article_lists,
      saved_exhibitions,
      scheduled_events,
      topic_subscriptions,
      account_settings
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