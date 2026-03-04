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
    this.idCounter = this._getNextIdCounter(); // kept for compatibility; not used directly
  }

  // =========================
  // Storage helpers
  // =========================

  _initStorage() {
    const tableKeys = [
      'users', // legacy/example; unused but initialized
      'products',
      'discount_codes',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'compare_lists',
      'compare_list_items',
      'articles',
      'reading_lists',
      'reading_list_items',
      'comments',
      'size_guides',
      'size_guide_rows',
      'newsletter_subscriptions',
      'contact_messages'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw == null) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _punctureProtectionRank(level) {
    const map = { low: 0, medium: 1, high: 2, very_high: 3 };
    return map[level] !== undefined ? map[level] : -1;
  }

  _humanReadableProductCategory(cat) {
    switch (cat) {
      case 'helmet': return 'Helmet';
      case 'light': return 'Light';
      case 'tire': return 'Tire';
      case 'gps_computer': return 'GPS computer';
      case 'gloves': return 'Gloves';
      case 'accessory': return 'Accessory';
      default: return 'Product';
    }
  }

  _humanReadableArticleCategory(catId) {
    switch (catId) {
      case 'training_plans': return 'Training Plans';
      case 'maintenance': return 'Maintenance';
      case 'reviews_guides': return 'Reviews & Guides';
      default: return 'Articles';
    }
  }

  // =========================
  // Internal entity helpers
  // =========================

  // Cart helpers
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let activeCartId = localStorage.getItem('active_cart_id');
    let cart = null;

    if (activeCartId) {
      cart = carts.find(c => c.id === activeCartId) || null;
    }

    if (!cart && carts.length > 0) {
      // Fallback to most recently updated cart
      carts.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
      cart = carts[0];
      localStorage.setItem('active_cart_id', cart.id);
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('active_cart_id', cart.id);
    }

    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    const items = cartItems.filter(ci => ci.cart_id === cartId);
    let itemCount = 0;
    let subtotal = 0;
    for (const item of items) {
      const q = item.quantity || 0;
      const lt = item.line_total || 0;
      itemCount += q;
      subtotal += lt;
    }
    const estimatedTotal = subtotal; // no tax/shipping logic here
    return {
      item_count: itemCount,
      subtotal,
      estimated_total: estimatedTotal
    };
  }

  // Wishlist helper
  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let activeId = localStorage.getItem('active_wishlist_id');
    let wishlist = null;

    if (activeId) {
      wishlist = wishlists.find(w => w.id === activeId) || null;
    }

    if (!wishlist && wishlists.length > 0) {
      wishlists.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      wishlist = wishlists[0];
      localStorage.setItem('active_wishlist_id', wishlist.id);
    }

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wl'),
        name: 'My Wishlist',
        created_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
      localStorage.setItem('active_wishlist_id', wishlist.id);
    }

    return wishlist;
  }

  // Reading list helper
  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists');
    let activeId = localStorage.getItem('active_reading_list_id');
    let list = null;

    if (activeId) {
      list = lists.find(l => l.id === activeId) || null;
    }

    if (!list && lists.length > 0) {
      lists.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      list = lists[0];
      localStorage.setItem('active_reading_list_id', list.id);
    }

    if (!list) {
      list = {
        id: this._generateId('rl'),
        name: 'Reading List',
        created_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
      localStorage.setItem('active_reading_list_id', list.id);
    }

    return list;
  }

  // Compare list helper
  _getOrCreateCompareList(contextCategory) {
    if (!contextCategory) {
      contextCategory = 'other';
    }
    let lists = this._getFromStorage('compare_lists');
    let list = lists.find(l => l.context_category === contextCategory) || null;

    if (!list) {
      list = {
        id: this._generateId('cmp'),
        context_category: contextCategory,
        max_items: 3,
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('compare_lists', lists);
    }

    return list;
  }

  // Newsletter helper
  _getActiveNewsletterSubscription() {
    const subs = this._getFromStorage('newsletter_subscriptions');
    if (!subs.length) return null;
    subs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return subs[0];
  }

  // =========================
  // Interface implementations
  // =========================

  // ---------- Header & Home ----------

  getHeaderState() {
    const primaryNavigation = [
      { key: 'gear', label: 'Gear', section_type: 'products' },
      { key: 'training_plans', label: 'Training Plans', section_type: 'articles' },
      { key: 'maintenance', label: 'Maintenance', section_type: 'articles' },
      { key: 'reviews_guides', label: 'Reviews & Guides', section_type: 'articles' },
      { key: 'tech', label: 'Tech', section_type: 'products' },
      { key: 'wishlist', label: 'Wishlist', section_type: 'account' },
      { key: 'reading_list', label: 'Reading List', section_type: 'account' },
      { key: 'cart', label: 'Cart', section_type: 'account' }
    ];

    // Cart count
    let cartItemCount = 0;
    const carts = this._getFromStorage('carts');
    if (carts.length) {
      const cart = this._getOrCreateCart();
      const totals = this._calculateCartTotals(cart.id);
      cartItemCount = totals.item_count;
    }

    // Wishlist count
    let wishlistItemCount = 0;
    const wishlistItems = this._getFromStorage('wishlist_items');
    if (wishlistItems.length) {
      const wishlist = this._getOrCreateWishlist();
      wishlistItemCount = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length;
    }

    // Reading list count
    let readingListItemCount = 0;
    const readingListItems = this._getFromStorage('reading_list_items');
    if (readingListItems.length) {
      const rl = this._getOrCreateReadingList();
      readingListItemCount = readingListItems.filter(ri => ri.reading_list_id === rl.id).length;
    }

    return {
      primary_navigation: primaryNavigation,
      cart_item_count: cartItemCount,
      wishlist_item_count: wishlistItemCount,
      reading_list_item_count: readingListItemCount
    };
  }

  getHomePageContent() {
    const primaryNavigation = this.getHeaderState().primary_navigation;
    const articles = this._getFromStorage('articles');
    const products = this._getFromStorage('products');

    const featuredTrainingPlans = articles
      .filter(a => a.category_id === 'training_plans' && a.format === 'training_plan' && a.is_featured)
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      .slice(0, 5);

    const featuredBuyerGuides = articles
      .filter(a => a.category_id === 'reviews_guides' && (a.format === 'buyer_guide'))
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      .slice(0, 5);

    const featuredMaintenanceTutorials = articles
      .filter(a => a.category_id === 'maintenance' && (a.format === 'maintenance_tutorial' || a.format === 'step_by_step_guide') && a.is_featured)
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      .slice(0, 5);

    const promoCollections = [];

    // Commuter helmets
    const commuterHelmets = products.filter(p => p.category === 'helmet' && p.helmet_style === 'commuter');
    if (commuterHelmets.length) {
      const relatedArticle = articles.find(a => a.category_id === 'reviews_guides' && ((a.title || '').toLowerCase().includes('helmet')));
      promoCollections.push({
        key: 'commuter_helmets',
        title: 'Commuter helmets',
        description: 'Popular commuter helmets from our reviews.',
        products: commuterHelmets.slice(0, 10),
        related_article: relatedArticle ? { id: relatedArticle.id, title: relatedArticle.title } : null
      });
    }

    // USB lights
    const usbLights = products.filter(p => p.category === 'light' && p.power_source === 'usb_rechargeable');
    if (usbLights.length) {
      const relatedArticle = articles.find(a => a.category_id === 'reviews_guides' && ((a.title || '').toLowerCase().includes('light')));
      promoCollections.push({
        key: 'usb_lights',
        title: 'USB bike lights',
        description: 'Rechargeable bike lights for safer rides.',
        products: usbLights.slice(0, 10),
        related_article: relatedArticle ? { id: relatedArticle.id, title: relatedArticle.title } : null
      });
    }

    // Wet-weather tires
    const wetTires = products.filter(p => p.category === 'tire' && (p.tire_usage === 'wet' || p.tire_usage === 'all_weather_wet' || p.tire_usage === 'all_weather'));
    if (wetTires.length) {
      const relatedArticle = articles.find(a => a.category_id === 'reviews_guides' && ((a.title || '').toLowerCase().includes('tire')));
      promoCollections.push({
        key: 'wet_weather_tires',
        title: 'Wet-weather road tires',
        description: 'Road tires that excel in wet conditions.',
        products: wetTires.slice(0, 10),
        related_article: relatedArticle ? { id: relatedArticle.id, title: relatedArticle.title } : null
      });
    }

    return {
      primary_navigation: primaryNavigation,
      featured_training_plans: featuredTrainingPlans,
      featured_buyer_guides: featuredBuyerGuides,
      featured_maintenance_tutorials: featuredMaintenanceTutorials,
      promo_product_collections: promoCollections
    };
  }

  // ---------- Search ----------

  searchSite(query, resultType = 'all', page = 1, perPage = 20) {
    const q = (query || '').trim().toLowerCase();
    const results = [];

    if (!q) {
      return {
        query,
        result_type: resultType,
        page,
        per_page: perPage,
        total_results: 0,
        results: []
      };
    }

    if (resultType === 'all' || resultType === 'products') {
      const products = this._getFromStorage('products');
      for (const p of products) {
        const haystack = [p.name, p.description, p.brand].filter(Boolean).join(' ').toLowerCase();
        if (haystack.includes(q)) {
          results.push({
            id: p.id,
            result_type: 'product',
            title: p.name,
            subtitle: p.brand || '',
            snippet: p.description || '',
            rating: p.average_rating || null,
            rating_count: p.rating_count || 0,
            price: p.price,
            currency: p.currency || null,
            product_category_name: this._humanReadableProductCategory(p.category),
            article_category_name: null,
            format_label: null,
            published_at: null
          });
        }
      }
    }

    if (resultType === 'all' || resultType === 'articles') {
      const articles = this._getFromStorage('articles');
      for (const a of articles) {
        const haystack = [a.title, a.subtitle, a.excerpt, a.content].filter(Boolean).join(' ').toLowerCase();
        if (haystack.includes(q)) {
          results.push({
            id: a.id,
            result_type: 'article',
            title: a.title,
            subtitle: a.subtitle || '',
            snippet: a.excerpt || (a.content ? a.content.slice(0, 160) : ''),
            rating: null,
            rating_count: null,
            price: null,
            currency: null,
            product_category_name: null,
            article_category_name: this._humanReadableArticleCategory(a.category_id),
            format_label: a.format,
            published_at: a.published_at
          });
        }
      }
    }

    const total = results.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageResults = results.slice(start, end);

    return {
      query,
      result_type: resultType,
      page,
      per_page: perPage,
      total_results: total,
      results: pageResults
    };
  }

  // ---------- Product listing & filters ----------

  getProductFilterOptions(listingCategoryId) {
    const products = this._getFromStorage('products');

    // Determine relevant products for listingCategoryId
    let relevant = products;
    if (listingCategoryId === 'gps_computers') {
      relevant = products.filter(p => p.category === 'gps_computer' || p.default_listing_category_id === 'gps_computers');
    }

    let minPrice = Infinity;
    let maxPrice = 0;
    let minWet = Infinity;
    let maxWet = 0;
    for (const p of relevant) {
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.wet_grip_rating === 'number') {
        if (p.wet_grip_rating < minWet) minWet = p.wet_grip_rating;
        if (p.wet_grip_rating > maxWet) maxWet = p.wet_grip_rating;
      }
    }
    if (!isFinite(minPrice)) { minPrice = 0; maxPrice = 0; }
    if (!isFinite(minWet)) { minWet = 0; maxWet = 5; }

    const priceRanges = [];
    if (maxPrice > 0) {
      const step = Math.max(50, Math.ceil(maxPrice / 4 / 10) * 10);
      let current = 0;
      while (current < maxPrice) {
        const next = current + step;
        priceRanges.push({
          min: current,
          max: next,
          label: `$${current} - $${next}`
        });
        current = next;
      }
    }

    const ratingOptions = [
      { min_rating: 0, label: 'All ratings' },
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' }
    ];

    const helmetStyles = ['commuter', 'road', 'mountain', 'time_trial', 'bmx', 'kids', 'other'];
    const lightTypes = ['front', 'rear', 'combo', 'other'];
    const powerSources = ['usb_rechargeable', 'battery', 'dynamo', 'solar', 'other'];
    const tireTypes = ['road', 'gravel', 'mountain', 'cyclocross', 'commuter', 'other'];
    const tireUsageOptions = ['dry', 'wet', 'all_weather', 'all_weather_wet', 'indoor_trainer', 'other'];
    const punctureLevels = ['low', 'medium', 'high', 'very_high'];

    const sortOptions = [
      { key: 'relevance', label: 'Recommended' },
      { key: 'price_asc', label: 'Price: Low to High' },
      { key: 'price_desc', label: 'Price: High to Low' },
      { key: 'rating_desc', label: 'Customer Rating' },
      { key: 'puncture_protection_desc', label: 'Puncture Protection: High to Low' },
      { key: 'battery_life_desc', label: 'Battery life: Long to Short' }
    ];

    return {
      price_ranges: priceRanges,
      rating_options: ratingOptions,
      helmet_styles: helmetStyles,
      light_types: lightTypes,
      power_sources: powerSources,
      tire_types: tireTypes,
      tire_usage_options: tireUsageOptions,
      puncture_protection_levels: punctureLevels,
      wet_grip_range: { min: minWet, max: maxWet },
      sort_options: sortOptions
    };
  }

  listProductsForCategory(listingCategoryId, filters = {}, sort = 'relevance', page = 1, perPage = 20) {
    const products = this._getFromStorage('products');

    let filtered = products.filter(p => {
      if (listingCategoryId === 'gps_computers') {
        if (!(p.category === 'gps_computer' || p.default_listing_category_id === 'gps_computers')) {
          return false;
        }
      }
      // 'all_gear' includes everything
      return true;
    });

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    if (filters.helmet_style) {
      filtered = filtered.filter(p => p.helmet_style === filters.helmet_style);
    }
    if (filters.light_type) {
      filtered = filtered.filter(p => p.light_type === filters.light_type);
    }
    if (filters.power_source) {
      filtered = filtered.filter(p => p.power_source === filters.power_source);
    }
    if (filters.tire_type) {
      filtered = filtered.filter(p => p.tire_type === filters.tire_type);
    }
    if (filters.tire_usage) {
      filtered = filtered.filter(p => p.tire_usage === filters.tire_usage);
    }
    if (typeof filters.price_min === 'number') {
      filtered = filtered.filter(p => typeof p.price === 'number' && p.price >= filters.price_min);
    }
    if (typeof filters.price_max === 'number') {
      filtered = filtered.filter(p => typeof p.price === 'number' && p.price <= filters.price_max);
    }
    if (typeof filters.rating_min === 'number') {
      filtered = filtered.filter(p => (p.average_rating || 0) >= filters.rating_min);
    }
    if (typeof filters.rating_max === 'number') {
      filtered = filtered.filter(p => (p.average_rating || 0) <= filters.rating_max);
    }
    if (typeof filters.wet_grip_min === 'number') {
      filtered = filtered.filter(p => (p.wet_grip_rating || 0) >= filters.wet_grip_min);
    }
    if (filters.puncture_protection_min) {
      const minRank = this._punctureProtectionRank(filters.puncture_protection_min);
      filtered = filtered.filter(p => this._punctureProtectionRank(p.puncture_protection_level) >= minRank);
    }
    if (filters.search_term) {
      const q = String(filters.search_term).toLowerCase();
      filtered = filtered.filter(p => {
        const haystack = [p.name, p.description, p.brand].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      });
    }

    // Sorting
    if (sort === 'price_asc') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rating_desc') {
      filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sort === 'puncture_protection_desc') {
      filtered.sort((a, b) => this._punctureProtectionRank(b.puncture_protection_level) - this._punctureProtectionRank(a.puncture_protection_level));
    } else if (sort === 'battery_life_desc') {
      filtered.sort((a, b) => (b.battery_life_hours || 0) - (a.battery_life_hours || 0));
    }

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageProducts = filtered.slice(start, end);

    // Compare list count for this category
    let compareListCount = 0;
    if (filters.category) {
      const compareLists = this._getFromStorage('compare_lists');
      const list = compareLists.find(l => l.context_category === filters.category);
      if (list) {
        const items = this._getFromStorage('compare_list_items');
        compareListCount = items.filter(ci => ci.compare_list_id === list.id).length;
      }
    }

    const appliedFilters = {
      category: filters.category || undefined,
      helmet_style: filters.helmet_style || undefined,
      light_type: filters.light_type || undefined,
      power_source: filters.power_source || undefined,
      tire_type: filters.tire_type || undefined,
      tire_usage: filters.tire_usage || undefined,
      price_min: filters.price_min,
      price_max: filters.price_max,
      rating_min: filters.rating_min,
      wet_grip_min: filters.wet_grip_min,
      puncture_protection_min: filters.puncture_protection_min,
      search_term: filters.search_term || undefined
    };

    return {
      listing_category_id: listingCategoryId,
      page,
      per_page: perPage,
      total,
      applied_filters: appliedFilters,
      sort,
      products: pageProducts,
      compare_list_count: compareListCount
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;

    if (!product) {
      return {
        product: null,
        is_in_wishlist: false,
        is_in_compare_list: false,
        has_active_discount_code: false,
        discount_code_preview: null,
        related_products: [],
        related_articles: []
      };
    }

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const isInWishlist = wishlistItems.some(wi => wi.wishlist_id === wishlist.id && wi.product_id === productId);

    const compareItems = this._getFromStorage('compare_list_items');
    const isInCompare = compareItems.some(ci => ci.product_id === productId);

    const discountCodes = this._getFromStorage('discount_codes');
    const now = new Date();
    const activeCode = discountCodes.find(dc => {
      if (dc.product_id !== productId || !dc.is_active) return false;
      if (!dc.expires_at) return true;
      return new Date(dc.expires_at) > now;
    }) || null;

    let preview = null;
    if (activeCode) {
      preview = activeCode.description || 'Discount available with promo code.';
    }

    // Related products: same category
    const relatedProducts = products
      .filter(p => p.id !== productId && p.category === product.category)
      .slice(0, 8);

    // Related articles: where this product is featured
    const articles = this._getFromStorage('articles');
    const relatedArticles = articles.filter(a => Array.isArray(a.featured_product_ids) && a.featured_product_ids.includes(productId));

    return {
      product,
      is_in_wishlist: isInWishlist,
      is_in_compare_list: isInCompare,
      has_active_discount_code: !!activeCode,
      discount_code_preview: preview,
      related_products: relatedProducts,
      related_articles: relatedArticles
    };
  }

  getProductDiscountCode(productId) {
    const discountCodes = this._getFromStorage('discount_codes');
    const now = new Date();
    const active = discountCodes.find(dc => {
      if (dc.product_id !== productId || !dc.is_active) return false;
      if (!dc.expires_at) return true;
      return new Date(dc.expires_at) > now;
    }) || null;

    if (!active) {
      return {
        has_active_code: false,
        code: null,
        description: null,
        discount_type: null,
        discount_value: null,
        expires_at: null
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task3_discountCodeProductId', String(productId));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      has_active_code: true,
      code: active.code,
      description: active.description || null,
      discount_type: active.discount_type,
      discount_value: active.discount_value || null,
      expires_at: active.expires_at || null
    };
  }

  // ---------- Cart ----------

  // Legacy-style method from template, mapped to new interface
  addToCart(userId, productId, quantity = 1) {
    return this.addProductToCart(productId, quantity);
  }

  addProductToCart(productId, quantity = 1, selectedOptions = {}) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        cart_id: null,
        cart_item_count: 0,
        cart_subtotal: 0
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const selectedColor = selectedOptions.selected_color || product.default_color || null;
    const selectedSize = selectedOptions.selected_size || product.default_size || null;

    let existing = cartItems.find(ci =>
      ci.cart_id === cart.id &&
      ci.product_id === productId &&
      ci.selected_color === selectedColor &&
      ci.selected_size === selectedSize
    );

    if (existing) {
      existing.quantity += quantity;
      existing.line_total = existing.unit_price * existing.quantity;
    } else {
      existing = {
        id: this._generateId('ci'),
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity,
        selected_color: selectedColor,
        selected_size: selectedSize,
        unit_price: product.price,
        line_total: product.price * quantity,
        added_at: this._now()
      };
      cartItems.push(existing);
    }

    cart.updated_at = this._now();

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      message: 'Added to cart',
      cart_id: cart.id,
      cart_item_count: totals.item_count,
      cart_subtotal: totals.subtotal
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        return {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: product ? product.name : null,
          product_slug: product ? product.slug : null,
          category_name: product ? this._humanReadableProductCategory(product.category) : null,
          image_url: product ? product.image_url : null,
          selected_color: ci.selected_color || null,
          selected_size: ci.selected_size || null,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total,
          product: product
        };
      });

    const totals = this._calculateCartTotals(cart.id);

    return {
      cart_id: cart.id,
      items,
      item_count: totals.item_count,
      subtotal: totals.subtotal,
      estimated_total: totals.estimated_total
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null
      };
    }

    const item = cartItems[idx];
    const cartId = item.cart_id;

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      item.quantity = quantity;
      item.line_total = item.unit_price * quantity;
      cartItems[idx] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    const cart = this._getFromStorage('carts').find(c => c.id === cartId) || this._getOrCreateCart();
    cart.updated_at = this._now();
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cartId);

    const products = this._getFromStorage('products');
    const cartItemsForCart = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cartId);

    const items = cartItemsForCart.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: product ? product.name : null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        product: product
      };
    });

    return {
      success: true,
      message: 'Cart updated',
      cart: {
        cart_id: cartId,
        items,
        item_count: totals.item_count,
        subtotal: totals.subtotal,
        estimated_total: totals.estimated_total
      }
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId) || null;
    if (!item) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null
      };
    }

    const cartId = item.cart_id;
    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getFromStorage('carts').find(c => c.id === cartId) || this._getOrCreateCart();
    cart.updated_at = this._now();
    this._saveCart(cart);

    const totals = this._calculateCartTotals(cartId);
    const products = this._getFromStorage('products');
    const cartItemsForCart = this._getFromStorage('cart_items').filter(ci => ci.cart_id === cartId);

    const items = cartItemsForCart.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: product ? product.name : null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        product: product
      };
    });

    return {
      success: true,
      message: 'Item removed from cart',
      cart: {
        cart_id: cartId,
        items,
        item_count: totals.item_count,
        subtotal: totals.subtotal,
        estimated_total: totals.estimated_total
      }
    };
  }

  // ---------- Wishlist ----------

  getWishlistItems() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(wi => wi.wishlist_id === wishlist.id);
    const products = this._getFromStorage('products');
    const discountCodes = this._getFromStorage('discount_codes');
    const now = new Date();

    const items = wishlistItems.map(wi => {
      const product = products.find(p => p.id === wi.product_id) || null;
      const hasDiscount = !!discountCodes.find(dc => {
        if (dc.product_id !== wi.product_id || !dc.is_active) return false;
        if (!dc.expires_at) return true;
        return new Date(dc.expires_at) > now;
      });
      return {
        wishlist_item_id: wi.id,
        product_id: wi.product_id,
        product_name: product ? product.name : null,
        product_slug: product ? product.slug : null,
        category_name: product ? this._humanReadableProductCategory(product.category) : null,
        image_url: product ? product.image_url : null,
        price: product ? product.price : null,
        currency: product ? product.currency : null,
        average_rating: product ? product.average_rating : null,
        rating_count: product ? product.rating_count : null,
        has_discount_code: hasDiscount,
        product: product
      };
    });

    return {
      items,
      item_count: items.length
    };
  }

  addProductToWishlist(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        wishlist_item_count: this._getFromStorage('wishlist_items').length
      };
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');

    const existing = wishlistItems.find(wi => wi.wishlist_id === wishlist.id && wi.product_id === productId);
    if (existing) {
      return {
        success: true,
        message: 'Product already in wishlist',
        wishlist_item_count: wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length
      };
    }

    const item = {
      id: this._generateId('wli'),
      wishlist_id: wishlist.id,
      product_id: productId,
      added_at: this._now()
    };
    wishlistItems.push(item);
    this._saveToStorage('wishlist_items', wishlistItems);

    return {
      success: true,
      message: 'Product added to wishlist',
      wishlist_item_count: wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length
    };
  }

  removeProductFromWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');

    const before = wishlistItems.length;
    wishlistItems = wishlistItems.filter(wi => !(wi.wishlist_id === wishlist.id && wi.product_id === productId));
    this._saveToStorage('wishlist_items', wishlistItems);
    const afterCount = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length;

    return {
      success: true,
      message: before === wishlistItems.length ? 'Product was not in wishlist' : 'Product removed from wishlist',
      wishlist_item_count: afterCount
    };
  }

  moveWishlistItemToCart(productId, quantity = 1, selectedOptions = {}) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');
    const existing = wishlistItems.find(wi => wi.wishlist_id === wishlist.id && wi.product_id === productId) || null;

    const addResult = this.addProductToCart(productId, quantity, selectedOptions);
    if (!addResult.success) {
      return {
        success: false,
        message: addResult.message,
        wishlist_item_count: wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length,
        cart_item_count: addResult.cart_item_count,
        cart_subtotal: addResult.cart_subtotal
      };
    }

    if (existing) {
      wishlistItems = wishlistItems.filter(wi => wi.id !== existing.id);
      this._saveToStorage('wishlist_items', wishlistItems);
    }

    const wlCount = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length;

    return {
      success: true,
      message: existing ? 'Moved from wishlist to cart' : 'Added to cart',
      wishlist_item_count: wlCount,
      cart_item_count: addResult.cart_item_count,
      cart_subtotal: addResult.cart_subtotal
    };
  }

  // ---------- Compare list ----------

  addProductToCompareList(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        compare_list_id: null,
        context_category: null,
        max_items: 0,
        current_item_count: 0
      };
    }

    const contextCategory = product.category || 'other';
    const list = this._getOrCreateCompareList(contextCategory);
    let items = this._getFromStorage('compare_list_items');
    const listItems = items.filter(ci => ci.compare_list_id === list.id);

    if (listItems.some(ci => ci.product_id === productId)) {
      return {
        success: true,
        message: 'Product already in compare list',
        compare_list_id: list.id,
        context_category: list.context_category,
        max_items: list.max_items,
        current_item_count: listItems.length
      };
    }

    if (listItems.length >= list.max_items) {
      return {
        success: false,
        message: 'Compare list is full',
        compare_list_id: list.id,
        context_category: list.context_category,
        max_items: list.max_items,
        current_item_count: listItems.length
      };
    }

    const newItem = {
      id: this._generateId('cmpi'),
      compare_list_id: list.id,
      product_id: productId,
      added_at: this._now()
    };

    items.push(newItem);
    this._saveToStorage('compare_list_items', items);

    list.updated_at = this._now();
    this._saveCart(list); // reuse save but for compare_lists? Better explicit:
    let lists = this._getFromStorage('compare_lists');
    const idx = lists.findIndex(l => l.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('compare_lists', lists);

    const updatedItems = items.filter(ci => ci.compare_list_id === list.id);

    return {
      success: true,
      message: 'Product added to compare list',
      compare_list_id: list.id,
      context_category: list.context_category,
      max_items: list.max_items,
      current_item_count: updatedItems.length
    };
  }

  getCompareList(contextCategory) {
    const lists = this._getFromStorage('compare_lists');
    let list = null;

    if (contextCategory) {
      list = lists.find(l => l.context_category === contextCategory) || null;
    } else if (lists.length) {
      lists.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
      list = lists[0];
    }

    if (!list) {
      return {
        compare_list_id: null,
        context_category: contextCategory || null,
        max_items: 3,
        items: [],
        comparable_attributes: []
      };
    }

    const itemsRaw = this._getFromStorage('compare_list_items').filter(ci => ci.compare_list_id === list.id);
    const products = this._getFromStorage('products');

    const items = itemsRaw.map(ci => ({
      product: products.find(p => p.id === ci.product_id) || null,
      added_at: ci.added_at
    }));

    // Build comparable attributes based on category
    const attrs = [];
    attrs.push({ key: 'price', label: 'Price', unit: 'USD', value_type: 'number' });
    attrs.push({ key: 'average_rating', label: 'Rating', unit: 'stars', value_type: 'rating' });

    if (list.context_category === 'gps_computer') {
      attrs.push({ key: 'battery_life_hours', label: 'Battery life (hours)', unit: 'hours', value_type: 'number' });
    }
    if (list.context_category === 'tire') {
      attrs.push({ key: 'wet_grip_rating', label: 'Wet grip', unit: 'rating', value_type: 'number' });
      attrs.push({ key: 'puncture_protection_level', label: 'Puncture protection', unit: null, value_type: 'string' });
    }

    return {
      compare_list_id: list.id,
      context_category: list.context_category,
      max_items: list.max_items,
      items,
      comparable_attributes: attrs
    };
  }

  removeProductFromCompareList(productId, contextCategory) {
    const lists = this._getFromStorage('compare_lists');
    const items = this._getFromStorage('compare_list_items');

    let list = null;
    if (contextCategory) {
      list = lists.find(l => l.context_category === contextCategory) || null;
    } else {
      const item = items.find(ci => ci.product_id === productId) || null;
      if (item) {
        list = lists.find(l => l.id === item.compare_list_id) || null;
      }
    }

    if (!list) {
      return {
        success: false,
        message: 'Compare list not found',
        current_item_count: 0
      };
    }

    const remainingItems = items.filter(ci => !(ci.compare_list_id === list.id && ci.product_id === productId));
    this._saveToStorage('compare_list_items', remainingItems);

    const count = remainingItems.filter(ci => ci.compare_list_id === list.id).length;

    return {
      success: true,
      message: 'Product removed from compare list',
      current_item_count: count
    };
  }

  clearCompareList(contextCategory) {
    let lists = this._getFromStorage('compare_lists');
    let list = null;

    if (contextCategory) {
      list = lists.find(l => l.context_category === contextCategory) || null;
    } else if (lists.length) {
      lists.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
      list = lists[0];
    }

    if (!list) {
      return {
        success: false,
        message: 'Compare list not found'
      };
    }

    const items = this._getFromStorage('compare_list_items');
    const remaining = items.filter(ci => ci.compare_list_id !== list.id);
    this._saveToStorage('compare_list_items', remaining);

    return {
      success: true,
      message: 'Compare list cleared'
    };
  }

  // ---------- Articles & filters ----------

  getArticleFilterOptions(categoryId) {
    const disciplines = ['road', 'mountain_bike', 'gravel', 'cyclocross', 'indoor'];
    const experienceLevels = ['beginner', 'intermediate', 'advanced'];
    const formats = ['training_plan', 'maintenance_tutorial', 'step_by_step_guide', 'review', 'buyer_guide', 'news', 'opinion'];
    const topics = ['brakes', 'drivetrain', 'wheels', 'contact_points', 'bike_fit', 'other'];
    const subtopics = ['disc_brakes', 'rim_brakes', 'hydraulic_disc_brakes', 'mechanical_disc_brakes', 'saddles', 'other'];

    const dateRanges = [
      { key: 'any_time', label: 'Any time' },
      { key: 'last_7_days', label: 'Last 7 days' },
      { key: 'last_30_days', label: 'Last 30 days' },
      { key: 'last_6_months', label: 'Last 6 months' },
      { key: 'last_12_months', label: 'Last 12 months' }
    ];

    const sortOptions = [
      { key: 'newest', label: 'Newest' },
      { key: 'oldest', label: 'Oldest' }
    ];

    return {
      disciplines,
      experience_levels: experienceLevels,
      formats,
      topics,
      subtopics,
      date_ranges: dateRanges,
      sort_options: sortOptions
    };
  }

  listArticles(categoryId, filters = {}, searchTerm = '', sort = 'newest', page = 1, perPage = 20) {
    const articles = this._getFromStorage('articles');

    let filtered = articles.filter(a => a.category_id === categoryId);

    if (filters.discipline) {
      filtered = filtered.filter(a => a.discipline === filters.discipline);
    }
    if (filters.experience_level) {
      filtered = filtered.filter(a => a.experience_level === filters.experience_level);
    }
    if (filters.format) {
      filtered = filtered.filter(a => a.format === filters.format);
    }
    if (filters.topic) {
      filtered = filtered.filter(a => a.topic === filters.topic);
    }
    if (filters.subtopic) {
      filtered = filtered.filter(a => a.subtopic === filters.subtopic);
    }
    if (typeof filters.is_featured === 'boolean') {
      filtered = filtered.filter(a => !!a.is_featured === filters.is_featured);
    }
    if (filters.date_range_key && filters.date_range_key !== 'any_time') {
      const now = new Date();
      let days = 0;
      if (filters.date_range_key === 'last_7_days') days = 7;
      else if (filters.date_range_key === 'last_30_days') days = 30;
      else if (filters.date_range_key === 'last_6_months') days = 182;
      else if (filters.date_range_key === 'last_12_months') days = 365;
      if (days > 0) {
        const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(a => new Date(a.published_at) >= threshold);
      }
    }

    if (searchTerm) {
      const q = String(searchTerm).toLowerCase();
      filtered = filtered.filter(a => {
        const haystack = [a.title, a.subtitle, a.excerpt, a.content].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      });
    }

    if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    } else if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
    }

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const pageArticles = filtered.slice(start, end);

    const appliedFilters = {
      discipline: filters.discipline || undefined,
      experience_level: filters.experience_level || undefined,
      format: filters.format || undefined,
      topic: filters.topic || undefined,
      subtopic: filters.subtopic || undefined,
      date_range_key: filters.date_range_key || undefined
    };

    return {
      category_id: categoryId,
      page,
      per_page: perPage,
      total,
      applied_filters: appliedFilters,
      sort,
      articles: pageArticles
    };
  }

  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;

    if (!article) {
      return {
        article: null,
        related_products: [],
        has_size_guide: false,
        size_guide_summary: null,
        is_saved_to_reading_list: false,
        reading_list_item_tags: []
      };
    }

    const products = this._getFromStorage('products');
    const relatedProducts = Array.isArray(article.featured_product_ids)
      ? products.filter(p => article.featured_product_ids.includes(p.id))
      : [];

    const sizeGuides = this._getFromStorage('size_guides');
    let sizeGuide = null;
    if (article.size_guide_id) {
      sizeGuide = sizeGuides.find(sg => sg.id === article.size_guide_id) || null;
    }
    if (!sizeGuide) {
      sizeGuide = sizeGuides.find(sg => sg.article_id === articleId) || null;
    }

    const hasSizeGuide = !!sizeGuide;
    const sizeGuideSummary = sizeGuide
      ? { size_guide_id: sizeGuide.id, body_part: sizeGuide.body_part, unit: sizeGuide.unit }
      : null;

    const readingList = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items');
    const rli = readingListItems.find(ri => ri.reading_list_id === readingList.id && ri.article_id === articleId) || null;

    return {
      article,
      related_products: relatedProducts,
      has_size_guide: hasSizeGuide,
      size_guide_summary: sizeGuideSummary,
      is_saved_to_reading_list: !!rli,
      reading_list_item_tags: rli && Array.isArray(rli.tags) ? rli.tags : []
    };
  }

  getSizeGuideForArticle(articleId) {
    const sizeGuides = this._getFromStorage('size_guides');
    const sizeGuide = sizeGuides.find(sg => sg.article_id === articleId) || null;
    const sizeGuideRows = this._getFromStorage('size_guide_rows');
    const articles = this._getFromStorage('articles');
    const products = this._getFromStorage('products');

    if (!sizeGuide) {
      return {
        size_guide: null,
        rows: [],
        linked_product: null
      };
    }

    const article = articles.find(a => a.id === sizeGuide.article_id) || null;
    const product = sizeGuide.product_id ? (products.find(p => p.id === sizeGuide.product_id) || null) : null;

    const rowsRaw = sizeGuideRows.filter(r => r.size_guide_id === sizeGuide.id);
    rowsRaw.sort((a, b) => (a.palm_circumference_min || 0) - (b.palm_circumference_min || 0));

    const rows = rowsRaw.map(r => ({
      ...r,
      size_guide: sizeGuide
    }));

    const linkedProduct = product ? { product_id: product.id, product_name: product.name } : null;

    const sizeGuideResolved = {
      ...sizeGuide,
      article: article,
      product: product
    };

    return {
      size_guide: sizeGuideResolved,
      rows,
      linked_product: linkedProduct
    };
  }

  getArticleFeaturedProducts(articleId, filters = {}, sort = 'relevance') {
    const articles = this._getFromStorage('articles');
    const products = this._getFromStorage('products');

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        article_id: articleId,
        total: 0,
        products: []
      };
    }

    let featured = Array.isArray(article.featured_product_ids)
      ? products.filter(p => article.featured_product_ids.includes(p.id))
      : [];

    if (filters.category) {
      featured = featured.filter(p => p.category === filters.category);
    }
    if (filters.tire_type) {
      featured = featured.filter(p => p.tire_type === filters.tire_type);
    }
    if (filters.tire_usage) {
      featured = featured.filter(p => p.tire_usage === filters.tire_usage);
    }
    if (typeof filters.price_min === 'number') {
      featured = featured.filter(p => typeof p.price === 'number' && p.price >= filters.price_min);
    }
    if (typeof filters.price_max === 'number') {
      featured = featured.filter(p => typeof p.price === 'number' && p.price <= filters.price_max);
    }
    if (typeof filters.rating_min === 'number') {
      featured = featured.filter(p => (p.average_rating || 0) >= filters.rating_min);
    }
    if (typeof filters.wet_grip_min === 'number') {
      featured = featured.filter(p => (p.wet_grip_rating || 0) >= filters.wet_grip_min);
    }
    if (filters.puncture_protection_min) {
      const minRank = this._punctureProtectionRank(filters.puncture_protection_min);
      featured = featured.filter(p => this._punctureProtectionRank(p.puncture_protection_level) >= minRank);
    }

    if (sort === 'price_asc') {
      featured.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_desc') {
      featured.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rating_desc') {
      featured.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sort === 'puncture_protection_desc') {
      featured.sort((a, b) => this._punctureProtectionRank(b.puncture_protection_level) - this._punctureProtectionRank(a.puncture_protection_level));
    }

    return {
      article_id: articleId,
      total: featured.length,
      products: featured
    };
  }

  // ---------- Comments ----------

  getArticleComments(articleId, sort = 'newest') {
    const commentsAll = this._getFromStorage('comments');
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;

    const comments = commentsAll.filter(c => c.article_id === articleId);
    const roots = comments.filter(c => !c.parent_comment_id);
    const replies = comments.filter(c => !!c.parent_comment_id);

    roots.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === 'oldest' ? da - db : db - da;
    });

    const result = roots.map(root => {
      const childReplies = replies
        .filter(r => r.parent_comment_id === root.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const mappedReplies = childReplies.map(r => ({
        id: r.id,
        parent_comment_id: r.parent_comment_id,
        author_display_name: r.author_display_name,
        content: r.content,
        created_at: r.created_at,
        article: article
      }));

      return {
        id: root.id,
        parent_comment_id: root.parent_comment_id,
        author_display_name: root.author_display_name,
        content: root.content,
        created_at: root.created_at,
        article: article,
        replies: mappedReplies
      };
    });

    return {
      article_id: articleId,
      comments: result
    };
  }

  addCommentToArticle(articleId, content, parentCommentId = null, authorDisplayName = 'Guest') {
    if (!content || !String(content).trim()) {
      return {
        success: false,
        message: 'Comment content is required',
        comment: null
      };
    }

    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        success: false,
        message: 'Article not found',
        comment: null
      };
    }

    const comments = this._getFromStorage('comments');
    const comment = {
      id: this._generateId('cmt'),
      article_id: articleId,
      parent_comment_id: parentCommentId || null,
      author_display_name: authorDisplayName || 'Guest',
      content: content,
      created_at: this._now()
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      message: 'Comment added',
      comment
    };
  }

  // ---------- Reading list ----------

  saveArticleToReadingList(articleId, tags = [], notes = '') {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        success: false,
        message: 'Article not found',
        reading_list_item_id: null,
        tags: []
      };
    }

    const readingList = this._getOrCreateReadingList();
    let items = this._getFromStorage('reading_list_items');

    let existing = items.find(ri => ri.reading_list_id === readingList.id && ri.article_id === articleId) || null;
    if (existing) {
      if (Array.isArray(tags) && tags.length) {
        existing.tags = tags;
      }
      if (typeof notes === 'string' && notes.length) {
        existing.notes = notes;
      }
      items = items.map(ri => (ri.id === existing.id ? existing : ri));
      this._saveToStorage('reading_list_items', items);
      return {
        success: true,
        message: 'Article already in reading list; updated tags/notes',
        reading_list_item_id: existing.id,
        tags: existing.tags || []
      };
    }

    const item = {
      id: this._generateId('rli'),
      reading_list_id: readingList.id,
      article_id: articleId,
      added_at: this._now(),
      tags: Array.isArray(tags) ? tags : [],
      notes: typeof notes === 'string' ? notes : ''
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      message: 'Article saved to reading list',
      reading_list_item_id: item.id,
      tags: item.tags
    };
  }

  getReadingListItems(filters = {}, sort = 'added_newest') {
    const readingList = this._getOrCreateReadingList();
    const itemsRaw = this._getFromStorage('reading_list_items').filter(ri => ri.reading_list_id === readingList.id);
    const articles = this._getFromStorage('articles');

    let items = itemsRaw.map(ri => {
      const article = articles.find(a => a.id === ri.article_id) || null;
      return {
        reading_list_item_id: ri.id,
        article_id: ri.article_id,
        title: article ? article.title : null,
        category_name: article ? this._humanReadableArticleCategory(article.category_id) : null,
        format: article ? article.format : null,
        tags: ri.tags || [],
        notes: ri.notes || '',
        added_at: ri.added_at,
        article: article
      };
    });

    if (filters.tag) {
      const tag = String(filters.tag).toLowerCase();
      items = items.filter(i => (i.tags || []).some(t => String(t).toLowerCase() === tag));
    }

    if (filters.content_type) {
      items = items.filter(i => i.format === filters.content_type);
    }

    if (sort === 'added_oldest') {
      items.sort((a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime());
    } else {
      items.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
    }

    return {
      items,
      total: items.length
    };
  }

  updateReadingListItemTags(readingListItemId, tags, notes) {
    let items = this._getFromStorage('reading_list_items');
    const idx = items.findIndex(ri => ri.id === readingListItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Reading list item not found',
        item: null
      };
    }

    const item = items[idx];
    if (tags !== undefined) {
      item.tags = Array.isArray(tags) ? tags : [];
    }
    if (notes !== undefined) {
      item.notes = typeof notes === 'string' ? notes : '';
    }

    items[idx] = item;
    this._saveToStorage('reading_list_items', items);

    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === item.article_id) || null;

    const responseItem = {
      reading_list_item_id: item.id,
      article_id: item.article_id,
      title: article ? article.title : null,
      tags: item.tags || [],
      notes: item.notes || '',
      added_at: item.added_at,
      article: article
    };

    return {
      success: true,
      message: 'Reading list item updated',
      item: responseItem
    };
  }

  removeReadingListItem(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter(ri => ri.id !== readingListItemId);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      message: before === items.length ? 'Reading list item not found' : 'Reading list item removed'
    };
  }

  // ---------- Newsletter ----------

  subscribeToNewsletter(
    name,
    email,
    wants_bike_maintenance_tips = false,
    wants_training_plans = false,
    wants_product_reviews = false,
    wants_road_cycling = false,
    wants_mountain_biking = false,
    frequency
  ) {
    if (!name || !email) {
      return {
        success: false,
        message: 'Name and email are required',
        subscription_id: null
      };
    }
    if (!frequency || !['daily', 'weekly', 'monthly'].includes(frequency)) {
      return {
        success: false,
        message: 'Invalid frequency',
        subscription_id: null
      };
    }

    let subs = this._getFromStorage('newsletter_subscriptions');
    let existing = subs.find(s => s.email === email) || null;

    if (existing) {
      existing.name = name;
      existing.wants_bike_maintenance_tips = !!wants_bike_maintenance_tips;
      existing.wants_training_plans = !!wants_training_plans;
      existing.wants_product_reviews = !!wants_product_reviews;
      existing.wants_road_cycling = !!wants_road_cycling;
      existing.wants_mountain_biking = !!wants_mountain_biking;
      existing.frequency = frequency;
      subs = subs.map(s => (s.id === existing.id ? existing : s));
      this._saveToStorage('newsletter_subscriptions', subs);
      return {
        success: true,
        message: 'Newsletter subscription updated',
        subscription_id: existing.id
      };
    }

    const sub = {
      id: this._generateId('sub'),
      name,
      email,
      wants_bike_maintenance_tips: !!wants_bike_maintenance_tips,
      wants_training_plans: !!wants_training_plans,
      wants_product_reviews: !!wants_product_reviews,
      wants_road_cycling: !!wants_road_cycling,
      wants_mountain_biking: !!wants_mountain_biking,
      frequency,
      created_at: this._now()
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      message: 'Subscribed to newsletter',
      subscription_id: sub.id
    };
  }

  getNewsletterPreferencesOptions() {
    const contentPreferences = [
      { key: 'bike_maintenance_tips', label: 'Bike maintenance tips', description: 'How-to guides and maintenance checklists.' },
      { key: 'training_plans', label: 'Training plans', description: 'Structured cycling training plans.' },
      { key: 'product_reviews', label: 'Product reviews', description: 'In-depth gear reviews and buyer guides.' }
    ];

    const interestOptions = [
      { key: 'road_cycling', label: 'Road cycling' },
      { key: 'mountain_biking', label: 'Mountain biking' }
    ];

    const frequencyOptions = [
      { key: 'daily', label: 'Daily' },
      { key: 'weekly', label: 'Weekly' },
      { key: 'monthly', label: 'Monthly' }
    ];

    return {
      content_preferences: contentPreferences,
      interest_options: interestOptions,
      frequency_options: frequencyOptions
    };
  }

  // ---------- Static pages & contact ----------

  getAboutPageContent() {
    return {
      title: 'About Our Cycling Tips & Product Review Blog',
      body: 'We provide practical cycling advice, training plans, maintenance tutorials, and unbiased gear reviews to help riders get the most from every ride.',
      last_updated: this._now()
    };
  }

  getContactPageContent() {
    return {
      contact_email: 'support@cyclingblog.local',
      contact_topics: [
        { key: 'content_question', label: 'Content question' },
        { key: 'product_feedback', label: 'Product feedback' },
        { key: 'site_issue', label: 'Site issue' }
      ],
      form_help_text: 'Use this form for questions about articles, gear feedback, or to report site problems.'
    };
  }

  submitContactMessage(name, email, topic, subject, message) {
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        message: 'Name, email, subject, and message are required',
        ticket_id: null
      };
    }

    let msgs = this._getFromStorage('contact_messages');
    const ticketId = this._generateId('ticket');
    const record = {
      id: ticketId,
      name,
      email,
      topic: topic || null,
      subject,
      message,
      created_at: this._now()
    };

    msgs.push(record);
    this._saveToStorage('contact_messages', msgs);

    return {
      success: true,
      message: 'Message submitted',
      ticket_id: ticketId
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