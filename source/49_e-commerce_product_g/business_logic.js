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
    const keys = [
      'categories',
      'products',
      'product_variants',
      'cart',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'comparison_lists',
      'comparison_items',
      'recently_viewed_lists',
      'recently_viewed_items',
      'shipping_addresses',
      'checkout_sessions',
      'shipping_methods',
      'contact_tickets',
      'about_content',
      'contact_info',
      'shipping_returns_policy'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        // For content/policy/contact we store an object; others default to []
        if (key === 'about_content') {
          const about = {
            headline: 'About Our Rugs',
            body: 'We curate quality rugs for every room in your home.',
            sections: [],
            highlights: []
          };
          localStorage.setItem(key, JSON.stringify(about));
        } else if (key === 'contact_info') {
          const contactInfo = {
            supportEmail: 'support@example.com',
            supportPhone: '+1-555-000-0000',
            supportHours: 'Mon–Fri, 9am–5pm PT',
            faqSummary: 'Find answers to common questions about orders, shipping, and returns.',
            helpSections: []
          };
          localStorage.setItem(key, JSON.stringify(contactInfo));
        } else if (key === 'shipping_returns_policy') {
          const policy = {
            shippingOverview: 'We ship rugs throughout the continental US using trusted carriers.',
            deliveryTimeCalculation: 'Estimated delivery dates are based on our handling time plus the carrier transit time.',
            freeShippingConditions: 'Free shipping may apply to eligible products and promotions. Restrictions may apply.',
            freeReturnsConditions: 'Free returns are available on select rugs as indicated on the product page.',
            returnProcess: 'To start a return, contact support with your order number within the return window.',
            sections: []
          };
          localStorage.setItem(key, JSON.stringify(policy));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      return fallback !== undefined ? fallback : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
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

  _nowISO() {
    return new Date().toISOString();
  }

  // -------------------- Entity helpers --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    if (!Array.isArray(carts)) carts = [];
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem ids
        subtotal: 0,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 0,
        currency: 'usd',
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    if (!Array.isArray(wishlists)) wishlists = [];
    let wishlist = wishlists[0] || null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'Wishlist & Saved Items',
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _getOrCreateComparisonList() {
    let lists = this._getFromStorage('comparison_lists', []);
    if (!Array.isArray(lists)) lists = [];
    let list = lists.find((l) => l.isActive) || null;
    if (!list) {
      list = {
        id: this._generateId('comparison_list'),
        source: 'category_page',
        maxItems: 3,
        isActive: true,
        createdAt: this._nowISO()
      };
      lists.push(list);
      this._saveToStorage('comparison_lists', lists);
    }
    return list;
  }

  _getOrCreateRecentlyViewedList() {
    let lists = this._getFromStorage('recently_viewed_lists', []);
    if (!Array.isArray(lists)) lists = [];
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('recently_viewed_list'),
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      lists.push(list);
      this._saveToStorage('recently_viewed_lists', lists);
    }
    return list;
  }

  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions', []);
    if (!Array.isArray(sessions)) sessions = [];

    let session = sessions.find(
      (s) => s.cartId === cart.id && s.step !== 'completed' && s.step !== 'cancelled'
    );
    if (!session) {
      session = {
        id: this._generateId('checkout_session'),
        cartId: cart.id,
        shippingAddressId: null,
        step: 'shipping_details',
        selectedShippingMethodId: null,
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }
    return session;
  }

  _recordProductView(productId, variantId) {
    if (!productId) return;
    const list = this._getOrCreateRecentlyViewedList();
    let items = this._getFromStorage('recently_viewed_items', []);
    if (!Array.isArray(items)) items = [];

    const now = this._nowISO();
    // check if exists for same product & variant
    let existing = items.find(
      (i) =>
        i.recentlyViewedListId === list.id &&
        i.productId === productId &&
        (i.variantId || null) === (variantId || null)
    );

    const maxOrderIndex = items.reduce(
      (max, i) => (i.recentlyViewedListId === list.id && i.orderIndex > max ? i.orderIndex : max),
      0
    );

    if (existing) {
      existing.viewedAt = now;
      existing.orderIndex = maxOrderIndex + 1;
    } else {
      const item = {
        id: this._generateId('recently_viewed_item'),
        recentlyViewedListId: list.id,
        productId,
        variantId: variantId || null,
        viewedAt: now,
        orderIndex: maxOrderIndex + 1
      };
      items.push(item);
    }

    list.updatedAt = now;
    let lists = this._getFromStorage('recently_viewed_lists', []);
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx >= 0) lists[idx] = list;
    this._saveToStorage('recently_viewed_lists', lists);
    this._saveToStorage('recently_viewed_items', items);
  }

  _recalculateCartTotals(cart) {
    if (!cart) return;
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    let subtotal = 0;
    itemsForCart.forEach((ci) => {
      subtotal += ci.lineSubtotal || 0;
    });

    cart.subtotal = subtotal;
    cart.discountTotal = cart.discountTotal || 0;
    cart.shippingTotal = cart.shippingTotal || 0;
    cart.taxTotal = cart.taxTotal || 0;
    cart.total = subtotal - cart.discountTotal + cart.shippingTotal + cart.taxTotal;
    cart.updatedAt = this._nowISO();

    let carts = this._getFromStorage('cart', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }
  }

  _getProductById(productId) {
    const products = this._getFromStorage('products', []);
    return products.find((p) => p.id === productId) || null;
  }

  _getVariantById(variantId) {
    const variants = this._getFromStorage('product_variants', []);
    return variants.find((v) => v.id === variantId) || null;
  }

  _getVariantsForProduct(productId) {
    const variants = this._getFromStorage('product_variants', []);
    return variants.filter((v) => v.productId === productId);
  }

  _formatDateLabel(dateISO) {
    const d = new Date(dateISO);
    if (Number.isNaN(d.getTime())) return dateISO;
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    try {
      return d.toLocaleDateString('en-US', options);
    } catch (e) {
      return dateISO;
    }
  }

  _applyProductFilters(products, filters) {
    if (!filters) return products.slice();
    const variants = this._getFromStorage('product_variants', []);

    const sizeLabels = filters.sizeLabels || null;
    const minPrice = typeof filters.minPrice === 'number' ? filters.minPrice : null;
    const maxPrice = typeof filters.maxPrice === 'number' ? filters.maxPrice : null;
    const minRating = typeof filters.minRating === 'number' ? filters.minRating : null;
    const minRatingCount =
      typeof filters.minRatingCount === 'number' ? filters.minRatingCount : null;
    const colors = filters.colors && filters.colors.length ? filters.colors : null;
    const styles = filters.styles && filters.styles.length ? filters.styles : null;
    const rooms = filters.rooms && filters.rooms.length ? filters.rooms : null;
    const productTypes =
      filters.productTypes && filters.productTypes.length ? filters.productTypes : null;
    const shapes = filters.shapes && filters.shapes.length ? filters.shapes : null;
    const featureFlags = filters.features || {};
    const maxDeliveryDate = filters.maxDeliveryDate || null; // ISO string

    const today = new Date();

    return products.filter((product) => {
      const productVariants = variants.filter((v) => v.productId === product.id);

      // size filter
      if (sizeLabels && sizeLabels.length) {
        const matchSize = productVariants.some((v) => sizeLabels.includes(v.sizeLabel));
        if (!matchSize) return false;
      }

      // price filter using product-level min/max
      if (minPrice !== null) {
        const pMin = typeof product.minPrice === 'number' ? product.minPrice : null;
        const pMax = typeof product.maxPrice === 'number' ? product.maxPrice : null;
        if (pMax !== null && pMax < minPrice) return false;
        if (pMin !== null && pMin < minPrice && pMax === null) return false;
      }
      if (maxPrice !== null) {
        const pMin = typeof product.minPrice === 'number' ? product.minPrice : null;
        if (pMin !== null && pMin > maxPrice) return false;
      }

      // rating filter
      if (minRating !== null && typeof product.ratingAverage === 'number') {
        if (product.ratingAverage < minRating) return false;
      }

      if (minRatingCount !== null && typeof product.ratingCount === 'number') {
        if (product.ratingCount < minRatingCount) return false;
      }

      // color filter via variants
      if (colors) {
        const hasColor = productVariants.some((v) => colors.includes(v.color));
        if (!hasColor) return false;
      }

      // style filter
      if (styles && product.style && !styles.includes(product.style)) {
        return false;
      }

      // room filter
      if (rooms && product.primaryRoom && !rooms.includes(product.primaryRoom)) {
        return false;
      }

      // productType filter via variants
      if (productTypes) {
        const hasType = productVariants.some((v) => productTypes.includes(v.productType));
        if (!hasType) return false;
      }

      // shape filter via variants
      if (shapes) {
        const hasShape = productVariants.some((v) => shapes.includes(v.shape));
        if (!hasShape) return false;
      }

      // feature flags
      if (featureFlags.isMachineWashable && !product.isMachineWashable) return false;
      if (featureFlags.isNonSlip && !product.isNonSlip) return false;
      if (featureFlags.hasFreeShipping && !product.hasFreeShipping) return false;
      if (featureFlags.hasFreeReturns && !product.hasFreeReturns) return false;
      if (featureFlags.isOnSale && !product.isOnSale) return false;

      // maxDeliveryDate filter
      if (maxDeliveryDate && typeof product.maxDeliveryDays === 'number') {
        const latestAllowed = new Date(maxDeliveryDate);
        if (!Number.isNaN(latestAllowed.getTime())) {
          const estDate = new Date(today.getTime());
          estDate.setDate(estDate.getDate() + product.maxDeliveryDays);
          if (estDate > latestAllowed) return false;
        }
      }

      return true;
    });
  }

  _sortProductsForCards(productsWithCards, sort) {
    const arr = productsWithCards.slice();
    if (!sort || sort === 'featured') return arr;

    if (sort === 'price_low_to_high') {
      arr.sort((a, b) => (a.minPrice || 0) - (b.minPrice || 0));
    } else if (sort === 'price_high_to_low') {
      arr.sort((a, b) => (b.minPrice || 0) - (a.minPrice || 0));
    } else if (sort === 'rating_high_to_low') {
      arr.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
    }
    return arr;
  }

  _filterProductsByCategoryKey(products, categoryKey) {
    if (!categoryKey) return products.slice();
    return products.filter((p) => {
      if (categoryKey === 'rugs') return true;
      if (categoryKey === 'sale_rugs') {
        return p.isOnSale || (Array.isArray(p.categoryKeys) && p.categoryKeys.includes('sale_rugs'));
      }
      if (p.primaryCategory === categoryKey) return true;
      if (Array.isArray(p.categoryKeys) && p.categoryKeys.includes(categoryKey)) return true;
      return false;
    });
  }

  _buildProductCard(product, wishlistItems, comparisonItems) {
    const variants = this._getVariantsForProduct(product.id);
    let minPrice = typeof product.minPrice === 'number' ? product.minPrice : null;
    let maxPrice = typeof product.maxPrice === 'number' ? product.maxPrice : null;
    if (minPrice === null || maxPrice === null) {
      variants.forEach((v) => {
        if (typeof v.price === 'number') {
          if (minPrice === null || v.price < minPrice) minPrice = v.price;
          if (maxPrice === null || v.price > maxPrice) maxPrice = v.price;
        }
      });
    }
    let defaultSizeLabel = null;
    const defaultVariant = variants.find((v) => v.isDefault) || variants[0];
    if (defaultVariant) defaultSizeLabel = defaultVariant.sizeLabel || null;

    const badges = [];
    if (product.isOnSale) badges.push('sale');
    if (product.hasFreeShipping) badges.push('free_shipping');
    if (product.hasFreeReturns) badges.push('free_returns');

    const isInWishlist = wishlistItems.some((w) => w.productId === product.id);
    const isInComparisonList = comparisonItems.some((c) => c.productId === product.id);

    const categories = this._getFromStorage('categories', []);
    const cat = categories.find((c) => c.categoryKey === product.primaryCategory) || null;

    return {
      productId: product.id,
      name: product.name,
      thumbnailUrl: product.thumbnailUrl || (Array.isArray(product.imageUrls) ? product.imageUrls[0] : null),
      minPrice: minPrice || 0,
      maxPrice: maxPrice || minPrice || 0,
      ratingAverage: product.ratingAverage || 0,
      ratingCount: product.ratingCount || 0,
      isOnSale: !!product.isOnSale,
      hasFreeShipping: !!product.hasFreeShipping,
      hasFreeReturns: !!product.hasFreeReturns,
      maxDeliveryDays: product.maxDeliveryDays || null,
      primaryCategoryName: cat ? cat.name : product.primaryCategory,
      badges,
      isInWishlist,
      isInComparisonList,
      defaultSizeLabel,
      // foreign key resolution
      product
    };
  }

  _buildCartReturn(cart) {
    if (!cart) {
      return {
        cartId: null,
        items: [],
        subtotal: 0,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: 0,
        currency: 'usd'
      };
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const items = cartItems
      .filter((ci) => ci.cartId === cart.id)
      .map((ci) => {
        const product = products.find((p) => p.id === ci.productId) || null;
        const variant = variants.find((v) => v.id === ci.variantId) || null;
        return {
          cartItemId: ci.id,
          cartId: ci.cartId,
          productId: ci.productId,
          variantId: ci.variantId,
          productName: product ? product.name : null,
          variantSizeLabel: variant ? variant.sizeLabel : null,
          variantColor: variant ? variant.color : null,
          productType: variant ? variant.productType : null,
          quantity: ci.quantity,
          unitPrice: ci.unitPrice,
          lineSubtotal: ci.lineSubtotal,
          thumbnailUrl: product ? product.thumbnailUrl || null : null,
          badgeTexts: [],
          // foreign key resolution
          product,
          variant
        };
      });

    return {
      cartId: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      discountTotal: cart.discountTotal || 0,
      shippingTotal: cart.shippingTotal || 0,
      taxTotal: cart.taxTotal || 0,
      total: cart.total || 0,
      currency: cart.currency || 'usd'
    };
  }

  _buildWishlistReturn(wishlist) {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const items = wishlistItems
      .filter((wi) => wi.wishlistId === wishlist.id)
      .map((wi) => {
        const product = products.find((p) => p.id === wi.productId) || null;
        const variant = variants.find((v) => v.id === wi.variantId) || null;
        let minPrice = product ? product.minPrice : null;
        let maxPrice = product ? product.maxPrice : null;
        if ((minPrice === null || maxPrice === null) && product) {
          const pVars = variants.filter((v) => v.productId === product.id);
          pVars.forEach((v) => {
            if (typeof v.price === 'number') {
              if (minPrice === null || v.price < minPrice) minPrice = v.price;
              if (maxPrice === null || v.price > maxPrice) maxPrice = v.price;
            }
          });
        }
        return {
          wishlistItemId: wi.id,
          wishlistId: wi.wishlistId,
          productId: wi.productId,
          variantId: wi.variantId,
          productName: product ? product.name : null,
          variantSizeLabel: variant ? variant.sizeLabel : null,
          variantColor: variant ? variant.color : null,
          thumbnailUrl: product ? product.thumbnailUrl || null : null,
          minPrice: minPrice || 0,
          maxPrice: maxPrice || minPrice || 0,
          ratingAverage: product ? product.ratingAverage || 0 : 0,
          ratingCount: product ? product.ratingCount || 0 : 0,
          // foreign key resolution
          product,
          variant,
          wishlist
        };
      });

    return {
      wishlistId: wishlist.id,
      name: wishlist.name,
      items
    };
  }

  _searchBaseProducts(query) {
    const products = this._getFromStorage('products', []);
    if (!query || !query.trim()) return products.slice();
    const q = query.toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);

    return products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags.map((t) => String(t).toLowerCase()) : [];

      // First try a simple substring match on the full query
      if (name.includes(q)) return true;
      if (tags.some((t) => t.includes(q))) return true;

      // Fallback: require that all query tokens appear in either the name or tags
      if (tokens.length > 0) {
        const textFields = [name, ...tags];
        const allTokensMatch = tokens.every((token) =>
          textFields.some((field) => field.includes(token))
        );
        if (allTokensMatch) return true;
      }

      return false;
    });
  }

  // -------------------- Core interface implementations --------------------

  // getHomeContent()
  getHomeContent() {
    const categories = this._getFromStorage('categories', []);
    const heroKeysPriority = [
      'living_room_rugs',
      'kids_rugs',
      'outdoor_rugs',
      'kitchen_rugs',
      'modern_rugs',
      'bohemian_rugs',
      'sale_rugs'
    ];

    const heroCategories = heroKeysPriority
      .map((key) => categories.find((c) => c.categoryKey === key))
      .filter(Boolean)
      .slice(0, 6)
      .map((c) => ({
        categoryId: c.id,
        categoryKey: c.categoryKey,
        name: c.name,
        description: c.description || '',
        // foreign key resolution
        category: c
      }));

    const featuredCollections = categories
      .filter((c) => c.categoryKey === 'sale_rugs' || c.categoryKey === 'bohemian_rugs')
      .map((c) => ({
        title: c.name,
        categoryKey: c.categoryKey,
        highlightText: c.description || `Explore ${c.name}`
      }));

    // recently viewed products
    const recentlyViewed = this.getRecentlyViewedItems(10).items || [];

    const recentlyViewedProducts = recentlyViewed.map((rv) => ({
      productId: rv.productId,
      name: rv.name,
      thumbnailUrl: rv.thumbnailUrl,
      minPrice: rv.minPrice,
      maxPrice: rv.maxPrice,
      ratingAverage: rv.ratingAverage,
      ratingCount: rv.ratingCount,
      primaryCategoryName: rv.primaryCategoryName,
      product: rv.product
    }));

    return {
      heroCategories,
      featuredCollections,
      recentlyViewedProducts
    };
  }

  // getMainNavigationCategories()
  getMainNavigationCategories() {
    const categories = this._getFromStorage('categories', []);
    const mainKeys = [
      'rugs',
      'living_room_rugs',
      'kids_rugs',
      'outdoor_rugs',
      'kitchen_rugs',
      'sale_rugs',
      'bohemian_rugs',
      'modern_rugs'
    ];

    const navItems = categories
      .filter((c) => mainKeys.includes(c.categoryKey))
      .map((c, index) => ({
        categoryId: c.id,
        categoryKey: c.categoryKey,
        name: c.name,
        isTopLevel: typeof c.isTopLevel === 'boolean' ? c.isTopLevel : true,
        displayOrder:
          typeof c.displayOrder === 'number' ? c.displayOrder : index + 1,
        // foreign key resolution
        category: c
      }));

    navItems.sort((a, b) => a.displayOrder - b.displayOrder);
    return navItems;
  }

  // getProductFilterOptions(source, categoryKey, searchQuery)
  getProductFilterOptions(source, categoryKey, searchQuery) {
    let baseProducts = [];
    if (source === 'category_page') {
      const all = this._getFromStorage('products', []);
      baseProducts = this._filterProductsByCategoryKey(all, categoryKey);
    } else if (source === 'search_results') {
      baseProducts = this._searchBaseProducts(searchQuery);
    } else {
      baseProducts = this._getFromStorage('products', []);
    }

    const variants = this._getFromStorage('product_variants', []);
    const productIdsSet = new Set(baseProducts.map((p) => p.id));
    const baseVariants = variants.filter((v) => productIdsSet.has(v.productId));

    // size options
    const sizeMap = new Map();
    baseVariants.forEach((v) => {
      if (v.sizeLabel && !sizeMap.has(v.sizeLabel)) {
        sizeMap.set(v.sizeLabel, {
          value: v.sizeLabel,
          label: v.sizeLabel
        });
      }
    });
    const sizeOptions = Array.from(sizeMap.values());

    // price range
    let minAvailable = null;
    let maxAvailable = null;
    baseProducts.forEach((p) => {
      if (typeof p.minPrice === 'number') {
        if (minAvailable === null || p.minPrice < minAvailable) minAvailable = p.minPrice;
      }
      if (typeof p.maxPrice === 'number') {
        if (maxAvailable === null || p.maxPrice > maxAvailable) maxAvailable = p.maxPrice;
      }
    });
    if (minAvailable === null) minAvailable = 0;
    if (maxAvailable === null) maxAvailable = 0;

    // rating options (generic but valid)
    const ratingOptions = [
      { minRating: 4.0, label: '4 stars & up' },
      { minRating: 4.5, label: '4.5 stars & up' }
    ];

    // color options
    const colorMap = new Map();
    baseVariants.forEach((v) => {
      if (v.color && !colorMap.has(v.color)) {
        const label = v.color.replace(/_/g, ' ');
        colorMap.set(v.color, {
          value: v.color,
          label: label.charAt(0).toUpperCase() + label.slice(1)
        });
      }
    });
    const colorOptions = Array.from(colorMap.values());

    // style options
    const styleMap = new Map();
    baseProducts.forEach((p) => {
      if (p.style && !styleMap.has(p.style)) {
        const label = p.style.replace(/_/g, ' ');
        styleMap.set(p.style, {
          value: p.style,
          label: label.charAt(0).toUpperCase() + label.slice(1)
        });
      }
    });
    const styleOptions = Array.from(styleMap.values());

    // room options
    const roomMap = new Map();
    baseProducts.forEach((p) => {
      if (p.primaryRoom && !roomMap.has(p.primaryRoom)) {
        const label = p.primaryRoom.replace(/_/g, ' ');
        roomMap.set(p.primaryRoom, {
          value: p.primaryRoom,
          label: label.charAt(0).toUpperCase() + label.slice(1)
        });
      }
    });
    const roomOptions = Array.from(roomMap.values());

    // feature options
    const featureOptions = {
      machineWashableAvailable: baseProducts.some((p) => p.isMachineWashable),
      nonSlipAvailable: baseProducts.some((p) => p.isNonSlip),
      freeShippingAvailable: baseProducts.some((p) => p.hasFreeShipping),
      freeReturnsAvailable: baseProducts.some((p) => p.hasFreeReturns),
      saleOnlyAvailable: baseProducts.some((p) => p.isOnSale)
    };

    // product type options
    const productTypeMap = new Map();
    baseVariants.forEach((v) => {
      if (v.productType && !productTypeMap.has(v.productType)) {
        const label = v.productType.replace(/_/g, ' ');
        productTypeMap.set(v.productType, {
          value: v.productType,
          label: label.charAt(0).toUpperCase() + label.slice(1)
        });
      }
    });
    const productTypeOptions = Array.from(productTypeMap.values());

    // shape options
    const shapeMap = new Map();
    baseVariants.forEach((v) => {
      if (v.shape && !shapeMap.has(v.shape)) {
        const label = v.shape.replace(/_/g, ' ');
        shapeMap.set(v.shape, {
          value: v.shape,
          label: label.charAt(0).toUpperCase() + label.slice(1)
        });
      }
    });
    const shapeOptions = Array.from(shapeMap.values());

    // shipping filter options
    const productsWithDelivery = baseProducts.filter(
      (p) => typeof p.maxDeliveryDays === 'number'
    );
    const shippingFilterOptions = {
      supportsDeliveryDateFilter: productsWithDelivery.length > 0,
      maxDeliveryDaysOptions: []
    };
    if (productsWithDelivery.length > 0) {
      const today = new Date();
      const datesSet = new Set();
      productsWithDelivery.forEach((p) => {
        const est = new Date(today.getTime());
        est.setDate(est.getDate() + p.maxDeliveryDays);
        const iso = est.toISOString().slice(0, 10);
        datesSet.add(iso);
      });
      const sortedDates = Array.from(datesSet).sort();
      shippingFilterOptions.maxDeliveryDaysOptions = sortedDates.map((iso) => ({
        label: 'Get it by ' + this._formatDateLabel(iso),
        maxDeliveryDate: iso
      }));
    }

    const returnsFilterOptions = {
      freeReturnsAvailable: baseProducts.some((p) => p.hasFreeReturns)
    };

    const sortOptions = [
      { value: 'featured', label: 'Featured' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Customer Rating: High to Low' }
    ];

    return {
      sizeOptions,
      priceRange: { minAvailable, maxAvailable },
      ratingOptions,
      colorOptions,
      styleOptions,
      roomOptions,
      featureOptions,
      productTypeOptions,
      shapeOptions,
      shippingFilterOptions,
      returnsFilterOptions,
      sortOptions
    };
  }

  // getCategoryProducts(categoryKey, filters, sort, page, pageSize)
  getCategoryProducts(categoryKey, filters, sort, page = 1, pageSize = 20) {
    const allProducts = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []).filter(
      (wi) => wi.wishlistId === wishlist.id
    );
    const comparisonList = this._getOrCreateComparisonList();
    const comparisonItems = this._getFromStorage('comparison_items', []).filter(
      (ci) => ci.comparisonListId === comparisonList.id
    );

    const categoryProducts = this._filterProductsByCategoryKey(allProducts, categoryKey);
    const filteredProducts = this._applyProductFilters(categoryProducts, filters || {});

    const productCards = filteredProducts.map((p) =>
      this._buildProductCard(p, wishlistItems, comparisonItems)
    );

    const sorted = this._sortProductsForCards(productCards, sort);
    const totalCount = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = sorted.slice(start, end);

    const category = categories.find((c) => c.categoryKey === categoryKey) || null;
    const categoryResult = category
      ? {
          categoryId: category.id,
          categoryKey: category.categoryKey,
          name: category.name,
          description: category.description || '',
          category
        }
      : {
          categoryId: null,
          categoryKey,
          name: categoryKey,
          description: ''
        };

    return {
      category: categoryResult,
      totalCount,
      page,
      pageSize,
      products: paged
    };
  }

  // searchProducts(query, filters, sort, page, pageSize)
  searchProducts(query, filters, sort, page = 1, pageSize = 20) {
    const baseProducts = this._searchBaseProducts(query);
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []).filter(
      (wi) => wi.wishlistId === wishlist.id
    );
    const comparisonList = this._getOrCreateComparisonList();
    const comparisonItems = this._getFromStorage('comparison_items', []).filter(
      (ci) => ci.comparisonListId === comparisonList.id
    );

    const filtered = this._applyProductFilters(baseProducts, filters || {});
    const productCards = filtered.map((p) =>
      this._buildProductCard(p, wishlistItems, comparisonItems)
    );
    const sorted = this._sortProductsForCards(productCards, sort);

    const totalCount = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = sorted.slice(start, end);

    // Instrumentation for task completion tracking
    try {
      if (query && typeof query === 'string' && query.trim() !== '') {
        const qLower = query.toLowerCase();
        if (qLower.includes('jute') && qLower.includes('rug')) {
          localStorage.setItem('task8_juteSearchCompleted', 'true');
        }
        if (qLower.includes('shag') && qLower.includes('rug')) {
          localStorage.setItem('task8_shagSearchCompleted', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      query,
      totalCount,
      page,
      pageSize,
      products: paged
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const product = this._getProductById(productId);
    if (!product) return null;

    const categories = this._getFromStorage('categories', []);
    const variants = this._getVariantsForProduct(productId);

    // Record view for Recently Viewed
    this._recordProductView(productId, null);

    const category = categories.find((c) => c.categoryKey === product.primaryCategory) || null;
    const primaryCategoryName = category ? category.name : product.primaryCategory;

    const today = new Date();
    let deliveryEstimateText = null;
    if (typeof product.maxDeliveryDays === 'number') {
      const est = new Date(today.getTime());
      est.setDate(est.getDate() + product.maxDeliveryDays);
      deliveryEstimateText = 'Get it by ' + this._formatDateLabel(est.toISOString().slice(0, 10));
    }

    const badgeTexts = [];
    if (product.hasFreeShipping) badgeTexts.push('Free Shipping');
    if (product.hasFreeReturns) badgeTexts.push('Free Returns');
    if (product.isOnSale) badgeTexts.push('On Sale');

    const variantsForReturn = variants.map((v) => ({
      variantId: v.id,
      sizeLabel: v.sizeLabel,
      widthFeet: v.widthFeet,
      lengthFeet: v.lengthFeet,
      shape: v.shape,
      productType: v.productType,
      color: v.color,
      price: v.price,
      originalPrice: v.originalPrice,
      isOnSale: !!v.isOnSale,
      isDefault: !!v.isDefault,
      stockStatus: v.stockStatus
    }));

    // recently viewed products (excluding current)
    const recentlyViewed = this.getRecentlyViewedItems(10).items.filter(
      (i) => i.productId !== productId
    );
    const recentlyViewedProducts = recentlyViewed.map((rv) => ({
      productId: rv.productId,
      name: rv.name,
      thumbnailUrl: rv.thumbnailUrl,
      minPrice: rv.minPrice,
      maxPrice: rv.maxPrice
    }));

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const isInWishlist = wishlistItems.some(
      (wi) => wi.wishlistId === wishlist.id && wi.productId === productId
    );

    return {
      productId: product.id,
      name: product.name,
      slug: product.slug || null,
      description: product.description || '',
      primaryCategory: product.primaryCategory,
      primaryCategoryName,
      style: product.style || null,
      primaryRoom: product.primaryRoom || null,
      material: product.material || null,
      isMachineWashable: !!product.isMachineWashable,
      isNonSlip: !!product.isNonSlip,
      hasFreeShipping: !!product.hasFreeShipping,
      hasFreeReturns: !!product.hasFreeReturns,
      isOnSale: !!product.isOnSale,
      ratingAverage: product.ratingAverage || 0,
      ratingCount: product.ratingCount || 0,
      maxDeliveryDays: product.maxDeliveryDays || null,
      deliveryEstimateText,
      imageUrls: product.imageUrls || [],
      thumbnailUrl: product.thumbnailUrl || (product.imageUrls ? product.imageUrls[0] : null),
      tags: product.tags || [],
      variants: variantsForReturn,
      badgeTexts,
      isInWishlist,
      recentlyViewedProducts,
      // foreign key resolution
      product,
      category
    };
  }

  // selectProductVariantByAttributes(productId, attributes)
  selectProductVariantByAttributes(productId, attributes) {
    const product = this._getProductById(productId);
    if (!product) {
      return {
        found: false,
        message: 'Product not found',
        variantId: null,
        sizeLabel: null,
        color: null,
        shape: null,
        price: null,
        originalPrice: null,
        isOnSale: false,
        stockStatus: null
      };
    }
    const variants = this._getVariantsForProduct(productId);
    const sizeLabel = attributes && attributes.sizeLabel;
    const color = attributes && attributes.color;
    const shape = attributes && attributes.shape;

    let matched = variants.find((v) => {
      if (sizeLabel && v.sizeLabel !== sizeLabel) return false;
      if (color && v.color !== color) return false;
      if (shape && v.shape !== shape) return false;
      return true;
    });

    if (!matched && sizeLabel) {
      // fallback: match by size only
      matched = variants.find((v) => v.sizeLabel === sizeLabel) || null;
    }

    if (!matched) {
      return {
        found: false,
        message: 'Matching variant not found',
        variantId: null,
        sizeLabel: null,
        color: null,
        shape: null,
        price: null,
        originalPrice: null,
        isOnSale: false,
        stockStatus: null
      };
    }

    return {
      variantId: matched.id,
      sizeLabel: matched.sizeLabel,
      color: matched.color,
      shape: matched.shape,
      price: matched.price,
      originalPrice: matched.originalPrice,
      isOnSale: !!matched.isOnSale,
      stockStatus: matched.stockStatus,
      found: true,
      message: 'Variant found'
    };
  }

  // getRecentlyViewedItems(limit)
  getRecentlyViewedItems(limit = 10) {
    const list = this._getOrCreateRecentlyViewedList();
    let items = this._getFromStorage('recently_viewed_items', []);
    const products = this._getFromStorage('products', []);

    items = items
      .filter((i) => i.recentlyViewedListId === list.id)
      .sort((a, b) => b.orderIndex - a.orderIndex)
      .slice(0, limit);

    const categories = this._getFromStorage('categories', []);

    const mapped = items.map((i) => {
      const product = products.find((p) => p.id === i.productId) || null;
      let minPrice = product ? product.minPrice : null;
      let maxPrice = product ? product.maxPrice : null;
      if (product && (minPrice === null || maxPrice === null)) {
        const pVars = this._getVariantsForProduct(product.id);
        pVars.forEach((v) => {
          if (typeof v.price === 'number') {
            if (minPrice === null || v.price < minPrice) minPrice = v.price;
            if (maxPrice === null || v.price > maxPrice) maxPrice = v.price;
          }
        });
      }
      if (minPrice === null) minPrice = 0;
      if (maxPrice === null) maxPrice = minPrice;

      const cat = product
        ? categories.find((c) => c.categoryKey === product.primaryCategory) || null
        : null;

      return {
        productId: i.productId,
        name: product ? product.name : null,
        thumbnailUrl: product ? product.thumbnailUrl || null : null,
        minPrice,
        maxPrice,
        ratingAverage: product ? product.ratingAverage || 0 : 0,
        ratingCount: product ? product.ratingCount || 0 : 0,
        viewedAt: i.viewedAt,
        primaryCategoryName: cat ? cat.name : product ? product.primaryCategory : null,
        // foreign key resolution
        product,
        recentlyViewedItem: i,
        recentlyViewedList: list
      };
    });

    return { items: mapped };
  }

  // addToCart(productId, variantId, quantity = 1)
  addToCart(productId, variantId, quantity = 1) {
    const product = this._getProductById(productId);
    if (!product) {
      return { success: false, cart: null, addedItem: null, message: 'Product not found' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const variants = this._getFromStorage('product_variants', []);

    let variant = null;
    if (variantId) {
      variant = variants.find((v) => v.id === variantId && v.productId === productId) || null;
    }
    if (!variant) {
      const productVariants = variants.filter((v) => v.productId === productId);
      variant = productVariants.find((v) => v.isDefault) || productVariants[0] || null;
    }
    if (!variant) {
      return {
        success: false,
        cart: null,
        addedItem: null,
        message: 'No variant available for product'
      };
    }

    if (quantity < 1) quantity = 1;

    // check if cart item with same product+variant exists
    let existing = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.productId === productId && ci.variantId === variant.id
    );

    let cartItemId;
    if (existing) {
      existing.quantity += quantity;
      existing.lineSubtotal = existing.unitPrice * existing.quantity;
      existing.addedAt = existing.addedAt || this._nowISO();
      cartItemId = existing.id;
    } else {
      const newItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId,
        variantId: variant.id,
        quantity,
        unitPrice: variant.price,
        lineSubtotal: variant.price * quantity,
        addedAt: this._nowISO()
      };
      cartItems.push(newItem);
      cart.items = cart.items || [];
      cart.items.push(newItem.id);
      cartItemId = newItem.id;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const cartReturn = this._buildCartReturn(cart);
    return {
      success: true,
      cart: cartReturn,
      addedItem: {
        cartItemId,
        quantity
      },
      message: 'Added to cart'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const carts = this._getFromStorage('cart', []);
    const cart = carts[0] || null;
    return this._buildCartReturn(cart);
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    if (quantity < 1) quantity = 1;
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return {
        success: false,
        cart: null,
        message: 'Cart item not found'
      };
    }

    item.quantity = quantity;
    item.lineSubtotal = item.unitPrice * quantity;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart', []);
    const cart = carts.find((c) => c.id === item.cartId) || null;
    this._recalculateCartTotals(cart);
    const cartReturn = this._buildCartReturn(cart);

    return {
      success: true,
      cart: cartReturn,
      message: 'Quantity updated'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null, message: 'Cart item not found' };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('cart', []);
    const cart = carts.find((c) => c.id === item.cartId) || null;
    if (cart) {
      cart.items = (cart.items || []).filter((id) => id !== cartItemId);
      this._recalculateCartTotals(cart);
    }

    const cartReturn = this._buildCartReturn(cart);
    return { success: true, cart: cartReturn, message: 'Item removed from cart' };
  }

  // moveCartItemToWishlist(cartItemId)
  moveCartItemToWishlist(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null, wishlist: null, message: 'Cart item not found' };
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    const now = this._nowISO();
    const newWishlistItem = {
      id: this._generateId('wishlist_item'),
      wishlistId: wishlist.id,
      productId: item.productId,
      variantId: item.variantId,
      addedAt: now
    };
    wishlistItems.push(newWishlistItem);
    wishlist.updatedAt = now;

    // Remove from cart
    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('cart', []);
    const cart = carts.find((c) => c.id === item.cartId) || null;
    if (cart) {
      cart.items = (cart.items || []).filter((id) => id !== cartItemId);
      this._recalculateCartTotals(cart);
    }

    let wishlists = this._getFromStorage('wishlists', []);
    const wIdx = wishlists.findIndex((w) => w.id === wishlist.id);
    if (wIdx >= 0) wishlists[wIdx] = wishlist;

    this._saveToStorage('wishlists', wishlists);
    this._saveToStorage('wishlist_items', wishlistItems);

    const cartReturn = this._buildCartReturn(cart);
    const wishlistReturn = this._buildWishlistReturn(wishlist);

    return {
      success: true,
      cart: cartReturn,
      wishlist: wishlistReturn,
      message: 'Moved to wishlist'
    };
  }

  // startCheckoutSession()
  startCheckoutSession() {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();
    const cartSummary = this._buildCartReturn(cart);

    let shippingAddress = null;
    if (session.shippingAddressId) {
      const addresses = this._getFromStorage('shipping_addresses', []);
      shippingAddress =
        addresses.find((a) => a.id === session.shippingAddressId) || null;
    }

    return {
      checkoutSessionId: session.id,
      step: session.step,
      cartSummary,
      shippingAddress
    };
  }

  // getCheckoutSessionDetails(checkoutSessionId)
  getCheckoutSessionDetails(checkoutSessionId) {
    const sessions = this._getFromStorage('checkout_sessions', []);
    const session = sessions.find((s) => s.id === checkoutSessionId) || null;
    if (!session) {
      return null;
    }

    const cart = this._getOrCreateCart();
    const cartSummary = this._buildCartReturn(cart);

    let shippingAddress = null;
    if (session.shippingAddressId) {
      const addresses = this._getFromStorage('shipping_addresses', []);
      shippingAddress =
        addresses.find((a) => a.id === session.shippingAddressId) || null;
    }

    let selectedShippingMethod = null;
    if (session.selectedShippingMethodId) {
      const methods = this._getFromStorage('shipping_methods', []);
      const method = methods.find((m) => m.id === session.selectedShippingMethodId) || null;
      if (method) {
        selectedShippingMethod = {
          shippingMethodId: method.id,
          name: method.name,
          baseCost: method.baseCost,
          isFreeShipping: !!method.isFreeShipping,
          typicalMinDays: method.typicalMinDays,
          typicalMaxDays: method.typicalMaxDays,
          shippingMethod: method
        };
      }
    }

    return {
      checkoutSessionId: session.id,
      step: session.step,
      shippingAddress,
      selectedShippingMethod,
      cartSummary
    };
  }

  // submitShippingAddress(checkoutSessionId, shippingAddress)
  submitShippingAddress(checkoutSessionId, shippingAddress) {
    const sessions = this._getFromStorage('checkout_sessions', []);
    const sessionIdx = sessions.findIndex((s) => s.id === checkoutSessionId);
    if (sessionIdx < 0) {
      return {
        success: false,
        checkoutSessionId,
        step: null,
        validationErrors: [{ field: 'checkoutSessionId', message: 'Invalid session' }]
      };
    }

    const requiredFields = [
      'fullName',
      'streetLine1',
      'city',
      'stateRegion',
      'postalCode',
      'country',
      'phone',
      'email'
    ];
    const errors = [];
    requiredFields.forEach((field) => {
      if (!shippingAddress || !shippingAddress[field] || String(shippingAddress[field]).trim() === '') {
        errors.push({ field, message: 'Required' });
      }
    });

    if (errors.length > 0) {
      return {
        success: false,
        checkoutSessionId,
        step: sessions[sessionIdx].step,
        validationErrors: errors
      };
    }

    let addresses = this._getFromStorage('shipping_addresses', []);
    const address = {
      id: this._generateId('shipping_address'),
      fullName: shippingAddress.fullName,
      streetLine1: shippingAddress.streetLine1,
      streetLine2: shippingAddress.streetLine2 || '',
      city: shippingAddress.city,
      stateRegion: shippingAddress.stateRegion,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
      phone: shippingAddress.phone,
      email: shippingAddress.email,
      createdAt: this._nowISO()
    };
    addresses.push(address);
    this._saveToStorage('shipping_addresses', addresses);

    const session = sessions[sessionIdx];
    session.shippingAddressId = address.id;
    session.updatedAt = this._nowISO();
    sessions[sessionIdx] = session;
    this._saveToStorage('checkout_sessions', sessions);

    return {
      success: true,
      checkoutSessionId: session.id,
      step: session.step,
      validationErrors: []
    };
  }

  // getShippingOptions(checkoutSessionId)
  getShippingOptions(checkoutSessionId) {
    let sessions = this._getFromStorage('checkout_sessions', []);
    const sessionIdx = sessions.findIndex((s) => s.id === checkoutSessionId);
    if (sessionIdx < 0) {
      return null;
    }
    const session = sessions[sessionIdx];

    const methods = this._getFromStorage('shipping_methods', []);
    const today = new Date();

    const shippingMethods = methods.map((m) => {
      const minDays = typeof m.typicalMinDays === 'number' ? m.typicalMinDays : 5;
      const maxDays = typeof m.typicalMaxDays === 'number' ? m.typicalMaxDays : 7;
      const minDate = new Date(today.getTime());
      minDate.setDate(minDate.getDate() + minDays);
      const maxDate = new Date(today.getTime());
      maxDate.setDate(maxDate.getDate() + maxDays);
      return {
        shippingMethodId: m.id,
        name: m.name,
        code: m.code,
        description: m.description,
        baseCost: m.baseCost,
        isFreeShipping: !!m.isFreeShipping,
        typicalMinDays: m.typicalMinDays,
        typicalMaxDays: m.typicalMaxDays,
        estimatedMinDate: minDate.toISOString().slice(0, 10),
        estimatedMaxDate: maxDate.toISOString().slice(0, 10),
        shippingMethod: m
      };
    });

    // Transition to shipping_options step
    session.step = 'shipping_options';
    session.updatedAt = this._nowISO();
    sessions[sessionIdx] = session;
    this._saveToStorage('checkout_sessions', sessions);

    const cart = this._getOrCreateCart();
    const cartSummary = this._buildCartReturn(cart);

    return {
      checkoutSessionId: session.id,
      step: session.step,
      shippingMethods,
      cartSummary: {
        subtotal: cartSummary.subtotal,
        discountTotal: cartSummary.discountTotal,
        shippingTotal: cartSummary.shippingTotal,
        taxTotal: cartSummary.taxTotal,
        total: cartSummary.total
      }
    };
  }

  // selectShippingMethod(checkoutSessionId, shippingMethodId)
  selectShippingMethod(checkoutSessionId, shippingMethodId) {
    let sessions = this._getFromStorage('checkout_sessions', []);
    const sessionIdx = sessions.findIndex((s) => s.id === checkoutSessionId);
    if (sessionIdx < 0) {
      return {
        success: false,
        checkoutSessionId,
        step: null,
        selectedShippingMethod: null
      };
    }

    const methods = this._getFromStorage('shipping_methods', []);
    const method = methods.find((m) => m.id === shippingMethodId) || null;
    if (!method) {
      return {
        success: false,
        checkoutSessionId,
        step: sessions[sessionIdx].step,
        selectedShippingMethod: null
      };
    }

    const session = sessions[sessionIdx];
    session.selectedShippingMethodId = method.id;
    session.updatedAt = this._nowISO();
    // For training, we can keep step at 'shipping_options'
    sessions[sessionIdx] = session;
    this._saveToStorage('checkout_sessions', sessions);

    return {
      success: true,
      checkoutSessionId: session.id,
      step: session.step,
      selectedShippingMethod: {
        shippingMethodId: method.id,
        name: method.name,
        baseCost: method.baseCost,
        isFreeShipping: !!method.isFreeShipping,
        typicalMinDays: method.typicalMinDays,
        typicalMaxDays: method.typicalMaxDays,
        shippingMethod: method
      }
    };
  }

  // getWishlistItems()
  getWishlistItems() {
    const wishlist = this._getOrCreateWishlist();
    return this._buildWishlistReturn(wishlist);
  }

  // addProductToWishlist(productId, variantId)
  addProductToWishlist(productId, variantId) {
    const product = this._getProductById(productId);
    if (!product) {
      return { success: false, wishlistId: null, wishlistItemId: null, message: 'Product not found' };
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const now = this._nowISO();
    const newItem = {
      id: this._generateId('wishlist_item'),
      wishlistId: wishlist.id,
      productId,
      variantId: variantId || null,
      addedAt: now
    };
    wishlistItems.push(newItem);

    wishlist.updatedAt = now;
    let wishlists = this._getFromStorage('wishlists', []);
    const idx = wishlists.findIndex((w) => w.id === wishlist.id);
    if (idx >= 0) wishlists[idx] = wishlist;

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveToStorage('wishlists', wishlists);

    return {
      success: true,
      wishlistId: wishlist.id,
      wishlistItemId: newItem.id,
      message: 'Added to wishlist'
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    const exists = wishlistItems.some((wi) => wi.id === wishlistItemId);
    if (!exists) {
      return { success: false, wishlistId: null, message: 'Wishlist item not found' };
    }

    const item = wishlistItems.find((wi) => wi.id === wishlistItemId);
    wishlistItems = wishlistItems.filter((wi) => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    return {
      success: true,
      wishlistId: item.wishlistId,
      message: 'Removed from wishlist'
    };
  }

  // addWishlistItemToCart(wishlistItemId, quantity = 1)
  addWishlistItemToCart(wishlistItemId, quantity = 1) {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const item = wishlistItems.find((wi) => wi.id === wishlistItemId) || null;
    if (!item) {
      return { success: false, cartId: null, cartItemId: null, message: 'Wishlist item not found' };
    }
    const result = this.addToCart(item.productId, item.variantId, quantity);
    const cartId = result && result.cart ? result.cart.cartId : null;
    const cartItemId = result && result.addedItem ? result.addedItem.cartItemId : null;
    return {
      success: !!(result && result.success),
      cartId,
      cartItemId,
      message: result && result.message ? result.message : ''
    };
  }

  // addProductToComparison(productId)
  addProductToComparison(productId) {
    const product = this._getProductById(productId);
    if (!product) {
      return {
        success: false,
        comparisonList: null,
        message: 'Product not found'
      };
    }

    const comparisonList = this._getOrCreateComparisonList();
    let comparisonItems = this._getFromStorage('comparison_items', []);

    const existing = comparisonItems.find(
      (ci) => ci.comparisonListId === comparisonList.id && ci.productId === productId
    );
    if (!existing) {
      const listItems = comparisonItems.filter(
        (ci) => ci.comparisonListId === comparisonList.id
      );
      if (listItems.length >= (comparisonList.maxItems || 3)) {
        // remove oldest
        listItems.sort((a, b) => (a.addedAt || '').localeCompare(b.addedAt || ''));
        const oldest = listItems[0];
        comparisonItems = comparisonItems.filter((ci) => ci.id !== oldest.id);
      }

      const newItem = {
        id: this._generateId('comparison_item'),
        comparisonListId: comparisonList.id,
        productId,
        addedAt: this._nowISO()
      };
      comparisonItems.push(newItem);
      this._saveToStorage('comparison_items', comparisonItems);
    }

    // build return
    const products = this._getFromStorage('products', []);
    const itemsForList = comparisonItems.filter(
      (ci) => ci.comparisonListId === comparisonList.id
    );
    const mappedItems = itemsForList.map((ci) => {
      const p = products.find((pr) => pr.id === ci.productId) || null;
      return {
        productId: ci.productId,
        productName: p ? p.name : null,
        thumbnailUrl: p ? p.thumbnailUrl || null : null,
        product: p,
        comparisonItem: ci
      };
    });

    return {
      success: true,
      comparisonList: {
        comparisonListId: comparisonList.id,
        maxItems: comparisonList.maxItems || 3,
        items: mappedItems,
        comparisonList
      },
      message: 'Added to comparison list'
    };
  }

  // removeProductFromComparison(productId)
  removeProductFromComparison(productId) {
    const comparisonList = this._getOrCreateComparisonList();
    let comparisonItems = this._getFromStorage('comparison_items', []);
    const before = comparisonItems.length;
    comparisonItems = comparisonItems.filter(
      (ci) => !(ci.comparisonListId === comparisonList.id && ci.productId === productId)
    );
    this._saveToStorage('comparison_items', comparisonItems);

    const success = comparisonItems.length !== before;
    return {
      success,
      comparisonListId: comparisonList.id,
      message: success ? 'Removed from comparison list' : 'Item not found in comparison list'
    };
  }

  // getComparisonTable()
  getComparisonTable() {
    const comparisonList = this._getOrCreateComparisonList();
    const comparisonItems = this._getFromStorage('comparison_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const categories = this._getFromStorage('categories', []);

    const itemsForList = comparisonItems.filter(
      (ci) => ci.comparisonListId === comparisonList.id
    );

    const items = itemsForList.map((ci) => {
      const product = products.find((p) => p.id === ci.productId) || null;
      const productVariants = variants.filter((v) => v.productId === ci.productId);
      const keySizeOptions = Array.from(
        new Set(productVariants.map((v) => v.sizeLabel).filter(Boolean))
      );
      let minPrice = product ? product.minPrice : null;
      let maxPrice = product ? product.maxPrice : null;
      if (product && (minPrice === null || maxPrice === null)) {
        productVariants.forEach((v) => {
          if (typeof v.price === 'number') {
            if (minPrice === null || v.price < minPrice) minPrice = v.price;
            if (maxPrice === null || v.price > maxPrice) maxPrice = v.price;
          }
        });
      }
      if (minPrice === null) minPrice = 0;
      if (maxPrice === null) maxPrice = minPrice;

      const cat = product
        ? categories.find((c) => c.categoryKey === product.primaryCategory) || null
        : null;

      return {
        productId: ci.productId,
        name: product ? product.name : null,
        thumbnailUrl: product ? product.thumbnailUrl || null : null,
        primaryCategoryName: cat ? cat.name : product ? product.primaryCategory : null,
        style: product ? product.style : null,
        material: product ? product.material : null,
        minPrice,
        maxPrice,
        ratingAverage: product ? product.ratingAverage || 0 : 0,
        ratingCount: product ? product.ratingCount || 0 : 0,
        isMachineWashable: product ? !!product.isMachineWashable : false,
        isNonSlip: product ? !!product.isNonSlip : false,
        hasFreeShipping: product ? !!product.hasFreeShipping : false,
        hasFreeReturns: product ? !!product.hasFreeReturns : false,
        maxDeliveryDays: product ? product.maxDeliveryDays || null : null,
        keySizeOptions,
        product,
        comparisonItem: ci
      };
    });

    return {
      comparisonListId: comparisonList.id,
      maxItems: comparisonList.maxItems || 3,
      items
    };
  }

  // getAboutContent()
  getAboutContent() {
    const about = this._getFromStorage('about_content', {
      headline: '',
      body: '',
      sections: [],
      highlights: []
    });
    return about;
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', {
      supportEmail: '',
      supportPhone: '',
      supportHours: '',
      faqSummary: '',
      helpSections: []
    });
    return info;
  }

  // submitContactForm(name, email, topic, orderNumber, message)
  submitContactForm(name, email, topic, orderNumber, message) {
    if (!name || !email || !message) {
      return {
        success: false,
        ticketId: null,
        message: 'Name, email, and message are required'
      };
    }

    let tickets = this._getFromStorage('contact_tickets', []);
    if (!Array.isArray(tickets)) tickets = [];

    const ticket = {
      id: this._generateId('ticket'),
      name,
      email,
      topic: topic || null,
      orderNumber: orderNumber || null,
      message,
      createdAt: this._nowISO()
    };
    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      ticketId: ticket.id,
      message: 'Request submitted'
    };
  }

  // getShippingReturnsPolicy()
  getShippingReturnsPolicy() {
    const policy = this._getFromStorage('shipping_returns_policy', {
      shippingOverview: '',
      deliveryTimeCalculation: '',
      freeShippingConditions: '',
      freeReturnsConditions: '',
      returnProcess: '',
      sections: []
    });
    return policy;
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