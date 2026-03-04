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
    this.idCounter = this._getNextIdCounter();
  }

  // ===== Storage Helpers =====

  _initStorage() {
    const keys = [
      'projects',
      'shortlists',
      'shortlist_items',
      'reels',
      'reel_items',
      'services',
      'service_packages',
      'project_inquiries',
      'newsletter_subscriptions',
      'clients',
      'testimonials',
      'contact_messages',
      'jobs',
      'job_applications',
      'blog_posts',
      'reading_lists',
      'reading_list_items',
      'project_estimates',
      'intro_call_bookings'
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

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
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

  _clone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  // ===== Domain helpers =====

  _getCategoryLabel(category) {
    const map = {
      commercials: 'Commercials',
      brand_films: 'Brand Films',
      documentary: 'Documentaries',
      music_video: 'Music Videos',
      narrative_short: 'Narrative Short',
      branded_content: 'Branded Content',
      other: 'Other'
    };
    return map[category] || 'Other';
  }

  _formatDuration(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
      return '';
    }
    if (seconds < 60) {
      return seconds + 's';
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) {
      return mins + ' min';
    }
    return mins + ' min ' + secs + 's';
  }

  _getDurationOptions() {
    return [
      {
        id: 'up_to_60_seconds',
        label: 'Up to 60 seconds',
        minSeconds: 0,
        maxSeconds: 60
      },
      {
        id: 'under_1_minute',
        label: 'Under 1 minute',
        minSeconds: 0,
        maxSeconds: 59
      },
      {
        id: 'sixty_to_one_twenty_seconds',
        label: '60-120 seconds',
        minSeconds: 60,
        maxSeconds: 120
      },
      {
        id: 'twenty_plus_minutes',
        label: '20+ minutes',
        minSeconds: 20 * 60,
        maxSeconds: null
      }
    ];
  }

  _getYearPresets() {
    const now = new Date();
    const currentYear = now.getFullYear();
    return [
      {
        id: 'last_2_years',
        label: 'Last 2 years',
        fromYear: currentYear - 1,
        toYear: currentYear
      },
      {
        id: 'last_12_months',
        label: 'Last 12 months',
        fromYear: currentYear - 1,
        toYear: currentYear
      }
    ];
  }

  _deriveYearRangeFromProjects(projects) {
    if (!projects || !projects.length) {
      const year = new Date().getFullYear();
      return { minYear: year, maxYear: year };
    }
    let minYear = Infinity;
    let maxYear = -Infinity;
    for (let i = 0; i < projects.length; i++) {
      const y = projects[i].release_year;
      if (typeof y === 'number') {
        if (y < minYear) minYear = y;
        if (y > maxYear) maxYear = y;
      }
    }
    if (minYear === Infinity) {
      const year = new Date().getFullYear();
      return { minYear: year, maxYear: year };
    }
    return { minYear: minYear, maxYear: maxYear };
  }

  _deriveBudgetRangeFromProjects(projects) {
    if (!projects || !projects.length) {
      return { minBudget: 0, maxBudget: 100000, step: 1000 };
    }
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < projects.length; i++) {
      const b = projects[i].budget;
      if (typeof b === 'number') {
        if (b < min) min = b;
        if (b > max) max = b;
      }
    }
    if (min === Infinity) {
      return { minBudget: 0, maxBudget: 100000, step: 1000 };
    }
    const range = max - min;
    const step = range > 0 ? Math.round(range / 20) || 1000 : 1000;
    return { minBudget: min, maxBudget: max, step: step };
  }

  _getShortlistProjectIds() {
    const shortlist = this._getOrCreateShortlist();
    const shortlistItems = this._getFromStorage('shortlist_items', []);
    const ids = [];
    for (let i = 0; i < shortlistItems.length; i++) {
      if (shortlistItems[i].shortlist_id === shortlist.id) {
        ids.push(shortlistItems[i].project_id);
      }
    }
    return ids;
  }

  _getReelProjectIds() {
    const reel = this._getOrCreateReel();
    const reelItems = this._getFromStorage('reel_items', []);
    const ids = [];
    for (let i = 0; i < reelItems.length; i++) {
      if (reelItems[i].reel_id === reel.id) {
        ids.push(reelItems[i].project_id);
      }
    }
    return ids;
  }

  _formatProjectForListing(project, shortlistIdsSet, reelIdsSet) {
    const id = project.id;
    const inShortlist = shortlistIdsSet ? shortlistIdsSet[id] === true : false;
    const inReel = reelIdsSet ? reelIdsSet[id] === true : false;
    return {
      id: project.id,
      title: project.title,
      category: project.category,
      categoryLabel: this._getCategoryLabel(project.category),
      genre: project.genre || null,
      durationSeconds: project.duration_seconds,
      durationLabel: this._formatDuration(project.duration_seconds),
      releaseYear: project.release_year,
      location: project.location || null,
      budget: typeof project.budget === 'number' ? project.budget : null,
      thumbnailUrl: project.thumbnail_url || null,
      isFeatured: !!project.is_featured,
      isInShortlist: inShortlist,
      isInReel: inReel
    };
  }

  _mapReelEntityToResponse(reelEntity) {
    if (!reelEntity) return null;
    return {
      id: reelEntity.id,
      name: reelEntity.name,
      description: reelEntity.description || '',
      shareToken: reelEntity.share_token || null,
      shareUrl: reelEntity.share_url || null,
      isShareLinkGenerated: !!reelEntity.is_share_link_generated,
      createdAt: reelEntity.created_at || null,
      updatedAt: reelEntity.updated_at || null
    };
  }

  // ===== Required internal helpers =====

  _getOrCreateShortlist() {
    let shortlists = this._getFromStorage('shortlists', []);
    if (!shortlists.length) {
      const now = this._nowIso();
      const shortlist = {
        id: this._generateId('shortlist'),
        name: 'My Shortlist',
        created_at: now,
        updated_at: now
      };
      shortlists.push(shortlist);
      this._saveToStorage('shortlists', shortlists);
      return shortlist;
    }
    return shortlists[0];
  }

  _getOrCreateReel() {
    let reels = this._getFromStorage('reels', []);
    if (!reels.length) {
      const now = this._nowIso();
      const reel = {
        id: this._generateId('reel'),
        name: 'My Reel',
        description: '',
        share_token: null,
        share_url: null,
        is_share_link_generated: false,
        created_at: now,
        updated_at: now
      };
      reels.push(reel);
      this._saveToStorage('reels', reels);
      return reel;
    }
    return reels[0];
  }

  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists', []);
    if (!lists.length) {
      const now = this._nowIso();
      const list = {
        id: this._generateId('reading_list'),
        name: 'Reading List',
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
      return list;
    }
    return lists[0];
  }

  _createProjectInquiryRecord(data) {
    const inquiries = this._getFromStorage('project_inquiries', []);
    const now = this._nowIso();
    const record = {
      id: this._generateId('project_inquiry'),
      source_page: data.sourcePage || null,
      project_id: data.projectId || null,
      service_id: data.serviceId || null,
      project_type: data.projectType,
      selected_package_id: data.selectedPackageId || null,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      budget: typeof data.budget === 'number' ? data.budget : null,
      preferred_shoot_date: data.preferredShootDate || null,
      project_details: data.projectDetails || null,
      status: 'new',
      created_at: now
    };

    // Optionally attach current shortlist context via a non-enum field
    if (data.attachCurrentShortlist) {
      const shortlist = this._getOrCreateShortlist();
      const shortlistItems = this._getFromStorage('shortlist_items', []);
      const projectIds = [];
      for (let i = 0; i < shortlistItems.length; i++) {
        if (shortlistItems[i].shortlist_id === shortlist.id) {
          projectIds.push(shortlistItems[i].project_id);
        }
      }
      record.shortlist_id = shortlist.id; // internal helper field
      record.shortlist_project_ids = projectIds;
    }

    inquiries.push(record);
    this._saveToStorage('project_inquiries', inquiries);
    return record;
  }

  _createContactMessageRecord(data) {
    const messages = this._getFromStorage('contact_messages', []);
    const now = this._nowIso();
    const record = {
      id: this._generateId('contact_message'),
      name: data.name || null,
      email: data.email || null,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
      message_type: data.messageType || 'general',
      referenced_client_names: data.referencedClientNames || [],
      created_at: now
    };

    if (data.includeShortlist) {
      const shortlist = this._getOrCreateShortlist();
      const shortlistItems = this._getFromStorage('shortlist_items', []);
      const projectIds = [];
      for (let i = 0; i < shortlistItems.length; i++) {
        if (shortlistItems[i].shortlist_id === shortlist.id) {
          projectIds.push(shortlistItems[i].project_id);
        }
      }
      record.shortlist_id = shortlist.id; // internal field
      record.shortlist_project_ids = projectIds;
    }

    messages.push(record);
    this._saveToStorage('contact_messages', messages);
    return record;
  }

  _createProjectEstimateRecord(projectType, budgetMin, budgetMax, timelineWeeks, numDeliverables) {
    const estimates = this._getFromStorage('project_estimates', []);
    const now = this._nowIso();
    const summary = projectType + ' estimate: $' + budgetMin + '–$' + budgetMax + ', ' + timelineWeeks + ' weeks, ' + numDeliverables + ' deliverables.';
    const record = {
      id: this._generateId('project_estimate'),
      project_type: projectType,
      budget_min: budgetMin,
      budget_max: budgetMax,
      timeline_weeks: timelineWeeks,
      num_deliverables: numDeliverables,
      summary: summary,
      created_at: now
    };
    estimates.push(record);
    this._saveToStorage('project_estimates', estimates);
    return record;
  }

  _createIntroCallBookingRecord(projectEstimateId, scheduledStart, timezone) {
    const bookings = this._getFromStorage('intro_call_bookings', []);
    const now = this._nowIso();
    const record = {
      id: this._generateId('intro_call_booking'),
      project_estimate_id: projectEstimateId,
      scheduled_start: scheduledStart,
      timezone: timezone || null,
      status: 'scheduled',
      created_at: now
    };
    bookings.push(record);
    this._saveToStorage('intro_call_bookings', bookings);
    return record;
  }

  _generateReelShareToken(reel) {
    const token = 'reel_' + Math.random().toString(36).slice(2) + '_' + Date.now();
    const baseUrl = 'https://share.local/reel/';
    reel.share_token = token;
    reel.share_url = baseUrl + token;
    reel.is_share_link_generated = true;
    reel.updated_at = this._nowIso();
    return reel;
  }

  // ====== Core interface implementations ======

  // --- Homepage ---

  getHomePageSummary() {
    const projects = this._getFromStorage('projects', []);
    const services = this._getFromStorage('services', []);

    const shortlistIds = this._getShortlistProjectIds();
    const reelIds = this._getReelProjectIds();
    const shortlistSet = {};
    const reelSet = {};
    for (let i = 0; i < shortlistIds.length; i++) shortlistSet[shortlistIds[i]] = true;
    for (let j = 0; j < reelIds.length; j++) reelSet[reelIds[j]] = true;

    // Featured projects
    let featured = [];
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].is_featured) {
        featured.push(projects[i]);
      }
    }
    if (!featured.length) {
      featured = projects.slice(0);
    }
    featured.sort(function (a, b) {
      const da = a.release_date || a.created_at || null;
      const db = b.release_date || b.created_at || null;
      if (da && db) {
        return new Date(db) - new Date(da);
      }
      return (b.release_year || 0) - (a.release_year || 0);
    });
    const featuredProjects = [];
    for (let i = 0; i < featured.length; i++) {
      if (i >= 6) break;
      featuredProjects.push(this._formatProjectForListing(featured[i], shortlistSet, reelSet));
    }

    // Featured services (active ones)
    const featuredServices = [];
    for (let i = 0; i < services.length; i++) {
      if (services[i].is_active || services[i].is_active === undefined) {
        featuredServices.push(this._clone(services[i]));
      }
    }

    // Recent projects by category
    const recentProjectsByCategory = {
      commercials: [],
      documentaries: [],
      music_videos: []
    };

    const commercials = [];
    const documentaries = [];
    const musicVideos = [];
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      if (p.category === 'commercials' || p.category === 'brand_films') {
        commercials.push(p);
      } else if (p.category === 'documentary') {
        documentaries.push(p);
      } else if (p.category === 'music_video') {
        musicVideos.push(p);
      }
    }

    function sortByNewest(arr) {
      arr.sort(function (a, b) {
        const da = a.release_date || a.created_at || null;
        const db = b.release_date || b.created_at || null;
        if (da && db) {
          return new Date(db) - new Date(da);
        }
        return (b.release_year || 0) - (a.release_year || 0);
      });
    }

    sortByNewest(commercials);
    sortByNewest(documentaries);
    sortByNewest(musicVideos);

    for (let i = 0; i < commercials.length && i < 6; i++) {
      recentProjectsByCategory.commercials.push(this._formatProjectForListing(commercials[i], shortlistSet, reelSet));
    }
    for (let i = 0; i < documentaries.length && i < 6; i++) {
      recentProjectsByCategory.documentaries.push(this._formatProjectForListing(documentaries[i], shortlistSet, reelSet));
    }
    for (let i = 0; i < musicVideos.length && i < 6; i++) {
      recentProjectsByCategory.music_videos.push(this._formatProjectForListing(musicVideos[i], shortlistSet, reelSet));
    }

    const primaryCtaLabel = 'Start a Project';

    return {
      featuredProjects: featuredProjects,
      featuredServices: featuredServices,
      recentProjectsByCategory: recentProjectsByCategory,
      primaryCtaLabel: primaryCtaLabel
    };
  }

  // --- Work page filters ---

  getWorkPageFilterOptions() {
    const projects = this._getFromStorage('projects', []);

    const categoryValues = [
      { value: 'commercials', label: 'Commercials' },
      { value: 'brand_films', label: 'Brand Films' },
      { value: 'documentary', label: 'Documentaries' },
      { value: 'music_video', label: 'Music Videos' },
      { value: 'narrative_short', label: 'Narrative Shorts' },
      { value: 'branded_content', label: 'Branded Content' },
      { value: 'other', label: 'Other' }
    ];

    const durationOptions = this._getDurationOptions();
    const yearPresets = this._getYearPresets();
    const yearRange = this._deriveYearRangeFromProjects(projects);

    // Locations from projects
    const locationMap = {};
    for (let i = 0; i < projects.length; i++) {
      const loc = projects[i].location;
      if (loc) {
        locationMap[loc] = true;
      }
    }
    const locations = [];
    for (const loc in locationMap) {
      if (Object.prototype.hasOwnProperty.call(locationMap, loc)) {
        locations.push({ value: loc, label: loc });
      }
    }

    // Genres from projects
    const genreMap = {};
    for (let i = 0; i < projects.length; i++) {
      const g = projects[i].genre;
      if (g) {
        genreMap[g] = true;
      }
    }
    const genres = [];
    for (const g in genreMap) {
      if (Object.prototype.hasOwnProperty.call(genreMap, g)) {
        genres.push({ value: g, label: g });
      }
    }

    const budgetRange = this._deriveBudgetRangeFromProjects(projects);

    const sortOptions = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'oldest_first', label: 'Oldest First' },
      { value: 'budget_low_to_high', label: 'Budget: Low to High' },
      { value: 'budget_high_to_low', label: 'Budget: High to Low' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      categories: categoryValues,
      durationOptions: durationOptions,
      yearPresets: yearPresets,
      yearRange: yearRange,
      locations: locations,
      genres: genres,
      budgetRange: budgetRange,
      sortOptions: sortOptions
    };
  }

  // --- Work page listing ---

  getProjectsForWorkPage(filters, page, pageSize) {
    filters = filters || {};
    page = typeof page === 'number' && page > 0 ? page : 1;
    pageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    let projects = this._getFromStorage('projects', []);

    // Duration filter
    if (filters.durationBucketId) {
      const durationOptions = this._getDurationOptions();
      let bucket = null;
      for (let i = 0; i < durationOptions.length; i++) {
        if (durationOptions[i].id === filters.durationBucketId) {
          bucket = durationOptions[i];
          break;
        }
      }
      if (bucket) {
        const minSec = typeof bucket.minSeconds === 'number' ? bucket.minSeconds : 0;
        const maxSec = typeof bucket.maxSeconds === 'number' ? bucket.maxSeconds : Infinity;
        projects = projects.filter(function (p) {
          const d = p.duration_seconds || 0;
          return d >= minSec && d <= maxSec;
        });
      }
    }

    // Category filter
    if (filters.category) {
      projects = projects.filter(function (p) {
        return p.category === filters.category;
      });
    }

    // Location filter
    if (filters.location) {
      projects = projects.filter(function (p) {
        return p.location === filters.location;
      });
    }

    // Genre filter
    if (filters.genre) {
      projects = projects.filter(function (p) {
        return p.genre === filters.genre;
      });
    }

    // Year preset or range
    let fromYear = filters.releaseYearFrom;
    let toYear = filters.releaseYearTo;
    if (filters.yearPresetId) {
      const presets = this._getYearPresets();
      for (let i = 0; i < presets.length; i++) {
        if (presets[i].id === filters.yearPresetId) {
          fromYear = presets[i].fromYear;
          toYear = presets[i].toYear;
          break;
        }
      }
    }
    if (typeof fromYear === 'number') {
      projects = projects.filter(function (p) {
        return typeof p.release_year === 'number' && p.release_year >= fromYear;
      });
    }
    if (typeof toYear === 'number') {
      projects = projects.filter(function (p) {
        return typeof p.release_year === 'number' && p.release_year <= toYear;
      });
    }

    // Budget range
    if (typeof filters.budgetMin === 'number') {
      projects = projects.filter(function (p) {
        return typeof p.budget === 'number' && p.budget >= filters.budgetMin;
      });
    }
    if (typeof filters.budgetMax === 'number') {
      projects = projects.filter(function (p) {
        return typeof p.budget === 'number' && p.budget <= filters.budgetMax;
      });
    }

    // Sorting
    const sortBy = filters.sortBy || 'newest_first';
    projects = projects.slice(0); // copy
    if (sortBy === 'newest_first') {
      projects.sort(function (a, b) {
        const da = a.release_date || a.created_at || null;
        const db = b.release_date || b.created_at || null;
        if (da && db) {
          return new Date(db) - new Date(da);
        }
        return (b.release_year || 0) - (a.release_year || 0);
      });
    } else if (sortBy === 'oldest_first') {
      projects.sort(function (a, b) {
        const da = a.release_date || a.created_at || null;
        const db = b.release_date || b.created_at || null;
        if (da && db) {
          return new Date(da) - new Date(db);
        }
        return (a.release_year || 0) - (b.release_year || 0);
      });
    } else if (sortBy === 'budget_low_to_high') {
      projects.sort(function (a, b) {
        return (a.budget || 0) - (b.budget || 0);
      });
    } else if (sortBy === 'budget_high_to_low') {
      projects.sort(function (a, b) {
        return (b.budget || 0) - (a.budget || 0);
      });
    }

    const total = projects.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = projects.slice(start, end);

    const shortlistIds = this._getShortlistProjectIds();
    const reelIds = this._getReelProjectIds();
    const shortlistSet = {};
    const reelSet = {};
    for (let i = 0; i < shortlistIds.length; i++) shortlistSet[shortlistIds[i]] = true;
    for (let j = 0; j < reelIds.length; j++) reelSet[reelIds[j]] = true;

    const resultProjects = [];
    for (let i = 0; i < slice.length; i++) {
      resultProjects.push(this._formatProjectForListing(slice[i], shortlistSet, reelSet));
    }

    // Instrumentation for task completion tracking (Task 2: filters & top two results)
    try {
      const isPageOne = page === 1;
      const f = filters || {};
      const matchesCategory = f.category === 'documentary';
      const matchesDuration = f.durationBucketId === 'twenty_plus_minutes';
      const matchesBudgetMax = typeof f.budgetMax === 'number' && f.budgetMax <= 100000;
      const sortByValue = f.sortBy;
      const matchesSort =
        sortByValue === 'budget_low_to_high' || typeof sortByValue === 'undefined';

      if (isPageOne && matchesCategory && matchesDuration && matchesBudgetMax && matchesSort) {
        localStorage.setItem('task2_filterParams', JSON.stringify(f));

        const topTwoIds = [];
        if (resultProjects.length > 0 && resultProjects[0] && resultProjects[0].id) {
          topTwoIds.push(resultProjects[0].id);
        }
        if (resultProjects.length > 1 && resultProjects[1] && resultProjects[1].id) {
          topTwoIds.push(resultProjects[1].id);
        }
        localStorage.setItem('task2_topTwoProjectIds', JSON.stringify(topTwoIds));
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('Instrumentation error:', e);
      }
    }

    return {
      total: total,
      page: page,
      pageSize: pageSize,
      projects: resultProjects
    };
  }

  // --- Shortlist ---

  addProjectToShortlist(projectId) {
    const projects = this._getFromStorage('projects', []);
    const projectExists = projects.some(function (p) { return p.id === projectId; });
    if (!projectExists) {
      return { success: false, message: 'Project not found', shortlist: null };
    }

    const shortlist = this._getOrCreateShortlist();
    let shortlistItems = this._getFromStorage('shortlist_items', []);

    const already = shortlistItems.some(function (item) {
      return item.shortlist_id === shortlist.id && item.project_id === projectId;
    });
    if (!already) {
      const now = this._nowIso();
      const maxSort = shortlistItems.reduce(function (acc, item) {
        return item.shortlist_id === shortlist.id && typeof item.sort_order === 'number'
          ? Math.max(acc, item.sort_order)
          : acc;
      }, 0);
      shortlistItems.push({
        id: this._generateId('shortlist_item'),
        shortlist_id: shortlist.id,
        project_id: projectId,
        added_at: now,
        sort_order: maxSort + 1
      });
      shortlist.updated_at = now;
      const shortlists = this._getFromStorage('shortlists', []);
      if (shortlists.length) {
        shortlists[0] = shortlist;
        this._saveToStorage('shortlists', shortlists);
      }
      this._saveToStorage('shortlist_items', shortlistItems);
    }

    // Build response with resolved projects
    shortlistItems = this._getFromStorage('shortlist_items', []);
    const relatedItems = shortlistItems.filter(function (item) {
      return item.shortlist_id === shortlist.id;
    });
    const projectMap = {};
    for (let i = 0; i < projects.length; i++) {
      projectMap[projects[i].id] = projects[i];
    }
    const responseProjects = [];
    for (let i = 0; i < relatedItems.length; i++) {
      const p = projectMap[relatedItems[i].project_id];
      if (p) {
        responseProjects.push(this._clone(p));
      }
    }

    return {
      success: true,
      message: 'Project added to shortlist',
      shortlist: {
        id: shortlist.id,
        name: shortlist.name,
        totalItems: responseProjects.length,
        projects: responseProjects
      }
    };
  }

  removeProjectFromShortlist(projectId) {
    const shortlist = this._getOrCreateShortlist();
    let shortlistItems = this._getFromStorage('shortlist_items', []);
    const beforeLen = shortlistItems.length;
    shortlistItems = shortlistItems.filter(function (item) {
      return !(item.shortlist_id === shortlist.id && item.project_id === projectId);
    });
    if (shortlistItems.length !== beforeLen) {
      shortlist.updated_at = this._nowIso();
      const shortlists = this._getFromStorage('shortlists', []);
      if (shortlists.length) {
        shortlists[0] = shortlist;
        this._saveToStorage('shortlists', shortlists);
      }
      this._saveToStorage('shortlist_items', shortlistItems);
    }

    const projects = this._getFromStorage('projects', []);
    const relatedItems = shortlistItems.filter(function (item) {
      return item.shortlist_id === shortlist.id;
    });
    const projectMap = {};
    for (let i = 0; i < projects.length; i++) {
      projectMap[projects[i].id] = projects[i];
    }
    const responseProjects = [];
    for (let i = 0; i < relatedItems.length; i++) {
      const p = projectMap[relatedItems[i].project_id];
      if (p) {
        responseProjects.push(this._clone(p));
      }
    }

    return {
      success: true,
      message: 'Project removed from shortlist',
      shortlist: {
        id: shortlist.id,
        name: shortlist.name,
        totalItems: responseProjects.length,
        projects: responseProjects
      }
    };
  }

  getShortlist() {
    const shortlist = this._getOrCreateShortlist();
    const projects = this._getFromStorage('projects', []);
    const shortlistItems = this._getFromStorage('shortlist_items', []);
    const relatedItems = shortlistItems.filter(function (item) {
      return item.shortlist_id === shortlist.id;
    });
    const projectMap = {};
    for (let i = 0; i < projects.length; i++) {
      projectMap[projects[i].id] = projects[i];
    }
    const responseProjects = [];
    for (let i = 0; i < relatedItems.length; i++) {
      const p = projectMap[relatedItems[i].project_id];
      if (p) {
        responseProjects.push(this._clone(p));
      }
    }

    // Instrumentation for task completion tracking (Task 1: shortlist opened)
    try {
      localStorage.setItem('task1_shortlistOpened', 'true');
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('Instrumentation error:', e);
      }
    }

    return {
      shortlist: {
        id: shortlist.id,
        name: shortlist.name,
        totalItems: responseProjects.length,
        projects: responseProjects
      }
    };
  }

  // --- Reel ---

  addProjectToReel(projectId) {
    const projects = this._getFromStorage('projects', []);
    const projectExists = projects.some(function (p) { return p.id === projectId; });
    if (!projectExists) {
      return { success: false, message: 'Project not found', reel: null };
    }

    const reel = this._getOrCreateReel();
    let reelItems = this._getFromStorage('reel_items', []);

    const already = reelItems.some(function (item) {
      return item.reel_id === reel.id && item.project_id === projectId;
    });

    if (!already) {
      const now = this._nowIso();
      const maxSort = reelItems.reduce(function (acc, item) {
        return item.reel_id === reel.id && typeof item.sort_order === 'number'
          ? Math.max(acc, item.sort_order)
          : acc;
      }, 0);
      reelItems.push({
        id: this._generateId('reel_item'),
        reel_id: reel.id,
        project_id: projectId,
        added_at: now,
        sort_order: maxSort + 1
      });
      reel.updated_at = now;
      const reels = this._getFromStorage('reels', []);
      if (reels.length) {
        reels[0] = reel;
        this._saveToStorage('reels', reels);
      }
      this._saveToStorage('reel_items', reelItems);
    }

    // Build response
    reelItems = this._getFromStorage('reel_items', []);
    const relatedItems = reelItems.filter(function (item) {
      return item.reel_id === reel.id;
    });
    relatedItems.sort(function (a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    const projectMap = {};
    for (let i = 0; i < projects.length; i++) {
      projectMap[projects[i].id] = projects[i];
    }
    const items = [];
    for (let i = 0; i < relatedItems.length; i++) {
      const ri = relatedItems[i];
      items.push({
        projectId: ri.project_id,
        sortOrder: ri.sort_order || 0,
        project: this._clone(projectMap[ri.project_id] || null)
      });
    }

    return {
      success: true,
      message: 'Project added to reel',
      reel: {
        id: reel.id,
        name: reel.name,
        description: reel.description || '',
        isShareLinkGenerated: !!reel.is_share_link_generated,
        shareUrl: reel.share_url || null,
        items: items
      }
    };
  }

  removeProjectFromReel(projectId) {
    const reel = this._getOrCreateReel();
    let reelItems = this._getFromStorage('reel_items', []);
    const beforeLen = reelItems.length;
    reelItems = reelItems.filter(function (item) {
      return !(item.reel_id === reel.id && item.project_id === projectId);
    });

    if (beforeLen !== reelItems.length) {
      reel.updated_at = this._nowIso();
      const reels = this._getFromStorage('reels', []);
      if (reels.length) {
        reels[0] = reel;
        this._saveToStorage('reels', reels);
      }
      this._saveToStorage('reel_items', reelItems);
    }

    const projects = this._getFromStorage('projects', []);
    const relatedItems = reelItems.filter(function (item) {
      return item.reel_id === reel.id;
    });
    relatedItems.sort(function (a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    const projectMap = {};
    for (let i = 0; i < projects.length; i++) {
      projectMap[projects[i].id] = projects[i];
    }
    const items = [];
    for (let i = 0; i < relatedItems.length; i++) {
      const ri = relatedItems[i];
      items.push({
        projectId: ri.project_id,
        sortOrder: ri.sort_order || 0,
        project: this._clone(projectMap[ri.project_id] || null)
      });
    }

    return {
      success: true,
      message: 'Project removed from reel',
      reel: {
        id: reel.id,
        name: reel.name,
        isShareLinkGenerated: !!reel.is_share_link_generated,
        shareUrl: reel.share_url || null,
        items: items
      }
    };
  }

  getReel() {
    const reel = this._getOrCreateReel();
    const projects = this._getFromStorage('projects', []);
    const reelItems = this._getFromStorage('reel_items', []);
    const relatedItems = reelItems.filter(function (item) {
      return item.reel_id === reel.id;
    });
    relatedItems.sort(function (a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    const projectMap = {};
    for (let i = 0; i < projects.length; i++) {
      projectMap[projects[i].id] = projects[i];
    }
    const items = [];
    for (let i = 0; i < relatedItems.length; i++) {
      const ri = relatedItems[i];
      items.push({
        projectId: ri.project_id,
        sortOrder: ri.sort_order || 0,
        project: this._clone(projectMap[ri.project_id] || null)
      });
    }

    return {
      reel: this._mapReelEntityToResponse(reel),
      items: items
    };
  }

  reorderReelItems(itemsOrder) {
    if (!Array.isArray(itemsOrder)) {
      return { success: false, reel: null, items: [] };
    }
    const reel = this._getOrCreateReel();
    let reelItems = this._getFromStorage('reel_items', []);
    const orderMap = {};
    for (let i = 0; i < itemsOrder.length; i++) {
      const entry = itemsOrder[i];
      if (entry && entry.projectId) {
        orderMap[entry.projectId] = typeof entry.sortOrder === 'number' ? entry.sortOrder : 0;
      }
    }
    for (let i = 0; i < reelItems.length; i++) {
      if (reelItems[i].reel_id === reel.id && orderMap.hasOwnProperty(reelItems[i].project_id)) {
        reelItems[i].sort_order = orderMap[reelItems[i].project_id];
      }
    }
    this._saveToStorage('reel_items', reelItems);

    const projects = this._getFromStorage('projects', []);
    const relatedItems = reelItems.filter(function (item) {
      return item.reel_id === reel.id;
    });
    relatedItems.sort(function (a, b) {
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    const projectMap = {};
    for (let i = 0; i < projects.length; i++) {
      projectMap[projects[i].id] = projects[i];
    }
    const items = [];
    for (let i = 0; i < relatedItems.length; i++) {
      const ri = relatedItems[i];
      items.push({
        projectId: ri.project_id,
        sortOrder: ri.sort_order || 0,
        project: this._clone(projectMap[ri.project_id] || null)
      });
    }

    return {
      success: true,
      reel: this._mapReelEntityToResponse(reel),
      items: items
    };
  }

  generateReelShareLink() {
    const reels = this._getFromStorage('reels', []);
    let reel = this._getOrCreateReel();
    for (let i = 0; i < reels.length; i++) {
      if (reels[i].id === reel.id) {
        reel = this._generateReelShareToken(reels[i]);
        reels[i] = reel;
        break;
      }
    }
    this._saveToStorage('reels', reels);

    return {
      success: true,
      reel: this._mapReelEntityToResponse(reel)
    };
  }

  // --- Project detail ---

  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find(function (p) { return p.id === projectId; }) || null;

    // Instrumentation for task completion tracking (Task 2: viewed project IDs)
    try {
      const topTwoRaw = localStorage.getItem('task2_topTwoProjectIds');
      if (topTwoRaw) {
        const topTwo = JSON.parse(topTwoRaw);
        if (Array.isArray(topTwo) && topTwo.indexOf(projectId) !== -1) {
          const viewedRaw = localStorage.getItem('task2_viewedProjectIds');
          let viewed = [];
          if (viewedRaw) {
            try {
              const parsed = JSON.parse(viewedRaw);
              if (Array.isArray(parsed)) {
                viewed = parsed;
              }
            } catch (e2) {
              // ignore parse error, reset viewed to []
              viewed = [];
            }
          }
          if (viewed.indexOf(projectId) === -1) {
            viewed.push(projectId);
            localStorage.setItem('task2_viewedProjectIds', JSON.stringify(viewed));
          }
        }
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('Instrumentation error:', e);
      }
    }

    if (!project) {
      return {
        project: null,
        categoryLabel: null,
        durationLabel: null,
        locationLabel: null,
        videoEmbedUrl: null,
        isInShortlist: false,
        isInReel: false,
        credits: [],
        stills: [],
        caseStudyNarrative: ''
      };
    }

    const shortlistIds = this._getShortlistProjectIds();
    const reelIds = this._getReelProjectIds();
    const isInShortlist = shortlistIds.indexOf(project.id) !== -1;
    const isInReel = reelIds.indexOf(project.id) !== -1;

    return {
      project: this._clone(project),
      categoryLabel: this._getCategoryLabel(project.category),
      durationLabel: this._formatDuration(project.duration_seconds),
      locationLabel: project.location || null,
      videoEmbedUrl: project.video_url || null,
      isInShortlist: isInShortlist,
      isInReel: isInReel,
      credits: [],
      stills: [],
      caseStudyNarrative: ''
    };
  }

  // --- Project inquiries ---

  submitProjectInquiry(
    sourcePage,
    projectId,
    serviceId,
    projectType,
    selectedPackageId,
    name,
    email,
    phone,
    budget,
    preferredShootDate,
    projectDetails,
    attachCurrentShortlist
  ) {
    if (!sourcePage || !projectType || !name || !email) {
      return { success: false, message: 'Missing required fields', inquiry: null };
    }

    // Instrumentation for task completion tracking (Task 2: inquiry project ID)
    try {
      if (sourcePage === 'project_detail' && projectType === 'documentary' && projectId) {
        const topTwoRaw = localStorage.getItem('task2_topTwoProjectIds');
        if (topTwoRaw) {
          const topTwo = JSON.parse(topTwoRaw);
          if (Array.isArray(topTwo) && topTwo.indexOf(projectId) !== -1) {
            localStorage.setItem('task2_inquiryProjectId', projectId);
          }
        }
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('Instrumentation error:', e);
      }
    }

    const record = this._createProjectInquiryRecord({
      sourcePage: sourcePage,
      projectId: projectId,
      serviceId: serviceId,
      projectType: projectType,
      selectedPackageId: selectedPackageId,
      name: name,
      email: email,
      phone: phone,
      budget: typeof budget === 'number' ? budget : undefined,
      preferredShootDate: preferredShootDate || null,
      projectDetails: projectDetails || null,
      attachCurrentShortlist: !!attachCurrentShortlist
    });

    // Foreign key resolution for display convenience
    const projects = this._getFromStorage('projects', []);
    const services = this._getFromStorage('services', []);
    const packages = this._getFromStorage('service_packages', []);

    const project = projects.find(function (p) { return p.id === record.project_id; }) || null;
    const service = services.find(function (s) { return s.service_id === record.service_id; }) || null;
    const selectedPackage = packages.find(function (sp) { return sp.id === record.selected_package_id; }) || null;

    const inquiryWithRefs = this._clone(record);
    inquiryWithRefs.project = project;
    inquiryWithRefs.service = service;
    inquiryWithRefs.selectedPackage = selectedPackage;

    return {
      success: true,
      message: 'Inquiry submitted',
      inquiry: inquiryWithRefs
    };
  }

  // --- Newsletter ---

  subscribeToNewsletter(email, wantsBtsUpdates, sourcePage, projectId) {
    if (!email) {
      return { success: false, subscription: null };
    }
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);
    const now = this._nowIso();
    const record = {
      id: this._generateId('newsletter_subscription'),
      email: email,
      wants_bts_updates: !!wantsBtsUpdates,
      source_page: sourcePage || null,
      project_id: projectId || null,
      created_at: now
    };
    subscriptions.push(record);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription: this._clone(record)
    };
  }

  // --- Services overview ---

  getServicesOverview() {
    const services = this._getFromStorage('services', []);
    let highlightedServiceId = 'production_process';
    const hasProductionProcess = services.some(function (s) { return s.service_id === 'production_process'; });
    if (!hasProductionProcess && services.length) {
      highlightedServiceId = services[0].service_id;
    }
    return {
      services: this._clone(services),
      highlightedServiceId: highlightedServiceId
    };
  }

  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services', []);
    const service = services.find(function (s) { return s.service_id === serviceId; }) || null;
    return {
      service: this._clone(service)
    };
  }

  getServicePackages(serviceId, filters) {
    filters = filters || {};
    let packages = this._getFromStorage('service_packages', []);
    packages = packages.filter(function (p) { return p.service_id === serviceId; });

    if (typeof filters.budgetMin === 'number') {
      packages = packages.filter(function (p) { return p.price >= filters.budgetMin; });
    }
    if (typeof filters.budgetMax === 'number') {
      packages = packages.filter(function (p) { return p.price <= filters.budgetMax; });
    }
    if (typeof filters.requiredShootingDays === 'number') {
      packages = packages.filter(function (p) {
        return typeof p.number_of_shooting_days === 'number' && p.number_of_shooting_days >= filters.requiredShootingDays;
      });
    }
    if (Array.isArray(filters.requiredFeatures) && filters.requiredFeatures.length) {
      packages = packages.filter(function (p) {
        if (!Array.isArray(p.features)) return false;
        for (let i = 0; i < filters.requiredFeatures.length; i++) {
          if (p.features.indexOf(filters.requiredFeatures[i]) === -1) {
            return false;
          }
        }
        return true;
      });
    }

    const sortBy = filters.sortBy || 'price_low_to_high';
    packages = packages.slice(0);
    if (sortBy === 'price_low_to_high') {
      packages.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
    } else if (sortBy === 'price_high_to_low') {
      packages.sort(function (a, b) { return (b.price || 0) - (a.price || 0); });
    } else if (sortBy === 'popular_first') {
      packages.sort(function (a, b) {
        const ap = a.is_popular ? 1 : 0;
        const bp = b.is_popular ? 1 : 0;
        return bp - ap;
      });
    }

    // Foreign key resolution: attach service object
    const services = this._getFromStorage('services', []);
    const service = services.find(function (s) { return s.service_id === serviceId; }) || null;
    const result = [];
    for (let i = 0; i < packages.length; i++) {
      const pkg = this._clone(packages[i]);
      pkg.service = this._clone(service);
      result.push(pkg);
    }

    return result;
  }

  // --- Process / How we work ---

  getProcessPageContent() {
    // Minimal, non-mocked structure; detailed content could be managed elsewhere
    return {
      phases: [],
      calculatorCtaLabel: 'Estimate Your Project'
    };
  }

  calculateProjectEstimate(projectType, budgetMin, budgetMax, timelineWeeks, numDeliverables) {
    const record = this._createProjectEstimateRecord(projectType, budgetMin, budgetMax, timelineWeeks, numDeliverables);
    return this._clone(record);
  }

  scheduleIntroCall(projectEstimateId, scheduledStart, timezone) {
    if (!projectEstimateId || !scheduledStart) {
      return null;
    }
    const estimates = this._getFromStorage('project_estimates', []);
    const exists = estimates.some(function (e) { return e.id === projectEstimateId; });
    if (!exists) {
      return null;
    }
    const booking = this._createIntroCallBookingRecord(projectEstimateId, scheduledStart, timezone || null);
    // Foreign key resolution for convenience
    const estimate = estimates.find(function (e) { return e.id === projectEstimateId; }) || null;
    const result = this._clone(booking);
    result.projectEstimate = this._clone(estimate);
    return result;
  }

  // --- Clients & testimonials ---

  getClientFilterOptions() {
    return {
      industries: [
        { value: 'technology', label: 'Technology' },
        { value: 'tech_startup', label: 'Tech Startup' },
        { value: 'consumer', label: 'Consumer' },
        { value: 'non_profit', label: 'Non-profit' },
        { value: 'entertainment', label: 'Entertainment' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  getClients(industry) {
    let clients = this._getFromStorage('clients', []);
    const testimonials = this._getFromStorage('testimonials', []);
    const projects = this._getFromStorage('projects', []);

    if (industry) {
      clients = clients.filter(function (c) { return c.industry === industry; });
    }

    const projectMap = {};
    for (let i = 0; i < projects.length; i++) {
      projectMap[projects[i].id] = projects[i];
    }

    const items = [];
    for (let i = 0; i < clients.length; i++) {
      const client = this._clone(clients[i]);
      const clientTestimonials = testimonials.filter(function (t) { return t.client_id === client.id; });
      const testimonial = clientTestimonials[0] || null;
      const testimonialSummary = testimonial ? (testimonial.summary || '') : '';
      const testimonialFullText = testimonial ? (testimonial.full_text || '') : '';

      let associatedProjectId = null;
      if (testimonial && testimonial.project_id) {
        associatedProjectId = testimonial.project_id;
      } else if (client.primary_project_id) {
        associatedProjectId = client.primary_project_id;
      }
      const associatedProject = associatedProjectId ? this._clone(projectMap[associatedProjectId] || null) : null;

      // Foreign key resolution on nested client.primary_project_id
      if (client.primary_project_id) {
        client.primary_project = this._clone(projectMap[client.primary_project_id] || null);
      }

      items.push({
        client: client,
        testimonialSummary: testimonialSummary,
        testimonialFullText: testimonialFullText,
        associatedProjectId: associatedProjectId,
        associatedProject: associatedProject
      });
    }

    return items;
  }

  // --- Contact page ---

  getContactPageConfig(context) {
    context = context || {};
    const projectTypes = [
      { value: 'music_video', label: 'Music Video' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'branded_content', label: 'Branded Content' },
      { value: 'documentary', label: 'Documentary' },
      { value: 'other', label: 'Other' }
    ];

    const messageTypes = [
      { value: 'general', label: 'General' },
      { value: 'project_inquiry', label: 'Project Inquiry' },
      { value: 'partnership', label: 'Partnership' },
      { value: 'careers', label: 'Careers' },
      { value: 'other', label: 'Other' }
    ];

    let suggestedSubject = '';
    let suggestedMessage = '';

    if (context.sourcePage === 'shortlist' && context.includeShortlistSummary) {
      suggestedSubject = 'Inquiry about shortlisted projects';
      suggestedMessage = 'Hi, I would like to discuss the projects in my shortlist.';
    } else if (context.sourcePage === 'careers') {
      suggestedSubject = 'Careers inquiry';
      suggestedMessage = 'Hi, I am interested in opportunities at your studio.';
    }

    return {
      projectTypes: projectTypes,
      messageTypes: messageTypes,
      suggestedSubject: suggestedSubject,
      suggestedMessage: suggestedMessage
    };
  }

  submitContactMessage(name, email, phone, subject, message, messageType, referencedClientNames, includeShortlist) {
    if (!subject || !message) {
      return { success: false, messageId: null };
    }
    const record = this._createContactMessageRecord({
      name: name || null,
      email: email || null,
      phone: phone || null,
      subject: subject,
      message: message,
      messageType: messageType || 'general',
      referencedClientNames: Array.isArray(referencedClientNames) ? referencedClientNames : [],
      includeShortlist: !!includeShortlist
    });
    return {
      success: true,
      messageId: record.id
    };
  }

  // --- Careers ---

  getCareersFilterOptions() {
    const locations = [
      { value: 'los_angeles', label: 'Los Angeles' },
      { value: 'new_york', label: 'New York' },
      { value: 'remote', label: 'Remote' },
      { value: 'other', label: 'Other' }
    ];
    const departments = [
      { value: 'production', label: 'Production' },
      { value: 'post_production', label: 'Post-Production' },
      { value: 'creative', label: 'Creative' },
      { value: 'operations', label: 'Operations' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'administration', label: 'Administration' },
      { value: 'other', label: 'Other' }
    ];
    return { locations: locations, departments: departments };
  }

  getJobs(location, department, onlyActive) {
    let jobs = this._getFromStorage('jobs', []);
    if (location) {
      jobs = jobs.filter(function (j) { return j.location === location; });
    }
    if (department) {
      jobs = jobs.filter(function (j) { return j.department === department; });
    }
    if (onlyActive === undefined || onlyActive === null) {
      onlyActive = true;
    }
    if (onlyActive) {
      jobs = jobs.filter(function (j) { return j.is_active !== false; });
    }
    return this._clone(jobs);
  }

  getJobDetail(jobId) {
    const jobs = this._getFromStorage('jobs', []);
    const job = jobs.find(function (j) { return j.id === jobId; }) || null;
    return this._clone(job);
  }

  submitJobApplication(jobId, fullName, email, yearsOfProductionExperience, howDidYouHear, coverMessage, legalWorkAuthorization) {
    if (!jobId || !fullName || !email || !howDidYouHear) {
      return null;
    }
    const applications = this._getFromStorage('job_applications', []);
    const now = this._nowIso();
    const record = {
      id: this._generateId('job_application'),
      job_id: jobId,
      full_name: fullName,
      email: email,
      years_of_production_experience: typeof yearsOfProductionExperience === 'number' ? yearsOfProductionExperience : null,
      how_did_you_hear: howDidYouHear,
      cover_message: coverMessage || null,
      legal_work_authorization: !!legalWorkAuthorization,
      status: 'submitted',
      created_at: now
    };
    applications.push(record);
    this._saveToStorage('job_applications', applications);

    // Foreign key resolution: attach job object
    const jobs = this._getFromStorage('jobs', []);
    const job = jobs.find(function (j) { return j.id === jobId; }) || null;
    const result = this._clone(record);
    result.job = this._clone(job);
    return result;
  }

  // --- Blog ---

  getBlogFilterOptions() {
    const posts = this._getFromStorage('blog_posts', []);
    const categoriesMap = {};
    for (let i = 0; i < posts.length; i++) {
      if (posts[i].category) {
        categoriesMap[posts[i].category] = true;
      }
    }
    const allCategoriesEnum = ['cinematography', 'directing', 'production_process', 'company_news', 'other'];
    const categories = [];
    for (let i = 0; i < allCategoriesEnum.length; i++) {
      const val = allCategoriesEnum[i];
      if (categoriesMap[val] || !posts.length) {
        const label = val.replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
        categories.push({ value: val, label: label });
      }
    }

    const timeframes = [
      { id: 'last_12_months', label: 'Last 12 months' },
      { id: 'last_30_days', label: 'Last 30 days' }
    ];

    const tagCount = {};
    for (let i = 0; i < posts.length; i++) {
      const tags = posts[i].tags || [];
      if (Array.isArray(tags)) {
        for (let j = 0; j < tags.length; j++) {
          const t = tags[j];
          if (!tagCount[t]) tagCount[t] = 0;
          tagCount[t]++;
        }
      }
    }
    const popularTags = Object.keys(tagCount).sort(function (a, b) {
      return tagCount[b] - tagCount[a];
    }).slice(0, 10);

    return {
      categories: categories,
      timeframes: timeframes,
      popularTags: popularTags
    };
  }

  searchBlogPosts(query, filters, page, pageSize) {
    filters = filters || {};
    page = typeof page === 'number' && page > 0 ? page : 1;
    pageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;

    let posts = this._getFromStorage('blog_posts', []);
    posts = posts.filter(function (p) { return p.is_published !== false; });

    if (query) {
      const q = query.toLowerCase();
      posts = posts.filter(function (p) {
        const title = (p.title || '').toLowerCase();
        const excerpt = (p.excerpt || '').toLowerCase();
        const content = (p.content || '').toLowerCase();
        const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
        return title.indexOf(q) !== -1 || excerpt.indexOf(q) !== -1 || content.indexOf(q) !== -1 || tags.indexOf(q) !== -1;
      });
    }

    if (filters.category) {
      posts = posts.filter(function (p) { return p.category === filters.category; });
    }

    let fromDate = null;
    if (filters.timeframeId === 'last_12_months') {
      fromDate = new Date();
      fromDate.setFullYear(fromDate.getFullYear() - 1);
    } else if (filters.timeframeId === 'last_30_days') {
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
    }
    if (fromDate) {
      posts = posts.filter(function (p) {
        if (!p.published_at) return false;
        const d = new Date(p.published_at);
        return d >= fromDate;
      });
    }

    if (filters.tag) {
      const tagLower = filters.tag.toLowerCase();
      posts = posts.filter(function (p) {
        if (!Array.isArray(p.tags)) return false;
        for (let i = 0; i < p.tags.length; i++) {
          if (String(p.tags[i]).toLowerCase() === tagLower) return true;
        }
        return false;
      });
    }

    posts = posts.slice(0);
    posts.sort(function (a, b) {
      const da = a.published_at || a.created_at || null;
      const db = b.published_at || b.created_at || null;
      if (da && db) {
        return new Date(db) - new Date(da);
      }
      return 0;
    });

    const total = posts.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = posts.slice(start, end);

    return {
      total: total,
      page: page,
      pageSize: pageSize,
      posts: this._clone(slice)
    };
  }

  getBlogArticle(blogPostId) {
    const posts = this._getFromStorage('blog_posts', []);
    const post = posts.find(function (p) { return p.id === blogPostId; }) || null;
    return this._clone(post);
  }

  saveBlogPostToReadingList(blogPostId) {
    if (!blogPostId) {
      return { success: false, readingList: null };
    }
    const readingList = this._getOrCreateReadingList();
    let items = this._getFromStorage('reading_list_items', []);
    const exists = items.some(function (it) {
      return it.reading_list_id === readingList.id && it.blog_post_id === blogPostId;
    });
    if (!exists) {
      items.push({
        id: this._generateId('reading_list_item'),
        reading_list_id: readingList.id,
        blog_post_id: blogPostId,
        saved_at: this._nowIso()
      });
      readingList.updated_at = this._nowIso();
      const lists = this._getFromStorage('reading_lists', []);
      if (lists.length) {
        lists[0] = readingList;
        this._saveToStorage('reading_lists', lists);
      }
      this._saveToStorage('reading_list_items', items);
    }

    return { success: true, readingList: this._clone(readingList) };
  }

  removeBlogPostFromReadingList(blogPostId) {
    const readingList = this._getOrCreateReadingList();
    let items = this._getFromStorage('reading_list_items', []);
    const beforeLen = items.length;
    items = items.filter(function (it) {
      return !(it.reading_list_id === readingList.id && it.blog_post_id === blogPostId);
    });
    if (beforeLen !== items.length) {
      readingList.updated_at = this._nowIso();
      const lists = this._getFromStorage('reading_lists', []);
      if (lists.length) {
        lists[0] = readingList;
        this._saveToStorage('reading_lists', lists);
      }
      this._saveToStorage('reading_list_items', items);
    }
    return { success: true, readingList: this._clone(readingList) };
  }

  getReadingList() {
    const readingList = this._getOrCreateReadingList();
    const itemsRaw = this._getFromStorage('reading_list_items', []);
    const posts = this._getFromStorage('blog_posts', []);
    const postMap = {};
    for (let i = 0; i < posts.length; i++) {
      postMap[posts[i].id] = posts[i];
    }

    const items = [];
    for (let i = 0; i < itemsRaw.length; i++) {
      const it = itemsRaw[i];
      if (it.reading_list_id === readingList.id) {
        items.push({
          blogPost: this._clone(postMap[it.blog_post_id] || null),
          savedAt: it.saved_at || null
        });
      }
    }

    return {
      readingList: this._clone(readingList),
      items: items
    };
  }

  getBlogPostShareInfo(blogPostId) {
    // Instrumentation for task completion tracking (Task 5: blog post share info)
    try {
      localStorage.setItem('task5_shareInfoBlogPostId', blogPostId);
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('Instrumentation error:', e);
      }
    }

    const posts = this._getFromStorage('blog_posts', []);
    const post = posts.find(function (p) { return p.id === blogPostId; }) || null;
    if (!post) {
      return { shareUrl: null };
    }
    let shareUrl = post.share_url;
    if (!shareUrl) {
      const slug = post.slug || post.id;
      shareUrl = 'https://blog.local/article/' + slug;
    }
    return { shareUrl: shareUrl };
  }

  // --- About & Legal ---

  getAboutPageContent() {
    return {
      heroTitle: 'About Our Studio',
      heroSubtitle: 'Film production and storytelling',
      storyHtml: '',
      values: [],
      teamMembers: []
    };
  }

  getLegalDocuments() {
    return {
      privacyPolicyHtml: '',
      termsOfUseHtml: '',
      lastUpdated: this._nowIso()
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