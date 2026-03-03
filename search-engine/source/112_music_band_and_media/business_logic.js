// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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
  }

  // ----------------------
  // Storage + ID helpers
  // ----------------------

  _initStorage() {
    // Legacy keys from stub (keep for compatibility, but main logic uses snake_case keys)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      // Seed default merch so tests have apparel (T-shirts and hoodies) available
      const defaultProducts = [
        {
          id: 'prod_city_lights_skyline_tee',
          name: 'City Lights Skyline Tee',
          subtitle: 'Unisex T-Shirt',
          description:
            'Soft cotton tee featuring the City Lights skyline design from the 2021 tour poster.',
          categoryId: 'apparel',
          subtype: 't_shirt',
          price: 24.0,
          currency: 'usd',
          imageUrl: '',
          thumbnailUrl: '',
          sizesAvailable: ['s', 'm', 'l', 'xl'],
          format: null,
          isDigital: false,
          albumId: null,
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          trackCount: null
        },
        {
          id: 'prod_midnight_echoes_logo_tee',
          name: 'Midnight Echoes Logo Tee',
          subtitle: 'Unisex T-Shirt',
          description: 'Classic band logo tee in a modern relaxed fit.',
          categoryId: 'apparel',
          subtype: 't_shirt',
          price: 26.0,
          currency: 'usd',
          imageUrl: '',
          thumbnailUrl: '',
          sizesAvailable: ['s', 'm', 'l', 'xl'],
          format: null,
          isDigital: false,
          albumId: null,
          status: 'active',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          trackCount: null
        },
        {
          id: 'prod_midnight_echoes_neon_hoodie',
          name: 'Midnight Echoes Neon Hoodie',
          subtitle: 'Pullover Hoodie',
          description:
            'Fleece hoodie with neon Midnight Echoes artwork on the back and sleeve print.',
          categoryId: 'apparel',
          subtype: 'hoodie',
          price: 60.0,
          currency: 'usd',
          imageUrl: '',
          thumbnailUrl: '',
          sizesAvailable: ['s', 'm', 'l', 'xl'],
          format: null,
          isDigital: false,
          albumId: null,
          status: 'active',
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-03T00:00:00Z',
          trackCount: null
        }
      ];
      localStorage.setItem('products', JSON.stringify(defaultProducts));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    // Legacy camelCase cartItems -> migrate into cart_items if present
    if (!localStorage.getItem('cart_items')) {
      const legacy = localStorage.getItem('cartItems');
      if (legacy) {
        localStorage.setItem('cart_items', legacy);
      } else {
        localStorage.setItem('cart_items', JSON.stringify([]));
      }
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Core tables from data model
    const tables = [
      'products',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'albums',
      'tracks',
      'playlists',
      'playlist_items',
      'videos',
      'events',
      'ticket_types',
      'articles',
      'reading_lists',
      'reading_list_items',
      'newsletter_subscriptions',
      'contact_messages'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // About content (single object)
    if (!localStorage.getItem('about_content')) {
      localStorage.setItem(
        'about_content',
        JSON.stringify({
          bioHtml: '',
          members: [],
          contactEmail: '',
          bookingEmail: '',
          supportInfoHtml: ''
        })
      );
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  // Utility: safe Date parsing
  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // Utility: slugify tags like "Tour Diary" -> "tour_diary" for matching
  _slugifyTag(tag) {
    if (!tag) return '';
    return String(tag)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = null;
    if (carts.length > 0) {
      // Pick the most recently updated cart
      carts.sort((a, b) => {
        const da = this._parseDate(a.updatedAt) || this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.updatedAt) || this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      });
      cart = carts[0];
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        currency: 'usd',
        subtotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        total: 0,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }

    return cart;
  }

  _recalculateCartTotals(cartId) {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');

    const cart = carts.find(c => c.id === cartId);
    if (!cart) {
      return null;
    }

    const items = cartItems.filter(item => item.cartId === cartId);
    let subtotal = 0;
    for (const item of items) {
      item.lineTotal = Number(item.unitPrice) * Number(item.quantity);
      subtotal += item.lineTotal;
    }

    const taxTotal = 0; // Tax logic can be added here if needed
    const discountTotal = 0; // Discounts can be implemented later
    const total = subtotal + taxTotal - discountTotal;

    cart.subtotal = subtotal;
    cart.taxTotal = taxTotal;
    cart.discountTotal = discountTotal;
    cart.total = total;
    cart.updatedAt = this._nowIso();

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('carts', carts);

    return cart;
  }

  // ----------------------
  // Reading list helpers
  // ----------------------

  _getOrCreateDefaultReadingList() {
    let readingLists = this._getFromStorage('reading_lists');
    let list = readingLists.find(rl => rl.isDefault === true);
    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        name: 'Reading List',
        description: 'Saved articles',
        isDefault: true,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      readingLists.push(list);
      this._saveToStorage('reading_lists', readingLists);
    }
    return list;
  }

  // ----------------------
  // Playlist helpers
  // ----------------------

  _getOrCreateSystemPlaylist(systemType, defaultName) {
    let playlists = this._getFromStorage('playlists');
    let playlist = playlists.find(
      pl => pl.isSystem === true && pl.systemType === systemType
    );
    if (!playlist) {
      playlist = {
        id: this._generateId('playlist'),
        name: defaultName,
        description: '',
        visibility: 'private',
        isSystem: true,
        systemType: systemType,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      playlists.push(playlist);
      this._saveToStorage('playlists', playlists);
    }
    return playlist;
  }

  _generateNextPlaylistItemPosition(playlistId) {
    const items = this._getFromStorage('playlist_items').filter(
      it => it.playlistId === playlistId
    );
    if (items.length === 0) return 1;
    let maxPos = 0;
    for (const it of items) {
      if (typeof it.position === 'number' && it.position > maxPos) {
        maxPos = it.position;
      }
    }
    return maxPos + 1;
  }

  // ----------------------
  // Foreign key resolution helpers
  // ----------------------

  _attachAlbumToProducts(products) {
    const albums = this._getFromStorage('albums');
    return products.map(p => ({
      ...p,
      album: p.albumId ? albums.find(a => a.id === p.albumId) || null : null
    }));
  }

  _attachAlbumToTracks(tracks) {
    const albums = this._getFromStorage('albums');
    return tracks.map(t => ({
      ...t,
      album: t.albumId ? albums.find(a => a.id === t.albumId) || null : null
    }));
  }

  _attachAlbumToVideos(videos) {
    const albums = this._getFromStorage('albums');
    return videos.map(v => ({
      ...v,
      album: v.albumId ? albums.find(a => a.id === v.albumId) || null : null
    }));
  }

  _attachEventToTicketTypes(ticketTypes, event) {
    return ticketTypes.map(tt => ({
      ...tt,
      event: event || null
    }));
  }

  _attachForeignKeysToPlaylistItems(items) {
    const tracks = this._getFromStorage('tracks');
    const videos = this._getFromStorage('videos');
    const albums = this._getFromStorage('albums');

    return items.map(item => {
      let track = null;
      let video = null;
      if (item.contentType === 'track' && item.trackId) {
        track = tracks.find(t => t.id === item.trackId) || null;
        if (track && track.albumId) {
          track = {
            ...track,
            album: albums.find(a => a.id === track.albumId) || null
          };
        }
      }
      if (item.contentType === 'video' && item.videoId) {
        video = videos.find(v => v.id === item.videoId) || null;
        if (video && video.albumId) {
          video = {
            ...video,
            album: albums.find(a => a.id === video.albumId) || null
          };
        }
      }
      return {
        ...item,
        track,
        video
      };
    });
  }

  // ----------------------
  // Interfaces implementation
  // ----------------------

  // getHomeContent()
  getHomeContent() {
    const albums = this._getFromStorage('albums').filter(a => a.status === 'published');
    const videos = this._getFromStorage('videos').filter(
      v => v.status === 'published' && v.videoType === 'music_video'
    );
    const events = this._getFromStorage('events').filter(
      e => e.status === 'scheduled' && e.ticketsOnSale === true
    );
    const productsRaw = this._getFromStorage('products').filter(
      p => p.status === 'active'
    );

    let latestAlbum = null;
    if (albums.length > 0) {
      albums.sort((a, b) => {
        const da = this._parseDate(a.releaseDate) || new Date(0);
        const db = this._parseDate(b.releaseDate) || new Date(0);
        return db - da;
      });
      const a = albums[0];
      latestAlbum = {
        id: a.id,
        title: a.title,
        subtitle: a.subtitle || '',
        description: a.description || '',
        coverImageUrl: a.coverImageUrl || '',
        releaseDate: a.releaseDate || null
      };
    }

    let latestVideo = null;
    if (videos.length > 0) {
      videos.sort((a, b) => {
        const da = this._parseDate(a.releaseDate) || new Date(0);
        const db = this._parseDate(b.releaseDate) || new Date(0);
        return db - da;
      });
      const v = videos[0];
      latestVideo = {
        id: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl || '',
        releaseDate: v.releaseDate,
        videoType: v.videoType
      };
    }

    let nextEvent = null;
    if (events.length > 0) {
      const now = new Date();
      const upcoming = events.filter(e => {
        const dt = this._parseDate(e.eventDateTime);
        return dt && dt >= now;
      });
      if (upcoming.length > 0) {
        upcoming.sort((a, b) => {
          const da = this._parseDate(a.eventDateTime) || new Date(8640000000000000);
          const db = this._parseDate(b.eventDateTime) || new Date(8640000000000000);
          return da - db;
        });
        const e = upcoming[0];
        nextEvent = {
          id: e.id,
          name: e.name,
          tourName: e.tourName || '',
          city: e.city,
          venueName: e.venueName,
          eventDateTime: e.eventDateTime
        };
      }
    }

    // Featured products: newest active products (limit 8)
    productsRaw.sort((a, b) => {
      const da = this._parseDate(a.createdAt) || new Date(0);
      const db = this._parseDate(b.createdAt) || new Date(0);
      return db - da;
    });
    const featuredProducts = this._attachAlbumToProducts(productsRaw.slice(0, 8));

    return {
      latestAlbum,
      latestVideo,
      nextEvent,
      featuredProducts
    };
  }

  // getStoreCategories()
  getStoreCategories() {
    // Static category metadata (not entity data)
    return [
      {
        categoryId: 'music',
        categoryLabel: 'Music',
        subcategories: [
          { subtype: 'digital_album', label: 'Digital Albums' },
          { subtype: 'vinyl_album', label: 'Vinyl' },
          { subtype: 'other_merch', label: 'Other Music Merch' }
        ]
      },
      {
        categoryId: 'apparel',
        categoryLabel: 'Apparel',
        subcategories: [
          { subtype: 't_shirt', label: 'T-Shirts' },
          { subtype: 'hoodie', label: 'Hoodies' },
          { subtype: 'other_merch', label: 'Other Apparel' }
        ]
      }
    ];
  }

  // getProductFilterOptions(categoryId, subtype)
  getProductFilterOptions(categoryId, subtype) {
    let products = this._getFromStorage('products').filter(p => p.status === 'active');
    if (categoryId) {
      products = products.filter(p => p.categoryId === categoryId);
    }
    if (subtype) {
      products = products.filter(p => p.subtype === subtype);
    }

    const sizesSet = new Set();
    const formatsSet = new Set();
    const currenciesSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    for (const p of products) {
      if (Array.isArray(p.sizesAvailable)) {
        p.sizesAvailable.forEach(s => sizesSet.add(s));
      }
      if (p.format) formatsSet.add(p.format);
      if (p.currency) currenciesSet.add(p.currency);
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }

    return {
      availableSizes: Array.from(sizesSet),
      availableFormats: Array.from(formatsSet),
      minPrice: minPrice === null ? 0 : minPrice,
      maxPrice: maxPrice === null ? 0 : maxPrice,
      currencies: Array.from(currenciesSet)
    };
  }

  // listProducts(categoryId, subtype, filters, sort)
  listProducts(categoryId, subtype, filters, sort) {
    filters = filters || {};
    let products = this._getFromStorage('products').filter(p => p.status === 'active');

    if (categoryId) {
      products = products.filter(p => p.categoryId === categoryId);
    }
    if (subtype) {
      products = products.filter(p => p.subtype === subtype);
    }
    if (filters.size) {
      products = products.filter(p =>
        Array.isArray(p.sizesAvailable) && p.sizesAvailable.includes(filters.size)
      );
    }
    if (filters.format) {
      products = products.filter(p => p.format === filters.format);
    }
    if (typeof filters.minPrice === 'number') {
      products = products.filter(p => typeof p.price === 'number' && p.price >= filters.minPrice);
    }
    if (typeof filters.maxPrice === 'number') {
      products = products.filter(p => typeof p.price === 'number' && p.price <= filters.maxPrice);
    }

    if (sort === 'price_low_to_high') {
      products.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_high_to_low') {
      products.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'newest_first') {
      products.sort((a, b) => {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      });
    }

    return this._attachAlbumToProducts(products);
  }

  // searchProducts(query, categoryId, filters, sort)
  searchProducts(query, categoryId, filters, sort) {
    filters = filters || {};
    const q = (query || '').toLowerCase();
    let products = this._getFromStorage('products').filter(p => p.status === 'active');

    if (categoryId) {
      products = products.filter(p => p.categoryId === categoryId);
    }

    if (q) {
      products = products.filter(p => {
        const text = [p.name, p.subtitle, p.description]
          .filter(Boolean)
          .join(' ') 
          .toLowerCase();
        return text.includes(q);
      });
    }

    if (filters.subtype) {
      products = products.filter(p => p.subtype === filters.subtype);
    }
    if (typeof filters.maxPrice === 'number') {
      products = products.filter(p => typeof p.price === 'number' && p.price <= filters.maxPrice);
    }

    if (sort === 'price_low_to_high') {
      products.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_high_to_low') {
      products.sort((a, b) => (b.price || 0) - (a.price || 0));
    } // 'relevance' can be default order

    return this._attachAlbumToProducts(products);
  }

  // getProductDetail(productId)
  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId);
    if (!product) return null;

    const albums = this._getFromStorage('albums');
    const tracks = this._getFromStorage('tracks');
    const album = product.albumId
      ? albums.find(a => a.id === product.albumId) || null
      : null;

    let tracklist = [];
    if (product.albumId) {
      const albumTracks = tracks
        .filter(t => t.albumId === product.albumId && t.status === 'published')
        .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));
      tracklist = albumTracks.map(t => ({
        id: t.id,
        title: t.title,
        trackNumber: t.trackNumber,
        durationSeconds: t.durationSeconds,
        isExplicit: t.isExplicit || false,
        album: album // foreign key resolution inside nested items
      }));
    }

    const categoryNames = {
      music: 'Music',
      apparel: 'Apparel'
    };
    const subtypeLabels = {
      t_shirt: 'T-Shirt',
      hoodie: 'Hoodie',
      digital_album: 'Digital Album',
      vinyl_album: 'Vinyl',
      other_merch: 'Merch'
    };

    return {
      id: product.id,
      name: product.name,
      subtitle: product.subtitle || '',
      description: product.description || '',
      categoryId: product.categoryId,
      categoryName: categoryNames[product.categoryId] || product.categoryId,
      subtype: product.subtype,
      subtypeLabel: subtypeLabels[product.subtype] || product.subtype,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl || '',
      sizesAvailable: product.sizesAvailable || [],
      format: product.format || null,
      isDigital: !!product.isDigital,
      trackCount: product.trackCount || null,
      albumId: product.albumId || null,
      albumTitle: album ? album.title : null,
      tracklist,
      album // foreign key resolution for albumId
    };
  }

  // addProductToCart(productId, quantity = 1, selectedSize, selectedFormat)
  addProductToCart(productId, quantity, selectedSize, selectedFormat) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId && p.status === 'active');
    if (!product) {
      return { success: false, cartItemId: null, message: 'Product not found or inactive' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const item = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'product',
      productId: product.id,
      ticketTypeId: null,
      name: product.name,
      unitPrice: product.price,
      quantity: qty,
      lineTotal: product.price * qty,
      selectedSize: selectedSize || null,
      selectedFormat: selectedFormat || null,
      eventId: null,
      ticketTypeName: null,
      addedAt: this._nowIso()
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart.id);

    return { success: true, cartItemId: item.id, message: 'Added to cart' };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(
      item => item.cartId === cart.id
    );
    const products = this._getFromStorage('products');
    const ticketTypes = this._getFromStorage('ticket_types');
    const events = this._getFromStorage('events');

    const items = cartItems.map(item => {
      let product = null;
      let ticketType = null;
      let event = null;
      let eventName = null;

      if (item.productId) {
        product = products.find(p => p.id === item.productId) || null;
      }
      if (item.ticketTypeId) {
        ticketType = ticketTypes.find(t => t.id === item.ticketTypeId) || null;
        if (ticketType && ticketType.eventId) {
          event = events.find(e => e.id === ticketType.eventId) || null;
          eventName = event ? event.name : null;
        }
      } else if (item.eventId) {
        event = events.find(e => e.id === item.eventId) || null;
        eventName = event ? event.name : null;
      }

      return {
        cartItemId: item.id,
        itemType: item.itemType,
        productId: item.productId,
        ticketTypeId: item.ticketTypeId,
        name: item.name,
        ticketTypeName: item.ticketTypeName || (ticketType ? ticketType.name : null),
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        selectedSize: item.selectedSize,
        selectedFormat: item.selectedFormat,
        eventId: item.eventId || (ticketType ? ticketType.eventId : null),
        eventName,
        product,
        ticketType,
        event
      };
    });

    // Ensure totals are up to date
    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    return {
      cartId: updatedCart.id,
      currency: updatedCart.currency,
      items,
      subtotal: updatedCart.subtotal,
      taxTotal: updatedCart.taxTotal,
      discountTotal: updatedCart.discountTotal,
      total: updatedCart.total
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return { success: false, updatedItem: null, subtotal: 0, total: 0 };
    }

    if (quantity <= 0) {
      // Remove item if quantity is zero or negative
      const idx = cartItems.findIndex(ci => ci.id === cartItemId);
      if (idx !== -1) {
        cartItems.splice(idx, 1);
      }
      this._saveToStorage('cart_items', cartItems);
      const cart = this._recalculateCartTotals(item.cartId);
      return {
        success: true,
        updatedItem: null,
        subtotal: cart ? cart.subtotal : 0,
        total: cart ? cart.total : 0
      };
    }

    item.quantity = quantity;
    item.lineTotal = item.unitPrice * item.quantity;
    this._saveToStorage('cart_items', cartItems);
    const cart = this._recalculateCartTotals(item.cartId);

    return {
      success: true,
      updatedItem: {
        cartItemId: item.id,
        quantity: item.quantity,
        lineTotal: item.lineTotal
      },
      subtotal: cart ? cart.subtotal : 0,
      total: cart ? cart.total : 0
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, subtotal: 0, total: 0, remainingItemsCount: cartItems.length };
    }
    const cartId = cartItems[idx].cartId;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);
    const cart = this._recalculateCartTotals(cartId);

    return {
      success: true,
      subtotal: cart ? cart.subtotal : 0,
      total: cart ? cart.total : 0,
      remainingItemsCount: cartItems.filter(ci => ci.cartId === cartId).length
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(
      item => item.cartId === cart.id
    );

    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    const items = cartItems.map(item => ({
      cartItemId: item.id,
      itemType: item.itemType,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal
    }));

    return {
      cartId: updatedCart.id,
      currency: updatedCart.currency,
      items,
      subtotal: updatedCart.subtotal,
      taxTotal: updatedCart.taxTotal,
      discountTotal: updatedCart.discountTotal,
      total: updatedCart.total
    };
  }

  // placeOrder(billingName, billingEmail, billingAddress, deliveryDetails)
  placeOrder(billingName, billingEmail, billingAddress, deliveryDetails) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(
      item => item.cartId === cart.id
    );

    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const itemsCount = cartItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const order = {
      id: this._generateId('order'),
      status: 'pending_payment',
      currency: cart.currency,
      subtotal: cart.subtotal,
      taxTotal: cart.taxTotal,
      discountTotal: cart.discountTotal,
      total: cart.total,
      itemsCount,
      billingName: billingName || null,
      billingEmail: billingEmail || null,
      billingAddress: billingAddress || null,
      deliveryDetails: deliveryDetails || null,
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    orders.push(order);

    for (const ci of cartItems) {
      orderItems.push({
        id: this._generateId('order_item'),
        orderId: order.id,
        itemType: ci.itemType,
        productId: ci.productId || null,
        ticketTypeId: ci.ticketTypeId || null,
        name: ci.name,
        unitPrice: ci.unitPrice,
        quantity: ci.quantity,
        lineTotal: ci.lineTotal
      });
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart items and reset cart totals
    const allCartItems = this._getFromStorage('cart_items');
    const remainingCartItems = allCartItems.filter(ci => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);

    const carts = this._getFromStorage('carts');
    const cartRef = carts.find(c => c.id === cart.id);
    if (cartRef) {
      cartRef.subtotal = 0;
      cartRef.taxTotal = 0;
      cartRef.discountTotal = 0;
      cartRef.total = 0;
      cartRef.updatedAt = this._nowIso();
      this._saveToStorage('carts', carts);
    }

    return {
      orderId: order.id,
      status: order.status,
      total: order.total,
      currency: order.currency
    };
  }

  // listAlbums(sort)
  listAlbums(sort) {
    let albums = this._getFromStorage('albums').filter(a => a.status === 'published');
    if (sort === 'release_date_desc') {
      albums.sort((a, b) => {
        const da = this._parseDate(a.releaseDate) || new Date(0);
        const db = this._parseDate(b.releaseDate) || new Date(0);
        return db - da;
      });
    } else if (sort === 'release_date_asc') {
      albums.sort((a, b) => {
        const da = this._parseDate(a.releaseDate) || new Date(0);
        const db = this._parseDate(b.releaseDate) || new Date(0);
        return da - db;
      });
    } else {
      // default: sortOrder asc, then releaseDate desc
      albums.sort((a, b) => {
        const soA = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const soB = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        if (soA !== soB) return soA - soB;
        const da = this._parseDate(a.releaseDate) || new Date(0);
        const db = this._parseDate(b.releaseDate) || new Date(0);
        return db - da;
      });
    }
    return albums;
  }

  // getAlbumDetail(albumId)
  getAlbumDetail(albumId) {
    const albums = this._getFromStorage('albums');
    const album = albums.find(a => a.id === albumId);
    if (!album) return null;

    const tracksRaw = this._getFromStorage('tracks')
      .filter(t => t.albumId === albumId && t.status === 'published')
      .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

    const tracks = this._attachAlbumToTracks(tracksRaw);

    return {
      album: {
        id: album.id,
        title: album.title,
        subtitle: album.subtitle || '',
        description: album.description || '',
        coverImageUrl: album.coverImageUrl || '',
        releaseDate: album.releaseDate || null,
        totalTracks: album.totalTracks || null
      },
      tracks
    };
  }

  // listPlaylists()
  listPlaylists() {
    return this._getFromStorage('playlists');
  }

  // createPlaylist(name, description, visibility)
  createPlaylist(name, description, visibility) {
    const playlists = this._getFromStorage('playlists');
    const playlist = {
      id: this._generateId('playlist'),
      name: name,
      description: description || '',
      visibility: visibility || 'private',
      isSystem: false,
      systemType: null,
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);

    return {
      playlistId: playlist.id,
      name: playlist.name,
      isSystem: playlist.isSystem
    };
  }

  // addTrackToPlaylist(trackId, playlistId)
  addTrackToPlaylist(trackId, playlistId) {
    const tracks = this._getFromStorage('tracks');
    const playlists = this._getFromStorage('playlists');
    const track = tracks.find(t => t.id === trackId);
    const playlist = playlists.find(p => p.id === playlistId);
    if (!track || !playlist) {
      return { playlistItemId: null, position: null, playlistId: playlistId };
    }

    const playlistItems = this._getFromStorage('playlist_items');
    const position = this._generateNextPlaylistItemPosition(playlistId);

    const playlistItem = {
      id: this._generateId('playlist_item'),
      playlistId: playlistId,
      contentType: 'track',
      trackId: trackId,
      videoId: null,
      position: position,
      addedAt: this._nowIso(),
      notes: null
    };

    playlistItems.push(playlistItem);
    this._saveToStorage('playlist_items', playlistItems);

    return {
      playlistItemId: playlistItem.id,
      position: playlistItem.position,
      playlistId: playlistId
    };
  }

  // addVideoToPlaylist(videoId, playlistId)
  addVideoToPlaylist(videoId, playlistId) {
    const videos = this._getFromStorage('videos');
    const playlists = this._getFromStorage('playlists');
    const video = videos.find(v => v.id === videoId);
    const playlist = playlists.find(p => p.id === playlistId);
    if (!video || !playlist) {
      return { playlistItemId: null, position: null, playlistId: playlistId };
    }

    const playlistItems = this._getFromStorage('playlist_items');
    const position = this._generateNextPlaylistItemPosition(playlistId);

    const playlistItem = {
      id: this._generateId('playlist_item'),
      playlistId: playlistId,
      contentType: 'video',
      trackId: null,
      videoId: videoId,
      position: position,
      addedAt: this._nowIso(),
      notes: null
    };

    playlistItems.push(playlistItem);
    this._saveToStorage('playlist_items', playlistItems);

    return {
      playlistItemId: playlistItem.id,
      position: playlistItem.position,
      playlistId: playlistId
    };
  }

  // getPlaylistDetail(playlistId)
  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return null;

    const allItems = this._getFromStorage('playlist_items').filter(
      it => it.playlistId === playlistId
    );
    allItems.sort((a, b) => (a.position || 0) - (b.position || 0));

    const itemsWithFK = this._attachForeignKeysToPlaylistItems(allItems);

    return {
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        visibility: playlist.visibility || 'private',
        isSystem: !!playlist.isSystem
      },
      items: itemsWithFK
    };
  }

  // removePlaylistItem(playlistItemId)
  removePlaylistItem(playlistItemId) {
    const playlistItems = this._getFromStorage('playlist_items');
    const idx = playlistItems.findIndex(it => it.id === playlistItemId);
    if (idx === -1) {
      return { success: false };
    }
    playlistItems.splice(idx, 1);
    this._saveToStorage('playlist_items', playlistItems);
    return { success: true };
  }

  // reorderPlaylistItems(playlistId, orderedPlaylistItemIds)
  reorderPlaylistItems(playlistId, orderedPlaylistItemIds) {
    const playlistItems = this._getFromStorage('playlist_items');
    const idSet = new Set(orderedPlaylistItemIds || []);

    // Only update items that belong to this playlist and are in the provided list
    let position = 1;
    for (const id of orderedPlaylistItemIds || []) {
      const item = playlistItems.find(it => it.id === id && it.playlistId === playlistId);
      if (item) {
        item.position = position++;
      }
    }

    this._saveToStorage('playlist_items', playlistItems);
    return { success: true };
  }

  // listVideos(sort, filters)
  listVideos(sort, filters) {
    filters = filters || {};
    let videos = this._getFromStorage('videos').filter(v => v.status === 'published');

    if (filters.videoType) {
      videos = videos.filter(v => v.videoType === filters.videoType);
    }
    if (filters.albumId) {
      videos = videos.filter(v => v.albumId === filters.albumId);
    }

    if (sort === 'release_date_newest_first') {
      videos.sort((a, b) => {
        const da = this._parseDate(a.releaseDate) || new Date(0);
        const db = this._parseDate(b.releaseDate) || new Date(0);
        return db - da;
      });
    } else if (sort === 'release_date_oldest_first') {
      videos.sort((a, b) => {
        const da = this._parseDate(a.releaseDate) || new Date(0);
        const db = this._parseDate(b.releaseDate) || new Date(0);
        return da - db;
      });
    }

    return this._attachAlbumToVideos(videos);
  }

  // getVideoDetail(videoId)
  getVideoDetail(videoId) {
    const videos = this._getFromStorage('videos');
    const video = videos.find(v => v.id === videoId);
    if (!video) return null;

    const albums = this._getFromStorage('albums');
    const album = video.albumId ? albums.find(a => a.id === video.albumId) || null : null;

    return {
      id: video.id,
      title: video.title,
      description: video.description || '',
      thumbnailUrl: video.thumbnailUrl || '',
      videoUrl: video.videoUrl,
      releaseDate: video.releaseDate,
      durationSeconds: video.durationSeconds || null,
      videoType: video.videoType,
      albumId: video.albumId || null,
      albumTitle: album ? album.title : null,
      album // foreign key resolution
    };
  }

  // listTourEvents(city, startDate, endDate, onlyOnSale)
  listTourEvents(city, startDate, endDate, onlyOnSale) {
    let events = this._getFromStorage('events');

    if (city) {
      const c = city.toLowerCase();
      events = events.filter(e => (e.city || '').toLowerCase() === c);
    }

    if (startDate) {
      const start = this._parseDate(startDate);
      if (start) {
        events = events.filter(e => {
          const dt = this._parseDate(e.eventDateTime);
          return dt && dt >= start;
        });
      }
    }

    if (endDate) {
      const end = this._parseDate(endDate);
      if (end) {
        events = events.filter(e => {
          const dt = this._parseDate(e.eventDateTime);
          return dt && dt <= end;
        });
      }
    }

    if (onlyOnSale) {
      events = events.filter(e => e.ticketsOnSale === true);
    }

    // sort by date ascending
    events.sort((a, b) => {
      const da = this._parseDate(a.eventDateTime) || new Date(8640000000000000);
      const db = this._parseDate(b.eventDateTime) || new Date(8640000000000000);
      return da - db;
    });

    return events;
  }

  // getEventDetail(eventId, ticketSort)
  getEventDetail(eventId, ticketSort) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId);
    if (!event) return null;

    let ticketTypes = this._getFromStorage('ticket_types').filter(
      t => t.eventId === eventId && t.isAvailable === true
    );

    if (ticketSort === 'price_low_to_high') {
      ticketTypes.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (ticketSort === 'price_high_to_low') {
      ticketTypes.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else {
      ticketTypes.sort((a, b) => {
        const soA = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const soB = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        if (soA !== soB) return soA - soB;
        return (a.price || 0) - (b.price || 0);
      });
    }

    const ticketTypesWithEvent = this._attachEventToTicketTypes(ticketTypes, event);

    return {
      event: {
        id: event.id,
        name: event.name,
        tourName: event.tourName || '',
        city: event.city,
        venueName: event.venueName,
        country: event.country || '',
        eventDateTime: event.eventDateTime,
        status: event.status,
        ticketsOnSale: event.ticketsOnSale,
        description: event.description || ''
      },
      ticketTypes: ticketTypesWithEvent
    };
  }

  // addTicketsToCart(ticketTypeId, quantity)
  addTicketsToCart(ticketTypeId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const ticketTypes = this._getFromStorage('ticket_types');
    const events = this._getFromStorage('events');
    const ticketType = ticketTypes.find(t => t.id === ticketTypeId && t.isAvailable === true);
    if (!ticketType) {
      return { success: false, cartItemId: null, message: 'Ticket type not found or unavailable' };
    }
    const event = events.find(e => e.id === ticketType.eventId) || null;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const name = event ? `${event.name} - ${ticketType.name}` : ticketType.name;

    const item = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      itemType: 'ticket',
      productId: null,
      ticketTypeId: ticketType.id,
      name: name,
      unitPrice: ticketType.price,
      quantity: qty,
      lineTotal: ticketType.price * qty,
      selectedSize: null,
      selectedFormat: null,
      eventId: ticketType.eventId,
      ticketTypeName: ticketType.name,
      addedAt: this._nowIso()
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart.id);

    return { success: true, cartItemId: item.id, message: 'Tickets added to cart' };
  }

  // listArticles(tag, year, category, sort)
  listArticles(tag, year, category, sort) {
    let articles = this._getFromStorage('articles').filter(
      a => a.status === 'published'
    );

    if (tag) {
      const tagSlug = this._slugifyTag(tag);
      articles = articles.filter(a => {
        if (!Array.isArray(a.tags)) return false;
        return a.tags.some(t => this._slugifyTag(t) === tagSlug);
      });
    }

    if (typeof year === 'number') {
      articles = articles.filter(a => {
        const d = this._parseDate(a.publishedAt);
        return d && d.getUTCFullYear() === year;
      });
    }

    if (category) {
      articles = articles.filter(a => a.category === category);
    }

    if (sort === 'published_at_desc') {
      articles.sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return db - da;
      });
    } else if (sort === 'published_at_asc') {
      articles.sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return da - db;
      });
    }

    return articles;
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return {
        article: null,
        isSavedToReadingList: false
      };
    }

    const readingList = this._getOrCreateDefaultReadingList();
    const readingListItems = this._getFromStorage('reading_list_items');
    const isSaved = readingListItems.some(
      it => it.readingListId === readingList.id && it.articleId === articleId
    );

    // Instrumentation for task completion tracking
    try {
      const isPublished = article.status === 'published';
      const hasTourDiaryTag =
        Array.isArray(article.tags) &&
        article.tags.some(t => this._slugifyTag(t) === 'tour_diary');
      const publishedDate = this._parseDate(article.publishedAt);
      const isPublishedIn2024 = !!(publishedDate && publishedDate.getUTCFullYear() === 2024);

      if (isPublished && hasTourDiaryTag && isPublishedIn2024 && isSaved) {
        localStorage.setItem(
          'task7_openedSavedTourDiary2024Article',
          JSON.stringify({ "articleId": article.id, "openedAt": this._nowIso() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug || '',
        excerpt: article.excerpt || '',
        content: article.content,
        heroImageUrl: article.heroImageUrl || '',
        publishedAt: article.publishedAt,
        tags: article.tags || [],
        category: article.category || '',
        authorName: article.authorName || ''
      },
      isSavedToReadingList: isSaved
    };
  }

  // saveArticleToReadingList(articleId, note)
  saveArticleToReadingList(articleId, note) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { readingListItemId: null, readingListId: null };
    }

    const readingList = this._getOrCreateDefaultReadingList();
    const readingListItems = this._getFromStorage('reading_list_items');

    const item = {
      id: this._generateId('reading_list_item'),
      readingListId: readingList.id,
      articleId: articleId,
      savedAt: this._nowIso(),
      notes: note || null
    };

    readingListItems.push(item);
    this._saveToStorage('reading_list_items', readingListItems);

    return {
      readingListItemId: item.id,
      readingListId: readingList.id
    };
  }

  // getReadingListArticles()
  getReadingListArticles() {
    const readingList = this._getOrCreateDefaultReadingList();
    const readingListItems = this._getFromStorage('reading_list_items').filter(
      it => it.readingListId === readingList.id
    );
    const articles = this._getFromStorage('articles');

    readingListItems.sort((a, b) => {
      const da = this._parseDate(a.savedAt) || new Date(0);
      const db = this._parseDate(b.savedAt) || new Date(0);
      return db - da;
    });

    const items = readingListItems.map(it => {
      const article = articles.find(a => a.id === it.articleId) || null;
      return {
        readingListItemId: it.id,
        article: article
          ? {
              id: article.id,
              title: article.title,
              publishedAt: article.publishedAt,
              tags: article.tags || []
            }
          : null,
        savedAt: it.savedAt
      };
    });

    return {
      readingList: {
        id: readingList.id,
        name: readingList.name,
        description: readingList.description || ''
      },
      items
    };
  }

  // removeArticleFromReadingList(readingListItemId)
  removeArticleFromReadingList(readingListItemId) {
    const readingListItems = this._getFromStorage('reading_list_items');
    const idx = readingListItems.findIndex(it => it.id === readingListItemId);
    if (idx === -1) {
      return { success: false };
    }
    readingListItems.splice(idx, 1);
    this._saveToStorage('reading_list_items', readingListItems);
    return { success: true };
  }

  // submitNewsletterSubscription(name, email, interests, region, frequency)
  submitNewsletterSubscription(name, email, interests, region, frequency) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    const subscription = {
      id: this._generateId('newsletter_subscription'),
      name: name || null,
      email: email,
      interests: Array.isArray(interests) ? interests : [],
      region: region || null,
      frequency: frequency,
      confirmed: false,
      createdAt: this._nowIso()
    };
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscriptionId: subscription.id,
      confirmed: subscription.confirmed,
      message: 'Subscription received'
    };
  }

  // getAboutContent()
  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    if (!raw) {
      return {
        bioHtml: '',
        members: [],
        contactEmail: '',
        bookingEmail: '',
        supportInfoHtml: ''
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        bioHtml: obj.bioHtml || '',
        members: Array.isArray(obj.members) ? obj.members : [],
        contactEmail: obj.contactEmail || '',
        bookingEmail: obj.bookingEmail || '',
        supportInfoHtml: obj.supportInfoHtml || ''
      };
    } catch (e) {
      return {
        bioHtml: '',
        members: [],
        contactEmail: '',
        bookingEmail: '',
        supportInfoHtml: ''
      };
    }
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    const msgs = this._getFromStorage('contact_messages');
    const msg = {
      id: this._generateId('contact_message'),
      name: name,
      email: email,
      topic: topic || null,
      message: message,
      createdAt: this._nowIso()
    };
    msgs.push(msg);
    this._saveToStorage('contact_messages', msgs);

    return {
      success: true,
      messageId: msg.id
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