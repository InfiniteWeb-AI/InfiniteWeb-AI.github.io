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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    // Legacy example keys (not used but kept for compatibility)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Data model storage keys
    const keys = [
      'themes',
      'categories',
      'coupons',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'compare_lists',
      'compare_items',
      'libraries',
      'library_items',
      'orders',
      'order_items',
      'billing_infos',
      'documentations',
      'global_settings'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === '') {
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

  // -------------------------
  // Global settings & currency
  // -------------------------

  _getGlobalSettingsRecord() {
    let settings = this._getFromStorage('global_settings', []);
    if (!Array.isArray(settings)) {
      settings = [];
    }
    if (settings.length === 0) {
      const record = {
        id: 'global',
        current_currency: 'usd',
        usd_to_eur_rate: 1,
        eur_to_usd_rate: 1,
        last_updated: this._nowISO()
      };
      settings.push(record);
      this._saveToStorage('global_settings', settings);
      return record;
    }
    return settings[0];
  }

  _updateGlobalSettingsRecord(record) {
    let settings = this._getFromStorage('global_settings', []);
    if (!Array.isArray(settings) || settings.length === 0) {
      settings = [record];
    } else {
      settings[0] = record;
    }
    this._saveToStorage('global_settings', settings);
  }

  _convertPriceToCurrentCurrency(theme, targetCurrency) {
    if (!theme) return 0;
    const settings = this._getGlobalSettingsRecord();
    const currency = targetCurrency || settings.current_currency || 'usd';

    if (theme.price_type === 'free') {
      return 0;
    }

    let price = typeof theme.base_price === 'number' ? theme.base_price : 0;
    const baseCurrency = theme.base_currency || 'usd';

    if (baseCurrency === currency) {
      return Number(price.toFixed(2));
    }

    let rate = 1;
    if (baseCurrency === 'usd' && currency === 'eur') {
      rate = settings.usd_to_eur_rate || 1;
    } else if (baseCurrency === 'eur' && currency === 'usd') {
      rate = settings.eur_to_usd_rate || 1;
    }

    const converted = price * rate;
    return Number(converted.toFixed(2));
  }

  // -------------------------
  // Entity helpers
  // -------------------------

  _findThemeById(themeId) {
    const themes = this._getFromStorage('themes', []);
    return themes.find(function (t) { return t.id === themeId; }) || null;
  }

  _getCategoryNameByCode(code) {
    const categories = this._getFromStorage('categories', []);
    const cat = categories.find(function (c) { return c.code === code; });
    return cat ? cat.name : null;
  }

  // -------------------------
  // Cart helpers
  // -------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    if (!Array.isArray(carts)) {
      carts = [];
    }
    let cart = carts[0];
    if (!cart) {
      const settings = this._getGlobalSettingsRecord();
      cart = {
        id: this._generateId('cart'),
        currency: settings.current_currency || 'usd',
        items: [], // array of cart_item ids
        subtotal: 0,
        discount_total: 0,
        tax_total: 0,
        total: 0,
        applied_coupon_code: null,
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _updateCart(cart) {
    let carts = this._getFromStorage('carts', []);
    if (!Array.isArray(carts)) {
      carts = [];
    }
    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _recalculateCartTotals(cart) {
    if (!cart) return;
    const settings = this._getGlobalSettingsRecord();
    const currentCurrency = settings.current_currency || 'usd';
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) {
      cartItems = [];
    }
    const themes = this._getFromStorage('themes', []);

    let subtotal = 0;
    let changed = false;

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cart_id !== cart.id) continue;
      const theme = themes.find(function (t) { return t.id === item.theme_id; });
      if (!theme) continue;
      const unitPrice = this._convertPriceToCurrentCurrency(theme, currentCurrency);
      const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      item.unit_price = unitPrice;
      item.currency = currentCurrency;
      item.is_free = theme.price_type === 'free' || unitPrice === 0;
      item.line_subtotal = Number((unitPrice * qty).toFixed(2));
      changed = true;
      subtotal += item.line_subtotal;
    }

    if (changed) {
      this._saveToStorage('cart_items', cartItems);
    }

    cart.currency = currentCurrency;
    cart.subtotal = Number(subtotal.toFixed(2));
    const discount = cart.discount_total || 0;
    const tax = cart.tax_total || 0;
    const total = Math.max(cart.subtotal - discount + tax, 0);
    cart.total = Number(total.toFixed(2));
    cart.updated_at = this._nowISO();
    this._updateCart(cart);
  }

  _buildCartView(cart) {
    if (!cart) return null;
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) {
      cartItems = [];
    }
    const themes = this._getFromStorage('themes', []);

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cart_id !== cart.id) continue;
      const theme = themes.find(function (t) { return t.id === item.theme_id; }) || null;
      const imageUrl = theme && theme.image_url ? theme.image_url : null;
      items.push({
        cart_item_id: item.id,
        theme_id: item.theme_id,
        theme_name: item.theme_name,
        image_url: imageUrl,
        selected_license_scope: item.selected_license_scope || null,
        selected_license_duration: item.selected_license_duration || null,
        selected_support_plan: item.selected_support_plan || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_subtotal: item.line_subtotal,
        is_free: !!item.is_free,
        currency: item.currency,
        added_at: item.added_at,
        // Foreign key resolution
        theme: theme
      });
    }

    return {
      id: cart.id,
      currency: cart.currency,
      items: items,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      tax_total: cart.tax_total || 0,
      total: cart.total || 0,
      applied_coupon_code: cart.applied_coupon_code || null
    };
  }

  // -------------------------
  // Wishlist helpers
  // -------------------------

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    if (!Array.isArray(wishlists)) {
      wishlists = [];
    }
    let wishlist = wishlists[0];
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        items: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  // -------------------------
  // Compare list helpers
  // -------------------------

  _getOrCreateCompareList() {
    let lists = this._getFromStorage('compare_lists', []);
    if (!Array.isArray(lists)) {
      lists = [];
    }
    let list = lists[0];
    if (!list) {
      list = {
        id: this._generateId('compare_list'),
        items: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      lists.push(list);
      this._saveToStorage('compare_lists', lists);
    }
    return list;
  }

  // -------------------------
  // Library helpers
  // -------------------------

  _getOrCreateLibrary() {
    let libs = this._getFromStorage('libraries', []);
    if (!Array.isArray(libs)) {
      libs = [];
    }
    let lib = libs[0];
    if (!lib) {
      lib = {
        id: this._generateId('library'),
        items: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      libs.push(lib);
      this._saveToStorage('libraries', libs);
    }
    return lib;
  }

  // -------------------------
  // Theme listing helpers
  // -------------------------

  _filterThemes(themes, filters, currentCurrency) {
    const self = this;
    if (!Array.isArray(themes)) return [];
    return themes.filter(function (theme) {
      if (!theme || theme.status === 'inactive' || theme.status === 'archived') {
        return false;
      }

      if (filters.categoryCode && theme.category_code !== filters.categoryCode) {
        return false;
      }

      if (filters.priceType && theme.price_type && theme.price_type !== filters.priceType) {
        return false;
      }

      const price = self._convertPriceToCurrentCurrency(theme, currentCurrency);

      if (typeof filters.priceMin === 'number' && price < filters.priceMin) {
        return false;
      }
      if (typeof filters.priceMax === 'number' && price > filters.priceMax) {
        return false;
      }

      if (typeof filters.minRating === 'number') {
        const r = typeof theme.average_rating === 'number' ? theme.average_rating : 0;
        if (r < filters.minRating) return false;
      }

      if (typeof filters.maxRating === 'number') {
        const r2 = typeof theme.average_rating === 'number' ? theme.average_rating : 0;
        if (r2 > filters.maxRating) return false;
      }

      if (filters.hasOneClickDemoImport && !theme.has_one_click_demo_import) return false;
      if (filters.supportsDarkMode && !theme.supports_dark_mode) return false;
      if (filters.optimizedForPerformance && !theme.optimized_for_performance) return false;
      if (filters.hasNewsletterSignup && !theme.has_newsletter_signup) return false;
      if (filters.compatibleWithGutenberg && !theme.compatible_with_gutenberg) return false;
      if (filters.supportsElementor && !theme.supports_elementor) return false;
      if (filters.supportsWoocommerce && !theme.supports_woocommerce) return false;

      if (typeof filters.minReviews === 'number') {
        const rc = typeof theme.rating_count === 'number' ? theme.rating_count : 0;
        if (rc < filters.minReviews) return false;
      }

      if (filters.releaseDateRange && filters.releaseDateRange !== 'all_time') {
        const releaseStr = theme.release_date;
        if (!releaseStr) return false;
        const releaseDate = new Date(releaseStr).getTime();
        if (isNaN(releaseDate)) return false;
        const now = Date.now();
        let cutoff = 0;
        if (filters.releaseDateRange === 'last_30_days') {
          cutoff = now - 30 * 24 * 60 * 60 * 1000;
        } else if (filters.releaseDateRange === 'last_12_months') {
          cutoff = now - 365 * 24 * 60 * 60 * 1000;
        }
        if (cutoff && releaseDate < cutoff) return false;
      }

      if (filters.searchQuery) {
        const q = String(filters.searchQuery).toLowerCase();
        const textParts = [];
        textParts.push(theme.name || '');
        textParts.push(theme.slug || '');
        if (theme.short_description) textParts.push(theme.short_description);
        if (theme.full_description) textParts.push(theme.full_description);
        if (Array.isArray(theme.tags)) textParts.push(theme.tags.join(' '));
        const haystack = textParts.join(' ').toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }

      return true;
    });
  }

  _sortThemes(themes, sortBy, currentCurrency) {
    if (!Array.isArray(themes)) return [];
    const self = this;
    const sb = sortBy || 'newest';
    const sorted = themes.slice();
    sorted.sort(function (a, b) {
      function price(t) {
        return self._convertPriceToCurrentCurrency(t, currentCurrency);
      }
      if (sb === 'price_low_to_high') {
        return price(a) - price(b);
      }
      if (sb === 'price_high_to_low') {
        return price(b) - price(a);
      }
      if (sb === 'rating_high_to_low') {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (rb !== ra) return rb - ra;
        return price(a) - price(b);
      }
      if (sb === 'best_selling') {
        const sa = typeof a.sales_count === 'number' ? a.sales_count : 0;
        const sb2 = typeof b.sales_count === 'number' ? b.sales_count : 0;
        if (sb2 !== sa) return sb2 - sa;
        return price(a) - price(b);
      }
      if (sb === 'newest') {
        const da = a.release_date ? new Date(a.release_date).getTime() : 0;
        const db = b.release_date ? new Date(b.release_date).getTime() : 0;
        if (db !== da) return db - da;
        return price(a) - price(b);
      }
      // Default fallback
      return 0;
    });
    return sorted;
  }

  // -------------------------
  // Coupon & order helpers
  // -------------------------

  _applyCouponToCart(cart, couponCode) {
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null };
    }
    const rawCode = couponCode || '';
    const codeLower = rawCode.toLowerCase();
    const coupons = this._getFromStorage('coupons', []);
    const coupon = coupons.find(function (c) {
      return (c.code || '').toLowerCase() === codeLower;
    });
    if (!coupon || !coupon.active) {
      return { success: false, message: 'Coupon not found or inactive', cart: this._buildCartView(cart) };
    }

    const now = Date.now();
    if (coupon.valid_from) {
      const fromTime = new Date(coupon.valid_from).getTime();
      if (!isNaN(fromTime) && now < fromTime) {
        return { success: false, message: 'Coupon not yet valid', cart: this._buildCartView(cart) };
      }
    }
    if (coupon.valid_to) {
      const toTime = new Date(coupon.valid_to).getTime();
      if (!isNaN(toTime) && now > toTime) {
        return { success: false, message: 'Coupon expired', cart: this._buildCartView(cart) };
      }
    }

    // Ensure at least one item and applicability by category (if restricted)
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];
    const themes = this._getFromStorage('themes', []);

    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });
    if (itemsForCart.length === 0) {
      return { success: false, message: 'Cart is empty', cart: this._buildCartView(cart) };
    }

    if (Array.isArray(coupon.applicable_category_codes) && coupon.applicable_category_codes.length > 0) {
      const allowed = new Set(coupon.applicable_category_codes);
      for (let i = 0; i < itemsForCart.length; i++) {
        const it = itemsForCart[i];
        const theme = themes.find(function (t) { return t.id === it.theme_id; });
        if (!theme || !allowed.has(theme.category_code)) {
          return { success: false, message: 'Coupon not applicable to cart items', cart: this._buildCartView(cart) };
        }
      }
    }

    // Recalculate subtotal to be safe
    this._recalculateCartTotals(cart);
    const subtotal = cart.subtotal || 0;
    let discount = 0;

    if (coupon.discount_type === 'percentage') {
      const v = typeof coupon.discount_value === 'number' ? coupon.discount_value : 0;
      discount = subtotal * (v / 100);
    } else if (coupon.discount_type === 'fixed_amount') {
      discount = typeof coupon.discount_value === 'number' ? coupon.discount_value : 0;
    }

    if (discount > subtotal) discount = subtotal;
    discount = Number(discount.toFixed(2));

    cart.applied_coupon_code = coupon.code;
    cart.discount_total = discount;
    const tax = cart.tax_total || 0;
    cart.total = Number(Math.max(subtotal - discount + tax, 0).toFixed(2));

    this._updateCart(cart);

    // Optionally increment usage_count
    if (typeof coupon.usage_count === 'number') {
      coupon.usage_count += 1;
    } else {
      coupon.usage_count = 1;
    }
    this._saveToStorage('coupons', coupons);

    return { success: true, message: 'Coupon applied', cart: this._buildCartView(cart) };
  }

  _createOrderFromCart(cart, billingInfoId) {
    if (!cart) return null;
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];

    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });
    if (itemsForCart.length === 0) {
      return null;
    }

    let orders = this._getFromStorage('orders', []);
    if (!Array.isArray(orders)) orders = [];
    let orderItems = this._getFromStorage('order_items', []);
    if (!Array.isArray(orderItems)) orderItems = [];

    const orderId = this._generateId('order');
    const orderItemIds = [];

    for (let i = 0; i < itemsForCart.length; i++) {
      const ci = itemsForCart[i];
      const orderItem = {
        id: this._generateId('order_item'),
        order_id: orderId,
        theme_id: ci.theme_id,
        theme_name: ci.theme_name,
        license_scope: ci.selected_license_scope || null,
        license_duration: ci.selected_license_duration || null,
        support_plan: ci.selected_support_plan || null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        is_free: !!ci.is_free
      };
      orderItems.push(orderItem);
      orderItemIds.push(orderItem.id);
    }

    this._saveToStorage('order_items', orderItems);

    const subtotal = cart.subtotal || 0;
    const discount = cart.discount_total || 0;
    const tax = cart.tax_total || 0;
    const total = cart.total != null ? cart.total : Math.max(subtotal - discount + tax, 0);

    const order = {
      id: orderId,
      currency: cart.currency || 'usd',
      items: orderItemIds,
      billing_info_id: billingInfoId || null,
      subtotal: Number(subtotal.toFixed(2)),
      discount_total: Number(discount.toFixed(2)),
      tax_total: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2)),
      applied_coupon_code: cart.applied_coupon_code || null,
      status: 'completed',
      created_at: this._nowISO(),
      completed_at: this._nowISO()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    return order;
  }

  _addOrderItemsToLibrary(order) {
    if (!order) return false;
    const library = this._getOrCreateLibrary();
    let libs = this._getFromStorage('libraries', []);
    if (!Array.isArray(libs)) libs = [];
    let libraryItems = this._getFromStorage('library_items', []);
    if (!Array.isArray(libraryItems)) libraryItems = [];
    const orderItems = this._getFromStorage('order_items', []);
    const themes = this._getFromStorage('themes', []);

    const existingThemeIds = new Set();
    for (let i = 0; i < libraryItems.length; i++) {
      if (libraryItems[i].library_id === library.id) {
        existingThemeIds.add(libraryItems[i].theme_id);
      }
    }

    const addedIds = [];
    for (let j = 0; j < order.items.length; j++) {
      const orderItemId = order.items[j];
      const oi = orderItems.find(function (x) { return x.id === orderItemId; });
      if (!oi) continue;
      if (existingThemeIds.has(oi.theme_id)) continue;
      const theme = themes.find(function (t) { return t.id === oi.theme_id; });
      const libraryItem = {
        id: this._generateId('library_item'),
        library_id: library.id,
        theme_id: oi.theme_id,
        theme_name: oi.theme_name,
        license_scope: oi.license_scope || null,
        license_duration: oi.license_duration || null,
        acquired_via: oi.is_free ? 'free' : 'purchase',
        order_id: order.id,
        added_at: this._nowISO()
      };
      libraryItems.push(libraryItem);
      addedIds.push(libraryItem.id);
      existingThemeIds.add(oi.theme_id);
      library.items.push(libraryItem.id);
    }

    library.updated_at = this._nowISO();
    // Save library & items
    const libIdx = libs.findIndex(function (l) { return l.id === library.id; });
    if (libIdx >= 0) libs[libIdx] = library;
    else libs.push(library);
    this._saveToStorage('libraries', libs);
    this._saveToStorage('library_items', libraryItems);

    return addedIds.length > 0;
  }

  _buildOrderView(order) {
    if (!order) return null;
    const orderItems = this._getFromStorage('order_items', []);
    const themes = this._getFromStorage('themes', []);

    const items = [];
    for (let i = 0; i < order.items.length; i++) {
      const orderItemId = order.items[i];
      const oi = orderItems.find(function (x) { return x.id === orderItemId; });
      if (!oi) continue;
      const theme = themes.find(function (t) { return t.id === oi.theme_id; }) || null;
      items.push({
        order_item_id: oi.id,
        theme_id: oi.theme_id,
        theme_name: oi.theme_name,
        license_scope: oi.license_scope || null,
        license_duration: oi.license_duration || null,
        support_plan: oi.support_plan || null,
        quantity: oi.quantity,
        unit_price: oi.unit_price,
        line_subtotal: oi.line_subtotal,
        is_free: !!oi.is_free,
        theme: theme
      });
    }

    return {
      id: order.id,
      currency: order.currency,
      items: items,
      subtotal: order.subtotal,
      discount_total: order.discount_total,
      tax_total: order.tax_total,
      total: order.total,
      applied_coupon_code: order.applied_coupon_code || null,
      status: order.status,
      created_at: order.created_at,
      completed_at: order.completed_at
    };
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // getGlobalHeaderState()
  getGlobalHeaderState() {
    const settings = this._getGlobalSettingsRecord();

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];
    let cartCount = 0;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id) {
        const q = typeof cartItems[i].quantity === 'number' ? cartItems[i].quantity : 1;
        cartCount += q;
      }
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    if (!Array.isArray(wishlistItems)) wishlistItems = [];
    let wishlistCount = 0;
    for (let j = 0; j < wishlistItems.length; j++) {
      if (wishlistItems[j].wishlist_id === wishlist.id) wishlistCount++;
    }

    const compareList = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items', []);
    if (!Array.isArray(compareItems)) compareItems = [];
    let compareCount = 0;
    for (let k = 0; k < compareItems.length; k++) {
      if (compareItems[k].compare_list_id === compareList.id) compareCount++;
    }

    const library = this._getOrCreateLibrary();
    let libraryItems = this._getFromStorage('library_items', []);
    if (!Array.isArray(libraryItems)) libraryItems = [];
    let libraryCount = 0;
    for (let m = 0; m < libraryItems.length; m++) {
      if (libraryItems[m].library_id === library.id) libraryCount++;
    }

    return {
      current_currency: settings.current_currency || 'usd',
      cart_item_count: cartCount,
      wishlist_item_count: wishlistCount,
      compare_item_count: compareCount,
      library_item_count: libraryCount
    };
  }

  // getGlobalSettings()
  getGlobalSettings() {
    const settings = this._getGlobalSettingsRecord();
    return {
      current_currency: settings.current_currency || 'usd',
      usd_to_eur_rate: settings.usd_to_eur_rate || 1,
      eur_to_usd_rate: settings.eur_to_usd_rate || 1,
      last_updated: settings.last_updated || null
    };
  }

  // setCurrentCurrency(currency)
  setCurrentCurrency(currency) {
    if (currency !== 'usd' && currency !== 'eur') {
      return {
        success: false,
        current_currency: this._getGlobalSettingsRecord().current_currency || 'usd',
        usd_to_eur_rate: this._getGlobalSettingsRecord().usd_to_eur_rate || 1,
        eur_to_usd_rate: this._getGlobalSettingsRecord().eur_to_usd_rate || 1,
        message: 'Unsupported currency'
      };
    }

    const settings = this._getGlobalSettingsRecord();
    settings.current_currency = currency;
    settings.last_updated = this._nowISO();
    this._updateGlobalSettingsRecord(settings);

    // Recalculate existing carts in new currency
    let carts = this._getFromStorage('carts', []);
    if (!Array.isArray(carts)) carts = [];
    for (let i = 0; i < carts.length; i++) {
      this._recalculateCartTotals(carts[i]);
    }

    return {
      success: true,
      current_currency: settings.current_currency,
      usd_to_eur_rate: settings.usd_to_eur_rate || 1,
      eur_to_usd_rate: settings.eur_to_usd_rate || 1,
      message: 'Currency updated'
    };
  }

  // getHomePageData()
  getHomePageData() {
    const settings = this._getGlobalSettingsRecord();
    const currentCurrency = settings.current_currency || 'usd';
    const categories = this._getFromStorage('categories', []);
    const themesAll = this._getFromStorage('themes', []);
    const themes = themesAll.filter(function (t) { return t && t.status === 'active'; });

    const self = this;

    function mapThemeToFeatured(theme) {
      return {
        theme_id: theme.id,
        name: theme.name,
        slug: theme.slug,
        category_code: theme.category_code,
        category_name: self._getCategoryNameByCode(theme.category_code),
        short_description: theme.short_description || '',
        average_rating: theme.average_rating || 0,
        rating_count: theme.rating_count || 0,
        sales_count: theme.sales_count || 0,
        price_display: self._convertPriceToCurrentCurrency(theme, currentCurrency),
        price_currency: currentCurrency,
        is_free: theme.price_type === 'free',
        supports_elementor: !!theme.supports_elementor,
        supports_woocommerce: !!theme.supports_woocommerce,
        supports_dark_mode: !!theme.supports_dark_mode,
        optimized_for_performance: !!theme.optimized_for_performance,
        has_newsletter_signup: !!theme.has_newsletter_signup,
        image_url: theme.image_url || null,
        theme: theme
      };
    }

    function mapThemeToBestSelling(theme) {
      return {
        theme_id: theme.id,
        name: theme.name,
        slug: theme.slug,
        category_code: theme.category_code,
        category_name: self._getCategoryNameByCode(theme.category_code),
        average_rating: theme.average_rating || 0,
        rating_count: theme.rating_count || 0,
        sales_count: theme.sales_count || 0,
        price_display: self._convertPriceToCurrentCurrency(theme, currentCurrency),
        price_currency: currentCurrency,
        is_free: theme.price_type === 'free',
        image_url: theme.image_url || null,
        theme: theme
      };
    }

    function mapThemeToLatest(theme) {
      return {
        theme_id: theme.id,
        name: theme.name,
        slug: theme.slug,
        category_code: theme.category_code,
        category_name: self._getCategoryNameByCode(theme.category_code),
        release_date: theme.release_date || null,
        average_rating: theme.average_rating || 0,
        price_display: self._convertPriceToCurrentCurrency(theme, currentCurrency),
        price_currency: currentCurrency,
        is_free: theme.price_type === 'free',
        image_url: theme.image_url || null,
        theme: theme
      };
    }

    const featuredSorted = this._sortThemes(themes, 'rating_high_to_low', currentCurrency).slice(0, 8);
    const bestSellingSorted = this._sortThemes(themes, 'best_selling', currentCurrency).slice(0, 8);
    const latestSorted = this._sortThemes(themes, 'newest', currentCurrency).slice(0, 8);

    const featuredThemes = featuredSorted.map(mapThemeToFeatured);
    const bestSellingThemes = bestSellingSorted.map(mapThemeToBestSelling);
    const latestThemes = latestSorted.map(mapThemeToLatest);

    const quickLinks = [
      { code: 'free_themes', label: 'Free themes' },
      { code: 'best_sellers', label: 'Best sellers' },
      { code: 'latest_releases', label: 'Latest releases' }
    ];

    return {
      categories: categories,
      featured_themes: featuredThemes,
      best_selling_themes: bestSellingThemes,
      latest_themes: latestThemes,
      quick_links: quickLinks,
      current_currency: currentCurrency
    };
  }

  // getCategoriesForNavigation()
  getCategoriesForNavigation() {
    return this._getFromStorage('categories', []);
  }

  // getThemeFilterOptions(context_type = 'category', categoryCode, searchQuery)
  getThemeFilterOptions(context_type, categoryCode, searchQuery) {
    const ctxType = context_type || 'category';
    const settings = this._getGlobalSettingsRecord();
    const currentCurrency = settings.current_currency || 'usd';
    const allThemes = this._getFromStorage('themes', []);

    let themes = allThemes.filter(function (t) { return t && t.status === 'active'; });

    if (ctxType === 'category' && categoryCode) {
      themes = themes.filter(function (t) { return t.category_code === categoryCode; });
    } else if (ctxType === 'search' && searchQuery) {
      const q = String(searchQuery).toLowerCase();
      themes = themes.filter(function (theme) {
        const textParts = [];
        textParts.push(theme.name || '');
        if (theme.short_description) textParts.push(theme.short_description);
        if (theme.full_description) textParts.push(theme.full_description);
        if (Array.isArray(theme.tags)) textParts.push(theme.tags.join(' '));
        const haystack = textParts.join(' ').toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    } else if (ctxType === 'free_themes') {
      themes = themes.filter(function (t) { return t.price_type === 'free'; });
    }

    let minPrice = null;
    let maxPrice = null;
    let maxReviews = 0;
    let hasFeatures = {
      has_one_click_demo_import: false,
      supports_dark_mode: false,
      optimized_for_performance: false,
      has_newsletter_signup: false,
      compatible_with_gutenberg: false,
      supports_elementor: false,
      supports_woocommerce: false
    };

    for (let i = 0; i < themes.length; i++) {
      const t = themes[i];
      const price = this._convertPriceToCurrentCurrency(t, currentCurrency);
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
      const rc = typeof t.rating_count === 'number' ? t.rating_count : 0;
      if (rc > maxReviews) maxReviews = rc;

      if (t.has_one_click_demo_import) hasFeatures.has_one_click_demo_import = true;
      if (t.supports_dark_mode) hasFeatures.supports_dark_mode = true;
      if (t.optimized_for_performance) hasFeatures.optimized_for_performance = true;
      if (t.has_newsletter_signup) hasFeatures.has_newsletter_signup = true;
      if (t.compatible_with_gutenberg) hasFeatures.compatible_with_gutenberg = true;
      if (t.supports_elementor) hasFeatures.supports_elementor = true;
      if (t.supports_woocommerce) hasFeatures.supports_woocommerce = true;
    }

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const ratingRanges = [
      { id: '4_up', label: '4 stars & up', min_rating: 4.0, max_rating: 5.0 },
      { id: '4_5_up', label: '4.5 stars & up', min_rating: 4.5, max_rating: 5.0 },
      { id: '3_to_3_9', label: '3 to 3.9 stars', min_rating: 3.0, max_rating: 3.9 }
    ];

    const releaseRanges = [
      { id: 'last_30_days', label: 'Last 30 days', value: 'last_30_days' },
      { id: 'last_12_months', label: 'Last 12 months', value: 'last_12_months' },
      { id: 'all_time', label: 'All time', value: 'all_time' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'best_selling', label: 'Best selling' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      price: {
        min: minPrice,
        max: maxPrice
      },
      rating: {
        available_ranges: ratingRanges
      },
      features: hasFeatures,
      release_date: {
        available_ranges: releaseRanges
      },
      reviews: {
        min_reviews_step: 5,
        max_reviews: maxReviews
      },
      sort_options: sortOptions
    };
  }

  // getThemeListing(...)
  getThemeListing(
    searchQuery,
    categoryCode,
    priceMin,
    priceMax,
    minRating,
    maxRating,
    hasOneClickDemoImport,
    supportsDarkMode,
    optimizedForPerformance,
    hasNewsletterSignup,
    compatibleWithGutenberg,
    supportsElementor,
    supportsWoocommerce,
    releaseDateRange,
    minReviews,
    priceType,
    sortBy,
    page,
    pageSize
  ) {
    const settings = this._getGlobalSettingsRecord();
    const currentCurrency = settings.current_currency || 'usd';
    const allThemes = this._getFromStorage('themes', []);
    const activeThemes = allThemes.filter(function (t) { return t && t.status === 'active'; });

    const filters = {
      searchQuery: searchQuery,
      categoryCode: categoryCode,
      priceMin: typeof priceMin === 'number' ? priceMin : undefined,
      priceMax: typeof priceMax === 'number' ? priceMax : undefined,
      minRating: typeof minRating === 'number' ? minRating : undefined,
      maxRating: typeof maxRating === 'number' ? maxRating : undefined,
      hasOneClickDemoImport: !!hasOneClickDemoImport,
      supportsDarkMode: !!supportsDarkMode,
      optimizedForPerformance: !!optimizedForPerformance,
      hasNewsletterSignup: !!hasNewsletterSignup,
      compatibleWithGutenberg: !!compatibleWithGutenberg,
      supportsElementor: !!supportsElementor,
      supportsWoocommerce: !!supportsWoocommerce,
      releaseDateRange: releaseDateRange,
      minReviews: typeof minReviews === 'number' ? minReviews : undefined,
      priceType: priceType
    };

    const filtered = this._filterThemes(activeThemes, filters, currentCurrency);
    const sorted = this._sortThemes(filtered, sortBy || 'newest', currentCurrency);

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalItems = sorted.length;
    const totalPages = size > 0 ? Math.ceil(totalItems / size) : 1;
    const startIndex = (currentPage - 1) * size;
    const paged = sorted.slice(startIndex, startIndex + size);

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    if (!Array.isArray(wishlistItems)) wishlistItems = [];
    const wishlistThemeIds = new Set();
    for (let i = 0; i < wishlistItems.length; i++) {
      if (wishlistItems[i].wishlist_id === wishlist.id) {
        wishlistThemeIds.add(wishlistItems[i].theme_id);
      }
    }

    const compareList = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items', []);
    if (!Array.isArray(compareItems)) compareItems = [];
    const compareThemeIds = new Set();
    for (let j = 0; j < compareItems.length; j++) {
      if (compareItems[j].compare_list_id === compareList.id) {
        compareThemeIds.add(compareItems[j].theme_id);
      }
    }

    const items = [];
    const self = this;
    for (let k = 0; k < paged.length; k++) {
      const t = paged[k];
      items.push({
        theme_id: t.id,
        name: t.name,
        slug: t.slug,
        category_code: t.category_code,
        category_name: self._getCategoryNameByCode(t.category_code),
        short_description: t.short_description || '',
        average_rating: t.average_rating || 0,
        rating_count: t.rating_count || 0,
        sales_count: t.sales_count || 0,
        price_display: self._convertPriceToCurrentCurrency(t, currentCurrency),
        price_currency: currentCurrency,
        is_free: t.price_type === 'free',
        supports_elementor: !!t.supports_elementor,
        supports_woocommerce: !!t.supports_woocommerce,
        supports_dark_mode: !!t.supports_dark_mode,
        optimized_for_performance: !!t.optimized_for_performance,
        has_newsletter_signup: !!t.has_newsletter_signup,
        compatible_with_gutenberg: !!t.compatible_with_gutenberg,
        has_one_click_demo_import: !!t.has_one_click_demo_import,
        release_date: t.release_date || null,
        image_url: t.image_url || null,
        in_wishlist: wishlistThemeIds.has(t.id),
        in_compare: compareThemeIds.has(t.id),
        theme: t
      });
    }

    return {
      items: items,
      pagination: {
        page: currentPage,
        pageSize: size,
        totalItems: totalItems,
        totalPages: totalPages
      },
      applied_filters: {
        searchQuery: searchQuery || null,
        categoryCode: categoryCode || null,
        priceMin: priceMin,
        priceMax: priceMax,
        minRating: minRating,
        maxRating: maxRating,
        hasOneClickDemoImport: !!hasOneClickDemoImport,
        supportsDarkMode: !!supportsDarkMode,
        optimizedForPerformance: !!optimizedForPerformance,
        hasNewsletterSignup: !!hasNewsletterSignup,
        compatibleWithGutenberg: !!compatibleWithGutenberg,
        supportsElementor: !!supportsElementor,
        supportsWoocommerce: !!supportsWoocommerce,
        releaseDateRange: releaseDateRange || null,
        minReviews: minReviews,
        priceType: priceType || null,
        sortBy: sortBy || 'newest'
      }
    };
  }

  // getThemeDetails(themeId)
  getThemeDetails(themeId) {
    const theme = this._findThemeById(themeId);
    if (!theme) {
      return {
        theme: null,
        pricing_in_current_currency: null,
        license_options: null,
        state_flags: {
          in_cart: false,
          in_wishlist: false,
          in_compare: false
        }
      };
    }

    const settings = this._getGlobalSettingsRecord();
    const currentCurrency = settings.current_currency || 'usd';
    const price = this._convertPriceToCurrentCurrency(theme, currentCurrency);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];
    const inCart = cartItems.some(function (ci) { return ci.cart_id === cart.id && ci.theme_id === theme.id; });

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    if (!Array.isArray(wishlistItems)) wishlistItems = [];
    const inWishlist = wishlistItems.some(function (wi) { return wi.wishlist_id === wishlist.id && wi.theme_id === theme.id; });

    const compareList = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items', []);
    if (!Array.isArray(compareItems)) compareItems = [];
    const inCompare = compareItems.some(function (ci) { return ci.compare_list_id === compareList.id && ci.theme_id === theme.id; });

    const pricing = {
      currency: currentCurrency,
      base_price: price,
      is_free: theme.price_type === 'free' || price === 0,
      formatted_price: (theme.price_type === 'free' || price === 0) ? 'Free' : price.toFixed(2) + ' ' + currentCurrency.toUpperCase()
    };

    const licenseOptions = {
      scope_options: Array.isArray(theme.supported_license_scopes) ? theme.supported_license_scopes : [],
      duration_options: Array.isArray(theme.supported_license_durations) ? theme.supported_license_durations : [],
      support_plan_options: Array.isArray(theme.supported_support_plans) ? theme.supported_support_plans : []
    };

    return {
      theme: {
        id: theme.id,
        name: theme.name,
        slug: theme.slug,
        category_code: theme.category_code,
        category_name: this._getCategoryNameByCode(theme.category_code),
        short_description: theme.short_description || '',
        full_description: theme.full_description || '',
        price_type: theme.price_type,
        base_price: theme.base_price,
        base_currency: theme.base_currency,
        average_rating: theme.average_rating || 0,
        rating_count: theme.rating_count || 0,
        sales_count: theme.sales_count || 0,
        release_date: theme.release_date || null,
        has_one_click_demo_import: !!theme.has_one_click_demo_import,
        supports_dark_mode: !!theme.supports_dark_mode,
        optimized_for_performance: !!theme.optimized_for_performance,
        has_newsletter_signup: !!theme.has_newsletter_signup,
        compatible_with_gutenberg: !!theme.compatible_with_gutenberg,
        supports_elementor: !!theme.supports_elementor,
        supports_woocommerce: !!theme.supports_woocommerce,
        tags: Array.isArray(theme.tags) ? theme.tags : [],
        image_url: theme.image_url || null,
        gallery_image_urls: Array.isArray(theme.gallery_image_urls) ? theme.gallery_image_urls : [],
        supported_license_scopes: Array.isArray(theme.supported_license_scopes) ? theme.supported_license_scopes : [],
        supported_license_durations: Array.isArray(theme.supported_license_durations) ? theme.supported_license_durations : [],
        supported_support_plans: Array.isArray(theme.supported_support_plans) ? theme.supported_support_plans : [],
        documentation_id: theme.documentation_id || null,
        demo_url: theme.demo_url || null,
        status: theme.status
      },
      pricing_in_current_currency: pricing,
      license_options: licenseOptions,
      state_flags: {
        in_cart: inCart,
        in_wishlist: inWishlist,
        in_compare: inCompare
      }
    };
  }

  // addThemeToCart(themeId, selectedLicenseScope, selectedLicenseDuration, selectedSupportPlan, quantity)
  addThemeToCart(themeId, selectedLicenseScope, selectedLicenseDuration, selectedSupportPlan, quantity) {
    const theme = this._findThemeById(themeId);
    if (!theme || theme.status === 'inactive' || theme.status === 'archived') {
      return { success: false, message: 'Theme not found or inactive', cart: null };
    }

    const cart = this._getOrCreateCart();
    const settings = this._getGlobalSettingsRecord();
    const currentCurrency = settings.current_currency || 'usd';

    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];

    const scopeOptions = Array.isArray(theme.supported_license_scopes) && theme.supported_license_scopes.length > 0
      ? theme.supported_license_scopes
      : ['single_site'];
    const durationOptions = Array.isArray(theme.supported_license_durations) && theme.supported_license_durations.length > 0
      ? theme.supported_license_durations
      : ['yearly'];
    const supportOptions = Array.isArray(theme.supported_support_plans) && theme.supported_support_plans.length > 0
      ? theme.supported_support_plans
      : ['none'];

    const scope = selectedLicenseScope || scopeOptions[0];
    const duration = selectedLicenseDuration || durationOptions[0];
    const supportPlan = selectedSupportPlan || supportOptions[0] || 'none';
    const qty = quantity && quantity > 0 ? quantity : 1;

    const unitPrice = this._convertPriceToCurrentCurrency(theme, currentCurrency);
    const lineSubtotal = Number((unitPrice * qty).toFixed(2));

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      theme_id: theme.id,
      theme_name: theme.name,
      selected_license_scope: scope,
      selected_license_duration: duration,
      selected_support_plan: supportPlan,
      quantity: qty,
      unit_price: unitPrice,
      line_subtotal: lineSubtotal,
      is_free: theme.price_type === 'free' || unitPrice === 0,
      currency: currentCurrency,
      added_at: this._nowISO()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);

    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Theme added to cart',
      cart: this._buildCartView(cart)
    };
  }

  // getCartDetails()
  getCartDetails() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const cartView = this._buildCartView(cart);
    const canCheckout = cartView && cartView.items && cartView.items.length > 0;
    return {
      cart: cartView,
      can_checkout: !!canCheckout
    };
  }

  // updateCartItem(cartItemId, quantity, selectedLicenseScope, selectedLicenseDuration, selectedSupportPlan)
  updateCartItem(cartItemId, quantity, selectedLicenseScope, selectedLicenseDuration, selectedSupportPlan) {
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx < 0) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    const item = cartItems[idx];
    if (typeof quantity === 'number' && quantity > 0) {
      item.quantity = quantity;
    }
    if (selectedLicenseScope) {
      item.selected_license_scope = selectedLicenseScope;
    }
    if (selectedLicenseDuration) {
      item.selected_license_duration = selectedLicenseDuration;
    }
    if (selectedSupportPlan) {
      item.selected_support_plan = selectedSupportPlan;
    }

    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(function (c) { return c.id === item.cart_id; }) || this._getOrCreateCart();
    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item updated',
      cart: this._buildCartView(cart)
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx < 0) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    const item = cartItems[idx];
    const cartId = item.cart_id;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('carts', []);
    if (!Array.isArray(carts)) carts = [];
    const cartIdx = carts.findIndex(function (c) { return c.id === cartId; });
    let cart = null;
    if (cartIdx >= 0) {
      cart = carts[cartIdx];
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(function (id) { return id !== cartItemId; });
      }
      this._recalculateCartTotals(cart);
      carts[cartIdx] = cart;
      this._saveToStorage('carts', carts);
    }

    return {
      success: true,
      message: 'Cart item removed',
      cart: cart ? this._buildCartView(cart) : null
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const cartView = this._buildCartView(cart);

    const billingTemplate = {
      full_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state_region: '',
      postal_code: '',
      country: '',
      email: ''
    };

    const availablePaymentMethods = [
      { code: 'test_payment', label: 'Test payment' },
      { code: 'credit_card', label: 'Credit card' },
      { code: 'paypal', label: 'PayPal' }
    ];

    return {
      cart: cartView,
      billing_template: billingTemplate,
      available_payment_methods: availablePaymentMethods
    };
  }

  // applyCouponToCart(couponCode)
  applyCouponToCart(couponCode) {
    const cart = this._getOrCreateCart();
    const result = this._applyCouponToCart(cart, couponCode);
    return {
      success: result.success,
      message: result.message,
      cart: result.cart
    };
  }

  // placeOrder(billingInfo, paymentMethodCode, acceptTerms)
  placeOrder(billingInfo, paymentMethodCode, acceptTerms) {
    if (!acceptTerms) {
      return { success: false, message: 'Terms must be accepted', order: null, library_updated: false };
    }

    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    const cartView = this._buildCartView(cart);

    if (!cartView || !cartView.items || cartView.items.length === 0) {
      return { success: false, message: 'Cart is empty', order: null, library_updated: false };
    }

    // Basic billing validation
    if (!billingInfo || !billingInfo.full_name || !billingInfo.address_line1 || !billingInfo.city || !billingInfo.postal_code || !billingInfo.email) {
      return { success: false, message: 'Missing required billing information', order: null, library_updated: false };
    }

    let billingInfos = this._getFromStorage('billing_infos', []);
    if (!Array.isArray(billingInfos)) billingInfos = [];

    const billingRecord = {
      id: this._generateId('billing_info'),
      full_name: billingInfo.full_name,
      address_line1: billingInfo.address_line1,
      address_line2: billingInfo.address_line2 || '',
      city: billingInfo.city,
      state_region: billingInfo.state_region || '',
      postal_code: billingInfo.postal_code,
      country: billingInfo.country || '',
      email: billingInfo.email,
      created_at: this._nowISO()
    };

    billingInfos.push(billingRecord);
    this._saveToStorage('billing_infos', billingInfos);

    const order = this._createOrderFromCart(cart, billingRecord.id);
    if (!order) {
      return { success: false, message: 'Unable to create order', order: null, library_updated: false };
    }

    const libraryUpdated = this._addOrderItemsToLibrary(order);

    // Clear cart items
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];
    cartItems = cartItems.filter(function (ci) { return ci.cart_id !== cart.id; });
    this._saveToStorage('cart_items', cartItems);

    cart.items = [];
    cart.subtotal = 0;
    cart.discount_total = 0;
    cart.tax_total = 0;
    cart.total = 0;
    cart.applied_coupon_code = null;
    cart.updated_at = this._nowISO();
    this._updateCart(cart);

    const orderView = this._buildOrderView(order);

    return {
      success: true,
      message: 'Order placed successfully',
      order: orderView,
      library_updated: libraryUpdated
    };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    if (!Array.isArray(wishlistItems)) wishlistItems = [];
    const themes = this._getFromStorage('themes', []);
    const settings = this._getGlobalSettingsRecord();
    const currentCurrency = settings.current_currency || 'usd';

    const items = [];
    for (let i = 0; i < wishlistItems.length; i++) {
      const wi = wishlistItems[i];
      if (wi.wishlist_id !== wishlist.id) continue;
      const theme = themes.find(function (t) { return t.id === wi.theme_id; }) || null;
      const price = theme ? this._convertPriceToCurrentCurrency(theme, currentCurrency) : 0;
      items.push({
        wishlist_item_id: wi.id,
        theme_id: wi.theme_id,
        theme_name: wi.theme_name,
        thumbnail_url: theme && theme.image_url ? theme.image_url : null,
        category_name: theme ? this._getCategoryNameByCode(theme.category_code) : null,
        average_rating: theme && theme.average_rating ? theme.average_rating : 0,
        rating_count: theme && theme.rating_count ? theme.rating_count : 0,
        price_display: price,
        price_currency: currentCurrency,
        is_free: theme ? theme.price_type === 'free' : false,
        theme: theme
      });
    }

    return { items: items };
  }

  // addThemeToWishlist(themeId)
  addThemeToWishlist(themeId) {
    const theme = this._findThemeById(themeId);
    if (!theme) {
      return { success: false, message: 'Theme not found', wishlist_item_id: null, total_wishlist_items: 0 };
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    if (!Array.isArray(wishlistItems)) wishlistItems = [];

    const exists = wishlistItems.some(function (wi) {
      return wi.wishlist_id === wishlist.id && wi.theme_id === theme.id;
    });
    if (exists) {
      const total = wishlistItems.filter(function (wi) { return wi.wishlist_id === wishlist.id; }).length;
      return { success: true, message: 'Theme already in wishlist', wishlist_item_id: null, total_wishlist_items: total };
    }

    const wishlistItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      theme_id: theme.id,
      theme_name: theme.name,
      added_at: this._nowISO()
    };

    wishlistItems.push(wishlistItem);
    this._saveToStorage('wishlist_items', wishlistItems);

    if (!Array.isArray(wishlist.items)) wishlist.items = [];
    wishlist.items.push(wishlistItem.id);
    wishlist.updated_at = this._nowISO();

    let wishlists = this._getFromStorage('wishlists', []);
    const idx = wishlists.findIndex(function (w) { return w.id === wishlist.id; });
    if (idx >= 0) wishlists[idx] = wishlist;
    else wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);

    const totalWishlistItems = wishlistItems.filter(function (wi) { return wi.wishlist_id === wishlist.id; }).length;

    return {
      success: true,
      message: 'Theme added to wishlist',
      wishlist_item_id: wishlistItem.id,
      total_wishlist_items: totalWishlistItems
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    if (!Array.isArray(wishlistItems)) wishlistItems = [];

    const idx = wishlistItems.findIndex(function (wi) { return wi.id === wishlistItemId; });
    if (idx < 0) {
      const total = wishlistItems.filter(function (wi) { return wi.wishlist_id === wishlist.id; }).length;
      return { success: false, message: 'Wishlist item not found', total_wishlist_items: total };
    }

    wishlistItems.splice(idx, 1);
    this._saveToStorage('wishlist_items', wishlistItems);

    if (Array.isArray(wishlist.items)) {
      wishlist.items = wishlist.items.filter(function (id) { return id !== wishlistItemId; });
    }
    wishlist.updated_at = this._nowISO();

    let wishlists = this._getFromStorage('wishlists', []);
    const wIdx = wishlists.findIndex(function (w) { return w.id === wishlist.id; });
    if (wIdx >= 0) wishlists[wIdx] = wishlist;
    else wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);

    const totalWishlistItems = wishlistItems.filter(function (wi) { return wi.wishlist_id === wishlist.id; }).length;

    return { success: true, message: 'Wishlist item removed', total_wishlist_items: totalWishlistItems };
  }

  // moveWishlistItemToCart(wishlistItemId, selectedLicenseScope, selectedLicenseDuration, selectedSupportPlan, quantity)
  moveWishlistItemToCart(wishlistItemId, selectedLicenseScope, selectedLicenseDuration, selectedSupportPlan, quantity) {
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    if (!Array.isArray(wishlistItems)) wishlistItems = [];
    const wishlist = this._getOrCreateWishlist();
    const wi = wishlistItems.find(function (x) { return x.id === wishlistItemId; });
    if (!wi) {
      const total = wishlistItems.filter(function (x) { return x.wishlist_id === wishlist.id; }).length;
      return { success: false, message: 'Wishlist item not found', cart: null, wishlist: { total_wishlist_items: total } };
    }

    const addResult = this.addThemeToCart(wi.theme_id, selectedLicenseScope, selectedLicenseDuration, selectedSupportPlan, quantity);

    this.removeWishlistItem(wishlistItemId);

    const updatedWishlistItems = this._getFromStorage('wishlist_items', []);
    const totalWishlistItems = updatedWishlistItems.filter(function (x) { return x.wishlist_id === wishlist.id; }).length;

    return {
      success: addResult.success,
      message: addResult.message,
      cart: addResult.cart,
      wishlist: { total_wishlist_items: totalWishlistItems }
    };
  }

  // getCompareList()
  getCompareList() {
    const compareList = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items', []);
    if (!Array.isArray(compareItems)) compareItems = [];
    const themes = this._getFromStorage('themes', []);
    const settings = this._getGlobalSettingsRecord();
    const currentCurrency = settings.current_currency || 'usd';

    const resultThemes = [];
    for (let i = 0; i < compareItems.length; i++) {
      const ci = compareItems[i];
      if (ci.compare_list_id !== compareList.id) continue;
      const theme = themes.find(function (t) { return t.id === ci.theme_id; }) || null;
      const price = theme ? this._convertPriceToCurrentCurrency(theme, currentCurrency) : 0;
      resultThemes.push({
        compare_item_id: ci.id,
        theme_id: ci.theme_id,
        theme_name: ci.theme_name,
        thumbnail_url: theme && theme.image_url ? theme.image_url : null,
        category_name: theme ? this._getCategoryNameByCode(theme.category_code) : null,
        price_display: price,
        price_currency: currentCurrency,
        average_rating: theme && theme.average_rating ? theme.average_rating : 0,
        rating_count: theme && theme.rating_count ? theme.rating_count : 0,
        sales_count: theme && theme.sales_count ? theme.sales_count : 0,
        supports_elementor: theme ? !!theme.supports_elementor : false,
        supports_woocommerce: theme ? !!theme.supports_woocommerce : false,
        compatible_with_gutenberg: theme ? !!theme.compatible_with_gutenberg : false,
        has_one_click_demo_import: theme ? !!theme.has_one_click_demo_import : false,
        supports_dark_mode: theme ? !!theme.supports_dark_mode : false,
        optimized_for_performance: theme ? !!theme.optimized_for_performance : false,
        has_newsletter_signup: theme ? !!theme.has_newsletter_signup : false,
        release_date: theme ? theme.release_date || null : null,
        supported_license_scopes: theme && Array.isArray(theme.supported_license_scopes) ? theme.supported_license_scopes : [],
        supported_license_durations: theme && Array.isArray(theme.supported_license_durations) ? theme.supported_license_durations : [],
        supported_support_plans: theme && Array.isArray(theme.supported_support_plans) ? theme.supported_support_plans : [],
        theme: theme
      });
    }

    return { themes: resultThemes };
  }

  // addThemeToCompareList(themeId)
  addThemeToCompareList(themeId) {
    const theme = this._findThemeById(themeId);
    if (!theme) {
      return { success: false, message: 'Theme not found', compare_item_id: null, total_compare_items: 0 };
    }

    const compareList = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items', []);
    if (!Array.isArray(compareItems)) compareItems = [];

    const exists = compareItems.some(function (ci) {
      return ci.compare_list_id === compareList.id && ci.theme_id === theme.id;
    });
    if (exists) {
      const total = compareItems.filter(function (ci) { return ci.compare_list_id === compareList.id; }).length;
      return { success: true, message: 'Theme already in comparison list', compare_item_id: null, total_compare_items: total };
    }

    const compareItem = {
      id: this._generateId('compare_item'),
      compare_list_id: compareList.id,
      theme_id: theme.id,
      theme_name: theme.name,
      added_at: this._nowISO()
    };

    compareItems.push(compareItem);
    this._saveToStorage('compare_items', compareItems);

    if (!Array.isArray(compareList.items)) compareList.items = [];
    compareList.items.push(compareItem.id);
    compareList.updated_at = this._nowISO();

    let lists = this._getFromStorage('compare_lists', []);
    const idx = lists.findIndex(function (l) { return l.id === compareList.id; });
    if (idx >= 0) lists[idx] = compareList;
    else lists.push(compareList);
    this._saveToStorage('compare_lists', lists);

    const totalCompareItems = compareItems.filter(function (ci) { return ci.compare_list_id === compareList.id; }).length;

    return {
      success: true,
      message: 'Theme added to comparison list',
      compare_item_id: compareItem.id,
      total_compare_items: totalCompareItems
    };
  }

  // removeCompareItem(compareItemId)
  removeCompareItem(compareItemId) {
    const compareList = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items', []);
    if (!Array.isArray(compareItems)) compareItems = [];

    const idx = compareItems.findIndex(function (ci) { return ci.id === compareItemId; });
    if (idx < 0) {
      const total = compareItems.filter(function (ci) { return ci.compare_list_id === compareList.id; }).length;
      return { success: false, message: 'Compare item not found', total_compare_items: total };
    }

    compareItems.splice(idx, 1);
    this._saveToStorage('compare_items', compareItems);

    if (Array.isArray(compareList.items)) {
      compareList.items = compareList.items.filter(function (id) { return id !== compareItemId; });
    }
    compareList.updated_at = this._nowISO();

    let lists = this._getFromStorage('compare_lists', []);
    const lIdx = lists.findIndex(function (l) { return l.id === compareList.id; });
    if (lIdx >= 0) lists[lIdx] = compareList;
    else lists.push(compareList);
    this._saveToStorage('compare_lists', lists);

    const totalCompareItems = compareItems.filter(function (ci) { return ci.compare_list_id === compareList.id; }).length;

    return { success: true, message: 'Compare item removed', total_compare_items: totalCompareItems };
  }

  // getLibrary()
  getLibrary() {
    const library = this._getOrCreateLibrary();
    let libraryItems = this._getFromStorage('library_items', []);
    if (!Array.isArray(libraryItems)) libraryItems = [];
    const themes = this._getFromStorage('themes', []);

    const items = [];
    for (let i = 0; i < libraryItems.length; i++) {
      const li = libraryItems[i];
      if (li.library_id !== library.id) continue;
      const theme = themes.find(function (t) { return t.id === li.theme_id; }) || null;
      const downloadUrl = theme ? ('/downloads/' + (theme.slug || theme.id) + '.zip') : null;
      items.push({
        library_item_id: li.id,
        theme_id: li.theme_id,
        theme_name: li.theme_name,
        thumbnail_url: theme && theme.image_url ? theme.image_url : null,
        license_scope: li.license_scope || null,
        license_duration: li.license_duration || null,
        acquired_via: li.acquired_via || null,
        download_url: downloadUrl,
        added_at: li.added_at,
        theme: theme
      });
    }

    return { items: items };
  }

  // addFreeThemeToLibrary(themeId)
  addFreeThemeToLibrary(themeId) {
    const theme = this._findThemeById(themeId);
    if (!theme) {
      return { success: false, message: 'Theme not found', library_item_id: null, library_item: null };
    }
    if (theme.price_type !== 'free' && theme.base_price > 0) {
      return { success: false, message: 'Theme is not free', library_item_id: null, library_item: null };
    }

    const library = this._getOrCreateLibrary();
    let libraryItems = this._getFromStorage('library_items', []);
    if (!Array.isArray(libraryItems)) libraryItems = [];

    const existing = libraryItems.find(function (li) {
      return li.library_id === library.id && li.theme_id === theme.id;
    });
    if (existing) {
      const downloadUrlExisting = '/downloads/' + (theme.slug || theme.id) + '.zip';
      return {
        success: true,
        message: 'Theme already in library',
        library_item_id: existing.id,
        library_item: {
          theme_id: existing.theme_id,
          theme_name: existing.theme_name,
          license_scope: existing.license_scope,
          license_duration: existing.license_duration,
          acquired_via: existing.acquired_via,
          download_url: downloadUrlExisting,
          added_at: existing.added_at
        }
      };
    }

    const libraryItem = {
      id: this._generateId('library_item'),
      library_id: library.id,
      theme_id: theme.id,
      theme_name: theme.name,
      license_scope: 'single_site',
      license_duration: 'lifetime',
      acquired_via: 'free',
      order_id: null,
      added_at: this._nowISO()
    };

    libraryItems.push(libraryItem);
    this._saveToStorage('library_items', libraryItems);

    if (!Array.isArray(library.items)) library.items = [];
    library.items.push(libraryItem.id);
    library.updated_at = this._nowISO();

    let libs = this._getFromStorage('libraries', []);
    const idx = libs.findIndex(function (l) { return l.id === library.id; });
    if (idx >= 0) libs[idx] = library;
    else libs.push(library);
    this._saveToStorage('libraries', libs);

    const downloadUrl = '/downloads/' + (theme.slug || theme.id) + '.zip';

    return {
      success: true,
      message: 'Free theme added to library',
      library_item_id: libraryItem.id,
      library_item: {
        theme_id: libraryItem.theme_id,
        theme_name: libraryItem.theme_name,
        license_scope: libraryItem.license_scope,
        license_duration: libraryItem.license_duration,
        acquired_via: libraryItem.acquired_via,
        download_url: downloadUrl,
        added_at: libraryItem.added_at
      }
    };
  }

  // getDocumentationForTheme(themeId)
  getDocumentationForTheme(themeId) {
    const docs = this._getFromStorage('documentations', []);
    let documentation = docs.find(function (d) { return d.theme_id === themeId; }) || null;

    if (!documentation) {
      const theme = this._findThemeById(themeId);
      if (theme && theme.documentation_id) {
        documentation = docs.find(function (d) { return d.id === theme.documentation_id; }) || null;
      }
    }

    // Instrumentation for task completion tracking
    try {
      if (documentation) {
        let eventsArray = [];
        const existing = localStorage.getItem('task8_documentationOpenEvents');
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (Array.isArray(parsed)) {
              eventsArray = parsed;
            }
          } catch (e2) {}
        }
        eventsArray.push({ theme_id: themeId, opened_at: this._nowISO() });
        localStorage.setItem('task8_documentationOpenEvents', JSON.stringify(eventsArray));
      }
    } catch (e) {}

    return { documentation: documentation };
  }

  // getLiveDemoInfo(themeId)
  getLiveDemoInfo(themeId) {
    const theme = this._findThemeById(themeId);
    if (!theme) {
      return {
        theme_id: themeId,
        theme_name: null,
        demo_url: null,
        supports_dark_mode: false,
        available_demo_pages: [],
        theme: null
      };
    }

    // Instrumentation for task completion tracking
    try {
      let eventsArray = [];
      const existing = localStorage.getItem('task7_liveDemoEvents');
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (Array.isArray(parsed)) {
            eventsArray = parsed;
          }
        } catch (e2) {}
      }
      eventsArray.push({ theme_id: theme.id, viewed_at: this._nowISO() });
      localStorage.setItem('task7_liveDemoEvents', JSON.stringify(eventsArray));
    } catch (e) {}

    return {
      theme_id: theme.id,
      theme_name: theme.name,
      demo_url: theme.demo_url || null,
      supports_dark_mode: !!theme.supports_dark_mode,
      available_demo_pages: [],
      theme: theme
    };
  }

  // Static content interfaces

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      title: 'About Our WordPress Theme Marketplace',
      body_html:
        '<p>We provide a curated collection of high-quality WordPress themes for blogs, shops, agencies, and creatives. ' +
        'All themes are reviewed for code quality, performance, and usability.</p>',
      highlights: [
        {
          label: 'Curated quality',
          description: 'Each theme is reviewed for performance, accessibility, and long-term maintainability.'
        },
        {
          label: 'Fair licensing',
          description: 'Transparent single-site and multi-site licensing with optional support plans.'
        },
        {
          label: 'Focused on creators',
          description: 'Built for bloggers, agencies, and ecommerce merchants who need reliable themes.'
        }
      ]
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    return {
      support_email: 'support@example-themes.com',
      business_address: 'Example Themes LLC, 123 Demo Street, Sample City',
      response_time_notice: 'We aim to respond to all inquiries within 24–48 business hours.',
      topics: [
        {
          code: 'billing',
          label: 'Billing & invoices',
          description: 'Questions about payments, invoices, or refunds.'
        },
        {
          code: 'technical_support',
          label: 'Technical support',
          description: 'Help with theme installation, configuration, or bugs.'
        },
        {
          code: 'pre_sales',
          label: 'Pre-sales questions',
          description: 'Need advice choosing a theme or license? Ask us first.'
        }
      ]
    };
  }

  // submitContactRequest(fullName, email, subject, topicCode, message)
  submitContactRequest(fullName, email, subject, topicCode, message) {
    if (!fullName || !email || !subject || !message) {
      return {
        success: false,
        message: 'Missing required fields',
        ticket_id: null,
        estimated_response_time_hours: 0
      };
    }

    // We only simulate ticket creation; no persistence required
    const ticketId = 'ticket_' + this._getNextIdCounter();

    return {
      success: true,
      message: 'Your request has been submitted',
      ticket_id: ticketId,
      estimated_response_time_hours: 24
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    return {
      sections: [
        {
          id: 'installation',
          title: 'Installation & updates',
          questions: [
            {
              question: 'How do I install a downloaded theme?',
              answer_html:
                '<p>Download the ZIP file from your library, then upload it via <strong>Appearance → Themes → Add New</strong> in your WordPress dashboard.</p>'
            },
            {
              question: 'How do I update a theme?',
              answer_html:
                '<p>Most themes can be updated directly from WordPress updates. If needed, download the latest version from your library and reinstall.</p>'
            }
          ]
        },
        {
          id: 'licensing',
          title: 'Licensing & support',
          questions: [
            {
              question: 'What is the difference between single-site and multi-site licenses?',
              answer_html:
                '<p>A single-site license allows usage on one website. A multi-site license allows usage on multiple client or personal sites, as specified in the license terms.</p>'
            },
            {
              question: 'What support plans are available?',
              answer_html:
                '<p>Support plans range from <strong>none</strong> to <strong>business</strong> and <strong>premium</strong>, covering response time guarantees and priority channels.</p>'
            }
          ]
        },
        {
          id: 'site_features',
          title: 'Site features',
          questions: [
            {
              question: 'How does the wishlist work?',
              answer_html:
                '<p>Add themes to your wishlist to review them later or compare before purchasing.</p>'
            },
            {
              question: 'What is the compare tool?',
              answer_html:
                '<p>The compare tool lets you view multiple themes side-by-side by features, ratings, and pricing.</p>'
            }
          ]
        }
      ]
    };
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    return {
      title: 'Terms of Use',
      body_html:
        '<p>By using this marketplace you agree to our licensing terms, fair use policies, and refund conditions. ' +
        'Licenses are granted per site according to the scope selected at checkout.</p>',
      last_updated: this._nowISO()
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      title: 'Privacy Policy',
      body_html:
        '<p>We collect only the data necessary to process your orders and provide support. ' +
        'We do not sell your personal data to third parties.</p>',
      last_updated: this._nowISO()
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