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
  }

  // ---------------------- STORAGE HELPERS ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tables = [
      'product_categories',
      'products',
      'carts',
      'cart_items',
      'quote_carts',
      'quote_cart_items',
      'wishlists',
      'wishlist_items',
      'support_requests',
      'shipping_methods',
      'checkout_sessions',
      'industries',
      'industry_solution_packages',
      'quote_requests',
      'quote_request_items',
      'static_pages'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
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

  // ---------------------- GENERIC HELPERS ----------------------

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  _findCategoryById(id) {
    const categories = this._getFromStorage('product_categories');
    return categories.find(c => c.id === id) || null;
  }

  _findCategoryByKey(key) {
    const categories = this._getFromStorage('product_categories');
    return categories.find(c => c.key === key) || null;
  }

  _getCategoryAndDescendantIdsByKeys(categoryKeys) {
    const categories = this._getFromStorage('product_categories');
    const keySet = new Set(categoryKeys);
    const idSet = new Set();

    // Seed with categories matching keys
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      if (keySet.has(c.key)) {
        idSet.add(c.id);
      }
    }

    let added = true;
    while (added) {
      added = false;
      for (let i = 0; i < categories.length; i++) {
        const c = categories[i];
        if (c.parent_category_id && idSet.has(c.parent_category_id) && !idSet.has(c.id)) {
          idSet.add(c.id);
          added = true;
        }
      }
    }

    return Array.from(idSet);
  }

  _getCategoryIdsForCategoryKey(categoryKey) {
    return this._getCategoryAndDescendantIdsByKeys([categoryKey]);
  }

  _getCategoryKeysForIds(categoryIds) {
    const categories = this._getFromStorage('product_categories');
    const map = new Map();
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      map.set(c.id, c.key);
    }
    const result = [];
    for (let i = 0; i < categoryIds.length; i++) {
      const id = categoryIds[i];
      if (map.has(id)) result.push(map.get(id));
    }
    return result;
  }

  _titleCase(str) {
    if (!str) return '';
    return str
      .split('_')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  // Foreign key resolution helper for items with product_id
  _attachProductsToItems(items, productIdField, outputField) {
    const products = this._getFromStorage('products');
    const productMap = new Map();
    for (let i = 0; i < products.length; i++) {
      productMap.set(products[i].id, products[i]);
    }
    const field = productIdField || 'product_id';
    const out = outputField || 'product';
    return items.map(it => {
      const clone = this._clone(it);
      const pid = clone[field];
      clone[out] = pid && productMap.has(pid) ? this._clone(productMap.get(pid)) : null;
      return clone;
    });
  }

  _attachSolutionPackagesToItems(items, solutionIdField, outputField) {
    const packages = this._getFromStorage('industry_solution_packages');
    const map = new Map();
    for (let i = 0; i < packages.length; i++) {
      map.set(packages[i].id, packages[i]);
    }
    const field = solutionIdField || 'solution_package_id';
    const out = outputField || 'solution_package';
    return items.map(it => {
      const clone = this._clone(it);
      const sid = clone[field];
      clone[out] = sid && map.has(sid) ? this._clone(map.get(sid)) : null;
      return clone;
    });
  }

  // ---------------------- CART HELPERS ----------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        currency: 'usd',
        status: 'open',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getCartById(cartId) {
    const carts = this._getFromStorage('carts');
    return carts.find(c => c.id === cartId) || null;
  }

  _saveCart(cart) {
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _calculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items');
    let subtotal = 0;
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cart_id === cart.id) {
        item.line_total = item.quantity * item.unit_price;
        subtotal += item.line_total;
      }
    }
    cart.subtotal = subtotal;
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);
  }

  _buildCartResponse(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const productMap = new Map();
    for (let i = 0; i < products.length; i++) {
      productMap.set(products[i].id, products[i]);
    }

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id === cart.id) {
        const product = productMap.get(ci.product_id) || null;
        items.push({
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: product ? product.name : '',
          sku: product ? product.sku : '',
          image_url: product ? product.image_url : '',
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total,
          availability_status: product ? product.availability_status : null,
          can_add_to_cart: product ? !!product.can_add_to_cart : false,
          product: product ? this._clone(product) : null
        });
      }
    }

    return {
      id: cart.id,
      status: cart.status,
      currency: cart.currency,
      subtotal: cart.subtotal,
      items: items
    };
  }

  // ---------------------- QUOTE CART HELPERS ----------------------

  _getOrCreateQuoteCart() {
    const carts = this._getFromStorage('quote_carts');
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('quote_cart'),
        items: [],
        status: 'open',
        overall_notes: '',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('quote_carts', carts);
    } else if (!Array.isArray(cart.items)) {
      cart.items = [];
      this._saveToStorage('quote_carts', carts);
    }
    return cart;
  }

  _saveQuoteCart(cart) {
    const carts = this._getFromStorage('quote_carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) carts[idx] = cart; else carts.push(cart);
    this._saveToStorage('quote_carts', carts);
  }

  _buildQuoteCartResponse(cart) {
    const itemsAll = this._getFromStorage('quote_cart_items');
    const products = this._getFromStorage('products');
    const productMap = new Map();
    for (let i = 0; i < products.length; i++) {
      productMap.set(products[i].id, products[i]);
    }

    const items = [];
    for (let i = 0; i < itemsAll.length; i++) {
      const it = itemsAll[i];
      if (it.quote_cart_id === cart.id) {
        const product = productMap.get(it.product_id) || null;
        items.push({
          quote_cart_item_id: it.id,
          product_id: it.product_id,
          product_name: product ? product.name : '',
          sku: product ? product.sku : '',
          quantity: it.quantity,
          added_at: it.added_at,
          product: product ? this._clone(product) : null
        });
      }
    }

    return {
      id: cart.id,
      status: cart.status,
      overall_notes: cart.overall_notes || '',
      items: items
    };
  }

  // ---------------------- WISHLIST HELPERS ----------------------

  _getOrCreateWishlist() {
    const lists = this._getFromStorage('wishlists');
    let wl = lists[0] || null;
    if (!wl) {
      wl = {
        id: this._generateId('wishlist'),
        name: 'Project List',
        items: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      lists.push(wl);
      this._saveToStorage('wishlists', lists);
    }
    return wl;
  }

  _saveWishlist(wishlist) {
    const lists = this._getFromStorage('wishlists');
    const idx = lists.findIndex(w => w.id === wishlist.id);
    if (idx >= 0) lists[idx] = wishlist; else lists.push(wishlist);
    this._saveToStorage('wishlists', lists);
  }

  _buildWishlistResponse(wishlist) {
    const itemsAll = this._getFromStorage('wishlist_items');
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const productMap = new Map();
    for (let i = 0; i < products.length; i++) {
      productMap.set(products[i].id, products[i]);
    }
    const categoryMap = new Map();
    for (let i = 0; i < categories.length; i++) {
      categoryMap.set(categories[i].id, categories[i]);
    }

    const items = [];
    for (let i = 0; i < itemsAll.length; i++) {
      const it = itemsAll[i];
      if (it.wishlist_id === wishlist.id) {
        const product = productMap.get(it.product_id) || null;
        const categoryName = product && categoryMap.has(product.category_id)
          ? categoryMap.get(product.category_id).name
          : '';
        items.push({
          wishlist_item_id: it.id,
          product_id: it.product_id,
          product_name: product ? product.name : '',
          sku: product ? product.sku : '',
          category_name: categoryName,
          quantity: it.quantity,
          added_at: it.added_at,
          product: product ? this._clone(product) : null
        });
      }
    }

    return {
      id: wishlist.id,
      name: wishlist.name,
      items: items
    };
  }

  // ---------------------- CHECKOUT HELPERS ----------------------

  _getOrCreateCheckoutSession(cart) {
    const sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find(s => s.cart_id === cart.id && (s.status === 'editing' || s.status === 'ready_for_payment'));
    if (!session) {
      session = {
        id: this._generateId('checkout'),
        cart_id: cart.id,
        shipping_name: '',
        shipping_street: '',
        shipping_city: '',
        shipping_state: '',
        shipping_postal_code: '',
        shipping_country: '',
        available_shipping_method_ids: [],
        selected_shipping_method_id: null,
        selected_payment_method: null,
        status: 'editing',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }
    return session;
  }

  _saveCheckoutSession(session) {
    const sessions = this._getFromStorage('checkout_sessions');
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session; else sessions.push(session);
    this._saveToStorage('checkout_sessions', sessions);
  }

  _determineAvailableShippingMethods(cart, session) {
    const methods = this._getFromStorage('shipping_methods');
    // Simple implementation: return all active methods; no mocking of data
    return methods.filter(m => m.is_active);
  }

  // ---------------------- FILTER & SORT HELPERS ----------------------

  _filterAndSortProducts(products, filters, sortBy, sortDirection) {
    let result = products.slice();
    const f = filters || {};

    result = result.filter(p => {
      if (f.min_wattage_w != null && p.wattage_w != null && p.wattage_w < f.min_wattage_w) return false;
      if (f.max_wattage_w != null && p.wattage_w != null && p.wattage_w > f.max_wattage_w) return false;
      if (f.voltage && p.voltage && p.voltage !== f.voltage) return false;

      if (f.min_power_kw != null && p.power_kw != null && p.power_kw < f.min_power_kw) return false;
      if (f.max_power_kw != null && p.power_kw != null && p.power_kw > f.max_power_kw) return false;

      if (f.min_capacity_kw != null && p.capacity_kw != null && p.capacity_kw < f.min_capacity_kw) return false;
      if (f.max_capacity_kw != null && p.capacity_kw != null && p.capacity_kw > f.max_capacity_kw) return false;

      if (f.min_temp_c != null && p.temp_min_c != null && p.temp_min_c < f.min_temp_c) return false;
      if (f.max_temp_c != null && p.temp_max_c != null && p.temp_max_c > f.max_temp_c) return false;

      if (f.temp_max_at_least_c != null) {
        const maxTemp = p.temp_max_c != null ? p.temp_max_c : p.max_operating_temperature_c;
        if (maxTemp != null && maxTemp < f.temp_max_at_least_c) return false;
      }

      if (f.temp_min_at_most_c != null && p.temp_min_c != null && p.temp_min_c > f.temp_min_at_most_c) return false;

      if (f.min_max_operating_temperature_c != null && p.max_operating_temperature_c != null && p.max_operating_temperature_c < f.min_max_operating_temperature_c) return false;

      if (f.min_pressure_bar != null && p.max_pressure_bar != null && p.max_pressure_bar < f.min_pressure_bar) return false;

      if (f.availability_status && p.availability_status && p.availability_status !== f.availability_status) return false;

      if (f.max_lead_time_days != null && p.lead_time_days != null && p.lead_time_days > f.max_lead_time_days) return false;

      if (f.min_price != null && p.unit_price != null && p.unit_price < f.min_price) return false;
      if (f.max_price != null && p.unit_price != null && p.unit_price > f.max_price) return false;

      if (f.zone_count != null && p.zone_count != null && p.zone_count !== f.zone_count) return false;

      if (f.supply_voltage && p.supply_voltage && p.supply_voltage !== f.supply_voltage) return false;

      if (f.communication_option && p.communication_option && p.communication_option !== f.communication_option) return false;

      if (f.mounting_type && p.mounting_type && p.mounting_type !== f.mounting_type) return false;

      if (f.medium && p.medium && p.medium !== f.medium) return false;

      if (f.material && p.material && p.material !== f.material) return false;

      if (f.sheath_material && p.sheath_material && p.sheath_material !== f.sheath_material) return false;

      if (f.rating_min != null && p.rating_average != null && p.rating_average < f.rating_min) return false;

      return true;
    });

    if (sortBy) {
      const dir = sortDirection === 'asc' ? 1 : -1;
      let key = null;
      if (sortBy === 'price') key = 'unit_price';
      else if (sortBy === 'rating') key = 'rating_average';
      else if (sortBy === 'popularity') key = 'popularity_score';
      else if (sortBy === 'capacity_kw') key = 'capacity_kw';
      else if (sortBy === 'wattage_w') key = 'wattage_w';

      if (key) {
        result.sort((a, b) => {
          const av = a[key] != null ? a[key] : 0;
          const bv = b[key] != null ? b[key] : 0;
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
      }
    }

    return result;
  }

  _filterAndSortSolutionPackages(packages, filters, sortBy, sortDirection) {
    let result = packages.slice();
    const f = filters || {};

    result = result.filter(p => {
      if (f.min_process_temp_c != null && p.process_temp_min_c != null && p.process_temp_min_c > f.min_process_temp_c) {
        // require package min temp <= requested min
        return false;
      }
      if (f.max_process_temp_c != null && p.process_temp_max_c != null && p.process_temp_max_c < f.max_process_temp_c) {
        // require package max temp >= requested max
        return false;
      }
      if (f.min_power_kw != null && p.base_power_kw != null && p.base_power_kw < f.min_power_kw) return false;
      if (f.max_power_kw != null && p.base_power_kw != null && p.base_power_kw > f.max_power_kw) return false;
      if (f.min_price != null && p.indicative_price != null && p.indicative_price < f.min_price) return false;
      if (f.max_price != null && p.indicative_price != null && p.indicative_price > f.max_price) return false;
      return true;
    });

    if (sortBy) {
      const dir = sortDirection === 'asc' ? 1 : -1;
      let key = null;
      if (sortBy === 'price') key = 'indicative_price';
      else if (sortBy === 'popularity' || sortBy === 'best_match') key = 'popularity_score';

      if (key) {
        result.sort((a, b) => {
          const av = a[key] != null ? a[key] : 0;
          const bv = b[key] != null ? b[key] : 0;
          if (av < bv) return -1 * dir;
          if (av > bv) return 1 * dir;
          return 0;
        });
      }
    }

    return result;
  }

  // ---------------------- QUOTE REQUEST HELPERS ----------------------

  _saveQuoteRequest(qr) {
    const list = this._getFromStorage('quote_requests');
    const idx = list.findIndex(x => x.id === qr.id);
    if (idx >= 0) list[idx] = qr; else list.push(qr);
    this._saveToStorage('quote_requests', list);
  }

  _saveQuoteRequestItems(items) {
    const list = this._getFromStorage('quote_request_items');
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const idx = list.findIndex(x => x.id === it.id);
      if (idx >= 0) list[idx] = it; else list.push(it);
    }
    this._saveToStorage('quote_request_items', list);
  }

  _createQuoteRequestFromProduct(productId, quantity, requestedShipDate, targetPrice, overallNotes) {
    const quoteRequestId = this._generateId('quote_req');
    const itemId = this._generateId('quote_req_item');
    const now = this._nowIso();

    const item = {
      id: itemId,
      quote_request_id: quoteRequestId,
      item_type: 'product',
      product_id: productId,
      solution_package_id: null,
      quantity: quantity,
      required_power_kw: null,
      requested_ship_date: requestedShipDate ? new Date(requestedShipDate).toISOString() : null,
      target_price: targetPrice != null ? targetPrice : null
    };

    const qr = {
      id: quoteRequestId,
      source_type: 'product_page',
      source_quote_cart_id: null,
      items: [itemId],
      overall_notes: overallNotes || '',
      status: 'submitted',
      submitted_at: now
    };

    this._saveQuoteRequestItems([item]);
    this._saveQuoteRequest(qr);

    return qr;
  }

  _createQuoteRequestFromQuoteCart(overallNotes) {
    const cart = this._getOrCreateQuoteCart();
    const allItems = this._getFromStorage('quote_cart_items');
    const cartItems = allItems.filter(it => it.quote_cart_id === cart.id);

    const quoteRequestId = this._generateId('quote_req');
    const now = this._nowIso();

    const qItems = [];
    const qItemIds = [];

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      const qItemId = this._generateId('quote_req_item');
      const qi = {
        id: qItemId,
        quote_request_id: quoteRequestId,
        item_type: 'product',
        product_id: ci.product_id,
        solution_package_id: null,
        quantity: ci.quantity,
        required_power_kw: null,
        requested_ship_date: null,
        target_price: null
      };
      qItems.push(qi);
      qItemIds.push(qItemId);
    }

    const qr = {
      id: quoteRequestId,
      source_type: 'quote_cart',
      source_quote_cart_id: cart.id,
      items: qItemIds,
      overall_notes: overallNotes || cart.overall_notes || '',
      status: 'submitted',
      submitted_at: now
    };

    this._saveQuoteRequestItems(qItems);
    this._saveQuoteRequest(qr);

    cart.status = 'submitted';
    cart.updated_at = now;
    this._saveQuoteCart(cart);

    return qr;
  }

  _createQuoteRequestFromSolutionPackage(solutionPackageId, requiredPowerKw, quantity, requestedShipDate, targetPrice, overallNotes) {
    const quoteRequestId = this._generateId('quote_req');
    const itemId = this._generateId('quote_req_item');
    const now = this._nowIso();

    const item = {
      id: itemId,
      quote_request_id: quoteRequestId,
      item_type: 'solution_package',
      product_id: null,
      solution_package_id: solutionPackageId,
      quantity: quantity,
      required_power_kw: requiredPowerKw != null ? requiredPowerKw : null,
      requested_ship_date: requestedShipDate ? new Date(requestedShipDate).toISOString() : null,
      target_price: targetPrice != null ? targetPrice : null
    };

    const qr = {
      id: quoteRequestId,
      source_type: 'solution_package_page',
      source_quote_cart_id: null,
      items: [itemId],
      overall_notes: overallNotes || '',
      status: 'submitted',
      submitted_at: now
    };

    this._saveQuoteRequestItems([item]);
    this._saveQuoteRequest(qr);

    return qr;
  }

  // ---------------------- CORE INTERFACES ----------------------

  // getHomePageData()
  getHomePageData() {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');
    const solutionPackages = this._getFromStorage('industry_solution_packages');

    // Featured categories: first few categories
    const featuredCategories = categories.slice(0, 6);

    // Featured products: pick by popularity_score desc
    const sortedProducts = products
      .filter(p => p.status === 'active')
      .slice()
      .sort((a, b) => {
        const av = a.popularity_score != null ? a.popularity_score : 0;
        const bv = b.popularity_score != null ? b.popularity_score : 0;
        return bv - av;
      });

    const categoryMap = new Map();
    for (let i = 0; i < categories.length; i++) {
      categoryMap.set(categories[i].id, categories[i]);
    }

    const featuredProductsRaw = sortedProducts.slice(0, 8).map(p => {
      const cat = categoryMap.get(p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        category_name: cat ? cat.name : '',
        short_description: p.short_description || '',
        image_url: p.image_url || '',
        unit_price: p.unit_price,
        currency: p.currency,
        highlight_badge: ''
      };
    });

    const featuredProducts = this._attachProductsToItems(featuredProductsRaw, 'product_id', 'product');

    const activeSolutions = solutionPackages.filter(sp => sp.status === 'active');

    return {
      hero_title: 'Industrial Thermal Components & Systems',
      hero_subtitle: 'Design, select, and configure heaters, sensors, and controls for demanding applications.',
      featured_categories: featuredCategories.map(c => {
        const clone = this._clone(c);
        if (clone.parent_category_id) {
          clone.parent_category = this._findCategoryById(clone.parent_category_id);
        } else {
          clone.parent_category = null;
        }
        return clone;
      }),
      featured_products: featuredProducts,
      featured_solution_packages: activeSolutions,
      primary_ctas: [
        { type: 'view_products', label: 'Browse Products', target: 'all_products' },
        { type: 'request_quote', label: 'Request a Quote', target: 'request_quote' },
        { type: 'contact_support', label: 'Contact Support', target: 'contact_support' },
        { type: 'view_industries', label: 'Industries We Serve', target: 'industries_overview' }
      ]
    };
  }

  // getProductCategoriesForNavigation()
  getProductCategoriesForNavigation() {
    const categories = this._getFromStorage('product_categories');
    const result = categories.map(c => {
      const clone = this._clone(c);
      if (clone.parent_category_id) {
        clone.parent_category = this._findCategoryById(clone.parent_category_id);
      } else {
        clone.parent_category = null;
      }
      return clone;
    });
    return result;
  }

  // getIndustriesForNavigation()
  getIndustriesForNavigation() {
    return this._getFromStorage('industries');
  }

  // getProductFilterOptions(categoryKey)
  getProductFilterOptions(categoryKey) {
    const categories = this._getFromStorage('product_categories');
    const category = categories.find(c => c.key === categoryKey) || null;
    const categoryIds = this._getCategoryIdsForCategoryKey(categoryKey);
    const products = this._getFromStorage('products').filter(p => categoryIds.includes(p.category_id));

    const numericRange = (selector) => {
      let min = null;
      let max = null;
      for (let i = 0; i < products.length; i++) {
        const v = selector(products[i]);
        if (v == null) continue;
        if (min == null || v < min) min = v;
        if (max == null || v > max) max = v;
      }
      return { min, max };
    };

    const wattage = numericRange(p => p.wattage_w);
    const powerKw = numericRange(p => p.power_kw);
    const capacity = numericRange(p => p.capacity_kw);
    const tempMin = numericRange(p => p.temp_min_c);
    const tempMax = numericRange(p => p.temp_max_c);
    const maxOpTemp = numericRange(p => p.max_operating_temperature_c);
    const pressure = numericRange(p => p.max_pressure_bar);
    const leadTime = numericRange(p => p.lead_time_days);
    const price = numericRange(p => p.unit_price);

    const collectUnique = (selector) => {
      const set = new Set();
      for (let i = 0; i < products.length; i++) {
        const v = selector(products[i]);
        if (v != null && v !== '') set.add(v);
      }
      return Array.from(set);
    };

    const available_voltage_options = collectUnique(p => p.voltage);
    const available_materials = collectUnique(p => p.material);
    const available_mounting_types = collectUnique(p => p.mounting_type);
    const available_media = collectUnique(p => p.medium);
    const available_zone_counts = collectUnique(p => p.zone_count);
    const available_supply_voltages = collectUnique(p => p.supply_voltage);
    const available_communication_options = collectUnique(p => p.communication_option);
    const available_availability_statuses = collectUnique(p => p.availability_status);

    const available_sort_options = [
      { sort_key: 'price_asc', label: 'Price: Low to High' },
      { sort_key: 'price_desc', label: 'Price: High to Low' },
      { sort_key: 'rating_desc', label: 'Rating: High to Low' },
      { sort_key: 'rating_asc', label: 'Rating: Low to High' },
      { sort_key: 'popularity_desc', label: 'Most Popular' },
      { sort_key: 'wattage_w_asc', label: 'Wattage: Low to High' }
    ];

    return {
      category_name: category ? category.name : '',
      available_wattage_min: wattage.min,
      available_wattage_max: wattage.max,
      available_voltage_options: available_voltage_options,
      available_power_kw_min: powerKw.min,
      available_power_kw_max: powerKw.max,
      available_capacity_kw_min: capacity.min,
      available_capacity_kw_max: capacity.max,
      available_temp_min_c_min: tempMin.min,
      available_temp_min_c_max: tempMin.max,
      available_temp_max_c_min: tempMax.min,
      available_temp_max_c_max: tempMax.max,
      available_max_pressure_bar_min: pressure.min,
      available_max_pressure_bar_max: pressure.max,
      available_materials: available_materials,
      available_mounting_types: available_mounting_types,
      available_media: available_media,
      available_zone_counts: available_zone_counts,
      available_supply_voltages: available_supply_voltages,
      available_communication_options: available_communication_options,
      available_availability_statuses: available_availability_statuses,
      available_lead_time_days_min: leadTime.min,
      available_lead_time_days_max: leadTime.max,
      available_price_min: price.min,
      available_price_max: price.max,
      can_filter_by_rating: true,
      available_sort_options: available_sort_options
    };
  }

  // listCategoryProducts(categoryKey, filters, sortBy, sortDirection, page, pageSize)
  listCategoryProducts(categoryKey, filters, sortBy, sortDirection, page, pageSize) {
    const categories = this._getFromStorage('product_categories');
    const category = categories.find(c => c.key === categoryKey) || null;
    const categoryIds = this._getCategoryIdsForCategoryKey(categoryKey);
    const allProducts = this._getFromStorage('products').filter(p => categoryIds.includes(p.category_id));

    // Map sortBy from UI labels
    let sortKey = null;
    let sortDir = sortDirection || 'asc';
    if (sortBy === 'price') sortKey = 'price';
    else if (sortBy === 'rating') sortKey = 'rating';
    else if (sortBy === 'popularity') sortKey = 'popularity';
    else if (sortBy === 'capacity_kw') sortKey = 'capacity_kw';
    else if (sortBy === 'wattage_w') sortKey = 'wattage_w';
    else if (!sortBy) sortKey = null;

    const filtered = this._filterAndSortProducts(allProducts, filters || {}, sortKey, sortDir);

    const currentPage = page || 1;
    const size = pageSize || 20;
    const start = (currentPage - 1) * size;
    const slice = filtered.slice(start, start + size);

    const productsOut = slice.map(p => ({
      product_id: p.id,
      name: p.name,
      sku: p.sku,
      short_description: p.short_description || '',
      image_url: p.image_url || '',
      unit_price: p.unit_price,
      currency: p.currency,
      availability_status: p.availability_status,
      lead_time_days: p.lead_time_days,
      can_add_to_cart: !!p.can_add_to_cart,
      can_add_to_quote_cart: !!p.can_add_to_quote_cart,
      can_add_to_wishlist: !!p.can_add_to_wishlist,
      voltage: p.voltage,
      wattage_w: p.wattage_w,
      power_kw: p.power_kw,
      capacity_kw: p.capacity_kw,
      max_pressure_bar: p.max_pressure_bar,
      temp_min_c: p.temp_min_c,
      temp_max_c: p.temp_max_c,
      max_operating_temperature_c: p.max_operating_temperature_c,
      mounting_type: p.mounting_type,
      medium: p.medium,
      material: p.material,
      sheath_material: p.sheath_material,
      zone_count: p.zone_count,
      supply_voltage: p.supply_voltage,
      communication_option: p.communication_option,
      rating_average: p.rating_average,
      rating_count: p.rating_count,
      popularity_score: p.popularity_score,
      product: this._clone(p)
    }));

    return {
      category_name: category ? category.name : '',
      total_results: filtered.length,
      page: currentPage,
      page_size: size,
      products: productsOut
    };
  }

  // searchProducts(query, filters, sortBy, sortDirection, page, pageSize)
  searchProducts(query, filters, sortBy, sortDirection, page, pageSize) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const allProducts = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const categoryMap = new Map();
    for (let i = 0; i < categories.length; i++) {
      categoryMap.set(categories[i].id, categories[i]);
    }

    let products = allProducts.slice();

    // Text relevance filter
    if (q) {
      products = products.filter(p => {
        const haystack = [p.name, p.sku, p.short_description, p.long_description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    // Category filter with hierarchy
    if (f.category_keys && f.category_keys.length > 0) {
      const categoryIds = this._getCategoryAndDescendantIdsByKeys(f.category_keys);
      products = products.filter(p => categoryIds.includes(p.category_id));
    }

    // Price filter
    if (f.min_price != null) {
      products = products.filter(p => p.unit_price == null || p.unit_price >= f.min_price);
    }
    if (f.max_price != null) {
      products = products.filter(p => p.unit_price == null || p.unit_price <= f.max_price);
    }

    // Temperature filter
    if (f.temp_max_at_least_c != null) {
      products = products.filter(p => {
        const maxT = p.temp_max_c != null ? p.temp_max_c : p.max_operating_temperature_c;
        return maxT == null || maxT >= f.temp_max_at_least_c;
      });
    }

    // Rating filter
    if (f.rating_min != null) {
      products = products.filter(p => p.rating_average == null || p.rating_average >= f.rating_min);
    }

    // Compute relevance score
    const scored = products.map(p => {
      let score = 0;
      if (q) {
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const desc = (p.short_description || '').toLowerCase();
        if (name.indexOf(q) !== -1) score += 3;
        if (sku.indexOf(q) !== -1) score += 2;
        if (desc.indexOf(q) !== -1) score += 1;
      }
      return { product: p, relevance: score };
    });

    const sBy = sortBy || 'relevance';
    const dir = sortDirection === 'asc' ? 1 : -1;

    scored.sort((a, b) => {
      if (sBy === 'price') {
        const av = a.product.unit_price != null ? a.product.unit_price : 0;
        const bv = b.product.unit_price != null ? b.product.unit_price : 0;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      }
      if (sBy === 'rating') {
        const av = a.product.rating_average != null ? a.product.rating_average : 0;
        const bv = b.product.rating_average != null ? b.product.rating_average : 0;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      }
      if (sBy === 'popularity') {
        const av = a.product.popularity_score != null ? a.product.popularity_score : 0;
        const bv = b.product.popularity_score != null ? b.product.popularity_score : 0;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      }
      // relevance
      if (a.relevance < b.relevance) return 1; // higher first
      if (a.relevance > b.relevance) return -1;
      return 0;
    });

    const currentPage = page || 1;
    const size = pageSize || 20;
    const start = (currentPage - 1) * size;
    const slice = scored.slice(start, start + size);

    const resultProducts = slice.map(entry => {
      const p = entry.product;
      const cat = categoryMap.get(p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        category_name: cat ? cat.name : '',
        short_description: p.short_description || '',
        unit_price: p.unit_price,
        currency: p.currency,
        temp_min_c: p.temp_min_c,
        temp_max_c: p.temp_max_c,
        rating_average: p.rating_average,
        rating_count: p.rating_count,
        can_add_to_wishlist: !!p.can_add_to_wishlist,
        product: this._clone(p)
      };
    });

    // Suggested categories based on result distribution
    const countsByCategory = new Map();
    for (let i = 0; i < scored.length; i++) {
      const p = scored[i].product;
      const cat = categoryMap.get(p.category_id);
      if (!cat) continue;
      const key = cat.key;
      if (!countsByCategory.has(key)) countsByCategory.set(key, { count: 0, name: cat.name });
      countsByCategory.get(key).count += 1;
    }

    const suggested_categories = [];
    countsByCategory.forEach((value, key) => {
      suggested_categories.push({
        category_key: key,
        category_name: value.name,
        result_count: value.count
      });
    });

    return {
      total_results: scored.length,
      page: currentPage,
      page_size: size,
      products: resultProducts,
      suggested_categories: suggested_categories
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const product = products.find(p => p.id === productId) || null;
    let category = null;
    if (product) {
      category = categories.find(c => c.id === product.category_id) || null;
    }

    if (!product) {
      return {
        product: null,
        related_documents: [],
        accessories: [],
        recommended_products: []
      };
    }

    const productOut = this._clone(product);
    productOut.category_name = category ? category.name : '';
    productOut.category = category ? this._clone(category) : null;

    return {
      product: productOut,
      related_documents: [],
      accessories: [],
      recommended_products: []
    };
  }

  // addToCart(productId, quantity)
  addToCart(productId, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;

    if (!product || !product.can_add_to_cart || product.status !== 'active') {
      return { success: false, message: 'Product not available for direct purchase', cart: null };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find(ci => ci.cart_id === cart.id && ci.product_id === productId);
    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.unit_price,
        line_total: product.unit_price * qty,
        added_at: this._nowIso()
      };
      cartItems.push(item);
      cart.items.push(item.id);
    }

    this._saveToStorage('cart_items', cartItems);
    this._calculateCartTotals(cart);

    const cartResponse = this._buildCartResponse(cart);

    return {
      success: true,
      message: 'Added to cart',
      cart: cartResponse
    };
  }

  // addToQuoteCart(productId, quantity)
  addToQuoteCart(productId, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;

    if (!product || !product.can_add_to_quote_cart || product.status !== 'active') {
      return { success: false, message: 'Product not available for quote cart', quote_cart: null };
    }

    const cart = this._getOrCreateQuoteCart();
    const items = this._getFromStorage('quote_cart_items');

    let item = items.find(it => it.quote_cart_id === cart.id && it.product_id === productId);
    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('quote_cart_item'),
        quote_cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        added_at: this._nowIso()
      };
      items.push(item);
      cart.items.push(item.id);
    }

    cart.updated_at = this._nowIso();
    this._saveToStorage('quote_cart_items', items);
    this._saveQuoteCart(cart);

    const response = this._buildQuoteCartResponse(cart);

    return {
      success: true,
      message: 'Added to quote cart',
      quote_cart: response
    };
  }

  // addToWishlist(productId, quantity?)
  addToWishlist(productId, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;

    if (!product || !product.can_add_to_wishlist) {
      return { success: false, message: 'Product not available for wishlist', wishlist: null };
    }

    const wishlist = this._getOrCreateWishlist();
    const items = this._getFromStorage('wishlist_items');

    let item = items.find(it => it.wishlist_id === wishlist.id && it.product_id === productId);
    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        product_id: productId,
        quantity: qty,
        added_at: this._nowIso()
      };
      items.push(item);
      wishlist.items.push(item.id);
    }

    wishlist.updated_at = this._nowIso();
    this._saveToStorage('wishlist_items', items);
    this._saveWishlist(wishlist);

    const response = this._buildWishlistResponse(wishlist);

    return {
      success: true,
      message: 'Added to wishlist',
      wishlist: response
    };
  }

  // getCart()
  getCart() {
    const carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'open') || null;
    if (!cart) {
      cart = this._getOrCreateCart();
    }
    const response = this._buildCartResponse(cart);
    return response;
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = quantity != null ? quantity : 1;
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId) || null;
    if (!item) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cart_id) || null;
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null };
    }

    if (qty <= 0) {
      // remove item
      const idx = cartItems.findIndex(ci => ci.id === cartItemId);
      if (idx >= 0) cartItems.splice(idx, 1);
      const idIdx = cart.items.indexOf(cartItemId);
      if (idIdx >= 0) cart.items.splice(idIdx, 1);
    } else {
      item.quantity = qty;
    }

    this._saveToStorage('cart_items', cartItems);
    this._calculateCartTotals(cart);

    const response = this._buildCartResponse(cart);

    return {
      success: true,
      message: 'Cart updated',
      cart: response
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const itemIdx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIdx < 0) {
      return { success: false, message: 'Cart item not found', cart: null };
    }
    const item = cartItems[itemIdx];

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cart_id) || null;
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null };
    }

    cartItems.splice(itemIdx, 1);
    const idIdx = cart.items.indexOf(cartItemId);
    if (idIdx >= 0) cart.items.splice(idIdx, 1);

    this._saveToStorage('cart_items', cartItems);
    this._calculateCartTotals(cart);

    const response = this._buildCartResponse(cart);

    return {
      success: true,
      message: 'Item removed',
      cart: response
    };
  }

  // startCheckout()
  startCheckout() {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession(cart);

    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const productMap = new Map();
    for (let i = 0; i < products.length; i++) {
      productMap.set(products[i].id, products[i]);
    }

    const itemsSummary = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id === cart.id) {
        const product = productMap.get(ci.product_id) || null;
        itemsSummary.push({
          product_name: product ? product.name : '',
          sku: product ? product.sku : '',
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total
        });
      }
    }

    return {
      checkout_session_id: session.id,
      status: session.status,
      cart_summary: {
        cart_id: cart.id,
        currency: cart.currency,
        subtotal: cart.subtotal,
        items: itemsSummary
      }
    };
  }

  // updateCheckoutShippingAddress(checkoutSessionId, ...)
  updateCheckoutShippingAddress(checkoutSessionId, shippingName, shippingStreet, shippingCity, shippingState, shippingPostalCode, shippingCountry) {
    const sessions = this._getFromStorage('checkout_sessions');
    const session = sessions.find(s => s.id === checkoutSessionId) || null;
    if (!session) {
      return {
        checkout_session_id: checkoutSessionId,
        cart_id: null,
        shipping_name: shippingName,
        shipping_street: shippingStreet,
        shipping_city: shippingCity,
        shipping_state: shippingState,
        shipping_postal_code: shippingPostalCode,
        shipping_country: shippingCountry,
        available_shipping_methods: [],
        selected_shipping_method_id: null,
        selected_payment_method: null,
        status: 'editing'
      };
    }

    session.shipping_name = shippingName;
    session.shipping_street = shippingStreet;
    session.shipping_city = shippingCity;
    session.shipping_state = shippingState;
    session.shipping_postal_code = shippingPostalCode;
    session.shipping_country = shippingCountry;
    session.updated_at = this._nowIso();

    const cart = this._getCartById(session.cart_id) || this._getOrCreateCart();
    const availableMethods = this._determineAvailableShippingMethods(cart, session);
    session.available_shipping_method_ids = availableMethods.map(m => m.id);

    this._saveCheckoutSession(session);

    return {
      checkout_session_id: session.id,
      cart_id: session.cart_id,
      shipping_name: session.shipping_name,
      shipping_street: session.shipping_street,
      shipping_city: session.shipping_city,
      shipping_state: session.shipping_state,
      shipping_postal_code: session.shipping_postal_code,
      shipping_country: session.shipping_country,
      available_shipping_methods: availableMethods,
      selected_shipping_method_id: session.selected_shipping_method_id,
      selected_payment_method: session.selected_payment_method,
      status: session.status
    };
  }

  // selectCheckoutShippingMethod(checkoutSessionId, shippingMethodId)
  selectCheckoutShippingMethod(checkoutSessionId, shippingMethodId) {
    const sessions = this._getFromStorage('checkout_sessions');
    const session = sessions.find(s => s.id === checkoutSessionId) || null;
    if (!session) {
      return {
        checkout_session_id: checkoutSessionId,
        selected_shipping_method_id: null,
        available_shipping_methods: [],
        status: 'editing'
      };
    }

    const methods = this._getFromStorage('shipping_methods');
    const available = methods.filter(m => session.available_shipping_method_ids && session.available_shipping_method_ids.includes(m.id));
    const selected = available.find(m => m.id === shippingMethodId) || null;

    if (selected) {
      session.selected_shipping_method_id = selected.id;
    }
    session.updated_at = this._nowIso();
    this._saveCheckoutSession(session);

    return {
      checkout_session_id: session.id,
      selected_shipping_method_id: session.selected_shipping_method_id,
      available_shipping_methods: available,
      status: session.status
    };
  }

  // selectCheckoutPaymentMethod(checkoutSessionId, paymentMethod)
  selectCheckoutPaymentMethod(checkoutSessionId, paymentMethod) {
    const allowed = ['invoice_purchase_order', 'credit_card', 'bank_transfer', 'paypal', 'other'];
    const method = allowed.includes(paymentMethod) ? paymentMethod : 'other';

    const sessions = this._getFromStorage('checkout_sessions');
    const session = sessions.find(s => s.id === checkoutSessionId) || null;
    if (!session) {
      return {
        checkout_session_id: checkoutSessionId,
        selected_payment_method: method,
        status: 'editing'
      };
    }

    session.selected_payment_method = method;
    session.status = 'ready_for_payment';
    session.updated_at = this._nowIso();
    this._saveCheckoutSession(session);

    return {
      checkout_session_id: session.id,
      selected_payment_method: session.selected_payment_method,
      status: session.status
    };
  }

  // completeCheckout(checkoutSessionId)
  completeCheckout(checkoutSessionId) {
    const sessions = this._getFromStorage('checkout_sessions');
    const session = sessions.find(s => s.id === checkoutSessionId) || null;
    if (!session) {
      return { success: false, message: 'Checkout session not found', order_reference: null };
    }

    const cart = this._getCartById(session.cart_id);
    if (cart) {
      cart.status = 'checked_out';
      cart.updated_at = this._nowIso();
      this._saveCart(cart);
    }

    session.status = 'completed';
    session.updated_at = this._nowIso();
    this._saveCheckoutSession(session);

    const orderRef = 'ORD-' + this._getNextIdCounter();

    return {
      success: true,
      message: 'Checkout completed',
      order_reference: orderRef
    };
  }

  // getQuoteCart()
  getQuoteCart() {
    const cart = this._getOrCreateQuoteCart();
    return this._buildQuoteCartResponse(cart);
  }

  // updateQuoteCartItemQuantity(quoteCartItemId, quantity)
  updateQuoteCartItemQuantity(quoteCartItemId, quantity) {
    const qty = quantity != null ? quantity : 1;
    const items = this._getFromStorage('quote_cart_items');
    const item = items.find(it => it.id === quoteCartItemId) || null;
    if (!item) {
      return { success: false, quote_cart: null };
    }

    const carts = this._getFromStorage('quote_carts');
    const cart = carts.find(c => c.id === item.quote_cart_id) || null;
    if (!cart) {
      return { success: false, quote_cart: null };
    }

    if (qty <= 0) {
      const idx = items.findIndex(it => it.id === quoteCartItemId);
      if (idx >= 0) items.splice(idx, 1);
      const idIdx = cart.items.indexOf(quoteCartItemId);
      if (idIdx >= 0) cart.items.splice(idIdx, 1);
    } else {
      item.quantity = qty;
    }

    cart.updated_at = this._nowIso();
    this._saveToStorage('quote_cart_items', items);
    this._saveQuoteCart(cart);

    const response = this._buildQuoteCartResponse(cart);

    return {
      success: true,
      quote_cart: response
    };
  }

  // removeQuoteCartItem(quoteCartItemId)
  removeQuoteCartItem(quoteCartItemId) {
    const items = this._getFromStorage('quote_cart_items');
    const itemIdx = items.findIndex(it => it.id === quoteCartItemId);
    if (itemIdx < 0) {
      return { success: false, quote_cart: null };
    }
    const item = items[itemIdx];

    const carts = this._getFromStorage('quote_carts');
    const cart = carts.find(c => c.id === item.quote_cart_id) || null;
    if (!cart) {
      return { success: false, quote_cart: null };
    }

    items.splice(itemIdx, 1);
    const idIdx = cart.items.indexOf(quoteCartItemId);
    if (idIdx >= 0) cart.items.splice(idIdx, 1);

    cart.updated_at = this._nowIso();
    this._saveToStorage('quote_cart_items', items);
    this._saveQuoteCart(cart);

    const response = this._buildQuoteCartResponse(cart);

    return {
      success: true,
      quote_cart: response
    };
  }

  // updateQuoteCartNotes(overallNotes)
  updateQuoteCartNotes(overallNotes) {
    const cart = this._getOrCreateQuoteCart();
    cart.overall_notes = overallNotes || '';
    cart.updated_at = this._nowIso();
    this._saveQuoteCart(cart);
    return {
      success: true,
      quote_cart: {
        id: cart.id,
        status: cart.status,
        overall_notes: cart.overall_notes
      }
    };
  }

  // submitQuoteCartAsQuoteRequest(overallNotes?)
  submitQuoteCartAsQuoteRequest(overallNotes) {
    const qr = this._createQuoteRequestFromQuoteCart(overallNotes || '');

    // Build response with resolved items
    const allItems = this._getFromStorage('quote_request_items');
    const items = allItems.filter(it => it.quote_request_id === qr.id);
    const itemsWithProduct = this._attachProductsToItems(items, 'product_id', 'product');
    const itemsFull = this._attachSolutionPackagesToItems(itemsWithProduct, 'solution_package_id', 'solution_package');

    return {
      success: true,
      message: 'Quote request submitted',
      quote_request: {
        id: qr.id,
        source_type: qr.source_type,
        source_quote_cart_id: qr.source_quote_cart_id,
        status: qr.status,
        submitted_at: qr.submitted_at,
        items: itemsFull
      }
    };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    return this._buildWishlistResponse(wishlist);
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const items = this._getFromStorage('wishlist_items');
    const idx = items.findIndex(it => it.id === wishlistItemId);
    if (idx < 0) {
      return { success: false, wishlist: null };
    }
    const item = items[idx];

    const wishlist = this._getOrCreateWishlist();
    if (item.wishlist_id !== wishlist.id) {
      return { success: false, wishlist: null };
    }

    items.splice(idx, 1);
    const idIdx = wishlist.items.indexOf(wishlistItemId);
    if (idIdx >= 0) wishlist.items.splice(idIdx, 1);

    wishlist.updated_at = this._nowIso();
    this._saveToStorage('wishlist_items', items);
    this._saveWishlist(wishlist);

    const response = this._buildWishlistResponse(wishlist);

    return {
      success: true,
      wishlist: response
    };
  }

  // moveWishlistItemToCart(wishlistItemId, quantity?)
  moveWishlistItemToCart(wishlistItemId, quantity) {
    const items = this._getFromStorage('wishlist_items');
    const item = items.find(it => it.id === wishlistItemId) || null;
    if (!item) {
      return { success: false, cart: null, wishlist: null };
    }

    const qty = quantity && quantity > 0 ? quantity : item.quantity;
    const addResult = this.addToCart(item.product_id, qty);

    const wishlist = this._getOrCreateWishlist();
    const wishlistResponse = this._buildWishlistResponse(wishlist);

    return {
      success: !!addResult.success,
      cart: addResult.cart ? { id: addResult.cart.id, subtotal: addResult.cart.subtotal } : null,
      wishlist: {
        id: wishlistResponse.id,
        items: wishlistResponse.items.map(it => ({ wishlist_item_id: it.wishlist_item_id, product_id: it.product_id, product: it.product }))
      }
    };
  }

  // moveWishlistItemToQuoteCart(wishlistItemId, quantity?)
  moveWishlistItemToQuoteCart(wishlistItemId, quantity) {
    const items = this._getFromStorage('wishlist_items');
    const item = items.find(it => it.id === wishlistItemId) || null;
    if (!item) {
      return { success: false, quote_cart: null, wishlist: null };
    }
    const qty = quantity && quantity > 0 ? quantity : item.quantity;
    const addResult = this.addToQuoteCart(item.product_id, qty);

    const wishlist = this._getOrCreateWishlist();

    return {
      success: !!addResult.success,
      quote_cart: addResult.quote_cart ? { id: addResult.quote_cart.id, status: addResult.quote_cart.status } : null,
      wishlist: { id: wishlist.id }
    };
  }

  // requestProductQuote(productId, quantity, requestedShipDate?, targetPrice?, overallNotes?)
  requestProductQuote(productId, quantity, requestedShipDate, targetPrice, overallNotes) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const qr = this._createQuoteRequestFromProduct(productId, qty, requestedShipDate, targetPrice, overallNotes || '');

    const allItems = this._getFromStorage('quote_request_items');
    const items = allItems.filter(it => it.quote_request_id === qr.id);
    const itemsWithProduct = this._attachProductsToItems(items, 'product_id', 'product');
    const itemsFull = this._attachSolutionPackagesToItems(itemsWithProduct, 'solution_package_id', 'solution_package');

    return {
      success: true,
      message: 'Quote request submitted',
      quote_request: {
        id: qr.id,
        source_type: qr.source_type,
        status: qr.status,
        submitted_at: qr.submitted_at,
        items: itemsFull
      }
    };
  }

  // getSupportFormOptions()
  getSupportFormOptions() {
    const regions = [
      { value: 'north_america', label: 'North America' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia_pacific', label: 'Asia Pacific' },
      { value: 'latin_america', label: 'Latin America' },
      { value: 'middle_east_africa', label: 'Middle East & Africa' },
      { value: 'other', label: 'Other' }
    ];

    const inquiry_types = [
      { value: 'technical_question', label: 'Technical Question' },
      { value: 'sales_question', label: 'Sales Question' },
      { value: 'order_status', label: 'Order Status' },
      { value: 'other', label: 'Other' }
    ];

    const product_categories = this._getFromStorage('product_categories').map(c => ({
      product_category_key: c.key,
      label: c.name
    }));

    // Ensure special keys exist
    const keysSet = new Set(product_categories.map(pc => pc.product_category_key));
    const requiredKeys = [
      'all_products',
      'cartridge_heaters',
      'plate_heat_exchangers',
      'temperature_controllers',
      'temperature_sensors',
      'insulation_lagging',
      'immersion_heaters',
      'thermocouples',
      'rtd_sensors',
      'infrared_sensors',
      'band_heaters',
      'heating_packages',
      'other'
    ];
    for (let i = 0; i < requiredKeys.length; i++) {
      const k = requiredKeys[i];
      if (!keysSet.has(k)) {
        product_categories.push({ product_category_key: k, label: this._titleCase(k) });
      }
    }

    return {
      regions: regions,
      inquiry_types: inquiry_types,
      product_categories: product_categories
    };
  }

  // submitSupportRequest(region, inquiryType, productCategoryKey, subject, message, contactName, contactEmail)
  submitSupportRequest(region, inquiryType, productCategoryKey, subject, message, contactName, contactEmail) {
    const req = {
      id: this._generateId('support_req'),
      region: region,
      inquiry_type: inquiryType,
      product_category_key: productCategoryKey,
      subject: subject || '',
      message: message,
      contact_name: contactName,
      contact_email: contactEmail,
      status: 'submitted',
      created_at: this._nowIso()
    };

    const list = this._getFromStorage('support_requests');
    list.push(req);
    this._saveToStorage('support_requests', list);

    return {
      success: true,
      support_request: req
    };
  }

  // getIndustriesOverview()
  getIndustriesOverview() {
    const industries = this._getFromStorage('industries');
    const solutions = this._getFromStorage('industry_solution_packages');

    const overview = [];
    for (let i = 0; i < industries.length; i++) {
      const ind = industries[i];
      const pkgs = solutions.filter(sp => sp.industry_id === ind.id && sp.status === 'active');

      let minTemp = null;
      let maxTemp = null;
      const featuredIds = [];

      pkgs.sort((a, b) => {
        const av = a.popularity_score != null ? a.popularity_score : 0;
        const bv = b.popularity_score != null ? b.popularity_score : 0;
        return bv - av;
      });

      for (let j = 0; j < pkgs.length; j++) {
        const p = pkgs[j];
        if (minTemp == null || p.process_temp_min_c < minTemp) minTemp = p.process_temp_min_c;
        if (maxTemp == null || p.process_temp_max_c > maxTemp) maxTemp = p.process_temp_max_c;
        if (featuredIds.length < 3) featuredIds.push(p.id);
      }

      overview.push({
        industry_id: ind.id,
        key: ind.key,
        name: ind.name,
        description: ind.description || '',
        hero_image_url: ind.hero_image_url || '',
        representative_applications: [],
        typical_process_temp_range: {
          min_c: minTemp,
          max_c: maxTemp
        },
        featured_solution_package_ids: featuredIds
      });
    }

    return overview;
  }

  // getIndustryDetail(industryKey)
  getIndustryDetail(industryKey) {
    const industries = this._getFromStorage('industries');
    const industry = industries.find(i => i.key === industryKey) || null;

    if (!industry) {
      return {
        industry: null,
        thermal_challenges: '',
        featured_solution_packages: [],
        ctas: []
      };
    }

    const solutions = this._getFromStorage('industry_solution_packages');
    const featured = solutions.filter(sp => sp.industry_id === industry.id && sp.status === 'active');

    const ctas = [
      { type: 'view_all_solutions', label: 'View All Solutions', target: 'industry_solutions_' + industry.key },
      { type: 'request_quote', label: 'Request a Custom Quote', target: 'industry_quote_' + industry.key },
      { type: 'contact_expert', label: 'Contact an Industry Expert', target: 'contact_support' }
    ];

    return {
      industry: industry,
      thermal_challenges: '',
      featured_solution_packages: featured,
      ctas: ctas
    };
  }

  // getIndustrySolutionFilterOptions(industryKey)
  getIndustrySolutionFilterOptions(industryKey) {
    const industries = this._getFromStorage('industries');
    const industry = industries.find(i => i.key === industryKey) || null;
    const solutions = this._getFromStorage('industry_solution_packages');
    const pkgs = industry ? solutions.filter(sp => sp.industry_id === industry.id && sp.status === 'active') : [];

    const numericRange = (selector) => {
      let min = null;
      let max = null;
      for (let i = 0; i < pkgs.length; i++) {
        const v = selector(pkgs[i]);
        if (v == null) continue;
        if (min == null || v < min) min = v;
        if (max == null || v > max) max = v;
      }
      return { min, max };
    };

    const tMin = numericRange(p => p.process_temp_min_c);
    const tMax = numericRange(p => p.process_temp_max_c);
    const power = numericRange(p => p.base_power_kw);
    const price = numericRange(p => p.indicative_price);

    const available_sort_options = [
      { sort_key: 'price_asc', label: 'Price: Low to High' },
      { sort_key: 'price_desc', label: 'Price: High to Low' },
      { sort_key: 'popularity_desc', label: 'Most Popular' },
      { sort_key: 'best_match', label: 'Best Match' }
    ];

    return {
      process_temp_min_c_min: tMin.min,
      process_temp_min_c_max: tMin.max,
      process_temp_max_c_min: tMax.min,
      process_temp_max_c_max: tMax.max,
      power_kw_min: power.min,
      power_kw_max: power.max,
      price_min: price.min,
      price_max: price.max,
      available_sort_options: available_sort_options
    };
  }

  // listIndustrySolutionPackages(industryKey, filters, sortBy, sortDirection, page, pageSize)
  listIndustrySolutionPackages(industryKey, filters, sortBy, sortDirection, page, pageSize) {
    const industries = this._getFromStorage('industries');
    const industry = industries.find(i => i.key === industryKey) || null;
    const solutions = this._getFromStorage('industry_solution_packages');
    const pkgsAll = industry ? solutions.filter(sp => sp.industry_id === industry.id && sp.status === 'active') : [];

    let sortKey = null;
    if (sortBy === 'price') sortKey = 'price';
    else if (sortBy === 'popularity') sortKey = 'popularity';
    else if (sortBy === 'best_match') sortKey = 'best_match';

    const filtered = this._filterAndSortSolutionPackages(pkgsAll, filters || {}, sortKey, sortDirection || 'asc');

    const currentPage = page || 1;
    const size = pageSize || 20;
    const start = (currentPage - 1) * size;
    const slice = filtered.slice(start, start + size);

    const solution_packages = slice.map(p => ({
      solution_package_id: p.id,
      name: p.name,
      description_snippet: p.description || '',
      indicative_price: p.indicative_price,
      currency: p.currency,
      process_temp_min_c: p.process_temp_min_c,
      process_temp_max_c: p.process_temp_max_c,
      base_power_kw: p.base_power_kw,
      popularity_score: p.popularity_score,
      status: p.status,
      solution_package: this._clone(p)
    }));

    return {
      industry_name: industry ? industry.name : '',
      total_results: filtered.length,
      page: currentPage,
      page_size: size,
      solution_packages: solution_packages
    };
  }

  // getSolutionPackageDetail(solutionPackageId)
  getSolutionPackageDetail(solutionPackageId) {
    const solutions = this._getFromStorage('industry_solution_packages');
    const pk = solutions.find(p => p.id === solutionPackageId) || null;
    if (!pk) {
      return {
        solution_package: null,
        components_summary: [],
        recommended_complementary_products: [],
        documentation: []
      };
    }

    const industries = this._getFromStorage('industries');
    const industry = industries.find(i => i.id === pk.industry_id) || null;

    const solution_package = this._clone(pk);
    solution_package.industry_name = industry ? industry.name : '';

    return {
      solution_package: solution_package,
      components_summary: [],
      recommended_complementary_products: [],
      documentation: []
    };
  }

  // requestSolutionPackageQuote(solutionPackageId, requiredPowerKw?, quantity, requestedShipDate?, targetPrice?, overallNotes?)
  requestSolutionPackageQuote(solutionPackageId, requiredPowerKw, quantity, requestedShipDate, targetPrice, overallNotes) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const qr = this._createQuoteRequestFromSolutionPackage(
      solutionPackageId,
      requiredPowerKw,
      qty,
      requestedShipDate,
      targetPrice,
      overallNotes || ''
    );

    const allItems = this._getFromStorage('quote_request_items');
    const items = allItems.filter(it => it.quote_request_id === qr.id);
    const withProduct = this._attachProductsToItems(items, 'product_id', 'product');
    const fullItems = this._attachSolutionPackagesToItems(withProduct, 'solution_package_id', 'solution_package');

    return {
      success: true,
      message: 'Quote request submitted',
      quote_request: {
        id: qr.id,
        source_type: qr.source_type,
        status: qr.status,
        submitted_at: qr.submitted_at,
        items: fullItems
      }
    };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find(p => p.page_key === pageKey) || null;
    if (!page) {
      return {
        page_key: pageKey,
        title: this._titleCase(pageKey),
        body_markdown: ''
      };
    }
    return page;
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