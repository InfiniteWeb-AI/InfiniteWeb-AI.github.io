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
  }

  _initStorage() {
    const keys = [
      'media_items',
      'media_access_options',
      'categories',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'membership_plans',
      'membership_subscriptions',
      'account_settings',
      'library_items',
      'wishlist_items',
      'download_items',
      'reviews',
      'pages',
      'nav_links',
      'contact_requests',
      'active_checkout'
    ];

    for (const key of keys) {
      if (localStorage.getItem(key) === null) {
        // active_checkout is stored as an object or null; others as arrays
        if (key === 'active_checkout') {
          localStorage.setItem(key, JSON.stringify(null));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultVal) {
    const data = localStorage.getItem(key);
    if (data === null || typeof data === 'undefined') {
      return defaultVal !== undefined ? defaultVal : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultVal !== undefined ? defaultVal : [];
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

  // ---------- Helper: Account & membership ----------

  _getActiveAccountSettings() {
    const accounts = this._getFromStorage('account_settings', []);
    return accounts && accounts.length > 0 ? accounts[0] : null;
  }

  _getCurrentMembershipSubscription() {
    const subs = this._getFromStorage('membership_subscriptions', []);
    if (!subs || subs.length === 0) return null;
    // Prefer active or trial; fallback to latest by start_date
    let candidate = null;
    const preferredStatuses = ['active', 'trial'];
    for (const status of preferredStatuses) {
      const filtered = subs.filter(s => s.status === status);
      if (filtered.length > 0) {
        candidate = filtered.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))[filtered.length - 1];
        break;
      }
    }
    if (!candidate) {
      candidate = subs.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))[subs.length - 1];
    }
    return candidate;
  }

  // ---------- Helper: Cart & Checkout ----------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    if (!Array.isArray(carts)) carts = [];
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _getActiveCheckout() {
    return this._getFromStorage('active_checkout', null);
  }

  _setActiveCheckout(ctx) {
    this._saveToStorage('active_checkout', ctx || null);
  }

  _clearActiveCheckout() {
    this._saveToStorage('active_checkout', null);
  }

  _createOrderFromCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const mediaItems = this._getFromStorage('media_items', []);
    const accessOptions = this._getFromStorage('media_access_options', []);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    if (itemsForCart.length === 0) {
      return null;
    }

    const orderId = this._generateId('order');
    const orderItems = [];
    let subtotal = 0;

    for (const ci of itemsForCart) {
      const media = mediaItems.find(m => m.id === ci.media_item_id) || null;
      const access = accessOptions.find(a => a.id === ci.media_access_option_id) || null;
      const lineSubtotal = (ci.price_snapshot || 0) * (ci.quantity || 1);
      subtotal += lineSubtotal;

      const oi = {
        id: this._generateId('order_item'),
        order_id: orderId,
        item_type: 'media_access',
        media_item_id: ci.media_item_id,
        media_access_option_id: ci.media_access_option_id,
        membership_plan_id: null,
        title_snapshot: ci.title_snapshot || (media ? media.title : ''),
        description_snapshot: access ? access.label : '',
        unit_price: ci.price_snapshot || 0,
        quantity: ci.quantity || 1,
        subtotal: lineSubtotal
      };
      orderItems.push(oi);
    }

    const tax = 0; // Simplified: no tax calculation
    const total = subtotal + tax;

    const order = {
      id: orderId,
      order_type: 'content_purchase',
      status: 'pending',
      payment_status: total > 0 ? 'pending' : 'not_required',
      payment_method: 'none',
      subtotal_amount: subtotal,
      tax_amount: tax,
      total_amount: total,
      currency: 'usd',
      card_holder_name: null,
      card_last4: null,
      card_expiry: null,
      save_card_for_future: false,
      created_at: this._now(),
      completed_at: null
    };

    const orders = this._getFromStorage('orders', []);
    orders.push(order);
    this._saveToStorage('orders', orders);

    const allOrderItems = this._getFromStorage('order_items', []);
    for (const oi of orderItems) {
      allOrderItems.push(oi);
    }
    this._saveToStorage('order_items', allOrderItems);

    this._setActiveCheckout({
      order_id: order.id,
      checkout_source: 'cart'
    });

    return { order, orderItems };
  }

  _createOrderForMembershipPlan(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find(p => p.id === membershipPlanId && p.is_active !== false);
    if (!plan) return null;

    const orderId = this._generateId('order');
    const subtotal = plan.price_per_period || 0;
    const tax = 0;
    const total = subtotal + tax;

    const order = {
      id: orderId,
      order_type: 'membership_subscription',
      status: 'pending',
      payment_status: total > 0 ? 'pending' : 'not_required',
      payment_method: 'none',
      subtotal_amount: subtotal,
      tax_amount: tax,
      total_amount: total,
      currency: 'usd',
      card_holder_name: null,
      card_last4: null,
      card_expiry: null,
      save_card_for_future: false,
      created_at: this._now(),
      completed_at: null
    };

    const orderItem = {
      id: this._generateId('order_item'),
      order_id: orderId,
      item_type: 'membership',
      media_item_id: null,
      media_access_option_id: null,
      membership_plan_id: plan.id,
      title_snapshot: plan.name,
      description_snapshot: plan.description || '',
      unit_price: plan.price_per_period || 0,
      quantity: 1,
      subtotal: plan.price_per_period || 0
    };

    const orders = this._getFromStorage('orders', []);
    orders.push(order);
    this._saveToStorage('orders', orders);

    const orderItems = this._getFromStorage('order_items', []);
    orderItems.push(orderItem);
    this._saveToStorage('order_items', orderItems);

    this._setActiveCheckout({
      order_id: order.id,
      checkout_source: 'membership'
    });

    return { order, orderItems: [orderItem], plan };
  }

  _fulfillOrderItemsToLibraryAndDownloads(order, orderItems) {
    const mediaItems = this._getFromStorage('media_items', []);
    const accessOptions = this._getFromStorage('media_access_options', []);
    let libraryItems = this._getFromStorage('library_items', []);
    let downloadItems = this._getFromStorage('download_items', []);
    const account = this._getActiveAccountSettings();

    const newLibrary = [];
    const newDownloads = [];

    for (const oi of orderItems) {
      if (oi.item_type !== 'media_access') continue;
      const media = mediaItems.find(m => m.id === oi.media_item_id);
      const access = accessOptions.find(a => a.id === oi.media_access_option_id);
      if (!media || !access) continue;

      let lib = libraryItems.find(li => li.media_item_id === media.id && li.media_access_option_id === access.id);
      if (!lib) {
        lib = {
          id: this._generateId('library_item'),
          media_item_id: media.id,
          media_access_option_id: access.id,
          source_type: 'purchase',
          added_at: this._now(),
          watch_status: 'unwatched',
          last_watched_at: null,
          progress_percent: 0,
          user_rating: null
        };
        libraryItems.push(lib);
        newLibrary.push(lib);
      }

      if (access.is_downloadable) {
        const resolution = access.resolution && access.resolution !== 'not_applicable'
          ? access.resolution
          : (media.default_resolution || (account && account.default_download_quality) || 'full_hd_1080p');
        const existingDl = downloadItems.find(di => di.media_item_id === media.id && di.media_access_option_id === access.id && di.resolution === resolution);
        if (!existingDl) {
          const dl = {
            id: this._generateId('download_item'),
            media_item_id: media.id,
            media_access_option_id: access.id,
            resolution: resolution,
            download_status: 'not_started',
            file_size_mb: null,
            download_url: null,
            source_type: 'purchase',
            created_at: this._now(),
            last_updated_at: null
          };
          downloadItems.push(dl);
          newDownloads.push(dl);
        }
      }
    }

    this._saveToStorage('library_items', libraryItems);
    this._saveToStorage('download_items', downloadItems);

    return { libraryItems: newLibrary, downloadItems: newDownloads };
  }

  // ---------- Helper: Content filtering ----------

  _applyFamilyFriendlyFilter(mediaItems) {
    const account = this._getActiveAccountSettings();
    if (!account || !account.family_friendly_mode) return mediaItems;
    const blockedTags = ['adult', 'explicit', 'nsfw'];
    return mediaItems.filter(m => {
      if (!m || !Array.isArray(m.tags)) return true;
      const tagsLower = m.tags.map(t => String(t).toLowerCase());
      return !tagsLower.some(t => blockedTags.includes(t));
    });
  }

  _validateReviewTextLength(text) {
    const minLength = 50;
    if (!text || typeof text !== 'string') return { valid: false, minLength };
    return { valid: text.trim().length >= minLength, minLength };
  }

  _resolveCategoryForMedia(media, categories) {
    if (!media) return { category_key: null, category_name: null, category: null };
    const catId = media.category_id;
    const category = categories.find(c => c.id === catId || c.category_key === catId) || null;
    const category_key = category ? category.category_key : (catId || null);
    const category_name = category ? category.name : null;
    return { category_key, category_name, category };
  }

  _attachMediaForeignKeys(obj) {
    // Generic utility for objects that contain media_item_id or media_access_option_id etc.
    if (!obj || typeof obj !== 'object') return obj;
    const mediaItems = this._getFromStorage('media_items', []);
    const accessOptions = this._getFromStorage('media_access_options', []);
    const categories = this._getFromStorage('categories', []);
    const membershipPlans = this._getFromStorage('membership_plans', []);

    if (Object.prototype.hasOwnProperty.call(obj, 'media_item_id')) {
      obj.media_item = mediaItems.find(m => m.id === obj.media_item_id) || null;
      if (obj.media_item && !obj.media_item.category && obj.media_item.category_id) {
        const cat = categories.find(c => c.id === obj.media_item.category_id || c.category_key === obj.media_item.category_id) || null;
        if (cat) obj.media_item.category = cat;
      }
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'media_access_option_id')) {
      obj.media_access_option = accessOptions.find(a => a.id === obj.media_access_option_id) || null;
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'membership_plan_id')) {
      obj.membership_plan = membershipPlans.find(p => p.id === obj.membership_plan_id) || null;
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'cart_id')) {
      const carts = this._getFromStorage('cart', []);
      obj.cart = carts.find(c => c.id === obj.cart_id) || null;
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'order_id')) {
      const orders = this._getFromStorage('orders', []);
      obj.order = orders.find(o => o.id === obj.order_id) || null;
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'library_item_id')) {
      const libs = this._getFromStorage('library_items', []);
      obj.library_item = libs.find(l => l.id === obj.library_item_id) || null;
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'wishlist_item_id')) {
      const wl = this._getFromStorage('wishlist_items', []);
      obj.wishlist_item = wl.find(w => w.id === obj.wishlist_item_id) || null;
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'download_item_id')) {
      const di = this._getFromStorage('download_items', []);
      obj.download_item = di.find(d => d.id === obj.download_item_id) || null;
    }
    return obj;
  }

  // ---------- Interface: getHomePageContent ----------

  getHomePageContent() {
    const mediaItemsAll = this._getFromStorage('media_items', []);
    const categories = this._getFromStorage('categories', []);

    const mediaItems = this._applyFamilyFriendlyFilter(mediaItemsAll.slice());

    // Featured media: take up to first 10 items
    const featured_media = mediaItems.slice(0, 10).map(m => {
      const { category_key, category_name } = this._resolveCategoryForMedia(m, categories);
      const obj = {
        media_item_id: m.id,
        title: m.title,
        thumbnail_url: m.thumbnail_url || null,
        category_key: category_key,
        category_name: category_name,
        content_type: m.content_type,
        is_free: m.is_free,
        base_price: m.base_price,
        duration_minutes: m.duration_minutes,
        average_rating: m.average_rating,
        tags: m.tags || [],
        badges: []
      };
      if (m.is_beginner_friendly) obj.badges.push('beginner_friendly');
      obj.media_item = m;
      return obj;
    });

    // Beginner / educational media
    const beginnerMedia = mediaItems.filter(m => {
      if (m.is_beginner_friendly) return true;
      if (!m.tags) return false;
      const tagsLower = m.tags.map(t => String(t).toLowerCase());
      return tagsLower.includes('beginner / educational') || tagsLower.includes('beginner_educational');
    });

    const beginner_educational_media = beginnerMedia.slice(0, 10).map(m => {
      const obj = {
        media_item_id: m.id,
        title: m.title,
        thumbnail_url: m.thumbnail_url || null,
        duration_minutes: m.duration_minutes,
        is_free: m.is_free,
        base_price: m.base_price,
        average_rating: m.average_rating
      };
      obj.media_item = m;
      return obj;
    });

    // Free clips highlight
    const freeClips = mediaItems.filter(m => m.is_free && m.category_id === 'clips');
    const free_clips_highlight = freeClips.slice(0, 10).map(m => {
      const obj = {
        media_item_id: m.id,
        title: m.title,
        thumbnail_url: m.thumbnail_url || null,
        duration_minutes: m.duration_minutes,
        tags: m.tags || []
      };
      obj.media_item = m;
      return obj;
    });

    const highlighted_categories = categories
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(c => ({
        category_id: c.id,
        category_key: c.category_key,
        name: c.name,
        description: c.description || '',
        slug: c.slug || null,
        display_order: c.display_order || 0
      }));

    return {
      featured_media,
      beginner_educational_media,
      free_clips_highlight,
      highlighted_categories
    };
  }

  // ---------- Interface: getBrowseCategories ----------

  getBrowseCategories() {
    const categories = this._getFromStorage('categories', []);
    return {
      categories: categories.map(c => ({
        category_id: c.id,
        category_key: c.category_key,
        name: c.name,
        description: c.description || '',
        slug: c.slug || null,
        display_order: c.display_order || 0
      }))
    };
  }

  // ---------- Interface: getBrowseFilterOptions ----------

  getBrowseFilterOptions(categoryKey) {
    const categories = this._getFromStorage('categories', []);
    const mediaItemsAll = this._getFromStorage('media_items', []);
    const mediaItems = this._applyFamilyFriendlyFilter(mediaItemsAll.slice());

    // Tags from existing media
    const tagSet = new Set();
    for (const m of mediaItems) {
      if (Array.isArray(m.tags)) {
        for (const t of m.tags) {
          const v = String(t).toLowerCase().replace(/\s+/g, '_');
          tagSet.add(v);
        }
      }
    }
    const tag_options = Array.from(tagSet).map(v => ({ value: v, label: v.replace(/_/g, ' ') }));

    // Regions from existing media
    const regionSet = new Set();
    for (const m of mediaItems) {
      if (m.region) regionSet.add(m.region);
    }
    const region_options = Array.from(regionSet).map(v => ({ value: v, label: v.replace(/_/g, ' ') }));

    // Content types
    const contentTypes = ['video', 'series', 'clip'];
    const content_type_options = contentTypes.map(v => ({ value: v, label: v.replace(/_/g, ' ') }));

    // Resolutions from media_access_options and media_items
    const accessOptions = this._getFromStorage('media_access_options', []);
    const resSet = new Set();
    for (const a of accessOptions) {
      if (a.resolution && a.resolution !== 'not_applicable') resSet.add(a.resolution);
    }
    for (const m of mediaItems) {
      if (Array.isArray(m.available_resolutions)) {
        for (const r of m.available_resolutions) resSet.add(r);
      }
    }
    const resolution_options = Array.from(resSet).map(v => ({ value: v, label: v.replace(/_/g, ' ') }));

    // Rating thresholds (static config)
    const rating_thresholds = [
      { value: 3.0, label: '3.0+' },
      { value: 4.0, label: '4.0+' },
      { value: 4.5, label: '4.5+' }
    ];

    // Duration ranges (example presets)
    const duration_ranges = [
      { min_minutes: 0, max_minutes: 10, label: 'Under 10 minutes' },
      { min_minutes: 10, max_minutes: 30, label: '10-30 minutes' },
      { min_minutes: 30, max_minutes: 60, label: '30-60 minutes' },
      { min_minutes: 60, max_minutes: null, label: 'Over 60 minutes' }
    ];

    // Price ranges (example presets)
    const price_ranges = [
      { min_price: 0, max_price: 0, label: 'Free' },
      { min_price: 0.01, max_price: 5, label: 'Under $5' },
      { min_price: 5, max_price: 10, label: '$5-$10' },
      { min_price: 10, max_price: 20, label: '$10-$20' }
    ];

    // Release years from media
    const yearSet = new Set();
    for (const m of mediaItems) {
      if (m.release_year) yearSet.add(m.release_year);
    }
    const release_years = Array.from(yearSet)
      .sort((a, b) => a - b)
      .map(y => ({ year: y, label: String(y) }));

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'duration_asc', label: 'Duration: Shortest First' },
      { value: 'duration_desc', label: 'Duration: Longest First' },
      { value: 'rating_desc', label: 'Rating: Highest First' },
      { value: 'release_year_desc', label: 'Newest First' },
      { value: 'release_year_asc', label: 'Oldest First' }
    ];

    const category_filter_options = categories.map(c => c);

    return {
      category_filter_options,
      tag_options,
      region_options,
      content_type_options,
      resolution_options,
      rating_thresholds,
      duration_ranges,
      price_ranges,
      release_years,
      sort_options
    };
  }

  // ---------- Interface: searchMedia ----------

  searchMedia(query, filters, sort_by, page, page_size) {
    const categories = this._getFromStorage('categories', []);
    const mediaItemsAll = this._getFromStorage('media_items', []);
    let items = this._applyFamilyFriendlyFilter(mediaItemsAll.slice());

    query = query || '';
    filters = filters || {};
    sort_by = sort_by || null;
    page = page || 1;
    page_size = page_size || 24;

    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter(m => {
        const title = (m.title || '').toLowerCase();
        const desc = (m.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    // Category filter
    if (filters.categoryId) {
      const cat = categories.find(c => c.id === filters.categoryId);
      if (cat) {
        items = items.filter(m => m.category_id === cat.id || m.category_id === cat.category_key);
      }
    }

    // Tags filter (all must be present)
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      const tagFilters = filters.tags.map(t => String(t).toLowerCase());
      items = items.filter(m => {
        if (!Array.isArray(m.tags)) return false;
        const itemTags = m.tags.map(t => String(t).toLowerCase());
        return tagFilters.every(tf => itemTags.includes(tf) || itemTags.includes(tf.replace(/_/g, ' ')));
      });
    }

    if (filters.region) {
      items = items.filter(m => m.region === filters.region);
    }

    if (filters.content_type) {
      items = items.filter(m => m.content_type === filters.content_type);
    }

    if (typeof filters.min_price === 'number') {
      items = items.filter(m => (m.base_price || 0) >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      items = items.filter(m => (m.base_price || 0) <= filters.max_price);
    }

    if (typeof filters.min_duration === 'number') {
      items = items.filter(m => (m.duration_minutes || 0) >= filters.min_duration);
    }
    if (typeof filters.max_duration === 'number') {
      items = items.filter(m => (m.duration_minutes || 0) <= filters.max_duration);
    }

    if (typeof filters.release_year_from === 'number') {
      items = items.filter(m => (m.release_year || 0) >= filters.release_year_from);
    }
    if (typeof filters.release_year_to === 'number') {
      items = items.filter(m => (m.release_year || 0) <= filters.release_year_to);
    }

    if (typeof filters.min_rating === 'number') {
      items = items.filter(m => (m.average_rating || 0) >= filters.min_rating);
    }

    if (filters.is_free === true) {
      items = items.filter(m => !!m.is_free);
    }

    if (filters.resolution) {
      const res = filters.resolution;
      items = items.filter(m => Array.isArray(m.available_resolutions) && m.available_resolutions.includes(res));
    }

    // Sorting
    if (sort_by) {
      items.sort((a, b) => {
        switch (sort_by) {
          case 'price_asc':
            return (a.base_price || 0) - (b.base_price || 0);
          case 'price_desc':
            return (b.base_price || 0) - (a.base_price || 0);
          case 'duration_asc':
            return (a.duration_minutes || 0) - (b.duration_minutes || 0);
          case 'duration_desc':
            return (b.duration_minutes || 0) - (a.duration_minutes || 0);
          case 'rating_desc':
            return (b.average_rating || 0) - (a.average_rating || 0);
          case 'release_year_desc':
            return (b.release_year || 0) - (a.release_year || 0);
          case 'release_year_asc':
            return (a.release_year || 0) - (b.release_year || 0);
          default:
            return 0;
        }
      });
    }

    const total_count = items.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = items.slice(start, end);

    const results = pageItems.map(m => {
      const { category_key, category_name } = this._resolveCategoryForMedia(m, categories);
      return {
        media_item_id: m.id,
        title: m.title,
        slug: m.slug || null,
        thumbnail_url: m.thumbnail_url || null,
        category_key: category_key,
        category_name: category_name,
        content_type: m.content_type,
        duration_minutes: m.duration_minutes,
        release_year: m.release_year,
        region: m.region,
        is_free: m.is_free,
        base_price: m.base_price,
        available_resolutions: m.available_resolutions || [],
        average_rating: m.average_rating,
        rating_count: m.rating_count,
        tags: m.tags || [],
        is_beginner_friendly: m.is_beginner_friendly || false
      };
    });

    return {
      results,
      total_count,
      page,
      page_size
    };
  }

  // ---------- Interface: getMediaItemDetail ----------

  getMediaItemDetail(mediaSlug) {
    const mediaItemsAll = this._getFromStorage('media_items', []);
    const categories = this._getFromStorage('categories', []);
    const accessOptions = this._getFromStorage('media_access_options', []);
    const libraryItems = this._getFromStorage('library_items', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    let media = mediaItemsAll.find(m => m.slug === mediaSlug || m.id === mediaSlug) || null;
    if (!media) {
      return {
        media_item: null,
        access_options: [],
        ownership_info: {
          in_library: false,
          watch_status: null,
          user_rating: null,
          can_download: false,
          can_rate_and_review: false
        },
        wishlist_status: {
          in_wishlist: false
        }
      };
    }

    media = this._applyFamilyFriendlyFilter([media])[0] || null;
    if (!media) {
      return {
        media_item: null,
        access_options: [],
        ownership_info: {
          in_library: false,
          watch_status: null,
          user_rating: null,
          can_download: false,
          can_rate_and_review: false
        },
        wishlist_status: {
          in_wishlist: false
        }
      };
    }

    const { category_key, category_name, category } = this._resolveCategoryForMedia(media, categories);

    const media_item = {
      id: media.id,
      title: media.title,
      slug: media.slug || null,
      description: media.description || '',
      content_type: media.content_type,
      category_key: category_key,
      category_name: category_name,
      tags: media.tags || [],
      region: media.region || null,
      duration_minutes: media.duration_minutes,
      release_year: media.release_year,
      base_price: media.base_price,
      is_free: media.is_free,
      is_beginner_friendly: media.is_beginner_friendly || false,
      average_rating: media.average_rating,
      rating_count: media.rating_count,
      available_resolutions: media.available_resolutions || [],
      default_resolution: media.default_resolution || null,
      thumbnail_url: media.thumbnail_url || null,
      category: category || null
    };

    let access_options_raw = accessOptions.filter(a => a.media_item_id === media.id && a.is_active !== false);
    const access_options = access_options_raw.map(a => {
      const ao = { ...a };
      this._attachMediaForeignKeys(ao);
      return ao;
    });

    // Ownership info
    const libItem = libraryItems.find(li => li.media_item_id === media.id) || null;
    let can_download = false;
    if (libItem) {
      const access = access_options_raw.find(a => a.id === libItem.media_access_option_id);
      if (access && access.is_downloadable) can_download = true;
    }
    const can_rate_and_review = !!libItem && (libItem.watch_status === 'watched' || libItem.watch_status === 'in_progress');

    const ownership_info = {
      in_library: !!libItem,
      watch_status: libItem ? libItem.watch_status : null,
      user_rating: libItem ? libItem.user_rating : null,
      can_download,
      can_rate_and_review
    };

    const wishlist_status = {
      in_wishlist: !!wishlistItems.find(w => w.media_item_id === media.id)
    };

    return {
      media_item,
      access_options,
      ownership_info,
      wishlist_status
    };
  }

  // ---------- Interface: getCartSummary ----------

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const mediaItems = this._getFromStorage('media_items', []);
    const accessOptions = this._getFromStorage('media_access_options', []);
    const categories = this._getFromStorage('categories', []);

    const itemsRaw = cartItems.filter(ci => ci.cart_id === cart.id);
    const items = [];
    let subtotal = 0;

    for (const ci of itemsRaw) {
      const media = mediaItems.find(m => m.id === ci.media_item_id) || null;
      const access = accessOptions.find(a => a.id === ci.media_access_option_id) || null;
      const { category_name } = this._resolveCategoryForMedia(media || {}, categories);
      const lineSubtotal = (ci.price_snapshot || 0) * (ci.quantity || 1);
      subtotal += lineSubtotal;

      const item = {
        cart_item_key: ci.id,
        media_item_id: ci.media_item_id,
        title: ci.title_snapshot || (media ? media.title : ''),
        thumbnail_url: media ? media.thumbnail_url : null,
        category_name: category_name || null,
        content_type: media ? media.content_type : null,
        access_option: access
          ? {
              media_access_option_id: access.id,
              label: access.label,
              option_type: access.option_type,
              resolution: access.resolution,
              access_duration_days: access.access_duration_days || null,
              is_downloadable: access.is_downloadable
            }
          : null,
        unit_price: ci.price_snapshot || 0,
        quantity: ci.quantity || 1,
        line_subtotal: lineSubtotal
      };
      this._attachMediaForeignKeys(item);
      if (item.access_option) {
        this._attachMediaForeignKeys(item.access_option);
      }
      items.push(item);
    }

    const tax = 0;
    const total = subtotal + tax;

    return {
      items,
      subtotal_amount: subtotal,
      tax_amount: tax,
      total_amount: total,
      currency: 'usd',
      total_items: items.length
    };
  }

  // ---------- Interface: addMediaToCart ----------

  addMediaToCart(mediaKey, accessOptionKey, quantity) {
    quantity = typeof quantity === 'number' ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const mediaItems = this._getFromStorage('media_items', []);
    const accessOptions = this._getFromStorage('media_access_options', []);

    const media = mediaItems.find(m => m.id === mediaKey || m.slug === mediaKey);
    if (!media) {
      return { success: false, message: 'Media item not found', cart: null };
    }

    let access = null;
    if (accessOptionKey) {
      access = accessOptions.find(a => a.id === accessOptionKey && a.media_item_id === media.id && a.is_active !== false) || null;
    } else {
      access = accessOptions.find(a => a.media_item_id === media.id && a.is_default && a.is_active !== false) || null;
      if (!access) {
        const optionsForMedia = accessOptions.filter(a => a.media_item_id === media.id && a.is_active !== false);
        if (optionsForMedia.length > 0) {
          optionsForMedia.sort((a, b) => (a.price || 0) - (b.price || 0));
          access = optionsForMedia[0];
        }
      }
    }

    if (!access) {
      return { success: false, message: 'No valid access option for media item', cart: null };
    }

    let existing = cartItems.find(ci => ci.cart_id === cart.id && ci.media_item_id === media.id && ci.media_access_option_id === access.id);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + quantity;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        media_item_id: media.id,
        media_access_option_id: access.id,
        title_snapshot: media.title,
        price_snapshot: access.price || 0,
        quantity: quantity,
        created_at: this._now()
      };
      cartItems.push(existing);
    }

    cart.updated_at = this._now();
    this._saveToStorage('cart', [cart]);
    this._saveToStorage('cart_items', cartItems);

    const summary = this.getCartSummary();
    return {
      success: true,
      message: 'Item added to cart',
      cart: {
        items: summary.items.map(i => ({
          cart_item_key: i.cart_item_key,
          media_item_id: i.media_item_id,
          title: i.title,
          access_option_label: i.access_option ? i.access_option.label : null,
          unit_price: i.unit_price,
          quantity: i.quantity,
          line_subtotal: i.line_subtotal
        })),
        subtotal_amount: summary.subtotal_amount,
        tax_amount: summary.tax_amount,
        total_amount: summary.total_amount,
        currency: summary.currency
      }
    };
  }

  // ---------- Interface: addAccessOptionToCart ----------

  addAccessOptionToCart(accessOptionKey, quantity) {
    quantity = typeof quantity === 'number' ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const mediaItems = this._getFromStorage('media_items', []);
    const accessOptions = this._getFromStorage('media_access_options', []);

    const access = accessOptions.find(a => a.id === accessOptionKey && a.is_active !== false);
    if (!access) {
      return { success: false, message: 'Access option not found', cart: null };
    }

    const media = mediaItems.find(m => m.id === access.media_item_id);
    if (!media) {
      return { success: false, message: 'Associated media item not found', cart: null };
    }

    let existing = cartItems.find(ci => ci.cart_id === cart.id && ci.media_item_id === media.id && ci.media_access_option_id === access.id);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + quantity;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        media_item_id: media.id,
        media_access_option_id: access.id,
        title_snapshot: media.title,
        price_snapshot: access.price || 0,
        quantity: quantity,
        created_at: this._now()
      };
      cartItems.push(existing);
    }

    cart.updated_at = this._now();
    this._saveToStorage('cart', [cart]);
    this._saveToStorage('cart_items', cartItems);

    const summary = this.getCartSummary();
    return {
      success: true,
      message: 'Access option added to cart',
      cart: {
        items: summary.items.map(i => ({
          cart_item_key: i.cart_item_key,
          media_item_id: i.media_item_id,
          title: i.title,
          access_option_label: i.access_option ? i.access_option.label : null,
          unit_price: i.unit_price,
          quantity: i.quantity,
          line_subtotal: i.line_subtotal
        })),
        subtotal_amount: summary.subtotal_amount,
        tax_amount: summary.tax_amount,
        total_amount: summary.total_amount,
        currency: summary.currency
      }
    };
  }

  // ---------- Interface: updateCartItem ----------

  updateCartItem(cartItemKey, quantity, accessOptionKey) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const accessOptions = this._getFromStorage('media_access_options', []);

    const ci = cartItems.find(c => c.id === cartItemKey && c.cart_id === cart.id);
    if (!ci) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    if (typeof quantity === 'number') {
      if (quantity <= 0) {
        const idx = cartItems.indexOf(ci);
        if (idx >= 0) cartItems.splice(idx, 1);
      } else {
        ci.quantity = quantity;
      }
    }

    if (accessOptionKey) {
      const access = accessOptions.find(a => a.id === accessOptionKey && a.is_active !== false);
      if (access) {
        ci.media_access_option_id = access.id;
        ci.price_snapshot = access.price || ci.price_snapshot;
      }
    }

    cart.updated_at = this._now();
    this._saveToStorage('cart', [cart]);
    this._saveToStorage('cart_items', cartItems);

    const summary = this.getCartSummary();
    return {
      success: true,
      message: 'Cart updated',
      cart: {
        items: summary.items.map(i => ({
          cart_item_key: i.cart_item_key,
          media_item_id: i.media_item_id,
          title: i.title,
          access_option_label: i.access_option ? i.access_option.label : null,
          unit_price: i.unit_price,
          quantity: i.quantity,
          line_subtotal: i.line_subtotal
        })),
        subtotal_amount: summary.subtotal_amount,
        tax_amount: summary.tax_amount,
        total_amount: summary.total_amount,
        currency: summary.currency
      }
    };
  }

  // ---------- Interface: removeCartItem ----------

  removeCartItem(cartItemKey) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const before = cartItems.length;
    cartItems = cartItems.filter(c => !(c.id === cartItemKey && c.cart_id === cart.id));
    const removed = before !== cartItems.length;

    if (removed) {
      cart.updated_at = this._now();
      this._saveToStorage('cart', [cart]);
      this._saveToStorage('cart_items', cartItems);
    }

    const summary = this.getCartSummary();
    return {
      success: removed,
      message: removed ? 'Cart item removed' : 'Cart item not found',
      cart: {
        items: summary.items.map(i => ({
          cart_item_key: i.cart_item_key,
          media_item_id: i.media_item_id,
          title: i.title,
          access_option_label: i.access_option ? i.access_option.label : null,
          unit_price: i.unit_price,
          quantity: i.quantity,
          line_subtotal: i.line_subtotal
        })),
        subtotal_amount: summary.subtotal_amount,
        tax_amount: summary.tax_amount,
        total_amount: summary.total_amount,
        currency: summary.currency
      }
    };
  }

  // ---------- Interface: prepareCheckoutFromCart ----------

  prepareCheckoutFromCart() {
    const result = this._createOrderFromCart();
    if (!result) {
      return {
        success: false,
        message: 'Cart is empty',
        checkout_source: 'cart',
        order_preview: null
      };
    }

    const { order, orderItems } = result;

    const order_preview_items = orderItems.map(oi => ({
      title_snapshot: oi.title_snapshot,
      description_snapshot: oi.description_snapshot || '',
      access_label: oi.description_snapshot || '',
      unit_price: oi.unit_price,
      quantity: oi.quantity,
      subtotal: oi.subtotal
    }));

    const order_preview = {
      order_type: order.order_type,
      items: order_preview_items,
      subtotal_amount: order.subtotal_amount,
      tax_amount: order.tax_amount,
      total_amount: order.total_amount,
      currency: order.currency,
      payment_required: order.total_amount > 0
    };

    return {
      success: true,
      message: 'Checkout prepared from cart',
      checkout_source: 'cart',
      order_preview
    };
  }

  // ---------- Interface: prepareCheckoutForMembership ----------

  prepareCheckoutForMembership(membershipPlanId) {
    const result = this._createOrderForMembershipPlan(membershipPlanId);
    if (!result) {
      return {
        success: false,
        message: 'Membership plan not found or inactive',
        checkout_source: 'membership',
        membership_plan: null,
        order_preview: null
      };
    }

    const { order, orderItems, plan } = result;

    const order_preview_items = orderItems.map(oi => ({
      title_snapshot: oi.title_snapshot,
      description_snapshot: oi.description_snapshot || '',
      unit_price: oi.unit_price,
      quantity: oi.quantity,
      subtotal: oi.subtotal
    }));

    const order_preview = {
      order_type: 'membership_subscription',
      items: order_preview_items,
      subtotal_amount: order.subtotal_amount,
      tax_amount: order.tax_amount,
      total_amount: order.total_amount,
      currency: order.currency,
      payment_required: order.total_amount > 0
    };

    return {
      success: true,
      message: 'Checkout prepared for membership',
      checkout_source: 'membership',
      membership_plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        billing_period: plan.billing_period,
        price_per_period: plan.price_per_period,
        currency: plan.currency,
        includes_offline_downloads: !!plan.includes_offline_downloads,
        features: plan.features || []
      },
      order_preview
    };
  }

  // ---------- Interface: getCheckoutSummaryCurrent ----------

  getCheckoutSummaryCurrent() {
    const active = this._getActiveCheckout();
    if (!active || !active.order_id) {
      return {
        has_active_checkout: false,
        checkout_source: null,
        order_preview: null
      };
    }

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);
    const order = orders.find(o => o.id === active.order_id);
    if (!order) {
      return {
        has_active_checkout: false,
        checkout_source: null,
        order_preview: null
      };
    }

    const itemsForOrder = orderItems.filter(oi => oi.order_id === order.id);
    const items = itemsForOrder.map(oi => ({
      title_snapshot: oi.title_snapshot,
      description_snapshot: oi.description_snapshot || '',
      unit_price: oi.unit_price,
      quantity: oi.quantity,
      subtotal: oi.subtotal
    }));

    const order_preview = {
      order_type: order.order_type,
      items,
      subtotal_amount: order.subtotal_amount,
      tax_amount: order.tax_amount,
      total_amount: order.total_amount,
      currency: order.currency
    };

    return {
      has_active_checkout: true,
      checkout_source: active.checkout_source,
      order_preview
    };
  }

  // ---------- Interface: applyPromoCodeToCheckout ----------

  applyPromoCodeToCheckout(promo_code) {
    const active = this._getActiveCheckout();
    if (!active || !active.order_id) {
      return {
        success: false,
        message: 'No active checkout',
        order_preview: null
      };
    }

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);
    const order = orders.find(o => o.id === active.order_id);
    if (!order) {
      return {
        success: false,
        message: 'No active checkout',
        order_preview: null
      };
    }

    // Currently no promo logic; just return existing summary
    const itemsForOrder = orderItems.filter(oi => oi.order_id === order.id);
    const items = itemsForOrder.map(oi => ({
      title_snapshot: oi.title_snapshot,
      description_snapshot: oi.description_snapshot || '',
      unit_price: oi.unit_price,
      quantity: oi.quantity,
      subtotal: oi.subtotal
    }));

    const order_preview = {
      order_type: order.order_type,
      items,
      subtotal_amount: order.subtotal_amount,
      tax_amount: order.tax_amount,
      total_amount: order.total_amount,
      currency: order.currency
    };

    return {
      success: false,
      message: 'Promo codes are not supported',
      order_preview
    };
  }

  // ---------- Interface: completeCheckoutPayment ----------

  completeCheckoutPayment(payment_method, card_details, save_card_for_future) {
    const active = this._getActiveCheckout();
    if (!active || !active.order_id) {
      return {
        success: false,
        message: 'No active checkout',
        order: null,
        library_items_added: [],
        download_items_created: [],
        membership_subscription: { subscription: null }
      };
    }

    const orders = this._getFromStorage('orders', []);
    const orderItemsAll = this._getFromStorage('order_items', []);
    const order = orders.find(o => o.id === active.order_id);
    if (!order) {
      return {
        success: false,
        message: 'Order not found',
        order: null,
        library_items_added: [],
        download_items_created: [],
        membership_subscription: { subscription: null }
      };
    }

    const total = order.total_amount || 0;
    if (total > 0 && payment_method !== 'credit_card') {
      return {
        success: false,
        message: 'Credit card payment is required',
        order: null,
        library_items_added: [],
        download_items_created: [],
        membership_subscription: { subscription: null }
      };
    }

    if (total > 0) {
      if (!card_details || !card_details.card_holder_name || !card_details.card_number || !card_details.card_expiry || !card_details.card_cvv) {
        return {
          success: false,
          message: 'Incomplete card details',
          order: null,
          library_items_added: [],
          download_items_created: [],
          membership_subscription: { subscription: null }
        };
      }
    }

    // Simulate successful payment
    order.status = 'paid';
    order.payment_status = total > 0 ? 'paid' : 'not_required';
    order.payment_method = total > 0 ? 'credit_card' : 'none';
    if (total > 0) {
      order.card_holder_name = card_details.card_holder_name;
      order.card_last4 = card_details.card_number.slice(-4);
      order.card_expiry = card_details.card_expiry;
      order.save_card_for_future = !!save_card_for_future;
    }
    order.completed_at = this._now();

    this._saveToStorage('orders', orders);

    const orderItems = orderItemsAll.filter(oi => oi.order_id === order.id);

    let library_items_added = [];
    let download_items_created = [];
    let subscription = null;

    if (order.order_type === 'content_purchase' || order.order_type === 'mixed') {
      const fulfillment = this._fulfillOrderItemsToLibraryAndDownloads(order, orderItems);
      library_items_added = fulfillment.libraryItems.map(li => this._attachMediaForeignKeys({ ...li }));
      download_items_created = fulfillment.downloadItems.map(di => this._attachMediaForeignKeys({ ...di }));
    }

    if (order.order_type === 'membership_subscription' || order.order_type === 'mixed') {
      const membershipPlans = this._getFromStorage('membership_plans', []);
      const membershipItem = orderItems.find(oi => oi.item_type === 'membership');
      if (membershipItem) {
        const plan = membershipPlans.find(p => p.id === membershipItem.membership_plan_id) || null;
        if (plan) {
          const start_date = this._now();
          let end_date = null;
          const startObj = new Date(start_date);
          if (plan.billing_period === 'monthly') {
            startObj.setMonth(startObj.getMonth() + 1);
          } else if (plan.billing_period === 'yearly') {
            startObj.setFullYear(startObj.getFullYear() + 1);
          }
          end_date = startObj.toISOString();

          subscription = {
            id: this._generateId('membership_subscription'),
            membership_plan_id: plan.id,
            status: 'active',
            start_date: start_date,
            end_date: end_date,
            auto_renew: true,
            renewal_billing_period: plan.billing_period,
            last_billed_at: start_date,
            next_billing_at: end_date,
            current_price_per_period: plan.price_per_period,
            order_id: order.id,
            created_at: start_date
          };

          const subs = this._getFromStorage('membership_subscriptions', []);
          subs.push(subscription);
          this._saveToStorage('membership_subscriptions', subs);
        }
      }
    }

    // If checkout from cart, clear cart items
    if (active.checkout_source === 'cart') {
      const cart = this._getOrCreateCart();
      let cartItems = this._getFromStorage('cart_items', []);
      cartItems = cartItems.filter(ci => ci.cart_id !== cart.id);
      cart.updated_at = this._now();
      this._saveToStorage('cart', [cart]);
      this._saveToStorage('cart_items', cartItems);
    }

    this._clearActiveCheckout();

    const orderReturn = { ...order };

    return {
      success: true,
      message: 'Checkout completed',
      order: orderReturn,
      library_items_added,
      download_items_created,
      membership_subscription: { subscription }
    };
  }

  // ---------- Interface: getMembershipPlans ----------

  getMembershipPlans() {
    const plans = this._getFromStorage('membership_plans', []);
    const subscription = this._getCurrentMembershipSubscription();
    if (subscription) {
      this._attachMediaForeignKeys(subscription);
    }
    return {
      plans,
      active_subscription: {
        subscription: subscription || null
      }
    };
  }

  // ---------- Interface: registerAccount ----------

  registerAccount(username, email, password, newsletter_opt_in) {
    newsletter_opt_in = !!newsletter_opt_in;
    const accounts = this._getFromStorage('account_settings', []);

    let account = accounts[0] || null;
    const now = this._now();

    if (!account) {
      account = {
        id: this._generateId('account_settings'),
        username: username,
        email: email,
        interface_language: 'en',
        family_friendly_mode: false,
        default_download_quality: 'full_hd_1080p',
        newsletter_opt_in: newsletter_opt_in,
        created_at: now,
        updated_at: now
      };
      accounts.push(account);
    } else {
      account.username = username;
      account.email = email;
      account.newsletter_opt_in = newsletter_opt_in;
      account.updated_at = now;
    }

    this._saveToStorage('account_settings', accounts);

    return {
      success: true,
      message: 'Account registered',
      account_settings: account
    };
  }

  // ---------- Interface: getAccountSettings ----------

  getAccountSettings() {
    const account = this._getActiveAccountSettings();
    return {
      account_settings: account
    };
  }

  // ---------- Interface: updateAccountSettings ----------

  updateAccountSettings(settings) {
    settings = settings || {};
    const accounts = this._getFromStorage('account_settings', []);
    let account = accounts[0] || null;
    const now = this._now();

    if (!account) {
      account = {
        id: this._generateId('account_settings'),
        username: settings.username || 'user',
        email: settings.email || 'user@example.com',
        interface_language: settings.interface_language || 'en',
        family_friendly_mode: settings.family_friendly_mode || false,
        default_download_quality: settings.default_download_quality || 'full_hd_1080p',
        newsletter_opt_in: !!settings.newsletter_opt_in,
        created_at: now,
        updated_at: now
      };
      accounts.push(account);
    } else {
      if (typeof settings.username === 'string') account.username = settings.username;
      if (typeof settings.email === 'string') account.email = settings.email;
      if (typeof settings.interface_language === 'string') account.interface_language = settings.interface_language;
      if (typeof settings.family_friendly_mode === 'boolean') account.family_friendly_mode = settings.family_friendly_mode;
      if (typeof settings.default_download_quality === 'string') account.default_download_quality = settings.default_download_quality;
      if (typeof settings.newsletter_opt_in === 'boolean') account.newsletter_opt_in = settings.newsletter_opt_in;
      account.updated_at = now;
    }

    this._saveToStorage('account_settings', accounts);

    return {
      success: true,
      message: 'Account settings updated',
      account_settings: account
    };
  }

  // ---------- Interface: getLibraryFilterOptions ----------

  getLibraryFilterOptions() {
    const categories = this._getFromStorage('categories', []);

    const watch_status_options = [
      { value: 'watched', label: 'Watched' },
      { value: 'unwatched', label: 'Unwatched' },
      { value: 'in_progress', label: 'In progress' }
    ];

    const content_type_options = [
      { value: 'video', label: 'Videos' },
      { value: 'series', label: 'Series' },
      { value: 'clip', label: 'Clips' }
    ];

    const category_filter_options = categories;

    const sort_options = [
      { value: 'duration_desc', label: 'Duration: Longest First' },
      { value: 'duration_asc', label: 'Duration: Shortest First' },
      { value: 'recently_added', label: 'Recently Added' },
      { value: 'title_asc', label: 'Title A-Z' }
    ];

    return {
      watch_status_options,
      content_type_options,
      category_filter_options,
      sort_options
    };
  }

  // ---------- Interface: getLibraryItems ----------

  getLibraryItems(filters, sort_by, page, page_size) {
    filters = filters || {};
    sort_by = sort_by || null;
    page = page || 1;
    page_size = page_size || 24;

    const libraryItems = this._getFromStorage('library_items', []);
    const mediaItemsAll = this._getFromStorage('media_items', []);
    const categories = this._getFromStorage('categories', []);

    let libs = libraryItems.slice();

    if (filters.watch_status) {
      libs = libs.filter(li => li.watch_status === filters.watch_status);
    }

    // We'll join with media for additional filters
    libs = libs.filter(li => mediaItemsAll.find(m => m.id === li.media_item_id));

    if (filters.category_key || filters.content_type) {
      libs = libs.filter(li => {
        const m = mediaItemsAll.find(mm => mm.id === li.media_item_id);
        if (!m) return false;
        if (filters.content_type && m.content_type !== filters.content_type) return false;
        if (filters.category_key) {
          const catInfo = this._resolveCategoryForMedia(m, categories);
          if (catInfo.category_key !== filters.category_key) return false;
        }
        return true;
      });
    }

    // Build combined objects
    let items = libs.map(li => {
      const m = mediaItemsAll.find(mm => mm.id === li.media_item_id) || {};
      const { category_key, category_name } = this._resolveCategoryForMedia(m, categories);
      const obj = {
        library_item_id: li.id,
        media_item_id: li.media_item_id,
        title: m.title,
        thumbnail_url: m.thumbnail_url || null,
        category_key: category_key,
        category_name: category_name,
        content_type: m.content_type,
        watch_status: li.watch_status,
        last_watched_at: li.last_watched_at || null,
        progress_percent: li.progress_percent || 0,
        user_rating: li.user_rating || null,
        duration_minutes: m.duration_minutes,
        available_resolutions: m.available_resolutions || [],
        source_type: li.source_type,
        added_at: li.added_at
      };
      this._attachMediaForeignKeys(obj);
      return obj;
    });

    // Sort
    if (sort_by) {
      items.sort((a, b) => {
        switch (sort_by) {
          case 'duration_desc':
            return (b.duration_minutes || 0) - (a.duration_minutes || 0);
          case 'duration_asc':
            return (a.duration_minutes || 0) - (b.duration_minutes || 0);
          case 'recently_added':
            return (b.added_at || '').localeCompare(a.added_at || '');
          case 'title_asc':
            return (a.title || '').localeCompare(b.title || '');
          default:
            return 0;
        }
      });
    }

    const total_count = items.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = items.slice(start, end);

    return {
      items: pageItems,
      total_count,
      page,
      page_size
    };
  }

  // ---------- Interface: addMediaToLibrary ----------

  addMediaToLibrary(mediaKey, accessOptionKey, source_type_override) {
    const mediaItems = this._getFromStorage('media_items', []);
    const accessOptions = this._getFromStorage('media_access_options', []);
    let libraryItems = this._getFromStorage('library_items', []);

    const media = mediaItems.find(m => m.id === mediaKey || m.slug === mediaKey);
    if (!media) {
      return { success: false, message: 'Media item not found', library_item: null };
    }

    let access = null;
    if (accessOptionKey) {
      access = accessOptions.find(a => a.id === accessOptionKey && a.media_item_id === media.id) || null;
    }

    let source_type = source_type_override || null;
    if (!source_type) {
      if (media.is_free) source_type = 'free';
      else source_type = 'purchase';
    }

    let lib = libraryItems.find(li => li.media_item_id === media.id && (!access || li.media_access_option_id === access.id));
    if (!lib) {
      lib = {
        id: this._generateId('library_item'),
        media_item_id: media.id,
        media_access_option_id: access ? access.id : null,
        source_type: source_type,
        added_at: this._now(),
        watch_status: 'unwatched',
        last_watched_at: null,
        progress_percent: 0,
        user_rating: null
      };
      libraryItems.push(lib);
      this._saveToStorage('library_items', libraryItems);
    }

    const libReturn = this._attachMediaForeignKeys({ ...lib });

    return {
      success: true,
      message: 'Media added to library',
      library_item: libReturn
    };
  }

  // ---------- Interface: getWishlistItems ----------

  getWishlistItems() {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const mediaItems = this._getFromStorage('media_items', []);
    const categories = this._getFromStorage('categories', []);

    const items = wishlistItems.map(w => {
      const m = mediaItems.find(mm => mm.id === w.media_item_id) || {};
      const { category_name } = this._resolveCategoryForMedia(m, categories);
      const obj = {
        wishlist_item_id: w.id,
        media_item_id: w.media_item_id,
        title: m.title,
        thumbnail_url: m.thumbnail_url || null,
        base_price: m.base_price,
        is_free: m.is_free,
        average_rating: m.average_rating,
        category_name: category_name,
        content_type: m.content_type,
        added_at: w.added_at
      };
      this._attachMediaForeignKeys(obj);
      return obj;
    });

    return {
      items
    };
  }

  // ---------- Interface: addMediaToWishlist ----------

  addMediaToWishlist(mediaKey) {
    const mediaItems = this._getFromStorage('media_items', []);
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const media = mediaItems.find(m => m.id === mediaKey || m.slug === mediaKey);
    if (!media) {
      return { success: false, message: 'Media item not found', in_wishlist: false };
    }

    const existing = wishlistItems.find(w => w.media_item_id === media.id);
    if (existing) {
      return { success: true, message: 'Already in wishlist', in_wishlist: true };
    }

    const item = {
      id: this._generateId('wishlist_item'),
      media_item_id: media.id,
      added_at: this._now()
    };
    wishlistItems.push(item);
    this._saveToStorage('wishlist_items', wishlistItems);

    return {
      success: true,
      message: 'Added to wishlist',
      in_wishlist: true
    };
  }

  // ---------- Interface: removeWishlistItem ----------

  removeWishlistItem(wishlistItemKey) {
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    const before = wishlistItems.length;
    wishlistItems = wishlistItems.filter(w => w.id !== wishlistItemKey);
    const removed = before !== wishlistItems.length;
    if (removed) this._saveToStorage('wishlist_items', wishlistItems);
    return {
      success: removed,
      message: removed ? 'Wishlist item removed' : 'Wishlist item not found'
    };
  }

  // ---------- Interface: moveWishlistItemToCart ----------

  moveWishlistItemToCart(wishlistItemKey, accessOptionKey) {
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const item = wishlistItems.find(w => w.id === wishlistItemKey);
    if (!item) {
      return { success: false, message: 'Wishlist item not found', cart: null };
    }

    const result = this.addMediaToCart(item.media_item_id, accessOptionKey, 1);

    // Remove from wishlist if added to cart successfully
    if (result && result.success) {
      this.removeWishlistItem(wishlistItemKey);
    }

    return result;
  }

  // ---------- Interface: getDownloadItems ----------

  getDownloadItems() {
    const downloadItems = this._getFromStorage('download_items', []);
    const mediaItems = this._getFromStorage('media_items', []);

    const items = downloadItems.map(d => {
      const m = mediaItems.find(mm => mm.id === d.media_item_id) || {};
      const obj = {
        download_item_id: d.id,
        media_item_id: d.media_item_id,
        title: m.title,
        thumbnail_url: m.thumbnail_url || null,
        resolution: d.resolution,
        download_status: d.download_status,
        file_size_mb: d.file_size_mb || null,
        source_type: d.source_type,
        created_at: d.created_at,
        last_updated_at: d.last_updated_at || null,
        download_url: d.download_url || null
      };
      this._attachMediaForeignKeys(obj);
      return obj;
    });

    return {
      items
    };
  }

  // ---------- Interface: startDownload ----------

  startDownload(downloadItemKey) {
    let downloadItems = this._getFromStorage('download_items', []);
    const di = downloadItems.find(d => d.id === downloadItemKey);
    if (!di) {
      return { success: false, message: 'Download item not found', download_item: null };
    }

    di.download_status = 'in_progress';
    di.last_updated_at = this._now();
    if (!di.download_url) {
      di.download_url = 'download://' + di.id;
    }

    this._saveToStorage('download_items', downloadItems);

    const ret = this._attachMediaForeignKeys({ ...di });
    return {
      success: true,
      message: 'Download started',
      download_item: ret
    };
  }

  // ---------- Interface: startDownloadFromLibraryItem ----------

  startDownloadFromLibraryItem(libraryItemKey, resolution) {
    const libraryItems = this._getFromStorage('library_items', []);
    const mediaItems = this._getFromStorage('media_items', []);
    const accessOptions = this._getFromStorage('media_access_options', []);
    let downloadItems = this._getFromStorage('download_items', []);

    const lib = libraryItems.find(l => l.id === libraryItemKey);
    if (!lib) {
      return { success: false, message: 'Library item not found', download_item: null };
    }

    const media = mediaItems.find(m => m.id === lib.media_item_id) || null;
    const access = lib.media_access_option_id ? accessOptions.find(a => a.id === lib.media_access_option_id) : null;

    const account = this._getActiveAccountSettings();
    const res = resolution || (access && access.resolution && access.resolution !== 'not_applicable' ? access.resolution : null) || (media && media.default_resolution) || (account && account.default_download_quality) || 'full_hd_1080p';

    let di = downloadItems.find(d => d.media_item_id === lib.media_item_id && d.media_access_option_id === lib.media_access_option_id && d.resolution === res);
    if (!di) {
      di = {
        id: this._generateId('download_item'),
        media_item_id: lib.media_item_id,
        media_access_option_id: lib.media_access_option_id || null,
        resolution: res,
        download_status: 'in_progress',
        file_size_mb: null,
        download_url: 'download://' + lib.media_item_id + '/' + res,
        source_type: lib.source_type,
        created_at: this._now(),
        last_updated_at: this._now()
      };
      downloadItems.push(di);
    } else {
      di.download_status = 'in_progress';
      di.last_updated_at = this._now();
      if (!di.download_url) di.download_url = 'download://' + di.id;
    }

    this._saveToStorage('download_items', downloadItems);

    const ret = this._attachMediaForeignKeys({ ...di });
    return {
      success: true,
      message: 'Download started',
      download_item: ret
    };
  }

  // ---------- Interface: submitMediaReview ----------

  submitMediaReview(mediaKey, rating, text, title) {
    const mediaItems = this._getFromStorage('media_items', []);
    const libraryItems = this._getFromStorage('library_items', []);
    let reviews = this._getFromStorage('reviews', []);

    const media = mediaItems.find(m => m.id === mediaKey || m.slug === mediaKey);
    if (!media) {
      return { success: false, message: 'Media item not found', review: null, library_item: null };
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return { success: false, message: 'Rating must be between 1 and 5', review: null, library_item: null };
    }

    const validation = this._validateReviewTextLength(text);
    if (!validation.valid) {
      return { success: false, message: 'Review text must be at least ' + validation.minLength + ' characters', review: null, library_item: null };
    }

    const lib = libraryItems.find(li => li.media_item_id === media.id);
    if (!lib) {
      return { success: false, message: 'You can only review items in your library', review: null, library_item: null };
    }

    const now = this._now();
    const review = {
      id: this._generateId('review'),
      media_item_id: media.id,
      rating: rating,
      text: text,
      title: title || '',
      is_edited: false,
      created_at: now,
      updated_at: null
    };
    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    // Update user rating on library item
    lib.user_rating = rating;
    lib.last_watched_at = lib.last_watched_at || now;
    const updatedLibs = libraryItems.map(li => (li.id === lib.id ? lib : li));
    this._saveToStorage('library_items', updatedLibs);

    // Update aggregate rating on media item
    const mediaIdx = mediaItems.findIndex(m => m.id === media.id);
    if (mediaIdx >= 0) {
      const m = mediaItems[mediaIdx];
      const currentAvg = m.average_rating || 0;
      const currentCount = m.rating_count || 0;
      const newCount = currentCount + 1;
      const newAvg = (currentAvg * currentCount + rating) / newCount;
      m.average_rating = newAvg;
      m.rating_count = newCount;
      mediaItems[mediaIdx] = m;
      this._saveToStorage('media_items', mediaItems);
    }

    const reviewRet = this._attachMediaForeignKeys({ ...review });
    const libRet = { library_item_id: lib.id, user_rating: lib.user_rating };
    this._attachMediaForeignKeys(libRet);

    return {
      success: true,
      message: 'Review submitted',
      review: reviewRet,
      library_item: libRet
    };
  }

  // ---------- Interface: getOrderConfirmation ----------

  getOrderConfirmation(orderId) {
    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);
    const libraryItems = this._getFromStorage('library_items', []);
    const downloadItems = this._getFromStorage('download_items', []);
    const membershipSubs = this._getFromStorage('membership_subscriptions', []);

    const order = orders.find(o => o.id === orderId) || null;
    if (!order) {
      return {
        order: null,
        items: [],
        library_links: [],
        download_links: [],
        membership_subscription: { subscription: null }
      };
    }

    const itemsRaw = orderItems.filter(oi => oi.order_id === order.id);
    const items = itemsRaw.map(oi => {
      const obj = { ...oi };
      this._attachMediaForeignKeys(obj);
      return obj;
    });

    const library_links = [];
    const download_links = [];

    for (const oi of itemsRaw) {
      if (oi.item_type === 'media_access') {
        const lib = libraryItems.find(li => li.media_item_id === oi.media_item_id && li.media_access_option_id === oi.media_access_option_id);
        if (lib) {
          library_links.push({ media_item_id: oi.media_item_id, library_item_id: lib.id });
        }
        const dl = downloadItems.find(di => di.media_item_id === oi.media_item_id && di.media_access_option_id === oi.media_access_option_id);
        if (dl) {
          download_links.push({ media_item_id: oi.media_item_id, download_item_id: dl.id });
        }
      }
    }

    const subscription = membershipSubs.find(s => s.order_id === order.id) || null;
    if (subscription) this._attachMediaForeignKeys(subscription);

    return {
      order,
      items,
      library_links,
      download_links,
      membership_subscription: {
        subscription
      }
    };
  }

  // ---------- Interface: getStaticPageContent ----------

  getStaticPageContent(pageKey) {
    const pages = this._getFromStorage('pages', []);
    const keyLower = String(pageKey || '').toLowerCase();

    const page = pages.find(p => {
      const name = (p.name || '').toLowerCase();
      const filename = (p.filename || '').toLowerCase();
      const slug = (p.slug || '').toLowerCase();
      return name === keyLower || slug === keyLower || filename === keyLower || filename === keyLower + '.html';
    }) || null;

    const sectionsKey = 'static_page_sections_' + keyLower;
    const sections = this._getFromStorage(sectionsKey, []);

    return {
      page,
      title: page ? page.name : pageKey,
      sections
    };
  }

  // ---------- Interface: submitContactRequest ----------

  submitContactRequest(name, email, subject, message) {
    const requests = this._getFromStorage('contact_requests', []);
    const ticket_id = this._generateId('ticket');
    const now = this._now();

    const req = {
      id: ticket_id,
      name: name,
      email: email,
      subject: subject,
      message: message,
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      message: 'Contact request submitted',
      ticket_id: ticket_id
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
