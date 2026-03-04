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

  // ---------- Storage helpers ----------

  _initStorage() {
    const keys = [
      'domains',
      'parked_domains',
      'domain_search_sessions',
      'bulk_search_queries',
      'bulk_search_results',
      'carts',
      'cart_items',
      'privacy_options',
      'promo_codes',
      'domain_purchase_inquiries',
      'domain_deals_subscriptions',
      'whois_records',
      'domain_owner_contact_messages',
      'hosting_offers',
      'hosting_plans',
      'site_preferences',
      'pages',
      'nav_links'
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

  _now() {
    return new Date().toISOString();
  }

  // ---------- Site preferences ----------

  _getCurrentSitePreferences() {
    const prefs = this._getFromStorage('site_preferences');
    if (prefs.length > 0) {
      const p = prefs[0];
      return {
        language: p.language === 'es' ? 'es' : 'en',
        currency: p.currency === 'eur' ? 'eur' : 'usd'
      };
    }
    return { language: 'en', currency: 'usd' };
  }

  getSitePreferences() {
    return this._getCurrentSitePreferences();
  }

  updateSitePreferences(language, currency) {
    const allowedLanguages = ['en', 'es'];
    const allowedCurrencies = ['usd', 'eur'];

    if (!allowedLanguages.includes(language) || !allowedCurrencies.includes(currency)) {
      return {
        language: null,
        currency: null,
        success: false,
        message: 'Invalid language or currency'
      };
    }

    const prefs = this._getFromStorage('site_preferences');
    const now = this._now();

    if (prefs.length === 0) {
      prefs.push({
        id: this._generateId('sitepref'),
        language,
        currency,
        updatedAt: now
      });
    } else {
      prefs[0].language = language;
      prefs[0].currency = currency;
      prefs[0].updatedAt = now;
    }

    this._saveToStorage('site_preferences', prefs);

    return {
      language,
      currency,
      success: true,
      message: 'Preferences updated'
    };
  }

  // ---------- Price helpers ----------

  _convertPriceToPreferredCurrency(entity, currency) {
    if (!entity) return 0;
    if (Object.prototype.hasOwnProperty.call(entity, 'baseYearlyPriceUsd')) {
      return currency === 'eur' ? (entity.baseYearlyPriceEur || 0) : (entity.baseYearlyPriceUsd || 0);
    }
    if (Object.prototype.hasOwnProperty.call(entity, 'yearlyPriceUsd')) {
      return currency === 'eur' ? (entity.yearlyPriceEur || 0) : (entity.yearlyPriceUsd || 0);
    }
    if (Object.prototype.hasOwnProperty.call(entity, 'monthlyPriceUsd')) {
      return currency === 'eur' ? (entity.monthlyPriceEur || 0) : (entity.monthlyPriceUsd || 0);
    }
    return 0;
  }

  _formatCurrencySymbol(currency) {
    return currency === 'eur' ? '€' : '$';
  }

  // ---------- Parked domain context ----------

  _resolveCurrentParkedDomain() {
    const parkedDomains = this._getFromStorage('parked_domains');
    const domains = this._getFromStorage('domains');

    if (!parkedDomains.length) {
      return { parkedDomain: null, domain: null };
    }

    // For single-user context, assume first parked domain is current
    let parkedDomain = parkedDomains[0];
    let domain = null;

    if (parkedDomain && parkedDomain.domainId) {
      domain = domains.find((d) => d.id === parkedDomain.domainId) || null;
    }

    if (!domain) {
      domain = domains.find((d) => d.isParked) || null;
      if (domain && !parkedDomain) {
        parkedDomain = parkedDomains.find((p) => p.domainId === domain.id) || null;
      }
    }

    return { parkedDomain, domain };
  }

  getParkedDomainLandingData() {
    const { parkedDomain, domain } = this._resolveCurrentParkedDomain();
    const miniCart = this.getMiniCartSummary();

    return {
      parkedDomain: parkedDomain
        ? {
            id: parkedDomain.id,
            displayName: parkedDomain.displayName,
            saleStatus: parkedDomain.saleStatus,
            landingHeadline: parkedDomain.landingHeadline || '',
            landingDescription: parkedDomain.landingDescription || '',
            inquiryEnabled: !!parkedDomain.inquiryEnabled,
            whoisLinkEnabled: !!parkedDomain.whoisLinkEnabled
          }
        : null,
      domain: domain
        ? {
            id: domain.id,
            fullDomain: domain.fullDomain,
            sld: domain.sld,
            tld: domain.tld,
            availabilityStatus: domain.availabilityStatus,
            isPremium: !!domain.isPremium
          }
        : null,
      hasActiveCart: miniCart.hasActiveCart,
      miniCartSummary: miniCart
    };
  }

  // ---------- Domain search & filters ----------

  getDomainSearchFilterOptions() {
    const domains = this._getFromStorage('domains');
    const tldSet = new Set();
    domains.forEach((d) => {
      if (d.tld) tldSet.add(d.tld);
    });

    const tldFilters = Array.from(tldSet).map((tld) => ({
      tld,
      label: tld,
      isSelectedByDefault: tld === '.com'
    }));

    const sortOptions = [
      { value: 'relevance', label: 'Relevance', isDefault: true },
      { value: 'price_low_to_high', label: 'Price: Low to High', isDefault: false },
      { value: 'price_high_to_low', label: 'Price: High to Low', isDefault: false },
      { value: 'alphabetical', label: 'Alphabetical', isDefault: false }
    ];

    return { tldFilters, sortOptions };
  }

  searchDomains(query, selectedTlds, sortBy) {
    const prefs = this._getCurrentSitePreferences();
    const language = prefs.language;
    const currency = prefs.currency;
    let domains = this._getFromStorage('domains');

    const q = (query || '').toLowerCase().trim();
    const tldsFilter = Array.isArray(selectedTlds) ? selectedTlds : [];
    const sort = sortBy || 'relevance';

    // Generate simple synthetic suggestions for searched keyword if not already present
    if (q) {
      const existingFullDomains = new Set(domains.map((d) => (d.fullDomain || '').toLowerCase()));
      const baseTlds = ['.com', '.net', '.org', '.io', '.co'];
      const priceMapUsd = {
        '.com': 11.99,
        '.net': 10.99,
        '.org': 9.99,
        '.io': 34.99,
        '.co': 11.49
      };
      const suggestions = [];

      baseTlds.forEach((tld) => {
        // If user filtered by TLDs, skip non-selected ones
        if (tldsFilter.length && !tldsFilter.includes(tld)) {
          return;
        }
        const fullDomain = q + tld;
        if (existingFullDomains.has(fullDomain)) {
          return;
        }
        const baseUsd = priceMapUsd[tld] || 12.99;
        const baseEur = parseFloat((baseUsd * 0.93).toFixed(2));
        const now = this._now();
        suggestions.push({
          id: this._generateId('sdomain'),
          fullDomain,
          sld: q,
          tld,
          availabilityStatus: 'available',
          baseYearlyPriceUsd: baseUsd,
          baseYearlyPriceEur: baseEur,
          isPremium: false,
          recommended: tld === '.com',
          registrationDurations: [1, 2, 3, 5],
          createdAt: now,
          updatedAt: now,
          isParked: false
        });
      });

      if (suggestions.length) {
        domains = domains.concat(suggestions);
        this._saveToStorage('domains', domains);
      }
    }

    const { cart, items: cartItems } = this._getActiveCartRecord();
    const inCartDomainIds = new Set((cartItems || []).map((i) => i.domainId));

    let results = domains.filter((d) => {
      const matchQuery = !q || (d.sld && d.sld.toLowerCase().includes(q)) || (d.fullDomain && d.fullDomain.toLowerCase().includes(q));
      const matchTld = !tldsFilter.length || tldsFilter.includes(d.tld);
      return matchQuery && matchTld;
    });

    const mapped = results.map((d) => ({
      domainId: d.id,
      fullDomain: d.fullDomain,
      sld: d.sld,
      tld: d.tld,
      availabilityStatus: d.availabilityStatus,
      isPremium: !!d.isPremium,
      recommended: !!d.recommended,
      yearlyPrice: this._convertPriceToPreferredCurrency(d, currency),
      currency,
      registrationDurations: d.registrationDurations && d.registrationDurations.length ? d.registrationDurations : [1],
      isInCart: inCartDomainIds.has(d.id)
    }));

    let sorted = mapped.slice();
    if (sort === 'price_low_to_high') {
      sorted.sort((a, b) => a.yearlyPrice - b.yearlyPrice || a.fullDomain.localeCompare(b.fullDomain));
    } else if (sort === 'price_high_to_low') {
      sorted.sort((a, b) => b.yearlyPrice - a.yearlyPrice || a.fullDomain.localeCompare(b.fullDomain));
    } else if (sort === 'alphabetical') {
      sorted.sort((a, b) => a.fullDomain.localeCompare(b.fullDomain));
    } else {
      // relevance: recommended first, then price, then name
      sorted.sort((a, b) => {
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        if (a.yearlyPrice !== b.yearlyPrice) return a.yearlyPrice - b.yearlyPrice;
        return a.fullDomain.localeCompare(b.fullDomain);
      });
    }

    // Save DomainSearchSession
    const sessions = this._getFromStorage('domain_search_sessions');
    const session = {
      id: this._generateId('dsearch'),
      query,
      createdAt: this._now(),
      selectedTlds: tldsFilter,
      sortBy: sort,
      language,
      currency,
      resultDomainIds: sorted.map((r) => r.domainId)
    };
    sessions.push(session);
    this._saveToStorage('domain_search_sessions', sessions);

    return {
      query,
      selectedTlds: tldsFilter,
      sortBy: sort,
      language,
      currency,
      results: sorted
    };
  }

  getDomainDetails(domainId) {
    const prefs = this._getCurrentSitePreferences();
    const currency = prefs.currency;
    const domains = this._getFromStorage('domains');
    const domain = domains.find((d) => d.id === domainId);

    if (!domain) {
      return {
        domainId,
        fullDomain: null,
        sld: null,
        tld: null,
        availabilityStatus: null,
        isPremium: false,
        recommended: false,
        pricing: {
          currency,
          yearlyPrice: 0,
          registrationDurations: []
        },
        canBeAddedToCart: false,
        cannotAddReason: 'not_found',
        addOnRecommendations: []
      };
    }

    const yearlyPrice = this._convertPriceToPreferredCurrency(domain, currency);
    const durations = domain.registrationDurations && domain.registrationDurations.length ? domain.registrationDurations : [1];

    const registrationDurations = durations.map((years) => ({
      years,
      yearlyPrice,
      totalPrice: years * yearlyPrice
    }));

    const canBeAddedToCart = domain.availabilityStatus === 'available' || domain.availabilityStatus === 'premium';

    return {
      domainId: domain.id,
      fullDomain: domain.fullDomain,
      sld: domain.sld,
      tld: domain.tld,
      availabilityStatus: domain.availabilityStatus,
      isPremium: !!domain.isPremium,
      recommended: !!domain.recommended,
      pricing: {
        currency,
        yearlyPrice,
        registrationDurations
      },
      canBeAddedToCart,
      cannotAddReason: canBeAddedToCart ? null : 'domain_not_available',
      addOnRecommendations: []
    };
  }

  // ---------- Cart helpers ----------

  _getActiveCartRecord() {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const cart = carts.find((c) => c.status === 'active') || null;
    if (!cart) {
      return { cart: null, items: [] };
    }
    const items = cartItems.filter((i) => i.cartId === cart.id);
    return { cart, items };
  }

  _getOrCreateCart() {
    const { cart } = this._getActiveCartRecord();
    if (cart) return cart;

    const carts = this._getFromStorage('carts');
    const prefs = this._getCurrentSitePreferences();
    const now = this._now();
    const newCart = {
      id: this._generateId('cart'),
      createdAt: now,
      updatedAt: now,
      status: 'active',
      currency: prefs.currency,
      language: prefs.language,
      promoCodeId: null,
      subtotal: 0,
      discountTotal: 0,
      total: 0
    };
    carts.push(newCart);
    this._saveToStorage('carts', carts);
    return newCart;
  }

  _validateDomainSelection(domain) {
    if (!domain) {
      return { valid: false, reason: 'not_found' };
    }
    if (domain.availabilityStatus !== 'available' && domain.availabilityStatus !== 'premium') {
      return { valid: false, reason: 'domain_not_available' };
    }
    return { valid: true };
  }

  _computeCartLineSubtotals(cart, cartItems) {
    const privacyOptions = this._getFromStorage('privacy_options');
    let subtotal = 0;

    cartItems.forEach((item) => {
      const domainPart = (item.registrationYears || 1) * (item.yearlyPrice || 0);
      let privacyCost = 0;
      if (item.privacyOptionId) {
        const opt = privacyOptions.find((p) => p.id === item.privacyOptionId && p.isActive);
        if (opt) {
          const privacyYearly = this._convertPriceToPreferredCurrency(opt, cart.currency);
          privacyCost = privacyYearly * (item.registrationYears || 1);
        }
      }
      const lineSubtotal = domainPart + privacyCost;
      item.lineSubtotal = lineSubtotal;
      subtotal += lineSubtotal;
    });

    // Save updated cart_items to storage
    const allItems = this._getFromStorage('cart_items');
    const updatedAllItems = allItems.map((ci) => {
      const updated = cartItems.find((i) => i.id === ci.id);
      return updated ? updated : ci;
    });
    this._saveToStorage('cart_items', updatedAllItems);

    return subtotal;
  }

  _applyPromoCodeToCartInternal(cart, promo, subtotal, cartItems) {
    if (!promo || !cartItems || !cartItems.length) {
      return { discountTotal: 0, total: subtotal };
    }

    // Currency scope
    if (promo.currencyScope !== 'any' && promo.currencyScope !== cart.currency) {
      return { discountTotal: 0, total: subtotal };
    }

    // Date validity
    const nowTs = Date.now();
    if (promo.validFrom) {
      const fromTs = new Date(promo.validFrom).getTime();
      if (!Number.isNaN(fromTs) && nowTs < fromTs) {
        return { discountTotal: 0, total: subtotal };
      }
    }
    if (promo.validUntil) {
      const untilTs = new Date(promo.validUntil).getTime();
      if (!Number.isNaN(untilTs) && nowTs > untilTs) {
        return { discountTotal: 0, total: subtotal };
      }
    }

    const minPrice = typeof promo.minItemPrice === 'number' ? promo.minItemPrice : null;

    let discountTotal = 0;

    if (promo.appliesTo === 'entire_cart') {
      if (minPrice !== null) {
        const eligible = cartItems.some((i) => (i.yearlyPrice || 0) >= minPrice);
        if (!eligible) {
          return { discountTotal: 0, total: subtotal };
        }
      }
      if (promo.discountType === 'percent') {
        discountTotal = subtotal * (promo.discountValue / 100);
      } else if (promo.discountType === 'fixed_amount') {
        discountTotal = promo.discountValue;
      }
    } else if (promo.appliesTo === 'single_item') {
      let eligibleItems = cartItems.slice();
      if (minPrice !== null) {
        eligibleItems = eligibleItems.filter((i) => (i.yearlyPrice || 0) >= minPrice);
      }
      if (!eligibleItems.length) {
        return { discountTotal: 0, total: subtotal };
      }
      eligibleItems.sort((a, b) => (b.lineSubtotal || 0) - (a.lineSubtotal || 0));
      const target = eligibleItems[0];
      const base = target.lineSubtotal || 0;
      if (promo.discountType === 'percent') {
        discountTotal = base * (promo.discountValue / 100);
      } else if (promo.discountType === 'fixed_amount') {
        discountTotal = promo.discountValue;
      }
    }

    if (!Number.isFinite(discountTotal) || discountTotal < 0) {
      discountTotal = 0;
    }
    if (discountTotal > subtotal) {
      discountTotal = subtotal;
    }

    discountTotal = parseFloat(discountTotal.toFixed(2));
    const total = parseFloat((subtotal - discountTotal).toFixed(2));
    return { discountTotal, total };
  }

  _recalculateCartTotals(cart) {
    if (!cart) return;
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items').filter((i) => i.cartId === cart.id);

    const subtotal = this._computeCartLineSubtotals(cart, cartItems);
    let discountTotal = 0;
    let total = subtotal;

    if (cart.promoCodeId) {
      const promoCodes = this._getFromStorage('promo_codes');
      const promo = promoCodes.find((p) => p.id === cart.promoCodeId && p.isActive);
      if (promo) {
        const res = this._applyPromoCodeToCartInternal(cart, promo, subtotal, cartItems);
        discountTotal = res.discountTotal;
        total = res.total;
      } else {
        cart.promoCodeId = null;
      }
    }

    const now = this._now();
    cart.subtotal = subtotal;
    cart.discountTotal = discountTotal;
    cart.total = total;
    cart.updatedAt = now;

    const updatedCarts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', updatedCarts);
  }

  // ---------- Cart interfaces ----------

  addDomainToCart(domainId, registrationYears) {
    const domains = this._getFromStorage('domains');
    const domain = domains.find((d) => d.id === domainId);
    const validation = this._validateDomainSelection(domain);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.reason || 'cannot_add_domain',
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const years = registrationYears && registrationYears > 0 ? registrationYears : 1;
    const yearlyPrice = this._convertPriceToPreferredCurrency(domain, cart.currency);
    const lineSubtotal = years * yearlyPrice;

    const item = {
      id: this._generateId('citem'),
      cartId: cart.id,
      domainId: domain.id,
      fullDomain: domain.fullDomain,
      tld: domain.tld,
      registrationYears: years,
      yearlyPrice,
      lineSubtotal,
      privacyOptionId: null,
      isParkedDomain: !!domain.isParked,
      createdAt: this._now()
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    this._recalculateCartTotals(cart);

    const { cart: updatedCart, items } = this._getActiveCartRecord();

    return {
      success: true,
      message: 'domain_added_to_cart',
      cart: {
        cartId: updatedCart.id,
        currency: updatedCart.currency,
        language: updatedCart.language,
        itemCount: items.length,
        subtotal: updatedCart.subtotal,
        discountTotal: updatedCart.discountTotal,
        total: updatedCart.total,
        addedItem: {
          cartItemId: item.id,
          fullDomain: item.fullDomain,
          tld: item.tld,
          registrationYears: item.registrationYears,
          yearlyPrice: item.yearlyPrice,
          lineSubtotal: item.lineSubtotal
        }
      }
    };
  }

  getMiniCartSummary() {
    const { cart, items } = this._getActiveCartRecord();
    if (!cart) {
      const prefs = this._getCurrentSitePreferences();
      return {
        hasActiveCart: false,
        itemCount: 0,
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        currency: prefs.currency
      };
    }

    // Ensure totals are up to date
    this._recalculateCartTotals(cart);
    const refreshed = this._getActiveCartRecord();

    return {
      hasActiveCart: true,
      itemCount: refreshed.items.length,
      subtotal: refreshed.cart.subtotal,
      discountTotal: refreshed.cart.discountTotal,
      total: refreshed.cart.total,
      currency: refreshed.cart.currency
    };
  }

  getActiveCart() {
    const { cart, items } = this._getActiveCartRecord();
    const prefs = this._getCurrentSitePreferences();

    if (!cart) {
      return {
        cartId: null,
        status: 'active',
        currency: prefs.currency,
        language: prefs.language,
        promoCode: null,
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        items: []
      };
    }

    // Recalculate to ensure consistency
    this._recalculateCartTotals(cart);
    const carts = this._getFromStorage('carts');
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;
    const cartItems = this._getFromStorage('cart_items').filter((i) => i.cartId === cart.id);

    const promoCodes = this._getFromStorage('promo_codes');
    const promo = updatedCart.promoCodeId ? promoCodes.find((p) => p.id === updatedCart.promoCodeId) : null;

    const domains = this._getFromStorage('domains');
    const privacyOptions = this._getFromStorage('privacy_options');

    const mappedItems = cartItems.map((i) => {
      const domain = domains.find((d) => d.id === i.domainId) || null;
      const privacy = i.privacyOptionId
        ? privacyOptions.find((p) => p.id === i.privacyOptionId) || null
        : null;

      const privacyOptionObj = privacy
        ? {
            privacyOptionId: privacy.id,
            code: privacy.code,
            name: privacy.name,
            includesEmailForwarding: !!privacy.includesEmailForwarding,
            yearlyPrice: this._convertPriceToPreferredCurrency(privacy, updatedCart.currency)
          }
        : null;

      return {
        cartItemId: i.id,
        domainId: i.domainId,
        fullDomain: i.fullDomain,
        tld: i.tld,
        isParkedDomain: !!i.isParkedDomain,
        registrationYears: i.registrationYears,
        yearlyPrice: i.yearlyPrice,
        lineSubtotal: i.lineSubtotal,
        privacyOption: privacyOptionObj,
        // Foreign key resolution for domainId
        domain
      };
    });

    return {
      cartId: updatedCart.id,
      status: updatedCart.status,
      currency: updatedCart.currency,
      language: updatedCart.language,
      promoCode: promo
        ? {
            code: promo.code,
            description: promo.description || ''
          }
        : null,
      subtotal: updatedCart.subtotal,
      discountTotal: updatedCart.discountTotal,
      total: updatedCart.total,
      items: mappedItems
    };
  }

  updateCartItemRegistrationYears(cartItemId, registrationYears) {
    const years = registrationYears && registrationYears > 0 ? registrationYears : 1;
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((i) => i.id === cartItemId);
    if (!item) {
      return {
        success: false,
        message: 'cart_item_not_found',
        cart: null
      };
    }

    item.registrationYears = years;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === item.cartId);
    if (!cart) {
      return {
        success: false,
        message: 'cart_not_found',
        cart: null
      };
    }

    this._recalculateCartTotals(cart);
    const updatedCarts = this._getFromStorage('carts');
    const updatedCart = updatedCarts.find((c) => c.id === cart.id);

    return {
      success: true,
      message: 'cart_item_updated',
      cart: {
        subtotal: updatedCart.subtotal,
        discountTotal: updatedCart.discountTotal,
        total: updatedCart.total
      }
    };
  }

  applyPromoCodeToCart(promoCode) {
    const code = (promoCode || '').trim();
    const { cart } = this._getActiveCartRecord();
    if (!cart) {
      return {
        success: false,
        message: 'no_active_cart',
        appliedPromo: null,
        cartTotals: {
          subtotal: 0,
          discountTotal: 0,
          total: 0,
          currency: this._getCurrentSitePreferences().currency
        }
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter((i) => i.cartId === cart.id);
    const subtotal = this._computeCartLineSubtotals(cart, cartItems);

    const promoCodes = this._getFromStorage('promo_codes');
    const promo = promoCodes.find((p) => p.code && p.code.toLowerCase() === code.toLowerCase());

    if (!promo || !promo.isActive) {
      return {
        success: false,
        message: 'invalid_or_inactive_promo_code',
        appliedPromo: null,
        cartTotals: {
          subtotal,
          discountTotal: 0,
          total: subtotal,
          currency: cart.currency
        }
      };
    }

    const res = this._applyPromoCodeToCartInternal(cart, promo, subtotal, cartItems);
    const discountTotal = res.discountTotal;
    const total = res.total;

    const carts = this._getFromStorage('carts');
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;
    updatedCart.promoCodeId = promo.id;
    updatedCart.subtotal = subtotal;
    updatedCart.discountTotal = discountTotal;
    updatedCart.total = total;
    updatedCart.updatedAt = this._now();

    const newCarts = carts.map((c) => (c.id === updatedCart.id ? updatedCart : c));
    this._saveToStorage('carts', newCarts);

    return {
      success: true,
      message: 'promo_applied',
      appliedPromo: {
        code: promo.code,
        description: promo.description || '',
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        currencyScope: promo.currencyScope,
        appliesTo: promo.appliesTo
      },
      cartTotals: {
        subtotal,
        discountTotal,
        total,
        currency: cart.currency
      }
    };
  }

  getPrivacyOptionsForCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((i) => i.id === cartItemId);
    if (!item) {
      return {
        cartItemId,
        fullDomain: null,
        tld: null,
        currentPrivacyOptionId: null,
        options: []
      };
    }

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === item.cartId);
    const currency = cart ? cart.currency : this._getCurrentSitePreferences().currency;

    const privacyOptions = this._getFromStorage('privacy_options');
    const options = privacyOptions
      .filter((p) => p.isActive)
      .map((p) => ({
        privacyOptionId: p.id,
        code: p.code,
        name: p.name,
        description: p.description || '',
        includesEmailForwarding: !!p.includesEmailForwarding,
        features: p.features || [],
        yearlyPrice: this._convertPriceToPreferredCurrency(p, currency),
        currency,
        isDefault: !!p.isDefault,
        isActive: !!p.isActive,
        isSelected: item.privacyOptionId === p.id
      }));

    const currentPrivacyOptionId = item.privacyOptionId || (options.find((o) => o.isDefault) || {}).privacyOptionId || null;

    return {
      cartItemId: item.id,
      fullDomain: item.fullDomain,
      tld: item.tld,
      currentPrivacyOptionId,
      options
    };
  }

  updateCartItemPrivacyOption(cartItemId, privacyOptionId) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((i) => i.id === cartItemId);
    if (!item) {
      return {
        success: false,
        message: 'cart_item_not_found',
        cartItemPrivacy: null,
        cartTotals: null
      };
    }

    const privacyOptions = this._getFromStorage('privacy_options');
    const opt = privacyOptions.find((p) => p.id === privacyOptionId && p.isActive);
    if (!opt) {
      return {
        success: false,
        message: 'privacy_option_not_found',
        cartItemPrivacy: null,
        cartTotals: null
      };
    }

    item.privacyOptionId = privacyOptionId;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === item.cartId);
    if (!cart) {
      return {
        success: false,
        message: 'cart_not_found',
        cartItemPrivacy: null,
        cartTotals: null
      };
    }

    this._recalculateCartTotals(cart);
    const updatedCarts = this._getFromStorage('carts');
    const updatedCart = updatedCarts.find((c) => c.id === cart.id);

    return {
      success: true,
      message: 'privacy_option_updated',
      cartItemPrivacy: {
        cartItemId,
        privacyOptionId
      },
      cartTotals: {
        subtotal: updatedCart.subtotal,
        discountTotal: updatedCart.discountTotal,
        total: updatedCart.total,
        currency: updatedCart.currency
      }
    };
  }

  // ---------- Bulk search ----------

  _parseBulkDomainInput(rawInput) {
    const lines = String(rawInput || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return lines.map((line) => {
      const lower = line.toLowerCase();
      const idx = lower.indexOf('.');
      const tld = idx >= 0 ? lower.slice(idx) : '';
      return {
        fullDomain: lower,
        tld
      };
    });
  }

  submitBulkDomainSearch(rawInput) {
    const prefs = this._getCurrentSitePreferences();
    const currency = prefs.currency;
    const parsed = this._parseBulkDomainInput(rawInput);

    let domains = this._getFromStorage('domains');
    const { cart, items } = this._getActiveCartRecord();
    const inCart = new Set((items || []).map((i) => (i.fullDomain || '').toLowerCase()));

    const now = this._now();
    const bulkQueries = this._getFromStorage('bulk_search_queries');
    const bulkResults = this._getFromStorage('bulk_search_results');

    const queryId = this._generateId('bquery');
    const domainsEntered = parsed.map((p) => p.fullDomain);

    const query = {
      id: queryId,
      rawInput: String(rawInput || ''),
      domainsEntered,
      createdAt: now,
      status: 'completed'
    };
    bulkQueries.push(query);

    const resultsForReturn = [];
    let domainsUpdated = false;

    parsed.forEach((p) => {
      let domain = domains.find((d) => d.fullDomain && d.fullDomain.toLowerCase() === p.fullDomain);
      if (!domain && p.tld) {
        // Create a synthetic available domain for bulk search if it doesn't already exist
        const priceMapUsd = {
          '.com': 11.99,
          '.net': 10.99,
          '.org': 9.99,
          '.io': 34.99,
          '.co': 11.49
        };
        const baseUsd = priceMapUsd[p.tld] || 12.99;
        const baseEur = parseFloat((baseUsd * 0.93).toFixed(2));
        const idx = p.fullDomain.indexOf('.');
        const sld = idx > 0 ? p.fullDomain.slice(0, idx) : p.fullDomain;
        const now = this._now();
        domain = {
          id: this._generateId('sdomain'),
          fullDomain: p.fullDomain,
          sld,
          tld: p.tld,
          availabilityStatus: 'available',
          baseYearlyPriceUsd: baseUsd,
          baseYearlyPriceEur: baseEur,
          isPremium: false,
          recommended: p.tld === '.com',
          registrationDurations: [1, 2, 3, 5],
          createdAt: now,
          updatedAt: now,
          isParked: false
        };
        domains.push(domain);
        domainsUpdated = true;
      }

      let availabilityStatus = 'invalid';
      let yearlyPrice = null;

      if (domain) {
        if (domain.availabilityStatus === 'available' || domain.availabilityStatus === 'premium') {
          availabilityStatus = 'available';
          yearlyPrice = this._convertPriceToPreferredCurrency(domain, currency);
        } else {
          availabilityStatus = 'unavailable';
        }
      }

      const resultId = this._generateId('bresult');
      const resultRow = {
        id: resultId,
        bulkSearchQueryId: queryId,
        fullDomain: p.fullDomain,
        tld: p.tld,
        availabilityStatus,
        yearlyPriceUsd: domain ? domain.baseYearlyPriceUsd || null : null,
        yearlyPriceEur: domain ? domain.baseYearlyPriceEur || null : null,
        isInCart: inCart.has(p.fullDomain)
      };

      bulkResults.push(resultRow);

      resultsForReturn.push({
        fullDomain: p.fullDomain,
        tld: p.tld,
        availabilityStatus,
        yearlyPrice: yearlyPrice !== null ? yearlyPrice : 0,
        currency,
        isInCart: inCart.has(p.fullDomain)
      });
    });

    if (domainsUpdated) {
      this._saveToStorage('domains', domains);
    }

    this._saveToStorage('bulk_search_queries', bulkQueries);
    this._saveToStorage('bulk_search_results', bulkResults);

    return {
      parsedDomains: parsed,
      results: resultsForReturn
    };
  }

  addBulkDomainsToCart(domainsToAdd) {
    const list = Array.isArray(domainsToAdd) ? domainsToAdd : [];
    const allDomains = this._getFromStorage('domains');
    const failedDomains = [];

    if (!list.length) {
      return {
        success: true,
        addedCount: 0,
        failedDomains,
        cartSummary: this.getMiniCartSummary()
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    let addedCount = 0;

    list.forEach((entry) => {
      const fullDomain = (entry.fullDomain || '').toLowerCase();
      const years = entry.registrationYears && entry.registrationYears > 0 ? entry.registrationYears : 1;
      const domain = allDomains.find((d) => d.fullDomain && d.fullDomain.toLowerCase() === fullDomain);
      const validation = this._validateDomainSelection(domain);
      if (!validation.valid) {
        failedDomains.push({ fullDomain, reason: validation.reason || 'cannot_add_domain' });
        return;
      }

      const yearlyPrice = this._convertPriceToPreferredCurrency(domain, cart.currency);
      const lineSubtotal = years * yearlyPrice;
      const item = {
        id: this._generateId('citem'),
        cartId: cart.id,
        domainId: domain.id,
        fullDomain: domain.fullDomain,
        tld: domain.tld,
        registrationYears: years,
        yearlyPrice,
        lineSubtotal,
        privacyOptionId: null,
        isParkedDomain: !!domain.isParked,
        createdAt: this._now()
      };
      cartItems.push(item);
      addedCount += 1;
    });

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const { cart: updatedCart, items } = this._getActiveCartRecord();

    return {
      success: true,
      addedCount,
      failedDomains,
      cartSummary: {
        itemCount: items.length,
        subtotal: updatedCart.subtotal,
        discountTotal: updatedCart.discountTotal,
        total: updatedCart.total,
        currency: updatedCart.currency
      }
    };
  }

  // ---------- Domain purchase inquiry ----------

  getDomainPurchaseInquiryContext() {
    const { parkedDomain, domain } = this._resolveCurrentParkedDomain();
    let minSuggestedOfferUsd = null;

    if (domain && typeof domain.baseYearlyPriceUsd === 'number') {
      // Heuristic: 10x the yearly price as a minimum suggested offer for premium or 5x otherwise
      const multiplier = domain.isPremium ? 10 : 5;
      minSuggestedOfferUsd = Math.round(domain.baseYearlyPriceUsd * multiplier);
    }

    return {
      parkedDomain: parkedDomain
        ? {
            id: parkedDomain.id,
            displayName: parkedDomain.displayName,
            saleStatus: parkedDomain.saleStatus
          }
        : null,
      minSuggestedOfferUsd
    };
  }

  getDomainPurchaseInquiryFormConfig() {
    const intendedUseOptions = [
      { value: 'small_business_website', label: 'Small business website' },
      { value: 'personal_blog', label: 'Personal blog' },
      { value: 'corporate_site', label: 'Corporate site' },
      { value: 'landing_page', label: 'Landing page' },
      { value: 'other', label: 'Other' }
    ];

    const preferredContactOptions = [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'any', label: 'Any' }
    ];

    return {
      intendedUseOptions,
      preferredContactOptions,
      defaultPreferredContact: 'email',
      allowSimilarOffersOptIn: true,
      defaultOptInSimilarOffers: false
    };
  }

  submitDomainPurchaseInquiry(fullName, email, offerAmountUsd, intendedUse, message, preferredContactMethod, optInSimilarOffers) {
    const { parkedDomain } = this._resolveCurrentParkedDomain();
    if (!parkedDomain) {
      return {
        success: false,
        inquiryId: null,
        status: 'submitted',
        confirmationMessage: 'No parked domain context available.'
      };
    }

    const inquiries = this._getFromStorage('domain_purchase_inquiries');
    const id = this._generateId('dinquiry');
    const now = this._now();

    const inquiry = {
      id,
      parkedDomainId: parkedDomain.id,
      fullName,
      email,
      offerAmountUsd: Number(offerAmountUsd) || 0,
      intendedUse,
      message,
      preferredContactMethod,
      optInSimilarOffers: !!optInSimilarOffers,
      submittedAt: now,
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('domain_purchase_inquiries', inquiries);

    return {
      success: true,
      inquiryId: id,
      status: 'submitted',
      confirmationMessage: 'Your offer has been submitted.'
    };
  }

  // ---------- WHOIS & domain owner contact ----------

  getWhoisDetailsForCurrentParkedDomain() {
    const { domain } = this._resolveCurrentParkedDomain();
    const whoisRecords = this._getFromStorage('whois_records');

    if (!domain) {
      return {
        whoisRecordId: null,
        fullDomain: null,
        registrarName: null,
        registrantName: null,
        registrantOrganization: null,
        registrantEmailMasked: null,
        createdDate: null,
        updatedDate: null,
        expiryDate: null,
        status: null,
        privacyProtectionEnabled: false,
        contactViaFormEnabled: false
      };
    }

    const record = whoisRecords.find((w) => w.domainId === domain.id) || null;

    if (!record) {
      return {
        whoisRecordId: null,
        fullDomain: domain.fullDomain,
        registrarName: null,
        registrantName: null,
        registrantOrganization: null,
        registrantEmailMasked: null,
        createdDate: null,
        updatedDate: null,
        expiryDate: null,
        status: null,
        privacyProtectionEnabled: false,
        contactViaFormEnabled: false
      };
    }

    return {
      whoisRecordId: record.id,
      fullDomain: record.fullDomain,
      registrarName: record.registrarName || null,
      registrantName: record.registrantName || null,
      registrantOrganization: record.registrantOrganization || null,
      registrantEmailMasked: record.registrantEmailMasked || null,
      createdDate: record.createdDate || null,
      updatedDate: record.updatedDate || null,
      expiryDate: record.expiryDate || null,
      status: record.status,
      privacyProtectionEnabled: !!record.privacyProtectionEnabled,
      contactViaFormEnabled: !!record.contactViaFormEnabled
    };
  }

  getDomainOwnerContactFormConfig() {
    return {
      defaultSubject: 'Inquiry about this domain',
      allowCopyToSender: true
    };
  }

  submitDomainOwnerContactMessage(yourName, yourEmail, subject, messageBody, sendCopyToSender) {
    const { domain } = this._resolveCurrentParkedDomain();
    const whoisRecords = this._getFromStorage('whois_records');

    let whoisRecord = null;
    if (domain) {
      whoisRecord = whoisRecords.find((w) => w.domainId === domain.id) || null;
    }

    if (!whoisRecord || !whoisRecord.contactViaFormEnabled) {
      return {
        success: false,
        messageId: null,
        status: 'submitted',
        confirmationMessage: 'WHOIS contact form is not available for this domain.'
      };
    }

    const messages = this._getFromStorage('domain_owner_contact_messages');
    const id = this._generateId('dmsg');
    const now = this._now();

    const msg = {
      id,
      whoisRecordId: whoisRecord.id,
      yourName,
      yourEmail,
      subject,
      messageBody,
      sendCopyToSender: !!sendCopyToSender,
      submittedAt: now,
      status: 'submitted'
    };

    messages.push(msg);
    this._saveToStorage('domain_owner_contact_messages', messages);

    return {
      success: true,
      messageId: id,
      status: 'submitted',
      confirmationMessage: 'Your message has been sent to the domain owner.'
    };
  }

  // ---------- Hosting offers ----------

  getSponsoredHostingOffers(offset, limit) {
    const prefs = this._getCurrentSitePreferences();
    const currency = prefs.currency;

    const off = typeof offset === 'number' && offset >= 0 ? offset : 0;
    const lim = typeof limit === 'number' && limit > 0 ? limit : 4;

    const offersAll = this._getFromStorage('hosting_offers').filter((o) => o.isActive && o.isSponsored);
    const totalAvailable = offersAll.length;
    const slice = offersAll.slice(off, off + lim);

    const offers = slice.map((o) => ({
      hostingOfferId: o.id,
      name: o.name,
      providerName: o.providerName || null,
      tagline: o.tagline || '',
      monthlyPrice: this._convertPriceToPreferredCurrency(o, currency),
      currency,
      planType: o.planType,
      isSponsored: !!o.isSponsored
    }));

    return {
      offers,
      pagination: {
        offset: off,
        limit: lim,
        totalAvailable
      }
    };
  }

  getHostingOfferDetail(hostingOfferId) {
    const prefs = this._getCurrentSitePreferences();
    const currency = prefs.currency;
    const offers = this._getFromStorage('hosting_offers');
    const offer = offers.find((o) => o.id === hostingOfferId);

    if (!offer) {
      return {
        hostingOfferId: null,
        name: null,
        providerName: null,
        tagline: null,
        monthlyPrice: 0,
        currency,
        planType: null,
        isSponsored: false,
        highlightText: null,
        primaryPlanId: null
      };
    }

    const price = this._convertPriceToPreferredCurrency(offer, currency);
    const plans = this._getFromStorage('hosting_plans').filter((p) => p.hostingOfferId === offer.id);
    let primaryPlan = plans[0] || null;
    if (plans.length > 1 && offer.planType) {
      const match = plans.find((p) => p.planTier === offer.planType);
      if (match) primaryPlan = match;
    }

    const symbol = this._formatCurrencySymbol(currency);
    const highlightText = price
      ? `Low-cost ${offer.planType || 'starter'} plan from ${symbol}${price.toFixed(2)} per month`
      : null;

    // Instrumentation for task completion tracking
    try {
      const isActiveSponsored = !!offer.isActive && !!offer.isSponsored;
      const isLowCost = typeof price === 'number' && price <= 5;
      const planTypeLower = offer.planType ? String(offer.planType).toLowerCase() : '';
      const isStarterOrBasicType = planTypeLower === 'starter' || planTypeLower === 'basic';
      const nameStr = offer.name ? String(offer.name) : '';
      const nameIndicatesStarterBasic = /starter|basic/i.test(nameStr);

      if (isActiveSponsored && isLowCost && (isStarterOrBasicType || nameIndicatesStarterBasic)) {
        const instrumentationValue = {
          hostingOfferId: offer.id,
          planType: offer.planType || null,
          name: offer.name,
          monthlyPrice: price,
          currency: currency,
          timestamp: this._now()
        };
        localStorage.setItem('task6_qualifyingOfferOpened', JSON.stringify(instrumentationValue));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (task6_qualifyingOfferOpened):', e);
      } catch (e2) {}
    }

    return {
      hostingOfferId: offer.id,
      name: offer.name,
      providerName: offer.providerName || null,
      tagline: offer.tagline || '',
      monthlyPrice: price,
      currency,
      planType: offer.planType,
      isSponsored: !!offer.isSponsored,
      highlightText,
      primaryPlanId: primaryPlan ? primaryPlan.id : null
    };
  }

  getHostingPlanDetails(hostingPlanId) {
    const prefs = this._getCurrentSitePreferences();
    const currency = prefs.currency;
    const plans = this._getFromStorage('hosting_plans');
    const plan = plans.find((p) => p.id === hostingPlanId);

    if (!plan) {
      return {
        hostingPlanId: null,
        hostingOfferId: null,
        name: null,
        planTier: null,
        description: null,
        features: [],
        monthlyPrice: 0,
        currency,
        contractTermMonths: null,
        isPromotional: false
      };
    }

    const monthlyPrice = this._convertPriceToPreferredCurrency(plan, currency);

    // Instrumentation for task completion tracking
    try {
      const raw = localStorage.getItem('task6_qualifyingOfferOpened');
      if (raw) {
        try {
          const qualifying = JSON.parse(raw);
          if (
            qualifying &&
            qualifying.hostingOfferId &&
            qualifying.hostingOfferId === plan.hostingOfferId
          ) {
            const instrumentationValue = {
              hostingPlanId: plan.id,
              hostingOfferId: plan.hostingOfferId,
              monthlyPrice: monthlyPrice,
              currency: currency,
              timestamp: this._now()
            };
            localStorage.setItem('task6_planDetailsViewed', JSON.stringify(instrumentationValue));
          }
        } catch (parseError) {
          // Ignore JSON parse errors for instrumentation
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (task6_planDetailsViewed):', e);
      } catch (e2) {}
    }

    return {
      hostingPlanId: plan.id,
      hostingOfferId: plan.hostingOfferId,
      name: plan.name,
      planTier: plan.planTier,
      description: plan.description || '',
      features: plan.features || [],
      monthlyPrice,
      currency,
      contractTermMonths: typeof plan.contractTermMonths === 'number' ? plan.contractTermMonths : null,
      isPromotional: !!plan.isPromotional
    };
  }

  // ---------- Domain deals subscription ----------

  getDomainDealsSubscriptionOptions() {
    const domains = this._getFromStorage('domains');
    const tldSet = new Set();
    domains.forEach((d) => {
      if (d.tld) tldSet.add(d.tld);
    });

    const tldTags = Array.from(tldSet).map((tld) => ({
      value: tld,
      label: tld,
      isPopular: tld === '.com' || tld === '.net' || tld === '.io'
    }));

    const topics = [
      {
        value: 'discounted_domain_registrations',
        label: 'Discounted domain registrations',
        description: 'Alerts when domain registration prices drop.'
      },
      {
        value: 'expiring_premium_domains',
        label: 'Expiring premium domains',
        description: 'Opportunities to acquire expiring premium domains.'
      }
    ];

    const frequencies = [
      { value: 'instant', label: 'Instant' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly_summary', label: 'Weekly summary' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const { parkedDomain } = this._resolveCurrentParkedDomain();

    return {
      topics,
      frequencies,
      tldTags,
      allowParkedDomainAlerts: !!parkedDomain
    };
  }

  submitDomainDealsSubscription(email, topics, frequency, tldInterests, includeParkedDomainAlerts) {
    const subs = this._getFromStorage('domain_deals_subscriptions');
    const { parkedDomain } = this._resolveCurrentParkedDomain();

    const id = this._generateId('ddeals');
    const now = this._now();

    const sub = {
      id,
      email,
      topics: Array.isArray(topics) ? topics : [],
      frequency,
      tldInterests: Array.isArray(tldInterests) ? tldInterests : [],
      includeParkedDomainAlerts: !!includeParkedDomainAlerts,
      parkedDomainId: includeParkedDomainAlerts && parkedDomain ? parkedDomain.id : null,
      createdAt: now
    };

    subs.push(sub);
    this._saveToStorage('domain_deals_subscriptions', subs);

    return {
      success: true,
      subscriptionId: id,
      createdAt: now,
      confirmationMessage: 'You have been subscribed to domain deals and alerts.'
    };
  }

  // ---------- Informational content ----------

  getDomainDealsInfoContent() {
    const pages = this._getFromStorage('pages');
    const page = pages.find((p) => p.name === 'domain_deals_alerts_info');

    const headline = page && page.title ? page.title : 'Domain Deals & Alerts';
    const introText = page && page.description ? page.description : 'Learn how to get the best prices on domains and stay ahead of expiring premium opportunities.';

    const sections = [
      {
        title: 'Discounted registrations',
        body: 'We track promotional pricing across popular TLDs so you can register domains at the lowest available rates.'
      },
      {
        title: 'Expiring premium domains',
        body: 'Receive alerts when high-quality domains are nearing expiration, giving you an opportunity to place offers early.'
      },
      {
        title: 'Custom TLD interests',
        body: 'Choose the TLDs you care about most, such as .com, .net, or .io, to keep alerts relevant to your projects.'
      }
    ];

    return { headline, introText, sections };
  }

  getInformationalPageContent(pageName) {
    const pages = this._getFromStorage('pages');
    const page = pages.find((p) => p.name === pageName);

    if (!page) {
      return {
        pageName,
        title: pageName,
        sections: []
      };
    }

    return {
      pageName,
      title: page.title || page.name,
      sections: [
        {
          heading: page.title || page.name,
          body: page.description || ''
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