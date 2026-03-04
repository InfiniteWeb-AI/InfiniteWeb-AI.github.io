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

  // -----------------------
  // Storage initialization
  // -----------------------
  _initStorage() {
    const arrayKeys = [
      'episodes',
      'hosts',
      'series',
      'topics',
      'guests',
      'playlists',
      'playlist_items',
      'listening_queues',
      'queue_items',
      'episode_favorites',
      'host_follows',
      'series_subscriptions',
      'episode_user_ratings',
      'episode_comments',
      'newsletter_subscriptions',
      'users'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Playback settings singleton
    if (!localStorage.getItem('playback_settings')) {
      const now = new Date().toISOString();
      const settings = {
        id: 'playback_settings_default',
        default_speed: 'speed_1x',
        skip_silences: false,
        theme: 'light',
        created_at: now,
        updated_at: now
      };
      localStorage.setItem('playback_settings', JSON.stringify(settings));
    }

    // Playback state singleton
    if (!localStorage.getItem('playback_states')) {
      const now = new Date().toISOString();
      const state = {
        id: 'playback_state_default',
        current_episode_id: null,
        is_playing: false,
        position_seconds: 0,
        playback_speed: 'speed_1x',
        updated_at: now
      };
      localStorage.setItem('playback_states', JSON.stringify(state));
    }

    // Static page contents (seeded once)
    if (!localStorage.getItem('about_content')) {
      const about = {
        sections: [
          {
            heading: 'About This Podcast',
            body:
              'This space explores spiritual philosophy, non-duality, meditation, and ethics through long-form conversations and guided reflections.'
          }
        ]
      };
      localStorage.setItem('about_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('help_content')) {
      const help = {
        faqs: [
          {
            question: 'How do I create a playlist?',
            answer:
              'Use the “Add to Playlist” button on any episode card, then create a new playlist or add to an existing one.',
            category: 'playlists'
          },
          {
            question: 'How do I change playback speed?',
            answer:
              'Open Settings → Playback to choose your default speed. You can also adjust speed in the player controls.',
            category: 'settings'
          }
        ],
        contactInfo: {
          email: 'support@example.com',
          contactFormEnabled: false
        }
      };
      localStorage.setItem('help_content', JSON.stringify(help));
    }

    if (!localStorage.getItem('privacy_policy_content')) {
      const privacy = {
        sections: [
          {
            heading: 'Privacy Policy',
            body:
              'We store only the data required to deliver your listening experience, such as preferences, favorites, and newsletter subscriptions.'
          }
        ]
      };
      localStorage.setItem('privacy_policy_content', JSON.stringify(privacy));
    }

    if (!localStorage.getItem('terms_of_use_content')) {
      const terms = {
        sections: [
          {
            heading: 'Terms of Use',
            body:
              'By using this site you agree to use the content for personal, non-commercial listening and reflection.'
          }
        ]
      };
      localStorage.setItem('terms_of_use_content', JSON.stringify(terms));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  // -----------------------
  // Low-level storage utils
  // -----------------------
  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return Array.isArray(defaultValue) ? [...defaultValue] : defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      // On parse error, reset to default
      return Array.isArray(defaultValue) ? [...defaultValue] : defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getSingleton(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  }

  _saveSingleton(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _truncate(str, maxLen) {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + '…';
  }

  _parseDate(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  _matchesPublishDatePreset(dateStr, preset) {
    const d = this._parseDate(dateStr);
    if (!d) return false;
    const now = new Date();
    switch (preset) {
      case 'last_6_months': {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        return d >= sixMonthsAgo && d <= now;
      }
      case 'before_2020': {
        const cutoff = new Date(2020, 0, 1); // Jan 1, 2020
        return d < cutoff;
      }
      case 'last_7_days': {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= sevenDaysAgo && d <= now;
      }
      case 'last_30_days': {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return d >= thirtyDaysAgo && d <= now;
      }
      case 'all_time':
      default:
        return true;
    }
  }

  _getTopicIdsForEpisode(episode) {
    const topicIds = new Set();
    const episodesTopics = Array.isArray(episode.topic_ids) ? episode.topic_ids : [];
    episodesTopics.forEach((t) => topicIds.add(t));

    const seriesList = this._getFromStorage('series');
    if (episode.series_id) {
      const series = seriesList.find((s) => s.id === episode.series_id);
      if (series && Array.isArray(series.topic_ids)) {
        series.topic_ids.forEach((t) => topicIds.add(t));
      }
    }

    const hosts = this._getFromStorage('hosts');
    const hostIds = Array.isArray(episode.host_ids) ? episode.host_ids : [];
    hostIds.forEach((hid) => {
      const host = hosts.find((h) => h.id === hid);
      if (host && Array.isArray(host.primary_topic_ids)) {
        host.primary_topic_ids.forEach((t) => topicIds.add(t));
      }
    });

    return Array.from(topicIds);
  }

  _getForeignKeyMap() {
    // Map of known foreign key fields to their storage and resolved property name
    return {
      episodeId: { storageKey: 'episodes', propName: 'episode' },
      seriesId: { storageKey: 'series', propName: 'series' },
      hostId: { storageKey: 'hosts', propName: 'host' },
      playlistId: { storageKey: 'playlists', propName: 'playlist' },
      queueId: { storageKey: 'listening_queues', propName: 'queue' },
      playlistItemId: { storageKey: 'playlist_items', propName: 'playlistItem' },
      queueItemId: { storageKey: 'queue_items', propName: 'queueItem' },
      favoriteId: { storageKey: 'episode_favorites', propName: 'favorite' },
      hostFollowId: { storageKey: 'host_follows', propName: 'hostFollow' },
      seriesSubscriptionId: { storageKey: 'series_subscriptions', propName: 'seriesSubscription' },
      ratingId: { storageKey: 'episode_user_ratings', propName: 'rating' },
      commentId: { storageKey: 'episode_comments', propName: 'comment' },
      subscriptionId: { storageKey: 'newsletter_subscriptions', propName: 'subscription' }
    };
  }

  _resolveForeignKeys(data) {
    const fkMap = this._getForeignKeyMap();
    const self = this;

    function resolve(node) {
      if (Array.isArray(node)) {
        return node.map((item) => resolve(item));
      }
      if (!node || typeof node !== 'object') {
        return node;
      }

      const obj = node;

      // Attach resolved foreign objects
      Object.keys(fkMap).forEach((fkKey) => {
        if (Object.prototype.hasOwnProperty.call(obj, fkKey) && obj[fkKey] != null) {
          const cfg = fkMap[fkKey];
          const collection = self._getFromStorage(cfg.storageKey);
          const found = collection.find((e) => e.id === obj[fkKey]) || null;
          obj[cfg.propName] = found;
        }
      });

      // Recurse into properties
      Object.keys(obj).forEach((key) => {
        const val = obj[key];
        if (Array.isArray(val) || (val && typeof val === 'object')) {
          obj[key] = resolve(val);
        }
      });

      return obj;
    }

    return resolve(data);
  }

  // -----------------------
  // Helper functions (per spec)
  // -----------------------

  _getOrCreateListeningQueue() {
    let queues = this._getFromStorage('listening_queues');
    if (queues.length > 0) {
      return queues[0];
    }
    const now = this._nowIso();
    const queue = {
      id: this._generateId('queue'),
      created_at: now,
      updated_at: now
    };
    queues.push(queue);
    this._saveToStorage('listening_queues', queues);
    return queue;
  }

  _persistPlaybackSettings(defaultSpeed, skipSilences, theme) {
    const allowedSpeeds = ['speed_0_75x', 'speed_1x', 'speed_1_25x', 'speed_1_5x', 'speed_2x'];
    const allowedThemes = ['light', 'dark'];

    const errors = [];
    if (!allowedSpeeds.includes(defaultSpeed)) {
      errors.push('Invalid defaultSpeed');
    }
    if (typeof skipSilences !== 'boolean') {
      errors.push('skipSilences must be boolean');
    }
    if (!allowedThemes.includes(theme)) {
      errors.push('Invalid theme');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    let settings = this._getSingleton('playback_settings');
    const now = this._nowIso();

    if (!settings) {
      settings = {
        id: 'playback_settings_default',
        created_at: now
      };
    }

    settings.default_speed = defaultSpeed;
    settings.skip_silences = skipSilences;
    settings.theme = theme;
    settings.updated_at = now;

    this._saveSingleton('playback_settings', settings);
    return { success: true, settings };
  }

  _applyPlaybackDefaultsToPlayer(playbackState, playbackSettings) {
    if (!playbackSettings) {
      playbackSettings = this._getSingleton('playback_settings');
    }
    if (playbackSettings && playbackSettings.default_speed) {
      playbackState.playback_speed = playbackSettings.default_speed;
    }
    return playbackState;
  }

  _persistPlaybackState(state) {
    state.updated_at = this._nowIso();
    this._saveSingleton('playback_states', state);
    return state;
  }

  _validateAccountInput(username, email, password) {
    const errors = [];

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      errors.push('Username must be at least 3 characters.');
    }

    const emailRegex = /.+@.+\..+/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      errors.push('A valid email is required.');
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      errors.push('Password must be at least 8 characters long.');
    } else {
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter.');
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter.');
      }
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one digit.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  _validateNewsletterSelection(email, frequency, topicIds) {
    const errors = [];

    const emailRegex = /.+@.+\..+/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      errors.push('A valid email is required.');
    }

    const allowedFrequencies = ['daily', 'weekly_digest', 'monthly'];
    if (!allowedFrequencies.includes(frequency)) {
      errors.push('Invalid frequency.');
    }

    if (!Array.isArray(topicIds) || topicIds.length === 0) {
      errors.push('At least one topic must be selected.');
    } else {
      const topics = this._getFromStorage('topics');
      const selectableTopicIds = topics
        .filter((t) => t.is_newsletter_selectable !== false ? true : t.is_newsletter_selectable)
        .map((t) => t.id);
      topicIds.forEach((id) => {
        if (!selectableTopicIds.includes(id)) {
          errors.push('Invalid topic id: ' + id);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  // -----------------------
  // Interfaces implementation
  // -----------------------

  // searchSite(query, includeEpisodes, includeSeries, includeHosts)
  searchSite(query, includeEpisodes = true, includeSeries = true, includeHosts = true) {
    const q = (query || '').toLowerCase().trim();

    const episodesAll = this._getFromStorage('episodes');
    const seriesAll = this._getFromStorage('series');
    const hostsAll = this._getFromStorage('hosts');

    const seriesMap = {};
    seriesAll.forEach((s) => {
      seriesMap[s.id] = s;
    });
    const hostsMap = {};
    hostsAll.forEach((h) => {
      hostsMap[h.id] = h;
    });

    let episodes = [];
    if (includeEpisodes && q) {
      episodes = episodesAll.filter((ep) => {
        const title = (ep.title || '').toLowerCase();
        const subtitle = (ep.subtitle || '').toLowerCase();
        const desc = (ep.description || '').toLowerCase();

        // Hierarchical: also search in series title and host names
        const seriesTitle = ep.series_id && seriesMap[ep.series_id] ? (seriesMap[ep.series_id].title || '').toLowerCase() : '';
        const hostNames = Array.isArray(ep.host_ids)
          ? ep.host_ids
              .map((id) => (hostsMap[id] ? hostsMap[id].name || '' : ''))
              .join(' ')
              .toLowerCase()
          : '';

        return (
          title.includes(q) ||
          subtitle.includes(q) ||
          desc.includes(q) ||
          seriesTitle.includes(q) ||
          hostNames.includes(q)
        );
      });
    }

    let episodesResult = episodes.map((ep) => {
      const s = ep.series_id ? seriesMap[ep.series_id] : null;
      const hostNames = Array.isArray(ep.host_ids)
        ? ep.host_ids
            .map((id) => (hostsMap[id] ? hostsMap[id].name : null))
            .filter(Boolean)
        : [];
      return {
        episodeId: ep.id,
        title: ep.title,
        subtitle: ep.subtitle || '',
        durationMinutes: ep.duration_minutes,
        publishDate: ep.publish_date,
        ratingAverage: ep.rating_average,
        hasGuest: ep.has_guest,
        seriesTitle: s ? s.title : null,
        hostNames
      };
    });

    let seriesResult = [];
    if (includeSeries && q) {
      seriesResult = seriesAll
        .filter((s) => {
          const title = (s.title || '').toLowerCase();
          const desc = (s.description || '').toLowerCase();
          return title.includes(q) || desc.includes(q);
        })
        .map((s) => ({
          seriesId: s.id,
          title: s.title,
          description: s.description || '',
          episodeCount: s.episode_count
        }));
    }

    let hostsResult = [];
    if (includeHosts && q) {
      hostsResult = hostsAll
        .filter((h) => {
          const name = (h.name || '').toLowerCase();
          const bio = (h.bio || '').toLowerCase();
          return name.includes(q) || bio.includes(q);
        })
        .map((h) => ({
          hostId: h.id,
          name: h.name,
          bioSnippet: this._truncate(h.bio || '', 200),
          episodeCount: h.episode_count
        }));
    }

    const result = {
      episodes: episodesResult,
      series: seriesResult,
      hosts: hostsResult
    };

    return this._resolveForeignKeys(result);
  }

  // getHomeFeaturedContent()
  getHomeFeaturedContent() {
    const episodes = this._getFromStorage('episodes');
    const seriesAll = this._getFromStorage('series');
    const hostsAll = this._getFromStorage('hosts');

    const seriesMap = {};
    seriesAll.forEach((s) => {
      seriesMap[s.id] = s;
    });
    const hostsMap = {};
    hostsAll.forEach((h) => {
      hostsMap[h.id] = h;
    });

    const featuredEpisodes = episodes
      .filter((ep) => ep.is_featured)
      .map((ep) => {
        const s = ep.series_id ? seriesMap[ep.series_id] : null;
        const hostNames = Array.isArray(ep.host_ids)
          ? ep.host_ids
              .map((id) => (hostsMap[id] ? hostsMap[id].name : null))
              .filter(Boolean)
          : [];
        return {
          episodeId: ep.id,
          title: ep.title,
          subtitle: ep.subtitle || '',
          descriptionSnippet: this._truncate(ep.description || '', 240),
          durationMinutes: ep.duration_minutes,
          publishDate: ep.publish_date,
          ratingAverage: ep.rating_average,
          hasGuest: ep.has_guest,
          audioUrl: ep.audio_url || '',
          seriesTitle: s ? s.title : null,
          hostNames
        };
      });

    const featuredSeries = seriesAll
      .filter((s) => s.is_featured)
      .map((s) => ({
        seriesId: s.id,
        title: s.title,
        description: s.description || '',
        episodeCount: s.episode_count
      }));

    const topicsAll = this._getFromStorage('topics');
    const featuredTopics = topicsAll.filter((t) => t.is_featured);

    const result = {
      featuredEpisodes,
      featuredSeries,
      featuredTopics
    };

    return this._resolveForeignKeys(result);
  }

  // getEpisodeFilterOptions()
  getEpisodeFilterOptions() {
    const durationOptions = [
      { id: 'any', label: 'Any length', minMinutes: 0, maxMinutes: 10000 },
      { id: 'short_0_15', label: '0–15 minutes', minMinutes: 0, maxMinutes: 15 },
      { id: 'medium_15_30', label: '15–30 minutes', minMinutes: 15, maxMinutes: 30 },
      { id: 'medium_20_40', label: '20–40 minutes', minMinutes: 20, maxMinutes: 40 },
      { id: 'long_30_60', label: '30–60 minutes', minMinutes: 30, maxMinutes: 60 },
      { id: 'very_long_60_plus', label: '60+ minutes', minMinutes: 60, maxMinutes: 10000 }
    ];

    const publishDateOptions = [
      { id: 'all_time', label: 'All time', preset: 'all_time' },
      { id: 'last_7_days', label: 'Last 7 days', preset: 'last_7_days' },
      { id: 'last_30_days', label: 'Last 30 days', preset: 'last_30_days' },
      { id: 'last_6_months', label: 'Last 6 months', preset: 'last_6_months' },
      { id: 'before_2020', label: 'Before 2020', preset: 'before_2020' }
    ];

    const ratingOptions = [
      { minRating: 0, label: 'Any rating' },
      { minRating: 3, label: '3 stars & up' },
      { minRating: 4, label: '4 stars & up' },
      { minRating: 4.5, label: '4.5 stars & up' }
    ];

    const guestOptions = [
      { value: true, label: 'Has guest speaker' },
      { value: false, label: 'Solo host only' }
    ];

    const sortOptions = [
      { id: 'relevance', label: 'Relevance' },
      { id: 'newest_first', label: 'Newest first' },
      { id: 'rating_high_to_low', label: 'Rating: High to Low' },
      { id: 'duration_short_to_long', label: 'Duration: Short to Long' },
      { id: 'duration_long_to_short', label: 'Duration: Long to Short' },
      { id: 'most_played', label: 'Most played' }
    ];

    return {
      durationOptions,
      publishDateOptions,
      ratingOptions,
      guestOptions,
      sortOptions
    };
  }

  // searchEpisodes(query, filters, sort, page, pageSize)
  searchEpisodes(query, filters = {}, sort = 'relevance', page = 1, pageSize = 20) {
    const q = (query || '').toLowerCase().trim();
    const episodes = this._getFromStorage('episodes');
    const topics = this._getFromStorage('topics');
    const hosts = this._getFromStorage('hosts');
    const seriesAll = this._getFromStorage('series');
    const favorites = this._getFromStorage('episode_favorites');

    const topicMap = {};
    topics.forEach((t) => {
      topicMap[t.id] = t;
    });
    const hostMap = {};
    hosts.forEach((h) => {
      hostMap[h.id] = h;
    });
    const seriesMap = {};
    seriesAll.forEach((s) => {
      seriesMap[s.id] = s;
    });

    let results = episodes.filter((ep) => {
      // Text query
      if (q) {
        const title = (ep.title || '').toLowerCase();
        const subtitle = (ep.subtitle || '').toLowerCase();
        const desc = (ep.description || '').toLowerCase();
        const seriesTitle = ep.series_id && seriesMap[ep.series_id] ? (seriesMap[ep.series_id].title || '').toLowerCase() : '';
        const hostNames = Array.isArray(ep.host_ids)
          ? ep.host_ids
              .map((id) => (hostMap[id] ? hostMap[id].name || '' : ''))
              .join(' ')
              .toLowerCase()
          : '';

        if (!(
          title.includes(q) ||
          subtitle.includes(q) ||
          desc.includes(q) ||
          seriesTitle.includes(q) ||
          hostNames.includes(q)
        )) {
          return false;
        }
      }

      // Duration filters
      if (typeof filters.minDurationMinutes === 'number' && ep.duration_minutes < filters.minDurationMinutes) {
        return false;
      }
      if (typeof filters.maxDurationMinutes === 'number' && ep.duration_minutes > filters.maxDurationMinutes) {
        return false;
      }

      // Publish date preset
      if (filters.publishDatePreset && !this._matchesPublishDatePreset(ep.publish_date, filters.publishDatePreset)) {
        return false;
      }

      // Rating filter
      if (typeof filters.minRating === 'number' && ep.rating_average < filters.minRating) {
        return false;
      }

      // Guest filter
      if (typeof filters.hasGuest === 'boolean' && ep.has_guest !== filters.hasGuest) {
        return false;
      }

      // Topic filter (hierarchical: episode + series + host topics)
      if (Array.isArray(filters.topicIds) && filters.topicIds.length > 0) {
        const epTopicIds = this._getTopicIdsForEpisode(ep);
        const hasIntersection = filters.topicIds.some((id) => epTopicIds.includes(id));
        if (!hasIntersection) return false;
      }

      // Host filter
      if (Array.isArray(filters.hostIds) && filters.hostIds.length > 0) {
        const epHostIds = Array.isArray(ep.host_ids) ? ep.host_ids : [];
        const hasIntersection = filters.hostIds.some((id) => epHostIds.includes(id));
        if (!hasIntersection) return false;
      }

      // Series filter
      if (filters.seriesId && ep.series_id !== filters.seriesId) {
        return false;
      }

      return true;
    });

    // Sorting
    const sortId = sort || 'relevance';
    results.sort((a, b) => {
      switch (sortId) {
        case 'newest_first':
        case 'relevance': {
          const da = this._parseDate(a.publish_date);
          const db = this._parseDate(b.publish_date);
          return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
        }
        case 'rating_high_to_low':
          return (b.rating_average || 0) - (a.rating_average || 0);
        case 'duration_short_to_long':
          return (a.duration_minutes || 0) - (b.duration_minutes || 0);
        case 'duration_long_to_short':
          return (b.duration_minutes || 0) - (a.duration_minutes || 0);
        case 'most_played':
          return (b.play_count || 0) - (a.play_count || 0);
        default:
          return 0;
      }
    });

    const totalCount = results.length;
    const startIndex = (page - 1) * pageSize;
    const paged = results.slice(startIndex, startIndex + pageSize);

    const items = paged.map((ep) => {
      const series = ep.series_id ? seriesMap[ep.series_id] : null;
      const hostNames = Array.isArray(ep.host_ids)
        ? ep.host_ids
            .map((id) => (hostMap[id] ? hostMap[id].name : null))
            .filter(Boolean)
        : [];
      const topicNames = this._getTopicIdsForEpisode(ep)
        .map((tid) => (topicMap[tid] ? topicMap[tid].name : null))
        .filter(Boolean);
      const isFavorited = favorites.some((f) => f.episode_id === ep.id);

      return {
        episodeId: ep.id,
        title: ep.title,
        subtitle: ep.subtitle || '',
        descriptionSnippet: this._truncate(ep.description || '', 240),
        durationMinutes: ep.duration_minutes,
        publishDate: ep.publish_date,
        ratingAverage: ep.rating_average,
        ratingCount: ep.rating_count,
        playCount: ep.play_count,
        hasGuest: ep.has_guest,
        seriesTitle: series ? series.title : null,
        hostNames,
        topicNames,
        isFavorited
      };
    });

    const result = {
      items,
      totalCount,
      page,
      pageSize
    };

    return this._resolveForeignKeys(result);
  }

  // getEpisodeDetail(episodeId)
  getEpisodeDetail(episodeId) {
    const episodes = this._getFromStorage('episodes');
    const hosts = this._getFromStorage('hosts');
    const guests = this._getFromStorage('guests');
    const seriesAll = this._getFromStorage('series');
    const topics = this._getFromStorage('topics');
    const favorites = this._getFromStorage('episode_favorites');
    const ratings = this._getFromStorage('episode_user_ratings');

    const ep = episodes.find((e) => e.id === episodeId) || null;

    let hostObjs = [];
    let guestObjs = [];
    let seriesObj = null;
    let topicObjs = [];
    let ratingAverage = null;
    let ratingCount = null;
    let playCount = null;
    let isFavorited = false;
    let isInQueue = false;
    let userRating = null;

    if (ep) {
      hostObjs = Array.isArray(ep.host_ids)
        ? hosts.filter((h) => ep.host_ids.includes(h.id))
        : [];
      guestObjs = Array.isArray(ep.guest_ids)
        ? guests.filter((g) => ep.guest_ids.includes(g.id))
        : [];
      seriesObj = ep.series_id ? seriesAll.find((s) => s.id === ep.series_id) || null : null;
      topicObjs = Array.isArray(ep.topic_ids)
        ? topics.filter((t) => ep.topic_ids.includes(t.id))
        : [];
      ratingAverage = ep.rating_average;
      ratingCount = ep.rating_count;
      playCount = ep.play_count;
      isFavorited = favorites.some((f) => f.episode_id === ep.id);

      // Queue membership
      const queues = this._getFromStorage('queue_items');
      isInQueue = queues.some((qi) => qi.episode_id === ep.id);

      const r = ratings.find((r) => r.episode_id === ep.id);
      userRating = r ? r.rating : null;
    }

    const result = {
      episode: ep,
      hosts: hostObjs,
      guests: guestObjs,
      series: seriesObj
        ? {
            seriesId: seriesObj.id,
            title: seriesObj.title,
            description: seriesObj.description || '',
            episodeCount: seriesObj.episode_count
          }
        : null,
      topics: topicObjs,
      ratingAverage,
      ratingCount,
      playCount,
      isFavorited,
      isInQueue,
      userRating
    };

    return this._resolveForeignKeys(result);
  }

  // getEpisodeComments(episodeId, page, pageSize)
  getEpisodeComments(episodeId, page = 1, pageSize = 20) {
    const commentsAll = this._getFromStorage('episode_comments');
    const filtered = commentsAll.filter((c) => c.episode_id === episodeId);

    filtered.sort((a, b) => {
      const da = this._parseDate(a.created_at);
      const db = this._parseDate(b.created_at);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });

    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paged = filtered.slice(startIndex, startIndex + pageSize);

    const result = {
      comments: paged,
      totalCount,
      page,
      pageSize
    };

    return this._resolveForeignKeys(result);
  }

  // addEpisodeToFavorites(episodeId)
  addEpisodeToFavorites(episodeId) {
    const favorites = this._getFromStorage('episode_favorites');
    let existing = favorites.find((f) => f.episode_id === episodeId);
    if (existing) {
      const response = {
        success: true,
        isFavorited: true,
        favoriteId: existing.id,
        message: 'Episode already in favorites.'
      };
      return this._resolveForeignKeys(response);
    }

    const fav = {
      id: this._generateId('fav'),
      episode_id: episodeId,
      created_at: this._nowIso()
    };
    favorites.push(fav);
    this._saveToStorage('episode_favorites', favorites);

    const response = {
      success: true,
      isFavorited: true,
      favoriteId: fav.id,
      message: 'Episode added to favorites.'
    };

    return this._resolveForeignKeys(response);
  }

  // removeEpisodeFromFavorites(episodeId)
  removeEpisodeFromFavorites(episodeId) {
    let favorites = this._getFromStorage('episode_favorites');
    const before = favorites.length;
    favorites = favorites.filter((f) => f.episode_id !== episodeId);
    this._saveToStorage('episode_favorites', favorites);

    const removed = before !== favorites.length;
    const response = {
      success: true,
      isFavorited: false,
      message: removed ? 'Episode removed from favorites.' : 'Episode was not in favorites.'
    };

    return this._resolveForeignKeys(response);
  }

  // createPlaylist(name, description)
  createPlaylist(name, description = '') {
    const playlists = this._getFromStorage('playlists');
    const now = this._nowIso();

    const playlist = {
      id: this._generateId('playlist'),
      name,
      description: description || '',
      created_at: now,
      updated_at: now
    };

    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);

    const response = {
      success: true,
      playlistId: playlist.id,
      playlistName: playlist.name,
      message: 'Playlist created.'
    };

    return this._resolveForeignKeys(response);
  }

  // addEpisodeToPlaylist(episodeId, playlistId)
  addEpisodeToPlaylist(episodeId, playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      return {
        success: false,
        playlistId,
        playlistName: null,
        playlistItemId: null,
        position: null,
        message: 'Playlist not found.'
      };
    }

    const playlistItems = this._getFromStorage('playlist_items');
    const itemsForPlaylist = playlistItems.filter((pi) => pi.playlist_id === playlistId);
    const maxPosition = itemsForPlaylist.reduce((max, item) => (item.position > max ? item.position : max), -1);
    const position = maxPosition + 1;

    const item = {
      id: this._generateId('pli'),
      playlist_id: playlistId,
      episode_id: episodeId,
      position,
      added_at: this._nowIso()
    };

    playlistItems.push(item);
    this._saveToStorage('playlist_items', playlistItems);

    const response = {
      success: true,
      playlistId: playlist.id,
      playlistName: playlist.name,
      playlistItemId: item.id,
      position,
      message: 'Episode added to playlist.'
    };

    return this._resolveForeignKeys(response);
  }

  // getUserPlaylistsSummary()
  getUserPlaylistsSummary() {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');

    const summaries = playlists.map((pl) => {
      const count = playlistItems.filter((pi) => pi.playlist_id === pl.id).length;
      return {
        playlistId: pl.id,
        name: pl.name,
        description: pl.description || '',
        episodeCount: count,
        createdAt: pl.created_at,
        updatedAt: pl.updated_at
      };
    });

    return this._resolveForeignKeys(summaries);
  }

  // getPlaylistDetail(playlistId)
  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');
    const episodes = this._getFromStorage('episodes');

    const playlist = playlists.find((p) => p.id === playlistId) || null;

    const items = playlistItems
      .filter((pi) => pi.playlist_id === playlistId)
      .sort((a, b) => a.position - b.position)
      .map((pi) => {
        const ep = episodes.find((e) => e.id === pi.episode_id) || null;
        return {
          playlistItemId: pi.id,
          position: pi.position,
          addedAt: pi.added_at,
          episode: ep
            ? {
                episodeId: ep.id,
                title: ep.title,
                durationMinutes: ep.duration_minutes,
                publishDate: ep.publish_date,
                ratingAverage: ep.rating_average,
                hasGuest: ep.has_guest
              }
            : null
        };
      });

    const result = {
      playlist,
      items
    };

    return this._resolveForeignKeys(result);
  }

  // reorderPlaylistItems(playlistId, orderedPlaylistItemIds)
  reorderPlaylistItems(playlistId, orderedPlaylistItemIds) {
    const playlistItems = this._getFromStorage('playlist_items');
    const idSet = new Set(orderedPlaylistItemIds || []);

    // Update positions for items in this playlist based on new order
    let position = 0;
    orderedPlaylistItemIds.forEach((id) => {
      const item = playlistItems.find((pi) => pi.id === id && pi.playlist_id === playlistId);
      if (item) {
        item.position = position++;
      }
    });

    // For any items in this playlist not in ordered list, append them
    playlistItems
      .filter((pi) => pi.playlist_id === playlistId && !idSet.has(pi.id))
      .forEach((pi) => {
        pi.position = position++;
      });

    this._saveToStorage('playlist_items', playlistItems);

    return {
      success: true,
      message: 'Playlist items reordered.'
    };
  }

  // removePlaylistItem(playlistItemId)
  removePlaylistItem(playlistItemId) {
    let playlistItems = this._getFromStorage('playlist_items');
    const before = playlistItems.length;
    playlistItems = playlistItems.filter((pi) => pi.id !== playlistItemId);
    this._saveToStorage('playlist_items', playlistItems);

    return {
      success: before !== playlistItems.length,
      message: before !== playlistItems.length ? 'Playlist item removed.' : 'Playlist item not found.'
    };
  }

  // addEpisodeToQueue(episodeId, sourceType)
  addEpisodeToQueue(episodeId, sourceType = 'manual_add') {
    const queue = this._getOrCreateListeningQueue();
    const queueItems = this._getFromStorage('queue_items');

    const itemsForQueue = queueItems.filter((qi) => qi.queue_id === queue.id);
    const maxPosition = itemsForQueue.reduce((max, item) => (item.position > max ? item.position : max), -1);
    const position = maxPosition + 1;

    const item = {
      id: this._generateId('queue_item'),
      queue_id: queue.id,
      episode_id: episodeId,
      position,
      source_type: sourceType,
      added_at: this._nowIso()
    };

    queueItems.push(item);
    this._saveToStorage('queue_items', queueItems);

    // update queue updated_at
    const queues = this._getFromStorage('listening_queues');
    const qIdx = queues.findIndex((q) => q.id === queue.id);
    if (qIdx !== -1) {
      queues[qIdx].updated_at = this._nowIso();
      this._saveToStorage('listening_queues', queues);
    }

    const response = {
      queueId: queue.id,
      queueItemId: item.id,
      position,
      totalItems: itemsForQueue.length + 1,
      success: true,
      message: 'Episode added to queue.'
    };

    return this._resolveForeignKeys(response);
  }

  // getListeningQueue()
  getListeningQueue() {
    const queue = this._getOrCreateListeningQueue();
    const queueItems = this._getFromStorage('queue_items');
    const episodes = this._getFromStorage('episodes');
    const hosts = this._getFromStorage('hosts');
    const seriesAll = this._getFromStorage('series');

    const hostsMap = {};
    hosts.forEach((h) => {
      hostsMap[h.id] = h;
    });

    const seriesMap = {};
    seriesAll.forEach((s) => {
      seriesMap[s.id] = s;
    });

    const items = queueItems
      .filter((qi) => qi.queue_id === queue.id)
      .sort((a, b) => a.position - b.position)
      .map((qi) => {
        const ep = episodes.find((e) => e.id === qi.episode_id) || null;
        let episodeObj = null;
        if (ep) {
          const series = ep.series_id ? seriesMap[ep.series_id] : null;
          const hostNames = Array.isArray(ep.host_ids)
            ? ep.host_ids
                .map((id) => (hostsMap[id] ? hostsMap[id].name : null))
                .filter(Boolean)
            : [];
          episodeObj = {
            episodeId: ep.id,
            title: ep.title,
            durationMinutes: ep.duration_minutes,
            publishDate: ep.publish_date,
            hasGuest: ep.has_guest,
            seriesTitle: series ? series.title : null,
            hostNames
          };
        }
        return {
          queueItemId: qi.id,
          position: qi.position,
          addedAt: qi.added_at,
          sourceType: qi.source_type,
          episode: episodeObj
        };
      });

    const result = {
      queue,
      items
    };

    return this._resolveForeignKeys(result);
  }

  // reorderQueueItems(orderedQueueItemIds)
  reorderQueueItems(orderedQueueItemIds) {
    const queueItems = this._getFromStorage('queue_items');
    const idSet = new Set(orderedQueueItemIds || []);

    let position = 0;
    orderedQueueItemIds.forEach((id) => {
      const item = queueItems.find((qi) => qi.id === id);
      if (item) {
        item.position = position++;
      }
    });

    // Append any remaining items in their existing relative order
    queueItems
      .filter((qi) => !idSet.has(qi.id))
      .sort((a, b) => a.position - b.position)
      .forEach((qi) => {
        qi.position = position++;
      });

    this._saveToStorage('queue_items', queueItems);

    return {
      success: true,
      message: 'Queue items reordered.'
    };
  }

  // removeQueueItem(queueItemId)
  removeQueueItem(queueItemId) {
    let queueItems = this._getFromStorage('queue_items');
    const before = queueItems.length;
    queueItems = queueItems.filter((qi) => qi.id !== queueItemId);
    this._saveToStorage('queue_items', queueItems);

    return {
      success: before !== queueItems.length,
      message: before !== queueItems.length ? 'Queue item removed.' : 'Queue item not found.'
    };
  }

  // clearQueue()
  clearQueue() {
    const queue = this._getOrCreateListeningQueue();
    let queueItems = this._getFromStorage('queue_items');
    const before = queueItems.length;
    const remaining = queueItems.filter((qi) => qi.queue_id !== queue.id);
    const clearedItemCount = before - remaining.length;
    this._saveToStorage('queue_items', remaining);

    return {
      success: true,
      clearedItemCount
    };
  }

  // getLibraryContents()
  getLibraryContents() {
    const favorites = this._getFromStorage('episode_favorites');
    const episodes = this._getFromStorage('episodes');

    const favoritesList = favorites
      .map((f) => {
        const ep = episodes.find((e) => e.id === f.episode_id);
        if (!ep) return null;
        return {
          episodeId: ep.id,
          title: ep.title,
          durationMinutes: ep.duration_minutes,
          publishDate: ep.publish_date,
          ratingAverage: ep.rating_average
        };
      })
      .filter(Boolean);

    const playlistsSummary = this.getUserPlaylistsSummary();

    const queueData = this.getListeningQueue();
    const queueSummary = {
      queueId: queueData.queue ? queueData.queue.id : null,
      itemCount: Array.isArray(queueData.items) ? queueData.items.length : 0
    };

    const result = {
      favorites: favoritesList,
      playlists: playlistsSummary,
      queueSummary
    };

    return this._resolveForeignKeys(result);
  }

  // getPlaybackSettings()
  getPlaybackSettings() {
    const settings = this._getSingleton('playback_settings');

    const availableSpeeds = [
      { id: 'speed_0_75x', label: '0.75x' },
      { id: 'speed_1x', label: '1x' },
      { id: 'speed_1_25x', label: '1.25x' },
      { id: 'speed_1_5x', label: '1.5x' },
      { id: 'speed_2x', label: '2x' }
    ];

    const availableThemes = [
      { id: 'light', label: 'Light' },
      { id: 'dark', label: 'Dark' }
    ];

    return {
      settings,
      availableSpeeds,
      availableThemes
    };
  }

  // updatePlaybackSettings(defaultSpeed, skipSilences, theme)
  updatePlaybackSettings(defaultSpeed, skipSilences, theme) {
    const result = this._persistPlaybackSettings(defaultSpeed, skipSilences, theme);
    if (!result.success) {
      return {
        success: false,
        settings: null,
        message: result.errors.join(' ')
      };
    }

    return {
      success: true,
      settings: result.settings,
      message: 'Playback settings updated.'
    };
  }

  // getPlaybackState()
  getPlaybackState() {
    const state = this._getSingleton('playback_states');
    return { state };
  }

  // startEpisodePlayback(episodeId, startPositionSeconds)
  startEpisodePlayback(episodeId, startPositionSeconds = 0) {
    let state = this._getSingleton('playback_states');
    if (!state) {
      state = {
        id: 'playback_state_default',
        current_episode_id: null,
        is_playing: false,
        position_seconds: 0,
        playback_speed: 'speed_1x',
        updated_at: this._nowIso()
      };
    }

    state.current_episode_id = episodeId;
    state.is_playing = true;
    state.position_seconds = typeof startPositionSeconds === 'number' ? startPositionSeconds : 0;

    const settings = this._getSingleton('playback_settings');
    state = this._applyPlaybackDefaultsToPlayer(state, settings);
    state = this._persistPlaybackState(state);

    return { state };
  }

  // updatePlaybackPosition(positionSeconds)
  updatePlaybackPosition(positionSeconds) {
    let state = this._getSingleton('playback_states');
    if (!state) {
      state = {
        id: 'playback_state_default',
        current_episode_id: null,
        is_playing: false,
        position_seconds: 0,
        playback_speed: 'speed_1x',
        updated_at: this._nowIso()
      };
    }

    state.position_seconds = typeof positionSeconds === 'number' ? positionSeconds : state.position_seconds;
    state = this._persistPlaybackState(state);

    return { state };
  }

  // pausePlayback()
  pausePlayback() {
    let state = this._getSingleton('playback_states');
    if (!state) {
      state = {
        id: 'playback_state_default',
        current_episode_id: null,
        is_playing: false,
        position_seconds: 0,
        playback_speed: 'speed_1x',
        updated_at: this._nowIso()
      };
    }

    state.is_playing = false;
    state = this._persistPlaybackState(state);

    return { state };
  }

  // resumePlayback()
  resumePlayback() {
    let state = this._getSingleton('playback_states');
    if (!state) {
      state = {
        id: 'playback_state_default',
        current_episode_id: null,
        is_playing: false,
        position_seconds: 0,
        playback_speed: 'speed_1x',
        updated_at: this._nowIso()
      };
    }

    if (state.current_episode_id) {
      state.is_playing = true;
    }
    state = this._persistPlaybackState(state);

    return { state };
  }

  // searchHosts(query, minEpisodes, sort)
  searchHosts(query, minEpisodes, sort = 'name_az') {
    const q = (query || '').toLowerCase().trim();
    const hosts = this._getFromStorage('hosts');
    const topics = this._getFromStorage('topics');
    const follows = this._getFromStorage('host_follows');

    const topicMap = {};
    topics.forEach((t) => {
      topicMap[t.id] = t;
    });

    let filtered = hosts.filter((h) => {
      if (typeof minEpisodes === 'number' && h.episode_count < minEpisodes) {
        return false;
      }
      if (q) {
        const name = (h.name || '').toLowerCase();
        const bio = (h.bio || '').toLowerCase();
        return name.includes(q) || bio.includes(q);
      }
      return true;
    });

    switch (sort) {
      case 'episode_count_desc':
        filtered.sort((a, b) => (b.episode_count || 0) - (a.episode_count || 0));
        break;
      case 'follower_count_desc':
        filtered.sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0));
        break;
      case 'name_az':
      default:
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
    }

    const result = filtered.map((h) => {
      const primaryTopicNames = Array.isArray(h.primary_topic_ids)
        ? h.primary_topic_ids
            .map((id) => (topicMap[id] ? topicMap[id].name : null))
            .filter(Boolean)
        : [];
      const isFollowed = follows.some((f) => f.host_id === h.id);

      return {
        hostId: h.id,
        name: h.name,
        bioSnippet: this._truncate(h.bio || '', 240),
        episodeCount: h.episode_count,
        primaryTopicNames,
        isFollowed
      };
    });

    return this._resolveForeignKeys(result);
  }

  // getHostFilterOptions()
  getHostFilterOptions() {
    const minEpisodePresets = [
      { value: 0, label: 'Any number of episodes' },
      { value: 5, label: '5+ episodes' },
      { value: 10, label: '10+ episodes' },
      { value: 25, label: '25+ episodes' }
    ];

    const sortOptions = [
      { id: 'name_az', label: 'Name A–Z' },
      { id: 'episode_count_desc', label: 'Most episodes' },
      { id: 'follower_count_desc', label: 'Most followed' }
    ];

    return {
      minEpisodePresets,
      sortOptions
    };
  }

  // getHostDetail(hostId)
  getHostDetail(hostId) {
    const hosts = this._getFromStorage('hosts');
    const topics = this._getFromStorage('topics');
    const episodes = this._getFromStorage('episodes');
    const follows = this._getFromStorage('host_follows');

    const host = hosts.find((h) => h.id === hostId) || null;

    const topicMap = {};
    topics.forEach((t) => {
      topicMap[t.id] = t;
    });

    const primaryTopicNames = host && Array.isArray(host.primary_topic_ids)
      ? host.primary_topic_ids
          .map((id) => (topicMap[id] ? topicMap[id].name : null))
          .filter(Boolean)
      : [];

    const isFollowed = host ? follows.some((f) => f.host_id === host.id) : false;

    const hostEpisodes = episodes
      .filter((ep) => Array.isArray(ep.host_ids) && ep.host_ids.includes(hostId))
      .map((ep) => ({
        episodeId: ep.id,
        title: ep.title,
        durationMinutes: ep.duration_minutes,
        publishDate: ep.publish_date,
        ratingAverage: ep.rating_average,
        hasGuest: ep.has_guest
      }));

    const result = {
      host,
      primaryTopicNames,
      isFollowed,
      episodes: hostEpisodes
    };

    return this._resolveForeignKeys(result);
  }

  // followHost(hostId)
  followHost(hostId) {
    const follows = this._getFromStorage('host_follows');
    let existing = follows.find((f) => f.host_id === hostId);
    if (existing) {
      const response = {
        isFollowed: true,
        hostFollowId: existing.id,
        message: 'Already following host.'
      };
      return this._resolveForeignKeys(response);
    }

    const follow = {
      id: this._generateId('host_follow'),
      host_id: hostId,
      created_at: this._nowIso()
    };
    follows.push(follow);
    this._saveToStorage('host_follows', follows);

    const response = {
      isFollowed: true,
      hostFollowId: follow.id,
      message: 'Host followed.'
    };

    return this._resolveForeignKeys(response);
  }

  // unfollowHost(hostId)
  unfollowHost(hostId) {
    let follows = this._getFromStorage('host_follows');
    const before = follows.length;
    follows = follows.filter((f) => f.host_id !== hostId);
    this._saveToStorage('host_follows', follows);

    return {
      isFollowed: false,
      message: before !== follows.length ? 'Host unfollowed.' : 'Host was not followed.'
    };
  }

  // searchSeries(query, sort)
  searchSeries(query, sort = 'title_az') {
    const q = (query || '').toLowerCase().trim();
    const seriesAll = this._getFromStorage('series');
    const subs = this._getFromStorage('series_subscriptions');

    let filtered = seriesAll.filter((s) => {
      if (!q) return true;
      const title = (s.title || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      return title.includes(q) || desc.includes(q);
    });

    switch (sort) {
      case 'episode_count_desc':
        filtered.sort((a, b) => (b.episode_count || 0) - (a.episode_count || 0));
        break;
      case 'title_az':
      default:
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
    }

    const result = filtered.map((s) => ({
      seriesId: s.id,
      title: s.title,
      description: s.description || '',
      episodeCount: s.episode_count,
      isSubscribed: subs.some((sub) => sub.series_id === s.id)
    }));

    return this._resolveForeignKeys(result);
  }

  // getSeriesDetail(seriesId)
  getSeriesDetail(seriesId) {
    const seriesAll = this._getFromStorage('series');
    const topics = this._getFromStorage('topics');
    const episodes = this._getFromStorage('episodes');
    const subs = this._getFromStorage('series_subscriptions');

    const series = seriesAll.find((s) => s.id === seriesId) || null;

    const topicMap = {};
    topics.forEach((t) => {
      topicMap[t.id] = t;
    });

    const topicsForSeries = series && Array.isArray(series.topic_ids)
      ? series.topic_ids
          .map((id) => topicMap[id])
          .filter(Boolean)
      : [];

    const isSubscribed = series ? subs.some((sub) => sub.series_id === series.id) : false;

    const episodesForSeries = episodes
      .filter((ep) => ep.series_id === seriesId)
      .sort((a, b) => {
        // Latest at the top (descending by publish date)
        const da = this._parseDate(a.publish_date);
        const db = this._parseDate(b.publish_date);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      })
      .map((ep) => ({
        episodeId: ep.id,
        title: ep.title,
        episodeNumber: ep.episode_number,
        durationMinutes: ep.duration_minutes,
        publishDate: ep.publish_date,
        ratingAverage: ep.rating_average,
        hasGuest: ep.has_guest
      }));

    const result = {
      series,
      isSubscribed,
      topics: topicsForSeries,
      episodes: episodesForSeries
    };

    return this._resolveForeignKeys(result);
  }

  // subscribeToSeries(seriesId)
  subscribeToSeries(seriesId) {
    const subs = this._getFromStorage('series_subscriptions');
    let existing = subs.find((s) => s.series_id === seriesId);
    if (existing) {
      const response = {
        isSubscribed: true,
        seriesSubscriptionId: existing.id,
        message: 'Already subscribed to series.'
      };
      return this._resolveForeignKeys(response);
    }

    const sub = {
      id: this._generateId('series_sub'),
      series_id: seriesId,
      created_at: this._nowIso()
    };
    subs.push(sub);
    this._saveToStorage('series_subscriptions', subs);

    const response = {
      isSubscribed: true,
      seriesSubscriptionId: sub.id,
      message: 'Subscribed to series.'
    };

    return this._resolveForeignKeys(response);
  }

  // unsubscribeFromSeries(seriesId)
  unsubscribeFromSeries(seriesId) {
    let subs = this._getFromStorage('series_subscriptions');
    const before = subs.length;
    subs = subs.filter((s) => s.series_id !== seriesId);
    this._saveToStorage('series_subscriptions', subs);

    return {
      isSubscribed: false,
      message: before !== subs.length ? 'Unsubscribed from series.' : 'Series was not subscribed.'
    };
  }

  // getTopicsListing()
  getTopicsListing() {
    return this._getFromStorage('topics');
  }

  // rateEpisode(episodeId, rating)
  rateEpisode(episodeId, rating) {
    let r = Number(rating);
    if (!Number.isFinite(r)) {
      r = 0;
    }
    if (r < 1) r = 1;
    if (r > 5) r = 5;

    const ratings = this._getFromStorage('episode_user_ratings');
    let record = ratings.find((x) => x.episode_id === episodeId);
    const now = this._nowIso();

    if (record) {
      record.rating = r;
      record.rated_at = now;
    } else {
      record = {
        id: this._generateId('rating'),
        episode_id: episodeId,
        rating: r,
        rated_at: now
      };
      ratings.push(record);
    }
    this._saveToStorage('episode_user_ratings', ratings);

    // Update aggregate on Episode
    const episodes = this._getFromStorage('episodes');
    const ep = episodes.find((e) => e.id === episodeId);
    if (ep) {
      const epRatings = ratings.filter((x) => x.episode_id === episodeId);
      const count = epRatings.length;
      const avg = count > 0 ? epRatings.reduce((sum, x) => sum + (x.rating || 0), 0) / count : 0;
      ep.rating_count = count;
      ep.rating_average = Number(avg.toFixed(2));
      ep.updated_at = now;
      this._saveToStorage('episodes', episodes);
    }

    return {
      userRating: r,
      ratingAverage: ep ? ep.rating_average : null,
      ratingCount: ep ? ep.rating_count : null
    };
  }

  // addEpisodeComment(episodeId, content)
  addEpisodeComment(episodeId, content) {
    const comments = this._getFromStorage('episode_comments');
    const now = this._nowIso();

    const comment = {
      id: this._generateId('comment'),
      episode_id: episodeId,
      content: content || '',
      created_at: now,
      updated_at: null
    };

    comments.push(comment);
    this._saveToStorage('episode_comments', comments);

    return {
      comment
    };
  }

  // getNewsletterConfig()
  getNewsletterConfig() {
    const topics = this._getFromStorage('topics');
    const selectableTopics = topics
      .filter((t) => (typeof t.is_newsletter_selectable === 'boolean' ? t.is_newsletter_selectable : true))
      .map((t) => ({
        topicId: t.id,
        name: t.name,
        description: t.description || ''
      }));

    const frequencies = [
      { id: 'daily', label: 'Daily' },
      { id: 'weekly_digest', label: 'Weekly digest' },
      { id: 'monthly', label: 'Monthly' }
    ];

    return {
      frequencies,
      topics: selectableTopics
    };
  }

  // createNewsletterSubscription(email, frequency, topicIds)
  createNewsletterSubscription(email, frequency, topicIds) {
    const validation = this._validateNewsletterSelection(email, frequency, topicIds);
    if (!validation.isValid) {
      return {
        subscription: null,
        success: false,
        message: validation.errors.join(' ')
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions');
    const now = this._nowIso();

    let subscription = subs.find((s) => s.email === email) || null;

    if (subscription) {
      subscription.frequency = frequency;
      subscription.topic_ids = topicIds;
      subscription.is_active = true;
      subscription.updated_at = now;
    } else {
      subscription = {
        id: this._generateId('newsletter_sub'),
        email,
        frequency,
        topic_ids: topicIds,
        is_active: true,
        created_at: now,
        updated_at: null
      };
      subs.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription,
      success: true,
      message: 'Newsletter subscription saved.'
    };
  }

  // createAccount(username, email, password)
  createAccount(username, email, password) {
    const validation = this._validateAccountInput(username, email, password);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        message: 'Account validation failed.'
      };
    }

    const users = this._getFromStorage('users');

    if (users.some((u) => u.email === email)) {
      const errors = ['Email is already in use.'];
      return {
        success: false,
        errors,
        message: 'Account creation failed.'
      };
    }

    const now = this._nowIso();
    const user = {
      id: this._generateId('user'),
      username,
      email,
      // For this business-logic-only implementation, store password as-is.
      // In a real system this must be hashed.
      password,
      created_at: now,
      updated_at: now
    };

    users.push(user);
    this._saveToStorage('users', users);

    // Manage login state internally (single-user context)
    localStorage.setItem('currentUserId', user.id);

    return {
      success: true,
      errors: [],
      message: 'Account created successfully.'
    };
  }

  // getAboutContent()
  getAboutContent() {
    return this._getSingleton('about_content');
  }

  // getHelpContent()
  getHelpContent() {
    return this._getSingleton('help_content');
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return this._getSingleton('privacy_policy_content');
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    return this._getSingleton('terms_of_use_content');
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
