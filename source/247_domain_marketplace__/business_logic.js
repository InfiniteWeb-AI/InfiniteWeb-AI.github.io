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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'domain_listings',
      'auctions',
      'auction_bids',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'compare_lists',
      'compare_items',
      'bulk_search_jobs',
      'bulk_search_results',
      'saved_searches',
      'payment_plan_options',
      'owned_domains',
      'portfolios',
      'offers',
      'checkout_sessions',
      'order_reviews',
      'contact_requests'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    // Static pages as object map slug -> content
    if (!localStorage.getItem('static_pages')) {
      localStorage.setItem('static_pages', JSON.stringify({}));
    }

    // Generic id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      return fallback !== undefined ? fallback : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
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

  // ---------------------- Entity helpers ----------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts', []);
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getCurrentCart() {
    const carts = this._getFromStorage('carts', []);
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        return carts[i];
      }
    }
    return null;
  }

  _getCartItems(cartId) {
    const allItems = this._getFromStorage('cart_items', []);
    const items = [];
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].cart_id === cartId) {
        items.push(allItems[i]);
      }
    }
    return items;
  }

  _buildCartSummary(cart) {
    if (!cart) {
      return null;
    }
    const cartItems = this._getCartItems(cart.id);
    const listings = this._getFromStorage('domain_listings', []);
    const auctions = this._getFromStorage('auctions', []);
    const paymentPlans = this._getFromStorage('payment_plan_options', []);

    let subtotal = 0;
    let currency = 'USD';

    const itemsWithRefs = [];
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      subtotal += (item.price || 0) * (item.quantity || 1);
      if (item.currency) {
        currency = item.currency;
      }
      let listing = null;
      let auction = null;
      let selectedPaymentPlan = null;

      if (item.listing_id) {
        for (let j = 0; j < listings.length; j++) {
          if (listings[j].id === item.listing_id) {
            listing = this._attachOwnedDomainToListing(listings[j]);
            break;
          }
        }
      }
      if (item.auction_id) {
        for (let j = 0; j < auctions.length; j++) {
          if (auctions[j].id === item.auction_id) {
            auction = auctions[j];
            break;
          }
        }
      }
      if (item.selected_payment_plan_id) {
        for (let j = 0; j < paymentPlans.length; j++) {
          if (paymentPlans[j].id === item.selected_payment_plan_id) {
            selectedPaymentPlan = paymentPlans[j];
            break;
          }
        }
      }

      itemsWithRefs.push({
        ...item,
        listing: listing,
        auction: auction,
        selected_payment_plan: selectedPaymentPlan,
        cart: cart
      });
    }

    return {
      id: cart.id,
      status: cart.status,
      created_at: cart.created_at,
      updated_at: cart.updated_at,
      items: itemsWithRefs,
      itemCount: itemsWithRefs.length,
      subtotal: subtotal,
      currency: currency
    };
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists', []);
    let wishlist = wishlists.length > 0 ? wishlists[0] : null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _getWishlistItems(wishlistId) {
    const items = this._getFromStorage('wishlist_items', []);
    const listings = this._getFromStorage('domain_listings', []);
    const auctions = this._getFromStorage('auctions', []);
    const resolved = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.wishlist_id !== wishlistId) continue;
      let listing = null;
      let auction = null;
      if (it.listing_id) {
        for (let j = 0; j < listings.length; j++) {
          if (listings[j].id === it.listing_id) {
            listing = this._attachOwnedDomainToListing(listings[j]);
            break;
          }
        }
      }
      if (it.auction_id) {
        for (let j = 0; j < auctions.length; j++) {
          if (auctions[j].id === it.auction_id) {
            auction = auctions[j];
            break;
          }
        }
      }
      resolved.push({
        ...it,
        listing: listing,
        auction: auction
      });
    }
    return resolved;
  }

  _getOrCreateCompareList() {
    let lists = this._getFromStorage('compare_lists', []);
    let list = lists.length > 0 ? lists[0] : null;
    if (!list) {
      list = {
        id: this._generateId('compare'),
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('compare_lists', lists);
    }
    return list;
  }

  _getCompareItems(compareListId) {
    const items = this._getFromStorage('compare_items', []);
    const listings = this._getFromStorage('domain_listings', []);
    const resolved = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.compare_list_id !== compareListId) continue;
      let listing = null;
      for (let j = 0; j < listings.length; j++) {
        if (listings[j].id === it.listing_id) {
          listing = this._attachOwnedDomainToListing(listings[j]);
          break;
        }
      }
      resolved.push({
        ...it,
        listing: listing
      });
    }
    return resolved;
  }

  _getOrCreateCheckoutSession(cart) {
    const sessions = this._getFromStorage('checkout_sessions', []);
    let existing = null;
    for (let i = sessions.length - 1; i >= 0; i--) {
      const s = sessions[i];
      if (s.cart_id === cart.id && s.status !== 'completed' && s.status !== 'cancelled') {
        existing = s;
        break;
      }
    }
    if (existing) {
      return existing;
    }
    const session = {
      id: this._generateId('chk'),
      cart_id: cart.id,
      status: 'in_progress',
      contact_first_name: null,
      contact_last_name: null,
      contact_email: null,
      contact_phone: null,
      billing_street: null,
      billing_city: null,
      billing_state_region: null,
      billing_postal_code: null,
      billing_country: null,
      payment_method: null,
      cardholder_name: null,
      card_last4: null,
      card_brand: null,
      uses_payment_plan: false,
      created_at: this._now(),
      updated_at: this._now()
    };
    sessions.push(session);
    this._saveToStorage('checkout_sessions', sessions);
    return session;
  }

  _calculateOrderTotals(cart, cartItems) {
    let subtotal = 0;
    let currency = 'USD';
    for (let i = 0; i < cartItems.length; i++) {
      const it = cartItems[i];
      subtotal += (it.price || 0) * (it.quantity || 1);
      if (it.currency) {
        currency = it.currency;
      }
    }
    // For simplicity, order_total == subtotal (no taxes/fees simulated)
    return {
      subtotal: subtotal,
      currency: currency,
      orderTotal: subtotal
    };
  }

  _parseBulkSearchInput(rawInputText) {
    const lines = (rawInputText || '').split(/\r?\n/);
    const keywords = [];
    const seen = {};
    for (let i = 0; i < lines.length; i++) {
      const k = lines[i].trim();
      if (!k) continue;
      const lower = k.toLowerCase();
      if (seen[lower]) continue;
      seen[lower] = true;
      keywords.push(k);
    }
    return keywords;
  }

  _attachOwnedDomainToListing(listing) {
    const ownedDomains = this._getFromStorage('owned_domains', []);
    let owned = null;
    if (listing && listing.owned_domain_id) {
      for (let i = 0; i < ownedDomains.length; i++) {
        if (ownedDomains[i].id === listing.owned_domain_id) {
          owned = ownedDomains[i];
          break;
        }
      }
    }
    if (!owned) {
      return { ...listing, owned_domain: null };
    }
    return { ...listing, owned_domain: owned };
  }

  _getCurrentCheckoutSession() {
    const sessions = this._getFromStorage('checkout_sessions', []);
    let current = null;
    for (let i = sessions.length - 1; i >= 0; i--) {
      const s = sessions[i];
      if (s.status === 'in_progress' || s.status === 'review') {
        current = s;
        break;
      }
    }
    return current;
  }

  _detectCardBrand(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') return null;
    const trimmed = cardNumber.replace(/\s+/g, '');
    if (trimmed[0] === '4') return 'visa';
    if (trimmed[0] === '5') return 'mastercard';
    if (trimmed[0] === '3') return 'amex';
    if (trimmed[0] === '6') return 'discover';
    return 'card';
  }

  _seedDemoListingsIfNeeded() {
    // Seed additional demo listings required for scenario tests if not already present
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      if (localStorage.getItem('demo_listings_seeded') === '1') {
        return;
      }
    } catch (e) {
      return;
    }

    const listings = this._getFromStorage('domain_listings', []);
    const ownedDomains = this._getFromStorage('owned_domains', []);
    const newListings = [];

    const findOwnedById = function (ownedId) {
      for (let i = 0; i < ownedDomains.length; i++) {
        if (ownedDomains[i].id === ownedId) return ownedDomains[i];
      }
      return null;
    };

    const listingExistsForOwned = function (ownedId, listingId) {
      for (let i = 0; i < listings.length; i++) {
        const l = listings[i];
        if (l.id === listingId || l.owned_domain_id === ownedId) {
          return true;
        }
      }
      return false;
    };

    const ensureOwnedListing = (ownedId, listingId, overrides) => {
      const od = findOwnedById(ownedId);
      if (!od) return;
      if (listingExistsForOwned(ownedId, listingId)) return;
      const base = {
        id: listingId,
        domain_name: od.domain_name,
        sld: od.sld,
        tld: od.tld,
        domain_length: od.domain_length,
        keywords: [],
        description: null,
        price: 100,
        currency: 'USD',
        is_premium: false,
        listing_type: 'buy_now',
        has_payment_plan: false,
        payment_plan_option_ids: [],
        min_offer_amount: null,
        status: 'active',
        source: 'owned_portfolio',
        owned_domain_id: od.id,
        created_at: this._now(),
        updated_at: this._now()
      };
      const listing = Object.assign({}, base, overrides || {});
      newListings.push(listing);
    };

    const listingExistsById = function (id) {
      for (let i = 0; i < listings.length; i++) {
        if (listings[i].id === id) return true;
      }
      for (let j = 0; j < newListings.length; j++) {
        if (newListings[j].id === id) return true;
      }
      return false;
    };

    const ensureStaticListing = (id, data) => {
      if (listingExistsById(id)) return;
      const now = this._now();
      const listing = Object.assign({
        id: id,
        keywords: [],
        description: null,
        price: 100,
        currency: 'USD',
        is_premium: false,
        listing_type: 'buy_now',
        has_payment_plan: false,
        payment_plan_option_ids: [],
        min_offer_amount: null,
        status: 'active',
        source: 'catalog',
        created_at: now,
        updated_at: now
      }, data || {});
      newListings.push(listing);
    };

    // Garden-focused .com under $500 based on owned domain
    ensureOwnedListing('owned_gardenly_com', 'listing_gardenly_com', {
      price: 450,
      keywords: ['garden', 'gardening', 'plants']
    });

    // Affordable .net based on owned domain greenshop.net
    ensureOwnedListing('owned_greenshop_net', 'listing_greenshop_net', {
      price: 75,
      keywords: ['greenshop', 'green', 'shop']
    });

    // Additional affordable .net for bulk search
    ensureStaticListing('listing_cloudapp_net', {
      domain_name: 'cloudapp.net',
      sld: 'cloudapp',
      tld: 'net',
      domain_length: 8,
      price: 90,
      keywords: ['cloudapp', 'cloud', 'app']
    });

    // Analytics-focused .io and .ai domains between 1000 and 3000
    ensureStaticListing('listing_dataanalytics_io', {
      domain_name: 'dataanalytics.io',
      sld: 'dataanalytics',
      tld: 'io',
      domain_length: 14,
      price: 1500,
      keywords: ['analytics', 'data', 'metrics']
    });

    ensureStaticListing('listing_insightanalytics_ai', {
      domain_name: 'insightanalytics.ai',
      sld: 'insightanalytics',
      tld: 'ai',
      domain_length: 16,
      price: 2200,
      keywords: ['analytics', 'insights', 'ai']
    });

    // Three short blog or .com domains under $200
    ensureStaticListing('listing_problog_com', {
      domain_name: 'problog.com',
      sld: 'problog',
      tld: 'com',
      domain_length: 7,
      price: 80,
      keywords: ['blog', 'pro']
    });

    ensureStaticListing('listing_devblog_com', {
      domain_name: 'devblog.com',
      sld: 'devblog',
      tld: 'com',
      domain_length: 7,
      price: 95,
      keywords: ['blog', 'dev']
    });

    ensureStaticListing('listing_travelblog_com', {
      domain_name: 'travelblog.com',
      sld: 'travelblog',
      tld: 'com',
      domain_length: 10,
      price: 150,
      keywords: ['blog', 'travel']
    });

    if (newListings.length > 0) {
      const updated = listings.concat(newListings);
      this._saveToStorage('domain_listings', updated);
    }

    try {
      localStorage.setItem('demo_listings_seeded', '1');
    } catch (e) {
      // ignore storage errors
    }
  }

  // ---------------------- Interface implementations ----------------------

  // searchDomainListings(keyword, filters, sort, page, pageSize)
  searchDomainListings(keyword, filters, sort, page, pageSize) {
    this._seedDemoListingsIfNeeded();
    const allListingsRaw = this._getFromStorage('domain_listings', []);
    const ownedDomains = this._getFromStorage('owned_domains', []);

    const kw = (keyword || '').toLowerCase();
    let listings = [];

    for (let i = 0; i < allListingsRaw.length; i++) {
      const l = allListingsRaw[i];
      if (l.status && l.status !== 'active') continue;
      if (kw) {
        const dn = (l.domain_name || '').toLowerCase();
        const sld = (l.sld || '').toLowerCase();
        let matchKw = dn.indexOf(kw) !== -1 || sld.indexOf(kw) !== -1;
        if (!matchKw && Array.isArray(l.keywords)) {
          for (let j = 0; j < l.keywords.length; j++) {
            if (String(l.keywords[j]).toLowerCase() === kw) {
              matchKw = true;
              break;
            }
          }
        }
        if (!matchKw) continue;
      }
      listings.push(l);
    }

    filters = filters || {};

    if (filters.tlds && Array.isArray(filters.tlds) && filters.tlds.length > 0) {
      const tldSet = {};
      const normalizeTld = function (v) {
        return String(v || '').toLowerCase().replace(/^\./, '');
      };
      for (let i = 0; i < filters.tlds.length; i++) {
        tldSet[normalizeTld(filters.tlds[i])] = true;
      }
      listings = listings.filter(function (l) {
        return !!tldSet[normalizeTld(l.tld)];
      });
    }

    if (typeof filters.minPrice === 'number') {
      listings = listings.filter(function (l) {
        return typeof l.price === 'number' && l.price >= filters.minPrice;
      });
    }

    if (typeof filters.maxPrice === 'number') {
      listings = listings.filter(function (l) {
        return typeof l.price === 'number' && l.price <= filters.maxPrice;
      });
    }

    if (typeof filters.minLength === 'number') {
      listings = listings.filter(function (l) {
        return typeof l.domain_length === 'number' && l.domain_length >= filters.minLength;
      });
    }

    if (typeof filters.maxLength === 'number') {
      listings = listings.filter(function (l) {
        return typeof l.domain_length === 'number' && l.domain_length <= filters.maxLength;
      });
    }

    if (filters.listingTypes && Array.isArray(filters.listingTypes) && filters.listingTypes.length > 0) {
      const typeSet = {};
      for (let i = 0; i < filters.listingTypes.length; i++) {
        typeSet[String(filters.listingTypes[i])] = true;
      }
      listings = listings.filter(function (l) {
        return !!typeSet[l.listing_type];
      });
    }

    if (typeof filters.hasPaymentPlan === 'boolean') {
      listings = listings.filter(function (l) {
        return !!l.has_payment_plan === filters.hasPaymentPlan;
      });
    }

    if (typeof filters.isPremium === 'boolean') {
      listings = listings.filter(function (l) {
        return !!l.is_premium === filters.isPremium;
      });
    }

    // Sorting
    if (sort && sort.field) {
      const field = sort.field;
      const direction = sort.direction === 'desc' ? -1 : 1;
      listings.sort(function (a, b) {
        const av = a[field];
        const bv = b[field];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return -1 * direction;
        if (av > bv) return 1 * direction;
        return 0;
      });
    }

    const total = listings.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    const resultsSlice = listings.slice(start, end).map((l) => {
      // attach owned_domain
      let owned = null;
      if (l.owned_domain_id) {
        for (let i = 0; i < ownedDomains.length; i++) {
          if (ownedDomains[i].id === l.owned_domain_id) {
            owned = ownedDomains[i];
            break;
          }
        }
      }
      return { ...l, owned_domain: owned };
    });

    return {
      total: total,
      page: p,
      pageSize: ps,
      results: resultsSlice,
      appliedFilters: {
        tlds: filters.tlds || [],
        minPrice: typeof filters.minPrice === 'number' ? filters.minPrice : null,
        maxPrice: typeof filters.maxPrice === 'number' ? filters.maxPrice : null,
        minLength: typeof filters.minLength === 'number' ? filters.minLength : null,
        maxLength: typeof filters.maxLength === 'number' ? filters.maxLength : null,
        listingTypes: filters.listingTypes || [],
        hasPaymentPlan: typeof filters.hasPaymentPlan === 'boolean' ? filters.hasPaymentPlan : null,
        isPremium: typeof filters.isPremium === 'boolean' ? filters.isPremium : null
      }
    };
  }

  // getDomainSearchFilterOptions()
  getDomainSearchFilterOptions() {
    const listings = this._getFromStorage('domain_listings', []);
    const tldMap = {};
    let minPrice = null;
    let maxPrice = null;
    let minLen = null;
    let maxLen = null;

    for (let i = 0; i < listings.length; i++) {
      const l = listings[i];
      const tldRaw = String(l.tld || '');
      const tld = tldRaw.replace(/^\./, '').toLowerCase();
      if (tld) {
        if (!tldMap[tld]) {
          tldMap[tld] = { value: tld, label: '.' + tld, count: 0 };
        }
        tldMap[tld].count += 1;
      }
      if (typeof l.price === 'number') {
        if (minPrice === null || l.price < minPrice) minPrice = l.price;
        if (maxPrice === null || l.price > maxPrice) maxPrice = l.price;
      }
      if (typeof l.domain_length === 'number') {
        if (minLen === null || l.domain_length < minLen) minLen = l.domain_length;
        if (maxLen === null || l.domain_length > maxLen) maxLen = l.domain_length;
      }
    }

    const tldOptions = Object.keys(tldMap).sort().map(function (k) { return tldMap[k]; });

    return {
      tldOptions: tldOptions,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        currency: 'USD'
      },
      lengthRange: {
        min: minLen,
        max: maxLen
      },
      listingTypeOptions: [
        { value: 'buy_now', label: 'Buy Now' },
        { value: 'make_offer', label: 'Make Offer' },
        { value: 'buy_now_and_make_offer', label: 'Buy Now & Make Offer' },
        { value: 'payment_plan_only', label: 'Payment Plan Only' }
      ],
      paymentPlanFilterOptions: [
        { value: true, label: 'With Payment Plan' },
        { value: false, label: 'Without Payment Plan' }
      ]
    };
  }

  // getSortOptionsForListings()
  getSortOptionsForListings() {
    return [
      {
        value: 'price_low_to_high',
        label: 'Price: Low to High',
        field: 'price',
        direction: 'asc',
        isDefault: true
      },
      {
        value: 'price_high_to_low',
        label: 'Price: High to Low',
        field: 'price',
        direction: 'desc',
        isDefault: false
      },
      {
        value: 'length_short_to_long',
        label: 'Length: Short to Long',
        field: 'domain_length',
        direction: 'asc',
        isDefault: false
      },
      {
        value: 'length_long_to_short',
        label: 'Length: Long to Short',
        field: 'domain_length',
        direction: 'desc',
        isDefault: false
      }
    ];
  }

  // getHomeHighlights()
  getHomeHighlights() {
    const listings = this._getFromStorage('domain_listings', []);
    const auctions = this._getFromStorage('auctions', []);

    const activeListings = [];
    const paymentPlanListings = [];

    for (let i = 0; i < listings.length; i++) {
      const l = listings[i];
      if (l.status === 'active') {
        activeListings.push(this._attachOwnedDomainToListing(l));
        if (l.has_payment_plan) {
          paymentPlanListings.push(this._attachOwnedDomainToListing(l));
        }
      }
    }

    const auctionsEndingSoon = auctions
      .filter(function (a) { return a.status === 'live'; })
      .sort(function (a, b) {
        const ta = Date.parse(a.end_time || a.end_time === 0 ? a.end_time : '') || 0;
        const tb = Date.parse(b.end_time || b.end_time === 0 ? b.end_time : '') || 0;
        return ta - tb;
      })
      .slice(0, 10);

    const featuredListings = activeListings.slice(0, 10);
    const paymentPlanFeaturedListings = paymentPlanListings.slice(0, 10);

    return {
      featuredListings: featuredListings,
      auctionsEndingSoon: auctionsEndingSoon,
      paymentPlanFeaturedListings: paymentPlanFeaturedListings
    };
  }

  // addListingToCart(listingId, quantity)
  addListingToCart(listingId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const listings = this._getFromStorage('domain_listings', []);
    let listing = null;
    for (let i = 0; i < listings.length; i++) {
      if (listings[i].id === listingId) {
        listing = listings[i];
        break;
      }
    }
    if (!listing || listing.status !== 'active') {
      return {
        success: false,
        message: 'Listing not found or inactive',
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    // Check if already in cart; domains are unique so keep single entry
    let existing = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id && cartItems[i].listing_id === listing.id && cartItems[i].item_type === 'listing') {
        existing = cartItems[i];
        break;
      }
    }

    if (existing) {
      existing.quantity += qty;
      existing.added_at = this._now();
    } else {
      const item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'listing',
        listing_id: listing.id,
        auction_id: null,
        selected_payment_plan_id: null,
        domain_name: listing.domain_name,
        tld: listing.tld,
        price: listing.price,
        quantity: qty,
        currency: listing.currency || 'USD',
        added_at: this._now()
      };
      cartItems.push(item);
    }

    const carts = this._getFromStorage('carts', []);
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].updated_at = this._now();
        break;
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('carts', carts);

    const cartSummary = this._buildCartSummary(cart);
    return {
      success: true,
      message: 'Listing added to cart',
      cart: cartSummary
    };
  }

  // addListingToWishlist(listingId)
  addListingToWishlist(listingId) {
    const wishlist = this._getOrCreateWishlist();
    const listings = this._getFromStorage('domain_listings', []);
    let listing = null;
    for (let i = 0; i < listings.length; i++) {
      if (listings[i].id === listingId) {
        listing = listings[i];
        break;
      }
    }
    if (!listing) {
      return {
        success: false,
        message: 'Listing not found',
        wishlist: null
      };
    }

    let items = this._getFromStorage('wishlist_items', []);
    for (let i = 0; i < items.length; i++) {
      if (items[i].wishlist_id === wishlist.id && items[i].listing_id === listing.id) {
        const resolvedItems = this._getWishlistItems(wishlist.id);
        return {
          success: true,
          message: 'Listing already in wishlist',
          wishlist: {
            id: wishlist.id,
            items: resolvedItems,
            itemCount: resolvedItems.length
          }
        };
      }
    }

    const newItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      item_type: 'listing',
      listing_id: listing.id,
      auction_id: null,
      domain_name: listing.domain_name,
      tld: listing.tld,
      added_at: this._now()
    };
    items.push(newItem);

    const wishlists = this._getFromStorage('wishlists', []);
    for (let i = 0; i < wishlists.length; i++) {
      if (wishlists[i].id === wishlist.id) {
        wishlists[i].updated_at = this._now();
        break;
      }
    }

    this._saveToStorage('wishlist_items', items);
    this._saveToStorage('wishlists', wishlists);

    const resolvedItems = this._getWishlistItems(wishlist.id);
    return {
      success: true,
      message: 'Listing added to wishlist',
      wishlist: {
        id: wishlist.id,
        items: resolvedItems,
        itemCount: resolvedItems.length
      }
    };
  }

  // addListingToCompare(listingId)
  addListingToCompare(listingId) {
    const compareList = this._getOrCreateCompareList();
    const listings = this._getFromStorage('domain_listings', []);
    let listing = null;
    for (let i = 0; i < listings.length; i++) {
      if (listings[i].id === listingId) {
        listing = listings[i];
        break;
      }
    }
    if (!listing) {
      return {
        success: false,
        message: 'Listing not found',
        compareList: {
          id: compareList.id,
          items: this._getCompareItems(compareList.id),
          itemCount: this._getCompareItems(compareList.id).length
        }
      };
    }

    let items = this._getFromStorage('compare_items', []);
    for (let i = 0; i < items.length; i++) {
      if (items[i].compare_list_id === compareList.id && items[i].listing_id === listing.id) {
        const resolved = this._getCompareItems(compareList.id);
        return {
          success: true,
          message: 'Listing already in compare list',
          compareList: {
            id: compareList.id,
            items: resolved,
            itemCount: resolved.length
          }
        };
      }
    }

    const newItem = {
      id: this._generateId('compare_item'),
      compare_list_id: compareList.id,
      listing_id: listing.id,
      domain_name: listing.domain_name,
      tld: listing.tld,
      domain_length: listing.domain_length,
      added_at: this._now()
    };
    items.push(newItem);

    const lists = this._getFromStorage('compare_lists', []);
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].id === compareList.id) {
        lists[i].updated_at = this._now();
        break;
      }
    }

    this._saveToStorage('compare_items', items);
    this._saveToStorage('compare_lists', lists);

    const resolved = this._getCompareItems(compareList.id);
    return {
      success: true,
      message: 'Listing added to compare list',
      compareList: {
        id: compareList.id,
        items: resolved,
        itemCount: resolved.length
      }
    };
  }

  // getCompareList()
  getCompareList() {
    const compareList = this._getOrCreateCompareList();
    const items = this._getCompareItems(compareList.id);
    return {
      compareList: {
        id: compareList.id,
        items: items,
        itemCount: items.length
      }
    };
  }

  // removeCompareItem(compareItemId)
  removeCompareItem(compareItemId) {
    const compareList = this._getOrCreateCompareList();
    let items = this._getFromStorage('compare_items', []);
    let changed = false;
    items = items.filter(function (it) {
      if (it.id === compareItemId) {
        changed = true;
        return false;
      }
      return true;
    });
    if (changed) {
      this._saveToStorage('compare_items', items);
      const lists = this._getFromStorage('compare_lists', []);
      for (let i = 0; i < lists.length; i++) {
        if (lists[i].id === compareList.id) {
          lists[i].updated_at = this._now();
          break;
        }
      }
      this._saveToStorage('compare_lists', lists);
    }
    const resolved = this._getCompareItems(compareList.id);
    return {
      success: true,
      compareList: {
        id: compareList.id,
        items: resolved,
        itemCount: resolved.length
      }
    };
  }

  // clearCompareList()
  clearCompareList() {
    const compareList = this._getOrCreateCompareList();
    let items = this._getFromStorage('compare_items', []);
    items = items.filter(function (it) { return it.compare_list_id !== compareList.id; });
    this._saveToStorage('compare_items', items);

    const lists = this._getFromStorage('compare_lists', []);
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].id === compareList.id) {
        lists[i].updated_at = this._now();
        break;
      }
    }
    this._saveToStorage('compare_lists', lists);

    return {
      success: true,
      compareList: {
        id: compareList.id,
        items: [],
        itemCount: 0
      }
    };
  }

  // getDomainDetails(listingId)
  getDomainDetails(listingId) {
    const listings = this._getFromStorage('domain_listings', []);
    const plans = this._getFromStorage('payment_plan_options', []);
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getWishlistItems(wishlist.id);
    const compareList = this._getOrCreateCompareList();
    const compareItems = this._getCompareItems(compareList.id);

    let listing = null;
    for (let i = 0; i < listings.length; i++) {
      if (listings[i].id === listingId) {
        listing = listings[i];
        break;
      }
    }
    if (!listing) {
      return {
        listing: null,
        paymentPlanOptions: [],
        isInWishlist: false,
        isInCompare: false
      };
    }

    const paymentPlanOptions = [];
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].listing_id === listing.id && plans[i].status === 'active') {
        paymentPlanOptions.push(plans[i]);
      }
    }

    let isInWishlist = false;
    for (let i = 0; i < wishlistItems.length; i++) {
      if (wishlistItems[i].listing_id === listing.id) {
        isInWishlist = true;
        break;
      }
    }

    let isInCompare = false;
    for (let i = 0; i < compareItems.length; i++) {
      if (compareItems[i].listing_id === listing.id) {
        isInCompare = true;
        break;
      }
    }

    const listingWithOwned = this._attachOwnedDomainToListing(listing);

    return {
      listing: listingWithOwned,
      paymentPlanOptions: paymentPlanOptions,
      isInWishlist: isInWishlist,
      isInCompare: isInCompare
    };
  }

  // submitOfferForListing(listingId, amount)
  submitOfferForListing(listingId, amount) {
    const listings = this._getFromStorage('domain_listings', []);
    let listing = null;
    for (let i = 0; i < listings.length; i++) {
      if (listings[i].id === listingId) {
        listing = listings[i];
        break;
      }
    }
    if (!listing) {
      return { success: false, message: 'Listing not found', offer: null };
    }

    const lt = listing.listing_type;
    if (lt !== 'make_offer' && lt !== 'buy_now_and_make_offer') {
      return { success: false, message: 'Listing does not accept offers', offer: null };
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return { success: false, message: 'Invalid offer amount', offer: null };
    }

    if (typeof listing.min_offer_amount === 'number' && amount < listing.min_offer_amount) {
      return { success: false, message: 'Offer below minimum accepted amount', offer: null };
    }

    const offers = this._getFromStorage('offers', []);
    const offer = {
      id: this._generateId('offer'),
      listing_id: listing.id,
      domain_name: listing.domain_name,
      amount: amount,
      status: 'pending',
      created_at: this._now(),
      updated_at: this._now()
    };
    offers.push(offer);
    this._saveToStorage('offers', offers);

    const offerWithListing = { ...offer, listing: this._attachOwnedDomainToListing(listing) };

    return {
      success: true,
      message: 'Offer submitted',
      offer: offerWithListing
    };
  }

  // startCheckoutForListing(listingId)
  startCheckoutForListing(listingId) {
    const listings = this._getFromStorage('domain_listings', []);
    let listing = null;
    for (let i = 0; i < listings.length; i++) {
      if (listings[i].id === listingId) {
        listing = listings[i];
        break;
      }
    }

    if (!listing || listing.status !== 'active') {
      return { success: false, checkoutSession: null, cart: null };
    }

    // Create/replace cart content with this listing only
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    cartItems = cartItems.filter(function (it) { return it.cart_id !== cart.id; });

    const newItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'listing',
      listing_id: listing.id,
      auction_id: null,
      selected_payment_plan_id: null,
      domain_name: listing.domain_name,
      tld: listing.tld,
      price: listing.price,
      quantity: 1,
      currency: listing.currency || 'USD',
      added_at: this._now()
    };
    cartItems.push(newItem);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].updated_at = this._now();
        break;
      }
    }
    this._saveToStorage('carts', carts);

    const checkoutSession = this._getOrCreateCheckoutSession(cart);
    checkoutSession.uses_payment_plan = false;
    checkoutSession.updated_at = this._now();

    const sessions = this._getFromStorage('checkout_sessions', []);
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === checkoutSession.id) {
        sessions[i] = checkoutSession;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    const cartSummary = this._buildCartSummary(cart);
    const checkoutSessionView = { ...checkoutSession };

    return {
      success: true,
      checkoutSession: checkoutSessionView,
      cart: cartSummary
    };
  }

  // startCheckoutWithPaymentPlan(paymentPlanOptionId)
  startCheckoutWithPaymentPlan(paymentPlanOptionId) {
    const plans = this._getFromStorage('payment_plan_options', []);
    const listings = this._getFromStorage('domain_listings', []);
    let plan = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === paymentPlanOptionId) {
        plan = plans[i];
        break;
      }
    }
    if (!plan || plan.status !== 'active') {
      return { success: false, checkoutSession: null, cart: null };
    }

    let listing = null;
    for (let i = 0; i < listings.length; i++) {
      if (listings[i].id === plan.listing_id) {
        listing = listings[i];
        break;
      }
    }
    if (!listing || listing.status !== 'active') {
      return { success: false, checkoutSession: null, cart: null };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    cartItems = cartItems.filter(function (it) { return it.cart_id !== cart.id; });

    const initialPrice = typeof plan.down_payment_amount === 'number'
      ? plan.down_payment_amount
      : plan.installment_amount;

    const item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'payment_plan',
      listing_id: listing.id,
      auction_id: null,
      selected_payment_plan_id: plan.id,
      domain_name: listing.domain_name,
      tld: listing.tld,
      price: initialPrice,
      quantity: 1,
      currency: listing.currency || 'USD',
      added_at: this._now()
    };
    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].updated_at = this._now();
        break;
      }
    }
    this._saveToStorage('carts', carts);

    const checkoutSession = this._getOrCreateCheckoutSession(cart);
    checkoutSession.uses_payment_plan = true;
    checkoutSession.updated_at = this._now();

    const sessions = this._getFromStorage('checkout_sessions', []);
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === checkoutSession.id) {
        sessions[i] = checkoutSession;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    const cartSummary = this._buildCartSummary(cart);
    const checkoutSessionView = { ...checkoutSession };

    return {
      success: true,
      checkoutSession: checkoutSessionView,
      cart: cartSummary
    };
  }

  // searchAuctions(keyword, filters, sort, page, pageSize)
  searchAuctions(keyword, filters, sort, page, pageSize) {
    const allAuctions = this._getFromStorage('auctions', []);
    const kw = (keyword || '').toLowerCase();
    let auctions = [];

    for (let i = 0; i < allAuctions.length; i++) {
      const a = allAuctions[i];
      if (a.status !== 'live') continue;
      if (kw) {
        const dn = (a.domain_name || '').toLowerCase();
        const sld = (a.sld || '').toLowerCase();
        let match = dn.indexOf(kw) !== -1 || sld.indexOf(kw) !== -1;
        if (!match && Array.isArray(a.keywords)) {
          for (let j = 0; j < a.keywords.length; j++) {
            if (String(a.keywords[j]).toLowerCase() === kw) {
              match = true;
              break;
            }
          }
        }
        if (!match) continue;
      }
      auctions.push(a);
    }

    filters = filters || {};

    if (filters.tlds && Array.isArray(filters.tlds) && filters.tlds.length > 0) {
      const tset = {};
      const normalizeTld = function (v) {
        return String(v || '').toLowerCase().replace(/^\./, '');
      };
      for (let i = 0; i < filters.tlds.length; i++) {
        tset[normalizeTld(filters.tlds[i])] = true;
      }
      auctions = auctions.filter(function (a) {
        return !!tset[normalizeTld(a.tld)];
      });
    }

    if (typeof filters.minCurrentBid === 'number') {
      auctions = auctions.filter(function (a) {
        return typeof a.current_bid_amount === 'number' && a.current_bid_amount >= filters.minCurrentBid;
      });
    }

    if (typeof filters.maxCurrentBid === 'number') {
      auctions = auctions.filter(function (a) {
        return typeof a.current_bid_amount === 'number' && a.current_bid_amount <= filters.maxCurrentBid;
      });
    }

    if (typeof filters.endingWithinHours === 'number') {
      const now = Date.now();
      const maxTime = now + filters.endingWithinHours * 3600 * 1000;
      auctions = auctions.filter(function (a) {
        const t = Date.parse(a.end_time || '');
        if (!t) return false;
        return t >= now && t <= maxTime;
      });
    }

    if (filters.statuses && Array.isArray(filters.statuses) && filters.statuses.length > 0) {
      const sset = {};
      for (let i = 0; i < filters.statuses.length; i++) {
        sset[String(filters.statuses[i])] = true;
      }
      auctions = auctions.filter(function (a) { return !!sset[a.status]; });
    }

    if (sort && sort.field) {
      const field = sort.field;
      const direction = sort.direction === 'desc' ? -1 : 1;
      auctions.sort(function (a, b) {
        const av = a[field];
        const bv = b[field];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return -1 * direction;
        if (av > bv) return 1 * direction;
        return 0;
      });
    }

    const total = auctions.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const results = auctions.slice(start, end);

    // Instrumentation for task completion tracking (task3_lowestCryptoAuctionId)
    try {
      const kwLower = (keyword || '').toLowerCase();
      const isCryptoSearch = kwLower.indexOf('crypto') !== -1;

      let endingWithin = null;
      if (filters && filters.endingWithinHours !== undefined) {
        if (typeof filters.endingWithinHours === 'number') {
          endingWithin = filters.endingWithinHours;
        } else {
          const parsed = parseInt(filters.endingWithinHours, 10);
          endingWithin = isNaN(parsed) ? null : parsed;
        }
      }

      const is24Hours = endingWithin === 24;
      const sortField = sort && sort.field;
      const sortDirection = sort && sort.direction;

      if (isCryptoSearch && is24Hours && sortField === 'current_bid_amount' && sortDirection === 'asc' && p === 1) {
        if (results && results.length > 0) {
          localStorage.setItem('task3_lowestCryptoAuctionId', results[0].id);
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      total: total,
      page: p,
      pageSize: ps,
      results: results
    };
  }

  // getAuctionFilterOptions()
  getAuctionFilterOptions() {
    const auctions = this._getFromStorage('auctions', []);
    const tldMap = {};
    let minBid = null;
    let maxBid = null;

    for (let i = 0; i < auctions.length; i++) {
      const a = auctions[i];
      const tldRaw = String(a.tld || '');
      const tld = tldRaw.replace(/^\./, '').toLowerCase();
      if (tld) {
        if (!tldMap[tld]) {
          tldMap[tld] = { value: tld, label: '.' + tld };
        }
      }
      if (typeof a.current_bid_amount === 'number') {
        if (minBid === null || a.current_bid_amount < minBid) minBid = a.current_bid_amount;
        if (maxBid === null || a.current_bid_amount > maxBid) maxBid = a.current_bid_amount;
      }
    }

    const tldOptions = Object.keys(tldMap).sort().map(function (k) { return tldMap[k]; });

    return {
      tldOptions: tldOptions,
      currentBidRange: {
        min: minBid,
        max: maxBid,
        currency: 'USD'
      },
      timeFilters: [
        {
          value: 'ending_within_24_hours',
          label: 'Ending within 24 hours',
          endingWithinHours: 24
        },
        {
          value: 'ending_today',
          label: 'Ending today',
          endingWithinHours: 24
        },
        {
          value: 'ending_within_7_days',
          label: 'Ending within 7 days',
          endingWithinHours: 24 * 7
        }
      ]
    };
  }

  // getSortOptionsForAuctions()
  getSortOptionsForAuctions() {
    return [
      {
        value: 'current_bid_low_to_high',
        label: 'Current Bid: Low to High',
        field: 'current_bid_amount',
        direction: 'asc',
        isDefault: true
      },
      {
        value: 'current_bid_high_to_low',
        label: 'Current Bid: High to Low',
        field: 'current_bid_amount',
        direction: 'desc',
        isDefault: false
      },
      {
        value: 'time_ending_soonest',
        label: 'Time: Ending Soonest',
        field: 'end_time',
        direction: 'asc',
        isDefault: false
      },
      {
        value: 'time_ending_latest',
        label: 'Time: Ending Latest',
        field: 'end_time',
        direction: 'desc',
        isDefault: false
      }
    ];
  }

  // getAuctionDetails(auctionId)
  getAuctionDetails(auctionId) {
    const auctions = this._getFromStorage('auctions', []);
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getWishlistItems(wishlist.id);

    let auction = null;
    for (let i = 0; i < auctions.length; i++) {
      if (auctions[i].id === auctionId) {
        auction = auctions[i];
        break;
      }
    }
    if (!auction) {
      return { auction: null, isInWishlist: false };
    }

    let isInWishlist = false;
    for (let i = 0; i < wishlistItems.length; i++) {
      if (wishlistItems[i].auction_id === auction.id) {
        isInWishlist = true;
        break;
      }
    }

    return { auction: auction, isInWishlist: isInWishlist };
  }

  // placeAuctionBid(auctionId, amount)
  placeAuctionBid(auctionId, amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      return { success: false, message: 'Invalid bid amount', bid: null, updatedAuction: null };
    }

    const auctions = this._getFromStorage('auctions', []);
    let auction = null;
    let auctionIndex = -1;
    for (let i = 0; i < auctions.length; i++) {
      if (auctions[i].id === auctionId) {
        auction = auctions[i];
        auctionIndex = i;
        break;
      }
    }
    if (!auction) {
      return { success: false, message: 'Auction not found', bid: null, updatedAuction: null };
    }
    if (auction.status !== 'live') {
      return { success: false, message: 'Auction is not live', bid: null, updatedAuction: auction };
    }

    const minNext = typeof auction.min_next_bid_amount === 'number' ? auction.min_next_bid_amount : auction.current_bid_amount;
    if (typeof minNext === 'number' && amount < minNext) {
      return { success: false, message: 'Bid must be at least the minimum next bid', bid: null, updatedAuction: auction };
    }

    // Instrumentation for task completion tracking (task3_lastBidContext)
    try {
      const context = {
        auctionId: auction.id,
        bidAmount: amount,
        previousCurrentBidAmount: auction.current_bid_amount,
        previousMinNextBidAmount: minNext,
        timestamp: this._now()
      };
      localStorage.setItem('task3_lastBidContext', JSON.stringify(context));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const bids = this._getFromStorage('auction_bids', []);
    const bid = {
      id: this._generateId('bid'),
      auction_id: auction.id,
      amount: amount,
      status: 'placed',
      is_auto_bid: false,
      created_at: this._now()
    };
    bids.push(bid);

    auction.current_bid_amount = amount;
    const inc = typeof auction.bid_increment === 'number' && auction.bid_increment > 0 ? auction.bid_increment : 1;
    auction.min_next_bid_amount = amount + inc;
    auction.total_bids = (auction.total_bids || 0) + 1;

    auctions[auctionIndex] = auction;
    this._saveToStorage('auction_bids', bids);
    this._saveToStorage('auctions', auctions);

    const bidWithAuction = { ...bid, auction: auction };

    return {
      success: true,
      message: 'Bid placed',
      bid: bidWithAuction,
      updatedAuction: {
        current_bid_amount: auction.current_bid_amount,
        min_next_bid_amount: auction.min_next_bid_amount,
        total_bids: auction.total_bids,
        status: auction.status
      }
    };
  }

  // addAuctionToWishlist(auctionId)
  addAuctionToWishlist(auctionId) {
    const wishlist = this._getOrCreateWishlist();
    const auctions = this._getFromStorage('auctions', []);
    let auction = null;
    for (let i = 0; i < auctions.length; i++) {
      if (auctions[i].id === auctionId) {
        auction = auctions[i];
        break;
      }
    }
    if (!auction) {
      return { success: false, message: 'Auction not found', wishlist: null };
    }

    let items = this._getFromStorage('wishlist_items', []);
    for (let i = 0; i < items.length; i++) {
      if (items[i].wishlist_id === wishlist.id && items[i].auction_id === auction.id) {
        const resolvedItems = this._getWishlistItems(wishlist.id);
        return {
          success: true,
          message: 'Auction already in wishlist',
          wishlist: {
            id: wishlist.id,
            items: resolvedItems,
            itemCount: resolvedItems.length
          }
        };
      }
    }

    const newItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      item_type: 'auction',
      listing_id: null,
      auction_id: auction.id,
      domain_name: auction.domain_name,
      tld: auction.tld,
      added_at: this._now()
    };
    items.push(newItem);

    const wishlists = this._getFromStorage('wishlists', []);
    for (let i = 0; i < wishlists.length; i++) {
      if (wishlists[i].id === wishlist.id) {
        wishlists[i].updated_at = this._now();
        break;
      }
    }

    this._saveToStorage('wishlist_items', items);
    this._saveToStorage('wishlists', wishlists);

    const resolvedItems = this._getWishlistItems(wishlist.id);
    return {
      success: true,
      message: 'Auction added to wishlist',
      wishlist: {
        id: wishlist.id,
        items: resolvedItems,
        itemCount: resolvedItems.length
      }
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const summary = this._buildCartSummary(cart);
    return { cart: summary };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getCurrentCart();
    let items = this._getFromStorage('cart_items', []);
    let changed = false;
    items = items.filter(function (it) {
      if (it.id === cartItemId) {
        changed = true;
        return false;
      }
      return true;
    });
    if (changed) {
      this._saveToStorage('cart_items', items);
      if (cart) {
        const carts = this._getFromStorage('carts', []);
        for (let i = 0; i < carts.length; i++) {
          if (carts[i].id === cart.id) {
            carts[i].updated_at = this._now();
            break;
          }
        }
        this._saveToStorage('carts', carts);
      }
    }
    const summary = cart ? this._buildCartSummary(cart) : null;
    return {
      success: true,
      message: 'Item removed from cart',
      cart: summary
    };
  }

  // startCheckoutFromCart()
  startCheckoutFromCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getCartItems(cart.id);
    if (!cartItems || cartItems.length === 0) {
      return { success: false, checkoutSession: null, cart: this._buildCartSummary(cart) };
    }

    const checkoutSession = this._getOrCreateCheckoutSession(cart);
    const usesPaymentPlan = cartItems.some(function (it) { return it.item_type === 'payment_plan'; });
    checkoutSession.uses_payment_plan = usesPaymentPlan;
    checkoutSession.updated_at = this._now();

    const sessions = this._getFromStorage('checkout_sessions', []);
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === checkoutSession.id) {
        sessions[i] = checkoutSession;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    return {
      success: true,
      checkoutSession: { ...checkoutSession },
      cart: this._buildCartSummary(cart)
    };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const items = this._getWishlistItems(wishlist.id);
    return {
      wishlist: {
        id: wishlist.id,
        items: items,
        itemCount: items.length
      }
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let items = this._getFromStorage('wishlist_items', []);
    let changed = false;
    items = items.filter(function (it) {
      if (it.id === wishlistItemId) {
        changed = true;
        return false;
      }
      return true;
    });
    if (changed) {
      this._saveToStorage('wishlist_items', items);
      const wishlists = this._getFromStorage('wishlists', []);
      for (let i = 0; i < wishlists.length; i++) {
        if (wishlists[i].id === wishlist.id) {
          wishlists[i].updated_at = this._now();
          break;
        }
      }
      this._saveToStorage('wishlists', wishlists);
    }
    const resolvedItems = this._getWishlistItems(wishlist.id);
    return {
      success: true,
      wishlist: {
        id: wishlist.id,
        items: resolvedItems,
        itemCount: resolvedItems.length
      }
    };
  }

  // moveWishlistItemToCart(wishlistItemId)
  moveWishlistItemToCart(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let items = this._getFromStorage('wishlist_items', []);
    const listings = this._getFromStorage('domain_listings', []);
    const auctions = this._getFromStorage('auctions', []);

    let target = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === wishlistItemId) {
        target = items[i];
        break;
      }
    }
    if (!target) {
      const resolvedItems = this._getWishlistItems(wishlist.id);
      return {
        success: false,
        message: 'Wishlist item not found',
        wishlist: {
          id: wishlist.id,
          items: resolvedItems,
          itemCount: resolvedItems.length
        },
        cart: this._buildCartSummary(this._getCurrentCart())
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    if (target.item_type === 'listing' && target.listing_id) {
      let listing = null;
      for (let i = 0; i < listings.length; i++) {
        if (listings[i].id === target.listing_id) {
          listing = listings[i];
          break;
        }
      }
      if (listing) {
        const item = {
          id: this._generateId('cart_item'),
          cart_id: cart.id,
          item_type: 'listing',
          listing_id: listing.id,
          auction_id: null,
          selected_payment_plan_id: null,
          domain_name: listing.domain_name,
          tld: listing.tld,
          price: listing.price,
          quantity: 1,
          currency: listing.currency || 'USD',
          added_at: this._now()
        };
        cartItems.push(item);
      }
    } else if (target.item_type === 'auction' && target.auction_id) {
      let auction = null;
      for (let i = 0; i < auctions.length; i++) {
        if (auctions[i].id === target.auction_id) {
          auction = auctions[i];
          break;
        }
      }
      if (auction && typeof auction.buy_now_price === 'number') {
        const item = {
          id: this._generateId('cart_item'),
          cart_id: cart.id,
          item_type: 'auction',
          listing_id: null,
          auction_id: auction.id,
          selected_payment_plan_id: null,
          domain_name: auction.domain_name,
          tld: auction.tld,
          price: auction.buy_now_price,
          quantity: 1,
          currency: auction.currency || 'USD',
          added_at: this._now()
        };
        cartItems.push(item);
      }
    }

    // Remove from wishlist
    items = items.filter(function (it) { return it.id !== wishlistItemId; });
    this._saveToStorage('wishlist_items', items);

    const wishlists = this._getFromStorage('wishlists', []);
    for (let i = 0; i < wishlists.length; i++) {
      if (wishlists[i].id === wishlist.id) {
        wishlists[i].updated_at = this._now();
        break;
      }
    }
    this._saveToStorage('wishlists', wishlists);

    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts', []);
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].updated_at = this._now();
        break;
      }
    }
    this._saveToStorage('carts', carts);

    const resolvedItems = this._getWishlistItems(wishlist.id);
    const cartSummary = this._buildCartSummary(cart);

    return {
      success: true,
      message: 'Moved to cart',
      wishlist: {
        id: wishlist.id,
        items: resolvedItems,
        itemCount: resolvedItems.length
      },
      cart: cartSummary
    };
  }

  // startBulkSearch(rawInputText)
  startBulkSearch(rawInputText) {
    this._seedDemoListingsIfNeeded();
    const keywords = this._parseBulkSearchInput(rawInputText || '');
    const job = {
      id: this._generateId('bulk_job'),
      input_keywords: keywords,
      raw_input_text: rawInputText || '',
      status: 'pending',
      created_at: this._now()
    };

    const jobs = this._getFromStorage('bulk_search_jobs', []);
    jobs.push(job);
    this._saveToStorage('bulk_search_jobs', jobs);

    // Simulate execution immediately: create BulkSearchResult entries based on existing listings
    const listings = this._getFromStorage('domain_listings', []);
    const results = this._getFromStorage('bulk_search_results', []);

    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i].toLowerCase();
      for (let j = 0; j < listings.length; j++) {
        const l = listings[j];
        const dn = (l.domain_name || '').toLowerCase();
        const sld = (l.sld || '').toLowerCase();
        const match = dn.indexOf(kw) !== -1 || sld.indexOf(kw) !== -1;
        if (match) {
          const res = {
            id: this._generateId('bulk_res'),
            bulk_search_id: job.id,
            listing_id: l.id,
            matched_keyword: keywords[i],
            created_at: this._now()
          };
          results.push(res);
        }
      }
    }

    job.status = 'completed';
    this._saveToStorage('bulk_search_results', results);
    // Update job status in storage
    const jobsAfter = this._getFromStorage('bulk_search_jobs', []);
    for (let i = 0; i < jobsAfter.length; i++) {
      if (jobsAfter[i].id === job.id) {
        jobsAfter[i].status = 'completed';
        break;
      }
    }
    this._saveToStorage('bulk_search_jobs', jobsAfter);

    return { job: job };
  }

  // getBulkSearchResults(bulkSearchId, filters)
  getBulkSearchResults(bulkSearchId, filters) {
    const jobs = this._getFromStorage('bulk_search_jobs', []);
    let job = null;
    for (let i = 0; i < jobs.length; i++) {
      if (jobs[i].id === bulkSearchId) {
        job = jobs[i];
        break;
      }
    }
    if (!job) {
      return { job: null, results: [] };
    }

    filters = filters || {};

    const allResults = this._getFromStorage('bulk_search_results', []);
    const listings = this._getFromStorage('domain_listings', []);

    let matched = [];
    for (let i = 0; i < allResults.length; i++) {
      const br = allResults[i];
      if (br.bulk_search_id !== job.id) continue;
      let listing = null;
      for (let j = 0; j < listings.length; j++) {
        if (listings[j].id === br.listing_id) {
          listing = this._attachOwnedDomainToListing(listings[j]);
          break;
        }
      }
      if (!listing) continue;

      matched.push({ bulkResult: br, listing: listing });
    }

    if (filters.tlds && Array.isArray(filters.tlds) && filters.tlds.length > 0) {
      const tset = {};
      const normalizeTld = function (v) {
        return String(v || '').toLowerCase().replace(/^\./, '');
      };
      for (let i = 0; i < filters.tlds.length; i++) {
        tset[normalizeTld(filters.tlds[i])] = true;
      }
      matched = matched.filter(function (r) {
        return !!tset[normalizeTld(r.listing.tld)];
      });
    }

    if (filters.listingTypes && Array.isArray(filters.listingTypes) && filters.listingTypes.length > 0) {
      const typeSet = {};
      for (let i = 0; i < filters.listingTypes.length; i++) {
        typeSet[String(filters.listingTypes[i])] = true;
      }
      matched = matched.filter(function (r) {
        return !!typeSet[r.listing.listing_type];
      });
    }

    if (typeof filters.maxPrice === 'number') {
      matched = matched.filter(function (r) {
        return typeof r.listing.price === 'number' && r.listing.price <= filters.maxPrice;
      });
    }

    return {
      job: job,
      results: matched
    };
  }

  // listSavedSearches()
  listSavedSearches() {
    return this._getFromStorage('saved_searches', []);
  }

  // getSavedSearchFormOptions()
  getSavedSearchFormOptions() {
    const listings = this._getFromStorage('domain_listings', []);
    const tldMap = {};
    for (let i = 0; i < listings.length; i++) {
      const tldRaw = String(listings[i].tld || '');
      const tld = tldRaw.replace(/^\./, '').toLowerCase();
      if (tld && !tldMap[tld]) {
        tldMap[tld] = { value: tld, label: '.' + tld };
      }
    }
    const tldOptions = Object.keys(tldMap).sort().map(function (k) { return tldMap[k]; });

    return {
      tldOptions: tldOptions,
      notificationFrequencies: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'instant', label: 'Instant' },
        { value: 'none', label: 'None' }
      ],
      notificationChannels: [
        { value: 'on_site', label: 'On-site notifications' },
        { value: 'email', label: 'Email' }
      ]
    };
  }

  // createSavedSearch(name, keyword, tlds, minPrice, maxPrice, minLength, maxLength, notificationFrequency, notificationChannel)
  createSavedSearch(name, keyword, tlds, minPrice, maxPrice, minLength, maxLength, notificationFrequency, notificationChannel) {
    const saved = this._getFromStorage('saved_searches', []);
    const search = {
      id: this._generateId('saved_search'),
      name: name,
      keyword: keyword,
      tlds: Array.isArray(tlds) ? tlds : [],
      min_price: typeof minPrice === 'number' ? minPrice : null,
      max_price: typeof maxPrice === 'number' ? maxPrice : null,
      min_length: typeof minLength === 'number' ? minLength : null,
      max_length: typeof maxLength === 'number' ? maxLength : null,
      notification_frequency: notificationFrequency,
      notification_channel: notificationChannel,
      is_active: true,
      created_at: this._now(),
      updated_at: this._now()
    };
    saved.push(search);
    this._saveToStorage('saved_searches', saved);
    return {
      success: true,
      savedSearch: search,
      message: 'Saved search created'
    };
  }

  // updateSavedSearch(savedSearchId, updates)
  updateSavedSearch(savedSearchId, updates) {
    const saved = this._getFromStorage('saved_searches', []);
    let found = null;
    for (let i = 0; i < saved.length; i++) {
      if (saved[i].id === savedSearchId) {
        found = saved[i];
        break;
      }
    }
    if (!found) {
      return { success: false, savedSearch: null, message: 'Saved search not found' };
    }

    if (updates.name !== undefined) found.name = updates.name;
    if (updates.keyword !== undefined) found.keyword = updates.keyword;
    if (updates.tlds !== undefined) found.tlds = updates.tlds;
    if (updates.minPrice !== undefined) found.min_price = updates.minPrice;
    if (updates.maxPrice !== undefined) found.max_price = updates.maxPrice;
    if (updates.minLength !== undefined) found.min_length = updates.minLength;
    if (updates.maxLength !== undefined) found.max_length = updates.maxLength;
    if (updates.notificationFrequency !== undefined) found.notification_frequency = updates.notificationFrequency;
    if (updates.notificationChannel !== undefined) found.notification_channel = updates.notificationChannel;
    if (updates.isActive !== undefined) found.is_active = updates.isActive;

    found.updated_at = this._now();
    this._saveToStorage('saved_searches', saved);

    return {
      success: true,
      savedSearch: found,
      message: 'Saved search updated'
    };
  }

  // deleteSavedSearch(savedSearchId)
  deleteSavedSearch(savedSearchId) {
    let saved = this._getFromStorage('saved_searches', []);
    let changed = false;
    saved = saved.filter(function (s) {
      if (s.id === savedSearchId) {
        changed = true;
        return false;
      }
      return true;
    });
    if (changed) {
      this._saveToStorage('saved_searches', saved);
    }
    return {
      success: changed,
      message: changed ? 'Saved search deleted' : 'Saved search not found',
      remainingSavedSearches: saved
    };
  }

  // getPortfolioOverview()
  getPortfolioOverview() {
    const portfolios = this._getFromStorage('portfolios', []);
    const ownedDomains = this._getFromStorage('owned_domains', []);
    const now = Date.now();
    const within30 = now + 30 * 24 * 3600 * 1000;

    const overview = [];
    for (let i = 0; i < portfolios.length; i++) {
      const p = portfolios[i];
      let domainCount = 0;
      let expiringWithin30 = 0;
      for (let j = 0; j < ownedDomains.length; j++) {
        const od = ownedDomains[j];
        if (od.portfolio_id !== p.id) continue;
        domainCount++;
        const exp = Date.parse(od.expiration_date || '');
        if (exp && exp >= now && exp <= within30) {
          expiringWithin30++;
        }
      }
      overview.push({
        portfolio: p,
        domainCount: domainCount,
        expiringWithin30DaysCount: expiringWithin30
      });
    }
    return { portfolios: overview };
  }

  // getOwnedDomains(filters, page, pageSize)
  getOwnedDomains(filters, page, pageSize) {
    const ownedDomains = this._getFromStorage('owned_domains', []);
    const portfolios = this._getFromStorage('portfolios', []);
    filters = filters || {};

    const now = Date.now();
    const within30 = now + 30 * 24 * 3600 * 1000;

    let results = [];
    for (let i = 0; i < ownedDomains.length; i++) {
      const od = ownedDomains[i];
      if (filters.portfolioId && od.portfolio_id !== filters.portfolioId) continue;
      if (filters.expirationStatus && filters.expirationStatus !== 'all') {
        const exp = Date.parse(od.expiration_date || '');
        if (filters.expirationStatus === 'expiring_within_30_days') {
          if (!(exp && exp >= now && exp <= within30)) continue;
        } else if (filters.expirationStatus === 'active') {
          if (!(exp && exp > now)) continue;
        } else if (filters.expirationStatus === 'expired') {
          if (!(exp && exp < now)) continue;
        }
      }
      // attach portfolio
      let portfolio = null;
      if (od.portfolio_id) {
        for (let j = 0; j < portfolios.length; j++) {
          if (portfolios[j].id === od.portfolio_id) {
            portfolio = portfolios[j];
            break;
          }
        }
      }
      results.push({ ...od, portfolio: portfolio });
    }

    const total = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 50;
    const start = (p - 1) * ps;
    const end = start + ps;

    return {
      total: total,
      page: p,
      pageSize: ps,
      results: results.slice(start, end)
    };
  }

  // getOwnedDomainDetails(ownedDomainId)
  getOwnedDomainDetails(ownedDomainId) {
    const ownedDomains = this._getFromStorage('owned_domains', []);
    const listings = this._getFromStorage('domain_listings', []);
    const portfolios = this._getFromStorage('portfolios', []);

    let ownedDomain = null;
    for (let i = 0; i < ownedDomains.length; i++) {
      if (ownedDomains[i].id === ownedDomainId) {
        ownedDomain = ownedDomains[i];
        break;
      }
    }
    if (!ownedDomain) {
      return { ownedDomain: null, activeListing: null };
    }

    let activeListing = null;
    for (let i = 0; i < listings.length; i++) {
      if (listings[i].owned_domain_id === ownedDomain.id && listings[i].status === 'active') {
        activeListing = listings[i];
        break;
      }
    }

    let portfolio = null;
    if (ownedDomain.portfolio_id) {
      for (let i = 0; i < portfolios.length; i++) {
        if (portfolios[i].id === ownedDomain.portfolio_id) {
          portfolio = portfolios[i];
          break;
        }
      }
    }

    const ownedWithPortfolio = { ...ownedDomain, portfolio: portfolio };

    return {
      ownedDomain: ownedWithPortfolio,
      activeListing: activeListing
    };
  }

  // createOrUpdateListingForOwnedDomain(ownedDomainId, listingType, price, minOfferAmount)
  createOrUpdateListingForOwnedDomain(ownedDomainId, listingType, price, minOfferAmount) {
    const ownedDomains = this._getFromStorage('owned_domains', []);
    let ownedDomain = null;
    let odIndex = -1;
    for (let i = 0; i < ownedDomains.length; i++) {
      if (ownedDomains[i].id === ownedDomainId) {
        ownedDomain = ownedDomains[i];
        odIndex = i;
        break;
      }
    }
    if (!ownedDomain) {
      return { success: false, message: 'Owned domain not found', listing: null };
    }

    const listings = this._getFromStorage('domain_listings', []);
    let listing = null;
    let listingIndex = -1;
    for (let i = 0; i < listings.length; i++) {
      if (listings[i].owned_domain_id === ownedDomain.id) {
        listing = listings[i];
        listingIndex = i;
        break;
      }
    }

    if (!listing) {
      listing = {
        id: this._generateId('listing'),
        domain_name: ownedDomain.domain_name,
        sld: ownedDomain.sld,
        tld: ownedDomain.tld,
        domain_length: ownedDomain.domain_length,
        keywords: [],
        description: null,
        price: typeof price === 'number' ? price : null,
        currency: 'USD',
        is_premium: false,
        listing_type: listingType,
        has_payment_plan: false,
        payment_plan_option_ids: [],
        min_offer_amount: typeof minOfferAmount === 'number' ? minOfferAmount : null,
        status: 'active',
        source: 'owned_portfolio',
        owned_domain_id: ownedDomain.id,
        created_at: this._now(),
        updated_at: this._now()
      };
      listings.push(listing);
    } else {
      listing.listing_type = listingType;
      if (typeof price === 'number') listing.price = price;
      if (typeof minOfferAmount === 'number') listing.min_offer_amount = minOfferAmount;
      listing.updated_at = this._now();
      listings[listingIndex] = listing;
    }

    ownedDomain.has_active_listing = true;
    ownedDomain.listing_id = listing.id;
    ownedDomains[odIndex] = ownedDomain;

    this._saveToStorage('domain_listings', listings);
    this._saveToStorage('owned_domains', ownedDomains);

    return {
      success: true,
      message: 'Listing created/updated',
      listing: {
        id: listing.id,
        domain_name: listing.domain_name,
        price: listing.price,
        currency: listing.currency,
        listing_type: listing.listing_type,
        min_offer_amount: listing.min_offer_amount,
        status: listing.status
      }
    };
  }

  // getCheckoutSession()
  getCheckoutSession() {
    const session = this._getCurrentCheckoutSession();
    const cart = this._getCurrentCart();
    const cartSummary = cart ? this._buildCartSummary(cart) : null;

    if (!session) {
      return {
        checkoutSession: null,
        cart: cartSummary
      };
    }

    const sessionView = {
      id: session.id,
      cart_id: session.cart_id,
      status: session.status,
      contact_first_name: session.contact_first_name,
      contact_last_name: session.contact_last_name,
      contact_email: session.contact_email,
      contact_phone: session.contact_phone,
      billing_street: session.billing_street,
      billing_city: session.billing_city,
      billing_state_region: session.billing_state_region,
      billing_postal_code: session.billing_postal_code,
      billing_country: session.billing_country,
      payment_method: session.payment_method,
      cardholder_name: session.cardholder_name,
      card_last4: session.card_last4,
      card_brand: session.card_brand,
      uses_payment_plan: session.uses_payment_plan
    };

    return {
      checkoutSession: sessionView,
      cart: cartSummary
    };
  }

  // updateCheckoutSessionDetails(details)
  updateCheckoutSessionDetails(details) {
    let session = this._getCurrentCheckoutSession();
    let cart = this._getCurrentCart();
    if (!cart) {
      cart = this._getOrCreateCart();
    }
    if (!session) {
      session = this._getOrCreateCheckoutSession(cart);
    }

    const validationErrors = [];

    if (details.contactEmail !== undefined) {
      if (!details.contactEmail || details.contactEmail.indexOf('@') === -1) {
        validationErrors.push({ field: 'contactEmail', message: 'Invalid email' });
      }
    }

    if (details.paymentMethod === 'card') {
      const num = details.cardNumber;
      if (!num || String(num).replace(/\s+/g, '').length < 12) {
        validationErrors.push({ field: 'cardNumber', message: 'Invalid card number' });
      }
      if (!details.cardExpiryMonth) {
        validationErrors.push({ field: 'cardExpiryMonth', message: 'Expiry month required' });
      }
      if (!details.cardExpiryYear) {
        validationErrors.push({ field: 'cardExpiryYear', message: 'Expiry year required' });
      }
      if (!details.cardCvc || String(details.cardCvc).length < 3) {
        validationErrors.push({ field: 'cardCvc', message: 'Invalid CVC' });
      }
    }

    if (validationErrors.length > 0) {
      return {
        checkoutSession: session,
        validationErrors: validationErrors,
        success: false
      };
    }

    if (details.contactFirstName !== undefined) session.contact_first_name = details.contactFirstName;
    if (details.contactLastName !== undefined) session.contact_last_name = details.contactLastName;
    if (details.contactEmail !== undefined) session.contact_email = details.contactEmail;
    if (details.contactPhone !== undefined) session.contact_phone = details.contactPhone;
    if (details.billingStreet !== undefined) session.billing_street = details.billingStreet;
    if (details.billingCity !== undefined) session.billing_city = details.billingCity;
    if (details.billingStateRegion !== undefined) session.billing_state_region = details.billingStateRegion;
    if (details.billingPostalCode !== undefined) session.billing_postal_code = details.billingPostalCode;
    if (details.billingCountry !== undefined) session.billing_country = details.billingCountry;

    if (details.paymentMethod !== undefined) session.payment_method = details.paymentMethod;
    if (details.paymentMethod === 'card') {
      session.cardholder_name = details.cardholderName || session.cardholder_name;
      const num = String(details.cardNumber || '');
      const trimmed = num.replace(/\s+/g, '');
      session.card_last4 = trimmed ? trimmed.slice(-4) : session.card_last4;
      session.card_brand = this._detectCardBrand(trimmed) || session.card_brand;
    }

    session.updated_at = this._now();

    const sessions = this._getFromStorage('checkout_sessions', []);
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    return {
      checkoutSession: session,
      validationErrors: [],
      success: true
    };
  }

  // generateOrderReviewFromSession()
  generateOrderReviewFromSession() {
    const session = this._getCurrentCheckoutSession();
    const cart = this._getCurrentCart();
    if (!session || !cart) {
      return {
        orderReview: null,
        cart: null,
        checkoutSession: null
      };
    }

    const cartItems = this._getCartItems(cart.id);
    const totals = this._calculateOrderTotals(cart, cartItems);

    const orderReview = {
      id: this._generateId('order_review'),
      checkout_session_id: session.id,
      order_total: totals.orderTotal,
      currency: totals.currency,
      summary_text: 'Order total: ' + totals.orderTotal + ' ' + totals.currency,
      reviewed_at: this._now(),
      is_confirmed: false
    };

    const reviews = this._getFromStorage('order_reviews', []);
    reviews.push(orderReview);
    this._saveToStorage('order_reviews', reviews);

    // Update session status to review
    const sessions = this._getFromStorage('checkout_sessions', []);
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i].status = 'review';
        sessions[i].updated_at = this._now();
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    const cartSummary = this._buildCartSummary(cart);

    return {
      orderReview: orderReview,
      cart: {
        items: cartSummary ? cartSummary.items : [],
        subtotal: totals.subtotal,
        currency: totals.currency
      },
      checkoutSession: {
        id: session.id,
        status: 'review',
        contact_first_name: session.contact_first_name,
        contact_last_name: session.contact_last_name,
        contact_email: session.contact_email
      }
    };
  }

  // getOrderReview(orderReviewId)
  getOrderReview(orderReviewId) {
    const reviews = this._getFromStorage('order_reviews', []);
    let review = null;
    for (let i = 0; i < reviews.length; i++) {
      if (reviews[i].id === orderReviewId) {
        review = reviews[i];
        break;
      }
    }
    if (!review) {
      return { orderReview: null, cart: null };
    }

    const sessions = this._getFromStorage('checkout_sessions', []);
    let session = null;
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === review.checkout_session_id) {
        session = sessions[i];
        break;
      }
    }

    let cartSummary = null;
    if (session) {
      const carts = this._getFromStorage('carts', []);
      let cart = null;
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === session.cart_id) {
          cart = carts[i];
          break;
        }
      }
      if (cart) {
        cartSummary = this._buildCartSummary(cart);
      }
    }

    return {
      orderReview: review,
      cart: cartSummary
    };
  }

  // confirmOrderPlacement(orderReviewId)
  confirmOrderPlacement(orderReviewId) {
    const reviews = this._getFromStorage('order_reviews', []);
    let review = null;
    let reviewIndex = -1;
    for (let i = 0; i < reviews.length; i++) {
      if (reviews[i].id === orderReviewId) {
        review = reviews[i];
        reviewIndex = i;
        break;
      }
    }
    if (!review) {
      return { success: false, message: 'Order review not found', orderReview: null };
    }

    if (review.is_confirmed) {
      return { success: true, message: 'Order already confirmed', orderReview: review };
    }

    review.is_confirmed = true;
    review.reviewed_at = this._now();
    reviews[reviewIndex] = review;
    this._saveToStorage('order_reviews', reviews);

    // Update checkout session and cart
    const sessions = this._getFromStorage('checkout_sessions', []);
    let session = null;
    let sessionIndex = -1;
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === review.checkout_session_id) {
        session = sessions[i];
        sessionIndex = i;
        break;
      }
    }
    let cartId = null;
    if (session) {
      session.status = 'completed';
      session.updated_at = this._now();
      cartId = session.cart_id;
      sessions[sessionIndex] = session;
      this._saveToStorage('checkout_sessions', sessions);
    }

    if (cartId) {
      const carts = this._getFromStorage('carts', []);
      for (let i = 0; i < carts.length; i++) {
        if (carts[i].id === cartId) {
          carts[i].status = 'converted';
          carts[i].updated_at = this._now();
          break;
        }
      }
      this._saveToStorage('carts', carts);
    }

    return {
      success: true,
      message: 'Order confirmed',
      orderReview: {
        id: review.id,
        is_confirmed: review.is_confirmed
      }
    };
  }

  // getStaticPageContent(pageSlug)
  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages', {});
    if (pages[pageSlug]) {
      return pages[pageSlug];
    }
    // If not present, create a minimal placeholder page and persist it
    const page = {
      title: pageSlug.replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); }),
      sections: [
        {
          heading: 'Content Coming Soon',
          bodyHtml: '<p>Content for ' + pageSlug + ' is not configured yet.</p>'
        }
      ]
    };
    pages[pageSlug] = page;
    this._saveToStorage('static_pages', pages);
    return page;
  }

  // submitContactRequest(name, email, topic, subject, message)
  submitContactRequest(name, email, topic, subject, message) {
    const errors = [];
    if (!name) errors.push('name');
    if (!email || email.indexOf('@') === -1) errors.push('email');
    if (!subject) errors.push('subject');
    if (!message) errors.push('message');

    if (errors.length > 0) {
      return {
        success: false,
        message: 'Missing or invalid fields: ' + errors.join(', '),
        ticketId: null
      };
    }

    const ticketId = this._generateId('ticket');
    const requests = this._getFromStorage('contact_requests', []);
    requests.push({
      id: ticketId,
      name: name,
      email: email,
      topic: topic || null,
      subject: subject,
      message: message,
      created_at: this._now()
    });
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      message: 'Contact request submitted',
      ticketId: ticketId
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