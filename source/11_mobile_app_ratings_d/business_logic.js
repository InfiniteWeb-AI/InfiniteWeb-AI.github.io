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

  // -------------------- Initialization & Storage Helpers --------------------

  _initStorage() {
    // Core entity tables
    if (!localStorage.getItem('apps')) {
      localStorage.setItem('apps', JSON.stringify([]));
    }

    // Categories: initialize from enum definition (not mock app data)
    if (!localStorage.getItem('categories')) {
      const categories = [
        { id: 'health_fitness', name: 'Health & Fitness', description: 'Health & Fitness apps', sort_order: 1 },
        { id: 'productivity', name: 'Productivity', description: 'Productivity apps', sort_order: 2 },
        { id: 'finance', name: 'Finance', description: 'Finance apps', sort_order: 3 },
        { id: 'education', name: 'Education', description: 'Education apps', sort_order: 4 }
      ];
      localStorage.setItem('categories', JSON.stringify(categories));
    }

    if (!localStorage.getItem('favorites')) {
      localStorage.setItem('favorites', JSON.stringify([]));
    }
    if (!localStorage.getItem('collections')) {
      localStorage.setItem('collections', JSON.stringify([]));
    }
    if (!localStorage.getItem('collection_items')) {
      localStorage.setItem('collection_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('reviews')) {
      localStorage.setItem('reviews', JSON.stringify([]));
    }
    if (!localStorage.getItem('comparison_sets')) {
      localStorage.setItem('comparison_sets', JSON.stringify([]));
    }
    if (!localStorage.getItem('comparison_items')) {
      localStorage.setItem('comparison_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('contact_messages')) {
      localStorage.setItem('contact_messages', JSON.stringify([]));
    }

    // Singleton-style storages are created lazily by their helpers
    // account_profiles, notification_settings, about_content,
    // contact_page_content, help_faq_content, legal_documents, home_overview

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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // -------------------- Private Helpers (per spec) --------------------

  _getOrCreateFavoritesStore() {
    let favoritesStr = localStorage.getItem('favorites');
    if (!favoritesStr) {
      this._saveToStorage('favorites', []);
      favoritesStr = localStorage.getItem('favorites');
    }
    return this._getFromStorage('favorites');
  }

  _getOrCreateCollectionsStore() {
    let collectionsStr = localStorage.getItem('collections');
    if (!collectionsStr) {
      this._saveToStorage('collections', []);
    }
    let itemsStr = localStorage.getItem('collection_items');
    if (!itemsStr) {
      this._saveToStorage('collection_items', []);
    }
    return {
      collections: this._getFromStorage('collections'),
      collection_items: this._getFromStorage('collection_items')
    };
  }

  _getOrCreateComparisonSet() {
    let comparisonSets = this._getFromStorage('comparison_sets');
    let active = comparisonSets.find(s => s.is_active);
    const now = new Date().toISOString();
    if (!active) {
      active = {
        id: this._generateId('cmp_set'),
        created_at: now,
        is_active: true
      };
      // Deactivate all others just in case
      comparisonSets = comparisonSets.map(s => ({ ...s, is_active: false }));
      comparisonSets.push(active);
      this._saveToStorage('comparison_sets', comparisonSets);
    }
    return active;
  }

  _getOrCreateAccountProfile() {
    const existingStr = localStorage.getItem('account_profiles');
    if (existingStr) {
      return JSON.parse(existingStr);
    }
    const now = new Date().toISOString();
    const profile = {
      id: this._generateId('acct'),
      username: '',
      email: '',
      password: '',
      created_at: now,
      updated_at: now
    };
    localStorage.setItem('account_profiles', JSON.stringify(profile));
    return profile;
  }

  _getOrCreateNotificationSettings() {
    const existingStr = localStorage.getItem('notification_settings');
    if (existingStr) {
      try {
        const parsed = JSON.parse(existingStr);
        // Handle both array-based (seeded test data) and object-based storage formats
        if (Array.isArray(parsed)) {
          const first = parsed[0] || null;
          if (first && typeof first === 'object') {
            // Normalize to single-object format for future calls
            localStorage.setItem('notification_settings', JSON.stringify(first));
            return first;
          }
        } else if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        // Fall through to create fresh default settings
      }
    }
    const now = new Date().toISOString();
    const settings = {
      id: this._generateId('notif'),
      selected_categories: [],
      min_rating: 0,
      notification_frequency: 'off',
      last_updated: now
    };
    localStorage.setItem('notification_settings', JSON.stringify(settings));
    return settings;
  }

  _applyAppFilters(apps, filters, sort) {
    let result = Array.isArray(apps) ? apps.slice() : [];
    const f = filters || {};

    // Platform filtering with hierarchical logic (cross_platform supports android & ios)
    if (f.platform_types && Array.isArray(f.platform_types) && f.platform_types.length > 0) {
      const requested = new Set(f.platform_types);
      result = result.filter(app => {
        if (!app || !app.platform_type) return false;
        let supported = [];
        if (app.platform_type === 'android') supported = ['android'];
        else if (app.platform_type === 'ios') supported = ['ios'];
        else if (app.platform_type === 'cross_platform') supported = ['android', 'ios'];
        return supported.some(p => requested.has(p) || requested.has('cross_platform'));
      });
    }

    if (typeof f.is_free === 'boolean') {
      result = result.filter(app => !!app.is_free === f.is_free);
    }

    if (typeof f.price_min === 'number') {
      result = result.filter(app => typeof app.price === 'number' && app.price >= f.price_min);
    }

    if (typeof f.price_max === 'number') {
      result = result.filter(app => typeof app.price === 'number' && app.price <= f.price_max);
    }

    if (typeof f.rating_min === 'number') {
      result = result.filter(app => typeof app.average_rating === 'number' && app.average_rating >= f.rating_min);
    }

    if (typeof f.rating_max === 'number') {
      result = result.filter(app => typeof app.average_rating === 'number' && app.average_rating <= f.rating_max);
    }

    if (typeof f.review_count_min === 'number') {
      result = result.filter(app => typeof app.review_count === 'number' && app.review_count >= f.review_count_min);
    }

    if (f.tags && Array.isArray(f.tags) && f.tags.length > 0) {
      result = result.filter(app => {
        if (!Array.isArray(app.tags)) return false;
        const tagSet = new Set(app.tags);
        return f.tags.every(t => tagSet.has(t));
      });
    }

    if (f.features && Array.isArray(f.features) && f.features.length > 0) {
      result = result.filter(app => {
        if (!Array.isArray(app.features)) return false;
        const featSet = new Set(app.features);
        return f.features.every(t => featSet.has(t));
      });
    }

    if (typeof f.audience === 'string' && f.audience) {
      result = result.filter(app => {
        if (!app.audience) return false;
        if (f.audience === 'kids') {
          // Kids-filter shows kids-specific plus all_ages
          return app.audience === 'kids' || app.audience === 'all_ages';
        }
        return app.audience === f.audience;
      });
    }

    if (typeof f.min_age === 'number' && typeof f.max_age === 'number') {
      const minF = f.min_age;
      const maxF = f.max_age;
      result = result.filter(app => {
        if (typeof app.min_age !== 'number' || typeof app.max_age !== 'number') return false;
        // Overlap between [min_age, max_age]
        return app.min_age <= maxF && app.max_age >= minF;
      });
    }

    if (f.content_languages && Array.isArray(f.content_languages) && f.content_languages.length > 0) {
      result = result.filter(app => {
        if (!Array.isArray(app.content_languages)) return false;
        const langSet = new Set(app.content_languages);
        return f.content_languages.every(l => langSet.has(l));
      });
    }

    if (typeof f.release_date_from === 'string') {
      const fromTime = Date.parse(f.release_date_from);
      if (!Number.isNaN(fromTime)) {
        result = result.filter(app => {
          const t = Date.parse(app.release_date);
          return !Number.isNaN(t) && t >= fromTime;
        });
      }
    }

    if (typeof f.release_date_to === 'string') {
      const toTime = Date.parse(f.release_date_to);
      if (!Number.isNaN(toTime)) {
        result = result.filter(app => {
          const t = Date.parse(app.release_date);
          return !Number.isNaN(t) && t <= toTime;
        });
      }
    }

    // Sorting
    const sortKey = sort || '';
    const compareNumber = (a, b) => (a === b ? 0 : a < b ? -1 : 1);

    result.sort((a, b) => {
      if (!a || !b) return 0;
      switch (sortKey) {
        case 'rating_desc':
          return compareNumber(b.average_rating || 0, a.average_rating || 0);
        case 'rating_asc':
          return compareNumber(a.average_rating || 0, b.average_rating || 0);
        case 'price_asc':
          return compareNumber(a.price || 0, b.price || 0);
        case 'price_desc':
          return compareNumber(b.price || 0, a.price || 0);
        case 'review_count_desc':
          return compareNumber(b.review_count || 0, a.review_count || 0);
        case 'review_count_asc':
          return compareNumber(a.review_count || 0, b.review_count || 0);
        case 'release_date_desc': {
          const ta = Date.parse(a.release_date);
          const tb = Date.parse(b.release_date);
          return compareNumber(tb || 0, ta || 0);
        }
        case 'release_date_asc': {
          const ta2 = Date.parse(a.release_date);
          const tb2 = Date.parse(b.release_date);
          return compareNumber(ta2 || 0, tb2 || 0);
        }
        default:
          return 0;
      }
    });

    return result;
  }

  // -------------------- Core Interface Implementations --------------------

  // getHomeOverview()
  getHomeOverview() {
    const categories = this._getFromStorage('categories');
    const apps = this._getFromStorage('apps');

    let homeOverviewStr = localStorage.getItem('home_overview');
    let curated_lists = [];
    if (homeOverviewStr) {
      try {
        const parsed = JSON.parse(homeOverviewStr);
        if (parsed && Array.isArray(parsed.curated_lists)) {
          curated_lists = parsed.curated_lists.map(list => {
            const appIds = Array.isArray(list.appIds) ? list.appIds : [];
            const listApps = appIds
              .map(id => apps.find(a => a.id === id))
              .filter(a => !!a);
            return {
              id: list.id,
              title: list.title,
              description: list.description,
              apps: listApps
            };
          });
        }
      } catch (e) {
        curated_lists = [];
      }
    } else {
      // Initialize empty home_overview structure
      const empty = { curated_lists: [] };
      localStorage.setItem('home_overview', JSON.stringify(empty));
    }

    return { categories, curated_lists };
  }

  // getCategoriesForNav()
  getCategoriesForNav() {
    return this._getFromStorage('categories');
  }

  // getAppFilterOptions(categoryId, q)
  getAppFilterOptions(categoryId, q) {
    const appsAll = this._getFromStorage('apps');
    let apps = appsAll.slice();

    if (categoryId) {
      apps = apps.filter(a => a.category === categoryId);
    }

    if (q && typeof q === 'string') {
      const qLower = q.toLowerCase();
      apps = apps.filter(app => {
        const name = (app.name || '').toLowerCase();
        const desc = (app.description || '').toLowerCase();
        const tagsJoined = Array.isArray(app.tags) ? app.tags.join(' ').toLowerCase() : '';
        return name.includes(qLower) || desc.includes(qLower) || tagsJoined.includes(qLower);
      });
    }

    let minPrice = null;
    let maxPrice = null;
    let hasFree = false;
    apps.forEach(a => {
      if (typeof a.price === 'number') {
        if (minPrice === null || a.price < minPrice) minPrice = a.price;
        if (maxPrice === null || a.price > maxPrice) maxPrice = a.price;
      }
      if (a.is_free) hasFree = true;
    });

    // Collect dynamic tags and features from existing apps
    const tagSet = new Set();
    const featureSet = new Set();
    const langSet = new Set();

    apps.forEach(a => {
      if (Array.isArray(a.tags)) {
        a.tags.forEach(t => tagSet.add(t));
      }
      if (Array.isArray(a.features)) {
        a.features.forEach(f => featureSet.add(f));
      }
      if (Array.isArray(a.content_languages)) {
        a.content_languages.forEach(l => langSet.add(l));
      }
    });

    const defaultTagOptions = [
      { value: 'meditation', label: 'Meditation' },
      { value: 'photo_editor', label: 'Photo editor' },
      { value: 'to_do_list', label: 'To-do list' },
      { value: 'math', label: 'Math' },
      { value: 'budgeting', label: 'Budgeting' },
      { value: 'spanish_learning', label: 'Spanish learning' },
      { value: 'habit_tracker', label: 'Habit tracker' }
    ];

    const tags = [];
    const seenTagValues = new Set();
    defaultTagOptions.forEach(t => {
      tags.push(t);
      seenTagValues.add(t.value);
    });
    tagSet.forEach(t => {
      if (!seenTagValues.has(t)) {
        tags.push({ value: t, label: t.replace(/_/g, ' ') });
      }
    });

    const defaultFeatureOptions = [
      { value: 'offline', label: 'Offline' },
      { value: 'no_ads', label: 'No ads' },
      { value: 'dark_mode', label: 'Dark mode' }
    ];

    const features = [];
    const seenFeatures = new Set();
    defaultFeatureOptions.forEach(f => {
      features.push(f);
      seenFeatures.add(f.value);
    });
    featureSet.forEach(f => {
      if (!seenFeatures.has(f)) {
        features.push({ value: f, label: f.replace(/_/g, ' ') });
      }
    });

    const audiences = [
      { value: 'kids', label: 'Kids' },
      { value: 'teens', label: 'Teens' },
      { value: 'adults', label: 'Adults' },
      { value: 'all_ages', label: 'All ages' }
    ];

    const age_ranges = [
      { min_age: 3, max_age: 5, label: '3-5 years' },
      { min_age: 6, max_age: 8, label: '6-8 years' },
      { min_age: 9, max_age: 12, label: '9-12 years' }
    ];

    const content_languages = Array.from(langSet).map(l => ({
      value: l,
      label: l.charAt(0).toUpperCase() + l.slice(1)
    }));

    const platform_types = [
      { value: 'android', label: 'Android' },
      { value: 'ios', label: 'iOS' },
      { value: 'cross_platform', label: 'Android & iOS' }
    ];

    const rating_thresholds = [
      { min_rating: 4.0, max_rating: null, label: '4.0 stars & up' },
      { min_rating: 4.3, max_rating: null, label: '4.3 stars & up' },
      { min_rating: 4.4, max_rating: null, label: '4.4 stars & up' },
      { min_rating: 4.5, max_rating: null, label: '4.5 stars & up' },
      { min_rating: 4.0, max_rating: 4.5, label: '4.0–4.5 stars' }
    ];

    const review_count_options = [
      { min_review_count: 500, label: '500+ reviews' },
      { min_review_count: 1000, label: '1,000+ reviews' },
      { min_review_count: 10000, label: '10,000+ reviews' }
    ];

    const release_date_presets = [
      { preset_key: 'last_12_months', label: 'Last 12 months' },
      { preset_key: 'past_year', label: 'Past year' },
      { preset_key: 'last_30_days', label: 'Last 30 days' }
    ];

    const sort_options = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'rating_asc', label: 'Rating: Low to High' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'review_count_desc', label: 'Most Reviewed' },
      { value: 'review_count_asc', label: 'Least Reviewed' },
      { value: 'release_date_desc', label: 'Newest first' },
      { value: 'release_date_asc', label: 'Oldest first' }
    ];

    return {
      platform_types,
      price: {
        min_price: minPrice === null ? 0 : minPrice,
        max_price: maxPrice === null ? 0 : maxPrice,
        has_free_option: hasFree
      },
      rating_thresholds,
      review_count_options,
      tags,
      features,
      audiences,
      age_ranges,
      content_languages,
      release_date_presets,
      sort_options
    };
  }

  // searchApps(categoryId, q, filters, sort, page, page_size)
  searchApps(categoryId, q, filters, sort, page, page_size) {
    const appsAll = this._getFromStorage('apps');
    let apps = appsAll.slice();

    if (categoryId) {
      apps = apps.filter(a => a.category === categoryId);
    }

    if (q && typeof q === 'string') {
      const qLower = q.toLowerCase();
      apps = apps.filter(app => {
        const name = (app.name || '').toLowerCase();
        const desc = (app.description || '').toLowerCase();
        const tagsJoined = Array.isArray(app.tags) ? app.tags.join(' ').toLowerCase() : '';
        return name.includes(qLower) || desc.includes(qLower) || tagsJoined.includes(qLower);
      });
    }

    const normalizedFilters = filters || {};
    const filteredSortedApps = this._applyAppFilters(apps, normalizedFilters, sort);

    const total_count = filteredSortedApps.length;
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageApps = filteredSortedApps.slice(start, end);

    const categories = this._getFromStorage('categories');
    const category = categoryId ? categories.find(c => c.id === categoryId) || null : null;

    const applied_filters = {
      platform_types: normalizedFilters.platform_types || [],
      is_free: typeof normalizedFilters.is_free === 'boolean' ? normalizedFilters.is_free : undefined,
      price_min: typeof normalizedFilters.price_min === 'number' ? normalizedFilters.price_min : undefined,
      price_max: typeof normalizedFilters.price_max === 'number' ? normalizedFilters.price_max : undefined,
      rating_min: typeof normalizedFilters.rating_min === 'number' ? normalizedFilters.rating_min : undefined,
      rating_max: typeof normalizedFilters.rating_max === 'number' ? normalizedFilters.rating_max : undefined,
      review_count_min: typeof normalizedFilters.review_count_min === 'number' ? normalizedFilters.review_count_min : undefined,
      tags: normalizedFilters.tags || [],
      features: normalizedFilters.features || [],
      audience: normalizedFilters.audience || undefined,
      min_age: typeof normalizedFilters.min_age === 'number' ? normalizedFilters.min_age : undefined,
      max_age: typeof normalizedFilters.max_age === 'number' ? normalizedFilters.max_age : undefined,
      content_languages: normalizedFilters.content_languages || [],
      release_date_from: normalizedFilters.release_date_from || undefined,
      release_date_to: normalizedFilters.release_date_to || undefined
    };

    return {
      apps: pageApps,
      total_count,
      page: currentPage,
      page_size: size,
      category,
      applied_filters,
      sort: sort || ''
    };
  }

  // getAppDetail(appId)
  getAppDetail(appId) {
    const apps = this._getFromStorage('apps');
    const app = apps.find(a => a.id === appId);
    if (!app) {
      return null;
    }

    const categories = this._getFromStorage('categories');
    const category = categories.find(c => c.id === app.category) || null;

    const favorites = this._getFromStorage('favorites');
    const is_favorited = favorites.some(f => f.appId === appId);

    const collections = this._getFromStorage('collections');
    const collection_items = this._getFromStorage('collection_items');

    const containingItems = collection_items.filter(ci => ci.appId === appId);
    const collectionIds = Array.from(new Set(containingItems.map(ci => ci.collectionId)));
    const collections_containing = collections.filter(c => collectionIds.includes(c.id));

    const reviews = this._getFromStorage('reviews').filter(r => r.appId === appId);
    const breakdown = { star_5: 0, star_4: 0, star_3: 0, star_2: 0, star_1: 0 };
    reviews.forEach(r => {
      const rating = Math.round(r.rating || 0);
      if (rating === 5) breakdown.star_5 += 1;
      else if (rating === 4) breakdown.star_4 += 1;
      else if (rating === 3) breakdown.star_3 += 1;
      else if (rating === 2) breakdown.star_2 += 1;
      else if (rating === 1) breakdown.star_1 += 1;
    });

    const rating_breakdown = breakdown;
    const review_count = app.review_count;

    return {
      app,
      category,
      is_favorited,
      collections_containing,
      rating_breakdown,
      review_count
    };
  }

  // getAppReviews(appId, sort = 'newest', page = 1, page_size = 20)
  getAppReviews(appId, sort, page, page_size) {
    const sortKey = sort || 'newest';
    const allReviews = this._getFromStorage('reviews').filter(r => r.appId === appId);

    const compareNumber = (a, b) => (a === b ? 0 : a < b ? -1 : 1);

    allReviews.sort((a, b) => {
      switch (sortKey) {
        case 'highest_rating':
          return compareNumber(b.rating || 0, a.rating || 0);
        case 'lowest_rating':
          return compareNumber(a.rating || 0, b.rating || 0);
        case 'most_helpful':
          return compareNumber(b.helpful_count || 0, a.helpful_count || 0);
        case 'newest':
        default: {
          const ta = Date.parse(a.created_at);
          const tb = Date.parse(b.created_at);
          return compareNumber(tb || 0, ta || 0);
        }
      }
    });

    const total_count = allReviews.length;
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const apps = this._getFromStorage('apps');
    const app = apps.find(a => a.id === appId) || null;

    const pagedReviews = allReviews.slice(start, end).map(r => ({
      ...r,
      // Foreign key resolution: include app object
      app
    }));

    return {
      reviews: pagedReviews,
      total_count,
      page: currentPage,
      page_size: size
    };
  }

  // createReview(appId, rating, title, body)
  createReview(appId, rating, title, body) {
    const apps = this._getFromStorage('apps');
    const appIndex = apps.findIndex(a => a.id === appId);
    if (appIndex === -1) {
      return { success: false, review: null, updated_app: null, message: 'App not found' };
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return { success: false, review: null, updated_app: null, message: 'Rating must be between 1 and 5' };
    }

    if (!title || typeof title !== 'string') {
      return { success: false, review: null, updated_app: null, message: 'Title is required' };
    }

    if (!body || typeof body !== 'string') {
      return { success: false, review: null, updated_app: null, message: 'Body is required' };
    }

    const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 10) {
      return { success: false, review: null, updated_app: null, message: 'Review body must contain at least 10 words' };
    }

    const reviews = this._getFromStorage('reviews');
    const now = new Date().toISOString();

    const review = {
      id: this._generateId('rev'),
      appId,
      rating,
      title,
      body,
      created_at: now,
      is_edited: false,
      helpful_count: 0,
      author_name: ''
    };

    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    // Recalculate app average_rating and review_count
    const appReviews = reviews.filter(r => r.appId === appId);
    const total = appReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const count = appReviews.length;
    const avg = count > 0 ? total / count : 0;

    const app = { ...apps[appIndex] };
    app.average_rating = avg;
    app.review_count = count;
    apps[appIndex] = app;
    this._saveToStorage('apps', apps);

    return {
      success: true,
      review,
      updated_app: app,
      message: 'Review created'
    };
  }

  // addAppToFavorites(appId)
  addAppToFavorites(appId) {
    const apps = this._getFromStorage('apps');
    const app = apps.find(a => a.id === appId);
    if (!app) {
      return { success: false, favorite: null, favorites_count: 0, message: 'App not found' };
    }

    const favorites = this._getOrCreateFavoritesStore();
    const existing = favorites.find(f => f.appId === appId);
    if (existing) {
      return {
        success: true,
        favorite: existing,
        favorites_count: favorites.length,
        message: 'Already in favorites'
      };
    }

    const now = new Date().toISOString();
    const favorite = {
      id: this._generateId('fav'),
      appId,
      favorited_at: now
    };

    favorites.push(favorite);
    this._saveToStorage('favorites', favorites);

    return {
      success: true,
      favorite,
      favorites_count: favorites.length,
      message: 'Added to favorites'
    };
  }

  // removeAppFromFavorites(appId)
  removeAppFromFavorites(appId) {
    const favorites = this._getFromStorage('favorites');
    const before = favorites.length;
    const remaining = favorites.filter(f => f.appId !== appId);
    this._saveToStorage('favorites', remaining);

    const removed = before !== remaining.length;
    return {
      success: removed,
      favorites_count: remaining.length,
      message: removed ? 'Removed from favorites' : 'Favorite not found'
    };
  }

  // getFavoriteApps()
  getFavoriteApps() {
    const favorites = this._getFromStorage('favorites');
    const apps = this._getFromStorage('apps');
    const categories = this._getFromStorage('categories');

    return favorites.map(fav => {
      const app = apps.find(a => a.id === fav.appId) || null;
      const category = app ? categories.find(c => c.id === app.category) || null : null;
      return {
        favorite: fav,
        app,
        category
      };
    });
  }

  // getCollectionsOverview()
  getCollectionsOverview() {
    return this._getFromStorage('collections');
  }

  // createCollection(name, description)
  createCollection(name, description) {
    if (!name || typeof name !== 'string') {
      throw new Error('Collection name is required');
    }
    const { collections } = this._getOrCreateCollectionsStore();
    const now = new Date().toISOString();

    const collection = {
      id: this._generateId('col'),
      name,
      description: description || '',
      created_at: now,
      updated_at: now,
      app_count: 0
    };

    collections.push(collection);
    this._saveToStorage('collections', collections);
    return collection;
  }

  // renameCollection(collectionId, new_name)
  renameCollection(collectionId, new_name) {
    if (!new_name || typeof new_name !== 'string') {
      throw new Error('New collection name is required');
    }
    const collections = this._getFromStorage('collections');
    const idx = collections.findIndex(c => c.id === collectionId);
    if (idx === -1) {
      throw new Error('Collection not found');
    }
    const now = new Date().toISOString();
    const updated = { ...collections[idx], name: new_name, updated_at: now };
    collections[idx] = updated;
    this._saveToStorage('collections', collections);
    return updated;
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    const collections = this._getFromStorage('collections');
    const idx = collections.findIndex(c => c.id === collectionId);
    if (idx === -1) {
      return { success: false, deleted_collection_id: null, message: 'Collection not found' };
    }

    const newCollections = collections.filter(c => c.id !== collectionId);
    this._saveToStorage('collections', newCollections);

    const items = this._getFromStorage('collection_items');
    const remainingItems = items.filter(ci => ci.collectionId !== collectionId);
    this._saveToStorage('collection_items', remainingItems);

    return {
      success: true,
      deleted_collection_id: collectionId,
      message: 'Collection deleted'
    };
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return { collection: null, items: [] };
    }

    const collection_items = this._getFromStorage('collection_items').filter(ci => ci.collectionId === collectionId);
    const apps = this._getFromStorage('apps');
    const categories = this._getFromStorage('categories');
    const favorites = this._getFromStorage('favorites');

    const items = collection_items.map(ci => {
      const app = apps.find(a => a.id === ci.appId) || null;
      const category = app ? categories.find(c => c.id === app.category) || null : null;
      const is_favorited = favorites.some(f => f.appId === ci.appId);
      return {
        collection_item: ci,
        app,
        category,
        is_favorited
      };
    });

    return { collection, items };
  }

  // addAppToCollection(collectionId, appId)
  addAppToCollection(collectionId, appId) {
    const collections = this._getFromStorage('collections');
    const collectionIndex = collections.findIndex(c => c.id === collectionId);
    if (collectionIndex === -1) {
      return { success: false, collection_item: null, collection: null, message: 'Collection not found' };
    }

    const apps = this._getFromStorage('apps');
    const app = apps.find(a => a.id === appId);
    if (!app) {
      return { success: false, collection_item: null, collection: null, message: 'App not found' };
    }

    const collection_items = this._getFromStorage('collection_items');
    const existing = collection_items.find(ci => ci.collectionId === collectionId && ci.appId === appId);
    if (existing) {
      const collection = collections[collectionIndex];
      return { success: true, collection_item: existing, collection, message: 'App already in collection' };
    }

    const now = new Date().toISOString();
    const collection_item = {
      id: this._generateId('colitem'),
      collectionId,
      appId,
      added_at: now,
      sort_order: null
    };

    collection_items.push(collection_item);
    this._saveToStorage('collection_items', collection_items);

    const updatedCollection = { ...collections[collectionIndex] };
    const newCount = collection_items.filter(ci => ci.collectionId === collectionId).length;
    updatedCollection.app_count = newCount;
    updatedCollection.updated_at = now;
    collections[collectionIndex] = updatedCollection;
    this._saveToStorage('collections', collections);

    return {
      success: true,
      collection_item,
      collection: updatedCollection,
      message: 'App added to collection'
    };
  }

  // removeAppFromCollection(collectionId, appId)
  removeAppFromCollection(collectionId, appId) {
    const collections = this._getFromStorage('collections');
    const collectionIndex = collections.findIndex(c => c.id === collectionId);
    if (collectionIndex === -1) {
      return { success: false, collection: null, message: 'Collection not found' };
    }

    const items = this._getFromStorage('collection_items');
    const before = items.length;
    const remaining = items.filter(ci => !(ci.collectionId === collectionId && ci.appId === appId));
    this._saveToStorage('collection_items', remaining);

    const removed = before !== remaining.length;
    const now = new Date().toISOString();
    const updatedCollection = { ...collections[collectionIndex] };
    const newCount = remaining.filter(ci => ci.collectionId === collectionId).length;
    updatedCollection.app_count = newCount;
    updatedCollection.updated_at = now;
    collections[collectionIndex] = updatedCollection;
    this._saveToStorage('collections', collections);

    return {
      success: removed,
      collection: updatedCollection,
      message: removed ? 'App removed from collection' : 'App not found in collection'
    };
  }

  // addAppToComparison(appId)
  addAppToComparison(appId) {
    const appsAll = this._getFromStorage('apps');
    const app = appsAll.find(a => a.id === appId);
    if (!app) {
      return { comparison_set: null, items: [], apps: [] };
    }

    const comparison_set = this._getOrCreateComparisonSet();
    const comparison_items = this._getFromStorage('comparison_items');

    const existing = comparison_items.find(ci => ci.comparisonSetId === comparison_set.id && ci.appId === appId);
    if (!existing) {
      const now = new Date().toISOString();
      const item = {
        id: this._generateId('cmpitem'),
        comparisonSetId: comparison_set.id,
        appId,
        added_at: now
      };
      comparison_items.push(item);
      this._saveToStorage('comparison_items', comparison_items);
    }

    const itemsForSet = comparison_items.filter(ci => ci.comparisonSetId === comparison_set.id);
    const apps = this._getFromStorage('apps');
    const itemsDetailed = itemsForSet.map(ci => ({
      ...ci,
      app: apps.find(a => a.id === ci.appId) || null
    }));
    const appsForSet = itemsForSet
      .map(ci => apps.find(a => a.id === ci.appId) || null)
      .filter(a => !!a);

    return {
      comparison_set,
      items: itemsDetailed,
      apps: appsForSet
    };
  }

  // removeAppFromComparison(appId)
  removeAppFromComparison(appId) {
    const comparison_sets = this._getFromStorage('comparison_sets');
    const comparison_set = comparison_sets.find(s => s.is_active) || null;
    if (!comparison_set) {
      return { comparison_set: null, items: [], apps: [] };
    }

    const comparison_items = this._getFromStorage('comparison_items');
    const remaining = comparison_items.filter(ci => !(ci.comparisonSetId === comparison_set.id && ci.appId === appId));
    this._saveToStorage('comparison_items', remaining);

    const apps = this._getFromStorage('apps');
    const itemsForSet = remaining.filter(ci => ci.comparisonSetId === comparison_set.id);
    const itemsDetailed = itemsForSet.map(ci => ({
      ...ci,
      app: apps.find(a => a.id === ci.appId) || null
    }));
    const appsForSet = itemsForSet
      .map(ci => apps.find(a => a.id === ci.appId) || null)
      .filter(a => !!a);

    return {
      comparison_set,
      items: itemsDetailed,
      apps: appsForSet
    };
  }

  // clearComparisonSet()
  clearComparisonSet() {
    const comparison_sets = this._getFromStorage('comparison_sets');
    let comparison_set = comparison_sets.find(s => s.is_active) || null;
    if (!comparison_set) {
      comparison_set = this._getOrCreateComparisonSet();
    }

    const comparison_items = this._getFromStorage('comparison_items');
    const remaining = comparison_items.filter(ci => ci.comparisonSetId !== comparison_set.id);
    this._saveToStorage('comparison_items', remaining);

    return {
      success: true,
      comparison_set
    };
  }

  // getActiveComparisonBar()
  getActiveComparisonBar() {
    const comparison_sets = this._getFromStorage('comparison_sets');
    const comparison_set = comparison_sets.find(s => s.is_active) || null;
    if (!comparison_set) {
      return { comparison_set: null, apps: [] };
    }

    const comparison_items = this._getFromStorage('comparison_items');
    const appsAll = this._getFromStorage('apps');
    const itemsForSet = comparison_items.filter(ci => ci.comparisonSetId === comparison_set.id);
    const apps = itemsForSet
      .map(ci => appsAll.find(a => a.id === ci.appId) || null)
      .filter(a => !!a);

    return {
      comparison_set,
      apps
    };
  }

  // getComparisonDetail()
  getComparisonDetail() {
    const comparison_sets = this._getFromStorage('comparison_sets');
    const comparison_set = comparison_sets.find(s => s.is_active) || null;
    if (!comparison_set) {
      return { comparison_set: null, apps: [], categories: [] };
    }

    const comparison_items = this._getFromStorage('comparison_items');
    const appsAll = this._getFromStorage('apps');
    const categoriesAll = this._getFromStorage('categories');

    const itemsForSet = comparison_items.filter(ci => ci.comparisonSetId === comparison_set.id);
    const apps = itemsForSet
      .map(ci => appsAll.find(a => a.id === ci.appId) || null)
      .filter(a => !!a);

    const categoryIds = Array.from(new Set(apps.map(a => a.category)));
    const categories = categoriesAll.filter(c => categoryIds.includes(c.id));

    return {
      comparison_set,
      apps,
      categories
    };
  }

  // getAccountProfile()
  getAccountProfile() {
    const existingStr = localStorage.getItem('account_profiles');
    if (existingStr) {
      return JSON.parse(existingStr);
    }
    return this._getOrCreateAccountProfile();
  }

  // upsertAccountProfile(username, email, password)
  upsertAccountProfile(username, email, password) {
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }

    const now = new Date().toISOString();
    const existingStr = localStorage.getItem('account_profiles');
    let profile;
    if (existingStr) {
      profile = JSON.parse(existingStr);
      profile.username = username;
      profile.email = email;
      profile.password = password;
      profile.updated_at = now;
    } else {
      profile = {
        id: this._generateId('acct'),
        username,
        email,
        password,
        created_at: now,
        updated_at: now
      };
    }

    localStorage.setItem('account_profiles', JSON.stringify(profile));
    return profile;
  }

  // getNotificationSettings()
  getNotificationSettings() {
    return this._getOrCreateNotificationSettings();
  }

  // updateNotificationSettings(selected_categories, min_rating, notification_frequency)
  updateNotificationSettings(selected_categories, min_rating, notification_frequency) {
    if (!Array.isArray(selected_categories)) {
      throw new Error('selected_categories must be an array');
    }
    if (typeof min_rating !== 'number') {
      throw new Error('min_rating must be a number');
    }
    if (typeof notification_frequency !== 'string') {
      throw new Error('notification_frequency must be a string enum');
    }

    const allowedFreq = [
      'off',
      'immediate',
      'daily_summary',
      'weekly_summary',
      'monthly_summary'
    ];
    if (!allowedFreq.includes(notification_frequency)) {
      throw new Error('Invalid notification_frequency');
    }

    const settings = this._getOrCreateNotificationSettings();
    const now = new Date().toISOString();

    settings.selected_categories = selected_categories;
    settings.min_rating = min_rating;
    settings.notification_frequency = notification_frequency;
    settings.last_updated = now;

    localStorage.setItem('notification_settings', JSON.stringify(settings));
    return settings;
  }

  // copyAppLink(appId)
  copyAppLink(appId) {
    const apps = this._getFromStorage('apps');
    const app = apps.find(a => a.id === appId);
    if (!app) {
      return { success: false, copied_url: '', message: 'App not found' };
    }

    // Simulate shareable URL; actual clipboard interaction is handled by UI layer
    const url = `/apps/${appId}`;
    localStorage.setItem('last_copied_app_url', JSON.stringify(url));

    return {
      success: true,
      copied_url: url,
      message: 'App link prepared (copy to clipboard handled by UI)'
    };
  }

  // getAboutContent()
  getAboutContent() {
    const existingStr = localStorage.getItem('about_content');
    if (existingStr) {
      return JSON.parse(existingStr);
    }
    // Default minimal content; can be overridden by storing into localStorage externally
    const content = {
      title: 'About',
      body: ''
    };
    localStorage.setItem('about_content', JSON.stringify(content));
    return content;
  }

  // getContactPageContent()
  getContactPageContent() {
    const existingStr = localStorage.getItem('contact_page_content');
    if (existingStr) {
      return JSON.parse(existingStr);
    }
    const content = {
      support_email: 'support@example.com',
      contact_form_enabled: true,
      topics: []
    };
    localStorage.setItem('contact_page_content', JSON.stringify(content));
    return content;
  }

  // submitContactMessage(email, subject, message_body)
  submitContactMessage(email, subject, message_body) {
    if (!email || !subject || !message_body) {
      return { success: false, message_id: null, message: 'All fields are required' };
    }
    const messages = this._getFromStorage('contact_messages');
    const now = new Date().toISOString();
    const id = this._generateId('contact');

    const entry = {
      id,
      email,
      subject,
      message_body,
      created_at: now
    };

    messages.push(entry);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message_id: id,
      message: 'Message submitted'
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    const existingStr = localStorage.getItem('help_faq_content');
    if (existingStr) {
      return JSON.parse(existingStr);
    }
    const content = {
      faqs: [],
      task_guides: []
    };
    localStorage.setItem('help_faq_content', JSON.stringify(content));
    return content;
  }

  // getLegalDocument(doc_type)
  getLegalDocument(doc_type) {
    if (!doc_type || (doc_type !== 'privacy_policy' && doc_type !== 'terms_of_use')) {
      throw new Error('doc_type must be "privacy_policy" or "terms_of_use"');
    }
    const existingStr = localStorage.getItem('legal_documents');
    let docs = {};
    if (existingStr) {
      try {
        docs = JSON.parse(existingStr) || {};
      } catch (e) {
        docs = {};
      }
    }

    if (!docs[doc_type]) {
      docs[doc_type] = {
        title: doc_type === 'privacy_policy' ? 'Privacy Policy' : 'Terms of Use',
        body: '',
        last_updated: ''
      };
      localStorage.setItem('legal_documents', JSON.stringify(docs));
    }

    return docs[doc_type];
  }

  // getHomeOverview is already implemented above
}

// Global exposure for browser & Node.js (no direct window/document references)
if (typeof globalThis !== 'undefined') {
  globalThis.BusinessLogic = BusinessLogic;
  globalThis.WebsiteSDK = new BusinessLogic();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
