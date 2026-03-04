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
    },
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
    // Entity tables (arrays)
    const tableKeys = [
      'episodes',
      'characters',
      'watchlists',
      'watchlist_items',
      'playlists',
      'playlist_items',
      'events',
      'reminders',
      'products',
      'cart',
      'cart_items',
      'newsletter_subscriptions',
      'polls',
      'poll_options',
      'poll_votes',
      'videos',
      'favorite_videos',
      'episode_schedules',
      'viewing_plans',
      'viewing_plan_items',
      'discussion_threads',
      'discussion_comments',
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Content / config objects
    const objectKeys = [
      'homepage_content',
      'about_content',
      'help_content',
      'policies_content',
    ];

    objectKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        // Store explicit null; external code can populate real content later
        localStorage.setItem(key, JSON.stringify(null));
      }
    });

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // If corrupted, reset to default
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

  _nowISO() {
    return new Date().toISOString();
  }

  // ----------------------
  // Formatting helpers
  // ----------------------

  _formatDisplayLabels(type, value, extra) {
    switch (type) {
      case 'runtime':
        return this._formatRuntimeLabel(value);
      case 'date':
        return this._formatDateLabel(value);
      case 'datetime':
        return this._formatDateTimeLabel(value);
      case 'time':
        return this._formatTimeLabel(value);
      case 'time_range':
        return this._formatTimeRangeLabel(value, extra);
      case 'price':
        return this._formatPriceLabel(value, extra);
      case 'category':
        return this._formatCategoryLabel(value);
      case 'event_type':
        return this._formatEventTypeLabel(value);
      default:
        return String(value ?? '');
    }
  }

  _formatRuntimeLabel(minutes) {
    if (minutes == null || isNaN(minutes)) return '';
    const m = Number(minutes);
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (rem > 0) return h + 'h ' + rem + 'm';
    return h + 'h';
  }

  _formatDateLabel(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return isoString;
    }
  }

  _formatDateTimeLabel(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  }

  _formatTimeLabel(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  }

  _formatTimeRangeLabel(startISO, endISO) {
    const startLabel = this._formatTimeLabel(startISO);
    const endLabel = endISO ? this._formatTimeLabel(endISO) : '';
    if (startLabel && endLabel) return startLabel + ' - ' + endLabel;
    return startLabel || endLabel;
  }

  _formatPriceLabel(amount, currency) {
    if (amount == null || isNaN(amount)) return '';
    const value = Number(amount);
    const cur = currency || 'usd';
    let symbol = '$';
    if (cur === 'eur') symbol = '€';
    else if (cur === 'gbp') symbol = '£';
    return symbol + value.toFixed(2);
  }

  _formatCategoryLabel(category) {
    if (!category) return '';
    return String(category)
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _formatEventTypeLabel(eventType) {
    if (!eventType) return '';
    const map = {
      live_qa: 'Live Q&A',
      watch_party: 'Watch Party',
      premiere: 'Premiere',
      meet_and_greet: 'Meet & Greet',
      panel: 'Panel',
      other: 'Other',
    };
    return map[eventType] || this._formatCategoryLabel(eventType);
  }

  _formatSeasonEpisodeLabel(episode) {
    if (!episode) return '';
    const s = episode.season_number;
    const e = episode.episode_number;
    if (s == null || e == null) return '';
    return 'S' + s + ' • E' + e;
  }

  // ----------------------
  // Time / schedule helpers
  // ----------------------

  _getCurrentWeekRange() {
    // Anchor the "current" week to existing schedule data when available so
    // schedule-based features remain stable regardless of the real system date.
    let now = new Date();
    try {
      const schedules = this._getFromStorage('episode_schedules', []);
      if (Array.isArray(schedules) && schedules.length > 0) {
        const first = schedules[0];
        if (first && first.air_start_datetime) {
          const schedDate = new Date(first.air_start_datetime);
          if (!isNaN(schedDate.getTime())) {
            now = schedDate;
          }
        }
      }
    } catch (e) {
      // If anything goes wrong, fall back to the real current date.
    }
    // Use local time for week boundaries; week starts on Monday
    const day = now.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = (day + 6) % 7; // 0 if Monday
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  _getTimeOfDayPresetHours(value) {
    // Used for Events time_of_day_preset
    const presets = {
      morning: { start: 6, end: 12 }, // 6:00 - 12:00
      afternoon: { start: 12, end: 18 }, // 12:00 - 18:00
      evening: { start: 18, end: 23 }, // 18:00 - 23:00
      night: { start: 23, end: 24 },
    };
    return presets[value] || null;
  }

  _getScheduleTimeSlotPreset(value) {
    // Used for Schedule time_slot_preset
    const presets = {
      prime_time: { start: 19, end: 22 }, // 7 PM - 10 PM
      morning: { start: 6, end: 12 },
      afternoon: { start: 12, end: 18 },
      evening: { start: 18, end: 23 },
    };
    return presets[value] || null;
  }

  _dayOfWeekValueFromDate(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  _dayOfWeekLabelFromValue(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  // ----------------------
  // Entity helpers
  // ----------------------

  _getOrCreateWatchlist() {
    const watchlists = this._getFromStorage('watchlists', []);
    let watchlist = watchlists[0] || null; // single-user
    if (!watchlist) {
      const now = this._nowISO();
      watchlist = {
        id: this._generateId('watchlist'),
        name: 'Watchlist',
        created_at: now,
        updated_at: now,
      };
      watchlists.push(watchlist);
      this._saveToStorage('watchlists', watchlists);
    }
    return watchlist;
  }

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart', []);
    let cart = carts.find((c) => c.status === 'active') || null;
    if (!cart) {
      const now = this._nowISO();
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: now,
        updated_at: now,
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _getOrCreateViewingPlan(name, description, scheduleEntryIds) {
    // Internal helper used by createViewingPlan when needed
    const viewingPlans = this._getFromStorage('viewing_plans', []);
    const now = this._nowISO();
    const plan = {
      id: this._generateId('viewing_plan'),
      name,
      description: description || '',
      created_at: now,
    };
    viewingPlans.push(plan);
    this._saveToStorage('viewing_plans', viewingPlans);

    const items = this._getFromStorage('viewing_plan_items', []);
    (scheduleEntryIds || []).forEach((scheduleEntryId, index) => {
      items.push({
        id: this._generateId('viewing_plan_item'),
        viewing_plan_id: plan.id,
        schedule_entry_id: scheduleEntryId,
        added_at: now,
        position: index + 1,
      });
    });
    this._saveToStorage('viewing_plan_items', items);

    return plan;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomepageContent
  getHomepageContent() {
    const cfg = this._getFromStorage('homepage_content', null);
    const episodes = this._getFromStorage('episodes', []);
    const characters = this._getFromStorage('characters', []);

    if (!cfg) {
      return {
        hero: null,
        featured_episodes: [],
        featured_characters: [],
        announcements: [],
      };
    }

    const featuredEpisodes = [];
    if (Array.isArray(cfg.featured_episode_ids)) {
      cfg.featured_episode_ids.forEach((id) => {
        const ep = episodes.find((e) => e.id === id);
        if (ep) {
          featuredEpisodes.push({
            episode_id: ep.id,
            title: ep.title,
            season_episode_label: this._formatSeasonEpisodeLabel(ep),
            thumbnail_image: ep.thumbnail_image || null,
            average_rating: ep.average_rating,
            runtime_label: this._formatRuntimeLabel(ep.runtime_minutes),
            episode: ep, // foreign key resolution
          });
        }
      });
    }

    const featuredCharacters = [];
    if (Array.isArray(cfg.featured_character_ids)) {
      cfg.featured_character_ids.forEach((id) => {
        const ch = characters.find((c) => c.id === id);
        if (ch) {
          featuredCharacters.push({
            character_id: ch.id,
            name: ch.name,
            short_description: ch.short_description || '',
            profile_image: ch.profile_image || null,
            character: ch, // foreign key resolution
          });
        }
      });
    }

    return {
      hero: cfg.hero || null,
      featured_episodes: featuredEpisodes,
      featured_characters: featuredCharacters,
      announcements: Array.isArray(cfg.announcements) ? cfg.announcements : [],
    };
  }

  // getUserQuickAccessSummary
  getUserQuickAccessSummary() {
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const playlists = this._getFromStorage('playlists', []);
    const favoriteVideos = this._getFromStorage('favorite_videos', []);
    const reminders = this._getFromStorage('reminders', []);
    const events = this._getFromStorage('events', []);
    const carts = this._getFromStorage('cart', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const activeReminders = reminders.filter((r) => {
      if (r.is_dismissed) return false;
      const ev = events.find((e) => e.id === r.event_id);
      if (!ev || !ev.start_datetime) return false;
      const start = new Date(ev.start_datetime);
      if (isNaN(start.getTime())) return false;
      return start.getTime() >= Date.now();
    });

    const activeCart = carts.find((c) => c.status === 'active');
    let cartItemCount = 0;
    if (activeCart) {
      cartItems
        .filter((ci) => ci.cart_id === activeCart.id)
        .forEach((ci) => {
          cartItemCount += Number(ci.quantity) || 0;
        });
    }

    return {
      watchlist_count: watchlistItems.length,
      playlist_count: playlists.length,
      favorite_videos_count: favoriteVideos.length,
      active_reminders_count: activeReminders.length,
      cart_item_count: cartItemCount,
    };
  }

  // getEpisodeFilterOptions
  getEpisodeFilterOptions() {
    const episodes = this._getFromStorage('episodes', []);
    const characters = this._getFromStorage('characters', []);

    const seasonSet = new Set();
    episodes.forEach((e) => {
      if (e.season_number != null) seasonSet.add(e.season_number);
    });
    const seasons = Array.from(seasonSet)
      .sort((a, b) => a - b)
      .map((n) => ({
        season_number: n,
        label: 'Season ' + n,
      }));

    const runtime_presets = [
      { max_minutes: 30, label: 'Up to 30 minutes' },
      { max_minutes: 35, label: 'Up to 35 minutes' },
      { max_minutes: 45, label: 'Up to 45 minutes' },
      { max_minutes: 60, label: 'Up to 60 minutes' },
    ];

    const rating_thresholds = [
      { min_rating: 4.5, label: '4.5 stars & up' },
      { min_rating: 4.0, label: '4 stars & up' },
      { min_rating: 3.0, label: '3 stars & up' },
    ];

    const chars = characters.map((c) => ({
      character_id: c.id,
      name: c.name,
    }));

    const sort_options = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'release_date_desc', label: 'Release Date: Newest First' },
      { value: 'title_asc', label: 'Title: A to Z' },
      { value: 'duration_asc', label: 'Duration: Shortest First' },
    ];

    return {
      seasons,
      runtime_presets,
      rating_thresholds,
      characters: chars,
      sort_options,
    };
  }

  // listEpisodes(filters, sort, pagination)
  listEpisodes(filters, sort, pagination) {
    const episodes = this._getFromStorage('episodes', []);
    const characters = this._getFromStorage('characters', []);
    const watchlistItems = this._getFromStorage('watchlist_items', []);

    let list = episodes.slice();
    const f = filters || {};

    if (f.season_number != null) {
      list = list.filter((e) => e.season_number === f.season_number);
    }
    if (f.max_runtime_minutes != null) {
      list = list.filter((e) => (e.runtime_minutes || 0) <= f.max_runtime_minutes);
    }
    if (f.min_average_rating != null) {
      list = list.filter((e) => (e.average_rating || 0) >= f.min_average_rating);
    }
    if (f.featured_character_id) {
      list = list.filter((e) =>
        Array.isArray(e.featured_character_ids) &&
        e.featured_character_ids.indexOf(f.featured_character_id) !== -1
      );
    }
    if (f.released_after) {
      const minDate = new Date(f.released_after);
      list = list.filter((e) => {
        if (!e.release_date) return false;
        const d = new Date(e.release_date);
        return !isNaN(d.getTime()) && d >= minDate;
      });
    }
    if (f.released_before) {
      const maxDate = new Date(f.released_before);
      list = list.filter((e) => {
        if (!e.release_date) return false;
        const d = new Date(e.release_date);
        return !isNaN(d.getTime()) && d <= maxDate;
      });
    }

    const s = (sort && sort.value) || null;
    if (s === 'rating_desc') {
      list.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (s === 'release_date_desc') {
      list.sort((a, b) => {
        const da = a.release_date ? new Date(a.release_date).getTime() : 0;
        const db = b.release_date ? new Date(b.release_date).getTime() : 0;
        return db - da;
      });
    } else if (s === 'title_asc') {
      list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    } else if (s === 'duration_asc') {
      list.sort((a, b) => (a.runtime_minutes || 0) - (b.runtime_minutes || 0));
    }

    const total_count = list.length;

    const page = (pagination && pagination.page) || 1;
    const pageSize = (pagination && pagination.page_size) || 20;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize);

    const resultEpisodes = paged.map((ep) => {
      const featuredChars = Array.isArray(ep.featured_character_ids)
        ? ep.featured_character_ids
            .map((id) => characters.find((c) => c.id === id))
            .filter(Boolean)
            .map((c) => ({ character_id: c.id, name: c.name }))
        : [];

      const isInWatchlist = watchlistItems.some((wi) => wi.episode_id === ep.id);

      return {
        episode_id: ep.id,
        title: ep.title,
        season_number: ep.season_number,
        episode_number: ep.episode_number,
        season_episode_label: this._formatSeasonEpisodeLabel(ep),
        synopsis: ep.synopsis || '',
        runtime_minutes: ep.runtime_minutes,
        runtime_label: this._formatRuntimeLabel(ep.runtime_minutes),
        average_rating: ep.average_rating,
        rating_count: ep.rating_count,
        release_date: ep.release_date || null,
        release_date_label: this._formatDateLabel(ep.release_date),
        thumbnail_image: ep.thumbnail_image || null,
        featured_characters: featuredChars,
        is_in_watchlist: !!isInWatchlist,
        episode: ep, // foreign key resolution
      };
    });

    return {
      episodes: resultEpisodes,
      total_count,
    };
  }

  // getEpisodeDetails(episodeId)
  getEpisodeDetails(episodeId) {
    const episodes = this._getFromStorage('episodes', []);
    const characters = this._getFromStorage('characters', []);
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const playlists = this._getFromStorage('playlists', []);
    const playlistItems = this._getFromStorage('playlist_items', []);

    const ep = episodes.find((e) => e.id === episodeId) || null;
    if (!ep) {
      return {
        episode: null,
        is_in_watchlist: false,
        playlists_containing_episode: [],
      };
    }

    const featuredChars = Array.isArray(ep.featured_character_ids)
      ? ep.featured_character_ids
          .map((id) => characters.find((c) => c.id === id))
          .filter(Boolean)
          .map((c) => ({ character_id: c.id, name: c.name }))
      : [];

    const isInWatchlist = watchlistItems.some((wi) => wi.episode_id === ep.id);

    const playlistIds = playlistItems
      .filter((pi) => pi.episode_id === ep.id)
      .map((pi) => pi.playlist_id);
    const uniquePlaylistIds = Array.from(new Set(playlistIds));
    const playlistsContaining = uniquePlaylistIds
      .map((pid) => playlists.find((p) => p.id === pid))
      .filter(Boolean)
      .map((p) => ({ playlist_id: p.id, name: p.name }));

    return {
      episode: {
        episode_id: ep.id,
        title: ep.title,
        season_number: ep.season_number,
        episode_number: ep.episode_number,
        season_episode_label: this._formatSeasonEpisodeLabel(ep),
        synopsis: ep.synopsis || '',
        runtime_minutes: ep.runtime_minutes,
        runtime_label: this._formatRuntimeLabel(ep.runtime_minutes),
        average_rating: ep.average_rating,
        rating_count: ep.rating_count,
        release_date: ep.release_date || null,
        release_date_label: this._formatDateLabel(ep.release_date),
        thumbnail_image: ep.thumbnail_image || null,
        featured_characters: featuredChars,
        episode: ep,
      },
      is_in_watchlist: !!isInWatchlist,
      playlists_containing_episode: playlistsContaining,
    };
  }

  // getWatchlist
  getWatchlist() {
    const watchlist = this._getOrCreateWatchlist();
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const episodes = this._getFromStorage('episodes', []);

    const items = watchlistItems
      .filter((wi) => wi.watchlist_id === watchlist.id)
      .sort((a, b) => {
        const pa = a.position != null ? a.position : Number.MAX_SAFE_INTEGER;
        const pb = b.position != null ? b.position : Number.MAX_SAFE_INTEGER;
        if (pa !== pb) return pa - pb;
        const da = a.added_at ? new Date(a.added_at).getTime() : 0;
        const db = b.added_at ? new Date(b.added_at).getTime() : 0;
        return da - db;
      })
      .map((wi, index) => {
        const ep = episodes.find((e) => e.id === wi.episode_id) || null;
        const pos = wi.position != null ? wi.position : index + 1;
        let episodeInfo = null;
        if (ep) {
          episodeInfo = {
            episode_id: ep.id,
            title: ep.title,
            season_episode_label: this._formatSeasonEpisodeLabel(ep),
            thumbnail_image: ep.thumbnail_image || null,
            runtime_label: this._formatRuntimeLabel(ep.runtime_minutes),
            average_rating: ep.average_rating,
            episode: ep,
          };
        }
        return {
          watchlist_item_id: wi.id,
          position: pos,
          added_at: wi.added_at || null,
          episode: episodeInfo,
        };
      });

    return {
      watchlist_id: watchlist.id,
      name: watchlist.name,
      episodes: items,
      watchlist, // foreign key resolution for watchlist_id
    };
  }

  // addEpisodeToWatchlist(episodeId)
  addEpisodeToWatchlist(episodeId) {
    const watchlist = this._getOrCreateWatchlist();
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const existing = watchlistItems.find(
      (wi) => wi.watchlist_id === watchlist.id && wi.episode_id === episodeId
    );
    if (existing) {
      return {
        success: true,
        watchlist_id: watchlist.id,
        message: 'Episode already in watchlist.',
        new_item: {
          watchlist_item_id: existing.id,
          position: existing.position,
        },
      };
    }

    const now = this._nowISO();
    const positions = watchlistItems
      .filter((wi) => wi.watchlist_id === watchlist.id)
      .map((wi) => wi.position || 0);
    const maxPos = positions.length ? Math.max.apply(null, positions) : 0;
    const newItem = {
      id: this._generateId('watchlist_item'),
      watchlist_id: watchlist.id,
      episode_id: episodeId,
      added_at: now,
      position: maxPos + 1,
    };
    watchlistItems.push(newItem);
    this._saveToStorage('watchlist_items', watchlistItems);

    const watchlists = this._getFromStorage('watchlists', []);
    const wlIndex = watchlists.findIndex((w) => w.id === watchlist.id);
    if (wlIndex >= 0) {
      watchlists[wlIndex].updated_at = now;
      this._saveToStorage('watchlists', watchlists);
    }

    return {
      success: true,
      watchlist_id: watchlist.id,
      message: 'Episode added to watchlist.',
      new_item: {
        watchlist_item_id: newItem.id,
        position: newItem.position,
      },
    };
  }

  // removeEpisodeFromWatchlist(watchlistItemId)
  removeEpisodeFromWatchlist(watchlistItemId) {
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const index = watchlistItems.findIndex((wi) => wi.id === watchlistItemId);
    if (index === -1) {
      return {
        success: false,
        message: 'Watchlist item not found.',
      };
    }
    watchlistItems.splice(index, 1);
    this._saveToStorage('watchlist_items', watchlistItems);
    return {
      success: true,
      message: 'Episode removed from watchlist.',
    };
  }

  // getPlaylists
  getPlaylists() {
    const playlists = this._getFromStorage('playlists', []);
    const playlistItems = this._getFromStorage('playlist_items', []);

    return playlists.map((p) => {
      const count = playlistItems.filter((pi) => pi.playlist_id === p.id).length;
      return {
        playlist_id: p.id,
        name: p.name,
        description: p.description || '',
        item_count: count,
      };
    });
  }

  // createPlaylist(name, description)
  createPlaylist(name, description) {
    const playlists = this._getFromStorage('playlists', []);
    const now = this._nowISO();
    const playlist = {
      id: this._generateId('playlist'),
      name,
      description: description || '',
      created_at: now,
      updated_at: now,
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);

    return {
      playlist_id: playlist.id,
      name: playlist.name,
      description: playlist.description,
    };
  }

  // addEpisodeToPlaylist(episodeId, playlistId)
  addEpisodeToPlaylist(episodeId, playlistId) {
    const playlists = this._getFromStorage('playlists', []);
    const playlistItems = this._getFromStorage('playlist_items', []);

    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      return {
        success: false,
        playlist_id: null,
        playlist_name: null,
        message: 'Playlist not found.',
      };
    }

    const existing = playlistItems.find(
      (pi) => pi.playlist_id === playlistId && pi.episode_id === episodeId
    );
    if (existing) {
      return {
        success: true,
        playlist_id: playlist.id,
        playlist_name: playlist.name,
        message: 'Episode already in playlist.',
      };
    }

    const now = this._nowISO();
    const positions = playlistItems
      .filter((pi) => pi.playlist_id === playlistId)
      .map((pi) => pi.position || 0);
    const maxPos = positions.length ? Math.max.apply(null, positions) : 0;

    const newItem = {
      id: this._generateId('playlist_item'),
      playlist_id: playlistId,
      episode_id: episodeId,
      added_at: now,
      position: maxPos + 1,
    };
    playlistItems.push(newItem);
    this._saveToStorage('playlist_items', playlistItems);

    const pIndex = playlists.findIndex((p) => p.id === playlistId);
    if (pIndex >= 0) {
      playlists[pIndex].updated_at = now;
      this._saveToStorage('playlists', playlists);
    }

    return {
      success: true,
      playlist_id: playlist.id,
      playlist_name: playlist.name,
      message: 'Episode added to playlist.',
    };
  }

  // getPlaylistDetails(playlistId)
  getPlaylistDetails(playlistId) {
    const playlists = this._getFromStorage('playlists', []);
    const playlistItems = this._getFromStorage('playlist_items', []);
    const episodes = this._getFromStorage('episodes', []);

    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      return {
        playlist_id: null,
        name: '',
        description: '',
        episodes: [],
      };
    }

    const items = playlistItems
      .filter((pi) => pi.playlist_id === playlistId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((pi, index) => {
        const ep = episodes.find((e) => e.id === pi.episode_id) || null;
        const pos = pi.position != null ? pi.position : index + 1;
        let episodeInfo = null;
        if (ep) {
          episodeInfo = {
            episode_id: ep.id,
            title: ep.title,
            season_episode_label: this._formatSeasonEpisodeLabel(ep),
            thumbnail_image: ep.thumbnail_image || null,
            episode: ep,
          };
        }
        return {
          playlist_item_id: pi.id,
          position: pos,
          episode: episodeInfo,
        };
      });

    return {
      playlist_id: playlist.id,
      name: playlist.name,
      description: playlist.description || '',
      episodes: items,
    };
  }

  // listCharacters(searchQuery)
  listCharacters(searchQuery) {
    const characters = this._getFromStorage('characters', []);
    const q = (searchQuery || '').trim().toLowerCase();
    let list = characters.slice();
    if (q) {
      list = list.filter((c) => {
        const name = String(c.name || '').toLowerCase();
        const desc = String(c.short_description || '').toLowerCase();
        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }
    return list.map((c) => ({
      character_id: c.id,
      name: c.name,
      short_description: c.short_description || '',
      profile_image: c.profile_image || null,
      character: c,
    }));
  }

  // getCharacterProfile(characterId)
  getCharacterProfile(characterId) {
    const characters = this._getFromStorage('characters', []);
    const episodes = this._getFromStorage('episodes', []);
    const ch = characters.find((c) => c.id === characterId) || null;
    if (!ch) {
      return {
        character_id: null,
        name: '',
        biography: '',
        short_description: '',
        profile_image: null,
        key_moments: [],
      };
    }

    const key_moments = episodes
      .filter(
        (ep) =>
          Array.isArray(ep.featured_character_ids) &&
          ep.featured_character_ids.indexOf(characterId) !== -1
      )
      .sort((a, b) => {
        const da = a.release_date ? new Date(a.release_date).getTime() : 0;
        const db = b.release_date ? new Date(b.release_date).getTime() : 0;
        return db - da;
      })
      .map((ep) => ({
        episode_id: ep.id,
        episode_title: ep.title,
        season_episode_label: this._formatSeasonEpisodeLabel(ep),
        description: '',
        episode: ep,
      }));

    return {
      character_id: ch.id,
      name: ch.name,
      biography: ch.biography || '',
      short_description: ch.short_description || '',
      profile_image: ch.profile_image || null,
      key_moments,
    };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const event_types = [
      { value: 'live_qa', label: 'Live Q&A' },
      { value: 'watch_party', label: 'Watch Party' },
      { value: 'premiere', label: 'Premiere' },
      { value: 'meet_and_greet', label: 'Meet & Greet' },
      { value: 'panel', label: 'Panel' },
      { value: 'other', label: 'Other' },
    ];

    const location_types = [
      { value: 'online', label: 'Online' },
      { value: 'physical', label: 'In Person' },
    ];

    const time_of_day_presets = [
      { value: 'morning', label: 'Morning (6 AM - 12 PM)', start_hour: 6, end_hour: 12 },
      { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)', start_hour: 12, end_hour: 18 },
      { value: 'evening', label: 'Evening (6 PM - 11 PM)', start_hour: 18, end_hour: 23 },
    ];

    const sort_options = [
      { value: 'date_asc', label: 'Date: Soonest First' },
      { value: 'date_desc', label: 'Date: Latest First' },
    ];

    return {
      event_types,
      location_types,
      time_of_day_presets,
      sort_options,
    };
  }

  // listEvents(filters, sort, pagination)
  listEvents(filters, sort, pagination) {
    const events = this._getFromStorage('events', []);
    const reminders = this._getFromStorage('reminders', []);

    let list = events.slice();
    const f = filters || {};

    if (f.event_type) {
      list = list.filter((e) => e.event_type === f.event_type);
    }
    if (f.location_type) {
      list = list.filter((e) => e.location_type === f.location_type);
    }
    if (f.start_date_from) {
      const min = new Date(f.start_date_from);
      list = list.filter((e) => {
        if (!e.start_datetime) return false;
        const d = new Date(e.start_datetime);
        return !isNaN(d.getTime()) && d >= min;
      });
    }
    if (f.start_date_to) {
      const max = new Date(f.start_date_to);
      list = list.filter((e) => {
        if (!e.start_datetime) return false;
        const d = new Date(e.start_datetime);
        return !isNaN(d.getTime()) && d <= max;
      });
    }
    if (f.time_of_day_preset) {
      const preset = this._getTimeOfDayPresetHours(f.time_of_day_preset);
      if (preset) {
        list = list.filter((e) => {
          if (!e.start_datetime) return false;
          const d = new Date(e.start_datetime);
          if (isNaN(d.getTime())) return false;
          const hour = d.getHours();
          return hour >= preset.start && hour < preset.end;
        });
      }
    }

    const s = (sort && sort.value) || null;
    if (s === 'date_asc') {
      list.sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return da - db;
      });
    } else if (s === 'date_desc') {
      list.sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return db - da;
      });
    }

    const total_count = list.length;

    const page = (pagination && pagination.page) || 1;
    const pageSize = (pagination && pagination.page_size) || 20;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize);

    const resultEvents = paged.map((ev) => {
      const inReminders = reminders.some((r) => r.event_id === ev.id && !r.is_dismissed);
      return {
        event_id: ev.id,
        title: ev.title,
        description: ev.description || '',
        event_type: ev.event_type,
        event_type_label: this._formatEventTypeLabel(ev.event_type),
        location_type: ev.location_type,
        location_summary:
          ev.location_type === 'online'
            ? 'Online'
            : ev.location_detail || 'Location TBA',
        start_datetime: ev.start_datetime || null,
        end_datetime: ev.end_datetime || null,
        start_time_label: this._formatTimeLabel(ev.start_datetime),
        image: ev.image || null,
        is_in_reminders: !!inReminders,
        event: ev,
      };
    });

    return {
      events: resultEvents,
      total_count,
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const reminders = this._getFromStorage('reminders', []);
    const ev = events.find((e) => e.id === eventId) || null;
    if (!ev) {
      return {
        event_id: null,
        title: '',
        description: '',
        event_type: null,
        event_type_label: '',
        location_type: null,
        location_detail: '',
        start_datetime: null,
        end_datetime: null,
        timezone: null,
        image: null,
        registration_url: null,
        is_in_reminders: false,
      };
    }

    const inReminders = reminders.some((r) => r.event_id === ev.id && !r.is_dismissed);

    return {
      event_id: ev.id,
      title: ev.title,
      description: ev.description || '',
      event_type: ev.event_type,
      event_type_label: this._formatEventTypeLabel(ev.event_type),
      location_type: ev.location_type,
      location_detail: ev.location_detail || '',
      start_datetime: ev.start_datetime || null,
      end_datetime: ev.end_datetime || null,
      timezone: ev.timezone || null,
      image: ev.image || null,
      registration_url: ev.registration_url || null,
      is_in_reminders: !!inReminders,
      event: ev,
    };
  }

  // addEventReminder(eventId, note)
  addEventReminder(eventId, note) {
    const events = this._getFromStorage('events', []);
    const reminders = this._getFromStorage('reminders', []);

    const ev = events.find((e) => e.id === eventId);
    if (!ev) {
      return {
        success: false,
        reminder_id: null,
        message: 'Event not found.',
      };
    }

    const existing = reminders.find((r) => r.event_id === eventId && !r.is_dismissed);
    if (existing) {
      return {
        success: true,
        reminder_id: existing.id,
        message: 'Reminder already exists.',
      };
    }

    const reminder = {
      id: this._generateId('reminder'),
      event_id: eventId,
      created_at: this._nowISO(),
      note: note || '',
      is_dismissed: false,
    };
    reminders.push(reminder);
    this._saveToStorage('reminders', reminders);

    return {
      success: true,
      reminder_id: reminder.id,
      message: 'Reminder added.',
    };
  }

  // getReminders
  getReminders() {
    const reminders = this._getFromStorage('reminders', []);
    const events = this._getFromStorage('events', []);

    return reminders
      .filter((r) => !r.is_dismissed)
      .map((r) => {
        const ev = events.find((e) => e.id === r.event_id) || null;
        let eventInfo = null;
        if (ev) {
          eventInfo = {
            event_id: ev.id,
            title: ev.title,
            start_datetime: ev.start_datetime || null,
            event_type_label: this._formatEventTypeLabel(ev.event_type),
            event: ev,
          };
        }
        return {
          reminder_id: r.id,
          created_at: r.created_at || null,
          note: r.note || '',
          is_dismissed: !!r.is_dismissed,
          event: eventInfo,
        };
      });
  }

  // getStoreFilterOptions
  getStoreFilterOptions() {
    const categories = [
      { value: 'poster', label: 'Posters' },
      { value: 'apparel', label: 'Apparel' },
      { value: 'accessories', label: 'Accessories' },
      { value: 'home_decor', label: 'Home Décor' },
      { value: 'other_merch', label: 'Other Merchandise' },
    ];

    const price_ranges = [
      { max_price: 25, label: 'Up to $25' },
      { max_price: 50, label: 'Up to $50' },
      { max_price: 100, label: 'Up to $100' },
    ];

    const rating_thresholds = [
      { min_rating: 4.0, label: '4 stars & up' },
      { min_rating: 3.0, label: '3 stars & up' },
    ];

    const shipping_options = [
      { value: 'free_shipping', label: 'Free Shipping' },
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
    ];

    return {
      categories,
      price_ranges,
      rating_thresholds,
      shipping_options,
      sort_options,
    };
  }

  // listProducts(filters, sort, pagination)
  listProducts(filters, sort, pagination) {
    const products = this._getFromStorage('products', []);

    let list = products.slice();
    const f = filters || {};

    if (f.category) {
      list = list.filter((p) => p.category === f.category);
    }
    if (f.max_price != null) {
      list = list.filter((p) => (p.price || 0) <= f.max_price);
    }
    if (f.min_price != null) {
      list = list.filter((p) => (p.price || 0) >= f.min_price);
    }
    if (f.min_average_rating != null) {
      list = list.filter((p) => (p.average_rating || 0) >= f.min_average_rating);
    }
    if (f.free_shipping_only) {
      list = list.filter((p) => !!p.is_free_shipping);
    }

    const s = (sort && sort.value) || null;
    if (s === 'price_asc') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (s === 'price_desc') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (s === 'rating_desc') {
      list.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }

    const total_count = list.length;
    const page = (pagination && pagination.page) || 1;
    const pageSize = (pagination && pagination.page_size) || 20;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize);

    const resultProducts = paged.map((p) => ({
      product_id: p.id,
      name: p.name,
      category: p.category,
      category_label: this._formatCategoryLabel(p.category),
      price: p.price,
      currency: p.currency,
      price_label: this._formatPriceLabel(p.price, p.currency),
      average_rating: p.average_rating,
      rating_count: p.rating_count,
      image: p.image || null,
      is_free_shipping: !!p.is_free_shipping,
      free_shipping_label: p.is_free_shipping ? 'Free Shipping' : '',
      in_stock: p.in_stock !== false,
      product: p,
    }));

    return {
      products: resultProducts,
      total_count,
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const p = products.find((prod) => prod.id === productId) || null;
    if (!p) {
      return {
        product_id: null,
        name: '',
        description: '',
        category: null,
        category_label: '',
        price: null,
        currency: null,
        price_label: '',
        average_rating: null,
        rating_count: null,
        image: null,
        is_free_shipping: false,
        shipping_details: '',
        available_sizes: [],
        default_size: null,
        in_stock: false,
      };
    }

    return {
      product_id: p.id,
      name: p.name,
      description: p.description || '',
      category: p.category,
      category_label: this._formatCategoryLabel(p.category),
      price: p.price,
      currency: p.currency,
      price_label: this._formatPriceLabel(p.price, p.currency),
      average_rating: p.average_rating,
      rating_count: p.rating_count,
      image: p.image || null,
      is_free_shipping: !!p.is_free_shipping,
      shipping_details: p.shipping_details || '',
      available_sizes: Array.isArray(p.available_sizes) ? p.available_sizes : [],
      default_size: p.default_size || null,
      in_stock: p.in_stock !== false,
      product: p,
    };
  }

  // addToCart(productId, quantity = 1, selectedSize)
  addToCart(productId, quantity, selectedSize) {
    const products = this._getFromStorage('products', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();

    const qty = quantity != null ? Number(quantity) : 1;
    if (!productId || qty <= 0) {
      return {
        success: false,
        cart_id: cart.id,
        cart_item_id: null,
        message: 'Invalid product or quantity.',
        cart_item_count: 0,
      };
    }

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        cart_id: cart.id,
        cart_item_id: null,
        message: 'Product not found.',
        cart_item_count: 0,
      };
    }

    const size =
      selectedSize ||
      product.default_size ||
      (Array.isArray(product.available_sizes) && product.available_sizes[0]) ||
      null;

    const existing = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId && ci.selected_size === size
    );

    const now = this._nowISO();

    if (existing) {
      existing.quantity = (existing.quantity || 0) + qty;
      existing.unit_price = product.price;
      existing.total_price = existing.unit_price * existing.quantity;
      existing.added_at = existing.added_at || now;
    } else {
      const newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        selected_size: size,
        unit_price: product.price,
        total_price: product.price * qty,
        added_at: now,
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart', []);
    const cIndex = carts.findIndex((c) => c.id === cart.id);
    if (cIndex >= 0) {
      carts[cIndex].updated_at = now;
      this._saveToStorage('cart', carts);
    }

    let cartItemCount = 0;
    cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .forEach((ci) => {
        cartItemCount += Number(ci.quantity) || 0;
      });

    const lastItem = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId && ci.selected_size === size
    );

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: lastItem ? lastItem.id : null,
      message: 'Added to cart.',
      cart_item_count: cartItemCount,
    };
  }

  // getCart
  getCart() {
    const products = this._getFromStorage('products', []);
    const carts = this._getFromStorage('cart', []);
    const cartItems = this._getFromStorage('cart_items', []);

    let cart = carts.find((c) => c.status === 'active') || null;
    if (!cart) {
      cart = this._getOrCreateCart();
    }

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let cartTotal = 0;
    const items = itemsForCart.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const unitPrice = ci.unit_price != null ? ci.unit_price : product ? product.price : 0;
      const totalPrice = ci.total_price != null ? ci.total_price : unitPrice * (ci.quantity || 0);
      cartTotal += totalPrice;
      const currency = product ? product.currency : 'usd';
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        name: product ? product.name : '',
        image: product ? product.image || null : null,
        selected_size: ci.selected_size || null,
        quantity: ci.quantity,
        unit_price: unitPrice,
        unit_price_label: this._formatPriceLabel(unitPrice, currency),
        total_price: totalPrice,
        total_price_label: this._formatPriceLabel(totalPrice, currency),
        is_free_shipping: product ? !!product.is_free_shipping : false,
        product,
        cart,
      };
    });

    return {
      cart_id: cart.id,
      status: cart.status,
      items,
      cart_total: cartTotal,
      cart_total_label: this._formatPriceLabel(cartTotal, items[0] && items[0].product && items[0].product.currency),
    };
  }

  // updateCartItem(cartItemId, quantity, selectedSize)
  updateCartItem(cartItemId, quantity, selectedSize) {
    const cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
      };
    }

    const ci = cartItems[index];
    let removed = false;

    if (quantity != null) {
      const qty = Number(quantity);
      if (qty <= 0) {
        cartItems.splice(index, 1);
        removed = true;
      } else {
        ci.quantity = qty;
      }
    }

    if (!removed && selectedSize) {
      ci.selected_size = selectedSize;
    }

    if (!removed) {
      // Recalculate total_price if we still have the item
      ci.total_price = (ci.unit_price || 0) * (ci.quantity || 0);
    }

    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      message: removed ? 'Cart item removed.' : 'Cart item updated.',
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
      };
    }
    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);
    return {
      success: true,
      message: 'Cart item removed.',
    };
  }

  // getNewsletterOptions
  getNewsletterOptions() {
    const frequencies = [
      { value: 'immediately', label: 'Immediately' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
    ];

    const topics = [
      { value: 'behind_the_scenes', label: 'Behind-the-scenes' },
      { value: 'exclusive_clips', label: 'Exclusive clips' },
      { value: 'news', label: 'News & announcements' },
      { value: 'interviews', label: 'Cast & crew interviews' },
    ];

    return {
      frequencies,
      topics,
    };
  }

  // subscribeNewsletter(email, firstName, preferredUpdateFrequency, topics, favoriteCharacter, marketingOptIn)
  subscribeNewsletter(email, firstName, preferredUpdateFrequency, topics, favoriteCharacter, marketingOptIn) {
    const subs = this._getFromStorage('newsletter_subscriptions', []);

    if (!email || !preferredUpdateFrequency) {
      return {
        subscription_id: null,
        success: false,
        message: 'Email and preferred update frequency are required.',
      };
    }

    const validFrequencies = ['immediately', 'daily', 'weekly', 'monthly'];
    if (validFrequencies.indexOf(preferredUpdateFrequency) === -1) {
      return {
        subscription_id: null,
        success: false,
        message: 'Invalid update frequency.',
      };
    }

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      email,
      first_name: firstName || '',
      preferred_update_frequency: preferredUpdateFrequency,
      topics: Array.isArray(topics) ? topics : [],
      favorite_character: favoriteCharacter || '',
      marketing_opt_in: !!marketingOptIn,
      created_at: this._nowISO(),
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription_id: subscription.id,
      success: true,
      message: 'Subscribed to newsletter.',
    };
  }

  // getCommunityOverview
  getCommunityOverview() {
    const polls = this._getFromStorage('polls', []);
    const threads = this._getFromStorage('discussion_threads', []);
    const comments = this._getFromStorage('discussion_comments', []);

    const featured_polls = polls
      .filter((p) => p.is_featured)
      .map((p) => ({
        poll_id: p.id,
        title: p.title,
        question: p.question,
        status: p.status,
      }));

    const highlightedThreadsRaw = threads
      .filter((t) => t.category === 'episode_discussion')
      .sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      })
      .slice(0, 10);

    const highlighted_threads = highlightedThreadsRaw.map((t) => {
      const replyCount = comments.filter((c) => c.thread_id === t.id).length;
      return {
        thread_id: t.id,
        title: t.title,
        category: t.category,
        reply_count: replyCount,
      };
    });

    return {
      featured_polls,
      highlighted_threads,
    };
  }

  // getPollDetails(pollId)
  getPollDetails(pollId) {
    const polls = this._getFromStorage('polls', []);
    const options = this._getFromStorage('poll_options', []);
    const characters = this._getFromStorage('characters', []);

    const poll = polls.find((p) => p.id === pollId) || null;
    if (!poll) {
      return {
        poll_id: null,
        title: '',
        question: '',
        description: '',
        status: null,
        options: [],
      };
    }

    const pollOptions = options
      .filter((o) => o.poll_id === pollId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((o) => {
        const ch = o.associated_character_id
          ? characters.find((c) => c.id === o.associated_character_id)
          : null;
        return {
          option_id: o.id,
          label: o.label,
          description: o.description || '',
          associated_character_id: o.associated_character_id || null,
          fan_rating_score: o.fan_rating_score,
          heart_count: o.heart_count,
          order: o.order,
          associated_character: ch,
        };
      });

    return {
      poll_id: poll.id,
      title: poll.title,
      question: poll.question,
      description: poll.description || '',
      status: poll.status,
      options: pollOptions,
    };
  }

  // submitPollVote(pollId, optionId, commentText, isGuest = true)
  submitPollVote(pollId, optionId, commentText, isGuest) {
    const polls = this._getFromStorage('polls', []);
    const options = this._getFromStorage('poll_options', []);
    const votes = this._getFromStorage('poll_votes', []);

    const poll = polls.find((p) => p.id === pollId);
    if (!poll) {
      return {
        success: false,
        message: 'Poll not found.',
      };
    }
    if (poll.status !== 'open') {
      return {
        success: false,
        message: 'Poll is not open.',
      };
    }

    const option = options.find((o) => o.id === optionId && o.poll_id === pollId);
    if (!option) {
      return {
        success: false,
        message: 'Poll option not found.',
      };
    }

    const vote = {
      id: this._generateId('poll_vote'),
      poll_id: pollId,
      option_id: optionId,
      comment_text: commentText || '',
      created_at: this._nowISO(),
      is_guest: isGuest !== false,
    };

    votes.push(vote);
    this._saveToStorage('poll_votes', votes);

    return {
      success: true,
      message: 'Vote submitted.',
    };
  }

  // listDiscussionThreads(category, searchQuery, pagination)
  listDiscussionThreads(category, searchQuery, pagination) {
    const threads = this._getFromStorage('discussion_threads', []);
    const comments = this._getFromStorage('discussion_comments', []);
    const episodes = this._getFromStorage('episodes', []);

    let list = threads.slice();
    if (category) {
      list = list.filter((t) => t.category === category);
    }

    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      list = list.filter((t) => String(t.title || '').toLowerCase().indexOf(q) !== -1);
    }

    const total_count = list.length;
    const page = (pagination && pagination.page) || 1;
    const pageSize = (pagination && pagination.page_size) || 20;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize);

    const resultThreads = paged.map((t) => {
      const replyCount = comments.filter((c) => c.thread_id === t.id).length;
      const ep = t.associated_episode_id
        ? episodes.find((e) => e.id === t.associated_episode_id)
        : null;
      return {
        thread_id: t.id,
        title: t.title,
        category: t.category,
        associated_episode_id: t.associated_episode_id || null,
        created_at: t.created_at || null,
        reply_count: replyCount,
        associated_episode: ep,
      };
    });

    return {
      threads: resultThreads,
      total_count,
    };
  }

  // getDiscussionThread(threadId)
  getDiscussionThread(threadId) {
    const threads = this._getFromStorage('discussion_threads', []);
    const comments = this._getFromStorage('discussion_comments', []);
    const episodes = this._getFromStorage('episodes', []);

    const thread = threads.find((t) => t.id === threadId) || null;
    if (!thread) {
      return {
        thread_id: null,
        title: '',
        description: '',
        category: null,
        associated_episode_id: null,
        created_at: null,
        is_locked: false,
        comments: [],
      };
    }

    const threadComments = comments.filter((c) => c.thread_id === threadId);
    const commentsById = {};
    threadComments.forEach((c) => {
      commentsById[c.id] = c;
    });

    const mappedComments = threadComments.map((c) => {
      let parentComment = null;
      if (c.parent_comment_id && commentsById[c.parent_comment_id]) {
        const p = commentsById[c.parent_comment_id];
        parentComment = {
          comment_id: p.id,
          parent_comment_id: p.parent_comment_id || null,
          display_name: p.display_name,
          text: p.text,
          created_at: p.created_at,
          is_guest: p.is_guest,
        };
      }
      return {
        comment_id: c.id,
        parent_comment_id: c.parent_comment_id || null,
        display_name: c.display_name,
        text: c.text,
        created_at: c.created_at,
        is_guest: !!c.is_guest,
        parent_comment: parentComment,
      };
    });

    const ep = thread.associated_episode_id
      ? episodes.find((e) => e.id === thread.associated_episode_id)
      : null;

    return {
      thread_id: thread.id,
      title: thread.title,
      description: thread.description || '',
      category: thread.category,
      associated_episode_id: thread.associated_episode_id || null,
      created_at: thread.created_at || null,
      is_locked: !!thread.is_locked,
      comments: mappedComments,
      associated_episode: ep,
    };
  }

  // postDiscussionComment(threadId, displayName, text, notifyRepliesViaInbox, parentCommentId, isGuest)
  postDiscussionComment(threadId, displayName, text, notifyRepliesViaInbox, parentCommentId, isGuest) {
    const threads = this._getFromStorage('discussion_threads', []);
    const comments = this._getFromStorage('discussion_comments', []);

    const thread = threads.find((t) => t.id === threadId);
    if (!thread) {
      return {
        comment_id: null,
        success: false,
        message: 'Thread not found.',
      };
    }
    if (thread.is_locked) {
      return {
        comment_id: null,
        success: false,
        message: 'Thread is locked.',
      };
    }

    if (!displayName || !text) {
      return {
        comment_id: null,
        success: false,
        message: 'Display name and text are required.',
      };
    }

    const comment = {
      id: this._generateId('discussion_comment'),
      thread_id: threadId,
      display_name: displayName,
      text,
      created_at: this._nowISO(),
      is_guest: isGuest !== false,
      notify_replies_via_inbox: !!notifyRepliesViaInbox,
      parent_comment_id: parentCommentId || null,
    };

    comments.push(comment);
    this._saveToStorage('discussion_comments', comments);

    return {
      comment_id: comment.id,
      success: true,
      message: 'Comment posted.',
    };
  }

  // getVideoFilterOptions
  getVideoFilterOptions() {
    const videos = this._getFromStorage('videos', []);

    const categories = [
      { value: 'behind_the_scenes', label: 'Behind the Scenes' },
      { value: 'trailer', label: 'Trailers' },
      { value: 'interview', label: 'Interviews' },
      { value: 'recap', label: 'Recaps' },
      { value: 'clip', label: 'Clips' },
      { value: 'other', label: 'Other' },
    ];

    const duration_presets = [
      { max_minutes: 5, label: 'Up to 5 minutes' },
      { max_minutes: 8, label: 'Up to 8 minutes' },
      { max_minutes: 15, label: 'Up to 15 minutes' },
      { max_minutes: 30, label: 'Up to 30 minutes' },
    ];

    const yearSet = new Set();
    videos.forEach((v) => {
      if (v.year != null) yearSet.add(v.year);
    });
    const years = Array.from(yearSet).sort((a, b) => b - a);

    const sort_options = [
      { value: 'duration_asc', label: 'Duration: Shortest First' },
      { value: 'duration_desc', label: 'Duration: Longest First' },
      { value: 'release_date_desc', label: 'Release Date: Newest First' },
    ];

    return {
      categories,
      duration_presets,
      years,
      sort_options,
    };
  }

  // listVideos(filters, sort, pagination)
  listVideos(filters, sort, pagination) {
    const videos = this._getFromStorage('videos', []);
    const favoriteVideos = this._getFromStorage('favorite_videos', []);

    let list = videos.slice();
    const f = filters || {};

    if (f.category) {
      list = list.filter((v) => v.category === f.category);
    }
    if (f.max_duration_minutes != null) {
      list = list.filter((v) => (v.duration_minutes || 0) <= f.max_duration_minutes);
    }
    if (f.min_duration_minutes != null) {
      list = list.filter((v) => (v.duration_minutes || 0) >= f.min_duration_minutes);
    }
    if (f.year != null) {
      list = list.filter((v) => v.year === f.year);
    }

    const s = (sort && sort.value) || null;
    if (s === 'duration_asc') {
      list.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
    } else if (s === 'duration_desc') {
      list.sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
    } else if (s === 'release_date_desc') {
      list.sort((a, b) => {
        const da = a.release_date ? new Date(a.release_date).getTime() : 0;
        const db = b.release_date ? new Date(b.release_date).getTime() : 0;
        return db - da;
      });
    }

    const total_count = list.length;
    const page = (pagination && pagination.page) || 1;
    const pageSize = (pagination && pagination.page_size) || 20;
    const startIndex = (page - 1) * pageSize;
    const paged = list.slice(startIndex, startIndex + pageSize);

    const resultVideos = paged.map((v) => {
      const isFavorited = favoriteVideos.some((fv) => fv.video_id === v.id);
      return {
        video_id: v.id,
        title: v.title,
        description: v.description || '',
        category: v.category,
        category_label: this._formatCategoryLabel(v.category),
        duration_minutes: v.duration_minutes,
        duration_label: this._formatRuntimeLabel(v.duration_minutes),
        year: v.year || null,
        release_date: v.release_date || null,
        thumbnail_image: v.thumbnail_image || null,
        is_favorited: !!isFavorited,
        video: v,
      };
    });

    return {
      videos: resultVideos,
      total_count,
    };
  }

  // addFavoriteVideo(videoId)
  addFavoriteVideo(videoId) {
    const favorites = this._getFromStorage('favorite_videos', []);
    const existing = favorites.find((fv) => fv.video_id === videoId);
    if (existing) {
      return {
        success: true,
        favorite_id: existing.id,
        message: 'Video already in favorites.',
      };
    }

    const favorite = {
      id: this._generateId('favorite_video'),
      video_id: videoId,
      added_at: this._nowISO(),
    };
    favorites.push(favorite);
    this._saveToStorage('favorite_videos', favorites);

    return {
      success: true,
      favorite_id: favorite.id,
      message: 'Video added to favorites.',
    };
  }

  // removeFavoriteVideo(videoId)
  removeFavoriteVideo(videoId) {
    const favorites = this._getFromStorage('favorite_videos', []);
    const remaining = favorites.filter((fv) => fv.video_id !== videoId);
    this._saveToStorage('favorite_videos', remaining);
    return {
      success: true,
      message: 'Video removed from favorites.',
    };
  }

  // getFavoriteVideos
  getFavoriteVideos() {
    const favorites = this._getFromStorage('favorite_videos', []);
    const videos = this._getFromStorage('videos', []);

    return favorites
      .slice()
      .sort((a, b) => {
        const da = a.added_at ? new Date(a.added_at).getTime() : 0;
        const db = b.added_at ? new Date(b.added_at).getTime() : 0;
        return db - da;
      })
      .map((fv) => {
        const v = videos.find((vid) => vid.id === fv.video_id) || null;
        return {
          favorite_id: fv.id,
          video_id: fv.video_id,
          title: v ? v.title : '',
          thumbnail_image: v ? v.thumbnail_image || null : null,
          duration_label: v ? this._formatRuntimeLabel(v.duration_minutes) : '',
          video: v,
        };
      });
  }

  // listScheduleEntries(weekOffset = 0, filters)
  listScheduleEntries(weekOffset, filters) {
    const offset = weekOffset != null ? Number(weekOffset) : 0;
    const { start, end } = this._getCurrentWeekRange();
    const weekStart = new Date(start.getTime() + offset * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(end.getTime() + offset * 7 * 24 * 60 * 60 * 1000);

    const schedules = this._getFromStorage('episode_schedules', []);
    const episodes = this._getFromStorage('episodes', []);

    const f = filters || {};

    let list = schedules.filter((s) => {
      const d = new Date(s.air_start_datetime);
      if (isNaN(d.getTime())) return false;
      return d >= weekStart && d <= weekEnd;
    });

    if (Array.isArray(f.days_of_week) && f.days_of_week.length > 0) {
      const daysLower = f.days_of_week.map((d) => d.toLowerCase());
      list = list.filter((s) => {
        const d = new Date(s.air_start_datetime);
        if (isNaN(d.getTime())) return false;
        const val = this._dayOfWeekValueFromDate(d);
        return daysLower.indexOf(val) !== -1;
      });
    }

    if (f.time_slot_preset) {
      const preset = this._getScheduleTimeSlotPreset(f.time_slot_preset);
      if (preset) {
        list = list.filter((s) => {
          let hour = null;
          if (typeof s.air_start_datetime === 'string') {
            const match = s.air_start_datetime.match(/T(\d{2}):(\d{2})/);
            if (match) {
              hour = parseInt(match[1], 10);
            }
          }
          if (hour == null) {
            const d = new Date(s.air_start_datetime);
            if (isNaN(d.getTime())) return false;
            hour = d.getHours();
          }
          return hour >= preset.start && hour < preset.end;
        });
      }
    }

    const entries = list
      .slice()
      .sort((a, b) => {
        const da = new Date(a.air_start_datetime).getTime();
        const db = new Date(b.air_start_datetime).getTime();
        return da - db;
      })
      .map((s) => {
        const ep = episodes.find((e) => e.id === s.episode_id) || null;
        const startDate = new Date(s.air_start_datetime);
        const dayVal = this._dayOfWeekValueFromDate(startDate);
        return {
          schedule_entry_id: s.id,
          episode_id: s.episode_id,
          episode_title: ep ? ep.title : '',
          season_episode_label: ep ? this._formatSeasonEpisodeLabel(ep) : '',
          air_start_datetime: s.air_start_datetime,
          air_end_datetime: s.air_end_datetime || null,
          day_label: this._dayOfWeekLabelFromValue(dayVal),
          time_range_label: this._formatTimeRangeLabel(
            s.air_start_datetime,
            s.air_end_datetime
          ),
          timezone: s.timezone || null,
          is_new_episode: !!s.is_new_episode,
          episode: ep,
        };
      });

    const week_start_date = weekStart.toISOString().split('T')[0];
    const week_end_date = weekEnd.toISOString().split('T')[0];

    return {
      week_start_date,
      week_end_date,
      entries,
    };
  }

  // getScheduleFilterOptions
  getScheduleFilterOptions() {
    const days_of_week = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' },
    ];

    const time_slot_presets = [
      { value: 'prime_time', label: 'Prime Time (7 PM - 10 PM)', start_hour: 19, end_hour: 22 },
      { value: 'morning', label: 'Morning (6 AM - 12 PM)', start_hour: 6, end_hour: 12 },
      { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)', start_hour: 12, end_hour: 18 },
      { value: 'evening', label: 'Evening (6 PM - 11 PM)', start_hour: 18, end_hour: 23 },
    ];

    return {
      days_of_week,
      time_slot_presets,
    };
  }

  // createViewingPlan(name, description, scheduleEntryIds)
  createViewingPlan(name, description, scheduleEntryIds) {
    if (!Array.isArray(scheduleEntryIds) || scheduleEntryIds.length === 0) {
      return {
        viewing_plan_id: null,
        success: false,
        message: 'At least one schedule entry is required.',
      };
    }

    const plan = this._getOrCreateViewingPlan(name, description, scheduleEntryIds);

    return {
      viewing_plan_id: plan.id,
      success: true,
      message: 'Viewing plan created.',
    };
  }

  // getViewingPlan(viewingPlanId)
  getViewingPlan(viewingPlanId) {
    const plans = this._getFromStorage('viewing_plans', []);
    const items = this._getFromStorage('viewing_plan_items', []);
    const schedules = this._getFromStorage('episode_schedules', []);
    const episodes = this._getFromStorage('episodes', []);

    const plan = plans.find((p) => p.id === viewingPlanId) || null;
    if (!plan) {
      return {
        viewing_plan_id: null,
        name: '',
        description: '',
        items: [],
      };
    }

    const planItems = items
      .filter((i) => i.viewing_plan_id === viewingPlanId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((i, index) => {
        const se = schedules.find((s) => s.id === i.schedule_entry_id) || null;
        let scheduleEntry = null;
        if (se) {
          const ep = episodes.find((e) => e.id === se.episode_id) || null;
          scheduleEntry = {
            schedule_entry_id: se.id,
            episode_id: se.episode_id,
            episode_title: ep ? ep.title : '',
            season_episode_label: ep ? this._formatSeasonEpisodeLabel(ep) : '',
            air_start_datetime: se.air_start_datetime,
            time_range_label: this._formatTimeRangeLabel(
              se.air_start_datetime,
              se.air_end_datetime
            ),
            episode: ep,
          };
        }
        return {
          viewing_plan_item_id: i.id,
          position: i.position != null ? i.position : index + 1,
          schedule_entry: scheduleEntry,
        };
      });

    return {
      viewing_plan_id: plan.id,
      name: plan.name,
      description: plan.description || '',
      items: planItems,
    };
  }

  // getAboutContent
  getAboutContent() {
    const content = this._getFromStorage('about_content', null);
    if (!content) {
      return {
        headline: '',
        body: '',
        creators: [],
        highlight_links: [],
      };
    }
    return content;
  }

  // getHelpContent
  getHelpContent() {
    const content = this._getFromStorage('help_content', null);
    if (!content) {
      return {
        sections: [],
        contact_methods: [],
      };
    }
    return content;
  }

  // getPoliciesContent
  getPoliciesContent() {
    const content = this._getFromStorage('policies_content', null);
    if (!content) {
      return {
        privacy_policy_html: '',
        terms_of_use_html: '',
        community_guidelines_html: '',
      };
    }
    return content;
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
