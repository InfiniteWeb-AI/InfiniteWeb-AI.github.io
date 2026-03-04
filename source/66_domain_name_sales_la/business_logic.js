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

  // ----------------------
  // Storage & ID helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'domains',
      'sellers',
      'domain_recommendations',
      'lease_plans',
      'carts',
      'cart_items',
      'checkout_sessions',
      'offers',
      'faq_items',
      'support_messages',
      'alert_subscriptions',
      'contact_requests',
      'site_preferences',
      'currencies',
      'checkout_drafts'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _clone(value) {
    if (value === null || value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? this._clone(defaultValue) : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? this._clone(defaultValue) : [];
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

  // ----------------------
  // Currency & pricing helpers
  // ----------------------

  _getOrCreateSitePreferences() {
    let prefsArr = this._getFromStorage('site_preferences', []);
    if (!Array.isArray(prefsArr)) {
      prefsArr = [];
    }
    if (prefsArr.length === 0) {
      const now = new Date().toISOString();
      const pref = {
        id: this._generateId('sitepref'),
        selectedCurrency: 'usd',
        lastUpdated: now
      };
      prefsArr.push(pref);
      this._saveToStorage('site_preferences', prefsArr);
      return pref;
    }
    return prefsArr[0];
  }

  _getSelectedCurrencyCode() {
    const prefs = this._getOrCreateSitePreferences();
    return prefs && prefs.selectedCurrency ? prefs.selectedCurrency : 'usd';
  }

  _getCurrencyDisplayInfo(code) {
    const currencies = this._getFromStorage('currencies', []);
    const found = currencies.find(c => c.code === code);
    if (found) {
      return {
        code: found.code,
        name: found.name,
        symbol: found.symbol,
        rateToUsd: typeof found.rateToUsd === 'number' ? found.rateToUsd : 1,
        isDefault: !!found.isDefault
      };
    }
    // Fallback defaults if no currency records are configured
    if (code === 'eur') {
      return { code: 'eur', name: 'Euro', symbol: '\u20ac', rateToUsd: 1, isDefault: false };
    }
    if (code === 'gbp') {
      return { code: 'gbp', name: 'British Pound', symbol: '\u00a3', rateToUsd: 1, isDefault: false };
    }
    // Default to USD
    return { code: 'usd', name: 'US Dollar', symbol: '$', rateToUsd: 1, isDefault: true };
  }

  // amount: number, fromCurrency/toCurrency: 'usd'|'eur'|'gbp'
  _convertPriceToSelectedCurrency(amount, fromCurrency, toCurrency) {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return { amount: 0, currencyCode: toCurrency, formatted: this._formatPrice(0, toCurrency) };
    }
    const fromCode = fromCurrency || 'usd';
    const toCode = toCurrency || this._getSelectedCurrencyCode();
    if (fromCode === toCode) {
      return { amount, currencyCode: toCode, formatted: this._formatPrice(amount, toCode) };
    }
    const fromInfo = this._getCurrencyDisplayInfo(fromCode);
    const toInfo = this._getCurrencyDisplayInfo(toCode);
    // Interpret rateToUsd as: 1 unit of currency = rateToUsd USD
    const amountInUsd = amount * (fromInfo.rateToUsd || 1);
    const converted = amountInUsd / (toInfo.rateToUsd || 1);
    const rounded = Math.round(converted * 100) / 100;
    return { amount: rounded, currencyCode: toCode, formatted: this._formatPrice(rounded, toCode) };
  }

  _formatPrice(amount, currencyCode) {
    const info = this._getCurrencyDisplayInfo(currencyCode);
    const safeAmount = isNaN(amount) ? 0 : amount;
    try {
      return info.symbol + safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) {
      return info.symbol + safeAmount.toFixed(2);
    }
  }

  // ----------------------
  // Context helpers
  // ----------------------

  _getCurrentDomainContext() {
    const domains = this._getFromStorage('domains', []);
    if (!domains || domains.length === 0) return null;

    const currentDomainId = localStorage.getItem('current_domain_id');
    if (currentDomainId) {
      const dom = domains.find(d => d.id === currentDomainId);
      if (dom) return dom;
    }

    const primary = domains.find(d => d.isPrimaryDomain === true);
    if (primary) return primary;

    return domains[0] || null;
  }

  _getCurrentSellerContext() {
    const sellers = this._getFromStorage('sellers', []);
    if (!sellers || sellers.length === 0) return null;

    const explicitId = localStorage.getItem('current_seller_id');
    if (explicitId) {
      const seller = sellers.find(s => s.id === explicitId);
      if (seller) return seller;
    }

    const domain = this._getCurrentDomainContext();
    if (domain && domain.sellerId) {
      const seller = sellers.find(s => s.id === domain.sellerId);
      if (seller) return seller;
    }

    return sellers[0] || null;
  }

  _getCurrentCartId() {
    return localStorage.getItem('current_cart_id');
  }

  _getCurrentCart() {
    const cartId = this._getCurrentCartId();
    if (!cartId) return null;
    const carts = this._getFromStorage('carts', []);
    return carts.find(c => c.id === cartId) || null;
  }

  // Internal helper to retrieve or create the current cart (single-user)
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    const selectedCurrency = this._getSelectedCurrencyCode();

    let cartId = this._getCurrentCartId();
    let cart = null;
    if (cartId) {
      cart = carts.find(c => c.id === cartId) || null;
    }

    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        currency: selectedCurrency,
        items: [], // array of cart_item IDs
        createdAt: now,
        updatedAt: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _getCheckoutDrafts() {
    return this._getFromStorage('checkout_drafts', []);
  }

  _getCurrentCheckoutDraftId() {
    return localStorage.getItem('current_checkout_draft_id');
  }

  _getCurrentCheckoutDraft() {
    const id = this._getCurrentCheckoutDraftId();
    if (!id) return null;
    const drafts = this._getCheckoutDrafts();
    return drafts.find(d => d.id === id) || null;
  }

  // Internal helper to create a new checkout draft
  _getOrCreateCheckoutDraft(mode, source, data) {
    const now = new Date().toISOString();
    const draft = {
      id: this._generateId('chkdraft'),
      mode: mode, // 'one_time' or 'lease'
      source: source, // 'buy_now_button', 'cart', 'lease_plans', 'buy_now_from_portfolio'
      domainIds: (data && Array.isArray(data.domainIds)) ? data.domainIds.slice() : [],
      cartId: data && data.cartId ? data.cartId : null,
      leasePlanId: data && data.leasePlanId ? data.leasePlanId : null,
      currency: (data && data.currency) ? data.currency : this._getSelectedCurrencyCode(),
      totalAmount: (data && typeof data.totalAmount === 'number') ? data.totalAmount : 0,
      createdAt: now,
      updatedAt: now
    };

    const drafts = this._getCheckoutDrafts();
    drafts.push(draft);
    this._saveToStorage('checkout_drafts', drafts);
    localStorage.setItem('current_checkout_draft_id', draft.id);

    return draft;
  }

  _getFaqCategoryLabel(code) {
    switch (code) {
      case 'payment_options':
        return 'Payment options';
      case 'domain_transfer_process':
        return 'Domain transfer process';
      case 'refunds_cancellations':
        return 'Refunds & cancellations';
      case 'general':
      default:
        return 'General';
    }
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getSitePreferences
  getSitePreferences() {
    const pref = this._getOrCreateSitePreferences();
    return {
      selectedCurrency: pref.selectedCurrency,
      lastUpdated: pref.lastUpdated || null
    };
  }

  // getSupportedCurrencies
  getSupportedCurrencies() {
    const currenciesRaw = this._getFromStorage('currencies', []);
    const prefs = this._getOrCreateSitePreferences();
    const selected = prefs.selectedCurrency || 'usd';
    const currencies = (currenciesRaw || []).map(c => ({
      code: c.code,
      name: c.name,
      symbol: c.symbol,
      isDefault: !!c.isDefault,
      rateToUsd: c.rateToUsd,
      isSelected: c.code === selected
    }));
    return { currencies };
  }

  // setSelectedCurrency(currencyCode)
  setSelectedCurrency(currencyCode) {
    const allowed = ['usd', 'eur', 'gbp'];
    const prefs = this._getOrCreateSitePreferences();
    if (!allowed.includes(currencyCode)) {
      return {
        selectedCurrency: prefs.selectedCurrency,
        success: false,
        message: 'Unsupported currency code.'
      };
    }
    let prefsArr = this._getFromStorage('site_preferences', []);
    if (!Array.isArray(prefsArr) || prefsArr.length === 0) {
      prefsArr = [prefs];
    }
    prefsArr[0].selectedCurrency = currencyCode;
    prefsArr[0].lastUpdated = new Date().toISOString();
    this._saveToStorage('site_preferences', prefsArr);

    // Instrumentation for task completion tracking (task_5)
    try {
      const existingSequence = localStorage.getItem('task5_currencySequence') || '';
      const newSequence = existingSequence ? (existingSequence + '>' + currencyCode) : currencyCode;
      localStorage.setItem('task5_currencySequence', newSequence);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      selectedCurrency: currencyCode,
      success: true,
      message: 'Selected currency updated.'
    };
  }

  // getCurrentDomainLandingData
  getCurrentDomainLandingData() {
    const domain = this._getCurrentDomainContext();
    const seller = this._getCurrentSellerContext();
    const selectedCurrency = this._getSelectedCurrencyCode();

    let domainData = null;
    if (domain) {
      const baseCurrency = domain.currency || 'usd';
      const conv = this._convertPriceToSelectedCurrency(domain.buyNowPrice || 0, baseCurrency, selectedCurrency);
      domainData = {
        id: domain.id,
        name: domain.name,
        sld: domain.sld,
        tld: domain.tld,
        nameLength: domain.nameLength,
        label: domain.label || null,
        description: domain.description || null,
        isPrimaryDomain: !!domain.isPrimaryDomain,
        status: domain.status,
        buyNowPrice: conv.amount,
        baseCurrency: baseCurrency,
        displayCurrency: conv.currencyCode,
        formattedPriceDisplay: conv.formatted,
        allowMakeOffer: !!domain.allowMakeOffer,
        allowLeaseToOwn: !!domain.allowLeaseToOwn,
        minOfferAmount: domain.minOfferAmount !== undefined ? domain.minOfferAmount : null,
        sellerId: domain.sellerId || null,
        category: domain.category || null,
        tags: Array.isArray(domain.tags) ? domain.tags : []
      };
    }

    const cart = this._getCurrentCart();
    const cartItemsAll = this._getFromStorage('cart_items', []);
    let hasCartItems = false;
    let cartItemCount = 0;
    if (cart) {
      const itemsForCart = cartItemsAll.filter(ci => ci.cartId === cart.id);
      hasCartItems = itemsForCart.length > 0;
      cartItemCount = itemsForCart.length;
    }

    const sellerData = seller
      ? {
          id: seller.id,
          name: seller.name,
          description: seller.description || null
        }
      : null;

    return {
      domain: domainData,
      seller: sellerData,
      hasCartItems: hasCartItems,
      cartItemCount: cartItemCount
    };
  }

  // getLeasePlansForCurrentDomain(sortBy, sortDirection)
  getLeasePlansForCurrentDomain(sortBy, sortDirection) {
    const domain = this._getCurrentDomainContext();
    const selectedCurrency = this._getSelectedCurrencyCode();
    const appliedSortBy = sortBy || 'monthly_price';
    const appliedSortDirection = (sortDirection === 'desc') ? 'desc' : 'asc';

    if (!domain) {
      return {
        domainId: null,
        plans: [],
        appliedSortBy,
        appliedSortDirection
      };
    }

    const allPlans = this._getFromStorage('lease_plans', []);
    let plans = allPlans.filter(p => p.domainId === domain.id && p.status === 'active');

    plans = plans.map(p => {
      const baseCurrency = p.currency || 'usd';
      const convMonthly = this._convertPriceToSelectedCurrency(p.monthlyPrice || 0, baseCurrency, selectedCurrency);
      const convTotal = this._convertPriceToSelectedCurrency(p.totalPrice || 0, baseCurrency, selectedCurrency);
      return {
        id: p.id,
        name: p.name,
        durationMonths: p.durationMonths,
        monthlyPrice: convMonthly.amount,
        totalPrice: convTotal.amount,
        currency: convMonthly.currencyCode,
        status: p.status,
        isDefault: !!p.isDefault
      };
    });

    const sortFieldMap = {
      'monthly_price': 'monthlyPrice',
      'duration_months': 'durationMonths',
      'total_price': 'totalPrice'
    };
    const field = sortFieldMap[appliedSortBy] || 'monthlyPrice';

    plans.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      if (appliedSortDirection === 'asc') {
        return av < bv ? -1 : 1;
      }
      return av > bv ? -1 : 1;
    });

    return {
      domainId: domain.id,
      plans,
      appliedSortBy,
      appliedSortDirection
    };
  }

  // getSimilarDomainsFilterOptionsForCurrentDomain
  getSimilarDomainsFilterOptionsForCurrentDomain() {
    const domain = this._getCurrentDomainContext();
    const selectedCurrency = this._getSelectedCurrencyCode();
    if (!domain) {
      return {
        extensionOptions: [],
        minPrice: null,
        maxPrice: null,
        priceStep: null,
        displayCurrency: selectedCurrency
      };
    }

    const recs = this._getFromStorage('domain_recommendations', []);
    const allDomains = this._getFromStorage('domains', []);

    const recForDomain = recs.filter(r => r.sourceDomainId === domain.id && r.sectionType === 'similar_domains');
    const recommendedDomains = [];
    for (let i = 0; i < recForDomain.length; i++) {
      const r = recForDomain[i];
      const d = allDomains.find(dom => dom.id === r.recommendedDomainId);
      if (d) recommendedDomains.push(d);
    }

    const tlds = Array.from(new Set(recommendedDomains.map(d => d.tld))).filter(Boolean);
    const extensionOptions = tlds.map(tld => ({ value: tld, label: tld }));

    if (recommendedDomains.length === 0) {
      return {
        extensionOptions,
        minPrice: null,
        maxPrice: null,
        priceStep: null,
        displayCurrency: selectedCurrency
      };
    }

    const prices = recommendedDomains
      .map(d => typeof d.buyNowPrice === 'number' ? d.buyNowPrice : 0)
      .filter(v => !isNaN(v));

    const minPrice = prices.length ? Math.min.apply(null, prices) : null;
    const maxPrice = prices.length ? Math.max.apply(null, prices) : null;
    let priceStep = null;
    if (minPrice !== null && maxPrice !== null && maxPrice > minPrice) {
      priceStep = Math.max(100, Math.round((maxPrice - minPrice) / 10));
    }

    return {
      extensionOptions,
      minPrice,
      maxPrice,
      priceStep,
      displayCurrency: selectedCurrency
    };
  }

  // getSimilarDomainsForCurrentDomain(extensionFilter, maxPrice)
  getSimilarDomainsForCurrentDomain(extensionFilter, maxPrice) {
    const domain = this._getCurrentDomainContext();
    const selectedCurrency = this._getSelectedCurrencyCode();
    if (!domain) {
      return {
        domains: [],
        appliedExtensionFilter: extensionFilter || null,
        appliedMaxPrice: maxPrice || null
      };
    }

    const recs = this._getFromStorage('domain_recommendations', []);
    const allDomains = this._getFromStorage('domains', []);

    const recForDomain = recs.filter(r => r.sourceDomainId === domain.id && r.sectionType === 'similar_domains');
    const result = [];

    for (let i = 0; i < recForDomain.length; i++) {
      const r = recForDomain[i];
      const d = allDomains.find(dom => dom.id === r.recommendedDomainId);
      if (!d) continue;
      if (d.status && d.status !== 'available') continue;
      if (extensionFilter && d.tld !== extensionFilter) continue;

      const baseCurrency = d.currency || 'usd';
      const conv = this._convertPriceToSelectedCurrency(d.buyNowPrice || 0, baseCurrency, selectedCurrency);
      if (typeof maxPrice === 'number' && !isNaN(maxPrice)) {
        if (conv.amount > maxPrice) continue;
      }

      result.push({
        id: d.id,
        name: d.name,
        sld: d.sld,
        tld: d.tld,
        nameLength: d.nameLength,
        status: d.status,
        buyNowPrice: conv.amount,
        baseCurrency: baseCurrency,
        displayCurrency: conv.currencyCode,
        formattedPriceDisplay: conv.formatted,
        isFeatured: !!d.isFeatured
      });
    }

    // Keep natural order based on recommendations; could be sorted by rank if needed
    return {
      domains: result,
      appliedExtensionFilter: extensionFilter || null,
      appliedMaxPrice: (typeof maxPrice === 'number' && !isNaN(maxPrice)) ? maxPrice : null
    };
  }

  // addDomainToCart(domainId, type = 'one_time', leasePlanId, quantity = 1)
  addDomainToCart(domainId, type, leasePlanId, quantity) {
    const allDomains = this._getFromStorage('domains', []);
    const domain = allDomains.find(d => d.id === domainId);
    if (!domain || (domain.status && domain.status !== 'available')) {
      const currentCart = this._getCurrentCart();
      const cartItemsAll = this._getFromStorage('cart_items', []);
      const itemsForCart = currentCart ? cartItemsAll.filter(ci => ci.cartId === currentCart.id) : [];
      return {
        cartId: currentCart ? currentCart.id : null,
        cartItemId: null,
        itemCount: itemsForCart.length,
        success: false,
        message: 'Domain not available.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const itemType = type || 'one_time';
    const qty = (typeof quantity === 'number' && quantity > 0) ? quantity : 1;

    let unitPrice = 0;
    let itemCurrency = cart.currency || this._getSelectedCurrencyCode();

    if (itemType === 'lease' && leasePlanId) {
      const plans = this._getFromStorage('lease_plans', []);
      const plan = plans.find(p => p.id === leasePlanId && p.domainId === domain.id);
      if (!plan) {
        return {
          cartId: cart.id,
          cartItemId: null,
          itemCount: cartItems.filter(ci => ci.cartId === cart.id).length,
          success: false,
          message: 'Lease plan not found for this domain.'
        };
      }
      const conv = this._convertPriceToSelectedCurrency(plan.monthlyPrice || 0, plan.currency || 'usd', itemCurrency);
      unitPrice = conv.amount;
    } else {
      const conv = this._convertPriceToSelectedCurrency(domain.buyNowPrice || 0, domain.currency || 'usd', itemCurrency);
      unitPrice = conv.amount;
    }

    let existing = cartItems.find(ci => ci.cartId === cart.id && ci.domainId === domain.id && ci.type === itemType && (ci.leasePlanId || null) === (leasePlanId || null));

    if (existing) {
      existing.quantity += qty;
      existing.unitPrice = unitPrice; // update to latest price
      existing.addedAt = existing.addedAt || new Date().toISOString();
    } else {
      existing = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        domainId: domain.id,
        type: itemType,
        leasePlanId: itemType === 'lease' ? (leasePlanId || null) : null,
        quantity: qty,
        unitPrice: unitPrice,
        currency: itemCurrency,
        addedAt: new Date().toISOString()
      };
      cartItems.push(existing);
      if (!Array.isArray(cart.items)) {
        cart.items = [];
      }
      if (!cart.items.includes(existing.id)) {
        cart.items.push(existing.id);
      }
    }

    // Update cart updatedAt
    let carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = Object.assign({}, cart, { updatedAt: new Date().toISOString() });
      this._saveToStorage('carts', carts);
    }

    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);

    return {
      cartId: cart.id,
      cartItemId: existing.id,
      itemCount: itemsForCart.length,
      success: true,
      message: 'Domain added to cart.'
    };
  }

  // getCartIconSummary
  getCartIconSummary() {
    const selectedCurrency = this._getSelectedCurrencyCode();
    const cart = this._getCurrentCart();
    if (!cart) {
      return {
        itemCount: 0,
        totalAmount: 0,
        currency: selectedCurrency
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);

    let subtotalInCartCurrency = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      const ci = itemsForCart[i];
      const lineTotal = (ci.unitPrice || 0) * (ci.quantity || 0);
      subtotalInCartCurrency += lineTotal;
    }

    const conv = this._convertPriceToSelectedCurrency(subtotalInCartCurrency, cart.currency || 'usd', selectedCurrency);

    return {
      itemCount: itemsForCart.length,
      totalAmount: conv.amount,
      currency: conv.currencyCode
    };
  }

  // getCartSummary
  getCartSummary() {
    const selectedCurrency = this._getSelectedCurrencyCode();
    const cart = this._getCurrentCart();
    const allCartItems = this._getFromStorage('cart_items', []);
    const allDomains = this._getFromStorage('domains', []);
    const allLeasePlans = this._getFromStorage('lease_plans', []);

    if (!cart) {
      return {
        cartId: null,
        cart: null,
        currency: selectedCurrency,
        items: [],
        subtotal: 0,
        total: 0,
        totalItems: 0,
        trustBadges: []
      };
    }

    const itemsForCart = allCartItems.filter(ci => ci.cartId === cart.id);
    const items = [];
    let subtotal = 0;

    for (let i = 0; i < itemsForCart.length; i++) {
      const ci = itemsForCart[i];
      const domain = allDomains.find(d => d.id === ci.domainId) || null;
      const leasePlan = ci.type === 'lease' && ci.leasePlanId
        ? (allLeasePlans.find(lp => lp.id === ci.leasePlanId) || null)
        : null;

      // Convert line prices from cart currency to selected display currency
      const baseCurrency = cart.currency || 'usd';
      const convUnit = this._convertPriceToSelectedCurrency(ci.unitPrice || 0, baseCurrency, selectedCurrency);
      const lineBase = (ci.unitPrice || 0) * (ci.quantity || 0);
      const convLine = this._convertPriceToSelectedCurrency(lineBase, baseCurrency, selectedCurrency);

      subtotal += convLine.amount;

      let domainDisplay = null;
      if (domain) {
        const domainConv = this._convertPriceToSelectedCurrency(domain.buyNowPrice || 0, domain.currency || 'usd', selectedCurrency);
        domainDisplay = {
          id: domain.id,
          name: domain.name,
          sld: domain.sld,
          tld: domain.tld,
          buyNowPrice: domainConv.amount,
          formattedPriceDisplay: domainConv.formatted
        };
      }

      let leasePlanDisplay = null;
      if (leasePlan) {
        const lpMonthlyConv = this._convertPriceToSelectedCurrency(leasePlan.monthlyPrice || 0, leasePlan.currency || 'usd', selectedCurrency);
        const lpTotalConv = this._convertPriceToSelectedCurrency(leasePlan.totalPrice || 0, leasePlan.currency || 'usd', selectedCurrency);
        leasePlanDisplay = {
          id: leasePlan.id,
          name: leasePlan.name,
          durationMonths: leasePlan.durationMonths,
          monthlyPrice: lpMonthlyConv.amount,
          totalPrice: lpTotalConv.amount
        };
      }

      items.push({
        cartItemId: ci.id,
        cartItem: this._clone(ci), // FK resolution helper
        type: ci.type,
        quantity: ci.quantity,
        unitPrice: convUnit.amount,
        lineTotal: convLine.amount,
        currency: selectedCurrency,
        domain: domainDisplay,
        leasePlan: leasePlanDisplay
      });
    }

    const total = subtotal;

    return {
      cartId: cart.id,
      cart: this._clone(cart),
      currency: selectedCurrency,
      items,
      subtotal,
      total,
      totalItems: items.length,
      trustBadges: []
    };
  }

  // removeItemFromCart(cartItemId)
  removeItemFromCart(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      const cart = this._getCurrentCart();
      const summary = this.getCartIconSummary();
      return {
        success: false,
        message: 'Cart item not found.',
        cart: cart ? {
          cartId: cart.id,
          itemCount: summary.itemCount,
          total: summary.totalAmount,
          currency: summary.currency
        } : {
          cartId: null,
          itemCount: 0,
          total: 0,
          currency: this._getSelectedCurrencyCode()
        }
      };
    }

    const cartId = item.cartId;
    const carts = this._getFromStorage('carts', []);
    const cartIndex = carts.findIndex(c => c.id === cartId);
    if (cartIndex !== -1) {
      const cart = carts[cartIndex];
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== cartItemId);
      }
      cart.updatedAt = new Date().toISOString();
      carts[cartIndex] = cart;
      this._saveToStorage('carts', carts);
    }

    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const selectedCurrency = this._getSelectedCurrencyCode();
    const remainingForCart = cartItems.filter(ci => ci.cartId === cartId);
    let totalBase = 0;
    let cartCurrency = 'usd';
    const cart = carts.find(c => c.id === cartId) || null;
    if (cart) {
      cartCurrency = cart.currency || 'usd';
    }

    for (let i = 0; i < remainingForCart.length; i++) {
      const ci = remainingForCart[i];
      totalBase += (ci.unitPrice || 0) * (ci.quantity || 0);
    }

    const conv = this._convertPriceToSelectedCurrency(totalBase, cartCurrency, selectedCurrency);

    return {
      success: true,
      message: 'Item removed from cart.',
      cart: {
        cartId: cartId,
        itemCount: remainingForCart.length,
        total: conv.amount,
        currency: conv.currencyCode
      }
    };
  }

  // clearCart
  clearCart() {
    const cart = this._getCurrentCart();
    if (!cart) {
      return { success: true, message: 'Cart is already empty.' };
    }
    let cartItems = this._getFromStorage('cart_items', []);
    cartItems = cartItems.filter(ci => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].items = [];
      carts[idx].updatedAt = new Date().toISOString();
      this._saveToStorage('carts', carts);
    }

    return {
      success: true,
      message: 'Cart cleared.'
    };
  }

  // startOneTimeCheckoutFromCurrentDomain
  startOneTimeCheckoutFromCurrentDomain() {
    const domain = this._getCurrentDomainContext();
    const selectedCurrency = this._getSelectedCurrencyCode();

    if (!domain) {
      const draft = this._getOrCreateCheckoutDraft('one_time', 'buy_now_button', {
        domainIds: [],
        totalAmount: 0,
        currency: selectedCurrency
      });
      return {
        checkoutDraftId: draft.id,
        mode: 'one_time',
        source: 'buy_now_button',
        items: [],
        currency: selectedCurrency,
        totalAmount: 0
      };
    }

    const conv = this._convertPriceToSelectedCurrency(domain.buyNowPrice || 0, domain.currency || 'usd', selectedCurrency);
    const draft = this._getOrCreateCheckoutDraft('one_time', 'buy_now_button', {
      domainIds: [domain.id],
      totalAmount: conv.amount,
      currency: conv.currencyCode
    });

    const item = {
      domainId: domain.id,
      name: domain.name,
      formattedPriceDisplay: conv.formatted,
      domain: this._clone(domain)
    };

    return {
      checkoutDraftId: draft.id,
      checkoutDraft: this._clone(draft),
      mode: 'one_time',
      source: 'buy_now_button',
      items: [item],
      currency: draft.currency,
      totalAmount: draft.totalAmount
    };
  }

  // startOneTimeCheckoutFromCart
  startOneTimeCheckoutFromCart() {
    const cart = this._getCurrentCart();
    const selectedCurrency = this._getSelectedCurrencyCode();
    if (!cart) {
      const draft = this._getOrCreateCheckoutDraft('one_time', 'cart', {
        cartId: null,
        domainIds: [],
        totalAmount: 0,
        currency: selectedCurrency
      });
      return {
        checkoutDraftId: draft.id,
        checkoutDraft: this._clone(draft),
        mode: 'one_time',
        source: 'cart',
        cartId: null,
        cart: null,
        itemCount: 0,
        totalAmount: 0,
        currency: selectedCurrency
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);

    let totalBase = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      const ci = itemsForCart[i];
      totalBase += (ci.unitPrice || 0) * (ci.quantity || 0);
    }

    const conv = this._convertPriceToSelectedCurrency(totalBase, cart.currency || 'usd', selectedCurrency);
    const domainIds = Array.from(new Set(itemsForCart.map(ci => ci.domainId))); // unique

    const draft = this._getOrCreateCheckoutDraft('one_time', 'cart', {
      cartId: cart.id,
      domainIds: domainIds,
      totalAmount: conv.amount,
      currency: conv.currencyCode
    });

    return {
      checkoutDraftId: draft.id,
      checkoutDraft: this._clone(draft),
      mode: 'one_time',
      source: 'cart',
      cartId: cart.id,
      cart: this._clone(cart),
      itemCount: itemsForCart.length,
      totalAmount: draft.totalAmount,
      currency: draft.currency
    };
  }

  // startLeaseCheckoutFromPlan(leasePlanId)
  startLeaseCheckoutFromPlan(leasePlanId) {
    const allLeasePlans = this._getFromStorage('lease_plans', []);
    const plan = allLeasePlans.find(p => p.id === leasePlanId);
    const selectedCurrency = this._getSelectedCurrencyCode();

    if (!plan) {
      const draft = this._getOrCreateCheckoutDraft('lease', 'lease_plans', {
        domainIds: [],
        leasePlanId: null,
        totalAmount: 0,
        currency: selectedCurrency
      });
      return {
        checkoutDraftId: draft.id,
        checkoutDraft: this._clone(draft),
        mode: 'lease',
        source: 'lease_plans',
        domain: null,
        leasePlan: null,
        currency: selectedCurrency,
        totalAmount: 0
      };
    }

    const allDomains = this._getFromStorage('domains', []);
    const domain = allDomains.find(d => d.id === plan.domainId) || null;

    const convMonthly = this._convertPriceToSelectedCurrency(plan.monthlyPrice || 0, plan.currency || 'usd', selectedCurrency);
    const convTotal = this._convertPriceToSelectedCurrency(plan.totalPrice || 0, plan.currency || 'usd', selectedCurrency);

    const draft = this._getOrCreateCheckoutDraft('lease', 'lease_plans', {
      domainIds: domain ? [domain.id] : [],
      leasePlanId: plan.id,
      totalAmount: convTotal.amount,
      currency: convTotal.currencyCode
    });

    return {
      checkoutDraftId: draft.id,
      checkoutDraft: this._clone(draft),
      mode: 'lease',
      source: 'lease_plans',
      domain: domain ? { id: domain.id, name: domain.name } : null,
      leasePlan: {
        id: plan.id,
        name: plan.name,
        durationMonths: plan.durationMonths,
        monthlyPrice: convMonthly.amount,
        totalPrice: convTotal.amount,
        currency: convMonthly.currencyCode
      },
      currency: convTotal.currencyCode,
      totalAmount: convTotal.amount
    };
  }

  // getCheckoutPageData
  getCheckoutPageData() {
    const draft = this._getCurrentCheckoutDraft();
    const selectedCurrency = this._getSelectedCurrencyCode();
    if (!draft) {
      return {
        checkoutDraftId: null,
        mode: null,
        source: null,
        items: [],
        leasePlan: null,
        availablePaymentMethods: [],
        availablePaymentSchedules: [],
        buyerInfoDefaults: {
          fullName: '',
          email: '',
          billingCountry: ''
        },
        billingCountryOptions: [
          { code: 'US', name: 'United States' },
          { code: 'CA', name: 'Canada' },
          { code: 'GB', name: 'United Kingdom' },
          { code: 'DE', name: 'Germany' }
        ],
        totalAmount: 0,
        currency: selectedCurrency
      };
    }

    const allDomains = this._getFromStorage('domains', []);
    const allLeasePlans = this._getFromStorage('lease_plans', []);

    const items = [];
    if (draft.domainIds && draft.domainIds.length > 0) {
      for (let i = 0; i < draft.domainIds.length; i++) {
        const domainId = draft.domainIds[i];
        const domain = allDomains.find(d => d.id === domainId);
        if (!domain) continue;
        let formattedPriceDisplay = '';
        let type = 'one_time';
        if (draft.mode === 'lease' && draft.leasePlanId) {
          const plan = allLeasePlans.find(p => p.id === draft.leasePlanId);
          if (plan) {
            const convMonthly = this._convertPriceToSelectedCurrency(plan.monthlyPrice || 0, plan.currency || 'usd', draft.currency || selectedCurrency);
            formattedPriceDisplay = convMonthly.formatted + ' / month';
            type = 'lease';
          }
        } else {
          const conv = this._convertPriceToSelectedCurrency(domain.buyNowPrice || 0, domain.currency || 'usd', draft.currency || selectedCurrency);
          formattedPriceDisplay = conv.formatted;
          type = 'one_time';
        }
        items.push({
          domainId: domain.id,
          domain: this._clone(domain),
          name: domain.name,
          type: type,
          formattedPriceDisplay: formattedPriceDisplay
        });
      }
    }

    let leasePlanObj = null;
    if (draft.mode === 'lease' && draft.leasePlanId) {
      const plan = allLeasePlans.find(p => p.id === draft.leasePlanId);
      if (plan) {
        const convMonthly = this._convertPriceToSelectedCurrency(plan.monthlyPrice || 0, plan.currency || 'usd', draft.currency || selectedCurrency);
        const convTotal = this._convertPriceToSelectedCurrency(plan.totalPrice || 0, plan.currency || 'usd', draft.currency || selectedCurrency);
        leasePlanObj = {
          id: plan.id,
          name: plan.name,
          durationMonths: plan.durationMonths,
          monthlyPrice: convMonthly.amount,
          totalPrice: convTotal.amount,
          currency: convMonthly.currencyCode
        };
      }
    }

    const availablePaymentMethods = [
      { code: 'credit_card', label: 'Credit Card', isDefault: true },
      { code: 'paypal', label: 'PayPal', isDefault: false },
      { code: 'wire_transfer', label: 'Wire Transfer', isDefault: false }
    ];

    const availablePaymentSchedules = draft.mode === 'lease'
      ? [
          { code: 'monthly_auto_pay', label: 'Monthly auto-pay', isDefault: true },
          { code: 'manual_monthly', label: 'Manual monthly invoice', isDefault: false }
        ]
      : [];

    const billingCountryOptions = [
      { code: 'US', name: 'United States' },
      { code: 'CA', name: 'Canada' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'DE', name: 'Germany' }
    ];

    return {
      checkoutDraftId: draft.id,
      checkoutDraft: this._clone(draft),
      mode: draft.mode,
      source: draft.source,
      items,
      leasePlan: leasePlanObj,
      availablePaymentMethods,
      availablePaymentSchedules,
      buyerInfoDefaults: {
        fullName: '',
        email: '',
        billingCountry: ''
      },
      billingCountryOptions,
      totalAmount: draft.totalAmount,
      currency: draft.currency || selectedCurrency
    };
  }

  // submitCheckoutPaymentDetails(paymentMethod, buyerFullName, buyerEmail, billingCountry, billingAddress, paymentSchedule)
  submitCheckoutPaymentDetails(paymentMethod, buyerFullName, buyerEmail, billingCountry, billingAddress, paymentSchedule) {
    const draft = this._getCurrentCheckoutDraft();
    const selectedCurrency = this._getSelectedCurrencyCode();
    if (!draft) {
      return {
        checkoutSessionId: null,
        status: 'cancelled',
        mode: null,
        paymentMethod: paymentMethod || null,
        totalAmount: 0,
        currency: selectedCurrency,
        message: 'No active checkout draft.'
      };
    }

    const sessions = this._getFromStorage('checkout_sessions', []);
    const id = this._generateId('chksess');
    const now = new Date().toISOString();

    const session = {
      id: id,
      mode: draft.mode,
      source: draft.source,
      domainIds: draft.domainIds || [],
      cartId: draft.cartId || null,
      leasePlanId: draft.leasePlanId || null,
      paymentType: draft.mode === 'lease' ? 'lease' : 'one_time',
      paymentMethod: paymentMethod,
      buyerFullName: buyerFullName,
      buyerEmail: buyerEmail,
      billingCountry: billingCountry,
      billingAddress: billingAddress || null,
      totalAmount: draft.totalAmount || 0,
      currency: draft.currency || selectedCurrency,
      status: 'initiated',
      createdAt: now,
      updatedAt: now,
      paymentSchedule: paymentSchedule || null
    };

    sessions.push(session);
    this._saveToStorage('checkout_sessions', sessions);

    return {
      checkoutSessionId: id,
      status: session.status,
      mode: session.mode,
      paymentMethod: session.paymentMethod,
      totalAmount: session.totalAmount,
      currency: session.currency,
      message: 'Checkout session created. Redirecting to secure payment.'
    };
  }

  // getMakeOfferFormConfigForCurrentDomain
  getMakeOfferFormConfigForCurrentDomain() {
    const domain = this._getCurrentDomainContext();
    const selectedCurrency = this._getSelectedCurrencyCode();
    if (!domain) {
      return {
        domainId: null,
        domain: null,
        domainName: null,
        buyNowPrice: 0,
        baseCurrency: 'usd',
        displayCurrency: selectedCurrency,
        formattedBuyNowPrice: this._formatPrice(0, selectedCurrency),
        minOfferAmount: null,
        suggestedOfferRule: 'Offers are typically considered when reasonably close to the Buy Now price.'
      };
    }

    const baseCurrency = domain.currency || 'usd';
    const convPrice = this._convertPriceToSelectedCurrency(domain.buyNowPrice || 0, baseCurrency, selectedCurrency);

    let minOfferAmount = null;
    if (typeof domain.minOfferAmount === 'number') {
      const convMin = this._convertPriceToSelectedCurrency(domain.minOfferAmount, baseCurrency, selectedCurrency);
      minOfferAmount = convMin.amount;
    }

    return {
      domainId: domain.id,
      domain: this._clone(domain),
      domainName: domain.name,
      buyNowPrice: convPrice.amount,
      baseCurrency: baseCurrency,
      displayCurrency: convPrice.currencyCode,
      formattedBuyNowPrice: convPrice.formatted,
      minOfferAmount: minOfferAmount,
      suggestedOfferRule: 'Consider offering close to the Buy Now price; low offers may be rejected.'
    };
  }

  // submitOfferOnCurrentDomain(offerAmount, buyerFullName, buyerEmail, message)
  submitOfferOnCurrentDomain(offerAmount, buyerFullName, buyerEmail, message) {
    const domain = this._getCurrentDomainContext();
    const selectedCurrency = this._getSelectedCurrencyCode();
    if (!domain) {
      return {
        offerId: null,
        status: 'rejected',
        success: false,
        message: 'No domain found for offer.'
      };
    }

    const offers = this._getFromStorage('offers', []);
    const id = this._generateId('offer');
    const now = new Date().toISOString();

    const offer = {
      id: id,
      domainId: domain.id,
      offerAmount: offerAmount,
      currency: selectedCurrency,
      buyerFullName: buyerFullName,
      buyerEmail: buyerEmail,
      message: message || '',
      source: domain.isPrimaryDomain ? 'main_landing' : 'other_domain_landing',
      status: 'submitted',
      createdAt: now,
      updatedAt: now
    };

    offers.push(offer);
    this._saveToStorage('offers', offers);

    return {
      offerId: id,
      status: 'submitted',
      success: true,
      message: 'Your offer has been submitted for review.'
    };
  }

  // getFAQSectionData
  getFAQSectionData() {
    const items = this._getFromStorage('faq_items', []);
    const categoryMap = {};
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!categoryMap[it.category]) {
        categoryMap[it.category] = this._getFaqCategoryLabel(it.category);
      }
    }

    const categories = Object.keys(categoryMap).map(code => ({
      code: code,
      label: categoryMap[code]
    }));

    // Sort items by displayOrder if provided
    const sortedItems = items.slice().sort((a, b) => {
      const av = typeof a.displayOrder === 'number' ? a.displayOrder : 0;
      const bv = typeof b.displayOrder === 'number' ? b.displayOrder : 0;
      if (av === bv) return 0;
      return av < bv ? -1 : 1;
    });

    return {
      categories,
      items: sortedItems
    };
  }

  // sendFAQSupportMessage(name, email, message, relatedFaqCategory)
  sendFAQSupportMessage(name, email, message, relatedFaqCategory) {
    const supportMessages = this._getFromStorage('support_messages', []);
    const domain = this._getCurrentDomainContext();
    const id = this._generateId('support');
    const now = new Date().toISOString();

    const record = {
      id: id,
      name: name,
      email: email,
      message: message,
      source: 'faq_section',
      relatedFaqCategory: relatedFaqCategory || 'general',
      relatedDomainId: domain ? domain.id : null,
      status: 'new',
      createdAt: now
    };

    supportMessages.push(record);
    this._saveToStorage('support_messages', supportMessages);

    return {
      supportMessageId: id,
      status: 'new',
      success: true,
      message: 'Your message has been sent. We will respond shortly.'
    };
  }

  // getAlertSubscriptionFormOptions
  getAlertSubscriptionFormOptions() {
    const budgetRangeOptions = [
      { code: 'under_1000', label: 'Under $1,000' },
      { code: 'range_1000_5000', label: '$1,000–$5,000' },
      { code: 'range_5000_10000', label: '$5,000–$10,000' },
      { code: 'over_10000', label: 'Over $10,000' }
    ];

    const categoryOptions = [
      { code: 'tech', label: 'Tech' },
      { code: 'business', label: 'Business' },
      { code: 'startup', label: 'Startups' },
      { code: 'ecommerce', label: 'E-commerce' },
      { code: 'other', label: 'Other' }
    ];

    const frequencyOptions = [
      { code: 'immediate', label: 'Immediate' },
      { code: 'daily', label: 'Daily' },
      { code: 'weekly', label: 'Weekly' },
      { code: 'monthly', label: 'Monthly' }
    ];

    const marketingConsentText = 'By subscribing you agree to receive email updates about similar domains.';

    return {
      budgetRangeOptions,
      categoryOptions,
      frequencyOptions,
      marketingConsentText
    };
  }

  // createAlertSubscription(email, budgetRange, categories, frequency, marketingConsent)
  createAlertSubscription(email, budgetRange, categories, frequency, marketingConsent) {
    const subs = this._getFromStorage('alert_subscriptions', []);
    const id = this._generateId('alertsub');
    const now = new Date().toISOString();

    const sub = {
      id: id,
      email: email,
      budgetRange: budgetRange,
      categories: Array.isArray(categories) ? categories.slice() : [],
      frequency: frequency,
      marketingConsent: !!marketingConsent,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    subs.push(sub);
    this._saveToStorage('alert_subscriptions', subs);

    return {
      subscriptionId: id,
      isActive: true,
      success: true,
      message: 'Subscription created.'
    };
  }

  // getContactSellerFormOptions
  getContactSellerFormOptions() {
    const budgetRangeOptions = [
      { code: 'under_1000', label: 'Under $1,000' },
      { code: 'range_1000_5000', label: '$1,000–$5,000' },
      { code: 'range_5000_10000', label: '$5,000–$10,000' },
      { code: 'over_10000', label: 'Over $10,000' }
    ];

    const preferredContactMethodOptions = [
      { code: 'email', label: 'Email' },
      { code: 'phone_call', label: 'Phone call' }
    ];

    const contactTimePreferenceExamples = [
      'Weekdays after 3 PM',
      'Mornings 9–11 AM',
      'Evenings after 6 PM'
    ];

    return {
      budgetRangeOptions,
      preferredContactMethodOptions,
      contactTimePreferenceExamples
    };
  }

  // submitContactRequestForCurrentDomain(name, email, phone, preferredContactMethod, budgetRange, message, contactTimePreference)
  submitContactRequestForCurrentDomain(name, email, phone, preferredContactMethod, budgetRange, message, contactTimePreference) {
    const domain = this._getCurrentDomainContext();
    const requests = this._getFromStorage('contact_requests', []);
    const id = this._generateId('contactreq');
    const now = new Date().toISOString();

    const rec = {
      id: id,
      name: name,
      email: email,
      phone: phone,
      preferredContactMethod: preferredContactMethod,
      budgetRange: budgetRange,
      message: message,
      contactTimePreference: contactTimePreference || '',
      domainId: domain ? domain.id : null,
      status: 'new',
      createdAt: now
    };

    requests.push(rec);
    this._saveToStorage('contact_requests', requests);

    return {
      contactRequestId: id,
      status: 'new',
      success: true,
      message: 'Your request has been sent to the seller.'
    };
  }

  // getSellerInfoForCurrentContext
  getSellerInfoForCurrentContext() {
    const seller = this._getCurrentSellerContext();
    const allDomains = this._getFromStorage('domains', []);

    if (!seller) {
      return {
        seller: null,
        portfolioStats: {
          totalDomains: 0,
          featuredDomains: 0
        }
      };
    }

    const sellerDomains = allDomains.filter(d => d.sellerId === seller.id);
    const totalDomains = sellerDomains.length;
    const featuredDomains = sellerDomains.filter(d => d.isFeatured).length;

    return {
      seller: {
        id: seller.id,
        name: seller.name,
        description: seller.description || null,
        contactEmail: seller.contactEmail || null,
        phone: seller.phone || null,
        website: seller.website || null
      },
      portfolioStats: {
        totalDomains,
        featuredDomains
      }
    };
  }

  // getPortfolioFilterOptions
  getPortfolioFilterOptions() {
    const seller = this._getCurrentSellerContext();
    const allDomains = this._getFromStorage('domains', []);
    const domains = seller ? allDomains.filter(d => d.sellerId === seller.id) : allDomains;

    const tlds = Array.from(new Set(domains.map(d => d.tld))).filter(Boolean);
    const extensionOptions = tlds.map(tld => ({ value: tld, label: tld }));

    const nameLengthRanges = [
      { min: 1, max: 5, label: '1–5 characters' },
      { min: 6, max: 10, label: '6–10 characters' },
      { min: 11, max: 20, label: '11–20 characters' },
      { min: 21, max: 100, label: '21+ characters' }
    ];

    const sortOptions = [
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'name_length_asc', label: 'Name length: Short to Long' },
      { code: 'name_length_desc', label: 'Name length: Long to Short' },
      { code: 'name_asc', label: 'Name A–Z' }
    ];

    return {
      extensionOptions,
      maxPriceDefault: 3000,
      nameLengthRanges,
      sortOptions
    };
  }

  // getSellerPortfolioDomains(extensionFilter, maxPrice, minNameLength, maxNameLength, sortBy, sortDirection)
  getSellerPortfolioDomains(extensionFilter, maxPrice, minNameLength, maxNameLength, sortBy, sortDirection) {
    const seller = this._getCurrentSellerContext();
    const selectedCurrency = this._getSelectedCurrencyCode();
    const allDomains = this._getFromStorage('domains', []);

    if (!seller) {
      return {
        domains: [],
        appliedFilters: {
          extensionFilter: extensionFilter || null,
          maxPrice: (typeof maxPrice === 'number' && !isNaN(maxPrice)) ? maxPrice : null,
          minNameLength: (typeof minNameLength === 'number') ? minNameLength : null,
          maxNameLength: (typeof maxNameLength === 'number') ? maxNameLength : null
        },
        appliedSort: {
          sortBy: sortBy || null,
          sortDirection: sortDirection === 'desc' ? 'desc' : 'asc'
        },
        totalCount: 0
      };
    }

    let domains = allDomains.filter(d => d.sellerId === seller.id && (!d.status || d.status === 'available'));

    // Filter by extension
    if (extensionFilter) {
      domains = domains.filter(d => d.tld === extensionFilter);
    }

    // Filter by name length
    if (typeof minNameLength === 'number') {
      domains = domains.filter(d => typeof d.nameLength === 'number' && d.nameLength >= minNameLength);
    }
    if (typeof maxNameLength === 'number') {
      domains = domains.filter(d => typeof d.nameLength === 'number' && d.nameLength <= maxNameLength);
    }

    // Prepare display with price conversion first
    const result = [];
    for (let i = 0; i < domains.length; i++) {
      const d = domains[i];
      const baseCurrency = d.currency || 'usd';
      const conv = this._convertPriceToSelectedCurrency(d.buyNowPrice || 0, baseCurrency, selectedCurrency);
      result.push({
        id: d.id,
        name: d.name,
        sld: d.sld,
        tld: d.tld,
        nameLength: d.nameLength,
        status: d.status,
        buyNowPrice: conv.amount,
        formattedPriceDisplay: conv.formatted,
        category: d.category || null,
        isFeatured: !!d.isFeatured
      });
    }

    // Filter by max price in display currency
    if (typeof maxPrice === 'number' && !isNaN(maxPrice)) {
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].buyNowPrice > maxPrice) {
          result.splice(i, 1);
        }
      }
    }

    const appliedSortBy = sortBy || 'price';
    const appliedSortDirection = (sortDirection === 'desc') ? 'desc' : 'asc';

    const sortFieldMap = {
      'price': 'buyNowPrice',
      'name_length': 'nameLength',
      'name': 'name'
    };
    const field = sortFieldMap[appliedSortBy] || 'buyNowPrice';

    result.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      if (appliedSortDirection === 'asc') {
        return av < bv ? -1 : 1;
      }
      return av > bv ? -1 : 1;
    });

    return {
      domains: result,
      appliedFilters: {
        extensionFilter: extensionFilter || null,
        maxPrice: (typeof maxPrice === 'number' && !isNaN(maxPrice)) ? maxPrice : null,
        minNameLength: (typeof minNameLength === 'number') ? minNameLength : null,
        maxNameLength: (typeof maxNameLength === 'number') ? maxNameLength : null
      },
      appliedSort: {
        sortBy: appliedSortBy,
        sortDirection: appliedSortDirection
      },
      totalCount: result.length
    };
  }

  // startOneTimeCheckoutForDomain(domainId)
  startOneTimeCheckoutForDomain(domainId) {
    const allDomains = this._getFromStorage('domains', []);
    const domain = allDomains.find(d => d.id === domainId) || null;
    const selectedCurrency = this._getSelectedCurrencyCode();

    if (!domain) {
      const draft = this._getOrCreateCheckoutDraft('one_time', 'buy_now_from_portfolio', {
        domainIds: [],
        totalAmount: 0,
        currency: selectedCurrency
      });
      return {
        checkoutDraftId: draft.id,
        checkoutDraft: this._clone(draft),
        mode: 'one_time',
        source: 'buy_now_from_portfolio',
        domain: null,
        currency: selectedCurrency,
        totalAmount: 0
      };
    }

    const conv = this._convertPriceToSelectedCurrency(domain.buyNowPrice || 0, domain.currency || 'usd', selectedCurrency);
    const draft = this._getOrCreateCheckoutDraft('one_time', 'buy_now_from_portfolio', {
      domainIds: [domain.id],
      totalAmount: conv.amount,
      currency: conv.currencyCode
    });

    return {
      checkoutDraftId: draft.id,
      checkoutDraft: this._clone(draft),
      mode: 'one_time',
      source: 'buy_now_from_portfolio',
      domain: {
        id: domain.id,
        name: domain.name,
        formattedPriceDisplay: conv.formatted
      },
      currency: draft.currency,
      totalAmount: draft.totalAmount
    };
  }

  // Content pages (static business text)

  getAboutPageContent() {
    return {
      sections: [
        {
          heading: 'About Our Domain Marketplace',
          body: 'We connect buyers and sellers of premium domain names, providing secure transactions and guided transfers.'
        },
        {
          heading: 'Trusted by Professionals',
          body: 'Our team has years of experience in domain brokerage, ensuring that every transaction is handled safely and efficiently.'
        }
      ]
    };
  }

  getHowItWorksPageContent() {
    return {
      purchaseSteps: [
        {
          stepNumber: 1,
          title: 'Choose your domain',
          description: 'Browse the landing page or seller portfolio and select the domain you want to acquire.'
        },
        {
          stepNumber: 2,
          title: 'Select payment option',
          description: 'Pay the full price upfront or choose a lease-to-own plan when available.'
        },
        {
          stepNumber: 3,
          title: 'Complete secure checkout',
          description: 'Use credit card, PayPal, or wire transfer via our secure payment providers.'
        },
        {
          stepNumber: 4,
          title: 'Transfer the domain',
          description: 'Our team guides you through unlocking, transferring, or pushing the domain to your registrar.'
        }
      ],
      leaseToOwnExplanation: 'Lease-to-own lets you spread the cost of a premium domain over monthly payments. You can use the domain during the lease term, and once all payments are completed, full ownership transfers to you.',
      transferDetails: 'Domain transfers typically complete within 3–7 business days depending on your registrar and TLD requirements. We provide clear instructions and support throughout the process.'
    };
  }

  getPrivacyPolicyContent() {
    return {
      sections: [
        {
          heading: 'Information We Collect',
          body: 'We collect contact details and transaction information needed to process your domain purchase or inquiry.'
        },
        {
          heading: 'How We Use Your Data',
          body: 'Your data is used to process payments, manage transfers, and send transactional and optional marketing communications.'
        },
        {
          heading: 'Data Security',
          body: 'We use industry-standard security measures to protect your information and work with reputable payment providers.'
        }
      ],
      contactEmail: 'privacy@example.com'
    };
  }

  getTermsAndConditionsContent() {
    return {
      sections: [
        {
          heading: 'General Terms',
          body: 'By purchasing or leasing a domain, you agree to comply with these terms and any applicable registrar policies.'
        },
        {
          heading: 'Payments',
          body: 'All sales are subject to successful payment. Lease-to-own arrangements require timely recurring payments.'
        },
        {
          heading: 'Transfers',
          body: 'Ownership transfers upon completion of payment and successful transfer to your chosen registrar account.'
        }
      ]
    };
  }

  getCookiePolicyContent() {
    return {
      sections: [
        {
          heading: 'Use of Cookies',
          body: 'We use cookies to remember your currency preferences, improve the user experience, and measure site performance.'
        },
        {
          heading: 'Managing Cookies',
          body: 'You can manage or disable cookies through your browser settings. Some features may not work correctly if cookies are disabled.'
        }
      ]
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