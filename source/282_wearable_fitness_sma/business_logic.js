// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  // Initialization
  _initStorage() {
    const tables = [
      { key: 'products', defaultValue: [] },
      { key: 'product_categories', defaultValue: [] },
      { key: 'warranty_plans', defaultValue: [] },
      { key: 'cart', defaultValue: null },
      { key: 'cart_items', defaultValue: [] },
      { key: 'comparison_sets', defaultValue: [] },
      { key: 'shipping_methods', defaultValue: [] },
      { key: 'shipping_addresses', defaultValue: [] },
      { key: 'checkout_sessions', defaultValue: [] },
      { key: 'support_categories', defaultValue: [] },
      { key: 'support_articles', defaultValue: [] },
      { key: 'support_favorites', defaultValue: [] }
    ];

    for (const t of tables) {
      if (localStorage.getItem(t.key) === null) {
        localStorage.setItem(t.key, JSON.stringify(t.defaultValue));
      }
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  // Generic storage helpers
  _getFromStorage(key, defaultValue = null) {
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ===== Private entity helpers =====

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (cart && cart.id) {
      return cart;
    }
    cart = {
      id: this._generateId('cart'),
      items: [],
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    this._saveToStorage('cart', cart);
    return cart;
  }

  _getOrCreateComparisonSet() {
    const sets = this._getFromStorage('comparison_sets', []);
    if (sets.length > 0) {
      return sets[0];
    }
    const comparisonSet = {
      id: this._generateId('comparison'),
      product_ids: [],
      created_at: this._nowIso()
    };
    const newSets = [comparisonSet];
    this._saveToStorage('comparison_sets', newSets);
    return comparisonSet;
  }

  _updateComparisonSet(setToUpdate) {
    let sets = this._getFromStorage('comparison_sets', []);
    if (sets.length === 0) {
      sets = [setToUpdate];
    } else {
      sets[0] = setToUpdate;
    }
    this._saveToStorage('comparison_sets', sets);
  }

  _getOrCreateSupportFavorites() {
    let favoritesList = this._getFromStorage('support_favorites', []);
    if (favoritesList.length > 0) {
      return favoritesList[0];
    }
    const fav = {
      id: this._generateId('support_fav'),
      article_ids: [],
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    favoritesList = [fav];
    this._saveToStorage('support_favorites', favoritesList);
    return fav;
  }

  _updateSupportFavorites(favToUpdate) {
    let favoritesList = this._getFromStorage('support_favorites', []);
    if (favoritesList.length === 0) {
      favoritesList = [favToUpdate];
    } else {
      favoritesList[0] = favToUpdate;
    }
    this._saveToStorage('support_favorites', favoritesList);
  }

  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions', []);
    let existing = null;
    for (const s of sessions) {
      if (s.cart_id === cart.id && s.status !== 'completed') {
        existing = s;
        break;
      }
    }
    if (existing) {
      return existing;
    }
    const session = {
      id: this._generateId('checkout'),
      cart_id: cart.id,
      shipping_address_id: null,
      shipping_method_id: null,
      gift_message: '',
      status: 'created',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    sessions.push(session);
    this._saveToStorage('checkout_sessions', sessions);
    return session;
  }

  _updateCheckoutSession(sessionToUpdate) {
    let sessions = this._getFromStorage('checkout_sessions', []);
    let found = false;
    sessions = sessions.map(s => {
      if (s.id === sessionToUpdate.id) {
        found = true;
        return sessionToUpdate;
      }
      return s;
    });
    if (!found) {
      sessions.push(sessionToUpdate);
    }
    this._saveToStorage('checkout_sessions', sessions);
  }

  // ===== Utility helpers =====

  _textMatch(value, query) {
    if (!query) return true;
    if (!value) return false;
    return String(value).toLowerCase().indexOf(String(query).toLowerCase()) !== -1;
  }

  _applyProductFilters(products, filters) {
    if (!filters) return products.slice();
    let result = products.slice();

    if (typeof filters.min_price === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      result = result.filter(p => typeof p.price === 'number' && p.price <= filters.max_price);
    }
    if (typeof filters.min_rating === 'number') {
      result = result.filter(p => typeof p.average_rating === 'number' && p.average_rating >= filters.min_rating);
    }
    if (typeof filters.min_review_count === 'number') {
      result = result.filter(p => typeof p.review_count === 'number' && p.review_count >= filters.min_review_count);
    }
    if (typeof filters.built_in_gps === 'boolean') {
      result = result.filter(p => !!p.built_in_gps === filters.built_in_gps);
    }
    if (typeof filters.heart_rate_monitoring === 'boolean') {
      result = result.filter(p => !!p.heart_rate_monitoring === filters.heart_rate_monitoring);
    }
    if (typeof filters.always_on_display === 'boolean') {
      result = result.filter(p => !!p.always_on_display === filters.always_on_display);
    }
    if (typeof filters.compatibility_android === 'boolean') {
      result = result.filter(p => !!p.compatibility_android === filters.compatibility_android);
    }
    if (typeof filters.compatibility_ios === 'boolean') {
      result = result.filter(p => !!p.compatibility_ios === filters.compatibility_ios);
    }
    if (filters.water_resistance_rating) {
      result = result.filter(p => p.water_resistance_rating === filters.water_resistance_rating);
    }
    if (typeof filters.max_weight_grams === 'number') {
      result = result.filter(p => typeof p.weight_grams === 'number' && p.weight_grams <= filters.max_weight_grams);
    }
    if (filters.band_material) {
      result = result.filter(p => p.band_material === filters.band_material);
    }
    if (filters.billing_frequency) {
      result = result.filter(p => p.billing_frequency === filters.billing_frequency);
    }
    if (typeof filters.is_new_release === 'boolean') {
      result = result.filter(p => !!p.is_new_release === filters.is_new_release);
    }
    if (typeof filters.released_within_days === 'number') {
      const now = Date.now();
      const ms = filters.released_within_days * 24 * 60 * 60 * 1000;
      result = result.filter(p => {
        if (!p.release_date) return false;
        const t = Date.parse(p.release_date);
        if (Number.isNaN(t)) return false;
        return now - t <= ms;
      });
    }

    return result;
  }

  _sortProducts(products, sort_by) {
    const list = products.slice();
    if (!sort_by) return list;

    if (sort_by === 'price_asc') {
      list.sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const bp = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        if (ap !== bp) return ap - bp;
        return 0;
      });
    } else if (sort_by === 'price_desc') {
      list.sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : Number.NEGATIVE_INFINITY;
        const bp = typeof b.price === 'number' ? b.price : Number.NEGATIVE_INFINITY;
        if (ap !== bp) return bp - ap;
        return 0;
      });
    } else if (sort_by === 'rating_desc') {
      list.sort((a, b) => {
        const ar = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const br = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (ar !== br) return br - ar;
        const ac = typeof a.review_count === 'number' ? a.review_count : 0;
        const bc = typeof b.review_count === 'number' ? b.review_count : 0;
        return bc - ac;
      });
    } else if (sort_by === 'newest') {
      list.sort((a, b) => {
        const at = a.release_date ? Date.parse(a.release_date) : 0;
        const bt = b.release_date ? Date.parse(b.release_date) : 0;
        return bt - at;
      });
    }

    return list;
  }

  _paginate(list, page, page_size) {
    const p = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * size;
    const end = start + size;
    return {
      items: list.slice(start, end),
      page: p,
      page_size: size,
      total_count: list.length
    };
  }

  _resolveCartItemsWithProducts(rawItems) {
    const products = this._getFromStorage('products', []);
    const warrantyPlans = this._getFromStorage('warranty_plans', []);
    const productById = {};
    for (const p of products) productById[p.id] = p;
    const warrantyById = {};
    for (const w of warrantyPlans) warrantyById[w.id] = w;

    return rawItems.map(item => {
      const product = productById[item.product_id] || null;
      const selectedWarranty = item.selected_warranty_plan_id
        ? (warrantyById[item.selected_warranty_plan_id] || null)
        : null;
      return Object.assign({}, item, {
        product: product,
        selected_warranty_plan: selectedWarranty
      });
    });
  }

  _markArticlesFavoriteFlags(articles, favoritesIds) {
    const favSet = new Set(favoritesIds || []);
    return articles.map(a => {
      const copy = Object.assign({}, a);
      copy.is_favorited = favSet.has(copy.id);
      return copy;
    });
  }

  _attachSupportCategory(articles) {
    const categories = this._getFromStorage('support_categories', []);
    const catById = {};
    for (const c of categories) catById[c.id] = c;
    return articles.map(a => {
      const copy = Object.assign({}, a);
      if (copy.category_id) {
        copy.category = catById[copy.category_id] || null;
      } else {
        copy.category = null;
      }
      return copy;
    });
  }

  // ===== Core interfaces =====

  // getHomePageContent()
  getHomePageContent() {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const supportArticles = this._getFromStorage('support_articles', []);
    const favorites = this._getOrCreateSupportFavorites();

    // Representative products per category
    const productCategoriesSamples = [];
    const productsByCategoryId = {};
    for (const p of products) {
      if (!Array.isArray(p.category_ids)) continue;
      for (const cid of p.category_ids) {
        if (!productsByCategoryId[cid]) {
          productsByCategoryId[cid] = p;
        }
      }
    }
    for (const cat of categories) {
      const sample = productsByCategoryId[cat.id];
      if (sample) productCategoriesSamples.push(sample);
    }

    // Featured products: top rated active smartwatches
    const featuredProducts = products
      .filter(p => p.is_active && p.type === 'smartwatch')
      .sort((a, b) => {
        const ar = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const br = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (ar !== br) return br - ar;
        const ac = typeof a.review_count === 'number' ? a.review_count : 0;
        const bc = typeof b.review_count === 'number' ? b.review_count : 0;
        return bc - ac;
      })
      .slice(0, 8);

    const featuredSubscriptions = products
      .filter(p => p.is_active && p.type === 'subscription')
      .sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const bp = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        return ap - bp;
      })
      .slice(0, 8);

    // Support highlights: latest articles with favorite flags and categories
    const sortedSupport = supportArticles
      .slice()
      .sort((a, b) => {
        const at = a.created_at ? Date.parse(a.created_at) : 0;
        const bt = b.created_at ? Date.parse(b.created_at) : 0;
        return bt - at;
      })
      .slice(0, 5);
    const highlightWithFav = this._markArticlesFavoriteFlags(sortedSupport, favorites.article_ids || []);
    const supportHighlightArticles = this._attachSupportCategory(highlightWithFav);

    return {
      product_categories: productCategoriesSamples,
      categories_meta: categories,
      featured_products: featuredProducts,
      featured_subscriptions: featuredSubscriptions,
      support_highlight_articles: supportHighlightArticles
    };
  }

  // searchAll(query, limit)
  searchAll(query, limit) {
    const max = typeof limit === 'number' && limit > 0 ? limit : 10;
    const q = query ? String(query).toLowerCase() : '';

    const products = this._getFromStorage('products', []);
    const matchedProducts = products.filter(p => {
      if (!p.is_active) return false;
      const fields = [p.name, p.short_description, p.description];
      return fields.some(v => v && String(v).toLowerCase().indexOf(q) !== -1);
    }).slice(0, max);

    const supportArticles = this._getFromStorage('support_articles', []);
    const favorites = this._getOrCreateSupportFavorites();
    let matchedArticles = supportArticles.filter(a => {
      const fields = [a.title, a.summary, a.content, a.model_name];
      if (fields.some(v => v && String(v).toLowerCase().indexOf(q) !== -1)) return true;
      if (Array.isArray(a.tags)) {
        return a.tags.some(t => t && String(t).toLowerCase().indexOf(q) !== -1);
      }
      return false;
    }).slice(0, max);

    matchedArticles = this._markArticlesFavoriteFlags(matchedArticles, favorites.article_ids || []);
    matchedArticles = this._attachSupportCategory(matchedArticles);

    return {
      products: matchedProducts,
      support_articles: matchedArticles
    };
  }

  // getProductCategories()
  getProductCategories() {
    return this._getFromStorage('product_categories', []);
  }

  // getCategoryFilterOptions(category_key)
  getCategoryFilterOptions(category_key) {
    const categories = this._getFromStorage('product_categories', []);
    const products = this._getFromStorage('products', []);

    const relevantCategoryIds = categories
      .filter(c => c.category_key === category_key)
      .map(c => c.id);

    const categoryProducts = products.filter(p => {
      if (!p.is_active) return false;
      if (!Array.isArray(p.category_ids)) return false;
      return p.category_ids.some(cid => relevantCategoryIds.indexOf(cid) !== -1);
    });

    let minPrice = null;
    let maxPrice = null;
    const ratingThresholdsSet = new Set();
    const reviewThresholdsSet = new Set();
    const waterOptionsSet = new Set();
    let minWeight = null;
    let maxWeight = null;
    const materialOptionsSet = new Set();
    const billingOptionsSet = new Set();

    for (const p of categoryProducts) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.average_rating === 'number') {
        ratingThresholdsSet.add(3);
        ratingThresholdsSet.add(4);
        ratingThresholdsSet.add(4.5);
      }
      if (typeof p.review_count === 'number') {
        if (p.review_count >= 50) reviewThresholdsSet.add(50);
        if (p.review_count >= 100) reviewThresholdsSet.add(100);
        if (p.review_count >= 200) reviewThresholdsSet.add(200);
      }
      if (p.water_resistance_rating) {
        waterOptionsSet.add(p.water_resistance_rating);
      }
      if (typeof p.weight_grams === 'number') {
        if (minWeight === null || p.weight_grams < minWeight) minWeight = p.weight_grams;
        if (maxWeight === null || p.weight_grams > maxWeight) maxWeight = p.weight_grams;
      }
      if (p.band_material) {
        materialOptionsSet.add(p.band_material);
      }
      if (p.billing_frequency) {
        billingOptionsSet.add(p.billing_frequency);
      }
    }

    const rating_thresholds = Array.from(ratingThresholdsSet).sort((a, b) => a - b);
    const review_count_thresholds = Array.from(reviewThresholdsSet).sort((a, b) => a - b);
    const water_resistance_options = Array.from(waterOptionsSet);
    const material_options = Array.from(materialOptionsSet);
    const billing_frequency_options = Array.from(billingOptionsSet);

    const feature_filters = {
      supports_built_in_gps: categoryProducts.some(p => !!p.built_in_gps),
      supports_heart_rate_monitoring: categoryProducts.some(p => !!p.heart_rate_monitoring),
      supports_always_on_display: categoryProducts.some(p => !!p.always_on_display)
    };

    const compatibility_filters = {
      android: categoryProducts.some(p => !!p.compatibility_android),
      ios: categoryProducts.some(p => !!p.compatibility_ios)
    };

    const weight_filters = {
      min_weight_grams: minWeight,
      max_weight_grams: maxWeight
    };

    const price_range = {
      min_price: minPrice,
      max_price: maxPrice
    };

    const sort_options = ['price_asc', 'price_desc', 'rating_desc', 'newest'];

    return {
      price_range: price_range,
      rating_thresholds: rating_thresholds,
      review_count_thresholds: review_count_thresholds,
      feature_filters: feature_filters,
      compatibility_filters: compatibility_filters,
      water_resistance_options: water_resistance_options,
      weight_filters: weight_filters,
      material_options: material_options,
      billing_frequency_options: billing_frequency_options,
      sort_options: sort_options
    };
  }

  // listCategoryProducts(category_key, filters, sort_by, page, page_size)
  listCategoryProducts(category_key, filters, sort_by, page, page_size) {
    const categories = this._getFromStorage('product_categories', []);
    const products = this._getFromStorage('products', []);

    const relevantCategoryIds = categories
      .filter(c => c.category_key === category_key)
      .map(c => c.id);

    let categoryProducts = products.filter(p => {
      if (!p.is_active) return false;
      if (!Array.isArray(p.category_ids)) return false;
      return p.category_ids.some(cid => relevantCategoryIds.indexOf(cid) !== -1);
    });

    categoryProducts = this._applyProductFilters(categoryProducts, filters || {});
    categoryProducts = this._sortProducts(categoryProducts, sort_by);

    const paginated = this._paginate(categoryProducts, page, page_size);

    return {
      products: paginated.items,
      total_count: paginated.total_count,
      page: paginated.page,
      page_size: paginated.page_size
    };
  }

  // getSearchFilterOptions(query)
  getSearchFilterOptions(query) {
    const products = this._getFromStorage('products', []);
    const q = query ? String(query).toLowerCase() : '';

    const matched = products.filter(p => {
      if (!p.is_active) return false;
      const fields = [p.name, p.short_description, p.description];
      return fields.some(v => v && String(v).toLowerCase().indexOf(q) !== -1);
    });

    let minPrice = null;
    let maxPrice = null;
    const ratingThresholdsSet = new Set();
    const reviewThresholdsSet = new Set();
    const waterOptionsSet = new Set();
    let minWeight = null;
    let maxWeight = null;
    const materialOptionsSet = new Set();
    const billingOptionsSet = new Set();

    for (const p of matched) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.average_rating === 'number') {
        ratingThresholdsSet.add(3);
        ratingThresholdsSet.add(4);
        ratingThresholdsSet.add(4.5);
      }
      if (typeof p.review_count === 'number') {
        if (p.review_count >= 50) reviewThresholdsSet.add(50);
        if (p.review_count >= 100) reviewThresholdsSet.add(100);
        if (p.review_count >= 200) reviewThresholdsSet.add(200);
      }
      if (p.water_resistance_rating) {
        waterOptionsSet.add(p.water_resistance_rating);
      }
      if (typeof p.weight_grams === 'number') {
        if (minWeight === null || p.weight_grams < minWeight) minWeight = p.weight_grams;
        if (maxWeight === null || p.weight_grams > maxWeight) maxWeight = p.weight_grams;
      }
      if (p.band_material) {
        materialOptionsSet.add(p.band_material);
      }
      if (p.billing_frequency) {
        billingOptionsSet.add(p.billing_frequency);
      }
    }

    const rating_thresholds = Array.from(ratingThresholdsSet).sort((a, b) => a - b);
    const review_count_thresholds = Array.from(reviewThresholdsSet).sort((a, b) => a - b);
    const water_resistance_options = Array.from(waterOptionsSet);
    const material_options = Array.from(materialOptionsSet);
    const billing_frequency_options = Array.from(billingOptionsSet);

    const feature_filters = {
      supports_built_in_gps: matched.some(p => !!p.built_in_gps),
      supports_heart_rate_monitoring: matched.some(p => !!p.heart_rate_monitoring),
      supports_always_on_display: matched.some(p => !!p.always_on_display)
    };

    const compatibility_filters = {
      android: matched.some(p => !!p.compatibility_android),
      ios: matched.some(p => !!p.compatibility_ios)
    };

    const weight_filters = {
      min_weight_grams: minWeight,
      max_weight_grams: maxWeight
    };

    const price_range = {
      min_price: minPrice,
      max_price: maxPrice
    };

    const sort_options = ['price_asc', 'price_desc', 'rating_desc', 'newest'];

    return {
      price_range: price_range,
      rating_thresholds: rating_thresholds,
      review_count_thresholds: review_count_thresholds,
      feature_filters: feature_filters,
      compatibility_filters: compatibility_filters,
      water_resistance_options: water_resistance_options,
      weight_filters: weight_filters,
      material_options: material_options,
      billing_frequency_options: billing_frequency_options,
      sort_options: sort_options
    };
  }

  // searchProducts(query, filters, sort_by, page, page_size)
  searchProducts(query, filters, sort_by, page, page_size) {
    const products = this._getFromStorage('products', []);
    const q = query ? String(query).toLowerCase() : '';

    let matched = products.filter(p => {
      if (!p.is_active) return false;
      const fields = [p.name, p.short_description, p.description];
      return fields.some(v => v && String(v).toLowerCase().indexOf(q) !== -1);
    });

    matched = this._applyProductFilters(matched, filters || {});
    matched = this._sortProducts(matched, sort_by);

    const paginated = this._paginate(matched, page, page_size);

    return {
      products: paginated.items,
      total_count: paginated.total_count,
      page: paginated.page,
      page_size: paginated.page_size
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        colors: [],
        band_sizes: [],
        materials: [],
        is_new_release: false,
        is_preorder: false,
        specs: {},
        review_summary: {
          average_rating: null,
          review_count: null
        },
        subscription_options: null
      };
    }

    const colors = Array.isArray(product.available_colors) ? product.available_colors : [];
    const band_sizes = Array.isArray(product.available_band_sizes)
      ? product.available_band_sizes
      : [];

    let materials = [];
    if (Array.isArray(product.available_materials) && product.available_materials.length > 0) {
      materials = product.available_materials.slice();
    } else if (product.band_material) {
      materials = [product.band_material];
    }

    const specs = {
      battery_life_hours: product.battery_life_hours || null,
      weight_grams: product.weight_grams || null,
      built_in_gps: !!product.built_in_gps,
      heart_rate_monitoring: !!product.heart_rate_monitoring,
      always_on_display: !!product.always_on_display,
      water_resistance_rating: product.water_resistance_rating || null,
      compatibility_android: !!product.compatibility_android,
      compatibility_ios: !!product.compatibility_ios,
      focus_area: product.focus_area || null
    };

    const review_summary = {
      average_rating: typeof product.average_rating === 'number' ? product.average_rating : null,
      review_count: typeof product.review_count === 'number' ? product.review_count : null
    };

    let subscription_options = null;
    if (product.is_subscription || product.type === 'subscription') {
      subscription_options = {
        billing_frequency: product.billing_frequency || null,
        supported_fitness_goals: Array.isArray(product.supported_fitness_goals)
          ? product.supported_fitness_goals
          : []
      };
    }

    return {
      product: product,
      colors: colors,
      band_sizes: band_sizes,
      materials: materials,
      is_new_release: !!product.is_new_release,
      is_preorder: !!product.is_preorder,
      specs: specs,
      review_summary: review_summary,
      subscription_options: subscription_options
    };
  }

  // getProductWarrantyOptions(productId)
  getProductWarrantyOptions(productId) {
    const products = this._getFromStorage('products', []);
    const warrantyPlans = this._getFromStorage('warranty_plans', []);
    const product = products.find(p => p.id === productId);
    if (!product || !Array.isArray(product.available_warranty_plan_ids)) {
      return [];
    }
    return product.available_warranty_plan_ids
      .map(id => warrantyPlans.find(w => w.id === id))
      .filter(Boolean);
  }

  // getRecommendedAccessories(productId)
  getRecommendedAccessories(productId) {
    const products = this._getFromStorage('products', []);
    const base = products.find(p => p.id === productId);
    if (!base) return [];

    const accessories = products.filter(p => {
      if (!p.is_active) return false;
      if (p.id === base.id) return false;
      if (p.type === 'band' || p.type === 'accessory') return true;
      // as a fallback, include running-focused watches for running-focused bases
      if (base.focus_area && p.focus_area && base.focus_area === p.focus_area && p.type === 'smartwatch') {
        return true;
      }
      return false;
    });

    return accessories.slice(0, 12);
  }

  // addToCart(productId, quantity, selected_color, selected_band_size, selected_material, selected_warranty_plan_id, selected_fitness_goal)
  addToCart(productId, quantity = 1, selected_color, selected_band_size, selected_material, selected_warranty_plan_id, selected_fitness_goal) {
    const cart = this._getOrCreateCart();
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;

    const cartItems = this._getFromStorage('cart_items', []);
    const qty = quantity && quantity > 0 ? quantity : 1;
    const unitPrice = product && typeof product.price === 'number' ? product.price : 0;

    const item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: productId,
      quantity: qty,
      unit_price: unitPrice,
      total_price: unitPrice * qty,
      selected_color: selected_color || null,
      selected_band_size: selected_band_size || null,
      selected_material: selected_material || null,
      selected_warranty_plan_id: selected_warranty_plan_id || null,
      selected_fitness_goal: selected_fitness_goal || null,
      is_preorder: product ? !!product.is_preorder : false,
      added_at: this._nowIso()
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(item.id);
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);

    const resolvedItem = this._resolveCartItemsWithProducts([item])[0];

    return {
      success: true,
      cart: cart,
      added_item: resolvedItem,
      message: 'Item added to cart.'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const cartItems = allItems.filter(i => i.cart_id === cart.id);
    const itemsWithProduct = this._resolveCartItemsWithProducts(cartItems);

    let subtotal = 0;
    for (const item of itemsWithProduct) {
      const unitPrice = typeof item.unit_price === 'number'
        ? item.unit_price
        : (item.product && typeof item.product.price === 'number' ? item.product.price : 0);
      const qty = item.quantity || 0;
      const total = unitPrice * qty;
      item.unit_price = unitPrice;
      item.total_price = total;
      subtotal += total;
    }

    const estimated_tax = subtotal * 0.1;
    const total = subtotal + estimated_tax;

    const products = itemsWithProduct.map(i => i.product);

    return {
      cart: cart,
      items: itemsWithProduct,
      products: products,
      subtotal: subtotal,
      estimated_tax: estimated_tax,
      total: total
    };
  }

  // updateCartItemQuantity(cart_item_id, quantity)
  updateCartItemQuantity(cart_item_id, quantity) {
    const cart = this._getOrCreateCart();
    let items = this._getFromStorage('cart_items', []);
    const idx = items.findIndex(i => i.id === cart_item_id && i.cart_id === cart.id);
    if (idx === -1) {
      return { success: false, cart: cart };
    }

    if (!quantity || quantity <= 0) {
      const removed = items[idx];
      items.splice(idx, 1);
      this._saveToStorage('cart_items', items);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== removed.id);
      }
      cart.updated_at = this._nowIso();
      this._saveToStorage('cart', cart);
      return { success: true, cart: cart };
    }

    const item = items[idx];
    item.quantity = quantity;
    item.total_price = (typeof item.unit_price === 'number' ? item.unit_price : 0) * quantity;
    items[idx] = item;
    this._saveToStorage('cart_items', items);

    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);

    return { success: true, cart: cart };
  }

  // removeCartItem(cart_item_id)
  removeCartItem(cart_item_id) {
    const cart = this._getOrCreateCart();
    let items = this._getFromStorage('cart_items', []);
    const idx = items.findIndex(i => i.id === cart_item_id && i.cart_id === cart.id);
    if (idx === -1) {
      return { success: false, cart: cart };
    }
    const removed = items[idx];
    items.splice(idx, 1);
    this._saveToStorage('cart_items', items);

    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter(id => id !== removed.id);
    }
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);

    return { success: true, cart: cart };
  }

  // updateComparisonSelection(productId, selected)
  updateComparisonSelection(productId, selected) {
    const comparisonSet = this._getOrCreateComparisonSet();
    const ids = Array.isArray(comparisonSet.product_ids) ? comparisonSet.product_ids.slice() : [];
    const index = ids.indexOf(productId);

    if (selected) {
      if (index === -1) ids.push(productId);
    } else {
      if (index !== -1) ids.splice(index, 1);
    }

    comparisonSet.product_ids = ids;
    this._updateComparisonSet(comparisonSet);

    return {
      comparison_set: comparisonSet,
      product_ids: ids
    };
  }

  // getComparisonView()
  getComparisonView() {
    const comparisonSet = this._getOrCreateComparisonSet();
    const productsAll = this._getFromStorage('products', []);
    const products = comparisonSet.product_ids
      .map(id => productsAll.find(p => p.id === id) || null)
      .filter(Boolean);

    const spec_rows = [];

    // Price row: lower price is better
    if (products.length > 0) {
      let bestIndexPrice = -1;
      let bestValuePrice = null;
      const priceValues = products.map((p, idx) => {
        if (typeof p.price === 'number') {
          if (bestValuePrice === null || p.price < bestValuePrice) {
            bestValuePrice = p.price;
            bestIndexPrice = idx;
          }
          return '$' + p.price.toFixed(2);
        }
        return '—';
      });
      spec_rows.push({
        label: 'Price',
        key: 'price',
        values: priceValues,
        highlight_winner_index: bestIndexPrice
      });

      // Battery life: higher is better
      let bestIndexBattery = -1;
      let bestValueBattery = null;
      const batteryValues = products.map((p, idx) => {
        if (typeof p.battery_life_hours === 'number') {
          if (bestValueBattery === null || p.battery_life_hours > bestValueBattery) {
            bestValueBattery = p.battery_life_hours;
            bestIndexBattery = idx;
          }
          return p.battery_life_hours + ' h';
        }
        return '—';
      });
      spec_rows.push({
        label: 'Battery Life',
        key: 'battery_life_hours',
        values: batteryValues,
        highlight_winner_index: bestIndexBattery
      });

      // Weight: lower is better
      let bestIndexWeight = -1;
      let bestValueWeight = null;
      const weightValues = products.map((p, idx) => {
        if (typeof p.weight_grams === 'number') {
          if (bestValueWeight === null || p.weight_grams < bestValueWeight) {
            bestValueWeight = p.weight_grams;
            bestIndexWeight = idx;
          }
          return p.weight_grams + ' g';
        }
        return '—';
      });
      spec_rows.push({
        label: 'Weight',
        key: 'weight_grams',
        values: weightValues,
        highlight_winner_index: bestIndexWeight
      });
    }

    return {
      comparison_set: comparisonSet,
      products: products,
      spec_rows: spec_rows
    };
  }

  // startGuestCheckout()
  startGuestCheckout() {
    const session = this._getOrCreateCheckoutSession();
    const summary = this.getCartSummary();
    return {
      checkout_session: session,
      cart: summary.cart,
      items: summary.items
    };
  }

  // getCheckoutDetails()
  getCheckoutDetails() {
    const session = this._getOrCreateCheckoutSession();
    const summary = this.getCartSummary();
    const shippingAddresses = this._getFromStorage('shipping_addresses', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    const shipping_address = session.shipping_address_id
      ? (shippingAddresses.find(a => a.id === session.shipping_address_id) || null)
      : null;

    const selected_shipping_method = session.shipping_method_id
      ? (shippingMethods.find(m => m.id === session.shipping_method_id) || null)
      : null;

    return {
      checkout_session: Object.assign({}, session, {
        cart: summary.cart,
        shipping_address: shipping_address,
        shipping_method: selected_shipping_method
      }),
      cart: summary.cart,
      items: summary.items,
      shipping_address: shipping_address,
      selected_shipping_method: selected_shipping_method,
      gift_message: session.gift_message || '',
      status: session.status
    };
  }

  // updateCheckoutShippingAddress(shipping_address)
  updateCheckoutShippingAddress(shipping_address) {
    const session = this._getOrCreateCheckoutSession();
    let addresses = this._getFromStorage('shipping_addresses', []);
    const now = this._nowIso();

    let addressRecord = null;
    if (session.shipping_address_id) {
      const idx = addresses.findIndex(a => a.id === session.shipping_address_id);
      if (idx !== -1) {
        addressRecord = Object.assign({}, addresses[idx], shipping_address, {
          id: addresses[idx].id,
          created_at: addresses[idx].created_at,
          updated_at: now
        });
        addresses[idx] = addressRecord;
      }
    }

    if (!addressRecord) {
      addressRecord = Object.assign({}, shipping_address, {
        id: this._generateId('ship_addr'),
        created_at: now,
        updated_at: now
      });
      addresses.push(addressRecord);
    }

    this._saveToStorage('shipping_addresses', addresses);

    session.shipping_address_id = addressRecord.id;
    session.status = 'shipping_entered';
    session.updated_at = now;
    this._updateCheckoutSession(session);

    return {
      checkout_session: Object.assign({}, session, {
        shipping_address: addressRecord
      }),
      shipping_address: addressRecord,
      status: session.status
    };
  }

  // getAvailableShippingMethods()
  getAvailableShippingMethods() {
    return this._getFromStorage('shipping_methods', []);
  }

  // selectCheckoutShippingMethod(shipping_method_id)
  selectCheckoutShippingMethod(shipping_method_id) {
    const session = this._getOrCreateCheckoutSession();
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const method = shippingMethods.find(m => m.id === shipping_method_id) || null;

    if (!method) {
      return {
        checkout_session: session,
        selected_shipping_method: null,
        status: session.status
      };
    }

    session.shipping_method_id = method.id;
    session.status = 'shipping_method_selected';
    session.updated_at = this._nowIso();
    this._updateCheckoutSession(session);

    return {
      checkout_session: Object.assign({}, session, {
        shipping_method: method
      }),
      selected_shipping_method: method,
      status: session.status
    };
  }

  // setCheckoutGiftMessage(gift_message)
  setCheckoutGiftMessage(gift_message) {
    const session = this._getOrCreateCheckoutSession();
    session.gift_message = gift_message || '';
    session.updated_at = this._nowIso();
    this._updateCheckoutSession(session);

    return {
      checkout_session: session,
      gift_message: session.gift_message
    };
  }

  // proceedToPaymentStep()
  proceedToPaymentStep() {
    const session = this._getOrCreateCheckoutSession();
    session.status = 'payment_step';
    session.updated_at = this._nowIso();
    this._updateCheckoutSession(session);

    return {
      checkout_session: session,
      status: session.status
    };
  }

  // getPaymentStepDetails()
  getPaymentStepDetails() {
    const session = this._getOrCreateCheckoutSession();
    const summary = this.getCartSummary();
    const shippingAddresses = this._getFromStorage('shipping_addresses', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    const shipping_address = session.shipping_address_id
      ? (shippingAddresses.find(a => a.id === session.shipping_address_id) || null)
      : null;

    const shipping_method = session.shipping_method_id
      ? (shippingMethods.find(m => m.id === session.shipping_method_id) || null)
      : null;

    let total = summary.total;
    if (shipping_method && typeof shipping_method.price === 'number') {
      total += shipping_method.price;
    }

    return {
      checkout_session: Object.assign({}, session, {
        shipping_address: shipping_address,
        shipping_method: shipping_method
      }),
      cart: summary.cart,
      items: summary.items,
      shipping_method: shipping_method,
      shipping_address: shipping_address,
      total: total
    };
  }

  // Support center

  // getSupportHomeContent()
  getSupportHomeContent() {
    const categories = this._getFromStorage('support_categories', []);
    const articles = this._getFromStorage('support_articles', []);
    const favorites = this._getOrCreateSupportFavorites();

    const popular_articles_raw = articles
      .slice()
      .sort((a, b) => {
        const at = a.created_at ? Date.parse(a.created_at) : 0;
        const bt = b.created_at ? Date.parse(b.created_at) : 0;
        return bt - at;
      })
      .slice(0, 10);

    const popular_articles = this._attachSupportCategory(
      this._markArticlesFavoriteFlags(popular_articles_raw, favorites.article_ids || [])
    );

    const favorite_articles_raw = articles.filter(a => (favorites.article_ids || []).indexOf(a.id) !== -1);
    const favorite_articles = this._attachSupportCategory(
      this._markArticlesFavoriteFlags(favorite_articles_raw, favorites.article_ids || [])
    );

    return {
      categories: categories,
      popular_articles: popular_articles,
      favorite_articles: favorite_articles
    };
  }

  // getSupportCategories()
  getSupportCategories() {
    return this._getFromStorage('support_categories', []);
  }

  // searchSupportArticles(query, category_id)
  searchSupportArticles(query, category_id) {
    const q = query ? String(query).toLowerCase() : '';
    const articles = this._getFromStorage('support_articles', []);
    const favorites = this._getOrCreateSupportFavorites();

    // Support more flexible matching for multi-word queries (e.g. "corefit lite band replacement")
    const tokens = q.split(/\s+/).filter(Boolean);

    let filtered = articles.filter(a => {
      if (category_id && a.category_id !== category_id) return false;
      if (!q) return true;

      const fieldValues = [a.title, a.summary, a.content, a.model_name];
      let haystack = fieldValues
        .filter(v => v)
        .map(v => String(v).toLowerCase())
        .join(' ');

      if (Array.isArray(a.tags)) {
        haystack += ' ' + a.tags
          .filter(t => t)
          .map(t => String(t).toLowerCase())
          .join(' ');
      }

      if (tokens.length === 0) {
        return haystack.length > 0;
      }

      // Require every token from the query to appear somewhere in the article text/tags
      return tokens.every(token => haystack.indexOf(token) !== -1);
    });

    filtered = this._markArticlesFavoriteFlags(filtered, favorites.article_ids || []);
    filtered = this._attachSupportCategory(filtered);

    return filtered;
  }

  // listSupportArticlesByCategory(support_category_id)
  listSupportArticlesByCategory(support_category_id) {
    const articles = this._getFromStorage('support_articles', []);
    const favorites = this._getOrCreateSupportFavorites();
    let filtered = articles.filter(a => a.category_id === support_category_id);
    filtered = this._markArticlesFavoriteFlags(filtered, favorites.article_ids || []);
    filtered = this._attachSupportCategory(filtered);
    return filtered;
  }

  // getSupportArticleDetails(articleId)
  getSupportArticleDetails(articleId) {
    const articles = this._getFromStorage('support_articles', []);
    const favorites = this._getOrCreateSupportFavorites();
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        is_favorited: false
      };
    }
    const is_favorited = (favorites.article_ids || []).indexOf(article.id) !== -1;
    const withFlag = this._markArticlesFavoriteFlags([article], favorites.article_ids || []);
    const withCat = this._attachSupportCategory(withFlag)[0];
    return {
      article: withCat,
      is_favorited: is_favorited
    };
  }

  // setSupportArticleFavorite(articleId, favorite)
  setSupportArticleFavorite(articleId, favorite) {
    const fav = this._getOrCreateSupportFavorites();
    let ids = Array.isArray(fav.article_ids) ? fav.article_ids.slice() : [];
    const idx = ids.indexOf(articleId);

    if (favorite) {
      if (idx === -1) ids.push(articleId);
    } else {
      if (idx !== -1) ids.splice(idx, 1);
    }

    fav.article_ids = ids;
    fav.updated_at = this._nowIso();
    this._updateSupportFavorites(fav);

    // Also update cached is_favorited flag on articles
    const articles = this._getFromStorage('support_articles', []);
    for (const a of articles) {
      a.is_favorited = ids.indexOf(a.id) !== -1;
    }
    this._saveToStorage('support_articles', articles);

    const favoriteArticlesRaw = articles.filter(a => ids.indexOf(a.id) !== -1);
    let favoriteArticles = this._markArticlesFavoriteFlags(favoriteArticlesRaw, ids);
    favoriteArticles = this._attachSupportCategory(favoriteArticles);

    return {
      success: true,
      favorites: favoriteArticles
    };
  }

  // getSupportFavorites()
  getSupportFavorites() {
    const fav = this._getOrCreateSupportFavorites();
    const articles = this._getFromStorage('support_articles', []);
    const ids = fav.article_ids || [];
    let favoriteArticles = articles.filter(a => ids.indexOf(a.id) !== -1);
    favoriteArticles = this._markArticlesFavoriteFlags(favoriteArticles, ids);
    favoriteArticles = this._attachSupportCategory(favoriteArticles);
    return favoriteArticles;
  }

  // Static content and contact

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      headline: 'Fitness wearables built for real life.',
      body:
        'We design lightweight, durable smartwatches and accessories focused on helping you move more, recover better, and stay connected without sacrificing simplicity.',
      highlights: [
        'Performance-focused smartwatches for running, training, and everyday wear',
        'Water-ready designs for swimming and all-weather training',
        'Fitness coaching subscriptions that adapt to your goals and schedule'
      ]
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    return {
      support_email: 'support@example-fitnesswear.com',
      support_phone: '+1 (800) 000-0000',
      support_hours: 'Mon–Fri, 9:00am–6:00pm PT',
      additional_info: 'For order questions, please include your order ID in the message.'
    };
  }

  // submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    // Business logic only; external system would handle sending
    return {
      success: true,
      message: 'Your message has been received. Our team will get back to you shortly.'
    };
  }

  // getShippingAndReturnsInfo()
  getShippingAndReturnsInfo() {
    return {
      shipping_policies:
        'We offer standard, two_day, and express shipping options within supported regions. Shipping times are estimates and may vary based on carrier and destination.',
      return_policies:
        'Unused products can be returned within 30 days of delivery for a full refund, subject to inspection. Subscription fees are non-refundable once the billing period has started.',
      preorder_terms:
        'Pre_order items are charged at the time of purchase and ship as soon as they become available. Estimated ship dates are provided on each product page and may change.',
      warranty_terms:
        'All smartwatches include a limited one_year hardware warranty. Extended warranty plans add coverage for accidental damage and extended hardware protection as described in each plan.'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      content:
        'We collect and process your data to provide and improve our fitness products and services. We do not sell your personal data. See full policy details on our website for information about data retention, third_party processors, and your rights.'
    };
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    return {
      content:
        'By using this site and purchasing our products or subscriptions, you agree to our terms, including acceptable use, payment obligations, subscription renewals, warranty limitations, and liability disclaimers.'
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
