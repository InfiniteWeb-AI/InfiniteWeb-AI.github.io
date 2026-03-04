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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    // Core tables based on storage_key definitions
    const tables = [
      'users', // not used but kept for compatibility
      'categories',
      'products',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'promo_codes',
      'orders',
      'order_items',
      // additional helper tables
      'promo_banners',
      'static_pages',
      'contact_messages'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Backwards compatibility with any existing camelCase keys
    if (localStorage.getItem('cartItems') && !localStorage.getItem('cart_items')) {
      try {
        const legacy = JSON.parse(localStorage.getItem('cartItems')) || [];
        localStorage.setItem('cart_items', JSON.stringify(legacy));
      } catch (e) {
        localStorage.setItem('cart_items', JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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

  _nowIso() {
    return new Date().toISOString();
  }

  _roundToTwo(num) {
    return Math.round((num || 0) * 100) / 100;
  }

  // -------------------- Private helpers (spec) --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts.find(c => c.status === 'active');

    if (!cart) {
      const now = this._nowIso();
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        item_ids: [],
        subtotal: 0,
        tax: 0,
        delivery_fee: 0,
        discount_total: 0,
        total: 0,
        applied_promo_code: null,
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }

    return cart;
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    let wishlist = wishlists[0];

    if (!wishlist) {
      const now = this._nowIso();
      wishlist = {
        id: this._generateId('wishlist'),
        item_ids: [],
        created_at: now,
        updated_at: now
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }

    return wishlist;
  }

  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    const itemsForCart = cartItems.filter(i => i.cart_id === cart.id);

    let subtotal = 0;
    for (const item of itemsForCart) {
      const lineTotal = (item.unit_price || 0) * (item.quantity || 0);
      subtotal += lineTotal;
    }
    subtotal = this._roundToTwo(subtotal);

    let discount_total = 0;
    let appliedPromo = null;

    if (cart.applied_promo_code) {
      appliedPromo = promoCodes.find(p =>
        p.code &&
        typeof p.code === 'string' &&
        p.code.toLowerCase() === String(cart.applied_promo_code).toLowerCase()
      );

      if (appliedPromo && appliedPromo.is_active) {
        // Ensure cart still meets min_order_total, otherwise drop promo
        if (appliedPromo.min_order_total && subtotal < appliedPromo.min_order_total) {
          appliedPromo = null;
          cart.applied_promo_code = null;
        }
      } else {
        appliedPromo = null;
        cart.applied_promo_code = null;
      }
    }

    if (appliedPromo) {
      if (appliedPromo.discount_type === 'percentage') {
        discount_total = subtotal * (appliedPromo.discount_value / 100);
      } else if (appliedPromo.discount_type === 'fixed_amount') {
        discount_total = appliedPromo.discount_value || 0;
      }
      if (discount_total > subtotal) {
        discount_total = subtotal;
      }
      discount_total = this._roundToTwo(discount_total);
    }

    const taxRate = 0.1; // 10% tax as a simple assumption
    const tax = this._roundToTwo(subtotal * taxRate);

    // For simplicity, use 0 delivery fee; can be extended based on items
    const delivery_fee = 0;

    const total = this._roundToTwo(subtotal + tax + delivery_fee - discount_total);

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.delivery_fee = delivery_fee;
    cart.discount_total = discount_total;
    cart.total = total;
    cart.updated_at = this._nowIso();

    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);

    return cart;
  }

  _validatePromoCode(cart, promo) {
    if (!promo) {
      return { isValid: false, message: 'Promo code not found.' };
    }
    if (!promo.is_active) {
      return { isValid: false, message: 'Promo code is not active.' };
    }

    const now = Date.now();

    if (promo.valid_from) {
      const from = Date.parse(promo.valid_from);
      if (!Number.isNaN(from) && now < from) {
        return { isValid: false, message: 'Promo code is not yet valid.' };
      }
    }

    if (promo.valid_to) {
      const to = Date.parse(promo.valid_to);
      if (!Number.isNaN(to) && now > to) {
        return { isValid: false, message: 'Promo code has expired.' };
      }
    }

    const subtotal = cart.subtotal || 0;
    if (promo.min_order_total && subtotal < promo.min_order_total) {
      return {
        isValid: false,
        message: 'Order total does not meet the minimum required for this promo code.'
      };
    }

    return { isValid: true, message: 'Promo code applied.' };
  }

  _createOrderFromCart(cart, details) {
    const orders = this._getFromStorage('orders', []);
    const orderItemsAll = this._getFromStorage('order_items', []);
    const cartItems = this._getFromStorage('cart_items', []).filter(i => i.cart_id === cart.id);

    const now = this._nowIso();
    const orderId = this._generateId('order');

    const order = {
      id: orderId,
      status: details.payment_method === 'credit_debit_card' ? 'paid' : 'pending',
      item_ids: [],
      subtotal: cart.subtotal || 0,
      tax: cart.tax || 0,
      delivery_fee: cart.delivery_fee || 0,
      discount_total: cart.discount_total || 0,
      total: cart.total || 0,
      promo_code: cart.applied_promo_code || null,
      created_at: now,
      updated_at: now,
      customer_full_name: details.full_name,
      contact_email: details.email,
      contact_phone: details.phone,
      shipping_address_line1: details.shipping_address_line1,
      shipping_address_line2: details.shipping_address_line2 || null,
      shipping_city: details.shipping_city,
      shipping_state: details.shipping_state,
      shipping_postal_code: details.shipping_postal_code,
      billing_same_as_shipping: !!details.billing_same_as_shipping,
      billing_address_line1: details.billing_same_as_shipping ? details.shipping_address_line1 : (details.billing_address_line1 || null),
      billing_address_line2: details.billing_same_as_shipping ? (details.shipping_address_line2 || null) : (details.billing_address_line2 || null),
      billing_city: details.billing_same_as_shipping ? details.shipping_city : (details.billing_city || null),
      billing_state: details.billing_same_as_shipping ? details.shipping_state : (details.billing_state || null),
      billing_postal_code: details.billing_same_as_shipping ? details.shipping_postal_code : (details.billing_postal_code || null),
      payment_method: details.payment_method,
      card_number: details.payment_method === 'credit_debit_card' ? details.card_number : null,
      card_expiration: details.payment_method === 'credit_debit_card' ? details.card_expiration : null,
      card_cvv: details.payment_method === 'credit_debit_card' ? details.card_cvv : null,
      card_holder_name: details.payment_method === 'credit_debit_card' ? (details.card_holder_name || details.full_name) : null
    };

    const orderItems = [];

    for (const ci of cartItems) {
      const oi = {
        id: this._generateId('order_item'),
        order_id: orderId,
        product_id: ci.product_id,
        product_name: ci.product_name,
        product_image_url: ci.product_image_url || null,
        category_code: ci.category_code || null,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        size_code: ci.size_code || null,
        size_display_label: ci.size_display_label || null,
        flavor: ci.flavor || null,
        tiers: ci.tiers || null,
        inscription_message: ci.inscription_message || null,
        delivery_date: ci.delivery_date || null,
        is_same_day_delivery: !!ci.is_same_day_delivery
      };
      order.item_ids.push(oi.id);
      orderItems.push(oi);
      orderItemsAll.push(oi);
    }

    orders.push(order);

    // Mark cart as checked_out
    const carts = this._getFromStorage('carts', []);
    const cartIdx = carts.findIndex(c => c.id === cart.id);
    if (cartIdx >= 0) {
      carts[cartIdx] = {
        ...cart,
        status: 'checked_out',
        updated_at: this._nowIso()
      };
      this._saveToStorage('carts', carts);
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItemsAll);

    return { order, order_items: orderItems };
  }

  _attachProductsToItems(items) {
    const products = this._getFromStorage('products', []);
    return items.map(item => ({
      ...item,
      product: products.find(p => p.id === item.product_id) || null
    }));
  }

  _attachProductsToOrderItems(items) {
    return this._attachProductsToItems(items);
  }

  _matchesSearchTerm(product, query) {
    if (!query) return false;
    const q = String(query).trim().toLowerCase();
    if (!q) return false;
    const name = (product.name || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    return name.includes(q) || desc.includes(q);
  }

  // -------------------- Interface implementations --------------------

  // getCategories(): Category[]
  getCategories() {
    return this._getFromStorage('categories', []);
  }

  // getFeaturedProducts(categoryCode?, limit?): { products: Product[] }
  getFeaturedProducts(categoryCode, limit) {
    const max = typeof limit === 'number' ? limit : 8;
    let products = this._getFromStorage('products', []).filter(p => p.status === 'active');

    if (categoryCode) {
      products = products.filter(p => Array.isArray(p.category_codes) && p.category_codes.includes(categoryCode));
    }

    // Simple heuristic: sort by rating desc, then review_count desc, then name
    products.sort((a, b) => {
      const ar = a.average_rating || 0;
      const br = b.average_rating || 0;
      if (br !== ar) return br - ar;
      const ac = a.review_count || 0;
      const bc = b.review_count || 0;
      if (bc !== ac) return bc - ac;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    return { products: products.slice(0, max) };
  }

  // getActivePromoBanners(): Banner[]
  getActivePromoBanners() {
    const banners = this._getFromStorage('promo_banners', []);
    // Assume all stored banners are active; sort by priority desc
    return banners.slice().sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  // getActivePromoCodes(): PromoCode[]
  getActivePromoCodes() {
    const promoCodes = this._getFromStorage('promo_codes', []);
    const now = Date.now();

    return promoCodes.filter(p => {
      if (!p.is_active) return false;
      if (p.valid_from) {
        const from = Date.parse(p.valid_from);
        if (!Number.isNaN(from) && now < from) return false;
      }
      if (p.valid_to) {
        const to = Date.parse(p.valid_to);
        if (!Number.isNaN(to) && now > to) return false;
      }
      return true;
    });
  }

  // getCartSummary(): { cart_id, item_count, subtotal, total, applied_promo_code }
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []).filter(i => i.cart_id === cart.id);
    const item_count = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      cart_id: updatedCart.id,
      item_count,
      subtotal: updatedCart.subtotal || 0,
      total: updatedCart.total || 0,
      applied_promo_code: updatedCart.applied_promo_code || null
    };
  }

  // getWishlistSummary(): { wishlist_id, item_count }
  getWishlistSummary() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []).filter(i => i.wishlist_id === wishlist.id);
    return {
      wishlist_id: wishlist.id,
      item_count: wishlistItems.length
    };
  }

  // getCategoryFilterOptions(categoryCode): {...}
  getCategoryFilterOptions(categoryCode) {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);

    const category = categories.find(c => c.code === categoryCode) || {
      code: categoryCode,
      name: categoryCode,
      description: ''
    };

    const catProducts = products.filter(
      p => p.status === 'active' && Array.isArray(p.category_codes) && p.category_codes.includes(categoryCode)
    );

    const flavorsSet = new Set();
    const dietarySet = new Set();
    const sizeSet = new Set();
    const deliveryOptions = new Set();

    let min_price = null;
    let max_price = null;

    for (const p of catProducts) {
      if (p.flavor) flavorsSet.add(p.flavor);
      if (Array.isArray(p.dietary_tags)) {
        for (const d of p.dietary_tags) {
          dietarySet.add(d);
        }
      }
      if (Array.isArray(p.available_size_codes)) {
        for (const s of p.available_size_codes) {
          sizeSet.add(s);
        }
      }
      if (typeof p.price === 'number') {
        if (min_price === null || p.price < min_price) min_price = p.price;
        if (max_price === null || p.price > max_price) max_price = p.price;
      }
      if (p.is_same_day_available) deliveryOptions.add('same_day');
      if (p.is_free_delivery) deliveryOptions.add('free_delivery');
    }

    const rating_options = [];
    if (catProducts.some(p => (p.average_rating || 0) >= 4)) rating_options.push(4);
    if (catProducts.some(p => (p.average_rating || 0) >= 4.5)) rating_options.push(4.5);

    return {
      category: {
        code: category.code,
        name: category.name,
        description: category.description || ''
      },
      flavors: Array.from(flavorsSet),
      dietary_tags: Array.from(dietarySet),
      size_codes: Array.from(sizeSet),
      price_range: {
        min_price: min_price === null ? 0 : min_price,
        max_price: max_price === null ? 0 : max_price
      },
      rating_options,
      delivery_options: Array.from(deliveryOptions)
    };
  }

  // getCategoryProducts(categoryCode, filters?, sort?, page?, page_size?)
  getCategoryProducts(categoryCode, filters, sort, page, page_size) {
    const categories = this._getFromStorage('categories', []);
    const productsAll = this._getFromStorage('products', []);

    const category = categories.find(c => c.code === categoryCode) || {
      code: categoryCode,
      name: categoryCode,
      description: ''
    };

    const appliedFilters = filters || {};
    let products = productsAll.filter(
      p => p.status === 'active' && Array.isArray(p.category_codes) && p.category_codes.includes(categoryCode)
    );

    products = this._applyProductFilters(products, appliedFilters);
    products = this._sortProducts(products, sort);

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total_items = products.length;
    const total_pages = Math.max(1, Math.ceil(total_items / size));
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageProducts = products.slice(start, end);

    return {
      category: {
        code: category.code,
        name: category.name,
        description: category.description || ''
      },
      products: pageProducts,
      pagination: {
        page: currentPage,
        page_size: size,
        total_items,
        total_pages
      },
      applied_filters: {
        flavor: appliedFilters.flavor || null,
        dietary_tags: appliedFilters.dietary_tags || [],
        size_codes: appliedFilters.size_codes || [],
        min_servings: appliedFilters.min_servings || null,
        max_servings: appliedFilters.max_servings || null,
        min_price: appliedFilters.min_price || null,
        max_price: appliedFilters.max_price || null,
        min_rating: appliedFilters.min_rating || null,
        is_same_day_available: appliedFilters.is_same_day_available || false,
        is_free_delivery: appliedFilters.is_free_delivery || false,
        is_customizable: appliedFilters.is_customizable || false
      }
    };
  }

  _applyProductFilters(products, filters) {
    if (!filters) return products;

    let result = products.slice();

    if (filters.flavor) {
      result = result.filter(p => p.flavor === filters.flavor);
    }

    if (Array.isArray(filters.dietary_tags) && filters.dietary_tags.length > 0) {
      result = result.filter(p => {
        if (!Array.isArray(p.dietary_tags) || p.dietary_tags.length === 0) return false;
        // require all requested tags to be present
        return filters.dietary_tags.every(tag => p.dietary_tags.includes(tag));
      });
    }

    if (Array.isArray(filters.size_codes) && filters.size_codes.length > 0) {
      result = result.filter(p => {
        if (!Array.isArray(p.available_size_codes) || p.available_size_codes.length === 0) return false;
        return filters.size_codes.some(code => p.available_size_codes.includes(code));
      });
    }

    if (typeof filters.min_servings === 'number') {
      result = result.filter(p => (p.min_servings || 0) >= filters.min_servings);
    }

    if (typeof filters.max_servings === 'number') {
      result = result.filter(p => (p.max_servings || 0) <= filters.max_servings);
    }

    if (typeof filters.min_price === 'number') {
      result = result.filter(p => (p.price || 0) >= filters.min_price);
    }

    if (typeof filters.max_price === 'number') {
      result = result.filter(p => (p.price || 0) <= filters.max_price);
    }

    if (typeof filters.min_rating === 'number') {
      result = result.filter(p => (p.average_rating || 0) >= filters.min_rating);
    }

    if (typeof filters.is_same_day_available === 'boolean' && filters.is_same_day_available) {
      result = result.filter(p => !!p.is_same_day_available);
    }

    if (typeof filters.is_free_delivery === 'boolean' && filters.is_free_delivery) {
      result = result.filter(p => !!p.is_free_delivery);
    }

    if (typeof filters.is_customizable === 'boolean' && filters.is_customizable) {
      result = result.filter(p => !!p.is_customizable);
    }

    return result;
  }

  _sortProducts(products, sort) {
    const list = products.slice();
    if (!sort || sort === 'bestsellers') {
      // Simple heuristic: review_count desc, rating desc, name asc
      list.sort((a, b) => {
        const ac = a.review_count || 0;
        const bc = b.review_count || 0;
        if (bc !== ac) return bc - ac;
        const ar = a.average_rating || 0;
        const br = b.average_rating || 0;
        if (br !== ar) return br - ar;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
      return list;
    }

    if (sort === 'price_low_to_high') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_high_to_low') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rating_high_to_low') {
      list.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }

    return list;
  }

  // getSearchFilterOptions(query): {...}
  getSearchFilterOptions(query) {
    const productsAll = this._getFromStorage('products', []);
    const products = productsAll.filter(p => p.status === 'active' && this._matchesSearchTerm(p, query));

    const flavorsSet = new Set();
    const dietarySet = new Set();
    const sizeSet = new Set();
    const deliveryOptions = new Set();

    let min_price = null;
    let max_price = null;

    for (const p of products) {
      if (p.flavor) flavorsSet.add(p.flavor);
      if (Array.isArray(p.dietary_tags)) {
        for (const d of p.dietary_tags) dietarySet.add(d);
      }
      if (Array.isArray(p.available_size_codes)) {
        for (const s of p.available_size_codes) sizeSet.add(s);
      }
      if (typeof p.price === 'number') {
        if (min_price === null || p.price < min_price) min_price = p.price;
        if (max_price === null || p.price > max_price) max_price = p.price;
      }
      if (p.is_free_delivery) deliveryOptions.add('free_delivery');
    }

    const rating_options = [];
    if (products.some(p => (p.average_rating || 0) >= 4)) rating_options.push(4);
    if (products.some(p => (p.average_rating || 0) >= 4.5)) rating_options.push(4.5);

    return {
      search_term: String(query || ''),
      flavors: Array.from(flavorsSet),
      dietary_tags: Array.from(dietarySet),
      size_codes: Array.from(sizeSet),
      price_range: {
        min_price: min_price === null ? 0 : min_price,
        max_price: max_price === null ? 0 : max_price
      },
      rating_options,
      delivery_options: Array.from(deliveryOptions)
    };
  }

  // searchProducts(query, filters?, sort?, page?, page_size?)
  searchProducts(query, filters, sort, page, page_size) {
    const productsAll = this._getFromStorage('products', []);
    const appliedFilters = filters || {};

    let products = productsAll.filter(p => p.status === 'active' && this._matchesSearchTerm(p, query));
    products = this._applyProductFilters(products, appliedFilters);
    products = this._sortProducts(products, sort);

    const currentPage = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total_items = products.length;
    const total_pages = Math.max(1, Math.ceil(total_items / size));
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageProducts = products.slice(start, end);

    return {
      search_term: String(query || ''),
      products: pageProducts,
      pagination: {
        page: currentPage,
        page_size: size,
        total_items,
        total_pages
      },
      applied_filters: {
        flavor: appliedFilters.flavor || null,
        dietary_tags: appliedFilters.dietary_tags || [],
        size_codes: appliedFilters.size_codes || [],
        min_servings: appliedFilters.min_servings || null,
        max_servings: appliedFilters.max_servings || null,
        min_price: appliedFilters.min_price || null,
        max_price: appliedFilters.max_price || null,
        min_rating: appliedFilters.min_rating || null,
        is_same_day_available: appliedFilters.is_same_day_available || false,
        is_free_delivery: appliedFilters.is_free_delivery || false
      }
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const product = products.find(p => p.id === productId);

    if (!product) return null;

    const category_names = (product.category_codes || []).map(code => {
      const cat = categories.find(c => c.code === code);
      return cat ? cat.name : code;
    });

    return {
      ...product,
      category_names
    };
  }

  // toggleWishlistForProduct(productId, categoryCode?)
  toggleWishlistForProduct(productId, categoryCode) {
    const wishlist = this._getOrCreateWishlist();
    const products = this._getFromStorage('products', []);
    let wishlists = this._getFromStorage('wishlists', []);
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const existing = wishlistItems.find(
      item => item.wishlist_id === wishlist.id && item.product_id === productId
    );

    const now = this._nowIso();

    if (existing) {
      // Remove from wishlist
      wishlistItems = wishlistItems.filter(i => i.id !== existing.id);
      wishlist.item_ids = (wishlist.item_ids || []).filter(id => id !== existing.id);
      wishlist.updated_at = now;

      const wlIdx = wishlists.findIndex(w => w.id === wishlist.id);
      if (wlIdx >= 0) {
        wishlists[wlIdx] = wishlist;
      } else {
        wishlists.push(wishlist);
      }

      this._saveToStorage('wishlist_items', wishlistItems);
      this._saveToStorage('wishlists', wishlists);

      return {
        wishlist_id: wishlist.id,
        product_id: productId,
        is_in_wishlist: false,
        message: 'Removed from wishlist.'
      };
    }

    const product = products.find(p => p.id === productId);
    if (!product) {
      return {
        wishlist_id: wishlist.id,
        product_id: productId,
        is_in_wishlist: false,
        message: 'Product not found.'
      };
    }

    const wishlistItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: product.id,
      product_name: product.name,
      product_image_url: product.image_url || null,
      product_price: product.price || 0,
      category_code:
        categoryCode ||
        (Array.isArray(product.category_codes) && product.category_codes.length > 0
          ? product.category_codes[0]
          : null),
      created_at: now
    };

    wishlistItems.push(wishlistItem);
    wishlist.item_ids = (wishlist.item_ids || []).concat([wishlistItem.id]);
    wishlist.updated_at = now;

    const wlIdx = wishlists.findIndex(w => w.id === wishlist.id);
    if (wlIdx >= 0) {
      wishlists[wlIdx] = wishlist;
    } else {
      wishlists.push(wishlist);
    }

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveToStorage('wishlists', wishlists);

    return {
      wishlist_id: wishlist.id,
      product_id: productId,
      is_in_wishlist: true,
      message: 'Added to wishlist.'
    };
  }

  // getWishlistItems(sort?)
  getWishlistItems(sort) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItemsAll = this._getFromStorage('wishlist_items', []);
    let items = wishlistItemsAll.filter(i => i.wishlist_id === wishlist.id);

    const sortMode = sort || 'newest';

    if (sortMode === 'price_low_to_high') {
      items.sort((a, b) => (a.product_price || 0) - (b.product_price || 0));
    } else if (sortMode === 'price_high_to_low') {
      items.sort((a, b) => (b.product_price || 0) - (a.product_price || 0));
    } else {
      // newest by created_at desc
      items.sort((a, b) => {
        const ad = a.created_at || '';
        const bd = b.created_at || '';
        if (ad === bd) return 0;
        return ad < bd ? 1 : -1;
      });
    }

    const itemsWithProduct = this._attachProductsToItems(items);

    return {
      wishlist: {
        id: wishlist.id,
        item_count: items.length
      },
      items: itemsWithProduct
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    let wishlists = this._getFromStorage('wishlists', []);

    const existing = wishlistItems.find(i => i.id === wishlistItemId);
    if (!existing) {
      return {
        success: false,
        wishlist_id: wishlist.id,
        remaining_item_count: wishlistItems.filter(i => i.wishlist_id === wishlist.id).length,
        message: 'Wishlist item not found.'
      };
    }

    wishlistItems = wishlistItems.filter(i => i.id !== wishlistItemId);
    wishlist.item_ids = (wishlist.item_ids || []).filter(id => id !== wishlistItemId);
    wishlist.updated_at = this._nowIso();

    const wlIdx = wishlists.findIndex(w => w.id === wishlist.id);
    if (wlIdx >= 0) {
      wishlists[wlIdx] = wishlist;
    } else {
      wishlists.push(wishlist);
    }

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveToStorage('wishlists', wishlists);

    const remaining = wishlistItems.filter(i => i.wishlist_id === wishlist.id).length;

    return {
      success: true,
      wishlist_id: wishlist.id,
      remaining_item_count: remaining,
      message: 'Wishlist item removed.'
    };
  }

  // addWishlistItemToCart(wishlistItemId, quantity?)
  addWishlistItemToCart(wishlistItemId, quantity) {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const wishlistItem = wishlistItems.find(i => i.id === wishlistItemId);

    if (!wishlistItem) {
      return {
        success: false,
        cart_id: null,
        cart_item: null,
        message: 'Wishlist item not found.'
      };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;

    const result = this.addConfiguredProductToCart(wishlistItem.product_id, {
      quantity: qty,
      category_code: wishlistItem.category_code || null
    });

    if (!result.success) {
      return {
        success: false,
        cart_id: result.cart_id || null,
        cart_item: result.cart_item || null,
        message: result.message || 'Failed to add wishlist item to cart.'
      };
    }

    return {
      success: true,
      cart_id: result.cart_id,
      cart_item: result.cart_item,
      message: 'Wishlist item added to cart.'
    };
  }

  // addConfiguredProductToCart(productId, configuration?)
  addConfiguredProductToCart(productId, configuration) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId && p.status === 'active');

    if (!product) {
      return {
        success: false,
        cart_id: null,
        cart_item: null,
        message: 'Product not found or inactive.'
      };
    }

    const config = configuration || {};
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const now = this._nowIso();

    const quantity = config.quantity && config.quantity > 0 ? config.quantity : 1;

    const size_code = config.size_code || product.default_size_code || null;
    const flavor = config.flavor || product.flavor || null;
    const tiers = typeof config.tiers === 'number' ? config.tiers : null;
    const inscription_message = config.inscription_message || null;
    const delivery_date = config.delivery_date || null;
    const is_same_day_delivery = !!config.is_same_day_delivery;

    const category_code =
      config.category_code ||
      (Array.isArray(product.category_codes) && product.category_codes.length > 0
        ? product.category_codes[0]
        : null);

    let size_display_label = null;
    if (Array.isArray(product.size_display_labels) && product.size_display_labels.length > 0) {
      // Try to pick a label that mentions the size code, otherwise first label
      const foundLabel = product.size_display_labels.find(l =>
        size_code && typeof l === 'string' && l.toLowerCase().includes(String(size_code).toLowerCase())
      );
      size_display_label = foundLabel || product.size_display_labels[0];
    }

    const unit_price = product.price || 0;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: product.id,
      product_name: product.name,
      product_image_url: product.image_url || null,
      category_code: category_code || null,
      unit_price,
      quantity,
      size_code,
      size_display_label,
      flavor,
      tiers,
      inscription_message,
      delivery_date,
      is_same_day_delivery,
      created_at: now,
      updated_at: now
    };

    cartItems.push(cartItem);

    cart.item_ids = (cart.item_ids || []).concat([cartItem.id]);

    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_id: updatedCart.id,
      cart_item: {
        ...cartItem,
        product
      },
      message: 'Product added to cart.'
    };
  }

  // getCartDetails(): { cart, items }
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const items = cartItemsAll.filter(i => i.cart_id === cart.id);
    const updatedCart = this._recalculateCartTotals(cart);
    const itemsWithProduct = this._attachProductsToItems(items);

    return {
      cart: {
        id: updatedCart.id,
        status: updatedCart.status,
        applied_promo_code: updatedCart.applied_promo_code || null,
        subtotal: updatedCart.subtotal || 0,
        tax: updatedCart.tax || 0,
        delivery_fee: updatedCart.delivery_fee || 0,
        discount_total: updatedCart.discount_total || 0,
        total: updatedCart.total || 0
      },
      items: itemsWithProduct
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const itemIdx = cartItems.findIndex(i => i.id === cartItemId);

    if (itemIdx === -1) {
      return {
        success: false,
        cart: null,
        updated_item: null,
        message: 'Cart item not found.'
      };
    }

    const newQty = quantity && quantity > 0 ? quantity : 1;
    const item = { ...cartItems[itemIdx], quantity: newQty, updated_at: this._nowIso() };
    cartItems[itemIdx] = item;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    const [updatedItemWithProduct] = this._attachProductsToItems([item]);

    return {
      success: true,
      cart: {
        id: updatedCart.id,
        subtotal: updatedCart.subtotal || 0,
        tax: updatedCart.tax || 0,
        delivery_fee: updatedCart.delivery_fee || 0,
        discount_total: updatedCart.discount_total || 0,
        total: updatedCart.total || 0
      },
      updated_item: updatedItemWithProduct,
      message: 'Cart item quantity updated.'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find(i => i.id === cartItemId);

    if (!item) {
      return {
        success: false,
        cart: null,
        remaining_items: [],
        message: 'Cart item not found.'
      };
    }

    cartItems = cartItems.filter(i => i.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();

    cart.item_ids = (cart.item_ids || []).filter(id => id !== cartItemId);
    this._saveToStorage('carts', carts);

    const updatedCart = this._recalculateCartTotals(cart);

    const remainingItems = cartItems.filter(i => i.cart_id === cart.id);
    const remainingWithProduct = this._attachProductsToItems(remainingItems);

    return {
      success: true,
      cart: {
        id: updatedCart.id,
        subtotal: updatedCart.subtotal || 0,
        tax: updatedCart.tax || 0,
        delivery_fee: updatedCart.delivery_fee || 0,
        discount_total: updatedCart.discount_total || 0,
        total: updatedCart.total || 0
      },
      remaining_items: remainingWithProduct,
      message: 'Cart item removed.'
    };
  }

  // applyPromoCode(promoCode)
  applyPromoCode(promoCode) {
    const code = String(promoCode || '').trim();
    if (!code) {
      return {
        success: false,
        cart: null,
        message: 'Promo code is required.'
      };
    }

    const cart = this._getOrCreateCart();
    const promoCodes = this._getFromStorage('promo_codes', []);

    const promo = promoCodes.find(p =>
      p.code && typeof p.code === 'string' && p.code.toLowerCase() === code.toLowerCase()
    );

    const validation = this._validatePromoCode(cart, promo);

    if (!validation.isValid) {
      // Do not change existing promo if invalid
      const updatedCart = this._recalculateCartTotals(cart);
      return {
        success: false,
        cart: {
          id: updatedCart.id,
          applied_promo_code: updatedCart.applied_promo_code || null,
          subtotal: updatedCart.subtotal || 0,
          tax: updatedCart.tax || 0,
          delivery_fee: updatedCart.delivery_fee || 0,
          discount_total: updatedCart.discount_total || 0,
          total: updatedCart.total || 0
        },
        message: validation.message
      };
    }

    cart.applied_promo_code = promo.code;
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: {
        id: updatedCart.id,
        applied_promo_code: updatedCart.applied_promo_code || null,
        subtotal: updatedCart.subtotal || 0,
        tax: updatedCart.tax || 0,
        delivery_fee: updatedCart.delivery_fee || 0,
        discount_total: updatedCart.discount_total || 0,
        total: updatedCart.total || 0
      },
      message: validation.message
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const items = cartItemsAll.filter(i => i.cart_id === cart.id);

    const updatedCart = this._recalculateCartTotals(cart);
    const itemsWithProduct = this._attachProductsToItems(items);

    const can_checkout = itemsWithProduct.length > 0;
    const validation_messages = [];

    if (!can_checkout) {
      validation_messages.push('Cart is empty.');
    }

    return {
      cart: {
        id: updatedCart.id,
        status: updatedCart.status,
        applied_promo_code: updatedCart.applied_promo_code || null,
        subtotal: updatedCart.subtotal || 0,
        tax: updatedCart.tax || 0,
        delivery_fee: updatedCart.delivery_fee || 0,
        discount_total: updatedCart.discount_total || 0,
        total: updatedCart.total || 0
      },
      items: itemsWithProduct,
      can_checkout,
      validation_messages
    };
  }

  // placeGuestOrder(...)
  placeGuestOrder(
    full_name,
    email,
    phone,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_state,
    shipping_postal_code,
    billing_same_as_shipping,
    billing_address_line1,
    billing_address_line2,
    billing_city,
    billing_state,
    billing_postal_code,
    payment_method,
    card_number,
    card_expiration,
    card_cvv,
    card_holder_name
  ) {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items', []);
    const items = cartItemsAll.filter(i => i.cart_id === cart.id);

    if (items.length === 0) {
      return {
        success: false,
        order: null,
        order_items: [],
        message: 'Cannot place order with an empty cart.'
      };
    }

    const updatedCart = this._recalculateCartTotals(cart);

    if (payment_method === 'credit_debit_card') {
      if (!card_number || !card_expiration || !card_cvv) {
        return {
          success: false,
          order: null,
          order_items: [],
          message: 'Card number, expiration, and CVV are required for card payments.'
        };
      }
    }

    const details = {
      full_name,
      email,
      phone,
      shipping_address_line1,
      shipping_address_line2,
      shipping_city,
      shipping_state,
      shipping_postal_code,
      billing_same_as_shipping,
      billing_address_line1,
      billing_address_line2,
      billing_city,
      billing_state,
      billing_postal_code,
      payment_method,
      card_number,
      card_expiration,
      card_cvv,
      card_holder_name
    };

    const { order, order_items } = this._createOrderFromCart(updatedCart, details);
    const orderItemsWithProduct = this._attachProductsToOrderItems(order_items);

    return {
      success: true,
      order,
      order_items: orderItemsWithProduct,
      message: 'Order placed successfully.'
    };
  }

  // getOrderDetails(orderId)
  getOrderDetails(orderId) {
    const orders = this._getFromStorage('orders', []);
    const orderItemsAll = this._getFromStorage('order_items', []);

    const order = orders.find(o => o.id === orderId) || null;
    if (!order) {
      return {
        order: null,
        order_items: []
      };
    }

    const items = orderItemsAll.filter(i => i.order_id === order.id);
    const itemsWithProduct = this._attachProductsToOrderItems(items);

    return {
      order,
      order_items: itemsWithProduct
    };
  }

  // getStaticPageContent(page_code)
  getStaticPageContent(page_code) {
    const pages = this._getFromStorage('static_pages', []);
    const page = pages.find(p => p.page_code === page_code);

    if (page) {
      return page;
    }

    return {
      page_code,
      title: '',
      sections: []
    };
  }

  // sendContactMessage(...)
  sendContactMessage(
    full_name,
    email,
    phone,
    subject,
    message,
    preferred_contact_method,
    order_id
  ) {
    const messages = this._getFromStorage('contact_messages', []);

    const record = {
      id: this._generateId('contact_message'),
      full_name,
      email,
      phone: phone || null,
      subject,
      message,
      preferred_contact_method: preferred_contact_method || null,
      order_id: order_id || null,
      created_at: this._nowIso()
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message submitted successfully.'
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
