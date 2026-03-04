/* eslint-disable no-var */
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

  _initStorage() {
    const arrayKeys = [
      'products',
      'product_categories',
      'brands',
      'quote_carts',
      'quote_items',
      'projects',
      'project_items',
      'service_plans',
      'service_inquiries',
      'compare_lists',
      'compare_items',
      'consultation_bookings',
      'documents',
      'resource_collections',
      'resource_items',
      'distributors',
      'distributor_quote_requests',
      'resource_articles',
      'contact_inquiries'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data == null) {
      if (defaultValue === null || defaultValue === undefined) return defaultValue;
      if (typeof defaultValue === 'object') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
      return defaultValue;
    }
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ---------- Helper: category hierarchy ----------
  _getDescendantCategoryIds(rootCategoryId) {
    const categories = this._getFromStorage('product_categories', []);
    const result = new Set();
    const queue = [rootCategoryId];
    while (queue.length) {
      const current = queue.shift();
      if (result.has(current)) continue;
      result.add(current);
      categories
        .filter((c) => c.parent_category_id === current)
        .forEach((child) => {
          queue.push(child.category_id);
        });
    }
    return Array.from(result);
  }

  _augmentProduct(product) {
    if (!product) return null;
    const brands = this._getFromStorage('brands', []);
    const categories = this._getFromStorage('product_categories', []);
    const brand = product.brand_id ? brands.find((b) => b.id === product.brand_id) || null : null;
    const category = product.category_id
      ? categories.find((c) => c.category_id === product.category_id) || null
      : null;
    return Object.assign({}, product, { brand, category });
  }

  // ---------- Helper: Quote Cart ----------
  _getOrCreateQuoteCart() {
    const quoteCarts = this._getFromStorage('quote_carts', []);
    let currentId = localStorage.getItem('currentQuoteCartId');
    let cart = null;

    if (currentId) {
      cart = quoteCarts.find((c) => c.id === currentId && c.status === 'open') || null;
    }

    if (!cart) {
      cart = quoteCarts.find((c) => c.status === 'open') || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('quote_cart'),
        status: 'open',
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        contact_name: null,
        contact_email: null,
        company_name: null,
        requested_delivery_date: null,
        notes: null
      };
      quoteCarts.push(cart);
      this._saveToStorage('quote_carts', quoteCarts);
      localStorage.setItem('currentQuoteCartId', cart.id);
    }

    return cart;
  }

  // ---------- Helper: Project ----------
  _getOrCreateProject(name, projectType) {
    const projects = this._getFromStorage('projects', []);
    let project = projects.find((p) => p.name === name) || null;
    if (!project) {
      project = {
        id: this._generateId('project'),
        name: name,
        description: null,
        project_type: projectType || 'generic_project',
        notes: null,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      projects.push(project);
      this._saveToStorage('projects', projects);
    }
    return project;
  }

  // ---------- Helper: Compare List ----------
  _getOrCreateCompareList() {
    const compareLists = this._getFromStorage('compare_lists', []);
    let currentId = localStorage.getItem('currentCompareListId');
    let list = null;

    if (currentId) {
      list = compareLists.find((c) => c.id === currentId) || null;
    }

    if (!list) {
      list = compareLists[0] || null;
    }

    if (!list) {
      list = {
        id: this._generateId('compare_list'),
        name: 'Default Compare List',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      compareLists.push(list);
      this._saveToStorage('compare_lists', compareLists);
      localStorage.setItem('currentCompareListId', list.id);
    }

    return list;
  }

  // ---------- Helper: Default Resource Collection ----------
  _getOrCreateDefaultResourceCollection(name, type) {
    const collections = this._getFromStorage('resource_collections', []);
    let collection = collections.find((c) => c.name === name && c.type === type) || null;
    if (!collection) {
      collection = {
        id: this._generateId('resource_collection'),
        name: name,
        description: null,
        type: type,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      collections.push(collection);
      this._saveToStorage('resource_collections', collections);
    }
    return collection;
  }

  // =====================================================================
  // Interface: getMainProductCategories
  // =====================================================================
  getMainProductCategories() {
    const categories = this._getFromStorage('product_categories', []);
    // Main navigation: include all categories so key families and sub-families appear
    const topLevel = categories;
    return topLevel.map((c) => ({
      categoryId: c.category_id,
      displayName: c.display_name,
      description: c.description || ''
    }));
  }

  // =====================================================================
  // Interface: getServiceCategories
  // =====================================================================
  getServiceCategories() {
    // Use enum values from ServicePlan.category_id
    const categoriesConfig = [
      {
        categoryId: 'maintenance_plans',
        displayName: 'Maintenance Plans',
        description: 'Preventive and corrective maintenance services.'
      },
      {
        categoryId: 'engineering_services',
        displayName: 'Engineering Services',
        description: 'Consulting and engineering support.'
      },
      {
        categoryId: 'all_services',
        displayName: 'All Services',
        description: 'Browse all available service offerings.'
      }
    ];
    return categoriesConfig;
  }

  // =====================================================================
  // Interface: getProductFilterOptions
  // =====================================================================
  getProductFilterOptions(context, categoryId) {
    // context is currently unused but kept for API compatibility
    let products = this._getFromStorage('products', []);

    if (categoryId) {
      const ids = this._getDescendantCategoryIds(categoryId);
      products = products.filter((p) => ids.includes(p.category_id));
    }

    const brands = this._getFromStorage('brands', []);

    const numericFieldRange = (field) => {
      const values = products
        .map((p) => p[field])
        .filter((v) => typeof v === 'number' && !isNaN(v));
      if (!values.length) return [];
      const min = Math.min.apply(null, values);
      const max = Math.max.apply(null, values);
      return [
        {
          min,
          max,
          label: min + '–' + max
        }
      ];
    };

    const flowRateRangesM3PerH = numericFieldRange('flow_rate_min_m3_per_h');
    const headRangesM = numericFieldRange('head_min_m');
    const loadCapacityRangesKgPerM = numericFieldRange('load_capacity_kg_per_m');
    const beltWidthRangesMm = numericFieldRange('belt_width_mm');
    const priceRanges = (function () {
      const values = products
        .map((p) => p.price)
        .filter((v) => typeof v === 'number' && !isNaN(v));
      if (!values.length) return [];
      const min = Math.min.apply(null, values);
      const max = Math.max.apply(null, values);
      return [
        {
          min,
          max,
          currency: 'usd',
          label: '$' + min + '–$' + max
        }
      ];
    })();

    const brandIds = Array.from(
      new Set(
        products
          .map((p) => p.brand_id)
          .filter((id) => !!id)
      )
    );
    const usedBrands = brands.filter((b) => brandIds.includes(b.id));

    const ipRatings = Array.from(
      new Set(
        products
          .map((p) => p.ip_rating)
          .filter((r) => !!r)
      )
    );

    const ratingOptions = [
      { minRating: 4, label: '4★ & up' },
      { minRating: 3, label: '3★ & up' },
      { minRating: 2, label: '2★ & up' }
    ];

    const compressedAirCategories = ['compressors', 'air_dryers', 'accessories'];
    const conveyorTypes = ['straight', 'curved'];

    const sortOptions = [
      { value: 'best_match', label: 'Best Match' },
      { value: 'best_selling', label: 'Best Selling' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return {
      flowRateRangesM3PerH,
      headRangesM,
      loadCapacityRangesKgPerM,
      beltWidthRangesMm,
      priceRanges,
      brands: usedBrands,
      ipRatings,
      ratingOptions,
      compressedAirCategories,
      conveyorTypes,
      sortOptions
    };
  }

  // =====================================================================
  // Interface: listProductsByCategory
  // =====================================================================
  listProductsByCategory(categoryId, filters, sortBy, page = 1, pageSize = 20) {
    let products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const brands = this._getFromStorage('brands', []);

    const categoryIds = this._getDescendantCategoryIds(categoryId);
    products = products.filter((p) => categoryIds.includes(p.category_id));

    filters = filters || {};

    // Flow rate range intersection
    if (filters.minFlowRateM3PerH != null || filters.maxFlowRateM3PerH != null) {
      const userMin = filters.minFlowRateM3PerH != null ? filters.minFlowRateM3PerH : -Infinity;
      const userMax = filters.maxFlowRateM3PerH != null ? filters.maxFlowRateM3PerH : Infinity;
      products = products.filter((p) => {
        if (p.flow_rate_min_m3_per_h == null && p.flow_rate_max_m3_per_h == null) return false;
        const pMin = p.flow_rate_min_m3_per_h != null ? p.flow_rate_min_m3_per_h : p.flow_rate_max_m3_per_h;
        const pMax = p.flow_rate_max_m3_per_h != null ? p.flow_rate_max_m3_per_h : p.flow_rate_min_m3_per_h;
        return pMax >= userMin && pMin <= userMax;
      });
    }

    // Head range
    if (filters.minHeadM != null || filters.maxHeadM != null) {
      const userMin = filters.minHeadM != null ? filters.minHeadM : -Infinity;
      const userMax = filters.maxHeadM != null ? filters.maxHeadM : Infinity;
      products = products.filter((p) => {
        if (p.head_min_m == null && p.head_max_m == null) return false;
        const pMin = p.head_min_m != null ? p.head_min_m : p.head_max_m;
        const pMax = p.head_max_m != null ? p.head_max_m : p.head_min_m;
        return pMax >= userMin && pMin <= userMax;
      });
    }

    if (filters.minLoadCapacityKgPerM != null) {
      products = products.filter(
        (p) => typeof p.load_capacity_kg_per_m === 'number' && p.load_capacity_kg_per_m >= filters.minLoadCapacityKgPerM
      );
    }

    if (filters.minBeltWidthMm != null) {
      products = products.filter(
        (p) => typeof p.belt_width_mm === 'number' && p.belt_width_mm >= filters.minBeltWidthMm
      );
    }

    if (filters.maxBeltWidthMm != null) {
      products = products.filter(
        (p) => typeof p.belt_width_mm === 'number' && p.belt_width_mm <= filters.maxBeltWidthMm
      );
    }

    if (filters.ipRating) {
      products = products.filter((p) => p.ip_rating === filters.ipRating);
    }

    if (filters.minPrice != null) {
      products = products.filter(
        (p) => typeof p.price === 'number' && p.price >= filters.minPrice
      );
    }

    if (filters.maxPrice != null) {
      products = products.filter(
        (p) => typeof p.price === 'number' && p.price <= filters.maxPrice
      );
    }

    if (filters.minRating != null) {
      products = products.filter(
        (p) => typeof p.average_rating === 'number' && p.average_rating >= filters.minRating
      );
    }

    if (filters.brandId) {
      products = products.filter((p) => p.brand_id === filters.brandId);
    }

    if (filters.compressedAirCategory) {
      products = products.filter((p) => p.compressed_air_category === filters.compressedAirCategory);
    }

    if (filters.conveyorType) {
      products = products.filter((p) => p.conveyor_type === filters.conveyorType);
    }

    // Sorting
    const sortKey = sortBy || filters.sortBy || 'best_match';
    if (sortKey === 'price_low_to_high') {
      products.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Infinity;
        const pb = typeof b.price === 'number' ? b.price : Infinity;
        return pa - pb;
      });
    } else if (sortKey === 'price_high_to_low') {
      products.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : -Infinity;
        const pb = typeof b.price === 'number' ? b.price : -Infinity;
        return pb - pa;
      });
    } else {
      // best_match or best_selling fallback: sort by name
      products.sort((a, b) => {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }

    const totalCount = products.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageProducts = products.slice(start, end).map((p) => {
      const augmented = this._augmentProduct(p);
      const cat = categories.find((c) => c.category_id === p.category_id) || null;
      return {
        product: augmented,
        categoryDisplayName: cat ? cat.display_name : p.category_id
      };
    });

    const filterBrand = filters.brandId
      ? brands.find((b) => b.id === filters.brandId) || null
      : null;

    return {
      products: pageProducts,
      page,
      pageSize,
      totalCount,
      appliedFilters: {
        minFlowRateM3PerH: filters.minFlowRateM3PerH != null ? filters.minFlowRateM3PerH : null,
        maxFlowRateM3PerH: filters.maxFlowRateM3PerH != null ? filters.maxFlowRateM3PerH : null,
        minHeadM: filters.minHeadM != null ? filters.minHeadM : null,
        maxHeadM: filters.maxHeadM != null ? filters.maxHeadM : null,
        minLoadCapacityKgPerM:
          filters.minLoadCapacityKgPerM != null ? filters.minLoadCapacityKgPerM : null,
        minBeltWidthMm: filters.minBeltWidthMm != null ? filters.minBeltWidthMm : null,
        maxBeltWidthMm: filters.maxBeltWidthMm != null ? filters.maxBeltWidthMm : null,
        ipRating: filters.ipRating || null,
        minPrice: filters.minPrice != null ? filters.minPrice : null,
        maxPrice: filters.maxPrice != null ? filters.maxPrice : null,
        minRating: filters.minRating != null ? filters.minRating : null,
        brandName: filterBrand ? filterBrand.name : null,
        compressedAirCategory: filters.compressedAirCategory || null,
        conveyorType: filters.conveyorType || null,
        sortBy: sortKey
      }
    };
  }

  // =====================================================================
  // Interface: searchProducts
  // =====================================================================
  searchProducts(query, filters, sortBy, page = 1, pageSize = 20) {
    query = (query || '').toLowerCase();
    filters = filters || {};

    let products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    if (query) {
      products = products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return name.includes(query) || desc.includes(query) || sku.includes(query);
      });
    }

    if (filters.categoryId) {
      const ids = this._getDescendantCategoryIds(filters.categoryId);
      products = products.filter((p) => ids.includes(p.category_id));
    }

    if (filters.ipRating) {
      products = products.filter((p) => p.ip_rating === filters.ipRating);
    }

    if (filters.minPrice != null) {
      products = products.filter(
        (p) => typeof p.price === 'number' && p.price >= filters.minPrice
      );
    }

    if (filters.maxPrice != null) {
      products = products.filter(
        (p) => typeof p.price === 'number' && p.price <= filters.maxPrice
      );
    }

    if (filters.minRating != null) {
      products = products.filter(
        (p) => typeof p.average_rating === 'number' && p.average_rating >= filters.minRating
      );
    }

    const sortKey = sortBy || filters.sortBy || 'best_match';
    if (sortKey === 'price_low_to_high') {
      products.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Infinity;
        const pb = typeof b.price === 'number' ? b.price : Infinity;
        return pa - pb;
      });
    } else if (sortKey === 'price_high_to_low') {
      products.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : -Infinity;
        const pb = typeof b.price === 'number' ? b.price : -Infinity;
        return pb - pa;
      });
    } else {
      // best_match or best_selling: sort by name
      products.sort((a, b) => {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }

    const totalCount = products.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageProducts = products.slice(start, end).map((p) => this._augmentProduct(p));

    let categoryDisplayName = null;
    if (filters.categoryId) {
      const cat = categories.find((c) => c.category_id === filters.categoryId) || null;
      categoryDisplayName = cat ? cat.display_name : filters.categoryId;
    }

    return {
      products: pageProducts,
      page,
      pageSize,
      totalCount,
      appliedFilters: {
        categoryId: filters.categoryId || null,
        categoryDisplayName,
        ipRating: filters.ipRating || null,
        minPrice: filters.minPrice != null ? filters.minPrice : null,
        maxPrice: filters.maxPrice != null ? filters.maxPrice : null,
        minRating: filters.minRating != null ? filters.minRating : null,
        sortBy: sortKey
      }
    };
  }

  // =====================================================================
  // Interface: getProductDetails
  // =====================================================================
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const brands = this._getFromStorage('brands', []);

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        categoryDisplayName: null,
        brandDisplayName: null,
        technicalSpecifications: {},
        ratingSummary: {}
      };
    }

    const brand = product.brand_id ? brands.find((b) => b.id === product.brand_id) || null : null;
    const category = product.category_id
      ? categories.find((c) => c.category_id === product.category_id) || null
      : null;

    const categoryDisplayName = category ? category.display_name : product.category_id;
    const brandDisplayName = brand ? brand.name : null;

    const technicalSpecifications = {
      flowRateMinM3PerH: product.flow_rate_min_m3_per_h || null,
      flowRateMaxM3PerH: product.flow_rate_max_m3_per_h || null,
      headMinM: product.head_min_m || null,
      headMaxM: product.head_max_m || null,
      loadCapacityKgPerM: product.load_capacity_kg_per_m || null,
      beltWidthMm: product.belt_width_mm || null,
      ipRating: product.ip_rating || null
    };

    const ratingSummary = {
      averageRating: product.average_rating || null,
      reviewCount: product.review_count || 0
    };

    return {
      product: this._augmentProduct(product),
      categoryDisplayName,
      brandDisplayName,
      technicalSpecifications,
      ratingSummary
    };
  }

  // =====================================================================
  // Quote Cart Interfaces
  // =====================================================================

  addProductToQuoteCart(productId, quantity = 1) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { success: false, quoteCart: null, items: [], message: 'Product not found' };
    }

    const quoteCart = this._getOrCreateQuoteCart();
    const quoteCarts = this._getFromStorage('quote_carts', []);
    const quoteItems = this._getFromStorage('quote_items', []);

    let item = quoteItems.find(
      (qi) => qi.quote_cart_id === quoteCart.id && qi.product_id === productId
    );

    if (item) {
      item.quantity += quantity;
      item.added_at = this._nowIso();
    } else {
      item = {
        id: this._generateId('quote_item'),
        quote_cart_id: quoteCart.id,
        product_id: productId,
        quantity: quantity,
        unit_price: typeof product.price === 'number' ? product.price : null,
        added_at: this._nowIso()
      };
      quoteItems.push(item);
    }

    const cartIndex = quoteCarts.findIndex((c) => c.id === quoteCart.id);
    if (cartIndex >= 0) {
      quoteCarts[cartIndex].updated_at = this._nowIso();
      this._saveToStorage('quote_carts', quoteCarts);
    }
    this._saveToStorage('quote_items', quoteItems);

    const cartItems = quoteItems.filter((qi) => qi.quote_cart_id === quoteCart.id);

    return {
      success: true,
      quoteCart,
      items: cartItems,
      message: 'Product added to quote cart'
    };
  }

  getQuoteCart() {
    const quoteCart = this._getOrCreateQuoteCart();
    const quoteItems = this._getFromStorage('quote_items', []);
    const products = this._getFromStorage('products', []);

    const cartItems = quoteItems
      .filter((qi) => qi.quote_cart_id === quoteCart.id)
      .map((qi) => ({
        quoteItem: qi,
        product: products.find((p) => p.id === qi.product_id) || null
      }));

    return {
      quoteCart,
      items: cartItems
    };
  }

  updateQuoteItemQuantity(quoteItemId, quantity) {
    const quoteItems = this._getFromStorage('quote_items', []);
    const quoteCarts = this._getFromStorage('quote_carts', []);

    const item = quoteItems.find((qi) => qi.id === quoteItemId) || null;
    if (!item) {
      return { quoteCart: null, items: [] };
    }

    item.quantity = quantity;
    item.added_at = this._nowIso();

    const cart = quoteCarts.find((c) => c.id === item.quote_cart_id) || null;
    if (cart) {
      cart.updated_at = this._nowIso();
    }

    this._saveToStorage('quote_items', quoteItems);
    this._saveToStorage('quote_carts', quoteCarts);

    const cartItems = quoteItems.filter((qi) => qi.quote_cart_id === item.quote_cart_id);

    return {
      quoteCart: cart,
      items: cartItems
    };
  }

  removeQuoteItem(quoteItemId) {
    const quoteItems = this._getFromStorage('quote_items', []);
    const quoteCarts = this._getFromStorage('quote_carts', []);

    const index = quoteItems.findIndex((qi) => qi.id === quoteItemId);
    if (index === -1) {
      return {
        quoteCart: null,
        items: []
      };
    }

    const [removed] = quoteItems.splice(index, 1);

    const cart = quoteCarts.find((c) => c.id === removed.quote_cart_id) || null;
    if (cart) {
      cart.updated_at = this._nowIso();
    }

    this._saveToStorage('quote_items', quoteItems);
    this._saveToStorage('quote_carts', quoteCarts);

    const cartItems = quoteItems.filter((qi) => qi.quote_cart_id === removed.quote_cart_id);

    return {
      quoteCart: cart,
      items: cartItems
    };
  }

  submitQuoteCart(contactName, contactEmail, companyName, requestedDeliveryDate, notes) {
    const quoteCarts = this._getFromStorage('quote_carts', []);
    const quoteCart = this._getOrCreateQuoteCart();

    const cartIndex = quoteCarts.findIndex((c) => c.id === quoteCart.id);
    if (cartIndex === -1) {
      return {
        quoteCart: null,
        status: 'error',
        confirmationMessage: 'Quote cart not found'
      };
    }

    const cart = quoteCarts[cartIndex];
    cart.contact_name = contactName;
    cart.contact_email = contactEmail;
    cart.company_name = companyName || null;
    cart.requested_delivery_date = requestedDeliveryDate || null;
    cart.notes = notes || null;
    cart.status = 'submitted';
    cart.updated_at = this._nowIso();

    this._saveToStorage('quote_carts', quoteCarts);
    localStorage.removeItem('currentQuoteCartId');

    return {
      quoteCart: cart,
      status: cart.status,
      confirmationMessage: 'Quote request submitted. Reference ID: ' + cart.id
    };
  }

  // =====================================================================
  // Project / BOM Interfaces
  // =====================================================================

  addProductToProject(productId, quantity = 1, projectId, newProjectName, projectType) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { project: null, items: [], message: 'Product not found' };
    }

    let project = null;
    const projects = this._getFromStorage('projects', []);

    if (projectId) {
      project = projects.find((p) => p.id === projectId) || null;
    }

    if (!project && newProjectName) {
      project = this._getOrCreateProject(newProjectName, projectType || 'generic_project');
    }

    if (!project) {
      project = this._getOrCreateProject('Unnamed Project', projectType || 'generic_project');
    }

    const projectItems = this._getFromStorage('project_items', []);
    let item = projectItems.find(
      (pi) => pi.project_id === project.id && pi.product_id === productId
    );

    if (item) {
      item.quantity += quantity;
      item.added_at = this._nowIso();
    } else {
      item = {
        id: this._generateId('project_item'),
        project_id: project.id,
        product_id: productId,
        quantity: quantity,
        notes: null,
        added_at: this._nowIso()
      };
      projectItems.push(item);
    }

    const projectIndex = projects.findIndex((p) => p.id === project.id);
    if (projectIndex >= 0) {
      projects[projectIndex].updated_at = this._nowIso();
      this._saveToStorage('projects', projects);
    }
    this._saveToStorage('project_items', projectItems);

    const itemsForProject = projectItems.filter((pi) => pi.project_id === project.id);

    return {
      project,
      items: itemsForProject,
      message: 'Product added to project'
    };
  }

  getProjectsSummary() {
    return this._getFromStorage('projects', []);
  }

  getProjectDetails(projectId) {
    const projects = this._getFromStorage('projects', []);
    const projectItems = this._getFromStorage('project_items', []);
    const products = this._getFromStorage('products', []);

    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) {
      return { project: null, items: [] };
    }

    const items = projectItems
      .filter((pi) => pi.project_id === projectId)
      .map((pi) => ({
        projectItem: pi,
        product: products.find((p) => p.id === pi.product_id) || null
      }));

    return {
      project,
      items
    };
  }

  createProject(name, projectType, notes) {
    const projects = this._getFromStorage('projects', []);
    const project = {
      id: this._generateId('project'),
      name: name,
      description: null,
      project_type: projectType || 'generic_project',
      notes: notes || null,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    projects.push(project);
    this._saveToStorage('projects', projects);
    return project;
  }

  renameProject(projectId, newName) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) return null;
    project.name = newName;
    project.updated_at = this._nowIso();
    this._saveToStorage('projects', projects);
    return project;
  }

  updateProjectItemQuantity(projectItemId, quantity) {
    const projectItems = this._getFromStorage('project_items', []);
    const item = projectItems.find((pi) => pi.id === projectItemId) || null;
    if (!item) return null;
    item.quantity = quantity;
    item.added_at = this._nowIso();
    this._saveToStorage('project_items', projectItems);
    return item;
  }

  removeProjectItem(projectItemId) {
    const projectItems = this._getFromStorage('project_items', []);
    const index = projectItems.findIndex((pi) => pi.id === projectItemId);
    if (index === -1) return false;
    projectItems.splice(index, 1);
    this._saveToStorage('project_items', projectItems);
    return true;
  }

  submitProjectAsQuoteRequest(projectId, contactName, contactEmail, companyName, notes) {
    // Simulate submission; keep project as-is and return confirmation
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) {
      return { status: 'error', confirmationMessage: 'Project not found' };
    }

    const message =
      'Project "' +
      project.name +
      '" submitted for quote by ' +
      contactName +
      ' (' +
      contactEmail +
      ').';

    return {
      status: 'submitted',
      confirmationMessage: message
    };
  }

  // =====================================================================
  // Compare List Interfaces
  // =====================================================================

  addProductToCompareList(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { compareList: null, items: [] };
    }

    const compareList = this._getOrCreateCompareList();
    const compareLists = this._getFromStorage('compare_lists', []);
    const compareItems = this._getFromStorage('compare_items', []);

    let item = compareItems.find(
      (ci) => ci.compare_list_id === compareList.id && ci.product_id === productId
    );

    if (!item) {
      item = {
        id: this._generateId('compare_item'),
        compare_list_id: compareList.id,
        product_id: productId,
        added_at: this._nowIso()
      };
      compareItems.push(item);
      const listIndex = compareLists.findIndex((c) => c.id === compareList.id);
      if (listIndex >= 0) {
        compareLists[listIndex].updated_at = this._nowIso();
      }
      this._saveToStorage('compare_lists', compareLists);
      this._saveToStorage('compare_items', compareItems);
    }

    const itemsForList = compareItems.filter((ci) => ci.compare_list_id === compareList.id);

    return {
      compareList,
      items: itemsForList
    };
  }

  getCompareList() {
    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items', []);
    const products = this._getFromStorage('products', []);

    const items = compareItems
      .filter((ci) => ci.compare_list_id === compareList.id)
      .map((ci) => ({
        compareItem: ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    return {
      compareList,
      items
    };
  }

  removeProductFromCompareList(compareItemId) {
    const compareItems = this._getFromStorage('compare_items', []);
    const index = compareItems.findIndex((ci) => ci.id === compareItemId);
    if (index === -1) return false;
    compareItems.splice(index, 1);
    this._saveToStorage('compare_items', compareItems);
    return true;
  }

  // =====================================================================
  // Service Plans & Inquiries
  // =====================================================================

  getServicePlanFilterOptions() {
    const categories = ['maintenance_plans', 'engineering_services', 'all_services'];
    const industries = [
      'robotic_systems',
      'hvac',
      'food_beverage',
      'oil_gas',
      'chemical',
      'automotive',
      'general_industry',
      'other_industry'
    ];
    const supportLevels = ['business_hours', 'extended_hours', 'support_24_7'];
    const sortOptions = [
      { value: 'response_time_fastest_first', label: 'Response Time: Fastest First' },
      { value: 'price_low_to_high', label: 'Price: Low to High' }
    ];
    return {
      categories,
      industries,
      supportLevels,
      sortOptions
    };
  }

  listServicePlans(categoryId, filters, sortBy, page = 1, pageSize = 20) {
    let plans = this._getFromStorage('service_plans', []);
    filters = filters || {};

    if (categoryId && categoryId !== 'all_services') {
      plans = plans.filter((p) => p.category_id === categoryId);
    }

    if (filters.industry) {
      plans = plans.filter((p) => p.industry === filters.industry);
    }

    if (filters.supportLevel) {
      plans = plans.filter((p) => p.support_level === filters.supportLevel);
    }

    if (filters.maxAnnualPrice != null) {
      plans = plans.filter(
        (p) => typeof p.annual_price === 'number' && p.annual_price <= filters.maxAnnualPrice
      );
    }

    const sortKey = sortBy || 'response_time_fastest_first';
    if (sortKey === 'response_time_fastest_first') {
      plans.sort((a, b) => {
        const ra = typeof a.response_time_hours === 'number' ? a.response_time_hours : Infinity;
        const rb = typeof b.response_time_hours === 'number' ? b.response_time_hours : Infinity;
        return ra - rb;
      });
    } else if (sortKey === 'price_low_to_high') {
      plans.sort((a, b) => {
        const pa = typeof a.annual_price === 'number' ? a.annual_price : Infinity;
        const pb = typeof b.annual_price === 'number' ? b.annual_price : Infinity;
        return pa - pb;
      });
    }

    const totalCount = plans.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pagePlans = plans.slice(start, end);

    return {
      servicePlans: pagePlans,
      page,
      pageSize,
      totalCount
    };
  }

  getServicePlanDetails(servicePlanId) {
    const plans = this._getFromStorage('service_plans', []);
    return plans.find((p) => p.id === servicePlanId) || null;
  }

  createServiceInquiry(servicePlanId, name, email, message) {
    const plans = this._getFromStorage('service_plans', []);
    const inquiries = this._getFromStorage('service_inquiries', []);

    const plan = plans.find((p) => p.id === servicePlanId) || null;
    if (!plan) {
      // still create inquiry but without plan_name
    }

    const inquiry = {
      id: this._generateId('service_inquiry'),
      service_plan_id: servicePlanId,
      plan_name: plan ? plan.name : null,
      name: name,
      email: email,
      message: message || null,
      created_at: this._nowIso(),
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('service_inquiries', inquiries);
    return inquiry;
  }

  // =====================================================================
  // Consultation Booking
  // =====================================================================

  getConsultationBookingOptions() {
    const topics = [
      { value: 'hvac_retrofit', label: 'HVAC Retrofit' },
      { value: 'compressed_air_systems', label: 'Compressed Air Systems' },
      { value: 'pumps', label: 'Pumps' },
      { value: 'conveyors', label: 'Conveyors' },
      { value: 'robotics', label: 'Robotics' },
      { value: 'general_engineering', label: 'General Engineering' }
    ];

    const regions = [
      { value: 'north_america', label: 'North America' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia_pacific', label: 'Asia Pacific' },
      { value: 'latin_america', label: 'Latin America' },
      { value: 'middle_east_africa', label: 'Middle East & Africa' },
      { value: 'other_region', label: 'Other' }
    ];

    return {
      topics,
      regions
    };
  }

  getAvailableConsultationSlots(topic, region, date) {
    // Generate 30-min slots from 09:00 to 17:00 UTC for the given date
    // Existing bookings are not considered for simplicity
    const slots = [];
    const baseDateStr = date.split('T')[0]; // ensure date only
    const startHour = 9;
    const endHour = 17;

    for (let hour = startHour; hour < endHour; hour++) {
      for (let half = 0; half < 2; half++) {
        const minute = half * 30;
        const startHourLocal = hour;
        const startMinuteLocal = minute;
        let endHourLocal = startHourLocal;
        let endMinuteLocal = startMinuteLocal + 30;
        if (endMinuteLocal >= 60) {
          endMinuteLocal -= 60;
          endHourLocal += 1;
        }
        const startStr =
          baseDateStr +
          'T' +
          this._pad2(startHourLocal) +
          ':' +
          this._pad2(startMinuteLocal) +
          ':00';
        const endStr =
          baseDateStr +
          'T' +
          this._pad2(endHourLocal) +
          ':' +
          this._pad2(endMinuteLocal) +
          ':00';
        const label =
          this._pad2(startHourLocal) +
          ':' +
          this._pad2(startMinuteLocal) +
          '–' +
          this._pad2(endHourLocal) +
          ':' +
          this._pad2(endMinuteLocal);
        slots.push({
          startDatetime: startStr,
          endDatetime: endStr,
          label
        });
      }
    }

    return slots;
  }

  _pad2(num) {
    return num < 10 ? '0' + num : String(num);
  }

  createConsultationBooking(topic, region, startDatetime, endDatetime, name, email, projectDescription) {
    const bookings = this._getFromStorage('consultation_bookings', []);

    const start = new Date(startDatetime);
    const datePart = start.toISOString().split('T')[0];

    const booking = {
      id: this._generateId('consultation_booking'),
      topic: topic,
      region: region || null,
      date: datePart,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      name: name,
      email: email,
      project_description: projectDescription || null,
      status: 'scheduled',
      created_at: this._nowIso()
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);
    return booking;
  }

  // =====================================================================
  // Documentation & Resources
  // =====================================================================

  getDocumentationFilterOptions() {
    const documents = this._getFromStorage('documents', []);
    const docTypes = ['user_manual', 'manual', 'installation_guide', 'quick_start', 'datasheet', 'brochure', 'other'];
    const languages = ['english', 'spanish', 'german', 'french', 'chinese', 'japanese', 'other'];

    const years = documents
      .map((d) => d.publication_year)
      .filter((y) => typeof y === 'number' && !isNaN(y));
    let yearRanges = [];
    if (years.length) {
      const minYear = Math.min.apply(null, years);
      const maxYear = Math.max.apply(null, years);
      yearRanges.push({
        minYear,
        maxYear,
        label: minYear + '–' + maxYear
      });
    }

    return {
      docTypes,
      languages,
      yearRanges
    };
  }

  searchDocuments(query, filters, page = 1, pageSize = 20) {
    query = (query || '').toLowerCase();
    filters = filters || {};

    let documents = this._getFromStorage('documents', []);

    if (query) {
      documents = documents.filter((d) => {
        const title = (d.title || '').toLowerCase();
        const desc = (d.description || '').toLowerCase();
        const model = (d.product_model || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || model.includes(query);
      });
    }

    if (filters.docType) {
      documents = documents.filter((d) => d.doc_type === filters.docType);
    }

    if (filters.language) {
      documents = documents.filter((d) => d.language === filters.language);
    }

    if (filters.minYear != null || filters.maxYear != null) {
      const minYear = filters.minYear != null ? filters.minYear : -Infinity;
      const maxYear = filters.maxYear != null ? filters.maxYear : Infinity;
      documents = documents.filter((d) => {
        const year = d.publication_year;
        if (typeof year !== 'number' || isNaN(year)) return false;
        return year >= minYear && year <= maxYear;
      });
    }

    documents.sort((a, b) => {
      const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
      const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
      return db - da;
    });

    const totalCount = documents.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageDocs = documents.slice(start, end);

    return {
      documents: pageDocs,
      page,
      pageSize,
      totalCount
    };
  }

  getDocumentDetails(documentId) {
    const documents = this._getFromStorage('documents', []);
    const products = this._getFromStorage('products', []);
    const doc = documents.find((d) => d.id === documentId) || null;
    if (!doc) return null;

    let relatedProducts = [];
    if (Array.isArray(doc.related_product_ids)) {
      relatedProducts = doc.related_product_ids
        .map((pid) => products.find((p) => p.id === pid) || null)
        .filter((p) => !!p);
    }

    const extended = Object.assign({}, doc, { relatedProducts });
    return extended;
  }

  listResourceCollections() {
    return this._getFromStorage('resource_collections', []);
  }

  createResourceCollection(name, type, description) {
    const collections = this._getFromStorage('resource_collections', []);
    const collection = {
      id: this._generateId('resource_collection'),
      name: name,
      description: description || null,
      type: type,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    collections.push(collection);
    this._saveToStorage('resource_collections', collections);
    return collection;
  }

  renameResourceCollection(collectionId, newName) {
    const collections = this._getFromStorage('resource_collections', []);
    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) return null;
    collection.name = newName;
    collection.updated_at = this._nowIso();
    this._saveToStorage('resource_collections', collections);
    return collection;
  }

  deleteResourceCollection(collectionId) {
    const collections = this._getFromStorage('resource_collections', []);
    const items = this._getFromStorage('resource_items', []);

    const index = collections.findIndex((c) => c.id === collectionId);
    if (index === -1) return false;
    collections.splice(index, 1);

    const remainingItems = items.filter((ri) => ri.collection_id !== collectionId);

    this._saveToStorage('resource_collections', collections);
    this._saveToStorage('resource_items', remainingItems);

    return true;
  }

  listResourceItemsForCollection(collectionId) {
    const items = this._getFromStorage('resource_items', []);
    const documents = this._getFromStorage('documents', []);
    const articles = this._getFromStorage('resource_articles', []);

    const result = items
      .filter((ri) => ri.collection_id === collectionId)
      .map((ri) => {
        let document = null;
        let article = null;
        if (ri.resource_type === 'document') {
          document = documents.find((d) => d.id === ri.resource_id) || null;
        } else if (ri.resource_type === 'article') {
          article = articles.find((a) => a.id === ri.resource_id) || null;
        }
        return {
          resourceItem: ri,
          document,
          article
        };
      });

    return result;
  }

  saveDocumentToResources(documentId, collectionId, newCollectionName) {
    const documents = this._getFromStorage('documents', []);
    const doc = documents.find((d) => d.id === documentId) || null;
    if (!doc) return null;

    let collection = null;
    if (collectionId) {
      const collections = this._getFromStorage('resource_collections', []);
      collection = collections.find((c) => c.id === collectionId) || null;
    }

    if (!collection) {
      const name = newCollectionName || 'PLC Manuals';
      collection = this._getOrCreateDefaultResourceCollection(name, 'document_folder');
    }

    const items = this._getFromStorage('resource_items', []);
    const resourceItem = {
      id: this._generateId('resource_item'),
      collection_id: collection.id,
      resource_type: 'document',
      resource_id: documentId,
      added_at: this._nowIso()
    };

    items.push(resourceItem);
    this._saveToStorage('resource_items', items);

    return resourceItem;
  }

  getResourceArticleFilterOptions() {
    const industries = [
      'food_beverage',
      'robotic_systems',
      'hvac',
      'oil_gas',
      'chemical',
      'automotive',
      'general_industry',
      'other_industry'
    ];
    const regions = [
      'north_america',
      'europe',
      'asia_pacific',
      'latin_america',
      'middle_east_africa',
      'other_region'
    ];
    const sortOptions = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'most_relevant', label: 'Most Relevant' }
    ];
    return {
      industries,
      regions,
      sortOptions
    };
  }

  listResourceArticles(articleType, filters, sortBy, page = 1, pageSize = 20) {
    filters = filters || {};
    let articles = this._getFromStorage('resource_articles', []);

    if (articleType) {
      articles = articles.filter((a) => a.article_type === articleType);
    }

    if (filters.industry) {
      articles = articles.filter((a) => a.industry === filters.industry);
    }

    if (filters.region) {
      articles = articles.filter((a) => a.region === filters.region);
    }

    if (filters.minEnergySavingsPercent != null) {
      articles = articles.filter(
        (a) =>
          typeof a.energy_savings_percent === 'number' &&
          a.energy_savings_percent >= filters.minEnergySavingsPercent
      );
    }

    const sortKey = sortBy || 'newest_first';
    if (sortKey === 'newest_first') {
      articles.sort((a, b) => {
        const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return db - da;
      });
    } else if (sortKey === 'most_relevant') {
      articles.sort((a, b) => {
        const ea = typeof a.energy_savings_percent === 'number' ? a.energy_savings_percent : 0;
        const eb = typeof b.energy_savings_percent === 'number' ? b.energy_savings_percent : 0;
        return eb - ea;
      });
    }

    const totalCount = articles.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageArticles = articles.slice(start, end);

    return {
      articles: pageArticles,
      page,
      pageSize,
      totalCount
    };
  }

  getResourceArticleDetails(articleId) {
    const articles = this._getFromStorage('resource_articles', []);
    return articles.find((a) => a.id === articleId) || null;
  }

  saveArticleToReadingList(articleId, collectionId, newCollectionName) {
    const articles = this._getFromStorage('resource_articles', []);
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) return null;

    let collection = null;
    if (collectionId) {
      const collections = this._getFromStorage('resource_collections', []);
      collection = collections.find((c) => c.id === collectionId) || null;
    }

    if (!collection) {
      const name = newCollectionName || 'Energy Savings';
      collection = this._getOrCreateDefaultResourceCollection(name, 'reading_list');
    }

    const items = this._getFromStorage('resource_items', []);
    const resourceItem = {
      id: this._generateId('resource_item'),
      collection_id: collection.id,
      resource_type: 'article',
      resource_id: articleId,
      added_at: this._nowIso()
    };

    items.push(resourceItem);
    this._saveToStorage('resource_items', items);
    return resourceItem;
  }

  // =====================================================================
  // Distributors & Distributor Quote Requests
  // =====================================================================

  searchDistributors(city, country, radiusKm, sortBy) {
    const distributors = this._getFromStorage('distributors', []);
    const lcCity = (city || '').toLowerCase();
    const lcCountry = (country || '').toLowerCase();

    // Filter to same country if provided
    const inCountry = distributors.filter((d) => {
      const dCountry = (d.country || '').toLowerCase();
      return !lcCountry || dCountry === lcCountry;
    });

    // Determine reference point: first distributor in requested city (and country)
    let center = null;
    if (lcCity) {
      center =
        inCountry.find((d) => (d.city || '').toLowerCase() === lcCity) || null;
    }
    if (!center) {
      center = inCountry[0] || null;
    }

    const toRad = (deg) => (deg * Math.PI) / 180;
    const haversineKm = (a, b) => {
      if (
        !a ||
        !b ||
        typeof a.latitude !== 'number' ||
        typeof a.longitude !== 'number' ||
        typeof b.latitude !== 'number' ||
        typeof b.longitude !== 'number'
      ) {
        return Infinity;
      }
      const R = 6371; // Earth radius in km
      const dLat = toRad(b.latitude - a.latitude);
      const dLon = toRad(b.longitude - a.longitude);
      const lat1 = toRad(a.latitude);
      const lat2 = toRad(b.latitude);
      const sinDLat = Math.sin(dLat / 2);
      const sinDLon = Math.sin(dLon / 2);
      const aVal =
        sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
      const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
      return R * c;
    };

    let results = inCountry.map((d) => {
      const distanceKm = center ? haversineKm(center, d) : 0;
      return {
        distributor: d,
        distanceKm
      };
    });

    if (typeof radiusKm === 'number' && !isNaN(radiusKm)) {
      results = results.filter((r) => r.distanceKm <= radiusKm);
    }

    if (sortBy === 'distance_nearest_first') {
      results.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return results;
  }

  getDistributorDetails(distributorId) {
    const distributors = this._getFromStorage('distributors', []);
    return distributors.find((d) => d.id === distributorId) || null;
  }

  createDistributorQuoteRequest(distributorId, productInterest, budgetRange, message, contactName, contactEmail) {
    const distributors = this._getFromStorage('distributors', []);
    const requests = this._getFromStorage('distributor_quote_requests', []);

    const distributor = distributors.find((d) => d.id === distributorId) || null;

    const request = {
      id: this._generateId('distributor_quote_request'),
      distributor_id: distributorId,
      distributor_name: distributor ? distributor.name : null,
      product_interest: productInterest,
      budget_range: budgetRange || null,
      message: message || null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      created_at: this._nowIso(),
      status: 'submitted'
    };

    requests.push(request);
    this._saveToStorage('distributor_quote_requests', requests);

    return request;
  }

  // =====================================================================
  // About & Contact
  // =====================================================================

  getAboutContent() {
    const stored = this._getFromStorage('about_content', null);
    const base = {
      mission: '',
      industriesServed: [],
      coreCompetencies: [],
      certifications: [],
      geographicCoverage: ''
    };
    if (stored && typeof stored === 'object') {
      return Object.assign(base, stored);
    }
    return base;
  }

  getContactInfo() {
    const stored = this._getFromStorage('contact_info', null);
    const base = {
      headquartersAddress: '',
      phoneNumbers: [],
      primaryEmail: ''
    };
    if (stored && typeof stored === 'object') {
      return Object.assign(base, stored);
    }
    return base;
  }

  createContactInquiry(name, email, message) {
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const inquiry = {
      id: this._generateId('contact_inquiry'),
      name: name,
      email: email,
      message: message,
      created_at: this._nowIso(),
      status: 'submitted'
    };
    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      confirmationMessage: 'Inquiry submitted. Reference ID: ' + inquiry.id
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
