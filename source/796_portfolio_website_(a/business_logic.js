/*
 * Business logic layer for Actor/Filmmaker portfolio site
 * - Uses localStorage (with Node-compatible polyfill) for persistence
 * - Implements all specified interfaces
 * - No DOM/window/document usage other than localStorage
 */

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
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const arrayKeys = [
      'projects',
      'project_awards',
      'gallery_images',
      'videos',
      'press_articles',
      'press_quotes',
      'resumes',
      'contact_inquiries',
      'newsletter_subscriptions',
      'playlists'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singleton-like objects (created on demand by _getOrCreate* helpers)
    const singletonKeys = ['watchlist', 'shortlist', 'press_kit'];
    singletonKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        // Leave unset (null) so helpers can create with proper structure later
        localStorage.setItem(key, 'null');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      return JSON.parse(data);
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

  _enumLabel(map, value) {
    return map[value] || value;
  }

  // ----------------------
  // Singleton helpers
  // ----------------------

  _getOrCreatePlaylist() {
    let playlists = this._getFromStorage('playlists', []);
    if (!Array.isArray(playlists)) playlists = [];

    let playlist = playlists[0] || null;
    if (!playlist) {
      playlist = {
        id: this._generateId('playlist'),
        name: 'Viewing Playlist',
        description: '',
        items: [],
        totalDurationMinutes: 0,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      playlists.push(playlist);
      this._saveToStorage('playlists', playlists);
    }

    return { playlist, playlists };
  }

  _persistPlaylist(updatedPlaylist) {
    let playlists = this._getFromStorage('playlists', []);
    if (!Array.isArray(playlists)) playlists = [];
    const index = playlists.findIndex((p) => p.id === updatedPlaylist.id);
    if (index === -1) {
      playlists.push(updatedPlaylist);
    } else {
      playlists[index] = updatedPlaylist;
    }
    this._saveToStorage('playlists', playlists);
  }

  _getOrCreateWatchlist() {
    let watchlist = this._getFromStorage('watchlist', null);
    if (!watchlist) {
      watchlist = {
        id: this._generateId('watchlist'),
        items: [],
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      this._saveToStorage('watchlist', watchlist);
    }
    return watchlist;
  }

  _getOrCreateShortlist() {
    let shortlist = this._getFromStorage('shortlist', null);
    if (!shortlist) {
      shortlist = {
        id: this._generateId('shortlist'),
        items: [],
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      this._saveToStorage('shortlist', shortlist);
    }
    return shortlist;
  }

  _getOrCreatePressKit() {
    let pressKit = this._getFromStorage('press_kit', null);
    if (!pressKit) {
      pressKit = {
        id: this._generateId('presskit'),
        items: [],
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      this._saveToStorage('press_kit', pressKit);
    }
    return pressKit;
  }

  // ----------------------
  // Foreign-key resolution helpers
  // ----------------------

  _resolveWatchlist(watchlist) {
    if (!watchlist) return null;
    const projects = this._getFromStorage('projects', []);
    const items = Array.isArray(watchlist.items) ? watchlist.items : [];
    return {
      ...watchlist,
      items: items.map((item) => ({
        ...item,
        project: projects.find((p) => p.id === item.projectId) || null
      }))
    };
  }

  _resolveShortlist(shortlist) {
    if (!shortlist) return null;
    const projects = this._getFromStorage('projects', []);
    const items = Array.isArray(shortlist.items) ? shortlist.items : [];
    return {
      ...shortlist,
      items: items.map((item) => ({
        ...item,
        project: projects.find((p) => p.id === item.projectId) || null
      }))
    };
  }

  _resolvePlaylist(playlist) {
    if (!playlist) return null;
    const projects = this._getFromStorage('projects', []);
    const videos = this._getFromStorage('videos', []);
    const items = Array.isArray(playlist.items) ? playlist.items : [];
    return {
      ...playlist,
      items: items.map((item) => {
        const resolved = { ...item };
        if (item.projectId) {
          resolved.project = projects.find((p) => p.id === item.projectId) || null;
        }
        if (item.videoId) {
          resolved.video = videos.find((v) => v.id === item.videoId) || null;
        }
        return resolved;
      })
    };
  }

  _resolveProjectAwardsAndGallery(projectId, awards, images) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId) || null;
    const resolvedAwards = (awards || []).map((a) => ({
      ...a,
      project
    }));
    const resolvedImages = (images || []).map((img) => ({
      ...img,
      project
    }));
    return { project, resolvedAwards, resolvedImages };
  }

  _resolvePressKit(pressKit) {
    if (!pressKit) return null;
    const quotes = this._getFromStorage('press_quotes', []);
    const articles = this._getFromStorage('press_articles', []);
    const items = Array.isArray(pressKit.items) ? pressKit.items : [];
    return {
      ...pressKit,
      items: items.map((item) => {
        const quote = quotes.find((q) => q.id === item.quoteId) || null;
        const article = quote ? (articles.find((a) => a.id === quote.articleId) || null) : null;
        return {
          ...item,
          quote,
          article
        };
      })
    };
  }

  // ----------------------
  // Home / Overview interfaces
  // ----------------------

  // getHomeOverview(): hero text, role labels, key highlights
  getHomeOverview() {
    const stored = this._getFromStorage('home_overview', null);
    if (stored) {
      return stored;
    }
    // Default empty structure if nothing configured in storage
    return {
      heroTitle: '',
      heroSubtitle: '',
      primaryHeadshotImageUrl: '',
      roleTags: [],
      highlightStats: []
    };
  }

  // getHomeFeaturedProjects(): featured Projects summary
  getHomeFeaturedProjects() {
    const projects = this._getFromStorage('projects', []);
    const typeLabels = {
      short_film: 'Short Film',
      feature_film: 'Feature Film',
      commercial: 'Commercial',
      music_video: 'Music Video',
      web_series: 'Web Series',
      other: 'Other'
    };

    return projects
      .filter((p) => p.isFeatured)
      .map((p) => ({
        projectId: p.id,
        title: p.title,
        type: p.type,
        typeLabel: this._enumLabel(typeLabels, p.type),
        year: p.year,
        genre: p.genre || null,
        primaryRole: p.primaryRole || null,
        rolesSummary: p.rolesSummary || '',
        durationMinutes: p.durationMinutes,
        awardsSummary: p.awardsSummary || '',
        thumbnailImageUrl: p.thumbnailImageUrl || '',
        isFeatured: !!p.isFeatured
      }));
  }

  // getHomeFeaturedVideos(): featured Videos summary
  getHomeFeaturedVideos() {
    const videos = this._getFromStorage('videos', []);
    const categoryLabels = {
      acting_reel: 'Acting Reel',
      directing_reel: 'Directing Reel',
      scene_clip: 'Scene / Clip',
      other: 'Other'
    };

    return videos
      .filter((v) => v.isFeatured)
      .map((v) => ({
        videoId: v.id,
        title: v.title,
        category: v.category,
        categoryLabel: this._enumLabel(categoryLabels, v.category),
        durationMinutes: v.durationMinutes,
        thumbnailImageUrl: v.thumbnailImageUrl || '',
        isFeatured: !!v.isFeatured
      }));
  }

  // getHomeLatestPressArticles(limit = 3)
  getHomeLatestPressArticles(limit) {
    const effectiveLimit = typeof limit === 'number' && limit > 0 ? limit : 3;
    const articles = this._getFromStorage('press_articles', []);
    const sorted = articles.slice().sort((a, b) => {
      const da = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
      const db = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
      return db - da; // newest first
    });
    return sorted.slice(0, effectiveLimit);
  }

  // ----------------------
  // Filmography: filters & search
  // ----------------------

  // getFilmographyFilterOptions()
  getFilmographyFilterOptions() {
    const projects = this._getFromStorage('projects', []);

    const typeLabels = {
      short_film: 'Short Film',
      feature_film: 'Feature Film',
      commercial: 'Commercial',
      music_video: 'Music Video',
      web_series: 'Web Series',
      other: 'Other'
    };

    const genreLabels = {
      drama: 'Drama',
      comedy: 'Comedy',
      thriller: 'Thriller',
      action: 'Action',
      romance: 'Romance',
      sci_fi: 'Sci-Fi',
      horror: 'Horror',
      documentary: 'Documentary',
      other: 'Other'
    };

    const roleLabels = {
      lead: 'Lead',
      supporting: 'Supporting',
      director: 'Director',
      writer: 'Writer',
      producer: 'Producer',
      cameo: 'Cameo',
      voiceover: 'Voiceover',
      other: 'Other'
    };

    const unique = (arr) => Array.from(new Set(arr.filter((v) => v !== undefined && v !== null)));

    const types = unique(projects.map((p) => p.type)).map((value) => ({
      value,
      label: this._enumLabel(typeLabels, value)
    }));

    const genres = unique(projects.map((p) => p.genre)).map((value) => ({
      value,
      label: this._enumLabel(genreLabels, value)
    }));

    const roles = unique(projects.map((p) => p.primaryRole)).map((value) => ({
      value,
      label: this._enumLabel(roleLabels, value)
    }));

    const years = projects.map((p) => p.year).filter((y) => typeof y === 'number');
    const durationMinutes = projects.map((p) => p.durationMinutes).filter((d) => typeof d === 'number');

    const yearRange = {
      minYear: years.length ? Math.min(...years) : null,
      maxYear: years.length ? Math.max(...years) : null
    };

    const durationRange = {
      minMinutes: durationMinutes.length ? Math.min(...durationMinutes) : null,
      maxMinutes: durationMinutes.length ? Math.max(...durationMinutes) : null,
      stepMinutes: 1
    };

    const locationsMap = new Map();
    projects.forEach((p) => {
      const city = p.locationCity || '';
      const country = p.locationCountry || '';
      const key = city + '|' + country;
      if (!city && !country) return;
      if (!locationsMap.has(key)) {
        const displayLabel = p.locationDisplay || [city, country].filter(Boolean).join(', ');
        locationsMap.set(key, {
          city: city || null,
          country: country || null,
          displayLabel
        });
      }
    });

    const locations = Array.from(locationsMap.values());

    const sortOptions = [
      { value: 'year_desc', label: 'Year (Newest First)' },
      { value: 'year_asc', label: 'Year (Oldest First)' },
      { value: 'awards_desc', label: 'Awards (High to Low)' },
      { value: 'duration_asc', label: 'Duration (Short to Long)' },
      { value: 'duration_desc', label: 'Duration (Long to Short)' },
      { value: 'title_asc', label: 'Title (A–Z)' }
    ];

    return {
      types,
      genres,
      roles,
      yearRange,
      durationRange,
      locations,
      sortOptions
    };
  }

  // searchProjects(filters, sort, page = 1, pageSize = 20)
  searchProjects(filters, sort, page, pageSize) {
    const projects = this._getFromStorage('projects', []);
    const f = filters || {};
    const s = sort || {};
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const currentPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    let results = projects.slice();

    if (f.type) {
      results = results.filter((p) => p.type === f.type);
    }
    if (f.genre) {
      results = results.filter((p) => p.genre === f.genre);
    }
    if (f.primaryRole) {
      results = results.filter((p) => p.primaryRole === f.primaryRole);
    }
    if (typeof f.minYear === 'number') {
      results = results.filter((p) => typeof p.year === 'number' && p.year >= f.minYear);
    }
    if (typeof f.maxYear === 'number') {
      results = results.filter((p) => typeof p.year === 'number' && p.year <= f.maxYear);
    }
    if (typeof f.minDurationMinutes === 'number') {
      results = results.filter((p) => typeof p.durationMinutes === 'number' && p.durationMinutes >= f.minDurationMinutes);
    }
    if (typeof f.maxDurationMinutes === 'number') {
      results = results.filter((p) => typeof p.durationMinutes === 'number' && p.durationMinutes <= f.maxDurationMinutes);
    }
    if (f.locationCity) {
      results = results.filter((p) => p.locationCity === f.locationCity);
    }
    if (f.locationCountry) {
      results = results.filter((p) => p.locationCountry === f.locationCountry);
    }
    if (typeof f.hasGallery === 'boolean') {
      results = results.filter((p) => !!p.hasGallery === f.hasGallery);
    }
    if (typeof f.isFeatured === 'boolean') {
      results = results.filter((p) => !!p.isFeatured === f.isFeatured);
    }
    if (f.textQuery) {
      const q = String(f.textQuery).toLowerCase();
      results = results.filter((p) => {
        return (
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.synopsis && p.synopsis.toLowerCase().includes(q)) ||
          (p.rolesSummary && p.rolesSummary.toLowerCase().includes(q))
        );
      });
    }

    const sortBy = s.sortBy || 'year';
    const sortOrder = s.sortOrder === 'asc' ? 'asc' : 'desc';

    results.sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'awards') {
        const av = typeof a.awardsCount === 'number' ? a.awardsCount : 0;
        const bv = typeof b.awardsCount === 'number' ? b.awardsCount : 0;
        return (av - bv) * dir;
      }
      if (sortBy === 'duration') {
        const av = typeof a.durationMinutes === 'number' ? a.durationMinutes : 0;
        const bv = typeof b.durationMinutes === 'number' ? b.durationMinutes : 0;
        return (av - bv) * dir;
      }
      if (sortBy === 'title') {
        const av = (a.title || '').toLowerCase();
        const bv = (b.title || '').toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      }
      if (sortBy === 'created_at') {
        const av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (av - bv) * dir;
      }
      // default: year
      const av = typeof a.year === 'number' ? a.year : 0;
      const bv = typeof b.year === 'number' ? b.year : 0;
      return (av - bv) * dir;
    });

    const totalCount = results.length;
    const start = (currentPage - 1) * currentPageSize;
    const paged = results.slice(start, start + currentPageSize);

    return {
      totalCount,
      page: currentPage,
      pageSize: currentPageSize,
      projects: paged
    };
  }

  // ----------------------
  // Project detail & gallery
  // ----------------------

  // getProjectDetail(projectId)
  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId) || null;

    const awardsAll = this._getFromStorage('project_awards', []);
    const projectAwards = awardsAll.filter((a) => a.projectId === projectId);

    const galleryAll = this._getFromStorage('gallery_images', []);
    const galleryImages = galleryAll.filter((img) => img.projectId === projectId);

    const { resolvedAwards, resolvedImages } = this._resolveProjectAwardsAndGallery(
      projectId,
      projectAwards,
      galleryImages
    );

    return {
      project,
      awards: resolvedAwards,
      galleryImages: resolvedImages
    };
  }

  // getProjectGallery(projectId)
  getProjectGallery(projectId) {
    const galleryAll = this._getFromStorage('gallery_images', []);
    const images = galleryAll.filter((img) => img.projectId === projectId);
    const { resolvedImages } = this._resolveProjectAwardsAndGallery(projectId, [], images);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task2_openedGalleryProject',
        JSON.stringify({ projectId: projectId, openedAt: this._nowIso() })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return resolvedImages;
  }

  // ----------------------
  // Watchlist interfaces
  // ----------------------

  // addProjectToWatchlist(projectId)
  addProjectToWatchlist(projectId) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return {
        success: false,
        message: 'Project not found',
        watchlist: null
      };
    }

    const watchlist = this._getOrCreateWatchlist();
    const items = Array.isArray(watchlist.items) ? watchlist.items : [];
    const exists = items.some((item) => item.projectId === projectId);

    if (!exists) {
      items.push({
        projectId,
        addedAt: this._nowIso(),
        cachedTitle: project.title,
        cachedType: project.type,
        cachedYear: project.year
      });
      watchlist.items = items;
      watchlist.updatedAt = this._nowIso();
      this._saveToStorage('watchlist', watchlist);
    }

    return {
      success: true,
      message: exists ? 'Already in watchlist' : 'Added to watchlist',
      watchlist: this._resolveWatchlist(watchlist)
    };
  }

  // removeProjectFromWatchlist(projectId)
  removeProjectFromWatchlist(projectId) {
    const watchlist = this._getOrCreateWatchlist();
    const items = Array.isArray(watchlist.items) ? watchlist.items : [];
    const newItems = items.filter((item) => item.projectId !== projectId);
    watchlist.items = newItems;
    watchlist.updatedAt = this._nowIso();
    this._saveToStorage('watchlist', watchlist);

    return {
      success: true,
      message: 'Removed from watchlist',
      watchlist: this._resolveWatchlist(watchlist)
    };
  }

  // getWatchlist()
  getWatchlist() {
    const watchlist = this._getOrCreateWatchlist();
    return this._resolveWatchlist(watchlist);
  }

  // reorderWatchlist(orderedProjectIds)
  reorderWatchlist(orderedProjectIds) {
    const order = Array.isArray(orderedProjectIds) ? orderedProjectIds : [];
    const watchlist = this._getOrCreateWatchlist();
    const items = Array.isArray(watchlist.items) ? watchlist.items : [];

    const byId = new Map();
    items.forEach((item) => {
      byId.set(item.projectId, item);
    });

    const newItems = [];
    order.forEach((id) => {
      const item = byId.get(id);
      if (item) {
        newItems.push(item);
        byId.delete(id);
      }
    });

    // Append any remaining items in original order
    items.forEach((item) => {
      if (byId.has(item.projectId)) {
        newItems.push(item);
        byId.delete(item.projectId);
      }
    });

    watchlist.items = newItems;
    watchlist.updatedAt = this._nowIso();
    this._saveToStorage('watchlist', watchlist);

    return this._resolveWatchlist(watchlist);
  }

  // ----------------------
  // Shortlist interfaces
  // ----------------------

  // addProjectToShortlist(projectId)
  addProjectToShortlist(projectId) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return {
        success: false,
        message: 'Project not found',
        shortlist: null
      };
    }

    const shortlist = this._getOrCreateShortlist();
    const items = Array.isArray(shortlist.items) ? shortlist.items : [];
    const exists = items.some((item) => item.projectId === projectId);

    if (!exists) {
      const maxSortOrder = items.reduce((max, item) => Math.max(max, item.sortOrder || 0), 0);
      items.push({
        projectId,
        addedAt: this._nowIso(),
        sortOrder: maxSortOrder + 1,
        clientNote: ''
      });
      shortlist.items = items;
      shortlist.updatedAt = this._nowIso();
      this._saveToStorage('shortlist', shortlist);
    }

    return {
      success: true,
      message: exists ? 'Already in shortlist' : 'Added to shortlist',
      shortlist: this._resolveShortlist(shortlist)
    };
  }

  // removeProjectFromShortlist(projectId)
  removeProjectFromShortlist(projectId) {
    const shortlist = this._getOrCreateShortlist();
    const items = Array.isArray(shortlist.items) ? shortlist.items : [];
    const newItems = items.filter((item) => item.projectId !== projectId);
    shortlist.items = newItems;
    shortlist.updatedAt = this._nowIso();
    this._saveToStorage('shortlist', shortlist);

    return {
      success: true,
      message: 'Removed from shortlist',
      shortlist: this._resolveShortlist(shortlist)
    };
  }

  // getShortlist()
  getShortlist() {
    const shortlist = this._getOrCreateShortlist();
    return this._resolveShortlist(shortlist);
  }

  // reorderShortlist(orderedProjectIds)
  reorderShortlist(orderedProjectIds) {
    const order = Array.isArray(orderedProjectIds) ? orderedProjectIds : [];
    const shortlist = this._getOrCreateShortlist();
    const items = Array.isArray(shortlist.items) ? shortlist.items : [];

    const byId = new Map();
    items.forEach((item) => {
      byId.set(item.projectId, item);
    });

    const newItems = [];
    order.forEach((id) => {
      const item = byId.get(id);
      if (item) {
        newItems.push(item);
        byId.delete(id);
      }
    });

    items.forEach((item) => {
      if (byId.has(item.projectId)) {
        newItems.push(item);
        byId.delete(item.projectId);
      }
    });

    // Reassign sortOrder sequentially
    newItems.forEach((item, index) => {
      item.sortOrder = index + 1;
    });

    shortlist.items = newItems;
    shortlist.updatedAt = this._nowIso();
    this._saveToStorage('shortlist', shortlist);

    return this._resolveShortlist(shortlist);
  }

  // ----------------------
  // Playlist interfaces
  // ----------------------

  // addProjectToPlaylist(projectId)
  addProjectToPlaylist(projectId) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return {
        success: false,
        message: 'Project not found',
        playlist: null
      };
    }

    const { playlist } = this._getOrCreatePlaylist();
    const items = Array.isArray(playlist.items) ? playlist.items : [];
    const maxSortOrder = items.reduce((max, item) => Math.max(max, item.sortOrder || 0), 0);

    const playlistItem = {
      id: this._generateId('pli'),
      projectId,
      videoId: null,
      itemType: 'project',
      addedAt: this._nowIso(),
      sortOrder: maxSortOrder + 1,
      cachedTitle: project.title,
      cachedDurationMinutes: project.durationMinutes
    };

    items.push(playlistItem);
    playlist.items = items;

    const totalDuration = items.reduce((sum, item) => sum + (item.cachedDurationMinutes || 0), 0);
    playlist.totalDurationMinutes = totalDuration;
    playlist.updatedAt = this._nowIso();

    this._persistPlaylist(playlist);

    return {
      success: true,
      message: 'Project added to playlist',
      playlist: this._resolvePlaylist(playlist)
    };
  }

  // removeProjectFromPlaylist(projectId)
  removeProjectFromPlaylist(projectId) {
    const { playlist } = this._getOrCreatePlaylist();
    const items = Array.isArray(playlist.items) ? playlist.items : [];
    const newItems = items.filter((item) => item.projectId !== projectId);
    playlist.items = newItems;
    const totalDuration = newItems.reduce((sum, item) => sum + (item.cachedDurationMinutes || 0), 0);
    playlist.totalDurationMinutes = totalDuration;
    playlist.updatedAt = this._nowIso();

    this._persistPlaylist(playlist);
    return this._resolvePlaylist(playlist);
  }

  // addVideoToPlaylist(videoId)
  addVideoToPlaylist(videoId) {
    const videos = this._getFromStorage('videos', []);
    const video = videos.find((v) => v.id === videoId);
    if (!video) {
      return {
        success: false,
        message: 'Video not found',
        playlist: null
      };
    }

    const { playlist } = this._getOrCreatePlaylist();
    const items = Array.isArray(playlist.items) ? playlist.items : [];
    const maxSortOrder = items.reduce((max, item) => Math.max(max, item.sortOrder || 0), 0);

    const playlistItem = {
      id: this._generateId('pli'),
      projectId: null,
      videoId,
      itemType: 'video',
      addedAt: this._nowIso(),
      sortOrder: maxSortOrder + 1,
      cachedTitle: video.title,
      cachedDurationMinutes: video.durationMinutes
    };

    items.push(playlistItem);
    playlist.items = items;

    const totalDuration = items.reduce((sum, item) => sum + (item.cachedDurationMinutes || 0), 0);
    playlist.totalDurationMinutes = totalDuration;
    playlist.updatedAt = this._nowIso();

    this._persistPlaylist(playlist);

    return {
      success: true,
      message: 'Video added to playlist',
      playlist: this._resolvePlaylist(playlist)
    };
  }

  // removePlaylistItem(playlistItemId)
  removePlaylistItem(playlistItemId) {
    const { playlist } = this._getOrCreatePlaylist();
    const items = Array.isArray(playlist.items) ? playlist.items : [];
    const newItems = items.filter((item) => item.id !== playlistItemId);
    playlist.items = newItems;
    const totalDuration = newItems.reduce((sum, item) => sum + (item.cachedDurationMinutes || 0), 0);
    playlist.totalDurationMinutes = totalDuration;
    playlist.updatedAt = this._nowIso();

    this._persistPlaylist(playlist);
    return this._resolvePlaylist(playlist);
  }

  // reorderPlaylistItems(orderedPlaylistItemIds)
  reorderPlaylistItems(orderedPlaylistItemIds) {
    const order = Array.isArray(orderedPlaylistItemIds) ? orderedPlaylistItemIds : [];
    const { playlist } = this._getOrCreatePlaylist();
    const items = Array.isArray(playlist.items) ? playlist.items : [];

    const byId = new Map();
    items.forEach((item) => {
      byId.set(item.id, item);
    });

    const newItems = [];
    order.forEach((id) => {
      const item = byId.get(id);
      if (item) {
        newItems.push(item);
        byId.delete(id);
      }
    });

    items.forEach((item) => {
      if (byId.has(item.id)) {
        newItems.push(item);
        byId.delete(item.id);
      }
    });

    // Reassign sortOrder
    newItems.forEach((item, index) => {
      item.sortOrder = index + 1;
    });

    playlist.items = newItems;
    const totalDuration = newItems.reduce((sum, item) => sum + (item.cachedDurationMinutes || 0), 0);
    playlist.totalDurationMinutes = totalDuration;
    playlist.updatedAt = this._nowIso();

    this._persistPlaylist(playlist);
    return this._resolvePlaylist(playlist);
  }

  // getPlaylistDetails()
  getPlaylistDetails() {
    const { playlist } = this._getOrCreatePlaylist();
    return this._resolvePlaylist(playlist);
  }

  // ----------------------
  // Videos & Reels interfaces
  // ----------------------

  // getVideosFilterOptions()
  getVideosFilterOptions() {
    const videos = this._getFromStorage('videos', []);

    const categoryLabels = {
      acting_reel: 'Acting Reels',
      directing_reel: 'Directing Reels',
      scene_clip: 'Scenes & Clips',
      other: 'Other'
    };

    const unique = (arr) => Array.from(new Set(arr.filter((v) => v !== undefined && v !== null)));

    const categories = unique(videos.map((v) => v.category)).map((value) => ({
      value,
      label: this._enumLabel(categoryLabels, value)
    }));

    const sortOptions = [
      { value: 'duration_desc', label: 'Duration (Long to Short)' },
      { value: 'duration_asc', label: 'Duration (Short to Long)' },
      { value: 'created_at_desc', label: 'Newest First' },
      { value: 'created_at_asc', label: 'Oldest First' },
      { value: 'title_asc', label: 'Title (A–Z)' }
    ];

    return {
      categories,
      sortOptions
    };
  }

  // listVideos(filters, sort, page = 1, pageSize = 20)
  listVideos(filters, sort, page, pageSize) {
    const videos = this._getFromStorage('videos', []);
    const f = filters || {};
    const s = sort || {};
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const currentPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    let results = videos.slice();

    if (f.category) {
      results = results.filter((v) => v.category === f.category);
    }
    if (typeof f.minDurationMinutes === 'number') {
      results = results.filter((v) => typeof v.durationMinutes === 'number' && v.durationMinutes >= f.minDurationMinutes);
    }
    if (typeof f.maxDurationMinutes === 'number') {
      results = results.filter((v) => typeof v.durationMinutes === 'number' && v.durationMinutes <= f.maxDurationMinutes);
    }
    if (typeof f.featuredOnly === 'boolean') {
      results = results.filter((v) => !!v.isFeatured === f.featuredOnly);
    }
    if (f.textQuery) {
      const q = String(f.textQuery).toLowerCase();
      results = results.filter((v) => {
        return (
          (v.title && v.title.toLowerCase().includes(q)) ||
          (v.description && v.description.toLowerCase().includes(q))
        );
      });
    }

    const sortBy = s.sortBy || 'created_at';
    const sortOrder = s.sortOrder === 'asc' ? 'asc' : 'desc';

    results.sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'duration') {
        const av = typeof a.durationMinutes === 'number' ? a.durationMinutes : 0;
        const bv = typeof b.durationMinutes === 'number' ? b.durationMinutes : 0;
        return (av - bv) * dir;
      }
      if (sortBy === 'title') {
        const av = (a.title || '').toLowerCase();
        const bv = (b.title || '').toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      }
      // default: created_at
      const av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (av - bv) * dir;
    });

    const totalCount = results.length;
    const start = (currentPage - 1) * currentPageSize;
    const paged = results.slice(start, start + currentPageSize);

    return {
      totalCount,
      page: currentPage,
      pageSize: currentPageSize,
      videos: paged
    };
  }

  // ----------------------
  // About / Resumes
  // ----------------------

  // getAboutPageContent()
  getAboutPageContent() {
    const base = this._getFromStorage('about_page_content', null) || {
      biographyHtml: '',
      careerMilestones: [],
      headshots: []
    };

    const resumes = this._getFromStorage('resumes', []);
    let defaultResume = resumes.find((r) => r.isDefault) || resumes[0] || null;

    return {
      biographyHtml: base.biographyHtml || '',
      careerMilestones: Array.isArray(base.careerMilestones) ? base.careerMilestones : [],
      headshots: Array.isArray(base.headshots) ? base.headshots : [],
      defaultResumeType: defaultResume ? defaultResume.type : null
    };
  }

  // getResumes()
  getResumes() {
    return this._getFromStorage('resumes', []);
  }

  // ----------------------
  // Contact form
  // ----------------------

  // getContactFormConfig()
  getContactFormConfig() {
    const stored = this._getFromStorage('contact_form_config', null);
    if (stored) return stored;

    const inquiryTypes = [
      {
        value: 'feature_film_casting',
        label: 'Feature film casting',
        description: 'Inquiries about feature-length film casting.'
      },
      {
        value: 'short_film_casting',
        label: 'Short film casting',
        description: 'Casting for short films and independent projects.'
      },
      {
        value: 'commercial_booking',
        label: 'Commercial booking',
        description: 'Commercial and branded content bookings.'
      },
      {
        value: 'representation',
        label: 'Representation',
        description: 'Agent/manager representation queries.'
      },
      {
        value: 'press',
        label: 'Press',
        description: 'Interviews and press-related requests.'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'General inquiries.'
      }
    ];

    const budgetRanges = [
      { value: 'under_5000', label: 'Under $5,000' },
      { value: 'range_5000_10000', label: '$5,000–$10,000' },
      { value: 'range_10000_20000', label: '$10,000–$20,000' },
      { value: 'over_20000', label: 'Over $20,000' }
    ];

    return {
      inquiryTypes,
      budgetRanges,
      dateHelpText: 'Select your preferred start and end dates for the project.',
      representationContactsHtml: ''
    };
  }

  // submitContactInquiry(inquiryType, name, email, message, preferredStartDate, preferredEndDate, budgetRange, budgetExactAmount)
  submitContactInquiry(
    inquiryType,
    name,
    email,
    message,
    preferredStartDate,
    preferredEndDate,
    budgetRange,
    budgetExactAmount
  ) {
    if (!inquiryType || !name || !email || !message) {
      return {
        success: false,
        message: 'Missing required fields',
        inquiry: null
      };
    }

    const inquiries = this._getFromStorage('contact_inquiries', []);

    const inquiry = {
      id: this._generateId('inq'),
      inquiryType,
      name,
      email,
      message,
      preferredStartDate: preferredStartDate ? new Date(preferredStartDate).toISOString() : null,
      preferredEndDate: preferredEndDate ? new Date(preferredEndDate).toISOString() : null,
      budgetRange: budgetRange || null,
      budgetExactAmount: typeof budgetExactAmount === 'number' ? budgetExactAmount : null,
      status: 'new',
      createdAt: this._nowIso(),
      updatedAt: null
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted',
      inquiry
    };
  }

  // ----------------------
  // Press & News
  // ----------------------

  // getPressFilterOptions()
  getPressFilterOptions() {
    const articles = this._getFromStorage('press_articles', []);
    const yearsSet = new Set();
    const tagsSet = new Set();

    articles.forEach((a) => {
      if (typeof a.year === 'number') yearsSet.add(a.year);
      if (Array.isArray(a.tags)) {
        a.tags.forEach((t) => tagsSet.add(t));
      }
    });

    const years = Array.from(yearsSet).sort((a, b) => b - a);
    const tags = Array.from(tagsSet).map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')
    }));

    return {
      years,
      tags,
      defaultSort: 'published_date_desc'
    };
  }

  // searchPressArticles(filters, sort, page = 1, pageSize = 20)
  searchPressArticles(filters, sort, page, pageSize) {
    const articles = this._getFromStorage('press_articles', []);
    const f = filters || {};
    const s = sort || {};
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const currentPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    let results = articles.slice();

    if (Array.isArray(f.years) && f.years.length) {
      const yearsSet = new Set(f.years.map((y) => Number(y)));
      results = results.filter((a) => yearsSet.has(Number(a.year)));
    }

    if (Array.isArray(f.tags) && f.tags.length) {
      const tagsSet = new Set(f.tags);
      results = results.filter((a) => {
        if (!Array.isArray(a.tags)) return false;
        return a.tags.some((t) => tagsSet.has(t));
      });
    }

    if (f.keyword) {
      const q = String(f.keyword).toLowerCase();
      results = results.filter((a) => {
        return (
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.summary && a.summary.toLowerCase().includes(q)) ||
          (a.content && a.content.toLowerCase().includes(q))
        );
      });
    }

    const sortBy = s.sortBy || 'published_date';
    const sortOrder = s.sortOrder === 'asc' ? 'asc' : 'desc';

    results.sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'title') {
        const av = (a.title || '').toLowerCase();
        const bv = (b.title || '').toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      }
      // default: published_date
      const av = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
      const bv = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
      return (av - bv) * dir;
    });

    const totalCount = results.length;
    const start = (currentPage - 1) * currentPageSize;
    const paged = results.slice(start, start + currentPageSize);

    return {
      totalCount,
      page: currentPage,
      pageSize: currentPageSize,
      articles: paged
    };
  }

  // getPressArticleDetail(articleId)
  getPressArticleDetail(articleId) {
    const articles = this._getFromStorage('press_articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    const quotesAll = this._getFromStorage('press_quotes', []);
    const quotesRaw = quotesAll.filter((q) => q.articleId === articleId);

    const quotes = quotesRaw.map((q) => ({
      ...q,
      article
    }));

    return {
      article,
      quotes
    };
  }

  // saveQuoteToPressKit(quoteId)
  saveQuoteToPressKit(quoteId) {
    const quotes = this._getFromStorage('press_quotes', []);
    const articles = this._getFromStorage('press_articles', []);
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) {
      return this._resolvePressKit(this._getOrCreatePressKit());
    }

    const article = articles.find((a) => a.id === quote.articleId) || null;

    const pressKit = this._getOrCreatePressKit();
    const items = Array.isArray(pressKit.items) ? pressKit.items : [];
    const exists = items.some((item) => item.quoteId === quoteId);

    if (!exists) {
      items.push({
        quoteId,
        addedAt: this._nowIso(),
        cachedQuoteText: quote.quoteText,
        cachedArticleTitle: article ? article.title : '',
        cachedPublicationName: article ? (article.publicationName || '') : '',
        cachedPublishedDate: article ? article.publishedDate || null : null
      });
      pressKit.items = items;
      pressKit.updatedAt = this._nowIso();
      this._saveToStorage('press_kit', pressKit);
    }

    return this._resolvePressKit(pressKit);
  }

  // removeQuoteFromPressKit(quoteId)
  removeQuoteFromPressKit(quoteId) {
    const pressKit = this._getOrCreatePressKit();
    const items = Array.isArray(pressKit.items) ? pressKit.items : [];
    const newItems = items.filter((item) => item.quoteId !== quoteId);
    pressKit.items = newItems;
    pressKit.updatedAt = this._nowIso();
    this._saveToStorage('press_kit', pressKit);
    return this._resolvePressKit(pressKit);
  }

  // getPressKit()
  getPressKit() {
    const pressKit = this._getOrCreatePressKit();
    return this._resolvePressKit(pressKit);
  }

  // getPressKitExportData(format = 'print_view')
  getPressKitExportData(format) {
    const _format = format || 'print_view'; // currently unused but accepted
    const pressKit = this.getPressKit();
    const home = this.getHomeOverview();

    const items = (pressKit && Array.isArray(pressKit.items) ? pressKit.items : []).map((item) => {
      const quoteText = item.cachedQuoteText || (item.quote && item.quote.quoteText) || '';
      const articleTitle =
        item.cachedArticleTitle || (item.article && item.article.title) || '';
      const publicationName =
        item.cachedPublicationName || (item.article && item.article.publicationName) || '';
      const publishedDate =
        item.cachedPublishedDate || (item.article && item.article.publishedDate) || null;
      return {
        quoteText,
        articleTitle,
        publicationName,
        publishedDate
      };
    });

    return {
      generatedAt: this._nowIso(),
      actorName: home.heroTitle || '',
      items
    };
  }

  // ----------------------
  // Newsletter
  // ----------------------

  // getNewsletterOptions()
  getNewsletterOptions() {
    const stored = this._getFromStorage('newsletter_options', null);
    if (stored) return stored;

    const interests = [
      {
        key: 'acting_updates',
        label: 'Acting updates',
        description: 'News on acting roles and performances.'
      },
      {
        key: 'new_film_releases',
        label: 'New film releases',
        description: 'Notifications about new films and releases.'
      },
      {
        key: 'behind_the_senes',
        label: 'Behind the scenes',
        description: 'Behind-the-scenes content and process insights.'
      },
      {
        key: 'press_announcements',
        label: 'Press announcements',
        description: 'Press coverage, interviews, and announcements.'
      },
      {
        key: 'events_screenings',
        label: 'Events & screenings',
        description: 'Festival screenings, Q&As, and live events.'
      }
    ];

    const frequencies = [
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' }
    ];

    return {
      interests,
      frequencies
    };
  }

  // subscribeToNewsletter(name, email, interests, frequency)
  subscribeToNewsletter(name, email, interests, frequency) {
    if (!email || !frequency) {
      return {
        success: false,
        message: 'Missing required fields',
        subscription: null
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions', []);

    // Upsert by email
    let subscription = subs.find((s) => s.email === email) || null;

    if (subscription) {
      subscription.name = name || subscription.name || '';
      subscription.interests = Array.isArray(interests) ? interests : subscription.interests || [];
      subscription.frequency = frequency;
      subscription.updatedAt = this._nowIso();
    } else {
      subscription = {
        id: this._generateId('sub'),
        name: name || '',
        email,
        interests: Array.isArray(interests) ? interests : [],
        frequency,
        createdAt: this._nowIso(),
        confirmed: false
      };
      subs.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      message: 'Subscription saved',
      subscription
    };
  }

  // ----------------------
  // Legal content
  // ----------------------

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_policy_content', null);
    if (stored) return stored;

    return {
      lastUpdated: '',
      sections: []
    };
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    const stored = this._getFromStorage('terms_of_use_content', null);
    if (stored) return stored;

    return {
      lastUpdated: '',
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