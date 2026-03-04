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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Core tables/entities
    const tables = [
      'users',
      'categories',
      'products',
      'product_documents',
      'carts',
      'cart_items',
      'quote_requests',
      'installers',
      'installer_services',
      'warranty_registrations',
      'articles',
      'article_topics',
      'newsletter_subscriptions',
      'newsletter_topics',
      // additional supporting tables
      'contact_requests',
      'notifications'
    ];

    tables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Config/overview objects (stored as JSON objects)
    const objectKeys = [
      'homepage_highlights',
      'commercial_solutions_overview',
      'quote_form_options',
      'installer_locator_options',
      'support_overview',
      'warranty_form_options',
      'resources_overview',
      'article_filter_options',
      'about_page_content',
      'contact_page_content',
      'policy_documents'
    ];

    objectKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('current_cart_id')) {
      localStorage.setItem('current_cart_id', '');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
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

  // ---------------------- Private helpers ----------------------

  // Cart helpers
  _getOrCreateCart() {
    const carts = this._getFromStorage('carts', []);
    let currentCartId = localStorage.getItem('current_cart_id') || '';
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId) || null;
    }

    if (!cart) {
      // create new cart
      cart = {
        id: this._generateId('cart'),
        items: [], // array of cart_item IDs
        currency: 'usd',
        subtotal: 0,
        total: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const items = cartItems.filter((ci) => ci.cart_id === cart.id);
    let subtotal = 0;
    items.forEach((item) => {
      const line = (item.unit_price || 0) * (item.quantity || 0);
      item.line_total = line;
      subtotal += line;
    });

    cart.subtotal = subtotal;
    cart.total = subtotal; // no tax/shipping modeled
    cart.updated_at = new Date().toISOString();

    // persist cart and cart items
    let carts = this._getFromStorage('carts', []);
    carts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);

    return cart;
  }

  // Product filtering/sorting helpers
  _validateProductFilters(filters) {
    const f = filters || {};
    const out = {};
    const numFields = [
      'min_price',
      'max_price',
      'min_rating',
      'min_power_output_w',
      'max_power_output_w',
      'min_system_size_kw',
      'max_system_size_kw',
      'min_rated_power_kw',
      'max_rated_power_kw',
      'min_efficiency_percent',
      'max_efficiency_percent'
    ];
    numFields.forEach((k) => {
      if (f[k] !== undefined && f[k] !== null && f[k] !== '') {
        const n = Number(f[k]);
        if (!Number.isNaN(n)) out[k] = n;
      }
    });

    if (typeof f.system_type === 'string') out.system_type = f.system_type;

    if (Array.isArray(f.product_types)) {
      out.product_types = f.product_types.filter((v) => typeof v === 'string');
    }

    if (typeof f.is_roof_mount_kit === 'boolean') out.is_roof_mount_kit = f.is_roof_mount_kit;
    if (typeof f.is_parallel_kit === 'boolean') out.is_parallel_kit = f.is_parallel_kit;

    if (Array.isArray(f.category_ids)) {
      out.category_ids = f.category_ids.filter((v) => typeof v === 'string');
    }

    return out;
  }

  _applyProductSorting(products, sort) {
    const s = sort || {};
    const sortBy = s.sort_by || 'name';
    const dir = (s.sort_direction || 'asc').toLowerCase() === 'desc' ? -1 : 1;
    const sorted = [...products];

    const getter = (p) => {
      switch (sortBy) {
        case 'price':
          return p.price || 0;
        case 'rating':
          return p.average_rating || 0;
        case 'power_output_w':
          return p.power_output_w || 0;
        case 'rated_power_kw':
          return p.rated_power_kw || 0;
        case 'max_efficiency_percent':
          return p.max_efficiency_percent || 0;
        case 'system_size_kw':
          return p.system_size_kw || 0;
        case 'created_at':
          return p.created_at ? new Date(p.created_at).getTime() : 0;
        default:
          return (p.name || '').toLowerCase();
      }
    };

    sorted.sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return sorted;
  }

  // Installer helpers
  _computeInstallerDistances(searchZip, installers) {
    // Minimal implementation: 0 miles if ZIP matches, otherwise large value
    const updated = installers.map((inst) => {
      const copy = { ...inst };
      if (copy.zip && searchZip && copy.zip === searchZip) {
        copy.distance_from_search = 0;
      } else if (typeof copy.distance_from_search !== 'number') {
        copy.distance_from_search = 999999;
      }
      return copy;
    });

    // Persist updated distances
    this._saveToStorage('installers', updated);
    return updated;
  }

  // Notification helper (simulated email/notification)
  _sendNotificationEmail(type, payload) {
    const notifications = this._getFromStorage('notifications', []);
    const entry = {
      id: this._generateId('notif'),
      type,
      payload,
      created_at: new Date().toISOString()
    };
    notifications.push(entry);
    this._saveToStorage('notifications', notifications);
    return true;
  }

  // Generic helper: resolve foreign key by *_id or *Id naming into property without suffix
  _resolveForeignKeysForItems(items, fkConfigs) {
    // fkConfigs: [{ field: 'category_id', collectionKey: 'categories', resolvedName: 'category' }, ...]
    if (!Array.isArray(items) || !Array.isArray(fkConfigs)) return items;
    const cache = {};

    const getCollection = (key) => {
      if (!cache[key]) cache[key] = this._getFromStorage(key, []);
      return cache[key];
    };

    return items.map((item) => {
      const enriched = { ...item };
      fkConfigs.forEach((cfg) => {
        const idVal = item[cfg.field];
        if (idVal !== undefined && idVal !== null) {
          const coll = getCollection(cfg.collectionKey);
          enriched[cfg.resolvedName] = coll.find((x) => x.id === idVal) || null;
        }
      });
      return enriched;
    });
  }

  // ---------------------- Core interface implementations ----------------------

  // ----- Navigation & homepage -----

  getMainNavigationCategories() {
    let categories = this._getFromStorage('categories', []);
    categories = categories.slice().sort((a, b) => {
      const ao = a.display_order ?? 0;
      const bo = b.display_order ?? 0;
      if (ao !== bo) return ao - bo;
      const an = (a.name || '').toLowerCase();
      const bn = (b.name || '').toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    return categories;
  }

  getHomepageHighlights() {
    const stored = this._getFromStorage('homepage_highlights', {});
    const categories = this.getMainNavigationCategories();
    const products = this._getFromStorage('products', []).filter((p) => p.status === 'active');

    // Featured products: top 4 by rating
    const featured_products = this._applyProductSorting(products, { sort_by: 'rating', sort_direction: 'desc' }).slice(0, 4);

    // Enrich products with category
    const featured_products_enriched = this._resolveForeignKeysForItems(featured_products, [
      { field: 'category_id', collectionKey: 'categories', resolvedName: 'category' }
    ]);

    // Derive residential/commercial highlights if not explicitly stored
    let featured_residential_solution = stored.featured_residential_solution;
    if (!featured_residential_solution) {
      const residentialBundle = products.find(
        (p) => p.product_type === 'system_bundle' && p.system_type === 'residential'
      );
      if (residentialBundle) {
        const cat = categories.find((c) => c.id === residentialBundle.category_id) || null;
        featured_residential_solution = {
          title: residentialBundle.name,
          description: residentialBundle.spec_summary || residentialBundle.description || '',
          primary_category_id: residentialBundle.category_id,
          primary_category_name: cat ? cat.name : ''
        };
      }
    }

    let featured_commercial_solution = stored.featured_commercial_solution;
    if (!featured_commercial_solution) {
      const commercialBundle = products.find(
        (p) => p.product_type === 'system_bundle' && p.system_type === 'commercial'
      );
      if (commercialBundle) {
        featured_commercial_solution = {
          title: commercialBundle.name,
          description: commercialBundle.spec_summary || commercialBundle.description || '',
          highlight_text: 'High-efficiency commercial solar solutions'
        };
      }
    }

    return {
      main_categories: categories,
      featured_products: featured_products_enriched,
      featured_residential_solution: featured_residential_solution || null,
      featured_commercial_solution: featured_commercial_solution || null
    };
  }

  // ----- Category listing & filtering -----

  getCategoryFilterOptions(category_id) {
    const products = this._getFromStorage('products', []).filter(
      (p) => p.category_id === category_id && p.status === 'active'
    );

    const priceVals = products.map((p) => p.price).filter((v) => typeof v === 'number');
    const powerVals = products.map((p) => p.power_output_w).filter((v) => typeof v === 'number');
    const sysSizeVals = products.map((p) => p.system_size_kw).filter((v) => typeof v === 'number');
    const ratedPowerVals = products.map((p) => p.rated_power_kw).filter((v) => typeof v === 'number');
    const effVals = products.map((p) => p.max_efficiency_percent).filter((v) => typeof v === 'number');
    const ratingVals = products.map((p) => p.average_rating).filter((v) => typeof v === 'number');

    const system_types = Array.from(
      new Set(products.map((p) => p.system_type).filter((v) => typeof v === 'string'))
    );

    const product_types = Array.from(
      new Set(products.map((p) => p.product_type).filter((v) => typeof v === 'string'))
    );

    const is_roof_mount_kit_available = products.some((p) => p.is_roof_mount_kit === true);
    const is_parallel_kit_available = products.some((p) => p.is_parallel_kit === true);

    const makeRange = (vals) => ({
      min: vals.length ? Math.min(...vals) : null,
      max: vals.length ? Math.max(...vals) : null
    });

    return {
      price: {
        ...makeRange(priceVals),
        currency: 'usd'
      },
      power_output_w: makeRange(powerVals),
      system_size_kw: makeRange(sysSizeVals),
      rated_power_kw: makeRange(ratedPowerVals),
      efficiency_percent: makeRange(effVals),
      rating: makeRange(ratingVals),
      system_types,
      product_types,
      flags: {
        is_roof_mount_kit_available,
        is_parallel_kit_available
      }
    };
  }

  listCategoryProducts(category_id, filters = {}, sort = {}, page = 1, page_size = 20) {
    const allProducts = this._getFromStorage('products', []).filter(
      (p) => p.category_id === category_id && p.status === 'active'
    );

    const validatedFilters = this._validateProductFilters(filters);

    let products = allProducts.filter((p) => {
      if (validatedFilters.min_price !== undefined && p.price < validatedFilters.min_price) return false;
      if (validatedFilters.max_price !== undefined && p.price > validatedFilters.max_price) return false;

      if (validatedFilters.min_rating !== undefined) {
        const r = p.average_rating || 0;
        if (r < validatedFilters.min_rating) return false;
      }

      if (validatedFilters.min_power_output_w !== undefined) {
        const v = p.power_output_w || 0;
        if (v < validatedFilters.min_power_output_w) return false;
      }
      if (validatedFilters.max_power_output_w !== undefined) {
        const v = p.power_output_w || 0;
        if (v > validatedFilters.max_power_output_w) return false;
      }

      if (validatedFilters.min_system_size_kw !== undefined) {
        const v = p.system_size_kw || 0;
        if (v < validatedFilters.min_system_size_kw) return false;
      }
      if (validatedFilters.max_system_size_kw !== undefined) {
        const v = p.system_size_kw || 0;
        if (v > validatedFilters.max_system_size_kw) return false;
      }

      if (validatedFilters.min_rated_power_kw !== undefined) {
        const v = p.rated_power_kw || 0;
        if (v < validatedFilters.min_rated_power_kw) return false;
      }
      if (validatedFilters.max_rated_power_kw !== undefined) {
        const v = p.rated_power_kw || 0;
        if (v > validatedFilters.max_rated_power_kw) return false;
      }

      if (validatedFilters.min_efficiency_percent !== undefined) {
        const v = p.max_efficiency_percent || 0;
        if (v < validatedFilters.min_efficiency_percent) return false;
      }
      if (validatedFilters.max_efficiency_percent !== undefined) {
        const v = p.max_efficiency_percent || 0;
        if (v > validatedFilters.max_efficiency_percent) return false;
      }

      if (validatedFilters.system_type && p.system_type !== validatedFilters.system_type) return false;

      if (Array.isArray(validatedFilters.product_types) && validatedFilters.product_types.length) {
        if (!validatedFilters.product_types.includes(p.product_type)) return false;
      }

      if (validatedFilters.is_roof_mount_kit === true && p.is_roof_mount_kit !== true) return false;
      if (validatedFilters.is_parallel_kit === true && p.is_parallel_kit !== true) return false;

      return true;
    });

    products = this._applyProductSorting(products, sort);

    const total_count = products.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    let paged = products.slice(start, end);

    // Enrich with category
    paged = this._resolveForeignKeysForItems(paged, [
      { field: 'category_id', collectionKey: 'categories', resolvedName: 'category' }
    ]);

    return {
      products: paged,
      total_count,
      page,
      page_size,
      applied_filters: validatedFilters,
      sort: {
        sort_by: sort.sort_by || 'name',
        sort_direction: sort.sort_direction || 'asc'
      }
    };
  }

  // ----- Product search -----

  getSearchFilterOptions(query) {
    const { products } = this._searchProductsInternal(query, {}, { sort_by: 'relevance', sort_direction: 'asc' });

    const priceVals = products.map((p) => p.price).filter((v) => typeof v === 'number');
    const effVals = products.map((p) => p.max_efficiency_percent).filter((v) => typeof v === 'number');
    const ratedPowerVals = products.map((p) => p.rated_power_kw).filter((v) => typeof v === 'number');
    const ratingVals = products.map((p) => p.average_rating).filter((v) => typeof v === 'number');

    const makeRange = (vals) => ({
      min: vals.length ? Math.min(...vals) : null,
      max: vals.length ? Math.max(...vals) : null
    });

    const categoriesMap = new Map();
    const allCategories = this._getFromStorage('categories', []);
    products.forEach((p) => {
      const cat = allCategories.find((c) => c.id === p.category_id);
      if (cat) categoriesMap.set(cat.id, cat);
    });

    return {
      price: {
        ...makeRange(priceVals),
        currency: 'usd'
      },
      efficiency_percent: makeRange(effVals),
      rated_power_kw: makeRange(ratedPowerVals),
      rating: makeRange(ratingVals),
      categories: Array.from(categoriesMap.values())
    };
  }

  _searchProductsInternal(query, filters = {}, sort = {}) {
    const allProducts = this._getFromStorage('products', []).filter((p) => p.status === 'active');
    const q = (query || '').trim().toLowerCase();

    let products = allProducts.filter((p) => {
      if (!q) return true;
      const haystackParts = [p.name, p.model_number, p.sku, p.description];
      if (Array.isArray(p.tags)) haystackParts.push(p.tags.join(' '));
      const haystack = haystackParts
        .filter((x) => x)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    const validatedFilters = this._validateProductFilters(filters);

    products = products.filter((p) => {
      if (validatedFilters.min_price !== undefined && p.price < validatedFilters.min_price) return false;
      if (validatedFilters.max_price !== undefined && p.price > validatedFilters.max_price) return false;

      if (validatedFilters.min_rating !== undefined) {
        const r = p.average_rating || 0;
        if (r < validatedFilters.min_rating) return false;
      }

      if (validatedFilters.min_efficiency_percent !== undefined) {
        const v = p.max_efficiency_percent || 0;
        if (v < validatedFilters.min_efficiency_percent) return false;
      }
      if (validatedFilters.max_efficiency_percent !== undefined) {
        const v = p.max_efficiency_percent || 0;
        if (v > validatedFilters.max_efficiency_percent) return false;
      }

      if (validatedFilters.min_rated_power_kw !== undefined) {
        const v = p.rated_power_kw || 0;
        if (v < validatedFilters.min_rated_power_kw) return false;
      }
      if (validatedFilters.max_rated_power_kw !== undefined) {
        const v = p.rated_power_kw || 0;
        if (v > validatedFilters.max_rated_power_kw) return false;
      }

      if (Array.isArray(validatedFilters.category_ids) && validatedFilters.category_ids.length) {
        if (!validatedFilters.category_ids.includes(p.category_id)) return false;
      }

      return true;
    });

    const sorted = this._applyProductSorting(products, sort);

    const s = sort || {};
    return {
      products: sorted,
      applied_filters: validatedFilters,
      sort: {
        sort_by: s.sort_by || 'relevance',
        sort_direction: s.sort_direction || 'asc'
      }
    };
  }

  searchProducts(query, filters = {}, sort = {}, page = 1, page_size = 20) {
    const { products, applied_filters, sort: appliedSort } = this._searchProductsInternal(query, filters, sort);

    const total_count = products.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    let paged = products.slice(start, end);

    // Enrich with category
    paged = this._resolveForeignKeysForItems(paged, [
      { field: 'category_id', collectionKey: 'categories', resolvedName: 'category' }
    ]);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task6_searchParams',
        JSON.stringify({
          "query": query,
          "filters": applied_filters,
          "sort": appliedSort,
          "timestamp": new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      products: paged,
      total_count,
      page,
      page_size,
      applied_filters,
      sort: appliedSort
    };
  }

  // ----- Product details -----

  getProductDetails(product_id) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === product_id) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        documents: [],
        recommended_accessories: []
      };
    }

    const categories = this._getFromStorage('categories', []);
    const category = categories.find((c) => c.id === product.category_id) || null;

    const product_documents = this._getFromStorage('product_documents', []).filter(
      (d) => d.product_id === product.id
    );

    const documents = this._resolveForeignKeysForItems(product_documents, [
      { field: 'product_id', collectionKey: 'products', resolvedName: 'product' }
    ]);

    let recommended_accessories = [];
    if (Array.isArray(product.recommended_accessory_ids) && product.recommended_accessory_ids.length) {
      const allProducts = this._getFromStorage('products', []);
      recommended_accessories = allProducts.filter((p) => product.recommended_accessory_ids.includes(p.id));
      recommended_accessories = this._resolveForeignKeysForItems(recommended_accessories, [
        { field: 'category_id', collectionKey: 'categories', resolvedName: 'category' }
      ]);
    }

    const enrichedProduct = this._resolveForeignKeysForItems([product], [
      { field: 'category_id', collectionKey: 'categories', resolvedName: 'category' }
    ])[0];

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task6_viewedProductDetails',
        JSON.stringify({
          "product_id": product_id,
          "model_number": product.model_number || null,
          "name": product.name || "",
          "timestamp": new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      product: enrichedProduct,
      category,
      documents,
      recommended_accessories
    };
  }

  // ----- Cart operations -----

  addToCart(product_id, quantity = 1) {
    const qty = Number(quantity) || 1;
    if (qty <= 0) {
      return {
        success: false,
        cart_id: null,
        message: 'Quantity must be greater than zero.',
        cart: null
      };
    }

    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === product_id && p.status === 'active');
    if (!product) {
      return {
        success: false,
        cart_id: null,
        message: 'Product not found or inactive.',
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    // Look for existing cart item for this product
    let cartItem = cartItems.find((ci) => ci.cart_id === cart.id && ci.product_id === product.id);

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.added_at = cartItem.added_at || new Date().toISOString();
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        quantity: qty,
        unit_price: product.price,
        currency: 'usd',
        line_total: product.price * qty,
        added_at: new Date().toISOString()
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      cart.items.push(cartItem.id);
    }

    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart);

    const responseCart = this._buildCartResponse(updatedCart);

    return {
      success: true,
      cart_id: updatedCart.id,
      message: 'Product added to cart.',
      cart: responseCart
    };
  }

  _buildCartResponse(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const itemIds = Array.isArray(cart.items) ? cart.items : [];
    const items = itemIds
      .map((id) => cartItems.find((ci) => ci.id === id && ci.cart_id === cart.id))
      .filter((ci) => !!ci)
      .map((ci) => {
        const product = products.find((p) => p.id === ci.product_id) || null;
        return {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: product ? product.name : '',
          product_thumbnail_url: product ? product.thumbnail_url || product.image_url || '' : '',
          unit_price: ci.unit_price,
          quantity: ci.quantity,
          line_total: ci.line_total,
          product
        };
      });

    return {
      id: cart.id,
      currency: cart.currency,
      subtotal: cart.subtotal,
      total: cart.total,
      items
    };
  }

  getCart() {
    const carts = this._getFromStorage('carts', []);
    const currentCartId = localStorage.getItem('current_cart_id') || '';
    let cart = carts.find((c) => c.id === currentCartId) || null;

    if (!cart) {
      // No cart yet; create an empty one for this session
      cart = this._getOrCreateCart();
    }

    return this._buildCartResponse(cart);
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    const qty = Number(quantity) || 0;
    let cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);

    const cartItemIndex = cartItems.findIndex((ci) => ci.id === cart_item_id);
    if (cartItemIndex === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null
      };
    }

    const cartItem = cartItems[cartItemIndex];
    const cart = carts.find((c) => c.id === cartItem.cart_id);
    if (!cart) {
      return {
        success: false,
        message: 'Associated cart not found.',
        cart: null
      };
    }

    if (qty <= 0) {
      // Remove the item entirely
      cartItems.splice(cartItemIndex, 1);
      cart.items = (cart.items || []).filter((id) => id !== cart_item_id);
    } else {
      cartItem.quantity = qty;
      cartItem.line_total = cartItem.unit_price * qty;
      cartItems[cartItemIndex] = cartItem;
    }

    this._saveToStorage('cart_items', cartItems);

    // Persist updated cart
    let updatedCarts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', updatedCarts);

    const updatedCart = this._recalculateCartTotals(cart);
    const responseCart = this._buildCartResponse(updatedCart);

    return {
      success: true,
      message: 'Cart updated.',
      cart: responseCart
    };
  }

  removeCartItem(cart_item_id) {
    let cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);
    const cartItem = cartItems.find((ci) => ci.id === cart_item_id);

    if (!cartItem) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null
      };
    }

    const cart = carts.find((c) => c.id === cartItem.cart_id);
    if (!cart) {
      return {
        success: false,
        message: 'Associated cart not found.',
        cart: null
      };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cart_item_id);
    cart.items = (cart.items || []).filter((id) => id !== cart_item_id);

    this._saveToStorage('cart_items', cartItems);
    let updatedCarts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', updatedCarts);

    const updatedCart = this._recalculateCartTotals(cart);
    const responseCart = this._buildCartResponse(updatedCart);

    return {
      success: true,
      message: 'Cart item removed.',
      cart: responseCart
    };
  }

  clearCart() {
    const carts = this._getFromStorage('carts', []);
    let cartItems = this._getFromStorage('cart_items', []);
    const currentCartId = localStorage.getItem('current_cart_id') || '';
    const cart = carts.find((c) => c.id === currentCartId) || null;

    if (!cart) {
      return {
        success: true,
        message: 'Cart already empty.'
      };
    }

    const itemIds = Array.isArray(cart.items) ? cart.items : [];
    cartItems = cartItems.filter((ci) => ci.cart_id !== cart.id);
    cart.items = [];
    cart.subtotal = 0;
    cart.total = 0;
    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart_items', cartItems);
    const updatedCarts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', updatedCarts);

    return {
      success: true,
      message: 'Cart cleared.'
    };
  }

  // ----- Commercial solutions & quote requests -----

  getCommercialSolutionsOverview() {
    const stored = this._getFromStorage('commercial_solutions_overview', {});
    let solutions = Array.isArray(stored.solutions) ? stored.solutions : [];
    const featured_case_studies = Array.isArray(stored.featured_case_studies)
      ? stored.featured_case_studies
      : [];

    // Provide sensible defaults if no commercial solutions have been configured
    if (!solutions.length) {
      const products = this._getFromStorage('products', []).filter(
        (p) => p.product_type === 'system_bundle' && p.system_type === 'commercial'
      );

      if (products.length) {
        solutions = products.map((p) => ({
          id: p.id,
          name: p.name || 'Commercial solar solution',
          description: p.spec_summary || p.description || ''
        }));
      } else {
        solutions = [
          {
            id: 'default_commercial_rooftop',
            name: 'Commercial rooftop solar solutions',
            description: 'Pre-engineered commercial rooftop solar packages for businesses.'
          }
        ];
      }
    }

    return {
      solutions,
      featured_case_studies
    };
  }

  getQuoteFormOptions() {
    const stored = this._getFromStorage('quote_form_options', {});

    const project_types = Array.isArray(stored.project_types)
      ? stored.project_types
      : ['rooftop_solar', 'ground_mount_solar', 'carport_solar', 'battery_storage', 'ev_charging', 'microgrid', 'other'];

    const states = Array.isArray(stored.states)
      ? stored.states
      : [
          { code: 'CA', name: 'California' },
          { code: 'NY', name: 'New York' },
          { code: 'TX', name: 'Texas' }
        ];

    const preferred_contact_methods = Array.isArray(stored.preferred_contact_methods)
      ? stored.preferred_contact_methods
      : ['phone', 'email'];

    return {
      project_types,
      states,
      preferred_contact_methods
    };
  }

  submitQuoteRequest(
    project_type,
    system_size_kw,
    location_zip,
    location_state,
    target_installation_date,
    contact_name,
    company,
    phone,
    email,
    preferred_contact_method,
    comments
  ) {
    const quote_requests = this._getFromStorage('quote_requests', []);

    const qr = {
      id: this._generateId('quote'),
      project_type,
      system_size_kw,
      location_zip,
      location_state,
      target_installation_date: target_installation_date || null,
      contact_name,
      company,
      phone,
      email,
      preferred_contact_method,
      comments: comments || '',
      submitted_at: new Date().toISOString()
    };

    quote_requests.push(qr);
    this._saveToStorage('quote_requests', quote_requests);

    this._sendNotificationEmail('quote_request', qr);

    return {
      success: true,
      message: 'Quote request submitted.',
      quote_request: qr
    };
  }

  // ----- Installer locator -----

  getInstallerLocatorOptions() {
    const stored = this._getFromStorage('installer_locator_options', {});

    const service_types = Array.isArray(stored.service_types)
      ? stored.service_types
      : ['solar_installation', 'ev_charging', 'battery_storage', 'maintenance', 'consulting', 'other'];

    const default_radius_miles = typeof stored.default_radius_miles === 'number' ? stored.default_radius_miles : 25;

    const radius_options_miles = Array.isArray(stored.radius_options_miles)
      ? stored.radius_options_miles
      : [10, 25, 50, 100];

    const sort_options = Array.isArray(stored.sort_options)
      ? stored.sort_options
      : [
          { value: 'distance', label: 'Distance: nearest first' },
          { value: 'name', label: 'Name: A to Z' }
        ];

    return {
      service_types,
      default_radius_miles,
      radius_options_miles,
      sort_options
    };
  }

  searchInstallers(zip, radius_miles = 25, services = [], sort_by = 'distance') {
    let installers = this._getFromStorage('installers', []);

    installers = this._computeInstallerDistances(zip, installers);

    let filtered = installers.filter((inst) => {
      if (typeof inst.distance_from_search === 'number' && inst.distance_from_search > radius_miles) {
        return false;
      }

      if (Array.isArray(services) && services.length) {
        const offered = Array.isArray(inst.services_offered) ? inst.services_offered : [];
        // Require installers to offer all requested services (e.g., must include ev_charging when requested)
        const matches = services.every((s) => offered.includes(s));
        if (!matches) return false;
      }

      return true;
    });

    if (sort_by === 'name') {
      filtered.sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    } else {
      // default sort by distance
      filtered.sort((a, b) => {
        const ad = typeof a.distance_from_search === 'number' ? a.distance_from_search : 999999;
        const bd = typeof b.distance_from_search === 'number' ? b.distance_from_search : 999999;
        if (ad < bd) return -1;
        if (ad > bd) return 1;
        return 0;
      });
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task5_installerSearchCriteria',
        JSON.stringify({
          "zip": zip,
          "radius_miles": radius_miles,
          "services": Array.isArray(services) ? services : [],
          "sort_by": sort_by,
          "timestamp": new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      installers: filtered
    };
  }

  getInstallerDetails(installer_id) {
    const installers = this._getFromStorage('installers', []);
    const installer = installers.find((i) => i.id === installer_id) || null;
    return {
      installer
    };
  }

  startInstallerContact(installer_id, contact_method) {
    const installers = this._getFromStorage('installers', []);
    const installer = installers.find((i) => i.id === installer_id) || null;

    if (!installer) {
      return {
        success: false,
        message: 'Installer not found.'
      };
    }

    const method = contact_method || installer.primary_cta_type || 'contact_form';

    this._sendNotificationEmail('installer_contact', {
      installer_id,
      method,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Installer contact initiated.'
    };
  }

  // ----- Support & warranty -----

  getSupportOverview() {
    const stored = this._getFromStorage('support_overview', {});
    const intro_text = typeof stored.intro_text === 'string' ? stored.intro_text : '';
    const support_areas = Array.isArray(stored.support_areas) ? stored.support_areas : [];

    return {
      intro_text,
      support_areas
    };
  }

  getWarrantyFormOptions() {
    const stored = this._getFromStorage('warranty_form_options', {});

    const product_types = Array.isArray(stored.product_types)
      ? stored.product_types
      : ['inverter', 'solar_panel', 'generator', 'system_bundle', 'mounting_kit', 'accessory', 'other'];

    const installation_types = Array.isArray(stored.installation_types)
      ? stored.installation_types
      : [
          'residential_rooftop',
          'residential_ground_mount',
          'commercial_rooftop',
          'commercial_ground_mount',
          'off_grid',
          'other'
        ];

    const states = Array.isArray(stored.states)
      ? stored.states
      : [
          { code: 'CA', name: 'California' },
          { code: 'NY', name: 'New York' },
          { code: 'TX', name: 'Texas' }
        ];

    return {
      product_types,
      installation_types,
      states
    };
  }

  submitWarrantyRegistration(
    product_type,
    model,
    serial_number,
    purchase_date,
    purchase_price,
    currency = 'usd',
    installation_type,
    owner_name,
    owner_address_line1,
    owner_address_line2,
    owner_city,
    owner_state,
    owner_zip,
    owner_phone,
    owner_email,
    terms_accepted,
    notes
  ) {
    const warranty_registrations = this._getFromStorage('warranty_registrations', []);

    const wr = {
      id: this._generateId('warranty'),
      product_type,
      model,
      serial_number,
      purchase_date,
      purchase_price,
      currency,
      installation_type,
      owner_name,
      owner_address_line1,
      owner_address_line2: owner_address_line2 || '',
      owner_city,
      owner_state,
      owner_zip,
      owner_phone,
      owner_email,
      terms_accepted: !!terms_accepted,
      submitted_at: new Date().toISOString(),
      notes: notes || ''
    };

    warranty_registrations.push(wr);
    this._saveToStorage('warranty_registrations', warranty_registrations);

    this._sendNotificationEmail('warranty_registration', wr);

    return {
      success: true,
      message: 'Warranty registration submitted.',
      warranty_registration: wr
    };
  }

  // ----- Resources, articles, newsletter -----

  getResourcesOverview() {
    const stored = this._getFromStorage('resources_overview', {});
    const intro_text = typeof stored.intro_text === 'string' ? stored.intro_text : '';
    let featured_articles = Array.isArray(stored.featured_articles) ? stored.featured_articles : [];

    if (!featured_articles.length) {
      const allArticles = this._getFromStorage('articles', []);
      featured_articles = allArticles
        .slice()
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
        .slice(0, 3);
    }

    const resource_categories = Array.isArray(stored.resource_categories) ? stored.resource_categories : [];

    return {
      intro_text,
      featured_articles,
      resource_categories
    };
  }

  getArticleFilterOptions() {
    const stored = this._getFromStorage('article_filter_options', {});

    let topics = Array.isArray(stored.topics) ? stored.topics : [];
    if (!topics.length) {
      const topicEnums = this._getFromStorage('article_topics', []);
      topics = topicEnums.map((t) => t.topic).filter((v) => typeof v === 'string');
    }

    let date_presets = Array.isArray(stored.date_presets) ? stored.date_presets : [];
    if (!date_presets.length) {
      date_presets = [
        {
          id: 'last_12_months',
          label: 'Last 12 months',
          from_date: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString(),
          to_date: new Date().toISOString()
        }
      ];
    }

    return {
      topics,
      date_presets
    };
  }

  searchArticles(query, from_date, to_date, topics = [], page = 1, page_size = 10) {
    const allArticles = this._getFromStorage('articles', []);
    const q = (query || '').trim().toLowerCase();

    let filtered = allArticles.filter((a) => {
      if (q) {
        const hay = [a.title, a.excerpt, a.body]
          .filter((x) => x)
          .join(' ')
          .toLowerCase();
        const words = q.split(/\s+/).filter((w) => w);
        const matchesAll = words.every((w) => hay.includes(w));
        if (!matchesAll) return false;
      }

      if (from_date) {
        const fromTs = new Date(from_date).getTime();
        if (new Date(a.published_at).getTime() < fromTs) return false;
      }

      if (to_date) {
        const toTs = new Date(to_date).getTime();
        if (new Date(a.published_at).getTime() > toTs) return false;
      }

      if (Array.isArray(topics) && topics.length) {
        const artTopics = Array.isArray(a.topics) ? a.topics : [];
        const matches = topics.some((t) => artTopics.includes(t));
        if (!matches) return false;
      }

      return true;
    });

    filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

    const total_count = filtered.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = filtered.slice(start, end);

    return {
      articles: paged,
      total_count,
      page,
      page_size
    };
  }

  getArticleDetails(article_id) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === article_id) || null;

    let related_articles = [];
    if (article) {
      const topics = Array.isArray(article.topics) ? article.topics : [];
      related_articles = articles
        .filter((a) => a.id !== article.id)
        .filter((a) => {
          const t = Array.isArray(a.topics) ? a.topics : [];
          return topics.some((x) => t.includes(x));
        })
        .slice(0, 3);
    }

    // Newsletter topics from newsletter_topics enum wrapper
    const newsletterTopicEnums = this._getFromStorage('newsletter_topics', []);
    const newsletter_topics = newsletterTopicEnums.map((t) => t.topic).filter((v) => typeof v === 'string');

    return {
      article,
      related_articles,
      newsletter_topics
    };
  }

  submitNewsletterSubscription(email, name, topics, source_article_id, double_opt_in = false) {
    const newsletter_subscriptions = this._getFromStorage('newsletter_subscriptions', []);

    const subscription = {
      id: this._generateId('newsletter_sub'),
      email,
      name: name || '',
      topics: Array.isArray(topics) ? topics : [],
      source_article_id: source_article_id || null,
      source_page: 'article',
      subscribed_at: new Date().toISOString(),
      double_opt_in: !!double_opt_in,
      status: double_opt_in ? 'pending' : 'active'
    };

    newsletter_subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', newsletter_subscriptions);

    this._sendNotificationEmail('newsletter_subscription', subscription);

    return {
      success: true,
      message: 'Subscription submitted.',
      subscription
    };
  }

  // ----- Product comparison -----

  compareProducts(product_ids) {
    const productsAll = this._getFromStorage('products', []);
    const selected = productsAll.filter((p) => product_ids.includes(p.id));

    const comparison_attributes = [];

    const addAttr = (key, label, unit, mapper) => {
      const values = selected.map((p) => ({ product_id: p.id, value: String(mapper(p) ?? '') }));
      // Skip attribute if all values are empty
      const nonEmpty = values.some((v) => v.value !== '');
      if (nonEmpty) {
        comparison_attributes.push({ key, label, unit, values });
      }
    };

    addAttr('price', 'Price', 'USD', (p) => (typeof p.price === 'number' ? p.price : ''));
    addAttr('rated_power_kw', 'Rated Power', 'kW', (p) => p.rated_power_kw);
    addAttr('power_output_w', 'Power Output', 'W', (p) => p.power_output_w);
    addAttr('system_size_kw', 'System Size', 'kW', (p) => p.system_size_kw);
    addAttr('max_efficiency_percent', 'Max Efficiency', '%', (p) => p.max_efficiency_percent);
    addAttr('noise_level_db', 'Noise Level', 'dB', (p) => p.noise_level_db);
    addAttr('system_type', 'System Type', '', (p) => p.system_type);

    return {
      products: selected,
      comparison_attributes
    };
  }

  // ----- About & contact & policy -----

  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', {});

    return {
      mission_html: stored.mission_html || '',
      history_html: stored.history_html || '',
      manufacturing_capabilities_html: stored.manufacturing_capabilities_html || '',
      sustainability_commitments_html: stored.sustainability_commitments_html || '',
      certifications: Array.isArray(stored.certifications) ? stored.certifications : []
    };
  }

  getContactPageContent() {
    const stored = this._getFromStorage('contact_page_content', {});

    return {
      primary_phone: stored.primary_phone || '',
      support_email: stored.support_email || '',
      sales_email: stored.sales_email || '',
      office_locations: Array.isArray(stored.office_locations) ? stored.office_locations : [],
      contact_topics: Array.isArray(stored.contact_topics) ? stored.contact_topics : []
    };
  }

  submitContactRequest(name, email, phone, topic_id, subject, message) {
    const contact_requests = this._getFromStorage('contact_requests', []);

    const req = {
      id: this._generateId('contact'),
      name,
      email,
      phone: phone || '',
      topic_id: topic_id || null,
      subject: subject || '',
      message,
      created_at: new Date().toISOString()
    };

    contact_requests.push(req);
    this._saveToStorage('contact_requests', contact_requests);

    this._sendNotificationEmail('contact_request', req);

    return {
      success: true,
      message: 'Contact request submitted.'
    };
  }

  getPolicyDocuments() {
    const stored = this._getFromStorage('policy_documents', {});

    return {
      privacy_policy_html: stored.privacy_policy_html || '',
      terms_of_use_html: stored.terms_of_use_html || '',
      warranty_policy_summary_html: stored.warranty_policy_summary_html || ''
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
