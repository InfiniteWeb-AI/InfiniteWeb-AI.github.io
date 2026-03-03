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
  }

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    // Entity tables (arrays)
    const arrayKeys = [
      'categories',
      'products',
      'vehicles',
      'vehicle_product_fitments',
      'selected_vehicles',
      'cart',
      'cart_items',
      'wishlist',
      'wishlist_items',
      'compare_sessions',
      'protection_plans',
      'shipping_methods',
      'checkout_sessions',
      'faq_entries',
      'contact_forms'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Object-like tables
    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem('contact_info', JSON.stringify({}));
    }
    if (!localStorage.getItem('page_content')) {
      localStorage.setItem('page_content', JSON.stringify({}));
    }

    // Legacy/sample keys from scaffold (not used, but keep initialized)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
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

  // -------------------------
  // Foreign key augmentation helpers
  // -------------------------

  _buildCategoryMap() {
    const categories = this._getFromStorage('categories');
    const map = {};
    categories.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }

  _augmentCategory(category) {
    if (!category) return null;
    const categories = this._getFromStorage('categories');
    const parent = category.parentCategoryId
      ? categories.find((c) => c.id === category.parentCategoryId) || null
      : null;
    return {
      ...category,
      parentCategory: parent || null
    };
  }

  _augmentProduct(product, categoryMap) {
    if (!product) return null;
    const categories = categoryMap || this._buildCategoryMap();
    const category = product.categoryId ? categories[product.categoryId] || null : null;
    return {
      ...product,
      category: category ? this._augmentCategory(category) : null
    };
  }

  // -------------------------
  // Category hierarchy helpers
  // -------------------------

  _getCategoryByCode(categoryCode) {
    const categories = this._getFromStorage('categories');
    return categories.find((c) => c.code === categoryCode) || null;
  }

  _getCategoryAndDescendants(categoryCode) {
    const categories = this._getFromStorage('categories');
    const root = categories.find((c) => c.code === categoryCode);
    if (!root) return [];

    const resultIds = new Set();
    const queue = [root.id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!resultIds.has(currentId)) {
        resultIds.add(currentId);
        categories.forEach((c) => {
          if (c.parentCategoryId === currentId) {
            queue.push(c.id);
          }
        });
      }
    }

    return Array.from(resultIds);
  }

  // -------------------------
  // Vehicle selection & fitment helpers
  // -------------------------

  _getSelectedVehicleContext() {
    const selectedVehicles = this._getFromStorage('selected_vehicles');
    if (!selectedVehicles || selectedVehicles.length === 0) {
      return {
        hasSelectedVehicle: false,
        selectedVehicle: null,
        vehicle: null,
        fitments: [],
        exactFitProductIds: new Set(),
        partialFitProductIds: new Set()
      };
    }

    // For single-user site, assume first record is the active one
    const selectedVehicle = selectedVehicles[0];
    const vehicles = this._getFromStorage('vehicles');
    const vehicle = vehicles.find((v) => v.id === selectedVehicle.vehicleId) || null;

    const allFitments = this._getFromStorage('vehicle_product_fitments');
    const fitments = vehicle
      ? allFitments.filter((f) => f.vehicleId === vehicle.id)
      : [];

    const exactFitProductIds = new Set();
    const partialFitProductIds = new Set();

    fitments.forEach((f) => {
      if (f.fitmentType === 'exact_fit') {
        exactFitProductIds.add(f.productId);
      } else if (f.fitmentType === 'partial_fit') {
        partialFitProductIds.add(f.productId);
      }
    });

    return {
      hasSelectedVehicle: !!vehicle,
      selectedVehicle,
      vehicle,
      fitments,
      exactFitProductIds,
      partialFitProductIds
    };
  }

  _applyVehicleFitmentFilter(products, fitmentScope) {
    const scope = fitmentScope || 'none';
    if (scope === 'none') return products.slice();

    const ctx = this._getSelectedVehicleContext();
    if (!ctx.hasSelectedVehicle) {
      // When a fitment scope is requested but no vehicle is selected, return no products
      return [];
    }

    const allowedIds = new Set();

    if (scope === 'selected_vehicle_exact_fit') {
      ctx.exactFitProductIds.forEach((id) => allowedIds.add(id));
    } else if (scope === 'selected_vehicle_partial_or_better') {
      ctx.exactFitProductIds.forEach((id) => allowedIds.add(id));
      ctx.partialFitProductIds.forEach((id) => allowedIds.add(id));
    }

    return products.filter((p) => allowedIds.has(p.id));
  }

  // -------------------------
  // Cart helpers
  // -------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.status === 'open');

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        itemsCount: 0,
        subtotal: 0,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _recalculateCartTotals(cartId) {
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');

    const cart = carts.find((c) => c.id === cartId);
    if (!cart) {
      return;
    }

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cartId);
    let subtotal = 0;
    let itemsCount = 0;

    itemsForCart.forEach((item) => {
      const qty = typeof item.quantity === 'number' ? item.quantity : 0;
      const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      item.lineSubtotal = unitPrice * qty;
      subtotal += item.lineSubtotal;
      itemsCount += qty;
    });

    cart.subtotal = subtotal;
    cart.itemsCount = itemsCount;
    cart.updatedAt = this._now();

    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cartItems);
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlist');
    let wishlist = wishlists[0];

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        createdAt: this._now(),
        updatedAt: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlist', wishlists);
    }

    return wishlist;
  }

  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions');

    let session = sessions.find(
      (s) => s.cartId === cart.id && s.status === 'in_progress'
    );

    if (!session) {
      session = {
        id: this._generateId('checkout'),
        cartId: cart.id,
        contactEmail: null,
        contactFullName: null,
        shippingMethodId: null,
        status: 'in_progress',
        createdAt: this._now(),
        updatedAt: this._now()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }

    return session;
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // getMainCategories(): Category[]
  getMainCategories() {
    const categories = this._getFromStorage('categories');
    if (!categories.length) return [];

    const carAudio = categories.find((c) => c.code === 'car_audio') || null;
    let mainCategories;

    if (carAudio) {
      mainCategories = categories.filter((c) => c.parentCategoryId === carAudio.id);
    } else {
      mainCategories = categories.filter((c) => !c.parentCategoryId);
    }

    mainCategories.sort((a, b) => {
      const ao = typeof a.displayOrder === 'number' ? a.displayOrder : 0;
      const bo = typeof b.displayOrder === 'number' ? b.displayOrder : 0;
      if (ao !== bo) return ao - bo;
      return (a.name || '').localeCompare(b.name || '');
    });

    return mainCategories.map((cat) => this._augmentCategory(cat));
  }

  // getHomepageFeaturedProducts(segment?, limit?): Product[]
  getHomepageFeaturedProducts(segment, limit) {
    const seg = segment || 'deals';
    const lim = typeof limit === 'number' && limit > 0 ? limit : 8;

    const categoryMap = this._buildCategoryMap();
    let products = this._getFromStorage('products').filter((p) => p.isActive !== false);

    if (seg === 'bestsellers') {
      products.sort((a, b) => {
        const ar = a.ratingCount || 0;
        const br = b.ratingCount || 0;
        if (br !== ar) return br - ar;
        return (b.ratingAverage || 0) - (a.ratingAverage || 0);
      });
    } else if (seg === 'premium_highlights') {
      products.sort((a, b) => {
        const ap = a.price || 0;
        const bp = b.price || 0;
        if (bp !== ap) return bp - ap;
        return (b.ratingAverage || 0) - (a.ratingAverage || 0);
      });
    } else {
      // 'deals' or default: lowest price first
      products.sort((a, b) => {
        const ap = a.price || 0;
        const bp = b.price || 0;
        if (ap !== bp) return ap - bp;
        return (b.ratingAverage || 0) - (a.ratingAverage || 0);
      });
    }

    return products.slice(0, lim).map((p) => this._augmentProduct(p, categoryMap));
  }

  // Vehicle selector interfaces

  getVehicleYears() {
    const vehicles = this._getFromStorage('vehicles');
    const yearsSet = new Set();
    vehicles.forEach((v) => {
      if (typeof v.year === 'number') yearsSet.add(v.year);
    });
    const years = Array.from(yearsSet.values());
    years.sort((a, b) => b - a);
    return years.map((year) => ({ year }));
  }

  getVehicleMakes(year) {
    const vehicles = this._getFromStorage('vehicles');
    const makesSet = new Set();
    vehicles.forEach((v) => {
      if (v.year === year && v.make) makesSet.add(v.make);
    });
    const makes = Array.from(makesSet.values());
    makes.sort((a, b) => a.localeCompare(b));
    return makes.map((make) => ({ make }));
  }

  getVehicleModels(year, make) {
    const vehicles = this._getFromStorage('vehicles');
    const modelsSet = new Set();
    vehicles.forEach((v) => {
      if (v.year === year && v.make === make && v.model) modelsSet.add(v.model);
    });
    const models = Array.from(modelsSet.values());
    models.sort((a, b) => a.localeCompare(b));
    return models.map((model) => ({ model }));
  }

  getVehicleBodyStyles(year, make, model) {
    const vehicles = this._getFromStorage('vehicles');
    const bodyStylesSet = new Map();

    vehicles.forEach((v) => {
      if (v.year === year && v.make === make && v.model === model && v.bodyStyle) {
        if (!bodyStylesSet.has(v.bodyStyle)) {
          const label = v.bodyStyle.charAt(0).toUpperCase() + v.bodyStyle.slice(1);
          bodyStylesSet.set(v.bodyStyle, label);
        }
      }
    });

    const result = [];
    bodyStylesSet.forEach((label, code) => {
      result.push({ bodyStyleCode: code, bodyStyleLabel: label });
    });
    return result;
  }

  setSelectedVehicle(year, make, model, bodyStyle) {
    const vehicles = this._getFromStorage('vehicles');
    const vehicle = vehicles.find(
      (v) =>
        v.year === year &&
        v.make === make &&
        v.model === model &&
        v.bodyStyle === bodyStyle
    );

    if (!vehicle) {
      return {
        success: false,
        vehicle: null,
        message: 'Vehicle not found'
      };
    }

    let selectedVehicles = this._getFromStorage('selected_vehicles');

    if (!selectedVehicles.length) {
      selectedVehicles.push({
        id: this._generateId('selveh'),
        vehicleId: vehicle.id,
        createdAt: this._now(),
        updatedAt: this._now()
      });
    } else {
      selectedVehicles[0].vehicleId = vehicle.id;
      selectedVehicles[0].updatedAt = this._now();
    }

    this._saveToStorage('selected_vehicles', selectedVehicles);

    return {
      success: true,
      vehicle,
      message: 'Selected vehicle updated'
    };
  }

  getSelectedVehicle() {
    const ctx = this._getSelectedVehicleContext();
    return {
      hasSelectedVehicle: ctx.hasSelectedVehicle,
      vehicle: ctx.vehicle
    };
  }

  getVehicleFitmentOverview() {
    const ctx = this._getSelectedVehicleContext();
    const vehicle = ctx.vehicle;

    if (!vehicle) {
      return {
        vehicle: null,
        categories: [],
        recommendedProducts: []
      };
    }

    const products = this._getFromStorage('products');
    const fitProductIds = new Set();

    ctx.fitments.forEach((f) => {
      if (f.fitmentType === 'exact_fit' || f.fitmentType === 'partial_fit') {
        fitProductIds.add(f.productId);
      }
    });

    const categoryMap = this._buildCategoryMap();
    const categoriesByCode = {};
    const compatibleProducts = [];

    products.forEach((p) => {
      if (!fitProductIds.has(p.id)) return;
      compatibleProducts.push(p);
      const category = p.categoryId ? categoryMap[p.categoryId] : null;
      if (!category) return;
      const code = category.code;
      if (!categoriesByCode[code]) {
        categoriesByCode[code] = {
          categoryCode: code,
          categoryName: category.name,
          productCount: 0
        };
      }
      categoriesByCode[code].productCount += 1;
    });

    // Recommended products: choose a few highest-rated compatible ones
    compatibleProducts.sort((a, b) => {
      const ar = a.ratingAverage || 0;
      const br = b.ratingAverage || 0;
      if (br !== ar) return br - ar;
      const ac = a.ratingCount || 0;
      const bc = b.ratingCount || 0;
      return bc - ac;
    });

    const recommendedProducts = compatibleProducts
      .slice(0, 8)
      .map((p) => this._augmentProduct(p, categoryMap));

    return {
      vehicle,
      categories: Object.values(categoriesByCode),
      recommendedProducts
    };
  }

  // Category info

  getCategoryDetails(categoryCode) {
    const category = this._getCategoryByCode(categoryCode);
    return this._augmentCategory(category);
  }

  getCategoryBreadcrumbs(categoryCode) {
    const categories = this._getFromStorage('categories');
    const target = categories.find((c) => c.code === categoryCode);
    const breadcrumbs = [{ label: 'Home', categoryCode: '' }];

    if (!target) {
      return breadcrumbs;
    }

    const path = [];
    let current = target;
    while (current) {
      path.unshift(current);
      current = current.parentCategoryId
        ? categories.find((c) => c.id === current.parentCategoryId) || null
        : null;
    }

    path.forEach((cat) => {
      breadcrumbs.push({ label: cat.name, categoryCode: cat.code });
    });

    return breadcrumbs;
  }

  getCategoryFilterOptions(categoryCode) {
    const categoryIds = this._getCategoryAndDescendants(categoryCode);
    const products = this._getFromStorage('products').filter((p) =>
      categoryIds.includes(p.categoryId)
    );

    let minPrice = null;
    let maxPrice = null;
    const ratingOptionsBase = [3, 4, 4.5];

    let hasAppleCarPlayAvailable = false;
    let hasBluetoothAvailable = false;
    let hasBackupCameraInputAvailable = false;
    let freeShippingAvailable = false;
    let includesWiringKitAvailable = false;

    const dinSizesSet = new Set();
    const speakerSizesSet = new Set();
    const speakerTypesSet = new Set();
    const rmsValues = [];
    const channelCountsSet = new Set();
    const accessoryTypesSet = new Set();
    const bundleTypesSet = new Set();

    products.forEach((p) => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }

      if (p.hasAppleCarPlay) hasAppleCarPlayAvailable = true;
      if (p.hasBluetooth) hasBluetoothAvailable = true;
      if (p.hasBackupCameraInput) hasBackupCameraInputAvailable = true;
      if (p.freeShippingEligible) freeShippingAvailable = true;
      if (p.includesWiringKit) includesWiringKitAvailable = true;

      if (p.dinSize) dinSizesSet.add(p.dinSize);
      if (typeof p.speakerSizeInches === 'number') speakerSizesSet.add(p.speakerSizeInches);
      if (p.speakerType) speakerTypesSet.add(p.speakerType);
      if (typeof p.rmsPower === 'number') rmsValues.push(p.rmsPower);
      if (typeof p.channelCount === 'number') channelCountsSet.add(p.channelCount);
      if (p.accessoryType) accessoryTypesSet.add(p.accessoryType);
      if (p.bundleType) bundleTypesSet.add(p.bundleType);
    });

    let rmsPowerRanges = [];
    if (rmsValues.length) {
      let minR = rmsValues[0];
      let maxR = rmsValues[0];
      rmsValues.forEach((v) => {
        if (v < minR) minR = v;
        if (v > maxR) maxR = v;
      });
      rmsPowerRanges.push({ min: minR, max: maxR });
    }

    return {
      price: {
        min: minPrice || 0,
        max: maxPrice || 0,
        step: 1
      },
      ratingOptions: ratingOptionsBase,
      featureFilters: {
        hasAppleCarPlayAvailable,
        hasBluetoothAvailable,
        hasBackupCameraInputAvailable,
        freeShippingAvailable,
        includesWiringKitAvailable
      },
      dinSizes: Array.from(dinSizesSet.values()),
      speakerSizesInches: Array.from(speakerSizesSet.values()),
      speakerTypes: Array.from(speakerTypesSet.values()),
      rmsPowerRanges,
      channelCounts: Array.from(channelCountsSet.values()),
      accessoryTypes: Array.from(accessoryTypesSet.values()),
      bundleTypes: Array.from(bundleTypesSet.values())
    };
  }

  // Shared filtering & sorting helpers for products

  _applyProductFilters(baseProducts, filters) {
    const f = filters || {};
    return baseProducts.filter((p) => {
      if (f.onlyActive && p.isActive === false) return false;
      if (typeof f.minPrice === 'number' && (p.price || 0) < f.minPrice) return false;
      if (typeof f.maxPrice === 'number' && (p.price || 0) > f.maxPrice) return false;
      if (typeof f.minRating === 'number' && (p.ratingAverage || 0) < f.minRating) return false;

      if (typeof f.hasAppleCarPlay === 'boolean') {
        if (!!p.hasAppleCarPlay !== f.hasAppleCarPlay) return false;
      }
      if (typeof f.hasBluetooth === 'boolean') {
        if (!!p.hasBluetooth !== f.hasBluetooth) return false;
      }
      if (typeof f.hasBackupCameraInput === 'boolean') {
        if (!!p.hasBackupCameraInput !== f.hasBackupCameraInput) return false;
      }
      if (f.freeShippingOnly && !p.freeShippingEligible) return false;
      if (typeof f.includesWiringKit === 'boolean') {
        if (!!p.includesWiringKit !== f.includesWiringKit) return false;
      }
      if (f.dinSize && p.dinSize !== f.dinSize) return false;
      if (
        typeof f.speakerSizeInches === 'number' &&
        p.speakerSizeInches !== f.speakerSizeInches
      )
        return false;
      if (f.speakerType && p.speakerType !== f.speakerType) return false;
      if (typeof f.minRmsPower === 'number' && (p.rmsPower || 0) < f.minRmsPower)
        return false;
      if (typeof f.maxRmsPower === 'number' && (p.rmsPower || 0) > f.maxRmsPower)
        return false;
      if (typeof f.channelCount === 'number' && p.channelCount !== f.channelCount)
        return false;
      if (f.productType && p.productType !== f.productType) return false;
      if (f.accessoryType && p.accessoryType !== f.accessoryType) return false;
      if (typeof f.isBundle === 'boolean') {
        if (!!p.isBundle !== f.isBundle) return false;
      }
      if (f.bundleType && p.bundleType !== f.bundleType) return false;

      return true;
    });
  }

  _applyProductSorting(products, sortBy) {
    const sb = sortBy || 'relevance';
    const arr = products.slice();

    if (sb === 'price_low_to_high') {
      arr.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sb === 'price_high_to_low') {
      arr.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sb === 'most_reviewed') {
      arr.sort((a, b) => {
        const ac = a.ratingCount || 0;
        const bc = b.ratingCount || 0;
        if (bc !== ac) return bc - ac;
        return (b.ratingAverage || 0) - (a.ratingAverage || 0);
      });
    } else if (sb === 'top_rated') {
      arr.sort((a, b) => {
        const ar = a.ratingAverage || 0;
        const br = b.ratingAverage || 0;
        if (br !== ar) return br - ar;
        return (b.ratingCount || 0) - (a.ratingCount || 0);
      });
    }

    // 'relevance' keeps original order
    return arr;
  }

  // listCategoryProducts(categoryCode, filters?, fitmentScope?, sortBy?, page?, pageSize?)
  listCategoryProducts(
    categoryCode,
    filters,
    fitmentScope,
    sortBy,
    page,
    pageSize
  ) {
    const categoryIds = this._getCategoryAndDescendants(categoryCode);
    const allProducts = this._getFromStorage('products');
    const categoryFiltered = allProducts.filter((p) => categoryIds.includes(p.categoryId));

    let filtered = this._applyProductFilters(categoryFiltered, filters);
    filtered = this._applyVehicleFitmentFilter(filtered, fitmentScope);
    const sorted = this._applyProductSorting(filtered, sortBy);

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const totalItems = sorted.length;
    const totalPages = Math.ceil(totalItems / ps) || 1;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageItems = sorted.slice(start, end);

    const categoryMap = this._buildCategoryMap();

    const items = pageItems.map((p) => {
      const category = p.categoryId ? categoryMap[p.categoryId] || null : null;
      return {
        product: this._augmentProduct(p, categoryMap),
        categoryName: category ? category.name : ''
      };
    });

    return {
      items,
      pagination: {
        page: pg,
        pageSize: ps,
        totalItems,
        totalPages
      }
    };
  }

  // Search interfaces

  getSearchFilterOptions(query) {
    const q = (query || '').toLowerCase();
    const allProducts = this._getFromStorage('products');

    const matched = allProducts.filter((p) => {
      const haystack = [p.name, p.description, p.sku]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    let minPrice = null;
    let maxPrice = null;
    const ratingOptionsBase = [3, 4, 4.5];

    let hasAppleCarPlayAvailable = false;
    let hasBluetoothAvailable = false;
    let hasBackupCameraInputAvailable = false;
    let freeShippingAvailable = false;
    let includesWiringKitAvailable = false;

    const rmsValues = [];
    const channelCountsSet = new Set();

    matched.forEach((p) => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }

      if (p.hasAppleCarPlay) hasAppleCarPlayAvailable = true;
      if (p.hasBluetooth) hasBluetoothAvailable = true;
      if (p.hasBackupCameraInput) hasBackupCameraInputAvailable = true;
      if (p.freeShippingEligible) freeShippingAvailable = true;
      if (p.includesWiringKit) includesWiringKitAvailable = true;

      if (typeof p.rmsPower === 'number') rmsValues.push(p.rmsPower);
      if (typeof p.channelCount === 'number') channelCountsSet.add(p.channelCount);
    });

    let rmsPowerRanges = [];
    if (rmsValues.length) {
      let minR = rmsValues[0];
      let maxR = rmsValues[0];
      rmsValues.forEach((v) => {
        if (v < minR) minR = v;
        if (v > maxR) maxR = v;
      });
      rmsPowerRanges.push({ min: minR, max: maxR });
    }

    return {
      price: {
        min: minPrice || 0,
        max: maxPrice || 0,
        step: 1
      },
      ratingOptions: ratingOptionsBase,
      featureFilters: {
        hasAppleCarPlayAvailable,
        hasBluetoothAvailable,
        hasBackupCameraInputAvailable,
        freeShippingAvailable,
        includesWiringKitAvailable
      },
      rmsPowerRanges,
      channelCounts: Array.from(channelCountsSet.values())
    };
  }

  searchProducts(query, filters, fitmentScope, sortBy, page, pageSize) {
    const q = (query || '').toLowerCase();
    const allProducts = this._getFromStorage('products');

    const matchedByText = allProducts.filter((p) => {
      const haystack = [p.name, p.description, p.sku]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    let filtered = this._applyProductFilters(matchedByText, filters);
    filtered = this._applyVehicleFitmentFilter(filtered, fitmentScope);
    const sorted = this._applyProductSorting(filtered, sortBy);

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const totalItems = sorted.length;
    const totalPages = Math.ceil(totalItems / ps) || 1;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageItems = sorted.slice(start, end);

    const categoryMap = this._buildCategoryMap();

    const items = pageItems.map((p) => {
      const category = p.categoryId ? categoryMap[p.categoryId] || null : null;
      return {
        product: this._augmentProduct(p, categoryMap),
        categoryName: category ? category.name : ''
      };
    });

    return {
      items,
      pagination: {
        page: pg,
        pageSize: ps,
        totalItems,
        totalPages
      }
    };
  }

  // Product details

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const productRaw = products.find((p) => p.id === productId) || null;
    const categoryMap = this._buildCategoryMap();
    const product = this._augmentProduct(productRaw, categoryMap);
    const category = product && product.category ? product.category : null;

    const ctx = this._getSelectedVehicleContext();
    let fitmentStatus = 'not_applicable';
    let fitmentNotes = '';

    if (ctx.hasSelectedVehicle && product) {
      const fitments = ctx.fitments.filter((f) => f.productId === product.id);
      if (!fitments.length) {
        fitmentStatus = 'no_fit_for_selected_vehicle';
      } else {
        const exact = fitments.find((f) => f.fitmentType === 'exact_fit');
        const partial = fitments.find((f) => f.fitmentType === 'partial_fit');
        const notRec = fitments.find((f) => f.fitmentType === 'not_recommended');

        if (exact) {
          fitmentStatus = 'exact_fit_for_selected_vehicle';
          fitmentNotes = exact.notes || '';
        } else if (partial) {
          fitmentStatus = 'partial_fit_for_selected_vehicle';
          fitmentNotes = partial.notes || '';
        } else if (notRec) {
          fitmentStatus = 'no_fit_for_selected_vehicle';
          fitmentNotes = notRec.notes || '';
        }
      }
    }

    const averageRating = product ? product.ratingAverage || 0 : 0;
    const ratingCount = product ? product.ratingCount || 0 : 0;

    const specs = product
      ? {
          dinSize: product.dinSize || null,
          rmsPower: typeof product.rmsPower === 'number' ? product.rmsPower : null,
          channelCount:
            typeof product.channelCount === 'number' ? product.channelCount : null,
          hasAppleCarPlay: !!product.hasAppleCarPlay,
          hasBluetooth: !!product.hasBluetooth,
          hasBackupCameraInput: !!product.hasBackupCameraInput,
          speakerSizeInches:
            typeof product.speakerSizeInches === 'number'
              ? product.speakerSizeInches
              : null,
          speakerType: product.speakerType || null
        }
      : {
          dinSize: null,
          rmsPower: null,
          channelCount: null,
          hasAppleCarPlay: false,
          hasBluetooth: false,
          hasBackupCameraInput: false,
          speakerSizeInches: null,
          speakerType: null
        };

    return {
      product,
      category,
      fitmentStatus,
      fitmentNotes,
      averageRating,
      ratingCount,
      specs
    };
  }

  getProductBreadcrumbs(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    const product = products.find((p) => p.id === productId);
    const breadcrumbs = [{ label: 'Home', categoryCode: '' }];

    if (!product) {
      return breadcrumbs;
    }

    const category = categories.find((c) => c.id === product.categoryId) || null;
    if (!category) {
      return breadcrumbs;
    }

    const path = [];
    let current = category;
    while (current) {
      path.unshift(current);
      current = current.parentCategoryId
        ? categories.find((c) => c.id === current.parentCategoryId) || null
        : null;
    }

    path.forEach((cat) => {
      breadcrumbs.push({ label: cat.name, categoryCode: cat.code });
    });

    return breadcrumbs;
  }

  getProductProtectionPlans(productId) {
    const products = this._getFromStorage('products');
    const prod = products.find((p) => p.id === productId);
    if (!prod) return [];

    const plans = this._getFromStorage('protection_plans');
    return plans.filter((plan) => {
      if (plan.status !== 'active') return false;
      if (plan.applicableProductType === 'any_product_type') return true;
      return plan.applicableProductType === prod.productType;
    });
  }

  getRelatedProducts(productId) {
    const products = this._getFromStorage('products');
    const categoryMap = this._buildCategoryMap();
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return { relatedProducts: [], relatedBundles: [] };
    }

    const relatedProducts = products
      .filter((p) => p.id !== productId && p.categoryId === product.categoryId)
      .slice(0, 10)
      .map((p) => this._augmentProduct(p, categoryMap));

    const relatedBundles = products
      .filter((p) => p.isBundle)
      .slice(0, 10)
      .map((p) => this._augmentProduct(p, categoryMap));

    return {
      relatedProducts,
      relatedBundles
    };
  }

  // Compare interfaces

  createCompareSession(productIds) {
    const ids = Array.isArray(productIds) ? productIds : [];
    const sessions = this._getFromStorage('compare_sessions');

    const compareSession = {
      id: this._generateId('compare'),
      productIds: ids.slice(),
      createdAt: this._now()
    };

    sessions.push(compareSession);
    this._saveToStorage('compare_sessions', sessions);

    const products = this._getFromStorage('products');
    const categoryMap = this._buildCategoryMap();
    const productsResolved = ids
      .map((id) => products.find((p) => p.id === id) || null)
      .filter(Boolean)
      .map((p) => this._augmentProduct(p, categoryMap));

    return {
      compareSession,
      products: productsResolved
    };
  }

  getCompareSessionDetails(compareSessionId) {
    const sessions = this._getFromStorage('compare_sessions');
    const products = this._getFromStorage('products');
    const categoryMap = this._buildCategoryMap();

    const compareSession =
      sessions.find((s) => s.id === compareSessionId) || null;

    if (!compareSession) {
      return {
        compareSession: null,
        items: []
      };
    }

    const items = compareSession.productIds.map((pid) => {
      const productRaw = products.find((p) => p.id === pid) || null;
      const product = this._augmentProduct(productRaw, categoryMap);
      const specs = product
        ? {
            rmsPower:
              typeof product.rmsPower === 'number' ? product.rmsPower : null,
            speakerSizeInches:
              typeof product.speakerSizeInches === 'number'
                ? product.speakerSizeInches
                : null,
            speakerType: product.speakerType || null,
            dinSize: product.dinSize || null,
            channelCount:
              typeof product.channelCount === 'number' ? product.channelCount : null,
            hasAppleCarPlay: !!product.hasAppleCarPlay,
            hasBluetooth: !!product.hasBluetooth,
            hasBackupCameraInput: !!product.hasBackupCameraInput
          }
        : {
            rmsPower: null,
            speakerSizeInches: null,
            speakerType: null,
            dinSize: null,
            channelCount: null,
            hasAppleCarPlay: false,
            hasBluetooth: false,
            hasBackupCameraInput: false
          };

      return {
        product,
        specs
      };
    });

    return {
      compareSession,
      items
    };
  }

  updateCompareSessionProducts(compareSessionId, productIds) {
    const sessions = this._getFromStorage('compare_sessions');
    const products = this._getFromStorage('products');
    const categoryMap = this._buildCategoryMap();

    const sessionIndex = sessions.findIndex((s) => s.id === compareSessionId);
    if (sessionIndex === -1) {
      // If session not found, create a new one with this ID
      const compareSession = {
        id: compareSessionId,
        productIds: Array.isArray(productIds) ? productIds.slice() : [],
        createdAt: this._now()
      };
      sessions.push(compareSession);
      this._saveToStorage('compare_sessions', sessions);

      const items = compareSession.productIds.map((pid) => {
        const product = products.find((p) => p.id === pid) || null;
        return { product: this._augmentProduct(product, categoryMap) };
      });

      return {
        compareSession,
        items
      };
    }

    const compareSession = sessions[sessionIndex];
    compareSession.productIds = Array.isArray(productIds) ? productIds.slice() : [];

    this._saveToStorage('compare_sessions', sessions);

    const items = compareSession.productIds.map((pid) => {
      const product = products.find((p) => p.id === pid) || null;
      return { product: this._augmentProduct(product, categoryMap) };
    });

    return {
      compareSession,
      items
    };
  }

  // Cart interfaces

  addToCart(productId, quantity, protectionPlanId) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        cart: null,
        addedItem: null,
        message: 'Product not found'
      };
    }

    let selectedPlanId = protectionPlanId || null;
    if (selectedPlanId) {
      const plans = this._getFromStorage('protection_plans');
      const plan = plans.find((pl) => pl.id === selectedPlanId);
      if (!plan) {
        // Invalid plan id, ignore
        selectedPlanId = null;
      }
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    // Merge with existing line for same product + protection plan
    let cartItem = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.productId === productId && ci.protectionPlanId === selectedPlanId
    );

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.lineSubtotal = cartItem.unitPrice * cartItem.quantity;
      cartItem.addedAt = this._now();
    } else {
      cartItem = {
        id: this._generateId('cartItem'),
        cartId: cart.id,
        productId: productId,
        quantity: qty,
        unitPrice: product.price || 0,
        lineSubtotal: (product.price || 0) * qty,
        protectionPlanId: selectedPlanId,
        addedAt: this._now()
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart.id);

    const carts = this._getFromStorage('cart');
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;

    return {
      success: true,
      cart: updatedCart,
      addedItem: cartItem,
      message: 'Product added to cart'
    };
  }

  getCartSummary() {
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const protectionPlans = this._getFromStorage('protection_plans');
    const categoryMap = this._buildCategoryMap();

    const openCart = carts.find((c) => c.status === 'open') || null;

    if (!openCart) {
      return {
        cart: null,
        items: []
      };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cartId === openCart.id);

    const items = itemsForCart.map((ci) => {
      const productRaw = products.find((p) => p.id === ci.productId) || null;
      const product = this._augmentProduct(productRaw, categoryMap);
      const protectionPlan = ci.protectionPlanId
        ? protectionPlans.find((pl) => pl.id === ci.protectionPlanId) || null
        : null;

      return {
        cartItem: ci,
        product,
        protectionPlan
      };
    });

    return {
      cart: openCart,
      items
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (itemIndex === -1) {
      return this.getCartSummary();
    }

    const cartItem = cartItems[itemIndex];
    const cartId = cartItem.cartId;

    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      cartItem.quantity = quantity;
      cartItem.lineSubtotal = (cartItem.unitPrice || 0) * quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cartId);

    // Build summary for this cart
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === cartId) || null;
    const products = this._getFromStorage('products');
    const protectionPlans = this._getFromStorage('protection_plans');
    const categoryMap = this._buildCategoryMap();

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cartId);
    const items = itemsForCart.map((ci) => {
      const productRaw = products.find((p) => p.id === ci.productId) || null;
      const product = this._augmentProduct(productRaw, categoryMap);
      const protectionPlan = ci.protectionPlanId
        ? protectionPlans.find((pl) => pl.id === ci.protectionPlanId) || null
        : null;
      return {
        cartItem: ci,
        product,
        protectionPlan
      };
    });

    return {
      cart,
      items
    };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return this.getCartSummary();
    }

    const cartId = cartItems[itemIndex].cartId;
    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cartId);

    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === cartId) || null;
    const products = this._getFromStorage('products');
    const protectionPlans = this._getFromStorage('protection_plans');
    const categoryMap = this._buildCategoryMap();

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cartId);
    const items = itemsForCart.map((ci) => {
      const productRaw = products.find((p) => p.id === ci.productId) || null;
      const product = this._augmentProduct(productRaw, categoryMap);
      const protectionPlan = ci.protectionPlanId
        ? protectionPlans.find((pl) => pl.id === ci.protectionPlanId) || null
        : null;
      return {
        cartItem: ci,
        product,
        protectionPlan
      };
    });

    return {
      cart,
      items
    };
  }

  // Wishlist interfaces

  getWishlistItems() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const products = this._getFromStorage('products');
    const categoryMap = this._buildCategoryMap();

    const itemsForWishlist = wishlistItems.filter(
      (wi) => wi.wishlistId === wishlist.id
    );

    const items = itemsForWishlist.map((wi) => {
      const productRaw = products.find((p) => p.id === wi.productId) || null;
      const product = this._augmentProduct(productRaw, categoryMap);
      return {
        wishlistItem: wi,
        product
      };
    });

    return {
      wishlist,
      items
    };
  }

  addToWishlist(productId) {
    const products = this._getFromStorage('products');
    const productRaw = products.find((p) => p.id === productId) || null;
    if (!productRaw) {
      return {
        wishlist: this._getOrCreateWishlist(),
        wishlistItem: null,
        product: null
      };
    }

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');

    let wishlistItem = wishlistItems.find(
      (wi) => wi.wishlistId === wishlist.id && wi.productId === productId
    );

    if (!wishlistItem) {
      wishlistItem = {
        id: this._generateId('wishlistItem'),
        wishlistId: wishlist.id,
        productId,
        addedAt: this._now()
      };
      wishlistItems.push(wishlistItem);
      this._saveToStorage('wishlist_items', wishlistItems);

      // Update wishlist updatedAt
      const wishlists = this._getFromStorage('wishlist');
      const wl = wishlists.find((w) => w.id === wishlist.id);
      if (wl) {
        wl.updatedAt = this._now();
        this._saveToStorage('wishlist', wishlists);
      }
    }

    const categoryMap = this._buildCategoryMap();
    const product = this._augmentProduct(productRaw, categoryMap);

    return {
      wishlist,
      wishlistItem,
      product
    };
  }

  removeFromWishlist(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');

    wishlistItems = wishlistItems.filter((wi) => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    // Update wishlist updatedAt
    const wishlists = this._getFromStorage('wishlist');
    const wl = wishlists.find((w) => w.id === wishlist.id);
    if (wl) {
      wl.updatedAt = this._now();
      this._saveToStorage('wishlist', wishlists);
    }

    // Return updated list
    const products = this._getFromStorage('products');
    const categoryMap = this._buildCategoryMap();

    const itemsForWishlist = wishlistItems.filter(
      (wi) => wi.wishlistId === wishlist.id
    );

    const items = itemsForWishlist.map((wi) => {
      const productRaw = products.find((p) => p.id === wi.productId) || null;
      const product = this._augmentProduct(productRaw, categoryMap);
      return {
        wishlistItem: wi,
        product
      };
    });

    return {
      wishlist,
      items
    };
  }

  moveWishlistItemToCart(wishlistItemId, quantity) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const wishlistItem = wishlistItems.find((wi) => wi.id === wishlistItemId);

    if (!wishlistItem) {
      const cartSummary = this.getCartSummary();
      return {
        cart: cartSummary.cart,
        cartItem: null,
        wishlist
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const addResult = this.addToCart(wishlistItem.productId, qty);

    // Remove from wishlist
    const updatedWishlistItems = wishlistItems.filter((wi) => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', updatedWishlistItems);

    // Update wishlist updatedAt
    const wishlists = this._getFromStorage('wishlist');
    const wl = wishlists.find((w) => w.id === wishlist.id);
    if (wl) {
      wl.updatedAt = this._now();
      this._saveToStorage('wishlist', wishlists);
    }

    return {
      cart: addResult.cart,
      cartItem: addResult.addedItem,
      wishlist
    };
  }

  // Checkout interfaces

  createOrGetCheckoutSession() {
    const session = this._getOrCreateCheckoutSession();
    return session;
  }

  getCheckoutSessionDetails() {
    const checkoutSession = this._getOrCreateCheckoutSession();
    const cartSummary = this.getCartSummary();
    const shippingMethods = this._getFromStorage('shipping_methods');

    return {
      checkoutSession,
      cart: cartSummary.cart,
      items: cartSummary.items,
      shippingMethods
    };
  }

  updateCheckoutContactInfo(contactEmail, contactFullName) {
    const sessions = this._getFromStorage('checkout_sessions');
    const session = this._getOrCreateCheckoutSession();

    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      sessions[idx].contactEmail = contactEmail;
      sessions[idx].contactFullName = contactFullName;
      sessions[idx].updatedAt = this._now();
      this._saveToStorage('checkout_sessions', sessions);
      return sessions[idx];
    }

    // Fallback: should not usually happen
    session.contactEmail = contactEmail;
    session.contactFullName = contactFullName;
    session.updatedAt = this._now();
    sessions.push(session);
    this._saveToStorage('checkout_sessions', sessions);
    return session;
  }

  updateCheckoutShippingMethod(shippingMethodId) {
    const sessions = this._getFromStorage('checkout_sessions');
    const session = this._getOrCreateCheckoutSession();

    const shippingMethods = this._getFromStorage('shipping_methods');
    const method = shippingMethods.find((m) => m.id === shippingMethodId);
    if (!method) {
      return session;
    }

    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      sessions[idx].shippingMethodId = shippingMethodId;
      sessions[idx].updatedAt = this._now();
      this._saveToStorage('checkout_sessions', sessions);
      return sessions[idx];
    }

    session.shippingMethodId = shippingMethodId;
    session.updatedAt = this._now();
    sessions.push(session);
    this._saveToStorage('checkout_sessions', sessions);
    return session;
  }

  completeCheckout() {
    const sessions = this._getFromStorage('checkout_sessions');
    const carts = this._getFromStorage('cart');

    const session = this._getOrCreateCheckoutSession();
    const sessionIdx = sessions.findIndex((s) => s.id === session.id);

    if (sessionIdx === -1) {
      return {
        success: false,
        checkoutSession: null,
        orderReference: '',
        message: 'Checkout session not found'
      };
    }

    const updatedSession = sessions[sessionIdx];
    updatedSession.status = 'completed';
    updatedSession.updatedAt = this._now();

    const cartIdx = carts.findIndex((c) => c.id === updatedSession.cartId);
    if (cartIdx !== -1) {
      carts[cartIdx].status = 'checked_out';
      carts[cartIdx].updatedAt = this._now();
    }

    this._saveToStorage('checkout_sessions', sessions);
    this._saveToStorage('cart', carts);

    const orderReference = 'ORD-' + updatedSession.id;

    return {
      success: true,
      checkoutSession: updatedSession,
      orderReference,
      message: 'Checkout completed'
    };
  }

  getShippingMethods() {
    return this._getFromStorage('shipping_methods');
  }

  // Static / CMS-like content

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
      supportEmail: info.supportEmail || '',
      supportPhone: info.supportPhone || '',
      supportHours: info.supportHours || '',
      mailingAddress: info.mailingAddress || '',
      helpFaqSummary: info.helpFaqSummary || ''
    };
  }

  submitContactForm(name, email, subject, message) {
    const forms = this._getFromStorage('contact_forms');
    const form = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      createdAt: this._now()
    };
    forms.push(form);
    this._saveToStorage('contact_forms', forms);

    return {
      success: true,
      message: 'Your message has been received.'
    };
  }

  getPageContent(pageCode) {
    const raw = localStorage.getItem('page_content');
    let map = {};
    if (raw) {
      try {
        map = JSON.parse(raw) || {};
      } catch (e) {
        map = {};
      }
    }
    const page = map[pageCode] || {};
    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || '',
      lastUpdated: page.lastUpdated || ''
    };
  }

  getFaqEntries() {
    const entries = this._getFromStorage('faq_entries');
    return entries;
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
