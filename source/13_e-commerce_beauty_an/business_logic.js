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

  // ---------- Storage helpers ----------

  _initStorage() {
    // Core entity tables
    const tableKeys = [
      'brands',
      'products',
      'free_sample_options',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'promotions',
      'reviews',
      'product_questions',
      'checkout_sessions',
      'contact_form_submissions'
    ];

    for (let key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Optional config-style keys (arrays); leave empty arrays if not present
    const arrayConfigKeys = [
      'main_categories',
      'featured_product_ids',
      'curated_routines',
      'faq_topics'
    ];
    for (let key of arrayConfigKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
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

  _now() {
    return new Date().toISOString();
  }

  // ---------- Cart helpers ----------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let currentCartId = localStorage.getItem('current_cart_id');
    let cart = null;

    if (currentCartId) {
      cart = carts.find(c => c.id === currentCartId) || null;
    }

    if (!cart && carts.length > 0) {
      cart = carts[0];
      localStorage.setItem('current_cart_id', cart.id);
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        applied_promo_codes: [],
        applied_promotion_ids: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    cart.updated_at = this._now();
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
    localStorage.setItem('current_cart_id', cart.id);
  }

  _recalculateCartTotals(cart) {
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const cartItems = cartItemsAll.filter(ci => ci.cart_id === cart.id);
    const products = this._getFromStorage('products', []);
    const promotions = this._getFromStorage('promotions', []);

    let subtotal = 0;
    for (let item of cartItems) {
      if (item.item_type === 'product') {
        subtotal += item.line_subtotal || 0;
      }
    }

    let discountTotal = 0;
    if (cart.applied_promotion_ids && cart.applied_promotion_ids.length > 0) {
      const now = new Date();
      for (let promoId of cart.applied_promotion_ids) {
        const promo = promotions.find(p => p.id === promoId);
        if (!promo || !promo.active) continue;
        if (promo.start_at && new Date(promo.start_at) > now) continue;
        if (promo.end_at && new Date(promo.end_at) < now) continue;
        if (promo.min_subtotal && subtotal < promo.min_subtotal) continue;

        // Determine eligible subtotal by category
        let eligibleSubtotal = 0;
        for (let item of cartItems) {
          if (item.item_type !== 'product') continue;
          const product = products.find(p => p.id === item.product_id);
          if (!product) continue;
          if (Array.isArray(promo.applicable_category_ids) && promo.applicable_category_ids.length > 0) {
            if (!promo.applicable_category_ids.includes(product.category_id)) {
              continue;
            }
          }
          eligibleSubtotal += item.line_subtotal || 0;
        }

        if (eligibleSubtotal <= 0) continue;

        let promoDiscount = 0;
        if (promo.discount_type === 'percent') {
          promoDiscount = eligibleSubtotal * (promo.discount_value / 100);
        } else if (promo.discount_type === 'fixed_amount') {
          promoDiscount = promo.discount_value;
        }
        if (promoDiscount > eligibleSubtotal) promoDiscount = eligibleSubtotal;
        discountTotal += promoDiscount;
      }
    }

    cart.subtotal = subtotal;
    cart.discount_total = discountTotal;
    const total = subtotal - discountTotal;
    cart.total = total >= 0 ? total : 0;
    this._saveCart(cart);
  }

  _buildCartItemsForCart(cart) {
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);
    const freeSampleOptions = this._getFromStorage('free_sample_options', []);

    const items = cartItemsAll.filter(ci => ci.cart_id === cart.id);

    return items.map(item => {
      const base = {
        cart_item_id: item.id,
        item_type: item.item_type,
        product_id: item.product_id || null,
        free_sample_option_id: item.free_sample_option_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_subtotal: item.line_subtotal,
        purchase_type: item.purchase_type,
        subscription_frequency: item.subscription_frequency || null,
        gift_wrap_selected: !!item.gift_wrap_selected,
        gift_message: item.gift_message || null,
        selected_shade: item.selected_shade || null
      };

      let product = null;
      let brand = null;
      if (item.product_id) {
        const p = products.find(pr => pr.id === item.product_id) || null;
        if (p) {
          brand = brands.find(b => b.id === p.brand_id) || null;
          product = Object.assign({}, p, { brand: brand || null });
        }
      }

      let freeSampleOption = null;
      if (item.free_sample_option_id) {
        const fs = freeSampleOptions.find(f => f.id === item.free_sample_option_id) || null;
        if (fs) {
          const fsProduct = products.find(pr => pr.id === fs.product_id) || null;
          freeSampleOption = Object.assign({}, fs, {
            product: fsProduct || null
          });
        }
      }

      const category_name = product ? product.category_id : null;

      return Object.assign({}, base, {
        product_name: product ? product.name : null,
        brand_name: brand ? brand.name : null,
        category_name: category_name,
        product: product,
        free_sample_option: freeSampleOption
      });
    });
  }

  _buildCartDetails(cart) {
    const items = this._buildCartItemsForCart(cart);
    return {
      items: items,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      total: cart.total || 0,
      applied_promo_codes: Array.isArray(cart.applied_promo_codes) ? cart.applied_promo_codes : []
    };
  }

  // ---------- Checkout helpers ----------

  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions', []);
    let currentSessionId = localStorage.getItem('current_checkout_session_id');
    let session = null;

    if (currentSessionId) {
      session = sessions.find(s => s.id === currentSessionId) || null;
    }

    if (!session) {
      // Try to find an in-progress session for this cart
      session = sessions.find(s => s.cart_id === cart.id && s.status === 'in_progress') || null;
    }

    if (!session) {
      session = {
        id: this._generateId('checkout'),
        cart_id: cart.id,
        guest_name: null,
        guest_email: null,
        shipping_street: null,
        shipping_city: null,
        shipping_state: null,
        shipping_postal_code: null,
        shipping_country: null,
        shipping_method: null,
        current_step: 'shipping',
        status: 'in_progress',
        created_at: this._now(),
        updated_at: this._now()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
      localStorage.setItem('current_checkout_session_id', session.id);
    }

    return session;
  }

  _saveCheckoutSession(session) {
    let sessions = this._getFromStorage('checkout_sessions', []);
    const idx = sessions.findIndex(s => s.id === session.id);
    session.updated_at = this._now();
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    this._saveToStorage('checkout_sessions', sessions);
    localStorage.setItem('current_checkout_session_id', session.id);
  }

  _buildOrderSummary(cart) {
    const items = this._buildCartItemsForCart(cart).filter(i => i.item_type === 'product');

    const orderItems = items.map(it => ({
      product_name: it.product_name,
      brand_name: it.brand_name,
      quantity: it.quantity,
      unit_price: it.unit_price,
      line_subtotal: it.line_subtotal
    }));

    // Simple shipping cost logic based on shipping_method stored on checkout session handled elsewhere
    const shipping_cost = 0; // actual shipping cost will be provided in selectShippingMethod

    return {
      items: orderItems,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      shipping_cost: shipping_cost,
      total: (cart.total || 0) + shipping_cost,
      applied_promo_codes: Array.isArray(cart.applied_promo_codes) ? cart.applied_promo_codes : []
    };
  }

  // ---------- Static content helper ----------

  _loadStaticPageContent(pageKey) {
    const raw = localStorage.getItem('static_pages');
    let pages = {};
    if (raw) {
      try {
        pages = JSON.parse(raw) || {};
      } catch (e) {
        pages = {};
      }
    }
    const page = pages[pageKey] || null;
    if (!page) {
      return {
        title: '',
        body_html: '',
        last_updated: ''
      };
    }
    return page;
  }

  // ---------- Product filter/sort helper ----------

  _filterAndSortProducts(products, options) {
    const opts = options || {};
    const query = (opts.query || '').toLowerCase().trim();
    const filters = opts.filters || {};
    const categoryId = opts.categoryId || null;
    const sort = opts.sort || 'relevance';

    const brands = this._getFromStorage('brands', []);

    let result = products.filter(p => p.status === 'active');

    if (categoryId) {
      result = result.filter(p => p.category_id === categoryId);
    }

    if (query) {
      const tokens = query.split(/\s+/).filter(Boolean);
      result = result.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const brand = brands.find(b => b.id === p.brand_id);
        const brandName = brand ? (brand.name || '').toLowerCase() : '';
        const ingredients = Array.isArray(p.ingredients) ? p.ingredients.join(' ').toLowerCase() : '';
        const labelsText = Array.isArray(p.labels)
          ? p.labels.join(' ').toLowerCase().replace(/_/g, ' ')
          : '';
        const haystack = [name, desc, brandName, ingredients, labelsText].join(' ');
        return tokens.every(t => haystack.includes(t));
      });
    }

    // Price
    if (typeof filters.minPrice === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price >= filters.minPrice);
    }
    if (typeof filters.maxPrice === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price <= filters.maxPrice);
    }

    // Rating
    if (typeof filters.minRating === 'number') {
      result = result.filter(p => (p.average_rating || 0) >= filters.minRating);
    }

    // Skin types
    if (Array.isArray(filters.skinTypes) && filters.skinTypes.length > 0) {
      const selected = filters.skinTypes;
      result = result.filter(p => {
        const st = Array.isArray(p.skin_types) ? p.skin_types : [];
        if (st.includes('all_skin_types')) return true;
        return st.some(v => selected.includes(v));
      });
    }

    // Labels
    if (Array.isArray(filters.labels) && filters.labels.length > 0) {
      result = result.filter(p => {
        const labels = Array.isArray(p.labels) ? p.labels : [];
        return filters.labels.every(l => labels.includes(l));
      });
    }

    // Ingredients
    if (Array.isArray(filters.ingredients) && filters.ingredients.length > 0) {
      result = result.filter(p => {
        const ing = Array.isArray(p.ingredients) ? p.ingredients : [];
        return filters.ingredients.every(i => ing.includes(i));
      });
    }

    // Coverage level
    if (Array.isArray(filters.coverageLevels) && filters.coverageLevels.length > 0) {
      result = result.filter(p => filters.coverageLevels.includes(p.coverage_level));
    }

    // Shades
    if (Array.isArray(filters.shadeNames) && filters.shadeNames.length > 0) {
      const shadeNamesLower = filters.shadeNames.map(s => s.toLowerCase());
      result = result.filter(p => {
        if (!p.shade_name) return false;
        const shadeLower = p.shade_name.toLowerCase();
        return shadeNamesLower.some(s => shadeLower.includes(s));
      });
    }

    // SPF required
    if (filters.spfRequired) {
      result = result.filter(p => {
        const labels = Array.isArray(p.labels) ? p.labels : [];
        if (labels.includes('includes_spf')) return true;
        if (typeof p.spf_value === 'number' && p.spf_value > 0) return true;
        return false;
      });
    }

    // Intended recipient
    if (filters.intendedRecipient) {
      result = result.filter(p => p.intended_recipient === filters.intendedRecipient);
    }

    // Minimum included product count (for gift sets)
    if (typeof filters.minIncludedProductCount === 'number') {
      result = result.filter(p => (p.included_product_count || 0) >= filters.minIncludedProductCount);
    }

    // CreatedSince
    if (filters.createdSince) {
      const since = new Date(filters.createdSince);
      result = result.filter(p => {
        const created = p.created_at ? new Date(p.created_at) : null;
        return created && created >= since;
      });
    }

    // Sorting
    if (sort === 'price_low_to_high') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_high_to_low') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rating') {
      result.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sort === 'newest') {
      result.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    } else if (sort === 'bestsellers') {
      result.sort((a, b) => {
        const ra = a.review_count || 0;
        const rb = b.review_count || 0;
        if (rb !== ra) return rb - ra;
        const ar = a.average_rating || 0;
        const br = b.average_rating || 0;
        return br - ar;
      });
    }

    return result;
  }

  // ---------- Interfaces ----------

  // getMainCategories
  getMainCategories() {
    // Prefer configured categories, else derive from products
    let categories = this._getFromStorage('main_categories', []);
    if (Array.isArray(categories) && categories.length > 0) {
      return categories;
    }

    const products = this._getFromStorage('products', []);
    const mapping = {
      skincare: 'Skincare',
      haircare: 'Haircare',
      makeup: 'Makeup',
      gifts: 'Gifts'
    };
    const seen = new Set();
    const derived = [];

    for (let p of products) {
      const cid = p.category_id;
      if (cid && !seen.has(cid) && mapping[cid]) {
        seen.add(cid);
        derived.push({
          id: cid,
          name: mapping[cid],
          description: ''
        });
      }
    }
    return derived;
  }

  // getHeaderStatus
  getHeaderStatus() {
    const cartSummary = this.getCartSummary();
    const wishlistCount = this._getFromStorage('wishlists', []).length;
    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();
    const hasActivePromotions = promotions.some(p => {
      if (!p.active) return false;
      if (p.start_at && new Date(p.start_at) > now) return false;
      if (p.end_at && new Date(p.end_at) < now) return false;
      return true;
    });

    return {
      cart_item_count: cartSummary.item_count,
      cart_subtotal: cartSummary.subtotal,
      has_active_promotions: hasActivePromotions,
      wishlist_count: wishlistCount
    };
  }

  // getFeaturedProducts
  getFeaturedProducts() {
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);
    const featuredIds = this._getFromStorage('featured_product_ids', []);
    if (!Array.isArray(featuredIds) || featuredIds.length === 0) return [];

    const featured = products.filter(p => featuredIds.includes(p.id));
    return featured.map(p => {
      const brand = brands.find(b => b.id === p.brand_id) || null;
      return Object.assign({}, p, { brand: brand });
    });
  }

  // getActivePromotions
  getActivePromotions() {
    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();
    return promotions.filter(p => {
      if (!p.active) return false;
      if (p.start_at && new Date(p.start_at) > now) return false;
      if (p.end_at && new Date(p.end_at) < now) return false;
      return true;
    });
  }

  // getCuratedRoutines
  getCuratedRoutines() {
    return this._getFromStorage('curated_routines', []);
  }

  // getSearchFilterOptions
  getSearchFilterOptions(query) {
    const products = this._getFromStorage('products', []);
    const filtered = this._filterAndSortProducts(products, { query: query || '', filters: {} });

    let minPrice = null;
    let maxPrice = null;
    const skinTypesSet = new Set();
    const labelsSet = new Set();
    const ingredientsSet = new Set();
    const coverageSet = new Set();
    const shadesSet = new Set();
    const recipientsSet = new Set();

    for (let p of filtered) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (Array.isArray(p.skin_types)) {
        p.skin_types.forEach(s => skinTypesSet.add(s));
      }
      if (Array.isArray(p.labels)) {
        p.labels.forEach(l => labelsSet.add(l));
      }
      if (Array.isArray(p.ingredients)) {
        p.ingredients.forEach(i => ingredientsSet.add(i));
      }
      if (p.coverage_level && p.coverage_level !== 'not_applicable') {
        coverageSet.add(p.coverage_level);
      }
      if (p.shade_name) {
        shadesSet.add(p.shade_name);
      }
      if (p.intended_recipient) {
        recipientsSet.add(p.intended_recipient);
      }
    }

    return {
      price: {
        min: minPrice === null ? 0 : minPrice,
        max: maxPrice === null ? 0 : maxPrice
      },
      skin_types: Array.from(skinTypesSet),
      labels: Array.from(labelsSet),
      ingredients: Array.from(ingredientsSet),
      coverage_levels: Array.from(coverageSet),
      shades: Array.from(shadesSet),
      rating_thresholds: [3, 4, 4.5],
      intended_recipients: Array.from(recipientsSet)
    };
  }

  // searchProducts
  searchProducts(query, filters, sort, page, pageSize) {
    const allProducts = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);
    const safePage = page && page > 0 ? page : 1;
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 20;

    const filtered = this._filterAndSortProducts(allProducts, {
      query: query || '',
      filters: filters || {},
      sort: sort || 'relevance'
    });

    const total = filtered.length;
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;
    const pageItems = filtered.slice(start, end).map(p => {
      const brand = brands.find(b => b.id === p.brand_id) || null;
      return Object.assign({}, p, { brand: brand });
    });

    // Instrumentation for task completion tracking (task_5: task5_searchComparisonContext)
    try {
      const taskFilters = filters || {};
      const taskSort = sort || 'relevance';

      const hasMediumCoverage =
        Array.isArray(taskFilters.coverageLevels) &&
        taskFilters.coverageLevels.includes('medium');
      const hasSpfRequired = taskFilters.spfRequired === true;
      const hasBeigeShade =
        Array.isArray(taskFilters.shadeNames) &&
        taskFilters.shadeNames.some(
          name => typeof name === 'string' && name.toLowerCase().includes('beige')
        );
      const hasMinRating =
        typeof taskFilters.minRating === 'number' && taskFilters.minRating >= 4;

      if (
        safePage === 1 &&
        hasMediumCoverage &&
        hasSpfRequired &&
        hasBeigeShade &&
        hasMinRating
      ) {
        const context = {
          query: query || '',
          filters: taskFilters,
          sort: taskSort,
          firstTwoProductIds: pageItems.slice(0, 2).map(p => p.id)
        };
        localStorage.setItem(
          'task5_searchComparisonContext',
          JSON.stringify(context)
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      total: total,
      page: safePage,
      pageSize: safePageSize,
      products: pageItems
    };
  }

  // getCategoryFilterOptions
  getCategoryFilterOptions(categoryId) {
    const products = this._getFromStorage('products', []).filter(p => p.category_id === categoryId);

    const subcategoriesMap = {
      cleansers: 'Cleansers',
      serums: 'Serums',
      moisturizers: 'Moisturizers',
      toners: 'Toners',
      shampoos: 'Shampoos',
      gift_sets: 'Gift Sets',
      foundations: 'Foundations',
      face_creams: 'Face creams',
      other: 'Other'
    };

    const subcategorySet = new Set();
    let minPrice = null;
    let maxPrice = null;
    const skinTypesSet = new Set();
    const labelsSet = new Set();
    const ingredientsSet = new Set();
    const ratingSet = new Set();
    const recipientsSet = new Set();

    for (let p of products) {
      if (p.subcategory_id) subcategorySet.add(p.subcategory_id);
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (Array.isArray(p.skin_types)) {
        p.skin_types.forEach(s => skinTypesSet.add(s));
      }
      if (Array.isArray(p.labels)) {
        p.labels.forEach(l => labelsSet.add(l));
      }
      if (Array.isArray(p.ingredients)) {
        p.ingredients.forEach(i => ingredientsSet.add(i));
      }
      if (typeof p.average_rating === 'number') {
        ratingSet.add(p.average_rating);
      }
      if (p.intended_recipient) {
        recipientsSet.add(p.intended_recipient);
      }
    }

    const subcategories = Array.from(subcategorySet).map(id => ({
      id: id,
      label: subcategoriesMap[id] || id
    }));

    return {
      subcategories: subcategories,
      price: {
        min: minPrice === null ? 0 : minPrice,
        max: maxPrice === null ? 0 : maxPrice
      },
      skin_types: Array.from(skinTypesSet),
      labels: Array.from(labelsSet),
      ingredients: Array.from(ingredientsSet),
      rating_thresholds: [3, 4, 4.5],
      intended_recipients: Array.from(recipientsSet)
    };
  }

  // listCategoryProducts
  listCategoryProducts(categoryId, filters, sort, page, pageSize) {
    const allProducts = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);
    const safePage = page && page > 0 ? page : 1;
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 20;

    const opts = {
      categoryId: categoryId,
      filters: filters || {},
      sort: sort || 'relevance'
    };

    const filtered = this._filterAndSortProducts(allProducts, opts);
    const total = filtered.length;
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;

    const pageItems = filtered.slice(start, end).map(p => {
      const brand = brands.find(b => b.id === p.brand_id) || null;
      return Object.assign({}, p, { brand: brand });
    });

    return {
      total: total,
      page: safePage,
      pageSize: safePageSize,
      products: pageItems
    };
  }

  // getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        brand: null,
        category_name: null,
        subcategory_name: null,
        is_in_cart: false,
        available_shades: [],
        available_subscription_frequencies: [],
        can_gift_wrap: false,
        free_sample_available: false,
        average_rating: null,
        review_count: null
      };
    }

    const brand = brands.find(b => b.id === product.brand_id) || null;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const isInCart = cartItems.some(ci => ci.cart_id === cart.id && ci.product_id === product.id);

    // Available shades: same subcategory & brand, any shade_name
    const availableShades = products
      .filter(p => p.category_id === product.category_id && p.subcategory_id === product.subcategory_id && p.brand_id === product.brand_id && p.shade_name)
      .map(p => p.shade_name);

    const availableSubscriptionFrequencies = product.subscription_available
      ? ['every_2_weeks', 'every_4_weeks', 'every_8_weeks']
      : [];

    const categoryName = product.category_id || null;
    const subcategoryName = product.subcategory_id || null;

    return {
      product: Object.assign({}, product, { brand: brand }),
      brand: brand,
      category_name: categoryName,
      subcategory_name: subcategoryName,
      is_in_cart: isInCart,
      available_shades: Array.from(new Set(availableShades)),
      available_subscription_frequencies: availableSubscriptionFrequencies,
      can_gift_wrap: !!product.gift_wrap_available,
      free_sample_available: !!product.free_sample_available,
      average_rating: typeof product.average_rating === 'number' ? product.average_rating : null,
      review_count: typeof product.review_count === 'number' ? product.review_count : null
    };
  }

  // getProductReviews
  getProductReviews(productId, sort, page, pageSize) {
    const reviews = this._getFromStorage('reviews', []).filter(r => r.product_id === productId);
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;

    const sortMode = sort || 'newest';
    if (sortMode === 'highest_rating') {
      reviews.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortMode === 'lowest_rating') {
      reviews.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else {
      reviews.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    }

    const safePage = page && page > 0 ? page : 1;
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 10;
    const total = reviews.length;
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;
    const pageItems = reviews.slice(start, end).map(r => Object.assign({}, r, { product: product }));

    return {
      total: total,
      page: safePage,
      pageSize: safePageSize,
      reviews: pageItems
    };
  }

  // getProductQuestions
  getProductQuestions(productId, page, pageSize) {
    const allQuestions = this._getFromStorage('product_questions', []).filter(q => q.product_id === productId);
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;

    const safePage = page && page > 0 ? page : 1;
    const safePageSize = pageSize && pageSize > 0 ? pageSize : 10;
    const total = allQuestions.length;
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;

    const pageItems = allQuestions.slice(start, end).map(q => Object.assign({}, q, { product: product }));

    return {
      total: total,
      page: safePage,
      pageSize: safePageSize,
      questions: pageItems
    };
  }

  // submitProductQuestion
  submitProductQuestion(productId, guestName, guestEmail, questionText) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        question: null,
        message: 'Product not found.'
      };
    }

    const questions = this._getFromStorage('product_questions', []);
    const question = {
      id: this._generateId('pq'),
      product_id: productId,
      question_text: questionText,
      guest_name: guestName,
      guest_email: guestEmail,
      status: 'submitted',
      answer_text: null,
      created_at: this._now(),
      answered_at: null
    };
    questions.push(question);
    this._saveToStorage('product_questions', questions);

    return {
      success: true,
      question: Object.assign({}, question, { product: product }),
      message: 'Question submitted.'
    };
  }

  // getFreeSampleOptions
  getFreeSampleOptions(productId) {
    const options = this._getFromStorage('free_sample_options', []).filter(o => o.product_id === productId && o.is_active);
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;

    return options.map(o => Object.assign({}, o, { product: product }));
  }

  // addToCart
  addToCart(productId, configuration) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product || product.status !== 'active') {
      return {
        success: false,
        message: 'Product not found or inactive.',
        cart: null
      };
    }

    const config = configuration || {};
    const purchaseType = config.purchaseType || 'one_time';
    const subscriptionFrequency = config.subscriptionFrequency || null;
    const quantity = typeof config.quantity === 'number' && config.quantity > 0 ? config.quantity : 1;
    const selectedShade = config.selectedShade || null;
    const giftWrapSelected = !!config.giftWrapSelected;
    const giftMessage = config.giftMessage || null;
    const selectedFreeSampleOptionId = config.selectedFreeSampleOptionId || null;

    if (purchaseType === 'subscription' && !product.subscription_available) {
      return {
        success: false,
        message: 'Subscription not available for this product.',
        cart: null
      };
    }

    if (purchaseType === 'subscription' && !subscriptionFrequency) {
      return {
        success: false,
        message: 'Subscription frequency is required for subscription purchases.',
        cart: null
      };
    }

    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'product',
      product_id: productId,
      free_sample_option_id: null,
      quantity: quantity,
      unit_price: product.price || 0,
      line_subtotal: (product.price || 0) * quantity,
      purchase_type: purchaseType,
      subscription_frequency: purchaseType === 'subscription' ? subscriptionFrequency : null,
      gift_wrap_selected: giftWrapSelected,
      gift_message: giftMessage,
      selected_shade: selectedShade,
      created_at: this._now(),
      updated_at: this._now()
    };

    cartItems.push(cartItem);
    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItem.id);

    // Optional free sample
    if (selectedFreeSampleOptionId) {
      const freeSampleOptions = this._getFromStorage('free_sample_options', []);
      const sample = freeSampleOptions.find(f => f.id === selectedFreeSampleOptionId) || null;
      if (sample) {
        const sampleItem = {
          id: this._generateId('cart_item'),
          cart_id: cart.id,
          item_type: 'free_sample',
          product_id: null,
          free_sample_option_id: selectedFreeSampleOptionId,
          quantity: 1,
          unit_price: 0,
          line_subtotal: 0,
          purchase_type: 'one_time',
          subscription_frequency: null,
          gift_wrap_selected: false,
          gift_message: null,
          selected_shade: null,
          created_at: this._now(),
          updated_at: this._now()
        };
        cartItems.push(sampleItem);
        cart.item_ids.push(sampleItem.id);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const cartDetails = this._buildCartDetails(cart);

    return {
      success: true,
      message: 'Added to cart.',
      cart: cartDetails
    };
  }

  // getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const items = cartItemsAll.filter(ci => ci.cart_id === cart.id);

    let itemCount = 0;
    for (let item of items) {
      itemCount += item.quantity || 0;
    }

    return {
      item_count: itemCount,
      subtotal: cart.subtotal || 0,
      applied_promo_codes: Array.isArray(cart.applied_promo_codes) ? cart.applied_promo_codes : []
    };
  }

  // getCartDetails
  getCartDetails() {
    const cart = this._getOrCreateCart();
    return this._buildCartDetails(cart);
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const idx = cartItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return {
        success: false,
        cart: this._buildCartDetails(cart)
      };
    }

    if (quantity <= 0) {
      // remove the item
      const removed = cartItems.splice(idx, 1)[0];
      cart.item_ids = (cart.item_ids || []).filter(id => id !== removed.id);
    } else {
      const item = cartItems[idx];
      item.quantity = quantity;
      if (item.item_type === 'product') {
        const product = products.find(p => p.id === item.product_id);
        const unitPrice = product ? (product.price || 0) : 0;
        item.unit_price = unitPrice;
        item.line_subtotal = unitPrice * quantity;
      } else {
        item.unit_price = 0;
        item.line_subtotal = 0;
      }
      item.updated_at = this._now();
      cartItems[idx] = item;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const details = this._buildCartDetails(cart);
    return {
      success: true,
      cart: {
        items: details.items.map(i => ({
          cart_item_id: i.cart_item_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_subtotal: i.line_subtotal
        })),
        subtotal: details.subtotal,
        discount_total: details.discount_total,
        total: details.total
      }
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return {
        success: false,
        cart: this._buildCartDetails(cart)
      };
    }

    const removed = cartItems.splice(idx, 1)[0];
    cart.item_ids = (cart.item_ids || []).filter(id => id !== removed.id);

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const details = this._buildCartDetails(cart);
    return {
      success: true,
      cart: {
        items: details.items.map(i => ({
          cart_item_id: i.cart_item_id,
          product_name: i.product_name
        })),
        subtotal: details.subtotal,
        discount_total: details.discount_total,
        total: details.total
      }
    };
  }

  // updateCartItemGiftOptions
  updateCartItemGiftOptions(cartItemId, giftWrapSelected, giftMessage) {
    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return {
        success: false,
        cart: { items: [] }
      };
    }

    const item = cartItems[idx];
    item.gift_wrap_selected = !!giftWrapSelected;
    item.gift_message = giftMessage || null;
    item.updated_at = this._now();
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const items = this._buildCartItemsForCart(cart).map(i => ({
      cart_item_id: i.cart_item_id,
      gift_wrap_selected: i.gift_wrap_selected,
      gift_message: i.gift_message
    }));

    return {
      success: true,
      cart: { items: items }
    };
  }

  // applyPromoCode
  applyPromoCode(promoCode) {
    const normalizedCode = (promoCode || '').trim();
    if (!normalizedCode) {
      return {
        success: false,
        message: 'Promo code is required.',
        cart: null
      };
    }

    let cart = this._getOrCreateCart();
    const promotions = this._getFromStorage('promotions', []);

    const promo = promotions.find(p => (p.code || '').toUpperCase() === normalizedCode.toUpperCase());
    if (!promo) {
      return {
        success: false,
        message: 'Promo code not found.',
        cart: this._buildCartDetails(cart)
      };
    }

    const now = new Date();
    if (!promo.active || (promo.start_at && new Date(promo.start_at) > now) || (promo.end_at && new Date(promo.end_at) < now)) {
      return {
        success: false,
        message: 'Promo code is not active.',
        cart: this._buildCartDetails(cart)
      };
    }

    cart.applied_promo_codes = cart.applied_promo_codes || [];
    cart.applied_promotion_ids = cart.applied_promotion_ids || [];

    if (!cart.applied_promo_codes.includes(promo.code)) {
      cart.applied_promo_codes.push(promo.code);
    }
    if (!cart.applied_promotion_ids.includes(promo.id)) {
      cart.applied_promotion_ids.push(promo.id);
    }

    this._recalculateCartTotals(cart);

    const details = this._buildCartDetails(cart);
    return {
      success: true,
      message: 'Promo code applied.',
      cart: details
    };
  }

  // removePromoCode
  removePromoCode(promoCode) {
    const normalizedCode = (promoCode || '').trim();
    let cart = this._getOrCreateCart();
    const promotions = this._getFromStorage('promotions', []);

    const promo = promotions.find(p => (p.code || '').toUpperCase() === normalizedCode.toUpperCase());
    if (!promo) {
      return {
        success: false,
        cart: this._buildCartDetails(cart)
      };
    }

    cart.applied_promo_codes = (cart.applied_promo_codes || []).filter(c => c.toUpperCase() !== normalizedCode.toUpperCase());
    cart.applied_promotion_ids = (cart.applied_promotion_ids || []).filter(id => id !== promo.id);

    this._recalculateCartTotals(cart);

    const details = this._buildCartDetails(cart);
    return {
      success: true,
      cart: details
    };
  }

  // addProductToWishlist
  addProductToWishlist(productId, targetWishlistId, newWishlistName) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, wishlist: null };
    }

    let wishlists = this._getFromStorage('wishlists', []);
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    let wishlist = null;
    if (targetWishlistId) {
      wishlist = wishlists.find(w => w.id === targetWishlistId) || null;
    }

    if (!wishlist) {
      const name = newWishlistName || 'My Wishlist';
      wishlist = {
        id: this._generateId('wishlist'),
        name: name,
        item_ids: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(wishlist);
    }

    const wishlistItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: productId,
      added_at: this._now()
    };

    wishlistItems.push(wishlistItem);
    wishlist.item_ids = wishlist.item_ids || [];
    wishlist.item_ids.push(wishlistItem.id);
    wishlist.updated_at = this._now();

    this._saveToStorage('wishlists', wishlists);
    this._saveToStorage('wishlist_items', wishlistItems);

    // Instrumentation for task completion tracking (task_5: task5_wishlistSelection)
    try {
      const rawContext = localStorage.getItem('task5_searchComparisonContext');
      if (rawContext) {
        const ctx = JSON.parse(rawContext);
        if (
          ctx &&
          Array.isArray(ctx.firstTwoProductIds) &&
          ctx.firstTwoProductIds.length > 0 &&
          ctx.firstTwoProductIds.includes(productId)
        ) {
          const firstTwo = ctx.firstTwoProductIds;
          const otherId = firstTwo.find(id => id !== productId) || null;
          const selectedProduct = products.find(p => p.id === productId) || null;
          const otherProduct = otherId
            ? products.find(p => p.id === otherId) || null
            : null;

          const selectedPrice = selectedProduct ? selectedProduct.price : undefined;
          const otherPrice = otherProduct ? otherProduct.price : undefined;

          const instrumentationValue = {
            productId: productId,
            otherProductId: otherId,
            selectedPrice: selectedPrice,
            otherPrice: otherPrice,
            isCheaperOrEqual: selectedPrice <= otherPrice
          };

          localStorage.setItem(
            'task5_wishlistSelection',
            JSON.stringify(instrumentationValue)
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      wishlist: wishlist
    };
  }

  // createWishlist
  createWishlist(name) {
    const wishlists = this._getFromStorage('wishlists', []);
    const wishlist = {
      id: this._generateId('wishlist'),
      name: name,
      item_ids: [],
      created_at: this._now(),
      updated_at: this._now()
    };
    wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);
    return { wishlist: wishlist };
  }

  // getWishlists
  getWishlists() {
    return this._getFromStorage('wishlists', []);
  }

  // getWishlistDetails
  getWishlistDetails(wishlistId) {
    const wishlists = this._getFromStorage('wishlists', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);

    const wishlist = wishlists.find(w => w.id === wishlistId) || null;
    if (!wishlist) {
      return {
        wishlist: null,
        items: []
      };
    }

    const items = (wishlist.item_ids || [])
      .map(id => wishlistItems.find(wi => wi.id === id))
      .filter(Boolean)
      .map(wi => {
        const product = products.find(p => p.id === wi.product_id) || null;
        let productWithBrand = null;
        if (product) {
          const brand = brands.find(b => b.id === product.brand_id) || null;
          productWithBrand = Object.assign({}, product, { brand: brand });
        }
        return {
          wishlist_item_id: wi.id,
          product: productWithBrand
        };
      });

    return {
      wishlist: wishlist,
      items: items
    };
  }

  // renameWishlist
  renameWishlist(wishlistId, newName) {
    let wishlists = this._getFromStorage('wishlists', []);
    const idx = wishlists.findIndex(w => w.id === wishlistId);
    if (idx === -1) {
      return { wishlist: null };
    }
    const wishlist = wishlists[idx];
    wishlist.name = newName;
    wishlist.updated_at = this._now();
    wishlists[idx] = wishlist;
    this._saveToStorage('wishlists', wishlists);
    return { wishlist: wishlist };
  }

  // removeWishlistItem
  removeWishlistItem(wishlistItemId) {
    let wishlists = this._getFromStorage('wishlists', []);
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const itemIdx = wishlistItems.findIndex(wi => wi.id === wishlistItemId);
    if (itemIdx === -1) {
      return { success: false, wishlist: null };
    }
    const item = wishlistItems[itemIdx];
    wishlistItems.splice(itemIdx, 1);

    const wishlistIdx = wishlists.findIndex(w => w.id === item.wishlist_id);
    if (wishlistIdx !== -1) {
      const wishlist = wishlists[wishlistIdx];
      wishlist.item_ids = (wishlist.item_ids || []).filter(id => id !== item.id);
      wishlist.updated_at = this._now();
      wishlists[wishlistIdx] = wishlist;
    }

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveToStorage('wishlists', wishlists);

    const wishlist = wishlists.find(w => w.id === item.wishlist_id) || null;

    return {
      success: true,
      wishlist: wishlist
    };
  }

  // addWishlistItemToCart
  addWishlistItemToCart(wishlistItemId, quantity) {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const wi = wishlistItems.find(w => w.id === wishlistItemId) || null;
    if (!wi) {
      return { success: false, cart: null };
    }
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const result = this.addToCart(wi.product_id, { quantity: qty });
    if (!result.success) {
      return { success: false, cart: result.cart };
    }
    return {
      success: true,
      cart: {
        subtotal: result.cart.subtotal,
        total: result.cart.total
      }
    };
  }

  // addWishlistToCart
  addWishlistToCart(wishlistId) {
    const wishlists = this._getFromStorage('wishlists', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    const wishlist = wishlists.find(w => w.id === wishlistId) || null;
    if (!wishlist) {
      return { success: false, added_item_count: 0, cart: null };
    }

    let addedCount = 0;
    for (let id of wishlist.item_ids || []) {
      const wi = wishlistItems.find(w => w.id === id);
      if (!wi) continue;
      const res = this.addToCart(wi.product_id, { quantity: 1 });
      if (res.success) {
        addedCount += 1;
      }
    }

    const cart = this.getCartDetails();
    return {
      success: true,
      added_item_count: addedCount,
      cart: {
        subtotal: cart.subtotal,
        total: cart.total
      }
    };
  }

  // startCheckout
  startCheckout() {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();
    session.current_step = 'shipping';
    session.status = 'in_progress';
    this._saveCheckoutSession(session);

    return {
      success: true,
      checkout_session: Object.assign({}, session, { cart: this._buildCartDetails(cart) })
    };
  }

  // getCheckoutSession
  getCheckoutSession() {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();
    const orderSummary = this._buildOrderSummary(cart);

    return {
      checkout_session: Object.assign({}, session, { cart: this._buildCartDetails(cart) }),
      order_summary: orderSummary
    };
  }

  // updateCheckoutGuestDetails
  updateCheckoutGuestDetails(guestName, guestEmail) {
    const session = this._getOrCreateCheckoutSession();
    session.guest_name = guestName;
    session.guest_email = guestEmail;
    this._saveCheckoutSession(session);
    return {
      checkout_session: session
    };
  }

  // updateCheckoutShippingAddress
  updateCheckoutShippingAddress(shippingStreet, shippingCity, shippingState, shippingPostalCode, shippingCountry) {
    const session = this._getOrCreateCheckoutSession();
    session.shipping_street = shippingStreet;
    session.shipping_city = shippingCity;
    session.shipping_state = shippingState;
    session.shipping_postal_code = shippingPostalCode;
    session.shipping_country = shippingCountry;
    this._saveCheckoutSession(session);
    return {
      checkout_session: session
    };
  }

  // selectShippingMethod
  selectShippingMethod(shippingMethod) {
    const session = this._getOrCreateCheckoutSession();
    const cart = this._getOrCreateCart();
    session.shipping_method = shippingMethod;
    this._saveCheckoutSession(session);

    let shippingCost = 0;
    if (shippingMethod === 'standard') shippingCost = 5;
    else if (shippingMethod === 'express') shippingCost = 15;

    const orderSummary = {
      shipping_cost: shippingCost,
      total: (cart.total || 0) + shippingCost
    };

    return {
      checkout_session: session,
      order_summary: orderSummary
    };
  }

  // proceedToPaymentStep
  proceedToPaymentStep() {
    const session = this._getOrCreateCheckoutSession();
    session.current_step = 'payment';
    this._saveCheckoutSession(session);
    return {
      checkout_session: session
    };
  }

  // getPaymentOptions
  getPaymentOptions() {
    // Static list, metadata only (no sensitive info)
    return [
      { id: 'credit_card', name: 'credit_card', description: 'Pay with major credit and debit cards.' },
      { id: 'paypal', name: 'paypal', description: 'Pay securely via PayPal.' }
    ];
  }

  // getContactOptions
  getContactOptions() {
    const raw = localStorage.getItem('contact_options');
    if (!raw) {
      return {
        support_email: '',
        support_phone: '',
        business_hours: '',
        expected_response_time: ''
      };
    }
    try {
      const obj = JSON.parse(raw) || {};
      return {
        support_email: obj.support_email || '',
        support_phone: obj.support_phone || '',
        business_hours: obj.business_hours || '',
        expected_response_time: obj.expected_response_time || ''
      };
    } catch (e) {
      return {
        support_email: '',
        support_phone: '',
        business_hours: '',
        expected_response_time: ''
      };
    }
  }

  // submitContactForm
  submitContactForm(name, email, message) {
    const submissions = this._getFromStorage('contact_form_submissions', []);
    const submission = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      message: message,
      created_at: this._now()
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been submitted.'
    };
  }

  // getFAQTopics
  getFAQTopics() {
    return this._getFromStorage('faq_topics', []);
  }

  // getFAQsByTopic
  getFAQsByTopic(topicId) {
    const key = 'faqs_' + topicId;
    const faqs = this._getFromStorage(key, []);
    return faqs;
  }

  // getStaticPageContent
  getStaticPageContent(pageKey) {
    return this._loadStaticPageContent(pageKey);
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