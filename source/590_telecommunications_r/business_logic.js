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
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  // ----------------------
  // Core storage helpers
  // ----------------------
  _initStorage() {
    const keys = [
      'products',
      'categories',
      'brands',
      'carts',
      'cart_items',
      'shipping_method_types',
      'shipping_options',
      'project_lists',
      'project_list_items',
      'bulk_quote_requests',
      'product_comparisons',
      'orders',
      'order_items'
    ];
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }
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

  _nowISO() {
    return new Date().toISOString();
  }

  // ----------------------
  // Cart helpers
  // ----------------------
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        currency: 'usd',
        shipping_postal_code: null,
        shipping_country: null,
        selected_shipping_option_id: null,
        shipping_cost: 0,
        total: 0,
        checkout_name: null,
        checkout_address_line1: null,
        checkout_address_line2: null,
        checkout_city: null,
        checkout_state_region: null,
        checkout_postal_code: null,
        checkout_email: null,
        checkout_phone: null,
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getCurrentCart() {
    const carts = this._getFromStorage('carts');
    return carts[0] || null;
  }

  _updateCartInStorage(cart) {
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _recalculateCartTotals(cart) {
    let cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });
    let subtotal = 0;
    for (let i = 0; i < itemsForCart.length; i += 1) {
      const ci = itemsForCart[i];
      const unitPrice = typeof ci.unit_price === 'number' ? ci.unit_price : 0;
      const qty = typeof ci.quantity === 'number' ? ci.quantity : 0;
      ci.line_subtotal = Number((unitPrice * qty).toFixed(2));
      subtotal += ci.line_subtotal;
    }
    this._saveToStorage('cart_items', cartItems);
    cart.subtotal = Number(subtotal.toFixed(2));
    const shipping = cart.shipping_cost || 0;
    cart.total = Number((cart.subtotal + shipping).toFixed(2));
    cart.updated_at = this._nowISO();
    this._updateCartInStorage(cart);
  }

  _enrichCartItems(cart) {
    const products = this._getFromStorage('products');
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cart ? cartItems.filter(function (ci) { return ci.cart_id === cart.id; }) : [];
    return itemsForCart.map(function (ci) {
      const product = products.find(function (p) { return p.id === ci.product_id; }) || null;
      return { cartItem: ci, product: product };
    });
  }

  // ----------------------
  // Shipping helpers
  // ----------------------
  _ensureShippingMethodTypes() {
    let types = this._getFromStorage('shipping_method_types');
    if (types.length === 0) {
      types = [
        {
          id: this._generateId('shipmethod'),
          code: 'economy',
          name: 'Economy',
          description: 'Economy ground shipping',
          is_active: true
        },
        {
          id: this._generateId('shipmethod'),
          code: 'standard',
          name: 'Standard',
          description: 'Standard ground shipping',
          is_active: true
        },
        {
          id: this._generateId('shipmethod'),
          code: 'expedited',
          name: 'Expedited',
          description: 'Expedited air shipping',
          is_active: true
        },
        {
          id: this._generateId('shipmethod'),
          code: 'overnight',
          name: 'Overnight',
          description: 'Overnight shipping',
          is_active: true
        }
      ];
      this._saveToStorage('shipping_method_types', types);
    }
    return types;
  }

  _enrichShippingOptions(options) {
    const methodTypes = this._getFromStorage('shipping_method_types');
    return options.map(function (opt) {
      const methodType = methodTypes.find(function (mt) { return mt.id === opt.method_type_id; }) || null;
      return Object.assign({}, opt, { method_type: methodType });
    });
  }

  _createShippingOptionsForCart(shippingCountry, postalCode) {
    const cart = this._getOrCreateCart();
    if (shippingCountry) {
      cart.shipping_country = shippingCountry;
    } else if (!cart.shipping_country) {
      cart.shipping_country = 'United States';
    }
    if (postalCode) {
      cart.shipping_postal_code = postalCode;
    }
    this._updateCartInStorage(cart);

    const methodTypes = this._ensureShippingMethodTypes();
    let shippingOptions = this._getFromStorage('shipping_options');

    // Remove existing options for this cart
    shippingOptions = shippingOptions.filter(function (o) { return o.cart_id !== cart.id; });

    const activeMethods = methodTypes.filter(function (mt) { return mt.is_active; });
    const subtotal = cart.subtotal || 0;

    for (let i = 0; i < activeMethods.length; i += 1) {
      const mt = activeMethods[i];
      let costBase;
      switch (mt.code) {
        case 'economy':
          costBase = 9.99;
          break;
        case 'standard':
          costBase = 14.99;
          break;
        case 'expedited':
          costBase = 24.99;
          break;
        case 'overnight':
          costBase = 39.99;
          break;
        default:
          costBase = 19.99;
      }
      // Simple scaling with subtotal (light touch so we do not exceed localStorage constraints)
      const extra = subtotal > 500 ? 10 : subtotal > 200 ? 5 : 0;
      const cost = Number((costBase + extra).toFixed(2));
      const opt = {
        id: this._generateId('shipopt'),
        cart_id: cart.id,
        method_type_id: mt.id,
        name: mt.name,
        cost: cost,
        estimated_delivery_days:
          mt.code === 'overnight' ? 1 : (mt.code === 'expedited' ? 2 : (mt.code === 'standard' ? 5 : 7)),
        is_cheapest: false,
        is_selected: false
      };
      shippingOptions.push(opt);
    }

    // Mark cheapest
    let cheapestCost = null;
    let cheapestId = null;
    for (let j = 0; j < shippingOptions.length; j += 1) {
      const o = shippingOptions[j];
      if (o.cart_id !== cart.id) continue;
      if (cheapestCost === null || o.cost < cheapestCost) {
        cheapestCost = o.cost;
        cheapestId = o.id;
      }
    }
    shippingOptions = shippingOptions.map(function (o) {
      if (o.cart_id === cart.id) {
        o.is_cheapest = (o.id === cheapestId);
      }
      return o;
    });

    this._saveToStorage('shipping_options', shippingOptions);

    const optionsForCart = shippingOptions.filter(function (o) { return o.cart_id === cart.id; });
    const enrichedOptions = this._enrichShippingOptions(optionsForCart);
    return { cart: cart, shippingOptions: enrichedOptions };
  }

  // ----------------------
  // Category helpers
  // ----------------------
  _getDescendantCategoryKeys(categoryKey) {
    const categories = this._getFromStorage('categories');
    const resultKeys = [];
    const added = {};
    const root = categories.find(function (c) { return c.key === categoryKey; });
    if (!root) {
      resultKeys.push(categoryKey);
      return resultKeys;
    }
    const queue = [root];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!added[current.key]) {
        added[current.key] = true;
        resultKeys.push(current.key);
        const children = categories.filter(function (c) { return c.parent_category_id === current.id; });
        for (let i = 0; i < children.length; i += 1) {
          queue.push(children[i]);
        }
      }
    }
    return resultKeys;
  }

  _applyProductFilters(products, filters) {
    if (!filters) return products;
    return products.filter(function (p) {
      if (filters.minPrice != null) {
        if (p.price == null || p.price < filters.minPrice) return false;
      }
      if (filters.maxPrice != null) {
        if (p.price == null || p.price > filters.maxPrice) return false;
      }

      if (filters.frequencyMinGhz != null || filters.frequencyMaxGhz != null) {
        const fmin = p.frequency_min_ghz;
        const fmax = p.frequency_max_ghz;
        if (fmin == null && fmax == null) return false;
        const reqMin = filters.frequencyMinGhz != null ? filters.frequencyMinGhz : fmin;
        const reqMax = filters.frequencyMaxGhz != null ? filters.frequencyMaxGhz : fmax;
        if (reqMin != null && fmax != null && fmax < reqMin) return false;
        if (reqMax != null && fmin != null && fmin > reqMax) return false;
      }

      if (filters.powerRatingMinW != null) {
        if (p.power_rating_w == null || p.power_rating_w < filters.powerRatingMinW) return false;
      }

      if (filters.gainMinDb != null) {
        if (p.gain_db == null || p.gain_db < filters.gainMinDb) return false;
      }

      if (filters.noiseFigureMaxDb != null) {
        if (p.noise_figure_db == null || p.noise_figure_db > filters.noiseFigureMaxDb) return false;
      }

      if (filters.impedanceOhms != null) {
        if (p.impedance_ohms == null || p.impedance_ohms !== filters.impedanceOhms) return false;
      }

      if (filters.cableLengthMinM != null) {
        if (p.cable_length_m == null || p.cable_length_m < filters.cableLengthMinM) return false;
      }

      if (filters.cableLengthMaxM != null) {
        if (p.cable_length_m == null || p.cable_length_m > filters.cableLengthMaxM) return false;
      }

      if (filters.connectorType) {
        if (!p.connector_type || p.connector_type !== filters.connectorType) return false;
      }

      if (filters.amplifierType) {
        if (!p.amplifier_type || p.amplifier_type !== filters.amplifierType) return false;
      }

      if (filters.filterType) {
        if (!p.filter_type || p.filter_type !== filters.filterType) return false;
      }

      if (filters.antennaType) {
        if (!p.antenna_type || p.antenna_type !== filters.antennaType) return false;
      }

      if (filters.availabilityStatus) {
        if (!p.availability_status || p.availability_status !== filters.availabilityStatus) return false;
      }

      if (filters.brandId) {
        if (!p.brand_id || p.brand_id !== filters.brandId) return false;
      }

      if (filters.minCustomerRating != null) {
        if (p.customer_rating_average == null || p.customer_rating_average < filters.minCustomerRating) return false;
      }

      return true;
    });
  }

  _sortProducts(products, sortBy) {
    const arr = products.slice();
    if (!sortBy || sortBy === 'relevance') return arr;
    if (sortBy === 'price_asc') {
      arr.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
    } else if (sortBy === 'price_desc') {
      arr.sort(function (a, b) { return (b.price || 0) - (a.price || 0); });
    } else if (sortBy === 'gain_desc') {
      arr.sort(function (a, b) { return (b.gain_db || 0) - (a.gain_db || 0); });
    } else if (sortBy === 'rating_desc') {
      arr.sort(function (a, b) { return (b.customer_rating_average || 0) - (a.customer_rating_average || 0); });
    }
    return arr;
  }

  // ----------------------
  // Interface: Categories & homepage
  // ----------------------
  getActiveCategories() {
    const categories = this._getFromStorage('categories');
    const active = categories.filter(function (c) { return c.is_active; });
    active.sort(function (a, b) {
      const sa = a.sort_order != null ? a.sort_order : 9999;
      const sb = b.sort_order != null ? b.sort_order : 9999;
      if (sa !== sb) return sa - sb;
      const an = a.name || '';
      const bn = b.name || '';
      return an.localeCompare(bn);
    });
    return active;
  }

  getHomepageOverview() {
    const categories = this.getActiveCategories();
    const featuredProducts = this.getFeaturedProducts();
    const featuredBrands = this.getFeaturedBrands();
    const helpLinks = [
      {
        id: 'search_and_filters',
        title: 'How to search and filter RF components',
        slug: 'search-and-filters'
      },
      {
        id: 'project_lists',
        title: 'Using project lists for lab builds',
        slug: 'project-lists'
      },
      {
        id: 'shipping_and_orders',
        title: 'Shipping estimates, bulk quotes, and checkout',
        slug: 'shipping-and-orders'
      }
    ];
    return {
      categories: categories,
      featuredProducts: featuredProducts,
      featuredBrands: featuredBrands,
      helpLinks: helpLinks
    };
  }

  getFeaturedProducts() {
    const products = this._getFromStorage('products');
    return products.filter(function (p) { return !!p.is_featured; });
  }

  getFeaturedBrands() {
    const brands = this._getFromStorage('brands');
    return brands.filter(function (b) { return !!b.is_featured; });
  }

  getCategoryFilterOptions(categoryKey) {
    const categories = this._getFromStorage('categories');
    const category = categories.find(function (c) { return c.key === categoryKey; }) || null;
    const keys = this._getDescendantCategoryKeys(categoryKey);
    const products = this._getFromStorage('products').filter(function (p) { return keys.indexOf(p.category_key) !== -1; });
    const brands = this._getFromStorage('brands');

    const result = {
      category: category,
      price: { min: null, max: null },
      frequency: { minGhz: null, maxGhz: null },
      powerRatingW: { min: null, max: null },
      gainDb: { min: null, max: null },
      noiseFigureDb: { min: null, max: null },
      impedanceOhmsOptions: [],
      cableLengthM: { min: null, max: null },
      connectorTypes: [],
      amplifierTypes: [],
      filterTypes: [],
      antennaTypes: [],
      availabilityStatuses: [],
      brandOptions: [],
      ratingBuckets: [3, 4, 4.5]
    };

    if (products.length === 0) return result;

    let priceMin = null;
    let priceMax = null;
    let freqMin = null;
    let freqMax = null;
    let powerMin = null;
    let powerMax = null;
    let gainMin = null;
    let gainMax = null;
    let nfMin = null;
    let nfMax = null;
    let cableMin = null;
    let cableMax = null;

    const impedSet = {};
    const connSet = {};
    const ampSet = {};
    const filterSet = {};
    const antSet = {};
    const availSet = {};
    const brandIdSet = {};

    for (let i = 0; i < products.length; i += 1) {
      const p = products[i];
      if (typeof p.price === 'number') {
        if (priceMin === null || p.price < priceMin) priceMin = p.price;
        if (priceMax === null || p.price > priceMax) priceMax = p.price;
      }
      if (typeof p.frequency_min_ghz === 'number') {
        if (freqMin === null || p.frequency_min_ghz < freqMin) freqMin = p.frequency_min_ghz;
      }
      if (typeof p.frequency_max_ghz === 'number') {
        if (freqMax === null || p.frequency_max_ghz > freqMax) freqMax = p.frequency_max_ghz;
      }
      if (typeof p.power_rating_w === 'number') {
        if (powerMin === null || p.power_rating_w < powerMin) powerMin = p.power_rating_w;
        if (powerMax === null || p.power_rating_w > powerMax) powerMax = p.power_rating_w;
      }
      if (typeof p.gain_db === 'number') {
        if (gainMin === null || p.gain_db < gainMin) gainMin = p.gain_db;
        if (gainMax === null || p.gain_db > gainMax) gainMax = p.gain_db;
      }
      if (typeof p.noise_figure_db === 'number') {
        if (nfMin === null || p.noise_figure_db < nfMin) nfMin = p.noise_figure_db;
        if (nfMax === null || p.noise_figure_db > nfMax) nfMax = p.noise_figure_db;
      }
      if (typeof p.impedance_ohms === 'number') {
        impedSet[p.impedance_ohms] = true;
      }
      if (typeof p.cable_length_m === 'number') {
        if (cableMin === null || p.cable_length_m < cableMin) cableMin = p.cable_length_m;
        if (cableMax === null || p.cable_length_m > cableMax) cableMax = p.cable_length_m;
      }
      if (p.connector_type) connSet[p.connector_type] = true;
      if (p.amplifier_type) ampSet[p.amplifier_type] = true;
      if (p.filter_type) filterSet[p.filter_type] = true;
      if (p.antenna_type) antSet[p.antenna_type] = true;
      if (p.availability_status) availSet[p.availability_status] = true;
      if (p.brand_id) brandIdSet[p.brand_id] = true;
    }

    result.price = { min: priceMin, max: priceMax };
    result.frequency = { minGhz: freqMin, maxGhz: freqMax };
    result.powerRatingW = { min: powerMin, max: powerMax };
    result.gainDb = { min: gainMin, max: gainMax };
    result.noiseFigureDb = { min: nfMin, max: nfMax };
    result.cableLengthM = { min: cableMin, max: cableMax };
    result.impedanceOhmsOptions = Object.keys(impedSet).map(function (v) { return Number(v); }).sort(function (a, b) { return a - b; });
    result.connectorTypes = Object.keys(connSet).sort();
    result.amplifierTypes = Object.keys(ampSet).sort();
    result.filterTypes = Object.keys(filterSet).sort();
    result.antennaTypes = Object.keys(antSet).sort();
    result.availabilityStatuses = Object.keys(availSet).sort();
    result.brandOptions = brands.filter(function (b) { return !!brandIdSet[b.id]; });

    return result;
  }

  getCategoryProducts(categoryKey, page, pageSize, sortBy, filters) {
    if (page == null) page = 1;
    if (pageSize == null) pageSize = 20;
    if (!sortBy) sortBy = 'relevance';
    filters = filters || {};

    const categories = this._getFromStorage('categories');
    const category = categories.find(function (c) { return c.key === categoryKey; }) || null;
    const keys = this._getDescendantCategoryKeys(categoryKey);
    let products = this._getFromStorage('products').filter(function (p) { return keys.indexOf(p.category_key) !== -1; });

    products = this._applyProductFilters(products, filters);
    products = this._sortProducts(products, sortBy);

    const totalCount = products.length;
    const start = (page - 1) * pageSize;
    const pageProducts = products.slice(start, start + pageSize);

    return {
      category: category,
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      products: pageProducts
    };
  }

  searchProducts(query, page, pageSize, sortBy, filters) {
    if (page == null) page = 1;
    if (pageSize == null) pageSize = 20;
    if (!sortBy) sortBy = 'relevance';
    filters = filters || {};

    const q = (query || '').trim().toLowerCase();
    let products = this._getFromStorage('products');

    if (q) {
      products = products.filter(function (p) {
        const fields = [p.name, p.short_description, p.long_description, p.sku];
        for (let i = 0; i < fields.length; i += 1) {
          const f = fields[i];
          if (typeof f === 'string' && f.toLowerCase().indexOf(q) !== -1) {
            return true;
          }
        }
        return false;
      });
    }

    if (filters.categoryKey) {
      const keys = this._getDescendantCategoryKeys(filters.categoryKey);
      products = products.filter(function (p) { return keys.indexOf(p.category_key) !== -1; });
    }

    const otherFilters = Object.assign({}, filters);
    delete otherFilters.categoryKey;

    products = this._applyProductFilters(products, otherFilters);
    products = this._sortProducts(products, sortBy);

    const totalCount = products.length;
    const start = (page - 1) * pageSize;
    const pageProducts = products.slice(start, start + pageSize);

    return {
      query: query,
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      products: pageProducts
    };
  }

  getSearchFilterOptions(query) {
    const result = {
      price: { min: null, max: null },
      frequency: { minGhz: null, maxGhz: null },
      availabilityStatuses: [],
      brandOptions: [],
      ratingBuckets: [3, 4, 4.5]
    };

    const searchResult = this.searchProducts(query, 1, 100000, 'relevance', null);
    const products = searchResult.products;
    if (products.length === 0) return result;

    let priceMin = null;
    let priceMax = null;
    let freqMin = null;
    let freqMax = null;
    const availSet = {};
    const brandIdSet = {};

    for (let i = 0; i < products.length; i += 1) {
      const p = products[i];
      if (typeof p.price === 'number') {
        if (priceMin === null || p.price < priceMin) priceMin = p.price;
        if (priceMax === null || p.price > priceMax) priceMax = p.price;
      }
      if (typeof p.frequency_min_ghz === 'number') {
        if (freqMin === null || p.frequency_min_ghz < freqMin) freqMin = p.frequency_min_ghz;
      }
      if (typeof p.frequency_max_ghz === 'number') {
        if (freqMax === null || p.frequency_max_ghz > freqMax) freqMax = p.frequency_max_ghz;
      }
      if (p.availability_status) availSet[p.availability_status] = true;
      if (p.brand_id) brandIdSet[p.brand_id] = true;
    }

    result.price = { min: priceMin, max: priceMax };
    result.frequency = { minGhz: freqMin, maxGhz: freqMax };
    result.availabilityStatuses = Object.keys(availSet).sort();
    const brands = this._getFromStorage('brands');
    result.brandOptions = brands.filter(function (b) { return !!brandIdSet[b.id]; });

    return result;
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    const brand = product ? (brands.find(function (b) { return b.id === product.brand_id; }) || null) : null;
    const category = product ? (categories.find(function (c) { return c.key === product.category_key; }) || null) : null;
    let relatedProducts = [];
    if (product) {
      relatedProducts = products.filter(function (p) {
        if (p.id === product.id) return false;
        if (p.category_key === product.category_key) return true;
        if (brand && p.brand_id === brand.id) return true;
        return false;
      }).slice(0, 10);
    }
    return {
      product: product,
      brand: brand,
      category: category,
      relatedProducts: relatedProducts
    };
  }

  getRelatedProducts(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; });
    if (!product) return [];
    const related = products.filter(function (p) {
      if (p.id === product.id) return false;
      if (p.category_key === product.category_key) return true;
      if (p.brand_id === product.brand_id) return true;
      return false;
    });
    return related.slice(0, 20);
  }

  // ----------------------
  // Interface: Cart
  // ----------------------
  addToCart(productId, quantity) {
    if (quantity == null) quantity = 1;
    if (quantity <= 0) {
      return { success: false, message: 'Quantity must be greater than zero', cart: null, items: [] };
    }

    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; });
    if (!product) {
      return { success: false, message: 'Product not found', cart: null, items: [] };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    let cartItem = cartItems.find(function (ci) { return ci.cart_id === cart.id && ci.product_id === productId; });

    if (cartItem) {
      cartItem.quantity += quantity;
      cartItem.unit_price = product.price;
      cartItem.line_subtotal = Number((cartItem.quantity * cartItem.unit_price).toFixed(2));
    } else {
      cartItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity,
        unit_price: product.price,
        line_subtotal: Number((product.price * quantity).toFixed(2)),
        added_at: this._nowISO()
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      if (cart.items.indexOf(cartItem.id) === -1) {
        cart.items.push(cartItem.id);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    const enrichedItems = this._enrichCartItems(cart);
    return {
      success: true,
      message: 'Added to cart',
      cart: cart,
      items: enrichedItems
    };
  }

  getCart() {
    const cart = this._getCurrentCart();
    if (!cart) {
      return { cart: null, items: [], shippingOptions: [] };
    }
    const items = this._enrichCartItems(cart);
    const allShippingOptions = this._getFromStorage('shipping_options');
    const optionsForCart = allShippingOptions.filter(function (o) { return o.cart_id === cart.id; });
    const shippingOptions = this._enrichShippingOptions(optionsForCart);
    return {
      cart: cart,
      items: items,
      shippingOptions: shippingOptions
    };
  }

  getCartSummary() {
    const cart = this._getCurrentCart();
    if (!cart) {
      return { itemCount: 0, subtotal: 0, currency: 'usd' };
    }
    const cartItems = this._getFromStorage('cart_items').filter(function (ci) { return ci.cart_id === cart.id; });
    const itemCount = cartItems.reduce(function (sum, ci) {
      return sum + (ci.quantity || 0);
    }, 0);
    const subtotal = cart.subtotal || 0;
    return {
      itemCount: itemCount,
      subtotal: subtotal,
      currency: cart.currency || 'usd'
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return { success: false, cart: null, items: [] };
    }
    const cartItem = cartItems[idx];
    const cart = this._getCurrentCart();
    if (!cart || cart.id !== cartItem.cart_id) {
      return { success: false, cart: null, items: [] };
    }
    if (quantity <= 0) {
      return this.removeCartItem(cartItemId);
    }
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === cartItem.product_id; }) || null;
    cartItem.quantity = quantity;
    cartItem.unit_price = product ? product.price : cartItem.unit_price;
    cartItem.line_subtotal = Number((cartItem.unit_price * cartItem.quantity).toFixed(2));
    cartItems[idx] = cartItem;
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    const items = this._enrichCartItems(cart);
    return {
      success: true,
      cart: cart,
      items: items
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return { success: false, cart: null, items: [] };
    }
    const cartItem = cartItems[idx];
    const cart = this._getCurrentCart();
    if (!cart || cart.id !== cartItem.cart_id) {
      return { success: false, cart: null, items: [] };
    }
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter(function (id) { return id !== cartItemId; });
    }
    this._recalculateCartTotals(cart);
    const items = this._enrichCartItems(cart);
    return {
      success: true,
      cart: cart,
      items: items
    };
  }

  estimateShippingForCart(shippingCountry, postalCode) {
    return this._createShippingOptionsForCart(shippingCountry, postalCode);
  }

  getShippingOptionsForCart() {
    const cart = this._getCurrentCart();
    if (!cart) return [];
    const all = this._getFromStorage('shipping_options');
    const optionsForCart = all.filter(function (o) { return o.cart_id === cart.id; });
    return this._enrichShippingOptions(optionsForCart);
  }

  selectShippingOption(shippingOptionId) {
    const cart = this._getCurrentCart();
    if (!cart) {
      return { cart: null, selectedOption: null };
    }
    let shippingOptions = this._getFromStorage('shipping_options');
    const optionIdx = shippingOptions.findIndex(function (o) {
      return o.id === shippingOptionId && o.cart_id === cart.id;
    });
    if (optionIdx === -1) {
      return { cart: cart, selectedOption: null };
    }
    const option = shippingOptions[optionIdx];
    shippingOptions = shippingOptions.map(function (o) {
      if (o.cart_id === cart.id) {
        o.is_selected = (o.id === shippingOptionId);
      }
      return o;
    });
    this._saveToStorage('shipping_options', shippingOptions);
    cart.selected_shipping_option_id = shippingOptionId;
    cart.shipping_cost = option.cost || 0;
    this._recalculateCartTotals(cart);
    const methodTypes = this._getFromStorage('shipping_method_types');
    const enrichedOption = Object.assign({}, option, {
      method_type: methodTypes.find(function (mt) { return mt.id === option.method_type_id; }) || null
    });
    return {
      cart: cart,
      selectedOption: enrichedOption
    };
  }

  getCheckoutSummary() {
    const cartData = this.getCart();
    const shippingOptions = this.getShippingOptionsForCart();
    return {
      cart: cartData.cart,
      items: cartData.items,
      shippingOptions: shippingOptions
    };
  }

  updateCheckoutDetails(fullName, addressLine1, addressLine2, city, stateRegion, postalCode, country, email, phone) {
    const cart = this._getOrCreateCart();
    cart.checkout_name = fullName;
    cart.checkout_address_line1 = addressLine1;
    cart.checkout_address_line2 = addressLine2 || null;
    cart.checkout_city = city;
    cart.checkout_state_region = stateRegion;
    cart.checkout_postal_code = postalCode;
    if (country) {
      cart.shipping_country = country;
    } else if (!cart.shipping_country) {
      cart.shipping_country = 'United States';
    }
    cart.checkout_email = email;
    cart.checkout_phone = phone;
    this._updateCartInStorage(cart);
    return cart;
  }

  _createOrderFromCart() {
    const cart = this._getCurrentCart();
    if (!cart) return null;
    const cartItemsAll = this._getFromStorage('cart_items');
    const cartItems = cartItemsAll.filter(function (ci) { return ci.cart_id === cart.id; });
    if (cartItems.length === 0) return null;

    const products = this._getFromStorage('products');
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');
    const shippingOptions = this._getFromStorage('shipping_options');
    const shippingOption = cart.selected_shipping_option_id ?
      (shippingOptions.find(function (o) { return o.id === cart.selected_shipping_option_id; }) || null) : null;
    const shippingMethodTypes = this._getFromStorage('shipping_method_types');
    const shippingMethodType = shippingOption ?
      (shippingMethodTypes.find(function (mt) { return mt.id === shippingOption.method_type_id; }) || null) : null;

    const orderId = this._generateId('order');
    const now = this._nowISO();
    const newOrderItems = [];

    for (let i = 0; i < cartItems.length; i += 1) {
      const ci = cartItems[i];
      const product = products.find(function (p) { return p.id === ci.product_id; }) || null;
      const oi = {
        id: this._generateId('orderitem'),
        order_id: orderId,
        product_id: ci.product_id,
        product_name_snapshot: product ? product.name : null,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_subtotal: ci.line_subtotal,
        created_at: now
      };
      orderItems.push(oi);
      newOrderItems.push(oi);
    }

    const order = {
      id: orderId,
      order_number: 'ORD-' + orderId,
      status: 'pending',
      item_ids: newOrderItems.map(function (oi) { return oi.id; }),
      subtotal: cart.subtotal || 0,
      shipping_cost: cart.shipping_cost || 0,
      total: cart.total || ((cart.subtotal || 0) + (cart.shipping_cost || 0)),
      currency: cart.currency || 'usd',
      shipping_name: cart.checkout_name || '',
      shipping_address_line1: cart.checkout_address_line1 || '',
      shipping_address_line2: cart.checkout_address_line2 || null,
      shipping_city: cart.checkout_city || '',
      shipping_state_region: cart.checkout_state_region || '',
      shipping_postal_code: cart.checkout_postal_code || '',
      shipping_country: cart.shipping_country || 'United States',
      contact_email: cart.checkout_email || '',
      contact_phone: cart.checkout_phone || '',
      shipping_method_type_id: shippingMethodType ? shippingMethodType.id : null,
      shipping_method_name: shippingOption ? shippingOption.name : null,
      created_at: now,
      updated_at: now
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart and related data
    const remainingCarts = this._getFromStorage('carts').filter(function (c) { return c.id !== cart.id; });
    this._saveToStorage('carts', remainingCarts);
    const remainingCartItems = this._getFromStorage('cart_items').filter(function (ci) { return ci.cart_id !== cart.id; });
    this._saveToStorage('cart_items', remainingCartItems);
    const remainingShippingOptions = this._getFromStorage('shipping_options').filter(function (o) { return o.cart_id !== cart.id; });
    this._saveToStorage('shipping_options', remainingShippingOptions);

    return order;
  }

  placeOrder() {
    const order = this._createOrderFromCart();
    if (!order) return null;
    return order;
  }

  getOrderConfirmation(orderId) {
    const orders = this._getFromStorage('orders');
    const order = orders.find(function (o) { return o.id === orderId; }) || null;
    if (!order) {
      return { order: null, items: [] };
    }
    const orderItems = this._getFromStorage('order_items').filter(function (oi) { return oi.order_id === order.id; });
    const products = this._getFromStorage('products');
    const enrichedItems = orderItems.map(function (oi) {
      const product = products.find(function (p) { return p.id === oi.product_id; }) || null;
      const merged = Object.assign({}, oi);
      merged.product = product;
      return merged;
    });
    if (order.shipping_method_type_id) {
      const shippingMethodTypes = this._getFromStorage('shipping_method_types');
      order.shipping_method_type = shippingMethodTypes.find(function (mt) { return mt.id === order.shipping_method_type_id; }) || null;
    } else {
      order.shipping_method_type = null;
    }
    return {
      order: order,
      items: enrichedItems
    };
  }

  // ----------------------
  // Interface: Project lists
  // ----------------------
  getProjectLists() {
    return this._getFromStorage('project_lists');
  }

  createProjectList(name, description) {
    const lists = this._getFromStorage('project_lists');
    const now = this._nowISO();
    const list = {
      id: this._generateId('plist'),
      name: name,
      description: description || null,
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage('project_lists', lists);
    return list;
  }

  renameProjectList(projectListId, newName) {
    const lists = this._getFromStorage('project_lists');
    const idx = lists.findIndex(function (l) { return l.id === projectListId; });
    if (idx === -1) return null;
    lists[idx].name = newName;
    lists[idx].updated_at = this._nowISO();
    this._saveToStorage('project_lists', lists);
    return lists[idx];
  }

  deleteProjectList(projectListId) {
    let lists = this._getFromStorage('project_lists');
    const before = lists.length;
    lists = lists.filter(function (l) { return l.id !== projectListId; });
    this._saveToStorage('project_lists', lists);
    let items = this._getFromStorage('project_list_items');
    items = items.filter(function (i) { return i.project_list_id !== projectListId; });
    this._saveToStorage('project_list_items', items);
    return {
      success: before !== lists.length
    };
  }

  getProjectListDetail(projectListId) {
    const lists = this._getFromStorage('project_lists');
    const list = lists.find(function (l) { return l.id === projectListId; }) || null;
    if (!list) {
      return {
        projectList: null,
        items: [],
        estimatedTotal: 0
      };
    }
    const itemsRaw = this._getFromStorage('project_list_items').filter(function (i) { return i.project_list_id === projectListId; });
    const products = this._getFromStorage('products');
    const items = itemsRaw.map(function (pli) {
      const product = products.find(function (p) { return p.id === pli.product_id; }) || null;
      return { projectListItem: pli, product: product };
    });
    let estimatedTotal = 0;
    for (let i = 0; i < items.length; i += 1) {
      const row = items[i];
      if (row.product && typeof row.product.price === 'number') {
        estimatedTotal += row.product.price * (row.projectListItem.desired_quantity || 0);
      }
    }
    estimatedTotal = Number(estimatedTotal.toFixed(2));
    return {
      projectList: list,
      items: items,
      estimatedTotal: estimatedTotal
    };
  }

  addProductToProjectList(projectListId, productId, desiredQuantity) {
    if (desiredQuantity == null) desiredQuantity = 1;
    const lists = this._getFromStorage('project_lists');
    const list = lists.find(function (l) { return l.id === projectListId; });
    if (!list) {
      throw new Error('Project list not found');
    }
    let items = this._getFromStorage('project_list_items');
    let item = items.find(function (i) { return i.project_list_id === projectListId && i.product_id === productId; });
    const now = this._nowISO();
    if (item) {
      item.desired_quantity += desiredQuantity;
      item.added_at = item.added_at || now;
    } else {
      item = {
        id: this._generateId('plistitem'),
        project_list_id: projectListId,
        product_id: productId,
        desired_quantity: desiredQuantity,
        notes: null,
        added_at: now
      };
      items.push(item);
    }
    this._saveToStorage('project_list_items', items);
    return item;
  }

  updateProjectListItemQuantity(projectListItemId, desiredQuantity) {
    let items = this._getFromStorage('project_list_items');
    const idx = items.findIndex(function (i) { return i.id === projectListItemId; });
    if (idx === -1) return null;
    items[idx].desired_quantity = desiredQuantity;
    this._saveToStorage('project_list_items', items);
    return items[idx];
  }

  removeProjectListItem(projectListItemId) {
    let items = this._getFromStorage('project_list_items');
    const before = items.length;
    items = items.filter(function (i) { return i.id !== projectListItemId; });
    this._saveToStorage('project_list_items', items);
    return {
      success: before !== items.length
    };
  }

  addProjectListToCart(projectListId) {
    const detail = this.getProjectListDetail(projectListId);
    if (!detail.projectList) {
      return { cart: null, items: [] };
    }
    const listItems = detail.items;
    let lastResult = null;
    for (let i = 0; i < listItems.length; i += 1) {
      const row = listItems[i];
      const product = row.product;
      if (!product) continue;
      const qty = row.projectListItem.desired_quantity || 1;
      lastResult = this.addToCart(product.id, qty);
    }
    if (!lastResult) {
      const cart = this._getCurrentCart();
      return { cart: cart, items: cart ? this._enrichCartItems(cart) : [] };
    }
    return {
      cart: lastResult.cart,
      items: lastResult.items
    };
  }

  // ----------------------
  // Interface: Product comparison
  // ----------------------
  createProductComparison(productIds) {
    if (!Array.isArray(productIds) || productIds.length < 2 || productIds.length > 4) {
      throw new Error('productIds must be an array of 2 to 4 ids');
    }
    const comparisons = this._getFromStorage('product_comparisons');
    const comparison = {
      id: this._generateId('cmp'),
      product_ids: productIds.slice(),
      created_at: this._nowISO()
    };
    comparisons.push(comparison);
    this._saveToStorage('product_comparisons', comparisons);
    const products = this._getFromStorage('products').filter(function (p) { return productIds.indexOf(p.id) !== -1; });
    return {
      comparison: comparison,
      products: products
    };
  }

  getProductComparison(comparisonId) {
    const comparisons = this._getFromStorage('product_comparisons');
    const comparison = comparisons.find(function (c) { return c.id === comparisonId; }) || null;
    if (!comparison) {
      return { comparison: null, products: [] };
    }
    const products = this._getFromStorage('products').filter(function (p) {
      return comparison.product_ids.indexOf(p.id) !== -1;
    });
    return {
      comparison: comparison,
      products: products
    };
  }

  // ----------------------
  // Interface: Bulk quote
  // ----------------------
  submitBulkQuoteRequest(productId, quantity, requesterName, requesterEmail, comments) {
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    const requests = this._getFromStorage('bulk_quote_requests');
    const now = this._nowISO();
    const req = {
      id: this._generateId('bq'),
      product_id: productId,
      product_name_snapshot: product ? product.name : null,
      quantity: quantity,
      requester_name: requesterName,
      requester_email: requesterEmail,
      comments: comments || null,
      status: 'submitted',
      created_at: now,
      updated_at: now
    };
    requests.push(req);
    this._saveToStorage('bulk_quote_requests', requests);
    const enriched = Object.assign({}, req);
    enriched.product = product;
    return enriched;
  }

  // ----------------------
  // Static content interfaces
  // ----------------------
  getAboutContent() {
    return {
      title: 'About Our RF Components Catalog',
      bodySections: [
        {
          heading: 'Precision RF Components for Engineering Teams',
          text: 'This catalog focuses on telecommunications RF components such as attenuators, amplifiers, filters, antennas, and coaxial assemblies. It is designed for RF engineers, test labs, and system integrators.'
        },
        {
          heading: 'Engineering-Driven Selection',
          text: 'Products are organized by RF performance parameters including frequency range, power rating, gain, noise figure, insertion loss, and impedance so you can quickly narrow to the parts that meet your design or lab needs.'
        }
      ]
    };
  }

  submitContactForm(name, email, subject, message) {
    // We keep this lightweight and do not persist to avoid unnecessary storage usage.
    return {
      success: true,
      message: 'Your message has been submitted.'
    };
  }

  getHelpAndFaqContent() {
    return {
      topics: [
        {
          id: 'search_and_filters',
          title: 'Using search and filters',
          category: 'search_and_filters',
          content: 'Use the main search for part numbers or keywords, then refine results using frequency range, connector type, impedance, power rating, and other technical filters.'
        },
        {
          id: 'project_lists',
          title: 'Project lists for lab builds',
          category: 'project_lists',
          content: 'Create project lists (such as a 5G lab kit) to group attenuators, LNAs, filters, antennas, and cables. You can later move items from a list into the shopping cart.'
        },
        {
          id: 'shipping_and_orders',
          title: 'Shipping, quotes, and orders',
          category: 'shipping_and_orders',
          content: 'Estimate shipping from the cart using your ZIP or postal code, submit bulk quote requests for volume pricing, and proceed through checkout when ready.'
        }
      ]
    };
  }

  getTermsAndConditionsContent() {
    return {
      title: 'Terms and Conditions',
      bodySections: [
        {
          heading: 'Use of Site',
          text: 'This RF components catalog is provided for professional and engineering use. Specifications are subject to change without notice.'
        },
        {
          heading: 'Pricing and Availability',
          text: 'All prices are listed in USD and subject to change. Product availability, lead times, and stock status are provided as guidance and are not guaranteed until an order is confirmed.'
        }
      ]
    };
  }

  getPrivacyPolicyContent() {
    return {
      title: 'Privacy Policy',
      bodySections: [
        {
          heading: 'Data Collection',
          text: 'We collect basic contact details and order information necessary to process your RF component orders and respond to your inquiries.'
        },
        {
          heading: 'Cookies and Analytics',
          text: 'Anonymous usage data may be used to improve the catalog experience and help RF engineers find the right components faster.'
        }
      ]
    };
  }

  getShippingAndReturnsContent() {
    const shippingMethodTypes = this._ensureShippingMethodTypes();
    return {
      title: 'Shipping and Returns',
      bodySections: [
        {
          heading: 'Shipping Methods',
          text: 'We offer multiple shipping options including economy, standard, expedited, and overnight services. Availability and transit times depend on destination and order contents.'
        },
        {
          heading: 'Returns',
          text: 'Standard return policies apply for unused RF components in their original packaging. Certain custom cable assemblies or special-order parts may be non-returnable.'
        }
      ],
      shippingMethodTypes: shippingMethodTypes
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