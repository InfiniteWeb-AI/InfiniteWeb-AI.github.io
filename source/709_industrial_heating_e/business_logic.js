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
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const tables = [
      'products',
      'brands',
      'categories',
      'carts',
      'cart_items',
      'compare_lists',
      'saved_lists',
      'saved_list_items',
      'projects',
      'project_items',
      'quote_requests',
      'consultation_requests',
      'cms_pages'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        // Arrays for most, object map for cms_pages
        if (key === 'cms_pages') {
          localStorage.setItem(key, JSON.stringify({}));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data == null) {
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

  // ----------------------
  // Domain helpers
  // ----------------------

  _getAllProducts() {
    return this._getFromStorage('products', []);
  }

  _getAllBrands() {
    return this._getFromStorage('brands', []);
  }

  _getAllCategories() {
    return this._getFromStorage('categories', []);
  }

  _resolveProductForeignKeys(product) {
    if (!product) return null;
    const brands = this._getAllBrands();
    const categories = this._getAllCategories();
    const brand = brands.find(b => b.id === product.brandId) || null;
    const category = categories.find(c => c.id === product.categoryId) || null;
    return Object.assign({}, product, { brand, category });
  }

  _resolveCategoryForeignKeys(category) {
    if (!category) return null;
    const categories = this._getAllCategories();
    const parentCategory = categories.find(c => c.id === category.parentCategoryId) || null;
    return Object.assign({}, category, { parentCategory });
  }

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts', []);
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        items: [], // array of cartItem ids
        subtotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        grandTotal: 0,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _calculateCartTotals(cart) {
    const products = this._getAllProducts();
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);

    let subtotal = 0;
    let itemCount = 0;

    for (const item of itemsForCart) {
      const lineTotal = item.unitPrice * item.quantity;
      item.lineTotal = lineTotal;
      subtotal += lineTotal;
      itemCount += item.quantity;
    }

    const shippingTotal = 0;
    const taxTotal = 0;
    const grandTotal = subtotal + shippingTotal + taxTotal;

    cart.subtotal = subtotal;
    cart.shippingTotal = shippingTotal;
    cart.taxTotal = taxTotal;
    cart.grandTotal = grandTotal;
    cart.updatedAt = this._nowIso();

    this._saveToStorage('cart_items', cartItems);

    return { cart, itemCount };
  }

  _getActiveCompareList() {
    const compareLists = this._getFromStorage('compare_lists', []);
    let list = compareLists.find(l => l.isActive);
    if (!list) {
      list = {
        id: this._generateId('compare'),
        name: 'Active Compare List',
        productIds: [],
        maxItems: 4,
        isActive: true,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      compareLists.push(list);
      this._saveToStorage('compare_lists', compareLists);
    }
    return list;
  }

  _applyProductFilters(products, filters) {
    if (!filters) return products;
    let result = products.slice();

    if (Array.isArray(filters.applications) && filters.applications.length) {
      result = result.filter(p => filters.applications.includes(p.application));
    }

    if (typeof filters.powerOutputMinKw === 'number') {
      result = result.filter(p => typeof p.powerOutputKw === 'number' && p.powerOutputKw >= filters.powerOutputMinKw);
    }

    if (typeof filters.powerOutputMaxKw === 'number') {
      result = result.filter(p => typeof p.powerOutputKw === 'number' && p.powerOutputKw <= filters.powerOutputMaxKw);
    }

    if (typeof filters.capacityMinKw === 'number') {
      result = result.filter(p => typeof p.capacityKw === 'number' && p.capacityKw >= filters.capacityMinKw);
    }

    if (typeof filters.capacityMaxKw === 'number') {
      result = result.filter(p => typeof p.capacityKw === 'number' && p.capacityKw <= filters.capacityMaxKw);
    }

    if (typeof filters.temperatureMinC === 'number') {
      result = result.filter(p => typeof p.temperatureMinC === 'number' ? p.temperatureMinC <= filters.temperatureMinC : true);
    }

    if (typeof filters.temperatureMaxC === 'number') {
      result = result.filter(p => typeof p.temperatureMaxC === 'number' && p.temperatureMaxC >= filters.temperatureMaxC);
    }

    if (typeof filters.probeLengthMinMm === 'number') {
      result = result.filter(p => typeof p.probeLengthMm === 'number' && p.probeLengthMm >= filters.probeLengthMinMm);
    }

    if (typeof filters.probeLengthMaxMm === 'number') {
      result = result.filter(p => typeof p.probeLengthMm === 'number' && p.probeLengthMm <= filters.probeLengthMaxMm);
    }

    if (typeof filters.airflowMinCfm === 'number') {
      result = result.filter(p => typeof p.airflowCfm === 'number' && p.airflowCfm >= filters.airflowMinCfm);
    }

    if (typeof filters.airflowMaxCfm === 'number') {
      result = result.filter(p => typeof p.airflowCfm === 'number' && p.airflowCfm <= filters.airflowMaxCfm);
    }

    if (typeof filters.priceMin === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price >= filters.priceMin);
    }

    if (typeof filters.priceMax === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price <= filters.priceMax);
    }

    if (typeof filters.customerRatingMin === 'number') {
      result = result.filter(p => typeof p.customerRating === 'number' && p.customerRating >= filters.customerRatingMin);
    }

    if (Array.isArray(filters.ipRatings) && filters.ipRatings.length) {
      result = result.filter(p => filters.ipRatings.includes(p.ipRating));
    }

    if (Array.isArray(filters.brandIds) && filters.brandIds.length) {
      result = result.filter(p => filters.brandIds.includes(p.brandId));
    }

    if (Array.isArray(filters.productTypes) && filters.productTypes.length) {
      result = result.filter(p => filters.productTypes.includes(p.productType));
    }

    if (filters.isFreeShippingOnly) {
      result = result.filter(p => !!p.isFreeShipping);
    }

    if (Array.isArray(filters.fuelTypes) && filters.fuelTypes.length) {
      result = result.filter(p => filters.fuelTypes.includes(p.fuelType));
    }

    if (Array.isArray(filters.sensorTypes) && filters.sensorTypes.length) {
      result = result.filter(p => filters.sensorTypes.includes(p.sensorType));
    }

    if (Array.isArray(filters.controlTypes) && filters.controlTypes.length) {
      result = result.filter(p => filters.controlTypes.includes(p.controlType));
    }

    if (Array.isArray(filters.mountingTypes) && filters.mountingTypes.length) {
      result = result.filter(p => filters.mountingTypes.includes(p.mountingType));
    }

    if (Array.isArray(filters.compatibilityModelIds) && filters.compatibilityModelIds.length) {
      result = result.filter(p => {
        if (!Array.isArray(p.compatibleModels) || !p.compatibleModels.length) return false;
        return p.compatibleModels.some(m => filters.compatibilityModelIds.includes(m));
      });
    }

    if (Array.isArray(filters.applicationUseCases) && filters.applicationUseCases.length) {
      result = result.filter(p => filters.applicationUseCases.includes(p.application));
    }

    return result;
  }

  _stringContains(haystack, needle) {
    if (!haystack || !needle) return false;
    return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
  }

  _getCategoryAncestors(id, categories) {
    const ancestors = [];
    if (!id) return ancestors;
    let current = categories.find(c => c.id === id) || null;
    while (current) {
      ancestors.push(current.id);
      if (!current.parentCategoryId) break;
      current = categories.find(c => c.id === current.parentCategoryId) || null;
    }
    return ancestors;
  }

  _productMatchesCategory(product, categoryId, subcategoryId, categories) {
    if (!categoryId && !subcategoryId) return true;

    const productCatIds = [];
    if (product.categoryId) productCatIds.push(product.categoryId);
    if (product.subcategoryId) productCatIds.push(product.subcategoryId);

    // If the category exists in the category tree, use ancestor-based matching.
    // Otherwise, fall back to simple id equality on categoryId/subcategoryId fields.
    if (categoryId) {
      const categoryExists = Array.isArray(categories) && categories.some(c => c.id === categoryId);
      let matchesCategory = false;

      if (categoryExists) {
        for (const id of productCatIds) {
          const ancestors = this._getCategoryAncestors(id, categories);
          if (ancestors.includes(categoryId)) {
            matchesCategory = true;
            break;
          }
        }
      } else {
        matchesCategory = product.categoryId === categoryId || product.subcategoryId === categoryId;
      }

      if (!matchesCategory) return false;
    }

    if (subcategoryId) {
      const subcategoryExists = Array.isArray(categories) && categories.some(c => c.id === subcategoryId);
      let matchesSub = false;

      if (subcategoryExists) {
        for (const id of productCatIds) {
          const ancestors = this._getCategoryAncestors(id, categories);
          if (ancestors.includes(subcategoryId)) {
            matchesSub = true;
            break;
          }
        }
      } else {
        matchesSub = product.subcategoryId === subcategoryId;
      }

      if (!matchesSub) return false;
    }

    return true;
  }

  _humanizeEnumValue(value) {
    if (!value) return '';
    return String(value)
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _fetchStaticPageFromCms(key) {
    const cmsPages = this._getFromStorage('cms_pages', {});
    const page = cmsPages[key];
    if (!page) {
      return {};
    }
    return page;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomepageOverview()
  getHomepageOverview() {
    const categories = this._getAllCategories();
    const products = this._getAllProducts();
    const projects = this._getFromStorage('projects', []);
    const savedLists = this._getFromStorage('saved_lists', []);

    const topLevelCategories = categories.filter(c => c.isActive && !c.parentCategoryId);
    const featuredCategories = topLevelCategories.map(c => this._resolveCategoryForeignKeys(c));

    const featuredProductsRaw = products.filter(p => p.status === 'active').slice(0, 8);
    const featuredProducts = featuredProductsRaw.map(p => this._resolveProductForeignKeys(p));

    const appMap = {};
    for (const p of products) {
      if (!p.application) continue;
      if (!appMap[p.application]) {
        appMap[p.application] = {
          id: p.application,
          applicationKey: p.application,
          name: this._humanizeEnumValue(p.application),
          description: ''
        };
      }
    }
    const topApplications = Object.values(appMap);

    // Cart stats
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const openCart = carts.find(c => c.status === 'open');
    let openCartItemCount = 0;
    if (openCart) {
      const itemsForCart = cartItems.filter(ci => ci.cartId === openCart.id);
      for (const item of itemsForCart) {
        openCartItemCount += item.quantity;
      }
    }

    const activeProjectsCount = projects.filter(p => p.status === 'active').length;
    const savedListsCount = savedLists.length;

    return {
      featuredCategories,
      featuredProducts,
      topApplications,
      heroSearchPlaceholder: 'Search heaters, burners, sensors…',
      quickStats: {
        openCartItemCount,
        activeProjectsCount,
        savedListsCount
      }
    };
  }

  // getCategoryTreeForNavigation()
  getCategoryTreeForNavigation() {
    const categories = this._getAllCategories();
    return categories.map(c => this._resolveCategoryForeignKeys(c));
  }

  // getProductFilterOptions(categoryId, subcategoryId, searchQuery)
  getProductFilterOptions(categoryId, subcategoryId, searchQuery) {
    const productsAll = this._getAllProducts().filter(p => p.status === 'active');
    const categories = this._getAllCategories();

    let products = productsAll.filter(p => this._productMatchesCategory(p, categoryId, subcategoryId, categories));

    if (searchQuery) {
      products = products.filter(p =>
        this._stringContains(p.name, searchQuery) ||
        this._stringContains(p.description, searchQuery) ||
        this._stringContains(p.sku, searchQuery)
      );
    }

    const priceValues = products.map(p => p.price).filter(v => typeof v === 'number');
    const priceMin = priceValues.length ? Math.min.apply(null, priceValues) : 0;
    const priceMax = priceValues.length ? Math.max.apply(null, priceValues) : 0;

    const powerValues = products.map(p => p.powerOutputKw).filter(v => typeof v === 'number');
    const powerMin = powerValues.length ? Math.min.apply(null, powerValues) : 0;
    const powerMax = powerValues.length ? Math.max.apply(null, powerValues) : 0;

    const capacityValues = products.map(p => p.capacityKw).filter(v => typeof v === 'number');
    const capacityMin = capacityValues.length ? Math.min.apply(null, capacityValues) : 0;
    const capacityMax = capacityValues.length ? Math.max.apply(null, capacityValues) : 0;

    const tempMinValues = products.map(p => p.temperatureMinC).filter(v => typeof v === 'number');
    const tempMaxValues = products.map(p => p.temperatureMaxC).filter(v => typeof v === 'number');
    const tempMin = tempMinValues.length ? Math.min.apply(null, tempMinValues) : 0;
    const tempMax = tempMaxValues.length ? Math.max.apply(null, tempMaxValues) : 0;

    const probeValues = products.map(p => p.probeLengthMm).filter(v => typeof v === 'number');
    const probeMin = probeValues.length ? Math.min.apply(null, probeValues) : 0;
    const probeMax = probeValues.length ? Math.max.apply(null, probeValues) : 0;

    const airflowValues = products.map(p => p.airflowCfm).filter(v => typeof v === 'number');
    const airflowMin = airflowValues.length ? Math.min.apply(null, airflowValues) : 0;
    const airflowMax = airflowValues.length ? Math.max.apply(null, airflowValues) : 0;

    const applicationsSet = new Set();
    const applicationOptions = [];
    for (const p of products) {
      if (!p.application || applicationsSet.has(p.application)) continue;
      applicationsSet.add(p.application);
      applicationOptions.push({
        value: p.application,
        label: this._humanizeEnumValue(p.application)
      });
    }

    const customerRatingOptions = [
      { value: 4, label: '4 stars & up' },
      { value: 3, label: '3 stars & up' },
      { value: 2, label: '2 stars & up' },
      { value: 1, label: '1 star & up' }
    ];

    const ipSet = new Set();
    const ipRatingOptions = [];
    for (const p of products) {
      if (!p.ipRating || ipSet.has(p.ipRating)) continue;
      ipSet.add(p.ipRating);
      ipRatingOptions.push({ value: p.ipRating, label: p.ipRating.toUpperCase() });
    }

    const brandIdsSet = new Set(products.map(p => p.brandId).filter(Boolean));
    const allBrands = this._getAllBrands();
    const brandOptions = allBrands.filter(b => brandIdsSet.has(b.id));

    const productTypeSet = new Set();
    const productTypeOptions = [];
    for (const p of products) {
      if (!p.productType || productTypeSet.has(p.productType)) continue;
      productTypeSet.add(p.productType);
      productTypeOptions.push({ value: p.productType, label: this._humanizeEnumValue(p.productType) });
    }

    const supportsFreeShippingFilter = products.some(p => !!p.isFreeShipping);

    const fuelTypeSet = new Set();
    const fuelTypeOptions = [];
    for (const p of products) {
      if (!p.fuelType || fuelTypeSet.has(p.fuelType)) continue;
      fuelTypeSet.add(p.fuelType);
      fuelTypeOptions.push({ value: p.fuelType, label: this._humanizeEnumValue(p.fuelType) });
    }

    const sensorTypeSet = new Set();
    const sensorTypeOptions = [];
    for (const p of products) {
      if (!p.sensorType || sensorTypeSet.has(p.sensorType)) continue;
      sensorTypeSet.add(p.sensorType);
      sensorTypeOptions.push({ value: p.sensorType, label: this._humanizeEnumValue(p.sensorType) });
    }

    const controlTypeSet = new Set();
    const controlTypeOptions = [];
    for (const p of products) {
      if (!p.controlType || controlTypeSet.has(p.controlType)) continue;
      controlTypeSet.add(p.controlType);
      controlTypeOptions.push({ value: p.controlType, label: this._humanizeEnumValue(p.controlType) });
    }

    const mountingTypeSet = new Set();
    const mountingTypeOptions = [];
    for (const p of products) {
      if (!p.mountingType || mountingTypeSet.has(p.mountingType)) continue;
      mountingTypeSet.add(p.mountingType);
      mountingTypeOptions.push({ value: p.mountingType, label: this._humanizeEnumValue(p.mountingType) });
    }

    const compatibilityModelMap = {};
    for (const p of products) {
      if (!Array.isArray(p.compatibleModels)) continue;
      for (const m of p.compatibleModels) {
        if (!compatibilityModelMap[m]) {
          compatibilityModelMap[m] = { modelId: m, label: m };
        }
      }
    }
    const compatibilityModelOptions = Object.values(compatibilityModelMap);

    const applicationUseCaseOptions = applicationOptions.map(o => ({ value: o.value, label: o.label }));

    return {
      priceRange: { min: priceMin, max: priceMax, currency: 'usd' },
      applicationOptions,
      powerOutputKwRange: { min: powerMin, max: powerMax },
      capacityKwRange: { min: capacityMin, max: capacityMax },
      temperatureRangeC: { min: tempMin, max: tempMax },
      probeLengthMmRange: { min: probeMin, max: probeMax },
      airflowCfmRange: { min: airflowMin, max: airflowMax },
      customerRatingOptions,
      ipRatingOptions,
      brandOptions,
      productTypeOptions,
      shippingOptionFilters: { supportsFreeShippingFilter },
      fuelTypeOptions,
      sensorTypeOptions,
      controlTypeOptions,
      mountingTypeOptions,
      compatibilityModelOptions,
      applicationUseCaseOptions
    };
  }

  // getProducts(categoryId, subcategoryId, searchQuery, page, pageSize, sortOption, filters)
  getProducts(categoryId, subcategoryId, searchQuery, page, pageSize, sortOption, filters) {
    const categories = this._getAllCategories();
    const allProducts = this._getAllProducts().filter(p => p.status === 'active');

    let products = allProducts.filter(p => this._productMatchesCategory(p, categoryId, subcategoryId, categories));

    if (searchQuery) {
      products = products.filter(p =>
        this._stringContains(p.name, searchQuery) ||
        this._stringContains(p.description, searchQuery) ||
        this._stringContains(p.sku, searchQuery)
      );
    }

    products = this._applyProductFilters(products, filters);

    // Sorting
    if (sortOption === 'price_low_to_high') {
      products.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortOption === 'price_high_to_low') {
      products.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortOption === 'lead_time_shortest_first') {
      products.sort((a, b) => {
        const la = typeof a.leadTimeDays === 'number' ? a.leadTimeDays : Number.MAX_SAFE_INTEGER;
        const lb = typeof b.leadTimeDays === 'number' ? b.leadTimeDays : Number.MAX_SAFE_INTEGER;
        return la - lb;
      });
    } else if (sortOption === 'best_selling') {
      products.sort((a, b) => {
        const ra = typeof a.customerReviewCount === 'number' ? a.customerReviewCount : 0;
        const rb = typeof b.customerReviewCount === 'number' ? b.customerReviewCount : 0;
        if (rb !== ra) return rb - ra;
        const ar = typeof a.customerRating === 'number' ? a.customerRating : 0;
        const br = typeof b.customerRating === 'number' ? b.customerRating : 0;
        return br - ar;
      });
    } else {
      // default sort by name
      products.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }

    const totalCount = products.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const paged = products.slice(start, start + size);

    const resolved = paged.map(p => this._resolveProductForeignKeys(p));

    return {
      products: resolved,
      totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getAllProducts();
    const categories = this._getAllCategories();
    const brands = this._getAllBrands();

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        brand: null,
        breadcrumbs: [],
        availability: { inStock: false, leadTimeDays: null },
        ratingSummary: { averageRating: null, reviewCount: 0 },
        shippingInfo: { isFreeShipping: false, shippingClass: null },
        compatibilitySummary: { compatibleModels: [] }
      };
    }

    const category = categories.find(c => c.id === product.categoryId) || null;
    const subcategory = categories.find(c => c.id === product.subcategoryId) || null;
    const brand = brands.find(b => b.id === product.brandId) || null;

    const breadcrumbs = [];
    if (category) {
      breadcrumbs.push({ label: category.name, categoryId: category.id, subcategoryId: null });
    }
    if (subcategory) {
      breadcrumbs.push({ label: subcategory.name, categoryId: category ? category.id : null, subcategoryId: subcategory.id });
    }

    const availability = {
      inStock: product.status === 'active',
      leadTimeDays: typeof product.leadTimeDays === 'number' ? product.leadTimeDays : null
    };

    const ratingSummary = {
      averageRating: typeof product.customerRating === 'number' ? product.customerRating : null,
      reviewCount: typeof product.customerReviewCount === 'number' ? product.customerReviewCount : 0
    };

    const shippingInfo = {
      isFreeShipping: !!product.isFreeShipping,
      shippingClass: product.shippingClass || null
    };

    const compatibilitySummary = {
      compatibleModels: Array.isArray(product.compatibleModels) ? product.compatibleModels.slice() : []
    };

    return {
      product: this._resolveProductForeignKeys(product),
      category,
      brand,
      breadcrumbs,
      availability,
      ratingSummary,
      shippingInfo,
      compatibilitySummary
    };
  }

  // addToCart(productId, quantity)
  addToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getAllProducts();
    const product = products.find(p => p.id === productId) || null;

    if (!product) {
      return { success: false, message: 'Product not found', cart: null };
    }

    // Allow quote-only products to be added to cart; quote handling is managed separately.

    const carts = this._getFromStorage('carts', []);
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = this._getOrCreateCart();
      carts.push(cart);
    }

    const cartItems = this._getFromStorage('cart_items', []);
    let item = cartItems.find(ci => ci.cartId === cart.id && ci.productId === productId);

    if (item) {
      item.quantity += qty;
      item.addedAt = item.addedAt || this._nowIso();
    } else {
      item = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.price || 0,
        lineTotal: (product.price || 0) * qty,
        addedAt: this._nowIso()
      };
      cartItems.push(item);
      if (!Array.isArray(cart.items)) cart.items = [];
      cart.items.push(item.id);
    }

    this._saveToStorage('cart_items', cartItems);

    const calc = this._calculateCartTotals(cart);
    const updatedCart = calc.cart;

    const cartIndex = carts.findIndex(c => c.id === updatedCart.id);
    if (cartIndex >= 0) {
      carts[cartIndex] = updatedCart;
    } else {
      carts.push(updatedCart);
    }
    this._saveToStorage('carts', carts);

    const itemsForCart = cartItems.filter(ci => ci.cartId === updatedCart.id);
    const enrichedItems = itemsForCart.map(ci => {
      const prod = products.find(p => p.id === ci.productId) || null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        productName: ci.productName,
        sku: prod ? prod.sku : null,
        thumbnailUrl: prod ? prod.thumbnailUrl : null,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        lineTotal: ci.lineTotal,
        isFreeShipping: prod ? !!prod.isFreeShipping : false,
        shippingClass: prod ? prod.shippingClass || null : null,
        leadTimeDays: prod && typeof prod.leadTimeDays === 'number' ? prod.leadTimeDays : null,
        product: this._resolveProductForeignKeys(prod)
      };
    });

    const itemCount = enrichedItems.reduce((sum, it) => sum + it.quantity, 0);

    return {
      success: true,
      message: 'Added to cart',
      cart: {
        id: updatedCart.id,
        status: updatedCart.status,
        itemCount,
        subtotal: updatedCart.subtotal,
        shippingTotal: updatedCart.shippingTotal,
        taxTotal: updatedCart.taxTotal,
        grandTotal: updatedCart.grandTotal,
        currency: 'usd',
        items: enrichedItems
      }
    };
  }

  // getCartDetail()
  getCartDetail() {
    const products = this._getAllProducts();
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const cart = carts.find(c => c.status === 'open');
    if (!cart) {
      return { hasCart: false, cart: null };
    }

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);

    const enrichedItems = itemsForCart.map(ci => {
      const prod = products.find(p => p.id === ci.productId) || null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        productName: ci.productName,
        sku: prod ? prod.sku : null,
        thumbnailUrl: prod ? prod.thumbnailUrl : null,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        lineTotal: ci.lineTotal,
        isFreeShipping: prod ? !!prod.isFreeShipping : false,
        shippingClass: prod ? prod.shippingClass || null : null,
        leadTimeDays: prod && typeof prod.leadTimeDays === 'number' ? prod.leadTimeDays : null,
        product: this._resolveProductForeignKeys(prod)
      };
    });

    const itemCount = enrichedItems.reduce((sum, it) => sum + it.quantity, 0);

    return {
      hasCart: true,
      cart: {
        id: cart.id,
        status: cart.status,
        itemCount,
        subtotal: cart.subtotal || 0,
        shippingTotal: cart.shippingTotal || 0,
        taxTotal: cart.taxTotal || 0,
        grandTotal: cart.grandTotal || 0,
        currency: 'usd',
        items: enrichedItems
      }
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = typeof quantity === 'number' ? quantity : 0;
    const cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);
    const products = this._getAllProducts();

    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, cart: null };
    }

    const item = cartItems[itemIndex];
    const cart = carts.find(c => c.id === item.cartId) || null;
    if (!cart) {
      return { success: false, cart: null };
    }

    if (qty <= 0) {
      cartItems.splice(itemIndex, 1);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== cartItemId);
      }
    } else {
      item.quantity = qty;
    }

    this._saveToStorage('cart_items', cartItems);

    const calc = this._calculateCartTotals(cart);
    const updatedCart = calc.cart;

    const cartIndex = carts.findIndex(c => c.id === updatedCart.id);
    if (cartIndex >= 0) {
      carts[cartIndex] = updatedCart;
    }
    this._saveToStorage('carts', carts);

    const itemsForCart = cartItems.filter(ci => ci.cartId === updatedCart.id);
    const enrichedItems = itemsForCart.map(ci => {
      const prod = products.find(p => p.id === ci.productId) || null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        productName: ci.productName,
        quantity: ci.quantity,
        lineTotal: ci.lineTotal,
        product: this._resolveProductForeignKeys(prod)
      };
    });

    const itemCount = enrichedItems.reduce((sum, it) => sum + it.quantity, 0);

    return {
      success: true,
      cart: {
        id: updatedCart.id,
        itemCount,
        subtotal: updatedCart.subtotal,
        grandTotal: updatedCart.grandTotal,
        items: enrichedItems
      }
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);
    const products = this._getAllProducts();

    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, cart: null };
    }

    const item = cartItems[itemIndex];
    const cart = carts.find(c => c.id === item.cartId) || null;
    if (!cart) {
      return { success: false, cart: null };
    }

    cartItems.splice(itemIndex, 1);
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter(id => id !== cartItemId);
    }

    this._saveToStorage('cart_items', cartItems);

    const calc = this._calculateCartTotals(cart);
    const updatedCart = calc.cart;
    const cartIndex = carts.findIndex(c => c.id === updatedCart.id);
    if (cartIndex >= 0) {
      carts[cartIndex] = updatedCart;
    }
    this._saveToStorage('carts', carts);

    const itemsForCart = cartItems.filter(ci => ci.cartId === updatedCart.id);
    const enrichedItems = itemsForCart.map(ci => {
      const prod = products.find(p => p.id === ci.productId) || null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        productName: ci.productName,
        quantity: ci.quantity,
        lineTotal: ci.lineTotal,
        product: this._resolveProductForeignKeys(prod)
      };
    });

    const itemCount = enrichedItems.reduce((sum, it) => sum + it.quantity, 0);

    return {
      success: true,
      cart: {
        id: updatedCart.id,
        itemCount,
        subtotal: updatedCart.subtotal,
        grandTotal: updatedCart.grandTotal
      }
    };
  }

  // addProductToCompareList(productId)
  addProductToCompareList(productId) {
    const products = this._getAllProducts();
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, message: 'Product not found', compareCount: 0, productIds: [], maxItems: 0 };
    }

    const compareLists = this._getFromStorage('compare_lists', []);
    const list = this._getActiveCompareList();

    const existing = list.productIds || [];
    if (existing.includes(productId)) {
      return {
        success: true,
        message: 'Product already in compare list',
        compareCount: existing.length,
        productIds: existing.slice(),
        maxItems: list.maxItems
      };
    }

    if (existing.length >= (list.maxItems || 4)) {
      return {
        success: false,
        message: 'Compare list is full',
        compareCount: existing.length,
        productIds: existing.slice(),
        maxItems: list.maxItems || 4
      };
    }

    list.productIds.push(productId);
    list.updatedAt = this._nowIso();

    const idx = compareLists.findIndex(l => l.id === list.id);
    if (idx >= 0) {
      compareLists[idx] = list;
    } else {
      compareLists.push(list);
    }
    this._saveToStorage('compare_lists', compareLists);

    return {
      success: true,
      message: 'Added to compare list',
      compareCount: list.productIds.length,
      productIds: list.productIds.slice(),
      maxItems: list.maxItems
    };
  }

  // removeProductFromCompareList(productId)
  removeProductFromCompareList(productId) {
    const compareLists = this._getFromStorage('compare_lists', []);
    const list = this._getActiveCompareList();

    list.productIds = (list.productIds || []).filter(id => id !== productId);
    list.updatedAt = this._nowIso();

    const idx = compareLists.findIndex(l => l.id === list.id);
    if (idx >= 0) {
      compareLists[idx] = list;
    } else {
      compareLists.push(list);
    }
    this._saveToStorage('compare_lists', compareLists);

    return {
      success: true,
      compareCount: list.productIds.length,
      productIds: list.productIds.slice()
    };
  }

  // clearCompareList()
  clearCompareList() {
    const compareLists = this._getFromStorage('compare_lists', []);
    const list = this._getActiveCompareList();
    list.productIds = [];
    list.updatedAt = this._nowIso();
    const idx = compareLists.findIndex(l => l.id === list.id);
    if (idx >= 0) {
      compareLists[idx] = list;
    } else {
      compareLists.push(list);
    }
    this._saveToStorage('compare_lists', compareLists);
    return { success: true };
  }

  // getCompareListStatus()
  getCompareListStatus() {
    const list = this._getActiveCompareList();
    return {
      compareCount: (list.productIds || []).length,
      productIds: (list.productIds || []).slice()
    };
  }

  // getCompareView()
  getCompareView() {
    const list = this._getActiveCompareList();
    const products = this._getAllProducts();
    const categories = this._getAllCategories();
    const brands = this._getAllBrands();

    const resultProducts = [];
    for (const id of list.productIds || []) {
      const p = products.find(pr => pr.id === id);
      if (!p) continue;
      const category = categories.find(c => c.id === p.categoryId) || null;
      const brand = brands.find(b => b.id === p.brandId) || null;
      resultProducts.push({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        imageUrl: p.imageUrl || null,
        categoryName: category ? category.name : null,
        brandName: brand ? brand.name : null,
        price: p.price || 0,
        currency: p.currency || 'usd',
        capacityKw: typeof p.capacityKw === 'number' ? p.capacityKw : null,
        powerOutputKw: typeof p.powerOutputKw === 'number' ? p.powerOutputKw : null,
        temperatureMinC: typeof p.temperatureMinC === 'number' ? p.temperatureMinC : null,
        temperatureMaxC: typeof p.temperatureMaxC === 'number' ? p.temperatureMaxC : null,
        probeLengthMm: typeof p.probeLengthMm === 'number' ? p.probeLengthMm : null,
        airflowCfm: typeof p.airflowCfm === 'number' ? p.airflowCfm : null,
        ipRating: p.ipRating || null,
        fuelType: p.fuelType || null,
        sensorType: p.sensorType || null,
        controlType: p.controlType || null,
        mountingType: p.mountingType || null,
        application: p.application || null,
        productType: p.productType || null,
        weightKg: typeof p.weightKg === 'number' ? p.weightKg : null,
        leadTimeDays: typeof p.leadTimeDays === 'number' ? p.leadTimeDays : null,
        customerRating: typeof p.customerRating === 'number' ? p.customerRating : null,
        customerReviewCount: typeof p.customerReviewCount === 'number' ? p.customerReviewCount : 0,
        product: this._resolveProductForeignKeys(p)
      });
    }

    return { products: resultProducts };
  }

  // createQuoteRequest(productId, quantity, email, companyName, phone, notes)
  createQuoteRequest(productId, quantity, email, companyName, phone, notes) {
    const products = this._getAllProducts();
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, message: 'Product not found', quoteRequest: null };
    }

    const quoteRequests = this._getFromStorage('quote_requests', []);
    const qr = {
      id: this._generateId('quote'),
      productId: product.id,
      productName: product.name,
      quantity: typeof quantity === 'number' && quantity > 0 ? quantity : 1,
      email: email,
      companyName: companyName || null,
      phone: phone || null,
      status: 'submitted',
      notes: notes || null,
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    quoteRequests.push(qr);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      message: 'Quote request submitted',
      quoteRequest: Object.assign({}, qr, { product: this._resolveProductForeignKeys(product) })
    };
  }

  // createConsultationRequest(productId, subject, email, description)
  createConsultationRequest(productId, subject, email, description) {
    const products = this._getAllProducts();
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, message: 'Product not found', consultationRequest: null };
    }

    const consultationRequests = this._getFromStorage('consultation_requests', []);
    const cr = {
      id: this._generateId('consult'),
      productId: product.id,
      productName: product.name,
      subject: subject,
      email: email,
      description: description,
      status: 'submitted',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    consultationRequests.push(cr);
    this._saveToStorage('consultation_requests', consultationRequests);

    return {
      success: true,
      message: 'Consultation request submitted',
      consultationRequest: Object.assign({}, cr, { product: this._resolveProductForeignKeys(product) })
    };
  }

  // createSavedList(name, description)
  createSavedList(name, description) {
    const savedLists = this._getFromStorage('saved_lists', []);
    const savedList = {
      id: this._generateId('savedlist'),
      name: name,
      description: description || null,
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };
    savedLists.push(savedList);
    this._saveToStorage('saved_lists', savedLists);
    return { savedList };
  }

  // getSavedListsOverview()
  getSavedListsOverview() {
    const savedLists = this._getFromStorage('saved_lists', []);
    const items = this._getFromStorage('saved_list_items', []);

    return savedLists.map(list => {
      const itemCount = items.filter(i => i.savedListId === list.id).length;
      return {
        id: list.id,
        name: list.name,
        description: list.description || null,
        itemCount,
        createdAt: list.createdAt || null,
        updatedAt: list.updatedAt || null
      };
    });
  }

  // getSavedListDetail(savedListId)
  getSavedListDetail(savedListId) {
    const savedLists = this._getFromStorage('saved_lists', []);
    const items = this._getFromStorage('saved_list_items', []);
    const products = this._getAllProducts();

    const list = savedLists.find(l => l.id === savedListId) || null;
    if (!list) {
      return {
        id: null,
        name: null,
        description: null,
        items: []
      };
    }

    const listItems = items.filter(i => i.savedListId === savedListId);

    const enrichedItems = listItems.map(i => {
      const prod = products.find(p => p.id === i.productId) || null;
      return {
        savedListItemId: i.id,
        productId: i.productId,
        productName: i.productName || (prod ? prod.name : null),
        sku: prod ? prod.sku : null,
        thumbnailUrl: prod ? prod.thumbnailUrl : null,
        quantity: typeof i.quantity === 'number' ? i.quantity : 1,
        notes: i.notes || null,
        price: prod ? prod.price || 0 : 0,
        currency: prod ? prod.currency || 'usd' : 'usd',
        isFreeShipping: prod ? !!prod.isFreeShipping : false,
        leadTimeDays: prod && typeof prod.leadTimeDays === 'number' ? prod.leadTimeDays : null,
        addedAt: i.addedAt || null,
        product: this._resolveProductForeignKeys(prod)
      };
    });

    return {
      id: list.id,
      name: list.name,
      description: list.description || null,
      items: enrichedItems
    };
  }

  // renameSavedList(savedListId, newName)
  renameSavedList(savedListId, newName) {
    const savedLists = this._getFromStorage('saved_lists', []);
    const list = savedLists.find(l => l.id === savedListId) || null;
    if (!list) {
      return { savedList: null };
    }
    list.name = newName;
    list.updatedAt = this._nowIso();
    this._saveToStorage('saved_lists', savedLists);
    return { savedList: { id: list.id, name: list.name, updatedAt: list.updatedAt } };
  }

  // deleteSavedList(savedListId)
  deleteSavedList(savedListId) {
    const savedLists = this._getFromStorage('saved_lists', []);
    const items = this._getFromStorage('saved_list_items', []);

    const newLists = savedLists.filter(l => l.id !== savedListId);
    const newItems = items.filter(i => i.savedListId !== savedListId);

    this._saveToStorage('saved_lists', newLists);
    this._saveToStorage('saved_list_items', newItems);

    return { success: true };
  }

  // addProductToSavedList(savedListId, productId, quantity, notes)
  addProductToSavedList(savedListId, productId, quantity, notes) {
    const savedLists = this._getFromStorage('saved_lists', []);
    const list = savedLists.find(l => l.id === savedListId) || null;
    if (!list) {
      return { success: false, savedListId: savedListId, itemCount: 0 };
    }

    const products = this._getAllProducts();
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, savedListId: savedListId, itemCount: 0 };
    }

    const items = this._getFromStorage('saved_list_items', []);
    const item = {
      id: this._generateId('saveditem'),
      savedListId: savedListId,
      productId: productId,
      productName: product.name,
      quantity: typeof quantity === 'number' && quantity > 0 ? quantity : 1,
      notes: notes || null,
      addedAt: this._nowIso()
    };
    items.push(item);
    this._saveToStorage('saved_list_items', items);

    const itemCount = items.filter(i => i.savedListId === savedListId).length;
    return { success: true, savedListId: savedListId, itemCount };
  }

  // updateSavedListItem(savedListItemId, quantity, notes)
  updateSavedListItem(savedListItemId, quantity, notes) {
    const items = this._getFromStorage('saved_list_items', []);
    const idx = items.findIndex(i => i.id === savedListItemId);
    if (idx === -1) {
      return { savedListItem: null };
    }
    const item = items[idx];
    if (typeof quantity === 'number') {
      item.quantity = quantity;
    }
    if (typeof notes === 'string') {
      item.notes = notes;
    }
    this._saveToStorage('saved_list_items', items);
    return { savedListItem: { id: item.id, quantity: item.quantity, notes: item.notes || null } };
  }

  // removeSavedListItem(savedListItemId)
  removeSavedListItem(savedListItemId) {
    const items = this._getFromStorage('saved_list_items', []);
    const newItems = items.filter(i => i.id !== savedListItemId);
    this._saveToStorage('saved_list_items', newItems);
    return { success: true };
  }

  // moveSavedListItemsToCart(savedListId, savedListItemIds, copyOnly)
  moveSavedListItemsToCart(savedListId, savedListItemIds, copyOnly) {
    const items = this._getFromStorage('saved_list_items', []);
    const targetItems = items.filter(i => i.savedListId === savedListId && savedListItemIds.includes(i.id));

    for (const i of targetItems) {
      this.addToCart(i.productId, typeof i.quantity === 'number' ? i.quantity : 1);
    }

    if (!copyOnly) {
      const remaining = items.filter(i => !(i.savedListId === savedListId && savedListItemIds.includes(i.id)));
      this._saveToStorage('saved_list_items', remaining);
    }

    const cartDetail = this.getCartDetail();
    return {
      success: true,
      cart: cartDetail.hasCart
        ? { id: cartDetail.cart.id, itemCount: cartDetail.cart.itemCount, grandTotal: cartDetail.cart.grandTotal }
        : { id: null, itemCount: 0, grandTotal: 0 }
    };
  }

  // moveSavedListItemsToProject(savedListId, savedListItemIds, targetProjectId, copyOnly)
  moveSavedListItemsToProject(savedListId, savedListItemIds, targetProjectId, copyOnly) {
    const items = this._getFromStorage('saved_list_items', []);
    const targetItems = items.filter(i => i.savedListId === savedListId && savedListItemIds.includes(i.id));

    for (const i of targetItems) {
      this.addProductToProject(targetProjectId, i.productId, typeof i.quantity === 'number' ? i.quantity : 1, i.notes || null);
    }

    if (!copyOnly) {
      const remaining = items.filter(i => !(i.savedListId === savedListId && savedListItemIds.includes(i.id)));
      this._saveToStorage('saved_list_items', remaining);
    }

    return { success: true, projectId: targetProjectId };
  }

  // getProjectsOverview()
  getProjectsOverview() {
    const projects = this._getFromStorage('projects', []);
    const items = this._getFromStorage('project_items', []);

    return projects.map(p => {
      const itemCount = items.filter(i => i.projectId === p.id).length;
      return {
        id: p.id,
        name: p.name,
        description: p.description || null,
        status: p.status,
        itemCount,
        createdAt: p.createdAt || null,
        updatedAt: p.updatedAt || null
      };
    });
  }

  // createProject(name, description)
  createProject(name, description) {
    const projects = this._getFromStorage('projects', []);
    const project = {
      id: this._generateId('project'),
      name: name,
      description: description || null,
      status: 'active',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };
    projects.push(project);
    this._saveToStorage('projects', projects);
    return { project };
  }

  // renameProject(projectId, newName)
  renameProject(projectId, newName) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
      return { project: null };
    }
    project.name = newName;
    project.updatedAt = this._nowIso();
    this._saveToStorage('projects', projects);
    return { project: { id: project.id, name: project.name, updatedAt: project.updatedAt } };
  }

  // deleteProject(projectId)
  deleteProject(projectId) {
    const projects = this._getFromStorage('projects', []);
    const items = this._getFromStorage('project_items', []);

    const newProjects = projects.filter(p => p.id !== projectId);
    const newItems = items.filter(i => i.projectId !== projectId);

    this._saveToStorage('projects', newProjects);
    this._saveToStorage('project_items', newItems);

    return { success: true };
  }

  // duplicateProject(sourceProjectId, newName, copyItems)
  duplicateProject(sourceProjectId, newName, copyItems) {
    const projects = this._getFromStorage('projects', []);
    const items = this._getFromStorage('project_items', []);

    const source = projects.find(p => p.id === sourceProjectId) || null;
    if (!source) {
      return { project: null };
    }

    const newProject = {
      id: this._generateId('project'),
      name: newName,
      description: source.description || null,
      status: source.status || 'active',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    projects.push(newProject);

    if (copyItems !== false) {
      const sourceItems = items.filter(i => i.projectId === sourceProjectId);
      for (const si of sourceItems) {
        const ni = {
          id: this._generateId('projectitem'),
          projectId: newProject.id,
          productId: si.productId,
          productName: si.productName,
          quantity: si.quantity,
          notes: si.notes || null,
          addedAt: this._nowIso()
        };
        items.push(ni);
      }
    }

    this._saveToStorage('projects', projects);
    this._saveToStorage('project_items', items);

    return { project: { id: newProject.id, name: newProject.name, status: newProject.status } };
  }

  // exportProject(projectId, format)
  exportProject(projectId, format) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
      return { success: false, downloadToken: null };
    }
    const token = 'export_' + projectId + '_' + format + '_' + this._getNextIdCounter();
    // Only metadata (token) is stored/returned; no large file data.
    return { success: true, downloadToken: token };
  }

  // getProjectDetail(projectId)
  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects', []);
    const items = this._getFromStorage('project_items', []);
    const products = this._getAllProducts();

    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
      return {
        id: null,
        name: null,
        description: null,
        status: null,
        items: []
      };
    }

    const projectItems = items.filter(i => i.projectId === projectId);

    const enrichedItems = projectItems.map(i => {
      const prod = products.find(p => p.id === i.productId) || null;
      return {
        projectItemId: i.id,
        productId: i.productId,
        productName: i.productName || (prod ? prod.name : null),
        sku: prod ? prod.sku : null,
        thumbnailUrl: prod ? prod.thumbnailUrl : null,
        quantity: i.quantity,
        notes: i.notes || null,
        price: prod ? prod.price || 0 : 0,
        currency: prod ? prod.currency || 'usd' : 'usd',
        addedAt: i.addedAt || null,
        product: this._resolveProductForeignKeys(prod)
      };
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description || null,
      status: project.status,
      items: enrichedItems
    };
  }

  // addProductToProject(projectId, productId, quantity, notes)
  addProductToProject(projectId, productId, quantity, notes) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find(p => p.id === projectId) || null;
    if (!project) {
      return { success: false, projectId: projectId, itemCount: 0 };
    }

    const products = this._getAllProducts();
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, projectId: projectId, itemCount: 0 };
    }

    const items = this._getFromStorage('project_items', []);
    const item = {
      id: this._generateId('projectitem'),
      projectId: projectId,
      productId: productId,
      productName: product.name,
      quantity: typeof quantity === 'number' && quantity > 0 ? quantity : 1,
      notes: notes || null,
      addedAt: this._nowIso()
    };

    items.push(item);
    this._saveToStorage('project_items', items);

    const itemCount = items.filter(i => i.projectId === projectId).length;
    return { success: true, projectId: projectId, itemCount };
  }

  // updateProjectItemQuantity(projectItemId, quantity)
  updateProjectItemQuantity(projectItemId, quantity) {
    const items = this._getFromStorage('project_items', []);
    const item = items.find(i => i.id === projectItemId) || null;
    if (!item) {
      return { projectItem: null };
    }
    item.quantity = typeof quantity === 'number' ? quantity : item.quantity;
    this._saveToStorage('project_items', items);
    return { projectItem: { id: item.id, quantity: item.quantity } };
  }

  // removeProjectItem(projectItemId)
  removeProjectItem(projectItemId) {
    const items = this._getFromStorage('project_items', []);
    const newItems = items.filter(i => i.id !== projectItemId);
    this._saveToStorage('project_items', newItems);
    return { success: true };
  }

  // moveProjectItemsToCart(projectId, projectItemIds, copyOnly)
  moveProjectItemsToCart(projectId, projectItemIds, copyOnly) {
    const items = this._getFromStorage('project_items', []);
    const targetItems = items.filter(i => i.projectId === projectId && projectItemIds.includes(i.id));

    for (const i of targetItems) {
      this.addToCart(i.productId, typeof i.quantity === 'number' ? i.quantity : 1);
    }

    if (!copyOnly) {
      const remaining = items.filter(i => !(i.projectId === projectId && projectItemIds.includes(i.id)));
      this._saveToStorage('project_items', remaining);
    }

    const cartDetail = this.getCartDetail();
    return {
      success: true,
      cart: cartDetail.hasCart
        ? { id: cartDetail.cart.id, itemCount: cartDetail.cart.itemCount, grandTotal: cartDetail.cart.grandTotal }
        : { id: null, itemCount: 0, grandTotal: 0 }
    };
  }

  // getRelatedProducts(productId)
  getRelatedProducts(productId) {
    const products = this._getAllProducts();
    const base = products.find(p => p.id === productId) || null;
    if (!base) return [];

    const related = products
      .filter(p => p.id !== productId && p.status === 'active')
      .map(p => {
        let score = 0;
        if (base.brandId && p.brandId === base.brandId) score += 2;
        if (base.categoryId && p.categoryId === base.categoryId) score += 2;
        if (base.application && p.application === base.application) score += 1;
        return { product: p, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(x => this._resolveProductForeignKeys(x.product));

    return related;
  }

  // createCartQuoteRequest(email, companyName, phone, notes)
  createCartQuoteRequest(email, companyName, phone, notes) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getAllProducts();

    const cart = carts.find(c => c.status === 'open');
    if (!cart) {
      return { success: false, message: 'No active cart', quoteRequestIds: [] };
    }

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    const quoteRequests = this._getFromStorage('quote_requests', []);
    const quoteRequestIds = [];

    for (const item of itemsForCart) {
      const product = products.find(p => p.id === item.productId) || null;
      if (!product) continue;
      const qr = {
        id: this._generateId('quote'),
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        email: email,
        companyName: companyName || null,
        phone: phone || null,
        status: 'submitted',
        notes: notes || null,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      quoteRequests.push(qr);
      quoteRequestIds.push(qr.id);
    }

    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      message: 'Cart quote request submitted',
      quoteRequestIds
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const page = this._fetchStaticPageFromCms('about') || {};
    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || '',
      marketsServed: Array.isArray(page.marketsServed) ? page.marketsServed : [],
      certifications: Array.isArray(page.certifications) ? page.certifications : []
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    const page = this._fetchStaticPageFromCms('contact') || {};
    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || '',
      phoneNumbers: Array.isArray(page.phoneNumbers) ? page.phoneNumbers : [],
      emailAddresses: Array.isArray(page.emailAddresses) ? page.emailAddresses : [],
      addresses: Array.isArray(page.addresses) ? page.addresses : []
    };
  }

  // submitContactInquiry(name, email, subject, message, topic)
  submitContactInquiry(name, email, subject, message, topic) {
    // To keep storage small, we store minimal metadata in cms_pages under a special key.
    const cmsPages = this._getFromStorage('cms_pages', {});
    if (!cmsPages.inquiries) cmsPages.inquiries = [];
    const inquiry = {
      id: this._generateId('inquiry'),
      name,
      email,
      subject,
      message,
      topic: topic || null,
      createdAt: this._nowIso()
    };
    cmsPages.inquiries.push(inquiry);
    this._saveToStorage('cms_pages', cmsPages);
    return {
      success: true,
      inquiryId: inquiry.id,
      message: 'Inquiry submitted'
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    const page = this._fetchStaticPageFromCms('help_faq') || {};
    return {
      title: page.title || '',
      sections: Array.isArray(page.sections) ? page.sections : [],
      faqs: Array.isArray(page.faqs) ? page.faqs : []
    };
  }

  // getShippingAndReturnsContent()
  getShippingAndReturnsContent() {
    const page = this._fetchStaticPageFromCms('shipping_returns') || {};
    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || '',
      shippingMethods: Array.isArray(page.shippingMethods) ? page.shippingMethods : [],
      freeShippingPolicyHtml: page.freeShippingPolicyHtml || '',
      returnsPolicyHtml: page.returnsPolicyHtml || ''
    };
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const page = this._fetchStaticPageFromCms('terms') || {};
    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || '',
      lastUpdatedDate: page.lastUpdatedDate || ''
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const page = this._fetchStaticPageFromCms('privacy') || {};
    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || '',
      lastUpdatedDate: page.lastUpdatedDate || '',
      dataContactEmail: page.dataContactEmail || ''
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
