// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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
  // Storage helpers
  // ----------------------
  _initStorage() {
    const keys = [
      'comics',
      'comic_user_states',
      'tags',
      'comic_tags',
      'playlists',
      'playlist_items',
      'comments',
      'product_categories',
      'products',
      'cart',
      'cart_items',
      'series',
      'series_subscriptions',
      'episodes',
      'episode_progress',
      'reading_queue',
      'reading_queue_items',
      'library_items',
      'settings'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
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
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ----------------------
  // Settings helpers
  // ----------------------
  _getOrCreateSettings() {
    let settingsArr = this._getFromStorage('settings');
    if (!Array.isArray(settingsArr)) {
      settingsArr = [];
    }

    let settings = settingsArr[0];
    if (!settings) {
      settings = {
        id: this._generateId('settings'),
        theme: 'system',
        showOnlyColorComics: false,
        hideDarkHumor: false,
        darkHumorMinRating: 0,
        updatedAt: this._now()
      };
      settingsArr.push(settings);
      this._saveToStorage('settings', settingsArr);
    }

    return settings;
  }

  _saveSettings(settings) {
    let settingsArr = this._getFromStorage('settings');
    if (!Array.isArray(settingsArr)) {
      settingsArr = [];
    }
    if (settingsArr.length === 0) {
      settingsArr.push(settings);
    } else {
      settingsArr[0] = settings;
    }
    this._saveToStorage('settings', settingsArr);
  }

  // Apply user content settings (color-only, dark humor rating threshold)
  _applyUserSettingsFiltersToComics(comics) {
    if (!Array.isArray(comics) || comics.length === 0) return [];

    const settings = this._getOrCreateSettings();
    let filtered = comics.slice();

    if (settings.showOnlyColorComics) {
      filtered = filtered.filter(function (c) {
        return !!c.isColor;
      });
    }

    if (settings.hideDarkHumor) {
      const comicTags = this._getFromStorage('comic_tags');
      const tags = this._getFromStorage('tags');

      filtered = filtered.filter(function (comic) {
        const ctForComic = comicTags.filter(function (ct) {
          return ct.comicId === comic.id;
        });
        if (ctForComic.length === 0) {
          return true;
        }
        const hasDarkHumor = ctForComic.some(function (ct) {
          const tag = tags.find(function (t) {
            return t.id === ct.tagId;
          });
          if (!tag) return false;
          const name = (tag.name || '').toLowerCase();
          const slug = (tag.slug || '').toLowerCase();
          if (name.indexOf('dark humor') !== -1) return true;
          if (slug.indexOf('dark') !== -1 && slug.indexOf('humor') !== -1) return true;
          return false;
        });
        if (!hasDarkHumor) return true;
        const min = typeof settings.darkHumorMinRating === 'number' ? settings.darkHumorMinRating : 0;
        if (typeof comic.ratingAverage !== 'number') return false;
        return comic.ratingAverage >= min;
      });
    }

    return filtered;
  }

  // ----------------------
  // Cart helpers
  // ----------------------
  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts)) {
      carts = [];
    }

    let cart = carts.find(function (c) {
      return c.status === 'active';
    });

    if (!cart) {
      const now = this._now();
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  // ----------------------
  // Reading queue helpers
  // ----------------------
  _getActiveReadingQueue() {
    let queues = this._getFromStorage('reading_queue');
    if (!Array.isArray(queues)) {
      queues = [];
    }

    let queue = queues.find(function (q) {
      return q.status === 'active';
    });

    if (!queue) {
      const now = this._now();
      queue = {
        id: this._generateId('queue'),
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      queues.push(queue);
      this._saveToStorage('reading_queue', queues);
    }

    return queue;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageContent()
  getHomePageContent() {
    let comics = this._getFromStorage('comics');
    comics = this._applyUserSettingsFiltersToComics(comics);

    const seriesList = this._getFromStorage('series');

    const byRatingDesc = function (a, b) {
      const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
      const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
      if (rb !== ra) return rb - ra;
      const ca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
      const cb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
      return cb - ca;
    };

    const now = new Date();
    const latestComics = comics
      .slice()
      .sort(function (a, b) {
        const da = new Date(a.publishDate || a.createdAt || 0).getTime();
        const db = new Date(b.publishDate || b.createdAt || 0).getTime();
        return db - da;
      })
      .slice(0, 20);

    const topRatedComics = comics
      .slice()
      .sort(byRatingDesc)
      .slice(0, 20);

    const featuredComics = comics
      .filter(function (c) { return !!c.isTrendingToday; })
      .sort(function (a, b) {
        const fa = typeof a.funnyScore === 'number' ? a.funnyScore : 0;
        const fb = typeof b.funnyScore === 'number' ? b.funnyScore : 0;
        if (fb !== fa) return fb - fa;
        return byRatingDesc(a, b);
      })
      .slice(0, 10);

    const featuredSeries = seriesList
      .filter(function (s) { return !!s.isFeatured; })
      .sort(function (a, b) {
        const oa = typeof a.featuredOrder === 'number' ? a.featuredOrder : 0;
        const ob = typeof b.featuredOrder === 'number' ? b.featuredOrder : 0;
        if (oa !== ob) return oa - ob;
        return (a.title || '').localeCompare(b.title || '');
      });

    return {
      featuredComics: this._clone(featuredComics),
      latestComics: this._clone(latestComics),
      topRatedComics: this._clone(topRatedComics),
      featuredSeries: this._clone(featuredSeries)
    };
  }

  // searchComics(query, filters, sort, page, pageSize)
  searchComics(query, filters, sort, page, pageSize) {
    query = query || '';
    filters = filters || {};
    sort = sort || 'relevance';
    page = page || 1;
    pageSize = pageSize || 20;

    let comics = this._getFromStorage('comics');
    comics = this._applyUserSettingsFiltersToComics(comics);

    const qLower = query.trim().toLowerCase();
    if (qLower) {
      comics = comics.filter(function (c) {
        const title = (c.title || '').toLowerCase();
        const desc = (c.description || '').toLowerCase();
        return title.indexOf(qLower) !== -1 || desc.indexOf(qLower) !== -1;
      });
    }

    if (filters.format) {
      comics = comics.filter(function (c) {
        return c.format === filters.format;
      });
    }

    if (typeof filters.minPanels === 'number') {
      comics = comics.filter(function (c) {
        return typeof c.panelCount === 'number' && c.panelCount >= filters.minPanels;
      });
    }

    if (typeof filters.maxPanels === 'number') {
      comics = comics.filter(function (c) {
        return typeof c.panelCount === 'number' && c.panelCount <= filters.maxPanels;
      });
    }

    if (filters.startDate || filters.endDate) {
      const start = this._parseDate(filters.startDate);
      const end = this._parseDate(filters.endDate);
      comics = comics.filter(function (c) {
        const d = new Date(c.publishDate || c.createdAt || 0);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    if (filters.dateRangePreset) {
      const now = new Date();
      let start = null;
      if (filters.dateRangePreset === 'last_30_days') {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (filters.dateRangePreset === 'last_6_months') {
        start = new Date(now.getTime() - 182 * 24 * 60 * 60 * 1000);
      } else if (filters.dateRangePreset === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
      if (start) {
        comics = comics.filter(function (c) {
          const d = new Date(c.publishDate || c.createdAt || 0);
          return d >= start && d <= now;
        });
      }
    }

    if (typeof filters.minRating === 'number') {
      comics = comics.filter(function (c) {
        return typeof c.ratingAverage === 'number' && c.ratingAverage >= filters.minRating;
      });
    }

    if (filters.onlyColor) {
      comics = comics.filter(function (c) { return !!c.isColor; });
    }

    if (filters.isTrendingToday) {
      comics = comics.filter(function (c) { return !!c.isTrendingToday; });
    }

    if (Array.isArray(filters.tagSlugs) && filters.tagSlugs.length > 0) {
      const tagSlugsLower = filters.tagSlugs.map(function (s) { return String(s).toLowerCase(); });
      const tags = this._getFromStorage('tags');
      const comicTags = this._getFromStorage('comic_tags');
      comics = comics.filter(function (c) {
        const ctForComic = comicTags.filter(function (ct) { return ct.comicId === c.id; });
        if (ctForComic.length === 0) return false;
        const comicTagSlugs = ctForComic
          .map(function (ct) {
            const tag = tags.find(function (t) { return t.id === ct.tagId; });
            return tag ? (tag.slug || '').toLowerCase() : null;
          })
          .filter(function (s) { return !!s; });
        return tagSlugsLower.every(function (slug) {
          return comicTagSlugs.indexOf(slug) !== -1;
        });
      });
    }

    // Sorting
    const sortFn = function (a, b) {
      if (sort === 'funniest') {
        const fa = typeof a.funnyScore === 'number' ? a.funnyScore : 0;
        const fb = typeof b.funnyScore === 'number' ? b.funnyScore : 0;
        if (fb !== fa) return fb - fa;
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        return rb - ra;
      }
      if (sort === 'most_viewed') {
        const va = typeof a.viewsToday === 'number' ? a.viewsToday : 0;
        const vb = typeof b.viewsToday === 'number' ? b.viewsToday : 0;
        if (vb !== va) return vb - va;
        return 0;
      }
      if (sort === 'rating_high_to_low') {
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const cb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        return cb - ca;
      }
      if (sort === 'newest') {
        const da = new Date(a.publishDate || a.createdAt || 0).getTime();
        const db = new Date(b.publishDate || b.createdAt || 0).getTime();
        return db - da;
      }
      // relevance fallback: rating then newest
      const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
      const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
      if (rb !== ra) return rb - ra;
      const da = new Date(a.publishDate || a.createdAt || 0).getTime();
      const db = new Date(b.publishDate || b.createdAt || 0).getTime();
      return db - da;
    };

    comics = comics.slice().sort(sortFn);

    const totalCount = comics.length;
    const startIndex = (page - 1) * pageSize;
    const paged = comics.slice(startIndex, startIndex + pageSize);

    const tagsAll = this._getFromStorage('tags');
    const comicTagsAll = this._getFromStorage('comic_tags');
    const states = this._getFromStorage('comic_user_states');

    const results = paged.map(function (comic) {
      const ctForComic = comicTagsAll.filter(function (ct) { return ct.comicId === comic.id; });
      const tags = ctForComic
        .map(function (ct) {
          return tagsAll.find(function (t) { return t.id === ct.tagId; });
        })
        .filter(function (t) { return !!t; });
      const state = states.find(function (s) { return s.comicId === comic.id; });
      return {
        comic: comic,
        tags: tags,
        isFavorited: state ? !!state.isFavorited : false,
        isBookmarked: state ? !!state.isBookmarked : false
      };
    });

    return {
      results: this._clone(results),
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // getComicFilterOptions(context)
  getComicFilterOptions(context) {
    // Static options based on enum definitions
    const formatOptions = [
      { value: 'single_panel', label: 'Single panel' },
      { value: 'multi_panel_strip', label: 'Multi-panel strip' },
      { value: 'multi_page', label: 'Multi-page' },
      { value: 'other', label: 'Other' }
    ];

    const ratingThresholds = [1, 2, 3, 3.5, 4, 4.5, 5];

    const dateRangePresets = [
      { value: 'today', label: 'Today' },
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_6_months', label: 'Last 6 months' }
    ];

    const panelCountPresets = [1, 3, 6, 9, 12];

    return {
      formatOptions: this._clone(formatOptions),
      ratingThresholds: this._clone(ratingThresholds),
      dateRangePresets: this._clone(dateRangePresets),
      panelCountPresets: this._clone(panelCountPresets)
    };
  }

  // getComicDetail(comicId)
  getComicDetail(comicId) {
    const comics = this._getFromStorage('comics');
    const comic = comics.find(function (c) { return c.id === comicId; }) || null;

    const tagsAll = this._getFromStorage('tags');
    const comicTagsAll = this._getFromStorage('comic_tags');
    const ctForComic = comic
      ? comicTagsAll.filter(function (ct) { return ct.comicId === comic.id; })
      : [];
    const tags = ctForComic
      .map(function (ct) {
        return tagsAll.find(function (t) { return t.id === ct.tagId; });
      })
      .filter(function (t) { return !!t; });

    const states = this._getFromStorage('comic_user_states');
    const userState = comic
      ? (states.find(function (s) { return s.comicId === comic.id; }) || null)
      : null;

    return {
      comic: this._clone(comic),
      tags: this._clone(tags),
      userState: this._clone(userState),
      ratingAverage: comic && typeof comic.ratingAverage === 'number' ? comic.ratingAverage : null,
      ratingCount: comic && typeof comic.ratingCount === 'number' ? comic.ratingCount : null
    };
  }

  // setFavoriteComicState(comicId, isFavorited)
  setFavoriteComicState(comicId, isFavorited) {
    let states = this._getFromStorage('comic_user_states');
    if (!Array.isArray(states)) states = [];

    let state = states.find(function (s) { return s.comicId === comicId; });
    const now = this._now();

    if (!state) {
      state = {
        id: this._generateId('comic_state'),
        comicId: comicId,
        isFavorited: !!isFavorited,
        isBookmarked: false,
        lastViewedAt: now
      };
      states.push(state);
    } else {
      state.isFavorited = !!isFavorited;
      state.lastViewedAt = now;
    }

    this._saveToStorage('comic_user_states', states);

    return {
      comicId: comicId,
      isFavorited: !!isFavorited,
      success: true
    };
  }

  // setBookmarkComicState(comicId, isBookmarked)
  setBookmarkComicState(comicId, isBookmarked) {
    let states = this._getFromStorage('comic_user_states');
    if (!Array.isArray(states)) states = [];

    let state = states.find(function (s) { return s.comicId === comicId; });
    const now = this._now();

    if (!state) {
      state = {
        id: this._generateId('comic_state'),
        comicId: comicId,
        isFavorited: false,
        isBookmarked: !!isBookmarked,
        lastViewedAt: now
      };
      states.push(state);
    } else {
      state.isBookmarked = !!isBookmarked;
      state.lastViewedAt = now;
    }

    this._saveToStorage('comic_user_states', states);

    return {
      comicId: comicId,
      isBookmarked: !!isBookmarked,
      success: true
    };
  }

  // getComicComments(comicId, page, pageSize)
  getComicComments(comicId, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 20;

    const all = this._getFromStorage('comments');
    const comics = this._getFromStorage('comics');

    let comments = all.filter(function (c) { return c.comicId === comicId; });

    comments = comments.slice().sort(function (a, b) {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return da - db;
    });

    const totalCount = comments.length;
    const startIndex = (page - 1) * pageSize;
    const paged = comments.slice(startIndex, startIndex + pageSize);

    const enriched = paged.map(function (comment) {
      const comic = comics.find(function (c) { return c.id === comment.comicId; }) || null;
      const extended = Object.assign({}, comment, { comic: comic });
      return extended;
    });

    return {
      comments: this._clone(enriched),
      totalCount: totalCount
    };
  }

  // postComicComment(comicId, text)
  postComicComment(comicId, text) {
    let comments = this._getFromStorage('comments');
    if (!Array.isArray(comments)) comments = [];

    const now = this._now();
    const comment = {
      id: this._generateId('comment'),
      comicId: comicId,
      text: String(text),
      createdAt: now
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      comment: this._clone(comment)
    };
  }

  // listPlaylists(type)
  listPlaylists(type) {
    let playlists = this._getFromStorage('playlists');
    if (!Array.isArray(playlists)) playlists = [];

    if (type) {
      playlists = playlists.filter(function (p) { return p.type === type; });
    }

    return {
      playlists: this._clone(playlists)
    };
  }

  // createPlaylist(name, type, description)
  createPlaylist(name, type, description) {
    let playlists = this._getFromStorage('playlists');
    if (!Array.isArray(playlists)) playlists = [];

    const now = this._now();
    const playlist = {
      id: this._generateId('playlist'),
      name: String(name),
      description: description != null ? String(description) : '',
      type: type,
      createdAt: now,
      updatedAt: now
    };

    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);

    return this._clone(playlist);
  }

  // renamePlaylist(playlistId, newName)
  renamePlaylist(playlistId, newName) {
    let playlists = this._getFromStorage('playlists');
    if (!Array.isArray(playlists)) playlists = [];

    const playlist = playlists.find(function (p) { return p.id === playlistId; }) || null;
    if (!playlist) return null;

    playlist.name = String(newName);
    playlist.updatedAt = this._now();

    this._saveToStorage('playlists', playlists);
    return this._clone(playlist);
  }

  // deletePlaylist(playlistId)
  deletePlaylist(playlistId) {
    let playlists = this._getFromStorage('playlists');
    if (!Array.isArray(playlists)) playlists = [];
    let items = this._getFromStorage('playlist_items');
    if (!Array.isArray(items)) items = [];

    const originalLength = playlists.length;
    playlists = playlists.filter(function (p) { return p.id !== playlistId; });
    const removed = playlists.length !== originalLength;

    items = items.filter(function (pi) { return pi.playlistId !== playlistId; });

    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_items', items);

    return { success: removed };
  }

  // getPlaylistDetail(playlistId)
  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find(function (p) { return p.id === playlistId; }) || null;

    let items = this._getFromStorage('playlist_items');
    if (!Array.isArray(items)) items = [];

    items = items
      .filter(function (pi) { return pi.playlistId === playlistId; })
      .sort(function (a, b) {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });

    const comics = this._getFromStorage('comics');
    const episodes = this._getFromStorage('episodes');

    const detailedItems = items.map(function (pi) {
      const comic = pi.contentType === 'comic'
        ? comics.find(function (c) { return c.id === pi.contentId; }) || null
        : null;
      const episode = pi.contentType === 'episode'
        ? episodes.find(function (e) { return e.id === pi.contentId; }) || null
        : null;
      return {
        playlistItem: pi,
        comic: comic,
        episode: episode
      };
    });

    // Estimate reading minutes based on panel counts
    let totalPanels = 0;
    detailedItems.forEach(function (item) {
      let panels = 0;
      if (item.comic && typeof item.comic.panelCount === 'number') {
        panels = item.comic.panelCount;
      } else if (item.episode && typeof item.episode.panelCount === 'number') {
        panels = item.episode.panelCount;
      } else {
        panels = 4; // default guess
      }
      totalPanels += panels;
    });
    const estimatedReadingMinutes = totalPanels * 0.5;

    return {
      playlist: this._clone(playlist),
      items: this._clone(detailedItems),
      totalItems: detailedItems.length,
      estimatedReadingMinutes: estimatedReadingMinutes
    };
  }

  // addComicToPlaylist(comicId, playlistId)
  addComicToPlaylist(comicId, playlistId) {
    let items = this._getFromStorage('playlist_items');
    if (!Array.isArray(items)) items = [];

    const existingForPlaylist = items.filter(function (pi) { return pi.playlistId === playlistId; });
    let nextPosition = 1;
    if (existingForPlaylist.length > 0) {
      nextPosition = existingForPlaylist.reduce(function (max, pi) {
        const pos = typeof pi.position === 'number' ? pi.position : 0;
        return pos > max ? pos : max;
      }, 0) + 1;
    }

    const item = {
      id: this._generateId('playlist_item'),
      playlistId: playlistId,
      contentType: 'comic',
      contentId: comicId,
      position: nextPosition,
      addedAt: this._now()
    };

    items.push(item);
    this._saveToStorage('playlist_items', items);

    return this._clone(item);
  }

  // addEpisodeToPlaylist(episodeId, playlistId)
  addEpisodeToPlaylist(episodeId, playlistId) {
    let items = this._getFromStorage('playlist_items');
    if (!Array.isArray(items)) items = [];

    const existingForPlaylist = items.filter(function (pi) { return pi.playlistId === playlistId; });
    let nextPosition = 1;
    if (existingForPlaylist.length > 0) {
      nextPosition = existingForPlaylist.reduce(function (max, pi) {
        const pos = typeof pi.position === 'number' ? pi.position : 0;
        return pos > max ? pos : max;
      }, 0) + 1;
    }

    const item = {
      id: this._generateId('playlist_item'),
      playlistId: playlistId,
      contentType: 'episode',
      contentId: episodeId,
      position: nextPosition,
      addedAt: this._now()
    };

    items.push(item);
    this._saveToStorage('playlist_items', items);

    return this._clone(item);
  }

  // removePlaylistItem(playlistItemId)
  removePlaylistItem(playlistItemId) {
    let items = this._getFromStorage('playlist_items');
    if (!Array.isArray(items)) items = [];

    const item = items.find(function (pi) { return pi.id === playlistItemId; }) || null;
    if (!item) {
      return { success: false };
    }
    const playlistId = item.playlistId;

    items = items.filter(function (pi) { return pi.id !== playlistItemId; });

    // Re-normalize positions for the playlist
    const playlistItems = items
      .filter(function (pi) { return pi.playlistId === playlistId; })
      .sort(function (a, b) {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });
    playlistItems.forEach(function (pi, index) {
      pi.position = index + 1;
    });

    this._saveToStorage('playlist_items', items);

    return { success: true };
  }

  // reorderPlaylistItems(playlistId, orderedItemIds)
  reorderPlaylistItems(playlistId, orderedItemIds) {
    orderedItemIds = Array.isArray(orderedItemIds) ? orderedItemIds : [];
    let items = this._getFromStorage('playlist_items');
    if (!Array.isArray(items)) items = [];

    const itemsMap = {};
    items.forEach(function (pi) {
      if (pi.playlistId === playlistId) {
        itemsMap[pi.id] = pi;
      }
    });

    let position = 1;
    orderedItemIds.forEach(function (id) {
      const item = itemsMap[id];
      if (item) {
        item.position = position++;
        delete itemsMap[id];
      }
    });

    // Any remaining items for this playlist keep their relative order after the ordered ones
    const remaining = Object.keys(itemsMap)
      .map(function (id) { return itemsMap[id]; })
      .sort(function (a, b) {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });
    remaining.forEach(function (item) {
      item.position = position++;
    });

    this._saveToStorage('playlist_items', items);
    return { success: true };
  }

  // listTags(search, featuredOnly)
  listTags(search, featuredOnly) {
    let tags = this._getFromStorage('tags');
    if (!Array.isArray(tags)) tags = [];

    if (search) {
      const s = String(search).toLowerCase();
      tags = tags.filter(function (t) {
        return (t.name || '').toLowerCase().indexOf(s) !== -1;
      });
    }

    if (featuredOnly) {
      tags = tags.filter(function (t) { return !!t.isFeatured; });
    }

    return {
      tags: this._clone(tags)
    };
  }

  // getComicsByTag(tagSlug, filters, sort, page, pageSize)
  getComicsByTag(tagSlug, filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'newest';
    page = page || 1;
    pageSize = pageSize || 20;

    const tags = this._getFromStorage('tags');
    const comicTags = this._getFromStorage('comic_tags');
    const comicsAll = this._applyUserSettingsFiltersToComics(this._getFromStorage('comics'));
    const states = this._getFromStorage('comic_user_states');

    const tag = tags.find(function (t) { return (t.slug || '') === tagSlug; }) || null;
    if (!tag) {
      return {
        tag: null,
        results: [],
        totalCount: 0
      };
    }

    const comicIdsForTag = comicTags
      .filter(function (ct) { return ct.tagId === tag.id; })
      .map(function (ct) { return ct.comicId; });

    let comics = comicsAll.filter(function (c) { return comicIdsForTag.indexOf(c.id) !== -1; });

    if (filters.dateRangePreset) {
      const now = new Date();
      let start = null;
      if (filters.dateRangePreset === 'last_30_days') {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (start) {
        comics = comics.filter(function (c) {
          const d = new Date(c.publishDate || c.createdAt || 0);
          return d >= start && d <= now;
        });
      }
    }

    if (typeof filters.minRating === 'number') {
      comics = comics.filter(function (c) {
        return typeof c.ratingAverage === 'number' && c.ratingAverage >= filters.minRating;
      });
    }

    if (sort === 'rating_high_to_low') {
      comics = comics.slice().sort(function (a, b) {
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const cb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        return cb - ca;
      });
    } else {
      comics = comics.slice().sort(function (a, b) {
        const da = new Date(a.publishDate || a.createdAt || 0).getTime();
        const db = new Date(b.publishDate || b.createdAt || 0).getTime();
        return db - da;
      });
    }

    const totalCount = comics.length;
    const startIndex = (page - 1) * pageSize;
    const paged = comics.slice(startIndex, startIndex + pageSize);

    const results = paged.map(function (comic) {
      const state = states.find(function (s) { return s.comicId === comic.id; });
      return {
        comic: comic,
        isFavorited: state ? !!state.isFavorited : false,
        isBookmarked: state ? !!state.isBookmarked : false
      };
    });

    return {
      tag: this._clone(tag),
      results: this._clone(results),
      totalCount: totalCount
    };
  }

  // getStoreOverview()
  getStoreOverview() {
    const categories = this._getFromStorage('product_categories');
    let products = this._getFromStorage('products');
    if (!Array.isArray(products)) products = [];

    const featuredProducts = products
      .slice()
      .sort(function (a, b) {
        const sa = typeof a.salesRank === 'number' ? a.salesRank : Number.MAX_SAFE_INTEGER;
        const sb = typeof b.salesRank === 'number' ? b.salesRank : Number.MAX_SAFE_INTEGER;
        if (sa !== sb) return sa - sb;
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        return rb - ra;
      })
      .slice(0, 20);

    return {
      categories: this._clone(categories),
      featuredProducts: this._clone(featuredProducts)
    };
  }

  // getProductFilterOptions(categoryCode)
  getProductFilterOptions(categoryCode) {
    const products = this._getFromStorage('products');

    // Derive genres from products in given category when possible
    const categories = this._getFromStorage('product_categories');
    const category = categories.find(function (c) { return c.code === categoryCode; }) || null;
    const categoryId = category ? category.id : null;

    const genreSet = {};
    products.forEach(function (p) {
      if (categoryId && p.categoryId !== categoryId) return;
      if (p.genre) {
        genreSet[p.genre] = true;
      }
    });
    const genreOptions = Object.keys(genreSet);

    const priceRanges = [
      { min: 0, max: 10, label: 'Under $10' },
      { min: 10, max: 25, label: '$10 to $25' },
      { min: 25, max: 50, label: '$25 to $50' },
      { min: 50, max: null, label: '$50 and up' }
    ];

    const ratingThresholds = [1, 2, 3, 4, 4.5, 5];
    const reviewCountOptions = [1, 5, 10, 25, 50, 100];
    const pageCountOptions = [50, 100, 150, 200, 300];

    return {
      priceRanges: this._clone(priceRanges),
      ratingThresholds: this._clone(ratingThresholds),
      reviewCountOptions: this._clone(reviewCountOptions),
      pageCountOptions: this._clone(pageCountOptions),
      genreOptions: this._clone(genreOptions)
    };
  }

  // listProducts(categoryCode, filters, sort, page, pageSize)
  listProducts(categoryCode, filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'best_selling';
    page = page || 1;
    pageSize = pageSize || 20;

    const categories = this._getFromStorage('product_categories');
    const productsAll = this._getFromStorage('products');

    const category = categories.find(function (c) { return c.code === categoryCode; }) || null;
    if (!category) {
      return { results: [], totalCount: 0 };
    }

    let products = productsAll.filter(function (p) {
      return p.categoryId === category.id;
    });

    if (typeof filters.maxPrice === 'number') {
      products = products.filter(function (p) { return typeof p.price === 'number' && p.price <= filters.maxPrice; });
    }

    if (typeof filters.minRating === 'number') {
      products = products.filter(function (p) { return typeof p.ratingAverage === 'number' && p.ratingAverage >= filters.minRating; });
    }

    if (typeof filters.minReviewCount === 'number') {
      products = products.filter(function (p) { return typeof p.reviewCount === 'number' && p.reviewCount >= filters.minReviewCount; });
    }

    if (typeof filters.minPageCount === 'number') {
      products = products.filter(function (p) { return typeof p.pageCount === 'number' && p.pageCount >= filters.minPageCount; });
    }

    if (filters.genre) {
      products = products.filter(function (p) { return p.genre === filters.genre; });
    }

    if (typeof filters.isGagStripCollection === 'boolean') {
      products = products.filter(function (p) { return !!p.isGagStripCollection === filters.isGagStripCollection; });
    }

    if (filters.productType) {
      products = products.filter(function (p) { return p.productType === filters.productType; });
    }

    if (typeof filters.isDigital === 'boolean') {
      products = products.filter(function (p) { return !!p.isDigital === filters.isDigital; });
    }

    if (typeof filters.isPhysical === 'boolean') {
      products = products.filter(function (p) { return !!p.isPhysical === filters.isPhysical; });
    }

    if (sort === 'price_low_to_high') {
      products = products.slice().sort(function (a, b) {
        const pa = typeof a.price === 'number' ? a.price : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.price === 'number' ? b.price : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
    } else if (sort === 'rating_high_to_low') {
      products = products.slice().sort(function (a, b) {
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.reviewCount === 'number' ? a.reviewCount : 0;
        const cb = typeof b.reviewCount === 'number' ? b.reviewCount : 0;
        return cb - ca;
      });
    } else {
      // best_selling default
      products = products.slice().sort(function (a, b) {
        const sa = typeof a.salesRank === 'number' ? a.salesRank : Number.MAX_SAFE_INTEGER;
        const sb = typeof b.salesRank === 'number' ? b.salesRank : Number.MAX_SAFE_INTEGER;
        if (sa !== sb) return sa - sb;
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        return rb - ra;
      });
    }

    const totalCount = products.length;
    const startIndex = (page - 1) * pageSize;
    const paged = products.slice(startIndex, startIndex + pageSize);

    const enriched = paged.map(function (p) {
      const extended = Object.assign({}, p, { category: category });
      return extended;
    });

    return {
      results: this._clone(enriched),
      totalCount: totalCount
    };
  }

  // getProductDetail(productId)
  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const product = products.find(function (p) { return p.id === productId; }) || null;
    if (!product) return null;

    const category = categories.find(function (c) { return c.id === product.categoryId; }) || null;
    const enriched = Object.assign({}, product, { category: category });
    return this._clone(enriched);
  }

  // addProductToCart(productId, quantity)
  addProductToCart(productId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    if (!product || !product.isPhysical) {
      return {
        success: false,
        cart: null,
        addedItem: null,
        message: 'Product not found or not a physical product.'
      };
    }

    const cart = this._getOrCreateCart();

    let cartItems = this._getFromStorage('cart_items');
    if (!Array.isArray(cartItems)) cartItems = [];

    let item = cartItems.find(function (ci) {
      return ci.cartId === cart.id && ci.productId === productId;
    });

    if (item) {
      item.quantity += quantity;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId: productId,
        quantity: quantity,
        unitPrice: product.price,
        addedAt: this._now()
      };
      cartItems.push(item);
    }

    // update cart updatedAt
    let carts = this._getFromStorage('cart');
    const cartRef = carts.find(function (c) { return c.id === cart.id; });
    if (cartRef) {
      cartRef.updatedAt = this._now();
      this._saveToStorage('cart', carts);
    }

    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      cart: this._clone(cartRef || cart),
      addedItem: this._clone(item),
      message: 'Added to cart.'
    };
  }

  // getCartDetails()
  getCartDetails() {
    const carts = this._getFromStorage('cart');
    const cart = carts.find(function (c) { return c.status === 'active'; }) || null;

    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        total: 0
      };
    }

    let cartItems = this._getFromStorage('cart_items');
    if (!Array.isArray(cartItems)) cartItems = [];
    const products = this._getFromStorage('products');

    const items = cartItems
      .filter(function (ci) { return ci.cartId === cart.id; })
      .map(function (ci) {
        const product = products.find(function (p) { return p.id === ci.productId; }) || null;
        const lineTotal = ci.quantity * ci.unitPrice;
        const extendedItem = Object.assign({}, ci, { product: product });
        return {
          cartItem: extendedItem,
          product: product,
          lineTotal: lineTotal
        };
      });

    const subtotal = items.reduce(function (sum, item) { return sum + item.lineTotal; }, 0);
    const total = subtotal;

    return {
      cart: this._clone(cart),
      items: this._clone(items),
      subtotal: subtotal,
      total: total
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    quantity = typeof quantity === 'number' ? quantity : 1;

    let cartItems = this._getFromStorage('cart_items');
    if (!Array.isArray(cartItems)) cartItems = [];

    const item = cartItems.find(function (ci) { return ci.id === cartItemId; }) || null;
    if (!item) {
      return { success: false, cart: null, cartItem: null };
    }

    if (quantity <= 0) {
      cartItems = cartItems.filter(function (ci) { return ci.id !== cartItemId; });
    } else {
      item.quantity = quantity;
    }

    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('cart');
    const cart = carts.find(function (c) { return c.id === item.cartId; }) || null;
    if (cart) {
      cart.updatedAt = this._now();
      this._saveToStorage('cart', carts);
    }

    return {
      success: true,
      cart: this._clone(cart),
      cartItem: this._clone(item)
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    if (!Array.isArray(cartItems)) cartItems = [];

    const item = cartItems.find(function (ci) { return ci.id === cartItemId; }) || null;
    if (!item) {
      return { success: false, cart: null };
    }

    cartItems = cartItems.filter(function (ci) { return ci.id !== cartItemId; });
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('cart');
    const cart = carts.find(function (c) { return c.id === item.cartId; }) || null;
    if (cart) {
      cart.updatedAt = this._now();
      this._saveToStorage('cart', carts);
    }

    return {
      success: true,
      cart: this._clone(cart)
    };
  }

  // addProductToLibrary(productId)
  addProductToLibrary(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    if (!product || !product.isDigital) {
      return { success: false, libraryItem: null };
    }

    let items = this._getFromStorage('library_items');
    if (!Array.isArray(items)) items = [];

    let item = items.find(function (li) { return li.productId === productId; }) || null;
    if (item) {
      return { success: true, libraryItem: this._clone(item) };
    }

    item = {
      id: this._generateId('library_item'),
      productId: productId,
      addedAt: this._now(),
      readStatus: 'not_started'
    };

    items.push(item);
    this._saveToStorage('library_items', items);

    return {
      success: true,
      libraryItem: this._clone(item)
    };
  }

  // getLibraryContents()
  getLibraryContents() {
    const items = this._getFromStorage('library_items');
    const products = this._getFromStorage('products');

    const detailed = items.map(function (li) {
      const product = products.find(function (p) { return p.id === li.productId; }) || null;
      const extendedItem = Object.assign({}, li, { product: product });
      return {
        libraryItem: extendedItem,
        product: product
      };
    });

    return {
      items: this._clone(detailed)
    };
  }

  // getFeaturedSeries()
  getFeaturedSeries() {
    const seriesList = this._getFromStorage('series');
    const featured = seriesList
      .filter(function (s) { return !!s.isFeatured; })
      .sort(function (a, b) {
        const oa = typeof a.featuredOrder === 'number' ? a.featuredOrder : 0;
        const ob = typeof b.featuredOrder === 'number' ? b.featuredOrder : 0;
        if (oa !== ob) return oa - ob;
        return (a.title || '').localeCompare(b.title || '');
      });

    return this._clone(featured);
  }

  // getSeriesDetail(seriesId)
  getSeriesDetail(seriesId) {
    const seriesList = this._getFromStorage('series');
    const episodesAll = this._getFromStorage('episodes');
    const subs = this._getFromStorage('series_subscriptions');

    const series = seriesList.find(function (s) { return s.id === seriesId; }) || null;
    const episodes = episodesAll
      .filter(function (e) { return e.seriesId === seriesId; })
      .sort(function (a, b) {
        const na = typeof a.episodeNumber === 'number' ? a.episodeNumber : 0;
        const nb = typeof b.episodeNumber === 'number' ? b.episodeNumber : 0;
        return na - nb;
      });

    const subscription = subs.find(function (sub) { return sub.seriesId === seriesId; }) || null;

    return {
      series: this._clone(series),
      episodes: this._clone(episodes),
      subscription: this._clone(subscription)
    };
  }

  // subscribeToSeries(seriesId)
  subscribeToSeries(seriesId) {
    let subs = this._getFromStorage('series_subscriptions');
    if (!Array.isArray(subs)) subs = [];

    let sub = subs.find(function (s) { return s.seriesId === seriesId; }) || null;
    if (sub) return this._clone(sub);

    sub = {
      id: this._generateId('series_sub'),
      seriesId: seriesId,
      subscribedAt: this._now()
    };

    subs.push(sub);
    this._saveToStorage('series_subscriptions', subs);

    return this._clone(sub);
  }

  // getEpisodeDetail(episodeId)
  getEpisodeDetail(episodeId) {
    const episodes = this._getFromStorage('episodes');
    const seriesList = this._getFromStorage('series');
    const progressList = this._getFromStorage('episode_progress');

    const episode = episodes.find(function (e) { return e.id === episodeId; }) || null;
    const series = episode
      ? (seriesList.find(function (s) { return s.id === episode.seriesId; }) || null)
      : null;
    const progress = progressList.find(function (p) { return p.episodeId === episodeId; }) || null;

    return {
      episode: this._clone(episode),
      series: this._clone(series),
      progress: this._clone(progress)
    };
  }

  // setEpisodeReadState(episodeId, isRead)
  setEpisodeReadState(episodeId, isRead) {
    let progressList = this._getFromStorage('episode_progress');
    if (!Array.isArray(progressList)) progressList = [];

    let progress = progressList.find(function (p) { return p.episodeId === episodeId; }) || null;
    const now = this._now();

    if (!progress) {
      progress = {
        id: this._generateId('episode_progress'),
        episodeId: episodeId,
        isRead: !!isRead,
        lastReadAt: isRead ? now : null
      };
      progressList.push(progress);
    } else {
      progress.isRead = !!isRead;
      progress.lastReadAt = isRead ? now : progress.lastReadAt;
    }

    this._saveToStorage('episode_progress', progressList);

    return this._clone(progress);
  }

  // getSettings()
  getSettings() {
    const settings = this._getOrCreateSettings();
    return this._clone(settings);
  }

  // updateSettings(theme, showOnlyColorComics, hideDarkHumor, darkHumorMinRating)
  updateSettings(theme, showOnlyColorComics, hideDarkHumor, darkHumorMinRating) {
    const settings = this._getOrCreateSettings();
    settings.theme = theme;
    settings.showOnlyColorComics = !!showOnlyColorComics;
    settings.hideDarkHumor = !!hideDarkHumor;
    settings.darkHumorMinRating = typeof darkHumorMinRating === 'number' ? darkHumorMinRating : settings.darkHumorMinRating;
    settings.updatedAt = this._now();
    this._saveSettings(settings);
    return this._clone(settings);
  }

  // getTrendingComics(timeRange, filters, sort, page, pageSize)
  getTrendingComics(timeRange, filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'most_viewed';
    page = page || 1;
    pageSize = pageSize || 20;

    let comics = this._getFromStorage('comics');
    comics = this._applyUserSettingsFiltersToComics(comics);

    const now = new Date();
    if (timeRange === 'today') {
      comics = comics.filter(function (c) { return !!c.isTrendingToday; });
    } else if (timeRange === 'last_7_days') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      comics = comics.filter(function (c) {
        const d = new Date(c.publishDate || c.createdAt || 0);
        return d >= start && d <= now;
      });
    } else if (timeRange === 'last_30_days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      comics = comics.filter(function (c) {
        const d = new Date(c.publishDate || c.createdAt || 0);
        return d >= start && d <= now;
      });
    }

    if (typeof filters.maxPanels === 'number') {
      comics = comics.filter(function (c) {
        return typeof c.panelCount === 'number' && c.panelCount <= filters.maxPanels;
      });
    }

    if (typeof filters.minRating === 'number') {
      comics = comics.filter(function (c) {
        return typeof c.ratingAverage === 'number' && c.ratingAverage >= filters.minRating;
      });
    }

    if (sort === 'rating_high_to_low') {
      comics = comics.slice().sort(function (a, b) {
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const cb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        return cb - ca;
      });
    } else {
      comics = comics.slice().sort(function (a, b) {
        const va = typeof a.viewsToday === 'number' ? a.viewsToday : 0;
        const vb = typeof b.viewsToday === 'number' ? b.viewsToday : 0;
        if (vb !== va) return vb - va;
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        return rb - ra;
      });
    }

    const totalCount = comics.length;
    const startIndex = (page - 1) * pageSize;
    const paged = comics.slice(startIndex, startIndex + pageSize);

    const states = this._getFromStorage('comic_user_states');

    const results = paged.map(function (comic) {
      const state = states.find(function (s) { return s.comicId === comic.id; });
      return {
        comic: comic,
        isFavorited: state ? !!state.isFavorited : false,
        isBookmarked: state ? !!state.isBookmarked : false
      };
    });

    return {
      results: this._clone(results),
      totalCount: totalCount
    };
  }

  // addComicToReadingQueue(comicId)
  addComicToReadingQueue(comicId) {
    const queue = this._getActiveReadingQueue();

    let items = this._getFromStorage('reading_queue_items');
    if (!Array.isArray(items)) items = [];

    const itemsForQueue = items.filter(function (qi) { return qi.queueId === queue.id; });
    let nextPosition = 1;
    if (itemsForQueue.length > 0) {
      nextPosition = itemsForQueue.reduce(function (max, qi) {
        const pos = typeof qi.position === 'number' ? qi.position : 0;
        return pos > max ? pos : max;
      }, 0) + 1;
    }

    const item = {
      id: this._generateId('queue_item'),
      queueId: queue.id,
      contentType: 'comic',
      contentId: comicId,
      position: nextPosition,
      addedAt: this._now()
    };

    items.push(item);
    this._saveToStorage('reading_queue_items', items);

    // update queue.updatedAt
    let queues = this._getFromStorage('reading_queue');
    const qRef = queues.find(function (q) { return q.id === queue.id; });
    if (qRef) {
      qRef.updatedAt = this._now();
      this._saveToStorage('reading_queue', queues);
    }

    return {
      success: true,
      queue: this._clone(qRef || queue),
      queueItem: this._clone(item)
    };
  }

  // getReadingQueue()
  getReadingQueue() {
    const queues = this._getFromStorage('reading_queue');
    const queue = queues.find(function (q) { return q.status === 'active'; }) || null;

    if (!queue) {
      return {
        queue: null,
        items: []
      };
    }

    const itemsAll = this._getFromStorage('reading_queue_items');
    const comics = this._getFromStorage('comics');
    const episodes = this._getFromStorage('episodes');

    const items = itemsAll
      .filter(function (qi) { return qi.queueId === queue.id; })
      .sort(function (a, b) {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      })
      .map(function (qi) {
        const comic = qi.contentType === 'comic'
          ? comics.find(function (c) { return c.id === qi.contentId; }) || null
          : null;
        const episode = qi.contentType === 'episode'
          ? episodes.find(function (e) { return e.id === qi.contentId; }) || null
          : null;
        const extendedQi = Object.assign({}, qi, { queue: queue });
        return {
          queueItem: extendedQi,
          comic: comic,
          episode: episode
        };
      });

    return {
      queue: this._clone(queue),
      items: this._clone(items)
    };
  }

  // updateReadingQueueItemPosition(queueItemId, newPosition)
  updateReadingQueueItemPosition(queueItemId, newPosition) {
    newPosition = typeof newPosition === 'number' && newPosition > 0 ? newPosition : 1;

    let items = this._getFromStorage('reading_queue_items');
    if (!Array.isArray(items)) items = [];

    const item = items.find(function (qi) { return qi.id === queueItemId; }) || null;
    if (!item) return null;

    const queueId = item.queueId;
    const queueItems = items
      .filter(function (qi) { return qi.queueId === queueId; })
      .sort(function (a, b) {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });

    // remove item
    const idx = queueItems.findIndex(function (qi) { return qi.id === queueItemId; });
    if (idx === -1) return null;
    queueItems.splice(idx, 1);

    const clampedPos = Math.min(Math.max(1, newPosition), queueItems.length + 1);
    queueItems.splice(clampedPos - 1, 0, item);

    queueItems.forEach(function (qi, index) {
      qi.position = index + 1;
    });

    this._saveToStorage('reading_queue_items', items);

    return this._clone(item);
  }

  // removeReadingQueueItem(queueItemId)
  removeReadingQueueItem(queueItemId) {
    let items = this._getFromStorage('reading_queue_items');
    if (!Array.isArray(items)) items = [];

    const item = items.find(function (qi) { return qi.id === queueItemId; }) || null;
    if (!item) {
      return { success: false, queue: null };
    }

    const queueId = item.queueId;

    items = items.filter(function (qi) { return qi.id !== queueItemId; });

    // Reposition remaining items in this queue
    const queueItems = items
      .filter(function (qi) { return qi.queueId === queueId; })
      .sort(function (a, b) {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });

    queueItems.forEach(function (qi, index) {
      qi.position = index + 1;
    });

    this._saveToStorage('reading_queue_items', items);

    let queues = this._getFromStorage('reading_queue');
    const queue = queues.find(function (q) { return q.id === queueId; }) || null;
    if (queue) {
      queue.updatedAt = this._now();
      this._saveToStorage('reading_queue', queues);
    }

    return {
      success: true,
      queue: this._clone(queue)
    };
  }

  // clearReadingQueue()
  clearReadingQueue() {
    let queues = this._getFromStorage('reading_queue');
    if (!Array.isArray(queues)) queues = [];

    const queue = queues.find(function (q) { return q.status === 'active'; }) || null;
    if (!queue) {
      return null;
    }

    let items = this._getFromStorage('reading_queue_items');
    if (!Array.isArray(items)) items = [];

    items = items.filter(function (qi) { return qi.queueId !== queue.id; });
    this._saveToStorage('reading_queue_items', items);

    queue.status = 'cleared';
    queue.updatedAt = this._now();
    this._saveToStorage('reading_queue', queues);

    return this._clone(queue);
  }

  // saveReadingQueueAsPlaylist(name, description)
  saveReadingQueueAsPlaylist(name, description) {
    const queues = this._getFromStorage('reading_queue');
    const queue = queues.find(function (q) { return q.status === 'active'; }) || null;
    if (!queue) {
      return { success: false, playlist: null };
    }

    const itemsAll = this._getFromStorage('reading_queue_items');
    const queueItems = itemsAll
      .filter(function (qi) { return qi.queueId === queue.id; })
      .sort(function (a, b) {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });

    if (queueItems.length === 0) {
      return { success: false, playlist: null };
    }

    const playlist = this.createPlaylist(name, 'queue_snapshot', description);

    let playlistItems = this._getFromStorage('playlist_items');
    if (!Array.isArray(playlistItems)) playlistItems = [];

    const now = this._now();
    queueItems.forEach(function (qi, index) {
      const pi = {
        id: this._generateId('playlist_item'),
        playlistId: playlist.id,
        contentType: qi.contentType,
        contentId: qi.contentId,
        position: index + 1,
        addedAt: now
      };
      playlistItems.push(pi);
    }, this);

    this._saveToStorage('playlist_items', playlistItems);

    return {
      success: true,
      playlist: this._clone(playlist)
    };
  }

  // getRandomComic()
  getRandomComic() {
    let comics = this._getFromStorage('comics');
    comics = this._applyUserSettingsFiltersToComics(comics);

    if (!comics || comics.length === 0) {
      return {
        comic: null,
        tags: [],
        userState: null
      };
    }

    const index = Math.floor(Math.random() * comics.length);
    const comic = comics[index];

    const tagsAll = this._getFromStorage('tags');
    const comicTagsAll = this._getFromStorage('comic_tags');
    const ctForComic = comicTagsAll.filter(function (ct) { return ct.comicId === comic.id; });
    const tags = ctForComic
      .map(function (ct) {
        return tagsAll.find(function (t) { return t.id === ct.tagId; });
      })
      .filter(function (t) { return !!t; });

    const states = this._getFromStorage('comic_user_states');
    const userState = states.find(function (s) { return s.comicId === comic.id; }) || null;

    return {
      comic: this._clone(comic),
      tags: this._clone(tags),
      userState: this._clone(userState)
    };
  }

  // getAboutContent()
  getAboutContent() {
    const sections = [
      {
        title: 'About This Site',
        body: 'A humor-focused webcomic hub for single-panel gags, strips, and bingeable series.'
      },
      {
        title: 'Creators',
        body: 'Supporting a variety of cartoonists with playlists, series subscriptions, and a digital library.'
      },
      {
        title: 'Features',
        body: 'Search, playlists, Random Laugh, shopping for humor books, and customizable viewing preferences.'
      }
    ];

    return {
      sections: this._clone(sections)
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    const faqCategories = [
      {
        name: 'Search and Discovery',
        questions: [
          {
            question: 'How do I find specific comics?',
            answer: 'Use the global search with filters like rating, panel count, and date range.'
          },
          {
            question: 'What is Random Laugh?',
            answer: 'Random Laugh shows a random comic, respecting your content settings.'
          }
        ]
      },
      {
        name: 'Playlists and Reading Lists',
        questions: [
          {
            question: 'How do I create a playlist?',
            answer: 'Use the playlists section or the Add to playlist button on any comic or episode.'
          }
        ]
      },
      {
        name: 'Store and Library',
        questions: [
          {
            question: 'Where do digital collections go after purchase?',
            answer: 'Digital collections appear in your Library, available from your avatar menu.'
          }
        ]
      },
      {
        name: 'Settings',
        questions: [
          {
            question: 'How do I change to dark theme?',
            answer: 'Open Settings from the avatar menu and choose the dark theme option.'
          }
        ]
      }
    ];

    return {
      faqCategories: this._clone(faqCategories)
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
