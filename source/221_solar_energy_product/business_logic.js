/*
  BusinessLogic implementation for Solar Energy Products & Services website
  - Uses localStorage for persistence (with Node.js polyfill)
  - No DOM/window/document usage except for attaching global in browser
  - All data JSON-serializable
*/

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

  // =========================
  // Storage helpers
  // =========================

  _initStorage() {
    // Initialize all logical "tables" in localStorage if not present
    const defaults = {
      product_categories: [],
      products: [],
      cart: [],
      cart_items: [],
      articles: [],
      reading_lists: [],
      reading_list_items: [],
      maintenance_plans: [],
      solar_calculator_configs: [],
      recommended_systems: [],
      financing_options: [],
      selected_financing_options: [],
      consultation_requests: [],
      commercial_quote_requests: [],
      orders: [],
      order_items: [],
      shipments: [],
      shipment_events: [],
      homepage_highlights: null,
      about_page_content: null,
      contact_page_content: null,
      faq_content: null,
      privacy_policy_content: null,
      terms_of_use_content: null,
      contact_form_submissions: []
    };

    Object.keys(defaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        const value = defaults[key];
        localStorage.setItem(key, JSON.stringify(value));
      }
    });

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') return defaultValue;
    try {
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? defaultValue : parsed;
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

  _now() {
    return new Date().toISOString();
  }

  // =========================
  // Private helper functions
  // =========================

  // Cart helpers
  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('cart');
    if (carts.length === 0) {
      carts.push(cart);
    } else {
      carts[0] = cart;
    }
    this._saveToStorage('cart', carts);
  }

  _recalculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cartId);
    let subtotal = 0;
    let itemCount = 0;
    let currency = 'USD';

    const products = this._getFromStorage('products');
    const plans = this._getFromStorage('maintenance_plans');

    cartItems.forEach((item) => {
      const termYears = item.term_years || 1;
      const lineSubtotal = (item.unit_price || 0) * (item.quantity || 0) * termYears;
      subtotal += lineSubtotal;
      itemCount += item.quantity || 0;

      if (!currency) {
        if (item.item_type === 'product') {
          const p = products.find((pr) => pr.id === item.product_id);
          if (p && p.currency) currency = p.currency;
        } else if (item.item_type === 'maintenance_plan') {
          const mp = plans.find((pl) => pl.id === item.maintenance_plan_id);
          if (mp && mp.currency) currency = mp.currency;
        }
      }
    });

    const tax = 0;
    const shipping_fee = 0;
    const total = subtotal + tax + shipping_fee;

    return {
      item_count: itemCount,
      subtotal,
      total,
      tax,
      shipping_fee,
      currency
    };
  }

  // Reading list helpers
  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists');
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        name: 'My Reading List',
        article_ids: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  _saveReadingList(list) {
    let lists = this._getFromStorage('reading_lists');
    if (lists.length === 0) {
      lists.push(list);
    } else {
      lists[0] = list;
    }
    this._saveToStorage('reading_lists', lists);
  }

  // Solar calculator helpers
  _setCurrentCalculatorRecommendation(calculatorConfigId, recommendedSystemId) {
    const payload = {
      calculator_config_id: calculatorConfigId,
      recommended_system_id: recommendedSystemId
    };
    localStorage.setItem('current_calculator_recommendation', JSON.stringify(payload));
  }

  _getCurrentCalculatorRecommendation() {
    const raw = localStorage.getItem('current_calculator_recommendation');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.calculator_config_id || !parsed.recommended_system_id) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  // Order access helper
  _validateOrderAccessByOrderNumberAndPostalCode(orderNumber, postalCode) {
    const orders = this._getFromStorage('orders');
    const order = orders.find(
      (o) => o.order_number === orderNumber && o.shipping_postal_code === postalCode
    );
    if (!order) return null;
    const shipments = this._getFromStorage('shipments').filter((s) => s.order_id === order.id);
    return { order, shipments };
  }

  // =========================
  // Interface implementations
  // =========================

  // 1. getProductCategoriesForNavAndHomepage
  getProductCategoriesForNavAndHomepage() {
    const categories = this._getFromStorage('product_categories');
    return categories
      .slice()
      .sort((a, b) => {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return sa - sb;
      });
  }

  // 2. getHomepageFeaturedProducts
  getHomepageFeaturedProducts(limitPerCategory) {
    const limit = typeof limitPerCategory === 'number' && limitPerCategory > 0 ? limitPerCategory : 4;
    const products = this._getFromStorage('products').filter((p) => p.status === 'active');

    const byCategory = (categoryKey) => {
      return products
        .filter((p) => p.category_id === categoryKey)
        .sort((a, b) => {
          const da = a.created_at ? Date.parse(a.created_at) : 0;
          const db = b.created_at ? Date.parse(b.created_at) : 0;
          return db - da;
        })
        .slice(0, limit);
    };

    return {
      solar_panel_kits: byCategory('solar_panel_kits'),
      inverters: byCategory('inverters'),
      batteries_storage: byCategory('batteries_storage')
    };
  }

  // 3. getHomepageHighlights
  getHomepageHighlights() {
    const data = this._getObjectFromStorage('homepage_highlights', null);
    if (data && typeof data === 'object') {
      return {
        value_props: Array.isArray(data.value_props) ? data.value_props : [],
        trust_indicators: Array.isArray(data.trust_indicators) ? data.trust_indicators : []
      };
    }
    return {
      value_props: [],
      trust_indicators: []
    };
  }

  // 4. getProductFilterOptions
  getProductFilterOptions(categoryId) {
    const categories = this._getFromStorage('product_categories');
    const category = categories.find((c) => c.key === categoryId) || null;
    const products = this._getFromStorage('products').filter(
      (p) => p.category_id === categoryId && p.status === 'active'
    );

    const extractRange = (arr, field) => {
      const values = arr
        .map((p) => (typeof p[field] === 'number' ? p[field] : null))
        .filter((v) => v !== null && !Number.isNaN(v));
      if (!values.length) return null;
      const min = Math.min.apply(null, values);
      const max = Math.max.apply(null, values);
      return { min, max };
    };

    const powerRange = extractRange(products, 'power_kw');
    const capacityRange = extractRange(products, 'capacity_kwh');
    const priceRange = extractRange(products, 'price');

    const power_kw_ranges = powerRange
      ? [
          {
            min: powerRange.min,
            max: powerRange.max,
            label: powerRange.min + '-' + powerRange.max + ' kW'
          }
        ]
      : [];

    const capacity_kwh_ranges = capacityRange
      ? [
          {
            min: capacityRange.min,
            max: capacityRange.max,
            label: capacityRange.min + '+' + ' kWh'
          }
        ]
      : [];

    let currency = 'USD';
    if (products.length && products[0].currency) currency = products[0].currency;

    const price = priceRange
      ? {
          min: priceRange.min,
          max: priceRange.max,
          step: 50,
          currency
        }
      : {
          min: 0,
          max: 0,
          step: 50,
          currency
        };

    const rating_thresholds = [
      { min_rating: 4, label: '4 stars and up' },
      { min_rating: 4.5, label: '4.5 stars and up' }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      category: category
        ? {
            key: category.key,
            name: category.name,
            description: category.description || ''
          }
        : { key: categoryId, name: '', description: '' },
      power_kw_ranges,
      capacity_kwh_ranges,
      price,
      rating_thresholds,
      sort_options
    };
  }

  // 5. searchProductsInCategory
  searchProductsInCategory(
    categoryId,
    keyword,
    powerKwMin,
    powerKwMax,
    capacityKwhMin,
    capacityKwhMax,
    maxPrice,
    minRating,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const categories = this._getFromStorage('product_categories');
    const category = categories.find((c) => c.key === categoryId) || null;

    let products = this._getFromStorage('products').filter(
      (p) => p.category_id === categoryId && p.status === 'active'
    );

    if (keyword && typeof keyword === 'string') {
      const kw = keyword.toLowerCase();
      products = products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const sd = (p.short_description || '').toLowerCase();
        const ld = (p.long_description || '').toLowerCase();
        return name.includes(kw) || sd.includes(kw) || ld.includes(kw);
      });
    }

    if (typeof powerKwMin === 'number') {
      products = products.filter(
        (p) => typeof p.power_kw === 'number' && p.power_kw >= powerKwMin
      );
    }
    if (typeof powerKwMax === 'number') {
      products = products.filter(
        (p) => typeof p.power_kw === 'number' && p.power_kw <= powerKwMax
      );
    }
    if (typeof capacityKwhMin === 'number') {
      products = products.filter(
        (p) => typeof p.capacity_kwh === 'number' && p.capacity_kwh >= capacityKwhMin
      );
    }
    if (typeof capacityKwhMax === 'number') {
      products = products.filter(
        (p) => typeof p.capacity_kwh === 'number' && p.capacity_kwh <= capacityKwhMax
      );
    }
    if (typeof maxPrice === 'number') {
      products = products.filter(
        (p) => typeof p.price === 'number' && p.price <= maxPrice
      );
    }
    if (typeof minRating === 'number') {
      products = products.filter((p) => (p.average_rating || 0) >= minRating);
    }

    const sortDir = sortDirection === 'desc' ? 'desc' : 'asc';
    const sb = sortBy || 'relevance';

    const compareNumber = (a, b, field) => {
      const va = typeof a[field] === 'number' ? a[field] : 0;
      const vb = typeof b[field] === 'number' ? b[field] : 0;
      return va - vb;
    };

    if (sb === 'price' || sb === 'price_low_to_high' || sb === 'price_high_to_low') {
      products.sort((a, b) => compareNumber(a, b, 'price'));
    } else if (sb === 'newest') {
      products.sort((a, b) => {
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return da - db;
      });
    } else if (sb === 'rating') {
      products.sort((a, b) => compareNumber(a, b, 'average_rating'));
    }

    if (sortDir === 'desc' && sb !== 'relevance') {
      products.reverse();
    }

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const totalItems = products.length;
    const totalPages = Math.ceil(totalItems / size) || 1;
    const start = (currentPage - 1) * size;
    const pagedProducts = products.slice(start, start + size);

    // Foreign key resolution for category_id -> category
    const categoryIndex = {};
    categories.forEach((c) => {
      categoryIndex[c.key] = c;
    });

    const productsWithCategory = pagedProducts.map((p) => {
      const cat = categoryIndex[p.category_id];
      return Object.assign({}, p, {
        category: cat || null
      });
    });

    return {
      category: category
        ? { key: category.key, name: category.name }
        : { key: categoryId, name: '' },
      products: productsWithCategory,
      pagination: {
        page: currentPage,
        pageSize: size,
        totalItems,
        totalPages
      },
      appliedFilters: {
        keyword: keyword || '',
        powerKwMin: typeof powerKwMin === 'number' ? powerKwMin : null,
        powerKwMax: typeof powerKwMax === 'number' ? powerKwMax : null,
        capacityKwhMin: typeof capacityKwhMin === 'number' ? capacityKwhMin : null,
        capacityKwhMax: typeof capacityKwhMax === 'number' ? capacityKwhMax : null,
        maxPrice: typeof maxPrice === 'number' ? maxPrice : null,
        minRating: typeof minRating === 'number' ? minRating : null,
        sortBy: sb,
        sortDirection: sortDir
      }
    };
  }

  // 6. getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const product = products.find((p) => p.id === productId) || null;

    let category = null;
    if (product) {
      category = categories.find((c) => c.key === product.category_id) || null;
    }

    const rating_summary = product
      ? {
          average_rating: product.average_rating || 0,
          rating_count: product.rating_count || 0
        }
      : { average_rating: 0, rating_count: 0 };

    let related_products = [];
    if (product) {
      related_products = products
        .filter(
          (p) =>
            p.id !== product.id &&
            p.category_id === product.category_id &&
            p.status === 'active'
        )
        .slice(0, 8);
    }

    return {
      product: product
        ? {
            id: product.id,
            name: product.name,
            short_description: product.short_description || '',
            long_description: product.long_description || '',
            price: product.price,
            currency: product.currency || 'USD',
            power_kw: product.power_kw || null,
            capacity_kwh: product.capacity_kwh || null,
            warranty_years: product.warranty_years || null,
            is_grid_tied: !!product.is_grid_tied,
            connection_type: product.connection_type || null,
            average_rating: product.average_rating || 0,
            rating_count: product.rating_count || 0,
            image_urls: Array.isArray(product.image_urls) ? product.image_urls : [],
            status: product.status
          }
        : null,
      category: category
        ? { key: category.key, name: category.name }
        : null,
      rating_summary,
      related_products
    };
  }

  // 7. addProductToCart
  addProductToCart(productId, quantity) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId && p.status === 'active');
    if (!product) {
      return {
        success: false,
        cartId: null,
        message: 'Product not found or inactive',
        cart_summary: null
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let existing = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.item_type === 'product' && ci.product_id === productId
    );

    if (existing) {
      existing.quantity += qty;
      existing.added_at = this._now();
    } else {
      const cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'product',
        product_id: productId,
        maintenance_plan_id: null,
        name: product.name,
        unit_price: product.price,
        quantity: qty,
        term_years: null,
        auto_renew: false,
        added_at: this._now()
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
      cart.item_ids.push(cartItem.id);
      cart.updated_at = this._now();
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const totals = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      cartId: cart.id,
      message: 'Product added to cart',
      cart_summary: {
        item_count: totals.item_count,
        subtotal: totals.subtotal,
        currency: totals.currency
      }
    };
  }

  // 8. getCartSummary
  getCartSummary() {
    const carts = this._getFromStorage('cart');
    const cart = carts[0] || null;
    if (!cart) {
      return {
        cart: null,
        items: [],
        totals: {
          subtotal: 0,
          tax: 0,
          shipping_fee: 0,
          total: 0,
          currency: 'USD'
        }
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const products = this._getFromStorage('products');
    const plans = this._getFromStorage('maintenance_plans');

    const items = cartItems.map((ci) => {
      const product = ci.product_id
        ? products.find((p) => p.id === ci.product_id) || null
        : null;
      const maintenance_plan = ci.maintenance_plan_id
        ? plans.find((p) => p.id === ci.maintenance_plan_id) || null
        : null;

      const termYears = ci.term_years || 1;
      const line_subtotal = (ci.unit_price || 0) * (ci.quantity || 0) * termYears;

      return {
        cart_item: {
          id: ci.id,
          item_type: ci.item_type,
          name: ci.name,
          unit_price: ci.unit_price,
          quantity: ci.quantity,
          term_years: ci.term_years || null,
          auto_renew: !!ci.auto_renew
        },
        product,
        maintenance_plan,
        line_subtotal
      };
    });

    const totals = this._recalculateCartTotals(cart.id);

    return {
      cart: {
        id: cart.id,
        created_at: cart.created_at,
        updated_at: cart.updated_at
      },
      items,
      totals: {
        subtotal: totals.subtotal,
        tax: totals.tax,
        shipping_fee: totals.shipping_fee,
        total: totals.total,
        currency: totals.currency
      }
    };
  }

  // 9. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart_summary: null
      };
    }

    const item = cartItems[index];
    const cartId = item.cart_id;

    if (quantity <= 0) {
      // Remove item
      cartItems.splice(index, 1);
      this._saveToStorage('cart_items', cartItems);

      // Update cart.item_ids
      const carts = this._getFromStorage('cart');
      if (carts[0] && carts[0].id === cartId && Array.isArray(carts[0].item_ids)) {
        carts[0].item_ids = carts[0].item_ids.filter((id) => id !== cartItemId);
        carts[0].updated_at = this._now();
        this._saveToStorage('cart', carts);
      }
    } else {
      item.quantity = quantity;
      this._saveToStorage('cart_items', cartItems);
    }

    const totals = this._recalculateCartTotals(cartId);

    return {
      success: true,
      message: 'Cart updated',
      cart_summary: {
        item_count: totals.item_count,
        subtotal: totals.subtotal,
        total: totals.total,
        currency: totals.currency
      }
    };
  }

  // 10. removeCartItem
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart_summary: null
      };
    }

    const item = cartItems[index];
    const cartId = item.cart_id;

    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart');
    if (carts[0] && carts[0].id === cartId && Array.isArray(carts[0].item_ids)) {
      carts[0].item_ids = carts[0].item_ids.filter((id) => id !== cartItemId);
      carts[0].updated_at = this._now();
      this._saveToStorage('cart', carts);
    }

    const totals = this._recalculateCartTotals(cartId);

    return {
      success: true,
      message: 'Item removed from cart',
      cart_summary: {
        item_count: totals.item_count,
        subtotal: totals.subtotal,
        total: totals.total,
        currency: totals.currency
      }
    };
  }

  // 11. clearCart
  clearCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const remaining = cartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remaining);

    cart.item_ids = [];
    cart.updated_at = this._now();
    this._saveCart(cart);

    return {
      success: true,
      message: 'Cart cleared'
    };
  }

  // 12. runSolarCalculator
  runSolarCalculator(systemType, numBedrooms, avgMonthlyBill) {
    const st = systemType === 'commercial' ? 'commercial' : 'residential';
    const bill = typeof avgMonthlyBill === 'number' && avgMonthlyBill > 0 ? avgMonthlyBill : 0;

    // Simple estimation formula
    let sizeKw = bill / 25; // rough: $25/mo per kW
    if (st === 'residential' && typeof numBedrooms === 'number') {
      sizeKw += numBedrooms * 0.5;
    } else if (st === 'commercial') {
      sizeKw *= 1.2;
    }
    if (sizeKw < 1) sizeKw = 1;
    sizeKw = Math.round(sizeKw * 100) / 100;
    if (st === 'residential' && sizeKw > 6) sizeKw = 6;

    const savings = Math.round(bill * 0.6 * 100) / 100; // assume 60% bill reduction

    const config = {
      id: this._generateId('calc_cfg'),
      system_type: st,
      num_bedrooms: st === 'residential' ? numBedrooms || null : null,
      avg_monthly_bill: bill,
      created_at: this._now()
    };

    const configs = this._getFromStorage('solar_calculator_configs');
    configs.push(config);
    this._saveToStorage('solar_calculator_configs', configs);

    const recommended = {
      id: this._generateId('rec_sys'),
      calculator_config_id: config.id,
      system_type: st,
      recommended_system_size_kw: sizeKw,
      estimated_monthly_savings: savings,
      description: 'Automatically generated recommendation based on your inputs.'
    };

    const recs = this._getFromStorage('recommended_systems');
    recs.push(recommended);
    this._saveToStorage('recommended_systems', recs);

    this._setCurrentCalculatorRecommendation(config.id, recommended.id);

    return {
      calculator_config: {
        id: config.id,
        system_type: config.system_type,
        num_bedrooms: config.num_bedrooms,
        avg_monthly_bill: config.avg_monthly_bill,
        created_at: config.created_at
      },
      recommended_system: {
        id: recommended.id,
        system_type: recommended.system_type,
        recommended_system_size_kw: recommended.recommended_system_size_kw,
        estimated_monthly_savings: recommended.estimated_monthly_savings,
        description: recommended.description
      }
    };
  }

  // 13. getFinancingFilterOptionsForCurrentRecommendation
  getFinancingFilterOptionsForCurrentRecommendation() {
    const ctx = this._getCurrentCalculatorRecommendation();
    const sort_options = [
      { value: 'monthly_payment_low_to_high', label: 'Monthly Payment: Low to High' },
      { value: 'monthly_payment_high_to_low', label: 'Monthly Payment: High to Low' }
    ];

    if (!ctx) {
      return {
        has_recommendation: false,
        max_monthly_payment_default: 0,
        currency: 'USD',
        sort_options
      };
    }

    const recs = this._getFromStorage('recommended_systems');
    const rec = recs.find((r) => r.id === ctx.recommended_system_id);
    if (!rec) {
      return {
        has_recommendation: false,
        max_monthly_payment_default: 0,
        currency: 'USD',
        sort_options
      };
    }

    const options = this._getFromStorage('financing_options').filter((fo) => {
      if (fo.recommended_system_id && fo.recommended_system_id === rec.id) return true;
      if (fo.system_type && fo.system_type !== rec.system_type) return false;
      const size = rec.recommended_system_size_kw || 0;
      if (typeof fo.min_system_size_kw === 'number' && size < fo.min_system_size_kw) return false;
      if (typeof fo.max_system_size_kw === 'number' && size > fo.max_system_size_kw) return false;
      return true;
    });

    const maxMonthly = options.length
      ? options.reduce((m, o) => (o.monthly_payment > m ? o.monthly_payment : m), 0)
      : 0;

    return {
      has_recommendation: true,
      max_monthly_payment_default: maxMonthly,
      currency: 'USD',
      sort_options
    };
  }

  // 14. getFinancingOptionsForCurrentRecommendation
  getFinancingOptionsForCurrentRecommendation(maxMonthlyPayment, sortBy, sortDirection) {
    const ctx = this._getCurrentCalculatorRecommendation();
    if (!ctx) {
      return {
        recommended_system: null,
        financing_options: []
      };
    }

    const recs = this._getFromStorage('recommended_systems');
    const rec = recs.find((r) => r.id === ctx.recommended_system_id);
    if (!rec) {
      return {
        recommended_system: null,
        financing_options: []
      };
    }

    let options = this._getFromStorage('financing_options').filter((fo) => {
      if (fo.recommended_system_id && fo.recommended_system_id === rec.id) return true;
      if (fo.system_type && fo.system_type !== rec.system_type) return false;
      const size = rec.recommended_system_size_kw || 0;
      if (typeof fo.min_system_size_kw === 'number' && size < fo.min_system_size_kw) return false;
      if (typeof fo.max_system_size_kw === 'number' && size > fo.max_system_size_kw) return false;
      return true;
    });

    if (typeof maxMonthlyPayment === 'number') {
      options = options.filter((o) => o.monthly_payment <= maxMonthlyPayment);
    }

    const sb = sortBy || 'monthly_payment';
    const dir = sortDirection === 'desc' ? 'desc' : 'asc';

    if (sb === 'monthly_payment') {
      options.sort((a, b) => {
        const va = typeof a.monthly_payment === 'number' ? a.monthly_payment : 0;
        const vb = typeof b.monthly_payment === 'number' ? b.monthly_payment : 0;
        return va - vb;
      });
      if (dir === 'desc') options.reverse();
    }

    return {
      recommended_system: {
        id: rec.id,
        system_type: rec.system_type,
        recommended_system_size_kw: rec.recommended_system_size_kw
      },
      financing_options: options
    };
  }

  // 15. selectFinancingOption
  selectFinancingOption(financingOptionId) {
    const options = this._getFromStorage('financing_options');
    const fo = options.find((o) => o.id === financingOptionId);
    if (!fo) {
      return {
        success: false,
        selected_option: null,
        message: 'Financing option not found'
      };
    }

    const selected = {
      id: this._generateId('sel_fin'),
      financing_option_id: financingOptionId,
      selected_at: this._now()
    };

    const selectedList = this._getFromStorage('selected_financing_options');
    selectedList.push(selected);
    this._saveToStorage('selected_financing_options', selectedList);

    // Instrumentation for task completion tracking (task_3)
    try {
      localStorage.setItem(
        'task3_financingSelectionContext',
        JSON.stringify({
          financing_option_id: financingOptionId,
          selected_at: this._now(),
          calculator_context: this._getCurrentCalculatorRecommendation()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      selected_option: {
        id: fo.id,
        plan_name: fo.plan_name,
        monthly_payment: fo.monthly_payment,
        term_months: fo.term_months
      },
      message: 'Financing option selected'
    };
  }

  // 16. getConsultationFormOptions
  getConsultationFormOptions() {
    const project_types = [
      { value: 'existing_home', label: 'Existing Home' },
      { value: 'new_construction', label: 'New Construction' }
    ];

    const system_size_interests = [
      { value: '0_3_kw', label: '0–3 kW' },
      { value: '3_5_kw', label: '3–5 kW' },
      { value: '4_6_kw', label: '4–6 kW' },
      { value: '5_7_kw', label: '5–7 kW' },
      { value: '6_8_kw', label: '6–8 kW' },
      { value: '8_10_kw', label: '8–10 kW' },
      { value: '10_plus_kw', label: '10+ kW' }
    ];

    const time_slots = [
      { value: 'morning_9_11', label: '9:00 AM – 11:00 AM' },
      { value: 'midday_11_1', label: '11:00 AM – 1:00 PM' },
      { value: 'afternoon_1_3', label: '1:00 PM – 3:00 PM' },
      { value: 'late_afternoon_3_5', label: '3:00 PM – 5:00 PM' }
    ];

    return {
      project_types,
      system_size_interests,
      time_slots
    };
  }

  // 17. submitConsultationRequest
  submitConsultationRequest(
    projectType,
    name,
    email,
    phone,
    systemSizeInterest,
    appointmentDate,
    timeSlot,
    comments
  ) {
    const request = {
      id: this._generateId('consult_req'),
      project_type: projectType,
      name,
      email,
      phone,
      system_size_interest: systemSizeInterest,
      appointment_date: appointmentDate,
      time_slot: timeSlot,
      comments: comments || '',
      status: 'submitted',
      created_at: this._now()
    };

    const requests = this._getFromStorage('consultation_requests');
    requests.push(request);
    this._saveToStorage('consultation_requests', requests);

    return {
      request,
      message: 'Consultation request submitted'
    };
  }

  // 18. searchArticles
  searchArticles(keyword, dateRange, sortBy, page, pageSize) {
    let articles = this._getFromStorage('articles');

    if (keyword && typeof keyword === 'string') {
      const kw = keyword.toLowerCase();
      articles = articles.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const body = (a.body || '').toLowerCase();
        return title.includes(kw) || summary.includes(kw) || body.includes(kw);
      });
    }

    if (dateRange && typeof dateRange === 'string') {
      let cutoff = null;
      const now = new Date();
      if (dateRange === 'last_6_months') {
        cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      } else if (dateRange === 'last_year') {
        cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      } else if (dateRange === 'last_2_years') {
        cutoff = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      }
      if (cutoff) {
        const cutoffTime = cutoff.getTime();
        articles = articles.filter((a) => {
          const t = a.published_at ? Date.parse(a.published_at) : 0;
          return t >= cutoffTime;
        });
      }
    }

    const sb = sortBy || 'newest';
    if (sb === 'newest') {
      articles.sort((a, b) => {
        const ta = a.published_at ? Date.parse(a.published_at) : 0;
        const tb = b.published_at ? Date.parse(b.published_at) : 0;
        return tb - ta;
      });
    } else if (sb === 'most_popular') {
      articles.sort((a, b) => {
        const va = typeof a.view_count === 'number' ? a.view_count : 0;
        const vb = typeof b.view_count === 'number' ? b.view_count : 0;
        return vb - va;
      });
    }

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const totalItems = articles.length;
    const totalPages = Math.ceil(totalItems / size) || 1;
    const start = (currentPage - 1) * size;
    const paged = articles.slice(start, start + size);

    return {
      articles: paged,
      pagination: {
        page: currentPage,
        pageSize: size,
        totalItems,
        totalPages
      },
      appliedFilters: {
        keyword: keyword || '',
        dateRange: dateRange || '',
        sortBy: sb
      }
    };
  }

  // 19. getArticleDetails
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;

    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');
    const is_saved_to_reading_list = !!items.find(
      (it) => it.reading_list_id === readingList.id && it.article_id === articleId
    );

    let related_articles = [];
    if (article) {
      const tags = Array.isArray(article.tags) ? article.tags : [];
      if (tags.length) {
        related_articles = articles
          .filter((a) => a.id !== article.id)
          .filter((a) => {
            const atags = Array.isArray(a.tags) ? a.tags : [];
            return atags.some((t) => tags.indexOf(t) !== -1);
          })
          .sort((a, b) => {
            const ta = a.published_at ? Date.parse(a.published_at) : 0;
            const tb = b.published_at ? Date.parse(b.published_at) : 0;
            return tb - ta;
          })
          .slice(0, 5);
      }
    }

    return {
      article: article
        ? {
            id: article.id,
            title: article.title,
            slug: article.slug || '',
            summary: article.summary || '',
            body: article.body,
            author_name: article.author_name || '',
            published_at: article.published_at || '',
            tags: Array.isArray(article.tags) ? article.tags : [],
            reading_time_minutes: article.reading_time_minutes || null
          }
        : null,
      is_saved_to_reading_list,
      related_articles
    };
  }

  // 20. saveArticleToReadingList
  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        reading_list_item: null,
        message: 'Article not found'
      };
    }

    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');

    let existing = items.find(
      (it) => it.reading_list_id === readingList.id && it.article_id === articleId
    );

    if (existing) {
      return {
        success: true,
        reading_list_item: existing,
        message: 'Article already in reading list'
      };
    }

    const item = {
      id: this._generateId('rli'),
      reading_list_id: readingList.id,
      article_id: articleId,
      saved_at: this._now()
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);

    if (!Array.isArray(readingList.article_ids)) readingList.article_ids = [];
    readingList.article_ids.push(articleId);
    readingList.updated_at = this._now();
    this._saveReadingList(readingList);

    return {
      success: true,
      reading_list_item: item,
      message: 'Article saved to reading list'
    };
  }

  // 21. getReadingList
  getReadingList() {
    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items').filter(
      (it) => it.reading_list_id === readingList.id
    );
    const articles = this._getFromStorage('articles');

    const resultItems = items
      .slice()
      .sort((a, b) => {
        const ta = a.saved_at ? Date.parse(a.saved_at) : 0;
        const tb = b.saved_at ? Date.parse(b.saved_at) : 0;
        return tb - ta;
      })
      .map((it) => {
        const article = articles.find((a) => a.id === it.article_id) || null;
        return {
          reading_list_item: {
            id: it.id,
            article_id: it.article_id,
            saved_at: it.saved_at
          },
          article: article
            ? {
                id: article.id,
                title: article.title,
                summary: article.summary || '',
                published_at: article.published_at || ''
              }
            : null
        };
      });

    return {
      reading_list: {
        id: readingList.id,
        name: readingList.name
      },
      items: resultItems
    };
  }

  // 22. removeArticleFromReadingList
  removeArticleFromReadingList(readingListItemId) {
    const items = this._getFromStorage('reading_list_items');
    const index = items.findIndex((it) => it.id === readingListItemId);
    if (index === -1) {
      return {
        success: false,
        message: 'Reading list item not found'
      };
    }

    const item = items[index];
    items.splice(index, 1);
    this._saveToStorage('reading_list_items', items);

    const readingList = this._getOrCreateReadingList();
    if (Array.isArray(readingList.article_ids)) {
      readingList.article_ids = readingList.article_ids.filter(
        (id) => id !== item.article_id
      );
      readingList.updated_at = this._now();
      this._saveReadingList(readingList);
    }

    return {
      success: true,
      message: 'Article removed from reading list'
    };
  }

  // 23. getMaintenancePlanFilterOptions
  getMaintenancePlanFilterOptions() {
    const plans = this._getFromStorage('maintenance_plans').filter(
      (p) => p.status === 'active'
    );

    const customer_types = [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' }
    ];

    let min = 0;
    let max = 0;
    let currency = 'USD';

    if (plans.length) {
      const prices = plans
        .map((p) => (typeof p.yearly_price === 'number' ? p.yearly_price : null))
        .filter((v) => v !== null && !Number.isNaN(v));
      if (prices.length) {
        min = Math.min.apply(null, prices);
        max = Math.max.apply(null, prices);
      }
      if (plans[0].currency) currency = plans[0].currency;
    }

    const termSet = new Set();
    plans.forEach((p) => {
      if (Array.isArray(p.available_term_years)) {
        p.available_term_years.forEach((t) => {
          if (typeof t === 'number') termSet.add(t);
        });
      }
    });
    const term_lengths_years = Array.from(termSet).sort((a, b) => a - b);

    return {
      customer_types,
      price: {
        min,
        max,
        step: 10,
        currency
      },
      term_lengths_years
    };
  }

  // 24. searchMaintenancePlans
  searchMaintenancePlans(customerType, maxYearlyPrice) {
    let plans = this._getFromStorage('maintenance_plans').filter(
      (p) => p.status === 'active'
    );

    if (customerType) {
      plans = plans.filter((p) => p.customer_type === customerType);
    }

    if (typeof maxYearlyPrice === 'number') {
      plans = plans.filter((p) => p.yearly_price <= maxYearlyPrice);
    }

    return { plans };
  }

  // 25. getMaintenancePlanDetails
  getMaintenancePlanDetails(planId) {
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find((p) => p.id === planId) || null;

    return {
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            description: plan.description || '',
            customer_type: plan.customer_type,
            yearly_price: plan.yearly_price,
            currency: plan.currency || 'USD',
            default_term_years: plan.default_term_years || null,
            available_term_years: Array.isArray(plan.available_term_years)
              ? plan.available_term_years
              : [],
            visit_frequency: plan.visit_frequency || null,
            status: plan.status
          }
        : null
    };
  }

  // 26. addMaintenancePlanToCart
  addMaintenancePlanToCart(planId, termYears, autoRenew) {
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find((p) => p.id === planId && p.status === 'active');
    if (!plan) {
      return {
        success: false,
        cartId: null,
        message: 'Maintenance plan not found or inactive',
        cart_summary: null
      };
    }

    const term = typeof termYears === 'number' && termYears > 0 ? termYears : plan.default_term_years || 1;
    const auto = !!autoRenew;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'maintenance_plan',
      product_id: null,
      maintenance_plan_id: plan.id,
      name: plan.name,
      unit_price: plan.yearly_price,
      quantity: 1,
      term_years: term,
      auto_renew: auto,
      added_at: this._now()
    };

    cartItems.push(cartItem);
    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);
    cart.updated_at = this._now();

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const totals = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      cartId: cart.id,
      message: 'Maintenance plan added to cart',
      cart_summary: {
        item_count: totals.item_count,
        subtotal: totals.subtotal,
        currency: totals.currency
      }
    };
  }

  // 27. getCommercialQuoteFormOptions
  getCommercialQuoteFormOptions() {
    const project_types = [
      { value: 'commercial', label: 'Commercial' },
      { value: 'residential', label: 'Residential' }
    ];

    const business_types = [
      { value: 'retail_storefront', label: 'Retail / Storefront' },
      { value: 'office', label: 'Office' },
      { value: 'industrial', label: 'Industrial' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'other', label: 'Other' }
    ];

    const contact_methods = [
      { value: 'phone_call', label: 'Phone Call' },
      { value: 'email', label: 'Email' }
    ];

    return {
      project_types,
      business_types,
      contact_methods
    };
  }

  // 28. submitCommercialQuoteRequest
  submitCommercialQuoteRequest(
    projectType,
    desiredSystemSizeKw,
    businessType,
    preferredContactMethod,
    comments,
    name,
    phone,
    email
  ) {
    const quote_request = {
      id: this._generateId('comm_quote'),
      project_type: projectType,
      desired_system_size_kw: desiredSystemSizeKw,
      business_type: businessType,
      preferred_contact_method: preferredContactMethod,
      comments: comments || '',
      name,
      phone,
      email,
      status: 'submitted',
      created_at: this._now()
    };

    const list = this._getFromStorage('commercial_quote_requests');
    list.push(quote_request);
    this._saveToStorage('commercial_quote_requests', list);

    return {
      quote_request,
      message: 'Commercial quote request submitted'
    };
  }

  // 29. trackOrder
  trackOrder(orderNumber, postalCode) {
    const access = this._validateOrderAccessByOrderNumberAndPostalCode(orderNumber, postalCode);

    // Instrumentation for task completion tracking (task_9 - lastTrackOrderCall)
    try {
      localStorage.setItem(
        'task9_lastTrackOrderCall',
        JSON.stringify({
          orderNumber,
          postalCode,
          found: !!access,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (!access) {
      return {
        found: false,
        order_summary: null,
        shipment_summary: null,
        can_view_details: false,
        message: 'Order not found. Please check your order number and ZIP code.'
      };
    }

    const order = access.order;
    const shipments = access.shipments;

    let shipment_summary = null;
    if (shipments.length) {
      // Choose the most recent shipment by shipped_at or estimated_delivery_at
      const sorted = shipments.slice().sort((a, b) => {
        const ta = a.shipped_at ? Date.parse(a.shipped_at) : (a.estimated_delivery_at ? Date.parse(a.estimated_delivery_at) : 0);
        const tb = b.shipped_at ? Date.parse(b.shipped_at) : (b.estimated_delivery_at ? Date.parse(b.estimated_delivery_at) : 0);
        return tb - ta;
      });
      const s = sorted[0];
      shipment_summary = {
        carrier: s.carrier || '',
        tracking_number: s.tracking_number || '',
        status: s.status,
        estimated_delivery_at: s.estimated_delivery_at || ''
      };
    }

    return {
      found: true,
      order_summary: {
        order_number: order.order_number,
        status: order.status,
        created_at: order.created_at,
        shipping_name: order.shipping_name || '',
        shipping_city: order.shipping_city || '',
        shipping_state: order.shipping_state || '',
        shipping_postal_code: order.shipping_postal_code,
        total: order.total || 0,
        currency: 'USD'
      },
      shipment_summary,
      can_view_details: true,
      message: ''
    };
  }

  // 30. getOrderDetailsWithShipment
  getOrderDetailsWithShipment(orderNumber, postalCode) {
    const access = this._validateOrderAccessByOrderNumberAndPostalCode(orderNumber, postalCode);
    if (!access) {
      return {
        order: null,
        items: [],
        shipments: []
      };
    }

    const order = access.order;
    const shipments = access.shipments;

    const orderItems = this._getFromStorage('order_items').filter(
      (oi) => oi.order_id === order.id
    );

    const shipmentEvents = this._getFromStorage('shipment_events');

    const shipmentsWithTimeline = shipments.map((s) => {
      const timeline = shipmentEvents
        .filter((ev) => ev.shipment_id === s.id)
        .sort((a, b) => {
          const ta = a.event_at ? Date.parse(a.event_at) : 0;
          const tb = b.event_at ? Date.parse(b.event_at) : 0;
          return ta - tb;
        });

      return {
        shipment: {
          id: s.id,
          carrier: s.carrier || '',
          tracking_number: s.tracking_number || '',
          status: s.status,
          shipped_at: s.shipped_at || '',
          estimated_delivery_at: s.estimated_delivery_at || '',
          delivered_at: s.delivered_at || ''
        },
        timeline
      };
    });

    // Instrumentation for task completion tracking (task_9 - lastOrderDetailsView)
    try {
      localStorage.setItem(
        'task9_lastOrderDetailsView',
        JSON.stringify({
          orderNumber,
          postalCode,
          hasShipments: shipments.length > 0,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      order: {
        order_number: order.order_number,
        status: order.status,
        created_at: order.created_at,
        shipping_name: order.shipping_name || '',
        shipping_address_line1: order.shipping_address_line1 || '',
        shipping_address_line2: order.shipping_address_line2 || '',
        shipping_city: order.shipping_city || '',
        shipping_state: order.shipping_state || '',
        shipping_postal_code: order.shipping_postal_code,
        shipping_country: order.shipping_country || '',
        subtotal: order.subtotal || 0,
        tax: order.tax || 0,
        shipping_fee: order.shipping_fee || 0,
        total: order.total || 0
      },
      items: orderItems,
      shipments: shipmentsWithTimeline
    };
  }

  // 31. getAboutPageContent
  getAboutPageContent() {
    const content = this._getObjectFromStorage('about_page_content', null);
    if (content && typeof content === 'object') {
      return {
        mission: content.mission || '',
        values: Array.isArray(content.values) ? content.values : [],
        experience_summary: content.experience_summary || '',
        certifications: Array.isArray(content.certifications) ? content.certifications : [],
        partnerships: Array.isArray(content.partnerships) ? content.partnerships : [],
        leadership: Array.isArray(content.leadership) ? content.leadership : []
      };
    }
    return {
      mission: '',
      values: [],
      experience_summary: '',
      certifications: [],
      partnerships: [],
      leadership: []
    };
  }

  // 32. getContactPageContent
  getContactPageContent() {
    const content = this._getObjectFromStorage('contact_page_content', null);
    if (content && typeof content === 'object') {
      return {
        company_phone: content.company_phone || '',
        company_email: content.company_email || '',
        address_line1: content.address_line1 || '',
        address_line2: content.address_line2 || '',
        city: content.city || '',
        state: content.state || '',
        postal_code: content.postal_code || '',
        country: content.country || '',
        business_hours: content.business_hours || '',
        response_time_expectation: content.response_time_expectation || ''
      };
    }
    return {
      company_phone: '',
      company_email: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      business_hours: '',
      response_time_expectation: ''
    };
  }

  // 33. submitContactForm
  submitContactForm(name, email, phone, topic, message) {
    const submissions = this._getFromStorage('contact_form_submissions');
    submissions.push({
      id: this._generateId('contact_msg'),
      name,
      email,
      phone: phone || '',
      topic: topic || '',
      message,
      created_at: this._now()
    });
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been received.'
    };
  }

  // 34. getFaqContent
  getFaqContent() {
    const content = this._getObjectFromStorage('faq_content', null);
    if (content && Array.isArray(content.sections)) {
      return {
        sections: content.sections
      };
    }
    return {
      sections: []
    };
  }

  // 35. getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const content = this._getObjectFromStorage('privacy_policy_content', null);
    if (content && typeof content === 'object') {
      return {
        last_updated: content.last_updated || '',
        body: content.body || ''
      };
    }
    return {
      last_updated: '',
      body: ''
    };
  }

  // 36. getTermsOfUseContent
  getTermsOfUseContent() {
    const content = this._getObjectFromStorage('terms_of_use_content', null);
    if (content && typeof content === 'object') {
      return {
        last_updated: content.last_updated || '',
        body: content.body || ''
      };
    }
    return {
      last_updated: '',
      body: ''
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