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

  // -----------------------------
  // Storage helpers / init
  // -----------------------------

  _initStorage() {
    const keys = [
      // Core entities
      'car_models',
      'car_listings',
      'saved_listings',
      'comparison_sets',
      'comparison_set_items',
      'saved_searches',
      'products',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'guides',
      'reading_list_items',
      'events',
      'event_registrations',
      'forum_categories',
      'forum_threads',
      'forum_posts',
      'thread_subscriptions',
      'vin_decode_results',
      'garage_cars',
      // Optional / legacy
      'users'
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

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data == null) return defaultValue;
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
    const raw = localStorage.getItem('idCounter');
    const current = raw ? parseInt(raw, 10) : 1000;
    const next = isNaN(current) ? 1001 : current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // Utility: shallow clone to avoid accidental mutations of stored objects
  _clone(obj) {
    if (obj == null) return obj;
    return JSON.parse(JSON.stringify(obj));
  }

  // -----------------------------
  // Helper functions (private)
  // -----------------------------

  // Cart helpers
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now,
        status: 'active' // enum: active | checked_out | abandoned
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getActiveCartId() {
    const cart = this._getOrCreateCart();
    return cart.id;
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cartId);
    let subtotal = 0;

    const detailedItems = itemsForCart.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const unitPrice =
        ci.unit_price_eur != null
          ? ci.unit_price_eur
          : product && typeof product.price_eur === 'number'
          ? product.price_eur
          : 0;
      const lineTotal = unitPrice * ci.quantity;
      subtotal += lineTotal;
      return {
        cart_item: this._clone(ci),
        product: this._clone(product),
        line_total_eur: lineTotal
      };
    });

    return { items: detailedItems, subtotal_eur: subtotal };
  }

  // Wishlist helpers
  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let wishlist = wishlists[0];
    if (!wishlist) {
      const now = new Date().toISOString();
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'Default Wishlist',
        created_at: now,
        updated_at: now
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _calculateWishlistSubtotal(wishlistId) {
    const wishlistItems = this._getFromStorage('wishlist_items');
    const products = this._getFromStorage('products');
    const itemsForWishlist = wishlistItems.filter((wi) => wi.wishlist_id === wishlistId);
    let subtotal = 0;

    itemsForWishlist.forEach((wi) => {
      const product = products.find((p) => p.id === wi.product_id);
      const price = product && typeof product.price_eur === 'number' ? product.price_eur : 0;
      subtotal += price * wi.quantity;
    });

    return subtotal;
  }

  // Comparison helpers
  _getCurrentComparisonSet() {
    let comparisonSets = this._getFromStorage('comparison_sets');
    let set = comparisonSets[0];
    if (!set) {
      set = {
        id: this._generateId('comparison_set'),
        name: null,
        created_at: new Date().toISOString()
      };
      comparisonSets.push(set);
      this._saveToStorage('comparison_sets', comparisonSets);
    }
    return set;
  }

  _getCurrentSavedListings() {
    return this._getFromStorage('saved_listings');
  }

  // Reading list helper
  _getOrCreateReadingList() {
    // For single-user context, the existence of 'reading_list_items' is sufficient
    // This helper ensures the key exists (handled in _initStorage) and returns items
    return this._getFromStorage('reading_list_items');
  }

  // VIN decoding helper
  _decodeSimcaVin(vin) {
    const carModels = this._getFromStorage('car_models');
    const lowerVin = (vin || '').toLowerCase();
    let matchedModel = null;

    // Very naive matching: if VIN contains a model name (compact form)
    for (const model of carModels) {
      const compactName = (model.name || '').toLowerCase().replace(/\s+/g, '');
      if (compactName && lowerVin.includes(compactName)) {
        matchedModel = model;
        break;
      }
    }

    const decodeResult = {
      id: this._generateId('vin_decode'),
      vin: vin,
      decoded_model_id: matchedModel ? matchedModel.id : null,
      decoded_model_name: matchedModel ? matchedModel.name : null,
      model_year: null,
      body_style: matchedModel ? matchedModel.body_style || null : null,
      engine_code: null,
      created_at: new Date().toISOString()
    };

    const existing = this._getFromStorage('vin_decode_results');
    existing.push(decodeResult);
    this._saveToStorage('vin_decode_results', existing);

    return { decode_result: decodeResult, matched_model: matchedModel };
  }

  // Garage helper
  _getOrCreateGarage() {
    return this._getFromStorage('garage_cars');
  }

  // Event distance helper (very simplified: same city+country => 0, else Infinity)
  _calculateEventDistanceKm(userLocation, event) {
    if (!userLocation || !event) return Infinity;
    const cityMatch =
      (event.location_city || '').toLowerCase() === (userLocation.city || '').toLowerCase();
    const countryMatch =
      (event.location_country || '').toLowerCase() ===
      (userLocation.country || '').toLowerCase();
    return cityMatch && countryMatch ? 0 : Infinity;
  }

  // Helper: resolve model into listing object (without mutating storage)
  _withListingModel(listing) {
    if (!listing) return null;
    const carModels = this._getFromStorage('car_models');
    const model = carModels.find((m) => m.id === listing.model_id) || null;
    const cloned = this._clone(listing);
    cloned.model = this._clone(model);
    return cloned;
  }

  // -----------------------------
  // 1. Homepage overview
  // -----------------------------

  getHomeOverview() {
    const carListings = this._getFromStorage('car_listings');
    const products = this._getFromStorage('products');
    const guides = this._getFromStorage('guides');
    const events = this._getFromStorage('events');
    const forumThreads = this._getFromStorage('forum_threads');
    const carModels = this._getFromStorage('car_models');

    const featured_listings = carListings
      .filter((l) => l.status === 'active' && l.is_featured)
      .sort((a, b) => {
        const da = a.created_at || '';
        const db = b.created_at || '';
        return db.localeCompare(da);
      })
      .slice(0, 5)
      .map((l) => this._withListingModel(l));

    const parts = products.filter(
      (p) => p.product_type === 'part' && p.is_active === true
    );
    const merchandise = products.filter(
      (p) => p.product_type === 'merchandise' && p.is_active === true
    );

    const featured_parts = parts
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map((p) => this._clone(p));

    const featured_merchandise = merchandise
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5)
      .map((p) => this._clone(p));

    const featured_guides = guides
      .slice()
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 5)
      .map((g) => this._clone(g));

    const nowIso = new Date().toISOString();
    const upcoming_events = events
      .filter((e) => !e.start_datetime || e.start_datetime >= nowIso)
      .sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''))
      .slice(0, 5)
      .map((e) => this._clone(e));

    const active_forum_threads = forumThreads
      .slice()
      .sort((a, b) => {
        const rb = b.reply_count || 0;
        const ra = a.reply_count || 0;
        if (rb !== ra) return rb - ra;
        return (b.updated_at || '').localeCompare(a.updated_at || '');
      })
      .slice(0, 5)
      .map((t) => this._clone(t));

    // Popular models: based on listing frequency
    const modelCountMap = {};
    carListings.forEach((l) => {
      if (!l.model_id) return;
      modelCountMap[l.model_id] = (modelCountMap[l.model_id] || 0) + 1;
    });

    const popular_models = carModels
      .slice()
      .sort((a, b) => {
        const ca = modelCountMap[a.id] || 0;
        const cb = modelCountMap[b.id] || 0;
        return cb - ca;
      })
      .slice(0, 10)
      .map((m) => this._clone(m));

    return {
      featured_listings,
      featured_parts,
      featured_merchandise,
      featured_guides,
      upcoming_events,
      active_forum_threads,
      popular_models
    };
  }

  // -----------------------------
  // 2. Global search suggestions
  // -----------------------------

  getGlobalSearchSuggestions(query, limit_per_section) {
    const q = (query || '').toLowerCase();
    let limit = typeof limit_per_section === 'number' && limit_per_section > 0 ? limit_per_section : 5;

    const carListings = this._getFromStorage('car_listings');
    const products = this._getFromStorage('products');
    const guides = this._getFromStorage('guides');
    const events = this._getFromStorage('events');
    const threads = this._getFromStorage('forum_threads');

    const classifieds = carListings
      .filter((l) => {
        if (!q) return true;
        return (
          (l.title || '').toLowerCase().includes(q) ||
          (l.model_name || '').toLowerCase().includes(q) ||
          (l.description || '').toLowerCase().includes(q)
        );
      })
      .slice(0, limit)
      .map((l) => this._withListingModel(l));

    const parts = products
      .filter((p) => {
        if (p.product_type !== 'part') return false;
        if (!q) return true;
        return (
          (p.name || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        );
      })
      .slice(0, limit)
      .map((p) => this._clone(p));

    const guidesRes = guides
      .filter((g) => {
        if (!q) return true;
        return (
          (g.title || '').toLowerCase().includes(q) ||
          (g.summary || '').toLowerCase().includes(q) ||
          (g.content || '').toLowerCase().includes(q)
        );
      })
      .slice(0, limit)
      .map((g) => this._clone(g));

    const eventsRes = events
      .filter((e) => {
        if (!q) return true;
        return (
          (e.title || '').toLowerCase().includes(q) ||
          (e.location_city || '').toLowerCase().includes(q) ||
          (e.location_country || '').toLowerCase().includes(q)
        );
      })
      .slice(0, limit)
      .map((e) => this._clone(e));

    const forum_threads = threads
      .filter((t) => {
        if (!q) return true;
        return (t.title || '').toLowerCase().includes(q);
      })
      .slice(0, limit)
      .map((t) => this._clone(t));

    return {
      classifieds,
      parts,
      guides: guidesRes,
      events: eventsRes,
      forum_threads
    };
  }

  // -----------------------------
  // 3. Classifieds filters & search
  // -----------------------------

  getClassifiedsFilterOptions() {
    const carModels = this._getFromStorage('car_models');
    const listings = this._getFromStorage('car_listings');

    const countriesMap = {};
    listings.forEach((l) => {
      if (l.location_country) {
        const key = l.location_country;
        countriesMap[key] = { code: key, name: key };
      }
    });
    const countries = Object.values(countriesMap);

    const sort_options = [
      { value: 'year', label: 'Year', default_direction: 'desc' },
      { value: 'price_eur', label: 'Price', default_direction: 'asc' },
      { value: 'created_at', label: 'Listed Date', default_direction: 'desc' }
    ];

    let minPrice = null;
    let maxPrice = null;
    let minYear = null;
    let maxYear = null;
    let minMileage = null;
    let maxMileage = null;

    listings.forEach((l) => {
      if (typeof l.price_eur === 'number') {
        if (minPrice == null || l.price_eur < minPrice) minPrice = l.price_eur;
        if (maxPrice == null || l.price_eur > maxPrice) maxPrice = l.price_eur;
      }
      if (typeof l.year === 'number') {
        if (minYear == null || l.year < minYear) minYear = l.year;
        if (maxYear == null || l.year > maxYear) maxYear = l.year;
      }
      if (typeof l.mileage_km === 'number') {
        if (minMileage == null || l.mileage_km < minMileage) minMileage = l.mileage_km;
        if (maxMileage == null || l.mileage_km > maxMileage) maxMileage = l.mileage_km;
      }
    });

    return {
      models: carModels.map((m) => this._clone(m)),
      countries,
      sort_options,
      price_range: {
        min_price_eur: minPrice,
        max_price_eur: maxPrice
      },
      year_range: {
        min_year: minYear,
        max_year: maxYear
      },
      mileage_range: {
        min_mileage_km: minMileage,
        max_mileage_km: maxMileage
      }
    };
  }

  searchClassifiedListings(
    modelIds,
    minYear,
    maxYear,
    minPriceEur,
    maxPriceEur,
    maxMileageKm,
    locationCountry,
    locationCity,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const listings = this._getFromStorage('car_listings');
    const savedListings = this._getCurrentSavedListings();
    const comparisonSet = this._getCurrentComparisonSet();
    const comparisonItems = this._getFromStorage('comparison_set_items').filter(
      (ci) => ci.comparison_set_id === comparisonSet.id
    );

    const modelIdList = Array.isArray(modelIds) ? modelIds.filter(Boolean) : [];

    let filtered = listings.filter((l) => {
      if (l.status && l.status !== 'active') return false;

      if (modelIdList.length > 0 && !modelIdList.includes(l.model_id)) return false;

      if (typeof minYear === 'number' && typeof l.year === 'number' && l.year < minYear)
        return false;
      if (typeof maxYear === 'number' && typeof l.year === 'number' && l.year > maxYear)
        return false;

      if (
        typeof minPriceEur === 'number' &&
        typeof l.price_eur === 'number' &&
        l.price_eur < minPriceEur
      )
        return false;
      if (
        typeof maxPriceEur === 'number' &&
        typeof l.price_eur === 'number' &&
        l.price_eur > maxPriceEur
      )
        return false;

      if (
        typeof maxMileageKm === 'number' &&
        typeof l.mileage_km === 'number' &&
        l.mileage_km > maxMileageKm
      )
        return false;

      if (locationCountry) {
        if (
          !l.location_country ||
          l.location_country.toLowerCase() !== locationCountry.toLowerCase()
        ) {
          return false;
        }
      }

      if (locationCity) {
        if (!l.location_city || l.location_city.toLowerCase() !== locationCity.toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    const sortField = sortBy || 'created_at';
    const direction = (sortDirection || 'desc').toLowerCase();

    filtered.sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];

      if (sortField === 'year' || sortField === 'price_eur') {
        av = typeof av === 'number' ? av : 0;
        bv = typeof bv === 'number' ? bv : 0;
      } else if (sortField === 'created_at') {
        av = av || '';
        bv = bv || '';
      }

      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    const total_results = filtered.length;
    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    const pageItems = filtered.slice(start, end);

    const results = pageItems.map((l) => {
      const is_favorited = savedListings.some(
        (s) => s.listing_id === l.id && s.saved_type === 'favorite'
      );
      const is_watchlisted = savedListings.some(
        (s) => s.listing_id === l.id && s.saved_type === 'watchlist'
      );
      const in_comparison = comparisonItems.some((ci) => ci.listing_id === l.id);
      return {
        listing: this._withListingModel(l),
        is_favorited,
        is_watchlisted,
        in_comparison
      };
    });

    return {
      results,
      pagination: {
        page: p,
        page_size: ps,
        total_results,
        total_pages: ps > 0 ? Math.ceil(total_results / ps) : 0
      }
    };
  }

  getCarListingDetail(listingId) {
    const listings = this._getFromStorage('car_listings');
    const savedListings = this._getCurrentSavedListings();
    const comparisonSet = this._getCurrentComparisonSet();
    const comparisonItems = this._getFromStorage('comparison_set_items').filter(
      (ci) => ci.comparison_set_id === comparisonSet.id
    );

    const listing = listings.find((l) => l.id === listingId) || null;
    const wrappedListing = this._withListingModel(listing);

    const is_favorited = savedListings.some(
      (s) => s.listing_id === listingId && s.saved_type === 'favorite'
    );
    const is_watchlisted = savedListings.some(
      (s) => s.listing_id === listingId && s.saved_type === 'watchlist'
    );
    const in_comparison = comparisonItems.some((ci) => ci.listing_id === listingId);

    let similar_listings = [];
    if (listing) {
      similar_listings = listings
        .filter((l) => l.id !== listing.id && l.model_id === listing.model_id)
        .slice(0, 10)
        .map((l) => this._withListingModel(l));
    }

    return {
      listing: wrappedListing,
      is_favorited,
      is_watchlisted,
      in_comparison,
      similar_listings
    };
  }

  saveListing(listingId, savedType) {
    const type = savedType === 'watchlist' ? 'watchlist' : 'favorite';
    const savedListings = this._getFromStorage('saved_listings');

    let existing = savedListings.find(
      (s) => s.listing_id === listingId && s.saved_type === type
    );

    if (!existing) {
      existing = {
        id: this._generateId('saved_listing'),
        listing_id: listingId,
        saved_type: type, // enum: favorite | watchlist
        created_at: new Date().toISOString()
      };
      savedListings.push(existing);
      this._saveToStorage('saved_listings', savedListings);
    }

    return {
      saved_listing: this._clone(existing),
      message: 'Listing saved as ' + type
    };
  }

  removeSavedListing(listingId, savedType) {
    const type = savedType === 'watchlist' ? 'watchlist' : 'favorite';
    let savedListings = this._getFromStorage('saved_listings');
    const before = savedListings.length;
    savedListings = savedListings.filter(
      (s) => !(s.listing_id === listingId && s.saved_type === type)
    );
    this._saveToStorage('saved_listings', savedListings);
    const success = savedListings.length !== before;
    return {
      success,
      message: success ? 'Saved listing removed' : 'No matching saved listing found'
    };
  }

  getSavedListings() {
    const savedListings = this._getCurrentSavedListings();
    const listings = this._getFromStorage('car_listings');

    const favorites = [];
    const watchlist = [];

    savedListings.forEach((s) => {
      const listing = listings.find((l) => l.id === s.listing_id);
      if (!listing) return;
      const wrapped = this._withListingModel(listing);
      if (s.saved_type === 'favorite') favorites.push(wrapped);
      if (s.saved_type === 'watchlist') watchlist.push(wrapped);
    });

    return { favorites, watchlist };
  }

  updateSavedListingType(listingId, fromType, toType) {
    const savedListings = this._getFromStorage('saved_listings');
    const fromT = fromType === 'watchlist' ? 'watchlist' : 'favorite';
    const toT = toType === 'watchlist' ? 'watchlist' : 'favorite';

    const item = savedListings.find(
      (s) => s.listing_id === listingId && s.saved_type === fromT
    );
    if (item) {
      item.saved_type = toT;
      this._saveToStorage('saved_listings', savedListings);
    }
    return {
      updated_saved_listing: item ? this._clone(item) : null
    };
  }

  // -----------------------------
  // 4. Comparison set
  // -----------------------------

  addListingToComparison(listingId) {
    const comparisonSet = this._getCurrentComparisonSet();
    let items = this._getFromStorage('comparison_set_items');

    let existing = items.find(
      (ci) => ci.comparison_set_id === comparisonSet.id && ci.listing_id === listingId
    );
    if (!existing) {
      existing = {
        id: this._generateId('comparison_item'),
        comparison_set_id: comparisonSet.id,
        listing_id: listingId,
        added_at: new Date().toISOString()
      };
      items.push(existing);
      this._saveToStorage('comparison_set_items', items);
    }

    const listings = this._getFromStorage('car_listings');
    const itemsForSet = items.filter((ci) => ci.comparison_set_id === comparisonSet.id);

    const detailedItems = itemsForSet.map((ci) => {
      const listing = listings.find((l) => l.id === ci.listing_id) || null;
      return {
        comparison_item: this._clone(ci),
        listing: this._withListingModel(listing)
      };
    });

    return {
      comparison_set: this._clone(comparisonSet),
      items: detailedItems
    };
  }

  removeListingFromComparison(listingId) {
    const comparisonSet = this._getCurrentComparisonSet();
    let items = this._getFromStorage('comparison_set_items');

    items = items.filter(
      (ci) => !(ci.comparison_set_id === comparisonSet.id && ci.listing_id === listingId)
    );
    this._saveToStorage('comparison_set_items', items);

    const listings = this._getFromStorage('car_listings');
    const itemsForSet = items.filter((ci) => ci.comparison_set_id === comparisonSet.id);

    const detailedItems = itemsForSet.map((ci) => {
      const listing = listings.find((l) => l.id === ci.listing_id) || null;
      return {
        comparison_item: this._clone(ci),
        listing: this._withListingModel(listing)
      };
    });

    return {
      comparison_set: this._clone(comparisonSet),
      items: detailedItems
    };
  }

  getComparisonSet() {
    const comparisonSet = this._getCurrentComparisonSet();
    const items = this._getFromStorage('comparison_set_items');
    const listings = this._getFromStorage('car_listings');

    const itemsForSet = items.filter((ci) => ci.comparison_set_id === comparisonSet.id);

    const detailedItems = itemsForSet.map((ci) => {
      const listing = listings.find((l) => l.id === ci.listing_id) || null;
      return {
        comparison_item: this._clone(ci),
        listing: this._withListingModel(listing)
      };
    });

    return {
      comparison_set: this._clone(comparisonSet),
      items: detailedItems
    };
  }

  // -----------------------------
  // 5. Saved search alerts
  // -----------------------------

  saveClassifiedSearchAlert(
    name,
    modelId,
    locationCountry,
    locationCity,
    minPriceEur,
    maxPriceEur,
    minYear,
    maxYear,
    maxMileageKm,
    notificationFrequency,
    notificationChannel
  ) {
    const savedSearches = this._getFromStorage('saved_searches');

    const saved_search = {
      id: this._generateId('saved_search'),
      name: name,
      model_id: modelId || null,
      location_country: locationCountry || null,
      location_city: locationCity || null,
      min_price_eur: typeof minPriceEur === 'number' ? minPriceEur : null,
      max_price_eur: typeof maxPriceEur === 'number' ? maxPriceEur : null,
      min_year: typeof minYear === 'number' ? minYear : null,
      max_year: typeof maxYear === 'number' ? maxYear : null,
      max_mileage_km: typeof maxMileageKm === 'number' ? maxMileageKm : null,
      notification_frequency: notificationFrequency || 'daily',
      notification_channel: notificationChannel || 'on_site',
      created_at: new Date().toISOString()
    };

    savedSearches.push(saved_search);
    this._saveToStorage('saved_searches', savedSearches);

    return { saved_search: this._clone(saved_search) };
  }

  // -----------------------------
  // 6. Shop filters & product search
  // -----------------------------

  getShopFilterOptions(section) {
    const isParts = section === 'parts';
    const isMerch = section === 'merchandise';

    const carModels = this._getFromStorage('car_models');
    const products = this._getFromStorage('products');

    const models = carModels.map((m) => this._clone(m));

    const part_categoriesSet = new Set();
    const merch_categoriesSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    products.forEach((p) => {
      if (p.product_type === 'part') {
        if (p.part_category) part_categoriesSet.add(p.part_category);
      }
      if (p.product_type === 'merchandise') {
        if (p.merchandise_category) merch_categoriesSet.add(p.merchandise_category);
      }

      if ((isParts && p.product_type === 'part') || (isMerch && p.product_type === 'merchandise')) {
        if (typeof p.price_eur === 'number') {
          if (minPrice == null || p.price_eur < minPrice) minPrice = p.price_eur;
          if (maxPrice == null || p.price_eur > maxPrice) maxPrice = p.price_eur;
        }
      }
    });

    const rating_options = [3, 4, 5];
    const shipping_day_options = [3, 5, 7];

    const sort_options = [
      { value: 'price_eur', label: 'Price', default_direction: 'asc' },
      { value: 'rating', label: 'Rating', default_direction: 'desc' },
      { value: 'name', label: 'Name', default_direction: 'asc' }
    ];

    return {
      models,
      part_categories: Array.from(part_categoriesSet),
      merchandise_categories: Array.from(merch_categoriesSet),
      rating_options,
      shipping_day_options,
      price_range: {
        min_price_eur: minPrice,
        max_price_eur: maxPrice
      },
      sort_options
    };
  }

  searchProducts(
    section,
    query,
    compatibleModelId,
    partCategory,
    merchandiseCategory,
    minPriceEur,
    maxPriceEur,
    minRating,
    maxEstimatedShippingDays,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const isParts = section === 'parts';
    const isMerch = section === 'merchandise';
    const products = this._getFromStorage('products');
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');

    const q = (query || '').toLowerCase();

    let filtered = products.filter((p) => {
      if (isParts && p.product_type !== 'part') return false;
      if (isMerch && p.product_type !== 'merchandise') return false;
      if (!p.is_active) return false;

      if (q) {
        const inText =
          (p.name || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q);
        if (!inText) return false;
      }

      if (compatibleModelId && Array.isArray(p.compatible_model_ids)) {
        if (!p.compatible_model_ids.includes(compatibleModelId)) return false;
      }

      if (isParts && partCategory && p.part_category !== partCategory) return false;
      if (isMerch && merchandiseCategory && p.merchandise_category !== merchandiseCategory)
        return false;

      if (
        typeof minPriceEur === 'number' &&
        typeof p.price_eur === 'number' &&
        p.price_eur < minPriceEur
      )
        return false;
      if (
        typeof maxPriceEur === 'number' &&
        typeof p.price_eur === 'number' &&
        p.price_eur > maxPriceEur
      )
        return false;

      if (typeof minRating === 'number' && typeof p.rating === 'number' && p.rating < minRating)
        return false;

      if (
        typeof maxEstimatedShippingDays === 'number' &&
        typeof p.estimated_shipping_days === 'number' &&
        p.estimated_shipping_days > maxEstimatedShippingDays
      )
        return false;

      return true;
    });

    const sortField = sortBy && sortBy !== 'relevance' ? sortBy : 'name';
    const direction = (sortDirection || (sortField === 'price_eur' ? 'asc' : 'asc')).toLowerCase();

    filtered.sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      if (sortField === 'price_eur' || sortField === 'rating') {
        av = typeof av === 'number' ? av : 0;
        bv = typeof bv === 'number' ? bv : 0;
      } else if (sortField === 'name') {
        av = (av || '').toLowerCase();
        bv = (bv || '').toLowerCase();
      }
      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    const total_results = filtered.length;
    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const pageItems = filtered.slice(start, end);

    const results = pageItems.map((product) => {
      const in_cart = cartItems.some(
        (ci) => ci.cart_id === cart.id && ci.product_id === product.id
      );
      const in_wishlist = wishlistItems.some(
        (wi) => wi.wishlist_id === wishlist.id && wi.product_id === product.id
      );
      return {
        product: this._clone(product),
        in_cart,
        in_wishlist
      };
    });

    return {
      results,
      pagination: {
        page: p,
        page_size: ps,
        total_results,
        total_pages: ps > 0 ? Math.ceil(total_results / ps) : 0
      }
    };
  }

  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');

    const product = products.find((p) => p.id === productId) || null;

    const in_cart = cartItems.some(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId
    );
    const in_wishlist = wishlistItems.some(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId
    );

    // Related products: same part_category or merchandise_category
    let related_products = [];
    if (product) {
      related_products = products
        .filter((p) => {
          if (p.id === product.id) return false;
          if (p.product_type !== product.product_type) return false;
          if (
            product.product_type === 'part' &&
            p.part_category &&
            product.part_category &&
            p.part_category === product.part_category
          )
            return true;
          if (
            product.product_type === 'merchandise' &&
            p.merchandise_category &&
            product.merchandise_category &&
            p.merchandise_category === product.merchandise_category
          )
            return true;
          return false;
        })
        .slice(0, 10)
        .map((p) => this._clone(p));
    }

    return {
      product: this._clone(product),
      in_cart,
      in_wishlist,
      related_products
    };
  }

  // -----------------------------
  // 7. Cart operations
  // -----------------------------

  addProductToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId
    );

    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price_eur: product && typeof product.price_eur === 'number' ? product.price_eur : 0,
        added_at: new Date().toISOString()
      };
      cartItems.push(item);
    }

    // Update cart updated_at
    const carts = this._getFromStorage('carts');
    const storedCart = carts.find((c) => c.id === cart.id);
    if (storedCart) {
      storedCart.updated_at = new Date().toISOString();
      this._saveToStorage('carts', carts);
    }

    this._saveToStorage('cart_items', cartItems);

    const totals = this._calculateCartTotals(cart.id);

    return {
      cart: this._clone(cart),
      items: totals.items,
      subtotal_eur: totals.subtotal_eur,
      message: 'Product added to cart'
    };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart.id);
    return {
      cart: this._clone(cart),
      items: totals.items,
      subtotal_eur: totals.subtotal_eur
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      // Nothing to update, just return current cart state
      const cart = this._getOrCreateCart();
      const totals = this._calculateCartTotals(cart.id);
      return {
        cart: this._clone(cart),
        items: totals.items,
        subtotal_eur: totals.subtotal_eur
      };
    }

    const item = cartItems[itemIndex];
    const cartId = item.cart_id;

    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      item.quantity = quantity;
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
    if (cart) {
      cart.updated_at = new Date().toISOString();
      this._saveToStorage('carts', carts);
    }

    const totals = this._calculateCartTotals(cart.id);

    return {
      cart: this._clone(cart),
      items: totals.items,
      subtotal_eur: totals.subtotal_eur
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId);
    const cartId = item ? item.cart_id : this._getActiveCartId();

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
    if (cart) {
      cart.updated_at = new Date().toISOString();
      this._saveToStorage('carts', carts);
    }

    const totals = this._calculateCartTotals(cart.id);

    return {
      cart: this._clone(cart),
      items: totals.items,
      subtotal_eur: totals.subtotal_eur
    };
  }

  // -----------------------------
  // 8. Wishlist operations
  // -----------------------------

  addProductToWishlist(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');

    let item = wishlistItems.find(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId
    );

    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        product_id: productId,
        quantity: qty,
        added_at: new Date().toISOString()
      };
      wishlistItems.push(item);
    }

    wishlist.updated_at = new Date().toISOString();

    // Persist wishlist and items
    const wishlists = this._getFromStorage('wishlists');
    if (!wishlists.find((w) => w.id === wishlist.id)) {
      wishlists.push(wishlist);
    } else {
      const idx = wishlists.findIndex((w) => w.id === wishlist.id);
      wishlists[idx] = wishlist;
    }
    this._saveToStorage('wishlists', wishlists);
    this._saveToStorage('wishlist_items', wishlistItems);

    const products = this._getFromStorage('products');
    const itemsForWishlist = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);
    let subtotal = 0;
    const detailedItems = itemsForWishlist.map((wi) => {
      const product = products.find((p) => p.id === wi.product_id) || null;
      const price = product && typeof product.price_eur === 'number' ? product.price_eur : 0;
      const lineTotal = price * wi.quantity;
      subtotal += lineTotal;
      return {
        wishlist_item: this._clone(wi),
        product: this._clone(product),
        line_total_eur: lineTotal
      };
    });

    return {
      wishlist: this._clone(wishlist),
      items: detailedItems,
      subtotal_eur: subtotal,
      message: 'Product added to wishlist'
    };
  }

  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const products = this._getFromStorage('products');

    const itemsForWishlist = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);
    let subtotal = 0;
    const detailedItems = itemsForWishlist.map((wi) => {
      const product = products.find((p) => p.id === wi.product_id) || null;
      const price = product && typeof product.price_eur === 'number' ? product.price_eur : 0;
      const lineTotal = price * wi.quantity;
      subtotal += lineTotal;
      return {
        wishlist_item: this._clone(wi),
        product: this._clone(product),
        line_total_eur: lineTotal
      };
    });

    return {
      wishlist: this._clone(wishlist),
      items: detailedItems,
      subtotal_eur: subtotal
    };
  }

  removeProductFromWishlist(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');

    wishlistItems = wishlistItems.filter((wi) => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    const products = this._getFromStorage('products');
    const itemsForWishlist = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);
    let subtotal = 0;
    const detailedItems = itemsForWishlist.map((wi) => {
      const product = products.find((p) => p.id === wi.product_id) || null;
      const price = product && typeof product.price_eur === 'number' ? product.price_eur : 0;
      const lineTotal = price * wi.quantity;
      subtotal += lineTotal;
      return {
        wishlist_item: this._clone(wi),
        product: this._clone(product),
        line_total_eur: lineTotal
      };
    });

    return {
      wishlist: this._clone(wishlist),
      items: detailedItems,
      subtotal_eur: subtotal
    };
  }

  moveWishlistItemToCart(wishlistItemId, quantity) {
    const wishlist = this._getOrCreateWishlist();
    const cart = this._getOrCreateCart();

    let wishlistItems = this._getFromStorage('wishlist_items');
    const wi = wishlistItems.find((x) => x.id === wishlistItemId);
    if (!wi) {
      const cartTotals = this._calculateCartTotals(cart.id);
      const products = this._getFromStorage('products');
      const itemsForWishlist = wishlistItems.filter((x) => x.wishlist_id === wishlist.id);
      let wishlistSubtotal = 0;
      const wishlistDetailed = itemsForWishlist.map((x) => {
        const product = products.find((p) => p.id === x.product_id) || null;
        const price = product && typeof product.price_eur === 'number' ? product.price_eur : 0;
        const lineTotal = price * x.quantity;
        wishlistSubtotal += lineTotal;
        return {
          wishlist_item: this._clone(x),
          product: this._clone(product),
          line_total_eur: lineTotal
        };
      });

      return {
        cart: this._clone(cart),
        cart_items: cartTotals.items,
        cart_subtotal_eur: cartTotals.subtotal_eur,
        wishlist: this._clone(wishlist),
        wishlist_items: wishlistDetailed,
        wishlist_subtotal_eur: wishlistSubtotal
      };
    }

    const qtyToMove =
      typeof quantity === 'number' && quantity > 0 ? Math.min(quantity, wi.quantity) : wi.quantity;

    // Add to cart
    this.addProductToCart(wi.product_id, qtyToMove);

    // Update wishlist quantity or remove
    if (qtyToMove >= wi.quantity) {
      wishlistItems = wishlistItems.filter((x) => x.id !== wishlistItemId);
    } else {
      wi.quantity -= qtyToMove;
    }

    this._saveToStorage('wishlist_items', wishlistItems);

    // Build return payloads
    const cartTotals = this._calculateCartTotals(cart.id);
    const products = this._getFromStorage('products');
    const itemsForWishlist = wishlistItems.filter((x) => x.wishlist_id === wishlist.id);
    let wishlistSubtotal = 0;
    const wishlistDetailed = itemsForWishlist.map((x) => {
      const product = products.find((p) => p.id === x.product_id) || null;
      const price = product && typeof product.price_eur === 'number' ? product.price_eur : 0;
      const lineTotal = price * x.quantity;
      wishlistSubtotal += lineTotal;
      return {
        wishlist_item: this._clone(x),
        product: this._clone(product),
        line_total_eur: lineTotal
      };
    });

    return {
      cart: this._clone(cart),
      cart_items: cartTotals.items,
      cart_subtotal_eur: cartTotals.subtotal_eur,
      wishlist: this._clone(wishlist),
      wishlist_items: wishlistDetailed,
      wishlist_subtotal_eur: wishlistSubtotal
    };
  }

  // -----------------------------
  // 9. Guides & reading list
  // -----------------------------

  getGuideFilterOptions() {
    const carModels = this._getFromStorage('car_models');
    const guides = this._getFromStorage('guides');

    const tagsSet = new Set();
    let minYear = null;
    let maxYear = null;

    guides.forEach((g) => {
      if (Array.isArray(g.tags)) {
        g.tags.forEach((t) => tagsSet.add(t));
      }
      if (typeof g.min_year === 'number') {
        if (minYear == null || g.min_year < minYear) minYear = g.min_year;
      }
      if (typeof g.max_year === 'number') {
        if (maxYear == null || g.max_year > maxYear) maxYear = g.max_year;
      }
    });

    const difficulties = ['beginner', 'intermediate', 'advanced'];

    return {
      models: carModels.map((m) => this._clone(m)),
      difficulties,
      tags: Array.from(tagsSet),
      year_range: {
        min_year: minYear,
        max_year: maxYear
      }
    };
  }

  searchGuides(
    modelId,
    minYear,
    maxYear,
    tags,
    difficulty,
    query,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const guides = this._getFromStorage('guides');

    const tagList = Array.isArray(tags) ? tags.filter(Boolean) : [];
    const q = (query || '').toLowerCase();

    let filtered = guides.filter((g) => {
      if (modelId && g.model_id && g.model_id !== modelId) return false;

      if (typeof minYear === 'number' && typeof g.max_year === 'number' && g.max_year < minYear)
        return false;
      if (typeof maxYear === 'number' && typeof g.min_year === 'number' && g.min_year > maxYear)
        return false;

      if (difficulty && g.difficulty && g.difficulty !== difficulty) return false;

      if (tagList.length > 0) {
        const guideTags = Array.isArray(g.tags) ? g.tags : [];
        const hasAll = tagList.every((t) => guideTags.includes(t));
        if (!hasAll) return false;
      }

      if (q) {
        const inText =
          (g.title || '').toLowerCase().includes(q) ||
          (g.summary || '').toLowerCase().includes(q) ||
          (g.content || '').toLowerCase().includes(q);
        if (!inText) return false;
      }

      return true;
    });

    const field = sortBy || 'created_at';
    const dir = (sortDirection || 'desc').toLowerCase();

    filtered.sort((a, b) => {
      let av = a[field];
      let bv = b[field];
      if (field === 'created_at') {
        av = av || '';
        bv = bv || '';
      } else if (field === 'title') {
        av = (av || '').toLowerCase();
        bv = (bv || '').toLowerCase();
      }
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    const total_results = filtered.length;
    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    const results = filtered.slice(start, end).map((g) => this._clone(g));

    return {
      results,
      pagination: {
        page: p,
        page_size: ps,
        total_results,
        total_pages: ps > 0 ? Math.ceil(total_results / ps) : 0
      }
    };
  }

  getGuideDetail(guideId) {
    const guides = this._getFromStorage('guides');
    const readingListItems = this._getOrCreateReadingList();

    const guide = guides.find((g) => g.id === guideId) || null;
    const in_reading_list = readingListItems.some((r) => r.guide_id === guideId);

    let related_guides = [];
    if (guide) {
      related_guides = guides
        .filter((g) => {
          if (g.id === guide.id) return false;
          if (g.model_id && guide.model_id && g.model_id === guide.model_id) return true;
          const tagsA = Array.isArray(g.tags) ? g.tags : [];
          const tagsB = Array.isArray(guide.tags) ? guide.tags : [];
          return tagsA.some((t) => tagsB.includes(t));
        })
        .slice(0, 10)
        .map((g) => this._clone(g));
    }

    return {
      guide: this._clone(guide),
      in_reading_list,
      related_guides
    };
  }

  addGuideToReadingList(guideId) {
    const readingListItems = this._getOrCreateReadingList();
    let items = this._getFromStorage('reading_list_items');
    let existing = items.find((r) => r.guide_id === guideId);

    if (!existing) {
      existing = {
        id: this._generateId('reading_list_item'),
        guide_id: guideId,
        added_at: new Date().toISOString()
      };
      items.push(existing);
      this._saveToStorage('reading_list_items', items);
    }

    return {
      reading_list_item: this._clone(existing),
      message: 'Guide added to reading list'
    };
  }

  removeGuideFromReadingList(guideId) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter((r) => r.guide_id !== guideId);
    this._saveToStorage('reading_list_items', items);
    const success = items.length !== before;
    return {
      success,
      message: success ? 'Guide removed from reading list' : 'Guide not in reading list'
    };
  }

  getReadingList() {
    const items = this._getFromStorage('reading_list_items');
    const guides = this._getFromStorage('guides');

    const sortedItems = items.slice().sort((a, b) => (b.added_at || '').localeCompare(a.added_at || ''));

    const list = [];
    sortedItems.forEach((r) => {
      const guide = guides.find((g) => g.id === r.guide_id);
      if (guide) list.push(this._clone(guide));
    });

    return list;
  }

  // -----------------------------
  // 10. Events & RSVP
  // -----------------------------

  getEventFilterOptions() {
    const events = this._getFromStorage('events');
    const tagSet = new Set();
    events.forEach((e) => {
      if (Array.isArray(e.tags)) {
        e.tags.forEach((t) => tagSet.add(t));
      }
    });

    const radius_options_km = [25, 50, 100, 200];
    const tag_options = Array.from(tagSet);
    const date_presets = [
      { value: 'next_7_days', label: 'Next 7 days' },
      { value: 'next_30_days', label: 'Next 30 days' },
      { value: 'next_60_days', label: 'Next 60 days' }
    ];

    return {
      radius_options_km,
      tag_options,
      date_presets
    };
  }

  searchEvents(
    locationCity,
    locationCountry,
    radiusKm,
    startDate,
    endDate,
    tags,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const events = this._getFromStorage('events');
    const tagList = Array.isArray(tags) ? tags.filter(Boolean) : [];

    const userLocation = {
      city: locationCity || null,
      country: locationCountry || null
    };

    let filtered = events.filter((e) => {
      if (locationCountry) {
        if (
          !e.location_country ||
          e.location_country.toLowerCase() !== locationCountry.toLowerCase()
        ) {
          return false;
        }
      }

      if (locationCity && typeof radiusKm !== 'number') {
        if (!e.location_city || e.location_city.toLowerCase() !== locationCity.toLowerCase()) {
          return false;
        }
      }

      if (locationCity && typeof radiusKm === 'number') {
        const distance = this._calculateEventDistanceKm(userLocation, e);
        if (distance > radiusKm) return false;
      }

      if (startDate) {
        const eventDate = (e.start_datetime || '').slice(0, 10);
        if (eventDate && eventDate < startDate) return false;
      }

      if (endDate) {
        const eventDate = (e.start_datetime || '').slice(0, 10);
        if (eventDate && eventDate > endDate) return false;
      }

      if (tagList.length > 0) {
        const eventTags = Array.isArray(e.tags) ? e.tags : [];
        const hasAll = tagList.every((t) => eventTags.includes(t));
        if (!hasAll) return false;
      }

      return true;
    });

    const field = sortBy || 'start_datetime';
    const dir = (sortDirection || 'asc').toLowerCase();

    filtered.sort((a, b) => {
      let av = a[field] || '';
      let bv = b[field] || '';
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    const total_results = filtered.length;
    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    const results = filtered.slice(start, end).map((e) => this._clone(e));

    return {
      results,
      pagination: {
        page: p,
        page_size: ps,
        total_results,
        total_pages: ps > 0 ? Math.ceil(total_results / ps) : 0
      }
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const registrations = this._getFromStorage('event_registrations');
    const carModels = this._getFromStorage('car_models');

    const event = events.find((e) => e.id === eventId) || null;

    let user_registration = registrations.find((r) => r.event_id === eventId) || null;
    if (user_registration && user_registration.car_model_id) {
      const model = carModels.find((m) => m.id === user_registration.car_model_id) || null;
      // Attach resolved car model for display
      user_registration = {
        ...user_registration,
        car_model: this._clone(model)
      };
    }

    return {
      event: this._clone(event),
      user_registration
    };
  }

  rsvpToEvent(eventId, attendeeCount, guestCount, carModelId, carModelName, status) {
    const registrations = this._getFromStorage('event_registrations');
    const carModels = this._getFromStorage('car_models');

    const totalAttendees = typeof attendeeCount === 'number' && attendeeCount > 0 ? attendeeCount : 1;
    let guests =
      typeof guestCount === 'number' && guestCount >= 0 ? guestCount : Math.max(totalAttendees - 1, 0);

    let registration = registrations.find((r) => r.event_id === eventId);
    const now = new Date().toISOString();

    if (!registration) {
      registration = {
        id: this._generateId('event_registration'),
        event_id: eventId,
        attendee_count: totalAttendees,
        guest_count: guests,
        car_model_id: carModelId || null,
        car_model_name: carModelName || null,
        status: status || 'going',
        created_at: now
      };
      registrations.push(registration);
    } else {
      registration.attendee_count = totalAttendees;
      registration.guest_count = guests;
      registration.car_model_id = carModelId || registration.car_model_id || null;
      registration.car_model_name = carModelName || registration.car_model_name || null;
      registration.status = status || registration.status || 'going';
    }

    this._saveToStorage('event_registrations', registrations);

    let model = null;
    if (registration.car_model_id) {
      model = carModels.find((m) => m.id === registration.car_model_id) || null;
    }

    const registrationWithModel = {
      ...registration,
      car_model: this._clone(model)
    };

    return {
      registration: registrationWithModel,
      message: 'RSVP updated'
    };
  }

  // -----------------------------
  // 11. Forum operations
  // -----------------------------

  getForumCategories() {
    const categories = this._getFromStorage('forum_categories');
    return categories.map((c) => this._clone(c));
  }

  searchForumThreads(query, categoryId, sortBy, sortDirection, page, pageSize) {
    const threads = this._getFromStorage('forum_threads');
    const q = (query || '').toLowerCase();

    let filtered = threads.filter((t) => {
      if (categoryId && t.category_id && t.category_id !== categoryId) return false;
      if (q) {
        if (!(t.title || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const field = sortBy || 'latest_activity';
    const dir = (sortDirection || 'desc').toLowerCase();

    filtered.sort((a, b) => {
      let av;
      let bv;
      if (field === 'most_replies') {
        av = a.reply_count || 0;
        bv = b.reply_count || 0;
      } else {
        // latest_activity => use updated_at
        av = a.updated_at || '';
        bv = b.updated_at || '';
      }
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    const total_results = filtered.length;
    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    const results = filtered.slice(start, end).map((t) => this._clone(t));

    return {
      results,
      pagination: {
        page: p,
        page_size: ps,
        total_results,
        total_pages: ps > 0 ? Math.ceil(total_results / ps) : 0
      }
    };
  }

  getForumThread(threadId, page, pageSize) {
    const threads = this._getFromStorage('forum_threads');
    const posts = this._getFromStorage('forum_posts');
    const subscriptions = this._getFromStorage('thread_subscriptions');

    const thread = threads.find((t) => t.id === threadId) || null;

    const allPosts = posts
      .filter((p) => p.thread_id === threadId)
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;
    const start = (p - 1) * ps;
    const end = start + ps;

    const pagePosts = allPosts.slice(start, end).map((p) => this._clone(p));

    const subscription = subscriptions.find((s) => s.thread_id === threadId) || null;

    return {
      thread: this._clone(thread),
      posts: pagePosts,
      subscription: subscription ? this._clone(subscription) : null
    };
  }

  postForumReply(threadId, content) {
    const threads = this._getFromStorage('forum_threads');
    const posts = this._getFromStorage('forum_posts');

    const thread = threads.find((t) => t.id === threadId) || null;
    const now = new Date().toISOString();

    const post = {
      id: this._generateId('forum_post'),
      thread_id: threadId,
      content: content,
      created_at: now,
      is_original_post: false
    };

    posts.push(post);
    this._saveToStorage('forum_posts', posts);

    if (thread) {
      thread.reply_count = (thread.reply_count || 0) + 1;
      thread.updated_at = now;
      this._saveToStorage('forum_threads', threads);
    }

    return {
      post: this._clone(post),
      thread: this._clone(thread)
    };
  }

  setThreadSubscription(threadId, subscribed) {
    const subscriptions = this._getFromStorage('thread_subscriptions');
    let sub = subscriptions.find((s) => s.thread_id === threadId);
    const now = new Date().toISOString();

    if (!sub) {
      sub = {
        id: this._generateId('thread_subscription'),
        thread_id: threadId,
        subscribed: !!subscribed,
        created_at: now
      };
      subscriptions.push(sub);
    } else {
      sub.subscribed = !!subscribed;
    }

    this._saveToStorage('thread_subscriptions', subscriptions);

    return {
      subscription: this._clone(sub),
      message: subscribed ? 'Subscribed to thread' : 'Unsubscribed from thread'
    };
  }

  // -----------------------------
  // 12. VIN decode & garage
  // -----------------------------

  decodeVin(vin) {
    const result = this._decodeSimcaVin(vin);
    return {
      decode_result: this._clone(result.decode_result),
      matched_model: this._clone(result.matched_model)
    };
  }

  saveDecodedVinToGarage(vinDecodeResultId, nickname, status, color) {
    const vinResults = this._getFromStorage('vin_decode_results');
    const decodeResult = vinResults.find((r) => r.id === vinDecodeResultId) || null;
    if (!decodeResult) {
      return {
        garage_car: null,
        message: 'VIN decode result not found'
      };
    }

    const now = new Date().toISOString();

    const garageCar = {
      id: this._generateId('garage_car'),
      vin: decodeResult.vin,
      model_id: decodeResult.decoded_model_id || null,
      model_name: decodeResult.decoded_model_name || null,
      model_year: decodeResult.model_year || null,
      nickname: nickname,
      status: status || 'project',
      color: color || null,
      source: 'vin_decoder',
      created_at: now
    };

    const garageCars = this._getFromStorage('garage_cars');
    garageCars.push(garageCar);
    this._saveToStorage('garage_cars', garageCars);

    return {
      garage_car: this._clone(garageCar),
      message: 'Car saved to garage'
    };
  }

  getGarageCars() {
    const cars = this._getFromStorage('garage_cars');
    const carModels = this._getFromStorage('car_models');

    return cars.map((c) => {
      const model = c.model_id
        ? carModels.find((m) => m.id === c.model_id) || null
        : null;
      return {
        ...this._clone(c),
        model: this._clone(model)
      };
    });
  }

  updateGarageCar(garageCarId, nickname, status, color) {
    const cars = this._getFromStorage('garage_cars');
    const car = cars.find((c) => c.id === garageCarId) || null;
    if (!car) {
      return { garage_car: null };
    }
    if (nickname != null) car.nickname = nickname;
    if (status != null) car.status = status;
    if (color != null) car.color = color;

    this._saveToStorage('garage_cars', cars);
    return { garage_car: this._clone(car) };
  }

  removeGarageCar(garageCarId) {
    let cars = this._getFromStorage('garage_cars');
    const before = cars.length;
    cars = cars.filter((c) => c.id !== garageCarId);
    this._saveToStorage('garage_cars', cars);
    const success = cars.length !== before;
    return {
      success,
      message: success ? 'Car removed from garage' : 'Car not found in garage'
    };
  }

  // -----------------------------
  // 13. About content
  // -----------------------------

  getAboutContent() {
    return {
      mission:
        'Our mission is to preserve and celebrate classic Simca automobiles by connecting enthusiasts, parts, knowledge, and events in one dedicated community hub.',
      contact_instructions:
        'For questions, corrections, or collaboration proposals, please use the contact form on our website or email the club committee at the published address.',
      legal_disclaimer:
        'All listings, guides, and posts are provided by community members. Always verify vehicle condition and parts compatibility independently. The site owners are not responsible for transactions between users.'
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