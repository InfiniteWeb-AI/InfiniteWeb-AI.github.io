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
    this.idCounter = this._getNextIdCounter();
  }

  // ---------- Initialization & Storage Helpers ----------

  _initStorage() {
    // Core generic tables
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }

    // Entity storage based on data model storage_key
    const tables = [
      'products',
      'cart',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'events',
      'event_rsvps',
      'tutorials',
      'tutorial_lists',
      'tutorial_list_items',
      'tutorial_comments',
      'forums',
      'threads',
      'posts',
      'galleries',
      'gallery_photos',
      'gallery_boards',
      'gallery_board_items',
      'gallery_photo_likes',
      'owned_items',
      'reviews',
      'costume_builds',
      'build_items',
      'build_suggestions',
      'pattern_library_items'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ---------- Enum Label Helpers ----------

  _getProductCategoryLabel(value) {
    const map = {
      costume_pieces: 'Costume Pieces',
      boots_footwear: 'Boots & Footwear',
      accessories_gear: 'Accessories & Gear',
      wigs: 'Wigs',
      patterns: 'Patterns',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _getProductSubcategoryLabel(value) {
    const map = {
      tops_tanks: 'Tops & Tanks',
      shorts_bottoms: 'Shorts & Bottoms',
      accessories: 'Accessories',
      boots: 'Boots',
      holsters: 'Holsters',
      tank_tops: 'Tank Tops',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _getEraLabel(value) {
    const map = {
      classic_1996_1999: 'Classic 1996–1999',
      angel_of_darkness: 'Angel of Darkness',
      legend_anniversary_underworld: 'Legend / Anniversary / Underworld',
      reboot_2013_2015: 'Reboot 2013–2015',
      rise_of_the_tomb_raider: 'Rise of the Tomb Raider',
      shadow_of_the_tomb_raider: 'Shadow of the Tomb Raider',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _getColorLabel(value) {
    const map = {
      dark_brown: 'Dark Brown',
      brown: 'Brown',
      black: 'Black',
      blonde: 'Blonde',
      red: 'Red',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _getDifficultyLabel(value) {
    const map = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced'
    };
    return map[value] || value || '';
  }

  _getTutorialCategoryLabel(value) {
    const map = {
      props_weapons: 'Props & Weapons',
      costume: 'Costume',
      makeup_wig: 'Makeup & Wig',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  // ---------- Common Lookup Helpers ----------

  _findProductById(productId) {
    const products = this._getFromStorage('products');
    return products.find(p => p.id === productId) || null;
  }

  _findEventById(eventId) {
    const events = this._getFromStorage('events');
    return events.find(e => e.id === eventId) || null;
  }

  _findTutorialById(tutorialId) {
    const tutorials = this._getFromStorage('tutorials');
    return tutorials.find(t => t.id === tutorialId) || null;
  }

  _findForumById(forumId) {
    const forums = this._getFromStorage('forums');
    return forums.find(f => f.id === forumId) || null;
  }

  _findThreadById(threadId) {
    const threads = this._getFromStorage('threads');
    return threads.find(t => t.id === threadId) || null;
  }

  _findGalleryById(galleryId) {
    const galleries = this._getFromStorage('galleries');
    return galleries.find(g => g.id === galleryId) || null;
  }

  _findBuildById(buildId) {
    const builds = this._getFromStorage('costume_builds');
    return builds.find(b => b.id === buildId) || null;
  }

  _findBuildSuggestionById(suggestionId) {
    const suggestions = this._getFromStorage('build_suggestions');
    return suggestions.find(s => s.id === suggestionId) || null;
  }

  // ---------- HelperFunctions specified in schema ----------

  // Internal helper to get the current Cart or create a new one if none exists
  _getOrCreateCart() {
    const now = this._nowIso();
    let carts = this._getFromStorage('cart');
    let activeCartId = localStorage.getItem('active_cart_id');

    let cart = null;
    if (activeCartId) {
      cart = carts.find(c => c.id === activeCartId) || null;
    }

    if (!cart) {
      if (carts.length > 0) {
        cart = carts[0];
      } else {
        cart = {
          id: this._generateId('cart'),
          created_at: now,
          updated_at: now
        };
        carts.push(cart);
        this._saveToStorage('cart', carts);
      }
      localStorage.setItem('active_cart_id', cart.id);
    }

    return cart;
  }

  // Internal helper to find a Wishlist by name or create it if it does not exist.
  _getOrCreateWishlistByName(name, description) {
    let wishlists = this._getFromStorage('wishlists');
    let wishlist = wishlists.find(w => w.name === name) || null;
    const now = this._nowIso();

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: name,
        description: description || '',
        created_at: now,
        updated_at: now
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }

    return wishlist;
  }

  // Internal helper to find or create a TutorialList by a given name (e.g., 'To Try').
  _getOrCreateTutorialListByName(name, description) {
    let lists = this._getFromStorage('tutorial_lists');
    let list = lists.find(l => l.name === name) || null;
    const now = this._nowIso();

    if (!list) {
      list = {
        id: this._generateId('tutlist'),
        name: name,
        description: description || '',
        created_at: now
      };
      lists.push(list);
      this._saveToStorage('tutorial_lists', lists);
    }

    return list;
  }

  // Internal helper to find or create a GalleryBoard by name (e.g., 'Inspirations').
  _getOrCreateGalleryBoardByName(name, description) {
    let boards = this._getFromStorage('gallery_boards');
    let board = boards.find(b => b.name === name) || null;
    const now = this._nowIso();

    if (!board) {
      board = {
        id: this._generateId('gboard'),
        name: name,
        description: description || '',
        created_at: now
      };
      boards.push(board);
      this._saveToStorage('gallery_boards', boards);
    }

    return board;
  }

  // ---------- Cart Helpers ----------

  _buildCartResponse(cartId) {
    const cartList = this._getFromStorage('cart');
    const cart = cartList.find(c => c.id === cartId) || null;

    if (!cart) {
      return {
        id: null,
        items: [],
        subtotal: 0,
        currency: 'usd',
        itemCount: 0
      };
    }

    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const product = products.find(p => p.id === ci.product_id) || null;
        const lineSubtotal = ci.unit_price * ci.quantity;
        return {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: product ? product.name : null,
          thumbnail_image: product && product.images && product.images.length > 0 ? product.images[0] : null,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          currency: product ? product.currency || 'usd' : 'usd',
          line_subtotal: lineSubtotal,
          product: product
        };
      });

    const subtotal = items.reduce((sum, item) => sum + item.line_subtotal, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const currency = items[0] ? items[0].currency : 'usd';

    return {
      id: cart.id,
      items: items,
      subtotal: subtotal,
      currency: currency,
      itemCount: itemCount
    };
  }

  // ---------- Interface Implementations ----------

  // getHomepageFeaturedContent()
  getHomepageFeaturedContent() {
    const products = this._getFromStorage('products');
    const tutorials = this._getFromStorage('tutorials');
    const events = this._getFromStorage('events');
    const galleries = this._getFromStorage('galleries');

    // Featured products: top by best_selling_rank, then rating
    const featuredProducts = products
      .slice()
      .sort((a, b) => {
        const rankA = typeof a.best_selling_rank === 'number' ? a.best_selling_rank : Number.MAX_SAFE_INTEGER;
        const rankB = typeof b.best_selling_rank === 'number' ? b.best_selling_rank : Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        const ratingA = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const ratingB = typeof b.average_rating === 'number' ? b.average_rating : 0;
        return ratingB - ratingA;
      })
      .slice(0, 8)
      .map(p => ({
        id: p.id,
        name: p.name,
        thumbnail_image: p.images && p.images.length > 0 ? p.images[0] : null,
        price: p.price,
        currency: p.currency || 'usd',
        product_category: p.product_category,
        product_category_label: this._getProductCategoryLabel(p.product_category),
        era: p.era || null,
        era_label: this._getEraLabel(p.era),
        average_rating: typeof p.average_rating === 'number' ? p.average_rating : null
      }));

    // Featured tutorials: most liked
    const featuredTutorials = tutorials
      .slice()
      .sort((a, b) => {
        const likesA = typeof a.like_count === 'number' ? a.like_count : 0;
        const likesB = typeof b.like_count === 'number' ? b.like_count : 0;
        return likesB - likesA;
      })
      .slice(0, 6)
      .map(t => ({
        id: t.id,
        title: t.title,
        thumbnail_image: null,
        category: t.category,
        category_label: this._getTutorialCategoryLabel(t.category),
        difficulty: t.difficulty,
        difficulty_label: this._getDifficultyLabel(t.difficulty),
        duration_minutes: t.duration_minutes,
        like_count: typeof t.like_count === 'number' ? t.like_count : 0
      }));

    // Featured events: next upcoming ones
    const now = new Date();
    const featuredEvents = events
      .slice()
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .filter(e => {
        const start = new Date(e.start_datetime);
        return start >= now;
      })
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        location_city: e.location_city,
        location_state: e.location_state || null,
        location_country: e.location_country || null
      }));

    // Featured galleries: most liked
    const featuredGalleries = galleries
      .slice()
      .sort((a, b) => {
        const likesA = typeof a.like_count === 'number' ? a.like_count : 0;
        const likesB = typeof b.like_count === 'number' ? b.like_count : 0;
        return likesB - likesA;
      })
      .slice(0, 6)
      .map(g => ({
        id: g.id,
        title: g.title,
        cover_image: g.cover_image || null,
        like_count: typeof g.like_count === 'number' ? g.like_count : 0,
        tags: Array.isArray(g.tags) ? g.tags : []
      }));

    return {
      featuredProducts,
      featuredTutorials,
      featuredEvents,
      featuredGalleries
    };
  }

  // searchProducts(query, productCategory, productSubcategory, era, minPrice, maxPrice, minRating, color, difficulty, garmentType, patternType, isDigitalPattern, isFree, sortBy, page, pageSize)
  searchProducts(
    query,
    productCategory,
    productSubcategory,
    era,
    minPrice,
    maxPrice,
    minRating,
    color,
    difficulty,
    garmentType,
    patternType,
    isDigitalPattern,
    isFree,
    sortBy,
    page,
    pageSize
  ) {
    let items = this._getFromStorage('products');

    // Filtering
    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      items = items.filter(p => {
        const inName = p.name && p.name.toLowerCase().includes(q);
        const inDesc = p.description && p.description.toLowerCase().includes(q);
        const inTags = Array.isArray(p.tags) && p.tags.some(tag => String(tag).toLowerCase().includes(q));
        return inName || inDesc || inTags;
      });
    }

    if (productCategory) {
      items = items.filter(p => p.product_category === productCategory);
    }

    if (productSubcategory) {
      items = items.filter(p => p.product_subcategory === productSubcategory);
    }

    if (era) {
      items = items.filter(p => p.era === era);
    }

    if (typeof minPrice === 'number') {
      items = items.filter(p => typeof p.price === 'number' && p.price >= minPrice);
    }

    if (typeof maxPrice === 'number') {
      items = items.filter(p => typeof p.price === 'number' && p.price <= maxPrice);
    }

    if (typeof minRating === 'number') {
      items = items.filter(p => (typeof p.average_rating === 'number' ? p.average_rating : 0) >= minRating);
    }

    if (color) {
      items = items.filter(p => p.color === color);
    }

    if (difficulty) {
      items = items.filter(p => p.difficulty === difficulty);
    }

    if (garmentType) {
      items = items.filter(p => p.garment_type === garmentType);
    }

    if (patternType) {
      items = items.filter(p => p.pattern_type === patternType);
    }

    if (typeof isDigitalPattern === 'boolean') {
      items = items.filter(p => !!p.is_digital_pattern === isDigitalPattern);
    }

    if (typeof isFree === 'boolean' && isFree) {
      items = items.filter(p => p.is_free === true || p.price === 0);
    }

    // Sorting
    const sortKey = sortBy || 'relevance';

    if (sortKey === 'best_selling') {
      items = items.slice().sort((a, b) => {
        const rankA = typeof a.best_selling_rank === 'number' ? a.best_selling_rank : Number.MAX_SAFE_INTEGER;
        const rankB = typeof b.best_selling_rank === 'number' ? b.best_selling_rank : Number.MAX_SAFE_INTEGER;
        return rankA - rankB;
      });
    } else if (sortKey === 'price_low_to_high') {
      items = items.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortKey === 'price_high_to_low') {
      items = items.slice().sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortKey === 'rating_high_to_low') {
      items = items.slice().sort((a, b) => {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        return rb - ra;
      });
    } else if (sortKey === 'most_liked') {
      items = items.slice().sort((a, b) => {
        const la = typeof a.like_count === 'number' ? a.like_count : 0;
        const lb = typeof b.like_count === 'number' ? b.like_count : 0;
        return lb - la;
      });
    } else {
      // 'relevance' – leave as-is (or could apply heuristic)
      items = items.slice();
    }

    // Pagination
    const total = items.length;
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 24;
    const start = (pageNum - 1) * size;
    const paged = items.slice(start, start + size);

    const resultItems = paged.map(p => ({
      id: p.id,
      name: p.name,
      thumbnail_image: p.images && p.images.length > 0 ? p.images[0] : null,
      price: p.price,
      currency: p.currency || 'usd',
      product_category: p.product_category,
      product_category_label: this._getProductCategoryLabel(p.product_category),
      product_subcategory: p.product_subcategory || null,
      product_subcategory_label: this._getProductSubcategoryLabel(p.product_subcategory),
      era: p.era || null,
      era_label: this._getEraLabel(p.era),
      color: p.color || null,
      color_label: this._getColorLabel(p.color),
      average_rating: typeof p.average_rating === 'number' ? p.average_rating : null,
      rating_count: typeof p.rating_count === 'number' ? p.rating_count : 0,
      like_count: typeof p.like_count === 'number' ? p.like_count : 0,
      is_digital_pattern: !!p.is_digital_pattern,
      is_free: !!p.is_free,
      best_selling_rank: typeof p.best_selling_rank === 'number' ? p.best_selling_rank : null
    }));

    return {
      items: resultItems,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // getProductFilterOptions(productCategory)
  getProductFilterOptions(productCategory) {
    let products = this._getFromStorage('products');
    if (productCategory) {
      products = products.filter(p => p.product_category === productCategory);
    }

    const unique = arr => Array.from(new Set(arr.filter(Boolean)));

    const erasValues = unique(products.map(p => p.era));
    const productSubcategoriesValues = unique(products.map(p => p.product_subcategory));
    const colorsValues = unique(products.map(p => p.color));
    const difficultiesValues = unique(products.map(p => p.difficulty));
    const garmentTypesValues = unique(products.map(p => p.garment_type));

    const eras = erasValues.map(v => ({ value: v, label: this._getEraLabel(v) }));
    const productSubcategories = productSubcategoriesValues.map(v => ({ value: v, label: this._getProductSubcategoryLabel(v) }));
    const colors = colorsValues.map(v => ({ value: v, label: this._getColorLabel(v) }));
    const difficulties = difficultiesValues.map(v => ({ value: v, label: this._getDifficultyLabel(v) }));
    const garmentTypes = garmentTypesValues.map(v => ({ value: v, label: v || '' }));

    const ratingBuckets = [
      { minRating: 4, label: '4 stars & up' },
      { minRating: 3, label: '3 stars & up' },
      { minRating: 2, label: '2 stars & up' },
      { minRating: 1, label: '1 star & up' }
    ];

    let min = 0;
    let max = 0;
    if (products.length > 0) {
      const prices = products.map(p => typeof p.price === 'number' ? p.price : 0);
      min = Math.min.apply(null, prices);
      max = Math.max.apply(null, prices);
    }

    const priceRangeDefaults = {
      min: min,
      max: max,
      currency: 'usd'
    };

    return {
      eras,
      productSubcategories,
      colors,
      difficulties,
      garmentTypes,
      ratingBuckets,
      priceRangeDefaults
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const product = this._findProductById(productId);
    if (!product) {
      return {
        product: null,
        product_category_label: '',
        product_subcategory_label: '',
        era_label: '',
        color_label: '',
        is_in_cart: false,
        owned: false,
        in_pattern_library: false,
        average_rating: null,
        rating_count: 0
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const isInCart = cartItems.some(ci => ci.cart_id === cart.id && ci.product_id === productId);

    const ownedItems = this._getFromStorage('owned_items');
    const owned = ownedItems.some(o => o.product_id === productId);

    const libraryItems = this._getFromStorage('pattern_library_items');
    const inPatternLibrary = libraryItems.some(li => li.product_id === productId);

    return {
      product: product,
      product_category_label: this._getProductCategoryLabel(product.product_category),
      product_subcategory_label: this._getProductSubcategoryLabel(product.product_subcategory),
      era_label: this._getEraLabel(product.era),
      color_label: this._getColorLabel(product.color),
      is_in_cart: isInCart,
      owned: owned,
      in_pattern_library: inPatternLibrary,
      average_rating: typeof product.average_rating === 'number' ? product.average_rating : null,
      rating_count: typeof product.rating_count === 'number' ? product.rating_count : 0
    };
  }

  // addToCart(productId, quantity = 1)
  addToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const product = this._findProductById(productId);
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const now = this._nowIso();

    let existing = cartItems.find(ci => ci.cart_id === cart.id && ci.product_id === productId);
    if (existing) {
      existing.quantity += qty;
      existing.added_at = now;
    } else {
      existing = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price,
        added_at: now
      };
      cartItems.push(existing);
    }

    this._saveToStorage('cart_items', cartItems);

    // Update cart timestamp
    let carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex].updated_at = now;
      this._saveToStorage('cart', carts);
    }

    const cartSummary = this._buildCartResponse(cart.id);

    return {
      success: true,
      message: 'Added to cart',
      cart: cartSummary
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const cartSummary = this._buildCartResponse(cart.id);
    return {
      cart: cartSummary
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: this._buildCartResponse(this._getOrCreateCart().id)
      };
    }

    const now = this._nowIso();
    const cartItem = cartItems[idx];

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItem.quantity = quantity;
      cartItem.added_at = now;
    }

    this._saveToStorage('cart_items', cartItems);

    // Update cart timestamp
    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex(c => c.id === cartItem.cart_id);
    if (cartIndex !== -1) {
      carts[cartIndex].updated_at = now;
      this._saveToStorage('cart', carts);
    }

    const cartSummary = this._buildCartResponse(cartItem.cart_id);

    return {
      success: true,
      message: 'Cart updated',
      cart: cartSummary
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: this._buildCartResponse(this._getOrCreateCart().id)
      };
    }

    const cartId = cartItems[idx].cart_id;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    // Update cart timestamp
    const now = this._nowIso();
    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex(c => c.id === cartId);
    if (cartIndex !== -1) {
      carts[cartIndex].updated_at = now;
      this._saveToStorage('cart', carts);
    }

    const cartSummary = this._buildCartResponse(cartId);

    return {
      success: true,
      message: 'Item removed from cart',
      cart: cartSummary
    };
  }

  // getUserWishlists()
  getUserWishlists() {
    const wishlists = this._getFromStorage('wishlists');
    const wishlistItems = this._getFromStorage('wishlist_items');

    const result = wishlists.map(w => {
      const count = wishlistItems.filter(wi => wi.wishlist_id === w.id).length;
      return {
        id: w.id,
        name: w.name,
        description: w.description || '',
        item_count: count
      };
    });

    return {
      wishlists: result
    };
  }

  // createWishlist(name, description)
  createWishlist(name, description) {
    let wishlists = this._getFromStorage('wishlists');
    const now = this._nowIso();
    const wishlist = {
      id: this._generateId('wishlist'),
      name: name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);

    return {
      wishlist: wishlist
    };
  }

  // renameWishlist(wishlistId, name)
  renameWishlist(wishlistId, name) {
    let wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex(w => w.id === wishlistId);
    if (idx === -1) {
      return { wishlist: null };
    }

    wishlists[idx].name = name;
    wishlists[idx].updated_at = this._nowIso();
    this._saveToStorage('wishlists', wishlists);

    return { wishlist: wishlists[idx] };
  }

  // deleteWishlist(wishlistId)
  deleteWishlist(wishlistId) {
    let wishlists = this._getFromStorage('wishlists');
    const before = wishlists.length;
    wishlists = wishlists.filter(w => w.id !== wishlistId);
    const after = wishlists.length;
    this._saveToStorage('wishlists', wishlists);

    let wishlistItems = this._getFromStorage('wishlist_items');
    wishlistItems = wishlistItems.filter(wi => wi.wishlist_id !== wishlistId);
    this._saveToStorage('wishlist_items', wishlistItems);

    const deleted = before !== after;
    return {
      success: deleted,
      message: deleted ? 'Wishlist deleted' : 'Wishlist not found'
    };
  }

  // getWishlistDetail(wishlistId)
  getWishlistDetail(wishlistId) {
    const wishlists = this._getFromStorage('wishlists');
    const wishlist = wishlists.find(w => w.id === wishlistId) || null;

    const wishlistItems = this._getFromStorage('wishlist_items');
    const products = this._getFromStorage('products');

    const items = wishlistItems
      .filter(wi => wi.wishlist_id === wishlistId)
      .map(wi => {
        const product = products.find(p => p.id === wi.product_id) || null;
        return {
          wishlist_item_id: wi.id,
          product_id: wi.product_id,
          product_name: product ? product.name : null,
          thumbnail_image: product && product.images && product.images.length > 0 ? product.images[0] : null,
          price: product ? product.price : null,
          currency: product ? product.currency || 'usd' : 'usd',
          product_category_label: product ? this._getProductCategoryLabel(product.product_category) : '',
          added_at: wi.added_at,
          product: product
        };
      });

    return {
      wishlist: wishlist,
      items: items
    };
  }

  // addProductToWishlist(wishlistId, productId)
  addProductToWishlist(wishlistId, productId) {
    const wishlist = this._getFromStorage('wishlists').find(w => w.id === wishlistId) || null;
    if (!wishlist) {
      return { wishlist: null };
    }

    const product = this._findProductById(productId);
    if (!product) {
      return { wishlist: wishlist };
    }

    let wishlistItems = this._getFromStorage('wishlist_items');
    const exists = wishlistItems.some(wi => wi.wishlist_id === wishlistId && wi.product_id === productId);
    if (!exists) {
      wishlistItems.push({
        id: this._generateId('witem'),
        wishlist_id: wishlistId,
        product_id: productId,
        added_at: this._nowIso()
      });
      this._saveToStorage('wishlist_items', wishlistItems);
    }

    // Update wishlist updated_at
    let wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex(w => w.id === wishlistId);
    if (idx !== -1) {
      wishlists[idx].updated_at = this._nowIso();
      this._saveToStorage('wishlists', wishlists);
    }

    return { wishlist: wishlist };
  }

  // removeProductFromWishlist(wishlistItemId)
  removeProductFromWishlist(wishlistItemId) {
    let wishlistItems = this._getFromStorage('wishlist_items');
    const before = wishlistItems.length;
    wishlistItems = wishlistItems.filter(wi => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    const removed = wishlistItems.length !== before;
    return {
      success: removed,
      message: removed ? 'Wishlist item removed' : 'Wishlist item not found'
    };
  }

  // moveWishlistItemToWishlist(wishlistItemId, targetWishlistId)
  moveWishlistItemToWishlist(wishlistItemId, targetWishlistId) {
    let wishlistItems = this._getFromStorage('wishlist_items');
    const idx = wishlistItems.findIndex(wi => wi.id === wishlistItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Wishlist item not found'
      };
    }

    const targetWishlist = this._getFromStorage('wishlists').find(w => w.id === targetWishlistId) || null;
    if (!targetWishlist) {
      return {
        success: false,
        message: 'Target wishlist not found'
      };
    }

    wishlistItems[idx].wishlist_id = targetWishlistId;
    this._saveToStorage('wishlist_items', wishlistItems);

    return {
      success: true,
      message: 'Wishlist item moved'
    };
  }

  // addWishlistItemsToCart(wishlistId, wishlistItemIds)
  addWishlistItemsToCart(wishlistId, wishlistItemIds) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const wishlistItems = this._getFromStorage('wishlist_items');
    const products = this._getFromStorage('products');
    const now = this._nowIso();

    let selectedItems;
    if (Array.isArray(wishlistItemIds) && wishlistItemIds.length > 0) {
      const setIds = new Set(wishlistItemIds);
      selectedItems = wishlistItems.filter(wi => wi.wishlist_id === wishlistId && setIds.has(wi.id));
    } else {
      selectedItems = wishlistItems.filter(wi => wi.wishlist_id === wishlistId);
    }

    let addedCount = 0;

    for (const wi of selectedItems) {
      const product = products.find(p => p.id === wi.product_id);
      if (!product) continue;

      let existing = cartItems.find(ci => ci.cart_id === cart.id && ci.product_id === wi.product_id);
      if (existing) {
        existing.quantity += 1;
        existing.added_at = now;
      } else {
        existing = {
          id: this._generateId('cartitem'),
          cart_id: cart.id,
          product_id: wi.product_id,
          quantity: 1,
          unit_price: product.price,
          added_at: now
        };
        cartItems.push(existing);
      }
      addedCount += 1;
    }

    this._saveToStorage('cart_items', cartItems);

    // Update cart updated_at
    let carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex].updated_at = now;
      this._saveToStorage('cart', carts);
    }

    const cartSummary = this._buildCartResponse(cart.id);

    return {
      addedCount: addedCount,
      cart: cartSummary
    };
  }

  // getCommunityHighlights()
  getCommunityHighlights() {
    const events = this._getFromStorage('events');
    const threads = this._getFromStorage('threads');
    const forums = this._getFromStorage('forums');

    const now = new Date();
    const upcomingEvents = events
      .slice()
      .filter(e => new Date(e.start_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        location_city: e.location_city,
        location_country: e.location_country || null
      }));

    const recentThreads = threads
      .slice()
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      .slice(0, 10)
      .map(t => {
        const forum = forums.find(f => f.id === t.forum_id) || null;
        return {
          thread_id: t.id,
          forum_id: t.forum_id,
          forum_name: forum ? forum.name : null,
          subject: t.subject,
          last_updated_at: t.updated_at || t.created_at || null
        };
      });

    return {
      upcomingEvents,
      recentThreads
    };
  }

  // getEvents(city, month, year)
  getEvents(city, month, year) {
    let events = this._getFromStorage('events');

    if (city) {
      const c = city.toLowerCase();
      events = events.filter(e => (e.location_city || '').toLowerCase() === c);
    }

    if (typeof month === 'number') {
      events = events.filter(e => {
        const d = new Date(e.start_datetime);
        return d.getMonth() + 1 === month;
      });
    }

    if (typeof year === 'number') {
      events = events.filter(e => {
        const d = new Date(e.start_datetime);
        return d.getFullYear() === year;
      });
    }

    return {
      events: events
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const event = this._findEventById(eventId);
    const rsvps = this._getFromStorage('event_rsvps');
    const rsvp = rsvps.find(r => r.event_id === eventId) || null;

    if (rsvp) {
      // Foreign key resolution: include event on rsvp
      rsvp.event = event;
    }

    return {
      event: event,
      rsvp: rsvp
    };
  }

  // setEventRSVP(eventId, status, note)
  setEventRSVP(eventId, status, note) {
    const event = this._findEventById(eventId);
    if (!event) {
      return { rsvp: null };
    }

    let rsvps = this._getFromStorage('event_rsvps');
    let rsvp = rsvps.find(r => r.event_id === eventId) || null;
    const now = this._nowIso();

    if (!rsvp) {
      rsvp = {
        id: this._generateId('rsvp'),
        event_id: eventId,
        status: status,
        note: note || '',
        updated_at: now
      };
      rsvps.push(rsvp);
    } else {
      rsvp.status = status;
      rsvp.note = note || '';
      rsvp.updated_at = now;
    }

    this._saveToStorage('event_rsvps', rsvps);
    rsvp.event = event;

    return {
      rsvp: rsvp
    };
  }

  // getTutorialFilterOptions()
  getTutorialFilterOptions() {
    const categories = [
      { value: 'props_weapons', label: 'Props & Weapons' },
      { value: 'costume', label: 'Costume' },
      { value: 'makeup_wig', label: 'Makeup & Wig' },
      { value: 'other', label: 'Other' }
    ];

    const difficulties = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const durationBuckets = [
      { maxMinutes: 10, label: 'Under 10 minutes' },
      { maxMinutes: 20, label: 'Under 20 minutes' },
      { maxMinutes: 30, label: 'Under 30 minutes' }
    ];

    return {
      categories,
      difficulties,
      durationBuckets
    };
  }

  // getTutorials(category, difficulty, maxDurationMinutes, sortBy, page, pageSize)
  getTutorials(category, difficulty, maxDurationMinutes, sortBy, page, pageSize) {
    let tutorials = this._getFromStorage('tutorials');

    if (category) {
      tutorials = tutorials.filter(t => t.category === category);
    }

    if (difficulty) {
      tutorials = tutorials.filter(t => t.difficulty === difficulty);
    }

    if (typeof maxDurationMinutes === 'number') {
      tutorials = tutorials.filter(t => typeof t.duration_minutes === 'number' && t.duration_minutes <= maxDurationMinutes);
    }

    const sortKey = sortBy || 'newest';
    if (sortKey === 'most_liked') {
      tutorials = tutorials.slice().sort((a, b) => {
        const la = typeof a.like_count === 'number' ? a.like_count : 0;
        const lb = typeof b.like_count === 'number' ? b.like_count : 0;
        return lb - la;
      });
    } else if (sortKey === 'duration_short_to_long') {
      tutorials = tutorials.slice().sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
    } else {
      tutorials = tutorials.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    const total = tutorials.length;
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 24;
    const start = (pageNum - 1) * size;
    const paged = tutorials.slice(start, start + size);

    return {
      tutorials: paged,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // getTutorialDetail(tutorialId)
  getTutorialDetail(tutorialId) {
    const tutorial = this._findTutorialById(tutorialId);
    return {
      tutorial: tutorial
    };
  }

  // getTutorialLists()
  getTutorialLists() {
    const lists = this._getFromStorage('tutorial_lists');
    return {
      lists: lists
    };
  }

  // createTutorialList(name, description)
  createTutorialList(name, description) {
    const now = this._nowIso();
    let lists = this._getFromStorage('tutorial_lists');
    const list = {
      id: this._generateId('tutlist'),
      name: name,
      description: description || '',
      created_at: now
    };
    lists.push(list);
    this._saveToStorage('tutorial_lists', lists);
    return {
      list: list
    };
  }

  // addTutorialToList(tutorialId, tutorialListId)
  addTutorialToList(tutorialId, tutorialListId) {
    const tutorial = this._findTutorialById(tutorialId);
    const lists = this._getFromStorage('tutorial_lists');
    const list = lists.find(l => l.id === tutorialListId) || null;

    if (!tutorial || !list) {
      return { listItem: null };
    }

    let listItems = this._getFromStorage('tutorial_list_items');
    const now = this._nowIso();
    const listItem = {
      id: this._generateId('tli'),
      tutorial_list_id: tutorialListId,
      tutorial_id: tutorialId,
      added_at: now
    };
    listItems.push(listItem);
    this._saveToStorage('tutorial_list_items', listItems);

    return {
      listItem: listItem
    };
  }

  // getTutorialComments(tutorialId)
  getTutorialComments(tutorialId) {
    const comments = this._getFromStorage('tutorial_comments').filter(c => c.tutorial_id === tutorialId);
    const tutorial = this._findTutorialById(tutorialId);

    const enriched = comments.map(c => {
      return Object.assign({}, c, { tutorial: tutorial });
    });

    return {
      comments: enriched
    };
  }

  // addTutorialComment(tutorialId, content)
  addTutorialComment(tutorialId, content) {
    const tutorial = this._findTutorialById(tutorialId);
    if (!tutorial) {
      return { comment: null };
    }

    let comments = this._getFromStorage('tutorial_comments');
    const comment = {
      id: this._generateId('tcomment'),
      tutorial_id: tutorialId,
      content: content,
      created_at: this._nowIso()
    };
    comments.push(comment);
    this._saveToStorage('tutorial_comments', comments);

    comment.tutorial = tutorial;
    return {
      comment: comment
    };
  }

  // getForums()
  getForums() {
    const forums = this._getFromStorage('forums');
    return {
      forums: forums
    };
  }

  // getForumThreads(forumId, page, pageSize)
  getForumThreads(forumId, page, pageSize) {
    const forum = this._findForumById(forumId);
    let threads = this._getFromStorage('threads').filter(t => t.forum_id === forumId);

    threads = threads.slice().sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));

    const total = threads.length;
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * size;
    const paged = threads.slice(start, start + size).map(t => Object.assign({}, t, { forum: forum }));

    return {
      threads: paged,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // createThread(forumId, subject, content)
  createThread(forumId, subject, content) {
    const forum = this._findForumById(forumId);
    if (!forum) {
      return { thread: null, firstPost: null };
    }

    const now = this._nowIso();
    let threads = this._getFromStorage('threads');
    const thread = {
      id: this._generateId('thread'),
      forum_id: forumId,
      subject: subject,
      created_at: now,
      updated_at: now
    };
    threads.push(thread);
    this._saveToStorage('threads', threads);

    let posts = this._getFromStorage('posts');
    const firstPost = {
      id: this._generateId('post'),
      thread_id: thread.id,
      content: content,
      created_at: now
    };
    posts.push(firstPost);
    this._saveToStorage('posts', posts);

    return {
      thread: thread,
      firstPost: firstPost
    };
  }

  // getThreadPosts(threadId)
  getThreadPosts(threadId) {
    const thread = this._findThreadById(threadId);
    let posts = this._getFromStorage('posts').filter(p => p.thread_id === threadId);

    posts = posts
      .slice()
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      .map(p => Object.assign({}, p, { thread: thread }));

    return {
      posts: posts
    };
  }

  // addThreadReply(threadId, content)
  addThreadReply(threadId, content) {
    const thread = this._findThreadById(threadId);
    if (!thread) {
      return { post: null };
    }

    const now = this._nowIso();
    let posts = this._getFromStorage('posts');
    const post = {
      id: this._generateId('post'),
      thread_id: threadId,
      content: content,
      created_at: now
    };
    posts.push(post);
    this._saveToStorage('posts', posts);

    // Update thread updated_at
    let threads = this._getFromStorage('threads');
    const idx = threads.findIndex(t => t.id === threadId);
    if (idx !== -1) {
      threads[idx].updated_at = now;
      this._saveToStorage('threads', threads);
    }

    post.thread = thread;
    return {
      post: post
    };
  }

  // getGalleryTagOptions()
  getGalleryTagOptions() {
    const galleries = this._getFromStorage('galleries');
    const tagsSet = new Set();

    for (const g of galleries) {
      if (Array.isArray(g.tags)) {
        for (const t of g.tags) {
          if (t) tagsSet.add(String(t));
        }
      }
    }

    const tags = Array.from(tagsSet).sort().map(value => ({
      value: value,
      label: value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    }));

    return {
      tags: tags
    };
  }

  // getGalleries(tag, sortBy, page, pageSize)
  getGalleries(tag, sortBy, page, pageSize) {
    let galleries = this._getFromStorage('galleries');

    if (tag) {
      galleries = galleries.filter(g => Array.isArray(g.tags) && g.tags.includes(tag));
    }

    const sortKey = sortBy || 'newest';
    if (sortKey === 'most_liked') {
      galleries = galleries.slice().sort((a, b) => {
        const la = typeof a.like_count === 'number' ? a.like_count : 0;
        const lb = typeof b.like_count === 'number' ? b.like_count : 0;
        return lb - la;
      });
    } else {
      galleries = galleries.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    const total = galleries.length;
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 24;
    const start = (pageNum - 1) * size;
    const paged = galleries.slice(start, start + size);

    return {
      galleries: paged,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // getGalleryDetail(galleryId)
  getGalleryDetail(galleryId) {
    const gallery = this._findGalleryById(galleryId);
    let photos = this._getFromStorage('gallery_photos').filter(p => p.gallery_id === galleryId);

    photos = photos
      .slice()
      .sort((a, b) => {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return sa - sb;
      })
      .map(p => Object.assign({}, p, { gallery: gallery }));

    return {
      gallery: gallery,
      photos: photos
    };
  }

  // getGalleryBoards()
  getGalleryBoards() {
    const boards = this._getFromStorage('gallery_boards');
    return {
      boards: boards
    };
  }

  // createGalleryBoard(name, description)
  createGalleryBoard(name, description) {
    const now = this._nowIso();
    let boards = this._getFromStorage('gallery_boards');
    const board = {
      id: this._generateId('gboard'),
      name: name,
      description: description || '',
      created_at: now
    };
    boards.push(board);
    this._saveToStorage('gallery_boards', boards);
    return {
      board: board
    };
  }

  // saveGalleryToBoard(galleryId, galleryBoardId)
  saveGalleryToBoard(galleryId, galleryBoardId) {
    const gallery = this._findGalleryById(galleryId);
    const boards = this._getFromStorage('gallery_boards');
    const board = boards.find(b => b.id === galleryBoardId) || null;

    if (!gallery || !board) {
      return { boardItem: null };
    }

    let items = this._getFromStorage('gallery_board_items');
    const now = this._nowIso();
    const boardItem = {
      id: this._generateId('gbitem'),
      gallery_board_id: galleryBoardId,
      gallery_id: galleryId,
      added_at: now
    };
    items.push(boardItem);
    this._saveToStorage('gallery_board_items', items);

    return {
      boardItem: boardItem
    };
  }

  // likeGalleryPhoto(photoId)
  likeGalleryPhoto(photoId) {
    const now = this._nowIso();
    let likes = this._getFromStorage('gallery_photo_likes');
    const like = {
      id: this._generateId('gplike'),
      photo_id: photoId,
      created_at: now
    };
    likes.push(like);
    this._saveToStorage('gallery_photo_likes', likes);

    // Update like_count on photo
    let photos = this._getFromStorage('gallery_photos');
    const idx = photos.findIndex(p => p.id === photoId);
    if (idx !== -1) {
      const current = typeof photos[idx].like_count === 'number' ? photos[idx].like_count : 0;
      photos[idx].like_count = current + 1;
      this._saveToStorage('gallery_photos', photos);
    }

    const updatedPhoto = photos.find(p => p.id === photoId) || null;
    const count = updatedPhoto && typeof updatedPhoto.like_count === 'number' ? updatedPhoto.like_count : 0;

    return {
      like: like,
      photo_like_count: count
    };
  }

  // getCostumeBuilds()
  getCostumeBuilds() {
    const builds = this._getFromStorage('costume_builds');
    return {
      builds: builds
    };
  }

  // getCostumeBuildDetail(buildId)
  getCostumeBuildDetail(buildId) {
    const build = this._findBuildById(buildId);
    const suggestions = this._getFromStorage('build_suggestions');
    let items = this._getFromStorage('build_items').filter(i => i.costume_build_id === buildId);

    items = items.map(i => {
      const suggestion = i.suggestion_id ? suggestions.find(s => s.id === i.suggestion_id) || null : null;
      return Object.assign({}, i, {
        costume_build: build,
        suggestion: suggestion
      });
    });

    return {
      build: build,
      items: items
    };
  }

  // createCostumeBuild(name, description, targetCompletionDate)
  createCostumeBuild(name, description, targetCompletionDate) {
    const now = this._nowIso();
    let builds = this._getFromStorage('costume_builds');
    const build = {
      id: this._generateId('build'),
      name: name,
      description: description || '',
      target_completion_date: targetCompletionDate || null,
      created_at: now,
      updated_at: now
    };
    builds.push(build);
    this._saveToStorage('costume_builds', builds);

    return {
      build: build
    };
  }

  // updateCostumeBuild(buildId, name, description, targetCompletionDate)
  updateCostumeBuild(buildId, name, description, targetCompletionDate) {
    let builds = this._getFromStorage('costume_builds');
    const idx = builds.findIndex(b => b.id === buildId);
    if (idx === -1) {
      return { build: null };
    }

    if (typeof name === 'string') {
      builds[idx].name = name;
    }
    if (typeof description === 'string') {
      builds[idx].description = description;
    }
    if (typeof targetCompletionDate === 'string') {
      builds[idx].target_completion_date = targetCompletionDate;
    }
    builds[idx].updated_at = this._nowIso();

    this._saveToStorage('costume_builds', builds);
    return {
      build: builds[idx]
    };
  }

  // getBuildSuggestions()
  getBuildSuggestions() {
    const suggestions = this._getFromStorage('build_suggestions');
    return {
      suggestions: suggestions
    };
  }

  // addSuggestionsToBuild(buildId, suggestionIds)
  addSuggestionsToBuild(buildId, suggestionIds) {
    const build = this._findBuildById(buildId);
    if (!build || !Array.isArray(suggestionIds)) {
      return { items: [] };
    }

    const suggestions = this._getFromStorage('build_suggestions');
    let items = this._getFromStorage('build_items');
    const now = this._nowIso();

    const addedItems = [];

    for (const sid of suggestionIds) {
      const suggestion = suggestions.find(s => s.id === sid);
      if (!suggestion) continue;

      const item = {
        id: this._generateId('bitem'),
        costume_build_id: buildId,
        name: suggestion.name,
        due_date: null,
        status: 'not_started',
        suggestion_id: suggestion.id,
        created_at: now,
        completed_at: null
      };
      items.push(item);
      addedItems.push(Object.assign({}, item, { costume_build: build, suggestion: suggestion }));
    }

    this._saveToStorage('build_items', items);

    return {
      items: addedItems
    };
  }

  // updateBuildItemDueDate(buildItemId, dueDate)
  updateBuildItemDueDate(buildItemId, dueDate) {
    let items = this._getFromStorage('build_items');
    const idx = items.findIndex(i => i.id === buildItemId);
    if (idx === -1) {
      return { item: null };
    }

    items[idx].due_date = dueDate;
    this._saveToStorage('build_items', items);

    const build = this._findBuildById(items[idx].costume_build_id);
    const suggestion = items[idx].suggestion_id ? this._findBuildSuggestionById(items[idx].suggestion_id) : null;

    const enriched = Object.assign({}, items[idx], {
      costume_build: build,
      suggestion: suggestion
    });

    return {
      item: enriched
    };
  }

  // saveCostumeBuild(buildId)
  saveCostumeBuild(buildId) {
    let builds = this._getFromStorage('costume_builds');
    const idx = builds.findIndex(b => b.id === buildId);
    if (idx === -1) {
      return { build: null };
    }

    builds[idx].updated_at = this._nowIso();
    this._saveToStorage('costume_builds', builds);

    return {
      build: builds[idx]
    };
  }

  // addPatternToLibrary(productId)
  addPatternToLibrary(productId) {
    const product = this._findProductById(productId);
    if (!product) {
      return { libraryItem: null };
    }

    let items = this._getFromStorage('pattern_library_items');
    const existing = items.find(i => i.product_id === productId);
    if (existing) {
      return { libraryItem: existing };
    }

    const libraryItem = {
      id: this._generateId('plib'),
      product_id: productId,
      added_at: this._nowIso()
    };
    items.push(libraryItem);
    this._saveToStorage('pattern_library_items', items);

    return {
      libraryItem: libraryItem
    };
  }

  // getPatternLibraryItems()
  getPatternLibraryItems() {
    const items = this._getFromStorage('pattern_library_items');
    const products = this._getFromStorage('products');

    const enriched = items.map(i => {
      const product = products.find(p => p.id === i.product_id) || null;
      return {
        library_item_id: i.id,
        product_id: i.product_id,
        product_name: product ? product.name : null,
        thumbnail_image: product && product.images && product.images.length > 0 ? product.images[0] : null,
        added_at: i.added_at,
        product: product
      };
    });

    return {
      items: enriched
    };
  }

  // markProductAsOwned(productId)
  markProductAsOwned(productId) {
    const product = this._findProductById(productId);
    if (!product) {
      return { ownedItem: null };
    }

    let ownedItems = this._getFromStorage('owned_items');
    let ownedItem = ownedItems.find(o => o.product_id === productId) || null;

    if (!ownedItem) {
      ownedItem = {
        id: this._generateId('owned'),
        product_id: productId,
        marked_at: this._nowIso()
      };
      ownedItems.push(ownedItem);
      this._saveToStorage('owned_items', ownedItems);
    }

    ownedItem.product = product;

    return {
      ownedItem: ownedItem
    };
  }

  // submitProductReview(productId, rating, content)
  submitProductReview(productId, rating, content) {
    const product = this._findProductById(productId);
    if (!product) {
      return { review: null };
    }

    let reviews = this._getFromStorage('reviews');
    const now = this._nowIso();
    const review = {
      id: this._generateId('review'),
      product_id: productId,
      rating: rating,
      content: content,
      created_at: now
    };
    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    // Recalculate product average_rating and rating_count
    const productReviews = reviews.filter(r => r.product_id === productId);
    const ratingCount = productReviews.length;
    const avgRating = ratingCount > 0
      ? productReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingCount
      : null;

    let products = this._getFromStorage('products');
    const idx = products.findIndex(p => p.id === productId);
    if (idx !== -1) {
      products[idx].average_rating = avgRating;
      products[idx].rating_count = ratingCount;
      this._saveToStorage('products', products);
    }

    review.product = product;

    return {
      review: review
    };
  }

  // getProductReviews(productId)
  getProductReviews(productId) {
    const product = this._findProductById(productId);
    const reviews = this._getFromStorage('reviews')
      .filter(r => r.product_id === productId)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map(r => Object.assign({}, r, { product: product }));

    return {
      reviews: reviews
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
