/*
  BusinessLogic for alcoholic beverage brand / product site
  - Uses localStorage for persistence (with Node-compatible polyfill)
  - Implements all specified interfaces
  - No DOM access; no window/document usage (except via globalThis for exports)
*/

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

  // =========================
  // Initialization & Helpers
  // =========================

  _initStorage() {
    // Core entity tables based on storage_key definitions
    const keys = [
      'users', // not in spec but preserved from template
      'categories',
      'products',
      'pack_options',
      'custom_packs',
      'custom_pack_items',
      'cart',
      'cart_items',
      'shipping_methods',
      'recipes',
      'recipe_ingredients',
      'shopping_lists',
      'shopping_list_items',
      'stores',
      'store_inventory',
      'newsletter_subscriptions',
      'wishlists',
      'wishlist_items',
      'food_pairings',
      // CMS / process tables
      'checkout_sessions',
      'orders',
      'contact_form_submissions',
      'about_page_content',
      'contact_page_content',
      'faq_entries',
      'legal_policies'
    ];

    for (const key of keys) {
      if (localStorage.getItem(key) === null) {
        // For content-like keys, initialize as appropriate type
        if (key === 'about_page_content' || key === 'contact_page_content' || key === 'legal_policies') {
          localStorage.setItem(key, JSON.stringify({}));
        } else if (key === 'faq_entries') {
          localStorage.setItem(key, JSON.stringify([]));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === '') {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
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

  _findById(list, id) {
    return list.find((x) => x.id === id) || null;
  }

  // =========================
  // Internal helpers (required)
  // =========================

  // Internal helper to get or create the single-user cart
  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let cart;
    if (!Array.isArray(carts)) {
      carts = [];
    }
    if (carts.length > 0) {
      cart = carts[0];
    } else {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        shipping_method_code: null,
        shipping_cost: 0,
        total: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  // Recalculate cart totals after any change
  _recalculateCartTotals() {
    let carts = this._getFromStorage('cart', []);
    let cartItems = this._getFromStorage('cart_items', []);
    let shippingMethods = this._getFromStorage('shipping_methods', []);

    if (!Array.isArray(carts) || carts.length === 0) {
      return null;
    }

    const cart = carts[0];
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const subtotal = itemsForCart.reduce((sum, item) => sum + (item.total_price || 0), 0);

    let shipping_cost = 0;
    if (cart.shipping_method_code) {
      const method = shippingMethods.find((m) => m.code === cart.shipping_method_code && m.is_active !== false);
      if (method) {
        shipping_cost = method.cost || 0;
      }
    }

    cart.subtotal = subtotal;
    cart.shipping_cost = shipping_cost;
    cart.total = subtotal + shipping_cost;
    cart.updated_at = this._now();

    carts[0] = cart;
    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cartItems);

    return cart;
  }

  // Internal helper to get or create wishlist
  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    if (!Array.isArray(wishlists)) wishlists = [];
    let wishlist;
    if (wishlists.length > 0) {
      wishlist = wishlists[0];
    } else {
      wishlist = {
        id: this._generateId('wishlist'),
        items: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  // Internal helper to get or create shopping list
  _getOrCreateShoppingList() {
    let lists = this._getFromStorage('shopping_lists', []);
    if (!Array.isArray(lists)) lists = [];
    let list;
    if (lists.length > 0) {
      list = lists[0];
    } else {
      list = {
        id: this._generateId('shopping_list'),
        name: null,
        items: [],
        source_type: null,
        source_reference_id: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('shopping_lists', lists);
    }
    return list;
  }

  // Internal helper to get or create custom pack for a pack option
  _getOrCreateCustomPack(packOptionId) {
    let packOptions = this._getFromStorage('pack_options', []);
    const packOption = packOptions.find((p) => p.id === packOptionId && p.is_active !== false) || null;
    if (!packOption) {
      return null;
    }

    let customPacks = this._getFromStorage('custom_packs', []);
    if (!Array.isArray(customPacks)) customPacks = [];
    let customPack = customPacks.find((cp) => cp.pack_option_id === packOptionId) || null;

    if (!customPack) {
      customPack = {
        id: this._generateId('custom_pack'),
        pack_option_id: packOption.id,
        name: packOption.name || 'Custom Pack',
        total_slots: packOption.slot_count,
        filled_slots: 0,
        items: [],
        total_price: 0,
        created_at: this._now()
      };
      customPacks.push(customPack);
      this._saveToStorage('custom_packs', customPacks);
    }

    // Ensure filled_slots and total_price are up to date
    let customPackItems = this._getFromStorage('custom_pack_items', []);
    const itemsForPack = customPackItems.filter((i) => i.custom_pack_id === customPack.id);
    const filled = itemsForPack.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const totalPrice = itemsForPack.reduce((sum, it) => sum + (it.total_price || 0), 0);

    customPack.filled_slots = filled;
    customPack.total_price = totalPrice;
    customPack.items = itemsForPack.map((i) => i.id);

    // Save updated pack
    customPacks = customPacks.map((cp) => (cp.id === customPack.id ? customPack : cp));
    this._saveToStorage('custom_packs', customPacks);

    return { customPack, packOption };
  }

  // Distance helper (haversine)
  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    if (
      lat1 == null || lon1 == null || lat2 == null || lon2 == null ||
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)
    ) {
      return null;
    }
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Helper to build cart items with resolved product/customPack
  _buildCartItemsWithRelations(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const customPacks = this._getFromStorage('custom_packs', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    return itemsForCart.map((ci) => {
      let product = null;
      let customPack = null;
      if (ci.item_type === 'product' && ci.product_id) {
        product = products.find((p) => p.id === ci.product_id) || null;
      }
      if (ci.item_type === 'custom_pack' && ci.custom_pack_id) {
        customPack = customPacks.find((cp) => cp.id === ci.custom_pack_id) || null;
      }
      return {
        cartItem: ci,
        product,
        customPack
      };
    });
  }

  // =========================
  // Interfaces Implementation
  // =========================

  // getActiveCategories()
  getActiveCategories() {
    const categories = this._getFromStorage('categories', []);
    // No is_active flag in model; treat all as active
    return categories;
  }

  // getHomepageFeaturedProducts(maxItemsPerSection = 8)
  getHomepageFeaturedProducts(maxItemsPerSection) {
    const limit = typeof maxItemsPerSection === 'number' ? maxItemsPerSection : 8;
    const products = this._getFromStorage('products', []);

    const featured_products = products
      .filter((p) => Array.isArray(p.tags) && p.tags.includes('featured'))
      .slice(0, limit);

    const limited_edition_products = products
      .filter((p) => p.is_limited_edition === true || (Array.isArray(p.tags) && p.tags.includes('limited_edition')))
      .slice(0, limit);

    const top_rated_products = products
      .filter((p) => typeof p.average_rating === 'number')
      .sort((a, b) => {
        const ar = b.average_rating - a.average_rating;
        if (ar !== 0) return ar;
        return (b.rating_count || 0) - (a.rating_count || 0);
      })
      .slice(0, limit);

    return {
      featured_products,
      limited_edition_products,
      top_rated_products
    };
  }

  // getCategoryFilterOptions(categoryId)
  getCategoryFilterOptions(categoryId) {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const category = categories.find((c) => c.id === categoryId) || null;

    const inCategory = products.filter((p) => p.category_id === categoryId && p.is_active !== false);

    const colors = Array.from(new Set(inCategory.map((p) => p.color).filter(Boolean)));
    const countries = Array.from(new Set(inCategory.map((p) => p.country).filter(Boolean)));
    const regions = Array.from(new Set(inCategory.map((p) => p.region).filter(Boolean)));
    const styles = Array.from(new Set(inCategory.map((p) => p.style).filter(Boolean)));
    const container_types = Array.from(new Set(inCategory.map((p) => p.container_type).filter(Boolean)));
    const age_years_options = Array.from(new Set(inCategory.map((p) => p.age_years).filter((v) => v != null))).sort((a, b) => a - b);
    const gift_types = Array.from(new Set(inCategory.map((p) => p.gift_type).filter(Boolean)));
    const tag_options = Array.from(new Set(inCategory.flatMap((p) => (Array.isArray(p.tags) ? p.tags : []))));

    // Rating options – standard set
    const rating_options = [4.5, 4.0, 3.5, 3.0];

    // Basic price ranges, independent of data (labels only)
    const price_ranges = [
      { min: 0, max: 25, label: 'Under $25' },
      { min: 25, max: 50, label: '$25 to $50' },
      { min: 50, max: 100, label: '$50 to $100' },
      { min: 100, max: null, label: '$100 & Above' }
    ];

    const abv_percent_ranges = [
      { min: 0, max: 5, label: 'Up to 5% ABV' },
      { min: 5, max: 10, label: '5% to 10% ABV' },
      { min: 10, max: 15, label: '10% to 15% ABV' },
      { min: 15, max: null, label: '15% ABV & Above' }
    ];

    return {
      category,
      price_ranges,
      rating_options,
      colors,
      countries,
      regions,
      styles,
      container_types,
      age_years_options,
      abv_percent_ranges,
      gift_types,
      tag_options
    };
  }

  // searchCategoryProducts(categoryId, filters = {}, sortBy, page = 1, pageSize = 20)
  searchCategoryProducts(categoryId, filters, sortBy, page, pageSize) {
    const categories = this._getFromStorage('categories', []);
    const productsAll = this._getFromStorage('products', []);
    const category = categories.find((c) => c.id === categoryId) || null;

    const f = filters || {};
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    let results = productsAll.filter((p) => p.category_id === categoryId && p.is_active !== false);

    if (f.minPrice != null) {
      results = results.filter((p) => (p.price || 0) >= f.minPrice);
    }
    if (f.maxPrice != null) {
      results = results.filter((p) => (p.price || 0) <= f.maxPrice);
    }
    if (f.minRating != null) {
      results = results.filter((p) => (p.average_rating || 0) >= f.minRating);
    }
    if (f.color) {
      results = results.filter((p) => p.color === f.color);
    }
    if (f.country) {
      results = results.filter((p) => p.country === f.country);
    }
    if (f.region) {
      results = results.filter((p) => p.region === f.region);
    }
    if (f.style) {
      results = results.filter((p) => p.style === f.style);
    }
    if (f.containerType) {
      results = results.filter((p) => p.container_type === f.containerType);
    }
    if (f.minAgeYears != null) {
      results = results.filter((p) => (p.age_years || 0) >= f.minAgeYears);
    }
    if (f.maxAbvPercent != null) {
      results = results.filter((p) => (p.abv_percent || 0) <= f.maxAbvPercent);
    }
    if (f.giftType) {
      results = results.filter((p) => p.gift_type === f.giftType);
    }
    if (Array.isArray(f.tags) && f.tags.length > 0) {
      results = results.filter((p) => {
        const tags = Array.isArray(p.tags) ? p.tags : [];
        return f.tags.every((t) => tags.includes(t));
      });
    }
    if (typeof f.includesGlassware === 'boolean') {
      results = results.filter((p) => !!p.includes_glassware === f.includesGlassware);
    }
    if (typeof f.isLimitedEdition === 'boolean') {
      results = results.filter((p) => !!p.is_limited_edition === f.isLimitedEdition);
    }
    if (typeof f.isNonAlcoholic === 'boolean') {
      results = results.filter((p) => !!p.is_non_alcoholic === f.isNonAlcoholic);
    }

    const sortKey = sortBy || null;
    if (sortKey === 'price_low_to_high') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortKey === 'price_high_to_low') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortKey === 'rating_high_to_low' || sortKey === 'customer_favorites') {
      results.sort((a, b) => {
        const r = (b.average_rating || 0) - (a.average_rating || 0);
        if (r !== 0) return r;
        return (b.rating_count || 0) - (a.rating_count || 0);
      });
    } else if (sortKey === 'best_match') {
      results.sort((a, b) => {
        const r = (b.average_rating || 0) - (a.average_rating || 0);
        if (r !== 0) return r;
        return (a.price || 0) - (b.price || 0);
      });
    }

    const totalResults = results.length;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = results.slice(start, end);

    return {
      category,
      totalResults,
      page: currentPage,
      pageSize: size,
      products: pageItems
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        reviews_summary: { average_rating: 0, rating_count: 0 },
        is_available_online: false,
        can_add_gift_message: false,
        can_select_packaging_color: false
      };
    }

    const category = categories.find((c) => c.id === product.category_id) || null;

    const reviews_summary = {
      average_rating: product.average_rating || 0,
      rating_count: product.rating_count || 0
    };

    const is_available_online = product.is_active !== false;
    const can_select_packaging_color = Array.isArray(product.packaging_color_options) && product.packaging_color_options.length > 0;
    // Allow gift messages for gift sets and gift boxes by default
    const can_add_gift_message = product.gift_type === 'gift_set' || product.container_type === 'gift_box';

    return {
      product,
      category,
      reviews_summary,
      is_available_online,
      can_add_gift_message,
      can_select_packaging_color
    };
  }

  // addProductToCart(productId, quantity = 1, selectedPackagingColor, giftMessage)
  addProductToCart(productId, quantity, selectedPackagingColor, giftMessage) {
    const qty = quantity != null ? quantity : 1;
    if (qty <= 0) {
      return { success: false, message: 'Quantity must be greater than zero.', cart: null, items: [] };
    }

    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId && p.is_active !== false) || null;
    if (!product) {
      return { success: false, message: 'Product not found or inactive.', cart: null, items: [] };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    // Try to find an existing line with same product and options
    let existing = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.item_type === 'product' &&
        ci.product_id === productId &&
        (ci.selected_packaging_color || null) === (selectedPackagingColor || null) &&
        (ci.gift_message || '') === (giftMessage || '')
    );

    const unitPrice = product.price || 0;

    if (existing) {
      existing.quantity += qty;
      existing.total_price = existing.quantity * unitPrice;
      cartItems = cartItems.map((ci) => (ci.id === existing.id ? existing : ci));
    } else {
      const newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'product',
        product_id: productId,
        custom_pack_id: null,
        quantity: qty,
        unit_price: unitPrice,
        total_price: unitPrice * qty,
        selected_packaging_color: selectedPackagingColor || null,
        gift_message: giftMessage || null
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals();
    const items = this._buildCartItemsWithRelations(updatedCart);

    return {
      success: true,
      message: 'Product added to cart.',
      cart: updatedCart,
      items
    };
  }

  // getPackOptions()
  getPackOptions() {
    const packOptions = this._getFromStorage('pack_options', []);
    return packOptions.filter((p) => p.is_active !== false);
  }

  // getPackBuilderFilterOptions(packOptionId)
  getPackBuilderFilterOptions(packOptionId) {
    const packOptions = this._getFromStorage('pack_options', []);
    const packOption = packOptions.find((p) => p.id === packOptionId) || null;

    // Determine available container types and styles from active products
    const products = this._getFromStorage('products', []);
    let relevantProducts = products.filter((p) => p && p.is_active !== false);

    // If the pack option restricts container type, only consider those products
    if (packOption && packOption.container_type_restriction) {
      relevantProducts = relevantProducts.filter(
        (p) => p.container_type === packOption.container_type_restriction
      );
    }

    const container_types = Array.from(
      new Set(relevantProducts.map((p) => p.container_type).filter(Boolean))
    );
    const styles = Array.from(
      new Set(relevantProducts.map((p) => p.style).filter(Boolean))
    );

    const price_per_unit_ranges = [
      { max: 3, label: 'Up to $3 per unit' },
      { max: 4, label: 'Up to $4 per unit' },
      { max: 5, label: 'Up to $5 per unit' }
    ];

    const abv_percent_ranges = [
      { min: 0, max: 4.5, label: 'Session (up to 4.5%)' },
      { min: 4.5, max: 6.5, label: 'Standard (4.5% - 6.5%)' },
      { min: 6.5, max: null, label: 'Strong (6.5%+)' }
    ];

    return {
      packOption,
      container_types,
      styles,
      price_per_unit_ranges,
      abv_percent_ranges
    };
  }

  // searchPackBuilderProducts(packOptionId, filters = {}, page = 1, pageSize = 20)
  searchPackBuilderProducts(packOptionId, filters, page, pageSize) {
    const packOptions = this._getFromStorage('pack_options', []);
    const packOption = packOptions.find((p) => p.id === packOptionId) || null;

    const products = this._getFromStorage('products', []);
    // Start from all active products and then apply pack option / caller filters
    let results = products.filter((p) => p && p.is_active !== false);

    const f = filters || {};
    if (packOption && packOption.container_type_restriction) {
      results = results.filter((p) => p.container_type === packOption.container_type_restriction);
    }
    if (f.containerType) {
      results = results.filter((p) => p.container_type === f.containerType);
    }
    if (f.style) {
      results = results.filter((p) => p.style === f.style);
    }
    if (f.maxUnitPrice != null) {
      results = results.filter(
        (p) => (p.unit_price != null ? p.unit_price : p.price || 0) <= f.maxUnitPrice
      );
    }
    if (f.maxAbvPercent != null) {
      results = results.filter((p) => (p.abv_percent || 0) <= f.maxAbvPercent);
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const start = (currentPage - 1) * size;
    const end = start + size;

    return {
      totalResults,
      page: currentPage,
      pageSize: size,
      products: results.slice(start, end)
    };
  }

  // getOrCreateCustomPack(packOptionId)
  getOrCreateCustomPack(packOptionId) {
    const result = this._getOrCreateCustomPack(packOptionId);
    if (!result) {
      return {
        customPack: null,
        packOption: null,
        items: [],
        remainingSlots: 0,
        totalPrice: 0
      };
    }

    const { customPack, packOption } = result;
    const customPackItems = this._getFromStorage('custom_pack_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForPack = customPackItems.filter((i) => i.custom_pack_id === customPack.id);

    const items = itemsForPack.map((i) => ({
      packItem: i,
      product: products.find((p) => p.id === i.product_id) || null
    }));

    const remainingSlots = (customPack.total_slots || 0) - (customPack.filled_slots || 0);

    return {
      customPack,
      packOption,
      items,
      remainingSlots,
      totalPrice: customPack.total_price || 0
    };
  }

  // updateCustomPackItem(customPackId, productId, quantity)
  updateCustomPackItem(customPackId, productId, quantity) {
    const qty = quantity != null ? quantity : 0;
    let customPacks = this._getFromStorage('custom_packs', []);
    let customPackItems = this._getFromStorage('custom_pack_items', []);
    const products = this._getFromStorage('products', []);
    const packOptions = this._getFromStorage('pack_options', []);

    const customPack = customPacks.find((cp) => cp.id === customPackId) || null;
    if (!customPack) {
      return { success: false, message: 'Custom pack not found.', customPack: null, items: [], remainingSlots: 0, totalPrice: 0 };
    }

    const packOption = packOptions.find((po) => po.id === customPack.pack_option_id) || null;
    const product = products.find((p) => p.id === productId && p.is_active !== false) || null;
    if (!product) {
      return { success: false, message: 'Product not found or inactive.', customPack: null, items: [], remainingSlots: 0, totalPrice: 0 };
    }

    const itemsForPack = customPackItems.filter((i) => i.custom_pack_id === customPack.id);
    const otherQuantity = itemsForPack
      .filter((i) => i.product_id !== productId)
      .reduce((sum, i) => sum + (i.quantity || 0), 0);

    if (qty < 0) {
      return { success: false, message: 'Quantity cannot be negative.', customPack: null, items: [], remainingSlots: 0, totalPrice: 0 };
    }

    if (qty + otherQuantity > (customPack.total_slots || 0)) {
      return {
        success: false,
        message: 'Quantity exceeds available slots in the pack.',
        customPack,
        items: [],
        remainingSlots: (customPack.total_slots || 0) - (customPack.filled_slots || 0),
        totalPrice: customPack.total_price || 0
      };
    }

    let existing = itemsForPack.find((i) => i.product_id === productId) || null;
    const unitPrice = product.unit_price != null ? product.unit_price : (product.price || 0);

    if (qty === 0) {
      if (existing) {
        customPackItems = customPackItems.filter((i) => i.id !== existing.id);
      }
    } else if (existing) {
      existing.quantity = qty;
      existing.unit_price = unitPrice;
      existing.total_price = unitPrice * qty;
      customPackItems = customPackItems.map((i) => (i.id === existing.id ? existing : i));
    } else {
      const newItem = {
        id: this._generateId('custom_pack_item'),
        custom_pack_id: customPack.id,
        product_id: productId,
        quantity: qty,
        unit_price: unitPrice,
        total_price: unitPrice * qty
      };
      customPackItems.push(newItem);
    }

    // Recalculate pack totals
    const updatedItemsForPack = customPackItems.filter((i) => i.custom_pack_id === customPack.id);
    customPack.filled_slots = updatedItemsForPack.reduce((sum, i) => sum + (i.quantity || 0), 0);
    customPack.total_price = updatedItemsForPack.reduce((sum, i) => sum + (i.total_price || 0), 0);
    customPack.items = updatedItemsForPack.map((i) => i.id);

    customPacks = customPacks.map((cp) => (cp.id === customPack.id ? customPack : cp));

    this._saveToStorage('custom_pack_items', customPackItems);
    this._saveToStorage('custom_packs', customPacks);

    const items = updatedItemsForPack.map((i) => ({
      packItem: i,
      product: products.find((p) => p.id === i.product_id) || null
    }));

    const remainingSlots = (customPack.total_slots || 0) - (customPack.filled_slots || 0);

    return {
      success: true,
      message: 'Custom pack updated.',
      customPack,
      items,
      remainingSlots,
      totalPrice: customPack.total_price || 0
    };
  }

  // finalizeCustomPackAndAddToCart(customPackId)
  finalizeCustomPackAndAddToCart(customPackId) {
    const customPacks = this._getFromStorage('custom_packs', []);
    const customPackItems = this._getFromStorage('custom_pack_items', []);
    const customPack = customPacks.find((cp) => cp.id === customPackId) || null;
    if (!customPack) {
      return { success: false, message: 'Custom pack not found.', cart: null, items: [] };
    }

    const packOption = this._getFromStorage('pack_options', []).find((po) => po.id === customPack.pack_option_id) || null;
    const slotCount = packOption ? packOption.slot_count : customPack.total_slots;
    const itemsForPack = customPackItems.filter((i) => i.custom_pack_id === customPack.id);
    const filled = itemsForPack.reduce((sum, i) => sum + (i.quantity || 0), 0);

    if (filled !== slotCount) {
      return { success: false, message: 'Custom pack is not fully filled.', cart: null, items: [] };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = customPack.total_price || 0;
    const newItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'custom_pack',
      product_id: null,
      custom_pack_id: customPack.id,
      quantity: 1,
      unit_price: unitPrice,
      total_price: unitPrice,
      selected_packaging_color: null,
      gift_message: null
    };

    cartItems.push(newItem);
    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals();
    const items = this._buildCartItemsWithRelations(updatedCart);

    return {
      success: true,
      message: 'Custom pack added to cart.',
      cart: updatedCart,
      items
    };
  }

  // getRecipeFilterOptions()
  getRecipeFilterOptions() {
    const recipes = this._getFromStorage('recipes', []);

    const base_spirits = Array.from(new Set(recipes.map((r) => r.base_spirit).filter(Boolean)));
    const prep_time_categories = Array.from(new Set(recipes.map((r) => r.prep_time_category).filter(Boolean)));
    const ingredients_count_categories = Array.from(new Set(recipes.map((r) => r.ingredients_count_category).filter(Boolean)));
    const tag_options = Array.from(new Set(recipes.flatMap((r) => (Array.isArray(r.tags) ? r.tags : []))));

    const sort_options = ['most_popular', 'newest', 'a_to_z'];

    return {
      base_spirits,
      prep_time_categories,
      ingredients_count_categories,
      tag_options,
      sort_options
    };
  }

  // searchRecipes(filters = {}, sortBy, page = 1, pageSize = 20)
  searchRecipes(filters, sortBy, page, pageSize) {
    const recipesAll = this._getFromStorage('recipes', []);
    const f = filters || {};

    let results = recipesAll.slice();

    if (f.baseSpirit) {
      results = results.filter((r) => r.base_spirit === f.baseSpirit);
    }
    if (f.prepTimeCategory) {
      results = results.filter((r) => r.prep_time_category === f.prepTimeCategory);
    }
    if (f.ingredientsCountCategory) {
      results = results.filter((r) => r.ingredients_count_category === f.ingredientsCountCategory);
    }
    if (Array.isArray(f.tags) && f.tags.length > 0) {
      results = results.filter((r) => {
        const tags = Array.isArray(r.tags) ? r.tags : [];
        return f.tags.every((t) => tags.includes(t));
      });
    }

    const sortKey = sortBy || 'most_popular';
    if (sortKey === 'most_popular') {
      results.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sortKey === 'newest') {
      // No explicit created_at; approximate by idCounter or leave as-is
      results.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    } else if (sortKey === 'a_to_z') {
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const start = (currentPage - 1) * size;
    const end = start + size;

    return {
      totalResults,
      page: currentPage,
      pageSize: size,
      recipes: results.slice(start, end)
    };
  }

  // getFeaturedRecipes(maxItems = 6)
  getFeaturedRecipes(maxItems) {
    const limit = typeof maxItems === 'number' ? maxItems : 6;
    const recipes = this._getFromStorage('recipes', []);

    let featured = recipes.filter((r) => Array.isArray(r.tags) && r.tags.includes('featured'));
    if (featured.length === 0) {
      featured = recipes
        .filter((r) => typeof r.popularity_score === 'number')
        .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }

    return featured.slice(0, limit);
  }

  // getRecipeDetails(recipeId)
  getRecipeDetails(recipeId) {
    const recipes = this._getFromStorage('recipes', []);
    const recipeIngredients = this._getFromStorage('recipe_ingredients', []);
    const products = this._getFromStorage('products', []);

    const recipe = recipes.find((r) => r.id === recipeId) || null;
    if (!recipe) {
      return { recipe: null, ingredients: [] };
    }

    const ingredientsForRecipe = recipeIngredients.filter((ri) => ri.recipe_id === recipeId);

    const ingredients = ingredientsForRecipe.map((ri) => ({
      ingredient: ri,
      product: ri.product_id ? products.find((p) => p.id === ri.product_id) || null : null
    }));

    return { recipe, ingredients };
  }

  // createShoppingListFromRecipe(recipeId, selectedIngredientIds, listName)
  createShoppingListFromRecipe(recipeId, selectedIngredientIds, listName) {
    const recipes = this._getFromStorage('recipes', []);
    const recipeIngredients = this._getFromStorage('recipe_ingredients', []);

    const recipe = recipes.find((r) => r.id === recipeId) || null;
    if (!recipe) {
      return { shoppingList: null, items: [] };
    }

    const selectedIds = Array.isArray(selectedIngredientIds) ? selectedIngredientIds : [];
    const ingredientsForRecipe = recipeIngredients.filter(
      (ri) => ri.recipe_id === recipeId && (selectedIds.length === 0 || selectedIds.includes(ri.id))
    );

    const shoppingList = this._getOrCreateShoppingList();
    let allListItems = this._getFromStorage('shopping_list_items', []);

    // Clear previous items for this list
    allListItems = allListItems.filter((item) => item.shopping_list_id !== shoppingList.id);

    const newItems = ingredientsForRecipe.map((ri) => ({
      id: this._generateId('shopping_list_item'),
      shopping_list_id: shoppingList.id,
      product_id: ri.product_id || null,
      ingredient_name: ri.ingredient_name,
      quantity: ri.quantity || null,
      unit: ri.unit || null,
      notes: null
    }));

    const itemsIds = newItems.map((i) => i.id);

    const updatedShoppingList = {
      ...shoppingList,
      name: listName || recipe.name,
      items: itemsIds,
      source_type: 'recipe',
      source_reference_id: recipeId,
      updated_at: this._now()
    };

    // Save
    allListItems = allListItems.concat(newItems);
    let lists = this._getFromStorage('shopping_lists', []);
    lists = lists.map((sl) => (sl.id === shoppingList.id ? updatedShoppingList : sl));

    this._saveToStorage('shopping_list_items', allListItems);
    this._saveToStorage('shopping_lists', lists);

    return {
      shoppingList: updatedShoppingList,
      items: newItems
    };
  }

  // getShoppingList()
  getShoppingList() {
    const shoppingList = this._getOrCreateShoppingList();
    const allItems = this._getFromStorage('shopping_list_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForList = allItems.filter((i) => i.shopping_list_id === shoppingList.id);

    const items = itemsForList.map((i) => ({
      item: i,
      product: i.product_id ? products.find((p) => p.id === i.product_id) || null : null
    }));

    return {
      shoppingList,
      items
    };
  }

  // updateShoppingListItemQuantity(shoppingListItemId, quantity)
  updateShoppingListItemQuantity(shoppingListItemId, quantity) {
    const qty = quantity != null ? quantity : 0;
    let items = this._getFromStorage('shopping_list_items', []);
    let lists = this._getFromStorage('shopping_lists', []);

    const item = items.find((i) => i.id === shoppingListItemId) || null;
    if (!item) {
      const shoppingList = this._getOrCreateShoppingList();
      const itemsForList = items.filter((i) => i.shopping_list_id === shoppingList.id);
      return {
        shoppingList,
        items: itemsForList
      };
    }

    item.quantity = qty;
    items = items.map((i) => (i.id === item.id ? item : i));

    const shoppingList = lists.find((sl) => sl.id === item.shopping_list_id) || this._getOrCreateShoppingList();
    shoppingList.updated_at = this._now();
    lists = lists.map((sl) => (sl.id === shoppingList.id ? shoppingList : sl));

    this._saveToStorage('shopping_list_items', items);
    this._saveToStorage('shopping_lists', lists);

    const itemsForList = items.filter((i) => i.shopping_list_id === shoppingList.id);

    return {
      shoppingList,
      items: itemsForList
    };
  }

  // removeShoppingListItem(shoppingListItemId)
  removeShoppingListItem(shoppingListItemId) {
    let items = this._getFromStorage('shopping_list_items', []);
    let lists = this._getFromStorage('shopping_lists', []);

    const item = items.find((i) => i.id === shoppingListItemId) || null;
    if (!item) {
      const shoppingList = this._getOrCreateShoppingList();
      const itemsForList = items.filter((i) => i.shopping_list_id === shoppingList.id);
      return {
        shoppingList,
        items: itemsForList
      };
    }

    items = items.filter((i) => i.id !== shoppingListItemId);

    const shoppingList = lists.find((sl) => sl.id === item.shopping_list_id) || this._getOrCreateShoppingList();
    shoppingList.items = shoppingList.items.filter((id) => id !== shoppingListItemId);
    shoppingList.updated_at = this._now();
    lists = lists.map((sl) => (sl.id === shoppingList.id ? shoppingList : sl));

    this._saveToStorage('shopping_list_items', items);
    this._saveToStorage('shopping_lists', lists);

    const itemsForList = items.filter((i) => i.shopping_list_id === shoppingList.id);

    return {
      shoppingList,
      items: itemsForList
    };
  }

  // addShoppingListToCart(onlyItemsWithProducts = true)
  addShoppingListToCart(onlyItemsWithProducts) {
    const onlyProducts = onlyItemsWithProducts !== false; // default true
    const shoppingList = this._getOrCreateShoppingList();
    const items = this._getFromStorage('shopping_list_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForList = items.filter((i) => i.shopping_list_id === shoppingList.id);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    for (const sli of itemsForList) {
      if (onlyProducts && !sli.product_id) continue;
      if (!sli.product_id) continue;

      const product = products.find((p) => p.id === sli.product_id && p.is_active !== false);
      if (!product) continue;

      const unitPrice = product.price || 0;
      const qty = sli.quantity != null && sli.quantity > 0 ? sli.quantity : 1;

      const newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'product',
        product_id: product.id,
        custom_pack_id: null,
        quantity: qty,
        unit_price: unitPrice,
        total_price: unitPrice * qty,
        selected_packaging_color: null,
        gift_message: null
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals();
    const cartItemsWithRelations = this._buildCartItemsWithRelations(updatedCart);

    return {
      cart: updatedCart,
      items: cartItemsWithRelations
    };
  }

  // clearShoppingList()
  clearShoppingList() {
    const shoppingList = this._getOrCreateShoppingList();
    let items = this._getFromStorage('shopping_list_items', []);

    items = items.filter((i) => i.shopping_list_id !== shoppingList.id);
    shoppingList.items = [];
    shoppingList.updated_at = this._now();

    let lists = this._getFromStorage('shopping_lists', []);
    lists = lists.map((sl) => (sl.id === shoppingList.id ? shoppingList : sl));

    this._saveToStorage('shopping_list_items', items);
    this._saveToStorage('shopping_lists', lists);

    return {
      success: true,
      shoppingList
    };
  }

  // searchProductsByName(query, categoryId, limit = 10)
  searchProductsByName(query, categoryId, limit) {
    const q = (query || '').toLowerCase();
    const max = typeof limit === 'number' && limit > 0 ? limit : 10;

    const products = this._getFromStorage('products', []);

    let results = products.filter((p) => p.is_active !== false);
    if (categoryId) {
      results = results.filter((p) => p.category_id === categoryId);
    }
    if (q) {
      results = results.filter((p) => (p.name || '').toLowerCase().includes(q));
    }

    return results.slice(0, max);
  }

  // searchStoresByLocation(locationQuery, radiusMiles = 25, productId)
  searchStoresByLocation(locationQuery, radiusMiles, productId) {
    const query = locationQuery || '';
    const radius = typeof radiusMiles === 'number' && radiusMiles > 0 ? radiusMiles : 25;

    const stores = this._getFromStorage('stores', []);
    const inventory = this._getFromStorage('store_inventory', []);

    // Resolve location: best-effort based on matching postal code
    let resolved = null;
    const byPostal = stores.find((s) => s.postal_code === query) || null;
    if (byPostal) {
      resolved = {
        displayName: byPostal.postal_code,
        latitude: byPostal.latitude || null,
        longitude: byPostal.longitude || null
      };
    } else {
      resolved = {
        displayName: query,
        latitude: null,
        longitude: null
      };
    }

    const storesWithDistance = stores.map((store) => {
      const distanceMiles = this._calculateDistanceMiles(
        resolved.latitude,
        resolved.longitude,
        store.latitude,
        store.longitude
      );

      let availabilityStatus = null;
      if (productId) {
        const inv = inventory.find((inv) => inv.store_id === store.id && inv.product_id === productId) || null;
        availabilityStatus = inv ? inv.availability_status : 'out_of_stock';
      }

      return {
        store,
        distanceMiles: distanceMiles != null ? distanceMiles : Number.POSITIVE_INFINITY,
        availabilityStatus
      };
    });

    // Filter by radius when distance known
    const filtered = storesWithDistance.filter((s) => s.distanceMiles <= radius || !isFinite(s.distanceMiles));

    filtered.sort((a, b) => (a.distanceMiles || 0) - (b.distanceMiles || 0));

    // Instrumentation for task completion tracking
    try {
      if (productId != null) {
        localStorage.setItem(
          'task4_storeSearchParams',
          JSON.stringify({ locationQuery: query, radiusMiles: radius, productId: productId || null })
        );
      }
    } catch (e) {}

    return {
      resolvedLocation: resolved,
      radiusMiles: radius,
      productId: productId || null,
      stores: filtered.map((s) => ({
        store: s.store,
        distanceMiles: isFinite(s.distanceMiles) ? s.distanceMiles : null,
        availabilityStatus: s.availabilityStatus
      }))
    };
  }

  // getStoreDetail(storeId, productId)
  getStoreDetail(storeId, productId) {
    const stores = this._getFromStorage('stores', []);
    const inventory = this._getFromStorage('store_inventory', []);
    const products = this._getFromStorage('products', []);

    const store = stores.find((s) => s.id === storeId) || null;
    if (!store) {
      return {
        store: null,
        productAvailability: null,
        featuredProducts: []
      };
    }

    let productAvailability = null;
    if (productId) {
      const inv = inventory.find((inv) => inv.store_id === storeId && inv.product_id === productId) || null;
      productAvailability = {
        productId,
        availabilityStatus: inv ? inv.availability_status : 'out_of_stock'
      };
    }

    const featuredProducts = products
      .filter((p) => p.is_active !== false)
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 8);

    // Instrumentation for task completion tracking
    try {
      if (storeId != null && productId != null) {
        localStorage.setItem(
          'task4_openedStoreDetail',
          JSON.stringify({ storeId: storeId, productId: productId || null, openedAt: this._now() })
        );
      }
    } catch (e) {}

    return {
      store,
      productAvailability,
      featuredProducts
    };
  }

  // getNewsletterInterestsOptions()
  getNewsletterInterestsOptions() {
    return [
      { code: 'whisky', label: 'Whisky' },
      { code: 'rum', label: 'Rum' },
      { code: 'wine', label: 'Wine' },
      { code: 'beer', label: 'Beer' },
      { code: 'non_alcoholic', label: 'Non-Alcoholic' },
      { code: 'cocktails', label: 'Cocktails & Recipes' }
    ];
  }

  // submitNewsletterSubscription(email, firstName, interests, preferredUpdatesFrequency, ageConfirmed)
  submitNewsletterSubscription(email, firstName, interests, preferredUpdatesFrequency, ageConfirmed) {
    const subs = this._getFromStorage('newsletter_subscriptions', []);

    if (!email) {
      return {
        subscription: null,
        message: 'Email is required.'
      };
    }

    if (!ageConfirmed) {
      return {
        subscription: null,
        message: 'Age confirmation is required.'
      };
    }

    const freq = preferredUpdatesFrequency || 'monthly';
    if (!['weekly', 'monthly', 'special_announcements'].includes(freq)) {
      return {
        subscription: null,
        message: 'Invalid preferred updates frequency.'
      };
    }

    const existingIndex = subs.findIndex((s) => s.email === email);
    const now = this._now();

    const subscription = {
      id: existingIndex >= 0 ? subs[existingIndex].id : this._generateId('newsletter_subscription'),
      email,
      first_name: firstName || null,
      interests: Array.isArray(interests) ? interests : [],
      preferred_updates_frequency: freq,
      age_confirmed: !!ageConfirmed,
      status: 'active',
      subscribed_at: existingIndex >= 0 ? subs[existingIndex].subscribed_at : now
    };

    if (existingIndex >= 0) {
      subs[existingIndex] = subscription;
    } else {
      subs.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription,
      message: 'Subscription saved.'
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const items = this._buildCartItemsWithRelations(cart);

    const itemCount = items.reduce((sum, it) => sum + (it.cartItem.quantity || 0), 0);
    const estimatedTax = 0; // No tax calculation specified
    const promotions = [];

    return {
      cart,
      items,
      itemCount,
      estimatedTax,
      promotions
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = quantity != null ? quantity : 0;
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();

    const item = cartItems.find((ci) => ci.id === cartItemId && ci.cart_id === cart.id) || null;
    if (!item) {
      const items = this._buildCartItemsWithRelations(cart);
      return { cart, items };
    }

    if (qty <= 0) {
      cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    } else {
      item.quantity = qty;
      item.total_price = (item.unit_price || 0) * qty;
      cartItems = cartItems.map((ci) => (ci.id === item.id ? item : ci));
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals();
    const items = this._buildCartItemsWithRelations(updatedCart);

    return {
      cart: updatedCart,
      items
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId || ci.cart_id !== cart.id);

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals();
    const items = this._buildCartItemsWithRelations(updatedCart);

    return {
      cart: updatedCart,
      items
    };
  }

  // clearCart()
  clearCart() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    cartItems = cartItems.filter((ci) => ci.cart_id !== cart.id);

    cart.items = [];
    cart.subtotal = 0;
    cart.shipping_cost = 0;
    cart.shipping_method_code = null;
    cart.total = 0;
    cart.updated_at = this._now();

    let carts = this._getFromStorage('cart', []);
    carts = carts.map((c) => (c.id === cart.id ? cart : c));

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', carts);

    return {
      success: true,
      cart
    };
  }

  // getAvailableShippingMethods()
  getAvailableShippingMethods() {
    const methods = this._getFromStorage('shipping_methods', []);
    return methods.filter((m) => m.is_active !== false);
  }

  // selectShippingMethodForCart(shippingMethodCode)
  selectShippingMethodForCart(shippingMethodCode) {
    const methods = this._getFromStorage('shipping_methods', []);
    const method = methods.find((m) => m.code === shippingMethodCode && m.is_active !== false) || null;
    const cart = this._getOrCreateCart();

    if (!method) {
      const items = this._buildCartItemsWithRelations(cart);
      return {
        cart,
        items
      };
    }

    let carts = this._getFromStorage('cart', []);
    cart.shipping_method_code = method.code;
    carts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('cart', carts);

    const updatedCart = this._recalculateCartTotals();
    const items = this._buildCartItemsWithRelations(updatedCart);

    return {
      cart: updatedCart,
      items
    };
  }

  // proceedToCheckout()
  proceedToCheckout() {
    const cart = this._getOrCreateCart();
    const items = this._buildCartItemsWithRelations(cart);

    const checkoutSessions = this._getFromStorage('checkout_sessions', []);

    const checkoutId = this._generateId('checkout');
    const shippingAddress = {
      firstName: '',
      lastName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      phone: '',
      email: ''
    };

    const session = {
      id: checkoutId,
      cart_id: cart.id,
      shipping_address: shippingAddress,
      created_at: this._now(),
      updated_at: this._now()
    };

    checkoutSessions.push(session);
    this._saveToStorage('checkout_sessions', checkoutSessions);

    const availableShippingMethods = this.getAvailableShippingMethods();
    const responsibleDrinkingMessage = 'Please enjoy our products responsibly. Must be 21+ to purchase.';

    return {
      checkoutId,
      cart,
      items,
      availableShippingMethods,
      shippingAddress,
      responsibleDrinkingMessage
    };
  }

  // getCheckoutSummary(checkoutId)
  getCheckoutSummary(checkoutId) {
    let sessions = this._getFromStorage('checkout_sessions', []);
    let session = null;

    if (checkoutId) {
      session = sessions.find((s) => s.id === checkoutId) || null;
    }

    if (!session && sessions.length > 0) {
      session = sessions[sessions.length - 1];
    }

    if (!session) {
      // No existing session; create a new one via proceedToCheckout
      return this.proceedToCheckout();
    }

    const cart = this._getOrCreateCart();
    const items = this._buildCartItemsWithRelations(cart);
    const availableMethods = this.getAvailableShippingMethods();
    const selectedMethod = availableMethods.find((m) => m.code === cart.shipping_method_code) || null;

    const responsibleDrinkingMessage = 'Please enjoy our products responsibly. Must be 21+ to purchase.';

    return {
      checkoutId: session.id,
      cart,
      items,
      selectedShippingMethod: selectedMethod || null,
      shippingAddress: session.shipping_address || null,
      responsibleDrinkingMessage
    };
  }

  // updateCheckoutShippingAddress(checkoutId, shippingAddress)
  updateCheckoutShippingAddress(checkoutId, shippingAddress) {
    let sessions = this._getFromStorage('checkout_sessions', []);
    let session = null;

    if (checkoutId) {
      session = sessions.find((s) => s.id === checkoutId) || null;
    }

    if (!session) {
      // Create new session if none exists
      const cart = this._getOrCreateCart();
      const newId = this._generateId('checkout');
      session = {
        id: newId,
        cart_id: cart.id,
        shipping_address: shippingAddress || {},
        created_at: this._now(),
        updated_at: this._now()
      };
      sessions.push(session);
    } else {
      session.shipping_address = shippingAddress || {};
      session.updated_at = this._now();
      sessions = sessions.map((s) => (s.id === session.id ? session : s));
    }

    this._saveToStorage('checkout_sessions', sessions);

    return {
      checkoutId: session.id,
      shippingAddress: session.shipping_address
    };
  }

  // placeOrder(checkoutId)
  placeOrder(checkoutId) {
    const cart = this._getOrCreateCart();
    const items = this._buildCartItemsWithRelations(cart);

    if (!items || items.length === 0) {
      return {
        success: false,
        orderId: null,
        message: 'Cart is empty.'
      };
    }

    const orders = this._getFromStorage('orders', []);
    const orderId = this._generateId('order');

    const order = {
      id: orderId,
      cart_id: cart.id,
      created_at: this._now(),
      checkout_id: checkoutId || null,
      total: cart.total || 0
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    // Optionally clear cart after placing order
    this.clearCart();

    return {
      success: true,
      orderId,
      message: 'Order placed successfully (simulation).'
    };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForList = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);

    const items = itemsForList.map((wi) => {
      const product = products.find((p) => p.id === wi.product_id) || null;
      let statusMessage = '';
      if (product && product.is_active === false) {
        statusMessage = 'Product is no longer available.';
      }
      return {
        wishlistItem: wi,
        product,
        statusMessage
      };
    });

    return {
      wishlist,
      items
    };
  }

  // addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        wishlistItem: null,
        wishlistCount: wishlist.items ? wishlist.items.length : 0
      };
    }

    let existing = wishlistItems.find((wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId) || null;
    if (!existing) {
      existing = {
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        product_id: productId,
        added_at: this._now()
      };
      wishlistItems.push(existing);
      wishlist.items.push(existing.id);
    }

    wishlist.updated_at = this._now();

    let wishlists = this._getFromStorage('wishlists', []);
    wishlists = wishlists.map((w) => (w.id === wishlist.id ? wishlist : w));

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveToStorage('wishlists', wishlists);

    return {
      wishlistItem: existing,
      wishlistCount: wishlist.items.length
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    wishlistItems = wishlistItems.filter((wi) => wi.id !== wishlistItemId);
    wishlist.items = wishlist.items.filter((id) => id !== wishlistItemId);
    wishlist.updated_at = this._now();

    let wishlists = this._getFromStorage('wishlists', []);
    wishlists = wishlists.map((w) => (w.id === wishlist.id ? wishlist : w));

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveToStorage('wishlists', wishlists);

    return {
      wishlist,
      wishlistCount: wishlist.items.length
    };
  }

  // moveWishlistItemToCart(wishlistItemId, quantity = 1)
  moveWishlistItemToCart(wishlistItemId, quantity) {
    const qty = quantity != null ? quantity : 1;
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    const item = wishlistItems.find((wi) => wi.id === wishlistItemId) || null;
    if (!item) {
      const cart = this._getOrCreateCart();
      return {
        cart,
        wishlist
      };
    }

    // Add product to cart
    this.addProductToCart(item.product_id, qty);

    // Remove from wishlist
    this.removeWishlistItem(wishlistItemId);

    const cart = this._getOrCreateCart();
    return {
      cart,
      wishlist: this._getOrCreateWishlist()
    };
  }

  // getFoodTypeOptions()
  getFoodTypeOptions() {
    return [
      { code: 'spicy_dishes', label: 'Spicy Dishes', description: 'Curries, chili, hot wings and other spicy foods.' },
      { code: 'seafood', label: 'Seafood', description: 'Fish, shellfish and other seafood dishes.' },
      { code: 'red_meat', label: 'Red Meat', description: 'Steaks, burgers, lamb and other red meat.' },
      { code: 'cheese', label: 'Cheese', description: 'Cheese boards and dishes rich in cheese.' },
      { code: 'dessert', label: 'Dessert', description: 'Sweet desserts and pastries.' },
      { code: 'poultry', label: 'Poultry', description: 'Chicken, turkey and other poultry.' },
      { code: 'vegetarian', label: 'Vegetarian', description: 'Vegetarian and plant-based dishes.' }
    ];
  }

  // getFoodPairingRecommendations(foodType, filters = {}, sortBy, page = 1, pageSize = 20)
  getFoodPairingRecommendations(foodType, filters, sortBy, page, pageSize) {
    const pairings = this._getFromStorage('food_pairings', []);
    const products = this._getFromStorage('products', []);

    const f = filters || {};

    const pairingsForFood = pairings.filter((fp) => fp.food_type === foodType);

    let joined = pairingsForFood
      .map((fp) => {
        const product = products.find((p) => p.id === fp.product_id && p.is_active !== false) || null;
        return { pairing: fp, product };
      })
      .filter((x) => x.product);

    if (f.minPrice != null) {
      joined = joined.filter((x) => (x.product.price || 0) >= f.minPrice);
    }
    if (f.maxPrice != null) {
      joined = joined.filter((x) => (x.product.price || 0) <= f.maxPrice);
    }
    if (f.maxAbvPercent != null) {
      joined = joined.filter((x) => (x.product.abv_percent || 0) <= f.maxAbvPercent);
    }
    if (f.style) {
      joined = joined.filter((x) => x.product.style === f.style);
    }
    if (f.sweetnessLevel) {
      joined = joined.filter((x) => {
        const tags = Array.isArray(x.product.tags) ? x.product.tags : [];
        return tags.includes('sweetness_' + f.sweetnessLevel);
      });
    }

    const sortKey = sortBy || 'best_match';
    if (sortKey === 'best_match') {
      joined.sort((a, b) => (b.pairing.match_score || 0) - (a.pairing.match_score || 0));
    } else if (sortKey === 'customer_rating') {
      joined.sort((a, b) => (b.product.average_rating || 0) - (a.product.average_rating || 0));
    } else if (sortKey === 'price_low_to_high') {
      joined.sort((a, b) => (a.product.price || 0) - (b.product.price || 0));
    }

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalResults = joined.length;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const productsResult = joined.slice(start, end).map((x) => x.product);

    return {
      foodType,
      totalResults,
      page: currentPage,
      pageSize: size,
      products: productsResult
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', {});

    return {
      heroTitle: content.heroTitle || '',
      heroBody: content.heroBody || '',
      history: content.history || '',
      craftsmanship: content.craftsmanship || '',
      qualityStandards: content.qualityStandards || '',
      sustainability: content.sustainability || '',
      responsibleDrinking: content.responsibleDrinking || ''
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    const content = this._getFromStorage('contact_page_content', {});

    return {
      supportEmail: content.supportEmail || '',
      supportPhone: content.supportPhone || '',
      serviceHours: content.serviceHours || '',
      topics: Array.isArray(content.topics) ? content.topics : []
    };
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    if (!name || !email || !message) {
      return {
        success: false,
        caseId: null,
        message: 'Name, email and message are required.'
      };
    }

    const submissions = this._getFromStorage('contact_form_submissions', []);
    const caseId = this._generateId('case');

    const submission = {
      id: caseId,
      name,
      email,
      topic: topic || null,
      message,
      created_at: this._now()
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      caseId,
      message: 'Your message has been received.'
    };
  }

  // getFAQEntries()
  getFAQEntries() {
    const entries = this._getFromStorage('faq_entries', []);
    return entries;
  }

  // getLegalPolicies()
  getLegalPolicies() {
    const content = this._getFromStorage('legal_policies', {});

    return {
      termsOfUse: content.termsOfUse || '',
      privacyPolicy: content.privacyPolicy || '',
      responsibleDrinkingPolicy: content.responsibleDrinkingPolicy || '',
      additionalNotices: content.additionalNotices || ''
    };
  }
}

// Global export for browser-like and Node.js environments without direct window access
if (typeof globalThis !== 'undefined') {
  globalThis.BusinessLogic = BusinessLogic;
  globalThis.WebsiteSDK = new BusinessLogic();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}