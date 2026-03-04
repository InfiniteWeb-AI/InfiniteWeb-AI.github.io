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
  }

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    // Core entity collections
    if (!localStorage.getItem('categories')) {
      localStorage.setItem('categories', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cart_items')) {
      localStorage.setItem('cart_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('wishlists')) {
      localStorage.setItem('wishlists', JSON.stringify([]));
    }
    if (!localStorage.getItem('wishlist_items')) {
      localStorage.setItem('wishlist_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('compare_lists')) {
      localStorage.setItem('compare_lists', JSON.stringify([]));
    }
    if (!localStorage.getItem('compare_items')) {
      localStorage.setItem('compare_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('orders')) {
      localStorage.setItem('orders', JSON.stringify([]));
    }
    if (!localStorage.getItem('order_items')) {
      localStorage.setItem('order_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('shipping_policies')) {
      localStorage.setItem('shipping_policies', JSON.stringify([]));
    }
    if (!localStorage.getItem('product_listing_states')) {
      localStorage.setItem('product_listing_states', JSON.stringify([]));
    }

    // Static / ancillary data
    if (!localStorage.getItem('static_pages')) {
      localStorage.setItem('static_pages', JSON.stringify({}));
    }
    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem('contact_info', JSON.stringify(null));
    }
    if (!localStorage.getItem('contact_forms')) {
      localStorage.setItem('contact_forms', JSON.stringify([]));
    }

    // Legacy keys from skeleton (kept for compatibility, not used directly)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  _formatCurrency(amount, currency) {
    const value = Number(amount) || 0;
    const symbol = currency === 'usd' ? '$' : '';
    return symbol + value.toFixed(2);
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _getAllCategories() {
    return this._getFromStorage('categories');
  }

  _getAllProducts() {
    return this._getFromStorage('products');
  }

  // -------------------------
  // Cart helpers (private)
  // -------------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    if (carts.length > 0) {
      return carts[0];
    }
    const now = this._nowIso();
    const cart = {
      id: this._generateId('cart'),
      createdAt: now,
      updatedAt: now,
      items: [],
      itemsCount: 0,
      subtotal: 0,
      estimatedShipping: 0,
      taxAmount: 0,
      total: 0,
      currency: 'usd',
      freeShippingThresholdReached: false,
      freeShippingProgressMessage: ''
    };
    carts.push(cart);
    this._saveToStorage('carts', carts);
    return cart;
  }

  _saveCart(cart) {
    const carts = this._getFromStorage('carts');
    const index = carts.findIndex(c => c.id === cart.id);
    if (index === -1) {
      carts.push(cart);
    } else {
      carts[index] = cart;
    }
    this._saveToStorage('carts', carts);
  }

  _getCartItems(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    return cartItems.filter(ci => ci.cartId === cartId);
  }

  _saveCartItem(cartItem) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex(ci => ci.id === cartItem.id);
    if (index === -1) {
      cartItems.push(cartItem);
    } else {
      cartItems[index] = cartItem;
    }
    this._saveToStorage('cart_items', cartItems);
  }

  _removeCartItemById(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const filtered = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', filtered);
  }

  _getPrimaryFreeShippingPolicy() {
    const policies = this.getActiveShippingPolicies();
    const candidates = policies.filter(p =>
      p.currency === 'usd' &&
      (p.appliesToShippingMethod === 'free_shipping' || p.appliesToShippingMethod === 'any') &&
      typeof p.freeShippingMinSubtotal === 'number'
    );
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => (a.freeShippingMinSubtotal || 0) - (b.freeShippingMinSubtotal || 0));
    return candidates[0];
  }

  _buildFreeShippingProgressMessage(subtotal, policy) {
    if (!policy || typeof policy.freeShippingMinSubtotal !== 'number') {
      return '';
    }
    const min = policy.freeShippingMinSubtotal;
    const max = typeof policy.freeShippingMaxSubtotal === 'number' ? policy.freeShippingMaxSubtotal : null;
    const s = Number(subtotal) || 0;
    if (s >= min && (max === null || s <= max)) {
      return 'You are eligible for free shipping.';
    }
    if (s < min) {
      const diff = min - s;
      return 'Add ' + this._formatCurrency(diff, policy.currency) + ' more to reach free shipping.';
    }
    if (max !== null && s > max) {
      return 'Free shipping applies to orders between ' +
        this._formatCurrency(min, policy.currency) + ' and ' +
        this._formatCurrency(max, policy.currency) + '.';
    }
    return '';
  }

  _applyShippingPoliciesToCart(cart) {
    const policy = this._getPrimaryFreeShippingPolicy();
    const subtotal = Number(cart.subtotal) || 0;
    let estimatedShipping = 0;
    let freeShippingThresholdReached = false;
    let progressMessage = '';

    if (policy) {
      const min = policy.freeShippingMinSubtotal;
      const max = typeof policy.freeShippingMaxSubtotal === 'number' ? policy.freeShippingMaxSubtotal : null;
      freeShippingThresholdReached = subtotal >= min && (max === null || subtotal <= max);
      progressMessage = this._buildFreeShippingProgressMessage(subtotal, policy);
      if (freeShippingThresholdReached && (policy.appliesToShippingMethod === 'free_shipping' || policy.appliesToShippingMethod === 'any')) {
        estimatedShipping = 0;
      } else {
        estimatedShipping = 5.99; // simple default shipping when not free
      }
    } else {
      // No free-shipping policy configured
      estimatedShipping = subtotal > 0 ? 5.99 : 0;
      freeShippingThresholdReached = false;
      progressMessage = '';
    }

    cart.estimatedShipping = estimatedShipping;
    cart.freeShippingThresholdReached = freeShippingThresholdReached;
    cart.freeShippingProgressMessage = progressMessage;
    return cart;
  }

  _recalculateCartTotals(cart) {
    const items = this._getCartItems(cart.id);
    let subtotal = 0;
    items.forEach(item => {
      subtotal += Number(item.lineSubtotal) || 0;
    });
    cart.itemsCount = items.length;
    cart.subtotal = subtotal;

    // Apply shipping policies
    this._applyShippingPoliciesToCart(cart);

    // Simple tax placeholder (could be zero if not configured)
    const taxAmount = 0;
    cart.taxAmount = taxAmount;
    cart.total = subtotal + (cart.estimatedShipping || 0) + taxAmount;
    cart.updatedAt = this._nowIso();
    this._saveCart(cart);
    return cart;
  }

  _buildLineDisplay(cartItem, product) {
    const currency = 'usd';
    const unitPriceLabel = this._formatCurrency(cartItem.unitPrice, currency) +
      (cartItem.unit === 'yards' ? ' / yard' : '');
    const lineSubtotalLabel = this._formatCurrency(cartItem.lineSubtotal, currency);
    const selectedOptionsSummary = (cartItem.selectedOptions || [])
      .map(opt => opt.name + ': ' + opt.value)
      .join(', ');
    return {
      productName: product ? product.name : cartItem.productNameSnapshot || '',
      thumbnailImage: product && product.thumbnailImage ? product.thumbnailImage : '',
      unitPriceLabel: unitPriceLabel,
      lineSubtotalLabel: lineSubtotalLabel,
      selectedOptionsSummary: selectedOptionsSummary
    };
  }

  _buildCartShippingEstimate(cart) {
    const currency = cart.currency || 'usd';
    const estimatedShipping = Number(cart.estimatedShipping) || 0;
    const hasFree = !!cart.freeShippingThresholdReached;
    const options = [];

    options.push({
      method: 'standard',
      label: 'Standard Shipping',
      cost: hasFree ? 0 : 5.99,
      isDefault: !hasFree
    });

    options.push({
      method: 'free_shipping',
      label: 'Free Shipping',
      cost: 0,
      isDefault: hasFree
    });

    options.push({
      method: 'expedited',
      label: 'Expedited Shipping',
      cost: hasFree ? 15.99 : 12.99,
      isDefault: false
    });

    return {
      estimatedShipping: estimatedShipping,
      currency: currency,
      shippingMethodOptions: options
    };
  }

  // -------------------------
  // Wishlist helpers (private)
  // -------------------------

  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage('wishlists');
    if (wishlists.length > 0) {
      return wishlists[0];
    }
    const wishlist = {
      id: this._generateId('wishlist'),
      createdAt: this._nowIso(),
      itemsCount: 0
    };
    wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);
    return wishlist;
  }

  _saveWishlist(wishlist) {
    const wishlists = this._getFromStorage('wishlists');
    const index = wishlists.findIndex(w => w.id === wishlist.id);
    if (index === -1) {
      wishlists.push(wishlist);
    } else {
      wishlists[index] = wishlist;
    }
    this._saveToStorage('wishlists', wishlists);
  }

  _getWishlistItems(wishlistId) {
    const items = this._getFromStorage('wishlist_items');
    return items.filter(i => i.wishlistId === wishlistId);
  }

  // -------------------------
  // Compare list helpers (private)
  // -------------------------

  _getOrCreateCompareList() {
    const lists = this._getFromStorage('compare_lists');
    let active = lists.find(l => l.isActive);
    if (active) return active;
    const list = {
      id: this._generateId('compare'),
      createdAt: this._nowIso(),
      isActive: true,
      maxItems: 4
    };
    lists.push(list);
    this._saveToStorage('compare_lists', lists);
    return list;
  }

  _saveCompareList(list) {
    const lists = this._getFromStorage('compare_lists');
    const index = lists.findIndex(l => l.id === list.id);
    if (index === -1) {
      lists.push(list);
    } else {
      lists[index] = list;
    }
    this._saveToStorage('compare_lists', lists);
  }

  _getCompareItems(compareListId) {
    const items = this._getFromStorage('compare_items');
    return items.filter(i => i.compareListId === compareListId);
  }

  // -------------------------
  // Listing & filtering helpers (private)
  // -------------------------

  _getDescendantCategoryIds(categoryId) {
    const categories = this._getAllCategories();
    const result = [];
    const toVisit = [];
    if (categoryId) {
      result.push(categoryId);
      toVisit.push(categoryId);
    }
    while (toVisit.length > 0) {
      const current = toVisit.pop();
      categories.forEach(cat => {
        if (cat.parentId === current && result.indexOf(cat.id) === -1) {
          result.push(cat.id);
          toVisit.push(cat.id);
        }
      });
    }
    return result;
  }

  _getProductsForCategory(categoryId) {
    const products = this._getAllProducts();
    if (!categoryId) return products.filter(p => p.status === 'active');
    const catIds = this._getDescendantCategoryIds(categoryId);
    return products.filter(p => {
      if (p.status !== 'active') return false;
      if (catIds.indexOf(p.categoryId) !== -1) return true;
      if (p.subcategoryId && catIds.indexOf(p.subcategoryId) !== -1) return true;
      return false;
    });
  }

  _buildListingState(contextType, options) {
    const now = this._nowIso();
    const baseProducts = options && options.baseProducts ? options.baseProducts : [];
    const listingState = {
      id: this._generateId('listing'),
      contextType: contextType,
      categoryId: options && options.categoryId ? options.categoryId : null,
      searchQuery: options && options.searchQuery ? options.searchQuery : null,
      priceMin: null,
      priceMax: null,
      ratingMin: null,
      materialFilter: null,
      patternStyleFilter: null,
      colorFamilyFilter: null,
      widthMinInches: null,
      packSizeMin: null,
      freeShippingOnly: false,
      fiberTypeFilter: null,
      usageTypeFilter: null,
      productSubtypeFilter: null,
      garmentTypeFilter: null,
      difficultyLevelFilter: null,
      sizeIncludes: null,
      patternFormatFilter: null,
      weightFilter: null,
      sortOption: 'popularity_default',
      showClearanceOnly: contextType === 'clearance_listing',
      lastUpdated: now,
      baseProductIds: baseProducts.map(p => p.id)
    };
    const allStates = this._getFromStorage('product_listing_states');
    allStates.push(listingState);
    this._saveToStorage('product_listing_states', allStates);
    return listingState;
  }

  _getListingStateById(listingStateId) {
    const states = this._getFromStorage('product_listing_states');
    return states.find(s => s.id === listingStateId) || null;
  }

  _saveListingState(state) {
    const states = this._getFromStorage('product_listing_states');
    const index = states.findIndex(s => s.id === state.id);
    if (index === -1) {
      states.push(state);
    } else {
      states[index] = state;
    }
    this._saveToStorage('product_listing_states', states);
  }

  _productMatchesFilters(product, listingState) {
    if (!product) return false;

    if (listingState.priceMin !== null && typeof listingState.priceMin === 'number') {
      if (product.price < listingState.priceMin) return false;
    }
    if (listingState.priceMax !== null && typeof listingState.priceMax === 'number') {
      if (product.price > listingState.priceMax) return false;
    }
    if (listingState.ratingMin !== null && typeof listingState.ratingMin === 'number') {
      const rating = typeof product.ratingAverage === 'number' ? product.ratingAverage : 0;
      if (rating < listingState.ratingMin) return false;
    }
    if (listingState.materialFilter && product.material && product.material !== listingState.materialFilter) {
      return false;
    }
    if (listingState.patternStyleFilter && product.patternStyle && product.patternStyle !== listingState.patternStyleFilter) {
      return false;
    }
    if (listingState.colorFamilyFilter && product.colorFamily && product.colorFamily !== listingState.colorFamilyFilter) {
      return false;
    }
    if (listingState.widthMinInches !== null && typeof listingState.widthMinInches === 'number') {
      const width = typeof product.widthInches === 'number' ? product.widthInches : 0;
      if (width < listingState.widthMinInches) return false;
    }
    if (listingState.packSizeMin !== null && typeof listingState.packSizeMin === 'number') {
      const ps = typeof product.packSize === 'number' ? product.packSize : 0;
      if (ps < listingState.packSizeMin) return false;
    }
    if (listingState.freeShippingOnly) {
      if (!product.freeShippingEligible) return false;
    }
    if (listingState.fiberTypeFilter && product.fiberType && product.fiberType !== listingState.fiberTypeFilter) {
      return false;
    }
    if (listingState.usageTypeFilter && product.usageType && product.usageType !== listingState.usageTypeFilter) {
      return false;
    }
    if (listingState.productSubtypeFilter && product.productSubtype && product.productSubtype !== listingState.productSubtypeFilter) {
      return false;
    }
    if (listingState.garmentTypeFilter && product.garmentType && product.garmentType !== listingState.garmentTypeFilter) {
      return false;
    }
    if (listingState.difficultyLevelFilter && product.difficultyLevel && product.difficultyLevel !== listingState.difficultyLevelFilter) {
      return false;
    }
    if (listingState.sizeIncludes !== null && typeof listingState.sizeIncludes === 'number') {
      const sizes = Array.isArray(product.sizesIncluded) ? product.sizesIncluded : [];
      if (sizes.indexOf(listingState.sizeIncludes) === -1) return false;
    }
    if (listingState.patternFormatFilter && product.patternFormat && product.patternFormat !== listingState.patternFormatFilter) {
      return false;
    }
    if (listingState.weightFilter && product.weightDescription && product.weightDescription !== listingState.weightFilter) {
      return false;
    }
    if (listingState.showClearanceOnly) {
      if (!product.isClearance) return false;
    }
    return true;
  }

  _applyFiltersToProducts(products, listingState) {
    if (!listingState) return products.slice();
    return products.filter(p => this._productMatchesFilters(p, listingState));
  }

  _sortProducts(products, sortOption) {
    const arr = products.slice();
    const option = sortOption || 'popularity_default';
    if (option === 'price_low_to_high') {
      arr.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (option === 'price_high_to_low') {
      arr.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (option === 'customer_rating_high_to_low') {
      arr.sort((a, b) => {
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        return rb - ra;
      });
    } else if (option === 'customer_rating_low_to_high') {
      arr.sort((a, b) => {
        const ra = typeof a.ratingAverage === 'number' ? a.ratingAverage : 0;
        const rb = typeof b.ratingAverage === 'number' ? b.ratingAverage : 0;
        return ra - rb;
      });
    } else if (option === 'best_selling' || option === 'popularity_default') {
      arr.sort((a, b) => {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        return pb - pa;
      });
    } else if (option === 'newest_first') {
      arr.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }
    return arr;
  }

  _buildFilterOptions(products) {
    const priceRange = { minAvailable: null, maxAvailable: null };
    const ratingOptionsSet = new Set();
    const materialsSet = new Set();
    const patternStylesSet = new Set();
    const colorFamiliesSet = new Set();
    const widthMap = new Map();
    const packSizesSet = new Set();
    const fiberTypesSet = new Set();
    const usageTypesSet = new Set();
    const productSubtypesSet = new Set();
    const garmentTypesSet = new Set();
    const difficultyLevelsSet = new Set();
    const sizeOptionsSet = new Set();
    const patternFormatsSet = new Set();
    const weightOptionsSet = new Set();
    let hasFreeShippingEligible = false;

    products.forEach(p => {
      if (typeof p.price === 'number') {
        if (priceRange.minAvailable === null || p.price < priceRange.minAvailable) {
          priceRange.minAvailable = p.price;
        }
        if (priceRange.maxAvailable === null || p.price > priceRange.maxAvailable) {
          priceRange.maxAvailable = p.price;
        }
      }
      if (typeof p.ratingAverage === 'number') {
        const r = Math.floor(p.ratingAverage);
        if (r >= 1 && r <= 5) ratingOptionsSet.add(r);
      }
      if (p.material) materialsSet.add(p.material);
      if (p.patternStyle) patternStylesSet.add(p.patternStyle);
      if (p.colorFamily) colorFamiliesSet.add(p.colorFamily);
      if (typeof p.widthInches === 'number') {
        const w = p.widthInches;
        if (!widthMap.has(w)) {
          widthMap.set(w, { label: w + '" and wider', minWidthInches: w });
        }
      }
      if (typeof p.packSize === 'number') {
        packSizesSet.add(p.packSize);
      }
      if (p.freeShippingEligible) {
        hasFreeShippingEligible = true;
      }
      if (p.fiberType) fiberTypesSet.add(p.fiberType);
      if (p.usageType) usageTypesSet.add(p.usageType);
      if (p.productSubtype) productSubtypesSet.add(p.productSubtype);
      if (p.garmentType) garmentTypesSet.add(p.garmentType);
      if (p.difficultyLevel) difficultyLevelsSet.add(p.difficultyLevel);
      if (Array.isArray(p.sizesIncluded)) {
        p.sizesIncluded.forEach(s => {
          if (typeof s === 'number') sizeOptionsSet.add(s);
        });
      }
      if (p.patternFormat) patternFormatsSet.add(p.patternFormat);
      if (p.weightDescription) weightOptionsSet.add(p.weightDescription);
    });

    const ratingOptions = Array.from(ratingOptionsSet).sort((a, b) => a - b);
    const materials = Array.from(materialsSet);
    const patternStyles = Array.from(patternStylesSet);
    const colorFamilies = Array.from(colorFamiliesSet);
    const widthOptions = Array.from(widthMap.values()).sort((a, b) => a.minWidthInches - b.minWidthInches);
    const packSizeOptions = Array.from(packSizesSet).sort((a, b) => a - b);
    const shippingOptions = hasFreeShippingEligible ? ['free_shipping_only'] : [];
    const fiberTypes = Array.from(fiberTypesSet);
    const usageTypes = Array.from(usageTypesSet);
    const productSubtypes = Array.from(productSubtypesSet);
    const garmentTypes = Array.from(garmentTypesSet);
    const difficultyLevels = Array.from(difficultyLevelsSet);
    const sizeOptions = Array.from(sizeOptionsSet).sort((a, b) => a - b);
    const patternFormats = Array.from(patternFormatsSet);
    const weightOptions = Array.from(weightOptionsSet);

    const sortOptions = [
      'price_low_to_high',
      'price_high_to_low',
      'customer_rating_high_to_low',
      'customer_rating_low_to_high',
      'best_selling',
      'popularity_default',
      'newest_first'
    ];

    return {
      priceRange: priceRange,
      ratingOptions: ratingOptions,
      materials: materials,
      patternStyles: patternStyles,
      colorFamilies: colorFamilies,
      widthOptions: widthOptions,
      packSizeOptions: packSizeOptions,
      shippingOptions: shippingOptions,
      fiberTypes: fiberTypes,
      usageTypes: usageTypes,
      productSubtypes: productSubtypes,
      garmentTypes: garmentTypes,
      difficultyLevels: difficultyLevels,
      sizeOptions: sizeOptions,
      patternFormats: patternFormats,
      weightOptions: weightOptions,
      sortOptions: sortOptions
    };
  }

  _buildBreadcrumb(categoryId) {
    const categories = this._getAllCategories();
    const breadcrumb = [];
    if (!categoryId) return breadcrumb;
    let currentId = categoryId;
    while (currentId) {
      const cat = categories.find(c => c.id === currentId);
      if (!cat) break;
      breadcrumb.unshift(cat);
      currentId = cat.parentId || null;
    }
    return this._resolveCategoryParents(breadcrumb);
  }

  _resolveCategoryParents(categories) {
    const all = this._getAllCategories();
    const map = {};
    all.forEach(c => {
      map[c.id] = c;
    });
    return categories.map(c => {
      const cloned = Object.assign({}, c);
      if (cloned.parentId) {
        cloned.parent = map[cloned.parentId] || null;
      } else {
        cloned.parent = null;
      }
      return cloned;
    });
  }

  _attachCategoryToListingState(listingState) {
    if (!listingState || !listingState.categoryId) return listingState;
    const categories = this._getAllCategories();
    const category = categories.find(c => c.id === listingState.categoryId) || null;
    const cloned = Object.assign({}, listingState);
    cloned.category = category;
    return cloned;
  }

  // -------------------------
  // Order helpers (private)
  // -------------------------

  _createDraftOrderFromCart() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    const orders = this._getFromStorage('orders');
    let order = orders.find(o => o.status === 'draft');
    const now = this._nowIso();
    const policy = this._getPrimaryFreeShippingPolicy();

    const shippingMethod = cart.freeShippingThresholdReached ? 'free_shipping' : 'standard';
    const shippingCost = cart.freeShippingThresholdReached ? 0 : (cart.estimatedShipping || 0);

    if (!order) {
      order = {
        id: this._generateId('order'),
        createdAt: now,
        placedAt: null,
        status: 'draft',
        itemsSubtotal: cart.subtotal || 0,
        shippingCost: shippingCost,
        taxAmount: cart.taxAmount || 0,
        totalAmount: (cart.subtotal || 0) + shippingCost + (cart.taxAmount || 0),
        currency: cart.currency || 'usd',
        shippingMethod: shippingMethod,
        shippingPolicyId: policy ? policy.id : null,
        shippingName: '',
        shippingAddressLine1: '',
        shippingAddressLine2: '',
        shippingCity: '',
        shippingState: '',
        shippingPostalCode: '',
        shippingCountry: '',
        contactEmail: '',
        contactPhone: '',
        billingName: '',
        billingAddressSameAsShipping: true,
        billingAddressLine1: '',
        billingAddressLine2: '',
        billingCity: '',
        billingState: '',
        billingPostalCode: '',
        billingCountry: '',
        paymentMethod: null,
        paymentStatus: 'unpaid'
      };
      orders.push(order);
    } else {
      order.itemsSubtotal = cart.subtotal || 0;
      order.shippingCost = shippingCost;
      order.taxAmount = cart.taxAmount || 0;
      order.totalAmount = (cart.subtotal || 0) + shippingCost + (cart.taxAmount || 0);
      order.currency = cart.currency || 'usd';
      order.shippingMethod = shippingMethod;
      order.shippingPolicyId = policy ? policy.id : null;
    }

    this._saveToStorage('orders', orders);

    // Build order items from cart items (snapshot)
    const orderItems = this._getFromStorage('order_items');
    const filtered = orderItems.filter(oi => oi.orderId !== order.id);
    const cartItems = this._getCartItems(cart.id);
    const products = this._getAllProducts();

    cartItems.forEach(ci => {
      const product = products.find(p => p.id === ci.productId) || null;
      const orderItem = {
        id: this._generateId('orderItem'),
        orderId: order.id,
        productId: ci.productId,
        productNameSnapshot: ci.productNameSnapshot || (product ? product.name : ''),
        unitPriceSnapshot: ci.unitPrice,
        quantity: ci.quantity,
        unit: ci.unit,
        lineSubtotal: ci.lineSubtotal,
        selectedOptionsSnapshot: ci.selectedOptions || []
      };
      filtered.push(orderItem);
    });

    this._saveToStorage('order_items', filtered);

    const freeShippingPolicy = this._getPrimaryFreeShippingPolicy();
    const freeShippingThresholdMin = freeShippingPolicy ? freeShippingPolicy.freeShippingMinSubtotal : null;
    const freeShippingThresholdMax = freeShippingPolicy ? freeShippingPolicy.freeShippingMaxSubtotal : null;
    const freeShippingThresholdReached = cart.freeShippingThresholdReached || false;

    return {
      order: order,
      items: filtered.filter(oi => oi.orderId === order.id),
      freeShippingThresholdMin: freeShippingThresholdMin,
      freeShippingThresholdMax: freeShippingThresholdMax,
      freeShippingThresholdReached: freeShippingThresholdReached
    };
  }

  _buildOrderShippingOptions(order, cart) {
    const policy = this._getPrimaryFreeShippingPolicy();
    const subtotal = cart ? (cart.subtotal || 0) : (order.itemsSubtotal || 0);
    const thresholdReached = cart ? !!cart.freeShippingThresholdReached : false;
    const options = [];

    const standardCost = thresholdReached ? 0 : 5.99;
    options.push({
      method: 'standard',
      label: 'Standard Shipping',
      cost: standardCost,
      isEligibleForFreeShipping: thresholdReached,
      isDefault: !thresholdReached
    });

    options.push({
      method: 'free_shipping',
      label: 'Free Shipping',
      cost: 0,
      isEligibleForFreeShipping: !!policy && subtotal >= (policy.freeShippingMinSubtotal || 0) &&
        (typeof policy.freeShippingMaxSubtotal !== 'number' || subtotal <= policy.freeShippingMaxSubtotal),
      isDefault: thresholdReached
    });

    options.push({
      method: 'expedited',
      label: 'Expedited Shipping',
      cost: thresholdReached ? 15.99 : 12.99,
      isEligibleForFreeShipping: false,
      isDefault: false
    });

    return options;
  }

  // -------------------------
  // Header / homepage
  // -------------------------

  getHeaderSummary() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getWishlistItems(wishlist.id);

    const policy = this._getPrimaryFreeShippingPolicy();
    const min = policy ? policy.freeShippingMinSubtotal : null;
    const max = policy ? policy.freeShippingMaxSubtotal : null;

    return {
      cart_items_count: cart.itemsCount || 0,
      cart_subtotal: cart.subtotal || 0,
      cart_currency: cart.currency || 'usd',
      free_shipping_threshold_min: min,
      free_shipping_threshold_max: max,
      free_shipping_progress_message: cart.freeShippingProgressMessage || '',
      free_shipping_threshold_reached: !!cart.freeShippingThresholdReached,
      wishlist_items_count: wishlistItems.length
    };
  }

  getHomePageData() {
    const categories = this._getAllCategories();
    const products = this._getAllProducts().filter(p => p.status === 'active');

    const mainCategories = this._resolveCategoryParents(
      categories.filter(c => c.isActive && !c.parentId)
    );
    const featuredSubcategories = this._resolveCategoryParents(
      categories.filter(c => c.isActive && !!c.parentId)
    );

    const featuredProducts = this._sortProducts(products, 'best_selling').slice(0, 12);

    const promotions = [];
    const policies = this.getActiveShippingPolicies();
    policies.forEach(p => {
      if (typeof p.freeShippingMinSubtotal === 'number') {
        promotions.push({
          id: 'shipping_policy_' + p.id,
          title: 'Free Shipping',
          message: 'Free shipping on orders between ' +
            this._formatCurrency(p.freeShippingMinSubtotal, p.currency) +
            (typeof p.freeShippingMaxSubtotal === 'number'
              ? (' and ' + this._formatCurrency(p.freeShippingMaxSubtotal, p.currency))
              : '+') + '.',
          promotion_type: 'shipping_threshold',
          shippingPolicySummary: {
            freeShippingMinSubtotal: p.freeShippingMinSubtotal,
            freeShippingMaxSubtotal: typeof p.freeShippingMaxSubtotal === 'number' ? p.freeShippingMaxSubtotal : null,
            currency: p.currency
          }
        });
      }
    });

    return {
      mainCategories: mainCategories,
      featuredSubcategories: featuredSubcategories,
      featuredProducts: featuredProducts,
      promotions: promotions
    };
  }

  // -------------------------
  // Product search & listings
  // -------------------------

  searchProducts(query) {
    const products = this._getAllProducts().filter(p => p.status === 'active');
    const q = (query || '').toLowerCase();
    const baseProducts = products.filter(p => {
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
    });

    const listingState = this._buildListingState('search_results', {
      searchQuery: query || '',
      baseProducts: baseProducts
    });

    const sortedProducts = this._sortProducts(baseProducts, listingState.sortOption);
    const filterOptions = this._buildFilterOptions(baseProducts);

    return {
      listingState: listingState,
      products: sortedProducts,
      filterOptions: filterOptions
    };
  }

  initCategoryListing(categoryId) {
    const categories = this._getAllCategories();
    const category = categories.find(c => c.id === categoryId) || null;
    const baseProducts = this._getProductsForCategory(categoryId).filter(p => p.status === 'active');

    const listingState = this._buildListingState('category_listing', {
      categoryId: categoryId,
      baseProducts: baseProducts
    });

    const sortedProducts = this._sortProducts(baseProducts, listingState.sortOption);
    const filterOptions = this._buildFilterOptions(baseProducts);
    const breadcrumb = category ? this._buildBreadcrumb(category.id) : [];

    const resolvedCategory = category ? this._resolveCategoryParents([category])[0] : null;

    return {
      category: resolvedCategory,
      breadcrumb: breadcrumb,
      listingState: listingState,
      products: sortedProducts,
      filterOptions: filterOptions
    };
  }

  getListingFilterOptions(listingStateId) {
    const listingState = this._getListingStateById(listingStateId);
    if (!listingState) {
      return {
        filterOptions: this._buildFilterOptions([])
      };
    }
    const products = this._getAllProducts();
    const baseProducts = listingState.baseProductIds && listingState.baseProductIds.length > 0
      ? products.filter(p => listingState.baseProductIds.indexOf(p.id) !== -1)
      : products;
    const filterOptions = this._buildFilterOptions(baseProducts);
    return {
      filterOptions: filterOptions
    };
  }

  updateListingFilters(listingStateId, filters) {
    const listingState = this._getListingStateById(listingStateId);
    if (!listingState) {
      return {
        listingState: null,
        products: [],
        productCount: 0,
        appliedFiltersSummary: { summaryText: '' }
      };
    }

    Object.keys(filters || {}).forEach(key => {
      const value = filters[key];
      if (typeof value !== 'undefined') {
        listingState[key] = value;
      }
    });
    listingState.lastUpdated = this._nowIso();
    this._saveListingState(listingState);

    const allProducts = this._getAllProducts();
    const baseProducts = listingState.baseProductIds && listingState.baseProductIds.length > 0
      ? allProducts.filter(p => listingState.baseProductIds.indexOf(p.id) !== -1)
      : allProducts;

    const filteredProducts = this._applyFiltersToProducts(baseProducts, listingState);
    const sortedProducts = this._sortProducts(filteredProducts, listingState.sortOption);

    const appliedParts = [];
    if (listingState.priceMax !== null) {
      appliedParts.push('Price ≤ ' + this._formatCurrency(listingState.priceMax, 'usd'));
    }
    if (listingState.priceMin !== null) {
      appliedParts.push('Price ≥ ' + this._formatCurrency(listingState.priceMin, 'usd'));
    }
    if (listingState.ratingMin !== null) {
      appliedParts.push('Rating ≥ ' + listingState.ratingMin + '★');
    }
    if (listingState.materialFilter) appliedParts.push('Material ' + listingState.materialFilter);
    if (listingState.patternStyleFilter) appliedParts.push('Pattern ' + listingState.patternStyleFilter);
    if (listingState.colorFamilyFilter) appliedParts.push('Color ' + listingState.colorFamilyFilter);
    if (listingState.freeShippingOnly) appliedParts.push('Free Shipping');

    const appliedFiltersSummary = {
      summaryText: appliedParts.join(', ')
    };

    const resolvedListingState = this._attachCategoryToListingState(listingState);

    return {
      listingState: resolvedListingState,
      products: sortedProducts,
      productCount: sortedProducts.length,
      appliedFiltersSummary: appliedFiltersSummary
    };
  }

  updateListingSort(listingStateId, sortOption) {
    const listingState = this._getListingStateById(listingStateId);
    if (!listingState) {
      return {
        listingState: null,
        products: []
      };
    }
    listingState.sortOption = sortOption;
    listingState.lastUpdated = this._nowIso();
    this._saveListingState(listingState);

    const allProducts = this._getAllProducts();
    const baseProducts = listingState.baseProductIds && listingState.baseProductIds.length > 0
      ? allProducts.filter(p => listingState.baseProductIds.indexOf(p.id) !== -1)
      : allProducts;

    const filteredProducts = this._applyFiltersToProducts(baseProducts, listingState);
    const sortedProducts = this._sortProducts(filteredProducts, listingState.sortOption);

    const resolvedListingState = this._attachCategoryToListingState(listingState);

    return {
      listingState: resolvedListingState,
      products: sortedProducts
    };
  }

  // -------------------------
  // Product details
  // -------------------------

  getProductDetails(productId) {
    const products = this._getAllProducts();
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        breadcrumb: [],
        primaryImage: '',
        imageGallery: [],
        ratingSummary: { ratingAverage: 0, ratingCount: 0 },
        quantityConfig: null,
        patternOptions: { sizesIncluded: [], includesSize10: false },
        shippingInfo: {
          freeShippingEligible: false,
          shippingBadge: 'none',
          freeShippingThresholdMin: null,
          freeShippingThresholdMax: null,
          freeShippingProgressMessage: '',
          freeShippingThresholdReached: false
        },
        compareEligible: false,
        wishlistEligible: false,
        relatedProducts: []
      };
    }

    const categoryIdForBreadcrumb = product.subcategoryId || product.categoryId || null;
    const breadcrumb = this._buildBreadcrumb(categoryIdForBreadcrumb);

    const primaryImage = product.thumbnailImage || (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '');
    const imageGallery = Array.isArray(product.images) && product.images.length > 0 ? product.images : (primaryImage ? [primaryImage] : []);

    const ratingSummary = {
      ratingAverage: typeof product.ratingAverage === 'number' ? product.ratingAverage : 0,
      ratingCount: typeof product.ratingCount === 'number' ? product.ratingCount : 0
    };

    const unitMap = {
      per_yard: 'yards',
      per_meter: 'meters',
      per_piece: 'pieces',
      per_pack: 'packs',
      per_item: 'items'
    };
    const defaultUnit = unitMap[product.unitOfMeasure] || 'items';
    const quantityConfig = {
      minOrderQuantity: typeof product.minOrderQuantity === 'number' ? product.minOrderQuantity : 1,
      maxOrderQuantity: typeof product.maxOrderQuantity === 'number' ? product.maxOrderQuantity : null,
      step: typeof product.minOrderQuantity === 'number' && product.minOrderQuantity > 0 ? product.minOrderQuantity : 1,
      defaultUnit: defaultUnit,
      allowedUnits: [defaultUnit]
    };

    const sizesIncluded = Array.isArray(product.sizesIncluded) ? product.sizesIncluded : [];
    const patternOptions = {
      sizesIncluded: sizesIncluded,
      includesSize10: sizesIncluded.indexOf(10) !== -1
    };

    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const policy = this._getPrimaryFreeShippingPolicy();

    const shippingInfo = {
      freeShippingEligible: !!product.freeShippingEligible,
      shippingBadge: product.shippingBadge || 'none',
      freeShippingThresholdMin: policy ? policy.freeShippingMinSubtotal : null,
      freeShippingThresholdMax: policy ? policy.freeShippingMaxSubtotal : null,
      freeShippingProgressMessage: cart.freeShippingProgressMessage || '',
      freeShippingThresholdReached: !!cart.freeShippingThresholdReached
    };

    const compareEligible = product.productType === 'sewing_machine' || product.categoryId === 'sewing_machines';
    const wishlistEligible = true;

    const relatedProducts = this._getAllProducts()
      .filter(p => p.status === 'active' && p.id !== product.id && (p.categoryId === product.categoryId || p.subcategoryId === product.subcategoryId))
      .slice(0, 8);

    // Resolve category and subcategory foreign keys
    const categories = this._getAllCategories();
    const category = categories.find(c => c.id === product.categoryId) || null;
    const subcategory = product.subcategoryId ? (categories.find(c => c.id === product.subcategoryId) || null) : null;
    const productWithCategories = Object.assign({}, product, {
      category: category,
      subcategory: subcategory
    });

    return {
      product: productWithCategories,
      breadcrumb: breadcrumb,
      primaryImage: primaryImage,
      imageGallery: imageGallery,
      ratingSummary: ratingSummary,
      quantityConfig: quantityConfig,
      patternOptions: patternOptions,
      shippingInfo: shippingInfo,
      compareEligible: compareEligible,
      wishlistEligible: wishlistEligible,
      relatedProducts: relatedProducts
    };
  }

  // -------------------------
  // Cart interfaces
  // -------------------------

  addToCart(productId, quantity, unit, selectedOptions) {
    const products = this._getAllProducts();
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found.',
        cart: null,
        items: [],
        freeShippingProgressMessage: '',
        freeShippingThresholdReached: false
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const unitMap = {
      per_yard: 'yards',
      per_meter: 'meters',
      per_piece: 'pieces',
      per_pack: 'packs',
      per_item: 'items'
    };
    const defaultUnit = unitMap[product.unitOfMeasure] || 'items';
    const finalUnit = unit || defaultUnit;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    // Merge with existing cart item if same product & unit & options
    let existing = null;
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cartId === cart.id && ci.productId === product.id && ci.unit === finalUnit) {
        const existingOptions = ci.selectedOptions || [];
        const newOptions = selectedOptions || [];
        const sameLength = existingOptions.length === newOptions.length;
        let sameOptions = sameLength;
        if (sameLength) {
          for (let j = 0; j < existingOptions.length; j++) {
            const eo = existingOptions[j];
            const no = newOptions[j];
            if (!no || eo.name !== no.name || eo.value !== no.value) {
              sameOptions = false;
              break;
            }
          }
        }
        if (sameOptions) {
          existing = ci;
          break;
        }
      }
    }

    const unitPrice = product.price;

    if (existing) {
      existing.quantity = (existing.quantity || 0) + qty;
      existing.lineSubtotal = existing.unitPrice * existing.quantity;
      existing.addedAt = this._nowIso();
      this._saveCartItem(existing);
    } else {
      const cartItem = {
        id: this._generateId('cartItem'),
        cartId: cart.id,
        productId: product.id,
        productNameSnapshot: product.name,
        quantity: qty,
        unit: finalUnit,
        unitPrice: unitPrice,
        lineSubtotal: unitPrice * qty,
        selectedOptions: selectedOptions || [],
        addedAt: this._nowIso()
      };
      this._saveCartItem(cartItem);
    }

    this._recalculateCartTotals(cart);

    const allCartItems = this._getCartItems(cart.id);
    const items = allCartItems.map(ci => {
      const p = products.find(pr => pr.id === ci.productId) || null;
      return {
        cartItem: ci,
        product: p,
        lineDisplay: this._buildLineDisplay(ci, p)
      };
    });

    return {
      success: true,
      message: 'Added to cart.',
      cart: cart,
      items: items,
      freeShippingProgressMessage: cart.freeShippingProgressMessage || '',
      freeShippingThresholdReached: !!cart.freeShippingThresholdReached
    };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const products = this._getAllProducts();
    const cartItems = this._getCartItems(cart.id);

    const items = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.productId) || null;
      return {
        cartItem: ci,
        product: product,
        lineDisplay: this._buildLineDisplay(ci, product)
      };
    });

    const shippingEstimate = this._buildCartShippingEstimate(cart);

    return {
      cart: cart,
      items: items,
      shippingEstimate: shippingEstimate,
      freeShippingProgressMessage: cart.freeShippingProgressMessage || '',
      freeShippingThresholdReached: !!cart.freeShippingThresholdReached
    };
  }

  updateCartItemQuantity(cartItemId, quantity, unit) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex(ci => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null,
        updatedItem: null,
        items: [],
        freeShippingProgressMessage: '',
        freeShippingThresholdReached: false
      };
    }
    const cartItem = cartItems[index];
    const newQty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    cartItem.quantity = newQty;
    if (unit) {
      cartItem.unit = unit;
    }
    cartItem.lineSubtotal = cartItem.unitPrice * cartItem.quantity;
    cartItems[index] = cartItem;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === cartItem.cartId) || this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    const products = this._getAllProducts();
    const updatedCartItems = this._getCartItems(cart.id);
    const items = updatedCartItems.map(ci => {
      const product = products.find(p => p.id === ci.productId) || null;
      return {
        cartItem: ci,
        product: product,
        lineDisplay: this._buildLineDisplay(ci, product)
      };
    });

    return {
      success: true,
      message: 'Cart updated.',
      cart: cart,
      updatedItem: cartItem,
      items: items,
      freeShippingProgressMessage: cart.freeShippingProgressMessage || '',
      freeShippingThresholdReached: !!cart.freeShippingThresholdReached
    };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const cartItem = cartItems.find(ci => ci.id === cartItemId) || null;
    if (!cartItem) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null,
        items: [],
        freeShippingProgressMessage: '',
        freeShippingThresholdReached: false
      };
    }

    this._removeCartItemById(cartItemId);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === cartItem.cartId) || this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    const products = this._getAllProducts();
    const updatedCartItems = this._getCartItems(cart.id);
    const items = updatedCartItems.map(ci => {
      const product = products.find(p => p.id === ci.productId) || null;
      return {
        cartItem: ci,
        product: product,
        lineDisplay: this._buildLineDisplay(ci, product)
      };
    });

    return {
      success: true,
      message: 'Cart item removed.',
      cart: cart,
      items: items,
      freeShippingProgressMessage: cart.freeShippingProgressMessage || '',
      freeShippingThresholdReached: !!cart.freeShippingThresholdReached
    };
  }

  // -------------------------
  // Checkout & orders
  // -------------------------

  beginCheckout() {
    const draft = this._createDraftOrderFromCart();
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const shippingOptions = this._buildOrderShippingOptions(draft.order, cart);

    // Resolve shipping policy foreign key
    const policies = this.getActiveShippingPolicies();
    const policy = draft.order.shippingPolicyId
      ? (policies.find(p => p.id === draft.order.shippingPolicyId) || null)
      : null;
    const orderWithPolicy = Object.assign({}, draft.order, {
      shippingPolicy: policy
    });

    // Attach product for each order item
    const allProducts = this._getAllProducts();
    const itemsWithProduct = draft.items.map(oi => {
      const product = allProducts.find(p => p.id === oi.productId) || null;
      return Object.assign({}, oi, { product: product });
    });

    return {
      order: orderWithPolicy,
      items: itemsWithProduct,
      shippingOptions: shippingOptions,
      freeShippingThresholdMin: draft.freeShippingThresholdMin,
      freeShippingThresholdMax: draft.freeShippingThresholdMax,
      freeShippingThresholdReached: draft.freeShippingThresholdReached
    };
  }

  getCheckoutState(orderId) {
    const orders = this._getFromStorage('orders');
    let order = null;
    if (orderId) {
      order = orders.find(o => o.id === orderId) || null;
    } else {
      order = orders.length > 0 ? orders[orders.length - 1] : null;
    }

    if (!order) {
      return {
        order: null,
        items: [],
        shippingOptions: []
      };
    }

    const orderItems = this._getFromStorage('order_items').filter(oi => oi.orderId === order.id);
    const products = this._getAllProducts();
    const itemsWithProduct = orderItems.map(oi => {
      const product = products.find(p => p.id === oi.productId) || null;
      return Object.assign({}, oi, { product: product });
    });

    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const shippingOptions = this._buildOrderShippingOptions(order, cart);

    // Resolve shipping policy
    const policies = this.getActiveShippingPolicies();
    const policy = order.shippingPolicyId
      ? (policies.find(p => p.id === order.shippingPolicyId) || null)
      : null;
    const orderWithPolicy = Object.assign({}, order, {
      shippingPolicy: policy
    });

    return {
      order: orderWithPolicy,
      items: itemsWithProduct,
      shippingOptions: shippingOptions
    };
  }

  placeOrder(orderId, shippingDetails, billingDetails, shippingMethod, paymentMethod) {
    const orders = this._getFromStorage('orders');
    const order = orders.find(o => o.id === orderId) || null;
    if (!order) {
      return {
        success: false,
        message: 'Order not found.',
        order: null,
        items: []
      };
    }

    order.shippingName = shippingDetails.shippingName || '';
    order.shippingAddressLine1 = shippingDetails.shippingAddressLine1 || '';
    order.shippingAddressLine2 = shippingDetails.shippingAddressLine2 || '';
    order.shippingCity = shippingDetails.shippingCity || '';
    order.shippingState = shippingDetails.shippingState || '';
    order.shippingPostalCode = shippingDetails.shippingPostalCode || '';
    order.shippingCountry = shippingDetails.shippingCountry || '';
    order.contactEmail = shippingDetails.contactEmail || '';
    order.contactPhone = shippingDetails.contactPhone || '';

    const billingSame = billingDetails && typeof billingDetails.billingAddressSameAsShipping === 'boolean'
      ? billingDetails.billingAddressSameAsShipping
      : true;

    if (billingSame) {
      order.billingAddressSameAsShipping = true;
      order.billingName = order.shippingName;
      order.billingAddressLine1 = order.shippingAddressLine1;
      order.billingAddressLine2 = order.shippingAddressLine2;
      order.billingCity = order.shippingCity;
      order.billingState = order.shippingState;
      order.billingPostalCode = order.shippingPostalCode;
      order.billingCountry = order.shippingCountry;
    } else if (billingDetails) {
      order.billingAddressSameAsShipping = false;
      order.billingName = billingDetails.billingName || '';
      order.billingAddressLine1 = billingDetails.billingAddressLine1 || '';
      order.billingAddressLine2 = billingDetails.billingAddressLine2 || '';
      order.billingCity = billingDetails.billingCity || '';
      order.billingState = billingDetails.billingState || '';
      order.billingPostalCode = billingDetails.billingPostalCode || '';
      order.billingCountry = billingDetails.billingCountry || '';
    }

    order.shippingMethod = shippingMethod;
    order.paymentMethod = paymentMethod;
    order.paymentStatus = 'paid';
    order.status = 'paid';
    order.placedAt = this._nowIso();

    // Adjust shipping cost for selected method
    if (shippingMethod === 'free_shipping') {
      order.shippingCost = 0;
    } else if (shippingMethod === 'expedited') {
      order.shippingCost = 12.99;
    } else {
      // standard
      if (!order.shippingCost || order.shippingCost < 0) {
        order.shippingCost = 5.99;
      }
    }
    order.totalAmount = order.itemsSubtotal + order.shippingCost + (order.taxAmount || 0);

    this._saveToStorage('orders', orders);

    const orderItems = this._getFromStorage('order_items').filter(oi => oi.orderId === order.id);
    const products = this._getAllProducts();
    const itemsWithProduct = orderItems.map(oi => {
      const product = products.find(p => p.id === oi.productId) || null;
      return Object.assign({}, oi, { product: product });
    });

    // Resolve shipping policy
    const policies = this.getActiveShippingPolicies();
    const policy = order.shippingPolicyId
      ? (policies.find(p => p.id === order.shippingPolicyId) || null)
      : null;
    const orderWithPolicy = Object.assign({}, order, {
      shippingPolicy: policy
    });

    return {
      success: true,
      message: 'Order placed successfully.',
      order: orderWithPolicy,
      items: itemsWithProduct
    };
  }

  // -------------------------
  // Wishlist interfaces
  // -------------------------

  addProductToWishlist(productId) {
    const products = this._getAllProducts();
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found.',
        wishlist: null,
        items: []
      };
    }

    const wishlist = this._getOrCreateWishlist();
    const items = this._getWishlistItems(wishlist.id);
    const existing = items.find(i => i.productId === productId);
    if (existing) {
      // Already in wishlist
    } else {
      const wishlistItem = {
        id: this._generateId('wishlistItem'),
        wishlistId: wishlist.id,
        productId: productId,
        addedAt: this._nowIso()
      };
      const all = this._getFromStorage('wishlist_items');
      all.push(wishlistItem);
      this._saveToStorage('wishlist_items', all);
    }

    const updatedItems = this._getWishlistItems(wishlist.id);
    wishlist.itemsCount = updatedItems.length;
    this._saveWishlist(wishlist);

    const itemsWithProducts = updatedItems.map(wi => {
      const p = products.find(pr => pr.id === wi.productId) || null;
      return {
        wishlistItem: wi,
        product: p
      };
    });

    return {
      success: true,
      message: 'Added to wishlist.',
      wishlist: wishlist,
      items: itemsWithProducts
    };
  }

  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const products = this._getAllProducts();
    const items = this._getWishlistItems(wishlist.id);

    const itemsWithDisplay = items.map(wi => {
      const product = products.find(p => p.id === wi.productId) || null;
      const price = product ? this._formatCurrency(product.price, product.currency || 'usd') : '';
      return {
        wishlistItem: wi,
        product: product,
        display: {
          productName: product ? product.name : '',
          thumbnailImage: product && product.thumbnailImage ? product.thumbnailImage : '',
          priceLabel: price
        }
      };
    });

    wishlist.itemsCount = items.length;
    this._saveWishlist(wishlist);

    return {
      wishlist: wishlist,
      items: itemsWithDisplay
    };
  }

  removeWishlistItem(wishlistItemId) {
    const items = this._getFromStorage('wishlist_items');
    const item = items.find(wi => wi.id === wishlistItemId) || null;
    if (!item) {
      return {
        success: false,
        message: 'Wishlist item not found.',
        wishlist: null,
        items: []
      };
    }
    const filtered = items.filter(wi => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', filtered);

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getWishlistItems(wishlist.id);
    wishlist.itemsCount = wishlistItems.length;
    this._saveWishlist(wishlist);

    const products = this._getAllProducts();
    const itemsWithProducts = wishlistItems.map(wi => {
      const product = products.find(p => p.id === wi.productId) || null;
      return {
        wishlistItem: wi,
        product: product
      };
    });

    return {
      success: true,
      message: 'Wishlist item removed.',
      wishlist: wishlist,
      items: itemsWithProducts
    };
  }

  moveWishlistItemToCart(wishlistItemId, quantity, unit, removeFromWishlist) {
    const wishlistItems = this._getFromStorage('wishlist_items');
    const wishlistItem = wishlistItems.find(wi => wi.id === wishlistItemId) || null;
    if (!wishlistItem) {
      return {
        success: false,
        message: 'Wishlist item not found.',
        cart: null,
        cartItems: [],
        wishlist: null,
        wishlistItems: []
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const addResult = this.addToCart(wishlistItem.productId, qty, unit, []);

    if (removeFromWishlist) {
      const filtered = wishlistItems.filter(wi => wi.id !== wishlistItemId);
      this._saveToStorage('wishlist_items', filtered);
    }

    const wishlist = this._getOrCreateWishlist();
    const remainingWishlistItems = this._getWishlistItems(wishlist.id);
    wishlist.itemsCount = remainingWishlistItems.length;
    this._saveWishlist(wishlist);

    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const cartItems = this._getCartItems(cart.id);

    return {
      success: addResult.success,
      message: addResult.message,
      cart: cart,
      cartItems: cartItems,
      wishlist: wishlist,
      wishlistItems: remainingWishlistItems
    };
  }

  // -------------------------
  // Compare interfaces
  // -------------------------

  addProductToCompare(productId) {
    const products = this._getAllProducts();
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found.',
        compareList: null,
        items: []
      };
    }

    const compareList = this._getOrCreateCompareList();
    const items = this._getCompareItems(compareList.id);

    if (items.find(i => i.productId === productId)) {
      // already in compare list
    } else {
      if (compareList.maxItems && items.length >= compareList.maxItems) {
        return {
          success: false,
          message: 'Comparison list is full.',
          compareList: compareList,
          items: items.map(ci => ({
            compareItem: ci,
            product: products.find(p => p.id === ci.productId) || null
          }))
        };
      }
      const compareItem = {
        id: this._generateId('compareItem'),
        compareListId: compareList.id,
        productId: productId,
        addedAt: this._nowIso()
      };
      const all = this._getFromStorage('compare_items');
      all.push(compareItem);
      this._saveToStorage('compare_items', all);
    }

    const updatedItems = this._getCompareItems(compareList.id);
    const itemsWithProducts = updatedItems.map(ci => {
      const p = products.find(pr => pr.id === ci.productId) || null;
      return {
        compareItem: ci,
        product: p
      };
    });

    return {
      success: true,
      message: 'Added to compare list.',
      compareList: compareList,
      items: itemsWithProducts
    };
  }

  removeCompareItem(compareItemId) {
    const items = this._getFromStorage('compare_items');
    const item = items.find(ci => ci.id === compareItemId) || null;
    if (!item) {
      return {
        success: false,
        message: 'Compare item not found.',
        compareList: null,
        items: []
      };
    }
    const filtered = items.filter(ci => ci.id !== compareItemId);
    this._saveToStorage('compare_items', filtered);

    const compareList = this._getOrCreateCompareList();
    const products = this._getAllProducts();
    const listItems = this._getCompareItems(compareList.id);
    const itemsWithProducts = listItems.map(ci => ({
      compareItem: ci,
      product: products.find(p => p.id === ci.productId) || null
    }));

    return {
      success: true,
      message: 'Removed from compare list.',
      compareList: compareList,
      items: itemsWithProducts
    };
  }

  getCompareView(compareListId) {
    let compareList = null;
    const lists = this._getFromStorage('compare_lists');
    if (compareListId) {
      compareList = lists.find(l => l.id === compareListId) || null;
    }
    if (!compareList) {
      compareList = this._getOrCreateCompareList();
    }

    const products = this._getAllProducts();
    const items = this._getCompareItems(compareList.id).map(ci => ({
      compareItem: ci,
      product: products.find(p => p.id === ci.productId) || null
    }));

    const comparisonRows = [];

    // Name row
    comparisonRows.push({
      attributeKey: 'name',
      label: 'Name',
      values: items.map(i => ({
        productId: i.product ? i.product.id : null,
        displayValue: i.product ? i.product.name : '',
        highlight: false
      }))
    });

    // Price row
    comparisonRows.push({
      attributeKey: 'price',
      label: 'Price',
      values: items.map(i => ({
        productId: i.product ? i.product.id : null,
        displayValue: i.product ? this._formatCurrency(i.product.price, i.product.currency || 'usd') : '',
        highlight: false
      }))
    });

    // Rating row
    comparisonRows.push({
      attributeKey: 'ratingAverage',
      label: 'Customer Rating',
      values: items.map(i => ({
        productId: i.product ? i.product.id : null,
        displayValue: typeof (i.product && i.product.ratingAverage) === 'number' ? String(i.product.ratingAverage) : '0',
        highlight: false
      }))
    });

    // Built-in stitches row (with highlight)
    const stitchCounts = items.map(i => (i.product && typeof i.product.builtInStitches === 'number') ? i.product.builtInStitches : 0);
    const maxStitches = stitchCounts.reduce((max, v) => v > max ? v : max, 0);

    comparisonRows.push({
      attributeKey: 'built_in_stitches',
      label: 'Built-in stitches',
      values: items.map((i, idx) => ({
        productId: i.product ? i.product.id : null,
        displayValue: String(stitchCounts[idx] || 0),
        highlight: stitchCounts[idx] === maxStitches && maxStitches > 0
      }))
    });

    return {
      compareList: compareList,
      items: items,
      comparisonRows: comparisonRows
    };
  }

  // -------------------------
  // Static pages & contact
  // -------------------------

  getStaticPageContent(pageKey) {
    const pages = this._getFromStorage('static_pages', {});
    const pageData = pages && pages[pageKey] ? pages[pageKey] : null;
    if (pageData) {
      return {
        pageKey: pageKey,
        title: pageData.title || '',
        sections: Array.isArray(pageData.sections) ? pageData.sections : []
      };
    }

    const titleMap = {
      about_us: 'About Us',
      help_faq: 'Help & FAQ',
      shipping_returns: 'Shipping & Returns',
      contact: 'Contact'
    };
    const title = titleMap[pageKey] || pageKey;

    return {
      pageKey: pageKey,
      title: title,
      sections: []
    };
  }

  getContactInfo() {
    const info = this._getFromStorage('contact_info', null);
    if (info) {
      return info;
    }
    return {
      email: '',
      phone: '',
      mailingAddress: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: ''
      },
      supportHours: '',
      supportTimeZone: ''
    };
  }

  submitContactForm(name, email, subject, message, topic, orderNumber) {
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        message: 'Missing required fields.',
        ticketId: null
      };
    }
    const forms = this._getFromStorage('contact_forms');
    const ticketId = this._generateId('ticket');
    const entry = {
      id: ticketId,
      name: name,
      email: email,
      subject: subject,
      message: message,
      topic: topic || 'other',
      orderNumber: orderNumber || null,
      createdAt: this._nowIso()
    };
    forms.push(entry);
    this._saveToStorage('contact_forms', forms);
    return {
      success: true,
      message: 'Your message has been submitted.',
      ticketId: ticketId
    };
  }

  // -------------------------
  // Shipping policies
  // -------------------------

  getActiveShippingPolicies() {
    const policies = this._getFromStorage('shipping_policies');
    return policies.filter(p => p.isActive);
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
