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
    const keys = [
      'articles',
      'comments',
      'album_reviews',
      'review_bookmark_lists',
      'songs',
      'playlists',
      'events',
      'saved_event_lists',
      'devotional_collections',
      'interviews',
      'favorite_interview_lists',
      'podcast_episodes',
      'listen_later_queues',
      'reading_lists',
      'newsletter_subscriptions',
      'newsletter_interests',
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDateToMs(value) {
    if (!value) return NaN;
    const d = new Date(value);
    const ms = d.getTime();
    return isNaN(ms) ? NaN : ms;
  }

  _compareByDateDesc(aDate, bDate) {
    const aMs = this._parseDateToMs(aDate) || 0;
    const bMs = this._parseDateToMs(bDate) || 0;
    return bMs - aMs;
  }

  _compareByDateAsc(aDate, bDate) {
    const aMs = this._parseDateToMs(aDate) || 0;
    const bMs = this._parseDateToMs(bDate) || 0;
    return aMs - bMs;
  }

  _matchesDateFilter(dateValue, preset, dateFrom, dateTo) {
    if (!dateValue) return false;
    const ms = this._parseDateToMs(dateValue);
    if (isNaN(ms)) return false;

    if (!preset || preset === 'all_time') return true;

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const dateObj = new Date(ms);

    if (preset === 'last_7_days') {
      return ms >= now - 7 * oneDayMs;
    }
    if (preset === 'last_30_days') {
      return ms >= now - 30 * oneDayMs;
    }
    if (preset === 'last_60_days') {
      return ms >= now - 60 * oneDayMs;
    }
    if (preset === 'last_90_days') {
      return ms >= now - 90 * oneDayMs;
    }
    if (preset === 'this_year') {
      const nowYear = new Date().getFullYear();
      return dateObj.getFullYear() === nowYear;
    }
    if (preset === 'custom') {
      let ok = true;
      if (dateFrom) {
        const fromMs = this._parseDateToMs(dateFrom);
        if (!isNaN(fromMs)) ok = ok && ms >= fromMs;
      }
      if (dateTo) {
        const toMs = this._parseDateToMs(dateTo);
        if (!isNaN(toMs)) ok = ok && ms <= toMs;
      }
      return ok;
    }

    return true;
  }

  _paginate(array, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : array.length;
    const start = (p - 1) * size;
    return array.slice(start, start + size);
  }

  // -------------------- Required private helpers --------------------

  _getOrCreateReadingList() {
    const key = 'reading_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) lists = [];
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('readinglist'),
        name: 'Reading List',
        createdAt: this._nowIso(),
        articleIds: []
      };
      lists.push(list);
      this._saveToStorage(key, lists);
    }
    if (!Array.isArray(list.articleIds)) list.articleIds = [];
    return list;
  }

  _getOrCreateReviewBookmarkList() {
    const key = 'review_bookmark_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) lists = [];
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('reviewbookmarklist'),
        name: 'Bookmarks',
        createdAt: this._nowIso(),
        reviewIds: []
      };
      lists.push(list);
      this._saveToStorage(key, lists);
    }
    if (!Array.isArray(list.reviewIds)) list.reviewIds = [];
    return list;
  }

  _getOrCreateSavedEventList() {
    const key = 'saved_event_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) lists = [];
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('savedeventlist'),
        name: 'My Events',
        createdAt: this._nowIso(),
        eventIds: []
      };
      lists.push(list);
      this._saveToStorage(key, lists);
    }
    if (!Array.isArray(list.eventIds)) list.eventIds = [];
    return list;
  }

  _getOrCreateFavoriteInterviewList() {
    const key = 'favorite_interview_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) lists = [];
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('favoriteinterviewlist'),
        name: 'Favorites',
        createdAt: this._nowIso(),
        interviewIds: []
      };
      lists.push(list);
      this._saveToStorage(key, lists);
    }
    if (!Array.isArray(list.interviewIds)) list.interviewIds = [];
    return list;
  }

  _getOrCreateListenLaterQueue() {
    const key = 'listen_later_queues';
    let queues = this._getFromStorage(key);
    if (!Array.isArray(queues)) queues = [];
    let queue = queues[0] || null;
    if (!queue) {
      queue = {
        id: this._generateId('listenlater'),
        name: 'Listen Later',
        createdAt: this._nowIso(),
        episodeIds: []
      };
      queues.push(queue);
      this._saveToStorage(key, queues);
    }
    if (!Array.isArray(queue.episodeIds)) queue.episodeIds = [];
    return queue;
  }

  _getOrCreatePlaylistById(playlistId) {
    let playlists = this._getFromStorage('playlists');
    if (!Array.isArray(playlists)) playlists = [];
    let playlist = playlists.find((p) => p.id === playlistId) || null;
    if (!playlist) {
      playlist = {
        id: playlistId || this._generateId('playlist'),
        name: 'Untitled Playlist',
        description: '',
        createdAt: this._nowIso(),
        updatedAt: this._nowIso(),
        trackIds: [],
        isAutoGenerated: false
      };
      playlists.push(playlist);
      this._saveToStorage('playlists', playlists);
    }
    if (!Array.isArray(playlist.trackIds)) playlist.trackIds = [];
    return playlist;
  }

  _getOrCreateDevotionalCollectionByName(name) {
    const key = 'devotional_collections';
    let collections = this._getFromStorage(key);
    if (!Array.isArray(collections)) collections = [];
    let collection = collections.find(
      (c) => typeof c.name === 'string' && c.name.toLowerCase() === String(name).toLowerCase()
    );
    if (!collection) {
      collection = {
        id: this._generateId('devocollection'),
        name: name,
        description: '',
        createdAt: this._nowIso(),
        articleIds: []
      };
      collections.push(collection);
      this._saveToStorage(key, collections);
    }
    if (!Array.isArray(collection.articleIds)) collection.articleIds = [];
    return collection;
  }

  // -------------------- Interface implementations --------------------

  // getHomePageContent
  getHomePageContent() {
    const articles = this._getFromStorage('articles');
    const albumReviews = this._getFromStorage('album_reviews');
    const interviews = this._getFromStorage('interviews');
    const songs = this._getFromStorage('songs');

    const newsArticles = articles.filter((a) => a.articleType === 'news');

    const featuredNews = newsArticles
      .filter((a) => a.isFeatured === true)
      .sort((a, b) => this._compareByDateDesc(a.publicationDate, b.publicationDate));

    const latestNews = newsArticles
      .slice()
      .sort((a, b) => this._compareByDateDesc(a.publicationDate, b.publicationDate));

    const topReviews = albumReviews
      .slice()
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));

    const trendingDevotionals = articles
      .filter((a) => a.articleType === 'devotional')
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));

    const featuredInterviews = interviews
      .slice()
      .sort((a, b) => this._compareByDateDesc(a.publishedDate, b.publishedDate));

    const popularSongs = songs
      .slice()
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));

    return {
      featuredNews,
      latestNews,
      topReviews,
      trendingDevotionals,
      featuredInterviews,
      popularSongs
    };
  }

  // getSearchFilterOptions
  getSearchFilterOptions() {
    return {
      contentTypes: [
        { value: 'news', label: 'News' },
        { value: 'article', label: 'Articles' },
        { value: 'devotional', label: 'Devotionals' },
        { value: 'interview', label: 'Interviews' },
        { value: 'podcast_episode', label: 'Podcast Episodes' },
        { value: 'event', label: 'Events' },
        { value: 'song', label: 'Songs' },
        { value: 'album_review', label: 'Album Reviews' }
      ],
      dateRanges: [
        { value: 'last_7_days', label: 'Last 7 days' },
        { value: 'last_30_days', label: 'Last 30 days' },
        { value: 'last_60_days', label: 'Last 60 days' },
        { value: 'last_90_days', label: 'Last 90 days' },
        { value: 'this_year', label: 'This year' },
        { value: 'all_time', label: 'All time' }
      ],
      sortOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'newest_first', label: 'Newest first' },
        { value: 'most_commented', label: 'Most commented' },
        { value: 'most_popular', label: 'Most popular' }
      ]
    };
  }

  // searchSiteContent(query, page, pageSize, filters, sort)
  searchSiteContent(query, page, pageSize, filters, sort) {
    const q = (query || '').trim().toLowerCase();
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const f = filters || {};

    const contentTypesFilter = Array.isArray(f.contentTypes) && f.contentTypes.length > 0 ? f.contentTypes : null;
    const articleTypesFilter = Array.isArray(f.articleTypes) && f.articleTypes.length > 0 ? f.articleTypes : null;
    const datePreset = f.dateRangePreset || null;
    const dateFrom = f.dateFrom || null;
    const dateTo = f.dateTo || null;

    const articles = this._getFromStorage('articles');
    const albumReviews = this._getFromStorage('album_reviews');
    const interviews = this._getFromStorage('interviews');
    const podcastEpisodes = this._getFromStorage('podcast_episodes');
    const events = this._getFromStorage('events');
    const songs = this._getFromStorage('songs');

    const results = [];

    const matchesQueryText = (text) => {
      if (!q) return true;
      if (!text) return false;
      return String(text).toLowerCase().indexOf(q) !== -1;
    };

    const includeType = (typeValue) => {
      if (!contentTypesFilter) return true;
      return contentTypesFilter.indexOf(typeValue) !== -1;
    };

    // Articles (news, devotional, article)
    if (!contentTypesFilter || ['news', 'article', 'devotional'].some((t) => includeType(t))) {
      articles.forEach((a) => {
        const articleType = a.articleType; // 'news' | 'devotional' | 'article'
        if (articleTypesFilter && articleTypesFilter.indexOf(articleType) === -1) return;
        if (contentTypesFilter && !includeType(articleType)) return;

        const textBlob = `${a.title || ''} ${(a.summary || '')} ${(a.body || '')}`;
        if (!matchesQueryText(textBlob)) return;
        if (!this._matchesDateFilter(a.publicationDate, datePreset, dateFrom, dateTo)) return;

        results.push({
          resultType: 'article',
          id: a.id,
          title: a.title,
          summary: a.summary || '',
          articleType: articleType,
          publishedDate: a.publicationDate,
          commentCount: a.commentCount || 0,
          popularityScore: a.popularityScore || 0,
          label: `[${articleType}] ${a.title}`
        });
      });
    }

    // Album reviews
    if (!contentTypesFilter || includeType('album_review')) {
      albumReviews.forEach((r) => {
        const textBlob = `${r.title || ''} ${(r.albumTitle || '')} ${(r.artistName || '')} ${(r.reviewBody || '')}`;
        if (!matchesQueryText(textBlob)) return;

        const mainDate = r.reviewDate || r.releaseDate;
        if (!this._matchesDateFilter(mainDate, datePreset, dateFrom, dateTo)) return;

        results.push({
          resultType: 'album_review',
          id: r.id,
          title: r.title,
          summary: r.reviewBody ? String(r.reviewBody).slice(0, 180) : '',
          articleType: null,
          publishedDate: mainDate,
          commentCount: 0,
          popularityScore: r.popularityScore || 0,
          label: `[Review] ${r.title}`
        });
      });
    }

    // Interviews
    if (!contentTypesFilter || includeType('interview')) {
      interviews.forEach((iv) => {
        const textBlob = `${iv.title || ''} ${(iv.artistName || '')} ${(iv.content || '')}`;
        if (!matchesQueryText(textBlob)) return;
        if (!this._matchesDateFilter(iv.publishedDate, datePreset, dateFrom, dateTo)) return;

        results.push({
          resultType: 'interview',
          id: iv.id,
          title: iv.title,
          summary: iv.content ? String(iv.content).slice(0, 180) : '',
          articleType: null,
          publishedDate: iv.publishedDate,
          commentCount: 0,
          popularityScore: iv.likeCount || 0,
          label: `[Interview] ${iv.title}`
        });
      });
    }

    // Podcast episodes
    if (!contentTypesFilter || includeType('podcast_episode')) {
      podcastEpisodes.forEach((ep) => {
        const textBlob = `${ep.title || ''} ${(ep.description || '')} ${(ep.showName || '')}`;
        if (!matchesQueryText(textBlob)) return;
        if (!this._matchesDateFilter(ep.publishedDate, datePreset, dateFrom, dateTo)) return;

        results.push({
          resultType: 'podcast_episode',
          id: ep.id,
          title: ep.title,
          summary: ep.description ? String(ep.description).slice(0, 180) : '',
          articleType: null,
          publishedDate: ep.publishedDate,
          commentCount: 0,
          popularityScore: ep.popularityScore || 0,
          label: `[Podcast] ${ep.title}`
        });
      });
    }

    // Events
    if (!contentTypesFilter || includeType('event')) {
      events.forEach((ev) => {
        const textBlob = `${ev.title || ''} ${(ev.description || '')} ${(ev.city || '')} ${(ev.state || '')}`;
        if (!matchesQueryText(textBlob)) return;
        if (!this._matchesDateFilter(ev.startDateTime, datePreset, dateFrom, dateTo)) return;

        results.push({
          resultType: 'event',
          id: ev.id,
          title: ev.title,
          summary: ev.description ? String(ev.description).slice(0, 180) : '',
          articleType: null,
          publishedDate: ev.startDateTime,
          commentCount: 0,
          popularityScore: 0,
          label: `[Event] ${ev.title}`
        });
      });
    }

    // Songs
    if (!contentTypesFilter || includeType('song')) {
      songs.forEach((s) => {
        const textBlob = `${s.title || ''} ${(s.artistName || '')} ${(s.albumTitle || '')}`;
        if (!matchesQueryText(textBlob)) return;
        if (!this._matchesDateFilter(s.releaseDate, datePreset, dateFrom, dateTo)) return;

        results.push({
          resultType: 'song',
          id: s.id,
          title: s.title,
          summary: s.albumTitle || '',
          articleType: null,
          publishedDate: s.releaseDate,
          commentCount: 0,
          popularityScore: s.popularityScore || 0,
          label: `[Song] ${s.title}`
        });
      });
    }

    const sortMode = sort || 'relevance';
    results.sort((a, b) => {
      if (sortMode === 'newest_first') {
        return this._compareByDateDesc(a.publishedDate, b.publishedDate);
      }
      if (sortMode === 'most_commented') {
        return (b.commentCount || 0) - (a.commentCount || 0);
      }
      if (sortMode === 'most_popular') {
        return (b.popularityScore || 0) - (a.popularityScore || 0);
      }
      // Simple relevance: prioritize title matches and newer content
      const aTitleMatch = q && a.title && a.title.toLowerCase().indexOf(q) !== -1 ? 1 : 0;
      const bTitleMatch = q && b.title && b.title.toLowerCase().indexOf(q) !== -1 ? 1 : 0;
      if (aTitleMatch !== bTitleMatch) return bTitleMatch - aTitleMatch;
      return this._compareByDateDesc(a.publishedDate, b.publishedDate);
    });

    const totalCount = results.length;
    const paged = this._paginate(results, p, size);

    return {
      items: paged,
      totalCount,
      page: p,
      pageSize: size
    };
  }

  // getAlbumReviewFilterOptions
  getAlbumReviewFilterOptions() {
    const reviews = this._getFromStorage('album_reviews');
    let minReleaseYear = null;
    let maxReleaseYear = null;
    const ratingSet = new Set();
    const genreSet = new Set();

    reviews.forEach((r) => {
      if (r.releaseDate) {
        const year = new Date(r.releaseDate).getFullYear();
        if (!isNaN(year)) {
          if (minReleaseYear === null || year < minReleaseYear) minReleaseYear = year;
          if (maxReleaseYear === null || year > maxReleaseYear) maxReleaseYear = year;
        }
      }
      if (typeof r.rating === 'number') {
        ratingSet.add(r.rating);
      }
      if (r.genre) genreSet.add(r.genre);
    });

    return {
      minReleaseYear,
      maxReleaseYear,
      ratingOptions: Array.from(ratingSet).sort((a, b) => a - b),
      genres: Array.from(genreSet).sort(),
      sortOptions: [
        { value: 'highest_rated', label: 'Highest rated' },
        { value: 'newest_first', label: 'Newest first' },
        { value: 'most_popular', label: 'Most popular' }
      ]
    };
  }

  // listAlbumReviews(page, pageSize, filters, sort)
  listAlbumReviews(page, pageSize, filters, sort) {
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const f = filters || {};

    let items = this._getFromStorage('album_reviews');

    items = items.filter((r) => {
      let ok = true;
      if (typeof f.minReleaseYear === 'number') {
        if (r.releaseDate) {
          const year = new Date(r.releaseDate).getFullYear();
          if (!isNaN(year)) ok = ok && year >= f.minReleaseYear;
        }
      }
      if (typeof f.maxReleaseYear === 'number') {
        if (r.releaseDate) {
          const year = new Date(r.releaseDate).getFullYear();
          if (!isNaN(year)) ok = ok && year <= f.maxReleaseYear;
        }
      }
      if (typeof f.minRating === 'number') {
        ok = ok && typeof r.rating === 'number' && r.rating >= f.minRating;
      }
      if (Array.isArray(f.genres) && f.genres.length > 0) {
        ok = ok && f.genres.indexOf(r.genre) !== -1;
      }
      if (f.artistName) {
        const needle = String(f.artistName).toLowerCase();
        ok = ok && r.artistName && r.artistName.toLowerCase().indexOf(needle) !== -1;
      }
      return ok;
    });

    const sortMode = sort || 'newest_first';
    items.sort((a, b) => {
      if (sortMode === 'highest_rated') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortMode === 'most_popular') {
        return (b.popularityScore || 0) - (a.popularityScore || 0);
      }
      // newest_first
      const aDate = a.reviewDate || a.releaseDate;
      const bDate = b.reviewDate || b.releaseDate;
      return this._compareByDateDesc(aDate, bDate);
    });

    const totalCount = items.length;
    const paged = this._paginate(items, p, size);

    return {
      items: paged,
      totalCount,
      page: p,
      pageSize: size
    };
  }

  // getAlbumReviewDetails(reviewId)
  getAlbumReviewDetails(reviewId) {
    const reviews = this._getFromStorage('album_reviews');
    const review = reviews.find((r) => r.id === reviewId) || null;
    const bookmarkList = this._getOrCreateReviewBookmarkList();
    const isBookmarked = bookmarkList.reviewIds.indexOf(reviewId) !== -1;
    return { review, isBookmarked };
  }

  // bookmarkAlbumReview(reviewId)
  bookmarkAlbumReview(reviewId) {
    const reviews = this._getFromStorage('album_reviews');
    const exists = reviews.some((r) => r.id === reviewId);
    const bookmarkList = this._getOrCreateReviewBookmarkList();
    let message = '';

    if (!exists) {
      message = 'Review not found.';
      return { success: false, isBookmarked: false, bookmarkList, message };
    }

    if (bookmarkList.reviewIds.indexOf(reviewId) === -1) {
      bookmarkList.reviewIds.push(reviewId);
      // persist
      let lists = this._getFromStorage('review_bookmark_lists');
      lists = lists.map((l) => (l.id === bookmarkList.id ? bookmarkList : l));
      this._saveToStorage('review_bookmark_lists', lists);
      message = 'Review bookmarked.';
    } else {
      message = 'Review already bookmarked.';
    }

    return { success: true, isBookmarked: true, bookmarkList, message };
  }

  // unbookmarkAlbumReview(reviewId)
  unbookmarkAlbumReview(reviewId) {
    const bookmarkList = this._getOrCreateReviewBookmarkList();
    const idx = bookmarkList.reviewIds.indexOf(reviewId);
    let message = '';
    let isBookmarked = true;

    if (idx !== -1) {
      bookmarkList.reviewIds.splice(idx, 1);
      let lists = this._getFromStorage('review_bookmark_lists');
      lists = lists.map((l) => (l.id === bookmarkList.id ? bookmarkList : l));
      this._saveToStorage('review_bookmark_lists', lists);
      message = 'Review removed from bookmarks.';
      isBookmarked = false;
    } else {
      message = 'Review was not bookmarked.';
      isBookmarked = false;
    }

    return { success: true, isBookmarked, bookmarkList, message };
  }

  // getAlbumReviewBookmarkStatus(reviewId)
  getAlbumReviewBookmarkStatus(reviewId) {
    const bookmarkList = this._getOrCreateReviewBookmarkList();
    const isBookmarked = bookmarkList.reviewIds.indexOf(reviewId) !== -1;
    return { isBookmarked };
  }

  // getReviewBookmarks()
  getReviewBookmarks() {
    const bookmarkList = this._getOrCreateReviewBookmarkList();
    const reviews = this._getFromStorage('album_reviews');
    const reviewMap = new Map(reviews.map((r) => [r.id, r]));
    const resolved = bookmarkList.reviewIds
      .map((id) => reviewMap.get(id))
      .filter((r) => !!r);

    return {
      bookmarkList,
      reviews: resolved
    };
  }

  // getSongFilterOptions()
  getSongFilterOptions() {
    const songs = this._getFromStorage('songs');
    const genreSet = new Set();
    let maxDurationSeconds = 0;
    songs.forEach((s) => {
      if (s.genre) genreSet.add(s.genre);
      if (typeof s.durationSeconds === 'number') {
        if (s.durationSeconds > maxDurationSeconds) maxDurationSeconds = s.durationSeconds;
      }
    });

    return {
      genres: Array.from(genreSet).sort(),
      maxDurationSeconds,
      sortOptions: [
        { value: 'most_popular', label: 'Most popular' },
        { value: 'newest_first', label: 'Newest first' },
        { value: 'shortest_first', label: 'Shortest first' }
      ]
    };
  }

  // listSongs(page, pageSize, filters, sort)
  listSongs(page, pageSize, filters, sort) {
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 50;
    const f = filters || {};

    let items = this._getFromStorage('songs');

    items = items.filter((s) => {
      let ok = true;
      if (Array.isArray(f.genres) && f.genres.length > 0) {
        ok = ok && f.genres.indexOf(s.genre) !== -1;
      }
      if (typeof f.maxDurationSeconds === 'number') {
        ok = ok && typeof s.durationSeconds === 'number' && s.durationSeconds <= f.maxDurationSeconds;
      }
      if (typeof f.minDurationSeconds === 'number') {
        ok = ok && typeof s.durationSeconds === 'number' && s.durationSeconds >= f.minDurationSeconds;
      }
      if (f.artistName) {
        const needle = String(f.artistName).toLowerCase();
        ok = ok && s.artistName && s.artistName.toLowerCase().indexOf(needle) !== -1;
      }
      return ok;
    });

    const sortMode = sort || 'most_popular';
    items.sort((a, b) => {
      if (sortMode === 'newest_first') {
        return this._compareByDateDesc(a.releaseDate, b.releaseDate);
      }
      if (sortMode === 'shortest_first') {
        return (a.durationSeconds || 0) - (b.durationSeconds || 0);
      }
      // most_popular
      return (b.popularityScore || 0) - (a.popularityScore || 0);
    });

    const totalCount = items.length;
    const paged = this._paginate(items, p, size);

    return { items: paged, totalCount, page: p, pageSize: size };
  }

  // createPlaylist(name, description)
  createPlaylist(name, description) {
    const playlists = this._getFromStorage('playlists');
    const now = this._nowIso();
    const playlist = {
      id: this._generateId('playlist'),
      name: name,
      description: description || '',
      createdAt: now,
      updatedAt: now,
      trackIds: [],
      isAutoGenerated: false
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);
    return { playlist, message: 'Playlist created.' };
  }

  // renamePlaylist(playlistId, newName)
  renamePlaylist(playlistId, newName) {
    let playlists = this._getFromStorage('playlists');
    let playlist = playlists.find((p) => p.id === playlistId) || null;
    if (!playlist) {
      return { playlist: null, message: 'Playlist not found.' };
    }
    playlist.name = newName;
    playlist.updatedAt = this._nowIso();
    playlists = playlists.map((p) => (p.id === playlist.id ? playlist : p));
    this._saveToStorage('playlists', playlists);
    return { playlist, message: 'Playlist renamed.' };
  }

  // deletePlaylist(playlistId)
  deletePlaylist(playlistId) {
    let playlists = this._getFromStorage('playlists');
    const before = playlists.length;
    playlists = playlists.filter((p) => p.id !== playlistId);
    const after = playlists.length;
    this._saveToStorage('playlists', playlists);
    const success = after < before;
    return { success, message: success ? 'Playlist deleted.' : 'Playlist not found.' };
  }

  // getPlaylistsOverview()
  getPlaylistsOverview() {
    return this._getFromStorage('playlists');
  }

  // getPlaylistDetails(playlistId)
  getPlaylistDetails(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find((p) => p.id === playlistId) || null;
    const songs = this._getFromStorage('songs');
    const songMap = new Map(songs.map((s) => [s.id, s]));
    let tracks = [];
    if (playlist && Array.isArray(playlist.trackIds)) {
      tracks = playlist.trackIds
        .map((id) => songMap.get(id))
        .filter((s) => !!s);
    }
    return { playlist, tracks };
  }

  // addSongToPlaylist(playlistId, songId)
  addSongToPlaylist(playlistId, songId) {
    const songs = this._getFromStorage('songs');
    const songExists = songs.some((s) => s.id === songId);
    if (!songExists) {
      return { playlist: null, tracks: [], message: 'Song not found.' };
    }

    let playlists = this._getFromStorage('playlists');
    let playlist = playlists.find((p) => p.id === playlistId) || null;
    if (!playlist) {
      playlist = this._getOrCreatePlaylistById(playlistId);
      playlists = this._getFromStorage('playlists');
    }

    if (!Array.isArray(playlist.trackIds)) playlist.trackIds = [];
    if (playlist.trackIds.indexOf(songId) === -1) {
      playlist.trackIds.push(songId);
      playlist.updatedAt = this._nowIso();
      playlists = playlists.map((p) => (p.id === playlist.id ? playlist : p));
      this._saveToStorage('playlists', playlists);
    }

    const songMap = new Map(songs.map((s) => [s.id, s]));
    const tracks = playlist.trackIds.map((id) => songMap.get(id)).filter((s) => !!s);
    return { playlist, tracks, message: 'Song added to playlist.' };
  }

  // removeSongFromPlaylist(playlistId, songId)
  removeSongFromPlaylist(playlistId, songId) {
    let playlists = this._getFromStorage('playlists');
    let playlist = playlists.find((p) => p.id === playlistId) || null;
    if (!playlist || !Array.isArray(playlist.trackIds)) {
      return { playlist: null, tracks: [], message: 'Playlist not found.' };
    }

    const idx = playlist.trackIds.indexOf(songId);
    if (idx !== -1) {
      playlist.trackIds.splice(idx, 1);
      playlist.updatedAt = this._nowIso();
      playlists = playlists.map((p) => (p.id === playlist.id ? playlist : p));
      this._saveToStorage('playlists', playlists);
    }

    const songs = this._getFromStorage('songs');
    const songMap = new Map(songs.map((s) => [s.id, s]));
    const tracks = playlist.trackIds.map((id) => songMap.get(id)).filter((s) => !!s);
    return { playlist, tracks, message: 'Song removed from playlist.' };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events');
    const citySet = new Set();
    const priceTypeSet = new Set();

    events.forEach((ev) => {
      const cityLabel = ev.city && ev.state ? `${ev.city}, ${ev.state}` : ev.city || '';
      if (cityLabel) citySet.add(cityLabel);
      if (ev.priceType) priceTypeSet.add(ev.priceType);
    });

    const defaultPriceTypes = ['free', 'paid', 'donation', 'unknown'];
    const priceTypes = priceTypeSet.size > 0 ? Array.from(priceTypeSet) : defaultPriceTypes;

    return {
      cities: Array.from(citySet).sort(),
      priceTypes,
      sortOptions: [
        { value: 'start_time_earliest_first', label: 'Start time: earliest first' },
        { value: 'start_time_latest_first', label: 'Start time: latest first' },
        { value: 'newest_first', label: 'Newest created' }
      ]
    };
  }

  // listEvents(page, pageSize, filters, sort)
  listEvents(page, pageSize, filters, sort) {
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const f = filters || {};
    let items = this._getFromStorage('events');

    items = items.filter((ev) => {
      let ok = true;
      if (f.city) {
        const needle = String(f.city).toLowerCase();
        ok = ok && ev.city && ev.city.toLowerCase() === needle;
      }
      if (f.state) {
        const needle = String(f.state).toLowerCase();
        ok = ok && ev.state && ev.state.toLowerCase() === needle;
      }
      if (f.dateFrom) {
        const fromMs = this._parseDateToMs(f.dateFrom);
        const evMs = this._parseDateToMs(ev.startDateTime);
        if (!isNaN(fromMs) && !isNaN(evMs)) ok = ok && evMs >= fromMs;
      }
      if (f.dateTo) {
        const toMs = this._parseDateToMs(f.dateTo);
        const evMs = this._parseDateToMs(ev.startDateTime);
        if (!isNaN(toMs) && !isNaN(evMs)) ok = ok && evMs <= toMs;
      }
      if (Array.isArray(f.priceTypes) && f.priceTypes.length > 0) {
        ok = ok && f.priceTypes.indexOf(ev.priceType) !== -1;
      }
      return ok;
    });

    const sortMode = sort || 'start_time_earliest_first';
    items.sort((a, b) => {
      if (sortMode === 'start_time_latest_first') {
        return this._compareByDateDesc(a.startDateTime, b.startDateTime);
      }
      if (sortMode === 'newest_first') {
        const aDate = a.createdAt || a.startDateTime;
        const bDate = b.createdAt || b.startDateTime;
        return this._compareByDateDesc(aDate, bDate);
      }
      // earliest first
      return this._compareByDateAsc(a.startDateTime, b.startDateTime);
    });

    const totalCount = items.length;
    const paged = this._paginate(items, p, size);
    return { items: paged, totalCount, page: p, pageSize: size };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((ev) => ev.id === eventId) || null;
    const savedEventList = this._getOrCreateSavedEventList();
    const isSaved = savedEventList.eventIds.indexOf(eventId) !== -1;
    return { event, isSaved };
  }

  // saveEvent(eventId)
  saveEvent(eventId) {
    const events = this._getFromStorage('events');
    const exists = events.some((ev) => ev.id === eventId);
    const savedEventList = this._getOrCreateSavedEventList();
    if (!exists) {
      return { savedEventList, isSaved: false, message: 'Event not found.' };
    }
    if (savedEventList.eventIds.indexOf(eventId) === -1) {
      savedEventList.eventIds.push(eventId);
      let lists = this._getFromStorage('saved_event_lists');
      lists = lists.map((l) => (l.id === savedEventList.id ? savedEventList : l));
      this._saveToStorage('saved_event_lists', lists);
    }
    return { savedEventList, isSaved: true, message: 'Event saved.' };
  }

  // unsaveEvent(eventId)
  unsaveEvent(eventId) {
    const savedEventList = this._getOrCreateSavedEventList();
    const idx = savedEventList.eventIds.indexOf(eventId);
    let isSaved = true;
    if (idx !== -1) {
      savedEventList.eventIds.splice(idx, 1);
      let lists = this._getFromStorage('saved_event_lists');
      lists = lists.map((l) => (l.id === savedEventList.id ? savedEventList : l));
      this._saveToStorage('saved_event_lists', lists);
      isSaved = false;
    } else {
      isSaved = false;
    }
    return { savedEventList, isSaved, message: 'Event unsaved.' };
  }

  // getSavedEvents()
  getSavedEvents() {
    const savedEventList = this._getOrCreateSavedEventList();
    const events = this._getFromStorage('events');
    const eventMap = new Map(events.map((ev) => [ev.id, ev]));
    const resolved = savedEventList.eventIds
      .map((id) => eventMap.get(id))
      .filter((ev) => !!ev);
    return { savedEventList, events: resolved };
  }

  // getDevotionalFilterOptions()
  getDevotionalFilterOptions() {
    const articles = this._getFromStorage('articles');
    const devotionals = articles.filter((a) => a.articleType === 'devotional');
    const tagSet = new Set();
    devotionals.forEach((d) => {
      if (Array.isArray(d.tags)) {
        d.tags.forEach((t) => {
          if (t) tagSet.add(String(t));
        });
      }
    });

    return {
      tags: Array.from(tagSet).sort(),
      dateRanges: [
        { value: 'this_year', label: 'This year' },
        { value: 'last_30_days', label: 'Last 30 days' },
        { value: 'all_time', label: 'All time' }
      ],
      sortOptions: [
        { value: 'most_popular', label: 'Most popular' },
        { value: 'newest_first', label: 'Newest first' }
      ]
    };
  }

  // listDevotionals(page, pageSize, filters, sort)
  listDevotionals(page, pageSize, filters, sort) {
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const f = filters || {};

    let items = this._getFromStorage('articles').filter((a) => a.articleType === 'devotional');

    items = items.filter((d) => {
      let ok = true;
      if (Array.isArray(f.tags) && f.tags.length > 0) {
        const tagsLower = (d.tags || []).map((t) => String(t).toLowerCase());
        ok = ok && f.tags.some((tag) => tagsLower.indexOf(String(tag).toLowerCase()) !== -1);
      }
      if (f.dateRangePreset || f.dateFrom || f.dateTo) {
        ok = ok && this._matchesDateFilter(d.publicationDate, f.dateRangePreset || null, f.dateFrom || null, f.dateTo || null);
      }
      return ok;
    });

    const sortMode = sort || 'most_popular';
    items.sort((a, b) => {
      if (sortMode === 'newest_first') {
        return this._compareByDateDesc(a.publicationDate, b.publicationDate);
      }
      // most_popular
      return (b.popularityScore || 0) - (a.popularityScore || 0);
    });

    const totalCount = items.length;
    const paged = this._paginate(items, p, size);
    return { items: paged, totalCount, page: p, pageSize: size };
  }

  // getArticleDetails(articleId, includeComments)
  getArticleDetails(articleId, includeComments) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;
    const readingList = this._getOrCreateReadingList();
    const isInReadingList = readingList.articleIds.indexOf(articleId) !== -1;

    let comments = [];
    if (includeComments === undefined || includeComments) {
      const allComments = this._getFromStorage('comments');
      comments = allComments.filter((c) => {
        if (c.articleId !== articleId) return false;
        if (typeof c.isApproved === 'boolean') return c.isApproved;
        return true;
      });
      comments.sort((a, b) => this._compareByDateAsc(a.createdAt, b.createdAt));

      // Foreign key resolution: attach article
      comments = comments.map((c) => ({
        ...c,
        article: article
      }));
    }

    return { article, isInReadingList, comments };
  }

  // addArticleToReadingList(articleId)
  addArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const exists = articles.some((a) => a.id === articleId);
    const readingList = this._getOrCreateReadingList();
    if (!exists) {
      const resolvedArticles = readingList.articleIds
        .map((id) => articles.find((a) => a.id === id) || null)
        .filter((a) => !!a);
      return { readingList, isInReadingList: false, articles: resolvedArticles };
    }

    if (readingList.articleIds.indexOf(articleId) === -1) {
      readingList.articleIds.push(articleId);
      let lists = this._getFromStorage('reading_lists');
      lists = lists.map((l) => (l.id === readingList.id ? readingList : l));
      this._saveToStorage('reading_lists', lists);
    }

    const resolvedArticles = readingList.articleIds
      .map((id) => articles.find((a) => a.id === id) || null)
      .filter((a) => !!a);

    return { readingList, isInReadingList: true, articles: resolvedArticles };
  }

  // removeArticleFromReadingList(articleId)
  removeArticleFromReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const readingList = this._getOrCreateReadingList();
    const idx = readingList.articleIds.indexOf(articleId);
    let isInReadingList = true;
    if (idx !== -1) {
      readingList.articleIds.splice(idx, 1);
      let lists = this._getFromStorage('reading_lists');
      lists = lists.map((l) => (l.id === readingList.id ? readingList : l));
      this._saveToStorage('reading_lists', lists);
      isInReadingList = false;
    } else {
      isInReadingList = false;
    }

    const resolvedArticles = readingList.articleIds
      .map((id) => articles.find((a) => a.id === id) || null)
      .filter((a) => !!a);

    return { readingList, isInReadingList, articles: resolvedArticles };
  }

  // getReadingList()
  getReadingList() {
    const articles = this._getFromStorage('articles');
    const readingList = this._getOrCreateReadingList();
    const resolvedArticles = readingList.articleIds
      .map((id) => articles.find((a) => a.id === id) || null)
      .filter((a) => !!a);
    return { readingList, articles: resolvedArticles };
  }

  // createDevotionalCollection(name, description)
  createDevotionalCollection(name, description) {
    const key = 'devotional_collections';
    let collections = this._getFromStorage(key);
    if (!Array.isArray(collections)) collections = [];
    const now = this._nowIso();
    const collection = {
      id: this._generateId('devocollection'),
      name: name,
      description: description || '',
      createdAt: now,
      articleIds: []
    };
    collections.push(collection);
    this._saveToStorage(key, collections);
    return { collection, message: 'Devotional collection created.' };
  }

  // renameDevotionalCollection(collectionId, newName)
  renameDevotionalCollection(collectionId, newName) {
    const key = 'devotional_collections';
    let collections = this._getFromStorage(key);
    let collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return { collection: null, message: 'Collection not found.' };
    }
    collection.name = newName;
    collections = collections.map((c) => (c.id === collection.id ? collection : c));
    this._saveToStorage(key, collections);
    return { collection, message: 'Collection renamed.' };
  }

  // deleteDevotionalCollection(collectionId)
  deleteDevotionalCollection(collectionId) {
    const key = 'devotional_collections';
    let collections = this._getFromStorage(key);
    const before = collections.length;
    collections = collections.filter((c) => c.id !== collectionId);
    this._saveToStorage(key, collections);
    const success = collections.length < before;
    return { success, message: success ? 'Collection deleted.' : 'Collection not found.' };
  }

  // getDevotionalCollections()
  getDevotionalCollections() {
    return this._getFromStorage('devotional_collections');
  }

  // getDevotionalCollectionDetails(collectionId)
  getDevotionalCollectionDetails(collectionId) {
    const collections = this._getFromStorage('devotional_collections');
    const collection = collections.find((c) => c.id === collectionId) || null;
    const articles = this._getFromStorage('articles');
    const articleMap = new Map(articles.map((a) => [a.id, a]));
    let resolvedArticles = [];
    if (collection && Array.isArray(collection.articleIds)) {
      resolvedArticles = collection.articleIds
        .map((id) => articleMap.get(id))
        .filter((a) => !!a);
    }
    return { collection, articles: resolvedArticles };
  }

  // addDevotionalToCollection(collectionId, articleId)
  addDevotionalToCollection(collectionId, articleId) {
    const collections = this._getFromStorage('devotional_collections');
    let collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return { collection: null, articles: [], message: 'Collection not found.' };
    }

    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article || article.articleType !== 'devotional') {
      const articleMap = new Map(articles.map((a) => [a.id, a]));
      const resolvedArticles = (collection.articleIds || [])
        .map((id) => articleMap.get(id))
      .filter((a) => !!a);
      return { collection, articles: resolvedArticles, message: 'Devotional not found or invalid type.' };
    }

    if (!Array.isArray(collection.articleIds)) collection.articleIds = [];
    if (collection.articleIds.indexOf(articleId) === -1) {
      collection.articleIds.push(articleId);
      const newCollections = collections.map((c) => (c.id === collection.id ? collection : c));
      this._saveToStorage('devotional_collections', newCollections);
    }

    const articleMap = new Map(articles.map((a) => [a.id, a]));
    const resolvedArticles = collection.articleIds
      .map((id) => articleMap.get(id))
      .filter((a) => !!a);

    return { collection, articles: resolvedArticles, message: 'Devotional added to collection.' };
  }

  // removeDevotionalFromCollection(collectionId, articleId)
  removeDevotionalFromCollection(collectionId, articleId) {
    const key = 'devotional_collections';
    let collections = this._getFromStorage(key);
    let collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection || !Array.isArray(collection.articleIds)) {
      return { collection: null, articles: [], message: 'Collection not found.' };
    }

    const idx = collection.articleIds.indexOf(articleId);
    if (idx !== -1) {
      collection.articleIds.splice(idx, 1);
      collections = collections.map((c) => (c.id === collection.id ? collection : c));
      this._saveToStorage(key, collections);
    }

    const allArticles = this._getFromStorage('articles');
    const articleMap = new Map(allArticles.map((a) => [a.id, a]));
    const resolvedArticles = collection.articleIds
      .map((id) => articleMap.get(id))
      .filter((a) => !!a);

    return { collection, articles: resolvedArticles, message: 'Devotional removed from collection.' };
  }

  // listCommentsForArticle(articleId, page, pageSize)
  listCommentsForArticle(articleId, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 50;
    const allComments = this._getFromStorage('comments');
    const article = this._getFromStorage('articles').find((a) => a.id === articleId) || null;

    let comments = allComments.filter((c) => {
      if (c.articleId !== articleId) return false;
      if (typeof c.isApproved === 'boolean') return c.isApproved;
      return true;
    });

    comments.sort((a, b) => this._compareByDateAsc(a.createdAt, b.createdAt));

    // Foreign key resolution (article)
    comments = comments.map((c) => ({ ...c, article }));

    const totalCount = comments.length;
    const paged = this._paginate(comments, p, size);

    return { comments: paged, totalCount, page: p, pageSize: size };
  }

  // postCommentOnArticle(articleId, name, email, text)
  postCommentOnArticle(articleId, name, email, text) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { comment: null, message: 'Article not found.' };
    }

    const comments = this._getFromStorage('comments');
    const comment = {
      id: this._generateId('comment'),
      articleId: articleId,
      name: name,
      email: email,
      text: text,
      createdAt: this._nowIso(),
      isApproved: true
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);

    // Update denormalized commentCount
    article.commentCount = (article.commentCount || 0) + 1;
    const updatedArticles = articles.map((a) => (a.id === article.id ? article : a));
    this._saveToStorage('articles', updatedArticles);

    return { comment, message: 'Comment posted.' };
  }

  // getNewsletterOptions()
  getNewsletterOptions() {
    return {
      frequencies: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' }
      ],
      interests: [
        { value: 'new_releases', label: 'New Releases' },
        { value: 'choirs', label: 'Choirs' },
        { value: 'interviews', label: 'Interviews' },
        { value: 'devotionals', label: 'Devotionals' },
        { value: 'podcasts', label: 'Podcasts' },
        { value: 'events', label: 'Events' },
        { value: 'news', label: 'News' }
      ]
    };
  }

  // createNewsletterSubscription(name, email, frequency, interests)
  createNewsletterSubscription(name, email, frequency, interests) {
    const subsKey = 'newsletter_subscriptions';
    const interestsKey = 'newsletter_interests';
    let subs = this._getFromStorage(subsKey);
    let ints = this._getFromStorage(interestsKey);

    const allowedFrequencies = ['daily', 'weekly', 'monthly', 'none'];
    const freq = allowedFrequencies.indexOf(frequency) !== -1 ? frequency : 'weekly';

    const subscription = {
      id: this._generateId('subscription'),
      name: name,
      email: email,
      frequency: freq,
      createdAt: this._nowIso(),
      isConfirmed: false
    };

    subs.push(subscription);
    this._saveToStorage(subsKey, subs);

    const selectedInterests = [];
    (interests || []).forEach((interest) => {
      if (!interest) return;
      const interestObj = {
        id: this._generateId('newsletterinterest'),
        subscriptionId: subscription.id,
        interest: interest
      };
      ints.push(interestObj);
      selectedInterests.push(interestObj);
    });

    this._saveToStorage(interestsKey, ints);

    return { subscription, selectedInterests, message: 'Subscription created.' };
  }

  // getInterviewFilterOptions()
  getInterviewFilterOptions() {
    const interviews = this._getFromStorage('interviews');
    const regionSet = new Set();
    const yearSet = new Set();
    const genderSet = new Set();

    interviews.forEach((iv) => {
      if (iv.artistRegion) regionSet.add(iv.artistRegion);
      if (iv.artistGender) genderSet.add(iv.artistGender);
      if (iv.publishedDate) {
        const year = new Date(iv.publishedDate).getFullYear();
        if (!isNaN(year)) yearSet.add(year);
      }
    });

    return {
      regions: Array.from(regionSet).sort(),
      years: Array.from(yearSet).sort((a, b) => a - b),
      genders: Array.from(genderSet).sort()
    };
  }

  // listInterviews(page, pageSize, filters, sort)
  listInterviews(page, pageSize, filters, sort) {
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const f = filters || {};

    let items = this._getFromStorage('interviews');

    items = items.filter((iv) => {
      let ok = true;
      if (f.artistRegion) {
        ok = ok && iv.artistRegion === f.artistRegion;
      }
      if (typeof f.year === 'number') {
        if (iv.publishedDate) {
          const year = new Date(iv.publishedDate).getFullYear();
          ok = ok && !isNaN(year) && year === f.year;
        } else {
          ok = false;
        }
      }
      if (f.artistGender) {
        ok = ok && iv.artistGender === f.artistGender;
      }
      return ok;
    });

    const sortMode = sort || 'newest_first';
    items.sort((a, b) => {
      if (sortMode === 'most_popular') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      // newest_first
      return this._compareByDateDesc(a.publishedDate, b.publishedDate);
    });

    const totalCount = items.length;
    const paged = this._paginate(items, p, size);
    return { items: paged, totalCount, page: p, pageSize: size };
  }

  // getInterviewDetails(interviewId)
  getInterviewDetails(interviewId) {
    const interviews = this._getFromStorage('interviews');
    const interview = interviews.find((iv) => iv.id === interviewId) || null;
    const favoriteList = this._getOrCreateFavoriteInterviewList();
    const isFavorited = favoriteList.interviewIds.indexOf(interviewId) !== -1;

    // Instrumentation for task completion tracking (task_8 - viewedInterviews)
    try {
      if (
        interview &&
        interview.artistRegion === 'Africa' &&
        interview.publishedDate
      ) {
        const year = new Date(interview.publishedDate).getFullYear();
        const gender = interview.artistGender;
        if (
          year === 2023 &&
          (gender === 'male' || gender === 'female')
        ) {
          let stored = null;
          const raw = localStorage.getItem('task8_viewedInterviews');
          if (raw) {
            try {
              stored = JSON.parse(raw);
            } catch (e) {
              stored = null;
            }
          }
          if (!stored || typeof stored !== 'object') {
            stored = { male: null, female: null };
          }
          if (gender === 'male') {
            if (!stored.male) {
              stored.male = { id: interview.id, viewedAt: this._nowIso() };
            }
          } else if (gender === 'female') {
            if (!stored.female) {
              stored.female = { id: interview.id, viewedAt: this._nowIso() };
            }
          }
          localStorage.setItem('task8_viewedInterviews', JSON.stringify(stored));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { interview, isFavorited };
  }

  // favoriteInterview(interviewId)
  favoriteInterview(interviewId) {
    const interviews = this._getFromStorage('interviews');
    const exists = interviews.some((iv) => iv.id === interviewId);
    const favoriteList = this._getOrCreateFavoriteInterviewList();
    if (!exists) {
      return { favoriteList, isFavorited: false, message: 'Interview not found.' };
    }

    if (favoriteList.interviewIds.indexOf(interviewId) === -1) {
      favoriteList.interviewIds.push(interviewId);
      let lists = this._getFromStorage('favorite_interview_lists');
      lists = lists.map((l) => (l.id === favoriteList.id ? favoriteList : l));
      this._saveToStorage('favorite_interview_lists', lists);
    }

    // Instrumentation for task completion tracking (task_8 - favoritedInterviewId)
    try {
      const raw = localStorage.getItem('task8_viewedInterviews');
      if (raw) {
        let viewed = null;
        try {
          viewed = JSON.parse(raw);
        } catch (e) {
          viewed = null;
        }
        if (viewed && typeof viewed === 'object') {
          const maleId = viewed.male && viewed.male.id;
          const femaleId = viewed.female && viewed.female.id;
          if (interviewId === maleId || interviewId === femaleId) {
            localStorage.setItem('task8_favoritedInterviewId', String(interviewId));
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { favoriteList, isFavorited: true, message: 'Interview favorited.' };
  }

  // unfavoriteInterview(interviewId)
  unfavoriteInterview(interviewId) {
    const favoriteList = this._getOrCreateFavoriteInterviewList();
    const idx = favoriteList.interviewIds.indexOf(interviewId);
    let isFavorited = true;
    if (idx !== -1) {
      favoriteList.interviewIds.splice(idx, 1);
      let lists = this._getFromStorage('favorite_interview_lists');
      lists = lists.map((l) => (l.id === favoriteList.id ? favoriteList : l));
      this._saveToStorage('favorite_interview_lists', lists);
      isFavorited = false;
    } else {
      isFavorited = false;
    }
    return { favoriteList, isFavorited, message: 'Interview unfavorited.' };
  }

  // getFavoriteInterviews()
  getFavoriteInterviews() {
    const favoriteList = this._getOrCreateFavoriteInterviewList();
    const interviews = this._getFromStorage('interviews');
    const interviewMap = new Map(interviews.map((iv) => [iv.id, iv]));
    const resolved = favoriteList.interviewIds
      .map((id) => interviewMap.get(id))
      .filter((iv) => !!iv);
    return { favoriteList, interviews: resolved };
  }

  // getPodcastFilterOptions()
  getPodcastFilterOptions() {
    return {
      durationPresets: [
        { value: 'under_20', label: 'Under 20 minutes' },
        { value: '20_to_40', label: '20 to 40 minutes' },
        { value: 'over_40', label: 'Over 40 minutes' }
      ],
      sortOptions: [
        { value: 'newest_first', label: 'Newest first' },
        { value: 'most_popular', label: 'Most popular' }
      ]
    };
  }

  // searchPodcastEpisodes(query, page, pageSize, filters, sort)
  searchPodcastEpisodes(query, page, pageSize, filters, sort) {
    const q = (query || '').trim().toLowerCase();
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const f = filters || {};

    let items = this._getFromStorage('podcast_episodes');

    items = items.filter((ep) => {
      let ok = true;
      if (q) {
        const text = `${ep.title || ''} ${(ep.description || '')} ${(ep.showName || '')}`.toLowerCase();
        ok = ok && text.indexOf(q) !== -1;
      }
      if (typeof f.minDurationSeconds === 'number') {
        ok = ok && typeof ep.durationSeconds === 'number' && ep.durationSeconds >= f.minDurationSeconds;
      }
      if (typeof f.maxDurationSeconds === 'number') {
        ok = ok && typeof ep.durationSeconds === 'number' && ep.durationSeconds <= f.maxDurationSeconds;
      }
      if (Array.isArray(f.tags) && f.tags.length > 0) {
        const tagsLower = (ep.tags || []).map((t) => String(t).toLowerCase());
        ok = ok && f.tags.some((tag) => tagsLower.indexOf(String(tag).toLowerCase()) !== -1);
      }
      return ok;
    });

    const sortMode = sort || 'newest_first';
    items.sort((a, b) => {
      if (sortMode === 'most_popular') {
        return (b.popularityScore || 0) - (a.popularityScore || 0);
      }
      return this._compareByDateDesc(a.publishedDate, b.publishedDate);
    });

    const totalCount = items.length;
    const paged = this._paginate(items, p, size);

    return { items: paged, totalCount, page: p, pageSize: size };
  }

  // addEpisodeToListenLater(episodeId)
  addEpisodeToListenLater(episodeId) {
    const episodes = this._getFromStorage('podcast_episodes');
    const exists = episodes.some((ep) => ep.id === episodeId);
    const queue = this._getOrCreateListenLaterQueue();
    if (!exists) {
      const episodeMap = new Map(episodes.map((ep) => [ep.id, ep]));
      const resolvedEpisodes = queue.episodeIds
        .map((id) => episodeMap.get(id))
        .filter((ep) => !!ep);
      return { queue, episodes: resolvedEpisodes, message: 'Episode not found.' };
    }

    if (queue.episodeIds.indexOf(episodeId) === -1) {
      queue.episodeIds.push(episodeId);
      let queues = this._getFromStorage('listen_later_queues');
      queues = queues.map((q) => (q.id === queue.id ? queue : q));
      this._saveToStorage('listen_later_queues', queues);
    }

    const episodeMap = new Map(episodes.map((ep) => [ep.id, ep]));
    const resolvedEpisodes = queue.episodeIds
      .map((id) => episodeMap.get(id))
      .filter((ep) => !!ep);

    return { queue, episodes: resolvedEpisodes, message: 'Episode added to Listen Later.' };
  }

  // removeEpisodeFromListenLater(episodeId)
  removeEpisodeFromListenLater(episodeId) {
    const queue = this._getOrCreateListenLaterQueue();
    const idx = queue.episodeIds.indexOf(episodeId);
    if (idx !== -1) {
      queue.episodeIds.splice(idx, 1);
      let queues = this._getFromStorage('listen_later_queues');
      queues = queues.map((q) => (q.id === queue.id ? queue : q));
      this._saveToStorage('listen_later_queues', queues);
    }

    const episodes = this._getFromStorage('podcast_episodes');
    const episodeMap = new Map(episodes.map((ep) => [ep.id, ep]));
    const resolvedEpisodes = queue.episodeIds
      .map((id) => episodeMap.get(id))
      .filter((ep) => !!ep);

    return { queue, episodes: resolvedEpisodes, message: 'Episode removed from Listen Later.' };
  }

  // getListenLaterQueue()
  getListenLaterQueue() {
    const queue = this._getOrCreateListenLaterQueue();
    const episodes = this._getFromStorage('podcast_episodes');
    const episodeMap = new Map(episodes.map((ep) => [ep.id, ep]));
    const resolvedEpisodes = queue.episodeIds
      .map((id) => episodeMap.get(id))
      .filter((ep) => !!ep);

    return { queue, episodes: resolvedEpisodes };
  }

  // getSavedItemsOverview()
  getSavedItemsOverview() {
    // Reading list
    const rl = this._getOrCreateReadingList();
    const allArticles = this._getFromStorage('articles');
    const articleMap = new Map(allArticles.map((a) => [a.id, a]));
    const readingListArticles = rl.articleIds
      .map((id) => articleMap.get(id))
      .filter((a) => !!a);

    // Review bookmarks
    const reviewBookmarkList = this._getOrCreateReviewBookmarkList();
    const allReviews = this._getFromStorage('album_reviews');
    const reviewMap = new Map(allReviews.map((r) => [r.id, r]));
    const bookmarkedReviews = reviewBookmarkList.reviewIds
      .map((id) => reviewMap.get(id))
      .filter((r) => !!r);

    // Favorite interviews
    const favoriteInterviewList = this._getOrCreateFavoriteInterviewList();
    const allInterviews = this._getFromStorage('interviews');
    const interviewMap = new Map(allInterviews.map((iv) => [iv.id, iv]));
    const favoritedInterviews = favoriteInterviewList.interviewIds
      .map((id) => interviewMap.get(id))
      .filter((iv) => !!iv);

    // Devotional collections (no FK resolution here; details endpoint handles articles)
    const devotionalCollections = this._getFromStorage('devotional_collections');

    // Saved events
    const savedEventList = this._getOrCreateSavedEventList();
    const allEvents = this._getFromStorage('events');
    const eventMap = new Map(allEvents.map((ev) => [ev.id, ev]));
    const savedEvents = savedEventList.eventIds
      .map((id) => eventMap.get(id))
      .filter((ev) => !!ev);

    // Playlists (lightweight overview)
    const playlists = this._getFromStorage('playlists');

    // Listen later
    const listenLaterQueue = this._getOrCreateListenLaterQueue();
    const allEpisodes = this._getFromStorage('podcast_episodes');
    const episodeMap = new Map(allEpisodes.map((ep) => [ep.id, ep]));
    const listenLaterEpisodes = listenLaterQueue.episodeIds
      .map((id) => episodeMap.get(id))
      .filter((ep) => !!ep);

    return {
      readingList: rl,
      readingListArticles,
      reviewBookmarkList,
      bookmarkedReviews,
      favoriteInterviewList,
      favoritedInterviews,
      devotionalCollections,
      savedEventList,
      savedEvents,
      playlists,
      listenLaterQueue,
      listenLaterEpisodes
    };
  }

  // getStaticPageContent(slug)
  getStaticPageContent(slug) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find((p) => p.slug === slug) || null;
    if (page) return page;
    return {
      slug: slug,
      title: '',
      body: '',
      lastUpdated: null
    };
  }

  // getContactPageInfo()
  getContactPageInfo() {
    // Static configuration; can be overridden by populating a specific storage entry if desired.
    return {
      supportEmail: 'support@example.com',
      socialLinks: [],
      messageTypes: ['general_question', 'feedback', 'press_inquiry']
    };
  }

  // submitContactMessage(name, email, subject, message, messageType)
  submitContactMessage(name, email, subject, message, messageType) {
    const key = 'contact_messages';
    let messages = this._getFromStorage(key);
    if (!Array.isArray(messages)) messages = [];

    const msg = {
      id: this._generateId('contactmsg'),
      name,
      email,
      subject,
      message,
      messageType: messageType || null,
      createdAt: this._nowIso()
    };

    messages.push(msg);
    this._saveToStorage(key, messages);
    return { success: true, message: 'Message submitted.' };
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
