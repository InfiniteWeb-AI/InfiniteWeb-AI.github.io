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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tableKeys = [
      'users',
      'products',
      'product_variants',
      'artists',
      'tracks',
      'playlists',
      'playlist_tracks',
      'shows',
      'ticket_types',
      'carts',
      'cart_items',
      'newsletter_subscriptions',
      'blog_posts',
      'reading_lists',
      'reading_list_items',
      'contact_messages'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Meta / content objects (kept empty by default; can be populated externally)
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem(
        'about_page_content',
        JSON.stringify({
          headline: '',
          body: '',
          heroImageUrl: '',
          highlightArtists: [],
          storeCtaText: '',
          listenCtaText: '',
          contactCtaText: ''
        })
      );
    }

    if (!localStorage.getItem('privacy_policy_content')) {
      localStorage.setItem(
        'privacy_policy_content',
        JSON.stringify({
          title: '',
          lastUpdated: '',
          sections: []
        })
      );
    }

    if (!localStorage.getItem('terms_and_conditions_content')) {
      localStorage.setItem(
        'terms_and_conditions_content',
        JSON.stringify({
          title: '',
          lastUpdated: '',
          sections: []
        })
      );
    }

    // Newsletter metadata (options). Kept small; seeded once.
    if (!localStorage.getItem('newsletter_metadata')) {
      const metadata = {
        topicOptions: [
          {
            value: 'new_vinyl_releases',
            label: 'New Vinyl Releases',
            description: 'Notifications about new vinyl LPs and reissues.'
          },
          {
            value: 'new_digital_releases',
            label: 'New Digital Releases',
            description: 'New digital albums and singles.'
          },
          {
            value: 'tour_announcements',
            label: 'Tour Announcements',
            description: 'Live show and tour date announcements.'
          },
          {
            value: 'blog_updates',
            label: 'Blog Updates',
            description: 'Studio diaries, interviews, and news posts.'
          },
          {
            value: 'merch_offers',
            label: 'Merch Offers',
            description: 'Special offers on label merchandise.'
          }
        ],
        frequencyOptions: [
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' }
        ]
      };
      localStorage.setItem('newsletter_metadata', JSON.stringify(metadata));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Current cart / playlist ids (single per agent)
    if (!localStorage.getItem('currentCartId')) {
      localStorage.setItem('currentCartId', '');
    }
    if (!localStorage.getItem('currentPlaylistId')) {
      localStorage.setItem('currentPlaylistId', '');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getObjectFromStorage(key, defaultValue = {}) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  _saveObjectToStorage(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj || {}));
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

  // -------------------------
  // Cart helpers
  // -------------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts', []);
    let currentCartId = localStorage.getItem('currentCartId') || '';

    let cart = carts.find(c => c.id === currentCartId);

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('currentCartId', cart.id);
    }

    return cart;
  }

  _calculateCartTotals(cart, cartItems) {
    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    let subtotal = 0;
    let itemCount = 0;
    for (const ci of itemsForCart) {
      subtotal += Number(ci.totalPrice || 0);
      itemCount += Number(ci.quantity || 0);
    }
    return { subtotal, itemCount };
  }

  _buildCartResponse(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const productVariants = this._getFromStorage('product_variants', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const shows = this._getFromStorage('shows', []);

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);

    let currency = 'USD';

    const items = itemsForCart.map(ci => {
      let imageUrl = null;
      let productVariant = null;
      let product = null;
      let ticketType = null;
      let show = null;

      if (ci.itemType === 'product_variant' && ci.productVariantId) {
        productVariant = productVariants.find(pv => pv.id === ci.productVariantId) || null;
        if (productVariant) {
          currency = productVariant.currency || currency;
          product = products.find(p => p.id === productVariant.productId) || null;
          if (product && product.imageUrl) {
            imageUrl = product.imageUrl;
          }
        }
      } else if (ci.itemType === 'ticket_type' && ci.ticketTypeId) {
        ticketType = ticketTypes.find(tt => tt.id === ci.ticketTypeId) || null;
        if (ticketType) {
          currency = ticketType.currency || currency;
          show = shows.find(s => s.id === ticketType.showId) || null;
        }
      }

      return {
        cartItemId: ci.id,
        itemType: ci.itemType,
        description: ci.description || '',
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.totalPrice,
        imageUrl: imageUrl || null,
        // Foreign key fields + resolved objects for convenience
        productVariantId: ci.productVariantId || null,
        ticketTypeId: ci.ticketTypeId || null,
        productVariant: productVariant,
        product: product,
        ticketType: ticketType,
        show: show
      };
    });

    const totals = this._calculateCartTotals(cart, cartItems);

    return {
      cartId: cart.id,
      itemCount: totals.itemCount,
      subtotal: totals.subtotal,
      currency,
      items
    };
  }

  // -------------------------
  // Playlist helpers
  // -------------------------

  _getOrCreateCurrentPlaylist() {
    const playlists = this._getFromStorage('playlists', []);
    let currentPlaylistId = localStorage.getItem('currentPlaylistId') || '';

    let playlist = playlists.find(p => p.id === currentPlaylistId);

    if (!playlist) {
      playlist = {
        id: this._generateId('playlist'),
        name: '',
        createdAt: this._nowIso(),
        isSaved: false,
        totalDurationSeconds: 0
      };
      playlists.push(playlist);
      this._saveToStorage('playlists', playlists);
      localStorage.setItem('currentPlaylistId', playlist.id);
    }

    return playlist;
  }

  _recalculatePlaylistDuration(playlist) {
    const playlistTracks = this._getFromStorage('playlist_tracks', []);
    const tracks = this._getFromStorage('tracks', []);
    const pts = playlistTracks.filter(pt => pt.playlistId === playlist.id);

    let total = 0;
    for (const pt of pts) {
      const track = tracks.find(t => t.id === pt.trackId);
      if (track) total += Number(track.durationSeconds || 0);
    }

    const playlists = this._getFromStorage('playlists', []);
    const idx = playlists.findIndex(p => p.id === playlist.id);
    if (idx !== -1) {
      playlists[idx].totalDurationSeconds = total;
      this._saveToStorage('playlists', playlists);
    }

    playlist.totalDurationSeconds = total;
  }

  _buildPlaylistResponse(playlist) {
    const playlistTracks = this._getFromStorage('playlist_tracks', []);
    const tracks = this._getFromStorage('tracks', []);
    const artists = this._getFromStorage('artists', []);

    const pts = playlistTracks
      .filter(pt => pt.playlistId === playlist.id)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const items = pts.map(pt => {
      const track = tracks.find(t => t.id === pt.trackId) || null;
      let artistName = '';
      if (track && track.artistId) {
        const artist = artists.find(a => a.id === track.artistId);
        if (artist) artistName = artist.name;
      }
      return {
        playlistTrackId: pt.id,
        orderIndex: pt.orderIndex,
        trackId: pt.trackId,
        title: track ? track.title : '',
        artistName,
        durationSeconds: track ? track.durationSeconds : 0,
        isLive: track ? !!track.isLive : false,
        hasFemaleVocals: track ? !!track.hasFemaleVocals : false,
        // Foreign key resolution
        track: track
      };
    });

    return {
      playlistId: playlist.id,
      name: playlist.name,
      isSaved: !!playlist.isSaved,
      trackCount: items.length,
      totalDurationSeconds: playlist.totalDurationSeconds || 0,
      tracks: items
    };
  }

  // -------------------------
  // Product / show / track filter & search helpers
  // -------------------------

  _filterAndSortProducts(allProducts, allVariants, options) {
    const {
      categoryId,
      subcategoryId,
      filters = {},
      sort = 'newest_first'
    } = options || {};

    const {
      format,
      minPrice,
      maxPrice,
      releaseYearFrom,
      releaseYearTo,
      releaseDecade,
      color,
      size,
      searchQuery
    } = filters || {};

    let products = allProducts.filter(p => p.status === 'active');

    if (categoryId) {
      products = products.filter(p => p.category === categoryId);
    }
    if (subcategoryId) {
      products = products.filter(p => p.subcategory === subcategoryId);
    }

    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      products = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
        return name.includes(q) || desc.includes(q) || tags.includes(q);
      });
    }

    if (releaseYearFrom != null) {
      products = products.filter(p => (p.releaseYear || 0) >= releaseYearFrom);
    }
    if (releaseYearTo != null) {
      products = products.filter(p => (p.releaseYear || 0) <= releaseYearTo);
    }
    if (releaseDecade) {
      products = products.filter(p => p.releaseDecade === releaseDecade);
    }

    // Variant-based filters
    products = products.filter(p => {
      const variants = allVariants.filter(v => v.productId === p.id && v.isActive);

      if (variants.length === 0) return false;

      if (format) {
        if (!variants.some(v => v.format === format)) return false;
      }

      if (color) {
        if (!variants.some(v => v.color === color)) return false;
      }

      if (size) {
        if (!variants.some(v => v.size === size)) return false;
      }

      if (minPrice != null || maxPrice != null) {
        const variantPrices = variants.map(v => Number(v.price || 0));
        if (variantPrices.length === 0) return false;
        const vMin = Math.min.apply(null, variantPrices);
        const vMax = Math.max.apply(null, variantPrices);
        if (minPrice != null && vMax < minPrice) return false;
        if (maxPrice != null && vMin > maxPrice) return false;
      }

      return true;
    });

    const productMinPrice = p => {
      const explicit = p.minPrice != null ? Number(p.minPrice) : null;
      if (explicit != null && !isNaN(explicit)) return explicit;
      const variants = allVariants.filter(v => v.productId === p.id && v.isActive);
      if (!variants.length) return Number.POSITIVE_INFINITY;
      return Math.min.apply(null, variants.map(v => Number(v.price || 0)));
    };

    const productReleaseDate = p => {
      if (p.releaseDate) return new Date(p.releaseDate).getTime();
      if (p.releaseYear) return new Date(Number(p.releaseYear), 0, 1).getTime();
      return 0;
    };

    const nameKey = p => (p.name || '').toLowerCase();

    const sorted = products.slice();
    switch (sort) {
      case 'price_low_to_high':
        sorted.sort((a, b) => productMinPrice(a) - productMinPrice(b));
        break;
      case 'price_high_to_low':
        sorted.sort((a, b) => productMinPrice(b) - productMinPrice(a));
        break;
      case 'oldest_first':
        sorted.sort((a, b) => productReleaseDate(a) - productReleaseDate(b));
        break;
      case 'name_a_to_z':
        sorted.sort((a, b) => nameKey(a).localeCompare(nameKey(b)));
        break;
      case 'newest_first':
      default:
        sorted.sort((a, b) => productReleaseDate(b) - productReleaseDate(a));
        break;
    }

    return sorted;
  }

  _filterAndSortShows(allShows, options) {
    const { filters = {}, sortOrder = 'date_asc' } = options || {};
    const { city, dateFrom, dateTo, includeCancelled = false } = filters;

    let shows = allShows.slice();

    if (city) {
      const c = city.toLowerCase();
      shows = shows.filter(s => (s.city || '').toLowerCase() === c);
    }

    if (!includeCancelled) {
      shows = shows.filter(s => !s.isCancelled);
    }

    if (dateFrom) {
      const fromTs = new Date(dateFrom).getTime();
      shows = shows.filter(s => new Date(s.dateTime).getTime() >= fromTs);
    }

    if (dateTo) {
      const toTs = new Date(dateTo).getTime();
      shows = shows.filter(s => new Date(s.dateTime).getTime() <= toTs);
    }

    shows.sort((a, b) => {
      const ta = new Date(a.dateTime).getTime();
      const tb = new Date(b.dateTime).getTime();
      return sortOrder === 'date_desc' ? tb - ta : ta - tb;
    });

    return shows;
  }

  _filterAndSortTracks(allTracks, options) {
    const { filters = {}, sortOrder = 'recent_first' } = options || {};
    const {
      hasFemaleVocals,
      isLive,
      minDurationSeconds,
      maxDurationSeconds,
      searchQuery,
      artistId
    } = filters || {};

    let tracks = allTracks.slice();

    if (hasFemaleVocals != null) {
      tracks = tracks.filter(t => !!t.hasFemaleVocals === !!hasFemaleVocals);
    }

    if (isLive != null) {
      tracks = tracks.filter(t => !!t.isLive === !!isLive);
    }

    if (artistId) {
      tracks = tracks.filter(t => t.artistId === artistId);
    }

    if (minDurationSeconds != null) {
      tracks = tracks.filter(t => Number(t.durationSeconds || 0) >= minDurationSeconds);
    }

    if (maxDurationSeconds != null) {
      tracks = tracks.filter(t => Number(t.durationSeconds || 0) <= maxDurationSeconds);
    }

    const q = (searchQuery || '').trim().toLowerCase();
    if (q) {
      tracks = tracks.filter(t => {
        const title = (t.title || '').toLowerCase();
        const tags = Array.isArray(t.tags) ? t.tags.join(' ').toLowerCase() : '';
        return title.includes(q) || tags.includes(q);
      });
    }

    tracks.sort((a, b) => {
      if (sortOrder === 'duration_desc') {
        return Number(b.durationSeconds || 0) - Number(a.durationSeconds || 0);
      }
      if (sortOrder === 'duration_asc') {
        return Number(a.durationSeconds || 0) - Number(b.durationSeconds || 0);
      }
      if (sortOrder === 'title_a_to_z') {
        return (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase());
      }
      // recent_first by createdAt if available
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return tracks;
  }

  _searchBlogIndex(allPosts, query, publishedFrom) {
    const q = (query || '').trim().toLowerCase();
    const fromTs = publishedFrom ? new Date(publishedFrom).getTime() : null;

    let posts = allPosts.filter(p => p.isPublished);

    if (fromTs != null) {
      posts = posts.filter(p => new Date(p.publishedAt).getTime() >= fromTs);
    }

    if (q) {
      posts = posts.filter(p => {
        const title = (p.title || '').toLowerCase();
        const content = (p.content || '').toLowerCase();
        const excerpt = (p.excerpt || '').toLowerCase();
        const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
        return (
          title.includes(q) ||
          content.includes(q) ||
          excerpt.includes(q) ||
          tags.includes(q)
        );
      });
    }

    posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return posts;
  }

  _ensureReadingList(name) {
    const readingLists = this._getFromStorage('reading_lists', []);
    const trimmed = (name || '').trim();
    if (!trimmed) return null;

    let list = readingLists.find(
      rl => rl.name && rl.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        name: trimmed,
        createdAt: this._nowIso()
      };
      readingLists.push(list);
      this._saveToStorage('reading_lists', readingLists);
    }

    return list;
  }

  // -------------------------
  // Core interfaces
  // -------------------------

  // 1. getHomepageContent
  getHomepageContent() {
    const products = this._getFromStorage('products', []);
    const productVariants = this._getFromStorage('product_variants', []);
    const artists = this._getFromStorage('artists', []);
    const shows = this._getFromStorage('shows', []);
    const blogPosts = this._getFromStorage('blog_posts', []);

    const activeProducts = products.filter(p => p.status === 'active');

    const getArtistName = artistId => {
      const a = artists.find(ar => ar.id === artistId);
      return a ? a.name : '';
    };

    const getMinPriceAndCurrency = productId => {
      const variants = productVariants.filter(v => v.productId === productId && v.isActive);
      if (!variants.length) return { minPrice: null, currency: 'USD' };
      const minVariant = variants.reduce((min, v) =>
        min && min.price <= v.price ? min : v,
      null);
      return { minPrice: minVariant.price, currency: minVariant.currency };
    };

    const featuredAlbumsSource = activeProducts
      .filter(p => p.category === 'albums')
      .sort((a, b) => {
        const ta = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const tb = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 8);

    const featuredAlbums = featuredAlbumsSource.map(p => {
      const { minPrice, currency } = getMinPriceAndCurrency(p.id);
      const variants = productVariants.filter(v => v.productId === p.id && v.isActive);
      const formats = variants.map(v => v.format);
      const isDigitalAvailable = formats.includes('digital_download');
      const isCdAvailable = formats.includes('cd');
      const isVinylAvailable = formats.includes('vinyl_lp');

      return {
        productId: p.id,
        name: p.name,
        artistName: getArtistName(p.artistId),
        categoryName: p.category,
        editionType: p.editionType || null,
        releaseYear: p.releaseYear || null,
        minPrice: minPrice,
        currency: currency,
        imageUrl: p.imageUrl || null,
        isDigitalAvailable,
        isCdAvailable,
        isVinylAvailable,
        // Foreign key resolution
        product: p
      };
    });

    const featuredVinylSource = activeProducts
      .filter(p => p.category === 'vinyl')
      .sort((a, b) => {
        const ta = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const tb = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 8);

    const featuredVinyl = featuredVinylSource.map(p => {
      const { minPrice, currency } = getMinPriceAndCurrency(p.id);
      return {
        productId: p.id,
        name: p.name,
        artistName: getArtistName(p.artistId),
        releaseDecade: p.releaseDecade || null,
        minPrice,
        currency,
        imageUrl: p.imageUrl || null,
        product: p
      };
    });

    const featuredMerchSource = activeProducts
      .filter(p => p.category === 'merch')
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      .slice(0, 8);

    const featuredMerch = featuredMerchSource.map(p => {
      const { minPrice, currency } = getMinPriceAndCurrency(p.id);
      return {
        productId: p.id,
        name: p.name,
        subcategoryName: p.subcategory || null,
        minPrice,
        currency,
        imageUrl: p.imageUrl || null,
        product: p
      };
    });

    const featuredShowsSource = shows
      .filter(s => !s.isCancelled)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      .slice(0, 8);

    const featuredShows = featuredShowsSource.map(s => {
      const artistName = getArtistName(s.artistId);
      return {
        showId: s.id,
        title: s.title,
        artistName,
        dateTime: s.dateTime,
        city: s.city,
        venue: s.venue || '',
        isCancelled: !!s.isCancelled,
        show: s
      };
    });

    const latestBlogSource = blogPosts
      .filter(p => p.isPublished)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 5);

    const latestBlogPosts = latestBlogSource.map(p => ({
      blogPostId: p.id,
      title: p.title,
      excerpt: p.excerpt || (p.content || '').slice(0, 200),
      publishedAt: p.publishedAt,
      imageUrl: p.imageUrl || null,
      blogPost: p
    }));

    return {
      featuredAlbums,
      featuredVinyl,
      featuredMerch,
      featuredShows,
      latestBlogPosts
    };
  }

  // 2. searchCatalogProducts
  searchCatalogProducts(query, filters, sort, page, pageSize) {
    const products = this._getFromStorage('products', []);
    const productVariants = this._getFromStorage('product_variants', []);
    const artists = this._getFromStorage('artists', []);

    // Instrumentation for task completion tracking
    try {
      if ((query || '').toLowerCase().includes('midnight crossroads')) {
        localStorage.setItem('task8_searchQuery', query);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const effectiveFilters = Object.assign({}, filters || {});
    const options = {
      categoryId: effectiveFilters.category || null,
      filters: {
        format: effectiveFilters.format || null,
        maxPrice: effectiveFilters.maxPrice != null ? effectiveFilters.maxPrice : null,
        releaseYearFrom:
          effectiveFilters.releaseYearFrom != null ? effectiveFilters.releaseYearFrom : null,
        releaseYearTo:
          effectiveFilters.releaseYearTo != null ? effectiveFilters.releaseYearTo : null,
        searchQuery: query || ''
      },
      sort: sort || 'relevance'
    };

    // For 'relevance' we still use _filterAndSortProducts but ignore sort, then manually sort by match strength
    let filtered = this._filterAndSortProducts(products, productVariants, {
      categoryId: options.categoryId,
      filters: options.filters,
      sort: sort && sort !== 'relevance' ? sort : 'newest_first'
    });

    const q = (query || '').trim().toLowerCase();
    if (sort === 'relevance' && q) {
      const score = p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        let s = 0;
        if (name.includes(q)) s += 3;
        if (desc.includes(q)) s += 1;
        const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
        if (tags.includes(q)) s += 1;
        return s;
      };
      filtered = filtered
        .map(p => ({ p, s: score(p) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map(x => x.p);
    }

    const total = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageItems = filtered.slice(start, end);

    const items = pageItems.map(p => {
      const variants = productVariants.filter(v => v.productId === p.id && v.isActive);
      const minVariant = variants.reduce((min, v) =>
        !min || v.price < min.price ? v : min,
      null);
      const artist = artists.find(a => a.id === p.artistId) || null;

      const highlightSource = (p.description || p.name || '').toString();
      const snippet = highlightSource.slice(0, 160);

      return {
        productId: p.id,
        name: p.name,
        artistName: artist ? artist.name : '',
        categoryName: p.category,
        editionType: p.editionType || null,
        minPrice: minVariant ? minVariant.price : p.minPrice || null,
        currency: minVariant ? minVariant.currency : 'USD',
        releaseYear: p.releaseYear || null,
        imageUrl: p.imageUrl || null,
        highlightSnippet: snippet,
        // Foreign key resolution
        product: p,
        artist: artist
      };
    });

    return {
      total,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // 3. getStoreCategories
  getStoreCategories() {
    const products = this._getFromStorage('products', []);

    const categoriesMap = new Map();

    for (const p of products) {
      if (!p.category) continue;
      if (!categoriesMap.has(p.category)) {
        categoriesMap.set(p.category, {
          categoryId: p.category,
          name: this._labelForCategory(p.category),
          description: '',
          imageUrl: '',
          subcategoryTiles: []
        });
      }
      const cat = categoriesMap.get(p.category);

      if (p.category === 'merch' && p.subcategory) {
        if (!cat.subcategoryTiles.find(sc => sc.subcategoryId === p.subcategory)) {
          cat.subcategoryTiles.push({
            subcategoryId: p.subcategory,
            name: this._labelForSubcategory(p.subcategory),
            description: ''
          });
        }
      }
    }

    return Array.from(categoriesMap.values());
  }

  _labelForCategory(cat) {
    if (!cat) return '';
    switch (cat) {
      case 'albums':
        return 'Albums';
      case 'vinyl':
        return 'Vinyl';
      case 'merch':
        return 'Merch';
      default:
        return cat.charAt(0).toUpperCase() + cat.slice(1);
    }
  }

  _labelForSubcategory(subcat) {
    if (!subcat) return '';
    switch (subcat) {
      case 't_shirts':
        return 'T-Shirts';
      case 'posters':
        return 'Posters';
      case 'accessories':
        return 'Accessories';
      default:
        return subcat.charAt(0).toUpperCase() + subcat.slice(1);
    }
  }

  // 4. getStoreFeaturedProducts
  getStoreFeaturedProducts() {
    const products = this._getFromStorage('products', []);
    const productVariants = this._getFromStorage('product_variants', []);
    const artists = this._getFromStorage('artists', []);

    const active = products.filter(p => p.status === 'active');

    const getMinPriceAndCurrency = productId => {
      const variants = productVariants.filter(v => v.productId === productId && v.isActive);
      if (!variants.length) return { minPrice: null, currency: 'USD' };
      const minVariant = variants.reduce((min, v) =>
        min && min.price <= v.price ? min : v,
      null);
      return { minPrice: minVariant.price, currency: minVariant.currency };
    };

    const getArtistName = artistId => {
      const a = artists.find(ar => ar.id === artistId);
      return a ? a.name : '';
    };

    const albums = active
      .filter(p => p.category === 'albums')
      .sort((a, b) => {
        const ta = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const tb = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 8)
      .map(p => {
        const { minPrice, currency } = getMinPriceAndCurrency(p.id);
        return {
          productId: p.id,
          name: p.name,
          artistName: getArtistName(p.artistId),
          minPrice,
          currency,
          imageUrl: p.imageUrl || null,
          product: p
        };
      });

    const vinyl = active
      .filter(p => p.category === 'vinyl')
      .sort((a, b) => {
        const ta = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const tb = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 8)
      .map(p => {
        const { minPrice, currency } = getMinPriceAndCurrency(p.id);
        return {
          productId: p.id,
          name: p.name,
          artistName: getArtistName(p.artistId),
          releaseDecade: p.releaseDecade || null,
          minPrice,
          currency,
          imageUrl: p.imageUrl || null,
          product: p
        };
      });

    const merch = active
      .filter(p => p.category === 'merch')
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      .slice(0, 8)
      .map(p => {
        const { minPrice, currency } = getMinPriceAndCurrency(p.id);
        return {
          productId: p.id,
          name: p.name,
          subcategoryName: p.subcategory || null,
          minPrice,
          currency,
          imageUrl: p.imageUrl || null,
          product: p
        };
      });

    return {
      featuredAlbums: albums,
      featuredVinyl: vinyl,
      featuredMerch: merch
    };
  }

  // 5. getProductFilterOptions
  getProductFilterOptions(categoryId, subcategoryId) {
    const products = this._getFromStorage('products', []);
    const productVariants = this._getFromStorage('product_variants', []);

    const relevantProducts = products.filter(p => {
      if (p.status !== 'active') return false;
      if (categoryId && p.category !== categoryId) return false;
      if (subcategoryId && p.subcategory !== subcategoryId) return false;
      return true;
    });

    const relevantIds = new Set(relevantProducts.map(p => p.id));
    const relevantVariants = productVariants.filter(v => relevantIds.has(v.productId));

    const uniqueBy = (list, keyFn) => {
      const seen = new Set();
      const out = [];
      for (const item of list) {
        const key = keyFn(item);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(item);
        }
      }
      return out;
    };

    const formatOptions = uniqueBy(
      relevantVariants.filter(v => !!v.format),
      v => v.format
    ).map(v => ({
      value: v.format,
      label: this._labelForFormat(v.format)
    }));

    let minYear = null;
    let maxYear = null;
    for (const p of relevantProducts) {
      if (typeof p.releaseYear === 'number') {
        if (minYear == null || p.releaseYear < minYear) minYear = p.releaseYear;
        if (maxYear == null || p.releaseYear > maxYear) maxYear = p.releaseYear;
      }
    }

    const decadeValues = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
    const presentDecades = new Set(
      relevantProducts.map(p => p.releaseDecade).filter(Boolean)
    );
    const decadeOptions = decadeValues
      .filter(d => presentDecades.has(d))
      .map(d => ({ value: d, label: d }));

    let minPrice = null;
    let maxPrice = null;
    for (const v of relevantVariants) {
      const price = Number(v.price || 0);
      if (minPrice == null || price < minPrice) minPrice = price;
      if (maxPrice == null || price > maxPrice) maxPrice = price;
    }

    const colorOptions = uniqueBy(
      relevantVariants.filter(v => !!v.color),
      v => v.color
    ).map(v => ({
      value: v.color,
      label: this._labelForColor(v.color)
    }));

    const sizeOptions = uniqueBy(
      relevantVariants.filter(v => !!v.size),
      v => v.size
    ).map(v => ({
      value: v.size,
      label: v.size.toUpperCase()
    }));

    const sortOptions = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'oldest_first', label: 'Oldest First' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'name_a_to_z', label: 'Name: A to Z' }
    ];

    return {
      formatOptions,
      releaseYearRange: {
        minYear,
        maxYear
      },
      decadeOptions,
      priceRange: {
        minPrice,
        maxPrice,
        step: 1
      },
      colorOptions,
      sizeOptions,
      sortOptions
    };
  }

  _labelForFormat(format) {
    switch (format) {
      case 'digital_download':
        return 'Digital Download';
      case 'cd':
        return 'CD';
      case 'vinyl_lp':
        return 'Vinyl LP';
      case 'cassette':
        return 'Cassette';
      case 'merch_physical':
        return 'Physical Item';
      default:
        return format;
    }
  }

  _labelForColor(color) {
    switch (color) {
      case 'black':
        return 'Black';
      case 'blue':
        return 'Blue';
      case 'white':
        return 'White';
      case 'gray':
        return 'Gray';
      case 'red':
        return 'Red';
      case 'other':
        return 'Other';
      default:
        return color;
    }
  }

  // 6. listProducts
  listProducts(categoryId, subcategoryId, filters, sort, page, pageSize) {
    const products = this._getFromStorage('products', []);
    const productVariants = this._getFromStorage('product_variants', []);
    const artists = this._getFromStorage('artists', []);

    // Instrumentation for task completion tracking
    try {
      const f = filters || {};

      // task_1: album filter params for digital downloads from 2019 onward
      if (
        categoryId === 'albums' &&
        f.format === 'digital_download' &&
        f.releaseYearFrom != null &&
        Number(f.releaseYearFrom) >= 2019 &&
        sort === 'price_low_to_high'
      ) {
        const value = {
          categoryId,
          filters: {
            format: f.format,
            releaseYearFrom: f.releaseYearFrom,
            maxPrice: f.maxPrice ?? null
          },
          sort,
          timestamp: this._nowIso()
        };
        localStorage.setItem('task1_albumFilterParams', JSON.stringify(value));
      }

      // task_2: vinyl filter params by decade with max price
      if (
        categoryId === 'vinyl' &&
        f &&
        (f.releaseDecade === '1960s' ||
          f.releaseDecade === '1970s' ||
          f.releaseDecade === '1980s') &&
        f.maxPrice != null
      ) {
        let current = {};
        try {
          const raw = localStorage.getItem('task2_vinylFilterParams');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              current = parsed;
            }
          }
        } catch (e) {}
        const updated = Object.assign({}, current, {
          [f.releaseDecade]: {
            releaseDecade: f.releaseDecade,
            maxPrice: f.maxPrice,
            timestamp: this._nowIso()
          }
        });
        localStorage.setItem('task2_vinylFilterParams', JSON.stringify(updated));
      }

      // task_7: merch T-shirt blue filter params
      if (
        categoryId === 'merch' &&
        subcategoryId === 't_shirts' &&
        f.color === 'blue' &&
        sort === 'price_low_to_high'
      ) {
        const value = {
          categoryId,
          subcategoryId,
          filters: {
            color: f.color
          },
          sort,
          timestamp: this._nowIso()
        };
        localStorage.setItem('task7_merchFilterParams', JSON.stringify(value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const filtered = this._filterAndSortProducts(products, productVariants, {
      categoryId,
      subcategoryId,
      filters: filters || {},
      sort: sort || 'newest_first'
    });

    const total = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 24;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageProducts = filtered.slice(start, end);

    const items = pageProducts.map(p => {
      const artist = artists.find(a => a.id === p.artistId) || null;
      const variants = productVariants.filter(v => v.productId === p.id && v.isActive);

      const minVariant = variants.reduce((min, v) =>
        !min || v.price < min.price ? v : min,
      null);

      const availableFormats = Array.from(new Set(variants.map(v => v.format)));

      const cheapestVariantForFormat = fmt => {
        const vs = variants.filter(v => v.format === fmt);
        if (!vs.length) return null;
        return vs.reduce((min, v) => (!min || v.price < min.price ? v : min), null);
      };

      const digitalVariant = cheapestVariantForFormat('digital_download');
      const vinylVariant = cheapestVariantForFormat('vinyl_lp');
      const merchVariant = cheapestVariantForFormat('merch_physical');

      return {
        productId: p.id,
        name: p.name,
        artistName: artist ? artist.name : '',
        categoryName: p.category,
        subcategoryName: p.subcategory || null,
        editionType: p.editionType || null,
        releaseYear: p.releaseYear || null,
        releaseDecade: p.releaseDecade || null,
        minPrice: minVariant ? minVariant.price : p.minPrice || null,
        currency: minVariant ? minVariant.currency : 'USD',
        imageUrl: p.imageUrl || null,
        tags: Array.isArray(p.tags) ? p.tags.slice() : [],
        availableFormats,
        defaultDigitalVariantId: digitalVariant ? digitalVariant.id : null,
        defaultVinylVariantId: vinylVariant ? vinylVariant.id : null,
        defaultMerchVariantId: merchVariant ? merchVariant.id : null,
        isDigitalAddToCartEnabled: !!digitalVariant,
        isVinylAddToCartEnabled: !!vinylVariant,
        isMerchAddToCartEnabled: !!merchVariant,
        // Foreign key resolution
        product: p,
        artist: artist
      };
    });

    return {
      total,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // 7. getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const productVariants = this._getFromStorage('product_variants', []);
    const tracks = this._getFromStorage('tracks', []);
    const artists = this._getFromStorage('artists', []);

    const p = products.find(pr => pr.id === productId);

    if (!p) {
      return {
        product: null,
        variants: [],
        tracklist: [],
        otherEditions: [],
        recommendedProducts: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (typeof p.name === 'string' && p.name.toLowerCase().includes('midnight crossroads')) {
        let current = {};
        try {
          const raw = localStorage.getItem('task8_comparedProductIds');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              current = parsed;
            }
          }
        } catch (e) {}
        let ids = Array.isArray(current.productIds) ? current.productIds.slice() : [];
        if (!ids.includes(p.id) && ids.length < 2) {
          ids.push(p.id);
        }
        const value = {
          productIds: ids,
          lastUpdatedAt: this._nowIso()
        };
        localStorage.setItem('task8_comparedProductIds', JSON.stringify(value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const artist = p.artistId ? artists.find(a => a.id === p.artistId) : null;

    const product = {
      id: p.id,
      name: p.name,
      description: p.description || '',
      categoryName: p.category,
      subcategoryName: p.subcategory || null,
      artistName: artist ? artist.name : '',
      releaseDate: p.releaseDate || null,
      releaseYear: p.releaseYear || null,
      releaseDecade: p.releaseDecade || null,
      editionType: p.editionType || null,
      trackCount: p.trackCount || null,
      tags: Array.isArray(p.tags) ? p.tags.slice() : [],
      imageUrl: p.imageUrl || null
    };

    const variants = productVariants
      .filter(v => v.productId === p.id)
      .map(v => ({
        variantId: v.id,
        title: v.title || '',
        format: v.format,
        color: v.color || null,
        size: v.size || null,
        price: v.price,
        currency: v.currency,
        isDigital: !!v.isDigital,
        isActive: !!v.isActive,
        stockQuantity: v.stockQuantity != null ? v.stockQuantity : null
      }));

    const tracklist = tracks
      .filter(t => t.productId === p.id)
      .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0))
      .map(t => {
        const tArtist = t.artistId ? artists.find(a => a.id === t.artistId) : artist;
        return {
          trackId: t.id,
          trackNumber: t.trackNumber || null,
          title: t.title,
          artistName: tArtist ? tArtist.name : '',
          durationSeconds: t.durationSeconds,
          isLive: !!t.isLive,
          hasFemaleVocals: !!t.hasFemaleVocals,
          track: t
        };
      });

    // Other editions via otherEditionIds
    let otherEditions = [];
    if (Array.isArray(p.otherEditionIds) && p.otherEditionIds.length) {
      otherEditions = p.otherEditionIds
        .map(id => products.find(pr => pr.id === id))
        .filter(Boolean)
        .map(op => ({
          productId: op.id,
          name: op.name,
          editionType: op.editionType || null,
          trackCount: op.trackCount || null,
          minPrice: op.minPrice != null ? op.minPrice : null,
          currency: 'USD',
          product: op
        }));
    }

    // Recommended products: other active albums by same artist
    const recommendedProducts = products
      .filter(
        pr =>
          pr.status === 'active' &&
          pr.id !== p.id &&
          pr.artistId &&
          p.artistId &&
          pr.artistId === p.artistId
      )
      .slice(0, 8)
      .map(pr => ({
        productId: pr.id,
        name: pr.name,
        artistName: artist ? artist.name : '',
        minPrice: pr.minPrice != null ? pr.minPrice : null,
        currency: 'USD',
        imageUrl: pr.imageUrl || null,
        product: pr
      }));

    return {
      product,
      variants,
      tracklist,
      otherEditions,
      recommendedProducts
    };
  }

  // 8. addProductVariantToCart
  addProductVariantToCart(productVariantId, quantity) {
    const qty = quantity != null ? Number(quantity) : 1;
    if (!productVariantId || qty <= 0) {
      return {
        success: false,
        message: 'Invalid product variant or quantity.',
        cart: null
      };
    }

    const productVariants = this._getFromStorage('product_variants', []);
    const products = this._getFromStorage('products', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const variant = productVariants.find(v => v.id === productVariantId);
    if (!variant || !variant.isActive) {
      return {
        success: false,
        message: 'Product variant not available.',
        cart: null
      };
    }

    const product = products.find(p => p.id === variant.productId) || null;

    const cart = this._getOrCreateCart();

    let item = cartItems.find(
      ci =>
        ci.cartId === cart.id &&
        ci.itemType === 'product_variant' &&
        ci.productVariantId === productVariantId
    );

    if (item) {
      item.quantity += qty;
      item.totalPrice = item.quantity * item.unitPrice;
    } else {
      const descriptionParts = [];
      if (product && product.name) descriptionParts.push(product.name);
      if (variant.title) descriptionParts.push(variant.title);
      const description = descriptionParts.join(' - ');

      item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'product_variant',
        productVariantId: variant.id,
        ticketTypeId: null,
        quantity: qty,
        unitPrice: Number(variant.price || 0),
        totalPrice: Number(variant.price || 0) * qty,
        description
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].updatedAt = this._nowIso();
      this._saveToStorage('carts', carts);
    }

    const cartResponse = this._buildCartResponse(cart);

    // Instrumentation for task completion tracking
    try {
      // task_1: selected digital album variant IDs
      if (
        variant &&
        variant.format === 'digital_download' &&
        product &&
        product.category === 'albums' &&
        Number(product.releaseYear || 0) >= 2019 &&
        Number(variant.price || 0) <= 15
      ) {
        let current = {};
        try {
          const raw = localStorage.getItem('task1_selectedDigitalAlbumVariantIds');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              current = parsed;
            }
          }
        } catch (e) {}
        if (!current.first) {
          current.first = variant.id;
          current.firstArtistId = product.artistId || null;
        } else if (
          !current.second &&
          product &&
          product.artistId &&
          current.firstArtistId &&
          product.artistId !== current.firstArtistId
        ) {
          current.second = variant.id;
        }
        current.timestamp = this._nowIso();
        localStorage.setItem(
          'task1_selectedDigitalAlbumVariantIds',
          JSON.stringify(current)
        );
      }

      // task_2: selected vinyl LP variants by decade
      if (
        product &&
        product.category === 'vinyl' &&
        variant &&
        variant.format === 'vinyl_lp' &&
        (product.releaseDecade === '1960s' ||
          product.releaseDecade === '1970s' ||
          product.releaseDecade === '1980s') &&
        Number(variant.price || 0) <= 30
      ) {
        let current = {};
        try {
          const raw = localStorage.getItem('task2_selectedVinylVariantIds');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              current = parsed;
            }
          }
        } catch (e) {}
        const decade = product.releaseDecade;
        if (decade && !current[decade]) {
          current[decade] = {
            variantId: variant.id,
            timestamp: this._nowIso()
          };
          localStorage.setItem(
            'task2_selectedVinylVariantIds',
            JSON.stringify(current)
          );
        }
      }

      // task_7: selected blue L T-shirt variant
      if (
        product &&
        product.category === 'merch' &&
        product.subcategory === 't_shirts' &&
        variant &&
        variant.color === 'blue' &&
        variant.size === 'L'
      ) {
        const value = {
          variantId: productVariantId,
          productId: product.id,
          quantityAdded: qty,
          unitPrice: variant.price,
          timestamp: this._nowIso()
        };
        localStorage.setItem('task7_selectedTShirtVariant', JSON.stringify(value));
      }

      // task_8: selected Midnight Crossroads CD variant
      if (
        variant &&
        variant.format === 'cd' &&
        product &&
        typeof product.name === 'string' &&
        product.name.toLowerCase().includes('midnight crossroads')
      ) {
        const existing = localStorage.getItem('task8_selectedCdVariantId');
        if (!existing) {
          localStorage.setItem('task8_selectedCdVariantId', productVariantId);
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      message: 'Item added to cart.',
      cart: cartResponse
    };
  }

  // 9. getCartContents
  getCartContents() {
    const carts = this._getFromStorage('carts', []);
    let currentCartId = localStorage.getItem('currentCartId') || '';
    let cart = carts.find(c => c.id === currentCartId);

    if (!cart) {
      // No cart yet: return empty cart structure
      return {
        cartId: null,
        itemCount: 0,
        subtotal: 0,
        currency: 'USD',
        items: []
      };
    }

    return this._buildCartResponse(cart);
  }

  // 10. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = Number(quantity);
    const cartItems = this._getFromStorage('cart_items', []);
    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);

    if (itemIndex === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null
      };
    }

    const item = cartItems[itemIndex];

    if (qty <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      item.quantity = qty;
      item.totalPrice = qty * item.unitPrice;
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === item.cartId);
    if (cart) {
      cart.updatedAt = this._nowIso();
      this._saveToStorage('carts', carts);
      return {
        success: true,
        message: 'Cart updated.',
        cart: this._buildCartResponse(cart)
      };
    }

    return {
      success: true,
      message: 'Cart updated.',
      cart: null
    };
  }

  // 11. removeCartItem
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: null
      };
    }

    const cartId = cartItems[idx].cartId;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === cartId);
    if (cart) {
      cart.updatedAt = this._nowIso();
      this._saveToStorage('carts', carts);
      return {
        success: true,
        message: 'Item removed from cart.',
        cart: this._buildCartResponse(cart)
      };
    }

    return {
      success: true,
      message: 'Item removed from cart.',
      cart: null
    };
  }

  // 12. clearCart
  clearCart() {
    const currentCartId = localStorage.getItem('currentCartId') || '';
    const cartItems = this._getFromStorage('cart_items', []);

    const newCartItems = cartItems.filter(ci => ci.cartId !== currentCartId);
    this._saveToStorage('cart_items', newCartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === currentCartId);
    if (cart) {
      cart.updatedAt = this._nowIso();
      this._saveToStorage('carts', carts);
      return {
        success: true,
        message: 'Cart cleared.',
        cart: this._buildCartResponse(cart)
      };
    }

    return {
      success: true,
      message: 'Cart cleared.',
      cart: {
        cartId: null,
        itemCount: 0,
        subtotal: 0,
        currency: 'USD',
        items: []
      }
    };
  }

  // 13. getShowFilterOptions
  getShowFilterOptions() {
    const shows = this._getFromStorage('shows', []);

    const citiesSet = new Set();
    let minDate = null;
    let maxDate = null;

    for (const s of shows) {
      if (s.city) citiesSet.add(s.city);
      const ts = new Date(s.dateTime).getTime();
      if (!isNaN(ts)) {
        if (minDate == null || ts < minDate) minDate = ts;
        if (maxDate == null || ts > maxDate) maxDate = ts;
      }
    }

    const cityOptions = Array.from(citiesSet).map(c => ({ value: c, label: c }));

    return {
      cityOptions,
      dateRange: {
        minDate: minDate != null ? new Date(minDate).toISOString() : null,
        maxDate: maxDate != null ? new Date(maxDate).toISOString() : null
      }
    };
  }

  // 14. listShows
  listShows(filters, sortOrder) {
    const shows = this._getFromStorage('shows', []);
    const artists = this._getFromStorage('artists', []);

    const filtered = this._filterAndSortShows(shows, {
      filters: filters || {},
      sortOrder: sortOrder || 'date_asc'
    });

    // Instrumentation for task completion tracking
    try {
      const f = filters || {};
      if (
        f.city &&
        typeof f.city === 'string' &&
        f.city.toLowerCase() === 'chicago' &&
        f.dateFrom
      ) {
        const fromTs = new Date(f.dateFrom).getTime();
        const minTs = new Date('2025-07-01').getTime();
        if (!isNaN(fromTs) && fromTs >= minTs) {
          const value = {
            city: f.city,
            dateFrom: f.dateFrom || null,
            sortOrder: sortOrder || 'date_asc',
            timestamp: this._nowIso()
          };
          localStorage.setItem('task3_showFilterParams', JSON.stringify(value));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const items = filtered.map(s => {
      const artist = s.artistId ? artists.find(a => a.id === s.artistId) : null;
      return {
        showId: s.id,
        title: s.title,
        artistName: artist ? artist.name : '',
        dateTime: s.dateTime,
        city: s.city,
        venue: s.venue || '',
        isCancelled: !!s.isCancelled,
        show: s
      };
    });

    return items;
  }

  // 15. getShowDetails
  getShowDetails(showId) {
    const shows = this._getFromStorage('shows', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const artists = this._getFromStorage('artists', []);

    const s = shows.find(sh => sh.id === showId);
    if (!s) {
      return {
        show: null,
        ticketTypes: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (s.city) {
        const cityLower = String(s.city).toLowerCase();
        const showTs = new Date(s.dateTime).getTime();
        const minTs = new Date('2025-07-01T00:00:00Z').getTime();
        if (cityLower === 'chicago' && !isNaN(showTs) && showTs >= minTs) {
          localStorage.setItem('task3_selectedShowId', s.id);
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const artist = s.artistId ? artists.find(a => a.id === s.artistId) : null;

    const show = {
      id: s.id,
      title: s.title,
      artistName: artist ? artist.name : '',
      dateTime: s.dateTime,
      city: s.city,
      venue: s.venue || '',
      lineup: s.lineup || '',
      notes: s.notes || '',
      isCancelled: !!s.isCancelled
    };

    const tickets = ticketTypes
      .filter(tt => tt.showId === s.id)
      .map(tt => ({
        ticketTypeId: tt.id,
        name: tt.name,
        ticketCategory: tt.ticketCategory,
        description: tt.description || '',
        price: tt.price,
        currency: tt.currency,
        availableQuantity: tt.availableQuantity != null ? tt.availableQuantity : null,
        isAvailable: !!tt.isAvailable
      }));

    return {
      show,
      ticketTypes: tickets
    };
  }

  // 16. addTicketsToCart
  addTicketsToCart(ticketTypeId, quantity) {
    const qty = quantity != null ? Number(quantity) : 1;
    if (!ticketTypeId || qty <= 0) {
      return {
        success: false,
        message: 'Invalid ticket type or quantity.',
        cart: null
      };
    }

    const ticketTypes = this._getFromStorage('ticket_types', []);
    const shows = this._getFromStorage('shows', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const ticketType = ticketTypes.find(tt => tt.id === ticketTypeId);
    if (!ticketType || !ticketType.isAvailable) {
      return {
        success: false,
        message: 'Ticket type not available.',
        cart: null
      };
    }

    const show = shows.find(s => s.id === ticketType.showId) || null;

    const cart = this._getOrCreateCart();

    let item = cartItems.find(
      ci =>
        ci.cartId === cart.id &&
        ci.itemType === 'ticket_type' &&
        ci.ticketTypeId === ticketTypeId
    );

    if (item) {
      item.quantity += qty;
      item.totalPrice = item.quantity * item.unitPrice;
    } else {
      const descriptionParts = [];
      if (ticketType.name) descriptionParts.push(ticketType.name);
      if (show && show.title) descriptionParts.push(show.title);
      const description = descriptionParts.join(' - ');

      item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'ticket_type',
        productVariantId: null,
        ticketTypeId: ticketType.id,
        quantity: qty,
        unitPrice: Number(ticketType.price || 0),
        totalPrice: Number(ticketType.price || 0) * qty,
        description
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].updatedAt = this._nowIso();
      this._saveToStorage('carts', carts);
    }

    const cartResponse = this._buildCartResponse(cart);

    // Instrumentation for task completion tracking
    try {
      if (
        ticketType &&
        ticketType.ticketCategory === 'general_admission' &&
        qty === 2
      ) {
        const value = {
          ticketTypeId: ticketType.id,
          showId: ticketType.showId,
          quantity: qty,
          unitPrice: ticketType.price,
          timestamp: this._nowIso()
        };
        localStorage.setItem(
          'task3_selectedGeneralAdmissionTicket',
          JSON.stringify(value)
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      message: 'Tickets added to cart.',
      cart: cartResponse
    };
  }

  // 17. getTrackFilterOptions
  getTrackFilterOptions() {
    const tracks = this._getFromStorage('tracks', []);

    let minDuration = null;
    let maxDuration = null;
    const tagsSet = new Set();

    for (const t of tracks) {
      const d = Number(t.durationSeconds || 0);
      if (minDuration == null || d < minDuration) minDuration = d;
      if (maxDuration == null || d > maxDuration) maxDuration = d;
      if (Array.isArray(t.tags)) {
        for (const tag of t.tags) tagsSet.add(tag);
      }
    }

    // Always provide standard tags for UI even if not present in data
    tagsSet.add('female_vocals');
    tagsSet.add('live_recordings');

    const tagOptions = Array.from(tagsSet).map(tag => ({
      value: tag,
      label:
        tag === 'female_vocals'
          ? 'Female Vocals'
          : tag === 'live_recordings'
          ? 'Live Recordings'
          : tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    return {
      tagOptions,
      minDurationSeconds: minDuration,
      maxDurationSeconds: maxDuration
    };
  }

  // 18. listTracks
  listTracks(filters, sortOrder, page, pageSize) {
    const tracks = this._getFromStorage('tracks', []);
    const artists = this._getFromStorage('artists', []);
    const products = this._getFromStorage('products', []);

    // Instrumentation for task completion tracking
    try {
      const f = filters || {};
      let current = {};
      try {
        const raw = localStorage.getItem('task5_trackFiltersUsed');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            current = parsed;
          }
        }
      } catch (e) {}
      const updated = Object.assign({}, current);
      if (f.hasFemaleVocals === true) {
        updated.femaleVocals = true;
      }
      if (f.isLive === true) {
        updated.live = true;
      }
      if (f.minDurationSeconds != null) {
        const minDur = Number(f.minDurationSeconds);
        if (!isNaN(minDur)) {
          if (
            typeof updated.minDurationSeconds !== 'number' ||
            minDur > updated.minDurationSeconds
          ) {
            updated.minDurationSeconds = minDur;
          }
        }
      }
      updated.lastUpdatedAt = this._nowIso();
      localStorage.setItem('task5_trackFiltersUsed', JSON.stringify(updated));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const filtered = this._filterAndSortTracks(tracks, {
      filters: filters || {},
      sortOrder: sortOrder || 'recent_first'
    });

    const total = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 50;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageTracks = filtered.slice(start, end);

    const items = pageTracks.map(t => {
      const artist = t.artistId ? artists.find(a => a.id === t.artistId) : null;
      const product = t.productId ? products.find(p => p.id === t.productId) : null;

      return {
        trackId: t.id,
        title: t.title,
        artistName: artist ? artist.name : '',
        durationSeconds: t.durationSeconds,
        isLive: !!t.isLive,
        hasFemaleVocals: !!t.hasFemaleVocals,
        tags: Array.isArray(t.tags) ? t.tags.slice() : [],
        audioPreviewUrl: t.audioPreviewUrl || null,
        albumName: product ? product.name : '',
        track: t,
        product
      };
    });

    return {
      total,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // 19. getCurrentPlaylist
  getCurrentPlaylist() {
    const playlists = this._getFromStorage('playlists', []);
    let currentPlaylistId = localStorage.getItem('currentPlaylistId') || '';
    let playlist = playlists.find(p => p.id === currentPlaylistId);

    if (!playlist) {
      return {
        playlistId: null,
        name: '',
        isSaved: false,
        trackCount: 0,
        totalDurationSeconds: 0,
        tracks: []
      };
    }

    this._recalculatePlaylistDuration(playlist);
    return this._buildPlaylistResponse(playlist);
  }

  // 20. addTrackToCurrentPlaylist
  addTrackToCurrentPlaylist(trackId) {
    if (!trackId) {
      return {
        success: false,
        message: 'Invalid track.',
        playlist: null
      };
    }

    const tracks = this._getFromStorage('tracks', []);
    const track = tracks.find(t => t.id === trackId);
    if (!track) {
      return {
        success: false,
        message: 'Track not found.',
        playlist: null
      };
    }

    const playlist = this._getOrCreateCurrentPlaylist();
    const playlistTracks = this._getFromStorage('playlist_tracks', []);

    const orderIndex = playlistTracks.filter(pt => pt.playlistId === playlist.id).length;

    const playlistTrack = {
      id: this._generateId('playlist_track'),
      playlistId: playlist.id,
      trackId: track.id,
      orderIndex,
      addedAt: this._nowIso()
    };

    playlistTracks.push(playlistTrack);
    this._saveToStorage('playlist_tracks', playlistTracks);

    this._recalculatePlaylistDuration(playlist);

    return {
      success: true,
      message: 'Track added to playlist.',
      playlist: this._buildPlaylistResponse(playlist)
    };
  }

  // 21. removeTrackFromCurrentPlaylist
  removeTrackFromCurrentPlaylist(playlistTrackId) {
    const playlistTracks = this._getFromStorage('playlist_tracks', []);
    const idx = playlistTracks.findIndex(pt => pt.id === playlistTrackId);

    if (idx === -1) {
      return {
        success: false,
        message: 'Playlist track not found.',
        playlist: null
      };
    }

    const playlistId = playlistTracks[idx].playlistId;
    playlistTracks.splice(idx, 1);

    // Re-index orderIndex for remaining tracks in this playlist
    const remaining = playlistTracks.filter(pt => pt.playlistId === playlistId);
    remaining
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      .forEach((pt, index) => {
        pt.orderIndex = index;
      });

    this._saveToStorage('playlist_tracks', playlistTracks);

    const playlists = this._getFromStorage('playlists', []);
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) {
      return {
        success: true,
        message: 'Track removed from playlist.',
        playlist: null
      };
    }

    this._recalculatePlaylistDuration(playlist);

    return {
      success: true,
      message: 'Track removed from playlist.',
      playlist: this._buildPlaylistResponse(playlist)
    };
  }

  // 22. saveCurrentPlaylist
  saveCurrentPlaylist(name) {
    const playlists = this._getFromStorage('playlists', []);
    let currentPlaylistId = localStorage.getItem('currentPlaylistId') || '';
    let playlist = playlists.find(p => p.id === currentPlaylistId);

    if (!playlist) {
      return {
        success: false,
        message: 'No current playlist to save.',
        playlist: null
      };
    }

    playlist.name = (name || '').trim();
    playlist.isSaved = true;

    this._saveToStorage('playlists', playlists);
    this._recalculatePlaylistDuration(playlist);

    // Instrumentation for task completion tracking
    try {
      const trimmed = (name || '').trim();
      if (
        trimmed &&
        trimmed.toLowerCase() === 'blues sampler 5 tracks'.toLowerCase()
      ) {
        localStorage.setItem('task5_savedPlaylistId', playlist.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      message: 'Playlist saved.',
      playlist: this._buildPlaylistResponse(playlist)
    };
  }

  // 23. listRecentBlogPosts
  listRecentBlogPosts(page, pageSize) {
    const blogPosts = this._getFromStorage('blog_posts', []);

    const published = blogPosts
      .filter(p => p.isPublished)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const total = published.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 10;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = published.slice(start, end).map(p => ({
      blogPostId: p.id,
      title: p.title,
      excerpt: p.excerpt || (p.content || '').slice(0, 200),
      publishedAt: p.publishedAt,
      authorName: p.authorName || '',
      imageUrl: p.imageUrl || null,
      tags: Array.isArray(p.tags) ? p.tags.slice() : [],
      blogPost: p
    }));

    return {
      total,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // 24. searchBlogPosts
  searchBlogPosts(query, publishedFrom, page, pageSize) {
    const blogPosts = this._getFromStorage('blog_posts', []);

    const searched = this._searchBlogIndex(blogPosts, query, publishedFrom || null);

    // Instrumentation for task completion tracking
    try {
      const q = (query || '').toLowerCase();
      if (q.includes('analog recording') && publishedFrom) {
        const fromTs = new Date(publishedFrom).getTime();
        const minTs = new Date('2023-01-01').getTime();
        if (!isNaN(fromTs) && fromTs >= minTs) {
          const value = {
            query,
            publishedFrom: publishedFrom || null,
            timestamp: this._nowIso()
          };
          localStorage.setItem('task6_blogSearchParams', JSON.stringify(value));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const total = searched.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 10;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = searched.slice(start, end).map(p => ({
      blogPostId: p.id,
      title: p.title,
      excerpt: p.excerpt || (p.content || '').slice(0, 200),
      publishedAt: p.publishedAt,
      authorName: p.authorName || '',
      imageUrl: p.imageUrl || null,
      tags: Array.isArray(p.tags) ? p.tags.slice() : [],
      blogPost: p
    }));

    return {
      total,
      page: pg,
      pageSize: ps,
      items
    };
  }

  // 25. getBlogPostDetails
  getBlogPostDetails(blogPostId) {
    const blogPosts = this._getFromStorage('blog_posts', []);
    const p = blogPosts.find(bp => bp.id === blogPostId);
    if (!p) {
      return {
        id: null,
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        publishedAt: '',
        authorName: '',
        imageUrl: null,
        tags: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task6_selectedArticleId', blogPostId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      id: p.id,
      title: p.title,
      slug: p.slug || '',
      content: p.content,
      excerpt: p.excerpt || '',
      publishedAt: p.publishedAt,
      authorName: p.authorName || '',
      imageUrl: p.imageUrl || null,
      tags: Array.isArray(p.tags) ? p.tags.slice() : []
    };
  }

  // 26. getReadingLists
  getReadingLists() {
    const readingLists = this._getFromStorage('reading_lists', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);

    return readingLists.map(rl => {
      const itemCount = readingListItems.filter(rli => rli.readingListId === rl.id).length;
      return {
        readingListId: rl.id,
        name: rl.name,
        createdAt: rl.createdAt,
        itemCount
      };
    });
  }

  // 27. createReadingList
  createReadingList(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return {
        readingListId: null,
        name: '',
        createdAt: ''
      };
    }

    const readingLists = this._getFromStorage('reading_lists', []);

    const existing = readingLists.find(
      rl => rl.name && rl.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      return {
        readingListId: existing.id,
        name: existing.name,
        createdAt: existing.createdAt
      };
    }

    const rl = {
      id: this._generateId('reading_list'),
      name: trimmed,
      createdAt: this._nowIso()
    };

    readingLists.push(rl);
    this._saveToStorage('reading_lists', readingLists);

    return {
      readingListId: rl.id,
      name: rl.name,
      createdAt: rl.createdAt
    };
  }

  // 28. addBlogPostToReadingList
  addBlogPostToReadingList(blogPostId, readingListId) {
    const blogPosts = this._getFromStorage('blog_posts', []);
    const readingLists = this._getFromStorage('reading_lists', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);

    const post = blogPosts.find(bp => bp.id === blogPostId);
    const list = readingLists.find(rl => rl.id === readingListId);

    if (!post || !list) {
      return {
        success: false,
        message: 'Blog post or reading list not found.',
        readingListId: null
      };
    }

    const existing = readingListItems.find(
      rli => rli.readingListId === readingListId && rli.blogPostId === blogPostId
    );
    if (!existing) {
      const item = {
        id: this._generateId('reading_list_item'),
        readingListId,
        blogPostId,
        addedAt: this._nowIso()
      };
      readingListItems.push(item);
      this._saveToStorage('reading_list_items', readingListItems);
    }

    // Instrumentation for task completion tracking
    try {
      if (list.name && list.name.toLowerCase() === 'studio articles'.toLowerCase()) {
        const value = {
          readingListId,
          readingListName: list.name,
          blogPostId,
          timestamp: this._nowIso()
        };
        localStorage.setItem('task6_readingListAssignment', JSON.stringify(value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      message: 'Blog post added to reading list.',
      readingListId
    };
  }

  // 29. getNewsletterMetadata
  getNewsletterMetadata() {
    const metadata = this._getObjectFromStorage('newsletter_metadata', {
      topicOptions: [],
      frequencyOptions: []
    });
    return {
      topicOptions: Array.isArray(metadata.topicOptions) ? metadata.topicOptions : [],
      frequencyOptions: Array.isArray(metadata.frequencyOptions)
        ? metadata.frequencyOptions
        : []
    };
  }

  // 30. submitNewsletterSubscription
  submitNewsletterSubscription(email, topics, frequency, agreedToTerms) {
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      return {
        success: false,
        message: 'Email is required.',
        subscriptionId: null
      };
    }

    if (!Array.isArray(topics) || !topics.length) {
      return {
        success: false,
        message: 'At least one topic must be selected.',
        subscriptionId: null
      };
    }

    const validFrequencies = ['daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(frequency)) {
      return {
        success: false,
        message: 'Invalid frequency.',
        subscriptionId: null
      };
    }

    if (!agreedToTerms) {
      return {
        success: false,
        message: 'You must agree to the terms.',
        subscriptionId: null
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions', []);

    const sub = {
      id: this._generateId('newsletter_subscription'),
      email: trimmedEmail,
      topics: topics.slice(),
      frequency,
      agreedToTerms: !!agreedToTerms,
      createdAt: this._nowIso(),
      isActive: true
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      message: 'Subscription saved.',
      subscriptionId: sub.id
    };
  }

  // 31. submitContactMessage
  submitContactMessage(subjectType, name, email, bandName, message, sourceChannel) {
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim();
    const trimmedMessage = (message || '').trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      return {
        success: false,
        message: 'Name, email, and message are required.',
        contactMessageId: null
      };
    }

    const validSubjectTypes = ['demo_inquiry', 'general_question', 'licensing', 'other'];
    if (!validSubjectTypes.includes(subjectType)) {
      return {
        success: false,
        message: 'Invalid subject type.',
        contactMessageId: null
      };
    }

    const validSourceChannels = [
      'local_show',
      'social_media',
      'friend',
      'press',
      'website',
      'other'
    ];
    if (!validSourceChannels.includes(sourceChannel)) {
      return {
        success: false,
        message: 'Invalid source channel.',
        contactMessageId: null
      };
    }

    const messages = this._getFromStorage('contact_messages', []);

    const msg = {
      id: this._generateId('contact_message'),
      subjectType,
      name: trimmedName,
      email: trimmedEmail,
      bandName: (bandName || '').trim() || null,
      message: trimmedMessage,
      sourceChannel,
      createdAt: this._nowIso(),
      status: 'new'
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message submitted.',
      contactMessageId: msg.id
    };
  }

  // 32. getAboutPageContent
  getAboutPageContent() {
    const content = this._getObjectFromStorage('about_page_content', {
      headline: '',
      body: '',
      heroImageUrl: '',
      highlightArtists: [],
      storeCtaText: '',
      listenCtaText: '',
      contactCtaText: ''
    });

    const artists = this._getFromStorage('artists', []);

    const highlightArtists = Array.isArray(content.highlightArtists)
      ? content.highlightArtists.map(ha => {
          const artist = artists.find(a => a.id === ha.artistId) || null;
          return {
            artistId: ha.artistId,
            artistName: ha.artistName || (artist ? artist.name : ''),
            bioSnippet: ha.bioSnippet || (artist ? artist.bio || '' : ''),
            primaryImageUrl: ha.primaryImageUrl || ''
          };
        })
      : [];

    return {
      headline: content.headline || '',
      body: content.body || '',
      heroImageUrl: content.heroImageUrl || '',
      highlightArtists,
      storeCtaText: content.storeCtaText || '',
      listenCtaText: content.listenCtaText || '',
      contactCtaText: content.contactCtaText || ''
    };
  }

  // 33. getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const content = this._getObjectFromStorage('privacy_policy_content', {
      title: '',
      lastUpdated: '',
      sections: []
    });

    return {
      title: content.title || '',
      lastUpdated: content.lastUpdated || '',
      sections: Array.isArray(content.sections) ? content.sections : []
    };
  }

  // 34. getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    const content = this._getObjectFromStorage('terms_and_conditions_content', {
      title: '',
      lastUpdated: '',
      sections: []
    });

    return {
      title: content.title || '',
      lastUpdated: content.lastUpdated || '',
      sections: Array.isArray(content.sections) ? content.sections : []
    };
  }

  // -------------------------
  // Additional convenience: legacy addToCart wrapper
  // -------------------------

  // Non-core helper matching the scaffold; picks the first active variant for the product.
  addToCart(userId, productId, quantity = 1) {
    const productVariants = this._getFromStorage('product_variants', []);
    const variant = productVariants.find(v => v.productId === productId && v.isActive);
    if (!variant) {
      return {
        success: false,
        cartId: null
      };
    }
    const result = this.addProductVariantToCart(variant.id, quantity);
    return {
      success: !!result.success,
      cartId: result.cart ? result.cart.cartId : null
    };
  }

  // For backward compatibility with scaffold name
  _findOrCreateCart(userId) {
    return this._getOrCreateCart();
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
