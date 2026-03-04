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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all array-based data tables
    const arrayKeys = [
      'users',
      'products',
      'categories',
      'stores',
      'product_store_availabilities',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'comparison_lists',
      'comparison_items',
      'services',
      'appointments',
      'inspiration_rooms',
      'inspiration_products',
      'financing_programs',
      'orders',
      'order_items',
      'homepage_promotions',
      'help_faqs',
      'contact_requests'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      // Corrupted data; reset to default
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  _findById(array, id) {
    return array.find(item => item.id === id) || null;
  }

  // ----------------------
  // Domain helpers
  // ----------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const now = new Date().toISOString();

    let currentCartId = localStorage.getItem('current_cart_id');
    let cart = currentCartId ? carts.find(c => c.id === currentCartId) : null;

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        discounts_total: 0,
        tax_estimate: 0,
        total: 0,
        currency: 'usd',
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    } else {
      // Ensure items list is synced
      const itemIds = cartItems
        .filter(ci => ci.cart_id === cart.id)
        .map(ci => ci.id);
      cart.items = itemIds;
      this._saveToStorage('carts', carts);
    }

    return cart;
  }

  _getCartItems(cartId) {
    const cartItems = this._getFromStorage('cart_items', []);
    return cartItems.filter(ci => ci.cart_id === cartId);
  }

  _recalculateCart(cart) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.line_subtotal || 0), 0);

    cart.items = itemsForCart.map(ci => ci.id);
    cart.subtotal = subtotal;
    cart.discounts_total = cart.discounts_total || 0;
    cart.tax_estimate = +(subtotal * 0.08).toFixed(2); // simple 8% estimate
    cart.total = +(subtotal - cart.discounts_total + cart.tax_estimate).toFixed(2);
    cart.updated_at = new Date().toISOString();

    const index = carts.findIndex(c => c.id === cart.id);
    if (index !== -1) {
      carts[index] = cart;
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage('wishlists', []);
    const now = new Date().toISOString();
    let currentWishlistId = localStorage.getItem('current_wishlist_id');
    let wishlist = currentWishlistId ? wishlists.find(w => w.id === currentWishlistId) : null;

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        items: [],
        created_at: now,
        updated_at: now
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
      localStorage.setItem('current_wishlist_id', wishlist.id);
    }
    return wishlist;
  }

  _getOrCreateComparisonList() {
    const lists = this._getFromStorage('comparison_lists', []);
    const now = new Date().toISOString();
    let currentId = localStorage.getItem('current_comparison_list_id');
    let list = currentId ? lists.find(l => l.id === currentId) : null;

    if (!list) {
      list = {
        id: this._generateId('comparison_list'),
        items: [],
        created_at: now
      };
      lists.push(list);
      this._saveToStorage('comparison_lists', lists);
      localStorage.setItem('current_comparison_list_id', list.id);
    }
    return list;
  }

  _getPreferredStoreFromStorage() {
    const storeId = localStorage.getItem('preferred_store_id');
    if (!storeId) {
      return null;
    }
    const stores = this._getFromStorage('stores', []);
    return stores.find(s => s.id === storeId) || null;
  }

  _productMatchesCategory(product, categoryKey) {
    if (!categoryKey) return true;
    if (!product || !product.category_key) return false;
    if (product.category_key === categoryKey) return true;

    const categories = this._getFromStorage('categories', []);
    let current = categories.find(c => c.key === product.category_key);
    const visited = new Set();

    while (current && current.parent_key && !visited.has(current.parent_key)) {
      if (current.parent_key === categoryKey) return true;
      visited.add(current.parent_key);
      current = categories.find(c => c.key === current.parent_key);
    }
    return false;
  }

  _getProductSortPrice(product) {
    if (!product) return Number.POSITIVE_INFINITY;
    if (typeof product.price_per_sq_ft === 'number') return product.price_per_sq_ft;
    return typeof product.base_price === 'number' ? product.base_price : Number.POSITIVE_INFINITY;
  }

  _inferAccessoryRole(product) {
    if (!product || !product.name) return 'other';
    const name = product.name.toLowerCase();
    if (name.includes('underlayment') || name.includes('underlay')) return 'underlayment';
    if (name.includes('stair nose') || name.includes('stair-nose') || name.includes('stairnose')) return 'stair_nose';
    if (name.includes('trim')) return 'trim';
    if (name.includes('molding') || name.includes('moulding')) return 'molding';
    return 'other';
  }

  _getOrCreateDraftOrderFromCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItems(cart.id);
    const products = this._getFromStorage('products', []);

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const now = new Date().toISOString();

    // Always create a new draft order from the current cart
    const order = {
      id: this._generateId('order'),
      created_at: now,
      updated_at: now,
      status: 'draft',
      subtotal: cart.subtotal || 0,
      discounts_total: cart.discounts_total || 0,
      tax_total: cart.tax_estimate || 0,
      shipping_total: 0,
      total: cart.total || 0,
      currency: 'usd',
      shipping_method: null,
      fulfillment_method: 'mixed',
      payment_method: 'other',
      financing_program_id: null,
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      shipping_address_street: '',
      shipping_address_city: '',
      shipping_address_state: '',
      shipping_address_zip: '',
      pickup_store_id: null
    };

    const thisOrderItems = [];

    for (const ci of cartItems) {
      const product = products.find(p => p.id === ci.product_id) || null;
      const orderItem = {
        id: this._generateId('order_item'),
        order_id: order.id,
        product_id: ci.product_id,
        product_name: ci.product_name || (product ? product.name : ''),
        sku: ci.sku || (product ? product.sku : ''),
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        is_sample: !!ci.is_sample,
        fulfillment_method: ci.fulfillment_method || 'ship_to_home',
        pickup_store_id: ci.pickup_store_id || null
      };
      orderItems.push(orderItem);
      thisOrderItems.push(orderItem);
    }

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);
    localStorage.setItem('current_order_id', order.id);

    return { order, orderItems: thisOrderItems };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1. getTopLevelCategories()
  getTopLevelCategories() {
    const categories = this._getFromStorage('categories', []);
    return categories.filter(c => !c.parent_key);
  }

  // 2. getHomepageFeaturedCategories()
  getHomepageFeaturedCategories() {
    const categories = this._getFromStorage('categories', []);
    const featuredIds = this._getFromStorage('homepage_featured_category_ids', []);
    if (!featuredIds || !Array.isArray(featuredIds) || featuredIds.length === 0) {
      // No explicit featured list; return empty to avoid mocking
      return [];
    }
    return featuredIds
      .map(id => categories.find(c => c.id === id) || null)
      .filter(Boolean);
  }

  // 3. getHomepageFeaturedProducts()
  getHomepageFeaturedProducts() {
    const products = this._getFromStorage('products', []);
    const featuredIds = this._getFromStorage('homepage_featured_product_ids', []);
    if (!featuredIds || !Array.isArray(featuredIds) || featuredIds.length === 0) {
      return [];
    }
    return featuredIds
      .map(id => products.find(p => p.id === id) || null)
      .filter(Boolean);
  }

  // 4. getHomepagePromotions()
  getHomepagePromotions() {
    const promotions = this._getFromStorage('homepage_promotions', []);
    const financingPrograms = this._getFromStorage('financing_programs', []);

    return promotions.map(promo => {
      const enriched = { ...promo };
      if (promo.financingProgramId) {
        const fp = financingPrograms.find(f => f.id === promo.financingProgramId) || null;
        enriched.financingProgram = fp;
      }
      return enriched;
    });
  }

  // 5. getProductFilterOptions(contextType, categoryKey, searchTerm)
  getProductFilterOptions(contextType, categoryKey, searchTerm) {
    const products = this._getFromStorage('products', []).filter(p => p.status === 'active');
    let relevant = products;

    if (contextType === 'category' && categoryKey) {
      relevant = products.filter(p => this._productMatchesCategory(p, categoryKey));
    } else if (contextType === 'search' && searchTerm) {
      const term = String(searchTerm).toLowerCase();
      relevant = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return name.includes(term) || desc.includes(term) || sku.includes(term);
      });
    }

    const pricePerSqFtValues = relevant
      .map(p => typeof p.price_per_sq_ft === 'number' ? p.price_per_sq_ft : null)
      .filter(v => v !== null);
    const basePriceValues = relevant
      .map(p => typeof p.base_price === 'number' ? p.base_price : null)
      .filter(v => v !== null);

    const pricePerSqFt = pricePerSqFtValues.length
      ? {
          min: Math.min(...pricePerSqFtValues),
          max: Math.max(...pricePerSqFtValues),
          step: 0.1
        }
      : null;

    const basePrice = basePriceValues.length
      ? {
          min: Math.min(...basePriceValues),
          max: Math.max(...basePriceValues),
          step: 1
        }
      : null;

    const colorSet = new Set();
    relevant.forEach(p => {
      if (p.color_family) colorSet.add(p.color_family);
    });
    const colorFamilies = Array.from(colorSet).map(value => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    }));

    const waterproofAvailable = relevant.some(p => !!p.is_waterproof);
    const stainResistantAvailable = relevant.some(p => !!p.is_stain_resistant);

    const customerRatings = [
      { value: 4, label: '4 stars & up' },
      { value: 3, label: '3 stars & up' },
      { value: 2, label: '2 stars & up' }
    ];

    const osSet = new Set();
    relevant.forEach(p => {
      if (p.operating_system && p.operating_system !== 'none') {
        osSet.add(p.operating_system);
      }
    });
    const operatingSystems = Array.from(osSet).map(value => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const lcSet = new Set();
    relevant.forEach(p => {
      if (p.light_control && p.light_control !== 'none') {
        lcSet.add(p.light_control);
      }
    });
    const lightControls = Array.from(lcSet).map(value => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const sizeSet = new Set();
    relevant.forEach(p => {
      if (p.size_category && p.size_category !== 'none') {
        sizeSet.add(p.size_category);
      }
    });
    const sizeCategories = Array.from(sizeSet).map(value => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    const customizableFilterAvailable = relevant.some(p => !!p.is_customizable);
    const pickupEligibleFilterAvailable = relevant.some(p => !!p.is_pickup_eligible);

    return {
      pricePerSqFt,
      basePrice,
      colorFamilies,
      features: {
        waterproofAvailable,
        stainResistantAvailable
      },
      customerRatings,
      operatingSystems,
      lightControls,
      sizeCategories,
      customizableFilterAvailable,
      pickupEligibleFilterAvailable
    };
  }

  // 6. getCategoryProducts(categoryKey, filters, sort, page, pageSize)
  getCategoryProducts(categoryKey, filters, sort = 'best_match', page = 1, pageSize = 20) {
    const products = this._getFromStorage('products', []).filter(p => p.status === 'active');
    const availabilities = this._getFromStorage('product_store_availabilities', []);
    const preferredStore = this._getPreferredStoreFromStorage();

    const f = filters || {};

    let result = products.filter(p => this._productMatchesCategory(p, categoryKey));

    if (typeof f.minPrice === 'number') {
      result = result.filter(p => typeof p.base_price === 'number' && p.base_price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      result = result.filter(p => typeof p.base_price === 'number' && p.base_price <= f.maxPrice);
    }
    if (typeof f.minPricePerSqFt === 'number') {
      result = result.filter(p => typeof p.price_per_sq_ft === 'number' && p.price_per_sq_ft >= f.minPricePerSqFt);
    }
    if (typeof f.maxPricePerSqFt === 'number') {
      result = result.filter(p => typeof p.price_per_sq_ft === 'number' && p.price_per_sq_ft <= f.maxPricePerSqFt);
    }
    if (typeof f.isWaterproof === 'boolean') {
      result = result.filter(p => !!p.is_waterproof === f.isWaterproof);
    }
    if (typeof f.minRating === 'number') {
      result = result.filter(p => typeof p.rating_average === 'number' && p.rating_average >= f.minRating);
    }
    if (f.colorFamily) {
      result = result.filter(p => p.color_family === f.colorFamily);
    }
    if (f.lightControl) {
      result = result.filter(p => p.light_control === f.lightControl);
    }
    if (f.operatingSystem) {
      result = result.filter(p => p.operating_system === f.operatingSystem);
    }
    if (f.sizeCategory) {
      result = result.filter(p => p.size_category === f.sizeCategory);
    }
    if (typeof f.isCustomizable === 'boolean') {
      result = result.filter(p => !!p.is_customizable === f.isCustomizable);
    }
    if (f.isPickupEligibleOnly && preferredStore) {
      // When a preferred store is set, prioritize products flagged as pickup-eligible.
      // Availability data may be incomplete, so we don't require a matching record.
      result = result.filter(p => !!p.is_pickup_eligible);
    } else if (f.isPickupEligibleOnly) {
      // No preferred store; just require pickup eligible flag
      result = result.filter(p => !!p.is_pickup_eligible);
    }

    if (sort === 'price_low_to_high') {
      result = result.slice().sort((a, b) => this._getProductSortPrice(a) - this._getProductSortPrice(b));
    } else if (sort === 'price_high_to_low') {
      result = result.slice().sort((a, b) => this._getProductSortPrice(b) - this._getProductSortPrice(a));
    } else if (sort === 'customer_rating') {
      result = result.slice().sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    }

    const totalResults = result.length;
    const start = (page - 1) * pageSize;
    const paged = result.slice(start, start + pageSize);

    return {
      products: paged,
      page,
      pageSize,
      totalResults
    };
  }

  // 7. searchProducts(searchTerm, filters, sort, page, pageSize)
  searchProducts(searchTerm, filters, sort = 'best_match', page = 1, pageSize = 20) {
    const term = String(searchTerm || '').toLowerCase();
    const products = this._getFromStorage('products', []).filter(p => p.status === 'active');
    const f = filters || {};

    let result = products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return name.includes(term) || desc.includes(term) || sku.includes(term);
    });

    if (f.categoryKey) {
      result = result.filter(p => this._productMatchesCategory(p, f.categoryKey));
    }
    if (typeof f.minPrice === 'number') {
      result = result.filter(p => typeof p.base_price === 'number' && p.base_price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      result = result.filter(p => typeof p.base_price === 'number' && p.base_price <= f.maxPrice);
    }
    if (typeof f.minPricePerSqFt === 'number') {
      result = result.filter(p => typeof p.price_per_sq_ft === 'number' && p.price_per_sq_ft >= f.minPricePerSqFt);
    }
    if (typeof f.maxPricePerSqFt === 'number') {
      result = result.filter(p => typeof p.price_per_sq_ft === 'number' && p.price_per_sq_ft <= f.maxPricePerSqFt);
    }
    if (typeof f.minRating === 'number') {
      result = result.filter(p => typeof p.rating_average === 'number' && p.rating_average >= f.minRating);
    }
    if (f.colorFamily) {
      result = result.filter(p => p.color_family === f.colorFamily);
    }

    if (sort === 'price_low_to_high') {
      result = result.slice().sort((a, b) => this._getProductSortPrice(a) - this._getProductSortPrice(b));
    } else if (sort === 'price_high_to_low') {
      result = result.slice().sort((a, b) => this._getProductSortPrice(b) - this._getProductSortPrice(a));
    } else if (sort === 'customer_rating') {
      result = result.slice().sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
    }

    const totalResults = result.length;
    const start = (page - 1) * pageSize;
    const paged = result.slice(start, start + pageSize);

    return {
      products: paged,
      page,
      pageSize,
      totalResults
    };
  }

  // 8. getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('categories', []);
    const product = products.find(p => p.id === productId) || null;

    if (!product) {
      return {
        product: null,
        category: null,
        pickupAvailability: null,
        recommendedAccessories: []
      };
    }

    const category = categories.find(c => c.key === product.category_key) || null;

    const preferredStore = this._getPreferredStoreFromStorage();
    let pickupAvailability = null;
    if (preferredStore) {
      const availabilities = this._getFromStorage('product_store_availabilities', []);
      const availability = availabilities.find(a => a.product_id === product.id && a.store_id === preferredStore.id) || null;
      if (availability) {
        pickupAvailability = {
          store: preferredStore,
          availability: {
            ...availability,
            product: product,
            store: preferredStore
          }
        };
      }
    }

    const recommendedAccessories = [];
    if (Array.isArray(product.recommended_accessory_ids)) {
      for (const accId of product.recommended_accessory_ids) {
        const accProduct = products.find(p => p.id === accId);
        if (accProduct) {
          recommendedAccessories.push({
            product: accProduct,
            accessoryRole: this._inferAccessoryRole(accProduct)
          });
        }
      }
    }

    return {
      product,
      category,
      pickupAvailability,
      recommendedAccessories
    };
  }

  // 9. calculateFlooringCoverage(productId, roomAreaSqFt, wastePercentage)
  calculateFlooringCoverage(productId, roomAreaSqFt, wastePercentage = 0) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;

    if (!product || !roomAreaSqFt || roomAreaSqFt <= 0) {
      return {
        roomAreaSqFt: roomAreaSqFt || 0,
        wastePercentage: wastePercentage || 0,
        coveragePerUnitSqFt: 0,
        totalCoverageSqFt: 0,
        requiredUnits: 0,
        estimatedLineSubtotal: 0
      };
    }

    const coveragePerUnitSqFt = product.coverage_per_unit_sq_ft || roomAreaSqFt;
    const totalCoverageSqFt = roomAreaSqFt * (1 + (wastePercentage || 0) / 100);
    const requiredUnits = coveragePerUnitSqFt > 0 ? Math.ceil(totalCoverageSqFt / coveragePerUnitSqFt) : 0;
    const estimatedLineSubtotal = (product.base_price || 0) * requiredUnits;

    return {
      roomAreaSqFt,
      wastePercentage: wastePercentage || 0,
      coveragePerUnitSqFt,
      totalCoverageSqFt,
      requiredUnits,
      estimatedLineSubtotal
    };
  }

  // 10. addToCart(productId, quantity, roomAreaSqFt, wastePercentage, calculatedCoverageSqFt, ...)
  addToCart(
    productId,
    quantity = 1,
    roomAreaSqFt,
    wastePercentage,
    calculatedCoverageSqFt,
    selectedWidthInches,
    selectedHeightInches,
    selectedColorFamily,
    isSample,
    isAccessory,
    accessoryRole,
    fulfillmentMethod,
    pickupStoreId
  ) {
    const products = this._getFromStorage('products', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        cart,
        addedItem: null,
        message: 'Product not found.'
      };
    }

    const now = new Date().toISOString();
    const qty = quantity > 0 ? quantity : 1;

    let unitPrice = product.base_price || 0;
    if (isSample && typeof product.sample_price === 'number') {
      unitPrice = product.sample_price;
    }

    const item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity: qty,
      unit_price: unitPrice,
      price_per_sq_ft: product.price_per_sq_ft || null,
      line_subtotal: +(unitPrice * qty).toFixed(2),
      is_sample: !!isSample,
      is_accessory: !!isAccessory,
      accessory_role: accessoryRole || 'none',
      selected_color_family: selectedColorFamily || product.color_family || null,
      selected_width_inches: selectedWidthInches || null,
      selected_height_inches: selectedHeightInches || null,
      room_area_sq_ft: roomAreaSqFt || null,
      waste_percentage: typeof wastePercentage === 'number' ? wastePercentage : null,
      calculated_coverage_sq_ft: calculatedCoverageSqFt || null,
      fulfillment_method: fulfillmentMethod || (product.is_pickup_eligible ? 'store_pickup' : 'ship_to_home'),
      pickup_store_id: null,
      created_at: now,
      updated_at: now
    };

    if (item.fulfillment_method === 'store_pickup') {
      const preferredStore = this._getPreferredStoreFromStorage();
      item.pickup_store_id = pickupStoreId || (preferredStore ? preferredStore.id : null);
    }

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    // Update cart.items list
    const carts = this._getFromStorage('carts', []);
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex].items = carts[cartIndex].items || [];
      carts[cartIndex].items.push(item.id);
      this._saveToStorage('carts', carts);
    }

    const updatedCart = this._recalculateCart(cart);

    return {
      success: true,
      cart: updatedCart,
      addedItem: item,
      message: 'Item added to cart.'
    };
  }

  // 11. orderSampleFromProduct(productId)
  orderSampleFromProduct(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;

    if (!product) {
      return {
        success: false,
        cart: this._getOrCreateCart(),
        sampleItem: null,
        message: 'Product not found.'
      };
    }

    if (!product.is_sample_eligible) {
      return {
        success: false,
        cart: this._getOrCreateCart(),
        sampleItem: null,
        message: 'Samples are not available for this product.'
      };
    }

    const res = this.addToCart(
      productId,
      1,
      null,
      null,
      null,
      null,
      null,
      null,
      true,
      false,
      'none',
      'ship_to_home',
      null
    );

    return {
      success: res.success,
      cart: res.cart,
      sampleItem: res.addedItem,
      message: res.message
    };
  }

  // 12. addProductToComparison(productId)
  addProductToComparison(productId) {
    const products = this._getFromStorage('products', []);
    const comparisonItems = this._getFromStorage('comparison_items', []);
    const comparisonList = this._getOrCreateComparisonList();
    const now = new Date().toISOString();

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        comparisonListId: comparisonList.id,
        totalItems: comparisonItems.filter(ci => ci.comparison_list_id === comparisonList.id).length,
        message: 'Product not found.'
      };
    }

    const already = comparisonItems.find(
      ci => ci.comparison_list_id === comparisonList.id && ci.product_id === productId
    );
    if (already) {
      const totalItems = comparisonItems.filter(ci => ci.comparison_list_id === comparisonList.id).length;
      return {
        success: true,
        comparisonListId: comparisonList.id,
        totalItems,
        message: 'Product already in comparison list.'
      };
    }

    const item = {
      id: this._generateId('comparison_item'),
      comparison_list_id: comparisonList.id,
      product_id: productId,
      product_name: product.name,
      added_at: now
    };
    comparisonItems.push(item);
    this._saveToStorage('comparison_items', comparisonItems);

    const lists = this._getFromStorage('comparison_lists', []);
    const idx = lists.findIndex(l => l.id === comparisonList.id);
    if (idx !== -1) {
      lists[idx].items = lists[idx].items || [];
      lists[idx].items.push(item.id);
      this._saveToStorage('comparison_lists', lists);
    }

    const totalItems = comparisonItems.filter(ci => ci.comparison_list_id === comparisonList.id).length;
    return {
      success: true,
      comparisonListId: comparisonList.id,
      totalItems,
      message: 'Product added to comparison list.'
    };
  }

  // 13. getComparisonList()
  getComparisonList() {
    const comparisonList = this._getOrCreateComparisonList();
    const comparisonItems = this._getFromStorage('comparison_items', []);
    const products = this._getFromStorage('products', []);

    const items = comparisonItems.filter(ci => ci.comparison_list_id === comparisonList.id);

    const itemsDetailed = items.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const comparisonItem = { ...ci, product };
      return {
        comparisonItem,
        product
      };
    });

    return {
      comparisonList,
      itemsDetailed
    };
  }

  // 14. removeProductFromComparison(productId)
  removeProductFromComparison(productId) {
    const comparisonList = this._getOrCreateComparisonList();
    let comparisonItems = this._getFromStorage('comparison_items', []);
    const lists = this._getFromStorage('comparison_lists', []);

    const beforeCount = comparisonItems.length;
    const idsToRemove = comparisonItems
      .filter(ci => ci.comparison_list_id === comparisonList.id && ci.product_id === productId)
      .map(ci => ci.id);
    if (idsToRemove.length === 0) {
      const totalItems = comparisonItems.filter(ci => ci.comparison_list_id === comparisonList.id).length;
      return {
        success: false,
        totalItems,
        message: 'Product not found in comparison list.'
      };
    }

    comparisonItems = comparisonItems.filter(ci => !idsToRemove.includes(ci.id));
    this._saveToStorage('comparison_items', comparisonItems);

    const listIdx = lists.findIndex(l => l.id === comparisonList.id);
    if (listIdx !== -1) {
      lists[listIdx].items = (lists[listIdx].items || []).filter(id => !idsToRemove.includes(id));
      this._saveToStorage('comparison_lists', lists);
    }

    const afterCount = comparisonItems.filter(ci => ci.comparison_list_id === comparisonList.id).length;
    return {
      success: true,
      totalItems: afterCount,
      message: 'Product removed from comparison list.'
    };
  }

  // 15. clearComparisonList()
  clearComparisonList() {
    const comparisonList = this._getOrCreateComparisonList();
    let comparisonItems = this._getFromStorage('comparison_items', []);
    const lists = this._getFromStorage('comparison_lists', []);

    comparisonItems = comparisonItems.filter(ci => ci.comparison_list_id !== comparisonList.id);
    this._saveToStorage('comparison_items', comparisonItems);

    const listIdx = lists.findIndex(l => l.id === comparisonList.id);
    if (listIdx !== -1) {
      lists[listIdx].items = [];
      this._saveToStorage('comparison_lists', lists);
    }

    return {
      success: true,
      message: 'Comparison list cleared.'
    };
  }

  // 16. getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItems(cart.id);
    const products = this._getFromStorage('products', []);

    const itemsDetailed = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const cartItem = { ...ci, product };
      return {
        cartItem,
        product
      };
    });

    return {
      cart,
      itemsDetailed
    };
  }

  // 17. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cart: this._getOrCreateCart(),
        updatedItem: null,
        message: 'Cart item not found.'
      };
    }

    const item = cartItems[idx];
    const newQty = quantity > 0 ? quantity : 1;
    item.quantity = newQty;
    item.line_subtotal = +(item.unit_price * newQty).toFixed(2);
    item.updated_at = new Date().toISOString();
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCart(cart);

    return {
      success: true,
      cart: updatedCart,
      updatedItem: item,
      message: 'Cart item quantity updated.'
    };
  }

  // 18. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find(ci => ci.id === cartItemId) || null;
    if (!item) {
      return {
        success: false,
        cart: this._getOrCreateCart(),
        message: 'Cart item not found.'
      };
    }

    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();
    const cartIdx = carts.findIndex(c => c.id === cart.id);
    if (cartIdx !== -1) {
      carts[cartIdx].items = (carts[cartIdx].items || []).filter(id => id !== cartItemId);
      this._saveToStorage('carts', carts);
    }

    const updatedCart = this._recalculateCart(cart);

    return {
      success: true,
      cart: updatedCart,
      message: 'Cart item removed.'
    };
  }

  // 19. updateCartItemFulfillment(cartItemId, fulfillmentMethod, pickupStoreId)
  updateCartItemFulfillment(cartItemId, fulfillmentMethod, pickupStoreId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cart: this._getOrCreateCart(),
        updatedItem: null,
        message: 'Cart item not found.'
      };
    }

    const item = cartItems[idx];
    item.fulfillment_method = fulfillmentMethod;
    if (fulfillmentMethod === 'store_pickup') {
      const preferredStore = this._getPreferredStoreFromStorage();
      item.pickup_store_id = pickupStoreId || (preferredStore ? preferredStore.id : null);
    } else {
      item.pickup_store_id = null;
    }
    item.updated_at = new Date().toISOString();
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === item.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCart(cart);

    return {
      success: true,
      cart: updatedCart,
      updatedItem: item,
      message: 'Cart item fulfillment updated.'
    };
  }

  // 20. startCheckoutFromCart()
  startCheckoutFromCart() {
    const { order, orderItems } = this._getOrCreateDraftOrderFromCart();
    return {
      order,
      orderItems
    };
  }

  // 21. updateCheckoutContactAndShipping(orderId, ...)
  updateCheckoutContactAndShipping(
    orderId,
    contactName,
    contactEmail,
    contactPhone,
    shippingAddressStreet,
    shippingAddressCity,
    shippingAddressState,
    shippingAddressZip
  ) {
    const orders = this._getFromStorage('orders', []);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) {
      return { order: null };
    }

    const order = orders[idx];
    order.contact_name = contactName;
    order.contact_email = contactEmail;
    order.contact_phone = contactPhone;
    order.shipping_address_street = shippingAddressStreet || '';
    order.shipping_address_city = shippingAddressCity || '';
    order.shipping_address_state = shippingAddressState || '';
    order.shipping_address_zip = shippingAddressZip || '';
    order.updated_at = new Date().toISOString();

    orders[idx] = order;
    this._saveToStorage('orders', orders);

    return { order };
  }

  // 22. updateCheckoutShippingMethod(orderId, shippingMethod, pickupStoreId)
  updateCheckoutShippingMethod(orderId, shippingMethod, pickupStoreId) {
    const orders = this._getFromStorage('orders', []);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) {
      return { order: null };
    }
    const order = orders[idx];
    order.shipping_method = shippingMethod;
    if (shippingMethod === 'store_pickup') {
      order.pickup_store_id = pickupStoreId || null;
      order.fulfillment_method = 'store_pickup';
    } else {
      order.pickup_store_id = null;
      order.fulfillment_method = 'ship_to_home';
    }
    order.updated_at = new Date().toISOString();
    orders[idx] = order;
    this._saveToStorage('orders', orders);

    return { order };
  }

  // 23. getActiveFinancingPrograms(purchaseAmount)
  getActiveFinancingPrograms(purchaseAmount) {
    const programs = this._getFromStorage('financing_programs', []);
    const amount = typeof purchaseAmount === 'number' ? purchaseAmount : null;

    return programs.filter(p => {
      if (!p.is_active) return false;
      if (amount === null) return true;
      if (typeof p.min_purchase_amount === 'number' && amount < p.min_purchase_amount) return false;
      if (typeof p.max_purchase_amount === 'number' && amount > p.max_purchase_amount) return false;
      return true;
    });
  }

  // 24. selectCheckoutPaymentMethod(orderId, paymentMethod, financingProgramId)
  selectCheckoutPaymentMethod(orderId, paymentMethod, financingProgramId) {
    const orders = this._getFromStorage('orders', []);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) {
      return { order: null };
    }

    const order = orders[idx];
    order.payment_method = paymentMethod;
    if (paymentMethod === 'financing') {
      order.financing_program_id = financingProgramId || null;
    } else {
      order.financing_program_id = null;
    }
    if (order.status === 'draft') {
      order.status = 'pending_payment';
    }
    order.updated_at = new Date().toISOString();
    orders[idx] = order;
    this._saveToStorage('orders', orders);

    return { order };
  }

  // 25. getOrderSummary(orderId)
  getOrderSummary(orderId) {
    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);
    const products = this._getFromStorage('products', []);
    const stores = this._getFromStorage('stores', []);

    const order = orders.find(o => o.id === orderId) || null;
    if (!order) {
      return {
        order: null,
        items: []
      };
    }

    const pickupStore = order.pickup_store_id
      ? stores.find(s => s.id === order.pickup_store_id) || null
      : null;

    const enrichedOrder = {
      ...order,
      pickup_store: pickupStore
    };

    const itemsRaw = orderItems.filter(oi => oi.order_id === orderId);
    const items = itemsRaw.map(oi => {
      const product = products.find(p => p.id === oi.product_id) || null;
      return {
        ...oi,
        product
      };
    });

    return {
      order: enrichedOrder,
      items
    };
  }

  // 26. getServices()
  getServices() {
    const services = this._getFromStorage('services', []);
    return services.filter(s => s.is_active);
  }

  // 27. createAppointment(...)
  createAppointment(
    serviceId,
    preferredDate,
    timeWindow,
    contactName,
    contactPhone,
    contactEmail,
    addressStreet,
    addressCity,
    addressState,
    addressZip,
    notes
  ) {
    const services = this._getFromStorage('services', []);
    const service = services.find(s => s.id === serviceId) || null;

    if (!service) {
      return {
        appointment: null,
        message: 'Service not found.'
      };
    }

    const appointments = this._getFromStorage('appointments', []);
    const now = new Date().toISOString();
    const preferred = new Date(preferredDate);

    const appointment = {
      id: this._generateId('appointment'),
      service_id: service.id,
      service_type: service.service_type,
      preferred_date: preferred.toISOString(),
      time_window: timeWindow,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      address_street: addressStreet,
      address_city: addressCity,
      address_state: addressState,
      address_zip: addressZip,
      notes: notes || '',
      status: 'requested',
      created_at: now
    };

    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    const enrichedAppointment = {
      ...appointment,
      service
    };

    return {
      appointment: enrichedAppointment,
      message: 'Appointment requested.'
    };
  }

  // 28. getInspirationRooms(style, roomType, page, pageSize)
  getInspirationRooms(style, roomType, page = 1, pageSize = 24) {
    const rooms = this._getFromStorage('inspiration_rooms', []);

    let result = rooms;
    if (style) {
      result = result.filter(r => r.style === style);
    }
    if (roomType) {
      result = result.filter(r => r.room_type === roomType);
    }

    const totalResults = result.length;
    const start = (page - 1) * pageSize;
    const paged = result.slice(start, start + pageSize);

    return {
      rooms: paged,
      page,
      pageSize,
      totalResults
    };
  }

  // 29. getInspirationRoomDetails(inspirationRoomId)
  getInspirationRoomDetails(inspirationRoomId) {
    const rooms = this._getFromStorage('inspiration_rooms', []);
    const inspirationProducts = this._getFromStorage('inspiration_products', []);
    const products = this._getFromStorage('products', []);

    const room = rooms.find(r => r.id === inspirationRoomId) || null;
    if (!room) {
      return {
        room: null,
        products: []
      };
    }

    const mappings = inspirationProducts.filter(ip => ip.inspiration_room_id === inspirationRoomId);
    const detailedProducts = mappings.map(ip => {
      const product = products.find(p => p.id === ip.product_id) || null;
      const inspirationProduct = { ...ip, product };
      return {
        inspirationProduct,
        product
      };
    });

    return {
      room,
      products: detailedProducts
    };
  }

  // 30. addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const products = this._getFromStorage('products', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const wishlist = this._getOrCreateWishlist();
    const now = new Date().toISOString();

    const product = products.find(p => p.id === productId) || null;

    const already = wishlistItems.find(
      wi => wi.wishlist_id === wishlist.id && wi.product_id === productId
    );
    if (already) {
      const addedItem = { ...already, product };
      return {
        wishlist,
        addedItem,
        message: 'Product already in wishlist.'
      };
    }

    const item = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: productId,
      product_name: product ? product.name : null,
      added_at: now
    };

    wishlistItems.push(item);
    this._saveToStorage('wishlist_items', wishlistItems);

    const wishlists = this._getFromStorage('wishlists', []);
    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx !== -1) {
      wishlists[idx].items = wishlists[idx].items || [];
      wishlists[idx].items.push(item.id);
      wishlists[idx].updated_at = now;
      this._saveToStorage('wishlists', wishlists);
    }

    const addedItem = { ...item, product };

    return {
      wishlist,
      addedItem,
      message: 'Product added to wishlist.'
    };
  }

  // 31. getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);

    const items = wishlistItems.filter(wi => wi.wishlist_id === wishlist.id);
    const itemsDetailed = items.map(wi => {
      const product = products.find(p => p.id === wi.product_id) || null;
      const wishlistItem = { ...wi, product };
      return {
        wishlistItem,
        product
      };
    });

    return {
      wishlist,
      itemsDetailed
    };
  }

  // 32. removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    const wishlists = this._getFromStorage('wishlists', []);

    const item = wishlistItems.find(wi => wi.id === wishlistItemId) || null;
    if (!item) {
      return {
        wishlist,
        success: false,
        message: 'Wishlist item not found.'
      };
    }

    wishlistItems = wishlistItems.filter(wi => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx !== -1) {
      wishlists[idx].items = (wishlists[idx].items || []).filter(id => id !== wishlistItemId);
      wishlists[idx].updated_at = new Date().toISOString();
      this._saveToStorage('wishlists', wishlists);
    }

    return {
      wishlist,
      success: true,
      message: 'Wishlist item removed.'
    };
  }

  // 33. moveWishlistItemToCart(wishlistItemId, quantity, fulfillmentMethod, pickupStoreId)
  moveWishlistItemToCart(wishlistItemId, quantity = 1, fulfillmentMethod, pickupStoreId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const item = wishlistItems.find(wi => wi.id === wishlistItemId) || null;

    if (!item) {
      return {
        success: false,
        wishlist,
        cart: this._getOrCreateCart(),
        addedCartItem: null,
        message: 'Wishlist item not found.'
      };
    }

    const res = this.addToCart(
      item.product_id,
      quantity,
      null,
      null,
      null,
      null,
      null,
      null,
      false,
      false,
      'none',
      fulfillmentMethod || 'ship_to_home',
      pickupStoreId || null
    );

    // Remove from wishlist after adding to cart
    this.removeWishlistItem(wishlistItemId);
    const updatedWishlist = this._getOrCreateWishlist();

    return {
      success: res.success,
      wishlist: updatedWishlist,
      cart: res.cart,
      addedCartItem: res.addedItem,
      message: res.message
    };
  }

  // 34. searchStores(zip, city, state, maxResults)
  searchStores(zip, city, state, maxResults = 20) {
    const stores = this._getFromStorage('stores', []);
    let result = stores;

    if (zip) {
      const z = String(zip).toLowerCase();
      result = result.filter(s => (s.address_zip || '').toLowerCase().startsWith(z));
    }
    if (city) {
      const c = String(city).toLowerCase();
      result = result.filter(s => (s.address_city || '').toLowerCase().includes(c));
    }
    if (state) {
      const st = String(state).toLowerCase();
      result = result.filter(s => (s.address_state || '').toLowerCase().includes(st));
    }

    return result.slice(0, maxResults);
  }

  // 35. setPreferredStore(storeId)
  setPreferredStore(storeId) {
    const stores = this._getFromStorage('stores', []);
    const store = stores.find(s => s.id === storeId) || null;
    if (!store) {
      return {
        preferredStore: null
      };
    }

    // Update is_preferred flags
    for (const s of stores) {
      s.is_preferred = s.id === storeId;
    }
    this._saveToStorage('stores', stores);
    localStorage.setItem('preferred_store_id', storeId);

    return {
      preferredStore: store
    };
  }

  // 36. getPreferredStore()
  getPreferredStore() {
    const store = this._getPreferredStoreFromStorage();
    return {
      store,
      isSet: !!store
    };
  }

  // 37. getStorePickupAvailability(productId, storeId)
  getStorePickupAvailability(productId, storeId) {
    const products = this._getFromStorage('products', []);
    const stores = this._getFromStorage('stores', []);
    const availabilities = this._getFromStorage('product_store_availabilities', []);

    const product = products.find(p => p.id === productId) || null;
    let store = null;

    if (storeId) {
      store = stores.find(s => s.id === storeId) || null;
    } else {
      store = this._getPreferredStoreFromStorage();
    }

    if (!product || !store) {
      return {
        store: store || null,
        availability: null
      };
    }

    const availability = availabilities.find(
      a => a.product_id === productId && a.store_id === store.id
    ) || null;

    if (!availability) {
      return {
        store,
        availability: null
      };
    }

    const enrichedAvailability = {
      ...availability,
      product,
      store
    };

    return {
      store,
      availability: enrichedAvailability
    };
  }

  // 38. getContactInfo()
  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    if (!raw) {
      return {
        customerServicePhone: null,
        supportEmail: null,
        supportHours: null,
        additionalPhones: [],
        additionalEmails: []
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        customerServicePhone: obj.customerServicePhone || null,
        supportEmail: obj.supportEmail || null,
        supportHours: obj.supportHours || null,
        additionalPhones: obj.additionalPhones || [],
        additionalEmails: obj.additionalEmails || []
      };
    } catch (e) {
      return {
        customerServicePhone: null,
        supportEmail: null,
        supportHours: null,
        additionalPhones: [],
        additionalEmails: []
      };
    }
  }

  // 39. submitContactRequest(name, email, phone, message)
  submitContactRequest(name, email, phone, message) {
    const requests = this._getFromStorage('contact_requests', []);
    const id = this._generateId('contact_request');
    const now = new Date().toISOString();

    const req = {
      id,
      name,
      email,
      phone: phone || null,
      message,
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      referenceId: id,
      message: 'Contact request submitted.'
    };
  }

  // 40. getHelpFaqs(topic)
  getHelpFaqs(topic) {
    const faqs = this._getFromStorage('help_faqs', []);
    if (!topic) return faqs;
    return faqs.filter(f => f.topic === topic);
  }

  // 41. getAboutUsContent()
  getAboutUsContent() {
    const raw = localStorage.getItem('about_us_content');
    if (!raw) {
      return {
        headline: null,
        story: null,
        experienceYears: null,
        focusAreas: [],
        reasonsToShop: []
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        headline: obj.headline || null,
        story: obj.story || null,
        experienceYears: typeof obj.experienceYears === 'number' ? obj.experienceYears : null,
        focusAreas: obj.focusAreas || [],
        reasonsToShop: obj.reasonsToShop || []
      };
    } catch (e) {
      return {
        headline: null,
        story: null,
        experienceYears: null,
        focusAreas: [],
        reasonsToShop: []
      };
    }
  }

  // 42. getFinancingPageContent()
  getFinancingPageContent() {
    const raw = localStorage.getItem('financing_page_content');
    let introText = null;
    let stepsToUseFinancing = [];

    if (raw) {
      try {
        const obj = JSON.parse(raw);
        introText = obj.introText || null;
        stepsToUseFinancing = obj.stepsToUseFinancing || [];
      } catch (e) {
        introText = null;
        stepsToUseFinancing = [];
      }
    }

    const financingPrograms = this.getActiveFinancingPrograms();

    return {
      introText,
      stepsToUseFinancing,
      financingPrograms
    };
  }

  // 43. getPoliciesContent()
  getPoliciesContent() {
    const raw = localStorage.getItem('policies_content');
    if (!raw) {
      return {
        privacyPolicyHtml: null,
        termsOfUseHtml: null,
        returnPolicySummaryHtml: null,
        customWindowTreatmentPolicyHtml: null
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        privacyPolicyHtml: obj.privacyPolicyHtml || null,
        termsOfUseHtml: obj.termsOfUseHtml || null,
        returnPolicySummaryHtml: obj.returnPolicySummaryHtml || null,
        customWindowTreatmentPolicyHtml: obj.customWindowTreatmentPolicyHtml || null
      };
    } catch (e) {
      return {
        privacyPolicyHtml: null,
        termsOfUseHtml: null,
        returnPolicySummaryHtml: null,
        customWindowTreatmentPolicyHtml: null
      };
    }
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