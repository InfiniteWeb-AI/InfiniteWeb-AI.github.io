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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'tags',
      'podcast_series',
      'podcast_episodes',
      'blog_articles',
      'playlists',
      'playlist_items',
      'reading_lists',
      'reading_list_items',
      'listening_queue',
      'queue_items',
      'feed_settings',
      'comments',
      'about_page_content',
      'help_faq_content',
      'contact_messages'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        // Choose default based on expected type
        let defaultValue;
        switch (key) {
          case 'listening_queue':
          case 'feed_settings':
            defaultValue = null; // singletons created lazily
            break;
          case 'about_page_content':
            defaultValue = { title: '', body: '' };
            break;
          case 'help_faq_content':
            defaultValue = { sections: [] };
            break;
          default:
            defaultValue = [];
        }
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _now() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const t = Date.parse(value);
    if (Number.isNaN(t)) return null;
    return new Date(t);
  }

  _compareDatesAsc(a, b) {
    const da = this._parseDate(a) || new Date(0);
    const db = this._parseDate(b) || new Date(0);
    return da - db;
  }

  _compareDatesDesc(a, b) {
    const da = this._parseDate(a) || new Date(0);
    const db = this._parseDate(b) || new Date(0);
    return db - da;
  }

  _buildTagMap() {
    const tags = this._getFromStorage('tags', []);
    const byId = {};
    tags.forEach((t) => {
      if (t && t.id) {
        byId[t.id] = t;
      }
    });
    return byId;
  }

  _getOrCreateListeningQueue() {
    let queue = this._getFromStorage('listening_queue', null);
    if (!queue || typeof queue !== 'object') {
      queue = {
        id: this._generateId('queue'),
        created_at: this._now(),
        updated_at: this._now()
      };
      this._saveToStorage('listening_queue', queue);
    }
    return queue;
  }

  _getOrCreateFeedSettings() {
    let settings = this._getFromStorage('feed_settings', null);
    if (!settings || typeof settings !== 'object') {
      settings = {
        id: 'feed_settings_1',
        selected_topic_ids: [],
        selected_content_types: ['podcasts', 'blog_posts'],
        feed_frequency: 'medium',
        last_updated: this._now()
      };
      this._saveToStorage('feed_settings', settings);
    }
    return settings;
  }

  _getOrCreateDefaultBookmarksList() {
    let readingLists = this._getFromStorage('reading_lists', []);
    let bookmarks = readingLists.find((l) => l.type === 'bookmarks');
    if (!bookmarks) {
      bookmarks = {
        id: this._generateId('reading_list'),
        type: 'bookmarks',
        name: 'Bookmarks',
        description: 'Default bookmarks list',
        article_count: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      readingLists.push(bookmarks);
      this._saveToStorage('reading_lists', readingLists);
    }
    return bookmarks;
  }

  _recalculatePlaylistMetadata(playlistId) {
    const playlists = this._getFromStorage('playlists', []);
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    const playlistItems = this._getFromStorage('playlist_items', []);
    const itemsForPlaylist = playlistItems.filter((pi) => pi.playlist_id === playlistId);
    const episodeIds = itemsForPlaylist.map((pi) => pi.episode_id);
    const episodes = this._getFromStorage('podcast_episodes', []);

    let totalDuration = 0;
    episodeIds.forEach((eid) => {
      const ep = episodes.find((e) => e.id === eid);
      if (ep && typeof ep.duration_minutes === 'number') {
        totalDuration += ep.duration_minutes;
      }
    });

    playlist.total_duration_minutes = totalDuration;
    playlist.episode_count = itemsForPlaylist.length;
    playlist.updated_at = this._now();

    this._saveToStorage('playlists', playlists);
  }

  _recalculateReadingListMetadata(readingListId) {
    const readingLists = this._getFromStorage('reading_lists', []);
    const list = readingLists.find((l) => l.id === readingListId);
    if (!list) return;

    const items = this._getFromStorage('reading_list_items', []);
    const count = items.filter((i) => i.reading_list_id === readingListId).length;
    list.article_count = count;
    list.updated_at = this._now();
    this._saveToStorage('reading_lists', readingLists);
  }

  _episodeMatchesTagIds(episode, tagIds, seriesMap) {
    if (!tagIds || !tagIds.length) return true;
    const wanted = new Set(tagIds);
    // Direct tags on episode
    if (Array.isArray(episode.tag_ids)) {
      for (const id of episode.tag_ids) {
        if (wanted.has(id)) return true;
      }
    }
    // Inherit from series
    const series = seriesMap[episode.series_id];
    if (series) {
      if (series.primary_tag_id && wanted.has(series.primary_tag_id)) return true;
      if (Array.isArray(series.tag_ids)) {
        for (const id of series.tag_ids) {
          if (wanted.has(id)) return true;
        }
      }
    }
    return false;
  }

  _articleMatchesTagIds(article, tagIds) {
    if (!tagIds || !tagIds.length) return true;
    const wanted = new Set(tagIds);
    if (Array.isArray(article.tag_ids)) {
      for (const id of article.tag_ids) {
        if (wanted.has(id)) return true;
      }
    }
    return false;
  }

  // ----------------------
  // getHomeFeed
  // ----------------------

  getHomeFeed() {
    const feedSettings = this._getOrCreateFeedSettings();
    const tagsById = this._buildTagMap();
    const podcastEpisodes = this._getFromStorage('podcast_episodes', []);
    const blogArticles = this._getFromStorage('blog_articles', []);
    const seriesList = this._getFromStorage('podcast_series', []);

    const seriesMap = {};
    seriesList.forEach((s) => {
      if (s && s.id) seriesMap[s.id] = s;
    });

    const selectedTopicIds = Array.isArray(feedSettings.selected_topic_ids)
      ? feedSettings.selected_topic_ids
      : [];
    const selectedContentTypes = Array.isArray(feedSettings.selected_content_types)
      ? feedSettings.selected_content_types
      : ['podcasts', 'blog_posts'];

    const wantPodcasts = selectedContentTypes.includes('podcasts');
    const wantBlogPosts = selectedContentTypes.includes('blog_posts');

    const topicSet = new Set(selectedTopicIds);
    const topicFilterEnabled = topicSet.size > 0;

    // Helper to check topic match
    const itemHasTopic = (tagIds) => {
      if (!topicFilterEnabled) return true;
      if (!Array.isArray(tagIds)) return false;
      return tagIds.some((id) => topicSet.has(id));
    };

    let feedItems = [];

    if (wantPodcasts) {
      podcastEpisodes.forEach((ep) => {
        const series = seriesMap[ep.series_id];
        const allTagIds = new Set();
        if (Array.isArray(ep.tag_ids)) {
          ep.tag_ids.forEach((id) => allTagIds.add(id));
        }
        if (series) {
          if (series.primary_tag_id) allTagIds.add(series.primary_tag_id);
          if (Array.isArray(series.tag_ids)) {
            series.tag_ids.forEach((id) => allTagIds.add(id));
          }
        }
        if (!itemHasTopic(Array.from(allTagIds))) return;

        const primary_tag_names = [];
        allTagIds.forEach((id) => {
          if (tagsById[id]) primary_tag_names.push(tagsById[id].name);
        });

        feedItems.push({
          content_type: 'podcast_episode',
          episode: ep,
          article: null,
          series_title: series ? series.title : null,
          primary_tag_names,
          _sort_date: ep.release_date
        });
      });
    }

    if (wantBlogPosts) {
      blogArticles.forEach((art) => {
        if (!itemHasTopic(art.tag_ids)) return;
        const primary_tag_names = [];
        if (Array.isArray(art.tag_ids)) {
          art.tag_ids.forEach((id) => {
            if (tagsById[id]) primary_tag_names.push(tagsById[id].name);
          });
        }
        feedItems.push({
          content_type: 'blog_article',
          episode: null,
          article: art,
          series_title: null,
          primary_tag_names,
          _sort_date: art.publication_date
        });
      });
    }

    // Sort by newest first based on date
    feedItems.sort((a, b) => this._compareDatesDesc(a._sort_date, b._sort_date));

    // Limit based on feed_frequency
    let maxItems;
    switch (feedSettings.feed_frequency) {
      case 'low':
        maxItems = 5;
        break;
      case 'high':
        maxItems = 20;
        break;
      case 'medium':
      default:
        maxItems = 10;
        break;
    }

    feedItems = feedItems.slice(0, maxItems).map((item) => {
      const { _sort_date, ...rest } = item;
      return rest;
    });

    return {
      feed_items: feedItems,
      feed_settings: feedSettings
    };
  }

  // ----------------------
  // searchSiteContent
  // ----------------------

  searchSiteContent(query, content_types, limit) {
    const q = (query || '').trim();
    const max = typeof limit === 'number' && limit > 0 ? limit : 10;

    const types = Array.isArray(content_types) && content_types.length
      ? content_types
      : ['podcasts', 'blog_posts'];

    const results = [];

    const lcQuery = q.toLowerCase();

    if (types.includes('podcasts')) {
      const episodes = this._getFromStorage('podcast_episodes', []);
      for (let i = 0; i < episodes.length && results.length < max; i++) {
        const ep = episodes[i];
        if (!q) {
          results.push({ content_type: 'podcast_episode', episode: ep, article: null });
        } else {
          const haystack = ((ep.title || '') + ' ' + (ep.description || '')).toLowerCase();
          if (haystack.includes(lcQuery)) {
            results.push({ content_type: 'podcast_episode', episode: ep, article: null });
          }
        }
      }
    }

    if (types.includes('blog_posts') && results.length < max) {
      const articles = this._getFromStorage('blog_articles', []);
      for (let i = 0; i < articles.length && results.length < max; i++) {
        const art = articles[i];
        if (!q) {
          results.push({ content_type: 'blog_article', episode: null, article: art });
        } else {
          const haystack = ((art.title || '') + ' ' + (art.summary || '') + ' ' + (art.content || '')).toLowerCase();
          if (haystack.includes(lcQuery)) {
            results.push({ content_type: 'blog_article', episode: null, article: art });
          }
        }
      }
    }

    return { results: results.slice(0, max) };
  }

  // ----------------------
  // getPodcastEpisodeFilterOptions
  // ----------------------

  getPodcastEpisodeFilterOptions() {
    const tags = this._getFromStorage('tags', []);
    const episodes = this._getFromStorage('podcast_episodes', []);

    const yearsSet = new Set();
    episodes.forEach((ep) => {
      const d = this._parseDate(ep.release_date);
      if (d) yearsSet.add(d.getFullYear());
    });

    const year_options = Array.from(yearsSet).sort();

    const duration_presets = [
      { key: 'under_25_minutes', label: 'Under 25 minutes', min_minutes: 0, max_minutes: 25 },
      { key: '25_to_40_minutes', label: '25 to 40 minutes', min_minutes: 25, max_minutes: 40 },
      { key: 'over_40_minutes', label: 'Over 40 minutes', min_minutes: 40, max_minutes: null }
    ];

    const sort_options = [
      { value: 'release_date_newest', label: 'Release date (newest)' },
      { value: 'release_date_oldest', label: 'Release date (oldest)' },
      { value: 'duration_longest', label: 'Duration (longest first)' },
      { value: 'duration_shortest', label: 'Duration (shortest first)' },
      { value: 'rating_highest', label: 'Rating (highest)' }
    ];

    return {
      tags,
      duration_presets,
      year_options,
      sort_options
    };
  }

  // ----------------------
  // searchPodcastEpisodes
  // ----------------------

  searchPodcastEpisodes(query, filters, sort_by, page, page_size) {
    const q = (query || '').trim().toLowerCase();
    const episodes = this._getFromStorage('podcast_episodes', []);
    const seriesList = this._getFromStorage('podcast_series', []);
    const tagsById = this._buildTagMap();

    const seriesMap = {};
    seriesList.forEach((s) => {
      if (s && s.id) seriesMap[s.id] = s;
    });

    const f = filters || {};

    let filtered = episodes.filter((ep) => {
      if (q) {
        const haystack = ((ep.title || '') + ' ' + (ep.description || '')).toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (typeof f.min_duration_minutes === 'number') {
        if (typeof ep.duration_minutes !== 'number' || ep.duration_minutes < f.min_duration_minutes) return false;
      }
      if (typeof f.max_duration_minutes === 'number') {
        if (typeof ep.duration_minutes !== 'number' || ep.duration_minutes > f.max_duration_minutes) return false;
      }

      if (typeof f.release_year === 'number') {
        const d = this._parseDate(ep.release_date);
        if (!d || d.getFullYear() !== f.release_year) return false;
      }

      if (f.release_date_start) {
        const d = this._parseDate(ep.release_date);
        const start = this._parseDate(f.release_date_start);
        if (start && (!d || d < start)) return false;
      }

      if (f.release_date_end) {
        const d = this._parseDate(ep.release_date);
        const end = this._parseDate(f.release_date_end);
        if (end && (!d || d > end)) return false;
      }

      if (Array.isArray(f.tag_ids) && f.tag_ids.length) {
        if (!this._episodeMatchesTagIds(ep, f.tag_ids, seriesMap)) return false;
      }

      return true;
    });

    const sort = sort_by || 'release_date_newest';

    filtered.sort((a, b) => {
      switch (sort) {
        case 'release_date_oldest':
          return this._compareDatesAsc(a.release_date, b.release_date);
        case 'duration_longest':
          return (b.duration_minutes || 0) - (a.duration_minutes || 0);
        case 'duration_shortest':
          return (a.duration_minutes || 0) - (b.duration_minutes || 0);
        case 'rating_highest':
          return (b.rating || 0) - (a.rating || 0);
        case 'release_date_newest':
        default:
          return this._compareDatesDesc(a.release_date, b.release_date);
      }
    });

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageItems = filtered.slice(start, end).map((ep) => {
      const series = seriesMap[ep.series_id] || null;
      const tagNames = [];
      if (Array.isArray(ep.tag_ids)) {
        ep.tag_ids.forEach((id) => {
          if (tagsById[id]) tagNames.push(tagsById[id].name);
        });
      }
      return {
        episode: ep,
        series_title: series ? series.title : null,
        series_id: ep.series_id,
        tag_names: tagNames
      };
    });

    return {
      total: filtered.length,
      page: currentPage,
      page_size: size,
      episodes: pageItems
    };
  }

  // ----------------------
  // getPodcastEpisodeDetail
  // ----------------------

  getPodcastEpisodeDetail(episodeId) {
    const episodes = this._getFromStorage('podcast_episodes', []);
    const seriesList = this._getFromStorage('podcast_series', []);
    const tagsById = this._buildTagMap();

    const episode = episodes.find((e) => e.id === episodeId) || null;
    const series = episode ? seriesList.find((s) => s.id === episode.series_id) || null : null;

    const tag_names = [];
    if (episode && Array.isArray(episode.tag_ids)) {
      episode.tag_ids.forEach((id) => {
        if (tagsById[id]) tag_names.push(tagsById[id].name);
      });
    }

    return { episode, series, tag_names };
  }

  // ----------------------
  // setEpisodeFavorite
  // ----------------------

  setEpisodeFavorite(episodeId, is_favorite) {
    const episodes = this._getFromStorage('podcast_episodes', []);
    const episode = episodes.find((e) => e.id === episodeId);
    if (!episode) return null;

    episode.is_favorite = !!is_favorite;
    episode.updated_at = this._now();
    this._saveToStorage('podcast_episodes', episodes);
    return episode;
  }

  // ----------------------
  // addEpisodeToPlaylist
  // ----------------------

  addEpisodeToPlaylist(episodeId, playlistId) {
    const playlists = this._getFromStorage('playlists', []);
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return null;

    const playlistItems = this._getFromStorage('playlist_items', []);
    const existingItems = playlistItems.filter((pi) => pi.playlist_id === playlistId);
    const maxPos = existingItems.reduce((max, item) => Math.max(max, item.position || 0), 0);

    const newItem = {
      id: this._generateId('playlist_item'),
      playlist_id: playlistId,
      episode_id: episodeId,
      position: maxPos + 1,
      added_at: this._now()
    };

    playlistItems.push(newItem);
    this._saveToStorage('playlist_items', playlistItems);

    this._recalculatePlaylistMetadata(playlistId);

    const updatedPlaylists = this._getFromStorage('playlists', []);
    return updatedPlaylists.find((p) => p.id === playlistId) || playlist;
  }

  // ----------------------
  // addEpisodeToListeningQueue
  // ----------------------

  addEpisodeToListeningQueue(episodeId, play_now) {
    const queue = this._getOrCreateListeningQueue();
    let queueItems = this._getFromStorage('queue_items', []);

    const itemsForQueue = queueItems.filter((qi) => qi.queue_id === queue.id);

    if (play_now) {
      // New item at front
      const newItem = {
        id: this._generateId('queue_item'),
        queue_id: queue.id,
        episode_id: episodeId,
        position: 1,
        added_at: this._now()
      };

      // Shift existing items
      itemsForQueue.forEach((item) => {
        item.position = (item.position || 0) + 1;
      });

      queueItems = queueItems.filter((qi) => qi.queue_id !== queue.id).concat(itemsForQueue).concat([newItem]);
    } else {
      const maxPos = itemsForQueue.reduce((max, item) => Math.max(max, item.position || 0), 0);
      const newItem = {
        id: this._generateId('queue_item'),
        queue_id: queue.id,
        episode_id: episodeId,
        position: maxPos + 1,
        added_at: this._now()
      };
      queueItems.push(newItem);
    }

    queue.updated_at = this._now();
    this._saveToStorage('queue_items', queueItems);
    this._saveToStorage('listening_queue', queue);

    const items = queueItems.filter((qi) => qi.queue_id === queue.id);
    return { queue, items };
  }

  // ----------------------
  // getSeriesFilterOptions
  // ----------------------

  getSeriesFilterOptions() {
    const tags = this._getFromStorage('tags', []);
    const sort_options = [
      { value: 'alphabetical', label: 'Alphabetical' },
      { value: 'recently_updated', label: 'Recently updated' },
      { value: 'total_episodes_desc', label: 'Episode count (highest first)' }
    ];
    return { tags, sort_options };
  }

  // ----------------------
  // listPodcastSeries
  // ----------------------

  listPodcastSeries(filters, sort_by, page, page_size) {
    const seriesList = this._getFromStorage('podcast_series', []);
    const tagsById = this._buildTagMap();
    const f = filters || {};

    let filtered = seriesList.filter((s) => {
      if (Array.isArray(f.tag_ids) && f.tag_ids.length) {
        const wanted = new Set(f.tag_ids);
        let has = false;
        if (s.primary_tag_id && wanted.has(s.primary_tag_id)) has = true;
        if (!has && Array.isArray(s.tag_ids)) {
          for (const id of s.tag_ids) {
            if (wanted.has(id)) {
              has = true;
              break;
            }
          }
        }
        if (!has) return false;
      }
      return true;
    });

    const sort = sort_by || 'alphabetical';
    filtered.sort((a, b) => {
      switch (sort) {
        case 'recently_updated': {
          const da = this._parseDate(a.updated_at || a.created_at);
          const db = this._parseDate(b.updated_at || b.created_at);
          return (db || 0) - (da || 0);
        }
        case 'total_episodes_desc':
          return (b.total_episodes || 0) - (a.total_episodes || 0);
        case 'alphabetical':
        default:
          return (a.title || '').localeCompare(b.title || '');
      }
    });

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageItems = filtered.slice(start, end).map((s) => {
      const primary = s.primary_tag_id ? tagsById[s.primary_tag_id] : null;
      return {
        series: s,
        primary_tag_name: primary ? primary.name : null
      };
    });

    return {
      total: filtered.length,
      series: pageItems
    };
  }

  // ----------------------
  // getSeriesDetail
  // ----------------------

  getSeriesDetail(seriesId, episode_sort_by) {
    const seriesList = this._getFromStorage('podcast_series', []);
    const episodes = this._getFromStorage('podcast_episodes', []);
    const tagsById = this._buildTagMap();

    const series = seriesList.find((s) => s.id === seriesId) || null;
    if (!series) {
      return { series: null, tag_names: [], episodes: [] };
    }

    const tag_names = [];
    if (series.primary_tag_id && tagsById[series.primary_tag_id]) {
      tag_names.push(tagsById[series.primary_tag_id].name);
    }
    if (Array.isArray(series.tag_ids)) {
      series.tag_ids.forEach((id) => {
        if (tagsById[id] && !tag_names.includes(tagsById[id].name)) {
          tag_names.push(tagsById[id].name);
        }
      });
    }

    let seriesEpisodes = episodes.filter((ep) => ep.series_id === seriesId);
    const sort = episode_sort_by || 'release_date_newest';
    seriesEpisodes.sort((a, b) => {
      switch (sort) {
        case 'release_date_oldest':
          return this._compareDatesAsc(a.release_date, b.release_date);
        case 'duration_longest':
          return (b.duration_minutes || 0) - (a.duration_minutes || 0);
        case 'duration_shortest':
          return (a.duration_minutes || 0) - (b.duration_minutes || 0);
        case 'release_date_newest':
        default:
          return this._compareDatesDesc(a.release_date, b.release_date);
      }
    });

    return { series, tag_names, episodes: seriesEpisodes };
  }

  // ----------------------
  // setSeriesSubscription
  // ----------------------

  setSeriesSubscription(seriesId, is_subscribed) {
    const seriesList = this._getFromStorage('podcast_series', []);
    const series = seriesList.find((s) => s.id === seriesId);
    if (!series) return null;

    series.is_subscribed = !!is_subscribed;
    series.updated_at = this._now();
    this._saveToStorage('podcast_series', seriesList);
    return series;
  }

  // ----------------------
  // enqueueSeriesLatestEpisode
  // ----------------------

  enqueueSeriesLatestEpisode(seriesId, play_now) {
    const seriesList = this._getFromStorage('podcast_series', []);
    const episodes = this._getFromStorage('podcast_episodes', []);
    const series = seriesList.find((s) => s.id === seriesId);
    if (!series) {
      const queue = this._getOrCreateListeningQueue();
      const items = this._getFromStorage('queue_items', []).filter((qi) => qi.queue_id === queue.id);
      return { queue, items };
    }

    let latestEpisodeId = series.latest_episode_id;
    if (!latestEpisodeId) {
      const seriesEpisodes = episodes.filter((ep) => ep.series_id === seriesId);
      if (seriesEpisodes.length) {
        seriesEpisodes.sort((a, b) => this._compareDatesDesc(a.release_date, b.release_date));
        latestEpisodeId = seriesEpisodes[0].id;
      }
    }

    if (!latestEpisodeId) {
      const queue = this._getOrCreateListeningQueue();
      const items = this._getFromStorage('queue_items', []).filter((qi) => qi.queue_id === queue.id);
      return { queue, items };
    }

    return this.addEpisodeToListeningQueue(latestEpisodeId, !!play_now);
  }

  // ----------------------
  // getBlogFilterOptions
  // ----------------------

  getBlogFilterOptions() {
    const tags = this._getFromStorage('tags', []);
    const levels = ['beginner', 'intermediate', 'advanced'];

    const reading_time_presets = [
      { key: 'up_to_10_minutes', label: 'Up to 10 minutes', min_minutes: 0, max_minutes: 10 },
      { key: '10_to_20_minutes', label: '10 to 20 minutes', min_minutes: 10, max_minutes: 20 },
      { key: 'over_20_minutes', label: 'Over 20 minutes', min_minutes: 20, max_minutes: null }
    ];

    const sort_options = [
      { value: 'newest', label: 'Newest first' },
      { value: 'oldest', label: 'Oldest first' },
      { value: 'most_commented', label: 'Most commented' },
      { value: 'rating_highest', label: 'Rating (highest)' }
    ];

    return { tags, levels, reading_time_presets, sort_options };
  }

  // ----------------------
  // searchBlogArticles
  // ----------------------

  searchBlogArticles(query, filters, sort_by, page, page_size) {
    const q = (query || '').trim().toLowerCase();
    const articles = this._getFromStorage('blog_articles', []);
    const f = filters || {};

    let filtered = articles.filter((art) => {
      if (q) {
        const haystack = ((art.title || '') + ' ' + (art.summary || '') + ' ' + (art.content || '')).toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (f.level && ['beginner', 'intermediate', 'advanced'].includes(f.level)) {
        if (art.level !== f.level) return false;
      }

      if (typeof f.max_reading_time_minutes === 'number') {
        if (typeof art.reading_time_minutes !== 'number' || art.reading_time_minutes > f.max_reading_time_minutes) {
          return false;
        }
      }

      if (f.publication_date_start) {
        const d = this._parseDate(art.publication_date);
        const start = this._parseDate(f.publication_date_start);
        if (start && (!d || d < start)) return false;
      }

      if (f.publication_date_end) {
        const d = this._parseDate(art.publication_date);
        const end = this._parseDate(f.publication_date_end);
        if (end && (!d || d > end)) return false;
      }

      if (typeof f.min_comments_count === 'number') {
        if (typeof art.comments_count !== 'number' || art.comments_count < f.min_comments_count) return false;
      }

      if (Array.isArray(f.tag_ids) && f.tag_ids.length) {
        if (!this._articleMatchesTagIds(art, f.tag_ids)) return false;
      }

      return true;
    });

    const sort = sort_by || 'newest';
    filtered.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return this._compareDatesAsc(a.publication_date, b.publication_date);
        case 'most_commented':
          return (b.comments_count || 0) - (a.comments_count || 0);
        case 'rating_highest':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest':
        default:
          return this._compareDatesDesc(a.publication_date, b.publication_date);
      }
    });

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageItems = filtered.slice(start, end);

    return {
      total: filtered.length,
      articles: pageItems
    };
  }

  // ----------------------
  // getBlogArticleDetail
  // ----------------------

  getBlogArticleDetail(articleId) {
    const articles = this._getFromStorage('blog_articles', []);
    const tagsById = this._buildTagMap();
    const comments = this._getFromStorage('comments', []);

    const article = articles.find((a) => a.id === articleId) || null;

    const tag_names = [];
    if (article && Array.isArray(article.tag_ids)) {
      article.tag_ids.forEach((id) => {
        if (tagsById[id]) tag_names.push(tagsById[id].name);
      });
    }

    const articleComments = comments
      .filter((c) => c.article_id === articleId)
      .map((c) => ({
        ...c,
        article: article || null
      }));

    return { article, tag_names, comments: articleComments };
  }

  // ----------------------
  // setArticleBookmark
  // ----------------------

  setArticleBookmark(articleId, is_bookmarked) {
    const articles = this._getFromStorage('blog_articles', []);
    const article = articles.find((a) => a.id === articleId);
    if (!article) return null;

    const flag = !!is_bookmarked;
    article.is_bookmarked = flag;
    article.updated_at = this._now();
    this._saveToStorage('blog_articles', articles);

    const bookmarksList = this._getOrCreateDefaultBookmarksList();

    if (flag) {
      this.addArticleToReadingList(bookmarksList.id, articleId);
    } else {
      this.removeArticleFromReadingList(bookmarksList.id, articleId);
    }

    return article;
  }

  // ----------------------
  // createReadingList
  // ----------------------

  createReadingList(type, name, description) {
    const validTypes = ['bookmarks', 'named_list', 'auto_generated'];
    const listType = validTypes.includes(type) ? type : 'named_list';

    const readingLists = this._getFromStorage('reading_lists', []);
    const now = this._now();
    const list = {
      id: this._generateId('reading_list'),
      type: listType,
      name: name || '',
      description: description || '',
      article_count: 0,
      created_at: now,
      updated_at: now
    };

    readingLists.push(list);
    this._saveToStorage('reading_lists', readingLists);
    return list;
  }

  // ----------------------
  // addArticleToReadingList
  // ----------------------

  addArticleToReadingList(readingListId, articleId) {
    const readingLists = this._getFromStorage('reading_lists', []);
    const list = readingLists.find((l) => l.id === readingListId);
    if (!list) return null;

    const items = this._getFromStorage('reading_list_items', []);
    const existingForList = items.filter((i) => i.reading_list_id === readingListId);

    // Avoid duplicates of same article in same list
    const already = existingForList.find((i) => i.article_id === articleId);
    if (already) {
      return list;
    }

    const maxPos = existingForList.reduce((max, item) => Math.max(max, item.position || 0), 0);
    const newItem = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingListId,
      article_id: articleId,
      position: maxPos + 1,
      added_at: this._now()
    };

    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    this._recalculateReadingListMetadata(readingListId);

    const updatedReadingLists = this._getFromStorage('reading_lists', []);
    return updatedReadingLists.find((l) => l.id === readingListId) || list;
  }

  // ----------------------
  // getReadingListsOverview
  // ----------------------

  getReadingListsOverview() {
    return this._getFromStorage('reading_lists', []);
  }

  // ----------------------
  // getReadingListDetail
  // ----------------------

  getReadingListDetail(readingListId) {
    const readingLists = this._getFromStorage('reading_lists', []);
    const items = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('blog_articles', []);

    const reading_list = readingLists.find((l) => l.id === readingListId) || null;

    const itemsForList = items
      .filter((i) => i.reading_list_id === readingListId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const detailItems = itemsForList.map((li) => {
      const article = articles.find((a) => a.id === li.article_id) || null;
      return {
        list_item: li,
        article
      };
    });

    return {
      reading_list,
      items: detailItems
    };
  }

  // ----------------------
  // renameReadingList
  // ----------------------

  renameReadingList(readingListId, name) {
    const readingLists = this._getFromStorage('reading_lists', []);
    const list = readingLists.find((l) => l.id === readingListId);
    if (!list) return null;

    list.name = name || '';
    list.updated_at = this._now();
    this._saveToStorage('reading_lists', readingLists);
    return list;
  }

  // ----------------------
  // removeArticleFromReadingList
  // ----------------------

  removeArticleFromReadingList(readingListId, articleId) {
    const readingLists = this._getFromStorage('reading_lists', []);
    const list = readingLists.find((l) => l.id === readingListId);
    if (!list) return null;

    let items = this._getFromStorage('reading_list_items', []);

    const before = items.length;
    items = items.filter((i) => !(i.reading_list_id === readingListId && i.article_id === articleId));
    if (items.length !== before) {
      // Reindex positions for this list
      const listItems = items
        .filter((i) => i.reading_list_id === readingListId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      listItems.forEach((item, idx) => {
        item.position = idx + 1;
      });
      this._saveToStorage('reading_list_items', items);
      this._recalculateReadingListMetadata(readingListId);
    }

    const updatedReadingLists = this._getFromStorage('reading_lists', []);
    return updatedReadingLists.find((l) => l.id === readingListId) || list;
  }

  // ----------------------
  // moveArticleBetweenReadingLists
  // ----------------------

  moveArticleBetweenReadingLists(fromReadingListId, toReadingListId, articleId) {
    const readingLists = this._getFromStorage('reading_lists', []);
    const fromList = readingLists.find((l) => l.id === fromReadingListId) || null;
    const toList = readingLists.find((l) => l.id === toReadingListId) || null;

    if (!fromList || !toList) {
      return { from_list: fromList, to_list: toList };
    }

    // Remove from source
    this.removeArticleFromReadingList(fromReadingListId, articleId);
    // Add to destination
    this.addArticleToReadingList(toReadingListId, articleId);

    const updatedLists = this._getFromStorage('reading_lists', []);
    return {
      from_list: updatedLists.find((l) => l.id === fromReadingListId) || fromList,
      to_list: updatedLists.find((l) => l.id === toReadingListId) || toList
    };
  }

  // ----------------------
  // addArticleComment
  // ----------------------

  addArticleComment(articleId, author_name, author_email, body) {
    const articles = this._getFromStorage('blog_articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    const comments = this._getFromStorage('comments', []);
    const comment = {
      id: this._generateId('comment'),
      article_id: articleId,
      author_name: author_name || '',
      author_email: author_email || '',
      body: body || '',
      created_at: this._now(),
      status: 'approved'
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    if (article) {
      article.comments_count = (article.comments_count || 0) + 1;
      article.updated_at = this._now();
      this._saveToStorage('blog_articles', articles);
    }

    return {
      comment,
      article
    };
  }

  // ----------------------
  // listTags
  // ----------------------

  listTags() {
    return this._getFromStorage('tags', []);
  }

  // ----------------------
  // getTagDetailContent
  // ----------------------

  getTagDetailContent(tagId, content_types, sort_by) {
    const tags = this._getFromStorage('tags', []);
    const tag = tags.find((t) => t.id === tagId) || null;

    const types = Array.isArray(content_types) && content_types.length
      ? content_types
      : ['blog_posts', 'podcasts'];

    const episodes = this._getFromStorage('podcast_episodes', []);
    const articles = this._getFromStorage('blog_articles', []);
    const seriesList = this._getFromStorage('podcast_series', []);

    const seriesMap = {};
    seriesList.forEach((s) => {
      if (s && s.id) seriesMap[s.id] = s;
    });

    let blog_articles = [];
    let podcast_episodes = [];

    if (types.includes('blog_posts')) {
      blog_articles = articles.filter((art) => this._articleMatchesTagIds(art, [tagId]));
    }

    if (types.includes('podcasts')) {
      podcast_episodes = episodes.filter((ep) => this._episodeMatchesTagIds(ep, [tagId], seriesMap));
    }

    const sort = sort_by || 'rating_highest';

    const sortByRatingDesc = (a, b) => (b.rating || 0) - (a.rating || 0);
    const sortByNewest = (a, b, getDate) => {
      return this._compareDatesDesc(getDate(a), getDate(b));
    };
    const sortByOldest = (a, b, getDate) => {
      return this._compareDatesAsc(getDate(a), getDate(b));
    };

    switch (sort) {
      case 'newest':
        blog_articles.sort((a, b) => sortByNewest(a, b, (x) => x.publication_date));
        podcast_episodes.sort((a, b) => sortByNewest(a, b, (x) => x.release_date));
        break;
      case 'oldest':
        blog_articles.sort((a, b) => sortByOldest(a, b, (x) => x.publication_date));
        podcast_episodes.sort((a, b) => sortByOldest(a, b, (x) => x.release_date));
        break;
      case 'most_commented':
        blog_articles.sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0));
        podcast_episodes.sort(sortByRatingDesc);
        break;
      case 'rating_highest':
      default:
        blog_articles.sort(sortByRatingDesc);
        podcast_episodes.sort(sortByRatingDesc);
        break;
    }

    return {
      tag,
      blog_articles,
      podcast_episodes
    };
  }

  // ----------------------
  // getPlaylistsOverview
  // ----------------------

  getPlaylistsOverview() {
    const playlists = this._getFromStorage('playlists', []);
    // Ensure metadata is up to date
    playlists.forEach((p) => {
      if (p && p.id) {
        this._recalculatePlaylistMetadata(p.id);
      }
    });
    return this._getFromStorage('playlists', []);
  }

  // ----------------------
  // getPlaylistDetail
  // ----------------------

  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists', []);
    const items = this._getFromStorage('playlist_items', []);
    const episodes = this._getFromStorage('podcast_episodes', []);
    const seriesList = this._getFromStorage('podcast_series', []);

    const playlist = playlists.find((p) => p.id === playlistId) || null;

    const seriesMap = {};
    seriesList.forEach((s) => {
      if (s && s.id) seriesMap[s.id] = s;
    });

    const itemsForPlaylist = items
      .filter((i) => i.playlist_id === playlistId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const detailItems = itemsForPlaylist.map((pi) => {
      const episode = episodes.find((e) => e.id === pi.episode_id) || null;
      const series = episode ? seriesMap[episode.series_id] : null;
      return {
        playlist_item: pi,
        episode,
        series_title: series ? series.title : null
      };
    });

    return {
      playlist,
      items: detailItems
    };
  }

  // ----------------------
  // createPlaylist
  // ----------------------

  createPlaylist(name, description, episodeIds) {
    const playlists = this._getFromStorage('playlists', []);
    const playlistItems = this._getFromStorage('playlist_items', []);
    const now = this._now();

    const playlist = {
      id: this._generateId('playlist'),
      name: name || '',
      description: description || '',
      total_duration_minutes: 0,
      episode_count: 0,
      created_at: now,
      updated_at: now
    };

    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);

    if (Array.isArray(episodeIds) && episodeIds.length) {
      let position = 1;
      episodeIds.forEach((eid) => {
        const item = {
          id: this._generateId('playlist_item'),
          playlist_id: playlist.id,
          episode_id: eid,
          position,
          added_at: this._now()
        };
        playlistItems.push(item);
        position += 1;
      });
      this._saveToStorage('playlist_items', playlistItems);
      this._recalculatePlaylistMetadata(playlist.id);
    }

    const updatedPlaylists = this._getFromStorage('playlists', []);
    return updatedPlaylists.find((p) => p.id === playlist.id) || playlist;
  }

  // ----------------------
  // renamePlaylist
  // ----------------------

  renamePlaylist(playlistId, name) {
    const playlists = this._getFromStorage('playlists', []);
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return null;

    playlist.name = name || '';
    playlist.updated_at = this._now();
    this._saveToStorage('playlists', playlists);
    return playlist;
  }

  // ----------------------
  // deletePlaylist
  // ----------------------

  deletePlaylist(playlistId) {
    let playlists = this._getFromStorage('playlists', []);
    const before = playlists.length;
    playlists = playlists.filter((p) => p.id !== playlistId);
    const success = playlists.length !== before;
    this._saveToStorage('playlists', playlists);

    if (success) {
      let items = this._getFromStorage('playlist_items', []);
      items = items.filter((i) => i.playlist_id !== playlistId);
      this._saveToStorage('playlist_items', items);
    }

    return { success };
  }

  // ----------------------
  // removeEpisodeFromPlaylist
  // ----------------------

  removeEpisodeFromPlaylist(playlistId, episodeId) {
    const playlists = this._getFromStorage('playlists', []);
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return null;

    let items = this._getFromStorage('playlist_items', []);
    const before = items.length;

    items = items.filter((i) => !(i.playlist_id === playlistId && i.episode_id === episodeId));

    if (items.length !== before) {
      // Reindex positions
      const listItems = items
        .filter((i) => i.playlist_id === playlistId)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      listItems.forEach((item, idx) => {
        item.position = idx + 1;
      });
      this._saveToStorage('playlist_items', items);
      this._recalculatePlaylistMetadata(playlistId);
    }

    const updatedPlaylists = this._getFromStorage('playlists', []);
    return updatedPlaylists.find((p) => p.id === playlistId) || playlist;
  }

  // ----------------------
  // reorderPlaylistItems
  // ----------------------

  reorderPlaylistItems(playlistId, orderedEpisodeIds) {
    const playlists = this._getFromStorage('playlists', []);
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return null;

    if (!Array.isArray(orderedEpisodeIds) || !orderedEpisodeIds.length) {
      return playlist;
    }

    const items = this._getFromStorage('playlist_items', []);
    const itemsForPlaylist = items.filter((i) => i.playlist_id === playlistId);

    const episodeIdToItems = {};
    itemsForPlaylist.forEach((item) => {
      if (!episodeIdToItems[item.episode_id]) episodeIdToItems[item.episode_id] = [];
      episodeIdToItems[item.episode_id].push(item);
    });

    let pos = 1;
    orderedEpisodeIds.forEach((eid) => {
      const arr = episodeIdToItems[eid];
      if (arr && arr.length) {
        arr.forEach((item) => {
          item.position = pos;
          pos += 1;
        });
      }
    });

    this._saveToStorage('playlist_items', items);
    this._recalculatePlaylistMetadata(playlistId);

    const updatedPlaylists = this._getFromStorage('playlists', []);
    return updatedPlaylists.find((p) => p.id === playlistId) || playlist;
  }

  // ----------------------
  // enqueuePlaylist
  // ----------------------

  enqueuePlaylist(playlistId, start_episode_id, play_now) {
    const playlistItems = this._getFromStorage('playlist_items', []);
    const queue = this._getOrCreateListeningQueue();
    let queueItems = this._getFromStorage('queue_items', []);

    const itemsForPlaylist = playlistItems
      .filter((i) => i.playlist_id === playlistId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    if (!itemsForPlaylist.length) {
      const items = queueItems.filter((qi) => qi.queue_id === queue.id);
      return { queue, items };
    }

    let ordered = itemsForPlaylist.map((i) => i.episode_id);
    if (start_episode_id) {
      const idx = ordered.indexOf(start_episode_id);
      if (idx > 0) {
        const startPart = ordered.slice(idx);
        const rest = ordered.slice(0, idx);
        ordered = startPart.concat(rest);
      }
    }

    const now = this._now();

    if (play_now) {
      // Place these episodes at the front of the queue
      const existing = queueItems.filter((qi) => qi.queue_id === queue.id);
      const others = queueItems.filter((qi) => qi.queue_id !== queue.id);

      const newItems = [];
      ordered.forEach((eid, idx) => {
        newItems.push({
          id: this._generateId('queue_item'),
          queue_id: queue.id,
          episode_id: eid,
          position: idx + 1,
          added_at: now
        });
      });

      // Shift existing after new items
      existing.sort((a, b) => (a.position || 0) - (b.position || 0));
      existing.forEach((item, idx) => {
        item.position = newItems.length + idx + 1;
      });

      queueItems = others.concat(newItems).concat(existing);
    } else {
      const existingForQueue = queueItems.filter((qi) => qi.queue_id === queue.id);
      const others = queueItems.filter((qi) => qi.queue_id !== queue.id);
      let maxPos = existingForQueue.reduce((max, item) => Math.max(max, item.position || 0), 0);

      const newItems = [];
      ordered.forEach((eid) => {
        maxPos += 1;
        newItems.push({
          id: this._generateId('queue_item'),
          queue_id: queue.id,
          episode_id: eid,
          position: maxPos,
          added_at: now
        });
      });

      queueItems = others.concat(existingForQueue).concat(newItems);
    }

    queue.updated_at = now;
    this._saveToStorage('queue_items', queueItems);
    this._saveToStorage('listening_queue', queue);

    const items = queueItems.filter((qi) => qi.queue_id === queue.id);
    return { queue, items };
  }

  // ----------------------
  // getListeningQueue
  // ----------------------

  getListeningQueue() {
    const queue = this._getOrCreateListeningQueue();
    const queueItems = this._getFromStorage('queue_items', []);
    const episodes = this._getFromStorage('podcast_episodes', []);
    const seriesList = this._getFromStorage('podcast_series', []);

    const seriesMap = {};
    seriesList.forEach((s) => {
      if (s && s.id) seriesMap[s.id] = s;
    });

    const itemsForQueue = queueItems
      .filter((qi) => qi.queue_id === queue.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const items = itemsForQueue.map((qi) => {
      const episode = episodes.find((e) => e.id === qi.episode_id) || null;
      const series = episode ? seriesMap[episode.series_id] : null;
      return {
        queue_item: qi,
        episode,
        series_title: series ? series.title : null
      };
    });

    return { queue, items };
  }

  // ----------------------
  // reorderQueueItems
  // ----------------------

  reorderQueueItems(orderedQueueItemIds) {
    const queue = this._getOrCreateListeningQueue();
    let queueItems = this._getFromStorage('queue_items', []);

    const idSet = new Set(Array.isArray(orderedQueueItemIds) ? orderedQueueItemIds : []);

    const itemsForQueue = queueItems.filter((qi) => qi.queue_id === queue.id);
    const others = queueItems.filter((qi) => qi.queue_id !== queue.id);

    const idToItem = {};
    itemsForQueue.forEach((item) => {
      idToItem[item.id] = item;
    });

    const newOrder = [];
    orderedQueueItemIds.forEach((id, idx) => {
      const item = idToItem[id];
      if (item) {
        item.position = idx + 1;
        newOrder.push(item);
      }
    });

    // Items not mentioned in orderedQueueItemIds keep their relative order after
    const remaining = itemsForQueue
      .filter((item) => !idSet.has(item.id))
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    let pos = newOrder.length + 1;
    remaining.forEach((item) => {
      item.position = pos;
      pos += 1;
      newOrder.push(item);
    });

    queueItems = others.concat(newOrder);
    queue.updated_at = this._now();
    this._saveToStorage('queue_items', queueItems);
    this._saveToStorage('listening_queue', queue);

    return {
      queue,
      items: newOrder
    };
  }

  // ----------------------
  // removeEpisodeFromQueue
  // ----------------------

  removeEpisodeFromQueue(queueItemId) {
    const queue = this._getOrCreateListeningQueue();
    let queueItems = this._getFromStorage('queue_items', []);

    const before = queueItems.length;
    queueItems = queueItems.filter((qi) => qi.id !== queueItemId);

    if (queueItems.length !== before) {
      // Reindex positions for this queue
      const itemsForQueue = queueItems
        .filter((qi) => qi.queue_id === queue.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
      itemsForQueue.forEach((item, idx) => {
        item.position = idx + 1;
      });
      queue.updated_at = this._now();
    }

    this._saveToStorage('queue_items', queueItems);
    this._saveToStorage('listening_queue', queue);

    const items = queueItems.filter((qi) => qi.queue_id === queue.id);
    return { queue, items };
  }

  // ----------------------
  // getFeedSettings
  // ----------------------

  getFeedSettings() {
    return this._getOrCreateFeedSettings();
  }

  // ----------------------
  // updateFeedSettings
  // ----------------------

  updateFeedSettings(selected_topic_ids, selected_content_types, feed_frequency) {
    const settings = this._getOrCreateFeedSettings();

    if (Array.isArray(selected_topic_ids)) {
      settings.selected_topic_ids = selected_topic_ids;
    }

    if (Array.isArray(selected_content_types) && selected_content_types.length) {
      // Filter to allowed values
      const allowed = new Set(['podcasts', 'blog_posts', 'announcements']);
      settings.selected_content_types = selected_content_types.filter((t) => allowed.has(t));
      if (!settings.selected_content_types.length) {
        settings.selected_content_types = ['podcasts', 'blog_posts'];
      }
    }

    if (feed_frequency && ['low', 'medium', 'high'].includes(feed_frequency)) {
      settings.feed_frequency = feed_frequency;
    }

    settings.last_updated = this._now();
    this._saveToStorage('feed_settings', settings);
    return settings;
  }

  // ----------------------
  // getAboutPageContent
  // ----------------------

  getAboutPageContent() {
    return this._getFromStorage('about_page_content', { title: '', body: '' });
  }

  // ----------------------
  // sendContactMessage
  // ----------------------

  sendContactMessage(name, email, subject, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const msg = {
      id: this._generateId('contact_message'),
      name: name || '',
      email: email || '',
      subject: subject || '',
      message: message || '',
      created_at: this._now()
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);
    return {
      success: true,
      message: 'Your message has been sent.'
    };
  }

  // ----------------------
  // getHelpFaqContent
  // ----------------------

  getHelpFaqContent() {
    return this._getFromStorage('help_faq_content', { sections: [] });
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
