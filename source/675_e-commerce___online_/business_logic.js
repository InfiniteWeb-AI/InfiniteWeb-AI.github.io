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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter(); // maintains compatibility with starter pattern
  }

  _initStorage() {
    // Core collections
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    // Legacy keys from starter (kept for compatibility, not used for main logic)
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Data model storage keys
    if (!localStorage.getItem('categories')) {
      localStorage.setItem('categories', JSON.stringify([]));
    }
    if (!localStorage.getItem('subcategories')) {
      localStorage.setItem('subcategories', JSON.stringify([]));
    }
    if (!localStorage.getItem('cart')) { // single-user cart collection (max 1 entry)
      localStorage.setItem('cart', JSON.stringify([]));
    }
    if (!localStorage.getItem('cart_items')) {
      localStorage.setItem('cart_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('wishlist')) { // single-user wishlist
      localStorage.setItem('wishlist', JSON.stringify([]));
    }
    if (!localStorage.getItem('wishlist_items')) {
      localStorage.setItem('wishlist_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('promocodes')) {
      localStorage.setItem('promocodes', JSON.stringify([]));
    }
    if (!localStorage.getItem('shipping_addresses')) {
      localStorage.setItem('shipping_addresses', JSON.stringify([]));
    }
    if (!localStorage.getItem('checkout_sessions')) {
      localStorage.setItem('checkout_sessions', JSON.stringify([]));
    }
    if (!localStorage.getItem('contact_messages')) {
      localStorage.setItem('contact_messages', JSON.stringify([]));
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return Array.isArray(defaultValue) || typeof defaultValue === 'object'
        ? JSON.parse(JSON.stringify(defaultValue))
        : defaultValue;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      // If corrupted, reset to default
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

  // ---------- Internal helpers for Cart / Wishlist / Checkout ----------

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        applied_promo_code_id: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    const carts = this._getFromStorage('cart', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('cart', carts);
  }

  _getCartItemsForCart(cartId) {
    const allItems = this._getFromStorage('cart_items', []);
    return allItems.filter(it => it.cart_id === cartId);
  }

  _recalculateCartTotals(cart) {
    const allItems = this._getFromStorage('cart_items', []);
    const items = allItems.filter(it => it.cart_id === cart.id);
    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.line_subtotal || 0);
    }

    let discount_total = 0;
    const promocodes = this._getFromStorage('promocodes', []);
    let appliedPromo = null;
    if (cart.applied_promo_code_id) {
      appliedPromo = promocodes.find(p => p.id === cart.applied_promo_code_id) || null;
      if (appliedPromo) {
        const now = new Date();
        const isActive = !!appliedPromo.is_active;
        const withinFrom = !appliedPromo.valid_from || now >= new Date(appliedPromo.valid_from);
        const withinTo = !appliedPromo.valid_to || now <= new Date(appliedPromo.valid_to);
        const meetsMin = !appliedPromo.min_order_total || subtotal >= appliedPromo.min_order_total;
        if (isActive && withinFrom && withinTo && meetsMin) {
          if (appliedPromo.discount_type === 'percentage') {
            discount_total = subtotal * (Number(appliedPromo.discount_value) / 100);
          } else if (appliedPromo.discount_type === 'fixed_amount') {
            discount_total = Math.min(subtotal, Number(appliedPromo.discount_value));
          } else if (appliedPromo.discount_type === 'free_shipping') {
            // Shipping handled at checkout; leave cart-level discount as 0
            discount_total = 0;
          }
        } else {
          // Promo no longer valid
          cart.applied_promo_code_id = null;
          appliedPromo = null;
        }
      } else {
        cart.applied_promo_code_id = null;
      }
    }

    discount_total = Number(discount_total.toFixed(2));
    const total = Number((subtotal - discount_total).toFixed(2));

    cart.subtotal = Number(subtotal.toFixed(2));
    cart.discount_total = discount_total;
    cart.total = total;
    cart.updated_at = this._now();
    this._saveCart(cart);

    return cart;
  }

  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage('wishlist', []);
    let wishlist = wishlists[0] || null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        item_ids: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlist', wishlists);
    }
    return wishlist;
  }

  _saveWishlist(wishlist) {
    const wishlists = this._getFromStorage('wishlist', []);
    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx] = wishlist;
    } else {
      wishlists.push(wishlist);
    }
    this._saveToStorage('wishlist', wishlists);
  }

  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    const sessions = this._getFromStorage('checkout_sessions', []);
    let session = sessions.find(s => s.cart_id === cart.id && s.status === 'in_progress');
    if (!session) {
      // Ensure cart totals are up to date
      const updatedCart = this._recalculateCartTotals(cart);
      const shipping_method = 'standard';
      const shipping_cost = 0;
      session = {
        id: this._generateId('checkout'),
        cart_id: updatedCart.id,
        shipping_address_id: null,
        shipping_method: shipping_method,
        shipping_cost: shipping_cost,
        status: 'in_progress',
        order_total: Number((updatedCart.total + shipping_cost).toFixed(2)),
        created_at: this._now(),
        updated_at: this._now()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }
    return session;
  }

  _saveCheckoutSession(session) {
    const sessions = this._getFromStorage('checkout_sessions', []);
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    this._saveToStorage('checkout_sessions', sessions);
  }

  _applyPromoCode(cart, promo) {
    // Validate promo against cart
    const now = new Date();
    if (!promo || !promo.is_active) {
      return { success: false, message: 'Promo code is not active.', cart: null };
    }
    if (promo.valid_from && now < new Date(promo.valid_from)) {
      return { success: false, message: 'Promo code is not yet valid.', cart: null };
    }
    if (promo.valid_to && now > new Date(promo.valid_to)) {
      return { success: false, message: 'Promo code has expired.', cart: null };
    }

    // Ensure current subtotal
    cart = this._recalculateCartTotals(cart);

    if (promo.min_order_total && cart.subtotal < promo.min_order_total) {
      return { success: false, message: 'Cart subtotal does not meet minimum required for this promo code.', cart: null };
    }

    cart.applied_promo_code_id = promo.id;
    cart = this._recalculateCartTotals(cart);

    const cartItems = this._getCartItemsForCart(cart.id);
    const item_count = cartItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);

    return {
      success: true,
      message: 'Promo code applied.',
      cart: {
        cart_id: cart.id,
        item_count,
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total,
        applied_promo_code: promo
      }
    };
  }

  _resolveProduct(productId) {
    const products = this._getFromStorage('products', []);
    return products.find(p => p.id === productId) || null;
  }

  _filterAndSortProducts(products, filters, sort) {
    let result = Array.isArray(products) ? products.slice() : [];

    if (filters && typeof filters === 'object') {
      const {
        minPrice,
        maxPrice,
        minRating,
        material,
        surfaceType,
        color,
        minSetSize,
        maxSetSize,
        isSet,
        freeShipping,
        sameDayDelivery,
        sameDayZip,
        freeReturns
      } = filters;

      result = result.filter(p => {
        if (p.status && p.status !== 'active') return false;

        if (minPrice != null && p.price < minPrice) return false;
        if (maxPrice != null && p.price > maxPrice) return false;

        if (minRating != null && p.average_rating != null && p.average_rating < minRating) return false;

        if (material && p.material && p.material !== material) return false;

        if (surfaceType && p.surface_type && p.surface_type !== surfaceType) return false;

        if (typeof isSet === 'boolean') {
          const flag = !!p.is_set;
          if (flag !== isSet) return false;
        }

        if (minSetSize != null) {
          const size = p.set_size != null ? p.set_size : 0;
          if (size < minSetSize) return false;
        }
        if (maxSetSize != null) {
          const size = p.set_size != null ? p.set_size : 0;
          if (size > maxSetSize) return false;
        }

        if (typeof freeShipping === 'boolean') {
          if (!!p.free_shipping !== freeShipping) return false;
        }

        if (typeof freeReturns === 'boolean') {
          if (!!p.free_returns !== freeReturns) return false;
        }

        if (sameDayDelivery) {
          if (!p.same_day_delivery_available) return false;
          if (sameDayZip) {
            const zips = Array.isArray(p.same_day_delivery_zip_codes) ? p.same_day_delivery_zip_codes : [];
            if (!zips.includes(sameDayZip)) return false;
          }
        }

        if (color) {
          const wanted = String(color).toLowerCase();
          const colors = [];
          if (Array.isArray(p.color_options)) {
            for (const c of p.color_options) {
              colors.push(String(c).toLowerCase());
            }
          }
          if (p.default_color) {
            colors.push(String(p.default_color).toLowerCase());
          }
          if (colors.length && !colors.includes(wanted)) return false;
        }

        return true;
      });
    }

    if (sort && typeof sort === 'object') {
      const sortBy = sort.sortBy || null;
      const sortDirection = (sort.sortDirection || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
      if (sortBy === 'price' || sortBy === 'rating' || sortBy === 'created_at') {
        result.sort((a, b) => {
          let av, bv;
          if (sortBy === 'price') {
            av = a.price || 0;
            bv = b.price || 0;
          } else if (sortBy === 'rating') {
            av = a.average_rating || 0;
            bv = b.average_rating || 0;
          } else {
            // created_at
            av = a.created_at ? new Date(a.created_at).getTime() : 0;
            bv = b.created_at ? new Date(b.created_at).getTime() : 0;
          }
          if (av < bv) return sortDirection === 'asc' ? -1 : 1;
          if (av > bv) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }

  _computeAvailableFilters(products) {
    const items = Array.isArray(products) ? products : [];
    let min = null;
    let max = null;
    const materialsSet = new Set();
    const colorsSet = new Set();
    const surfaceSet = new Set();
    const sizeSet = new Set();
    let freeShippingAvailable = false;
    let sameDayAvailable = false;
    let freeReturnsAvailable = false;

    for (const p of items) {
      if (p.price != null) {
        if (min === null || p.price < min) min = p.price;
        if (max === null || p.price > max) max = p.price;
      }
      if (p.material) materialsSet.add(p.material);
      if (p.surface_type) surfaceSet.add(p.surface_type);
      if (Array.isArray(p.color_options)) {
        p.color_options.forEach(c => colorsSet.add(String(c)));
      }
      if (p.is_set && p.set_size != null) {
        sizeSet.add(p.set_size);
      }
      if (p.free_shipping) freeShippingAvailable = true;
      if (p.same_day_delivery_available) sameDayAvailable = true;
      if (p.free_returns) freeReturnsAvailable = true;
    }

    const price = {
      min: min != null ? min : 0,
      max: max != null ? max : 0
    };

    const thresholds = [1, 2, 3, 4, 4.5, 5];
    const ratingOptions = [];
    for (const t of thresholds) {
      if (items.some(p => (p.average_rating || 0) >= t)) {
        ratingOptions.push(t);
      }
    }

    return {
      price,
      materials: Array.from(materialsSet),
      colors: Array.from(colorsSet),
      surface_types: Array.from(surfaceSet),
      set_sizes: Array.from(sizeSet).sort((a, b) => a - b),
      shipping_options: {
        free_shipping_available: freeShippingAvailable,
        same_day_delivery_available: sameDayAvailable
      },
      returns_options: {
        free_returns_available: freeReturnsAvailable
      },
      rating_options: ratingOptions
    };
  }

  // ---------- Legacy-like core interface from starter (wrapper) ----------

  addToCart(userId, productId, quantity = 1) {
    const result = this.addProductToCart(productId, quantity);
    return { success: !!result.success, cartId: result.cart ? result.cart.cart_id : null };
  }

  _findOrCreateCart(userId) {
    return this._getOrCreateCart();
  }

  // ---------- Public Interfaces ----------

  // getHeaderState
  getHeaderState() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItemsForCart(cart.id);
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []).filter(it => it.wishlist_id === wishlist.id);

    const cart_item_count = cartItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
    const cart_subtotal = Number(cart.subtotal || 0);
    const wishlist_item_count = wishlistItems.length;

    return {
      cart_item_count,
      cart_subtotal,
      wishlist_item_count
    };
  }

  // getCategoriesForNavigation
  getCategoriesForNavigation() {
    const categories = this._getFromStorage('categories', []);
    const sorted = categories.slice().sort((a, b) => {
      const av = a.sort_order != null ? a.sort_order : 0;
      const bv = b.sort_order != null ? b.sort_order : 0;
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return sorted.map(c => ({
      key: c.key,
      name: c.name,
      description: c.description || '',
      sort_order: c.sort_order != null ? c.sort_order : 0
    }));
  }

  // getHomepageData
  getHomepageData() {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []).filter(p => p.status === 'active');
    const subcategories = this._getFromStorage('subcategories', []);

    const featured_categories = categories
      .slice()
      .sort((a, b) => {
        const av = a.sort_order != null ? a.sort_order : 0;
        const bv = b.sort_order != null ? b.sort_order : 0;
        if (av < bv) return -1;
        if (av > bv) return 1;
        return 0;
      })
      .slice(0, 5)
      .map(c => ({
        key: c.key,
        name: c.name,
        description: c.description || ''
      }));

    const withCategoryInfo = (p) => {
      const cat = categories.find(c => c.key === p.category_key) || {};
      const sub = subcategories.find(s => s.key === p.subcategory_key) || {};
      const image_url = Array.isArray(p.image_urls) && p.image_urls.length ? p.image_urls[0] : '';
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        average_rating: p.average_rating,
        rating_count: p.rating_count,
        image_url,
        free_shipping: !!p.free_shipping,
        same_day_delivery_available: !!p.same_day_delivery_available,
        free_returns: !!p.free_returns,
        category_key: p.category_key,
        category_name: cat.name || '',
        subcategory_key: p.subcategory_key,
        subcategory_name: sub.name || ''
      };
    };

    const featured_products = products
      .slice()
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 10)
      .map(withCategoryInfo);

    const popular_products = products
      .slice()
      .sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0))
      .slice(0, 10)
      .map(withCategoryInfo);

    return {
      featured_categories,
      featured_products,
      popular_products
    };
  }

  // getFeaturedProducts(categoryKey)
  getFeaturedProducts(categoryKey) {
    const categories = this._getFromStorage('categories', []);
    const subcategories = this._getFromStorage('subcategories', []);
    let products = this._getFromStorage('products', []).filter(p => p.status === 'active');

    if (categoryKey) {
      products = products.filter(p => p.category_key === categoryKey);
    }

    products = products
      .slice()
      .sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0))
      .slice(0, 20);

    return products.map(p => {
      const cat = categories.find(c => c.key === p.category_key) || {};
      const sub = subcategories.find(s => s.key === p.subcategory_key) || {};
      const image_url = Array.isArray(p.image_urls) && p.image_urls.length ? p.image_urls[0] : '';
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        average_rating: p.average_rating,
        rating_count: p.rating_count,
        image_url,
        free_shipping: !!p.free_shipping,
        same_day_delivery_available: !!p.same_day_delivery_available,
        free_returns: !!p.free_returns,
        category_key: p.category_key,
        category_name: cat.name || '',
        subcategory_key: p.subcategory_key,
        subcategory_name: sub.name || ''
      };
    });
  }

  // getSubcategoriesForCategory(categoryKey)
  getSubcategoriesForCategory(categoryKey) {
    const subcategories = this._getFromStorage('subcategories', []);
    const filtered = subcategories.filter(s => s.category_key === categoryKey);
    return filtered
      .slice()
      .sort((a, b) => {
        const av = a.sort_order != null ? a.sort_order : 0;
        const bv = b.sort_order != null ? b.sort_order : 0;
        if (av < bv) return -1;
        if (av > bv) return 1;
        return 0;
      })
      .map(s => ({
        id: s.id,
        key: s.key,
        name: s.name,
        description: s.description || '',
        sort_order: s.sort_order != null ? s.sort_order : 0
      }));
  }

  // getCategoryFilterOptions(categoryKey, subcategoryKey)
  getCategoryFilterOptions(categoryKey, subcategoryKey) {
    const products = this._getFromStorage('products', []).filter(p => {
      if (p.status !== 'active') return false;
      if (p.category_key !== categoryKey) return false;
      if (subcategoryKey && p.subcategory_key !== subcategoryKey) return false;
      return true;
    });
    return this._computeAvailableFilters(products);
  }

  // getCategoryProducts(categoryKey, subcategoryKey, filters, sort, page, pageSize)
  getCategoryProducts(categoryKey, subcategoryKey, filters, sort, page, pageSize) {
    const categories = this._getFromStorage('categories', []);
    const subcategories = this._getFromStorage('subcategories', []);
    const category = categories.find(c => c.key === categoryKey) || { key: categoryKey, name: '' };
    const subcategory = subcategoryKey
      ? (subcategories.find(s => s.key === subcategoryKey && s.category_key === categoryKey) || { key: subcategoryKey, name: '' })
      : null;

    let products = this._getFromStorage('products', []).filter(p => {
      if (p.status !== 'active') return false;
      if (p.category_key !== categoryKey) return false;
      if (subcategoryKey && p.subcategory_key !== subcategoryKey) return false;
      return true;
    });

    products = this._filterAndSortProducts(products, filters || {}, sort || {});

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalItems = products.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / size));
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = products.slice(start, end);

    const mappedProducts = pageItems.map(p => {
      const image_url = Array.isArray(p.image_urls) && p.image_urls.length ? p.image_urls[0] : '';
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        average_rating: p.average_rating,
        rating_count: p.rating_count,
        image_url,
        material: p.material || null,
        surface_type: p.surface_type || null,
        is_set: !!p.is_set,
        set_size: p.set_size != null ? p.set_size : null,
        free_shipping: !!p.free_shipping,
        same_day_delivery_available: !!p.same_day_delivery_available,
        free_returns: !!p.free_returns
      };
    });

    const breadcrumbs = [
      { label: 'Home', category_key: null, subcategory_key: null },
      { label: category.name || category.key, category_key: category.key, subcategory_key: null }
    ];
    if (subcategory) {
      breadcrumbs.push({
        label: subcategory.name || subcategory.key,
        category_key: category.key,
        subcategory_key: subcategory.key
      });
    }

    return {
      category: {
        key: category.key,
        name: category.name || ''
      },
      subcategory: subcategory
        ? { key: subcategory.key, name: subcategory.name || '' }
        : null,
      breadcrumbs,
      applied_filters: {
        minPrice: filters && filters.minPrice != null ? filters.minPrice : null,
        maxPrice: filters && filters.maxPrice != null ? filters.maxPrice : null,
        minRating: filters && filters.minRating != null ? filters.minRating : null,
        material: filters ? filters.material || null : null,
        surfaceType: filters ? filters.surfaceType || null : null,
        color: filters ? filters.color || null : null,
        minSetSize: filters && filters.minSetSize != null ? filters.minSetSize : null,
        maxSetSize: filters && filters.maxSetSize != null ? filters.maxSetSize : null,
        isSet: filters && typeof filters.isSet === 'boolean' ? filters.isSet : null,
        freeShipping: filters && typeof filters.freeShipping === 'boolean' ? filters.freeShipping : null,
        sameDayDelivery: filters && typeof filters.sameDayDelivery === 'boolean' ? filters.sameDayDelivery : null,
        sameDayZip: filters ? filters.sameDayZip || null : null,
        freeReturns: filters && typeof filters.freeReturns === 'boolean' ? filters.freeReturns : null
      },
      sort: {
        sortBy: sort && sort.sortBy ? sort.sortBy : null,
        sortDirection: sort && sort.sortDirection ? sort.sortDirection : null
      },
      products: mappedProducts,
      pagination: {
        page: currentPage,
        pageSize: size,
        totalItems,
        totalPages
      }
    };
  }

  // searchProducts(query, filters, sort, page, pageSize)
  searchProducts(query, filters, sort, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const allProducts = this._getFromStorage('products', []).filter(p => p.status === 'active');
    const initialMatches = allProducts.filter(p => {
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });

    const available_filters = this._computeAvailableFilters(initialMatches);
    const filteredProducts = this._filterAndSortProducts(initialMatches, filters || {}, sort || {});

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalItems = filteredProducts.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / size));
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = filteredProducts.slice(start, end);

    const mappedProducts = pageItems.map(p => {
      const image_url = Array.isArray(p.image_urls) && p.image_urls.length ? p.image_urls[0] : '';
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        average_rating: p.average_rating,
        rating_count: p.rating_count,
        image_url,
        material: p.material || null,
        surface_type: p.surface_type || null,
        is_set: !!p.is_set,
        set_size: p.set_size != null ? p.set_size : null,
        free_shipping: !!p.free_shipping,
        same_day_delivery_available: !!p.same_day_delivery_available,
        free_returns: !!p.free_returns
      };
    });

    return {
      query: query || '',
      applied_filters: {
        minPrice: filters && filters.minPrice != null ? filters.minPrice : null,
        maxPrice: filters && filters.maxPrice != null ? filters.maxPrice : null,
        minRating: filters && filters.minRating != null ? filters.minRating : null,
        material: filters ? filters.material || null : null,
        surfaceType: filters ? filters.surfaceType || null : null,
        color: filters ? filters.color || null : null,
        minSetSize: filters && filters.minSetSize != null ? filters.minSetSize : null,
        maxSetSize: filters && filters.maxSetSize != null ? filters.maxSetSize : null,
        isSet: filters && typeof filters.isSet === 'boolean' ? filters.isSet : null,
        freeShipping: filters && typeof filters.freeShipping === 'boolean' ? filters.freeShipping : null,
        sameDayDelivery: filters && typeof filters.sameDayDelivery === 'boolean' ? filters.sameDayDelivery : null,
        sameDayZip: filters ? filters.sameDayZip || null : null,
        freeReturns: filters && typeof filters.freeReturns === 'boolean' ? filters.freeReturns : null
      },
      sort: {
        sortBy: sort && sort.sortBy ? sort.sortBy : null,
        sortDirection: sort && sort.sortDirection ? sort.sortDirection : null
      },
      available_filters,
      products: mappedProducts,
      pagination: {
        page: currentPage,
        pageSize: size,
        totalItems,
        totalPages
      }
    };
  }

  // getSearchFilterOptions(query)
  getSearchFilterOptions(query) {
    const q = (query || '').trim().toLowerCase();
    const products = this._getFromStorage('products', []).filter(p => {
      if (p.status !== 'active') return false;
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
    return this._computeAvailableFilters(products);
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return null;
    }

    const categories = this._getFromStorage('categories', []);
    const subcategories = this._getFromStorage('subcategories', []);
    const category = categories.find(c => c.key === product.category_key) || {};
    const subcategory = subcategories.find(s => s.key === product.subcategory_key) || {};

    const shipping_badges = [];
    if (product.free_shipping) shipping_badges.push('Free Shipping');
    if (product.same_day_delivery_available) shipping_badges.push('Same-day delivery');
    if (product.free_returns) shipping_badges.push('Free returns');

    let returns_policy_summary = '';
    if (product.free_returns) {
      returns_policy_summary = 'This item is eligible for free returns.';
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug || null,
      description: product.description || '',
      price: product.price,
      status: product.status,
      category_key: product.category_key,
      category_name: category.name || '',
      subcategory_key: product.subcategory_key,
      subcategory_name: subcategory.name || '',
      material: product.material || null,
      surface_type: product.surface_type || null,
      color_options: Array.isArray(product.color_options) ? product.color_options : [],
      default_color: product.default_color || null,
      is_set: !!product.is_set,
      set_size: product.set_size != null ? product.set_size : null,
      average_rating: product.average_rating,
      rating_count: product.rating_count,
      free_shipping: !!product.free_shipping,
      same_day_delivery_available: !!product.same_day_delivery_available,
      same_day_delivery_zip_codes: Array.isArray(product.same_day_delivery_zip_codes)
        ? product.same_day_delivery_zip_codes
        : [],
      free_returns: !!product.free_returns,
      image_urls: Array.isArray(product.image_urls) ? product.image_urls : [],
      brand: product.brand || null,
      shipping_badges,
      returns_policy_summary
    };
  }

  // addProductToCart(productId, quantity, selectedColor, selectedMaterial, selectedSetSize)
  addProductToCart(productId, quantity, selectedColor, selectedMaterial, selectedSetSize) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId && p.status === 'active');
    if (!product) {
      return { success: false, message: 'Product not found or inactive.', cart: null };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);

    let existing = allItems.find(it =>
      it.cart_id === cart.id &&
      it.product_id === productId &&
      (it.selected_color || null) === (selectedColor || null) &&
      (it.selected_material || null) === (selectedMaterial || null) &&
      (it.selected_set_size != null ? it.selected_set_size : null) === (selectedSetSize != null ? selectedSetSize : null)
    );

    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + qty;
      existing.line_subtotal = Number((existing.unit_price * existing.quantity).toFixed(2));
      existing.added_at = existing.added_at || this._now();
    } else {
      existing = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        unit_price: product.price,
        quantity: qty,
        selected_color: selectedColor || null,
        selected_material: selectedMaterial || null,
        selected_set_size: selectedSetSize != null ? selectedSetSize : null,
        line_subtotal: Number((product.price * qty).toFixed(2)),
        added_at: this._now()
      };
      allItems.push(existing);
      if (!Array.isArray(cart.item_ids)) {
        cart.item_ids = [];
      }
      if (!cart.item_ids.includes(existing.id)) {
        cart.item_ids.push(existing.id);
      }
    }

    this._saveToStorage('cart_items', allItems);
    const updatedCart = this._recalculateCartTotals(cart);

    const cartItems = this._getCartItemsForCart(updatedCart.id);
    const item_count = cartItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);

    return {
      success: true,
      message: 'Product added to cart.',
      cart: {
        cart_id: updatedCart.id,
        item_count,
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total,
        total: updatedCart.total
      }
    };
  }

  // addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const product = this._resolveProduct(productId);
    if (!product) {
      return { success: false, message: 'Product not found.', wishlist_item_id: null, wishlist_item_count: 0 };
    }

    const wishlist = this._getOrCreateWishlist();
    const allItems = this._getFromStorage('wishlist_items', []);

    const existing = allItems.find(it => it.wishlist_id === wishlist.id && it.product_id === productId);
    if (existing) {
      const count = allItems.filter(it => it.wishlist_id === wishlist.id).length;
      return { success: true, message: 'Product already in wishlist.', wishlist_item_id: existing.id, wishlist_item_count: count };
    }

    const item = {
      id: this._generateId('wishlistitem'),
      wishlist_id: wishlist.id,
      product_id: product.id,
      product_name_snapshot: product.name,
      added_at: this._now()
    };
    allItems.push(item);
    if (!Array.isArray(wishlist.item_ids)) wishlist.item_ids = [];
    wishlist.item_ids.push(item.id);
    wishlist.updated_at = this._now();

    this._saveToStorage('wishlist_items', allItems);
    this._saveWishlist(wishlist);

    const count = allItems.filter(it => it.wishlist_id === wishlist.id).length;

    return {
      success: true,
      message: 'Product added to wishlist.',
      wishlist_item_id: item.id,
      wishlist_item_count: count
    };
  }

  // getWishlistItems (must resolve product foreign key)
  getWishlistItems() {
    const wishlist = this._getOrCreateWishlist();
    const allItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForWishlist = allItems.filter(it => it.wishlist_id === wishlist.id);

    const items = itemsForWishlist.map(it => {
      const product = products.find(p => p.id === it.product_id) || null;
      const image_url = product && Array.isArray(product.image_urls) && product.image_urls.length ? product.image_urls[0] : '';
      return {
        wishlist_item_id: it.id,
        product_id: it.product_id,
        product_name: it.product_name_snapshot,
        image_url,
        price: product ? product.price : null,
        average_rating: product ? product.average_rating : null,
        added_at: it.added_at || null,
        // foreign key resolution
        product
      };
    });

    return {
      wishlist_id: wishlist.id,
      items
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    let allItems = this._getFromStorage('wishlist_items', []);
    const idx = allItems.findIndex(it => it.id === wishlistItemId);
    if (idx === -1) {
      const wishlist = this._getOrCreateWishlist();
      const count = allItems.filter(it => it.wishlist_id === wishlist.id).length;
      return { success: false, message: 'Wishlist item not found.', wishlist_item_count: count };
    }

    const item = allItems[idx];
    allItems.splice(idx, 1);
    this._saveToStorage('wishlist_items', allItems);

    const wishlists = this._getFromStorage('wishlist', []);
    const wishlist = wishlists[0] || null;
    if (wishlist && Array.isArray(wishlist.item_ids)) {
      wishlist.item_ids = wishlist.item_ids.filter(id => id !== wishlistItemId);
      wishlist.updated_at = this._now();
      this._saveWishlist(wishlist);
    }

    const count = allItems.filter(it => wishlist && it.wishlist_id === wishlist.id).length;

    return {
      success: true,
      message: 'Wishlist item removed.',
      wishlist_item_count: count
    };
  }

  // moveWishlistItemToCart(wishlistItemId, quantity, selectedColor, selectedMaterial, selectedSetSize)
  moveWishlistItemToCart(wishlistItemId, quantity, selectedColor, selectedMaterial, selectedSetSize) {
    const allItems = this._getFromStorage('wishlist_items', []);
    const item = allItems.find(it => it.id === wishlistItemId);
    if (!item) {
      return { success: false, message: 'Wishlist item not found.', cart: null, wishlist_item_count: allItems.length };
    }

    const addResult = this.addProductToCart(item.product_id, quantity || 1, selectedColor, selectedMaterial, selectedSetSize);
    if (!addResult.success) {
      const wishlist = this._getOrCreateWishlist();
      const count = allItems.filter(it2 => it2.wishlist_id === wishlist.id).length;
      return { success: false, message: addResult.message, cart: addResult.cart, wishlist_item_count: count };
    }

    // Remove from wishlist
    const removeResult = this.removeWishlistItem(wishlistItemId);

    return {
      success: true,
      message: 'Wishlist item moved to cart.',
      cart: addResult.cart,
      wishlist_item_count: removeResult.wishlist_item_count
    };
  }

  // getCartDetails (must resolve product foreign key)
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const allItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const promocodes = this._getFromStorage('promocodes', []);

    const itemsForCart = allItems.filter(it => it.cart_id === updatedCart.id);

    const items = itemsForCart.map(it => {
      const product = products.find(p => p.id === it.product_id) || null;
      const image_url = product && Array.isArray(product.image_urls) && product.image_urls.length ? product.image_urls[0] : '';
      return {
        cart_item_id: it.id,
        product_id: it.product_id,
        product_name: it.product_name_snapshot,
        image_url,
        unit_price: it.unit_price,
        quantity: it.quantity,
        line_subtotal: it.line_subtotal,
        selected_color: it.selected_color || null,
        selected_material: it.selected_material || null,
        selected_set_size: it.selected_set_size != null ? it.selected_set_size : null,
        // foreign key resolution
        product
      };
    });

    let applied_promo_code = null;
    if (updatedCart.applied_promo_code_id) {
      applied_promo_code = promocodes.find(p => p.id === updatedCart.applied_promo_code_id) || null;
      if (applied_promo_code) {
        applied_promo_code = {
          code: applied_promo_code.code,
          description: applied_promo_code.description || '',
          discount_type: applied_promo_code.discount_type,
          discount_value: applied_promo_code.discount_value
        };
      }
    }

    return {
      cart_id: updatedCart.id,
      items,
      subtotal: updatedCart.subtotal,
      discount_total: updatedCart.discount_total,
      total: updatedCart.total,
      applied_promo_code
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    if (quantity == null) {
      return { success: false, message: 'Quantity is required.', cart: null };
    }

    let allItems = this._getFromStorage('cart_items', []);
    const idx = allItems.findIndex(it => it.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    const cartItem = allItems[idx];
    const cart = this._getOrCreateCart();

    if (quantity <= 0) {
      // Remove item if quantity is zero or negative
      allItems.splice(idx, 1);
      this._saveToStorage('cart_items', allItems);
      if (Array.isArray(cart.item_ids)) {
        cart.item_ids = cart.item_ids.filter(id => id !== cartItemId);
      }
    } else {
      cartItem.quantity = quantity;
      cartItem.line_subtotal = Number((cartItem.unit_price * quantity).toFixed(2));
      allItems[idx] = cartItem;
      this._saveToStorage('cart_items', allItems);
    }

    const updatedCart = this._recalculateCartTotals(cart);

    // Build full cart summary with foreign key resolution
    const products = this._getFromStorage('products', []);
    const itemsForCart = this._getCartItemsForCart(updatedCart.id);
    const items = itemsForCart.map(it => {
      const product = products.find(p => p.id === it.product_id) || null;
      const image_url = product && Array.isArray(product.image_urls) && product.image_urls.length ? product.image_urls[0] : '';
      return {
        cart_item_id: it.id,
        product_id: it.product_id,
        product_name: it.product_name_snapshot,
        image_url,
        unit_price: it.unit_price,
        quantity: it.quantity,
        line_subtotal: it.line_subtotal,
        selected_color: it.selected_color || null,
        selected_material: it.selected_material || null,
        selected_set_size: it.selected_set_size != null ? it.selected_set_size : null,
        product
      };
    });

    return {
      success: true,
      message: 'Cart updated.',
      cart: {
        cart_id: updatedCart.id,
        items,
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total,
        total: updatedCart.total
      }
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let allItems = this._getFromStorage('cart_items', []);
    const idx = allItems.findIndex(it => it.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    const cartItem = allItems[idx];
    allItems.splice(idx, 1);
    this._saveToStorage('cart_items', allItems);

    const cart = this._getOrCreateCart();
    if (Array.isArray(cart.item_ids)) {
      cart.item_ids = cart.item_ids.filter(id => id !== cartItemId);
    }

    const updatedCart = this._recalculateCartTotals(cart);

    const products = this._getFromStorage('products', []);
    const itemsForCart = this._getCartItemsForCart(updatedCart.id);
    const items = itemsForCart.map(it => {
      const product = products.find(p => p.id === it.product_id) || null;
      const image_url = product && Array.isArray(product.image_urls) && product.image_urls.length ? product.image_urls[0] : '';
      return {
        cart_item_id: it.id,
        product_id: it.product_id,
        product_name: it.product_name_snapshot,
        image_url,
        unit_price: it.unit_price,
        quantity: it.quantity,
        line_subtotal: it.line_subtotal,
        selected_color: it.selected_color || null,
        selected_material: it.selected_material || null,
        selected_set_size: it.selected_set_size != null ? it.selected_set_size : null,
        product
      };
    });

    return {
      success: true,
      message: 'Cart item removed.',
      cart: {
        cart_id: updatedCart.id,
        items,
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total,
        total: updatedCart.total
      }
    };
  }

  // applyPromoCodeToCart(promoCode)
  applyPromoCodeToCart(promoCode) {
    const code = (promoCode || '').trim();
    if (!code) {
      return { success: false, message: 'Promo code is required.', cart: null };
    }

    const cart = this._getOrCreateCart();
    const promocodes = this._getFromStorage('promocodes', []);
    const promo = promocodes.find(p => (p.code || '').toLowerCase() === code.toLowerCase()) || null;

    if (!promo) {
      return { success: false, message: 'Promo code not found.', cart: null };
    }

    const result = this._applyPromoCode(cart, promo);
    if (!result.success) {
      return { success: false, message: result.message, cart: null };
    }

    return {
      success: true,
      message: result.message,
      cart: result.cart
    };
  }

  // proceedToCheckout()
  proceedToCheckout() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const cartItems = this._getCartItemsForCart(updatedCart.id);

    const session = this._getOrCreateCheckoutSession();

    const items = cartItems.map(it => ({
      product_id: it.product_id,
      product_name: it.product_name_snapshot,
      unit_price: it.unit_price,
      quantity: it.quantity,
      line_subtotal: it.line_subtotal
    }));

    const subtotal = updatedCart.subtotal;
    const discount_total = updatedCart.discount_total;
    const total = updatedCart.total;
    const shipping_method = session.shipping_method || 'standard';
    const shipping_cost = session.shipping_cost != null ? session.shipping_cost : 0;
    const order_total = Number((total + shipping_cost).toFixed(2));

    session.order_total = order_total;
    session.updated_at = this._now();
    this._saveCheckoutSession(session);

    return {
      success: true,
      checkout_session_id: session.id,
      order_summary: {
        cart_id: updatedCart.id,
        items,
        subtotal,
        discount_total,
        total,
        shipping_method,
        shipping_cost,
        order_total
      }
    };
  }

  // getCheckoutSessionSummary()
  getCheckoutSessionSummary() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const cartItems = this._getCartItemsForCart(updatedCart.id);
    const session = this._getOrCreateCheckoutSession();

    const shipping_addresses = this._getFromStorage('shipping_addresses', []);
    const shipping_address = session.shipping_address_id
      ? (shipping_addresses.find(a => a.id === session.shipping_address_id) || null)
      : null;

    const items = cartItems.map(it => ({
      product_id: it.product_id,
      product_name: it.product_name_snapshot,
      unit_price: it.unit_price,
      quantity: it.quantity,
      line_subtotal: it.line_subtotal
    }));

    const subtotal = updatedCart.subtotal;
    const discount_total = updatedCart.discount_total;
    const total = updatedCart.total;
    const shipping_cost = session.shipping_cost != null ? session.shipping_cost : 0;
    const order_total = Number((total + shipping_cost).toFixed(2));

    const shipping_address_obj = shipping_address
      ? {
          full_name: shipping_address.full_name,
          street_address: shipping_address.street_address,
          city: shipping_address.city,
          state: shipping_address.state || '',
          postal_code: shipping_address.postal_code,
          country: shipping_address.country,
          phone_number: shipping_address.phone_number
        }
      : null;

    return {
      checkout_session_id: session.id,
      status: session.status,
      shipping_address: shipping_address_obj,
      shipping_method: session.shipping_method || 'standard',
      shipping_cost,
      order_summary: {
        cart_id: updatedCart.id,
        items,
        subtotal,
        discount_total,
        total,
        shipping_cost,
        order_total
      }
    };
  }

  // updateCheckoutShippingAddress(shippingAddress)
  updateCheckoutShippingAddress(shippingAddress) {
    if (!shippingAddress || typeof shippingAddress !== 'object') {
      return { success: false, message: 'Shipping address is required.', shipping_address_id: null, checkout: null };
    }

    const address = {
      id: this._generateId('shipaddr'),
      full_name: shippingAddress.full_name || '',
      street_address: shippingAddress.street_address || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      postal_code: shippingAddress.postal_code || '',
      country: shippingAddress.country || '',
      phone_number: shippingAddress.phone_number || '',
      created_at: this._now()
    };

    const addresses = this._getFromStorage('shipping_addresses', []);
    addresses.push(address);
    this._saveToStorage('shipping_addresses', addresses);

    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const session = this._getOrCreateCheckoutSession();

    session.shipping_address_id = address.id;
    const shipping_cost = session.shipping_cost != null ? session.shipping_cost : 0;
    session.order_total = Number((updatedCart.total + shipping_cost).toFixed(2));
    session.updated_at = this._now();
    this._saveCheckoutSession(session);

    return {
      success: true,
      message: 'Shipping address updated.',
      shipping_address_id: address.id,
      checkout: {
        checkout_session_id: session.id,
        status: session.status,
        shipping_method: session.shipping_method || 'standard',
        shipping_cost: session.shipping_cost != null ? session.shipping_cost : 0,
        order_total: session.order_total
      }
    };
  }

  // updateCheckoutShippingMethod(shippingMethod)
  updateCheckoutShippingMethod(shippingMethod) {
    const method = (shippingMethod || '').toLowerCase();
    if (method !== 'standard' && method !== 'same_day') {
      return { success: false, message: 'Invalid shipping method.', checkout: null };
    }

    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const session = this._getOrCreateCheckoutSession();

    session.shipping_method = method;
    // Simple shipping cost model; can be adjusted without mocking domain data for products
    let shipping_cost = 0;
    if (method === 'same_day') {
      shipping_cost = 15; // flat fee for same-day
    }
    session.shipping_cost = shipping_cost;
    session.order_total = Number((updatedCart.total + shipping_cost).toFixed(2));
    session.updated_at = this._now();
    this._saveCheckoutSession(session);

    return {
      success: true,
      message: 'Shipping method updated.',
      checkout: {
        checkout_session_id: session.id,
        status: session.status,
        shipping_method: session.shipping_method,
        shipping_cost: session.shipping_cost,
        order_total: session.order_total
      }
    };
  }

  // continueCheckoutToPaymentStep()
  continueCheckoutToPaymentStep() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const session = this._getOrCreateCheckoutSession();

    const shipping_cost = session.shipping_cost != null ? session.shipping_cost : 0;
    const order_total = Number((updatedCart.total + shipping_cost).toFixed(2));
    session.order_total = order_total;
    session.updated_at = this._now();
    // We keep status as 'in_progress' since payment not completed
    this._saveCheckoutSession(session);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task5_continueToPayment', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      message: 'Checkout advanced to payment step.',
      checkout_session_id: session.id,
      status: session.status,
      order_summary: {
        order_total,
        shipping_cost,
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total
      }
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (!raw) {
      // No mocking of domain content; return empty structure if none stored
      return {
        title: '',
        body: '',
        mission: '',
        value_proposition: '',
        quality_and_returns_summary: ''
      };
    }
    try {
      const data = JSON.parse(raw);
      return {
        title: data.title || '',
        body: data.body || '',
        mission: data.mission || '',
        value_proposition: data.value_proposition || '',
        quality_and_returns_summary: data.quality_and_returns_summary || ''
      };
    } catch (e) {
      return {
        title: '',
        body: '',
        mission: '',
        value_proposition: '',
        quality_and_returns_summary: ''
      };
    }
  }

  // getContactPageContent()
  getContactPageContent() {
    const raw = localStorage.getItem('contact_page_content');
    if (!raw) {
      return {
        email: '',
        phone: '',
        address: '',
        contact_form_fields: [],
        help_links: []
      };
    }
    try {
      const data = JSON.parse(raw);
      return {
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        contact_form_fields: Array.isArray(data.contact_form_fields) ? data.contact_form_fields : [],
        help_links: Array.isArray(data.help_links) ? data.help_links : []
      };
    } catch (e) {
      return {
        email: '',
        phone: '',
        address: '',
        contact_form_fields: [],
        help_links: []
      };
    }
  }

  // submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    if (!name || !email || !subject || !message) {
      return { success: false, message: 'All fields are required.', ticket_id: null };
    }

    const msgs = this._getFromStorage('contact_messages', []);
    const ticket = {
      id: this._generateId('ticket'),
      name,
      email,
      subject,
      message,
      created_at: this._now()
    };
    msgs.push(ticket);
    this._saveToStorage('contact_messages', msgs);

    return {
      success: true,
      message: 'Your message has been submitted.',
      ticket_id: ticket.id
    };
  }

  // getShippingAndReturnsContent()
  getShippingAndReturnsContent() {
    const raw = localStorage.getItem('shipping_returns_content');
    if (!raw) {
      return {
        shipping_options: [],
        same_day_delivery_info: '',
        free_returns_policy: '',
        free_shipping_details: ''
      };
    }
    try {
      const data = JSON.parse(raw);
      return {
        shipping_options: Array.isArray(data.shipping_options) ? data.shipping_options : [],
        same_day_delivery_info: data.same_day_delivery_info || '',
        free_returns_policy: data.free_returns_policy || '',
        free_shipping_details: data.free_shipping_details || ''
      };
    } catch (e) {
      return {
        shipping_options: [],
        same_day_delivery_info: '',
        free_returns_policy: '',
        free_shipping_details: ''
      };
    }
  }

  // getFaqContent()
  getFaqContent() {
    const raw = localStorage.getItem('faq_content');
    if (!raw) {
      return {
        faqs: [],
        related_policy_links: []
      };
    }
    try {
      const data = JSON.parse(raw);
      return {
        faqs: Array.isArray(data.faqs) ? data.faqs : [],
        related_policy_links: Array.isArray(data.related_policy_links) ? data.related_policy_links : []
      };
    } catch (e) {
      return {
        faqs: [],
        related_policy_links: []
      };
    }
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    if (!raw) {
      return {
        title: '',
        body: '',
        contact_for_privacy: ''
      };
    }
    try {
      const data = JSON.parse(raw);
      return {
        title: data.title || '',
        body: data.body || '',
        contact_for_privacy: data.contact_for_privacy || ''
      };
    } catch (e) {
      return {
        title: '',
        body: '',
        contact_for_privacy: ''
      };
    }
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const raw = localStorage.getItem('terms_conditions_content');
    if (!raw) {
      return {
        title: '',
        body: ''
      };
    }
    try {
      const data = JSON.parse(raw);
      return {
        title: data.title || '',
        body: data.body || ''
      };
    } catch (e) {
      return {
        title: '',
        body: ''
      };
    }
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