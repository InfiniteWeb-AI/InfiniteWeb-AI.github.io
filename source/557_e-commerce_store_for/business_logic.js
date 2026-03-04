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
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    this._ensureStorageKey('categories', []); // Category
    this._ensureStorageKey('products', []); // Product
    this._ensureStorageKey('product_reviews', []); // ProductReview

    this._ensureStorageKey('cart', []); // array of Cart
    this._ensureStorageKey('cart_items', []); // array of CartItem

    this._ensureStorageKey('wishlists', []); // array of Wishlist
    this._ensureStorageKey('wishlist_items', []); // array of WishlistItem

    this._ensureStorageKey('promo_codes', []); // PromoCode
    this._ensureStorageKey('shipping_methods', []); // ShippingMethod
    this._ensureStorageKey('shipping_options', []); // ShippingOption

    // Additional tables for non-modeled data
    this._ensureStorageKey('orders', []);
    this._ensureStorageKey('page_content', {});
    this._ensureStorageKey('faq_entries', []);
    this._ensureStorageKey('contact_requests', []);

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _ensureStorageKey(key, defaultValue) {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || typeof data === 'undefined') {
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

  _now() {
    return new Date().toISOString();
  }

  _indexById(arr) {
    const map = {};
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (item && item.id) {
        map[item.id] = item;
      }
    }
    return map;
  }

  // ---------------------- Core private helpers ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let cart = carts.find(c => c && c.status === 'active');

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        items: [], // array of CartItem IDs
        subtotal: 0,
        discountTotal: 0,
        shippingZip: null,
        appliedPromoCodeId: null,
        selectedShippingOptionId: null,
        shippingCost: 0,
        taxTotal: 0,
        grandTotal: 0,
        shippingOptions: [], // array of ShippingOption IDs
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('cart', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    cart.updatedAt = this._now();
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('cart', carts);
    return cart;
  }

  _isPromoCurrentlyValid(promo) {
    if (!promo || !promo.isActive) return false;
    const now = new Date();
    if (promo.validFrom) {
      const from = new Date(promo.validFrom);
      if (now < from) return false;
    }
    if (promo.validTo) {
      const to = new Date(promo.validTo);
      if (now > to) return false;
    }
    return true;
  }

  _findActivePromoByCode(promoCode, currentSubtotal) {
    const code = (promoCode || '').trim().toLowerCase();
    if (!code) return null;
    const promos = this._getFromStorage('promo_codes', []);
    const promo = promos.find(p => p.code && p.code.toLowerCase() === code);
    if (!promo) return null;
    if (!this._isPromoCurrentlyValid(promo)) return null;
    if (typeof promo.minOrderSubtotal === 'number' && promo.minOrderSubtotal > 0) {
      if (typeof currentSubtotal === 'number' && currentSubtotal < promo.minOrderSubtotal) {
        return null;
      }
    }
    return promo;
  }

  _recalculateCartTotals(cart) {
    if (!cart) {
      cart = this._getOrCreateCart();
    }

    const allCartItems = this._getFromStorage('cart_items', []);
    const cartItems = [];
    let subtotal = 0;
    let modified = false;

    for (let i = 0; i < allCartItems.length; i++) {
      const item = allCartItems[i];
      if (item.cartId === cart.id) {
        const lineSubtotal = Number((item.unitPrice * item.quantity).toFixed(2));
        if (item.lineSubtotal !== lineSubtotal) {
          item.lineSubtotal = lineSubtotal;
          modified = true;
        }
        subtotal += lineSubtotal;
        cartItems.push(item);
      }
    }

    if (modified) {
      this._saveToStorage('cart_items', allCartItems);
    }

    subtotal = Number(subtotal.toFixed(2));

    let discountTotal = 0;
    let promo = null;

    if (cart.appliedPromoCodeId) {
      const promos = this._getFromStorage('promo_codes', []);
      promo = promos.find(p => p.id === cart.appliedPromoCodeId) || null;
      if (!this._isPromoCurrentlyValid(promo)) {
        cart.appliedPromoCodeId = null;
        promo = null;
      }
    }

    if (promo) {
      if (typeof promo.minOrderSubtotal === 'number' && promo.minOrderSubtotal > 0 && subtotal < promo.minOrderSubtotal) {
        cart.appliedPromoCodeId = null;
        promo = null;
      }
    }

    if (promo) {
      if (promo.discountType === 'percentage') {
        discountTotal = Number((subtotal * (promo.discountValue || 0) / 100).toFixed(2));
      } else if (promo.discountType === 'fixed_amount') {
        discountTotal = Number(Math.min(promo.discountValue || 0, subtotal).toFixed(2));
      } else if (promo.discountType === 'free_shipping') {
        discountTotal = 0;
      }
    }

    const shippingOptions = this._getFromStorage('shipping_options', []);
    let shippingCost = 0;
    if (promo && promo.discountType === 'free_shipping') {
      shippingCost = 0;
    } else if (cart.selectedShippingOptionId) {
      const opt = shippingOptions.find(o => o.id === cart.selectedShippingOptionId);
      if (opt) {
        shippingCost = Number((opt.cost || 0).toFixed(2));
      }
    }

    const taxableAmount = Math.max(0, subtotal - discountTotal + shippingCost);
    const taxRate = 0.07;
    const taxTotal = Number((taxableAmount * taxRate).toFixed(2));
    const grandTotal = Number((subtotal - discountTotal + shippingCost + taxTotal).toFixed(2));

    cart.subtotal = subtotal;
    cart.discountTotal = discountTotal;
    cart.shippingCost = shippingCost;
    cart.taxTotal = taxTotal;
    cart.grandTotal = grandTotal;

    this._saveCart(cart);

    return { cart, cartItems };
  }

  _getCartCurrency(cartItems) {
    const products = this._getFromStorage('products', []);
    const productById = this._indexById(products);
    for (let i = 0; i < cartItems.length; i++) {
      const p = productById[cartItems[i].productId];
      if (p && p.currency) {
        return p.currency;
      }
    }
    return 'USD';
  }

  _buildTotalsSummary(cart, cartItems) {
    let itemCount = 0;
    for (let i = 0; i < cartItems.length; i++) {
      itemCount += cartItems[i].quantity;
    }
    const currency = this._getCartCurrency(cartItems);
    return {
      itemCount,
      subtotal: cart.subtotal || 0,
      discountTotal: cart.discountTotal || 0,
      shippingCost: cart.shippingCost || 0,
      taxTotal: cart.taxTotal || 0,
      grandTotal: cart.grandTotal || 0,
      currency
    };
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    let wishlist = wishlists[0];

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        items: [], // WishlistItem IDs
        createdAt: this._now(),
        updatedAt: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }

    return wishlist;
  }

  _saveWishlist(wishlist) {
    let wishlists = this._getFromStorage('wishlists', []);
    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    wishlist.updatedAt = this._now();
    if (idx >= 0) {
      wishlists[idx] = wishlist;
    } else {
      wishlists.push(wishlist);
    }
    this._saveToStorage('wishlists', wishlists);
    return wishlist;
  }

  _generateShippingOptionsForCart(cart, postalCode) {
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const allOptions = this._getFromStorage('shipping_options', []);
    const allCartItems = this._getFromStorage('cart_items', []);

    const cartItems = allCartItems.filter(ci => ci.cartId === cart.id);
    let itemCount = 0;
    for (let i = 0; i < cartItems.length; i++) {
      itemCount += cartItems[i].quantity;
    }

    const remaining = allOptions.filter(o => o.cartId !== cart.id);

    const newOptions = [];
    const now = new Date();

    for (let i = 0; i < shippingMethods.length; i++) {
      const method = shippingMethods[i];
      if (!method.isActive) continue;
      const baseCost = typeof method.baseCost === 'number' ? method.baseCost : 0;
      const perItem = typeof method.perItemSurcharge === 'number' ? method.perItemSurcharge : 0;
      const cost = Number((baseCost + perItem * itemCount).toFixed(2));

      const minDays = typeof method.estimatedMinDays === 'number' ? method.estimatedMinDays : 5;
      const maxDays = typeof method.estimatedMaxDays === 'number' ? method.estimatedMaxDays : 7;

      const minDate = new Date(now.getTime() + minDays * 24 * 60 * 60 * 1000).toISOString();
      const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000).toISOString();

      const option = {
        id: this._generateId('shipopt'),
        cartId: cart.id,
        shippingMethodId: method.id,
        destinationZip: postalCode,
        cost,
        estimatedDeliveryMinDate: minDate,
        estimatedDeliveryMaxDate: maxDate,
        isSelected: cart.selectedShippingOptionId === null ? false : cart.selectedShippingOptionId === method.id,
        createdAt: this._now()
      };
      newOptions.push(option);
    }

    const finalOptions = remaining.concat(newOptions);
    this._saveToStorage('shipping_options', finalOptions);

    cart.shippingZip = postalCode;
    cart.shippingOptions = newOptions.map(o => o.id);
    this._saveCart(cart);

    return newOptions;
  }

  // ---------------------- Interfaces ----------------------

  // 1. getMainCategoriesForNav()
  getMainCategoriesForNav() {
    const categories = this._getFromStorage('categories', []);
    return categories.filter(c => c.isActive && !c.parentCategoryId);
  }

  // 2. getHeaderStatus()
  getHeaderStatus() {
    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items', []);
    const cartItems = allCartItems.filter(ci => ci.cartId === cart.id);
    let cartItemCount = 0;
    for (let i = 0; i < cartItems.length; i++) {
      cartItemCount += cartItems[i].quantity;
    }

    const wishlist = this._getOrCreateWishlist();
    const allWishlistItems = this._getFromStorage('wishlist_items', []);
    const wishlistItemCount = allWishlistItems.filter(wi => wi.wishlistId === wishlist.id).length;

    const currency = this._getCartCurrency(cartItems);

    return {
      cartItemCount,
      wishlistItemCount,
      cartSubtotal: cart.subtotal || 0,
      currency
    };
  }

  // 3. getHomeFeaturedContent()
  getHomeFeaturedContent() {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const categoryById = this._indexById(categories);

    const featuredCategories = categories
      .filter(c => c.isActive && !c.parentCategoryId)
      .slice(0, 6);

    const featuredKits = products
      .filter(p => p.isKit && p.status === 'active')
      .slice(0, 12)
      .map(p => ({
        product: p,
        category: categoryById[p.categoryId] || null
      }));

    const themeMap = {};
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.themeTags || !Array.isArray(p.themeTags)) continue;
      for (let j = 0; j < p.themeTags.length; j++) {
        const tag = p.themeTags[j];
        if (!themeMap[tag]) themeMap[tag] = [];
        themeMap[tag].push(p);
      }
    }

    const featuredThemes = Object.keys(themeMap).map(tag => ({
      themeTag: tag,
      products: themeMap[tag].slice(0, 10)
    }));

    const promotions = [];

    return {
      featuredCategories,
      featuredKits,
      featuredThemes,
      promotions
    };
  }

  // 4. searchProducts(query, filters, sort, page, pageSize)
  searchProducts(query, filters, sort, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const categoryById = this._indexById(categories);

    const effectiveFilters = filters || {};
    const minPrice = typeof effectiveFilters.minPrice === 'number' ? effectiveFilters.minPrice : null;
    const maxPrice = typeof effectiveFilters.maxPrice === 'number' ? effectiveFilters.maxPrice : null;
    const minRating = typeof effectiveFilters.minRating === 'number' ? effectiveFilters.minRating : null;
    const freeShippingOnly = !!effectiveFilters.freeShippingOnly;
    const color = effectiveFilters.color || null;
    const themeTagsFilter = Array.isArray(effectiveFilters.themeTags) ? effectiveFilters.themeTags : null;
    const material = effectiveFilters.material || null;
    const balloonType = effectiveFilters.balloonType || null;
    const minPiecesIncluded = typeof effectiveFilters.minPiecesIncluded === 'number' ? effectiveFilters.minPiecesIncluded : null;
    const minGuestCount = typeof effectiveFilters.minGuestCount === 'number' ? effectiveFilters.minGuestCount : null;
    const maxGuestCount = typeof effectiveFilters.maxGuestCount === 'number' ? effectiveFilters.maxGuestCount : null;
    const isKit = typeof effectiveFilters.isKit === 'boolean' ? effectiveFilters.isKit : null;
    const kitType = effectiveFilters.kitType || null;

    let filtered = products.filter(p => p.status === 'active');

    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      filtered = filtered.filter(p => {
        const haystack = (
          ((p.name || '') + ' ' + (p.description || '') + ' ' + (Array.isArray(p.themeTags) ? p.themeTags.join(' ') : ''))
        ).toLowerCase();
        return tokens.every(token => haystack.indexOf(token) !== -1);
      });
    }

    filtered = filtered.filter(p => {
      if (minPrice !== null && p.price < minPrice) return false;
      if (maxPrice !== null && p.price > maxPrice) return false;
      if (minRating !== null) {
        const rating = typeof p.averageRating === 'number' ? p.averageRating : 0;
        if (rating < minRating) return false;
      }
      if (freeShippingOnly && !p.freeShippingEligible) return false;
      if (color && (p.color || '').toLowerCase() !== color.toLowerCase()) return false;
      if (material && (p.material || '').toLowerCase() !== material.toLowerCase()) return false;
      if (balloonType && (p.balloonType || '').toLowerCase() !== balloonType.toLowerCase()) return false;
      if (minPiecesIncluded !== null) {
        const pieces = typeof p.piecesIncluded === 'number' ? p.piecesIncluded : 0;
        if (pieces < minPiecesIncluded) return false;
      }
      if (minGuestCount !== null) {
        if (typeof p.maxGuestCount === 'number') {
          if (p.maxGuestCount < minGuestCount) return false;
        }
      }
      if (maxGuestCount !== null) {
        if (typeof p.minGuestCount === 'number') {
          if (p.minGuestCount > maxGuestCount) return false;
        }
      }
      if (isKit !== null && p.isKit !== isKit) return false;
      if (kitType && (p.kitType || '').toLowerCase() !== kitType.toLowerCase()) return false;
      if (themeTagsFilter && themeTagsFilter.length > 0) {
        const pTags = Array.isArray(p.themeTags) ? p.themeTags : [];
        const missing = themeTagsFilter.some(t => !pTags.includes(t));
        if (missing) return false;
      }
      return true;
    });

    const sortKey = sort || 'relevance';
    if (sortKey === 'price_low_to_high') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortKey === 'price_high_to_low') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortKey === 'rating_high_to_low') {
      filtered.sort((a, b) => {
        const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
        const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const cb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        return cb - ca;
      });
    } else if (sortKey === 'newest') {
      filtered.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }

    const total = filtered.length;
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageProducts = filtered.slice(start, end);

    const productsWithCategory = pageProducts.map(p => ({
      product: p,
      category: categoryById[p.categoryId] || null,
      subcategory: categoryById[p.subcategoryId] || null
    }));

    const appliedFilters = {};
    const filterKeys = [
      'minPrice', 'maxPrice', 'minRating', 'freeShippingOnly', 'color', 'themeTags',
      'material', 'balloonType', 'minPiecesIncluded', 'minGuestCount', 'maxGuestCount',
      'isKit', 'kitType'
    ];
    for (let i = 0; i < filterKeys.length; i++) {
      const key = filterKeys[i];
      if (Object.prototype.hasOwnProperty.call(effectiveFilters, key) && effectiveFilters[key] !== undefined && effectiveFilters[key] !== null) {
        appliedFilters[key] = effectiveFilters[key];
      }
    }

    return {
      total,
      page: pageNum,
      pageSize: size,
      products: productsWithCategory,
      appliedFilters
    };
  }

  // 5. getSearchFilterOptions(query)
  getSearchFilterOptions(query) {
    const q = (query || '').trim().toLowerCase();
    const products = this._getFromStorage('products', []);

    let filtered = products.filter(p => p.status === 'active');
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      filtered = filtered.filter(p => {
        const haystack = (
          ((p.name || '') + ' ' + (p.description || '') + ' ' + (Array.isArray(p.themeTags) ? p.themeTags.join(' ') : ''))
        ).toLowerCase();
        return tokens.every(token => haystack.indexOf(token) !== -1);
      });
    }

    let minPrice = null;
    let maxPrice = null;
    const colorsSet = new Set();
    const themeTagsSet = new Set();
    const materialsSet = new Set();
    const balloonTypesSet = new Set();
    const piecesValues = [];

    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (p.color) colorsSet.add(p.color);
      if (Array.isArray(p.themeTags)) {
        p.themeTags.forEach(t => themeTagsSet.add(t));
      }
      if (p.material) materialsSet.add(p.material);
      if (p.balloonType) balloonTypesSet.add(p.balloonType);
      if (typeof p.piecesIncluded === 'number') piecesValues.push(p.piecesIncluded);
    }

    const priceRanges = [];
    if (minPrice !== null && maxPrice !== null && minPrice <= maxPrice) {
      const span = maxPrice - minPrice;
      if (span <= 0) {
        priceRanges.push({ min: minPrice, max: maxPrice, label: `$${minPrice.toFixed(2)}` });
      } else {
        const step = span / 3;
        priceRanges.push({ min: minPrice, max: minPrice + step, label: `$${minPrice.toFixed(0)} - $${(minPrice + step).toFixed(0)}` });
        priceRanges.push({ min: minPrice + step, max: minPrice + 2 * step, label: `$${(minPrice + step).toFixed(0)} - $${(minPrice + 2 * step).toFixed(0)}` });
        priceRanges.push({ min: minPrice + 2 * step, max: maxPrice, label: `$${(minPrice + 2 * step).toFixed(0)} - $${maxPrice.toFixed(0)}` });
      }
    }

    const ratingOptions = [
      { minRating: 4.0, label: '4 stars & up' },
      { minRating: 4.5, label: '4.5 stars & up' }
    ];

    const shippingOptions = [
      { key: 'free_shipping', label: 'Free Shipping' }
    ];

    const piecesIncludedRanges = [];
    if (piecesValues.length > 0) {
      piecesValues.sort((a, b) => a - b);
      const minPieces = piecesValues[0];
      const maxPieces = piecesValues[piecesValues.length - 1];
      const span = maxPieces - minPieces;
      if (span <= 0) {
        piecesIncludedRanges.push({ min: minPieces, max: maxPieces, label: `${minPieces} pcs` });
      } else {
        const step = Math.max(10, Math.floor(span / 3));
        piecesIncludedRanges.push({ min: minPieces, max: minPieces + step, label: `${minPieces} - ${minPieces + step} pcs` });
        piecesIncludedRanges.push({ min: minPieces + step, max: minPieces + 2 * step, label: `${minPieces + step} - ${minPieces + 2 * step} pcs` });
        piecesIncludedRanges.push({ min: minPieces + 2 * step, max: maxPieces, label: `${minPieces + 2 * step}+ pcs` });
      }
    }

    return {
      priceRanges,
      ratingOptions,
      shippingOptions,
      colors: Array.from(colorsSet),
      themeTags: Array.from(themeTagsSet),
      materials: Array.from(materialsSet),
      piecesIncludedRanges,
      balloonTypes: Array.from(balloonTypesSet)
    };
  }

  // 6. getCategoryProducts(categoryId, subcategoryId, filters, sort, page, pageSize)
  getCategoryProducts(categoryId, subcategoryId, filters, sort, page, pageSize) {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const categoryById = this._indexById(categories);

    const category = categoryById[categoryId] || null;
    const subcategory = subcategoryId ? (categoryById[subcategoryId] || null) : null;

    const effectiveFilters = filters || {};
    const minPrice = typeof effectiveFilters.minPrice === 'number' ? effectiveFilters.minPrice : null;
    const maxPrice = typeof effectiveFilters.maxPrice === 'number' ? effectiveFilters.maxPrice : null;
    const minRating = typeof effectiveFilters.minRating === 'number' ? effectiveFilters.minRating : null;
    const freeShippingOnly = !!effectiveFilters.freeShippingOnly;
    const color = effectiveFilters.color || null;
    const themeTagsFilter = Array.isArray(effectiveFilters.themeTags) ? effectiveFilters.themeTags : null;
    const material = effectiveFilters.material || null;
    const balloonType = effectiveFilters.balloonType || null;
    const minPiecesIncluded = typeof effectiveFilters.minPiecesIncluded === 'number' ? effectiveFilters.minPiecesIncluded : null;
    const minGuestCount = typeof effectiveFilters.minGuestCount === 'number' ? effectiveFilters.minGuestCount : null;
    const maxGuestCount = typeof effectiveFilters.maxGuestCount === 'number' ? effectiveFilters.maxGuestCount : null;
    const isKit = typeof effectiveFilters.isKit === 'boolean' ? effectiveFilters.isKit : null;
    const kitType = effectiveFilters.kitType || null;

    let filtered = products.filter(p => p.status === 'active');

    filtered = filtered.filter(p => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (subcategoryId && p.subcategoryId !== subcategoryId) return false;
      return true;
    });

    filtered = filtered.filter(p => {
      if (minPrice !== null && p.price < minPrice) return false;
      if (maxPrice !== null && p.price > maxPrice) return false;
      if (minRating !== null) {
        const rating = typeof p.averageRating === 'number' ? p.averageRating : 0;
        if (rating < minRating) return false;
      }
      if (freeShippingOnly && !p.freeShippingEligible) return false;
      if (color && (p.color || '').toLowerCase() !== color.toLowerCase()) return false;
      if (material && (p.material || '').toLowerCase() !== material.toLowerCase()) return false;
      if (balloonType && (p.balloonType || '').toLowerCase() !== balloonType.toLowerCase()) return false;
      if (minPiecesIncluded !== null) {
        const pieces = typeof p.piecesIncluded === 'number' ? p.piecesIncluded : 0;
        if (pieces < minPiecesIncluded) return false;
      }
      if (minGuestCount !== null) {
        if (typeof p.maxGuestCount === 'number' && p.maxGuestCount < minGuestCount) return false;
      }
      if (maxGuestCount !== null) {
        if (typeof p.minGuestCount === 'number' && p.minGuestCount > maxGuestCount) return false;
      }
      if (isKit !== null && p.isKit !== isKit) return false;
      if (kitType && (p.kitType || '').toLowerCase() !== kitType.toLowerCase()) return false;
      if (themeTagsFilter && themeTagsFilter.length > 0) {
        const pTags = Array.isArray(p.themeTags) ? p.themeTags : [];
        const missing = themeTagsFilter.some(t => !pTags.includes(t));
        if (missing) return false;
      }
      return true;
    });

    const sortKey = sort || 'relevance';
    if (sortKey === 'price_low_to_high') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortKey === 'price_high_to_low') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortKey === 'rating_high_to_low') {
      filtered.sort((a, b) => {
        const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
        const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const cb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        return cb - ca;
      });
    } else if (sortKey === 'newest') {
      filtered.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }

    const total = filtered.length;
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageProducts = filtered.slice(start, end);

    const productsWithCategory = pageProducts.map(p => ({
      product: p,
      category: categoryById[p.categoryId] || null,
      subcategory: categoryById[p.subcategoryId] || null
    }));

    return {
      category,
      subcategory,
      total,
      page: pageNum,
      pageSize: size,
      products: productsWithCategory
    };
  }

  // 7. getCategoryFilterOptions(categoryId, subcategoryId)
  getCategoryFilterOptions(categoryId, subcategoryId) {
    const products = this._getFromStorage('products', []);

    let filtered = products.filter(p => p.status === 'active');
    filtered = filtered.filter(p => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (subcategoryId && p.subcategoryId !== subcategoryId) return false;
      return true;
    });

    let minPrice = null;
    let maxPrice = null;
    const colorsSet = new Set();
    const themeTagsSet = new Set();
    const materialsSet = new Set();
    const balloonTypesSet = new Set();
    const piecesValues = [];

    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (p.color) colorsSet.add(p.color);
      if (Array.isArray(p.themeTags)) {
        p.themeTags.forEach(t => themeTagsSet.add(t));
      }
      if (p.material) materialsSet.add(p.material);
      if (p.balloonType) balloonTypesSet.add(p.balloonType);
      if (typeof p.piecesIncluded === 'number') piecesValues.push(p.piecesIncluded);
    }

    const priceRanges = [];
    if (minPrice !== null && maxPrice !== null && minPrice <= maxPrice) {
      const span = maxPrice - minPrice;
      if (span <= 0) {
        priceRanges.push({ min: minPrice, max: maxPrice, label: `$${minPrice.toFixed(2)}` });
      } else {
        const step = span / 3;
        priceRanges.push({ min: minPrice, max: minPrice + step, label: `$${minPrice.toFixed(0)} - $${(minPrice + step).toFixed(0)}` });
        priceRanges.push({ min: minPrice + step, max: minPrice + 2 * step, label: `$${(minPrice + step).toFixed(0)} - $${(minPrice + 2 * step).toFixed(0)}` });
        priceRanges.push({ min: minPrice + 2 * step, max: maxPrice, label: `$${(minPrice + 2 * step).toFixed(0)} - $${maxPrice.toFixed(0)}` });
      }
    }

    const ratingOptions = [
      { minRating: 4.0, label: '4 stars & up' },
      { minRating: 4.5, label: '4.5 stars & up' }
    ];

    const shippingOptions = [
      { key: 'free_shipping', label: 'Free Shipping' }
    ];

    const piecesIncludedRanges = [];
    if (piecesValues.length > 0) {
      piecesValues.sort((a, b) => a - b);
      const minPieces = piecesValues[0];
      const maxPieces = piecesValues[piecesValues.length - 1];
      const span = maxPieces - minPieces;
      if (span <= 0) {
        piecesIncludedRanges.push({ min: minPieces, max: maxPieces, label: `${minPieces} pcs` });
      } else {
        const step = Math.max(10, Math.floor(span / 3));
        piecesIncludedRanges.push({ min: minPieces, max: minPieces + step, label: `${minPieces} - ${minPieces + step} pcs` });
        piecesIncludedRanges.push({ min: minPieces + step, max: minPieces + 2 * step, label: `${minPieces + step} - ${minPieces + 2 * step} pcs` });
        piecesIncludedRanges.push({ min: minPieces + 2 * step, max: maxPieces, label: `${minPieces + 2 * step}+ pcs` });
      }
    }

    return {
      priceRanges,
      ratingOptions,
      shippingOptions,
      colors: Array.from(colorsSet),
      themeTags: Array.from(themeTagsSet),
      materials: Array.from(materialsSet),
      piecesIncludedRanges,
      balloonTypes: Array.from(balloonTypesSet)
    };
  }

  // 8. getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const productReviews = this._getFromStorage('product_reviews', []);
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        subcategory: null,
        reviewSummary: { averageRating: 0, ratingCount: 0 },
        shippingSummary: { freeShippingEligible: false },
        isInWishlist: false,
        relatedProductsPreview: []
      };
    }

    const categoryById = this._indexById(categories);
    const category = categoryById[product.categoryId] || null;
    const subcategory = categoryById[product.subcategoryId] || null;

    const reviewsForProduct = productReviews.filter(r => r.productId === product.id);
    let avgRating = typeof product.averageRating === 'number' ? product.averageRating : 0;
    let ratingCount = typeof product.ratingCount === 'number' ? product.ratingCount : 0;

    if (reviewsForProduct.length > 0) {
      let sum = 0;
      for (let i = 0; i < reviewsForProduct.length; i++) {
        sum += reviewsForProduct[i].rating || 0;
      }
      avgRating = Number((sum / reviewsForProduct.length).toFixed(2));
      ratingCount = reviewsForProduct.length;
    }

    const shippingSummary = {
      freeShippingEligible: !!product.freeShippingEligible,
      estimatedDeliveryMinDate: null,
      estimatedDeliveryMaxDate: null
    };

    const isInWishlist = wishlistItems.some(wi => wi.wishlistId === wishlist.id && wi.productId === product.id);

    const relatedProductsPreview = this.getRelatedProducts(product.id).slice(0, 10);

    return {
      product,
      category,
      subcategory,
      reviewSummary: {
        averageRating: avgRating,
        ratingCount: ratingCount
      },
      shippingSummary,
      isInWishlist,
      relatedProductsPreview
    };
  }

  // 9. getProductReviews(productId, page, pageSize)
  getProductReviews(productId, page, pageSize) {
    const allReviews = this._getFromStorage('product_reviews', []);
    const reviewsForProduct = allReviews.filter(r => r.productId === productId);
    reviewsForProduct.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    const total = reviewsForProduct.length;
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 10;
    const start = (pageNum - 1) * size;
    const end = start + size;

    return {
      total,
      page: pageNum,
      pageSize: size,
      reviews: reviewsForProduct.slice(start, end)
    };
  }

  // 10. getRelatedProducts(productId)
  getRelatedProducts(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId);
    if (!product) return [];

    const baseTags = Array.isArray(product.themeTags) ? product.themeTags : [];
    const baseCategoryId = product.categoryId;

    const related = products.filter(p => {
      if (p.id === product.id) return false;
      if (p.status !== 'active') return false;
      if (p.categoryId === baseCategoryId) return true;
      const tags = Array.isArray(p.themeTags) ? p.themeTags : [];
      for (let i = 0; i < baseTags.length; i++) {
        if (tags.includes(baseTags[i])) return true;
      }
      return false;
    });

    related.sort((a, b) => {
      const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
      const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
      if (rb !== ra) return rb - ra;
      return a.price - b.price;
    });

    return related.slice(0, 20);
  }

  // 11. addToCart(productId, quantity = 1)
  addToCart(productId, quantity = 1) {
    if (!quantity || quantity <= 0) {
      return { success: false, message: 'Quantity must be greater than 0', cart: null, cartItem: null, cartSummary: null };
    }

    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, message: 'Product not found', cart: null, cartItem: null, cartSummary: null };
    }

    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items', []);

    let cartItem = allCartItems.find(ci => ci.cartId === cart.id && ci.productId === productId);
    if (cartItem) {
      cartItem.quantity += quantity;
      cartItem.lineSubtotal = Number((cartItem.unitPrice * cartItem.quantity).toFixed(2));
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId: product.id,
        productNameSnapshot: product.name,
        imageSnapshot: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
        unitPrice: product.price,
        quantity: quantity,
        lineSubtotal: Number((product.price * quantity).toFixed(2)),
        createdAt: this._now()
      };
      allCartItems.push(cartItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      if (!cart.items.includes(cartItem.id)) {
        cart.items.push(cartItem.id);
      }
    }

    this._saveToStorage('cart_items', allCartItems);

    const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);
    const totalsSummary = this._buildTotalsSummary(updatedCart, cartItems);

    return {
      success: true,
      message: 'Added to cart',
      cart: updatedCart,
      cartItem,
      cartSummary: totalsSummary
    };
  }

  // 12. getCartDetails()
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);
    const allProducts = this._getFromStorage('products', []);
    const productById = this._indexById(allProducts);

    const items = cartItems.map(ci => ({
      cartItem: ci,
      product: productById[ci.productId] || null
    }));

    const allShippingOptions = this._getFromStorage('shipping_options', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingMethodById = this._indexById(shippingMethods);

    const shippingOptions = allShippingOptions
      .filter(o => o.cartId === updatedCart.id)
      .map(o => ({
        shippingOption: o,
        shippingMethod: shippingMethodById[o.shippingMethodId] || null
      }));

    let appliedPromoCode = null;
    if (updatedCart.appliedPromoCodeId) {
      const promos = this._getFromStorage('promo_codes', []);
      appliedPromoCode = promos.find(p => p.id === updatedCart.appliedPromoCodeId) || null;
    }

    const totalsSummary = this._buildTotalsSummary(updatedCart, cartItems);

    return {
      cart: updatedCart,
      items,
      shippingOptions,
      appliedPromoCode,
      totalsSummary
    };
  }

  // 13. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    if (quantity <= 0) {
      return this.removeCartItem(cartItemId);
    }

    const allCartItems = this._getFromStorage('cart_items', []);
    const idx = allCartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);
      const allProducts = this._getFromStorage('products', []);
      const productById = this._indexById(allProducts);
      const items = cartItems.map(ci => ({ cartItem: ci, product: productById[ci.productId] || null }));
      const totalsSummary = this._buildTotalsSummary(updatedCart, cartItems);
      return { cart: updatedCart, items, totalsSummary };
    }

    const cartItem = allCartItems[idx];
    cartItem.quantity = quantity;
    cartItem.lineSubtotal = Number((cartItem.unitPrice * cartItem.quantity).toFixed(2));
    this._saveToStorage('cart_items', allCartItems);

    const cart = this._getOrCreateCart();
    const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);
    const allProducts = this._getFromStorage('products', []);
    const productById = this._indexById(allProducts);

    const items = cartItems.map(ci => ({
      cartItem: ci,
      product: productById[ci.productId] || null
    }));

    const totalsSummary = this._buildTotalsSummary(updatedCart, cartItems);

    return {
      cart: updatedCart,
      items,
      totalsSummary
    };
  }

  // 14. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let allCartItems = this._getFromStorage('cart_items', []);
    const item = allCartItems.find(ci => ci.id === cartItemId);
    allCartItems = allCartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', allCartItems);

    const cart = this._getOrCreateCart();
    if (item && Array.isArray(cart.items)) {
      cart.items = cart.items.filter(id => id !== cartItemId);
    }

    const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);
    const allProducts = this._getFromStorage('products', []);
    const productById = this._indexById(allProducts);

    const items = cartItems.map(ci => ({
      cartItem: ci,
      product: productById[ci.productId] || null
    }));

    const totalsSummary = this._buildTotalsSummary(updatedCart, cartItems);

    return {
      cart: updatedCart,
      items,
      totalsSummary
    };
  }

  // 15. estimateShippingOptionsForCart(postalCode)
  estimateShippingOptionsForCart(postalCode) {
    const cart = this._getOrCreateCart();
    const options = this._generateShippingOptionsForCart(cart, postalCode);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingMethodById = this._indexById(shippingMethods);

    const combined = options.map(o => ({
      shippingOption: o,
      shippingMethod: shippingMethodById[o.shippingMethodId] || null
    }));

    return {
      cart,
      shippingOptions: combined
    };
  }

  // 16. selectShippingOptionForCart(shippingOptionId)
  selectShippingOptionForCart(shippingOptionId) {
    const cart = this._getOrCreateCart();
    let shippingOptions = this._getFromStorage('shipping_options', []);

    const option = shippingOptions.find(o => o.id === shippingOptionId);
    if (!option || option.cartId !== cart.id) {
      const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);
      const totalsSummary = this._buildTotalsSummary(updatedCart, cartItems);
      return {
        cart: updatedCart,
        selectedShippingOption: null,
        shippingMethod: null,
        totalsSummary
      };
    }

    for (let i = 0; i < shippingOptions.length; i++) {
      if (shippingOptions[i].cartId === cart.id) {
        shippingOptions[i].isSelected = shippingOptions[i].id === shippingOptionId;
      }
    }

    this._saveToStorage('shipping_options', shippingOptions);

    cart.selectedShippingOptionId = shippingOptionId;

    const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);
    const totalsSummary = this._buildTotalsSummary(updatedCart, cartItems);

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingMethod = shippingMethods.find(m => m.id === option.shippingMethodId) || null;

    return {
      cart: updatedCart,
      selectedShippingOption: option,
      shippingMethod,
      totalsSummary
    };
  }

  // 17. applyPromoCodeToCart(promoCode)
  applyPromoCodeToCart(promoCode) {
    const cart = this._getOrCreateCart();
    const { cart: baselineCart, cartItems } = this._recalculateCartTotals(cart);
    const subtotal = baselineCart.subtotal || 0;

    const promo = this._findActivePromoByCode(promoCode, subtotal);
    if (!promo) {
      const totalsSummary = this._buildTotalsSummary(baselineCart, cartItems);
      return {
        success: false,
        message: 'Promo code is invalid or does not meet requirements',
        cart: baselineCart,
        appliedPromoCode: null,
        totalsSummary
      };
    }

    baselineCart.appliedPromoCodeId = promo.id;
    const { cart: updatedCart, cartItems: updatedItems } = this._recalculateCartTotals(baselineCart);
    const totalsSummary = this._buildTotalsSummary(updatedCart, updatedItems);

    return {
      success: true,
      message: 'Promo code applied',
      cart: updatedCart,
      appliedPromoCode: promo,
      totalsSummary
    };
  }

  // 18. removePromoCodeFromCart()
  removePromoCodeFromCart() {
    const cart = this._getOrCreateCart();
    cart.appliedPromoCodeId = null;
    const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);
    const totalsSummary = this._buildTotalsSummary(updatedCart, cartItems);

    return {
      cart: updatedCart,
      totalsSummary
    };
  }

  // 19. getWishlistDetails()
  getWishlistDetails() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);
    const productById = this._indexById(products);

    const items = wishlistItems
      .filter(wi => wi.wishlistId === wishlist.id)
      .map(wi => ({
        wishlistItem: wi,
        product: productById[wi.productId] || null
      }));

    return {
      wishlist,
      items
    };
  }

  // 20. addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId);
    if (!product) {
      const wishlist = this._getOrCreateWishlist();
      const wishlistItems = this._getFromStorage('wishlist_items', []);
      const count = wishlistItems.filter(wi => wi.wishlistId === wishlist.id).length;
      return { wishlist, wishlistItem: null, wishlistItemCount: count };
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    let existing = wishlistItems.find(wi => wi.wishlistId === wishlist.id && wi.productId === productId);
    if (existing) {
      const count = wishlistItems.filter(wi => wi.wishlistId === wishlist.id).length;
      return { wishlist, wishlistItem: existing, wishlistItemCount: count };
    }

    const wishlistItem = {
      id: this._generateId('wishlist_item'),
      wishlistId: wishlist.id,
      productId: product.id,
      productNameSnapshot: product.name,
      priceSnapshot: product.price,
      imageSnapshot: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
      addedAt: this._now()
    };

    wishlistItems.push(wishlistItem);
    this._saveToStorage('wishlist_items', wishlistItems);

    // Instrumentation for task completion tracking (task_9 - wishlist added items)
    try {
      let trackingDataRaw = localStorage.getItem('task9_wishlistAddedItems');
      let trackingData = { items: [] };

      if (trackingDataRaw !== null && typeof trackingDataRaw !== 'undefined') {
        try {
          const parsed = JSON.parse(trackingDataRaw);
          if (parsed && typeof parsed === 'object') {
            trackingData = parsed;
          }
        } catch (e) {
          trackingData = { items: [] };
        }
      }

      if (!trackingData || typeof trackingData !== 'object') {
        trackingData = { items: [] };
      }
      if (!Array.isArray(trackingData.items)) {
        trackingData.items = [];
      }

      trackingData.items.push({
        wishlistItemId: wishlistItem.id,
        productId: product.id,
        priceSnapshot: product.price,
        categoryId: product.categoryId,
        addedAt: this._now()
      });

      localStorage.setItem('task9_wishlistAddedItems', JSON.stringify(trackingData));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (!Array.isArray(wishlist.items)) wishlist.items = [];
    wishlist.items.push(wishlistItem.id);
    this._saveWishlist(wishlist);

    const count = wishlistItems.filter(wi => wi.wishlistId === wishlist.id).length;

    return {
      wishlist,
      wishlistItem,
      wishlistItemCount: count
    };
  }

  // 21. removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    // Determine if this wishlist item exists for the current wishlist (for instrumentation)
    let __task9_shouldTrackRemoval = false;
    for (let i = 0; i < wishlistItems.length; i++) {
      const wi = wishlistItems[i];
      if (wi.id === wishlistItemId && wi.wishlistId === wishlist.id) {
        __task9_shouldTrackRemoval = true;
        break;
      }
    }

    wishlistItems = wishlistItems.filter(wi => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    // Instrumentation for task completion tracking (task_9 - removed wishlist item)
    try {
      if (__task9_shouldTrackRemoval) {
        localStorage.setItem('task9_removedWishlistItemId', wishlistItemId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (Array.isArray(wishlist.items)) {
      wishlist.items = wishlist.items.filter(id => id !== wishlistItemId);
      this._saveWishlist(wishlist);
    }

    const products = this._getFromStorage('products', []);
    const productById = this._indexById(products);

    const items = wishlistItems
      .filter(wi => wi.wishlistId === wishlist.id)
      .map(wi => ({
        wishlistItem: wi,
        product: productById[wi.productId] || null
      }));

    const count = wishlistItems.filter(wi => wi.wishlistId === wishlist.id).length;

    return {
      wishlist,
      items,
      wishlistItemCount: count
    };
  }

  // 22. removeProductFromWishlist(productId)
  removeProductFromWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    wishlistItems = wishlistItems.filter(wi => !(wi.wishlistId === wishlist.id && wi.productId === productId));
    this._saveToStorage('wishlist_items', wishlistItems);

    if (Array.isArray(wishlist.items)) {
      const allIdsToRemove = wishlist.items.filter(id => {
        const wi = wishlistItems.find(x => x.id === id);
        return !wi;
      });
      if (allIdsToRemove.length > 0) {
        wishlist.items = wishlist.items.filter(id => !allIdsToRemove.includes(id));
        this._saveWishlist(wishlist);
      }
    }

    const products = this._getFromStorage('products', []);
    const productById = this._indexById(products);

    const items = wishlistItems
      .filter(wi => wi.wishlistId === wishlist.id)
      .map(wi => ({
        wishlistItem: wi,
        product: productById[wi.productId] || null
      }));

    const count = wishlistItems.filter(wi => wi.wishlistId === wishlist.id).length;

    return {
      wishlist,
      items,
      wishlistItemCount: count
    };
  }

  // 23. addWishlistItemToCart(wishlistItemId, quantity = 1)
  addWishlistItemToCart(wishlistItemId, quantity = 1) {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const wi = wishlistItems.find(x => x.id === wishlistItemId);
    if (!wi) {
      const cart = this._getOrCreateCart();
      const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);
      const totalsSummary = this._buildTotalsSummary(updatedCart, cartItems);
      const wishlist = this._getOrCreateWishlist();
      return { cart: updatedCart, cartItem: null, cartSummary: totalsSummary, wishlist };
    }

    const result = this.addToCart(wi.productId, quantity || 1);

    // Instrumentation for task completion tracking (task_9 - wishlist item added to cart)
    try {
      if (result && result.success === true) {
        localStorage.setItem('task9_wishlistItemAddedToCartId', wi.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const wishlist = this._getOrCreateWishlist();

    return {
      cart: result.cart,
      cartItem: result.cartItem,
      cartSummary: result.cartSummary,
      wishlist
    };
  }

  // 24. getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);
    const products = this._getFromStorage('products', []);
    const productById = this._indexById(products);

    const items = cartItems.map(ci => ({
      cartItem: ci,
      product: productById[ci.productId] || null
    }));

    const shippingOptions = this._getFromStorage('shipping_options', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingMethodById = this._indexById(shippingMethods);

    let selectedShippingOption = null;
    if (updatedCart.selectedShippingOptionId) {
      selectedShippingOption = shippingOptions.find(o => o.id === updatedCart.selectedShippingOptionId) || null;
    }

    const shippingMethod = selectedShippingOption ? (shippingMethodById[selectedShippingOption.shippingMethodId] || null) : null;

    let appliedPromoCode = null;
    if (updatedCart.appliedPromoCodeId) {
      const promos = this._getFromStorage('promo_codes', []);
      appliedPromoCode = promos.find(p => p.id === updatedCart.appliedPromoCodeId) || null;
    }

    const totalsSummary = this._buildTotalsSummary(updatedCart, cartItems);

    const shippingAddress = updatedCart.shippingAddress || {
      fullName: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      phone: ''
    };

    return {
      cart: updatedCart,
      items,
      selectedShippingOption,
      shippingMethod,
      appliedPromoCode,
      totalsSummary,
      shippingAddress
    };
  }

  // 25. placeOrder(shippingAddress, paymentMethod)
  placeOrder(shippingAddress, paymentMethod) {
    const cart = this._getOrCreateCart();
    const { cart: updatedCart, cartItems } = this._recalculateCartTotals(cart);

    if (!cartItems || cartItems.length === 0) {
      return {
        success: false,
        orderId: null,
        orderNumber: null,
        message: 'Cart is empty',
        estimatedDeliveryMinDate: null,
        estimatedDeliveryMaxDate: null
      };
    }

    if (!paymentMethod || !paymentMethod.paymentProvider || !paymentMethod.paymentToken) {
      return {
        success: false,
        orderId: null,
        orderNumber: null,
        message: 'Invalid payment method',
        estimatedDeliveryMinDate: null,
        estimatedDeliveryMaxDate: null
      };
    }

    const shippingOptions = this._getFromStorage('shipping_options', []);
    let selectedShippingOption = null;
    if (updatedCart.selectedShippingOptionId) {
      selectedShippingOption = shippingOptions.find(o => o.id === updatedCart.selectedShippingOptionId) || null;
    }

    let estimatedDeliveryMinDate = null;
    let estimatedDeliveryMaxDate = null;
    if (selectedShippingOption) {
      estimatedDeliveryMinDate = selectedShippingOption.estimatedDeliveryMinDate || null;
      estimatedDeliveryMaxDate = selectedShippingOption.estimatedDeliveryMaxDate || null;
    } else {
      const now = new Date();
      estimatedDeliveryMinDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
      estimatedDeliveryMaxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    const orders = this._getFromStorage('orders', []);
    const orderId = this._generateId('order');
    const orderNumber = 'P' + Date.now();

    const order = {
      id: orderId,
      orderNumber,
      cartSnapshot: updatedCart,
      items: cartItems,
      shippingAddress,
      paymentMethod: {
        paymentProvider: paymentMethod.paymentProvider,
        paymentToken: paymentMethod.paymentToken,
        cardBrand: paymentMethod.cardBrand || null,
        cardLast4: paymentMethod.cardLast4 || null
      },
      createdAt: this._now(),
      estimatedDeliveryMinDate,
      estimatedDeliveryMaxDate
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    updatedCart.status = 'checked_out';
    updatedCart.shippingAddress = shippingAddress;
    this._saveCart(updatedCart);

    return {
      success: true,
      orderId,
      orderNumber,
      message: 'Order placed successfully',
      estimatedDeliveryMinDate,
      estimatedDeliveryMaxDate
    };
  }

  // 26. getPageContent(pageKey)
  getPageContent(pageKey) {
    const pages = this._getFromStorage('page_content', {});
    if (pages && Object.prototype.hasOwnProperty.call(pages, pageKey)) {
      return pages[pageKey];
    }
    return {
      pageKey,
      title: '',
      bodyHtml: '',
      sections: []
    };
  }

  // 27. getFaqEntries()
  getFaqEntries() {
    return this._getFromStorage('faq_entries', []);
  }

  // 28. submitContactRequest(name, email, subject, message, preferredContactMethod)
  submitContactRequest(name, email, subject, message, preferredContactMethod) {
    const contactRequests = this._getFromStorage('contact_requests', []);

    const request = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      preferredContactMethod: preferredContactMethod || null,
      status: 'open',
      createdAt: this._now()
    };

    contactRequests.push(request);
    this._saveToStorage('contact_requests', contactRequests);

    return {
      success: true,
      message: 'Your request has been submitted',
      ticketId: request.id
    };
  }
}

// Global + Node.js export
if (typeof globalThis !== 'undefined') {
  globalThis.BusinessLogic = BusinessLogic;
  if (!globalThis.WebsiteSDK) {
    globalThis.WebsiteSDK = new BusinessLogic();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}