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

  // ------------------------
  // Storage helpers
  // ------------------------
  _initStorage() {
    const ensureKey = (key, defaultJson) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, defaultJson);
      }
    };

    // Core data tables from data models
    ensureKey('operating_systems', '[]');
    ensureKey('software_categories', '[]');
    ensureKey('article_categories', '[]');
    ensureKey('tags', '[]');
    ensureKey('software_tools', '[]');
    ensureKey('software_versions', '[]');
    ensureKey('software_download_options', '[]');
    ensureKey('favorite_tools', '[]');
    // Single-user profile/preferences (single object or null)
    if (localStorage.getItem('profile_preferences') === null) {
      localStorage.setItem('profile_preferences', 'null');
    }
    ensureKey('articles', '[]');
    ensureKey('newsletter_subscriptions', '[]');
    ensureKey('comments', '[]');

    // Auth & users
    ensureKey('users', '[]');
    if (localStorage.getItem('auth_state') === null) {
      localStorage.setItem('auth_state', JSON.stringify({ isLoggedIn: false, username: null }));
    }

    // Static pages & contact info
    if (localStorage.getItem('static_pages') === null) {
      localStorage.setItem('static_pages', '{}');
    }
    if (localStorage.getItem('contact_info') === null) {
      localStorage.setItem('contact_info', '{}');
    }
    ensureKey('contact_messages', '[]');

    // Global id counter
    if (localStorage.getItem('idCounter') === null) {
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
    const currentRaw = localStorage.getItem('idCounter');
    const current = parseInt(currentRaw || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ------------------------
  // Helper lookups & mappers
  // ------------------------
  _getOperatingSystemsMap() {
    const oss = this._getFromStorage('operating_systems', []);
    const map = {};
    for (const os of oss) {
      if (os && os.id) {
        map[os.id] = os;
      }
    }
    return map;
  }

  _getSoftwareCategoriesMap() {
    const cats = this._getFromStorage('software_categories', []);
    const map = {};
    for (const c of cats) {
      if (c && c.id) {
        map[c.id] = c;
      }
    }
    return map;
  }

  _getArticleCategoriesMap() {
    const cats = this._getFromStorage('article_categories', []);
    const map = {};
    for (const c of cats) {
      if (c && c.id) {
        map[c.id] = c;
      }
    }
    return map;
  }

  _getTagsMap() {
    const tags = this._getFromStorage('tags', []);
    const map = {};
    for (const t of tags) {
      if (t && t.id) {
        map[t.id] = t;
      }
    }
    return map;
  }

  _mapLicenseTypeToLabel(licenseType) {
    if (!licenseType) return '';
    switch (licenseType) {
      case 'free':
        return 'Free';
      case 'free_trial':
        return 'Free trial';
      case 'trial':
        return 'Trial';
      case 'paid':
        return 'Paid';
      case 'open_source':
        return 'Open source';
      case 'freemium':
        return 'Freemium';
      default:
        return licenseType;
    }
  }

  _parseYearFromDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear();
  }

  _compareByDateDesc(a, b, field) {
    const da = a && a[field] ? new Date(a[field]).getTime() : 0;
    const db = b && b[field] ? new Date(b[field]).getTime() : 0;
    return db - da;
  }

  _compareByDateAsc(a, b, field) {
    const da = a && a[field] ? new Date(a[field]).getTime() : 0;
    const db = b && b[field] ? new Date(b[field]).getTime() : 0;
    return da - db;
  }

  _getFavoritesStore() {
    const favorites = this._getFromStorage('favorite_tools', []);
    return Array.isArray(favorites) ? favorites : [];
  }

  _isToolFavorited(toolId, favoriteToolsArray) {
    if (!toolId || !favoriteToolsArray || !favoriteToolsArray.length) return false;
    return favoriteToolsArray.some(function (f) { return f.softwareId === toolId; });
  }

  _getOrCreateProfilePreferences() {
    let raw = localStorage.getItem('profile_preferences');
    let prefs = null;
    if (raw) {
      try {
        prefs = JSON.parse(raw);
      } catch (e) {
        prefs = null;
      }
    }
    if (!prefs || typeof prefs !== 'object') {
      prefs = {
        id: 'profile',
        preferredOperatingSystems: [],
        defaultSoftwareCategoryId: null,
        defaultArticleCategoryId: null,
        defaultSortOrder: null,
        preferredContentTagIds: [],
        updatedAt: new Date().toISOString()
      };
      this._saveToStorage('profile_preferences', prefs);
    }
    return prefs;
  }

  _getAuthState() {
    let raw = localStorage.getItem('auth_state');
    let state = null;
    if (raw) {
      try {
        state = JSON.parse(raw);
      } catch (e) {
        state = null;
      }
    }
    if (!state || typeof state !== 'object') {
      state = { isLoggedIn: false, username: null };
      this._saveToStorage('auth_state', state);
    }
    return state;
  }

  _setAuthState(state) {
    this._saveToStorage('auth_state', state);
  }

  _buildSupportedOsNames(osIds, osMap) {
    if (!Array.isArray(osIds)) return [];
    const names = [];
    for (const id of osIds) {
      const os = osMap[id];
      if (os && os.name) names.push(os.name);
    }
    return names;
  }

  _buildSupportedOsDetails(osIds, osMap) {
    if (!Array.isArray(osIds)) return [];
    const details = [];
    for (const id of osIds) {
      if (osMap[id]) details.push(osMap[id]);
    }
    return details;
  }

  _buildTagNames(tagIds, tagsMap) {
    if (!Array.isArray(tagIds)) return [];
    const names = [];
    for (const id of tagIds) {
      const tag = tagsMap[id];
      if (tag && tag.name) names.push(tag.name);
    }
    return names;
  }

  _buildTags(tagIds, tagsMap) {
    if (!Array.isArray(tagIds)) return [];
    const tags = [];
    for (const id of tagIds) {
      if (tagsMap[id]) tags.push(tagsMap[id]);
    }
    return tags;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomePageContent()
  getHomePageContent() {
    const operatingSystems = this.getOperatingSystems();
    const primaryCategoriesAll = this.getSoftwareCategories();
    const primaryCategories = primaryCategoriesAll.filter(function (c) { return !!c.isPrimary; });

    const tools = this._getFromStorage('software_tools', []);
    const osMap = this._getOperatingSystemsMap();
    const catMap = this._getSoftwareCategoriesMap();
    const favorites = this._getFavoritesStore();

    // Featured tools
    const featuredToolsRaw = tools.filter(function (t) { return !!t.isFeatured; });
    featuredToolsRaw.sort((a, b) => this._compareByDateDesc(a, b, 'createdAt'));

    const featuredTools = featuredToolsRaw.map((tool) => {
      const primaryCategory = catMap[tool.primaryCategoryId] || null;
      const supportedOsIds = Array.isArray(tool.supportedOperatingSystems) ? tool.supportedOperatingSystems : [];
      return {
        id: tool.id,
        name: tool.name,
        shortDescription: tool.shortDescription || '',
        primaryCategoryId: tool.primaryCategoryId || null,
        primaryCategoryName: primaryCategory ? primaryCategory.name : null,
        primaryCategory: primaryCategory || null,
        averageRating: typeof tool.averageRating === 'number' ? tool.averageRating : null,
        ratingCount: typeof tool.ratingCount === 'number' ? tool.ratingCount : 0,
        licenseType: tool.licenseType || null,
        licenseLabel: this._mapLicenseTypeToLabel(tool.licenseType),
        isFree: !!tool.isFree,
        supportedOperatingSystems: supportedOsIds,
        supportedOperatingSystemNames: this._buildSupportedOsNames(supportedOsIds, osMap),
        currentVersionNumber: tool.currentVersionNumber || null,
        minFileSizeMb: typeof tool.minFileSizeMb === 'number' ? tool.minFileSizeMb : null,
        isFavorited: this._isToolFavorited(tool.id, favorites),
        isFeatured: !!tool.isFeatured
      };
    });

    // Top-rated tools (by averageRating desc)
    const topRatedRaw = tools.slice().sort(function (a, b) {
      const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
      const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
      if (rb !== ra) return rb - ra;
      const ca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
      const cb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
      return cb - ca;
    }).slice(0, 10);

    const topRatedTools = topRatedRaw.map((tool) => {
      const primaryCategory = catMap[tool.primaryCategoryId] || null;
      const supportedOsIds = Array.isArray(tool.supportedOperatingSystems) ? tool.supportedOperatingSystems : [];
      return {
        id: tool.id,
        name: tool.name,
        shortDescription: tool.shortDescription || '',
        primaryCategoryId: tool.primaryCategoryId || null,
        primaryCategoryName: primaryCategory ? primaryCategory.name : null,
        primaryCategory: primaryCategory || null,
        averageRating: typeof tool.averageRating === 'number' ? tool.averageRating : null,
        ratingCount: typeof tool.ratingCount === 'number' ? tool.ratingCount : 0,
        licenseType: tool.licenseType || null,
        licenseLabel: this._mapLicenseTypeToLabel(tool.licenseType),
        supportedOperatingSystems: supportedOsIds,
        supportedOperatingSystemNames: this._buildSupportedOsNames(supportedOsIds, osMap),
        currentVersionNumber: tool.currentVersionNumber || null,
        minFileSizeMb: typeof tool.minFileSizeMb === 'number' ? tool.minFileSizeMb : null,
        isFavorited: this._isToolFavorited(tool.id, favorites)
      };
    });

    // Highlighted articles (newest few)
    const articles = this._getFromStorage('articles', []);
    const articleCatMap = this._getArticleCategoriesMap();
    const highlightedRaw = articles.slice().sort((a, b) => this._compareByDateDesc(a, b, 'publishDate')).slice(0, 10);

    const highlightedArticles = highlightedRaw.map((a) => {
      const cat = articleCatMap[a.categoryId] || null;
      return {
        id: a.id,
        title: a.title,
        excerpt: a.excerpt || '',
        categoryId: a.categoryId || null,
        categoryName: cat ? cat.name : null,
        category: cat || null,
        publishDate: a.publishDate || null,
        isReview: !!a.isReview,
        primaryDownloadLabel: a.primaryDownloadLabel || null
      };
    });

    const searchPlaceholder = 'Search software tools';

    return {
      operatingSystems: operatingSystems,
      primaryCategories: primaryCategories,
      featuredTools: featuredTools,
      topRatedTools: topRatedTools,
      highlightedArticles: highlightedArticles,
      searchPlaceholder: searchPlaceholder
    };
  }

  // getOperatingSystems()
  getOperatingSystems() {
    const oss = this._getFromStorage('operating_systems', []);
    return Array.isArray(oss) ? oss : [];
  }

  // getSoftwareCategories()
  getSoftwareCategories() {
    const cats = this._getFromStorage('software_categories', []);
    return Array.isArray(cats) ? cats : [];
  }

  // getSoftwareListingFilterOptions(categoryId, query)
  getSoftwareListingFilterOptions(categoryId, query) {
    const tools = this._getFromStorage('software_tools', []);
    const osMap = this._getOperatingSystemsMap();
    const categories = this.getSoftwareCategories();
    const tags = this._getFromStorage('tags', []);

    const normalizedQuery = query ? String(query).toLowerCase() : null;

    const filteredTools = tools.filter(function (tool) {
      if (!tool) return false;
      if (categoryId && tool.primaryCategoryId !== categoryId) return false;
      if (normalizedQuery) {
        const text = ((tool.name || '') + ' ' + (tool.shortDescription || '')).toLowerCase();
        if (text.indexOf(normalizedQuery) === -1) return false;
      }
      return true;
    });

    const osSet = {};
    const licenseSet = {};
    const yearsSet = {};
    let minSize = null;
    let maxSize = null;
    let minPrice = null;
    let maxPrice = null;
    const tagSet = {};
    const categorySet = {};

    for (const tool of filteredTools) {
      // OS
      const osIds = Array.isArray(tool.supportedOperatingSystems) ? tool.supportedOperatingSystems : [];
      for (const id of osIds) {
        osSet[id] = true;
      }
      // License
      if (tool.licenseType) {
        licenseSet[tool.licenseType] = true;
      }
      // Release year
      const year = this._parseYearFromDate(tool.releaseDate);
      if (year) {
        yearsSet[year] = true;
      }
      // File size
      if (typeof tool.minFileSizeMb === 'number') {
        if (minSize === null || tool.minFileSizeMb < minSize) minSize = tool.minFileSizeMb;
        if (maxSize === null || tool.minFileSizeMb > maxSize) maxSize = tool.minFileSizeMb;
      }
      // Price
      if (typeof tool.baseMonthlyPriceUsd === 'number') {
        if (minPrice === null || tool.baseMonthlyPriceUsd < minPrice) minPrice = tool.baseMonthlyPriceUsd;
        if (maxPrice === null || tool.baseMonthlyPriceUsd > maxPrice) maxPrice = tool.baseMonthlyPriceUsd;
      }
      // Tags
      const tIds = Array.isArray(tool.tagIds) ? tool.tagIds : [];
      for (const tid of tIds) {
        tagSet[tid] = true;
      }
      // Categories that actually appear
      if (tool.primaryCategoryId) {
        categorySet[tool.primaryCategoryId] = true;
      }
    }

    const availableOperatingSystems = Object.keys(osSet).map((id) => osMap[id]).filter(function (os) { return !!os; });

    const ratingThresholds = [3, 3.5, 4, 4.5];

    const licenseTypes = Object.keys(licenseSet).map((value) => ({
      value: value,
      label: this._mapLicenseTypeToLabel(value)
    }));

    const releaseYears = Object.keys(yearsSet).map(function (y) { return parseInt(y, 10); }).sort(function (a, b) { return b - a; });

    const fileSizeRangeMb = {
      min: minSize,
      max: maxSize
    };

    const monthlyPriceRangeUsd = {
      min: minPrice,
      max: maxPrice
    };

    const categoriesFiltered = categories.filter(function (c) { return categorySet[c.id]; });

    const tagsMap = this._getTagsMap();
    const tagsFiltered = Object.keys(tagSet).map((id) => tagsMap[id]).filter(function (t) { return !!t; });

    const sortOptions = [
      { value: 'price_monthly_low_to_high', label: 'Price (Monthly) - Low to High' },
      { value: 'highest_rated', label: 'Highest rated' },
      { value: 'newest_first', label: 'Newest first' },
      { value: 'name_a_to_z', label: 'Name A to Z' }
    ];

    return {
      availableOperatingSystems: availableOperatingSystems,
      ratingThresholds: ratingThresholds,
      licenseTypes: licenseTypes,
      releaseYears: releaseYears,
      fileSizeRangeMb: fileSizeRangeMb,
      monthlyPriceRangeUsd: monthlyPriceRangeUsd,
      categories: categoriesFiltered,
      tags: tagsFiltered,
      sortOptions: sortOptions
    };
  }

  // searchSoftwareTools(...)
  searchSoftwareTools(
    query,
    categoryId,
    tagIds,
    operatingSystems,
    minRating,
    licenseTypes,
    releaseYear,
    minFileSizeMb,
    maxFileSizeMb,
    maxMonthlyPriceUsd,
    sortOrder,
    isSystemCleanupOnly,
    isVpnOnly,
    gitIntegrationRequired,
    page,
    pageSize
  ) {
    const tools = this._getFromStorage('software_tools', []);
    const osMap = this._getOperatingSystemsMap();
    const catMap = this._getSoftwareCategoriesMap();
    const tagsMap = this._getTagsMap();
    const favorites = this._getFavoritesStore();

    // Instrumentation for task completion tracking
    try {
      // task_1: search with both minRating and releaseYear non-null
      if (minRating != null && releaseYear != null) {
        const task1Filters = {
          query,
          categoryId,
          operatingSystems,
          minRating,
          licenseTypes,
          releaseYear,
          minFileSizeMb,
          maxFileSizeMb,
          maxMonthlyPriceUsd,
          sortOrder,
          isSystemCleanupOnly,
          isVpnOnly,
          gitIntegrationRequired
        };
        localStorage.setItem('task1_searchFilters', JSON.stringify(task1Filters));
      }

      // task_2: search where gitIntegrationRequired === true
      if (gitIntegrationRequired === true) {
        const task2Filters = {
          query,
          categoryId,
          tagIds,
          operatingSystems,
          minRating,
          licenseTypes,
          releaseYear,
          minFileSizeMb,
          maxFileSizeMb,
          maxMonthlyPriceUsd,
          sortOrder,
          gitIntegrationRequired
        };
        localStorage.setItem('task2_searchFilters', JSON.stringify(task2Filters));
      }

      // task_3: system cleanup only searches
      if (isSystemCleanupOnly === true) {
        const task3Filters = {
          categoryId,
          operatingSystems,
          minRating,
          maxFileSizeMb,
          isSystemCleanupOnly,
          sortOrder
        };
        localStorage.setItem('task3_searchFilters', JSON.stringify(task3Filters));
      }

      // task_4: VPN searches constrained by price
      if (isVpnOnly === true && typeof maxMonthlyPriceUsd === 'number') {
        const task4Filters = {
          query,
          categoryId,
          operatingSystems,
          licenseTypes,
          maxMonthlyPriceUsd,
          sortOrder,
          isVpnOnly
        };
        localStorage.setItem('task4_searchFilters', JSON.stringify(task4Filters));
      }

      // task_7: multi-OS searches (e.g., Windows + Linux)
      if (Array.isArray(operatingSystems) && operatingSystems.length >= 2) {
        const task7Filters = {
          categoryId,
          operatingSystems,
          tagIds,
          minRating,
          licenseTypes,
          releaseYear,
          minFileSizeMb,
          maxFileSizeMb,
          maxMonthlyPriceUsd,
          sortOrder
        };
        localStorage.setItem('task7_searchFilters', JSON.stringify(task7Filters));
      }
    } catch (e) {
      try { console.error('Instrumentation error:', e); } catch (e2) {}
    }

    const normalizedQuery = query ? String(query).toLowerCase() : null;
    const tagIdSet = Array.isArray(tagIds) ? tagIds.reduce(function (acc, id) { acc[id] = true; return acc; }, {}) : null;
    const osFilterSet = Array.isArray(operatingSystems) ? operatingSystems.reduce(function (acc, id) { acc[id] = true; return acc; }, {}) : null;
    const licenseSet = Array.isArray(licenseTypes) ? licenseTypes.reduce(function (acc, val) { acc[val] = true; return acc; }, {}) : null;

    const filtered = tools.filter((tool) => {
      if (!tool) return false;
      // Query
      if (normalizedQuery) {
        const text = ((tool.name || '') + ' ' + (tool.shortDescription || '')).toLowerCase();
        if (text.indexOf(normalizedQuery) === -1) return false;
      }
      // Category
      if (categoryId && tool.primaryCategoryId !== categoryId) return false;
      // Tags
      if (tagIdSet) {
        const tIds = Array.isArray(tool.tagIds) ? tool.tagIds : [];
        const hasAnyTag = tIds.some(function (id) { return !!tagIdSet[id]; });
        if (!hasAnyTag) return false;
      }
      // OS filter
      if (osFilterSet) {
        const osIds = Array.isArray(tool.supportedOperatingSystems) ? tool.supportedOperatingSystems : [];
        const hasMatch = osIds.some(function (id) { return !!osFilterSet[id]; });
        if (!hasMatch) return false;
      }
      // Rating
      if (typeof minRating === 'number') {
        const r = typeof tool.averageRating === 'number' ? tool.averageRating : 0;
        if (r < minRating) return false;
      }
      // License
      if (licenseSet && tool.licenseType && !licenseSet[tool.licenseType]) return false;
      // Release year
      if (typeof releaseYear === 'number') {
        const year = this._parseYearFromDate(tool.releaseDate);
        if (year !== releaseYear) return false;
      }
      // File size
      if (typeof minFileSizeMb === 'number') {
        if (typeof tool.minFileSizeMb !== 'number' || tool.minFileSizeMb < minFileSizeMb) return false;
      }
      if (typeof maxFileSizeMb === 'number') {
        if (typeof tool.minFileSizeMb !== 'number' || tool.minFileSizeMb > maxFileSizeMb) return false;
      }
      // Price
      if (typeof maxMonthlyPriceUsd === 'number') {
        if (typeof tool.baseMonthlyPriceUsd !== 'number' || tool.baseMonthlyPriceUsd > maxMonthlyPriceUsd) return false;
      }
      // System cleanup filter
      if (isSystemCleanupOnly) {
        if (!tool.isSystemCleanupTool) return false;
      }
      // VPN filter
      if (isVpnOnly) {
        if (!tool.isVpn) return false;
      }
      // Git integration
      if (gitIntegrationRequired) {
        const hasGitFlag = !!tool.gitIntegrationSupported;
        const tIds = Array.isArray(tool.tagIds) ? tool.tagIds : [];
        const hasGitTag = tIds.some(function (id) {
          const tag = tagsMap[id];
          if (!tag) return false;
          const name = (tag.name || '').toLowerCase();
          const slug = (tag.slug || '').toLowerCase();
          return name.indexOf('git') !== -1 || slug.indexOf('git') !== -1;
        });
        if (!hasGitFlag && !hasGitTag) return false;
      }
      return true;
    });

    const order = sortOrder || 'newest_first';

    filtered.sort((a, b) => {
      if (order === 'price_monthly_low_to_high') {
        const pa = typeof a.baseMonthlyPriceUsd === 'number' ? a.baseMonthlyPriceUsd : Number.POSITIVE_INFINITY;
        const pb = typeof b.baseMonthlyPriceUsd === 'number' ? b.baseMonthlyPriceUsd : Number.POSITIVE_INFINITY;
        if (pa !== pb) return pa - pb;
        return this._compareByDateDesc(a, b, 'releaseDate');
      }
      if (order === 'highest_rated') {
        const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
        const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const cb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        if (cb !== ca) return cb - ca;
        return this._compareByDateDesc(a, b, 'releaseDate');
      }
      if (order === 'name_a_to_z') {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      }
      // default: newest_first
      return this._compareByDateDesc(a, b, 'releaseDate');
    });

    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const slice = filtered.slice(start, end);

    const results = slice.map((tool) => {
      const primaryCategory = catMap[tool.primaryCategoryId] || null;
      const osIds = Array.isArray(tool.supportedOperatingSystems) ? tool.supportedOperatingSystems : [];
      const tagIdsTool = Array.isArray(tool.tagIds) ? tool.tagIds : [];
      return {
        id: tool.id,
        name: tool.name,
        slug: tool.slug || null,
        shortDescription: tool.shortDescription || '',
        primaryCategoryId: tool.primaryCategoryId || null,
        primaryCategoryName: primaryCategory ? primaryCategory.name : null,
        primaryCategory: primaryCategory || null,
        averageRating: typeof tool.averageRating === 'number' ? tool.averageRating : null,
        ratingCount: typeof tool.ratingCount === 'number' ? tool.ratingCount : 0,
        licenseType: tool.licenseType || null,
        licenseLabel: this._mapLicenseTypeToLabel(tool.licenseType),
        isFree: !!tool.isFree,
        hasTrial: !!tool.hasTrial,
        baseMonthlyPriceUsd: typeof tool.baseMonthlyPriceUsd === 'number' ? tool.baseMonthlyPriceUsd : null,
        supportedOperatingSystems: osIds,
        supportedOperatingSystemNames: this._buildSupportedOsNames(osIds, osMap),
        supportedOperatingSystemDetails: this._buildSupportedOsDetails(osIds, osMap),
        currentVersionNumber: tool.currentVersionNumber || null,
        currentVersionNumberSortable: typeof tool.currentVersionNumberSortable === 'number' ? tool.currentVersionNumberSortable : null,
        minFileSizeMb: typeof tool.minFileSizeMb === 'number' ? tool.minFileSizeMb : null,
        releaseDate: tool.releaseDate || null,
        isSystemCleanupTool: !!tool.isSystemCleanupTool,
        isVpn: !!tool.isVpn,
        gitIntegrationSupported: !!tool.gitIntegrationSupported,
        tagIds: tagIdsTool,
        tagNames: this._buildTagNames(tagIdsTool, tagsMap),
        tags: this._buildTags(tagIdsTool, tagsMap),
        isFavorited: this._isToolFavorited(tool.id, favorites)
      };
    });

    return {
      total: filtered.length,
      page: pageNum,
      pageSize: size,
      results: results
    };
  }

  // getSoftwareDetail(softwareId)
  getSoftwareDetail(softwareId) {
    const tools = this._getFromStorage('software_tools', []);
    const tool = tools.find(function (t) { return t.id === softwareId; });
    if (!tool) {
      return null;
    }

    const osMap = this._getOperatingSystemsMap();
    const catMap = this._getSoftwareCategoriesMap();
    const tagsMap = this._getTagsMap();
    const favorites = this._getFavoritesStore();
    const downloadOptionsAll = this._getFromStorage('software_download_options', []);
    const articles = this._getFromStorage('articles', []);

    const primaryCategory = catMap[tool.primaryCategoryId] || null;
    const secondaryIds = Array.isArray(tool.secondaryCategoryIds) ? tool.secondaryCategoryIds : [];
    const secondaryCategories = secondaryIds.map(function (id) { return catMap[id]; }).filter(function (c) { return !!c; });
    const secondaryCategoryNames = secondaryCategories.map(function (c) { return c.name; });

    const osIds = Array.isArray(tool.supportedOperatingSystems) ? tool.supportedOperatingSystems : [];
    const supportedOperatingSystemDetails = this._buildSupportedOsDetails(osIds, osMap);

    const tagIds = Array.isArray(tool.tagIds) ? tool.tagIds : [];
    const tags = this._buildTags(tagIds, tagsMap);

    // Instrumentation for task completion tracking
    try {
      // task_1: record selected software id whenever a tool is successfully retrieved
      localStorage.setItem('task1_selectedSoftwareId', softwareId);

      // task_7: record selected software id as well
      localStorage.setItem('task7_selectedSoftwareId', softwareId);

      // task_4: selected VPN software id when tool is a VPN
      if (tool.isVpn === true) {
        localStorage.setItem('task4_selectedVpnSoftwareId', softwareId);
      }

      // task_2: compared Git-capable software ids
      let hasGitFlag = !!tool.gitIntegrationSupported;
      let hasGitTag = false;
      if (!hasGitFlag && Array.isArray(tagIds)) {
        for (const id of tagIds) {
          const tag = tagsMap[id];
          if (!tag) continue;
          const name = (tag.name || '').toLowerCase();
          const slug = (tag.slug || '').toLowerCase();
          if (name.indexOf('git') !== -1 || slug.indexOf('git') !== -1) {
            hasGitTag = true;
            break;
          }
        }
      }
      if (hasGitFlag || hasGitTag) {
        let rawCompared = localStorage.getItem('task2_comparedSoftwareIds');
        let arrCompared = [];
        if (rawCompared) {
          try {
            const parsed = JSON.parse(rawCompared);
            if (Array.isArray(parsed)) arrCompared = parsed;
          } catch (e2) {}
        }
        if (arrCompared.indexOf(tool.id) === -1) {
          arrCompared.push(tool.id);
          localStorage.setItem('task2_comparedSoftwareIds', JSON.stringify(arrCompared));
        }
      }

      // task_3 and task_6: viewed favorite tool ids
      const isFavoritedNow = this._isToolFavorited(tool.id, favorites);
      if (isFavoritedNow) {
        // task_3_viewedFavoriteToolIds
        let rawFavViewed3 = localStorage.getItem('task3_viewedFavoriteToolIds');
        let arrFavViewed3 = [];
        if (rawFavViewed3) {
          try {
            const parsed3 = JSON.parse(rawFavViewed3);
            if (Array.isArray(parsed3)) arrFavViewed3 = parsed3;
          } catch (e2) {}
        }
        if (arrFavViewed3.indexOf(tool.id) === -1) {
          arrFavViewed3.push(tool.id);
          localStorage.setItem('task3_viewedFavoriteToolIds', JSON.stringify(arrFavViewed3));
        }

        // task_6_viewedFavoriteToolIds
        let rawFavViewed6 = localStorage.getItem('task6_viewedFavoriteToolIds');
        let arrFavViewed6 = [];
        if (rawFavViewed6) {
          try {
            const parsed6 = JSON.parse(rawFavViewed6);
            if (Array.isArray(parsed6)) arrFavViewed6 = parsed6;
          } catch (e2) {}
        }
        if (arrFavViewed6.indexOf(tool.id) === -1) {
          arrFavViewed6.push(tool.id);
          localStorage.setItem('task6_viewedFavoriteToolIds', JSON.stringify(arrFavViewed6));
        }
      }
    } catch (e) {
      try { console.error('Instrumentation error:', e); } catch (e2) {}
    }

    // Download options for current version (or version-agnostic)
    const currentVersionId = tool.currentVersionId || null;
    const downloadOptions = downloadOptionsAll.filter(function (opt) {
      if (!opt || opt.softwareId !== tool.id) return false;
      if (!currentVersionId) return true;
      return !opt.versionId || opt.versionId === currentVersionId;
    }).map((opt) => {
      const os = osMap[opt.operatingSystem] || null;
      const version = null; // resolved below if needed
      return {
        id: opt.id,
        softwareId: opt.softwareId,
        software: tool,
        versionId: opt.versionId || null,
        version: version,
        label: opt.label,
        downloadUrl: opt.downloadUrl,
        operatingSystem: opt.operatingSystem,
        operatingSystemDetail: os,
        architecture: opt.architecture || null,
        fileSizeMb: typeof opt.fileSizeMb === 'number' ? opt.fileSizeMb : null,
        licenseType: opt.licenseType || null,
        monthlyPriceUsd: typeof opt.monthlyPriceUsd === 'number' ? opt.monthlyPriceUsd : null,
        isPrimary: !!opt.isPrimary,
        createdAt: opt.createdAt || null
      };
    });

    const hasFullReview = !!tool.hasFullReview;
    const fullReviewArticleId = tool.fullReviewArticleId || null;
    const fullReviewArticle = fullReviewArticleId ? articles.find(function (a) { return a.id === fullReviewArticleId; }) : null;

    let pricingSummary = '';
    if (tool.licenseType === 'free' || tool.isFree) {
      pricingSummary = 'Free';
      if (typeof tool.baseMonthlyPriceUsd === 'number' && tool.baseMonthlyPriceUsd > 0) {
        pricingSummary += ' with optional ' + tool.baseMonthlyPriceUsd + ' USD/month plan';
      }
    } else if (typeof tool.baseMonthlyPriceUsd === 'number') {
      pricingSummary = tool.baseMonthlyPriceUsd + ' USD/month';
    }

    const featureHighlights = [];
    if (tool.gitIntegrationSupported) featureHighlights.push('Git integration supported');
    if (tool.hasTrial) featureHighlights.push('Trial version available');
    if (tool.isVpn) featureHighlights.push('Includes VPN features');

    return {
      id: tool.id,
      name: tool.name,
      slug: tool.slug || null,
      shortDescription: tool.shortDescription || '',
      fullDescription: tool.fullDescription || '',
      primaryCategoryId: tool.primaryCategoryId || null,
      primaryCategoryName: primaryCategory ? primaryCategory.name : null,
      primaryCategory: primaryCategory || null,
      secondaryCategoryIds: secondaryIds,
      secondaryCategoryNames: secondaryCategoryNames,
      secondaryCategories: secondaryCategories,
      supportedOperatingSystems: osIds,
      supportedOperatingSystemDetails: supportedOperatingSystemDetails,
      currentVersionId: currentVersionId,
      currentVersionNumber: tool.currentVersionNumber || null,
      currentVersionNumberSortable: typeof tool.currentVersionNumberSortable === 'number' ? tool.currentVersionNumberSortable : null,
      averageRating: typeof tool.averageRating === 'number' ? tool.averageRating : null,
      ratingCount: typeof tool.ratingCount === 'number' ? tool.ratingCount : 0,
      licenseType: tool.licenseType || null,
      licenseLabel: this._mapLicenseTypeToLabel(tool.licenseType),
      isFree: !!tool.isFree,
      hasTrial: !!tool.hasTrial,
      baseMonthlyPriceUsd: typeof tool.baseMonthlyPriceUsd === 'number' ? tool.baseMonthlyPriceUsd : null,
      minFileSizeMb: typeof tool.minFileSizeMb === 'number' ? tool.minFileSizeMb : null,
      releaseDate: tool.releaseDate || null,
      initialReleaseDate: tool.initialReleaseDate || null,
      isFeatured: !!tool.isFeatured,
      gitIntegrationSupported: !!tool.gitIntegrationSupported,
      isSystemCleanupTool: !!tool.isSystemCleanupTool,
      isVpn: !!tool.isVpn,
      tagIds: tagIds,
      tags: tags,
      isFavorited: this._isToolFavorited(tool.id, favorites),
      downloadOptions: downloadOptions,
      hasFullReview: hasFullReview,
      fullReviewArticleId: fullReviewArticleId,
      fullReviewArticleTitle: fullReviewArticle ? fullReviewArticle.title : null,
      fullReviewArticle: fullReviewArticle || null,
      pricingSummary: pricingSummary,
      featureHighlights: featureHighlights
    };
  }

  // getSoftwareVersionHistory(softwareId)
  getSoftwareVersionHistory(softwareId) {
    const tools = this._getFromStorage('software_tools', []);
    const tool = tools.find(function (t) { return t.id === softwareId; });
    const versionsAll = this._getFromStorage('software_versions', []);
    const downloadOptionsAll = this._getFromStorage('software_download_options', []);

    // Instrumentation for task completion tracking
    try {
      const selectedId = localStorage.getItem('task7_selectedSoftwareId');
      if (selectedId && selectedId === softwareId) {
        localStorage.setItem('task7_versionHistoryViewed', 'true');
      }
    } catch (e) {
      try { console.error('Instrumentation error:', e); } catch (e2) {}
    }

    const versionsRaw = versionsAll.filter(function (v) { return v.softwareId === softwareId; });

    versionsRaw.sort(function (a, b) {
      const sa = typeof a.versionSort === 'number' ? a.versionSort : 0;
      const sb = typeof b.versionSort === 'number' ? b.versionSort : 0;
      if (sb !== sa) return sb - sa;
      const da = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const db = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return db - da;
    });

    const versions = versionsRaw.map((v) => {
      // primary download option for that version
      const optionsForVersion = downloadOptionsAll.filter(function (o) {
        return o.versionId === v.id || (!o.versionId && o.softwareId === v.softwareId);
      });
      let primaryOption = optionsForVersion.find(function (o) { return !!o.isPrimary; });
      if (!primaryOption) primaryOption = optionsForVersion[0] || null;

      return {
        versionId: v.id,
        versionNumber: v.versionNumber,
        versionSort: typeof v.versionSort === 'number' ? v.versionSort : null,
        releaseDate: v.releaseDate || null,
        isCurrent: !!v.isCurrent,
        changeLog: v.changeLog || '',
        notes: v.notes || '',
        fileSizeSummaryMb: typeof v.fileSizeSummaryMb === 'number' ? v.fileSizeSummaryMb : null,
        hasPrimaryDownload: !!primaryOption,
        primaryDownloadLabel: primaryOption ? primaryOption.label : null
      };
    });

    return {
      softwareId: softwareId,
      softwareName: tool ? tool.name : null,
      software: tool || null,
      currentVersionId: tool ? tool.currentVersionId || null : null,
      currentVersionNumber: tool ? tool.currentVersionNumber || null : null,
      versions: versions
    };
  }

  // getSoftwareVersionDetail(versionId)
  getSoftwareVersionDetail(versionId) {
    const versions = this._getFromStorage('software_versions', []);
    const version = versions.find(function (v) { return v.id === versionId; });
    if (!version) {
      return null;
    }

    // Instrumentation for task completion tracking
    try {
      const detail = {
        versionId: version.id,
        softwareId: version.softwareId,
        versionNumber: version.versionNumber
      };
      localStorage.setItem('task7_selectedVersionDetail', JSON.stringify(detail));
    } catch (e) {
      try { console.error('Instrumentation error:', e); } catch (e2) {}
    }

    const tools = this._getFromStorage('software_tools', []);
    const tool = tools.find(function (t) { return t.id === version.softwareId; });
    const catMap = this._getSoftwareCategoriesMap();
    const osMap = this._getOperatingSystemsMap();

    const downloadOptionsAll = this._getFromStorage('software_download_options', []);
    const downloadOptions = downloadOptionsAll.filter(function (o) {
      return o.versionId === versionId || (!o.versionId && o.softwareId === version.softwareId);
    }).map((opt) => {
      const os = osMap[opt.operatingSystem] || null;
      return {
        id: opt.id,
        softwareId: opt.softwareId,
        software: tool || null,
        versionId: opt.versionId,
        version: version,
        label: opt.label,
        downloadUrl: opt.downloadUrl,
        operatingSystem: opt.operatingSystem,
        operatingSystemDetail: os,
        architecture: opt.architecture || null,
        fileSizeMb: typeof opt.fileSizeMb === 'number' ? opt.fileSizeMb : null,
        licenseType: opt.licenseType || null,
        monthlyPriceUsd: typeof opt.monthlyPriceUsd === 'number' ? opt.monthlyPriceUsd : null,
        isPrimary: !!opt.isPrimary,
        createdAt: opt.createdAt || null
      };
    });

    let primaryDownloadOptionId = null;
    const primaryOpt = downloadOptions.find(function (o) { return !!o.isPrimary; }) || downloadOptions[0];
    if (primaryOpt) primaryDownloadOptionId = primaryOpt.id;

    const compatibleOsIds = downloadOptions.map(function (o) { return o.operatingSystem; });
    const uniqueOsIds = Array.from(new Set(compatibleOsIds));
    const compatibleOperatingSystems = uniqueOsIds.map((id) => osMap[id]).filter(function (os) { return !!os; });

    const primaryCategory = tool && tool.primaryCategoryId ? catMap[tool.primaryCategoryId] : null;

    const versionWithSoftware = Object.assign({}, version, {
      software: tool || null
    });

    return {
      version: versionWithSoftware,
      softwareSummary: {
        softwareId: tool ? tool.id : null,
        softwareName: tool ? tool.name : null,
        primaryCategoryId: tool ? tool.primaryCategoryId || null : null,
        primaryCategoryName: primaryCategory ? primaryCategory.name : null,
        primaryCategory: primaryCategory || null
      },
      downloadOptions: downloadOptions,
      primaryDownloadOptionId: primaryDownloadOptionId,
      compatibleOperatingSystems: compatibleOperatingSystems
    };
  }

  // setFavoriteTool(softwareId, isFavorite)
  setFavoriteTool(softwareId, isFavorite) {
    let favorites = this._getFavoritesStore();
    const existsIndex = favorites.findIndex(function (f) { return f.softwareId === softwareId; });

    if (isFavorite) {
      if (existsIndex === -1) {
        favorites.push({
          id: this._generateId('fav'),
          softwareId: softwareId,
          addedAt: new Date().toISOString()
        });
      }
    } else {
      if (existsIndex !== -1) {
        favorites.splice(existsIndex, 1);
      }
    }

    this._saveToStorage('favorite_tools', favorites);

    // Instrumentation for task completion tracking
    try {
      if (isFavorite) {
        // task_2: record favorited software id
        localStorage.setItem('task2_favoritedSoftwareId', softwareId);

        // task_3: record favorited system cleanup software ids
        const tools = this._getFromStorage('software_tools', []);
        const tool = tools.find(function (t) { return t.id === softwareId; });
        if (tool && tool.isSystemCleanupTool) {
          let rawFav = localStorage.getItem('task3_favoritedSoftwareIds');
          let arrFav = [];
          if (rawFav) {
            try {
              const parsed = JSON.parse(rawFav);
              if (Array.isArray(parsed)) arrFav = parsed;
            } catch (e2) {}
          }
          if (arrFav.indexOf(softwareId) === -1) {
            arrFav.push(softwareId);
            localStorage.setItem('task3_favoritedSoftwareIds', JSON.stringify(arrFav));
          }
        }
      }
    } catch (e) {
      try { console.error('Instrumentation error:', e); } catch (e2) {}
    }

    return {
      success: true,
      isFavorite: !!isFavorite,
      totalFavorites: favorites.length,
      message: isFavorite ? 'Added to favorites' : 'Removed from favorites'
    };
  }

  // getFavoriteTools(operatingSystems, categoryId)
  getFavoriteTools(operatingSystems, categoryId) {
    const favorites = this._getFavoritesStore();
    const tools = this._getFromStorage('software_tools', []);
    const osMap = this._getOperatingSystemsMap();
    const catMap = this._getSoftwareCategoriesMap();

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task3_favoritesViewed', 'true');
    } catch (e) {
      try { console.error('Instrumentation error:', e); } catch (e2) {}
    }

    const osFilterSet = Array.isArray(operatingSystems) ? operatingSystems.reduce(function (acc, id) { acc[id] = true; return acc; }, {}) : null;

    const items = [];

    for (const fav of favorites) {
      const tool = tools.find(function (t) { return t.id === fav.softwareId; });
      if (!tool) continue;

      if (categoryId && tool.primaryCategoryId !== categoryId) continue;

      if (osFilterSet) {
        const osIds = Array.isArray(tool.supportedOperatingSystems) ? tool.supportedOperatingSystems : [];
        const hasMatch = osIds.some(function (id) { return !!osFilterSet[id]; });
        if (!hasMatch) continue;
      }

      const primaryCategory = catMap[tool.primaryCategoryId] || null;
      const osIds = Array.isArray(tool.supportedOperatingSystems) ? tool.supportedOperatingSystems : [];

      items.push({
        softwareId: tool.id,
        software: tool,
        name: tool.name,
        shortDescription: tool.shortDescription || '',
        primaryCategoryId: tool.primaryCategoryId || null,
        primaryCategoryName: primaryCategory ? primaryCategory.name : null,
        primaryCategory: primaryCategory || null,
        averageRating: typeof tool.averageRating === 'number' ? tool.averageRating : null,
        licenseType: tool.licenseType || null,
        licenseLabel: this._mapLicenseTypeToLabel(tool.licenseType),
        supportedOperatingSystems: osIds,
        supportedOperatingSystemNames: this._buildSupportedOsNames(osIds, osMap),
        supportedOperatingSystemDetails: this._buildSupportedOsDetails(osIds, osMap),
        currentVersionNumber: tool.currentVersionNumber || null,
        minFileSizeMb: typeof tool.minFileSizeMb === 'number' ? tool.minFileSizeMb : null,
        addedAt: fav.addedAt || null
      });
    }

    return {
      total: items.length,
      items: items
    };
  }

  // getProfilePreferences()
  getProfilePreferences() {
    const prefs = this._getOrCreateProfilePreferences();
    const catMap = this._getSoftwareCategoriesMap();
    const articleCatMap = this._getArticleCategoriesMap();
    const tagsMap = this._getTagsMap();

    const defaultSoftwareCategory = prefs.defaultSoftwareCategoryId ? catMap[prefs.defaultSoftwareCategoryId] || null : null;
    const defaultArticleCategory = prefs.defaultArticleCategoryId ? articleCatMap[prefs.defaultArticleCategoryId] || null : null;
    const preferredContentTags = this._buildTags(Array.isArray(prefs.preferredContentTagIds) ? prefs.preferredContentTagIds : [], tagsMap);

    return {
      id: prefs.id,
      preferredOperatingSystems: Array.isArray(prefs.preferredOperatingSystems) ? prefs.preferredOperatingSystems : [],
      defaultSoftwareCategoryId: prefs.defaultSoftwareCategoryId || null,
      defaultSoftwareCategory: defaultSoftwareCategory,
      defaultArticleCategoryId: prefs.defaultArticleCategoryId || null,
      defaultArticleCategory: defaultArticleCategory,
      defaultSortOrder: prefs.defaultSortOrder || null,
      preferredContentTagIds: Array.isArray(prefs.preferredContentTagIds) ? prefs.preferredContentTagIds : [],
      preferredContentTags: preferredContentTags,
      updatedAt: prefs.updatedAt || null
    };
  }

  // updateProfilePreferences(preferredOperatingSystems, defaultSoftwareCategoryId, defaultArticleCategoryId, defaultSortOrder, preferredContentTagIds)
  updateProfilePreferences(preferredOperatingSystems, defaultSoftwareCategoryId, defaultArticleCategoryId, defaultSortOrder, preferredContentTagIds) {
    const prefs = this._getOrCreateProfilePreferences();

    if (preferredOperatingSystems !== undefined) {
      prefs.preferredOperatingSystems = Array.isArray(preferredOperatingSystems) ? preferredOperatingSystems : [];
    }
    if (defaultSoftwareCategoryId !== undefined) {
      prefs.defaultSoftwareCategoryId = defaultSoftwareCategoryId || null;
    }
    if (defaultArticleCategoryId !== undefined) {
      prefs.defaultArticleCategoryId = defaultArticleCategoryId || null;
    }
    if (defaultSortOrder !== undefined) {
      prefs.defaultSortOrder = defaultSortOrder || null;
    }
    if (preferredContentTagIds !== undefined) {
      prefs.preferredContentTagIds = Array.isArray(preferredContentTagIds) ? preferredContentTagIds : [];
    }

    prefs.updatedAt = new Date().toISOString();
    this._saveToStorage('profile_preferences', prefs);

    return this.getProfilePreferences();
  }

  // createAccount(username, email, password)
  createAccount(username, email, password) {
    const users = this._getFromStorage('users', []);

    if (!username || !email || !password) {
      return { success: false, username: null, message: 'Username, email, and password are required.' };
    }
    if (password.length < 8) {
      return { success: false, username: null, message: 'Password must be at least 8 characters.' };
    }

    const existing = users.find(function (u) { return u.username === username; });
    if (existing) {
      return { success: false, username: null, message: 'Username already exists.' };
    }

    const user = {
      id: this._generateId('user'),
      username: username,
      email: email,
      password: password,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    this._saveToStorage('users', users);

    const authState = { isLoggedIn: true, username: username };
    this._setAuthState(authState);

    return { success: true, username: username, message: 'Account created successfully.' };
  }

  // loginAccount(username, password)
  loginAccount(username, password) {
    const users = this._getFromStorage('users', []);

    const user = users.find(function (u) { return u.username === username; });
    if (!user || user.password !== password) {
      return { success: false, username: null, message: 'Invalid username or password.' };
    }

    const authState = { isLoggedIn: true, username: username };
    this._setAuthState(authState);

    return { success: true, username: username, message: 'Logged in successfully.' };
  }

  // getAuthStatus()
  getAuthStatus() {
    const state = this._getAuthState();
    return {
      isLoggedIn: !!state.isLoggedIn,
      username: state.username || null
    };
  }

  // getArticleCategories()
  getArticleCategories() {
    const cats = this._getFromStorage('article_categories', []);
    return Array.isArray(cats) ? cats : [];
  }

  // searchArticles(query, categoryId, sortOrder, page, pageSize)
  searchArticles(query, categoryId, sortOrder, page, pageSize) {
    const articles = this._getFromStorage('articles', []);
    const catMap = this._getArticleCategoriesMap();
    const tagsMap = this._getTagsMap();

    // Instrumentation for task completion tracking
    try {
      if (categoryId != null && sortOrder === 'newest_first') {
        const filters = {
          query,
          categoryId,
          sortOrder,
          page,
          pageSize
        };
        localStorage.setItem('task5_articleSearchFilters', JSON.stringify(filters));
      }
    } catch (e) {
      try { console.error('Instrumentation error:', e); } catch (e2) {}
    }

    const normalizedQuery = query ? String(query).toLowerCase() : null;

    const filtered = articles.filter(function (a) {
      if (!a) return false;
      if (categoryId && a.categoryId !== categoryId) return false;
      if (normalizedQuery) {
        const text = ((a.title || '') + ' ' + (a.excerpt || '') + ' ' + (a.content || '')).toLowerCase();
        if (text.indexOf(normalizedQuery) === -1) return false;
      }
      return true;
    });

    const order = sortOrder || 'newest_first';
    filtered.sort((a, b) => {
      if (order === 'oldest_first') {
        return this._compareByDateAsc(a, b, 'publishDate');
      }
      if (order === 'most_popular') {
        const ca = typeof a.commentCount === 'number' ? a.commentCount : 0;
        const cb = typeof b.commentCount === 'number' ? b.commentCount : 0;
        if (cb !== ca) return cb - ca;
        const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
        const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
        if (rb !== ra) return rb - ra;
        return this._compareByDateDesc(a, b, 'publishDate');
      }
      // default newest_first
      return this._compareByDateDesc(a, b, 'publishDate');
    });

    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const slice = filtered.slice(start, end);

    const results = slice.map((a) => {
      const cat = catMap[a.categoryId] || null;
      const tagIds = Array.isArray(a.tagIds) ? a.tagIds : [];
      return {
        id: a.id,
        title: a.title,
        slug: a.slug || null,
        excerpt: a.excerpt || '',
        categoryId: a.categoryId || null,
        categoryName: cat ? cat.name : null,
        category: cat || null,
        publishDate: a.publishDate || null,
        isReview: !!a.isReview,
        tagIds: tagIds,
        tagNames: this._buildTagNames(tagIds, tagsMap),
        tags: this._buildTags(tagIds, tagsMap),
        commentCount: typeof a.commentCount === 'number' ? a.commentCount : 0,
        averageRating: typeof a.averageRating === 'number' ? a.averageRating : null
      };
    });

    return {
      total: filtered.length,
      page: pageNum,
      pageSize: size,
      results: results
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(function (a) { return a.id === articleId; });
    if (!article) {
      return null;
    }

    const catMap = this._getArticleCategoriesMap();
    const tagsMap = this._getTagsMap();
    const tools = this._getFromStorage('software_tools', []);

    const category = catMap[article.categoryId] || null;
    const tagIds = Array.isArray(article.tagIds) ? article.tagIds : [];
    const tags = this._buildTags(tagIds, tagsMap);

    const relatedSoftware = article.relatedSoftwareId ? tools.find(function (t) { return t.id === article.relatedSoftwareId; }) : null;
    const primaryDownloadSoftware = article.primaryDownloadSoftwareId ? tools.find(function (t) { return t.id === article.primaryDownloadSoftwareId; }) : null;

    const breadcrumbCategoryId = article.breadcrumbCategoryId || article.categoryId || null;
    const breadcrumbCategory = breadcrumbCategoryId ? catMap[breadcrumbCategoryId] || null : null;

    // Build newsletterConfig dynamically if embedded form is enabled
    let newsletterConfig = null;
    if (article.hasEmbeddedNewsletterForm) {
      const availableTopicsValues = [
        'security',
        'productivity',
        'graphics_photo',
        'system_tools',
        'backup_sync',
        'security_vpn',
        'developer_tools',
        'code_editor',
        'utilities',
        'general'
      ];
      const availableTopics = availableTopicsValues.map((value) => {
        let label = value.replace(/_/g, ' ');
        label = label.charAt(0).toUpperCase() + label.slice(1);
        const selectedByDefault = (value === 'security' && article.categoryId === 'security') || (value === 'productivity' && article.categoryId === 'productivity');
        return { value: value, label: label, selectedByDefault: selectedByDefault };
      });

      const frequencyOptions = [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' }
      ];

      newsletterConfig = {
        availableTopics: availableTopics,
        frequencyOptions: frequencyOptions,
        defaultFrequency: 'weekly'
      };
    }

    // Instrumentation for task completion tracking
    try {
      // task_5: selected article id whenever an article is successfully retrieved
      localStorage.setItem('task5_selectedArticleId', articleId);

      // task_4: opened full review article for a VPN tool
      const hasMatchingVpn = tools.some(function (t) {
        return t && t.isVpn && t.fullReviewArticleId === article.id;
      });
      if (hasMatchingVpn) {
        localStorage.setItem('task4_openedFullReviewArticleId', articleId);
      }
    } catch (e) {
      try { console.error('Instrumentation error:', e); } catch (e2) {}
    }

    return {
      id: article.id,
      title: article.title,
      slug: article.slug || null,
      content: article.content || '',
      categoryId: article.categoryId || null,
      categoryName: category ? category.name : null,
      category: category || null,
      tagIds: tagIds,
      tags: tags,
      publishDate: article.publishDate || null,
      isReview: !!article.isReview,
      relatedSoftwareId: article.relatedSoftwareId || null,
      relatedSoftwareName: relatedSoftware ? relatedSoftware.name : null,
      relatedSoftware: relatedSoftware || null,
      primaryDownloadLabel: article.primaryDownloadLabel || null,
      primaryDownloadUrl: article.primaryDownloadUrl || null,
      primaryDownloadSoftwareId: article.primaryDownloadSoftwareId || null,
      primaryDownloadSoftware: primaryDownloadSoftware || null,
      hasEmbeddedNewsletterForm: !!article.hasEmbeddedNewsletterForm,
      newsletterConfig: newsletterConfig,
      commentsEnabled: !!article.commentsEnabled,
      commentCount: typeof article.commentCount === 'number' ? article.commentCount : 0,
      averageRating: typeof article.averageRating === 'number' ? article.averageRating : null,
      breadcrumbCategoryId: breadcrumbCategoryId,
      breadcrumbCategoryName: breadcrumbCategory ? breadcrumbCategory.name : null,
      breadcrumbCategory: breadcrumbCategory || null
    };
  }

  // getArticleComments(articleId, page, pageSize)
  getArticleComments(articleId, page, pageSize) {
    const comments = this._getFromStorage('comments', []);
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(function (a) { return a.id === articleId; }) || null;

    const filtered = comments.filter(function (c) { return c.articleId === articleId; });
    filtered.sort((a, b) => this._compareByDateAsc(a, b, 'createdAt'));

    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const slice = filtered.slice(start, end);

    const enrichedComments = slice.map((c) => ({
      id: c.id,
      articleId: c.articleId,
      article: article,
      authorName: c.authorName,
      authorEmail: c.authorEmail,
      body: c.body,
      rating: c.rating || null,
      createdAt: c.createdAt || null,
      isApproved: !!c.isApproved
    }));

    return {
      total: filtered.length,
      page: pageNum,
      pageSize: size,
      comments: enrichedComments
    };
  }

  // submitArticleComment(articleId, authorName, authorEmail, body, rating)
  submitArticleComment(articleId, authorName, authorEmail, body, rating) {
    if (!articleId || !authorName || !authorEmail || !body) {
      return {
        success: false,
        commentId: null,
        requiresApproval: false,
        message: 'articleId, authorName, authorEmail, and body are required.'
      };
    }

    const comments = this._getFromStorage('comments', []);
    const newComment = {
      id: this._generateId('cmt'),
      articleId: articleId,
      authorName: authorName,
      authorEmail: authorEmail,
      body: body,
      rating: rating ? String(rating) : null,
      createdAt: new Date().toISOString(),
      isApproved: false
    };

    comments.push(newComment);
    this._saveToStorage('comments', comments);

    // Optionally, update article commentCount/averageRating lazily elsewhere

    return {
      success: true,
      commentId: newComment.id,
      requiresApproval: true,
      message: 'Comment submitted and pending approval.'
    };
  }

  // submitNewsletterSubscription(articleId, email, topics, frequency)
  submitNewsletterSubscription(articleId, email, topics, frequency) {
    if (!articleId || !email) {
      return { success: false, subscriptionId: null, message: 'articleId and email are required.' };
    }

    const subs = this._getFromStorage('newsletter_subscriptions', []);

    const subscription = {
      id: this._generateId('sub'),
      email: email,
      topics: Array.isArray(topics) ? topics : [],
      frequency: frequency || 'weekly',
      source: 'article_embedded_form',
      sourceArticleId: articleId,
      subscribedAt: new Date().toISOString(),
      confirmed: false
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscriptionId: subscription.id,
      message: 'Subscription submitted.'
    };
  }

  // getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const raw = localStorage.getItem('static_pages');
    let pages = {};
    if (raw) {
      try {
        pages = JSON.parse(raw) || {};
      } catch (e) {
        pages = {};
      }
    }
    const page = pages[pageSlug] || null;
    if (!page) {
      return {
        pageSlug: pageSlug,
        title: '',
        content: '',
        lastUpdated: null
      };
    }
    return {
      pageSlug: pageSlug,
      title: page.title || '',
      content: page.content || '',
      lastUpdated: page.lastUpdated || null
    };
  }

  // getContactInfo()
  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    let info = {};
    if (raw) {
      try {
        info = JSON.parse(raw) || {};
      } catch (e) {
        info = {};
      }
    }

    return {
      contactEmail: info.contactEmail || '',
      additionalChannels: Array.isArray(info.additionalChannels) ? info.additionalChannels : [],
      contactFormEnabled: info.contactFormEnabled !== undefined ? !!info.contactFormEnabled : false,
      subjectOptions: Array.isArray(info.subjectOptions) ? info.subjectOptions : []
    };
  }

  // submitContactMessage(name, email, subject, topic, message)
  submitContactMessage(name, email, subject, topic, message) {
    if (!name || !email || !message) {
      return {
        success: false,
        ticketId: null,
        message: 'Name, email, and message are required.'
      };
    }

    const messages = this._getFromStorage('contact_messages', []);
    const ticketId = this._generateId('ticket');
    const record = {
      id: ticketId,
      name: name,
      email: email,
      subject: subject || null,
      topic: topic || null,
      message: message,
      createdAt: new Date().toISOString(),
      status: 'open'
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      ticketId: ticketId,
      message: 'Message submitted.'
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