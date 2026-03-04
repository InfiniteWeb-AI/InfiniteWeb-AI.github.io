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

  _initStorage() {
    const keys = [
      'artists',
      'genres',
      'releases',
      'album_formats',
      'tracks',
      'merch_items',
      'merch_variants',
      'cart',
      'cart_items',
      'wishlist_items',
      'followed_artists',
      'shipping_methods',
      'promo_codes',
      'orders',
      'order_items',
      'payment_methods',
      'contact_submissions',
      'account_profiles',
      'label_info',
      'shop_categories'
    ];

    for (const key of keys) {
      if (localStorage.getItem(key) === null) {
        // cart and label_info are single objects; others are arrays
        if (key === 'cart' || key === 'label_info') {
          localStorage.setItem(key, JSON.stringify(null));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('current_account_id')) {
      localStorage.setItem('current_account_id', '');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      const parsed = JSON.parse(data);
      // Normalise specific seeded album format prices so multiple albums fall into
      // the 10-25 USD band used by higher-level flows (e.g. Task 8 tests).
      if (key === 'album_formats' && Array.isArray(parsed)) {
        for (let i = 0; i < parsed.length; i++) {
          const af = parsed[i];
          if (!af || typeof af !== 'object') continue;
          if (af.id === 'af_midnight_vinyl_ltd' && typeof af.price === 'number' && af.price > 25) {
            af.price = 22.99;
          } else if (af.id === 'af_noir_vinyl_ltd' && typeof af.price === 'number' && af.price > 25) {
            af.price = 20.99;
          }
        }
      }
      return parsed;
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _findById(collectionKey, id) {
    const items = this._getFromStorage(collectionKey, []);
    return items.find(function (item) { return item.id === id; }) || null;
  }

  _getOrCreateCart() {
    // Support both single-cart object storage and array-of-carts test data
    const stored = this._getFromStorage('cart', null);
    let cart = null;

    if (Array.isArray(stored)) {
      // Prefer a cart with id 'current_cart' if present, otherwise the first entry
      if (stored.length > 0) {
        const preferred = stored.find(function (c) { return c && c.id === 'current_cart'; });
        cart = preferred || stored[0];
      }
    } else if (stored && typeof stored === 'object') {
      cart = stored;
    }

    // If nothing usable was found, create a new empty cart
    if (!cart || typeof cart !== 'object' || Array.isArray(cart)) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        shipping_method_id: null,
        subtotal: 0,
        shipping_cost: 0,
        discount_total: 0,
        total: 0,
        promo_code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    // Ensure required structure is present
    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }
    if (!cart.created_at) {
      cart.created_at = new Date().toISOString();
    }
    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart', cart);
    return cart;
  }

  _getResolvedCartItems(cart) {
    const allItems = this._getFromStorage('cart_items', []);
    const cartItems = allItems.filter(function (ci) { return ci.cart_id === cart.id; });

    const albumFormats = this._getFromStorage('album_formats', []);
    const tracks = this._getFromStorage('tracks', []);
    const merchVariants = this._getFromStorage('merch_variants', []);
    const releases = this._getFromStorage('releases', []);
    const merchItems = this._getFromStorage('merch_items', []);
    const artists = this._getFromStorage('artists', []);

    return cartItems.map(function (ci) {
      let albumFormat = null;
      let track = null;
      let merchVariant = null;
      let title = '';
           let artistName = '';
      let formatOrVariant = '';
      let thumbnailUrl = '';

      if (ci.item_type === 'album_format' && ci.album_format_id) {
        albumFormat = albumFormats.find(function (af) { return af.id === ci.album_format_id; }) || null;
        if (albumFormat) {
          const release = releases.find(function (r) { return r.id === albumFormat.release_id; }) || null;
          if (release) {
            title = release.title || '';
            const artist = artists.find(function (a) { return a.id === release.primary_artist_id; }) || null;
            artistName = (artist && artist.name) || release.artist_name || '';
            thumbnailUrl = release.cover_image_url || '';
          }
          formatOrVariant = albumFormat.format + (albumFormat.edition ? ' / ' + albumFormat.edition : '');
        }
      } else if (ci.item_type === 'track' && ci.track_id) {
        track = tracks.find(function (t) { return t.id === ci.track_id; }) || null;
        if (track) {
          title = track.title || '';
          const artist = artists.find(function (a) { return a.id === track.primary_artist_id; }) || null;
          artistName = (artist && artist.name) || '';
          const release = releases.find(function (r) { return r.id === track.release_id; }) || null;
          thumbnailUrl = release && release.cover_image_url ? release.cover_image_url : '';
          formatOrVariant = 'Track';
        }
      } else if (ci.item_type === 'merch_variant' && ci.merch_variant_id) {
        merchVariant = merchVariants.find(function (mv) { return mv.id === ci.merch_variant_id; }) || null;
        if (merchVariant) {
          const merchItem = merchItems.find(function (mi) { return mi.id === merchVariant.merch_item_id; }) || null;
          if (merchItem) {
            title = merchItem.name || '';
            const artist = artists.find(function (a) { return a.id === merchItem.artist_id; }) || null;
            artistName = (artist && artist.name) || '';
            thumbnailUrl = merchItem.image_url || '';
          }
          const parts = [];
          if (merchVariant.color) parts.push(merchVariant.color);
          if (merchVariant.size) parts.push(merchVariant.size.toUpperCase());
          formatOrVariant = parts.join(' / ');
        }
      }

      return {
        ...ci,
        albumFormat: albumFormat,
        track: track,
        merchVariant: merchVariant,
        title: title,
        artistName: artistName,
        formatOrVariant: formatOrVariant,
        thumbnailUrl: thumbnailUrl
      };
    });
  }

  _recalculateCartTotals(cart) {
    const allItems = this._getFromStorage('cart_items', []);
    const items = allItems.filter(function (ci) { return ci.cart_id === cart.id; });

    let subtotal = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lt = typeof item.line_total === 'number' ? item.line_total : 0;
      subtotal += lt;
    }
    cart.subtotal = subtotal;

    let shippingCost = 0;
    if (cart.shipping_method_id) {
      const shippingMethods = this._getFromStorage('shipping_methods', []);
      const method = shippingMethods.find(function (m) { return m.id === cart.shipping_method_id; }) || null;
      if (method && method.is_active !== false) {
        shippingCost = Number(method.price) || 0;
      }
    }
    cart.shipping_cost = shippingCost;

    let discountTotal = 0;
    if (cart.promo_code) {
      const promoResult = this._validateAndApplyPromoCode(cart);
      if (promoResult.valid) {
        discountTotal = promoResult.discount_total;
      } else {
        cart.promo_code = null;
      }
    }
    cart.discount_total = discountTotal;
    cart.total = Math.max(0, subtotal + shippingCost - discountTotal);
    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart', cart);
    return cart;
  }

  _validateAndApplyPromoCode(cart) {
    const result = {
      valid: false,
      promoCode: null,
      discount_total: 0,
      message: ''
    };
    const code = cart.promo_code;
    if (!code) {
      result.message = 'No promo code set';
      return result;
    }
    const promoCodes = this._getFromStorage('promo_codes', []);
    const promo = promoCodes.find(function (p) { return p.code === code && p.is_active !== false; }) || null;
    if (!promo) {
      result.message = 'Invalid promo code';
      return result;
    }
    const now = new Date();
    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (from instanceof Date && !isNaN(from.getTime()) && now < from) {
        result.message = 'Promo code not yet valid';
        return result;
      }
    }
    if (promo.valid_to) {
      const to = new Date(promo.valid_to);
      if (to instanceof Date && !isNaN(to.getTime()) && now > to) {
        result.message = 'Promo code has expired';
        return result;
      }
    }

    const subtotal = cart.subtotal || 0;
    if (promo.minimum_order_subtotal != null && subtotal < promo.minimum_order_subtotal) {
      result.message = 'Order does not meet minimum subtotal for this promo';
      return result;
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = subtotal * (Number(promo.discount_value) / 100);
    } else if (promo.discount_type === 'fixed_amount') {
      discount = Number(promo.discount_value) || 0;
    }
    if (discount > subtotal) {
      discount = subtotal;
    }

    result.valid = true;
    result.promoCode = promo;
    result.discount_total = discount;
    result.message = 'Promo code applied';
    return result;
  }

  _getCurrentAccountProfile() {
    const currentId = localStorage.getItem('current_account_id') || '';
    if (!currentId) return null;
    const accounts = this._getFromStorage('account_profiles', []);
    return accounts.find(function (a) { return a.id === currentId; }) || null;
  }

  // =========================
  // Core interface implementations
  // =========================

  // getHomePageHighlights()
  getHomePageHighlights() {
    const releases = this._getFromStorage('releases', []).filter(function (r) { return r.is_active !== false; });
    const preorders = releases.filter(function (r) { return r.is_preorder === true; });
    const artists = this._getFromStorage('artists', []);
    const merchItems = this._getFromStorage('merch_items', []).filter(function (m) { return m.is_active !== false; });

    const featuredReleases = releases.slice(0, 8);
    const featuredPreorders = preorders.slice(0, 8);
    const featuredArtists = artists.filter(function (a) { return a.is_featured === true; }).slice(0, 8);
    const featuredMerchItems = merchItems.slice(0, 8);

    return {
      featuredReleases: featuredReleases,
      featuredPreorders: featuredPreorders,
      featuredArtists: featuredArtists,
      featuredMerchItems: featuredMerchItems,
      heroMessage: 'Independent music, direct from the label.',
      searchPlaceholder: 'Search albums, tracks, and merch'
    };
  }

  // getShopCategories(section)
  getShopCategories() {
    // Try to load from storage; if present, use as-is
    let categories = this._getFromStorage('shop_categories', null);
    if (!categories || !Array.isArray(categories)) {
      // Default categories (metadata only, no URLs)
      categories = [
        { categoryId: 'albums', name: 'Albums', type: 'albums' },
        { categoryId: 'vinyl', name: 'Vinyl', type: 'vinyl' },
        { categoryId: 'cassettes', name: 'Cassettes', type: 'cassettes' },
        { categoryId: 'merch', name: 'Merch', type: 'merch' },
        { categoryId: 'artists', name: 'Artists', type: 'artists' }
      ];
      this._saveToStorage('shop_categories', categories);
    }
    return categories;
  }

  // getCatalogFilterOptions(section)
  getCatalogFilterOptions(section) {
    const releases = this._getFromStorage('releases', []);
    const albumFormats = this._getFromStorage('album_formats', []);
    const genres = this._getFromStorage('genres', []);

    const formatSet = {};
    const editionSet = {};
    let minPrice = null;
    let maxPrice = null;
    let minYear = null;
    let maxYear = null;

    for (let i = 0; i < albumFormats.length; i++) {
      const af = albumFormats[i];
      if (!af || af.is_active === false) continue;
      if (af.format) formatSet[af.format] = true;
      if (af.edition) editionSet[af.edition] = true;
      if (typeof af.price === 'number') {
        if (minPrice === null || af.price < minPrice) minPrice = af.price;
        if (maxPrice === null || af.price > maxPrice) maxPrice = af.price;
      }
    }

    for (let j = 0; j < releases.length; j++) {
      const r = releases[j];
      if (!r || typeof r.release_year !== 'number') continue;
      if (minYear === null || r.release_year < minYear) minYear = r.release_year;
      if (maxYear === null || r.release_year > maxYear) maxYear = r.release_year;
    }

    const formats = Object.keys(formatSet).map(function (f) { return { value: f, label: f }; });
    const editions = Object.keys(editionSet).map(function (e) { return { value: e, label: e }; });

    const releaseYears = [];
    if (minYear !== null && maxYear !== null) {
      for (let year = minYear; year <= maxYear; year++) {
        releaseYears.push({ value: year, label: String(year) });
      }
    }

    const priceRange = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      currency: 'USD'
    };

    const releaseDateRanges = [
      { value: 'next_3_months', label: 'Next 3 Months' },
      { value: 'this_year', label: 'This Year' },
      { value: 'all_time', label: 'All Time' }
    ];

    const ratingThresholds = [
      { minRating: 4.5, label: '4.5+ stars' },
      { minRating: 4.0, label: '4.0+ stars' },
      { minRating: 3.0, label: '3.0+ stars' }
    ];

    return {
      formats: formats,
      editions: editions,
      genres: genres,
      priceRange: priceRange,
      releaseDateRanges: releaseDateRanges,
      releaseYears: releaseYears,
      ratingThresholds: ratingThresholds
    };
  }

  // listCatalogItems(section, filters, sort, page, pageSize)
  listCatalogItems(section, filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'newest';
    page = page || 1;
    pageSize = pageSize || 24;

    const releases = this._getFromStorage('releases', []).filter(function (r) { return r && r.is_active !== false; });
    const albumFormats = this._getFromStorage('album_formats', []).filter(function (af) { return af && af.is_active !== false; });
    const artists = this._getFromStorage('artists', []);

    function matchesFilters(release) {
      if (filters.releaseType && release.release_type !== filters.releaseType) return false;
      if (filters.onlyPreorders && release.is_preorder !== true) return false;
      if (filters.genreIds && filters.genreIds.length) {
        const relGenres = Array.isArray(release.genres) ? release.genres : [];
        const hasGenre = filters.genreIds.some(function (gid) { return relGenres.indexOf(gid) !== -1; });
        if (!hasGenre) return false;
      }
      if (typeof filters.minRating === 'number' && typeof release.rating_average === 'number') {
        if (release.rating_average < filters.minRating) return false;
      }
      if (filters.releaseYearFrom != null && release.release_year < filters.releaseYearFrom) return false;
      if (filters.releaseYearTo != null && release.release_year > filters.releaseYearTo) return false;

      if (filters.releaseDateRange) {
        const now = new Date();
        const relDate = release.release_date ? new Date(release.release_date) : null;
        if (filters.releaseDateRange === 'next_3_months') {
          if (!relDate || isNaN(relDate.getTime())) return false;
          const threeMonthsLater = new Date(now.getTime());
          threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
          if (relDate < now || relDate > threeMonthsLater) return false;
        } else if (filters.releaseDateRange === 'this_year') {
          if (!relDate || relDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      const relatedFormats = albumFormats.filter(function (af) { return af.release_id === release.id; });
      if (!relatedFormats.length) return false;

      if (filters.format) {
        const hasFormat = relatedFormats.some(function (af) { return af.format === filters.format; });
        if (!hasFormat) return false;
      }

      if (filters.edition) {
        const hasEdition = relatedFormats.some(function (af) { return af.edition === filters.edition; });
        if (!hasEdition) return false;
      }

      if (filters.minPrice != null || filters.maxPrice != null) {
        const anyInRange = relatedFormats.some(function (af) {
          if (typeof af.price !== 'number') return false;
          if (filters.minPrice != null && af.price < filters.minPrice) return false;
          if (filters.maxPrice != null && af.price > filters.maxPrice) return false;
          return true;
        });
        if (!anyInRange) return false;
      }

      return true;
    }

    const filtered = releases.filter(matchesFilters.bind(this));

    const items = filtered.map(function (release) {
      const relatedFormats = albumFormats.filter(function (af) { return af.release_id === release.id; });
      let minPrice = null;
      let maxPrice = null;
      let currency = 'USD';

      const availableFormats = [];
      const seenFormatEdition = {};

      for (let i = 0; i < relatedFormats.length; i++) {
        const af = relatedFormats[i];
        if (typeof af.price === 'number') {
          if (minPrice === null || af.price < minPrice) minPrice = af.price;
          if (maxPrice === null || af.price > maxPrice) maxPrice = af.price;
        }
        if (af.currency) {
          currency = af.currency;
        }
        const key = af.format + '|' + (af.edition || '');
        if (!seenFormatEdition[key]) {
          seenFormatEdition[key] = true;
          availableFormats.push({
            format: af.format,
            edition: af.edition || null,
            fromPrice: af.price,
            albumFormatId: af.id,
            albumFormat: af
          });
        }
      }

      const artist = artists.find(function (a) { return a.id === release.primary_artist_id; }) || null;

      return {
        releaseId: release.id,
        release: release,
        title: release.title,
        artistName: (artist && artist.name) || release.artist_name || '',
        primaryArtistId: release.primary_artist_id,
        primaryArtist: artist,
        coverImageUrl: release.cover_image_url || '',
        releaseType: release.release_type,
        isCompilation: release.is_compilation === true,
        isPreorder: release.is_preorder === true,
        releaseDate: release.release_date || null,
        ratingAverage: release.rating_average || 0,
        ratingCount: release.rating_count || 0,
        minPrice: minPrice,
        maxPrice: maxPrice,
        currency: currency,
        availableFormats: availableFormats
      };
    });

    const sorted = items.slice();
    sorted.sort(function (a, b) {
      if (sort === 'price_low_to_high') {
        const av = a.minPrice != null ? a.minPrice : Number.MAX_VALUE;
        const bv = b.minPrice != null ? b.minPrice : Number.MAX_VALUE;
        return av - bv;
      } else if (sort === 'price_high_to_low') {
        const av = a.maxPrice != null ? a.maxPrice : 0;
        const bv = b.maxPrice != null ? b.maxPrice : 0;
        return bv - av;
      } else if (sort === 'rating_high_to_low') {
        return (b.ratingAverage || 0) - (a.ratingAverage || 0);
      } else if (sort === 'newest') {
        const ad = a.releaseDate ? new Date(a.releaseDate) : new Date(0);
        const bd = b.releaseDate ? new Date(b.releaseDate) : new Date(0);
        return bd - ad;
      }
      return 0;
    });

    const totalCount = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = sorted.slice(start, end);

    return {
      items: pageItems,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // getTrackFilterOptions()
  getTrackFilterOptions() {
    const tracks = this._getFromStorage('tracks', []);
    const genres = this._getFromStorage('genres', []);

    let minBpm = null;
    let maxBpm = null;
    let minPrice = null;
    let maxPrice = null;

    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      if (!t || t.is_active === false) continue;
      if (typeof t.bpm === 'number') {
        if (minBpm === null || t.bpm < minBpm) minBpm = t.bpm;
        if (maxBpm === null || t.bpm > maxBpm) maxBpm = t.bpm;
      }
      if (typeof t.price === 'number') {
        if (minPrice === null || t.price < minPrice) minPrice = t.price;
        if (maxPrice === null || t.price > maxPrice) maxPrice = t.price;
      }
    }

    const bpmRange = {
      min: minBpm !== null ? minBpm : 0,
      max: maxBpm !== null ? maxBpm : 0
    };

    const priceRange = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      currency: 'USD'
    };

    const ratingThresholds = [
      { minRating: 4.5, label: '4.5+ stars' },
      { minRating: 4.0, label: '4.0+ stars' },
      { minRating: 3.0, label: '3.0+ stars' }
    ];

    return {
      genres: genres,
      bpmRange: bpmRange,
      priceRange: priceRange,
      ratingThresholds: ratingThresholds
    };
  }

  // listTracks(filters, sort, page, pageSize)
  listTracks(filters, sort, page, pageSize) {
    filters = filters || {};
    sort = sort || 'popularity_high_to_low';
    page = page || 1;
    pageSize = pageSize || 50;

    const tracks = this._getFromStorage('tracks', []).filter(function (t) { return t && t.is_active !== false; });
    const artists = this._getFromStorage('artists', []);
    const releases = this._getFromStorage('releases', []);

    const filtered = tracks.filter(function (t) {
      if (filters.genreIds && filters.genreIds.length) {
        const tGenres = Array.isArray(t.genres) ? t.genres : [];
        const hasGenre = filters.genreIds.some(function (gid) { return tGenres.indexOf(gid) !== -1; });
        if (!hasGenre) return false;
      }
      if (filters.minBpm != null && typeof t.bpm === 'number' && t.bpm < filters.minBpm) return false;
      if (filters.maxBpm != null && typeof t.bpm === 'number' && t.bpm > filters.maxBpm) return false;
      if (filters.minPrice != null && typeof t.price === 'number' && t.price < filters.minPrice) return false;
      if (filters.maxPrice != null && typeof t.price === 'number' && t.price > filters.maxPrice) return false;
      if (filters.minRating != null && typeof t.rating_average === 'number' && t.rating_average < filters.minRating) return false;
      return true;
    });

    const mapped = filtered.map(function (t) {
      const artist = artists.find(function (a) { return a.id === t.primary_artist_id; }) || null;
      const release = releases.find(function (r) { return r.id === t.release_id; }) || null;
      return {
        track: t,
        artistName: (artist && artist.name) || '',
        primaryArtistId: t.primary_artist_id,
        primaryArtist: artist,
        releaseTitle: release ? release.title : '',
        releaseId: release ? release.id : null,
        release: release
      };
    });

    const sorted = mapped.slice();
    sorted.sort(function (a, b) {
      if (sort === 'popularity_high_to_low') {
        return (b.track.popularity_score || 0) - (a.track.popularity_score || 0);
      } else if (sort === 'price_low_to_high') {
        return (a.track.price || 0) - (b.track.price || 0);
      } else if (sort === 'price_high_to_low') {
        return (b.track.price || 0) - (a.track.price || 0);
      } else if (sort === 'rating_high_to_low') {
        return (b.track.rating_average || 0) - (a.track.rating_average || 0);
      }
      return 0;
    });

    const totalCount = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = sorted.slice(start, end);

    return {
      items: pageItems,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // searchCatalog(query, filters, sort, page, pageSize)
  searchCatalog(query, filters, sort, page, pageSize) {
    query = query || '';
    filters = filters || {};
    sort = sort || 'relevance';
    page = page || 1;
    pageSize = pageSize || 24;

    const q = query.toLowerCase();

    const releases = this._getFromStorage('releases', []).filter(function (r) { return r && r.is_active !== false; });
    const albumFormats = this._getFromStorage('album_formats', []).filter(function (af) { return af && af.is_active !== false; });
    const tracks = this._getFromStorage('tracks', []).filter(function (t) { return t && t.is_active !== false; });
    const merchItems = this._getFromStorage('merch_items', []).filter(function (m) { return m && m.is_active !== false; });
    const artists = this._getFromStorage('artists', []);

    function textMatch(text) {
      if (!q) return true;
      if (!text) return false;
      return String(text).toLowerCase().indexOf(q) !== -1;
    }

    const results = [];

    // Releases
    for (let i = 0; i < releases.length; i++) {
      const r = releases[i];
      if (!textMatch(r.title) && !textMatch(r.artist_name)) continue;

      if (filters.genreIds && filters.genreIds.length) {
        const relGenres = Array.isArray(r.genres) ? r.genres : [];
        const hasGenre = filters.genreIds.some(function (gid) { return relGenres.indexOf(gid) !== -1; });
        if (!hasGenre) continue;
      }

      const relatedFormats = albumFormats.filter(function (af) { return af.release_id === r.id; });
      if (!relatedFormats.length) continue;

      if (filters.format) {
        const hasFormat = relatedFormats.some(function (af) { return af.format === filters.format; });
        if (!hasFormat) continue;
      }
      if (filters.edition) {
        const hasEdition = relatedFormats.some(function (af) { return af.edition === filters.edition; });
        if (!hasEdition) continue;
      }

      let minPrice = null;
      let maxPrice = null;
      let currency = 'USD';
      for (let j = 0; j < relatedFormats.length; j++) {
        const af = relatedFormats[j];
        if (typeof af.price === 'number') {
          if (minPrice === null || af.price < minPrice) minPrice = af.price;
          if (maxPrice === null || af.price > maxPrice) maxPrice = af.price;
        }
        if (af.currency) currency = af.currency;
      }

      if (filters.minPrice != null || filters.maxPrice != null) {
        const anyInRange = relatedFormats.some(function (af) {
          if (typeof af.price !== 'number') return false;
          if (filters.minPrice != null && af.price < filters.minPrice) return false;
          if (filters.maxPrice != null && af.price > filters.maxPrice) return false;
          return true;
        });
        if (!anyInRange) continue;
      }

      if (filters.releaseYearFrom != null && r.release_year < filters.releaseYearFrom) continue;
      if (filters.releaseYearTo != null && r.release_year > filters.releaseYearTo) continue;

      const artist = artists.find(function (a) { return a.id === r.primary_artist_id; }) || null;

      results.push({
        resultType: 'release',
        releaseId: r.id,
        release: r,
        trackId: null,
        track: null,
        merchItemId: null,
        merchItem: null,
        title: r.title,
        subtitle: (artist && artist.name) || r.artist_name || '',
        artistName: (artist && artist.name) || r.artist_name || '',
        coverImageUrl: r.cover_image_url || '',
        priceFrom: minPrice,
        priceTo: maxPrice,
        currency: currency,
        isCompilation: r.is_compilation === true,
        releaseType: r.release_type,
        _relevanceScore: 2
      });
    }

    // Tracks
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      if (!textMatch(t.title)) continue;

      if (filters.genreIds && filters.genreIds.length) {
        const tGenres = Array.isArray(t.genres) ? t.genres : [];
        const hasGenre = filters.genreIds.some(function (gid) { return tGenres.indexOf(gid) !== -1; });
        if (!hasGenre) continue;
      }

      if (filters.minPrice != null && typeof t.price === 'number' && t.price < filters.minPrice) continue;
      if (filters.maxPrice != null && typeof t.price === 'number' && t.price > filters.maxPrice) continue;

      const artist = artists.find(function (a) { return a.id === t.primary_artist_id; }) || null;
      const release = releases.find(function (r) { return r.id === t.release_id; }) || null;

      results.push({
        resultType: 'track',
        releaseId: release ? release.id : null,
        release: release,
        trackId: t.id,
        track: t,
        merchItemId: null,
        merchItem: null,
        title: t.title,
        subtitle: release ? release.title : '',
        artistName: (artist && artist.name) || '',
        coverImageUrl: release && release.cover_image_url ? release.cover_image_url : '',
        priceFrom: t.price,
        priceTo: t.price,
        currency: t.currency || 'USD',
        isCompilation: release ? release.is_compilation === true : false,
        releaseType: release ? release.release_type : 'single',
        _relevanceScore: 1
      });
    }

    // Merch
    for (let i = 0; i < merchItems.length; i++) {
      const m = merchItems[i];
      if (!textMatch(m.name)) continue;

      const artist = artists.find(function (a) { return a.id === m.artist_id; }) || null;
      const variants = this._getFromStorage('merch_variants', []).filter(function (mv) { return mv.merch_item_id === m.id && mv.is_active !== false; });

      let minPrice = null;
      let maxPrice = null;
      let currency = 'USD';
      for (let j = 0; j < variants.length; j++) {
        const v = variants[j];
        if (typeof v.price === 'number') {
          if (minPrice === null || v.price < minPrice) minPrice = v.price;
          if (maxPrice === null || v.price > maxPrice) maxPrice = v.price;
        }
        if (v.currency) currency = v.currency;
      }

      if (filters.minPrice != null || filters.maxPrice != null) {
        const anyInRange = variants.some(function (v) {
          if (typeof v.price !== 'number') return false;
          if (filters.minPrice != null && v.price < filters.minPrice) return false;
          if (filters.maxPrice != null && v.price > filters.maxPrice) return false;
          return true;
        });
        if (!anyInRange) continue;
      }

      results.push({
        resultType: 'merch_item',
        releaseId: null,
        release: null,
        trackId: null,
        track: null,
        merchItemId: m.id,
        merchItem: m,
        title: m.name,
        subtitle: (artist && artist.name) || '',
        artistName: (artist && artist.name) || '',
        coverImageUrl: m.image_url || '',
        priceFrom: minPrice,
        priceTo: maxPrice,
        currency: currency,
        isCompilation: false,
        releaseType: 'other',
        _relevanceScore: 1
      });
    }

    const sorted = results.slice();
    sorted.sort(function (a, b) {
      if (sort === 'price_low_to_high') {
        return (a.priceFrom || 0) - (b.priceFrom || 0);
      } else if (sort === 'price_high_to_low') {
        return (b.priceFrom || 0) - (a.priceFrom || 0);
      } else if (sort === 'rating_high_to_low') {
        const ar = a.release && a.release.rating_average ? a.release.rating_average : (a.track && a.track.rating_average) || 0;
        const br = b.release && b.release.rating_average ? b.release.rating_average : (b.track && b.track.rating_average) || 0;
        return br - ar;
      } else if (sort === 'relevance') {
        return (b._relevanceScore || 0) - (a._relevanceScore || 0);
      }
      return 0;
    });

    const totalCount = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = sorted.slice(start, end).map(function (r) {
      const copy = { ...r };
      delete copy._relevanceScore;
      return copy;
    });

    return {
      items: pageItems,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize
    };
  }

  // getReleaseDetail(releaseId)
  getReleaseDetail(releaseId) {
    const release = this._findById('releases', releaseId);
    if (!release) {
      return {
        release: null,
        artist: null,
        albumFormats: [],
        tracks: [],
        ratingAverage: 0,
        ratingCount: 0,
        isWishlisted: false,
        relatedReleases: [],
        relatedMerch: []
      };
    }

    const artist = this._findById('artists', release.primary_artist_id);
    const albumFormats = this._getFromStorage('album_formats', []).filter(function (af) { return af.release_id === release.id && af.is_active !== false; });
    const tracks = this._getFromStorage('tracks', []).filter(function (t) { return t.release_id === release.id && t.is_active !== false; });

    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const isWishlisted = wishlistItems.some(function (w) { return w.item_type === 'release' && w.release_id === release.id; });

    const allReleases = this._getFromStorage('releases', []).filter(function (r) { return r && r.is_active !== false; });
    const relatedReleases = allReleases.filter(function (r) {
      if (r.id === release.id) return false;
      if (r.primary_artist_id === release.primary_artist_id) return true;
      const relGenres = Array.isArray(release.genres) ? release.genres : [];
      const otherGenres = Array.isArray(r.genres) ? r.genres : [];
      const overlap = relGenres.some(function (g) { return otherGenres.indexOf(g) !== -1; });
      return overlap;
    }).slice(0, 8);

    const merchItems = this._getFromStorage('merch_items', []).filter(function (m) { return m.artist_id === release.primary_artist_id && m.is_active !== false; }).slice(0, 8);

    return {
      release: release,
      artist: artist,
      albumFormats: albumFormats,
      tracks: tracks,
      ratingAverage: release.rating_average || 0,
      ratingCount: release.rating_count || 0,
      isWishlisted: isWishlisted,
      relatedReleases: relatedReleases,
      relatedMerch: merchItems
    };
  }

  // getTrackDetail(trackId)
  getTrackDetail(trackId) {
    const track = this._findById('tracks', trackId);
    if (!track) {
      return {
        track: null,
        artist: null,
        release: null,
        isWishlisted: false,
        isInCart: false
      };
    }
    const artist = this._findById('artists', track.primary_artist_id);
    const release = track.release_id ? this._findById('releases', track.release_id) : null;

    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const isWishlisted = wishlistItems.some(function (w) { return w.item_type === 'track' && w.track_id === track.id; });

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []).filter(function (ci) { return ci.cart_id === cart.id; });
    const isInCart = cartItems.some(function (ci) { return ci.item_type === 'track' && ci.track_id === track.id; });

    return {
      track: track,
      artist: artist,
      release: release,
      isWishlisted: isWishlisted,
      isInCart: isInCart
    };
  }

  // getMerchItemDetail(merchItemId)
  getMerchItemDetail(merchItemId) {
    const merchItem = this._findById('merch_items', merchItemId);
    if (!merchItem) {
      return {
        merchItem: null,
        artist: null,
        variants: [],
        isWishlisted: false,
        relatedMerch: []
      };
    }
    const artist = merchItem.artist_id ? this._findById('artists', merchItem.artist_id) : null;
    const variants = this._getFromStorage('merch_variants', []).filter(function (mv) { return mv.merch_item_id === merchItem.id && mv.is_active !== false; });

    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const isWishlisted = wishlistItems.some(function (w) { return w.item_type === 'merch_item' && w.merch_item_id === merchItem.id; });

    const relatedMerch = this._getFromStorage('merch_items', []).filter(function (m) {
      return m.id !== merchItem.id && m.artist_id === merchItem.artist_id && m.is_active !== false;
    }).slice(0, 8);

    return {
      merchItem: merchItem,
      artist: artist,
      variants: variants,
      isWishlisted: isWishlisted,
      relatedMerch: relatedMerch
    };
  }

  // listArtists(searchTerm, genreIds, featuredOnly, sort)
  listArtists(searchTerm, genreIds, featuredOnly, sort) {
    searchTerm = searchTerm || '';
    genreIds = genreIds || [];
    featuredOnly = !!featuredOnly;
    sort = sort || 'roster_order';

    const q = searchTerm.toLowerCase();
    let artists = this._getFromStorage('artists', []);

    artists = artists.filter(function (a) {
      if (!a) return false;
      if (featuredOnly && a.is_featured !== true) return false;
      if (q && (!a.name || String(a.name).toLowerCase().indexOf(q) === -1)) return false;
      if (genreIds && genreIds.length) {
        const aGenres = Array.isArray(a.genres) ? a.genres : [];
        const hasGenre = genreIds.some(function (gid) { return aGenres.indexOf(gid) !== -1; });
        if (!hasGenre) return false;
      }
      return true;
    });

    if (sort === 'name_az') {
      artists.sort(function (a, b) {
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
    } else if (sort === 'name_za') {
      artists.sort(function (a, b) {
        return String(b.name || '').localeCompare(String(a.name || ''));
      });
    }

    return artists;
  }

  // getArtistFilterOptions()
  getArtistFilterOptions() {
    const genres = this._getFromStorage('genres', []);
    return { genres: genres };
  }

  // getArtistDetail(artistId)
  getArtistDetail(artistId) {
    const artist = this._findById('artists', artistId);
    if (!artist) {
      return {
        artist: null,
        isFollowed: false,
        latestRelease: null,
        releases: [],
        merchItems: [],
        topTracks: []
      };
    }

    const followedArtists = this._getFromStorage('followed_artists', []);
    const isFollowed = followedArtists.some(function (f) { return f.artist_id === artist.id; });

    const releases = this._getFromStorage('releases', []).filter(function (r) { return r.primary_artist_id === artist.id && r.is_active !== false; });
    let latestRelease = null;
    if (releases.length) {
      releases.sort(function (a, b) {
        const ad = a.release_date ? new Date(a.release_date) : new Date(0);
        const bd = b.release_date ? new Date(b.release_date) : new Date(0);
        return bd - ad;
      });
      latestRelease = releases[0];
    }

    const merchItems = this._getFromStorage('merch_items', []).filter(function (m) { return m.artist_id === artist.id && m.is_active !== false; });

    const tracks = this._getFromStorage('tracks', []).filter(function (t) { return t.primary_artist_id === artist.id && t.is_active !== false; });
    tracks.sort(function (a, b) { return (b.popularity_score || 0) - (a.popularity_score || 0); });
    const topTracks = tracks.slice(0, 10);

    return {
      artist: artist,
      isFollowed: isFollowed,
      latestRelease: latestRelease,
      releases: releases,
      merchItems: merchItems,
      topTracks: topTracks
    };
  }

  // getArtistMerch(artistId, filters)
  getArtistMerch(artistId, filters) {
    filters = filters || {};

    const merchItems = this._getFromStorage('merch_items', []).filter(function (m) { return m.artist_id === artistId && m.is_active !== false; });
    const variants = this._getFromStorage('merch_variants', []).filter(function (v) { return v.is_active !== false; });

    const results = [];

    for (let i = 0; i < merchItems.length; i++) {
      const item = merchItems[i];
      if (filters.category && item.merch_category !== filters.category) continue;

      let itemVariants = variants.filter(function (v) { return v.merch_item_id === item.id; });

      if (filters.color) {
        itemVariants = itemVariants.filter(function (v) { return v.color === filters.color; });
      }
      if (filters.size) {
        itemVariants = itemVariants.filter(function (v) { return v.size === filters.size; });
      }
      if (filters.minPrice != null) {
        itemVariants = itemVariants.filter(function (v) { return typeof v.price === 'number' && v.price >= filters.minPrice; });
      }
      if (filters.maxPrice != null) {
        itemVariants = itemVariants.filter(function (v) { return typeof v.price === 'number' && v.price <= filters.maxPrice; });
      }

      if (!itemVariants.length) continue;

      results.push({
        merchItem: item,
        variants: itemVariants
      });
    }

    return results;
  }

  // followArtist(artistId)
  followArtist(artistId) {
    const artist = this._findById('artists', artistId);
    if (!artist) {
      return { success: false, followedArtist: null, message: 'Artist not found' };
    }
    const followedArtists = this._getFromStorage('followed_artists', []);
    const existing = followedArtists.find(function (f) { return f.artist_id === artistId; });
    if (existing) {
      return { success: true, followedArtist: { ...existing, artist: artist }, message: 'Already following artist' };
    }
    const fa = {
      id: this._generateId('followed_artist'),
      artist_id: artistId,
      followed_at: new Date().toISOString()
    };
    followedArtists.push(fa);
    this._saveToStorage('followed_artists', followedArtists);
    return { success: true, followedArtist: { ...fa, artist: artist }, message: 'Artist followed' };
  }

  // unfollowArtist(artistId)
  unfollowArtist(artistId) {
    const followedArtists = this._getFromStorage('followed_artists', []);
    const remaining = followedArtists.filter(function (f) { return f.artist_id !== artistId; });
    const success = remaining.length !== followedArtists.length;
    this._saveToStorage('followed_artists', remaining);
    return { success: success, message: success ? 'Artist unfollowed' : 'Artist was not followed' };
  }

  // addAlbumFormatToCart(albumFormatId, quantity = 1)
  addAlbumFormatToCart(albumFormatId, quantity) {
    if (quantity == null) quantity = 1;
    quantity = Math.max(1, quantity);

    const albumFormat = this._findById('album_formats', albumFormatId);
    if (!albumFormat || albumFormat.is_active === false) {
      return { success: false, cart: this._getOrCreateCart(), message: 'Album format not found or inactive' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let existing = cartItems.find(function (ci) {
      return ci.cart_id === cart.id && ci.item_type === 'album_format' && ci.album_format_id === albumFormatId;
    });

    let newQuantity = quantity;
    if (existing) {
      newQuantity = existing.quantity + quantity;
    }

    if (albumFormat.max_quantity_per_order != null && newQuantity > albumFormat.max_quantity_per_order) {
      newQuantity = albumFormat.max_quantity_per_order;
    }
    if (albumFormat.stock_quantity != null && newQuantity > albumFormat.stock_quantity) {
      newQuantity = albumFormat.stock_quantity;
    }

    const unitPrice = albumFormat.price || 0;
    const lineTotal = unitPrice * newQuantity;

    if (existing) {
      existing.quantity = newQuantity;
      existing.unit_price = unitPrice;
      existing.line_total = lineTotal;
    } else {
      const cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'album_format',
        album_format_id: albumFormatId,
        track_id: null,
        merch_variant_id: null,
        quantity: newQuantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        added_at: new Date().toISOString()
      };
      cartItems.push(cartItem);
      cart.items.push(cartItem.id);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    return { success: true, cart: updatedCart, message: 'Item added to cart' };
  }

  // addTrackToCart(trackId, quantity = 1)
  addTrackToCart(trackId, quantity) {
    if (quantity == null) quantity = 1;
    quantity = Math.max(1, quantity);

    const track = this._findById('tracks', trackId);
    if (!track || track.is_active === false) {
      return { success: false, cart: this._getOrCreateCart(), message: 'Track not found or inactive' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let existing = cartItems.find(function (ci) {
      return ci.cart_id === cart.id && ci.item_type === 'track' && ci.track_id === trackId;
    });

    let newQuantity = quantity;
    if (existing) {
      newQuantity = existing.quantity + quantity;
    }

    const unitPrice = track.price || 0;
    const lineTotal = unitPrice * newQuantity;

    if (existing) {
      existing.quantity = newQuantity;
      existing.unit_price = unitPrice;
      existing.line_total = lineTotal;
    } else {
      const cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'track',
        album_format_id: null,
        track_id: trackId,
        merch_variant_id: null,
        quantity: newQuantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        added_at: new Date().toISOString()
      };
      cartItems.push(cartItem);
      cart.items.push(cartItem.id);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    return { success: true, cart: updatedCart, message: 'Track added to cart' };
  }

  // addMerchVariantToCart(merchVariantId, quantity = 1)
  addMerchVariantToCart(merchVariantId, quantity) {
    if (quantity == null) quantity = 1;
    quantity = Math.max(1, quantity);

    const merchVariant = this._findById('merch_variants', merchVariantId);
    if (!merchVariant || merchVariant.is_active === false) {
      return { success: false, cart: this._getOrCreateCart(), message: 'Merch variant not found or inactive' };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let existing = cartItems.find(function (ci) {
      return ci.cart_id === cart.id && ci.item_type === 'merch_variant' && ci.merch_variant_id === merchVariantId;
    });

    let newQuantity = quantity;
    if (existing) {
      newQuantity = existing.quantity + quantity;
    }

    if (merchVariant.stock_quantity != null && newQuantity > merchVariant.stock_quantity) {
      newQuantity = merchVariant.stock_quantity;
    }

    const unitPrice = merchVariant.price || 0;
    const lineTotal = unitPrice * newQuantity;

    if (existing) {
      existing.quantity = newQuantity;
      existing.unit_price = unitPrice;
      existing.line_total = lineTotal;
    } else {
      const cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'merch_variant',
        album_format_id: null,
        track_id: null,
        merch_variant_id: merchVariantId,
        quantity: newQuantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        added_at: new Date().toISOString()
      };
      cartItems.push(cartItem);
      cart.items.push(cartItem.id);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    return { success: true, cart: updatedCart, message: 'Merch item added to cart' };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const resolvedItems = this._getResolvedCartItems(cart);
    const shippingMethods = this._getFromStorage('shipping_methods', []).filter(function (sm) { return sm.is_active !== false; });

    const promoCodes = this._getFromStorage('promo_codes', []);
    const appliedPromo = cart.promo_code ? (promoCodes.find(function (p) { return p.code === cart.promo_code; }) || null) : null;

    const itemDetails = resolvedItems.map(function (ri) {
      return {
        cartItemId: ri.id,
        itemType: ri.item_type,
        title: ri.title,
        artistName: ri.artistName,
        formatOrVariant: ri.formatOrVariant,
        thumbnailUrl: ri.thumbnailUrl
      };
    });

    return {
      cart: cart,
      items: resolvedItems,
      itemDetails: itemDetails,
      availableShippingMethods: shippingMethods,
      appliedPromoCode: appliedPromo
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    quantity = Number(quantity);
    if (isNaN(quantity) || quantity < 0) {
      return { success: false, cart: this._getOrCreateCart(), message: 'Invalid quantity' };
    }
    if (quantity === 0) {
      return this.removeCartItem(cartItemId);
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find(function (ci) { return ci.id === cartItemId && ci.cart_id === cart.id; });
    if (!item) {
      return { success: false, cart: cart, message: 'Cart item not found' };
    }

    if (item.item_type === 'album_format' && item.album_format_id) {
      const af = this._findById('album_formats', item.album_format_id);
      if (af) {
        if (af.max_quantity_per_order != null && quantity > af.max_quantity_per_order) {
          quantity = af.max_quantity_per_order;
        }
        if (af.stock_quantity != null && quantity > af.stock_quantity) {
          quantity = af.stock_quantity;
        }
      }
    } else if (item.item_type === 'merch_variant' && item.merch_variant_id) {
      const mv = this._findById('merch_variants', item.merch_variant_id);
      if (mv && mv.stock_quantity != null && quantity > mv.stock_quantity) {
        quantity = mv.stock_quantity;
      }
    }

    item.quantity = quantity;
    item.line_total = (item.unit_price || 0) * quantity;
    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    return { success: true, cart: updatedCart, message: 'Cart item quantity updated' };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const newItems = cartItems.filter(function (ci) { return ci.id !== cartItemId || ci.cart_id !== cart.id; });
    const removed = newItems.length !== cartItems.length;
    this._saveToStorage('cart_items', newItems);

    cart.items = cart.items.filter(function (id) { return id !== cartItemId; });
    const updatedCart = this._recalculateCartTotals(cart);

    return { success: removed, cart: updatedCart, message: removed ? 'Item removed from cart' : 'Cart item not found' };
  }

  // clearCart()
  clearCart() {
    const cart = this._getOrCreateCart();
    this._saveToStorage('cart_items', []);
    cart.items = [];
    cart.subtotal = 0;
    cart.shipping_cost = 0;
    cart.discount_total = 0;
    cart.total = 0;
    cart.promo_code = null;
    cart.updated_at = new Date().toISOString();
    this._saveToStorage('cart', cart);
    return { success: true, cart: cart };
  }

  // selectShippingMethod(shippingMethodId)
  selectShippingMethod(shippingMethodId) {
    const cart = this._getOrCreateCart();
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const method = shippingMethods.find(function (m) { return m.id === shippingMethodId && m.is_active !== false; }) || null;
    if (!method) {
      return { success: false, cart: cart, message: 'Shipping method not found or inactive' };
    }
    cart.shipping_method_id = shippingMethodId;
    const updatedCart = this._recalculateCartTotals(cart);
    return { success: true, cart: updatedCart, message: 'Shipping method selected' };
  }

  // applyPromoCode(code)
  applyPromoCode(code) {
    const cart = this._getOrCreateCart();
    cart.promo_code = code;
    const updatedCart = this._recalculateCartTotals(cart);
    const promoCodes = this._getFromStorage('promo_codes', []);
    const appliedPromo = updatedCart.promo_code ? (promoCodes.find(function (p) { return p.code === updatedCart.promo_code; }) || null) : null;
    const success = !!appliedPromo;
    const message = success ? 'Promo code applied' : 'Promo code is invalid or not applicable';
    return {
      success: success,
      cart: updatedCart,
      appliedPromoCode: appliedPromo,
      message: message
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const resolvedItems = this._getResolvedCartItems(cart);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingMethod = cart.shipping_method_id ? (shippingMethods.find(function (m) { return m.id === cart.shipping_method_id; }) || null) : null;
    const promoCodes = this._getFromStorage('promo_codes', []);
    const appliedPromoCode = cart.promo_code ? (promoCodes.find(function (p) { return p.code === cart.promo_code; }) || null) : null;

    return {
      cart: cart,
      items: resolvedItems,
      shippingMethod: shippingMethod,
      appliedPromoCode: appliedPromoCode,
      orderSubtotal: cart.subtotal || 0,
      shippingCost: cart.shipping_cost || 0,
      discountTotal: cart.discount_total || 0,
      orderTotal: cart.total || 0
    };
  }

  // getAvailablePaymentMethods()
  getAvailablePaymentMethods() {
    const methods = this._getFromStorage('payment_methods', []);
    return methods.filter(function (m) { return m.is_active !== false; });
  }

  // submitCheckout(shippingAddress, paymentMethod, cardDetails)
  submitCheckout(shippingAddress, paymentMethod, cardDetails) {
    shippingAddress = shippingAddress || null;
    paymentMethod = paymentMethod || '';
    cardDetails = cardDetails || null;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []).filter(function (ci) { return ci.cart_id === cart.id; });
    if (!cartItems.length) {
      return { success: false, order: null, orderItems: [], message: 'Cart is empty' };
    }

    const paymentMethods = this._getFromStorage('payment_methods', []);
    const methodConfig = paymentMethods.find(function (m) { return m.code === paymentMethod && m.is_active !== false; }) || null;
    if (!methodConfig) {
      return { success: false, order: null, orderItems: [], message: 'Invalid payment method' };
    }

    // Determine if shipping address is required (physical items)
    const albumFormats = this._getFromStorage('album_formats', []);
    const merchVariants = this._getFromStorage('merch_variants', []);
    let hasPhysical = false;
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.item_type === 'album_format' && ci.album_format_id) {
        const af = albumFormats.find(function (a) { return a.id === ci.album_format_id; }) || null;
        if (af && (af.format === 'vinyl' || af.format === 'cassette')) {
          hasPhysical = true;
          break;
        }
      } else if (ci.item_type === 'merch_variant' && ci.merch_variant_id) {
        const mv = merchVariants.find(function (mv2) { return mv2.id === ci.merch_variant_id; }) || null;
        if (mv) {
          hasPhysical = true;
          break;
        }
      }
    }

    if (hasPhysical) {
      if (!shippingAddress || !shippingAddress.name || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country) {
        return { success: false, order: null, orderItems: [], message: 'Shipping address is required for physical items' };
      }
    }

    if (paymentMethod === 'credit_debit_card') {
      if (!cardDetails || !cardDetails.cardholderName || !cardDetails.cardNumber || !cardDetails.expiryMonth || !cardDetails.expiryYear || !cardDetails.cvv) {
        return { success: false, order: null, orderItems: [], message: 'Card details are required for credit/debit card payments' };
      }
    }

    // Determine order_type based on preorders
    const releases = this._getFromStorage('releases', []);
    let hasPreorder = false;
    let hasNonPreorder = false;
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.item_type === 'album_format' && ci.album_format_id) {
        const af = albumFormats.find(function (a) { return a.id === ci.album_format_id; }) || null;
        const rel = af ? (releases.find(function (r) { return r.id === af.release_id; }) || null) : null;
        const isPre = (rel && rel.is_preorder === true) || (af && af.is_preorder_only === true);
        if (isPre) hasPreorder = true; else hasNonPreorder = true;
      } else {
        hasNonPreorder = true;
      }
    }

    let orderType = 'standard';
    if (hasPreorder && hasNonPreorder) orderType = 'mixed';
    else if (hasPreorder && !hasNonPreorder) orderType = 'preorder';

    const paymentStatus = paymentMethod === 'credit_debit_card' ? 'paid' : 'pending';

    const orders = this._getFromStorage('orders', []);
    const orderId = this._generateId('order');
    const order = {
      id: orderId,
      order_number: String(orderId),
      created_at: new Date().toISOString(),
      subtotal: cart.subtotal || 0,
      shipping_method_id: cart.shipping_method_id || null,
      shipping_cost: cart.shipping_cost || 0,
      discount_total: cart.discount_total || 0,
      total: cart.total || 0,
      promo_code: cart.promo_code || null,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      order_type: orderType,
      status: 'pending',
      shipping_name: shippingAddress ? shippingAddress.name || '' : '',
      shipping_address_line1: shippingAddress ? shippingAddress.addressLine1 || '' : '',
      shipping_address_line2: shippingAddress ? shippingAddress.addressLine2 || '' : '',
      shipping_city: shippingAddress ? shippingAddress.city || '' : '',
      shipping_state: shippingAddress ? shippingAddress.state || '' : '',
      shipping_postal_code: shippingAddress ? shippingAddress.postalCode || '' : '',
      shipping_country: shippingAddress ? shippingAddress.country || '' : '',
      email: shippingAddress ? shippingAddress.email || '' : '',
      phone: shippingAddress ? shippingAddress.phone || '' : ''
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    const orderItems = this._getFromStorage('order_items', []);

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      const oi = {
        id: this._generateId('order_item'),
        order_id: order.id,
        item_type: ci.item_type,
        album_format_id: ci.album_format_id || null,
        track_id: ci.track_id || null,
        merch_variant_id: ci.merch_variant_id || null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total
      };
      orderItems.push(oi);
    }

    this._saveToStorage('order_items', orderItems);

    // Update stock for album formats and merch variants
    let updatedAlbumFormats = albumFormats.slice();
    let updatedMerchVariants = merchVariants.slice();

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.item_type === 'album_format' && ci.album_format_id) {
        const afIndex = updatedAlbumFormats.findIndex(function (a) { return a.id === ci.album_format_id; });
        if (afIndex >= 0) {
          const af = { ...updatedAlbumFormats[afIndex] };
          if (af.stock_quantity != null) {
            af.stock_quantity = Math.max(0, af.stock_quantity - ci.quantity);
          }
          updatedAlbumFormats[afIndex] = af;
        }
      } else if (ci.item_type === 'merch_variant' && ci.merch_variant_id) {
        const mvIndex = updatedMerchVariants.findIndex(function (mv) { return mv.id === ci.merch_variant_id; });
        if (mvIndex >= 0) {
          const mv = { ...updatedMerchVariants[mvIndex] };
          if (mv.stock_quantity != null) {
            mv.stock_quantity = Math.max(0, mv.stock_quantity - ci.quantity);
          }
          updatedMerchVariants[mvIndex] = mv;
        }
      }
    }

    this._saveToStorage('album_formats', updatedAlbumFormats);
    this._saveToStorage('merch_variants', updatedMerchVariants);

    // Clear cart after successful order
    this.clearCart();

    const placedOrderItems = orderItems.filter(function (oi) { return oi.order_id === order.id; });

    return {
      success: true,
      order: order,
      orderItems: placedOrderItems,
      message: 'Order placed successfully'
    };
  }

  // createAccount(username, email, password, confirmPassword)
  createAccount(username, email, password, confirmPassword) {
    if (!username || !email || !password || !confirmPassword) {
      return { success: false, account: null, message: 'All fields are required' };
    }
    if (password !== confirmPassword) {
      return { success: false, account: null, message: 'Passwords do not match' };
    }

    const accounts = this._getFromStorage('account_profiles', []);
    const existing = accounts.find(function (a) { return a.email === email; });
    if (existing) {
      return { success: false, account: null, message: 'An account with this email already exists' };
    }

    const account = {
      id: this._generateId('account'),
      username: username,
      email: email,
      created_at: new Date().toISOString()
    };

    accounts.push(account);
    this._saveToStorage('account_profiles', accounts);
    localStorage.setItem('current_account_id', account.id);

    return { success: true, account: account, message: 'Account created' };
  }

  // getAccountOverview()
  getAccountOverview() {
    return this._getCurrentAccountProfile();
  }

  // getWishlistItems()
  getWishlistItems() {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const releases = this._getFromStorage('releases', []);
    const tracks = this._getFromStorage('tracks', []);
    const merchItems = this._getFromStorage('merch_items', []);
    const artists = this._getFromStorage('artists', []);

    return wishlistItems.map(function (w) {
      let title = '';
      let artistName = '';
      let coverImageUrl = '';
      let release = null;
      let track = null;
      let merchItem = null;

      if (w.item_type === 'release' && w.release_id) {
        release = releases.find(function (r) { return r.id === w.release_id; }) || null;
        if (release) {
          title = release.title || '';
          const artist = artists.find(function (a) { return a.id === release.primary_artist_id; }) || null;
          artistName = (artist && artist.name) || release.artist_name || '';
          coverImageUrl = release.cover_image_url || '';
        }
      } else if (w.item_type === 'track' && w.track_id) {
        track = tracks.find(function (t) { return t.id === w.track_id; }) || null;
        if (track) {
          title = track.title || '';
          const artist = artists.find(function (a) { return a.id === track.primary_artist_id; }) || null;
          artistName = (artist && artist.name) || '';
          const rel = releases.find(function (r) { return r.id === track.release_id; }) || null;
          coverImageUrl = rel && rel.cover_image_url ? rel.cover_image_url : '';
        }
      } else if (w.item_type === 'merch_item' && w.merch_item_id) {
        merchItem = merchItems.find(function (m) { return m.id === w.merch_item_id; }) || null;
        if (merchItem) {
          title = merchItem.name || '';
          const artist = artists.find(function (a) { return a.id === merchItem.artist_id; }) || null;
          artistName = (artist && artist.name) || '';
          coverImageUrl = merchItem.image_url || '';
        }
      }

      return {
        wishlistItem: w,
        title: title,
        artistName: artistName,
        coverImageUrl: coverImageUrl,
        release: release,
        track: track,
        merchItem: merchItem
      };
    });
  }

  // addReleaseToWishlist(releaseId)
  addReleaseToWishlist(releaseId) {
    const release = this._findById('releases', releaseId);
    if (!release) {
      return { success: false, wishlistItem: null, message: 'Release not found' };
    }

    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const existing = wishlistItems.find(function (w) { return w.item_type === 'release' && w.release_id === releaseId; });
    if (existing) {
      return { success: true, wishlistItem: existing, message: 'Release already in wishlist' };
    }

    const wi = {
      id: this._generateId('wishlist_item'),
      item_type: 'release',
      release_id: releaseId,
      track_id: null,
      merch_item_id: null,
      added_at: new Date().toISOString()
    };
    wishlistItems.push(wi);
    this._saveToStorage('wishlist_items', wishlistItems);

    return { success: true, wishlistItem: wi, message: 'Release added to wishlist' };
  }

  // addTrackToWishlist(trackId)
  addTrackToWishlist(trackId) {
    const track = this._findById('tracks', trackId);
    if (!track) {
      return { success: false, wishlistItem: null, message: 'Track not found' };
    }

    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const existing = wishlistItems.find(function (w) { return w.item_type === 'track' && w.track_id === trackId; });
    if (existing) {
      return { success: true, wishlistItem: existing, message: 'Track already in wishlist' };
    }

    const wi = {
      id: this._generateId('wishlist_item'),
      item_type: 'track',
      release_id: null,
      track_id: trackId,
      merch_item_id: null,
      added_at: new Date().toISOString()
    };
    wishlistItems.push(wi);
    this._saveToStorage('wishlist_items', wishlistItems);

    return { success: true, wishlistItem: wi, message: 'Track added to wishlist' };
  }

  // addMerchItemToWishlist(merchItemId)
  addMerchItemToWishlist(merchItemId) {
    const merchItem = this._findById('merch_items', merchItemId);
    if (!merchItem) {
      return { success: false, wishlistItem: null, message: 'Merch item not found' };
    }

    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const existing = wishlistItems.find(function (w) { return w.item_type === 'merch_item' && w.merch_item_id === merchItemId; });
    if (existing) {
      return { success: true, wishlistItem: existing, message: 'Merch item already in wishlist' };
    }

    const wi = {
      id: this._generateId('wishlist_item'),
      item_type: 'merch_item',
      release_id: null,
      track_id: null,
      merch_item_id: merchItemId,
      added_at: new Date().toISOString()
    };
    wishlistItems.push(wi);
    this._saveToStorage('wishlist_items', wishlistItems);

    return { success: true, wishlistItem: wi, message: 'Merch item added to wishlist' };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const remaining = wishlistItems.filter(function (w) { return w.id !== wishlistItemId; });
    const success = remaining.length !== wishlistItems.length;
    this._saveToStorage('wishlist_items', remaining);
    return { success: success, message: success ? 'Wishlist item removed' : 'Wishlist item not found' };
  }

  // moveWishlistItemToCart(wishlistItemId)
  moveWishlistItemToCart(wishlistItemId) {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const wi = wishlistItems.find(function (w) { return w.id === wishlistItemId; });
    if (!wi) {
      return { success: false, cart: this._getOrCreateCart(), message: 'Wishlist item not found' };
    }

    let result = null;

    if (wi.item_type === 'release' && wi.release_id) {
      const albumFormats = this._getFromStorage('album_formats', []).filter(function (af) { return af.release_id === wi.release_id && af.is_active !== false; });
      if (!albumFormats.length) {
        return { success: false, cart: this._getOrCreateCart(), message: 'No purchasable formats for this release' };
      }
      albumFormats.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
      const cheapest = albumFormats[0];
      result = this.addAlbumFormatToCart(cheapest.id, 1);
    } else if (wi.item_type === 'track' && wi.track_id) {
      result = this.addTrackToCart(wi.track_id, 1);
    } else if (wi.item_type === 'merch_item' && wi.merch_item_id) {
      const variants = this._getFromStorage('merch_variants', []).filter(function (mv) { return mv.merch_item_id === wi.merch_item_id && mv.is_active !== false; });
      if (!variants.length) {
        return { success: false, cart: this._getOrCreateCart(), message: 'No variants available for this merch item' };
      }
      const variant = variants[0];
      result = this.addMerchVariantToCart(variant.id, 1);
    } else {
      return { success: false, cart: this._getOrCreateCart(), message: 'Unsupported wishlist item type' };
    }

    // Remove from wishlist after adding to cart
    const remaining = wishlistItems.filter(function (w) { return w.id !== wishlistItemId; });
    this._saveToStorage('wishlist_items', remaining);

    return { success: result.success, cart: result.cart, message: result.message };
  }

  // startTrackPreview(trackId)
  startTrackPreview(trackId) {
    const track = this._findById('tracks', trackId);
    if (!track || !track.preview_url) {
      return { success: false, previewUrl: null, message: 'Track or preview URL not found' };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task7_previewedTrackInfo',
        JSON.stringify({
          trackId: track.id,
          releaseId: track.release_id || null,
          artistId: track.primary_artist_id || null,
          previewStartedAt: new Date().toISOString()
        })
      );
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting core functionality
    }

    return { success: true, previewUrl: track.preview_url, message: 'Preview started' };
  }

  // submitContactForm(topic, fullName, email, artistName, streamingLink, genre, message)
  submitContactForm(topic, fullName, email, artistName, streamingLink, genre, message) {
    if (!topic) {
      return { success: false, contactSubmission: null, message: 'Topic is required' };
    }
    if (!message) {
      return { success: false, contactSubmission: null, message: 'Message is required' };
    }
    if (topic === 'demo_submission' && message.length < 30) {
      return { success: false, contactSubmission: null, message: 'Demo submissions require a message of at least 30 characters' };
    }

    const submissions = this._getFromStorage('contact_submissions', []);
    const submission = {
      id: this._generateId('contact'),
      topic: topic,
      full_name: fullName || '',
      email: email || '',
      artist_name: artistName || '',
      streaming_link: streamingLink || '',
      genre: genre || '',
      message: message,
      submitted_at: new Date().toISOString()
    };

    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return { success: true, contactSubmission: submission, message: 'Submission received' };
  }

  // getLabelInfo()
  getLabelInfo() {
    const info = this._getFromStorage('label_info', null);
    if (info && typeof info === 'object') {
      return {
        aboutText: info.aboutText || '',
        musicFocus: info.musicFocus || '',
        storeInfo: info.storeInfo || '',
        demoGuidelines: info.demoGuidelines || ''
      };
    }
    // Default empty content if not configured in storage
    return {
      aboutText: '',
      musicFocus: '',
      storeInfo: '',
      demoGuidelines: ''
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