/* localStorage polyfill for Node.js and environments without localStorage */
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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not present.
    // No mock data is inserted; only empty structures/config containers.
    const defaultConfigs = {
      categories: [],
      products: [],
      cart: null,
      cart_items: [],
      wishlist: null,
      wishlist_items: [],
      compare_list: null,
      articles: [],
      demo_requests: [],
      shipping_options: [],
      free_shipping_rules: [],
      static_pages: {},
      faq_entries: [],
      contact_tickets: [],
      notifications: []
    };

    Object.keys(defaultConfigs).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultConfigs[key]));
      }
    });

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === "undefined") {
      return typeof defaultValue !== "undefined" ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      // If parsing fails, reset to defaultValue to avoid cascading errors
      const fallback = typeof defaultValue !== "undefined" ? defaultValue : [];
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _unique(arr) {
    return Array.from(new Set(arr));
  }

  // ---------------------- Domain Helpers ----------------------

  _getDescendantCategorySlugs(rootSlug) {
    const categories = this._getFromStorage("categories", []);
    const result = new Set();
    if (!rootSlug) return [];
    result.add(rootSlug);

    let added = true;
    while (added) {
      added = false;
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        if (cat && cat.parentSlug && result.has(cat.parentSlug) && !result.has(cat.slug)) {
          result.add(cat.slug);
          added = true;
        }
      }
    }
    return Array.from(result);
  }

  _getOrCreateCart() {
    let cart = this._getFromStorage("cart", null);
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId("cart"),
        itemIds: [],
        subtotal: 0,
        totalDiscount: 0,
        shippingCost: 0,
        total: 0,
        shippingOptionKey: null,
        currency: "USD",
        lastUpdated: now
      };
      this._saveToStorage("cart", cart);
    }
    return cart;
  }

  _getCurrentWishlist() {
    let wishlist = this._getFromStorage("wishlist", null);
    const now = new Date().toISOString();
    if (!wishlist) {
      wishlist = {
        id: this._generateId("wishlist"),
        itemIds: [],
        createdAt: now,
        updatedAt: now
      };
      this._saveToStorage("wishlist", wishlist);
    }
    return wishlist;
  }

  _getCurrentCompareList() {
    let compareList = this._getFromStorage("compare_list", null);
    const now = new Date().toISOString();
    if (!compareList) {
      compareList = {
        id: this._generateId("compare"),
        productIds: [],
        createdAt: now
      };
      this._saveToStorage("compare_list", compareList);
    }
    return compareList;
  }

  _getFreeShippingRuleForSubtotal(subtotal) {
    const rules = this._getFromStorage("free_shipping_rules", []);
    const activeRules = rules.filter((r) => r && r.isActive);
    if (!activeRules.length) {
      return { eligibleRule: null, nextRule: null };
    }

    let eligibleRule = null;
    let nextRule = null;

    for (let i = 0; i < activeRules.length; i++) {
      const rule = activeRules[i];
      const min = typeof rule.minSubtotal === "number" ? rule.minSubtotal : 0;
      const max = typeof rule.maxSubtotal === "number" ? rule.maxSubtotal : Infinity;

      if (subtotal >= min && subtotal <= max) {
        if (!eligibleRule || min > eligibleRule.minSubtotal) {
          eligibleRule = rule;
        }
      }

      if (subtotal < min) {
        if (!nextRule || min < nextRule.minSubtotal) {
          nextRule = rule;
        }
      }
    }

    return { eligibleRule, nextRule };
  }

  _recalculateCartTotals() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);
    const products = this._getFromStorage("products", []);
    const shippingOptions = this._getFromStorage("shipping_options", []);

    const now = new Date().toISOString();

    // Keep only items belonging to this cart
    cartItems = cartItems.filter((ci) => ci && ci.cartId === cart.id);

    let subtotal = 0;
    let totalDiscount = 0;

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const product = products.find((p) => p && p.id === item.productId) || null;

      if (!product) {
        // If product missing, treat as zero-priced but keep item structure
        item.unitPrice = 0;
        item.lineSubtotal = 0;
        item.isBulkDiscountApplied = false;
        item.bulkDiscountPercentApplied = null;
        continue;
      }

      const baseUnitPrice = typeof product.price === "number" ? product.price : 0;
      item.unitPrice = baseUnitPrice;
      const qty = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 0;
      const baseLineTotal = baseUnitPrice * qty;

      let bulkDiscountAmount = 0;
      let bulkApplied = false;
      let bulkPercent = null;

      if (
        product.hasBulkDiscount &&
        typeof product.bulkDiscountPercent === "number" &&
        typeof product.bulkDiscountMinQty === "number" &&
        qty >= product.bulkDiscountMinQty
      ) {
        bulkPercent = product.bulkDiscountPercent;
        bulkDiscountAmount = (baseLineTotal * bulkPercent) / 100;
        bulkApplied = true;
      }

      const lineSubtotal = baseLineTotal - bulkDiscountAmount;
      item.lineSubtotal = Number(lineSubtotal.toFixed(2));
      item.isBulkDiscountApplied = !!bulkApplied;
      item.bulkDiscountPercentApplied = bulkApplied ? bulkPercent : null;
      subtotal += item.lineSubtotal;
      totalDiscount += bulkDiscountAmount;
    }

    cart.subtotal = Number(subtotal.toFixed(2));
    cart.totalDiscount = Number(totalDiscount.toFixed(2));

    // Determine shipping cost based on selected shipping option
    let shippingCost = 0;
    let selectedOption = null;

    if (cart.shippingOptionKey) {
      selectedOption = shippingOptions.find(
        (opt) => opt && opt.key === cart.shippingOptionKey && opt.isActive
      );
    }

    if (!selectedOption) {
      // Default to standard if available
      selectedOption = shippingOptions.find(
        (opt) => opt && opt.key === "standard" && opt.isActive
      );
      if (selectedOption) {
        cart.shippingOptionKey = selectedOption.key;
      }
    }

    if (selectedOption) {
      shippingCost = typeof selectedOption.baseCost === "number" ? selectedOption.baseCost : 0;
    } else {
      shippingCost = 0;
    }

    cart.shippingCost = Number(shippingCost.toFixed(2));
    cart.total = Number((cart.subtotal + cart.shippingCost).toFixed(2));
    cart.lastUpdated = now;

    this._saveToStorage("cart", cart);
    this._saveToStorage("cart_items", cartItems);

    const { eligibleRule, nextRule } = this._getFreeShippingRuleForSubtotal(cart.subtotal);

    let freeShippingInfo;
    if (eligibleRule) {
      freeShippingInfo = {
        eligible: true,
        shippingOptionKey: eligibleRule.shippingOptionKey,
        minSubtotal: eligibleRule.minSubtotal,
        maxSubtotal: eligibleRule.maxSubtotal || null,
        amountToReachMin: 0
      };
    } else if (nextRule) {
      const amountToReachMin = Math.max(nextRule.minSubtotal - cart.subtotal, 0);
      freeShippingInfo = {
        eligible: false,
        shippingOptionKey: nextRule.shippingOptionKey,
        minSubtotal: nextRule.minSubtotal,
        maxSubtotal: nextRule.maxSubtotal || null,
        amountToReachMin: Number(amountToReachMin.toFixed(2))
      };
    } else {
      freeShippingInfo = {
        eligible: false,
        shippingOptionKey: null,
        minSubtotal: null,
        maxSubtotal: null,
        amountToReachMin: null
      };
    }

    return { cart, cartItems, freeShipping: freeShippingInfo };
  }

  _filterAndSortProducts(products, filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || "relevance";
    page = page || 1;
    pageSize = pageSize || 24;

    let filtered = products.slice();

    // Category filtering (searchProducts may pass categorySlug via filters)
    if (filters.categorySlug) {
      const allowedSlugs = this._getDescendantCategorySlugs(filters.categorySlug);
      filtered = filtered.filter((p) => {
        if (!p || p.status === "archived") return false;
        const primaryMatch = allowedSlugs.indexOf(p.primaryCategorySlug) !== -1;
        const secondaryMatch = Array.isArray(p.secondaryCategorySlugs)
          ? p.secondaryCategorySlugs.some((slug) => allowedSlugs.indexOf(slug) !== -1)
          : false;
        return primaryMatch || secondaryMatch;
      });
    }

    // Length filter
    if (typeof filters.length === "number") {
      filtered = filtered.filter((p) => {
        if (!p) return false;
        const opts = Array.isArray(p.lengthOptions) ? p.lengthOptions : [];
        const defVal = typeof p.defaultLength === "number" ? p.defaultLength : null;
        return opts.indexOf(filters.length) !== -1 || defVal === filters.length;
      });
    }

    // Taper filter
    if (typeof filters.taper === "string" && filters.taper) {
      filtered = filtered.filter((p) => {
        if (!p) return false;
        const opts = Array.isArray(p.taperOptions) ? p.taperOptions : [];
        const defVal = typeof p.defaultTaper === "string" ? p.defaultTaper : null;
        return opts.indexOf(filters.taper) !== -1 || defVal === filters.taper;
      });
    }

    // Size filter
    if (typeof filters.size === "number") {
      filtered = filtered.filter((p) => {
        if (!p) return false;
        const opts = Array.isArray(p.sizeOptions) ? p.sizeOptions : [];
        const defVal = typeof p.defaultSize === "number" ? p.defaultSize : null;
        return opts.indexOf(filters.size) !== -1 || defVal === filters.size;
      });
    }

    // Size range filter
    if (typeof filters.sizeRange === "string" && filters.sizeRange) {
      filtered = filtered.filter((p) => {
        if (!p) return false;
        const opts = Array.isArray(p.sizeRangeOptions) ? p.sizeRangeOptions : [];
        return opts.indexOf(filters.sizeRange) !== -1;
      });
    }

    // Compatible system filter
    if (typeof filters.compatibleSystem === "string" && filters.compatibleSystem) {
      const target = filters.compatibleSystem.toLowerCase();
      filtered = filtered.filter((p) => {
        if (!p) return false;
        const systems = Array.isArray(p.compatibleSystems) ? p.compatibleSystems : [];
        return systems.some((s) => typeof s === "string" && s.toLowerCase() === target);
      });
    }

    // Min rating filter
    if (typeof filters.minRating === "number") {
      filtered = filtered.filter((p) => {
        if (!p) return false;
        const rating = typeof p.rating === "number" ? p.rating : 0;
        return rating >= filters.minRating;
      });
    }

    // Price range filters
    if (typeof filters.minPrice === "number") {
      filtered = filtered.filter((p) => {
        if (!p) return false;
        const price = typeof p.price === "number" ? p.price : 0;
        return price >= filters.minPrice;
      });
    }

    if (typeof filters.maxPrice === "number") {
      filtered = filtered.filter((p) => {
        if (!p) return false;
        const price = typeof p.price === "number" ? p.price : 0;
        return price <= filters.maxPrice;
      });
    }

    // Bulk discount filter
    if (typeof filters.hasBulkDiscount === "boolean") {
      if (filters.hasBulkDiscount) {
        filtered = filtered.filter((p) => p && p.hasBulkDiscount);
      }
    }

    // NiTi-only filter
    if (typeof filters.isNiTiOnly === "boolean" && filters.isNiTiOnly) {
      filtered = filtered.filter((p) => p && p.isNiTi);
    }

    // Active ingredient filter
    if (typeof filters.activeIngredient === "string" && filters.activeIngredient) {
      const q = filters.activeIngredient.toLowerCase();
      filtered = filtered.filter((p) => {
        if (!p || !p.activeIngredient) return false;
        return String(p.activeIngredient).toLowerCase() === q;
      });
    }

    // Reciprocating systems only (used in searchProducts)
    if (typeof filters.isReciprocatingSystemOnly === "boolean" && filters.isReciprocatingSystemOnly) {
      filtered = filtered.filter((p) => p && p.isReciprocatingSystem);
    }

    // Sort
    const sortKey = sortBy || "relevance";
    const sorted = filtered.slice();

    sorted.sort((a, b) => {
      if (!a || !b) return 0;
      const priceA = typeof a.price === "number" ? a.price : 0;
      const priceB = typeof b.price === "number" ? b.price : 0;
      const ratingA = typeof a.rating === "number" ? a.rating : 0;
      const ratingB = typeof b.rating === "number" ? b.rating : 0;
      const reviewsA = typeof a.reviewCount === "number" ? a.reviewCount : 0;
      const reviewsB = typeof b.reviewCount === "number" ? b.reviewCount : 0;
      const createdA = a.createdAt || "";
      const createdB = b.createdAt || "";

      switch (sortKey) {
        case "price_asc":
          return priceA - priceB;
        case "price_desc":
          return priceB - priceA;
        case "rating_desc":
          if (ratingB !== ratingA) return ratingB - ratingA;
          if (reviewsB !== reviewsA) return reviewsB - reviewsA;
          return priceA - priceB;
        case "rating_asc":
          if (ratingA !== ratingB) return ratingA - ratingB;
          if (reviewsA !== reviewsB) return reviewsA - reviewsB;
          return priceA - priceB;
        case "newest":
          // Newest first by createdAt
          if (createdA === createdB) return 0;
          return createdA > createdB ? -1 : 1;
        case "review_count_desc":
          if (reviewsB !== reviewsA) return reviewsB - reviewsA;
          return ratingB - ratingA;
        case "relevance":
        default:
          // Fallback relevance = high rating then more reviews
          if (ratingB !== ratingA) return ratingB - ratingA;
          if (reviewsB !== reviewsA) return reviewsB - reviewsA;
          return priceA - priceB;
      }
    });

    const totalCount = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = sorted.slice(start, end);

    return {
      items: pageItems,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
      sortBy: sortKey,
      appliedFilters: filters
    };
  }

  _loadStaticPageConfig() {
    const config = this._getFromStorage("static_pages", {});
    return config && typeof config === "object" ? config : {};
  }

  _saveDemoRequest(demoRequest) {
    const requests = this._getFromStorage("demo_requests", []);
    requests.push(demoRequest);
    this._saveToStorage("demo_requests", requests);
  }

  _sendNotificationForContactOrDemo(type, payload) {
    // Purely internal recording of notifications; no external side effects.
    const notifications = this._getFromStorage("notifications", []);
    notifications.push({
      id: this._generateId("notif"),
      type: type,
      payload: payload,
      createdAt: new Date().toISOString()
    });
    this._saveToStorage("notifications", notifications);
  }

  // ---------------------- Core Interface Implementations ----------------------

  // getHeaderSummary()
  getHeaderSummary() {
    const cart = this._getFromStorage("cart", null);
    const cartItemsAll = this._getFromStorage("cart_items", []);
    const wishlist = this._getFromStorage("wishlist", null);
    const wishlistItemsAll = this._getFromStorage("wishlist_items", []);
    const compareList = this._getFromStorage("compare_list", null);

    let cartItemCount = 0;
    let cartSubtotal = 0;
    let currency = "USD";

    if (cart) {
      const cartItems = cartItemsAll.filter((ci) => ci && ci.cartId === cart.id);
      cartItemCount = cartItems.reduce((sum, ci) => sum + (ci.quantity || 0), 0);
      cartSubtotal = typeof cart.subtotal === "number" ? cart.subtotal : 0;
      if (cart.currency) {
        currency = cart.currency;
      }
    }

    const wishlistItemCount = wishlist
      ? wishlistItemsAll.filter((wi) => wi && wi.wishlistId === wishlist.id).length
      : 0;

    const compareListCount = compareList && Array.isArray(compareList.productIds)
      ? compareList.productIds.length
      : 0;

    const { eligibleRule } = this._getFreeShippingRuleForSubtotal(cartSubtotal);
    const hasFreeShippingEligibility = !!eligibleRule;

    return {
      cartItemCount: cartItemCount,
      wishlistItemCount: wishlistItemCount,
      compareListCount: compareListCount,
      cartSubtotal: Number(cartSubtotal.toFixed ? cartSubtotal.toFixed(2) : cartSubtotal),
      currency: currency,
      hasFreeShippingEligibility: hasFreeShippingEligibility
    };
  }

  // getHomepageData()
  getHomepageData() {
    const categories = this._getFromStorage("categories", []);
    const products = this._getFromStorage("products", []);
    const articles = this._getFromStorage("articles", []);

    const activeCategories = categories.filter((c) => c && c.isActive);
    const featuredCategories = activeCategories
      .slice()
      .sort((a, b) => {
        const da = typeof a.displayOrder === "number" ? a.displayOrder : 9999;
        const db = typeof b.displayOrder === "number" ? b.displayOrder : 9999;
        if (da !== db) return da - db;
        const na = a.name || "";
        const nb = b.name || "";
        return na.localeCompare(nb);
      })
      .slice(0, 10);

    const activeProducts = products.filter((p) => p && p.status === "active");

    const featuredProducts = activeProducts
      .slice()
      .sort((a, b) => {
        const ratingA = typeof a.rating === "number" ? a.rating : 0;
        const ratingB = typeof b.rating === "number" ? b.rating : 0;
        const reviewsA = typeof a.reviewCount === "number" ? a.reviewCount : 0;
        const reviewsB = typeof b.reviewCount === "number" ? b.reviewCount : 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return reviewsB - reviewsA;
      })
      .slice(0, 12);

    const bulkDiscountHighlights = activeProducts
      .filter((p) => p.hasBulkDiscount && typeof p.bulkDiscountPercent === "number")
      .slice()
      .sort((a, b) => {
        const discA = typeof a.bulkDiscountPercent === "number" ? a.bulkDiscountPercent : 0;
        const discB = typeof b.bulkDiscountPercent === "number" ? b.bulkDiscountPercent : 0;
        return discB - discA;
      })
      .slice(0, 12);

    const featuredArticles = articles.filter((a) => a && a.isFeatured).slice(0, 10);

    return {
      featuredCategories: featuredCategories,
      featuredProducts: featuredProducts,
      bulkDiscountHighlights: bulkDiscountHighlights,
      featuredArticles: featuredArticles
    };
  }

  // getMainNavigationCategories()
  getMainNavigationCategories() {
    const categories = this._getFromStorage("categories", []);
    const active = categories.filter((c) => c && c.isActive);
    return active
      .slice()
      .sort((a, b) => {
        const da = typeof a.displayOrder === "number" ? a.displayOrder : 9999;
        const db = typeof b.displayOrder === "number" ? b.displayOrder : 9999;
        if (da !== db) return da - db;
        const na = a.name || "";
        const nb = b.name || "";
        return na.localeCompare(nb);
      });
  }

  // getCategoryDetails(categorySlug)
  getCategoryDetails(categorySlug) {
    const categories = this._getFromStorage("categories", []);
    const category = categories.find((c) => c && c.slug === categorySlug) || null;
    return category;
  }

  // getCategoryFilterOptions(categorySlug)
  getCategoryFilterOptions(categorySlug) {
    const products = this._getFromStorage("products", []);
    const allowedSlugs = this._getDescendantCategorySlugs(categorySlug);

    const relevantProducts = products.filter((p) => {
      if (!p || p.status === "archived") return false;
      const primaryMatch = allowedSlugs.indexOf(p.primaryCategorySlug) !== -1;
      const secondaryMatch = Array.isArray(p.secondaryCategorySlugs)
        ? p.secondaryCategorySlugs.some((slug) => allowedSlugs.indexOf(slug) !== -1)
        : false;
      return primaryMatch || secondaryMatch;
    });

    const lengthOptions = [];
    const taperOptions = [];
    const sizeOptions = [];
    const sizeRangeOptions = [];
    const compatibleSystems = [];
    const ratings = [];
    const prices = [];

    let supportsBulkDiscountFilter = false;
    let supportsNiTiFilter = false;
    let supportsActiveIngredientFilter = false;

    for (let i = 0; i < relevantProducts.length; i++) {
      const p = relevantProducts[i];
      if (!p) continue;

      if (Array.isArray(p.lengthOptions)) {
        lengthOptions.push.apply(lengthOptions, p.lengthOptions);
      }
      if (typeof p.defaultLength === "number") {
        lengthOptions.push(p.defaultLength);
      }
      if (Array.isArray(p.taperOptions)) {
        taperOptions.push.apply(taperOptions, p.taperOptions);
      }
      if (typeof p.defaultTaper === "string") {
        taperOptions.push(p.defaultTaper);
      }
      if (Array.isArray(p.sizeOptions)) {
        sizeOptions.push.apply(sizeOptions, p.sizeOptions);
      }
      if (typeof p.defaultSize === "number") {
        sizeOptions.push(p.defaultSize);
      }
      if (Array.isArray(p.sizeRangeOptions)) {
        sizeRangeOptions.push.apply(sizeRangeOptions, p.sizeRangeOptions);
      }
      if (Array.isArray(p.compatibleSystems)) {
        compatibleSystems.push.apply(compatibleSystems, p.compatibleSystems);
      }
      if (typeof p.rating === "number") {
        ratings.push(p.rating);
      }
      if (typeof p.price === "number") {
        prices.push(p.price);
      }
      if (p.hasBulkDiscount) supportsBulkDiscountFilter = true;
      if (p.isNiTi) supportsNiTiFilter = true;
      if (p.isIrrigant) supportsActiveIngredientFilter = true;
    }

    const uniqueLengths = this._unique(lengthOptions).filter((v) => typeof v === "number").sort((a, b) => a - b);
    const uniqueTapers = this._unique(taperOptions).filter((v) => typeof v === "string").sort();
    const uniqueSizes = this._unique(sizeOptions).filter((v) => typeof v === "number").sort((a, b) => a - b);
    const uniqueSizeRanges = this._unique(sizeRangeOptions).filter((v) => typeof v === "string").sort();
    const uniqueSystems = this._unique(compatibleSystems).filter((v) => typeof v === "string").sort();

    const ratingThresholds = this._unique(
      ratings.map((r) => {
        const rounded = Math.round(r * 2) / 2;
        return rounded;
      })
    )
      .filter((v) => typeof v === "number")
      .sort((a, b) => a - b);

    let minPrice = null;
    let maxPrice = null;
    if (prices.length > 0) {
      minPrice = Math.min.apply(null, prices);
      maxPrice = Math.max.apply(null, prices);
    }

    return {
      lengthOptions: uniqueLengths,
      taperOptions: uniqueTapers,
      sizeOptions: uniqueSizes,
      sizeRangeOptions: uniqueSizeRanges,
      compatibleSystems: uniqueSystems,
      ratingThresholds: ratingThresholds,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        currency: "USD"
      },
      supportsBulkDiscountFilter: supportsBulkDiscountFilter,
      supportsNiTiFilter: supportsNiTiFilter,
      supportsActiveIngredientFilter: supportsActiveIngredientFilter
    };
  }

  // listCategoryProducts(categorySlug, filters, sortBy, page, pageSize)
  listCategoryProducts(categorySlug, filters, sortBy, page, pageSize) {
    const products = this._getFromStorage("products", []);
    const allowedSlugs = this._getDescendantCategorySlugs(categorySlug);

    const categoryProducts = products.filter((p) => {
      if (!p || p.status === "archived") return false;
      const primaryMatch = allowedSlugs.indexOf(p.primaryCategorySlug) !== -1;
      const secondaryMatch = Array.isArray(p.secondaryCategorySlugs)
        ? p.secondaryCategorySlugs.some((slug) => allowedSlugs.indexOf(slug) !== -1)
        : false;
      return primaryMatch || secondaryMatch;
    });

    const result = this._filterAndSortProducts(categoryProducts, filters || {}, sortBy, page, pageSize);

    return {
      products: result.items,
      totalCount: result.totalCount,
      page: result.page,
      pageSize: result.pageSize,
      sortBy: result.sortBy,
      appliedFilters: result.appliedFilters
    };
  }

  // searchProducts(query, filters, sortBy, page, pageSize)
  searchProducts(query, filters, sortBy, page, pageSize) {
    const q = (query || "").trim().toLowerCase();
    const allProducts = this._getFromStorage("products", []);

    let matched = allProducts.filter((p) => {
      if (!p || p.status === "archived") return false;
      if (!q) return true;
      const name = (p.name || "").toLowerCase();
      const code = (p.code || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return name.indexOf(q) !== -1 || code === q || desc.indexOf(q) !== -1;
    });

    const result = this._filterAndSortProducts(matched, filters || {}, sortBy, page, pageSize);

    return {
      products: result.items,
      totalCount: result.totalCount,
      page: result.page,
      pageSize: result.pageSize,
      sortBy: result.sortBy,
      appliedFilters: result.appliedFilters
    };
  }

  // getSearchFilterOptions(query)
  getSearchFilterOptions(query) {
    const q = (query || "").trim().toLowerCase();
    const products = this._getFromStorage("products", []);

    const matched = products.filter((p) => {
      if (!p || p.status === "archived") return false;
      if (!q) return true;
      const name = (p.name || "").toLowerCase();
      const code = (p.code || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return name.indexOf(q) !== -1 || code === q || desc.indexOf(q) !== -1;
    });

    const categorySlugs = [];
    const lengthOptions = [];
    const taperOptions = [];
    const sizeOptions = [];
    const sizeRangeOptions = [];
    const compatibleSystems = [];
    const ratings = [];
    const prices = [];
    let supportsBulkDiscountFilter = false;

    for (let i = 0; i < matched.length; i++) {
      const p = matched[i];
      if (!p) continue;
      if (p.primaryCategorySlug) categorySlugs.push(p.primaryCategorySlug);
      if (Array.isArray(p.secondaryCategorySlugs)) {
        categorySlugs.push.apply(categorySlugs, p.secondaryCategorySlugs);
      }
      if (Array.isArray(p.lengthOptions)) lengthOptions.push.apply(lengthOptions, p.lengthOptions);
      if (typeof p.defaultLength === "number") lengthOptions.push(p.defaultLength);
      if (Array.isArray(p.taperOptions)) taperOptions.push.apply(taperOptions, p.taperOptions);
      if (typeof p.defaultTaper === "string") taperOptions.push(p.defaultTaper);
      if (Array.isArray(p.sizeOptions)) sizeOptions.push.apply(sizeOptions, p.sizeOptions);
      if (typeof p.defaultSize === "number") sizeOptions.push(p.defaultSize);
      if (Array.isArray(p.sizeRangeOptions)) sizeRangeOptions.push.apply(sizeRangeOptions, p.sizeRangeOptions);
      if (Array.isArray(p.compatibleSystems)) compatibleSystems.push.apply(compatibleSystems, p.compatibleSystems);
      if (typeof p.rating === "number") ratings.push(p.rating);
      if (typeof p.price === "number") prices.push(p.price);
      if (p.hasBulkDiscount) supportsBulkDiscountFilter = true;
    }

    const uniqueCategorySlugs = this._unique(categorySlugs).filter((v) => typeof v === "string");
    const uniqueLengths = this._unique(lengthOptions).filter((v) => typeof v === "number").sort((a, b) => a - b);
    const uniqueTapers = this._unique(taperOptions).filter((v) => typeof v === "string").sort();
    const uniqueSizes = this._unique(sizeOptions).filter((v) => typeof v === "number").sort((a, b) => a - b);
    const uniqueSizeRanges = this._unique(sizeRangeOptions).filter((v) => typeof v === "string").sort();
    const uniqueSystems = this._unique(compatibleSystems).filter((v) => typeof v === "string").sort();

    const ratingThresholds = this._unique(
      ratings.map((r) => {
        const rounded = Math.round(r * 2) / 2;
        return rounded;
      })
    )
      .filter((v) => typeof v === "number")
      .sort((a, b) => a - b);

    let minPrice = null;
    let maxPrice = null;
    if (prices.length > 0) {
      minPrice = Math.min.apply(null, prices);
      maxPrice = Math.max.apply(null, prices);
    }

    return {
      categorySlugs: uniqueCategorySlugs,
      lengthOptions: uniqueLengths,
      taperOptions: uniqueTapers,
      sizeOptions: uniqueSizes,
      sizeRangeOptions: uniqueSizeRanges,
      compatibleSystems: uniqueSystems,
      ratingThresholds: ratingThresholds,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        currency: "USD"
      },
      supportsBulkDiscountFilter: supportsBulkDiscountFilter
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p && p.id === productId) || null;
    return product;
  }

  // getSimilarProducts(productId)
  getSimilarProducts(productId) {
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p && p.id === productId) || null;
    if (!product || !Array.isArray(product.similarProductIds)) {
      return [];
    }
    const ids = product.similarProductIds;
    const result = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const p = products.find((prod) => prod && prod.id === id);
      if (p) result.push(p);
    }
    return result;
  }

  // addToCart(productId, quantity, selectedLength, selectedTaper, selectedSize, selectedSizeRange, selectedPackSize, selectedCompatibleSystem)
  addToCart(
    productId,
    quantity = 1,
    selectedLength,
    selectedTaper,
    selectedSize,
    selectedSizeRange,
    selectedPackSize,
    selectedCompatibleSystem
  ) {
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p && p.id === productId) || null;
    if (!product || product.status === "archived") {
      return {
        success: false,
        message: "Product not found or inactive.",
        addedItemId: null,
        cart: this._getFromStorage("cart", null),
        cartItems: [],
        cartSubtotal: 0,
        cartTotal: 0,
        totalDiscount: 0,
        currency: "USD",
        freeShipping: {
          eligible: false,
          shippingOptionKey: null,
          minSubtotal: null,
          maxSubtotal: null,
          amountToReachMin: null
        }
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);

    const qty = Math.max(parseInt(quantity, 10) || 1, 1);

    const chosenLength = typeof selectedLength === "number" ? selectedLength : product.defaultLength;
    const chosenTaper = typeof selectedTaper === "string" && selectedTaper ? selectedTaper : product.defaultTaper;
    const chosenSize = typeof selectedSize === "number" ? selectedSize : product.defaultSize;
    const chosenSizeRange = typeof selectedSizeRange === "string" && selectedSizeRange
      ? selectedSizeRange
      : (Array.isArray(product.sizeRangeOptions) && product.sizeRangeOptions.length > 0
          ? product.sizeRangeOptions[0]
          : null);
    const chosenPackSize = typeof selectedPackSize === "string" && selectedPackSize
      ? selectedPackSize
      : product.defaultPackSize;
    const chosenCompatibleSystem = typeof selectedCompatibleSystem === "string" && selectedCompatibleSystem
      ? selectedCompatibleSystem
      : (Array.isArray(product.compatibleSystems) && product.compatibleSystems.length > 0
          ? product.compatibleSystems[0]
          : null);

    // Try to merge with existing cart item with same configuration
    let existingItem = null;
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (!item || item.cartId !== cart.id || item.productId !== product.id) continue;
      if (
        item.selectedLength === chosenLength &&
        item.selectedTaper === chosenTaper &&
        item.selectedSize === chosenSize &&
        item.selectedSizeRange === chosenSizeRange &&
        item.selectedPackSize === chosenPackSize &&
        item.selectedCompatibleSystem === chosenCompatibleSystem
      ) {
        existingItem = item;
        break;
      }
    }

    let addedItemId;

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 0) + qty;
      addedItemId = existingItem.id;
    } else {
      const now = new Date().toISOString();
      const newItem = {
        id: this._generateId("cart_item"),
        cartId: cart.id,
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        quantity: qty,
        unitPrice: typeof product.price === "number" ? product.price : 0,
        lineSubtotal: 0,
        selectedLength: chosenLength || null,
        selectedTaper: chosenTaper || null,
        selectedSize: chosenSize || null,
        selectedSizeRange: chosenSizeRange || null,
        selectedPackSize: chosenPackSize || null,
        selectedCompatibleSystem: chosenCompatibleSystem || null,
        isBulkDiscountApplied: false,
        bulkDiscountPercentApplied: null,
        createdAt: now
      };
      cartItems.push(newItem);
      addedItemId = newItem.id;
      if (!Array.isArray(cart.itemIds)) cart.itemIds = [];
      cart.itemIds.push(newItem.id);
    }

    this._saveToStorage("cart_items", cartItems);
    this._saveToStorage("cart", cart);

    const recalculated = this._recalculateCartTotals();
    const finalCart = recalculated.cart;
    const finalItems = recalculated.cartItems;

    return {
      success: true,
      message: "Item added to cart.",
      addedItemId: addedItemId,
      cart: finalCart,
      cartItems: finalItems,
      cartSubtotal: finalCart.subtotal,
      cartTotal: finalCart.total,
      totalDiscount: finalCart.totalDiscount,
      currency: finalCart.currency,
      freeShipping: recalculated.freeShipping
    };
  }

  // getCart()
  getCart() {
    const recalculated = this._recalculateCartTotals();
    const cart = recalculated.cart;
    const cartItems = recalculated.cartItems;
    const products = this._getFromStorage("products", []);
    const shippingOptions = this._getFromStorage("shipping_options", []);

    const detailedItems = cartItems.map((ci) => {
      const product = products.find((p) => p && p.id === ci.productId) || null;
      return {
        cartItem: ci,
        product: product
      };
    });

    const availableShippingOptions = shippingOptions.filter((opt) => {
      if (!opt || !opt.isActive) return false;
      const min = typeof opt.minSubtotal === "number" ? opt.minSubtotal : null;
      const max = typeof opt.maxSubtotal === "number" ? opt.maxSubtotal : null;
      if (min !== null && cart.subtotal < min) return false;
      if (max !== null && cart.subtotal > max) return false;
      return true;
    });

    return {
      cart: cart,
      items: detailedItems,
      availableShippingOptions: availableShippingOptions,
      selectedShippingOptionKey: cart.shippingOptionKey,
      freeShipping: recalculated.freeShipping
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = parseInt(quantity, 10);
    let cartItems = this._getFromStorage("cart_items", []);
    const index = cartItems.findIndex((ci) => ci && ci.id === cartItemId);
    if (index === -1) {
      const cartNow = this._getFromStorage("cart", null) || this._getOrCreateCart();
      return {
        success: false,
        message: "Cart item not found.",
        cart: cartNow,
        items: [],
        freeShipping: {
          eligible: false,
          shippingOptionKey: null,
          minSubtotal: null,
          maxSubtotal: null,
          amountToReachMin: null
        }
      };
    }

    if (!qty || qty <= 0) {
      // Remove the item if quantity <= 0
      cartItems.splice(index, 1);
    } else {
      cartItems[index].quantity = qty;
    }

    this._saveToStorage("cart_items", cartItems);
    const recalculated = this._recalculateCartTotals();

    const products = this._getFromStorage("products", []);
    const detailedItems = recalculated.cartItems.map((ci) => ({
      cartItem: ci,
      product: products.find((p) => p && p.id === ci.productId) || null
    }));

    return {
      success: true,
      message: "Cart updated.",
      cart: recalculated.cart,
      items: detailedItems,
      freeShipping: recalculated.freeShipping
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage("cart_items", []);
    const cart = this._getOrCreateCart();
    const index = cartItems.findIndex((ci) => ci && ci.id === cartItemId);
    if (index === -1) {
      const recalculated = this._recalculateCartTotals();
      const products = this._getFromStorage("products", []);
      const detailedItems = recalculated.cartItems.map((ci) => ({
        cartItem: ci,
        product: products.find((p) => p && p.id === ci.productId) || null
      }));
      return {
        success: false,
        message: "Cart item not found.",
        cart: recalculated.cart,
        items: detailedItems,
        freeShipping: recalculated.freeShipping
      };
    }

    const removed = cartItems[index];
    cartItems.splice(index, 1);
    this._saveToStorage("cart_items", cartItems);

    if (Array.isArray(cart.itemIds)) {
      cart.itemIds = cart.itemIds.filter((id) => id !== removed.id);
    }
    this._saveToStorage("cart", cart);

    const recalculated = this._recalculateCartTotals();
    const products = this._getFromStorage("products", []);
    const detailedItems = recalculated.cartItems.map((ci) => ({
      cartItem: ci,
      product: products.find((p) => p && p.id === ci.productId) || null
    }));

    return {
      success: true,
      message: "Cart item removed.",
      cart: recalculated.cart,
      items: detailedItems,
      freeShipping: recalculated.freeShipping
    };
  }

  // updateCartShippingOption(shippingOptionKey)
  updateCartShippingOption(shippingOptionKey) {
    const shippingOptions = this._getFromStorage("shipping_options", []);
    const option = shippingOptions.find(
      (opt) => opt && opt.key === shippingOptionKey && opt.isActive
    );

    if (!option) {
      const cartCurrent = this._getFromStorage("cart", null) || this._getOrCreateCart();
      return {
        success: false,
        message: "Shipping option not found or inactive.",
        cart: cartCurrent,
        selectedShippingOption: null
      };
    }

    const cart = this._getOrCreateCart();
    cart.shippingOptionKey = option.key;
    this._saveToStorage("cart", cart);

    const recalculated = this._recalculateCartTotals();

    return {
      success: true,
      message: "Shipping option updated.",
      cart: recalculated.cart,
      selectedShippingOption: option
    };
  }

  // addToWishlist(productId, selectedLength, selectedTaper, selectedSize, selectedSizeRange, selectedPackSize, notes)
  addToWishlist(
    productId,
    selectedLength,
    selectedTaper,
    selectedSize,
    selectedSizeRange,
    selectedPackSize,
    notes
  ) {
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p && p.id === productId) || null;
    if (!product || product.status === "archived") {
      const wishlist = this._getCurrentWishlist();
      return {
        success: false,
        message: "Product not found or inactive.",
        wishlist: wishlist,
        items: []
      };
    }

    const wishlist = this._getCurrentWishlist();
    let wishlistItems = this._getFromStorage("wishlist_items", []);

    const chosenLength = typeof selectedLength === "number" ? selectedLength : product.defaultLength;
    const chosenTaper = typeof selectedTaper === "string" && selectedTaper ? selectedTaper : product.defaultTaper;
    const chosenSize = typeof selectedSize === "number" ? selectedSize : product.defaultSize;
    const chosenSizeRange = typeof selectedSizeRange === "string" && selectedSizeRange
      ? selectedSizeRange
      : (Array.isArray(product.sizeRangeOptions) && product.sizeRangeOptions.length > 0
          ? product.sizeRangeOptions[0]
          : null);
    const chosenPackSize = typeof selectedPackSize === "string" && selectedPackSize
      ? selectedPackSize
      : product.defaultPackSize;

    let existingItem = null;
    for (let i = 0; i < wishlistItems.length; i++) {
      const wi = wishlistItems[i];
      if (!wi || wi.wishlistId !== wishlist.id || wi.productId !== product.id) continue;
      if (
        wi.selectedLength === chosenLength &&
        wi.selectedTaper === chosenTaper &&
        wi.selectedSize === chosenSize &&
        wi.selectedSizeRange === chosenSizeRange &&
        wi.selectedPackSize === chosenPackSize
      ) {
        existingItem = wi;
        break;
      }
    }

    const now = new Date().toISOString();

    if (existingItem) {
      existingItem.notes = typeof notes === "string" ? notes : existingItem.notes;
    } else {
      const newItem = {
        id: this._generateId("wishlist_item"),
        wishlistId: wishlist.id,
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        selectedLength: chosenLength || null,
        selectedTaper: chosenTaper || null,
        selectedSize: chosenSize || null,
        selectedSizeRange: chosenSizeRange || null,
        selectedPackSize: chosenPackSize || null,
        notes: typeof notes === "string" ? notes : null,
        createdAt: now
      };
      wishlistItems.push(newItem);
      if (!Array.isArray(wishlist.itemIds)) wishlist.itemIds = [];
      wishlist.itemIds.push(newItem.id);
    }

    wishlist.updatedAt = now;
    this._saveToStorage("wishlist_items", wishlistItems);
    this._saveToStorage("wishlist", wishlist);

    const wishlistItemsForList = wishlistItems.filter((wi) => wi && wi.wishlistId === wishlist.id);
    const detailedItems = wishlistItemsForList.map((wi) => ({
      wishlistItem: wi,
      product: products.find((p) => p && p.id === wi.productId) || null
    }));

    return {
      success: true,
      message: "Item added to wishlist.",
      wishlist: wishlist,
      items: detailedItems
    };
  }

  // getWishlistItems()
  getWishlistItems() {
    const wishlist = this._getCurrentWishlist();
    const wishlistItems = this._getFromStorage("wishlist_items", []);
    const products = this._getFromStorage("products", []);

    const itemsForWishlist = wishlistItems.filter((wi) => wi && wi.wishlistId === wishlist.id);

    const detailedItems = itemsForWishlist.map((wi) => ({
      wishlistItem: wi,
      product: products.find((p) => p && p.id === wi.productId) || null
    }));

    return {
      wishlist: wishlist,
      items: detailedItems
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getCurrentWishlist();
    let wishlistItems = this._getFromStorage("wishlist_items", []);
    const index = wishlistItems.findIndex((wi) => wi && wi.id === wishlistItemId);
    if (index === -1) {
      return {
        success: false,
        message: "Wishlist item not found.",
        wishlist: wishlist,
        items: wishlistItems.filter((wi) => wi && wi.wishlistId === wishlist.id)
      };
    }

    const removed = wishlistItems[index];
    wishlistItems.splice(index, 1);
    if (Array.isArray(wishlist.itemIds)) {
      wishlist.itemIds = wishlist.itemIds.filter((id) => id !== removed.id);
    }
    wishlist.updatedAt = new Date().toISOString();

    this._saveToStorage("wishlist_items", wishlistItems);
    this._saveToStorage("wishlist", wishlist);

    return {
      success: true,
      message: "Wishlist item removed.",
      wishlist: wishlist,
      items: wishlistItems.filter((wi) => wi && wi.wishlistId === wishlist.id)
    };
  }

  // moveWishlistItemToCart(wishlistItemId, quantity)
  moveWishlistItemToCart(wishlistItemId, quantity) {
    const wishlist = this._getCurrentWishlist();
    let wishlistItems = this._getFromStorage("wishlist_items", []);
    const wiIndex = wishlistItems.findIndex((wi) => wi && wi.id === wishlistItemId);
    if (wiIndex === -1) {
      const cartCurrent = this._getFromStorage("cart", null) || this._getOrCreateCart();
      return {
        success: false,
        message: "Wishlist item not found.",
        wishlist: wishlist,
        wishlistItems: wishlistItems.filter((wi) => wi && wi.wishlistId === wishlist.id),
        cart: cartCurrent,
        cartItems: this._getFromStorage("cart_items", [])
      };
    }

    const wishlistItem = wishlistItems[wiIndex];

    // Add to cart using wishlist configuration
    const addResult = this.addToCart(
      wishlistItem.productId,
      quantity,
      wishlistItem.selectedLength,
      wishlistItem.selectedTaper,
      wishlistItem.selectedSize,
      wishlistItem.selectedSizeRange,
      wishlistItem.selectedPackSize,
      null
    );

    // Remove from wishlist if add succeeded
    if (addResult.success) {
      wishlistItems.splice(wiIndex, 1);
      if (Array.isArray(wishlist.itemIds)) {
        wishlist.itemIds = wishlist.itemIds.filter((id) => id !== wishlistItem.id);
      }
      wishlist.updatedAt = new Date().toISOString();
      this._saveToStorage("wishlist_items", wishlistItems);
      this._saveToStorage("wishlist", wishlist);
    }

    return {
      success: addResult.success,
      message: addResult.success ? "Moved to cart." : "Failed to move to cart.",
      wishlist: wishlist,
      wishlistItems: wishlistItems.filter((wi) => wi && wi.wishlistId === wishlist.id),
      cart: addResult.cart,
      cartItems: addResult.cartItems
    };
  }

  // addProductToCompareList(productId)
  addProductToCompareList(productId) {
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p && p.id === productId) || null;
    const compareList = this._getCurrentCompareList();

    if (!product || product.status === "archived") {
      const currentProducts = this.getProductsByIds(compareList.productIds || []);
      return {
        success: false,
        message: "Product not found or inactive.",
        compareList: compareList,
        products: currentProducts
      };
    }

    if (!Array.isArray(compareList.productIds)) compareList.productIds = [];
    if (compareList.productIds.indexOf(product.id) === -1) {
      compareList.productIds.push(product.id);
      this._saveToStorage("compare_list", compareList);
    }

    const compareProducts = this.getProductsByIds(compareList.productIds);

    return {
      success: true,
      message: "Product added to compare list.",
      compareList: compareList,
      products: compareProducts
    };
  }

  // removeProductFromCompareList(productId)
  removeProductFromCompareList(productId) {
    const compareList = this._getCurrentCompareList();
    if (!Array.isArray(compareList.productIds)) compareList.productIds = [];
    compareList.productIds = compareList.productIds.filter((id) => id !== productId);
    this._saveToStorage("compare_list", compareList);

    const compareProducts = this.getProductsByIds(compareList.productIds);

    return {
      success: true,
      message: "Product removed from compare list.",
      compareList: compareList,
      products: compareProducts
    };
  }

  // getCompareList()
  getCompareList() {
    const compareList = this._getCurrentCompareList();
    const products = this.getProductsByIds(compareList.productIds || []);
    return {
      compareList: compareList,
      products: products
    };
  }

  // clearCompareList()
  clearCompareList() {
    const compareList = this._getCurrentCompareList();
    compareList.productIds = [];
    this._saveToStorage("compare_list", compareList);
    return {
      success: true,
      message: "Compare list cleared.",
      compareList: compareList
    };
  }

  // listClinicalArticles(searchQuery, filters, sortBy, page, pageSize)
  listClinicalArticles(searchQuery, filters, sortBy, page, pageSize) {
    const q = (searchQuery || "").trim().toLowerCase();
    filters = filters || {};
    sortBy = sortBy || "newest";
    page = page || 1;
    pageSize = pageSize || 20;

    const articles = this._getFromStorage("articles", []);

    let filtered = articles.filter((a) => {
      if (!a) return false;
      if (filters.isFeatured === true && !a.isFeatured) return false;
      if (filters.topic && a.topic !== filters.topic) return false;
      if (filters.tag && (!Array.isArray(a.tags) || a.tags.indexOf(filters.tag) === -1)) {
        return false;
      }
      if (!q) return true;
      const title = (a.title || "").toLowerCase();
      const summary = (a.summary || "").toLowerCase();
      const body = (a.body || "").toLowerCase();
      const tags = Array.isArray(a.tags) ? a.tags.join(" ").toLowerCase() : "";
      return (
        title.indexOf(q) !== -1 ||
        summary.indexOf(q) !== -1 ||
        body.indexOf(q) !== -1 ||
        tags.indexOf(q) !== -1
      );
    });

    filtered = filtered.slice().sort((a, b) => {
      const createdA = a.createdAt || "";
      const createdB = b.createdAt || "";
      const titleA = a.title || "";
      const titleB = b.title || "";
      switch (sortBy) {
        case "alphabetical":
          return titleA.localeCompare(titleB);
        case "relevance":
          // For now, treat relevance as newest
        case "newest":
        default:
          if (createdA === createdB) return 0;
          return createdA > createdB ? -1 : 1;
      }
    });

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageArticles = filtered.slice(start, end);

    return {
      articles: pageArticles,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // getClinicalArticleDetail(articleId)
  getClinicalArticleDetail(articleId) {
    const articles = this._getFromStorage("articles", []);
    const article = articles.find((a) => a && a.id === articleId) || null;
    return article;
  }

  // getProductsByIds(productIds)
  getProductsByIds(productIds) {
    const ids = Array.isArray(productIds) ? productIds : [];
    const products = this._getFromStorage("products", []);
    const result = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const p = products.find((prod) => prod && prod.id === id);
      if (p) result.push(p);
    }
    return result;
  }

  // submitDemoRequest(productId, productModelName, fullName, clinicName, email, phone, preferredDate, comments)
  submitDemoRequest(
    productId,
    productModelName,
    fullName,
    clinicName,
    email,
    phone,
    preferredDate,
    comments
  ) {
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p && p.id === productId) || null;

    if (!product) {
      return {
        success: false,
        message: "Product not found.",
        demoRequest: null
      };
    }

    const now = new Date().toISOString();
    const modelName = productModelName || product.demoProductModelName || product.name;

    const demoRequest = {
      id: this._generateId("demo"),
      productId: product.id,
      productModelName: modelName || null,
      fullName: fullName,
      clinicName: clinicName,
      email: email,
      phone: phone,
      preferredDate: preferredDate,
      comments: comments || null,
      status: "submitted",
      createdAt: now
    };

    this._saveDemoRequest(demoRequest);
    this._sendNotificationForContactOrDemo("demo_request", demoRequest);

    return {
      success: true,
      message: "Demo request submitted.",
      demoRequest: demoRequest
    };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const config = this._loadStaticPageConfig();
    const page = config[pageKey] || null;
    if (!page) {
      return {
        title: "",
        bodyHtml: "",
        lastUpdated: null,
        additionalSections: []
      };
    }
    return {
      title: page.title || "",
      bodyHtml: page.bodyHtml || "",
      lastUpdated: page.lastUpdated || null,
      additionalSections: Array.isArray(page.additionalSections) ? page.additionalSections : []
    };
  }

  // submitContactForm(fullName, email, phone, topic, subject, message)
  submitContactForm(fullName, email, phone, topic, subject, message) {
    const tickets = this._getFromStorage("contact_tickets", []);
    const ticket = {
      id: this._generateId("ticket"),
      fullName: fullName,
      email: email,
      phone: phone || null,
      topic: topic || null,
      subject: subject,
      message: message,
      createdAt: new Date().toISOString()
    };
    tickets.push(ticket);
    this._saveToStorage("contact_tickets", tickets);
    this._sendNotificationForContactOrDemo("contact_form", ticket);

    return {
      success: true,
      message: "Your message has been received.",
      ticketId: ticket.id
    };
  }

  // getFAQEntries(searchQuery, category)
  getFAQEntries(searchQuery, category) {
    const q = (searchQuery || "").trim().toLowerCase();
    const catFilter = category || null;
    const entries = this._getFromStorage("faq_entries", []);

    const filtered = entries.filter((e) => {
      if (!e) return false;
      if (catFilter && e.category !== catFilter) return false;
      if (!q) return true;
      const question = (e.question || "").toLowerCase();
      const answer = (e.answerHtml || "").toLowerCase();
      return question.indexOf(q) !== -1 || answer.indexOf(q) !== -1;
    });

    return filtered;
  }
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}
