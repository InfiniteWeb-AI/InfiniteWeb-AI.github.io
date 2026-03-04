// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  // Simple in-memory polyfill
  var store = {};
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

  // ---------------------- Initialization & Storage Helpers ----------------------

  _initStorage() {
    const keys = [
      'categories',
      'products',
      'room_calculations',
      'cart',
      'cart_items',
      'sample_cart',
      'sample_cart_items',
      'orders',
      'order_items',
      'product_quotes',
      'installation_appointments',
      'refinishing_estimate_requests',
      'stores',
      'showroom_visit_appointments',
      'promotions',
      'shipping_methods',
      'comparison_sets',
      'static_pages',
      'contact_messages'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  _findCategoryById(categoryId) {
    const categories = this._getFromStorage('categories');
    return categories.find((c) => c.id === categoryId) || null;
  }

  _matchesCategoryHierarchy(product, categoryId) {
    if (!categoryId) return true;
    if (categoryId === 'all_flooring') return true;

    const pid = product.category_id;
    const material = product.material_species;

    if (categoryId === 'waterproof') {
      return (
        pid === 'waterproof' ||
        material === 'waterproof' ||
        product.is_waterproof === true
      );
    }

    if (categoryId === 'vinyl') {
      return (
        pid === 'vinyl' ||
        pid === 'luxury_vinyl_plank' ||
        material === 'vinyl' ||
        material === 'luxury_vinyl_plank'
      );
    }

    return pid === categoryId;
  }

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    if (carts.length > 0) {
      return carts[0];
    }
    const newCart = {
      id: this._generateId('cart'),
      items: [],
      promo_code: null,
      promo_discount_amount: 0,
      subtotal: 0,
      discount_total: 0,
      tax_estimate: 0,
      total: 0,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    const updatedCarts = [newCart];
    this._saveToStorage('cart', updatedCarts);
    return newCart;
  }

  _saveCart(cart) {
    const carts = this._getFromStorage('cart');
    let saved = false;
    const updated = carts.map((c) => {
      if (c.id === cart.id) {
        saved = true;
        return cart;
      }
      return c;
    });
    if (!saved) {
      updated.push(cart);
    }
    this._saveToStorage('cart', updated);
  }

  _getOrCreateSampleCart() {
    const carts = this._getFromStorage('sample_cart');
    if (carts.length > 0) {
      return carts[0];
    }
    const newCart = {
      id: this._generateId('sample_cart'),
      items: [],
      subtotal: 0,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    const updatedCarts = [newCart];
    this._saveToStorage('sample_cart', updatedCarts);
    return newCart;
  }

  _saveSampleCart(cart) {
    const carts = this._getFromStorage('sample_cart');
    let saved = false;
    const updated = carts.map((c) => {
      if (c.id === cart.id) {
        saved = true;
        return cart;
      }
      return c;
    });
    if (!saved) {
      updated.push(cart);
    }
    this._saveToStorage('sample_cart', updated);
  }

  _getOrCreateComparisonSet() {
    const sets = this._getFromStorage('comparison_sets');
    if (sets.length > 0) return sets[0];
    const newSet = {
      id: this._generateId('comparison'),
      product_ids: [],
      created_at: this._nowIso()
    };
    const updatedSets = [newSet];
    this._saveToStorage('comparison_sets', updatedSets);
    return newSet;
  }

  _saveComparisonSet(set) {
    const sets = this._getFromStorage('comparison_sets');
    let saved = false;
    const updated = sets.map((s) => {
      if (s.id === set.id) {
        saved = true;
        return set;
      }
      return s;
    });
    if (!saved) updated.push(set);
    this._saveToStorage('comparison_sets', updated);
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id === cart.id
    );
    let subtotal = 0;
    cartItems.forEach((ci) => {
      const line = (ci.quantity_sqft || 0) * (ci.unit_price_per_sqft || 0);
      ci.line_subtotal = line;
      subtotal += line;
    });

    // Save updated cart items
    const allItems = this._getFromStorage('cart_items');
    const updatedAllItems = allItems.map((ci) => {
      const match = cartItems.find((x) => x.id === ci.id);
      return match || ci;
    });
    this._saveToStorage('cart_items', updatedAllItems);

    cart.subtotal = subtotal;

    // Apply promotion if any
    const promoResult = this._calculatePromotionForCart(cart, cartItems);
    cart.promo_discount_amount = promoResult.promo_discount_amount;
    cart.discount_total = promoResult.discount_total;

    // Simple tax estimate (0 for simplicity / can be extended externally)
    cart.tax_estimate = 0;
    cart.total = cart.subtotal - cart.discount_total + cart.tax_estimate;
    cart.updated_at = this._nowIso();

    this._saveCart(cart);
  }

  _calculatePromotionForCart(cart, cartItems) {
    let promo_discount_amount = 0;
    const promotions = this._getFromStorage('promotions');
    const code = cart.promo_code;
    if (!code) {
      return { promo_discount_amount: 0, discount_total: 0 };
    }

    const now = new Date();
    const promo = promotions.find((p) => {
      if (!p.is_active) return false;
      if (!p.code) return false;
      if (String(p.code).toUpperCase() !== String(code).toUpperCase()) {
        return false;
      }
      if (p.start_date && new Date(p.start_date) > now) return false;
      if (p.end_date && new Date(p.end_date) < now) return false;
      return true;
    });

    if (!promo) {
      return { promo_discount_amount: 0, discount_total: 0 };
    }

    const products = this._getFromStorage('products');

    // Eligible subtotal based on applicable categories
    let eligibleSubtotal = 0;
    cartItems.forEach((ci) => {
      const product = products.find((p) => p.id === ci.product_id);
      if (!product) return;
      if (promo.applicable_category_ids && promo.applicable_category_ids.length > 0) {
        if (!promo.applicable_category_ids.includes(product.category_id)) return;
      }
      eligibleSubtotal += ci.line_subtotal || 0;
    });

    if (promo.applicable_min_subtotal && eligibleSubtotal < promo.applicable_min_subtotal) {
      return { promo_discount_amount: 0, discount_total: 0 };
    }

    if (promo.discount_type === 'percent_off') {
      const percent = promo.discount_value || 0;
      promo_discount_amount = (eligibleSubtotal * percent) / 100;
    } else if (promo.discount_type === 'amount_off') {
      const amount = promo.discount_value || 0;
      promo_discount_amount = Math.min(amount, eligibleSubtotal);
    } else if (promo.discount_type === 'free_shipping') {
      // Handled at shipping stage; no direct cart discount
      promo_discount_amount = 0;
    }

    const discount_total = promo_discount_amount;
    return { promo_discount_amount, discount_total };
  }

  _recalculateSampleCartTotals(cart) {
    const sampleItems = this._getFromStorage('sample_cart_items').filter(
      (ci) => ci.sample_cart_id === cart.id
    );
    let subtotal = 0;
    sampleItems.forEach((ci) => {
      const line = (ci.quantity_samples || 0) * (ci.unit_sample_price || 0);
      ci.line_subtotal = line;
      subtotal += line;
    });

    const allItems = this._getFromStorage('sample_cart_items');
    const updatedAllItems = allItems.map((ci) => {
      const match = sampleItems.find((x) => x.id === ci.id);
      return match || ci;
    });
    this._saveToStorage('sample_cart_items', updatedAllItems);

    cart.subtotal = subtotal;
    cart.updated_at = this._nowIso();
    this._saveSampleCart(cart);
  }

  _buildCartSummary(cart) {
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id === cart.id
    );
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    const items = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const category = product
        ? categories.find((c) => c.id === product.category_id) || null
        : null;
      let selectedColorName = null;
      let thumb = null;
      if (product) {
        thumb = (product.images && product.images[0]) || null;
        if (ci.selected_color_option_id && Array.isArray(product.color_options)) {
          const opt = product.color_options.find(
            (o) => o.id === ci.selected_color_option_id
          );
          selectedColorName = opt ? opt.name : null;
        }
      }

      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: product ? product.name : null,
        category_name: category ? category.name : null,
        selected_color_option_id: ci.selected_color_option_id || null,
        selected_color_name: selectedColorName,
        quantity_sqft: ci.quantity_sqft,
        unit_price_per_sqft: ci.unit_price_per_sqft,
        line_subtotal: ci.line_subtotal,
        thumbnail_image_url: thumb,
        // Foreign key resolution
        product
      };
    });

    return {
      cart_id: cart.id,
      items,
      promo_code: cart.promo_code || null,
      promo_discount_amount: cart.promo_discount_amount || 0,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      tax_estimate: cart.tax_estimate || 0,
      total: cart.total || 0
    };
  }

  _buildSampleCartSummary(cart) {
    const sampleItems = this._getFromStorage('sample_cart_items').filter(
      (ci) => ci.sample_cart_id === cart.id
    );
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    const items = sampleItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const category = product
        ? categories.find((c) => c.id === product.category_id) || null
        : null;
      const thumb = product && product.images ? product.images[0] : null;
      return {
        sample_cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: product ? product.name : null,
        category_name: category ? category.name : null,
        quantity_samples: ci.quantity_samples,
        unit_sample_price: ci.unit_sample_price || 0,
        line_subtotal: ci.line_subtotal || 0,
        thumbnail_image_url: thumb,
        // Foreign key resolution
        product
      };
    });

    return {
      sample_cart_id: cart.id,
      items,
      subtotal: cart.subtotal || 0
    };
  }

  _dateRange(startDateStr, endDateStr) {
    const dates = [];
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return dates;
    }
    let current = new Date(start.getTime());
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  _weekdayInfo(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay(); // 0-6, 0=Sun
    const names = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday'
    ];
    const weekday = names[day];
    const isWeekend = day === 0 || day === 6;
    return { weekday, isWeekend };
  }

  // ---------------------- Core Interfaces ----------------------

  // 1. getNavigationCategories
  getNavigationCategories() {
    const categories = this._getFromStorage('categories');
    return categories;
  }

  // 2. getHomePageContent
  getHomePageContent() {
    const categories = this._getFromStorage('categories');
    const products = this._getFromStorage('products').filter(
      (p) => p.status === 'active'
    );
    const promotions = this._getFromStorage('promotions');

    const now = new Date();
    const active_promotions = promotions.filter((p) => {
      if (!p.is_active) return false;
      if (p.start_date && new Date(p.start_date) > now) return false;
      if (p.end_date && new Date(p.end_date) < now) return false;
      return true;
    });

    // Feature all categories and first few products
    const featured_categories = categories;
    const featured_products = products.slice(0, 8).map((p) => {
      const category = categories.find((c) => c.id === p.category_id) || null;
      return {
        ...p,
        category,
        category_name: category ? category.name : null
      };
    });

    return {
      featured_categories,
      featured_products,
      active_promotions
    };
  }

  // 3. getCategoryFilterOptions
  getCategoryFilterOptions(categoryId) {
    const productsAll = this._getFromStorage('products').filter(
      (p) => p.status === 'active'
    );
    const products = productsAll.filter((p) =>
      this._matchesCategoryHierarchy(p, categoryId)
    );

    const roomTypesSet = new Set();
    const colorSet = new Set();
    const styleSet = new Set();
    const materialSet = new Set();
    const warrantySet = new Set();

    let priceMin = null;
    let priceMax = null;
    let hasWaterproof = false;
    let hasEco = false;

    products.forEach((p) => {
      if (Array.isArray(p.suitable_room_types)) {
        p.suitable_room_types.forEach((rt) => roomTypesSet.add(rt));
      }
      if (typeof p.price_per_sqft === 'number') {
        if (priceMin === null || p.price_per_sqft < priceMin) priceMin = p.price_per_sqft;
        if (priceMax === null || p.price_per_sqft > priceMax) priceMax = p.price_per_sqft;
      }
      if (p.color_family) colorSet.add(p.color_family);
      if (p.style_look) styleSet.add(p.style_look);
      if (p.material_species) materialSet.add(p.material_species);
      if (typeof p.warranty_residential_years === 'number') {
        warrantySet.add(p.warranty_residential_years);
      }
      if (p.is_waterproof) hasWaterproof = true;
      if (p.is_eco_friendly) hasEco = true;
    });

    const room_types = Array.from(roomTypesSet);
    const color_families = Array.from(colorSet);
    const style_looks = Array.from(styleSet);
    const material_species_values = Array.from(materialSet);
    const warranty_residential_years_options = Array.from(warrantySet).sort(
      (a, b) => a - b
    );

    // Provide standard rating thresholds
    const rating_thresholds = [3, 3.5, 4, 4.5];

    return {
      room_types,
      price_per_sqft_min: priceMin || 0,
      price_per_sqft_max: priceMax || 0,
      rating_thresholds,
      color_families,
      style_looks,
      material_species_values,
      warranty_residential_years_options,
      has_waterproof_filter: hasWaterproof,
      has_eco_friendly_filter: hasEco
    };
  }

  // 4. getCategoryProducts
  getCategoryProducts(categoryId, filters, sortBy = 'popularity', page = 1, pageSize = 20) {
    const categories = this._getFromStorage('categories');
    const allProducts = this._getFromStorage('products').filter(
      (p) => p.status === 'active'
    );

    let products = allProducts.filter((p) =>
      this._matchesCategoryHierarchy(p, categoryId)
    );

    if (filters) {
      if (filters.roomType) {
        products = products.filter(
          (p) =>
            Array.isArray(p.suitable_room_types) &&
            p.suitable_room_types.includes(filters.roomType)
        );
      }
      if (typeof filters.minPricePerSqft === 'number') {
        products = products.filter(
          (p) => p.price_per_sqft >= filters.minPricePerSqft
        );
      }
      if (typeof filters.maxPricePerSqft === 'number') {
        products = products.filter(
          (p) => p.price_per_sqft <= filters.maxPricePerSqft
        );
      }
      if (typeof filters.minRatingValue === 'number') {
        products = products.filter(
          (p) => (p.rating_value || 0) >= filters.minRatingValue
        );
      }
      if (filters.colorFamily) {
        products = products.filter((p) => p.color_family === filters.colorFamily);
      }
      if (filters.styleLook) {
        products = products.filter((p) => p.style_look === filters.styleLook);
      }
      if (filters.materialSpecies) {
        products = products.filter(
          (p) => p.material_species === filters.materialSpecies
        );
      }
      if (typeof filters.minWarrantyResidentialYears === 'number') {
        products = products.filter(
          (p) =>
            typeof p.warranty_residential_years === 'number' &&
            p.warranty_residential_years >= filters.minWarrantyResidentialYears
        );
      }
      if (typeof filters.isWaterproof === 'boolean') {
        products = products.filter(
          (p) => (p.is_waterproof || false) === filters.isWaterproof
        );
      }
      if (typeof filters.isEcoFriendly === 'boolean') {
        products = products.filter(
          (p) => (p.is_eco_friendly || false) === filters.isEcoFriendly
        );
      }
    }

    // Sorting
    products.sort((a, b) => {
      if (sortBy === 'price_asc') {
        return (a.price_per_sqft || 0) - (b.price_per_sqft || 0);
      }
      if (sortBy === 'price_desc') {
        return (b.price_per_sqft || 0) - (a.price_per_sqft || 0);
      }
      if (sortBy === 'rating_desc') {
        if ((b.rating_value || 0) === (a.rating_value || 0)) {
          return (b.rating_count || 0) - (a.rating_count || 0);
        }
        return (b.rating_value || 0) - (a.rating_value || 0);
      }
      // popularity default: by rating_count then rating_value
      if ((b.rating_count || 0) === (a.rating_count || 0)) {
        return (b.rating_value || 0) - (a.rating_value || 0);
      }
      return (b.rating_count || 0) - (a.rating_count || 0);
    });

    const total_results = products.length;
    const total_pages = total_results === 0 ? 1 : Math.ceil(total_results / pageSize);
    const current_page = Math.min(Math.max(page, 1), total_pages);
    const startIndex = (current_page - 1) * pageSize;
    const pageItems = products.slice(startIndex, startIndex + pageSize);

    const mappedProducts = pageItems.map((p) => {
      const category = categories.find((c) => c.id === p.category_id) || null;
      const thumb = p.images && p.images.length > 0 ? p.images[0] : null;
      return {
        id: p.id,
        name: p.name,
        category_name: category ? category.name : null,
        price_per_sqft: p.price_per_sqft,
        rating_value: p.rating_value,
        rating_count: p.rating_count,
        thumbnail_image_url: thumb,
        is_sample_available: p.is_sample_available || false,
        material_species: p.material_species || null,
        is_waterproof: p.is_waterproof || false,
        style_look: p.style_look || null,
        color_family: p.color_family || null,
        warranty_residential_years: p.warranty_residential_years,
        is_eco_friendly: p.is_eco_friendly || false
      };
    });

    return {
      products: mappedProducts,
      pagination: {
        current_page,
        page_size: pageSize,
        total_pages,
        total_results
      }
    };
  }

  // 5. getSearchFilterOptions
  getSearchFilterOptions() {
    const products = this._getFromStorage('products').filter(
      (p) => p.status === 'active'
    );

    const roomTypesSet = new Set();
    const colorSet = new Set();
    const styleSet = new Set();
    const materialSet = new Set();
    const warrantySet = new Set();
    let priceMin = null;
    let priceMax = null;

    products.forEach((p) => {
      if (Array.isArray(p.suitable_room_types)) {
        p.suitable_room_types.forEach((rt) => roomTypesSet.add(rt));
      }
      if (typeof p.price_per_sqft === 'number') {
        if (priceMin === null || p.price_per_sqft < priceMin) priceMin = p.price_per_sqft;
        if (priceMax === null || p.price_per_sqft > priceMax) priceMax = p.price_per_sqft;
      }
      if (p.color_family) colorSet.add(p.color_family);
      if (p.style_look) styleSet.add(p.style_look);
      if (p.material_species) materialSet.add(p.material_species);
      if (typeof p.warranty_residential_years === 'number') {
        warrantySet.add(p.warranty_residential_years);
      }
    });

    const room_types = Array.from(roomTypesSet);
    const color_families = Array.from(colorSet);
    const style_looks = Array.from(styleSet);
    const material_species_values = Array.from(materialSet);
    const warranty_residential_years_options = Array.from(warrantySet).sort(
      (a, b) => a - b
    );

    const rating_thresholds = [3, 3.5, 4, 4.5];

    return {
      room_types,
      price_per_sqft_min: priceMin || 0,
      price_per_sqft_max: priceMax || 0,
      rating_thresholds,
      color_families,
      style_looks,
      material_species_values,
      warranty_residential_years_options
    };
  }

  // 6. searchProducts
  searchProducts(query, filters, sortBy = 'relevance', page = 1, pageSize = 20) {
    const q = (query || '').trim().toLowerCase();
    const categories = this._getFromStorage('categories');
    const allProducts = this._getFromStorage('products').filter(
      (p) => p.status === 'active'
    );

    let products = allProducts.filter((p) => {
      if (!q) return true;
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });

    if (filters) {
      if (filters.categoryId) {
        products = products.filter((p) =>
          this._matchesCategoryHierarchy(p, filters.categoryId)
        );
      }
      if (typeof filters.minPricePerSqft === 'number') {
        products = products.filter(
          (p) => p.price_per_sqft >= filters.minPricePerSqft
        );
      }
      if (typeof filters.maxPricePerSqft === 'number') {
        products = products.filter(
          (p) => p.price_per_sqft <= filters.maxPricePerSqft
        );
      }
      if (typeof filters.minRatingValue === 'number') {
        products = products.filter(
          (p) => (p.rating_value || 0) >= filters.minRatingValue
        );
      }
      if (filters.roomType) {
        products = products.filter(
          (p) =>
            Array.isArray(p.suitable_room_types) &&
            p.suitable_room_types.includes(filters.roomType)
        );
      }
      if (filters.colorFamily) {
        products = products.filter((p) => p.color_family === filters.colorFamily);
      }
      if (filters.styleLook) {
        products = products.filter((p) => p.style_look === filters.styleLook);
      }
      if (filters.materialSpecies) {
        products = products.filter(
          (p) => p.material_species === filters.materialSpecies
        );
      }
      if (typeof filters.minWarrantyResidentialYears === 'number') {
        products = products.filter(
          (p) =>
            typeof p.warranty_residential_years === 'number' &&
            p.warranty_residential_years >= filters.minWarrantyResidentialYears
        );
      }
      if (typeof filters.isWaterproof === 'boolean') {
        products = products.filter(
          (p) => (p.is_waterproof || false) === filters.isWaterproof
        );
      }
      if (typeof filters.isEcoFriendly === 'boolean') {
        products = products.filter(
          (p) => (p.is_eco_friendly || false) === filters.isEcoFriendly
        );
      }
    }

    products.sort((a, b) => {
      if (sortBy === 'price_asc') {
        return (a.price_per_sqft || 0) - (b.price_per_sqft || 0);
      }
      if (sortBy === 'price_desc') {
        return (b.price_per_sqft || 0) - (a.price_per_sqft || 0);
      }
      if (sortBy === 'rating_desc') {
        if ((b.rating_value || 0) === (a.rating_value || 0)) {
          return (b.rating_count || 0) - (a.rating_count || 0);
        }
        return (b.rating_value || 0) - (a.rating_value || 0);
      }
      if (sortBy === 'popularity') {
        if ((b.rating_count || 0) === (a.rating_count || 0)) {
          return (b.rating_value || 0) - (a.rating_value || 0);
        }
        return (b.rating_count || 0) - (a.rating_count || 0);
      }

      // relevance
      if (!q) {
        if ((b.rating_count || 0) === (a.rating_count || 0)) {
          return (b.rating_value || 0) - (a.rating_value || 0);
        }
        return (b.rating_count || 0) - (a.rating_count || 0);
      }
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      const descA = (a.description || '').toLowerCase();
      const descB = (b.description || '').toLowerCase();
      const scoreA = (nameA.includes(q) ? 2 : 0) + (descA.includes(q) ? 1 : 0);
      const scoreB = (nameB.includes(q) ? 2 : 0) + (descB.includes(q) ? 1 : 0);
      if (scoreB === scoreA) {
        if ((b.rating_value || 0) === (a.rating_value || 0)) {
          return (b.rating_count || 0) - (a.rating_count || 0);
        }
        return (b.rating_value || 0) - (a.rating_value || 0);
      }
      return scoreB - scoreA;
    });

    const total_results = products.length;
    const total_pages = total_results === 0 ? 1 : Math.ceil(total_results / pageSize);
    const current_page = Math.min(Math.max(page, 1), total_pages);
    const startIndex = (current_page - 1) * pageSize;
    const pageItems = products.slice(startIndex, startIndex + pageSize);

    const mappedProducts = pageItems.map((p) => {
      const category = categories.find((c) => c.id === p.category_id) || null;
      const thumb = p.images && p.images.length > 0 ? p.images[0] : null;
      return {
        id: p.id,
        name: p.name,
        category_name: category ? category.name : null,
        price_per_sqft: p.price_per_sqft,
        rating_value: p.rating_value,
        rating_count: p.rating_count,
        thumbnail_image_url: thumb,
        is_sample_available: p.is_sample_available || false,
        material_species: p.material_species || null,
        is_waterproof: p.is_waterproof || false,
        style_look: p.style_look || null,
        color_family: p.color_family || null,
        warranty_residential_years: p.warranty_residential_years,
        is_eco_friendly: p.is_eco_friendly || false
      };
    });

    return {
      products: mappedProducts,
      pagination: {
        current_page,
        page_size: pageSize,
        total_pages,
        total_results
      }
    };
  }

  // 7. getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) return null;
    const category = this._findCategoryById(product.category_id);
    return {
      id: product.id,
      name: product.name,
      sku: product.sku || null,
      category_id: product.category_id,
      category_name: category ? category.name : null,
      material_species: product.material_species || null,
      price_per_sqft: product.price_per_sqft,
      rating_value: product.rating_value,
      rating_count: product.rating_count,
      is_waterproof: product.is_waterproof || false,
      style_look: product.style_look || null,
      color_family: product.color_family || null,
      is_eco_friendly: product.is_eco_friendly || false,
      warranty_residential_years: product.warranty_residential_years,
      warranty_commercial_years: product.warranty_commercial_years,
      suitable_room_types: product.suitable_room_types || [],
      is_sample_available: product.is_sample_available || false,
      sample_price: product.sample_price || 0,
      color_options: product.color_options || [],
      images: product.images || [],
      description: product.description || null,
      status: product.status,
      // Foreign key resolution
      category
    };
  }

  // 8. addProductToCart
  addProductToCart(productId, quantitySqft, selectedColorOptionId) {
    const qty = Number(quantitySqft);
    if (!productId || !qty || qty <= 0) {
      return { success: false, message: 'Invalid product or quantity.' };
    }

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId && p.status === 'active');
    if (!product) {
      return { success: false, message: 'Product not found or inactive.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.product_id === productId &&
        (ci.selected_color_option_id || null) === (selectedColorOptionId || null)
    );

    if (cartItem) {
      cartItem.quantity_sqft += qty;
      cartItem.line_subtotal =
        cartItem.quantity_sqft * cartItem.unit_price_per_sqft;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity_sqft: qty,
        unit_price_per_sqft: product.price_per_sqft,
        line_subtotal: qty * product.price_per_sqft,
        selected_color_option_id: selectedColorOptionId || null
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const updatedCartItems = cartItems.filter((ci) => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Product added to cart.',
      cart_id: cart.id,
      cart_item_id: cartItem.id,
      cart_item_count: updatedCartItems.length,
      cart_subtotal: cart.subtotal || 0
    };
  }

  // 9. addProductSampleToCart
  addProductSampleToCart(productId, quantitySamples) {
    const qty = Number(quantitySamples);
    if (!productId || !qty || qty <= 0) {
      return { success: false, message: 'Invalid product or quantity.' };
    }

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId && p.status === 'active');
    if (!product) {
      return { success: false, message: 'Product not found or inactive.' };
    }
    if (!product.is_sample_available) {
      return { success: false, message: 'Sample not available for this product.' };
    }

    const cart = this._getOrCreateSampleCart();
    const sampleItems = this._getFromStorage('sample_cart_items');

    let item = sampleItems.find(
      (ci) => ci.sample_cart_id === cart.id && ci.product_id === productId
    );

    const unitPrice = product.sample_price || 0;

    if (item) {
      item.quantity_samples += qty;
      item.line_subtotal = item.quantity_samples * unitPrice;
    } else {
      item = {
        id: this._generateId('sample_cart_item'),
        sample_cart_id: cart.id,
        product_id: productId,
        quantity_samples: qty,
        unit_sample_price: unitPrice,
        line_subtotal: qty * unitPrice
      };
      sampleItems.push(item);
    }

    this._saveToStorage('sample_cart_items', sampleItems);
    this._recalculateSampleCartTotals(cart);

    const updatedItems = sampleItems.filter((ci) => ci.sample_cart_id === cart.id);

    return {
      success: true,
      message: 'Sample added to cart.',
      sample_cart_id: cart.id,
      sample_cart_item_id: item.id,
      sample_item_count: updatedItems.length,
      sample_cart_subtotal: cart.subtotal || 0
    };
  }

  // 10. getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    this._recalculateCartTotals(cart);
    return this._buildCartSummary(cart);
  }

  // 11. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantitySqft) {
    const qty = Number(quantitySqft);
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart_summary: this._buildCartSummary(cart)
      };
    }

    if (!qty || qty <= 0) {
      // Remove item if quantity is zero or less
      cartItems.splice(idx, 1);
    } else {
      cartItems[idx].quantity_sqft = qty;
      cartItems[idx].line_subtotal =
        qty * (cartItems[idx].unit_price_per_sqft || 0);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const cart_summary = this._buildCartSummary(cart);
    return {
      success: true,
      message: 'Cart updated.',
      cart_summary
    };
  }

  // 12. removeCartItem
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const before = cartItems.length;
    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    const after = cartItems.length;

    if (before === after) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart_summary: this._buildCartSummary(cart)
      };
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    const cart_summary = this._buildCartSummary(cart);
    return {
      success: true,
      message: 'Cart item removed.',
      cart_summary
    };
  }

  // 13. applyPromoCodeToCart
  applyPromoCodeToCart(promoCode) {
    const code = (promoCode || '').trim();
    if (!code) {
      return { success: false, message: 'Promo code is required.' };
    }

    const cart = this._getOrCreateCart();
    const promotions = this._getFromStorage('promotions');
    const now = new Date();

    const promo = promotions.find((p) => {
      if (!p.is_active) return false;
      if (!p.code) return false;
      if (String(p.code).toUpperCase() !== code.toUpperCase()) return false;
      if (p.start_date && new Date(p.start_date) > now) return false;
      if (p.end_date && new Date(p.end_date) < now) return false;
      return true;
    });

    if (!promo) {
      const summary = this._buildCartSummary(cart);
      return {
        success: false,
        message: 'Promo code is invalid or expired.',
        cart_summary: summary
      };
    }

    cart.promo_code = promo.code;
    this._recalculateCartTotals(cart);
    const cart_summary = this._buildCartSummary(cart);
    return {
      success: true,
      message: 'Promo code applied.',
      cart_summary
    };
  }

  // 14. getSampleCartSummary
  getSampleCartSummary() {
    const cart = this._getOrCreateSampleCart();
    this._recalculateSampleCartTotals(cart);
    return this._buildSampleCartSummary(cart);
  }

  // 15. updateSampleCartItemQuantity
  updateSampleCartItemQuantity(sampleCartItemId, quantitySamples) {
    const qty = Number(quantitySamples);
    const cart = this._getOrCreateSampleCart();
    let items = this._getFromStorage('sample_cart_items');
    const idx = items.findIndex((ci) => ci.id === sampleCartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Sample cart item not found.',
        sample_cart_summary: this._buildSampleCartSummary(cart)
      };
    }

    if (!qty || qty <= 0) {
      items.splice(idx, 1);
    } else {
      const unit = items[idx].unit_sample_price || 0;
      items[idx].quantity_samples = qty;
      items[idx].line_subtotal = qty * unit;
    }

    this._saveToStorage('sample_cart_items', items);
    this._recalculateSampleCartTotals(cart);
    const sample_cart_summary = this._buildSampleCartSummary(cart);
    return {
      success: true,
      message: 'Sample cart updated.',
      sample_cart_summary
    };
  }

  // 16. removeSampleCartItem
  removeSampleCartItem(sampleCartItemId) {
    const cart = this._getOrCreateSampleCart();
    let items = this._getFromStorage('sample_cart_items');
    const before = items.length;
    items = items.filter((ci) => ci.id !== sampleCartItemId);
    const after = items.length;

    if (before === after) {
      return {
        success: false,
        message: 'Sample cart item not found.',
        sample_cart_summary: this._buildSampleCartSummary(cart)
      };
    }

    this._saveToStorage('sample_cart_items', items);
    this._recalculateSampleCartTotals(cart);
    const sample_cart_summary = this._buildSampleCartSummary(cart);
    return {
      success: true,
      message: 'Sample cart item removed.',
      sample_cart_summary
    };
  }

  // 17. getCheckoutSummary
  getCheckoutSummary(checkoutContext) {
    const ctx = checkoutContext === 'samples' ? 'samples' : 'products';
    if (ctx === 'products') {
      const cart = this._getOrCreateCart();
      this._recalculateCartTotals(cart);
      const cartItems = this._getFromStorage('cart_items').filter(
        (ci) => ci.cart_id === cart.id
      );
      const products = this._getFromStorage('products');
      const categories = this._getFromStorage('categories');

      const items = cartItems.map((ci) => {
        const product = products.find((p) => p.id === ci.product_id) || null;
        const category = product
          ? categories.find((c) => c.id === product.category_id) || null
          : null;
        const thumb = product && product.images ? product.images[0] : null;
        return {
          product_id: ci.product_id,
          product_name: product ? product.name : null,
          category_name: category ? category.name : null,
          is_sample: false,
          quantity_sqft: ci.quantity_sqft,
          quantity_samples: null,
          unit_price_per_sqft: ci.unit_price_per_sqft,
          unit_sample_price: null,
          line_subtotal: ci.line_subtotal,
          thumbnail_image_url: thumb,
          // Foreign key resolution
          product
        };
      });

      return {
        checkout_context: 'products',
        is_sample_order: false,
        items,
        promo_code: cart.promo_code || null,
        promo_discount_amount: cart.promo_discount_amount || 0,
        subtotal: cart.subtotal || 0,
        discount_total: cart.discount_total || 0,
        shipping_total_estimate: 0,
        tax_estimate: cart.tax_estimate || 0,
        total_estimate: (cart.subtotal || 0) - (cart.discount_total || 0)
      };
    }

    // samples
    const cart = this._getOrCreateSampleCart();
    this._recalculateSampleCartTotals(cart);
    const sampleItems = this._getFromStorage('sample_cart_items').filter(
      (ci) => ci.sample_cart_id === cart.id
    );
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    const items = sampleItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const category = product
        ? categories.find((c) => c.id === product.category_id) || null
        : null;
      const thumb = product && product.images ? product.images[0] : null;
      return {
        product_id: ci.product_id,
        product_name: product ? product.name : null,
        category_name: category ? category.name : null,
        is_sample: true,
        quantity_sqft: null,
        quantity_samples: ci.quantity_samples,
        unit_price_per_sqft: null,
        unit_sample_price: ci.unit_sample_price,
        line_subtotal: ci.line_subtotal,
        thumbnail_image_url: thumb,
        // Foreign key resolution
        product
      };
    });

    return {
      checkout_context: 'samples',
      is_sample_order: true,
      items,
      promo_code: null,
      promo_discount_amount: 0,
      subtotal: cart.subtotal || 0,
      discount_total: 0,
      shipping_total_estimate: 0,
      tax_estimate: 0,
      total_estimate: cart.subtotal || 0
    };
  }

  // 18. getAvailableShippingMethods
  getAvailableShippingMethods(checkoutContext, shippingPostalCode) {
    // Currently not filtering by context or postal code; all methods are returned.
    const methods = this._getFromStorage('shipping_methods');
    return methods;
  }

  // 19. submitCheckoutOrder
  submitCheckoutOrder(
    checkoutContext,
    shippingAddress,
    contactEmail,
    contactPhone,
    shippingMethodCode,
    paymentMethodToken
  ) {
    const ctx = checkoutContext === 'samples' ? 'samples' : 'products';
    const shipping_methods = this._getFromStorage('shipping_methods');
    const shippingMethod = shipping_methods.find(
      (m) => m.code === shippingMethodCode
    );

    const products = this._getFromStorage('products');

    let isSampleOrder = ctx === 'samples';
    let items = [];
    let subtotal = 0;
    let promo_code = null;
    let promo_discount_amount = 0;
    let discount_total = 0;

    if (ctx === 'products') {
      const cart = this._getOrCreateCart();
      this._recalculateCartTotals(cart);
      const cartItems = this._getFromStorage('cart_items').filter(
        (ci) => ci.cart_id === cart.id
      );

      subtotal = cart.subtotal || 0;
      promo_code = cart.promo_code || null;
      promo_discount_amount = cart.promo_discount_amount || 0;
      discount_total = cart.discount_total || 0;

      items = cartItems.map((ci) => {
        const product = products.find((p) => p.id === ci.product_id) || null;
        const line_total = ci.line_subtotal || 0;
        return {
          product_id: ci.product_id,
          product_name: product ? product.name : null,
          is_sample: false,
          quantity_sqft: ci.quantity_sqft,
          quantity_samples: null,
          unit_price_per_sqft: ci.unit_price_per_sqft,
          unit_sample_price: null,
          line_total
        };
      });
    } else {
      const cart = this._getOrCreateSampleCart();
      this._recalculateSampleCartTotals(cart);
      const sampleItems = this._getFromStorage('sample_cart_items').filter(
        (ci) => ci.sample_cart_id === cart.id
      );

      subtotal = cart.subtotal || 0;
      promo_code = null;
      promo_discount_amount = 0;
      discount_total = 0;

      items = sampleItems.map((ci) => {
        const product = products.find((p) => p.id === ci.product_id) || null;
        const line_total = ci.line_subtotal || 0;
        return {
          product_id: ci.product_id,
          product_name: product ? product.name : null,
          is_sample: true,
          quantity_sqft: null,
          quantity_samples: ci.quantity_samples,
          unit_price_per_sqft: null,
          unit_sample_price: ci.unit_sample_price,
          line_total
        };
      });
    }

    if (!items.length) {
      return {
        order_id: null,
        order_number: null,
        is_sample_order: isSampleOrder,
        order_status: 'pending_payment',
        items: [],
        subtotal: 0,
        discount_total: 0,
        shipping_total: 0,
        tax_total: 0,
        total: 0,
        promo_code: null,
        promo_discount_amount: 0,
        shipping_method_code: shippingMethodCode || null,
        confirmation_message: 'No items to checkout.'
      };
    }

    const shipping_total = shippingMethod ? shippingMethod.cost : 0;
    const tax_total = 0;
    const total = subtotal - discount_total + shipping_total + tax_total;

    const orders = this._getFromStorage('orders');
    const order_items = this._getFromStorage('order_items');

    const order_id = this._generateId('order');
    const order_number = 'ORD-' + this._getNextIdCounter();

    const order = {
      id: order_id,
      order_number,
      items: items.map((it) => it.product_id),
      is_sample_order: isSampleOrder,
      subtotal,
      discount_total,
      shipping_total,
      tax_total,
      total,
      promo_code,
      promo_discount_amount,
      shipping_method_code: shippingMethodCode || null,
      shipping_full_name: shippingAddress.fullName || null,
      shipping_address_line1: shippingAddress.addressLine1 || null,
      shipping_address_line2: shippingAddress.addressLine2 || null,
      shipping_city: shippingAddress.city || null,
      shipping_state: shippingAddress.state || null,
      shipping_postal_code: shippingAddress.postalCode || null,
      shipping_country: shippingAddress.country || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      is_guest_checkout: true,
      order_status: 'paid',
      placed_at: this._nowIso()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    items.forEach((it) => {
      const oi = {
        id: this._generateId('order_item'),
        order_id,
        product_id: it.product_id,
        is_sample: it.is_sample,
        quantity_sqft: it.quantity_sqft,
        quantity_samples: it.quantity_samples,
        unit_price_per_sqft: it.unit_price_per_sqft,
        unit_sample_price: it.unit_sample_price,
        line_total: it.line_total,
        selected_color_option_id: null
      };
      order_items.push(oi);
    });
    this._saveToStorage('order_items', order_items);

    // Clear respective cart
    if (ctx === 'products') {
      const cart = this._getOrCreateCart();
      const allCartItems = this._getFromStorage('cart_items').filter(
        (ci) => ci.cart_id !== cart.id
      );
      this._saveToStorage('cart_items', allCartItems);
      cart.subtotal = 0;
      cart.discount_total = 0;
      cart.promo_code = null;
      cart.promo_discount_amount = 0;
      cart.tax_estimate = 0;
      cart.total = 0;
      this._saveCart(cart);
    } else {
      const cart = this._getOrCreateSampleCart();
      const allSampleItems = this._getFromStorage('sample_cart_items').filter(
        (ci) => ci.sample_cart_id !== cart.id
      );
      this._saveToStorage('sample_cart_items', allSampleItems);
      cart.subtotal = 0;
      this._saveSampleCart(cart);
    }

    return {
      order_id,
      order_number,
      is_sample_order: isSampleOrder,
      order_status: order.order_status,
      items,
      subtotal,
      discount_total,
      shipping_total,
      tax_total,
      total,
      promo_code,
      promo_discount_amount,
      shipping_method_code: shippingMethodCode || null,
      confirmation_message: 'Order placed successfully.'
    };
  }

  // 20. calculateRoomCoverage
  calculateRoomCoverage(productId, rooms, overagePercent) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return null;
    }

    const roomList = Array.isArray(rooms) ? rooms : [];
    let totalWithout = 0;
    roomList.forEach((r) => {
      const len = Number(r.length_ft) || 0;
      const wid = Number(r.width_ft) || 0;
      totalWithout += len * wid;
    });

    const over = typeof overagePercent === 'number' ? overagePercent : 0;
    const totalWith = totalWithout * (1 + over / 100);

    const calcs = this._getFromStorage('room_calculations');
    const id = this._generateId('room_calc');
    const now = this._nowIso();

    const record = {
      id,
      product_id: productId,
      rooms: roomList.map((r) => ({
        label: r.label,
        length_ft: Number(r.length_ft) || 0,
        width_ft: Number(r.width_ft) || 0
      })),
      overage_percent: over,
      total_sqft_without_overage: totalWithout,
      total_sqft_with_overage: totalWith,
      last_calculated_at: now
    };

    calcs.push(record);
    this._saveToStorage('room_calculations', calcs);

    return {
      calculation_id: id,
      product_id: productId,
      rooms: record.rooms,
      overage_percent: over,
      total_sqft_without_overage: totalWithout,
      total_sqft_with_overage: totalWith,
      last_calculated_at: now
    };
  }

  // 21. createProductQuote
  createProductQuote(productId, quantitySqft, contactName, contactEmail, contactPostalCode) {
    const qty = Number(quantitySqft);
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product || !qty || qty <= 0) {
      return null;
    }

    const price = product.price_per_sqft || 0;
    const estimated = price * qty;

    const quotes = this._getFromStorage('product_quotes');
    const id = this._generateId('quote');
    const now = this._nowIso();

    const record = {
      id,
      product_id: productId,
      product_name_snapshot: product.name,
      price_per_sqft_at_quote: price,
      quantity_sqft: qty,
      estimated_material_total: estimated,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_postal_code: contactPostalCode,
      status: 'open',
      created_at: now
    };

    quotes.push(record);
    this._saveToStorage('product_quotes', quotes);

    return {
      quote_id: id,
      product_id: productId,
      product_name_snapshot: product.name,
      price_per_sqft_at_quote: price,
      quantity_sqft: qty,
      estimated_material_total: estimated,
      status: 'open',
      created_at: now,
      confirmation_message: 'Quote request saved.'
    };
  }

  // 22. addProductToComparison
  addProductToComparison(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        comparison_set_id: null,
        product_ids: [],
        total_selected: 0
      };
    }

    const set = this._getOrCreateComparisonSet();
    if (!set.product_ids.includes(productId)) {
      set.product_ids.push(productId);
    }
    this._saveComparisonSet(set);

    return {
      comparison_set_id: set.id,
      product_ids: set.product_ids.slice(),
      total_selected: set.product_ids.length
    };
  }

  // 23. removeProductFromComparison
  removeProductFromComparison(productId) {
    const set = this._getOrCreateComparisonSet();
    set.product_ids = set.product_ids.filter((id) => id !== productId);
    this._saveComparisonSet(set);

    return {
      comparison_set_id: set.id,
      product_ids: set.product_ids.slice(),
      total_selected: set.product_ids.length
    };
  }

  // 24. getComparisonDetails
  getComparisonDetails() {
    const set = this._getOrCreateComparisonSet();
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    const resultProducts = set.product_ids
      .map((pid) => products.find((p) => p.id === pid))
      .filter(Boolean)
      .map((p) => {
        const category = categories.find((c) => c.id === p.category_id) || null;
        const thumb = p.images && p.images[0] ? p.images[0] : null;
        const colorOptions = Array.isArray(p.color_options)
          ? p.color_options.map((co) => co.name)
          : [];
        return {
          product_id: p.id,
          name: p.name,
          category_name: category ? category.name : null,
          price_per_sqft: p.price_per_sqft,
          rating_value: p.rating_value,
          rating_count: p.rating_count,
          color_options: colorOptions,
          suitable_room_types: p.suitable_room_types || [],
          warranty_residential_years: p.warranty_residential_years,
          warranty_commercial_years: p.warranty_commercial_years,
          is_waterproof: p.is_waterproof || false,
          style_look: p.style_look || null,
          color_family: p.color_family || null,
          material_species: p.material_species || null,
          thumbnail_image_url: thumb
        };
      });

    return {
      comparison_set_id: set.id,
      products: resultProducts
    };
  }

  // 25. getInstallationServiceOptions
  getInstallationServiceOptions() {
    const room_types = [
      { value: 'kitchen', label: 'Kitchen' },
      { value: 'bathroom', label: 'Bathroom' },
      { value: 'bedroom', label: 'Bedroom' },
      { value: 'living_room', label: 'Living Room' },
      { value: 'hallway', label: 'Hallway' },
      { value: 'dining_room', label: 'Dining Room' },
      { value: 'basement', label: 'Basement' },
      { value: 'other_room', label: 'Other Room' }
    ];

    const flooring_types = [
      { value: 'laminate', label: 'Laminate' },
      { value: 'carpet', label: 'Carpet' },
      { value: 'luxury_vinyl_plank', label: 'Luxury Vinyl Plank' },
      { value: 'vinyl', label: 'Vinyl' },
      { value: 'tile', label: 'Tile' },
      { value: 'hardwood', label: 'Hardwood' },
      { value: 'waterproof', label: 'Waterproof' }
    ];

    const intro_text =
      'Schedule professional flooring installation for any room type and flooring material. Choose a convenient date and time that works for you.';

    return { room_types, flooring_types, intro_text };
  }

  // 26. getInstallationAvailableSlots
  getInstallationAvailableSlots(
    roomType,
    flooringType,
    servicePostalCode,
    startDate,
    endDate
  ) {
    const dates = this._dateRange(startDate, endDate);
    const existing = this._getFromStorage('installation_appointments').filter(
      (a) =>
        a.room_type === roomType &&
        a.flooring_type === flooringType &&
        a.service_postal_code === servicePostalCode
    );

    const results = dates.map((dateStr) => {
      const { weekday, isWeekend } = this._weekdayInfo(dateStr);

      // Define generic slots: 8-10, 10-12, 13-15, 15-17
      const baseSlots = [
        { startHour: 8, endHour: 10, label: '8:00 AM – 10:00 AM', isMorning: true },
        { startHour: 10, endHour: 12, label: '10:00 AM – 12:00 PM', isMorning: true },
        { startHour: 13, endHour: 15, label: '1:00 PM – 3:00 PM', isMorning: false },
        { startHour: 15, endHour: 17, label: '3:00 PM – 5:00 PM', isMorning: false }
      ];

      const time_slots = baseSlots.map((s) => {
        const start_datetime = `${dateStr}T${String(s.startHour).padStart(2, '0')}:00:00`;
        const end_datetime = `${dateStr}T${String(s.endHour).padStart(2, '0')}:00:00`;
        const taken = existing.some((a) => {
          const aDate = a.appointment_datetime || '';
          return aDate.startsWith(dateStr + 'T') && aDate === start_datetime;
        });
        const is_available = !taken;
        return {
          start_datetime,
          end_datetime,
          label: s.label,
          is_morning: s.isMorning,
          is_available
        };
      });

      return {
        date: dateStr,
        weekday,
        is_weekend: isWeekend,
        time_slots
      };
    });

    return results;
  }

  // 27. bookInstallationAppointment
  bookInstallationAppointment(
    roomType,
    flooringType,
    servicePostalCode,
    appointmentDatetime,
    customerName,
    customerPhone,
    customerEmail
  ) {
    const appointments = this._getFromStorage('installation_appointments');
    const id = this._generateId('install_appt');

    const record = {
      id,
      room_type: roomType,
      flooring_type: flooringType,
      service_postal_code: servicePostalCode,
      appointment_datetime: appointmentDatetime,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      status: 'pending',
      created_at: this._nowIso()
    };

    appointments.push(record);
    this._saveToStorage('installation_appointments', appointments);

    return {
      appointment_id: id,
      room_type: roomType,
      flooring_type: flooringType,
      service_postal_code: servicePostalCode,
      appointment_datetime: appointmentDatetime,
      status: 'pending',
      confirmation_message: 'Installation appointment requested.'
    };
  }

  // 28. getRefinishingServiceOptions
  getRefinishingServiceOptions() {
    const service_types = [
      {
        value: 'hardwood_refinishing',
        label: 'Hardwood Refinishing',
        description:
          'Restore the beauty of your existing hardwood floors with sanding, staining, and finishing.'
      },
      {
        value: 'refinishing',
        label: 'Refinishing',
        description:
          'General refinishing services for various flooring surfaces to refresh their appearance.'
      },
      {
        value: 'repair',
        label: 'Repair',
        description:
          'Repair damaged flooring sections, including board replacement and spot fixes.'
      },
      {
        value: 'other_service',
        label: 'Other Service',
        description: 'Describe any other refinishing or repair needs you may have.'
      }
    ];

    const intro_text =
      'Request an estimate for hardwood refinishing or flooring repair services. Provide room details, square footage, and budget to help us prepare your quote.';

    return { service_types, intro_text };
  }

  // 29. submitRefinishingEstimateRequest
  submitRefinishingEstimateRequest(
    serviceType,
    roomDescription,
    squareFootage,
    budgetAmount,
    preferredStartDate,
    contactName,
    contactPhone,
    contactEmail,
    contactPostalCode
  ) {
    const sqft = Number(squareFootage) || 0;
    const budget = typeof budgetAmount === 'number' ? budgetAmount : null;

    const requests = this._getFromStorage('refinishing_estimate_requests');
    const id = this._generateId('refinish_req');
    const now = this._nowIso();

    const record = {
      id,
      service_type: serviceType,
      room_description: roomDescription,
      square_footage: sqft,
      budget_amount: budget,
      preferred_start_date: preferredStartDate || null,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      contact_postal_code: contactPostalCode,
      status: 'submitted',
      created_at: now
    };

    requests.push(record);
    this._saveToStorage('refinishing_estimate_requests', requests);

    return {
      estimate_request_id: id,
      service_type: serviceType,
      room_description: roomDescription,
      square_footage: sqft,
      budget_amount: budget,
      preferred_start_date: preferredStartDate || null,
      status: 'submitted',
      created_at: now,
      confirmation_message: 'Refinishing estimate request submitted.'
    };
  }

  // 30. findStoresByPostalCode
  findStoresByPostalCode(postalCode) {
    const stores = this._getFromStorage('stores');
    const targetZipNum = parseInt(postalCode, 10);

    const results = stores.map((s) => {
      const storeZipNum = parseInt(s.postal_code, 10);
      const distance =
        !isNaN(targetZipNum) && !isNaN(storeZipNum)
          ? Math.abs(storeZipNum - targetZipNum)
          : 0;
      return {
        store_id: s.id,
        name: s.name,
        address_line1: s.address_line1,
        address_line2: s.address_line2 || null,
        city: s.city,
        state: s.state,
        postal_code: s.postal_code,
        phone: s.phone || null,
        email: s.email || null,
        latitude: s.latitude || null,
        longitude: s.longitude || null,
        business_hours: s.business_hours || null,
        is_showroom: s.is_showroom || false,
        distance_miles: distance
      };
    });

    results.sort((a, b) => a.distance_miles - b.distance_miles);
    return results;
  }

  // 31. getStoreDetails
  getStoreDetails(storeId) {
    const stores = this._getFromStorage('stores');
    const s = stores.find((st) => st.id === storeId);
    if (!s) return null;
    return {
      store_id: s.id,
      name: s.name,
      address_line1: s.address_line1,
      address_line2: s.address_line2 || null,
      city: s.city,
      state: s.state,
      postal_code: s.postal_code,
      phone: s.phone || null,
      email: s.email || null,
      latitude: s.latitude || null,
      longitude: s.longitude || null,
      business_hours: s.business_hours || null,
      is_showroom: s.is_showroom || false
    };
  }

  // 32. getShowroomVisitAvailability
  getShowroomVisitAvailability(storeId, startDate, endDate) {
    const dates = this._dateRange(startDate, endDate);
    const appointments = this._getFromStorage('showroom_visit_appointments').filter(
      (a) => a.store_id === storeId
    );

    const results = dates.map((dateStr) => {
      const { weekday } = this._weekdayInfo(dateStr);

      // Hourly slots 10:00–17:00
      const baseHours = [10, 11, 12, 13, 14, 15, 16];
      const time_slots = baseHours.map((h) => {
        const visit_datetime = `${dateStr}T${String(h).padStart(2, '0')}:00:00`;
        const labelHour = h % 12 === 0 ? 12 : h % 12;
        const ampm = h < 12 ? 'AM' : 'PM';
        const label = `${labelHour}:00 ${ampm}`;
        const taken = appointments.some((a) => a.visit_datetime === visit_datetime);
        return {
          visit_datetime,
          label,
          is_available: !taken
        };
      });

      return {
        date: dateStr,
        weekday,
        time_slots
      };
    });

    return results;
  }

  // 33. bookShowroomVisitAppointment
  bookShowroomVisitAppointment(
    storeId,
    visitDatetime,
    visitorName,
    visitorEmail,
    visitorPhone,
    projectNotes
  ) {
    const appointments = this._getFromStorage('showroom_visit_appointments');
    const id = this._generateId('showroom_appt');

    const record = {
      id,
      store_id: storeId,
      visit_datetime: visitDatetime,
      visitor_name: visitorName,
      visitor_email: visitorEmail,
      visitor_phone: visitorPhone,
      project_notes: projectNotes || null,
      status: 'pending',
      created_at: this._nowIso()
    };

    appointments.push(record);
    this._saveToStorage('showroom_visit_appointments', appointments);

    return {
      appointment_id: id,
      store_id: storeId,
      visit_datetime: visitDatetime,
      status: 'pending',
      confirmation_message: 'Showroom visit appointment requested.'
    };
  }

  // 34. getStaticPageContent
  getStaticPageContent(pageCode) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find((p) => p.page_code === pageCode);
    if (page) {
      return page;
    }

    // Fallback minimal content if not defined in storage
    return {
      page_code: pageCode,
      title: pageCode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      sections: [
        {
          heading: 'Content Unavailable',
          body_html: '<p>This page content has not been configured.</p>'
        }
      ]
    };
  }

  // 35. submitContactForm
  submitContactForm(name, email, phone, topic, message) {
    const tickets = this._getFromStorage('contact_messages');
    const id = this._generateId('contact');

    const record = {
      id,
      name,
      email,
      phone: phone || null,
      topic: topic || null,
      message,
      created_at: this._nowIso()
    };

    tickets.push(record);
    this._saveToStorage('contact_messages', tickets);

    return {
      success: true,
      message: 'Your message has been submitted.',
      ticket_id: id
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
