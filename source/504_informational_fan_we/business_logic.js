// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

  // -------------------------
  // Initialization & Storage
  // -------------------------

  _initStorage() {
    const arrayKeys = [
      'articles',
      'reading_list_items',
      'reading_queue_items',
      'cars',
      'car_favorites',
      'recently_viewed_cars',
      'events',
      'followed_events',
      'stages',
      'stage_favorites',
      'videos',
      'playlists',
      'playlist_items',
      'drivers',
      'driver_season_stats',
      'followed_drivers',
      'ask_historian_questions'
    ];

    const nullKeys = [
      'profile',
      'stats_view_preferences',
      'profile_auth',
      'profile_session'
    ];

    arrayKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, '[]');
      }
    });

    nullKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, 'null');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return defaultValue;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed === null ? defaultValue : parsed;
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

  _nowIso() {
    return new Date().toISOString();
  }

  _hashPassword(password) {
    // Simple deterministic hash (not cryptographically secure, but avoids storing plain text)
    if (typeof password !== 'string') return '';
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0; // Convert to 32bit int
    }
    return 'h_' + Math.abs(hash);
  }

  _stringIncludes(haystack, needle) {
    if (!needle) return true;
    if (!haystack) return false;
    return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
  }

  _unique(array) {
    return Array.from(new Set(array));
  }

  // -------------------------
  // Helper functions (private)
  // -------------------------

  // Profile helpers
  _getOrCreateProfileState() {
    let profile = this._getFromStorage('profile', null);
    if (!profile || typeof profile !== 'object') {
      const now = this._nowIso();
      profile = {
        id: 'profile_1',
        username: null,
        favoriteDriverId: null,
        language: 'english',
        siteNotificationsEnabled: false,
        isRegistered: false,
        createdAt: now,
        updatedAt: now,
        avatarUrl: null
      };
      this._persistProfileState(profile);
    }
    return profile;
  }

  _persistProfileState(profile) {
    this._saveToStorage('profile', profile);
  }

  _getProfileSession() {
    return this._getFromStorage('profile_session', null);
  }

  _setProfileSession(session) {
    this._saveToStorage('profile_session', session);
  }

  // Reading list helpers
  _getOrCreateReadingList() {
    let list = this._getFromStorage('reading_list_items', null);
    if (!Array.isArray(list)) {
      list = [];
      this._saveToStorage('reading_list_items', list);
    }
    return list;
  }

  // Reading queue helpers
  _getOrCreateReadingQueue() {
    let queue = this._getFromStorage('reading_queue_items', null);
    if (!Array.isArray(queue)) {
      queue = [];
    }
    queue = this._resequenceQueuePositions(queue, 'position');
    this._saveToStorage('reading_queue_items', queue);
    return queue;
  }

  // Generic resequencing for queue-like collections
  _resequenceQueuePositions(items, positionField) {
    const copy = Array.isArray(items) ? items.slice() : [];
    copy.sort((a, b) => {
      const pa = typeof a[positionField] === 'number' ? a[positionField] : Number.MAX_SAFE_INTEGER;
      const pb = typeof b[positionField] === 'number' ? b[positionField] : Number.MAX_SAFE_INTEGER;
      return pa - pb;
    });
    for (let i = 0; i < copy.length; i++) {
      copy[i][positionField] = i + 1;
    }
    return copy;
  }

  // Recently viewed cars helper
  _updateRecentlyViewedCars(carId) {
    if (!carId) return;
    let views = this._getFromStorage('recently_viewed_cars', []);
    // Remove existing entries for this car
    views = views.filter((v) => v.carId !== carId);
    // Add as most recent
    const record = {
      id: this._generateId('rvc'),
      carId,
      viewedAt: this._nowIso()
    };
    views.unshift(record);
    const MAX_RECENT = 20;
    if (views.length > MAX_RECENT) {
      views = views.slice(0, MAX_RECENT);
    }
    this._saveToStorage('recently_viewed_cars', views);
  }

  // Favorites helpers (cars & stages)
  _getOrCreateFavoritesStore() {
    let carFavs = this._getFromStorage('car_favorites', null);
    if (!Array.isArray(carFavs)) carFavs = [];
    let stageFavs = this._getFromStorage('stage_favorites', null);
    if (!Array.isArray(stageFavs)) stageFavs = [];
    this._saveToStorage('car_favorites', carFavs);
    this._saveToStorage('stage_favorites', stageFavs);
    return { carFavs, stageFavs };
  }

  // Follow helpers (events & drivers)
  _getOrCreateFollowStore() {
    let followedEvents = this._getFromStorage('followed_events', null);
    if (!Array.isArray(followedEvents)) followedEvents = [];
    let followedDrivers = this._getFromStorage('followed_drivers', null);
    if (!Array.isArray(followedDrivers)) followedDrivers = [];
    this._saveToStorage('followed_events', followedEvents);
    this._saveToStorage('followed_drivers', followedDrivers);
    return { followedEvents, followedDrivers };
  }

  // Playlists helpers
  _getOrCreatePlaylistsStore() {
    let playlists = this._getFromStorage('playlists', null);
    if (!Array.isArray(playlists)) playlists = [];
    let playlistItems = this._getFromStorage('playlist_items', null);
    if (!Array.isArray(playlistItems)) playlistItems = [];
    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_items', playlistItems);
    return { playlists, playlistItems };
  }

  // Stats preference helper
  _getOrCreateStatsPreference() {
    let pref = this._getFromStorage('stats_view_preferences', null);
    if (!pref || typeof pref !== 'object') {
      pref = {
        id: 'stats_pref_1',
        tab: 'drivers',
        metric: 'podiums',
        startSeason: 2015,
        endSeason: 2020,
        sortOrder: 'metric_high_to_low'
      };
      this._saveToStorage('stats_view_preferences', pref);
    }
    return pref;
  }

  // Ask a Historian validation
  _validateAskHistorianQuestion(topic, subject, questionText, preferredReplyFormat) {
    const errors = {};
    const allowedTopics = [
      'group_b_era',
      'early_years',
      'modern_wrc',
      'drivers',
      'cars_technology',
      'events_history',
      'other'
    ];
    const allowedFormats = [
      'article_suggestion',
      'short_answer',
      'video_recommendation',
      'link_collection'
    ];
    const minWords = 40;

    if (!allowedTopics.includes(topic)) {
      errors.topic = 'Invalid topic.';
    }
    if (!subject || !subject.trim()) {
      errors.subject = 'Subject is required.';
    }
    if (!questionText || !questionText.trim()) {
      errors.questionText = 'Question text is required.';
    } else {
      const wordCount = questionText.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < minWords) {
        errors.questionText = 'Question must be at least ' + minWords + ' words.';
      }
    }
    if (!allowedFormats.includes(preferredReplyFormat)) {
      errors.preferredReplyFormat = 'Invalid reply format.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  // -------------------------
  // Core interface implementations
  // -------------------------

  // 1. getHomePageContent
  getHomePageContent() {
    const articles = this._getFromStorage('articles', []);
    const events = this._getFromStorage('events', []);
    const cars = this._getFromStorage('cars', []);
    const profile = this._getOrCreateProfileState();
    const drivers = this._getFromStorage('drivers', []);

    // Featured articles: newest first, take top 5
    const featuredArticles = articles
      .slice()
      .sort((a, b) => {
        const da = a.publishedAt || a.createdAt || '';
        const db = b.publishedAt || b.createdAt || '';
        return db.localeCompare(da);
      })
      .slice(0, 5);

    // Upcoming events: status 'upcoming' or startDate in future, earliest first, top 5
    const nowIso = this._nowIso();
    const upcomingEvents = events
      .filter((e) => {
        if (e.status === 'upcoming') return true;
        if (e.startDate) {
          return e.startDate >= nowIso;
        }
        return false;
      })
      .sort((a, b) => {
        const da = a.startDate || '';
        const db = b.startDate || '';
        return da.localeCompare(db);
      })
      .slice(0, 5);

    // Spotlight cars: highest top speed, top 5
    const spotlightCars = cars
      .slice()
      .sort((a, b) => (b.topSpeedKph || 0) - (a.topSpeedKph || 0))
      .slice(0, 5);

    let favoriteDriverName = null;
    if (profile.favoriteDriverId) {
      const d = drivers.find((dr) => dr.id === profile.favoriteDriverId);
      if (d) favoriteDriverName = d.fullName || (d.firstName + ' ' + d.lastName);
    }

    const profileSummary = {
      isRegistered: !!profile.isRegistered,
      username: profile.username || null,
      favoriteDriverName,
      showSetupCallToAction: !profile.isRegistered
    };

    return {
      featuredArticles,
      upcomingEvents,
      spotlightCars,
      profileSummary
    };
  }

  // 2. getProfile
  getProfile() {
    return this._getOrCreateProfileState();
  }

  // 3. registerProfile
  registerProfile(username, password, confirmPassword, favoriteDriverId) {
    const validationErrors = {};

    if (!username || !username.trim()) {
      validationErrors.username = 'Username is required.';
    }

    if (!password || password.length < 8) {
      validationErrors.password = 'Password must be at least 8 characters long.';
    }

    if (password !== confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match.';
    }

    if (favoriteDriverId) {
      const drivers = this._getFromStorage('drivers', []);
      const driver = drivers.find((d) => d.id === favoriteDriverId);
      if (!driver) {
        validationErrors.favoriteDriverId = 'Selected favorite driver does not exist.';
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      return {
        success: false,
        profile: null,
        message: 'Validation failed.',
        validationErrors
      };
    }

    const profile = this._getOrCreateProfileState();
    const now = this._nowIso();

    profile.username = username.trim();
    if (favoriteDriverId) {
      profile.favoriteDriverId = favoriteDriverId;
    }
    profile.isRegistered = true;
    if (!profile.createdAt) profile.createdAt = now;
    profile.updatedAt = now;

    this._persistProfileState(profile);

    // Store password hash separately
    const auth = {
      passwordHash: this._hashPassword(password)
    };
    this._saveToStorage('profile_auth', auth);

    // Mark session as logged in
    this._setProfileSession({ isLoggedIn: true, lastLoginAt: now });

    return {
      success: true,
      profile,
      message: 'Profile registered successfully.',
      validationErrors: {}
    };
  }

  // 4. updateProfilePreferences
  updateProfilePreferences(language, siteNotificationsEnabled) {
    const profile = this._getOrCreateProfileState();
    const allowedLanguages = ['english', 'finnish', 'estonian', 'german', 'spanish', 'other'];

    if (typeof language !== 'undefined' && language !== null) {
      if (allowedLanguages.includes(language)) {
        profile.language = language;
      }
    }

    if (typeof siteNotificationsEnabled === 'boolean') {
      profile.siteNotificationsEnabled = siteNotificationsEnabled;
    }

    profile.updatedAt = this._nowIso();
    this._persistProfileState(profile);
    return profile;
  }

  // 5. logoutProfile
  logoutProfile() {
    this._setProfileSession({ isLoggedIn: false, lastLogoutAt: this._nowIso() });
    return {
      success: true,
      message: 'Logged out successfully.'
    };
  }

  // 6. searchDrivers
  searchDrivers(query, lastNameStartsWith, limit) {
    const drivers = this._getFromStorage('drivers', []);
    const q = (query || '').trim().toLowerCase();
    const lastInitial = (lastNameStartsWith || '').trim().toLowerCase();
    const max = typeof limit === 'number' && limit > 0 ? limit : 20;

    let results = drivers.filter((d) => {
      let ok = true;
      if (q) {
        const fullName = (d.fullName || (d.firstName + ' ' + d.lastName || '')).toLowerCase();
        ok = fullName.includes(q);
      }
      if (ok && lastInitial) {
        const ln = (d.lastName || '').toLowerCase();
        ok = ln.startsWith(lastInitial);
      }
      return ok;
    });

    return results.slice(0, max);
  }

  // 7. getSearchFilterOptions
  getSearchFilterOptions() {
    return {
      contentTypes: [
        { value: 'articles', label: 'Articles' },
        { value: 'videos', label: 'Videos' },
        { value: 'cars', label: 'Cars' },
        { value: 'events', label: 'Events' },
        { value: 'stages', label: 'Stages' }
      ],
      sortOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'newest_first', label: 'Newest first' },
        { value: 'oldest_first', label: 'Oldest first' },
        { value: 'most_viewed', label: 'Most viewed' }
      ]
    };
  }

  // Helper for searchContent relevance scoring
  _computeSearchScore(fields, query) {
    if (!query) return 0;
    const q = query.toLowerCase();
    let score = 0;
    fields.forEach((f) => {
      if (!f) return;
      const text = String(f).toLowerCase();
      if (text.includes(q)) {
        score += 1;
      }
    });
    return score;
  }

  // 8. searchContent
  searchContent(query, contentTypes, sortOrder = 'relevance', page = 1, pageSize = 20) {
    const q = (query || '').trim();
    const qLower = q.toLowerCase();
    const allTypes = ['articles', 'videos', 'cars', 'events', 'stages'];
    const types = Array.isArray(contentTypes) && contentTypes.length ? contentTypes : allTypes;

    const articles = this._getFromStorage('articles', []);
    const videos = this._getFromStorage('videos', []);
    const cars = this._getFromStorage('cars', []);
    const events = this._getFromStorage('events', []);
    const stages = this._getFromStorage('stages', []);
    const drivers = this._getFromStorage('drivers', []);

    const eventsById = {};
    events.forEach((e) => {
      eventsById[e.id] = e;
    });
    const stagesById = {};
    stages.forEach((s) => {
      stagesById[s.id] = s;
    });
    const driversById = {};
    drivers.forEach((d) => {
      driversById[d.id] = d;
    });
    const carsById = {};
    cars.forEach((c) => {
      carsById[c.id] = c;
    });

    const results = [];

    if (types.includes('articles')) {
      articles.forEach((a) => {
        const fields = [a.title, a.summary, a.content, (a.tags || []).join(' ')];
        const matches = !q || this._computeSearchScore(fields, q) > 0;
        if (matches) {
          const score = this._computeSearchScore(fields, q);
          results.push({ type: 'article', article: a, _score: score });
        }
      });
    }

    if (types.includes('videos')) {
      videos.forEach((v) => {
        const relatedEvent = v.eventId ? eventsById[v.eventId] : null;
        const relatedStage = v.stageId ? stagesById[v.stageId] : null;
        const relatedDriver = v.driverId ? driversById[v.driverId] : null;
        const relatedCar = v.carId ? carsById[v.carId] : null;
        const fields = [
          v.title,
          v.description,
          relatedEvent && relatedEvent.name,
          relatedStage && relatedStage.name,
          relatedDriver && (relatedDriver.fullName || relatedDriver.lastName),
          relatedCar && relatedCar.name
        ];
        const matches = !q || this._computeSearchScore(fields, q) > 0;
        if (matches) {
          const score = this._computeSearchScore(fields, q);
          results.push({ type: 'video', video: v, _score: score });
        }
      });
    }

    if (types.includes('cars')) {
      cars.forEach((c) => {
        const fields = [c.name, c.manufacturer, c.model, c.description];
        const matches = !q || this._computeSearchScore(fields, q) > 0;
        if (matches) {
          const score = this._computeSearchScore(fields, q);
          results.push({ type: 'car', car: c, _score: score });
        }
      });
    }

    if (types.includes('events')) {
      events.forEach((e) => {
        const fields = [e.name, e.location, e.country, e.description];
        const matches = !q || this._computeSearchScore(fields, q) > 0;
        if (matches) {
          const score = this._computeSearchScore(fields, q);
          results.push({ type: 'event', event: e, _score: score });
        }
      });
    }

    if (types.includes('stages')) {
      stages.forEach((s) => {
        const relatedEvent = s.eventId ? eventsById[s.eventId] : null;
        const fields = [s.name, s.description, relatedEvent && relatedEvent.name];
        const matches = !q || this._computeSearchScore(fields, q) > 0;
        if (matches) {
          const score = this._computeSearchScore(fields, q);
          results.push({ type: 'stage', stage: s, _score: score });
        }
      });
    }

    // Sorting
    const sort = sortOrder || 'relevance';
    if (sort === 'relevance') {
      results.sort((a, b) => (b._score || 0) - (a._score || 0));
    } else if (sort === 'newest_first' || sort === 'oldest_first') {
      const multiplier = sort === 'newest_first' ? -1 : 1;
      results.sort((a, b) => {
        const getDate = (r) => {
          if (r.type === 'article') return r.article.publishedAt || r.article.createdAt || '';
          if (r.type === 'video') return r.video.publishedAt || '';
          if (r.type === 'event') return r.event.startDate || '';
          return '';
        };
        const da = getDate(a);
        const db = getDate(b);
        return multiplier * db.localeCompare(da);
      });
    } else if (sort === 'most_viewed') {
      results.sort((a, b) => {
        const getViews = (r) => {
          if (r.type === 'article') return r.article.viewCount || 0;
          if (r.type === 'video') return r.video.viewCount || 0;
          return 0;
        };
        return getViews(b) - getViews(a);
      });
    }

    const totalCount = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const pagedResults = results.slice(start, end).map((r) => {
      const { _score, ...rest } = r;
      return rest;
    });

    return {
      query: q,
      sortOrder: sort,
      contentTypes: types,
      page: p,
      pageSize: ps,
      totalCount,
      results: pagedResults
    };
  }

  // 9. getArticleFilterOptions
  getArticleFilterOptions() {
    return {
      categories: [
        { value: 'features', label: 'Features' },
        { value: 'news', label: 'News' },
        { value: 'interview', label: 'Interviews' },
        { value: 'history', label: 'History' },
        { value: 'analysis', label: 'Analysis' },
        { value: 'opinion', label: 'Opinion' }
      ],
      readingTimeOptions: [
        { value: 'under_5', label: 'Under 5 minutes', minMinutes: 0, maxMinutes: 4 },
        { value: '5_to_10', label: '5-10 minutes', minMinutes: 5, maxMinutes: 10 },
        { value: '10_plus', label: '10+ minutes', minMinutes: 10, maxMinutes: null }
      ],
      sortOptions: [
        { value: 'newest_first', label: 'Newest first' },
        { value: 'oldest_first', label: 'Oldest first' },
        { value: 'most_viewed', label: 'Most viewed' }
      ]
    };
  }

  // 10. getArticlesList
  getArticlesList(filters, sortOrder = 'newest_first', page = 1, pageSize = 20) {
    const f = filters || {};
    const articles = this._getFromStorage('articles', []);

    let list = articles.filter((a) => {
      if (f.category && a.category !== f.category) return false;

      if (f.fromDateInclusive) {
        const from = f.fromDateInclusive;
        const pub = a.publishedAt || a.createdAt || '';
        if (pub < from) return false;
      }

      if (f.toDateInclusive) {
        const to = f.toDateInclusive;
        const pub = a.publishedAt || a.createdAt || '';
        if (pub > to) return false;
      }

      if (typeof f.minReadingTimeMinutes === 'number') {
        if ((a.readingTimeMinutes || 0) < f.minReadingTimeMinutes) return false;
      }

      if (typeof f.maxReadingTimeMinutes === 'number') {
        if ((a.readingTimeMinutes || 0) > f.maxReadingTimeMinutes) return false;
      }

      if (typeof f.isFeature === 'boolean') {
        if (!!a.isFeature !== f.isFeature) return false;
      }

      if (f.tag) {
        const tags = a.tags || [];
        const hasTag = tags.some((t) => this._stringIncludes(t, f.tag));
        if (!hasTag) return false;
      }

      if (f.query) {
        const text = [a.title, a.summary, a.content].join(' ');
        if (!this._stringIncludes(text, f.query)) return false;
      }

      return true;
    });

    const sort = sortOrder || 'newest_first';
    if (sort === 'newest_first') {
      list.sort((a, b) => {
        const da = a.publishedAt || a.createdAt || '';
        const db = b.publishedAt || b.createdAt || '';
        return db.localeCompare(da);
      });
    } else if (sort === 'oldest_first') {
      list.sort((a, b) => {
        const da = a.publishedAt || a.createdAt || '';
        const db = b.publishedAt || b.createdAt || '';
        return da.localeCompare(db);
      });
    } else if (sort === 'most_viewed') {
      list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const totalCount = list.length;
    const start = (p - 1) * ps;
    const items = list.slice(start, start + ps);

    return {
      items,
      page: p,
      pageSize: ps,
      totalCount,
      hasMore: start + ps < totalCount
    };
  }

  // 11. getArticleDetail
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    const readingList = this._getOrCreateReadingList();
    const isBookmarked = readingList.some((i) => i.articleId === articleId);

    const queue = this._getOrCreateReadingQueue();
    const inReadingQueue = queue.some((i) => i.articleId === articleId);

    return {
      article,
      isBookmarked,
      inReadingQueue
    };
  }

  // 12. getArticleRelatedContent
  getArticleRelatedContent(articleId) {
    const articles = this._getFromStorage('articles', []);
    const videos = this._getFromStorage('videos', []);
    const base = articles.find((a) => a.id === articleId);

    if (!base) {
      return { relatedArticles: [], relatedVideos: [] };
    }

    const baseTags = base.tags || [];
    const baseCategory = base.category;

    const relatedArticles = articles
      .filter((a) => a.id !== base.id)
      .map((a) => {
        const tags = a.tags || [];
        const sharedTags = tags.filter((t) => baseTags.includes(t));
        let score = sharedTags.length;
        if (a.category === baseCategory) score += 1;
        return { article: a, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.article);

    const normalizedTags = baseTags.map((t) => t.toLowerCase());
    const relatedVideos = videos
      .map((v) => {
        const score = this._computeSearchScore(
          [v.title, v.description],
          base.title || (normalizedTags[0] || '')
        );
        return { video: v, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.video);

    return { relatedArticles, relatedVideos };
  }

  // 13. bookmarkArticle
  bookmarkArticle(articleId) {
    const readingList = this._getOrCreateReadingList();
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    let existing = readingList.find((i) => i.articleId === articleId);
    let alreadyBookmarked = false;

    if (existing) {
      alreadyBookmarked = true;
    } else {
      existing = {
        id: this._generateId('rli'),
        articleId,
        addedAt: this._nowIso()
      };
      readingList.push(existing);
      this._saveToStorage('reading_list_items', readingList);
    }

    return {
      readingListItem: existing,
      article,
      alreadyBookmarked
    };
  }

  // 14. getReadingList
  getReadingList() {
    const readingList = this._getOrCreateReadingList();
    const articles = this._getFromStorage('articles', []);

    return readingList.map((item) => ({
      readingListItem: item,
      article: articles.find((a) => a.id === item.articleId) || null
    }));
  }

  // 15. addArticleToReadingQueue
  addArticleToReadingQueue(articleId) {
    let queue = this._getOrCreateReadingQueue();
    const existing = queue.find((i) => i.articleId === articleId);
    if (existing) {
      return existing;
    }

    const maxPos = queue.reduce((max, i) => (i.position && i.position > max ? i.position : max), 0);
    const item = {
      id: this._generateId('rqi'),
      articleId,
      addedAt: this._nowIso(),
      position: maxPos + 1
    };
    queue.push(item);
    queue = this._resequenceQueuePositions(queue, 'position');
    this._saveToStorage('reading_queue_items', queue);
    return item;
  }

  // 16. getReadingQueue
  getReadingQueue() {
    let queue = this._getOrCreateReadingQueue();
    const articles = this._getFromStorage('articles', []);

    queue.sort((a, b) => a.position - b.position);

    // Instrumentation for task completion tracking (task_7)
    try {
      localStorage.setItem('task7_openedReadingQueue', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return queue.map((item) => ({
      queueItem: item,
      article: articles.find((a) => a.id === item.articleId) || null
    }));
  }

  // 17. reorderReadingQueue
  reorderReadingQueue(newOrder) {
    let queue = this._getOrCreateReadingQueue();
    const idToItem = {};
    queue.forEach((i) => {
      idToItem[i.id] = i;
    });

    const reordered = [];
    if (Array.isArray(newOrder)) {
      newOrder.forEach((id) => {
        const item = idToItem[id];
        if (item) {
          reordered.push(item);
          delete idToItem[id];
        }
      });
    }

    // Append any items not mentioned in newOrder, preserving their original relative order
    Object.keys(idToItem).forEach((id) => {
      reordered.push(idToItem[id]);
    });

    // Assign new sequential positions based on the reordered array order
    for (let i = 0; i < reordered.length; i++) {
      reordered[i].position = i + 1;
    }
    const finalQueue = reordered;
    this._saveToStorage('reading_queue_items', finalQueue);
    return finalQueue;
  }

  // 18. getCarFilterOptions
  getCarFilterOptions() {
    const cars = this._getFromStorage('cars', []);
    let minHp = null;
    let maxHp = null;
    cars.forEach((c) => {
      if (typeof c.horsepower === 'number') {
        if (minHp === null || c.horsepower < minHp) minHp = c.horsepower;
        if (maxHp === null || c.horsepower > maxHp) maxHp = c.horsepower;
      }
    });

    return {
      horsepowerRange: {
        min: minHp === null ? 0 : minHp,
        max: maxHp === null ? 0 : maxHp
      },
      seriesOptions: [
        { value: 'wrc', label: 'WRC' },
        { value: 'wrc2', label: 'WRC2' },
        { value: 'erc', label: 'ERC' },
        { value: 'group_b', label: 'Group B' },
        { value: 'group_a', label: 'Group A' },
        { value: 'national', label: 'National' },
        { value: 'other', label: 'Other' }
      ],
      sortOptions: [
        { value: 'name_asc', label: 'Name A-Z' },
        { value: 'top_speed_desc', label: 'Top speed - High to Low' },
        { value: 'horsepower_desc', label: 'Horsepower - High to Low' },
        { value: 'horsepower_asc', label: 'Horsepower - Low to High' }
      ]
    };
  }

  // 19. getCarsList
  getCarsList(filters, sortOrder = 'name_asc', page = 1, pageSize = 20) {
    const f = filters || {};
    const cars = this._getFromStorage('cars', []);

    let list = cars.filter((c) => {
      if (typeof f.minHorsepower === 'number') {
        if ((c.horsepower || 0) < f.minHorsepower) return false;
      }
      if (typeof f.maxHorsepower === 'number') {
        if ((c.horsepower || 0) > f.maxHorsepower) return false;
      }
      if (f.series && c.series !== f.series) return false;
      if (f.query) {
        const text = [c.name, c.manufacturer, c.model, c.description].join(' ');
        if (!this._stringIncludes(text, f.query)) return false;
      }
      return true;
    });

    const sort = sortOrder || 'name_asc';
    if (sort === 'name_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort === 'top_speed_desc') {
      list.sort((a, b) => (b.topSpeedKph || 0) - (a.topSpeedKph || 0));
    } else if (sort === 'horsepower_desc') {
      list.sort((a, b) => (b.horsepower || 0) - (a.horsepower || 0));
    } else if (sort === 'horsepower_asc') {
      list.sort((a, b) => (a.horsepower || 0) - (b.horsepower || 0));
    }

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const totalCount = list.length;
    const start = (p - 1) * ps;
    const items = list.slice(start, start + ps);

    return {
      items,
      page: p,
      pageSize: ps,
      totalCount,
      hasMore: start + ps < totalCount
    };
  }

  // 20. getCarDetail
  getCarDetail(carId) {
    const cars = this._getFromStorage('cars', []);
    const car = cars.find((c) => c.id === carId) || null;

    if (car) {
      this._updateRecentlyViewedCars(carId);
    }

    const { carFavs } = this._getOrCreateFavoritesStore();
    const isFavorite = carFavs.some((f) => f.carId === carId);

    const views = this._getFromStorage('recently_viewed_cars', []);
    const recentlyViewedCars = views
      .slice()
      .sort((a, b) => (b.viewedAt || '').localeCompare(a.viewedAt || ''))
      .map((v) => cars.find((c) => c.id === v.carId))
      .filter((c) => !!c);

    return {
      car,
      isFavorite,
      recentlyViewedCars
    };
  }

  // 21. setCarFavoriteStatus
  setCarFavoriteStatus(carId, isFavorite) {
    let { carFavs } = this._getOrCreateFavoritesStore();

    let favoriteRecord = null;
    if (isFavorite) {
      favoriteRecord = carFavs.find((f) => f.carId === carId) || null;
      if (!favoriteRecord) {
        favoriteRecord = {
          id: this._generateId('cfav'),
          carId,
          addedAt: this._nowIso()
        };
        carFavs.push(favoriteRecord);
      }
    } else {
      carFavs = carFavs.filter((f) => f.carId !== carId);
      favoriteRecord = null;
    }

    this._saveToStorage('car_favorites', carFavs);

    return {
      isFavorite: !!isFavorite,
      favoriteRecord
    };
  }

  // 22. getFavoriteCars
  getFavoriteCars() {
    const { carFavs } = this._getOrCreateFavoritesStore();
    const cars = this._getFromStorage('cars', []);

    // Instrumentation for task completion tracking (task_2)
    try {
      localStorage.setItem('task2_openedFavorites', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return carFavs
      .map((f) => cars.find((c) => c.id === f.carId))
      .filter((c) => !!c);
  }

  // 23. getRecentlyViewedCars
  getRecentlyViewedCars() {
    const cars = this._getFromStorage('cars', []);
    const views = this._getFromStorage('recently_viewed_cars', []);
    return views
      .slice()
      .sort((a, b) => (b.viewedAt || '').localeCompare(a.viewedAt || ''))
      .map((v) => cars.find((c) => c.id === v.carId))
      .filter((c) => !!c);
  }

  // 24. getRelatedCars
  getRelatedCars(carId) {
    const cars = this._getFromStorage('cars', []);
    const base = cars.find((c) => c.id === carId);
    if (!base) return [];
    return cars.filter((c) => c.id !== base.id && c.series === base.series);
  }

  // 25. getEventFilterOptions
  getEventFilterOptions() {
    return {
      surfaceOptions: [
        { value: 'gravel', label: 'Gravel' },
        { value: 'tarmac', label: 'Tarmac' },
        { value: 'snow_ice', label: 'Snow & Ice' },
        { value: 'mixed', label: 'Mixed' }
      ],
      seriesOptions: [
        { value: 'wrc', label: 'WRC' },
        { value: 'wrc2', label: 'WRC2' },
        { value: 'erc', label: 'ERC' },
        { value: 'national', label: 'National' },
        { value: 'historic', label: 'Historic' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  // 26. getEventsList
  getEventsList(filters, sortOrder = 'start_date_asc', page = 1, pageSize = 50) {
    const f = filters || {};
    const events = this._getFromStorage('events', []);

    let list = events.filter((e) => {
      if (f.startDateFromInclusive) {
        const sd = e.startDate || '';
        if (sd < f.startDateFromInclusive) return false;
      }
      if (f.surface && e.surface !== f.surface) return false;
      if (f.series && e.series !== f.series) return false;
      if (f.status && e.status !== f.status) return false;
      return true;
    });

    const sort = sortOrder || 'start_date_asc';
    if (sort === 'start_date_asc') {
      list.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    } else if (sort === 'start_date_desc') {
      list.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    }

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 50;
    const totalCount = list.length;
    const start = (p - 1) * ps;
    const items = list.slice(start, start + ps);

    return {
      items,
      page: p,
      pageSize: ps,
      totalCount,
      hasMore: start + ps < totalCount
    };
  }

  // 27. getEventDetail
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const stages = this._getFromStorage('stages', []);
    const { followedEvents } = this._getOrCreateFollowStore();

    const event = events.find((e) => e.id === eventId) || null;
    const isFollowed = followedEvents.some((f) => f.eventId === eventId);
    const eventStages = stages.filter((s) => s.eventId === eventId);

    return {
      event,
      isFollowed,
      stages: eventStages
    };
  }

  // 28. setEventFollowStatus
  setEventFollowStatus(eventId, isFollowed) {
    let { followedEvents } = this._getOrCreateFollowStore();

    let followRecord = null;
    if (isFollowed) {
      followRecord = followedEvents.find((f) => f.eventId === eventId) || null;
      if (!followRecord) {
        followRecord = {
          id: this._generateId('fev'),
          eventId,
          followedAt: this._nowIso()
        };
        followedEvents.push(followRecord);
      }
    } else {
      followedEvents = followedEvents.filter((f) => f.eventId !== eventId);
      followRecord = null;
    }

    this._saveToStorage('followed_events', followedEvents);

    return {
      isFollowed: !!isFollowed,
      followRecord
    };
  }

  // 29. getFollowedEvents
  getFollowedEvents() {
    const { followedEvents } = this._getOrCreateFollowStore();
    const events = this._getFromStorage('events', []);

    // Instrumentation for task completion tracking (task_3)
    try {
      localStorage.setItem('task3_openedFollowedEvents', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return followedEvents
      .map((f) => events.find((e) => e.id === f.eventId))
      .filter((e) => !!e);
  }

  // 30. getRelatedEvents
  getRelatedEvents(eventId) {
    const events = this._getFromStorage('events', []);
    const base = events.find((e) => e.id === eventId);
    if (!base) return [];
    return events.filter((e) => e.id !== base.id && e.series === base.series);
  }

  // 31. getOnboardVideoFilterOptions
  getOnboardVideoFilterOptions() {
    const videos = this._getFromStorage('videos', []);
    const seasons = this._unique(
      videos
        .filter((v) => typeof v.season === 'number')
        .map((v) => v.season)
    ).sort((a, b) => a - b);

    return {
      seasonOptions: seasons,
      durationOptions: [
        {
          value: 'under_4',
          label: 'Under 4 minutes',
          minSeconds: 0,
          maxSeconds: 239
        },
        {
          value: '4_to_8',
          label: '4 to 8 minutes',
          minSeconds: 240,
          maxSeconds: 480
        },
        {
          value: 'over_8',
          label: 'Over 8 minutes',
          minSeconds: 481,
          maxSeconds: null
        }
      ],
      sortOptions: [
        { value: 'most_viewed', label: 'Most viewed' },
        { value: 'newest_first', label: 'Newest first' },
        { value: 'oldest_first', label: 'Oldest first' },
        { value: 'longest_first', label: 'Longest duration' }
      ]
    };
  }

  // 32. getOnboardVideosList
  getOnboardVideosList(filters, sortOrder = 'most_viewed', page = 1, pageSize = 24) {
    const f = filters || {};
    const videos = this._getFromStorage('videos', []);

    let list = videos.filter((v) => {
      if (v.mediaType !== 'onboard_videos') return false;
      if (typeof f.season === 'number' && v.season !== f.season) return false;
      if (typeof f.minDurationSeconds === 'number') {
        if ((v.durationSeconds || 0) < f.minDurationSeconds) return false;
      }
      if (typeof f.maxDurationSeconds === 'number') {
        if ((v.durationSeconds || 0) > f.maxDurationSeconds) return false;
      }
      return true;
    });

    const sort = sortOrder || 'most_viewed';
    if (sort === 'most_viewed') {
      list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    } else if (sort === 'newest_first') {
      list.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    } else if (sort === 'oldest_first') {
      list.sort((a, b) => (a.publishedAt || '').localeCompare(b.publishedAt || ''));
    } else if (sort === 'longest_first') {
      list.sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0));
    }

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 24;
    const totalCount = list.length;
    const start = (p - 1) * ps;
    const items = list.slice(start, start + ps);

    return {
      items,
      page: p,
      pageSize: ps,
      totalCount,
      hasMore: start + ps < totalCount
    };
  }

  // 33. getVideoDetail
  getVideoDetail(videoId) {
    const videos = this._getFromStorage('videos', []);
    const { playlists, playlistItems } = this._getOrCreatePlaylistsStore();
    const video = videos.find((v) => v.id === videoId) || null;

    const playlistsContainingVideo = playlists.filter((pl) =>
      playlistItems.some((pi) => pi.playlistId === pl.id && pi.videoId === videoId)
    );

    return {
      video,
      playlistsContainingVideo
    };
  }

  // 34. createPlaylist
  createPlaylist(name, description) {
    const { playlists, playlistItems } = this._getOrCreatePlaylistsStore();
    const now = this._nowIso();
    const playlist = {
      id: this._generateId('pl'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);
    // playlistItems unchanged but saved to ensure structure
    this._saveToStorage('playlist_items', playlistItems);
    return playlist;
  }

  // 35. getPlaylists
  getPlaylists() {
    const { playlists } = this._getOrCreatePlaylistsStore();

    // Instrumentation for task completion tracking (task_4)
    try {
      localStorage.setItem('task4_openedPlaylistsList', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return playlists;
  }

  // 36. getPlaylistDetail
  getPlaylistDetail(playlistId) {
    const { playlists, playlistItems } = this._getOrCreatePlaylistsStore();
    const videos = this._getFromStorage('videos', []);
    const playlist = playlists.find((p) => p.id === playlistId) || null;

    const itemsRaw = playlistItems
      .filter((pi) => pi.playlistId === playlistId)
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const items = itemsRaw.map((pi) => ({
      playlistItem: pi,
      video: videos.find((v) => v.id === pi.videoId) || null
    }));

    // Instrumentation for task completion tracking (task_4)
    try {
      if (playlist && playlist.name === '2019 Long Onboards') {
        localStorage.setItem('task4_openedPlaylistId', String(playlistId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      playlist,
      items
    };
  }

  // 37. addVideoToPlaylist
  addVideoToPlaylist(videoId, playlistId) {
    let { playlists, playlistItems } = this._getOrCreatePlaylistsStore();

    // Ensure playlist exists
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      // Silently create? Requirement does not specify; safer to just create minimal playlist
      const now = this._nowIso();
      const newPl = {
        id: playlistId,
        name: 'Untitled Playlist',
        description: '',
        createdAt: now,
        updatedAt: now
      };
      playlists.push(newPl);
    }

    let item = playlistItems.find((pi) => pi.playlistId === playlistId && pi.videoId === videoId);
    if (item) {
      return item;
    }

    const maxPos = playlistItems
      .filter((pi) => pi.playlistId === playlistId)
      .reduce((max, pi) => (pi.position && pi.position > max ? pi.position : max), 0);

    item = {
      id: this._generateId('pli'),
      playlistId,
      videoId,
      position: maxPos + 1,
      addedAt: this._nowIso()
    };
    playlistItems.push(item);

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_items', playlistItems);

    return item;
  }

  // 38. removeVideoFromPlaylist
  removeVideoFromPlaylist(videoId, playlistId) {
    let { playlists, playlistItems } = this._getOrCreatePlaylistsStore();

    const beforeLen = playlistItems.length;
    playlistItems = playlistItems.filter(
      (pi) => !(pi.playlistId === playlistId && pi.videoId === videoId)
    );

    // Resequence positions for this playlist
    const perPlaylist = playlistItems.filter((pi) => pi.playlistId === playlistId);
    const resequenced = this._resequenceQueuePositions(perPlaylist, 'position');
    // Merge resequenced back into playlistItems
    const others = playlistItems.filter((pi) => pi.playlistId !== playlistId);
    playlistItems = others.concat(resequenced);

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_items', playlistItems);

    const afterLen = playlistItems.length;
    return { success: afterLen < beforeLen };
  }

  // 39. getVideoPlaylistsForVideo
  getVideoPlaylistsForVideo(videoId) {
    const { playlists, playlistItems } = this._getOrCreatePlaylistsStore();
    return playlists.map((pl) => ({
      playlist: pl,
      containsVideo: playlistItems.some(
        (pi) => pi.playlistId === pl.id && pi.videoId === videoId
      )
    }));
  }

  // 40. getStatsViewPreference
  getStatsViewPreference() {
    return this._getOrCreateStatsPreference();
  }

  // 41. updateStatsViewPreference
  updateStatsViewPreference(tab, metric, startSeason, endSeason, sortOrder) {
    const allowedTabs = ['drivers', 'teams', 'cars'];
    const allowedMetrics = ['podiums', 'wins', 'points'];
    const allowedSort = ['metric_high_to_low', 'metric_low_to_high', 'name_a_to_z'];

    const pref = this._getOrCreateStatsPreference();

    if (allowedTabs.includes(tab)) pref.tab = tab;
    if (allowedMetrics.includes(metric)) pref.metric = metric;
    if (typeof startSeason === 'number') pref.startSeason = startSeason;
    if (typeof endSeason === 'number') pref.endSeason = endSeason;
    if (allowedSort.includes(sortOrder)) pref.sortOrder = sortOrder;

    this._saveToStorage('stats_view_preferences', pref);
    return pref;
  }

  // 42. getDriverStatsTable
  getDriverStatsTable(metric, startSeason, endSeason, sortOrder) {
    const driverStats = this._getFromStorage('driver_season_stats', []);
    const drivers = this._getFromStorage('drivers', []);

    const start = typeof startSeason === 'number' ? startSeason : 0;
    const end = typeof endSeason === 'number' ? endSeason : 9999;

    const aggregatedByDriver = {};
    driverStats.forEach((row) => {
      if (row.seasonYear < start || row.seasonYear > end) return;
      const id = row.driverId;
      if (!aggregatedByDriver[id]) {
        aggregatedByDriver[id] = {
          driverId: id,
          totalPodiums: 0,
          totalWins: 0,
          totalPoints: 0
        };
      }
      aggregatedByDriver[id].totalPodiums += row.podiums || 0;
      aggregatedByDriver[id].totalWins += row.wins || 0;
      aggregatedByDriver[id].totalPoints += row.points || 0;
    });

    const rows = Object.values(aggregatedByDriver).map((agg) => {
      const driver = drivers.find((d) => d.id === agg.driverId) || null;
      return {
        driver,
        totalPodiums: agg.totalPodiums,
        totalWins: agg.totalWins,
        totalPoints: agg.totalPoints
      };
    });

    const sort = sortOrder || 'metric_high_to_low';
    const metricKey = metric === 'wins' ? 'totalWins' : metric === 'points' ? 'totalPoints' : 'totalPodiums';

    if (sort === 'metric_high_to_low') {
      rows.sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0));
    } else if (sort === 'metric_low_to_high') {
      rows.sort((a, b) => (a[metricKey] || 0) - (b[metricKey] || 0));
    } else if (sort === 'name_a_to_z') {
      rows.sort((a, b) => {
        const na = (a.driver && (a.driver.fullName || a.driver.lastName || '')) || '';
        const nb = (b.driver && (b.driver.fullName || b.driver.lastName || '')) || '';
        return na.localeCompare(nb);
      });
    }

    return rows;
  }

  // 43. getDriverProfile
  getDriverProfile(driverId) {
    const drivers = this._getFromStorage('drivers', []);
    const stats = this._getFromStorage('driver_season_stats', []);
    const { followedDrivers } = this._getOrCreateFollowStore();

    const driver = drivers.find((d) => d.id === driverId) || null;
    const careerStats = stats.filter((s) => s.driverId === driverId);
    const isFollowed = followedDrivers.some((f) => f.driverId === driverId);

    return {
      driver,
      careerStats,
      isFollowed
    };
  }

  // 44. setDriverFollowStatus
  setDriverFollowStatus(driverId, isFollowed) {
    let { followedDrivers } = this._getOrCreateFollowStore();

    let followRecord = null;
    if (isFollowed) {
      followRecord = followedDrivers.find((f) => f.driverId === driverId) || null;
      if (!followRecord) {
        followRecord = {
          id: this._generateId('fdr'),
          driverId,
          followedAt: this._nowIso()
        };
        followedDrivers.push(followRecord);
      }
    } else {
      followedDrivers = followedDrivers.filter((f) => f.driverId !== driverId);
      followRecord = null;
    }

    this._saveToStorage('followed_drivers', followedDrivers);

    return {
      isFollowed: !!isFollowed,
      followRecord
    };
  }

  // 45. getFollowedDrivers
  getFollowedDrivers() {
    const { followedDrivers } = this._getOrCreateFollowStore();
    const drivers = this._getFromStorage('drivers', []);

    // Instrumentation for task completion tracking (task_6)
    try {
      localStorage.setItem('task6_openedFollowedDrivers', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return followedDrivers
      .map((f) => drivers.find((d) => d.id === f.driverId))
      .filter((d) => !!d);
  }

  // 46. getStageFilterOptions
  getStageFilterOptions() {
    const stages = this._getFromStorage('stages', []);
    const countries = this._unique(
      stages
        .map((s) => s.country)
        .filter((c) => !!c)
    );

    return {
      countryOptions: countries,
      surfaceOptions: [
        { value: 'gravel', label: 'Gravel' },
        { value: 'tarmac', label: 'Tarmac' },
        { value: 'snow_ice', label: 'Snow & Ice' },
        { value: 'mixed', label: 'Mixed' }
      ],
      lengthRange: {
        min: stages.reduce(
          (min, s) =>
            typeof s.lengthKm === 'number' && (min === null || s.lengthKm < min)
              ? s.lengthKm
              : min,
          null
        ) || 0,
        max: stages.reduce(
          (max, s) =>
            typeof s.lengthKm === 'number' && (max === null || s.lengthKm > max)
              ? s.lengthKm
              : max,
          null
        ) || 0
      },
      sortOptions: [
        { value: 'length_desc', label: 'Length - Long to Short' },
        { value: 'length_asc', label: 'Length - Short to Long' },
        { value: 'name_asc', label: 'Name A-Z' }
      ]
    };
  }

  // 47. getStagesList
  getStagesList(filters, sortOrder = 'length_desc', page = 1, pageSize = 50) {
    const f = filters || {};
    const stages = this._getFromStorage('stages', []);

    let list = stages.filter((s) => {
      if (f.country && s.country !== f.country) return false;
      if (f.surface && s.surface !== f.surface) return false;
      if (typeof f.minLengthKm === 'number') {
        if ((s.lengthKm || 0) < f.minLengthKm) return false;
      }
      if (typeof f.maxLengthKm === 'number') {
        if ((s.lengthKm || 0) > f.maxLengthKm) return false;
      }
      return true;
    });

    const sort = sortOrder || 'length_desc';
    if (sort === 'length_desc') {
      list.sort((a, b) => (b.lengthKm || 0) - (a.lengthKm || 0));
    } else if (sort === 'length_asc') {
      list.sort((a, b) => (a.lengthKm || 0) - (b.lengthKm || 0));
    } else if (sort === 'name_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 50;
    const totalCount = list.length;
    const start = (p - 1) * ps;
    const items = list.slice(start, start + ps);

    return {
      items,
      page: p,
      pageSize: ps,
      totalCount,
      hasMore: start + ps < totalCount
    };
  }

  // 48. getStageDetail
  getStageDetail(stageId) {
    const stages = this._getFromStorage('stages', []);
    const events = this._getFromStorage('events', []);
    const { stageFavs } = this._getOrCreateFavoritesStore();

    const stage = stages.find((s) => s.id === stageId) || null;
    const isFavorite = stageFavs.some((f) => f.stageId === stageId);
    const event = stage && stage.eventId ? events.find((e) => e.id === stage.eventId) || null : null;

    return {
      stage,
      isFavorite,
      event
    };
  }

  // 49. setStageFavoriteStatus
  setStageFavoriteStatus(stageId, isFavorite) {
    let { stageFavs } = this._getOrCreateFavoritesStore();

    let favoriteRecord = null;
    if (isFavorite) {
      favoriteRecord = stageFavs.find((f) => f.stageId === stageId) || null;
      if (!favoriteRecord) {
        favoriteRecord = {
          id: this._generateId('sfav'),
          stageId,
          addedAt: this._nowIso()
        };
        stageFavs.push(favoriteRecord);
      }
    } else {
      stageFavs = stageFavs.filter((f) => f.stageId !== stageId);
      favoriteRecord = null;
    }

    this._saveToStorage('stage_favorites', stageFavs);

    return {
      isFavorite: !!isFavorite,
      favoriteRecord
    };
  }

  // 50. getFavoriteStages
  getFavoriteStages() {
    const { stageFavs } = this._getOrCreateFavoritesStore();
    const stages = this._getFromStorage('stages', []);

    // Instrumentation for task completion tracking (task_8)
    try {
      localStorage.setItem('task8_openedFavoriteStages', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return stageFavs
      .map((f) => stages.find((s) => s.id === f.stageId))
      .filter((s) => !!s);
  }

  // 51. getRelatedStages
  getRelatedStages(stageId) {
    const stages = this._getFromStorage('stages', []);
    const base = stages.find((s) => s.id === stageId);
    if (!base) return [];

    let related = stages.filter((s) => s.id !== base.id && s.eventId && s.eventId === base.eventId);
    if (!related.length) {
      related = stages.filter(
        (s) =>
          s.id !== base.id &&
          s.country === base.country &&
          s.surface === base.surface
      );
    }
    return related;
  }

  // 52. getProfileLibraryOverview
  getProfileLibraryOverview() {
    const profile = this._getOrCreateProfileState();
    const readingList = this._getOrCreateReadingList();
    const readingQueue = this._getOrCreateReadingQueue();
    const { carFavs, stageFavs } = this._getOrCreateFavoritesStore();
    const { followedEvents, followedDrivers } = this._getOrCreateFollowStore();
    const { playlists } = this._getOrCreatePlaylistsStore();

    return {
      profile,
      readingListCount: readingList.length,
      readingQueueCount: readingQueue.length,
      favoriteCarsCount: carFavs.length,
      favoriteStagesCount: stageFavs.length,
      followedEventsCount: followedEvents.length,
      followedDriversCount: followedDrivers.length,
      playlistsCount: playlists.length
    };
  }

  // 53. getAskHistorianFormConfig
  getAskHistorianFormConfig() {
    return {
      topics: [
        { value: 'group_b_era', label: 'Group B era' },
        { value: 'early_years', label: 'Early years' },
        { value: 'modern_wrc', label: 'Modern WRC' },
        { value: 'drivers', label: 'Drivers' },
        { value: 'cars_technology', label: 'Cars & Technology' },
        { value: 'events_history', label: 'Events & History' },
        { value: 'other', label: 'Other' }
      ],
      preferredReplyFormats: [
        { value: 'article_suggestion', label: 'Article suggestion' },
        { value: 'short_answer', label: 'Short answer' },
        { value: 'video_recommendation', label: 'Video recommendation' },
        { value: 'link_collection', label: 'Link collection' }
      ],
      minQuestionWordCount: 40
    };
  }

  // 54. submitAskHistorianQuestion
  submitAskHistorianQuestion(
    topic,
    subject,
    questionText,
    preferredReplyFormat,
    nickname
  ) {
    const { valid, errors } = this._validateAskHistorianQuestion(
      topic,
      subject,
      questionText,
      preferredReplyFormat
    );

    if (!valid) {
      // For this business-logic layer, throw an Error to signal validation failures
      throw new Error('Ask a Historian validation failed: ' + JSON.stringify(errors));
    }

    const questions = this._getFromStorage('ask_historian_questions', []);
    const question = {
      id: this._generateId('ahq'),
      topic,
      subject,
      questionText,
      preferredReplyFormat,
      nickname: nickname || null,
      submittedAt: this._nowIso(),
      status: 'submitted'
    };
    questions.push(question);
    this._saveToStorage('ask_historian_questions', questions);
    return question;
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