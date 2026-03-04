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
    this._getOrCreateDefaultLists();
  }

  // =========================
  // Storage helpers
  // =========================

  _initStorage() {
    // Legacy keys from template (kept for compatibility, but not used)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Domain-specific storage tables (arrays unless noted)
    const arrayKeys = [
      'catalog_items',
      'browse_categories',
      'lists',
      'list_items',
      'cart', // array of Cart objects (single active cart for agent)
      'cart_items',
      'library_entries',
      'reviews',
      'tags',
      'similar_item_links',
      'comparison_sessions',
      'static_pages',
      'contact_tickets'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('contact_metadata')) {
      // Minimal default metadata; can be overridden by populating localStorage externally
      const meta = {
        supportEmail: 'support@example.com',
        expectedResponseTimeHours: 48,
        faqPageCode: 'help_faq'
      };
      localStorage.setItem('contact_metadata', JSON.stringify(meta));
    }

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

  _getObjectFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
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

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  // =========================
  // Internal helpers
  // =========================

  _matchesFormatType(item, formatType) {
    if (!formatType) return true;
    if (!item) return false;
    if (formatType === 'adult_novel') {
      return item.contentType === 'book' && item.targetAudience === 'adult';
    }
    if (formatType === 'kids_book') {
      return item.contentType === 'book' && item.targetAudience === 'kids_young_readers';
    }
    if (formatType === 'audiobook') {
      return item.contentType === 'audiobook';
    }
    return true;
  }

  _applySort(items, sortBy) {
    if (!sortBy) return items;
    const arr = items.slice();
    const safeNum = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);

    switch (sortBy) {
      case 'rating_desc':
        arr.sort((a, b) => safeNum(b.averageRating) - safeNum(a.averageRating));
        break;
      case 'rating_asc':
        arr.sort((a, b) => safeNum(a.averageRating) - safeNum(b.averageRating));
        break;
      case 'price_asc':
        arr.sort((a, b) => safeNum(a.price) - safeNum(b.price));
        break;
      case 'price_desc':
        arr.sort((a, b) => safeNum(b.price) - safeNum(a.price));
        break;
      case 'in_universe_year_asc':
        arr.sort((a, b) => safeNum(a.inUniverseYear) - safeNum(b.inUniverseYear));
        break;
      case 'in_universe_year_desc':
        arr.sort((a, b) => safeNum(b.inUniverseYear) - safeNum(a.inUniverseYear));
        break;
      case 'publication_year_desc':
        arr.sort((a, b) => safeNum(b.publicationYear) - safeNum(a.publicationYear));
        break;
      case 'publication_year_asc':
        arr.sort((a, b) => safeNum(a.publicationYear) - safeNum(b.publicationYear));
        break;
      default:
        break;
    }
    return arr;
  }

  _filterCatalogItems(baseItems, query, filters) {
    const items = baseItems || [];
    const q = this._normalizeString(query);
    const f = filters || {};

    return items.filter((item) => {
      if (!item) return false;

      // Keyword search
      if (q) {
        const haystack = [item.title, item.subtitle, item.description]
          .filter(Boolean)
          .map((s) => this._normalizeString(s))
          .join(' ');
        if (!haystack.includes(q)) return false;
      }

      // primaryCategoryCode
      if (f.primaryCategoryCode && item.primaryCategoryCode !== f.primaryCategoryCode) {
        return false;
      }

      // continuity
      if (f.continuity && item.continuity !== f.continuity) {
        return false;
      }

      // era
      if (f.era && item.era !== f.era) {
        return false;
      }

      // targetAudience
      if (f.targetAudience && item.targetAudience !== f.targetAudience) {
        return false;
      }

      // binding
      if (f.binding && item.binding !== f.binding) {
        return false;
      }

      // formatType (derived)
      if (f.formatType && !this._matchesFormatType(item, f.formatType)) {
        return false;
      }

      // Age range intersection
      if (typeof f.ageMin === 'number') {
        if (typeof item.ageMax === 'number' && item.ageMax < f.ageMin) return false;
      }
      if (typeof f.ageMax === 'number') {
        if (typeof item.ageMin === 'number' && item.ageMin > f.ageMax) return false;
      }

      // Publication year
      if (typeof f.publicationYearMin === 'number') {
        if (typeof item.publicationYear === 'number' && item.publicationYear < f.publicationYearMin) {
          return false;
        }
      }
      if (typeof f.publicationYearMax === 'number') {
        if (typeof item.publicationYear === 'number' && item.publicationYear > f.publicationYearMax) {
          return false;
        }
      }

      // Page count
      if (typeof f.pageCountMin === 'number') {
        if (typeof item.pageCount === 'number' && item.pageCount < f.pageCountMin) {
          return false;
        }
      }
      if (typeof f.pageCountMax === 'number') {
        if (typeof item.pageCount === 'number' && item.pageCount > f.pageCountMax) {
          return false;
        }
      }

      // Price
      if (typeof f.priceMin === 'number') {
        if (typeof item.price === 'number' && item.price < f.priceMin) return false;
      }
      if (typeof f.priceMax === 'number') {
        if (typeof item.price === 'number' && item.price > f.priceMax) return false;
      }

      // Rating
      if (typeof f.ratingMin === 'number') {
        if (typeof item.averageRating === 'number' && item.averageRating < f.ratingMin) {
          return false;
        }
      }
      if (typeof f.ratingMax === 'number') {
        if (typeof item.averageRating === 'number' && item.averageRating > f.ratingMax) {
          return false;
        }
      }

      // Audio duration
      if (typeof f.audioDurationMinutesMax === 'number') {
        if (
          typeof item.audioDurationMinutes === 'number' &&
          item.audioDurationMinutes > f.audioDurationMinutesMax
        ) {
          return false;
        }
      }

      // In-universe year
      if (typeof f.inUniverseYearMin === 'number') {
        if (typeof item.inUniverseYear === 'number' && item.inUniverseYear < f.inUniverseYearMin) {
          return false;
        }
      }
      if (typeof f.inUniverseYearMax === 'number') {
        if (typeof item.inUniverseYear === 'number' && item.inUniverseYear > f.inUniverseYearMax) {
          return false;
        }
      }

      return true;
    });
  }

  _paginate(items, page, pageSize) {
    const totalResults = items.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    return {
      totalResults,
      page: currentPage,
      pageSize: size,
      items: items.slice(start, end)
    };
  }

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    let openCart = carts.find((c) => c && c.status === 'open');
    if (!openCart) {
      openCart = {
        id: this._generateId('cart'),
        status: 'open',
        items: [],
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      carts.push(openCart);
      this._saveToStorage('cart', carts);
    }
    return openCart;
  }

  _getOrCreateDefaultLists() {
    // Initialize a simple default reading list if none exists
    const lists = this._getFromStorage('lists');
    const existing = lists.find((l) => l && l.name === 'Default Reading List');
    if (!existing) {
      const now = this._nowIso();
      const list = {
        id: this._generateId('list'),
        name: 'Default Reading List',
        description: 'Auto-created default reading list',
        listType: 'reading_list',
        visibility: 'private',
        createdAt: now,
        updatedAt: now
      };
      lists.push(list);
      this._saveToStorage('lists', lists);
    }
  }

  _getOrCreateComparisonSession(itemIds) {
    const sessions = this._getFromStorage('comparison_sessions');
    const setKey = (ids) => ids.slice().sort().join('|');
    const targetKey = setKey(itemIds);

    let session = sessions.find((s) => setKey(s.itemIds || []) === targetKey);
    if (!session) {
      session = {
        id: this._generateId('cmp'),
        itemIds: itemIds.slice(0, 2),
        createdAt: this._nowIso()
      };
      sessions.push(session);
      this._saveToStorage('comparison_sessions', sessions);
    }
    return session;
  }

  _resolveReviewForeignKeys(review) {
    if (!review) return null;
    const catalogItems = this._getFromStorage('catalog_items');
    const tagsAll = this._getFromStorage('tags');

    const resolved = { ...review };
    if (review.itemId) {
      resolved.item = catalogItems.find((c) => c.id === review.itemId) || null;
    }
    if (Array.isArray(review.tagIds)) {
      resolved.tags = review.tagIds
        .map((tid) => tagsAll.find((t) => t.id === tid) || null)
        .filter((t) => t);
    } else {
      resolved.tags = [];
    }
    return resolved;
  }

  // =========================
  // Interfaces implementation
  // =========================

  // 1. getPrimaryBrowseCategories()
  getPrimaryBrowseCategories() {
    // Simple passthrough; categories are expected to be pre-populated in localStorage
    return this._getFromStorage('browse_categories');
  }

  // 2. getHomeFeaturedContent()
  getHomeFeaturedContent() {
    const allItems = this._getFromStorage('catalog_items');
    const featuredItems = allItems.filter((i) => i && i.isFeatured);

    const sortedByPubYear = allItems
      .filter((i) => typeof i.publicationYear === 'number')
      .slice()
      .sort((a, b) => (b.publicationYear || 0) - (a.publicationYear || 0));

    const timelineOptions = this.getTimelineBrowseOptions();
    const highlightedTimelines = (timelineOptions.eraSegments || []).map((seg) => ({
      title: seg.label,
      description: '',
      startInUniverseYear: seg.startInUniverseYear,
      endInUniverseYear: seg.endInUniverseYear
    }));

    return {
      featuredItems,
      newReleases: sortedByPubYear,
      highlightedTimelines
    };
  }

  // 3. searchCatalogItems(query, filters, sortBy, page, pageSize)
  searchCatalogItems(query, filters, sortBy, page, pageSize) {
    const allItems = this._getFromStorage('catalog_items');
    let filtered = this._filterCatalogItems(allItems, query, filters || {});
    // Fallback: if a non-empty query yields no results, ignore the query and
    // rely only on structured filters so flows with broad keywords still work.
    if (query && (!Array.isArray(filtered) || filtered.length === 0)) {
      filtered = this._filterCatalogItems(allItems, null, filters || {});
    }
    const sorted = this._applySort(filtered, sortBy);
    return this._paginate(sorted, page, pageSize);
  }

  // 4. getBrowseFilterOptions(context)
  getBrowseFilterOptions(context) {
    const allItems = this._getFromStorage('catalog_items');
    let items = allItems;

    if (context === 'kids_young_readers') {
      items = allItems.filter((i) => i.primaryCategoryCode === 'kids_young_readers');
    } else if (context === 'audiobooks') {
      items = allItems.filter((i) => i.primaryCategoryCode === 'audiobooks');
    }

    const numericExtent = (getter) => {
      const nums = items
        .map(getter)
        .filter((v) => typeof v === 'number' && !Number.isNaN(v));
      if (!nums.length) return { min: null, max: null };
      return { min: Math.min.apply(null, nums), max: Math.max.apply(null, nums) };
    };

    const priceRange = numericExtent((i) => i.price);
    const ratingRange = numericExtent((i) => i.averageRating);
    const publicationYearRange = numericExtent((i) => i.publicationYear);
    const pageCountRange = numericExtent((i) => i.pageCount);
    const audioDurationRangeRaw = numericExtent((i) => i.audioDurationMinutes);

    return {
      continuityOptions: [
        { value: 'canon', label: 'Canon' },
        { value: 'legends', label: 'Legends' }
      ],
      eraOptions: [
        { value: 'original_trilogy_0_4_aby', label: 'Original Trilogy (04 ABY)' },
        { value: 'high_republic', label: 'High Republic' },
        { value: 'other_era', label: 'Other Eras' }
      ],
      formatOptions: [
        { value: 'adult_novel', label: 'Adult novel', description: 'Adult-targeted Star Wars novels' },
        {
          value: 'kids_book',
          label: 'Kids & young readers',
          description: 'Books for younger readers'
        },
        { value: 'audiobook', label: 'Audiobook', description: 'Audio editions' }
      ],
      ageRange: {
        min: 0,
        max: 18,
        step: 1
      },
      priceRange: {
        min: priceRange.min !== null ? priceRange.min : 0,
        max: priceRange.max !== null ? priceRange.max : 100,
        step: 0.5
      },
      ratingRange: {
        min: ratingRange.min !== null ? Math.max(0, Math.floor(ratingRange.min * 10) / 10) : 0,
        max: ratingRange.max !== null ? Math.min(5, Math.ceil(ratingRange.max * 10) / 10) : 5,
        step: 0.1
      },
      publicationYearRange: {
        min: publicationYearRange.min,
        max: publicationYearRange.max
      },
      pageCountRange: {
        min: pageCountRange.min,
        max: pageCountRange.max,
        step: 10
      },
      audioDurationRange: {
        minMinutes: audioDurationRangeRaw.min,
        maxMinutes: audioDurationRangeRaw.max,
        stepMinutes: 30
      },
      sortOptions: [
        { value: 'rating_desc', label: 'Rating: High to Low' },
        { value: 'rating_asc', label: 'Rating: Low to High' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        {
          value: 'in_universe_year_asc',
          label: 'In-universe Year: Ascending'
        },
        {
          value: 'in_universe_year_desc',
          label: 'In-universe Year: Descending'
        },
        {
          value: 'publication_year_desc',
          label: 'Publication Year: Newest First'
        },
        {
          value: 'publication_year_asc',
          label: 'Publication Year: Oldest First'
        }
      ]
    };
  }

  // 5. getCatalogItemDetails(itemId)
  getCatalogItemDetails(itemId) {
    const catalogItems = this._getFromStorage('catalog_items');
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');
    const reviews = this._getFromStorage('reviews');

    const item = catalogItems.find((c) => c.id === itemId) || null;

    const continuityLabel = item
      ? item.continuity === 'canon'
        ? 'Canon'
        : 'Legends'
      : '';

    let eraLabel = '';
    if (item) {
      if (item.era === 'original_trilogy_0_4_aby') {
        eraLabel = 'Original Trilogy (04 ABY)';
      } else if (item.era === 'high_republic') {
        eraLabel = 'High Republic';
      } else if (item.era === 'other_era') {
        eraLabel = 'Other Era';
      }
    }

    let targetAudienceLabel = '';
    if (item) {
      if (item.targetAudience === 'adult') targetAudienceLabel = 'Adult';
      if (item.targetAudience === 'kids_young_readers') targetAudienceLabel = 'Kids & Young Readers';
    }

    let formatLabel = '';
    if (item) {
      if (item.contentType === 'audiobook') {
        formatLabel = 'Audiobook';
      } else if (item.contentType === 'book') {
        if (item.targetAudience === 'adult') formatLabel = 'Adult novel';
        if (item.targetAudience === 'kids_young_readers') formatLabel = 'Kids book';
      }
    }

    // Lists containing this item
    const listItemsForItem = listItems.filter((li) => li.itemId === itemId);
    const listIdSet = new Set(listItemsForItem.map((li) => li.listId));
    const listsContainingItem = Array.from(listIdSet).map((lid) => {
      const list = lists.find((l) => l.id === lid) || null;
      return {
        listId: lid,
        listName: list ? list.name : '',
        listType: list ? list.listType : '',
        list
      };
    });

    const isInAnyList = listsContainingItem.length > 0;

    // User review for this item
    const rawReview = reviews.find((r) => r.itemId === itemId) || null;
    const userReview = this._resolveReviewForeignKeys(rawReview);

    // Similar items preview
    const similarItemsPreview = this.getSimilarItemsPreview(itemId, 4);

    return {
      item,
      continuityLabel,
      eraLabel,
      targetAudienceLabel,
      formatLabel,
      isInAnyList,
      listsContainingItem,
      userReview,
      similarItemsPreview
    };
  }

  // 6. getSimilarItemsPreview(sourceItemId, limit)
  getSimilarItemsPreview(sourceItemId, limit) {
    const links = this._getFromStorage('similar_item_links');
    const catalogItems = this._getFromStorage('catalog_items');
    const lim = typeof limit === 'number' && limit > 0 ? limit : 4;

    const relevant = links
      .filter((l) => l.sourceItemId === sourceItemId)
      .slice()
      .sort((a, b) => {
        const ra = typeof a.rank === 'number' ? a.rank : 0;
        const rb = typeof b.rank === 'number' ? b.rank : 0;
        return ra - rb;
      })
      .slice(0, lim);

    return relevant
      .map((link) => catalogItems.find((c) => c.id === link.recommendedItemId) || null)
      .filter((i) => i);
  }

  // 7. getSimilarItemsForItem(sourceItemId, filters, sortBy, page, pageSize)
  getSimilarItemsForItem(sourceItemId, filters, sortBy, page, pageSize) {
    const links = this._getFromStorage('similar_item_links');
    const catalogItems = this._getFromStorage('catalog_items');

    const relevantLinks = links.filter((l) => l.sourceItemId === sourceItemId);
    const recommendedIds = relevantLinks.map((l) => l.recommendedItemId);
    const baseItems = catalogItems.filter((c) => recommendedIds.includes(c.id));

    const f = filters || {};
    const filtered = baseItems.filter((item) => {
      if (!item) return false;
      if (f.continuity && item.continuity !== f.continuity) return false;
      if (f.targetAudience && item.targetAudience !== f.targetAudience) return false;
      if (f.formatType && !this._matchesFormatType(item, f.formatType)) return false;
      if (typeof f.priceMax === 'number') {
        if (typeof item.price === 'number' && item.price > f.priceMax) return false;
      }
      if (typeof f.ratingMin === 'number') {
        if (typeof item.averageRating === 'number' && item.averageRating < f.ratingMin) return false;
      }
      return true;
    });

    const sorted = this._applySort(filtered, sortBy);
    return this._paginate(sorted, page, pageSize);
  }

  // 8. getTimelineBrowseOptions()
  getTimelineBrowseOptions() {
    const items = this._getFromStorage('catalog_items');
    const years = items
      .map((i) => i.inUniverseYear)
      .filter((v) => typeof v === 'number' && !Number.isNaN(v));

    const minInUniverseYear = years.length ? Math.min.apply(null, years) : null;
    const maxInUniverseYear = years.length ? Math.max.apply(null, years) : null;

    const eraSegmentsMap = {};
    items.forEach((item) => {
      if (typeof item.inUniverseYear !== 'number') return;
      const code = item.era || 'other_era';
      if (!eraSegmentsMap[code]) {
        eraSegmentsMap[code] = {
          code,
          label: code === 'original_trilogy_0_4_aby'
            ? 'Original Trilogy (04 ABY)'
            : code === 'high_republic'
            ? 'High Republic'
            : 'Other Era',
          startInUniverseYear: item.inUniverseYear,
          endInUniverseYear: item.inUniverseYear
        };
      } else {
        const seg = eraSegmentsMap[code];
        if (item.inUniverseYear < seg.startInUniverseYear) seg.startInUniverseYear = item.inUniverseYear;
        if (item.inUniverseYear > seg.endInUniverseYear) seg.endInUniverseYear = item.inUniverseYear;
      }
    });

    const eraSegments = Object.keys(eraSegmentsMap)
      .map((k) => eraSegmentsMap[k])
      .sort((a, b) => a.startInUniverseYear - b.startInUniverseYear);

    return {
      minInUniverseYear,
      maxInUniverseYear,
      eraSegments
    };
  }

  // 9. getTimelineItems(inUniverseYearMin, inUniverseYearMax, filters, sortBy, page, pageSize)
  getTimelineItems(inUniverseYearMin, inUniverseYearMax, filters, sortBy, page, pageSize) {
    const allItems = this._getFromStorage('catalog_items');
    const f = {
      ...(filters || {}),
      inUniverseYearMin,
      inUniverseYearMax
    };
    const filtered = this._filterCatalogItems(allItems, null, f);
    const sorted = this._applySort(filtered, sortBy || 'in_universe_year_asc');
    return this._paginate(sorted, page, pageSize);
  }

  // 10. getMyListsOverview()
  getMyListsOverview() {
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');

    return lists.map((list) => {
      const itemCount = listItems.filter((li) => li.listId === list.id).length;
      return {
        id: list.id,
        name: list.name,
        listType: list.listType,
        visibility: list.visibility,
        description: list.description || '',
        itemCount
      };
    });
  }

  // 11. createList(name, listType, visibility, description)
  createList(name, listType, visibility, description) {
    const validListTypes = ['reading_list', 'wishlist', 'other'];
    const validVisibilities = ['private', 'public'];

    if (!name) {
      return { success: false, list: null, message: 'Name is required.' };
    }
    if (!validListTypes.includes(listType)) {
      return { success: false, list: null, message: 'Invalid listType.' };
    }
    if (!validVisibilities.includes(visibility)) {
      return { success: false, list: null, message: 'Invalid visibility.' };
    }

    const lists = this._getFromStorage('lists');
    const now = this._nowIso();
    const list = {
      id: this._generateId('list'),
      name,
      description: description || '',
      listType,
      visibility,
      createdAt: now,
      updatedAt: now
    };
    lists.push(list);
    this._saveToStorage('lists', lists);

    return {
      success: true,
      list: {
        id: list.id,
        name: list.name,
        listType: list.listType,
        visibility: list.visibility,
        description: list.description
      },
      message: 'List created.'
    };
  }

  // 12. getListDetail(listId)
  getListDetail(listId) {
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');
    const catalogItems = this._getFromStorage('catalog_items');

    const list = lists.find((l) => l.id === listId);
    if (!list) return null;

    const itemsRaw = listItems.filter((li) => li.listId === listId);
    const items = itemsRaw
      .slice()
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      })
      .map((li) => ({
        listItemId: li.id,
        position: li.position,
        notes: li.notes || '',
        addedAt: li.addedAt,
        item: catalogItems.find((c) => c.id === li.itemId) || null
      }));

    return {
      id: list.id,
      name: list.name,
      listType: list.listType,
      visibility: list.visibility,
      description: list.description || '',
      items
    };
  }

  // 13. addItemToList(listId, itemId, position, notes)
  addItemToList(listId, itemId, position, notes) {
    const lists = this._getFromStorage('lists');
    const catalogItems = this._getFromStorage('catalog_items');
    const listItems = this._getFromStorage('list_items');

    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return { success: false, listItemId: null, message: 'List not found.' };
    }
    const item = catalogItems.find((c) => c.id === itemId);
    if (!item) {
      return { success: false, listItemId: null, message: 'Item not found.' };
    }

    let pos = position;
    if (typeof pos !== 'number') {
      const existing = listItems.filter((li) => li.listId === listId);
      const maxPos = existing.reduce((max, li) => {
        return typeof li.position === 'number' && li.position > max ? li.position : max;
      }, 0);
      pos = maxPos + 1;
    }

    const li = {
      id: this._generateId('listItem'),
      listId,
      itemId,
      position: pos,
      notes: notes || '',
      addedAt: this._nowIso()
    };
    listItems.push(li);
    this._saveToStorage('list_items', listItems);

    return { success: true, listItemId: li.id, message: 'Item added to list.' };
  }

  // 14. removeItemFromList(listItemId)
  removeItemFromList(listItemId) {
    const listItems = this._getFromStorage('list_items');
    const index = listItems.findIndex((li) => li.id === listItemId);
    if (index === -1) {
      return { success: false, message: 'List item not found.' };
    }
    listItems.splice(index, 1);
    this._saveToStorage('list_items', listItems);
    return { success: true, message: 'Item removed from list.' };
  }

  // 15. reorderListItems(listId, orderedListItemIds)
  reorderListItems(listId, orderedListItemIds) {
    const listItems = this._getFromStorage('list_items');
    const idToPos = new Map();
    (orderedListItemIds || []).forEach((id, idx) => {
      idToPos.set(id, idx + 1);
    });

    listItems.forEach((li) => {
      if (li.listId === listId && idToPos.has(li.id)) {
        li.position = idToPos.get(li.id);
      }
    });

    this._saveToStorage('list_items', listItems);
    return { success: true, message: 'List items reordered.' };
  }

  // 16. updateListMetadata(listId, name, visibility, description)
  updateListMetadata(listId, name, visibility, description) {
    const lists = this._getFromStorage('lists');
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return { success: false, list: null, message: 'List not found.' };
    }

    if (typeof name === 'string' && name.trim()) {
      list.name = name;
    }
    if (typeof visibility === 'string' && visibility) {
      if (['private', 'public'].includes(visibility)) {
        list.visibility = visibility;
      }
    }
    if (typeof description === 'string') {
      list.description = description;
    }
    list.updatedAt = this._nowIso();

    this._saveToStorage('lists', lists);

    return {
      success: true,
      list: {
        id: list.id,
        name: list.name,
        listType: list.listType,
        visibility: list.visibility,
        description: list.description || ''
      },
      message: 'List updated.'
    };
  }

  // 17. getMyLibraryOverview()
  getMyLibraryOverview() {
    const entries = this._getFromStorage('library_entries');
    const catalogItems = this._getFromStorage('catalog_items');

    const mapEntry = (entry) => ({
      libraryEntryId: entry.id,
      item: catalogItems.find((c) => c.id === entry.itemId) || null,
      finishedAt: entry.finishedAt || null,
      lastUpdated: entry.lastUpdated || null,
      progressPercent: entry.progressPercent,
      addedAt: entry.addedAt || null
    });

    const finished = entries
      .filter((e) => e.status === 'finished')
      .map(mapEntry)
      .map((e) => ({
        libraryEntryId: e.libraryEntryId,
        item: e.item,
        finishedAt: e.finishedAt,
        lastUpdated: e.lastUpdated
      }));

    const currentlyReading = entries
      .filter((e) => e.status === 'currently_reading')
      .map(mapEntry)
      .map((e) => ({
        libraryEntryId: e.libraryEntryId,
        item: e.item,
        progressPercent: typeof e.progressPercent === 'number' ? e.progressPercent : 0,
        lastUpdated: e.lastUpdated
      }));

    const wantToRead = entries
      .filter((e) => e.status === 'want_to_read')
      .map(mapEntry)
      .map((e) => ({
        libraryEntryId: e.libraryEntryId,
        item: e.item,
        addedAt: e.addedAt
      }));

    return {
      finished,
      currentlyReading,
      wantToRead
    };
  }

  // 18. getReviewTags()
  getReviewTags() {
    return this._getFromStorage('tags');
  }

  // 19. getMyReviewForItem(itemId)
  getMyReviewForItem(itemId) {
    const reviews = this._getFromStorage('reviews');
    const review = reviews.find((r) => r.itemId === itemId) || null;
    return { review: this._resolveReviewForeignKeys(review) };
  }

  // 20. submitReview(itemId, rating, reviewText, tagIds)
  submitReview(itemId, rating, reviewText, tagIds) {
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return { success: false, review: null, message: 'Rating must be between 1 and 5.' };
    }

    const reviews = this._getFromStorage('reviews');
    const now = this._nowIso();
    let review = reviews.find((r) => r.itemId === itemId) || null;

    if (!review) {
      review = {
        id: this._generateId('rev'),
        itemId,
        rating,
        reviewText: reviewText || '',
        tagIds: Array.isArray(tagIds) ? tagIds.slice() : [],
        createdAt: now,
        updatedAt: now
      };
      reviews.push(review);
    } else {
      review.rating = rating;
      review.reviewText = typeof reviewText === 'string' ? reviewText : review.reviewText;
      if (Array.isArray(tagIds)) {
        review.tagIds = tagIds.slice();
      }
      review.updatedAt = now;
    }

    this._saveToStorage('reviews', reviews);

    const resolved = this._resolveReviewForeignKeys(review);
    return { success: true, review: resolved, message: 'Review submitted.' };
  }

  // 21. addItemToCart(itemId, quantity)
  addItemToCart(itemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const catalogItems = this._getFromStorage('catalog_items');
    const item = catalogItems.find((c) => c.id === itemId);
    if (!item) {
      return { success: false, cartId: null, cartItemId: null, message: 'Item not found.' };
    }

    const cart = this._getOrCreateCart();

    const cartItems = this._getFromStorage('cart_items');
    let cartItem = cartItems.find((ci) => ci.cartId === cart.id && ci.itemId === itemId);

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.addedAt = this._nowIso();
    } else {
      cartItem = {
        id: this._generateId('cartItem'),
        cartId: cart.id,
        itemId,
        quantity: qty,
        priceEach: item.price,
        currency: item.currency || 'usd',
        addedAt: this._nowIso()
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      cart.items.push(cartItem.id);
    }

    cart.updatedAt = this._nowIso();

    // Persist cart and cart items
    const carts = this._getFromStorage('cart');
    const existingIndex = carts.findIndex((c) => c.id === cart.id);
    if (existingIndex === -1) {
      carts.push(cart);
    } else {
      carts[existingIndex] = cart;
    }
    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Item added to cart.'
    };
  }

  // 22. getCartOverview()
  getCartOverview() {
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const catalogItems = this._getFromStorage('catalog_items');

    const cart = carts.find((c) => c.status === 'open') || null;
    if (!cart) {
      return {
        cartId: null,
        status: 'open',
        items: [],
        totals: {
          itemCount: 0,
          totalQuantity: 0,
          subtotal: 0
        }
      };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    const items = itemsForCart.map((ci) => {
      const item = catalogItems.find((c) => c.id === ci.itemId) || null;
      const subtotal = (ci.quantity || 0) * (ci.priceEach || 0);
      return {
        cartItemId: ci.id,
        item,
        quantity: ci.quantity,
        priceEach: ci.priceEach,
        currency: ci.currency,
        subtotal
      };
    });

    const totals = items.reduce(
      (acc, it) => {
        acc.itemCount += 1;
        acc.totalQuantity += it.quantity || 0;
        acc.subtotal += it.subtotal || 0;
        return acc;
      },
      { itemCount: 0, totalQuantity: 0, subtotal: 0 }
    );

    return {
      cartId: cart.id,
      status: cart.status,
      items,
      totals
    };
  }

  // 23. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('cart');
    const cartItem = cartItems.find((ci) => ci.id === cartItemId);
    if (!cartItem) {
      return { success: false, cartId: null, message: 'Cart item not found.' };
    }

    if (quantity <= 0) {
      // Remove item if quantity is zero or negative
      const res = this.removeItemFromCart(cartItemId);
      return { success: res.success, cartId: res.cartId || null, message: 'Cart item removed.' };
    }

    cartItem.quantity = quantity;
    cartItem.addedAt = this._nowIso();

    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find((c) => c.id === cartItem.cartId) || null;
    if (cart) {
      cart.updatedAt = this._nowIso();
      const updatedCarts = carts.map((c) => (c.id === cart.id ? cart : c));
      this._saveToStorage('cart', updatedCarts);
    }

    return { success: true, cartId: cartItem.cartId, message: 'Cart item updated.' };
  }

  // 24. removeItemFromCart(cartItemId)
  removeItemFromCart(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('cart');

    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return { success: false, cartId: null, message: 'Cart item not found.' };
    }

    const [removed] = cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find((c) => c.id === removed.cartId) || null;
    if (cart) {
      cart.items = (cart.items || []).filter((id) => id !== cartItemId);
      cart.updatedAt = this._nowIso();
      const updatedCarts = carts.map((c) => (c.id === cart.id ? cart : c));
      this._saveToStorage('cart', updatedCarts);
    }

    return { success: true, cartId: removed.cartId, message: 'Cart item removed.' };
  }

  // 25. startCheckout()
  startCheckout() {
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.status === 'open') || null;
    if (!cart) {
      return {
        success: false,
        cartId: null,
        redirectToCheckout: false,
        message: 'No open cart to checkout.'
      };
    }

    cart.status = 'checked_out';
    cart.updatedAt = this._nowIso();
    const updatedCarts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('cart', updatedCarts);

    return {
      success: true,
      cartId: cart.id,
      redirectToCheckout: true,
      message: 'Checkout started.'
    };
  }

  // 26. getAdvancedSearchFilterOptions()
  getAdvancedSearchFilterOptions() {
    const items = this._getFromStorage('catalog_items');

    const numericExtent = (getter) => {
      const nums = items
        .map(getter)
        .filter((v) => typeof v === 'number' && !Number.isNaN(v));
      if (!nums.length) return { min: null, max: null };
      return { min: Math.min.apply(null, nums), max: Math.max.apply(null, nums) };
    };

    const publicationYearRange = numericExtent((i) => i.publicationYear);
    const priceRange = numericExtent((i) => i.price);
    const ratingRange = numericExtent((i) => i.averageRating);

    return {
      continuityOptions: [
        { value: 'canon', label: 'Canon' },
        { value: 'legends', label: 'Legends' }
      ],
      bindingOptions: [
        { value: 'paperback', label: 'Paperback' },
        { value: 'hardcover', label: 'Hardcover' },
        { value: 'ebook', label: 'eBook' },
        { value: 'audio', label: 'Audio' }
      ],
      publicationYearRange: {
        min: publicationYearRange.min,
        max: publicationYearRange.max
      },
      priceRange: {
        min: priceRange.min !== null ? priceRange.min : 0,
        max: priceRange.max !== null ? priceRange.max : 100,
        step: 0.5
      },
      ratingRange: {
        min: ratingRange.min !== null ? Math.max(0, Math.floor(ratingRange.min * 10) / 10) : 0,
        max: ratingRange.max !== null ? Math.min(5, Math.ceil(ratingRange.max * 10) / 10) : 5,
        step: 0.1
      }
    };
  }

  // 27. performAdvancedSearch(keyword, continuity, binding, publicationYearMax, priceMin, priceMax, ratingMin, sortBy, page, pageSize)
  performAdvancedSearch(
    keyword,
    continuity,
    binding,
    publicationYearMax,
    priceMin,
    priceMax,
    ratingMin,
    sortBy,
    page,
    pageSize
  ) {
    const allItems = this._getFromStorage('catalog_items');
    const filters = {};

    if (continuity) filters.continuity = continuity;
    if (binding) filters.binding = binding;
    if (typeof publicationYearMax === 'number') filters.publicationYearMax = publicationYearMax;
    if (typeof priceMin === 'number') filters.priceMin = priceMin;
    if (typeof priceMax === 'number') filters.priceMax = priceMax;
    if (typeof ratingMin === 'number') filters.ratingMin = ratingMin;

    const filtered = this._filterCatalogItems(allItems, keyword, filters);
    const sorted = this._applySort(filtered, sortBy || 'rating_desc');
    return this._paginate(sorted, page, pageSize);
  }

  // 28. createComparisonSession(itemIds)
  createComparisonSession(itemIds) {
    const ids = Array.isArray(itemIds) ? itemIds.slice(0, 2) : [];
    if (ids.length !== 2) {
      return {
        success: false,
        comparisonSessionId: null,
        items: [],
        message: 'Exactly two itemIds are required.'
      };
    }

    const catalogItems = this._getFromStorage('catalog_items');
    const session = this._getOrCreateComparisonSession(ids);
    const items = session.itemIds
      .map((id) => catalogItems.find((c) => c.id === id) || null)
      .filter((i) => i);

    return {
      success: true,
      comparisonSessionId: session.id,
      items,
      message: 'Comparison session ready.'
    };
  }

  // 29. getComparisonSession(comparisonSessionId)
  getComparisonSession(comparisonSessionId) {
    const sessions = this._getFromStorage('comparison_sessions');
    const catalogItems = this._getFromStorage('catalog_items');

    const session = sessions.find((s) => s.id === comparisonSessionId) || null;
    if (!session) return null;

    const items = (session.itemIds || [])
      .map((id) => catalogItems.find((c) => c.id === id) || null)
      .filter((i) => i);

    return {
      id: session.id,
      itemIds: session.itemIds,
      items,
      createdAt: session.createdAt
    };
  }

  // 30. signUpAccount(username, password, confirmPassword)
  signUpAccount(username, password, confirmPassword) {
    if (!username || !password || !confirmPassword) {
      return { success: false, message: 'All fields are required.' };
    }
    if (password !== confirmPassword) {
      return { success: false, message: 'Passwords do not match.' };
    }

    const users = this._getFromStorage('users');
    const existing = users.find((u) => this._normalizeString(u.username) === this._normalizeString(username));
    if (existing) {
      return { success: false, message: 'Username already exists.' };
    }

    const user = {
      id: this._generateId('user'),
      username,
      password
    };
    users.push(user);
    this._saveToStorage('users', users);

    return { success: true, message: 'Account created.' };
  }

  // 31. getStaticPageContent(pageCode)
  getStaticPageContent(pageCode) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find((p) => p.pageCode === pageCode) || null;
    if (page) return page;
    return {
      pageCode,
      title: '',
      bodyHtml: '',
      lastUpdated: null
    };
  }

  // 32. submitContactForm(name, email, subject, category, message)
  submitContactForm(name, email, subject, category, message) {
    if (!name || !email || !subject || !message) {
      return { success: false, ticketId: null, message: 'All required fields must be filled.' };
    }

    const tickets = this._getFromStorage('contact_tickets');
    const ticket = {
      id: this._generateId('ticket'),
      name,
      email,
      subject,
      category: category || 'other',
      message,
      createdAt: this._nowIso()
    };
    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      ticketId: ticket.id,
      message: 'Contact form submitted.'
    };
  }

  // 33. getContactMetadata()
  getContactMetadata() {
    const meta = this._getObjectFromStorage('contact_metadata') || {
      supportEmail: '',
      expectedResponseTimeHours: null,
      faqPageCode: ''
    };
    return meta;
  }

  // =========================
  // NO test methods here; pure business logic only
  // =========================
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
