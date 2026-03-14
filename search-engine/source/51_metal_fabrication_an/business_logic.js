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

  // ------------------------
  // Storage helpers
  // ------------------------
  _initStorage() {
    const tableKeys = [
      'products',
      'product_categories',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'services',
      'laser_cutting_quote_requests',
      'emergency_repair_requests',
      'factory_tour_requests',
      'configured_products',
      'shipping_methods',
      'checkout_sessions',
      'policy_documents'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data == null) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // Corrupted data; reset to default
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

  // ------------------------
  // Cart helpers
  // ------------------------
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = null;

    if (carts.length === 0) {
      cart = {
        id: this._generateId('cart'),
        currency: 'usd',
        subtotal: 0,
        shipping_total: 0,
        tax_total: 0,
        total: 0,
        item_count: 0,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    } else {
      cart = carts[carts.length - 1];
    }

    return cart;
  }

  _recalculateCartTotals(cart, allCartItems) {
    const carts = this._getFromStorage('carts');
    const cartItems = allCartItems || this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let subtotal = 0;
    let itemCount = 0;
    for (const item of itemsForCart) {
      const lineSubtotal = (item.unit_price || 0) * (item.quantity || 0);
      item.line_subtotal = lineSubtotal;
      subtotal += lineSubtotal;
      itemCount += item.quantity || 0;
    }

    cart.subtotal = subtotal;
    if (typeof cart.shipping_total !== 'number') {
      cart.shipping_total = 0;
    }
    if (typeof cart.tax_total !== 'number') {
      cart.tax_total = 0;
    }
    cart.total = subtotal + cart.shipping_total + cart.tax_total;
    cart.item_count = itemCount;
    cart.updated_at = this._nowIso();

    // persist updated cart and items
    const updatedCarts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', updatedCarts);
    this._saveToStorage('cart_items', cartItems);

    return { cart, items: itemsForCart };
  }

  // ------------------------
  // Checkout helpers
  // ------------------------
  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find(
      (s) => s.cart_id === cart.id && s.status !== 'completed' && s.status !== 'abandoned'
    );

    if (!session) {
      session = {
        id: this._generateId('checkout'),
        cart_id: cart.id,
        shipping_first_name: null,
        shipping_last_name: null,
        shipping_street: null,
        shipping_city: null,
        shipping_state: null,
        shipping_zip: null,
        shipping_country: null,
        selected_shipping_method_id: null,
        shipping_cost: 0,
        estimated_min_delivery_date: null,
        estimated_max_delivery_date: null,
        status: 'in_progress',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }

    return session;
  }

  // ------------------------
  // Wishlist helpers
  // ------------------------
  _getDefaultWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let def = wishlists.find((w) => w.is_default);
    if (!def) {
      def = {
        id: this._generateId('wishlist'),
        name: 'Default',
        description: 'Default wishlist',
        is_default: true,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      wishlists.push(def);
      this._saveToStorage('wishlists', wishlists);
    }
    return def;
  }

  // ------------------------
  // Category helpers
  // ------------------------
  _getCategoryAndDescendantIdsBySlug(categorySlug) {
    const categories = this._getFromStorage('product_categories');
    const root = categories.find((c) => c.slug === categorySlug);
    if (!root) return [];

    const ids = [root.id];
    const stack = [root.id];

    while (stack.length > 0) {
      const currentId = stack.pop();
      const children = categories.filter((c) => c.parent_category_id === currentId);
      for (const child of children) {
        if (!ids.includes(child.id)) {
          ids.push(child.id);
          stack.push(child.id);
        }
      }
    }

    return ids;
  }

  _findCategoryNameById(categoryId) {
    if (!categoryId) return null;
    const categories = this._getFromStorage('product_categories');
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : null;
  }

  // ------------------------
  // Cabinet pricing helper
  // ------------------------
  _calculateConfiguredCabinetPrice(baseProduct, config, optionsMeta) {
    // Use base product unit price as baseline if available
    let price = baseProduct && typeof baseProduct.unit_price === 'number' ? baseProduct.unit_price : 400;

    // Simple adjustments based on dimensions
    if (baseProduct) {
      const hBase = baseProduct.height_value || 2000;
      const wBase = baseProduct.width_value || 900;
      const dBase = baseProduct.depth_value || 450;

      const hDiff = Math.max(0, (config.height_value || hBase) - hBase);
      const wDiff = Math.max(0, (config.width_value || wBase) - wBase);
      const dDiff = Math.max(0, (config.depth_value || dBase) - dBase);

      price += hDiff * 0.05; // $/mm over base
      price += wDiff * 0.04;
      price += dDiff * 0.03;
    }

    // Shelves: small surcharge per shelf over 2
    if (config.shelves_count && config.shelves_count > 2) {
      price += (config.shelves_count - 2) * 15;
    }

    // Lockable door surcharge
    if (config.has_lockable_door) {
      price += 25;
    }

    // Optional features from optionsMeta
    if (Array.isArray(config.optional_feature_codes) && Array.isArray(optionsMeta)) {
      for (const code of config.optional_feature_codes) {
        const feature = optionsMeta.find((f) => f.code === code);
        if (feature && typeof feature.additional_price === 'number') {
          price += feature.additional_price;
        }
      }
    }

    return price;
  }

  // ------------------------
  // Utility helpers
  // ------------------------
  _titleCaseFromSnake(value) {
    if (!value) return '';
    return value
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomeOverview()
  getHomeOverview() {
    const categories = this._getFromStorage('product_categories');
    const services = this._getFromStorage('services');
    const products = this._getFromStorage('products');

    const featured_categories = categories
      .filter((c) => c.is_active)
      .slice(0, 4)
      .map((c) => ({
        category_id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        category: c // foreign key resolution
      }));

    const featured_services = services.slice(0, 4).map((s) => ({
      service_id: s.service_id,
      name: s.name,
      short_description: s.short_description || ''
    }));

    const activeProducts = products.filter((p) => p.status === 'active');
    const featured_products = activeProducts.slice(0, 8).map((p) => ({
      product_id: p.id,
      name: p.name,
      category_name: this._findCategoryNameById(p.category_id),
      size_label: p.size_label || '',
      material: p.material || 'other',
      profile_type: p.profile_type || 'other',
      unit_price: p.unit_price,
      currency: p.currency || 'usd',
      thumbnail_image_url: p.thumbnail_image_url || '',
      free_shipping: !!p.free_shipping,
      stock_status: p.stock_status || 'in_stock',
      product: p // foreign key resolution
    }));

    return {
      hero_title: 'Precision Metal Fabrication & Products',
      hero_subtitle: 'Custom fabrication, structural steel, and ready-to-ship components for industrial projects.',
      featured_categories,
      featured_services,
      featured_products
    };
  }

  // getMainProductCategories()
  getMainProductCategories() {
    const categories = this._getFromStorage('product_categories');
    const topLevel = categories.filter((c) => c.is_active && !c.parent_category_id);
    // Resolve parent_category for foreign-key-like field
    return topLevel.map((c) => ({
      ...c,
      parent_category: null
    }));
  }

  // getServicesOverview()
  getServicesOverview() {
    const services = this._getFromStorage('services');
    return services;
  }

  // searchProducts(query, filters, sortBy, page, pageSize)
  searchProducts(query, filters, sortBy, page = 1, pageSize = 20) {
    const allProducts = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let products = allProducts.filter((p) => p.status === 'active');

    // Text query
    if (q) {
      products = products.filter((p) => {
        const haystack = [
          p.name,
          p.description,
          p.size_label,
          p.sku
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    // Category filter with hierarchy
    if (f.categorySlug) {
      const ids = this._getCategoryAndDescendantIdsBySlug(f.categorySlug);
      products = products.filter((p) => ids.includes(p.category_id));
    }

    // Material
    if (f.material) {
      products = products.filter((p) => p.material === f.material);
    }

    // Profile type
    if (f.profileType) {
      products = products.filter((p) => p.profile_type === f.profileType);
    }

    // Price
    if (typeof f.minUnitPrice === 'number') {
      products = products.filter((p) => typeof p.unit_price === 'number' && p.unit_price >= f.minUnitPrice);
    }
    if (typeof f.maxUnitPrice === 'number') {
      products = products.filter((p) => typeof p.unit_price === 'number' && p.unit_price <= f.maxUnitPrice);
    }

    // Length
    if (typeof f.minLength === 'number') {
      products = products.filter((p) => {
        if (typeof p.length_value !== 'number') return false;
        if (f.lengthUnit && p.length_unit && p.length_unit !== f.lengthUnit) return false;
        return p.length_value >= f.minLength;
      });
    }
    if (typeof f.maxLength === 'number') {
      products = products.filter((p) => {
        if (typeof p.length_value !== 'number') return false;
        if (f.lengthUnit && p.length_unit && p.length_unit !== f.lengthUnit) return false;
        return p.length_value <= f.maxLength;
      });
    }

    // Width
    if (typeof f.minWidth === 'number') {
      products = products.filter((p) => {
        if (typeof p.width_value !== 'number') return false;
        if (f.widthUnit && p.width_unit && p.width_unit !== f.widthUnit) return false;
        return p.width_value >= f.minWidth;
      });
    }
    if (typeof f.maxWidth === 'number') {
      products = products.filter((p) => {
        if (typeof p.width_value !== 'number') return false;
        if (f.widthUnit && p.width_unit && p.width_unit !== f.widthUnit) return false;
        return p.width_value <= f.maxWidth;
      });
    }

    // Height
    if (typeof f.minHeight === 'number') {
      products = products.filter((p) => {
        if (typeof p.height_value !== 'number') return false;
        if (f.heightUnit && p.height_unit && p.height_unit !== f.heightUnit) return false;
        return p.height_value >= f.minHeight;
      });
    }
    if (typeof f.maxHeight === 'number') {
      products = products.filter((p) => {
        if (typeof p.height_value !== 'number') return false;
        if (f.heightUnit && p.height_unit && p.height_unit !== f.heightUnit) return false;
        return p.height_value <= f.maxHeight;
      });
    }

    // Thickness
    if (typeof f.minThickness === 'number') {
      products = products.filter((p) => {
        if (typeof p.thickness_value !== 'number') return false;
        if (f.thicknessUnit && p.thickness_unit && p.thickness_unit !== f.thicknessUnit) return false;
        return p.thickness_value >= f.minThickness;
      });
    }
    if (typeof f.maxThickness === 'number') {
      products = products.filter((p) => {
        if (typeof p.thickness_value !== 'number') return false;
        if (f.thicknessUnit && p.thickness_unit && p.thickness_unit !== f.thicknessUnit) return false;
        return p.thickness_value <= f.maxThickness;
      });
    }

    // Application steps (for handrail kits)
    if (typeof f.applicationMinSteps === 'number' || typeof f.applicationMaxSteps === 'number') {
      const reqMin = typeof f.applicationMinSteps === 'number' ? f.applicationMinSteps : 0;
      const reqMax = typeof f.applicationMaxSteps === 'number' ? f.applicationMaxSteps : Number.POSITIVE_INFINITY;
      products = products.filter((p) => {
        if (typeof p.application_min_steps !== 'number' || typeof p.application_max_steps !== 'number') {
          return false;
        }
        // Overlapping range
        return p.application_min_steps <= reqMax && p.application_max_steps >= reqMin;
      });
    }

    // Free shipping
    if (f.freeShippingOnly) {
      products = products.filter((p) => !!p.free_shipping);
    }

    // Sorting
    if (sortBy === 'price_asc') {
      products.sort((a, b) => (a.unit_price || 0) - (b.unit_price || 0));
    } else if (sortBy === 'price_desc') {
      products.sort((a, b) => (b.unit_price || 0) - (a.unit_price || 0));
    } else {
      // relevance or default: simple name sort for stability
      products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    // Pagination
    const totalItems = products.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const start = (currentPage - 1) * pageSize;
    const paged = products.slice(start, start + pageSize);

    const items = paged.map((p) => {
      const category = categories.find((c) => c.id === p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        category_name: category ? category.name : null,
        size_label: p.size_label || '',
        material: p.material || 'other',
        profile_type: p.profile_type || 'other',
        length_value: p.length_value,
        length_unit: p.length_unit,
        width_value: p.width_value,
        width_unit: p.width_unit,
        height_value: p.height_value,
        height_unit: p.height_unit,
        thickness_value: p.thickness_value,
        thickness_unit: p.thickness_unit,
        application_min_steps: p.application_min_steps,
        application_max_steps: p.application_max_steps,
        unit_price: p.unit_price,
        currency: p.currency || 'usd',
        free_shipping: !!p.free_shipping,
        stock_status: p.stock_status || 'in_stock',
        thumbnail_image_url: p.thumbnail_image_url || '',
        datasheet_available: !!p.datasheet_url,
        product: p,
        category
      };
    });

    return {
      products: items,
      pagination: {
        page: currentPage,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  // listProductsByCategory(categorySlug, filters, sortBy, page, pageSize)
  listProductsByCategory(categorySlug, filters, sortBy, page = 1, pageSize = 20) {
    const allProducts = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const ids = this._getCategoryAndDescendantIdsBySlug(categorySlug);
    const f = filters || {};

    let products = allProducts.filter((p) => p.status === 'active' && ids.includes(p.category_id));

    // Material
    if (f.material) {
      products = products.filter((p) => p.material === f.material);
    }

    // Profile type
    if (f.profileType) {
      products = products.filter((p) => p.profile_type === f.profileType);
    }

    // Price
    if (typeof f.minUnitPrice === 'number') {
      products = products.filter((p) => typeof p.unit_price === 'number' && p.unit_price >= f.minUnitPrice);
    }
    if (typeof f.maxUnitPrice === 'number') {
      products = products.filter((p) => typeof p.unit_price === 'number' && p.unit_price <= f.maxUnitPrice);
    }

    // Exact dimensions (value + unit)
    if (typeof f.lengthValue === 'number') {
      products = products.filter((p) => p.length_value === f.lengthValue && (!f.lengthUnit || p.length_unit === f.lengthUnit));
    }
    if (typeof f.widthValue === 'number') {
      products = products.filter((p) => p.width_value === f.widthValue && (!f.widthUnit || p.width_unit === f.widthUnit));
    }
    if (typeof f.heightValue === 'number') {
      products = products.filter((p) => p.height_value === f.heightValue && (!f.heightUnit || p.height_unit === f.heightUnit));
    }
    if (typeof f.thicknessValue === 'number') {
      products = products.filter((p) => p.thickness_value === f.thicknessValue && (!f.thicknessUnit || p.thickness_unit === f.thicknessUnit));
    }

    // Application steps
    if (typeof f.applicationMinSteps === 'number' || typeof f.applicationMaxSteps === 'number') {
      const reqMin = typeof f.applicationMinSteps === 'number' ? f.applicationMinSteps : 0;
      const reqMax = typeof f.applicationMaxSteps === 'number' ? f.applicationMaxSteps : Number.POSITIVE_INFINITY;
      products = products.filter((p) => {
        if (typeof p.application_min_steps !== 'number' || typeof p.application_max_steps !== 'number') {
          return false;
        }
        return p.application_min_steps <= reqMax && p.application_max_steps >= reqMin;
      });
    }

    // Free shipping
    if (f.freeShippingOnly) {
      products = products.filter((p) => !!p.free_shipping);
    }

    // Sorting
    if (sortBy === 'price_asc') {
      products.sort((a, b) => (a.unit_price || 0) - (b.unit_price || 0));
    } else if (sortBy === 'price_desc') {
      products.sort((a, b) => (b.unit_price || 0) - (a.unit_price || 0));
    } else if (sortBy === 'name_desc') {
      products.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else {
      // default or name_asc
      products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    // Pagination
    const totalItems = products.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const start = (currentPage - 1) * pageSize;
    const paged = products.slice(start, start + pageSize);

    const category = categories.find((c) => c.slug === categorySlug) || null;

    const items = paged.map((p) => ({
      product_id: p.id,
      name: p.name,
      size_label: p.size_label || '',
      material: p.material || 'other',
      profile_type: p.profile_type || 'other',
      unit_price: p.unit_price,
      currency: p.currency || 'usd',
      free_shipping: !!p.free_shipping,
      stock_status: p.stock_status || 'in_stock',
      thumbnail_image_url: p.thumbnail_image_url || '',
      product: p
    }));

    return {
      category: category
        ? {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description || ''
          }
        : null,
      products: items,
      pagination: {
        page: currentPage,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  // getProductFilterOptions(categorySlug)
  getProductFilterOptions(categorySlug) {
    const allProducts = this._getFromStorage('products');

    let products = allProducts.filter((p) => p.status === 'active');
    if (categorySlug) {
      const ids = this._getCategoryAndDescendantIdsBySlug(categorySlug);
      products = products.filter((p) => ids.includes(p.category_id));
    }

    const materialsSet = new Set();
    const profileTypesSet = new Set();
    const lengthUnitsSet = new Set();
    const thicknessUnitsSet = new Set();
    const stepRangesMap = new Map(); // key: "min-max" -> {min, max}

    let minPrice = null;
    let maxPrice = null;

    let supportsFreeShippingFilter = false;

    for (const p of products) {
      if (p.material) materialsSet.add(p.material);
      if (p.profile_type) profileTypesSet.add(p.profile_type);
      if (p.length_unit) lengthUnitsSet.add(p.length_unit);
      if (p.thickness_unit) thicknessUnitsSet.add(p.thickness_unit);

      if (typeof p.application_min_steps === 'number' && typeof p.application_max_steps === 'number') {
        const key = p.application_min_steps + '-' + p.application_max_steps;
        if (!stepRangesMap.has(key)) {
          stepRangesMap.set(key, {
            min_steps: p.application_min_steps,
            max_steps: p.application_max_steps
          });
        }
      }

      if (typeof p.unit_price === 'number') {
        if (minPrice === null || p.unit_price < minPrice) minPrice = p.unit_price;
        if (maxPrice === null || p.unit_price > maxPrice) maxPrice = p.unit_price;
      }

      if (p.free_shipping) supportsFreeShippingFilter = true;
    }

    const materials = Array.from(materialsSet).map((value) => ({
      value,
      label: this._titleCaseFromSnake(value)
    }));
    const profile_types = Array.from(profileTypesSet).map((value) => ({
      value,
      label: this._titleCaseFromSnake(value)
    }));
    const length_units = Array.from(lengthUnitsSet);
    const thickness_units = Array.from(thicknessUnitsSet);

    const application_step_ranges = Array.from(stepRangesMap.values()).map((r) => ({
      min_steps: r.min_steps,
      max_steps: r.max_steps,
      label: r.min_steps + ' to ' + r.max_steps + ' steps'
    }));

    return {
      materials,
      profile_types,
      length_units,
      thickness_units,
      application_step_ranges,
      price_range: {
        min_price: minPrice,
        max_price: maxPrice,
        currency: 'usd'
      },
      shipping_filters: {
        supports_free_shipping_filter: supportsFreeShippingFilter
      }
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      return {
        product: null,
        category_name: null,
        formatted_dimensions: '',
        application_description: '',
        datasheet_available: false,
        datasheet_url: null,
        can_configure: false
      };
    }

    const category = categories.find((c) => c.id === product.category_id) || null;

    const dims = [];
    if (typeof product.length_value === 'number' && product.length_unit) {
      dims.push(product.length_value + ' ' + product.length_unit);
    }
    if (typeof product.width_value === 'number' && product.width_unit) {
      dims.push(product.width_value + ' ' + product.width_unit);
    }
    if (typeof product.height_value === 'number' && product.height_unit) {
      dims.push(product.height_value + ' ' + product.height_unit);
    }
    if (typeof product.thickness_value === 'number' && product.thickness_unit) {
      dims.push('t=' + product.thickness_value + ' ' + product.thickness_unit);
    }

    const formatted_dimensions = dims.join(' x ');

    return {
      product,
      category_name: category ? category.name : null,
      formatted_dimensions,
      application_description: product.application_notes || '',
      datasheet_available: !!product.datasheet_url,
      datasheet_url: product.datasheet_url || null,
      can_configure: !!product.is_configurable,
      category
    };
  }

  // onProductDatasheetLinkClick(productId)
  onProductDatasheetLinkClick(productId) {
    // Instrumentation for task completion tracking
    try {
      // When the user clicks the datasheet link/button, store the productId
      localStorage.setItem('task5_datasheetDownloadedProductId', String(productId));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }
  }

  // addProductToCart(productId, quantity, notes)
  addProductToCart(productId, quantity = 1, notes) {
    const products = this._getFromStorage('products');
    let cartItems = this._getFromStorage('cart_items');

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, cart: null, item: null, message: 'Product not found' };
    }

    if (quantity <= 0) {
      return { success: false, cart: null, item: null, message: 'Quantity must be positive' };
    }

    const cart = this._getOrCreateCart();

    // Enforce min/max order quantity if specified
    if (typeof product.min_order_quantity === 'number' && quantity < product.min_order_quantity) {
      quantity = product.min_order_quantity;
    }
    if (typeof product.max_order_quantity === 'number' && quantity > product.max_order_quantity) {
      quantity = product.max_order_quantity;
    }

    let item = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId && !ci.configured_product_id
    );

    if (item) {
      item.quantity += quantity;
      item.notes = notes || item.notes;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        configured_product_id: null,
        quantity,
        unit_price: product.unit_price,
        line_subtotal: (product.unit_price || 0) * quantity,
        applied_free_shipping: !!product.free_shipping,
        notes: notes || null,
        added_at: this._nowIso()
      };
      cartItems.push(item);
    }

    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);

    return {
      success: true,
      cart: updatedCart,
      item,
      message: 'Product added to cart'
    };
  }

  // getCartDetails()
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const { cart: updatedCart } = this._recalculateCartTotals(cart);
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === updatedCart.id);
    const products = this._getFromStorage('products');
    const configuredProducts = this._getFromStorage('configured_products');

    const items = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const configured_product = ci.configured_product_id
        ? configuredProducts.find((cp) => cp.id === ci.configured_product_id) || null
        : null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        configured_product_id: ci.configured_product_id,
        product_name: product ? product.name : null,
        product_sku: product ? product.sku : null,
        thumbnail_image_url: product ? product.thumbnail_image_url || '' : '',
        configuration_summary: configured_product ? configured_product.description || '' : '',
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        applied_free_shipping: !!ci.applied_free_shipping,
        stock_status: product ? product.stock_status || 'in_stock' : 'in_stock',
        product,
        configured_product
      };
    });

    return {
      cart: updatedCart,
      items
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      const cart = this._getOrCreateCart();
      const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);
      return { cart: updatedCart, items: cartItems };
    }

    const cart = this._getOrCreateCart();
    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      cartItems[itemIndex].quantity = quantity;
    }

    const { cart: updatedCart, items } = this._recalculateCartTotals(cart, cartItems);
    return { cart: updatedCart, items };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const cart = this._getOrCreateCart();

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);

    const { cart: updatedCart, items } = this._recalculateCartTotals(cart, cartItems);
    return { cart: updatedCart, items };
  }

  // clearCart()
  clearCart() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    cartItems = cartItems.filter((ci) => ci.cart_id !== cart.id);
    const { cart: updatedCart, items } = this._recalculateCartTotals(cart, cartItems);
    return { cart: updatedCart, items };
  }

  // startCheckout()
  startCheckout() {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();
    return {
      checkout_session: {
        ...session,
        cart
      },
      cart
    };
  }

  // setCheckoutShippingAddress(shippingAddress)
  setCheckoutShippingAddress(shippingAddress) {
    const session = this._getOrCreateCheckoutSession();
    const sessions = this._getFromStorage('checkout_sessions');

    session.shipping_first_name = shippingAddress.firstName;
    session.shipping_last_name = shippingAddress.lastName;
    session.shipping_street = shippingAddress.street;
    session.shipping_city = shippingAddress.city;
    session.shipping_state = shippingAddress.state || null;
    session.shipping_zip = shippingAddress.zip;
    session.shipping_country = shippingAddress.country;
    session.updated_at = this._nowIso();

    const updatedSessions = sessions.map((s) => (s.id === session.id ? session : s));
    this._saveToStorage('checkout_sessions', updatedSessions);

    const cart = this._getOrCreateCart();

    return {
      checkout_session: {
        ...session,
        cart
      }
    };
  }

  // getAvailableShippingMethodsForCheckout()
  getAvailableShippingMethodsForCheckout() {
    const methods = this._getFromStorage('shipping_methods');
    // No region-specific filtering by default; frontend can filter by delivery days
    return methods;
  }

  // selectCheckoutShippingMethod(shippingMethodId)
  selectCheckoutShippingMethod(shippingMethodId) {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();

    const methods = this._getFromStorage('shipping_methods');
    const method = methods.find((m) => m.id === shippingMethodId);
    if (!method) {
      return {
        checkout_session: {
          ...session,
          cart
        },
        cart
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);

    let shippingCost = method.price || 0;
    const allItemsFree = cartItems.length > 0 && cartItems.every((ci) => !!ci.applied_free_shipping);
    if (method.is_free || (method.eligible_for_free_shipping && allItemsFree)) {
      shippingCost = 0;
    }

    // Estimate delivery dates
    const now = new Date();
    const minDays = typeof method.min_delivery_days === 'number' ? method.min_delivery_days : 0;
    const maxDays = typeof method.max_delivery_days === 'number' ? method.max_delivery_days : minDays;
    const minDate = this._addDays(now, minDays);
    const maxDate = this._addDays(now, maxDays);

    session.selected_shipping_method_id = method.id;
    session.shipping_cost = shippingCost;
    session.estimated_min_delivery_date = minDate.toISOString();
    session.estimated_max_delivery_date = maxDate.toISOString();
    session.status = 'shipping_selected';
    session.updated_at = this._nowIso();

    // Update in storage
    const sessions = this._getFromStorage('checkout_sessions');
    const updatedSessions = sessions.map((s) => (s.id === session.id ? session : s));
    this._saveToStorage('checkout_sessions', updatedSessions);

    // Update cart shipping_total and totals
    cart.shipping_total = shippingCost;
    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    return {
      checkout_session: {
        ...session,
        cart: updatedCart
      },
      cart: updatedCart
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();
    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === updatedCart.id);
    const products = this._getFromStorage('products');
    const configuredProducts = this._getFromStorage('configured_products');
    const shippingMethods = this._getFromStorage('shipping_methods');

    const items = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const configured_product = ci.configured_product_id
        ? configuredProducts.find((cp) => cp.id === ci.configured_product_id) || null
        : null;
      return {
        ...ci,
        product,
        configured_product
      };
    });

    const selected_shipping_method = shippingMethods.find(
      (m) => m.id === session.selected_shipping_method_id
    ) || null;

    return {
      checkout_session: {
        ...session,
        cart: updatedCart,
        selected_shipping_method
      },
      cart: updatedCart,
      items,
      selected_shipping_method
    };
  }

  // getServiceDetails(serviceId)
  getServiceDetails(serviceId) {
    const services = this._getFromStorage('services');
    const service = services.find((s) => s.service_id === serviceId) || null;
    return { service };
  }

  // getLaserCuttingOptions()
  getLaserCuttingOptions() {
    return {
      supported_materials: ['steel', 'stainless_steel', 'galvanized_steel', 'aluminum', 'other'],
      supported_thickness_units: ['mm', 'cm', 'm', 'inch', 'ft'],
      supported_dimension_units: ['mm', 'cm', 'm', 'inch', 'ft'],
      supported_tolerance_types: ['plus_minus', 'max_only', 'min_only'],
      supported_tolerance_units: ['mm', 'cm', 'inch']
    };
  }

  // submitLaserCuttingQuoteRequest(...)
  submitLaserCuttingQuoteRequest(
    material,
    thickness_value,
    thickness_unit,
    length_value,
    length_unit,
    width_value,
    width_unit,
    quantity,
    tolerance_type,
    tolerance_value,
    tolerance_unit,
    shipping_zip,
    shipping_country,
    additional_notes,
    contact_name,
    contact_email,
    contact_phone
  ) {
    const requests = this._getFromStorage('laser_cutting_quote_requests');

    const request = {
      id: this._generateId('lcq'),
      service_id: 'laser_cutting',
      material,
      thickness_value,
      thickness_unit,
      length_value,
      length_unit,
      width_value,
      width_unit,
      quantity,
      tolerance_type,
      tolerance_value,
      tolerance_unit,
      shipping_zip: shipping_zip || null,
      shipping_country: shipping_country || null,
      additional_notes: additional_notes || null,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      status: 'submitted',
      created_at: this._nowIso()
    };

    requests.push(request);
    this._saveToStorage('laser_cutting_quote_requests', requests);

    return {
      request,
      message: 'Laser cutting quote request submitted'
    };
  }

  // getEmergencyRepairOptions()
  getEmergencyRepairOptions() {
    return {
      regions: [
        { value: 'midwest', label: 'Midwest' },
        { value: 'northeast', label: 'Northeast' },
        { value: 'south', label: 'South' },
        { value: 'west', label: 'West' },
        { value: 'other', label: 'Other' }
      ],
      priorities: [
        {
          value: 'within_24_hours',
          label: 'Within 24 hours',
          description: 'Dispatch technician within 24 hours of confirmation.'
        },
        {
          value: 'within_48_hours',
          label: 'Within 48 hours',
          description: 'Dispatch technician within 2 business days.'
        },
        {
          value: 'standard',
          label: 'Standard',
          description: 'Schedule based on next available slot.'
        }
      ]
    };
  }

  // submitEmergencyRepairRequest(...)
  submitEmergencyRepairRequest(
    region,
    priority,
    issue_description,
    site_street,
    site_city,
    site_state,
    site_zip,
    site_country,
    contact_name,
    contact_email,
    contact_phone
  ) {
    const requests = this._getFromStorage('emergency_repair_requests');

    const request = {
      id: this._generateId('erq'),
      service_id: 'emergency_repair',
      region,
      priority,
      issue_description,
      site_street,
      site_city,
      site_state: site_state || null,
      site_zip,
      site_country: site_country || null,
      contact_name,
      contact_email,
      contact_phone,
      status: 'submitted',
      created_at: this._nowIso()
    };

    requests.push(request);
    this._saveToStorage('emergency_repair_requests', requests);

    return {
      request,
      message: 'Emergency repair request submitted'
    };
  }

  // getCabinetBaseProducts()
  getCabinetBaseProducts() {
    const products = this._getFromStorage('products');
    return products.filter(
      (p) => p.status === 'active' && p.profile_type === 'cabinet' && p.is_configurable
    );
  }

  // getCabinetConfigurationOptions(baseProductId)
  getCabinetConfigurationOptions(baseProductId) {
    const products = this._getFromStorage('products');
    const base = products.find((p) => p.id === baseProductId) || null;

    const heightUnit = (base && base.height_unit) || 'mm';
    const widthUnit = (base && base.width_unit) || 'mm';
    const depthUnit = (base && base.depth_unit) || 'mm';

    const heightBase = (base && base.height_value) || 2000;
    const widthBase = (base && base.width_value) || 900;
    const depthBase = (base && base.depth_value) || 450;

    const available_colors = [
      { code: 'RAL 7035', name: 'Light Grey RAL 7035' }
    ];

    const optional_features = [
      {
        code: 'levelling_feet',
        label: 'Levelling feet',
        description: 'Adjustable levelling feet for uneven floors.',
        additional_price: 30
      },
      {
        code: 'ventilated_doors',
        label: 'Ventilated doors',
        description: 'Perforated doors for improved ventilation.',
        additional_price: 45
      }
    ];

    return {
      height: {
        min: heightBase - 200,
        max: heightBase + 200,
        unit: heightUnit
      },
      width: {
        min: widthBase - 200,
        max: widthBase + 200,
        unit: widthUnit
      },
      depth: {
        min: depthBase - 100,
        max: depthBase + 100,
        unit: depthUnit
      },
      available_colors,
      shelf_count_options: [2, 3, 4, 5],
      lockable_door_available: true,
      optional_features
    };
  }

  // previewCabinetConfiguration(...)
  previewCabinetConfiguration(
    baseProductId,
    height_value,
    height_unit,
    width_value,
    width_unit,
    depth_value,
    depth_unit,
    color_code,
    shelves_count,
    has_lockable_door,
    optional_feature_codes
  ) {
    const products = this._getFromStorage('products');
    const base = products.find((p) => p.id === baseProductId) || null;

    const options = this.getCabinetConfigurationOptions(baseProductId);
    const errors = [];

    // Validate dimensions
    if (height_unit !== options.height.unit) {
      errors.push('Height unit must be ' + options.height.unit);
    }
    if (width_unit !== options.width.unit) {
      errors.push('Width unit must be ' + options.width.unit);
    }
    if (depth_unit !== options.depth.unit) {
      errors.push('Depth unit must be ' + options.depth.unit);
    }

    if (height_value < options.height.min || height_value > options.height.max) {
      errors.push('Height out of allowed range');
    }
    if (width_value < options.width.min || width_value > options.width.max) {
      errors.push('Width out of allowed range');
    }
    if (depth_value < options.depth.min || depth_value > options.depth.max) {
      errors.push('Depth out of allowed range');
    }

    if (!options.shelf_count_options.includes(shelves_count)) {
      errors.push('Invalid shelf count');
    }

    const color = options.available_colors.find((c) => c.code === color_code);
    if (!color) {
      errors.push('Unsupported color');
    }

    if (has_lockable_door && !options.lockable_door_available) {
      errors.push('Lockable door not available');
    }

    const configuration_valid = errors.length === 0;

    const config = {
      height_value,
      width_value,
      depth_value,
      shelves_count,
      has_lockable_door,
      optional_feature_codes: optional_feature_codes || []
    };

    let estimated_unit_price = null;
    let currency = 'usd';
    if (configuration_valid && base) {
      estimated_unit_price = this._calculateConfiguredCabinetPrice(
        base,
        config,
        options.optional_features
      );
      currency = base.currency || 'usd';
    } else if (configuration_valid) {
      estimated_unit_price = this._calculateConfiguredCabinetPrice(
        null,
        config,
        options.optional_features
      );
    }

    const configuration_summary =
      'Cabinet ' +
      (color ? color.name : color_code) +
      ', ' +
      height_value +
      height_unit +
      ' x ' +
      width_value +
      width_unit +
      ' x ' +
      depth_value +
      depth_unit +
      ', ' +
      shelves_count +
      ' shelves' +
      (has_lockable_door ? ', lockable door' : '');

    return {
      configuration_valid,
      validation_errors: errors,
      estimated_unit_price,
      currency,
      configuration_summary
    };
  }

  // createConfiguredCabinetAndAddToCart(...)
  createConfiguredCabinetAndAddToCart(
    baseProductId,
    height_value,
    height_unit,
    width_value,
    width_unit,
    depth_value,
    depth_unit,
    color_code,
    color_name,
    shelves_count,
    has_lockable_door,
    optional_feature_codes,
    quantity
  ) {
    const products = this._getFromStorage('products');
    const configuredProducts = this._getFromStorage('configured_products');

    const base = products.find((p) => p.id === baseProductId) || null;
    const options = this.getCabinetConfigurationOptions(baseProductId);

    const preview = this.previewCabinetConfiguration(
      baseProductId,
      height_value,
      height_unit,
      width_value,
      width_unit,
      depth_value,
      depth_unit,
      color_code,
      shelves_count,
      has_lockable_door,
      optional_feature_codes
    );

    const configPrice = preview.estimated_unit_price || (base && base.unit_price) || 0;
    const currency = (base && base.currency) || 'usd';

    const configured_product = {
      id: this._generateId('cfgcab'),
      configuration_type: 'cabinet',
      base_product_id: baseProductId,
      name:
        (base ? base.name : 'Configured Cabinet') +
        ' - ' +
        (color_name || color_code || ''),
      description: preview.configuration_summary,
      height_value,
      height_unit,
      width_value,
      width_unit,
      depth_value,
      depth_unit,
      color_code,
      color_name: color_name || null,
      shelves_count,
      has_lockable_door,
      optional_features: (options.optional_features || []).filter((f) =>
        (optional_feature_codes || []).includes(f.code)
      ),
      unit_price: configPrice,
      currency,
      created_at: this._nowIso()
    };

    configuredProducts.push(configured_product);
    // FIX: use the correct variable when saving configured products
    this._saveToStorage('configured_products', configuredProducts);

    // Add to cart as a cart item referencing both product and configured_product
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const qty = quantity > 0 ? quantity : 1;

    const cart_item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: baseProductId,
      configured_product_id: configured_product.id,
      quantity: qty,
      unit_price: configured_product.unit_price,
      line_subtotal: configured_product.unit_price * qty,
      applied_free_shipping: base ? !!base.free_shipping : false,
      notes: null,
      added_at: this._nowIso()
    };

    cartItems.push(cart_item);
    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);

    return {
      configured_product,
      cart: updatedCart,
      cart_item
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    // If content exists in storage, use it; otherwise provide a generic structure
    const stored = this._getFromStorage('about_page_content', null);
    if (stored) return stored;

    return {
      headline: 'About Our Metal Fabrication Company',
      body:
        'We specialize in precision metal fabrication, structural steel, and custom components for industrial, commercial, and infrastructure projects.',
      certifications: [],
      key_statistics: []
    };
  }

  // getFacilitiesPageContent()
  getFacilitiesPageContent() {
    const stored = this._getFromStorage('facilities_page_content', null);
    if (stored) return stored;

    return {
      headline: 'Our Manufacturing Facilities',
      body:
        'Our plant is equipped with CNC laser cutting, forming, welding, and finishing lines to support projects of all sizes.',
      highlights: []
    };
  }

  // getFactoryToursInfo()
  getFactoryToursInfo() {
    const stored = this._getFromStorage('factory_tours_info', null);
    if (stored) return stored;

    return {
      intro_text:
        'We welcome groups, customers, and partners to tour our facilities and see our metal fabrication capabilities in action.',
      tour_types: [],
      safety_requirements: [],
      typical_schedule: 'Weekdays, 9:00 AM to 3:00 PM by appointment.'
    };
  }

  // submitFactoryTourRequest(...)
  submitFactoryTourRequest(
    preferred_date,
    preferred_time,
    group_size,
    additional_message,
    contact_name,
    contact_email
  ) {
    const requests = this._getFromStorage('factory_tour_requests');

    const request = {
      id: this._generateId('tour'),
      preferred_date: new Date(preferred_date).toISOString(),
      preferred_time,
      group_size,
      additional_message: additional_message || null,
      contact_name,
      contact_email,
      status: 'submitted',
      created_at: this._nowIso()
    };

    requests.push(request);
    this._saveToStorage('factory_tour_requests', requests);

    return {
      request,
      message: 'Factory tour request submitted'
    };
  }

  // getWishlists()
  getWishlists() {
    this._getDefaultWishlist();
    const wishlists = this._getFromStorage('wishlists');
    return wishlists;
  }

  // createWishlist(name, description, is_default)
  createWishlist(name, description, is_default = false) {
    let wishlists = this._getFromStorage('wishlists');

    if (is_default) {
      wishlists = wishlists.map((w) => ({ ...w, is_default: false }));
    }

    const wishlist = {
      id: this._generateId('wishlist'),
      name,
      description: description || null,
      is_default: !!is_default,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);

    return { wishlist };
  }

  // getWishlistItems(wishlistId)
  getWishlistItems(wishlistId) {
    const wishlists = this._getFromStorage('wishlists');
    const wishlist = wishlists.find((w) => w.id === wishlistId) || null;
    const wishlist_items = this._getFromStorage('wishlist_items').filter(
      (wi) => wi.wishlist_id === wishlistId
    );
    const products = this._getFromStorage('products');

    const items = wishlist_items.map((wi) => {
      const product = products.find((p) => p.id === wi.product_id) || null;
      return {
        wishlist_item_id: wi.id,
        product_id: wi.product_id,
        product_name: product ? product.name : null,
        size_label: product ? product.size_label || '' : '',
        material: product ? product.material || 'other' : 'other',
        unit_price: product ? product.unit_price : null,
        currency: product ? product.currency || 'usd' : 'usd',
        thumbnail_image_url: product ? product.thumbnail_image_url || '' : '',
        notes: wi.notes || null,
        product
      };
    });

    return {
      wishlist,
      items
    };
  }

  // addProductToWishlist(productId, wishlistId, newListName, notes)
  addProductToWishlist(productId, wishlistId, newListName, notes) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { wishlist: null, item: null, message: 'Product not found' };
    }

    let wishlists = this._getFromStorage('wishlists');

    let wishlist = null;
    if (wishlistId) {
      wishlist = wishlists.find((w) => w.id === wishlistId) || null;
    }

    if (!wishlist && newListName) {
      const result = this.createWishlist(newListName, null, false);
      wishlist = result.wishlist;
      wishlists = this._getFromStorage('wishlists');
    }

    if (!wishlist) {
      wishlist = this._getDefaultWishlist();
      wishlists = this._getFromStorage('wishlists');
    }

    let wishlist_items = this._getFromStorage('wishlist_items');

    // Avoid duplicates for same product in same wishlist
    let item = wishlist_items.find(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId
    );

    if (item) {
      item.notes = notes || item.notes;
    } else {
      item = {
        id: this._generateId('wish_item'),
        wishlist_id: wishlist.id,
        product_id: productId,
        notes: notes || null,
        added_at: this._nowIso()
      };
      wishlist_items.push(item);
    }

    this._saveToStorage('wishlist_items', wishlist_items);

    return {
      wishlist,
      item,
      message: 'Product saved to wishlist'
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    let wishlist_items = this._getFromStorage('wishlist_items');
    const before = wishlist_items.length;
    wishlist_items = wishlist_items.filter((wi) => wi.id !== wishlistItemId);
    const after = wishlist_items.length;
    this._saveToStorage('wishlist_items', wishlist_items);
    return { success: after < before };
  }

  // moveWishlistItemToCart(wishlistItemId, quantity)
  moveWishlistItemToCart(wishlistItemId, quantity = 1) {
    let wishlist_items = this._getFromStorage('wishlist_items');
    const wiIndex = wishlist_items.findIndex((wi) => wi.id === wishlistItemId);
    if (wiIndex === -1) {
      const cart = this._getOrCreateCart();
      return { cart, cart_item: null, wishlist: null };
    }

    const wi = wishlist_items[wiIndex];
    const result = this.addProductToCart(wi.product_id, quantity);

    // Remove from wishlist
    wishlist_items.splice(wiIndex, 1);
    this._saveToStorage('wishlist_items', wishlist_items);

    const wishlists = this._getFromStorage('wishlists');
    const wishlist = wishlists.find((w) => w.id === wi.wishlist_id) || null;

    return {
      cart: result.cart,
      cart_item: result.item,
      wishlist
    };
  }

  // getShippingPolicies()
  getShippingPolicies() {
    const methods = this._getFromStorage('shipping_methods');
    const docs = this._getFromStorage('policy_documents');
    const shippingDoc = docs.find((d) => d.code === 'shipping_policy');

    return {
      methods,
      free_shipping_conditions:
        (shippingDoc && shippingDoc.content_snippet) ||
        'Free shipping may apply for selected products and shipping methods as indicated at checkout.'
    };
  }

  // getPolicyDocuments()
  getPolicyDocuments() {
    const documents = this._getFromStorage('policy_documents');
    return { documents };
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