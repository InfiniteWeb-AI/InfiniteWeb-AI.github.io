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

  // -------------------- Init & Storage Helpers --------------------

  _initStorage() {
    const keys = [
      'categories',
      'images',
      'image_versions',
      'tags',
      'image_tags',
      'collections',
      'collection_items',
      'slideshows',
      'slideshow_items',
      'boards',
      'board_items',
      'bookmarks',
      'download_queues',
      'download_queue_items',
      'usage_requests',
      'static_pages',
      'contact_info',
      'contact_forms',
      'exports'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        if (key === 'contact_info') {
          // single object container
          localStorage.setItem(
            key,
            JSON.stringify({
              emailAddresses: [],
              phoneNumbers: [],
              generalGuidanceHtml: ''
            })
          );
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
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

  _enumLabel(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  _buildCategoryMap() {
    const categories = this._getFromStorage('categories');
    const map = {};
    categories.forEach((c) => {
      if (c && c.code) {
        map[c.code] = c.name || c.code;
      }
    });
    return map;
  }

  // Build imageId -> Set<tagName>
  _buildImageTagIndex() {
    const imageTags = this._getFromStorage('image_tags');
    const tags = this._getFromStorage('tags');
    const tagById = {};
    tags.forEach((t) => {
      if (t && t.id) tagById[t.id] = t;
    });
    const index = {};
    imageTags.forEach((it) => {
      if (!it || !it.imageId || !it.tagId) return;
      const tag = tagById[it.tagId];
      if (!tag) return;
      if (!index[it.imageId]) index[it.imageId] = new Set();
      index[it.imageId].add(tag.name);
    });
    return index;
  }

  _getTagNamesForImage(image, imageTagIndex) {
    const set = new Set();
    if (image && Array.isArray(image.tags)) {
      image.tags.forEach((t) => set.add(t));
    }
    if (image && imageTagIndex[image.id]) {
      imageTagIndex[image.id].forEach((t) => set.add(t));
    }
    return Array.from(set);
  }

  _filterImagesBase(images, options) {
    const query = (options && options.query ? String(options.query) : '').trim().toLowerCase();
    const filters = options && options.filters ? options.filters : {};
    const categoryCode = options && options.categoryCode ? options.categoryCode : null;
    const subcategory = options && options.subcategory ? options.subcategory : null;

    const imageTagIndex = this._buildImageTagIndex();

    let filtered = images.filter((img) => {
      if (!img) return false;

      if (categoryCode && img.categoryCode !== categoryCode) return false;
      if (subcategory && img.subcategory !== subcategory) return false;

      if (query) {
        const inTitle = (img.title || '').toLowerCase().includes(query);
        const inDesc = (img.description || '').toLowerCase().includes(query);
        const tagNames = this._getTagNamesForImage(img, imageTagIndex);
        const inTags = tagNames.some((t) => (t || '').toLowerCase().includes(query));
        const inLocation = (img.locationName || '').toLowerCase().includes(query);
        if (!inTitle && !inDesc && !inTags && !inLocation) return false;
      }

      if (filters.orientation && Array.isArray(filters.orientation) && filters.orientation.length > 0) {
        if (!filters.orientation.includes(img.orientation)) return false;
      }

      if (typeof filters.minWidth === 'number' && img.width < filters.minWidth) return false;
      if (typeof filters.maxWidth === 'number' && img.width > filters.maxWidth) return false;
      if (typeof filters.minHeight === 'number' && img.height < filters.minHeight) return false;
      if (typeof filters.maxHeight === 'number' && img.height > filters.maxHeight) return false;
      if (typeof filters.minLongestSide === 'number' && img.longestSide < filters.minLongestSide) return false;
      if (typeof filters.maxLongestSide === 'number' && img.longestSide > filters.maxLongestSide) return false;

      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        const imgDate = new Date(img.captureDate);
        if (imgDate < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        const imgDate = new Date(img.captureDate);
        if (imgDate > to) return false;
      }

      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        const tagNames = this._getTagNamesForImage(img, imageTagIndex);
        const hasAll = filters.tags.every((t) => tagNames.includes(t));
        if (!hasAll) return false;
      }

      if (filters.colorMode && img.colorMode !== filters.colorMode) return false;

      if (filters.licenseTypes && Array.isArray(filters.licenseTypes) && filters.licenseTypes.length > 0) {
        if (!filters.licenseTypes.includes(img.licenseType)) return false;
      }

      if (filters.accessLevels && Array.isArray(filters.accessLevels) && filters.accessLevels.length > 0) {
        if (!filters.accessLevels.includes(img.accessLevel)) return false;
      }

      if (typeof filters.isPressReady === 'boolean') {
        if (!!img.isPressReady !== filters.isPressReady) return false;
      }

      if (filters.locationBoundingBox) {
        const box = filters.locationBoundingBox;
        if (
          typeof img.latitude !== 'number' ||
          typeof img.longitude !== 'number' ||
          img.latitude < box.minLatitude ||
          img.latitude > box.maxLatitude ||
          img.longitude < box.minLongitude ||
          img.longitude > box.maxLongitude
        ) {
          return false;
        }
      }

      return true;
    });

    return filtered;
  }

  _sortImages(images, sortBy) {
    const arr = images.slice();
    if (sortBy === 'capture_date_oldest_first') {
      arr.sort((a, b) => new Date(a.captureDate) - new Date(b.captureDate));
    } else if (sortBy === 'capture_date_newest_first') {
      arr.sort((a, b) => new Date(b.captureDate) - new Date(a.captureDate));
    }
    // 'relevance' or unknown: keep original order
    return arr;
  }

  _getBookmarkedImageIdSet() {
    const bookmarks = this._getFromStorage('bookmarks');
    const set = new Set();
    bookmarks.forEach((b) => {
      if (b && b.imageId) set.add(b.imageId);
    });
    return set;
  }

  // Internal helper to retrieve or create single-user download queue
  _getOrCreateDownloadQueue() {
    let queues = this._getFromStorage('download_queues');
    let queue = queues[0] || null;
    const now = this._nowISO();
    if (!queue) {
      queue = {
        id: this._generateId('dq'),
        createdAt: now,
        updatedAt: now
      };
      queues.push(queue);
      this._saveToStorage('download_queues', queues);
    }
    return queue;
  }

  // Internal helper to load user-related state
  _getUserState() {
    const collections = this._getFromStorage('collections');
    const slideshows = this._getFromStorage('slideshows');
    const boards = this._getFromStorage('boards');
    const bookmarks = this._getFromStorage('bookmarks');
    const downloadQueues = this._getFromStorage('download_queues');
    const downloadQueueItems = this._getFromStorage('download_queue_items');
    return {
      collections,
      slideshows,
      boards,
      bookmarks,
      downloadQueues,
      downloadQueueItems
    };
  }

  // Internal helper to update ordered positions for ordered items
  _updateOrderedPositions(items, orderedIds, idField) {
    const idKey = idField || 'id';
    const posById = {};
    orderedIds.forEach((id, index) => {
      posById[id] = index;
    });
    return items.map((item) => {
      if (Object.prototype.hasOwnProperty.call(posById, item[idKey])) {
        return { ...item, position: posById[item[idKey]] };
      }
      return item;
    });
  }

  // -------------------- Core Interface Implementations --------------------

  // getNavigationCategories
  getNavigationCategories() {
    return this._getFromStorage('categories');
  }

  // getUserDashboardSummary
  getUserDashboardSummary() {
    const collections = this._getFromStorage('collections');
    const slideshows = this._getFromStorage('slideshows');
    const boards = this._getFromStorage('boards');
    const bookmarks = this._getFromStorage('bookmarks');
    const downloadQueueItems = this._getFromStorage('download_queue_items');

    const sortByUpdated = (list) => {
      return list
        .slice()
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    };

    return {
      collectionsCount: collections.length,
      slideshowsCount: slideshows.length,
      boardsCount: boards.length,
      bookmarksCount: bookmarks.length,
      downloadQueueItemsCount: downloadQueueItems.length,
      recentCollections: sortByUpdated(collections).slice(0, 3),
      recentSlideshows: sortByUpdated(slideshows).slice(0, 3),
      recentBoards: sortByUpdated(boards).slice(0, 3)
    };
  }

  // getHomepageFeaturedContent
  getHomepageFeaturedContent() {
    const images = this._getFromStorage('images');
    const collections = this._getFromStorage('collections');
    const categoryMap = this._buildCategoryMap();

    const featuredImages = images.slice(0, 5).map((img) => ({
      image: img,
      categoryName: categoryMap[img.categoryCode] || '',
      thumbnailUrl: null
    }));

    const featuredCollections = collections
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 5);

    return {
      featuredImages,
      featuredCollections
    };
  }

  // globalSearchImages(query, filters, sortBy, page, pageSize)
  globalSearchImages(query, filters, sortBy, page, pageSize) {
    const images = this._getFromStorage('images');
    const categoryMap = this._buildCategoryMap();
    const bookmarkedSet = this._getBookmarkedImageIdSet();

    const effectiveSortBy = sortBy || 'relevance';
    const effectivePage = page && page > 0 ? page : 1;
    const effectivePageSize = pageSize && pageSize > 0 ? pageSize : 30;

    const filtered = this._filterImagesBase(images, {
      query,
      filters: filters || {}
    });

    const sorted = this._sortImages(filtered, effectiveSortBy);
    const total = sorted.length;
    const start = (effectivePage - 1) * effectivePageSize;
    const end = start + effectivePageSize;
    const pageItems = sorted.slice(start, end);

    const results = pageItems.map((img) => ({
      image: img,
      categoryName: categoryMap[img.categoryCode] || '',
      thumbnailUrl: null,
      isBookmarked: bookmarkedSet.has(img.id)
    }));

    return {
      total,
      page: effectivePage,
      pageSize: effectivePageSize,
      results
    };
  }

  // getGalleryFilterOptions(categoryCode, subcategory, query)
  getGalleryFilterOptions(categoryCode, subcategory, query) {
    const images = this._getFromStorage('images');

    const baseImages = this._filterImagesBase(images, {
      categoryCode: categoryCode || null,
      subcategory: subcategory || null,
      query: query || '',
      filters: {}
    });

    const orientations = ['portrait', 'landscape', 'panorama'].map((o) => ({
      value: o,
      label: this._enumLabel(o),
      count: baseImages.filter((img) => img.orientation === o).length
    }));

    const colorModes = ['color', 'black_white'].map((cm) => ({
      value: cm,
      label: cm === 'black_white' ? 'Black & White' : 'Color',
      count: baseImages.filter((img) => img.colorMode === cm).length
    }));

    const licenseTypesList = ['public_domain', 'cc_by', 'cc_by_nc', 'institutional_use_only', 'restricted', 'permission_required', 'other'];
    const licenseTypes = licenseTypesList.map((lt) => ({
      value: lt,
      label: this._enumLabel(lt),
      count: baseImages.filter((img) => img.licenseType === lt).length
    }));

    const accessLevelsList = ['unrestricted', 'restricted', 'permission_required'];
    const accessLevels = accessLevelsList.map((al) => ({
      value: al,
      label: this._enumLabel(al),
      count: baseImages.filter((img) => img.accessLevel === al).length
    }));

    let minDate = null;
    let maxDate = null;
    baseImages.forEach((img) => {
      if (!img.captureDate) return;
      const d = new Date(img.captureDate);
      if (!minDate || d < new Date(minDate)) minDate = d.toISOString();
      if (!maxDate || d > new Date(maxDate)) maxDate = d.toISOString();
    });

    let minWidth = null,
      maxWidth = null,
      minHeight = null,
      maxHeight = null,
      minLongestSide = null,
      maxLongestSide = null;
    baseImages.forEach((img) => {
      if (typeof img.width === 'number') {
        if (minWidth === null || img.width < minWidth) minWidth = img.width;
        if (maxWidth === null || img.width > maxWidth) maxWidth = img.width;
      }
      if (typeof img.height === 'number') {
        if (minHeight === null || img.height < minHeight) minHeight = img.height;
        if (maxHeight === null || img.height > maxHeight) maxHeight = img.height;
      }
      if (typeof img.longestSide === 'number') {
        if (minLongestSide === null || img.longestSide < minLongestSide) minLongestSide = img.longestSide;
        if (maxLongestSide === null || img.longestSide > maxLongestSide) maxLongestSide = img.longestSide;
      }
    });

    let minLatitude = null,
      maxLatitude = null,
      minLongitude = null,
      maxLongitude = null;
    baseImages.forEach((img) => {
      if (typeof img.latitude === 'number' && typeof img.longitude === 'number') {
        if (minLatitude === null || img.latitude < minLatitude) minLatitude = img.latitude;
        if (maxLatitude === null || img.latitude > maxLatitude) maxLatitude = img.latitude;
        if (minLongitude === null || img.longitude < minLongitude) minLongitude = img.longitude;
        if (maxLongitude === null || img.longitude > maxLongitude) maxLongitude = img.longitude;
      }
    });

    const tags = this._getFromStorage('tags');

    return {
      orientations,
      tags,
      colorModes,
      licenseTypes,
      accessLevels,
      captureDateRange: {
        minDate,
        maxDate
      },
      resolutionRange: {
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        minLongestSide,
        maxLongestSide
      },
      locationBoundsHint: {
        minLatitude,
        maxLatitude,
        minLongitude,
        maxLongitude
      }
    };
  }

  // searchImages(categoryCode, subcategory, query, filters, sortBy, page, pageSize)
  searchImages(categoryCode, subcategory, query, filters, sortBy, page, pageSize) {
    const images = this._getFromStorage('images');
    const categoryMap = this._buildCategoryMap();
    const bookmarkedSet = this._getBookmarkedImageIdSet();

    const effectiveSortBy = sortBy || 'relevance';
    const effectivePage = page && page > 0 ? page : 1;
    const effectivePageSize = pageSize && pageSize > 0 ? pageSize : 30;

    const filtered = this._filterImagesBase(images, {
      categoryCode: categoryCode || null,
      subcategory: subcategory || null,
      query: query || '',
      filters: filters || {}
    });

    const sorted = this._sortImages(filtered, effectiveSortBy);
    const total = sorted.length;
    const start = (effectivePage - 1) * effectivePageSize;
    const end = start + effectivePageSize;
    const pageItems = sorted.slice(start, end);

    const results = pageItems.map((img) => ({
      image: img,
      categoryName: categoryMap[img.categoryCode] || '',
      thumbnailUrl: null,
      isBookmarked: bookmarkedSet.has(img.id)
    }));

    return {
      total,
      page: effectivePage,
      pageSize: effectivePageSize,
      results
    };
  }

  // getGalleryMapData(categoryCode, filters, viewport)
  getGalleryMapData(categoryCode, filters, viewport) {
    const images = this._getFromStorage('images');
    const effFilters = filters || {};

    const { minLatitude, maxLatitude, minLongitude, maxLongitude } = viewport || {};

    const points = images
      .filter((img) => {
        if (!img) return false;
        if (categoryCode && img.categoryCode !== categoryCode) return false;

        if (effFilters.licenseTypes && Array.isArray(effFilters.licenseTypes) && effFilters.licenseTypes.length > 0) {
          if (!effFilters.licenseTypes.includes(img.licenseType)) return false;
        }
        if (effFilters.accessLevels && Array.isArray(effFilters.accessLevels) && effFilters.accessLevels.length > 0) {
          if (!effFilters.accessLevels.includes(img.accessLevel)) return false;
        }

        if (typeof img.latitude !== 'number' || typeof img.longitude !== 'number') return false;
        if (typeof minLatitude === 'number' && img.latitude < minLatitude) return false;
        if (typeof maxLatitude === 'number' && img.latitude > maxLatitude) return false;
        if (typeof minLongitude === 'number' && img.longitude < minLongitude) return false;
        if (typeof maxLongitude === 'number' && img.longitude > maxLongitude) return false;

        return true;
      })
      .map((img) => ({
        imageId: img.id,
        latitude: img.latitude,
        longitude: img.longitude,
        thumbnailUrl: null,
        title: img.title
      }));

    return { points };
  }

  // getImageDetail(imageId)
  getImageDetail(imageId) {
    const images = this._getFromStorage('images');
    const categories = this._getFromStorage('categories');
    const bookmarks = this._getFromStorage('bookmarks');
    const collectionItems = this._getFromStorage('collection_items');
    const slideshowItems = this._getFromStorage('slideshow_items');
    const boardItems = this._getFromStorage('board_items');

    const image = images.find((img) => img.id === imageId) || null;
    if (!image) {
      return {
        image: null,
        categoryName: '',
        subcategory: null,
        thumbnailUrl: null,
        isBookmarked: false,
        collectionsCount: 0,
        slideshowsCount: 0,
        boardsCount: 0
      };
    }

    const category = categories.find((c) => c.code === image.categoryCode) || null;
    const isBookmarked = bookmarks.some((b) => b.imageId === imageId);
    const collectionsCount = collectionItems.filter((ci) => ci.imageId === imageId).length;
    const slideshowsCount = slideshowItems.filter((si) => si.imageId === imageId).length;
    const boardsCount = boardItems.filter((bi) => bi.imageId === imageId).length;

    return {
      image,
      categoryName: category ? category.name : '',
      subcategory: image.subcategory || null,
      thumbnailUrl: null,
      isBookmarked,
      collectionsCount,
      slideshowsCount,
      boardsCount
    };
  }

  // getImageVersions(imageId)
  getImageVersions(imageId) {
    const versions = this._getFromStorage('image_versions');
    return versions.filter((v) => v.imageId === imageId);
  }

  // addImageToCollection(imageId, collectionId, newCollectionName)
  addImageToCollection(imageId, collectionId, newCollectionName) {
    const images = this._getFromStorage('images');
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const image = images.find((img) => img.id === imageId);
    if (!image) {
      return { success: false, collection: null, message: 'Image not found' };
    }

    let targetCollection = null;
    const now = this._nowISO();

    if (collectionId) {
      targetCollection = collections.find((c) => c.id === collectionId) || null;
      if (!targetCollection) {
        return { success: false, collection: null, message: 'Collection not found' };
      }
      targetCollection.updatedAt = now;
    } else if (newCollectionName) {
      targetCollection = {
        id: this._generateId('col'),
        name: newCollectionName,
        description: '',
        createdAt: now,
        updatedAt: now
      };
      collections.push(targetCollection);
    } else {
      return { success: false, collection: null, message: 'No collection specified' };
    }

    const currentItems = collectionItems.filter((ci) => ci.collectionId === targetCollection.id);
    const nextPosition = currentItems.length > 0 ? Math.max(...currentItems.map((ci) => ci.position || 0)) + 1 : 0;

    const newItem = {
      id: this._generateId('coli'),
      collectionId: targetCollection.id,
      imageId,
      position: nextPosition,
      addedAt: now
    };

    collectionItems.push(newItem);

    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', collectionItems);

    return { success: true, collection: targetCollection, message: 'Image added to collection' };
  }

  // addImageToSlideshow(imageId, slideshowId, newSlideshowName)
  addImageToSlideshow(imageId, slideshowId, newSlideshowName) {
    const images = this._getFromStorage('images');
    const slideshows = this._getFromStorage('slideshows');
    const slideshowItems = this._getFromStorage('slideshow_items');

    const image = images.find((img) => img.id === imageId);
    if (!image) {
      return { success: false, slideshow: null, message: 'Image not found' };
    }

    let targetSlideshow = null;
    const now = this._nowISO();

    if (slideshowId) {
      targetSlideshow = slideshows.find((s) => s.id === slideshowId) || null;
      if (!targetSlideshow) {
        return { success: false, slideshow: null, message: 'Slideshow not found' };
      }
      targetSlideshow.updatedAt = now;
    } else if (newSlideshowName) {
      targetSlideshow = {
        id: this._generateId('ss'),
        name: newSlideshowName,
        description: '',
        createdAt: now,
        updatedAt: now
      };
      slideshows.push(targetSlideshow);
    } else {
      return { success: false, slideshow: null, message: 'No slideshow specified' };
    }

    const currentItems = slideshowItems.filter((si) => si.slideshowId === targetSlideshow.id);
    const nextPosition = currentItems.length > 0 ? Math.max(...currentItems.map((si) => si.position || 0)) + 1 : 0;

    const newItem = {
      id: this._generateId('ssi'),
      slideshowId: targetSlideshow.id,
      imageId,
      position: nextPosition,
      addedAt: now
    };

    slideshowItems.push(newItem);

    this._saveToStorage('slideshows', slideshows);
    this._saveToStorage('slideshow_items', slideshowItems);

    return { success: true, slideshow: targetSlideshow, message: 'Image added to slideshow' };
  }

  // addImageToBoard(imageId, boardId, newBoardName, preferredPosition)
  addImageToBoard(imageId, boardId, newBoardName, preferredPosition) {
    const images = this._getFromStorage('images');
    const boards = this._getFromStorage('boards');
    const boardItems = this._getFromStorage('board_items');

    const image = images.find((img) => img.id === imageId);
    if (!image) {
      return { success: false, board: null, boardItem: null, message: 'Image not found' };
    }

    let targetBoard = null;
    const now = this._nowISO();

    if (boardId) {
      targetBoard = boards.find((b) => b.id === boardId) || null;
      if (!targetBoard) {
        return { success: false, board: null, boardItem: null, message: 'Board not found' };
      }
      targetBoard.updatedAt = now;
    } else if (newBoardName) {
      targetBoard = {
        id: this._generateId('bd'),
        name: newBoardName,
        description: '',
        layoutType: 'freeform',
        createdAt: now,
        updatedAt: now
      };
      boards.push(targetBoard);
    } else {
      return { success: false, board: null, boardItem: null, message: 'No board specified' };
    }

    const positionX = preferredPosition && typeof preferredPosition.positionX === 'number' ? preferredPosition.positionX : 0;
    const positionY = preferredPosition && typeof preferredPosition.positionY === 'number' ? preferredPosition.positionY : 0;

    const newItem = {
      id: this._generateId('bdi'),
      boardId: targetBoard.id,
      imageId,
      positionX,
      positionY,
      width: null,
      height: null,
      addedAt: now
    };

    boardItems.push(newItem);

    this._saveToStorage('boards', boards);
    this._saveToStorage('board_items', boardItems);

    return { success: true, board: targetBoard, boardItem: newItem, message: 'Image added to board' };
  }

  // bookmarkImage(imageId, notes)
  bookmarkImage(imageId, notes) {
    const images = this._getFromStorage('images');
    const bookmarks = this._getFromStorage('bookmarks');

    const image = images.find((img) => img.id === imageId);
    if (!image) {
      return { success: false, bookmark: null, message: 'Image not found' };
    }

    // Allow multiple bookmarks, but avoid exact duplicates by imageId if desired
    const existing = bookmarks.find((b) => b.imageId === imageId);
    if (existing) {
      // Update notes if provided
      if (typeof notes === 'string') {
        existing.notes = notes;
        existing.bookmarkedAt = this._nowISO();
        this._saveToStorage('bookmarks', bookmarks);
      }
      return { success: true, bookmark: existing, message: 'Image already bookmarked' };
    }

    const bookmark = {
      id: this._generateId('bm'),
      imageId,
      bookmarkedAt: this._nowISO(),
      notes: notes || ''
    };

    bookmarks.push(bookmark);
    this._saveToStorage('bookmarks', bookmarks);

    return { success: true, bookmark, message: 'Image bookmarked' };
  }

  // removeBookmark(bookmarkId)
  removeBookmark(bookmarkId) {
    const bookmarks = this._getFromStorage('bookmarks');
    const newBookmarks = bookmarks.filter((b) => b.id !== bookmarkId);
    this._saveToStorage('bookmarks', newBookmarks);
    return { success: true, message: 'Bookmark removed' };
  }

  // getBookmarks()
  getBookmarks() {
    const bookmarks = this._getFromStorage('bookmarks');
    const images = this._getFromStorage('images');

    return bookmarks.map((bookmark) => {
      const image = images.find((img) => img.id === bookmark.imageId) || null;
      return {
        bookmark,
        image,
        thumbnailUrl: null
      };
    });
  }

  // addImageVersionToDownloadQueue(imageVersionId)
  addImageVersionToDownloadQueue(imageVersionId) {
    const imageVersions = this._getFromStorage('image_versions');
    const downloadQueueItems = this._getFromStorage('download_queue_items');

    const version = imageVersions.find((v) => v.id === imageVersionId);
    if (!version) {
      return { success: false, downloadQueue: null, queueItem: null, message: 'Image version not found' };
    }

    const queue = this._getOrCreateDownloadQueue();
    const now = this._nowISO();

    const resolutionLabel = version.width && version.height ? `${version.width}x${version.height} px` : null;
    const fileName = version.label || `image_version_${version.id}`;

    const queueItem = {
      id: this._generateId('dqi'),
      downloadQueueId: queue.id,
      imageVersionId,
      addedAt: now,
      fileName,
      resolutionLabel,
      licenseType: version.licenseType
    };

    downloadQueueItems.push(queueItem);

    // update queue updatedAt
    let queues = this._getFromStorage('download_queues');
    queues = queues.map((q) => (q.id === queue.id ? { ...q, updatedAt: now } : q));

    this._saveToStorage('download_queue_items', downloadQueueItems);
    this._saveToStorage('download_queues', queues);

    return { success: true, downloadQueue: queue, queueItem, message: 'Added to download queue' };
  }

  // getDownloadQueue()
  getDownloadQueue() {
    const queues = this._getFromStorage('download_queues');
    const downloadQueueItems = this._getFromStorage('download_queue_items');
    const imageVersions = this._getFromStorage('image_versions');
    const images = this._getFromStorage('images');

    const queue = queues[0] || null;

    if (!queue) {
      return {
        downloadQueue: null,
        items: []
      };
    }

    const items = downloadQueueItems
      .filter((qi) => qi.downloadQueueId === queue.id)
      .map((qi) => {
        const imageVersion = imageVersions.find((v) => v.id === qi.imageVersionId) || null;
        const image = imageVersion ? images.find((img) => img.id === imageVersion.imageId) || null : null;
        return {
          queueItem: qi,
          imageVersion,
          image
        };
      });

    return {
      downloadQueue: queue,
      items
    };
  }

  // removeDownloadQueueItem(downloadQueueItemId)
  removeDownloadQueueItem(downloadQueueItemId) {
    const downloadQueueItems = this._getFromStorage('download_queue_items');
    const newItems = downloadQueueItems.filter((qi) => qi.id !== downloadQueueItemId);
    this._saveToStorage('download_queue_items', newItems);
    return { success: true, message: 'Item removed from download queue' };
  }

  // submitUsageRequest(imageId, imageVersionId, eventName, usagePeriodText, intendedUse, mediaType)
  submitUsageRequest(imageId, imageVersionId, eventName, usagePeriodText, intendedUse, mediaType) {
    const images = this._getFromStorage('images');
    const imageVersions = this._getFromStorage('image_versions');
    const usageRequests = this._getFromStorage('usage_requests');

    const image = images.find((img) => img.id === imageId);
    if (!image) {
      return { success: false, usageRequest: null, message: 'Image not found' };
    }

    if (imageVersionId) {
      const version = imageVersions.find((v) => v.id === imageVersionId);
      if (!version) {
        return { success: false, usageRequest: null, message: 'Image version not found' };
      }
    }

    let startDate = null;
    let endDate = null;
    if (usagePeriodText && typeof usagePeriodText === 'string') {
      const parts = usagePeriodText.split('to');
      if (parts.length === 2) {
        const startStr = parts[0].trim();
        const endStr = parts[1].trim();
        const sd = new Date(startStr);
        const ed = new Date(endStr);
        if (!isNaN(sd.getTime())) startDate = sd.toISOString();
        if (!isNaN(ed.getTime())) endDate = ed.toISOString();
      }
    }

    const now = this._nowISO();
    const usageRequest = {
      id: this._generateId('ur'),
      imageId,
      imageVersionId: imageVersionId || null,
      eventName,
      usagePeriodText,
      startDate,
      endDate,
      intendedUse,
      mediaType,
      submittedAt: now,
      status: 'submitted'
    };

    usageRequests.push(usageRequest);
    this._saveToStorage('usage_requests', usageRequests);

    return { success: true, usageRequest, message: 'Usage request submitted' };
  }

  // getCollectionsOverview()
  getCollectionsOverview() {
    return this._getFromStorage('collections');
  }

  // createCollection(name, description)
  createCollection(name, description) {
    const collections = this._getFromStorage('collections');
    const now = this._nowISO();
    const collection = {
      id: this._generateId('col'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);
    return { collection, success: true, message: 'Collection created' };
  }

  // renameCollection(collectionId, newName)
  renameCollection(collectionId, newName) {
    const collections = this._getFromStorage('collections');
    const now = this._nowISO();
    let updated = null;
    const updatedCollections = collections.map((c) => {
      if (c.id === collectionId) {
        updated = { ...c, name: newName, updatedAt: now };
        return updated;
      }
      return c;
    });
    this._saveToStorage('collections', updatedCollections);
    return { collection: updated, success: !!updated };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const newCollections = collections.filter((c) => c.id !== collectionId);
    const newItems = collectionItems.filter((ci) => ci.collectionId !== collectionId);

    this._saveToStorage('collections', newCollections);
    this._saveToStorage('collection_items', newItems);

    return { success: true, message: 'Collection deleted' };
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const images = this._getFromStorage('images');

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return {
        collection: null,
        items: []
      };
    }

    const itemsRaw = collectionItems
      .filter((ci) => ci.collectionId === collectionId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        if (pa !== pb) return pa - pb;
        return new Date(a.addedAt || 0) - new Date(b.addedAt || 0);
      });

    const items = itemsRaw.map((ci) => {
      const image = images.find((img) => img.id === ci.imageId) || null;
      return {
        collectionItem: ci,
        image,
        thumbnailUrl: null
      };
    });

    return {
      collection,
      items
    };
  }

  // reorderCollectionItems(collectionId, orderedCollectionItemIds)
  reorderCollectionItems(collectionId, orderedCollectionItemIds) {
    const collectionItems = this._getFromStorage('collection_items');
    const collections = this._getFromStorage('collections');

    const itemsForCollection = collectionItems.filter((ci) => ci.collectionId === collectionId);
    const otherItems = collectionItems.filter((ci) => ci.collectionId !== collectionId);

    const updatedForCollection = this._updateOrderedPositions(itemsForCollection, orderedCollectionItemIds, 'id');
    const updatedItems = [...otherItems, ...updatedForCollection];

    const now = this._nowISO();
    const updatedCollections = collections.map((c) => (c.id === collectionId ? { ...c, updatedAt: now } : c));

    this._saveToStorage('collection_items', updatedItems);
    this._saveToStorage('collections', updatedCollections);

    const collection = updatedCollections.find((c) => c.id === collectionId) || null;

    return {
      collection,
      items: updatedForCollection,
      success: true
    };
  }

  // removeImageFromCollection(collectionItemId)
  removeImageFromCollection(collectionItemId) {
    const collectionItems = this._getFromStorage('collection_items');
    const newItems = collectionItems.filter((ci) => ci.id !== collectionItemId);
    this._saveToStorage('collection_items', newItems);
    return { success: true };
  }

  // moveCollectionItem(collectionItemId, targetCollectionId)
  moveCollectionItem(collectionItemId, targetCollectionId) {
    const collectionItems = this._getFromStorage('collection_items');
    const collections = this._getFromStorage('collections');
    const now = this._nowISO();

    const targetCollection = collections.find((c) => c.id === targetCollectionId) || null;
    if (!targetCollection) {
      return { sourceCollection: null, targetCollection: null, success: false };
    }

    let sourceCollectionId = null;
    const updatedItems = collectionItems.map((ci) => {
      if (ci.id === collectionItemId) {
        sourceCollectionId = ci.collectionId;
        return { ...ci, collectionId: targetCollectionId };
      }
      return ci;
    });

    const updatedCollections = collections.map((c) => {
      if (c.id === sourceCollectionId || c.id === targetCollectionId) {
        return { ...c, updatedAt: now };
      }
      return c;
    });

    this._saveToStorage('collection_items', updatedItems);
    this._saveToStorage('collections', updatedCollections);

    const sourceCollection = updatedCollections.find((c) => c.id === sourceCollectionId) || null;
    const updatedTargetCollection = updatedCollections.find((c) => c.id === targetCollectionId) || null;

    return { sourceCollection, targetCollection: updatedTargetCollection, success: true };
  }

  // copyCollectionItem(collectionItemId, targetCollectionId)
  copyCollectionItem(collectionItemId, targetCollectionId) {
    const collectionItems = this._getFromStorage('collection_items');
    const collections = this._getFromStorage('collections');

    const sourceItem = collectionItems.find((ci) => ci.id === collectionItemId) || null;
    if (!sourceItem) {
      return { targetCollection: null, newCollectionItem: null, success: false };
    }

    const targetCollection = collections.find((c) => c.id === targetCollectionId) || null;
    if (!targetCollection) {
      return { targetCollection: null, newCollectionItem: null, success: false };
    }

    const now = this._nowISO();
    const targetItems = collectionItems.filter((ci) => ci.collectionId === targetCollectionId);
    const nextPosition = targetItems.length > 0 ? Math.max(...targetItems.map((ci) => ci.position || 0)) + 1 : 0;

    const newItem = {
      id: this._generateId('coli'),
      collectionId: targetCollectionId,
      imageId: sourceItem.imageId,
      position: nextPosition,
      addedAt: now
    };

    collectionItems.push(newItem);
    const updatedCollections = collections.map((c) => (c.id === targetCollectionId ? { ...c, updatedAt: now } : c));

    this._saveToStorage('collection_items', collectionItems);
    this._saveToStorage('collections', updatedCollections);

    const updatedTargetCollection = updatedCollections.find((c) => c.id === targetCollectionId) || null;

    return { targetCollection: updatedTargetCollection, newCollectionItem: newItem, success: true };
  }

  // createSlideshowFromCollection(collectionId, slideshowName, description)
  createSlideshowFromCollection(collectionId, slideshowName, description) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const slideshows = this._getFromStorage('slideshows');
    const slideshowItems = this._getFromStorage('slideshow_items');

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return { slideshow: null, items: [], success: false };
    }

    const now = this._nowISO();
    const slideshow = {
      id: this._generateId('ss'),
      name: slideshowName,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };

    slideshows.push(slideshow);

    const itemsForCollection = collectionItems
      .filter((ci) => ci.collectionId === collectionId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        if (pa !== pb) return pa - pb;
        return new Date(a.addedAt || 0) - new Date(b.addedAt || 0);
      });

    const newSlideshowItems = itemsForCollection.map((ci, index) => ({
      id: this._generateId('ssi'),
      slideshowId: slideshow.id,
      imageId: ci.imageId,
      position: index,
      addedAt: now
    }));

    slideshowItems.push(...newSlideshowItems);

    this._saveToStorage('slideshows', slideshows);
    this._saveToStorage('slideshow_items', slideshowItems);

    return { slideshow, items: newSlideshowItems, success: true };
  }

  // getSlideshowsOverview()
  getSlideshowsOverview() {
    return this._getFromStorage('slideshows');
  }

  // createSlideshow(name, description)
  createSlideshow(name, description) {
    const slideshows = this._getFromStorage('slideshows');
    const now = this._nowISO();
    const slideshow = {
      id: this._generateId('ss'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    slideshows.push(slideshow);
    this._saveToStorage('slideshows', slideshows);
    return { slideshow, success: true };
  }

  // renameSlideshow(slideshowId, newName)
  renameSlideshow(slideshowId, newName) {
    const slideshows = this._getFromStorage('slideshows');
    const now = this._nowISO();
    let updated = null;
    const updatedSlideshows = slideshows.map((s) => {
      if (s.id === slideshowId) {
        updated = { ...s, name: newName, updatedAt: now };
        return updated;
      }
      return s;
    });
    this._saveToStorage('slideshows', updatedSlideshows);
    return { slideshow: updated, success: !!updated };
  }

  // deleteSlideshow(slideshowId)
  deleteSlideshow(slideshowId) {
    const slideshows = this._getFromStorage('slideshows');
    const slideshowItems = this._getFromStorage('slideshow_items');

    const newSlideshows = slideshows.filter((s) => s.id !== slideshowId);
    const newItems = slideshowItems.filter((si) => si.slideshowId !== slideshowId);

    this._saveToStorage('slideshows', newSlideshows);
    this._saveToStorage('slideshow_items', newItems);

    return { success: true };
  }

  // getSlideshowDetail(slideshowId)
  getSlideshowDetail(slideshowId) {
    const slideshows = this._getFromStorage('slideshows');
    const slideshowItems = this._getFromStorage('slideshow_items');
    const images = this._getFromStorage('images');

    const slideshow = slideshows.find((s) => s.id === slideshowId) || null;
    if (!slideshow) {
      return { slideshow: null, items: [] };
    }

    const itemsRaw = slideshowItems
      .filter((si) => si.slideshowId === slideshowId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        if (pa !== pb) return pa - pb;
        return new Date(a.addedAt || 0) - new Date(b.addedAt || 0);
      });

    const items = itemsRaw.map((si) => {
      const image = images.find((img) => img.id === si.imageId) || null;
      return {
        slideshowItem: si,
        image,
        thumbnailUrl: null
      };
    });

    return { slideshow, items };
  }

  // reorderSlideshowItems(slideshowId, orderedSlideshowItemIds)
  reorderSlideshowItems(slideshowId, orderedSlideshowItemIds) {
    const slideshowItems = this._getFromStorage('slideshow_items');
    const slideshows = this._getFromStorage('slideshows');

    const itemsForSlideshow = slideshowItems.filter((si) => si.slideshowId === slideshowId);
    const otherItems = slideshowItems.filter((si) => si.slideshowId !== slideshowId);

    const updatedForSlideshow = this._updateOrderedPositions(itemsForSlideshow, orderedSlideshowItemIds, 'id');
    const updatedItems = [...otherItems, ...updatedForSlideshow];

    const now = this._nowISO();
    const updatedSlideshows = slideshows.map((s) => (s.id === slideshowId ? { ...s, updatedAt: now } : s));

    this._saveToStorage('slideshow_items', updatedItems);
    this._saveToStorage('slideshows', updatedSlideshows);

    const slideshow = updatedSlideshows.find((s) => s.id === slideshowId) || null;

    return {
      slideshow,
      items: updatedForSlideshow,
      success: true
    };
  }

  // removeImageFromSlideshow(slideshowItemId)
  removeImageFromSlideshow(slideshowItemId) {
    const slideshowItems = this._getFromStorage('slideshow_items');
    const newItems = slideshowItems.filter((si) => si.id !== slideshowItemId);
    this._saveToStorage('slideshow_items', newItems);
    return { success: true };
  }

  // updateSlideshowDescription(slideshowId, description)
  updateSlideshowDescription(slideshowId, description) {
    const slideshows = this._getFromStorage('slideshows');
    const now = this._nowISO();
    let updated = null;
    const updatedSlideshows = slideshows.map((s) => {
      if (s.id === slideshowId) {
        updated = { ...s, description, updatedAt: now };
        return updated;
      }
      return s;
    });
    this._saveToStorage('slideshows', updatedSlideshows);
    return { slideshow: updated, success: !!updated };
  }

  // getBoardsOverview()
  getBoardsOverview() {
    return this._getFromStorage('boards');
  }

  // createBoard(name, description, layoutType)
  createBoard(name, description, layoutType) {
    const boards = this._getFromStorage('boards');
    const now = this._nowISO();
    const board = {
      id: this._generateId('bd'),
      name,
      description: description || '',
      layoutType: layoutType || 'freeform',
      createdAt: now,
      updatedAt: now
    };
    boards.push(board);
    this._saveToStorage('boards', boards);
    return { board, success: true };
  }

  // renameBoard(boardId, newName)
  renameBoard(boardId, newName) {
    const boards = this._getFromStorage('boards');
    const now = this._nowISO();
    let updated = null;
    const updatedBoards = boards.map((b) => {
      if (b.id === boardId) {
        updated = { ...b, name: newName, updatedAt: now };
        return updated;
      }
      return b;
    });
    this._saveToStorage('boards', updatedBoards);
    return { board: updated, success: !!updated };
  }

  // deleteBoard(boardId)
  deleteBoard(boardId) {
    const boards = this._getFromStorage('boards');
    const boardItems = this._getFromStorage('board_items');

    const newBoards = boards.filter((b) => b.id !== boardId);
    const newItems = boardItems.filter((bi) => bi.boardId !== boardId);

    this._saveToStorage('boards', newBoards);
    this._saveToStorage('board_items', newItems);

    return { success: true };
  }

  // getBoardDetail(boardId)
  getBoardDetail(boardId) {
    const boards = this._getFromStorage('boards');
    const boardItems = this._getFromStorage('board_items');
    const images = this._getFromStorage('images');

    const board = boards.find((b) => b.id === boardId) || null;
    if (!board) {
      return { board: null, items: [] };
    }

    const itemsRaw = boardItems.filter((bi) => bi.boardId === boardId);

    const items = itemsRaw.map((bi) => {
      const image = images.find((img) => img.id === bi.imageId) || null;
      return {
        boardItem: bi,
        image,
        thumbnailUrl: null
      };
    });

    return { board, items };
  }

  // updateBoardItemPositions(boardId, positions)
  updateBoardItemPositions(boardId, positions) {
    const boardItems = this._getFromStorage('board_items');
    const boards = this._getFromStorage('boards');
    const now = this._nowISO();

    const posById = {};
    (positions || []).forEach((p) => {
      if (p && p.boardItemId) {
        posById[p.boardItemId] = { x: p.positionX, y: p.positionY };
      }
    });

    const updatedItems = boardItems.map((bi) => {
      if (bi.boardId === boardId && posById[bi.id]) {
        return {
          ...bi,
          positionX: posById[bi.id].x,
          positionY: posById[bi.id].y
        };
      }
      return bi;
    });

    const updatedBoards = boards.map((b) => (b.id === boardId ? { ...b, updatedAt: now } : b));

    this._saveToStorage('board_items', updatedItems);
    this._saveToStorage('boards', updatedBoards);

    const board = updatedBoards.find((b) => b.id === boardId) || null;
    const itemsForBoard = updatedItems.filter((bi) => bi.boardId === boardId);

    return { board, items: itemsForBoard, success: true };
  }

  // removeImageFromBoard(boardItemId)
  removeImageFromBoard(boardItemId) {
    const boardItems = this._getFromStorage('board_items');
    const newItems = boardItems.filter((bi) => bi.id !== boardItemId);
    this._saveToStorage('board_items', newItems);
    return { success: true };
  }

  // updateBoardNotes(boardId, notes)
  updateBoardNotes(boardId, notes) {
    const boards = this._getFromStorage('boards');
    const now = this._nowISO();
    let updated = null;
    const updatedBoards = boards.map((b) => {
      if (b.id === boardId) {
        updated = { ...b, description: notes, updatedAt: now };
        return updated;
      }
      return b;
    });
    this._saveToStorage('boards', updatedBoards);
    return { board: updated, success: !!updated };
  }

  // exportBoard(boardId, format)
  exportBoard(boardId, format) {
    const exportsArr = this._getFromStorage('exports');
    const exportId = this._generateId('exp');
    const now = this._nowISO();
    const record = {
      id: exportId,
      type: 'board',
      boardId,
      format,
      createdAt: now
    };
    exportsArr.push(record);
    this._saveToStorage('exports', exportsArr);
    return { success: true, exportId };
  }

  // exportCollection(collectionId, format)
  exportCollection(collectionId, format) {
    const exportsArr = this._getFromStorage('exports');
    const exportId = this._generateId('exp');
    const now = this._nowISO();
    const record = {
      id: exportId,
      type: 'collection',
      collectionId,
      format,
      createdAt: now
    };
    exportsArr.push(record);
    this._saveToStorage('exports', exportsArr);
    return { success: true, exportId };
  }

  // getStaticPageContent(pageCode)
  getStaticPageContent(pageCode) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find((p) => p.pageCode === pageCode) || null;
    if (!page) {
      return {
        title: '',
        bodyHtml: '',
        lastUpdated: ''
      };
    }
    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || '',
      lastUpdated: page.lastUpdated || ''
    };
  }

  // getContactInfo()
  getContactInfo() {
    const dataRaw = localStorage.getItem('contact_info');
    let data;
    try {
      data = dataRaw ? JSON.parse(dataRaw) : null;
    } catch (e) {
      data = null;
    }
    if (!data) {
      return {
        emailAddresses: [],
        phoneNumbers: [],
        generalGuidanceHtml: ''
      };
    }
    return {
      emailAddresses: Array.isArray(data.emailAddresses) ? data.emailAddresses : [],
      phoneNumbers: Array.isArray(data.phoneNumbers) ? data.phoneNumbers : [],
      generalGuidanceHtml: data.generalGuidanceHtml || ''
    };
  }

  // submitContactForm(name, email, subject, message, relatedImageId)
  submitContactForm(name, email, subject, message, relatedImageId) {
    const forms = this._getFromStorage('contact_forms');
    const now = this._nowISO();
    const form = {
      id: this._generateId('cf'),
      name,
      email,
      subject,
      message,
      relatedImageId: relatedImageId || null,
      submittedAt: now
    };
    forms.push(form);
    this._saveToStorage('contact_forms', forms);
    return { success: true, message: 'Contact form submitted' };
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