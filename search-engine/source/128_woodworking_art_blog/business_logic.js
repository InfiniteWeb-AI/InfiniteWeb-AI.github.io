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
    this._ensureSingleUserContext();
  }

  // =====================
  // Storage helpers
  // =====================
  _initStorage() {
    const keys = [
      'projects',
      'project_materials',
      'project_collections',
      'project_collection_items',
      'articles',
      'article_comments',
      'reading_lists',
      'reading_list_items',
      'forum_categories',
      'forum_subforums',
      'forum_threads',
      'forum_posts',
      'products',
      'wishlists',
      'wishlist_items',
      'artists',
      'artist_follows',
      'materials_lists',
      'materials_list_items',
      'events',
      'event_registrations',
      'contact_messages'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
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

  _ensureSingleUserContext() {
    if (!localStorage.getItem('singleUserContextInitialized')) {
      localStorage.setItem('singleUserContextInitialized', 'true');
    }
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _indexById(items) {
    const map = {};
    for (const item of items) {
      if (item && item.id != null) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _normalizeName(name) {
    return (name || '').trim().toLowerCase();
  }

  // Helper: project with artist resolved
  _attachArtistToProject(project, artistsIndex) {
    if (!project) return null;
    const artist = project.artistId ? (artistsIndex[project.artistId] || null) : null;
    return { ...project, artist };
  }

  // Helper: resolve MaterialsListItem foreign keys
  _resolveMaterialsListItems(items) {
    const lists = this._getFromStorage('materials_lists');
    const materials = this._getFromStorage('project_materials');
    const projects = this._getFromStorage('projects');
    const listsIndex = this._indexById(lists);
    const matsIndex = this._indexById(materials);
    const projIndex = this._indexById(projects);
    return items.map(it => ({
      ...it,
      materialsList: it.materialsListId ? (listsIndex[it.materialsListId] || null) : null,
      sourceProject: it.sourceProjectId ? (projIndex[it.sourceProjectId] || null) : null,
      sourceProjectMaterial: it.sourceProjectMaterialId ? (matsIndex[it.sourceProjectMaterialId] || null) : null
    }));
  }

  // Helper: resolve WishlistItem FKs
  _resolveWishlistItems(items) {
    const wishlists = this._getFromStorage('wishlists');
    const products = this._getFromStorage('products');
    const artists = this._getFromStorage('artists');
    const wlIndex = this._indexById(wishlists);
    const prodIndex = this._indexById(products);
    const artistIndex = this._indexById(artists);
    return items.map(it => {
      const product = it.productId ? (prodIndex[it.productId] || null) : null;
      const productWithArtist = product
        ? { ...product, artist: product.artistId ? (artistIndex[product.artistId] || null) : null }
        : null;
      return {
        ...it,
        wishlist: it.wishlistId ? (wlIndex[it.wishlistId] || null) : null,
        product: productWithArtist
      };
    });
  }

  // Helper: resolve ProjectCollectionItem FKs
  _resolveProjectCollectionItems(items) {
    const collections = this._getFromStorage('project_collections');
    const projects = this._getFromStorage('projects');
    const artists = this._getFromStorage('artists');
    const colIndex = this._indexById(collections);
    const projIndex = this._indexById(projects);
    const artistIndex = this._indexById(artists);
    return items.map(it => {
      const project = it.projectId ? (projIndex[it.projectId] || null) : null;
      const projectWithArtist = project
        ? { ...project, artist: project.artistId ? (artistIndex[project.artistId] || null) : null }
        : null;
      return {
        ...it,
        collection: it.collectionId ? (colIndex[it.collectionId] || null) : null,
        project: projectWithArtist
      };
    });
  }

  // =====================
  // Declared helperFunctions
  // =====================

  _getOrCreateDefaultWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    const existing = wishlists.find(w => this._normalizeName(w.name) === 'default wishlist');
    if (existing) return existing;
    const wishlist = {
      id: this._generateId('wishlist'),
      name: 'Default Wishlist',
      description: 'Automatically created wishlist',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };
    wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);
    return wishlist;
  }

  _getOrCreateMaterialsListForProject(projectId) {
    const materialsLists = this._getFromStorage('materials_lists');
    let list = materialsLists.find(ml => ml.sourceProjectId === projectId);
    if (list) return list;
    // create with default name from project
    const projects = this._getFromStorage('projects');
    const project = projects.find(p => p.id === projectId) || null;
    const name = project ? (project.title + ' Materials') : 'Project Materials List';
    const result = this.createMaterialsListFromProject(projectId, name, undefined, true);
    return result.materialsList;
  }

  _getOrCreateProjectCollectionByName(name) {
    const targetNameNorm = this._normalizeName(name);
    let collections = this._getFromStorage('project_collections');
    let existing = collections.find(c => this._normalizeName(c.name) === targetNameNorm);
    if (existing) return existing;
    const res = this.createProjectCollection(name, undefined, undefined);
    return res.collection;
  }

  // =====================
  // Interface implementations
  // =====================

  // getHomeOverview()
  getHomeOverview() {
    const projects = this._getFromStorage('projects');
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('events');
    const artists = this._getFromStorage('artists');
    const artistIndex = this._indexById(artists);

    const featuredProjects = [...projects]
      .filter(p => p.isPublished !== false)
      .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
      .slice(0, 6)
      .map(p => this._attachArtistToProject(p, artistIndex));

    const recentTutorials = [...articles]
      .filter(a => a.isPublished !== false && a.contentType === 'tutorial')
      .sort((a, b) => {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      })
      .slice(0, 6);

    const upcomingWorkshops = [...events]
      .filter(e => e.isWorkshop === true)
      .sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return da - db;
      })
      .slice(0, 6);

    const highlightedArtists = [...artists]
      .sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0))
      .slice(0, 6);

    return {
      featuredProjects,
      recentTutorials,
      upcomingWorkshops,
      highlightedArtists
    };
  }

  // searchSiteContent(query, filters)
  searchSiteContent(query, filters) {
    filters = filters || {};
    const q = (query || '').trim().toLowerCase();
    const contentTypesFilter = (filters.contentTypes || []).map(s => s.toLowerCase());
    const difficultyFilter = filters.difficulty || null;
    const minRating = typeof filters.minRating === 'number' ? filters.minRating : null;
    const dateFrom = this._parseDate(filters.dateFromIso);
    const dateTo = this._parseDate(filters.dateToIso);
    const sortBy = filters.sortBy || 'relevance';
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 50;

    const projects = this._getFromStorage('projects');
    const articles = this._getFromStorage('articles');
    const products = this._getFromStorage('products');
    const events = this._getFromStorage('events');

    const results = [];

    const matchesText = (text) => {
      if (!q) return true;
      if (!text) return false;
      return String(text).toLowerCase().includes(q);
    };

    const inDateRange = (createdAt) => {
      const d = this._parseDate(createdAt);
      if (!d) return true;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    };

    const ratingOk = (avg) => {
      if (minRating == null) return true;
      return (avg || 0) >= minRating;
    };

    const contentTypeAllowed = (type) => {
      if (!contentTypesFilter.length) return true;
      return contentTypesFilter.includes(type.toLowerCase());
    };

    // Projects -> entityType 'project'
    for (const p of projects) {
      if (difficultyFilter && p.difficulty && p.difficulty !== difficultyFilter) continue;
      if (!ratingOk(p.averageRating)) continue;
      if (!inDateRange(p.createdAt)) continue;
      const haystack = `${p.title || ''} ${p.description || ''} ${p.category || ''}`;
      if (!matchesText(haystack)) continue;
      const entityType = 'project';
      if (!contentTypeAllowed(entityType)) continue;
      results.push({
        entityType,
        id: p.id,
        title: p.title,
        snippet: p.description || '',
        averageRating: p.averageRating || 0,
        createdAt: p.createdAt || null,
        meta: {
          category: p.category || null,
          difficulty: p.difficulty || null,
          contentType: 'project',
          price: null
        }
      });
    }

    // Articles & tutorials
    for (const a of articles) {
      if (difficultyFilter && a.difficulty && a.difficulty !== difficultyFilter) continue;
      if (!ratingOk(a.averageRating)) continue;
      if (!inDateRange(a.createdAt)) continue;
      const haystack = `${a.title || ''} ${a.description || ''} ${(a.category || '')} ${(a.tags || []).join(' ')}`;
      if (!matchesText(haystack)) continue;
      const entityType = a.contentType === 'tutorial' ? 'tutorial' : 'article';
      if (!contentTypeAllowed(entityType)) continue;
      results.push({
        entityType,
        id: a.id,
        title: a.title,
        snippet: a.description || '',
        averageRating: a.averageRating || 0,
        createdAt: a.createdAt || null,
        meta: {
          category: a.category || null,
          difficulty: a.difficulty || null,
          contentType: a.contentType || null,
          price: null
        }
      });
    }

    // Products
    for (const p of products) {
      if (!ratingOk(p.averageRating)) continue;
      if (!inDateRange(p.createdAt)) continue;
      const haystack = `${p.name || ''} ${p.description || ''} ${p.category || ''}`;
      if (!matchesText(haystack)) continue;
      const entityType = 'product';
      if (!contentTypeAllowed(entityType)) continue;
      results.push({
        entityType,
        id: p.id,
        title: p.name,
        snippet: p.description || '',
        averageRating: p.averageRating || 0,
        createdAt: p.createdAt || null,
        meta: {
          category: p.category || null,
          difficulty: null,
          contentType: 'product',
          price: p.price || null
        }
      });
    }

    // Events
    for (const ev of events) {
      if (!ratingOk(ev.averageRating)) {
        // Events do not have rating in model; ignore rating filter for events
      }
      if (!inDateRange(ev.createdAt)) continue;
      const haystack = `${ev.title || ''} ${ev.description || ''} ${ev.topic || ''}`;
      if (!matchesText(haystack)) continue;
      const entityType = 'event';
      if (!contentTypeAllowed(entityType)) continue;
      results.push({
        entityType,
        id: ev.id,
        title: ev.title,
        snippet: ev.description || '',
        averageRating: 0,
        createdAt: ev.createdAt || null,
        meta: {
          category: ev.topic || null,
          difficulty: ev.difficulty || null,
          contentType: 'event',
          price: ev.price || null
        }
      });
    }

    // Sorting
    results.sort((a, b) => {
      if (sortBy === 'rating_high_to_low') {
        return (b.averageRating || 0) - (a.averageRating || 0);
      }
      if (sortBy === 'date_new_to_old') {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      }
      // relevance: leave as-is (current implementation has no scoring)
      return 0;
    });

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return results.slice(start, end);
  }

  // getProjectFilterOptions()
  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects');
    const categoriesSet = new Set();
    const materialsSet = new Set();

    for (const p of projects) {
      if (p.category) categoriesSet.add(p.category);
      if (Array.isArray(p.materialTags)) {
        for (const m of p.materialTags) {
          if (m) materialsSet.add(m);
        }
      }
    }

    const categories = Array.from(categoriesSet).map(value => ({ value, label: value }));
    const materials = Array.from(materialsSet).map(value => ({ value, label: value }));

    const difficulties = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const buildTimePresets = [
      { maxMinutes: 60, label: 'Up to 1 hour' },
      { maxMinutes: 120, label: 'Up to 2 hours' },
      { maxMinutes: 180, label: 'Up to 3 hours' },
      { maxMinutes: 240, label: 'Up to 4 hours' }
    ];

    const sortOptions = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'rating_low_to_high', label: 'Rating: Low to High' },
      { value: 'date_new_to_old', label: 'Newest First' },
      { value: 'popularity_high_to_low', label: 'Most Popular' }
    ];

    return { categories, materials, difficulties, buildTimePresets, sortOptions };
  }

  // listProjects(filters, sortBy, page, pageSize)
  listProjects(filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'rating_high_to_low';
    page = page || 1;
    pageSize = pageSize || 20;

    const projects = this._getFromStorage('projects');
    const artists = this._getFromStorage('artists');
    const artistIndex = this._indexById(artists);

    const dateFrom = this._parseDate(filters.dateFromIso);
    const dateTo = this._parseDate(filters.dateToIso);

    let filtered = projects.filter(p => {
      if (filters.category && p.category !== filters.category) return false;
      if (filters.materialTags && filters.materialTags.length) {
        const tags = p.materialTags || [];
        const hasAll = filters.materialTags.every(tag => tags.includes(tag));
        if (!hasAll) return false;
      }
      if (filters.difficulty && p.difficulty && p.difficulty !== filters.difficulty) return false;
      if (typeof filters.maxBuildTimeMinutes === 'number') {
        if (typeof p.estimatedBuildTimeMinutes === 'number' && p.estimatedBuildTimeMinutes > filters.maxBuildTimeMinutes) {
          return false;
        }
      }
      if (typeof filters.minRating === 'number') {
        if ((p.averageRating || 0) < filters.minRating) return false;
      }
      const d = this._parseDate(p.createdAt);
      if (dateFrom && d && d < dateFrom) return false;
      if (dateTo && d && d > dateTo) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'rating_high_to_low') {
        return (b.averageRating || 0) - (a.averageRating || 0);
      }
      if (sortBy === 'rating_low_to_high') {
        return (a.averageRating || 0) - (b.averageRating || 0);
      }
      if (sortBy === 'date_new_to_old') {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      }
      if (sortBy === 'popularity_high_to_low') {
        return (b.ratingCount || 0) - (a.ratingCount || 0);
      }
      return 0;
    });

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = filtered.slice(start, end);

    const resultProjects = slice.map(p => ({
      project: this._attachArtistToProject(p, artistIndex),
      categoryLabel: p.category || null,
      primaryMaterialsLabel: Array.isArray(p.materialTags) && p.materialTags.length
        ? p.materialTags.join(', ')
        : null
    }));

    return { projects: resultProjects, totalCount };
  }

  // getProjectDetails(projectId)
  getProjectDetails(projectId) {
    const projects = this._getFromStorage('projects');
    const project = projects.find(p => p.id === projectId) || null;
    const materials = this._getFromStorage('project_materials').filter(m => m.projectId === projectId);
    const artists = this._getFromStorage('artists');
    const artist = project && project.artistId ? (artists.find(a => a.id === project.artistId) || null) : null;
    const collections = this._getFromStorage('project_collection_items').filter(ci => ci.projectId === projectId);

    const projectWithArtist = project ? { ...project, artist } : null;
    const materialsWithProject = materials.map(m => ({
      ...m,
      project: projectWithArtist
    }));

    return {
      project: projectWithArtist,
      materials: materialsWithProject,
      artist,
      isInAnyCollection: collections.length > 0
    };
  }

  // getUserProjectCollections()
  getUserProjectCollections() {
    const collections = this._getFromStorage('project_collections');
    const items = this._getFromStorage('project_collection_items');
    return collections.map(c => ({
      collection: c,
      itemCount: items.filter(i => i.collectionId === c.id).length
    }));
  }

  // createProjectCollection(name, description, initialProjectId)
  createProjectCollection(name, description, initialProjectId) {
    const collections = this._getFromStorage('project_collections');
    const now = this._nowIso();
    const collection = {
      id: this._generateId('projcol'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    collections.push(collection);
    this._saveToStorage('project_collections', collections);

    if (initialProjectId) {
      const items = this._getFromStorage('project_collection_items');
      const item = {
        id: this._generateId('projcolitem'),
        collectionId: collection.id,
        projectId: initialProjectId,
        addedAt: now,
        notes: ''
      };
      items.push(item);
      this._saveToStorage('project_collection_items', items);
    }

    return { success: true, collection, message: 'Collection created' };
  }

  // addProjectToCollection(projectId, collectionId, notes)
  addProjectToCollection(projectId, collectionId, notes) {
    const items = this._getFromStorage('project_collection_items');
    const now = this._nowIso();
    const exists = items.find(i => i.collectionId === collectionId && i.projectId === projectId);
    if (exists) {
      return { success: false, message: 'Project already in collection' };
    }
    const item = {
      id: this._generateId('projcolitem'),
      collectionId,
      projectId,
      addedAt: now,
      notes: notes || ''
    };
    items.push(item);
    this._saveToStorage('project_collection_items', items);
    return { success: true, message: 'Project added to collection' };
  }

  // getProjectCollectionDetails(collectionId)
  getProjectCollectionDetails(collectionId) {
    const collections = this._getFromStorage('project_collections');
    const collection = collections.find(c => c.id === collectionId) || null;
    const itemsRaw = this._getFromStorage('project_collection_items').filter(i => i.collectionId === collectionId);
    const resolvedItems = this._resolveProjectCollectionItems(itemsRaw).map(r => ({
      collectionItem: r,
      project: r.project,
      collection: r.collection
    }));
    return { collection, items: resolvedItems };
  }

  // removeProjectFromCollection(collectionItemId)
  removeProjectFromCollection(collectionItemId) {
    let items = this._getFromStorage('project_collection_items');
    const before = items.length;
    items = items.filter(i => i.id !== collectionItemId);
    this._saveToStorage('project_collection_items', items);
    const removed = before !== items.length;
    return { success: removed, message: removed ? 'Removed from collection' : 'Item not found' };
  }

  // createMaterialsListFromProject(projectId, name, description, includeNotes)
  createMaterialsListFromProject(projectId, name, description, includeNotes) {
    const projectMaterials = this._getFromStorage('project_materials').filter(m => m.projectId === projectId);
    const materialsLists = this._getFromStorage('materials_lists');
    const now = this._nowIso();
    const materialsList = {
      id: this._generateId('matlist'),
      name,
      description: description || '',
      sourceProjectId: projectId,
      createdAt: now,
      updatedAt: now
    };
    materialsLists.push(materialsList);
    this._saveToStorage('materials_lists', materialsLists);

    const itemsAll = this._getFromStorage('materials_list_items');
    const newItems = [];
    for (const pm of projectMaterials) {
      const item = {
        id: this._generateId('matlistitem'),
        materialsListId: materialsList.id,
        name: pm.name,
        quantity: pm.quantity != null ? pm.quantity : null,
        unit: pm.unit || null,
        notes: includeNotes ? (pm.notes || '') : '',
        sourceProjectId: projectId,
        sourceProjectMaterialId: pm.id
      };
      newItems.push(item);
      itemsAll.push(item);
    }
    this._saveToStorage('materials_list_items', itemsAll);

    const resolvedItems = this._resolveMaterialsListItems(newItems);
    return { materialsList, items: resolvedItems };
  }

  // addProjectMaterialToMaterialsList(materialsListId, projectMaterialId, quantityOverride, notes)
  addProjectMaterialToMaterialsList(materialsListId, projectMaterialId, quantityOverride, notes) {
    const projectMaterials = this._getFromStorage('project_materials');
    const pm = projectMaterials.find(m => m.id === projectMaterialId) || null;
    if (!pm) {
      return { materialsListItem: null };
    }
    const itemsAll = this._getFromStorage('materials_list_items');
    const item = {
      id: this._generateId('matlistitem'),
      materialsListId,
      name: pm.name,
      quantity: typeof quantityOverride === 'number' ? quantityOverride : (pm.quantity != null ? pm.quantity : null),
      unit: pm.unit || null,
      notes: notes || '',
      sourceProjectId: pm.projectId || null,
      sourceProjectMaterialId: pm.id
    };
    itemsAll.push(item);
    this._saveToStorage('materials_list_items', itemsAll);
    const [resolved] = this._resolveMaterialsListItems([item]);
    return { materialsListItem: resolved };
  }

  // getUserMaterialsLists()
  getUserMaterialsLists() {
    return this._getFromStorage('materials_lists');
  }

  // getMaterialsListDetails(materialsListId)
  getMaterialsListDetails(materialsListId) {
    const lists = this._getFromStorage('materials_lists');
    const materialsList = lists.find(l => l.id === materialsListId) || null;
    const itemsRaw = this._getFromStorage('materials_list_items').filter(i => i.materialsListId === materialsListId);
    const items = this._resolveMaterialsListItems(itemsRaw);
    return { materialsList, items };
  }

  // removeItemFromMaterialsList(materialsListItemId)
  removeItemFromMaterialsList(materialsListItemId) {
    let items = this._getFromStorage('materials_list_items');
    const before = items.length;
    items = items.filter(i => i.id !== materialsListItemId);
    this._saveToStorage('materials_list_items', items);
    const removed = before !== items.length;
    return { success: removed, message: removed ? 'Item removed' : 'Item not found' };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');
    const categoriesSet = new Set();
    const tagsSet = new Set();

    for (const a of articles) {
      if (a.category) categoriesSet.add(a.category);
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          if (t) tagsSet.add(t);
        }
      }
    }

    const categories = Array.from(categoriesSet).map(value => ({ value, label: value }));
    const tags = Array.from(tagsSet).map(value => ({ value, label: value }));
    const difficulties = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];
    const readingTimePresets = [
      { maxMinutes: 10, label: 'Up to 10 minutes' },
      { maxMinutes: 20, label: 'Up to 20 minutes' },
      { maxMinutes: 30, label: 'Up to 30 minutes' }
    ];
    const sortOptions = [
      { value: 'date_new_to_old', label: 'Newest First' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return { categories, tags, difficulties, readingTimePresets, sortOptions };
  }

  // listArticles(filters, sortBy, page, pageSize)
  listArticles(filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'date_new_to_old';
    page = page || 1;
    pageSize = pageSize || 20;

    const articles = this._getFromStorage('articles');

    let filtered = articles.filter(a => {
      if (filters.category && a.category !== filters.category) return false;
      if (filters.tags && filters.tags.length) {
        const tags = a.tags || [];
        const hasAll = filters.tags.every(t => tags.includes(t));
        if (!hasAll) return false;
      }
      if (filters.difficulty && a.difficulty && a.difficulty !== filters.difficulty) return false;
      if (typeof filters.maxReadingTimeMinutes === 'number') {
        if (typeof a.estimatedReadingTimeMinutes === 'number' && a.estimatedReadingTimeMinutes > filters.maxReadingTimeMinutes) {
          return false;
        }
      }
      if (filters.contentType && a.contentType && a.contentType !== filters.contentType) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'date_new_to_old') {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      }
      if (sortBy === 'rating_high_to_low') {
        return (b.averageRating || 0) - (a.averageRating || 0);
      }
      return 0;
    });

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = filtered.slice(start, end);

    return { articles: slice, totalCount };
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;
    return { article };
  }

  // getArticleComments(articleId, page, pageSize)
  getArticleComments(articleId, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 50;
    const comments = this._getFromStorage('article_comments').filter(c => c.articleId === articleId);
    const articles = this._getFromStorage('articles');
    const articleIndex = this._indexById(articles);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = comments.slice(start, end);
    return slice.map(c => ({
      ...c,
      article: c.articleId ? (articleIndex[c.articleId] || null) : null
    }));
  }

  // postArticleComment(articleId, content, authorDisplayName)
  postArticleComment(articleId, content, authorDisplayName) {
    const comments = this._getFromStorage('article_comments');
    const comment = {
      id: this._generateId('acomment'),
      articleId,
      content,
      authorDisplayName: authorDisplayName || 'Guest',
      createdAt: this._nowIso()
    };
    comments.push(comment);
    this._saveToStorage('article_comments', comments);

    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;
    return { comment: { ...comment, article } };
  }

  // getUserReadingLists()
  getUserReadingLists() {
    return this._getFromStorage('reading_lists');
  }

  // createReadingList(name, description, initialArticleId)
  createReadingList(name, description, initialArticleId) {
    const lists = this._getFromStorage('reading_lists');
    const now = this._nowIso();
    const readingList = {
      id: this._generateId('readlist'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    lists.push(readingList);
    this._saveToStorage('reading_lists', lists);

    if (initialArticleId) {
      const items = this._getFromStorage('reading_list_items');
      const item = {
        id: this._generateId('readlistitem'),
        readingListId: readingList.id,
        articleId: initialArticleId,
        addedAt: now,
        notes: ''
      };
      items.push(item);
      this._saveToStorage('reading_list_items', items);
    }

    return { readingList };
  }

  // addArticleToReadingList(articleId, readingListId, notes)
  addArticleToReadingList(articleId, readingListId, notes) {
    const items = this._getFromStorage('reading_list_items');
    const now = this._nowIso();
    const item = {
      id: this._generateId('readlistitem'),
      readingListId,
      articleId,
      addedAt: now,
      notes: notes || ''
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);
    return { readingListItem: item };
  }

  // getReadingListDetails(readingListId)
  getReadingListDetails(readingListId) {
    const lists = this._getFromStorage('reading_lists');
    const readingList = lists.find(l => l.id === readingListId) || null;
    const items = this._getFromStorage('reading_list_items').filter(i => i.readingListId === readingListId);
    const articles = this._getFromStorage('articles');
    const articleIndex = this._indexById(articles);
    const detailedItems = items.map(i => ({
      readingListItem: {
        ...i,
        readingList: readingList,
        article: i.articleId ? (articleIndex[i.articleId] || null) : null
      },
      article: i.articleId ? (articleIndex[i.articleId] || null) : null
    }));
    return { readingList, items: detailedItems };
  }

  // removeArticleFromReadingList(readingListItemId)
  removeArticleFromReadingList(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter(i => i.id !== readingListItemId);
    this._saveToStorage('reading_list_items', items);
    const removed = before !== items.length;
    return { success: removed, message: removed ? 'Removed from reading list' : 'Item not found' };
  }

  // getForumOverview()
  getForumOverview() {
    const categories = this._getFromStorage('forum_categories');
    const subforums = this._getFromStorage('forum_subforums');
    const catIndex = this._indexById(categories);

    const result = categories.map(category => ({
      category,
      subforums: subforums
        .filter(sf => sf.categoryId === category.id)
        .map(sf => ({ ...sf, category: catIndex[sf.categoryId] || null }))
    }));

    return result;
  }

  // getSubforumThreads(subforumId, page, pageSize, sortBy)
  getSubforumThreads(subforumId, page, pageSize, sortBy) {
    page = page || 1;
    pageSize = pageSize || 20;
    sortBy = sortBy || 'date_new_to_old';
    const subforums = this._getFromStorage('forum_subforums');
    const subforum = subforums.find(sf => sf.id === subforumId) || null;
    let threads = this._getFromStorage('forum_threads').filter(t => t.subforumId === subforumId);

    threads.sort((a, b) => {
      if (sortBy === 'date_new_to_old') {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      }
      if (sortBy === 'most_replies') {
        return (b.replyCount || 0) - (a.replyCount || 0);
      }
      return 0;
    });

    const totalCount = threads.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = threads.slice(start, end).map(t => ({ ...t, subforum }));

    return { subforum, threads: slice, totalCount };
  }

  // searchSubforumThreads(subforumId, query, page, pageSize)
  searchSubforumThreads(subforumId, query, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 50;
    const q = (query || '').trim().toLowerCase();
    const threads = this._getFromStorage('forum_threads').filter(t => t.subforumId === subforumId);
    const subforums = this._getFromStorage('forum_subforums');
    const subforumIndex = this._indexById(subforums);
    const filtered = threads.filter(t => {
      if (!q) return true;
      return (t.title || '').toLowerCase().includes(q);
    });
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end).map(t => ({
      ...t,
      subforum: t.subforumId ? (subforumIndex[t.subforumId] || null) : null
    }));
  }

  // createForumThread(subforumId, title, content, tagNames)
  createForumThread(subforumId, title, content, tagNames) {
    const threads = this._getFromStorage('forum_threads');
    const posts = this._getFromStorage('forum_posts');
    const now = this._nowIso();
    const thread = {
      id: this._generateId('thread'),
      subforumId,
      title,
      tagNames: Array.isArray(tagNames) ? tagNames : [],
      createdAt: now,
      updatedAt: now,
      viewCount: 0,
      replyCount: 0,
      status: 'open'
    };
    threads.push(thread);
    this._saveToStorage('forum_threads', threads);

    const originalPost = {
      id: this._generateId('post'),
      threadId: thread.id,
      content,
      isOriginalPost: true,
      authorDisplayName: 'Guest',
      createdAt: now,
      updatedAt: now
    };
    posts.push(originalPost);
    this._saveToStorage('forum_posts', posts);

    return { thread, originalPost };
  }

  // getThreadWithPosts(threadId, page, pageSize)
  getThreadWithPosts(threadId, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 50;
    const threads = this._getFromStorage('forum_threads');
    const thread = threads.find(t => t.id === threadId) || null;
    const postsAll = this._getFromStorage('forum_posts').filter(p => p.threadId === threadId);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = postsAll.slice(start, end).map(p => ({ ...p, thread }));
    return { thread, posts: slice };
  }

  // replyToThread(threadId, content, authorDisplayName)
  replyToThread(threadId, content, authorDisplayName) {
    const posts = this._getFromStorage('forum_posts');
    const threads = this._getFromStorage('forum_threads');
    const threadIndex = this._indexById(threads);
    const now = this._nowIso();
    const post = {
      id: this._generateId('post'),
      threadId,
      content,
      isOriginalPost: false,
      authorDisplayName: authorDisplayName || 'Guest',
      createdAt: now,
      updatedAt: now
    };
    posts.push(post);
    this._saveToStorage('forum_posts', posts);

    const thread = threadIndex[threadId] || null;
    if (thread) {
      thread.replyCount = (thread.replyCount || 0) + 1;
      thread.updatedAt = now;
      this._saveToStorage('forum_threads', threads);
    }

    return { post: { ...post, thread } };
  }

  // getProductFilterOptions()
  getProductFilterOptions() {
    const products = this._getFromStorage('products');
    const categoriesSet = new Set();
    for (const p of products) {
      if (p.category) categoriesSet.add(p.category);
    }
    const categories = Array.from(categoriesSet).map(value => ({ value, label: value }));

    const priceRanges = [
      { minPrice: 0, maxPrice: 50, label: 'Up to $50' },
      { minPrice: 50, maxPrice: 100, label: '$50 to $100' },
      { minPrice: 100, maxPrice: 200, label: '$100 to $200' }
    ];

    const ratingPresets = [
      { minRating: 4.5, label: '4.5 stars and up' },
      { minRating: 4.0, label: '4 stars and up' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return { categories, priceRanges, ratingPresets, sortOptions };
  }

  // listProducts(filters, sortBy, page, pageSize)
  listProducts(filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'price_low_to_high';
    page = page || 1;
    pageSize = pageSize || 20;

    const products = this._getFromStorage('products');
    const artists = this._getFromStorage('artists');
    const artistIndex = this._indexById(artists);

    let filtered = products.filter(p => {
      if (filters.category && p.category !== filters.category) return false;
      if (typeof filters.minPrice === 'number' && (p.price || 0) < filters.minPrice) return false;
      if (typeof filters.maxPrice === 'number' && (p.price || 0) > filters.maxPrice) return false;
      if (typeof filters.minRating === 'number' && (p.averageRating || 0) < filters.minRating) return false;
      if (filters.onlyAvailable && p.isAvailable === false) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'price_low_to_high') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'price_high_to_low') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === 'rating_high_to_low') {
        return (b.averageRating || 0) - (a.averageRating || 0);
      }
      return 0;
    });

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = filtered.slice(start, end).map(p => ({
      ...p,
      artist: p.artistId ? (artistIndex[p.artistId] || null) : null
    }));

    return { products: slice, totalCount };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const artists = this._getFromStorage('artists');
    const artistIndex = this._indexById(artists);
    const productRaw = products.find(p => p.id === productId) || null;
    const product = productRaw
      ? { ...productRaw, artist: productRaw.artistId ? (artistIndex[productRaw.artistId] || null) : null }
      : null;

    const relatedProducts = products
      .filter(p => p.id !== productId && p.category && product && p.category === product.category)
      .slice(0, 8)
      .map(p => ({ ...p, artist: p.artistId ? (artistIndex[p.artistId] || null) : null }));

    return { product, artist: product ? product.artist : null, relatedProducts };
  }

  // getUserWishlists()
  getUserWishlists() {
    return this._getFromStorage('wishlists');
  }

  // createWishlist(name, description, initialProductId)
  createWishlist(name, description, initialProductId) {
    const wishlists = this._getFromStorage('wishlists');
    const now = this._nowIso();
    const wishlist = {
      id: this._generateId('wishlist'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);

    if (initialProductId) {
      const items = this._getFromStorage('wishlist_items');
      const item = {
        id: this._generateId('wishlistitem'),
        wishlistId: wishlist.id,
        productId: initialProductId,
        addedAt: now,
        notes: ''
      };
      items.push(item);
      this._saveToStorage('wishlist_items', items);
    }

    return { wishlist };
  }

  // addProductToWishlist(productId, wishlistId, notes)
  addProductToWishlist(productId, wishlistId, notes) {
    const items = this._getFromStorage('wishlist_items');
    const now = this._nowIso();
    const item = {
      id: this._generateId('wishlistitem'),
      wishlistId,
      productId,
      addedAt: now,
      notes: notes || ''
    };
    items.push(item);
    this._saveToStorage('wishlist_items', items);
    const [resolved] = this._resolveWishlistItems([item]);
    return { wishlistItem: resolved };
  }

  // getWishlistDetails(wishlistId)
  getWishlistDetails(wishlistId) {
    const wishlists = this._getFromStorage('wishlists');
    const wishlist = wishlists.find(w => w.id === wishlistId) || null;
    const itemsRaw = this._getFromStorage('wishlist_items').filter(i => i.wishlistId === wishlistId);
    const resolved = this._resolveWishlistItems(itemsRaw).map(r => ({
      wishlistItem: r,
      product: r.product,
      wishlist: r.wishlist
    }));
    return { wishlist, items: resolved };
  }

  // removeProductFromWishlist(wishlistItemId)
  removeProductFromWishlist(wishlistItemId) {
    let items = this._getFromStorage('wishlist_items');
    const before = items.length;
    items = items.filter(i => i.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', items);
    const removed = before !== items.length;
    return { success: removed, message: removed ? 'Removed from wishlist' : 'Item not found' };
  }

  // getArtistFilterOptions()
  getArtistFilterOptions() {
    const artists = this._getFromStorage('artists');
    const stylesSet = new Set();
    for (const a of artists) {
      if (a.primaryStyle) stylesSet.add(a.primaryStyle);
      if (Array.isArray(a.styleTags)) {
        for (const s of a.styleTags) {
          if (s) stylesSet.add(s);
        }
      }
    }
    const styles = Array.from(stylesSet).map(value => ({ value: value.toLowerCase(), label: value }));

    const minProjectCountPresets = [
      { minCount: 1, label: '1+ projects' },
      { minCount: 5, label: '5+ projects' },
      { minCount: 10, label: '10+ projects' }
    ];

    const sortOptions = [
      { value: 'most_followers', label: 'Most Followers' },
      { value: 'alphabetical', label: 'A-Z' }
    ];

    return { styles, minProjectCountPresets, sortOptions };
  }

  // listArtists(filters, sortBy, page, pageSize)
  listArtists(filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'most_followers';
    page = page || 1;
    pageSize = pageSize || 20;

    const artists = this._getFromStorage('artists');

    let filtered = artists.filter(a => {
      if (filters.style) {
        const styleLower = filters.style.toLowerCase();
        const primary = (a.primaryStyle || '').toLowerCase();
        const tags = (a.styleTags || []).map(s => (s || '').toLowerCase());
        const matches = primary === styleLower || tags.includes(styleLower);
        if (!matches) return false;
      }
      if (typeof filters.minCompletedProjects === 'number') {
        if ((a.completedProjectCount || 0) < filters.minCompletedProjects) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'most_followers') {
        return (b.followerCount || 0) - (a.followerCount || 0);
      }
      if (sortBy === 'alphabetical') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = filtered.slice(start, end);
    return { artists: slice, totalCount };
  }

  // getArtistProfile(artistId)
  getArtistProfile(artistId) {
    const artists = this._getFromStorage('artists');
    const artist = artists.find(a => a.id === artistId) || null;
    const projects = this._getFromStorage('projects').filter(p => p.artistId === artistId);
    const products = this._getFromStorage('products').filter(p => p.artistId === artistId);
    const follows = this._getFromStorage('artist_follows');
    const followRecord = follows.find(f => f.artistId === artistId) || null;
    const follow = followRecord
      ? {
          isFollowed: true,
          notifyNewProjects: !!followRecord.notifyNewProjects,
          notifyNewPosts: !!followRecord.notifyNewPosts
        }
      : {
          isFollowed: false,
          notifyNewProjects: false,
          notifyNewPosts: false
        };
    return { artist, projects, products, follow };
  }

  // followArtist(artistId, followBool)
  followArtist(artistId, followBool) {
    let follows = this._getFromStorage('artist_follows');
    const now = this._nowIso();
    let record = follows.find(f => f.artistId === artistId) || null;

    if (followBool) {
      if (!record) {
        record = {
          id: this._generateId('follow'),
          artistId,
          followedAt: now,
          notifyNewProjects: true,
          notifyNewPosts: false
        };
        follows.push(record);
      } else {
        record.followedAt = record.followedAt || now;
      }
      this._saveToStorage('artist_follows', follows);
      return { artistFollow: record };
    }

    // Unfollow: remove record
    follows = follows.filter(f => f.artistId !== artistId);
    this._saveToStorage('artist_follows', follows);
    return { artistFollow: null };
  }

  // updateArtistNotificationSettings(artistId, notifyNewProjects, notifyNewPosts)
  updateArtistNotificationSettings(artistId, notifyNewProjects, notifyNewPosts) {
    const follows = this._getFromStorage('artist_follows');
    let record = follows.find(f => f.artistId === artistId) || null;
    const now = this._nowIso();

    if (!record) {
      record = {
        id: this._generateId('follow'),
        artistId,
        followedAt: now,
        notifyNewProjects: !!notifyNewProjects,
        notifyNewPosts: !!notifyNewPosts
      };
      follows.push(record);
    } else {
      if (typeof notifyNewProjects === 'boolean') {
        record.notifyNewProjects = notifyNewProjects;
      }
      if (typeof notifyNewPosts === 'boolean') {
        record.notifyNewPosts = notifyNewPosts;
      }
    }

    this._saveToStorage('artist_follows', follows);
    return { artistFollow: record };
  }

  // getFollowedArtists()
  getFollowedArtists() {
    const follows = this._getFromStorage('artist_follows');
    const artists = this._getFromStorage('artists');
    const artistIndex = this._indexById(artists);
    return follows.map(f => ({
      artist: artistIndex[f.artistId] || null,
      follow: { ...f, artist: artistIndex[f.artistId] || null }
    }));
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events');
    const formatsSet = new Set();
    const topicsSet = new Set();
    const difficultiesSet = new Set();
    for (const e of events) {
      if (e.format) formatsSet.add(e.format);
      if (e.topic) topicsSet.add(e.topic);
      if (e.difficulty) difficultiesSet.add(e.difficulty);
    }

    const formats = Array.from(formatsSet).map(value => ({ value, label: value }));
    const topics = Array.from(topicsSet).map(value => ({ value, label: value }));
    const difficulties = Array.from(difficultiesSet).map(value => ({ value, label: value }));

    const priceRanges = [
      { minPrice: 0, maxPrice: 25, label: 'Up to $25' },
      { minPrice: 0, maxPrice: 40, label: 'Up to $40' },
      { minPrice: 0, maxPrice: 100, label: 'Up to $100' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'date_soonest_first', label: 'Date: Soonest First' }
    ];

    return { formats, topics, difficulties, priceRanges, sortOptions };
  }

  // listEvents(filters, sortBy, page, pageSize)
  listEvents(filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'date_soonest_first';
    page = page || 1;
    pageSize = pageSize || 20;

    const events = this._getFromStorage('events');
    const dateFrom = this._parseDate(filters.dateFromIso);
    const dateTo = this._parseDate(filters.dateToIso);

    let filtered = events.filter(e => {
      if (filters.format && e.format && e.format !== filters.format) return false;
      if (filters.topic && e.topic && e.topic !== filters.topic) return false;
      if (filters.difficulty && e.difficulty && e.difficulty !== filters.difficulty) return false;
      if (typeof filters.minPrice === 'number' && (e.price || 0) < filters.minPrice) return false;
      if (typeof filters.maxPrice === 'number' && (e.price || 0) > filters.maxPrice) return false;
      if (filters.onlyWorkshops && e.isWorkshop === false) return false;
      const d = this._parseDate(e.startDateTime);
      if (dateFrom && d && d < dateFrom) return false;
      if (dateTo && d && d > dateTo) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'price_low_to_high') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'date_soonest_first') {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return da - db;
      }
      return 0;
    });

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = filtered.slice(start, end);

    return { events: slice, totalCount };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    return { event };
  }

  // registerForEvent(eventId, registrantName, city, experienceNotes, paymentMethod)
  registerForEvent(eventId, registrantName, city, experienceNotes, paymentMethod) {
    const registrations = this._getFromStorage('event_registrations');
    const now = this._nowIso();
    const registration = {
      id: this._generateId('eventreg'),
      eventId,
      registrantName,
      city: city || '',
      experienceNotes: experienceNotes || '',
      paymentMethod,
      paymentStatus: 'pending',
      createdAt: now
    };
    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    return { registration: { ...registration, event } };
  }

  // getMyLibraryOverview()
  getMyLibraryOverview() {
    const projectCollections = this.getUserProjectCollections();
    const readingLists = this._getFromStorage('reading_lists');
    const readingListItems = this._getFromStorage('reading_list_items');
    const wishlists = this._getFromStorage('wishlists');
    const wishlistItems = this._getFromStorage('wishlist_items');
    const materialsLists = this._getFromStorage('materials_lists');
    const materialsListItems = this._getFromStorage('materials_list_items');
    const followedArtists = this.getFollowedArtists();

    const readingListsSummary = readingLists.map(rl => ({
      readingList: rl,
      itemCount: readingListItems.filter(i => i.readingListId === rl.id).length
    }));

    const wishlistsSummary = wishlists.map(wl => ({
      wishlist: wl,
      itemCount: wishlistItems.filter(i => i.wishlistId === wl.id).length
    }));

    const materialsListsSummary = materialsLists.map(ml => ({
      materialsList: ml,
      itemCount: materialsListItems.filter(i => i.materialsListId === ml.id).length
    }));

    // Ensure follow objects also contain artist (FK resolution already done in getFollowedArtists)

    return {
      projectCollections,
      readingLists: readingListsSummary,
      wishlists: wishlistsSummary,
      materialsLists: materialsListsSummary,
      followedArtists
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      title: 'About the Woodworking Art Community',
      sections: [
        {
          heading: 'Our Mission',
          body: 'This site helps woodworkers share projects, learn new skills, and connect with artists around the world.'
        },
        {
          heading: 'Getting Started',
          body: 'Browse projects, save ideas into collections, follow artists you like, and track materials and reading lists in My Library.'
        }
      ]
    };
  }

  // getHelpContent()
  getHelpContent() {
    return {
      faqs: [
        {
          question: 'How do I save a project to a collection?',
          answer: 'Open a project and use the Save to Collection action. You can create a new collection or add to an existing one.',
          topic: 'projects'
        },
        {
          question: 'How do I register for a workshop?',
          answer: 'Go to Events & Workshops, open a workshop, and use the Register button to submit your registration.',
          topic: 'events'
        },
        {
          question: 'Where can I see everything I\'ve saved?',
          answer: 'Use the My Library section to see your project collections, reading lists, wishlists, materials lists, and followed artists.',
          topic: 'collections'
        }
      ],
      communityGuidelines: 'Be respectful, stay on topic, and share constructive feedback. Do not post hateful, abusive, or unsafe content.',
      supportContact: {
        email: 'support@example.com',
        additionalInfo: 'For account issues or bug reports, contact us via email with as much detail as possible.'
      }
    };
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    const messages = this._getFromStorage('contact_messages');
    const entry = {
      id: this._generateId('contact'),
      name,
      email,
      topic: topic || 'general_feedback',
      message,
      createdAt: this._nowIso()
    };
    messages.push(entry);
    this._saveToStorage('contact_messages', messages);
    return { success: true, message: 'Message submitted' };
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
