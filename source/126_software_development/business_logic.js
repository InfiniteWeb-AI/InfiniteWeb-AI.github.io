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

  // ---------------------- Storage & ID helpers ----------------------

  _initStorage() {
    const arrayKeys = [
      'product_categories',
      'products',
      'carts',
      'cart_items',
      'promo_codes',
      'shipping_methods',
      'software_quote_requests',
      'onsite_maintenance_bookings',
      'time_slots',
      'it_support_plans',
      'it_support_signups',
      'hardware_models',
      'knowledge_base_articles',
      'knowledge_base_folders',
      'saved_articles',
      'training_events',
      'event_registrations',
      'server_base_models',
      'server_memory_options',
      'server_storage_options',
      'server_optional_components',
      'maintenance_plans',
      'server_configurations',
      'quote_carts',
      'quote_cart_items',
      'server_quote_requests',
      'orders',
      'contact_inquiries',
      'static_pages'
    ];

    for (let key of arrayKeys) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, '[]');
      }
    }

    // Single-object storage for company info
    if (localStorage.getItem('company_info') === null) {
      localStorage.setItem('company_info', JSON.stringify({}));
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
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

  _getObjectFromStorage(key, defaultValue = {}) {
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatCurrency(amount, currency = 'usd') {
    if (amount === null || amount === undefined) amount = 0;
    const upper = (currency || 'usd').toUpperCase();
    let symbol = '$';
    if (upper === 'EUR') symbol = '€';
    else if (upper === 'GBP') symbol = '£';
    return symbol + Number(amount).toFixed(2);
  }

  // ---------------------- Cart helpers ----------------------

  _getCurrentCart() {
    const carts = this._getFromStorage('carts');
    const currentId = localStorage.getItem('current_cart_id');
    if (!currentId) return null;
    const cart = carts.find(c => c.id === currentId && c.status === 'open');
    return cart || null;
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = this._getCurrentCart();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        promoCodeId: null,
        shippingMethodId: null,
        subtotal: 0,
        discountTotal: 0,
        shippingTotal: 0,
        total: 0,
        status: 'open',
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }
    return cart;
  }

  _getCartItems(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    return cartItems.filter(ci => ci.cartId === cartId);
  }

  _saveCartItems(cartItems) {
    this._saveToStorage('cart_items', cartItems);
  }

  _validateAndResolvePromoCode(code, cart) {
    const result = { success: false, promoCode: null, message: '' };
    if (!code) {
      result.message = 'Promo code is required.';
      return result;
    }

    const promoCodes = this._getFromStorage('promo_codes');
    const promo = promoCodes.find(p => p.code && p.code.toLowerCase() === String(code).toLowerCase());
    if (!promo) {
      result.message = 'Promo code not found.';
      return result;
    }
    if (!promo.isActive) {
      result.message = 'Promo code is inactive.';
      return result;
    }

    const now = new Date();
    if (promo.validFrom) {
      const from = this._parseDate(promo.validFrom);
      if (from && now < from) {
        result.message = 'Promo code is not yet valid.';
        return result;
      }
    }
    if (promo.validTo) {
      const to = this._parseDate(promo.validTo);
      if (to && now > to) {
        result.message = 'Promo code has expired.';
        return result;
      }
    }

    // Ensure cart totals are up to date so minOrderAmount is meaningful
    if (cart) {
      this._recalculateCartTotals(cart);
      if (promo.minOrderAmount && cart.subtotal < promo.minOrderAmount) {
        result.message = 'Cart subtotal does not meet the minimum order amount for this promo.';
        return result;
      }
    }

    result.success = true;
    result.promoCode = promo;
    return result;
  }

  _recalculateCartTotals(cart) {
    if (!cart) return { subtotal: 0, discountTotal: 0, shippingTotal: 0, total: 0 };

    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const shippingMethods = this._getFromStorage('shipping_methods');
    const promoCodes = this._getFromStorage('promo_codes');

    const items = cartItems.filter(ci => ci.cartId === cart.id);

    let subtotal = 0;
    let discountTotal = 0;

    let promo = null;
    if (cart.promoCodeId) {
      promo = promoCodes.find(p => p.id === cart.promoCodeId) || null;
    }

    // Pre-calc for fixed_amount promos
    let eligibleItemsForFixed = [];
    let fixedAmountRemaining = 0;
    if (promo && promo.discountType === 'fixed_amount') {
      const eligibleLines = [];
      for (let item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;
        if (this._isProductEligibleForPromo(product, promo)) {
          eligibleLines.push({ item, product });
        }
      }
      eligibleItemsForFixed = eligibleLines;
      fixedAmountRemaining = promo.discountValue || 0;
    }

    for (let item of items) {
      const product = products.find(p => p.id === item.productId);
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice != null ? item.unitPrice : (product ? product.price || 0 : 0);
      const lineSubtotal = unitPrice * quantity;
      let lineDiscount = 0;

      if (promo && lineSubtotal > 0) {
        if (promo.discountType === 'percentage') {
          if (product && this._isProductEligibleForPromo(product, promo)) {
            lineDiscount = lineSubtotal * (promo.discountValue || 0) / 100;
          }
        } else if (promo.discountType === 'fixed_amount') {
          if (fixedAmountRemaining > 0 && eligibleItemsForFixed.some(e => e.item.id === item.id)) {
            lineDiscount = Math.min(lineSubtotal, fixedAmountRemaining);
            fixedAmountRemaining -= lineDiscount;
          }
        }
      }

      const lineTotal = Math.max(0, lineSubtotal - lineDiscount);

      item.unitPrice = unitPrice;
      item.lineSubtotal = lineSubtotal;
      item.lineDiscount = lineDiscount;
      item.lineTotal = lineTotal;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
    }

    // Shipping total
    let shippingTotal = 0;
    let selectedShippingMethod = null;

    if (cart.shippingMethodId) {
      selectedShippingMethod = shippingMethods.find(sm => sm.id === cart.shippingMethodId) || null;
    }

    if (!selectedShippingMethod && shippingMethods.length > 0) {
      selectedShippingMethod = shippingMethods.find(sm => sm.isDefault) || shippingMethods[0];
      cart.shippingMethodId = selectedShippingMethod.id;
    }

    if (selectedShippingMethod) {
      shippingTotal = selectedShippingMethod.isFree ? 0 : (selectedShippingMethod.cost || 0);
    }

    const total = Math.max(0, subtotal - discountTotal + shippingTotal);

    cart.subtotal = subtotal;
    cart.discountTotal = discountTotal;
    cart.shippingTotal = shippingTotal;
    cart.total = total;
    cart.updatedAt = this._nowIso();

    // Persist cart & cart items
    const updatedCarts = carts.map(c => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', updatedCarts);
    this._saveToStorage('cart_items', cartItems);

    return { subtotal, discountTotal, shippingTotal, total };
  }

  _isProductEligibleForPromo(product, promo) {
    if (!promo || !product) return false;
    if (!promo.appliesToType || promo.appliesToType === 'all_products') return true;
    if (promo.appliesToType === 'category') {
      return !!promo.appliesToCategorySlug && product.categorySlug === promo.appliesToCategorySlug;
    }
    if (promo.appliesToType === 'product') {
      return Array.isArray(promo.appliesToProductIds) && promo.appliesToProductIds.includes(product.id);
    }
    return false;
  }

  // ---------------------- Quote cart helpers ----------------------

  _getCurrentQuoteCart() {
    const quoteCarts = this._getFromStorage('quote_carts');
    const currentId = localStorage.getItem('current_quote_cart_id');
    if (!currentId) return null;
    const cart = quoteCarts.find(c => c.id === currentId);
    return cart || null;
  }

  _getOrCreateQuoteCart() {
    let quoteCarts = this._getFromStorage('quote_carts');
    let cart = this._getCurrentQuoteCart();
    if (!cart) {
      cart = {
        id: this._generateId('quotecart'),
        items: [],
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      quoteCarts.push(cart);
      this._saveToStorage('quote_carts', quoteCarts);
      localStorage.setItem('current_quote_cart_id', cart.id);
    }
    return cart;
  }

  // ---------------------- Global header / home ----------------------

  getHomeSummary() {
    const productCategories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');

    // Featured categories: all categories as-is
    const featuredCategories = productCategories.map(cat => ({
      category: cat,
      slug: cat.slug,
      name: cat.name,
      description: cat.description || ''
    }));

    // Featured products: top rated few
    const productsWithRating = products.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const topProducts = productsWithRating.slice(0, 8);
    const featuredProducts = topProducts.map(p => {
      const cat = productCategories.find(c => c.slug === p.categorySlug) || null;
      return {
        product: p,
        categoryName: cat ? cat.name : '',
        priceFormatted: this._formatCurrency(p.price, p.currency),
        ratingLabel: (p.rating != null ? p.rating.toFixed(1) : '0.0') + ' / 5'
      };
    });

    // Featured services - static descriptors (UI content, not persisted data)
    const featuredServices = [
      {
        key: 'software_development',
        title: 'Software Development',
        description: 'Custom applications, CRM integration, and data platforms.',
        primaryPage: 'software_development_services'
      },
      {
        key: 'hardware_services',
        title: 'Hardware Services',
        description: 'On-site workstation and server maintenance for your offices.',
        primaryPage: 'hardware_services'
      },
      {
        key: 'managed_it_support',
        title: 'Managed IT Support',
        description: 'Proactive monitoring, 24/7 helpdesk, and on-site visits.',
        primaryPage: 'managed_it_support'
      }
    ];

    const headerStatus = this.getGlobalHeaderStatus();

    return {
      featuredCategories,
      featuredProducts,
      featuredServices,
      headerStatus
    };
  }

  getGlobalHeaderStatus() {
    const cart = this._getCurrentCart();
    const cartItems = this._getFromStorage('cart_items');
    const quoteCart = this._getCurrentQuoteCart();
    const quoteCartItems = this._getFromStorage('quote_cart_items');

    let cartItemCount = 0;
    let cartTotal = 0;

    if (cart) {
      const items = cartItems.filter(ci => ci.cartId === cart.id);
      cartItemCount = items.reduce((sum, ci) => sum + (ci.quantity || 0), 0);
      if (cart.total == null) {
        const totals = this._recalculateCartTotals(cart);
        cartTotal = totals.total;
      } else {
        cartTotal = cart.total;
      }
    }

    let quoteCartItemCount = 0;
    if (quoteCart) {
      const items = quoteCartItems.filter(qi => qi.quoteCartId === quoteCart.id);
      quoteCartItemCount = items.reduce((sum, qi) => sum + (qi.quantity || 0), 0);
    }

    return {
      cartItemCount,
      cartTotal,
      cartTotalFormatted: this._formatCurrency(cartTotal, 'usd'),
      quoteCartItemCount
    };
  }

  // ---------------------- Product category & filters ----------------------

  getProductCategories() {
    return this._getFromStorage('product_categories');
  }

  getProductFilterOptions(categorySlug) {
    const products = this._getFromStorage('products').filter(p => p.categorySlug === categorySlug);

    const usageTypeSet = new Set();
    const ramSet = new Set();
    const storageCapSet = new Set();
    const storageTypeSet = new Set();
    const ratingSet = new Set();

    for (let p of products) {
      if (p.usageType) usageTypeSet.add(p.usageType);
      if (p.ramGB != null) ramSet.add(p.ramGB);
      if (p.storageCapacityGB != null) storageCapSet.add(p.storageCapacityGB);
      if (p.storageType) storageTypeSet.add(p.storageType);
      if (p.rating != null) ratingSet.add(p.rating);
    }

    const usageTypes = Array.from(usageTypeSet).map(v => ({
      value: v,
      label: v.charAt(0).toUpperCase() + v.slice(1).replace('_', ' ')
    }));

    const ramOptionsGB = Array.from(ramSet).sort((a, b) => a - b);
    const storageCapacityOptionsGB = Array.from(storageCapSet).sort((a, b) => a - b);

    const storageTypes = Array.from(storageTypeSet).map(v => ({
      value: v,
      label: v.toUpperCase()
    }));

    const screenSizeRangesInches = [
      { min: 0, max: 13.9, label: 'Up to 13.9"' },
      { min: 14, max: 15.6, label: '14" - 15.6"' },
      { min: 15.7, max: 17.3, label: '15.7" - 17.3"' },
      { min: 17.4, max: 100, label: '17.4" and above' }
    ];

    const priceRanges = [
      { min: 0, max: 500, label: 'Up to $500' },
      { min: 500, max: 1000, label: '$500 - $1,000' },
      { min: 1000, max: 1500, label: '$1,000 - $1,500' },
      { min: 1500, max: 3000, label: '$1,500 - $3,000' },
      { min: 3000, max: 10000, label: '$3,000+' }
    ];

    const ratingThresholds = [3, 4, 4.5];

    const shippingOptions = [
      { key: 'free_shipping_only', label: 'Free Shipping Only' }
    ];

    let accessorySubcategories = [];
    if (categorySlug === 'accessories') {
      accessorySubcategories = [
        { id: 'keyboards', label: 'Keyboards' },
        { id: 'mice', label: 'Mice' },
        { id: 'cables', label: 'Cables' }
      ];
    }

    return {
      usageTypes,
      ramOptionsGB,
      storageCapacityOptionsGB,
      storageTypes,
      screenSizeRangesInches,
      priceRanges,
      ratingThresholds,
      shippingOptions,
      accessorySubcategories
    };
  }

  // ---------------------- Product search & details ----------------------

  searchProducts(categorySlug, query, filters, sort, page = 1, pageSize = 20) {
    const productCategories = this._getFromStorage('product_categories');
    const allProducts = this._getFromStorage('products');

    let items = allProducts.filter(p => p.categorySlug === categorySlug);

    if (query) {
      const q = String(query).toLowerCase();
      items = items.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (filters) {
      if (filters.usageType) {
        items = items.filter(p => p.usageType === filters.usageType);
      }
      if (filters.minRamGB != null) {
        items = items.filter(p => p.ramGB == null || p.ramGB >= filters.minRamGB);
      }
      if (filters.maxRamGB != null) {
        items = items.filter(p => p.ramGB == null || p.ramGB <= filters.maxRamGB);
      }
      if (filters.minStorageGB != null) {
        items = items.filter(p => p.storageCapacityGB == null || p.storageCapacityGB >= filters.minStorageGB);
      }
      if (filters.storageType) {
        items = items.filter(p => p.storageType === filters.storageType);
      }
      if (filters.minScreenSizeInches != null) {
        items = items.filter(p => p.screenSizeInches == null || p.screenSizeInches >= filters.minScreenSizeInches);
      }
      if (filters.maxScreenSizeInches != null) {
        items = items.filter(p => p.screenSizeInches == null || p.screenSizeInches <= filters.maxScreenSizeInches);
      }
      if (filters.minPrice != null) {
        items = items.filter(p => p.price == null || p.price >= filters.minPrice);
      }
      if (filters.maxPrice != null) {
        items = items.filter(p => p.price == null || p.price <= filters.maxPrice);
      }
      if (filters.minRating != null) {
        items = items.filter(p => p.rating == null || p.rating >= filters.minRating);
      }
      if (filters.freeShippingOnly) {
        items = items.filter(p => !!p.freeShipping);
      }
      if (filters.accessorySubcategoryId && categorySlug === 'accessories') {
        const id = filters.accessorySubcategoryId;
        items = items.filter(p => {
          const tags = Array.isArray(p.tags) ? p.tags.map(t => String(t).toLowerCase()) : [];
          if (id === 'keyboards') return tags.includes('keyboard') || tags.includes('keyboards');
          if (id === 'mice') return tags.includes('mouse') || tags.includes('mice');
          if (id === 'cables') return tags.includes('cable') || tags.includes('cables');
          return true;
        });
      }
    }

    if (sort === 'price_asc') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_desc') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rating_desc') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'newest') {
      items.sort((a, b) => {
        const da = this._parseDate(a.createdAt) || 0;
        const db = this._parseDate(b.createdAt) || 0;
        return db - da;
      });
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    const mapped = pageItems.map(p => {
      const cat = productCategories.find(c => c.slug === p.categorySlug) || null;
      return {
        product: p,
        categoryName: cat ? cat.name : '',
        priceFormatted: this._formatCurrency(p.price, p.currency),
        ratingLabel: (p.rating != null ? p.rating.toFixed(1) : '0.0') + ' / 5',
        isConfigurableServer: !!p.isServerConfigurable
      };
    });

    return {
      total,
      page,
      pageSize,
      items: mapped
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const productCategories = this._getFromStorage('product_categories');
    const shippingMethods = this._getFromStorage('shipping_methods');

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        categoryName: '',
        specSummary: {
          usageTypeLabel: '',
          ramGB: null,
          storageCapacityGB: null,
          storageTypeLabel: '',
          screenSizeInches: null
        },
        shippingInfo: {
          freeShipping: false,
          shippingCost: 0,
          shippingCostFormatted: this._formatCurrency(0, 'usd')
        },
        relatedProducts: []
      };
    }

    const category = productCategories.find(c => c.slug === product.categorySlug) || null;
    const usageTypeLabel = product.usageType
      ? product.usageType.charAt(0).toUpperCase() + product.usageType.slice(1).replace('_', ' ')
      : '';

    // Resolve possible shipping method references (if any)
    let shippingCost = product.shippingCost != null ? product.shippingCost : 0;
    if (Array.isArray(product.shippingMethodIds) && product.shippingMethodIds.length > 0) {
      const sm = shippingMethods.find(m => m.id === product.shippingMethodIds[0]);
      if (sm && !sm.isFree) {
        shippingCost = sm.cost || shippingCost;
      }
    }

    const shippingInfo = {
      freeShipping: !!product.freeShipping,
      shippingCost,
      shippingCostFormatted: this._formatCurrency(shippingCost, 'usd')
    };

    const sameCategoryProducts = products.filter(p => p.categorySlug === product.categorySlug && p.id !== product.id);
    const relatedProducts = sameCategoryProducts.slice(0, 4);

    return {
      product,
      categoryName: category ? category.name : '',
      specSummary: {
        usageTypeLabel,
        ramGB: product.ramGB != null ? product.ramGB : null,
        storageCapacityGB: product.storageCapacityGB != null ? product.storageCapacityGB : null,
        storageTypeLabel: product.storageType || '',
        screenSizeInches: product.screenSizeInches != null ? product.screenSizeInches : null
      },
      shippingInfo,
      relatedProducts
    };
  }

  // ---------------------- Cart operations ----------------------

  addToCart(productId, quantity = 1) {
    const products = this._getFromStorage('products');
    const cartItems = this._getFromStorage('cart_items');
    const product = products.find(p => p.id === productId);

    if (!product) {
      return {
        success: false,
        message: 'Product not found.',
        cart: null,
        cartItem: null,
        cartItemCount: 0,
        cartSubtotal: 0,
        cartSubtotalFormatted: this._formatCurrency(0, 'usd')
      };
    }

    const cart = this._getOrCreateCart();

    let cartItem = cartItems.find(ci => ci.cartId === cart.id && ci.productId === productId);
    const nowIso = this._nowIso();

    if (cartItem) {
      cartItem.quantity = (cartItem.quantity || 0) + quantity;
      cartItem.addedAt = cartItem.addedAt || nowIso;
    } else {
      cartItem = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        productId: productId,
        quantity: quantity,
        unitPrice: product.price || 0,
        lineSubtotal: null,
        lineDiscount: 0,
        lineTotal: null,
        addedAt: nowIso
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);

    const totals = this._recalculateCartTotals(cart);

    const allCartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    const cartItemCount = allCartItems.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      success: true,
      message: 'Product added to cart.',
      cart,
      cartItem,
      cartItemCount,
      cartSubtotal: totals.subtotal,
      cartSubtotalFormatted: this._formatCurrency(totals.subtotal, 'usd')
    };
  }

  getCartSummary() {
    const cart = this._getCurrentCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const shippingMethods = this._getFromStorage('shipping_methods');
    const promoCodes = this._getFromStorage('promo_codes');

    if (!cart) {
      return {
        cart: null,
        items: [],
        appliedPromoCode: null,
        availableShippingMethods: shippingMethods,
        selectedShippingMethodId: null,
        totals: {
          subtotal: 0,
          discountTotal: 0,
          shippingTotal: 0,
          total: 0,
          subtotalFormatted: this._formatCurrency(0, 'usd'),
          discountTotalFormatted: this._formatCurrency(0, 'usd'),
          shippingTotalFormatted: this._formatCurrency(0, 'usd'),
          totalFormatted: this._formatCurrency(0, 'usd')
        }
      };
    }

    const itemsRaw = cartItems.filter(ci => ci.cartId === cart.id);

    // Ensure totals updated
    const totalsCalc = this._recalculateCartTotals(cart);

    const items = itemsRaw.map(ci => {
      const product = products.find(p => p.id === ci.productId) || null;
      const lineSubtotal = ci.lineSubtotal != null ? ci.lineSubtotal : (ci.unitPrice || 0) * (ci.quantity || 0);
      const lineTotal = ci.lineTotal != null ? ci.lineTotal : lineSubtotal;
      return {
        cartItem: ci,
        product,
        lineSubtotal,
        lineSubtotalFormatted: this._formatCurrency(lineSubtotal, product ? product.currency : 'usd'),
        lineTotal,
        lineTotalFormatted: this._formatCurrency(lineTotal, product ? product.currency : 'usd')
      };
    });

    const appliedPromoCode = cart.promoCodeId ? (promoCodes.find(p => p.id === cart.promoCodeId) || null) : null;
    const selectedShippingMethod = cart.shippingMethodId ? (shippingMethods.find(sm => sm.id === cart.shippingMethodId) || null) : null;

    const totals = {
      subtotal: totalsCalc.subtotal,
      discountTotal: totalsCalc.discountTotal,
      shippingTotal: totalsCalc.shippingTotal,
      total: totalsCalc.total,
      subtotalFormatted: this._formatCurrency(totalsCalc.subtotal, 'usd'),
      discountTotalFormatted: this._formatCurrency(totalsCalc.discountTotal, 'usd'),
      shippingTotalFormatted: this._formatCurrency(totalsCalc.shippingTotal, 'usd'),
      totalFormatted: this._formatCurrency(totalsCalc.total, 'usd')
    };

    // Resolve foreign keys on cart
    const cartWithRefs = Object.assign({}, cart, {
      promoCode: appliedPromoCode,
      shippingMethod: selectedShippingMethod
    });

    return {
      cart: cartWithRefs,
      items,
      appliedPromoCode,
      availableShippingMethods: shippingMethods,
      selectedShippingMethodId: cart.shippingMethodId || (selectedShippingMethod ? selectedShippingMethod.id : null),
      totals
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');

    const cartItem = cartItems.find(ci => ci.id === cartItemId);
    if (!cartItem) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null
      };
    }

    if (quantity <= 0) {
      // remove item
      const filtered = cartItems.filter(ci => ci.id !== cartItemId);
      this._saveToStorage('cart_items', filtered);
      const cart = carts.find(c => c.id === cartItem.cartId) || null;
      if (cart) this._recalculateCartTotals(cart);
      return {
        success: true,
        message: 'Cart item removed.',
        cart
      };
    }

    cartItem.quantity = quantity;
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === cartItem.cartId) || null;
    if (cart) this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item updated.',
      cart
    };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');

    const cartItem = cartItems.find(ci => ci.id === cartItemId);
    if (!cartItem) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null
      };
    }

    const newCartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', newCartItems);

    const cart = carts.find(c => c.id === cartItem.cartId) || null;
    if (cart) this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item removed.',
      cart
    };
  }

  applyPromoCodeToCart(code) {
    const cart = this._getOrCreateCart();
    const validation = this._validateAndResolvePromoCode(code, cart);

    if (!validation.success) {
      // Still recalc totals to return fresh cart state
      const totalsCalc = this._recalculateCartTotals(cart);
      return {
        success: false,
        message: validation.message,
        promoCode: null,
        cart,
        totals: {
          subtotal: totalsCalc.subtotal,
          discountTotal: totalsCalc.discountTotal,
          shippingTotal: totalsCalc.shippingTotal,
          total: totalsCalc.total,
          totalFormatted: this._formatCurrency(totalsCalc.total, 'usd')
        }
      };
    }

    const promo = validation.promoCode;
    cart.promoCodeId = promo.id;
    const totalsCalc = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Promo code applied.',
      promoCode: promo,
      cart,
      totals: {
        subtotal: totalsCalc.subtotal,
        discountTotal: totalsCalc.discountTotal,
        shippingTotal: totalsCalc.shippingTotal,
        total: totalsCalc.total,
        totalFormatted: this._formatCurrency(totalsCalc.total, 'usd')
      }
    };
  }

  setCartShippingMethod(shippingMethodId) {
    const cart = this._getOrCreateCart();
    const shippingMethods = this._getFromStorage('shipping_methods');
    const method = shippingMethods.find(sm => sm.id === shippingMethodId) || null;

    if (!method) {
      const totalsCalc = this._recalculateCartTotals(cart);
      return {
        success: false,
        message: 'Shipping method not found.',
        cart,
        selectedShippingMethod: null,
        totals: {
          shippingTotal: totalsCalc.shippingTotal,
          shippingTotalFormatted: this._formatCurrency(totalsCalc.shippingTotal, 'usd'),
          total: totalsCalc.total,
          totalFormatted: this._formatCurrency(totalsCalc.total, 'usd')
        }
      };
    }

    cart.shippingMethodId = shippingMethodId;
    const totalsCalc = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Shipping method updated.',
      cart,
      selectedShippingMethod: method,
      totals: {
        shippingTotal: totalsCalc.shippingTotal,
        shippingTotalFormatted: this._formatCurrency(totalsCalc.shippingTotal, 'usd'),
        total: totalsCalc.total,
        totalFormatted: this._formatCurrency(totalsCalc.total, 'usd')
      }
    };
  }

  getCheckoutSummary() {
    const cartSummary = this.getCartSummary();
    const cart = cartSummary.cart;

    if (!cart) {
      return {
        cart: null,
        items: [],
        appliedPromoCode: null,
        selectedShippingMethod: null,
        totals: cartSummary.totals
      };
    }

    const items = cartSummary.items.map(i => ({
      cartItem: i.cartItem,
      product: i.product
    }));

    const shippingMethods = this._getFromStorage('shipping_methods');
    const selectedShippingMethod = cart.shippingMethodId
      ? (shippingMethods.find(sm => sm.id === cart.shippingMethodId) || null)
      : null;

    return {
      cart,
      items,
      appliedPromoCode: cartSummary.appliedPromoCode,
      selectedShippingMethod,
      totals: cartSummary.totals
    };
  }

  submitCheckoutOrder(orderDetails) {
    const cart = this._getCurrentCart();
    if (!cart) {
      return {
        success: false,
        orderId: null,
        message: 'No active cart to submit.',
        orderTotal: 0,
        orderTotalFormatted: this._formatCurrency(0, 'usd')
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    if (cartItems.length === 0) {
      return {
        success: false,
        orderId: null,
        message: 'Cart is empty.',
        orderTotal: 0,
        orderTotalFormatted: this._formatCurrency(0, 'usd')
      };
    }

    const totalsCalc = this._recalculateCartTotals(cart);

    const orders = this._getFromStorage('orders');
    const orderId = this._generateId('order');

    const order = {
      id: orderId,
      cartId: cart.id,
      orderDetails: orderDetails || {},
      subtotal: totalsCalc.subtotal,
      discountTotal: totalsCalc.discountTotal,
      shippingTotal: totalsCalc.shippingTotal,
      total: totalsCalc.total,
      status: 'submitted',
      createdAt: this._nowIso()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    // Mark cart as checked out
    const carts = this._getFromStorage('carts');
    const updatedCarts = carts.map(c => (c.id === cart.id ? Object.assign({}, c, { status: 'checked_out', updatedAt: this._nowIso() }) : c));
    this._saveToStorage('carts', updatedCarts);
    localStorage.removeItem('current_cart_id');

    return {
      success: true,
      orderId,
      message: 'Order submitted successfully.',
      orderTotal: totalsCalc.total,
      orderTotalFormatted: this._formatCurrency(totalsCalc.total, 'usd')
    };
  }

  // ---------------------- Software Development / CRM ----------------------

  getSoftwareDevelopmentOverview() {
    const serviceCards = [
      {
        serviceCategory: 'crm_integration',
        title: 'CRM Integration',
        description: 'Connect your CRM with billing, ERP, and line-of-business systems.',
        hasQuoteAction: true
      },
      {
        serviceCategory: 'software_development',
        title: 'Custom Applications',
        description: 'Tailored web and mobile apps to streamline your workflows.',
        hasQuoteAction: true
      },
      {
        serviceCategory: 'data_migration',
        title: 'Data Migration',
        description: 'Move critical data between platforms with minimal downtime.',
        hasQuoteAction: false
      }
    ];

    return {
      introText: 'We design, build, and maintain business-critical software platforms, including CRM and billing integrations.',
      serviceCards
    };
  }

  getCRMIntegrationDetails() {
    return {
      headline: 'Custom CRM Integration Services',
      description: 'Integrate your CRM with billing, ERP, support, and data platforms to create a single source of truth.',
      keyBenefits: [
        'Streamline lead-to-cash processes',
        'Reduce manual data entry and errors',
        'Improve reporting and analytics with unified data',
        'Ensure secure and reliable data synchronization'
      ],
      ctaLabel: 'Request a CRM Integration Quote'
    };
  }

  getCRMQuoteFormOptions() {
    const projectTypes = [
      { value: 'custom_crm_integration', label: 'Custom CRM Integration' },
      { value: 'crm_customization', label: 'CRM Customization' },
      { value: 'api_integration', label: 'API Integration' },
      { value: 'data_migration', label: 'Data Migration' },
      { value: 'other', label: 'Other / Not Sure' }
    ];

    const budgetRanges = [
      { label: '$5,000–$10,000', min: 5000, max: 10000 },
      { label: '$10,000–$15,000', min: 10000, max: 15000 },
      { label: '$15,000–$25,000', min: 15000, max: 25000 },
      { label: '$25,000–$50,000', min: 25000, max: 50000 },
      { label: '$50,000+', min: 50000, max: 999999999 }
    ];

    const preferredContactMethods = [
      { value: 'phone', label: 'Phone' },
      { value: 'email', label: 'Email' },
      { value: 'either', label: 'Either' }
    ];

    return {
      projectTypes,
      budgetRanges,
      preferredContactMethods
    };
  }

  submitSoftwareQuoteRequest(request) {
    const softwareRequests = this._getFromStorage('software_quote_requests');

    const sr = {
      id: this._generateId('softreq'),
      serviceCategory: request && request.serviceCategory ? request.serviceCategory : 'crm_integration',
      projectType: request && request.projectType ? request.projectType : 'custom_crm_integration',
      fullName: request && request.fullName ? request.fullName : '',
      email: request && request.email ? request.email : '',
      estimatedBudgetLabel: request && request.estimatedBudgetLabel ? request.estimatedBudgetLabel : '',
      estimatedBudgetMin: request && request.estimatedBudgetMin != null ? request.estimatedBudgetMin : 0,
      estimatedBudgetMax: request && request.estimatedBudgetMax != null ? request.estimatedBudgetMax : 0,
      desiredStartDate: request && request.desiredStartDate ? request.desiredStartDate : this._nowIso(),
      preferredContactMethod: request && request.preferredContactMethod ? request.preferredContactMethod : 'either',
      phone: request && request.phone ? request.phone : '',
      projectDescription: request && request.projectDescription ? request.projectDescription : '',
      status: 'submitted',
      createdAt: this._nowIso()
    };

    softwareRequests.push(sr);
    this._saveToStorage('software_quote_requests', softwareRequests);

    return {
      success: true,
      message: 'Software quote request submitted.',
      quoteRequest: sr
    };
  }

  // ---------------------- Hardware Services / Onsite Maintenance ----------------------

  getHardwareServicesOverview() {
    const serviceTypes = [
      {
        serviceType: 'workstation_maintenance',
        title: 'Workstation Maintenance',
        description: 'Proactive health checks and troubleshooting for office PCs and laptops.',
        hasScheduleAction: true
      },
      {
        serviceType: 'server_maintenance',
        title: 'Server Maintenance',
        description: 'On-site diagnostics, patching, and performance tuning for servers.',
        hasScheduleAction: true
      },
      {
        serviceType: 'network_support',
        title: 'Network Support',
        description: 'Troubleshooting switches, routers, and Wi-Fi infrastructure.',
        hasScheduleAction: false
      }
    ];

    return {
      introText: 'Keep your hardware running reliably with scheduled on-site maintenance and break-fix services.',
      serviceTypes
    };
  }

  getMaintenanceBookingFormOptions() {
    const timeSlots = this._getFromStorage('time_slots');

    const serviceTypeOptions = [
      { value: 'workstation_maintenance', label: 'Workstation Maintenance' },
      { value: 'server_maintenance', label: 'Server Maintenance' },
      { value: 'network_support', label: 'Network Support' },
      { value: 'onsite_support_other', label: 'Other On-site Support' }
    ];

    return {
      serviceTypeOptions,
      timeSlots,
      defaultCountry: 'united_states'
    };
  }

  submitOnsiteMaintenanceBooking(booking) {
    const bookings = this._getFromStorage('onsite_maintenance_bookings');

    const record = {
      id: this._generateId('onsite'),
      serviceType: booking && booking.serviceType ? booking.serviceType : 'workstation_maintenance',
      numDevices: booking && booking.numDevices != null ? booking.numDevices : 0,
      preferredDate: booking && booking.preferredDate ? booking.preferredDate : this._nowIso(),
      timeSlotId: booking && booking.timeSlotId ? booking.timeSlotId : '',
      officeAddressLine1: booking && booking.officeAddressLine1 ? booking.officeAddressLine1 : '',
      officeAddressLine2: booking && booking.officeAddressLine2 ? booking.officeAddressLine2 : '',
      city: booking && booking.city ? booking.city : '',
      state: booking && booking.state ? booking.state : '',
      postalCode: booking && booking.postalCode ? booking.postalCode : '',
      country: booking && booking.country ? booking.country : 'united_states',
      contactName: booking && booking.contactName ? booking.contactName : '',
      contactEmail: booking && booking.contactEmail ? booking.contactEmail : '',
      status: 'submitted',
      createdAt: this._nowIso()
    };

    bookings.push(record);
    this._saveToStorage('onsite_maintenance_bookings', bookings);

    return {
      success: true,
      message: 'On-site maintenance booking submitted.',
      booking: record
    };
  }

  // ---------------------- Managed IT Support Plans ----------------------

  getITSupportPlans() {
    const plans = this._getFromStorage('it_support_plans');
    const activePlans = plans.filter(p => p.status === 'active');

    return activePlans.map(plan => ({
      plan,
      monthlyPriceFormatted: this._formatCurrency(plan.monthlyPrice || 0, 'usd'),
      has24x7Support: !!plan.has24x7Support,
      includesOnSiteVisits: !!plan.includesOnSiteVisits
    }));
  }

  getITSupportPlanDetails(planId) {
    const plans = this._getFromStorage('it_support_plans');
    const plan = plans.find(p => p.id === planId) || null;

    return {
      plan,
      featureDetails: plan && Array.isArray(plan.features) ? plan.features : []
    };
  }

  getITSupportSignupFormOptions() {
    const companySizeOptions = [
      { range: '1_10', label: '1–10 employees' },
      { range: '11_24', label: '11–24 employees' },
      { range: '25_50', label: '25–50 employees' },
      { range: '51_100', label: '51–100 employees' },
      { range: '101_250', label: '101–250 employees' },
      { range: '251_plus', label: '251+ employees' }
    ];

    const countryOptions = [
      { value: 'united_states', label: 'United States' },
      { value: 'canada', label: 'Canada' },
      { value: 'united_kingdom', label: 'United Kingdom' },
      { value: 'australia', label: 'Australia' },
      { value: 'other', label: 'Other' }
    ];

    return {
      companySizeOptions,
      countryOptions
    };
  }

  submitITSupportSignup(signup) {
    const signups = this._getFromStorage('it_support_signups');

    const record = {
      id: this._generateId('itsignup'),
      planId: signup && signup.planId ? signup.planId : '',
      companyName: signup && signup.companyName ? signup.companyName : '',
      companySizeLabel: signup && signup.companySizeLabel ? signup.companySizeLabel : '',
      companySizeRange: signup && signup.companySizeRange ? signup.companySizeRange : '25_50',
      contactName: signup && signup.contactName ? signup.contactName : '',
      businessEmail: signup && signup.businessEmail ? signup.businessEmail : '',
      businessPhone: signup && signup.businessPhone ? signup.businessPhone : '',
      country: signup && signup.country ? signup.country : 'united_states',
      status: 'started',
      createdAt: this._nowIso()
    };

    signups.push(record);
    this._saveToStorage('it_support_signups', signups);

    return {
      success: true,
      message: 'Managed IT support sign-up started.',
      signup: record
    };
  }

  // ---------------------- Knowledge Base & Saved Articles ----------------------

  getKnowledgeBaseSearchOptions() {
    const hardwareModels = this._getFromStorage('hardware_models');
    const articles = this._getFromStorage('knowledge_base_articles');

    const categories = Array.from(new Set(articles.map(a => a.category).filter(Boolean)));

    return {
      hardwareModels,
      categories
    };
  }

  searchKnowledgeBaseArticles(query, modelId, category, page = 1, pageSize = 20) {
    const articles = this._getFromStorage('knowledge_base_articles').filter(a => a.isPublished);
    const hardwareModels = this._getFromStorage('hardware_models');

    let filtered = articles;

    if (query) {
      const q = String(query).toLowerCase();
      filtered = filtered.filter(a => {
        const title = (a.title || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        const keywords = Array.isArray(a.keywords) ? a.keywords.join(' ').toLowerCase() : '';
        return title.includes(q) || content.includes(q) || keywords.includes(q);
      });
    }

    if (modelId) {
      filtered = filtered.filter(a => a.modelId === modelId);
    }

    if (category) {
      filtered = filtered.filter(a => a.category === category);
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    const items = pageItems.map(a => {
      const model = hardwareModels.find(m => m.id === a.modelId) || null;
      const articleExtended = Object.assign({}, a, { model });
      return {
        article: articleExtended,
        modelName: model ? model.name : (a.modelName || '')
      };
    });

    return {
      total,
      page,
      pageSize,
      items
    };
  }

  getKnowledgeBaseArticle(articleId) {
    const articles = this._getFromStorage('knowledge_base_articles');
    const hardwareModels = this._getFromStorage('hardware_models');

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        relatedArticles: []
      };
    }

    const model = hardwareModels.find(m => m.id === article.modelId) || null;
    const articleExtended = Object.assign({}, article, { model });

    let relatedArticles = [];
    if (Array.isArray(article.relatedArticleIds) && article.relatedArticleIds.length > 0) {
      relatedArticles = article.relatedArticleIds
        .map(id => articles.find(a => a.id === id))
        .filter(a => a && a.isPublished);
    }

    return {
      article: articleExtended,
      relatedArticles
    };
  }

  getSavedArticleFolders() {
    return this._getFromStorage('knowledge_base_folders');
  }

  saveKnowledgeBaseArticle(articleId, folderSelection) {
    const articles = this._getFromStorage('knowledge_base_articles');
    const savedArticles = this._getFromStorage('saved_articles');
    const folders = this._getFromStorage('knowledge_base_folders');

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        success: false,
        message: 'Article not found.',
        savedArticle: null,
        folder: null
      };
    }

    let folder = null;
    let folderId = null;

    if (folderSelection) {
      if (folderSelection.folderId) {
        folder = folders.find(f => f.id === folderSelection.folderId) || null;
        folderId = folder ? folder.id : null;
      } else if (folderSelection.newFolderName) {
        folder = {
          id: this._generateId('kbfolder'),
          name: folderSelection.newFolderName,
          description: '',
          createdAt: this._nowIso()
        };
        folders.push(folder);
        this._saveToStorage('knowledge_base_folders', folders);
        folderId = folder.id;
      }
    }

    const saved = {
      id: this._generateId('savedart'),
      articleId: articleId,
      folderId: folderId || null,
      savedAt: this._nowIso()
    };

    savedArticles.push(saved);
    this._saveToStorage('saved_articles', savedArticles);

    return {
      success: true,
      message: 'Article saved.',
      savedArticle: saved,
      folder
    };
  }

  getSavedArticles() {
    const savedArticles = this._getFromStorage('saved_articles');
    const folders = this._getFromStorage('knowledge_base_folders');
    const articles = this._getFromStorage('knowledge_base_articles');

    const foldersResult = folders.map(folder => {
      const folderArticles = savedArticles.filter(sa => sa.folderId === folder.id);
      const articlesMapped = folderArticles.map(sa => {
        const article = articles.find(a => a.id === sa.articleId) || null;
        return {
          savedArticle: sa,
          article
        };
      });
      return {
        folder,
        articles: articlesMapped
      };
    });

    const ungrouped = savedArticles
      .filter(sa => !sa.folderId)
      .map(sa => {
        const article = articles.find(a => a.id === sa.articleId) || null;
        return {
          savedArticle: sa,
          article
        };
      });

    return {
      folders: foldersResult,
      ungroupedArticles: ungrouped
    };
  }

  updateSavedArticleFolder(savedArticleId, folderId) {
    const savedArticles = this._getFromStorage('saved_articles');
    const saved = savedArticles.find(sa => sa.id === savedArticleId) || null;
    if (!saved) {
      return {
        success: false,
        savedArticle: null
      };
    }

    saved.folderId = folderId || null;
    this._saveToStorage('saved_articles', savedArticles);

    return {
      success: true,
      savedArticle: saved
    };
  }

  deleteSavedArticle(savedArticleId) {
    const savedArticles = this._getFromStorage('saved_articles');
    const exists = savedArticles.some(sa => sa.id === savedArticleId);

    if (!exists) {
      return { success: false };
    }

    const updated = savedArticles.filter(sa => sa.id !== savedArticleId);
    this._saveToStorage('saved_articles', updated);

    return { success: true };
  }

  // ---------------------- Training Events & Registrations ----------------------

  searchTrainingEvents(query, futureOnly = true, page = 1, pageSize = 20) {
    const events = this._getFromStorage('training_events');
    let filtered = events;

    if (query) {
      const q = String(query).toLowerCase();
      filtered = filtered.filter(e => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const topic = (e.topic || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || topic.includes(q);
      });
    }

    if (futureOnly) {
      const now = new Date();
      filtered = filtered.filter(e => {
        const start = this._parseDate(e.startDateTime) || now;
        return start >= now;
      });
    }

    filtered.sort((a, b) => {
      const da = this._parseDate(a.startDateTime) || 0;
      const db = this._parseDate(b.startDateTime) || 0;
      return da - db;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const pageEvents = filtered.slice(start, start + pageSize);

    return {
      total,
      page,
      pageSize,
      events: pageEvents
    };
  }

  getTrainingEventDetails(eventId) {
    const events = this._getFromStorage('training_events');
    const event = events.find(e => e.id === eventId) || null;
    return { event };
  }

  registerForTrainingEvent(eventId, attendeeName, attendeeEmail, numSeats, attendeeTimeZone, experienceLevel) {
    const events = this._getFromStorage('training_events');
    const registrations = this._getFromStorage('event_registrations');

    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        message: 'Event not found.',
        registration: null
      };
    }

    if (event.status !== 'scheduled') {
      return {
        success: false,
        message: 'Event is not open for registration.',
        registration: null
      };
    }

    if (event.seatsAvailable != null && numSeats > event.seatsAvailable) {
      return {
        success: false,
        message: 'Not enough seats available.',
        registration: null
      };
    }

    const registration = {
      id: this._generateId('eventreg'),
      eventId,
      attendeeName,
      attendeeEmail,
      numSeats,
      attendeeTimeZone,
      experienceLevel,
      registeredAt: this._nowIso()
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    // Update seatsAvailable if tracked
    if (event.seatsAvailable != null) {
      event.seatsAvailable = Math.max(0, event.seatsAvailable - numSeats);
      const updatedEvents = events.map(e => (e.id === event.id ? event : e));
      this._saveToStorage('training_events', updatedEvents);
    }

    return {
      success: true,
      message: 'Registered for event.',
      registration
    };
  }

  // ---------------------- Server Configurator & Quote Cart ----------------------

  getServerBaseModels(formFactor) {
    const baseModels = this._getFromStorage('server_base_models');
    let filtered = baseModels.filter(bm => bm.isActive);
    if (formFactor) {
      filtered = filtered.filter(bm => bm.formFactor === formFactor);
    }
    return filtered;
  }

  getServerConfigurationOptions(baseModelId) {
    const baseModels = this._getFromStorage('server_base_models');
    const memoryOptions = this._getFromStorage('server_memory_options');
    const storageOptions = this._getFromStorage('server_storage_options');
    const optionalComponents = this._getFromStorage('server_optional_components');
    const maintenancePlans = this._getFromStorage('maintenance_plans');

    const baseModel = baseModels.find(m => m.id === baseModelId) || null;

    const memOptionsFiltered = memoryOptions.filter(mo => !Array.isArray(mo.compatibleBaseModelIds) || mo.compatibleBaseModelIds.length === 0 || mo.compatibleBaseModelIds.includes(baseModelId));
    const storageOptionsFiltered = storageOptions.filter(so => !Array.isArray(so.compatibleBaseModelIds) || so.compatibleBaseModelIds.length === 0 || so.compatibleBaseModelIds.includes(baseModelId));
    const optionalComponentsFiltered = optionalComponents.filter(oc => !Array.isArray(oc.compatibleBaseModelIds) || oc.compatibleBaseModelIds.length === 0 || oc.compatibleBaseModelIds.includes(baseModelId));

    const maintenancePlansFiltered = maintenancePlans.filter(mp => mp.applicableProductType === 'server' || mp.applicableProductType === 'all');

    return {
      baseModel,
      memoryOptions: memOptionsFiltered,
      storageOptions: storageOptionsFiltered,
      optionalComponents: optionalComponentsFiltered,
      maintenancePlans: maintenancePlansFiltered
    };
  }

  previewServerConfiguration(baseModelId, memoryOptionId, storageOptionIds, optionalComponentIds, maintenancePlanId) {
    const baseModels = this._getFromStorage('server_base_models');
    const memoryOptions = this._getFromStorage('server_memory_options');
    const storageOptions = this._getFromStorage('server_storage_options');
    const optionalComponents = this._getFromStorage('server_optional_components');
    const maintenancePlans = this._getFromStorage('maintenance_plans');

    const baseModel = baseModels.find(m => m.id === baseModelId) || null;
    const memoryOption = memoryOptions.find(mo => mo.id === memoryOptionId) || null;
    const storageOptionsSelected = Array.isArray(storageOptionIds)
      ? storageOptionIds.map(id => storageOptions.find(so => so.id === id)).filter(Boolean)
      : [];
    const optionalComponentsSelected = Array.isArray(optionalComponentIds)
      ? optionalComponentIds.map(id => optionalComponents.find(oc => oc.id === id)).filter(Boolean)
      : [];
    const maintenancePlan = maintenancePlans.find(mp => mp.id === maintenancePlanId) || null;

    const basePrice = baseModel ? baseModel.basePrice || 0 : 0;
    const memoryPrice = memoryOption ? memoryOption.additionalPrice || 0 : 0;
    const storagePrice = storageOptionsSelected.reduce((sum, so) => sum + (so.additionalPrice || 0), 0);
    const optionalComponentsPrice = optionalComponentsSelected.reduce((sum, oc) => sum + (oc.additionalPrice || 0), 0);
    const maintenancePrice = maintenancePlan ? maintenancePlan.price || 0 : 0;

    const totalPrice = basePrice + memoryPrice + storagePrice + optionalComponentsPrice + maintenancePrice;

    return {
      currency: 'usd',
      basePrice,
      memoryPrice,
      storagePrice,
      optionalComponentsPrice,
      maintenancePrice,
      totalPrice,
      totalPriceFormatted: this._formatCurrency(totalPrice, 'usd')
    };
  }

  createServerConfiguration(baseModelId, memoryOptionId, storageOptionIds, optionalComponentIds, maintenancePlanId) {
    const preview = this.previewServerConfiguration(baseModelId, memoryOptionId, storageOptionIds, optionalComponentIds, maintenancePlanId);
    const configurations = this._getFromStorage('server_configurations');

    const config = {
      id: this._generateId('srvconf'),
      baseModelId,
      memoryOptionId,
      storageOptionIds: Array.isArray(storageOptionIds) ? storageOptionIds.slice() : [],
      optionalComponentIds: Array.isArray(optionalComponentIds) ? optionalComponentIds.slice() : [],
      maintenancePlanId,
      totalPrice: preview.totalPrice,
      createdAt: this._nowIso()
    };

    configurations.push(config);
    this._saveToStorage('server_configurations', configurations);

    return {
      success: true,
      message: 'Server configuration created.',
      configuration: config
    };
  }

  addServerConfigurationToQuoteCart(serverConfigurationId, quantity = 1) {
    const configurations = this._getFromStorage('server_configurations');
    const quoteCartItems = this._getFromStorage('quote_cart_items');

    const config = configurations.find(c => c.id === serverConfigurationId) || null;
    if (!config) {
      return {
        success: false,
        message: 'Server configuration not found.',
        quoteCart: null,
        quoteCartItem: null
      };
    }

    const quoteCart = this._getOrCreateQuoteCart();

    const item = {
      id: this._generateId('qitem'),
      quoteCartId: quoteCart.id,
      serverConfigurationId,
      quantity: quantity,
      notes: '',
      addedAt: this._nowIso()
    };

    quoteCartItems.push(item);
    this._saveToStorage('quote_cart_items', quoteCartItems);

    // Update cart items list reference
    const quoteCarts = this._getFromStorage('quote_carts');
    quoteCart.items = quoteCart.items || [];
    if (!quoteCart.items.includes(item.id)) {
      quoteCart.items.push(item.id);
    }
    quoteCart.updatedAt = this._nowIso();
    const updatedQuoteCarts = quoteCarts.map(qc => (qc.id === quoteCart.id ? quoteCart : qc));
    this._saveToStorage('quote_carts', updatedQuoteCarts);

    return {
      success: true,
      message: 'Configuration added to quote cart.',
      quoteCart,
      quoteCartItem: item
    };
  }

  getQuoteCartSummary() {
    const quoteCart = this._getCurrentQuoteCart();
    const quoteCartItems = this._getFromStorage('quote_cart_items');
    const configurations = this._getFromStorage('server_configurations');
    const baseModels = this._getFromStorage('server_base_models');
    const maintenancePlans = this._getFromStorage('maintenance_plans');

    if (!quoteCart) {
      return {
        quoteCart: null,
        items: []
      };
    }

    const itemsRaw = quoteCartItems.filter(qi => qi.quoteCartId === quoteCart.id);

    const items = itemsRaw.map(qi => {
      const serverConfiguration = configurations.find(c => c.id === qi.serverConfigurationId) || null;
      let baseModel = null;
      let maintenancePlan = null;
      if (serverConfiguration) {
        baseModel = baseModels.find(bm => bm.id === serverConfiguration.baseModelId) || null;
        maintenancePlan = maintenancePlans.find(mp => mp.id === serverConfiguration.maintenancePlanId) || null;
      }
      return {
        quoteCartItem: qi,
        serverConfiguration,
        baseModel,
        maintenancePlan
      };
    });

    return {
      quoteCart,
      items
    };
  }

  removeQuoteCartItem(quoteCartItemId) {
    const quoteCartItems = this._getFromStorage('quote_cart_items');
    const quoteCarts = this._getFromStorage('quote_carts');
    const item = quoteCartItems.find(qi => qi.id === quoteCartItemId) || null;

    if (!item) {
      return {
        success: false,
        quoteCart: this._getCurrentQuoteCart()
      };
    }

    const updatedItems = quoteCartItems.filter(qi => qi.id !== quoteCartItemId);
    this._saveToStorage('quote_cart_items', updatedItems);

    const quoteCart = quoteCarts.find(qc => qc.id === item.quoteCartId) || null;
    if (quoteCart && Array.isArray(quoteCart.items)) {
      quoteCart.items = quoteCart.items.filter(id => id !== quoteCartItemId);
      quoteCart.updatedAt = this._nowIso();
      const updatedQuoteCarts = quoteCarts.map(qc => (qc.id === quoteCart.id ? quoteCart : qc));
      this._saveToStorage('quote_carts', updatedQuoteCarts);
    }

    return {
      success: true,
      quoteCart
    };
  }

  submitServerQuoteRequest(contact) {
    const quoteCart = this._getCurrentQuoteCart();
    if (!quoteCart) {
      return {
        success: false,
        message: 'No quote cart available.',
        serverQuoteRequest: null
      };
    }

    const quoteCartItems = this._getFromStorage('quote_cart_items').filter(qi => qi.quoteCartId === quoteCart.id);
    if (quoteCartItems.length === 0) {
      return {
        success: false,
        message: 'Quote cart is empty.',
        serverQuoteRequest: null
      };
    }

    const serverQuoteRequests = this._getFromStorage('server_quote_requests');

    const request = {
      id: this._generateId('srvquote'),
      quoteCartId: quoteCart.id,
      contactName: contact && contact.contactName ? contact.contactName : '',
      companyName: contact && contact.companyName ? contact.companyName : '',
      email: contact && contact.email ? contact.email : '',
      phone: contact && contact.phone ? contact.phone : '',
      status: 'submitted',
      createdAt: this._nowIso()
    };

    serverQuoteRequests.push(request);
    this._saveToStorage('server_quote_requests', serverQuoteRequests);

    return {
      success: true,
      message: 'Server quote request submitted.',
      serverQuoteRequest: request
    };
  }

  // ---------------------- Company Info, Contact, Static Pages ----------------------

  getCompanyInfo() {
    const info = this._getObjectFromStorage('company_info', {});
    return {
      companyName: info.companyName || '',
      overview: info.overview || '',
      capabilities: Array.isArray(info.capabilities) ? info.capabilities : [],
      locations: Array.isArray(info.locations) ? info.locations : []
    };
  }

  submitContactInquiry(inquiry) {
    const inquiries = this._getFromStorage('contact_inquiries');

    const record = {
      id: this._generateId('contact'),
      fullName: inquiry && inquiry.fullName ? inquiry.fullName : '',
      email: inquiry && inquiry.email ? inquiry.email : '',
      phone: inquiry && inquiry.phone ? inquiry.phone : '',
      topic: inquiry && inquiry.topic ? inquiry.topic : 'general',
      subject: inquiry && inquiry.subject ? inquiry.subject : '',
      message: inquiry && inquiry.message ? inquiry.message : '',
      createdAt: this._nowIso()
    };

    inquiries.push(record);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted.',
      inquiryId: record.id
    };
  }

  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find(p => p.slug === pageSlug) || null;

    if (!page) {
      return {
        title: '',
        content: ''
      };
    }

    return {
      title: page.title || '',
      content: page.content || ''
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