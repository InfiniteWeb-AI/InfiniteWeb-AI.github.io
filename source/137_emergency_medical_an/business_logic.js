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

  // Initialization and storage helpers
  _initStorage() {
    // Global id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Core entity tables (arrays)
    const arrayKeys = [
      'products',
      'brands',
      'categories',
      'cart',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'comparison_lists',
      'comparison_items',
      'services',
      'service_bookings',
      'quote_requests',
      'shipping_methods',
      'orders',
      'order_items',
      'pages',
      'navigation_links',
      'faq_entries',
      'policy_documents',
      'contact_tickets'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    // Content and info objects
    if (!localStorage.getItem('about_us_content')) {
      localStorage.setItem('about_us_content', JSON.stringify({ title: '', body_html: '', last_updated: null }));
    }
    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem(
        'contact_info',
        JSON.stringify({ phone_numbers: [], email_addresses: [], locations: [] })
      );
    }

    // Optional legacy keys from example (not used but kept for compatibility)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', '[]');
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', '[]');
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', '[]');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
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

  _nowIso() {
    return new Date().toISOString();
  }

  // Helper: get or create single cart for current user
  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let currentCartId = localStorage.getItem('current_cart_id');
    let cart = null;

    if (currentCartId) {
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === currentCartId) {
          cart = carts[i];
          break;
        }
      }
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of cart_item ids
        subtotal: 0,
        shipping_cost: 0,
        tax: 0,
        total: 0,
        currency: 'usd',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      localStorage.setItem('current_cart_id', cart.id);
      this._saveToStorage('cart', carts);
    }

    return cart;
  }

  // Helper: recalculate cart totals from its items
  _recalculateCartTotals(cartId) {
    let carts = this._getFromStorage('cart', []);
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cartId) {
        cart = carts[i];
        break;
      }
    }
    if (!cart) return;

    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    let subtotal = 0;
    let currency = cart.currency || 'usd';

    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cart_id !== cartId) continue;
      const lineTotal = typeof item.line_total === 'number'
        ? item.line_total
        : (item.unit_price || 0) * (item.quantity || 0);
      subtotal += lineTotal;
      if (!currency) {
        // Try to infer from product
        for (let j = 0; j < products.length; j++) {
          if (products[j].id === item.product_id) {
            currency = products[j].currency || 'usd';
            break;
          }
        }
      }
    }

    cart.subtotal = subtotal;
    // For this implementation, keep tax at 0 and shipping_cost as is (estimate)
    if (typeof cart.shipping_cost !== 'number') cart.shipping_cost = 0;
    if (typeof cart.tax !== 'number') cart.tax = 0;
    cart.total = cart.subtotal + cart.shipping_cost + cart.tax;
    cart.currency = currency || 'usd';
    cart.updated_at = this._nowIso();

    this._saveToStorage('cart', carts);
  }

  // Helper: build cart response with resolved product references
  _buildCartResponse(cart) {
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        shipping_cost_estimate: 0,
        tax_estimate: 0,
        total_estimate: 0,
        currency: 'usd'
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const brands = this._getFromStorage('brands', []);

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id !== cart.id) continue;
      let product = null;
      for (let j = 0; j < products.length; j++) {
        if (products[j].id === ci.product_id) {
          product = products[j];
          break;
        }
      }
      let categoryName = null;
      let brandName = null;
      let imageUrl = null;
      let currency = cart.currency || 'usd';
      let unitLabel = null;
      if (product) {
        imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
        currency = product.currency || currency;
        unitLabel = product.unit_label || null;
        for (let cIndex = 0; cIndex < categories.length; cIndex++) {
          if (categories[cIndex].id === product.category_id) {
            categoryName = categories[cIndex].name;
            break;
          }
        }
        for (let bIndex = 0; bIndex < brands.length; bIndex++) {
          if (brands[bIndex].id === product.brand_id) {
            brandName = brands[bIndex].name;
            break;
          }
        }
      }

      items.push({
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: product ? product.name : null,
        selected_size: ci.selected_size || null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        currency: currency,
        image_url: imageUrl,
        category_name: categoryName,
        brand_name: brandName,
        unit_label: unitLabel,
        product: product || null
      });
    }

    return {
      cart_id: cart.id,
      items: items,
      subtotal: cart.subtotal || 0,
      shipping_cost_estimate: typeof cart.shipping_cost === 'number' ? cart.shipping_cost : 0,
      tax_estimate: typeof cart.tax === 'number' ? cart.tax : 0,
      total_estimate: typeof cart.total === 'number' ? cart.total : (cart.subtotal || 0),
      currency: cart.currency || 'usd'
    };
  }

  // Helper: get or create wishlist for current user
  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    let currentWishlistId = localStorage.getItem('current_wishlist_id');
    let wishlist = null;

    if (currentWishlistId) {
      for (let i = 0; i < wishlists.length; i++) {
        if (wishlists[i].id === currentWishlistId) {
          wishlist = wishlists[i];
          break;
        }
      }
    }

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        items: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      wishlists.push(wishlist);
      localStorage.setItem('current_wishlist_id', wishlist.id);
      this._saveToStorage('wishlists', wishlists);
    }

    return wishlist;
  }

  // Helper: get or create comparison list for current user
  _getOrCreateComparisonList() {
    let lists = this._getFromStorage('comparison_lists', []);
    let currentId = localStorage.getItem('current_comparison_list_id');
    let list = null;

    if (currentId) {
      for (let i = 0; i < lists.length; i++) {
        if (lists[i].id === currentId) {
          list = lists[i];
          break;
        }
      }
    }

    if (!list) {
      list = {
        id: this._generateId('comparison'),
        items: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      lists.push(list);
      localStorage.setItem('current_comparison_list_id', list.id);
      this._saveToStorage('comparison_lists', lists);
    }

    return list;
  }

  // Helper: validate service date within next 30 days
  _validateServiceDateWithin30Days(serviceDateStr) {
    if (!serviceDateStr) return false;
    const requested = new Date(serviceDateStr);
    if (isNaN(requested.getTime())) return false;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const max = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    return requested >= start && requested <= max;
  }

  // Helper: apply non-hierarchical product filters
  _applyProductFilters(products, filters) {
    if (!filters) return products;
    const result = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      let pass = true;

      if (filters.minPrice != null && typeof p.price === 'number' && p.price < filters.minPrice) pass = false;
      if (filters.maxPrice != null && typeof p.price === 'number' && p.price > filters.maxPrice) pass = false;

      if (filters.minRating != null) {
        const rating = typeof p.rating === 'number' ? p.rating : 0;
        if (rating < filters.minRating) pass = false;
      }

      if (filters.freeShippingOnly) {
        if (!p.is_free_shipping_eligible) pass = false;
      }

      if (filters.brandId) {
        if (p.brand_id !== filters.brandId) pass = false;
      }

      if (filters.material) {
        if (p.material !== filters.material) pass = false;
      }

      if (filters.size) {
        const sizes = Array.isArray(p.available_sizes) ? p.available_sizes : [];
        if (sizes.indexOf(filters.size) === -1) pass = false;
      }

      if (filters.minWeightLb != null) {
        if (typeof p.weight_lb !== 'number' || p.weight_lb < filters.minWeightLb) pass = false;
      }
      if (filters.maxWeightLb != null) {
        if (typeof p.weight_lb !== 'number' || p.weight_lb > filters.maxWeightLb) pass = false;
      }

      if (filters.cameraCountMin != null) {
        if (typeof p.camera_count !== 'number' || p.camera_count < filters.cameraCountMin) pass = false;
      }
      if (filters.cameraCountMax != null) {
        if (typeof p.camera_count !== 'number' || p.camera_count > filters.cameraCountMax) pass = false;
      }

      if (filters.supportsMobileApp === true) {
        if (!p.supports_mobile_app) pass = false;
      }

      if (filters.isSmartSystem === true) {
        if (!p.is_smart_system) pass = false;
      }

      if (filters.includesBattery === true) {
        if (!p.includes_battery) pass = false;
      }

      if (filters.extinguisherType) {
        if (p.extinguisher_type !== filters.extinguisherType) pass = false;
      }

      if (filters.extinguisherCapacityMinLb != null) {
        if (
          typeof p.extinguisher_capacity_lb !== 'number' ||
          p.extinguisher_capacity_lb < filters.extinguisherCapacityMinLb
        ) {
          pass = false;
        }
      }

      if (filters.extinguisherCapacityMaxLb != null) {
        if (
          typeof p.extinguisher_capacity_lb !== 'number' ||
          p.extinguisher_capacity_lb > filters.extinguisherCapacityMaxLb
        ) {
          pass = false;
        }
      }

      if (pass) result.push(p);
    }
    return result;
  }

  // Helper: hierarchical category filter for a product
  _isProductInCategoryScope(product, categoryId, subcategoryId, categories) {
    if (!categoryId && !subcategoryId) return true;

    let subcategoriesUnderCategory = [];
    if (categoryId) {
      for (let i = 0; i < categories.length; i++) {
        if (categories[i].parent_id === categoryId) {
          subcategoriesUnderCategory.push(categories[i].id);
        }
      }
    }

    if (categoryId && subcategoryId) {
      // Both given: match both
      if (product.category_id !== categoryId) return false;
      if (product.subcategory_id && product.subcategory_id === subcategoryId) return true;
      if (product.category_id === subcategoryId) return true;
      return false;
    }

    if (subcategoryId && !categoryId) {
      // Only subcategory given: match either subcategory_id or category_id
      if (product.subcategory_id === subcategoryId) return true;
      if (product.category_id === subcategoryId) return true;
      return false;
    }

    if (categoryId && !subcategoryId) {
      if (product.category_id === categoryId) return true;
      if (product.subcategory_id && subcategoriesUnderCategory.indexOf(product.subcategory_id) !== -1) return true;
      return false;
    }

    return true;
  }

  // Helper: search products by keyword
  _searchProductsByQuery(query) {
    const q = (query || '').toLowerCase().trim();
    const products = this._getFromStorage('products', []);
    if (!q) return products.slice();
    const matched = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.status && p.status !== 'active') continue;
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      let featuresText = '';
      if (Array.isArray(p.features)) {
        featuresText = p.features.join(' ').toLowerCase();
      }
      if (name.indexOf(q) !== -1 || desc.indexOf(q) !== -1 || featuresText.indexOf(q) !== -1) {
        matched.push(p);
      }
    }
    return matched;
  }

  // Helper: weight ranges for filter options
  _buildWeightRanges(products) {
    const weights = [];
    for (let i = 0; i < products.length; i++) {
      const w = products[i].weight_lb;
      if (typeof w === 'number' && !isNaN(w)) weights.push(w);
    }
    if (!weights.length) return [];
    let min = weights[0];
    let max = weights[0];
    for (let i = 1; i < weights.length; i++) {
      if (weights[i] < min) min = weights[i];
      if (weights[i] > max) max = weights[i];
    }
    if (min === max) {
      return [
        { min: 0, max: max, label: 'Up to ' + max + ' lb' }
      ];
    }
    const range = max - min;
    const step = range / 3;
    const ranges = [
      { min: min, max: min + step, label: 'Up to ' + (min + step).toFixed(1) + ' lb' },
      { min: min + step, max: min + 2 * step, label: (min + step).toFixed(1) + ' - ' + (min + 2 * step).toFixed(1) + ' lb' },
      { min: min + 2 * step, max: max, label: 'Above ' + (min + 2 * step).toFixed(1) + ' lb' }
    ];
    return ranges;
  }

  // ====================== Core interfaces ======================

  // getHomePageOverview
  getHomePageOverview() {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);
    const services = this._getFromStorage('services', []);

    const mainCategories = [];
    for (let i = 0; i < categories.length; i++) {
      if (!categories[i].parent_id) mainCategories.push(categories[i]);
    }

    const activeProducts = [];
    for (let i = 0; i < products.length; i++) {
      if (!products[i].status || products[i].status === 'active') activeProducts.push(products[i]);
    }

    activeProducts.sort(function (a, b) {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      const rca = typeof a.review_count === 'number' ? a.review_count : 0;
      const rcb = typeof b.review_count === 'number' ? b.review_count : 0;
      return rcb - rca;
    });

    const featured_products = [];
    const maxFeaturedProducts = 8;
    for (let i = 0; i < activeProducts.length && i < maxFeaturedProducts; i++) {
      const p = activeProducts[i];
      let categoryName = null;
      let subcategoryName = null;
      let brandName = null;
      for (let cIdx = 0; cIdx < categories.length; cIdx++) {
        if (categories[cIdx].id === p.category_id) categoryName = categories[cIdx].name;
        if (categories[cIdx].id === p.subcategory_id) subcategoryName = categories[cIdx].name;
      }
      for (let bIdx = 0; bIdx < brands.length; bIdx++) {
        if (brands[bIdx].id === p.brand_id) {
          brandName = brands[bIdx].name;
          break;
        }
      }
      featured_products.push({
        product_id: p.id,
        name: p.name,
        short_description: p.description || '',
        price: p.price,
        currency: p.currency,
        rating: typeof p.rating === 'number' ? p.rating : 0,
        review_count: typeof p.review_count === 'number' ? p.review_count : 0,
        image_url: p.images && p.images.length > 0 ? p.images[0] : null,
        category_name: categoryName,
        subcategory_name: subcategoryName,
        brand_name: brandName,
        is_free_shipping_eligible: !!p.is_free_shipping_eligible,
        unit_label: p.unit_label || null
      });
    }

    const featured_services = [];
    const maxFeaturedServices = 8;
    for (let i = 0; i < services.length && i < maxFeaturedServices; i++) {
      const s = services[i];
      let categoryName = null;
      for (let cIdx = 0; cIdx < categories.length; cIdx++) {
        if (categories[cIdx].id === s.category_id) {
          categoryName = categories[cIdx].name;
          break;
        }
      }
      let shortDesc = s.description || '';
      if (shortDesc.length > 160) shortDesc = shortDesc.slice(0, 157) + '...';
      featured_services.push({
        service_id: s.id,
        name: s.name,
        short_description: shortDesc,
        category_name: categoryName,
        is_schedulable: !!s.is_schedulable
      });
    }

    const categoriesResponse = [];
    for (let i = 0; i < mainCategories.length; i++) {
      categoriesResponse.push({
        id: mainCategories[i].id,
        name: mainCategories[i].name,
        description: mainCategories[i].description || ''
      });
    }

    return {
      categories: categoriesResponse,
      featured_products: featured_products,
      featured_services: featured_services
    };
  }

  // getCategoryFilterOptions
  getCategoryFilterOptions(categoryId, subcategoryId) {
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);

    const productsInScope = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.status && p.status !== 'active') continue;
      if (this._isProductInCategoryScope(p, categoryId, subcategoryId, categories)) {
        productsInScope.push(p);
      }
    }

    let priceMin = null;
    let priceMax = null;
    const brandIds = {};
    const materialsMap = {};
    const sizeMap = {};
    let supportsFreeShipping = false;
    let hasMobileApp = false;
    let hasSmartSystem = false;
    const cameraCounts = {};

    for (let i = 0; i < productsInScope.length; i++) {
      const p = productsInScope[i];
      if (typeof p.price === 'number') {
        if (priceMin === null || p.price < priceMin) priceMin = p.price;
        if (priceMax === null || p.price > priceMax) priceMax = p.price;
      }
      if (p.brand_id) brandIds[p.brand_id] = true;
      if (p.material) materialsMap[p.material] = true;
      if (Array.isArray(p.available_sizes)) {
        for (let s = 0; s < p.available_sizes.length; s++) {
          sizeMap[p.available_sizes[s]] = true;
        }
      }
      if (p.is_free_shipping_eligible) supportsFreeShipping = true;
      if (p.supports_mobile_app) hasMobileApp = true;
      if (p.is_smart_system) hasSmartSystem = true;
      if (typeof p.camera_count === 'number' && !isNaN(p.camera_count)) {
        cameraCounts[p.camera_count] = true;
      }
    }

    const ratingMinValues = [3, 4, 4.5];

    const brandOptions = [];
    const brandIdList = Object.keys(brandIds);
    for (let i = 0; i < brandIdList.length; i++) {
      const id = brandIdList[i];
      let name = id;
      for (let b = 0; b < brands.length; b++) {
        if (brands[b].id === id) {
          name = brands[b].name;
          break;
        }
      }
      brandOptions.push({ brand_id: id, name: name });
    }

    const materialOptions = [];
    const materialKeys = Object.keys(materialsMap);
    for (let i = 0; i < materialKeys.length; i++) {
      const val = materialKeys[i];
      materialOptions.push({ value: val, label: val.charAt(0).toUpperCase() + val.slice(1) });
    }

    const sizeOptions = [];
    const sizeKeys = Object.keys(sizeMap);
    for (let i = 0; i < sizeKeys.length; i++) {
      const val = sizeKeys[i];
      sizeOptions.push({ value: val, label: val.toUpperCase() });
    }

    const extinguisherTypesSet = {};
    for (let i = 0; i < productsInScope.length; i++) {
      const t = productsInScope[i].extinguisher_type;
      if (t) extinguisherTypesSet[t] = true;
    }
    const extinguisherTypes = [];
    const extinguisherKeys = Object.keys(extinguisherTypesSet);
    for (let i = 0; i < extinguisherKeys.length; i++) {
      const val = extinguisherKeys[i];
      extinguisherTypes.push({ value: val, label: val.toUpperCase() });
    }

    const smartFeatures = [];
    if (hasMobileApp) smartFeatures.push({ code: 'supports_mobile_app', label: 'Mobile App Support' });
    if (hasSmartSystem) smartFeatures.push({ code: 'is_smart_system', label: 'Smart System' });

    const cameraCountOptions = [];
    const cameraKeys = Object.keys(cameraCounts).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    for (let i = 0; i < cameraKeys.length; i++) {
      cameraCountOptions.push(parseInt(cameraKeys[i], 10));
    }

    const weightRanges = this._buildWeightRanges(productsInScope);

    return {
      rating_min_values: ratingMinValues,
      price_min: priceMin,
      price_max: priceMax,
      brands: brandOptions,
      materials: materialOptions,
      sizes: sizeOptions,
      extinguisher_types: extinguisherTypes,
      smart_features: smartFeatures,
      shipping_filters: {
        supports_free_shipping_filter: supportsFreeShipping
      },
      camera_count_options: cameraCountOptions,
      weight_ranges: weightRanges
    };
  }

  // getCategoryProducts
  getCategoryProducts(categoryId, subcategoryId, filters, sort, page, pageSize) {
    const categories = this._getFromStorage('categories', []);
    const productsAll = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);

    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const productsInScope = [];
    for (let i = 0; i < productsAll.length; i++) {
      const p = productsAll[i];
      if (p.status && p.status !== 'active') continue;
      if (this._isProductInCategoryScope(p, categoryId, subcategoryId, categories)) {
        productsInScope.push(p);
      }
    }

    let filtered = this._applyProductFilters(productsInScope, filters || {});

    const sortKey = sort || 'relevance';
    if (sortKey === 'price_low_to_high') {
      filtered.sort(function (a, b) {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pa - pb;
      });
    } else if (sortKey === 'price_high_to_low') {
      filtered.sort(function (a, b) {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pb - pa;
      });
    } else if (sortKey === 'most_reviewed' || sortKey === 'best_selling') {
      filtered.sort(function (a, b) {
        const ra = typeof a.review_count === 'number' ? a.review_count : 0;
        const rb = typeof b.review_count === 'number' ? b.review_count : 0;
        return rb - ra;
      });
    } else if (sortKey === 'rating_high_to_low') {
      filtered.sort(function (a, b) {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const rca = typeof a.review_count === 'number' ? a.review_count : 0;
        const rcb = typeof b.review_count === 'number' ? b.review_count : 0;
        return rcb - rca;
      });
    }

    const total = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end);

    const productsResponse = [];
    for (let i = 0; i < pageItems.length; i++) {
      const p = pageItems[i];
      let categoryName = null;
      let subcategoryName = null;
      let brandName = null;
      for (let cIdx = 0; cIdx < categories.length; cIdx++) {
        if (categories[cIdx].id === p.category_id) categoryName = categories[cIdx].name;
        if (categories[cIdx].id === p.subcategory_id) subcategoryName = categories[cIdx].name;
      }
      for (let bIdx = 0; bIdx < brands.length; bIdx++) {
        if (brands[bIdx].id === p.brand_id) {
          brandName = brands[bIdx].name;
          break;
        }
      }
      productsResponse.push({
        product_id: p.id,
        name: p.name,
        short_description: p.description || '',
        price: p.price,
        currency: p.currency,
        rating: typeof p.rating === 'number' ? p.rating : 0,
        review_count: typeof p.review_count === 'number' ? p.review_count : 0,
        weight_lb: p.weight_lb,
        image_url: p.images && p.images.length > 0 ? p.images[0] : null,
        category_name: categoryName,
        subcategory_name: subcategoryName,
        brand_name: brandName,
        is_free_shipping_eligible: !!p.is_free_shipping_eligible,
        available_sizes: Array.isArray(p.available_sizes) ? p.available_sizes : [],
        camera_count: p.camera_count,
        supports_mobile_app: !!p.supports_mobile_app,
        is_smart_system: !!p.is_smart_system,
        includes_battery: !!p.includes_battery,
        extinguisher_type: p.extinguisher_type || null,
        extinguisher_capacity_lb: p.extinguisher_capacity_lb,
        unit_label: p.unit_label || null
      });
    }

    const appliedFiltersEcho = {
      minPrice: filters && filters.minPrice != null ? filters.minPrice : null,
      maxPrice: filters && filters.maxPrice != null ? filters.maxPrice : null,
      minRating: filters && filters.minRating != null ? filters.minRating : null,
      freeShippingOnly: !!(filters && filters.freeShippingOnly),
      brandId: filters ? filters.brandId || null : null,
      material: filters ? filters.material || null : null,
      size: filters ? filters.size || null : null,
      minWeightLb: filters && filters.minWeightLb != null ? filters.minWeightLb : null,
      maxWeightLb: filters && filters.maxWeightLb != null ? filters.maxWeightLb : null,
      cameraCountMin: filters && filters.cameraCountMin != null ? filters.cameraCountMin : null,
      cameraCountMax: filters && filters.cameraCountMax != null ? filters.cameraCountMax : null,
      supportsMobileApp: !!(filters && filters.supportsMobileApp),
      isSmartSystem: !!(filters && filters.isSmartSystem),
      includesBattery: !!(filters && filters.includesBattery),
      extinguisherType: filters ? filters.extinguisherType || null : null,
      extinguisherCapacityMinLb:
        filters && filters.extinguisherCapacityMinLb != null ? filters.extinguisherCapacityMinLb : null,
      extinguisherCapacityMaxLb:
        filters && filters.extinguisherCapacityMaxLb != null ? filters.extinguisherCapacityMaxLb : null
    };

    return {
      page: pageNum,
      pageSize: size,
      total: total,
      applied_filters: appliedFiltersEcho,
      applied_sort: sortKey,
      products: productsResponse
    };
  }

  // getSearchFilterOptions
  getSearchFilterOptions(query) {
    const categories = this._getFromStorage('categories', []);
    const brands = this._getFromStorage('brands', []);
    const matchedProducts = this._searchProductsByQuery(query);

    const categoryIds = {};
    const brandIds = {};
    let priceMin = null;
    let priceMax = null;
    const materialsMap = {};
    const sizeMap = {};
    let supportsFreeShipping = false;
    let hasMobileApp = false;
    let hasSmartSystem = false;

    for (let i = 0; i < matchedProducts.length; i++) {
      const p = matchedProducts[i];
      if (typeof p.price === 'number') {
        if (priceMin === null || p.price < priceMin) priceMin = p.price;
        if (priceMax === null || p.price > priceMax) priceMax = p.price;
      }
      if (p.category_id) categoryIds[p.category_id] = true;
      if (p.brand_id) brandIds[p.brand_id] = true;
      if (p.material) materialsMap[p.material] = true;
      if (Array.isArray(p.available_sizes)) {
        for (let s = 0; s < p.available_sizes.length; s++) {
          sizeMap[p.available_sizes[s]] = true;
        }
      }
      if (p.is_free_shipping_eligible) supportsFreeShipping = true;
      if (p.supports_mobile_app) hasMobileApp = true;
      if (p.is_smart_system) hasSmartSystem = true;
    }

    const categoriesResult = [];
    const categoryIdKeys = Object.keys(categoryIds);
    for (let i = 0; i < categoryIdKeys.length; i++) {
      const id = categoryIdKeys[i];
      let name = id;
      for (let c = 0; c < categories.length; c++) {
        if (categories[c].id === id) {
          name = categories[c].name;
          break;
        }
      }
      categoriesResult.push({ category_id: id, category_name: name });
    }

    const ratingMinValues = [3, 4, 4.5];

    const brandOptions = [];
    const brandIdKeys = Object.keys(brandIds);
    for (let i = 0; i < brandIdKeys.length; i++) {
      const id = brandIdKeys[i];
      let name = id;
      for (let b = 0; b < brands.length; b++) {
        if (brands[b].id === id) {
          name = brands[b].name;
          break;
        }
      }
      brandOptions.push({ brand_id: id, name: name });
    }

    const materialOptions = [];
    const materialKeys = Object.keys(materialsMap);
    for (let i = 0; i < materialKeys.length; i++) {
      const val = materialKeys[i];
      materialOptions.push({ value: val, label: val.charAt(0).toUpperCase() + val.slice(1) });
    }

    const sizeOptions = [];
    const sizeKeys = Object.keys(sizeMap);
    for (let i = 0; i < sizeKeys.length; i++) {
      const val = sizeKeys[i];
      sizeOptions.push({ value: val, label: val.toUpperCase() });
    }

    const smartFeatures = [];
    if (hasMobileApp) smartFeatures.push({ code: 'supports_mobile_app', label: 'Mobile App Support' });
    if (hasSmartSystem) smartFeatures.push({ code: 'is_smart_system', label: 'Smart System' });

    const weightRanges = this._buildWeightRanges(matchedProducts);

    return {
      categories: categoriesResult,
      rating_min_values: ratingMinValues,
      price_min: priceMin,
      price_max: priceMax,
      brands: brandOptions,
      materials: materialOptions,
      sizes: sizeOptions,
      supports_free_shipping_filter: supportsFreeShipping,
      smart_features: smartFeatures,
      weight_ranges: weightRanges
    };
  }

  // searchProducts
  searchProducts(query, filters, sort, page, pageSize) {
    const productsMatched = this._searchProductsByQuery(query);
    const categories = this._getFromStorage('categories', []);
    const brands = this._getFromStorage('brands', []);

    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    let scoped = productsMatched;

    // Optional category filter with hierarchy
    if (filters && filters.categoryId) {
      const categoryId = filters.categoryId;
      const scopedList = [];
      for (let i = 0; i < scoped.length; i++) {
        if (this._isProductInCategoryScope(scoped[i], categoryId, null, categories)) {
          scopedList.push(scoped[i]);
        }
      }
      scoped = scopedList;
    }

    const nonCategoryFilters = {};
    if (filters) {
      const keys = [
        'minPrice',
        'maxPrice',
        'minRating',
        'freeShippingOnly',
        'brandId',
        'material',
        'size',
        'minWeightLb',
        'maxWeightLb',
        'supportsMobileApp',
        'isSmartSystem',
        'includesBattery'
      ];
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (filters[k] != null) nonCategoryFilters[k] = filters[k];
      }
    }

    let filtered = this._applyProductFilters(scoped, nonCategoryFilters);

    const sortKey = sort || 'relevance';
    if (sortKey === 'price_low_to_high') {
      filtered.sort(function (a, b) {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pa - pb;
      });
    } else if (sortKey === 'price_high_to_low') {
      filtered.sort(function (a, b) {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pb - pa;
      });
    } else if (sortKey === 'most_reviewed') {
      filtered.sort(function (a, b) {
        const ra = typeof a.review_count === 'number' ? a.review_count : 0;
        const rb = typeof b.review_count === 'number' ? b.review_count : 0;
        return rb - ra;
      });
    } else if (sortKey === 'rating_high_to_low') {
      filtered.sort(function (a, b) {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const rca = typeof a.review_count === 'number' ? a.review_count : 0;
        const rcb = typeof b.review_count === 'number' ? b.review_count : 0;
        return rcb - rca;
      });
    }

    const total = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end);

    const productsResponse = [];
    for (let i = 0; i < pageItems.length; i++) {
      const p = pageItems[i];
      let categoryName = null;
      let subcategoryName = null;
      let brandName = null;
      for (let cIdx = 0; cIdx < categories.length; cIdx++) {
        if (categories[cIdx].id === p.category_id) categoryName = categories[cIdx].name;
        if (categories[cIdx].id === p.subcategory_id) subcategoryName = categories[cIdx].name;
      }
      for (let bIdx = 0; bIdx < brands.length; bIdx++) {
        if (brands[bIdx].id === p.brand_id) {
          brandName = brands[bIdx].name;
          break;
        }
      }
      productsResponse.push({
        product_id: p.id,
        name: p.name,
        short_description: p.description || '',
        price: p.price,
        currency: p.currency,
        rating: typeof p.rating === 'number' ? p.rating : 0,
        review_count: typeof p.review_count === 'number' ? p.review_count : 0,
        weight_lb: p.weight_lb,
        image_url: p.images && p.images.length > 0 ? p.images[0] : null,
        category_name: categoryName,
        subcategory_name: subcategoryName,
        brand_name: brandName,
        is_free_shipping_eligible: !!p.is_free_shipping_eligible,
        available_sizes: Array.isArray(p.available_sizes) ? p.available_sizes : [],
        supports_mobile_app: !!p.supports_mobile_app,
        is_smart_system: !!p.is_smart_system,
        includes_battery: !!p.includes_battery,
        unit_label: p.unit_label || null
      });
    }

    const appliedFiltersEcho = {
      categoryId: filters && filters.categoryId ? filters.categoryId : null,
      minPrice: filters && filters.minPrice != null ? filters.minPrice : null,
      maxPrice: filters && filters.maxPrice != null ? filters.maxPrice : null,
      minRating: filters && filters.minRating != null ? filters.minRating : null,
      freeShippingOnly: !!(filters && filters.freeShippingOnly),
      brandId: filters && filters.brandId ? filters.brandId : null,
      material: filters && filters.material ? filters.material : null,
      size: filters && filters.size ? filters.size : null,
      minWeightLb: filters && filters.minWeightLb != null ? filters.minWeightLb : null,
      maxWeightLb: filters && filters.maxWeightLb != null ? filters.maxWeightLb : null,
      supportsMobileApp: !!(filters && filters.supportsMobileApp),
      isSmartSystem: !!(filters && filters.isSmartSystem),
      includesBattery: !!(filters && filters.includesBattery)
    };

    return {
      page: pageNum,
      pageSize: size,
      total: total,
      applied_filters: appliedFiltersEcho,
      applied_sort: sortKey,
      products: productsResponse
    };
  }

  // getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const brands = this._getFromStorage('brands', []);
    const categories = this._getFromStorage('categories', []);

    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) return null;

    let brandName = null;
    for (let b = 0; b < brands.length; b++) {
      if (brands[b].id === product.brand_id) {
        brandName = brands[b].name;
        break;
      }
    }

    let categoryName = null;
    let subcategoryName = null;
    for (let c = 0; c < categories.length; c++) {
      if (categories[c].id === product.category_id) categoryName = categories[c].name;
      if (categories[c].id === product.subcategory_id) subcategoryName = categories[c].name;
    }

    // Wishlist and comparison flags
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    let isInWishlist = false;
    for (let i = 0; i < wishlistItems.length; i++) {
      if (wishlistItems[i].wishlist_id === wishlist.id && wishlistItems[i].product_id === product.id) {
        isInWishlist = true;
        break;
      }
    }

    const comparisonList = this._getOrCreateComparisonList();
    const comparisonItems = this._getFromStorage('comparison_items', []);
    let isInComparison = false;
    for (let i = 0; i < comparisonItems.length; i++) {
      if (
        comparisonItems[i].comparison_list_id === comparisonList.id &&
        comparisonItems[i].product_id === product.id
      ) {
        isInComparison = true;
        break;
      }
    }

    return {
      product_id: product.id,
      name: product.name,
      sku: product.sku || null,
      description: product.description || '',
      price: product.price,
      currency: product.currency,
      status: product.status,
      rating: typeof product.rating === 'number' ? product.rating : 0,
      review_count: typeof product.review_count === 'number' ? product.review_count : 0,
      weight_lb: product.weight_lb,
      is_free_shipping_eligible: !!product.is_free_shipping_eligible,
      material: product.material || null,
      available_sizes: Array.isArray(product.available_sizes) ? product.available_sizes : [],
      supports_mobile_app: !!product.supports_mobile_app,
      is_smart_system: !!product.is_smart_system,
      camera_count: product.camera_count,
      includes_battery: !!product.includes_battery,
      extinguisher_type: product.extinguisher_type || null,
      extinguisher_capacity_lb: product.extinguisher_capacity_lb,
      unit_label: product.unit_label || null,
      images: Array.isArray(product.images) ? product.images : [],
      features: Array.isArray(product.features) ? product.features : [],
      brand_name: brandName,
      category_name: categoryName,
      subcategory_name: subcategoryName,
      is_in_wishlist: isInWishlist,
      is_in_comparison: isInComparison
    };
  }

  // addToCart
  addToCart(productId, quantity, selectedSize, selectedOptions) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const options = Array.isArray(selectedOptions) ? selectedOptions : [];

    const products = this._getFromStorage('products', []);
    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product || (product.status && product.status !== 'active')) {
      return { success: false, message: 'Product not found or not available', cart_item_id: null, cart_item_count: 0 };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let existingItem = null;
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (
        ci.cart_id === cart.id &&
        ci.product_id === productId &&
        (ci.selected_size || null) === (selectedSize || null) &&
        JSON.stringify(ci.selected_options || []) === JSON.stringify(options || [])
      ) {
        existingItem = ci;
        break;
      }
    }

    let cartItemId = null;
    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.line_total = existingItem.unit_price * existingItem.quantity;
      existingItem.added_at = existingItem.added_at || this._nowIso();
      cartItemId = existingItem.id;
    } else {
      const newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price,
        line_total: product.price * qty,
        selected_size: selectedSize || null,
        selected_options: options || [],
        added_at: this._nowIso()
      };
      cartItems.push(newItem);
      cartItemId = newItem.id;

      // ensure cart.items contains this id
      if (!Array.isArray(cart.items)) cart.items = [];
      if (cart.items.indexOf(newItem.id) === -1) {
        cart.items.push(newItem.id);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart.id);

    // Re-load cart to ensure latest totals
    const carts = this._getFromStorage('cart', []);
    let latestCart = cart;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        latestCart = carts[i];
        break;
      }
    }

    const responseCart = this._buildCartResponse(latestCart);
    let itemCount = 0;
    for (let i = 0; i < responseCart.items.length; i++) {
      itemCount += responseCart.items[i].quantity;
    }

    return {
      success: true,
      message: 'Added to cart',
      cart_item_id: cartItemId,
      cart_item_count: itemCount
    };
  }

  // getCart
  getCart() {
    const carts = this._getFromStorage('cart', []);
    const currentCartId = localStorage.getItem('current_cart_id');
    let cart = null;
    if (currentCartId) {
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === currentCartId) {
          cart = carts[i];
          break;
        }
      }
    }
    if (!cart) {
      return this._buildCartResponse(null);
    }
    // Ensure totals are up to date
    this._recalculateCartTotals(cart.id);
    const refreshedCarts = this._getFromStorage('cart', []);
    for (let i = 0; i < refreshedCarts.length; i++) {
      if (refreshedCarts[i].id === cart.id) {
        cart = refreshedCarts[i];
        break;
      }
    }
    return this._buildCartResponse(cart);
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('cart', []);

    let item = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        item = cartItems[i];
        break;
      }
    }
    if (!item) {
      return { success: false, message: 'Cart item not found', cart: this._buildCartResponse(null) };
    }

    const cartId = item.cart_id;

    if (quantity <= 0) {
      // Remove item
      cartItems = cartItems.filter(function (ci) { return ci.id !== cartItemId; });
      this._saveToStorage('cart_items', cartItems);
      // Remove from cart.items
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === cartId) {
          if (Array.isArray(carts[i].items)) {
            carts[i].items = carts[i].items.filter(function (id) { return id !== cartItemId; });
          }
          break;
        }
      }
      this._saveToStorage('cart', carts);
    } else {
      item.quantity = quantity;
      item.line_total = item.unit_price * item.quantity;
      this._saveToStorage('cart_items', cartItems);
    }

    this._recalculateCartTotals(cartId);

    const updatedCarts = this._getFromStorage('cart', []);
    let cart = null;
    for (let i = 0; i < updatedCarts.length; i++) {
      if (updatedCarts[i].id === cartId) {
        cart = updatedCarts[i];
        break;
      }
    }

    return {
      success: true,
      message: 'Cart updated',
      cart: this._buildCartResponse(cart)
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('cart', []);

    let item = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        item = cartItems[i];
        break;
      }
    }
    if (!item) {
      return { success: false, message: 'Cart item not found', cart_item_count: 0, cart: this._buildCartResponse(null) };
    }

    const cartId = item.cart_id;
    cartItems = cartItems.filter(function (ci) { return ci.id !== cartItemId; });
    this._saveToStorage('cart_items', cartItems);

    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cartId) {
        if (Array.isArray(carts[i].items)) {
          carts[i].items = carts[i].items.filter(function (id) { return id !== cartItemId; });
        }
        break;
      }
    }
    this._saveToStorage('cart', carts);

    this._recalculateCartTotals(cartId);

    const updatedCarts = this._getFromStorage('cart', []);
    let cart = null;
    for (let i = 0; i < updatedCarts.length; i++) {
      if (updatedCarts[i].id === cartId) {
        cart = updatedCarts[i];
        break;
      }
    }

    const cartResponse = this._buildCartResponse(cart);
    let count = 0;
    for (let i = 0; i < cartResponse.items.length; i++) {
      count += cartResponse.items[i].quantity;
    }

    return {
      success: true,
      message: 'Cart item removed',
      cart_item_count: count,
      cart: cartResponse
    };
  }

  // getUserStateSummary
  getUserStateSummary() {
    const carts = this._getFromStorage('cart', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const comparisonList = this._getOrCreateComparisonList();
    const comparisonItems = this._getFromStorage('comparison_items', []);

    const currentCartId = localStorage.getItem('current_cart_id');
    let cartItemCount = 0;
    if (currentCartId) {
      for (let i = 0; i < cartItems.length; i++) {
        if (cartItems[i].cart_id === currentCartId) {
          cartItemCount += cartItems[i].quantity || 0;
        }
      }
    }

    let wishlistCount = 0;
    for (let i = 0; i < wishlistItems.length; i++) {
      if (wishlistItems[i].wishlist_id === wishlist.id) wishlistCount++;
    }

    let comparisonCount = 0;
    for (let i = 0; i < comparisonItems.length; i++) {
      if (comparisonItems[i].comparison_list_id === comparisonList.id) comparisonCount++;
    }

    return {
      cart_item_count: cartItemCount,
      wishlist_item_count: wishlistCount,
      comparison_item_count: comparisonCount
    };
  }

  // getWishlist
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const brands = this._getFromStorage('brands', []);

    const items = [];
    for (let i = 0; i < wishlistItems.length; i++) {
      const wi = wishlistItems[i];
      if (wi.wishlist_id !== wishlist.id) continue;
      let product = null;
      for (let p = 0; p < products.length; p++) {
        if (products[p].id === wi.product_id) {
          product = products[p];
          break;
        }
      }
      let categoryName = null;
      let brandName = null;
      let imageUrl = null;
      let price = null;
      let currency = null;
      let rating = null;
      let reviewCount = null;
      if (product) {
        price = product.price;
        currency = product.currency;
        rating = product.rating;
        reviewCount = product.review_count;
        imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
        for (let c = 0; c < categories.length; c++) {
          if (categories[c].id === product.category_id) {
            categoryName = categories[c].name;
            break;
          }
        }
        for (let b = 0; b < brands.length; b++) {
          if (brands[b].id === product.brand_id) {
            brandName = brands[b].name;
            break;
          }
        }
      }
      items.push({
        wishlist_item_id: wi.id,
        product_id: wi.product_id,
        product_name: product ? product.name : null,
        price: price,
        currency: currency,
        rating: typeof rating === 'number' ? rating : 0,
        review_count: typeof reviewCount === 'number' ? reviewCount : 0,
        image_url: imageUrl,
        category_name: categoryName,
        brand_name: brandName,
        notes: wi.notes || null,
        product: product || null
      });
    }

    return {
      wishlist_id: wishlist.id,
      items: items
    };
  }

  // addProductToWishlist
  addProductToWishlist(productId, notes) {
    const products = this._getFromStorage('products', []);
    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return { success: false, message: 'Product not found', wishlist_id: null, wishlist_item_count: 0, is_in_wishlist: false };
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    let wishlists = this._getFromStorage('wishlists', []);

    let existing = null;
    for (let i = 0; i < wishlistItems.length; i++) {
      if (wishlistItems[i].wishlist_id === wishlist.id && wishlistItems[i].product_id === productId) {
        existing = wishlistItems[i];
        break;
      }
    }

    if (existing) {
      existing.notes = notes || existing.notes || null;
    } else {
      const wi = {
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        product_id: productId,
        added_at: this._nowIso(),
        notes: notes || null
      };
      wishlistItems.push(wi);
      if (!Array.isArray(wishlist.items)) wishlist.items = [];
      if (wishlist.items.indexOf(wi.id) === -1) wishlist.items.push(wi.id);
    }

    this._saveToStorage('wishlist_items', wishlistItems);
    // Save wishlists (wishlist reference may have changed)
    for (let i = 0; i < wishlists.length; i++) {
      if (wishlists[i].id === wishlist.id) {
        wishlists[i] = wishlist;
        break;
      }
    }
    this._saveToStorage('wishlists', wishlists);

    let count = 0;
    for (let i = 0; i < wishlistItems.length; i++) {
      if (wishlistItems[i].wishlist_id === wishlist.id) count++;
    }

    return {
      success: true,
      message: 'Product added to wishlist',
      wishlist_id: wishlist.id,
      wishlist_item_count: count,
      is_in_wishlist: true
    };
  }

  // removeProductFromWishlist
  removeProductFromWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    let wishlists = this._getFromStorage('wishlists', []);

    let removedId = null;
    const remainingItems = [];
    for (let i = 0; i < wishlistItems.length; i++) {
      const wi = wishlistItems[i];
      if (wi.wishlist_id === wishlist.id && wi.product_id === productId) {
        removedId = wi.id;
        continue;
      }
      remainingItems.push(wi);
    }
    wishlistItems = remainingItems;
    this._saveToStorage('wishlist_items', wishlistItems);

    if (removedId && Array.isArray(wishlist.items)) {
      wishlist.items = wishlist.items.filter(function (id) { return id !== removedId; });
      for (let i = 0; i < wishlists.length; i++) {
        if (wishlists[i].id === wishlist.id) {
          wishlists[i] = wishlist;
          break;
        }
      }
      this._saveToStorage('wishlists', wishlists);
    }

    let count = 0;
    for (let i = 0; i < wishlistItems.length; i++) {
      if (wishlistItems[i].wishlist_id === wishlist.id) count++;
    }

    return {
      success: true,
      message: 'Product removed from wishlist',
      wishlist_item_count: count
    };
  }

  // getComparisonList
  getComparisonList() {
    const list = this._getOrCreateComparisonList();
    const comparisonItems = this._getFromStorage('comparison_items', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const brands = this._getFromStorage('brands', []);

    const productsResponse = [];
    for (let i = 0; i < comparisonItems.length; i++) {
      const ci = comparisonItems[i];
      if (ci.comparison_list_id !== list.id) continue;
      let product = null;
      for (let p = 0; p < products.length; p++) {
        if (products[p].id === ci.product_id) {
          product = products[p];
          break;
        }
      }
      if (!product) continue;
      let categoryName = null;
      let brandName = null;
      let imageUrl = null;
      if (product) {
        imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;
        for (let c = 0; c < categories.length; c++) {
          if (categories[c].id === product.category_id) {
            categoryName = categories[c].name;
            break;
          }
        }
        for (let b = 0; b < brands.length; b++) {
          if (brands[b].id === product.brand_id) {
            brandName = brands[b].name;
            break;
          }
        }
      }
      productsResponse.push({
        product_id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        rating: typeof product.rating === 'number' ? product.rating : 0,
        review_count: typeof product.review_count === 'number' ? product.review_count : 0,
        weight_lb: product.weight_lb,
        includes_battery: !!product.includes_battery,
        camera_count: product.camera_count,
        supports_mobile_app: !!product.supports_mobile_app,
        is_smart_system: !!product.is_smart_system,
        brand_name: brandName,
        category_name: categoryName,
        image_url: imageUrl,
        features: Array.isArray(product.features) ? product.features : []
      });
    }

    return {
      comparison_list_id: list.id,
      products: productsResponse
    };
  }

  // addProductToComparison
  addProductToComparison(productId) {
    const products = this._getFromStorage('products', []);
    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return { success: false, message: 'Product not found', comparison_list_id: null, comparison_item_count: 0 };
    }

    const list = this._getOrCreateComparisonList();
    let comparisonItems = this._getFromStorage('comparison_items', []);
    let lists = this._getFromStorage('comparison_lists', []);

    for (let i = 0; i < comparisonItems.length; i++) {
      if (comparisonItems[i].comparison_list_id === list.id && comparisonItems[i].product_id === productId) {
        // Already in comparison
        let count = 0;
        for (let j = 0; j < comparisonItems.length; j++) {
          if (comparisonItems[j].comparison_list_id === list.id) count++;
        }
        return {
          success: true,
          message: 'Product already in comparison list',
          comparison_list_id: list.id,
          comparison_item_count: count
        };
      }
    }

    const ci = {
      id: this._generateId('comparison_item'),
      comparison_list_id: list.id,
      product_id: productId,
      added_at: this._nowIso()
    };
    comparisonItems.push(ci);
    if (!Array.isArray(list.items)) list.items = [];
    if (list.items.indexOf(ci.id) === -1) list.items.push(ci.id);

    this._saveToStorage('comparison_items', comparisonItems);
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].id === list.id) {
        lists[i] = list;
        break;
      }
    }
    this._saveToStorage('comparison_lists', lists);

    let count = 0;
    for (let i = 0; i < comparisonItems.length; i++) {
      if (comparisonItems[i].comparison_list_id === list.id) count++;
    }

    return {
      success: true,
      message: 'Product added to comparison',
      comparison_list_id: list.id,
      comparison_item_count: count
    };
  }

  // removeProductFromComparison
  removeProductFromComparison(productId) {
    const list = this._getOrCreateComparisonList();
    let comparisonItems = this._getFromStorage('comparison_items', []);
    let lists = this._getFromStorage('comparison_lists', []);

    let removedId = null;
    const remaining = [];
    for (let i = 0; i < comparisonItems.length; i++) {
      const ci = comparisonItems[i];
      if (ci.comparison_list_id === list.id && ci.product_id === productId) {
        removedId = ci.id;
        continue;
      }
      remaining.push(ci);
    }
    comparisonItems = remaining;
    this._saveToStorage('comparison_items', comparisonItems);

    if (removedId && Array.isArray(list.items)) {
      list.items = list.items.filter(function (id) { return id !== removedId; });
      for (let i = 0; i < lists.length; i++) {
        if (lists[i].id === list.id) {
          lists[i] = list;
          break;
        }
      }
      this._saveToStorage('comparison_lists', lists);
    }

    let count = 0;
    for (let i = 0; i < comparisonItems.length; i++) {
      if (comparisonItems[i].comparison_list_id === list.id) count++;
    }

    return {
      success: true,
      message: 'Product removed from comparison',
      comparison_item_count: count
    };
  }

  // requestProductQuote
  requestProductQuote(productId, fullName, companyName, email, phone, projectDetails) {
    const products = this._getFromStorage('products', []);
    let productExists = false;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        productExists = true;
        break;
      }
    }
    if (!productExists) {
      return { quote_request_id: null, status: 'new', success: false, message: 'Product not found' };
    }

    const quoteRequests = this._getFromStorage('quote_requests', []);
    const id = this._generateId('quote');
    const now = this._nowIso();
    quoteRequests.push({
      id: id,
      product_id: productId,
      full_name: fullName,
      company_name: companyName || null,
      email: email,
      phone: phone,
      project_details: projectDetails || null,
      status: 'new',
      created_at: now
    });
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      quote_request_id: id,
      status: 'new',
      success: true,
      message: 'Quote request submitted'
    };
  }

  // getServicesOverview
  getServicesOverview() {
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('categories', []);

    const result = [];
    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      let categoryName = null;
      for (let c = 0; c < categories.length; c++) {
        if (categories[c].id === s.category_id) {
          categoryName = categories[c].name;
          break;
        }
      }
      let shortDesc = s.description || '';
      if (shortDesc.length > 160) shortDesc = shortDesc.slice(0, 157) + '...';
      result.push({
        service_id: s.id,
        name: s.name,
        short_description: shortDesc,
        category_name: categoryName,
        is_schedulable: !!s.is_schedulable,
        default_duration_minutes: s.default_duration_minutes || null
      });
    }
    return result;
  }

  // getServiceDetails
  getServiceDetails(serviceId) {
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('categories', []);

    let s = null;
    for (let i = 0; i < services.length; i++) {
      if (services[i].id === serviceId) {
        s = services[i];
        break;
      }
    }
    if (!s) return null;

    let categoryName = null;
    for (let c = 0; c < categories.length; c++) {
      if (categories[c].id === s.category_id) {
        categoryName = categories[c].name;
        break;
      }
    }

    return {
      service_id: s.id,
      name: s.name,
      category_name: categoryName,
      description: s.description || '',
      is_schedulable: !!s.is_schedulable,
      default_duration_minutes: s.default_duration_minutes || null
    };
  }

  // createServiceBooking
  createServiceBooking(
    serviceId,
    businessName,
    streetAddress,
    city,
    postalCode,
    country,
    serviceDate,
    timeWindow,
    contactName,
    contactPhone,
    contactEmail,
    notes
  ) {
    const services = this._getFromStorage('services', []);
    let service = null;
    for (let i = 0; i < services.length; i++) {
      if (services[i].id === serviceId) {
        service = services[i];
        break;
      }
    }
    if (!service) {
      return { booking_id: null, status: 'requested', success: false, message: 'Service not found' };
    }
    if (!service.is_schedulable) {
      return { booking_id: null, status: 'requested', success: false, message: 'Service is not schedulable' };
    }

    if (!this._validateServiceDateWithin30Days(serviceDate)) {
      return { booking_id: null, status: 'requested', success: false, message: 'Service date must be within next 30 days' };
    }

    const allowedTimeWindows = ['slot_9_12', 'slot_12_15', 'slot_13_17', 'full_day'];
    let timeWindowToUse = timeWindow;
    if (allowedTimeWindows.indexOf(timeWindowToUse) === -1) {
      timeWindowToUse = 'full_day';
    }

    const bookings = this._getFromStorage('service_bookings', []);
    const id = this._generateId('service_booking');
    const now = this._nowIso();

    bookings.push({
      id: id,
      service_id: serviceId,
      business_name: businessName || null,
      street_address: streetAddress,
      city: city,
      postal_code: postalCode,
      country: country || 'US',
      service_date: serviceDate,
      time_window: timeWindowToUse,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      status: 'requested',
      created_at: now
    });

    this._saveToStorage('service_bookings', bookings);

    return {
      booking_id: id,
      status: 'requested',
      success: true,
      message: 'Service booking requested'
    };
  }

  // getShippingMethods
  getShippingMethods() {
    const methods = this._getFromStorage('shipping_methods', []);
    const result = [];
    for (let i = 0; i < methods.length; i++) {
      const m = methods[i];
      if (!m.is_active) continue;
      result.push({
        shipping_method_id: m.id,
        name: m.name,
        code: m.code,
        description: m.description || '',
        cost: m.cost,
        currency: m.currency,
        estimated_days_min: m.estimated_days_min || null,
        estimated_days_max: m.estimated_days_max || null,
        is_default: !!m.is_default
      });
    }
    return result;
  }

  // getCheckoutSummary
  getCheckoutSummary(shippingMethodId) {
    const carts = this._getFromStorage('cart', []);
    const currentCartId = localStorage.getItem('current_cart_id');
    let cart = null;
    if (currentCartId) {
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === currentCartId) {
          cart = carts[i];
          break;
        }
      }
    }

    if (!cart) {
      return {
        cart: {
          cart_id: null,
          items: [],
          subtotal: 0
        },
        shipping_method: null,
        tax: 0,
        total: 0,
        currency: 'usd'
      };
    }

    this._recalculateCartTotals(cart.id);
    const updatedCarts = this._getFromStorage('cart', []);
    for (let i = 0; i < updatedCarts.length; i++) {
      if (updatedCarts[i].id === cart.id) {
        cart = updatedCarts[i];
        break;
      }
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id !== cart.id) continue;
      let product = null;
      for (let p = 0; p < products.length; p++) {
        if (products[p].id === ci.product_id) {
          product = products[p];
          break;
        }
      }
      items.push({
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: product ? product.name : null,
        selected_size: ci.selected_size || null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        currency: product ? product.currency : cart.currency || 'usd'
      });
    }

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    let selectedMethod = null;
    if (shippingMethodId) {
      for (let i = 0; i < shippingMethods.length; i++) {
        if (shippingMethods[i].id === shippingMethodId && shippingMethods[i].is_active) {
          selectedMethod = shippingMethods[i];
          break;
        }
      }
    }
    if (!selectedMethod) {
      // Try default
      for (let i = 0; i < shippingMethods.length; i++) {
        if (shippingMethods[i].is_default && shippingMethods[i].is_active) {
          selectedMethod = shippingMethods[i];
          break;
        }
      }
    }
    if (!selectedMethod) {
      // Fallback to cheapest active
      let cheapest = null;
      for (let i = 0; i < shippingMethods.length; i++) {
        const m = shippingMethods[i];
        if (!m.is_active) continue;
        if (!cheapest || m.cost < cheapest.cost) cheapest = m;
      }
      selectedMethod = cheapest;
    }

    // Instrumentation for task completion tracking
    try {
      // Only record when a specific shippingMethodId was provided
      // and it resolves to an active shipping method
      if (shippingMethodId && selectedMethod && selectedMethod.id === shippingMethodId) {
        localStorage.setItem('task8_selectedShippingMethod', selectedMethod.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const shippingCost = selectedMethod ? selectedMethod.cost : 0;
    const currency = selectedMethod ? selectedMethod.currency : cart.currency || 'usd';
    const subtotal = cart.subtotal || 0;
    const tax = 0; // tax calculation omitted
    const total = subtotal + shippingCost + tax;

    return {
      cart: {
        cart_id: cart.id,
        items: items,
        subtotal: subtotal
      },
      shipping_method: selectedMethod
        ? {
            shipping_method_id: selectedMethod.id,
            name: selectedMethod.name,
            code: selectedMethod.code,
            cost: selectedMethod.cost,
            currency: selectedMethod.currency
          }
        : null,
      tax: tax,
      total: total,
      currency: currency
    };
  }

  // placeOrder
  placeOrder(shippingAddress, contactEmail, contactPhone, shippingMethodId, paymentMethod, orderNotes) {
    const summary = this.getCheckoutSummary(shippingMethodId);
    const cartSummary = summary.cart;
    const shippingMethod = summary.shipping_method;

    if (!cartSummary || !cartSummary.cart_id || !cartSummary.items || cartSummary.items.length === 0) {
      return { order_id: null, status: 'pending', success: false, message: 'Cart is empty', summary: null };
    }

    if (!shippingMethod) {
      return {
        order_id: null,
        status: 'pending',
        success: false,
        message: 'No shipping method available',
        summary: null
      };
    }

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const orderId = this._generateId('order');
    const now = this._nowIso();

    const subtotal = summary.cart.subtotal;
    const shippingCost = shippingMethod.cost;
    const tax = summary.tax;
    const total = summary.total;
    const currency = summary.currency;

    const order = {
      id: orderId,
      cart_id: cartSummary.cart_id,
      items: [], // order_item ids
      subtotal: subtotal,
      shipping_cost: shippingCost,
      tax: tax,
      total: total,
      currency: currency,
      shipping_method_id: shippingMethod.shipping_method_id,
      shipping_full_name: shippingAddress && shippingAddress.fullName ? shippingAddress.fullName : '',
      shipping_company: shippingAddress && shippingAddress.company ? shippingAddress.company : null,
      shipping_street: shippingAddress && shippingAddress.street ? shippingAddress.street : '',
      shipping_city: shippingAddress && shippingAddress.city ? shippingAddress.city : '',
      shipping_postal_code: shippingAddress && shippingAddress.postalCode ? shippingAddress.postalCode : '',
      shipping_country: shippingAddress && shippingAddress.country ? shippingAddress.country : 'US',
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      payment_method: paymentMethod || null,
      status: 'pending',
      notes: orderNotes || null,
      created_at: now
    };

    // Create order items from cart items
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id !== cartSummary.cart_id) continue;
      const oiId = this._generateId('order_item');
      const oi = {
        id: oiId,
        order_id: orderId,
        product_id: ci.product_id,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        selected_size: ci.selected_size || null
      };
      orderItems.push(oi);
      order.items.push(oiId);
    }

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart
    const remainingCartItems = [];
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id !== cartSummary.cart_id) remainingCartItems.push(cartItems[i]);
    }
    this._saveToStorage('cart_items', remainingCartItems);

    const carts = this._getFromStorage('cart', []);
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cartSummary.cart_id) {
        carts[i].items = [];
        carts[i].subtotal = 0;
        carts[i].shipping_cost = 0;
        carts[i].tax = 0;
        carts[i].total = 0;
        carts[i].updated_at = this._nowIso();
        break;
      }
    }
    this._saveToStorage('cart', carts);

    const summaryObj = {
      subtotal: subtotal,
      shipping_cost: shippingCost,
      tax: tax,
      total: total,
      currency: currency
    };

    return {
      order_id: orderId,
      status: order.status,
      success: true,
      message: 'Order placed',
      summary: summaryObj
    };
  }

  // getAboutUsContent
  getAboutUsContent() {
    const data = this._getFromStorage('about_us_content', null);
    if (!data) {
      return { title: '', body_html: '', last_updated: null };
    }
    return data;
  }

  // getContactInfo
  getContactInfo() {
    const data = this._getFromStorage('contact_info', null);
    if (!data) {
      return { phone_numbers: [], email_addresses: [], locations: [] };
    }
    return data;
  }

  // submitContactForm
  submitContactForm(name, email, phone, subject, message, topic) {
    const tickets = this._getFromStorage('contact_tickets', []);
    const id = this._generateId('ticket');
    tickets.push({
      id: id,
      name: name,
      email: email,
      phone: phone || null,
      subject: subject,
      message: message,
      topic: topic || null,
      created_at: this._nowIso()
    });
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      message: 'Your message has been received',
      ticket_id: id
    };
  }

  // getFAQEntries
  getFAQEntries() {
    return this._getFromStorage('faq_entries', []);
  }

  // getPolicyDocument
  getPolicyDocument(policyType) {
    const docs = this._getFromStorage('policy_documents', []);
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      if (d.policy_type === policyType) {
        return {
          title: d.title || '',
          body_html: d.body_html || '',
          last_updated: d.last_updated || null
        };
      }
    }
    return { title: '', body_html: '', last_updated: null };
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