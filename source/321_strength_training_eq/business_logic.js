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

  // ---------------------- Storage & ID helpers ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      // legacy from template (unused but kept harmlessly)
      'users',
      'carts',
      'cartItems',
      // core entities
      'products',
      'categories',
      'brands',
      'brand_follows',
      'saved_lists',
      'saved_list_items',
      'favorites',
      'product_comparison_sessions',
      'product_comparison_items',
      'guides',
      'guide_sections',
      'guide_section_products',
      'reviews',
      'questions',
      'answers',
      // misc
      'contact_tickets'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    const objectKeysWithDefaults = {
      about_page_content: { title: '', bodyHtml: '', lastUpdated: null },
      contact_page_content: {
        heading: '',
        introHtml: '',
        contactEmail: '',
        responseTimeDescription: ''
      },
      help_faq_content: { faqs: [], lastUpdated: null },
      privacy_policy_content: { title: '', bodyHtml: '', lastUpdated: null },
      terms_and_conditions_content: { title: '', bodyHtml: '', lastUpdated: null }
    };

    Object.keys(objectKeysWithDefaults).forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(objectKeysWithDefaults[key]));
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
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _setObjectInStorage(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
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

  // ---------------------- Generic helper lookups ----------------------

  _getProducts() {
    return this._getFromStorage('products');
  }

  _getCategories() {
    return this._getFromStorage('categories');
  }

  _getBrands() {
    return this._getFromStorage('brands');
  }

  _getProductById(productId) {
    const products = this._getProducts();
    return products.find((p) => p.id === productId) || null;
  }

  _getCategoryById(categoryId) {
    if (!categoryId) return null;
    const categories = this._getCategories();
    return categories.find((c) => c.id === categoryId) || null;
  }

  _getBrandById(brandId) {
    if (!brandId) return null;
    const brands = this._getBrands();
    return brands.find((b) => b.id === brandId) || null;
  }

  _getCategoryIdsForKey(categoryKey) {
    const categories = this._getCategories();
    const root = categories.find((c) => c.key === categoryKey);
    if (!root) return [];

    const result = new Set();
    const stack = [root.id];
    while (stack.length) {
      const id = stack.pop();
      if (result.has(id)) continue;
      result.add(id);
      categories
        .filter((c) => c.parentCategoryId === id)
        .forEach((child) => stack.push(child.id));
    }
    return Array.from(result);
  }

  _filterProductsByCategoryKey(products, categoryKey) {
    if (!categoryKey) return products;
    const allowedIds = this._getCategoryIdsForKey(categoryKey);
    if (!allowedIds.length) return [];
    const allowedSet = new Set(allowedIds);
    return products.filter((p) => allowedSet.has(p.categoryId));
  }

  _compareBy(sortBy) {
    return (a, b) => {
      if (sortBy === 'user_rating_desc') {
        const ar = a.averageRating || 0;
        const br = b.averageRating || 0;
        if (br !== ar) return br - ar;
        const arc = a.reviewCount || 0;
        const brc = b.reviewCount || 0;
        if (brc !== arc) return brc - arc;
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === 'most_reviewed') {
        const arc = a.reviewCount || 0;
        const brc = b.reviewCount || 0;
        if (brc !== arc) return brc - arc;
        const ar = a.averageRating || 0;
        const br = b.averageRating || 0;
        return br - ar;
      }
      if (sortBy === 'safety_score_desc') {
        const as = typeof a.safetyScore === 'number' ? a.safetyScore : -Infinity;
        const bs = typeof b.safetyScore === 'number' ? b.safetyScore : -Infinity;
        if (bs !== as) return bs - as;
        return (a.price || 0) - (b.price || 0);
      }
      // relevance or unknown -> fallback to most_reviewed
      const arc = a.reviewCount || 0;
      const brc = b.reviewCount || 0;
      if (brc !== arc) return brc - arc;
      const ar = a.averageRating || 0;
      const br = b.averageRating || 0;
      return br - ar;
    };
  }

  // ---------------------- User state helpers ----------------------

  _getOrCreateUserState() {
    const favorites = this._getFromStorage('favorites');
    const savedLists = this._getFromStorage('saved_lists');
    const savedListItems = this._getFromStorage('saved_list_items');
    const brandFollows = this._getFromStorage('brand_follows');
    const comparisonSessions = this._getFromStorage('product_comparison_sessions');
    const comparisonItems = this._getFromStorage('product_comparison_items');

    return {
      favorites,
      savedLists,
      savedListItems,
      brandFollows,
      comparisonSessions,
      comparisonItems
    };
  }

  _persistUserState(state) {
    if (state.favorites) this._saveToStorage('favorites', state.favorites);
    if (state.savedLists) this._saveToStorage('saved_lists', state.savedLists);
    if (state.savedListItems) this._saveToStorage('saved_list_items', state.savedListItems);
    if (state.brandFollows) this._saveToStorage('brand_follows', state.brandFollows);
    if (state.comparisonSessions)
      this._saveToStorage('product_comparison_sessions', state.comparisonSessions);
    if (state.comparisonItems)
      this._saveToStorage('product_comparison_items', state.comparisonItems);
  }

  _getOrCreateComparisonSession(sourceType) {
    const state = this._getOrCreateUserState();
    let session = state.comparisonSessions.find((s) => s.isActive);
    if (session) {
      return session;
    }
    const now = new Date().toISOString();
    session = {
      id: this._generateId('cmp'),
      sourceType: sourceType || 'unknown',
      createdAt: now,
      updatedAt: now,
      isActive: true
    };
    state.comparisonSessions.push(session);
    this._persistUserState(state);
    return session;
  }

  _resolveComparisonItems(rawItems) {
    const products = this._getProducts();
    const sessions = this._getFromStorage('product_comparison_sessions');
    return rawItems.map((item) => {
      const product = products.find((p) => p.id === item.productId) || null;
      const session = sessions.find((s) => s.id === item.comparisonSessionId) || null;
      return {
        ...item,
        product,
        comparisonSession: session
      };
    });
  }

  // ---------------------- Header / Homepage ----------------------

  getMainCategories() {
    const categories = this._getCategories();
    const main = categories.filter((c) => !c.parentCategoryId);
    // Resolve parentCategory for foreign key (even though null here)
    return main.map((c) => ({
      ...c,
      parentCategory: null
    }));
  }

  getHomePageContent() {
    const categories = this._getCategories();
    const products = this._getProducts();
    const brands = this._getBrands();
    const guides = this._getFromStorage('guides');

    const featuredCategories = categories
      .filter((c) => !c.parentCategoryId)
      .sort((a, b) => {
        const ao = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const bo = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        return ao - bo;
      })
      .map((c) => ({ ...c, parentCategory: null }));

    const activeProducts = products.filter((p) => p.status === 'active');
    activeProducts.sort(this._compareBy('user_rating_desc'));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    const featuredProducts = activeProducts.slice(0, 12).map((p) => {
      const brand = brandMap.get(p.brandId) || null;
      const category = categoryMap.get(p.categoryId) || null;
      const badges = [];
      if (p.averageRating >= 4.5 && p.reviewCount >= 100) badges.push('Top Rated');
      if (p.freeShipping) badges.push('Free Shipping');
      if (p.safetyScore >= 9) badges.push('High Safety Score');

      return {
        productId: p.id,
        name: p.name,
        shortDescription: p.shortDescription || '',
        price: p.price,
        currency: p.currency || 'usd',
        averageRating: p.averageRating,
        reviewCount: p.reviewCount,
        safetyScore: typeof p.safetyScore === 'number' ? p.safetyScore : null,
        thumbnailUrl: p.thumbnailUrl || '',
        brandName: brand ? brand.name : '',
        categoryName: category ? category.name : '',
        badges
      };
    });

    const highlightedGuides = guides
      .filter((g) => g.isFeatured)
      .sort((a, b) => {
        const ad = a.createdAt || '';
        const bd = b.createdAt || '';
        return ad < bd ? 1 : ad > bd ? -1 : 0;
      });

    return {
      featuredCategories,
      featuredProducts,
      highlightedGuides
    };
  }

  getHeaderQuickAccessSummary() {
    const state = this._getOrCreateUserState();
    const favoritesCount = state.favorites.length;
    const savedListsCount = state.savedLists.length;
    const followedBrandsCount = state.brandFollows.length;
    const activeSession = state.comparisonSessions.find((s) => s.isActive);
    const comparisonItemsCount = activeSession
      ? state.comparisonItems.filter((i) => i.comparisonSessionId === activeSession.id).length
      : 0;

    return {
      favoritesCount,
      savedListsCount,
      followedBrandsCount,
      comparisonItemsCount
    };
  }

  // ---------------------- Product Filters & Search ----------------------

  getProductFilterOptions(source, categoryKey, brandId, searchQuery) {
    const productsAll = this._getProducts();
    let products = productsAll.slice();

    // Context filtering without user-selected filters
    if (source === 'category' && categoryKey) {
      products = this._filterProductsByCategoryKey(products, categoryKey);
    } else if (source === 'brand' && brandId) {
      products = products.filter((p) => p.brandId === brandId);
    } else if (source === 'search' && searchQuery) {
      const q = searchQuery.toLowerCase();
      const categories = this._getCategories();
      const brands = this._getBrands();
      const brandMap = new Map(brands.map((b) => [b.id, b]));
      const categoryMap = new Map(categories.map((c) => [c.id, c]));
      products = products.filter((p) => {
        const brand = brandMap.get(p.brandId);
        const category = categoryMap.get(p.categoryId);
        const fields = [
          p.name,
          p.shortDescription,
          brand ? brand.name : '',
          category ? category.name : ''
        ];
        return fields.some((f) => f && f.toLowerCase().includes(q));
      });
    }

    let minPrice = null;
    let maxPrice = null;
    let minReviews = null;
    let maxReviews = null;
    let minHeight = null;
    let maxHeight = null;

    products.forEach((p) => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.reviewCount === 'number') {
        if (minReviews === null || p.reviewCount < minReviews) minReviews = p.reviewCount;
        if (maxReviews === null || p.reviewCount > maxReviews) maxReviews = p.reviewCount;
      }
      if (typeof p.supportsHeightInInches === 'number') {
        if (minHeight === null || p.supportsHeightInInches < minHeight)
          minHeight = p.supportsHeightInInches;
        if (maxHeight === null || p.supportsHeightInInches > maxHeight)
          maxHeight = p.supportsHeightInInches;
      }
    });

    const any = (field) => products.some((p) => !!p[field]);

    const ratingOptions = [
      { minRating: 0, label: 'All ratings' },
      { minRating: 3, label: '3 stars & up' },
      { minRating: 4, label: '4 stars & up' },
      { minRating: 4.5, label: '4.5 stars & up' }
    ];

    const sortOptions = [
      { value: 'user_rating_desc', label: 'User Rating (High to Low)' },
      { value: 'price_asc', label: 'Price (Low to High)' },
      { value: 'price_desc', label: 'Price (High to Low)' },
      { value: 'most_reviewed', label: 'Most Reviewed' },
      { value: 'relevance', label: 'Relevance' },
      { value: 'safety_score_desc', label: 'Safety Score (High to Low)' }
    ];

    return {
      price: {
        min: minPrice !== null ? minPrice : 0,
        max: maxPrice !== null ? maxPrice : 0,
        currency: 'usd',
        step: 5
      },
      ratingOptions,
      reviewCountRange: {
        min: minReviews !== null ? minReviews : 0,
        max: maxReviews !== null ? maxReviews : 0,
        step: 10
      },
      heightSupportRange: {
        minInches: minHeight !== null ? minHeight : 0,
        maxInches: maxHeight !== null ? maxHeight : 0
      },
      featureFilters: {
        freeShipping: { available: any('freeShipping'), label: 'Free Shipping' },
        hasPullUpBar: { available: any('hasPullUpBar'), label: 'Pull-up bar included' },
        isAdjustable: { available: any('isAdjustable'), label: 'Adjustable' },
        isCompact: { available: any('isCompact'), label: 'Compact' },
        isApartmentFriendly: {
          available: any('isApartmentFriendly'),
          label: 'Apartment-friendly'
        },
        isRubberCoated: { available: any('isRubberCoated'), label: 'Rubber-coated' }
      },
      sortOptions
    };
  }

  searchProducts(
    searchQuery,
    categoryKey,
    brandId,
    minPrice,
    maxPrice,
    minRating,
    minReviewCount,
    supportsHeightMinInInches,
    freeShipping,
    hasPullUpBar,
    isAdjustable,
    isCompact,
    isApartmentFriendly,
    isRubberCoated,
    sortBy,
    page = 1,
    pageSize = 20
  ) {
    const productsAll = this._getProducts();
    const categories = this._getCategories();
    const brands = this._getBrands();
    const state = this._getOrCreateUserState();
    const favorites = state.favorites;
    const comparisonSessions = state.comparisonSessions;
    const comparisonItems = state.comparisonItems;
    const activeSession = comparisonSessions.find((s) => s.isActive);
    const activeComparisonProductIds = activeSession
      ? new Set(
          comparisonItems
            .filter((i) => i.comparisonSessionId === activeSession.id)
            .map((i) => i.productId)
        )
      : new Set();

    const favoritesSet = new Set(favorites.map((f) => f.productId));

    let products = productsAll.slice();

    if (categoryKey) {
      products = this._filterProductsByCategoryKey(products, categoryKey);
    }

    if (brandId) {
      products = products.filter((p) => p.brandId === brandId);
    }

    if (typeof minPrice === 'number') {
      products = products.filter((p) => typeof p.price === 'number' && p.price >= minPrice);
    }

    if (typeof maxPrice === 'number') {
      products = products.filter((p) => typeof p.price === 'number' && p.price <= maxPrice);
    }

    if (typeof minRating === 'number') {
      products = products.filter(
        (p) => typeof p.averageRating === 'number' && p.averageRating >= minRating
      );
    }

    if (typeof minReviewCount === 'number') {
      products = products.filter(
        (p) => typeof p.reviewCount === 'number' && p.reviewCount >= minReviewCount
      );
    }

    if (typeof supportsHeightMinInInches === 'number') {
      products = products.filter(
        (p) =>
          typeof p.supportsHeightInInches === 'number' &&
          p.supportsHeightInInches >= supportsHeightMinInInches
      );
    }

    if (typeof freeShipping === 'boolean') {
      if (freeShipping) products = products.filter((p) => p.freeShipping === true);
    }

    if (typeof hasPullUpBar === 'boolean') {
      if (hasPullUpBar) products = products.filter((p) => p.hasPullUpBar === true);
    }

    if (typeof isAdjustable === 'boolean') {
      if (isAdjustable) products = products.filter((p) => p.isAdjustable === true);
    }

    if (typeof isCompact === 'boolean') {
      if (isCompact) products = products.filter((p) => p.isCompact === true);
    }

    if (typeof isApartmentFriendly === 'boolean') {
      if (isApartmentFriendly) {
        products = products.filter((p) => p.isApartmentFriendly === true);
      }
    }

    if (typeof isRubberCoated === 'boolean') {
      if (isRubberCoated) products = products.filter((p) => p.isRubberCoated === true);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const brandMap = new Map(brands.map((b) => [b.id, b]));
      const categoryMap = new Map(categories.map((c) => [c.id, c]));
      products = products.filter((p) => {
        const brand = brandMap.get(p.brandId);
        const category = categoryMap.get(p.categoryId);
        const fields = [
          p.name,
          p.shortDescription,
          p.description,
          brand ? brand.name : '',
          category ? category.name : '',
          p.categoryId
        ];
        return fields.some((f) => f && f.toLowerCase().includes(q));
      });
    }

    const effectiveSortBy = sortBy || 'relevance';
    products.sort(this._compareBy(effectiveSortBy));

    const totalItems = products.length;
    const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1;
    const currentPage = Math.max(1, Math.min(page || 1, totalPages || 1));
    const start = (currentPage - 1) * pageSize;
    const end = start + (pageSize || 20);
    const pageItems = products.slice(start, end);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    const items = pageItems.map((p) => {
      const category = categoryMap.get(p.categoryId) || null;
      const brand = brandMap.get(p.brandId) || null;
      return {
        productId: p.id,
        name: p.name,
        shortDescription: p.shortDescription || '',
        price: p.price,
        currency: p.currency || 'usd',
        averageRating: p.averageRating,
        reviewCount: p.reviewCount,
        safetyScore: typeof p.safetyScore === 'number' ? p.safetyScore : null,
        freeShipping: !!p.freeShipping,
        hasPullUpBar: !!p.hasPullUpBar,
        isAdjustable: !!p.isAdjustable,
        isCompact: !!p.isCompact,
        isApartmentFriendly: !!p.isApartmentFriendly,
        isRubberCoated: !!p.isRubberCoated,
        supportsHeightInInches: p.supportsHeightInInches || null,
        weightRangeDisplay: p.weightRangeDisplay || '',
        thumbnailUrl: p.thumbnailUrl || '',
        brandName: brand ? brand.name : '',
        categoryName: category ? category.name : '',
        isInComparison: activeComparisonProductIds.has(p.id),
        isFavorite: favoritesSet.has(p.id)
      };
    });

    return {
      items,
      pagination: {
        page: currentPage,
        pageSize,
        totalItems,
        totalPages
      },
      appliedFilters: {
        minPrice: typeof minPrice === 'number' ? minPrice : null,
        maxPrice: typeof maxPrice === 'number' ? maxPrice : null,
        minRating: typeof minRating === 'number' ? minRating : null,
        minReviewCount: typeof minReviewCount === 'number' ? minReviewCount : null,
        supportsHeightMinInInches:
          typeof supportsHeightMinInInches === 'number' ? supportsHeightMinInInches : null,
        freeShipping: typeof freeShipping === 'boolean' ? freeShipping : null,
        hasPullUpBar: typeof hasPullUpBar === 'boolean' ? hasPullUpBar : null,
        isAdjustable: typeof isAdjustable === 'boolean' ? isAdjustable : null,
        isCompact: typeof isCompact === 'boolean' ? isCompact : null,
        isApartmentFriendly:
          typeof isApartmentFriendly === 'boolean' ? isApartmentFriendly : null,
        isRubberCoated: typeof isRubberCoated === 'boolean' ? isRubberCoated : null,
        sortBy: effectiveSortBy
      }
    };
  }

  // ---------------------- Product details & related ----------------------

  getProductDetails(productId) {
    const product = this._getProductById(productId);
    const categories = this._getCategories();
    const brands = this._getBrands();
    const favorites = this._getFromStorage('favorites');
    const savedLists = this._getFromStorage('saved_lists');
    const savedListItems = this._getFromStorage('saved_list_items');

    const brand = product ? brands.find((b) => b.id === product.brandId) || null : null;
    const category = product ? categories.find((c) => c.id === product.categoryId) || null : null;

    const isFavorite = !!favorites.find((f) => f.productId === productId);

    const savedInLists = savedListItems
      .filter((item) => item.productId === productId)
      .map((item) => {
        const list = savedLists.find((l) => l.id === item.listId) || null;
        return {
          listId: item.listId,
          listName: list ? list.name : ''
        };
      });

    const reviews = this._getFromStorage('reviews').filter((r) => r.productId === productId);
    let averageRating = 0;
    let ratingDistribution = [];
    let recommendedPercentage = 0;

    if (reviews.length) {
      const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      averageRating = total / reviews.length;
      const distMap = new Map();
      reviews.forEach((r) => {
        const rating = r.rating || 0;
        distMap.set(rating, (distMap.get(rating) || 0) + 1);
      });
      ratingDistribution = Array.from(distMap.entries())
        .map(([rating, count]) => ({ rating, count }))
        .sort((a, b) => b.rating - a.rating);
      const recommendedCount = reviews.filter((r) => (r.rating || 0) >= 4).length;
      recommendedPercentage = (recommendedCount / reviews.length) * 100;
    } else if (product) {
      averageRating = product.averageRating || 0;
      ratingDistribution = [];
      recommendedPercentage = 0;
    }

    const questions = this._getFromStorage('questions').filter(
      (q) => q.productId === productId
    );
    const answers = this._getFromStorage('answers');
    const qaSummary = {
      questionCount: questions.length,
      unansweredCount: questions.filter((q) => {
        const count = answers.filter((a) => a.questionId === q.id).length;
        return count === 0;
      }).length
    };

    return {
      product,
      brandName: brand ? brand.name : '',
      brandSlug: brand ? brand.slug || '' : '',
      categoryName: category ? category.name : '',
      categoryKey: category ? category.key : '',
      isFavorite,
      savedInLists,
      reviewSummary: {
        averageRating,
        reviewCount: reviews.length || (product ? product.reviewCount || 0 : 0),
        ratingDistribution,
        recommendedPercentage
      },
      qaSummary
    };
  }

  getRelatedProducts(productId, maxItems = 6) {
    const products = this._getProducts();
    const categories = this._getCategories();
    const brands = this._getBrands();
    const current = products.find((p) => p.id === productId);
    if (!current) return [];

    const related = products
      .filter(
        (p) =>
          p.id !== productId &&
          p.status === 'active' &&
          (p.categoryId === current.categoryId || p.brandId === current.brandId)
      )
      .sort(this._compareBy('user_rating_desc'))
      .slice(0, maxItems);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    return related.map((p) => {
      const brand = brandMap.get(p.brandId) || null;
      const category = categoryMap.get(p.categoryId) || null;
      return {
        productId: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency || 'usd',
        averageRating: p.averageRating,
        reviewCount: p.reviewCount,
        thumbnailUrl: p.thumbnailUrl || '',
        brandName: brand ? brand.name : '',
        categoryName: category ? category.name : ''
      };
    });
  }

  // ---------------------- Favorites ----------------------

  addFavorite(productId) {
    const state = this._getOrCreateUserState();
    const existing = state.favorites.find((f) => f.productId === productId);
    if (existing) {
      const favoritesCount = state.favorites.length;
      return {
        success: true,
        isFavorite: true,
        favoritesCount,
        message: 'Product already in favorites.'
      };
    }

    const now = new Date().toISOString();
    const favorite = {
      id: this._generateId('fav'),
      productId,
      addedAt: now
    };
    state.favorites.push(favorite);
    this._persistUserState(state);

    const favoritesCount = state.favorites.length;
    return {
      success: true,
      isFavorite: true,
      favoritesCount,
      message: 'Product added to favorites.'
    };
  }

  removeFavorite(productId) {
    const state = this._getOrCreateUserState();
    const before = state.favorites.length;
    state.favorites = state.favorites.filter((f) => f.productId !== productId);
    this._persistUserState(state);
    const favoritesCount = state.favorites.length;
    const removed = favoritesCount < before;

    return {
      success: removed,
      isFavorite: false,
      favoritesCount,
      message: removed ? 'Product removed from favorites.' : 'Product not in favorites.'
    };
  }

  getFavorites(categoryKey) {
    const state = this._getOrCreateUserState();
    const favorites = state.favorites;
    const products = this._getProducts();
    const categories = this._getCategories();
    const brands = this._getBrands();

    let filteredFavorites = favorites.slice();

    if (categoryKey) {
      const allowedCategoryIds = this._getCategoryIdsForKey(categoryKey);
      const allowedSet = new Set(allowedCategoryIds);
      filteredFavorites = filteredFavorites.filter((f) => {
        const product = products.find((p) => p.id === f.productId);
        return product && allowedSet.has(product.categoryId);
      });
    }

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    const items = filteredFavorites.map((fav) => {
      const product = products.find((p) => p.id === fav.productId) || null;
      const category = product ? categoryMap.get(product.categoryId) || null : null;
      const brand = product ? brandMap.get(product.brandId) || null : null;
      return {
        productId: fav.productId,
        name: product ? product.name : '',
        price: product ? product.price : null,
        currency: product ? product.currency || 'usd' : 'usd',
        averageRating: product ? product.averageRating : null,
        reviewCount: product ? product.reviewCount : null,
        thumbnailUrl: product ? product.thumbnailUrl || '' : '',
        brandName: brand ? brand.name : '',
        categoryName: category ? category.name : '',
        // foreign key resolution
        product
      };
    });

    return {
      items,
      totalItems: items.length
    };
  }

  // ---------------------- Saved Lists ----------------------

  getSavedListsOverview() {
    const state = this._getOrCreateUserState();
    const lists = state.savedLists;
    const items = state.savedListItems;

    return lists.map((list) => {
      const itemCount = items.filter((i) => i.listId === list.id).length;
      return {
        list,
        itemCount
      };
    });
  }

  getSavedListDetail(listId) {
    const state = this._getOrCreateUserState();
    const lists = state.savedLists;
    const items = state.savedListItems.filter((i) => i.listId === listId);
    const products = this._getProducts();
    const categories = this._getCategories();
    const brands = this._getBrands();

    const list = lists.find((l) => l.id === listId) || null;

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    const detailedItems = items.map((listItem) => {
      const product = products.find((p) => p.id === listItem.productId) || null;
      const category = product ? categoryMap.get(product.categoryId) || null : null;
      const brand = product ? brandMap.get(product.brandId) || null : null;

      const listRef = list || lists.find((l) => l.id === listItem.listId) || null;

      const listItemWithFK = {
        ...listItem,
        list: listRef,
        product
      };

      return {
        listItem: listItemWithFK,
        product: product
          ? {
              productId: product.id,
              name: product.name,
              price: product.price,
              currency: product.currency || 'usd',
              averageRating: product.averageRating,
              reviewCount: product.reviewCount,
              thumbnailUrl: product.thumbnailUrl || '',
              brandName: brand ? brand.name : '',
              categoryName: category ? category.name : ''
            }
          : null
      };
    });

    return {
      list,
      items: detailedItems
    };
  }

  createSavedList(name, description) {
    const state = this._getOrCreateUserState();
    const now = new Date().toISOString();
    const list = {
      id: this._generateId('lst'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    state.savedLists.push(list);
    this._persistUserState(state);
    return {
      success: true,
      list,
      message: 'List created.'
    };
  }

  saveProductToExistingList(productId, listId) {
    const state = this._getOrCreateUserState();
    const list = state.savedLists.find((l) => l.id === listId) || null;
    if (!list) {
      return {
        success: false,
        list: null,
        listItem: null,
        message: 'List not found.'
      };
    }

    const existing = state.savedListItems.find(
      (i) => i.listId === listId && i.productId === productId
    );
    if (existing) {
      return {
        success: true,
        list,
        listItem: existing,
        message: 'Product already in list.'
      };
    }

    const now = new Date().toISOString();
    const listItem = {
      id: this._generateId('lsti'),
      listId,
      productId,
      addedAt: now
    };
    state.savedListItems.push(listItem);
    list.updatedAt = now;
    this._persistUserState(state);

    return {
      success: true,
      list,
      listItem,
      message: 'Product added to list.'
    };
  }

  saveProductToNewList(productId, listName, description) {
    const createResult = this.createSavedList(listName, description || '');
    if (!createResult.success) {
      return {
        success: false,
        list: null,
        listItem: null,
        message: 'Failed to create list.'
      };
    }
    const list = createResult.list;
    const addResult = this.saveProductToExistingList(productId, list.id);
    return addResult;
  }

  renameSavedList(listId, newName) {
    const state = this._getOrCreateUserState();
    const list = state.savedLists.find((l) => l.id === listId) || null;
    if (!list) {
      return {
        success: false,
        list: null,
        message: 'List not found.'
      };
    }
    list.name = newName;
    list.updatedAt = new Date().toISOString();
    this._persistUserState(state);
    return {
      success: true,
      list,
      message: 'List renamed.'
    };
  }

  deleteSavedList(listId) {
    const state = this._getOrCreateUserState();
    const before = state.savedLists.length;
    state.savedLists = state.savedLists.filter((l) => l.id !== listId);
    const after = state.savedLists.length;
    const success = after < before;
    if (success) {
      state.savedListItems = state.savedListItems.filter((i) => i.listId !== listId);
      this._persistUserState(state);
    }
    return {
      success,
      message: success ? 'List deleted.' : 'List not found.'
    };
  }

  removeSavedListItem(listItemId) {
    const state = this._getOrCreateUserState();
    const before = state.savedListItems.length;
    state.savedListItems = state.savedListItems.filter((i) => i.id !== listItemId);
    const after = state.savedListItems.length;
    const success = after < before;
    this._persistUserState(state);
    return {
      success,
      message: success ? 'Item removed from list.' : 'Item not found.'
    };
  }

  moveSavedListItem(listItemId, targetListId) {
    const state = this._getOrCreateUserState();
    const item = state.savedListItems.find((i) => i.id === listItemId) || null;
    const targetList = state.savedLists.find((l) => l.id === targetListId) || null;
    if (!item || !targetList) {
      return {
        success: false,
        sourceListId: item ? item.listId : null,
        targetListId,
        message: 'Item or target list not found.'
      };
    }
    const sourceListId = item.listId;
    item.listId = targetListId;
    const now = new Date().toISOString();
    const sourceList = state.savedLists.find((l) => l.id === sourceListId);
    if (sourceList) sourceList.updatedAt = now;
    targetList.updatedAt = now;
    this._persistUserState(state);
    return {
      success: true,
      sourceListId,
      targetListId,
      message: 'Item moved to target list.'
    };
  }

  // ---------------------- Product Comparison ----------------------

  addProductToComparison(productId, sourceType) {
    const state = this._getOrCreateUserState();
    const session = this._getOrCreateComparisonSession(sourceType);
    // state may be outdated (session added), reload comparison data
    const refreshedState = this._getOrCreateUserState();
    let items = refreshedState.comparisonItems.filter(
      (i) => i.comparisonSessionId === session.id
    );

    const exists = items.find((i) => i.productId === productId);
    if (!exists) {
      const item = {
        id: this._generateId('cmpi'),
        comparisonSessionId: session.id,
        productId,
        position: items.length,
        isPrimary: items.length === 0
      };
      refreshedState.comparisonItems.push(item);
      session.updatedAt = new Date().toISOString();
      this._persistUserState(refreshedState);
      items = refreshedState.comparisonItems.filter((i) => i.comparisonSessionId === session.id);
    }

    return {
      success: true,
      comparisonSession: session,
      items: this._resolveComparisonItems(items),
      message: 'Product added to comparison.'
    };
  }

  removeProductFromComparison(productId) {
    const state = this._getOrCreateUserState();
    const sessions = state.comparisonSessions;
    const session = sessions.find((s) => s.isActive) || null;
    if (!session) {
      return {
        success: false,
        comparisonSession: null,
        items: [],
        message: 'No active comparison session.'
      };
    }

    let items = state.comparisonItems.filter((i) => i.comparisonSessionId === session.id);
    const before = items.length;
    items = items.filter((i) => i.productId !== productId);

    // Re-index positions
    items.forEach((i, idx) => {
      i.position = idx;
      if (items.length === 1) i.isPrimary = true;
    });

    const removed = before > items.length;

    state.comparisonItems = state.comparisonItems.filter(
      (i) => i.comparisonSessionId !== session.id
    );
    state.comparisonItems.push(...items);

    if (!items.length) {
      session.isActive = false;
    }
    session.updatedAt = new Date().toISOString();
    this._persistUserState(state);

    return {
      success: removed,
      comparisonSession: session,
      items: this._resolveComparisonItems(items),
      message: removed ? 'Product removed from comparison.' : 'Product not in comparison.'
    };
  }

  getActiveComparisonSummary() {
    const state = this._getOrCreateUserState();
    const session = state.comparisonSessions.find((s) => s.isActive) || null;
    if (!session) {
      return {
        hasActiveSession: false,
        comparisonSession: null,
        items: []
      };
    }
    const items = state.comparisonItems.filter((i) => i.comparisonSessionId === session.id);
    return {
      hasActiveSession: true,
      comparisonSession: session,
      items: this._resolveComparisonItems(items)
    };
  }

  getComparisonDetails(comparisonSessionId) {
    const state = this._getOrCreateUserState();
    const sessions = state.comparisonSessions;
    let session = null;
    if (comparisonSessionId) {
      session = sessions.find((s) => s.id === comparisonSessionId) || null;
    } else {
      session = sessions.find((s) => s.isActive) || null;
    }
    if (!session) {
      return {
        comparisonSession: null,
        products: []
      };
    }

    const itemsRaw = state.comparisonItems.filter((i) => i.comparisonSessionId === session.id);
    const items = this._resolveComparisonItems(itemsRaw);
    const productsAll = this._getProducts();
    const brands = this._getBrands();
    const categories = this._getCategories();
    const brandMap = new Map(brands.map((b) => [b.id, b]));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const resultProducts = items.map((ci) => {
      const product = productsAll.find((p) => p.id === ci.productId) || null;
      const brand = product ? brandMap.get(product.brandId) || null : null;
      const category = product ? categoryMap.get(product.categoryId) || null : null;
      const comparisonItem = {
        ...ci,
        product,
        comparisonSession: session
      };
      return {
        comparisonItem,
        product: product
          ? {
              productId: product.id,
              name: product.name,
              price: product.price,
              currency: product.currency || 'usd',
              averageRating: product.averageRating,
              reviewCount: product.reviewCount,
              safetyScore: typeof product.safetyScore === 'number' ? product.safetyScore : null,
              weightRangeDisplay: product.weightRangeDisplay || '',
              adjustmentMechanism: product.adjustmentMechanism || '',
              keyFeatures: product.keyFeatures || [],
              imageUrl: product.imageUrl || '',
              brandName: brand ? brand.name : '',
              categoryName: category ? category.name : ''
            }
          : null
      };
    });

    return {
      comparisonSession: session,
      products: resultProducts
    };
  }

  setComparisonPrimaryProduct(productId) {
    const state = this._getOrCreateUserState();
    const sessions = state.comparisonSessions;
    const session = sessions.find((s) => s.isActive) || null;
    if (!session) {
      return {
        comparisonSession: null,
        items: []
      };
    }

    const items = state.comparisonItems.filter((i) => i.comparisonSessionId === session.id);
    let changed = false;
    items.forEach((i) => {
      if (i.productId === productId) {
        if (!i.isPrimary) changed = true;
        i.isPrimary = true;
      } else if (i.isPrimary) {
        changed = true;
        i.isPrimary = false;
      }
    });
    if (changed) {
      session.updatedAt = new Date().toISOString();
      this._persistUserState(state);
    }

    const resolvedItems = this._resolveComparisonItems(
      state.comparisonItems.filter((i) => i.comparisonSessionId === session.id)
    );

    return {
      comparisonSession: session,
      items: resolvedItems
    };
  }

  // ---------------------- Guides ----------------------

  getGuidesListing(equipmentTypeKey, searchQuery, sortBy) {
    const guides = this._getFromStorage('guides');
    const guideSections = this._getFromStorage('guide_sections');
    const guideSectionProducts = this._getFromStorage('guide_section_products');
    const products = this._getProducts();
    const categories = this._getCategories();

    let result = guides.slice();

    if (equipmentTypeKey) {
      let allowedCategoryIds = this._getCategoryIdsForKey(equipmentTypeKey);
      if (!allowedCategoryIds.length) {
        allowedCategoryIds = [equipmentTypeKey];
      }
      const allowedSet = new Set(allowedCategoryIds);
      const guideIdsWithCategory = new Set();
      guideSectionProducts.forEach((gsp) => {
        const product = products.find((p) => p.id === gsp.productId);
        if (product && allowedSet.has(product.categoryId)) {
          const section = guideSections.find((s) => s.id === gsp.guideSectionId);
          if (section) guideIdsWithCategory.add(section.guideId);
        }
      });
      result = result.filter((g) => guideIdsWithCategory.has(g.id));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((g) => {
        const fields = [g.title, g.summary];
        return fields.some((f) => f && f.toLowerCase().includes(q));
      });
    }

    const effectiveSort = sortBy || 'featured';
    result.sort((a, b) => {
      if (effectiveSort === 'most_recent') {
        const ad = a.createdAt || '';
        const bd = b.createdAt || '';
        return ad < bd ? 1 : ad > bd ? -1 : 0;
      }
      if (effectiveSort === 'popular') {
        const ac = guideSections.filter((s) => s.guideId === a.id).length;
        const bc = guideSections.filter((s) => s.guideId === b.id).length;
        if (bc !== ac) return bc - ac;
        const ad = a.createdAt || '';
        const bd = b.createdAt || '';
        return ad < bd ? 1 : ad > bd ? -1 : 0;
      }
      // featured: featured first, then recent
      const af = a.isFeatured ? 1 : 0;
      const bf = b.isFeatured ? 1 : 0;
      if (bf !== af) return bf - af;
      const ad = a.createdAt || '';
      const bd = b.createdAt || '';
      return ad < bd ? 1 : ad > bd ? -1 : 0;
    });

    return result;
  }

  getGuideDetailWithSections(guideId) {
    const guides = this._getFromStorage('guides');
    const guideSections = this._getFromStorage('guide_sections');
    const guideSectionProducts = this._getFromStorage('guide_section_products');
    const products = this._getProducts();
    const brands = this._getBrands();

    const guide = guides.find((g) => g.id === guideId) || null;

    const sections = guideSections
      .filter((s) => s.guideId === guideId)
      .sort((a, b) => {
        const ao = typeof a.order === 'number' ? a.order : 0;
        const bo = typeof b.order === 'number' ? b.order : 0;
        return ao - bo;
      })
      .map((section) => {
        const productsForSection = guideSectionProducts
          .filter((gsp) => gsp.guideSectionId === section.id)
          .sort((a, b) => a.rank - b.rank)
          .map((gsp) => {
            const product = products.find((p) => p.id === gsp.productId) || null;
            const brand = product
              ? brands.find((b) => b.id === product.brandId) || null
              : null;
            const guideSectionRef = section;

            const guideSectionProduct = {
              ...gsp,
              guideSection: guideSectionRef,
              product
            };

            return {
              guideSectionProduct,
              product: product
                ? {
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    currency: product.currency || 'usd',
                    averageRating: product.averageRating,
                    reviewCount: product.reviewCount,
                    thumbnailUrl: product.thumbnailUrl || '',
                    brandName: brand ? brand.name : ''
                  }
                : null
            };
          });

        return {
          section: {
            ...section,
            guide
          },
          contentHtml: '',
          products: productsForSection
        };
      });

    return {
      guide,
      sections
    };
  }

  // ---------------------- Brands ----------------------

  getBrandsListing(searchQuery, sortBy) {
    const brands = this._getBrands();
    const brandFollows = this._getFromStorage('brand_follows');
    const followsSet = new Set(brandFollows.map((f) => f.brandId));

    let result = brands.slice();

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) => b.name && b.name.toLowerCase().includes(q));
    }

    const effectiveSort = sortBy || 'featured';
    result.sort((a, b) => {
      if (effectiveSort === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (effectiveSort === 'most_products') {
        const ac = a.productCount || 0;
        const bc = b.productCount || 0;
        if (bc !== ac) return bc - ac;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (effectiveSort === 'highest_rated') {
        const ar = a.averageRating || 0;
        const br = b.averageRating || 0;
        if (br !== ar) return br - ar;
        return (a.name || '').localeCompare(b.name || '');
      }
      // featured: featured first, then name
      const af = a.isFeatured ? 1 : 0;
      const bf = b.isFeatured ? 1 : 0;
      if (bf !== af) return bf - af;
      return (a.name || '').localeCompare(b.name || '');
    });

    return result.map((brand) => ({
      brand,
      isFollowed: followsSet.has(brand.id)
    }));
  }

  getBrandDetail(brandId) {
    const brands = this._getBrands();
    const brandFollows = this._getFromStorage('brand_follows');
    const categories = this._getCategories();
    const products = this._getProducts();

    const brand = brands.find((b) => b.id === brandId) || null;
    const isFollowed = !!brandFollows.find((f) => f.brandId === brandId);

    const categoryIds = new Set(
      products.filter((p) => p.brandId === brandId).map((p) => p.categoryId)
    );
    const featuredCategoriesRaw = categories.filter((c) => categoryIds.has(c.id));
    const featuredCategories = featuredCategoriesRaw.map((c) => ({
      ...c,
      parentCategory: c.parentCategoryId
        ? categories.find((pc) => pc.id === c.parentCategoryId) || null
        : null
    }));

    return {
      brand,
      isFollowed,
      featuredCategories
    };
  }

  followBrand(brandId) {
    const state = this._getOrCreateUserState();
    const existing = state.brandFollows.find((f) => f.brandId === brandId);
    if (existing) {
      const brand = this._getBrandById(brandId);
      const brandFollow = {
        ...existing,
        brand
      };
      return {
        success: true,
        isFollowed: true,
        brandFollow,
        message: 'Brand already followed.'
      };
    }
    const now = new Date().toISOString();
    const follow = {
      id: this._generateId('bf'),
      brandId,
      followedAt: now
    };
    state.brandFollows.push(follow);
    this._persistUserState(state);
    const brand = this._getBrandById(brandId);
    const brandFollow = {
      ...follow,
      brand
    };
    return {
      success: true,
      isFollowed: true,
      brandFollow,
      message: 'Brand followed.'
    };
  }

  unfollowBrand(brandId) {
    const state = this._getOrCreateUserState();
    const before = state.brandFollows.length;
    state.brandFollows = state.brandFollows.filter((f) => f.brandId !== brandId);
    const after = state.brandFollows.length;
    const success = after < before;
    this._persistUserState(state);
    return {
      success,
      isFollowed: !success,
      message: success ? 'Brand unfollowed.' : 'Brand was not followed.'
    };
  }

  // ---------------------- Reviews ----------------------

  getProductReviewSummary(productId) {
    const reviews = this._getFromStorage('reviews').filter((r) => r.productId === productId);
    const product = this._getProductById(productId);

    let averageRating = 0;
    let reviewCount = 0;
    let ratingDistribution = [];
    let recommendedPercentage = 0;

    if (reviews.length) {
      reviewCount = reviews.length;
      const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      averageRating = total / reviewCount;
      const distMap = new Map();
      reviews.forEach((r) => {
        const rating = r.rating || 0;
        distMap.set(rating, (distMap.get(rating) || 0) + 1);
      });
      ratingDistribution = Array.from(distMap.entries())
        .map(([rating, count]) => ({ rating, count }))
        .sort((a, b) => b.rating - a.rating);
      const recommendedCount = reviews.filter((r) => (r.rating || 0) >= 4).length;
      recommendedPercentage = (recommendedCount / reviewCount) * 100;
    } else if (product) {
      averageRating = product.averageRating || 0;
      reviewCount = product.reviewCount || 0;
    }

    return {
      productId,
      averageRating,
      reviewCount,
      ratingDistribution,
      recommendedPercentage
    };
  }

  listProductReviews(productId, sortBy, page = 1, pageSize = 20) {
    const allReviews = this._getFromStorage('reviews').filter((r) => r.productId === productId);
    const product = this._getProductById(productId);

    const effectiveSort = sortBy || 'most_recent';
    allReviews.sort((a, b) => {
      if (effectiveSort === 'highest_rating') {
        const ar = a.rating || 0;
        const br = b.rating || 0;
        if (br !== ar) return br - ar;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (effectiveSort === 'lowest_rating') {
        const ar = a.rating || 0;
        const br = b.rating || 0;
        if (ar !== br) return ar - br;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (effectiveSort === 'most_helpful') {
        const ah = a.helpfulCount || 0;
        const bh = b.helpfulCount || 0;
        if (bh !== ah) return bh - ah;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      // most_recent
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    const totalItems = allReviews.length;
    const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1;
    const currentPage = Math.max(1, Math.min(page || 1, totalPages || 1));
    const start = (currentPage - 1) * pageSize;
    const end = start + (pageSize || 20);
    const pageItems = allReviews.slice(start, end).map((r) => ({
      ...r,
      product
    }));

    return {
      items: pageItems,
      pagination: {
        page: currentPage,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  markReviewHelpful(reviewId) {
    const reviews = this._getFromStorage('reviews');
    const review = reviews.find((r) => r.id === reviewId) || null;
    if (!review) {
      return {
        success: false,
        review: null,
        message: 'Review not found.'
      };
    }

    if (!review.userMarkedHelpful) {
      review.userMarkedHelpful = true;
      review.helpfulCount = (review.helpfulCount || 0) + 1;
      this._saveToStorage('reviews', reviews);
    }

    const product = this._getProductById(review.productId);
    const reviewWithFK = {
      ...review,
      product
    };

    return {
      success: true,
      review: reviewWithFK,
      message: 'Marked review as helpful.'
    };
  }

  submitProductReview(
    productId,
    rating,
    title,
    body,
    authorDisplayName,
    useCase,
    usageDuration
  ) {
    const reviews = this._getFromStorage('reviews');
    const now = new Date().toISOString();

    const review = {
      id: this._generateId('rev'),
      productId,
      rating,
      title,
      body,
      authorDisplayName: authorDisplayName || '',
      useCase: useCase || 'other',
      usageDuration: usageDuration || 'unspecified',
      helpfulCount: 0,
      userMarkedHelpful: false,
      isRecommended: rating >= 4,
      createdAt: now,
      updatedAt: now
    };

    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    // Update product aggregate if present
    const products = this._getProducts();
    const product = products.find((p) => p.id === productId) || null;
    if (product) {
      const oldCount = product.reviewCount || 0;
      const oldAvg = product.averageRating || 0;
      const newCount = oldCount + 1;
      const newAvg = (oldAvg * oldCount + rating) / newCount;
      product.reviewCount = newCount;
      product.averageRating = newAvg;
      this._saveToStorage('products', products);
    }

    const reviewWithFK = {
      ...review,
      product
    };

    return {
      success: true,
      review: reviewWithFK,
      message: 'Review submitted.'
    };
  }

  // ---------------------- Q&A ----------------------

  listProductQuestions(productId, page = 1, pageSize = 10) {
    const questions = this._getFromStorage('questions').filter(
      (q) => q.productId === productId
    );
    const answers = this._getFromStorage('answers');
    const product = this._getProductById(productId);

    // Sort questions by createdAt desc
    questions.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const totalItems = questions.length;
    const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1;
    const currentPage = Math.max(1, Math.min(page || 1, totalPages || 1));
    const start = (currentPage - 1) * pageSize;
    const end = start + (pageSize || 10);
    const pageQuestions = questions.slice(start, end);

    const items = pageQuestions.map((q) => {
      const qAnswers = answers.filter((a) => a.questionId === q.id).map((a) => ({
        ...a,
        question: q
      }));
      const question = {
        ...q,
        product
      };
      return {
        question,
        answers: qAnswers
      };
    });

    return {
      items,
      pagination: {
        page: currentPage,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  submitProductQuestion(productId, subject, body, displayName, email) {
    const questions = this._getFromStorage('questions');
    const now = new Date().toISOString();

    const question = {
      id: this._generateId('q'),
      productId,
      subject,
      body,
      displayName,
      email: email || '',
      status: 'pending',
      answerCount: 0,
      createdAt: now
    };

    questions.push(question);
    this._saveToStorage('questions', questions);

    const product = this._getProductById(productId);
    const questionWithFK = {
      ...question,
      product
    };

    return {
      success: true,
      question: questionWithFK,
      message: 'Question submitted.'
    };
  }

  // ---------------------- Static content & Contact ----------------------

  getAboutPageContent() {
    return this._getObjectFromStorage('about_page_content', {
      title: '',
      bodyHtml: '',
      lastUpdated: null
    });
  }

  getContactPageContent() {
    return this._getObjectFromStorage('contact_page_content', {
      heading: '',
      introHtml: '',
      contactEmail: '',
      responseTimeDescription: ''
    });
  }

  submitContactForm(name, email, topic, message, allowReply = true) {
    const tickets = this._getFromStorage('contact_tickets');
    const now = new Date().toISOString();
    const ticketId = this._generateId('ct');

    const ticket = {
      id: ticketId,
      name,
      email,
      topic,
      message,
      allowReply: !!allowReply,
      createdAt: now
    };

    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      ticketId,
      message: 'Message received.'
    };
  }

  getHelpFaqContent() {
    return this._getObjectFromStorage('help_faq_content', {
      faqs: [],
      lastUpdated: null
    });
  }

  getPrivacyPolicyContent() {
    return this._getObjectFromStorage('privacy_policy_content', {
      title: '',
      bodyHtml: '',
      lastUpdated: null
    });
  }

  getTermsAndConditionsContent() {
    return this._getObjectFromStorage('terms_and_conditions_content', {
      title: '',
      bodyHtml: '',
      lastUpdated: null
    });
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
