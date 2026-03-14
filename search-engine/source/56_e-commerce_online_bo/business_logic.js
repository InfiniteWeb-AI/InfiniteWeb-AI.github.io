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
    this._getNextIdCounter(); // advance once to avoid clashes with pre-existing data
  }

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const tables = [
      'users',
      'products',
      'categories',
      'authors',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'orders',
      'order_items',
      'promo_codes'
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

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
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

  // ----------------------
  // Entity enrichment helpers (foreign key resolution)
  // ----------------------
  _enrichProduct(product) {
    if (!product) return null;
    const categories = this._getFromStorage('categories', []);
    const authors = this._getFromStorage('authors', []);
    const clone = { ...product };
    clone.category = categories.find(c => c.id === product.categoryId) || null;
    clone.author = authors.find(a => a.id === product.authorId) || null;
    // Optionally resolve recommended products as objects list
    if (Array.isArray(product.recommendedProductIds)) {
      const products = this._getFromStorage('products', []);
      clone.recommendedProducts = product.recommendedProductIds
        .map(id => products.find(p => p.id === id))
        .filter(p => !!p)
        .map(p => {
          // Enrich nested recommended products minimally with category and author
          const nested = { ...p };
          nested.category = categories.find(c => c.id === p.categoryId) || null;
          nested.author = authors.find(a => a.id === p.authorId) || null;
          return nested;
        });
    }
    return clone;
  }

  _enrichCategory(category, allCategories) {
    if (!category) return null;
    const clone = { ...category };
    if (category.parentCategoryId) {
      clone.parentCategory = (allCategories || []).find(c => c.id === category.parentCategoryId) || null;
    } else {
      clone.parentCategory = null;
    }
    return clone;
  }

  // ----------------------
  // Cart helpers
  // ----------------------
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts.find(c => c.status === 'active');
    const now = new Date().toISOString();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        items: [], // array of CartItem.id
        promoCodeIds: [],
        currency: 'usd',
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        createdAt: now,
        updatedAt: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const promoCodesAll = this._getFromStorage('promo_codes', []);
    const cartItemIds = Array.isArray(cart.items) ? cart.items : [];
    const cartItems = cartItemsAll.filter(ci => ci.cartId === cart.id && cartItemIds.includes(ci.id));

    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += Number(item.lineTotal || 0);
    }

    let discountTotal = 0;
    const now = new Date();
    const promoCodeIds = Array.isArray(cart.promoCodeIds) ? cart.promoCodeIds : [];
    for (const promoId of promoCodeIds) {
      const promo = promoCodesAll.find(p => p.id === promoId);
      if (!promo) continue;
      if (!promo.isActive) continue;
      if (promo.validFrom && new Date(promo.validFrom) > now) continue;
      if (promo.validTo && new Date(promo.validTo) < now) continue;
      if (typeof promo.minOrderTotal === 'number' && subtotal < promo.minOrderTotal) continue;
      let discount = 0;
      if (promo.discountType === 'percentage') {
        discount = subtotal * (Number(promo.discountValue) / 100);
      } else if (promo.discountType === 'fixed_amount') {
        discount = Number(promo.discountValue);
      }
      if (discount > subtotal) discount = subtotal;
      discountTotal += discount;
    }

    if (discountTotal > subtotal) discountTotal = subtotal;

    cart.subtotal = Number(subtotal.toFixed(2));
    cart.discountTotal = Number(discountTotal.toFixed(2));
    cart.total = Number((subtotal - discountTotal).toFixed(2));
    cart.updatedAt = new Date().toISOString();

    // Persist cart
    let carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }
  }

  // ----------------------
  // Wishlist helper
  // ----------------------
  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    let wishlist = wishlists[0] || null;
    const now = new Date().toISOString();
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'Default wishlist',
        items: [], // array of WishlistItem.id
        createdAt: now,
        updatedAt: now
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  // ----------------------
  // Promo helper
  // ----------------------
  _validatePromoCode(code, cart) {
    const promos = this._getFromStorage('promo_codes', []);
    const promo = promos.find(p => (p.code || '').toLowerCase() === String(code || '').toLowerCase());
    if (!promo) {
      return { valid: false, promo: null, message: 'Promo code not found.' };
    }
    if (!promo.isActive) {
      return { valid: false, promo: null, message: 'Promo code is not active.' };
    }
    const now = new Date();
    if (promo.validFrom && new Date(promo.validFrom) > now) {
      return { valid: false, promo: null, message: 'Promo code is not yet valid.' };
    }
    if (promo.validTo && new Date(promo.validTo) < now) {
      return { valid: false, promo: null, message: 'Promo code has expired.' };
    }
    const subtotal = Number(cart.subtotal || 0);
    if (typeof promo.minOrderTotal === 'number' && subtotal < promo.minOrderTotal) {
      return { valid: false, promo: null, message: 'Order total is too low for this promo code.' };
    }
    if (typeof promo.maxUses === 'number') {
      const uses = typeof promo.uses === 'number' ? promo.uses : 0;
      if (uses >= promo.maxUses) {
        return { valid: false, promo: null, message: 'Promo code usage limit reached.' };
      }
    }
    return { valid: true, promo, message: 'Promo code applied.' };
  }

  // ----------------------
  // Order helper
  // ----------------------
  _createOrderFromCart(cart, purchaserName, purchaserEmail, paymentMethod, paymentDetails) {
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const promoCodesAll = this._getFromStorage('promo_codes', []);

    const cartItemIds = Array.isArray(cart.items) ? cart.items : [];
    const cartItems = cartItemsAll.filter(ci => ci.cartId === cart.id && cartItemIds.includes(ci.id));
    if (!cartItems.length) {
      return { success: false, order: null, orderItems: [], message: 'Cart is empty.' };
    }

    const nowIso = new Date().toISOString();
    const orderId = this._generateId('order');

    const orderItems = [];
    let includesPreorders = false;

    for (const ci of cartItems) {
      const product = products.find(p => p.id === ci.productId);
      const orderItem = {
        id: this._generateId('order_item'),
        orderId: orderId,
        productId: ci.productId,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        lineTotal: ci.lineTotal,
        isPreorder: !!ci.isPreorder,
        releaseDate: product && product.releaseDate ? product.releaseDate : null
      };
      if (orderItem.isPreorder) includesPreorders = true;
      orderItems.push(orderItem);
    }

    const order = {
      id: orderId,
      orderNumber: 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
      cartId: cart.id,
      status: 'paid', // simulate successful payment
      items: orderItems.map(oi => oi.id),
      promoCodeIds: Array.isArray(cart.promoCodeIds) ? [...cart.promoCodeIds] : [],
      currency: cart.currency || 'usd',
      subtotal: cart.subtotal,
      discountTotal: cart.discountTotal,
      total: cart.total,
      estimatedTax: 0,
      purchaserName,
      purchaserEmail,
      paymentMethod,
      paymentReference: paymentDetails && (paymentDetails.paymentToken || paymentDetails.paypalOrderId || 'simulated_ref_' + Date.now()),
      includesPreorders: includesPreorders,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Persist order and order items
    let orders = this._getFromStorage('orders', []);
    let orderItemsAll = this._getFromStorage('order_items', []);
    orders.push(order);
    orderItemsAll = orderItemsAll.concat(orderItems);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItemsAll);

    // Mark cart as checked_out
    let carts = this._getFromStorage('carts', []);
    const cartIdx = carts.findIndex(c => c.id === cart.id);
    if (cartIdx !== -1) {
      carts[cartIdx] = { ...cart, status: 'checked_out', updatedAt: nowIso };
      this._saveToStorage('carts', carts);
    }

    // Increment promo uses if needed
    if (Array.isArray(order.promoCodeIds) && order.promoCodeIds.length) {
      let promosChanged = false;
      for (const promoId of order.promoCodeIds) {
        const promo = promoCodesAll.find(p => p.id === promoId);
        if (!promo) continue;
        const currentUses = typeof promo.uses === 'number' ? promo.uses : 0;
        promo.uses = currentUses + 1;
        promosChanged = true;
      }
      if (promosChanged) {
        this._saveToStorage('promo_codes', promoCodesAll);
      }
    }

    const itemsWithProducts = orderItems.map(oi => ({
      orderItem: oi,
      product: this._enrichProduct(products.find(p => p.id === oi.productId) || null)
    }));

    return { success: true, order, orderItems: itemsWithProducts, message: 'Order placed successfully.' };
  }

  // ----------------------
  // Generic helpers
  // ----------------------
  _persistState() {
    // No-op in this implementation because each mutation saves immediately.
    // Exists to satisfy interface and allow future batching.
  }

  _sortProducts(products, sortBy) {
    const arr = [...products];
    if (!sortBy) return arr;
    const getDate = d => (d ? new Date(d).getTime() : 0);

    switch (sortBy) {
      case 'price_asc':
        arr.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        break;
      case 'price_desc':
        arr.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        break;
      case 'publication_date_desc':
        arr.sort((a, b) => getDate(b.publicationDate) - getDate(a.publicationDate));
        break;
      case 'publication_date_asc':
        arr.sort((a, b) => getDate(a.publicationDate) - getDate(b.publicationDate));
        break;
      case 'rating_desc':
        arr.sort((a, b) => {
          const diff = Number(b.averageRating || 0) - Number(a.averageRating || 0);
          if (diff !== 0) return diff;
          return Number(b.ratingCount || 0) - Number(a.ratingCount || 0);
        });
        break;
      case 'rating_asc':
        arr.sort((a, b) => {
          const diff = Number(a.averageRating || 0) - Number(b.averageRating || 0);
          if (diff !== 0) return diff;
          return Number(a.ratingCount || 0) - Number(b.ratingCount || 0);
        });
        break;
      case 'release_date_asc':
        arr.sort((a, b) => getDate(a.releaseDate) - getDate(b.releaseDate));
        break;
      case 'release_date_desc':
        arr.sort((a, b) => getDate(b.releaseDate) - getDate(a.releaseDate));
        break;
      default:
        break;
    }
    return arr;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getCategories(): Category[] (with parentCategory resolved)
  getCategories() {
    const categories = this._getFromStorage('categories', []);
    return categories.map(cat => this._enrichCategory(cat, categories));
  }

  // getHomepageFeaturedProducts(): { featured, topRated, newReleases }
  getHomepageFeaturedProducts() {
    const products = this._getFromStorage('products', []);
    const enriched = products.map(p => this._enrichProduct(p));

    const byRating = [...enriched].sort((a, b) => {
      const diff = Number(b.averageRating || 0) - Number(a.averageRating || 0);
      if (diff !== 0) return diff;
      return Number(b.ratingCount || 0) - Number(a.ratingCount || 0);
    });

    const byPubDate = [...enriched].sort((a, b) => {
      const da = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
      const db = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
      return db - da;
    });

    return {
      featured: byRating.slice(0, 5),
      topRated: byRating.slice(0, 5),
      newReleases: byPubDate.slice(0, 5)
    };
  }

  // getActivePromotions(): PromoCode[]
  getActivePromotions() {
    const promos = this._getFromStorage('promo_codes', []);
    const now = new Date();
    return promos.filter(p => {
      if (!p.isActive) return false;
      if (p.validFrom && new Date(p.validFrom) > now) return false;
      if (p.validTo && new Date(p.validTo) < now) return false;
      if (typeof p.maxUses === 'number') {
        const uses = typeof p.uses === 'number' ? p.uses : 0;
        if (uses >= p.maxUses) return false;
      }
      return true;
    });
  }

  // getCartSummary(): { itemCount, subtotal, discountTotal, total, hasPreorders }
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const cartItemIds = Array.isArray(cart.items) ? cart.items : [];
    const cartItems = cartItemsAll.filter(ci => ci.cartId === cart.id && cartItemIds.includes(ci.id));

    const itemCount = cartItems.reduce((sum, ci) => sum + Number(ci.quantity || 0), 0);
    const hasPreorders = cartItems.some(ci => !!ci.isPreorder);

    return {
      itemCount,
      subtotal: cart.subtotal || 0,
      discountTotal: cart.discountTotal || 0,
      total: cart.total || 0,
      hasPreorders
    };
  }

  // getWishlistSummary(): { itemCount }
  getWishlistSummary() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItemsAll = this._getFromStorage('wishlist_items', []);
    const wishlistItemIds = Array.isArray(wishlist.items) ? wishlist.items : [];
    const wishlistItems = wishlistItemsAll.filter(wi => wi.wishlistId === wishlist.id && wishlistItemIds.includes(wi.id));
    return { itemCount: wishlistItems.length };
  }

  // getBrowseFilterOptions()
  getBrowseFilterOptions() {
    const products = this._getFromStorage('products', []);
    let min = null;
    let max = null;
    for (const p of products) {
      if (typeof p.price !== 'number') continue;
      if (min === null || p.price < min) min = p.price;
      if (max === null || p.price > max) max = p.price;
    }
    if (min === null) min = 0;
    if (max === null) max = 0;

    return {
      languages: [
        { code: 'english', label: 'English' },
        { code: 'spanish', label: 'Spanish' },
        { code: 'french', label: 'French' },
        { code: 'german', label: 'German' },
        { code: 'other', label: 'Other' }
      ],
      availabilityOptions: [
        { code: 'available', label: 'Available now' },
        { code: 'upcoming', label: 'Upcoming' },
        { code: 'preorder', label: 'Preorder' }
      ],
      ratingPresets: [
        { id: 'stars_4_up', minRating: 4.0, label: '4 stars & up' },
        { id: 'stars_4_2_up', minRating: 4.2, label: '4.2 stars & up' },
        { id: 'stars_4_3_up', minRating: 4.3, label: '4.3 stars & up' },
        { id: 'stars_4_5_up', minRating: 4.5, label: '4.5 stars & up' }
      ],
      defaultPriceRange: { min, max }
    };
  }

  // getBrowseSortOptions()
  getBrowseSortOptions() {
    return [
      { id: 'price_asc', label: 'Price: Low to High', description: 'Sort by price ascending' },
      { id: 'price_desc', label: 'Price: High to Low', description: 'Sort by price descending' },
      { id: 'publication_date_desc', label: 'Publication Date: Newest First', description: 'Newest publication date first' },
      { id: 'publication_date_asc', label: 'Publication Date: Oldest First', description: 'Oldest publication date first' },
      { id: 'rating_desc', label: 'Customer Rating: High to Low', description: 'Highest rated first' },
      { id: 'rating_asc', label: 'Customer Rating: Low to High', description: 'Lowest rated first' },
      { id: 'release_date_asc', label: 'Release Date: Soonest First', description: 'Soonest upcoming release first' },
      { id: 'release_date_desc', label: 'Release Date: Latest First', description: 'Latest release date first' }
    ];
  }

  // searchProducts(query, categoryCode, filters, sortBy, page, pageSize)
  searchProducts(query, categoryCode, filters, sortBy, page, pageSize) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const authors = this._getFromStorage('authors', []);

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    // Instrumentation for task completion tracking related to searchProducts
    try {
      // Task 1: 'time management' search with specific filters/sort
      if (q && q.includes('time management')) {
        localStorage.setItem(
          'task1_searchParams',
          JSON.stringify({ query, categoryCode, filters, sortBy })
        );
      }

      // Helper to safely resolve category by code
      const resolveCategoryByCode = code => {
        if (!code) return null;
        return categories.find(c => c && c.code === code) || null;
      };

      // Task 2: Science Fiction category, price 5–12, minRating >= 4.2, sortBy publication_date_desc
      if (categoryCode) {
        const category = resolveCategoryByCode(categoryCode);
        const codeStr = String(categoryCode).toLowerCase();
        const isSciFiByCode = codeStr.includes('science') && codeStr.includes('fiction');
        const isSciFiByName =
          category &&
          ['name', 'title', 'label']
            .map(prop => category[prop])
            .some(
              v =>
                typeof v === 'string' &&
                v.toLowerCase() === 'science fiction'
            );
        const isSciFiContext = isSciFiByCode || isSciFiByName;

        if (
          isSciFiContext &&
          typeof f.minPrice === 'number' &&
          f.minPrice >= 5 &&
          typeof f.maxPrice === 'number' &&
          f.maxPrice <= 12 &&
          typeof f.minRating === 'number' &&
          f.minRating >= 4.2 &&
          sortBy === 'publication_date_desc'
        ) {
          localStorage.setItem(
            'task2_searchParams',
            JSON.stringify({ query, categoryCode, filters, sortBy })
          );
        }
      }

      // Task 3: Business & Economics category, minPrice >= 20, minRating >= 4.5, sortBy rating_desc
      if (categoryCode) {
        const category = resolveCategoryByCode(categoryCode);
        const codeStr3 = String(categoryCode).toLowerCase();
        const isBusinessByCode =
          codeStr3.includes('business') &&
          (codeStr3.includes('economics') || codeStr3.includes('econ'));
        const businessNames = [
          'business & economics',
          'business and economics',
          'business economics'
        ];
        const isBusinessByName =
          category &&
          ['name', 'title', 'label']
            .map(prop => category[prop])
            .some(
              v =>
                typeof v === 'string' &&
                businessNames.includes(v.toLowerCase())
            );
        const isBusinessContext = isBusinessByCode || isBusinessByName;

        if (
          isBusinessContext &&
          typeof f.minPrice === 'number' &&
          f.minPrice >= 20 &&
          typeof f.minRating === 'number' &&
          f.minRating >= 4.5 &&
          sortBy === 'rating_desc'
        ) {
          localStorage.setItem(
            'task3_searchParams',
            JSON.stringify({ query, categoryCode, filters, sortBy })
          );
        }
      }

      // Task 4: 'python programming' query, maxPrice <= 30, sortBy rating_desc
      if (
        q &&
        q.includes('python programming') &&
        typeof f.maxPrice === 'number' &&
        f.maxPrice <= 30 &&
        sortBy === 'rating_desc'
      ) {
        localStorage.setItem(
          'task4_searchParams',
          JSON.stringify({ query, categoryCode, filters, sortBy })
        );
      }

      // Task 5: Fantasy category, upcoming/preorder after 2025-01-01, maxPrice <= 25, sortBy release_date_asc
      if (categoryCode) {
        const category = resolveCategoryByCode(categoryCode);
        const codeStr5 = String(categoryCode).toLowerCase();
        const isFantasyByCode = codeStr5.includes('fantasy');
        const isFantasyByName =
          category &&
          ['name', 'title', 'label']
            .map(prop => category[prop])
            .some(
              v =>
                typeof v === 'string' &&
                v.toLowerCase() === 'fantasy'
            );
        const isFantasyContext = isFantasyByCode || isFantasyByName;

        const hasUpcomingFilter =
          f.availability === 'upcoming' || f.onlyPreorderAvailable === true;
        const releaseFrom = f.releaseDateFrom
          ? new Date(f.releaseDateFrom)
          : null;
        const cutoff = new Date('2025-01-01');
        const releaseDateOk =
          releaseFrom instanceof Date && !isNaN(releaseFrom) && releaseFrom >= cutoff;

        if (
          isFantasyContext &&
          hasUpcomingFilter &&
          releaseDateOk &&
          typeof f.maxPrice === 'number' &&
          f.maxPrice <= 25 &&
          sortBy === 'release_date_asc'
        ) {
          localStorage.setItem(
            'task5_searchParams',
            JSON.stringify({ query, categoryCode, filters, sortBy })
          );
        }
      }

      // Task 6: Romance category, minPrice >= 15, minRating >= 4.0, sortBy rating_desc
      if (categoryCode) {
        const category = resolveCategoryByCode(categoryCode);
        const codeStr6 = String(categoryCode).toLowerCase();
        const isRomanceByCode = codeStr6.includes('romance');
        const isRomanceByName =
          category &&
          ['name', 'title', 'label']
            .map(prop => category[prop])
            .some(
              v =>
                typeof v === 'string' &&
                v.toLowerCase() === 'romance'
            );
        const isRomanceContext = isRomanceByCode || isRomanceByName;

        if (
          isRomanceContext &&
          typeof f.minPrice === 'number' &&
          f.minPrice >= 15 &&
          typeof f.minRating === 'number' &&
          f.minRating >= 4.0 &&
          sortBy === 'rating_desc'
        ) {
          localStorage.setItem(
            'task6_searchParams',
            JSON.stringify({ query, categoryCode, filters, sortBy })
          );
        }
      }

      // Task 7: Self-Help category, language 'spanish', maxPrice <= 12, minRating >= 4.3, sortBy price_asc
      if (categoryCode) {
        const category = resolveCategoryByCode(categoryCode);
        const codeStr7 = String(categoryCode).toLowerCase();
        const isSelfHelpByCode =
          codeStr7.includes('self') && codeStr7.includes('help');
        const selfHelpNames = ['self-help', 'self help'];
        const isSelfHelpByName =
          category &&
          ['name', 'title', 'label']
            .map(prop => category[prop])
            .some(
              v =>
                typeof v === 'string' &&
                selfHelpNames.includes(v.toLowerCase())
            );
        const isSelfHelpContext = isSelfHelpByCode || isSelfHelpByName;

        if (
          isSelfHelpContext &&
          f.language === 'spanish' &&
          typeof f.maxPrice === 'number' &&
          f.maxPrice <= 12 &&
          typeof f.minRating === 'number' &&
          f.minRating >= 4.3 &&
          sortBy === 'price_asc'
        ) {
          localStorage.setItem(
            'task7_searchParams',
            JSON.stringify({ query, categoryCode, filters, sortBy })
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error in searchProducts:', e);
    }

    let result = products.filter(p => {
      // Format filter (only ebooks are relevant; all are ebook by model)
      if (p.format && p.format !== 'ebook') return false;
      return true;
    });

    // Category filter with hierarchy
    if (categoryCode) {
      const category = categories.find(c => c.code === categoryCode);
      if (category) {
        const allowedIds = new Set();
        const stack = [category.id];
        while (stack.length) {
          const cid = stack.pop();
          if (allowedIds.has(cid)) continue;
          allowedIds.add(cid);
          const children = categories.filter(c => c.parentCategoryId === cid);
          for (const child of children) {
            stack.push(child.id);
          }
        }
        result = result.filter(p => allowedIds.has(p.categoryId));
      }
    }

    // Text query over title, subtitle, description, keywords, author name
    if (q) {
      result = result.filter(p => {
        const author = authors.find(a => a.id === p.authorId);
        const fields = [
          p.title,
          p.subtitle,
          p.description,
          ...(Array.isArray(p.keywords) ? p.keywords : []),
          author ? author.name : null
        ];
        return fields.some(v => v && String(v).toLowerCase().includes(q));
      });
    }

    // Price filters
    if (typeof f.minPrice === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price <= f.maxPrice);
    }

    // Rating filter
    if (typeof f.minRating === 'number') {
      result = result.filter(p => typeof p.averageRating === 'number' && p.averageRating >= f.minRating);
    }

    // Language filter
    if (f.language) {
      result = result.filter(p => p.language === f.language);
    }

    // Availability filter
    if (f.availability === 'available') {
      result = result.filter(p => p.availabilityStatus === 'available');
    } else if (f.availability === 'upcoming') {
      result = result.filter(p => p.availabilityStatus === 'upcoming');
    }

    // Release date range (for upcoming/preorders)
    if (f.releaseDateFrom) {
      const fromTime = new Date(f.releaseDateFrom).getTime();
      result = result.filter(p => !p.releaseDate || new Date(p.releaseDate).getTime() >= fromTime);
    }
    if (f.releaseDateTo) {
      const toTime = new Date(f.releaseDateTo).getTime();
      result = result.filter(p => !p.releaseDate || new Date(p.releaseDate).getTime() <= toTime);
    }

    // onlyPreorderAvailable
    if (f.onlyPreorderAvailable) {
      result = result.filter(p => p.availabilityStatus === 'upcoming' && !!p.isPreorderAvailable);
    }

    // Sorting
    result = this._sortProducts(result, sortBy);

    const total = result.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = result.slice(start, end).map(p => this._enrichProduct(p));

    return {
      products: pageItems,
      total,
      page: pg,
      pageSize: size
    };
  }

  // searchAuthors(query, page, pageSize)
  searchAuthors(query, page, pageSize) {
    const authors = this._getFromStorage('authors', []);
    const q = (query || '').trim().toLowerCase();
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    // Instrumentation for task 8: searching for 'neil gaiman'
    try {
      if (q && q.includes('neil gaiman')) {
        localStorage.setItem(
          'task8_authorSearchParams',
          JSON.stringify({ query, page, pageSize })
        );
      }
    } catch (e) {
      console.error('Instrumentation error in searchAuthors:', e);
    }

    let result = authors;
    if (q) {
      result = result.filter(a => a.name && a.name.toLowerCase().includes(q));
    }

    const total = result.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = result.slice(start, end);

    return {
      authors: pageItems,
      total,
      page: pg,
      pageSize: size
    };
  }

  // getAuthorDetails(authorId)
  getAuthorDetails(authorId) {
    const authors = this._getFromStorage('authors', []);
    return authors.find(a => a.id === authorId) || null;
  }

  // getAuthorProducts(authorId, filters, sortBy, page, pageSize)
  getAuthorProducts(authorId, filters, sortBy, page, pageSize) {
    const products = this._getFromStorage('products', []);

    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    // Instrumentation for task 8: browsing Neil Gaiman's products sorted by rating_desc
    try {
      const authors = this._getFromStorage('authors', []);
      const author = authors.find(a => a.id === authorId);
      const isNeilGaiman =
        author &&
        typeof author.name === 'string' &&
        author.name.toLowerCase() === 'neil gaiman';

      if (isNeilGaiman && sortBy === 'rating_desc') {
        localStorage.setItem(
          'task8_authorBrowseParams',
          JSON.stringify({ authorId, filters, sortBy, page, pageSize })
        );
      }
    } catch (e) {
      console.error('Instrumentation error in getAuthorProducts:', e);
    }

    let result = products.filter(p => p.authorId === authorId);

    if (typeof f.minPrice === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price <= f.maxPrice);
    }
    if (typeof f.minRating === 'number') {
      result = result.filter(p => typeof p.averageRating === 'number' && p.averageRating >= f.minRating);
    }
    if (f.language) {
      result = result.filter(p => p.language === f.language);
    }

    result = this._sortProducts(result, sortBy);

    const total = result.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = result.slice(start, end).map(p => this._enrichProduct(p));

    return {
      products: pageItems,
      total,
      page: pg,
      pageSize: size
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) return null;
    return this._enrichProduct(product);
  }

  // getRecommendedProducts(productId)
  getRecommendedProducts(productId) {
    const products = this._getFromStorage('products', []);
    const base = products.find(p => p.id === productId);
    if (!base || !Array.isArray(base.recommendedProductIds)) return [];
    const recommended = base.recommendedProductIds
      .map(id => products.find(p => p.id === id))
      .filter(p => !!p)
      .map(p => this._enrichProduct(p));
    return recommended;
  }

  // addToCart(productId, quantity = 1)
  addToCart(productId, quantity = 1) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const products = this._getFromStorage('products', []);
    const cartItemsAll = this._getFromStorage('cart_items', []);

    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, message: 'Product not found.', cart: cart, cartItems: [] };
    }

    const isPreorder = product.availabilityStatus === 'upcoming' && !!product.isPreorderAvailable;
    if (product.availabilityStatus === 'upcoming' && !product.isPreorderAvailable) {
      return { success: false, message: 'Product is not available for preorder.', cart: cart, cartItems: [] };
    }

    const price = typeof product.price === 'number' ? product.price : 0;

    const cartItemIds = Array.isArray(cart.items) ? cart.items : [];
    let existing = cartItemsAll.find(ci => ci.cartId === cart.id && ci.productId === productId && !!ci.isPreorder === isPreorder && cartItemIds.includes(ci.id));
    const now = new Date().toISOString();

    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + qty;
      existing.unitPrice = price;
      existing.lineTotal = Number((existing.quantity * existing.unitPrice).toFixed(2));
      existing.addedAt = now;
    } else {
      const ci = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId: productId,
        quantity: qty,
        unitPrice: price,
        lineTotal: Number((price * qty).toFixed(2)),
        isPreorder: isPreorder,
        addedAt: now
      };
      cartItemsAll.push(ci);
      if (!Array.isArray(cart.items)) cart.items = [];
      cart.items.push(ci.id);
    }

    this._saveToStorage('cart_items', cartItemsAll);
    this._recalculateCartTotals(cart);

    const updatedCartItems = cartItemsAll.filter(ci => ci.cartId === cart.id && cart.items.includes(ci.id));
    return { success: true, message: 'Added to cart.', cart: cart, cartItems: updatedCartItems };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const idx = cartItemsAll.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }
    const item = cartItemsAll[idx];

    let carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === item.cartId);
    if (!cart) {
      return { success: false, message: 'Associated cart not found.', cart: null };
    }

    if (quantity <= 0) {
      // Remove item
      cartItemsAll.splice(idx, 1);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== cartItemId);
      }
    } else {
      item.quantity = quantity;
      item.lineTotal = Number((item.unitPrice * item.quantity).toFixed(2));
      item.addedAt = new Date().toISOString();
      cartItemsAll[idx] = item;
    }

    this._saveToStorage('cart_items', cartItemsAll);
    this._recalculateCartTotals(cart);

    return { success: true, message: 'Cart updated.', cart };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const idx = cartItemsAll.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }
    const item = cartItemsAll[idx];
    let carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === item.cartId);
    if (!cart) {
      return { success: false, message: 'Associated cart not found.', cart: null };
    }

    cartItemsAll.splice(idx, 1);
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter(id => id !== cartItemId);
    }
    this._saveToStorage('cart_items', cartItemsAll);
    this._recalculateCartTotals(cart);

    return { success: true, message: 'Item removed from cart.', cart };
  }

  // clearCart()
  clearCart() {
    const cart = this._getOrCreateCart();
    let cartItemsAll = this._getFromStorage('cart_items', []);
    cartItemsAll = cartItemsAll.filter(ci => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', cartItemsAll);

    cart.items = [];
    cart.promoCodeIds = [];
    cart.subtotal = 0;
    cart.discountTotal = 0;
    cart.total = 0;
    cart.updatedAt = new Date().toISOString();

    let carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    return { cart };
  }

  // getCartDetails(): { cart, items: [{ cartItem, product }], appliedPromos }
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const promoCodesAll = this._getFromStorage('promo_codes', []);

    const cartItemIds = Array.isArray(cart.items) ? cart.items : [];
    const cartItems = cartItemsAll.filter(ci => ci.cartId === cart.id && cartItemIds.includes(ci.id));

    const items = cartItems.map(ci => ({
      cartItem: ci,
      product: this._enrichProduct(products.find(p => p.id === ci.productId) || null)
    }));

    const appliedPromos = (Array.isArray(cart.promoCodeIds) ? cart.promoCodeIds : [])
      .map(id => promoCodesAll.find(p => p.id === id))
      .filter(p => !!p);

    // Also attach resolved promo codes onto cart for FK convenience
    const cartWithPromos = { ...cart, promoCodes: appliedPromos };

    return {
      cart: cartWithPromos,
      items,
      appliedPromos
    };
  }

  // applyPromoCode(code)
  applyPromoCode(code) {
    const cart = this._getOrCreateCart();
    const validation = this._validatePromoCode(code, cart);
    if (!validation.valid) {
      return { success: false, message: validation.message, cart, appliedPromo: null };
    }
    const promo = validation.promo;

    if (!Array.isArray(cart.promoCodeIds)) cart.promoCodeIds = [];
    if (!cart.promoCodeIds.includes(promo.id)) {
      cart.promoCodeIds.push(promo.id);
    }

    let carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    this._recalculateCartTotals(cart);

    return { success: true, message: 'Promo code applied.', cart, appliedPromo: promo };
  }

  // removePromoCode(code)
  removePromoCode(code) {
    const cart = this._getOrCreateCart();
    if (!Array.isArray(cart.promoCodeIds) || !cart.promoCodeIds.length) {
      return { success: false, message: 'No promo codes applied.', cart };
    }

    const promos = this._getFromStorage('promo_codes', []);
    const promo = promos.find(p => (p.code || '').toLowerCase() === String(code || '').toLowerCase());
    if (!promo) {
      return { success: false, message: 'Promo code not found.', cart };
    }

    cart.promoCodeIds = cart.promoCodeIds.filter(id => id !== promo.id);

    let carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    this._recalculateCartTotals(cart);

    return { success: true, message: 'Promo code removed.', cart };
  }

  // getCheckoutSummary(): { cart, items, appliedPromos }
  getCheckoutSummary() {
    // Implementation identical to getCartDetails (could reuse)
    const summary = this.getCartDetails();

    // Instrumentation for task 5: checkout started with qualifying Fantasy preorder item
    try {
      if (summary && Array.isArray(summary.items) && summary.items.length > 0) {
        const cutoffTime = new Date('2025-01-01').getTime();
        const hasQualifyingPreorder = summary.items.some(entry => {
          if (!entry || !entry.cartItem || !entry.product) return false;
          const ci = entry.cartItem;
          const product = entry.product;

          if (!ci.isPreorder) return false;

          // Check Fantasy category based on enriched product.category
          let isFantasy = false;
          if (product.category) {
            const cat = product.category;
            const nameCandidates = [cat.name, cat.title, cat.label];
            if (
              nameCandidates.some(
                v => typeof v === 'string' && v.toLowerCase() === 'fantasy'
              )
            ) {
              isFantasy = true;
            } else if (typeof cat.code === 'string') {
              const codeLower = cat.code.toLowerCase();
              if (codeLower.includes('fantasy')) {
                isFantasy = true;
              }
            }
          }
          if (!isFantasy) return false;

          // Release date after 2025-01-01
          if (!product.releaseDate) return false;
          const relTime = new Date(product.releaseDate).getTime();
          if (!(relTime > cutoffTime)) return false;

          // Price <= 25
          if (typeof product.price !== 'number' || product.price > 25) {
            return false;
          }

          return true;
        });

        if (hasQualifyingPreorder) {
          localStorage.setItem('task5_checkoutStarted', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error in getCheckoutSummary:', e);
    }

    return summary;
  }

  // placeOrder(purchaserName, purchaserEmail, paymentMethod, paymentDetails, agreeToTerms)
  placeOrder(purchaserName, purchaserEmail, paymentMethod, paymentDetails, agreeToTerms) {
    if (!agreeToTerms) {
      return { success: false, order: null, items: [], message: 'You must agree to terms and conditions.' };
    }
    if (!purchaserName || !purchaserEmail) {
      return { success: false, order: null, items: [], message: 'Purchaser name and email are required.' };
    }
    if (!paymentMethod) {
      return { success: false, order: null, items: [], message: 'Payment method is required.' };
    }

    const cart = this._getOrCreateCart();
    const res = this._createOrderFromCart(cart, purchaserName, purchaserEmail, paymentMethod, paymentDetails || {});

    if (!res.success) {
      return { success: false, order: null, items: [], message: res.message };
    }

    return {
      success: true,
      order: res.order,
      items: res.orderItems,
      message: res.message
    };
  }

  // getWishlistDetails(): { wishlist, items: [{ wishlistItem, product }] }
  getWishlistDetails() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItemsAll = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);

    const wishlistItemIds = Array.isArray(wishlist.items) ? wishlist.items : [];
    const wishlistItems = wishlistItemsAll.filter(wi => wi.wishlistId === wishlist.id && wishlistItemIds.includes(wi.id));

    const items = wishlistItems.map(wi => ({
      wishlistItem: wi,
      product: this._enrichProduct(products.find(p => p.id === wi.productId) || null)
    }));

    return {
      wishlist,
      items
    };
  }

  // addToWishlist(productId)
  addToWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, message: 'Product not found.', wishlist: wishlist };
    }

    let wishlistItemsAll = this._getFromStorage('wishlist_items', []);
    const wishlistItemIds = Array.isArray(wishlist.items) ? wishlist.items : [];

    const existing = wishlistItemsAll.find(wi => wi.wishlistId === wishlist.id && wi.productId === productId && wishlistItemIds.includes(wi.id));
    if (existing) {
      return { success: true, message: 'Product is already in wishlist.', wishlist };
    }

    const now = new Date().toISOString();
    const wi = {
      id: this._generateId('wishlist_item'),
      wishlistId: wishlist.id,
      productId: productId,
      addedAt: now
    };

    wishlistItemsAll.push(wi);
    if (!Array.isArray(wishlist.items)) wishlist.items = [];
    wishlist.items.push(wi.id);
    wishlist.updatedAt = now;

    this._saveToStorage('wishlist_items', wishlistItemsAll);
    const wishlists = this._getFromStorage('wishlists', []);
    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx !== -1) {
      wishlists[idx] = wishlist;
      this._saveToStorage('wishlists', wishlists);
    }

    return { success: true, message: 'Added to wishlist.', wishlist };
  }

  // removeFromWishlist(wishlistItemId)
  removeFromWishlist(wishlistItemId) {
    let wishlistItemsAll = this._getFromStorage('wishlist_items', []);
    const idx = wishlistItemsAll.findIndex(wi => wi.id === wishlistItemId);
    if (idx === -1) {
      return { success: false, message: 'Wishlist item not found.', wishlist: null };
    }
    const wi = wishlistItemsAll[idx];

    const wishlists = this._getFromStorage('wishlists', []);
    const wishlist = wishlists.find(w => w.id === wi.wishlistId);
    if (!wishlist) {
      return { success: false, message: 'Associated wishlist not found.', wishlist: null };
    }

    wishlistItemsAll.splice(idx, 1);
    if (Array.isArray(wishlist.items)) {
      wishlist.items = wishlist.items.filter(id => id !== wishlistItemId);
    }
    wishlist.updatedAt = new Date().toISOString();

    this._saveToStorage('wishlist_items', wishlistItemsAll);
    const wIdx = wishlists.findIndex(w => w.id === wishlist.id);
    if (wIdx !== -1) {
      wishlists[wIdx] = wishlist;
      this._saveToStorage('wishlists', wishlists);
    }

    return { success: true, message: 'Item removed from wishlist.', wishlist };
  }

  // moveWishlistItemToCart(wishlistItemId, removeFromWishlist = false)
  moveWishlistItemToCart(wishlistItemId, removeFromWishlist) {
    const wishlistItemsAll = this._getFromStorage('wishlist_items', []);
    const wi = wishlistItemsAll.find(w => w.id === wishlistItemId);
    if (!wi) {
      return { success: false, message: 'Wishlist item not found.', cart: null, wishlist: null };
    }

    const addRes = this.addToCart(wi.productId, 1);
    if (!addRes.success) {
      return { success: false, message: addRes.message, cart: addRes.cart, wishlist: null };
    }

    let wishlistObj = null;
    if (removeFromWishlist) {
      const remRes = this.removeFromWishlist(wishlistItemId);
      wishlistObj = remRes.wishlist;
    } else {
      const wishlists = this._getFromStorage('wishlists', []);
      wishlistObj = wishlists.find(w => w.id === wi.wishlistId) || null;
    }

    return {
      success: true,
      message: 'Moved item to cart.',
      cart: addRes.cart,
      wishlist: wishlistObj
    };
  }

  // getAboutContent()
  getAboutContent() {
    const stored = this._getFromStorage('about_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      headline: '',
      body: '',
      highlights: []
    };
  }

  // getFaqEntries()
  getFaqEntries() {
    const faqs = this._getFromStorage('faq_entries', []);
    return faqs;
  }

  // getSupportInfo()
  getSupportInfo() {
    const info = this._getFromStorage('support_info', null);
    if (info && typeof info === 'object') {
      return info;
    }
    return {
      supportEmail: '',
      businessAddress: '',
      supportHours: ''
    };
  }

  // submitContactRequest(name, email, subject, message)
  submitContactRequest(name, email, subject, message) {
    // We simulate creating a support ticket by generating an ID, but do not persist large bodies beyond what fits in localStorage.
    if (!name || !email || !subject || !message) {
      return { success: false, ticketId: null, message: 'All fields are required.' };
    }
    const ticketId = 'TICKET-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    // Optionally, we could store minimal metadata in localStorage under 'support_tickets', but this is not required by the model.
    return { success: true, ticketId, message: 'Your request has been submitted.' };
  }

  // getLegalPageContent(pageType)
  getLegalPageContent(pageType) {
    const pages = this._getFromStorage('legal_pages', null);
    if (pages && typeof pages === 'object' && pages[pageType]) {
      return pages[pageType];
    }
    return {
      title: '',
      body: '',
      lastUpdated: ''
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