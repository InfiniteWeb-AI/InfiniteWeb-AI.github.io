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

  // -----------------------
  // Storage helpers
  // -----------------------
  _initStorage() {
    // Legacy keys from template (not used by core logic but kept for compatibility)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Domain storage tables (arrays)
    const arrayKeys = [
      'account_profiles',
      'notification_preferences',
      'stores',
      'menu_categories',
      'products',
      'orders',
      'order_items',
      'payment_cards',
      'rewards',
      'reward_redemptions',
      'support_requests',
      'help_topics',
      'help_articles'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Static content placeholders (kept empty if not set externally)
    if (!localStorage.getItem('about_page_content')) {
      // Leave as null; external systems may populate
      localStorage.setItem('about_page_content', 'null');
    }
    if (!localStorage.getItem('support_contact_info')) {
      localStorage.setItem('support_contact_info', 'null');
    }
    if (!localStorage.getItem('terms_of_use_content')) {
      localStorage.setItem('terms_of_use_content', 'null');
    }
    if (!localStorage.getItem('privacy_policy_content')) {
      localStorage.setItem('privacy_policy_content', 'null');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getObjectFromStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  _saveObjectToStorage(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
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

  // -----------------------
  // Auth & account helpers
  // -----------------------
  _getCurrentAccount() {
    const currentAccountId = localStorage.getItem('currentAccountId');
    if (!currentAccountId) return null;
    const accounts = this._getFromStorage('account_profiles');
    return accounts.find(a => a.id === currentAccountId) || null;
  }

  _setCurrentAccount(account) {
    if (account && account.id) {
      localStorage.setItem('currentAccountId', account.id);
    } else {
      localStorage.removeItem('currentAccountId');
    }
  }

  _requireAuthenticated() {
    const account = this._getCurrentAccount();
    if (!account) {
      throw new Error('Not authenticated');
    }
    return account;
  }

  _findAccountByEmail(email) {
    const accounts = this._getFromStorage('account_profiles');
    return accounts.find(a => a.email.toLowerCase() === String(email).toLowerCase()) || null;
  }

  _validatePasswordStrength(password) {
    const pw = String(password || '');
    const errors = [];
    if (pw.length < 8) errors.push('Password must be at least 8 characters long.');
    if (!/[a-z]/.test(pw)) errors.push('Password must contain a lowercase letter.');
    if (!/[A-Z]/.test(pw)) errors.push('Password must contain an uppercase letter.');
    if (!/[0-9]/.test(pw)) errors.push('Password must contain a digit.');
    if (!/[^A-Za-z0-9]/.test(pw)) errors.push('Password must contain a special character.');
    return {
      valid: errors.length === 0,
      message: errors.join(' ')
    };
  }

  // -----------------------
  // Foreign key hydration (one level only)
  // -----------------------
  _hydrateForeignKeys(entity) {
    if (!entity || typeof entity !== 'object') return entity;
    const fkMap = {
      productId: 'products',
      menuCategoryId: 'menu_categories',
      orderId: 'orders',
      storeId: 'stores',
      paymentCardId: 'payment_cards',
      rewardId: 'rewards',
      rewardRedemptionId: 'reward_redemptions',
      favoriteStoreId: 'stores',
      defaultPaymentCardId: 'payment_cards',
      accountId: 'account_profiles'
    };

    const result = { ...entity };
    Object.keys(entity).forEach(key => {
      if (!key.endsWith('Id')) return;
      const storageKey = fkMap[key];
      if (!storageKey) return;
      const idValue = entity[key];
      if (!idValue) {
        const relName = key.slice(0, -2);
        result[relName] = null;
        return;
      }
      const collection = this._getFromStorage(storageKey);
      const related = collection.find(x => x.id === idValue) || null;
      const relName = key.slice(0, -2);
      result[relName] = related ? { ...related } : null;
    });
    return result;
  }

  _hydrateArray(entities) {
    if (!Array.isArray(entities)) return entities;
    return entities.map(e => this._hydrateForeignKeys(e));
  }

  // -----------------------
  // Order helpers
  // -----------------------
  _getSuggestedPickupStore() {
    const stores = this._getFromStorage('stores');
    if (!stores.length) return null;
    const account = this._getCurrentAccount();
    if (account && account.favoriteStoreId) {
      const fav = stores.find(s => s.id === account.favoriteStoreId);
      if (fav) return fav;
    }
    // Prefer the store with smallest non-null distanceMiles
    const withDistance = stores.filter(s => typeof s.distanceMiles === 'number');
    if (withDistance.length) {
      withDistance.sort((a, b) => a.distanceMiles - b.distanceMiles);
      return withDistance[0];
    }
    // Fallback: first store
    return stores[0];
  }

  _getSuggestedPickupStoreId() {
    const store = this._getSuggestedPickupStore();
    return store ? store.id : null;
  }

  _getOrCreateCurrentOrder(preferredStoreId) {
    const account = this._requireAuthenticated();
    const orders = this._getFromStorage('orders');
    const currentOrderId = localStorage.getItem('currentOrderId');

    let order = null;
    if (currentOrderId) {
      order = orders.find(o => o.id === currentOrderId && o.status === 'draft' && o.accountId === account.id) || null;
    }

    if (!order) {
      const storeId = preferredStoreId || account.favoriteStoreId || this._getSuggestedPickupStoreId();
      order = {
        id: this._generateId('ord'),
        status: 'draft',
        storeId: storeId || null,
        accountId: account.id,
        createdAt: this._nowISO(),
        updatedAt: this._nowISO(),
        pickupDateTime: null,
        subtotalAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        paymentCardId: account.defaultPaymentCardId || null,
        notes: null,
        source: 'web'
      };
      orders.push(order);
      this._saveToStorage('orders', orders);
      localStorage.setItem('currentOrderId', order.id);
    }

    return order;
  }

  _recalculateOrderTotals(orderId) {
    const orders = this._getFromStorage('orders');
    const items = this._getFromStorage('order_items');
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    const orderItems = items.filter(i => i.orderId === orderId);
    const subtotal = orderItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
    const totalAmount = subtotal + taxAmount;

    order.subtotalAmount = subtotal;
    order.taxAmount = taxAmount;
    order.totalAmount = totalAmount;
    order.updatedAt = this._nowISO();

    this._saveToStorage('orders', orders);

    return {
      order,
      items: orderItems
    };
  }

  // -----------------------
  // Interface: loginWithEmailPassword
  // -----------------------
  loginWithEmailPassword(email, password) {
    const account = this._findAccountByEmail(email);
    if (!account || account.password !== password) {
      this._setCurrentAccount(null);
      return {
        success: false,
        message: 'Invalid email or password.',
        isLoggedIn: false,
        account: null
      };
    }

    this._setCurrentAccount(account);
    const hydratedAccount = this._hydrateForeignKeys(account);

    return {
      success: true,
      message: 'Logged in successfully.',
      isLoggedIn: true,
      account: {
        fullName: hydratedAccount.fullName,
        email: hydratedAccount.email,
        loyaltyPointsBalance: hydratedAccount.loyaltyPointsBalance,
        loyaltyTier: hydratedAccount.loyaltyTier,
        favoriteStore: hydratedAccount.favoriteStore || null
      }
    };
  }

  // -----------------------
  // Interface: logoutCurrentAccount
  // -----------------------
  logoutCurrentAccount() {
    this._setCurrentAccount(null);
    localStorage.removeItem('currentOrderId');
    return {
      success: true,
      message: 'Logged out successfully.'
    };
  }

  // -----------------------
  // Interface: signupAccount
  // -----------------------
  signupAccount(fullName, email, password, confirmPassword, acceptTerms) {
    const accounts = this._getFromStorage('account_profiles');

    if (!acceptTerms) {
      return {
        success: false,
        message: 'You must accept the terms and conditions.',
        accountDashboard: null
      };
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        message: 'Password and confirmation do not match.',
        accountDashboard: null
      };
    }

    if (this._findAccountByEmail(email)) {
      return {
        success: false,
        message: 'An account with this email already exists.',
        accountDashboard: null
      };
    }

    const pwCheck = this._validatePasswordStrength(password);
    if (!pwCheck.valid) {
      return {
        success: false,
        message: pwCheck.message,
        accountDashboard: null
      };
    }

    const now = this._nowISO();
    const account = {
      id: this._generateId('acc'),
      fullName: String(fullName || '').trim(),
      email: String(email || '').toLowerCase().trim(),
      password: String(password),
      favoriteStoreId: null,
      defaultPaymentCardId: null,
      loyaltyPointsBalance: 0,
      loyaltyTier: 'none',
      phoneNumber: null,
      termsAccepted: !!acceptTerms,
      passwordLastChangedAt: now,
      createdAt: now,
      updatedAt: now
    };

    accounts.push(account);
    this._saveToStorage('account_profiles', accounts);

    // Create default notification preferences for this account
    const prefs = this._getFromStorage('notification_preferences');
    const pref = {
      id: this._generateId('np'),
      accountId: account.id,
      emailPromotionsEnabled: true,
      emailOrderUpdatesEnabled: true,
      pushPromotionsEnabled: true,
      pushOrderUpdatesEnabled: true,
      smsOrderUpdatesEnabled: false,
      smsPromotionsEnabled: false,
      updatedAt: now
    };
    prefs.push(pref);
    this._saveToStorage('notification_preferences', prefs);

    this._setCurrentAccount(account);
    const hydratedAccount = this._hydrateForeignKeys(account);

    return {
      success: true,
      message: 'Account created successfully.',
      accountDashboard: {
        fullName: hydratedAccount.fullName,
        email: hydratedAccount.email,
        loyaltyPointsBalance: hydratedAccount.loyaltyPointsBalance,
        loyaltyTier: hydratedAccount.loyaltyTier,
        favoriteStore: hydratedAccount.favoriteStore
          ? {
              id: hydratedAccount.favoriteStore.id,
              name: hydratedAccount.favoriteStore.name
            }
          : null
      }
    };
  }

  // -----------------------
  // Interface: getHomePageContent
  // -----------------------
  getHomePageContent() {
    const account = this._getCurrentAccount();
    const isLoggedIn = !!account;

    const products = this._getFromStorage('products');
    const menuCategories = this._getFromStorage('menu_categories');

    // Featured products: top 5 active by rating
    const activeProducts = products.filter(p => p.isActive);
    activeProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const featuredProducts = activeProducts.slice(0, 5).map(p => {
      const category = menuCategories.find(mc => mc.id === p.menuCategoryId) || null;
      const priceCandidates = [p.priceSmall, p.priceMedium, p.priceLarge].filter(v => typeof v === 'number');
      const priceFrom = priceCandidates.length ? Math.min(...priceCandidates) : null;
      return {
        productId: p.id,
        name: p.name,
        shortDescription: p.description || '',
        imageUrl: p.imageUrl || '',
        categoryName: category ? category.name : '',
        priceFrom: priceFrom,
        rating: p.rating || null
      };
    });

    // Promotions: no dedicated storage, return empty array to avoid mocked data
    const promotions = [];

    let storeSummary = {
      hasFavoriteStore: false,
      favoriteStore: null,
      suggestedStore: null
    };

    const stores = this._getFromStorage('stores');
    if (stores.length) {
      let favoriteStore = null;
      if (account && account.favoriteStoreId) {
        favoriteStore = stores.find(s => s.id === account.favoriteStoreId) || null;
      }
      const suggestedStore = this._getSuggestedPickupStore();

      storeSummary = {
        hasFavoriteStore: !!favoriteStore,
        favoriteStore: favoriteStore
          ? {
              id: favoriteStore.id,
              name: favoriteStore.name,
              city: favoriteStore.city,
              state: favoriteStore.state,
              distanceMiles: favoriteStore.distanceMiles || null,
              isOpenNow: typeof favoriteStore.isOpenNow === 'boolean' ? favoriteStore.isOpenNow : null
            }
          : null,
        suggestedStore: suggestedStore
          ? {
              id: suggestedStore.id,
              name: suggestedStore.name,
              city: suggestedStore.city,
              state: suggestedStore.state,
              distanceMiles: suggestedStore.distanceMiles || null,
              isOpenNow: typeof suggestedStore.isOpenNow === 'boolean' ? suggestedStore.isOpenNow : null
            }
          : null
      };
    }

    return {
      isLoggedIn,
      featuredProducts,
      promotions,
      storeSummary
    };
  }

  // -----------------------
  // Store interfaces
  // -----------------------
  searchStoresByZip(zipCode) {
    const stores = this._getFromStorage('stores');
    const account = this._getCurrentAccount();
    const favoriteStoreId = account ? account.favoriteStoreId : null;

    const results = stores
      .filter(s => String(s.zipCode || '').trim() === String(zipCode || '').trim())
      .map(s => ({
        id: s.id,
        name: s.name,
        addressLine1: s.addressLine1,
        city: s.city,
        state: s.state,
        zipCode: s.zipCode,
        distanceMiles: typeof s.distanceMiles === 'number' ? s.distanceMiles : null,
        hoursSummary: s.hoursSummary || '',
        isOpenNow: typeof s.isOpenNow === 'boolean' ? s.isOpenNow : null,
        canMobileOrder: !!s.canMobileOrder,
        isFavorite: favoriteStoreId ? favoriteStoreId === s.id : false
      }));

    return results;
  }

  searchStoresByCoordinates(latitude, longitude) {
    const stores = this._getFromStorage('stores');

    // Simple distance approximation; if lat/long missing, treat as Infinity
    const results = stores.map(s => {
      let distance = s.distanceMiles;
      if (typeof distance !== 'number' && typeof s.latitude === 'number' && typeof s.longitude === 'number') {
        const toRad = d => (d * Math.PI) / 180;
        const R = 3958.8; // miles
        const dLat = toRad(s.latitude - latitude);
        const dLon = toRad(s.longitude - longitude);
        const lat1 = toRad(latitude);
        const lat2 = toRad(s.latitude);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = R * c;
      }
      return {
        ...s,
        distanceMiles: typeof distance === 'number' ? distance : null
      };
    });

    results.sort((a, b) => {
      const da = typeof a.distanceMiles === 'number' ? a.distanceMiles : Number.POSITIVE_INFINITY;
      const db = typeof b.distanceMiles === 'number' ? b.distanceMiles : Number.POSITIVE_INFINITY;
      return da - db;
    });

    return results;
  }

  getStoreDetail(storeId) {
    const stores = this._getFromStorage('stores');
    const store = stores.find(s => s.id === storeId) || null;
    const account = this._getCurrentAccount();
    const favoriteStoreId = account ? account.favoriteStoreId : null;

    return {
      store: store
        ? {
            id: store.id,
            name: store.name,
            addressLine1: store.addressLine1,
            addressLine2: store.addressLine2 || '',
            city: store.city,
            state: store.state,
            zipCode: store.zipCode,
            phoneNumber: store.phoneNumber || '',
            hoursSummary: store.hoursSummary || '',
            isOpenNow: typeof store.isOpenNow === 'boolean' ? store.isOpenNow : null,
            distanceMiles: typeof store.distanceMiles === 'number' ? store.distanceMiles : null,
            amenities: Array.isArray(store.amenities) ? store.amenities : [],
            mapImageUrl: store.mapImageUrl || '',
            canMobileOrder: !!store.canMobileOrder
          }
        : null,
      isFavorite: !!(store && favoriteStoreId && favoriteStoreId === store.id)
    };
  }

  setFavoriteStore(storeId) {
    const account = this._requireAuthenticated();
    const stores = this._getFromStorage('stores');
    const store = stores.find(s => s.id === storeId) || null;
    if (!store) {
      return {
        success: false,
        message: 'Store not found.',
        favoriteStore: null
      };
    }

    const accounts = this._getFromStorage('account_profiles');
    const acc = accounts.find(a => a.id === account.id);
    if (!acc) {
      return {
        success: false,
        message: 'Account not found.',
        favoriteStore: null
      };
    }

    acc.favoriteStoreId = store.id;
    acc.updatedAt = this._nowISO();
    this._saveToStorage('account_profiles', accounts);

    const fav = {
      id: store.id,
      name: store.name,
      city: store.city,
      state: store.state,
      distanceMiles: typeof store.distanceMiles === 'number' ? store.distanceMiles : null
    };

    return {
      success: true,
      message: 'Favorite store updated.',
      favoriteStore: fav
    };
  }

  getPickupStoreOptions() {
    const account = this._requireAuthenticated();
    const stores = this._getFromStorage('stores');
    return {
      favoriteStoreId: account.favoriteStoreId || null,
      stores: stores
    };
  }

  setCurrentPickupStore(storeId) {
    const account = this._requireAuthenticated();
    const stores = this._getFromStorage('stores');
    const store = stores.find(s => s.id === storeId) || null;
    if (!store) {
      return {
        success: false,
        currentOrderId: null,
        pickupStore: null
      };
    }

    const orders = this._getFromStorage('orders');
    let order = null;
    const currentOrderId = localStorage.getItem('currentOrderId');
    if (currentOrderId) {
      order = orders.find(o => o.id === currentOrderId && o.status === 'draft' && o.accountId === account.id) || null;
    }

    if (!order) {
      order = {
        id: this._generateId('ord'),
        status: 'draft',
        storeId: store.id,
        accountId: account.id,
        createdAt: this._nowISO(),
        updatedAt: this._nowISO(),
        pickupDateTime: null,
        subtotalAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        paymentCardId: account.defaultPaymentCardId || null,
        notes: null,
        source: 'web'
      };
      orders.push(order);
    } else {
      order.storeId = store.id;
      order.updatedAt = this._nowISO();
    }

    this._saveToStorage('orders', orders);
    localStorage.setItem('currentOrderId', order.id);

    return {
      success: true,
      currentOrderId: order.id,
      pickupStore: {
        id: store.id,
        name: store.name,
        city: store.city,
        state: store.state
      }
    };
  }

  // -----------------------
  // Menu & products
  // -----------------------
  getMenuCategories() {
    const categories = this._getFromStorage('menu_categories');
    return categories;
  }

  getMenuProductsForCategory(categorySlug) {
    const categories = this._getFromStorage('menu_categories');
    const products = this._getFromStorage('products');

    const category = categories.find(c => c.slug === categorySlug) || null;
    if (!category) {
      return {
        category: null,
        products: []
      };
    }

    const categoryProducts = products
      .filter(p => p.menuCategoryId === category.id && p.isActive)
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        imageUrl: p.imageUrl || '',
        baseType: p.baseType,
        categoryName: category.name,
        rating: p.rating || null,
        ratingCount: p.ratingCount || 0,
        priceSmall: typeof p.priceSmall === 'number' ? p.priceSmall : null,
        priceMedium: typeof p.priceMedium === 'number' ? p.priceMedium : null,
        priceLarge: typeof p.priceLarge === 'number' ? p.priceLarge : null,
        defaultSize: p.defaultSize,
        availableSizes: Array.isArray(p.availableSizes) ? p.availableSizes : [],
        isRewardEligible: !!p.isRewardEligible
      }));

    return {
      category,
      products: categoryProducts
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        pricingBySize: {
          small: null,
          medium: null,
          large: null
        },
        availableMilkOptions: []
      };
    }

    const pricingBySize = {
      small: typeof product.priceSmall === 'number' ? product.priceSmall : null,
      medium: typeof product.priceMedium === 'number' ? product.priceMedium : null,
      large: typeof product.priceLarge === 'number' ? product.priceLarge : null
    };

    const hydratedProduct = this._hydrateForeignKeys(product);

    return {
      product: hydratedProduct,
      pricingBySize,
      availableMilkOptions: Array.isArray(product.availableMilkOptions) ? product.availableMilkOptions : []
    };
  }

  // -----------------------
  // Pickup time slots
  // -----------------------
  getAvailablePickupTimeSlots(date) {
    // For simplicity, generate generic time slots; they are not persisted.
    // This does not mock domain entities and is purely computed.
    const slots = [];
    const startHour = 7;
    const endHour = 18;
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        const startTime = `${hh}:${mm}`;
        const endMinutes = m + 15;
        const endHourVal = h + Math.floor(endMinutes / 60);
        const endMinVal = endMinutes % 60;
        const eh = endHourVal.toString().padStart(2, '0');
        const em = endMinVal.toString().padStart(2, '0');
        const endTime = `${eh}:${em}`;
        slots.push({
          startTime,
          endTime,
          label: `${startTime} - ${endTime}`,
          isAvailable: true
        });
      }
    }
    return slots;
  }

  // -----------------------
  // Orders: addProductToCurrentOrder
  // -----------------------
  addProductToCurrentOrder(productId, size, milkType, quantity, pickupDateTime) {
    const account = this._requireAuthenticated();
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product || !product.isActive) {
      return {
        success: false,
        currentOrderId: null,
        message: 'Product not found or inactive.',
        orderItem: null,
        orderSummary: null
      };
    }

    const selectedSize = size || product.defaultSize;
    if (!Array.isArray(product.availableSizes) || !product.availableSizes.includes(selectedSize)) {
      return {
        success: false,
        currentOrderId: null,
        message: 'Selected size is not available for this product.',
        orderItem: null,
        orderSummary: null
      };
    }

    let unitPrice = null;
    if (selectedSize === 'small') unitPrice = product.priceSmall;
    if (selectedSize === 'medium') unitPrice = product.priceMedium;
    if (selectedSize === 'large') unitPrice = product.priceLarge;
    if (typeof unitPrice !== 'number') {
      return {
        success: false,
        currentOrderId: null,
        message: 'Pricing not available for selected size.',
        orderItem: null,
        orderSummary: null
      };
    }

    const order = this._getOrCreateCurrentOrder();
    const orderItems = this._getFromStorage('order_items');

    const now = this._nowISO();
    const orderItem = {
      id: this._generateId('oi'),
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      size: selectedSize,
      milkType: milkType || null,
      quantity: qty,
      unitPrice: unitPrice,
      totalPrice: unitPrice * qty,
      isRewardRedemption: false,
      rewardRedemptionId: null,
      createdAt: now
    };

    orderItems.push(orderItem);
    this._saveToStorage('order_items', orderItems);

    if (pickupDateTime) {
      const orders = this._getFromStorage('orders');
      const ord = orders.find(o => o.id === order.id && o.accountId === account.id);
      if (ord) {
        ord.pickupDateTime = pickupDateTime;
        ord.updatedAt = now;
        this._saveToStorage('orders', orders);
      }
    }

    const totals = this._recalculateOrderTotals(order.id);
    const updatedOrder = totals ? totals.order : order;
    const itemsForOrder = totals ? totals.items : orderItems.filter(i => i.orderId === order.id);

    const itemCount = itemsForOrder.reduce((sum, i) => sum + (i.quantity || 0), 0);

    return {
      success: true,
      currentOrderId: updatedOrder.id,
      message: 'Item added to order.',
      orderItem,
      orderSummary: {
        itemCount,
        subtotalAmount: updatedOrder.subtotalAmount,
        totalAmount: updatedOrder.totalAmount,
        pickupDateTime: updatedOrder.pickupDateTime
      }
    };
  }

  // -----------------------
  // Orders: getOrderItemConfiguration
  // -----------------------
  getOrderItemConfiguration(orderItemId) {
    const account = this._requireAuthenticated();
    const items = this._getFromStorage('order_items');
    const orders = this._getFromStorage('orders');

    const item = items.find(i => i.id === orderItemId) || null;
    if (!item) {
      return {
        orderItemId: null,
        productId: null,
        productName: null,
        size: null,
        milkType: null,
        quantity: null,
        unitPrice: null,
        product: null
      };
    }

    const order = orders.find(o => o.id === item.orderId) || null;
    if (!order || order.accountId !== account.id) {
      return {
        orderItemId: null,
        productId: null,
        productName: null,
        size: null,
        milkType: null,
        quantity: null,
        unitPrice: null,
        product: null
      };
    }

    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === item.productId) || null;

    return {
      orderItemId: item.id,
      productId: item.productId,
      productName: item.productName,
      size: item.size,
      milkType: item.milkType || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      product: product ? { ...product } : null
    };
  }

  // -----------------------
  // Orders: current order summary & details
  // -----------------------
  getCurrentOrderSummary() {
    const account = this._getCurrentAccount();
    if (!account) {
      return {
        hasActiveOrder: false,
        orderId: null,
        itemCount: 0,
        subtotalAmount: 0,
        totalAmount: 0,
        pickupStore: null,
        pickupDateTime: null
      };
    }

    const orders = this._getFromStorage('orders');
    const items = this._getFromStorage('order_items');
    const stores = this._getFromStorage('stores');
    const currentOrderId = localStorage.getItem('currentOrderId');

    const order = currentOrderId
      ? orders.find(o => o.id === currentOrderId && o.status === 'draft' && o.accountId === account.id) || null
      : null;

    if (!order) {
      return {
        hasActiveOrder: false,
        orderId: null,
        itemCount: 0,
        subtotalAmount: 0,
        totalAmount: 0,
        pickupStore: null,
        pickupDateTime: null
      };
    }

    const orderItems = items.filter(i => i.orderId === order.id);
    const itemCount = orderItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const store = stores.find(s => s.id === order.storeId) || null;

    return {
      hasActiveOrder: true,
      orderId: order.id,
      itemCount,
      subtotalAmount: order.subtotalAmount,
      totalAmount: order.totalAmount,
      pickupStore: store ? { id: store.id, name: store.name } : null,
      pickupDateTime: order.pickupDateTime
    };
  }

  getCurrentOrderDetails() {
    const account = this._requireAuthenticated();
    const orders = this._getFromStorage('orders');
    const items = this._getFromStorage('order_items');
    const stores = this._getFromStorage('stores');
    const cards = this._getFromStorage('payment_cards');

    const currentOrderId = localStorage.getItem('currentOrderId');
    const order = currentOrderId
      ? orders.find(o => o.id === currentOrderId && o.accountId === account.id) || null
      : null;

    if (!order) {
      return {
        order: null,
        items: [],
        store: null,
        paymentCard: null
      };
    }

    const orderItems = items.filter(i => i.orderId === order.id);
    const store = stores.find(s => s.id === order.storeId) || null;
    const paymentCard = cards.find(c => c.id === order.paymentCardId) || null;

    const hydratedOrder = this._hydrateForeignKeys(order);
    const hydratedItems = orderItems.map(i => this._hydrateForeignKeys(i));

    return {
      order: hydratedOrder,
      items: hydratedItems,
      store: store ? { ...store } : null,
      paymentCard: paymentCard ? { ...paymentCard } : null
    };
  }

  // -----------------------
  // Orders: update & remove items
  // -----------------------
  updateOrderItemQuantity(orderItemId, quantity) {
    const account = this._requireAuthenticated();
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return {
        success: false,
        orderItem: null,
        orderTotals: {
          subtotalAmount: 0,
          totalAmount: 0
        }
      };
    }

    const orders = this._getFromStorage('orders');
    const items = this._getFromStorage('order_items');

    const item = items.find(i => i.id === orderItemId) || null;
    if (!item) {
      return {
        success: false,
        orderItem: null,
        orderTotals: {
          subtotalAmount: 0,
          totalAmount: 0
        }
      };
    }

    const order = orders.find(o => o.id === item.orderId) || null;
    if (!order || order.accountId !== account.id) {
      return {
        success: false,
        orderItem: null,
        orderTotals: {
          subtotalAmount: 0,
          totalAmount: 0
        }
      };
    }

    item.quantity = qty;
    item.totalPrice = item.unitPrice * qty;
    this._saveToStorage('order_items', items);

    const totals = this._recalculateOrderTotals(order.id);

    return {
      success: true,
      orderItem: item,
      orderTotals: {
        subtotalAmount: totals.order.subtotalAmount,
        totalAmount: totals.order.totalAmount
      }
    };
  }

  updateOrderItemOptions(orderItemId, size, milkType) {
    const account = this._requireAuthenticated();
    const orders = this._getFromStorage('orders');
    const items = this._getFromStorage('order_items');
    const products = this._getFromStorage('products');

    const item = items.find(i => i.id === orderItemId) || null;
    if (!item) {
      return {
        success: false,
        orderItem: null,
        orderTotals: {
          subtotalAmount: 0,
          totalAmount: 0
        }
      };
    }

    const order = orders.find(o => o.id === item.orderId) || null;
    if (!order || order.accountId !== account.id) {
      return {
        success: false,
        orderItem: null,
        orderTotals: {
          subtotalAmount: 0,
          totalAmount: 0
        }
      };
    }

    const product = products.find(p => p.id === item.productId) || null;
    if (!product) {
      return {
        success: false,
        orderItem: null,
        orderTotals: {
          subtotalAmount: 0,
          totalAmount: 0
        }
      };
    }

    if (size) {
      if (!Array.isArray(product.availableSizes) || !product.availableSizes.includes(size)) {
        return {
          success: false,
          orderItem: null,
          orderTotals: {
            subtotalAmount: order.subtotalAmount,
            totalAmount: order.totalAmount
          }
        };
      }
      let unitPrice = null;
      if (size === 'small') unitPrice = product.priceSmall;
      if (size === 'medium') unitPrice = product.priceMedium;
      if (size === 'large') unitPrice = product.priceLarge;
      if (typeof unitPrice !== 'number') {
        return {
          success: false,
          orderItem: null,
          orderTotals: {
            subtotalAmount: order.subtotalAmount,
            totalAmount: order.totalAmount
          }
        };
      }
      item.size = size;
      item.unitPrice = unitPrice;
      item.totalPrice = unitPrice * item.quantity;
    }

    if (milkType) {
      item.milkType = milkType;
    }

    this._saveToStorage('order_items', items);
    const totals = this._recalculateOrderTotals(order.id);

    return {
      success: true,
      orderItem: item,
      orderTotals: {
        subtotalAmount: totals.order.subtotalAmount,
        totalAmount: totals.order.totalAmount
      }
    };
  }

  removeOrderItem(orderItemId) {
    const account = this._requireAuthenticated();
    const orders = this._getFromStorage('orders');
    const items = this._getFromStorage('order_items');

    const itemIndex = items.findIndex(i => i.id === orderItemId);
    if (itemIndex === -1) {
      return {
        success: false,
        orderTotals: {
          itemCount: 0,
          subtotalAmount: 0,
          totalAmount: 0
        }
      };
    }

    const orderId = items[itemIndex].orderId;
    const order = orders.find(o => o.id === orderId) || null;
    if (!order || order.accountId !== account.id) {
      return {
        success: false,
        orderTotals: {
          itemCount: 0,
          subtotalAmount: 0,
          totalAmount: 0
        }
      };
    }

    items.splice(itemIndex, 1);
    this._saveToStorage('order_items', items);

    const totals = this._recalculateOrderTotals(orderId);
    const orderItems = items.filter(i => i.orderId === orderId);
    const itemCount = orderItems.reduce((sum, i) => sum + (i.quantity || 0), 0);

    return {
      success: true,
      orderTotals: {
        itemCount,
        subtotalAmount: totals.order.subtotalAmount,
        totalAmount: totals.order.totalAmount
      }
    };
  }

  // -----------------------
  // Orders: pickup time & payment
  // -----------------------
  setCurrentOrderPickupTime(pickupDateTime) {
    const account = this._requireAuthenticated();
    const orders = this._getFromStorage('orders');
    const currentOrderId = localStorage.getItem('currentOrderId');
    const order = currentOrderId
      ? orders.find(o => o.id === currentOrderId && o.accountId === account.id) || null
      : null;

    if (!order) {
      return {
        success: false,
        pickupDateTime: null
      };
    }

    order.pickupDateTime = pickupDateTime;
    order.updatedAt = this._nowISO();
    this._saveToStorage('orders', orders);

    return {
      success: true,
      pickupDateTime: order.pickupDateTime
    };
  }

  setCurrentOrderPaymentCard(paymentCardId) {
    const account = this._requireAuthenticated();
    const orders = this._getFromStorage('orders');
    const cards = this._getFromStorage('payment_cards');

    const card = cards.find(c => c.id === paymentCardId && c.accountId === account.id && c.isActive) || null;
    if (!card) {
      return {
        success: false,
        paymentCard: null
      };
    }

    const currentOrderId = localStorage.getItem('currentOrderId');
    const order = currentOrderId
      ? orders.find(o => o.id === currentOrderId && o.accountId === account.id) || null
      : null;

    if (!order) {
      return {
        success: false,
        paymentCard: null
      };
    }

    order.paymentCardId = card.id;
    order.updatedAt = this._nowISO();
    this._saveToStorage('orders', orders);

    return {
      success: true,
      paymentCard: { ...card }
    };
  }

  placeCurrentOrder() {
    const account = this._requireAuthenticated();
    const orders = this._getFromStorage('orders');
    const items = this._getFromStorage('order_items');

    const currentOrderId = localStorage.getItem('currentOrderId');
    const order = currentOrderId
      ? orders.find(o => o.id === currentOrderId && o.accountId === account.id) || null
      : null;

    if (!order) {
      return {
        success: false,
        order: null,
        message: 'No active order to place.'
      };
    }

    const orderItems = items.filter(i => i.orderId === order.id);
    if (!orderItems.length) {
      return {
        success: false,
        order: null,
        message: 'Order has no items.'
      };
    }

    if (!order.storeId) {
      return {
        success: false,
        order: null,
        message: 'Pickup store is not set.'
      };
    }

    if (!order.pickupDateTime) {
      return {
        success: false,
        order: null,
        message: 'Pickup time is not set.'
      };
    }

    if (!order.paymentCardId) {
      return {
        success: false,
        order: null,
        message: 'Payment method is not set.'
      };
    }

    const totals = this._recalculateOrderTotals(order.id);
    order.status = 'placed';
    order.updatedAt = this._nowISO();
    this._saveToStorage('orders', orders);

    localStorage.removeItem('currentOrderId');

    return {
      success: true,
      order: this._hydrateForeignKeys(order),
      message: 'Order placed successfully.'
    };
  }

  // -----------------------
  // Account dashboard
  // -----------------------
  getAccountDashboardSummary() {
    const account = this._requireAuthenticated();
    const hydratedAccount = this._hydrateForeignKeys(account);

    const quickLinks = [
      {
        key: 'orders',
        label: 'Past Orders',
        description: 'View and reorder your previous drinks.'
      },
      {
        key: 'rewards',
        label: 'Rewards',
        description: 'Check your loyalty points and rewards.'
      },
      {
        key: 'payment_methods',
        label: 'Payment Methods',
        description: 'Manage your saved cards.'
      },
      {
        key: 'settings',
        label: 'Settings',
        description: 'Manage notifications and security.'
      }
    ];

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task2_dashboardAccessed',
        JSON.stringify({
          "accountId": account.id,
          "email": account.email,
          "timestamp": this._nowISO()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      fullName: hydratedAccount.fullName,
      email: hydratedAccount.email,
      loyaltyPointsBalance: hydratedAccount.loyaltyPointsBalance,
      loyaltyTier: hydratedAccount.loyaltyTier,
      favoriteStore: hydratedAccount.favoriteStore
        ? {
            id: hydratedAccount.favoriteStore.id,
            name: hydratedAccount.favoriteStore.name,
            city: hydratedAccount.favoriteStore.city,
            state: hydratedAccount.favoriteStore.state
          }
        : null,
      quickLinks
    };
  }

  // -----------------------
  // Payment methods
  // -----------------------
  getPaymentMethodsSummary() {
    const account = this._requireAuthenticated();
    const cards = this._getFromStorage('payment_cards');
    const accountCards = cards.filter(c => c.accountId === account.id && c.isActive);

    const hydratedCards = this._hydrateArray(accountCards);

    return {
      cards: hydratedCards,
      defaultPaymentCardId: account.defaultPaymentCardId || null
    };
  }

  addPaymentCard(cardNumber, expMonth, expYear, cvv, cardholderName, billingZip, label) {
    const account = this._requireAuthenticated();

    const num = String(cardNumber || '').replace(/\s|-/g, '');
    if (num.length < 4) {
      return {
        success: false,
        message: 'Invalid card number.',
        card: null
      };
    }

    const last4 = num.slice(-4);
    let brand = 'other';
    if (/^4/.test(num)) brand = 'visa';
    else if (/^5[1-5]/.test(num)) brand = 'mastercard';
    else if (/^3[47]/.test(num)) brand = 'amex';
    else if (/^6/.test(num)) brand = 'discover';

    const monthNum = Number(expMonth);
    const yearNum = Number(expYear);

    if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      return {
        success: false,
        message: 'Invalid expiration month.',
        card: null
      };
    }

    if (!Number.isInteger(yearNum) || yearNum < new Date().getFullYear()) {
      return {
        success: false,
        message: 'Invalid expiration year.',
        card: null
      };
    }

    if (!cvv || String(cvv).length < 3) {
      return {
        success: false,
        message: 'Invalid CVV.',
        card: null
      };
    }

    const cards = this._getFromStorage('payment_cards');
    const now = this._nowISO();

    const card = {
      id: this._generateId('card'),
      cardBrand: brand,
      last4: last4,
      expMonth: monthNum,
      expYear: yearNum,
      cardholderName: String(cardholderName || '').trim(),
      billingZip: billingZip || null,
      isDefault: false,
      isActive: true,
      createdAt: now,
      label: label || null,
      accountId: account.id
    };

    cards.push(card);
    this._saveToStorage('payment_cards', cards);

    return {
      success: true,
      message: 'Card added successfully.',
      card
    };
  }

  setDefaultPaymentCard(paymentCardId) {
    const account = this._requireAuthenticated();
    const cards = this._getFromStorage('payment_cards');
    const now = this._nowISO();

    let found = false;

    for (const card of cards) {
      if (card.accountId !== account.id || !card.isActive) continue;
      if (card.id === paymentCardId) {
        card.isDefault = true;
        found = true;
      } else {
        card.isDefault = false;
      }
    }

    if (!found) {
      return {
        success: false,
        defaultPaymentCardId: account.defaultPaymentCardId || null
      };
    }

    this._saveToStorage('payment_cards', cards);

    const accounts = this._getFromStorage('account_profiles');
    const acc = accounts.find(a => a.id === account.id);
    if (acc) {
      acc.defaultPaymentCardId = paymentCardId;
      acc.updatedAt = now;
      this._saveToStorage('account_profiles', accounts);
    }

    return {
      success: true,
      defaultPaymentCardId: paymentCardId
    };
  }

  deactivatePaymentCard(paymentCardId) {
    const account = this._requireAuthenticated();
    const cards = this._getFromStorage('payment_cards');

    const card = cards.find(c => c.id === paymentCardId && c.accountId === account.id) || null;
    if (!card) {
      return { success: false };
    }

    card.isActive = false;
    card.isDefault = false;
    this._saveToStorage('payment_cards', cards);

    const accounts = this._getFromStorage('account_profiles');
    const acc = accounts.find(a => a.id === account.id);
    if (acc && acc.defaultPaymentCardId === paymentCardId) {
      acc.defaultPaymentCardId = null;
      acc.updatedAt = this._nowISO();
      this._saveToStorage('account_profiles', accounts);
    }

    return { success: true };
  }

  // -----------------------
  // Rewards & loyalty
  // -----------------------
  getRewardsOverview() {
    const account = this._requireAuthenticated();
    const redemptions = this._getFromStorage('reward_redemptions');

    const accountRedemptions = redemptions.filter(r => r.accountId === account.id);
    const hydrated = accountRedemptions.map(r => this._hydrateForeignKeys(r));

    return {
      loyaltyPointsBalance: account.loyaltyPointsBalance,
      loyaltyTier: account.loyaltyTier,
      recentRedemptions: hydrated
    };
  }

  getRewardFilterOptions() {
    const rewards = this._getFromStorage('rewards');
    const categoriesSet = new Set();
    rewards.forEach(r => {
      if (r.category) categoriesSet.add(r.category);
    });

    const categories = Array.from(categoriesSet).map(key => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1)
    }));

    // Rating options: from 1 to 5
    const ratingOptions = [1, 2, 3, 4, 5];

    // Price ranges: derive simple buckets from data if available
    const prices = rewards.map(r => r.price).filter(p => typeof p === 'number');
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const priceRanges = maxPrice
      ? [
          { min: 0, max: 5, label: 'Under $5' },
          { min: 5, max: 10, label: '$5 - $10' },
          { min: 10, max: null, label: 'Over $10' }
        ]
      : [];

    return {
      categories,
      ratingOptions,
      priceRanges
    };
  }

  getRewardList(category, minRating, maxPrice, sortBy) {
    this._requireAuthenticated();
    const rewards = this._getFromStorage('rewards');

    let filtered = rewards.filter(r => r.isAvailable);

    if (category) {
      filtered = filtered.filter(r => r.category === category);
    }

    if (typeof minRating === 'number') {
      filtered = filtered.filter(r => (r.rating || 0) >= minRating);
    }

    if (typeof maxPrice === 'number') {
      filtered = filtered.filter(r => r.price <= maxPrice);
    }

    if (sortBy === 'rating_desc') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price_asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => b.price - a.price);
    }

    return filtered.map(r => this._hydrateForeignKeys(r));
  }

  getRewardDetail(rewardId) {
    const account = this._requireAuthenticated();
    const rewards = this._getFromStorage('rewards');
    const reward = rewards.find(r => r.id === rewardId) || null;
    if (!reward) {
      return {
        reward: null,
        canRedeem: false,
        reasonNotRedeemable: 'Reward not found.',
        currentPointsBalance: account.loyaltyPointsBalance
      };
    }

    let canRedeem = true;
    let reason = '';

    if (!reward.isAvailable) {
      canRedeem = false;
      reason = 'Reward is not currently available.';
    } else if (account.loyaltyPointsBalance < reward.pointsRequired) {
      canRedeem = false;
      reason = 'Not enough points to redeem this reward.';
    }

    return {
      reward: this._hydrateForeignKeys(reward),
      canRedeem,
      reasonNotRedeemable: reason,
      currentPointsBalance: account.loyaltyPointsBalance
    };
  }

  redeemReward(rewardId, quantity) {
    const account = this._requireAuthenticated();
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const rewards = this._getFromStorage('rewards');
    const reward = rewards.find(r => r.id === rewardId) || null;
    if (!reward || !reward.isAvailable) {
      return {
        success: false,
        message: 'Reward not available.',
        redemption: null,
        updatedPointsBalance: account.loyaltyPointsBalance
      };
    }

    const totalPointsRequired = reward.pointsRequired * qty;
    if (account.loyaltyPointsBalance < totalPointsRequired) {
      return {
        success: false,
        message: 'Not enough points to redeem this reward.',
        redemption: null,
        updatedPointsBalance: account.loyaltyPointsBalance
      };
    }

    const redemptions = this._getFromStorage('reward_redemptions');
    const now = this._nowISO();

    const redemption = {
      id: this._generateId('rr'),
      rewardId: reward.id,
      redeemedAt: now,
      pointsSpent: totalPointsRequired,
      quantity: qty,
      orderId: null,
      status: 'pending',
      accountId: account.id
    };

    redemptions.push(redemption);
    this._saveToStorage('reward_redemptions', redemptions);

    const accounts = this._getFromStorage('account_profiles');
    const acc = accounts.find(a => a.id === account.id);
    if (acc) {
      acc.loyaltyPointsBalance -= totalPointsRequired;
      if (acc.loyaltyPointsBalance < 0) acc.loyaltyPointsBalance = 0;
      acc.updatedAt = now;
      this._saveToStorage('account_profiles', accounts);
    }

    const updatedAccount = this._getCurrentAccount() || account;

    return {
      success: true,
      message: 'Reward redeemed successfully.',
      redemption: this._hydrateForeignKeys(redemption),
      updatedPointsBalance: updatedAccount.loyaltyPointsBalance
    };
  }

  addRewardRedemptionToCurrentOrder(rewardRedemptionId) {
    const account = this._requireAuthenticated();
    const redemptions = this._getFromStorage('reward_redemptions');
    const rewards = this._getFromStorage('rewards');
    const products = this._getFromStorage('products');

    const redemption = redemptions.find(r => r.id === rewardRedemptionId && r.accountId === account.id) || null;
    if (!redemption || redemption.status !== 'pending') {
      return {
        success: false,
        orderItem: null,
        orderSummary: {
          itemCount: 0,
          totalAmount: 0
        }
      };
    }

    const reward = rewards.find(r => r.id === redemption.rewardId) || null;
    if (!reward || !reward.productId) {
      return {
        success: false,
        orderItem: null,
        orderSummary: {
          itemCount: 0,
          totalAmount: 0
        }
      };
    }

    const product = products.find(p => p.id === reward.productId) || null;

    const order = this._getOrCreateCurrentOrder();
    const orderItems = this._getFromStorage('order_items');

    const qty = redemption.quantity || 1;
    const now = this._nowISO();

    const orderItem = {
      id: this._generateId('oi'),
      orderId: order.id,
      productId: product ? product.id : (reward.productId || reward.id),
      productName: product ? product.name : reward.name,
      size: (product && product.defaultSize) ? product.defaultSize : 'medium',
      milkType: null,
      quantity: qty,
      unitPrice: 0,
      totalPrice: 0,
      isRewardRedemption: true,
      rewardRedemptionId: redemption.id,
      createdAt: now
    };

    orderItems.push(orderItem);
    this._saveToStorage('order_items', orderItems);

    redemption.status = 'applied';
    redemption.orderId = order.id;
    this._saveToStorage('reward_redemptions', redemptions);

    const totals = this._recalculateOrderTotals(order.id);
    const updatedOrder = totals ? totals.order : order;
    const itemsForOrder = totals ? totals.items : orderItems.filter(i => i.orderId === order.id);
    const itemCount = itemsForOrder.reduce((sum, i) => sum + (i.quantity || 0), 0);

    return {
      success: true,
      orderItem,
      orderSummary: {
        itemCount,
        totalAmount: updatedOrder.totalAmount
      }
    };
  }

  // -----------------------
  // Order history & reordering
  // -----------------------
  getOrderHistoryItems(sortBy, page, pageSize) {
    const account = this._requireAuthenticated();
    const orders = this._getFromStorage('orders');
    const items = this._getFromStorage('order_items');

    const completedOrders = orders.filter(o => o.status !== 'draft' && (!o.accountId || o.accountId === account.id));
    const orderMap = new Map();
    completedOrders.forEach(o => orderMap.set(o.id, o));

    let historyItems = [];
    for (const item of items) {
      const order = orderMap.get(item.orderId);
      if (!order) continue;
      historyItems.push({
        orderItemId: item.id,
        orderId: order.id,
        orderDate: order.createdAt,
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        milkType: item.milkType || null,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice
      });
    }

    // Sorting
    if (sortBy === 'price_low_to_high') {
      historyItems.sort((a, b) => a.unitPrice - b.unitPrice);
    } else if (sortBy === 'price_high_to_low') {
      historyItems.sort((a, b) => b.unitPrice - a.unitPrice);
    } else if (sortBy === 'date_newest') {
      historyItems.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    } else if (sortBy === 'date_oldest') {
      historyItems.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
    }

    const totalItems = historyItems.length;
    const pageNum = page && page > 0 ? page : 1;
    const sizeNum = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pageNum - 1) * sizeNum;
    const end = start + sizeNum;
    const pagedItems = historyItems.slice(start, end);

    // Foreign key resolution for productId and orderId
    const products = this._getFromStorage('products');

    const enrichedItems = pagedItems.map(it => {
      const product = products.find(p => p.id === it.productId) || null;
      const order = orderMap.get(it.orderId) || null;
      return {
        ...it,
        product: product ? { ...product } : null,
        order: order ? { ...order } : null
      };
    });

    return {
      items: enrichedItems,
      page: pageNum,
      pageSize: sizeNum,
      totalItems
    };
  }

  reorderPastItem(orderItemId) {
    const account = this._requireAuthenticated();
    const orders = this._getFromStorage('orders');
    const items = this._getFromStorage('order_items');

    const pastItem = items.find(i => i.id === orderItemId) || null;
    if (!pastItem) {
      return {
        success: false,
        currentOrderId: null,
        orderItem: null,
        orderSummary: null
      };
    }

    const pastOrder = orders.find(o => o.id === pastItem.orderId) || null;
    if (!pastOrder || (pastOrder.accountId && pastOrder.accountId !== account.id)) {
      return {
        success: false,
        currentOrderId: null,
        orderItem: null,
        orderSummary: null
      };
    }

    const order = this._getOrCreateCurrentOrder(pastOrder.storeId);
    const orderItems = this._getFromStorage('order_items');

    const now = this._nowISO();
    const newItem = {
      id: this._generateId('oi'),
      orderId: order.id,
      productId: pastItem.productId,
      productName: pastItem.productName,
      size: pastItem.size,
      milkType: pastItem.milkType || null,
      quantity: 1,
      unitPrice: pastItem.unitPrice,
      totalPrice: pastItem.unitPrice * 1,
      isRewardRedemption: false,
      rewardRedemptionId: null,
      createdAt: now
    };

    orderItems.push(newItem);
    this._saveToStorage('order_items', orderItems);

    const totals = this._recalculateOrderTotals(order.id);
    const updatedOrder = totals ? totals.order : order;
    const itemsForOrder = totals ? totals.items : orderItems.filter(i => i.orderId === order.id);
    const itemCount = itemsForOrder.reduce((sum, i) => sum + (i.quantity || 0), 0);

    return {
      success: true,
      currentOrderId: updatedOrder.id,
      orderItem: newItem,
      orderSummary: {
        itemCount,
        subtotalAmount: updatedOrder.subtotalAmount,
        totalAmount: updatedOrder.totalAmount
      }
    };
  }

  // -----------------------
  // Notification preferences
  // -----------------------
  getNotificationPreferences() {
    const account = this._requireAuthenticated();
    const prefs = this._getFromStorage('notification_preferences');
    let pref = prefs.find(p => p.accountId === account.id) || null;

    if (!pref) {
      const result = this.updateNotificationPreferences({});
      return {
        preferences: result.preferences
      };
    }

    return {
      preferences: this._hydrateForeignKeys(pref)
    };
  }

  updateNotificationPreferences(preferences) {
    const account = this._requireAuthenticated();
    const prefs = this._getFromStorage('notification_preferences');
    let pref = prefs.find(p => p.accountId === account.id) || null;

    const now = this._nowISO();
    if (!pref) {
      pref = {
        id: this._generateId('np'),
        accountId: account.id,
        emailPromotionsEnabled: false,
        emailOrderUpdatesEnabled: true,
        pushPromotionsEnabled: false,
        pushOrderUpdatesEnabled: false,
        smsOrderUpdatesEnabled: false,
        smsPromotionsEnabled: false,
        updatedAt: now
      };
      prefs.push(pref);
    }

    const keys = [
      'emailPromotionsEnabled',
      'emailOrderUpdatesEnabled',
      'pushPromotionsEnabled',
      'pushOrderUpdatesEnabled',
      'smsOrderUpdatesEnabled',
      'smsPromotionsEnabled'
    ];

    keys.forEach(k => {
      if (Object.prototype.hasOwnProperty.call(preferences || {}, k)) {
        pref[k] = !!preferences[k];
      }
    });

    pref.updatedAt = now;
    this._saveToStorage('notification_preferences', prefs);

    return {
      success: true,
      preferences: this._hydrateForeignKeys(pref)
    };
  }

  // -----------------------
  // Security & password
  // -----------------------
  getSecuritySettingsSummary() {
    const account = this._requireAuthenticated();
    return {
      email: account.email,
      passwordLastChangedAt: account.passwordLastChangedAt || null
    };
  }

  updatePassword(currentPassword, newPassword, confirmNewPassword) {
    const account = this._requireAuthenticated();
    const accounts = this._getFromStorage('account_profiles');
    const acc = accounts.find(a => a.id === account.id) || null;

    if (!acc || acc.password !== currentPassword) {
      return {
        success: false,
        message: 'Current password is incorrect.',
        passwordLastChangedAt: acc ? acc.passwordLastChangedAt : null
      };
    }

    if (newPassword !== confirmNewPassword) {
      return {
        success: false,
        message: 'New password and confirmation do not match.',
        passwordLastChangedAt: acc.passwordLastChangedAt
      };
    }

    const pwCheck = this._validatePasswordStrength(newPassword);
    if (!pwCheck.valid) {
      return {
        success: false,
        message: pwCheck.message,
        passwordLastChangedAt: acc.passwordLastChangedAt
      };
    }

    const now = this._nowISO();
    acc.password = String(newPassword);
    acc.passwordLastChangedAt = now;
    acc.updatedAt = now;
    this._saveToStorage('account_profiles', accounts);

    return {
      success: true,
      message: 'Password updated successfully.',
      passwordLastChangedAt: now
    };
  }

  // -----------------------
  // Static & support content
  // -----------------------
  getAboutPageContent() {
    const content = this._getObjectFromStorage('about_page_content', null);
    if (!content) {
      // Return empty structure if not configured in localStorage
      return {
        title: '',
        sections: []
      };
    }
    return content;
  }

  getSupportContactInfo() {
    const info = this._getObjectFromStorage('support_contact_info', null);
    if (!info) {
      return {
        supportEmail: '',
        supportPhone: '',
        supportHours: ''
      };
    }
    return info;
  }

  submitSupportRequest(name, email, topic, message) {
    const reqs = this._getFromStorage('support_requests');
    const now = this._nowISO();
    const ticketId = this._generateId('ticket');

    const request = {
      id: ticketId,
      name: String(name || '').trim(),
      email: String(email || '').trim(),
      topic: topic || null,
      message: String(message || '').trim(),
      createdAt: now
    };

    reqs.push(request);
    this._saveToStorage('support_requests', reqs);

    return {
      success: true,
      ticketId,
      message: 'Support request submitted.'
    };
  }

  getHelpTopics() {
    const topics = this._getFromStorage('help_topics');
    return topics;
  }

  getHelpArticle(articleSlug) {
    const articles = this._getFromStorage('help_articles');
    const article = articles.find(a => a.slug === articleSlug) || null;
    if (!article) {
      return {
        slug: articleSlug,
        title: '',
        body: ''
      };
    }
    return article;
  }

  getTermsOfUseContent() {
    const content = this._getObjectFromStorage('terms_of_use_content', null);
    if (!content) {
      return {
        lastUpdated: null,
        content: ''
      };
    }
    return content;
  }

  getPrivacyPolicyContent() {
    const content = this._getObjectFromStorage('privacy_policy_content', null);
    if (!content) {
      return {
        lastUpdated: null,
        content: ''
      };
    }
    return content;
  }

  // -----------------------
  // Template method from original example (kept but unused)
  // -----------------------
  addToCart(userId, productId, quantity = 1) {
    // This method is part of the provided template and not used in the coffee shop logic.
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cartItems');

    let cart = carts.find(c => c.userId === userId);
    if (!cart) {
      cart = { id: this._generateId('cart'), userId };
      carts.push(cart);
    }

    let item = cartItems.find(ci => ci.cartId === cart.id && ci.productId === productId);
    if (!item) {
      item = {
        id: this._generateId('ci'),
        cartId: cart.id,
        productId,
        quantity: 0
      };
      cartItems.push(item);
    }

    item.quantity += quantity;

    this._saveToStorage('carts', carts);
    this._saveToStorage('cartItems', cartItems);

    return { success: true, cartId: cart.id };
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