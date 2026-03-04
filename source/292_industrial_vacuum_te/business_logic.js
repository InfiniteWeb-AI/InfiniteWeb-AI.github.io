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

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    // Legacy/example keys from scaffold
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    // New data model tables / collections
    if (!localStorage.getItem('categories')) {
      localStorage.setItem('categories', JSON.stringify([]));
    }
    if (!localStorage.getItem('solutions')) {
      localStorage.setItem('solutions', JSON.stringify([]));
    }
    if (!localStorage.getItem('applications')) {
      localStorage.setItem('applications', JSON.stringify([]));
    }
    if (!localStorage.getItem('documents')) {
      localStorage.setItem('documents', JSON.stringify([]));
    }
    // Cart: store single Cart object under key 'cart' (created lazily),
    // and CartItem records in 'cart_items'
    if (!localStorage.getItem('cart_items')) {
      localStorage.setItem('cart_items', JSON.stringify([]));
    }
    // Quote lists
    if (!localStorage.getItem('quote_lists')) {
      localStorage.setItem('quote_lists', JSON.stringify([]));
    }
    if (!localStorage.getItem('quote_list_items')) {
      localStorage.setItem('quote_list_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('product_quote_requests')) {
      localStorage.setItem('product_quote_requests', JSON.stringify([]));
    }
    // Wishlist
    if (!localStorage.getItem('wishlist_items')) {
      localStorage.setItem('wishlist_items', JSON.stringify([]));
    }
    // Project lists
    if (!localStorage.getItem('projects')) {
      localStorage.setItem('projects', JSON.stringify([]));
    }
    if (!localStorage.getItem('project_list_items')) {
      localStorage.setItem('project_list_items', JSON.stringify([]));
    }
    // Compare lists
    if (!localStorage.getItem('compare_lists')) {
      localStorage.setItem('compare_lists', JSON.stringify([]));
    }
    if (!localStorage.getItem('compare_list_items')) {
      localStorage.setItem('compare_list_items', JSON.stringify([]));
    }
    // System quote requests
    if (!localStorage.getItem('system_quote_requests')) {
      localStorage.setItem('system_quote_requests', JSON.stringify([]));
    }
    // Service requests
    if (!localStorage.getItem('service_requests')) {
      localStorage.setItem('service_requests', JSON.stringify([]));
    }
    // Partner locations
    if (!localStorage.getItem('partner_locations')) {
      localStorage.setItem('partner_locations', JSON.stringify([]));
    }
    // Contact messages (for sendContactMessage)
    if (!localStorage.getItem('contact_messages')) {
      localStorage.setItem('contact_messages', JSON.stringify([]));
    }
    // Legal/privacy and contact/about content are optional singletons,
    // created lazily when used, so no initialization here.

    // ID counter
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

  _nowIso() {
    return new Date().toISOString();
  }

  // -------------------- Private helpers for domain logic --------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        currency: 'usd',
        subtotal: 0,
        tax: 0,
        total: 0,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart, cartItems) {
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const subtotal = itemsForCart.reduce((sum, item) => sum + (item.line_total || 0), 0);
    cart.subtotal = subtotal;
    // Simple tax model: 0, can be extended later
    cart.tax = 0;
    cart.total = subtotal + cart.tax;
    cart.updated_at = this._nowIso();
    return cart;
  }

  _getOrCreateQuoteList() {
    const lists = this._getFromStorage('quote_lists', []);
    if (lists.length > 0) {
      return lists[0];
    }
    const quoteList = {
      id: this._generateId('quote_list'),
      name: null,
      item_ids: [],
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    lists.push(quoteList);
    this._saveToStorage('quote_lists', lists);
    return quoteList;
  }

  _getOrCreateWishlist() {
    // Store single Wishlist object under key 'wishlist' (not an array)
    let wishlist = this._getFromStorage('wishlist', null);
    if (!wishlist || !wishlist.id) {
      wishlist = {
        id: this._generateId('wishlist'),
        item_ids: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      this._saveToStorage('wishlist', wishlist);
    }
    return wishlist;
  }

  _getOrCreateProjectList() {
    const lists = this._getFromStorage('projects', []);
    if (lists.length > 0) {
      return lists[0];
    }
    const projectList = {
      id: this._generateId('project'),
      name: null,
      item_ids: [],
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    lists.push(projectList);
    this._saveToStorage('projects', lists);
    return projectList;
  }

  _getOrCreateCompareList() {
    const lists = this._getFromStorage('compare_lists', []);
    if (lists.length > 0) {
      return lists[0];
    }
    const compareList = {
      id: this._generateId('compare_list'),
      item_ids: [],
      created_at: this._nowIso()
    };
    lists.push(compareList);
    this._saveToStorage('compare_lists', lists);
    return compareList;
  }

  _resolveProductByModelCode(modelCode) {
    if (!modelCode) return null;
    const products = this._getFromStorage('products', []);
    const codeNorm = String(modelCode).trim().toLowerCase();
    return (
      products.find(
        (p) => p.model_code && String(p.model_code).trim().toLowerCase() === codeNorm
      ) || null
    );
  }

  _calculateDistancesForPartnerLocations(partnerLocations, baseCoordinates) {
    // Optional helper: if baseCoordinates and lat/long are available, compute distances.
    // If not, leave existing distance_km/distance_mi values untouched.
    if (!baseCoordinates || !baseCoordinates.lat || !baseCoordinates.lng) {
      return partnerLocations;
    }

    const R = 6371; // Earth radius in km
    const toRad = (deg) => (deg * Math.PI) / 180;

    const { lat: baseLat, lng: baseLng } = baseCoordinates;

    partnerLocations.forEach((loc) => {
      if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        const dLat = toRad(loc.latitude - baseLat);
        const dLng = toRad(loc.longitude - baseLng);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(baseLat)) *
            Math.cos(toRad(loc.latitude)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;
        loc.distance_km = distanceKm;
        loc.distance_mi = distanceKm * 0.621371;
      }
    });

    return partnerLocations;
  }

  _compareEfficiencyClass(a, b) {
    const order = { ie1: 1, ie2: 2, ie3: 3, ie4: 4 };
    const av = order[a] || 0;
    const bv = order[b] || 0;
    return av - bv;
  }

  _paginate(array, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    return array.slice(start, start + ps);
  }

  // -------------------- Interfaces Implementation --------------------

  // getHomeContent()
  getHomeContent() {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);

    const featuredCategories = categories.slice(0, 3);
    const featuredProducts = products.filter((p) => p.status === 'active').slice(0, 6);

    const quickActions = [
      {
        id: 'request_system_quote',
        label: 'Request central vacuum system quote',
        description: 'Submit your requirements for a central vacuum system.',
        targetPage: 'request_system_quote'
      },
      {
        id: 'book_service',
        label: 'Book maintenance service',
        description: 'Schedule preventive maintenance or repair.',
        targetPage: 'book_service'
      },
      {
        id: 'find_distributor',
        label: 'Find distributor / service center',
        description: 'Locate an authorized distributor or service center.',
        targetPage: 'find_distributor'
      },
      {
        id: 'browse_products',
        label: 'Browse products',
        description: 'Explore vacuum pumps, systems, and accessories.',
        targetPage: 'browse_products'
      }
    ];

    return { featuredCategories, featuredProducts, quickActions };
  }

  // globalSearch(query, scope = 'all', page = 1, pageSize = 20)
  globalSearch(query, scope, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const effScope = scope || 'all';

    const allProducts = this._getFromStorage('products', []);
    const allDocuments = this._getFromStorage('documents', []);

    let products = [];
    let documents = [];

    if (!q) {
      // If query is empty, return empty results (no global listing)
      return {
        products: [],
        documents: [],
        totalProductCount: 0,
        totalDocumentCount: 0
      };
    }

    if (effScope === 'all' || effScope === 'products') {
      products = allProducts.filter((p) => {
        const fields = [p.name, p.model_code, p.description]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        if (Array.isArray(p.feature_tags)) {
          fields.push(...p.feature_tags.map((t) => String(t).toLowerCase()));
        }
        return fields.some((f) => f.includes(q));
      });
    }

    if (effScope === 'all' || effScope === 'documents') {
      documents = allDocuments.filter((d) => {
        const fields = [d.title, d.model_code]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        return fields.some((f) => f.includes(q));
      });
    }

    const pagedProducts = this._paginate(products, page, pageSize);
    const pagedDocuments = this._paginate(documents, page, pageSize);

    return {
      products: pagedProducts,
      documents: pagedDocuments,
      totalProductCount: products.length,
      totalDocumentCount: documents.length
    };
  }

  // getProductCategories()
  getProductCategories() {
    return this._getFromStorage('categories', []);
  }

  // getProductFilterOptions(categoryId)
  getProductFilterOptions(categoryId) {
    const productsAll = this._getFromStorage('products', []);
    let products = productsAll.filter((p) => p.status === 'active');
    if (categoryId) {
      products = products.filter((p) => p.category_id === categoryId);
    }

    const unique = (arr) => Array.from(new Set(arr.filter((v) => v !== undefined && v !== null)));
    const toLabel = (value) => {
      if (!value) return '';
      return String(value)
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
    };

    const technologies = unique(products.map((p) => p.technology)).map((v) => ({
      value: v,
      label: toLabel(v)
    }));

    const supplyVoltages = unique(products.map((p) => p.supply_voltage)).map((v) => ({
      value: v,
      label: v
    }));

    const motorEfficiencyClasses = unique(products.map((p) => p.motor_efficiency_class)).map((v) => ({
      value: v,
      label: v.toUpperCase()
    }));

    const featureTags = unique(products.flatMap((p) => p.feature_tags || [])).map((v) => ({
      value: v,
      label: toLabel(v)
    }));

    const speeds = products
      .map((p) => p.pumping_speed_m3h)
      .filter((v) => typeof v === 'number');
    const powers = products
      .map((p) => p.motor_power_kw)
      .filter((v) => typeof v === 'number');
    const noises = products
      .map((p) => p.noise_level_dba)
      .filter((v) => typeof v === 'number');
    const prices = products.map((p) => p.price).filter((v) => typeof v === 'number');
    const currencies = unique(products.map((p) => p.currency));

    const pumpingSpeedRange = {
      min: speeds.length ? Math.min(...speeds) : 0,
      max: speeds.length ? Math.max(...speeds) : 0,
      unit: 'm3_h'
    };

    const motorPowerRange = {
      min: powers.length ? Math.min(...powers) : 0,
      max: powers.length ? Math.max(...powers) : 0,
      unit: 'kw'
    };

    const noiseLevelRange = {
      min: noises.length ? Math.min(...noises) : 0,
      max: noises.length ? Math.max(...noises) : 0,
      unit: 'dba'
    };

    const priceRange = {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      currency: currencies.length === 1 ? currencies[0] : null
    };

    const sortOptions = [
      { id: 'relevance', label: 'Relevance' },
      { id: 'price_asc', label: 'Price: Low to High' },
      { id: 'price_desc', label: 'Price: High to Low' },
      { id: 'efficiency_desc', label: 'Energy efficiency: High to Low' },
      { id: 'performance_desc', label: 'Performance: High to Low' }
    ];

    return {
      technologies,
      supplyVoltages,
      motorEfficiencyClasses,
      featureTags,
      pumpingSpeedRange,
      motorPowerRange,
      noiseLevelRange,
      priceRange,
      sortOptions
    };
  }

  // searchProducts(categoryId, filters, sortBy = 'relevance', page = 1, pageSize = 20)
  searchProducts(categoryId, filters, sortBy, page, pageSize) {
    const allProducts = this._getFromStorage('products', []);
    let items = allProducts.filter((p) => p.status === 'active');

    if (categoryId) {
      items = items.filter((p) => p.category_id === categoryId);
    }

    const f = filters || {};

    if (f.technology) {
      items = items.filter((p) => p.technology === f.technology);
    }
    if (typeof f.minPumpingSpeedM3h === 'number') {
      items = items.filter(
        (p) => typeof p.pumping_speed_m3h === 'number' && p.pumping_speed_m3h >= f.minPumpingSpeedM3h
      );
    }
    if (typeof f.maxPumpingSpeedM3h === 'number') {
      items = items.filter(
        (p) => typeof p.pumping_speed_m3h === 'number' && p.pumping_speed_m3h <= f.maxPumpingSpeedM3h
      );
    }
    if (typeof f.minMotorPowerKw === 'number') {
      items = items.filter(
        (p) => typeof p.motor_power_kw === 'number' && p.motor_power_kw >= f.minMotorPowerKw
      );
    }
    if (typeof f.maxMotorPowerKw === 'number') {
      items = items.filter(
        (p) => typeof p.motor_power_kw === 'number' && p.motor_power_kw <= f.maxMotorPowerKw
      );
    }
    if (typeof f.maxNoiseLevelDba === 'number') {
      items = items.filter(
        (p) => typeof p.noise_level_dba === 'number' && p.noise_level_dba <= f.maxNoiseLevelDba
      );
    }
    if (f.supplyVoltage) {
      items = items.filter((p) => p.supply_voltage === f.supplyVoltage);
    }
    if (typeof f.minPrice === 'number') {
      items = items.filter((p) => typeof p.price === 'number' && p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      items = items.filter((p) => typeof p.price === 'number' && p.price <= f.maxPrice);
    }
    if (f.currency) {
      items = items.filter((p) => p.currency === f.currency);
    }
    if (f.motorEfficiencyClassMin) {
      items = items.filter((p) => {
        if (!p.motor_efficiency_class) return false;
        return (
          this._compareEfficiencyClass(p.motor_efficiency_class, f.motorEfficiencyClassMin) >= 0
        );
      });
    }
    if (typeof f.hasIntegratedVsd === 'boolean') {
      items = items.filter((p) => !!p.has_integrated_vsd === f.hasIntegratedVsd);
    }
    if (typeof f.isEnergyEfficient === 'boolean') {
      items = items.filter((p) => !!p.is_energy_efficient === f.isEnergyEfficient);
    }
    if (typeof f.isOem === 'boolean') {
      items = items.filter((p) => !!p.is_oem === f.isOem);
    }
    if (f.compatibleModelCode) {
      const codeNorm = String(f.compatibleModelCode).trim().toLowerCase();
      items = items.filter((p) => {
        if (!Array.isArray(p.compatible_model_codes)) return false;
        return p.compatible_model_codes.some(
          (c) => String(c).trim().toLowerCase() === codeNorm
        );
      });
    }
    if (f.applicationId) {
      const appId = f.applicationId;
      items = items.filter((p) => Array.isArray(p.application_ids) && p.application_ids.includes(appId));
    }
    if (Array.isArray(f.featureTags) && f.featureTags.length > 0) {
      items = items.filter((p) => {
        const tags = new Set(p.feature_tags || []);
        return f.featureTags.every((t) => tags.has(t));
      });
    }

    const effSort = sortBy || 'relevance';

    if (effSort === 'price_asc') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (effSort === 'price_desc') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (effSort === 'efficiency_desc') {
      items.sort((a, b) => {
        // Energy-efficient first, then higher efficiency class
        const ae = a.is_energy_efficient ? 1 : 0;
        const be = b.is_energy_efficient ? 1 : 0;
        if (ae !== be) return be - ae;
        return this._compareEfficiencyClass(b.motor_efficiency_class, a.motor_efficiency_class);
      });
    } else if (effSort === 'performance_desc') {
      items.sort((a, b) => (b.pumping_speed_m3h || 0) - (a.pumping_speed_m3h || 0));
    }

    const totalCount = items.length;
    const paged = this._paginate(items, page, pageSize);

    return {
      items: paged,
      totalCount,
      page: page && page > 0 ? page : 1,
      pageSize: pageSize && pageSize > 0 ? pageSize : 20,
      appliedSort: effSort
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const documents = this._getFromStorage('documents', []);

    const product = products.find((p) => p.id === productId) || null;
    let category = null;
    let productDocuments = [];
    let recommendedAccessories = [];

    if (product) {
      if (product.category_id) {
        category = categories.find((c) => c.id === product.category_id) || null;
      }
      const productDocIds = Array.isArray(product.document_ids) ? product.document_ids : [];
      productDocuments = documents.filter(
        (d) => productDocIds.includes(d.id) || (Array.isArray(d.related_product_ids) && d.related_product_ids.includes(product.id))
      );

      const accessoriesIds = Array.isArray(product.recommended_accessory_ids)
        ? product.recommended_accessory_ids
        : [];
      recommendedAccessories = products.filter((p) => accessoriesIds.includes(p.id));
    }

    return {
      product,
      category,
      documents: productDocuments,
      recommendedAccessories
    };
  }

  // getProductDocuments(productId)
  getProductDocuments(productId) {
    const products = this._getFromStorage('products', []);
    const documents = this._getFromStorage('documents', []);
    const product = products.find((p) => p.id === productId);
    if (!product) return [];

    const productDocIds = Array.isArray(product.document_ids) ? product.document_ids : [];
    return documents.filter(
      (d) => productDocIds.includes(d.id) || (Array.isArray(d.related_product_ids) && d.related_product_ids.includes(product.id))
    );
  }

  // getRecommendedAccessories(productId)
  getRecommendedAccessories(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) return [];
    const accessoriesIds = Array.isArray(product.recommended_accessory_ids)
      ? product.recommended_accessory_ids
      : [];
    return products.filter((p) => accessoriesIds.includes(p.id));
  }

  // addProductToCart(productId, quantity = 1, configuration)
  addProductToCart(productId, quantity, configuration) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, cart: null, addedItem: null, message: 'Product not found' };
    }

    let cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity: qty,
      line_total: qty * product.price,
      added_at: this._nowIso()
    };

    // Allow optional configuration metadata (JSON-serializable)
    if (configuration && typeof configuration === 'object') {
      cartItem.configuration = configuration;
    }

    cartItems.push(cartItem);
    cart.item_ids.push(cartItem.id);

    const updatedCart = this._recalculateCartTotals(cart, cartItems);

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', updatedCart);

    return { success: true, cart: updatedCart, addedItem: cartItem, message: 'Added to cart' };
  }

  // getCart()
  getCart() {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    if (!cart || !cart.id) {
      return { cart: null, items: [] };
    }

    const itemsForCart = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((item) => ({
        ...item,
        product: products.find((p) => p.id === item.product_id) || null
      }));

    return { cart, items: itemsForCart };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return { cart: null, items: [] };
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (!item) {
      return this.getCart();
    }

    item.quantity = qty;
    item.line_total = qty * (item.unit_price || 0);

    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', updatedCart);

    const products = this._getFromStorage('products', []);
    const itemsForCart = cartItems
      .filter((ci) => ci.cart_id === updatedCart.id)
      .map((ci) => ({ ...ci, product: products.find((p) => p.id === ci.product_id) || null }));

    return { cart: updatedCart, items: itemsForCart };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return { cart: null, items: [] };
    }
    let cartItems = this._getFromStorage('cart_items', []);
    const beforeLength = cartItems.length;
    cartItems = cartItems.filter((ci) => ci.id !== cartItemId || ci.cart_id !== cart.id);

    if (beforeLength !== cartItems.length && Array.isArray(cart.item_ids)) {
      cart.item_ids = cart.item_ids.filter((id) => id !== cartItemId);
    }

    const updatedCart = this._recalculateCartTotals(cart, cartItems);
    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', updatedCart);

    const products = this._getFromStorage('products', []);
    const itemsForCart = cartItems
      .filter((ci) => ci.cart_id === updatedCart.id)
      .map((ci) => ({ ...ci, product: products.find((p) => p.id === ci.product_id) || null }));

    return { cart: updatedCart, items: itemsForCart };
  }

  // convertCartToQuoteList()
  convertCartToQuoteList() {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    if (!cart || !cart.id) {
      return { quoteList: null, quoteListItems: [], message: 'No cart to convert' };
    }

    const quoteList = this._getOrCreateQuoteList();
    const quoteLists = this._getFromStorage('quote_lists', []);
    const quoteListItems = this._getFromStorage('quote_list_items', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    itemsForCart.forEach((ci) => {
      const qItem = {
        id: this._generateId('quote_list_item'),
        quote_list_id: quoteList.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        quantity: ci.quantity,
        notes: null
      };
      quoteListItems.push(qItem);
      if (!Array.isArray(quoteList.item_ids)) quoteList.item_ids = [];
      quoteList.item_ids.push(qItem.id);
    });

    quoteList.updated_at = this._nowIso();

    // Save updated quote list back into collection
    const idx = quoteLists.findIndex((l) => l.id === quoteList.id);
    if (idx >= 0) {
      quoteLists[idx] = quoteList;
    } else {
      quoteLists.push(quoteList);
    }

    this._saveToStorage('quote_lists', quoteLists);
    this._saveToStorage('quote_list_items', quoteListItems);

    return { quoteList, quoteListItems, message: 'Cart converted to quote list' };
  }

  // getSolutionsOverview()
  getSolutionsOverview() {
    return this._getFromStorage('solutions', []);
  }

  // getSolutionDetails(solutionId)
  getSolutionDetails(solutionId) {
    const solutions = this._getFromStorage('solutions', []);
    const products = this._getFromStorage('products', []);

    const solution = solutions.find((s) => s.id === solutionId) || null;

    let recommendedProducts = [];
    if (solutionId === 'central_vacuum_systems') {
      recommendedProducts = products.filter((p) => p.product_type === 'central_vacuum_system');
    }

    return {
      solution,
      recommendedProducts,
      hasQuoteForm: solution ? !!solution.has_quote_form : false
    };
  }

  // getSolutionRecommendedProducts(solutionId)
  getSolutionRecommendedProducts(solutionId) {
    const products = this._getFromStorage('products', []);
    if (solutionId === 'central_vacuum_systems') {
      return products.filter((p) => p.product_type === 'central_vacuum_system');
    }
    return [];
  }

  // createSystemQuoteRequest(solutionId, application, numberOfWorkstations, requiredPumpingSpeedM3h,
  //                          requiredOperatingPressureMbar, supplyVoltage, timeframe,
  //                          contactName, contactCompany, contactEmail, contactPhone, additionalNotes)
  createSystemQuoteRequest(
    solutionId,
    application,
    numberOfWorkstations,
    requiredPumpingSpeedM3h,
    requiredOperatingPressureMbar,
    supplyVoltage,
    timeframe,
    contactName,
    contactCompany,
    contactEmail,
    contactPhone,
    additionalNotes
  ) {
    const requests = this._getFromStorage('system_quote_requests', []);

    const req = {
      id: this._generateId('system_quote_request'),
      solution_id: solutionId,
      application: application || null,
      number_of_workstations: numberOfWorkstations,
      required_pumping_speed_m3h: requiredPumpingSpeedM3h,
      required_operating_pressure_mbar: requiredOperatingPressureMbar,
      supply_voltage: supplyVoltage,
      timeframe: timeframe,
      contact_name: contactName,
      contact_company: contactCompany || null,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      additional_notes: additionalNotes || null,
      status: 'submitted',
      created_at: this._nowIso()
    };

    requests.push(req);
    this._saveToStorage('system_quote_requests', requests);

    return req;
  }

  // getSupportPageContent()
  getSupportPageContent() {
    const documents = this._getFromStorage('documents', []);
    const documentationAvailable = documents.length > 0;

    // FAQ and serviceContactInfo could be managed via separate storage in a real app.
    // Here we derive minimal data from localStorage if present.
    const storedContact = this._getFromStorage('contact_info', null);
    const serviceContactInfo = storedContact
      ? {
          email: storedContact.emailSupport || '',
          phone: storedContact.phoneMain || ''
        }
      : { email: '', phone: '' };

    return {
      documentationAvailable,
      faqAvailable: false,
      serviceContactInfo
    };
  }

  // getDocumentationFilterOptions()
  getDocumentationFilterOptions() {
    const documents = this._getFromStorage('documents', []);
    const unique = (arr) => Array.from(new Set(arr.filter((v) => v !== undefined && v !== null && v !== '')));
    const toLabel = (v) => {
      if (!v) return '';
      return String(v)
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
    };

    const productTypes = unique(documents.map((d) => d.product_type)).map((v) => ({
      value: v,
      label: toLabel(v)
    }));
    const documentTypes = unique(documents.map((d) => d.document_type)).map((v) => ({
      value: v,
      label: toLabel(v)
    }));
    const languages = unique(documents.map((d) => d.language)).map((v) => ({
      value: v,
      label: v.toUpperCase()
    }));

    return { productTypes, documentTypes, languages };
  }

  // searchDocuments(productType, modelCode, documentType, language, query)
  searchDocuments(productType, modelCode, documentType, language, query) {
    const documents = this._getFromStorage('documents', []);
    const q = (query || '').trim().toLowerCase();

    let results = documents.slice();

    if (productType) {
      results = results.filter((d) => d.product_type === productType);
    }
    if (modelCode) {
      const codeNorm = String(modelCode).trim().toLowerCase();
      results = results.filter(
        (d) => d.model_code && String(d.model_code).trim().toLowerCase() === codeNorm
      );
    }
    if (documentType) {
      results = results.filter((d) => d.document_type === documentType);
    }
    if (language) {
      results = results.filter((d) => d.language === language);
    }
    if (q) {
      results = results.filter((d) => String(d.title || '').toLowerCase().includes(q));
    }

    return results;
  }

  // getDocumentDetails(documentId)
  getDocumentDetails(documentId) {
    const documents = this._getFromStorage('documents', []);
    const document = documents.find((d) => d.id === documentId) || null;

    // Instrumentation for task completion tracking (task_3)
    try {
      if (
        document &&
        document.model_code &&
        String(document.model_code).trim().toLowerCase() === 'ds-450'
      ) {
        const task3Value = {
          documentId: document.id,
          modelCode: document.model_code,
          documentType: document.document_type,
          language: document.language,
          title: document.title,
          viewedAt: this._nowIso()
        };
        localStorage.setItem('task3_ds450ManualViewed', JSON.stringify(task3Value));
      }
    } catch (e) {
      console.error('Instrumentation error (task_3):', e);
    }

    return document;
  }

  // getServicePageContent()
  getServicePageContent() {
    const serviceTypes = [
      {
        id: 'preventive_maintenance',
        name: 'Preventive maintenance',
        description: 'Scheduled maintenance to maximize uptime and equipment life.'
      },
      {
        id: 'repair',
        name: 'Repair',
        description: 'Corrective maintenance and troubleshooting for your equipment.'
      }
    ];

    return { serviceTypes };
  }

  // getNearbyServiceCenters(country, postalCode, radiusKm = 100, requireServiceCenter = true)
  getNearbyServiceCenters(country, postalCode, radiusKm, requireServiceCenter) {
    const radius = typeof radiusKm === 'number' && radiusKm > 0 ? radiusKm : 100;
    const requireSC = typeof requireServiceCenter === 'boolean' ? requireServiceCenter : true;

    let locations = this._getFromStorage('partner_locations', []);

    locations = locations.filter((loc) => loc.country === country);

    if (requireSC) {
      locations = locations.filter((loc) => !!loc.is_service_center);
    }

    // Optionally compute distances if base coordinates known (not provided here),
    // but we leave existing distances as-is.
    locations = this._calculateDistancesForPartnerLocations(locations, null);

    // Filter by radius if distance_km is available; otherwise include
    locations = locations.filter((loc) => {
      if (typeof loc.distance_km === 'number') {
        return loc.distance_km <= radius;
      }
      return true;
    });

    // Sort by distance if available
    locations.sort((a, b) => {
      const da = typeof a.distance_km === 'number' ? a.distance_km : Number.POSITIVE_INFINITY;
      const db = typeof b.distance_km === 'number' ? b.distance_km : Number.POSITIVE_INFINITY;
      return da - db;
    });

    return locations;
  }

  // createServiceRequest(serviceType, equipmentModelCode, postalCode,
  //                      preferredServiceCenterId, preferredDate,
  //                      contactName, contactEmail, contactPhone, additionalNotes)
  createServiceRequest(
    serviceType,
    equipmentModelCode,
    postalCode,
    preferredServiceCenterId,
    preferredDate,
    contactName,
    contactEmail,
    contactPhone,
    additionalNotes
  ) {
    const requests = this._getFromStorage('service_requests', []);
    const product = this._resolveProductByModelCode(equipmentModelCode);

    const req = {
      id: this._generateId('service_request'),
      service_type: serviceType,
      equipment_model_code: equipmentModelCode,
      product_id: product ? product.id : null,
      postal_code: postalCode,
      preferred_service_center_id: preferredServiceCenterId || null,
      preferred_date: preferredDate,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      status: 'submitted',
      created_at: this._nowIso()
    };

    if (additionalNotes) {
      req.additional_notes = additionalNotes;
    }

    requests.push(req);
    this._saveToStorage('service_requests', requests);

    return req;
  }

  // getApplicationsOverview()
  getApplicationsOverview() {
    return this._getFromStorage('applications', []);
  }

  // getApplicationDetails(applicationId)
  getApplicationDetails(applicationId) {
    const applications = this._getFromStorage('applications', []);
    const products = this._getFromStorage('products', []);

    const application = applications.find((a) => a.id === applicationId) || null;
    const recommendedProducts = products.filter(
      (p) => Array.isArray(p.application_ids) && p.application_ids.includes(applicationId)
    );

    return { application, recommendedProducts };
  }

  // getApplicationProductFilterOptions(applicationId)
  getApplicationProductFilterOptions(applicationId) {
    const products = this._getFromStorage('products', []);
    const relevant = products.filter(
      (p) => Array.isArray(p.application_ids) && p.application_ids.includes(applicationId)
    );

    const unique = (arr) => Array.from(new Set(arr.filter((v) => v !== undefined && v !== null)));
    const toLabel = (v) => {
      if (!v) return '';
      return String(v)
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
    };

    const technologies = unique(relevant.map((p) => p.technology)).map((v) => ({
      value: v,
      label: toLabel(v)
    }));

    const noises = relevant
      .map((p) => p.noise_level_dba)
      .filter((v) => typeof v === 'number');
    const noiseLevelRange = {
      min: noises.length ? Math.min(...noises) : 0,
      max: noises.length ? Math.max(...noises) : 0,
      unit: 'dba'
    };

    return { technologies, noiseLevelRange };
  }

  // getApplicationRecommendedProducts(applicationId, filters, sortBy)
  getApplicationRecommendedProducts(applicationId, filters, sortBy) {
    const products = this._getFromStorage('products', []);
    const base = products.filter(
      (p) => Array.isArray(p.application_ids) && p.application_ids.includes(applicationId)
    );
    const f = filters || {};

    let items = base;
    if (f.technology) {
      items = items.filter((p) => p.technology === f.technology);
    }
    if (typeof f.maxNoiseLevelDba === 'number') {
      items = items.filter(
        (p) => typeof p.noise_level_dba === 'number' && p.noise_level_dba <= f.maxNoiseLevelDba
      );
    }

    const effSort = sortBy || 'relevance';
    if (effSort === 'noise_asc') {
      items.sort((a, b) => (a.noise_level_dba || 0) - (b.noise_level_dba || 0));
    }

    return items;
  }

  // getCompareList()
  getCompareList() {
    const compareList = this._getOrCreateCompareList();
    const compareListItems = this._getFromStorage('compare_list_items', []);
    const products = this._getFromStorage('products', []);

    const items = compareListItems
      .filter((cli) => cli.compare_list_id === compareList.id)
      .map((cli) => ({
        compareListItem: cli,
        product: products.find((p) => p.id === cli.product_id) || null
      }));

    return { compareList, items };
  }

  // addProductToCompareList(productId)
  addProductToCompareList(productId) {
    const compareList = this._getOrCreateCompareList();
    const compareLists = this._getFromStorage('compare_lists', []);
    const compareListItems = this._getFromStorage('compare_list_items', []);
    const products = this._getFromStorage('products', []);

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return this.getCompareList();
    }

    // avoid duplicates for same product in same compare list
    const exists = compareListItems.some(
      (cli) => cli.compare_list_id === compareList.id && cli.product_id === productId
    );
    if (!exists) {
      const newItem = {
        id: this._generateId('compare_list_item'),
        compare_list_id: compareList.id,
        product_id: product.id,
        product_name: product.name,
        added_at: this._nowIso()
      };
      compareListItems.push(newItem);
      if (!Array.isArray(compareList.item_ids)) compareList.item_ids = [];
      compareList.item_ids.push(newItem.id);

      const idx = compareLists.findIndex((l) => l.id === compareList.id);
      if (idx >= 0) {
        compareLists[idx] = compareList;
      } else {
        compareLists.push(compareList);
      }

      this._saveToStorage('compare_list_items', compareListItems);
      this._saveToStorage('compare_lists', compareLists);
    }

    return this.getCompareList();
  }

  // removeCompareListItem(compareListItemId)
  removeCompareListItem(compareListItemId) {
    const compareList = this._getOrCreateCompareList();
    const compareLists = this._getFromStorage('compare_lists', []);
    let compareListItems = this._getFromStorage('compare_list_items', []);

    const beforeLength = compareListItems.length;
    compareListItems = compareListItems.filter((cli) => cli.id !== compareListItemId);

    if (beforeLength !== compareListItems.length && Array.isArray(compareList.item_ids)) {
      compareList.item_ids = compareList.item_ids.filter((id) => id !== compareListItemId);
    }

    const idx = compareLists.findIndex((l) => l.id === compareList.id);
    if (idx >= 0) compareLists[idx] = compareList;

    this._saveToStorage('compare_list_items', compareListItems);
    this._saveToStorage('compare_lists', compareLists);

    return this.getCompareList();
  }

  // clearCompareList()
  clearCompareList() {
    const compareList = this._getOrCreateCompareList();
    const compareLists = this._getFromStorage('compare_lists', []);
    let compareListItems = this._getFromStorage('compare_list_items', []);

    if (Array.isArray(compareList.item_ids) && compareList.item_ids.length > 0) {
      const idsToRemove = new Set(compareList.item_ids);
      compareListItems = compareListItems.filter((cli) => !idsToRemove.has(cli.id));
      compareList.item_ids = [];

      const idx = compareLists.findIndex((l) => l.id === compareList.id);
      if (idx >= 0) compareLists[idx] = compareList;

      this._saveToStorage('compare_list_items', compareListItems);
      this._saveToStorage('compare_lists', compareLists);
    }

    return compareList;
  }

  // addProductToQuoteList(productId, quantity = 1, notes)
  addProductToQuoteList(productId, quantity, notes) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const quoteList = this._getOrCreateQuoteList();
    const quoteLists = this._getFromStorage('quote_lists', []);
    const quoteListItems = this._getFromStorage('quote_list_items', []);
    const products = this._getFromStorage('products', []);

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return this.getQuoteList();
    }

    const newItem = {
      id: this._generateId('quote_list_item'),
      quote_list_id: quoteList.id,
      product_id: product.id,
      product_name: product.name,
      quantity: qty,
      notes: notes || null
    };

    quoteListItems.push(newItem);
    if (!Array.isArray(quoteList.item_ids)) quoteList.item_ids = [];
    quoteList.item_ids.push(newItem.id);
    quoteList.updated_at = this._nowIso();

    const idx = quoteLists.findIndex((l) => l.id === quoteList.id);
    if (idx >= 0) {
      quoteLists[idx] = quoteList;
    } else {
      quoteLists.push(quoteList);
    }

    this._saveToStorage('quote_list_items', quoteListItems);
    this._saveToStorage('quote_lists', quoteLists);

    return this.getQuoteList();
  }

  // getQuoteList()
  getQuoteList() {
    const quoteLists = this._getFromStorage('quote_lists', []);
    const quoteList = quoteLists.length > 0 ? quoteLists[0] : null;
    const quoteListItems = this._getFromStorage('quote_list_items', []);
    const products = this._getFromStorage('products', []);

    if (!quoteList) {
      return { quoteList: null, items: [] };
    }

    const items = quoteListItems
      .filter((qli) => qli.quote_list_id === quoteList.id)
      .map((qli) => ({
        ...qli,
        product: products.find((p) => p.id === qli.product_id) || null
      }));

    return { quoteList, items };
  }

  // updateQuoteListItemQuantity(quoteListItemId, quantity)
  updateQuoteListItemQuantity(quoteListItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const quoteLists = this._getFromStorage('quote_lists', []);
    const quoteList = quoteLists.length > 0 ? quoteLists[0] : null;
    if (!quoteList) {
      return { quoteList: null, items: [] };
    }
    const quoteListItems = this._getFromStorage('quote_list_items', []);
    const item = quoteListItems.find((qli) => qli.id === quoteListItemId);
    if (!item) {
      return this.getQuoteList();
    }

    item.quantity = qty;
    quoteList.updated_at = this._nowIso();

    const idx = quoteLists.findIndex((l) => l.id === quoteList.id);
    if (idx >= 0) quoteLists[idx] = quoteList;

    this._saveToStorage('quote_list_items', quoteListItems);
    this._saveToStorage('quote_lists', quoteLists);

    return this.getQuoteList();
  }

  // removeQuoteListItem(quoteListItemId)
  removeQuoteListItem(quoteListItemId) {
    const quoteLists = this._getFromStorage('quote_lists', []);
    const quoteList = quoteLists.length > 0 ? quoteLists[0] : null;
    if (!quoteList) {
      return { quoteList: null, items: [] };
    }

    let quoteListItems = this._getFromStorage('quote_list_items', []);
    const beforeLength = quoteListItems.length;
    quoteListItems = quoteListItems.filter((qli) => qli.id !== quoteListItemId);

    if (beforeLength !== quoteListItems.length && Array.isArray(quoteList.item_ids)) {
      quoteList.item_ids = quoteList.item_ids.filter((id) => id !== quoteListItemId);
      quoteList.updated_at = this._nowIso();
    }

    const idx = quoteLists.findIndex((l) => l.id === quoteList.id);
    if (idx >= 0) quoteLists[idx] = quoteList;

    this._saveToStorage('quote_list_items', quoteListItems);
    this._saveToStorage('quote_lists', quoteLists);

    return this.getQuoteList();
  }

  // submitQuoteListRequest(contactName, contactCompany, contactEmail, contactPhone, additionalNotes)
  submitQuoteListRequest(contactName, contactCompany, contactEmail, contactPhone, additionalNotes) {
    const quoteLists = this._getFromStorage('quote_lists', []);
    const quoteList = quoteLists.length > 0 ? quoteLists[0] : null;
    const requests = this._getFromStorage('product_quote_requests', []);

    if (!quoteList) {
      // Still create a request referencing null quote_list_id to keep behaviour predictable
      const req = {
        id: this._generateId('product_quote_request'),
        quote_list_id: null,
        contact_name: contactName,
        contact_company: contactCompany || null,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        additional_notes: additionalNotes || null,
        status: 'submitted',
        created_at: this._nowIso()
      };
      requests.push(req);
      this._saveToStorage('product_quote_requests', requests);
      return req;
    }

    const req = {
      id: this._generateId('product_quote_request'),
      quote_list_id: quoteList.id,
      contact_name: contactName,
      contact_company: contactCompany || null,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      additional_notes: additionalNotes || null,
      status: 'submitted',
      created_at: this._nowIso()
    };

    requests.push(req);
    this._saveToStorage('product_quote_requests', requests);

    return req;
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);

    const items = wishlistItems
      .filter((wi) => wi.wishlist_id === wishlist.id)
      .map((wi) => ({
        ...wi,
        product: products.find((p) => p.id === wi.product_id) || null
      }));

    return { wishlist, items };
  }

  // addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return this.getWishlist();
    }

    const exists = wishlistItems.some(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId
    );

    if (!exists) {
      const newItem = {
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        product_id: product.id,
        product_name: product.name,
        added_at: this._nowIso()
      };
      wishlistItems.push(newItem);
      if (!Array.isArray(wishlist.item_ids)) wishlist.item_ids = [];
      wishlist.item_ids.push(newItem.id);
      wishlist.updated_at = this._nowIso();

      this._saveToStorage('wishlist_items', wishlistItems);
      this._saveToStorage('wishlist', wishlist);
    }

    return this.getWishlist();
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const beforeLength = wishlistItems.length;
    wishlistItems = wishlistItems.filter((wi) => wi.id !== wishlistItemId);

    if (beforeLength !== wishlistItems.length && Array.isArray(wishlist.item_ids)) {
      wishlist.item_ids = wishlist.item_ids.filter((id) => id !== wishlistItemId);
      wishlist.updated_at = this._nowIso();
    }

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveToStorage('wishlist', wishlist);

    return this.getWishlist();
  }

  // getProjectList()
  getProjectList() {
    const projectLists = this._getFromStorage('projects', []);
    const projectList = projectLists.length > 0 ? projectLists[0] : this._getOrCreateProjectList();
    const projectListItems = this._getFromStorage('project_list_items', []);
    const products = this._getFromStorage('products', []);

    const items = projectListItems
      .filter((pli) => pli.project_list_id === projectList.id)
      .map((pli) => ({
        ...pli,
        product: products.find((p) => p.id === pli.product_id) || null
      }));

    return { projectList, items };
  }

  // addProductToProjectList(productId, quantity = 1, notes)
  addProductToProjectList(productId, quantity, notes) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const projectList = this._getOrCreateProjectList();
    const projectLists = this._getFromStorage('projects', []);
    const projectListItems = this._getFromStorage('project_list_items', []);
    const products = this._getFromStorage('products', []);

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return this.getProjectList();
    }

    const newItem = {
      id: this._generateId('project_list_item'),
      project_list_id: projectList.id,
      product_id: product.id,
      product_name: product.name,
      quantity: qty,
      notes: notes || null
    };

    projectListItems.push(newItem);
    if (!Array.isArray(projectList.item_ids)) projectList.item_ids = [];
    projectList.item_ids.push(newItem.id);
    projectList.updated_at = this._nowIso();

    const idx = projectLists.findIndex((l) => l.id === projectList.id);
    if (idx >= 0) {
      projectLists[idx] = projectList;
    } else {
      projectLists.push(projectList);
    }

    this._saveToStorage('project_list_items', projectListItems);
    this._saveToStorage('projects', projectLists);

    return this.getProjectList();
  }

  // updateProjectListItemQuantity(projectListItemId, quantity)
  updateProjectListItemQuantity(projectListItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const projectLists = this._getFromStorage('projects', []);
    const projectList = projectLists.length > 0 ? projectLists[0] : null;
    if (!projectList) {
      return { projectList: null, items: [] };
    }

    const projectListItems = this._getFromStorage('project_list_items', []);
    const item = projectListItems.find((pli) => pli.id === projectListItemId);
    if (!item) {
      return this.getProjectList();
    }

    item.quantity = qty;
    projectList.updated_at = this._nowIso();

    const idx = projectLists.findIndex((l) => l.id === projectList.id);
    if (idx >= 0) projectLists[idx] = projectList;

    this._saveToStorage('project_list_items', projectListItems);
    this._saveToStorage('projects', projectLists);

    return this.getProjectList();
  }

  // removeProjectListItem(projectListItemId)
  removeProjectListItem(projectListItemId) {
    const projectLists = this._getFromStorage('projects', []);
    const projectList = projectLists.length > 0 ? projectLists[0] : null;
    if (!projectList) {
      return { projectList: null, items: [] };
    }

    let projectListItems = this._getFromStorage('project_list_items', []);
    const beforeLength = projectListItems.length;
    projectListItems = projectListItems.filter((pli) => pli.id !== projectListItemId);

    if (beforeLength !== projectListItems.length && Array.isArray(projectList.item_ids)) {
      projectList.item_ids = projectList.item_ids.filter((id) => id !== projectListItemId);
      projectList.updated_at = this._nowIso();
    }

    const idx = projectLists.findIndex((l) => l.id === projectList.id);
    if (idx >= 0) projectLists[idx] = projectList;

    this._saveToStorage('project_list_items', projectListItems);
    this._saveToStorage('projects', projectLists);

    return this.getProjectList();
  }

  // transferProjectItemsToQuoteList(projectListItemIds)
  transferProjectItemsToQuoteList(projectListItemIds) {
    const ids = Array.isArray(projectListItemIds) ? new Set(projectListItemIds) : new Set();
    const projectListItems = this._getFromStorage('project_list_items', []);
    const itemsToTransfer = projectListItems.filter((pli) => ids.has(pli.id));

    const quoteList = this._getOrCreateQuoteList();
    const quoteLists = this._getFromStorage('quote_lists', []);
    const quoteListItems = this._getFromStorage('quote_list_items', []);

    itemsToTransfer.forEach((pli) => {
      const newItem = {
        id: this._generateId('quote_list_item'),
        quote_list_id: quoteList.id,
        product_id: pli.product_id,
        product_name: pli.product_name,
        quantity: typeof pli.quantity === 'number' && pli.quantity > 0 ? pli.quantity : 1,
        notes: pli.notes || null
      };
      quoteListItems.push(newItem);
      if (!Array.isArray(quoteList.item_ids)) quoteList.item_ids = [];
      quoteList.item_ids.push(newItem.id);
    });

    quoteList.updated_at = this._nowIso();

    const idx = quoteLists.findIndex((l) => l.id === quoteList.id);
    if (idx >= 0) quoteLists[idx] = quoteList;
    else quoteLists.push(quoteList);

    this._saveToStorage('quote_list_items', quoteListItems);
    this._saveToStorage('quote_lists', quoteLists);

    return { quoteList, quoteListItems };
  }

  // transferProjectItemsToCart(projectListItemIds)
  transferProjectItemsToCart(projectListItemIds) {
    const ids = Array.isArray(projectListItemIds) ? new Set(projectListItemIds) : new Set();
    const projectListItems = this._getFromStorage('project_list_items', []);
    const products = this._getFromStorage('products', []);

    const itemsToTransfer = projectListItems.filter((pli) => ids.has(pli.id));

    itemsToTransfer.forEach((pli) => {
      const product = products.find((p) => p.id === pli.product_id);
      if (!product) return;
      const qty = typeof pli.quantity === 'number' && pli.quantity > 0 ? pli.quantity : 1;
      this.addProductToCart(product.id, qty, null);
    });

    return this.getCart();
  }

  // searchPartnerLocations(country, postalCode, radiusKm, requireAuthorizedDistributor = false, requireServiceCenter = false)
  searchPartnerLocations(country, postalCode, radiusKm, requireAuthorizedDistributor, requireServiceCenter) {
    const radius = typeof radiusKm === 'number' && radiusKm > 0 ? radiusKm : 100;
    const reqAD = typeof requireAuthorizedDistributor === 'boolean' ? requireAuthorizedDistributor : false;
    const reqSC = typeof requireServiceCenter === 'boolean' ? requireServiceCenter : false;

    let locations = this._getFromStorage('partner_locations', []);

    locations = locations.filter((loc) => loc.country === country);

    if (reqAD) {
      locations = locations.filter((loc) => !!loc.is_authorized_distributor);
    }
    if (reqSC) {
      locations = locations.filter((loc) => !!loc.is_service_center);
    }

    // Distances: we leave any precomputed values, do not override.
    locations = this._calculateDistancesForPartnerLocations(locations, null);

    locations = locations.filter((loc) => {
      if (typeof loc.distance_km === 'number') {
        return loc.distance_km <= radius;
      }
      return true;
    });

    locations.sort((a, b) => {
      const da = typeof a.distance_km === 'number' ? a.distance_km : Number.POSITIVE_INFINITY;
      const db = typeof b.distance_km === 'number' ? b.distance_km : Number.POSITIVE_INFINITY;
      return da - db;
    });

    return locations;
  }

  // getPartnerLocationDetails(partnerLocationId)
  getPartnerLocationDetails(partnerLocationId) {
    const locations = this._getFromStorage('partner_locations', []);
    const location = locations.find((loc) => loc.id === partnerLocationId) || null;

    // Instrumentation for task completion tracking (task_8)
    try {
      if (location) {
        const task8Value = {
          id: location.id,
          country: location.country,
          postalCode: location.postal_code,
          distance_km: location.distance_km,
          is_authorized_distributor: location.is_authorized_distributor,
          is_service_center: location.is_service_center,
          viewedAt: this._nowIso()
        };
        localStorage.setItem('task8_viewedPartnerLocation', JSON.stringify(task8Value));
      }
    } catch (e) {
      console.error('Instrumentation error (task_8):', e);
    }

    return location;
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      headline: '',
      history: '',
      mission: '',
      expertise: '',
      certifications: [],
      industriesServed: [],
      sustainabilityInitiatives: ''
    };
  }

  // getContactInfo()
  getContactInfo() {
    const stored = this._getFromStorage('contact_info', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      addressLine1: '',
      addressLine2: '',
      city: '',
      stateRegion: '',
      postalCode: '',
      country: '',
      phoneMain: '',
      emailSales: '',
      emailSupport: ''
    };
  }

  // sendContactMessage(topic, name, company, email, phone, message)
  sendContactMessage(topic, name, company, email, phone, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const msg = {
      id: this._generateId('contact_message'),
      topic,
      name,
      company: company || null,
      email,
      phone: phone || null,
      message,
      created_at: this._nowIso()
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return { success: true, message: 'Message submitted' };
  }

  // getLegalAndPrivacyContent()
  getLegalAndPrivacyContent() {
    const stored = this._getFromStorage('legal_privacy_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      privacyPolicy: '',
      termsOfUse: '',
      cookiePolicy: ''
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
