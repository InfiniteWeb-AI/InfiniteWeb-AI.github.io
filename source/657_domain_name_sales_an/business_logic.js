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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const arrayKeys = [
      'domains',
      'hosting_plans',
      'web_development_packages',
      'web_development_project_requests',
      'templates',
      'websites',
      'site_pages',
      'owned_domains',
      'dns_records',
      'cart',
      'cart_items',
      'wishlists',
      'wishlist_items'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === 'undefined') {
      return defaultValue;
    }
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

  _nowISO() {
    return new Date().toISOString();
  }

  // ----------------------
  // Cart & Wishlist helpers
  // ----------------------

  _getActiveCart() {
    const carts = this._getFromStorage('cart', []);
    return carts.find((c) => c.status === 'active') || null;
  }

  _getOrCreateActiveCart() {
    const now = this._nowISO();
    const carts = this._getFromStorage('cart', []);
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _calculateCartTotals(cartId) {
    const cart = cartId ? { id: cartId } : this._getActiveCart();
    if (!cart) {
      return { totalItems: 0, totalPrice: 0, currency: 'USD' };
    }
    const cartItems = this._getFromStorage('cart_items', []).filter(
      (ci) => ci.cart_id === cart.id
    );
    let totalPrice = 0;
    let currency = 'USD';
    if (cartItems.length > 0) {
      totalPrice = cartItems.reduce((sum, ci) => sum + (ci.subtotal_price || 0), 0);
      // Derive currency from first related entity if possible
      const domains = this._getFromStorage('domains', []);
      const hostingPlans = this._getFromStorage('hosting_plans', []);
      const ownedDomains = this._getFromStorage('owned_domains', []);

      for (let i = 0; i < cartItems.length; i++) {
        const ci = cartItems[i];
        if (ci.item_type === 'domain_registration' && ci.domain_id) {
          const d = domains.find((x) => x.id === ci.domain_id);
          if (d && d.currency) {
            currency = d.currency;
            break;
          }
        } else if (ci.item_type === 'hosting_subscription' && ci.hosting_plan_id) {
          const p = hostingPlans.find((x) => x.id === ci.hosting_plan_id);
          if (p && p.currency) {
            currency = p.currency;
            break;
          }
        } else if (ci.item_type === 'domain_renewal' && ci.owned_domain_id) {
          const od = ownedDomains.find((x) => x.id === ci.owned_domain_id);
          if (od && od.currency) {
            currency = od.currency;
            break;
          }
        }
      }
    }
    return {
      totalItems: cartItems.length,
      totalPrice,
      currency
    };
  }

  _findOrCreateWishlist() {
    const now = this._nowISO();
    const wishlists = this._getFromStorage('wishlists', []);
    let wishlist = wishlists[0] || null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        created_at: now,
        updated_at: now
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  // ----------------------
  // Template gallery helper
  // ----------------------

  _persistTemplateGalleryState(state) {
    const existing = this._getFromStorage('template_gallery_filters', null);
    const newState = {
      id: existing && existing.id ? existing.id : 'template_gallery_state',
      category_id:
        (state && state.category_id) || (existing && existing.category_id) || 'all_templates',
      rating_filter:
        (state && state.rating_filter) || (existing && existing.rating_filter) || 'all',
      feature_filters:
        (state && Array.isArray(state.feature_filters)) ||
        (existing && Array.isArray(existing.feature_filters))
          ? (state && state.feature_filters) || existing.feature_filters
          : []
    };
    this._saveToStorage('template_gallery_filters', newState);
    return newState;
  }

  // ----------------------
  // Formatting helpers
  // ----------------------

  _formatPriceDisplay(amount, currency, options = {}) {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '';
    }
    const cur = currency || 'USD';
    let symbol = '';
    if (cur === 'USD') {
      symbol = '$';
    } else {
      symbol = cur + ' ';
    }
    const base = symbol + Number(amount).toFixed(2);
    if (options.per) {
      return base + '/' + options.per;
    }
    if (options.totalLabel) {
      return base + ' ' + options.totalLabel;
    }
    return base;
  }

  _generateSlugFromPageName(name) {
    if (!name || typeof name !== 'string') return 'page';
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'page';
  }

  _titleCase(str) {
    if (!str) return '';
    return str
      .split('_')
      .join(' ')
      .split(' ')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  // ======================
  // Interface implementations
  // ======================

  // --------------
  // Homepage
  // --------------

  getHomepageHighlights() {
    return {
      hero_title: 'Buy Domains & Launch Your Next Website',
      hero_subtitle: 'Find the perfect domain, hosting, and design package in one place.',
      domain_search_placeholder: 'Search for your domain (e.g. mygreatsite.com)',
      featured_services: [
        {
          id: 'domains',
          title: 'Domains',
          description: 'Search and register standard and premium domains.',
          cta_label: 'Search Domains'
        },
        {
          id: 'hosting',
          title: 'Web Hosting',
          description: 'Fast, secure shared hosting for your sites.',
          cta_label: 'View Hosting Plans'
        },
        {
          id: 'web_development',
          title: 'Web Development',
          description: 'Done-for-you business and e-commerce sites.',
          cta_label: 'Browse Packages'
        },
        {
          id: 'website_builder',
          title: 'Website Builder',
          description: 'Create your own site with professional templates.',
          cta_label: 'Create a Website'
        },
        {
          id: 'premium_domains',
          title: 'Premium Domains',
          description: 'High-value domains with existing traffic.',
          cta_label: 'Explore Premium Domains'
        }
      ]
    };
  }

  // --------------
  // Domain search
  // --------------

  getDomainSearchFilterOptions() {
    const domains = this._getFromStorage('domains', []);
    const tldSet = new Set();
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    domains.forEach((d) => {
      if (d.tld) tldSet.add(d.tld);
      if (typeof d.base_registration_price === 'number') {
        if (minPrice === null || d.base_registration_price < minPrice) {
          minPrice = d.base_registration_price;
        }
        if (maxPrice === null || d.base_registration_price > maxPrice) {
          maxPrice = d.base_registration_price;
        }
      }
      if (d.currency) {
        currency = d.currency;
      }
    });

    return {
      tld_options: Array.from(tldSet),
      price_range: {
        min_price: minPrice !== null ? minPrice : 0,
        max_price: maxPrice !== null ? maxPrice : 0,
        currency
      },
      sort_options: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'traffic_high_to_low', label: 'Traffic: High to Low' }
      ]
    };
  }

  searchDomains(query, filters, sort_by) {
    const q = (query || '').toLowerCase();
    const domains = this._getFromStorage('domains', []);
    const activeCart = this._getActiveCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const cartDomainIds = new Set(
      activeCart
        ? cartItems
            .filter(
              (ci) => ci.cart_id === activeCart.id && ci.item_type === 'domain_registration'
            )
            .map((ci) => ci.domain_id)
        : []
    );

    let results = domains.filter((d) => {
      const text = ((d.full_domain || '') + ' ' + (d.name || '')).toLowerCase();
      if (q && !text.includes(q)) return false;

      if (filters && filters.tlds && filters.tlds.length > 0) {
        if (!filters.tlds.includes(d.tld)) return false;
      }
      if (filters && typeof filters.min_price === 'number') {
        if (typeof d.base_registration_price === 'number' && d.base_registration_price < filters.min_price) {
          return false;
        }
      }
      if (filters && typeof filters.max_price === 'number') {
        if (typeof d.base_registration_price === 'number' && d.base_registration_price > filters.max_price) {
          return false;
        }
      }
      if (filters && typeof filters.is_premium === 'boolean') {
        if (d.is_premium !== filters.is_premium) return false;
      }
      if (filters && filters.category) {
        if (d.category !== filters.category) return false;
      }
      return true;
    });

    const sortKey = sort_by || 'relevance';
    if (sortKey === 'price_low_to_high') {
      results.sort((a, b) => (a.base_registration_price || 0) - (b.base_registration_price || 0));
    } else if (sortKey === 'price_high_to_low') {
      results.sort((a, b) => (b.base_registration_price || 0) - (a.base_registration_price || 0));
    } else if (sortKey === 'traffic_high_to_low') {
      results.sort((a, b) => (b.traffic_score || 0) - (a.traffic_score || 0));
    }

    const mapped = results.map((d) => ({
      domain: d,
      display_price: this._formatPriceDisplay(
        d.base_registration_price || 0,
        d.currency || 'USD',
        { per: 'year' }
      ),
      tld_label: d.tld ? '.' + d.tld : '',
      availability_badge:
        d.availability_status === 'available'
          ? 'Available'
          : d.availability_status === 'taken'
          ? 'Taken'
          : 'Unavailable',
      is_in_cart: cartDomainIds.has(d.id)
    }));

    return {
      results: mapped,
      total_count: mapped.length
    };
  }

  getDomainDetails(domainId) {
    const domains = this._getFromStorage('domains', []);
    const domain = domains.find((d) => d.id === domainId) || null;

    if (!domain) {
      return {
        domain: null,
        registration_options: {
          periods_years: [1],
          recommended_period_years: 1
        },
        privacy: {
          available: false,
          price_per_year: 0,
          currency: 'USD',
          description: 'Privacy protection not available.'
        },
        is_premium_label: 'Standard Domain'
      };
    }

    const periods = Array.isArray(domain.registration_periods_years) &&
      domain.registration_periods_years.length > 0
      ? domain.registration_periods_years
      : [1];
    const recommended = periods.includes(1) ? 1 : periods[0];

    const privacy = {
      available: !!domain.privacy_available,
      price_per_year: domain.privacy_price_per_year || 0,
      currency: domain.currency || 'USD',
      description: domain.privacy_available
        ? 'Protect your personal contact details in the public WHOIS database.'
        : 'Privacy protection not available.'
    };

    return {
      domain,
      registration_options: {
        periods_years: periods,
        recommended_period_years: recommended
      },
      privacy,
      is_premium_label: domain.is_premium ? 'Premium Domain' : 'Standard Domain'
    };
  }

  addDomainToCart(domainId, registration_period_years, with_privacy) {
    const domains = this._getFromStorage('domains', []);
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) {
      return {
        success: false,
        cart_item: null,
        cart_total_items: 0,
        cart_total_price: 0,
        currency: 'USD',
        message: 'Domain not found.'
      };
    }
    if (domain.availability_status && domain.availability_status !== 'available') {
      return {
        success: false,
        cart_item: null,
        cart_total_items: 0,
        cart_total_price: 0,
        currency: domain.currency || 'USD',
        message: 'Domain is not available for registration.'
      };
    }

    const cart = this._getOrCreateActiveCart();
    const now = this._nowISO();
    const cartItems = this._getFromStorage('cart_items', []);
    const years = registration_period_years || 1;
    const includePrivacy = !!with_privacy;

    let cartItem = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.item_type === 'domain_registration' &&
        ci.domain_id === domainId
    );

    const baseTotal = (domain.base_registration_price || 0) * years;
    const privacyTotal = includePrivacy && domain.privacy_available
      ? (domain.privacy_price_per_year || 0) * years
      : 0;
    const subtotal = baseTotal + privacyTotal;

    if (cartItem) {
      cartItem.registration_period_years = years;
      cartItem.with_privacy = includePrivacy;
      cartItem.privacy_price_total = privacyTotal;
      cartItem.unit_price = domain.base_registration_price || 0;
      cartItem.subtotal_price = subtotal;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'domain_registration',
        domain_id: domain.id,
        hosting_plan_id: null,
        owned_domain_id: null,
        web_package_id: null,
        description: domain.full_domain + ' - ' + years + ' year' + (years > 1 ? 's' : '') +
          (includePrivacy ? ' + privacy' : ''),
        quantity: 1,
        unit_price: domain.base_registration_price || 0,
        registration_period_years: years,
        term_months: null,
        with_privacy: includePrivacy,
        privacy_price_total: privacyTotal,
        subtotal_price: subtotal,
        created_at: now
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      cart_item: cartItem,
      cart_total_items: totals.totalItems,
      cart_total_price: totals.totalPrice,
      currency: totals.currency,
      message: 'Domain added to cart.'
    };
  }

  // -----------------
  // Premium domains
  // -----------------

  getPremiumDomainFilterOptions() {
    const domains = this._getFromStorage('domains', []);
    let premium = domains.filter((d) => d.is_premium);
    // Fallback: if no domains are explicitly marked as premium, treat all domains as premium
    if (premium.length === 0) {
      premium = domains.slice();
    }

    const categorySet = new Set();
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    premium.forEach((d) => {
      if (d.category) categorySet.add(d.category);
      if (typeof d.base_registration_price === 'number') {
        if (minPrice === null || d.base_registration_price < minPrice) {
          minPrice = d.base_registration_price;
        }
        if (maxPrice === null || d.base_registration_price > maxPrice) {
          maxPrice = d.base_registration_price;
        }
      }
      if (d.currency) currency = d.currency;
    });

    const category_options = Array.from(categorySet).map((value) => ({
      value,
      label: this._titleCase(value)
    }));

    return {
      category_options,
      price_range: {
        min_price: minPrice !== null ? minPrice : 0,
        max_price: maxPrice !== null ? maxPrice : 0,
        currency
      },
      sort_options: [
        { value: 'traffic_high_to_low', label: 'Traffic: High to Low' },
        { value: 'price_low_to_high', label: 'Price: Low to High' }
      ]
    };
  }

  searchPremiumDomains(category, min_price, max_price, sort_by) {
    const domains = this._getFromStorage('domains', []);
    let premium = domains.filter((d) => d.is_premium);
    // Fallback: if no domains are explicitly marked as premium, treat all domains as premium
    if (premium.length === 0) {
      premium = domains.slice();
    }

    let results = premium.filter((d) => {
      if (category && d.category !== category) return false;
      if (typeof min_price === 'number' && (d.base_registration_price || 0) < min_price) {
        return false;
      }
      if (typeof max_price === 'number' && (d.base_registration_price || 0) > max_price) {
        return false;
      }
      return true;
    });

    const sortKey = sort_by || 'traffic_high_to_low';
    if (sortKey === 'traffic_high_to_low') {
      results.sort((a, b) => (b.traffic_score || 0) - (a.traffic_score || 0));
    } else if (sortKey === 'price_low_to_high') {
      results.sort((a, b) => (a.base_registration_price || 0) - (b.base_registration_price || 0));
    }

    const mapped = results.map((d) => {
      const score = d.traffic_score || 0;
      let band = 'Low traffic';
      if (score >= 80) band = 'High traffic';
      else if (score >= 50) band = 'Medium traffic';
      return {
        domain: d,
        display_price: this._formatPriceDisplay(
          d.base_registration_price || 0,
          d.currency || 'USD',
          { per: 'year' }
        ),
        traffic_score_label: band
      };
    });

    return {
      results: mapped,
      total_count: mapped.length
    };
  }

  addDomainToWishlist(domainId) {
    const domains = this._getFromStorage('domains', []);
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) {
      return {
        success: false,
        wishlist_item: null,
        message: 'Domain not found.'
      };
    }

    const wishlist = this._findOrCreateWishlist();
    const now = this._nowISO();
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    let item = wishlistItems.find(
      (wi) => wi.wishlist_id === wishlist.id && wi.domain_id === domainId
    );

    if (!item) {
      item = {
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        domain_id: domainId,
        added_at: now,
        notes: null
      };
      wishlistItems.push(item);
      this._saveToStorage('wishlist_items', wishlistItems);
    }

    return {
      success: true,
      wishlist_item: item,
      message: 'Domain added to wishlist.'
    };
  }

  getWishlistContents() {
    const wishlist = this._findOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const domains = this._getFromStorage('domains', []);

    const items = wishlistItems
      .filter((wi) => wi.wishlist_id === wishlist.id)
      .map((wi) => ({
        wishlist_item: wi,
        domain: domains.find((d) => d.id === wi.domain_id) || null
      }));

    return { items };
  }

  // --------------
  // Cart contents & updates
  // --------------

  getCartContents() {
    const cart = this._getOrCreateActiveCart();
    const cartItems = this._getFromStorage('cart_items', []).filter(
      (ci) => ci.cart_id === cart.id
    );

    const domains = this._getFromStorage('domains', []);
    const hostingPlans = this._getFromStorage('hosting_plans', []);
    const ownedDomains = this._getFromStorage('owned_domains', []);
    const webPackages = this._getFromStorage('web_development_packages', []);

    const items = cartItems.map((ci) => {
      let display_name = '';
      let item_type_label = '';
      let currency = 'USD';
      let domain = null;
      let hosting_plan = null;
      let owned_domain = null;
      let web_package = null;

      if (ci.item_type === 'domain_registration') {
        domain = domains.find((d) => d.id === ci.domain_id) || null;
        item_type_label = 'Domain Registration';
        if (domain) {
          currency = domain.currency || 'USD';
          const years = ci.registration_period_years || 1;
          display_name =
            domain.full_domain +
            ' - ' +
            years +
            ' year' +
            (years > 1 ? 's' : '') +
            (ci.with_privacy ? ' + privacy' : '');
        } else {
          display_name = 'Domain Registration';
        }
      } else if (ci.item_type === 'hosting_subscription') {
        hosting_plan = hostingPlans.find((p) => p.id === ci.hosting_plan_id) || null;
        item_type_label = 'Hosting Plan';
        if (hosting_plan) {
          currency = hosting_plan.currency || 'USD';
          display_name =
            hosting_plan.name +
            ' - ' +
            (ci.term_months || 0) +
            ' month' +
            ((ci.term_months || 0) === 1 ? '' : 's');
        } else {
          display_name = 'Hosting Subscription';
        }
      } else if (ci.item_type === 'domain_renewal') {
        owned_domain = ownedDomains.find((od) => od.id === ci.owned_domain_id) || null;
        item_type_label = 'Domain Renewal';
        if (owned_domain) {
          currency = owned_domain.currency || 'USD';
          const years = ci.registration_period_years || 1;
          display_name =
            owned_domain.domain_name +
            ' - Renewal for ' +
            years +
            ' year' +
            (years > 1 ? 's' : '');
        } else {
          display_name = 'Domain Renewal';
        }
      } else if (ci.item_type === 'web_development_package') {
        web_package = webPackages.find((wp) => wp.id === ci.web_package_id) || null;
        item_type_label = 'Web Development Package';
        if (web_package) {
          currency = web_package.currency || 'USD';
          display_name = web_package.name;
        } else {
          display_name = 'Web Development Package';
        }
      }

      const price_display = this._formatPriceDisplay(
        ci.subtotal_price || 0,
        currency,
        { totalLabel: 'total' }
      );

      const item = {
        cart_item: ci,
        display_name,
        item_type_label,
        price_display
      };

      // Foreign key resolution
      if (domain) item.domain = domain;
      if (hosting_plan) item.hosting_plan = hosting_plan;
      if (owned_domain) item.owned_domain = owned_domain;
      if (web_package) item.web_package = web_package;

      return item;
    });

    const totals = this._calculateCartTotals(cart.id);

    return {
      cart,
      items,
      cart_total_items: totals.totalItems,
      cart_total_price: totals.totalPrice,
      currency: totals.currency
    };
  }

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      const totals = this._calculateCartTotals();
      return {
        success: false,
        cart_total_items: totals.totalItems,
        cart_total_price: totals.totalPrice,
        currency: totals.currency,
        message: 'Cart item not found.'
      };
    }

    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals();
    return {
      success: true,
      cart_total_items: totals.totalItems,
      cart_total_price: totals.totalPrice,
      currency: totals.currency,
      message: 'Cart item removed.'
    };
  }

  updateCartItemDomainOptions(cartItemId, registration_period_years, with_privacy) {
    const cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item || item.item_type !== 'domain_registration') {
      const totals = this._calculateCartTotals();
      return {
        success: false,
        cart_item: null,
        cart_total_price: totals.totalPrice,
        currency: totals.currency,
        message: 'Domain registration cart item not found.'
      };
    }

    const domains = this._getFromStorage('domains', []);
    const domain = domains.find((d) => d.id === item.domain_id);
    if (!domain) {
      const totals = this._calculateCartTotals();
      return {
        success: false,
        cart_item: null,
        cart_total_price: totals.totalPrice,
        currency: totals.currency,
        message: 'Associated domain not found.'
      };
    }

    const years = typeof registration_period_years === 'number'
      ? registration_period_years
      : item.registration_period_years || 1;

    const includePrivacy =
      typeof with_privacy === 'boolean' ? with_privacy : !!item.with_privacy;

    const baseTotal = (domain.base_registration_price || 0) * years;
    const privacyTotal = includePrivacy && domain.privacy_available
      ? (domain.privacy_price_per_year || 0) * years
      : 0;
    const subtotal = baseTotal + privacyTotal;

    item.registration_period_years = years;
    item.with_privacy = includePrivacy;
    item.privacy_price_total = privacyTotal;
    item.unit_price = domain.base_registration_price || 0;
    item.subtotal_price = subtotal;

    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals(item.cart_id);

    return {
      success: true,
      cart_item: item,
      cart_total_price: totals.totalPrice,
      currency: totals.currency,
      message: 'Cart item updated.'
    };
  }

  updateCartItemHostingTerm(cartItemId, term_months) {
    const cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item || item.item_type !== 'hosting_subscription') {
      const totals = this._calculateCartTotals();
      return {
        success: false,
        cart_item: null,
        cart_total_price: totals.totalPrice,
        currency: totals.currency,
        message: 'Hosting subscription cart item not found.'
      };
    }

    const hostingPlans = this._getFromStorage('hosting_plans', []);
    const plan = hostingPlans.find((p) => p.id === item.hosting_plan_id);
    if (!plan) {
      const totals = this._calculateCartTotals();
      return {
        success: false,
        cart_item: null,
        cart_total_price: totals.totalPrice,
        currency: totals.currency,
        message: 'Associated hosting plan not found.'
      };
    }

    const months = term_months;
    let priceTotal = 0;
    if (months === 12 && typeof plan.price_12_months === 'number') {
      priceTotal = plan.price_12_months;
    } else if (months === 24 && typeof plan.price_24_months === 'number') {
      priceTotal = plan.price_24_months;
    } else if (months === 36 && typeof plan.price_36_months === 'number') {
      priceTotal = plan.price_36_months;
    } else if (typeof plan.price_12_months === 'number') {
      // Fallback: proportional to 12-month price
      priceTotal = (plan.price_12_months / 12) * months;
    }

    item.term_months = months;
    item.unit_price = priceTotal;
    item.subtotal_price = priceTotal;

    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals(item.cart_id);

    return {
      success: true,
      cart_item: item,
      cart_total_price: totals.totalPrice,
      currency: totals.currency,
      message: 'Hosting term updated.'
    };
  }

  beginCheckout() {
    const cart = this._getActiveCart();
    if (!cart) {
      return {
        success: false,
        cart: null,
        next_step: null
      };
    }
    const cartItems = this._getFromStorage('cart_items', []).filter(
      (ci) => ci.cart_id === cart.id
    );
    if (cartItems.length === 0) {
      return {
        success: false,
        cart,
        next_step: null
      };
    }

    return {
      success: true,
      cart,
      next_step: 'checkout_customer_details'
    };
  }

  // --------------
  // Hosting
  // --------------

  getHostingOverview() {
    const hostingPlans = this._getFromStorage('hosting_plans', []);
    const sharedPlans = hostingPlans.filter((p) => p.category === 'shared');

    const categories = [
      {
        id: 'shared',
        label: 'Shared Hosting',
        description: 'Affordable hosting for small to medium sites.'
      },
      {
        id: 'vps',
        label: 'VPS Hosting',
        description: 'More power and control for growing projects.'
      },
      {
        id: 'dedicated',
        label: 'Dedicated Hosting',
        description: 'Full servers for maximum performance.'
      },
      {
        id: 'cloud',
        label: 'Cloud Hosting',
        description: 'Scalable hosting for modern apps.'
      }
    ];

    return {
      categories,
      featured_shared_plans: sharedPlans
    };
  }

  getHostingPlanComparison(category) {
    const hostingPlans = this._getFromStorage('hosting_plans', []);
    const plans = hostingPlans.filter((p) => p.category === category);

    // Determine cheapest plan meeting 3 websites and 50GB storage
    const qualifying = plans.filter(
      (p) => (p.websites_supported || 0) >= 3 && (p.storage_gb || 0) >= 50
    );
    let cheapestId = null;
    if (qualifying.length > 0) {
      qualifying.sort((a, b) => (a.price_12_months || 0) - (b.price_12_months || 0));
      cheapestId = qualifying[0].id;
    }

    const mapped = plans.map((p) => ({
      plan: p,
      websites_supported_label: (p.websites_supported || 0) + ' websites',
      storage_label: (p.storage_gb || 0) + ' GB',
      price_12_months_display: this._formatPriceDisplay(
        p.price_12_months || 0,
        p.currency || 'USD',
        { per: 'year' }
      ),
      is_cheapest_meeting_constraints: p.id === cheapestId
    }));

    return { plans: mapped };
  }

  getHostingPlanBillingOptions(hostingPlanId) {
    const hostingPlans = this._getFromStorage('hosting_plans', []);
    const plan = hostingPlans.find((p) => p.id === hostingPlanId) || null;
    if (!plan) {
      return {
        plan: null,
        billing_cycles: []
      };
    }

    const cycles = [];
    const currency = plan.currency || 'USD';

    if (typeof plan.price_12_months === 'number') {
      cycles.push({
        term_months: 12,
        price_total: plan.price_12_months,
        price_per_month_display: this._formatPriceDisplay(
          plan.price_12_months / 12,
          currency,
          { per: 'month' }
        ),
        label: '12 months',
        is_recommended: false
      });
    }
    if (typeof plan.price_24_months === 'number') {
      cycles.push({
        term_months: 24,
        price_total: plan.price_24_months,
        price_per_month_display: this._formatPriceDisplay(
          plan.price_24_months / 24,
          currency,
          { per: 'month' }
        ),
        label: '24 months',
        is_recommended: false
      });
    }
    if (typeof plan.price_36_months === 'number') {
      cycles.push({
        term_months: 36,
        price_total: plan.price_36_months,
        price_per_month_display: this._formatPriceDisplay(
          plan.price_36_months / 36,
          currency,
          { per: 'month' }
        ),
        label: '36 months',
        is_recommended: false
      });
    }

    // Mark longest term as recommended by default
    if (cycles.length > 0) {
      cycles.sort((a, b) => a.term_months - b.term_months);
      cycles[cycles.length - 1].is_recommended = true;
    }

    return {
      plan,
      billing_cycles: cycles
    };
  }

  addHostingPlanToCart(hostingPlanId, term_months) {
    const hostingPlans = this._getFromStorage('hosting_plans', []);
    const plan = hostingPlans.find((p) => p.id === hostingPlanId);
    if (!plan) {
      return {
        success: false,
        cart_item: null,
        cart_total_items: 0,
        cart_total_price: 0,
        currency: 'USD',
        message: 'Hosting plan not found.'
      };
    }

    const cart = this._getOrCreateActiveCart();
    const now = this._nowISO();
    const cartItems = this._getFromStorage('cart_items', []);

    let item = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.item_type === 'hosting_subscription' &&
        ci.hosting_plan_id === hostingPlanId
    );

    const months = term_months;
    let priceTotal = 0;
    if (months === 12 && typeof plan.price_12_months === 'number') {
      priceTotal = plan.price_12_months;
    } else if (months === 24 && typeof plan.price_24_months === 'number') {
      priceTotal = plan.price_24_months;
    } else if (months === 36 && typeof plan.price_36_months === 'number') {
      priceTotal = plan.price_36_months;
    } else if (typeof plan.price_12_months === 'number') {
      priceTotal = (plan.price_12_months / 12) * months;
    }

    if (item) {
      item.term_months = months;
      item.unit_price = priceTotal;
      item.subtotal_price = priceTotal;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'hosting_subscription',
        domain_id: null,
        hosting_plan_id: plan.id,
        owned_domain_id: null,
        web_package_id: null,
        description: plan.name + ' - ' + months + ' months',
        quantity: 1,
        unit_price: priceTotal,
        registration_period_years: null,
        term_months: months,
        with_privacy: null,
        privacy_price_total: null,
        subtotal_price: priceTotal,
        created_at: now
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      cart_item: item,
      cart_total_items: totals.totalItems,
      cart_total_price: totals.totalPrice,
      currency: totals.currency,
      message: 'Hosting plan added to cart.'
    };
  }

  // ---------------------
  // Web development packages
  // ---------------------

  getWebDevPackageFilterOptions() {
    const packages = this._getFromStorage('web_development_packages', []);

    const projectTypeSet = new Set();
    const featureSet = new Set();
    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';

    packages.forEach((p) => {
      if (p.project_type) projectTypeSet.add(p.project_type);
      if (Array.isArray(p.features)) {
        p.features.forEach((f) => featureSet.add(f));
      }
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (p.currency) currency = p.currency;
    });

    const project_types = Array.from(projectTypeSet).map((value) => ({
      value,
      label: this._titleCase(value)
    }));

    const feature_filters = Array.from(featureSet).map((key) => ({
      key,
      label: this._titleCase(key)
    }));

    return {
      project_types,
      feature_filters,
      price_range: {
        min_price: minPrice !== null ? minPrice : 0,
        max_price: maxPrice !== null ? maxPrice : 0,
        currency
      }
    };
  }

  searchWebDevelopmentPackages(filters) {
    const packages = this._getFromStorage('web_development_packages', []);
    const f = filters || {};
    const statusFilter = f.status || 'active';

    const filtered = packages.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (f.project_type && p.project_type !== f.project_type) return false;
      if (typeof f.includes_ecommerce === 'boolean') {
        if (!!p.includes_ecommerce !== f.includes_ecommerce) return false;
      }
      if (typeof f.min_price === 'number' && (p.price || 0) < f.min_price) return false;
      if (typeof f.max_price === 'number' && (p.price || 0) > f.max_price) return false;
      return true;
    });

    const mapped = filtered.map((p) => ({
      web_package: p,
      price_display: this._formatPriceDisplay(p.price || 0, p.currency || 'USD', {
        totalLabel: 'total'
      }),
      project_type_label: this._titleCase(p.project_type),
      includes_ecommerce_label: p.includes_ecommerce
        ? 'Includes E-commerce'
        : 'No E-commerce'
    }));

    return { packages: mapped };
  }

  getWebDevelopmentPackageDetails(webPackageId) {
    const packages = this._getFromStorage('web_development_packages', []);
    const web_package = packages.find((p) => p.id === webPackageId) || null;

    if (!web_package) {
      return {
        web_package: null,
        feature_list: [],
        timeline_options: [],
        price_display: ''
      };
    }

    const feature_list = Array.isArray(web_package.features)
      ? web_package.features.slice()
      : [];
    const timeline_options = Array.isArray(web_package.estimated_timeline_options)
      ? web_package.estimated_timeline_options.slice()
      : [];

    const price_display = this._formatPriceDisplay(
      web_package.price || 0,
      web_package.currency || 'USD',
      { totalLabel: 'total' }
    );

    return {
      web_package,
      feature_list,
      timeline_options,
      price_display
    };
  }

  createWebDevelopmentProjectRequest(
    webPackageId,
    business_name,
    project_description,
    timeline_preference
  ) {
    const packages = this._getFromStorage('web_development_packages', []);
    const web_package = packages.find((p) => p.id === webPackageId) || null;
    if (!web_package) {
      return {
        success: false,
        project_request: null,
        message: 'Web development package not found.'
      };
    }

    const requests = this._getFromStorage('web_development_project_requests', []);
    const now = this._nowISO();

    const project_request = {
      id: this._generateId('web_project'),
      web_package_id: webPackageId,
      business_name,
      project_description,
      timeline_preference,
      status: 'submitted',
      created_at: now
    };

    requests.push(project_request);
    this._saveToStorage('web_development_project_requests', requests);

    return {
      success: true,
      project_request,
      message: 'Project request submitted.'
    };
  }

  // ------------------
  // Website builder & templates
  // ------------------

  getWebsiteBuilderIntro() {
    return {
      headline: 'Create Your Website Without Coding',
      description:
        'Use our drag-and-drop builder and professional templates to launch in minutes.',
      supported_site_types: ['portfolio', 'business', 'online_store', 'blog'],
      create_new_site_label: 'Create New Site'
    };
  }

  getActiveWebsiteDrafts() {
    const websites = this._getFromStorage('websites', []);
    const templates = this._getFromStorage('templates', []);

    const drafts = websites
      .filter((w) => w.status === 'draft')
      .map((w) => ({
        ...w,
        template: templates.find((t) => t.id === w.template_id) || null
      }));

    return drafts;
  }

  getTemplateGalleryFilterOptions() {
    const templates = this._getFromStorage('templates', []);
    const featureSet = new Set();

    templates.forEach((t) => {
      if (Array.isArray(t.features)) {
        t.features.forEach((f) => featureSet.add(f));
      }
      if (t.supports_product_filters) {
        featureSet.add('product_filters');
      }
    });

    const categories = [
      { id: 'all_templates', label: 'All Templates' },
      { id: 'portfolio', label: 'Portfolio' },
      { id: 'business', label: 'Business' },
      { id: 'online_store', label: 'Online Store' },
      { id: 'blog', label: 'Blog' },
      { id: 'landing', label: 'Landing' },
      { id: 'other', label: 'Other' }
    ];

    const rating_filters = [
      { value: 'all', label: 'All ratings' },
      { value: 'four_stars_and_up', label: '4 stars & up' },
      { value: 'three_stars_and_up', label: '3 stars & up' }
    ];

    const feature_filters = Array.from(featureSet).map((key) => ({
      key,
      label: this._titleCase(key)
    }));

    return {
      categories,
      rating_filters,
      feature_filters
    };
  }

  getTemplateGalleryState() {
    let state = this._getFromStorage('template_gallery_filters', null);
    if (!state) {
      state = {
        id: 'template_gallery_state',
        category_id: 'all_templates',
        rating_filter: 'all',
        feature_filters: []
      };
      this._saveToStorage('template_gallery_filters', state);
    }
    return state;
  }

  setTemplateGalleryState(state) {
    return this._persistTemplateGalleryState(state || {});
  }

  listTemplates(filters) {
    const templates = this._getFromStorage('templates', []);
    const f = filters || {};

    let list = templates.filter((t) => t.status === 'active');

    if (f.category_id && f.category_id !== 'all_templates') {
      list = list.filter((t) => t.category === f.category_id);
    }

    if (f.rating_filter === 'four_stars_and_up') {
      list = list.filter((t) => (t.rating || 0) >= 4);
    } else if (f.rating_filter === 'three_stars_and_up') {
      list = list.filter((t) => (t.rating || 0) >= 3);
    }

    if (Array.isArray(f.feature_filters) && f.feature_filters.length > 0) {
      list = list.filter((t) => {
        const features = new Set(t.features || []);
        if (t.supports_product_filters) features.add('product_filters');
        return f.feature_filters.every((ff) => features.has(ff));
      });
    }

    const mapped = list.map((t) => ({
      template: t,
      category_label: this._titleCase(t.category),
      rating_display: (t.rating || 0).toFixed(1) + ' / 5',
      review_count_display: (t.review_count || 0) + ' reviews'
    }));

    return { templates: mapped };
  }

  getTemplateDetails(templateId) {
    const templates = this._getFromStorage('templates', []);
    const template = templates.find((t) => t.id === templateId) || null;

    if (!template) {
      return {
        template: null,
        feature_list: [],
        rating_display: '',
        supports_product_filters_label: ''
      };
    }

    const feature_list = Array.isArray(template.features)
      ? template.features.slice()
      : [];
    if (template.supports_product_filters && !feature_list.includes('product_filters')) {
      feature_list.push('product_filters');
    }

    const rating_display = (template.rating || 0).toFixed(1) + ' / 5';
    const supports_product_filters_label = template.supports_product_filters
      ? 'Includes product filters'
      : 'Does not include product filters';

    return {
      template,
      feature_list,
      rating_display,
      supports_product_filters_label
    };
  }

  startWebsiteFromTemplate(templateId, site_name) {
    const templates = this._getFromStorage('templates', []);
    const template = templates.find((t) => t.id === templateId) || null;

    const websites = this._getFromStorage('websites', []);
    const sitePages = this._getFromStorage('site_pages', []);
    const now = this._nowISO();

    const website = {
      id: this._generateId('website'),
      name: site_name,
      site_type: 'website',
      template_id: templateId,
      status: 'draft',
      default_domain: null,
      published_at: null,
      last_edited_at: now
    };

    websites.push(website);
    this._saveToStorage('websites', websites);

    const homePage = {
      id: this._generateId('page'),
      website_id: website.id,
      name: 'Home',
      slug: 'home',
      order: 1,
      is_home: true
    };

    sitePages.push(homePage);
    this._saveToStorage('site_pages', sitePages);

    const websiteWithTemplate = {
      ...website,
      template
    };

    return {
      success: true,
      website: websiteWithTemplate,
      default_pages: [homePage]
    };
  }

  startStoreFromTemplate(templateId, store_name) {
    const templates = this._getFromStorage('templates', []);
    const template = templates.find((t) => t.id === templateId) || null;

    const websites = this._getFromStorage('websites', []);
    const now = this._nowISO();

    const website = {
      id: this._generateId('website'),
      name: store_name,
      site_type: 'store',
      template_id: templateId,
      status: 'draft',
      default_domain: null,
      published_at: null,
      last_edited_at: now
    };

    websites.push(website);
    this._saveToStorage('websites', websites);

    const default_domain_suggestion = this._generateSlugFromPageName(store_name) + '.example.com';

    const websiteWithTemplate = {
      ...website,
      template
    };

    return {
      success: true,
      website: websiteWithTemplate,
      default_domain_suggestion
    };
  }

  getSiteEditorState(websiteId) {
    const websites = this._getFromStorage('websites', []);
    const templates = this._getFromStorage('templates', []);
    const sitePages = this._getFromStorage('site_pages', []);

    const website = websites.find((w) => w.id === websiteId) || null;
    const template = website
      ? templates.find((t) => t.id === website.template_id) || null
      : null;

    const pages = sitePages
      .filter((p) => p.website_id === websiteId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const websiteWithTemplate = website
      ? { ...website, template }
      : null;

    return {
      website: websiteWithTemplate,
      pages
    };
  }

  updateSiteTitle(websiteId, new_title) {
    const websites = this._getFromStorage('websites', []);
    const templates = this._getFromStorage('templates', []);
    const website = websites.find((w) => w.id === websiteId) || null;
    if (!website) {
      return {
        success: false,
        website: null
      };
    }

    website.name = new_title;
    website.last_edited_at = this._nowISO();
    this._saveToStorage('websites', websites);

    const template = templates.find((t) => t.id === website.template_id) || null;
    const websiteWithTemplate = { ...website, template };

    return {
      success: true,
      website: websiteWithTemplate
    };
  }

  addSitePage(websiteId, page_name) {
    const websites = this._getFromStorage('websites', []);
    const website = websites.find((w) => w.id === websiteId) || null;
    if (!website) {
      return {
        success: false,
        page: null,
        pages: []
      };
    }

    const sitePages = this._getFromStorage('site_pages', []);
    const pagesForSite = sitePages.filter((p) => p.website_id === websiteId);
    const maxOrder = pagesForSite.reduce((max, p) => (p.order > max ? p.order : max), 0);

    const page = {
      id: this._generateId('page'),
      website_id: websiteId,
      name: page_name,
      slug: this._generateSlugFromPageName(page_name),
      order: maxOrder + 1,
      is_home: false
    };

    sitePages.push(page);
    this._saveToStorage('site_pages', sitePages);

    const updatedPages = sitePages
      .filter((p) => p.website_id === websiteId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    return {
      success: true,
      page,
      pages: updatedPages
    };
  }

  publishWebsite(websiteId, publish_target, custom_domain) {
    const websites = this._getFromStorage('websites', []);
    const templates = this._getFromStorage('templates', []);
    const website = websites.find((w) => w.id === websiteId) || null;
    if (!website) {
      return {
        success: false,
        website: null,
        message: 'Website not found.'
      };
    }

    if (publish_target === 'custom_domain') {
      if (!custom_domain) {
        return {
          success: false,
          website: null,
          message: 'Custom domain is required.'
        };
      }
      website.default_domain = custom_domain;
    } else {
      if (!website.default_domain) {
        website.default_domain =
          this._generateSlugFromPageName(website.name) + '.example.com';
      }
    }

    website.status = 'published';
    website.published_at = this._nowISO();
    website.last_edited_at = website.published_at;
    this._saveToStorage('websites', websites);

    const template = templates.find((t) => t.id === website.template_id) || null;
    const websiteWithTemplate = { ...website, template };

    return {
      success: true,
      website: websiteWithTemplate,
      message: 'Website published.'
    };
  }

  // ------------------
  // My Domains & DNS
  // ------------------

  getMyDomainsFilterOptions() {
    return {
      status_filters: [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'expired', label: 'Expired' },
        { value: 'expiring_within_60_days', label: 'Expiring within 60 days' }
      ],
      sort_options: [
        { value: 'renewal_price_low_to_high', label: 'Renewal Price: Low to High' },
        { value: 'expiry_date', label: 'Expiry Date' },
        { value: 'name', label: 'Name A-Z' }
      ]
    };
  }

  getOwnedDomains(filters, sort_by) {
    const ownedDomains = this._getFromStorage('owned_domains', []);
    const domainsCatalog = this._getFromStorage('domains', []);

    const f = filters || {};
    let list = ownedDomains.slice();

    if (f.status_filter && f.status_filter !== 'all') {
      if (f.status_filter === 'expiring_soon') {
        list = list.filter((d) => d.status === 'expiring_soon');
      } else if (f.status_filter === 'active' || f.status_filter === 'expired') {
        list = list.filter((d) => d.status === f.status_filter);
      }
    }

    if (typeof f.expiring_within_days === 'number' && f.expiring_within_days > 0) {
      const now = new Date();
      const maxMs = f.expiring_within_days * 24 * 60 * 60 * 1000;
      list = list.filter((d) => {
        const exp = new Date(d.expiry_date);
        const diff = exp.getTime() - now.getTime();
        return diff >= 0 && diff <= maxMs;
      });
    }

    const sortKey = sort_by || 'name';
    if (sortKey === 'renewal_price_low_to_high') {
      list.sort((a, b) => (a.renewal_price_per_year || 0) - (b.renewal_price_per_year || 0));
    } else if (sortKey === 'expiry_date') {
      list.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
    } else if (sortKey === 'name') {
      list.sort((a, b) => (a.domain_name || '').localeCompare(b.domain_name || ''));
    }

    const items = list.map((od) => {
      const domain = od.domain_id
        ? domainsCatalog.find((d) => d.id === od.domain_id) || null
        : null;
      const expiry = new Date(od.expiry_date);
      const expiry_date_display = isNaN(expiry.getTime())
        ? ''
        : expiry.toISOString().split('T')[0];
      const renewal_price_display = this._formatPriceDisplay(
        od.renewal_price_per_year || 0,
        od.currency || 'USD',
        { per: 'year' }
      );
      const status_label = this._titleCase(od.status);
      return {
        owned_domain: od,
        expiry_date_display,
        renewal_price_display,
        status_label,
        domain
      };
    });

    return { domains: items };
  }

  getDomainManagementOverview(ownedDomainId) {
    const ownedDomains = this._getFromStorage('owned_domains', []);
    const domainsCatalog = this._getFromStorage('domains', []);
    const od = ownedDomains.find((d) => d.id === ownedDomainId) || null;
    if (!od) {
      return {
        owned_domain: null,
        status_label: '',
        expiry_date_display: '',
        nameservers: [],
        domain: null
      };
    }

    const domain = od.domain_id
      ? domainsCatalog.find((d) => d.id === od.domain_id) || null
      : null;

    const expiry = new Date(od.expiry_date);
    const expiry_date_display = isNaN(expiry.getTime())
      ? ''
      : expiry.toISOString().split('T')[0];
    const status_label = this._titleCase(od.status);
    const nameservers = [];
    if (od.nameserver1) nameservers.push(od.nameserver1);
    if (od.nameserver2) nameservers.push(od.nameserver2);

    return {
      owned_domain: od,
      status_label,
      expiry_date_display,
      nameservers,
      domain
    };
  }

  getDNSRecords(ownedDomainId) {
    const records = this._getFromStorage('dns_records', []).filter(
      (r) => r.owned_domain_id === ownedDomainId
    );
    const ownedDomains = this._getFromStorage('owned_domains', []);

    const enriched = records.map((r) => ({
      ...r,
      owned_domain: ownedDomains.find((od) => od.id === r.owned_domain_id) || null
    }));

    return {
      records: enriched
    };
  }

  updateDNSRecord(dnsRecordId, value, ttl) {
    const records = this._getFromStorage('dns_records', []);
    const record = records.find((r) => r.id === dnsRecordId) || null;
    if (!record) {
      return {
        success: false,
        record: null,
        message: 'DNS record not found.'
      };
    }

    record.value = value;
    record.ttl = ttl;
    this._saveToStorage('dns_records', records);

    return {
      success: true,
      record,
      message: 'DNS record updated.'
    };
  }

  addDNSRecord(ownedDomainId, record_type, host, value, ttl, priority) {
    const ownedDomains = this._getFromStorage('owned_domains', []);
    const od = ownedDomains.find((d) => d.id === ownedDomainId) || null;
    if (!od) {
      return {
        success: false,
        record: null,
        message: 'Owned domain not found.'
      };
    }

    const records = this._getFromStorage('dns_records', []);
    const record = {
      id: this._generateId('dns'),
      owned_domain_id: ownedDomainId,
      record_type,
      host,
      value,
      ttl,
      priority: typeof priority === 'number' ? priority : null
    };

    records.push(record);
    this._saveToStorage('dns_records', records);

    return {
      success: true,
      record,
      message: 'DNS record added.'
    };
  }

  addDomainRenewalToCart(ownedDomainId, registration_period_years) {
    const ownedDomains = this._getFromStorage('owned_domains', []);
    const od = ownedDomains.find((d) => d.id === ownedDomainId);
    if (!od) {
      return {
        success: false,
        cart_item: null,
        cart_total_items: 0,
        cart_total_price: 0,
        currency: 'USD',
        message: 'Owned domain not found.'
      };
    }

    const cart = this._getOrCreateActiveCart();
    const now = this._nowISO();
    const cartItems = this._getFromStorage('cart_items', []);
    const years = registration_period_years || 1;

    let item = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.item_type === 'domain_renewal' &&
        ci.owned_domain_id === ownedDomainId
    );

    const basePrice = od.renewal_price_per_year || 0;
    const subtotal = basePrice * years;

    if (item) {
      item.registration_period_years = years;
      item.unit_price = basePrice;
      item.subtotal_price = subtotal;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'domain_renewal',
        domain_id: null,
        hosting_plan_id: null,
        owned_domain_id: ownedDomainId,
        web_package_id: null,
        description:
          od.domain_name + ' - Renewal for ' + years + ' year' + (years > 1 ? 's' : ''),
        quantity: 1,
        unit_price: basePrice,
        registration_period_years: years,
        term_months: null,
        with_privacy: null,
        privacy_price_total: null,
        subtotal_price: subtotal,
        created_at: now
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      cart_item: item,
      cart_total_items: totals.totalItems,
      cart_total_price: totals.totalPrice,
      currency: totals.currency,
      message: 'Domain renewal added to cart.'
    };
  }

  // ------------------
  // About page
  // ------------------

  getAboutPageContent() {
    return {
      headline: 'About Our Platform',
      intro:
        'We help entrepreneurs and businesses get online with domains, hosting, and professional web development services.',
      sections: [
        {
          title: 'All-in-one platform',
          body:
            'Search domains, compare hosting, request custom web development, and launch your site using our builder.'
        },
        {
          title: 'Focus on your business',
          body:
            'Our tools and services are designed so you can spend less time on setup and more time growing your brand.'
        },
        {
          title: 'Expert support',
          body:
            'From DNS configuration to store templates, our documentation and support team are here to help.'
        }
      ],
      support_contact_label: 'Contact Support'
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
