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
    this._getNextIdCounter(); // initialize counter (increments once)
  }

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core entities (arrays)
    ensureArrayKey('artworks');
    ensureArrayKey('products');
    ensureArrayKey('cart'); // array of Cart, typically single
    ensureArrayKey('cart_items');
    ensureArrayKey('favorites');
    ensureArrayKey('favorite_items');
    ensureArrayKey('wishlists');
    ensureArrayKey('wishlist_items');
    ensureArrayKey('commission_requests');
    ensureArrayKey('exhibitions');
    ensureArrayKey('visit_plans');
    ensureArrayKey('visit_plan_items');
    ensureArrayKey('projects');
    ensureArrayKey('collaboration_inquiries');
    ensureArrayKey('newsletter_subscriptions');
    ensureArrayKey('newsletter_subscription_interests');
    ensureArrayKey('documents');

    // Content-like singletons (objects with simple defaults)
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem('about_page_content', JSON.stringify({
        bio_markdown: '',
        statement_markdown: '',
        studio_info_markdown: ''
      }));
    }

    if (!localStorage.getItem('commissions_page_content')) {
      localStorage.setItem('commissions_page_content', JSON.stringify({
        intro_markdown: '',
        pricing_tiers_markdown: '',
        process_steps: []
      }));
    }

    if (!localStorage.getItem('info_policies_content')) {
      localStorage.setItem('info_policies_content', JSON.stringify({
        shipping_markdown: '',
        returns_markdown: '',
        care_instructions_markdown: '',
        privacy_markdown: '',
        faqs: []
      }));
    }

    if (!localStorage.getItem('newsletter_signup_config')) {
      // We'll compute sensible defaults in getter; keep storage key for possible overrides
      localStorage.setItem('newsletter_signup_config', JSON.stringify({}));
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

  // ----------------------
  // Enum label helpers
  // ----------------------
  _categoryLabel(value) {
    const map = {
      landscape: 'Landscape',
      cityscape: 'Cityscape',
      portrait: 'Portrait',
      abstract: 'Abstract',
      still_life: 'Still life',
      figure: 'Figure',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _mediumLabel(value) {
    const map = {
      acrylic_on_canvas: 'Acrylic on canvas',
      oil_on_canvas: 'Oil on canvas',
      watercolor_on_paper: 'Watercolor on paper',
      digital: 'Digital',
      mixed_media: 'Mixed media',
      ink_on_paper: 'Ink on paper',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _colorPaletteLabel(value) {
    const map = {
      pastel: 'Pastel',
      vibrant: 'Vibrant',
      monochrome: 'Monochrome',
      neutral: 'Neutral',
      earth_tones: 'Earth tones',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _clientTypeLabel(value) {
    const map = {
      business_commercial: 'Business / Commercial',
      private_residential: 'Private / Residential',
      non_profit: 'Non-profit',
      public_institution: 'Public institution',
      self_initiated: 'Self-initiated'
    };
    return map[value] || value || '';
  }

  _projectCategoryLabel(value) {
    const map = {
      mural: 'Mural',
      installation: 'Installation',
      branding: 'Branding',
      illustration: 'Illustration',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  // ----------------------
  // Currency & price helpers
  // ----------------------
  _currencySymbol(currency) {
    const map = {
      usd: '$',
      eur: '€',
      gbp: '£',
      other: ''
    };
    return map[currency] || '$';
  }

  _getDefaultCurrencyCode() {
    const products = this._getFromStorage('products', []);
    if (products.length && products[0].currency) {
      return products[0].currency;
    }
    return 'usd';
  }

  _formatPriceDisplay(currency, amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    const symbol = this._currencySymbol(currency);
    // Keep it simple to avoid locale dependencies
    return symbol + amount.toFixed(2);
  }

  _computeSizeLabel(width_cm, height_cm) {
    if (typeof width_cm === 'number' && typeof height_cm === 'number') {
      return width_cm + ' × ' + height_cm + ' cm';
    }
    return '';
  }

  // ----------------------
  // Date helpers
  // ----------------------
  _parseDate(dateLike) {
    if (!dateLike) return null;
    const d = new Date(dateLike);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDateISO(dateLike) {
    const d = this._parseDate(dateLike);
    if (!d) return '';
    return d.toISOString().slice(0, 10);
  }

  _formatDateRange(startDate, endDate) {
    const start = this._formatDateISO(startDate);
    const end = this._formatDateISO(endDate);
    if (start && end && start !== end) return start + ' – ' + end;
    return start || end || '';
  }

  // ----------------------
  // Singleton helpers
  // ----------------------
  _getOrCreateCart() {
    const carts = this._getFromStorage('cart', []);
    if (carts.length > 0) return carts[0];

    const now = this._nowISO();
    const cart = {
      id: this._generateId('cart'),
      items: [], // array of CartItem IDs
      currency: this._getDefaultCurrencyCode(),
      subtotal: 0,
      tax: 0,
      shipping: 0,
      total: 0,
      created_at: now,
      updated_at: now
    };
    const newCarts = [cart];
    this._saveToStorage('cart', newCarts);
    return cart;
  }

  _saveCart(cart) {
    const carts = this._getFromStorage('cart', []);
    if (!carts.length) {
      this._saveToStorage('cart', [cart]);
    } else {
      carts[0] = cart;
      this._saveToStorage('cart', carts);
    }
  }

  _getOrCreateFavoritesList() {
    let lists = this._getFromStorage('favorites', []);
    if (lists.length > 0) return lists[0];
    const now = this._nowISO();
    const list = {
      id: this._generateId('favorites'),
      name: 'Favorites',
      item_ids: [],
      created_at: now,
      updated_at: now
    };
    lists = [list];
    this._saveToStorage('favorites', lists);
    return list;
  }

  _saveFavoritesList(list) {
    let lists = this._getFromStorage('favorites', []);
    if (!lists.length) lists = [list];
    else lists[0] = list;
    this._saveToStorage('favorites', lists);
  }

  _getOrCreateWishlist() {
    let lists = this._getFromStorage('wishlists', []);
    if (lists.length > 0) return lists[0];
    const now = this._nowISO();
    const list = {
      id: this._generateId('wishlist'),
      name: 'Wishlist',
      item_ids: [],
      created_at: now,
      updated_at: now
    };
    lists = [list];
    this._saveToStorage('wishlists', lists);
    return list;
  }

  _saveWishlist(list) {
    let lists = this._getFromStorage('wishlists', []);
    if (!lists.length) lists = [list];
    else lists[0] = list;
    this._saveToStorage('wishlists', lists);
  }

  _getOrCreateVisitPlan() {
    let plans = this._getFromStorage('visit_plans', []);
    if (plans.length > 0) return plans[0];
    const now = this._nowISO();
    const plan = {
      id: this._generateId('visit_plan'),
      item_ids: [],
      created_at: now,
      updated_at: now
    };
    plans = [plan];
    this._saveToStorage('visit_plans', plans);
    return plan;
  }

  _saveVisitPlan(plan) {
    let plans = this._getFromStorage('visit_plans', []);
    if (!plans.length) plans = [plan];
    else plans[0] = plan;
    this._saveToStorage('visit_plans', plans);
  }

  _getCurrentNewsletterSubscription() {
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    if (!subs.length) return null;
    // latest by created_at
    subs.sort((a, b) => {
      const da = this._parseDate(a.created_at) || new Date(0);
      const db = this._parseDate(b.created_at) || new Date(0);
      return db - da;
    });
    return subs[0] || null;
  }

  // ----------------------
  // Totals recomputation
  // ----------------------
  _recomputeCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    let subtotal = 0;
    let itemCount = 0;
    itemsForCart.forEach((ci) => {
      const q = typeof ci.quantity === 'number' ? ci.quantity : 0;
      const up = typeof ci.unit_price === 'number' ? ci.unit_price : 0;
      subtotal += up * q;
      itemCount += q;
    });
    cart.subtotal = subtotal;
    cart.tax = cart.tax || 0;
    cart.shipping = cart.shipping || 0;
    cart.total = cart.subtotal + cart.tax + cart.shipping;
    cart.updated_at = this._nowISO();
    this._saveCart(cart);
    return { subtotal, itemCount, total: cart.total };
  }

  // ==========================================================
  // Interface implementations
  // ==========================================================

  // ----------------------
  // Home page
  // ----------------------
  getHomePageContent() {
    const artworks = this._getFromStorage('artworks', []);
    const products = this._getFromStorage('products', []);
    const exhibitions = this._getFromStorage('exhibitions', []);
    const favoriteItems = this._getFromStorage('favorite_items', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const visitPlanItems = this._getFromStorage('visit_plan_items', []);

    // Hero: keep minimal / overridable
    const heroStored = this._getFromStorage('home_page_hero', null);
    const hero = heroStored || {
      headline: '',
      subheadline: '',
      background_image_url: ''
    };

    // Featured artworks
    let featuredArtworks = artworks.filter((a) => a.is_featured === true);
    if (!featuredArtworks.length) {
      featuredArtworks = artworks.slice(0, 6);
    }
    const defaultCurrency = this._getDefaultCurrencyCode();

    const featured_artworks = featuredArtworks.map((aw) => {
      const is_in_favorites = favoriteItems.some((fi) => fi.artwork_id === aw.id);
      const is_in_wishlist = wishlistItems.some((wi) => wi.artwork_id === aw.id);
      const primaryProduct = products.find((p) => p.artwork_id === aw.id && p.status === 'active');
      return {
        artwork: aw,
        category_label: this._categoryLabel(aw.category),
        size_label: this._computeSizeLabel(aw.width_cm, aw.height_cm),
        price_display: typeof aw.price === 'number'
          ? this._formatPriceDisplay(defaultCurrency, aw.price)
          : '',
        is_in_favorites,
        is_in_wishlist,
        primary_product_id: primaryProduct ? primaryProduct.id : null
      };
    });

    // Shop highlights by shop_category
    const shop_highlights = [];
    const hasPrints = products.some((p) => p.shop_category === 'prints' && p.status === 'active');
    const hasOriginals = products.some((p) => p.shop_category === 'originals' && p.status === 'active');
    if (hasPrints) {
      shop_highlights.push({
        shop_category: 'prints',
        label: 'Shop Prints',
        description: ''
      });
    }
    if (hasOriginals) {
      shop_highlights.push({
        shop_category: 'originals',
        label: 'Shop Originals',
        description: ''
      });
    }

    // Featured exhibitions
    let featuredExhibitions = exhibitions.filter((e) => e.is_featured === true);
    if (!featuredExhibitions.length) {
      featuredExhibitions = exhibitions
        .filter((e) => e.status === 'upcoming' || e.status === 'ongoing')
        .sort((a, b) => {
          const da = this._parseDate(a.start_date) || new Date(0);
          const db = this._parseDate(b.start_date) || new Date(0);
          return da - db;
        })
        .slice(0, 3);
    }

    const featured_exhibitions = featuredExhibitions.map((ex) => {
      const inPlan = visitPlanItems.some((vi) => vi.exhibition_id === ex.id);
      const locationParts = [];
      if (ex.venue_city) locationParts.push(ex.venue_city);
      if (ex.venue_country) locationParts.push(ex.venue_country);
      const location_label = locationParts.join(', ');
      return {
        exhibition: ex,
        date_range_label: this._formatDateRange(ex.start_date, ex.end_date),
        location_label,
        is_in_visit_plan: inPlan
      };
    });

    // Newsletter CTA - simple, can be overridden via storage if desired
    const newsletter_ctaStored = this._getFromStorage('newsletter_cta', null);
    const newsletter_cta = newsletter_ctaStored || {
      title: '',
      body: '',
      button_label: ''
    };

    return {
      hero,
      featured_artworks,
      shop_highlights,
      featured_exhibitions,
      newsletter_cta
    };
  }

  // ----------------------
  // Gallery
  // ----------------------
  getGalleryFilterOptions() {
    const artworks = this._getFromStorage('artworks', []);

    const categories = [
      'landscape',
      'cityscape',
      'portrait',
      'abstract',
      'still_life',
      'figure',
      'other'
    ].map((value) => ({ value, label: this._categoryLabel(value) }));

    let years = artworks.map((a) => a.year).filter((y) => typeof y === 'number');
    if (!years.length) years = [];
    const year_range = {
      min_year: years.length ? Math.min.apply(null, years) : null,
      max_year: years.length ? Math.max.apply(null, years) : null
    };

    const prices = artworks
      .map((a) => a.price)
      .filter((p) => typeof p === 'number' && !isNaN(p));
    const price_range = {
      min_price: prices.length ? Math.min.apply(null, prices) : null,
      max_price: prices.length ? Math.max.apply(null, prices) : null,
      currency_symbol: this._currencySymbol(this._getDefaultCurrencyCode())
    };

    const widths = artworks
      .map((a) => a.width_cm)
      .filter((v) => typeof v === 'number' && !isNaN(v));
    const heights = artworks
      .map((a) => a.height_cm)
      .filter((v) => typeof v === 'number' && !isNaN(v));

    const size_filters = {
      min_width_cm: widths.length ? Math.min.apply(null, widths) : null,
      max_width_cm: widths.length ? Math.max.apply(null, widths) : null,
      min_height_cm: heights.length ? Math.min.apply(null, heights) : null,
      max_height_cm: heights.length ? Math.max.apply(null, heights) : null
    };

    const color_palettes = [
      'pastel',
      'vibrant',
      'monochrome',
      'neutral',
      'earth_tones',
      'other'
    ].map((value) => ({ value, label: this._colorPaletteLabel(value) }));

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'year_newest_first', label: 'Year: Newest First' },
      { value: 'year_oldest_first', label: 'Year: Oldest First' },
      { value: 'size_small_to_large', label: 'Size: Small to Large' },
      { value: 'size_large_to_small', label: 'Size: Large to Small' }
    ];

    return {
      categories,
      year_range,
      price_range,
      size_filters,
      color_palettes,
      sort_options
    };
  }

  getGalleryArtworks(filters, sort, page = 1, page_size = 24) {
    filters = filters || {};
    const artworks = this._getFromStorage('artworks', []);
    const favoriteItems = this._getFromStorage('favorite_items', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);
    const defaultCurrency = this._getDefaultCurrencyCode();

    let filtered = artworks.slice();

    if (filters.category) {
      filtered = filtered.filter((a) => a.category === filters.category);
    }
    if (typeof filters.min_year === 'number') {
      filtered = filtered.filter((a) => typeof a.year === 'number' && a.year >= filters.min_year);
    }
    if (typeof filters.max_year === 'number') {
      filtered = filtered.filter((a) => typeof a.year === 'number' && a.year <= filters.max_year);
    }
    if (typeof filters.min_price === 'number') {
      filtered = filtered.filter((a) => typeof a.price === 'number' && a.price >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      filtered = filtered.filter((a) => typeof a.price === 'number' && a.price <= filters.max_price);
    }
    if (typeof filters.max_width_cm === 'number') {
      filtered = filtered.filter((a) => typeof a.width_cm === 'number' && a.width_cm <= filters.max_width_cm);
    }
    if (typeof filters.max_height_cm === 'number') {
      filtered = filtered.filter((a) => typeof a.height_cm === 'number' && a.height_cm <= filters.max_height_cm);
    }
    if (filters.color_palette) {
      filtered = filtered.filter((a) => a.color_palette === filters.color_palette);
    }
    if (filters.for_sale_only) {
      filtered = filtered.filter((a) => a.is_for_sale === true);
    }

    const sizeValue = (a) => {
      const w = typeof a.width_cm === 'number' ? a.width_cm : 0;
      const h = typeof a.height_cm === 'number' ? a.height_cm : 0;
      return w * h;
    };

    if (sort === 'price_low_to_high') {
      filtered.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sort === 'price_high_to_low') {
      filtered.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pb - pa;
      });
    } else if (sort === 'year_newest_first') {
      filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sort === 'year_oldest_first') {
      filtered.sort((a, b) => (a.year || 0) - (b.year || 0));
    } else if (sort === 'size_small_to_large') {
      filtered.sort((a, b) => sizeValue(a) - sizeValue(b));
    } else if (sort === 'size_large_to_small') {
      filtered.sort((a, b) => sizeValue(b) - sizeValue(a));
    }

    const total_items = filtered.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 24;
    const start = (p - 1) * ps;
    const end = start + ps;
    const slice = filtered.slice(start, end);

    const items = slice.map((aw) => {
      const is_in_favorites = favoriteItems.some((fi) => fi.artwork_id === aw.id);
      const is_in_wishlist = wishlistItems.some((wi) => wi.artwork_id === aw.id);
      const primaryProduct = products.find((p) => p.artwork_id === aw.id && p.status === 'active');
      return {
        artwork: aw,
        category_label: this._categoryLabel(aw.category),
        size_label: this._computeSizeLabel(aw.width_cm, aw.height_cm),
        price_display: typeof aw.price === 'number'
          ? this._formatPriceDisplay(defaultCurrency, aw.price)
          : '',
        is_in_favorites,
        is_in_wishlist,
        primary_product_id: primaryProduct ? primaryProduct.id : null
      };
    });

    return {
      items,
      total_items,
      page: p,
      page_size: ps
    };
  }

  getArtworkDetails(artworkId) {
    const artworks = this._getFromStorage('artworks', []);
    const favoriteItems = this._getFromStorage('favorite_items', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);
    const defaultCurrency = this._getDefaultCurrencyCode();

    const artwork = artworks.find((a) => a.id === artworkId) || null;
    if (!artwork) {
      return {
        artwork: null,
        category_label: '',
        medium_label: '',
        size_label: '',
        price_display: '',
        is_in_favorites: false,
        is_in_wishlist: false,
        linked_products: []
      };
    }

    const is_in_favorites = favoriteItems.some((fi) => fi.artwork_id === artwork.id);
    const is_in_wishlist = wishlistItems.some((wi) => wi.artwork_id === artwork.id);

    const linkedProducts = products
      .filter((p) => p.artwork_id === artwork.id && p.status === 'active')
      .map((p) => ({
        product_id: p.id,
        name: p.name,
        shop_category: p.shop_category,
        price_display: this._formatPriceDisplay(p.currency, p.price)
      }));

    return {
      artwork,
      category_label: this._categoryLabel(artwork.category),
      medium_label: this._mediumLabel(artwork.medium),
      size_label: this._computeSizeLabel(artwork.width_cm, artwork.height_cm),
      price_display: typeof artwork.price === 'number'
        ? this._formatPriceDisplay(defaultCurrency, artwork.price)
        : '',
      is_in_favorites,
      is_in_wishlist,
      linked_products: linkedProducts
    };
  }

  // ----------------------
  // Favorites
  // ----------------------
  addArtworkToFavorites(artworkId) {
    const artworks = this._getFromStorage('artworks', []);
    const artwork = artworks.find((a) => a.id === artworkId);
    if (!artwork) {
      return { success: false, favorites_list_id: null, favorites_count: 0, message: 'Artwork not found' };
    }

    const list = this._getOrCreateFavoritesList();
    let favoriteItems = this._getFromStorage('favorite_items', []);

    const existing = favoriteItems.find(
      (fi) => fi.favorites_list_id === list.id && fi.artwork_id === artworkId
    );
    if (existing) {
      const count = favoriteItems.filter((fi) => fi.favorites_list_id === list.id).length;
      return {
        success: true,
        favorites_list_id: list.id,
        favorites_count: count,
        message: 'Artwork is already in favorites'
      };
    }

    const now = this._nowISO();
    const favItem = {
      id: this._generateId('favorite_item'),
      favorites_list_id: list.id,
      artwork_id: artworkId,
      added_at: now
    };
    favoriteItems.push(favItem);
    list.item_ids = list.item_ids || [];
    list.item_ids.push(favItem.id);
    list.updated_at = now;

    this._saveToStorage('favorite_items', favoriteItems);
    this._saveFavoritesList(list);

    const count = favoriteItems.filter((fi) => fi.favorites_list_id === list.id).length;
    return {
      success: true,
      favorites_list_id: list.id,
      favorites_count: count,
      message: 'Artwork added to favorites'
    };
  }

  getFavoritesList() {
    const lists = this._getFromStorage('favorites', []);
    const list = lists[0] || null;
    if (!list) {
      return { favorites_list_id: null, items: [], total_items: 0 };
    }

    const favoriteItems = this._getFromStorage('favorite_items', []);
    const artworks = this._getFromStorage('artworks', []);

    const itemsForList = favoriteItems.filter((fi) => fi.favorites_list_id === list.id);
    const items = itemsForList.map((fi) => {
      const artwork = artworks.find((a) => a.id === fi.artwork_id) || null;
      return {
        favorite_item_id: fi.id,
        artwork,
        category_label: artwork ? this._categoryLabel(artwork.category) : '',
        size_label: artwork ? this._computeSizeLabel(artwork.width_cm, artwork.height_cm) : '',
        price_display:
          artwork && typeof artwork.price === 'number'
            ? this._formatPriceDisplay(this._getDefaultCurrencyCode(), artwork.price)
            : ''
      };
    });

    return {
      favorites_list_id: list.id,
      items,
      total_items: items.length
    };
  }

  removeFavoriteItem(favoriteItemId) {
    const list = this._getOrCreateFavoritesList();
    let favoriteItems = this._getFromStorage('favorite_items', []);
    const existing = favoriteItems.find((fi) => fi.id === favoriteItemId);
    if (!existing) {
      const count = favoriteItems.filter((fi) => fi.favorites_list_id === list.id).length;
      return { success: false, favorites_count: count, message: 'Favorite item not found' };
    }

    favoriteItems = favoriteItems.filter((fi) => fi.id !== favoriteItemId);
    list.item_ids = (list.item_ids || []).filter((id) => id !== favoriteItemId);
    list.updated_at = this._nowISO();

    this._saveToStorage('favorite_items', favoriteItems);
    this._saveFavoritesList(list);

    const count = favoriteItems.filter((fi) => fi.favorites_list_id === list.id).length;
    return { success: true, favorites_count: count, message: 'Favorite removed' };
  }

  clearFavoritesList() {
    const lists = this._getFromStorage('favorites', []);
    const list = lists[0] || null;
    let favoriteItems = this._getFromStorage('favorite_items', []);

    if (!list) {
      return { success: true, favorites_count: 0, message: 'Favorites already empty' };
    }

    favoriteItems = favoriteItems.filter((fi) => fi.favorites_list_id !== list.id);
    list.item_ids = [];
    list.updated_at = this._nowISO();

    this._saveToStorage('favorite_items', favoriteItems);
    this._saveFavoritesList(list);

    return { success: true, favorites_count: 0, message: 'All favorites cleared' };
  }

  // ----------------------
  // Wishlist
  // ----------------------
  addArtworkToWishlist(artworkId, notes) {
    const artworks = this._getFromStorage('artworks', []);
    const artwork = artworks.find((a) => a.id === artworkId);
    if (!artwork) {
      return { success: false, wishlist_id: null, wishlist_count: 0, message: 'Artwork not found' };
    }

    const list = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const existing = wishlistItems.find(
      (wi) => wi.wishlist_id === list.id && wi.artwork_id === artworkId
    );
    if (existing) {
      const count = wishlistItems.filter((wi) => wi.wishlist_id === list.id).length;
      return {
        success: true,
        wishlist_id: list.id,
        wishlist_count: count,
        message: 'Artwork is already in wishlist'
      };
    }

    const now = this._nowISO();
    const wi = {
      id: this._generateId('wishlist_item'),
      wishlist_id: list.id,
      artwork_id: artworkId,
      product_id: null,
      added_at: now,
      notes: notes || ''
    };

    wishlistItems.push(wi);
    list.item_ids = list.item_ids || [];
    list.item_ids.push(wi.id);
    list.updated_at = now;

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveWishlist(list);

    const count = wishlistItems.filter((x) => x.wishlist_id === list.id).length;
    return {
      success: true,
      wishlist_id: list.id,
      wishlist_count: count,
      message: 'Artwork added to wishlist'
    };
  }

  addProductToWishlist(productId, notes) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, wishlist_id: null, wishlist_count: 0, message: 'Product not found' };
    }

    const list = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);

    const existing = wishlistItems.find(
      (wi) => wi.wishlist_id === list.id && wi.product_id === productId
    );
    if (existing) {
      const count = wishlistItems.filter((wi) => wi.wishlist_id === list.id).length;
      return {
        success: true,
        wishlist_id: list.id,
        wishlist_count: count,
        message: 'Product is already in wishlist'
      };
    }

    const now = this._nowISO();
    const wi = {
      id: this._generateId('wishlist_item'),
      wishlist_id: list.id,
      artwork_id: null,
      product_id: productId,
      added_at: now,
      notes: notes || ''
    };

    wishlistItems.push(wi);
    list.item_ids = list.item_ids || [];
    list.item_ids.push(wi.id);
    list.updated_at = now;

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveWishlist(list);

    const count = wishlistItems.filter((x) => x.wishlist_id === list.id).length;
    return {
      success: true,
      wishlist_id: list.id,
      wishlist_count: count,
      message: 'Product added to wishlist'
    };
  }

  getWishlist() {
    const lists = this._getFromStorage('wishlists', []);
    const list = lists[0] || null;
    if (!list) {
      return { wishlist_id: null, items: [], total_items: 0 };
    }

    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const artworks = this._getFromStorage('artworks', []);
    const products = this._getFromStorage('products', []);

    const defaultCurrency = this._getDefaultCurrencyCode();

    const itemsForList = wishlistItems.filter((wi) => wi.wishlist_id === list.id);

    const items = itemsForList.map((wi) => {
      const artwork = wi.artwork_id
        ? artworks.find((a) => a.id === wi.artwork_id) || null
        : null;
      const product = wi.product_id
        ? products.find((p) => p.id === wi.product_id) || null
        : null;

      let title = '';
      let thumbnail_url = '';
      let price_display = '';
      let item_type = '';

      if (artwork) {
        title = artwork.title;
        thumbnail_url = artwork.main_image_url || '';
        price_display = typeof artwork.price === 'number'
          ? this._formatPriceDisplay(defaultCurrency, artwork.price)
          : '';
        item_type = 'artwork';
      } else if (product) {
        title = product.name;
        thumbnail_url = product.image_url || '';
        price_display = this._formatPriceDisplay(product.currency, product.price);
        item_type = 'product';
      }

      return {
        wishlist_item_id: wi.id,
        artwork,
        product,
        title,
        thumbnail_url,
        price_display,
        item_type
      };
    });

    return {
      wishlist_id: list.id,
      items,
      total_items: items.length
    };
  }

  removeWishlistItem(wishlistItemId) {
    const list = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items', []);
    const existing = wishlistItems.find((wi) => wi.id === wishlistItemId);
    if (!existing) {
      const count = wishlistItems.filter((wi) => wi.wishlist_id === list.id).length;
      return { success: false, wishlist_count: count, message: 'Wishlist item not found' };
    }

    wishlistItems = wishlistItems.filter((wi) => wi.id !== wishlistItemId);
    list.item_ids = (list.item_ids || []).filter((id) => id !== wishlistItemId);
    list.updated_at = this._nowISO();

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveWishlist(list);

    const count = wishlistItems.filter((wi) => wi.wishlist_id === list.id).length;
    return { success: true, wishlist_count: count, message: 'Wishlist item removed' };
  }

  // ----------------------
  // Shop filters & listing
  // ----------------------
  getShopFilterOptions(shop_category) {
    const products = this._getFromStorage('products', []);
    const filteredProducts = products.filter((p) => p.shop_category === shop_category);

    const subjectSet = new Set();
    filteredProducts.forEach((p) => {
      if (p.category) subjectSet.add(p.category);
    });
    const subject_categories = Array.from(subjectSet).map((value) => ({
      value,
      label: this._categoryLabel(value)
    }));

    const prices = filteredProducts
      .map((p) => p.price)
      .filter((v) => typeof v === 'number' && !isNaN(v));
    const price_range = {
      min_price: prices.length ? Math.min.apply(null, prices) : null,
      max_price: prices.length ? Math.max.apply(null, prices) : null,
      currency_symbol: this._currencySymbol(this._getDefaultCurrencyCode())
    };

    const widths = filteredProducts
      .map((p) => p.width_cm)
      .filter((v) => typeof v === 'number' && !isNaN(v));
    const heights = filteredProducts
      .map((p) => p.height_cm)
      .filter((v) => typeof v === 'number' && !isNaN(v));
    const size_filters = {
      min_width_cm: widths.length ? Math.min.apply(null, widths) : null,
      max_width_cm: widths.length ? Math.max.apply(null, widths) : null,
      min_height_cm: heights.length ? Math.min.apply(null, heights) : null,
      max_height_cm: heights.length ? Math.max.apply(null, heights) : null
    };

    const sort_options = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'size_small_to_large', label: 'Size: Small to Large' },
      { value: 'size_large_to_small', label: 'Size: Large to Small' }
    ];

    return {
      subject_categories,
      price_range,
      size_filters,
      sort_options
    };
  }

  getShopProducts(shop_category, filters, sort, page = 1, page_size = 24) {
    filters = filters || {};
    const products = this._getFromStorage('products', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    let filtered = products.filter((p) => p.shop_category === shop_category);

    if (filters.subject_category) {
      filtered = filtered.filter((p) => p.category === filters.subject_category);
    }
    if (typeof filters.min_price === 'number') {
      filtered = filtered.filter((p) => typeof p.price === 'number' && p.price >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      filtered = filtered.filter((p) => typeof p.price === 'number' && p.price <= filters.max_price);
    }
    if (typeof filters.min_width_cm === 'number') {
      filtered = filtered.filter((p) => typeof p.width_cm === 'number' && p.width_cm >= filters.min_width_cm);
    }
    if (typeof filters.max_width_cm === 'number') {
      filtered = filtered.filter((p) => typeof p.width_cm === 'number' && p.width_cm <= filters.max_width_cm);
    }
    if (typeof filters.min_height_cm === 'number') {
      filtered = filtered.filter((p) => typeof p.height_cm === 'number' && p.height_cm >= filters.min_height_cm);
    }
    if (typeof filters.max_height_cm === 'number') {
      filtered = filtered.filter((p) => typeof p.height_cm === 'number' && p.height_cm <= filters.max_height_cm);
    }

    const sizeValue = (p) => {
      const w = typeof p.width_cm === 'number' ? p.width_cm : 0;
      const h = typeof p.height_cm === 'number' ? p.height_cm : 0;
      return w * h;
    };

    if (sort === 'newest_first') {
      filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sort === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || Number.POSITIVE_INFINITY) - (b.price || Number.POSITIVE_INFINITY));
    } else if (sort === 'price_high_to_low') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'size_small_to_large') {
      filtered.sort((a, b) => sizeValue(a) - sizeValue(b));
    } else if (sort === 'size_large_to_small') {
      filtered.sort((a, b) => sizeValue(b) - sizeValue(a));
    }

    const total_items = filtered.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 24;
    const start = (p - 1) * ps;
    const end = start + ps;
    const slice = filtered.slice(start, end);

    const items = slice.map((prod) => {
      const is_in_wishlist = wishlistItems.some((wi) => wi.product_id === prod.id);
      return {
        product: prod,
        category_label: this._categoryLabel(prod.category),
        price_display: this._formatPriceDisplay(prod.currency, prod.price),
        size_label: this._computeSizeLabel(prod.width_cm, prod.height_cm),
        is_in_wishlist
      };
    });

    return {
      items,
      total_items,
      page: p,
      page_size: ps
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category_label: '',
        price_display: '',
        currency_symbol: this._currencySymbol(this._getDefaultCurrencyCode()),
        size_options: [],
        frame_options: [],
        is_in_wishlist: false,
        related_products: []
      };
    }

    const is_in_wishlist = wishlistItems.some((wi) => wi.product_id === product.id);

    const size_options = (product.size_options || []).map((opt) => ({
      code: opt.code,
      label: opt.label,
      width_cm: opt.width_cm,
      height_cm: opt.height_cm,
      price_display: typeof opt.price === 'number'
        ? this._formatPriceDisplay(product.currency, opt.price)
        : this._formatPriceDisplay(product.currency, product.price),
      is_default: product.default_size_label
        ? product.default_size_label === opt.label
        : !!opt.is_default
    }));

    const frame_options = (product.frame_options || []).map((opt) => ({
      code: opt.code,
      label: opt.label,
      price_delta_display: typeof opt.price_delta === 'number'
        ? this._formatPriceDisplay(product.currency, opt.price_delta)
        : this._formatPriceDisplay(product.currency, 0),
      is_default: product.default_frame_label
        ? product.default_frame_label === opt.label
        : !!opt.is_default
    }));

    const related_products = this.getRelatedProducts(productId);

    return {
      product,
      category_label: this._categoryLabel(product.category),
      price_display: this._formatPriceDisplay(product.currency, product.price),
      currency_symbol: this._currencySymbol(product.currency),
      size_options,
      frame_options,
      is_in_wishlist,
      related_products
    };
  }

  getRelatedProducts(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) return [];

    const related = products
      .filter(
        (p) =>
          p.id !== product.id &&
          p.shop_category === product.shop_category &&
          p.category === product.category &&
          p.status === 'active'
      )
      .slice(0, 8);

    return related.map((p) => ({
      product: p,
      price_display: this._formatPriceDisplay(p.currency, p.price)
    }));
  }

  // ----------------------
  // Cart
  // ----------------------
  addProductToCart(productId, quantity = 1, selected_size_label, selected_frame_label) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, cart_id: null, item_count: 0, subtotal_display: '', message: 'Product not found' };
    }
    if (product.status !== 'active' || product.available === false) {
      return {
        success: false,
        cart_id: null,
        item_count: 0,
        subtotal_display: '',
        message: 'Product is not available'
      };
    }
    if (typeof product.stock_quantity === 'number' && product.stock_quantity < quantity) {
      return {
        success: false,
        cart_id: null,
        item_count: 0,
        subtotal_display: '',
        message: 'Insufficient stock'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    // Compute unit price based on size/frame selection
    let basePrice = product.price;
    if (selected_size_label && Array.isArray(product.size_options)) {
      const sizeOpt = product.size_options.find((s) => s.label === selected_size_label);
      if (sizeOpt && typeof sizeOpt.price === 'number') {
        basePrice = sizeOpt.price;
      }
    }

    let frameDelta = 0;
    if (selected_frame_label && Array.isArray(product.frame_options)) {
      const frameOpt = product.frame_options.find((f) => f.label === selected_frame_label);
      if (frameOpt && typeof frameOpt.price_delta === 'number') {
        frameDelta = frameOpt.price_delta;
      }
    }

    const unit_price = basePrice + frameDelta;
    const now = this._nowISO();

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      product_id: product.id,
      artwork_id: product.artwork_id || null,
      quantity,
      unit_price,
      selected_size_label: selected_size_label || product.default_size_label || null,
      selected_frame_label: selected_frame_label || product.default_frame_label || null,
      created_at: now,
      updated_at: now
    };

    cartItems.push(cartItem);
    cart.items = cart.items || [];
    cart.items.push(cartItem.id);

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recomputeCartTotals(cart);

    return {
      success: true,
      cart_id: cart.id,
      item_count: totals.itemCount,
      subtotal_display: this._formatPriceDisplay(cart.currency, totals.subtotal),
      message: 'Added to cart'
    };
  }

  getCartSummary() {
    const carts = this._getFromStorage('cart', []);
    const cart = carts[0] || null;
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const artworks = this._getFromStorage('artworks', []);

    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal_display: this._formatPriceDisplay(this._getDefaultCurrencyCode(), 0),
        tax_display: this._formatPriceDisplay(this._getDefaultCurrencyCode(), 0),
        shipping_display: this._formatPriceDisplay(this._getDefaultCurrencyCode(), 0),
        total_display: this._formatPriceDisplay(this._getDefaultCurrencyCode(), 0),
        item_count: 0
      };
    }

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const items = itemsForCart.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const artwork = ci.artwork_id
        ? artworks.find((a) => a.id === ci.artwork_id) || null
        : (product && product.artwork_id
          ? artworks.find((a) => a.id === product.artwork_id) || null
          : null);

      const title = product ? product.name : artwork ? artwork.title : '';
      const thumbnail_url = product
        ? product.image_url || ''
        : artwork
          ? artwork.main_image_url || ''
          : '';

      const unit_price_display = this._formatPriceDisplay(cart.currency, ci.unit_price);
      const lineTotal = (ci.quantity || 0) * (ci.unit_price || 0);
      const line_total_display = this._formatPriceDisplay(cart.currency, lineTotal);

      return {
        cart_item: ci,
        product,
        artwork,
        title,
        thumbnail_url,
        selected_size_label: ci.selected_size_label || null,
        selected_frame_label: ci.selected_frame_label || null,
        unit_price_display,
        line_total_display
      };
    });

    const itemCount = itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      cart,
      items,
      subtotal_display: this._formatPriceDisplay(cart.currency, cart.subtotal || 0),
      tax_display: this._formatPriceDisplay(cart.currency, cart.tax || 0),
      shipping_display: this._formatPriceDisplay(cart.currency, cart.shipping || 0),
      total_display: this._formatPriceDisplay(cart.currency, cart.total || 0),
      item_count: itemCount
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    quantity = typeof quantity === 'number' ? quantity : 0;

    const carts = this._getFromStorage('cart', []);
    const cart = carts[0] || this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return {
        success: false,
        cart_summary: {
          item_count: 0,
          subtotal_display: this._formatPriceDisplay(cart.currency, cart.subtotal || 0),
          total_display: this._formatPriceDisplay(cart.currency, cart.total || 0)
        },
        message: 'Cart item not found'
      };
    }

    if (quantity <= 0) {
      // Remove item
      cartItems.splice(idx, 1);
      cart.items = (cart.items || []).filter((id) => id !== cartItemId);
    } else {
      cartItems[idx].quantity = quantity;
      cartItems[idx].updated_at = this._nowISO();
    }

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recomputeCartTotals(cart);

    return {
      success: true,
      cart_summary: {
        item_count: totals.itemCount,
        subtotal_display: this._formatPriceDisplay(cart.currency, totals.subtotal),
        total_display: this._formatPriceDisplay(cart.currency, totals.total)
      },
      message: 'Cart updated'
    };
  }

  removeCartItem(cartItemId) {
    const carts = this._getFromStorage('cart', []);
    const cart = carts[0] || this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return {
        success: false,
        cart_summary: {
          item_count: 0,
          subtotal_display: this._formatPriceDisplay(cart.currency, cart.subtotal || 0),
          total_display: this._formatPriceDisplay(cart.currency, cart.total || 0)
        },
        message: 'Cart item not found'
      };
    }

    cartItems.splice(idx, 1);
    cart.items = (cart.items || []).filter((id) => id !== cartItemId);

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recomputeCartTotals(cart);

    return {
      success: true,
      cart_summary: {
        item_count: totals.itemCount,
        subtotal_display: this._formatPriceDisplay(cart.currency, totals.subtotal),
        total_display: this._formatPriceDisplay(cart.currency, totals.total)
      },
      message: 'Cart item removed'
    };
  }

  // ----------------------
  // Commissions
  // ----------------------
  getCommissionsPageContent() {
    const stored = this._getFromStorage('commissions_page_content', null);
    if (stored) {
      return stored;
    }
    return {
      intro_markdown: '',
      pricing_tiers_markdown: '',
      process_steps: []
    };
  }

  getCommissionFormOptions() {
    const artwork_types = [
      'portrait',
      'landscape',
      'cityscape',
      'abstract',
      'mural',
      'other'
    ].map((value) => ({ value, label: this._categoryLabel(value) || value.charAt(0).toUpperCase() + value.slice(1) }));

    const mediums = [
      'acrylic_on_canvas',
      'oil_on_canvas',
      'watercolor_on_paper',
      'digital',
      'mixed_media',
      'ink_on_paper',
      'other'
    ].map((value) => ({ value, label: this._mediumLabel(value) }));

    const budget_hint = '';

    return { artwork_types, mediums, budget_hint };
  }

  submitCommissionRequest(
    artwork_type,
    medium,
    budget,
    preferred_completion_date,
    description,
    client_name,
    client_email
  ) {
    const now = this._nowISO();
    const requests = this._getFromStorage('commission_requests', []);

    const req = {
      id: this._generateId('commission'),
      artwork_type,
      medium,
      budget,
      preferred_completion_date: this._parseDate(preferred_completion_date)
        ? new Date(preferred_completion_date).toISOString()
        : preferred_completion_date,
      description,
      client_name,
      client_email,
      status: 'new',
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('commission_requests', requests);

    return {
      success: true,
      commission_request_id: req.id,
      status: req.status,
      message: 'Commission request submitted'
    };
  }

  // ----------------------
  // About & Exhibitions
  // ----------------------
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored) return stored;
    return {
      bio_markdown: '',
      statement_markdown: '',
      studio_info_markdown: ''
    };
  }

  getExhibitions(from_date, to_date, status, sort) {
    const exhibitions = this._getFromStorage('exhibitions', []);
    const visitPlanItems = this._getFromStorage('visit_plan_items', []);

    const fromDateObj = this._parseDate(from_date);
    const toDateObj = this._parseDate(to_date);

    let filtered = exhibitions.slice();

    if (fromDateObj) {
      filtered = filtered.filter((e) => {
        const sd = this._parseDate(e.start_date);
        return sd && sd >= fromDateObj;
      });
    }
    if (toDateObj) {
      filtered = filtered.filter((e) => {
        const sd = this._parseDate(e.start_date);
        return sd && sd <= toDateObj;
      });
    }
    if (status) {
      filtered = filtered.filter((e) => e.status === status);
    }

    if (sort === 'date_soonest_first') {
      filtered.sort((a, b) => {
        const da = this._parseDate(a.start_date) || new Date(0);
        const db = this._parseDate(b.start_date) || new Date(0);
        return da - db;
      });
    } else if (sort === 'date_latest_first') {
      filtered.sort((a, b) => {
        const da = this._parseDate(a.start_date) || new Date(0);
        const db = this._parseDate(b.start_date) || new Date(0);
        return db - da;
      });
    }

    return filtered.map((ex) => {
      const inPlan = visitPlanItems.some((vi) => vi.exhibition_id === ex.id);
      const locationParts = [];
      if (ex.venue_city) locationParts.push(ex.venue_city);
      if (ex.venue_country) locationParts.push(ex.venue_country);
      const location_label = locationParts.join(', ');
      return {
        exhibition: ex,
        date_range_label: this._formatDateRange(ex.start_date, ex.end_date),
        location_label,
        is_in_visit_plan: inPlan
      };
    });
  }

  getExhibitionDetails(exhibitionId) {
    const exhibitions = this._getFromStorage('exhibitions', []);
    const visitPlanItems = this._getFromStorage('visit_plan_items', []);

    const ex = exhibitions.find((e) => e.id === exhibitionId) || null;
    if (!ex) {
      return {
        exhibition: null,
        date_range_label: '',
        location_label: '',
        featured_artworks: [],
        is_in_visit_plan: false
      };
    }

    const inPlan = visitPlanItems.some((vi) => vi.exhibition_id === ex.id);
    const locationParts = [];
    if (ex.venue_city) locationParts.push(ex.venue_city);
    if (ex.venue_country) locationParts.push(ex.venue_country);
    const location_label = locationParts.join(', ');

    // No explicit relationship to artworks in schema; return empty array
    return {
      exhibition: ex,
      date_range_label: this._formatDateRange(ex.start_date, ex.end_date),
      location_label,
      featured_artworks: [],
      is_in_visit_plan: inPlan
    };
  }

  addExhibitionToVisitPlan(exhibitionId) {
    const exhibitions = this._getFromStorage('exhibitions', []);
    const ex = exhibitions.find((e) => e.id === exhibitionId);
    if (!ex) {
      return { success: false, visit_plan_id: null, visit_plan_item_id: null, visit_plan_count: 0, message: 'Exhibition not found' };
    }

    const plan = this._getOrCreateVisitPlan();
    let planItems = this._getFromStorage('visit_plan_items', []);

    const existing = planItems.find(
      (vi) => vi.visit_plan_id === plan.id && vi.exhibition_id === exhibitionId
    );
    if (existing) {
      const count = planItems.filter((vi) => vi.visit_plan_id === plan.id).length;
      return {
        success: true,
        visit_plan_id: plan.id,
        visit_plan_item_id: existing.id,
        visit_plan_count: count,
        message: 'Exhibition already in visit plan'
      };
    }

    const now = this._nowISO();
    const item = {
      id: this._generateId('visit_plan_item'),
      visit_plan_id: plan.id,
      exhibition_id: exhibitionId,
      added_at: now,
      notes: ''
    };

    planItems.push(item);
    plan.item_ids = plan.item_ids || [];
    plan.item_ids.push(item.id);
    plan.updated_at = now;

    this._saveToStorage('visit_plan_items', planItems);
    this._saveVisitPlan(plan);

    const count = planItems.filter((vi) => vi.visit_plan_id === plan.id).length;
    return {
      success: true,
      visit_plan_id: plan.id,
      visit_plan_item_id: item.id,
      visit_plan_count: count,
      message: 'Exhibition added to visit plan'
    };
  }

  getVisitPlan() {
    const plans = this._getFromStorage('visit_plans', []);
    const plan = plans[0] || null;
    if (!plan) {
      return { visit_plan_id: null, items: [], total_items: 0 };
    }

    const planItems = this._getFromStorage('visit_plan_items', []);
    const exhibitions = this._getFromStorage('exhibitions', []);

    const itemsForPlan = planItems.filter((vi) => vi.visit_plan_id === plan.id);

    const items = itemsForPlan.map((vi) => {
      const ex = exhibitions.find((e) => e.id === vi.exhibition_id) || null;
      const locationParts = [];
      if (ex && ex.venue_city) locationParts.push(ex.venue_city);
      if (ex && ex.venue_country) locationParts.push(ex.venue_country);
      const location_label = locationParts.join(', ');
      return {
        visit_plan_item: vi,
        exhibition: ex,
        date_range_label: ex ? this._formatDateRange(ex.start_date, ex.end_date) : '',
        location_label
      };
    });

    return {
      visit_plan_id: plan.id,
      items,
      total_items: items.length
    };
  }

  removeVisitPlanItem(visitPlanItemId) {
    const plan = this._getOrCreateVisitPlan();
    let planItems = this._getFromStorage('visit_plan_items', []);

    const existing = planItems.find((vi) => vi.id === visitPlanItemId);
    if (!existing) {
      const count = planItems.filter((vi) => vi.visit_plan_id === plan.id).length;
      return { success: false, visit_plan_count: count, message: 'Visit plan item not found' };
    }

    planItems = planItems.filter((vi) => vi.id !== visitPlanItemId);
    plan.item_ids = (plan.item_ids || []).filter((id) => id !== visitPlanItemId);
    plan.updated_at = this._nowISO();

    this._saveToStorage('visit_plan_items', planItems);
    this._saveVisitPlan(plan);

    const count = planItems.filter((vi) => vi.visit_plan_id === plan.id).length;
    return { success: true, visit_plan_count: count, message: 'Visit plan item removed' };
  }

  // ----------------------
  // Projects & collaboration
  // ----------------------
  getProjects(filters, sort) {
    filters = filters || {};
    let projects = this._getFromStorage('projects', []);

    if (filters.client_type) {
      projects = projects.filter((p) => p.client_type === filters.client_type);
    }
    if (filters.project_category) {
      projects = projects.filter((p) => p.project_category === filters.project_category);
    }
    if (typeof filters.year === 'number') {
      projects = projects.filter((p) => p.year === filters.year);
    }

    if (sort === 'year_newest_first') {
      projects.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sort === 'year_oldest_first') {
      projects.sort((a, b) => (a.year || 0) - (b.year || 0));
    }

    return projects.map((p) => ({
      project: p,
      client_type_label: this._clientTypeLabel(p.client_type),
      summary: p.description_short || ''
    }));
  }

  getProjectDetails(projectId) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) {
      return {
        project: null,
        client_type_label: '',
        project_category_label: '',
        wall_size_label: '',
        image_gallery: [],
        related_projects: []
      };
    }

    const wall_size_label = (typeof project.wall_width_m === 'number' && typeof project.wall_height_m === 'number')
      ? project.wall_width_m + ' × ' + project.wall_height_m + ' m'
      : '';

    const related_projects = projects
      .filter((p) => p.id !== project.id && p.project_category === project.project_category)
      .slice(0, 6);

    const gallery = [];
    if (project.image_url) gallery.push(project.image_url);
    if (Array.isArray(project.additional_image_urls)) {
      gallery.push.apply(gallery, project.additional_image_urls);
    }

    return {
      project,
      client_type_label: this._clientTypeLabel(project.client_type),
      project_category_label: this._projectCategoryLabel(project.project_category),
      wall_size_label,
      image_gallery: gallery,
      related_projects
    };
  }

  submitCollaborationInquiry(name, email, project_reference_id, project_reference_title, message) {
    const now = this._nowISO();
    const inquiries = this._getFromStorage('collaboration_inquiries', []);

    const inquiry = {
      id: this._generateId('collab'),
      name,
      email,
      project_reference_id: project_reference_id || null,
      project_reference_title: project_reference_title || null,
      message,
      status: 'new',
      created_at: now
    };

    inquiries.push(inquiry);
    this._saveToStorage('collaboration_inquiries', inquiries);

    return {
      success: true,
      inquiry_id: inquiry.id,
      status: inquiry.status,
      message: 'Collaboration inquiry submitted'
    };
  }

  // ----------------------
  // Newsletter & lookbook
  // ----------------------
  getNewsletterSignupConfig() {
    const stored = this._getFromStorage('newsletter_signup_config', null) || {};

    const defaultInterests = [
      { value: 'new_prints_shop_updates', label: 'New Prints & Shop Updates' },
      { value: 'exhibitions_events', label: 'Exhibitions & Events' },
      { value: 'commissions_projects', label: 'Commissions & Projects' }
    ];

    const defaultFrequencies = [
      { value: 'monthly_summary', label: 'Monthly summary', description: '' },
      { value: 'weekly_digest', label: 'Weekly digest', description: '' },
      { value: 'occasional', label: 'Occasional', description: '' }
    ];

    return {
      interests: stored.interests || defaultInterests,
      frequencies: stored.frequencies || defaultFrequencies,
      privacy_message: stored.privacy_message || ''
    };
  }

  subscribeToNewsletter(email, interests, frequency, source) {
    const now = this._nowISO();
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    let interestRows = this._getFromStorage('newsletter_subscription_interests', []);

    const subscription = {
      id: this._generateId('newsletter_sub'),
      email,
      frequency,
      source,
      lookbook_2024_downloaded: false,
      created_at: now,
      confirmed: true
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    if (Array.isArray(interests)) {
      interests.forEach((code) => {
        const row = {
          id: this._generateId('newsletter_interest'),
          subscription_id: subscription.id,
          interest_code: code
        };
        interestRows.push(row);
      });
      this._saveToStorage('newsletter_subscription_interests', interestRows);
    }

    return {
      success: true,
      subscription_id: subscription.id,
      confirmed: subscription.confirmed,
      message: 'Subscribed to newsletter'
    };
  }

  getNewsletterThankYouContent() {
    const docs = this._getFromStorage('documents', []);
    const lookbook = docs.find(
      (d) =>
        d.document_category === 'lookbook' &&
        d.file_type === 'pdf' &&
        d.year === 2024 &&
        d.status === 'active'
    );

    return {
      headline: '',
      body: '',
      lookbook_available: !!lookbook,
      lookbook_label: lookbook ? 'Download ' + (lookbook.title || '2024 Lookbook (PDF)') : ''
    };
  }

  downloadLookbook(year) {
    const docs = this._getFromStorage('documents', []);
    const doc = docs.find(
      (d) =>
        d.document_category === 'lookbook' &&
        d.file_type === 'pdf' &&
        d.year === year &&
        d.status === 'active'
    );

    if (!doc) {
      return { success: false, document: null, message: 'Lookbook not found' };
    }

    // Mark as downloaded on the latest subscription if applicable
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    if (subs.length && year === 2024) {
      subs.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
      const latest = subs[0];
      latest.lookbook_2024_downloaded = true;
      this._saveToStorage('newsletter_subscriptions', subs);
    }

    return {
      success: true,
      document: doc,
      message: 'Lookbook ready for download'
    };
  }

  // ----------------------
  // Info & policies
  // ----------------------
  getInfoAndPoliciesContent() {
    const stored = this._getFromStorage('info_policies_content', null);
    if (stored) return stored;
    return {
      shipping_markdown: '',
      returns_markdown: '',
      care_instructions_markdown: '',
      privacy_markdown: '',
      faqs: []
    };
  }

  // ----------------------
  // Related artworks
  // ----------------------
  getRelatedArtworks(artworkId) {
    const artworks = this._getFromStorage('artworks', []);
    const artwork = artworks.find((a) => a.id === artworkId);
    if (!artwork) return [];

    const defaultCurrency = this._getDefaultCurrencyCode();

    const related = artworks
      .filter(
        (a) =>
          a.id !== artwork.id &&
          a.category === artwork.category &&
          a.medium === artwork.medium
      )
      .slice(0, 8);

    return related.map((a) => ({
      artwork: a,
      category_label: this._categoryLabel(a.category),
      price_display: typeof a.price === 'number'
        ? this._formatPriceDisplay(defaultCurrency, a.price)
        : ''
    }));
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
