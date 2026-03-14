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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Helper to ensure an array storage key exists
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Legacy / template keys (kept for compatibility, not used directly)
    ensureArray('users');

    // Core data tables based on data models
    ensureArray('categories');
    ensureArray('subcategories');
    ensureArray('styles');
    ensureArray('products');
    ensureArray('carts');
    ensureArray('cart_items');
    ensureArray('design_services');
    ensureArray('appointment_slots');
    ensureArray('service_appointments');
    ensureArray('design_packages');
    ensureArray('package_room_size_options');
    ensureArray('package_color_palette_options');
    ensureArray('package_tier_options');
    ensureArray('package_quote_requests');
    ensureArray('articles');
    ensureArray('favorite_articles');
    ensureArray('account_profiles');
    ensureArray('style_quiz_questions');
    ensureArray('style_quiz_answer_options');
    ensureArray('style_quiz_results');
    ensureArray('custom_shelving_configurations');
    ensureArray('shelving_modules');

    // About studio content: single-object storage
    if (!localStorage.getItem('about_studio_content')) {
      const emptyContent = {
        story: "",
        designPhilosophy: "",
        teamMembers: [],
        contact: {
          email: "",
          phone: "",
          location: ""
        }
      };
      localStorage.setItem('about_studio_content', JSON.stringify(emptyContent));
    }

    // Current shelving configuration id (single draft)
    if (!localStorage.getItem('current_shelving_configuration_id')) {
      localStorage.setItem('current_shelving_configuration_id', "");
    }

    // Global id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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

  _now() {
    return new Date().toISOString();
  }

  // ---------------------- Generic helpers ----------------------

  _findById(arr, id) {
    return arr.find((item) => item.id === id) || null;
  }

  _getFinishLabel(finishKey) {
    if (!finishKey) return "";
    switch (finishKey) {
      case 'walnut':
        return 'Walnut';
      case 'oak':
        return 'Oak';
      case 'white':
        return 'White';
      case 'black':
        return 'Black';
      case 'birch':
        return 'Birch';
      default:
        // Title-case generic
        return finishKey.charAt(0).toUpperCase() + finishKey.slice(1);
    }
  }

  _getModuleBasePrice(moduleType) {
    switch (moduleType) {
      case 'shelf':
        return 150;
      case 'cabinet':
        return 300;
      case 'drawer':
        return 200;
      default:
        return 150;
    }
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        itemIds: [],
        subtotal: 0,
        shippingTotal: 0,
        total: 0,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _updateCartInStorage(cart) {
    let carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx === -1) {
      carts.push(cart);
    } else {
      carts[idx] = cart;
    }
    this._saveToStorage('carts', carts);
  }

  _calculateCartTotals(cart, allCartItems, allProducts) {
    let subtotal = 0;
    let shippingTotal = 0;
    const now = this._now();

    const itemsForCart = allCartItems.filter((ci) => ci.cartId === cart.id);
    itemsForCart.forEach((ci) => {
      const product = allProducts.find((p) => p.id === ci.productId) || null;
      const unitPrice = ci.unitPrice != null ? ci.unitPrice : (product ? product.price || 0 : 0);
      ci.unitPrice = unitPrice;
      const lineSubtotal = unitPrice * ci.quantity;
      ci.lineSubtotal = lineSubtotal;
      subtotal += lineSubtotal;

      if (product) {
        const perUnitShipping = product.freeShipping ? 0 : (product.shippingCost || 0);
        shippingTotal += perUnitShipping * ci.quantity;
      }
    });

    cart.subtotal = subtotal;
    cart.shippingTotal = shippingTotal;
    cart.total = subtotal + shippingTotal;
    cart.updatedAt = now;

    this._updateCartInStorage(cart);
    this._saveToStorage('cart_items', allCartItems);

    return { subtotal, shippingTotal, total: subtotal + shippingTotal };
  }

  _buildCartSummary(cart, allCartItems, allProducts, categories, styles) {
    const itemsForCart = allCartItems.filter((ci) => ci.cartId === cart.id);
    let itemCount = 0;
    const items = itemsForCart.map((ci) => {
      const product = allProducts.find((p) => p.id === ci.productId) || null;
      const category = product ? categories.find((c) => c.id === product.categoryId) || null : null;
      const style = product && product.styleKey ? styles.find((s) => s.key === product.styleKey) || null : null;

      itemCount += ci.quantity;

      return {
        cartItemId: ci.id,
        productId: ci.productId,
        productName: product ? product.name : "",
        productThumbnailUrl: product && Array.isArray(product.imageUrls) && product.imageUrls.length > 0 ? product.imageUrls[0] : null,
        categoryName: category ? category.name : "",
        styleName: style ? style.name : "",
        unitPrice: ci.unitPrice,
        quantity: ci.quantity,
        lineSubtotal: ci.lineSubtotal,
        freeShipping: product ? !!product.freeShipping : false,
        shippingCost: product ? (product.shippingCost || 0) : 0,
        // Foreign key resolution
        product: product
      };
    });

    return {
      items,
      subtotal: cart.subtotal || 0,
      shippingTotal: cart.shippingTotal || 0,
      total: cart.total || 0,
      currency: 'usd',
      itemCount
    };
  }

  // ---------------------- Style quiz helpers ----------------------

  _determineRecommendedStyleFromAnswers(answerOptionIds) {
    const answerOptions = this._getFromStorage('style_quiz_answer_options', []);
    const styles = this._getFromStorage('styles', []);

    const styleCounts = {};

    answerOptionIds.forEach((id) => {
      const opt = answerOptions.find((o) => o.id === id) || null;
      if (opt && opt.associatedStyleKey) {
        const key = opt.associatedStyleKey;
        styleCounts[key] = (styleCounts[key] || 0) + 1;
      }
    });

    let recommendedStyleKey = null;
    let maxCount = -1;
    Object.keys(styleCounts).forEach((key) => {
      const count = styleCounts[key];
      if (count > maxCount) {
        maxCount = count;
        recommendedStyleKey = key;
      }
    });

    if (!recommendedStyleKey) {
      // Fallback: first active style or just first style
      const activeStyle = styles.find((s) => s.isActive) || styles[0] || null;
      recommendedStyleKey = activeStyle ? activeStyle.key : 'modern';
    }

    return recommendedStyleKey;
  }

  // ---------------------- Account helpers ----------------------

  _getSingleAccountProfile() {
    const profiles = this._getFromStorage('account_profiles', []);
    return profiles[0] || null;
  }

  _saveSingleAccountProfile(profile) {
    let profiles = this._getFromStorage('account_profiles', []);
    if (profiles.length === 0) {
      profiles.push(profile);
    } else {
      profiles[0] = profile;
    }
    this._saveToStorage('account_profiles', profiles);
  }

  // ---------------------- Shelving helpers ----------------------

  _getCurrentDraftShelvingConfiguration() {
    let configs = this._getFromStorage('custom_shelving_configurations', []);
    let currentId = localStorage.getItem('current_shelving_configuration_id') || "";
    let config = currentId ? configs.find((c) => c.id === currentId) || null : null;

    if (!config) {
      config = {
        id: this._generateId('shelf_cfg'),
        name: "",
        widthCm: 0,
        heightCm: 0,
        finishKey: 'walnut',
        moduleIds: [],
        totalPrice: 0,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      configs.push(config);
      this._saveToStorage('custom_shelving_configurations', configs);
      localStorage.setItem('current_shelving_configuration_id', config.id);
    }

    return config;
  }

  _calculateShelvingTotalPrice(configurationId) {
    const configs = this._getFromStorage('custom_shelving_configurations', []);
    const modules = this._getFromStorage('shelving_modules', []);
    const configIndex = configs.findIndex((c) => c.id === configurationId);
    if (configIndex === -1) {
      return 0;
    }

    const config = configs[configIndex];
    const modulesForConfig = modules.filter((m) => m.configurationId === configurationId);
    let total = 0;
    modulesForConfig.forEach((m) => {
      total += m.price || 0;
    });

    config.totalPrice = total;
    config.updatedAt = this._now();
    config.moduleIds = modulesForConfig.map((m) => m.id);
    configs[configIndex] = config;
    this._saveToStorage('custom_shelving_configurations', configs);

    return total;
  }

  // ====================== PUBLIC INTERFACES ======================

  // ---------- Categories & Navigation ----------

  // getCategories(): Get all top-level product categories
  getCategories() {
    const categories = this._getFromStorage('categories', []);
    // Sort by position then name for stable navigation
    return categories
      .slice()
      .sort((a, b) => {
        const pa = a.position != null ? a.position : 0;
        const pb = b.position != null ? b.position : 0;
        if (pa !== pb) return pa - pb;
        const na = a.name || "";
        const nb = b.name || "";
        return na.localeCompare(nb);
      });
  }

  // getSubcategoriesForCategory(categoryId): Get subcategories within a given category
  getSubcategoriesForCategory(categoryId) {
    const categories = this._getFromStorage('categories', []);
    const subcategories = this._getFromStorage('subcategories', []);

    const category = categories.find((c) => c.id === categoryId) || null;
    return subcategories
      .filter((s) => s.categoryId === categoryId)
      .sort((a, b) => {
        const pa = a.position != null ? a.position : 0;
        const pb = b.position != null ? b.position : 0;
        if (pa !== pb) return pa - pb;
        return (a.name || "").localeCompare(b.name || "");
      })
      .map((s) => ({
        id: s.id,
        categoryId: s.categoryId,
        key: s.key,
        name: s.name,
        description: s.description,
        position: s.position,
        // Foreign key resolution
        category: category
      }));
  }

  // getHomeFeaturedContent(): Fetch featured content for homepage
  getHomeFeaturedContent() {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const styles = this._getFromStorage('styles', []);
    const designServices = this._getFromStorage('design_services', []);
    const designPackages = this._getFromStorage('design_packages', []);
    const articles = this._getFromStorage('articles', []);
    const subcategories = this._getFromStorage('subcategories', []);

    // Featured categories: first few by position
    const featuredCategories = categories
      .slice()
      .sort((a, b) => {
        const pa = a.position != null ? a.position : 0;
        const pb = b.position != null ? b.position : 0;
        if (pa !== pb) return pa - pb;
        return (a.name || "").localeCompare(b.name || "");
      })
      .slice(0, 6)
      .map((c) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        description: c.description,
        imageUrl: c.imageUrl,
        position: c.position
      }));

    // Helper maps
    const categoryById = {};
    categories.forEach((c) => {
      categoryById[c.id] = c;
    });
    const subcategoryById = {};
    subcategories.forEach((s) => {
      subcategoryById[s.id] = s;
    });
    const styleByKey = {};
    styles.forEach((s) => {
      styleByKey[s.key] = s;
    });

    // Featured products: active products with best rating
    const activeProducts = products.filter((p) => p.status === 'active');
    const featuredProducts = activeProducts
      .slice()
      .sort((a, b) => {
        const ra = a.ratingAverage != null ? a.ratingAverage : 0;
        const rb = b.ratingAverage != null ? b.ratingAverage : 0;
        if (rb !== ra) return rb - ra;
        return (a.name || "").localeCompare(b.name || "");
      })
      .slice(0, 8)
      .map((p) => {
        const cat = categoryById[p.categoryId] || null;
        const sub = subcategoryById[p.subcategoryId] || null;
        const style = p.styleKey ? styleByKey[p.styleKey] || null : null;
        return {
          id: p.id,
          name: p.name,
          price: p.price,
          currency: p.currency,
          imageUrl: Array.isArray(p.imageUrls) && p.imageUrls.length > 0 ? p.imageUrls[0] : null,
          categoryName: cat ? cat.name : "",
          subcategoryName: sub ? sub.name : "",
          styleName: style ? style.name : "",
          ratingAverage: p.ratingAverage,
          isOnSale: !!p.isOnSale
        };
      });

    // Featured design services: active ones
    const featuredDesignServices = designServices
      .filter((s) => s.isActive)
      .slice(0, 6)
      .map((s) => ({
        id: s.id,
        key: s.key,
        name: s.name,
        shortDescription: s.shortDescription,
        imageUrl: s.imageUrl
      }));

    // Featured design packages: active ones
    const featuredDesignPackages = designPackages
      .filter((p) => p.isActive)
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        roomType: p.roomType,
        shortDescription: p.shortDescription,
        imageUrl: p.imageUrl
      }));

    // Featured articles: latest published
    const publishedArticles = articles.filter((a) => a.status === 'published');
    const featuredArticles = publishedArticles
      .slice()
      .sort((a, b) => {
        const da = a.publishedAt || "";
        const db = b.publishedAt || "";
        return db.localeCompare(da);
      })
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        title: a.title,
        excerpt: a.excerpt,
        heroImageUrl: a.heroImageUrl,
        tags: Array.isArray(a.tags) ? a.tags : []
      }));

    return {
      featuredCategories,
      featuredProducts,
      featuredDesignServices,
      featuredDesignPackages,
      featuredArticles
    };
  }

  // ---------- Product filters & listing ----------

  // getProductFilterOptions(categoryId, subcategoryId)
  getProductFilterOptions(categoryId, subcategoryId) {
    const products = this._getFromStorage('products', []);
    const relevant = products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (subcategoryId && p.subcategoryId !== subcategoryId) return false;
      if (p.status && p.status === 'archived') return false;
      return true;
    });

    const seatingMap = {};
    const styleMap = {};
    const colorMap = {};
    const fabricMap = {};
    const materialMap = {};
    const featureMap = {};
    let minPrice = null;
    let maxPrice = null;

    relevant.forEach((p) => {
      if (p.seatingCapacity != null) {
        const key = String(p.seatingCapacity);
        seatingMap[key] = (seatingMap[key] || 0) + 1;
      }
      if (p.styleKey) {
        styleMap[p.styleKey] = (styleMap[p.styleKey] || 0) + 1;
      }
      if (p.colorName) {
        colorMap[p.colorName] = (colorMap[p.colorName] || 0) + 1;
      }
      if (p.fabricMaterial) {
        fabricMap[p.fabricMaterial] = (fabricMap[p.fabricMaterial] || 0) + 1;
      }
      if (p.primaryMaterial) {
        materialMap[p.primaryMaterial] = (materialMap[p.primaryMaterial] || 0) + 1;
      }
      if (Array.isArray(p.featureList)) {
        p.featureList.forEach((f) => {
          featureMap[f] = (featureMap[f] || 0) + 1;
        });
      }
      if (p.isExtendable) {
        featureMap['extendable'] = (featureMap['extendable'] || 0) + 1;
      }
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    });

    // Seating capacity options
    const seatingCapacityOptions = Object.keys(seatingMap)
      .map((key) => ({
        value: parseInt(key, 10),
        label: key + '-seater',
        count: seatingMap[key]
      }))
      .sort((a, b) => a.value - b.value);

    // Style options need style names
    const styles = this._getFromStorage('styles', []);
    const styleOptions = Object.keys(styleMap).map((styleKey) => {
      const style = styles.find((s) => s.key === styleKey) || null;
      return {
        styleKey,
        styleName: style ? style.name : styleKey,
        count: styleMap[styleKey]
      };
    });

    const colorOptions = Object.keys(colorMap).map((colorName) => ({
      colorName,
      count: colorMap[colorName]
    }));

    const fabricOptions = Object.keys(fabricMap).map((fabricMaterial) => ({
      fabricMaterial,
      count: fabricMap[fabricMaterial]
    }));

    const materialOptions = Object.keys(materialMap).map((primaryMaterial) => ({
      primaryMaterial,
      label: primaryMaterial.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count: materialMap[primaryMaterial]
    }));

    const tableFeatureOptions = Object.keys(featureMap).map((featureKey) => ({
      featureKey,
      label: featureKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count: featureMap[featureKey]
    }));

    const priceRange = {
      minPrice: minPrice != null ? minPrice : 0,
      maxPrice: maxPrice != null ? maxPrice : 0,
      currency: 'usd'
    };

    // Static rating filter options
    const ratingOptions = [
      { minRating: 4, label: '4 stars & up' },
      { minRating: 3, label: '3 stars & up' },
      { minRating: 2, label: '2 stars & up' }
    ];

    const supportsFreeShippingFilter = relevant.length > 0;

    return {
      seatingCapacityOptions,
      styleOptions,
      colorOptions,
      fabricOptions,
      materialOptions,
      tableFeatureOptions,
      priceRange,
      ratingOptions,
      supportsFreeShippingFilter
    };
  }

  // listProducts(categoryId, subcategoryId, styleKey, filters, sortOption, pageNumber, pageSize)
  listProducts(categoryId, subcategoryId, styleKey, filters, sortOption, pageNumber, pageSize) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const subcategories = this._getFromStorage('subcategories', []);
    const styles = this._getFromStorage('styles', []);

    const categoryById = {};
    categories.forEach((c) => { categoryById[c.id] = c; });
    const subcategoryById = {};
    subcategories.forEach((s) => { subcategoryById[s.id] = s; });
    const styleByKey = {};
    styles.forEach((s) => { styleByKey[s.key] = s; });

    const f = filters || {};

    let filtered = products.filter((p) => {
      if (p.status && p.status === 'archived') return false;
      if (categoryId && p.categoryId !== categoryId) return false;
      if (subcategoryId && p.subcategoryId !== subcategoryId) return false;
      if (styleKey && p.styleKey !== styleKey) return false;
      if (f.seatingCapacity != null && p.seatingCapacity !== f.seatingCapacity) return false;
      if (f.minSeatingCapacity != null && (!p.seatingCapacity || p.seatingCapacity < f.minSeatingCapacity)) return false;
      if (f.colorName && p.colorName !== f.colorName) return false;
      if (f.fabricMaterial && p.fabricMaterial !== f.fabricMaterial) return false;
      if (f.primaryMaterial && p.primaryMaterial !== f.primaryMaterial) return false;
      if (typeof f.isExtendable === 'boolean') {
        if (!!p.isExtendable !== f.isExtendable) return false;
      }
      if (typeof f.freeShipping === 'boolean') {
        if (!!p.freeShipping !== f.freeShipping) return false;
      }
      if (f.minPrice != null && (p.price == null || p.price < f.minPrice)) return false;
      if (f.maxPrice != null && (p.price == null || p.price > f.maxPrice)) return false;
      if (f.minRating != null && (p.ratingAverage == null || p.ratingAverage < f.minRating)) return false;
      if (f.searchQuery) {
        const q = String(f.searchQuery).toLowerCase();
        const haystack = ((p.name || "") + ' ' + (p.description || "")).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (Array.isArray(f.features) && f.features.length > 0) {
        const productFeatures = new Set(Array.isArray(p.featureList) ? p.featureList.slice() : []);
        if (p.isExtendable) productFeatures.add('extendable');
        let hasAll = true;
        f.features.forEach((ft) => {
          if (!productFeatures.has(ft)) hasAll = false;
        });
        if (!hasAll) return false;
      }
      return true;
    });

    // Sorting
    const sortKey = sortOption || 'relevance';
    filtered = filtered.slice();
    if (sortKey === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortKey === 'price_high_to_low') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortKey === 'customer_rating_high_to_low') {
      filtered.sort((a, b) => {
        const ra = a.ratingAverage != null ? a.ratingAverage : 0;
        const rb = b.ratingAverage != null ? b.ratingAverage : 0;
        if (rb !== ra) return rb - ra;
        return (b.ratingCount || 0) - (a.ratingCount || 0);
      });
    } else {
      // relevance: sort by rating, then name
      filtered.sort((a, b) => {
        const ra = a.ratingAverage != null ? a.ratingAverage : 0;
        const rb = b.ratingAverage != null ? b.ratingAverage : 0;
        if (rb !== ra) return rb - ra;
        return (a.name || "").localeCompare(b.name || "");
      });
    }

    const totalResults = filtered.length;
    const page = pageNumber != null ? pageNumber : 1;
    const size = pageSize != null ? pageSize : 20;
    const totalPages = size > 0 ? Math.ceil(totalResults / size) : 1;
    const start = (page - 1) * size;
    const end = start + size;
    const pageItems = size > 0 ? filtered.slice(start, end) : filtered.slice();

    const productsOut = pageItems.map((p) => {
      const cat = categoryById[p.categoryId] || null;
      const sub = subcategoryById[p.subcategoryId] || null;
      const style = p.styleKey ? styleByKey[p.styleKey] || null : null;
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency,
        listPrice: p.listPrice,
        isOnSale: !!p.isOnSale,
        imageUrl: Array.isArray(p.imageUrls) && p.imageUrls.length > 0 ? p.imageUrls[0] : null,
        ratingAverage: p.ratingAverage,
        ratingCount: p.ratingCount,
        freeShipping: !!p.freeShipping,
        shippingCost: p.shippingCost || 0,
        categoryName: cat ? cat.name : "",
        subcategoryName: sub ? sub.name : "",
        styleName: style ? style.name : "",
        seatingCapacity: p.seatingCapacity,
        colorName: p.colorName,
        fabricMaterial: p.fabricMaterial,
        primaryMaterial: p.primaryMaterial,
        isExtendable: !!p.isExtendable,
        extendedLengthCm: p.extendedLengthCm,
        keyFeatures: Array.isArray(p.featureList) ? p.featureList.slice() : []
      };
    });

    return {
      products: productsOut,
      totalResults,
      pageNumber: page,
      pageSize: size,
      totalPages
    };
  }

  // getProductDetail(productId)
  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const subcategories = this._getFromStorage('subcategories', []);
    const styles = this._getFromStorage('styles', []);

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return null;
    }

    const category = categories.find((c) => c.id === product.categoryId) || null;
    const subcategory = subcategories.find((s) => s.id === product.subcategoryId) || null;
    const style = product.styleKey ? styles.find((s) => s.key === product.styleKey) || null : null;

    const productOut = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      currency: product.currency,
      listPrice: product.listPrice,
      isOnSale: !!product.isOnSale,
      categoryName: category ? category.name : "",
      subcategoryName: subcategory ? subcategory.name : "",
      styleName: style ? style.name : "",
      styleKey: product.styleKey,
      seatingCapacity: product.seatingCapacity,
      colorName: product.colorName,
      fabricMaterial: product.fabricMaterial,
      primaryMaterial: product.primaryMaterial,
      finish: product.finish,
      isExtendable: !!product.isExtendable,
      extendedLengthCm: product.extendedLengthCm,
      lengthCm: product.lengthCm,
      widthCm: product.widthCm,
      heightCm: product.heightCm,
      freeShipping: !!product.freeShipping,
      shippingCost: product.shippingCost || 0,
      ratingAverage: product.ratingAverage,
      ratingCount: product.ratingCount,
      imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls.slice() : [],
      featureList: Array.isArray(product.featureList) ? product.featureList.slice() : [],
      // Keep foreign keys and resolve them
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      // Resolved foreign key objects
      category: category,
      subcategory: subcategory,
      style: style
    };

    const shippingInfo = {
      freeShipping: !!product.freeShipping,
      shippingCost: product.shippingCost || 0,
      shippingLabel: product.freeShipping ? 'Free Shipping' : (product.shippingCost != null ? ('$' + product.shippingCost.toFixed(2)) : '')
    };

    const specifications = {
      dimensionsCm: {
        lengthCm: product.lengthCm,
        widthCm: product.widthCm,
        heightCm: product.heightCm
      },
      extendedLengthCm: product.extendedLengthCm,
      materials: []
    };

    if (product.primaryMaterial) {
      specifications.materials.push(product.primaryMaterial.replace(/_/g, ' '));
    }
    if (product.fabricMaterial) {
      specifications.materials.push(product.fabricMaterial);
    }
    if (product.finish) {
      specifications.materials.push(product.finish);
    }

    // Related products: same category & style
    const relatedProducts = products
      .filter((p) => p.id !== product.id && p.categoryId === product.categoryId && (!product.styleKey || p.styleKey === product.styleKey))
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency,
        imageUrl: Array.isArray(p.imageUrls) && p.imageUrls.length > 0 ? p.imageUrls[0] : null,
        styleName: style && p.styleKey === product.styleKey ? style.name : ""
      }));

    return {
      product: productOut,
      shippingInfo,
      specifications,
      relatedProducts
    };
  }

  // ---------- Cart operations ----------

  // addToCart(productId, quantity = 1)
  addToCart(productId, quantity) {
    const qty = quantity != null ? quantity : 1;
    if (qty <= 0) {
      return { success: false, message: 'Quantity must be at least 1', cartItemId: null, cart: null };
    }

    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { success: false, message: 'Product not found', cartItemId: null, cart: null };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    let cartItem = cartItems.find((ci) => ci.cartId === cart.id && ci.productId === productId) || null;
    const now = this._now();
    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.lineSubtotal = cartItem.unitPrice * cartItem.quantity;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId: productId,
        quantity: qty,
        unitPrice: product.price,
        lineSubtotal: product.price * qty,
        addedAt: now
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.itemIds)) cart.itemIds = [];
      cart.itemIds.push(cartItem.id);
    }

    // Recalculate totals and persist
    this._calculateCartTotals(cart, cartItems, products);

    const categories = this._getFromStorage('categories', []);
    const styles = this._getFromStorage('styles', []);
    const summary = this._buildCartSummary(cart, cartItems, products, categories, styles);

    return {
      success: true,
      message: 'Added to cart',
      cartItemId: cartItem.id,
      cart: {
        itemCount: summary.itemCount,
        subtotal: summary.subtotal,
        shippingTotal: summary.shippingTotal,
        total: summary.total,
        currency: summary.currency
      }
    };
  }

  // getCart(): current cart contents and totals
  getCart() {
    const carts = this._getFromStorage('carts', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const styles = this._getFromStorage('styles', []);
    const cartItems = this._getFromStorage('cart_items', []);

    if (!carts[0]) {
      return {
        items: [],
        subtotal: 0,
        shippingTotal: 0,
        total: 0,
        currency: 'usd',
        itemCount: 0
      };
    }

    const cart = carts[0];
    this._calculateCartTotals(cart, cartItems, products);
    const summary = this._buildCartSummary(cart, cartItems, products, categories, styles);

    // Instrumentation for task completion tracking (task2_initialCartProductIds)
    try {
      const existing = localStorage.getItem('task2_initialCartProductIds');
      if (!existing && cart && cart.id) {
        const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
        const distinctProductIds = Array.from(
          new Set(itemsForCart.map((ci) => ci.productId).filter((pid) => !!pid))
        );
        if (distinctProductIds.length === 3) {
          localStorage.setItem('task2_initialCartProductIds', JSON.stringify(distinctProductIds));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return summary;
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const carts = this._getFromStorage('carts', []);

    const ciIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (ciIndex === -1) {
      return { success: false, cart: null };
    }

    const cartItem = cartItems[ciIndex];
    const cart = carts.find((c) => c.id === cartItem.cartId) || this._getOrCreateCart();

    if (quantity <= 0) {
      // Remove item
      cartItems.splice(ciIndex, 1);
      if (Array.isArray(cart.itemIds)) {
        cart.itemIds = cart.itemIds.filter((id) => id !== cartItemId);
      }
    } else {
      cartItem.quantity = quantity;
      cartItem.lineSubtotal = cartItem.unitPrice * quantity;
      cartItems[ciIndex] = cartItem;
    }

    // Recalculate and persist
    this._calculateCartTotals(cart, cartItems, products);

    const categories = this._getFromStorage('categories', []);
    const styles = this._getFromStorage('styles', []);
    const summary = this._buildCartSummary(cart, cartItems, products, categories, styles);

    return {
      success: true,
      cart: {
        items: summary.items.map((it) => ({
          cartItemId: it.cartItemId,
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineSubtotal: it.lineSubtotal,
          // Foreign key resolution
          product: it.product
        })),
        subtotal: summary.subtotal,
        shippingTotal: summary.shippingTotal,
        total: summary.total,
        currency: summary.currency
      }
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const carts = this._getFromStorage('carts', []);

    const ciIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (ciIndex === -1) {
      return { success: false, cart: null };
    }

    const cartItem = cartItems[ciIndex];
    const cart = carts.find((c) => c.id === cartItem.cartId) || this._getOrCreateCart();

    // Instrumentation for task completion tracking (task2_removedProductId)
    try {
      const stored = localStorage.getItem('task2_initialCartProductIds');
      if (stored) {
        const initialIds = JSON.parse(stored);
        if (Array.isArray(initialIds) && initialIds.includes(cartItem.productId)) {
          localStorage.setItem('task2_removedProductId', cartItem.productId);
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    cartItems.splice(ciIndex, 1);
    if (Array.isArray(cart.itemIds)) {
      cart.itemIds = cart.itemIds.filter((id) => id !== cartItemId);
    }

    this._calculateCartTotals(cart, cartItems, products);

    const categories = this._getFromStorage('categories', []);
    const styles = this._getFromStorage('styles', []);
    const summary = this._buildCartSummary(cart, cartItems, products, categories, styles);

    return {
      success: true,
      cart: {
        items: summary.items.map((it) => ({
          cartItemId: it.cartItemId,
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineSubtotal: it.lineSubtotal,
          // Foreign key resolution
          product: it.product
        })),
        subtotal: summary.subtotal,
        shippingTotal: summary.shippingTotal,
        total: summary.total,
        currency: summary.currency
      }
    };
  }

  // ---------- Design services & appointments ----------

  // getDesignServicesOverview()
  getDesignServicesOverview() {
    const services = this._getFromStorage('design_services', []);
    return services
      .filter((s) => s.isActive)
      .map((s) => ({
        id: s.id,
        key: s.key,
        name: s.name,
        shortDescription: s.shortDescription,
        imageUrl: s.imageUrl,
        durationMinutes: s.durationMinutes,
        basePriceEstimate: s.basePriceEstimate,
        availableAppointmentTypes: Array.isArray(s.availableAppointmentTypes) ? s.availableAppointmentTypes.slice() : []
      }));
  }

  // getDesignServiceDetail(serviceId)
  getDesignServiceDetail(serviceId) {
    const services = this._getFromStorage('design_services', []);
    const s = services.find((svc) => svc.id === serviceId) || null;
    if (!s) return null;
    return {
      id: s.id,
      key: s.key,
      name: s.name,
      shortDescription: s.shortDescription,
      longDescription: s.longDescription,
      imageUrl: s.imageUrl,
      durationMinutes: s.durationMinutes,
      basePriceEstimate: s.basePriceEstimate,
      availableAppointmentTypes: Array.isArray(s.availableAppointmentTypes) ? s.availableAppointmentTypes.slice() : []
    };
  }

  // getAppointmentSlotsForDate(serviceId, appointmentType, date)
  getAppointmentSlotsForDate(serviceId, appointmentType, date) {
    const slots = this._getFromStorage('appointment_slots', []);
    const services = this._getFromStorage('design_services', []);
    const service = services.find((s) => s.id === serviceId) || null;

    const result = slots
      .filter((slot) => {
        if (slot.serviceId !== serviceId) return false;
        if (slot.appointmentType !== appointmentType) return false;
        if (!slot.isAvailable) return false;
        const start = slot.startDateTime || "";
        const d = start.split('T')[0];
        return d === date;
      })
      .map((slot) => {
        const startStr = slot.startDateTime;
        let timeLabel = '';
        if (startStr) {
          const dt = new Date(startStr);
          if (!isNaN(dt.getTime())) {
            let hours = dt.getHours();
            const minutes = dt.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            if (hours === 0) hours = 12;
            const mm = minutes < 10 ? '0' + minutes : String(minutes);
            timeLabel = hours + ':' + mm + ' ' + ampm;
          }
        }
        return {
          slotId: slot.id,
          serviceId: slot.serviceId,
          appointmentType: slot.appointmentType,
          startDateTime: slot.startDateTime,
          endDateTime: slot.endDateTime,
          isAvailable: slot.isAvailable,
          timeLabel,
          // Foreign key resolution
          service: service
        };
      });

    return result;
  }

  // bookServiceAppointment(appointmentSlotId, appointmentType, customerName, customerEmail, customerPhone, notes)
  bookServiceAppointment(appointmentSlotId, appointmentType, customerName, customerEmail, customerPhone, notes) {
    const slots = this._getFromStorage('appointment_slots', []);
    const services = this._getFromStorage('design_services', []);
    const appointments = this._getFromStorage('service_appointments', []);

    const slotIndex = slots.findIndex((s) => s.id === appointmentSlotId);
    if (slotIndex === -1) {
      return {
        appointmentId: null,
        status: 'error',
        serviceName: '',
        appointmentType,
        startDateTime: '',
        confirmationMessage: 'Appointment slot not found'
      };
    }

    const slot = slots[slotIndex];
    if (!slot.isAvailable) {
      return {
        appointmentId: null,
        status: 'error',
        serviceName: '',
        appointmentType,
        startDateTime: slot.startDateTime,
        confirmationMessage: 'Appointment slot is no longer available'
      };
    }

    const service = services.find((s) => s.id === slot.serviceId) || null;

    const appointmentId = this._generateId('svc_appt');
    const status = 'requested';
    const createdAt = this._now();

    const appointment = {
      id: appointmentId,
      serviceId: slot.serviceId,
      serviceNameSnapshot: service ? service.name : '',
      appointmentType: appointmentType,
      startDateTime: slot.startDateTime,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      notes: notes || '',
      status,
      createdAt
    };

    appointments.push(appointment);
    this._saveToStorage('service_appointments', appointments);

    // Mark slot as unavailable
    slot.isAvailable = false;
    slots[slotIndex] = slot;
    this._saveToStorage('appointment_slots', slots);

    return {
      appointmentId,
      status,
      serviceName: service ? service.name : '',
      appointmentType,
      startDateTime: slot.startDateTime,
      confirmationMessage: 'Your appointment has been requested.'
    };
  }

  // ---------- Design packages & quote requests ----------

  // getDesignPackagesOverview(roomType)
  getDesignPackagesOverview(roomType) {
    const packages = this._getFromStorage('design_packages', []);
    return packages
      .filter((p) => p.isActive && (!roomType || p.roomType === roomType))
      .map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        roomType: p.roomType,
        shortDescription: p.shortDescription,
        imageUrl: p.imageUrl,
        basePriceEstimate: p.basePriceEstimate,
        isActive: p.isActive
      }));
  }

  // getDesignPackageDetail(packageId)
  getDesignPackageDetail(packageId) {
    const packages = this._getFromStorage('design_packages', []);
    const roomSizes = this._getFromStorage('package_room_size_options', []);
    const colorPalettes = this._getFromStorage('package_color_palette_options', []);
    const tiers = this._getFromStorage('package_tier_options', []);

    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) return null;

    const roomSizeOptions = roomSizes
      .filter((r) => r.packageId === packageId)
      .sort((a, b) => {
        const pa = a.position != null ? a.position : 0;
        const pb = b.position != null ? b.position : 0;
        return pa - pb;
      })
      .map((r) => ({
        id: r.id,
        label: r.label,
        minAreaM2: r.minAreaM2,
        maxAreaM2: r.maxAreaM2,
        position: r.position
      }));

    const colorPaletteOptions = colorPalettes
      .filter((c) => c.packageId === packageId)
      .sort((a, b) => {
        const pa = a.position != null ? a.position : 0;
        const pb = b.position != null ? b.position : 0;
        return pa - pb;
      })
      .map((c) => ({
        id: c.id,
        label: c.label,
        key: c.key,
        description: c.description,
        position: c.position
      }));

    const tierOptions = tiers
      .filter((t) => t.packageId === packageId)
      .sort((a, b) => {
        const pa = a.position != null ? a.position : 0;
        const pb = b.position != null ? b.position : 0;
        return pa - pb;
      })
      .map((t) => ({
        id: t.id,
        label: t.label,
        key: t.key,
        description: t.description,
        indicativePriceAdjustment: t.indicativePriceAdjustment,
        position: t.position
      }));

    return {
      package: {
        id: pkg.id,
        key: pkg.key,
        name: pkg.name,
        roomType: pkg.roomType,
        shortDescription: pkg.shortDescription,
        longDescription: pkg.longDescription,
        imageUrl: pkg.imageUrl,
        basePriceEstimate: pkg.basePriceEstimate
      },
      roomSizeOptions,
      colorPaletteOptions,
      tierOptions
    };
  }

  // submitPackageQuoteRequest(packageId, roomSizeOptionId, colorPaletteOptionId, tierOptionId, customerName, customerEmail, message, preferredContactMethod)
  submitPackageQuoteRequest(packageId, roomSizeOptionId, colorPaletteOptionId, tierOptionId, customerName, customerEmail, message, preferredContactMethod) {
    const requests = this._getFromStorage('package_quote_requests', []);

    const quoteRequestId = this._generateId('pkg_quote');
    const createdAt = this._now();

    const record = {
      id: quoteRequestId,
      packageId,
      roomSizeOptionId: roomSizeOptionId || null,
      colorPaletteOptionId: colorPaletteOptionId || null,
      tierOptionId: tierOptionId || null,
      customerName,
      customerEmail,
      message: message || '',
      preferredContactMethod,
      status: 'submitted',
      createdAt
    };

    requests.push(record);
    this._saveToStorage('package_quote_requests', requests);

    return {
      quoteRequestId,
      status: 'submitted',
      confirmationMessage: 'Your quote request has been submitted.'
    };
  }

  // ---------- Journal / Blog & Favorites ----------

  // getJournalArticles(query, filters, pageNumber, pageSize)
  getJournalArticles(query, filters, pageNumber, pageSize) {
    const articles = this._getFromStorage('articles', []);
    const q = query ? String(query).trim().toLowerCase() : '';
    const f = filters || {};

    let result = articles.slice();

    if (f.onlyPublished !== false) {
      result = result.filter((a) => a.status === 'published');
    }

    if (q) {
      result = result.filter((a) => {
        const text = ((a.title || "") + ' ' + (a.excerpt || "") + ' ' + (a.content || "")).toLowerCase();
        return text.includes(q);
      });
    }

    if (Array.isArray(f.tags) && f.tags.length > 0) {
      const tagSet = new Set(f.tags.map((t) => String(t).toLowerCase()));
      result = result.filter((a) => {
        const tags = Array.isArray(a.tags) ? a.tags : [];
        return tags.some((t) => tagSet.has(String(t).toLowerCase()));
      });
    }

    if (Array.isArray(f.topics) && f.topics.length > 0) {
      const topicSet = new Set(f.topics.map((t) => String(t).toLowerCase()));
      result = result.filter((a) => {
        const topics = Array.isArray(a.topics) ? a.topics : [];
        return topics.some((t) => topicSet.has(String(t).toLowerCase()));
      });
    }

    // Sort by publishedAt desc
    result.sort((a, b) => {
      const da = a.publishedAt || "";
      const db = b.publishedAt || "";
      return db.localeCompare(da);
    });

    const totalResults = result.length;
    const page = pageNumber != null ? pageNumber : 1;
    const size = pageSize != null ? pageSize : 12;
    const totalPages = size > 0 ? Math.ceil(totalResults / size) : 1;
    const start = (page - 1) * size;
    const end = start + size;
    const pageItems = size > 0 ? result.slice(start, end) : result.slice();

    const outArticles = pageItems.map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt,
      heroImageUrl: a.heroImageUrl,
      tags: Array.isArray(a.tags) ? a.tags.slice() : [],
      topics: Array.isArray(a.topics) ? a.topics.slice() : [],
      publishedAt: a.publishedAt,
      estimatedReadMinutes: a.estimatedReadMinutes
    }));

    return {
      articles: outArticles,
      totalResults,
      pageNumber: page,
      pageSize: size,
      totalPages
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const favorites = this._getFromStorage('favorite_articles', []);

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) return null;

    const isFavorited = favorites.some((f) => f.articleId === articleId);

    // Related articles: share at least one tag or topic
    const tagSet = new Set(Array.isArray(article.tags) ? article.tags.map((t) => String(t).toLowerCase()) : []);
    const topicSet = new Set(Array.isArray(article.topics) ? article.topics.map((t) => String(t).toLowerCase()) : []);

    const related = articles
      .filter((a) => a.id !== article.id && a.status === 'published')
      .filter((a) => {
        const tags = Array.isArray(a.tags) ? a.tags.map((t) => String(t).toLowerCase()) : [];
        const topics = Array.isArray(a.topics) ? a.topics.map((t) => String(t).toLowerCase()) : [];
        const hasTag = tags.some((t) => tagSet.has(t));
        const hasTopic = topics.some((t) => topicSet.has(t));
        return hasTag || hasTopic;
      })
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        title: a.title,
        heroImageUrl: a.heroImageUrl
      }));

    return {
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt,
        authorName: article.authorName,
        heroImageUrl: article.heroImageUrl,
        tags: Array.isArray(article.tags) ? article.tags.slice() : [],
        topics: Array.isArray(article.topics) ? article.topics.slice() : [],
        publishedAt: article.publishedAt,
        estimatedReadMinutes: article.estimatedReadMinutes
      },
      isFavorited,
      relatedArticles: related
    };
  }

  // saveArticleToFavorites(articleId)
  saveArticleToFavorites(articleId) {
    const favorites = this._getFromStorage('favorite_articles', []);
    const existing = favorites.find((f) => f.articleId === articleId) || null;
    if (existing) {
      return {
        success: true,
        favoriteArticleId: existing.id,
        savedAt: existing.savedAt,
        message: 'Already in favorites'
      };
    }

    const id = this._generateId('fav_article');
    const savedAt = this._now();
    const record = {
      id,
      articleId,
      savedAt
    };
    favorites.push(record);
    this._saveToStorage('favorite_articles', favorites);

    return {
      success: true,
      favoriteArticleId: id,
      savedAt,
      message: 'Saved to favorites'
    };
  }

  // getFavoriteArticles()
  getFavoriteArticles() {
    const favorites = this._getFromStorage('favorite_articles', []);
    const articles = this._getFromStorage('articles', []);

    return favorites.map((f) => {
      const article = articles.find((a) => a.id === f.articleId) || null;
      return {
        favoriteArticleId: f.id,
        articleId: f.articleId,
        title: article ? article.title : "",
        excerpt: article ? article.excerpt : "",
        heroImageUrl: article ? article.heroImageUrl : null,
        tags: article && Array.isArray(article.tags) ? article.tags.slice() : [],
        savedAt: f.savedAt,
        // Foreign key resolution
        article: article
      };
    });
  }

  // removeFavoriteArticle(favoriteArticleId)
  removeFavoriteArticle(favoriteArticleId) {
    const favorites = this._getFromStorage('favorite_articles', []);
    const index = favorites.findIndex((f) => f.id === favoriteArticleId);
    if (index === -1) {
      return { success: false, remainingFavoritesCount: favorites.length };
    }
    favorites.splice(index, 1);
    this._saveToStorage('favorite_articles', favorites);
    return { success: true, remainingFavoritesCount: favorites.length };
  }

  // ---------- Style Quiz ----------

  // getStyleQuizQuestions()
  getStyleQuizQuestions() {
    const questions = this._getFromStorage('style_quiz_questions', []);
    const answerOptions = this._getFromStorage('style_quiz_answer_options', []);

    const byQuestion = {};
    answerOptions.forEach((opt) => {
      if (!byQuestion[opt.questionId]) byQuestion[opt.questionId] = [];
      byQuestion[opt.questionId].push(opt);
    });

    Object.keys(byQuestion).forEach((qid) => {
      byQuestion[qid].sort((a, b) => {
        const pa = a.position != null ? a.position : 0;
        const pb = b.position != null ? b.position : 0;
        return pa - pb;
      });
    });

    return questions
      .filter((q) => q.isActive)
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        questionId: q.id,
        order: q.order,
        text: q.text,
        answerOptions: (byQuestion[q.id] || []).map((opt) => ({
          answerOptionId: opt.id,
          text: opt.text,
          imageUrl: opt.imageUrl
        }))
      }));
  }

  // submitStyleQuizAnswers(answerOptionIds)
  submitStyleQuizAnswers(answerOptionIds) {
    const answerIds = Array.isArray(answerOptionIds) ? answerOptionIds : [];
    const styles = this._getFromStorage('styles', []);

    const recommendedStyleKey = this._determineRecommendedStyleFromAnswers(answerIds);
    const style = styles.find((s) => s.key === recommendedStyleKey) || null;

    const resultId = this._generateId('style_quiz_result');
    const completedAt = this._now();

    const results = this._getFromStorage('style_quiz_results', []);
    const record = {
      id: resultId,
      recommendedStyleKey,
      selectedAnswerOptionIds: answerIds,
      completedAt
    };
    results.push(record);
    this._saveToStorage('style_quiz_results', results);

    return {
      styleQuizResultId: resultId,
      recommendedStyleKey,
      recommendedStyleName: style ? style.name : recommendedStyleKey,
      description: style ? style.description : '',
      moodboardImageUrls: style && style.imageUrl ? [style.imageUrl] : [],
      completedAt
    };
  }

  // ---------- Custom Furniture / Shelving ----------

  // getCustomFurnitureOverviewContent()
  getCustomFurnitureOverviewContent() {
    // Content is not stored per spec; return a minimal structure derived from nothing.
    // This avoids mocking detailed domain data.
    return {
      introText: '',
      benefits: [],
      exampleProjects: []
    };
  }

  // getCurrentShelvingConfiguration()
  getCurrentShelvingConfiguration() {
    const config = this._getCurrentDraftShelvingConfiguration();
    const modules = this._getFromStorage('shelving_modules', []).filter((m) => m.configurationId === config.id);

    const totalPrice = this._calculateShelvingTotalPrice(config.id);

    const moduleOut = modules.map((m) => ({
      moduleId: m.id,
      moduleType: m.moduleType,
      positionIndex: m.positionIndex,
      widthCm: m.widthCm,
      heightCm: m.heightCm,
      price: m.price
    }));

    return {
      configurationId: config.id,
      name: config.name,
      widthCm: config.widthCm,
      heightCm: config.heightCm,
      finishKey: config.finishKey,
      finishLabel: this._getFinishLabel(config.finishKey),
      modules: moduleOut,
      totalPrice: totalPrice,
      currency: 'usd',
      lastUpdatedAt: config.updatedAt
    };
  }

  // setShelvingDimensions(widthCm, heightCm)
  setShelvingDimensions(widthCm, heightCm) {
    const configs = this._getFromStorage('custom_shelving_configurations', []);
    const draft = this._getCurrentDraftShelvingConfiguration();
    const index = configs.findIndex((c) => c.id === draft.id);
    const config = index !== -1 ? configs[index] : draft;

    config.widthCm = widthCm;
    config.heightCm = heightCm;
    config.updatedAt = this._now();

    if (index === -1) {
      configs.push(config);
    } else {
      configs[index] = config;
    }
    this._saveToStorage('custom_shelving_configurations', configs);

    const totalPrice = this._calculateShelvingTotalPrice(config.id);

    return {
      configurationId: config.id,
      widthCm: config.widthCm,
      heightCm: config.heightCm,
      totalPrice
    };
  }

  // setShelvingFinish(finishKey)
  setShelvingFinish(finishKey) {
    const configs = this._getFromStorage('custom_shelving_configurations', []);
    const draft = this._getCurrentDraftShelvingConfiguration();
    const index = configs.findIndex((c) => c.id === draft.id);
    const config = index !== -1 ? configs[index] : draft;

    config.finishKey = finishKey;
    config.updatedAt = this._now();

    if (index === -1) {
      configs.push(config);
    } else {
      configs[index] = config;
    }
    this._saveToStorage('custom_shelving_configurations', configs);

    const totalPrice = this._calculateShelvingTotalPrice(config.id);

    return {
      configurationId: config.id,
      finishKey: config.finishKey,
      finishLabel: this._getFinishLabel(config.finishKey),
      totalPrice
    };
  }

  // addShelvingModule(moduleType)
  addShelvingModule(moduleType) {
    const config = this._getCurrentDraftShelvingConfiguration();
    const modules = this._getFromStorage('shelving_modules', []);

    const modulesForConfig = modules.filter((m) => m.configurationId === config.id);
    const positionIndex = modulesForConfig.length;

    const moduleId = this._generateId('shelf_mod');
    const price = this._getModuleBasePrice(moduleType);

    const module = {
      id: moduleId,
      configurationId: config.id,
      moduleType,
      positionIndex,
      widthCm: null,
      heightCm: null,
      price,
      createdAt: this._now()
    };

    modules.push(module);
    this._saveToStorage('shelving_modules', modules);

    const totalPrice = this._calculateShelvingTotalPrice(config.id);

    const updatedModulesForConfig = modules.filter((m) => m.configurationId === config.id);
    const moduleOut = updatedModulesForConfig.map((m) => ({
      moduleId: m.id,
      moduleType: m.moduleType,
      positionIndex: m.positionIndex,
      widthCm: m.widthCm,
      heightCm: m.heightCm,
      price: m.price
    }));

    return {
      configurationId: config.id,
      modules: moduleOut,
      totalPrice
    };
  }

  // removeShelvingModule(moduleId)
  removeShelvingModule(moduleId) {
    const config = this._getCurrentDraftShelvingConfiguration();
    let modules = this._getFromStorage('shelving_modules', []);

    const index = modules.findIndex((m) => m.id === moduleId && m.configurationId === config.id);
    if (index === -1) {
      const totalPriceNoChange = this._calculateShelvingTotalPrice(config.id);
      return {
        configurationId: config.id,
        modules: modules.filter((m) => m.configurationId === config.id).map((m) => ({
          moduleId: m.id,
          moduleType: m.moduleType,
          positionIndex: m.positionIndex,
          price: m.price
        })),
        totalPrice: totalPriceNoChange
      };
    }

    modules.splice(index, 1);
    // Re-index positions for this configuration
    const modulesForConfig = modules.filter((m) => m.configurationId === config.id);
    modulesForConfig.forEach((m, idx) => {
      m.positionIndex = idx;
    });

    this._saveToStorage('shelving_modules', modules);

    const totalPrice = this._calculateShelvingTotalPrice(config.id);
    const updatedModulesForConfig = modules.filter((m) => m.configurationId === config.id);

    const moduleOut = updatedModulesForConfig.map((m) => ({
      moduleId: m.id,
      moduleType: m.moduleType,
      positionIndex: m.positionIndex,
      price: m.price
    }));

    return {
      configurationId: config.id,
      modules: moduleOut,
      totalPrice
    };
  }

  // saveShelvingConfiguration(name)
  saveShelvingConfiguration(name) {
    const configs = this._getFromStorage('custom_shelving_configurations', []);
    const draft = this._getCurrentDraftShelvingConfiguration();
    const index = configs.findIndex((c) => c.id === draft.id);
    const config = index !== -1 ? configs[index] : draft;

    const now = this._now();
    config.name = name;
    config.updatedAt = now;

    if (index === -1) {
      configs.push(config);
    } else {
      configs[index] = config;
    }
    this._saveToStorage('custom_shelving_configurations', configs);

    const totalPrice = this._calculateShelvingTotalPrice(config.id);

    return {
      success: true,
      configurationId: config.id,
      name: config.name,
      totalPrice,
      currency: 'usd',
      savedAt: now,
      message: 'Design saved.'
    };
  }

  // getSavedShelvingConfigurations()
  getSavedShelvingConfigurations() {
    const configs = this._getFromStorage('custom_shelving_configurations', []);
    return configs
      .filter((c) => !!c.name)
      .map((c) => ({
        configurationId: c.id,
        name: c.name,
        widthCm: c.widthCm,
        heightCm: c.heightCm,
        finishKey: c.finishKey,
        finishLabel: this._getFinishLabel(c.finishKey),
        totalPrice: c.totalPrice || 0,
        currency: 'usd',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }));
  }

  // renameSavedShelvingConfiguration(configurationId, newName)
  renameSavedShelvingConfiguration(configurationId, newName) {
    const configs = this._getFromStorage('custom_shelving_configurations', []);
    const index = configs.findIndex((c) => c.id === configurationId);
    if (index === -1) {
      return { success: false, configurationId: null, name: null };
    }
    const config = configs[index];
    config.name = newName;
    config.updatedAt = this._now();
    configs[index] = config;
    this._saveToStorage('custom_shelving_configurations', configs);
    return {
      success: true,
      configurationId: config.id,
      name: config.name
    };
  }

  // ---------- Account & Favorites Overview ----------

  // getAccountProfile()
  getAccountProfile() {
    const profile = this._getSingleAccountProfile();
    if (!profile) {
      return {
        exists: false,
        id: null,
        firstName: null,
        lastName: null,
        email: null,
        createdAt: null
      };
    }
    return {
      exists: true,
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      createdAt: profile.createdAt
    };
  }

  // createOrUpdateAccountProfile(firstName, lastName, email, password)
  createOrUpdateAccountProfile(firstName, lastName, email, password) {
    let profile = this._getSingleAccountProfile();
    const now = this._now();

    if (!profile) {
      profile = {
        id: this._generateId('acct'),
        firstName,
        lastName,
        email,
        password,
        createdAt: now,
        updatedAt: now
      };
    } else {
      profile.firstName = firstName;
      profile.lastName = lastName;
      profile.email = email;
      profile.password = password;
      profile.updatedAt = now;
    }

    this._saveSingleAccountProfile(profile);

    return {
      id: profile.id,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };
  }

  // getAccountFavoritesOverview()
  getAccountFavoritesOverview() {
    const favorites = this._getFromStorage('favorite_articles', []);
    const articles = this._getFromStorage('articles', []);
    const configs = this._getFromStorage('custom_shelving_configurations', []);

    const favoriteArticles = favorites.map((f) => {
      const article = articles.find((a) => a.id === f.articleId) || null;
      return {
        favoriteArticleId: f.id,
        articleId: f.articleId,
        title: article ? article.title : "",
        heroImageUrl: article ? article.heroImageUrl : null,
        savedAt: f.savedAt,
        // Foreign key resolution
        article: article
      };
    });

    const savedShelvingConfigurations = configs
      .filter((c) => !!c.name)
      .map((c) => ({
        configurationId: c.id,
        name: c.name,
        finishLabel: this._getFinishLabel(c.finishKey),
        totalPrice: c.totalPrice || 0,
        currency: 'usd'
      }));

    return {
      favoriteArticles,
      savedShelvingConfigurations
    };
  }

  // ---------- About Studio ----------

  // getAboutStudioContent()
  getAboutStudioContent() {
    const content = this._getFromStorage('about_studio_content', {
      story: "",
      designPhilosophy: "",
      teamMembers: [],
      contact: { email: "", phone: "", location: "" }
    });
    return content;
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