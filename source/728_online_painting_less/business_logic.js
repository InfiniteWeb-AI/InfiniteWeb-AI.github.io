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

  // =========================
  // Initialization & Helpers
  // =========================

  _initStorage() {
    // Helper to ensure a key exists
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core data tables based on storage_key definitions
    ensure('content_items', []);
    ensure('favorite_items', []);
    ensure('playlists', []);
    ensure('playlist_items', []);
    ensure('live_classes', []);
    ensure('live_class_registrations', []);
    ensure('subscription_plans', []);
    ensure('subscriptions', []);
    ensure('carts', []);
    ensure('cart_items', []);
    ensure('orders', []);
    ensure('order_items', []);
    ensure('questions', []);
    ensure('enrollments', []);

    // Singleton / CMS-like tables
    // Settings: single user settings object
    if (localStorage.getItem('settings') === null) {
      const now = new Date().toISOString();
      const defaultSettings = {
        id: 'settings_default',
        default_video_quality: 'auto', // enum: auto, p360, p480, p720, p1080
        subtitles_default_language: 'English',
        subtitles_always_on: false,
        progress_reminder_emails_enabled: false,
        updated_at: now
      };
      localStorage.setItem('settings', JSON.stringify(defaultSettings));
    }

    // About page content
    if (localStorage.getItem('about_page_content') === null) {
      const emptyAbout = {
        headline: '',
        body_html: '',
        instructors: [],
        team_members: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(emptyAbout));
    }

    // FAQ entries: array of faq objects
    ensure('faq_entries', []);

    // Support contact info
    if (localStorage.getItem('support_contact_info') === null) {
      const emptySupport = {
        support_email: '',
        support_phone: '',
        business_hours: ''
      };
      localStorage.setItem('support_contact_info', JSON.stringify(emptySupport));
    }

    // Legal documents: map doc_type -> doc object
    if (localStorage.getItem('legal_documents') === null) {
      localStorage.setItem('legal_documents', JSON.stringify({}));
    }

    // ID counter for _generateId
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
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
    const n = this._getNextIdCounter();
    return prefix + '_' + n;
  }

  _now() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    return value ? new Date(value) : null;
  }

  // Get single Settings object
  _getSettingsObject() {
    const raw = localStorage.getItem('settings');
    if (!raw) {
      const now = this._now();
      const settings = {
        id: 'settings_default',
        default_video_quality: 'auto',
        subtitles_default_language: 'English',
        subtitles_always_on: false,
        progress_reminder_emails_enabled: false,
        updated_at: now
      };
      this._saveToStorage('settings', settings);
      return settings;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      const now = this._now();
      const settings = {
        id: 'settings_default',
        default_video_quality: 'auto',
        subtitles_default_language: 'English',
        subtitles_always_on: false,
        progress_reminder_emails_enabled: false,
        updated_at: now
      };
      this._saveToStorage('settings', settings);
      return settings;
    }
  }

  // =========================
  // Cart helpers
  // =========================

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    // Find open cart
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      const now = this._now();
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now,
        status: 'open',
        subtotal: 0,
        currency: 'usd'
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const cart = carts.find(c => c.id === cartId);
    if (!cart) return;
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cartId);
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.line_total || 0), 0);
    cart.subtotal = subtotal;
    cart.currency = 'usd';
    cart.updated_at = this._now();
    this._saveToStorage('carts', carts);
  }

  _createOrderFromCart(customer_name, customer_email, payment) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const contentItems = this._getFromStorage('content_items', []);

    const cart = carts.find(c => c.status === 'open');
    if (!cart) {
      return { success: false, order: null, order_items: [], message: 'No open cart to checkout.' };
    }

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    if (itemsForCart.length === 0) {
      return { success: false, order: null, order_items: [], message: 'Cart is empty.' };
    }

    this._recalculateCartTotals(cart.id);

    const now = this._now();
    const cardNumber = payment && payment.card_number ? String(payment.card_number) : '';
    const last4 = cardNumber.slice(-4);

    const order = {
      id: this._generateId('order'),
      order_type: 'content_purchase',
      customer_name,
      customer_email,
      total_amount: cart.subtotal || 0,
      currency: 'usd',
      status: 'paid',
      cart_id: cart.id,
      subscription_plan_id: null,
      created_at: now,
      completed_at: now,
      payment_last4: last4
    };

    const orderItems = [];
    itemsForCart.forEach(ci => {
      const content = contentItems.find(c => c.id === ci.content_item_id) || null;
      const orderItem = {
        id: this._generateId('order_item'),
        order_id: order.id,
        content_item_id: ci.content_item_id,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        title_snapshot: content ? content.title : ''
      };
      orderItems.push(orderItem);
    });

    // Persist order and order items
    const orders = this._getFromStorage('orders', []);
    orders.push(order);
    this._saveToStorage('orders', orders);

    const allOrderItems = this._getFromStorage('order_items', []);
    Array.prototype.push.apply(allOrderItems, orderItems);
    this._saveToStorage('order_items', allOrderItems);

    // Close the cart
    cart.status = 'checked_out';
    cart.updated_at = now;
    this._saveToStorage('carts', carts);

    return { success: true, order, order_items: orderItems, message: 'Checkout completed.' };
  }

  _createSubscriptionOrder(planId, subscriber_name, subscriber_email, payment, auto_renew) {
    const plans = this._getFromStorage('subscription_plans', []);
    const plan = plans.find(p => p.id === planId && p.status === 'active');
    if (!plan) {
      return { success: false, subscription: null, order: null, message: 'Subscription plan not found or inactive.' };
    }

    const now = this._now();
    const cardNumber = payment && payment.card_number ? String(payment.card_number) : '';
    const last4 = cardNumber.slice(-4);

    const subscription = {
      id: this._generateId('subscription'),
      plan_id: plan.id,
      subscriber_name,
      subscriber_email,
      start_date: now,
      end_date: null,
      auto_renew: auto_renew !== undefined ? !!auto_renew : true,
      status: 'active',
      created_at: now
    };

    const order = {
      id: this._generateId('order'),
      order_type: 'subscription',
      customer_name: subscriber_name,
      customer_email: subscriber_email,
      total_amount: plan.price_per_period,
      currency: 'usd',
      status: 'paid',
      cart_id: null,
      subscription_plan_id: plan.id,
      created_at: now,
      completed_at: now,
      payment_last4: last4
    };

    const subscriptions = this._getFromStorage('subscriptions', []);
    subscriptions.push(subscription);
    this._saveToStorage('subscriptions', subscriptions);

    const orders = this._getFromStorage('orders', []);
    orders.push(order);
    this._saveToStorage('orders', orders);

    return { success: true, subscription, order, message: 'Subscription started.' };
  }

  _updatePlaylistStats(playlistId) {
    const playlists = this._getFromStorage('playlists', []);
    const playlistItems = this._getFromStorage('playlist_items', []);
    const contentItems = this._getFromStorage('content_items', []);

    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return null;

    const itemsForPlaylist = playlistItems.filter(pi => pi.playlist_id === playlistId);
    const itemCount = itemsForPlaylist.length;
    let totalDuration = 0;
    itemsForPlaylist.forEach(pi => {
      const content = contentItems.find(c => c.id === pi.content_item_id);
      if (content && typeof content.duration_minutes === 'number') {
        totalDuration += content.duration_minutes;
      }
    });

    playlist.item_count = itemCount;
    playlist.total_duration_minutes = totalDuration;
    playlist.updated_at = this._now();

    this._saveToStorage('playlists', playlists);
    return playlist;
  }

  // =========================
  // Interfaces implementation
  // =========================

  // 1) searchAllContent(query, maxResultsPerType?)
  searchAllContent(query, maxResultsPerType) {
    const q = (query || '').trim().toLowerCase();
    const limit = typeof maxResultsPerType === 'number' && maxResultsPerType > 0 ? maxResultsPerType : 5;

    const contentItems = this._getFromStorage('content_items', []);
    const liveClasses = this._getFromStorage('live_classes', []);

    const matchesContent = contentItems
      .filter(ci => ci.status === 'active')
      .filter(ci => {
        if (!q) return true;
        const inTitle = (ci.title || '').toLowerCase().includes(q);
        const inDesc = (ci.description || '').toLowerCase().includes(q);
        const inTags = Array.isArray(ci.tags) && ci.tags.some(t => String(t).toLowerCase().includes(q));
        return inTitle || inDesc || inTags;
      })
      .slice(0, limit);

    const matchesLive = liveClasses
      .filter(lc => lc.status === 'scheduled')
      .filter(lc => {
        if (!q) return true;
        const inTitle = (lc.title || '').toLowerCase().includes(q);
        const inDesc = (lc.description || '').toLowerCase().includes(q);
        const inTags = Array.isArray(lc.tags) && lc.tags.some(t => String(t).toLowerCase().includes(q));
        const inSubject = (lc.subject || '').toLowerCase().includes(q);
        return inTitle || inDesc || inTags || inSubject;
      })
      .slice(0, limit);

    return {
      lessons_and_courses: matchesContent,
      live_classes: matchesLive
    };
  }

  // 2) getHomeFeaturedContent()
  getHomeFeaturedContent() {
    const contentItems = this._getFromStorage('content_items', []);
    const liveClasses = this._getFromStorage('live_classes', []);

    const activeContent = contentItems.filter(ci => ci.status === 'active');

    const byRatingDesc = (a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      const da = this._parseDate(a.created_at) || new Date(0);
      const db = this._parseDate(b.created_at) || new Date(0);
      return db - da;
    };

    const featured_lessons = activeContent
      .filter(ci => ci.content_type === 'lesson')
      .sort(byRatingDesc)
      .slice(0, 5);

    const featured_courses = activeContent
      .filter(ci => ci.content_type === 'course' || ci.content_type === 'bundle')
      .sort(byRatingDesc)
      .slice(0, 5);

    const featured_videos = activeContent
      .filter(ci => ci.content_type === 'video')
      .sort(byRatingDesc)
      .slice(0, 5);

    const featured_live_classes = liveClasses
      .filter(lc => lc.status === 'scheduled')
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      })
      .slice(0, 5);

    return {
      featured_lessons,
      featured_courses,
      featured_videos,
      featured_live_classes
    };
  }

  // 3) getContentFilterOptions()
  getContentFilterOptions() {
    const contentItems = this._getFromStorage('content_items', []);

    const mediumsEnum = [
      'watercolor',
      'acrylic',
      'gouache',
      'digital_painting',
      'oil',
      'mixed_media',
      'other'
    ];

    const difficultiesEnum = ['beginner', 'intermediate', 'advanced', 'all_levels'];
    const contentTypesEnum = ['lesson', 'course', 'bundle', 'video'];
    const videoCategoriesEnum = ['standard', 'quick_tip', 'preview'];

    const mediums = mediumsEnum.map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    const difficulties = difficultiesEnum.map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    const content_types = contentTypesEnum.map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    const video_categories = videoCategoriesEnum.map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

    let minPrice = null;
    let maxPrice = null;
    let minDuration = null;
    let maxDuration = null;
    const tagSet = new Set();

    contentItems.forEach(ci => {
      if (typeof ci.price === 'number') {
        if (minPrice === null || ci.price < minPrice) minPrice = ci.price;
        if (maxPrice === null || ci.price > maxPrice) maxPrice = ci.price;
      }
      if (typeof ci.duration_minutes === 'number') {
        if (minDuration === null || ci.duration_minutes < minDuration) minDuration = ci.duration_minutes;
        if (maxDuration === null || ci.duration_minutes > maxDuration) maxDuration = ci.duration_minutes;
      }
      if (Array.isArray(ci.tags)) {
        ci.tags.forEach(t => tagSet.add(String(t)));
      }
    });

    const price_range = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      currency: 'usd'
    };

    const duration_range_minutes = {
      min: minDuration !== null ? minDuration : 0,
      max: maxDuration !== null ? maxDuration : 0
    };

    const sort_options = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' },
      { value: 'newest', label: 'Newest' },
      { value: 'duration_asc', label: 'Duration: Short to Long' },
      { value: 'relevance', label: 'Relevance' }
    ];

    const rating_thresholds = [3.0, 3.5, 4.0, 4.5];
    const review_count_thresholds = [10, 50, 100];

    const tag_suggestions = Array.from(tagSet);

    return {
      mediums,
      difficulties,
      content_types,
      video_categories,
      rating_thresholds,
      review_count_thresholds,
      price_range,
      duration_range_minutes,
      sort_options,
      tag_suggestions
    };
  }

  // 4) searchContentItems(query, filters, sort, page, per_page)
  searchContentItems(query, filters, sort, page, per_page) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    let items = this._getFromStorage('content_items', []).filter(ci => ci.status === 'active');

    // Free-text search
    if (q) {
      items = items.filter(ci => {
        const inTitle = (ci.title || '').toLowerCase().includes(q);
        const inDesc = (ci.description || '').toLowerCase().includes(q);
        const inTags = Array.isArray(ci.tags) && ci.tags.some(t => String(t).toLowerCase().includes(q));
        return inTitle || inDesc || inTags;
      });
    }

    // Filters
    if (f.medium) {
      items = items.filter(ci => ci.medium === f.medium);
    }
    if (f.difficulty) {
      items = items.filter(ci => ci.difficulty === f.difficulty);
    }
    if (typeof f.min_price === 'number') {
      items = items.filter(ci => typeof ci.price === 'number' && ci.price >= f.min_price);
    }
    if (typeof f.max_price === 'number') {
      items = items.filter(ci => typeof ci.price === 'number' && ci.price <= f.max_price);
    }
    if (typeof f.is_free === 'boolean') {
      items = items.filter(ci => !!ci.is_free === f.is_free);
    }
    if (typeof f.min_duration_minutes === 'number') {
      items = items.filter(ci => typeof ci.duration_minutes === 'number' && ci.duration_minutes >= f.min_duration_minutes);
    }
    if (typeof f.max_duration_minutes === 'number') {
      items = items.filter(ci => typeof ci.duration_minutes === 'number' && ci.duration_minutes <= f.max_duration_minutes);
    }
    if (typeof f.min_rating === 'number') {
      items = items.filter(ci => typeof ci.rating === 'number' && ci.rating >= f.min_rating);
    }
    if (typeof f.min_review_count === 'number') {
      items = items.filter(ci => typeof ci.review_count === 'number' && ci.review_count >= f.min_review_count);
    }
    if (Array.isArray(f.content_types) && f.content_types.length > 0) {
      items = items.filter(ci => f.content_types.indexOf(ci.content_type) !== -1);
    }
    if (Array.isArray(f.tags) && f.tags.length > 0) {
      const wanted = f.tags.map(t => String(t).toLowerCase());
      items = items.filter(ci => Array.isArray(ci.tags) && ci.tags.some(t => wanted.indexOf(String(t).toLowerCase()) !== -1));
    }
    if (f.video_category) {
      items = items.filter(ci => ci.video_category === f.video_category);
    }

    // Sorting
    const s = sort || 'relevance';
    const byRatingDesc = (a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      const rca = typeof a.review_count === 'number' ? a.review_count : 0;
      const rcb = typeof b.review_count === 'number' ? b.review_count : 0;
      return rcb - rca;
    };

    if (s === 'rating_desc') {
      items.sort(byRatingDesc);
    } else if (s === 'popularity_desc') {
      items.sort((a, b) => {
        const ca = typeof a.review_count === 'number' ? a.review_count : 0;
        const cb = typeof b.review_count === 'number' ? b.review_count : 0;
        return cb - ca;
      });
    } else if (s === 'newest') {
      items.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    } else if (s === 'duration_asc') {
      items.sort((a, b) => {
        const da = typeof a.duration_minutes === 'number' ? a.duration_minutes : 0;
        const db = typeof b.duration_minutes === 'number' ? b.duration_minutes : 0;
        return da - db;
      });
    } else if (s === 'relevance') {
      // Approximate relevance: rating desc then review_count desc
      items.sort(byRatingDesc);
    }

    const currentPage = page && page > 0 ? page : 1;
    const perPage = per_page && per_page > 0 ? per_page : 20;
    const total = items.length;
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;

    return {
      total,
      page: currentPage,
      per_page: perPage,
      items: items.slice(start, end)
    };
  }

  // 5) getContentItemDetail(contentItemId)
  getContentItemDetail(contentItemId) {
    const contentItems = this._getFromStorage('content_items', []);
    const favorites = this._getFromStorage('favorite_items', []);
    const playlistItems = this._getFromStorage('playlist_items', []);
    const playlists = this._getFromStorage('playlists', []);
    const questions = this._getFromStorage('questions', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);
    const enrollments = this._getFromStorage('enrollments', []);

    const content_item = contentItems.find(ci => ci.id === contentItemId) || null;

    // Favorite
    const favorite = favorites.find(f => f.content_item_id === contentItemId);
    const is_favorited = !!favorite;

    // In cart: check open cart
    const openCart = carts.find(c => c.status === 'open');
    let is_in_cart = false;
    if (openCart) {
      is_in_cart = cartItems.some(ci => ci.cart_id === openCart.id && ci.content_item_id === contentItemId);
    }

    // Enrollment status
    const enrollment = enrollments.find(e => e.content_item_id === contentItemId);
    const enrollment_status = enrollment ? 'enrolled' : 'not_enrolled';

    // Playlist memberships
    const membershipsRaw = playlistItems.filter(pi => pi.content_item_id === contentItemId);
    const playlist_memberships = membershipsRaw.map(pi => {
      const pl = playlists.find(p => p.id === pi.playlist_id);
      return {
        playlist_id: pi.playlist_id,
        playlist_name: pl ? pl.name : ''
      };
    });

    // Q&A preview: most recent few
    const qna_preview = questions
      .filter(q => q.content_item_id === contentItemId)
      .sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      })
      .slice(0, 3);

    return {
      content_item,
      is_favorited,
      is_in_cart,
      enrollment_status,
      playlist_memberships,
      qna_preview
    };
  }

  // 6) addContentItemToFavorites(contentItemId)
  addContentItemToFavorites(contentItemId) {
    const contentItems = this._getFromStorage('content_items', []);
    const content = contentItems.find(ci => ci.id === contentItemId);
    if (!content) {
      return { success: false, favorite_item: null, message: 'Content item not found.' };
    }

    const favorites = this._getFromStorage('favorite_items', []);
    const existing = favorites.find(f => f.content_item_id === contentItemId);
    if (existing) {
      return { success: true, favorite_item: existing, message: 'Already in favorites.' };
    }

    const favorite_item = {
      id: this._generateId('favorite'),
      content_item_id: contentItemId,
      added_at: this._now()
    };
    favorites.push(favorite_item);
    this._saveToStorage('favorite_items', favorites);

    return { success: true, favorite_item, message: 'Added to favorites.' };
  }

  // 7) removeContentItemFromFavorites(contentItemId)
  removeContentItemFromFavorites(contentItemId) {
    let favorites = this._getFromStorage('favorite_items', []);
    const initialLen = favorites.length;
    favorites = favorites.filter(f => f.content_item_id !== contentItemId);
    this._saveToStorage('favorite_items', favorites);
    const removed = favorites.length !== initialLen;
    return {
      success: removed,
      message: removed ? 'Removed from favorites.' : 'Item not found in favorites.'
    };
  }

  // 8) getFavoriteItems()
  getFavoriteItems() {
    const favorites = this._getFromStorage('favorite_items', []);
    const contentItems = this._getFromStorage('content_items', []);

    const items = favorites.map(fav => {
      const content_item = contentItems.find(ci => ci.id === fav.content_item_id) || null;
      return {
        favorite: fav,
        content_item
      };
    });

    return { items };
  }

  // 9) createPlaylist(name, description?)
  createPlaylist(name, description) {
    const now = this._now();
    const playlist = {
      id: this._generateId('playlist'),
      name,
      description: description || '',
      item_count: 0,
      total_duration_minutes: 0,
      created_at: now,
      updated_at: now
    };
    const playlists = this._getFromStorage('playlists', []);
    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);
    return playlist;
  }

  // 10) getPlaylists()
  getPlaylists() {
    const playlists = this._getFromStorage('playlists', []);
    return { playlists };
  }

  // 11) getPlaylistDetail(playlistId)
  getPlaylistDetail(playlistId) {
    const playlists = this._getFromStorage('playlists', []);
    const playlistItems = this._getFromStorage('playlist_items', []);
    const contentItems = this._getFromStorage('content_items', []);

    const playlist = playlists.find(p => p.id === playlistId) || null;

    const itemsForPlaylist = playlistItems
      .filter(pi => pi.playlist_id === playlistId)
      .sort((a, b) => a.order_index - b.order_index);

    const items = itemsForPlaylist.map(pi => {
      const content_item = contentItems.find(ci => ci.id === pi.content_item_id) || null;
      return {
        playlist_item: pi,
        content_item
      };
    });

    return {
      playlist,
      items
    };
  }

  // 12) addContentItemToPlaylist(playlistId, contentItemId, position?)
  addContentItemToPlaylist(playlistId, contentItemId, position) {
    const playlists = this._getFromStorage('playlists', []);
    const playlistItems = this._getFromStorage('playlist_items', []);
    const contentItems = this._getFromStorage('content_items', []);

    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) {
      return { success: false, playlist_item: null, updated_playlist: null, message: 'Playlist not found.' };
    }

    const content = contentItems.find(ci => ci.id === contentItemId);
    if (!content) {
      return { success: false, playlist_item: null, updated_playlist: null, message: 'Content item not found.' };
    }

    const itemsForPlaylist = playlistItems
      .filter(pi => pi.playlist_id === playlistId)
      .sort((a, b) => a.order_index - b.order_index);

    let indexToUse;
    if (typeof position === 'number' && position >= 0 && position <= itemsForPlaylist.length) {
      indexToUse = position;
    } else {
      indexToUse = itemsForPlaylist.length;
    }

    // Shift order_index for existing items when inserting in the middle
    itemsForPlaylist.forEach(pi => {
      if (pi.order_index >= indexToUse) {
        pi.order_index += 1;
      }
    });

    const now = this._now();
    const playlist_item = {
      id: this._generateId('playlist_item'),
      playlist_id: playlistId,
      content_item_id: contentItemId,
      order_index: indexToUse,
      added_at: now
    };

    playlistItems.push(playlist_item);
    this._saveToStorage('playlist_items', playlistItems);

    const updated_playlist = this._updatePlaylistStats(playlistId);

    return {
      success: true,
      playlist_item,
      updated_playlist,
      message: 'Item added to playlist.'
    };
  }

  // 13) removePlaylistItem(playlistItemId)
  removePlaylistItem(playlistItemId) {
    let playlistItems = this._getFromStorage('playlist_items', []);
    const target = playlistItems.find(pi => pi.id === playlistItemId);
    if (!target) {
      return { success: false, updated_playlist: null, message: 'Playlist item not found.' };
    }

    const playlistId = target.playlist_id;
    playlistItems = playlistItems.filter(pi => pi.id !== playlistItemId);

    // Re-normalize order_index for that playlist
    const itemsForPlaylist = playlistItems
      .filter(pi => pi.playlist_id === playlistId)
      .sort((a, b) => a.order_index - b.order_index);

    itemsForPlaylist.forEach((pi, idx) => {
      pi.order_index = idx;
    });

    this._saveToStorage('playlist_items', playlistItems);

    const updated_playlist = this._updatePlaylistStats(playlistId);

    return {
      success: true,
      updated_playlist,
      message: 'Playlist item removed.'
    };
  }

  // 14) reorderPlaylistItems(playlistId, orderedPlaylistItemIds)
  reorderPlaylistItems(playlistId, orderedPlaylistItemIds) {
    const playlistItems = this._getFromStorage('playlist_items', []);
    const contentItems = this._getFromStorage('content_items', []);

    const itemsForPlaylist = playlistItems.filter(pi => pi.playlist_id === playlistId);

    const idSet = new Set(orderedPlaylistItemIds || []);
    const filtered = itemsForPlaylist.filter(pi => idSet.has(pi.id));

    // Apply new indices according to orderedPlaylistItemIds
    (orderedPlaylistItemIds || []).forEach((id, idx) => {
      const pi = filtered.find(x => x.id === id);
      if (pi) {
        pi.order_index = idx;
      }
    });

    this._saveToStorage('playlist_items', playlistItems);

    const updated_playlist = this._updatePlaylistStats(playlistId);

    const sortedItems = playlistItems
      .filter(pi => pi.playlist_id === playlistId)
      .sort((a, b) => a.order_index - b.order_index);

    const items = sortedItems.map(pi => {
      const content_item = contentItems.find(ci => ci.id === pi.content_item_id) || null;
      return {
        playlist_item: pi,
        content_item
      };
    });

    return {
      playlist: updated_playlist,
      items
    };
  }

  // 15) updatePlaylistMeta(playlistId, name?, description?)
  updatePlaylistMeta(playlistId, name, description) {
    const playlists = this._getFromStorage('playlists', []);
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return null;

    if (typeof name === 'string' && name.length > 0) {
      playlist.name = name;
    }
    if (typeof description === 'string') {
      playlist.description = description;
    }
    playlist.updated_at = this._now();
    this._saveToStorage('playlists', playlists);
    return playlist;
  }

  // 16) deletePlaylist(playlistId)
  deletePlaylist(playlistId) {
    const playlists = this._getFromStorage('playlists', []);
    const playlistExists = playlists.some(p => p.id === playlistId);

    const newPlaylists = playlists.filter(p => p.id !== playlistId);
    this._saveToStorage('playlists', newPlaylists);

    let playlistItems = this._getFromStorage('playlist_items', []);
    playlistItems = playlistItems.filter(pi => pi.playlist_id !== playlistId);
    this._saveToStorage('playlist_items', playlistItems);

    return {
      success: playlistExists,
      message: playlistExists ? 'Playlist deleted.' : 'Playlist not found.'
    };
  }

  // 17) addContentItemToCart(contentItemId, quantity = 1)
  addContentItemToCart(contentItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const contentItems = this._getFromStorage('content_items', []);
    const content = contentItems.find(ci => ci.id === contentItemId);
    if (!content) {
      return { success: false, cart: null, items: [], message: 'Content item not found.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const existing = cartItems.find(ci => ci.cart_id === cart.id && ci.content_item_id === contentItemId);
    const unit_price = typeof content.price === 'number' ? content.price : 0;
    const now = this._now();

    if (existing) {
      existing.quantity += qty;
      existing.line_total = existing.quantity * existing.unit_price;
      existing.added_at = now;
    } else {
      const cart_item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        content_item_id: contentItemId,
        quantity: qty,
        unit_price,
        line_total: unit_price * qty,
        added_at: now
      };
      cartItems.push(cart_item);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart.id);

    const updatedCart = this._getFromStorage('carts', []).find(c => c.id === cart.id) || cart;

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const content_item = contentItems.find(x => x.id === ci.content_item_id) || null;
        return {
          cart_item: ci,
          content_item
        };
      });

    return {
      success: true,
      cart: updatedCart,
      items,
      message: 'Item added to cart.'
    };
  }

  // 18) removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const target = cartItems.find(ci => ci.id === cartItemId);
    if (!target) {
      const openCart = this._getFromStorage('carts', []).find(c => c.status === 'open') || null;
      return { success: false, cart: openCart, items: [], message: 'Cart item not found.' };
    }

    const cartId = target.cart_id;
    const filteredItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', filteredItems);
    this._recalculateCartTotals(cartId);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === cartId) || null;
    const contentItems = this._getFromStorage('content_items', []);

    const items = filteredItems
      .filter(ci => ci.cart_id === cartId)
      .map(ci => {
        const content_item = contentItems.find(x => x.id === ci.content_item_id) || null;
        return {
          cart_item: ci,
          content_item
        };
      });

    return {
      success: true,
      cart,
      items,
      message: 'Cart item removed.'
    };
  }

  // 19) getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const contentItems = this._getFromStorage('content_items', []);

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const content_item = contentItems.find(x => x.id === ci.content_item_id) || null;
        return {
          cart_item: ci,
          content_item
        };
      });

    return {
      cart,
      items
    };
  }

  // 20) completeCartCheckout(customer_name, customer_email, payment)
  completeCartCheckout(customer_name, customer_email, payment) {
    const result = this._createOrderFromCart(customer_name, customer_email, payment || {});
    return result;
  }

  // 21) getSubscriptionPlans(billing_period?, max_price_per_period?, includes_offline_downloads?, include_inactive?)
  getSubscriptionPlans(billing_period, max_price_per_period, includes_offline_downloads, include_inactive) {
    let plans = this._getFromStorage('subscription_plans', []);

    if (!include_inactive) {
      plans = plans.filter(p => p.status === 'active');
    }
    if (billing_period) {
      plans = plans.filter(p => p.billing_period === billing_period);
    }
    if (typeof max_price_per_period === 'number') {
      plans = plans.filter(p => typeof p.price_per_period === 'number' && p.price_per_period <= max_price_per_period);
    }
    if (typeof includes_offline_downloads === 'boolean') {
      plans = plans.filter(p => !!p.includes_offline_downloads === includes_offline_downloads);
    }

    return { plans };
  }

  // 22) getSubscriptionPlanDetail(subscriptionPlanId)
  getSubscriptionPlanDetail(subscriptionPlanId) {
    const plans = this._getFromStorage('subscription_plans', []);
    const plan = plans.find(p => p.id === subscriptionPlanId) || null;
    return plan;
  }

  // 23) startSubscription(planId, subscriber_name, subscriber_email, payment, auto_renew?)
  startSubscription(planId, subscriber_name, subscriber_email, payment, auto_renew) {
    const result = this._createSubscriptionOrder(planId, subscriber_name, subscriber_email, payment || {}, auto_renew);
    return result;
  }

  // 24) getLiveClassFilterOptions()
  getLiveClassFilterOptions() {
    const liveClasses = this._getFromStorage('live_classes', []);

    const mediumsEnum = [
      'watercolor',
      'acrylic',
      'gouache',
      'digital_painting',
      'oil',
      'mixed_media',
      'other'
    ];
    const difficultiesEnum = ['beginner', 'intermediate', 'advanced', 'all_levels'];

    const mediums = mediumsEnum.map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));
    const difficulties = difficultiesEnum.map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

    const subjectsSet = new Set();
    liveClasses.forEach(lc => {
      if (lc.subject) subjectsSet.add(String(lc.subject));
      if (Array.isArray(lc.tags)) {
        lc.tags.forEach(t => subjectsSet.add(String(t)));
      }
    });
    const subjects = Array.from(subjectsSet);

    const time_of_day_ranges = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' }
    ];

    const sort_options = [
      { value: 'date_asc', label: 'Date: Soonest First' },
      { value: 'date_desc', label: 'Date: Latest First' }
    ];

    return {
      mediums,
      difficulties,
      subjects,
      time_of_day_ranges,
      sort_options
    };
  }

  // 25) searchLiveClasses(filters, sort, page, per_page)
  searchLiveClasses(filters, sort, page, per_page) {
    const f = filters || {};
    let items = this._getFromStorage('live_classes', []);

    if (f.status) {
      items = items.filter(lc => lc.status === f.status);
    } else {
      items = items.filter(lc => lc.status === 'scheduled');
    }

    if (f.medium) {
      items = items.filter(lc => lc.medium === f.medium);
    }
    if (f.subject) {
      const subj = String(f.subject).toLowerCase();
      items = items.filter(lc => (lc.subject || '').toLowerCase() === subj);
    }
    if (Array.isArray(f.tags) && f.tags.length > 0) {
      const wanted = f.tags.map(t => String(t).toLowerCase());
      items = items.filter(lc => Array.isArray(lc.tags) && lc.tags.some(t => wanted.indexOf(String(t).toLowerCase()) !== -1));
    }
    if (f.difficulty) {
      items = items.filter(lc => lc.difficulty === f.difficulty);
    }

    if (f.date_from) {
      const from = new Date(f.date_from + 'T00:00:00Z');
      items = items.filter(lc => {
        const d = this._parseDate(lc.start_datetime);
        return d && d >= from;
      });
    }
    if (f.date_to) {
      const to = new Date(f.date_to + 'T23:59:59Z');
      items = items.filter(lc => {
        const d = this._parseDate(lc.start_datetime);
        return d && d <= to;
      });
    }

    if (f.weekends_only) {
      items = items.filter(lc => {
        const d = this._parseDate(lc.start_datetime);
        if (!d) return false;
        const day = d.getUTCDay();
        return day === 0 || day === 6;
      });
    }
    if (f.weekdays_only) {
      items = items.filter(lc => {
        const d = this._parseDate(lc.start_datetime);
        if (!d) return false;
        const day = d.getUTCDay();
        return day >= 1 && day <= 5;
      });
    }

    if (f.start_time_min) {
      const minTime = f.start_time_min;
      items = items.filter(lc => {
        const d = this._parseDate(lc.start_datetime);
        if (!d) return false;
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mm = String(d.getUTCMinutes()).padStart(2, '0');
        const timeStr = hh + ':' + mm;
        return timeStr >= minTime;
      });
    }

    const s = sort || 'date_asc';
    if (s === 'date_asc') {
      items.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      });
    } else if (s === 'date_desc') {
      items.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return db - da;
      });
    }

    const currentPage = page && page > 0 ? page : 1;
    const perPage = per_page && per_page > 0 ? per_page : 20;
    const total = items.length;
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;

    return {
      total,
      page: currentPage,
      per_page: perPage,
      items: items.slice(start, end)
    };
  }

  // 26) getLiveClassDetail(liveClassId)
  getLiveClassDetail(liveClassId) {
    const liveClasses = this._getFromStorage('live_classes', []);
    const registrations = this._getFromStorage('live_class_registrations', []);

    const live_class = liveClasses.find(lc => lc.id === liveClassId) || null;

    const regsForClass = registrations.filter(r => r.live_class_id === liveClassId && r.status === 'reserved');
    const registration_status = regsForClass.length > 0 ? 'reserved' : 'not_registered';

    let remaining_spots = null;
    if (live_class && typeof live_class.max_participants === 'number') {
      remaining_spots = live_class.max_participants - regsForClass.length;
      if (remaining_spots < 0) remaining_spots = 0;
    }

    return {
      live_class,
      registration_status,
      remaining_spots
    };
  }

  // 27) registerForLiveClass(liveClassId, name, email)
  registerForLiveClass(liveClassId, name, email) {
    const liveClasses = this._getFromStorage('live_classes', []);
    const live_class = liveClasses.find(lc => lc.id === liveClassId && lc.status === 'scheduled');
    if (!live_class) {
      return { success: false, registration: null, message: 'Live class not found or not scheduled.' };
    }

    const registrations = this._getFromStorage('live_class_registrations', []);
    const now = this._now();
    const registration = {
      id: this._generateId('live_class_registration'),
      live_class_id: liveClassId,
      name,
      email,
      registered_at: now,
      status: 'reserved'
    };

    registrations.push(registration);
    this._saveToStorage('live_class_registrations', registrations);

    return {
      success: true,
      registration,
      message: 'Live class reserved.'
    };
  }

  // 28) getQuestionsForContentItem(contentItemId, page?, per_page?)
  getQuestionsForContentItem(contentItemId, page, per_page) {
    const questions = this._getFromStorage('questions', []);
    const contentItems = this._getFromStorage('content_items', []);

    let list = questions.filter(q => q.content_item_id === contentItemId);
    list.sort((a, b) => {
      const da = this._parseDate(a.created_at) || new Date(0);
      const db = this._parseDate(b.created_at) || new Date(0);
      return db - da;
    });

    const currentPage = page && page > 0 ? page : 1;
    const perPage = per_page && per_page > 0 ? per_page : 20;
    const total = list.length;
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;

    const pagedQuestions = list.slice(start, end).map(q => {
      const content_item = contentItems.find(ci => ci.id === q.content_item_id) || null;
      // Attach resolved foreign key according to requirement
      return Object.assign({}, q, { content_item });
    });

    return {
      total,
      page: currentPage,
      per_page: perPage,
      questions: pagedQuestions
    };
  }

  // 29) createQuestionForContentItem(contentItemId, text, author_name?)
  createQuestionForContentItem(contentItemId, text, author_name) {
    const contentItems = this._getFromStorage('content_items', []);
    const content = contentItems.find(ci => ci.id === contentItemId);
    if (!content) {
      return null;
    }

    const questions = this._getFromStorage('questions', []);
    const question = {
      id: this._generateId('question'),
      content_item_id: contentItemId,
      text,
      author_name: author_name || '',
      created_at: this._now(),
      instructor_response: null,
      responded_at: null
    };

    questions.push(question);
    this._saveToStorage('questions', questions);

    return question;
  }

  // 30) enrollInContentItem(contentItemId, enrollment_source?)
  enrollInContentItem(contentItemId, enrollment_source) {
    const contentItems = this._getFromStorage('content_items', []);
    const content = contentItems.find(ci => ci.id === contentItemId);
    if (!content) {
      return { success: false, enrollment: null, message: 'Content item not found.' };
    }

    const enrollments = this._getFromStorage('enrollments', []);
    const existing = enrollments.find(e => e.content_item_id === contentItemId);
    if (existing) {
      return { success: true, enrollment: existing, message: 'Already enrolled.' };
    }

    const now = this._now();
    const enrollment = {
      id: this._generateId('enrollment'),
      content_item_id: contentItemId,
      enrolled_at: now,
      enrollment_source: enrollment_source || 'free',
      progress_percent: 0
    };

    enrollments.push(enrollment);
    this._saveToStorage('enrollments', enrollments);

    return {
      success: true,
      enrollment,
      message: 'Enrolled successfully.'
    };
  }

  // 31) getUserSettings()
  getUserSettings() {
    return this._getSettingsObject();
  }

  // 32) updateUserSettings(default_video_quality?, subtitles_default_language?, subtitles_always_on?, progress_reminder_emails_enabled?)
  updateUserSettings(default_video_quality, subtitles_default_language, subtitles_always_on, progress_reminder_emails_enabled) {
    const settings = this._getSettingsObject();

    if (typeof default_video_quality === 'string' && default_video_quality.length > 0) {
      // Expect one of: auto, p360, p480, p720, p1080
      settings.default_video_quality = default_video_quality;
    }
    if (typeof subtitles_default_language === 'string') {
      settings.subtitles_default_language = subtitles_default_language;
    }
    if (typeof subtitles_always_on === 'boolean') {
      settings.subtitles_always_on = subtitles_always_on;
    }
    if (typeof progress_reminder_emails_enabled === 'boolean') {
      settings.progress_reminder_emails_enabled = progress_reminder_emails_enabled;
    }

    settings.updated_at = this._now();
    this._saveToStorage('settings', settings);
    return settings;
  }

  // 33) getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (!raw) {
      const empty = {
        headline: '',
        body_html: '',
        instructors: [],
        team_members: []
      };
      this._saveToStorage('about_page_content', empty);
      return empty;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      const empty = {
        headline: '',
        body_html: '',
        instructors: [],
        team_members: []
      };
      this._saveToStorage('about_page_content', empty);
      return empty;
    }
  }

  // 34) getFaqEntries()
  getFaqEntries() {
    const faqs = this._getFromStorage('faq_entries', []);
    return { faqs };
  }

  // 35) getSupportContactInfo()
  getSupportContactInfo() {
    const raw = localStorage.getItem('support_contact_info');
    if (!raw) {
      const empty = {
        support_email: '',
        support_phone: '',
        business_hours: ''
      };
      this._saveToStorage('support_contact_info', empty);
      return empty;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      const empty = {
        support_email: '',
        support_phone: '',
        business_hours: ''
      };
      this._saveToStorage('support_contact_info', empty);
      return empty;
    }
  }

  // 36) submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    // We simulate by just returning a ticket id; no extra storage required
    const ticket_id = this._generateId('ticket');
    return {
      success: true,
      ticket_id,
      message: 'Your message has been received.'
    };
  }

  // 37) getLegalDocuments(doc_type)
  getLegalDocuments(doc_type) {
    const docs = this._getFromStorage('legal_documents', {});
    const doc = docs && docs[doc_type];
    if (doc) {
      return doc;
    }
    // Fallback empty document if not present in storage
    return {
      doc_type,
      title: '',
      body_html: '',
      last_updated: ''
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