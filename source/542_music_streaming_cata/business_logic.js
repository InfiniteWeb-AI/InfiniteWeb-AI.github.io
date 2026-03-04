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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keysWithDefaultArray = [
      'artists',
      'genres',
      'mood_tags',
      'tracks',
      'albums',
      'concert_videos',
      'bundles',
      'purchase_options',
      'playlists',
      'playlist_tracks',
      'wishlist_items',
      'cart_items',
      'subscription_plans',
      'subscriptions',
      'promo_codes',
      'payment_methods',
      'billing_addresses',
      'orders',
      'order_items',
      'static_pages',
      'contact_tickets'
    ];

    keysWithDefaultArray.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singletons
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
    }
    if (!localStorage.getItem('wishlist')) {
      localStorage.setItem('wishlist', 'null');
    }
    if (!localStorage.getItem('account_settings')) {
      localStorage.setItem('account_settings', 'null');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
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

  // -------------------- Entity lookups --------------------

  _getAllArtists() {
    return this._getFromStorage('artists', []);
  }

  _getAllGenres() {
    return this._getFromStorage('genres', []);
  }

  _getAllMoodTags() {
    return this._getFromStorage('mood_tags', []);
  }

  _getAllTracks() {
    return this._getFromStorage('tracks', []);
  }

  _getAllAlbums() {
    return this._getFromStorage('albums', []);
  }

  _getAllConcertVideos() {
    return this._getFromStorage('concert_videos', []);
  }

  _getAllBundles() {
    return this._getFromStorage('bundles', []);
  }

  _getAllPurchaseOptions() {
    return this._getFromStorage('purchase_options', []);
  }

  _getAllPlaylists() {
    return this._getFromStorage('playlists', []);
  }

  _getAllPlaylistTracks() {
    return this._getFromStorage('playlist_tracks', []);
  }

  _getAllWishlistItems() {
    return this._getFromStorage('wishlist_items', []);
  }

  _getAllCartItems() {
    return this._getFromStorage('cart_items', []);
  }

  _getAllSubscriptionPlans() {
    return this._getFromStorage('subscription_plans', []);
  }

  _getAllSubscriptions() {
    return this._getFromStorage('subscriptions', []);
  }

  _getAllPromoCodes() {
    return this._getFromStorage('promo_codes', []);
  }

  _getAllPaymentMethods() {
    return this._getFromStorage('payment_methods', []);
  }

  _getAllBillingAddresses() {
    return this._getFromStorage('billing_addresses', []);
  }

  _getAllOrders() {
    return this._getFromStorage('orders', []);
  }

  _getAllOrderItems() {
    return this._getFromStorage('order_items', []);
  }

  // -------------------- Relationship resolution --------------------

  _attachEntityRelations(entityName, obj) {
    if (!obj || typeof obj !== 'object') return obj;
    // We only handle belongs_to with *_id
    const relationships = [
      { from: 'Track', to: 'Artist', type: 'belongs_to', field: 'artist_id', storage: 'artists' },
      { from: 'Track', to: 'Genre', type: 'belongs_to', field: 'primary_genre_id', storage: 'genres' },
      { from: 'Track', to: 'Album', type: 'belongs_to', field: 'album_id', storage: 'albums' },
      { from: 'Album', to: 'Artist', type: 'belongs_to', field: 'artist_id', storage: 'artists' },
      { from: 'Album', to: 'Genre', type: 'belongs_to', field: 'primary_genre_id', storage: 'genres' },
      { from: 'ConcertVideo', to: 'Artist', type: 'belongs_to', field: 'artist_id', storage: 'artists' },
      { from: 'ConcertVideo', to: 'Genre', type: 'belongs_to', field: 'primary_genre_id', storage: 'genres' },
      { from: 'Bundle', to: 'Genre', type: 'belongs_to', field: 'primary_genre_id', storage: 'genres' },
      { from: 'PlaylistTrack', to: 'Playlist', type: 'belongs_to', field: 'playlist_id', storage: 'playlists' },
      { from: 'PlaylistTrack', to: 'Track', type: 'belongs_to', field: 'track_id', storage: 'tracks' },
      { from: 'WishlistItem', to: 'Wishlist', type: 'belongs_to', field: 'wishlist_id', storage: 'wishlist' },
      { from: 'CartItem', to: 'Cart', type: 'belongs_to', field: 'cart_id', storage: 'cart' },
      { from: 'CartItem', to: 'PurchaseOption', type: 'belongs_to', field: 'purchase_option_id', storage: 'purchase_options' },
      { from: 'Subscription', to: 'SubscriptionPlan', type: 'belongs_to', field: 'subscription_plan_id', storage: 'subscription_plans' },
      { from: 'OrderItem', to: 'Order', type: 'belongs_to', field: 'order_id', storage: 'orders' },
      { from: 'OrderItem', to: 'PurchaseOption', type: 'belongs_to', field: 'purchase_option_id', storage: 'purchase_options' },
      { from: 'Order', to: 'Cart', type: 'belongs_to', field: 'cart_id', storage: 'cart' },
      { from: 'Order', to: 'SubscriptionPlan', type: 'belongs_to', field: 'subscription_plan_id', storage: 'subscription_plans' },
      { from: 'Order', to: 'PaymentMethod', type: 'belongs_to', field: 'payment_method_id', storage: 'payment_methods' },
      { from: 'Order', to: 'BillingAddress', type: 'belongs_to', field: 'billing_address_id', storage: 'billing_addresses' },
      { from: 'Cart', to: 'PromoCode', type: 'belongs_to', field: 'promo_code', storage: 'promo_codes', isByCode: true },
      { from: 'Order', to: 'PromoCode', type: 'belongs_to', field: 'promo_code', storage: 'promo_codes', isByCode: true },
      { from: 'AccountSettings', to: 'Genre', type: 'has_many', field: 'favorite_genre_ids', storage: 'genres' }
    ];

    const cloned = Object.assign({}, obj);
    const relevant = relationships.filter((r) => r.from === entityName);

    relevant.forEach((rel) => {
      if (rel.type === 'belongs_to') {
        const fkField = rel.field;
        if (typeof cloned[fkField] === 'undefined' || cloned[fkField] === null) {
          const baseName = fkField.replace(/_id$/, '').replace(/Id$/, '');
          cloned[baseName] = null;
          return;
        }
        const baseName = fkField.replace(/_id$/, '').replace(/Id$/, '');
        let targetCollection;
        if (rel.storage === 'cart') {
          targetCollection = this._getFromStorage('cart', null);
          // singleton
          cloned[baseName] = targetCollection && targetCollection.id === cloned[fkField]
            ? targetCollection
            : null;
          return;
        }
        if (rel.storage === 'wishlist') {
          const wl = this._getFromStorage('wishlist', null);
          cloned[baseName] = wl && wl.id === cloned[fkField] ? wl : null;
          return;
        }
        const collection = this._getFromStorage(rel.storage, []);
        if (rel.isByCode) {
          cloned[baseName] = collection.find((x) => x.code === cloned[fkField]) || null;
        } else {
          cloned[baseName] = collection.find((x) => x.id === cloned[fkField]) || null;
        }
      } else if (rel.type === 'has_many' && rel.field === 'favorite_genre_ids') {
        const ids = cloned[rel.field] || [];
        const collection = this._getFromStorage(rel.storage, []);
        cloned['favorite_genres'] = ids.map((id) => collection.find((g) => g.id === id)).filter(Boolean);
      }
    });

    return cloned;
  }

  _resolveMoodTags(moodTagIds) {
    const moodTags = this._getAllMoodTags();
    if (!Array.isArray(moodTagIds)) return [];
    return moodTagIds.map((id) => moodTags.find((m) => m.id === id)).filter(Boolean);
  }

  // -------------------- Cart helpers --------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    const now = this._nowISO();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        cart_item_ids: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        promo_code: null,
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const allCartItems = this._getAllCartItems();
    const items = allCartItems.filter((ci) => ci.cart_id === cart.id);

    let subtotal = 0;
    items.forEach((item) => {
      subtotal += (item.unit_price || 0) * (item.quantity || 0);
    });

    cart.subtotal = subtotal;

    let discount_total = 0;
    if (cart.promo_code) {
      const validation = this._validateAndNormalizePromoCode(cart, cart.promo_code, items);
      if (validation.valid) {
        discount_total = validation.discount_total;
        cart.promo_code = validation.normalized_code;
      } else {
        cart.promo_code = null;
      }
    }

    cart.discount_total = discount_total;
    cart.total = Math.max(subtotal - discount_total, 0);
    cart.updated_at = this._nowISO();

    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', allCartItems);
  }

  _buildCartSummary(cart) {
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        currency: 'USD',
        promo_code: null,
        messages: []
      };
    }
    const purchaseOptions = this._getAllPurchaseOptions();
    const tracks = this._getAllTracks();
    const albums = this._getAllAlbums();
    const videos = this._getAllConcertVideos();
    const bundles = this._getAllBundles();
    const artists = this._getAllArtists();

    const allCartItems = this._getAllCartItems();
    const cartItems = allCartItems.filter((ci) => ci.cart_id === cart.id);

    const items = cartItems.map((ci) => {
      const po = purchaseOptions.find((p) => p.id === ci.purchase_option_id) || null;
      let baseItem = null;
      let artistName = '';
      if (ci.item_type === 'track') {
        baseItem = tracks.find((t) => t.id === ci.item_id) || null;
      } else if (ci.item_type === 'album') {
        baseItem = albums.find((a) => a.id === ci.item_id) || null;
      } else if (ci.item_type === 'concert_video') {
        baseItem = videos.find((v) => v.id === ci.item_id) || null;
      } else if (ci.item_type === 'bundle') {
        baseItem = bundles.find((b) => b.id === ci.item_id) || null;
      } else if (ci.item_type === 'subscription_plan') {
        const plans = this._getAllSubscriptionPlans();
        baseItem = plans.find((p) => p.id === ci.item_id) || null;
      }

      if (baseItem && baseItem.artist_id) {
        const artist = artists.find((a) => a.id === baseItem.artist_id);
        artistName = artist ? artist.name : '';
      }

      const lineSubtotal = (ci.unit_price || 0) * (ci.quantity || 0);

      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        item_id: ci.item_id,
        title: baseItem ? baseItem.title || baseItem.name : '',
        artist_name: artistName,
        purchase_type: ci.purchase_type,
        format: po ? po.format : null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: lineSubtotal,
        purchase_option: po ? Object.assign({}, po) : null,
        item: baseItem ? this._resolveItemForCart(ci.item_type, baseItem) : null
      };
    });

    const currency = items.length && items[0].purchase_option && items[0].purchase_option.currency
      ? items[0].purchase_option.currency
      : 'USD';

    return {
      cart_id: cart.id,
      items,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      total: cart.total,
      currency,
      promo_code: cart.promo_code || null,
      messages: []
    };
  }

  _resolveItemForCart(itemType, item) {
    if (!item) return null;
    if (itemType === 'track') return this._attachEntityRelations('Track', item);
    if (itemType === 'album') return this._attachEntityRelations('Album', item);
    if (itemType === 'concert_video') return this._attachEntityRelations('ConcertVideo', item);
    if (itemType === 'bundle') return this._attachEntityRelations('Bundle', item);
    if (itemType === 'subscription_plan') return item;
    return item;
  }

  // Validate promo code and compute discount
  _validateAndNormalizePromoCode(cart, code, cartItems) {
    const result = {
      valid: false,
      normalized_code: code,
      discount_total: 0,
      message: ''
    };

    if (!code) {
      result.message = 'No promo code provided.';
      return result;
    }

    const promoCodes = this._getAllPromoCodes();
    const promo = promoCodes.find((p) => typeof p.code === 'string' && p.code.toLowerCase() === String(code).toLowerCase());

    if (!promo) {
      result.message = 'Promo code not found.';
      return result;
    }

    if (!promo.is_active) {
      result.message = 'Promo code is inactive.';
      return result;
    }

    if (promo.expires_at) {
      const now = new Date();
      const exp = new Date(promo.expires_at);
      if (now > exp) {
        result.message = 'Promo code has expired.';
        return result;
      }
    }

    // Determine eligible subtotal based on applies_to
    let eligibleSubtotal = 0;
    const purchaseOptions = this._getAllPurchaseOptions();

    (cartItems || []).forEach((ci) => {
      const po = purchaseOptions.find((p) => p.id === ci.purchase_option_id);
      if (!po) return;

      const itemType = ci.item_type; // track, album, concert_video, bundle, subscription_plan
      let eligible = false;

      if (promo.applies_to === 'all') {
        eligible = true;
      } else if (promo.applies_to === 'tracks' && itemType === 'track') {
        eligible = true;
      } else if (promo.applies_to === 'albums' && itemType === 'album') {
        eligible = true;
      } else if (promo.applies_to === 'bundles' && itemType === 'bundle') {
        eligible = true;
      } else if (promo.applies_to === 'concert_videos' && itemType === 'concert_video') {
        eligible = true;
      } else if (promo.applies_to === 'subscriptions' && itemType === 'subscription_plan') {
        eligible = true;
      }

      if (eligible) {
        eligibleSubtotal += (ci.unit_price || 0) * (ci.quantity || 0);
      }
    });

    if (promo.min_order_total && eligibleSubtotal < promo.min_order_total) {
      result.message = 'Order total does not meet minimum for this promo code.';
      return result;
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (eligibleSubtotal * promo.discount_value) / 100;
    } else if (promo.discount_type === 'fixed_amount') {
      discount = Math.min(promo.discount_value, eligibleSubtotal);
    }

    result.valid = discount > 0;
    result.discount_total = discount;
    result.normalized_code = promo.code;
    result.message = result.valid ? 'Promo code applied.' : 'Promo code did not apply to any items.';
    return result;
  }

  // -------------------- Wishlist helper --------------------

  _getOrCreateWishlist() {
    let wishlist = this._getFromStorage('wishlist', null);
    if (!wishlist) {
      const now = this._nowISO();
      wishlist = {
        id: this._generateId('wishlist'),
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('wishlist', wishlist);
    }
    return wishlist;
  }

  // -------------------- Account settings helper --------------------

  _getOrCreateAccountSettings() {
    let settings = this._getFromStorage('account_settings', null);
    if (!settings) {
      settings = {
        id: this._generateId('acctsettings'),
        favorite_genre_ids: [],
        preferred_language: 'en',
        filter_explicit_content: false,
        notification_new_releases: true,
        notification_promotions_discounts: true,
        notification_product_news_tips: true,
        updated_at: this._nowISO()
      };
      this._saveToStorage('account_settings', settings);
    }
    return settings;
  }

  // -------------------- Payment helper --------------------

  _detectCardBrand(cardNumber) {
    const num = String(cardNumber || '').replace(/\s+/g, '');
    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(num)) return 'visa';
    if (/^5[1-5][0-9]{14}$/.test(num)) return 'mastercard';
    if (/^3[47][0-9]{13}$/.test(num)) return 'amex';
    if (/^6(?:011|5[0-9]{2})[0-9]{12}$/.test(num)) return 'discover';
    return 'other';
  }

  // -------------------- Purchase options helpers --------------------

  _getPurchaseOptionsForItem(contentType, contentId) {
    let purchaseOptions = this._getAllPurchaseOptions();
    let options = purchaseOptions.filter(
      (po) => po.content_type === contentType && po.content_id === contentId && po.is_active
    );

    // If no purchase options exist for this item, generate sensible defaults
    if (!options.length) {
      const now = this._nowISO();
      const newOptions = [];

      if (contentType === 'track') {
        // Default: purchasable MP3 track under $2
        newOptions.push({
          id: this._generateId('po_track'),
          content_type: 'track',
          content_id: contentId,
          option_type: 'purchase',
          format: 'mp3',
          price: 1.29,
          currency: 'USD',
          is_default: true,
          is_active: true,
          available_from: now
        });
      } else if (contentType === 'concert_video') {
        // Default: HD rental concert video priced under $8
        newOptions.push({
          id: this._generateId('po_concert'),
          content_type: 'concert_video',
          content_id: contentId,
          option_type: 'rental',
          format: 'hd',
          price: 5.99,
          currency: 'USD',
          is_default: true,
          is_active: true,
          available_from: now
        });
      } else if (contentType === 'bundle') {
        // Default: purchasable bundle priced at or above $25
        newOptions.push({
          id: this._generateId('po_bundle'),
          content_type: 'bundle',
          content_id: contentId,
          option_type: 'purchase',
          format: 'mp3',
          price: 29.99,
          currency: 'USD',
          is_default: true,
          is_active: true,
          available_from: now
        });
      }

      if (newOptions.length) {
        purchaseOptions = purchaseOptions.concat(newOptions);
        this._saveToStorage('purchase_options', purchaseOptions);
        options = newOptions;
      }
    }

    return options;
  }

  _getDefaultPurchaseOptionForItem(contentType, contentId) {
    const options = this._getPurchaseOptionsForItem(contentType, contentId);
    if (!options.length) return null;
    const explicitDefault = options.find((o) => o.is_default);
    if (explicitDefault) return explicitDefault;
    // fallback: cheapest
    let cheapest = options[0];
    options.forEach((o) => {
      if (typeof o.price === 'number' && o.price < (cheapest.price || 0)) {
        cheapest = o;
      }
    });
    return cheapest;
  }

  // -------------------- Interface implementations --------------------

  // getHomepageContent()
  getHomepageContent() {
    const playlists = this._getAllPlaylists();
    const playlistTracks = this._getAllPlaylistTracks();
    const tracks = this._getAllTracks();
    const albums = this._getAllAlbums();
    const artists = this._getAllArtists();

    const featured_playlists = playlists.slice(0, 5).map((pl) => {
      const pts = playlistTracks.filter((pt) => pt.playlist_id === pl.id);
      return {
        playlist_id: pl.id,
        name: pl.name,
        description: pl.description || '',
        track_count: pts.length,
        artwork_url: ''
      };
    });

    const newReleaseTracks = tracks.filter((t) => t.primary_section === 'new_releases');
    const newReleaseAlbums = albums.filter((a) => a.primary_section === 'new_releases');
    const featured_new_releases = [];

    newReleaseTracks.slice(0, 10).forEach((t) => {
      const artist = artists.find((a) => a.id === t.artist_id);
      featured_new_releases.push({
        item_type: 'track',
        item_id: t.id,
        title: t.title,
        artist_name: artist ? artist.name : '',
        artwork_url: '',
        primary_genre_name: '',
        average_rating: t.average_rating || null
      });
    });

    newReleaseAlbums.slice(0, 10).forEach((a) => {
      const artist = artists.find((ar) => ar.id === a.artist_id);
      featured_new_releases.push({
        item_type: 'album',
        item_id: a.id,
        title: a.title,
        artist_name: artist ? artist.name : '',
        artwork_url: '',
        primary_genre_name: '',
        average_rating: a.average_rating || null
      });
    });

    const promoCodes = this._getAllPromoCodes();
    const featured_promotions = promoCodes.map((p) => ({
      promo_id: p.id,
      title: p.code,
      subtitle: p.description || '',
      promo_code: p.code,
      description: p.description || ''
    }));

    return {
      featured_playlists,
      featured_new_releases,
      featured_promotions
    };
  }

  // getGenres()
  getGenres() {
    return this._getAllGenres();
  }

  // getCatalogFilterOptions(context)
  getCatalogFilterOptions(context) {
    const genres = this._getAllGenres();
    const mood_tags = this._getAllMoodTags();

    const content_types = [
      { value: 'track', label: 'Tracks' },
      { value: 'album', label: 'Albums' },
      { value: 'concert_video', label: 'Concert Videos' },
      { value: 'bundle', label: 'Bundles' }
    ];

    const formats = [
      { value: 'mp3', label: 'MP3' },
      { value: 'flac', label: 'FLAC' },
      { value: 'wav', label: 'WAV' },
      { value: 'vinyl', label: 'Vinyl' },
      { value: 'cd', label: 'CD' },
      { value: 'hd', label: 'HD Video' },
      { value: 'sd', label: 'SD Video' },
      { value: 'streaming', label: 'Streaming' }
    ];

    const price_range = {
      min: 0,
      max: 100,
      step: 1,
      currency: 'USD'
    };

    const rating_options = [
      { min_value: 4.5, label: '4.5 stars & up' },
      { min_value: 4.0, label: '4 stars & up' },
      { min_value: 3.0, label: '3 stars & up' }
    ];

    const duration_range = {
      min_seconds: 0,
      max_seconds: 60 * 60 * 3,
      step_seconds: 15
    };

    const release_date_presets = [
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'this_month', label: 'This month' },
      { value: 'next_30_days', label: 'Next 30 days' },
      { value: 'custom', label: 'Custom range' }
    ];

    const time_period_options = [
      { value: 'today', label: 'Today' },
      { value: 'this_week', label: 'This week' },
      { value: 'this_month', label: 'This month' },
      { value: 'all_time', label: 'All time' }
    ];

    const sort_options = [
      { value: 'customer_rating_high_to_low', label: 'Customer Rating: High to Low' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'release_date_soonest_first', label: 'Release Date: Soonest First' },
      { value: 'release_date_newest_first', label: 'Release Date: Newest First' },
      { value: 'popularity', label: 'Popularity' }
    ];

    return {
      content_types,
      genres,
      formats,
      mood_tags,
      price_range,
      rating_options,
      duration_range,
      release_date_presets,
      time_period_options,
      sort_options
    };
  }

  // getCatalogItems(context, filters, sort, pagination)
  getCatalogItems(context, filters, sort, pagination) {
    context = context || {};
    filters = filters || {};
    sort = sort || {};
    pagination = pagination || {};

    const section = context.section || 'all_music';
    const genreId = context.genreId || null;
    const tab = context.tab || 'all';

    const tracks = this._getAllTracks();
    const albums = this._getAllAlbums();
    const videos = this._getAllConcertVideos();
    const bundles = this._getAllBundles();
    const artists = this._getAllArtists();
    const genres = this._getAllGenres();
    const moodTags = this._getAllMoodTags();

    let candidateItems = [];

    if (section === 'concerts') {
      videos.forEach((v) => {
        candidateItems.push({ item_type: 'concert_video', record: v });
      });
    } else if (section === 'bundles') {
      bundles.forEach((b) => {
        candidateItems.push({ item_type: 'bundle', record: b });
      });
    } else if (
      section === 'new_releases' ||
      section === 'top_charts' ||
      section === 'upcoming_releases'
    ) {
      tracks
        .filter((t) => t.primary_section === section)
        .forEach((t) => candidateItems.push({ item_type: 'track', record: t }));
      albums
        .filter((a) => a.primary_section === section)
        .forEach((a) => candidateItems.push({ item_type: 'album', record: a }));
    } else {
      // all_music or default
      tracks.forEach((t) => candidateItems.push({ item_type: 'track', record: t }));
      albums.forEach((a) => candidateItems.push({ item_type: 'album', record: a }));
      bundles.forEach((b) => candidateItems.push({ item_type: 'bundle', record: b }));
      videos.forEach((v) => candidateItems.push({ item_type: 'concert_video', record: v }));
    }

    if (tab === 'tracks') {
      candidateItems = candidateItems.filter((ci) => ci.item_type === 'track');
    } else if (tab === 'albums') {
      candidateItems = candidateItems.filter((ci) => ci.item_type === 'album');
    }

    if (filters.content_types && filters.content_types.length) {
      const allowed = filters.content_types;
      candidateItems = candidateItems.filter((ci) => allowed.indexOf(ci.item_type) !== -1);
    }

    if (genreId) {
      candidateItems = candidateItems.filter((ci) => ci.record.primary_genre_id === genreId);
    }

    if (filters.genre_ids && filters.genre_ids.length) {
      const allowedGenres = filters.genre_ids;
      candidateItems = candidateItems.filter((ci) => allowedGenres.indexOf(ci.record.primary_genre_id) !== -1);
    }

    const minRating = typeof filters.min_rating === 'number' ? filters.min_rating : null;
    if (minRating !== null) {
      candidateItems = candidateItems.filter((ci) => (ci.record.average_rating || 0) >= minRating);
    }

    if (typeof filters.min_duration_seconds === 'number') {
      candidateItems = candidateItems.filter((ci) => {
        if (typeof ci.record.duration_seconds !== 'number') return false;
        return ci.record.duration_seconds >= filters.min_duration_seconds;
      });
    }

    if (typeof filters.max_duration_seconds === 'number') {
      candidateItems = candidateItems.filter((ci) => {
        if (typeof ci.record.duration_seconds !== 'number') return false;
        return ci.record.duration_seconds <= filters.max_duration_seconds;
      });
    }

    if (filters.mood_tag_ids && filters.mood_tag_ids.length) {
      const requiredMoodIds = filters.mood_tag_ids;
      candidateItems = candidateItems.filter((ci) => {
        if (ci.item_type !== 'track') return false;
        const mt = ci.record.mood_tag_ids || [];
        return requiredMoodIds.some((id) => mt.indexOf(id) !== -1);
      });
    }

    // Release date filters
    if (filters.release_date_from) {
      const from = new Date(filters.release_date_from);
      candidateItems = candidateItems.filter((ci) => {
        if (!ci.record.release_date) return false;
        return new Date(ci.record.release_date) >= from;
      });
    }
    if (filters.release_date_to) {
      const to = new Date(filters.release_date_to);
      candidateItems = candidateItems.filter((ci) => {
        if (!ci.record.release_date) return false;
        return new Date(ci.record.release_date) <= to;
      });
    }

    if (filters.time_period) {
      const now = new Date();
      let from = null;
      if (filters.time_period === 'last_30_days') {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (filters.time_period === 'this_month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (filters.time_period === 'today') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filters.time_period === 'this_week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        from = new Date(now.getFullYear(), now.getMonth(), diff);
      }
      if (from) {
        candidateItems = candidateItems.filter((ci) => {
          if (!ci.record.release_date) return false;
          return new Date(ci.record.release_date) >= from;
        });
      }
    }

    // Price and format filters use purchase options
    const minPrice = typeof filters.min_price === 'number' ? filters.min_price : null;
    const maxPrice = typeof filters.max_price === 'number' ? filters.max_price : null;
    const formatValues = filters.format_values || null;
    const onlyRentable = !!filters.only_rentable;

    candidateItems = candidateItems.filter((ci) => {
      const contentType = ci.item_type;
      const contentId = ci.record.id;
      const options = this._getPurchaseOptionsForItem(contentType, contentId);
      if (!options.length) return false;

      let filtered = options;

      if (formatValues && formatValues.length) {
        filtered = filtered.filter((o) => formatValues.indexOf(o.format) !== -1);
        if (!filtered.length) return false;
      }

      if (minPrice !== null) {
        filtered = filtered.filter((o) => typeof o.price === 'number' && o.price >= minPrice);
        if (!filtered.length) return false;
      }

      if (maxPrice !== null) {
        filtered = filtered.filter((o) => typeof o.price === 'number' && o.price <= maxPrice);
        if (!filtered.length) return false;
      }

      if (onlyRentable) {
        const rentable = filtered.some((o) => o.option_type === 'rental');
        if (!rentable) return false;
      }

      // attach filtered options for potential sorting by price if needed
      ci._filtered_purchase_options = filtered;
      return true;
    });

    // Sorting
    const order = sort.order || null;
    if (order) {
      candidateItems.sort((a, b) => {
        const ra = a.record;
        const rb = b.record;
        if (order === 'customer_rating_high_to_low') {
          const ar = ra.average_rating || 0;
          const br = rb.average_rating || 0;
          if (br !== ar) return br - ar;
          const ac = ra.rating_count || 0;
          const bc = rb.rating_count || 0;
          return bc - ac;
        }
        if (order === 'price_low_to_high' || order === 'price_high_to_low') {
          const poA = this._getDefaultPurchaseOptionForItem(a.item_type, ra.id);
          const poB = this._getDefaultPurchaseOptionForItem(b.item_type, rb.id);
          const pa = poA ? poA.price || 0 : Infinity;
          const pb = poB ? poB.price || 0 : Infinity;
          if (order === 'price_low_to_high') {
            return pa - pb;
          }
          return pb - pa;
        }
        if (order === 'release_date_soonest_first') {
          const da = ra.release_date ? new Date(ra.release_date) : new Date(8640000000000000);
          const db = rb.release_date ? new Date(rb.release_date) : new Date(8640000000000000);
          return da - db;
        }
        if (order === 'release_date_newest_first') {
          const da = ra.release_date ? new Date(ra.release_date) : new Date(0);
          const db = rb.release_date ? new Date(rb.release_date) : new Date(0);
          return db - da;
        }
        if (order === 'popularity') {
          const pa = ra.rating_count || 0;
          const pb = rb.rating_count || 0;
          return pb - pa;
        }
        return 0;
      });
    }

    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const pageSize = pagination.page_size && pagination.page_size > 0 ? pagination.page_size : 25;
    const total_items = candidateItems.length;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = candidateItems.slice(start, end).map((ci) => {
      const rec = ci.record;
      const artist = artists.find((a) => a.id === rec.artist_id);
      const genre = genres.find((g) => g.id === rec.primary_genre_id);
      const defaultOption = this._getDefaultPurchaseOptionForItem(ci.item_type, rec.id);
      const mood_tags = ci.item_type === 'track' ? this._resolveMoodTags(rec.mood_tag_ids || []) : [];

      const available_actions = [];
      const purchaseOptions = this._getPurchaseOptionsForItem(ci.item_type, rec.id);
      purchaseOptions.forEach((po) => {
        if (po.option_type === 'purchase') {
          if (available_actions.indexOf('buy_now') === -1) available_actions.push('buy_now');
          if (available_actions.indexOf('add_to_cart') === -1) available_actions.push('add_to_cart');
        }
        if (po.option_type === 'rental' && po.format === 'hd') {
          if (available_actions.indexOf('rent_hd') === -1) available_actions.push('rent_hd');
        }
        if (po.option_type === 'pre_order') {
          if (available_actions.indexOf('pre_order') === -1) available_actions.push('pre_order');
        }
      });
      if (ci.item_type === 'track') {
        available_actions.push('add_to_wishlist');
        available_actions.push('add_to_playlist');
      } else {
        available_actions.push('add_to_wishlist');
      }

      return {
        item_type: ci.item_type,
        item_id: rec.id,
        title: rec.title,
        artist_name: artist ? artist.name : '',
        artist_id: rec.artist_id || null,
        artwork_url: '',
        primary_genre_name: genre ? genre.name : '',
        primary_genre_id: rec.primary_genre_id || null,
        average_rating: rec.average_rating || null,
        rating_count: rec.rating_count || 0,
        duration_seconds: rec.duration_seconds || null,
        release_date: rec.release_date || null,
        explicit: !!rec.explicit,
        mood_tags,
        default_purchase_option: defaultOption
          ? {
              purchase_option_id: defaultOption.id,
              option_type: defaultOption.option_type,
              format: defaultOption.format,
              price: defaultOption.price,
              currency: defaultOption.currency
            }
          : null,
        available_actions,
        // foreign key resolution
        artist: artist || null,
        primary_genre: genre || null
      };
    });

    return {
      items,
      page,
      page_size: pageSize,
      total_items
    };
  }

  // searchCatalog(query, filters, sort, pagination)
  searchCatalog(query, filters, sort, pagination) {
    query = query || '';
    filters = filters || {};
    sort = sort || {};
    pagination = pagination || {};

    const q = query.toLowerCase().trim();

    const tracks = this._getAllTracks();
    const albums = this._getAllAlbums();
    const videos = this._getAllConcertVideos();
    const bundles = this._getAllBundles();
    const artists = this._getAllArtists();
    const genres = this._getAllGenres();

    const results = [];

    function matchesText(str, qstr) {
      if (!qstr) return true;
      if (!str) return false;
      return String(str).toLowerCase().indexOf(qstr) !== -1;
    }

    tracks.forEach((t) => {
      if (matchesText(t.title, q)) {
        results.push({ item_type: 'track', record: t });
      }
    });

    albums.forEach((a) => {
      if (matchesText(a.title, q)) {
        results.push({ item_type: 'album', record: a });
      }
    });

    videos.forEach((v) => {
      if (matchesText(v.title, q)) {
        results.push({ item_type: 'concert_video', record: v });
      }
    });

    bundles.forEach((b) => {
      if (matchesText(b.title, q)) {
        results.push({ item_type: 'bundle', record: b });
      }
    });

    artists.forEach((a) => {
      if (matchesText(a.name, q)) {
        results.push({ item_type: 'artist', record: a });
      }
    });

    // Apply filters similar to getCatalogItems for non-artist results
    if (filters.content_types && filters.content_types.length) {
      const allowed = filters.content_types;
      results.splice(
        0,
        results.length,
        ...results.filter((r) => allowed.indexOf(r.item_type) !== -1 || r.item_type === 'artist')
      );
    }

    const minRating = typeof filters.min_rating === 'number' ? filters.min_rating : null;
    if (minRating !== null) {
      results.splice(
        0,
        results.length,
        ...results.filter((r) => {
          if (r.item_type === 'artist') return true;
          return (r.record.average_rating || 0) >= minRating;
        })
      );
    }

    if (filters.genre_ids && filters.genre_ids.length) {
      const allowedGenres = filters.genre_ids;
      results.splice(
        0,
        results.length,
        ...results.filter((r) => {
          if (r.item_type === 'artist') return true;
          return allowedGenres.indexOf(r.record.primary_genre_id) !== -1;
        })
      );
    }

    if (typeof filters.min_duration_seconds === 'number') {
      results.splice(
        0,
        results.length,
        ...results.filter((r) => {
          if (r.item_type === 'artist') return true;
          if (typeof r.record.duration_seconds !== 'number') return false;
          return r.record.duration_seconds >= filters.min_duration_seconds;
        })
      );
    }

    if (typeof filters.max_duration_seconds === 'number') {
      results.splice(
        0,
        results.length,
        ...results.filter((r) => {
          if (r.item_type === 'artist') return true;
          if (typeof r.record.duration_seconds !== 'number') return false;
          return r.record.duration_seconds <= filters.max_duration_seconds;
        })
      );
    }

    if (filters.mood_tag_ids && filters.mood_tag_ids.length) {
      const requiredMoodIds = filters.mood_tag_ids;
      results.splice(
        0,
        results.length,
        ...results.filter((r) => {
          if (r.item_type !== 'track') return r.item_type === 'artist';
          const mt = r.record.mood_tag_ids || [];
          return requiredMoodIds.some((id) => mt.indexOf(id) !== -1);
        })
      );
    }

    if (filters.release_date_from) {
      const from = new Date(filters.release_date_from);
      results.splice(
        0,
        results.length,
        ...results.filter((r) => {
          if (r.item_type === 'artist') return true;
          if (!r.record.release_date) return false;
          return new Date(r.record.release_date) >= from;
        })
      );
    }

    if (filters.release_date_to) {
      const to = new Date(filters.release_date_to);
      results.splice(
        0,
        results.length,
        ...results.filter((r) => {
          if (r.item_type === 'artist') return true;
          if (!r.record.release_date) return false;
          return new Date(r.record.release_date) <= to;
        })
      );
    }

    // price/format filters via purchase options
    const minPrice = typeof filters.min_price === 'number' ? filters.min_price : null;
    const maxPrice = typeof filters.max_price === 'number' ? filters.max_price : null;
    const formatValues = filters.format_values || null;
    if (minPrice !== null || maxPrice !== null || (formatValues && formatValues.length)) {
      results.splice(
        0,
        results.length,
        ...results.filter((r) => {
          if (r.item_type === 'artist') return true;
          const options = this._getPurchaseOptionsForItem(r.item_type, r.record.id);
          if (!options.length && (minPrice !== null || maxPrice !== null || formatValues)) {
            return false;
          }
          let filtered = options;
          if (formatValues && formatValues.length) {
            filtered = filtered.filter((o) => formatValues.indexOf(o.format) !== -1);
            if (!filtered.length) return false;
          }
          if (minPrice !== null) {
            filtered = filtered.filter((o) => typeof o.price === 'number' && o.price >= minPrice);
            if (!filtered.length) return false;
          }
          if (maxPrice !== null) {
            filtered = filtered.filter((o) => typeof o.price === 'number' && o.price <= maxPrice);
            if (!filtered.length) return false;
          }
          r._filtered_purchase_options = filtered;
          return true;
        })
      );
    }

    // Sorting
    const order = sort.order || 'relevance';
    if (order) {
      results.sort((a, b) => {
        if (a.item_type === 'artist' || b.item_type === 'artist') {
          if (order === 'relevance') return 0;
        }
        const ra = a.record;
        const rb = b.record;

        if (order === 'customer_rating_high_to_low') {
          const ar = ra.average_rating || 0;
          const br = rb.average_rating || 0;
          if (br !== ar) return br - ar;
          const ac = ra.rating_count || 0;
          const bc = rb.rating_count || 0;
          return bc - ac;
        }
        if (order === 'price_low_to_high' || order === 'price_high_to_low') {
          const poA = this._getDefaultPurchaseOptionForItem(a.item_type, ra.id);
          const poB = this._getDefaultPurchaseOptionForItem(b.item_type, rb.id);
          const pa = poA ? poA.price || 0 : Infinity;
          const pb = poB ? poB.price || 0 : Infinity;
          if (order === 'price_low_to_high') return pa - pb;
          return pb - pa;
        }
        if (order === 'release_date_newest_first') {
          const da = ra.release_date ? new Date(ra.release_date) : new Date(0);
          const db = rb.release_date ? new Date(rb.release_date) : new Date(0);
          return db - da;
        }
        if (order === 'popularity') {
          const pa = ra.rating_count || 0;
          const pb = rb.rating_count || 0;
          return pb - pa;
        }
        // relevance: keep original
        return 0;
      });
    }

    const page = pagination.page && pagination.page > 0 ? pagination.page : 1;
    const pageSize = pagination.page_size && pagination.page_size > 0 ? pagination.page_size : 25;
    const total_results = results.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const mapped = results.slice(start, end).map((r) => {
      if (r.item_type === 'artist') {
        return {
          item_type: 'artist',
          item_id: r.record.id,
          title: r.record.name,
          artist_name: r.record.name,
          artist_id: r.record.id,
          artwork_url: r.record.image_url || '',
          primary_genre_name: '',
          primary_genre_id: null,
          average_rating: null,
          rating_count: null,
          duration_seconds: null,
          release_date: null,
          explicit: false,
          default_purchase_option: null,
          available_actions: ['view_artist'],
          artist: r.record
        };
      }

      const rec = r.record;
      const artist = artists.find((a) => a.id === rec.artist_id);
      const genre = genres.find((g) => g.id === rec.primary_genre_id);
      const defaultOption = this._getDefaultPurchaseOptionForItem(r.item_type, rec.id);
      const mood_tags = r.item_type === 'track' ? this._resolveMoodTags(rec.mood_tag_ids || []) : [];

      const available_actions = [];
      const purchaseOptions = this._getPurchaseOptionsForItem(r.item_type, rec.id);
      purchaseOptions.forEach((po) => {
        if (po.option_type === 'purchase') {
          if (available_actions.indexOf('buy_now') === -1) available_actions.push('buy_now');
          if (available_actions.indexOf('add_to_cart') === -1) available_actions.push('add_to_cart');
        }
        if (po.option_type === 'rental' && po.format === 'hd') {
          if (available_actions.indexOf('rent_hd') === -1) available_actions.push('rent_hd');
        }
        if (po.option_type === 'pre_order') {
          if (available_actions.indexOf('pre_order') === -1) available_actions.push('pre_order');
        }
      });
      if (r.item_type === 'track') {
        available_actions.push('add_to_wishlist');
        available_actions.push('add_to_playlist');
      } else {
        available_actions.push('add_to_wishlist');
      }

      return {
        item_type: r.item_type,
        item_id: rec.id,
        title: rec.title,
        artist_name: artist ? artist.name : '',
        artist_id: rec.artist_id || null,
        artwork_url: '',
        primary_genre_name: genre ? genre.name : '',
        primary_genre_id: rec.primary_genre_id || null,
        average_rating: rec.average_rating || null,
        rating_count: rec.rating_count || 0,
        duration_seconds: rec.duration_seconds || null,
        release_date: rec.release_date || null,
        explicit: !!rec.explicit,
        default_purchase_option: defaultOption
          ? {
              purchase_option_id: defaultOption.id,
              option_type: defaultOption.option_type,
              format: defaultOption.format,
              price: defaultOption.price,
              currency: defaultOption.currency
            }
          : null,
        available_actions,
        mood_tags,
        artist: artist || null,
        primary_genre: genre || null
      };
    });

    return {
      results: mapped,
      page,
      page_size: pageSize,
      total_results
    };
  }

  // getContentDetails(itemType, itemId)
  getContentDetails(itemType, itemId) {
    const tracks = this._getAllTracks();
    const albums = this._getAllAlbums();
    const videos = this._getAllConcertVideos();
    const bundles = this._getAllBundles();
    const artists = this._getAllArtists();
    const genres = this._getAllGenres();
    const purchaseOptions = this._getAllPurchaseOptions();

    let item_type = itemType;
    let track = null;
    let album = null;
    let concert_video = null;
    let bundle = null;
    let artist = null;
    let primary_genre = null;
    let tracklist = [];

    if (itemType === 'track') {
      track = tracks.find((t) => t.id === itemId) || null;
      if (track) {
        artist = artists.find((a) => a.id === track.artist_id) || null;
        primary_genre = genres.find((g) => g.id === track.primary_genre_id) || null;
        track = this._attachEntityRelations('Track', track);
      }
    } else if (itemType === 'album') {
      album = albums.find((a) => a.id === itemId) || null;
      if (album) {
        artist = artists.find((a) => a.id === album.artist_id) || null;
        primary_genre = genres.find((g) => g.id === album.primary_genre_id) || null;
        album = this._attachEntityRelations('Album', album);
        const ids = album.track_ids || [];
        let pos = 1;
        tracklist = ids
          .map((tid) => {
            const t = tracks.find((tr) => tr.id === tid);
            if (!t) return null;
            const ta = artists.find((a) => a.id === t.artist_id);
            const wrapped = this._attachEntityRelations('Track', t);
            const entry = {
              track: wrapped,
              artist_name: ta ? ta.name : '',
              position: pos,
              is_previewable: true
            };
            pos += 1;
            return entry;
          })
          .filter(Boolean);
      }
    } else if (itemType === 'concert_video') {
      concert_video = videos.find((v) => v.id === itemId) || null;
      if (concert_video) {
        artist = artists.find((a) => a.id === concert_video.artist_id) || null;
        primary_genre = genres.find((g) => g.id === concert_video.primary_genre_id) || null;
        concert_video = this._attachEntityRelations('ConcertVideo', concert_video);
      }
    } else if (itemType === 'bundle') {
      bundle = bundles.find((b) => b.id === itemId) || null;
      if (bundle) {
        primary_genre = genres.find((g) => g.id === bundle.primary_genre_id) || null;
        bundle = this._attachEntityRelations('Bundle', bundle);
      }
    }

    const contentId = itemId;
    const pos = this._getPurchaseOptionsForItem(itemType, contentId);

    let baseRecord = track || album || concert_video || bundle;
    const customer_ratings = baseRecord
      ? {
          average_rating: baseRecord.average_rating || null,
          rating_count: baseRecord.rating_count || 0
        }
      : { average_rating: null, rating_count: 0 };

    // related items: simple heuristic by same artist
    const related_items = [];
    if (artist && artist.id) {
      if (itemType !== 'track') {
        tracks
          .filter((t) => t.artist_id === artist.id && t.id !== itemId)
          .slice(0, 10)
          .forEach((t) => {
            related_items.push({
              item_type: 'track',
              item_id: t.id,
              title: t.title,
              artist_name: artist.name,
              artwork_url: ''
            });
          });
      }
      if (itemType !== 'album') {
        albums
          .filter((a) => a.artist_id === artist.id && a.id !== itemId)
          .slice(0, 10)
          .forEach((a) => {
            related_items.push({
              item_type: 'album',
              item_id: a.id,
              title: a.title,
              artist_name: artist.name,
              artwork_url: ''
            });
          });
      }
    }

    return {
      item_type,
      track,
      album,
      concert_video,
      bundle,
      artist,
      primary_genre,
      tracklist,
      purchase_options: pos,
      customer_ratings,
      related_items
    };
  }

  // addPurchaseOptionToCart(purchaseOptionId, itemType, itemId, quantity)
  addPurchaseOptionToCart(purchaseOptionId, itemType, itemId, quantity) {
    if (typeof quantity === 'undefined' || quantity === null) quantity = 1;
    const purchaseOptions = this._getAllPurchaseOptions();
    let po = purchaseOptions.find((p) => p.id === purchaseOptionId);
    if (!po) {
      // Fallback to dynamically generated purchase options (e.g., for tracks, bundles, concert videos)
      const dynamicOptions = this._getPurchaseOptionsForItem(itemType, itemId) || [];
      po = dynamicOptions.find((p) => p.id === purchaseOptionId) || null;
    }
    if (!po) {
      return { success: false, message: 'Purchase option not found.', cart: null };
    }

    const cart = this._getOrCreateCart();
    const allCartItems = this._getAllCartItems();
    const now = this._nowISO();

    let existing = allCartItems.find(
      (ci) => ci.cart_id === cart.id && ci.purchase_option_id === purchaseOptionId && ci.item_id === itemId
    );

    const purchase_type = po.option_type === 'subscription_included'
      ? 'subscription'
      : po.option_type;

    if (existing) {
      existing.quantity += quantity;
      existing.added_at = now;
    } else {
      const cartItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        purchase_option_id: po.id,
        item_type: itemType,
        item_id: itemId,
        purchase_type,
        quantity,
        unit_price: po.price,
        added_at: now
      };
      allCartItems.push(cartItem);
      if (!Array.isArray(cart.cart_item_ids)) cart.cart_item_ids = [];
      cart.cart_item_ids.push(cartItem.id);
    }

    this._saveToStorage('cart_items', allCartItems);
    this._recalculateCartTotals(cart);

    const summary = this._buildCartSummary(cart);
    return {
      success: true,
      message: 'Item added to cart.',
      cart: summary
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        currency: 'USD',
        promo_code: null,
        messages: []
      };
    }
    return this._buildCartSummary(cart);
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getFromStorage('cart', null);
    const allCartItems = this._getAllCartItems();
    if (!cart) {
      return { success: false, cart: this._buildCartSummary(null), message: 'Cart not found.' };
    }

    const idx = allCartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return { success: false, cart: this._buildCartSummary(cart), message: 'Cart item not found.' };
    }

    if (quantity <= 0) {
      const removed = allCartItems.splice(idx, 1)[0];
      if (Array.isArray(cart.cart_item_ids)) {
        cart.cart_item_ids = cart.cart_item_ids.filter((id) => id !== removed.id);
      }
    } else {
      allCartItems[idx].quantity = quantity;
    }

    this._saveToStorage('cart_items', allCartItems);
    this._recalculateCartTotals(cart);
    const summary = this._buildCartSummary(cart);
    return { success: true, cart: summary, message: 'Cart updated.' };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    const allCartItems = this._getAllCartItems();
    if (!cart) {
      return { success: false, cart: this._buildCartSummary(null), message: 'Cart not found.' };
    }

    const idx = allCartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return { success: false, cart: this._buildCartSummary(cart), message: 'Cart item not found.' };
    }

    const removed = allCartItems.splice(idx, 1)[0];
    if (Array.isArray(cart.cart_item_ids)) {
      cart.cart_item_ids = cart.cart_item_ids.filter((id) => id !== removed.id);
    }

    this._saveToStorage('cart_items', allCartItems);
    this._recalculateCartTotals(cart);
    const summary = this._buildCartSummary(cart);
    return { success: true, cart: summary, message: 'Cart item removed.' };
  }

  // applyPromoCodeToCart(code)
  applyPromoCodeToCart(code) {
    const cart = this._getOrCreateCart();
    const allCartItems = this._getAllCartItems();
    const items = allCartItems.filter((ci) => ci.cart_id === cart.id);

    if (!items.length) {
      const summaryEmpty = this._buildCartSummary(cart);
      return { success: false, message: 'Cart is empty.', cart: summaryEmpty };
    }

    const validation = this._validateAndNormalizePromoCode(cart, code, items);
    if (!validation.valid) {
      cart.promo_code = null;
      this._recalculateCartTotals(cart);
      const summary = this._buildCartSummary(cart);
      return { success: false, message: validation.message, cart: summary };
    }

    cart.promo_code = validation.normalized_code;
    this._recalculateCartTotals(cart);
    const summary = this._buildCartSummary(cart);
    return { success: true, message: validation.message, cart: summary };
  }

  // getCheckoutSummary(mode, subscriptionPlanId)
  getCheckoutSummary(mode, subscriptionPlanId) {
    mode = mode || 'cart';
    const billing_cycle_options = ['monthly', 'yearly'];
    let selected_billing_cycle = 'monthly';

    if (mode === 'subscription') {
      const plans = this._getAllSubscriptionPlans();
      const plan = plans.find((p) => p.id === subscriptionPlanId) || null;
      const items = [];
      const subtotal = plan ? plan.monthly_price || 0 : 0;

      return {
        mode: 'subscription',
        items,
        subscription_plan: plan,
        billing_cycle_options,
        selected_billing_cycle,
        subtotal,
        discount_total: 0,
        total: subtotal,
        currency: plan ? plan.currency : 'USD',
        promo_code: null,
        can_edit_cart: false
      };
    }

    // cart mode
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        mode: 'cart',
        items: [],
        subscription_plan: null,
        billing_cycle_options: [],
        selected_billing_cycle: 'monthly',
        subtotal: 0,
        discount_total: 0,
        total: 0,
        currency: 'USD',
        promo_code: null,
        can_edit_cart: true
      };
    }
    const summary = this._buildCartSummary(cart);
    return {
      mode: 'cart',
      items: summary.items,
      subscription_plan: null,
      billing_cycle_options: [],
      selected_billing_cycle: 'monthly',
      subtotal: summary.subtotal,
      discount_total: summary.discount_total,
      total: summary.total,
      currency: summary.currency,
      promo_code: summary.promo_code,
      can_edit_cart: true
    };
  }

  // submitCheckout(mode, subscriptionPlanId, billingCycle, payment, billingAddress)
  submitCheckout(mode, subscriptionPlanId, billingCycle, payment, billingAddress) {
    mode = mode || 'cart';

    const orders = this._getAllOrders();
    const orderItems = this._getAllOrderItems();
    const paymentMethods = this._getAllPaymentMethods();
    const billingAddresses = this._getAllBillingAddresses();
    const subscriptions = this._getAllSubscriptions();
    const purchaseOptions = this._getAllPurchaseOptions();

    const now = this._nowISO();

    // Save payment method
    const pm = {
      id: this._generateId('paymethod'),
      cardholder_name: payment.cardholder_name,
      card_number: payment.card_number,
      expiry_month: payment.expiry_month,
      expiry_year: payment.expiry_year,
      cvv: payment.cvv,
      card_brand: this._detectCardBrand(payment.card_number),
      created_at: now
    };
    paymentMethods.push(pm);
    this._saveToStorage('payment_methods', paymentMethods);

    // Save billing address if provided
    let ba = null;
    if (billingAddress && billingAddress.address_line1) {
      ba = {
        id: this._generateId('billaddr'),
        address_line1: billingAddress.address_line1,
        address_line2: billingAddress.address_line2 || '',
        city: billingAddress.city,
        state: billingAddress.state || '',
        postal_code: billingAddress.postal_code,
        country: billingAddress.country || '',
        created_at: now
      };
      billingAddresses.push(ba);
      this._saveToStorage('billing_addresses', billingAddresses);
    }

    if (mode === 'subscription') {
      const plans = this._getAllSubscriptionPlans();
      const plan = plans.find((p) => p.id === subscriptionPlanId);
      if (!plan || !plan.is_active) {
        return { success: false, order: null, subscription: null, message: 'Subscription plan not available.' };
      }
      const cycle = billingCycle || 'monthly';
      let price = plan.monthly_price;
      if (cycle === 'yearly') {
        price = plan.monthly_price * 12;
      }

      const subscription = {
        id: this._generateId('sub'),
        subscription_plan_id: plan.id,
        status: 'active',
        billing_cycle: cycle,
        start_date: now,
        end_date: null,
        created_at: now
      };
      subscriptions.push(subscription);
      this._saveToStorage('subscriptions', subscriptions);

      const order = {
        id: this._generateId('order'),
        order_number: 'ORD-' + this._getNextIdCounter(),
        status: 'paid',
        order_type: 'subscription',
        cart_id: null,
        subscription_plan_id: plan.id,
        payment_method_id: pm.id,
        billing_address_id: ba ? ba.id : null,
        subtotal: price,
        discount_total: 0,
        total: price,
        promo_code: null,
        created_at: now,
        completed_at: now
      };
      orders.push(order);

      const oi = {
        id: this._generateId('orderitem'),
        order_id: order.id,
        purchase_option_id: null,
        item_type: 'subscription_plan',
        item_id: plan.id,
        purchase_type: 'subscription',
        quantity: 1,
        unit_price: price
      };
      orderItems.push(oi);

      this._saveToStorage('orders', orders);
      this._saveToStorage('order_items', orderItems);

      return { success: true, order, subscription, message: 'Subscription started.' };
    }

    // Cart checkout
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { success: false, order: null, subscription: null, message: 'Cart is empty.' };
    }
    const allCartItems = this._getAllCartItems();
    const cartItems = allCartItems.filter((ci) => ci.cart_id === cart.id);
    if (!cartItems.length) {
      return { success: false, order: null, subscription: null, message: 'Cart is empty.' };
    }

    // Ensure totals are up to date
    this._recalculateCartTotals(cart);

    // Determine order_type
    const typesSet = new Set(cartItems.map((ci) => ci.purchase_type));
    let order_type = 'mixed';
    if (typesSet.size === 1) {
      order_type = typesSet.values().next().value;
    }

    const order = {
      id: this._generateId('order'),
      order_number: 'ORD-' + this._getNextIdCounter(),
      status: 'paid',
      order_type,
      cart_id: cart.id,
      subscription_plan_id: null,
      payment_method_id: pm.id,
      billing_address_id: ba ? ba.id : null,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      total: cart.total,
      promo_code: cart.promo_code,
      created_at: now,
      completed_at: now
    };
    orders.push(order);

    cartItems.forEach((ci) => {
      const po = purchaseOptions.find((p) => p.id === ci.purchase_option_id) || null;
      const oi = {
        id: this._generateId('orderitem'),
        order_id: order.id,
        purchase_option_id: po ? po.id : null,
        item_type: ci.item_type,
        item_id: ci.item_id,
        purchase_type: ci.purchase_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price
      };
      orderItems.push(oi);
    });

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart after successful checkout
    const remainingCartItems = allCartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);
    cart.cart_item_ids = [];
    cart.subtotal = 0;
    cart.discount_total = 0;
    cart.total = 0;
    cart.promo_code = null;
    cart.updated_at = now;
    this._saveToStorage('cart', cart);

    return { success: true, order, subscription: null, message: 'Checkout completed.' };
  }

  // getSubscriptionPlans(filter)
  getSubscriptionPlans(filter) {
    filter = filter || {};
    const plans = this._getAllSubscriptionPlans();
    return plans.filter((p) => {
      if (filter.planType && p.plan_type !== filter.planType) return false;
      if (typeof filter.onlyActive === 'boolean' && filter.onlyActive && !p.is_active) return false;
      return true;
    });
  }

  // getDiscoverOverview()
  getDiscoverOverview() {
    const tracks = this._getAllTracks();
    const albums = this._getAllAlbums();
    const artists = this._getAllArtists();
    const genres = this._getAllGenres();

    const new_releases_preview = [];
    tracks
      .filter((t) => t.primary_section === 'new_releases')
      .slice(0, 10)
      .forEach((t) => {
        const artist = artists.find((a) => a.id === t.artist_id);
        new_releases_preview.push({
          item_type: 'track',
          item_id: t.id,
          title: t.title,
          artist_name: artist ? artist.name : '',
          artwork_url: '',
          average_rating: t.average_rating || null,
          release_date: t.release_date || null
        });
      });

    const top_charts_preview = [];
    tracks
      .filter((t) => t.primary_section === 'top_charts')
      .slice(0, 10)
      .forEach((t) => {
        const artist = artists.find((a) => a.id === t.artist_id);
        top_charts_preview.push({
          item_type: 'track',
          item_id: t.id,
          title: t.title,
          artist_name: artist ? artist.name : '',
          artwork_url: '',
          average_rating: t.average_rating || null
        });
      });

    const recommended_for_you = [];
    // simple heuristic: highest rated tracks
    const sortedByRating = tracks.slice().sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    sortedByRating.slice(0, 10).forEach((t) => {
      const artist = artists.find((a) => a.id === t.artist_id);
      recommended_for_you.push({
        item_type: 'track',
        item_id: t.id,
        title: t.title,
        artist_name: artist ? artist.name : '',
        artwork_url: ''
      });
    });

    const genre_spotlights = genres.map((g) => {
      const highlights = tracks
        .filter((t) => t.primary_genre_id === g.id)
        .slice(0, 5)
        .map((t) => {
          const artist = artists.find((a) => a.id === t.artist_id);
          return {
            item_type: 'track',
            item_id: t.id,
            title: t.title,
            artist_name: artist ? artist.name : ''
          };
        });
      return {
        genre: g,
        highlight_items: highlights
      };
    });

    return {
      new_releases_preview,
      top_charts_preview,
      recommended_for_you,
      genre_spotlights
    };
  }

  // getStoreOverview()
  getStoreOverview() {
    const categories = [
      { category_id: 'bundles', name: 'Bundles', description: 'Album bundles and collections.' },
      { category_id: 'vinyl', name: 'Vinyl', description: 'Vinyl records.' },
      { category_id: 'cds', name: 'CDs', description: 'Compact discs.' },
      { category_id: 'digital_deals', name: 'Digital Deals', description: 'Discounted digital music.' }
    ];

    const bundles = this._getAllBundles();
    const tracks = this._getAllTracks();
    const albums = this._getAllAlbums();
    const videos = this._getAllConcertVideos();
    const artists = this._getAllArtists();

    const featured_deals = [];

    bundles.slice(0, 5).forEach((b) => {
      const artistName = '';
      featured_deals.push({
        item_type: 'bundle',
        item_id: b.id,
        title: b.title,
        artist_name: artistName,
        artwork_url: '',
        highlight_text: 'Bundle deal'
      });
    });

    tracks.slice(0, 5).forEach((t) => {
      const artist = artists.find((a) => a.id === t.artist_id);
      featured_deals.push({
        item_type: 'track',
        item_id: t.id,
        title: t.title,
        artist_name: artist ? artist.name : '',
        artwork_url: '',
        highlight_text: 'Featured track'
      });
    });

    albums.slice(0, 5).forEach((a) => {
      const artist = artists.find((ar) => ar.id === a.artist_id);
      featured_deals.push({
        item_type: 'album',
        item_id: a.id,
        title: a.title,
        artist_name: artist ? artist.name : '',
        artwork_url: '',
        highlight_text: 'Featured album'
      });
    });

    videos.slice(0, 5).forEach((v) => {
      const artist = artists.find((a) => a.id === v.artist_id);
      featured_deals.push({
        item_type: 'concert_video',
        item_id: v.id,
        title: v.title,
        artist_name: artist ? artist.name : '',
        artwork_url: '',
        highlight_text: 'Concert video'
      });
    });

    return {
      categories,
      featured_deals
    };
  }

  // getPlaylistsOverview()
  getPlaylistsOverview() {
    const playlists = this._getAllPlaylists();
    const playlistTracks = this._getAllPlaylistTracks();
    const tracks = this._getAllTracks();

    return playlists.map((pl) => {
      const pts = playlistTracks.filter((pt) => pt.playlist_id === pl.id);
      let total_duration_seconds = 0;
      pts.forEach((pt) => {
        const t = tracks.find((tr) => tr.id === pt.track_id);
        if (t && typeof t.duration_seconds === 'number') {
          total_duration_seconds += t.duration_seconds;
        }
      });
      return {
        playlist: pl,
        track_count: pts.length,
        total_duration_seconds
      };
    });
  }

  // createPlaylist(name, description)
  createPlaylist(name, description) {
    const playlists = this._getAllPlaylists();
    const now = this._nowISO();
    const playlist = {
      id: this._generateId('playlist'),
      name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);

    return {
      playlist,
      track_count: 0,
      total_duration_seconds: 0
    };
  }

  // getPlaylistDetails(playlistId)
  getPlaylistDetails(playlistId) {
    const playlists = this._getAllPlaylists();
    const playlistTracks = this._getAllPlaylistTracks();
    const tracks = this._getAllTracks();
    const artists = this._getAllArtists();

    const playlist = playlists.find((pl) => pl.id === playlistId) || null;
    if (!playlist) {
      return {
        playlist: null,
        tracks: [],
        total_duration_seconds: 0
      };
    }

    const pts = playlistTracks
      .filter((pt) => pt.playlist_id === playlist.id)
      .sort((a, b) => a.position - b.position);

    let total_duration_seconds = 0;
    const detailedTracks = pts.map((pt) => {
      const t = tracks.find((tr) => tr.id === pt.track_id);
      if (!t) {
        return null;
      }
      const artist = artists.find((a) => a.id === t.artist_id);
      if (typeof t.duration_seconds === 'number') {
        total_duration_seconds += t.duration_seconds;
      }
      const trackResolved = this._attachEntityRelations('Track', t);
      return {
        playlist_track_id: pt.id,
        track: trackResolved,
        artist_name: artist ? artist.name : '',
        position: pt.position,
        added_at: pt.added_at
      };
    }).filter(Boolean);

    return {
      playlist,
      tracks: detailedTracks,
      total_duration_seconds
    };
  }

  // updatePlaylistMetadata(playlistId, name, description)
  updatePlaylistMetadata(playlistId, name, description) {
    const playlists = this._getAllPlaylists();
    const idx = playlists.findIndex((pl) => pl.id === playlistId);
    if (idx === -1) return null;
    if (typeof name === 'string' && name.length) playlists[idx].name = name;
    if (typeof description === 'string') playlists[idx].description = description;
    playlists[idx].updated_at = this._nowISO();
    this._saveToStorage('playlists', playlists);
    return playlists[idx];
  }

  // deletePlaylist(playlistId)
  deletePlaylist(playlistId) {
    const playlists = this._getAllPlaylists();
    const playlistTracks = this._getAllPlaylistTracks();

    const idx = playlists.findIndex((pl) => pl.id === playlistId);
    if (idx === -1) {
      return { success: false, message: 'Playlist not found.' };
    }

    playlists.splice(idx, 1);
    const remainingPT = playlistTracks.filter((pt) => pt.playlist_id !== playlistId);
    this._saveToStorage('playlists', playlists);
    this._saveToStorage('playlist_tracks', remainingPT);

    return { success: true, message: 'Playlist deleted.' };
  }

  // addTrackToPlaylist(playlistId, trackId)
  addTrackToPlaylist(playlistId, trackId) {
    const playlists = this._getAllPlaylists();
    const tracks = this._getAllTracks();
    const playlistTracks = this._getAllPlaylistTracks();

    const playlist = playlists.find((pl) => pl.id === playlistId);
    if (!playlist) {
      return { success: false, playlist_track: null, message: 'Playlist not found.' };
    }

    const track = tracks.find((t) => t.id === trackId);
    if (!track) {
      return { success: false, playlist_track: null, message: 'Track not found.' };
    }

    const current = playlistTracks.filter((pt) => pt.playlist_id === playlistId);
    const nextPos = current.length ? Math.max.apply(null, current.map((pt) => pt.position)) + 1 : 1;

    const playlist_track = {
      id: this._generateId('pltrack'),
      playlist_id: playlistId,
      track_id: trackId,
      position: nextPos,
      added_at: this._nowISO()
    };

    playlistTracks.push(playlist_track);
    this._saveToStorage('playlist_tracks', playlistTracks);

    return { success: true, playlist_track, message: 'Track added to playlist.' };
  }

  // removeTrackFromPlaylist(playlistTrackId)
  removeTrackFromPlaylist(playlistTrackId) {
    const playlistTracks = this._getAllPlaylistTracks();
    const idx = playlistTracks.findIndex((pt) => pt.id === playlistTrackId);
    if (idx === -1) {
      return { success: false, message: 'Playlist track not found.' };
    }
    playlistTracks.splice(idx, 1);
    this._saveToStorage('playlist_tracks', playlistTracks);
    return { success: true, message: 'Track removed from playlist.' };
  }

  // reorderPlaylistTracks(playlistId, orderedPlaylistTrackIds)
  reorderPlaylistTracks(playlistId, orderedPlaylistTrackIds) {
    const playlistTracks = this._getAllPlaylistTracks();
    const playlists = this._getAllPlaylists();
    const playlist = playlists.find((pl) => pl.id === playlistId) || null;
    if (!playlist) {
      return { success: false, playlist: null };
    }

    const pts = playlistTracks.filter((pt) => pt.playlist_id === playlistId);
    const idSet = new Set(orderedPlaylistTrackIds);
    const ptsSet = new Set(pts.map((pt) => pt.id));

    if (idSet.size !== ptsSet.size) {
      return { success: false, playlist };
    }

    orderedPlaylistTrackIds.forEach((id, index) => {
      const pt = playlistTracks.find((p) => p.id === id && p.playlist_id === playlistId);
      if (pt) {
        pt.position = index + 1;
      }
    });

    this._saveToStorage('playlist_tracks', playlistTracks);
    return { success: true, playlist };
  }

  // getWishlistSummary()
  getWishlistSummary() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getAllWishlistItems();
    const itemsForWishlist = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);

    const tracks = this._getAllTracks();
    const albums = this._getAllAlbums();
    const videos = this._getAllConcertVideos();
    const bundles = this._getAllBundles();
    const artists = this._getAllArtists();

    const items = itemsForWishlist.map((wi) => {
      let track = null;
      let album = null;
      let concert_video = null;
      let bundle = null;
      let artist_name = '';

      if (wi.item_type === 'track') {
        const t = tracks.find((tr) => tr.id === wi.item_id) || null;
        if (t) {
          const a = artists.find((ar) => ar.id === t.artist_id);
          artist_name = a ? a.name : '';
          track = this._attachEntityRelations('Track', t);
        }
      } else if (wi.item_type === 'album') {
        const a = albums.find((al) => al.id === wi.item_id) || null;
        if (a) {
          const ar = artists.find((ar2) => ar2.id === a.artist_id);
          artist_name = ar ? ar.name : '';
          album = this._attachEntityRelations('Album', a);
        }
      } else if (wi.item_type === 'concert_video') {
        const v = videos.find((cv) => cv.id === wi.item_id) || null;
        if (v) {
          const ar = artists.find((ar2) => ar2.id === v.artist_id);
          artist_name = ar ? ar.name : '';
          concert_video = this._attachEntityRelations('ConcertVideo', v);
        }
      } else if (wi.item_type === 'bundle') {
        const b = bundles.find((bu) => bu.id === wi.item_id) || null;
        if (b) {
          bundle = this._attachEntityRelations('Bundle', b);
        }
      }

      return {
        wishlist_item: wi,
        item_type: wi.item_type,
        track,
        album,
        concert_video,
        bundle,
        artist_name
      };
    });

    return {
      wishlist,
      items
    };
  }

  // addItemToWishlist(itemType, itemId)
  addItemToWishlist(itemType, itemId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getAllWishlistItems();

    const existing = wishlistItems.find(
      (wi) => wi.wishlist_id === wishlist.id && wi.item_type === itemType && wi.item_id === itemId
    );
    if (existing) {
      return { success: true, wishlist_item: existing, message: 'Item already in wishlist.' };
    }

    const wi = {
      id: this._generateId('wishitem'),
      wishlist_id: wishlist.id,
      item_type: itemType,
      item_id: itemId,
      added_at: this._nowISO()
    };
    wishlistItems.push(wi);
    wishlist.updated_at = this._nowISO();

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveToStorage('wishlist', wishlist);

    return { success: true, wishlist_item: wi, message: 'Item added to wishlist.' };
  }

  // removeItemFromWishlist(wishlistItemId)
  removeItemFromWishlist(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getAllWishlistItems();

    const idx = wishlistItems.findIndex((wi) => wi.id === wishlistItemId && wi.wishlist_id === wishlist.id);
    if (idx === -1) {
      return { success: false, message: 'Wishlist item not found.' };
    }
    wishlistItems.splice(idx, 1);
    wishlist.updated_at = this._nowISO();
    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveToStorage('wishlist', wishlist);
    return { success: true, message: 'Item removed from wishlist.' };
  }

  // getAccountSettings()
  getAccountSettings() {
    const settings = this._getOrCreateAccountSettings();
    const genres = this._getAllGenres();
    const favorite_genres = (settings.favorite_genre_ids || [])
      .map((id) => genres.find((g) => g.id === id))
      .filter(Boolean);

    const supported_languages = [
      { code: 'en', label: 'English' },
      { code: 'es', label: 'Spanish' },
      { code: 'fr', label: 'French' },
      { code: 'de', label: 'German' },
      { code: 'jp', label: 'Japanese' }
    ];

    return {
      settings: this._attachEntityRelations('AccountSettings', settings),
      favorite_genres,
      available_genres: genres,
      supported_languages
    };
  }

  // updateAccountSettings(settings)
  updateAccountSettings(settings) {
    const current = this._getOrCreateAccountSettings();
    const updated = Object.assign({}, current);

    if (settings.favorite_genre_ids) {
      updated.favorite_genre_ids = settings.favorite_genre_ids.slice();
    }
    if (settings.preferred_language) {
      updated.preferred_language = settings.preferred_language;
    }
    if (typeof settings.filter_explicit_content === 'boolean') {
      updated.filter_explicit_content = settings.filter_explicit_content;
    }
    if (typeof settings.notification_new_releases === 'boolean') {
      updated.notification_new_releases = settings.notification_new_releases;
    }
    if (typeof settings.notification_promotions_discounts === 'boolean') {
      updated.notification_promotions_discounts = settings.notification_promotions_discounts;
    }
    if (typeof settings.notification_product_news_tips === 'boolean') {
      updated.notification_product_news_tips = settings.notification_product_news_tips;
    }

    updated.updated_at = this._nowISO();
    this._saveToStorage('account_settings', updated);
    return updated;
  }

  // getStaticPageContent(pageType)
  getStaticPageContent(pageType) {
    const pages = this._getFromStorage('static_pages', []);
    const page = pages.find((p) => p.pageType === pageType) || null;
    if (!page) {
      return {
        title: '',
        sections: []
      };
    }
    return {
      title: page.title || '',
      sections: Array.isArray(page.sections) ? page.sections : []
    };
  }

  // submitContactForm(name, email, subject, message_type, message)
  submitContactForm(name, email, subject, message_type, message) {
    const tickets = this._getFromStorage('contact_tickets', []);
    const ticket = {
      id: this._generateId('ticket'),
      name,
      email,
      subject,
      message_type: message_type || 'other',
      message,
      created_at: this._nowISO()
    };
    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);
    return {
      success: true,
      ticket_id: ticket.id,
      message: 'Your message has been received.'
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
