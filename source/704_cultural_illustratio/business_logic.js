/* localStorage polyfill for Node.js and environments without localStorage */
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
  }

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const tables = [
      'illustrations',
      'illustration_license_options',
      'carts',
      'cart_items',
      'collections',
      'collection_items',
      'projects',
      'project_items',
      'wishlist_items',
      'subscription_plans',
      'subscription_checkout_sessions',
      'site_preferences',
      'contact_form_submissions',
      'help_articles',
      'help_categories',
      'legal_documents_cache',
      'about_page_content',
      'contact_page_content',
      'help_center_overview_cache',
      'licensing_overview_cache'
    ];

    for (const key of tables) {
      if (localStorage.getItem(key) === null) {
        // Initialize arrays by default, some keys may later store objects
        if (
          key === 'about_page_content' ||
          key === 'contact_page_content' ||
          key === 'help_center_overview_cache' ||
          key === 'licensing_overview_cache'
        ) {
          localStorage.setItem(key, JSON.stringify(null));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === '') return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === '') return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
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

  // ---------------------- Core private helpers ----------------------

  // Helper: get or create the single open cart
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find((c) => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        items: [],
        subtotal_amount: 0,
        currency: 'usd',
        total_items: 0,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    } else {
      // Ensure items array exists
      if (!Array.isArray(cart.items)) cart.items = [];
    }
    return cart;
  }

  // Helper: recalc totals for a given cart
  _recalculateCartTotals(cart) {
    let carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');

    const relatedItems = cartItems.filter((ci) => ci.cart_id === cart.id);
    const subtotal = relatedItems.reduce((sum, ci) => sum + (ci.line_total || 0), 0);

    cart.subtotal_amount = subtotal;
    cart.total_items = relatedItems.length;
    cart.updated_at = this._nowIso();
    cart.items = relatedItems.map((ci) => ci.id);

    carts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', carts);

    return cart;
  }

  // Helper: get or create single SitePreference
  _getCurrentSitePreference() {
    let prefs = this._getFromStorage('site_preferences');
    if (!Array.isArray(prefs)) prefs = [];

    let pref = prefs[0];
    if (!pref) {
      pref = {
        id: this._generateId('site_pref'),
        language: 'en',
        currency: 'usd',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      prefs.push(pref);
      this._saveToStorage('site_preferences', prefs);
    }
    return pref;
  }

  _findIllustrationById(illustrationId) {
    const illustrations = this._getFromStorage('illustrations');
    return illustrations.find((i) => i.id === illustrationId) || null;
  }

  _getLicenseOptionsForIllustration(illustrationId) {
    const options = this._getFromStorage('illustration_license_options');
    return options.filter((o) => o.illustration_id === illustrationId && o.is_available !== false);
  }

  _selectLicenseOption(illustrationId, licenseType, licenseOptionId) {
    const allOptions = this._getLicenseOptionsForIllustration(illustrationId);
    if (licenseOptionId) {
      const opt = allOptions.find((o) => o.id === licenseOptionId);
      if (!opt) return null;
      return opt;
    }
    if (licenseType) {
      // Prefer default for that type
      let opt = allOptions.find((o) => o.license_type === licenseType && o.is_default === true);
      if (!opt) opt = allOptions.find((o) => o.license_type === licenseType);
      if (opt) return opt;
    }
    // Fallback: default option
    let def = allOptions.find((o) => o.is_default === true);
    if (!def && allOptions.length > 0) def = allOptions[0];
    return def || null;
  }

  // ---------------------- Site preferences ----------------------

  getSitePreferences() {
    return this._getCurrentSitePreference();
  }

  setSiteLanguage(language) {
    if (language !== 'en' && language !== 'es') {
      throw new Error('Unsupported language');
    }
    let prefs = this._getFromStorage('site_preferences');
    if (!Array.isArray(prefs)) prefs = [];
    let pref = prefs[0];
    if (!pref) {
      pref = {
        id: this._generateId('site_pref'),
        language,
        currency: 'usd',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      prefs.push(pref);
    } else {
      pref.language = language;
      pref.updated_at = this._nowIso();
      prefs[0] = pref;
    }
    this._saveToStorage('site_preferences', prefs);
    return pref;
  }

  // ---------------------- Homepage content ----------------------

  getHomePageContent() {
    const illustrations = this._getFromStorage('illustrations');

    const themesMap = new Map();
    for (const ill of illustrations) {
      if (ill.culture_theme) {
        const theme = ill.culture_theme;
        if (!themesMap.has(theme)) {
          themesMap.set(theme, { count: 0 });
        }
        themesMap.get(theme).count += 1;
      }
    }

    const featured_themes = [];
    const seasonal_collections = [];

    for (const [theme, info] of themesMap.entries()) {
      const title = theme
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

      featured_themes.push({
        id: 'theme_' + theme,
        title,
        description: 'Explore curated illustrations for ' + title + '.',
        culture_theme: theme,
        example_query: theme.replace(/_/g, ' ') + ' illustration'
      });

      seasonal_collections.push({
        id: 'seasonal_' + theme,
        title: title + ' Collection',
        tagline: 'Handpicked ' + title + ' visuals for your projects.',
        culture_theme: theme,
        item_count_estimate: info.count
      });
    }

    return { featured_themes, seasonal_collections };
  }

  // ---------------------- Search filters metadata ----------------------

  getSearchFilterOptions() {
    const license_types = [
      {
        value: 'personal',
        label: 'Personal use',
        description: 'Non-commercial personal projects.'
      },
      {
        value: 'standard_commercial',
        label: 'Standard commercial',
        description: 'Commercial use with standard limitations.'
      },
      {
        value: 'extended_commercial',
        label: 'Extended commercial',
        description: 'Commercial use with extended rights.'
      },
      {
        value: 'free_commercial',
        label: 'Free commercial',
        description: 'Free assets usable in commercial projects.'
      }
    ];

    const file_formats = [
      { value: 'svg', label: 'SVG' },
      { value: 'png', label: 'PNG' },
      { value: 'jpg', label: 'JPG' },
      { value: 'jpeg', label: 'JPEG' },
      { value: 'ai', label: 'Adobe Illustrator (AI)' },
      { value: 'eps', label: 'EPS' },
      { value: 'vector', label: 'Vector (any)' }
    ];

    const orientations = [
      { value: 'landscape', label: 'Landscape' },
      { value: 'portrait', label: 'Portrait' },
      { value: 'square', label: 'Square' }
    ];

    const aspect_ratios = [
      { value: '16_9', label: '16:9' },
      { value: '4_3', label: '4:3' },
      { value: '1_1', label: '1:1' },
      { value: '9_16', label: '9:16' },
      { value: 'other', label: 'Other' }
    ];

    const color_palettes = [
      { value: 'warm', label: 'Warm' },
      { value: 'cool', label: 'Cool' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'monochrome', label: 'Monochrome' },
      { value: 'colorful', label: 'Colorful' }
    ];

    const main_colors = [
      'blue',
      'red',
      'yellow',
      'green',
      'orange',
      'purple',
      'pink',
      'brown',
      'black',
      'white',
      'multicolor',
      'other'
    ].map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

    const styles = [
      { value: 'flat', label: 'Flat' },
      { value: 'line_art', label: 'Line art' },
      { value: 'outline', label: 'Outline' },
      { value: 'isometric', label: 'Isometric' },
      { value: 'realistic', label: 'Realistic' },
      { value: 'watercolor', label: 'Watercolor' },
      { value: 'other', label: 'Other' }
    ];

    const size_categories = [
      { value: 'icon', label: 'Icon' },
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large_3000px_plus', label: 'Large (3000px+)' },
      { value: 'poster_a3_or_larger', label: 'Poster / A3 or larger' },
      { value: 'pattern', label: 'Pattern' },
      { value: 'other', label: 'Other' }
    ];

    const rating_steps = [0, 1, 2, 3, 4, 4.5, 5];

    const price_ranges_suggested = [
      { min_price: 0, max_price: 5, label: 'Up to $5' },
      { min_price: 0, max_price: 10, label: 'Up to $10' },
      { min_price: 0, max_price: 20, label: 'Up to $20' },
      { min_price: 0, max_price: 50, label: 'Up to $50' }
    ];

    return {
      license_types,
      file_formats,
      orientations,
      aspect_ratios,
      color_palettes,
      main_colors,
      styles,
      size_categories,
      rating_steps,
      price_ranges_suggested
    };
  }

  // ---------------------- Illustration search & detail ----------------------

  searchIllustrations(query, filters, sort, page, page_size) {
    const illustrations = this._getFromStorage('illustrations');
    const licenseOptions = this._getFromStorage('illustration_license_options');

    let results = illustrations.slice();

    const q = (query || '').trim().toLowerCase();
    if (q) {
      const tokens = q.split(/\s+/).filter((tok) => tok.length > 1);
      results = results.filter((ill) => {
        const title = (ill.title || '').toLowerCase();
        const desc = (ill.description || '').toLowerCase();
        const tagsArray = Array.isArray(ill.tags)
          ? ill.tags.map((t) => String(t).toLowerCase())
          : [];

        // First try original full-phrase match
        const phraseMatch =
          title.includes(q) ||
          desc.includes(q) ||
          tagsArray.some((t) => t.includes(q));

        if (phraseMatch) return true;

        // Fallback: match if ANY significant query token appears
        return tokens.some((token) => {
          return (
            title.includes(token) ||
            desc.includes(token) ||
            tagsArray.some((t) => t.includes(token))
          );
        });
      });
    }

    const f = filters || {};

    if (Array.isArray(f.license_types) && f.license_types.length > 0) {
      const allowed = new Set(f.license_types);
      results = results.filter((ill) => {
        const opts = licenseOptions.filter(
          (o) => o.illustration_id === ill.id && o.is_available !== false
        );
        return opts.some((o) => allowed.has(o.license_type));
      });
    }

    if (Array.isArray(f.file_formats) && f.file_formats.length > 0) {
      const allowedFormats = new Set(f.file_formats.map((ff) => ff.toLowerCase()));
      results = results.filter((ill) => {
        const formats = Array.isArray(ill.file_formats) ? ill.file_formats : [];
        return formats.some((fmt) => allowedFormats.has(String(fmt).toLowerCase()));
      });
    }

    if (f.orientation) {
      results = results.filter((ill) => ill.orientation === f.orientation);
    }

    if (f.aspect_ratio) {
      results = results.filter((ill) => ill.aspect_ratio === f.aspect_ratio);
    }

    if (f.color_palette) {
      results = results.filter((ill) => ill.color_palette === f.color_palette);
    }

    if (f.main_color) {
      results = results.filter((ill) => ill.main_color === f.main_color);
    }

    if (f.style) {
      results = results.filter((ill) => ill.style === f.style);
    }

    if (typeof f.rating_min === 'number') {
      results = results.filter((ill) =>
        typeof ill.rating === 'number' ? ill.rating >= f.rating_min : false
      );
    }

    if (f.size_category) {
      results = results.filter((ill) => ill.size_category === f.size_category);
    }

    if (typeof f.width_min === 'number') {
      results = results.filter((ill) => typeof ill.width_px === 'number' && ill.width_px >= f.width_min);
    }

    if (typeof f.width_max === 'number') {
      results = results.filter((ill) => typeof ill.width_px === 'number' && ill.width_px <= f.width_max);
    }

    if (typeof f.price_min === 'number') {
      results = results.filter(
        (ill) => typeof ill.price_standard === 'number' && ill.price_standard >= f.price_min
      );
    }

    if (typeof f.price_max === 'number') {
      results = results.filter(
        (ill) => typeof ill.price_standard === 'number' && ill.price_standard <= f.price_max
      );
    }

    if (typeof f.is_free_standard === 'boolean') {
      results = results.filter((ill) => !!ill.is_free_standard === f.is_free_standard);
    }

    if (typeof f.supports_commercial_use === 'boolean') {
      results = results.filter(
        (ill) => !!ill.supports_commercial_use === f.supports_commercial_use
      );
    }

    if (typeof f.supports_extended_commercial === 'boolean') {
      results = results.filter(
        (ill) => !!ill.supports_extended_commercial === f.supports_extended_commercial
      );
    }

    if (typeof f.is_seamless_pattern === 'boolean') {
      results = results.filter(
        (ill) =>
          (!!ill.is_seamless_pattern || !!ill.is_repeatable_pattern) ===
          f.is_seamless_pattern
      );
    }

    if (f.culture_theme) {
      results = results.filter((ill) => ill.culture_theme === f.culture_theme);
    }

    // Sorting
    const sortMode = sort || 'relevance';
    if (sortMode === 'price_low_to_high') {
      results.sort((a, b) => (a.price_standard || 0) - (b.price_standard || 0));
    } else if (sortMode === 'price_high_to_low') {
      results.sort((a, b) => (b.price_standard || 0) - (a.price_standard || 0));
    } else if (sortMode === 'rating') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortMode === 'most_downloaded') {
      results.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
    } else if (sortMode === 'newest') {
      results.sort((a, b) => {
        const da = a.created_at ? Date.parse(a.created_at) : 0;
        const db = b.created_at ? Date.parse(b.created_at) : 0;
        return db - da;
      });
    }

    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 24;
    const total_results = results.length;
    const total_pages = Math.ceil(total_results / size) || 1;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paged = results.slice(start, end);

    return {
      results: paged,
      total_results,
      page: pageNum,
      page_size: size,
      total_pages,
      applied_sort: sortMode,
      applied_filters: {
        license_types: f.license_types || [],
        file_formats: f.file_formats || [],
        orientation: f.orientation || null,
        aspect_ratio: f.aspect_ratio || null,
        color_palette: f.color_palette || null,
        main_color: f.main_color || null,
        style: f.style || null,
        rating_min: typeof f.rating_min === 'number' ? f.rating_min : null,
        size_category: f.size_category || null,
        width_min: typeof f.width_min === 'number' ? f.width_min : null,
        width_max: typeof f.width_max === 'number' ? f.width_max : null,
        price_min: typeof f.price_min === 'number' ? f.price_min : null,
        price_max: typeof f.price_max === 'number' ? f.price_max : null,
        is_free_standard: typeof f.is_free_standard === 'boolean' ? f.is_free_standard : null,
        supports_commercial_use:
          typeof f.supports_commercial_use === 'boolean' ? f.supports_commercial_use : null,
        supports_extended_commercial:
          typeof f.supports_extended_commercial === 'boolean'
            ? f.supports_extended_commercial
            : null,
        is_seamless_pattern:
          typeof f.is_seamless_pattern === 'boolean' ? f.is_seamless_pattern : null,
        culture_theme: f.culture_theme || null
      }
    };
  }

  getIllustrationDetail(illustrationId) {
    const illustration = this._findIllustrationById(illustrationId);
    if (!illustration) {
      throw new Error('Illustration not found');
    }

    const license_options = this._getLicenseOptionsForIllustration(illustrationId);
    const wishlist = this._getFromStorage('wishlist_items');
    const is_in_wishlist = wishlist.some((w) => w.illustration_id === illustrationId);

    const collections = this._getFromStorage('collections');
    const collection_items = this._getFromStorage('collection_items');
    const projects = this._getFromStorage('projects');
    const project_items = this._getFromStorage('project_items');

    const collections_containing = collection_items
      .filter((ci) => ci.illustration_id === illustrationId)
      .map((ci) => {
        const col = collections.find((c) => c.id === ci.collection_id) || null;
        return {
          collection_id: ci.collection_id,
          collection_name: col ? col.name : null
        };
      });

    const projects_containing = project_items
      .filter((pi) => pi.illustration_id === illustrationId)
      .map((pi) => {
        const proj = projects.find((p) => p.id === pi.project_id) || null;
        return {
          project_id: pi.project_id,
          project_name: proj ? proj.name : null
        };
      });

    // Instrumentation for task completion tracking (task_5)
    try {
      const ill = illustration;
      if (ill) {
        const title = (ill.title || '').toLowerCase();
        const desc = (ill.description || '').toLowerCase();
        const tagsArray = Array.isArray(ill.tags)
          ? ill.tags.map((t) => String(t).toLowerCase())
          : [];
        const combinedText = [title, desc, tagsArray.join(' ')].join(' ');
        const hasJapanese = combinedText.includes('japanese');
        const hasFood = combinedText.includes('food');

        const formats = Array.isArray(ill.file_formats)
          ? ill.file_formats.map((f) => String(f).toLowerCase())
          : [];
        const hasPng = formats.includes('png');

        const widthOk =
          (typeof ill.width_px === 'number' && ill.width_px >= 3000) ||
          ill.size_category === 'large_3000px_plus';

        const priceOk =
          typeof ill.price_standard === 'number' && ill.price_standard <= 8;

        const styleOk = ill.style === 'line_art';
        const paletteOk = ill.color_palette === 'monochrome';
        const mainColorOk =
          ill.main_color === 'black' || ill.main_color === 'white';
        const visualOk = styleOk || paletteOk || mainColorOk;

        if (hasJapanese && hasFood && hasPng && widthOk && priceOk && visualOk) {
          const meta = {
            illustration_id: ill.id,
            width_px: ill.width_px,
            price_standard: ill.price_standard,
            file_formats: ill.file_formats,
            style: ill.style,
            color_palette: ill.color_palette,
            main_color: ill.main_color,
            recorded_at: this._nowIso()
          };
          localStorage.setItem(
            'task5_previewIllustrationMeta',
            JSON.stringify(meta)
          );
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (task_5):', e);
      } catch (e2) {}
    }

    return {
      illustration,
      license_options,
      is_in_wishlist,
      collections_containing,
      projects_containing
    };
  }

  // ---------------------- Cart operations ----------------------

  addIllustrationToCart(illustrationId, licenseType, licenseOptionId, quantity) {
    const illustration = this._findIllustrationById(illustrationId);
    if (!illustration) {
      throw new Error('Illustration not found');
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const selectedOption = this._selectLicenseOption(
      illustrationId,
      licenseType,
      licenseOptionId
    );

    let effectiveLicenseType = licenseType || 'standard_commercial';
    let unit_price = illustration.price_standard || 0;
    let selectedOptionId = null;

    if (selectedOption) {
      effectiveLicenseType = selectedOption.license_type;
      unit_price = selectedOption.price;
      selectedOptionId = selectedOption.id;
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const line_total = unit_price * qty;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      illustration_id: illustrationId,
      license_option_id: selectedOptionId,
      license_type: effectiveLicenseType,
      quantity: qty,
      unit_price,
      line_total,
      added_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    this._recalculateCartTotals(cart);

    return {
      cart,
      added_item: cartItem,
      message: 'Item added to cart.'
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    // Ensure totals are up to date
    const updatedCart = this._recalculateCartTotals(cart);
    return { cart: updatedCart };
  }

  getCartDetails() {
    const cart = this._getOrCreateCart();
    const illustrations = this._getFromStorage('illustrations');
    const licenseOptions = this._getFromStorage('illustration_license_options');
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id === cart.id
    );

    const items = cartItems.map((ci) => {
      const illustration = illustrations.find((i) => i.id === ci.illustration_id) || null;
      const license_option = ci.license_option_id
        ? licenseOptions.find((lo) => lo.id === ci.license_option_id) || null
        : null;
      return {
        cart_item: ci,
        illustration,
        license_option
      };
    });

    const updatedCart = this._recalculateCartTotals(cart);

    return {
      cart: updatedCart,
      items
    };
  }

  updateCartItem(cartItemId, quantity, licenseType, licenseOptionId) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      throw new Error('Cart item not found');
    }

    let item = cartItems[idx];

    const illustration = this._findIllustrationById(item.illustration_id);
    if (!illustration) {
      throw new Error('Illustration not found for cart item');
    }

    let selectedOption = null;
    if (licenseOptionId || licenseType) {
      selectedOption = this._selectLicenseOption(
        item.illustration_id,
        licenseType,
        licenseOptionId
      );
      if (selectedOption) {
        item.license_option_id = selectedOption.id;
        item.license_type = selectedOption.license_type;
        item.unit_price = selectedOption.price;
      } else if (licenseType) {
        item.license_type = licenseType;
      }
    }

    if (typeof quantity === 'number') {
      item.quantity = quantity > 0 ? quantity : 1;
    }

    if (!selectedOption && !licenseOptionId && !licenseType && !item.unit_price) {
      item.unit_price = illustration.price_standard || 0;
    }

    item.line_total = item.unit_price * item.quantity;
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      cart: updatedCart,
      updated_item: item
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId) || null;
    if (!item) {
      // Nothing to remove, just return current cart
      const cart = this._getOrCreateCart();
      const updatedCart = this._recalculateCartTotals(cart);
      return { cart: updatedCart };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === item.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    return { cart: updatedCart };
  }

  startCartCheckout() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    const checkout_id = this._generateId('checkout');
    const status = 'awaiting_payment'; // Checkout session status, not Cart.status

    return {
      cart: updatedCart,
      checkout_id,
      status
    };
  }

  // ---------------------- Collections ----------------------

  getCollectionsOverview() {
    let collections = this._getFromStorage('collections');
    const collection_items = this._getFromStorage('collection_items');

    collections = collections.map((c) => {
      const count = collection_items.filter((ci) => ci.collection_id === c.id).length;
      return {
        ...c,
        item_count: count
      };
    });

    this._saveToStorage('collections', collections);
    return collections;
  }

  createCollection(name, description) {
    let collections = this._getFromStorage('collections');
    const collection = {
      id: this._generateId('collection'),
      name,
      description: description || '',
      item_count: 0,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);
    return collection;
  }

  renameCollection(collectionId, name) {
    let collections = this._getFromStorage('collections');
    const idx = collections.findIndex((c) => c.id === collectionId);
    if (idx === -1) {
      throw new Error('Collection not found');
    }
    const col = collections[idx];
    col.name = name;
    col.updated_at = this._nowIso();
    collections[idx] = col;
    this._saveToStorage('collections', collections);
    return col;
  }

  deleteCollection(collectionId) {
    let collections = this._getFromStorage('collections');
    let collection_items = this._getFromStorage('collection_items');

    collections = collections.filter((c) => c.id !== collectionId);
    collection_items = collection_items.filter((ci) => ci.collection_id !== collectionId);

    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', collection_items);

    return { success: true };
  }

  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const collection_items = this._getFromStorage('collection_items');
    const illustrations = this._getFromStorage('illustrations');

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      throw new Error('Collection not found');
    }

    const items = collection_items
      .filter((ci) => ci.collection_id === collectionId)
      .map((ci) => {
        const illustration = illustrations.find((i) => i.id === ci.illustration_id) || null;
        return {
          collection_item: ci,
          illustration
        };
      });

    // Update cached count
    collection.item_count = items.length;
    collection.updated_at = this._nowIso();
    const updatedCollections = collections.map((c) => (c.id === collection.id ? collection : c));
    this._saveToStorage('collections', updatedCollections);

    return {
      collection,
      items
    };
  }

  addIllustrationToCollection(collectionId, illustrationId) {
    let collection_items = this._getFromStorage('collection_items');

    // Avoid duplicates: if already exists, just return existing
    let existing = collection_items.find(
      (ci) => ci.collection_id === collectionId && ci.illustration_id === illustrationId
    );
    if (existing) {
      return existing;
    }

    const collection_item = {
      id: this._generateId('collection_item'),
      collection_id: collectionId,
      illustration_id: illustrationId,
      added_at: this._nowIso()
    };

    collection_items.push(collection_item);
    this._saveToStorage('collection_items', collection_items);

    return collection_item;
  }

  removeIllustrationFromCollection(collectionItemId) {
    let collection_items = this._getFromStorage('collection_items');
    collection_items = collection_items.filter((ci) => ci.id !== collectionItemId);
    this._saveToStorage('collection_items', collection_items);
    return { success: true };
  }

  // ---------------------- Projects ----------------------

  getProjectsOverview() {
    let projects = this._getFromStorage('projects');
    const project_items = this._getFromStorage('project_items');

    projects = projects.map((p) => {
      const count = project_items.filter((pi) => pi.project_id === p.id).length;
      return {
        ...p,
        item_count: count
      };
    });

    this._saveToStorage('projects', projects);
    return projects;
  }

  createProject(name, description) {
    let projects = this._getFromStorage('projects');
    const project = {
      id: this._generateId('project'),
      name,
      description: description || '',
      status: 'active',
      item_count: 0,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    projects.push(project);
    this._saveToStorage('projects', projects);
    return project;
  }

  renameProject(projectId, name) {
    let projects = this._getFromStorage('projects');
    const idx = projects.findIndex((p) => p.id === projectId);
    if (idx === -1) {
      throw new Error('Project not found');
    }
    const proj = projects[idx];
    proj.name = name;
    proj.updated_at = this._nowIso();
    projects[idx] = proj;
    this._saveToStorage('projects', projects);
    return proj;
  }

  archiveProject(projectId) {
    let projects = this._getFromStorage('projects');
    const idx = projects.findIndex((p) => p.id === projectId);
    if (idx === -1) {
      throw new Error('Project not found');
    }
    const proj = projects[idx];
    proj.status = 'archived';
    proj.updated_at = this._nowIso();
    projects[idx] = proj;
    this._saveToStorage('projects', projects);
    return proj;
  }

  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects');
    const project_items = this._getFromStorage('project_items');
    const illustrations = this._getFromStorage('illustrations');

    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) {
      throw new Error('Project not found');
    }

    const items = project_items
      .filter((pi) => pi.project_id === projectId)
      .map((pi) => {
        const illustration = illustrations.find((i) => i.id === pi.illustration_id) || null;
        return {
          project_item: pi,
          illustration
        };
      });

    project.item_count = items.length;
    project.updated_at = this._nowIso();
    const updatedProjects = projects.map((p) => (p.id === project.id ? project : p));
    this._saveToStorage('projects', updatedProjects);

    return {
      project,
      items
    };
  }

  addIllustrationToProject(projectId, illustrationId) {
    let project_items = this._getFromStorage('project_items');

    let existing = project_items.find(
      (pi) => pi.project_id === projectId && pi.illustration_id === illustrationId
    );
    if (existing) {
      return existing;
    }

    const project_item = {
      id: this._generateId('project_item'),
      project_id: projectId,
      illustration_id: illustrationId,
      added_at: this._nowIso()
    };

    project_items.push(project_item);
    this._saveToStorage('project_items', project_items);

    return project_item;
  }

  removeIllustrationFromProject(projectItemId) {
    let project_items = this._getFromStorage('project_items');
    project_items = project_items.filter((pi) => pi.id !== projectItemId);
    this._saveToStorage('project_items', project_items);
    return { success: true };
  }

  // ---------------------- Wishlist ----------------------

  getWishlistItems() {
    const wishlist_items = this._getFromStorage('wishlist_items');
    const illustrations = this._getFromStorage('illustrations');

    return wishlist_items.map((wi) => {
      const illustration = illustrations.find((i) => i.id === wi.illustration_id) || null;
      return {
        wishlist_item: wi,
        illustration
      };
    });
  }

  addIllustrationToWishlist(illustrationId) {
    let wishlist_items = this._getFromStorage('wishlist_items');
    let existing = wishlist_items.find((wi) => wi.illustration_id === illustrationId);
    if (existing) {
      return existing;
    }
    const wishlist_item = {
      id: this._generateId('wishlist_item'),
      illustration_id: illustrationId,
      added_at: this._nowIso()
    };
    wishlist_items.push(wishlist_item);
    this._saveToStorage('wishlist_items', wishlist_items);
    return wishlist_item;
  }

  removeIllustrationFromWishlist(illustrationId) {
    let wishlist_items = this._getFromStorage('wishlist_items');
    wishlist_items = wishlist_items.filter((wi) => wi.illustration_id !== illustrationId);
    this._saveToStorage('wishlist_items', wishlist_items);
    return { success: true };
  }

  // ---------------------- Subscription plans & checkout ----------------------

  getSubscriptionPlans(planCategory, billingCycle) {
    let plans = this._getFromStorage('subscription_plans');

    if (planCategory) {
      plans = plans.filter((p) => p.plan_category === planCategory);
    }

    plans = plans.filter((p) => p.is_active !== false);

    // billingCycle currently only affects UI context; prices are stored per field
    // We still return all fields, leaving UI to interpret

    // Sort by sort_order then by monthly_price
    plans.sort((a, b) => {
      const soA = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const soB = typeof b.sort_order === 'number' ? b.sort_order : 0;
      if (soA !== soB) return soA - soB;
      return (a.monthly_price || 0) - (b.monthly_price || 0);
    });

    return plans;
  }

  getSubscriptionPlanDetail(planId) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      throw new Error('Subscription plan not found');
    }
    return plan;
  }

  createSubscriptionCheckoutSession(planId, billingCycle) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      throw new Error('Invalid billing cycle');
    }

    let sessions = this._getFromStorage('subscription_checkout_sessions');

    const session = {
      id: this._generateId('sub_session'),
      plan_id: planId,
      billing_cycle: billingCycle,
      license_type: plan.default_license_type || 'standard_commercial',
      email: '',
      company_name: '',
      country: '',
      status: 'in_progress',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    sessions.push(session);
    this._saveToStorage('subscription_checkout_sessions', sessions);

    return {
      ...session,
      plan
    };
  }

  updateSubscriptionCheckoutSession(sessionId, licenseType, email, companyName, country) {
    let sessions = this._getFromStorage('subscription_checkout_sessions');
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) {
      throw new Error('Subscription checkout session not found');
    }

    const session = sessions[idx];

    session.license_type = licenseType;
    session.email = email;
    if (typeof companyName === 'string') {
      session.company_name = companyName;
    }
    if (typeof country === 'string') {
      session.country = country;
    }
    session.updated_at = this._nowIso();

    sessions[idx] = session;
    this._saveToStorage('subscription_checkout_sessions', sessions);

    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === session.plan_id) || null;

    return {
      ...session,
      plan
    };
  }

  proceedSubscriptionCheckoutToPayment(sessionId) {
    let sessions = this._getFromStorage('subscription_checkout_sessions');
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) {
      throw new Error('Subscription checkout session not found');
    }

    const session = sessions[idx];
    session.status = 'awaiting_payment';
    session.updated_at = this._nowIso();
    sessions[idx] = session;
    this._saveToStorage('subscription_checkout_sessions', sessions);

    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === session.plan_id) || null;

    return {
      ...session,
      plan
    };
  }

  // ---------------------- Static/Informational pages ----------------------

  getAboutPageContent() {
    // Simple static content; could be extended to be editable and stored in localStorage
    return {
      headline: 'Cultura Studio: Curated cultural illustration stock',
      mission:
        'To make culturally rich, respectful, and diverse illustrations accessible to creators everywhere.',
      cultural_focus:
        'We focus on authentic visual narratives celebrating global cultural events, traditions, and communities.',
      curation_approach:
        'Every illustration is reviewed for cultural sensitivity, accuracy, and licensing clarity before being listed.',
      diversity_commitments:
        'We prioritize working with artists from the cultures represented, and we continuously review content with community feedback.',
      contact_links: [
        {
          label: 'Email support',
          type: 'email',
          value: 'support@example.com'
        },
        {
          label: 'Artist partnerships',
          type: 'email',
          value: 'partners@example.com'
        }
      ]
    };
  }

  getContactPageContent() {
    return {
      support_email: 'support@example.com',
      partnership_email: 'partners@example.com',
      mailing_address: 'Cultura Studio, 123 Creative Ave, Imaginary City, World',
      help_center_link_label: 'Visit Help Center',
      licensing_link_label: 'Licensing & usage guidelines',
      topics: ['support', 'licensing', 'billing', 'partnership', 'feedback']
    };
  }

  submitContactForm(name, email, topic, message) {
    if (!name || !email || !message) {
      return {
        success: false,
        message: 'Name, email, and message are required.'
      };
    }

    let submissions = this._getFromStorage('contact_form_submissions');
    const submission = {
      id: this._generateId('contact_submission'),
      name,
      email,
      topic: topic || '',
      message,
      created_at: this._nowIso()
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been submitted.'
    };
  }

  getHelpCenterOverview() {
    // Minimal static help data; categories and articles are not persisted as user data
    const categories = [
      {
        id: 'getting_started',
        name: 'Getting started',
        description: 'Basics of finding and using cultural illustrations.'
      },
      {
        id: 'licensing',
        name: 'Licensing',
        description: 'Understand license types and allowed uses.'
      },
      {
        id: 'billing',
        name: 'Billing & subscriptions',
        description: 'Help with payments and subscription plans.'
      }
    ];

    const featured_articles = [
      {
        id: 'search_tips',
        title: 'Tips for finding the right cultural illustration',
        summary: 'How to use filters like style, color, and orientation to refine your search.',
        category_id: 'getting_started'
      },
      {
        id: 'license_overview',
        title: 'Overview of license types',
        summary: 'Learn the difference between personal, standard commercial, and extended commercial licenses.',
        category_id: 'licensing'
      }
    ].map((article) => ({
      ...article,
      category: categories.find((c) => c.id === article.category_id) || null
    }));

    return {
      categories,
      featured_articles
    };
  }

  getHelpArticle(articleId) {
    const overview = this.getHelpCenterOverview();
    const allArticles = overview.featured_articles;

    const article = allArticles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        id: articleId,
        title: 'Article not found',
        content: 'The requested help article could not be found.',
        category_id: '',
        category: null
      };
    }

    // Basic full content based on ID
    let content = article.summary;
    if (article.id === 'search_tips') {
      content =
        'Use keywords related to the culture or celebration (e.g., "Diwali", "Lunar New Year"). ' +
        'Refine your results with filters like style, color palette, orientation, and price. ' +
        'You can also combine cultural themes in your queries to discover more specific assets.';
    } else if (article.id === 'license_overview') {
      content =
        'Personal licenses are for non-commercial use. Standard commercial licenses cover most business uses such as social posts and presentations. ' +
        'Extended commercial licenses are intended for high-volume, resale, or extensive distribution scenarios. ' +
        'Always review the specific license terms before publishing your work.';
    }

    return {
      id: article.id,
      title: article.title,
      content,
      category_id: article.category_id,
      category: article.category
    };
  }

  getLicensingOverview() {
    const license_types = [
      {
        license_type: 'free_commercial',
        title: 'Free commercial',
        summary: 'No-cost assets that still require attribution or follow specific terms.',
        example_uses: 'Blog posts, social media, and prototypes where the asset is not sold directly.'
      },
      {
        license_type: 'personal',
        title: 'Personal',
        summary: 'For non-commercial, personal use only.',
        example_uses: 'Personal invitations, school projects, and practice designs.'
      },
      {
        license_type: 'standard_commercial',
        title: 'Standard commercial',
        summary: 'For most business use-cases with standard distribution.',
        example_uses:
          'Social media campaigns, website imagery, pitch decks, and internal company materials.'
      },
      {
        license_type: 'extended_commercial',
        title: 'Extended commercial',
        summary: 'For resale, templates, merchandise, or high-volume distribution.',
        example_uses:
          'Print-on-demand products, mass-produced packaging, or templates for resale to multiple clients.'
      }
    ];

    const cultural_guidelines =
      'We encourage respectful use of cultural imagery. Avoid reinforcing stereotypes, ' +
      'misrepresenting traditions, or using sacred symbols out of context. When in doubt, seek ' +
      'guidance from people within the culture or from our support team.';

    const terms_link_label = 'Read full terms of use';

    return {
      license_types,
      cultural_guidelines,
      terms_link_label
    };
  }

  getLegalDocument(documentType) {
    if (documentType !== 'terms_of_use' && documentType !== 'privacy_policy') {
      throw new Error('Unsupported legal document type');
    }

    if (documentType === 'terms_of_use') {
      return {
        document_type: 'terms_of_use',
        title: 'Terms of Use',
        content:
          'These Terms of Use govern your access to and use of the cultural illustration stock website. ' +
          'By accessing or using the service, you agree to be bound by these terms, including any ' +
          'license-specific conditions that apply to purchased or downloaded illustrations.',
        last_updated: '2024-01-01'
      };
    }

    return {
      document_type: 'privacy_policy',
      title: 'Privacy Policy',
      content:
        'This Privacy Policy explains how we collect, use, and protect your personal information when ' +
        'you browse, purchase, or subscribe to our services. We only collect data necessary to provide ' +
        'and improve the service, and we do not sell your personal data.',
      last_updated: '2024-01-01'
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