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
    const tableKeys = [
      'product_categories',
      'product_subcategories',
      'products',
      'cart',
      'cart_items',
      'promo_codes',
      'installation_regions',
      'time_slot_options',
      'installation_bookings',
      'configurator_requests',
      'configurator_results',
      'wishlists',
      'wishlist_items',
      'manuals',
      'manual_collections',
      'saved_manuals',
      'compare_lists',
      'contact_inquiries'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Optional content storage for about/faq/terms (not seeded with data)
    if (!localStorage.getItem('about_content')) {
      // leave unset or minimal; do not seed domain data
      localStorage.setItem('about_content', JSON.stringify(null));
    }
    if (!localStorage.getItem('help_faqs')) {
      localStorage.setItem('help_faqs', JSON.stringify(null));
    }
    if (!localStorage.getItem('terms_and_policies')) {
      localStorage.setItem('terms_and_policies', JSON.stringify(null));
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed === null ? defaultValue : parsed;
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

  _toLabelFromEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    if (carts.length > 0) {
      return carts[0];
    }
    const now = new Date().toISOString();
    const cart = {
      id: this._generateId('cart'),
      created_at: now,
      updated_at: now,
      subtotal: 0,
      discount_total: 0,
      total: 0,
      applied_promo_code: null
    };
    const newCarts = [cart];
    this._saveToStorage('cart', newCarts);
    return cart;
  }

  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    const allItems = this._getFromStorage('cart_items');
    const items = allItems.filter((ci) => ci.cart_id === cart.id);

    const subtotal = items.reduce((sum, item) => sum + (item.line_subtotal || 0), 0);
    cart.subtotal = Number(subtotal.toFixed(2));

    let discount = 0;
    const appliedCode = cart.applied_promo_code;
    let promo = null;

    if (appliedCode) {
      const promos = this._getFromStorage('promo_codes');
      const now = new Date();
      promo = promos.find((p) => {
        if (!p.active) return false;
        if (p.code && p.code.toLowerCase() === String(appliedCode).toLowerCase()) {
          if (p.valid_from && new Date(p.valid_from) > now) return false;
          if (p.valid_to && new Date(p.valid_to) < now) return false;
          if (typeof p.min_cart_subtotal === 'number' && subtotal < p.min_cart_subtotal) return false;
          return true;
        }
        return false;
      });

      if (!promo) {
        cart.applied_promo_code = null;
      }
    }

    if (promo) {
      if (promo.discount_type === 'percentage') {
        discount = subtotal * (promo.discount_value / 100);
      } else if (promo.discount_type === 'fixed_amount') {
        discount = promo.discount_value;
      } else if (promo.discount_type === 'free_shipping') {
        discount = 0;
      }
    }

    if (discount > subtotal) discount = subtotal;
    cart.discount_total = Number(discount.toFixed(2));
    cart.total = Number((subtotal - cart.discount_total).toFixed(2));
    cart.updated_at = new Date().toISOString();

    if (cartIndex >= 0) {
      carts[cartIndex] = cart;
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  // ---------------------- Wishlist helpers ----------------------

  _createOrGetDefaultWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let existing = wishlists.find((w) => w.is_default);
    if (existing) return existing;

    const now = new Date().toISOString();
    const wishlist = {
      id: this._generateId('wishlist'),
      name: 'My Wishlist',
      created_at: now,
      is_default: true
    };
    wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);
    return wishlist;
  }

  // ---------------------- Manual collection helpers ----------------------

  _createOrGetDefaultManualCollection() {
    let collections = this._getFromStorage('manual_collections');
    let existing = collections.find((c) => c.is_default);
    if (existing) return existing;

    const now = new Date().toISOString();
    const collection = {
      id: this._generateId('manual_collection'),
      name: 'My Manuals',
      description: '',
      is_default: true,
      created_at: now
    };
    collections.push(collection);
    this._saveToStorage('manual_collections', collections);
    return collection;
  }

  // ---------------------- Compare list helper ----------------------

  _getOrCreateCompareListForContext(context) {
    let lists = this._getFromStorage('compare_lists');
    let existing = lists.find((l) => l.context === context);
    if (existing) return existing;

    const now = new Date().toISOString();
    const compareList = {
      id: this._generateId('compare_list'),
      context: context,
      product_ids: [],
      created_at: now
    };
    lists.push(compareList);
    this._saveToStorage('compare_lists', lists);
    return compareList;
  }

  // ---------------------- Configurator helper ----------------------

  _generateConfiguratorRecommendations(request) {
    const products = this._getFromStorage('products');

    const filtered = products.filter((p) => {
      if (p.status !== 'active') return false;
      if (p.price > request.budget_max) return false;

      if (p.mount_type && p.mount_type !== request.mount_type) return false;

      if (request.winch_type === 'manual') {
        if (p.power_type && !(p.power_type === 'manual' || p.power_type === 'none')) return false;
      } else if (request.winch_type === 'electric') {
        if (p.power_type && p.power_type !== 'electric') return false;
      }

      if (typeof p.compatible_dinghy_length_min_ft === 'number' && p.compatible_dinghy_length_min_ft > request.dinghy_length_ft) {
        return false;
      }
      if (typeof p.compatible_dinghy_length_max_ft === 'number' && p.compatible_dinghy_length_max_ft < request.dinghy_length_ft) {
        return false;
      }

      if (typeof p.compatible_boat_length_min_ft === 'number' && p.compatible_boat_length_min_ft > request.boat_length_ft) {
        return false;
      }
      if (typeof p.compatible_boat_length_max_ft === 'number' && p.compatible_boat_length_max_ft < request.boat_length_ft) {
        return false;
      }

      if (typeof p.load_capacity_kg === 'number' && p.load_capacity_kg < request.dinghy_weight_kg) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      // Packages first
      if (a.product_type === 'package' && b.product_type !== 'package') return -1;
      if (b.product_type === 'package' && a.product_type !== 'package') return 1;
      // Then cheaper first
      if (a.price !== b.price) return a.price - b.price;
      // Then higher rating
      const ar = typeof a.rating_average === 'number' ? a.rating_average : 0;
      const br = typeof b.rating_average === 'number' ? b.rating_average : 0;
      return br - ar;
    });

    const recommended_product_ids = filtered.map((p) => p.id);

    const now = new Date().toISOString();
    const result = {
      id: this._generateId('config_result'),
      request_id: request.id,
      recommended_product_ids,
      created_at: now
    };

    const results = this._getFromStorage('configurator_results');
    results.push(result);
    this._saveToStorage('configurator_results', results);

    return result;
  }

  // ---------------------- Interface implementations ----------------------

  // 1. getProductCategoriesForNavigation()
  getProductCategoriesForNavigation() {
    return this._getFromStorage('product_categories');
  }

  // 2. getFeaturedProducts(placement = 'homepage_featured', limit = 8)
  getFeaturedProducts(placement, limit) {
    const placementVal = placement || 'homepage_featured';
    const limitVal = typeof limit === 'number' ? limit : 8;
    let products = this._getFromStorage('products').filter((p) => p.status === 'active');

    if (placementVal === 'free_shipping_promo') {
      products = products.filter((p) => p.free_shipping);
    }

    products.sort((a, b) => {
      const ab = !!a.is_best_seller;
      const bb = !!b.is_best_seller;
      if (ab && !bb) return -1;
      if (bb && !ab) return 1;
      const ar = typeof a.best_seller_rank === 'number' ? a.best_seller_rank : Number.MAX_SAFE_INTEGER;
      const br = typeof b.best_seller_rank === 'number' ? b.best_seller_rank : Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
      const arating = typeof a.rating_average === 'number' ? a.rating_average : 0;
      const brating = typeof b.rating_average === 'number' ? b.rating_average : 0;
      if (arating !== brating) return brating - arating;
      return a.price - b.price;
    });

    return products.slice(0, limitVal);
  }

  // 3. getActivePromoCodes()
  getActivePromoCodes() {
    const promos = this._getFromStorage('promo_codes');
    const now = new Date();
    return promos.filter((p) => {
      if (!p.active) return false;
      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_to && new Date(p.valid_to) < now) return false;
      return true;
    });
  }

  // 4. getCategoryFilterOptions(categoryId, subcategoryCode)
  getCategoryFilterOptions(categoryId, subcategoryCode) {
    const products = this._getFromStorage('products').filter((p) => {
      if (p.category_id !== categoryId) return false;
      if (subcategoryCode && p.subcategory_code !== subcategoryCode) return false;
      return true;
    });

    const mountTypeMap = new Map();
    const materialMap = new Map();
    const powerTypeMap = new Map();
    const boatTypeMap = new Map();

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let minCapacity = Infinity;
    let maxCapacity = -Infinity;
    let minDinghyLen = Infinity;
    let maxDinghyLen = -Infinity;

    let hasRemote = false;
    let hasFreeShipping = false;
    let hasOutOfStock = false;

    products.forEach((p) => {
      if (p.mount_type) {
        mountTypeMap.set(p.mount_type, (mountTypeMap.get(p.mount_type) || 0) + 1);
      }
      if (p.material) {
        materialMap.set(p.material, (materialMap.get(p.material) || 0) + 1);
      }
      if (p.power_type) {
        powerTypeMap.set(p.power_type, (powerTypeMap.get(p.power_type) || 0) + 1);
      }
      if (p.boat_type) {
        boatTypeMap.set(p.boat_type, (boatTypeMap.get(p.boat_type) || 0) + 1);
      }

      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.load_capacity_kg === 'number') {
        if (p.load_capacity_kg < minCapacity) minCapacity = p.load_capacity_kg;
        if (p.load_capacity_kg > maxCapacity) maxCapacity = p.load_capacity_kg;
      }
      if (typeof p.compatible_dinghy_length_min_ft === 'number') {
        if (p.compatible_dinghy_length_min_ft < minDinghyLen) minDinghyLen = p.compatible_dinghy_length_min_ft;
      }
      if (typeof p.compatible_dinghy_length_max_ft === 'number') {
        if (p.compatible_dinghy_length_max_ft > maxDinghyLen) maxDinghyLen = p.compatible_dinghy_length_max_ft;
      }

      if (p.supports_remote_control) hasRemote = true;
      if (p.free_shipping) hasFreeShipping = true;
      if (!p.in_stock) hasOutOfStock = true;
    });

    const mount_types = Array.from(mountTypeMap.entries()).map(([value, count]) => ({
      value,
      label: this._toLabelFromEnum(value),
      product_count: count
    }));

    const materials = Array.from(materialMap.entries()).map(([value, count]) => ({
      value,
      label: this._toLabelFromEnum(value),
      product_count: count
    }));

    const power_types = Array.from(powerTypeMap.entries()).map(([value, count]) => ({
      value,
      label: this._toLabelFromEnum(value),
      product_count: count
    }));

    const boat_types = Array.from(boatTypeMap.entries()).map(([value, count]) => ({
      value,
      label: this._toLabelFromEnum(value),
      product_count: count
    }));

    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = 0;
    if (!isFinite(minCapacity)) minCapacity = 0;
    if (!isFinite(maxCapacity)) maxCapacity = 0;
    if (!isFinite(minDinghyLen)) minDinghyLen = 0;
    if (!isFinite(maxDinghyLen)) maxDinghyLen = 0;

    // Rating buckets: provide two common buckets if applicable
    const ratingBucketsConfig = [
      { min_rating: 4.0, label: '4_stars_and_up' },
      { min_rating: 4.5, label: '4_5_stars_and_up' }
    ];

    const rating_buckets = ratingBucketsConfig.filter((bucket) =>
      products.some((p) => typeof p.rating_average === 'number' && p.rating_average >= bucket.min_rating)
    ).map((bucket) => ({
      min_rating: bucket.min_rating,
      label: bucket.label
    }));

    return {
      mount_types,
      materials,
      power_types,
      boat_types,
      price_range: {
        min_price: minPrice,
        max_price: maxPrice,
        currency: 'usd'
      },
      load_capacity_range_kg: {
        min_capacity_kg: minCapacity,
        max_capacity_kg: maxCapacity
      },
      dinghy_length_range_ft: {
        min_length_ft: minDinghyLen,
        max_length_ft: maxDinghyLen
      },
      rating_buckets,
      supports_remote_control_filter_available: hasRemote,
      free_shipping_filter_available: hasFreeShipping,
      in_stock_filter_available: hasOutOfStock
    };
  }

  // 5. listCategoryProducts(categoryId, subcategoryCode, filters, sort, page, pageSize)
  listCategoryProducts(categoryId, subcategoryCode, filters, sort, page, pageSize) {
    const sortKey = sort || 'default';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const allProducts = this._getFromStorage('products');

    let products = allProducts.filter((p) => {
      if (p.category_id !== categoryId) return false;
      if (subcategoryCode && p.subcategory_code !== subcategoryCode) return false;
      return true;
    });

    const f = filters || {};

    products = products.filter((p) => {
      if (f.mountType && p.mount_type !== f.mountType) return false;
      if (f.material && p.material !== f.material) return false;
      if (f.powerType && p.power_type !== f.powerType) return false;
      if (f.boatType && p.boat_type !== f.boatType) return false;

      if (typeof f.minPrice === 'number' && p.price < f.minPrice) return false;
      if (typeof f.maxPrice === 'number' && p.price > f.maxPrice) return false;

      if (typeof f.minLoadCapacityKg === 'number') {
        if (typeof p.load_capacity_kg !== 'number' || p.load_capacity_kg < f.minLoadCapacityKg) return false;
      }

      if (typeof f.minDinghyLengthFt === 'number') {
        if (typeof p.compatible_dinghy_length_max_ft === 'number' && p.compatible_dinghy_length_max_ft < f.minDinghyLengthFt) return false;
      }

      if (typeof f.maxDinghyLengthFt === 'number') {
        if (typeof p.compatible_dinghy_length_min_ft === 'number' && p.compatible_dinghy_length_min_ft > f.maxDinghyLengthFt) return false;
      }

      if (typeof f.minRating === 'number') {
        const rating = typeof p.rating_average === 'number' ? p.rating_average : 0;
        if (rating < f.minRating) return false;
      }

      if (f.freeShippingOnly && !p.free_shipping) return false;
      if (f.remoteControlIncluded && !p.supports_remote_control) return false;
      if (f.inStockOnly && !p.in_stock) return false;

      if (Array.isArray(f.featureTags) && f.featureTags.length > 0) {
        if (!Array.isArray(p.feature_tags)) return false;
        const hasAll = f.featureTags.every((tag) => p.feature_tags.includes(tag));
        if (!hasAll) return false;
      }

      return true;
    });

    // Sorting
    products.sort((a, b) => {
      if (sortKey === 'price_low_to_high') {
        return a.price - b.price;
      }
      if (sortKey === 'price_high_to_low') {
        return b.price - a.price;
      }
      if (sortKey === 'load_capacity_high_to_low') {
        const ac = typeof a.load_capacity_kg === 'number' ? a.load_capacity_kg : -Infinity;
        const bc = typeof b.load_capacity_kg === 'number' ? b.load_capacity_kg : -Infinity;
        return bc - ac;
      }
      if (sortKey === 'best_selling') {
        const ab = !!a.is_best_seller;
        const bb = !!b.is_best_seller;
        if (ab && !bb) return -1;
        if (bb && !ab) return 1;
        const ar = typeof a.best_seller_rank === 'number' ? a.best_seller_rank : Number.MAX_SAFE_INTEGER;
        const br = typeof b.best_seller_rank === 'number' ? b.best_seller_rank : Number.MAX_SAFE_INTEGER;
        return ar - br;
      }
      if (sortKey === 'customer_rating_high_to_low') {
        const ar = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const br = typeof b.rating_average === 'number' ? b.rating_average : 0;
        if (br !== ar) return br - ar;
        return b.rating_count - a.rating_count;
      }

      // default sort: best seller then price
      const ab = !!a.is_best_seller;
      const bb = !!b.is_best_seller;
      if (ab && !bb) return -1;
      if (bb && !ab) return 1;
      const arank = typeof a.best_seller_rank === 'number' ? a.best_seller_rank : Number.MAX_SAFE_INTEGER;
      const brank = typeof b.best_seller_rank === 'number' ? b.best_seller_rank : Number.MAX_SAFE_INTEGER;
      if (arank !== brank) return arank - brank;
      return a.price - b.price;
    });

    const total_results = products.length;
    const total_pages = Math.max(1, Math.ceil(total_results / size));
    const start = (pageNum - 1) * size;
    const pagedProducts = products.slice(start, start + size);

    const categories = this._getFromStorage('product_categories');
    const subcategories = this._getFromStorage('product_subcategories');

    const category = categories.find((c) => c.category_id === categoryId) || null;
    const subcategory = subcategoryCode
      ? subcategories.find((s) => s.code === subcategoryCode) || null
      : null;

    return {
      category_label: category ? category.name : '',
      subcategory_label: subcategory ? subcategory.name : '',
      products: pagedProducts,
      page: pageNum,
      page_size: size,
      total_results,
      total_pages
    };
  }

  // 6. searchProducts(query, filters, sort, page, pageSize)
  searchProducts(query, filters, sort, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const sortKey = sort || 'relevance';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const allProducts = this._getFromStorage('products');
    const f = filters || {};

    let products = allProducts.filter((p) => {
      if (q) {
        const text = [p.name, p.description, p.model_number, p.sku]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (f.categoryId && p.category_id !== f.categoryId) return false;
      if (typeof f.minPrice === 'number' && p.price < f.minPrice) return false;
      if (typeof f.maxPrice === 'number' && p.price > f.maxPrice) return false;

      if (typeof f.minRating === 'number') {
        const rating = typeof p.rating_average === 'number' ? p.rating_average : 0;
        if (rating < f.minRating) return false;
      }

      if (f.freeShippingOnly && !p.free_shipping) return false;
      if (f.inStockOnly && !p.in_stock) return false;

      return true;
    });

    products.sort((a, b) => {
      if (sortKey === 'price_low_to_high') return a.price - b.price;
      if (sortKey === 'price_high_to_low') return b.price - a.price;
      if (sortKey === 'customer_rating_high_to_low') {
        const ar = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const br = typeof b.rating_average === 'number' ? b.rating_average : 0;
        if (br !== ar) return br - ar;
        return b.rating_count - a.rating_count;
      }
      if (sortKey === 'best_selling') {
        const ab = !!a.is_best_seller;
        const bb = !!b.is_best_seller;
        if (ab && !bb) return -1;
        if (bb && !ab) return 1;
        const ar = typeof a.best_seller_rank === 'number' ? a.best_seller_rank : Number.MAX_SAFE_INTEGER;
        const br = typeof b.best_seller_rank === 'number' ? b.best_seller_rank : Number.MAX_SAFE_INTEGER;
        return ar - br;
      }

      // relevance: approximate by position of query within text
      if (q) {
        const textA = [a.name, a.description, a.model_number, a.sku].filter(Boolean).join(' ').toLowerCase();
        const textB = [b.name, b.description, b.model_number, b.sku].filter(Boolean).join(' ').toLowerCase();
        const ia = textA.indexOf(q);
        const ib = textB.indexOf(q);
        if (ia !== ib) return ia - ib;
      }

      return 0;
    });

    const total_results = products.length;
    const total_pages = Math.max(1, Math.ceil(total_results / size));
    const start = (pageNum - 1) * size;
    const paged = products.slice(start, start + size);

    return {
      products: paged,
      total_results,
      page: pageNum,
      page_size: size,
      total_pages
    };
  }

  // 7. searchManuals(query, filters, sort, page, pageSize)
  searchManuals(query, filters, sort, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const sortKey = sort || 'relevance';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const manualsAll = this._getFromStorage('manuals');
    const f = filters || {};

    let manuals = manualsAll.filter((m) => {
      if (q) {
        const text = [m.title, m.product_model_number, m.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!text.includes(q)) return false;
      }

      if (f.documentType && m.document_type !== f.documentType) return false;

      if (f.categoryId) {
        const products = this._getFromStorage('products');
        const allowedProductIds = new Set(
          products.filter((p) => p.category_id === f.categoryId).map((p) => p.id)
        );
        if (m.related_product_id && !allowedProductIds.has(m.related_product_id)) return false;
      }

      return true;
    });

    manuals.sort((a, b) => {
      if (sortKey === 'title_az') return a.title.localeCompare(b.title);
      if (sortKey === 'title_za') return b.title.localeCompare(a.title);
      if (sortKey === 'model_number_az') {
        return (a.product_model_number || '').localeCompare(b.product_model_number || '');
      }

      // relevance: approximate by position of query within title
      if (q) {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        const ia = ta.indexOf(q);
        const ib = tb.indexOf(q);
        if (ia !== ib) return ia - ib;
      }
      return 0;
    });

    const total_results = manuals.length;
    const total_pages = Math.max(1, Math.ceil(total_results / size));
    const start = (pageNum - 1) * size;
    const paged = manuals.slice(start, start + size);

    return {
      manuals: paged,
      total_results,
      page: pageNum,
      page_size: size,
      total_pages
    };
  }

  // 8. getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const manuals = this._getFromStorage('manuals');
    const product = products.find((p) => p.id === productId) || null;

    let linked_manuals = [];
    if (product && Array.isArray(product.manual_ids) && product.manual_ids.length > 0) {
      const idSet = new Set(product.manual_ids);
      linked_manuals = manuals.filter((m) => idSet.has(m.id));
    } else if (product && product.model_number) {
      const model = product.model_number;
      linked_manuals = manuals.filter((m) => m.product_model_number === model);
    }

    let related_products = [];
    if (product) {
      related_products = products
        .filter((p) => p.id !== product.id && p.category_id === product.category_id)
        .slice(0, 6);
    }

    const promotion_messages = [];
    if (product && product.free_shipping && product.shipping_badge_text) {
      promotion_messages.push(product.shipping_badge_text);
    }

    return {
      product,
      related_products,
      linked_manuals,
      promotion_messages
    };
  }

  // 9. getRelatedProducts(productId, limit = 6)
  getRelatedProducts(productId, limit) {
    const limitVal = typeof limit === 'number' ? limit : 6;
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) return [];

    const related = products
      .filter((p) => p.id !== productId && p.category_id === product.category_id)
      .slice(0, limitVal);
    return related;
  }

  // 10. getProductManuals(productId)
  getProductManuals(productId) {
    const products = this._getFromStorage('products');
    const manuals = this._getFromStorage('manuals');
    const product = products.find((p) => p.id === productId);
    if (!product) return [];

    let result = [];
    if (Array.isArray(product.manual_ids) && product.manual_ids.length > 0) {
      const idSet = new Set(product.manual_ids);
      result = manuals.filter((m) => idSet.has(m.id));
    }

    if (result.length === 0) {
      if (product.model_number) {
        result = manuals.filter((m) => m.product_model_number === product.model_number);
      } else {
        result = manuals.filter((m) => m.related_product_id === product.id);
      }
    }

    return result;
  }

  // 11. getCart(budgetMax)
  getCart(budgetMax) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const itemsRaw = allItems.filter((ci) => ci.cart_id === cart.id);
    const maxLine = itemsRaw.reduce((max, i) => (i.line_subtotal > max ? i.line_subtotal : max), 0);

    const items = itemsRaw.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name_snapshot,
        product_thumbnail_url: product ? product.thumbnail_url || null : null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        free_shipping: product ? !!product.free_shipping : false,
        is_most_expensive_line: ci.line_subtotal === maxLine,
        // foreign key resolution
        product
      };
    });

    // Ensure totals are up to date
    this._recalculateCartTotals(cart);

    let budget_evaluation = {
      budget_max: null,
      is_within_budget: null,
      amount_over_budget: 0
    };

    if (typeof budgetMax === 'number') {
      const is_within = cart.total <= budgetMax;
      const over = is_within ? 0 : Number((cart.total - budgetMax).toFixed(2));
      budget_evaluation = {
        budget_max: budgetMax,
        is_within_budget: is_within,
        amount_over_budget: over
      };
    }

    return {
      cart,
      items,
      budget_evaluation
    };
  }

  // 12. addToCart(productId, quantity = 1)
  addToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        cart: null,
        added_item: null
      };
    }
    if (!product.in_stock) {
      return {
        success: false,
        message: 'Product is out of stock',
        cart: null,
        added_item: null
      };
    }

    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');

    let line = allItems.find((ci) => ci.cart_id === cart.id && ci.product_id === productId);
    const now = new Date().toISOString();

    if (line) {
      line.quantity += qty;
      line.line_subtotal = Number((line.quantity * line.unit_price).toFixed(2));
    } else {
      line = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        quantity: qty,
        unit_price: product.price,
        line_subtotal: Number((qty * product.price).toFixed(2)),
        added_at: now
      };
      allItems.push(line);
    }

    this._saveToStorage('cart_items', allItems);
    this._recalculateCartTotals(cart);

    const added_item = {
      cart_item_id: line.id,
      product_id: line.product_id,
      product_name: line.product_name_snapshot,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_subtotal: line.line_subtotal
    };

    return {
      success: true,
      message: 'Item added to cart',
      cart,
      added_item
    };
  }

  // 13. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const allItems = this._getFromStorage('cart_items');
    const index = allItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null
      };
    }

    const item = allItems[index];
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === item.cart_id) || this._getOrCreateCart();

    if (quantity <= 0) {
      allItems.splice(index, 1);
      this._saveToStorage('cart_items', allItems);
      this._recalculateCartTotals(cart);
      return {
        success: true,
        message: 'Cart item removed',
        cart
      };
    }

    item.quantity = quantity;
    item.line_subtotal = Number((item.unit_price * quantity).toFixed(2));
    this._saveToStorage('cart_items', allItems);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item updated',
      cart
    };
  }

  // 14. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const allItems = this._getFromStorage('cart_items');
    const index = allItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null
      };
    }

    const item = allItems[index];
    const carts = this._getFromStorage('cart');
    const cart = carts.find((c) => c.id === item.cart_id) || this._getOrCreateCart();

    allItems.splice(index, 1);
    this._saveToStorage('cart_items', allItems);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item removed',
      cart
    };
  }

  // 15. applyPromoCodeToCart(promoCode)
  applyPromoCodeToCart(promoCode) {
    const code = (promoCode || '').trim();
    if (!code) {
      return {
        success: false,
        message: 'Promo code is required',
        cart: null,
        applied_promo: null
      };
    }

    const promos = this._getFromStorage('promo_codes');
    const now = new Date();

    const promo = promos.find((p) => {
      if (!p.active) return false;
      if (!p.code) return false;
      if (p.code.toLowerCase() !== code.toLowerCase()) return false;
      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_to && new Date(p.valid_to) < now) return false;
      return true;
    });

    if (!promo) {
      return {
        success: false,
        message: 'Promo code is invalid or expired',
        cart: null,
        applied_promo: null
      };
    }

    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items');
    const items = allItems.filter((ci) => ci.cart_id === cart.id);
    const subtotal = items.reduce((sum, item) => sum + (item.line_subtotal || 0), 0);

    if (typeof promo.min_cart_subtotal === 'number' && subtotal < promo.min_cart_subtotal) {
      return {
        success: false,
        message: 'Cart subtotal is below the minimum for this promo code',
        cart,
        applied_promo: null
      };
    }

    cart.applied_promo_code = promo.code;
    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Promo code applied',
      cart,
      applied_promo: promo
    };
  }

  // 16. getInstallationFormOptions()
  getInstallationFormOptions() {
    // Boat length bands are static options based on enum in data model
    const boat_length_bands = [
      {
        code: 'ft_20_30',
        label: '20–30 ft',
        min_length_ft: 20,
        max_length_ft: 30
      },
      {
        code: 'ft_30_40',
        label: '30–40 ft',
        min_length_ft: 30,
        max_length_ft: 40
      },
      {
        code: 'ft_40_50',
        label: '40–50 ft',
        min_length_ft: 40,
        max_length_ft: 50
      },
      {
        code: 'other_band',
        label: 'Other',
        min_length_ft: null,
        max_length_ft: null
      }
    ];

    const regions = this._getFromStorage('installation_regions');
    const time_slots = this._getFromStorage('time_slot_options');

    return {
      boat_length_bands,
      regions,
      time_slots
    };
  }

  // 17. submitInstallationBooking(boatLengthBandCode, boatLengthFtExact, regionCode, appointmentDate, timeSlotCode, contactName, contactEmail, contactPhone, notes)
  submitInstallationBooking(
    boatLengthBandCode,
    boatLengthFtExact,
    regionCode,
    appointmentDate,
    timeSlotCode,
    contactName,
    contactEmail,
    contactPhone,
    notes
  ) {
    const now = new Date().toISOString();
    const booking = {
      id: this._generateId('install_booking'),
      boat_length_band_code: boatLengthBandCode,
      boat_length_ft_exact: typeof boatLengthFtExact === 'number' ? boatLengthFtExact : null,
      region_code: regionCode,
      appointment_date: new Date(appointmentDate).toISOString(),
      time_slot_code: timeSlotCode,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      notes: notes || '',
      status: 'pending',
      created_at: now
    };

    const bookings = this._getFromStorage('installation_bookings');
    bookings.push(booking);
    this._saveToStorage('installation_bookings', bookings);

    return {
      success: true,
      message: 'Installation booking submitted',
      booking
    };
  }

  // 18. submitConfiguratorRequest(boatLengthFt, dinghyLengthFt, dinghyWeightKg, mountType, winchType, budgetMax)
  submitConfiguratorRequest(boatLengthFt, dinghyLengthFt, dinghyWeightKg, mountType, winchType, budgetMax) {
    const now = new Date().toISOString();
    const request = {
      id: this._generateId('config_request'),
      boat_length_ft: boatLengthFt,
      dinghy_length_ft: dinghyLengthFt,
      dinghy_weight_kg: dinghyWeightKg,
      mount_type: mountType,
      winch_type: winchType,
      budget_max: budgetMax,
      created_at: now
    };

    const requests = this._getFromStorage('configurator_requests');
    requests.push(request);
    this._saveToStorage('configurator_requests', requests);

    const result = this._generateConfiguratorRecommendations(request);
    const products = this._getFromStorage('products');
    const recommended_products = result.recommended_product_ids
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);

    return {
      request,
      result,
      recommended_products
    };
  }

  // 19. getConfiguratorResults(requestId)
  getConfiguratorResults(requestId) {
    const requests = this._getFromStorage('configurator_requests');
    const request = requests.find((r) => r.id === requestId) || null;

    const results = this._getFromStorage('configurator_results').filter((r) => r.request_id === requestId);
    let result = null;
    if (results.length > 0) {
      result = results.reduce((latest, r) => {
        if (!latest) return r;
        return new Date(r.created_at) > new Date(latest.created_at) ? r : latest;
      }, null);
    }

    const products = this._getFromStorage('products');
    const recommended_products = result
      ? result.recommended_product_ids.map((id) => products.find((p) => p.id === id)).filter(Boolean)
      : [];

    return {
      request,
      result,
      recommended_products
    };
  }

  // 20. getWishlists()
  getWishlists() {
    let wishlists = this._getFromStorage('wishlists');
    if (!wishlists || wishlists.length === 0) {
      this._createOrGetDefaultWishlist();
      wishlists = this._getFromStorage('wishlists');
    }
    return wishlists;
  }

  // 21. getWishlistItems(wishlistId)
  getWishlistItems(wishlistId) {
    const wishlists = this._getFromStorage('wishlists');
    const wishlist = wishlists.find((w) => w.id === wishlistId) || null;
    const itemsRaw = this._getFromStorage('wishlist_items').filter((wi) => wi.wishlist_id === wishlistId);
    const products = this._getFromStorage('products');

    const items = itemsRaw.map((wi) => ({
      wishlist_item: wi,
      product: products.find((p) => p.id === wi.product_id) || null
    }));

    return {
      wishlist,
      items
    };
  }

  // 22. addProductToWishlist(productId, source, wishlistId)
  addProductToWishlist(productId, source, wishlistId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        wishlist: null,
        wishlist_item: null
      };
    }

    let wishlist = null;
    if (wishlistId) {
      const wishlists = this._getFromStorage('wishlists');
      wishlist = wishlists.find((w) => w.id === wishlistId) || null;
    }
    if (!wishlist) {
      wishlist = this._createOrGetDefaultWishlist();
    }

    const items = this._getFromStorage('wishlist_items');
    let existing = items.find((wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId);

    if (!existing) {
      const now = new Date().toISOString();
      existing = {
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        product_id: productId,
        source: source || 'other',
        added_at: now
      };
      items.push(existing);
      this._saveToStorage('wishlist_items', items);
    }

    return {
      success: true,
      message: 'Product added to wishlist',
      wishlist,
      wishlist_item: existing
    };
  }

  // 23. moveWishlistItemToCart(wishlistItemId, quantity = 1)
  moveWishlistItemToCart(wishlistItemId, quantity) {
    const items = this._getFromStorage('wishlist_items');
    const wi = items.find((w) => w.id === wishlistItemId);
    if (!wi) {
      return {
        success: false,
        message: 'Wishlist item not found',
        cart: null
      };
    }

    const result = this.addToCart(wi.product_id, quantity || 1);
    return {
      success: result.success,
      message: result.message,
      cart: result.cart
    };
  }

  // 24. removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const items = this._getFromStorage('wishlist_items');
    const idx = items.findIndex((w) => w.id === wishlistItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Wishlist item not found'
      };
    }
    items.splice(idx, 1);
    this._saveToStorage('wishlist_items', items);
    return {
      success: true,
      message: 'Wishlist item removed'
    };
  }

  // 25. getManualDetail(manualId)
  getManualDetail(manualId) {
    const manuals = this._getFromStorage('manuals');
    const manual = manuals.find((m) => m.id === manualId) || null;
    const products = this._getFromStorage('products');

    let related_product = null;
    if (manual) {
      if (manual.related_product_id) {
        related_product = products.find((p) => p.id === manual.related_product_id) || null;
      }
      if (!related_product && manual.product_model_number) {
        related_product = products.find((p) => p.model_number === manual.product_model_number) || null;
      }
    }

    // Instrumentation for task completion tracking (task_7)
    try {
      if (
        manual &&
        (
          manual.product_model_number === 'DL-300-SS' ||
          (typeof manual.title === 'string' && manual.title.includes('DL-300-SS Davit'))
        )
      ) {
        const savedManuals = this._getFromStorage('saved_manuals');
        if (Array.isArray(savedManuals) && savedManuals.some((sm) => sm.manual_id === manualId)) {
          localStorage.setItem('task7_manualOpenedFromLibrary', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      manual,
      related_product
    };
  }

  // 26. getManualCollections()
  getManualCollections() {
    let collections = this._getFromStorage('manual_collections');
    if (!collections || collections.length === 0) {
      this._createOrGetDefaultManualCollection();
      collections = this._getFromStorage('manual_collections');
    }
    return collections;
  }

  // 27. saveManualToCollection(manualId, collectionId)
  saveManualToCollection(manualId, collectionId) {
    const manuals = this._getFromStorage('manuals');
    const manual = manuals.find((m) => m.id === manualId);
    if (!manual) {
      return {
        success: false,
        message: 'Manual not found',
        saved_manual: null
      };
    }

    const collections = this._getFromStorage('manual_collections');
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      return {
        success: false,
        message: 'Manual collection not found',
        saved_manual: null
      };
    }

    const savedList = this._getFromStorage('saved_manuals');
    let existing = savedList.find((sm) => sm.manual_id === manualId && sm.collection_id === collectionId);
    if (!existing) {
      const now = new Date().toISOString();
      existing = {
        id: this._generateId('saved_manual'),
        manual_id: manualId,
        collection_id: collectionId,
        title_snapshot: manual.title,
        added_at: now
      };
      savedList.push(existing);
      this._saveToStorage('saved_manuals', savedList);
    }

    return {
      success: true,
      message: 'Manual saved to collection',
      saved_manual: existing
    };
  }

  // 28. getSavedManuals(collectionId)
  getSavedManuals(collectionId) {
    const collections = this._getFromStorage('manual_collections');
    const collection = collections.find((c) => c.id === collectionId) || null;

    const savedList = this._getFromStorage('saved_manuals').filter((sm) => sm.collection_id === collectionId);
    const manuals = this._getFromStorage('manuals');

    const items = savedList.map((sm) => ({
      saved_manual: sm,
      manual: manuals.find((m) => m.id === sm.manual_id) || null
    }));

    return {
      collection,
      items
    };
  }

  // 29. removeSavedManual(savedManualId)
  removeSavedManual(savedManualId) {
    const savedList = this._getFromStorage('saved_manuals');
    const idx = savedList.findIndex((sm) => sm.id === savedManualId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Saved manual not found'
      };
    }
    savedList.splice(idx, 1);
    this._saveToStorage('saved_manuals', savedList);
    return {
      success: true,
      message: 'Saved manual removed'
    };
  }

  // 30. updateCompareList(context, productIds)
  updateCompareList(context, productIds) {
    const lists = this._getFromStorage('compare_lists');
    let list = lists.find((l) => l.context === context);
    const now = new Date().toISOString();

    if (!list) {
      list = {
        id: this._generateId('compare_list'),
        context,
        product_ids: Array.isArray(productIds) ? productIds.slice() : [],
        created_at: now
      };
      lists.push(list);
    } else {
      list.product_ids = Array.isArray(productIds) ? productIds.slice() : [];
      list.created_at = now;
    }

    this._saveToStorage('compare_lists', lists);

    return {
      compare_list: {
        id: list.id,
        context: list.context,
        product_ids: list.product_ids,
        created_at: list.created_at
      }
    };
  }

  // 31. getComparisonData(context)
  getComparisonData(context) {
    const lists = this._getFromStorage('compare_lists');
    const compare_list = lists.find((l) => l.context === context) || null;
    const productsTable = this._getFromStorage('products');

    const products = compare_list
      ? compare_list.product_ids
          .map((id) => productsTable.find((p) => p.id === id))
          .filter(Boolean)
          .map((product) => ({
            product,
            key_specs: {
              load_capacity_kg: product.load_capacity_kg,
              weight_kg: product.weight_kg,
              material: product.material || null,
              mount_type: product.mount_type || null,
              power_type: product.power_type || null,
              rating_average: product.rating_average
            }
          }))
      : [];

    return {
      compare_list,
      products
    };
  }

  // 32. submitContactInquiry(contactType, topic, name, email, phone, preferredContactMethod, message, budget, boatLengthFt, dinghyLengthFt, dinghyWeightKg, responseTimePreference)
  submitContactInquiry(
    contactType,
    topic,
    name,
    email,
    phone,
    preferredContactMethod,
    message,
    budget,
    boatLengthFt,
    dinghyLengthFt,
    dinghyWeightKg,
    responseTimePreference
  ) {
    const now = new Date().toISOString();
    const inquiry = {
      id: this._generateId('contact_inquiry'),
      contact_type: contactType,
      topic,
      name,
      email,
      phone: phone || null,
      preferred_contact_method: preferredContactMethod,
      message,
      budget: typeof budget === 'number' ? budget : null,
      boat_length_ft: typeof boatLengthFt === 'number' ? boatLengthFt : null,
      dinghy_length_ft: typeof dinghyLengthFt === 'number' ? dinghyLengthFt : null,
      dinghy_weight_kg: typeof dinghyWeightKg === 'number' ? dinghyWeightKg : null,
      response_time_preference: responseTimePreference,
      status: 'submitted',
      created_at: now
    };

    const inquiries = this._getFromStorage('contact_inquiries');
    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted',
      inquiry
    };
  }

  // 33. getAboutContent()
  getAboutContent() {
    const stored = this._getFromStorage('about_content', null);
    if (stored) return stored;
    // fallback minimal structure if nothing stored
    return {
      headline: '',
      body_sections: [],
      certifications: []
    };
  }

  // 34. getHelpFaqs()
  getHelpFaqs() {
    const stored = this._getFromStorage('help_faqs', null);
    if (stored) return stored;
    return {
      categories: [],
      faqs: []
    };
  }

  // 35. getTermsAndPolicies()
  getTermsAndPolicies() {
    const stored = this._getFromStorage('terms_and_policies', null);
    if (stored) return stored;
    return {
      sections: []
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