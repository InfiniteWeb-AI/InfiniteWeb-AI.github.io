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

  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensure('users', []); // not used, but kept from skeleton
    ensure('categories', []);
    ensure('products', []);
    ensure('product_variants', []);
    ensure('carts', []);
    ensure('cart_items', []);
    ensure('wishlists', []);
    ensure('wishlist_items', []);
    ensure('coupons', []);
    ensure('shipping_methods', []);
    ensure('shipping_addresses', []);
    ensure('reviews', []);
    ensure('search_queries', []);

    // Content / auxiliary tables
    ensure('about_page_content', { headline: '', sections: [] });
    ensure('contact_page_content', {
      supportEmail: '',
      supportPhone: '',
      supportHours: '',
      expectedResponseTime: ''
    });
    ensure('faq_entries', []);
    ensure('shipping_and_returns_content', {
      shippingOverview: '',
      shippingMethods: [],
      freeShippingPolicy: '',
      returnsPolicy: ''
    });
    ensure('privacy_policy_content', { lastUpdated: '', body: '' });
    ensure('terms_of_use_content', { lastUpdated: '', body: '' });
    ensure('contact_form_submissions', []);

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return Array.isArray(defaultValue) || typeof defaultValue === 'object'
      ? JSON.parse(JSON.stringify(defaultValue))
      : defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return Array.isArray(defaultValue) || typeof defaultValue === 'object'
        ? JSON.parse(JSON.stringify(defaultValue))
        : defaultValue;
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

  // ------------ Mapping helpers (snake_case -> camelCase for API) ------------

  _mapCategoryToPublic(category) {
    if (!category) return null;
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description || '',
      heroImageUrl: category.hero_image_url || '',
      isFeaturedInHeader: !!category.is_featured_in_header,
      isFeaturedInHome: !!category.is_featured_in_home
    };
  }

  _mapProductToPublic(product) {
    if (!product) return null;
    return {
      id: product.id,
      title: product.title,
      slug: product.slug,
      artistName: product.artist_name || '',
      description: product.description || '',
      mainImageUrl: product.main_image_url,
      additionalImageUrls: product.additional_image_urls || [],
      basePrice: product.base_price,
      averageRating: product.average_rating,
      ratingCount: product.rating_count,
      categorySlugs: product.category_slugs || [],
      colorTags: product.color_tags || [],
      primaryColor: product.primary_color || null,
      orientation: product.orientation || 'unspecified',
      themeTags: product.theme_tags || [],
      styleTags: product.style_tags || [],
      hasFreeShipping: !!product.has_free_shipping,
      allowsFraming: !!product.allows_framing,
      supportsPaperFinish: !!product.supports_paper_finish,
      supportsHangingHardwareAddon: !!product.supports_hanging_hardware_addon,
      isKidsFriendly: !!product.is_kids_friendly
    };
  }

  _mapVariantToPublic(variant) {
    if (!variant) return null;
    return {
      id: variant.id,
      sizeCode: variant.size_code,
      widthInches: variant.width_inches,
      heightInches: variant.height_inches,
      sizeLabel: variant.size_label,
      price: variant.price,
      isDefault: !!variant.is_default,
      isAvailable: !!variant.is_available
    };
  }

  _mapCartItemToPublic(cartItem, product, variant) {
    return {
      cartItemId: cartItem.id,
      productId: cartItem.product_id,
      productVariantId: cartItem.product_variant_id,
      title: product ? product.title : '',
      slug: product ? product.slug : '',
      artistName: product ? (product.artist_name || '') : '',
      thumbnailUrl: product ? product.main_image_url : '',
      sizeCode: variant ? variant.size_code : '',
      widthInches: variant ? variant.width_inches : null,
      heightInches: variant ? variant.height_inches : null,
      frameOption: cartItem.frame_option || null,
      paperFinish: cartItem.paper_finish || null,
      addHangingHardware: !!cartItem.add_hanging_hardware,
      unitPrice: cartItem.unit_price,
      quantity: cartItem.quantity,
      lineSubtotal: cartItem.line_subtotal,
      isFreeShipping: !!cartItem.is_free_shipping,
      // Foreign key resolution (for frontend convenience)
      product: product ? this._mapProductToPublic(product) : null,
      productVariant: variant ? this._mapVariantToPublic(variant) : null
    };
  }

  // ------------ Core helpers: cart & wishlist ------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts.find(c => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        item_ids: [],
        subtotal: 0,
        shipping_cost: 0,
        tax_total: 0,
        discount_total: 0,
        total: 0,
        applied_coupon_code: null,
        shipping_address_id: null,
        shipping_method_id: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  // Backwards-compat helper name from skeleton
  _findOrCreateCart() {
    return this._getOrCreateCart();
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    let wishlist = wishlists[0];
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        item_ids: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    // Subtotal from items
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.line_subtotal || 0), 0);

    // Determine shipping cost based on selected method and free-shipping flags
    let shippingCost = 0;
    let shippingMethod = null;
    if (cart.shipping_method_id) {
      shippingMethod = shippingMethods.find(sm => sm.id === cart.shipping_method_id) || null;
    } else {
      shippingMethod = shippingMethods.find(sm => sm.is_default) || null;
    }

    if (shippingMethod) {
      const allFree = itemsForCart.length > 0 && itemsForCart.every(ci => ci.is_free_shipping);
      if (shippingMethod.supports_free_shipping && allFree) {
        shippingCost = 0;
      } else {
        shippingCost = shippingMethod.base_cost || 0;
      }
    }

    cart.subtotal = subtotal;
    cart.shipping_cost = shippingCost;

    // Taxes: for simplicity, not computed (0); extend as needed
    cart.tax_total = 0;

    // Coupon / discount recalculation
    const coupons = this._getFromStorage('coupons', []);
    const discount = this._validateAndApplyCoupon(cart, itemsForCart, coupons);
    cart.discount_total = discount;

    cart.total = cart.subtotal + cart.shipping_cost + cart.tax_total - cart.discount_total;
    cart.updated_at = this._now();

    // Persist cart back
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    return cart;
  }

  _validateAndApplyCoupon(cart, cartItems, coupons) {
    const code = cart.applied_coupon_code;
    if (!code) {
      return 0;
    }

    const nowIso = this._now();
    let coupon = coupons.find(c => c.code === code);
    if (!coupon || !coupon.is_active) {
      cart.applied_coupon_code = null;
      return 0;
    }

    // Date validity
    if (coupon.valid_from && coupon.valid_from > nowIso) {
      cart.applied_coupon_code = null;
      return 0;
    }
    if (coupon.valid_to && coupon.valid_to < nowIso) {
      cart.applied_coupon_code = null;
      return 0;
    }

    // Eligible subtotal (respect applicable categories/products if present)
    const products = this._getFromStorage('products', []);
    let eligibleSubtotal = 0;

    cartItems.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (!product) return;

      let eligible = true;
      if (Array.isArray(coupon.applicable_product_ids) && coupon.applicable_product_ids.length > 0) {
        eligible = coupon.applicable_product_ids.includes(product.id);
      }
      if (eligible && Array.isArray(coupon.applicable_category_slugs) && coupon.applicable_category_slugs.length > 0) {
        const productCats = product.category_slugs || [];
        eligible = productCats.some(slug => coupon.applicable_category_slugs.includes(slug));
      }

      if (eligible) {
        eligibleSubtotal += item.line_subtotal || 0;
      }
    });

    if (eligibleSubtotal <= 0) {
      cart.applied_coupon_code = null;
      return 0;
    }

    // Min order amount
    if (typeof coupon.min_order_amount === 'number' && eligibleSubtotal < coupon.min_order_amount) {
      cart.applied_coupon_code = null;
      return 0;
    }

    let rawDiscount = 0;
    if (coupon.discount_type === 'percentage') {
      rawDiscount = (eligibleSubtotal * coupon.discount_value) / 100;
    } else if (coupon.discount_type === 'fixed_amount') {
      rawDiscount = coupon.discount_value;
    } else if (coupon.discount_type === 'free_shipping') {
      // shipping discount handled via shipping method usually; here treat as fixed discount on shipping
      rawDiscount = Math.min(cart.shipping_cost, coupon.discount_value || cart.shipping_cost);
    }

    if (rawDiscount < 0) rawDiscount = 0;

    // Respect max_uses_per_order by capping discount to that multiple of eligibleSubtotal (for percentage) or fixed
    if (typeof coupon.max_uses_per_order === 'number' && coupon.max_uses_per_order > 0) {
      // For simplicity, treat as cap on discount: cannot exceed eligibleSubtotal * max_uses_per_order
      const cap = eligibleSubtotal * coupon.max_uses_per_order;
      if (rawDiscount > cap) rawDiscount = cap;
    }

    return rawDiscount;
  }

  // --------------- Public Interfaces ---------------

  // Legacy/simple cart adder from skeleton; uses default variant and unconfigured options
  addToCart(userId, productId, quantity = 1) { // userId ignored (single-agent cart)
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, message: 'Product not found', cartId: null };
    }
    const variant = variants.find(v => v.product_id === product.id && v.is_default) ||
      variants.find(v => v.product_id === product.id);
    if (!variant) {
      return { success: false, message: 'No variants available for product', cartId: null };
    }

    const res = this.addConfiguredProductToCart(product.id, variant.id, 'unframed', 'unspecified', false, quantity);
    return { success: res.success, message: res.message, cartId: res.cartSummary ? res.cartSummary.cartId : null };
  }

  // ---------------- Homepage / Navigation ----------------

  getHomePageData() {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const coupons = this._getFromStorage('coupons', []);

    const featuredCategoriesRaw = categories.filter(c => c.is_featured_in_home);
    const featuredCategories = featuredCategoriesRaw.map(c => this._mapCategoryToPublic(c));

    const featuredProductsRaw = products.filter(p =>
      p.is_active &&
      Array.isArray(p.category_slugs) &&
      (p.category_slugs.includes('best_sellers') || p.category_slugs.includes('new_arrivals'))
    );
    const featuredProducts = featuredProductsRaw.map(p => this._mapProductToPublic(p));

    const now = this._now();
    const activePromotions = coupons.filter(c => {
      if (!c.is_active) return false;
      if (c.valid_from && c.valid_from > now) return false;
      if (c.valid_to && c.valid_to < now) return false;
      return true;
    }).map(c => ({
      code: c.code,
      title: c.code || '',
      description: c.description || '',
      discountType: c.discount_type,
      discountValue: c.discount_value,
      minOrderAmount: typeof c.min_order_amount === 'number' ? c.min_order_amount : null
    }));

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    const cartSummary = {
      itemCount: itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0),
      subtotal: cart.subtotal || 0
    };

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const itemsForWishlist = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id);
    const wishlistSummary = {
      itemCount: itemsForWishlist.length
    };

    return {
      featuredCategories,
      featuredProducts,
      activePromotions,
      cartSummary,
      wishlistSummary
    };
  }

  getHeaderStatus() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    const cartSummary = {
      itemCount: itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0),
      subtotal: cart.subtotal || 0
    };

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const itemsForWishlist = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id);
    const wishlistSummary = {
      itemCount: itemsForWishlist.length
    };

    return { cartSummary, wishlistSummary };
  }

  getCategoryNavigation() {
    const categories = this._getFromStorage('categories', []);
    return categories.map(c => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      isFeaturedInHeader: !!c.is_featured_in_header,
      isFeaturedInHome: !!c.is_featured_in_home
    }));
  }

  // ---------------- Category listing ----------------

  getCategoryPageData(categorySlug, filters = {}, sort = '', page = 1, pageSize = 20) {
    if (!filters) filters = {};
    const categories = this._getFromStorage('categories', []);
    const productsAll = this._getFromStorage('products', []);
    const variantsAll = this._getFromStorage('product_variants', []);

    const category = categories.find(c => c.slug === categorySlug) || null;

    let products = productsAll.filter(p =>
      p.is_active && Array.isArray(p.category_slugs) && p.category_slugs.includes(categorySlug)
    );

    // Apply filters
    products = this._applyProductAndVariantFilters(products, variantsAll, filters);

    // Sorting
    products = this._sortProducts(products, variantsAll, sort);

    // Pagination
    const totalItems = products.length;
    const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1;
    const startIndex = (page - 1) * pageSize;
    const pagedProducts = pageSize > 0 ? products.slice(startIndex, startIndex + pageSize) : products;

    const publicProducts = pagedProducts.map(p => this._mapProductToPublic(p));

    // Available filters derived from all products in this category (ignoring current filters)
    const availableFilters = this._buildAvailableFilters(productsAll.filter(p =>
      p.is_active && Array.isArray(p.category_slugs) && p.category_slugs.includes(categorySlug)
    ), variantsAll);

    const appliedFilters = {
      colorTags: filters.colorTags || [],
      primaryColor: filters.primaryColor || null,
      sizeLabels: filters.sizeLabels || [],
      minPrice: typeof filters.minPrice === 'number' ? filters.minPrice : null,
      maxPrice: typeof filters.maxPrice === 'number' ? filters.maxPrice : null,
      minRating: typeof filters.minRating === 'number' ? filters.minRating : null,
      orientation: filters.orientation || null,
      themeTags: filters.themeTags || [],
      styleTags: filters.styleTags || [],
      hasFreeShipping: typeof filters.hasFreeShipping === 'boolean' ? filters.hasFreeShipping : null
    };

    return {
      category: this._mapCategoryToPublic(category),
      products: publicProducts,
      availableFilters,
      appliedFilters,
      sort: sort || '',
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  // ---------------- Search ----------------

  searchProducts(query, filters = {}, sort = '', page = 1, pageSize = 20) {
    const q = (query || '').trim();
    const productsAll = this._getFromStorage('products', []);
    const variantsAll = this._getFromStorage('product_variants', []);

    // Record search query for analytics
    if (q) {
      const searchQueries = this._getFromStorage('search_queries', []);
      searchQueries.push({
        id: this._generateId('search_query'),
        query_text: q,
        created_at: this._now()
      });
      this._saveToStorage('search_queries', searchQueries);
    }

    const lowerQ = q.toLowerCase();
    let products = productsAll.filter(p => {
      if (!p.is_active) return false;
      if (!lowerQ) return true;
      const title = (p.title || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const artist = (p.artist_name || '').toLowerCase();
      return title.includes(lowerQ) || desc.includes(lowerQ) || artist.includes(lowerQ);
    });

    // Apply filters
    products = this._applyProductAndVariantFilters(products, variantsAll, filters);

    // Sorting
    products = this._sortProducts(products, variantsAll, sort);

    // Pagination
    const totalItems = products.length;
    const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1;
    const startIndex = (page - 1) * pageSize;
    const pagedProducts = pageSize > 0 ? products.slice(startIndex, startIndex + pageSize) : products;

    const publicProducts = pagedProducts.map(p => this._mapProductToPublic(p));

    const availableFilters = this._buildAvailableFilters(productsAll.filter(p => p.is_active), variantsAll);

    const appliedFilters = {
      colorTags: filters.colorTags || [],
      primaryColor: filters.primaryColor || null,
      sizeLabels: filters.sizeLabels || [],
      sizeCodes: filters.sizeCodes || [],
      minPrice: typeof filters.minPrice === 'number' ? filters.minPrice : null,
      maxPrice: typeof filters.maxPrice === 'number' ? filters.maxPrice : null,
      minRating: typeof filters.minRating === 'number' ? filters.minRating : null,
      orientation: filters.orientation || null,
      themeTags: filters.themeTags || [],
      styleTags: filters.styleTags || [],
      hasFreeShipping: typeof filters.hasFreeShipping === 'boolean' ? filters.hasFreeShipping : null
    };

    return {
      query: q,
      products: publicProducts,
      availableFilters,
      appliedFilters,
      sort: sort || '',
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  getFilterOptionsForContext(contextType, categorySlug = null, query = '') {
    const productsAll = this._getFromStorage('products', []);
    const variantsAll = this._getFromStorage('product_variants', []);

    let products = productsAll.filter(p => p.is_active);

    if (contextType === 'category' && categorySlug) {
      products = products.filter(p => Array.isArray(p.category_slugs) && p.category_slugs.includes(categorySlug));
    } else if (contextType === 'search' && query) {
      const lowerQ = query.toLowerCase();
      products = products.filter(p => {
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const artist = (p.artist_name || '').toLowerCase();
        return title.includes(lowerQ) || desc.includes(lowerQ) || artist.includes(lowerQ);
      });
    }

    const available = this._buildAvailableFilters(products, variantsAll);
    return available;
  }

  // ---------------- Product details ----------------

  getProductDetails(productSlug) {
    const products = this._getFromStorage('products', []);
    const variantsAll = this._getFromStorage('product_variants', []);
    const reviewsAll = this._getFromStorage('reviews', []);

    const product = products.find(p => p.slug === productSlug) || null;
    if (!product) {
      return {
        product: null,
        variants: [],
        configurationOptions: {
          frameOptions: [],
          paperFinishes: [],
          canAddHangingHardware: false
        },
        reviews: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (product && product.artist_name === 'Emma Clark') {
        let comparedIds = [];
        const existingRaw = localStorage.getItem('task3_comparedProductIds');
        if (existingRaw) {
          try {
            const parsed = JSON.parse(existingRaw);
            if (Array.isArray(parsed)) {
              comparedIds = parsed;
            }
          } catch (e2) {
            // Ignore JSON parse errors and start fresh
          }
        }
        if (!comparedIds.includes(product.id)) {
          comparedIds.push(product.id);
          localStorage.setItem('task3_comparedProductIds', JSON.stringify(comparedIds));
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (ignored) {}
    }

    const variants = variantsAll.filter(v => v.product_id === product.id);
    const publicVariants = variants.map(v => this._mapVariantToPublic(v));

    const frameOptions = product.allows_framing ? ['unframed', 'framed'] : ['unframed'];
    const paperFinishes = product.supports_paper_finish ? ['matte', 'glossy', 'luster', 'unspecified'] : [];
    const configurationOptions = {
      frameOptions,
      paperFinishes,
      canAddHangingHardware: !!product.supports_hanging_hardware_addon
    };

    const reviews = reviewsAll
      .filter(r => r.product_id === product.id)
      .map(r => ({
        id: r.id,
        authorName: r.author_name || '',
        rating: r.rating,
        title: r.title || '',
        body: r.body || '',
        createdAt: r.created_at
      }));

    return {
      product: this._mapProductToPublic(product),
      variants: publicVariants,
      configurationOptions,
      reviews
    };
  }

  // ---------------- Cart operations ----------------

  addConfiguredProductToCart(productId, productVariantId, frameOption = null, paperFinish = null, addHangingHardware = false, quantity = 1) {
    if (quantity <= 0) {
      return { success: false, message: 'Quantity must be positive', cartSummary: null, addedItem: null };
    }

    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);

    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, message: 'Product not found', cartSummary: null, addedItem: null };
    }
    const variant = variants.find(v => v.id === productVariantId && v.product_id === product.id);
    if (!variant || !variant.is_available) {
      return { success: false, message: 'Selected variant not available', cartSummary: null, addedItem: null };
    }

    let cart = this._getOrCreateCart();

    // Standardize enums
    const frameOpt = frameOption || (product.allows_framing ? 'unframed' : null);
    const paperFin = paperFinish || (product.supports_paper_finish ? 'unspecified' : null);

    // Determine unit price (size-based only; frame/paper/hardware not priced separately here)
    let unitPrice = variant.price;

    // Determine free shipping flag
    const isFreeShipping = !!product.has_free_shipping;

    // Merge with existing item if configuration matches
    let cartItem = cartItems.find(ci =>
      ci.cart_id === cart.id &&
      ci.product_id === product.id &&
      ci.product_variant_id === variant.id &&
      (ci.frame_option || null) === (frameOpt || null) &&
      (ci.paper_finish || null) === (paperFin || null) &&
      !!ci.add_hanging_hardware === !!addHangingHardware
    );

    if (cartItem) {
      cartItem.quantity += quantity;
      cartItem.unit_price = unitPrice; // keep in sync
      cartItem.line_subtotal = cartItem.unit_price * cartItem.quantity;
      cartItem.is_free_shipping = isFreeShipping;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        product_variant_id: variant.id,
        frame_option: frameOpt,
        paper_finish: paperFin,
        add_hanging_hardware: !!addHangingHardware,
        unit_price: unitPrice,
        quantity: quantity,
        line_subtotal: unitPrice * quantity,
        is_free_shipping: isFreeShipping,
        added_at: this._now()
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
      cart.item_ids.push(cartItem.id);
    }

    // Persist cart items
    this._saveToStorage('cart_items', cartItems);

    // Recalculate and persist cart
    const updatedCart = this._recalculateCartTotals(cart);

    // Update carts array reference if needed
    const cartIndex = carts.findIndex(c => c.id === updatedCart.id);
    if (cartIndex !== -1) {
      carts[cartIndex] = updatedCart;
      this._saveToStorage('carts', carts);
    }

    // Build response
    const itemsForCart = cartItems.filter(ci => ci.cart_id === updatedCart.id);
    const itemCount = itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0);
    const cartSummary = {
      cartId: updatedCart.id,
      itemCount,
      subtotal: updatedCart.subtotal
    };

    const addedItemPublic = {
      cartItemId: cartItem.id,
      productId: cartItem.product_id,
      productVariantId: cartItem.product_variant_id,
      title: product.title,
      sizeCode: variant.size_code,
      frameOption: cartItem.frame_option,
      paperFinish: cartItem.paper_finish,
      addHangingHardware: !!cartItem.add_hanging_hardware,
      unitPrice: cartItem.unit_price,
      quantity: cartItem.quantity,
      lineSubtotal: cartItem.line_subtotal,
      isFreeShipping: !!cartItem.is_free_shipping,
      product: this._mapProductToPublic(product),
      productVariant: this._mapVariantToPublic(variant)
    };

    return { success: true, message: 'Added to cart', cartSummary, addedItem: addedItemPublic };
  }

  getCartDetails() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingAddresses = this._getFromStorage('shipping_addresses', []);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    const items = itemsForCart.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const variant = variants.find(v => v.id === ci.product_variant_id) || null;
      return this._mapCartItemToPublic(ci, product, variant);
    });

    const shippingMethod = cart.shipping_method_id
      ? shippingMethods.find(sm => sm.id === cart.shipping_method_id) || null
      : null;

    const shippingAddress = cart.shipping_address_id
      ? shippingAddresses.find(sa => sa.id === cart.shipping_address_id) || null
      : null;

    return {
      cartId: cart.id,
      status: cart.status,
      items,
      subtotal: cart.subtotal,
      shippingCost: cart.shipping_cost,
      taxTotal: cart.tax_total,
      discountTotal: cart.discount_total,
      total: cart.total,
      appliedCouponCode: cart.applied_coupon_code,
      shippingMethod: shippingMethod
        ? {
            id: shippingMethod.id,
            code: shippingMethod.code,
            name: shippingMethod.name
          }
        : null,
      shippingAddress: shippingAddress
        ? {
            fullName: shippingAddress.full_name,
            addressLine1: shippingAddress.address_line1,
            addressLine2: shippingAddress.address_line2 || '',
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.zip,
            country: shippingAddress.country,
            phone: shippingAddress.phone
          }
        : null
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);

    const cartItemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (cartItemIndex === -1) {
      return { success: false, message: 'Cart item not found', updatedItem: null, cartTotals: null };
    }

    const cartItem = cartItems[cartItemIndex];
    const cart = carts.find(c => c.id === cartItem.cart_id);
    if (!cart) {
      return { success: false, message: 'Cart not found', updatedItem: null, cartTotals: null };
    }

    if (quantity <= 0) {
      // Remove item
      cartItems.splice(cartItemIndex, 1);
      if (Array.isArray(cart.item_ids)) {
        cart.item_ids = cart.item_ids.filter(id => id !== cartItemId);
      }
    } else {
      cartItem.quantity = quantity;
      cartItem.line_subtotal = cartItem.unit_price * cartItem.quantity;
      cartItems[cartItemIndex] = cartItem;
    }

    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart);

    const cartTotals = {
      subtotal: updatedCart.subtotal,
      shippingCost: updatedCart.shipping_cost,
      taxTotal: updatedCart.tax_total,
      discountTotal: updatedCart.discount_total,
      total: updatedCart.total
    };

    const updatedItem = quantity > 0
      ? {
          cartItemId,
          quantity,
          lineSubtotal: cartItem.line_subtotal
        }
      : null;

    return {
      success: true,
      message: quantity > 0 ? 'Quantity updated' : 'Item removed',
      updatedItem,
      cartTotals
    };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);

    const cartItemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (cartItemIndex === -1) {
      return { success: false, message: 'Cart item not found', cartTotals: null };
    }

    const cartItem = cartItems[cartItemIndex];
    const cart = carts.find(c => c.id === cartItem.cart_id);
    if (!cart) {
      return { success: false, message: 'Cart not found', cartTotals: null };
    }

    cartItems.splice(cartItemIndex, 1);
    if (Array.isArray(cart.item_ids)) {
      cart.item_ids = cart.item_ids.filter(id => id !== cartItemId);
    }

    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart);

    const cartTotals = {
      itemCount: (updatedCart.item_ids || []).length,
      subtotal: updatedCart.subtotal,
      shippingCost: updatedCart.shipping_cost,
      taxTotal: updatedCart.tax_total,
      discountTotal: updatedCart.discount_total,
      total: updatedCart.total
    };

    return { success: true, message: 'Item removed', cartTotals };
  }

  estimateCartShipping(destinationZip = null, destinationState = null) {
    // destinationZip/state accepted but not used in this simplified estimator
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    const allFree = itemsForCart.length > 0 && itemsForCart.every(ci => ci.is_free_shipping);

    const shippingMethodsResult = shippingMethods.map(sm => {
      let estimatedCost = sm.base_cost || 0;
      let isFreeForCurrentCart = false;
      if (sm.supports_free_shipping && allFree) {
        estimatedCost = 0;
        isFreeForCurrentCart = true;
      }
      return {
        code: sm.code,
        name: sm.name,
        estimatedCost,
        supportsFreeShipping: !!sm.supports_free_shipping,
        isFreeForCurrentCart,
        isDefault: !!sm.is_default
      };
    });

    const selected = shippingMethodsResult.find(sm => sm.isDefault) || shippingMethodsResult[0] || null;

    return {
      shippingMethods: shippingMethodsResult,
      selectedMethodCode: selected ? selected.code : null
    };
  }

  getCheckoutPageData() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingAddresses = this._getFromStorage('shipping_addresses', []);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    const items = itemsForCart.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const variant = variants.find(v => v.id === ci.product_variant_id) || null;
      const base = this._mapCartItemToPublic(ci, product, variant);
      // Reduce to required fields
      return {
        cartItemId: base.cartItemId,
        title: base.title,
        slug: base.slug,
        artistName: base.artistName,
        thumbnailUrl: base.thumbnailUrl,
        sizeCode: base.sizeCode,
        frameOption: base.frameOption,
        paperFinish: base.paperFinish,
        addHangingHardware: base.addHangingHardware,
        unitPrice: base.unitPrice,
        quantity: base.quantity,
        lineSubtotal: base.lineSubtotal,
        product: base.product,
        productVariant: base.productVariant
      };
    });

    const availableShippingMethods = shippingMethods.map(sm => ({
      id: sm.id,
      code: sm.code,
      name: sm.name,
      description: sm.description || '',
      baseCost: sm.base_cost,
      supportsFreeShipping: !!sm.supports_free_shipping,
      isDefault: !!sm.is_default
    }));

    const shippingAddress = cart.shipping_address_id
      ? shippingAddresses.find(sa => sa.id === cart.shipping_address_id) || null
      : null;

    return {
      allowsGuestCheckout: true,
      cartSummary: {
        items,
        subtotal: cart.subtotal,
        shippingCost: cart.shipping_cost,
        taxTotal: cart.tax_total,
        discountTotal: cart.discount_total,
        total: cart.total,
        appliedCouponCode: cart.applied_coupon_code
      },
      availableShippingMethods,
      shippingAddress: shippingAddress
        ? {
            fullName: shippingAddress.full_name,
            addressLine1: shippingAddress.address_line1,
            addressLine2: shippingAddress.address_line2 || '',
            city: shippingAddress.city,
            state: shippingAddress.state,
            zip: shippingAddress.zip,
            country: shippingAddress.country,
            phone: shippingAddress.phone
          }
        : null
    };
  }

  setCheckoutShippingAddressAndMethod(shippingAddress, shippingMethodCode) {
    const carts = this._getFromStorage('carts', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingAddresses = this._getFromStorage('shipping_addresses', []);

    let cart = this._getOrCreateCart();

    const method = shippingMethods.find(sm => sm.code === shippingMethodCode);
    if (!method) {
      return { success: false, message: 'Shipping method not found', shippingAddressId: null, shippingMethodId: null, orderSummary: null };
    }

    const newAddress = {
      id: this._generateId('shipping_address'),
      full_name: shippingAddress.fullName,
      address_line1: shippingAddress.addressLine1,
      address_line2: shippingAddress.addressLine2 || '',
      city: shippingAddress.city,
      state: shippingAddress.state,
      zip: shippingAddress.zip,
      country: shippingAddress.country || 'US',
      phone: shippingAddress.phone,
      created_at: this._now()
    };

    shippingAddresses.push(newAddress);
    this._saveToStorage('shipping_addresses', shippingAddresses);

    cart.shipping_address_id = newAddress.id;
    cart.shipping_method_id = method.id;

    const updatedCart = this._recalculateCartTotals(cart);

    const cartIndex = carts.findIndex(c => c.id === updatedCart.id);
    if (cartIndex !== -1) {
      carts[cartIndex] = updatedCart;
      this._saveToStorage('carts', carts);
    }

    const orderSummary = {
      subtotal: updatedCart.subtotal,
      shippingCost: updatedCart.shipping_cost,
      taxTotal: updatedCart.tax_total,
      discountTotal: updatedCart.discount_total,
      total: updatedCart.total,
      appliedCouponCode: updatedCart.applied_coupon_code
    };

    return {
      success: true,
      message: 'Shipping address and method set',
      shippingAddressId: newAddress.id,
      shippingMethodId: method.id,
      orderSummary
    };
  }

  applyCouponToCart(couponCode) {
    const code = (couponCode || '').trim();
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const coupons = this._getFromStorage('coupons', []);

    if (!code) {
      return { success: false, message: 'Coupon code is required', appliedCouponCode: null, discountApplied: 0, cartTotals: null };
    }

    let cart = this._getOrCreateCart();

    const coupon = coupons.find(c => c.code === code);
    if (!coupon || !coupon.is_active) {
      return { success: false, message: 'Invalid or inactive coupon', appliedCouponCode: null, discountApplied: 0, cartTotals: null };
    }

    cart.applied_coupon_code = code;

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    const discount = this._validateAndApplyCoupon(cart, itemsForCart, coupons);

    // Recalculate totals including shipping and tax with applied discount
    cart = this._recalculateCartTotals(cart);

    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex] = cart;
      this._saveToStorage('carts', carts);
    }

    return {
      success: discount > 0,
      message: discount > 0 ? 'Coupon applied' : 'Coupon not applicable to current cart',
      appliedCouponCode: discount > 0 ? code : null,
      discountApplied: discount,
      cartTotals: {
        subtotal: cart.subtotal,
        shippingCost: cart.shipping_cost,
        taxTotal: cart.tax_total,
        discountTotal: cart.discount_total,
        total: cart.total
      }
    };
  }

  // ---------------- Wishlist ----------------

  getWishlistItems() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const itemsForWishlist = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id);

    const items = itemsForWishlist.map(wi => {
      const product = products.find(p => p.id === wi.product_id) || null;
      const variant = wi.product_variant_id
        ? variants.find(v => v.id === wi.product_variant_id) || null
        : null;

      return {
        wishlistItemId: wi.id,
        productId: wi.product_id,
        productVariantId: wi.product_variant_id || null,
        title: product ? product.title : '',
        slug: product ? product.slug : '',
        artistName: product ? (product.artist_name || '') : '',
        thumbnailUrl: product ? product.main_image_url : '',
        sizeCode: variant ? variant.size_code : null,
        currentPrice: wi.current_price,
        product: product ? this._mapProductToPublic(product) : null,
        productVariant: variant ? this._mapVariantToPublic(variant) : null
      };
    });

    return {
      wishlistId: wishlist.id,
      items,
      itemCount: items.length
    };
  }

  addProductToWishlist(productId, productVariantId = null) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, message: 'Product not found', wishlistSummary: null };
    }

    let variant = null;
    if (productVariantId) {
      variant = variants.find(v => v.id === productVariantId && v.product_id === product.id) || null;
    }

    const existing = wishlistItems.find(wi => wi.wishlist_id === wishlist.id && wi.product_id === product.id &&
      ((wi.product_variant_id || null) === (productVariantId || null))
    );

    if (existing) {
      const wishlistSummary = {
        wishlistId: wishlist.id,
        itemCount: wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length
      };
      return { success: true, message: 'Already in wishlist', wishlistSummary };
    }

    const currentPrice = variant ? variant.price : product.base_price;

    const newItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: product.id,
      product_variant_id: variant ? variant.id : null,
      current_price: currentPrice,
      added_at: this._now()
    };

    wishlistItems.push(newItem);
    if (!Array.isArray(wishlist.item_ids)) wishlist.item_ids = [];
    wishlist.item_ids.push(newItem.id);
    wishlist.updated_at = this._now();

    this._saveToStorage('wishlist_items', wishlistItems);
    const wishlists = this._getFromStorage('wishlists', []);
    const wlIndex = wishlists.findIndex(w => w.id === wishlist.id);
    if (wlIndex !== -1) {
      wishlists[wlIndex] = wishlist;
      this._saveToStorage('wishlists', wishlists);
    }

    const wishlistSummary = {
      wishlistId: wishlist.id,
      itemCount: wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length
    };

    return { success: true, message: 'Added to wishlist', wishlistSummary };
  }

  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const wishlists = this._getFromStorage('wishlists', []);

    const idx = wishlistItems.findIndex(wi => wi.id === wishlistItemId);
    if (idx === -1) {
      const wishlistSummary = {
        wishlistId: wishlist.id,
        itemCount: wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length
      };
      return { success: false, message: 'Wishlist item not found', wishlistSummary };
    }

    wishlistItems.splice(idx, 1);
    if (Array.isArray(wishlist.item_ids)) {
      wishlist.item_ids = wishlist.item_ids.filter(id => id !== wishlistItemId);
    }
    wishlist.updated_at = this._now();

    this._saveToStorage('wishlist_items', wishlistItems);

    const wlIndex = wishlists.findIndex(w => w.id === wishlist.id);
    if (wlIndex !== -1) {
      wishlists[wlIndex] = wishlist;
      this._saveToStorage('wishlists', wishlists);
    }

    const wishlistSummary = {
      wishlistId: wishlist.id,
      itemCount: wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length
    };

    return { success: true, message: 'Wishlist item removed', wishlistSummary };
  }

  moveWishlistItemToCart(wishlistItemId, quantity = 1) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const wi = wishlistItems.find(item => item.id === wishlistItemId && item.wishlist_id === wishlist.id);
    if (!wi) {
      const wishlistSummary = {
        wishlistId: wishlist.id,
        itemCount: wishlistItems.filter(x => x.wishlist_id === wishlist.id).length
      };
      return { success: false, message: 'Wishlist item not found', cartSummary: null, wishlistSummary };
    }

    const product = products.find(p => p.id === wi.product_id);
    if (!product) {
      const wishlistSummary = {
        wishlistId: wishlist.id,
        itemCount: wishlistItems.filter(x => x.wishlist_id === wishlist.id).length
      };
      return { success: false, message: 'Product not found for wishlist item', cartSummary: null, wishlistSummary };
    }

    let variant = null;
    if (wi.product_variant_id) {
      variant = variants.find(v => v.id === wi.product_variant_id && v.product_id === product.id) || null;
    }
    if (!variant) {
      variant = variants.find(v => v.product_id === product.id && v.is_default) ||
        variants.find(v => v.product_id === product.id) || null;
    }

    if (!variant) {
      const wishlistSummary = {
        wishlistId: wishlist.id,
        itemCount: wishlistItems.filter(x => x.wishlist_id === wishlist.id).length
      };
      return { success: false, message: 'No variant available for wishlist product', cartSummary: null, wishlistSummary };
    }

    const addRes = this.addConfiguredProductToCart(product.id, variant.id, 'unframed', 'unspecified', false, quantity || 1);

    const wishlistSummary = {
      wishlistId: wishlist.id,
      itemCount: wishlistItems.filter(x => x.wishlist_id === wishlist.id).length
    };

    return {
      success: addRes.success,
      message: addRes.message,
      cartSummary: addRes.cartSummary,
      wishlistSummary
    };
  }

  // ---------------- Static content / CMS-like ----------------

  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', { headline: '', sections: [] });
    return content;
  }

  getContactPageContent() {
    const content = this._getFromStorage('contact_page_content', {
      supportEmail: '',
      supportPhone: '',
      supportHours: '',
      expectedResponseTime: ''
    });
    return content;
  }

  submitContactForm(name, email, subject, message) {
    const submissions = this._getFromStorage('contact_form_submissions', []);
    const contactContent = this.getContactPageContent();

    const ticketId = this._generateId('contact_ticket');
    submissions.push({
      id: ticketId,
      name,
      email,
      subject,
      message,
      created_at: this._now()
    });
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Inquiry submitted',
      ticketId,
      estimatedReplyTime: contactContent.expectedResponseTime || ''
    };
  }

  getFAQEntries() {
    const entries = this._getFromStorage('faq_entries', []);
    return entries.map(e => ({
      id: e.id,
      category: e.category,
      question: e.question,
      answer: e.answer
    }));
  }

  getShippingAndReturnsContent() {
    const content = this._getFromStorage('shipping_and_returns_content', {
      shippingOverview: '',
      shippingMethods: [],
      freeShippingPolicy: '',
      returnsPolicy: ''
    });
    return content;
  }

  getPrivacyPolicyContent() {
    const content = this._getFromStorage('privacy_policy_content', { lastUpdated: '', body: '' });
    return content;
  }

  getTermsOfUseContent() {
    const content = this._getFromStorage('terms_of_use_content', { lastUpdated: '', body: '' });
    return content;
  }

  // ---------------- Internal filtering/sorting helpers ----------------

  _applyProductAndVariantFilters(products, variantsAll, filters) {
    const f = filters || {};

    return products.filter(p => {
      // colorTags
      if (Array.isArray(f.colorTags) && f.colorTags.length > 0) {
        const colorTags = p.color_tags || [];
        const hasAny = f.colorTags.some(tag => colorTags.includes(tag));
        if (!hasAny) return false;
      }

      // primaryColor
      if (f.primaryColor && p.primary_color !== f.primaryColor) {
        return false;
      }

      // minRating
      if (typeof f.minRating === 'number' && p.average_rating < f.minRating) {
        return false;
      }

      // orientation
      if (f.orientation && p.orientation && p.orientation !== f.orientation) {
        return false;
      }

      // themeTags
      if (Array.isArray(f.themeTags) && f.themeTags.length > 0) {
        const themeTags = p.theme_tags || [];
        const hasAny = f.themeTags.some(tag => themeTags.includes(tag));
        if (!hasAny) return false;
      }

      // styleTags
      if (Array.isArray(f.styleTags) && f.styleTags.length > 0) {
        const styleTags = p.style_tags || [];
        const hasAny = f.styleTags.some(tag => styleTags.includes(tag));
        if (!hasAny) return false;
      }

      // hasFreeShipping
      if (typeof f.hasFreeShipping === 'boolean' && !!p.has_free_shipping !== f.hasFreeShipping) {
        return false;
      }

      // kids friendly
      if (typeof f.isKidsFriendly === 'boolean' && !!p.is_kids_friendly !== f.isKidsFriendly) {
        return false;
      }

      const variants = variantsAll.filter(v => v.product_id === p.id && v.is_available);

      // sizeLabels
      if (Array.isArray(f.sizeLabels) && f.sizeLabels.length > 0) {
        const hasSize = variants.some(v => f.sizeLabels.includes(v.size_label));
        if (!hasSize) return false;
      }

      // sizeCodes
      if (Array.isArray(f.sizeCodes) && f.sizeCodes.length > 0) {
        const hasSizeCode = variants.some(v => f.sizeCodes.includes(v.size_code));
        if (!hasSizeCode) return false;
      }

      // Width/height filters
      if (typeof f.minWidthInches === 'number') {
        const ok = variants.some(v => v.width_inches >= f.minWidthInches);
        if (!ok) return false;
      }
      if (typeof f.maxWidthInches === 'number') {
        const ok = variants.some(v => v.width_inches <= f.maxWidthInches);
        if (!ok) return false;
      }
      if (typeof f.minHeightInches === 'number') {
        const ok = variants.some(v => v.height_inches >= f.minHeightInches);
        if (!ok) return false;
      }
      if (typeof f.maxHeightInches === 'number') {
        const ok = variants.some(v => v.height_inches <= f.maxHeightInches);
        if (!ok) return false;
      }

      // Price range
      if (typeof f.minPrice === 'number') {
        const ok = variants.some(v => v.price >= f.minPrice);
        if (!ok) return false;
      }
      if (typeof f.maxPrice === 'number') {
        const ok = variants.some(v => v.price <= f.maxPrice);
        if (!ok) return false;
      }

      return true;
    });
  }

  _sortProducts(products, variantsAll, sort) {
    if (!sort) return products.slice();
    const s = String(sort).toLowerCase();

    const withPrice = products.map(p => {
      const variants = variantsAll.filter(v => v.product_id === p.id && v.is_available);
      const prices = variants.map(v => v.price);
      const minPrice = prices.length ? Math.min(...prices) : p.base_price;
      return { product: p, minPrice };
    });

    if (s === 'price_asc' || s === 'price_low_to_high') {
      withPrice.sort((a, b) => a.minPrice - b.minPrice);
    } else if (s === 'price_desc' || s === 'price_high_to_low') {
      withPrice.sort((a, b) => b.minPrice - a.minPrice);
    } else if (s === 'rating_desc' || s === 'rating_high_to_low') {
      withPrice.sort((a, b) => (b.product.average_rating || 0) - (a.product.average_rating || 0));
    }

    return withPrice.map(x => x.product);
  }

  _buildAvailableFilters(products, variantsAll) {
    const colors = new Set();
    const sizeLabels = new Set();
    const sizeCodes = new Set();
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    const ratingThresholdsSet = new Set();
    const orientations = new Set();
    const themeTags = new Set();
    const styleTags = new Set();
    const shippingOptions = new Set();

    const variantsByProduct = variantsAll.reduce((acc, v) => {
      if (!acc[v.product_id]) acc[v.product_id] = [];
      acc[v.product_id].push(v);
      return acc;
    }, {});

    products.forEach(p => {
      (p.color_tags || []).forEach(tag => colors.add(tag));
      if (p.primary_color) colors.add(p.primary_color);

      if (p.orientation) orientations.add(p.orientation);

      (p.theme_tags || []).forEach(t => themeTags.add(t));
      (p.style_tags || []).forEach(t => styleTags.add(t));

      if (p.has_free_shipping) shippingOptions.add('free_shipping');

      const rating = p.average_rating;
      if (typeof rating === 'number' && rating > 0) {
        // Typical thresholds: 3, 4, 4.5, 5 based on actual ratings
        if (rating >= 3) ratingThresholdsSet.add(3);
        if (rating >= 4) ratingThresholdsSet.add(4);
        if (rating >= 4.5) ratingThresholdsSet.add(4.5);
        if (rating >= 5) ratingThresholdsSet.add(5);
      }

      const variants = variantsByProduct[p.id] || [];
      variants.forEach(v => {
        sizeLabels.add(v.size_label);
        sizeCodes.add(v.size_code);
        if (typeof v.price === 'number') {
          if (v.price < minPrice) minPrice = v.price;
          if (v.price > maxPrice) maxPrice = v.price;
        }
      });
    });

    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = 0;

    const ratingThresholds = Array.from(ratingThresholdsSet).sort((a, b) => a - b);

    return {
      colors: Array.from(colors),
      sizeLabels: Array.from(sizeLabels),
      sizeCodes: Array.from(sizeCodes),
      priceRange: { min: minPrice, max: maxPrice },
      ratingThresholds,
      orientations: Array.from(orientations),
      themeTags: Array.from(themeTags),
      styleTags: Array.from(styleTags),
      shippingOptions: Array.from(shippingOptions)
    };
  }

  // NO test methods in this class
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}