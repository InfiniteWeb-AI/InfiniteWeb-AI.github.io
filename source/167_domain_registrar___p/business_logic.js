// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

  _initStorage() {
    // Initialize all data tables/collections in localStorage if not exist
    const arrayKeys = [
      'site_pages',
      'nav_links',
      'tld_pricing',
      'domain_offers',
      'owned_domains',
      'domain_dns_records',
      'domain_forwarding_rules',
      'parked_page_templates',
      'parked_page_settings',
      'domain_addons',
      'domain_addon_subscriptions',
      'domain_renewal_settings',
      'cart', // collection of Cart objects
      'cart_items',
      'orders',
      'order_items',
      'domain_search_queries',
      'ad_categories',
      'static_pages', // for getStaticPageContent
      'help_articles', // for getHelpArticles
      'contact_requests' // for submitContactRequest
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Contact info as single object
    if (!localStorage.getItem('contact_info')) {
      localStorage.setItem('contact_info', JSON.stringify({}));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _formatPrice(amount) {
    const num = typeof amount === 'number' ? amount : 0;
    return '$' + num.toFixed(2);
  }

  _createCartObject() {
    return {
      id: this._generateId('cart'),
      status: 'open',
      items: [],
      currency: 'usd',
      subtotal: 0,
      tax: 0,
      total: 0,
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };
  }

  // Internal helper to fetch current open cart or create a new one
  _getOrCreateCart() {
    const carts = this._getFromStorage('cart', []);
    let cart = carts.find((c) => c.status === 'open');
    if (!cart) {
      cart = this._createCartObject();
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  // Internal helper to recompute cart totals
  _recalculateCartTotals(cart, allCartItems) {
    if (!cart) return;
    const itemsForCart = allCartItems.filter((ci) => ci.cart_id === cart.id);
    let subtotal = 0;
    itemsForCart.forEach((ci) => {
      const qty = ci.quantity != null ? ci.quantity : 1;
      const years = ci.term_years != null ? ci.term_years : (ci.registration_term_years || 0);
      if (typeof ci.unit_price_per_year === 'number' && years > 0) {
        ci.line_subtotal = ci.unit_price_per_year * years * qty;
      }
      if (typeof ci.line_subtotal === 'number') {
        subtotal += ci.line_subtotal;
      }
    });
    cart.subtotal = Number(subtotal.toFixed(2));
    cart.tax = 0;
    cart.total = cart.subtotal;
    cart.updated_at = this._nowISO();
  }

  // Internal helper to find an OwnedDomain by domain_name
  _getOwnedDomainByName(domainName) {
    const domains = this._getFromStorage('owned_domains', []);
    const lower = (domainName || '').toLowerCase();
    return domains.find((d) => (d.domain_name || '').toLowerCase() === lower) || null;
  }

  // Internal helper: associate add-on cart items with their domain registration cart items
  _linkCartItemsToAddons(cartItems) {
    const registrationMap = {}; // key -> registration CartItem
    const attachedAddons = {}; // regId -> [addon CartItem]

    cartItems.forEach((ci) => {
      if (ci.item_type === 'domain_registration') {
        const key = (ci.domain_name || '') + '|' + (ci.is_existing_domain ? 'existing' : 'new');
        registrationMap[key] = ci;
        attachedAddons[ci.id] = [];
      }
    });

    cartItems.forEach((ci) => {
      if (ci.item_type === 'domain_addon') {
        const key = (ci.domain_name || '') + '|' + (ci.is_existing_domain ? 'existing' : 'new');
        const reg = registrationMap[key];
        if (reg) {
          attachedAddons[reg.id].push(ci);
        }
      }
    });

    return attachedAddons; // map: registrationCartItemId -> [addon CartItem]
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getDashboardOverview()
  getDashboardOverview() {
    const domains = this._getFromStorage('owned_domains', []);
    const domain_forwarding_rules = this._getFromStorage('domain_forwarding_rules', []);
    const domain_addon_subscriptions = this._getFromStorage('domain_addon_subscriptions', []);

    const domain_summary = domains.map((d) => {
      const statusMap = {
        active: 'Active',
        expired: 'Expired',
        pending_setup: 'Pending Setup',
        parked: 'Parked',
        forwarding_only: 'Forwarding Only'
      };
      const status_label = statusMap[d.status] || 'Unknown';
      let days_to_expiry = null;
      if (d.registration_end) {
        const now = new Date();
        const end = new Date(d.registration_end);
        days_to_expiry = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      const has_forwarding = domain_forwarding_rules.some((r) => r.domain_id === d.id && r.is_enabled);
      const has_addons = domain_addon_subscriptions.some(
        (s) => s.domain_id === d.id && (s.status === 'active' || s.status === 'pending_activation')
      );
      return {
        domain_id: d.id,
        domain_name: d.domain_name,
        status: d.status,
        status_label,
        registration_end: d.registration_end || null,
        days_to_expiry,
        is_parked: !!d.is_parked,
        has_custom_dns: !!d.has_custom_dns,
        quick_actions: {
          can_manage_overview: true,
          can_manage_dns: true,
          can_manage_forwarding: true,
          can_manage_parked_page: true,
          can_manage_addons: has_addons,
          can_manage_renewal: d.status !== 'expired'
        }
      };
    });

    const carts = this._getFromStorage('cart', []);
    const openCart = carts.find((c) => c.status === 'open') || null;
    const cart_items = this._getFromStorage('cart_items', []);

    const cart_summary = {
      has_open_cart: !!openCart,
      item_count: openCart ? openCart.items.length : 0,
      subtotal: openCart ? (openCart.subtotal || 0) : 0,
      currency: (openCart && openCart.currency) || 'usd'
    };

    const orders = this._getFromStorage('orders', []);
    const recent_orders_sorted = [...orders].sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });
    const recent_orders = recent_orders_sorted.slice(0, 5).map((o) => {
      const cart = carts.find((c) => c.id === o.cart_id) || null;
      return {
        ...o,
        cart
      };
    });

    return {
      domain_summary,
      cart_summary,
      recent_orders
    };
  }

  // searchDomainOffers(query, tldFilters, maxPricePerYear, sortBy)
  searchDomainOffers(query, tldFilters, maxPricePerYear, sortBy) {
    const q = (query || '').trim().toLowerCase();
    const offers = this._getFromStorage('domain_offers', []);

    // Base filter by query
    let filtered = offers.filter((offer) => {
      if (!offer.is_available) return false;
      const name = (offer.domain_name || '').toLowerCase();
      const sld = (offer.sld || '').toLowerCase();
      const keywords = (offer.search_keywords || []).map((k) => String(k).toLowerCase());
      const matchesText =
        !q ||
        name.indexOf(q) !== -1 ||
        sld.indexOf(q) !== -1 ||
        keywords.some((k) => k.indexOf(q) !== -1);
      return matchesText;
    });

    // Apply max price filter if provided
    if (typeof maxPricePerYear === 'number') {
      filtered = filtered.filter((offer) => offer.price_per_year <= maxPricePerYear);
    }

    // Build available_tld_filters (before applying tldFilters)
    const tldFilterMap = {};
    filtered.forEach((offer) => {
      const tld = offer.tld;
      if (!tldFilterMap[tld]) {
        tldFilterMap[tld] = { tld, count: 0 };
      }
      tldFilterMap[tld].count += 1;
    });

    const rawTldFilters = Array.isArray(tldFilters) ? tldFilters : [];

    const available_tld_filters = Object.keys(tldFilterMap).map((tld) => ({
      tld,
      tld_label: tld,
      result_count: tldFilterMap[tld].count,
      selected: rawTldFilters.includes(tld)
    }));

    // Apply TLD filters to results
    if (rawTldFilters.length > 0) {
      filtered = filtered.filter((offer) => rawTldFilters.includes(offer.tld));
    }

    // Sort
    const sort = sortBy || 'relevance';
    if (sort === 'price_low_to_high') {
      filtered.sort((a, b) => a.price_per_year - b.price_per_year);
    } else if (sort === 'price_high_to_low') {
      filtered.sort((a, b) => b.price_per_year - a.price_per_year);
    }

    // Determine is_in_cart flags
    const carts = this._getFromStorage('cart', []);
    const openCart = carts.find((c) => c.status === 'open') || null;
    const cart_items = this._getFromStorage('cart_items', []);
    const inCartOfferIds = new Set();
    if (openCart) {
      const itemsForCart = cart_items.filter((ci) => ci.cart_id === openCart.id);
      itemsForCart.forEach((ci) => {
        if (ci.item_type === 'domain_registration' && ci.domain_offer_id) {
          inCartOfferIds.add(ci.domain_offer_id);
        }
      });
    }

    const results = filtered.map((offer) => {
      let availability_label = 'Available';
      if (!offer.is_available) {
        availability_label = 'Unavailable';
      } else if (offer.is_premium) {
        availability_label = 'Premium';
      }
      return {
        offer,
        display_price_per_year: offer.price_per_year,
        price_label: this._formatPrice(offer.price_per_year) + ' / yr',
        availability_label,
        is_in_cart: inCartOfferIds.has(offer.id)
      };
    });

    // Persist DomainSearchQuery
    const domain_search_queries = this._getFromStorage('domain_search_queries', []);
    const now = this._nowISO();
    const searchQuery = {
      id: this._generateId('search'),
      query_text: query,
      created_at: now,
      tld_filters: rawTldFilters,
      sort_by: sort,
      results_count: results.length,
      last_executed: now
    };
    domain_search_queries.push(searchQuery);
    this._saveToStorage('domain_search_queries', domain_search_queries);

    return {
      search: searchQuery,
      results,
      available_tld_filters
    };
  }

  // addDomainToCart(domainOfferId, registrationTermYears, enableWhoisPrivacy, enableEmailForwarding)
  addDomainToCart(domainOfferId, registrationTermYears, enableWhoisPrivacy, enableEmailForwarding) {
    const offers = this._getFromStorage('domain_offers', []);
    const offer = offers.find((o) => o.id === domainOfferId);
    if (!offer || !offer.is_available) {
      return {
        success: false,
        cart: null,
        added_items: [],
        message: 'Domain offer not available.'
      };
    }

    const termYears = registrationTermYears || 1;

    const carts = this._getFromStorage('cart', []);
    let cart = carts.find((c) => c.status === 'open');
    if (!cart) {
      cart = this._createCartObject();
      carts.push(cart);
    }

    const cart_items = this._getFromStorage('cart_items', []);

    // Check if this domain is already in cart as a registration
    let registrationItem = cart_items.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.item_type === 'domain_registration' &&
        ci.domain_offer_id === domainOfferId &&
        !ci.is_existing_domain
    );

    const added_items = [];

    if (!registrationItem) {
      registrationItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        item_type: 'domain_registration',
        domain_name: offer.domain_name,
        sld: offer.sld,
        tld: offer.tld,
        description: 'Registration for ' + offer.domain_name,
        owned_domain_id: null,
        domain_offer_id: domainOfferId,
        registration_term_years: termYears,
        addon_code: null,
        is_existing_domain: false,
        quantity: 1,
        term_years: termYears,
        unit_price_per_year: offer.price_per_year,
        line_subtotal: offer.price_per_year * termYears
      };
      cart_items.push(registrationItem);
      cart.items.push(registrationItem.id);
      added_items.push(registrationItem);
    } else {
      // Update existing registration term
      registrationItem.registration_term_years = termYears;
      registrationItem.term_years = termYears;
      registrationItem.line_subtotal = registrationItem.unit_price_per_year * termYears;
    }

    const domain_addons = this._getFromStorage('domain_addons', []);

    const maybeAddAddon = (addonCode, enabledFlag) => {
      if (!enabledFlag) return;
      const addon = domain_addons.find((a) => a.code === addonCode && a.is_active);
      if (!addon) return;

      const existingAddonItem = cart_items.find(
        (ci) =>
          ci.cart_id === cart.id &&
          ci.item_type === 'domain_addon' &&
          ci.addon_code === addonCode &&
          ci.domain_name === registrationItem.domain_name &&
          !ci.is_existing_domain
      );
      if (existingAddonItem) return;

      const addonItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        item_type: 'domain_addon',
        domain_name: registrationItem.domain_name,
        sld: registrationItem.sld,
        tld: registrationItem.tld,
        description: addon.name + ' for ' + registrationItem.domain_name,
        owned_domain_id: null,
        domain_offer_id: null,
        registration_term_years: null,
        addon_code: addonCode,
        is_existing_domain: false,
        quantity: 1,
        term_years: termYears,
        unit_price_per_year: addon.price_per_year,
        line_subtotal: addon.price_per_year * termYears
      };
      cart_items.push(addonItem);
      cart.items.push(addonItem.id);
      added_items.push(addonItem);
    };

    maybeAddAddon('whois_privacy', !!enableWhoisPrivacy);
    maybeAddAddon('email_forwarding', !!enableEmailForwarding);

    this._recalculateCartTotals(cart, cart_items);

    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cart_items);

    return {
      success: true,
      cart,
      added_items,
      message: 'Domain added to cart.'
    };
  }

  // getCart()
  getCart() {
    const carts = this._getFromStorage('cart', []);
    const cart_items = this._getFromStorage('cart_items', []);
    const domain_offers = this._getFromStorage('domain_offers', []);
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_addons = this._getFromStorage('domain_addons', []);

    const openCart = carts.find((c) => c.status === 'open') || null;

    if (!openCart) {
      return {
        cart: null,
        items: [],
        totals: {
          subtotal: 0,
          tax: 0,
          total: 0,
          currency: 'usd'
        }
      };
    }

    const itemsForCart = cart_items.filter((ci) => ci.cart_id === openCart.id);
    const addonsMap = this._linkCartItemsToAddons(itemsForCart);

    const offersById = {};
    domain_offers.forEach((o) => {
      offersById[o.id] = o;
    });
    const domainsById = {};
    owned_domains.forEach((d) => {
      domainsById[d.id] = d;
    });
    const addonsByCode = {};
    domain_addons.forEach((a) => {
      addonsByCode[a.code] = a;
    });

    const items = itemsForCart.map((ci) => {
      let item_type_label = '';
      if (ci.item_type === 'domain_registration') {
        item_type_label = 'Domain Registration';
      } else if (ci.item_type === 'domain_addon') {
        const addon = addonsByCode[ci.addon_code];
        if (addon) {
          item_type_label = addon.name + ' Add-on';
        } else {
          item_type_label = 'Domain Add-on';
        }
      }

      const domain_offer = ci.domain_offer_id ? offersById[ci.domain_offer_id] || null : null;
      const owned_domain = ci.owned_domain_id ? domainsById[ci.owned_domain_id] || null : null;

      const registration_term = ci.registration_term_years != null ? ci.registration_term_years : ci.term_years;
      const line_price_label = this._formatPrice(ci.line_subtotal || 0);

      const attached_addons = ci.item_type === 'domain_registration' ? (addonsMap[ci.id] || []) : [];
      const addons_attached = attached_addons.map((addonItem) => {
        const addon = addonsByCode[addonItem.addon_code];
        return {
          addon_code: addonItem.addon_code,
          addon_name: addon ? addon.name : 'Add-on',
          enabled: true,
          price_per_year: addonItem.unit_price_per_year
        };
      });

      const cart_item_enriched = {
        ...ci,
        cart: openCart,
        domain_offer,
        owned_domain
      };

      return {
        cart_item: cart_item_enriched,
        item_type_label,
        domain_display_name: ci.domain_name,
        tld_display_name: ci.tld,
        current_registration_term_years: registration_term || null,
        supports_term_change: ci.item_type === 'domain_registration',
        addons_attached,
        line_price_label
      };
    });

    // Ensure totals are up to date
    this._recalculateCartTotals(openCart, cart_items);
    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cart_items);

    const totals = {
      subtotal: openCart.subtotal || 0,
      tax: openCart.tax || 0,
      total: openCart.total || 0,
      currency: openCart.currency || 'usd'
    };

    return {
      cart: openCart,
      items,
      totals
    };
  }

  // updateCartItemRegistration(cartItemId, registrationTermYears)
  updateCartItemRegistration(cartItemId, registrationTermYears) {
    const carts = this._getFromStorage('cart', []);
    const cart_items = this._getFromStorage('cart_items', []);

    const cartItem = cart_items.find((ci) => ci.id === cartItemId);
    if (!cartItem || cartItem.item_type !== 'domain_registration') {
      return {
        success: false,
        cart_item: null,
        cart: null,
        message: 'Cart item not found or not a domain registration.'
      };
    }

    const cart = carts.find((c) => c.id === cartItem.cart_id) || null;
    if (!cart || cart.status !== 'open') {
      return {
        success: false,
        cart_item: null,
        cart,
        message: 'Cart is not open.'
      };
    }

    const termYears = registrationTermYears || 1;
    cartItem.registration_term_years = termYears;
    cartItem.term_years = termYears;
    if (typeof cartItem.unit_price_per_year === 'number') {
      cartItem.line_subtotal = cartItem.unit_price_per_year * termYears;
    }

    // Update any associated add-on items for the same domain and cart
    cart_items.forEach((ci) => {
      if (
        ci.cart_id === cart.id &&
        ci.item_type === 'domain_addon' &&
        ci.domain_name === cartItem.domain_name &&
        !ci.is_existing_domain
      ) {
        ci.term_years = termYears;
        if (typeof ci.unit_price_per_year === 'number') {
          ci.line_subtotal = ci.unit_price_per_year * termYears;
        }
      }
    });

    this._recalculateCartTotals(cart, cart_items);
    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cart_items);

    return {
      success: true,
      cart_item: cartItem,
      cart,
      message: 'Registration term updated.'
    };
  }

  // toggleCartItemAddon(domainRegistrationCartItemId, addonCode, enabled)
  toggleCartItemAddon(domainRegistrationCartItemId, addonCode, enabled) {
    const carts = this._getFromStorage('cart', []);
    const cart_items = this._getFromStorage('cart_items', []);
    const domain_addons = this._getFromStorage('domain_addons', []);

    const regItem = cart_items.find((ci) => ci.id === domainRegistrationCartItemId);
    if (!regItem || regItem.item_type !== 'domain_registration') {
      return {
        success: false,
        cart: null,
        updated_items: [],
        message: 'Domain registration cart item not found.'
      };
    }

    const cart = carts.find((c) => c.id === regItem.cart_id) || null;
    if (!cart || cart.status !== 'open') {
      return {
        success: false,
        cart,
        updated_items: [],
        message: 'Cart is not open.'
      };
    }

    const addon = domain_addons.find((a) => a.code === addonCode && a.is_active);
    if (!addon) {
      return {
        success: false,
        cart,
        updated_items: [],
        message: 'Add-on not available.'
      };
    }

    const existingAddonItem = cart_items.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.item_type === 'domain_addon' &&
        ci.addon_code === addonCode &&
        ci.domain_name === regItem.domain_name &&
        !ci.is_existing_domain
    );

    const updated_items = [];

    if (enabled) {
      if (!existingAddonItem) {
        const termYears = regItem.registration_term_years || regItem.term_years || 1;
        const addonItem = {
          id: this._generateId('cartitem'),
          cart_id: cart.id,
          item_type: 'domain_addon',
          domain_name: regItem.domain_name,
          sld: regItem.sld,
          tld: regItem.tld,
          description: addon.name + ' for ' + regItem.domain_name,
          owned_domain_id: null,
          domain_offer_id: null,
          registration_term_years: null,
          addon_code: addonCode,
          is_existing_domain: false,
          quantity: 1,
          term_years: termYears,
          unit_price_per_year: addon.price_per_year,
          line_subtotal: addon.price_per_year * termYears
        };
        cart_items.push(addonItem);
        cart.items.push(addonItem.id);
        updated_items.push(addonItem);
      }
    } else {
      if (existingAddonItem) {
        const idx = cart_items.findIndex((ci) => ci.id === existingAddonItem.id);
        if (idx !== -1) {
          cart_items.splice(idx, 1);
        }
        const idIndex = cart.items.indexOf(existingAddonItem.id);
        if (idIndex !== -1) {
          cart.items.splice(idIndex, 1);
        }
        updated_items.push(existingAddonItem);
      }
    }

    this._recalculateCartTotals(cart, cart_items);
    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cart_items);

    return {
      success: true,
      cart,
      updated_items,
      message: 'Add-on ' + (enabled ? 'enabled' : 'disabled') + '.'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const carts = this._getFromStorage('cart', []);
    const cart_items = this._getFromStorage('cart_items', []);

    const cartItem = cart_items.find((ci) => ci.id === cartItemId);
    if (!cartItem) {
      return {
        success: false,
        cart: null,
        message: 'Cart item not found.'
      };
    }

    const cart = carts.find((c) => c.id === cartItem.cart_id) || null;
    if (!cart) {
      return {
        success: false,
        cart,
        message: 'Cart not found.'
      };
    }

    // If removing a registration, also remove its attached add-ons
    if (cartItem.item_type === 'domain_registration') {
      const toRemoveIds = new Set();
      toRemoveIds.add(cartItem.id);
      cart_items.forEach((ci) => {
        if (
          ci.cart_id === cart.id &&
          ci.item_type === 'domain_addon' &&
          ci.domain_name === cartItem.domain_name &&
          ci.is_existing_domain === cartItem.is_existing_domain
        ) {
          toRemoveIds.add(ci.id);
        }
      });

      // Filter cart_items
      for (let i = cart_items.length - 1; i >= 0; i -= 1) {
        if (toRemoveIds.has(cart_items[i].id)) {
          cart_items.splice(i, 1);
        }
      }

      // Filter cart.items
      cart.items = cart.items.filter((id) => !toRemoveIds.has(id));
    } else {
      // Just remove this item
      const idx = cart_items.findIndex((ci) => ci.id === cartItem.id);
      if (idx !== -1) {
        cart_items.splice(idx, 1);
      }
      const idIndex = cart.items.indexOf(cartItem.id);
      if (idIndex !== -1) {
        cart.items.splice(idIndex, 1);
      }
    }

    this._recalculateCartTotals(cart, cart_items);
    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cart_items);

    return {
      success: true,
      cart,
      message: 'Cart item removed.'
    };
  }

  // placeOrderFromCart(billingDetails, paymentMethod)
  placeOrderFromCart(billingDetails, paymentMethod) {
    const carts = this._getFromStorage('cart', []);
    const cart_items = this._getFromStorage('cart_items', []);
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_addon_subscriptions = this._getFromStorage('domain_addon_subscriptions', []);
    const orders = this._getFromStorage('orders', []);
    const order_items = this._getFromStorage('order_items', []);

    const openCart = carts.find((c) => c.status === 'open') || null;
    if (!openCart) {
      return {
        order: null,
        order_items: [],
        owned_domains: [],
        message: 'No open cart to checkout.'
      };
    }

    const itemsForCart = cart_items.filter((ci) => ci.cart_id === openCart.id);
    if (itemsForCart.length === 0) {
      return {
        order: null,
        order_items: [],
        owned_domains: [],
        message: 'Cart is empty.'
      };
    }

    // Ensure totals
    this._recalculateCartTotals(openCart, cart_items);

    const now = this._nowISO();

    const order = {
      id: this._generateId('order'),
      order_number: 'ORD-' + this._getNextIdCounter(),
      status: 'paid',
      cart_id: openCart.id,
      currency: openCart.currency || 'usd',
      subtotal: openCart.subtotal || 0,
      tax: openCart.tax || 0,
      total: openCart.total || 0,
      created_at: now,
      updated_at: now,
      confirmation_message: 'Order placed successfully.'
    };
    orders.push(order);

    const impactedDomainIds = new Set();

    // Map domain_name -> OwnedDomain for quick lookup
    const domainsByName = {};
    owned_domains.forEach((d) => {
      domainsByName[(d.domain_name || '').toLowerCase()] = d;
    });

    // First, handle domain registrations to ensure OwnedDomain records exist
    itemsForCart
      .filter((ci) => ci.item_type === 'domain_registration')
      .forEach((ci) => {
        const domainNameLower = (ci.domain_name || '').toLowerCase();
        let domain = domainsByName[domainNameLower];
        const termYears = ci.registration_term_years || ci.term_years || 1;
        if (!domain || !ci.is_existing_domain) {
          // Create new domain
          const startDate = now;
          const endDate = new Date(startDate);
          endDate.setFullYear(endDate.getFullYear() + termYears);

          domain = {
            id: this._generateId('domain'),
            domain_name: ci.domain_name,
            sld: ci.sld,
            tld: ci.tld,
            status: 'active',
            registration_start: startDate,
            registration_end: endDate.toISOString(),
            registration_term_years: termYears,
            nameservers: [],
            is_parked: false,
            has_custom_dns: false,
            created_at: startDate,
            updated_at: startDate
          };
          owned_domains.push(domain);
          domainsByName[domainNameLower] = domain;
        }
        ci.owned_domain_id = domain.id;
        impactedDomainIds.add(domain.id);
      });

    // Then create OrderItems and add-on subscriptions
    itemsForCart.forEach((ci) => {
      const domain = ci.domain_name ? this._getOwnedDomainByName(ci.domain_name) : null;
      const orderItem = {
        id: this._generateId('orderitem'),
        order_id: order.id,
        item_type: ci.item_type,
        domain_name: ci.domain_name,
        sld: ci.sld,
        tld: ci.tld,
        description: ci.description,
        owned_domain_id: domain ? domain.id : ci.owned_domain_id || null,
        domain_offer_id: ci.domain_offer_id || null,
        registration_term_years: ci.registration_term_years || null,
        addon_code: ci.addon_code || null,
        quantity: ci.quantity != null ? ci.quantity : 1,
        term_years: ci.term_years || null,
        unit_price_per_year: ci.unit_price_per_year || 0,
        line_subtotal: ci.line_subtotal || 0
      };
      order_items.push(orderItem);

      if (orderItem.owned_domain_id) {
        impactedDomainIds.add(orderItem.owned_domain_id);
      }

      // Create/activate addon subscriptions for domain_addon items
      if (ci.item_type === 'domain_addon' && domain) {
        const termYears = ci.term_years || 1;
        const startDate = now;
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + termYears);

        const subscription = {
          id: this._generateId('addon_sub'),
          domain_id: domain.id,
          domain_name: domain.domain_name,
          addon_code: ci.addon_code,
          status: 'active',
          start_date: startDate,
          end_date: endDate.toISOString(),
          auto_renew: true
        };
        domain_addon_subscriptions.push(subscription);
      }
    });

    // Update cart status
    openCart.status = 'checked_out';
    openCart.updated_at = now;

    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cart_items);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', order_items);
    this._saveToStorage('owned_domains', owned_domains);
    this._saveToStorage('domain_addon_subscriptions', domain_addon_subscriptions);

    const impactedDomains = owned_domains.filter((d) => impactedDomainIds.has(d.id));

    // Enrich order with cart
    const orderEnriched = {
      ...order,
      cart: openCart
    };

    // Enrich order items with foreign key references
    const domain_offers = this._getFromStorage('domain_offers', []);
    const offersById = {};
    domain_offers.forEach((o) => {
      offersById[o.id] = o;
    });
    const domainsByIdFinal = {};
    owned_domains.forEach((d) => {
      domainsByIdFinal[d.id] = d;
    });

    const order_items_enriched = order_items
      .filter((oi) => oi.order_id === order.id)
      .map((oi) => ({
        ...oi,
        order: orderEnriched,
        owned_domain: oi.owned_domain_id ? domainsByIdFinal[oi.owned_domain_id] || null : null,
        domain_offer: oi.domain_offer_id ? offersById[oi.domain_offer_id] || null : null
      }));

    return {
      order: orderEnriched,
      order_items: order_items_enriched,
      owned_domains: impactedDomains,
      message: 'Order created successfully.'
    };
  }

  // getOrderDetails(orderId)
  getOrderDetails(orderId) {
    const orders = this._getFromStorage('orders', []);
    const order_items = this._getFromStorage('order_items', []);
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_offers = this._getFromStorage('domain_offers', []);
    const carts = this._getFromStorage('cart', []);

    const order = orders.find((o) => o.id === orderId) || null;
    if (!order) {
      return {
        order: null,
        items: [],
        domains: []
      };
    }

    const cart = carts.find((c) => c.id === order.cart_id) || null;
    const orderEnriched = {
      ...order,
      cart
    };

    const offersById = {};
    domain_offers.forEach((o) => {
      offersById[o.id] = o;
    });
    const domainsById = {};
    owned_domains.forEach((d) => {
      domainsById[d.id] = d;
    });

    const itemsForOrder = order_items.filter((oi) => oi.order_id === orderId);
    const itemsEnriched = itemsForOrder.map((oi) => ({
      ...oi,
      order: orderEnriched,
      owned_domain: oi.owned_domain_id ? domainsById[oi.owned_domain_id] || null : null,
      domain_offer: oi.domain_offer_id ? offersById[oi.domain_offer_id] || null : null
    }));

    const domainIds = new Set();
    itemsForOrder.forEach((oi) => {
      if (oi.owned_domain_id) domainIds.add(oi.owned_domain_id);
    });
    const domains = owned_domains.filter((d) => domainIds.has(d.id));

    return {
      order: orderEnriched,
      items: itemsEnriched,
      domains
    };
  }

  // getMyDomains(searchText, status)
  getMyDomains(searchText, status) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_forwarding_rules = this._getFromStorage('domain_forwarding_rules', []);
    const domain_addon_subscriptions = this._getFromStorage('domain_addon_subscriptions', []);

    const searchLower = (searchText || '').toLowerCase();

    const filtered = owned_domains.filter((d) => {
      if (status && d.status !== status) return false;
      if (searchLower) {
        return (d.domain_name || '').toLowerCase().indexOf(searchLower) !== -1;
      }
      return true;
    });

    const domainsSummary = filtered.map((d) => {
      const statusMap = {
        active: 'Active',
        expired: 'Expired',
        pending_setup: 'Pending Setup',
        parked: 'Parked',
        forwarding_only: 'Forwarding Only'
      };
      const status_label = statusMap[d.status] || 'Unknown';

      let expiration_label = '';
      if (d.registration_end) {
        expiration_label = 'Expires on ' + d.registration_end;
      } else {
        expiration_label = 'No expiration date set';
      }

      const has_forwarding = domain_forwarding_rules.some((r) => r.domain_id === d.id && r.is_enabled);
      const has_addons = domain_addon_subscriptions.some(
        (s) => s.domain_id === d.id && (s.status === 'active' || s.status === 'pending_activation')
      );

      return {
        domain: d,
        status_label,
        expiration_label,
        is_parked: !!d.is_parked,
        has_forwarding,
        has_addons
      };
    });

    return {
      domains: domainsSummary,
      total_count: domainsSummary.length
    };
  }

  // getDomainOverview(domainId)
  getDomainOverview(domainId) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_renewal_settings = this._getFromStorage('domain_renewal_settings', []);
    const domain_addon_subscriptions = this._getFromStorage('domain_addon_subscriptions', []);
    const parked_page_settings = this._getFromStorage('parked_page_settings', []);
    const domain_dns_records = this._getFromStorage('domain_dns_records', []);
    const domain_forwarding_rules = this._getFromStorage('domain_forwarding_rules', []);
    const parked_page_templates = this._getFromStorage('parked_page_templates', []);
    const ad_categories = this._getFromStorage('ad_categories', []);
    const domain_addons = this._getFromStorage('domain_addons', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        domain: null,
        renewal_setting: null,
        addon_subscriptions: [],
        parked_page_settings: null,
        dns_record_count: 0,
        forwarding_rule_count: 0
      };
    }

    const renewal_setting_raw = domain_renewal_settings.find((r) => r.domain_id === domainId) || null;
    const renewal_setting = renewal_setting_raw
      ? { ...renewal_setting_raw, domain }
      : null;

    const addonsByCode = {};
    domain_addons.forEach((a) => {
      addonsByCode[a.code] = a;
    });

    const addon_subscriptions_raw = domain_addon_subscriptions.filter((s) => s.domain_id === domainId);
    const addon_subscriptions = addon_subscriptions_raw.map((s) => ({
      ...s,
      domain,
      addon: addonsByCode[s.addon_code] || null
    }));

    const settings_raw = parked_page_settings.find((s) => s.domain_id === domainId) || null;
    let settings = null;
    if (settings_raw) {
      const template = settings_raw.template_id
        ? parked_page_templates.find((t) => t.id === settings_raw.template_id) || null
        : null;
      const resolvedCategories = (settings_raw.ad_categories || []).map((code) =>
        ad_categories.find((c) => c.code === code) || null
      );
      settings = {
        ...settings_raw,
        domain,
        template,
        ad_categories_resolved: resolvedCategories
      };
    }

    const dns_record_count = domain_dns_records.filter((r) => r.domain_id === domainId).length;
    const forwarding_rule_count = domain_forwarding_rules.filter((r) => r.domain_id === domainId).length;

    return {
      domain,
      renewal_setting,
      addon_subscriptions,
      parked_page_settings: settings,
      dns_record_count,
      forwarding_rule_count
    };
  }

  // updateDomainNameservers(domainId, nameservers)
  updateDomainNameservers(domainId, nameservers) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        domain: null,
        success: false,
        message: 'Domain not found.'
      };
    }

    domain.nameservers = Array.isArray(nameservers) ? nameservers.slice() : [];
    domain.has_custom_dns = true;
    domain.updated_at = this._nowISO();

    this._saveToStorage('owned_domains', owned_domains);

    return {
      domain,
      success: true,
      message: 'Nameservers updated.'
    };
  }

  // getDnsRecords(domainId)
  getDnsRecords(domainId) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_dns_records = this._getFromStorage('domain_dns_records', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        domain: null,
        records: [],
        ttl_options_seconds: [600, 1800, 3600]
      };
    }

    const records_raw = domain_dns_records.filter((r) => r.domain_id === domainId);
    const records = records_raw.map((r) => ({
      ...r,
      domain
    }));

    return {
      domain,
      records,
      ttl_options_seconds: [600, 1800, 3600]
    };
  }

  // addDnsRecord(domainId, type, host, value, ttlSeconds)
  addDnsRecord(domainId, type, host, value, ttlSeconds) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_dns_records = this._getFromStorage('domain_dns_records', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        record: null,
        records: [],
        success: false
      };
    }

    const now = this._nowISO();
    const record = {
      id: this._generateId('dns'),
      domain_id: domain.id,
      domain_name: domain.domain_name,
      type,
      host,
      value,
      ttl_seconds: ttlSeconds,
      is_system_record: false,
      created_at: now,
      updated_at: now
    };

    domain_dns_records.push(record);
    domain.has_custom_dns = true;
    domain.updated_at = now;

    this._saveToStorage('domain_dns_records', domain_dns_records);
    this._saveToStorage('owned_domains', owned_domains);

    const records = domain_dns_records.filter((r) => r.domain_id === domainId).map((r) => ({
      ...r,
      domain
    }));

    return {
      record: { ...record, domain },
      records,
      success: true
    };
  }

  // updateDnsRecord(recordId, host, value, ttlSeconds)
  updateDnsRecord(recordId, host, value, ttlSeconds) {
    const domain_dns_records = this._getFromStorage('domain_dns_records', []);
    const record = domain_dns_records.find((r) => r.id === recordId) || null;
    if (!record) {
      return {
        record: null,
        success: false
      };
    }

    if (typeof host === 'string') {
      record.host = host;
    }
    if (typeof value === 'string') {
      record.value = value;
    }
    if (typeof ttlSeconds === 'number') {
      record.ttl_seconds = ttlSeconds;
    }
    record.updated_at = this._nowISO();

    this._saveToStorage('domain_dns_records', domain_dns_records);

    return {
      record,
      success: true
    };
  }

  // deleteDnsRecord(recordId)
  deleteDnsRecord(recordId) {
    const domain_dns_records = this._getFromStorage('domain_dns_records', []);
    const idx = domain_dns_records.findIndex((r) => r.id === recordId);
    if (idx === -1) {
      return {
        success: false,
        message: 'DNS record not found.'
      };
    }

    domain_dns_records.splice(idx, 1);
    this._saveToStorage('domain_dns_records', domain_dns_records);

    return {
      success: true,
      message: 'DNS record deleted.'
    };
  }

  // getDomainForwarding(domainId)
  getDomainForwarding(domainId) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_forwarding_rules = this._getFromStorage('domain_forwarding_rules', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        domain: null,
        rules: []
      };
    }

    const rules = domain_forwarding_rules.filter((r) => r.domain_id === domainId).map((r) => ({
      ...r,
      domain
    }));

    return {
      domain,
      rules
    };
  }

  // upsertDomainForwardingRule(domainId, ruleId, sourceType, sourceHost, sourcePath, destinationUrl, redirectType, maskingEnabled, isEnabled)
  upsertDomainForwardingRule(
    domainId,
    ruleId,
    sourceType,
    sourceHost,
    sourcePath,
    destinationUrl,
    redirectType,
    maskingEnabled,
    isEnabled
  ) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_forwarding_rules = this._getFromStorage('domain_forwarding_rules', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        rule: null,
        rules: [],
        success: false
      };
    }

    const now = this._nowISO();
    let rule = null;

    if (ruleId) {
      rule = domain_forwarding_rules.find((r) => r.id === ruleId && r.domain_id === domainId) || null;
    }

    if (rule) {
      rule.source_type = sourceType;
      rule.source_host = sourceHost;
      rule.source_path = sourcePath;
      rule.destination_url = destinationUrl;
      rule.redirect_type = redirectType;
      rule.masking_enabled = maskingEnabled;
      rule.is_enabled = isEnabled;
      rule.updated_at = now;
    } else {
      rule = {
        id: this._generateId('fwd'),
        domain_id: domain.id,
        domain_name: domain.domain_name,
        source_type: sourceType,
        source_host: sourceHost,
        source_path: sourcePath,
        destination_url: destinationUrl,
        redirect_type: redirectType,
        masking_enabled: maskingEnabled,
        is_enabled: isEnabled,
        created_at: now,
        updated_at: now
      };
      domain_forwarding_rules.push(rule);
    }

    this._saveToStorage('domain_forwarding_rules', domain_forwarding_rules);

    const rules = domain_forwarding_rules.filter((r) => r.domain_id === domainId).map((r) => ({
      ...r,
      domain
    }));

    return {
      rule: { ...rule, domain },
      rules,
      success: true
    };
  }

  // getParkedPageTemplates()
  getParkedPageTemplates() {
    const templates = this._getFromStorage('parked_page_templates', []);
    return templates;
  }

  // getAdCategories()
  getAdCategories() {
    const categories = this._getFromStorage('ad_categories', []);
    return categories;
  }

  // getParkedPageSettings(domainId)
  getParkedPageSettings(domainId) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const parked_page_settings = this._getFromStorage('parked_page_settings', []);
    const parked_page_templates = this._getFromStorage('parked_page_templates', []);
    const ad_categories = this._getFromStorage('ad_categories', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        domain: null,
        settings: null
      };
    }

    const settings_raw = parked_page_settings.find((s) => s.domain_id === domainId) || null;
    if (!settings_raw) {
      return {
        domain,
        settings: null
      };
    }

    const template = settings_raw.template_id
      ? parked_page_templates.find((t) => t.id === settings_raw.template_id) || null
      : null;

    const resolvedCategories = (settings_raw.ad_categories || []).map((code) =>
      ad_categories.find((c) => c.code === code) || null
    );

    const settings = {
      ...settings_raw,
      domain,
      template,
      ad_categories_resolved: resolvedCategories
    };

    return {
      domain,
      settings
    };
  }

  // updateParkedPageSettings(domainId, enabled, templateCode, headline, description, adCategoryCodes, language, showAds)
  updateParkedPageSettings(
    domainId,
    enabled,
    templateCode,
    headline,
    description,
    adCategoryCodes,
    language,
    showAds
  ) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const parked_page_settings = this._getFromStorage('parked_page_settings', []);
    const parked_page_templates = this._getFromStorage('parked_page_templates', []);
    const ad_categories = this._getFromStorage('ad_categories', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        settings: null,
        success: false
      };
    }

    let settings = parked_page_settings.find((s) => s.domain_id === domainId) || null;
    const now = this._nowISO();

    if (!settings) {
      settings = {
        id: this._generateId('parked'),
        domain_id: domain.id,
        domain_name: domain.domain_name,
        enabled: !!enabled,
        template_id: null,
        template_code: null,
        headline: headline || null,
        description: description || null,
        ad_categories: Array.isArray(adCategoryCodes) ? adCategoryCodes.slice() : [],
        language: language || null,
        show_ads: typeof showAds === 'boolean' ? showAds : undefined,
        created_at: now,
        updated_at: now
      };
      parked_page_settings.push(settings);
    } else {
      if (typeof enabled === 'boolean') {
        settings.enabled = enabled;
      }
      if (typeof templateCode === 'string') {
        settings.template_code = templateCode;
      }
      if (typeof headline === 'string') {
        settings.headline = headline;
      }
      if (typeof description === 'string') {
        settings.description = description;
      }
      if (Array.isArray(adCategoryCodes)) {
        settings.ad_categories = adCategoryCodes.slice();
      }
      if (typeof language === 'string') {
        settings.language = language;
      }
      if (typeof showAds === 'boolean') {
        settings.show_ads = showAds;
      }
      settings.updated_at = now;
    }

    // Resolve template_id from templateCode if provided
    if (settings.template_code) {
      const template = parked_page_templates.find((t) => t.code === settings.template_code) || null;
      settings.template_id = template ? template.id : null;
    }

    // Update domain parked flag
    if (typeof settings.enabled === 'boolean') {
      domain.is_parked = settings.enabled;
      domain.updated_at = now;
    }

    this._saveToStorage('parked_page_settings', parked_page_settings);
    this._saveToStorage('owned_domains', owned_domains);

    const template = settings.template_id
      ? parked_page_templates.find((t) => t.id === settings.template_id) || null
      : null;

    const resolvedCategories = (settings.ad_categories || []).map((code) =>
      ad_categories.find((c) => c.code === code) || null
    );

    const settingsEnriched = {
      ...settings,
      domain,
      template,
      ad_categories_resolved: resolvedCategories
    };

    return {
      settings: settingsEnriched,
      success: true
    };
  }

  // getParkedPagePreview(domainId)
  getParkedPagePreview(domainId) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const parked_page_settings = this._getFromStorage('parked_page_settings', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        html_preview: ''
      };
    }

    const settings = parked_page_settings.find((s) => s.domain_id === domainId) || null;

    const headline = (settings && settings.headline) || domain.domain_name || 'Coming Soon';
    const description = (settings && settings.description) || '';

    const html =
      '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"><title>' +
      headline +
      '</title></head><body>' +
      '<h1>' +
      headline +
      '</h1>' +
      (description ? '<p>' + description + '</p>' : '') +
      '</body></html>';

    return {
      html_preview: html
    };
  }

  // getDomainAddonsForDomain(domainId)
  getDomainAddonsForDomain(domainId) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_addons = this._getFromStorage('domain_addons', []);
    const domain_addon_subscriptions = this._getFromStorage('domain_addon_subscriptions', []);
    const carts = this._getFromStorage('cart', []);
    const cart_items = this._getFromStorage('cart_items', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        domain: null,
        addons: []
      };
    }

    const activeSubs = domain_addon_subscriptions.filter((s) => s.domain_id === domainId);
    const openCart = carts.find((c) => c.status === 'open') || null;

    const addons = domain_addons.map((addon) => {
      const current_subscription = activeSubs.find((s) => s.addon_code === addon.code) || null;
      let status_label = 'Not Enabled';
      if (current_subscription) {
        if (current_subscription.status === 'active') {
          status_label = 'Active';
        } else if (current_subscription.status === 'pending_activation') {
          status_label = 'Pending Activation';
        } else if (current_subscription.status === 'cancelled') {
          status_label = 'Cancelled';
        }
      }

      let is_in_cart = false;
      if (openCart) {
        is_in_cart = cart_items.some(
          (ci) =>
            ci.cart_id === openCart.id &&
            ci.item_type === 'domain_addon' &&
            ci.addon_code === addon.code &&
            ci.domain_name === domain.domain_name &&
            ci.is_existing_domain
        );
      }

      const price_label = this._formatPrice(addon.price_per_year) + ' / yr';

      return {
        addon,
        current_subscription: current_subscription
          ? { ...current_subscription, domain }
          : null,
        is_in_cart,
        status_label,
        price_label
      };
    });

    return {
      domain,
      addons
    };
  }

  // addDomainAddonsToCart(domainId, addonCodes)
  addDomainAddonsToCart(domainId, addonCodes) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_addons = this._getFromStorage('domain_addons', []);
    const carts = this._getFromStorage('cart', []);
    const cart_items = this._getFromStorage('cart_items', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        cart: null,
        added_items: [],
        success: false,
        message: 'Domain not found.'
      };
    }

    let cart = carts.find((c) => c.status === 'open');
    if (!cart) {
      cart = this._createCartObject();
      carts.push(cart);
    }

    const codes = Array.isArray(addonCodes) ? addonCodes : [];
    const added_items = [];

    codes.forEach((code) => {
      const addon = domain_addons.find((a) => a.code === code && a.is_active);
      if (!addon) return;

      const exists = cart_items.some(
        (ci) =>
          ci.cart_id === cart.id &&
          ci.item_type === 'domain_addon' &&
          ci.addon_code === code &&
          ci.domain_name === domain.domain_name &&
          ci.is_existing_domain
      );
      if (exists) return;

      const termYears = domain.registration_term_years || 1;
      const addonItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        item_type: 'domain_addon',
        domain_name: domain.domain_name,
        sld: domain.sld,
        tld: domain.tld,
        description: addon.name + ' for ' + domain.domain_name,
        owned_domain_id: domain.id,
        domain_offer_id: null,
        registration_term_years: null,
        addon_code: code,
        is_existing_domain: true,
        quantity: 1,
        term_years: termYears,
        unit_price_per_year: addon.price_per_year,
        line_subtotal: addon.price_per_year * termYears
      };

      cart_items.push(addonItem);
      cart.items.push(addonItem.id);
      added_items.push(addonItem);
    });

    this._recalculateCartTotals(cart, cart_items);
    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cart_items);

    return {
      cart,
      added_items,
      success: true,
      message: 'Add-ons added to cart.'
    };
  }

  // getDomainRenewalSettings(domainId)
  getDomainRenewalSettings(domainId) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_renewal_settings = this._getFromStorage('domain_renewal_settings', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        domain: null,
        renewal_setting: null,
        allowed_terms_years: [1, 2, 3]
      };
    }

    let setting = domain_renewal_settings.find((r) => r.domain_id === domainId) || null;
    if (!setting) {
      setting = {
        id: this._generateId('renewal'),
        domain_id: domain.id,
        domain_name: domain.domain_name,
        renewal_type: 'manual',
        renewal_term_years: domain.registration_term_years || 1,
        last_updated: this._nowISO()
      };
      domain_renewal_settings.push(setting);
      this._saveToStorage('domain_renewal_settings', domain_renewal_settings);
    }

    const renewal_setting = {
      ...setting,
      domain
    };

    return {
      domain,
      renewal_setting,
      allowed_terms_years: [1, 2, 3]
    };
  }

  // updateDomainRenewalSettings(domainId, renewalType, renewalTermYears)
  updateDomainRenewalSettings(domainId, renewalType, renewalTermYears) {
    const owned_domains = this._getFromStorage('owned_domains', []);
    const domain_renewal_settings = this._getFromStorage('domain_renewal_settings', []);

    const domain = owned_domains.find((d) => d.id === domainId) || null;
    if (!domain) {
      return {
        renewal_setting: null,
        success: false
      };
    }

    let setting = domain_renewal_settings.find((r) => r.domain_id === domainId) || null;
    if (!setting) {
      setting = {
        id: this._generateId('renewal'),
        domain_id: domain.id,
        domain_name: domain.domain_name,
        renewal_type: renewalType,
        renewal_term_years: renewalTermYears,
        last_updated: this._nowISO()
      };
      domain_renewal_settings.push(setting);
    } else {
      setting.renewal_type = renewalType;
      setting.renewal_term_years = renewalTermYears;
      setting.last_updated = this._nowISO();
    }

    this._saveToStorage('domain_renewal_settings', domain_renewal_settings);

    const renewal_setting = {
      ...setting,
      domain
    };

    return {
      renewal_setting,
      success: true
    };
  }

  // getTldPricing(tlds)
  getTldPricing(tlds) {
    const tld_pricing = this._getFromStorage('tld_pricing', []);
    const filterList = Array.isArray(tlds) && tlds.length > 0 ? tlds : null;
    if (!filterList) {
      return tld_pricing;
    }
    return tld_pricing.filter((p) => filterList.includes(p.tld));
  }

  // getAddonPricing()
  getAddonPricing() {
    const domain_addons = this._getFromStorage('domain_addons', []);
    return domain_addons;
  }

  // getStaticPageContent(pageCode)
  getStaticPageContent(pageCode) {
    const static_pages = this._getFromStorage('static_pages', []);
    const page = static_pages.find((p) => p.pageCode === pageCode) || null;
    if (!page) {
      return {
        title: '',
        body: '',
        last_updated: ''
      };
    }
    return {
      title: page.title || '',
      body: page.body || '',
      last_updated: page.last_updated || ''
    };
  }

  // getHelpArticles(topic)
  getHelpArticles(topic) {
    const help_articles = this._getFromStorage('help_articles', []);
    const filtered = topic
      ? help_articles.filter((a) => a.topic === topic)
      : help_articles.slice();
    return {
      articles: filtered
    };
  }

  // getContactInfo()
  getContactInfo() {
    const raw = this._getFromStorage('contact_info', {});
    return {
      support_email: raw.support_email || '',
      support_hours: raw.support_hours || '',
      business_address: raw.business_address || '',
      additional_instructions: raw.additional_instructions || ''
    };
  }

  // submitContactRequest(name, email, subject, message)
  submitContactRequest(name, email, subject, message) {
    const contact_requests = this._getFromStorage('contact_requests', []);
    const ticket_id = this._generateId('ticket');
    const now = this._nowISO();

    const request = {
      id: ticket_id,
      name,
      email,
      subject,
      message,
      created_at: now
    };

    contact_requests.push(request);
    this._saveToStorage('contact_requests', contact_requests);

    return {
      success: true,
      ticket_id,
      message: 'Your request has been submitted.'
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
