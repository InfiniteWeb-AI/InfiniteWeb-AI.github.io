// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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
    // Core entity tables (arrays)
    const arrayKeys = [
      'equipment_categories',
      'products',
      'carts',
      'cart_items',
      'quote_baskets',
      'quote_items',
      'wishlists',
      'wishlist_items',
      'comparison_sets',
      'hire_orders',
      'hire_order_items',
      'resource_articles',
      'saved_resources_lists',
      'saved_resource_items',
      'account_profiles',
      // legacy / misc
      'users',
      'contact_enquiries',
      'homepage_promotions'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Page content / singleton objects are not initialized here with mock data
    // They can be seeded externally if needed.

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _calculateHireDurationDays(hireStartDate, hireEndDate) {
    if (!hireStartDate || !hireEndDate) {
      return 1;
    }
    const start = new Date(hireStartDate);
    const end = new Date(hireEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return 1;
    }
    const diffMs = end.getTime() - start.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const days = Math.round(diffMs / oneDayMs);
    return days > 0 ? days : 1;
  }

  _estimateLineTotal(dailyRate, durationDays, quantity) {
    const rate = Number(dailyRate) || 0;
    const days = Number(durationDays) || 1;
    const qty = Number(quantity) || 1;
    return rate * days * qty;
  }

  _ipRatingToRank(ipRating) {
    if (!ipRating) return null;
    const map = {
      ip54: 54,
      ip55: 55,
      ip65: 65,
      ip66: 66,
      ip67: 67
    };
    return map[ipRating] != null ? map[ipRating] : null;
  }

  // ----------------------
  // Single-instance helpers
  // ----------------------
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        deliveryMethod: null,
        deliveryPostcode: null,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getOrCreateQuoteBasket() {
    let quoteBaskets = this._getFromStorage('quote_baskets');
    let basket = quoteBaskets[0] || null;
    if (!basket) {
      basket = {
        id: this._generateId('quote_basket'),
        sitePostcode: null,
        createdAt: this._nowIso(),
        submittedAt: null
      };
      quoteBaskets.push(basket);
      this._saveToStorage('quote_baskets', quoteBaskets);
    }
    return basket;
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let wishlist = wishlists[0] || null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        createdAt: this._nowIso()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _getOrCreateSavedResourcesList() {
    let lists = this._getFromStorage('saved_resources_lists');
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('saved_resources_list'),
        createdAt: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('saved_resources_lists', lists);
    }
    return list;
  }

  _getOrCreateComparisonSet() {
    let sets = this._getFromStorage('comparison_sets');
    let set = sets[0] || null;
    if (!set) {
      set = {
        id: this._generateId('comparison_set'),
        productIds: [],
        createdAt: this._nowIso()
      };
      sets.push(set);
      this._saveToStorage('comparison_sets', sets);
    }
    return set;
  }

  _getOrCreateDraftHireOrder(cartId) {
    let orders = this._getFromStorage('hire_orders');
    let order = orders.find(function (o) {
      return o.cartId === cartId && o.status === 'draft';
    }) || null;

    if (!order) {
      // Default deliveryMethod can be updated later
      order = {
        id: this._generateId('hire_order'),
        status: 'draft',
        deliveryMethod: 'depot_pickup',
        contactName: '',
        contactEmail: '',
        addressStreet: '',
        addressCity: '',
        addressPostcode: '',
        deliveryNotes: '',
        cartId: cartId,
        createdAt: this._nowIso(),
        submittedAt: null,
        totalEstimate: null
      };
      orders.push(order);
      this._saveToStorage('hire_orders', orders);
    }
    return order;
  }

  // ----------------------
  // Public interfaces
  // ----------------------

  // getEquipmentCategories
  getEquipmentCategories() {
    return this._getFromStorage('equipment_categories');
  }

  // getHomepageContent
  getHomepageContent() {
    const categories = this.getEquipmentCategories();
    const products = this._getFromStorage('products');
    const articles = this._getFromStorage('resource_articles');

    let featuredProducts = products.slice();
    featuredProducts.sort(function (a, b) {
      const ra = a.ratingAverage != null ? a.ratingAverage : 0;
      const rb = b.ratingAverage != null ? b.ratingAverage : 0;
      if (rb !== ra) return rb - ra;
      return (a.dailyRate || 0) - (b.dailyRate || 0);
    });
    featuredProducts = featuredProducts.slice(0, 8);

    let featuredSafetyGuides = articles.filter(function (a) {
      return a.categoryId === 'safety_guides';
    }).slice(0, 5);

    const promotions = this._getFromStorage('homepage_promotions', []);

    return {
      categories: categories,
      featuredProducts: featuredProducts,
      featuredSafetyGuides: featuredSafetyGuides,
      promotions: promotions
    };
  }

  // searchSite(query)
  searchSite(query) {
    if (!query || typeof query !== 'string') {
      return { equipmentResults: [], resourceResults: [] };
    }
    const q = query.toLowerCase();

    const products = this._getFromStorage('products');
    const equipmentResults = products.filter(function (p) {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
    });

    const articles = this._getFromStorage('resource_articles');
    const resourceResults = articles.filter(function (a) {
      const title = (a.title || '').toLowerCase();
      const summary = (a.summary || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
      return (
        title.indexOf(q) !== -1 ||
        summary.indexOf(q) !== -1 ||
        content.indexOf(q) !== -1 ||
        tags.indexOf(q) !== -1
      );
    });

    return { equipmentResults: equipmentResults, resourceResults: resourceResults };
  }

  // getCategoryFilterOptions(categoryId)
  getCategoryFilterOptions(categoryId) {
    const products = this._getFromStorage('products').filter(function (p) {
      return p.categoryId === categoryId;
    });

    const capacitySet = new Set();
    const powerSourceSet = new Set();
    const compatibleCapacitySet = new Set();
    let liftMin = null;
    let liftMax = null;
    const environmentSet = new Set();
    const ipRatingSet = new Set();
    let rateMin = null;
    let rateMax = null;
    let ratingMin = null;
    let ratingMax = null;

    products.forEach(function (p) {
      if (p.capacityTonnes != null) capacitySet.add(p.capacityTonnes);
      if (p.powerSource) powerSourceSet.add(p.powerSource);
      if (p.compatibleHoistCapacityTonnes != null) {
        compatibleCapacitySet.add(p.compatibleHoistCapacityTonnes);
      }
      if (p.liftHeightMeters != null) {
        if (liftMin == null || p.liftHeightMeters < liftMin) liftMin = p.liftHeightMeters;
        if (liftMax == null || p.liftHeightMeters > liftMax) liftMax = p.liftHeightMeters;
      }
      if (p.environment) environmentSet.add(p.environment);
      if (p.ipRating) ipRatingSet.add(p.ipRating);
      if (p.dailyRate != null) {
        if (rateMin == null || p.dailyRate < rateMin) rateMin = p.dailyRate;
        if (rateMax == null || p.dailyRate > rateMax) rateMax = p.dailyRate;
      }
      if (p.ratingAverage != null) {
        if (ratingMin == null || p.ratingAverage < ratingMin) ratingMin = p.ratingAverage;
        if (ratingMax == null || p.ratingAverage > ratingMax) ratingMax = p.ratingAverage;
      }
    });

    const capacityTonnesOptions = Array.from(capacitySet).sort(function (a, b) { return a - b; });
    const powerSourceOptions = Array.from(powerSourceSet);
    const compatibleHoistCapacityTonnesOptions = Array.from(compatibleCapacitySet).sort(function (a, b) { return a - b; });
    const environmentOptions = Array.from(environmentSet);
    const ipRatingOptions = Array.from(ipRatingSet).sort();

    const dailyRateRange = {
      min: rateMin != null ? rateMin : 0,
      max: rateMax != null ? rateMax : 0
    };

    // Predefined rating thresholds (only include those within data range)
    const possibleRatings = [3, 4, 4.5, 5];
    const ratingAverageOptions = possibleRatings.filter(function (r) {
      return ratingMax != null && r <= ratingMax;
    });

    const sortOptions = [
      { value: 'daily_rate_asc', label: 'Daily Rate: Low to High' },
      { value: 'daily_rate_desc', label: 'Daily Rate: High to Low' },
      { value: 'lift_height_desc', label: 'Lift Height: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'availability_in_stock_first', label: 'Availability: In Stock First' }
    ];

    const liftHeightMetersRange = {
      min: liftMin != null ? liftMin : 0,
      max: liftMax != null ? liftMax : 0
    };

    return {
      capacityTonnesOptions: capacityTonnesOptions,
      powerSourceOptions: powerSourceOptions,
      compatibleHoistCapacityTonnesOptions: compatibleHoistCapacityTonnesOptions,
      liftHeightMetersRange: liftHeightMetersRange,
      environmentOptions: environmentOptions,
      ipRatingOptions: ipRatingOptions,
      dailyRateRange: dailyRateRange,
      ratingAverageOptions: ratingAverageOptions,
      sortOptions: sortOptions
    };
  }

  // getCategoryProducts(categoryId, filters, hireStartDate, hireEndDate, sortBy, page, pageSize)
  getCategoryProducts(categoryId, filters, hireStartDate, hireEndDate, sortBy, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    const allCategories = this._getFromStorage('equipment_categories');
    const category = allCategories.find(function (c) { return c.id === categoryId; }) || {
      id: categoryId,
      name: '',
      description: ''
    };

    const allProducts = this._getFromStorage('products');
    const self = this;

    let products = allProducts.filter(function (p) {
      if (p.categoryId !== categoryId) return false;

      if (filters.capacityTonnesMin != null && p.capacityTonnes != null && p.capacityTonnes < filters.capacityTonnesMin) return false;
      if (filters.capacityTonnesMax != null && p.capacityTonnes != null && p.capacityTonnes > filters.capacityTonnesMax) return false;

      if (filters.powerSource && p.powerSource && p.powerSource !== filters.powerSource) return false;

      if (filters.compatibleHoistCapacityTonnes != null && p.compatibleHoistCapacityTonnes != null && p.compatibleHoistCapacityTonnes !== filters.compatibleHoistCapacityTonnes) return false;

      if (filters.liftHeightMetersMin != null && p.liftHeightMeters != null && p.liftHeightMeters < filters.liftHeightMetersMin) return false;
      if (filters.liftHeightMetersMax != null && p.liftHeightMeters != null && p.liftHeightMeters > filters.liftHeightMetersMax) return false;

      if (filters.environment && p.environment && p.environment !== filters.environment) return false;

      if (filters.ipRatingMin) {
        const minRank = self._ipRatingToRank(filters.ipRatingMin);
        const pr = self._ipRatingToRank(p.ipRating);
        if (minRank != null && pr != null && pr < minRank) return false;
      }

      if (filters.dailyRateMin != null && p.dailyRate != null && p.dailyRate < filters.dailyRateMin) return false;
      if (filters.dailyRateMax != null && p.dailyRate != null && p.dailyRate > filters.dailyRateMax) return false;

      if (filters.ratingAverageMin != null && p.ratingAverage != null && p.ratingAverage < filters.ratingAverageMin) return false;

      if (filters.availabilityStatus && p.availabilityStatus && p.availabilityStatus !== filters.availabilityStatus) return false;

      return true;
    });

    const hireDurationDays = this._calculateHireDurationDays(hireStartDate, hireEndDate);

    // Sorting
    products.sort(function (a, b) {
      if (sortBy === 'daily_rate_asc') {
        return (a.dailyRate || 0) - (b.dailyRate || 0);
      }
      if (sortBy === 'daily_rate_desc') {
        return (b.dailyRate || 0) - (a.dailyRate || 0);
      }
      if (sortBy === 'lift_height_desc') {
        return (b.liftHeightMeters || 0) - (a.liftHeightMeters || 0);
      }
      if (sortBy === 'rating_desc') {
        return (b.ratingAverage || 0) - (a.ratingAverage || 0);
      }
      if (sortBy === 'availability_in_stock_first') {
        const priority = { in_stock: 0, limited_stock: 1, out_of_stock: 2 };
        const pa = priority[a.availabilityStatus] != null ? priority[a.availabilityStatus] : 3;
        const pb = priority[b.availabilityStatus] != null ? priority[b.availabilityStatus] : 3;
        if (pa !== pb) return pa - pb;
        return (a.dailyRate || 0) - (b.dailyRate || 0);
      }
      // default: no special sort
      return 0;
    });

    const totalItems = products.length;
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const pagedProducts = products.slice(startIndex, startIndex + pageSize);

    // Wishlist and comparison membership
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(function (wi) {
      return wi.wishlistId === wishlist.id;
    });
    const wishlistProductIds = new Set(wishlistItems.map(function (wi) { return wi.productId; }));

    const comparisonSet = this._getOrCreateComparisonSet();
    const comparisonProductIds = new Set(comparisonSet.productIds || []);

    const productsWithMeta = pagedProducts.map(function (p) {
      const isInWishlist = wishlistProductIds.has(p.id);
      const isInComparisonSet = comparisonProductIds.has(p.id);
      const dailyHireEstimate = p.dailyRate != null ? p.dailyRate : null;
      const totalHireEstimate = p.dailyRate != null ? p.dailyRate * hireDurationDays : null;
      return {
        product: p,
        dailyHireEstimate: dailyHireEstimate,
        totalHireEstimate: totalHireEstimate,
        isInWishlist: isInWishlist,
        isInComparisonSet: isInComparisonSet
      };
    });

    return {
      category: {
        id: category.id,
        name: category.name,
        description: category.description
      },
      hireStartDate: hireStartDate || null,
      hireEndDate: hireEndDate || null,
      hireDurationDays: hireDurationDays,
      filtersApplied: {
        capacityTonnesMin: filters.capacityTonnesMin != null ? filters.capacityTonnesMin : null,
        capacityTonnesMax: filters.capacityTonnesMax != null ? filters.capacityTonnesMax : null,
        powerSource: filters.powerSource || null,
        compatibleHoistCapacityTonnes: filters.compatibleHoistCapacityTonnes != null ? filters.compatibleHoistCapacityTonnes : null,
        liftHeightMetersMin: filters.liftHeightMetersMin != null ? filters.liftHeightMetersMin : null,
        liftHeightMetersMax: filters.liftHeightMetersMax != null ? filters.liftHeightMetersMax : null,
        environment: filters.environment || null,
        ipRatingMin: filters.ipRatingMin || null,
        dailyRateMax: filters.dailyRateMax != null ? filters.dailyRateMax : null,
        dailyRateMin: filters.dailyRateMin != null ? filters.dailyRateMin : null,
        ratingAverageMin: filters.ratingAverageMin != null ? filters.ratingAverageMin : null,
        availabilityStatus: filters.availabilityStatus || null
      },
      sortBy: sortBy || null,
      pagination: {
        page: page,
        pageSize: pageSize,
        totalItems: totalItems,
        totalPages: totalPages
      },
      products: productsWithMeta
    };
  }

  // getProductDetails(productId, hireStartDate, hireEndDate)
  getProductDetails(productId, hireStartDate, hireEndDate) {
    const allProducts = this._getFromStorage('products');
    const product = allProducts.find(function (p) { return p.id === productId; }) || null;

    const allCategories = this._getFromStorage('equipment_categories');
    let category = null;
    if (product) {
      category = allCategories.find(function (c) { return c.id === product.categoryId; }) || null;
    }

    const hireDurationDays = this._calculateHireDurationDays(hireStartDate, hireEndDate);

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(function (wi) {
      return wi.wishlistId === wishlist.id;
    });
    const isInWishlist = product ? wishlistItems.some(function (wi) { return wi.productId === product.id; }) : false;

    const comparisonSet = this._getOrCreateComparisonSet();
    const isInComparisonSet = product ? (comparisonSet.productIds || []).indexOf(product.id) !== -1 : false;

    // Related products: same category, different id
    let relatedProducts = [];
    if (product) {
      relatedProducts = allProducts.filter(function (p) {
        return p.id !== product.id && p.categoryId === product.categoryId;
      }).slice(0, 4);
    }

    // Related safety guides: same hoist type keyword search
    const articles = this._getFromStorage('resource_articles');
    let relatedSafetyGuides = [];
    if (product) {
      const hoistTypeTerm = (product.hoistType || '').replace(/_/g, ' ');
      relatedSafetyGuides = articles.filter(function (a) {
        if (a.categoryId !== 'safety_guides') return false;
        const text = ((a.title || '') + ' ' + (a.summary || '')).toLowerCase();
        return hoistTypeTerm && text.indexOf(hoistTypeTerm.toLowerCase()) !== -1;
      }).slice(0, 5);
    }

    return {
      product: product,
      category: category,
      hireStartDate: hireStartDate || null,
      hireEndDate: hireEndDate || null,
      hireDurationDays: hireDurationDays,
      isInWishlist: isInWishlist,
      isInComparisonSet: isInComparisonSet,
      relatedProducts: relatedProducts,
      relatedSafetyGuides: relatedSafetyGuides
    };
  }

  // addProductToCart(productId, quantity, hireStartDate, hireEndDate)
  addProductToCart(productId, quantity, hireStartDate, hireEndDate) {
    quantity = quantity == null ? 1 : quantity;

    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; });
    if (!product) {
      return { success: false, message: 'Product not found', cart: null, cartItems: [] };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const hireDurationDays = this._calculateHireDurationDays(hireStartDate, hireEndDate);
    const dailyRateSnapshot = product.dailyRate != null ? product.dailyRate : 0;
    const lineTotalEstimate = this._estimateLineTotal(dailyRateSnapshot, hireDurationDays, quantity);

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      productId: product.id,
      productNameSnapshot: product.name || '',
      quantity: quantity,
      hireStartDate: hireStartDate,
      hireEndDate: hireEndDate,
      hireDurationDays: hireDurationDays,
      dailyRateSnapshot: dailyRateSnapshot,
      lineTotalEstimate: lineTotalEstimate
    };

    cartItems.push(cartItem);
    cart.updatedAt = this._nowIso();

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    // Return cart items for this cart, with product resolved
    const itemsForCart = cartItems.filter(function (ci) { return ci.cartId === cart.id; });
    const itemsWithProduct = itemsForCart.map(function (ci) {
      const prod = products.find(function (p) { return p.id === ci.productId; }) || null;
      return Object.assign({}, ci, { product: prod });
    });

    return {
      success: true,
      message: 'Product added to cart',
      cart: cart,
      cartItems: itemsWithProduct
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const itemsForCart = cartItemsAll.filter(function (ci) { return ci.cartId === cart.id; });

    let hireSubtotal = 0;
    const items = itemsForCart.map(function (ci) {
      const product = products.find(function (p) { return p.id === ci.productId; }) || null;
      const lineTotal = ci.lineTotalEstimate != null ? ci.lineTotalEstimate : (ci.dailyRateSnapshot || 0) * (ci.hireDurationDays || 1) * (ci.quantity || 1);
      hireSubtotal += lineTotal;
      return {
        cartItem: Object.assign({}, ci, { product: product }),
        product: product,
        lineTotalEstimate: lineTotal
      };
    });

    // Simple delivery fee estimate based on method
    let deliveryFeeEstimate = 0;
    if (cart.deliveryMethod === 'standard_delivery') {
      deliveryFeeEstimate = 50;
    } else if (cart.deliveryMethod === 'site_delivery') {
      deliveryFeeEstimate = 80;
    }

    const grandTotalEstimate = hireSubtotal + deliveryFeeEstimate;

    const availableDeliveryMethods = ['depot_pickup', 'standard_delivery', 'site_delivery'];

    return {
      cart: cart,
      items: items,
      totals: {
        hireSubtotal: hireSubtotal,
        deliveryFeeEstimate: deliveryFeeEstimate,
        grandTotalEstimate: grandTotalEstimate
      },
      availableDeliveryMethods: availableDeliveryMethods
    };
  }

  // updateCartItem(cartItemId, quantity, hireStartDate, hireEndDate)
  updateCartItem(cartItemId, quantity, hireStartDate, hireEndDate) {
    let cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return { success: false, cart: null, cartItems: [] };
    }

    const ci = cartItems[idx];

    if (quantity != null) {
      ci.quantity = quantity;
    }
    if (hireStartDate != null) {
      ci.hireStartDate = hireStartDate;
    }
    if (hireEndDate != null) {
      ci.hireEndDate = hireEndDate;
    }

    ci.hireDurationDays = this._calculateHireDurationDays(ci.hireStartDate, ci.hireEndDate);

    const product = products.find(function (p) { return p.id === ci.productId; }) || null;
    const dailyRateSnapshot = ci.dailyRateSnapshot != null ? ci.dailyRateSnapshot : (product && product.dailyRate != null ? product.dailyRate : 0);
    ci.dailyRateSnapshot = dailyRateSnapshot;
    ci.lineTotalEstimate = this._estimateLineTotal(dailyRateSnapshot, ci.hireDurationDays, ci.quantity);

    cartItems[idx] = ci;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(function (c) { return c.id === ci.cartId; }) || null;
    if (cart) {
      cart.updatedAt = this._nowIso();
      const cIdx = carts.findIndex(function (c) { return c.id === cart.id; });
      if (cIdx !== -1) {
        carts[cIdx] = cart;
        this._saveToStorage('carts', carts);
      }
    }

    const itemsForCart = cartItems.filter(function (item) { return item.cartId === ci.cartId; });
    const itemsWithProduct = itemsForCart.map(function (item) {
      const p = products.find(function (prod) { return prod.id === item.productId; }) || null;
      return Object.assign({}, item, { product: p });
    });

    return {
      success: true,
      cart: cart,
      cartItems: itemsWithProduct
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return { success: false, cart: null, cartItems: [] };
    }

    const cartId = cartItems[idx].cartId;

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(function (c) { return c.id === cartId; }) || null;
    if (cart) {
      cart.updatedAt = this._nowIso();
      const cIdx = carts.findIndex(function (c) { return c.id === cart.id; });
      if (cIdx !== -1) {
        carts[cIdx] = cart;
        this._saveToStorage('carts', carts);
      }
    }

    const itemsForCart = cartItems.filter(function (item) { return item.cartId === cartId; });
    const itemsWithProduct = itemsForCart.map(function (item) {
      const p = products.find(function (prod) { return prod.id === item.productId; }) || null;
      return Object.assign({}, item, { product: p });
    });

    return {
      success: true,
      cart: cart,
      cartItems: itemsWithProduct
    };
  }

  // setCartDeliveryMethod(deliveryMethod)
  setCartDeliveryMethod(deliveryMethod) {
    const cart = this._getOrCreateCart();
    cart.deliveryMethod = deliveryMethod;
    cart.updatedAt = this._nowIso();

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    return { cart: cart };
  }

  // setCartDeliveryPostcode(deliveryPostcode)
  setCartDeliveryPostcode(deliveryPostcode) {
    const cart = this._getOrCreateCart();
    cart.deliveryPostcode = deliveryPostcode;
    cart.updatedAt = this._nowIso();

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    return { cart: cart };
  }

  // getCheckoutData()
  getCheckoutData() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const cartItemsForCart = cartItemsAll.filter(function (ci) { return ci.cartId === cart.id; });

    const cartItemsWithProduct = cartItemsForCart.map(function (ci) {
      const p = products.find(function (prod) { return prod.id === ci.productId; }) || null;
      return Object.assign({}, ci, { product: p });
    });

    const draftOrder = this._getOrCreateDraftHireOrder(cart.id);

    return {
      cart: cart,
      cartItems: cartItemsWithProduct,
      draftOrder: draftOrder
    };
  }

  // updateCheckoutDetails(contactName, contactEmail, addressStreet, addressCity, addressPostcode, deliveryMethod, deliveryNotes)
  updateCheckoutDetails(contactName, contactEmail, addressStreet, addressCity, addressPostcode, deliveryMethod, deliveryNotes) {
    const cart = this._getOrCreateCart();
    let order = this._getOrCreateDraftHireOrder(cart.id);

    order.contactName = contactName;
    order.contactEmail = contactEmail;
    order.addressStreet = addressStreet || '';
    order.addressCity = addressCity || '';
    order.addressPostcode = addressPostcode || '';
    order.deliveryMethod = deliveryMethod;
    order.deliveryNotes = deliveryNotes || '';

    // Recalculate totalEstimate based on cart items and delivery
    const cartItemsAll = this._getFromStorage('cart_items');
    const itemsForCart = cartItemsAll.filter(function (ci) { return ci.cartId === cart.id; });
    let hireSubtotal = 0;
    itemsForCart.forEach(function (ci) {
      const line = ci.lineTotalEstimate != null ? ci.lineTotalEstimate : (ci.dailyRateSnapshot || 0) * (ci.hireDurationDays || 1) * (ci.quantity || 1);
      hireSubtotal += line;
    });
    let deliveryFeeEstimate = 0;
    if (order.deliveryMethod === 'standard_delivery') {
      deliveryFeeEstimate = 50;
    } else if (order.deliveryMethod === 'site_delivery') {
      deliveryFeeEstimate = 80;
    }
    order.totalEstimate = hireSubtotal + deliveryFeeEstimate;

    const orders = this._getFromStorage('hire_orders');
    const idx = orders.findIndex(function (o) { return o.id === order.id; });
    if (idx !== -1) {
      orders[idx] = order;
      this._saveToStorage('hire_orders', orders);
    }

    return { hireOrder: order };
  }

  // submitHireOrder()
  submitHireOrder() {
    const cart = this._getOrCreateCart();
    let orders = this._getFromStorage('hire_orders');
    let order = orders.find(function (o) { return o.cartId === cart.id && o.status === 'draft'; }) || null;

    if (!order) {
      return { success: false, hireOrder: null, message: 'No draft hire order found' };
    }

    const cartItemsAll = this._getFromStorage('cart_items');
    const itemsForCart = cartItemsAll.filter(function (ci) { return ci.cartId === cart.id; });

    if (itemsForCart.length === 0) {
      return { success: false, hireOrder: order, message: 'Cart is empty' };
    }

    // Ensure totalEstimate is up to date
    let hireSubtotal = 0;
    itemsForCart.forEach(function (ci) {
      const line = ci.lineTotalEstimate != null ? ci.lineTotalEstimate : (ci.dailyRateSnapshot || 0) * (ci.hireDurationDays || 1) * (ci.quantity || 1);
      hireSubtotal += line;
    });
    let deliveryFeeEstimate = 0;
    if (order.deliveryMethod === 'standard_delivery') {
      deliveryFeeEstimate = 50;
    } else if (order.deliveryMethod === 'site_delivery') {
      deliveryFeeEstimate = 80;
    }
    order.totalEstimate = hireSubtotal + deliveryFeeEstimate;

    order.status = 'submitted';
    order.submittedAt = this._nowIso();

    const idx = orders.findIndex(function (o) { return o.id === order.id; });
    if (idx !== -1) {
      orders[idx] = order;
      this._saveToStorage('hire_orders', orders);
    }

    // Create HireOrderItems snapshot
    let orderItems = this._getFromStorage('hire_order_items');
    const products = this._getFromStorage('products');

    itemsForCart.forEach((ci) => {
      const product = products.find(function (p) { return p.id === ci.productId; }) || null;
      const item = {
        id: this._generateId('hire_order_item'),
        orderId: order.id,
        productId: ci.productId,
        productNameSnapshot: product ? product.name : ci.productNameSnapshot || '',
        quantity: ci.quantity,
        hireStartDate: ci.hireStartDate,
        hireEndDate: ci.hireEndDate,
        hireDurationDays: ci.hireDurationDays,
        dailyRateSnapshot: ci.dailyRateSnapshot,
        lineTotal: ci.lineTotalEstimate
      };
      orderItems.push(item);
    });

    this._saveToStorage('hire_order_items', orderItems);

    return { success: true, hireOrder: order, message: 'Hire order submitted' };
  }

  // addProductToQuote(productId, quantity)
  addProductToQuote(productId, quantity) {
    quantity = quantity == null ? 1 : quantity;

    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; });
    if (!product) {
      return { quoteBasket: null, quoteItems: [] };
    }

    const basket = this._getOrCreateQuoteBasket();
    let quoteItems = this._getFromStorage('quote_items');

    const item = {
      id: this._generateId('quote_item'),
      quoteBasketId: basket.id,
      productId: product.id,
      productNameSnapshot: product.name || '',
      quantity: quantity,
      hireStartDate: null,
      hireEndDate: null,
      hireDurationDays: null
    };

    quoteItems.push(item);
    this._saveToStorage('quote_items', quoteItems);

    const itemsForBasket = quoteItems.filter(function (qi) { return qi.quoteBasketId === basket.id; });

    return {
      quoteBasket: basket,
      quoteItems: itemsForBasket
    };
  }

  // getQuoteBasket()
  getQuoteBasket() {
    const basket = this._getOrCreateQuoteBasket();
    const quoteItems = this._getFromStorage('quote_items').filter(function (qi) {
      return qi.quoteBasketId === basket.id;
    });
    const products = this._getFromStorage('products');

    const items = quoteItems.map(function (qi) {
      const product = products.find(function (p) { return p.id === qi.productId; }) || null;
      return {
        quoteItem: qi,
        product: product
      };
    });

    return {
      quoteBasket: basket,
      items: items
    };
  }

  // updateQuoteItem(quoteItemId, quantity, hireStartDate, hireEndDate)
  updateQuoteItem(quoteItemId, quantity, hireStartDate, hireEndDate) {
    let quoteItems = this._getFromStorage('quote_items');
    const idx = quoteItems.findIndex(function (qi) { return qi.id === quoteItemId; });
    if (idx === -1) {
      return { quoteBasket: null, quoteItems: [] };
    }

    const qi = quoteItems[idx];
    if (quantity != null) {
      qi.quantity = quantity;
    }
    if (hireStartDate != null) {
      qi.hireStartDate = hireStartDate;
    }
    if (hireEndDate != null) {
      qi.hireEndDate = hireEndDate;
    }

    qi.hireDurationDays = this._calculateHireDurationDays(qi.hireStartDate, qi.hireEndDate);

    quoteItems[idx] = qi;
    this._saveToStorage('quote_items', quoteItems);

    const basketId = qi.quoteBasketId;
    const basketList = this._getFromStorage('quote_baskets');
    const basket = basketList.find(function (b) { return b.id === basketId; }) || null;

    const itemsForBasket = quoteItems.filter(function (item) { return item.quoteBasketId === basketId; });

    return {
      quoteBasket: basket,
      quoteItems: itemsForBasket
    };
  }

  // setQuoteCommonHirePeriod(hireStartDate, hireEndDate)
  setQuoteCommonHirePeriod(hireStartDate, hireEndDate) {
    const basket = this._getOrCreateQuoteBasket();
    let quoteItems = this._getFromStorage('quote_items');

    quoteItems = quoteItems.map((qi) => {
      if (qi.quoteBasketId !== basket.id) return qi;
      const updated = Object.assign({}, qi);
      updated.hireStartDate = hireStartDate;
      updated.hireEndDate = hireEndDate;
      updated.hireDurationDays = this._calculateHireDurationDays(hireStartDate, hireEndDate);
      return updated;
    });

    this._saveToStorage('quote_items', quoteItems);

    const itemsForBasket = quoteItems.filter(function (qi) { return qi.quoteBasketId === basket.id; });

    return {
      quoteBasket: basket,
      quoteItems: itemsForBasket
    };
  }

  // setQuoteSitePostcode(sitePostcode)
  setQuoteSitePostcode(sitePostcode) {
    const basket = this._getOrCreateQuoteBasket();
    basket.sitePostcode = sitePostcode;

    const baskets = this._getFromStorage('quote_baskets');
    const idx = baskets.findIndex(function (b) { return b.id === basket.id; });
    if (idx !== -1) {
      baskets[idx] = basket;
      this._saveToStorage('quote_baskets', baskets);
    }

    return { quoteBasket: basket };
  }

  // submitQuoteRequest(contactName, contactEmail, additionalNotes)
  submitQuoteRequest(contactName, contactEmail, additionalNotes) {
    const basket = this._getOrCreateQuoteBasket();
    const quoteItems = this._getFromStorage('quote_items').filter(function (qi) {
      return qi.quoteBasketId === basket.id;
    });

    if (quoteItems.length === 0) {
      return { success: false, quoteBasket: basket, message: 'Quote basket is empty' };
    }

    // Persist contact details as additional fields on QuoteBasket
    const baskets = this._getFromStorage('quote_baskets');
    const idx = baskets.findIndex(function (b) { return b.id === basket.id; });
    if (idx !== -1) {
      const updated = Object.assign({}, basket, {
        contactName: contactName || basket.contactName || '',
        contactEmail: contactEmail || basket.contactEmail || '',
        additionalNotes: additionalNotes || basket.additionalNotes || '',
        submittedAt: this._nowIso()
      });
      baskets[idx] = updated;
      this._saveToStorage('quote_baskets', baskets);
      return { success: true, quoteBasket: updated, message: 'Quote request submitted' };
    }

    return { success: true, quoteBasket: basket, message: 'Quote request submitted' };
  }

  // addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');

    const already = wishlistItems.find(function (wi) {
      return wi.wishlistId === wishlist.id && wi.productId === productId;
    });
    if (!already) {
      const item = {
        id: this._generateId('wishlist_item'),
        wishlistId: wishlist.id,
        productId: productId,
        addedAt: this._nowIso()
      };
      wishlistItems.push(item);
      this._saveToStorage('wishlist_items', wishlistItems);
    }

    const itemsForWishlist = wishlistItems.filter(function (wi) { return wi.wishlistId === wishlist.id; });

    return {
      wishlist: wishlist,
      wishlistItems: itemsForWishlist
    };
  }

  // removeProductFromWishlist(productId)
  removeProductFromWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');

    wishlistItems = wishlistItems.filter(function (wi) {
      return !(wi.wishlistId === wishlist.id && wi.productId === productId);
    });

    this._saveToStorage('wishlist_items', wishlistItems);

    const itemsForWishlist = wishlistItems.filter(function (wi) { return wi.wishlistId === wishlist.id; });

    return {
      wishlist: wishlist,
      wishlistItems: itemsForWishlist
    };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(function (wi) {
      return wi.wishlistId === wishlist.id;
    });
    const products = this._getFromStorage('products');

    const items = wishlistItems.map(function (wi) {
      const product = products.find(function (p) { return p.id === wi.productId; }) || null;
      return {
        wishlistItem: wi,
        product: product
      };
    });

    return {
      wishlist: wishlist,
      items: items
    };
  }

  // addProductToComparison(productId)
  addProductToComparison(productId) {
    const set = this._getOrCreateComparisonSet();
    let productIds = Array.isArray(set.productIds) ? set.productIds.slice() : [];

    if (productIds.indexOf(productId) === -1) {
      if (productIds.length >= 4) {
        productIds.shift();
      }
      productIds.push(productId);
    }

    set.productIds = productIds;

    let sets = this._getFromStorage('comparison_sets');
    const idx = sets.findIndex(function (s) { return s.id === set.id; });
    if (idx !== -1) {
      sets[idx] = set;
    } else {
      sets.push(set);
    }
    this._saveToStorage('comparison_sets', sets);

    return { comparisonSet: set };
  }

  // removeProductFromComparison(productId)
  removeProductFromComparison(productId) {
    const set = this._getOrCreateComparisonSet();
    let productIds = Array.isArray(set.productIds) ? set.productIds.slice() : [];

    productIds = productIds.filter(function (id) { return id !== productId; });
    set.productIds = productIds;

    let sets = this._getFromStorage('comparison_sets');
    const idx = sets.findIndex(function (s) { return s.id === set.id; });
    if (idx !== -1) {
      sets[idx] = set;
      this._saveToStorage('comparison_sets', sets);
    }

    return { comparisonSet: set };
  }

  // clearComparisonSet()
  clearComparisonSet() {
    const set = this._getOrCreateComparisonSet();
    set.productIds = [];

    let sets = this._getFromStorage('comparison_sets');
    const idx = sets.findIndex(function (s) { return s.id === set.id; });
    if (idx !== -1) {
      sets[idx] = set;
      this._saveToStorage('comparison_sets', sets);
    }

    return { comparisonSet: set };
  }

  // getComparisonSetDetails()
  getComparisonSetDetails() {
    const set = this._getOrCreateComparisonSet();
    const products = this._getFromStorage('products');

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(function (wi) {
      return wi.wishlistId === wishlist.id;
    });
    const wishlistProductIds = new Set(wishlistItems.map(function (wi) { return wi.productId; }));

    const resultProducts = (set.productIds || []).map((id) => {
      const product = products.find(function (p) { return p.id === id; }) || null;
      const specsTableParsed = product ? {
        capacityTonnes: product.capacityTonnes != null ? product.capacityTonnes : null,
        standardChainLengthMeters: product.standardChainLengthMeters != null ? product.standardChainLengthMeters : null,
        liftHeightMeters: product.liftHeightMeters != null ? product.liftHeightMeters : null,
        weightKg: product.weightKg != null ? product.weightKg : null,
        environment: product.environment || null,
        ipRating: product.ipRating || null,
        dailyRate: product.dailyRate != null ? product.dailyRate : null
      } : null;
      const isInWishlist = product ? wishlistProductIds.has(product.id) : false;
      return {
        product: product,
        specsTableParsed: specsTableParsed,
        isInWishlist: isInWishlist
      };
    });

    return {
      comparisonSet: set,
      products: resultProducts
    };
  }

  // registerAccount(fullName, email, password, userType)
  registerAccount(fullName, email, password, userType) {
    // AccountProfile (single user)
    let profiles = this._getFromStorage('account_profiles');
    let profile = profiles[0] || null;

    const now = this._nowIso();

    if (!profile) {
      profile = {
        id: this._generateId('account_profile'),
        fullName: fullName,
        email: email,
        userType: userType || 'contractor',
        profileCreatedAt: now
      };
      profiles.push(profile);
    } else {
      profile.fullName = fullName;
      profile.email = email;
      profile.userType = userType || profile.userType || 'contractor';
      if (!profile.profileCreatedAt) profile.profileCreatedAt = now;
      profiles[0] = profile;
    }

    this._saveToStorage('account_profiles', profiles);

    // Optionally store credentials in a basic users table (non-auth, for completeness)
    let users = this._getFromStorage('users');
    const existingUserIdx = users.findIndex(function (u) { return u.email === email; });
    const userRecord = {
      id: this._generateId('user'),
      fullName: fullName,
      email: email,
      password: password,
      userType: userType || 'contractor',
      createdAt: now
    };
    if (existingUserIdx === -1) {
      users.push(userRecord);
    } else {
      users[existingUserIdx] = Object.assign({}, users[existingUserIdx], userRecord);
    }
    this._saveToStorage('users', users);

    return {
      accountProfile: profile,
      message: 'Account registered'
    };
  }

  // getAccountProfile()
  getAccountProfile() {
    const profiles = this._getFromStorage('account_profiles');
    const profile = profiles[0] || null;
    return { accountProfile: profile };
  }

  // updateAccountProfile(fullName, email, userType)
  updateAccountProfile(fullName, email, userType) {
    let profiles = this._getFromStorage('account_profiles');
    if (profiles.length === 0) {
      return { accountProfile: null };
    }

    let profile = profiles[0];
    if (fullName != null) profile.fullName = fullName;
    if (email != null) profile.email = email;
    if (userType != null) profile.userType = userType;

    profiles[0] = profile;
    this._saveToStorage('account_profiles', profiles);

    return { accountProfile: profile };
  }

  // getSavedResourcesList()
  getSavedResourcesList() {
    const list = this._getOrCreateSavedResourcesList();
    const itemsAll = this._getFromStorage('saved_resource_items');
    const itemsForList = itemsAll.filter(function (item) {
      return item.savedResourcesListId === list.id;
    });
    const articles = this._getFromStorage('resource_articles');

    const items = itemsForList.map(function (item) {
      const article = articles.find(function (a) { return a.id === item.articleId; }) || null;
      return {
        savedResourceItem: item,
        article: article
      };
    });

    return {
      savedResourcesList: list,
      items: items
    };
  }

  // addArticleToSavedResources(articleId)
  addArticleToSavedResources(articleId) {
    const list = this._getOrCreateSavedResourcesList();
    let itemsAll = this._getFromStorage('saved_resource_items');

    const exists = itemsAll.find(function (item) {
      return item.savedResourcesListId === list.id && item.articleId === articleId;
    });

    if (!exists) {
      const item = {
        id: this._generateId('saved_resource_item'),
        savedResourcesListId: list.id,
        articleId: articleId,
        savedAt: this._nowIso()
      };
      itemsAll.push(item);
      this._saveToStorage('saved_resource_items', itemsAll);
    }

    const itemsForList = itemsAll.filter(function (item) { return item.savedResourcesListId === list.id; });

    return {
      savedResourcesList: list,
      items: itemsForList
    };
  }

  // removeArticleFromSavedResources(articleId)
  removeArticleFromSavedResources(articleId) {
    const list = this._getOrCreateSavedResourcesList();
    let itemsAll = this._getFromStorage('saved_resource_items');

    itemsAll = itemsAll.filter(function (item) {
      return !(item.savedResourcesListId === list.id && item.articleId === articleId);
    });

    this._saveToStorage('saved_resource_items', itemsAll);

    const itemsForList = itemsAll.filter(function (item) { return item.savedResourcesListId === list.id; });

    return {
      savedResourcesList: list,
      items: itemsForList
    };
  }

  // getResourceFilterOptions(categoryId)
  getResourceFilterOptions(categoryId) {
    const articles = this._getFromStorage('resource_articles').filter(function (a) {
      return a.categoryId === categoryId;
    });
    const typeSet = new Set();
    articles.forEach(function (a) {
      if (a.resourceType) typeSet.add(a.resourceType);
    });
    const resourceTypeOptions = Array.from(typeSet);
    return { resourceTypeOptions: resourceTypeOptions };
  }

  // getResourceCategoryPageData(categoryId, searchQuery, resourceType, page, pageSize)
  getResourceCategoryPageData(categoryId, searchQuery, resourceType, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 20;

    const allArticles = this._getFromStorage('resource_articles');
    const q = searchQuery && typeof searchQuery === 'string' ? searchQuery.toLowerCase() : null;

    let filtered = allArticles.filter(function (a) {
      if (a.categoryId !== categoryId) return false;
      if (resourceType && a.resourceType && a.resourceType !== resourceType) return false;
      if (q) {
        const text = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.content || '')).toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        if (text.indexOf(q) === -1 && tags.indexOf(q) === -1) return false;
      }
      return true;
    });

    const totalItems = filtered.length;
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const pageArticles = filtered.slice(startIndex, startIndex + pageSize);

    return {
      categoryId: categoryId,
      searchQuery: searchQuery || null,
      resourceType: resourceType || null,
      pagination: {
        page: page,
        pageSize: pageSize,
        totalItems: totalItems,
        totalPages: totalPages
      },
      articles: pageArticles
    };
  }

  // getResourceArticleDetails(articleId)
  getResourceArticleDetails(articleId) {
    const articles = this._getFromStorage('resource_articles');
    const article = articles.find(function (a) { return a.id === articleId; }) || null;

    const list = this._getOrCreateSavedResourcesList();
    const savedItems = this._getFromStorage('saved_resource_items').filter(function (item) {
      return item.savedResourcesListId === list.id;
    });
    const isSaved = savedItems.some(function (item) { return item.articleId === articleId; });

    let relatedArticles = [];
    if (article) {
      relatedArticles = articles.filter(function (a) {
        return a.id !== article.id && a.categoryId === article.categoryId;
      }).slice(0, 5);
    }

    // No explicit mapping from resources to equipment categories; return empty list by default
    const relatedCategories = [];

    return {
      article: article,
      isSaved: isSaved,
      relatedArticles: relatedArticles,
      relatedCategories: relatedCategories
    };
  }

  // getAboutUsContent()
  getAboutUsContent() {
    const data = localStorage.getItem('about_us_content');
    if (data) {
      return JSON.parse(data);
    }
    return {
      companyOverview: '',
      experienceSummary: '',
      safetyStandards: '',
      services: [],
      depots: []
    };
  }

  // getContactInfo()
  getContactInfo() {
    const data = localStorage.getItem('contact_info');
    if (data) {
      return JSON.parse(data);
    }
    return {
      phoneNumbers: [],
      emailAddresses: [],
      depots: [],
      helpLinks: []
    };
  }

  // submitContactEnquiry(name, email, phone, enquiryType, subject, message)
  submitContactEnquiry(name, email, phone, enquiryType, subject, message) {
    const enquiries = this._getFromStorage('contact_enquiries');
    const enquiry = {
      id: this._generateId('contact_enquiry'),
      name: name,
      email: email,
      phone: phone || '',
      enquiryType: enquiryType || '',
      subject: subject || '',
      message: message,
      createdAt: this._nowIso()
    };
    enquiries.push(enquiry);
    this._saveToStorage('contact_enquiries', enquiries);
    return { success: true, message: 'Enquiry submitted' };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    const data = localStorage.getItem('help_faq_content');
    if (data) {
      return JSON.parse(data);
    }
    return { sections: [] };
  }

  // getHireTermsContent()
  getHireTermsContent() {
    const data = localStorage.getItem('hire_terms_content');
    if (data) {
      return JSON.parse(data);
    }
    return { content: '', lastUpdated: '' };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const data = localStorage.getItem('privacy_policy_content');
    if (data) {
      return JSON.parse(data);
    }
    return { content: '', lastUpdated: '' };
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