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

  // -----------------------------
  // Storage helpers
  // -----------------------------

  _initStorage() {
    // Basic/example keys from snippet
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }

    // Data model tables
    const arrayKeys = [
      'product_categories',
      'products',
      'carts',
      'cart_items',
      'quote_lists',
      'quote_items',
      'quote_requests',
      'wishlists',
      'wishlist_items',
      'compare_lists',
      'compare_items',
      'course_categories',
      'courses',
      'course_sessions',
      'enrollments',
      'learning_plans',
      'learning_plan_items',
      'onsite_training_requests',
      'homepage_promotions',
      'faq_entries',
      'policies',
      'contact_tickets'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Object / singleton-style keys
    if (!localStorage.getItem('homepage_hero')) {
      const hero = {
        title: '',
        subtitle: '',
        imageUrl: '',
        callToActionType: ''
      };
      localStorage.setItem('homepage_hero', JSON.stringify(hero));
    }

    if (!localStorage.getItem('about_content')) {
      const about = {
        companyName: '',
        missionHtml: '',
        backgroundHtml: '',
        certifications: []
      };
      localStorage.setItem('about_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('contact_info')) {
      const contactInfo = {
        phone: '',
        supportEmail: '',
        salesEmail: '',
        mailingAddress: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: ''
        }
      };
      localStorage.setItem('contact_info', JSON.stringify(contactInfo));
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return JSON.parse(JSON.stringify(defaultValue));
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return JSON.parse(JSON.stringify(defaultValue));
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

  // -----------------------------
  // Generic helpers
  // -----------------------------

  _nowIso() {
    return new Date().toISOString();
  }

  _getDescendantProductCategoryIds(rootCategoryId) {
    const categories = this._getFromStorage('product_categories', []);
    const result = new Set();
    const queue = [rootCategoryId];
    while (queue.length) {
      const id = queue.shift();
      result.add(id);
      categories.forEach((c) => {
        if (c.parentCategoryId === id && !result.has(c.id)) {
          queue.push(c.id);
        }
      });
    }
    return result;
  }

  _attachCategoryToProduct(product, categoriesCache) {
    if (!product) return null;
    const categories = categoriesCache || this._getFromStorage('product_categories', []);
    const category = categories.find((c) => c.id === product.categoryId) || null;
    return { ...product, category };
  }

  _attachCategoryToCourse(course, courseCategoriesCache) {
    if (!course) return null;
    const courseCategories = courseCategoriesCache || this._getFromStorage('course_categories', []);
    const category = courseCategories.find((c) => c.id === course.categoryId) || null;
    return { ...course, category };
  }

  // -----------------------------
  // Cart helpers (single-user cart)
  // -----------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._nowIso(),
        updatedAt: this._nowIso(),
        currency: 'usd',
        subtotal: 0
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const cart = carts.find((c) => c.id === cartId);
    if (!cart) return;
    const itemsForCart = cartItems.filter((ci) => ci.cartId === cartId);
    let subtotal = 0;
    itemsForCart.forEach((item) => {
      item.lineSubtotal = item.unitPrice * item.quantity;
      subtotal += item.lineSubtotal;
    });
    cart.subtotal = subtotal;
    cart.updatedAt = this._nowIso();
    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('carts', carts);
  }

  // Quote list helper
  _getOrCreateQuoteList() {
    let quoteLists = this._getFromStorage('quote_lists', []);
    let list = quoteLists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('quote_list'),
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      quoteLists.push(list);
      this._saveToStorage('quote_lists', quoteLists);
    }
    return list;
  }

  // Wishlist helper
  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    let wishlist = wishlists[0] || null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'My Wishlist',
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  // Compare list helper
  _getOrCreateCompareList() {
    let compareLists = this._getFromStorage('compare_lists', []);
    let list = compareLists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('compare_list'),
        createdAt: this._nowIso()
      };
      compareLists.push(list);
      this._saveToStorage('compare_lists', compareLists);
    }
    return list;
  }

  // Learning plan helper
  _getOrCreateLearningPlan() {
    let plans = this._getFromStorage('learning_plans', []);
    let plan = plans[0] || null;
    if (!plan) {
      plan = {
        id: this._generateId('learning_plan'),
        name: 'My Learning Plan',
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      plans.push(plan);
      this._saveToStorage('learning_plans', plans);
    }
    return plan;
  }

  // Onsite training context helper (placeholder for transient state)
  _getOrCreateOnsiteTrainingContext() {
    // Transient context could be maintained in localStorage if needed.
    // For now, just ensure a key exists and return its parsed value.
    const key = 'onsite_training_context';
    let ctx = this._getFromStorage(key, null);
    if (!ctx || typeof ctx !== 'object') {
      ctx = {};
      this._saveToStorage(key, ctx);
    }
    return ctx;
  }

  // -----------------------------
  // Interface implementations
  // -----------------------------

  // 1) getHomepageContent()
  getHomepageContent() {
    const categories = this._getFromStorage('product_categories', []);
    const productsRaw = this._getFromStorage('products', []);
    const coursesRaw = this._getFromStorage('courses', []);
    const hero = this._getFromStorage('homepage_hero', {
      title: '',
      subtitle: '',
      imageUrl: '',
      callToActionType: ''
    });
    const promotions = this._getFromStorage('homepage_promotions', []);

    const primaryProductCategories = categories
      .filter((c) => !c.parentCategoryId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const categoriesById = categories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    const featuredProducts = productsRaw
      .filter((p) => p.status === 'active')
      .sort((a, b) => {
        const aDate = a.createdAt || '1970-01-01';
        const bDate = b.createdAt || '1970-01-01';
        if (aDate < bDate) return 1;
        if (aDate > bDate) return -1;
        return 0;
      })
      .slice(0, 10)
      .map((p) => ({ ...p, category: categoriesById[p.categoryId] || null }));

    const courseCategories = this._getFromStorage('course_categories', []);
    const courseCategoriesById = courseCategories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    const featuredCourses = coursesRaw
      .filter((c) => c.status === 'active')
      .sort((a, b) => {
        const aDate = a.createdAt || '1970-01-01';
        const bDate = b.createdAt || '1970-01-01';
        if (aDate < bDate) return 1;
        if (aDate > bDate) return -1;
        return 0;
      })
      .slice(0, 10)
      .map((c) => ({ ...c, category: courseCategoriesById[c.categoryId] || null }));

    return {
      primaryProductCategories,
      featuredProducts,
      featuredCourses,
      heroBanner: hero,
      promotions
    };
  }

  // 2) globalSearch(query, scope, page, pageSize)
  globalSearch(query, scope, page = 1, pageSize = 20) {
    const q = (query || '').toLowerCase().trim();
    const scopeVal = scope || 'all';

    const productsRaw = this._getFromStorage('products', []);
    const coursesRaw = this._getFromStorage('courses', []);
    const productCategories = this._getFromStorage('product_categories', []);
    const courseCategories = this._getFromStorage('course_categories', []);

    const productCategoriesById = productCategories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
    const courseCategoriesById = courseCategories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    let matchedProducts = [];
    let matchedCourses = [];

    if (scopeVal === 'all' || scopeVal === 'products_only') {
      matchedProducts = productsRaw.filter((p) => {
        if (!q) return true;
        const fields = [
          p.name,
          p.sku,
          p.categoryName,
          p.subcategoryName,
          p.shortDescription,
          p.longDescription
        ];
        return fields.some((f) => typeof f === 'string' && f.toLowerCase().includes(q));
      });
    }

    if (scopeVal === 'all' || scopeVal === 'courses_only') {
      matchedCourses = coursesRaw.filter((c) => {
        if (!q) return true;
        const fields = [c.title, c.code, c.descriptionShort, c.descriptionLong];
        return fields.some((f) => typeof f === 'string' && f.toLowerCase().includes(q));
      });
    }

    const totalProducts = matchedProducts.length;
    const totalCourses = matchedCourses.length;

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const pagedProducts = matchedProducts
      .slice(startIndex, endIndex)
      .map((p) => ({ ...p, category: productCategoriesById[p.categoryId] || null }));

    const pagedCourses = matchedCourses
      .slice(startIndex, endIndex)
      .map((c) => ({ ...c, category: courseCategoriesById[c.categoryId] || null }));

    return {
      products: pagedProducts,
      courses: pagedCourses,
      totalProducts,
      totalCourses
    };
  }

  // 3) getProductCategoriesForNavigation()
  getProductCategoriesForNavigation() {
    const categories = this._getFromStorage('product_categories', []);
    const categoriesById = categories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    // Resolve parentCategoryId -> parentCategory
    return categories
      .slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((c) => ({
        ...c,
        parentCategory: c.parentCategoryId ? categoriesById[c.parentCategoryId] || null : null
      }));
  }

  // 4) getProductFilterOptions(categoryId, subcategoryName)
  getProductFilterOptions(categoryId, subcategoryName) {
    const products = this._getFromStorage('products', []);
    let filtered = products;

    if (categoryId) {
      const ids = this._getDescendantProductCategoryIds(categoryId);
      filtered = filtered.filter((p) => ids.has(p.categoryId));
    }

    if (subcategoryName) {
      filtered = filtered.filter((p) => p.subcategoryName === subcategoryName);
    }

    if (filtered.length === 0) {
      return {
        priceRange: { min: 0, max: 0 },
        ratingOptions: [],
        shippingOptions: [
          { key: 'free_shipping_only', label: 'Free shipping only' }
        ],
        attributeFilters: {
          connectionSizesInches: [],
          pressureRatingPsiValues: [],
          nrrValues: [],
          complianceStandards: [],
          featureFlags: [],
          containerVolumeGallonsValues: []
        },
        sortOptions: [
          { key: 'popularity_desc', label: 'Popularity - High to Low' },
          { key: 'price_asc', label: 'Price - Low to High' },
          { key: 'price_desc', label: 'Price - High to Low' },
          { key: 'rating_desc', label: 'Rating - High to Low' }
        ]
      };
    }

    let minPrice = Infinity;
    let maxPrice = 0;
    const connectionSizes = new Set();
    const pressureRatings = new Set();
    const nrrValues = new Set();
    const complianceStandards = new Set();
    const featureFlags = new Set();
    const containerVolumes = new Set();

    filtered.forEach((p) => {
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.connectionSizeInches === 'number') {
        connectionSizes.add(p.connectionSizeInches);
      }
      if (typeof p.pressureRatingPsi === 'number') {
        pressureRatings.add(p.pressureRatingPsi);
      }
      if (typeof p.nrr === 'number') {
        nrrValues.add(p.nrr);
      }
      if (p.isAnsiS3_19Certified) {
        complianceStandards.add('ansi_s3_19');
      }
      if (p.isCutResistant) {
        featureFlags.add('cut_resistant');
      }
      if (p.isAutoDarkening) {
        featureFlags.add('auto_darkening');
      }
      if (typeof p.containerVolumeGallons === 'number') {
        containerVolumes.add(p.containerVolumeGallons);
      }
    });

    if (minPrice === Infinity) minPrice = 0;

    return {
      priceRange: { min: minPrice, max: maxPrice },
      ratingOptions: [
        { value: 3, label: '3 stars & up' },
        { value: 4, label: '4 stars & up' },
        { value: 4.5, label: '4.5 stars & up' },
        { value: 5, label: '5 stars' }
      ],
      shippingOptions: [
        { key: 'free_shipping_only', label: 'Free shipping only' }
      ],
      attributeFilters: {
        connectionSizesInches: Array.from(connectionSizes).sort((a, b) => a - b),
        pressureRatingPsiValues: Array.from(pressureRatings).sort((a, b) => a - b),
        nrrValues: Array.from(nrrValues).sort((a, b) => a - b),
        complianceStandards: Array.from(complianceStandards).map((key) => ({
          key,
          label: key === 'ansi_s3_19' ? 'ANSI S3.19' : key
        })),
        featureFlags: Array.from(featureFlags).map((key) => ({
          key,
          label:
            key === 'auto_darkening'
              ? 'Auto-darkening'
              : key === 'cut_resistant'
              ? 'Cut-resistant'
              : key
        })),
        containerVolumeGallonsValues: Array.from(containerVolumes).sort((a, b) => a - b)
      },
      sortOptions: [
        { key: 'popularity_desc', label: 'Popularity - High to Low' },
        { key: 'price_asc', label: 'Price - Low to High' },
        { key: 'price_desc', label: 'Price - High to Low' },
        { key: 'rating_desc', label: 'Rating - High to Low' }
      ]
    };
  }

  // 5) searchProducts(query, categoryId, filters, sort, page, pageSize)
  searchProducts(query, categoryId, filters, sort, page = 1, pageSize = 20) {
    const q = (query || '').toLowerCase().trim();
    const productsRaw = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const categoriesById = categories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    let items = productsRaw;

    if (categoryId) {
      const ids = this._getDescendantProductCategoryIds(categoryId);
      items = items.filter((p) => ids.has(p.categoryId));
    }

    if (q) {
      items = items.filter((p) => {
        const fields = [
          p.name,
          p.sku,
          p.categoryName,
          p.subcategoryName,
          p.shortDescription,
          p.longDescription
        ];
        return fields.some((f) => typeof f === 'string' && f.toLowerCase().includes(q));
      });
    }

    const f = filters || {};

    if (typeof f.productType === 'string') {
      items = items.filter((p) => p.productType === f.productType);
    }
    if (typeof f.minPrice === 'number') {
      items = items.filter((p) => typeof p.price === 'number' && p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      items = items.filter((p) => typeof p.price === 'number' && p.price <= f.maxPrice);
    }
    if (typeof f.minRating === 'number') {
      items = items.filter((p) => typeof p.rating === 'number' && p.rating >= f.minRating);
    }
    if (typeof f.isFreeShipping === 'boolean') {
      items = items.filter((p) => !!p.isFreeShipping === f.isFreeShipping);
    }
    if (typeof f.isCutResistant === 'boolean') {
      items = items.filter((p) => !!p.isCutResistant === f.isCutResistant);
    }
    if (typeof f.isAutoDarkening === 'boolean') {
      items = items.filter((p) => !!p.isAutoDarkening === f.isAutoDarkening);
    }
    if (typeof f.isAnsiS3_19Certified === 'boolean') {
      items = items.filter((p) => !!p.isAnsiS3_19Certified === f.isAnsiS3_19Certified);
    }
    if (typeof f.minNrr === 'number') {
      items = items.filter((p) => typeof p.nrr === 'number' && p.nrr >= f.minNrr);
    }
    if (typeof f.connectionSizeInches === 'number') {
      items = items.filter(
        (p) => typeof p.connectionSizeInches === 'number' && p.connectionSizeInches === f.connectionSizeInches
      );
    }
    if (typeof f.minPressureRatingPsi === 'number') {
      items = items.filter(
        (p) => typeof p.pressureRatingPsi === 'number' && p.pressureRatingPsi >= f.minPressureRatingPsi
      );
    }
    if (typeof f.containerVolumeGallonsEquals === 'number') {
      items = items.filter(
        (p) => typeof p.containerVolumeGallons === 'number' && p.containerVolumeGallons === f.containerVolumeGallonsEquals
      );
    }

    if (sort === 'price_asc') {
      items = items.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_desc') {
      items = items.slice().sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rating_desc') {
      items = items
        .slice()
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'popularity_desc') {
      items = items
        .slice()
        .sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0));
    }

    const totalCount = items.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const paged = items.slice(startIndex, endIndex).map((p) => ({
      ...p,
      category: categoriesById[p.categoryId] || null
    }));

    return {
      items: paged,
      totalCount,
      page,
      pageSize
    };
  }

  // 6) getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const categoriesById = categories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { product: null, relatedProducts: [] };
    }

    const productWithCategory = { ...product, category: categoriesById[product.categoryId] || null };

    const relatedProducts = products
      .filter((p) => p.id !== productId && p.categoryId === product.categoryId)
      .slice(0, 10)
      .map((p) => ({ ...p, category: categoriesById[p.categoryId] || null }));

    return {
      product: productWithCategory,
      relatedProducts
    };
  }

  // Helper: trackProductDatasheetOpened(productId)
  trackProductDatasheetOpened(productId) {
    // Instrumentation for task completion tracking (Task 6)
    try {
      localStorage.setItem('task6_datasheetOpenedProductId', productId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }
  }

  // 7) addToCart(productId, quantity)
  addToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Product not found',
        cartSummary: { itemCount: 0, subtotal: 0, currency: 'usd' }
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    let cartItem = cartItems.find((ci) => ci.cartId === cart.id && ci.productId === productId);
    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.updatedAt = this._nowIso();
      cartItem.lineSubtotal = cartItem.unitPrice * cartItem.quantity;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: qty,
        lineSubtotal: product.price * qty,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart.id);

    const carts = this._getFromStorage('carts', []);
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;
    const allCartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = allCartItems.filter((ci) => ci.cartId === cart.id);
    const itemCount = itemsForCart.reduce((sum, ci) => sum + ci.quantity, 0);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Product added to cart',
      cartSummary: {
        itemCount,
        subtotal: updatedCart.subtotal || 0,
        currency: updatedCart.currency || 'usd'
      }
    };
  }

  // 8) getCartDetails()
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    const items = itemsForCart.map((item) => {
      const product = products.find((p) => p.id === item.productId) || null;
      return {
        cartItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: product && product.sku ? product.sku : '',
        imageUrl: product && product.imageUrl ? product.imageUrl : '',
        productType: product ? product.productType : null,
        categoryName: product && product.categoryName ? product.categoryName : '',
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineSubtotal: item.lineSubtotal,
        product
      };
    });

    return {
      cart: {
        id: cart.id,
        currency: cart.currency || 'usd',
        subtotal: cart.subtotal || 0,
        items
      }
    };
  }

  // 9) updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return {
        success: false,
        cart: {
          id: null,
          subtotal: 0,
          currency: 'usd'
        }
      };
    }

    const item = cartItems[itemIndex];
    const cartId = item.cartId;

    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      item.quantity = quantity;
      item.updatedAt = this._nowIso();
      item.lineSubtotal = item.unitPrice * item.quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cartId);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find((c) => c.id === cartId) || { id: cartId, subtotal: 0, currency: 'usd' };

    return {
      success: true,
      cart: {
        id: cart.id,
        subtotal: cart.subtotal || 0,
        currency: cart.currency || 'usd'
      }
    };
  }

  // 10) removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        cart: {
          id: null,
          subtotal: 0,
          currency: 'usd'
        }
      };
    }

    const cartId = cartItems[index].cartId;
    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cartId);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find((c) => c.id === cartId) || { id: cartId, subtotal: 0, currency: 'usd' };

    return {
      success: true,
      cart: {
        id: cart.id,
        subtotal: cart.subtotal || 0,
        currency: cart.currency || 'usd'
      }
    };
  }

  // 11) addToQuoteList(productId, quantity)
  addToQuoteList(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        quoteListId: null,
        quoteItemId: null,
        message: 'Product not found',
        totalItems: 0
      };
    }

    const quoteList = this._getOrCreateQuoteList();
    const quoteItems = this._getFromStorage('quote_items', []);

    let item = quoteItems.find((qi) => qi.quoteListId === quoteList.id && qi.productId === productId);
    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('quote_item'),
        quoteListId: quoteList.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: qty,
        createdAt: this._nowIso()
      };
      quoteItems.push(item);
    }

    quoteList.updatedAt = this._nowIso();

    const quoteLists = this._getFromStorage('quote_lists', []);
    const listIndex = quoteLists.findIndex((l) => l.id === quoteList.id);
    if (listIndex !== -1) {
      quoteLists[listIndex] = quoteList;
      this._saveToStorage('quote_lists', quoteLists);
    }

    this._saveToStorage('quote_items', quoteItems);

    const totalItems = quoteItems.filter((qi) => qi.quoteListId === quoteList.id).length;

    return {
      success: true,
      quoteListId: quoteList.id,
      quoteItemId: item.id,
      message: 'Product added to quote list',
      totalItems
    };
  }

  // 12) getQuoteListDetails()
  getQuoteListDetails() {
    const quoteLists = this._getFromStorage('quote_lists', []);
    const quoteList = quoteLists[0] || null;
    if (!quoteList) {
      return {
        quoteListId: null,
        items: []
      };
    }

    const quoteItems = this._getFromStorage('quote_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForList = quoteItems.filter((qi) => qi.quoteListId === quoteList.id);

    const items = itemsForList.map((item) => {
      const product = products.find((p) => p.id === item.productId) || null;
      return {
        quoteItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: product && product.sku ? product.sku : '',
        imageUrl: product && product.imageUrl ? product.imageUrl : '',
        productType: product ? product.productType : null,
        categoryName: product && product.categoryName ? product.categoryName : '',
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        product
      };
    });

    return {
      quoteListId: quoteList.id,
      items
    };
  }

  // 13) updateQuoteItemQuantity(quoteItemId, quantity)
  updateQuoteItemQuantity(quoteItemId, quantity) {
    const quoteItems = this._getFromStorage('quote_items', []);
    const index = quoteItems.findIndex((qi) => qi.id === quoteItemId);
    if (index === -1) {
      return { success: false, quoteListId: null };
    }

    const item = quoteItems[index];
    const quoteListId = item.quoteListId;

    if (quantity <= 0) {
      quoteItems.splice(index, 1);
    } else {
      item.quantity = quantity;
    }

    this._saveToStorage('quote_items', quoteItems);

    const quoteLists = this._getFromStorage('quote_lists', []);
    const list = quoteLists.find((l) => l.id === quoteListId);
    if (list) {
      list.updatedAt = this._nowIso();
      this._saveToStorage('quote_lists', quoteLists);
    }

    return { success: true, quoteListId };
  }

  // 14) removeQuoteItem(quoteItemId)
  removeQuoteItem(quoteItemId) {
    const quoteItems = this._getFromStorage('quote_items', []);
    const index = quoteItems.findIndex((qi) => qi.id === quoteItemId);
    if (index === -1) {
      return { success: false, quoteListId: null };
    }

    const quoteListId = quoteItems[index].quoteListId;
    quoteItems.splice(index, 1);
    this._saveToStorage('quote_items', quoteItems);

    const quoteLists = this._getFromStorage('quote_lists', []);
    const list = quoteLists.find((l) => l.id === quoteListId);
    if (list) {
      list.updatedAt = this._nowIso();
      this._saveToStorage('quote_lists', quoteLists);
    }

    return { success: true, quoteListId };
  }

  // 15) submitQuoteRequest(companyName, contactName, phone, email, comments)
  submitQuoteRequest(companyName, contactName, phone, email, comments) {
    const quoteLists = this._getFromStorage('quote_lists', []);
    const quoteList = quoteLists[0] || null;
    const quoteItems = this._getFromStorage('quote_items', []);

    if (!quoteList || quoteItems.filter((qi) => qi.quoteListId === quoteList.id).length === 0) {
      return {
        success: false,
        quoteRequestId: null,
        status: 'draft',
        message: 'No items in quote list to submit'
      };
    }

    const quoteRequests = this._getFromStorage('quote_requests', []);

    const request = {
      id: this._generateId('quote_request'),
      quoteListId: quoteList.id,
      companyName,
      contactName,
      phone,
      email,
      comments: comments || '',
      status: 'submitted',
      submittedAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    quoteRequests.push(request);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      quoteRequestId: request.id,
      status: request.status,
      message: 'Quote request submitted'
    };
  }

  // 16) getWishlistDetails()
  getWishlistDetails() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForWishlist = wishlistItems.filter((wi) => wi.wishlistId === wishlist.id);

    const items = itemsForWishlist.map((item) => {
      const product = products.find((p) => p.id === item.productId) || null;
      return {
        wishlistItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        imageUrl: product && product.imageUrl ? product.imageUrl : '',
        productType: product ? product.productType : null,
        categoryName: product && product.categoryName ? product.categoryName : '',
        addedAt: item.addedAt,
        product
      };
    });

    return {
      wishlistId: wishlist.id,
      name: wishlist.name,
      items
    };
  }

  // 17) addToWishlist(productId)
  addToWishlist(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        wishlistId: null,
        wishlistItemId: null,
        totalItems: 0,
        message: 'Product not found'
      };
    }

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    let item = wishlistItems.find(
      (wi) => wi.wishlistId === wishlist.id && wi.productId === productId
    );

    if (!item) {
      item = {
        id: this._generateId('wishlist_item'),
        wishlistId: wishlist.id,
        productId: product.id,
        productName: product.name,
        addedAt: this._nowIso()
      };
      wishlistItems.push(item);
      this._saveToStorage('wishlist_items', wishlistItems);

      const wishlists = this._getFromStorage('wishlists', []);
      const wlIndex = wishlists.findIndex((w) => w.id === wishlist.id);
      if (wlIndex !== -1) {
        wishlists[wlIndex].updatedAt = this._nowIso();
        this._saveToStorage('wishlists', wishlists);
      }
    }

    const totalItems = wishlistItems.filter((wi) => wi.wishlistId === wishlist.id).length;

    return {
      success: true,
      wishlistId: wishlist.id,
      wishlistItemId: item.id,
      totalItems,
      message: 'Product added to wishlist'
    };
  }

  // 18) removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const index = wishlistItems.findIndex((wi) => wi.id === wishlistItemId);
    if (index === -1) {
      return { success: false, wishlistId: null, totalItems: 0 };
    }

    const wishlistId = wishlistItems[index].wishlistId;
    wishlistItems.splice(index, 1);
    this._saveToStorage('wishlist_items', wishlistItems);

    const totalItems = wishlistItems.filter((wi) => wi.wishlistId === wishlistId).length;

    return { success: true, wishlistId, totalItems };
  }

  // 19) removeFromWishlistByProductId(productId)
  removeFromWishlistByProductId(productId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    const index = wishlistItems.findIndex(
      (wi) => wi.wishlistId === wishlist.id && wi.productId === productId
    );
    if (index === -1) {
      const totalItemsNoChange = wishlistItems.filter((wi) => wi.wishlistId === wishlist.id).length;
      return { success: false, wishlistId: wishlist.id, totalItems: totalItemsNoChange };
    }

    wishlistItems.splice(index, 1);
    this._saveToStorage('wishlist_items', wishlistItems);

    const totalItems = wishlistItems.filter((wi) => wi.wishlistId === wishlist.id).length;

    return { success: true, wishlistId: wishlist.id, totalItems };
  }

  // 20) renameWishlist(name)
  renameWishlist(name) {
    const wishlist = this._getOrCreateWishlist();
    const wishlists = this._getFromStorage('wishlists', []);
    const index = wishlists.findIndex((w) => w.id === wishlist.id);
    if (index !== -1) {
      wishlists[index].name = name;
      wishlists[index].updatedAt = this._nowIso();
      this._saveToStorage('wishlists', wishlists);
    }

    return {
      success: true,
      wishlistId: wishlist.id,
      name
    };
  }

  // 21) addToCompareList(productId)
  addToCompareList(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        compareListId: null,
        currentItemCount: 0,
        message: 'Product not found'
      };
    }

    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items', []);

    let item = compareItems.find(
      (ci) => ci.compareListId === compareList.id && ci.productId === productId
    );

    if (!item) {
      item = {
        id: this._generateId('compare_item'),
        compareListId: compareList.id,
        productId: product.id,
        addedAt: this._nowIso()
      };
      compareItems.push(item);
      this._saveToStorage('compare_items', compareItems);
    }

    const currentItemCount = compareItems.filter((ci) => ci.compareListId === compareList.id).length;

    return {
      success: true,
      compareListId: compareList.id,
      currentItemCount,
      message: 'Product added to compare list'
    };
  }

  // 22) removeFromCompareList(productId)
  removeFromCompareList(productId) {
    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items', []);

    const filtered = compareItems.filter(
      (ci) => !(ci.compareListId === compareList.id && ci.productId === productId)
    );

    this._saveToStorage('compare_items', filtered);

    const currentItemCount = filtered.filter((ci) => ci.compareListId === compareList.id).length;

    return {
      success: true,
      compareListId: compareList.id,
      currentItemCount
    };
  }

  // 23) getCompareListDetails()
  getCompareListDetails() {
    const compareLists = this._getFromStorage('compare_lists', []);
    const compareList = compareLists[0] || null;
    if (!compareList) {
      return { compareListId: null, products: [] };
    }

    const compareItems = this._getFromStorage('compare_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForList = compareItems.filter((ci) => ci.compareListId === compareList.id);
    const productsResult = itemsForList
      .map((ci) => products.find((p) => p.id === ci.productId) || null)
      .filter((p) => !!p)
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        imageUrl: p.imageUrl || '',
        productType: p.productType,
        price: p.price,
        currency: p.currency,
        rating: p.rating,
        ratingCount: p.ratingCount,
        weightOunces: p.weightOunces,
        isAutoDarkening: !!p.isAutoDarkening,
        categoryName: p.categoryName || '',
        shortDescription: p.shortDescription || ''
      }));

    return {
      compareListId: compareList.id,
      products: productsResult
    };
  }

  // 24) clearCompareList()
  clearCompareList() {
    const compareLists = this._getFromStorage('compare_lists', []);
    const compareList = compareLists[0] || null;
    if (!compareList) {
      return { success: true, compareListId: null };
    }

    const compareItems = this._getFromStorage('compare_items', []);
    const filtered = compareItems.filter((ci) => ci.compareListId !== compareList.id);
    this._saveToStorage('compare_items', filtered);

    return { success: true, compareListId: compareList.id };
  }

  // 25) getCourseCategoriesForNavigation()
  getCourseCategoriesForNavigation() {
    const categories = this._getFromStorage('course_categories', []);
    return categories
      .slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  // 26) getTrainingCatalogFilterOptions(categoryId)
  getTrainingCatalogFilterOptions(categoryId) {
    const courses = this._getFromStorage('courses', []);
    let filtered = courses.filter((c) => c.status === 'active');

    if (categoryId) {
      filtered = filtered.filter((c) => c.categoryId === categoryId);
    }

    if (filtered.length === 0) {
      return {
        priceRange: { min: 0, max: 0 },
        durationRangeHours: { min: 0, max: 0 },
        formatOptions: [],
        sortOptions: [
          { key: 'duration_asc', label: 'Duration - Shortest first' },
          { key: 'price_asc', label: 'Price - Low to High' },
          { key: 'price_desc', label: 'Price - High to Low' }
        ]
      };
    }

    let minPrice = Infinity;
    let maxPrice = 0;
    let minDuration = Infinity;
    let maxDuration = 0;
    const formatSet = new Set();

    filtered.forEach((c) => {
      if (typeof c.basePrice === 'number') {
        if (c.basePrice < minPrice) minPrice = c.basePrice;
        if (c.basePrice > maxPrice) maxPrice = c.basePrice;
      }
      if (typeof c.durationHours === 'number') {
        if (c.durationHours < minDuration) minDuration = c.durationHours;
        if (c.durationHours > maxDuration) maxDuration = c.durationHours;
      }
      if (c.defaultFormat) formatSet.add(c.defaultFormat);
    });

    if (minPrice === Infinity) minPrice = 0;
    if (minDuration === Infinity) minDuration = 0;

    const formatOptions = Array.from(formatSet).map((key) => ({
      key,
      label:
        key === 'online_virtual'
          ? 'Online / Virtual'
          : key === 'classroom'
          ? 'Classroom'
          : key === 'self_paced'
          ? 'Self-paced'
          : key === 'blended'
          ? 'Blended'
          : key === 'onsite_eligible'
          ? 'Onsite-eligible'
          : key
    }));

    return {
      priceRange: { min: minPrice, max: maxPrice },
      durationRangeHours: { min: minDuration, max: maxDuration },
      formatOptions,
      sortOptions: [
        { key: 'duration_asc', label: 'Duration - Shortest first' },
        { key: 'price_asc', label: 'Price - Low to High' },
        { key: 'price_desc', label: 'Price - High to Low' }
      ]
    };
  }

  // 27) searchCourses(query, categoryId, filters, sort, page, pageSize)
  searchCourses(query, categoryId, filters, sort, page = 1, pageSize = 20) {
    const q = (query || '').toLowerCase().trim();
    const coursesRaw = this._getFromStorage('courses', []);
    const courseCategories = this._getFromStorage('course_categories', []);
    const courseCategoriesById = courseCategories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    let items = coursesRaw.filter((c) => c.status === 'active');

    if (categoryId) {
      items = items.filter((c) => c.categoryId === categoryId);
    }

    if (q) {
      items = items.filter((c) => {
        const fields = [c.title, c.code, c.descriptionShort, c.descriptionLong];
        return fields.some((f) => typeof f === 'string' && f.toLowerCase().includes(q));
      });
    }

    const f = filters || {};

    if (typeof f.minPrice === 'number') {
      items = items.filter(
        (c) => typeof c.basePrice === 'number' && c.basePrice >= f.minPrice
      );
    }
    if (typeof f.maxPrice === 'number') {
      items = items.filter(
        (c) => typeof c.basePrice === 'number' && c.basePrice <= f.maxPrice
      );
    }
    if (typeof f.minDurationHours === 'number') {
      items = items.filter(
        (c) => typeof c.durationHours === 'number' && c.durationHours >= f.minDurationHours
      );
    }
    if (typeof f.maxDurationHours === 'number') {
      items = items.filter(
        (c) => typeof c.durationHours === 'number' && c.durationHours <= f.maxDurationHours
      );
    }
    if (Array.isArray(f.formats) && f.formats.length > 0) {
      const allowed = new Set(f.formats);
      items = items.filter((c) => c.defaultFormat && allowed.has(c.defaultFormat));
    }
    if (typeof f.isMachineOperation === 'boolean') {
      items = items.filter((c) => !!c.isMachineOperation === f.isMachineOperation);
    }

    if (sort === 'duration_asc') {
      items = items
        .slice()
        .sort((a, b) => (a.durationHours || 0) - (b.durationHours || 0));
    } else if (sort === 'price_asc') {
      items = items
        .slice()
        .sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    } else if (sort === 'price_desc') {
      items = items
        .slice()
        .sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    }

    const totalCount = items.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const paged = items.slice(startIndex, endIndex).map((c) => ({
      ...c,
      category: courseCategoriesById[c.categoryId] || null
    }));

    return {
      items: paged,
      totalCount,
      page,
      pageSize
    };
  }

  // 28) searchCourseSessions(query, courseCategoryId, filters, sort, page, pageSize)
  searchCourseSessions(query, courseCategoryId, filters, sort, page = 1, pageSize = 20) {
    const q = (query || '').toLowerCase().trim();

    const courses = this._getFromStorage('courses', []);
    const sessions = this._getFromStorage('course_sessions', []);
    const courseCategories = this._getFromStorage('course_categories', []);
    const courseCategoriesById = courseCategories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    const f = filters || {};

    const items = [];

    sessions.forEach((session) => {
      const course = courses.find((c) => c.id === session.courseId);
      if (!course) return;
      if (course.status !== 'active') return;

      if (courseCategoryId && course.categoryId !== courseCategoryId) {
        return;
      }

      if (q) {
        const title = course.title || '';
        const sessionName = session.name || '';
        if (
          !title.toLowerCase().includes(q) &&
          !sessionName.toLowerCase().includes(q)
        ) {
          return;
        }
      }

      if (f.format && session.format !== f.format) {
        return;
      }
      if (typeof f.minPrice === 'number' && session.price < f.minPrice) {
        return;
      }
      if (typeof f.maxPrice === 'number' && session.price > f.maxPrice) {
        return;
      }

      if (f.startDate) {
        const startDate = new Date(session.startDateTime);
        const minDate = new Date(f.startDate + 'T00:00:00');
        if (startDate < minDate) return;
      }
      if (f.endDate) {
        const startDate = new Date(session.startDateTime);
        const maxDate = new Date(f.endDate + 'T23:59:59');
        if (startDate > maxDate) return;
      }

      const category = courseCategoriesById[course.categoryId] || null;

      items.push({
        courseId: course.id,
        courseTitle: course.title,
        courseCategoryName: category ? category.name : null,
        durationHours: course.durationHours,
        sessionId: session.id,
        sessionName: session.name || '',
        format: session.format,
        startDateTime: session.startDateTime,
        endDateTime: session.endDateTime,
        price: session.price,
        currency: session.currency,
        location: session.location || '',
        enrollmentStatus: session.enrollmentStatus,
        course: { ...course, category }
      });
    });

    if (sort === 'start_date_asc') {
      items.sort((a, b) => {
        const aDate = new Date(a.startDateTime).getTime();
        const bDate = new Date(b.startDateTime).getTime();
        return aDate - bDate;
      });
    } else if (sort === 'price_asc') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_desc') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    const totalCount = items.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paged = items.slice(startIndex, endIndex);

    return {
      items: paged,
      totalCount,
      page,
      pageSize
    };
  }

  // 29) getCourseDetails(courseId)
  getCourseDetails(courseId) {
    const courses = this._getFromStorage('courses', []);
    const sessions = this._getFromStorage('course_sessions', []);
    const courseCategories = this._getFromStorage('course_categories', []);
    const courseCategoriesById = courseCategories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    const course = courses.find((c) => c.id === courseId) || null;
    if (!course) {
      return { course: null, upcomingSessions: [] };
    }

    const category = courseCategoriesById[course.categoryId] || null;
    const courseWithCategory = { ...course, category };

    const upcomingSessions = sessions
      .filter((s) => s.courseId === courseId)
      .map((s) => ({
        ...s,
        course: courseWithCategory
      }));

    return {
      course: courseWithCategory,
      upcomingSessions
    };
  }

  // 30) submitEnrollment(courseSessionId, learnerName, companyName, phone, email, paymentMethod)
  submitEnrollment(courseSessionId, learnerName, companyName, phone, email, paymentMethod) {
    const sessions = this._getFromStorage('course_sessions', []);
    const courses = this._getFromStorage('courses', []);

    const session = sessions.find((s) => s.id === courseSessionId) || null;
    if (!session) {
      return {
        success: false,
        enrollmentId: null,
        status: 'cancelled',
        courseTitle: '',
        sessionStartDateTime: '',
        message: 'Course session not found'
      };
    }

    const course = courses.find((c) => c.id === session.courseId) || null;

    const enrollments = this._getFromStorage('enrollments', []);

    const enrollment = {
      id: this._generateId('enrollment'),
      courseId: session.courseId,
      courseSessionId: session.id,
      courseTitle: course ? course.title : '',
      sessionStartDateTime: session.startDateTime,
      learnerName,
      companyName: companyName || '',
      phone,
      email,
      paymentMethod,
      status: 'submitted',
      submittedAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    enrollments.push(enrollment);
    this._saveToStorage('enrollments', enrollments);

    return {
      success: true,
      enrollmentId: enrollment.id,
      status: enrollment.status,
      courseTitle: enrollment.courseTitle,
      sessionStartDateTime: enrollment.sessionStartDateTime,
      message: 'Enrollment submitted'
    };
  }

  // 31) addCourseToLearningPlan(courseId)
  addCourseToLearningPlan(courseId) {
    const courses = this._getFromStorage('courses', []);
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      return {
        success: false,
        learningPlanId: null,
        learningPlanItemId: null,
        totalItems: 0,
        totalDurationHours: 0
      };
    }

    const plan = this._getOrCreateLearningPlan();
    const items = this._getFromStorage('learning_plan_items', []);

    let existing = items.find((i) => i.learningPlanId === plan.id && i.courseId === courseId);
    if (existing) {
      // Do not add duplicate; just recompute totals
      const totalDuration = items
        .filter((i) => i.learningPlanId === plan.id)
        .reduce((sum, i) => sum + (i.durationHours || 0), 0);
      const totalItems = items.filter((i) => i.learningPlanId === plan.id).length;
      return {
        success: true,
        learningPlanId: plan.id,
        learningPlanItemId: existing.id,
        totalItems,
        totalDurationHours: totalDuration
      };
    }

    const position =
      items
        .filter((i) => i.learningPlanId === plan.id)
        .reduce((max, i) => (i.position > max ? i.position : max), 0) + 1;

    const newItem = {
      id: this._generateId('learning_plan_item'),
      learningPlanId: plan.id,
      courseId: course.id,
      courseTitle: course.title,
      durationHours: course.durationHours,
      position,
      addedAt: this._nowIso()
    };

    items.push(newItem);
    this._saveToStorage('learning_plan_items', items);

    const plans = this._getFromStorage('learning_plans', []);
    const index = plans.findIndex((p) => p.id === plan.id);
    if (index !== -1) {
      plans[index].updatedAt = this._nowIso();
      this._saveToStorage('learning_plans', plans);
    }

    const planItems = items.filter((i) => i.learningPlanId === plan.id);
    const totalDuration = planItems.reduce((sum, i) => sum + (i.durationHours || 0), 0);

    return {
      success: true,
      learningPlanId: plan.id,
      learningPlanItemId: newItem.id,
      totalItems: planItems.length,
      totalDurationHours: totalDuration
    };
  }

  // 32) getLearningPlanDetails()
  getLearningPlanDetails() {
    const plan = this._getOrCreateLearningPlan();
    const items = this._getFromStorage('learning_plan_items', []);
    const courses = this._getFromStorage('courses', []);
    const courseCategories = this._getFromStorage('course_categories', []);
    const courseCategoriesById = courseCategories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    const planItems = items
      .filter((i) => i.learningPlanId === plan.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    let totalDurationHours = 0;
    const resultItems = planItems.map((item) => {
      const course = courses.find((c) => c.id === item.courseId) || null;
      const category = course ? courseCategoriesById[course.categoryId] || null : null;
      totalDurationHours += item.durationHours || 0;
      return {
        learningPlanItemId: item.id,
        position: item.position,
        courseId: item.courseId,
        courseTitle: item.courseTitle,
        durationHours: item.durationHours,
        categoryName: category ? category.name : null,
        defaultFormat: course ? course.defaultFormat : null,
        basePrice: course ? course.basePrice : null,
        currency: course ? course.currency : null,
        course: course ? { ...course, category } : null
      };
    });

    return {
      learningPlanId: plan.id,
      name: plan.name,
      totalDurationHours,
      items: resultItems
    };
  }

  // 33) removeLearningPlanItem(learningPlanItemId)
  removeLearningPlanItem(learningPlanItemId) {
    const plan = this._getOrCreateLearningPlan();
    const items = this._getFromStorage('learning_plan_items', []);
    const index = items.findIndex((i) => i.id === learningPlanItemId);
    if (index === -1) {
      const totalDuration = items
        .filter((i) => i.learningPlanId === plan.id)
        .reduce((sum, i) => sum + (i.durationHours || 0), 0);
      return { success: false, learningPlanId: plan.id, totalDurationHours: totalDuration };
    }

    items.splice(index, 1);

    const remaining = items
      .filter((i) => i.learningPlanId === plan.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    remaining.forEach((item, idx) => {
      item.position = idx + 1;
    });

    this._saveToStorage('learning_plan_items', items);

    const totalDurationHours = remaining.reduce(
      (sum, i) => sum + (i.durationHours || 0),
      0
    );

    return { success: true, learningPlanId: plan.id, totalDurationHours };
  }

  // 34) reorderLearningPlanItems(newOrder)
  reorderLearningPlanItems(newOrder) {
    const plan = this._getOrCreateLearningPlan();
    const items = this._getFromStorage('learning_plan_items', []);

    const planItems = items.filter((i) => i.learningPlanId === plan.id);
    const idToItem = planItems.reduce((acc, i) => {
      acc[i.id] = i;
      return acc;
    }, {});

    let position = 1;
    newOrder.forEach((id) => {
      const item = idToItem[id];
      if (item) {
        item.position = position++;
      }
    });

    // Any items not in newOrder maintain relative order after
    planItems
      .filter((i) => !newOrder.includes(i.id))
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .forEach((item) => {
        item.position = position++;
      });

    this._saveToStorage('learning_plan_items', items);

    return { success: true, learningPlanId: plan.id };
  }

  // 35) getOnsiteEligibleCourses()
  getOnsiteEligibleCourses() {
    const courses = this._getFromStorage('courses', []);
    const courseCategories = this._getFromStorage('course_categories', []);
    const courseCategoriesById = courseCategories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});

    return courses
      .filter((c) => c.isOnsiteAvailable && c.status === 'active')
      .map((c) => ({
        ...c,
        category: courseCategoriesById[c.categoryId] || null
      }));
  }

  // 36) submitOnsiteTrainingRequest(courseId, courseName, preferredDate, participantsCount, facilityStreet, facilityCity, facilityState, facilityPostalCode, locationPreference, equipmentOption, contactName, phone, email, additionalNotes)
  submitOnsiteTrainingRequest(
    courseId,
    courseName,
    preferredDate,
    participantsCount,
    facilityStreet,
    facilityCity,
    facilityState,
    facilityPostalCode,
    locationPreference,
    equipmentOption,
    contactName,
    phone,
    email,
    additionalNotes
  ) {
    const requests = this._getFromStorage('onsite_training_requests', []);

    const request = {
      id: this._generateId('onsite_training_request'),
      courseId: courseId || null,
      courseName,
      preferredDate: new Date(preferredDate + 'T00:00:00').toISOString(),
      participantsCount,
      facilityStreet,
      facilityCity,
      facilityState,
      facilityPostalCode,
      locationPreference,
      equipmentOption: equipmentOption || 'not_applicable',
      contactName,
      phone,
      email,
      additionalNotes: additionalNotes || '',
      status: 'submitted',
      submittedAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    requests.push(request);
    this._saveToStorage('onsite_training_requests', requests);

    return {
      success: true,
      onsiteTrainingRequestId: request.id,
      status: request.status,
      message: 'Onsite training request submitted'
    };
  }

  // 37) getAboutContent()
  getAboutContent() {
    const about = this._getFromStorage('about_content', {
      companyName: '',
      missionHtml: '',
      backgroundHtml: '',
      certifications: []
    });
    return about;
  }

  // 38) getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', {
      phone: '',
      supportEmail: '',
      salesEmail: '',
      mailingAddress: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
      }
    });
    return info;
  }

  // 39) submitContactForm(name, email, phone, subject, message)
  submitContactForm(name, email, phone, subject, message) {
    const tickets = this._getFromStorage('contact_tickets', []);

    const ticket = {
      id: this._generateId('contact_ticket'),
      name,
      email,
      phone: phone || '',
      subject,
      message,
      createdAt: this._nowIso()
    };

    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      ticketId: ticket.id,
      message: 'Contact form submitted'
    };
  }

  // 40) getFaqEntries(topicKey)
  getFaqEntries(topicKey) {
    const faqs = this._getFromStorage('faq_entries', []);
    if (!topicKey) return faqs;
    return faqs.filter((f) => f.topicKey === topicKey);
  }

  // 41) getPoliciesDocument(policyType)
  getPoliciesDocument(policyType) {
    const policies = this._getFromStorage('policies', []);
    const doc = policies.find((p) => p.policyType === policyType);
    if (!doc) {
      return {
        policyType,
        title: '',
        contentHtml: '',
        lastUpdated: ''
      };
    }
    return doc;
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