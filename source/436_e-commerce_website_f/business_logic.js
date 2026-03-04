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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const tables = {
      users: [],
      products: [],
      brands: [],
      categories: [],
      pages: [],
      navigation_links: [],
      carts: [],
      cart_items: [],
      wishlists: [],
      wishlist_items: [],
      product_comparison_sets: [],
      coupons: [],
      shipping_methods: [],
      checkout_sessions: [],
      faq_entries: [],
      contact_form_submissions: []
    };

    Object.keys(tables).forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(tables[key]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
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

  _parseDateToTs(value) {
    if (!value) return 0;
    const ts = Date.parse(value);
    return isNaN(ts) ? 0 : ts;
  }

  // ---------------------- Category helpers ----------------------

  _buildCategoryIndex() {
    const categories = this._getFromStorage('categories');
    const index = {};
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (c && c.code) {
        index[c.code] = c;
      }
    }
    return index;
  }

  _productBelongsToCategory(product, categoryCode, categoryIndex) {
    if (!product || !product.categoryCodes || !categoryCode) return false;
    const codes = product.categoryCodes || [];
    for (let i = 0; i < codes.length; i++) {
      let currentCode = codes[i];
      while (currentCode) {
        if (currentCode === categoryCode) return true;
        const cat = categoryIndex[currentCode];
        if (cat && cat.parentCategoryCode) {
          currentCode = cat.parentCategoryCode;
        } else {
          currentCode = null;
        }
      }
    }
    return false;
  }

  _getProductsForCategory(categoryCode) {
    const products = this._getFromStorage('products');
    const categoryIndex = this._buildCategoryIndex();
    return products.filter((p) => p && p.status === 'active' && this._productBelongsToCategory(p, categoryCode, categoryIndex));
  }

  _getProductsForBrand(brandId, categoryCode) {
    const products = this._getFromStorage('products');
    const categoryIndex = categoryCode ? this._buildCategoryIndex() : null;
    return products.filter((p) => {
      if (!p || p.status !== 'active') return false;
      if (p.brandId !== brandId) return false;
      if (!categoryCode) return true;
      return this._productBelongsToCategory(p, categoryCode, categoryIndex);
    });
  }

  // ---------------------- Product filter & sort helpers ----------------------

  _applyProductFilters(products, filters) {
    if (!filters) return products.slice();
    let result = products.slice();

    if (filters.minPrice != null) {
      result = result.filter((p) => typeof p.price === 'number' && p.price >= filters.minPrice);
    }
    if (filters.maxPrice != null) {
      result = result.filter((p) => typeof p.price === 'number' && p.price <= filters.maxPrice);
    }
    if (filters.minRating != null) {
      result = result.filter((p) => typeof p.averageRating === 'number' && p.averageRating >= filters.minRating);
    }
    if (filters.form) {
      result = result.filter((p) => p.form === filters.form);
    }
    if (filters.dietaryPreferences) {
      const d = filters.dietaryPreferences;
      if (d.isVegan === true) {
        result = result.filter((p) => !!p.isVegan);
      }
      if (d.isGlutenFree === true) {
        result = result.filter((p) => !!p.isGlutenFree);
      }
      if (d.isCaffeineFree === true) {
        result = result.filter((p) => !!p.isCaffeineFree);
      }
    }
    if (filters.purchaseOptions && filters.purchaseOptions.subscriptionAvailable === true) {
      result = result.filter((p) => !!p.isSubscriptionAvailable);
    }
    if (filters.minServingsPerContainer != null) {
      result = result.filter((p) => typeof p.servingsPerContainer === 'number' && p.servingsPerContainer >= filters.minServingsPerContainer);
    }
    if (filters.size && filters.size.minSizeValue != null && filters.size.sizeUnit) {
      const minSize = filters.size.minSizeValue;
      const unit = filters.size.sizeUnit;
      result = result.filter((p) => p.sizeUnit === unit && typeof p.sizeValue === 'number' && p.sizeValue >= minSize);
    }
    if (filters.strength && filters.strength.minStrengthAmount != null && filters.strength.strengthUnit) {
      const minStrength = filters.strength.minStrengthAmount;
      const sUnit = filters.strength.strengthUnit;
      result = result.filter((p) => p.strengthUnit === sUnit && typeof p.strengthAmount === 'number' && p.strengthAmount >= minStrength);
    }
    if (filters.flavor) {
      const fl = String(filters.flavor).toLowerCase();
      result = result.filter((p) => p.flavor && String(p.flavor).toLowerCase().indexOf(fl) !== -1);
    }
    if (filters.freeShippingOnly === true) {
      result = result.filter((p) => !!p.eligibleForFreeShipping);
    }

    return result;
  }

  _sortProducts(products, sortBy) {
    const arr = products.slice();
    const sb = sortBy || 'relevance';
    if (sb === 'price_low_to_high') {
      arr.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sb === 'price_high_to_low') {
      arr.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sb === 'best_selling' || sb === 'relevance') {
      arr.sort((a, b) => {
        const ar = a.bestSellerRank != null ? a.bestSellerRank : Number.MAX_SAFE_INTEGER;
        const br = b.bestSellerRank != null ? b.bestSellerRank : Number.MAX_SAFE_INTEGER;
        if (ar !== br) return ar - br;
        const ac = a.reviewCount != null ? a.reviewCount : 0;
        const bc = b.reviewCount != null ? b.reviewCount : 0;
        if (ac !== bc) return bc - ac;
        return (a.price || 0) - (b.price || 0);
      });
    } else if (sb === 'most_reviewed') {
      arr.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    } else if (sb === 'newest_arrivals') {
      arr.sort((a, b) => this._parseDateToTs(b.createdAt) - this._parseDateToTs(a.createdAt));
    } else if (sb === 'fastest_delivery') {
      arr.sort((a, b) => {
        const ad = a.fastestDeliveryDays != null ? a.fastestDeliveryDays : Number.MAX_SAFE_INTEGER;
        const bd = b.fastestDeliveryDays != null ? b.fastestDeliveryDays : Number.MAX_SAFE_INTEGER;
        if (ad !== bd) return ad - bd;
        return (a.price || 0) - (b.price || 0);
      });
    }
    return arr;
  }

  _resolveProductDisplayData(products) {
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');
    const brandIndex = {};
    const catIndex = {};
    for (let i = 0; i < brands.length; i++) {
      const b = brands[i];
      if (b && b.id) brandIndex[b.id] = b;
    }
    for (let j = 0; j < categories.length; j++) {
      const c = categories[j];
      if (c && c.code) catIndex[c.code] = c;
    }
    return products.map((p) => {
      const brand = p.brandId ? brandIndex[p.brandId] || null : null;
      const categoryNames = [];
      const codes = p.categoryCodes || [];
      for (let k = 0; k < codes.length; k++) {
        const cat = catIndex[codes[k]];
        if (cat && cat.name) categoryNames.push(cat.name);
      }
      const clone = Object.assign({}, p);
      clone.brandName = brand ? brand.name : '';
      clone.categoryNames = categoryNames;
      return clone;
    });
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      const c = carts[i];
      if (!c.status || c.status === 'active') {
        cart = c;
        break;
      }
    }
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        itemIds: [],
        appliedCouponCodes: [],
        selectedShippingMethodId: null,
        subtotal: 0,
        discountTotal: 0,
        shippingCost: 0,
        taxTotal: 0,
        total: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }

    // Ensure shipping method defaults if not set
    if (!cart.selectedShippingMethodId) {
      const methods = this._getFromStorage('shipping_methods');
      let def = null;
      for (let m = 0; m < methods.length; m++) {
        if (methods[m].isDefault) {
          def = methods[m];
          break;
        }
      }
      if (!def && methods.length > 0) def = methods[0];
      if (def) {
        cart.selectedShippingMethodId = def.id;
      }
      carts = this._getFromStorage('carts');
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === cart.id) {
          carts[i] = cart;
          break;
        }
      }
      this._saveToStorage('carts', carts);
    }

    // Recalculate totals based on latest items and shipping
    const allItems = this._getFromStorage('cart_items');
    this._recalculateCartTotals(cart, allItems, false);

    return cart;
  }

  _getCartItemsForCart(cartId) {
    const allItems = this._getFromStorage('cart_items');
    return allItems.filter((ci) => ci.cartId === cartId);
  }

  _getEnrichedCartItems(cartId) {
    const items = this._getCartItemsForCart(cartId);
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const productIndex = {};
    const brandIndex = {};
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p && p.id) productIndex[p.id] = p;
    }
    for (let j = 0; j < brands.length; j++) {
      const b = brands[j];
      if (b && b.id) brandIndex[b.id] = b;
    }
    const categories = this._getFromStorage('categories');
    const catIndex = {};
    for (let k = 0; k < categories.length; k++) {
      const c = categories[k];
      if (c && c.code) catIndex[c.code] = c;
    }

    return items.map((ci) => {
      const product = productIndex[ci.productId] || null;
      const brand = product && product.brandId ? (brandIndex[product.brandId] || null) : null;
      const categoryNames = [];
      if (product && product.categoryCodes) {
        for (let x = 0; x < product.categoryCodes.length; x++) {
          const cat = catIndex[product.categoryCodes[x]];
          if (cat && cat.name) categoryNames.push(cat.name);
        }
      }
      const enriched = Object.assign({}, ci);
      enriched.product = product;
      enriched.brand = brand;
      enriched.categoryNames = categoryNames;
      return enriched;
    });
  }

  _getAvailableShippingMethodsForCart(/* cart */) {
    // For now, all shipping methods are available regardless of cart contents
    return this._getFromStorage('shipping_methods');
  }

  _recalculateCartTotals(cart, allCartItems, skipCoupons) {
    if (!cart) return;
    const items = allCartItems.filter((ci) => ci.cartId === cart.id);
    let subtotal = 0;
    for (let i = 0; i < items.length; i++) {
      const ci = items[i];
      const lineTotal = typeof ci.lineTotal === 'number' ? ci.lineTotal : (ci.unitPrice || 0) * (ci.quantity || 0);
      subtotal += lineTotal;
    }

    // Base shipping from method
    const methods = this._getFromStorage('shipping_methods');
    let shippingCost = 0;
    if (cart.selectedShippingMethodId) {
      for (let m = 0; m < methods.length; m++) {
        if (methods[m].id === cart.selectedShippingMethodId) {
          shippingCost = methods[m].cost || 0;
          break;
        }
      }
    }

    cart.subtotal = subtotal;
    cart.discountTotal = 0;
    cart.shippingCost = shippingCost;
    cart.taxTotal = 0;

    if (!skipCoupons && cart.appliedCouponCodes && cart.appliedCouponCodes.length > 0) {
      // Only support a single coupon effectively; use the first
      const code = cart.appliedCouponCodes[0];
      this._validateAndApplyCoupon(cart, items, code, true);
    }

    const totalRaw = (cart.subtotal || 0) - (cart.discountTotal || 0) + (cart.shippingCost || 0) + (cart.taxTotal || 0);
    cart.total = totalRaw < 0 ? 0 : totalRaw;
    cart.updatedAt = new Date().toISOString();

    let carts = this._getFromStorage('carts');
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        break;
      }
    }
    this._saveToStorage('carts', carts);
  }

  _validateAndApplyCoupon(cart, cartItems, couponCode, recalcOnly) {
    const coupons = this._getFromStorage('coupons');
    if (!couponCode) {
      return { success: false, message: 'Coupon code is required' };
    }
    const codeNorm = String(couponCode).toLowerCase();
    let coupon = null;
    for (let i = 0; i < coupons.length; i++) {
      const c = coupons[i];
      if (c && c.code && String(c.code).toLowerCase() === codeNorm) {
        coupon = c;
        break;
      }
    }
    if (!coupon || !coupon.isActive) {
      if (!recalcOnly) {
        return { success: false, message: 'Invalid or inactive coupon' };
      }
      return { success: false, message: 'Invalid or inactive coupon' };
    }

    const nowTs = Date.now();
    if (coupon.validFrom) {
      const fromTs = this._parseDateToTs(coupon.validFrom);
      if (fromTs && nowTs < fromTs) {
        if (!recalcOnly) {
          return { success: false, message: 'Coupon not yet valid' };
        }
        return { success: false, message: 'Coupon not yet valid' };
      }
    }
    if (coupon.validTo) {
      const toTs = this._parseDateToTs(coupon.validTo);
      if (toTs && nowTs > toTs) {
        if (!recalcOnly) {
          return { success: false, message: 'Coupon expired' };
        }
        return { success: false, message: 'Coupon expired' };
      }
    }

    const products = this._getFromStorage('products');
    const categories = this._buildCategoryIndex();
    const productIndex = {};
    for (let p = 0; p < products.length; p++) {
      const prod = products[p];
      if (prod && prod.id) productIndex[prod.id] = prod;
    }

    let eligibleSubtotal = 0;
    const applicableCodes = coupon.applicableCategoryCodes || [];
    if (applicableCodes.length === 0) {
      for (let i = 0; i < cartItems.length; i++) {
        eligibleSubtotal += cartItems[i].lineTotal || 0;
      }
    } else {
      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        const product = productIndex[item.productId];
        if (!product) continue;
        let eligible = false;
        for (let j = 0; j < applicableCodes.length; j++) {
          const code = applicableCodes[j];
          if (this._productBelongsToCategory(product, code, categories)) {
            eligible = true;
            break;
          }
        }
        if (eligible) {
          eligibleSubtotal += item.lineTotal || 0;
        }
      }
    }

    if (coupon.minSubtotal != null && eligibleSubtotal < coupon.minSubtotal) {
      if (!recalcOnly) {
        return { success: false, message: 'Cart does not meet minimum subtotal for coupon' };
      }
      return { success: false, message: 'Cart does not meet minimum subtotal for coupon' };
    }

    let discountAmount = 0;
    let freeShipping = false;
    if (coupon.discountType === 'percent') {
      const pct = coupon.discountValue || 0;
      discountAmount = eligibleSubtotal * (pct / 100);
    } else if (coupon.discountType === 'fixed_amount') {
      const amt = coupon.discountValue || 0;
      discountAmount = amt > eligibleSubtotal ? eligibleSubtotal : amt;
    } else if (coupon.discountType === 'free_shipping') {
      freeShipping = true;
    }

    if (!recalcOnly) {
      cart.appliedCouponCodes = [coupon.code];
      cart.discountTotal = 0;
    }

    cart.discountTotal = (cart.discountTotal || 0) + (discountAmount || 0);
    if (freeShipping) {
      cart.shippingCost = 0;
    }

    return { success: true, message: 'Coupon applied' };
  }

  // ---------------------- Checkout helpers ----------------------

  _getOrCreateCheckoutSession(cartId) {
    let sessions = this._getFromStorage('checkout_sessions');
    let session = null;
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (s.cartId === cartId && s.status === 'in_progress') {
        session = s;
        break;
      }
    }
    if (!session) {
      session = {
        id: this._generateId('checkout'),
        cartId: cartId,
        status: 'in_progress',
        shippingFullName: null,
        shippingStreetAddress: null,
        shippingCity: null,
        shippingState: null,
        shippingPostalCode: null,
        shippingCountry: null,
        email: null,
        selectedShippingMethodId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }
    return session;
  }

  _getActiveCheckoutSession() {
    const sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].status === 'in_progress') return sessions[i];
    }
    return null;
  }

  _getOrCreateDefaultWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let wishlist = null;
    for (let i = 0; i < wishlists.length; i++) {
      if (wishlists[i].name === 'Default Wishlist') {
        wishlist = wishlists[i];
        break;
      }
    }
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'Default Wishlist',
        itemIds: [],
        createdAt: new Date().toISOString()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _getOrCreateComparisonSet() {
    let sets = this._getFromStorage('product_comparison_sets');
    let set = sets.length > 0 ? sets[0] : null;
    if (!set) {
      set = {
        id: this._generateId('compare'),
        productIds: [],
        createdAt: new Date().toISOString()
      };
      sets.push(set);
      this._saveToStorage('product_comparison_sets', sets);
    }
    return set;
  }

  _getPageContentByType(type) {
    const key = 'cms_' + type;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // ---------------------- Interface implementations ----------------------
  // Home page

  getHomePageContent() {
    const categories = this._getFromStorage('categories');
    const products = this._getFromStorage('products').filter((p) => p.status === 'active');

    const featuredCategories = categories
      .filter((c) => c.categoryType === 'standard' && !c.parentCategoryCode)
      .slice(0, 6);

    const goalCategories = categories.filter((c) => c.categoryType === 'goal');

    let featuredProductsRaw = products.slice();
    featuredProductsRaw = this._sortProducts(featuredProductsRaw, 'best_selling').slice(0, 8);
    const enrichedProducts = this._resolveProductDisplayData(featuredProductsRaw);

    const featuredProducts = enrichedProducts.map((p) => {
      let badge = null;
      if (p.bestSellerRank != null && p.bestSellerRank <= 10) {
        badge = 'best_seller';
      } else if (p.createdAt && (Date.now() - this._parseDateToTs(p.createdAt)) < 30 * 24 * 60 * 60 * 1000) {
        badge = 'new';
      }
      const categoriesNames = p.categoryNames || [];
      return {
        product: {
          id: p.id,
          name: p.name,
          price: p.price,
          listPrice: p.listPrice,
          currency: p.currency,
          averageRating: p.averageRating,
          reviewCount: p.reviewCount,
          supplementType: p.supplementType
        },
        brandName: p.brandName || '',
        categoryNames: categoriesNames,
        badge: badge
      };
    });

    const placeholderStored = localStorage.getItem('searchPlaceholder');
    const searchPlaceholder = placeholderStored || 'Search supplements';

    return {
      featuredCategories: featuredCategories,
      goalCategories: goalCategories,
      featuredProducts: featuredProducts,
      searchPlaceholder: searchPlaceholder
    };
  }

  getGoalCategories() {
    const categories = this._getFromStorage('categories');
    return categories.filter((c) => c.categoryType === 'goal');
  }

  // Search

  searchProducts(query, filters, sortBy, page, pageSize) {
    const q = query ? String(query).toLowerCase() : '';
    const allProducts = this._getFromStorage('products').filter((p) => p.status === 'active');
    let filtered = allProducts;
    if (q) {
      filtered = filtered.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    filtered = this._applyProductFilters(filtered, filters || {});
    filtered = this._sortProducts(filtered, sortBy || 'relevance');

    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ps) || 1;
    const start = (pg - 1) * ps;
    const sliced = filtered.slice(start, start + ps);

    const enriched = this._resolveProductDisplayData(sliced);

    const products = enriched.map((p) => ({
      id: p.id,
      name: p.name,
      brandName: p.brandName || '',
      price: p.price,
      listPrice: p.listPrice,
      currency: p.currency,
      averageRating: p.averageRating,
      reviewCount: p.reviewCount,
      supplementType: p.supplementType,
      form: p.form,
      sizeValue: p.sizeValue,
      sizeUnit: p.sizeUnit,
      servingsPerContainer: p.servingsPerContainer,
      strengthAmount: p.strengthAmount,
      strengthUnit: p.strengthUnit,
      flavor: p.flavor,
      isVegan: p.isVegan,
      isGlutenFree: p.isGlutenFree,
      isCaffeineFree: p.isCaffeineFree,
      isSubscriptionAvailable: p.isSubscriptionAvailable,
      subscriptionDiscountPercent: p.subscriptionDiscountPercent,
      eligibleForFreeShipping: p.eligibleForFreeShipping,
      fastestDeliveryDays: p.fastestDeliveryDays,
      fastestDeliveryMethodType: p.fastestDeliveryMethodType,
      bestSellerRank: p.bestSellerRank,
      compareEligible: p.compareEligible,
      categoryNames: p.categoryNames || []
    }));

    return {
      products: products,
      pagination: {
        page: pg,
        pageSize: ps,
        totalItems: totalItems,
        totalPages: totalPages
      }
    };
  }

  getSearchFilterOptions(query) {
    const q = query ? String(query).toLowerCase() : '';
    const allProducts = this._getFromStorage('products').filter((p) => p.status === 'active');
    let products = allProducts;
    if (q) {
      products = products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    if (products.length === 0) {
      return {
        priceRange: { minAvailablePrice: 0, maxAvailablePrice: 0 },
        ratingThresholds: [4.0, 4.5],
        forms: [],
        dietaryAttributes: [],
        flavors: [],
        sizeUnits: [],
        sortOptions: [
          { value: 'relevance', label: 'Relevance' },
          { value: 'price_low_to_high', label: 'Price: Low to High' },
          { value: 'price_high_to_low', label: 'Price: High to Low' },
          { value: 'best_selling', label: 'Best Selling' },
          { value: 'most_reviewed', label: 'Most Reviewed' },
          { value: 'newest_arrivals', label: 'Newest Arrivals' }
        ]
      };
    }

    let minPrice = Number.MAX_SAFE_INTEGER;
    let maxPrice = 0;
    const formsSet = {};
    const flavorsSet = {};
    const sizeUnitsSet = {};
    let anyVegan = false;
    let anyGlutenFree = false;
    let anyCaffeineFree = false;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
      if (p.form) formsSet[p.form] = true;
      if (p.flavor) flavorsSet[p.flavor] = true;
      if (p.sizeUnit) sizeUnitsSet[p.sizeUnit] = true;
      if (p.isVegan) anyVegan = true;
      if (p.isGlutenFree) anyGlutenFree = true;
      if (p.isCaffeineFree) anyCaffeineFree = true;
    }

    const dietaryAttributes = [];
    if (anyVegan) dietaryAttributes.push('vegan');
    if (anyGlutenFree) dietaryAttributes.push('gluten_free');
    if (anyCaffeineFree) dietaryAttributes.push('caffeine_free');

    return {
      priceRange: {
        minAvailablePrice: minPrice === Number.MAX_SAFE_INTEGER ? 0 : minPrice,
        maxAvailablePrice: maxPrice
      },
      ratingThresholds: [4.0, 4.5],
      forms: Object.keys(formsSet),
      dietaryAttributes: dietaryAttributes,
      flavors: Object.keys(flavorsSet),
      sizeUnits: Object.keys(sizeUnitsSet),
      sortOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'best_selling', label: 'Best Selling' },
        { value: 'most_reviewed', label: 'Most Reviewed' },
        { value: 'newest_arrivals', label: 'Newest Arrivals' }
      ]
    };
  }

  // Category pages

  getCategoryPageMeta(categoryCode) {
    const categories = this._getFromStorage('categories');
    const category = categories.find((c) => c.code === categoryCode) || null;
    const breadcrumbs = [];
    if (category) {
      const index = this._buildCategoryIndex();
      let current = category;
      while (current) {
        breadcrumbs.unshift({ code: current.code, name: current.name });
        if (current.parentCategoryCode) {
          current = index[current.parentCategoryCode];
        } else {
          current = null;
        }
      }
    }
    const subcategories = categories.filter((c) => c.parentCategoryCode === categoryCode);
    return {
      category: category,
      breadcrumbs: breadcrumbs,
      subcategories: subcategories,
      description: category && category.description ? category.description : ''
    };
  }

  getCategoryFilterOptions(categoryCode) {
    const products = this._getProductsForCategory(categoryCode);
    if (products.length === 0) {
      return {
        priceRange: { minAvailablePrice: 0, maxAvailablePrice: 0 },
        ratingThresholds: [4.0, 4.5],
        forms: [],
        dietaryAttributes: [],
        purchaseOptions: [],
        servingsOptions: [30, 60, 90],
        sizeUnits: [],
        strengthOptions: [],
        flavors: [],
        shippingOptions: [],
        sortOptions: [
          { value: 'price_low_to_high', label: 'Price: Low to High' },
          { value: 'price_high_to_low', label: 'Price: High to Low' },
          { value: 'best_selling', label: 'Best Selling' },
          { value: 'most_reviewed', label: 'Most Reviewed' },
          { value: 'newest_arrivals', label: 'Newest Arrivals' },
          { value: 'fastest_delivery', label: 'Fastest Delivery' }
        ]
      };
    }

    let minPrice = Number.MAX_SAFE_INTEGER;
    let maxPrice = 0;
    const formsSet = {};
    const flavorsSet = {};
    const sizeUnitsSet = {};
    const strengthMap = {};
    let anyVegan = false;
    let anyGlutenFree = false;
    let anyCaffeineFree = false;
    let anySubscription = false;
    let anyFreeShipping = false;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
      if (p.form) formsSet[p.form] = true;
      if (p.flavor) flavorsSet[p.flavor] = true;
      if (p.sizeUnit) sizeUnitsSet[p.sizeUnit] = true;
      if (p.strengthAmount != null && p.strengthUnit) {
        const key = p.strengthAmount + '_' + p.strengthUnit;
        if (!strengthMap[key]) {
          strengthMap[key] = { amount: p.strengthAmount, unit: p.strengthUnit };
        }
      }
      if (p.isVegan) anyVegan = true;
      if (p.isGlutenFree) anyGlutenFree = true;
      if (p.isCaffeineFree) anyCaffeineFree = true;
      if (p.isSubscriptionAvailable) anySubscription = true;
      if (p.eligibleForFreeShipping) anyFreeShipping = true;
    }

    const dietaryAttributes = [];
    if (anyVegan) dietaryAttributes.push('vegan');
    if (anyGlutenFree) dietaryAttributes.push('gluten_free');
    if (anyCaffeineFree) dietaryAttributes.push('caffeine_free');

    const purchaseOptions = [];
    if (anySubscription) purchaseOptions.push('subscription_available');

    const shippingOptions = [];
    if (anyFreeShipping) shippingOptions.push('free_shipping');

    const strengthOptions = Object.keys(strengthMap).map((k) => strengthMap[k]);

    return {
      priceRange: {
        minAvailablePrice: minPrice === Number.MAX_SAFE_INTEGER ? 0 : minPrice,
        maxAvailablePrice: maxPrice
      },
      ratingThresholds: [4.0, 4.5],
      forms: Object.keys(formsSet),
      dietaryAttributes: dietaryAttributes,
      purchaseOptions: purchaseOptions,
      servingsOptions: [30, 60, 90],
      sizeUnits: Object.keys(sizeUnitsSet),
      strengthOptions: strengthOptions,
      flavors: Object.keys(flavorsSet),
      shippingOptions: shippingOptions,
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'best_selling', label: 'Best Selling' },
        { value: 'most_reviewed', label: 'Most Reviewed' },
        { value: 'newest_arrivals', label: 'Newest Arrivals' },
        { value: 'fastest_delivery', label: 'Fastest Delivery' }
      ]
    };
  }

  getCategoryProducts(categoryCode, filters, sortBy, page, pageSize) {
    const baseProducts = this._getProductsForCategory(categoryCode);
    let filtered = this._applyProductFilters(baseProducts, (filters || {}));
    filtered = this._sortProducts(filtered, sortBy || 'price_low_to_high');

    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ps) || 1;
    const start = (pg - 1) * ps;
    const sliced = filtered.slice(start, start + ps);

    const enriched = this._resolveProductDisplayData(sliced);

    const products = enriched.map((p) => ({
      id: p.id,
      name: p.name,
      brandName: p.brandName || '',
      price: p.price,
      listPrice: p.listPrice,
      currency: p.currency,
      averageRating: p.averageRating,
      reviewCount: p.reviewCount,
      supplementType: p.supplementType,
      form: p.form,
      sizeValue: p.sizeValue,
      sizeUnit: p.sizeUnit,
      servingsPerContainer: p.servingsPerContainer,
      strengthAmount: p.strengthAmount,
      strengthUnit: p.strengthUnit,
      flavor: p.flavor,
      isVegan: p.isVegan,
      isGlutenFree: p.isGlutenFree,
      isCaffeineFree: p.isCaffeineFree,
      isSubscriptionAvailable: p.isSubscriptionAvailable,
      subscriptionDiscountPercent: p.subscriptionDiscountPercent,
      eligibleForFreeShipping: p.eligibleForFreeShipping,
      fastestDeliveryDays: p.fastestDeliveryDays,
      fastestDeliveryMethodType: p.fastestDeliveryMethodType,
      bestSellerRank: p.bestSellerRank,
      compareEligible: p.compareEligible,
      categoryNames: p.categoryNames || []
    }));

    return {
      products: products,
      pagination: {
        page: pg,
        pageSize: ps,
        totalItems: totalItems,
        totalPages: totalPages
      }
    };
  }

  // Brand directory and products

  getBrandDirectory() {
    const brands = this._getFromStorage('brands');
    return brands.slice().sort((a, b) => {
      const an = (a.name || '').toLowerCase();
      const bn = (b.name || '').toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
  }

  getBrandDetailPageMeta(brandId) {
    const brands = this._getFromStorage('brands');
    const brand = brands.find((b) => b.id === brandId) || null;
    if (!brand) {
      return { brand: null, featuredCategories: [], description: '' };
    }
    const products = this._getFromStorage('products').filter((p) => p.status === 'active' && p.brandId === brandId);
    const categories = this._getFromStorage('categories');
    const catIndex = {};
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (c && c.code) catIndex[c.code] = c;
    }
    const categorySet = {};
    for (let j = 0; j < products.length; j++) {
      const codes = products[j].categoryCodes || [];
      for (let k = 0; k < codes.length; k++) {
        const cat = catIndex[codes[k]];
        if (cat) categorySet[cat.code] = cat;
      }
    }
    const featuredCategories = Object.keys(categorySet).map((code) => categorySet[code]);
    return {
      brand: brand,
      featuredCategories: featuredCategories,
      description: brand.description || ''
    };
  }

  getBrandFilterOptions(brandId, categoryCode) {
    const products = this._getProductsForBrand(brandId, categoryCode);
    if (products.length === 0) {
      return {
        priceRange: { minAvailablePrice: 0, maxAvailablePrice: 0 },
        ratingThresholds: [4.0, 4.5],
        forms: [],
        dietaryAttributes: [],
        sortOptions: [
          { value: 'newest_arrivals', label: 'Newest Arrivals' },
          { value: 'price_low_to_high', label: 'Price: Low to High' },
          { value: 'price_high_to_low', label: 'Price: High to Low' }
        ]
      };
    }

    let minPrice = Number.MAX_SAFE_INTEGER;
    let maxPrice = 0;
    const formsSet = {};
    let anyVegan = false;
    let anyGlutenFree = false;
    let anyCaffeineFree = false;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
      if (p.form) formsSet[p.form] = true;
      if (p.isVegan) anyVegan = true;
      if (p.isGlutenFree) anyGlutenFree = true;
      if (p.isCaffeineFree) anyCaffeineFree = true;
    }

    const dietaryAttributes = [];
    if (anyVegan) dietaryAttributes.push('vegan');
    if (anyGlutenFree) dietaryAttributes.push('gluten_free');
    if (anyCaffeineFree) dietaryAttributes.push('caffeine_free');

    return {
      priceRange: {
        minAvailablePrice: minPrice === Number.MAX_SAFE_INTEGER ? 0 : minPrice,
        maxAvailablePrice: maxPrice
      },
      ratingThresholds: [4.0, 4.5],
      forms: Object.keys(formsSet),
      dietaryAttributes: dietaryAttributes,
      sortOptions: [
        { value: 'newest_arrivals', label: 'Newest Arrivals' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' }
      ]
    };
  }

  getBrandProducts(brandId, categoryCode, filters, sortBy, page, pageSize) {
    const baseProducts = this._getProductsForBrand(brandId, categoryCode);
    let filtered = this._applyProductFilters(baseProducts, (filters || {}));

    let sb = sortBy || 'newest_arrivals';
    if (sb !== 'newest_arrivals' && sb !== 'price_low_to_high' && sb !== 'price_high_to_low') {
      sb = 'newest_arrivals';
    }
    filtered = this._sortProducts(filtered, sb);

    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ps) || 1;
    const start = (pg - 1) * ps;
    const sliced = filtered.slice(start, start + ps);

    const enriched = this._resolveProductDisplayData(sliced);

    const products = enriched.map((p) => ({
      id: p.id,
      name: p.name,
      brandName: p.brandName || '',
      price: p.price,
      listPrice: p.listPrice,
      currency: p.currency,
      averageRating: p.averageRating,
      reviewCount: p.reviewCount,
      supplementType: p.supplementType,
      form: p.form,
      sizeValue: p.sizeValue,
      sizeUnit: p.sizeUnit,
      servingsPerContainer: p.servingsPerContainer,
      strengthAmount: p.strengthAmount,
      strengthUnit: p.strengthUnit,
      flavor: p.flavor,
      isVegan: p.isVegan,
      isGlutenFree: p.isGlutenFree,
      isCaffeineFree: p.isCaffeineFree,
      eligibleForFreeShipping: p.eligibleForFreeShipping,
      compareEligible: p.compareEligible
    }));

    return {
      products: products,
      pagination: {
        page: pg,
        pageSize: ps,
        totalItems: totalItems,
        totalPages: totalPages
      }
    };
  }

  // Product details

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        brand: null,
        categoryBreadcrumbs: [],
        availableSizes: [],
        availableFlavors: [],
        availableForms: [],
        subscriptionOptions: {
          isSubscriptionAvailable: false,
          frequencyOptions: [],
          discountPercent: 0
        },
        ratingSummary: {
          averageRating: 0,
          reviewCount: 0
        }
      };
    }

    const brands = this._getFromStorage('brands');
    const brand = brands.find((b) => b.id === product.brandId) || null;

    const categories = this._getFromStorage('categories');
    const catIndex = {};
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (c && c.code) catIndex[c.code] = c;
    }

    let breadcrumbCategory = null;
    const codes = product.categoryCodes || [];
    for (let j = 0; j < codes.length; j++) {
      const cat = catIndex[codes[j]];
      if (cat) {
        breadcrumbCategory = cat;
        break;
      }
    }

    const categoryBreadcrumbs = [];
    if (breadcrumbCategory) {
      let cur = breadcrumbCategory;
      const index = this._buildCategoryIndex();
      while (cur) {
        categoryBreadcrumbs.unshift(cur);
        if (cur.parentCategoryCode) {
          cur = index[cur.parentCategoryCode];
        } else {
          cur = null;
        }
      }
    }

    const availableSizes = [];
    if (product.sizeValue != null && product.sizeUnit) {
      availableSizes.push({
        sizeValue: product.sizeValue,
        sizeUnit: product.sizeUnit,
        price: product.price
      });
    }

    const availableFlavors = product.flavor ? [product.flavor] : [];
    const availableForms = product.form ? [product.form] : [];

    const subscriptionOptions = {
      isSubscriptionAvailable: !!product.isSubscriptionAvailable,
      frequencyOptions: product.subscriptionFrequencyOptions || [],
      discountPercent: product.subscriptionDiscountPercent || 0
    };

    const ratingSummary = {
      averageRating: product.averageRating || 0,
      reviewCount: product.reviewCount || 0
    };

    return {
      product: product,
      brand: brand,
      categoryBreadcrumbs: categoryBreadcrumbs,
      availableSizes: availableSizes,
      availableFlavors: availableFlavors,
      availableForms: availableForms,
      subscriptionOptions: subscriptionOptions,
      ratingSummary: ratingSummary
    };
  }

  // Cart & checkout

  addToCart(productId, quantity, purchaseMode, subscriptionFrequency, selectedSize, selectedFlavor, selectedForm, selectedStrength) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId && p.status === 'active');
    if (!product) {
      return { success: false, message: 'Product not found or unavailable', cart: null, items: [] };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const mode = purchaseMode === 'subscription' ? 'subscription' : 'one_time';

    const cart = this._getOrCreateCart();
    let allItems = this._getFromStorage('cart_items');

    // Try to merge with existing identical line (same product and options)
    let existing = null;
    for (let i = 0; i < allItems.length; i++) {
      const ci = allItems[i];
      if (ci.cartId !== cart.id) continue;
      if (ci.productId !== product.id) continue;
      if (ci.purchaseMode !== mode) continue;
      const sameSize = (!selectedSize && ci.selectedSizeValue === product.sizeValue && ci.selectedSizeUnit === product.sizeUnit) ||
        (selectedSize && ci.selectedSizeValue === selectedSize.sizeValue && ci.selectedSizeUnit === selectedSize.sizeUnit);
      const fl = selectedFlavor || product.flavor || null;
      const sameFlavor = ci.selectedFlavor === fl;
      const sf = selectedForm || product.form || null;
      const sameForm = ci.selectedForm === sf;
      const stAmt = selectedStrength && selectedStrength.strengthAmount != null ? selectedStrength.strengthAmount : product.strengthAmount;
      const stUnit = selectedStrength && selectedStrength.strengthUnit ? selectedStrength.strengthUnit : product.strengthUnit;
      const sameStrength = ci.selectedStrengthAmount === stAmt && ci.selectedStrengthUnit === stUnit;
      if (sameSize && sameFlavor && sameForm && sameStrength) {
        existing = ci;
        break;
      }
    }

    if (existing) {
      existing.quantity += qty;
      existing.lineTotal = (existing.unitPrice || 0) * existing.quantity;
    } else {
      const sizeVal = selectedSize && selectedSize.sizeValue != null ? selectedSize.sizeValue : product.sizeValue;
      const sizeUnit = selectedSize && selectedSize.sizeUnit ? selectedSize.sizeUnit : product.sizeUnit;
      const flavor = selectedFlavor || product.flavor || null;
      const form = selectedForm || product.form || null;
      const strengthAmount = selectedStrength && selectedStrength.strengthAmount != null ? selectedStrength.strengthAmount : product.strengthAmount;
      const strengthUnit = selectedStrength && selectedStrength.strengthUnit ? selectedStrength.strengthUnit : product.strengthUnit;

      const cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: qty,
        lineTotal: product.price * qty,
        purchaseMode: mode,
        subscriptionFrequency: mode === 'subscription' ? (subscriptionFrequency || null) : null,
        selectedSizeValue: sizeVal,
        selectedSizeUnit: sizeUnit || 'none',
        selectedFlavor: flavor,
        selectedForm: form,
        selectedStrengthAmount: strengthAmount,
        selectedStrengthUnit: strengthUnit || 'none',
        isFreeShipping: !!product.eligibleForFreeShipping
      };
      allItems.push(cartItem);
      cart.itemIds.push(cartItem.id);
    }

    this._saveToStorage('cart_items', allItems);

    let carts = this._getFromStorage('carts');
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        break;
      }
    }
    this._saveToStorage('carts', carts);

    this._recalculateCartTotals(cart, allItems, false);

    const enrichedItems = this._getEnrichedCartItems(cart.id);
    return { success: true, message: 'Added to cart', cart: cart, items: enrichedItems };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    this._recalculateCartTotals(cart, allItems, false);

    const enrichedItems = this._getEnrichedCartItems(cart.id);
    const availableShippingMethods = this._getAvailableShippingMethodsForCart(cart);

    // Resolve selected shipping method on cart
    let selectedShippingMethod = null;
    for (let i = 0; i < availableShippingMethods.length; i++) {
      if (availableShippingMethods[i].id === cart.selectedShippingMethodId) {
        selectedShippingMethod = availableShippingMethods[i];
        break;
      }
    }
    cart.selectedShippingMethod = selectedShippingMethod;

    const itemsForResponse = enrichedItems.map((entry) => ({
      cartItem: entry,
      brandName: entry.brand ? entry.brand.name : '',
      categoryNames: entry.categoryNames || [],
      imageAltText: entry.product ? entry.product.name : ''
    }));

    return {
      cart: cart,
      items: itemsForResponse,
      availableShippingMethods: availableShippingMethods
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let allItems = this._getFromStorage('cart_items');
    const item = allItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return { success: false, message: 'Cart item not found', cart: null, items: [] };
    }
    const cartId = item.cartId;

    if (quantity <= 0) {
      allItems = allItems.filter((ci) => ci.id !== cartItemId);
      this._saveToStorage('cart_items', allItems);
      let carts = this._getFromStorage('carts');
      const cart = carts.find((c) => c.id === cartId) || null;
      if (cart) {
        cart.itemIds = (cart.itemIds || []).filter((id) => id !== cartItemId);
        this._recalculateCartTotals(cart, allItems, false);
        for (let i = 0; i < carts.length; i++) {
          if (carts[i].id === cart.id) {
            carts[i] = cart;
            break;
          }
        }
        this._saveToStorage('carts', carts);
        const enrichedItems = this._getEnrichedCartItems(cart.id);
        return { success: true, message: 'Cart item removed', cart: cart, items: enrichedItems };
      }
      return { success: true, message: 'Cart item removed', cart: null, items: [] };
    }

    item.quantity = quantity;
    item.lineTotal = (item.unitPrice || 0) * item.quantity;
    this._saveToStorage('cart_items', allItems);

    let carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || null;
    if (cart) {
      this._recalculateCartTotals(cart, allItems, false);
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === cart.id) {
          carts[i] = cart;
          break;
        }
      }
      this._saveToStorage('carts', carts);
      const enrichedItems = this._getEnrichedCartItems(cart.id);
      return { success: true, message: 'Quantity updated', cart: cart, items: enrichedItems };
    }

    return { success: true, message: 'Quantity updated', cart: null, items: [] };
  }

  removeCartItem(cartItemId) {
    let allItems = this._getFromStorage('cart_items');
    const item = allItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return { success: false, message: 'Cart item not found', cart: null, items: [] };
    }
    const cartId = item.cartId;

    allItems = allItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', allItems);

    let carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || null;
    if (cart) {
      cart.itemIds = (cart.itemIds || []).filter((id) => id !== cartItemId);
      this._recalculateCartTotals(cart, allItems, false);
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === cart.id) {
          carts[i] = cart;
          break;
        }
      }
      this._saveToStorage('carts', carts);
      const enrichedItems = this._getEnrichedCartItems(cart.id);
      return { success: true, message: 'Cart item removed', cart: cart, items: enrichedItems };
    }

    return { success: true, message: 'Cart item removed', cart: null, items: [] };
  }

  applyCouponToCart(couponCode) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    const items = allItems.filter((ci) => ci.cartId === cart.id);
    if (items.length === 0) {
      return { success: false, message: 'Cart is empty', cart: cart, items: [] };
    }

    // Reset totals and existing coupon info
    cart.appliedCouponCodes = [];
    this._recalculateCartTotals(cart, allItems, true);

    const result = this._validateAndApplyCoupon(cart, items, couponCode, false);

    // Recalculate final total with coupon applied
    const methods = this._getFromStorage('shipping_methods');
    let baseShipping = 0;
    if (cart.selectedShippingMethodId) {
      for (let i = 0; i < methods.length; i++) {
        if (methods[i].id === cart.selectedShippingMethodId) {
          baseShipping = methods[i].cost || 0;
          break;
        }
      }
    }
    if (cart.shippingCost == null || cart.shippingCost === 0) {
      cart.shippingCost = baseShipping;
    }
    const totalRaw = (cart.subtotal || 0) - (cart.discountTotal || 0) + (cart.shippingCost || 0) + (cart.taxTotal || 0);
    cart.total = totalRaw < 0 ? 0 : totalRaw;

    let carts = this._getFromStorage('carts');
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        break;
      }
    }
    this._saveToStorage('carts', carts);

    const enrichedItems = this._getEnrichedCartItems(cart.id);

    return {
      success: result.success,
      message: result.message,
      cart: cart,
      items: enrichedItems
    };
  }

  selectCartShippingMethod(shippingMethodId) {
    const cart = this._getOrCreateCart();
    const methods = this._getFromStorage('shipping_methods');
    const method = methods.find((m) => m.id === shippingMethodId) || null;
    if (!method) {
      return { success: false, message: 'Shipping method not found', cart: cart, items: [] };
    }
    cart.selectedShippingMethodId = method.id;

    const allItems = this._getFromStorage('cart_items');
    this._recalculateCartTotals(cart, allItems, false);

    let carts = this._getFromStorage('carts');
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        break;
      }
    }
    this._saveToStorage('carts', carts);

    const enrichedItems = this._getEnrichedCartItems(cart.id);

    return {
      success: true,
      message: 'Shipping method selected',
      cart: cart,
      items: enrichedItems
    };
  }

  startGuestCheckout() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    this._recalculateCartTotals(cart, allItems, false);
    const items = this._getEnrichedCartItems(cart.id);

    const session = this._getOrCreateCheckoutSession(cart.id);

    // Ensure checkout session has a shipping method
    if (!session.selectedShippingMethodId && cart.selectedShippingMethodId) {
      session.selectedShippingMethodId = cart.selectedShippingMethodId;
      session.updatedAt = new Date().toISOString();
      let sessions = this._getFromStorage('checkout_sessions');
      for (let i = 0; i < sessions.length; i++) {
        if (sessions[i].id === session.id) {
          sessions[i] = session;
          break;
        }
      }
      this._saveToStorage('checkout_sessions', sessions);
    }

    const availableShippingMethods = this._getAvailableShippingMethodsForCart(cart);

    let selectedShippingMethod = null;
    for (let i = 0; i < availableShippingMethods.length; i++) {
      if (availableShippingMethods[i].id === session.selectedShippingMethodId) {
        selectedShippingMethod = availableShippingMethods[i];
        break;
      }
    }
    session.selectedShippingMethod = selectedShippingMethod;

    return {
      checkoutSession: session,
      cart: cart,
      items: items,
      availableShippingMethods: availableShippingMethods
    };
  }

  updateGuestCheckoutShippingInfo(shippingInfo, shippingMethodId) {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession(cart.id);

    if (shippingInfo) {
      session.shippingFullName = shippingInfo.fullName || session.shippingFullName || null;
      session.shippingStreetAddress = shippingInfo.streetAddress || session.shippingStreetAddress || null;
      session.shippingCity = shippingInfo.city || session.shippingCity || null;
      session.shippingState = shippingInfo.state || session.shippingState || null;
      session.shippingPostalCode = shippingInfo.postalCode || session.shippingPostalCode || null;
      session.shippingCountry = shippingInfo.country || session.shippingCountry || null;
      session.email = shippingInfo.email || session.email || null;
    }

    if (shippingMethodId) {
      session.selectedShippingMethodId = shippingMethodId;
      cart.selectedShippingMethodId = shippingMethodId;
    }

    session.updatedAt = new Date().toISOString();

    let sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    const allItems = this._getFromStorage('cart_items');
    this._recalculateCartTotals(cart, allItems, false);

    let carts = this._getFromStorage('carts');
    for (let j = 0; j < carts.length; j++) {
      if (carts[j].id === cart.id) {
        carts[j] = cart;
        break;
      }
    }
    this._saveToStorage('carts', carts);

    const shippingMethods = this._getAvailableShippingMethodsForCart(cart);
    let selectedShippingMethod = null;
    for (let k = 0; k < shippingMethods.length; k++) {
      if (shippingMethods[k].id === session.selectedShippingMethodId) {
        selectedShippingMethod = shippingMethods[k];
        break;
      }
    }
    session.selectedShippingMethod = selectedShippingMethod;

    return {
      checkoutSession: session,
      cart: cart
    };
  }

  updateGuestCheckoutBillingAndPayment(billingInfo, paymentDetails) {
    let session = this._getActiveCheckoutSession();
    if (!session) {
      const cart = this._getOrCreateCart();
      session = this._getOrCreateCheckoutSession(cart.id);
    }

    // Store billing and payment details on the session object (JSON-serializable)
    session.billingInfo = billingInfo || session.billingInfo || null;
    session.paymentDetails = paymentDetails || session.paymentDetails || null;
    session.updatedAt = new Date().toISOString();

    let sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    return { checkoutSession: session };
  }

  getGuestCheckoutSummary() {
    let session = this._getActiveCheckoutSession();
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    this._recalculateCartTotals(cart, allItems, false);
    const items = this._getEnrichedCartItems(cart.id);

    if (!session) {
      session = this._getOrCreateCheckoutSession(cart.id);
    }

    const shippingMethods = this._getAvailableShippingMethodsForCart(cart);
    let selectedShippingMethod = null;
    for (let i = 0; i < shippingMethods.length; i++) {
      if (shippingMethods[i].id === session.selectedShippingMethodId) {
        selectedShippingMethod = shippingMethods[i];
        break;
      }
    }
    session.selectedShippingMethod = selectedShippingMethod;
    cart.selectedShippingMethod = selectedShippingMethod;

    return {
      checkoutSession: session,
      cart: cart,
      items: items,
      selectedShippingMethod: selectedShippingMethod
    };
  }

  placeGuestOrder() {
    let session = this._getActiveCheckoutSession();
    if (!session) {
      return { success: false, orderNumber: null, message: 'No active checkout session' };
    }

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === session.cartId) || null;
    if (!cart) {
      return { success: false, orderNumber: null, message: 'Cart not found for checkout' };
    }

    const allItems = this._getFromStorage('cart_items');
    const items = allItems.filter((ci) => ci.cartId === cart.id);
    if (items.length === 0) {
      return { success: false, orderNumber: null, message: 'Cart is empty' };
    }

    // Simulate order placement
    const orderNumber = 'ORD-' + this._getNextIdCounter();

    session.status = 'completed';
    session.updatedAt = new Date().toISOString();
    let sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    // Clear cart after order
    cart.status = 'completed';
    cart.itemIds = [];
    cart.subtotal = 0;
    cart.discountTotal = 0;
    cart.shippingCost = 0;
    cart.taxTotal = 0;
    cart.total = 0;
    cart.updatedAt = new Date().toISOString();

    const remainingItems = allItems.filter((ci) => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', remainingItems);

    for (let j = 0; j < carts.length; j++) {
      if (carts[j].id === cart.id) {
        carts[j] = cart;
        break;
      }
    }
    this._saveToStorage('carts', carts);

    return { success: true, orderNumber: orderNumber, message: 'Order placed successfully' };
  }

  // Comparison

  updateComparisonSelection(productId, selected) {
    const set = this._getOrCreateComparisonSet();
    const ids = set.productIds || [];
    const exists = ids.indexOf(productId) !== -1;

    if (selected && !exists) {
      ids.push(productId);
    } else if (!selected && exists) {
      set.productIds = ids.filter((id) => id !== productId);
    }

    set.productIds = ids;
    let sets = this._getFromStorage('product_comparison_sets');
    if (sets.length === 0) {
      sets.push(set);
    } else {
      sets[0] = set;
    }
    this._saveToStorage('product_comparison_sets', sets);

    return { comparisonSet: set };
  }

  getCurrentComparisonView() {
    const set = this._getOrCreateComparisonSet();
    const productsAll = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');

    const brandIndex = {};
    for (let i = 0; i < brands.length; i++) {
      const b = brands[i];
      if (b && b.id) brandIndex[b.id] = b;
    }
    const catIndex = {};
    for (let j = 0; j < categories.length; j++) {
      const c = categories[j];
      if (c && c.code) catIndex[c.code] = c;
    }

    const products = [];
    for (let k = 0; k < set.productIds.length; k++) {
      const pId = set.productIds[k];
      const product = productsAll.find((p) => p.id === pId) || null;
      if (!product) continue;
      const brand = product.brandId ? (brandIndex[product.brandId] || null) : null;
      const categoryNames = [];
      const codes = product.categoryCodes || [];
      for (let x = 0; x < codes.length; x++) {
        const cat = catIndex[codes[x]];
        if (cat && cat.name) categoryNames.push(cat.name);
      }
      let pricePerServing = null;
      if (product.servingsPerContainer && product.price != null) {
        pricePerServing = product.price / product.servingsPerContainer;
      }
      products.push({
        product: product,
        brand: brand,
        categoryNames: categoryNames,
        pricePerServing: pricePerServing
      });
    }

    const differencesHighlighted = [];
    if (products.length > 1) {
      const first = products[0].product;
      let diffPrice = false;
      let diffServings = false;
      let diffStrength = false;
      let diffForm = false;
      let diffSize = false;

      for (let i = 1; i < products.length; i++) {
        const p = products[i].product;
        if (p.price !== first.price) diffPrice = true;
        if (p.servingsPerContainer !== first.servingsPerContainer) diffServings = true;
        if (p.strengthAmount !== first.strengthAmount || p.strengthUnit !== first.strengthUnit) diffStrength = true;
        if (p.form !== first.form) diffForm = true;
        if (p.sizeValue !== first.sizeValue || p.sizeUnit !== first.sizeUnit) diffSize = true;
      }

      if (diffPrice) differencesHighlighted.push('price');
      if (diffServings) differencesHighlighted.push('servings_per_container');
      if (diffStrength) differencesHighlighted.push('strength');
      if (diffForm) differencesHighlighted.push('form');
      if (diffSize) differencesHighlighted.push('size');
    }

    return {
      comparisonSet: set,
      products: products,
      differencesHighlighted: differencesHighlighted
    };
  }

  // Wishlist

  getWishlist() {
    const wishlist = this._getOrCreateDefaultWishlist();
    const allWishlistItems = this._getFromStorage('wishlist_items');
    const items = allWishlistItems.filter((wi) => wi.wishlistId === wishlist.id);

    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const productIndex = {};
    const brandIndex = {};
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p && p.id) productIndex[p.id] = p;
    }
    for (let j = 0; j < brands.length; j++) {
      const b = brands[j];
      if (b && b.id) brandIndex[b.id] = b;
    }

    const enriched = items.map((wi) => {
      const product = productIndex[wi.productId] || null;
      const brand = product && product.brandId ? (brandIndex[product.brandId] || null) : null;
      return {
        wishlistItem: wi,
        product: product,
        brand: brand
      };
    });

    return {
      wishlist: wishlist,
      items: enriched
    };
  }

  addProductToDefaultWishlist(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId && p.status === 'active');
    if (!product) {
      return { wishlist: null, items: [] };
    }

    const wishlist = this._getOrCreateDefaultWishlist();
    let allWishlistItems = this._getFromStorage('wishlist_items');

    // Allow duplicates or not? For now, avoid duplicates for same product in same wishlist
    const existing = allWishlistItems.find((wi) => wi.wishlistId === wishlist.id && wi.productId === productId);
    if (!existing) {
      const wi = {
        id: this._generateId('wishlist_item'),
        wishlistId: wishlist.id,
        productId: product.id,
        productName: product.name,
        addedAt: new Date().toISOString()
      };
      allWishlistItems.push(wi);
      wishlist.itemIds.push(wi.id);
      this._saveToStorage('wishlist_items', allWishlistItems);
      let wishlists = this._getFromStorage('wishlists');
      for (let i = 0; i < wishlists.length; i++) {
        if (wishlists[i].id === wishlist.id) {
          wishlists[i] = wishlist;
          break;
        }
      }
      this._saveToStorage('wishlists', wishlists);
    }

    return this.getWishlist();
  }

  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateDefaultWishlist();
    let allWishlistItems = this._getFromStorage('wishlist_items');

    allWishlistItems = allWishlistItems.filter((wi) => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', allWishlistItems);

    wishlist.itemIds = (wishlist.itemIds || []).filter((id) => id !== wishlistItemId);
    let wishlists = this._getFromStorage('wishlists');
    for (let i = 0; i < wishlists.length; i++) {
      if (wishlists[i].id === wishlist.id) {
        wishlists[i] = wishlist;
        break;
      }
    }
    this._saveToStorage('wishlists', wishlists);

    return this.getWishlist();
  }

  moveWishlistItemToCart(wishlistItemId, quantity) {
    const allWishlistItems = this._getFromStorage('wishlist_items');
    const wi = allWishlistItems.find((item) => item.id === wishlistItemId);
    if (!wi) {
      return {
        cart: null,
        cartItems: [],
        wishlist: null,
        wishlistItems: []
      };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const addResult = this.addToCart(wi.productId, qty, 'one_time');

    // Remove from wishlist
    this.removeWishlistItem(wishlistItemId);

    const wishlistData = this.getWishlist();

    return {
      cart: addResult.cart,
      cartItems: addResult.items,
      wishlist: wishlistData.wishlist,
      wishlistItems: wishlistData.items.map((x) => x.wishlistItem)
    };
  }

  // Static / content pages

  getAboutPageContent() {
    const content = this._getPageContentByType('about');
    if (!content) {
      return {
        headline: '',
        sections: []
      };
    }
    return content;
  }

  getContactPageContent() {
    const content = this._getPageContentByType('contact');
    if (!content) {
      return {
        supportEmail: '',
        supportPhone: '',
        supportAddress: '',
        contactReasons: []
      };
    }
    return content;
  }

  submitContactForm(contactForm) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const entry = {
      id: this._generateId('contact'),
      form: contactForm || {},
      createdAt: new Date().toISOString()
    };
    submissions.push(entry);
    this._saveToStorage('contact_form_submissions', submissions);
    return { success: true, message: 'Contact form submitted' };
  }

  getFaqEntries() {
    return this._getFromStorage('faq_entries');
  }

  getShippingAndReturnsContent() {
    const methods = this._getFromStorage('shipping_methods');
    const content = this._getPageContentByType('shipping_returns') || {};
    return {
      shippingMethods: methods,
      freeShippingThreshold: content.freeShippingThreshold || 0,
      shippingPolicyText: content.shippingPolicyText || '',
      returnsPolicyText: content.returnsPolicyText || ''
    };
  }

  getPrivacyPolicyContent() {
    const content = this._getPageContentByType('privacy');
    if (!content) {
      return { lastUpdated: '', sections: [] };
    }
    return content;
  }

  getTermsAndConditionsContent() {
    const content = this._getPageContentByType('terms');
    if (!content) {
      return { lastUpdated: '', sections: [] };
    }
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
