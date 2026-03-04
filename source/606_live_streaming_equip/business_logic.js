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
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    const tableKeys = [
      'users',
      'product_categories',
      'products',
      'guide_categories',
      'guides',
      'guide_recommended_products',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'reading_lists',
      'reading_list_items',
      'kits',
      'kit_items',
      'comparison_sets',
      'quiz_runs',
      'product_questions',
      'contact_messages'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // About page content stored as a single object, not an array
    if (!localStorage.getItem('about_page_content')) {
      const aboutDefault = {
        title: 'About Stream Gear Guides',
        body: 'We help streamers choose and compare live streaming equipment with hands on reviews and structured guides.',
        sections: [
          {
            heading: 'Our Mission',
            content: 'Our goal is to simplify livestream gear decisions with practical recommendations and transparent testing notes.'
          },
          {
            heading: 'How We Review',
            content: 'We focus on real world streaming scenarios including audio quality, low light performance, and ease of setup.'
          }
        ]
      };
      localStorage.setItem('about_page_content', JSON.stringify(aboutDefault));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  _nowISO() {
    return new Date().toISOString();
  }

  _resolutionRank(res) {
    const map = {
      '720p': 1,
      '1080p': 2,
      '1440p': 3,
      '4k': 4,
      other: 0
    };
    return map[res] != null ? map[res] : 0;
  }

  _getRelevantCategoryKeys(categoryKey) {
    const categories = this._getFromStorage('product_categories');
    const relevant = new Set();
    relevant.add(categoryKey);
    categories.forEach((cat) => {
      if (cat.parent_key === categoryKey) {
        relevant.add(cat.key);
      }
    });
    return Array.from(relevant);
  }

  _filterProductsByCategoryAndFilters(categoryKey, filters) {
    const products = this._getFromStorage('products');
    const relevantKeys = this._getRelevantCategoryKeys(categoryKey);
    const f = filters || {};

    return products.filter((p) => {
      if (p.status && p.status !== 'active') return false;
      if (!relevantKeys.includes(p.category_key)) return false;

      if (typeof f.minPrice === 'number' && p.price < f.minPrice) return false;
      if (typeof f.maxPrice === 'number' && p.price > f.maxPrice) return false;

      if (typeof f.minRating === 'number') {
        const r = typeof p.rating_average === 'number' ? p.rating_average : 0;
        if (r < f.minRating) return false;
      }

      if (f.tags && Array.isArray(f.tags) && f.tags.length > 0) {
        const tags = Array.isArray(p.tags) ? p.tags : [];
        const hasTag = f.tags.some((t) => tags.includes(t));
        if (!hasTag) return false;
      }

      if (typeof f.isBeginnerRecommended === 'boolean' && f.isBeginnerRecommended) {
        if (!p.is_beginner_recommended) return false;
      }

      if (typeof f.maxResolution === 'string') {
        if (!p.max_resolution) return false;
        if (this._resolutionRank(p.max_resolution) < this._resolutionRank(f.maxResolution)) {
          return false;
        }
      }

      if (typeof f.frameRate === 'number') {
        const fr = typeof p.max_frame_rate === 'number' ? p.max_frame_rate : 0;
        if (fr < f.frameRate) return false;
      }

      if (typeof f.isOnSale === 'boolean' && f.isOnSale) {
        if (!p.is_on_sale) return false;
      }

      if (typeof f.minDiscountPercent === 'number') {
        const d = typeof p.discount_percent === 'number' ? p.discount_percent : 0;
        if (d < f.minDiscountPercent) return false;
      }

      return true;
    });
  }

  _sortProducts(products, sortBy) {
    const arr = products.slice();
    switch (sortBy) {
      case 'price_low_to_high':
        arr.sort((a, b) => a.price - b.price);
        break;
      case 'price_high_to_low':
        arr.sort((a, b) => b.price - a.price);
        break;
      case 'rating_high_to_low':
        arr.sort((a, b) => {
          const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
          const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
          if (rb !== ra) return rb - ra;
          const ca = typeof a.review_count === 'number' ? a.review_count : 0;
          const cb = typeof b.review_count === 'number' ? b.review_count : 0;
          return cb - ca;
        });
        break;
      case 'discount_high_to_low':
        arr.sort((a, b) => {
          const da = typeof a.discount_percent === 'number' ? a.discount_percent : 0;
          const db = typeof b.discount_percent === 'number' ? b.discount_percent : 0;
          return db - da;
        });
        break;
      case 'relevance':
      default:
        arr.sort((a, b) => {
          const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
          const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
          if (rb !== ra) return rb - ra;
          const ca = typeof a.review_count === 'number' ? a.review_count : 0;
          const cb = typeof b.review_count === 'number' ? b.review_count : 0;
          return cb - ca;
        });
        break;
    }
    return arr;
  }

  _paginate(items, page, pageSize) {
    const totalItems = items.length;
    const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1;
    const currentPage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
    const start = (currentPage - 1) * pageSize;
    const pagedItems = items.slice(start, start + pageSize);
    return {
      items: pagedItems,
      pagination: {
        page: currentPage,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  // Helper: get or create single-user cart
  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage('wishlists');
    let wishlist = wishlists[0] || null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'My Wishlist',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _saveWishlist(wishlist) {
    const wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex((w) => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx] = wishlist;
    } else {
      wishlists.push(wishlist);
    }
    this._saveToStorage('wishlists', wishlists);
  }

  _getOrCreateReadingList() {
    const lists = this._getFromStorage('reading_lists');
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        name: 'My Reading List',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  _saveReadingList(list) {
    const lists = this._getFromStorage('reading_lists');
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('reading_lists', lists);
  }

  _getOrCreateComparisonSet(comparisonType) {
    const sets = this._getFromStorage('comparison_sets');
    let set = sets.find((s) => s.comparison_type === comparisonType) || null;
    if (!set) {
      set = {
        id: this._generateId('comparison_set'),
        comparison_type: comparisonType,
        product_ids: [],
        created_at: this._nowISO()
      };
      sets.push(set);
      this._saveToStorage('comparison_sets', sets);
    }
    return set;
  }

  _saveComparisonSet(set) {
    const sets = this._getFromStorage('comparison_sets');
    const idx = sets.findIndex((s) => s.id === set.id);
    if (idx >= 0) {
      sets[idx] = set;
    } else {
      sets.push(set);
    }
    this._saveToStorage('comparison_sets', sets);
  }

  _getOrCreateActiveKitForBuilder() {
    const activeId = localStorage.getItem('active_kit_builder_id');
    const kits = this._getFromStorage('kits');
    if (activeId) {
      const existing = kits.find((k) => k.id === activeId && k.type === 'custom' && k.source === 'kit_builder');
      if (existing) return existing;
    }
    const kit = {
      id: this._generateId('kit'),
      name: 'My Custom Starter Kit',
      description: '',
      type: 'custom',
      source: 'kit_builder',
      target_budget: null,
      total_price: 0,
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };
    kits.push(kit);
    this._saveToStorage('kits', kits);
    localStorage.setItem('active_kit_builder_id', kit.id);
    return kit;
  }

  _recalculateKitTotalPrice(kitId) {
    const kits = this._getFromStorage('kits');
    const kitItems = this._getFromStorage('kit_items');
    const kit = kits.find((k) => k.id === kitId);
    if (!kit) return;
    const items = kitItems.filter((i) => i.kit_id === kitId);
    let total = 0;
    items.forEach((i) => {
      const qty = typeof i.quantity === 'number' ? i.quantity : 0;
      const price = typeof i.unit_price === 'number' ? i.unit_price : 0;
      total += qty * price;
    });
    kit.total_price = total;
    kit.updated_at = this._nowISO();
    const idx = kits.findIndex((k) => k.id === kitId);
    kits[idx] = kit;
    this._saveToStorage('kits', kits);
  }

  _getKitItemsWithProducts(kitId) {
    const kitItems = this._getFromStorage('kit_items');
    const products = this._getFromStorage('products');
    const items = kitItems.filter((i) => i.kit_id === kitId);
    return items.map((i) => {
      const product = products.find((p) => p.id === i.product_id) || null;
      const qty = typeof i.quantity === 'number' ? i.quantity : 0;
      const price = typeof i.unit_price === 'number' ? i.unit_price : (product ? product.price : 0);
      const subtotal = qty * price;
      return {
        kitItemId: i.id,
        slotType: i.slot_type,
        product,
        quantity: qty,
        subtotal
      };
    });
  }

  _getCartSummaryByCartId(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const items = cartItems.filter((ci) => ci.cart_id === cartId);
    let totalPrice = 0;
    let itemCount = 0;
    const mapped = items.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const qty = typeof ci.quantity === 'number' ? ci.quantity : 0;
      const price = typeof ci.unit_price === 'number' ? ci.unit_price : (product ? product.price : 0);
      const subtotal = qty * price;
      totalPrice += subtotal;
      itemCount += qty;
      return {
        cartItemId: ci.id,
        product,
        quantity: qty,
        unitPrice: price,
        subtotal
      };
    });
    return {
      cartId,
      items: mapped,
      totalPrice,
      itemCount
    };
  }

  _inferComparisonTypeFromProduct(product) {
    if (!product) return 'other';
    switch (product.category_key) {
      case 'webcams':
        return 'webcam';
      case 'capture_cards':
        return 'capture_card';
      case 'microphones':
        return 'microphone';
      default:
        return 'other';
    }
  }

  _createQuizRun(streamingPlatform, contentType, targetBudget, environment, kitId) {
    const quizRuns = this._getFromStorage('quiz_runs');
    const run = {
      id: this._generateId('quiz_run'),
      streaming_platform: streamingPlatform,
      content_type: contentType,
      target_budget: targetBudget,
      environment,
      recommended_kit_id: kitId,
      created_at: this._nowISO()
    };
    quizRuns.push(run);
    this._saveToStorage('quiz_runs', quizRuns);
    return run;
  }

  _buildQuizRecommendedKit(kit) {
    const products = this._getFromStorage('products');

    const pickCheapest = (categoryKey) => {
      const relevantKeys = this._getRelevantCategoryKeys(categoryKey);
      const candidates = products.filter((p) => {
        if (p.status && p.status !== 'active') return false;
        if (!relevantKeys.includes(p.category_key)) return false;
        const r = typeof p.rating_average === 'number' ? p.rating_average : 0;
        return r >= 4 || p.rating_average == null;
      });
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => a.price - b.price);
      return candidates[0];
    };

    const slots = [
      { slotType: 'microphone', categoryKey: 'microphones' },
      { slotType: 'webcam', categoryKey: 'webcams' },
      { slotType: 'lighting', categoryKey: 'ring_lights' },
      { slotType: 'support_mount', categoryKey: 'tripods' }
    ];

    const kitItems = this._getFromStorage('kit_items');

    slots.forEach((slot) => {
      const existing = kitItems.find((i) => i.kit_id === kit.id && i.slot_type === slot.slotType);
      if (existing) return;
      const product = pickCheapest(slot.categoryKey);
      if (!product) return;
      const item = {
        id: this._generateId('kit_item'),
        kit_id: kit.id,
        product_id: product.id,
        slot_type: slot.slotType,
        quantity: 1,
        unit_price: product.price,
        added_at: this._nowISO()
      };
      kitItems.push(item);
    });

    this._saveToStorage('kit_items', kitItems);
    this._recalculateKitTotalPrice(kit.id);
  }

  // Interface implementations

  // getHeaderSummary()
  getHeaderSummary() {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const wishlistItems = this._getFromStorage('wishlist_items');
    const readingListItems = this._getFromStorage('reading_list_items');

    const cart = carts[0] || null;
    let cartItemCount = 0;
    if (cart) {
      cartItems
        .filter((ci) => ci.cart_id === cart.id)
        .forEach((ci) => {
          cartItemCount += typeof ci.quantity === 'number' ? ci.quantity : 0;
        });
    }

    return {
      cartItemCount,
      wishlistItemCount: wishlistItems.length,
      readingListItemCount: readingListItems.length
    };
  }

  // getHeaderCategories()
  getHeaderCategories() {
    const categories = this._getFromStorage('product_categories');
    return categories.filter((c) => !!c.display_in_header);
  }

  // getHomePageHighlights(beginnerMicLimit, starterKitLimit, dealsLimit)
  getHomePageHighlights(beginnerMicLimit = 4, starterKitLimit = 3, dealsLimit = 4) {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');
    const kits = this._getFromStorage('kits');

    const featuredCategories = categories.filter((c) => !!c.display_in_header);

    const beginnerMics = products
      .filter((p) => {
        if (p.category_key !== 'microphones') return false;
        const tags = Array.isArray(p.tags) ? p.tags : [];
        const isBeginnerTag = tags.includes('beginner') || tags.includes('entry_level');
        const isBeginnerFlag = !!p.is_beginner_recommended;
        return isBeginnerTag || isBeginnerFlag;
      });

    const sortedMics = this._sortProducts(beginnerMics, 'rating_high_to_low').slice(0, beginnerMicLimit);

    const featuredStarterKits = kits
      .filter((k) => k.type === 'pre_made')
      .sort((a, b) => {
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return db - da;
      })
      .slice(0, starterKitLimit);

    const deals = products.filter((p) => !!p.is_on_sale);
    const topDeals = this._sortProducts(deals, 'discount_high_to_low').slice(0, dealsLimit);

    return {
      featuredCategories,
      popularBeginnerMicrophones: sortedMics,
      featuredStarterKits,
      topDeals
    };
  }

  // getCategoryFilterOptions(categoryKey)
  getCategoryFilterOptions(categoryKey) {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');
    const category = categories.find((c) => c.key === categoryKey) || null;
    const relevantKeys = this._getRelevantCategoryKeys(categoryKey);

    const relevantProducts = products.filter((p) => relevantKeys.includes(p.category_key));

    let minPrice = null;
    let maxPrice = null;
    const ratingSet = new Set();
    const tagSet = new Set();
    const resSet = new Set();
    const frSet = new Set();

    relevantProducts.forEach((p) => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.rating_average === 'number') {
        const bucket = Math.round(p.rating_average * 2) / 2;
        ratingSet.add(bucket);
      }
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagSet.add(t));
      }
      if (typeof p.max_resolution === 'string') {
        resSet.add(p.max_resolution);
      }
      if (typeof p.max_frame_rate === 'number') {
        frSet.add(p.max_frame_rate);
      }
    });

    const ratingThresholds = Array.from(ratingSet).sort((a, b) => b - a);
    const tagOptions = Array.from(tagSet).sort();
    const resolutionOptions = Array.from(resSet).sort((a, b) => this._resolutionRank(a) - this._resolutionRank(b));
    const frameRateOptions = Array.from(frSet).sort((a, b) => a - b);

    return {
      category,
      price: {
        min: minPrice,
        max: maxPrice
      },
      ratingThresholds,
      tagOptions,
      resolutionOptions,
      frameRateOptions
    };
  }

  // getCategoryProducts(categoryKey, filters, sortBy, page, pageSize)
  getCategoryProducts(categoryKey, filters = {}, sortBy = 'relevance', page = 1, pageSize = 20) {
    const categoryFilterProducts = this._filterProductsByCategoryAndFilters(categoryKey, filters);
    const sorted = this._sortProducts(categoryFilterProducts, sortBy);
    const { items, pagination } = this._paginate(sorted, page, pageSize);

    return {
      category: this._getFromStorage('product_categories').find((c) => c.key === categoryKey) || null,
      products: items,
      pagination,
      appliedFilters: {
        minPrice: typeof filters.minPrice === 'number' ? filters.minPrice : undefined,
        maxPrice: typeof filters.maxPrice === 'number' ? filters.maxPrice : undefined,
        minRating: typeof filters.minRating === 'number' ? filters.minRating : undefined,
        tags: filters.tags || [],
        isBeginnerRecommended: filters.isBeginnerRecommended || false,
        maxResolution: filters.maxResolution,
        frameRate: filters.frameRate,
        isOnSale: filters.isOnSale || false,
        minDiscountPercent: typeof filters.minDiscountPercent === 'number' ? filters.minDiscountPercent : undefined
      }
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const product = products.find((p) => p.id === productId) || null;
    const category = product ? (categories.find((c) => c.key === product.category_key) || null) : null;
    return { product, category };
  }

  // addToCart(productId, quantity, source)
  addToCart(productId, quantity = 1, source) {
    if (quantity <= 0) {
      return {
        success: false,
        cartId: null,
        cartItemCount: 0,
        cartTotal: 0,
        message: 'Quantity must be greater than zero.'
      };
    }

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        cartId: null,
        cartItemCount: 0,
        cartTotal: 0,
        message: 'Product not found.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    let item = cartItems.find((ci) => ci.cart_id === cart.id && ci.product_id === productId);

    if (item) {
      item.quantity += quantity;
      item.added_at = this._nowISO();
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity,
        unit_price: product.price,
        added_at: this._nowISO(),
        source: source || 'product_detail'
      };
      cartItems.push(item);
    }

    cart.updated_at = this._nowISO();
    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const summary = this._getCartSummaryByCartId(cart.id);

    return {
      success: true,
      cartId: cart.id,
      cartItemCount: summary.itemCount,
      cartTotal: summary.totalPrice,
      message: 'Added to cart.'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const carts = this._getFromStorage('carts');
    const cart = carts[0] || null;
    if (!cart) {
      return {
        cartId: null,
        items: [],
        totalPrice: 0,
        itemCount: 0
      };
    }
    return this._getCartSummaryByCartId(cart.id);
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx < 0) {
      return {
        success: false,
        cart: null
      };
    }

    const item = cartItems[idx];
    const cartId = item.cart_id;

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      item.quantity = quantity;
      item.added_at = this._nowISO();
      cartItems[idx] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    const cartSummary = this._getCartSummaryByCartId(cartId);
    return {
      success: true,
      cart: cartSummary
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx < 0) {
      return {
        success: false,
        cart: null
      };
    }
    const cartId = cartItems[idx].cart_id;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const cartSummary = this._getCartSummaryByCartId(cartId);
    return {
      success: true,
      cart: cartSummary
    };
  }

  // getDealsFilterOptions()
  getDealsFilterOptions() {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');
    const deals = products.filter((p) => p.is_on_sale || (typeof p.discount_percent === 'number' && p.discount_percent > 0));

    let minPrice = null;
    let maxPrice = null;
    const discountSet = new Set();

    deals.forEach((p) => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.discount_percent === 'number') {
        const bucket = Math.floor(p.discount_percent / 10) * 10;
        discountSet.add(bucket);
      }
    });

    const discountThresholds = Array.from(discountSet).sort((a, b) => a - b);

    return {
      categories,
      discountThresholds,
      price: {
        min: minPrice,
        max: maxPrice
      }
    };
  }

  // getDealsProducts(filters, sortBy, page, pageSize)
  getDealsProducts(filters = {}, sortBy = 'discount_high_to_low', page = 1, pageSize = 20) {
    const products = this._getFromStorage('products');
    const deals = products.filter((p) => p.is_on_sale || (typeof p.discount_percent === 'number' && p.discount_percent > 0));
    const f = filters || {};

    let filtered = deals;

    if (f.categoryKey) {
      const relevantKeys = this._getRelevantCategoryKeys(f.categoryKey);
      filtered = filtered.filter((p) => relevantKeys.includes(p.category_key));
    }
    if (typeof f.minDiscountPercent === 'number') {
      filtered = filtered.filter((p) => {
        const d = typeof p.discount_percent === 'number' ? p.discount_percent : 0;
        return d >= f.minDiscountPercent;
      });
    }
    if (typeof f.minPrice === 'number') {
      filtered = filtered.filter((p) => p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      filtered = filtered.filter((p) => p.price <= f.maxPrice);
    }

    const sorted = this._sortProducts(filtered, sortBy);
    const { items, pagination } = this._paginate(sorted, page, pageSize);
    return {
      products: items,
      pagination
    };
  }

  // searchProducts(query, filters, sortBy, page, pageSize)
  searchProducts(query, filters = {}, sortBy = 'relevance', page = 1, pageSize = 20) {
    const products = this._getFromStorage('products');
    const q = (query || '').toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

    let result = products.filter((p) => {
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const shortDesc = (p.short_description || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const haystack = name + ' ' + shortDesc + ' ' + desc;
      if (tokens.length === 0) return true;
      return tokens.every((t) => haystack.includes(t));
    });

    const f = filters || {};

    if (f.categoryKey) {
      const relevantKeys = this._getRelevantCategoryKeys(f.categoryKey);
      result = result.filter((p) => relevantKeys.includes(p.category_key));
    }
    if (typeof f.minPrice === 'number') {
      result = result.filter((p) => p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      result = result.filter((p) => p.price <= f.maxPrice);
    }
    if (typeof f.minRating === 'number') {
      result = result.filter((p) => {
        const r = typeof p.rating_average === 'number' ? p.rating_average : 0;
        return r >= f.minRating;
      });
    }
    if (typeof f.minReviewCount === 'number') {
      result = result.filter((p) => {
        const c = typeof p.review_count === 'number' ? p.review_count : 0;
        return c >= f.minReviewCount;
      });
    }
    if (typeof f.maxResolution === 'string') {
      result = result.filter((p) => {
        if (!p.max_resolution) return false;
        return this._resolutionRank(p.max_resolution) >= this._resolutionRank(f.maxResolution);
      });
    }
    if (typeof f.frameRate === 'number') {
      result = result.filter((p) => {
        const fr = typeof p.max_frame_rate === 'number' ? p.max_frame_rate : 0;
        return fr >= f.frameRate;
      });
    }
    if (f.tags && Array.isArray(f.tags) && f.tags.length > 0) {
      result = result.filter((p) => {
        const tags = Array.isArray(p.tags) ? p.tags : [];
        return f.tags.some((t) => tags.includes(t));
      });
    }

    let sorted;
    if (sortBy === 'price_low_to_high' || sortBy === 'price_high_to_low' || sortBy === 'rating_high_to_low') {
      sorted = this._sortProducts(result, sortBy);
    } else {
      sorted = result.slice().sort((a, b) => {
        const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
        const ca = typeof a.review_count === 'number' ? a.review_count : 0;
        const cb = typeof b.review_count === 'number' ? b.review_count : 0;
        if (rb !== ra) return rb - ra;
        return cb - ca;
      });
    }

    const { items, pagination } = this._paginate(sorted, page, pageSize);

    // available filters derived from full result set (before pagination)
    let minPrice = null;
    let maxPrice = null;
    const ratingSet = new Set();
    const frSet = new Set();
    const resSet = new Set();

    result.forEach((p) => {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.rating_average === 'number') {
        const bucket = Math.round(p.rating_average * 2) / 2;
        ratingSet.add(bucket);
      }
      if (typeof p.max_frame_rate === 'number') {
        frSet.add(p.max_frame_rate);
      }
      if (typeof p.max_resolution === 'string') {
        resSet.add(p.max_resolution);
      }
    });

    const availableFilters = {
      price: { min: minPrice, max: maxPrice },
      ratingThresholds: Array.from(ratingSet).sort((a, b) => b - a),
      frameRateOptions: Array.from(frSet).sort((a, b) => a - b),
      resolutionOptions: Array.from(resSet).sort((a, b) => this._resolutionRank(a) - this._resolutionRank(b))
    };

    return {
      query,
      products: items,
      availableFilters,
      pagination
    };
  }

  // saveProductToWishlist(productId, source)
  saveProductToWishlist(productId, source = 'bookmark') {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const existing = wishlistItems.find((wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId);

    if (existing) {
      return {
        success: true,
        wishlistId: wishlist.id,
        wishlistItemCount: wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id).length,
        message: 'Already in wishlist.'
      };
    }

    const item = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: productId,
      added_at: this._nowISO(),
      source: source || 'bookmark'
    };
    wishlistItems.push(item);
    wishlist.updated_at = this._nowISO();
    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveWishlist(wishlist);

    const count = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id).length;

    return {
      success: true,
      wishlistId: wishlist.id,
      wishlistItemCount: count,
      message: 'Saved to wishlist.'
    };
  }

  // getWishlistItems()
  getWishlistItems() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const products = this._getFromStorage('products');

    const items = wishlistItems
      .filter((wi) => wi.wishlist_id === wishlist.id)
      .map((wi) => {
        const product = products.find((p) => p.id === wi.product_id) || null;
        return {
          wishlistItemId: wi.id,
          product,
          addedAt: wi.added_at,
          source: wi.source || 'bookmark'
        };
      });

    return {
      wishlistId: wishlist.id,
      items
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlistItems = this._getFromStorage('wishlist_items');
    const idx = wishlistItems.findIndex((wi) => wi.id === wishlistItemId);
    if (idx < 0) {
      return { success: false, wishlistItemCount: wishlistItems.length };
    }
    wishlistItems.splice(idx, 1);
    this._saveToStorage('wishlist_items', wishlistItems);
    return { success: true, wishlistItemCount: wishlistItems.length };
  }

  // getGuideFilterOptions()
  getGuideFilterOptions() {
    const categories = this._getFromStorage('guide_categories');
    const guides = this._getFromStorage('guides');

    const difficultySet = new Set();
    const tagSet = new Set();

    guides.forEach((g) => {
      if (g.difficulty) difficultySet.add(g.difficulty);
      if (Array.isArray(g.tags)) {
        g.tags.forEach((t) => tagSet.add(t));
      }
    });

    let difficultyOptions = Array.from(difficultySet);
    if (difficultyOptions.length === 0) {
      difficultyOptions = ['beginner', 'getting_started', 'intermediate', 'advanced'];
    }

    const tagOptions = Array.from(tagSet).sort();

    return {
      categories,
      difficultyOptions,
      tagOptions
    };
  }

  // getGuides(filters, sortBy, page, pageSize)
  getGuides(filters = {}, sortBy = 'newest', page = 1, pageSize = 20) {
    const guides = this._getFromStorage('guides');
    const f = filters || {};

    let result = guides.slice();

    if (f.categoryKey) {
      result = result.filter((g) => g.category_key === f.categoryKey);
    }
    if (f.difficulty) {
      result = result.filter((g) => g.difficulty === f.difficulty);
    }
    if (f.tags && Array.isArray(f.tags) && f.tags.length > 0) {
      result = result.filter((g) => {
        const tags = Array.isArray(g.tags) ? g.tags : [];
        return f.tags.some((t) => tags.includes(t));
      });
    }
    if (f.searchQuery) {
      const sq = f.searchQuery.toLowerCase();
      result = result.filter((g) => {
        const title = (g.title || '').toLowerCase();
        const summary = (g.summary || '').toLowerCase();
        return title.includes(sq) || summary.includes(sq);
      });
    }

    if (sortBy === 'oldest') {
      result.sort((a, b) => {
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return da - db;
      });
    } else {
      // newest or relevance
      result.sort((a, b) => {
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return db - da;
      });
    }

    const { items, pagination } = this._paginate(result, page, pageSize);

    return {
      guides: items,
      pagination
    };
  }

  // getGuideDetails(guideId)
  getGuideDetails(guideId) {
    const guides = this._getFromStorage('guides');
    return guides.find((g) => g.id === guideId) || null;
  }

  // getGuideRecommendedProducts(guideId, sectionTitle)
  getGuideRecommendedProducts(guideId, sectionTitle) {
    const recs = this._getFromStorage('guide_recommended_products');
    const products = this._getFromStorage('products');
    const guides = this._getFromStorage('guides');

    let filtered = recs.filter((r) => r.guide_id === guideId);
    if (sectionTitle) {
      filtered = filtered.filter((r) => r.section_title === sectionTitle);
    }

    filtered.sort((a, b) => {
      const ra = typeof a.rank === 'number' ? a.rank : Number.MAX_SAFE_INTEGER;
      const rb = typeof b.rank === 'number' ? b.rank : Number.MAX_SAFE_INTEGER;
      return ra - rb;
    });

    return filtered.map((r) => {
      const product = products.find((p) => p.id === r.product_id) || null;
      const guide = guides.find((g) => g.id === r.guide_id) || null;
      return {
        recommendation: Object.assign({}, r, { guide }),
        product
      };
    });
  }

  // addGuideToReadingList(guideId)
  addGuideToReadingList(guideId) {
    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');
    const existing = items.find((i) => i.reading_list_id === readingList.id && i.guide_id === guideId);

    if (existing) {
      const countExisting = items.filter((i) => i.reading_list_id === readingList.id).length;
      return {
        success: true,
        readingListId: readingList.id,
        readingListItemCount: countExisting,
        message: 'Already in reading list.'
      };
    }

    const item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingList.id,
      guide_id: guideId,
      added_at: this._nowISO()
    };
    items.push(item);
    readingList.updated_at = this._nowISO();
    this._saveToStorage('reading_list_items', items);
    this._saveReadingList(readingList);

    const count = items.filter((i) => i.reading_list_id === readingList.id).length;

    return {
      success: true,
      readingListId: readingList.id,
      readingListItemCount: count,
      message: 'Added to reading list.'
    };
  }

  // getReadingListItems()
  getReadingListItems() {
    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');
    const guides = this._getFromStorage('guides');

    const mapped = items
      .filter((i) => i.reading_list_id === readingList.id)
      .map((i) => {
        const guide = guides.find((g) => g.id === i.guide_id) || null;
        return {
          readingListItemId: i.id,
          guide,
          addedAt: i.added_at
        };
      });

    return {
      readingListId: readingList.id,
      items: mapped
    };
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    const items = this._getFromStorage('reading_list_items');
    const idx = items.findIndex((i) => i.id === readingListItemId);
    if (idx < 0) {
      return { success: false, readingListItemCount: items.length };
    }
    items.splice(idx, 1);
    this._saveToStorage('reading_list_items', items);
    return { success: true, readingListItemCount: items.length };
  }

  // getStarterKits()
  getStarterKits() {
    const kits = this._getFromStorage('kits');
    const kitItems = this._getFromStorage('kit_items');
    const starterKits = kits.filter((k) => k.type === 'pre_made');
    return starterKits.map((kit) => {
      const count = kitItems.filter((i) => i.kit_id === kit.id).length;
      return {
        kit,
        itemCount: count
      };
    });
  }

  // createCustomKit(name, targetBudget, source)
  createCustomKit(name = 'My Custom Starter Kit', targetBudget, source = 'kit_builder') {
    const kits = this._getFromStorage('kits');
    const kit = {
      id: this._generateId('kit'),
      name: name || 'My Custom Starter Kit',
      description: '',
      type: 'custom',
      source: source || 'kit_builder',
      target_budget: typeof targetBudget === 'number' ? targetBudget : null,
      total_price: 0,
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };
    kits.push(kit);
    this._saveToStorage('kits', kits);
    localStorage.setItem('active_kit_builder_id', kit.id);
    return kit;
  }

  // getKitBuilderOptions(kitId, slotType, filters, sortBy, page, pageSize)
  getKitBuilderOptions(kitId, slotType, filters = {}, sortBy = 'relevance', page = 1, pageSize = 20) {
    const f = filters || {};
    let categoryKey = f.categoryKey;

    if (!categoryKey) {
      switch (slotType) {
        case 'microphone':
          categoryKey = 'microphones';
          break;
        case 'webcam':
          categoryKey = 'webcams';
          break;
        case 'lighting':
          categoryKey = 'ring_lights';
          break;
        case 'support_mount':
          categoryKey = 'tripods';
          break;
        case 'capture_card':
          categoryKey = 'capture_cards';
          break;
        case 'audio_interface':
          categoryKey = 'audio_interfaces';
          break;
        default:
          categoryKey = 'other';
      }
    }

    const productFilters = {
      minPrice: f.minPrice,
      maxPrice: f.maxPrice,
      minRating: f.minRating
    };

    const products = this._filterProductsByCategoryAndFilters(categoryKey, productFilters);
    let sorted;
    if (sortBy === 'price_low_to_high' || sortBy === 'price_high_to_low' || sortBy === 'rating_high_to_low') {
      sorted = this._sortProducts(products, sortBy);
    } else {
      sorted = this._sortProducts(products, 'relevance');
    }

    const { items, pagination } = this._paginate(sorted, page, pageSize);

    return {
      slotType,
      products: items,
      pagination
    };
  }

  // setKitItem(kitId, slotType, productId, quantity)
  setKitItem(kitId, slotType, productId, quantity = 1) {
    const kits = this._getFromStorage('kits');
    const kitItems = this._getFromStorage('kit_items');
    const products = this._getFromStorage('products');

    const kit = kits.find((k) => k.id === kitId) || null;
    if (!kit) {
      return { kit: null, items: [], totalPrice: 0 };
    }

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { kit, items: this._getKitItemsWithProducts(kitId), totalPrice: kit.total_price || 0 };
    }

    let item = kitItems.find((i) => i.kit_id === kitId && i.slot_type === slotType);
    if (item) {
      item.product_id = productId;
      item.quantity = quantity;
      item.unit_price = product.price;
      item.added_at = this._nowISO();
    } else {
      item = {
        id: this._generateId('kit_item'),
        kit_id: kitId,
        product_id: productId,
        slot_type: slotType,
        quantity: quantity,
        unit_price: product.price,
        added_at: this._nowISO()
      };
      kitItems.push(item);
    }

    kit.updated_at = this._nowISO();
    this._saveToStorage('kit_items', kitItems);
    this._saveToStorage('kits', kits);
    this._recalculateKitTotalPrice(kitId);

    const updatedKits = this._getFromStorage('kits');
    const updatedKit = updatedKits.find((k) => k.id === kitId) || kit;
    const itemsWithProducts = this._getKitItemsWithProducts(kitId);

    return {
      kit: updatedKit,
      items: itemsWithProducts,
      totalPrice: updatedKit.total_price || 0
    };
  }

  // getKitSummary(kitId)
  getKitSummary(kitId) {
    const kits = this._getFromStorage('kits');
    const kit = kits.find((k) => k.id === kitId) || null;
    if (!kit) {
      return {
        kit: null,
        items: [],
        totalPrice: 0
      };
    }
    const items = this._getKitItemsWithProducts(kitId);
    const totalPrice = kit.total_price != null ? kit.total_price : items.reduce((sum, i) => sum + i.subtotal, 0);
    return {
      kit,
      items,
      totalPrice
    };
  }

  // removeKitItem(kitItemId)
  removeKitItem(kitItemId) {
    const kitItems = this._getFromStorage('kit_items');
    const item = kitItems.find((i) => i.id === kitItemId);
    if (!item) {
      return {
        kit: null,
        items: [],
        totalPrice: 0
      };
    }
    const kitId = item.kit_id;
    const idx = kitItems.findIndex((i) => i.id === kitItemId);
    kitItems.splice(idx, 1);
    this._saveToStorage('kit_items', kitItems);
    this._recalculateKitTotalPrice(kitId);
    return this.getKitSummary(kitId);
  }

  // replaceKitItem(kitItemId, newProductId)
  replaceKitItem(kitItemId, newProductId) {
    const kitItems = this._getFromStorage('kit_items');
    const products = this._getFromStorage('products');
    const item = kitItems.find((i) => i.id === kitItemId);
    if (!item) {
      return {
        kit: null,
        items: [],
        totalPrice: 0
      };
    }
    const product = products.find((p) => p.id === newProductId) || null;
    if (!product) {
      return this.getKitSummary(item.kit_id);
    }

    item.product_id = newProductId;
    item.unit_price = product.price;
    item.added_at = this._nowISO();

    const idx = kitItems.findIndex((i) => i.id === kitItemId);
    kitItems[idx] = item;
    this._saveToStorage('kit_items', kitItems);
    this._recalculateKitTotalPrice(item.kit_id);
    return this.getKitSummary(item.kit_id);
  }

  // addKitToCart(kitId)
  addKitToCart(kitId) {
    const kitItems = this._getFromStorage('kit_items');
    const items = kitItems.filter((i) => i.kit_id === kitId);
    if (items.length === 0) {
      const summary = this.getCartSummary();
      return {
        success: false,
        cartId: summary.cartId,
        cartItemCount: summary.itemCount,
        cartTotal: summary.totalPrice
      };
    }

    items.forEach((i) => {
      const qty = typeof i.quantity === 'number' ? i.quantity : 1;
      this.addToCart(i.product_id, qty, 'kit_summary');
    });

    const summary = this.getCartSummary();
    return {
      success: true,
      cartId: summary.cartId,
      cartItemCount: summary.itemCount,
      cartTotal: summary.totalPrice
    };
  }

  // addToComparisonSet(productId, comparisonType)
  addToComparisonSet(productId, comparisonType) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        comparisonType: comparisonType || 'other',
        productIds: [],
        productCount: 0
      };
    }

    const type = comparisonType || this._inferComparisonTypeFromProduct(product);
    const set = this._getOrCreateComparisonSet(type);

    if (!set.product_ids.includes(productId)) {
      set.product_ids.push(productId);
      this._saveComparisonSet(set);
    }

    return {
      comparisonType: set.comparison_type,
      productIds: set.product_ids.slice(),
      productCount: set.product_ids.length
    };
  }

  // getComparisonSet(comparisonType)
  getComparisonSet(comparisonType) {
    const sets = this._getFromStorage('comparison_sets');
    const products = this._getFromStorage('products');
    const set = sets.find((s) => s.comparison_type === comparisonType) || null;
    if (!set) {
      return {
        comparisonType,
        products: []
      };
    }
    const mappedProducts = set.product_ids
      .map((id) => products.find((p) => p.id === id) || null)
      .filter((p) => p !== null);
    return {
      comparisonType: set.comparison_type,
      products: mappedProducts
    };
  }

  // removeFromComparisonSet(productId, comparisonType)
  removeFromComparisonSet(productId, comparisonType) {
    const sets = this._getFromStorage('comparison_sets');
    const products = this._getFromStorage('products');
    const set = sets.find((s) => s.comparison_type === comparisonType) || null;
    if (!set) {
      return {
        comparisonType,
        products: []
      };
    }

    set.product_ids = set.product_ids.filter((id) => id !== productId);
    this._saveComparisonSet(set);

    const mappedProducts = set.product_ids
      .map((id) => products.find((p) => p.id === id) || null)
      .filter((p) => p !== null);

    return {
      comparisonType: set.comparison_type,
      products: mappedProducts
    };
  }

  // clearComparisonSet(comparisonType)
  clearComparisonSet(comparisonType) {
    const sets = this._getFromStorage('comparison_sets');
    const set = sets.find((s) => s.comparison_type === comparisonType) || null;
    if (set) {
      set.product_ids = [];
      this._saveComparisonSet(set);
    }
    return { success: true };
  }

  // getProductQuestions(productId)
  getProductQuestions(productId) {
    const questions = this._getFromStorage('product_questions');
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    return questions
      .filter((q) => q.product_id === productId)
      .sort((a, b) => {
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return db - da;
      })
      .map((q) => Object.assign({}, q, { product }));
  }

  // submitProductQuestion(productId, questionText, displayName)
  submitProductQuestion(productId, questionText, displayName) {
    const text = (questionText || '').trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    if (wordCount < 15) {
      return {
        success: false,
        question: null,
        message: 'Question must be at least 15 words.'
      };
    }

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        question: null,
        message: 'Product not found.'
      };
    }

    const questions = this._getFromStorage('product_questions');
    const question = {
      id: this._generateId('product_question'),
      product_id: productId,
      question_text: text,
      display_name: displayName || 'Anonymous',
      created_at: this._nowISO(),
      answer_text: null,
      answered_at: null
    };
    questions.push(question);
    this._saveToStorage('product_questions', questions);

    return {
      success: true,
      question,
      message: 'Question submitted.'
    };
  }

  // submitStreamingSetupQuiz(streamingPlatform, contentType, targetBudget, environment)
  submitStreamingSetupQuiz(streamingPlatform, contentType, targetBudget, environment) {
    const kits = this._getFromStorage('kits');
    const kit = {
      id: this._generateId('kit'),
      name: 'Quiz Recommended Kit',
      description: 'Kit generated from streaming setup quiz.',
      type: 'quiz_recommended',
      source: 'quiz',
      target_budget: targetBudget,
      total_price: 0,
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };
    kits.push(kit);
    this._saveToStorage('kits', kits);

    this._buildQuizRecommendedKit(kit);

    const updatedKits = this._getFromStorage('kits');
    const finalKit = updatedKits.find((k) => k.id === kit.id) || kit;
    const items = this._getKitItemsWithProducts(kit.id);
    const totalPrice = finalKit.total_price || items.reduce((sum, i) => sum + i.subtotal, 0);
    const overBudget = typeof targetBudget === 'number' ? totalPrice > targetBudget : false;

    const quizRun = this._createQuizRun(streamingPlatform, contentType, targetBudget, environment, kit.id);

    return {
      quizRun,
      recommendedKit: {
        kit: finalKit,
        items,
        totalPrice,
        overBudget
      }
    };
  }

  // getQuizResult(quizRunId)
  getQuizResult(quizRunId) {
    const quizRuns = this._getFromStorage('quiz_runs');
    const run = quizRuns.find((r) => r.id === quizRunId) || null;
    if (!run) {
      return {
        quizRun: null,
        kitSummary: {
          kit: null,
          items: [],
          totalPrice: 0,
          overBudget: false
        }
      };
    }

    const kitSummary = this.getKitSummary(run.recommended_kit_id);
    const overBudget = typeof run.target_budget === 'number' ? kitSummary.totalPrice > run.target_budget : false;

    return {
      quizRun: run,
      kitSummary: Object.assign({}, kitSummary, { overBudget })
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const data = localStorage.getItem('about_page_content');
    return data ? JSON.parse(data) : { title: '', body: '', sections: [] };
  }

  // submitContactMessage(name, email, subject, message)
  submitContactMessage(name, email, subject, message) {
    const messages = this._getFromStorage('contact_messages');
    const msg = {
      id: this._generateId('contact_message'),
      name,
      email,
      subject: subject || '',
      message,
      created_at: this._nowISO()
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      messageId: msg.id,
      confirmationMessage: 'Your message has been received.'
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
