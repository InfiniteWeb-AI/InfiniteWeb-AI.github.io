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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core data tables based on data models
    ensure("categories", []); // Category
    ensure("subcategories", []); // Subcategory
    ensure("products", []); // Product

    // Single-user cart + items
    if (localStorage.getItem("cart") === null) {
      localStorage.setItem("cart", JSON.stringify(null));
    }
    ensure("cart_items", []); // CartItem

    // Single-user wishlist + items
    if (localStorage.getItem("wishlist") === null) {
      localStorage.setItem("wishlist", JSON.stringify(null));
    }
    ensure("wishlist_items", []); // WishlistItem

    // Coupons and shipping methods
    ensure("coupons", []); // Coupon
    ensure("shipping_methods", []); // ShippingMethod

    // Orders and order items
    ensure("orders", []); // Order
    ensure("order_items", []); // OrderItem

    // Account (single user)
    if (localStorage.getItem("account") === null) {
      localStorage.setItem("account", JSON.stringify(null));
    }

    // Checkout state (single user)
    if (localStorage.getItem("checkout_state") === null) {
      localStorage.setItem(
        "checkout_state",
        JSON.stringify({ selectedShippingMethodCode: null, selectedPaymentMethod: null })
      );
    }

    // Basic CMS-like content containers
    if (localStorage.getItem("about_content") === null) {
      localStorage.setItem(
        "about_content",
        JSON.stringify({ title: "", body: "", sections: [] })
      );
    }
    if (localStorage.getItem("contact_info") === null) {
      localStorage.setItem(
        "contact_info",
        JSON.stringify({ email: "", phone: "", address: "", supportHours: "" })
      );
    }
    if (localStorage.getItem("faq_content") === null) {
      localStorage.setItem(
        "faq_content",
        JSON.stringify({ sections: [] })
      );
    }
    if (localStorage.getItem("shipping_returns_content") === null) {
      localStorage.setItem(
        "shipping_returns_content",
        JSON.stringify({
          overview: "",
          shippingDetails: "",
          returnsPolicy: "",
          damagedPlantInstructions: "",
          subscriptionIssuesInstructions: ""
        })
      );
    }
    if (localStorage.getItem("privacy_policy_content") === null) {
      localStorage.setItem(
        "privacy_policy_content",
        JSON.stringify({ lastUpdated: "", body: "" })
      );
    }
    if (localStorage.getItem("terms_content") === null) {
      localStorage.setItem(
        "terms_content",
        JSON.stringify({ lastUpdated: "", body: "" })
      );
    }

    // Contact form submissions log (optional)
    ensure("contact_messages", []);

    // Global ID counter
    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed === null || parsed === undefined ? defaultValue : parsed;
    } catch (e) {
      return defaultValue;
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

  _getRawCart() {
    return this._getFromStorage("cart", null);
  }

  _saveRawCart(cart) {
    this._saveToStorage("cart", cart);
  }

  _getOrCreateCart() {
    let cart = this._getRawCart();
    if (!cart || typeof cart !== "object") {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId("cart"),
        created_at: now,
        updated_at: now,
        items: [], // array of CartItem.id
        subtotal: 0,
        discount_total: 0,
        shipping_total: 0,
        tax_total: 0,
        total: 0,
        applied_coupon_code: null,
        coupon_discount_amount: 0,
        selected_shipping_method_code: null
      };
      this._saveRawCart(cart);
    }
    return cart;
  }

  _getRawWishlist() {
    return this._getFromStorage("wishlist", null);
  }

  _saveRawWishlist(wishlist) {
    this._saveToStorage("wishlist", wishlist);
  }

  _getOrCreateWishlist() {
    let wishlist = this._getRawWishlist();
    if (!wishlist || typeof wishlist !== "object") {
      const now = new Date().toISOString();
      wishlist = {
        id: this._generateId("wishlist"),
        created_at: now,
        updated_at: now,
        items: [] // array of WishlistItem.id
      };
      this._saveRawWishlist(wishlist);
    }
    return wishlist;
  }

  _getCheckoutState() {
    let state = this._getFromStorage("checkout_state", null);
    if (!state || typeof state !== "object") {
      state = { selectedShippingMethodCode: null, selectedPaymentMethod: null };
      this._saveToStorage("checkout_state", state);
    }
    return state;
  }

  _saveCheckoutState(state) {
    this._saveToStorage("checkout_state", state);
  }

  // -------------------- Hydration helpers --------------------

  _hydrateCart(cart) {
    if (!cart) return null;
    const cartItems = this._getFromStorage("cart_items", []);
    const products = this._getFromStorage("products", []);

    const items = (cart.items || [])
      .map((itemId) => {
        const item = cartItems.find((ci) => ci.id === itemId && ci.cart_id === cart.id);
        if (!item) return null;
        const product = products.find((p) => p.id === item.product_id) || null;
        return { ...item, product };
      })
      .filter(Boolean);

    return { ...cart, items };
  }

  _hydrateOrder(order) {
    if (!order) return null;
    const orderItems = this._getFromStorage("order_items", []);
    const products = this._getFromStorage("products", []);

    const items = (order.items || [])
      .map((itemId) => {
        const item = orderItems.find((oi) => oi.id === itemId && oi.order_id === order.id);
        if (!item) return null;
        const product = products.find((p) => p.id === item.product_id) || null;
        return { ...item, product };
      })
      .filter(Boolean);

    return { ...order, items };
  }

  _hydrateWishlist(wishlist) {
    if (!wishlist) return null;
    const wishlistItems = this._getFromStorage("wishlist_items", []);
    const products = this._getFromStorage("products", []);

    const items = (wishlist.items || [])
      .map((itemId) => {
        const item = wishlistItems.find((wi) => wi.id === itemId && wi.wishlist_id === wishlist.id);
        if (!item) return null;
        const product = products.find((p) => p.id === item.product_id) || null;
        return { ...item, product };
      })
      .filter(Boolean);

    return { ...wishlist, items };
  }

  // -------------------- Coupon & totals helpers --------------------

  _validateCouponForCart(cart, coupon) {
    if (!coupon || !coupon.is_active) {
      return { valid: false, message: "Coupon is not active" };
    }

    const now = new Date();
    if (coupon.valid_from) {
      const from = new Date(coupon.valid_from);
      if (from.toString() !== "Invalid Date" && now < from) {
        return { valid: false, message: "Coupon is not yet valid" };
      }
    }
    if (coupon.valid_to) {
      const to = new Date(coupon.valid_to);
      if (to.toString() !== "Invalid Date" && now > to) {
        return { valid: false, message: "Coupon has expired" }; 
      }
    }

    if (coupon.min_subtotal != null && cart.subtotal < coupon.min_subtotal) {
      return { valid: false, message: "Cart subtotal is below coupon minimum" };
    }

    if (coupon.applicable_category_ids && coupon.applicable_category_ids.length > 0) {
      const cartItems = this._getFromStorage("cart_items", []);
      const products = this._getFromStorage("products", []);
      const relevantItems = cartItems.filter((ci) => ci.cart_id === cart.id);
      const hasApplicable = relevantItems.some((ci) => {
        const product = products.find((p) => p.id === ci.product_id);
        if (!product) return false;
        return coupon.applicable_category_ids.indexOf(product.category_id) !== -1;
      });
      if (!hasApplicable) {
        return { valid: false, message: "Coupon does not apply to items in cart" };
      }
    }

    return { valid: true, message: "Coupon is valid" };
  }

  _recalculateCartTotals(cart) {
    if (!cart) return null;

    const cartItems = this._getFromStorage("cart_items", []);
    const shippingMethods = this._getFromStorage("shipping_methods", []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let subtotal = 0;
    itemsForCart.forEach((ci) => {
      const line = typeof ci.line_subtotal === "number" ? ci.line_subtotal : 0;
      subtotal += line;
    });
    cart.subtotal = Number(subtotal.toFixed(2));

    let shipping_total = 0;
    let shippingMethod = null;
    if (cart.selected_shipping_method_code) {
      shippingMethod = shippingMethods.find(
        (sm) => sm.code === cart.selected_shipping_method_code
      );
    }
    if (shippingMethod) {
      shipping_total = shippingMethod.base_cost || 0;
    }
    cart.shipping_total = Number(shipping_total.toFixed(2));

    let discount_total = 0;
    let coupon_discount_amount = 0;

    if (cart.applied_coupon_code) {
      const coupons = this._getFromStorage("coupons", []);
      const coupon = coupons.find(
        (c) => String(c.code).toLowerCase() === String(cart.applied_coupon_code).toLowerCase()
      );
      const validation = this._validateCouponForCart(cart, coupon);

      if (coupon && validation.valid) {
        if (coupon.discount_type === "percent") {
          coupon_discount_amount = cart.subtotal * (coupon.discount_value / 100);
        } else if (coupon.discount_type === "fixed_amount") {
          coupon_discount_amount = Math.min(cart.subtotal, coupon.discount_value);
        } else if (coupon.discount_type === "free_shipping") {
          coupon_discount_amount = cart.shipping_total;
          cart.shipping_total = 0;
        }
        discount_total += coupon_discount_amount;
        cart.applied_coupon_code = coupon.code;
        cart.coupon_discount_amount = Number(coupon_discount_amount.toFixed(2));
      } else {
        cart.applied_coupon_code = null;
        cart.coupon_discount_amount = 0;
      }
    } else {
      cart.coupon_discount_amount = 0;
    }

    cart.discount_total = Number(discount_total.toFixed(2));
    cart.tax_total = 0;

    let total = cart.subtotal - cart.discount_total + cart.shipping_total + cart.tax_total;
    if (total < 0) total = 0;
    cart.total = Number(total.toFixed(2));
    cart.updated_at = new Date().toISOString();

    this._saveRawCart(cart);
    return cart;
  }

  // -------------------- Context filtering helper --------------------

  _filterProductsByContext(categorySlug, subcategorySlug, query) {
    const products = this._getFromStorage("products", []);
    const categories = this._getFromStorage("categories", []);
    const subcategories = this._getFromStorage("subcategories", []);

    let filtered = products.slice();

    if (categorySlug) {
      const category = categories.find((c) => c.slug === categorySlug);
      if (category) {
        filtered = filtered.filter((p) => p.category_id === category.id);
      } else {
        filtered = [];
      }
    }

    if (subcategorySlug && filtered.length > 0) {
      const subcat = subcategories.find((s) => s.slug === subcategorySlug);
      if (subcat) {
        filtered = filtered.filter((p) => p.subcategory_id === subcat.id);
      } else {
        filtered = [];
      }
    }

    if (query && filtered.length > 0) {
      const q = String(query).toLowerCase();
      filtered = filtered.filter((p) => {
        const nameMatch = p.name && String(p.name).toLowerCase().includes(q);
        const descMatch = p.description && String(p.description).toLowerCase().includes(q);
        const tags = Array.isArray(p.tags) ? p.tags : [];
        const tagsMatch = tags.some((t) => String(t).toLowerCase().includes(q));
        return nameMatch || descMatch || tagsMatch;
      });
    }

    return filtered;
  }

  // -------------------- Interface implementations --------------------

  // getMainCategories(): [Category]
  getMainCategories() {
    return this._getFromStorage("categories", []);
  }

  // getHomeHighlights(): featuredProducts, bestsellingProducts, promotions
  getHomeHighlights() {
    const products = this._getFromStorage("products", []);
    const coupons = this._getFromStorage("coupons", []);

    const featuredProducts = products
      .slice()
      .sort((a, b) => {
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bCreated - aCreated;
      })
      .slice(0, 10);

    const bestsellingProducts = products
      .slice()
      .sort((a, b) => {
        const ar = typeof a.bestseller_rank === "number" ? a.bestseller_rank : Number.MAX_SAFE_INTEGER;
        const br = typeof b.bestseller_rank === "number" ? b.bestseller_rank : Number.MAX_SAFE_INTEGER;
        return ar - br;
      })
      .slice(0, 10);

    const now = new Date();
    const promotions = coupons
      .filter((c) => c.is_active)
      .map((c) => {
        const validTo = c.valid_to || null;
        let isExpired = false;
        if (validTo) {
          const dt = new Date(validTo);
          if (dt.toString() !== "Invalid Date" && now > dt) {
            isExpired = true;
          }
        }
        if (isExpired) return null;
        return {
          code: c.code,
          title: c.description || c.code,
          description: c.description || "",
          validTo: validTo || null
        };
      })
      .filter(Boolean);

    return { featuredProducts, bestsellingProducts, promotions };
  }

  // getSubcategoriesForCategory(categorySlug): [Subcategory]
  getSubcategoriesForCategory(categorySlug) {
    const categories = this._getFromStorage("categories", []);
    const subcategories = this._getFromStorage("subcategories", []);
    const category = categories.find((c) => c.slug === categorySlug);
    if (!category) return [];
    return subcategories.filter((s) => s.parent_category_id === category.id);
  }

  // getProductFilterOptions(categorySlug?, subcategorySlug?, query?)
  getProductFilterOptions(categorySlug, subcategorySlug, query) {
    const contextProducts = this._filterProductsByContext(
      categorySlug,
      subcategorySlug,
      query
    );

    if (contextProducts.length === 0) {
      return {
        price: { min: 0, max: 0, currency: "usd" },
        ratingBuckets: [],
        lightRequirements: [],
        plantTypes: [],
        sizes: [],
        materials: [],
        colors: [],
        careDifficulties: [],
        hasPetSafeFilter: false,
        hasFreeShippingFilter: false,
        height: { min: 0, max: 0, unit: "cm" },
        subscriptionIntervals: [],
        sortOptions: [
          { id: "bestselling", label: "Bestselling" },
          { id: "price_low_to_high", label: "Price: Low to High" },
          { id: "price_high_to_low", label: "Price: High to Low" },
          { id: "rating_high_to_low", label: "Rating: High to Low" }
        ]
      };
    }

    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = 0;
    let currency = "usd";
    const lightSet = new Set();
    const plantTypeSet = new Set();
    const sizeSet = new Set();
    const materialSet = new Set();
    const colorSet = new Set();
    const careSet = new Set();
    let minHeight = Number.POSITIVE_INFINITY;
    let maxHeight = 0;
    let hasHeight = false;
    let hasPetSafe = false;
    let hasFreeShipping = false;
    const intervalSet = new Set();

    contextProducts.forEach((p) => {
      if (typeof p.price === "number") {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
      if (p.currency) currency = p.currency;
      if (p.light_requirements) lightSet.add(p.light_requirements);
      if (p.plant_type) plantTypeSet.add(p.plant_type);
      if (p.size) sizeSet.add(p.size);
      if (p.material) materialSet.add(p.material);
      if (p.color) colorSet.add(p.color);
      if (p.care_difficulty) careSet.add(p.care_difficulty);
      if (typeof p.height_cm === "number") {
        hasHeight = true;
        if (p.height_cm < minHeight) minHeight = p.height_cm;
        if (p.height_cm > maxHeight) maxHeight = p.height_cm;
      }
      if (p.pet_safe) hasPetSafe = true;
      if (p.is_free_shipping) hasFreeShipping = true;
      if (Array.isArray(p.subscription_allowed_intervals)) {
        p.subscription_allowed_intervals.forEach((i) => intervalSet.add(i));
      }
    });

    if (!isFinite(minPrice)) minPrice = 0;

    const ratingBuckets = [
      { id: "4_stars_and_up", label: "4 stars & up", minRating: 4.0 },
      { id: "4_5_stars_and_up", label: "4.5 stars & up", minRating: 4.5 }
    ];

    return {
      price: { min: minPrice, max: maxPrice, currency },
      ratingBuckets,
      lightRequirements: Array.from(lightSet),
      plantTypes: Array.from(plantTypeSet),
      sizes: Array.from(sizeSet),
      materials: Array.from(materialSet),
      colors: Array.from(colorSet),
      careDifficulties: Array.from(careSet),
      hasPetSafeFilter: hasPetSafe,
      hasFreeShippingFilter: hasFreeShipping,
      height: {
        min: hasHeight ? minHeight : 0,
        max: hasHeight ? maxHeight : 0,
        unit: "cm"
      },
      subscriptionIntervals: Array.from(intervalSet),
      sortOptions: [
        { id: "bestselling", label: "Bestselling" },
        { id: "price_low_to_high", label: "Price: Low to High" },
        { id: "price_high_to_low", label: "Price: High to Low" },
        { id: "rating_high_to_low", label: "Rating: High to Low" }
      ]
    };
  }

  // searchProducts(categorySlug?, subcategorySlug?, query?, page?, pageSize?, sort?, filters?)
  searchProducts(categorySlug, subcategorySlug, query, page, pageSize, sort, filters) {
    let products = this._filterProductsByContext(categorySlug, subcategorySlug, query);

    const appliedFilters = {};
    const f = filters || {};

    // Price
    if (typeof f.minPrice === "number") {
      products = products.filter((p) => typeof p.price === "number" && p.price >= f.minPrice);
      appliedFilters.minPrice = f.minPrice;
    }
    if (typeof f.maxPrice === "number") {
      products = products.filter((p) => typeof p.price === "number" && p.price <= f.maxPrice);
      appliedFilters.maxPrice = f.maxPrice;
    }

    // Rating bucket and minRating
    let minRatingFromBucket = null;
    if (f.ratingBucket) {
      if (f.ratingBucket === "4_stars_and_up") minRatingFromBucket = 4.0;
      if (f.ratingBucket === "4_5_stars_and_up") minRatingFromBucket = 4.5;
      appliedFilters.ratingBucket = f.ratingBucket;
    }
    const minRating = typeof f.minRating === "number" ? f.minRating : minRatingFromBucket;
    if (typeof minRating === "number") {
      products = products.filter((p) => typeof p.rating === "number" && p.rating >= minRating);
      appliedFilters.minRating = minRating;
    }

    // Other filters
    if (f.lightRequirements) {
      products = products.filter((p) => p.light_requirements === f.lightRequirements);
      appliedFilters.lightRequirements = f.lightRequirements;
    }
    if (f.plantType) {
      products = products.filter((p) => p.plant_type === f.plantType);
      appliedFilters.plantType = f.plantType;
    }
    if (f.size) {
      products = products.filter((p) => p.size === f.size);
      appliedFilters.size = f.size;
    }
    if (f.material) {
      products = products.filter((p) => p.material === f.material);
      appliedFilters.material = f.material;
    }
    if (f.color) {
      products = products.filter((p) => p.color === f.color);
      appliedFilters.color = f.color;
    }
    if (typeof f.freeShipping === "boolean") {
      products = products.filter((p) => !!p.is_free_shipping === f.freeShipping);
      appliedFilters.freeShipping = f.freeShipping;
    }
    if (typeof f.petSafe === "boolean") {
      products = products.filter((p) => !!p.pet_safe === f.petSafe);
      appliedFilters.petSafe = f.petSafe;
    }
    if (f.careDifficulty) {
      products = products.filter((p) => p.care_difficulty === f.careDifficulty);
      appliedFilters.careDifficulty = f.careDifficulty;
    }
    if (typeof f.maxHeightCm === "number") {
      products = products.filter((p) =>
        typeof p.height_cm === "number" ? p.height_cm <= f.maxHeightCm : true
      );
      appliedFilters.maxHeightCm = f.maxHeightCm;
    }
    if (f.productType) {
      products = products.filter((p) => p.product_type === f.productType);
      appliedFilters.productType = f.productType;
    }
    if (f.subscriptionInterval) {
      products = products.filter((p) =>
        Array.isArray(p.subscription_allowed_intervals)
          ? p.subscription_allowed_intervals.indexOf(f.subscriptionInterval) !== -1
          : false
      );
      appliedFilters.subscriptionInterval = f.subscriptionInterval;
    }
    if (typeof f.isGiftEligible === "boolean") {
      products = products.filter((p) => !!p.is_gift_eligible === f.isGiftEligible);
      appliedFilters.isGiftEligible = f.isGiftEligible;
    }

    // Sorting
    const sortKey = sort || "bestselling";
    const sortedProducts = products.slice();

    if (sortKey === "price_low_to_high") {
      sortedProducts.sort((a, b) => {
        const ap = typeof a.price === "number" ? a.price : Number.MAX_SAFE_INTEGER;
        const bp = typeof b.price === "number" ? b.price : Number.MAX_SAFE_INTEGER;
        return ap - bp;
      });
    } else if (sortKey === "price_high_to_low") {
      sortedProducts.sort((a, b) => {
        const ap = typeof a.price === "number" ? a.price : 0;
        const bp = typeof b.price === "number" ? b.price : 0;
        return bp - ap;
      });
    } else if (sortKey === "rating_high_to_low") {
      sortedProducts.sort((a, b) => {
        const ar = typeof a.rating === "number" ? a.rating : 0;
        const br = typeof b.rating === "number" ? b.rating : 0;
        if (br === ar) {
          const ac = typeof a.rating_count === "number" ? a.rating_count : 0;
          const bc = typeof b.rating_count === "number" ? b.rating_count : 0;
          return bc - ac;
        }
        return br - ar;
      });
    } else {
      // bestselling (default)
      sortedProducts.sort((a, b) => {
        const ar = typeof a.bestseller_rank === "number" ? a.bestseller_rank : Number.MAX_SAFE_INTEGER;
        const br = typeof b.bestseller_rank === "number" ? b.bestseller_rank : Number.MAX_SAFE_INTEGER;
        return ar - br;
      });
    }

    const currentPage = page && page > 0 ? page : 1;
    const currentPageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * currentPageSize;
    const pagedProducts = sortedProducts.slice(start, start + currentPageSize);

    return {
      products: pagedProducts,
      totalCount: sortedProducts.length,
      page: currentPage,
      pageSize: currentPageSize,
      appliedSort: sortKey,
      appliedFilters
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage("products", []);
    const categories = this._getFromStorage("categories", []);
    const subcategories = this._getFromStorage("subcategories", []);

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        subcategory: null,
        specifications: null,
        subscriptionOptions: null,
        giftOptions: null,
        breadcrumbs: []
      };
    }

    const category = categories.find((c) => c.id === product.category_id) || null;
    const subcategory = subcategories.find((s) => s.id === product.subcategory_id) || null;

    const specifications = {
      heightCm: product.height_cm != null ? product.height_cm : null,
      planterDiameterCm:
        product.planter_diameter_cm != null ? product.planter_diameter_cm : null,
      material: product.material || null,
      color: product.color || null,
      lightRequirements: product.light_requirements || null,
      size: product.size || null,
      plantType: product.plant_type || null,
      petSafe: product.pet_safe != null ? product.pet_safe : null,
      careDifficulty: product.care_difficulty || null,
      shippingWeightKg: product.shipping_weight_kg != null ? product.shipping_weight_kg : null
    };

    const isSubscriptionProduct = product.product_type === "subscription_product";
    const subscriptionOptions = {
      isSubscriptionProduct,
      allowedIntervals: Array.isArray(product.subscription_allowed_intervals)
        ? product.subscription_allowed_intervals
        : [],
      defaultInterval: product.subscription_default_interval || null,
      subscriptionPrice:
        typeof product.subscription_price === "number"
          ? product.subscription_price
          : typeof product.price === "number"
          ? product.price
          : null
    };

    const giftOptions = {
      isGiftEligible: !!product.is_gift_eligible,
      earliestDeliveryDate: null
    };

    const breadcrumbs = [];
    if (category) {
      breadcrumbs.push({
        label: category.name,
        categorySlug: category.slug,
        subcategorySlug: null
      });
    }
    if (subcategory) {
      breadcrumbs.push({
        label: subcategory.name,
        categorySlug: category ? category.slug : null,
        subcategorySlug: subcategory.slug
      });
    }

    return {
      product,
      category: category
        ? { id: category.id, name: category.name, slug: category.slug }
        : null,
      subcategory: subcategory
        ? { id: subcategory.id, name: subcategory.name, slug: subcategory.slug }
        : null,
      specifications,
      subscriptionOptions,
      giftOptions,
      breadcrumbs
    };
  }

  // addToCart(productId, quantity = 1, isSubscription = false, subscriptionInterval, isGift = false, giftDeliveryDate, giftMessage)
  addToCart(
    productId,
    quantity,
    isSubscription,
    subscriptionInterval,
    isGift,
    giftDeliveryDate,
    giftMessage
  ) {
    const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p.id === productId);

    if (!product) {
      const cartFallback = this._hydrateCart(this._getOrCreateCart());
      return { success: false, message: "Product not found", cart: cartFallback };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);

    const isSub = !!isSubscription;
    let unitPrice = typeof product.price === "number" ? product.price : 0;
    if (isSub) {
      if (typeof product.subscription_price === "number") {
        unitPrice = product.subscription_price;
      }
    }

    const line_subtotal = Number((unitPrice * qty).toFixed(2));
    const now = new Date().toISOString();

    const cartItem = {
      id: this._generateId("cart_item"),
      cart_id: cart.id,
      product_id: productId,
      quantity: qty,
      unit_price: unitPrice,
      line_subtotal,
      is_subscription: isSub,
      subscription_interval: isSub ? subscriptionInterval || null : null,
      is_gift: !!isGift,
      gift_delivery_date: giftDeliveryDate || null,
      gift_message: giftMessage || null,
      added_at: now
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    cart.items = cart.items || [];
    cart.items.push(cartItem.id);

    this._recalculateCartTotals(cart);

    const hydratedCart = this._hydrateCart(cart);
    return { success: true, message: "Added to cart", cart: hydratedCart };
  }

  // getCart(): Cart with hydrated items
  getCart() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    return this._hydrateCart(cart);
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      const hydratedCart = this._hydrateCart(cart);
      return { success: false, message: "Cart item not found", cart: hydratedCart };
    }

    if (quantity <= 0) {
      // Remove item
      return this.removeCartItem(cartItemId);
    }

    const item = cartItems[idx];
    item.quantity = quantity;
    item.line_subtotal = Number((item.unit_price * quantity).toFixed(2));
    cartItems[idx] = item;
    this._saveToStorage("cart_items", cartItems);

    this._recalculateCartTotals(cart);
    const hydratedCart = this._hydrateCart(cart);
    return { success: true, message: "Cart item updated", cart: hydratedCart };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);
    const item = cartItems.find((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (!item) {
      const hydratedCart = this._hydrateCart(cart);
      return { success: false, message: "Cart item not found", cart: hydratedCart };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage("cart_items", cartItems);

    cart.items = (cart.items || []).filter((id) => id !== cartItemId);

    this._recalculateCartTotals(cart);
    const hydratedCart = this._hydrateCart(cart);
    return { success: true, message: "Cart item removed", cart: hydratedCart };
  }

  // applyCouponToCart(couponCode)
  applyCouponToCart(couponCode) {
    const code = (couponCode || "").trim();
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    if (!code) {
      const hydratedCart = this._hydrateCart(cart);
      return { success: false, message: "Coupon code is required", cart: hydratedCart, appliedCoupon: null };
    }

    const coupons = this._getFromStorage("coupons", []);
    const coupon = coupons.find(
      (c) => String(c.code).toLowerCase() === String(code).toLowerCase()
    );

    if (!coupon) {
      const hydratedCart = this._hydrateCart(cart);
      return { success: false, message: "Coupon not found", cart: hydratedCart, appliedCoupon: null };
    }

    const validation = this._validateCouponForCart(cart, coupon);
    if (!validation.valid) {
      const hydratedCart = this._hydrateCart(cart);
      return { success: false, message: validation.message, cart: hydratedCart, appliedCoupon: null };
    }

    cart.applied_coupon_code = coupon.code;
    this._recalculateCartTotals(cart);
    const hydratedCart = this._hydrateCart(cart);

    return {
      success: true,
      message: "Coupon applied",
      cart: hydratedCart,
      appliedCoupon: coupon
    };
  }

  // getCheckoutOptions()
  getCheckoutOptions() {
    const cart = this._getOrCreateCart();
    const shippingMethods = this._getFromStorage("shipping_methods", []);
    const state = this._getCheckoutState();

    // Ensure a shipping method is selected (prefer cart, then state, then default)
    if (!cart.selected_shipping_method_code) {
      let selectedCode = state.selectedShippingMethodCode || null;
      if (!selectedCode && shippingMethods.length > 0) {
        const defaultMethod =
          shippingMethods.find((sm) => sm.is_default) || shippingMethods[0];
        selectedCode = defaultMethod.code;
      }
      if (selectedCode) {
        cart.selected_shipping_method_code = selectedCode;
        state.selectedShippingMethodCode = selectedCode;
        this._saveCheckoutState(state);
      }
    }

    this._recalculateCartTotals(cart);

    const paymentMethods = [
      "credit_card",
      "paypal",
      "apple_pay",
      "google_pay",
      "bank_transfer",
      "cash_on_delivery"
    ];

    const selectedPaymentMethod = state.selectedPaymentMethod || null;

    const canPlaceOrder =
      (cart.items || []).length > 0 &&
      !!cart.selected_shipping_method_code &&
      !!selectedPaymentMethod;

    return {
      cart: this._hydrateCart(cart),
      shippingMethods,
      selectedShippingMethodCode: cart.selected_shipping_method_code,
      paymentMethods,
      selectedPaymentMethod,
      canPlaceOrder
    };
  }

  // updateShippingMethod(shippingMethodCode)
  updateShippingMethod(shippingMethodCode) {
    const shippingMethods = this._getFromStorage("shipping_methods", []);
    const method = shippingMethods.find((sm) => sm.code === shippingMethodCode);
    const cart = this._getOrCreateCart();

    if (!method) {
      const hydratedCart = this._hydrateCart(cart);
      return {
        success: false,
        message: "Shipping method not found",
        cart: hydratedCart,
        selectedShippingMethod: null
      };
    }

    cart.selected_shipping_method_code = method.code;
    this._recalculateCartTotals(cart);

    const state = this._getCheckoutState();
    state.selectedShippingMethodCode = method.code;
    this._saveCheckoutState(state);

    const hydratedCart = this._hydrateCart(cart);
    return {
      success: true,
      message: "Shipping method updated",
      cart: hydratedCart,
      selectedShippingMethod: method
    };
  }

  // updatePaymentMethod(paymentMethod)
  updatePaymentMethod(paymentMethod) {
    const allowed = [
      "credit_card",
      "paypal",
      "apple_pay",
      "google_pay",
      "bank_transfer",
      "cash_on_delivery"
    ];

    if (allowed.indexOf(paymentMethod) === -1) {
      return {
        success: false,
        message: "Unsupported payment method",
        selectedPaymentMethod: null
      };
    }

    const state = this._getCheckoutState();
    state.selectedPaymentMethod = paymentMethod;
    this._saveCheckoutState(state);

    return {
      success: true,
      message: "Payment method updated",
      selectedPaymentMethod: paymentMethod
    };
  }

  // placeOrder()
  placeOrder() {
    const cart = this._getOrCreateCart();
    const state = this._getCheckoutState();
    this._recalculateCartTotals(cart);

    if (!cart.items || cart.items.length === 0) {
      return { success: false, message: "Cart is empty", order: null };
    }
    if (!cart.selected_shipping_method_code) {
      return { success: false, message: "Shipping method not selected", order: null };
    }
    if (!state.selectedPaymentMethod) {
      return { success: false, message: "Payment method not selected", order: null };
    }

    const orders = this._getFromStorage("orders", []);
    let orderItems = this._getFromStorage("order_items", []);
    const cartItems = this._getFromStorage("cart_items", []);

    const now = new Date().toISOString();
    const orderId = this._generateId("order");

    const order = {
      id: orderId,
      created_at: now,
      updated_at: now,
      status: "paid",
      payment_method: state.selectedPaymentMethod,
      shipping_method_code: cart.selected_shipping_method_code,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      shipping_total: cart.shipping_total,
      tax_total: cart.tax_total,
      total: cart.total,
      applied_coupon_code: cart.applied_coupon_code || null,
      coupon_discount_amount: cart.coupon_discount_amount || 0,
      items: [],
      shipping_summary: ""
    };

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    itemsForCart.forEach((ci) => {
      const orderItemId = this._generateId("order_item");
      const orderItem = {
        id: orderItemId,
        order_id: order.id,
        product_id: ci.product_id,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        is_subscription: ci.is_subscription,
        subscription_interval: ci.subscription_interval || null,
        is_gift: ci.is_gift,
        gift_delivery_date: ci.gift_delivery_date || null,
        gift_message: ci.gift_message || null
      };
      orderItems.push(orderItem);
      order.items.push(orderItemId);
    });

    orders.push(order);
    this._saveToStorage("orders", orders);
    this._saveToStorage("order_items", orderItems);

    // Clear cart and related items
    const remainingCartItems = cartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage("cart_items", remainingCartItems);
    this._saveRawCart(null);

    // Reset checkout state
    this._saveCheckoutState({
      selectedShippingMethodCode: null,
      selectedPaymentMethod: null
    });

    const hydratedOrder = this._hydrateOrder(order);
    return { success: true, message: "Order placed", order: hydratedOrder };
  }

  // createAccount(fullName, email, password, confirmPassword)
  createAccount(fullName, email, password, confirmPassword) {
    if (!fullName || !email || !password || !confirmPassword) {
      return {
        success: false,
        message: "All fields are required",
        account: null
      };
    }
    if (password !== confirmPassword) {
      return {
        success: false,
        message: "Passwords do not match",
        account: null
      };
    }

    const existing = this._getFromStorage("account", null);
    if (existing && existing.email && existing.email === email) {
      return {
        success: false,
        message: "Account with this email already exists",
        account: null
      };
    }

    const now = new Date().toISOString();
    const account = {
      fullName,
      email,
      password, // stored as plain text for this demo; in real apps, hash this
      createdAt: now,
      defaultShippingMethodCode: null
    };

    this._saveToStorage("account", account);

    return {
      success: true,
      message: "Account created",
      account: {
        fullName: account.fullName,
        email: account.email,
        createdAt: account.createdAt
      }
    };
  }

  // getAccountProfile()
  getAccountProfile() {
    const account = this._getFromStorage("account", null);
    if (!account) return null;
    return {
      fullName: account.fullName,
      email: account.email,
      defaultShippingMethodCode: account.defaultShippingMethodCode || null,
      createdAt: account.createdAt
    };
  }

  // updateAccountProfile(fullName?, email?, currentPassword?, newPassword?, defaultShippingMethodCode?)
  updateAccountProfile(fullName, email, currentPassword, newPassword, defaultShippingMethodCode) {
    let account = this._getFromStorage("account", null);
    if (!account) {
      return { success: false, message: "No account found", profile: null };
    }

    if (fullName) account.fullName = fullName;
    if (email) account.email = email;

    if (newPassword) {
      if (!currentPassword || currentPassword !== account.password) {
        return {
          success: false,
          message: "Current password is incorrect",
          profile: null
        };
      }
      account.password = newPassword;
    }

    if (defaultShippingMethodCode) {
      const methods = this._getFromStorage("shipping_methods", []);
      const method = methods.find((m) => m.code === defaultShippingMethodCode);
      if (!method) {
        return {
          success: false,
          message: "Invalid default shipping method",
          profile: null
        };
      }
      account.defaultShippingMethodCode = defaultShippingMethodCode;
    }

    this._saveToStorage("account", account);

    const profile = {
      fullName: account.fullName,
      email: account.email,
      defaultShippingMethodCode: account.defaultShippingMethodCode || null
    };

    return { success: true, message: "Account updated", profile };
  }

  // getWishlist(): Wishlist with hydrated items
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    return this._hydrateWishlist(wishlist);
  }

  // addToWishlist(productId)
  addToWishlist(productId) {
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p.id === productId);
    const wishlist = this._getOrCreateWishlist();

    if (!product) {
      return {
        success: false,
        message: "Product not found",
        wishlist: this._hydrateWishlist(wishlist)
      };
    }

    let wishlistItems = this._getFromStorage("wishlist_items", []);
    const existing = wishlistItems.find(
      (wi) => wi.product_id === productId && wi.wishlist_id === wishlist.id
    );
    if (existing) {
      return {
        success: true,
        message: "Already in wishlist",
        wishlist: this._hydrateWishlist(wishlist)
      };
    }

    const now = new Date().toISOString();
    const wishlistItem = {
      id: this._generateId("wishlist_item"),
      wishlist_id: wishlist.id,
      product_id: productId,
      added_at: now
    };

    wishlistItems.push(wishlistItem);
    this._saveToStorage("wishlist_items", wishlistItems);

    wishlist.items = wishlist.items || [];
    wishlist.items.push(wishlistItem.id);
    wishlist.updated_at = now;
    this._saveRawWishlist(wishlist);

    return {
      success: true,
      message: "Added to wishlist",
      wishlist: this._hydrateWishlist(wishlist)
    };
  }

  // removeFromWishlist(wishlistItemId)
  removeFromWishlist(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage("wishlist_items", []);
    const item = wishlistItems.find(
      (wi) => wi.id === wishlistItemId && wi.wishlist_id === wishlist.id
    );
    if (!item) {
      return {
        success: false,
        message: "Wishlist item not found",
        wishlist: this._hydrateWishlist(wishlist)
      };
    }

    wishlistItems = wishlistItems.filter((wi) => wi.id !== wishlistItemId);
    this._saveToStorage("wishlist_items", wishlistItems);

    wishlist.items = (wishlist.items || []).filter((id) => id !== wishlistItemId);
    wishlist.updated_at = new Date().toISOString();
    this._saveRawWishlist(wishlist);

    return {
      success: true,
      message: "Removed from wishlist",
      wishlist: this._hydrateWishlist(wishlist)
    };
  }

  // getOrderSummary(orderId)
  getOrderSummary(orderId) {
    const orders = this._getFromStorage("orders", []);
    const order = orders.find((o) => o.id === orderId) || null;
    if (!order) return null;
    return this._hydrateOrder(order);
  }

  // getShippingMethods()
  getShippingMethods() {
    return this._getFromStorage("shipping_methods", []);
  }

  // getAboutContent()
  getAboutContent() {
    return this._getFromStorage("about_content", { title: "", body: "", sections: [] });
  }

  // getContactInfo()
  getContactInfo() {
    return this._getFromStorage("contact_info", {
      email: "",
      phone: "",
      address: "",
      supportHours: ""
    });
  }

  // submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        message: "All fields are required"
      };
    }
    const msgs = this._getFromStorage("contact_messages", []);
    msgs.push({
      id: this._generateId("contact"),
      name,
      email,
      subject,
      message,
      created_at: new Date().toISOString()
    });
    this._saveToStorage("contact_messages", msgs);
    return {
      success: true,
      message: "Your message has been submitted."
    };
  }

  // getFaqContent()
  getFaqContent() {
    return this._getFromStorage("faq_content", { sections: [] });
  }

  // getShippingAndReturnsContent()
  getShippingAndReturnsContent() {
    return this._getFromStorage("shipping_returns_content", {
      overview: "",
      shippingDetails: "",
      returnsPolicy: "",
      damagedPlantInstructions: "",
      subscriptionIssuesInstructions: ""
    });
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return this._getFromStorage("privacy_policy_content", {
      lastUpdated: "",
      body: ""
    });
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    return this._getFromStorage("terms_content", {
      lastUpdated: "",
      body: ""
    });
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
