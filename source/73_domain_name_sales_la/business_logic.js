/*
  BusinessLogic for domain name sales landing page
  - Uses localStorage (with Node.js polyfill) for persistence
  - Pure business logic: no DOM access
*/

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
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist and seed baseline catalog data
    const keysWithArrayDefaults = [
      'domains',
      'payment_plan_options',
      'domain_suggestions',
      'promo_codes',
      'cart_items',
      'orders',
      'order_items',
      'price_offers',
      'price_inquiries',
      'pages',
      'navigation_links',
      'contact_messages'
    ];

    for (let i = 0; i < keysWithArrayDefaults.length; i++) {
      const key = keysWithArrayDefaults[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed baseline domain catalog and suggestion mappings if empty.
    try {
      const domainsRaw = localStorage.getItem('domains');
      const domains = domainsRaw ? JSON.parse(domainsRaw) : [];
      if (!Array.isArray(domains) || domains.length === 0) {
        const seededDomains = [
          {
            id: 'datapulse_com',
            domain_name: 'datapulse.com',
            sld: 'datapulse',
            tld: 'com',
            category: 'standard',
            availability_status: 'available',
            pricing_model: 'per_year',
            price_per_year: 60.0,
            premium_price: 0,
            currency: 'USD',
            min_term_years: 1,
            max_term_years: 10,
            privacy_available: true,
            privacy_price_per_year: 5.99,
            transfer_supported: true,
            transfer_price: 25.0,
            transfer_privacy_available: true,
            transfer_privacy_price_per_year: 5.99,
            is_featured: false,
            description: 'Data analytics brandable .com.',
            tags: ['data', 'analytics']
          },
          {
            id: 'datapulse_io',
            domain_name: 'datapulse.io',
            sld: 'datapulse',
            tld: 'io',
            category: 'standard',
            availability_status: 'available',
            pricing_model: 'per_year',
            price_per_year: 50.0,
            premium_price: 0,
            currency: 'USD',
            min_term_years: 1,
            max_term_years: 10,
            privacy_available: true,
            privacy_price_per_year: 4.99,
            transfer_supported: true,
            transfer_price: 22.0,
            transfer_privacy_available: true,
            transfer_privacy_price_per_year: 4.99,
            is_featured: false,
            description: 'Developer-focused data tools brand.',
            tags: ['data', 'developer']
          },
          {
            id: 'brandorbit_com',
            domain_name: 'brandorbit.com',
            sld: 'brandorbit',
            tld: 'com',
            category: 'premium',
            availability_status: 'unavailable',
            pricing_model: 'one_time',
            price_per_year: null,
            premium_price: 1500.0,
            currency: 'USD',
            min_term_years: null,
            max_term_years: null,
            privacy_available: false,
            privacy_price_per_year: 0,
            transfer_supported: false,
            transfer_price: 0,
            transfer_privacy_available: false,
            transfer_privacy_price_per_year: 0,
            is_featured: true,
            description: 'Memorable premium brand name for agencies and SaaS products.',
            tags: ['brand', 'orbit', 'marketing']
          },
          {
            id: 'alphafox_com',
            domain_name: 'alphafox.com',
            sld: 'alphafox',
            tld: 'com',
            category: 'standard',
            availability_status: 'available',
            pricing_model: 'per_year',
            price_per_year: 10.5,
            premium_price: 0,
            currency: 'USD',
            min_term_years: 1,
            max_term_years: 10,
            privacy_available: true,
            privacy_price_per_year: 2.99,
            transfer_supported: true,
            transfer_price: 11.99,
            transfer_privacy_available: true,
            transfer_privacy_price_per_year: 2.99,
            is_featured: false,
            description: 'Versatile brandable .com.',
            tags: ['alpha', 'fox']
          },
          {
            id: 'betawhale_net',
            domain_name: 'betawhale.net',
            sld: 'betawhale',
            tld: 'net',
            category: 'standard',
            availability_status: 'available',
            pricing_model: 'per_year',
            price_per_year: 9.75,
            premium_price: 0,
            currency: 'USD',
            min_term_years: 1,
            max_term_years: 10,
            privacy_available: true,
            privacy_price_per_year: 2.49,
            transfer_supported: true,
            transfer_price: 10.5,
            transfer_privacy_available: true,
            transfer_privacy_price_per_year: 2.49,
            is_featured: false,
            description: 'Tech or crypto themed brand.',
            tags: ['beta', 'whale']
          },
          {
            id: 'deltariver_com',
            domain_name: 'deltariver.com',
            sld: 'deltariver',
            tld: 'com',
            category: 'standard',
            availability_status: 'available',
            pricing_model: 'per_year',
            price_per_year: 11.25,
            premium_price: 0,
            currency: 'USD',
            min_term_years: 1,
            max_term_years: 10,
            privacy_available: true,
            privacy_price_per_year: 2.99,
            transfer_supported: true,
            transfer_price: 12.5,
            transfer_privacy_available: true,
            transfer_privacy_price_per_year: 2.99,
            is_featured: false,
            description: 'Outdoor or fintech brand.',
            tags: ['delta', 'river']
          },
          {
            id: 'epsilonspace_net',
            domain_name: 'epsilonspace.net',
            sld: 'epsilonspace',
            tld: 'net',
            category: 'standard',
            availability_status: 'available',
            pricing_model: 'per_year',
            price_per_year: 9.5,
            premium_price: 0,
            currency: 'USD',
            min_term_years: 1,
            max_term_years: 10,
            privacy_available: true,
            privacy_price_per_year: 2.49,
            transfer_supported: true,
            transfer_price: 10.25,
            transfer_privacy_available: true,
            transfer_privacy_price_per_year: 2.49,
            is_featured: false,
            description: 'Space or science themed brand.',
            tags: ['epsilon', 'space']
          },
          {
            id: 'myoldbrand_com',
            domain_name: 'myoldbrand.com',
            sld: 'myoldbrand',
            tld: 'com',
            category: 'standard',
            availability_status: 'unavailable',
            pricing_model: 'per_year',
            price_per_year: 12.99,
            premium_price: 0,
            currency: 'USD',
            min_term_years: 1,
            max_term_years: 10,
            privacy_available: true,
            privacy_price_per_year: 2.99,
            transfer_supported: true,
            transfer_price: 15.0,
            transfer_privacy_available: true,
            transfer_privacy_price_per_year: 2.99,
            is_featured: false,
            description: 'Legacy brand domain ready for transfer.',
            tags: ['brand', 'legacy']
          },
          {
            id: 'shortbrand_com',
            domain_name: 'shortbrand.com',
            sld: 'shortbrand',
            tld: 'com',
            category: 'standard',
            availability_status: 'available',
            pricing_model: 'per_year',
            price_per_year: 80.0,
            premium_price: 0,
            currency: 'USD',
            min_term_years: 1,
            max_term_years: 10,
            privacy_available: true,
            privacy_price_per_year: 3.99,
            transfer_supported: true,
            transfer_price: 20.0,
            transfer_privacy_available: true,
            transfer_privacy_price_per_year: 3.99,
            is_featured: false,
            description: 'Short brandable .com suitable as an alternative.',
            tags: ['short', 'brand']
          },
          {
            id: 'globaldatahub_com',
            domain_name: 'globaldatahub.com',
            sld: 'globaldatahub',
            tld: 'com',
            category: 'brokered',
            availability_status: 'unavailable',
            pricing_model: 'price_on_request',
            price_per_year: null,
            premium_price: null,
            currency: 'USD',
            min_term_years: null,
            max_term_years: null,
            privacy_available: false,
            privacy_price_per_year: 0,
            transfer_supported: false,
            transfer_price: 0,
            transfer_privacy_available: false,
            transfer_privacy_price_per_year: 0,
            is_featured: true,
            description: 'High-value brokered data domain with price on request.',
            tags: ['data', 'global', 'brokered']
          }
        ];
        localStorage.setItem('domains', JSON.stringify(seededDomains));
      }

      const suggRaw = localStorage.getItem('domain_suggestions');
      const sugg = suggRaw ? JSON.parse(suggRaw) : [];
      if (!Array.isArray(sugg) || sugg.length === 0) {
        const seededSuggestions = [
          {
            id: 'brandorbit_com_sugg_1',
            source_domain_id: 'brandorbit_com',
            suggested_domain_id: 'shortbrand_com',
            display_order: 1
          }
        ];
        localStorage.setItem('domain_suggestions', JSON.stringify(seededSuggestions));
      }
    } catch (e) {
      // Ignore JSON errors during seeding
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ---------------------- Core Internal Helpers ----------------------

  _getDomainById(domainId) {
    const domains = this._getFromStorage('domains');
    for (let i = 0; i < domains.length; i++) {
      if (domains[i].id === domainId) return domains[i];
    }
    return null;
  }

  _getDomainByName(domainName) {
    const domains = this._getFromStorage('domains');
    const target = (domainName || '').toLowerCase();
    for (let i = 0; i < domains.length; i++) {
      if ((domains[i].domain_name || '').toLowerCase() === target) {
        return domains[i];
      }
    }
    return null;
  }

  _getPaymentPlanOptionsForDomain(domainId) {
    const all = this._getFromStorage('payment_plan_options');
    const options = [];
    for (let i = 0; i < all.length; i++) {
      const opt = all[i];
      if (opt.domain_id === domainId && opt.is_active) {
        options.push(opt);
      }
    }
    options.sort(function (a, b) {
      if (a.display_order != null && b.display_order != null) {
        return a.display_order - b.display_order;
      }
      return a.months - b.months;
    });
    return options;
  }

  _getOrCreateCart() {
    let raw = localStorage.getItem('cart');
    let cart = raw ? JSON.parse(raw) : null;
    const nowIso = new Date().toISOString();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem IDs
        promo_code_id: null,
        subtotal: 0,
        discount_total: 0,
        total: 0,
        currency: 'USD',
        created_at: nowIso,
        updated_at: nowIso
      };
      this._saveCart(cart);
    }
    return cart;
  }

  _saveCart(cart) {
    cart.updated_at = new Date().toISOString();
    this._saveToStorage('cart', cart);
  }

  _calculateRegistrationPricing(domain, termYears, privacyEnabled) {
    if (!domain) {
      return {
        domainId: null,
        domain_name: null,
        termYears: termYears,
        privacyEnabled: !!privacyEnabled,
        pricePerYear: 0,
        privacyPricePerYear: 0,
        baseSubtotal: 0,
        privacySubtotal: 0,
        totalPrice: 0,
        currency: 'USD'
      };
    }
    const pricePerYear = domain.price_per_year || 0;
    const privacyPricePerYear = domain.privacy_available ? (domain.privacy_price_per_year || 0) : 0;
    const baseSubtotal = pricePerYear * termYears;
    const privacySubtotal = privacyEnabled && domain.privacy_available ? privacyPricePerYear * termYears : 0;
    const totalPrice = baseSubtotal + privacySubtotal;
    return {
      domainId: domain.id,
      domain_name: domain.domain_name,
      termYears: termYears,
      privacyEnabled: !!privacyEnabled,
      pricePerYear: pricePerYear,
      privacyPricePerYear: privacyPricePerYear,
      baseSubtotal: baseSubtotal,
      privacySubtotal: privacySubtotal,
      totalPrice: totalPrice,
      currency: domain.currency || 'USD'
    };
  }

  _calculateTransferPricing(domain, termYears, privacyEnabled) {
    if (!domain || !domain.transfer_supported) {
      return {
        domainName: domain ? domain.domain_name : null,
        termYears: termYears,
        privacyEnabled: !!privacyEnabled,
        transferPrice: 0,
        privacyPricePerYear: 0,
        totalPrice: 0,
        currency: (domain && domain.currency) || 'USD'
      };
    }
    const transferPriceBase = domain.transfer_price || 0;
    // Simple model: multiply transfer price by termYears
    const transferPrice = transferPriceBase * termYears;
    const privacyPricePerYear = domain.transfer_privacy_available ? (domain.transfer_privacy_price_per_year || 0) : 0;
    const privacySubtotal = privacyEnabled && domain.transfer_privacy_available ? privacyPricePerYear * termYears : 0;
    const totalPrice = transferPrice + privacySubtotal;
    return {
      domainName: domain.domain_name,
      termYears: termYears,
      privacyEnabled: !!privacyEnabled,
      transferPrice: transferPrice,
      privacyPricePerYear: privacyPricePerYear,
      totalPrice: totalPrice,
      currency: domain.currency || 'USD'
    };
  }

  _validatePromoCode(cart, promoCode) {
    if (!promoCode) {
      return { valid: false, reason: 'Promo code not found.' };
    }
    if (!promoCode.is_active) {
      return { valid: false, reason: 'Promo code is inactive.' };
    }
    const now = Date.now();
    if (promoCode.valid_from) {
      const fromTime = new Date(promoCode.valid_from).getTime();
      if (!isNaN(fromTime) && now < fromTime) {
        return { valid: false, reason: 'Promo code is not yet valid.' };
      }
    }
    if (promoCode.valid_to) {
      const toTime = new Date(promoCode.valid_to).getTime();
      if (!isNaN(toTime) && now > toTime) {
        return { valid: false, reason: 'Promo code has expired.' };
      }
    }
    if (promoCode.min_order_total != null && cart.subtotal < promoCode.min_order_total) {
      return { valid: false, reason: 'Order total does not meet minimum for this promo code.' };
    }
    return { valid: true, reason: null };
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items');
    let subtotal = 0;
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cart_id === cart.id) {
        subtotal += item.line_subtotal || 0;
      }
    }
    cart.subtotal = subtotal;
    cart.discount_total = 0;
    cart.total = subtotal;

    if (cart.promo_code_id) {
      const promoCodes = this._getFromStorage('promo_codes');
      let appliedPromo = null;
      for (let i = 0; i < promoCodes.length; i++) {
        if (promoCodes[i].id === cart.promo_code_id) {
          appliedPromo = promoCodes[i];
          break;
        }
      }
      const validation = this._validatePromoCode(cart, appliedPromo);
      if (validation.valid) {
        let discount = 0;
        if (appliedPromo.discount_type === 'fixed_amount') {
          discount = appliedPromo.discount_value || 0;
        } else if (appliedPromo.discount_type === 'percentage') {
          discount = (cart.subtotal * (appliedPromo.discount_value || 0)) / 100;
        }
        if (discount > cart.subtotal) {
          discount = cart.subtotal;
        }
        cart.discount_total = discount;
        cart.total = cart.subtotal - discount;
      } else {
        // Invalid promo in current context -> remove
        cart.promo_code_id = null;
        cart.discount_total = 0;
        cart.total = cart.subtotal;
      }
    }

    if (!cart.currency) {
      cart.currency = 'USD';
    }
    this._saveCart(cart);
  }

  _createOrderFromCurrentCart(cart, billingInfo) {
    const cartItems = this._getFromStorage('cart_items');
    const relevantItems = [];
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id) {
        relevantItems.push(cartItems[i]);
      }
    }
    if (relevantItems.length === 0) {
      return { success: false, message: 'Cart is empty.', order: null };
    }

    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const orderId = this._generateId('order');
    const nowIso = new Date().toISOString();
    const orderNumber = 'ORD-' + orderId.split('_')[1];

    const order = {
      id: orderId,
      order_number: orderNumber,
      status: 'completed',
      created_at: nowIso,
      completed_at: nowIso,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      total: cart.total,
      currency: cart.currency || 'USD',
      promo_code_id: cart.promo_code_id || null,
      billing_name: billingInfo && billingInfo.name ? billingInfo.name : null,
      billing_email: billingInfo && billingInfo.email ? billingInfo.email : null,
      billing_address: billingInfo && billingInfo.address ? billingInfo.address : null
    };

    orders.push(order);

    for (let i = 0; i < relevantItems.length; i++) {
      const ci = relevantItems[i];
      const oi = {
        id: this._generateId('order_item'),
        order_id: order.id,
        domain_id: ci.domain_id,
        domain_name_snapshot: ci.domain_name_snapshot,
        item_type: ci.item_type,
        term_years: ci.term_years,
        price_per_year_snapshot: ci.price_per_year_snapshot,
        premium_price_snapshot: ci.premium_price_snapshot,
        privacy_enabled: ci.privacy_enabled,
        privacy_price_per_year_snapshot: ci.privacy_price_per_year_snapshot,
        transfer_auth_code: ci.transfer_auth_code,
        payment_plan_option_id: ci.payment_plan_option_id,
        payment_plan_months: ci.payment_plan_months,
        payment_plan_monthly_payment: ci.payment_plan_monthly_payment,
        line_subtotal: ci.line_subtotal,
        currency: ci.currency || order.currency
      };
      orderItems.push(oi);
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart items belonging to this cart
    const remainingCartItems = [];
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id !== cart.id) {
        remainingCartItems.push(cartItems[i]);
      }
    }
    this._saveToStorage('cart_items', remainingCartItems);

    // Reset cart
    cart.items = [];
    cart.subtotal = 0;
    cart.discount_total = 0;
    cart.total = 0;
    cart.promo_code_id = null;
    this._saveCart(cart);

    // Build return order object with promo_code_code resolved
    let promoCodeCode = null;
    if (order.promo_code_id) {
      const promoCodes = this._getFromStorage('promo_codes');
      for (let i = 0; i < promoCodes.length; i++) {
        if (promoCodes[i].id === order.promo_code_id) {
          promoCodeCode = promoCodes[i].code || null;
          break;
        }
      }
    }

    const returnOrder = {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      created_at: order.created_at,
      completed_at: order.completed_at,
      subtotal: order.subtotal,
      discount_total: order.discount_total,
      total: order.total,
      currency: order.currency,
      promo_code_code: promoCodeCode
    };

    return { success: true, message: 'Order created successfully.', order: returnOrder };
  }

  _buildCartSummary(cart) {
    return {
      itemCount: (cart.items && cart.items.length) || 0,
      subtotal: cart.subtotal,
      discountTotal: cart.discount_total,
      total: cart.total,
      currency: cart.currency || 'USD'
    };
  }

  // ---------------------- Interface Implementations ----------------------

  // getHomePageContent()
  getHomePageContent() {
    const domains = this._getFromStorage('domains');
    const featuredPremiumDomains = [];
    const featuredBrokeredDomains = [];

    for (let i = 0; i < domains.length; i++) {
      const d = domains[i];
      if (d.is_featured) {
        if (d.category === 'premium' && d.pricing_model === 'one_time') {
          featuredPremiumDomains.push(d);
        } else if (d.category === 'brokered' && d.pricing_model === 'price_on_request') {
          featuredBrokeredDomains.push(d);
        }
      }
    }

    return {
      heroTitle: 'Acquire your next great domain name',
      heroSubtitle: 'Search, compare, and purchase standard and premium domains in minutes.',
      featuredPremiumDomains: featuredPremiumDomains,
      featuredBrokeredDomains: featuredBrokeredDomains
    };
  }

  // searchDomains(query, filters, sortBy)
  searchDomains(query, filters, sortBy) {
    const q = (query || '').toLowerCase();
    const domains = this._getFromStorage('domains');

    const appliedFilters = {
      tlds: null,
      minPricePerYear: null,
      maxPricePerYear: null,
      categories: null,
      sortBy: sortBy || 'relevance'
    };

    let tldsFilter = null;
    let minPrice = null;
    let maxPrice = null;
    let categoriesFilter = null;

    if (filters) {
      if (filters.tlds && filters.tlds.length) {
        tldsFilter = filters.tlds;
        appliedFilters.tlds = filters.tlds.slice();
      }
      if (typeof filters.minPricePerYear === 'number') {
        minPrice = filters.minPricePerYear;
        appliedFilters.minPricePerYear = minPrice;
      }
      if (typeof filters.maxPricePerYear === 'number') {
        maxPrice = filters.maxPricePerYear;
        appliedFilters.maxPricePerYear = maxPrice;
      }
      if (filters.categories && filters.categories.length) {
        categoriesFilter = filters.categories;
        appliedFilters.categories = filters.categories.slice();
      }
    }

    let results = [];
    for (let i = 0; i < domains.length; i++) {
      const d = domains[i];
      if (!q || (d.domain_name && d.domain_name.toLowerCase().indexOf(q) !== -1) || (d.sld && d.sld.toLowerCase().indexOf(q) !== -1)) {
        if (tldsFilter && tldsFilter.indexOf(d.tld) === -1) continue;
        if (categoriesFilter && categoriesFilter.indexOf(d.category) === -1) continue;
        if (minPrice != null || maxPrice != null) {
          if (d.pricing_model !== 'per_year' || typeof d.price_per_year !== 'number') {
            continue;
          }
          if (minPrice != null && d.price_per_year < minPrice) continue;
          if (maxPrice != null && d.price_per_year > maxPrice) continue;
        }
        results.push(d);
      }
    }

    const sb = sortBy || 'relevance';
    if (sb === 'price_asc' || sb === 'price_desc') {
      results.sort(function (a, b) {
        const pa = (a.pricing_model === 'per_year' && typeof a.price_per_year === 'number') ? a.price_per_year : Number.MAX_VALUE;
        const pb = (b.pricing_model === 'per_year' && typeof b.price_per_year === 'number') ? b.price_per_year : Number.MAX_VALUE;
        if (sb === 'price_asc') return pa - pb;
        return pb - pa;
      });
    } else if (sb === 'name_asc') {
      results.sort(function (a, b) {
        const na = a.domain_name || '';
        const nb = b.domain_name || '';
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }

    return {
      results: results,
      totalCount: results.length,
      appliedFilters: appliedFilters
    };
  }

  // getSearchFilterOptions()
  getSearchFilterOptions() {
    const domains = this._getFromStorage('domains');
    const tldsSet = {};
    let minPrice = null;
    let maxPrice = null;
    const categoriesSet = {};

    for (let i = 0; i < domains.length; i++) {
      const d = domains[i];
      if (d.tld) {
        tldsSet[d.tld] = true;
      }
      if (d.pricing_model === 'per_year' && typeof d.price_per_year === 'number') {
        if (minPrice === null || d.price_per_year < minPrice) minPrice = d.price_per_year;
        if (maxPrice === null || d.price_per_year > maxPrice) maxPrice = d.price_per_year;
      }
      if (d.category) {
        categoriesSet[d.category] = true;
      }
    }

    const tlds = Object.keys(tldsSet);
    const categories = [];
    const categoryKeys = Object.keys(categoriesSet);
    for (let i = 0; i < categoryKeys.length; i++) {
      const val = categoryKeys[i];
      const label = val.charAt(0).toUpperCase() + val.slice(1);
      categories.push({ value: val, label: label });
    }

    return {
      tlds: tlds,
      priceRange: {
        minPricePerYear: minPrice,
        maxPricePerYear: maxPrice
      },
      categories: categories,
      defaultSort: 'relevance'
    };
  }

  // getDomainRegistrationOptions(domainId)
  getDomainRegistrationOptions(domainId) {
    const domain = this._getDomainById(domainId);
    if (!domain) {
      return {
        domain: null,
        availableTerms: [],
        defaultTermYears: 1,
        privacyAvailable: false,
        defaultPrivacyEnabled: false
      };
    }

    const minTerm = domain.min_term_years || 1;
    const maxTerm = domain.max_term_years || 10;
    const availableTerms = [];
    for (let y = minTerm; y <= maxTerm; y++) {
      availableTerms.push(y);
    }

    return {
      domain: {
        id: domain.id,
        domain_name: domain.domain_name,
        sld: domain.sld,
        tld: domain.tld,
        category: domain.category,
        availability_status: domain.availability_status,
        pricing_model: domain.pricing_model,
        price_per_year: domain.price_per_year,
        currency: domain.currency,
        min_term_years: domain.min_term_years,
        max_term_years: domain.max_term_years,
        privacy_available: domain.privacy_available,
        privacy_price_per_year: domain.privacy_price_per_year
      },
      availableTerms: availableTerms,
      defaultTermYears: minTerm,
      privacyAvailable: !!domain.privacy_available,
      defaultPrivacyEnabled: false
    };
  }

  // getDomainRegistrationQuote(domainId, termYears, privacyEnabled)
  getDomainRegistrationQuote(domainId, termYears, privacyEnabled) {
    const domain = this._getDomainById(domainId);
    const quote = this._calculateRegistrationPricing(domain, termYears, privacyEnabled);
    return quote;
  }

  // addDomainRegistrationToCart(domainId, termYears = 1, privacyEnabled = false)
  addDomainRegistrationToCart(domainId, termYears, privacyEnabled) {
    const domain = this._getDomainById(domainId);
    if (!domain) {
      return { success: false, message: 'Domain not found.', cartItem: null, cartSummary: null };
    }
    if (domain.pricing_model !== 'per_year') {
      return { success: false, message: 'Domain is not available for standard registration.', cartItem: null, cartSummary: null };
    }
    if (domain.availability_status !== 'available') {
      return { success: false, message: 'Domain is not available.', cartItem: null, cartSummary: null };
    }

    const ty = typeof termYears === 'number' && termYears > 0 ? termYears : 1;
    const pe = !!privacyEnabled;

    const quote = this._calculateRegistrationPricing(domain, ty, pe);
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItemId = this._generateId('cart_item');
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      domain_id: domain.id,
      domain_name_snapshot: domain.domain_name,
      item_type: 'registration',
      term_years: ty,
      price_per_year_snapshot: domain.price_per_year || 0,
      premium_price_snapshot: null,
      privacy_enabled: pe,
      privacy_price_per_year_snapshot: domain.privacy_available ? (domain.privacy_price_per_year || 0) : 0,
      transfer_auth_code: null,
      payment_plan_option_id: null,
      payment_plan_months: null,
      payment_plan_monthly_payment: null,
      quantity: 1,
      line_subtotal: quote.totalPrice,
      currency: quote.currency
    };

    cartItems.push(cartItem);
    cart.items.push(cartItemId);

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const cartSummary = this._buildCartSummary(cart);

    return {
      success: true,
      message: 'Domain registration added to cart.',
      cartItem: {
        cart_item_id: cartItem.id,
        domain_name_snapshot: cartItem.domain_name_snapshot,
        item_type: cartItem.item_type,
        term_years: cartItem.term_years,
        privacy_enabled: cartItem.privacy_enabled,
        privacy_price_per_year_snapshot: cartItem.privacy_price_per_year_snapshot,
        line_subtotal: cartItem.line_subtotal,
        currency: cartItem.currency,
        // foreign key resolution
        domain: domain
      },
      cartSummary: cartSummary
    };
  }

  // getPremiumDomainLanding(domainId)
  getPremiumDomainLanding(domainId) {
    const domain = this._getDomainById(domainId);
    if (!domain) {
      return {
        domain: null,
        isPriceOnRequest: false,
        canBuyNow: false,
        canMakeOffer: false,
        hasPaymentPlans: false
      };
    }

    const isPriceOnRequest = domain.pricing_model === 'price_on_request';
    const canBuyNow = domain.category === 'premium' && domain.pricing_model === 'one_time';
    const canMakeOffer = domain.category === 'premium' && domain.pricing_model === 'one_time';
    const hasPaymentPlans = this._getPaymentPlanOptionsForDomain(domainId).length > 0;

    return {
      domain: {
        id: domain.id,
        domain_name: domain.domain_name,
        sld: domain.sld,
        tld: domain.tld,
        category: domain.category,
        pricing_model: domain.pricing_model,
        premium_price: domain.premium_price,
        currency: domain.currency,
        description: domain.description,
        tags: domain.tags,
        is_featured: domain.is_featured
      },
      isPriceOnRequest: isPriceOnRequest,
      canBuyNow: canBuyNow,
      canMakeOffer: canMakeOffer,
      hasPaymentPlans: hasPaymentPlans
    };
  }

  // getPaymentPlanOptions(domainId)
  getPaymentPlanOptions(domainId) {
    const options = this._getPaymentPlanOptionsForDomain(domainId);
    const domain = this._getDomainById(domainId);
    const enrichedOptions = [];
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      enrichedOptions.push(Object.assign({}, opt, {
        // foreign key resolution for domain_id
        domain: domain
      }));
    }
    return {
      domainId: domainId,
      domain: domain,
      options: enrichedOptions
    };
  }

  // addPremiumBuyNowToCart(domainId)
  addPremiumBuyNowToCart(domainId) {
    const domain = this._getDomainById(domainId);
    if (!domain) {
      return { success: false, message: 'Domain not found.', cartItem: null, cartSummary: null };
    }
    if (!(domain.category === 'premium' && domain.pricing_model === 'one_time')) {
      return { success: false, message: 'Domain is not available as a Buy Now premium domain.', cartItem: null, cartSummary: null };
    }

    const price = domain.premium_price || 0;
    const currency = domain.currency || 'USD';

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItemId = this._generateId('cart_item');
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      domain_id: domain.id,
      domain_name_snapshot: domain.domain_name,
      item_type: 'premium_purchase',
      term_years: null,
      price_per_year_snapshot: null,
      premium_price_snapshot: price,
      privacy_enabled: false,
      privacy_price_per_year_snapshot: 0,
      transfer_auth_code: null,
      payment_plan_option_id: null,
      payment_plan_months: null,
      payment_plan_monthly_payment: null,
      quantity: 1,
      line_subtotal: price,
      currency: currency
    };

    cartItems.push(cartItem);
    cart.items.push(cartItemId);

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const cartSummary = this._buildCartSummary(cart);

    return {
      success: true,
      message: 'Premium domain added to cart.',
      cartItem: {
        cart_item_id: cartItem.id,
        domain_name_snapshot: cartItem.domain_name_snapshot,
        item_type: cartItem.item_type,
        premium_price_snapshot: cartItem.premium_price_snapshot,
        line_subtotal: cartItem.line_subtotal,
        currency: cartItem.currency,
        domain: domain
      },
      cartSummary: cartSummary
    };
  }

  // addPaymentPlanToCart(domainId, paymentPlanOptionId)
  addPaymentPlanToCart(domainId, paymentPlanOptionId) {
    const domain = this._getDomainById(domainId);
    if (!domain) {
      return { success: false, message: 'Domain not found.', cartItem: null, cartSummary: null };
    }

    const allPlans = this._getFromStorage('payment_plan_options');
    let plan = null;
    for (let i = 0; i < allPlans.length; i++) {
      if (allPlans[i].id === paymentPlanOptionId) {
        plan = allPlans[i];
        break;
      }
    }
    if (!plan || !plan.is_active || plan.domain_id !== domainId) {
      return { success: false, message: 'Payment plan not available for this domain.', cartItem: null, cartSummary: null };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItemId = this._generateId('cart_item');
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      domain_id: domain.id,
      domain_name_snapshot: domain.domain_name,
      item_type: 'payment_plan',
      term_years: null,
      price_per_year_snapshot: null,
      premium_price_snapshot: null,
      privacy_enabled: false,
      privacy_price_per_year_snapshot: 0,
      transfer_auth_code: null,
      payment_plan_option_id: plan.id,
      payment_plan_months: plan.months,
      payment_plan_monthly_payment: plan.monthly_payment,
      quantity: 1,
      line_subtotal: plan.total_price,
      currency: plan.currency || domain.currency || 'USD'
    };

    cartItems.push(cartItem);
    cart.items.push(cartItemId);

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const cartSummary = this._buildCartSummary(cart);

    return {
      success: true,
      message: 'Payment plan added to cart.',
      cartItem: {
        cart_item_id: cartItem.id,
        domain_name_snapshot: cartItem.domain_name_snapshot,
        item_type: cartItem.item_type,
        payment_plan_option_id: cartItem.payment_plan_option_id,
        payment_plan_months: cartItem.payment_plan_months,
        payment_plan_monthly_payment: cartItem.payment_plan_monthly_payment,
        line_subtotal: cartItem.line_subtotal,
        currency: cartItem.currency,
        // foreign key resolution
        domain: domain,
        paymentPlanOption: plan
      },
      cartSummary: cartSummary
    };
  }

  // submitPriceOffer(domainId, offerAmount, message)
  submitPriceOffer(domainId, offerAmount, message) {
    const domain = this._getDomainById(domainId);
    if (!domain) {
      return { success: false, offer: null, userMessage: 'Domain not found.' };
    }

    const amount = Number(offerAmount);
    if (!amount || amount <= 0) {
      return { success: false, offer: null, userMessage: 'Invalid offer amount.' };
    }

    const priceOffers = this._getFromStorage('price_offers');
    const id = this._generateId('price_offer');
    const nowIso = new Date().toISOString();
    const offer = {
      id: id,
      domain_id: domain.id,
      domain_name_snapshot: domain.domain_name,
      listed_price_snapshot: domain.premium_price || 0,
      offer_amount: amount,
      message: message,
      status: 'submitted',
      created_at: nowIso
    };

    priceOffers.push(offer);
    this._saveToStorage('price_offers', priceOffers);

    return {
      success: true,
      offer: Object.assign({}, offer, {
        // foreign key resolution
        domain: domain
      }),
      userMessage: 'Your offer has been submitted and is under review.'
    };
  }

  // getDomainSuggestions(sourceDomainId, filters, sortBy)
  getDomainSuggestions(sourceDomainId, filters, sortBy) {
    const domainSuggestions = this._getFromStorage('domain_suggestions');
    const domains = this._getFromStorage('domains');

    const suggestions = [];
    for (let i = 0; i < domainSuggestions.length; i++) {
      const ds = domainSuggestions[i];
      if (ds.source_domain_id === sourceDomainId) {
        // find suggested domain
        for (let j = 0; j < domains.length; j++) {
          if (domains[j].id === ds.suggested_domain_id) {
            suggestions.push({ link: ds, domain: domains[j] });
            break;
          }
        }
      }
    }

    let minPrice = null;
    let maxPrice = null;
    let maxNameLength = null;
    if (filters) {
      if (typeof filters.minPricePerYear === 'number') minPrice = filters.minPricePerYear;
      if (typeof filters.maxPricePerYear === 'number') maxPrice = filters.maxPricePerYear;
      if (typeof filters.maxNameLength === 'number') maxNameLength = filters.maxNameLength;
    }

    const filtered = [];
    for (let i = 0; i < suggestions.length; i++) {
      const d = suggestions[i].domain;
      if (maxNameLength != null && d.sld && d.sld.length > maxNameLength) continue;
      if (minPrice != null || maxPrice != null) {
        if (d.pricing_model !== 'per_year' || typeof d.price_per_year !== 'number') continue;
        if (minPrice != null && d.price_per_year < minPrice) continue;
        if (maxPrice != null && d.price_per_year > maxPrice) continue;
      }
      filtered.push(d);
    }

    const sb = sortBy || null;
    if (sb === 'price_asc' || sb === 'price_desc') {
      filtered.sort(function (a, b) {
        const pa = (a.pricing_model === 'per_year' && typeof a.price_per_year === 'number') ? a.price_per_year : Number.MAX_VALUE;
        const pb = (b.pricing_model === 'per_year' && typeof b.price_per_year === 'number') ? b.price_per_year : Number.MAX_VALUE;
        if (sb === 'price_asc') return pa - pb;
        return pb - pa;
      });
    }

    const results = [];
    for (let i = 0; i < filtered.length; i++) {
      const d = filtered[i];
      results.push({
        id: d.id,
        domain_name: d.domain_name,
        sld: d.sld,
        tld: d.tld,
        category: d.category,
        pricing_model: d.pricing_model,
        price_per_year: d.price_per_year,
        premium_price: d.premium_price,
        currency: d.currency
      });
    }

    return {
      sourceDomainId: sourceDomainId,
      results: results
    };
  }

  // bulkSearchDomains(domainNames)
  bulkSearchDomains(domainNames) {
    const domains = this._getFromStorage('domains');
    const results = [];

    const list = Array.isArray(domainNames) ? domainNames : [];
    for (let i = 0; i < list.length; i++) {
      const inputName = (list[i] || '').trim();
      if (!inputName) continue;
      const lower = inputName.toLowerCase();
      let foundDomain = null;
      for (let j = 0; j < domains.length; j++) {
        if ((domains[j].domain_name || '').toLowerCase() === lower) {
          foundDomain = domains[j];
          break;
        }
      }
      if (foundDomain) {
        results.push({
          input: inputName,
          domain_found: true,
          domain_id: foundDomain.id,
          domain_name: foundDomain.domain_name,
          sld: foundDomain.sld,
          tld: foundDomain.tld,
          availability_status: foundDomain.availability_status,
          pricing_model: foundDomain.pricing_model,
          price_per_year: foundDomain.price_per_year,
          currency: foundDomain.currency,
          category: foundDomain.category,
          // foreign key resolution
          domain: foundDomain
        });
      } else {
        results.push({
          input: inputName,
          domain_found: false,
          domain_id: null,
          domain_name: null,
          sld: null,
          tld: null,
          availability_status: null,
          pricing_model: null,
          price_per_year: null,
          currency: null,
          category: null
        });
      }
    }

    return { results: results };
  }

  // addBulkDomainsToCart(selections)
  addBulkDomainsToCart(selections) {
    const list = Array.isArray(selections) ? selections : [];
    if (!list.length) {
      const cart = this._getOrCreateCart();
      const cartSummary = this._buildCartSummary(cart);
      return { success: false, addedItemCount: 0, failedSelections: [], cartSummary: cartSummary };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const failedSelections = [];
    let addedCount = 0;

    for (let i = 0; i < list.length; i++) {
      const sel = list[i];
      const domain = this._getDomainById(sel.domainId);
      if (!domain) {
        failedSelections.push({ domainId: sel.domainId, reason: 'Domain not found.' });
        continue;
      }
      if (domain.pricing_model !== 'per_year') {
        failedSelections.push({ domainId: sel.domainId, reason: 'Domain is not a standard registration.' });
        continue;
      }
      if (domain.availability_status !== 'available') {
        failedSelections.push({ domainId: sel.domainId, reason: 'Domain is not available.' });
        continue;
      }

      const termYears = typeof sel.termYears === 'number' && sel.termYears > 0 ? sel.termYears : 1;
      const privacyEnabled = !!sel.privacyEnabled;
      const quote = this._calculateRegistrationPricing(domain, termYears, privacyEnabled);

      const cartItemId = this._generateId('cart_item');
      const cartItem = {
        id: cartItemId,
        cart_id: cart.id,
        domain_id: domain.id,
        domain_name_snapshot: domain.domain_name,
        item_type: 'registration',
        term_years: termYears,
        price_per_year_snapshot: domain.price_per_year || 0,
        premium_price_snapshot: null,
        privacy_enabled: privacyEnabled,
        privacy_price_per_year_snapshot: domain.privacy_available ? (domain.privacy_price_per_year || 0) : 0,
        transfer_auth_code: null,
        payment_plan_option_id: null,
        payment_plan_months: null,
        payment_plan_monthly_payment: null,
        quantity: 1,
        line_subtotal: quote.totalPrice,
        currency: quote.currency
      };

      cartItems.push(cartItem);
      cart.items.push(cartItemId);
      addedCount++;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    const cartSummary = this._buildCartSummary(cart);

    return {
      success: addedCount > 0,
      addedItemCount: addedCount,
      failedSelections: failedSelections,
      cartSummary: cartSummary
    };
  }

  // checkDomainTransferEligibility(domainName)
  checkDomainTransferEligibility(domainName) {
    const domain = this._getDomainByName(domainName);
    if (!domain) {
      return {
        domainName: domainName,
        eligible: false,
        reasonIfNotEligible: 'Domain not found in catalog.',
        domain_id: null,
        transferPrice: 0,
        currency: 'USD',
        privacyAvailable: false,
        privacyPricePerYear: 0
      };
    }
    if (!domain.transfer_supported) {
      return {
        domainName: domain.domain_name,
        eligible: false,
        reasonIfNotEligible: 'Transfer not supported for this TLD or domain.',
        domain_id: domain.id,
        transferPrice: 0,
        currency: domain.currency || 'USD',
        privacyAvailable: !!domain.transfer_privacy_available,
        privacyPricePerYear: domain.transfer_privacy_price_per_year || 0
      };
    }

    return {
      domainName: domain.domain_name,
      eligible: true,
      reasonIfNotEligible: null,
      domain_id: domain.id,
      transferPrice: domain.transfer_price || 0,
      currency: domain.currency || 'USD',
      privacyAvailable: !!domain.transfer_privacy_available,
      privacyPricePerYear: domain.transfer_privacy_price_per_year || 0
    };
  }

  // getDomainTransferQuote(domainName, termYears, privacyEnabled)
  getDomainTransferQuote(domainName, termYears, privacyEnabled) {
    const domain = this._getDomainByName(domainName);
    const quote = this._calculateTransferPricing(domain, termYears, privacyEnabled);
    return quote;
  }

  // addDomainTransferToCart(domainName, authCode, termYears = 1, privacyEnabled)
  addDomainTransferToCart(domainName, authCode, termYears, privacyEnabled) {
    const domain = this._getDomainByName(domainName);
    if (!domain) {
      return { success: false, message: 'Domain not found.', cartItem: null, cartSummary: null };
    }
    if (!domain.transfer_supported) {
      return { success: false, message: 'Transfer not supported for this domain.', cartItem: null, cartSummary: null };
    }

    const ty = typeof termYears === 'number' && termYears > 0 ? termYears : 1;
    const pe = !!privacyEnabled;
    const quote = this._calculateTransferPricing(domain, ty, pe);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItemId = this._generateId('cart_item');
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      domain_id: domain.id,
      domain_name_snapshot: domain.domain_name,
      item_type: 'transfer',
      term_years: ty,
      price_per_year_snapshot: domain.transfer_price || 0,
      premium_price_snapshot: null,
      privacy_enabled: pe,
      privacy_price_per_year_snapshot: domain.transfer_privacy_available ? (domain.transfer_privacy_price_per_year || 0) : 0,
      transfer_auth_code: authCode,
      payment_plan_option_id: null,
      payment_plan_months: null,
      payment_plan_monthly_payment: null,
      quantity: 1,
      line_subtotal: quote.totalPrice,
      currency: quote.currency
    };

    cartItems.push(cartItem);
    cart.items.push(cartItemId);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const cartSummary = this._buildCartSummary(cart);

    return {
      success: true,
      message: 'Domain transfer added to cart.',
      cartItem: {
        cart_item_id: cartItem.id,
        domain_name_snapshot: cartItem.domain_name_snapshot,
        item_type: cartItem.item_type,
        term_years: cartItem.term_years,
        privacy_enabled: cartItem.privacy_enabled,
        privacy_price_per_year_snapshot: cartItem.privacy_price_per_year_snapshot,
        transfer_auth_code: cartItem.transfer_auth_code,
        line_subtotal: cartItem.line_subtotal,
        currency: cartItem.currency,
        domain: domain
      },
      cartSummary: cartSummary
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const domains = this._getFromStorage('domains');
    const paymentPlans = this._getFromStorage('payment_plan_options');

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id !== cart.id) continue;

      let domain = null;
      for (let j = 0; j < domains.length; j++) {
        if (domains[j].id === ci.domain_id) {
          domain = domains[j];
          break;
        }
      }

      let paymentPlanOption = null;
      if (ci.payment_plan_option_id) {
        for (let k = 0; k < paymentPlans.length; k++) {
          if (paymentPlans[k].id === ci.payment_plan_option_id) {
            paymentPlanOption = paymentPlans[k];
            break;
          }
        }
      }

      items.push({
        cart_item_id: ci.id,
        domain_id: ci.domain_id,
        domain_name_snapshot: ci.domain_name_snapshot,
        item_type: ci.item_type,
        term_years: ci.term_years,
        price_per_year_snapshot: ci.price_per_year_snapshot,
        premium_price_snapshot: ci.premium_price_snapshot,
        privacy_enabled: ci.privacy_enabled,
        privacy_price_per_year_snapshot: ci.privacy_price_per_year_snapshot,
        transfer_auth_code: ci.transfer_auth_code,
        payment_plan_months: ci.payment_plan_months,
        payment_plan_monthly_payment: ci.payment_plan_monthly_payment,
        quantity: ci.quantity,
        line_subtotal: ci.line_subtotal,
        currency: ci.currency,
        // foreign key resolution
        domain: domain,
        paymentPlanOption: paymentPlanOption
      });
    }

    const totals = {
      subtotal: cart.subtotal,
      discountTotal: cart.discount_total,
      total: cart.total,
      currency: cart.currency || 'USD'
    };

    let appliedPromoCode = null;
    if (cart.promo_code_id) {
      const promoCodes = this._getFromStorage('promo_codes');
      for (let i = 0; i < promoCodes.length; i++) {
        if (promoCodes[i].id === cart.promo_code_id) {
          appliedPromoCode = {
            code: promoCodes[i].code,
            description: promoCodes[i].description,
            discount_type: promoCodes[i].discount_type,
            discount_value: promoCodes[i].discount_value
          };
          break;
        }
      }
    }

    return {
      items: items,
      totals: totals,
      appliedPromoCode: appliedPromoCode
    };
  }

  // updateCartItemRegistrationTerm(cartItemId, termYears)
  updateCartItemRegistrationTerm(cartItemId, termYears) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const ty = typeof termYears === 'number' && termYears > 0 ? termYears : 1;

    let target = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        target = cartItems[i];
        break;
      }
    }
    if (!target) {
      return { success: false, updatedItem: null, cartSummary: this._buildCartSummary(cart) };
    }

    if (target.item_type !== 'registration') {
      // Only registrations supported for term change in this implementation
      return { success: false, updatedItem: null, cartSummary: this._buildCartSummary(cart) };
    }

    const domain = this._getDomainById(target.domain_id);
    const quote = this._calculateRegistrationPricing(domain, ty, target.privacy_enabled);

    target.term_years = ty;
    target.price_per_year_snapshot = domain ? (domain.price_per_year || 0) : 0;
    target.privacy_price_per_year_snapshot = domain && domain.privacy_available ? (domain.privacy_price_per_year || 0) : 0;
    target.line_subtotal = quote.totalPrice;

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const updatedItem = {
      cart_item_id: target.id,
      term_years: target.term_years,
      line_subtotal: target.line_subtotal
    };

    return {
      success: true,
      updatedItem: updatedItem,
      cartSummary: {
        subtotal: cart.subtotal,
        discountTotal: cart.discount_total,
        total: cart.total,
        currency: cart.currency || 'USD'
      }
    };
  }

  // toggleCartItemPrivacy(cartItemId, privacyEnabled)
  toggleCartItemPrivacy(cartItemId, privacyEnabled) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const pe = !!privacyEnabled;

    let target = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        target = cartItems[i];
        break;
      }
    }
    if (!target) {
      return { success: false, updatedItem: null, cartSummary: this._buildCartSummary(cart) };
    }

    const domain = this._getDomainById(target.domain_id);
    if (target.item_type === 'registration') {
      const quote = this._calculateRegistrationPricing(domain, target.term_years || 1, pe);
      target.privacy_enabled = pe;
      target.privacy_price_per_year_snapshot = domain && domain.privacy_available ? (domain.privacy_price_per_year || 0) : 0;
      target.line_subtotal = quote.totalPrice;
    } else if (target.item_type === 'transfer') {
      const quote = this._calculateTransferPricing(domain, target.term_years || 1, pe);
      target.privacy_enabled = pe;
      target.privacy_price_per_year_snapshot = domain && domain.transfer_privacy_available ? (domain.transfer_privacy_price_per_year || 0) : 0;
      target.line_subtotal = quote.totalPrice;
    } else {
      // privacy not applicable to premium_purchase/payment_plan in this model
      target.privacy_enabled = pe;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const updatedItem = {
      cart_item_id: target.id,
      privacy_enabled: target.privacy_enabled,
      line_subtotal: target.line_subtotal
    };

    return {
      success: true,
      updatedItem: updatedItem,
      cartSummary: {
        subtotal: cart.subtotal,
        discountTotal: cart.discount_total,
        total: cart.total,
        currency: cart.currency || 'USD'
      }
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const remaining = [];
    let removed = false;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        removed = true;
      } else {
        remaining.push(cartItems[i]);
      }
    }

    if (removed) {
      // Also remove from cart.items
      const newCartItemsIds = [];
      for (let i = 0; i < cart.items.length; i++) {
        if (cart.items[i] !== cartItemId) newCartItemsIds.push(cart.items[i]);
      }
      cart.items = newCartItemsIds;
      this._saveToStorage('cart_items', remaining);
      this._recalculateCartTotals(cart);
    }

    return {
      success: removed,
      cartSummary: {
        itemCount: (cart.items && cart.items.length) || 0,
        subtotal: cart.subtotal,
        discountTotal: cart.discount_total,
        total: cart.total,
        currency: cart.currency || 'USD'
      }
    };
  }

  // applyPromoCodeToCart(code)
  applyPromoCodeToCart(code) {
    const cart = this._getOrCreateCart();
    const promoCodes = this._getFromStorage('promo_codes');
    const inputCode = (code || '').trim();

    let promo = null;
    for (let i = 0; i < promoCodes.length; i++) {
      if ((promoCodes[i].code || '').toLowerCase() === inputCode.toLowerCase()) {
        promo = promoCodes[i];
        break;
      }
    }
    if (!promo) {
      return {
        success: false,
        message: 'Promo code not found.',
        appliedPromoCode: null,
        cartSummary: {
          subtotal: cart.subtotal,
          discountTotal: cart.discount_total,
          total: cart.total,
          currency: cart.currency || 'USD'
        }
      };
    }

    const validation = this._validatePromoCode(cart, promo);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.reason || 'Promo code cannot be applied.',
        appliedPromoCode: null,
        cartSummary: {
          subtotal: cart.subtotal,
          discountTotal: cart.discount_total,
          total: cart.total,
          currency: cart.currency || 'USD'
        }
      };
    }

    cart.promo_code_id = promo.id;
    this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Promo code applied.',
      appliedPromoCode: {
        code: promo.code,
        description: promo.description,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        min_order_total: promo.min_order_total
      },
      cartSummary: {
        subtotal: cart.subtotal,
        discountTotal: cart.discount_total,
        total: cart.total,
        currency: cart.currency || 'USD'
      }
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id !== cart.id) continue;
      items.push({
        domain_name_snapshot: ci.domain_name_snapshot,
        item_type: ci.item_type,
        term_years: ci.term_years,
        privacy_enabled: ci.privacy_enabled,
        payment_plan_months: ci.payment_plan_months,
        payment_plan_monthly_payment: ci.payment_plan_monthly_payment,
        line_subtotal: ci.line_subtotal,
        currency: ci.currency
      });
    }

    const totals = {
      subtotal: cart.subtotal,
      discountTotal: cart.discount_total,
      total: cart.total,
      currency: cart.currency || 'USD'
    };

    let promoSummary = null;
    if (cart.promo_code_id) {
      const promoCodes = this._getFromStorage('promo_codes');
      for (let i = 0; i < promoCodes.length; i++) {
        if (promoCodes[i].id === cart.promo_code_id) {
          promoSummary = {
            code: promoCodes[i].code,
            description: promoCodes[i].description
          };
          break;
        }
      }
    }

    return {
      items: items,
      totals: totals,
      promoCode: promoSummary,
      requiresBillingInfo: true
    };
  }

  // createOrderFromCart(billingInfo)
  createOrderFromCart(billingInfo) {
    const cart = this._getOrCreateCart();
    const result = this._createOrderFromCurrentCart(cart, billingInfo || {});
    return result;
  }

  // getOrderConfirmation(orderId)
  getOrderConfirmation(orderId) {
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    let order = null;
    for (let i = 0; i < orders.length; i++) {
      if (orders[i].id === orderId) {
        order = orders[i];
        break;
      }
    }
    if (!order) {
      return {
        order: null,
        items: [],
        nextSteps: []
      };
    }

    let promoCodeCode = null;
    if (order.promo_code_id) {
      const promoCodes = this._getFromStorage('promo_codes');
      for (let i = 0; i < promoCodes.length; i++) {
        if (promoCodes[i].id === order.promo_code_id) {
          promoCodeCode = promoCodes[i].code || null;
          break;
        }
      }
    }

    const orderReturn = {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      created_at: order.created_at,
      completed_at: order.completed_at,
      subtotal: order.subtotal,
      discount_total: order.discount_total,
      total: order.total,
      currency: order.currency,
      promo_code_code: promoCodeCode,
      billing_name: order.billing_name,
      billing_email: order.billing_email,
      billing_address: order.billing_address
    };

    const items = [];
    for (let i = 0; i < orderItems.length; i++) {
      const oi = orderItems[i];
      if (oi.order_id !== order.id) continue;
      items.push({
        domain_name_snapshot: oi.domain_name_snapshot,
        item_type: oi.item_type,
        term_years: oi.term_years,
        privacy_enabled: oi.privacy_enabled,
        payment_plan_months: oi.payment_plan_months,
        payment_plan_monthly_payment: oi.payment_plan_monthly_payment,
        line_subtotal: oi.line_subtotal,
        currency: oi.currency
      });
    }

    const nextSteps = [
      'Check your email for your receipt and account details.',
      'Configure DNS or forwarding for your new domain(s).',
      'Complete any required verification emails from the registry.'
    ];

    return {
      order: orderReturn,
      items: items,
      nextSteps: nextSteps
    };
  }

  // submitPriceInquiry(domainId, name, email, budgetAmount, message, newsletterOptIn)
  submitPriceInquiry(domainId, name, email, budgetAmount, message, newsletterOptIn) {
    const domain = this._getDomainById(domainId);
    if (!domain) {
      return { success: false, inquiry: null, userMessage: 'Domain not found.' };
    }

    const amount = Number(budgetAmount);
    if (!amount || amount <= 0) {
      return { success: false, inquiry: null, userMessage: 'Invalid budget amount.' };
    }

    const inquiries = this._getFromStorage('price_inquiries');
    const id = this._generateId('price_inquiry');
    const nowIso = new Date().toISOString();

    const inquiry = {
      id: id,
      domain_id: domain.id,
      domain_name_snapshot: domain.domain_name,
      name: name,
      email: email,
      budget_amount: amount,
      message: message,
      newsletter_opt_in: !!newsletterOptIn,
      created_at: nowIso
    };

    inquiries.push(inquiry);
    this._saveToStorage('price_inquiries', inquiries);

    return {
      success: true,
      inquiry: Object.assign({}, inquiry, {
        // foreign key resolution
        domain: domain
      }),
      userMessage: 'Your price request has been sent to our brokerage team.'
    };
  }

  // Content / static page interfaces

  getAboutPageContent() {
    return {
      headline: 'We make premium domains accessible to everyone',
      body: 'Our platform connects entrepreneurs, brands, and investors with high-quality domain names. From everyday .com registrations to brokered premium assets, we provide transparent pricing, flexible payment options, and expert support.',
      highlights: [
        { label: 'Domains managed', value: 'Thousands' },
        { label: 'Customers served', value: 'Across 100+ countries' },
        { label: 'Founded', value: '2010' }
      ]
    };
  }

  getHelpFaqContent() {
    return {
      sections: [
        {
          sectionTitle: 'Searching for domains',
          faqs: [
            {
              question: 'How do I search for available domains?',
              answer: 'Use the search bar on the homepage to enter a keyword. You can then filter by extension, price, and category on the results page.'
            },
            {
              question: 'What does it mean if a domain is unavailable?',
              answer: 'Unavailable domains are already registered and cannot be purchased as new registrations. Some may still be listed as premium or brokered if the owner is selling.'
            }
          ]
        },
        {
          sectionTitle: 'Standard registrations',
          faqs: [
            {
              question: 'How long can I register a domain?',
              answer: 'Most domains can be registered for 1 to 10 years. Available terms are shown on the domain detail page.'
            },
            {
              question: 'What is WHOIS privacy?',
              answer: 'WHOIS privacy hides your personal contact details from the public WHOIS database, replacing them with proxy information where supported.'
            }
          ]
        },
        {
          sectionTitle: 'Premium domains & payment plans',
          faqs: [
            {
              question: 'What is a premium domain?',
              answer: 'Premium domains are high-value names that typically come with a one-time purchase price rather than a standard registration fee.'
            },
            {
              question: 'How do payment plans work?',
              answer: 'For eligible premium domains, you can spread the purchase over monthly installments. The payment plan options on the landing page show the monthly amount and total cost.'
            }
          ]
        },
        {
          sectionTitle: 'Transfers',
          faqs: [
            {
              question: 'How do I transfer a domain to you?',
              answer: 'Start on the Transfer page, enter your domain and authorization code, then complete checkout. The transfer includes a renewal extension for the domain.'
            }
          ]
        }
      ]
    };
  }

  getTermsOfServiceContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          heading: '1. Acceptance of terms',
          body: 'By using this website and purchasing domain-related services, you agree to be bound by these Terms of Service.'
        },
        {
          heading: '2. Domain registrations and renewals',
          body: 'All registrations are subject to the policies of the relevant registry and our upstream providers. It is your responsibility to maintain accurate contact details and renewals.'
        },
        {
          heading: '3. Premium and brokered domains',
          body: 'Premium and brokered domain purchases may involve third-party sellers. We act as an intermediary and cannot guarantee availability until the transaction is completed.'
        }
      ]
    };
  }

  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          heading: 'Information we collect',
          body: 'We collect contact details, billing information, and usage data necessary to process your orders and maintain your account.'
        },
        {
          heading: 'How we use your information',
          body: 'Your data is used to provide domain registration, transfer, and brokerage services, to communicate with you, and to comply with legal obligations.'
        },
        {
          heading: 'Data protection',
          body: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access and misuse.'
        }
      ]
    };
  }

  getContactPageInfo() {
    return {
      supportEmail: 'support@example-registrar.com',
      supportPhone: '+1-555-123-4567',
      workingHours: 'Mon–Fri, 9:00–18:00 (UTC)',
      introText: 'Have questions about a domain, transfer, or premium purchase? Contact our support team and we will get back to you as soon as possible.'
    };
  }

  // submitContactForm(name, email, subject, message, newsletterOptIn)
  submitContactForm(name, email, subject, message, newsletterOptIn) {
    const messages = this._getFromStorage('contact_messages');
    const id = this._generateId('contact_message');
    const nowIso = new Date().toISOString();

    const record = {
      id: id,
      name: name,
      email: email,
      subject: subject,
      message: message,
      newsletter_opt_in: !!newsletterOptIn,
      created_at: nowIso
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Your message has been sent. We will reply by email.'
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
