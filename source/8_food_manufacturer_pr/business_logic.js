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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const ensureKey = (key, defaultValue) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensureKey('products', []); // Product
    ensureKey('categories', []); // Category
    ensureKey('subcategories', []); // Subcategory
    ensureKey('cart', null); // Single Cart object for this user
    ensureKey('cart_items', []); // CartItem[]
    ensureKey('favorites', null); // FavoritesCollection singleton
    ensureKey('compare_sessions', []); // CompareSession[]
    ensureKey('promocodes', []); // PromoCode[]
    ensureKey('contact_inquiries', []); // ContactInquiry[]
    ensureKey('private_label_configurations', []); // PrivateLabelConfiguration[]
    ensureKey('private_label_quote_requests', []); // PrivateLabelQuoteRequest[]
    ensureKey('informational_pages', []); // Optional informational content

    // Generic id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : null;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed === null && defaultValue !== undefined ? defaultValue : parsed;
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : null;
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

  _sanitizeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  _toTitleFromEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  // Determine pack size label for cart display
  _getPackSizeLabel(product) {
    if (!product || typeof product !== 'object') return null;
    if (product.volume_liters) {
      return this._sanitizeNumber(product.volume_liters) + 'L';
    }
    if (product.weight_kg) {
      return this._sanitizeNumber(product.weight_kg) + 'kg';
    }
    if (product.pack_count) {
      return this._sanitizeNumber(product.pack_count) + '-unit pack';
    }
    return null;
  }

  _filterProductsByCategoryAndSubcategory(products, categorySlug, subcategorySlug) {
    let result = Array.isArray(products) ? products.slice() : [];
    if (categorySlug) {
      if (categorySlug === 'all_products') {
        // Show all, no extra filter
      } else {
        result = result.filter(p => {
          if (!p || p.status !== 'active') return false;
          // Include products directly in the category or globally in all_products
          return p.category_slug === categorySlug || p.category_slug === 'all_products';
        });
      }
    }
    if (subcategorySlug) {
      result = result.filter(p => p.subcategory_slug === subcategorySlug);
    }
    return result;
  }

  _applySort(products, sort) {
    const list = Array.isArray(products) ? products.slice() : [];
    if (!sort || sort === 'relevance') {
      return list; // Keep natural order
    }

    if (sort === 'best_rated') {
      return list.sort((a, b) => {
        const ra = this._sanitizeNumber(b.rating_average) - this._sanitizeNumber(a.rating_average);
        if (ra !== 0) return ra;
        return this._sanitizeNumber(b.rating_count) - this._sanitizeNumber(a.rating_count);
      });
    }

    if (sort === 'price_low_to_high') {
      return list.sort((a, b) => this._sanitizeNumber(a.unit_price) - this._sanitizeNumber(b.unit_price));
    }

    if (sort === 'price_high_to_low') {
      return list.sort((a, b) => this._sanitizeNumber(b.unit_price) - this._sanitizeNumber(a.unit_price));
    }

    if (sort === 'weight_high_to_low') {
      return list.sort((a, b) => this._sanitizeNumber(b.weight_kg) - this._sanitizeNumber(a.weight_kg));
    }

    if (sort === 'newest_first') {
      return list.sort((a, b) => {
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return db - da;
      });
    }

    // Default fallback
    return list;
  }

  // ----------------------
  // _validateProductFilters helper
  // ----------------------

  _validateProductFilters(filters) {
    const out = {};
    if (!filters || typeof filters !== 'object') return out;

    const boolFields = [
      'is_gluten_free',
      'is_nut_free',
      'is_vegan',
      'is_sugar_free',
      'is_limited_edition'
    ];
    boolFields.forEach(f => {
      if (filters[f] !== undefined) {
        out[f] = Boolean(filters[f]);
      }
    });

    const numFields = [
      'min_weight_kg', 'max_weight_kg',
      'min_volume_liters', 'max_volume_liters',
      'min_pack_count', 'max_pack_count',
      'min_shelf_life_months', 'max_shelf_life_months',
      'min_price', 'max_price',
      'min_rating', 'max_rating'
    ];
    numFields.forEach(f => {
      if (filters[f] !== undefined && filters[f] !== null && filters[f] !== '') {
        const v = Number(filters[f]);
        if (Number.isFinite(v)) {
          out[f] = v;
        }
      }
    });

    const arrayFields = [
      'flavor_in',
      'packaging_type_in',
      'packaging_format_in',
      'volume_liters_in',
      'tags_in'
    ];
    arrayFields.forEach(f => {
      if (Array.isArray(filters[f])) {
        out[f] = filters[f].slice();
      }
    });

    // For search filters
    if (filters.category_slug) {
      out.category_slug = String(filters.category_slug);
    }

    return out;
  }

  _applyFiltersToProducts(products, filters) {
    const f = this._validateProductFilters(filters);
    let result = Array.isArray(products) ? products.slice() : [];

    if (f.is_gluten_free) {
      result = result.filter(p => p.is_gluten_free === true);
    }
    if (f.is_nut_free) {
      result = result.filter(p => p.is_nut_free === true);
    }
    if (f.is_vegan) {
      result = result.filter(p => p.is_vegan === true);
    }
    if (f.is_sugar_free) {
      result = result.filter(p => p.is_sugar_free === true);
    }
    if (f.is_limited_edition) {
      result = result.filter(p => p.is_limited_edition === true);
    }

    if (Array.isArray(f.flavor_in) && f.flavor_in.length) {
      const set = new Set(f.flavor_in);
      result = result.filter(p => p.flavor && set.has(p.flavor));
    }

    if (Array.isArray(f.packaging_type_in) && f.packaging_type_in.length) {
      const set = new Set(f.packaging_type_in);
      result = result.filter(p => p.packaging_type && set.has(p.packaging_type));
    }

    if (Array.isArray(f.packaging_format_in) && f.packaging_format_in.length) {
      const set = new Set(f.packaging_format_in);
      result = result.filter(p => p.packaging_format && set.has(p.packaging_format));
    }

    if (Array.isArray(f.volume_liters_in) && f.volume_liters_in.length) {
      const set = new Set(f.volume_liters_in.map(Number));
      result = result.filter(p => p.volume_liters !== undefined && set.has(Number(p.volume_liters)));
    }

    if (f.min_weight_kg !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.weight_kg) >= f.min_weight_kg);
    }
    if (f.max_weight_kg !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.weight_kg) <= f.max_weight_kg);
    }

    if (f.min_volume_liters !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.volume_liters) >= f.min_volume_liters);
    }
    if (f.max_volume_liters !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.volume_liters) <= f.max_volume_liters);
    }

    if (f.min_pack_count !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.pack_count) >= f.min_pack_count);
    }
    if (f.max_pack_count !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.pack_count) <= f.max_pack_count);
    }

    if (f.min_shelf_life_months !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.shelf_life_months) >= f.min_shelf_life_months);
    }
    if (f.max_shelf_life_months !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.shelf_life_months) <= f.max_shelf_life_months);
    }

    if (f.min_price !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.unit_price) >= f.min_price);
    }
    if (f.max_price !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.unit_price) <= f.max_price);
    }

    if (f.min_rating !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.rating_average) >= f.min_rating);
    }
    if (f.max_rating !== undefined) {
      result = result.filter(p => this._sanitizeNumber(p.rating_average) <= f.max_rating);
    }

    if (Array.isArray(f.tags_in) && f.tags_in.length) {
      const set = new Set(f.tags_in);
      result = result.filter(p => Array.isArray(p.tags) && p.tags.some(t => set.has(t)));
    }

    return { products: result, applied_filters: f };
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || typeof cart !== 'object' || Array.isArray(cart)) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem ids
        subtotal: 0,
        discount_total: 0,
        total: 0,
        promo_code_id: null,
        promo_code_value: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _findActivePromoCodeByCode(code, subtotal) {
    if (!code) return null;
    const promocodes = this._getFromStorage('promocodes', []);
    const normalizedCode = String(code).trim().toUpperCase();
    const now = new Date();
    const promo = promocodes.find(p => {
      if (!p || !p.is_active) return false;
      if (!p.code || String(p.code).toUpperCase() !== normalizedCode) return false;
      if (p.valid_from && Date.parse(p.valid_from) > now.getTime()) return false;
      if (p.valid_to && Date.parse(p.valid_to) < now.getTime()) return false;
      if (p.min_cart_subtotal !== undefined && p.min_cart_subtotal !== null) {
        const min = Number(p.min_cart_subtotal);
        if (Number.isFinite(min) && this._sanitizeNumber(subtotal) < min) return false;
      }
      return true;
    });
    return promo || null;
  }

  _applyPromoCodeToCart(cart, promoCode) {
    if (!cart) return cart;
    const subtotal = this._sanitizeNumber(cart.subtotal);
    let discount = 0;
    if (promoCode && promoCode.is_active) {
      if (promoCode.discount_type === 'percent') {
        const pct = this._sanitizeNumber(promoCode.discount_value);
        discount = subtotal * (pct / 100);
      } else if (promoCode.discount_type === 'fixed_amount') {
        discount = this._sanitizeNumber(promoCode.discount_value);
      }
    }
    if (discount < 0) discount = 0;
    if (discount > subtotal) discount = subtotal;

    cart.discount_total = discount;
    cart.total = subtotal - discount;
    if (promoCode) {
      cart.promo_code_id = promoCode.id;
      cart.promo_code_value = promoCode.code;
    }
    cart.updated_at = this._now();
    this._saveToStorage('cart', cart);
    return cart;
  }

  _recalculateCartTotals() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    let subtotal = 0;
    const itemIds = [];

    cartItems.forEach(item => {
      if (item.cart_id === cart.id) {
        const qty = this._sanitizeNumber(item.quantity);
        const price = this._sanitizeNumber(item.unit_price_snapshot);
        item.line_subtotal = qty * price;
        subtotal += item.line_subtotal;
        itemIds.push(item.id);
      }
    });

    cart.subtotal = subtotal;
    cart.items = itemIds;

    // Re-apply promo code if exists and still valid
    if (cart.promo_code_id) {
      const promocodes = this._getFromStorage('promocodes', []);
      const promo = promocodes.find(p => p.id === cart.promo_code_id && p.is_active);
      if (promo) {
        this._applyPromoCodeToCart(cart, promo);
      } else {
        cart.promo_code_id = null;
        cart.promo_code_value = null;
        cart.discount_total = 0;
        cart.total = subtotal;
        cart.updated_at = this._now();
        this._saveToStorage('cart', cart);
      }
    } else {
      cart.discount_total = 0;
      cart.total = subtotal;
      cart.updated_at = this._now();
      this._saveToStorage('cart', cart);
    }

    this._saveToStorage('cart_items', cartItems);
    return cart;
  }

  _buildCartItemsResponse(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const productMap = {};
    products.forEach(p => {
      if (p && p.id) productMap[p.id] = p;
    });

    const itemsForCart = cartItems.filter(item => item.cart_id === cart.id);

    return itemsForCart.map(item => {
      const product = productMap[item.product_id] || null;
      return {
        cart_item_id: item.id,
        product_id: item.product_id,
        product_name: item.product_name_snapshot,
        image_url: product && product.image_url ? product.image_url : null,
        unit_price: this._sanitizeNumber(item.unit_price_snapshot),
        quantity: this._sanitizeNumber(item.quantity),
        line_subtotal: this._sanitizeNumber(item.line_subtotal),
        selling_unit: product && product.selling_unit ? product.selling_unit : null,
        pack_size_label: product ? this._getPackSizeLabel(product) : null,
        // Foreign key resolution for frontend convenience
        product: product
      };
    });
  }

  _deriveCartCurrency(items) {
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const p = items[i].product;
        if (p && p.currency) return p.currency;
      }
    }
    return 'usd';
  }

  // ----------------------
  // Favorites helpers
  // ----------------------

  _getOrCreateFavoritesCollection() {
    let favorites = this._getFromStorage('favorites', null);
    if (!favorites || typeof favorites !== 'object') {
      favorites = {
        id: 'default_favorites',
        product_ids: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      this._saveToStorage('favorites', favorites);
    }
    return favorites;
  }

  // ----------------------
  // Compare helpers
  // ----------------------

  _getOrCreateCompareSession() {
    let sessions = this._getFromStorage('compare_sessions', []);
    if (!Array.isArray(sessions)) sessions = [];
    let session = sessions[0];
    if (!session) {
      session = {
        id: this._generateId('compare_session'),
        product_ids: [],
        created_at: this._now()
      };
      sessions.push(session);
      this._saveToStorage('compare_sessions', sessions);
    }
    return { session, sessions };
  }

  // ----------------------
  // Contact & Private Label persistence helpers
  // ----------------------

  _persistContactInquiry(params) {
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const inquiry = {
      id: this._generateId('contact_inquiry'),
      name: params.name,
      company: params.company || null,
      email: params.email,
      message: params.message,
      inquiry_type: params.inquiryType,
      related_sku: params.relatedSku || null,
      created_at: this._now()
    };
    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);
    return inquiry;
  }

  _persistPrivateLabelConfiguration(params) {
    let configs = this._getFromStorage('private_label_configurations', []);
    if (!Array.isArray(configs)) configs = [];

    let config;
    if (params.configurationId) {
      config = configs.find(c => c.id === params.configurationId);
      if (config) {
        config.product_line = params.product_line;
        config.packaging_type = params.packaging_type;
        config.pack_size_grams = params.pack_size_grams;
        config.pack_size_label = params.pack_size_label;
        config.minimum_order_quantity_units = params.minimum_order_quantity_units;
        config.notes = params.notes || null;
      }
    }

    if (!config) {
      config = {
        id: this._generateId('pl_config'),
        product_line: params.product_line,
        packaging_type: params.packaging_type,
        pack_size_grams: params.pack_size_grams,
        pack_size_label: params.pack_size_label,
        minimum_order_quantity_units: params.minimum_order_quantity_units,
        notes: params.notes || null,
        created_at: this._now()
      };
      configs.push(config);
    }

    this._saveToStorage('private_label_configurations', configs);
    return config;
  }

  _persistPrivateLabelQuoteRequest(params) {
    let requests = this._getFromStorage('private_label_quote_requests', []);
    if (!Array.isArray(requests)) requests = [];

    const request = {
      id: this._generateId('pl_quote'),
      configuration_id: params.configurationId,
      name: params.name,
      company: params.company,
      email: params.email,
      target_price_per_unit: params.target_price_per_unit,
      desired_delivery_date: params.desired_delivery_date,
      message: params.message,
      status: 'submitted',
      created_at: this._now(),
      updated_at: this._now()
    };

    requests.push(request);
    this._saveToStorage('private_label_quote_requests', requests);
    return request;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // 1. getCategoriesForNavigation()
  getCategoriesForNavigation() {
    const categories = this._getFromStorage('categories', []);
    return categories
      .filter(c => c && c.is_active)
      .sort((a, b) => {
        const sa = a.sort_order !== undefined ? a.sort_order : 0;
        const sb = b.sort_order !== undefined ? b.sort_order : 0;
        return sa - sb;
      });
  }

  // 2. getSubcategoriesForCategory(categorySlug)
  getSubcategoriesForCategory(categorySlug) {
    const slug = String(categorySlug || '');
    const subcategories = this._getFromStorage('subcategories', []);
    return subcategories
      .filter(s => s && s.is_active && s.parent_category_slug === slug)
      .sort((a, b) => {
        const sa = a.sort_order !== undefined ? a.sort_order : 0;
        const sb = b.sort_order !== undefined ? b.sort_order : 0;
        return sa - sb;
      });
  }

  // 3. getFeaturedProducts()
  getFeaturedProducts() {
    const products = this._getFromStorage('products', []);
    const active = products.filter(p => p && p.status === 'active');
    let featured = active.filter(p => Array.isArray(p.tags) && p.tags.indexOf('featured') !== -1);
    if (!featured.length) {
      // Fallback to best rated selection
      featured = this._applySort(active, 'best_rated');
    }
    return featured;
  }

  // 4. getPopularProducts()
  getPopularProducts() {
    const products = this._getFromStorage('products', []);
    const active = products.filter(p => p && p.status === 'active');
    let popular = active.filter(p => Array.isArray(p.tags) && p.tags.indexOf('best_seller') !== -1);
    if (!popular.length) {
      // Fallback to highest rating_count
      popular = active.slice().sort((a, b) => {
        const ca = this._sanitizeNumber(b.rating_count) - this._sanitizeNumber(a.rating_count);
        if (ca !== 0) return ca;
        return this._sanitizeNumber(b.rating_average) - this._sanitizeNumber(a.rating_average);
      });
    }
    return popular;
  }

  // 5. getCartSummary()
  getCartSummary() {
    const cart = this._getFromStorage('cart', null);
    if (!cart || typeof cart !== 'object') {
      return {
        item_count: 0,
        subtotal: 0,
        currency: 'usd'
      };
    }
    const updatedCart = this._recalculateCartTotals();
    const items = this._buildCartItemsResponse(updatedCart);
    let itemCount = 0;
    items.forEach(i => {
      itemCount += this._sanitizeNumber(i.quantity);
    });
    const currency = this._deriveCartCurrency(items);
    return {
      item_count: itemCount,
      subtotal: this._sanitizeNumber(updatedCart.subtotal),
      currency: currency
    };
  }

  // 6. getFavoritesSummary()
  getFavoritesSummary() {
    const favorites = this._getFromStorage('favorites', null);
    const total = favorites && Array.isArray(favorites.product_ids)
      ? favorites.product_ids.length
      : 0;
    return { total_favorites: total };
  }

  // 7. getCategoryFilterOptions(categorySlug, subcategorySlug)
  getCategoryFilterOptions(categorySlug, subcategorySlug) {
    const allProducts = this._getFromStorage('products', []);
    const filteredByCategory = this._filterProductsByCategoryAndSubcategory(
      allProducts.filter(p => p && p.status === 'active'),
      categorySlug,
      subcategorySlug
    );

    const products = filteredByCategory;

    const result = {
      dietary_allergens: [],
      sugar_content_options: [],
      flavor_options: [],
      packaging_type_options: [],
      packaging_format_options: [],
      volume_liter_options: [],
      pack_weight_ranges: [],
      pack_count_ranges: [],
      shelf_life_options: [],
      special_tag_options: [],
      price_range: {
        min_price: 0,
        max_price: 0,
        currency: 'usd'
      },
      rating_options: []
    };

    if (!products.length) {
      return result;
    }

    // Dietary & allergens
    if (products.some(p => p.is_gluten_free)) {
      result.dietary_allergens.push({ code: 'gluten_free', label: 'Gluten-Free' });
    }
    if (products.some(p => p.is_nut_free)) {
      result.dietary_allergens.push({ code: 'nut_free', label: 'Nut-Free' });
    }
    if (products.some(p => p.is_vegan)) {
      result.dietary_allergens.push({ code: 'vegan', label: 'Vegan' });
    }

    if (products.some(p => p.is_sugar_free)) {
      result.sugar_content_options.push({ code: 'sugar_free', label: 'Sugar-Free' });
    }

    // Flavor options
    const flavorSet = new Set();
    products.forEach(p => {
      if (p.flavor) flavorSet.add(p.flavor);
    });
    flavorSet.forEach(flavor => {
      result.flavor_options.push({
        value: flavor,
        label: this._toTitleFromEnum(flavor)
      });
    });

    // Packaging types
    const packagingTypeSet = new Set();
    products.forEach(p => {
      if (p.packaging_type) packagingTypeSet.add(p.packaging_type);
    });
    packagingTypeSet.forEach(value => {
      result.packaging_type_options.push({
        value: value,
        label: this._toTitleFromEnum(value)
      });
    });

    // Packaging formats
    const packagingFormatSet = new Set();
    products.forEach(p => {
      if (p.packaging_format) packagingFormatSet.add(p.packaging_format);
    });
    packagingFormatSet.forEach(value => {
      result.packaging_format_options.push({
        value: value,
        label: this._toTitleFromEnum(value)
      });
    });

    // Volume options
    const volumeSet = new Set();
    products.forEach(p => {
      if (p.volume_liters !== undefined && p.volume_liters !== null) {
        const v = Number(p.volume_liters);
        if (Number.isFinite(v)) volumeSet.add(v);
      }
    });
    Array.from(volumeSet)
      .sort((a, b) => a - b)
      .forEach(v => {
        result.volume_liter_options.push({ value: v, label: v + 'L' });
      });

    // Weight ranges (simple min-max range)
    const weights = products
      .map(p => (p.weight_kg !== undefined ? Number(p.weight_kg) : NaN))
      .filter(n => Number.isFinite(n));
    if (weights.length) {
      const minW = Math.min.apply(null, weights);
      const maxW = Math.max.apply(null, weights);
      result.pack_weight_ranges.push({
        min_weight_kg: minW,
        max_weight_kg: maxW,
        label: minW === maxW ? minW + 'kg' : minW + 'kg - ' + maxW + 'kg'
      });
    }

    // Pack count ranges
    const packCounts = products
      .map(p => (p.pack_count !== undefined ? Number(p.pack_count) : NaN))
      .filter(n => Number.isFinite(n));
    if (packCounts.length) {
      const minC = Math.min.apply(null, packCounts);
      const maxC = Math.max.apply(null, packCounts);
      result.pack_count_ranges.push({
        min_pack_count: minC,
        max_pack_count: maxC,
        label: minC === maxC ? String(minC) : minC + '+ units'
      });
    }

    // Shelf life
    const shelfLives = products
      .map(p => (p.shelf_life_months !== undefined ? Number(p.shelf_life_months) : NaN))
      .filter(n => Number.isFinite(n));
    if (shelfLives.length) {
      const minSL = Math.min.apply(null, shelfLives);
      const maxSL = Math.max.apply(null, shelfLives);
      result.shelf_life_options.push({
        min_shelf_life_months: minSL,
        max_shelf_life_months: maxSL,
        label: minSL === maxSL ? minSL + ' months' : minSL + '+ months'
      });
    }

    // Special tags
    const tagSet = new Set();
    products.forEach(p => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach(t => tagSet.add(t));
      }
    });
    tagSet.forEach(code => {
      result.special_tag_options.push({
        code: code,
        label: this._toTitleFromEnum(code)
      });
    });

    // Price range
    const prices = products
      .map(p => (p.unit_price !== undefined ? Number(p.unit_price) : NaN))
      .filter(n => Number.isFinite(n));
    if (prices.length) {
      result.price_range.min_price = Math.min.apply(null, prices);
      result.price_range.max_price = Math.max.apply(null, prices);
      result.price_range.currency = 'usd';
    }

    // Rating options based on max rating
    const ratings = products
      .map(p => (p.rating_average !== undefined ? Number(p.rating_average) : NaN))
      .filter(n => Number.isFinite(n));
    if (ratings.length) {
      const maxRating = Math.max.apply(null, ratings);
      const thresholds = [3.5, 4.0, 4.5];
      thresholds.forEach(t => {
        if (maxRating >= t) {
          result.rating_options.push({
            min_rating: t,
            label: t + ' stars & up'
          });
        }
      });
    }

    return result;
  }

  // 8. getCategoryProducts(categorySlug, subcategorySlug, sort, page, pageSize, filters)
  getCategoryProducts(categorySlug, subcategorySlug, sort, page, pageSize, filters) {
    const catSlug = categorySlug || null;
    const subSlug = subcategorySlug || null;
    const sortMode = sort || 'relevance';
    const currentPage = page && page > 0 ? Math.floor(page) : 1;
    const size = pageSize && pageSize > 0 ? Math.floor(pageSize) : 20;

    const allProducts = this._getFromStorage('products', []);
    let products = this._filterProductsByCategoryAndSubcategory(
      allProducts.filter(p => p && p.status === 'active'),
      catSlug,
      subSlug
    );

    const filteredRes = this._applyFiltersToProducts(products, filters || {});
    products = filteredRes.products;

    const sorted = this._applySort(products, sortMode);
    const totalCount = sorted.length;
    const startIndex = (currentPage - 1) * size;
    const pageItems = sorted.slice(startIndex, startIndex + size);

    const categories = this._getFromStorage('categories', []);
    const subcategories = this._getFromStorage('subcategories', []);

    const categoryObj = catSlug
      ? categories.find(c => c.slug === catSlug) || null
      : null;
    const subcategoryObj = subSlug
      ? subcategories.find(s => s.slug === subSlug) || null
      : null;

    return {
      category: categoryObj
        ? { id: categoryObj.id, slug: categoryObj.slug, name: categoryObj.name }
        : null,
      subcategory: subcategoryObj
        ? { id: subcategoryObj.id, slug: subcategoryObj.slug, name: subcategoryObj.name }
        : null,
      products: pageItems,
      total_count: totalCount,
      page: currentPage,
      page_size: size,
      applied_filters: filteredRes.applied_filters
    };
  }

  // 9. getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        subcategory: null,
        is_favorite: false
      };
    }

    const categories = this._getFromStorage('categories', []);
    const subcategories = this._getFromStorage('subcategories', []);
    const favorites = this._getOrCreateFavoritesCollection();

    const categoryObj = categories.find(c => c.slug === product.category_slug) || null;
    const subcategoryObj = subcategories.find(s => s.slug === product.subcategory_slug) || null;

    const isFavorite = Array.isArray(favorites.product_ids)
      ? favorites.product_ids.indexOf(product.id) !== -1
      : false;

    return {
      product: product,
      category: categoryObj
        ? { id: categoryObj.id, slug: categoryObj.slug, name: categoryObj.name }
        : null,
      subcategory: subcategoryObj
        ? { id: subcategoryObj.id, slug: subcategoryObj.slug, name: subcategoryObj.name }
        : null,
      is_favorite: isFavorite
    };
  }

  // 10. addToCart(productId, quantity)
  addToCart(productId, quantity) {
    const qty = quantity && quantity > 0 ? Math.floor(quantity) : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product || product.status !== 'active') {
      return {
        success: false,
        cart_id: null,
        message: 'Product not found or inactive',
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];

    let item = cartItems.find(ci => ci.cart_id === cart.id && ci.product_id === productId);
    if (item) {
      item.quantity = this._sanitizeNumber(item.quantity) + qty;
      item.updated_at = this._now();
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        unit_price_snapshot: this._sanitizeNumber(product.unit_price),
        quantity: qty,
        line_subtotal: this._sanitizeNumber(product.unit_price) * qty,
        created_at: this._now(),
        updated_at: this._now()
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals();
    const items = this._buildCartItemsResponse(updatedCart);

    return {
      success: true,
      cart_id: updatedCart.id,
      message: 'Added to cart',
      cart: {
        id: updatedCart.id,
        items: items,
        subtotal: this._sanitizeNumber(updatedCart.subtotal),
        discount_total: this._sanitizeNumber(updatedCart.discount_total),
        total: this._sanitizeNumber(updatedCart.total),
        promo_code_value: updatedCart.promo_code_value || null
      }
    };
  }

  // 11. getCartDetails()
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals();
    const items = this._buildCartItemsResponse(updatedCart);

    const promocodes = this._getFromStorage('promocodes', []);
    const promo = updatedCart.promo_code_id
      ? promocodes.find(p => p.id === updatedCart.promo_code_id) || null
      : null;

    const currency = this._deriveCartCurrency(items);

    return {
      cart_id: updatedCart.id,
      items: items,
      subtotal: this._sanitizeNumber(updatedCart.subtotal),
      discount_total: this._sanitizeNumber(updatedCart.discount_total),
      total: this._sanitizeNumber(updatedCart.total),
      promo_code_value: updatedCart.promo_code_value || null,
      promo_code_description: promo && promo.description ? promo.description : null,
      currency: currency
    };
  }

  // 12. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const newQty = quantity && quantity > 0 ? Math.floor(quantity) : 0;
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];

    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      const updatedCart = this._recalculateCartTotals();
      const items = this._buildCartItemsResponse(updatedCart);
      return {
        success: false,
        message: 'Cart item not found',
        cart: {
          cart_id: updatedCart.id,
          items: items,
          subtotal: this._sanitizeNumber(updatedCart.subtotal),
          discount_total: this._sanitizeNumber(updatedCart.discount_total),
          total: this._sanitizeNumber(updatedCart.total),
          promo_code_value: updatedCart.promo_code_value || null,
          promo_code_description: null
        }
      };
    }

    if (newQty <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItems[idx].quantity = newQty;
      cartItems[idx].updated_at = this._now();
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals();
    const items = this._buildCartItemsResponse(updatedCart);
    const promocodes = this._getFromStorage('promocodes', []);
    const promo = updatedCart.promo_code_id
      ? promocodes.find(p => p.id === updatedCart.promo_code_id) || null
      : null;

    return {
      success: true,
      message: 'Cart updated',
      cart: {
        cart_id: updatedCart.id,
        items: items,
        subtotal: this._sanitizeNumber(updatedCart.subtotal),
        discount_total: this._sanitizeNumber(updatedCart.discount_total),
        total: this._sanitizeNumber(updatedCart.total),
        promo_code_value: updatedCart.promo_code_value || null,
        promo_code_description: promo && promo.description ? promo.description : null
      }
    };
  }

  // 13. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    if (!Array.isArray(cartItems)) cartItems = [];
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      const updatedCart = this._recalculateCartTotals();
      const items = this._buildCartItemsResponse(updatedCart);
      return {
        success: false,
        message: 'Cart item not found',
        cart: {
          cart_id: updatedCart.id,
          items: items,
          subtotal: this._sanitizeNumber(updatedCart.subtotal),
          discount_total: this._sanitizeNumber(updatedCart.discount_total),
          total: this._sanitizeNumber(updatedCart.total),
          promo_code_value: updatedCart.promo_code_value || null,
          promo_code_description: null
        }
      };
    }

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals();
    const items = this._buildCartItemsResponse(updatedCart);
    const promocodes = this._getFromStorage('promocodes', []);
    const promo = updatedCart.promo_code_id
      ? promocodes.find(p => p.id === updatedCart.promo_code_id) || null
      : null;

    return {
      success: true,
      message: 'Item removed',
      cart: {
        cart_id: updatedCart.id,
        items: items,
        subtotal: this._sanitizeNumber(updatedCart.subtotal),
        discount_total: this._sanitizeNumber(updatedCart.discount_total),
        total: this._sanitizeNumber(updatedCart.total),
        promo_code_value: updatedCart.promo_code_value || null,
        promo_code_description: promo && promo.description ? promo.description : null
      }
    };
  }

  // 14. applyPromoCode(code)
  applyPromoCode(code) {
    const cart = this._getOrCreateCart();
    const recalcedCart = this._recalculateCartTotals();
    const subtotal = this._sanitizeNumber(recalcedCart.subtotal);
    const promo = this._findActivePromoCodeByCode(code, subtotal);

    if (!promo) {
      const items = this._buildCartItemsResponse(recalcedCart);
      const promocodes = this._getFromStorage('promocodes', []);
      const existingPromo = recalcedCart.promo_code_id
        ? promocodes.find(p => p.id === recalcedCart.promo_code_id) || null
        : null;
      return {
        success: false,
        message: 'Invalid or ineligible promo code',
        cart: {
          cart_id: recalcedCart.id,
          items: items,
          subtotal: this._sanitizeNumber(recalcedCart.subtotal),
          discount_total: this._sanitizeNumber(recalcedCart.discount_total),
          total: this._sanitizeNumber(recalcedCart.total),
          promo_code_value: recalcedCart.promo_code_value || null,
          promo_code_description: existingPromo && existingPromo.description ? existingPromo.description : null
        }
      };
    }

    const updatedCart = this._applyPromoCodeToCart(recalcedCart, promo);
    const items = this._buildCartItemsResponse(updatedCart);

    return {
      success: true,
      message: 'Promo code applied',
      cart: {
        cart_id: updatedCart.id,
        items: items,
        subtotal: this._sanitizeNumber(updatedCart.subtotal),
        discount_total: this._sanitizeNumber(updatedCart.discount_total),
        total: this._sanitizeNumber(updatedCart.total),
        promo_code_value: updatedCart.promo_code_value || null,
        promo_code_description: promo.description || null
      }
    };
  }

  // 15. removePromoCode()
  removePromoCode() {
    const cart = this._getOrCreateCart();
    cart.promo_code_id = null;
    cart.promo_code_value = null;
    cart.discount_total = 0;
    cart.total = this._sanitizeNumber(cart.subtotal);
    cart.updated_at = this._now();
    this._saveToStorage('cart', cart);

    const updatedCart = this._recalculateCartTotals();
    const items = this._buildCartItemsResponse(updatedCart);

    return {
      success: true,
      message: 'Promo code removed',
      cart: {
        cart_id: updatedCart.id,
        items: items,
        subtotal: this._sanitizeNumber(updatedCart.subtotal),
        discount_total: this._sanitizeNumber(updatedCart.discount_total),
        total: this._sanitizeNumber(updatedCart.total),
        promo_code_value: updatedCart.promo_code_value || null,
        promo_code_description: null
      }
    };
  }

  // 16. searchProducts(query, sort, page, pageSize, filters)
  searchProducts(query, sort, page, pageSize, filters) {
    const q = (query || '').trim().toLowerCase();
    const sortMode = sort || 'relevance';
    const currentPage = page && page > 0 ? Math.floor(page) : 1;
    const size = pageSize && pageSize > 0 ? Math.floor(pageSize) : 20;

    const allProducts = this._getFromStorage('products', []);
    let products = allProducts.filter(p => p && p.status === 'active');

    if (q) {
      products = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const ing = (p.ingredients || '').toLowerCase();
        return (
          name.indexOf(q) !== -1 ||
          desc.indexOf(q) !== -1 ||
          ing.indexOf(q) !== -1
        );
      });
    }

    const filterObj = filters || {};
    // category_slug filter for search
    if (filterObj.category_slug) {
      products = this._filterProductsByCategoryAndSubcategory(
        products,
        filterObj.category_slug,
        null
      );
    }

    const filteredRes = this._applyFiltersToProducts(products, filterObj);
    products = filteredRes.products;

    const sorted = this._applySort(products, sortMode);
    const totalCount = sorted.length;
    const startIndex = (currentPage - 1) * size;
    const pageItems = sorted.slice(startIndex, startIndex + size);

    return {
      query: query,
      products: pageItems,
      total_count: totalCount,
      page: currentPage,
      page_size: size,
      applied_filters: filteredRes.applied_filters
    };
  }

  // 17. getSearchFilterOptions(query)
  getSearchFilterOptions(query) {
    const q = (query || '').trim().toLowerCase();
    const allProducts = this._getFromStorage('products', []);
    let products = allProducts.filter(p => p && p.status === 'active');

    if (q) {
      products = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const ing = (p.ingredients || '').toLowerCase();
        return (
          name.indexOf(q) !== -1 ||
          desc.indexOf(q) !== -1 ||
          ing.indexOf(q) !== -1
        );
      });
    }

    const categories = this._getFromStorage('categories', []);

    const categoryCountsMap = {};
    products.forEach(p => {
      const slug = p.category_slug || 'all_products';
      categoryCountsMap[slug] = (categoryCountsMap[slug] || 0) + 1;
    });

    const categoriesFacet = Object.keys(categoryCountsMap).map(slug => {
      const cat = categories.find(c => c.slug === slug) || null;
      return {
        slug: slug,
        name: cat ? cat.name : this._toTitleFromEnum(slug),
        product_count: categoryCountsMap[slug]
      };
    });

    const dietary_allergens = [];
    const glutenCount = products.filter(p => p.is_gluten_free).length;
    const nutCount = products.filter(p => p.is_nut_free).length;
    const veganCount = products.filter(p => p.is_vegan).length;

    if (glutenCount) {
      dietary_allergens.push({ code: 'gluten_free', label: 'Gluten-Free', product_count: glutenCount });
    }
    if (nutCount) {
      dietary_allergens.push({ code: 'nut_free', label: 'Nut-Free', product_count: nutCount });
    }
    if (veganCount) {
      dietary_allergens.push({ code: 'vegan', label: 'Vegan', product_count: veganCount });
    }

    const prices = products
      .map(p => (p.unit_price !== undefined ? Number(p.unit_price) : NaN))
      .filter(n => Number.isFinite(n));
    const price_range = {
      min_price: prices.length ? Math.min.apply(null, prices) : 0,
      max_price: prices.length ? Math.max.apply(null, prices) : 0,
      currency: 'usd'
    };

    const ratings = products
      .map(p => (p.rating_average !== undefined ? Number(p.rating_average) : NaN))
      .filter(n => Number.isFinite(n));
    const rating_options = [];
    if (ratings.length) {
      const maxRating = Math.max.apply(null, ratings);
      const thresholds = [3.5, 4.0, 4.5];
      thresholds.forEach(t => {
        if (maxRating >= t) {
          rating_options.push({ min_rating: t, label: t + ' stars & up' });
        }
      });
    }

    return {
      categories: categoriesFacet,
      dietary_allergens: dietary_allergens,
      price_range: price_range,
      rating_options: rating_options
    };
  }

  // 18. addProductToCompare(productId)
  addProductToCompare(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      const { session } = this._getOrCreateCompareSession();
      return {
        compare_session_id: session.id,
        product_ids: session.product_ids.slice(),
        product_count: session.product_ids.length,
        success: false,
        message: 'Product not found'
      };
    }

    const { session, sessions } = this._getOrCreateCompareSession();
    const ids = Array.isArray(session.product_ids) ? session.product_ids : [];
    if (ids.indexOf(productId) === -1) {
      ids.push(productId);
      session.product_ids = ids;
      this._saveToStorage('compare_sessions', sessions);
    }

    return {
      compare_session_id: session.id,
      product_ids: session.product_ids.slice(),
      product_count: session.product_ids.length,
      success: true,
      message: 'Product added to compare'
    };
  }

  // 19. removeProductFromCompare(productId)
  removeProductFromCompare(productId) {
    const { session, sessions } = this._getOrCreateCompareSession();
    let ids = Array.isArray(session.product_ids) ? session.product_ids.slice() : [];
    ids = ids.filter(id => id !== productId);
    session.product_ids = ids;
    this._saveToStorage('compare_sessions', sessions);

    return {
      compare_session_id: session.id,
      product_ids: session.product_ids.slice(),
      product_count: session.product_ids.length,
      success: true,
      message: 'Product removed from compare'
    };
  }

  // 20. clearCompareSession()
  clearCompareSession() {
    const { session, sessions } = this._getOrCreateCompareSession();
    session.product_ids = [];
    this._saveToStorage('compare_sessions', sessions);
    return {
      compare_session_id: session.id,
      success: true,
      message: 'Comparison cleared'
    };
  }

  // 21. getCompareSessionDetails()
  getCompareSessionDetails() {
    const { session } = this._getOrCreateCompareSession();
    const products = this._getFromStorage('products', []);
    const productMap = {};
    products.forEach(p => {
      if (p && p.id) productMap[p.id] = p;
    });

    const list = Array.isArray(session.product_ids)
      ? session.product_ids.map(id => productMap[id]).filter(Boolean)
      : [];

    return {
      compare_session_id: session.id,
      created_at: session.created_at,
      products: list
    };
  }

  // 22. addProductToFavorites(productId)
  addProductToFavorites(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    const favorites = this._getOrCreateFavoritesCollection();

    if (!product) {
      return {
        favorites_collection_id: favorites.id,
        favorites_product_ids: favorites.product_ids.slice(),
        total_favorites: favorites.product_ids.length,
        success: false,
        message: 'Product not found'
      };
    }

    if (!Array.isArray(favorites.product_ids)) {
      favorites.product_ids = [];
    }
    if (favorites.product_ids.indexOf(productId) === -1) {
      favorites.product_ids.push(productId);
      favorites.updated_at = this._now();
      this._saveToStorage('favorites', favorites);
    }

    return {
      favorites_collection_id: favorites.id,
      favorites_product_ids: favorites.product_ids.slice(),
      total_favorites: favorites.product_ids.length,
      success: true,
      message: 'Product added to favorites'
    };
  }

  // 23. removeProductFromFavorites(productId)
  removeProductFromFavorites(productId) {
    const favorites = this._getOrCreateFavoritesCollection();
    if (!Array.isArray(favorites.product_ids)) {
      favorites.product_ids = [];
    }
    const newIds = favorites.product_ids.filter(id => id !== productId);
    favorites.product_ids = newIds;
    favorites.updated_at = this._now();
    this._saveToStorage('favorites', favorites);

    return {
      favorites_collection_id: favorites.id,
      favorites_product_ids: favorites.product_ids.slice(),
      total_favorites: favorites.product_ids.length,
      success: true,
      message: 'Product removed from favorites'
    };
  }

  // 24. getFavoritesList()
  getFavoritesList() {
    const favorites = this._getOrCreateFavoritesCollection();
    const products = this._getFromStorage('products', []);
    const productMap = {};
    products.forEach(p => {
      if (p && p.id) productMap[p.id] = p;
    });

    const list = Array.isArray(favorites.product_ids)
      ? favorites.product_ids.map(id => productMap[id]).filter(Boolean)
      : [];

    return {
      favorites_collection_id: favorites.id,
      products: list,
      total_count: list.length
    };
  }

  // 25. submitContactInquiry(name, company, email, inquiryType, message, relatedSku)
  submitContactInquiry(name, company, email, inquiryType, message, relatedSku) {
    if (!name || !email || !inquiryType || !message) {
      return {
        inquiry_id: null,
        success: false,
        message: 'Missing required fields'
      };
    }

    const allowedTypes = [
      'request_technical_datasheet',
      'general_sales_inquiry',
      'private_label_inquiry',
      'other'
    ];
    const type = allowedTypes.indexOf(inquiryType) !== -1 ? inquiryType : 'other';

    const inquiry = this._persistContactInquiry({
      name: name,
      company: company,
      email: email,
      inquiryType: type,
      message: message,
      relatedSku: relatedSku
    });

    return {
      inquiry_id: inquiry.id,
      success: true,
      message: 'Your inquiry has been submitted.'
    };
  }

  // 26. getInquiryTypes()
  getInquiryTypes() {
    return [
      {
        code: 'request_technical_datasheet',
        label: 'Request Technical Datasheet',
        description: 'Request product technical or specification datasheets.'
      },
      {
        code: 'general_sales_inquiry',
        label: 'General Sales Inquiry',
        description: 'Ask about pricing, availability, or general sales questions.'
      },
      {
        code: 'private_label_inquiry',
        label: 'Private Label Inquiry',
        description: 'Discuss private label opportunities and custom products.'
      },
      {
        code: 'other',
        label: 'Other',
        description: 'Any other type of inquiry.'
      }
    ];
  }

  // 27. getPrivateLabelProductLines()
  getPrivateLabelProductLines() {
    return [
      {
        product_line_code: 'breakfast_cereals',
        name: 'Breakfast Cereals',
        description: 'Private label cereal options in various pack sizes and formats.',
        supported_packaging_types: ['bag', 'box'],
        supported_pack_sizes_grams: [500, 750, 1000]
      },
      {
        product_line_code: 'snacks',
        name: 'Snacks',
        description: 'Chips, bars, and snack mixes for private label.',
        supported_packaging_types: ['bag', 'box'],
        supported_pack_sizes_grams: [30, 50, 100]
      },
      {
        product_line_code: 'beverages',
        name: 'Beverages',
        description: 'Syrups, concentrates, and ready-to-drink beverages.',
        supported_packaging_types: ['bottle'],
        supported_pack_sizes_grams: []
      },
      {
        product_line_code: 'sauces',
        name: 'Sauces',
        description: 'Tomato sauces, condiments, and culinary sauces.',
        supported_packaging_types: ['pouch', 'bucket'],
        supported_pack_sizes_grams: []
      }
    ];
  }

  // 28. createOrUpdatePrivateLabelConfiguration(configurationId, product_line, packaging_type, pack_size_grams, pack_size_label, minimum_order_quantity_units, notes)
  createOrUpdatePrivateLabelConfiguration(
    configurationId,
    product_line,
    packaging_type,
    pack_size_grams,
    pack_size_label,
    minimum_order_quantity_units,
    notes
  ) {
    if (!product_line || !packaging_type || !minimum_order_quantity_units) {
      return {
        configuration_id: null,
        configuration: null,
        success: false,
        message: 'Missing required fields'
      };
    }

    const config = this._persistPrivateLabelConfiguration({
      configurationId: configurationId,
      product_line: product_line,
      packaging_type: packaging_type,
      pack_size_grams: pack_size_grams !== undefined ? Number(pack_size_grams) : undefined,
      pack_size_label: pack_size_label || null,
      minimum_order_quantity_units: Number(minimum_order_quantity_units),
      notes: notes || null
    });

    return {
      configuration_id: config.id,
      configuration: config,
      success: true,
      message: 'Configuration saved'
    };
  }

  // 29. getPrivateLabelConfiguration(configurationId)
  getPrivateLabelConfiguration(configurationId) {
    const configs = this._getFromStorage('private_label_configurations', []);
    const config = configs.find(c => c.id === configurationId) || null;
    return { configuration: config };
  }

  // 30. submitPrivateLabelQuoteRequest(configurationId, name, company, email, target_price_per_unit, desired_delivery_date, message)
  submitPrivateLabelQuoteRequest(
    configurationId,
    name,
    company,
    email,
    target_price_per_unit,
    desired_delivery_date,
    message
  ) {
    if (!configurationId || !name || !company || !email || !target_price_per_unit || !desired_delivery_date || !message) {
      return {
        quote_request_id: null,
        status: 'draft',
        success: false,
        message: 'Missing required fields'
      };
    }

    const configs = this._getFromStorage('private_label_configurations', []);
    const config = configs.find(c => c.id === configurationId) || null;
    if (!config) {
      return {
        quote_request_id: null,
        status: 'draft',
        success: false,
        message: 'Configuration not found'
      };
    }

    const request = this._persistPrivateLabelQuoteRequest({
      configurationId: configurationId,
      name: name,
      company: company,
      email: email,
      target_price_per_unit: Number(target_price_per_unit),
      desired_delivery_date: desired_delivery_date,
      message: message
    });

    return {
      quote_request_id: request.id,
      status: request.status,
      success: true,
      message: 'Quote request submitted'
    };
  }

  // 31. getInformationalPageContent(pageSlug)
  getInformationalPageContent(pageSlug) {
    const slug = String(pageSlug || '').toLowerCase();
    const pages = this._getFromStorage('informational_pages', []);
    const page = pages.find(p => p.page_slug === slug) || null;
    if (!page) {
      return {
        page_slug: slug,
        title: this._toTitleFromEnum(slug || 'information'),
        sections: []
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
