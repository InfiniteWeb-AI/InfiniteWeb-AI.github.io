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
  }

  // =========================
  // Initialization & Helpers
  // =========================

  _initStorage() {
    const collections = [
      'accounts',
      'subscription_plans',
      'subscriptions',
      'subscription_plan_changes',
      'payment_methods',
      'titles',
      'seasons',
      'episodes',
      'profiles',
      'parental_controls',
      'playback_settings',
      'watchlists',
      'watchlist_items',
      'custom_lists',
      'custom_list_items',
      'up_next_queues',
      'up_next_items',
      'viewing_history_items',
      'episode_reminders',
      'recommendation_rows'
    ];

    collections.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // checkout_session/current_* are transient; no need to init
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
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

  _nowIso() {
    return new Date().toISOString();
  }

  _qualityRank(quality) {
    const order = {
      sd: 1,
      hd_720p: 2,
      full_hd_1080p: 3,
      ultra_hd_4k: 4
    };
    return order[quality] || 0;
  }

  _inferCardBrand(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') return 'other';
    const first = cardNumber.trim()[0];
    if (first === '4') return 'visa';
    if (first === '5') return 'mastercard';
    if (first === '3') return 'amex';
    if (first === '6') return 'discover';
    return 'other';
  }

  _getEffectiveReleaseYear(title) {
    if (title && typeof title.release_year === 'number') {
      return title.release_year;
    }
    if (!title || title.category !== 'series') return null;
    const seasons = this._getFromStorage('seasons', []);
    const forTitle = seasons.filter((s) => s.title_id === title.id && typeof s.release_year === 'number');
    if (forTitle.length === 0) return null;
    return forTitle.reduce((min, s) => (s.release_year < min ? s.release_year : min), forTitle[0].release_year);
  }

  // =========================
  // Private helpers (required)
  // =========================

  _getCurrentAccount() {
    let accounts = this._getFromStorage('accounts', []);

    // Lazily synthesize a default account + subscription when none exist but
    // test data (profiles/plans) has been loaded. This allows account-related
    // flows (like plan management) to work in a fresh environment.
    if (accounts.length === 0) {
      const profiles = this._getFromStorage('profiles', []);
      const plans = this._getFromStorage('subscription_plans', []).filter((p) => p.is_active);

      if (profiles.length === 0 || plans.length === 0) {
        return null;
      }

      const now = this._nowIso();
      const defaultProfile = profiles[0];
      const plan = plans[0];

      const subscriptionId = this._generateId('sub');
      const subscription = {
        id: subscriptionId,
        plan_id: plan.id,
        status: 'active',
        start_date: now,
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        auto_renew: true,
        cancellation_date: null,
        last_plan_change_date: now
      };

      const account = {
        id: this._generateId('acct'),
        full_name: defaultProfile.name || 'Main User',
        email: 'default_user@example.com',
        password: '',
        created_at: now,
        current_subscription_id: subscriptionId,
        default_profile_id: defaultProfile.id
      };

      accounts.push(account);
      this._saveToStorage('accounts', accounts);

      const subscriptions = this._getFromStorage('subscriptions', []);
      subscriptions.push(subscription);
      this._saveToStorage('subscriptions', subscriptions);

      localStorage.setItem('current_account_id', account.id);
      if (!localStorage.getItem('current_profile_id')) {
        localStorage.setItem('current_profile_id', defaultProfile.id);
      }
    }

    let accountId = localStorage.getItem('current_account_id');
    let account = null;
    if (accountId) {
      account = accounts.find((a) => a.id === accountId) || null;
    }
    if (!account) {
      // fallback to first account in single-account context
      account = accounts[0];
      localStorage.setItem('current_account_id', account.id);
    }
    return account;
  }

  _getCurrentProfile() {
    const profiles = this._getFromStorage('profiles', []);
    if (profiles.length === 0) return null;

    let profileId = localStorage.getItem('current_profile_id');
    let profile = null;
    if (profileId) {
      profile = profiles.find((p) => p.id === profileId) || null;
    }

    if (!profile) {
      const account = this._getCurrentAccount();
      if (account && account.default_profile_id) {
        profile = profiles.find((p) => p.id === account.default_profile_id) || null;
      }
    }

    if (!profile) {
      // fallback to first profile
      profile = profiles[0];
      localStorage.setItem('current_profile_id', profile.id);
    }

    return profile;
  }

  _getCurrentSubscription() {
    const account = this._getCurrentAccount();
    if (!account || !account.current_subscription_id) return null;
    const subscriptions = this._getFromStorage('subscriptions', []);
    return subscriptions.find((s) => s.id === account.current_subscription_id) || null;
  }

  _getOrCreateWatchlist() {
    const profile = this._getCurrentProfile();
    const profileId = profile ? profile.id : null;
    let watchlists = this._getFromStorage('watchlists', []);
    let watchlist = watchlists.find(
      (w) => w.profile_id === profileId && w.name === 'Watchlist'
    );
    if (!watchlist) {
      const now = this._nowIso();
      watchlist = {
        id: this._generateId('watchlist'),
        profile_id: profileId,
        name: 'Watchlist',
        created_at: now,
        updated_at: now
      };
      watchlists.push(watchlist);
      this._saveToStorage('watchlists', watchlists);
    }
    return watchlist;
  }

  _getOrCreateUpNextQueue() {
    const profile = this._getCurrentProfile();
    const profileId = profile ? profile.id : null;
    let queues = this._getFromStorage('up_next_queues', []);
    let queue = queues.find((q) => q.profile_id === profileId) || null;
    if (!queue) {
      const now = this._nowIso();
      queue = {
        id: this._generateId('upnextq'),
        profile_id: profileId,
        created_at: now,
        updated_at: now
      };
      queues.push(queue);
      this._saveToStorage('up_next_queues', queues);
    }
    return queue;
  }

  _getOrCreatePlaybackSettings() {
    const profile = this._getCurrentProfile();
    const profileId = profile ? profile.id : null;
    let settingsArr = this._getFromStorage('playback_settings', []);
    let settings = settingsArr.find((s) => s.profile_id === profileId) || null;
    if (!settings) {
      const now = this._nowIso();
      settings = {
        id: this._generateId('playback'),
        profile_id: profileId,
        default_subtitle_language: 'off',
        default_audio_track: 'original',
        default_audio_language: 'english',
        apply_to_all_videos: false,
        last_updated: now
      };
      settingsArr.push(settings);
      this._saveToStorage('playback_settings', settingsArr);
    }
    return settings;
  }

  _getCheckoutSession() {
    const data = this._getFromStorage('checkout_session', null);
    if (data) return data;
    const session = {
      selected_plan_id: null,
      has_existing_account: !!this._getCurrentAccount()
    };
    this._saveToStorage('checkout_session', session);
    return session;
  }

  // =========================
  // Interface implementations
  // =========================

  // --- Homepage Content ---

  getHomePageContent() {
    const profile = this._getCurrentProfile();
    const profileId = profile ? profile.id : null;

    const rowsRaw = this._getFromStorage('recommendation_rows', []);
    const titles = this._getFromStorage('titles', []);

    let watchlistItemTitleIds = new Set();
    if (profile) {
      const watchlist = this._getOrCreateWatchlist();
      const watchlistItems = this._getFromStorage('watchlist_items', []);
      watchlistItems
        .filter((wi) => wi.watchlist_id === watchlist.id)
        .forEach((wi) => watchlistItemTitleIds.add(wi.title_id));
    }

    const rows = rowsRaw
      .filter((row) => !row.profile_id || row.profile_id === profileId)
      .map((row) => {
        const items = (row.items || []).map((titleId) => {
          const title = titles.find((t) => t.id === titleId) || null;
          if (!title) {
            return null;
          }
          return {
            title_id: title.id,
            name: title.name,
            category: title.category,
            main_genre: title.main_genre,
            average_rating: title.average_rating || 0,
            rating_count: title.rating_count || 0,
            duration_minutes: title.duration_minutes || null,
            release_year: title.release_year || this._getEffectiveReleaseYear(title) || null,
            thumbnail_image_url: title.thumbnail_image_url || null,
            is_in_watchlist: watchlistItemTitleIds.has(title.id),
            // Foreign key resolution helper object
            title: title
          };
        }).filter(Boolean);

        return {
          row_id: row.id,
          code: row.code,
          name: row.name,
          description: row.description || '',
          items
        };
      });

    return { rows };
  }

  // --- Search Titles ---

  searchTitles(query, filters, sortBy, page, pageSize) {
    query = (query || '').toLowerCase();
    filters = filters || {};
    sortBy = sortBy || 'relevance';
    page = page || 1;
    pageSize = pageSize || 20;

    const titles = this._getFromStorage('titles', []);
    const episodes = this._getFromStorage('episodes', []);

    // Watchlist info for is_in_watchlist
    const profile = this._getCurrentProfile();
    let watchlistItemTitleIds = new Set();
    if (profile) {
      const watchlist = this._getOrCreateWatchlist();
      const watchlistItems = this._getFromStorage('watchlist_items', []);
      watchlistItems
        .filter((wi) => wi.watchlist_id === watchlist.id)
        .forEach((wi) => watchlistItemTitleIds.add(wi.title_id));
    }

    let results = titles.filter((t) => {
      if (query) {
        const name = (t.name || '').toLowerCase();
        const mainGenre = (t.main_genre || '').toLowerCase().replace(/_/g, ' ');
        const genres = Array.isArray(t.genres) ? t.genres.join(' ') : '';
        const genresStr = genres.toLowerCase().replace(/_/g, ' ');
        const haystack = name + ' ' + mainGenre + ' ' + genresStr;
        if (!haystack.includes(query)) {
          return false;
        }
      }
      if (filters.category && t.category !== filters.category) {
        return false;
      }
      if (typeof filters.minRating === 'number') {
        const rating = typeof t.average_rating === 'number' ? t.average_rating : 0;
        if (rating < filters.minRating) return false;
      }
      if (typeof filters.maxDurationMinutes === 'number') {
        if (typeof t.duration_minutes === 'number' && t.duration_minutes > filters.maxDurationMinutes) {
          return false;
        }
      }
      if (typeof filters.minReleaseYear === 'number') {
        const year = this._getEffectiveReleaseYear(t);
        if (!year || year < filters.minReleaseYear) return false;
      }
      if (typeof filters.maxEpisodeRuntimeMinutes === 'number') {
        if (t.category !== 'series') return false;
        const hasShortEp = episodes.some(
          (e) => e.title_id === t.id && e.runtime_minutes <= filters.maxEpisodeRuntimeMinutes
        );
        if (!hasShortEp) return false;
      }
      return true;
    });

    // Sorting
    results = results.slice();
    if (sortBy === 'rating_desc') {
      results.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === 'rating_asc') {
      results.sort((a, b) => (a.average_rating || 0) - (b.average_rating || 0));
    } else if (sortBy === 'release_year_desc') {
      results.sort((a, b) => (this._getEffectiveReleaseYear(b) || 0) - (this._getEffectiveReleaseYear(a) || 0));
    } else if (sortBy === 'release_year_asc') {
      results.sort((a, b) => (this._getEffectiveReleaseYear(a) || 0) - (this._getEffectiveReleaseYear(b) || 0));
    }
    // 'relevance' keeps insertion order

    const total_results = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    const mapped = paged.map((t) => ({
      title_id: t.id,
      name: t.name,
      category: t.category,
      main_genre: t.main_genre,
      average_rating: t.average_rating || 0,
      rating_count: t.rating_count || 0,
      duration_minutes: t.duration_minutes || null,
      release_year: this._getEffectiveReleaseYear(t) || null,
      thumbnail_image_url: t.thumbnail_image_url || null,
      is_in_watchlist: watchlistItemTitleIds.has(t.id),
      // full title object for FK resolution
      title: t
    }));

    return {
      results: mapped,
      total_results,
      page,
      pageSize
    };
  }

  // --- Browse Titles ---

  getBrowseTitles(category, filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'popularity_desc';
    page = page || 1;
    pageSize = pageSize || 20;

    const titles = this._getFromStorage('titles', []);

    // Watchlist info
    const profile = this._getCurrentProfile();
    let watchlistItemTitleIds = new Set();
    if (profile) {
      const watchlist = this._getOrCreateWatchlist();
      const watchlistItems = this._getFromStorage('watchlist_items', []);
      watchlistItems
        .filter((wi) => wi.watchlist_id === watchlist.id)
        .forEach((wi) => watchlistItemTitleIds.add(wi.title_id));
    }

    let results = titles.filter((t) => {
      if (t.category !== category) return false;
      if (filters.genre && t.main_genre !== filters.genre) return false;
      if (typeof filters.minRating === 'number') {
        const rating = typeof t.average_rating === 'number' ? t.average_rating : 0;
        if (rating < filters.minRating) return false;
      }
      if (typeof filters.maxDurationMinutes === 'number') {
        if (typeof t.duration_minutes === 'number' && t.duration_minutes > filters.maxDurationMinutes) {
          return false;
        }
      }
      if (typeof filters.hasAtLeastOneSeason === 'boolean') {
        const flag = !!t.has_at_least_one_season;
        if (filters.hasAtLeastOneSeason !== flag) return false;
      }
      return true;
    });

    // Sorting
    results = results.slice();
    if (sortBy === 'rating_desc') {
      results.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === 'rating_asc') {
      results.sort((a, b) => (a.average_rating || 0) - (b.average_rating || 0));
    } else if (sortBy === 'release_year_desc') {
      results.sort((a, b) => (this._getEffectiveReleaseYear(b) || 0) - (this._getEffectiveReleaseYear(a) || 0));
    } else if (sortBy === 'release_year_asc') {
      results.sort((a, b) => (this._getEffectiveReleaseYear(a) || 0) - (this._getEffectiveReleaseYear(b) || 0));
    } else if (sortBy === 'popularity_desc') {
      results.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
    }

    const total_results = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    const mapped = paged.map((t) => ({
      title_id: t.id,
      name: t.name,
      category: t.category,
      main_genre: t.main_genre,
      average_rating: t.average_rating || 0,
      rating_count: t.rating_count || 0,
      duration_minutes: t.duration_minutes || null,
      release_year: this._getEffectiveReleaseYear(t) || null,
      has_at_least_one_season: !!t.has_at_least_one_season,
      thumbnail_image_url: t.thumbnail_image_url || null,
      is_in_watchlist: watchlistItemTitleIds.has(t.id),
      title: t
    }));

    return {
      results: mapped,
      page,
      pageSize,
      total_results,
      applied_filters: {
        genre: filters.genre || null,
        minRating: typeof filters.minRating === 'number' ? filters.minRating : null,
        maxDurationMinutes: typeof filters.maxDurationMinutes === 'number' ? filters.maxDurationMinutes : null,
        hasAtLeastOneSeason:
          typeof filters.hasAtLeastOneSeason === 'boolean' ? filters.hasAtLeastOneSeason : null
      }
    };
  }

  // --- Title Details ---

  getTitleDetails(titleId) {
    const titles = this._getFromStorage('titles', []);
    const seasonsStore = this._getFromStorage('seasons', []);
    let episodesStore = this._getFromStorage('episodes', []);

    const title = titles.find((t) => t.id === titleId) || null;
    if (!title) {
      return { title: null, seasons: [] };
    }

    // Watchlist flag
    const profile = this._getCurrentProfile();
    let isInWatchlist = false;
    if (profile) {
      const watchlist = this._getOrCreateWatchlist();
      const watchlistItems = this._getFromStorage('watchlist_items', []);
      isInWatchlist = watchlistItems.some(
        (wi) => wi.watchlist_id === watchlist.id && wi.title_id === title.id
      );
    }

    const seasons = [];
    if (title.category === 'series') {
      const seasonsForTitle = seasonsStore
        .filter((s) => s.title_id === title.id)
        .sort((a, b) => a.season_number - b.season_number);

      for (const s of seasonsForTitle) {
        let eps = episodesStore
          .filter((e) => e.season_id === s.id)
          .sort((a, b) => a.episode_number - b.episode_number);

        // If season metadata indicates episodes but none are stored, synthesize basic episodes
        if (eps.length === 0 && typeof s.episode_count === 'number' && s.episode_count > 0) {
          let maxEpisodeNumber = 0;
          const existingForSeason = episodesStore.filter((e) => e.season_id === s.id);
          existingForSeason.forEach((e) => {
            if (typeof e.episode_number === 'number' && e.episode_number > maxEpisodeNumber) {
              maxEpisodeNumber = e.episode_number;
            }
          });
          for (let n = maxEpisodeNumber + 1; n <= s.episode_count; n++) {
            episodesStore.push({
              id: this._generateId('ep'),
              title_id: s.title_id,
              season_id: s.id,
              season_number: s.season_number,
              episode_number: n,
              name: `Episode ${n}`,
              synopsis: '',
              runtime_minutes: null,
              release_date: null,
              is_special: false,
              average_rating: 0
            });
          }
          this._saveToStorage('episodes', episodesStore);
          eps = episodesStore
            .filter((e) => e.season_id === s.id)
            .sort((a, b) => a.episode_number - b.episode_number);
        }

        const mappedEpisodes = eps.map((e) => ({
          episode_id: e.id,
          season_number: e.season_number,
          episode_number: e.episode_number,
          name: e.name,
          synopsis: e.synopsis || '',
          runtime_minutes: e.runtime_minutes,
          average_rating: e.average_rating || 0,
          release_date: e.release_date || null,
          is_special: !!e.is_special
        }));
        seasons.push({
          season_id: s.id,
          season_number: s.season_number,
          name: s.name || '',
          description: s.description || '',
          release_year: s.release_year || null,
          episode_count: typeof s.episode_count === 'number' ? s.episode_count : mappedEpisodes.length,
          episodes: mappedEpisodes
        });
      }
    }

    const titleObj = {
      id: title.id,
      name: title.name,
      category: title.category,
      main_genre: title.main_genre,
      genres: title.genres || [],
      synopsis: title.synopsis || '',
      average_rating: title.average_rating || 0,
      rating_count: title.rating_count || 0,
      duration_minutes: title.duration_minutes || null,
      release_year: this._getEffectiveReleaseYear(title) || null,
      has_at_least_one_season: !!title.has_at_least_one_season,
      thumbnail_image_url: title.thumbnail_image_url || null,
      banner_image_url: title.banner_image_url || null,
      is_featured: !!title.is_featured,
      is_recommended: !!title.is_recommended,
      available_audio_languages: title.available_audio_languages || [],
      available_subtitle_languages: title.available_subtitle_languages || [],
      original_audio_language: title.original_audio_language || 'other',
      is_in_watchlist: isInWatchlist
    };

    return { title: titleObj, seasons };
  }

  // --- Playback start for title ---

  startPlaybackForTitle(titleId) {
    const profile = this._getCurrentProfile();
    const titles = this._getFromStorage('titles', []);
    const title = titles.find((t) => t.id === titleId) || null;
    if (!title) {
      return {
        success: false,
        title_id: titleId,
        category: null,
        start_position_seconds: 0,
        message: 'Title not found'
      };
    }

    const historyItems = this._getFromStorage('viewing_history_items', []);
    let historyItem = historyItems.find(
      (h) => h.title_id === title.id && (!profile || h.profile_id === profile.id)
    );

    const now = this._nowIso();
    let startPos = 0;

    if (!historyItem) {
      historyItem = {
        id: this._generateId('vh'),
        profile_id: profile ? profile.id : null,
        title_id: title.id,
        last_episode_id: null,
        first_watched_at: now,
        last_watched_at: now,
        last_position_seconds: 0,
        completed: false,
        times_watched: 1,
        user_rating: null
      };
      historyItems.push(historyItem);
    } else {
      startPos = historyItem.last_position_seconds || 0;
      historyItem.last_watched_at = now;
      historyItem.times_watched = (historyItem.times_watched || 0) + 1;
    }

    this._saveToStorage('viewing_history_items', historyItems);

    return {
      success: true,
      title_id: title.id,
      category: title.category,
      start_position_seconds: startPos,
      message: 'Playback started'
    };
  }

  // --- Playback start for episode ---

  startPlaybackForEpisode(episodeId) {
    const profile = this._getCurrentProfile();
    const episodes = this._getFromStorage('episodes', []);
    const titles = this._getFromStorage('titles', []);

    const episode = episodes.find((e) => e.id === episodeId) || null;
    if (!episode) {
      return {
        success: false,
        title_id: null,
        episode_id: episodeId,
        season_number: null,
        episode_number: null,
        start_position_seconds: 0,
        message: 'Episode not found'
      };
    }
    const title = titles.find((t) => t.id === episode.title_id) || null;

    const historyItems = this._getFromStorage('viewing_history_items', []);
    let historyItem = historyItems.find(
      (h) => h.title_id === episode.title_id && (!profile || h.profile_id === profile.id)
    );

    const now = this._nowIso();
    let startPos = 0;

    if (!historyItem) {
      historyItem = {
        id: this._generateId('vh'),
        profile_id: profile ? profile.id : null,
        title_id: episode.title_id,
        last_episode_id: episode.id,
        first_watched_at: now,
        last_watched_at: now,
        last_position_seconds: 0,
        completed: false,
        times_watched: 1,
        user_rating: null
      };
      historyItems.push(historyItem);
    } else {
      startPos = historyItem.last_position_seconds || 0;
      historyItem.last_watched_at = now;
      historyItem.last_episode_id = episode.id;
      historyItem.times_watched = (historyItem.times_watched || 0) + 1;
    }

    this._saveToStorage('viewing_history_items', historyItems);

    return {
      success: true,
      title_id: episode.title_id,
      episode_id: episode.id,
      season_number: episode.season_number,
      episode_number: episode.episode_number,
      start_position_seconds: startPos,
      message: 'Episode playback started'
    };
  }

  // --- Playback settings ---

  getPlaybackSettingsForCurrentProfile() {
    const settings = this._getOrCreatePlaybackSettings();
    return {
      default_subtitle_language: settings.default_subtitle_language,
      default_audio_track: settings.default_audio_track,
      default_audio_language: settings.default_audio_language,
      apply_to_all_videos: settings.apply_to_all_videos,
      last_updated: settings.last_updated
    };
  }

  updatePlaybackSettings(default_subtitle_language, default_audio_track, default_audio_language, apply_to_all_videos) {
    const settingsArr = this._getFromStorage('playback_settings', []);
    const profile = this._getCurrentProfile();
    const profileId = profile ? profile.id : null;

    let settings = settingsArr.find((s) => s.profile_id === profileId) || null;
    const now = this._nowIso();

    if (!settings) {
      settings = {
        id: this._generateId('playback'),
        profile_id: profileId,
        default_subtitle_language,
        default_audio_track,
        default_audio_language: default_audio_language || 'english',
        apply_to_all_videos,
        last_updated: now
      };
      settingsArr.push(settings);
    } else {
      settings.default_subtitle_language = default_subtitle_language;
      settings.default_audio_track = default_audio_track;
      if (default_audio_language) settings.default_audio_language = default_audio_language;
      settings.apply_to_all_videos = apply_to_all_videos;
      settings.last_updated = now;
    }

    this._saveToStorage('playback_settings', settingsArr);

    return {
      success: true,
      settings: {
        default_subtitle_language: settings.default_subtitle_language,
        default_audio_track: settings.default_audio_track,
        default_audio_language: settings.default_audio_language,
        apply_to_all_videos: settings.apply_to_all_videos,
        last_updated: settings.last_updated
      },
      message: 'Playback settings updated'
    };
  }

  // --- Up Next Queue ---

  getUpNextQueue() {
    const queue = this._getOrCreateUpNextQueue();
    const itemsStore = this._getFromStorage('up_next_items', []);
    const titles = this._getFromStorage('titles', []);
    const episodes = this._getFromStorage('episodes', []);

    const items = itemsStore
      .filter((item) => item.queue_id === queue.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((item) => {
        const title = titles.find((t) => t.id === item.title_id) || null;
        const episode = item.episode_id
          ? episodes.find((e) => e.id === item.episode_id) || null
          : null;

        return {
          up_next_item_id: item.id,
          item_type: item.item_type,
          title_id: item.title_id,
          episode_id: item.episode_id || null,
          position: item.position || 0,
          title_name: title ? title.name : null,
          episode_name: episode ? episode.name : null,
          season_number: episode ? episode.season_number : null,
          episode_number: episode ? episode.episode_number : null,
          runtime_minutes: episode
            ? episode.runtime_minutes
            : title
            ? title.duration_minutes || null
            : null,
          thumbnail_image_url: title ? title.thumbnail_image_url || null : null,
          // Foreign key resolution objects
          title: title,
          episode: episode
        };
      });

    return {
      queue_id: queue.id,
      items,
      updated_at: queue.updated_at || queue.created_at
    };
  }

  addItemToUpNext(itemType, titleId, episodeId) {
    const queue = this._getOrCreateUpNextQueue();
    let itemsStore = this._getFromStorage('up_next_items', []);

    if (itemType === 'episode' && !episodeId) {
      return {
        success: false,
        queue_id: queue.id,
        added_item: null,
        message: 'episodeId is required when itemType is "episode"'
      };
    }

    const relevantItems = itemsStore.filter((i) => i.queue_id === queue.id);
    const maxPos = relevantItems.reduce((max, i) => (i.position > max ? i.position : max), 0);
    const newPos = maxPos + 1;

    const item = {
      id: this._generateId('upnext'),
      queue_id: queue.id,
      item_type: itemType,
      title_id: titleId,
      episode_id: episodeId || null,
      added_at: this._nowIso(),
      position: newPos
    };

    itemsStore.push(item);
    this._saveToStorage('up_next_items', itemsStore);

    const queues = this._getFromStorage('up_next_queues', []);
    const idx = queues.findIndex((q) => q.id === queue.id);
    if (idx >= 0) {
      queues[idx].updated_at = this._nowIso();
      this._saveToStorage('up_next_queues', queues);
    }

    return {
      success: true,
      queue_id: queue.id,
      added_item: {
        up_next_item_id: item.id,
        position: item.position
      },
      message: 'Item added to Up Next'
    };
  }

  removeUpNextItem(upNextItemId) {
    let itemsStore = this._getFromStorage('up_next_items', []);
    const idx = itemsStore.findIndex((i) => i.id === upNextItemId);
    if (idx === -1) {
      return { success: false, queue_id: null, message: 'Up Next item not found' };
    }
    const queueId = itemsStore[idx].queue_id;
    itemsStore.splice(idx, 1);
    this._saveToStorage('up_next_items', itemsStore);

    const queues = this._getFromStorage('up_next_queues', []);
    const qIdx = queues.findIndex((q) => q.id === queueId);
    if (qIdx >= 0) {
      queues[qIdx].updated_at = this._nowIso();
      this._saveToStorage('up_next_queues', queues);
    }

    return { success: true, queue_id: queueId, message: 'Up Next item removed' };
  }

  reorderUpNextItem(upNextItemId, newPosition) {
    newPosition = Math.max(1, parseInt(newPosition, 10) || 1);

    let itemsStore = this._getFromStorage('up_next_items', []);
    const idx = itemsStore.findIndex((i) => i.id === upNextItemId);
    if (idx === -1) {
      return { success: false, queue_id: null, items: [] };
    }
    const item = itemsStore[idx];
    const queueId = item.queue_id;

    const queueItems = itemsStore
      .filter((i) => i.queue_id === queueId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const fromIndex = queueItems.findIndex((i) => i.id === upNextItemId);
    const [moving] = queueItems.splice(fromIndex, 1);
    const insertIndex = Math.min(newPosition - 1, queueItems.length);
    queueItems.splice(insertIndex, 0, moving);

    queueItems.forEach((i, index) => {
      i.position = index + 1;
    });

    // Merge back into main store
    itemsStore = itemsStore.map((i) => {
      const updated = queueItems.find((qi) => qi.id === i.id);
      return updated || i;
    });

    this._saveToStorage('up_next_items', itemsStore);

    const queues = this._getFromStorage('up_next_queues', []);
    const qIdx = queues.findIndex((q) => q.id === queueId);
    if (qIdx >= 0) {
      queues[qIdx].updated_at = this._nowIso();
      this._saveToStorage('up_next_queues', queues);
    }

    return {
      success: true,
      queue_id: queueId,
      items: queueItems.map((i) => ({
        up_next_item_id: i.id,
        position: i.position
      }))
    };
  }

  startPlaybackFromUpNextItem(upNextItemId) {
    const itemsStore = this._getFromStorage('up_next_items', []);
    const item = itemsStore.find((i) => i.id === upNextItemId) || null;
    if (!item) {
      return {
        success: false,
        item_type: null,
        title_id: null,
        episode_id: null,
        start_position_seconds: 0,
        message: 'Up Next item not found'
      };
    }

    if (item.item_type === 'episode' && item.episode_id) {
      const res = this.startPlaybackForEpisode(item.episode_id);
      return {
        success: res.success,
        item_type: 'episode',
        title_id: res.title_id,
        episode_id: res.episode_id,
        start_position_seconds: res.start_position_seconds,
        message: res.message
      };
    } else {
      const res = this.startPlaybackForTitle(item.title_id);
      return {
        success: res.success,
        item_type: item.item_type,
        title_id: res.title_id,
        episode_id: null,
        start_position_seconds: res.start_position_seconds,
        message: res.message
      };
    }
  }

  // --- Subscription plans display (signup) ---

  getSubscriptionPlansForDisplay(filters, sortBy) {
    filters = filters || {};
    sortBy = sortBy || 'default';

    let plans = this._getFromStorage('subscription_plans', []).filter(
      (p) => p.is_active
    );

    if (filters.minVideoQuality) {
      const minRank = this._qualityRank(filters.minVideoQuality);
      plans = plans.filter((p) => this._qualityRank(p.max_video_quality) >= minRank);
    }
    if (typeof filters.supportsHd === 'boolean') {
      plans = plans.filter((p) => !!p.supports_hd === filters.supportsHd);
    }
    if (typeof filters.minSimultaneousStreams === 'number') {
      plans = plans.filter((p) => p.max_simultaneous_streams >= filters.minSimultaneousStreams);
    }
    if (typeof filters.maxSimultaneousStreams === 'number') {
      plans = plans.filter((p) => p.max_simultaneous_streams <= filters.maxSimultaneousStreams);
    }

    if (sortBy === 'price_asc') {
      plans.sort((a, b) => a.monthly_price - b.monthly_price);
    } else if (sortBy === 'price_desc') {
      plans.sort((a, b) => b.monthly_price - a.monthly_price);
    } else if (sortBy === 'default') {
      plans.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    return plans.map((p) => ({
      plan_id: p.id,
      name: p.name,
      description: p.description || '',
      monthly_price: p.monthly_price,
      currency: p.currency,
      max_video_quality: p.max_video_quality,
      supports_hd: p.supports_hd,
      max_simultaneous_streams: p.max_simultaneous_streams,
      is_active: p.is_active
    }));
  }

  setCheckoutPlan(planId) {
    const plans = this._getFromStorage('subscription_plans', []);
    const plan = plans.find((p) => p.id === planId && p.is_active);
    if (!plan) {
      return {
        success: false,
        selected_plan: null,
        message: 'Plan not found or inactive'
      };
    }

    const session = this._getCheckoutSession();
    session.selected_plan_id = plan.id;
    this._saveToStorage('checkout_session', session);

    return {
      success: true,
      selected_plan: {
        plan_id: plan.id,
        name: plan.name,
        monthly_price: plan.monthly_price,
        currency: plan.currency,
        max_video_quality: plan.max_video_quality,
        max_simultaneous_streams: plan.max_simultaneous_streams
      },
      message: 'Checkout plan set'
    };
  }

  getCheckoutContext() {
    const session = this._getCheckoutSession();
    const plans = this._getFromStorage('subscription_plans', []);
    const plan = plans.find((p) => p.id === session.selected_plan_id) || null;

    return {
      selected_plan: plan
        ? {
            plan_id: plan.id,
            name: plan.name,
            description: plan.description || '',
            monthly_price: plan.monthly_price,
            currency: plan.currency,
            max_video_quality: plan.max_video_quality,
            supports_hd: plan.supports_hd,
            max_simultaneous_streams: plan.max_simultaneous_streams
          }
        : null,
      has_existing_account: !!this._getCurrentAccount()
    };
  }

  createAccountWithSubscription(full_name, email, password, card_number, expiration_month, expiration_year, security_code) {
    const session = this._getCheckoutSession();
    if (!session.selected_plan_id) {
      return {
        success: false,
        account: null,
        subscription: null,
        payment_method: null,
        message: 'No checkout plan selected'
      };
    }

    const plans = this._getFromStorage('subscription_plans', []);
    const plan = plans.find((p) => p.id === session.selected_plan_id) || null;
    if (!plan) {
      return {
        success: false,
        account: null,
        subscription: null,
        payment_method: null,
        message: 'Selected plan not found'
      };
    }

    const accounts = this._getFromStorage('accounts', []);
    const existing = accounts.find((a) => a.email === email);
    if (existing) {
      return {
        success: false,
        account: null,
        subscription: null,
        payment_method: null,
        message: 'Account with this email already exists'
      };
    }

    const now = this._nowIso();
    const accountId = this._generateId('acct');

    const subscriptionId = this._generateId('sub');
    const subscription = {
      id: subscriptionId,
      plan_id: plan.id,
      status: 'active',
      start_date: now,
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      auto_renew: true,
      cancellation_date: null,
      last_plan_change_date: now
    };

    const account = {
      id: accountId,
      full_name,
      email,
      password,
      created_at: now,
      current_subscription_id: subscriptionId,
      default_profile_id: null
    };

    // Default profile
    const profiles = this._getFromStorage('profiles', []);
    const defaultProfile = {
      id: this._generateId('profile'),
      name: full_name && full_name.split(' ')[0] ? full_name.split(' ')[0] : 'Main',
      is_kids: false,
      age_range: '18_plus',
      avatar_image_url: null,
      created_at: now,
      is_active: true
    };
    profiles.push(defaultProfile);
    this._saveToStorage('profiles', profiles);

    account.default_profile_id = defaultProfile.id;

    accounts.push(account);
    this._saveToStorage('accounts', accounts);

    const subscriptions = this._getFromStorage('subscriptions', []);
    subscriptions.push(subscription);
    this._saveToStorage('subscriptions', subscriptions);

    const paymentMethods = this._getFromStorage('payment_methods', []);
    const paymentMethod = {
      id: this._generateId('pm'),
      subscription_id: subscriptionId,
      card_brand: this._inferCardBrand(card_number),
      cardholder_name: full_name,
      card_last4: (card_number || '').slice(-4),
      card_number_masked: null,
      expiration_month,
      expiration_year,
      billing_address: null,
      is_default: true,
      created_at: now
    };
    paymentMethods.push(paymentMethod);
    this._saveToStorage('payment_methods', paymentMethods);

    // Plan change history
    const planChanges = this._getFromStorage('subscription_plan_changes', []);
    const planChange = {
      id: this._generateId('plchange'),
      subscription_id: subscriptionId,
      previous_plan_id: null,
      new_plan_id: plan.id,
      change_date: now,
      effective_date: now,
      initiated_from: 'signup',
      notes: 'Initial signup'
    };
    planChanges.push(planChange);
    this._saveToStorage('subscription_plan_changes', planChanges);

    // Set current account/profile session
    localStorage.setItem('current_account_id', account.id);
    localStorage.setItem('current_profile_id', defaultProfile.id);

    // Update checkout_session to mark account exists
    const newSession = {
      selected_plan_id: session.selected_plan_id,
      has_existing_account: true
    };
    this._saveToStorage('checkout_session', newSession);

    return {
      success: true,
      account: {
        account_id: account.id,
        full_name: account.full_name,
        email: account.email,
        created_at: account.created_at
      },
      subscription: {
        subscription_id: subscription.id,
        status: subscription.status,
        plan: {
          plan_id: plan.id,
          name: plan.name,
          monthly_price: plan.monthly_price,
          currency: plan.currency,
          max_video_quality: plan.max_video_quality,
          max_simultaneous_streams: plan.max_simultaneous_streams
        },
        start_date: subscription.start_date,
        next_billing_date: subscription.next_billing_date
      },
      payment_method: {
        card_brand: paymentMethod.card_brand,
        card_last4: paymentMethod.card_last4,
        expiration_month: paymentMethod.expiration_month,
        expiration_year: paymentMethod.expiration_year
      },
      message: 'Account and subscription created'
    };
  }

  // --- Account overview & plan management ---

  getAccountOverview() {
    const account = this._getCurrentAccount();
    if (!account) {
      return {
        account: null,
        subscription: null,
        playback_settings_summary: null
      };
    }

    const subscription = this._getCurrentSubscription();
    const plans = this._getFromStorage('subscription_plans', []);
    const plan = subscription
      ? plans.find((p) => p.id === subscription.plan_id) || null
      : null;

    const profile = this._getCurrentProfile();
    let playbackSummary = null;
    if (profile) {
      const settings = this._getOrCreatePlaybackSettings();
      playbackSummary = {
        default_subtitle_language: settings.default_subtitle_language,
        default_audio_track: settings.default_audio_track,
        default_audio_language: settings.default_audio_language
      };
    }

    return {
      account: {
        full_name: account.full_name,
        email: account.email,
        created_at: account.created_at
      },
      subscription: subscription && plan
        ? {
            subscription_id: subscription.id,
            status: subscription.status,
            plan: {
              plan_id: plan.id,
              name: plan.name,
              monthly_price: plan.monthly_price,
              currency: plan.currency,
              max_video_quality: plan.max_video_quality,
              max_simultaneous_streams: plan.max_simultaneous_streams
            },
            start_date: subscription.start_date,
            next_billing_date: subscription.next_billing_date,
            auto_renew: subscription.auto_renew
          }
        : null,
      playback_settings_summary: playbackSummary
    };
  }

  getManageablePlans(filters, sortBy) {
    filters = filters || {};
    sortBy = sortBy || 'default';

    const subscription = this._getCurrentSubscription();
    const plans = this._getFromStorage('subscription_plans', []).filter(
      (p) => p.is_active
    );

    if (!subscription) {
      return {
        current_plan: null,
        available_plans: []
      };
    }

    const currentPlan = plans.find((p) => p.id === subscription.plan_id) || null;

    let availablePlans = plans.slice();
    if (typeof filters.minSimultaneousStreams === 'number') {
      availablePlans = availablePlans.filter(
        (p) => p.max_simultaneous_streams >= filters.minSimultaneousStreams
      );
    }
    if (typeof filters.maxSimultaneousStreams === 'number') {
      availablePlans = availablePlans.filter(
        (p) => p.max_simultaneous_streams <= filters.maxSimultaneousStreams
      );
    }
    if (typeof filters.maxMonthlyPrice === 'number') {
      availablePlans = availablePlans.filter(
        (p) => p.monthly_price <= filters.maxMonthlyPrice
      );
    }

    if (sortBy === 'price_asc') {
      availablePlans.sort((a, b) => a.monthly_price - b.monthly_price);
    } else if (sortBy === 'price_desc') {
      availablePlans.sort((a, b) => b.monthly_price - a.monthly_price);
    } else if (sortBy === 'default') {
      availablePlans.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    return {
      current_plan: currentPlan
        ? {
            plan_id: currentPlan.id,
            name: currentPlan.name,
            monthly_price: currentPlan.monthly_price,
            currency: currentPlan.currency,
            max_video_quality: currentPlan.max_video_quality,
            supports_hd: currentPlan.supports_hd,
            max_simultaneous_streams: currentPlan.max_simultaneous_streams
          }
        : null,
      available_plans: availablePlans.map((p) => ({
        plan_id: p.id,
        name: p.name,
        monthly_price: p.monthly_price,
        currency: p.currency,
        max_video_quality: p.max_video_quality,
        supports_hd: p.supports_hd,
        max_simultaneous_streams: p.max_simultaneous_streams,
        is_current_plan: subscription.plan_id === p.id
      }))
    };
  }

  changeSubscriptionPlan(newPlanId) {
    const account = this._getCurrentAccount();
    const subscription = this._getCurrentSubscription();
    if (!account || !subscription) {
      return {
        success: false,
        previous_plan: null,
        current_plan: null,
        effective_date: null,
        message: 'No current subscription'
      };
    }

    const plans = this._getFromStorage('subscription_plans', []);
    const newPlan = plans.find((p) => p.id === newPlanId && p.is_active);
    if (!newPlan) {
      return {
        success: false,
        previous_plan: null,
        current_plan: null,
        effective_date: null,
        message: 'New plan not found or inactive'
      };
    }

    const previousPlan = plans.find((p) => p.id === subscription.plan_id) || null;

    const subscriptions = this._getFromStorage('subscriptions', []);
    const subIdx = subscriptions.findIndex((s) => s.id === subscription.id);
    if (subIdx === -1) {
      return {
        success: false,
        previous_plan: null,
        current_plan: null,
        effective_date: null,
        message: 'Subscription not found in storage'
      };
    }

    const now = this._nowIso();
    subscriptions[subIdx].plan_id = newPlan.id;
    subscriptions[subIdx].last_plan_change_date = now;
    this._saveToStorage('subscriptions', subscriptions);

    const planChanges = this._getFromStorage('subscription_plan_changes', []);
    const planChange = {
      id: this._generateId('plchange'),
      subscription_id: subscription.id,
      previous_plan_id: previousPlan ? previousPlan.id : null,
      new_plan_id: newPlan.id,
      change_date: now,
      effective_date: now,
      initiated_from: 'plan_change_page',
      notes: null
    };
    planChanges.push(planChange);
    this._saveToStorage('subscription_plan_changes', planChanges);

    return {
      success: true,
      previous_plan: previousPlan
        ? {
            plan_id: previousPlan.id,
            name: previousPlan.name,
            monthly_price: previousPlan.monthly_price
          }
        : null,
      current_plan: {
        plan_id: newPlan.id,
        name: newPlan.name,
        monthly_price: newPlan.monthly_price,
        max_simultaneous_streams: newPlan.max_simultaneous_streams
      },
      effective_date: now,
      message: 'Subscription plan changed'
    };
  }

  // --- Watchlist ---

  getWatchlistItems(sortBy) {
    sortBy = sortBy || 'recently_added';

    const profile = this._getCurrentProfile();
    if (!profile) {
      return {
        watchlist: null,
        items: []
      };
    }

    const watchlist = this._getOrCreateWatchlist();
    const itemsStore = this._getFromStorage('watchlist_items', []);
    const titles = this._getFromStorage('titles', []);

    let items = itemsStore.filter((i) => i.watchlist_id === watchlist.id);

    if (sortBy === 'recently_added') {
      items.sort((a, b) => {
        const da = a.added_at || '';
        const db = b.added_at || '';
        return db.localeCompare(da);
      });
    }

    const mappedItems = items.map((i) => {
      const title = titles.find((t) => t.id === i.title_id) || null;
      return {
        watchlist_item_id: i.id,
        added_at: i.added_at,
        title: title
          ? {
              title_id: title.id,
              name: title.name,
              category: title.category,
              main_genre: title.main_genre,
              average_rating: title.average_rating || 0,
              duration_minutes: title.duration_minutes || null,
              thumbnail_image_url: title.thumbnail_image_url || null
            }
          : null
      };
    });

    return {
      watchlist: {
        watchlist_id: watchlist.id,
        name: watchlist.name,
        created_at: watchlist.created_at,
        updated_at: watchlist.updated_at
      },
      items: mappedItems
    };
  }

  addTitleToWatchlist(titleId) {
    const profile = this._getCurrentProfile();
    if (!profile) {
      return {
        success: false,
        watchlist_item_id: null,
        is_in_watchlist: false,
        message: 'No current profile'
      };
    }

    const watchlist = this._getOrCreateWatchlist();
    const itemsStore = this._getFromStorage('watchlist_items', []);

    const existing = itemsStore.find(
      (i) => i.watchlist_id === watchlist.id && i.title_id === titleId
    );
    if (existing) {
      return {
        success: true,
        watchlist_item_id: existing.id,
        is_in_watchlist: true,
        message: 'Title already in watchlist'
      };
    }

    const item = {
      id: this._generateId('wli'),
      watchlist_id: watchlist.id,
      title_id: titleId,
      added_at: this._nowIso()
    };
    itemsStore.push(item);
    this._saveToStorage('watchlist_items', itemsStore);

    const watchlists = this._getFromStorage('watchlists', []);
    const idx = watchlists.findIndex((w) => w.id === watchlist.id);
    if (idx >= 0) {
      watchlists[idx].updated_at = this._nowIso();
      this._saveToStorage('watchlists', watchlists);
    }

    return {
      success: true,
      watchlist_item_id: item.id,
      is_in_watchlist: true,
      message: 'Title added to watchlist'
    };
  }

  removeWatchlistItem(watchlistItemId) {
    let itemsStore = this._getFromStorage('watchlist_items', []);
    const idx = itemsStore.findIndex((i) => i.id === watchlistItemId);
    if (idx === -1) {
      return { success: false, message: 'Watchlist item not found' };
    }
    itemsStore.splice(idx, 1);
    this._saveToStorage('watchlist_items', itemsStore);
    return { success: true, message: 'Watchlist item removed' };
  }

  // --- Viewing History ---

  getViewingHistory(page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 20;

    const profile = this._getCurrentProfile();
    if (!profile) {
      return { items: [], page, pageSize, total_results: 0 };
    }

    const historyItems = this._getFromStorage('viewing_history_items', []);
    const titles = this._getFromStorage('titles', []);
    const episodes = this._getFromStorage('episodes', []);

    let filtered = historyItems.filter((h) => h.profile_id === profile.id);
    filtered.sort((a, b) => (b.last_watched_at || '').localeCompare(a.last_watched_at || ''));

    const total_results = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const items = paged.map((h) => {
      const title = titles.find((t) => t.id === h.title_id) || null;
      const lastEpisode = h.last_episode_id
        ? episodes.find((e) => e.id === h.last_episode_id) || null
        : null;
      return {
        viewing_history_item_id: h.id,
        title: title
          ? {
              title_id: title.id,
              name: title.name,
              category: title.category,
              thumbnail_image_url: title.thumbnail_image_url || null
            }
          : null,
        last_episode_id: h.last_episode_id || null,
        first_watched_at: h.first_watched_at,
        last_watched_at: h.last_watched_at,
        last_position_seconds: h.last_position_seconds || 0,
        completed: !!h.completed,
        times_watched: h.times_watched || 0,
        user_rating: typeof h.user_rating === 'number' ? h.user_rating : null,
        // Foreign key resolution
        last_episode: lastEpisode
      };
    });

    return { items, page, pageSize, total_results };
  }

  rateViewingHistoryItem(viewingHistoryItemId, rating) {
    rating = Number(rating);
    if (!(rating >= 0)) {
      return { success: false, new_rating: null, message: 'Invalid rating' };
    }

    const historyItems = this._getFromStorage('viewing_history_items', []);
    const idx = historyItems.findIndex((h) => h.id === viewingHistoryItemId);
    if (idx === -1) {
      return { success: false, new_rating: null, message: 'Viewing history item not found' };
    }

    historyItems[idx].user_rating = rating;
    this._saveToStorage('viewing_history_items', historyItems);

    return {
      success: true,
      new_rating: rating,
      message: 'Rating saved'
    };
  }

  // --- Profiles ---

  getProfiles() {
    const profiles = this._getFromStorage('profiles', []);
    return profiles.map((p) => ({
      profile_id: p.id,
      name: p.name,
      is_kids: !!p.is_kids,
      age_range: p.age_range || null,
      avatar_image_url: p.avatar_image_url || null,
      created_at: p.created_at || null,
      is_active: typeof p.is_active === 'boolean' ? p.is_active : true
    }));
  }

  createProfile(name, is_kids, age_range) {
    const profiles = this._getFromStorage('profiles', []);
    const now = this._nowIso();
    const profile = {
      id: this._generateId('profile'),
      name,
      is_kids: !!is_kids,
      age_range: age_range || null,
      avatar_image_url: null,
      created_at: now,
      is_active: true
    };
    profiles.push(profile);
    this._saveToStorage('profiles', profiles);

    // If no current profile or no default on account, set this one
    const account = this._getCurrentAccount();
    if (account && !account.default_profile_id) {
      account.default_profile_id = profile.id;
      const accounts = this._getFromStorage('accounts', []);
      const idx = accounts.findIndex((a) => a.id === account.id);
      if (idx >= 0) {
        accounts[idx] = account;
        this._saveToStorage('accounts', accounts);
      }
    }
    if (!localStorage.getItem('current_profile_id')) {
      localStorage.setItem('current_profile_id', profile.id);
    }

    return {
      success: true,
      profile: {
        profile_id: profile.id,
        name: profile.name,
        is_kids: profile.is_kids,
        age_range: profile.age_range
      },
      message: 'Profile created'
    };
  }

  updateProfile(profileId, name, is_kids, age_range, is_active) {
    const profiles = this._getFromStorage('profiles', []);
    const idx = profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) {
      return { success: false, profile: null, message: 'Profile not found' };
    }

    const p = profiles[idx];
    if (typeof name !== 'undefined') p.name = name;
    if (typeof is_kids !== 'undefined') p.is_kids = !!is_kids;
    if (typeof age_range !== 'undefined') p.age_range = age_range;
    if (typeof is_active !== 'undefined') p.is_active = !!is_active;

    profiles[idx] = p;
    this._saveToStorage('profiles', profiles);

    return {
      success: true,
      profile: {
        profile_id: p.id,
        name: p.name,
        is_kids: p.is_kids,
        age_range: p.age_range,
        is_active: p.is_active
      },
      message: 'Profile updated'
    };
  }

  deleteProfile(profileId) {
    let profiles = this._getFromStorage('profiles', []);
    const idx = profiles.findIndex((p) => p.id === profileId);
    if (idx === -1) {
      return { success: false, message: 'Profile not found' };
    }
    profiles.splice(idx, 1);
    this._saveToStorage('profiles', profiles);

    const account = this._getCurrentAccount();
    if (account && account.default_profile_id === profileId) {
      account.default_profile_id = null;
      const accounts = this._getFromStorage('accounts', []);
      const aIdx = accounts.findIndex((a) => a.id === account.id);
      if (aIdx >= 0) {
        accounts[aIdx] = account;
        this._saveToStorage('accounts', accounts);
      }
    }

    const curId = localStorage.getItem('current_profile_id');
    if (curId === profileId) {
      localStorage.removeItem('current_profile_id');
    }

    return { success: true, message: 'Profile deleted' };
  }

  // --- Parental Controls ---

  getParentalControlSettings() {
    const arr = this._getFromStorage('parental_controls', []);
    const settings = arr[0] || null;
    if (!settings) {
      return {
        pin_code_set: false,
        require_pin_for_non_kids_profiles: false,
        last_updated: null
      };
    }
    return {
      pin_code_set: !!(settings.pin_code && settings.pin_code.length > 0),
      require_pin_for_non_kids_profiles: !!settings.require_pin_for_non_kids_profiles,
      last_updated: settings.last_updated || null
    };
  }

  updateParentalControlSettings(pin_code, require_pin_for_non_kids_profiles) {
    let arr = this._getFromStorage('parental_controls', []);
    const now = this._nowIso();

    if (arr.length === 0) {
      arr.push({
        id: this._generateId('parental'),
        pin_code,
        require_pin_for_non_kids_profiles: !!require_pin_for_non_kids_profiles,
        last_updated: now
      });
    } else {
      arr[0].pin_code = pin_code;
      arr[0].require_pin_for_non_kids_profiles = !!require_pin_for_non_kids_profiles;
      arr[0].last_updated = now;
    }

    this._saveToStorage('parental_controls', arr);

    return {
      success: true,
      settings: {
        pin_code_set: !!(pin_code && pin_code.length > 0),
        require_pin_for_non_kids_profiles: !!require_pin_for_non_kids_profiles,
        last_updated: now
      },
      message: 'Parental control settings updated'
    };
  }

  // --- Custom Lists ---

  getCustomLists() {
    const profile = this._getCurrentProfile();
    if (!profile) return [];

    const lists = this._getFromStorage('custom_lists', []);
    const items = this._getFromStorage('custom_list_items', []);

    return lists
      .filter((l) => l.profile_id === profile.id)
      .map((l) => ({
        list_id: l.id,
        name: l.name,
        description: l.description || '',
        item_count: items.filter((i) => i.list_id === l.id).length,
        created_at: l.created_at || null,
        updated_at: l.updated_at || null
      }));
  }

  createCustomList(name, description) {
    const profile = this._getCurrentProfile();
    if (!profile) {
      return { success: false, list: null, message: 'No current profile' };
    }

    const lists = this._getFromStorage('custom_lists', []);
    const now = this._nowIso();
    const list = {
      id: this._generateId('clist'),
      profile_id: profile.id,
      name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('custom_lists', lists);

    return {
      success: true,
      list: {
        list_id: list.id,
        name: list.name,
        description: list.description
      },
      message: 'Custom list created'
    };
  }

  renameCustomList(listId, newName) {
    const lists = this._getFromStorage('custom_lists', []);
    const idx = lists.findIndex((l) => l.id === listId);
    if (idx === -1) {
      return { success: false, list: null, message: 'List not found' };
    }
    lists[idx].name = newName;
    lists[idx].updated_at = this._nowIso();
    this._saveToStorage('custom_lists', lists);

    return {
      success: true,
      list: {
        list_id: lists[idx].id,
        name: lists[idx].name
      },
      message: 'List renamed'
    };
  }

  deleteCustomList(listId) {
    let lists = this._getFromStorage('custom_lists', []);
    const idx = lists.findIndex((l) => l.id === listId);
    if (idx === -1) {
      return { success: false, message: 'List not found' };
    }
    lists.splice(idx, 1);
    this._saveToStorage('custom_lists', lists);

    let items = this._getFromStorage('custom_list_items', []);
    items = items.filter((i) => i.list_id !== listId);
    this._saveToStorage('custom_list_items', items);

    return { success: true, message: 'List deleted' };
  }

  getCustomListDetail(listId) {
    const lists = this._getFromStorage('custom_lists', []);
    const list = lists.find((l) => l.id === listId) || null;
    if (!list) {
      return { list: null, items: [] };
    }

    const itemsStore = this._getFromStorage('custom_list_items', []);
    const titles = this._getFromStorage('titles', []);

    const listItems = itemsStore
      .filter((i) => i.list_id === listId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const items = listItems.map((i) => {
      const title = titles.find((t) => t.id === i.title_id) || null;
      return {
        list_item_id: i.id,
        position: i.position || 0,
        added_at: i.added_at || null,
        title: title
          ? {
              title_id: title.id,
              name: title.name,
              category: title.category,
              main_genre: title.main_genre,
              average_rating: title.average_rating || 0,
              duration_minutes: title.duration_minutes || null,
              thumbnail_image_url: title.thumbnail_image_url || null
            }
          : null
      };
    });

    return {
      list: {
        list_id: list.id,
        name: list.name,
        description: list.description || ''
      },
      items
    };
  }

  addTitleToCustomList(listId, titleId) {
    const itemsStore = this._getFromStorage('custom_list_items', []);
    const existing = itemsStore.find((i) => i.list_id === listId && i.title_id === titleId);
    if (existing) {
      return {
        success: true,
        list_item_id: existing.id,
        message: 'Title already in list'
      };
    }

    const forList = itemsStore.filter((i) => i.list_id === listId);
    const maxPos = forList.reduce((max, i) => (i.position > max ? i.position : max), 0);

    const item = {
      id: this._generateId('cli'),
      list_id: listId,
      title_id: titleId,
      added_at: this._nowIso(),
      position: maxPos + 1
    };
    itemsStore.push(item);
    this._saveToStorage('custom_list_items', itemsStore);

    const lists = this._getFromStorage('custom_lists', []);
    const idx = lists.findIndex((l) => l.id === listId);
    if (idx >= 0) {
      lists[idx].updated_at = this._nowIso();
      this._saveToStorage('custom_lists', lists);
    }

    return {
      success: true,
      list_item_id: item.id,
      message: 'Title added to list'
    };
  }

  removeCustomListItem(listItemId) {
    let itemsStore = this._getFromStorage('custom_list_items', []);
    const idx = itemsStore.findIndex((i) => i.id === listItemId);
    if (idx === -1) {
      return { success: false, message: 'List item not found' };
    }
    itemsStore.splice(idx, 1);
    this._saveToStorage('custom_list_items', itemsStore);
    return { success: true, message: 'List item removed' };
  }

  reorderCustomListItems(listId, orderedItemIds) {
    orderedItemIds = orderedItemIds || [];
    let itemsStore = this._getFromStorage('custom_list_items', []);

    const listItems = itemsStore.filter((i) => i.list_id === listId);
    const idToItem = {};
    listItems.forEach((i) => {
      idToItem[i.id] = i;
    });

    const ordered = [];
    orderedItemIds.forEach((id) => {
      if (idToItem[id]) ordered.push(idToItem[id]);
    });

    listItems.forEach((i) => {
      if (!ordered.includes(i)) ordered.push(i);
    });

    ordered.forEach((item, index) => {
      item.position = index + 1;
    });

    itemsStore = itemsStore.map((i) => {
      const updated = ordered.find((oi) => oi.id === i.id);
      return updated || i;
    });

    this._saveToStorage('custom_list_items', itemsStore);

    const lists = this._getFromStorage('custom_lists', []);
    const idx = lists.findIndex((l) => l.id === listId);
    if (idx >= 0) {
      lists[idx].updated_at = this._nowIso();
      this._saveToStorage('custom_lists', lists);
    }

    return { success: true, message: 'List items reordered' };
  }

  // --- Episode Reminders ---

  scheduleEpisodeReminder(episodeId, scheduledDate) {
    const profile = this._getCurrentProfile();
    if (!profile) {
      return {
        success: false,
        reminder: null,
        message: 'No current profile'
      };
    }

    const episodes = this._getFromStorage('episodes', []);
    const episode = episodes.find((e) => e.id === episodeId) || null;
    if (!episode) {
      return {
        success: false,
        reminder: null,
        message: 'Episode not found'
      };
    }

    const reminders = this._getFromStorage('episode_reminders', []);
    const reminder = {
      id: this._generateId('rem'),
      profile_id: profile.id,
      title_id: episode.title_id,
      episode_id: episode.id,
      scheduled_date: new Date(scheduledDate).toISOString(),
      created_at: this._nowIso(),
      status: 'scheduled'
    };

    reminders.push(reminder);
    this._saveToStorage('episode_reminders', reminders);

    return {
      success: true,
      reminder: {
        reminder_id: reminder.id,
        episode_id: reminder.episode_id,
        title_id: reminder.title_id,
        scheduled_date: reminder.scheduled_date,
        status: reminder.status
      },
      message: 'Reminder scheduled'
    };
  }

  // --- Help & Legal ---

  getHelpContent() {
    const data = this._getFromStorage('help_content', null);
    if (!data) {
      return {
        faqs: [],
        troubleshooting_guides: [],
        contact: {
          support_email: '',
          contact_form_enabled: false
        },
        legal_sections: []
      };
    }
    return {
      faqs: data.faqs || [],
      troubleshooting_guides: data.troubleshooting_guides || [],
      contact: data.contact || { support_email: '', contact_form_enabled: false },
      legal_sections: data.legal_sections || []
    };
  }

  getLegalDocuments() {
    const data = this._getFromStorage('legal_documents', null);
    if (!data) {
      return {
        terms_of_use: { title: '', body: '' },
        privacy_policy: { title: '', body: '' },
        other_notices: []
      };
    }
    return {
      terms_of_use: data.terms_of_use || { title: '', body: '' },
      privacy_policy: data.privacy_policy || { title: '', body: '' },
      other_notices: data.other_notices || []
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
