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
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'articles',
      'reading_list_entries',
      'newsletters',
      'newsletter_subscriptions',
      'events',
      'my_events',
      'reports',
      'cart',
      'cart_items',
      'custom_feeds',
      'jobs',
      'saved_jobs',
      'companies',
      'followed_companies',
      'company_news_items'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    // Support content as an object map section -> content
    if (!localStorage.getItem('support_content')) {
      localStorage.setItem('support_content', '{}');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _now() {
    return new Date().toISOString();
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    const counter = this._getNextIdCounter();
    return prefix + '_' + counter;
  }

  _parseDate(value) {
    if (!value) return null;
    let v = value;
    if (typeof v === 'string') {
      // Fix common malformed date like 'YYYY-MM:DD...' to 'YYYY-MM-DD...'
      v = v.replace(/^(\d{4}-\d{2}):(\d{2}T)/, '$1-$2');
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  _stringIncludes(haystack, needle) {
    if (!haystack || !needle) return false;
    return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
  }

  _arrayIncludesAny(targetArray, candidates) {
    if (!Array.isArray(targetArray) || !Array.isArray(candidates) || candidates.length === 0) {
      return false;
    }
    const set = new Set(targetArray);
    return candidates.some((c) => set.has(c));
  }

  _matchesRegions(primaryRegion, regionsArray, filterRegions) {
    if (!filterRegions || filterRegions.length === 0) return true;
    if (primaryRegion && filterRegions.includes(primaryRegion)) return true;
    if (Array.isArray(regionsArray)) {
      return regionsArray.some((r) => filterRegions.includes(r));
    }
    return false;
  }

  _paginate(array, page, pageSize) {
    const safePage = page && page > 0 ? page : 1;
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const total = array.length;
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;
    const items = array.slice(start, end);
    return { items, total, page: safePage, pageSize: safePageSize };
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let openCart = carts.find((c) => c.status === 'open');
    if (!openCart) {
      openCart = {
        id: this._generateId('cart'),
        status: 'open',
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(openCart);
      this._saveToStorage('cart', carts);
    }
    return openCart;
  }

  _recalculateCartTotals(cartItems, reports) {
    let subtotal = 0;
    let currency = 'usd';
    const reportMap = new Map();
    if (Array.isArray(reports)) {
      reports.forEach((r) => {
        reportMap.set(r.id, r);
      });
    }
    cartItems.forEach((item) => {
      const report = reportMap.get(item.reportId);
      if (report) {
        if (!currency && report.currency) {
          currency = report.currency;
        } else if (report.currency) {
          currency = report.currency;
        }
      }
      subtotal += (item.unitPrice || 0) * (item.quantity || 0);
    });
    const tax = 0; // Simplified: no tax calculation
    const total = subtotal + tax;
    return { currency, subtotal, tax, total };
  }

  // Helper to filter articles for a custom feed
  _getCustomFeedArticles(feed, limit) {
    if (!feed) return [];
    const articles = this._getFromStorage('articles');
    const now = new Date();
    let dateFrom = null;
    let dateTo = null;

    if (feed.dateRangeType === 'last_7_days') {
      dateTo = now;
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (feed.dateRangeType === 'last_30_days' || !feed.dateRangeType) {
      dateTo = now;
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (feed.dateRangeType === 'last_90_days') {
      dateTo = now;
      dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (feed.dateRangeType === 'custom') {
      dateFrom = this._parseDate(feed.dateFrom);
      dateTo = this._parseDate(feed.dateTo) || now;
    }

    let filtered = articles.slice();

    if (Array.isArray(feed.topics) && feed.topics.length > 0) {
      filtered = filtered.filter((a) => this._arrayIncludesAny(a.topics || [], feed.topics));
    }

    if (Array.isArray(feed.regions) && feed.regions.length > 0) {
      filtered = filtered.filter((a) =>
        this._matchesRegions(a.primaryRegion, a.regions, feed.regions)
      );
    }

    if (Array.isArray(feed.contentTypes) && feed.contentTypes.length > 0) {
      filtered = filtered.filter((a) => feed.contentTypes.includes(a.contentType));
    }

    if (dateFrom || dateTo) {
      filtered = filtered.filter((a) => {
        const p = this._parseDate(a.publishedAt);
        if (!p) return false;
        if (dateFrom && p < dateFrom) return false;
        if (dateTo && p > dateTo) return false;
        return true;
      });
    }

    filtered.sort((a, b) => {
      const da = this._parseDate(a.publishedAt) || 0;
      const db = this._parseDate(b.publishedAt) || 0;
      return db - da;
    });

    if (typeof limit === 'number' && limit > 0) {
      return filtered.slice(0, limit);
    }
    return filtered;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1. getHomepageOverview()
  getHomepageOverview() {
    const articles = this._getFromStorage('articles');
    const reports = this._getFromStorage('reports');
    const events = this._getFromStorage('events');
    const readingListEntries = this._getFromStorage('reading_list_entries');
    const savedJobs = this._getFromStorage('saved_jobs');
    const jobs = this._getFromStorage('jobs');
    const myEvents = this._getFromStorage('my_events');
    const customFeeds = this._getFromStorage('custom_feeds');

    // Featured articles: newest first
    const featuredArticles = articles
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || 0;
        const db = this._parseDate(b.publishedAt) || 0;
        return db - da;
      })
      .slice(0, 5);

    // Featured reports: newest first by publishedAt
    const featuredReports = reports
      .filter((r) => r.isActive !== false)
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || 0;
        const db = this._parseDate(b.publishedAt) || 0;
        return db - da;
      })
      .slice(0, 5);

    // Upcoming events: soonest first
    const now = new Date();
    const upcomingEvents = events
      .filter((e) => {
        const start = this._parseDate(e.startDateTime);
        return start && start >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || 0;
        const db = this._parseDate(b.startDateTime) || 0;
        return da - db;
      })
      .slice(0, 5);

    // Highlighted topics - static configuration
    const highlightedTopics = [
      {
        topicKey: 'oncology',
        label: 'Oncology',
        description: 'Cancer research, therapeutics, and clinical innovation.'
      },
      {
        topicKey: 'gene_editing',
        label: 'Gene Editing',
        description: 'CRISPR, base editing, and genome engineering advances.'
      },
      {
        topicKey: 'cell_gene_therapy',
        label: 'Cell & Gene Therapy',
        description: 'Regenerative medicine, CAR-T, and emerging modalities.'
      },
      {
        topicKey: 'artificial_intelligence',
        label: 'AI in Life Sciences',
        description: 'AI/ML applications in discovery, development, and care.'
      }
    ];

    // Pinned feeds with previews
    const pinnedFeedsRaw = customFeeds.filter((f) => f.isPinned);
    const pinnedFeeds = pinnedFeedsRaw.map((feed) => ({
      feed,
      previewArticles: this._getCustomFeedArticles(feed, 5)
    }));

    // Reading list preview (resolve foreign keys)
    const allCompanyNews = this._getFromStorage('company_news_items');
    const recentReadingEntries = readingListEntries
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.savedAt) || 0;
        const db = this._parseDate(b.savedAt) || 0;
        return db - da;
      })
      .slice(0, 5);

    const articleMap = new Map();
    articles.forEach((a) => articleMap.set(a.id, a));
    const companyNewsMap = new Map();
    allCompanyNews.forEach((n) => companyNewsMap.set(n.id, n));

    const recentReadingListItems = recentReadingEntries.map((entry) => ({
      entry,
      article: entry.contentType === 'article' ? articleMap.get(entry.articleId) || null : null,
      companyNewsItem:
        entry.contentType === 'company_news'
          ? companyNewsMap.get(entry.companyNewsItemId) || null
          : null
    }));

    // Saved jobs preview with foreign key resolution
    const jobMap = new Map();
    jobs.forEach((j) => jobMap.set(j.id, j));
    const recentSavedJobsRaw = savedJobs
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.savedAt) || 0;
        const db = this._parseDate(b.savedAt) || 0;
        return db - da;
      })
      .slice(0, 5);

    const recentSavedJobs = recentSavedJobsRaw.map((savedJob) => ({
      savedJob,
      job: jobMap.get(savedJob.jobId) || null
    }));

    // My events preview
    const eventMap = new Map();
    events.forEach((e) => eventMap.set(e.id, e));
    const recentMyEventsRaw = myEvents
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.addedAt) || 0;
        const db = this._parseDate(b.addedAt) || 0;
        return db - da;
      })
      .slice(0, 5);

    const recentMyEvents = recentMyEventsRaw.map((myEvent) => ({
      myEvent,
      event: eventMap.get(myEvent.eventId) || null
    }));

    return {
      featuredArticles,
      featuredReports,
      upcomingEvents,
      highlightedTopics,
      pinnedFeeds,
      recentReadingListItems,
      recentSavedJobs,
      recentMyEvents
    };
  }

  // 2. searchSiteContent(query, filters, sortBy, page, pageSize)
  searchSiteContent(query, filters, sortBy, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const f = filters || {};
    const contentTypesFilter = Array.isArray(f.contentTypes) ? f.contentTypes : [];
    const regionsFilter = Array.isArray(f.regions) ? f.regions : [];
    const topicsFilter = Array.isArray(f.topics) ? f.topics : [];
    const dateFrom = this._parseDate(f.dateFrom);
    const dateTo = this._parseDate(f.dateTo);

    const articles = this._getFromStorage('articles');
    const reports = this._getFromStorage('reports');
    const events = this._getFromStorage('events');
    const companies = this._getFromStorage('companies');
    const jobs = this._getFromStorage('jobs');
    const newsletters = this._getFromStorage('newsletters');

    const results = [];

    const includeEntityType = (type) => {
      if (contentTypesFilter.length === 0) return true;
      // Article content types are 'news', 'analysis', 'opinion'
      if (type === 'article') {
        // handled per-article based on its contentType
        return true;
      }
      // Other entity types: report, event, company, job, newsletter
      return contentTypesFilter.includes(type);
    };

    const withinDateRange = (d) => {
      if (!d) return true;
      const dt = this._parseDate(d);
      if (!dt) return false;
      if (dateFrom && dt < dateFrom) return false;
      if (dateTo && dt > dateTo) return false;
      return true;
    };

    // Articles
    if (includeEntityType('article')) {
      articles.forEach((a) => {
        if (contentTypesFilter.length > 0 && !contentTypesFilter.includes(a.contentType)) {
          return;
        }
        if (regionsFilter.length > 0 && !this._matchesRegions(a.primaryRegion, a.regions, regionsFilter)) {
          return;
        }
        if (topicsFilter.length > 0 && !this._arrayIncludesAny(a.topics || [], topicsFilter)) {
          return;
        }
        if (!withinDateRange(a.publishedAt)) return;
        const text = [a.title, a.excerpt, a.content].filter(Boolean).join(' ').toLowerCase();
        if (tokens.length && !tokens.every((t) => text.includes(t))) return;
        results.push({
          id: a.id,
          entityType: 'article',
          title: a.title,
          excerpt: a.excerpt || '',
          contentType: a.contentType,
          primaryRegion: a.primaryRegion || null,
          topics: a.topics || [],
          publishedAt: a.publishedAt || null,
          urlSlug: a.slug || null
        });
      });
    }

    // Reports
    if (includeEntityType('report')) {
      reports.forEach((r) => {
        if (regionsFilter.length > 0) {
          // Reports do not have region; skip region filtering
        }
        if (topicsFilter.length > 0 && !this._arrayIncludesAny(r.topics || [], topicsFilter)) {
          return;
        }
        if (!withinDateRange(r.publishedAt)) return;
        const text = [r.title, r.description].filter(Boolean).join(' ').toLowerCase();
        if (tokens.length && !tokens.every((t) => text.includes(t))) return;
        results.push({
          id: r.id,
          entityType: 'report',
          title: r.title,
          excerpt: r.description || '',
          contentType: 'report',
          primaryRegion: null,
          topics: r.topics || [],
          publishedAt: r.publishedAt || null,
          urlSlug: r.slug || null
        });
      });
    }

    // Events
    if (includeEntityType('event')) {
      events.forEach((e) => {
        if (regionsFilter.length > 0 && e.region && !regionsFilter.includes(e.region)) {
          return;
        }
        if (topicsFilter.length > 0 && !this._arrayIncludesAny(e.topics || [], topicsFilter)) {
          return;
        }
        if (!withinDateRange(e.startDateTime)) return;
        const text = [e.title, e.description].filter(Boolean).join(' ').toLowerCase();
        if (tokens.length && !tokens.every((t) => text.includes(t))) return;
        results.push({
          id: e.id,
          entityType: 'event',
          title: e.title,
          excerpt: e.description || '',
          contentType: 'event',
          primaryRegion: e.region || null,
          topics: e.topics || [],
          publishedAt: e.startDateTime || null,
          urlSlug: e.slug || null
        });
      });
    }

    // Companies
    if (includeEntityType('company')) {
      companies.forEach((c) => {
        if (regionsFilter.length > 0 && c.region && !regionsFilter.includes(c.region)) {
          return;
        }
        if (topicsFilter.length > 0 && !this._arrayIncludesAny(c.focusAreas || [], topicsFilter)) {
          return;
        }
        const text = [c.name, c.description, c.city, c.country]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (tokens.length && !tokens.every((t) => text.includes(t))) return;
        results.push({
          id: c.id,
          entityType: 'company',
          title: c.name,
          excerpt: c.description || '',
          contentType: 'company',
          primaryRegion: c.region || null,
          topics: c.focusAreas || [],
          publishedAt: null,
          urlSlug: c.slug || null
        });
      });
    }

    // Jobs (include company resolution later in specific getters)
    if (includeEntityType('job')) {
      jobs.forEach((j) => {
        if (regionsFilter.length > 0 && j.region && !regionsFilter.includes(j.region)) {
          return;
        }
        if (topicsFilter.length > 0) {
          const kw = j.keywords || [];
          if (!this._arrayIncludesAny(kw, topicsFilter)) {
            return;
          }
        }
        if (!withinDateRange(j.datePosted)) return;
        const text = [j.title, j.description, j.requirements]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (tokens.length && !tokens.every((t) => text.includes(t))) return;
        results.push({
          id: j.id,
          entityType: 'job',
          title: j.title,
          excerpt: (j.description || '').slice(0, 200),
          contentType: 'job',
          primaryRegion: j.region || null,
          topics: j.keywords || [],
          publishedAt: j.datePosted || null,
          urlSlug: j.slug || null
        });
      });
    }

    // Newsletters
    if (includeEntityType('newsletter')) {
      newsletters.forEach((n) => {
        if (topicsFilter.length > 0 && !this._arrayIncludesAny(n.topics || [], topicsFilter)) {
          return;
        }
        const text = [n.title, n.description].filter(Boolean).join(' ').toLowerCase();
        if (tokens.length && !tokens.every((t) => text.includes(t))) return;
        results.push({
          id: n.id,
          entityType: 'newsletter',
          title: n.title,
          excerpt: n.description || '',
          contentType: 'newsletter',
          primaryRegion: null,
          topics: n.topics || [],
          publishedAt: n.createdAt || null,
          urlSlug: n.slug || null
        });
      });
    }

    // Sorting
    const sort = sortBy || 'relevance';
    results.sort((a, b) => {
      const da = this._parseDate(a.publishedAt) || 0;
      const db = this._parseDate(b.publishedAt) || 0;
      if (sort === 'newest_first') {
        return db - da;
      }
      if (sort === 'oldest_first') {
        return da - db;
      }
      // relevance: newest first as a proxy
      return db - da;
    });

    const pagination = this._paginate(results, page || 1, pageSize || 20);
    return {
      results: pagination.items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 3. getSearchFilterOptions()
  getSearchFilterOptions() {
    const contentTypes = [
      { value: 'news', label: 'News' },
      { value: 'analysis', label: 'Analysis' },
      { value: 'opinion', label: 'Opinion' },
      { value: 'report', label: 'Reports' },
      { value: 'event', label: 'Events' },
      { value: 'company', label: 'Companies' },
      { value: 'job', label: 'Jobs' },
      { value: 'newsletter', label: 'Newsletters' }
    ];

    const regions = [
      { value: 'global', label: 'Global' },
      { value: 'europe', label: 'Europe' },
      { value: 'north_america', label: 'North America' },
      { value: 'asia_pacific', label: 'Asia-Pacific' },
      { value: 'latin_america', label: 'Latin America' },
      { value: 'middle_east_africa', label: 'Middle East & Africa' },
      { value: 'united_states', label: 'United States' },
      { value: 'united_kingdom', label: 'United Kingdom' }
    ];

    const topics = [
      { value: 'oncology', label: 'Oncology' },
      { value: 'neurology', label: 'Neurology' },
      { value: 'gene_editing', label: 'Gene Editing' },
      { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
      { value: 'drug_discovery', label: 'Drug Discovery' },
      { value: 'cell_therapy', label: 'Cell Therapy' },
      { value: 'cell_gene_therapy', label: 'Cell & Gene Therapy' },
      { value: 'immunology', label: 'Immunology' },
      { value: 'cardiology', label: 'Cardiology' },
      { value: 'infectious_diseases', label: 'Infectious Diseases' },
      { value: 'rare_diseases', label: 'Rare Diseases' }
    ];

    const dateRanges = [
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_90_days', label: 'Last 90 days' }
    ];

    return { contentTypes, regions, topics, dateRanges };
  }

  // 4. listNewsArticles(filters, sortBy, page, pageSize)
  listNewsArticles(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const articles = this._getFromStorage('articles');
    let filtered = articles.filter((a) => a.contentType === 'news');

    if (Array.isArray(f.therapeuticAreas) && f.therapeuticAreas.length > 0) {
      filtered = filtered.filter((a) => f.therapeuticAreas.includes(a.therapeuticArea));
    }

    if (Array.isArray(f.diseases) && f.diseases.length > 0) {
      filtered = filtered.filter((a) => f.diseases.includes(a.disease));
    }

    if (Array.isArray(f.technologies) && f.technologies.length > 0) {
      filtered = filtered.filter((a) => f.technologies.includes(a.technology));
    }

    if (Array.isArray(f.regions) && f.regions.length > 0) {
      filtered = filtered.filter((a) =>
        this._matchesRegions(a.primaryRegion, a.regions, f.regions)
      );
    }

    if (Array.isArray(f.tags) && f.tags.length > 0) {
      filtered = filtered.filter((a) => this._arrayIncludesAny(a.tags || [], f.tags));
    }

    if (typeof f.isRegulatory === 'boolean') {
      filtered = filtered.filter((a) => a.isRegulatory === f.isRegulatory);
    }

    if (typeof f.isClinicalTrial === 'boolean') {
      filtered = filtered.filter((a) => a.isClinicalTrial === f.isClinicalTrial);
    }

    if (Array.isArray(f.trialPhases) && f.trialPhases.length > 0) {
      filtered = filtered.filter((a) => f.trialPhases.includes(a.trialPhase));
    }

    const dateFrom = this._parseDate(f.dateFrom);
    const dateTo = this._parseDate(f.dateTo);
    if (dateFrom || dateTo) {
      filtered = filtered.filter((a) => {
        const p = this._parseDate(a.publishedAt);
        if (!p) return false;
        if (dateFrom && p < dateFrom) return false;
        if (dateTo && p > dateTo) return false;
        return true;
      });
    }

    const sort = sortBy || 'newest_first';
    filtered.sort((a, b) => {
      if (sort === 'most_popular') {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        return pb - pa;
      }
      const da = this._parseDate(a.publishedAt) || 0;
      const db = this._parseDate(b.publishedAt) || 0;
      if (sort === 'oldest_first') {
        return da - db;
      }
      // newest_first default
      return db - da;
    });

    const pagination = this._paginate(filtered, page || 1, pageSize || 20);
    return {
      articles: pagination.items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 5. getNewsFilterOptions()
  getNewsFilterOptions() {
    const therapeuticAreas = [
      { value: 'oncology', label: 'Oncology' },
      { value: 'neurology', label: 'Neurology' },
      { value: 'immunology', label: 'Immunology' },
      { value: 'cardiology', label: 'Cardiology' },
      { value: 'metabolic_disorders', label: 'Metabolic Disorders' },
      { value: 'infectious_diseases', label: 'Infectious Diseases' },
      { value: 'rare_diseases', label: 'Rare Diseases' },
      { value: 'other', label: 'Other' }
    ];

    const diseases = [
      { value: 'alzheimers_disease', label: "Alzheimer's Disease" },
      { value: 'parkinsons_disease', label: "Parkinson's Disease" },
      { value: 'unspecified_cancer', label: 'Unspecified Cancer' },
      { value: 'lung_cancer', label: 'Lung Cancer' },
      { value: 'breast_cancer', label: 'Breast Cancer' },
      { value: 'covid_19', label: 'COVID-19' },
      { value: 'other', label: 'Other' }
    ];

    const technologies = [
      { value: 'mrna_vaccines', label: 'mRNA Vaccines' },
      { value: 'gene_editing', label: 'Gene Editing' },
      { value: 'cell_therapy', label: 'Cell Therapy' },
      { value: 'cell_gene_therapy', label: 'Cell & Gene Therapy' },
      { value: 'ai_machine_learning', label: 'AI & Machine Learning' },
      { value: 'other', label: 'Other' }
    ];

    const regions = [
      { value: 'global', label: 'Global' },
      { value: 'europe', label: 'Europe' },
      { value: 'north_america', label: 'North America' },
      { value: 'asia_pacific', label: 'Asia-Pacific' },
      { value: 'latin_america', label: 'Latin America' },
      { value: 'middle_east_africa', label: 'Middle East & Africa' },
      { value: 'united_states', label: 'United States' },
      { value: 'united_kingdom', label: 'United Kingdom' }
    ];

    const tags = [
      { value: 'regulation & policy', label: 'Regulation & Policy' },
      { value: 'clinical trial', label: 'Clinical Trial' },
      { value: 'market access', label: 'Market Access' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'funding', label: 'Funding' }
    ];

    const trialPhases = [
      { value: 'preclinical', label: 'Preclinical' },
      { value: 'phase_1', label: 'Phase 1' },
      { value: 'phase_2', label: 'Phase 2' },
      { value: 'phase_3', label: 'Phase 3' },
      { value: 'phase_4', label: 'Phase 4' },
      { value: 'na', label: 'Not Applicable' }
    ];

    return { therapeuticAreas, diseases, technologies, regions, tags, trialPhases };
  }

  // 6. getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const readingListEntries = this._getFromStorage('reading_list_entries');
    const article = articles.find((a) => a.id === articleId) || null;

    const isSavedToReadingList = !!readingListEntries.find(
      (e) => e.contentType === 'article' && e.articleId === articleId
    );

    // Related articles: share topic/technology/disease
    let relatedArticles = [];
    if (article) {
      relatedArticles = articles
        .filter((a) => a.id !== article.id)
        .filter((a) => {
          if (article.therapeuticArea && a.therapeuticArea === article.therapeuticArea) return true;
          if (article.disease && a.disease === article.disease) return true;
          if (article.technology && a.technology === article.technology) return true;
          if (Array.isArray(article.topics) && this._arrayIncludesAny(a.topics || [], article.topics)) {
            return true;
          }
          return false;
        })
        .sort((a, b) => {
          const da = this._parseDate(a.publishedAt) || 0;
          const db = this._parseDate(b.publishedAt) || 0;
          return db - da;
        })
        .slice(0, 5);
    }

    return { article, isSavedToReadingList, relatedArticles };
  }

  // 7. saveArticleToReadingList(articleId)
  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const readingListEntries = this._getFromStorage('reading_list_entries');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, readingListEntry: null, message: 'Article not found' };
    }

    let entry = readingListEntries.find(
      (e) => e.contentType === 'article' && e.articleId === articleId
    );

    if (entry) {
      return { success: true, readingListEntry: entry, message: 'Already in reading list' };
    }

    entry = {
      id: this._generateId('rle'),
      contentType: 'article',
      articleId: articleId,
      companyNewsItemId: null,
      title: article.title || '',
      savedAt: this._now()
    };
    readingListEntries.push(entry);
    this._saveToStorage('reading_list_entries', readingListEntries);

    return { success: true, readingListEntry: entry, message: 'Saved to reading list' };
  }

  // 8. removeReadingListEntry(readingListEntryId)
  removeReadingListEntry(readingListEntryId) {
    const readingListEntries = this._getFromStorage('reading_list_entries');
    const index = readingListEntries.findIndex((e) => e.id === readingListEntryId);
    if (index === -1) {
      return { success: false, message: 'Reading list entry not found' };
    }
    readingListEntries.splice(index, 1);
    this._saveToStorage('reading_list_entries', readingListEntries);
    return { success: true, message: 'Reading list entry removed' };
  }

  // 9. copyArticleLink(articleId)
  copyArticleLink(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, shareUrl: null, message: 'Article not found' };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task6_lastCopiedArticleId', articleId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const shareUrl = article.shareUrl || null;
    return { success: true, shareUrl, message: 'Link copied' };
  }

  // 10. getReadingList(page, pageSize)
  getReadingList(page, pageSize) {
    const readingListEntries = this._getFromStorage('reading_list_entries');
    const articles = this._getFromStorage('articles');
    const companyNewsItems = this._getFromStorage('company_news_items');

    const articleMap = new Map();
    articles.forEach((a) => articleMap.set(a.id, a));
    const companyNewsMap = new Map();
    companyNewsItems.forEach((n) => companyNewsMap.set(n.id, n));

    const sorted = readingListEntries
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.savedAt) || 0;
        const db = this._parseDate(b.savedAt) || 0;
        return db - da;
      });

    const pagination = this._paginate(sorted, page || 1, pageSize || 50);

    const items = pagination.items.map((entry) => ({
      entry,
      article: entry.contentType === 'article' ? articleMap.get(entry.articleId) || null : null,
      companyNewsItem:
        entry.contentType === 'company_news'
          ? companyNewsMap.get(entry.companyNewsItemId) || null
          : null
    }));

    return {
      items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 11. listInsightArticles(filters, sortBy, page, pageSize)
  listInsightArticles(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const articles = this._getFromStorage('articles');
    let filtered = articles.filter((a) => a.contentType === 'opinion');

    if (Array.isArray(f.topics) && f.topics.length > 0) {
      filtered = filtered.filter((a) => this._arrayIncludesAny(a.topics || [], f.topics));
    }

    if (Array.isArray(f.tags) && f.tags.length > 0) {
      filtered = filtered.filter((a) => this._arrayIncludesAny(a.tags || [], f.tags));
    }

    if (Array.isArray(f.regions) && f.regions.length > 0) {
      filtered = filtered.filter((a) =>
        this._matchesRegions(a.primaryRegion, a.regions, f.regions)
      );
    }

    if (typeof f.minReadingTime === 'number') {
      filtered = filtered.filter(
        (a) => typeof a.readingTimeMinutes === 'number' && a.readingTimeMinutes >= f.minReadingTime
      );
    }

    if (typeof f.maxReadingTime === 'number') {
      filtered = filtered.filter(
        (a) => typeof a.readingTimeMinutes === 'number' && a.readingTimeMinutes <= f.maxReadingTime
      );
    }

    const sort = sortBy || 'most_popular';
    filtered.sort((a, b) => {
      if (sort === 'newest_first') {
        const da = this._parseDate(a.publishedAt) || 0;
        const db = this._parseDate(b.publishedAt) || 0;
        return db - da;
      }
      if (sort === 'longest_reading_time') {
        const ra = typeof a.readingTimeMinutes === 'number' ? a.readingTimeMinutes : 0;
        const rb = typeof b.readingTimeMinutes === 'number' ? b.readingTimeMinutes : 0;
        return rb - ra;
      }
      // most_popular
      const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
      const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
      return pb - pa;
    });

    const pagination = this._paginate(filtered, page || 1, pageSize || 20);
    return {
      articles: pagination.items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 12. getInsightsFilterOptions()
  getInsightsFilterOptions() {
    const topics = [
      { value: 'oncology', label: 'Oncology' },
      { value: 'neurology', label: 'Neurology' },
      { value: 'gene_editing', label: 'Gene Editing' },
      { value: 'cell_gene_therapy', label: 'Cell & Gene Therapy' },
      { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
      { value: 'drug_discovery', label: 'Drug Discovery' }
    ];

    const tags = [
      { value: 'regulation & policy', label: 'Regulation & Policy' },
      { value: 'market access', label: 'Market Access' },
      { value: 'clinical trial', label: 'Clinical Trial' },
      { value: 'strategy', label: 'Strategy' }
    ];

    return { topics, tags };
  }

  // 13. listNewsletters(filters, sortBy, page, pageSize)
  listNewsletters(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const newsletters = this._getFromStorage('newsletters');
    let filtered = newsletters.slice();

    if (Array.isArray(f.topics) && f.topics.length > 0) {
      filtered = filtered.filter((n) => this._arrayIncludesAny(n.topics || [], f.topics));
    }

    if (typeof f.audience === 'string' && f.audience) {
      filtered = filtered.filter((n) => n.audience === f.audience);
    }

    if (Array.isArray(f.frequencies) && f.frequencies.length > 0) {
      filtered = filtered.filter((n) => f.frequencies.includes(n.frequency));
    }

    const isActiveOnly = typeof f.isActiveOnly === 'boolean' ? f.isActiveOnly : true;
    if (isActiveOnly) {
      filtered = filtered.filter((n) => n.isActive !== false);
    }

    const sort = sortBy || 'alphabetical';
    if (sort === 'alphabetical') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    const pagination = this._paginate(filtered, page || 1, pageSize || 50);
    return {
      newsletters: pagination.items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 14. getNewsletterFilterOptions()
  getNewsletterFilterOptions() {
    const topics = [
      { value: 'oncology', label: 'Oncology' },
      { value: 'neurology', label: 'Neurology' },
      { value: 'gene_editing', label: 'Gene Editing' },
      { value: 'cell_gene_therapy', label: 'Cell & Gene Therapy' },
      { value: 'artificial_intelligence', label: 'Artificial Intelligence' }
    ];

    const frequencies = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'ad_hoc', label: 'Ad hoc' }
    ];

    return { topics, frequencies };
  }

  // 15. getNewsletterDetail(newsletterId)
  getNewsletterDetail(newsletterId) {
    const newsletters = this._getFromStorage('newsletters');
    const subscriptions = this._getFromStorage('newsletter_subscriptions');

    const newsletter = newsletters.find((n) => n.id === newsletterId) || null;

    const subsForNewsletter = subscriptions
      .filter((s) => s.newsletterId === newsletterId)
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.subscribedAt) || 0;
        const db = this._parseDate(b.subscribedAt) || 0;
        return db - da;
      });

    const latestSubscription = subsForNewsletter[0] || null;
    if (latestSubscription && newsletter) {
      // Foreign key resolution inside subscription
      latestSubscription.newsletter = newsletter;
    }

    const isSubscribed = !!(
      latestSubscription && latestSubscription.status === 'subscribed'
    );

    return { newsletter, isSubscribed, latestSubscription };
  }

  // 16. subscribeToNewsletter(newsletterId, email, name, deliveryTimePreference)
  subscribeToNewsletter(newsletterId, email, name, deliveryTimePreference) {
    const newsletters = this._getFromStorage('newsletters');
    const subscriptions = this._getFromStorage('newsletter_subscriptions');

    const newsletter = newsletters.find((n) => n.id === newsletterId);
    if (!newsletter) {
      return { success: false, subscription: null, message: 'Newsletter not found' };
    }

    const subscription = {
      id: this._generateId('nsub'),
      newsletterId,
      email,
      name: name || null,
      deliveryTimePreference: deliveryTimePreference || 'no_preference',
      status: 'subscribed',
      subscribedAt: this._now(),
      unsubscribedAt: null
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return { success: true, subscription, message: 'Subscribed to newsletter' };
  }

  // 17. listEvents(filters, sortBy, page, pageSize)
  listEvents(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const events = this._getFromStorage('events');

    let filtered = events.slice();

    if (Array.isArray(f.formats) && f.formats.length > 0) {
      filtered = filtered.filter((e) => f.formats.includes(e.format));
    }

    if (Array.isArray(f.topics) && f.topics.length > 0) {
      filtered = filtered.filter((e) => this._arrayIncludesAny(e.topics || [], f.topics));
    }

    if (typeof f.region === 'string' && f.region) {
      filtered = filtered.filter((e) => e.region === f.region);
    }

    if (typeof f.country === 'string' && f.country) {
      filtered = filtered.filter((e) => e.country === f.country);
    }

    if (typeof f.city === 'string' && f.city) {
      filtered = filtered.filter((e) => e.city === f.city);
    }

    if (typeof f.isVirtual === 'boolean') {
      filtered = filtered.filter((e) => e.isVirtual === f.isVirtual);
    }

    let dateFrom = this._parseDate(f.dateFrom);
    let dateTo = this._parseDate(f.dateTo);
    const now = new Date();
    if (typeof f.dateRangeType === 'string' && f.dateRangeType) {
      if (f.dateRangeType === 'next_7_days') {
        dateFrom = now;
        dateTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else if (f.dateRangeType === 'next_30_days') {
        dateFrom = now;
        dateTo = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else if (f.dateRangeType === 'next_90_days') {
        dateFrom = now;
        dateTo = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      }
    }

    if (dateFrom || dateTo) {
      filtered = filtered.filter((e) => {
        const s = this._parseDate(e.startDateTime);
        if (!s) return false;
        if (dateFrom && s < dateFrom) return false;
        if (dateTo && s > dateTo) return false;
        return true;
      });
    }

    const sort = sortBy || 'date_soonest_first';
    filtered.sort((a, b) => {
      const da = this._parseDate(a.startDateTime) || 0;
      const db = this._parseDate(b.startDateTime) || 0;
      if (sort === 'date_latest_first') {
        return db - da;
      }
      // date_soonest_first or relevance
      return da - db;
    });

    const pagination = this._paginate(filtered, page || 1, pageSize || 50);
    return {
      events: pagination.items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 18. getEventFilterOptions()
  getEventFilterOptions() {
    const formats = [
      { value: 'webinar', label: 'Webinar' },
      { value: 'conference', label: 'Conference' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'roundtable', label: 'Roundtable' },
      { value: 'course', label: 'Course' },
      { value: 'other', label: 'Other' }
    ];

    const regions = [
      { value: 'global', label: 'Global' },
      { value: 'europe', label: 'Europe' },
      { value: 'north_america', label: 'North America' },
      { value: 'asia_pacific', label: 'Asia-Pacific' },
      { value: 'latin_america', label: 'Latin America' },
      { value: 'middle_east_africa', label: 'Middle East & Africa' },
      { value: 'united_states', label: 'United States' },
      { value: 'united_kingdom', label: 'United Kingdom' }
    ];

    const topics = [
      { value: 'oncology', label: 'Oncology' },
      { value: 'neurology', label: 'Neurology' },
      { value: 'gene_editing', label: 'Gene Editing' },
      { value: 'cell_gene_therapy', label: 'Cell & Gene Therapy' },
      { value: 'artificial_intelligence', label: 'Artificial Intelligence' }
    ];

    const dateRanges = [
      { value: 'next_30_days', label: 'Next 30 days' },
      { value: 'next_90_days', label: 'Next 90 days' }
    ];

    return { formats, regions, topics, dateRanges };
  }

  // 19. addEventToMyEvents(eventId)
  addEventToMyEvents(eventId) {
    const events = this._getFromStorage('events');
    const myEvents = this._getFromStorage('my_events');

    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, myEvent: null, message: 'Event not found' };
    }

    let myEvent = myEvents.find((m) => m.eventId === eventId);
    if (myEvent) {
      return { success: true, myEvent, message: 'Event already in My Events' };
    }

    myEvent = {
      id: this._generateId('myevent'),
      eventId,
      addedAt: this._now()
    };

    myEvents.push(myEvent);
    this._saveToStorage('my_events', myEvents);

    return { success: true, myEvent, message: 'Event added to My Events' };
  }

  // 20. getMyEventsList(page, pageSize)
  getMyEventsList(page, pageSize) {
    const myEvents = this._getFromStorage('my_events');
    const events = this._getFromStorage('events');

    const eventMap = new Map();
    events.forEach((e) => eventMap.set(e.id, e));

    const sorted = myEvents
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.addedAt) || 0;
        const db = this._parseDate(b.addedAt) || 0;
        return db - da;
      });

    const pagination = this._paginate(sorted, page || 1, pageSize || 50);

    const items = pagination.items.map((myEvent) => ({
      myEvent,
      event: eventMap.get(myEvent.eventId) || null
    }));

    return {
      items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 21. searchReports(query, filters, sortBy, page, pageSize)
  searchReports(query, filters, sortBy, page, pageSize) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const reports = this._getFromStorage('reports');

    let filtered = reports.slice();

    if (q) {
      filtered = filtered.filter((r) => {
        const text = [r.title, r.description].filter(Boolean).join(' ').toLowerCase();
        return text.includes(q);
      });
    }

    if (Array.isArray(f.topics) && f.topics.length > 0) {
      filtered = filtered.filter((r) => this._arrayIncludesAny(r.topics || [], f.topics));
    }

    if (typeof f.priceMin === 'number') {
      filtered = filtered.filter((r) => typeof r.price === 'number' && r.price >= f.priceMin);
    }

    if (typeof f.priceMax === 'number') {
      filtered = filtered.filter((r) => typeof r.price === 'number' && r.price <= f.priceMax);
    }

    if (typeof f.ratingMin === 'number') {
      filtered = filtered.filter(
        (r) => typeof r.rating === 'number' && r.rating >= f.ratingMin
      );
    }

    if (typeof f.currency === 'string' && f.currency) {
      filtered = filtered.filter((r) => r.currency === f.currency);
    }

    const isActiveOnly = typeof f.isActiveOnly === 'boolean' ? f.isActiveOnly : true;
    if (isActiveOnly) {
      filtered = filtered.filter((r) => r.isActive !== false);
    }

    const sort = sortBy || 'price_low_to_high';
    filtered.sort((a, b) => {
      if (sort === 'price_high_to_low') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sort === 'newest_first') {
        const da = this._parseDate(a.publishedAt) || 0;
        const db = this._parseDate(b.publishedAt) || 0;
        return db - da;
      }
      if (sort === 'most_popular') {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      }
      // price_low_to_high default
      return (a.price || 0) - (b.price || 0);
    });

    const pagination = this._paginate(filtered, page || 1, pageSize || 20);
    return {
      reports: pagination.items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 22. getReportFilterOptions()
  getReportFilterOptions() {
    const topics = [
      { value: 'cell_therapy', label: 'Cell Therapy' },
      { value: 'cell_gene_therapy', label: 'Cell & Gene Therapy' },
      { value: 'oncology', label: 'Oncology' },
      { value: 'artificial_intelligence', label: 'Artificial Intelligence' },
      { value: 'drug_discovery', label: 'Drug Discovery' }
    ];

    const ratingPresets = [
      { value: 4.0, label: '4 stars & up' },
      { value: 3.0, label: '3 stars & up' }
    ];

    const currencies = [
      { value: 'usd', label: 'USD' },
      { value: 'eur', label: 'EUR' },
      { value: 'gbp', label: 'GBP' },
      { value: 'other', label: 'Other' }
    ];

    return { topics, ratingPresets, currencies };
  }

  // 23. getReportDetail(reportId)
  getReportDetail(reportId) {
    const reports = this._getFromStorage('reports');
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('cart');

    const report = reports.find((r) => r.id === reportId) || null;

    const openCart = carts.find((c) => c.status === 'open');
    let isInCart = false;
    if (openCart) {
      isInCart = !!cartItems.find(
        (ci) => ci.cartId === openCart.id && ci.reportId === reportId
      );
    }

    let relatedReports = [];
    if (report) {
      relatedReports = reports
        .filter((r) => r.id !== report.id)
        .filter((r) => this._arrayIncludesAny(r.topics || [], report.topics || []))
        .sort((a, b) => {
          const da = this._parseDate(a.publishedAt) || 0;
          const db = this._parseDate(b.publishedAt) || 0;
          return db - da;
        })
        .slice(0, 5);
    }

    return { report, isInCart, relatedReports };
  }

  // 24. addReportToCart(reportId, quantity)
  addReportToCart(reportId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const reports = this._getFromStorage('reports');
    const report = reports.find((r) => r.id === reportId);
    if (!report) {
      return {
        success: false,
        cart: null,
        cartItems: [],
        totals: { currency: 'usd', subtotal: 0, tax: 0, total: 0 },
        message: 'Report not found'
      };
    }

    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items');

    let cartItem = allCartItems.find(
      (ci) => ci.cartId === cart.id && ci.reportId === reportId
    );

    if (cartItem) {
      cartItem.quantity += qty;
    } else {
      cartItem = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        reportId,
        quantity: qty,
        unitPrice: report.price,
        addedAt: this._now()
      };
      allCartItems.push(cartItem);
    }

    // Update cart updatedAt
    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex].updatedAt = this._now();
      this._saveToStorage('cart', carts);
    }

    this._saveToStorage('cart_items', allCartItems);

    const itemsForCart = allCartItems.filter((ci) => ci.cartId === cart.id);
    const totals = this._recalculateCartTotals(itemsForCart, reports);

    return {
      success: true,
      cart,
      cartItems: itemsForCart,
      totals,
      message: 'Report added to cart'
    };
  }

  // 25. getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items');
    const reports = this._getFromStorage('reports');

    const itemsForCart = allCartItems.filter((ci) => ci.cartId === cart.id);
    const reportMap = new Map();
    reports.forEach((r) => reportMap.set(r.id, r));

    const items = itemsForCart.map((cartItem) => ({
      cartItem,
      report: reportMap.get(cartItem.reportId) || null
    }));

    const totals = this._recalculateCartTotals(itemsForCart, reports);

    return { cart, items, totals };
  }

  // 26. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const allCartItems = this._getFromStorage('cart_items');
    const reports = this._getFromStorage('reports');
    const carts = this._getFromStorage('cart');

    const index = allCartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        cart: null,
        items: [],
        totals: { currency: 'usd', subtotal: 0, tax: 0, total: 0 },
        message: 'Cart item not found'
      };
    }

    const cartItem = allCartItems[index];
    if (quantity <= 0) {
      allCartItems.splice(index, 1);
    } else {
      cartItem.quantity = quantity;
    }

    this._saveToStorage('cart_items', allCartItems);

    const cart = carts.find((c) => c.id === cartItem.cartId) || this._getOrCreateCart();
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex].updatedAt = this._now();
      this._saveToStorage('cart', carts);
    }

    const itemsForCart = allCartItems.filter((ci) => ci.cartId === cart.id);
    const reportMap = new Map();
    reports.forEach((r) => reportMap.set(r.id, r));

    const items = itemsForCart.map((ci) => ({
      cartItem: ci,
      report: reportMap.get(ci.reportId) || null
    }));

    const totals = this._recalculateCartTotals(itemsForCart, reports);

    return { success: true, cart, items, totals, message: 'Cart updated' };
  }

  // 27. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const allCartItems = this._getFromStorage('cart_items');
    const reports = this._getFromStorage('reports');
    const carts = this._getFromStorage('cart');

    const index = allCartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        cart: null,
        items: [],
        totals: { currency: 'usd', subtotal: 0, tax: 0, total: 0 },
        message: 'Cart item not found'
      };
    }

    const cartId = allCartItems[index].cartId;
    allCartItems.splice(index, 1);
    this._saveToStorage('cart_items', allCartItems);

    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex].updatedAt = this._now();
      this._saveToStorage('cart', carts);
    }

    const itemsForCart = allCartItems.filter((ci) => ci.cartId === cart.id);
    const reportMap = new Map();
    reports.forEach((r) => reportMap.set(r.id, r));

    const items = itemsForCart.map((ci) => ({
      cartItem: ci,
      report: reportMap.get(ci.reportId) || null
    }));

    const totals = this._recalculateCartTotals(itemsForCart, reports);

    return { success: true, cart, items, totals, message: 'Cart item removed' };
  }

  // 28. listCustomFeeds()
  listCustomFeeds() {
    const feeds = this._getFromStorage('custom_feeds');
    return { feeds };
  }

  // 29. getCustomFeedDetail(customFeedId)
  getCustomFeedDetail(customFeedId) {
    const feeds = this._getFromStorage('custom_feeds');
    const feed = feeds.find((f) => f.id === customFeedId) || null;
    const previewArticles = feed ? this._getCustomFeedArticles(feed, 10) : [];
    return { feed, previewArticles };
  }

  // 30. getCustomFeedItems(customFeedId, page, pageSize)
  getCustomFeedItems(customFeedId, page, pageSize) {
    const feeds = this._getFromStorage('custom_feeds');
    const feed = feeds.find((f) => f.id === customFeedId) || null;
    if (!feed) {
      return { feed: null, items: [], total: 0, page: page || 1, pageSize: pageSize || 20 };
    }

    const allItems = this._getCustomFeedArticles(feed);
    const pagination = this._paginate(allItems, page || 1, pageSize || 20);

    return {
      feed,
      items: pagination.items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 31. createCustomFeed(name, topics, regions, dateRangeType, dateFrom, dateTo, contentTypes, isPinned)
  createCustomFeed(name, topics, regions, dateRangeType, dateFrom, dateTo, contentTypes, isPinned) {
    const feeds = this._getFromStorage('custom_feeds');

    const feed = {
      id: this._generateId('feed'),
      name,
      topics: Array.isArray(topics) ? topics : [],
      regions: Array.isArray(regions) ? regions : [],
      dateRangeType: dateRangeType || 'last_30_days',
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      contentTypes: Array.isArray(contentTypes) ? contentTypes : [],
      isPinned: !!isPinned,
      createdAt: this._now(),
      updatedAt: null
    };

    feeds.push(feed);
    this._saveToStorage('custom_feeds', feeds);

    return { success: true, feed, message: 'Custom feed created' };
  }

  // 32. updateCustomFeed(customFeedId, updates)
  updateCustomFeed(customFeedId, updates) {
    const feeds = this._getFromStorage('custom_feeds');
    const index = feeds.findIndex((f) => f.id === customFeedId);
    if (index === -1) {
      return { success: false, feed: null, message: 'Custom feed not found' };
    }

    const feed = feeds[index];
    const u = updates || {};

    if (typeof u.name === 'string') feed.name = u.name;
    if (Array.isArray(u.topics)) feed.topics = u.topics;
    if (Array.isArray(u.regions)) feed.regions = u.regions;
    if (typeof u.dateRangeType === 'string') feed.dateRangeType = u.dateRangeType;
    if (typeof u.dateFrom === 'string' || u.dateFrom === null) feed.dateFrom = u.dateFrom;
    if (typeof u.dateTo === 'string' || u.dateTo === null) feed.dateTo = u.dateTo;
    if (Array.isArray(u.contentTypes)) feed.contentTypes = u.contentTypes;

    feed.updatedAt = this._now();

    feeds[index] = feed;
    this._saveToStorage('custom_feeds', feeds);

    return { success: true, feed, message: 'Custom feed updated' };
  }

  // 33. deleteCustomFeed(customFeedId)
  deleteCustomFeed(customFeedId) {
    const feeds = this._getFromStorage('custom_feeds');
    const index = feeds.findIndex((f) => f.id === customFeedId);
    if (index === -1) {
      return { success: false, message: 'Custom feed not found' };
    }
    feeds.splice(index, 1);
    this._saveToStorage('custom_feeds', feeds);
    return { success: true, message: 'Custom feed deleted' };
  }

  // 34. pinCustomFeed(customFeedId, isPinned)
  pinCustomFeed(customFeedId, isPinned) {
    const feeds = this._getFromStorage('custom_feeds');
    const index = feeds.findIndex((f) => f.id === customFeedId);
    if (index === -1) {
      return { success: false, feed: null, message: 'Custom feed not found' };
    }

    feeds[index].isPinned = !!isPinned;
    feeds[index].updatedAt = this._now();
    this._saveToStorage('custom_feeds', feeds);

    return { success: true, feed: feeds[index], message: 'Custom feed pin status updated' };
  }

  // 35. getPinnedCustomFeeds()
  getPinnedCustomFeeds() {
    const feeds = this._getFromStorage('custom_feeds');
    const pinned = feeds.filter((f) => f.isPinned);

    const result = pinned.map((feed) => ({
      feed,
      previewArticles: this._getCustomFeedArticles(feed, 5)
    }));

    return { feeds: result };
  }

  // 36. getJobFilterOptions()
  getJobFilterOptions() {
    const industries = [
      { value: 'biotech_pharmaceuticals', label: 'Biotech & Pharmaceuticals' },
      { value: 'medtech_devices', label: 'Medtech & Devices' },
      { value: 'academia', label: 'Academia' },
      { value: 'consulting', label: 'Consulting' },
      { value: 'healthcare_it', label: 'Healthcare IT' },
      { value: 'other', label: 'Other' }
    ];

    const workArrangements = [
      { value: 'remote', label: 'Remote' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'onsite', label: 'On-site' }
    ];

    const regions = [
      { value: 'global', label: 'Global' },
      { value: 'europe', label: 'Europe' },
      { value: 'north_america', label: 'North America' },
      { value: 'asia_pacific', label: 'Asia-Pacific' },
      { value: 'latin_america', label: 'Latin America' },
      { value: 'middle_east_africa', label: 'Middle East & Africa' },
      { value: 'united_states', label: 'United States' },
      { value: 'united_kingdom', label: 'United Kingdom' }
    ];

    const seniorityLevels = [
      { value: 'intern', label: 'Intern' },
      { value: 'junior', label: 'Junior' },
      { value: 'mid', label: 'Mid-level' },
      { value: 'senior', label: 'Senior' },
      { value: 'lead', label: 'Lead' },
      { value: 'director', label: 'Director' },
      { value: 'vp', label: 'VP' },
      { value: 'c_level', label: 'C-level' },
      { value: 'other', label: 'Other' }
    ];

    return { industries, workArrangements, regions, seniorityLevels };
  }

  // 37. searchJobs(keyword, filters, sortBy, page, pageSize)
  searchJobs(keyword, filters, sortBy, page, pageSize) {
    const kw = (keyword || '').toLowerCase();
    const f = filters || {};
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');

    let filtered = jobs.slice();

    const isActiveOnly = typeof f.isActiveOnly === 'boolean' ? f.isActiveOnly : true;
    if (isActiveOnly) {
      filtered = filtered.filter((j) => j.isActive !== false);
    }

    if (kw) {
      filtered = filtered.filter((j) => {
        const text = [j.title, j.description, j.requirements]
          .concat(j.keywords || [])
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(kw);
      });
    }

    if (Array.isArray(f.industries) && f.industries.length > 0) {
      filtered = filtered.filter((j) => f.industries.includes(j.industry));
    }

    if (typeof f.locationCity === 'string' && f.locationCity) {
      filtered = filtered.filter((j) => j.locationCity === f.locationCity);
    }

    if (typeof f.locationState === 'string' && f.locationState) {
      filtered = filtered.filter((j) => j.locationState === f.locationState);
    }

    if (typeof f.locationCountry === 'string' && f.locationCountry) {
      filtered = filtered.filter((j) => j.locationCountry === f.locationCountry);
    }

    if (typeof f.region === 'string' && f.region) {
      filtered = filtered.filter((j) => j.region === f.region);
    }

    if (Array.isArray(f.workArrangements) && f.workArrangements.length > 0) {
      filtered = filtered.filter((j) =>
        this._arrayIncludesAny(j.workArrangements || [], f.workArrangements)
      );
    }

    if (typeof f.salaryMin === 'number') {
      filtered = filtered.filter((j) => {
        if (typeof j.salaryMax === 'number') {
          return j.salaryMax >= f.salaryMin;
        }
        if (typeof j.salaryMin === 'number') {
          return j.salaryMin >= f.salaryMin;
        }
        return false;
      });
    }

    if (typeof f.salaryMax === 'number') {
      filtered = filtered.filter((j) => {
        if (typeof j.salaryMin === 'number') {
          return j.salaryMin <= f.salaryMax;
        }
        if (typeof j.salaryMax === 'number') {
          return j.salaryMax <= f.salaryMax;
        }
        return false;
      });
    }

    if (typeof f.currency === 'string' && f.currency) {
      filtered = filtered.filter((j) => j.currency === f.currency);
    }

    if (Array.isArray(f.seniorityLevels) && f.seniorityLevels.length > 0) {
      filtered = filtered.filter((j) => f.seniorityLevels.includes(j.seniority));
    }

    const sort = sortBy || 'date_newest_first';
    filtered.sort((a, b) => {
      if (sort === 'relevance') {
        const da = this._parseDate(a.datePosted) || 0;
        const db = this._parseDate(b.datePosted) || 0;
        return db - da;
      }
      // date_newest_first default
      const da = this._parseDate(a.datePosted) || 0;
      const db = this._parseDate(b.datePosted) || 0;
      return db - da;
    });

    const pagination = this._paginate(filtered, page || 1, pageSize || 25);

    // Foreign key resolution: attach company to each job
    const companyMap = new Map();
    companies.forEach((c) => companyMap.set(c.id, c));
    const jobsWithCompany = pagination.items.map((j) => ({
      ...j,
      company: j.companyId ? companyMap.get(j.companyId) || null : null
    }));

    return {
      jobs: jobsWithCompany,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 38. getJobDetail(jobId)
  getJobDetail(jobId) {
    const jobs = this._getFromStorage('jobs');
    const companies = this._getFromStorage('companies');
    const savedJobs = this._getFromStorage('saved_jobs');

    const job = jobs.find((j) => j.id === jobId) || null;
    const company = job && job.companyId
      ? companies.find((c) => c.id === job.companyId) || null
      : null;

    const isSaved = !!savedJobs.find((s) => s.jobId === jobId);

    return { job, company, isSaved };
  }

  // 39. saveJob(jobId)
  saveJob(jobId) {
    const jobs = this._getFromStorage('jobs');
    const savedJobs = this._getFromStorage('saved_jobs');

    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      return { success: false, savedJob: null, message: 'Job not found' };
    }

    let savedJob = savedJobs.find((s) => s.jobId === jobId);
    if (savedJob) {
      return { success: true, savedJob, message: 'Job already saved' };
    }

    savedJob = {
      id: this._generateId('savedjob'),
      jobId,
      savedAt: this._now()
    };

    savedJobs.push(savedJob);
    this._saveToStorage('saved_jobs', savedJobs);

    return { success: true, savedJob, message: 'Job saved' };
  }

  // 40. getSavedJobs(page, pageSize)
  getSavedJobs(page, pageSize) {
    const savedJobs = this._getFromStorage('saved_jobs');
    const jobs = this._getFromStorage('jobs');

    const jobMap = new Map();
    jobs.forEach((j) => jobMap.set(j.id, j));

    const sorted = savedJobs
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.savedAt) || 0;
        const db = this._parseDate(b.savedAt) || 0;
        return db - da;
      });

    const pagination = this._paginate(sorted, page || 1, pageSize || 50);

    const items = pagination.items.map((savedJob) => ({
      savedJob,
      job: jobMap.get(savedJob.jobId) || null
    }));

    return {
      items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 41. getCompanyFilterOptions()
  getCompanyFilterOptions() {
    const stages = [
      { value: 'startup', label: 'Startup' },
      { value: 'scaleup', label: 'Scale-up' },
      { value: 'private', label: 'Private' },
      { value: 'public', label: 'Public' },
      { value: 'enterprise', label: 'Enterprise' },
      { value: 'other', label: 'Other' }
    ];

    const focusAreas = [
      { value: 'cell_gene_therapy', label: 'Cell & Gene Therapy' },
      { value: 'oncology', label: 'Oncology' },
      { value: 'gene_editing', label: 'Gene Editing' },
      { value: 'artificial_intelligence', label: 'Artificial Intelligence' }
    ];

    const regions = [
      { value: 'global', label: 'Global' },
      { value: 'europe', label: 'Europe' },
      { value: 'north_america', label: 'North America' },
      { value: 'asia_pacific', label: 'Asia-Pacific' },
      { value: 'latin_america', label: 'Latin America' },
      { value: 'middle_east_africa', label: 'Middle East & Africa' },
      { value: 'united_states', label: 'United States' },
      { value: 'united_kingdom', label: 'United Kingdom' }
    ];

    const sizeRanges = [
      { value: 'size_1_20', label: '1-20 employees' },
      { value: 'size_21_50', label: '21-50 employees' },
      { value: 'size_51_200', label: '51-200 employees' },
      { value: 'size_201_500', label: '201-500 employees' },
      { value: 'size_501_1000', label: '501-1000 employees' },
      { value: 'size_1001_plus', label: '1001+ employees' }
    ];

    return { stages, focusAreas, regions, sizeRanges };
  }

  // 42. listCompanies(query, filters, sortBy, page, pageSize)
  listCompanies(query, filters, sortBy, page, pageSize) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const companies = this._getFromStorage('companies');
    const followed = this._getFromStorage('followed_companies');

    let filtered = companies.slice();

    const isActiveOnly = typeof f.isActiveOnly === 'boolean' ? f.isActiveOnly : true;
    if (isActiveOnly) {
      filtered = filtered.filter((c) => c.isActive !== false);
    }

    if (q) {
      filtered = filtered.filter((c) => {
        const text = [c.name, c.description, c.city, c.country]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return text.includes(q);
      });
    }

    if (Array.isArray(f.stages) && f.stages.length > 0) {
      filtered = filtered.filter((c) => f.stages.includes(c.stage));
    }

    if (Array.isArray(f.focusAreas) && f.focusAreas.length > 0) {
      filtered = filtered.filter((c) =>
        this._arrayIncludesAny(c.focusAreas || [], f.focusAreas)
      );
    }

    if (Array.isArray(f.regions) && f.regions.length > 0) {
      filtered = filtered.filter((c) => f.regions.includes(c.region));
    }

    if (Array.isArray(f.countries) && f.countries.length > 0) {
      filtered = filtered.filter((c) => f.countries.includes(c.country));
    }

    if (Array.isArray(f.sizeRanges) && f.sizeRanges.length > 0) {
      filtered = filtered.filter((c) => f.sizeRanges.includes(c.sizeRange));
    }

    const sort = sortBy || 'alphabetical_az';

    if (sort === 'alphabetical_az') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort === 'alphabetical_za') {
      filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (sort === 'most_followed') {
      const followCounts = new Map();
      followed.forEach((fItem) => {
        const cnt = followCounts.get(fItem.companyId) || 0;
        followCounts.set(fItem.companyId, cnt + 1);
      });
      filtered.sort((a, b) => {
        const ca = followCounts.get(a.id) || 0;
        const cb = followCounts.get(b.id) || 0;
        if (cb !== ca) return cb - ca;
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    const pagination = this._paginate(filtered, page || 1, pageSize || 50);
    return {
      companies: pagination.items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 43. getCompanyProfile(companyId)
  getCompanyProfile(companyId) {
    const companies = this._getFromStorage('companies');
    const followedCompanies = this._getFromStorage('followed_companies');
    const companyNewsItems = this._getFromStorage('company_news_items');
    const articles = this._getFromStorage('articles');

    const company = companies.find((c) => c.id === companyId) || null;
    const isFollowed = !!followedCompanies.find((f) => f.companyId === companyId);

    const newsForCompany = companyNewsItems
      .filter((n) => n.companyId === companyId)
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || 0;
        const db = this._parseDate(b.publishedAt) || 0;
        return db - da;
      });

    const articleMap = new Map();
    articles.forEach((a) => articleMap.set(a.id, a));

    const latestNews = newsForCompany.map((n) => ({
      ...n,
      article: n.articleId ? articleMap.get(n.articleId) || null : null
    }));

    const relatedArticles = articles
      .filter((a) => Array.isArray(a.companyIds) && a.companyIds.includes(companyId))
      .sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || 0;
        const db = this._parseDate(b.publishedAt) || 0;
        return db - da;
      });

    return { company, isFollowed, latestNews, relatedArticles };
  }

  // 44. followCompany(companyId)
  followCompany(companyId) {
    const companies = this._getFromStorage('companies');
    const followedCompanies = this._getFromStorage('followed_companies');

    const company = companies.find((c) => c.id === companyId);
    if (!company) {
      return { success: false, followedCompany: null, message: 'Company not found' };
    }

    let followed = followedCompanies.find((f) => f.companyId === companyId);
    if (followed) {
      return { success: true, followedCompany: followed, message: 'Company already followed' };
    }

    followed = {
      id: this._generateId('followedcompany'),
      companyId,
      followedAt: this._now()
    };

    followedCompanies.push(followed);
    this._saveToStorage('followed_companies', followedCompanies);

    return { success: true, followedCompany: followed, message: 'Company followed' };
  }

  // 45. unfollowCompany(companyId)
  unfollowCompany(companyId) {
    const followedCompanies = this._getFromStorage('followed_companies');
    const index = followedCompanies.findIndex((f) => f.companyId === companyId);
    if (index === -1) {
      return { success: false, message: 'Company not followed' };
    }
    followedCompanies.splice(index, 1);
    this._saveToStorage('followed_companies', followedCompanies);
    return { success: true, message: 'Company unfollowed' };
  }

  // 46. saveCompanyNewsItem(companyNewsItemId)
  saveCompanyNewsItem(companyNewsItemId) {
    const companyNewsItems = this._getFromStorage('company_news_items');
    const readingListEntries = this._getFromStorage('reading_list_entries');

    const newsItem = companyNewsItems.find((n) => n.id === companyNewsItemId);
    if (!newsItem) {
      return { success: false, readingListEntry: null, message: 'Company news item not found' };
    }

    let entry = readingListEntries.find(
      (e) => e.contentType === 'company_news' && e.companyNewsItemId === companyNewsItemId
    );

    if (entry) {
      return { success: true, readingListEntry: entry, message: 'Already in reading list' };
    }

    entry = {
      id: this._generateId('rle'),
      contentType: 'company_news',
      articleId: null,
      companyNewsItemId,
      title: newsItem.title || '',
      savedAt: this._now()
    };

    readingListEntries.push(entry);
    this._saveToStorage('reading_list_entries', readingListEntries);

    return { success: true, readingListEntry: entry, message: 'Company news saved' };
  }

  // 47. getFollowedCompanies(page, pageSize)
  getFollowedCompanies(page, pageSize) {
    const followedCompanies = this._getFromStorage('followed_companies');
    const companies = this._getFromStorage('companies');

    const companyMap = new Map();
    companies.forEach((c) => companyMap.set(c.id, c));

    const sorted = followedCompanies
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.followedAt) || 0;
        const db = this._parseDate(b.followedAt) || 0;
        return db - da;
      });

    const pagination = this._paginate(sorted, page || 1, pageSize || 50);

    const items = pagination.items.map((followedCompany) => ({
      followedCompany,
      company: companyMap.get(followedCompany.companyId) || null
    }));

    return {
      items,
      total: pagination.total,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
  }

  // 48. getUserDashboardSummary()
  getUserDashboardSummary() {
    const readingListEntries = this._getFromStorage('reading_list_entries');
    const articles = this._getFromStorage('articles');
    const companyNewsItems = this._getFromStorage('company_news_items');
    const myEvents = this._getFromStorage('my_events');
    const events = this._getFromStorage('events');
    const savedJobs = this._getFromStorage('saved_jobs');
    const jobs = this._getFromStorage('jobs');
    const followedCompanies = this._getFromStorage('followed_companies');
    const companies = this._getFromStorage('companies');
    const customFeeds = this._getFromStorage('custom_feeds');

    const articleMap = new Map();
    articles.forEach((a) => articleMap.set(a.id, a));
    const companyNewsMap = new Map();
    companyNewsItems.forEach((n) => companyNewsMap.set(n.id, n));

    const readingSorted = readingListEntries
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.savedAt) || 0;
        const db = this._parseDate(b.savedAt) || 0;
        return db - da;
      })
      .slice(0, 10);

    const readingListPreview = readingSorted.map((entry) => ({
      entry,
      article: entry.contentType === 'article' ? articleMap.get(entry.articleId) || null : null,
      companyNewsItem:
        entry.contentType === 'company_news'
          ? companyNewsMap.get(entry.companyNewsItemId) || null
          : null
    }));

    const eventMap = new Map();
    events.forEach((e) => eventMap.set(e.id, e));
    const myEventsPreview = myEvents
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.addedAt) || 0;
        const db = this._parseDate(b.addedAt) || 0;
        return db - da;
      })
      .slice(0, 10)
      .map((myEvent) => ({
        myEvent,
        event: eventMap.get(myEvent.eventId) || null
      }));

    const jobMap = new Map();
    jobs.forEach((j) => jobMap.set(j.id, j));
    const savedJobsPreview = savedJobs
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.savedAt) || 0;
        const db = this._parseDate(b.savedAt) || 0;
        return db - da;
      })
      .slice(0, 10)
      .map((savedJob) => ({
        savedJob,
        job: jobMap.get(savedJob.jobId) || null
      }));

    const companyMap = new Map();
    companies.forEach((c) => companyMap.set(c.id, c));
    const followedCompaniesPreview = followedCompanies
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.followedAt) || 0;
        const db = this._parseDate(b.followedAt) || 0;
        return db - da;
      })
      .slice(0, 10)
      .map((followedCompany) => ({
        followedCompany,
        company: companyMap.get(followedCompany.companyId) || null
      }));

    const pinnedFeedsRaw = customFeeds.filter((f) => f.isPinned);
    const pinnedFeeds = pinnedFeedsRaw.map((feed) => ({
      feed,
      previewArticles: this._getCustomFeedArticles(feed, 5)
    }));

    return {
      readingListPreview,
      myEventsPreview,
      savedJobsPreview,
      followedCompaniesPreview,
      pinnedFeeds
    };
  }

  // 49. getSupportContent(section)
  getSupportContent(section) {
    const raw = localStorage.getItem('support_content');
    const map = raw ? JSON.parse(raw) : {};
    const key = section || '';
    const item = map[key] || null;

    if (item) {
      return {
        section: key,
        title: item.title || '',
        body: item.body || '',
        lastUpdated: item.lastUpdated || ''
      };
    }

    // Fallback minimal structure if not present in storage
    return {
      section: key,
      title: '',
      body: '',
      lastUpdated: ''
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