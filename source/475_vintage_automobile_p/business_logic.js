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
    this.idCounter = this._getNextIdCounter();
  }

  // --------------------- Storage Helpers ---------------------

  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core tables based on storage_key definitions
    ensure('photos', []);
    ensure('products', []);
    ensure('cart', null); // single cart object or null
    ensure('cart_items', []);
    ensure('orders', []);
    ensure('order_items', []);
    ensure('collections', []);
    ensure('collection_items', []);
    ensure('slideshows', []);
    ensure('slideshow_items', []);
    ensure('favorites', []);
    ensure('viewing_preferences', null); // single object or null
    ensure('contact_messages', []);

    // Generic id counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data !== null ? JSON.parse(data) : defaultValue;
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

  // --------------------- Cart Helpers ---------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    // Treat missing, null, non-object, or legacy array cart values as empty
    if (!cart || typeof cart !== 'object' || Array.isArray(cart) || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem ids
        shipping_method: null,
        shipping_cost: 0,
        subtotal: 0,
        total: 0,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _getShippingOptionsForCart(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    let hasPhysical = false;
    let hasDigital = false;

    for (const ci of itemsForCart) {
      const product = products.find(p => p.id === ci.productId);
      if (!product) continue;
      if (product.product_type === 'digital_download') {
        hasDigital = true;
      } else {
        hasPhysical = true;
      }
    }

    const options = [];

    if (hasPhysical) {
      options.push(
        { method: 'standard', label: 'Standard Shipping', cost: 5, estimated_days: 7 },
        { method: 'expedited', label: 'Expedited Shipping', cost: 15, estimated_days: 3 },
        { method: 'overnight', label: 'Overnight Shipping', cost: 25, estimated_days: 1 }
      );
    }

    if (!hasPhysical && hasDigital) {
      options.push({ method: 'digital_only', label: 'Digital Delivery', cost: 0, estimated_days: 0 });
    }

    if (!hasPhysical && !hasDigital) {
      // Empty cart
      return [];
    }

    return options;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);

    let subtotal = 0;
    for (const ci of itemsForCart) {
      subtotal += ci.line_total || 0;
    }
    cart.subtotal = subtotal;

    const shippingOptions = this._getShippingOptionsForCart(cart);

    if (!shippingOptions.length) {
      cart.shipping_method = null;
      cart.shipping_cost = 0;
      cart.total = subtotal;
    } else {
      // Ensure selected shipping method is valid
      let currentOption = shippingOptions.find(o => o.method === cart.shipping_method);
      if (!currentOption) {
        // Default to standard if available, otherwise first option
        currentOption = shippingOptions.find(o => o.method === 'standard') || shippingOptions[0];
      }
      cart.shipping_method = currentOption.method;
      cart.shipping_cost = currentOption.cost;
      cart.total = subtotal + currentOption.cost;
    }

    cart.updatedAt = this._now();
    this._saveToStorage('cart', cart);
    return cart;
  }

  // --------------------- Search Helpers ---------------------

  _applyPhotoSearchFilters(photos, filters = {}) {
    const products = this._getFromStorage('products', []);
    const {
      decade_labels,
      year_min,
      year_max,
      color_categories,
      makes,
      models,
      body_styles,
      countries_of_origin,
      location_names,
      orientations,
      min_width_px,
      min_height_px,
      rating_min,
      starting_price_min,
      starting_price_max,
      standard_print_price_max,
      product_types
    } = filters || {};

    const productByPhoto = {};
    if (starting_price_min != null || starting_price_max != null || standard_print_price_max != null || (product_types && product_types.length)) {
      for (const p of products) {
        if (!p.available) continue;
        if (!productByPhoto[p.photoId]) {
          productByPhoto[p.photoId] = [];
        }
        productByPhoto[p.photoId].push(p);
      }
    }

    return photos.filter(photo => {
      if (photo.is_active === false) return false;

      if (decade_labels && decade_labels.length && !decade_labels.includes(photo.decade_label)) return false;

      if (year_min != null && photo.year < year_min) return false;
      if (year_max != null && photo.year > year_max) return false;

      if (color_categories && color_categories.length && !color_categories.includes(photo.color_category)) return false;

      if (makes && makes.length && !makes.includes(photo.make)) return false;

      if (models && models.length) {
        const model = (photo.model || '').toLowerCase();
        const match = models.some(m => model === String(m).toLowerCase());
        if (!match) return false;
      }

      if (body_styles && body_styles.length && !body_styles.includes(photo.body_style)) return false;

      if (countries_of_origin && countries_of_origin.length && !countries_of_origin.includes(photo.country_of_origin)) return false;

      if (location_names && location_names.length) {
        const loc = (photo.location_name || '').toLowerCase();
        const match = location_names.some(l => loc === String(l).toLowerCase());
        if (!match) return false;
      }

      if (orientations && orientations.length && !orientations.includes(photo.orientation)) return false;

      if (min_width_px != null && photo.width_px < min_width_px) return false;
      if (min_height_px != null && photo.height_px < min_height_px) return false;

      if (rating_min != null) {
        if (photo.rating_average == null || photo.rating_average < rating_min) return false;
      }

      const relatedProducts = productByPhoto[photo.id] || [];

      if (starting_price_min != null || starting_price_max != null) {
        const startingPrice = photo.starting_price != null
          ? photo.starting_price
          : (relatedProducts.length ? Math.min.apply(null, relatedProducts.map(p => p.price)) : null);

        if (starting_price_min != null && (startingPrice == null || startingPrice < starting_price_min)) return false;
        if (starting_price_max != null && (startingPrice == null || startingPrice > starting_price_max)) return false;
      }

      if (standard_print_price_max != null) {
        const std = relatedProducts.find(p => p.is_default && p.product_type === 'standard_print');
        if (!std || std.price > standard_print_price_max) return false;
      }

      if (product_types && product_types.length) {
        const hasType = relatedProducts.some(p => product_types.includes(p.product_type));
        if (!hasType) return false;
      }

      return true;
    });
  }

  _applyProductSearchFilters(productWrappers, filters = {}) {
    const {
      product_types,
      decade_labels,
      year_min,
      year_max,
      color_categories,
      makes,
      countries_of_origin,
      body_styles,
      price_min,
      price_max
    } = filters || {};

    return productWrappers.filter(({ product, photo }) => {
      if (!product.available) return false;

      if (product_types && product_types.length && !product_types.includes(product.product_type)) return false;

      if (decade_labels && decade_labels.length && (!photo || !decade_labels.includes(photo.decade_label))) return false;

      if (year_min != null && (!photo || photo.year < year_min)) return false;
      if (year_max != null && (!photo || photo.year > year_max)) return false;

      if (color_categories && color_categories.length && (!photo || !color_categories.includes(photo.color_category))) return false;

      if (makes && makes.length && (!photo || !makes.includes(photo.make))) return false;

      if (countries_of_origin && countries_of_origin.length && (!photo || !countries_of_origin.includes(photo.country_of_origin))) return false;

      if (body_styles && body_styles.length && (!photo || !body_styles.includes(photo.body_style))) return false;

      if (price_min != null && product.price < price_min) return false;
      if (price_max != null && product.price > price_max) return false;

      return true;
    });
  }

  // --------------------- Collection / Slideshow Helpers ---------------------

  _updateCollectionPhotoCount(collectionId) {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return;

    const itemsForCollection = items.filter(it => it.collectionId === collectionId);
    collection.photo_count = itemsForCollection.length;

    if (itemsForCollection.length && !collection.cover_photo_id) {
      collection.cover_photo_id = itemsForCollection[0].photoId;
    } else if (!itemsForCollection.length) {
      collection.cover_photo_id = null;
    }

    collection.updatedAt = this._now();
    this._saveToStorage('collections', collections);
  }

  _updateSlideshowSlideCount(slideshowId) {
    const slideshows = this._getFromStorage('slideshows', []);
    const items = this._getFromStorage('slideshow_items', []);
    const slideshow = slideshows.find(s => s.id === slideshowId);
    if (!slideshow) return;

    const itemsForShow = items.filter(it => it.slideshowId === slideshowId);
    slideshow.slide_count = itemsForShow.length;
    slideshow.updatedAt = this._now();
    this._saveToStorage('slideshows', slideshows);
  }

  _getDefaultViewingPreferences() {
    let prefs = this._getFromStorage('viewing_preferences', null);

    // If an array of preference records is stored (seed data), pick the most recent one
    if (Array.isArray(prefs)) {
      prefs = prefs
        .slice()
        .sort((a, b) => (b.last_updated || '').localeCompare(a.last_updated || ''))[0] || null;
    }

    // If nothing usable is found, create sensible defaults
    if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) {
      prefs = {
        id: this._generateId('vp'),
        default_decade_ranges: [],
        default_theme: 'light',
        thumbnails_per_page: 30,
        default_sort_order: 'relevance',
        last_updated: this._now()
      };
    }

    this._saveToStorage('viewing_preferences', prefs);
    return prefs;
  }

  // --------------------- Interface Implementations ---------------------

  // getHomeContent()
  getHomeContent() {
    const photos = this._getFromStorage('photos', []);
    const collections = this._getFromStorage('collections', []);

    const activePhotos = photos.filter(p => p.is_active !== false);

    const decadeMap = {};
    for (const p of activePhotos) {
      if (!p.decade_label) continue;
      if (!decadeMap[p.decade_label]) {
        decadeMap[p.decade_label] = { decade_label: p.decade_label, photo_count: 0, sample_photo: p };
      }
      decadeMap[p.decade_label].photo_count += 1;
      const group = decadeMap[p.decade_label];
      if ((p.popularity_score || 0) > (group.sample_photo.popularity_score || 0)) {
        group.sample_photo = p;
      }
    }

    const featured_decades = Object.values(decadeMap).sort((a, b) => a.decade_label.localeCompare(b.decade_label));

    const makeMap = {};
    for (const p of activePhotos) {
      if (!p.make) continue;
      if (!makeMap[p.make]) {
        makeMap[p.make] = { make: p.make, photo_count: 0, sample_photo: p };
      }
      makeMap[p.make].photo_count += 1;
      const group = makeMap[p.make];
      if ((p.popularity_score || 0) > (group.sample_photo.popularity_score || 0)) {
        group.sample_photo = p;
      }
    }

    const featured_makes = Object.values(makeMap).sort((a, b) => b.photo_count - a.photo_count).slice(0, 10);

    const featured_collections = collections
      .filter(c => c.visibility === 'public')
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      .slice(0, 10);

    const featured_photos = activePhotos
      .slice()
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .slice(0, 20);

    return {
      featured_decades,
      featured_makes,
      featured_collections,
      featured_photos
    };
  }

  // searchPhotos(query, filters, sort_order, page, page_size)
  searchPhotos(query, filters, sort_order, page = 1, page_size = 30) {
    const photos = this._getFromStorage('photos', []);

    const q = (query || '').trim().toLowerCase();

    let filtered = photos.filter(p => p.is_active !== false);

    if (q) {
      filtered = filtered.filter(photo => {
        const inTitle = (photo.title || '').toLowerCase().includes(q);
        const inDescription = (photo.description || '').toLowerCase().includes(q);
        const tags = Array.isArray(photo.tags) ? photo.tags : [];
        const inTags = tags.some(t => String(t).toLowerCase().includes(q));
        return inTitle || inDescription || inTags;
      });
    }

    filtered = this._applyPhotoSearchFilters(filtered, filters || {});

    const order = sort_order || 'relevance';

    const getStartingPrice = (photo) => {
      if (photo.starting_price != null) return photo.starting_price;
      const products = this._getFromStorage('products', []);
      const related = products.filter(p => p.photoId === photo.id && p.available);
      if (!related.length) return Number.POSITIVE_INFINITY;
      return Math.min.apply(null, related.map(p => p.price));
    };

    const byPopularity = (a, b) => (b.popularity_score || 0) - (a.popularity_score || 0);

    switch (order) {
      case 'most_popular':
        filtered.sort(byPopularity);
        break;
      case 'price_low_to_high':
        filtered.sort((a, b) => getStartingPrice(a) - getStartingPrice(b));
        break;
      case 'price_high_to_low':
        filtered.sort((a, b) => getStartingPrice(b) - getStartingPrice(a));
        break;
      case 'newest':
      case 'year_desc':
        filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
      case 'year_asc':
        filtered.sort((a, b) => (a.year || 0) - (b.year || 0));
        break;
      case 'relevance':
      default:
        filtered.sort(byPopularity);
        break;
    }

    const total = filtered.length;
    const start = (page - 1) * page_size;
    const results = filtered.slice(start, start + page_size);

    const applied_filters = Object.assign({
      decade_labels: [],
      year_min: undefined,
      year_max: undefined,
      color_categories: [],
      makes: [],
      body_styles: [],
      countries_of_origin: [],
      location_names: [],
      orientations: [],
      min_width_px: undefined,
      min_height_px: undefined,
      rating_min: undefined,
      starting_price_min: undefined,
      starting_price_max: undefined,
      standard_print_price_max: undefined,
      product_types: []
    }, filters || {});

    return {
      results,
      total,
      page,
      page_size,
      sort_order: order,
      applied_filters
    };
  }

  // getGalleryFilterOptions()
  getGalleryFilterOptions() {
    const photos = this._getFromStorage('photos', []);
    const active = photos.filter(p => p.is_active !== false);

    const uniq = (arr) => Array.from(new Set(arr.filter(v => v != null)));

    const decade_labels = uniq(active.map(p => p.decade_label)).sort();
    const makes = uniq(active.map(p => p.make)).sort();
    const body_styles = uniq(active.map(p => p.body_style)).sort();
    const countries_of_origin = uniq(active.map(p => p.country_of_origin)).sort();
    const location_names = uniq(active.map(p => p.location_name)).sort();

    const color_categories = [
      'red',
      'blue',
      'green',
      'yellow',
      'black',
      'white',
      'silver',
      'orange',
      'brown',
      'black_white',
      'other'
    ];

    const orientations = ['landscape', 'portrait', 'square', 'panorama'];

    const rating_thresholds = [1, 2, 3, 4, 5];

    const resolution_presets = [
      { label: 'HD (1920x1080)', min_width_px: 1920, min_height_px: 1080 },
      { label: '2K (2560x1440)', min_width_px: 2560, min_height_px: 1440 },
      { label: '4K (3840x2160)', min_width_px: 3840, min_height_px: 2160 }
    ];

    const price_ranges = [
      { label: 'Under $25', min: 0, max: 25 },
      { label: '$25 - $50', min: 25, max: 50 },
      { label: '$50 - $100', min: 50, max: 100 },
      { label: '$100+', min: 100, max: Number.POSITIVE_INFINITY }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'newest', label: 'Newest' },
      { value: 'year_asc', label: 'Year Ascending' },
      { value: 'year_desc', label: 'Year Descending' }
    ];

    return {
      decade_labels,
      makes,
      body_styles,
      countries_of_origin,
      location_names,
      color_categories,
      orientations,
      rating_thresholds,
      resolution_presets,
      price_ranges,
      sort_options
    };
  }

  // getPhotoDetail(photoId)
  getPhotoDetail(photoId) {
    const photos = this._getFromStorage('photos', []);
    const products = this._getFromStorage('products', []);
    const favorites = this._getFromStorage('favorites', []);

    const photo = photos.find(p => p.id === photoId) || null;
    if (!photo) {
      return {
        photo: null,
        products: [],
        is_favorited: false,
        related_photos: []
      };
    }

    const relatedProducts = products
      .filter(p => p.photoId === photoId && p.available)
      .map(p => {
        const clone = Object.assign({}, p);
        clone.photo = photo; // foreign key resolution
        return clone;
      });

    const is_favorited = favorites.some(f => f.photoId === photoId);

    const related_photos = photos
      .filter(p => p.id !== photoId && p.is_active !== false && (p.make === photo.make || p.decade_label === photo.decade_label))
      .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
      .slice(0, 12);

    return {
      photo,
      products: relatedProducts,
      is_favorited,
      related_photos
    };
  }

  // addFavorite(photoId)
  addFavorite(photoId) {
    const photos = this._getFromStorage('photos', []);
    const favorites = this._getFromStorage('favorites', []);

    const photoExists = photos.some(p => p.id === photoId);
    if (!photoExists) {
      return { success: false, favorite: null, message: 'Photo not found' };
    }

    const existing = favorites.find(f => f.photoId === photoId);
    if (existing) {
      return { success: true, favorite: existing, message: 'Already favorited' };
    }

    const favorite = {
      id: this._generateId('fav'),
      photoId,
      addedAt: this._now()
    };
    favorites.push(favorite);
    this._saveToStorage('favorites', favorites);

    return { success: true, favorite, message: 'Added to favorites' };
  }

  // removeFavorite(photoId)
  removeFavorite(photoId) {
    const favorites = this._getFromStorage('favorites', []);
    const beforeLen = favorites.length;
    const remaining = favorites.filter(f => f.photoId !== photoId);
    const removed = beforeLen !== remaining.length;
    this._saveToStorage('favorites', remaining);
    return {
      success: true,
      removed,
      message: removed ? 'Removed from favorites' : 'Favorite not found'
    };
  }

  // getFavorites(filters, sort_order, page, page_size)
  getFavorites(filters, sort_order, page = 1, page_size = 30) {
    const favorites = this._getFromStorage('favorites', []);
    const photos = this._getFromStorage('photos', []);

    const filterObj = filters || {};
    const { decade_labels, makes, countries_of_origin, body_styles } = filterObj;

    let entries = favorites.map(fav => {
      const photo = photos.find(p => p.id === fav.photoId) || null;
      const favorite = Object.assign({}, fav);
      favorite.photo = photo; // foreign key resolution
      return { favorite, photo };
    }).filter(entry => entry.photo);

    if (decade_labels && decade_labels.length) {
      entries = entries.filter(e => decade_labels.includes(e.photo.decade_label));
    }
    if (makes && makes.length) {
      entries = entries.filter(e => makes.includes(e.photo.make));
    }
    if (countries_of_origin && countries_of_origin.length) {
      entries = entries.filter(e => countries_of_origin.includes(e.photo.country_of_origin));
    }
    if (body_styles && body_styles.length) {
      entries = entries.filter(e => body_styles.includes(e.photo.body_style));
    }

    const order = sort_order || 'date_added_desc';
    switch (order) {
      case 'decade_asc':
        entries.sort((a, b) => (a.photo.decade_label || '').localeCompare(b.photo.decade_label || ''));
        break;
      case 'make_asc':
        entries.sort((a, b) => (a.photo.make || '').localeCompare(b.photo.make || ''));
        break;
      case 'date_added_desc':
      default:
        entries.sort((a, b) => (b.favorite.addedAt || '').localeCompare(a.favorite.addedAt || ''));
        break;
    }

    const total = entries.length;
    const start = (page - 1) * page_size;
    const results = entries.slice(start, start + page_size);

    return {
      results,
      total,
      page,
      page_size
    };
  }

  // searchPrintProducts(query, filters, sort_order, page, page_size)
  searchPrintProducts(query, filters, sort_order, page = 1, page_size = 30) {
    const products = this._getFromStorage('products', []);
    const photos = this._getFromStorage('photos', []);

    const q = (query || '').trim().toLowerCase();

    let wrappers = products.map(product => {
      const photo = photos.find(p => p.id === product.photoId) || null;
      return { product, photo };
    });

    if (q) {
      wrappers = wrappers.filter(({ photo }) => {
        if (!photo) return false;
        const inTitle = (photo.title || '').toLowerCase().includes(q);
        const inDescription = (photo.description || '').toLowerCase().includes(q);
        const tags = Array.isArray(photo.tags) ? photo.tags : [];
        const inTags = tags.some(t => String(t).toLowerCase().includes(q));
        return inTitle || inDescription || inTags;
      });
    }

    wrappers = this._applyProductSearchFilters(wrappers, filters || {});

    const order = sort_order || 'price_low_to_high';
    switch (order) {
      case 'price_high_to_low':
        wrappers.sort((a, b) => b.product.price - a.product.price);
        break;
      case 'most_popular':
        wrappers.sort((a, b) => (b.photo && b.photo.popularity_score || 0) - (a.photo && a.photo.popularity_score || 0));
        break;
      case 'newest':
        wrappers.sort((a, b) => (b.photo && b.photo.year || 0) - (a.photo && a.photo.year || 0));
        break;
      case 'price_low_to_high':
      default:
        wrappers.sort((a, b) => a.product.price - b.product.price);
        break;
    }

    const total = wrappers.length;
    const start = (page - 1) * page_size;
    const pageResults = wrappers.slice(start, start + page_size).map(({ product, photo }) => {
      const pClone = Object.assign({}, product);
      pClone.photo = photo; // foreign key resolution
      return { product: pClone, photo };
    });

    return {
      results: pageResults,
      total,
      page,
      page_size
    };
  }

  // getPrintFilterOptions()
  getPrintFilterOptions() {
    const products = this._getFromStorage('products', []);
    const photos = this._getFromStorage('photos', []);

    const activeProducts = products.filter(p => p.available);

    const uniq = (arr) => Array.from(new Set(arr.filter(v => v != null)));

    const product_types = [
      { value: 'standard_print', label: 'Standard Print' },
      { value: 'postcard', label: 'Postcard' },
      { value: 'poster', label: 'Poster' },
      { value: 'digital_download', label: 'Digital Download' }
    ];

    const relatedPhotos = (field) => {
      return uniq(activeProducts.map(p => {
        const photo = photos.find(ph => ph.id === p.photoId);
        return photo ? photo[field] : null;
      })).sort();
    };

    const decade_labels = relatedPhotos('decade_label');
    const makes = relatedPhotos('make');
    const countries_of_origin = relatedPhotos('country_of_origin');
    const body_styles = relatedPhotos('body_style');

    const color_categories = [
      'red',
      'blue',
      'green',
      'yellow',
      'black',
      'white',
      'silver',
      'orange',
      'brown',
      'black_white',
      'other'
    ];

    const price_ranges = [
      { label: 'Under $10', min: 0, max: 10 },
      { label: '$10 - $25', min: 10, max: 25 },
      { label: '$25 - $50', min: 25, max: 50 },
      { label: '$50+', min: 50, max: Number.POSITIVE_INFINITY }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      product_types,
      decade_labels,
      makes,
      countries_of_origin,
      body_styles,
      color_categories,
      price_ranges,
      sort_options
    };
  }

  // addToCart(productId, quantity)
  addToCart(productId, quantity = 1) {
    if (quantity <= 0) {
      return { success: false, cart_id: null, cart_item_count: 0, cart_subtotal: 0, message: 'Quantity must be positive' };
    }

    const products = this._getFromStorage('products', []);
    const cartItems = this._getFromStorage('cart_items', []);

    const product = products.find(p => p.id === productId);
    if (!product || !product.available) {
      return { success: false, cart_id: null, cart_item_count: 0, cart_subtotal: 0, message: 'Product not available' };
    }

    const cart = this._getOrCreateCart();

    let cartItem = cartItems.find(ci => ci.cartId === cart.id && ci.productId === productId);
    if (cartItem) {
      cartItem.quantity += quantity;
      cartItem.line_total = cartItem.quantity * cartItem.unit_price;
    } else {
      cartItem = {
        id: this._generateId('ci'),
        cartId: cart.id,
        productId: productId,
        photoId: product.photoId || null,
        quantity: quantity,
        unit_price: product.price,
        line_total: product.price * quantity,
        product_type_snapshot: product.product_type,
        addedAt: this._now()
      };
      cartItems.push(cartItem);
    }

    // Update cart items ids list (optional)
    const itemIdsForCart = cartItems.filter(ci => ci.cartId === cart.id).map(ci => ci.id);
    cart.items = itemIdsForCart;

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const updatedItems = cartItems.filter(ci => ci.cartId === cart.id);
    const cart_item_count = updatedItems.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      success: true,
      cart_id: cart.id,
      cart_item_count,
      cart_subtotal: cart.subtotal,
      message: 'Added to cart'
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const photos = this._getFromStorage('photos', []);

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);

    const items = itemsForCart.map(ci => {
      const product = products.find(p => p.id === ci.productId) || null;
      const photo = photos.find(p => p.id === (ci.photoId || (product && product.photoId))) || null;

      const cartSummary = {
        id: cart.id,
        shipping_method: cart.shipping_method,
        shipping_cost: cart.shipping_cost,
        subtotal: cart.subtotal,
        total: cart.total
      };

      const cart_item = Object.assign({}, ci);
      cart_item.product = product;
      cart_item.photo = photo;
      cart_item.cart = cartSummary;

      return { cart_item, product, photo };
    });

    const shippingOptions = this._getShippingOptionsForCart(cart);

    return {
      cart: {
        id: cart.id,
        items,
        shipping_method: cart.shipping_method,
        shipping_cost: cart.shipping_cost,
        subtotal: cart.subtotal,
        total: cart.total
      },
      available_shipping_methods: shippingOptions
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const cart = this._getOrCreateCart();

    const ci = cartItems.find(item => item.id === cartItemId && item.cartId === cart.id);
    if (!ci) {
      return { success: false, cart: { id: cart.id, subtotal: cart.subtotal, total: cart.total }, message: 'Cart item not found' };
    }

    if (quantity <= 0) {
      // Remove item
      const remaining = cartItems.filter(item => item.id !== cartItemId);
      this._saveToStorage('cart_items', remaining);
    } else {
      ci.quantity = quantity;
      const product = products.find(p => p.id === ci.productId);
      ci.unit_price = product ? product.price : ci.unit_price;
      ci.line_total = ci.unit_price * quantity;
      this._saveToStorage('cart_items', cartItems);
    }

    this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: {
        id: cart.id,
        subtotal: cart.subtotal,
        total: cart.total
      },
      message: 'Cart updated'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();

    const remaining = cartItems.filter(item => !(item.id === cartItemId && item.cartId === cart.id));
    const removed = remaining.length !== cartItems.length;
    this._saveToStorage('cart_items', remaining);

    this._recalculateCartTotals(cart);

    const itemsForCart = remaining.filter(ci => ci.cartId === cart.id);
    const cart_item_count = itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      success: true,
      cart_item_count,
      subtotal: cart.subtotal,
      total: cart.total,
      message: removed ? 'Item removed' : 'Item not found'
    };
  }

  // setCartShippingMethod(shipping_method)
  setCartShippingMethod(shipping_method) {
    const cart = this._getOrCreateCart();
    const shippingOptions = this._getShippingOptionsForCart(cart);
    const option = shippingOptions.find(o => o.method === shipping_method);

    if (!option) {
      return {
        success: false,
        cart: {
          id: cart.id,
          shipping_method: cart.shipping_method,
          shipping_cost: cart.shipping_cost,
          subtotal: cart.subtotal,
          total: cart.total
        },
        message: 'Invalid shipping method for current cart'
      };
    }

    cart.shipping_method = option.method;
    cart.shipping_cost = option.cost;
    cart.total = cart.subtotal + option.cost;
    cart.updatedAt = this._now();
    this._saveToStorage('cart', cart);

    return {
      success: true,
      cart: {
        id: cart.id,
        shipping_method: cart.shipping_method,
        shipping_cost: cart.shipping_cost,
        subtotal: cart.subtotal,
        total: cart.total
      },
      message: 'Shipping method updated'
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cartData = this.getCart();
    const cart = cartData.cart;
    const shippingOptions = cartData.available_shipping_methods;

    const validation_errors = [];
    let can_place_order = true;

    const hasItems = (cart.items || []).length > 0;
    if (!hasItems) {
      validation_errors.push('Cart is empty');
      can_place_order = false;
    }

    if (hasItems && !cart.shipping_method) {
      validation_errors.push('Shipping method not selected');
      can_place_order = false;
    }

    return {
      cart,
      available_shipping_methods: shippingOptions,
      can_place_order,
      validation_errors
    };
  }

  // placeOrder(shipping_details, payment_method)
  placeOrder(shipping_details, payment_method) {
    const summary = this.getCheckoutSummary();
    const cart = this._getOrCreateCart();

    if (!summary.can_place_order) {
      return { success: false, order: null, message: summary.validation_errors.join('; ') };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const now = this._now();

    const orderId = this._generateId('order');
    const orderItemsForCart = cartItems.filter(ci => ci.cartId === cart.id);

    const newOrderItems = [];
    for (const ci of orderItemsForCart) {
      const product = products.find(p => p.id === ci.productId) || {};
      const orderItem = {
        id: this._generateId('oi'),
        orderId: orderId,
        productId: ci.productId,
        photoId: ci.photoId || product.photoId || null,
        product_name_snapshot: product.name || '',
        product_type_snapshot: product.product_type || ci.product_type_snapshot,
        size_label_snapshot: product.size_label || null,
        license_type_snapshot: product.license_type || null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total
      };
      newOrderItems.push(orderItem);
      orderItems.push(orderItem);
    }

    const order_number = 'ORD-' + Date.now();

    const order = {
      id: orderId,
      order_number,
      source_cart_id: cart.id,
      items: newOrderItems.map(oi => oi.id),
      status: 'paid',
      shipping_method: cart.shipping_method,
      shipping_cost: cart.shipping_cost,
      subtotal: cart.subtotal,
      total: cart.total,
      shipping_name: shipping_details && shipping_details.shipping_name || null,
      shipping_address_line1: shipping_details && shipping_details.shipping_address_line1 || null,
      shipping_address_line2: shipping_details && shipping_details.shipping_address_line2 || null,
      shipping_city: shipping_details && shipping_details.shipping_city || null,
      shipping_state: shipping_details && shipping_details.shipping_state || null,
      shipping_postal_code: shipping_details && shipping_details.shipping_postal_code || null,
      shipping_country: shipping_details && shipping_details.shipping_country || null,
      payment_method: payment_method,
      createdAt: now,
      placedAt: now
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart
    const remainingCartItems = cartItems.filter(ci => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);
    const emptyCart = {
      id: this._generateId('cart'),
      items: [],
      shipping_method: null,
      shipping_cost: 0,
      subtotal: 0,
      total: 0,
      createdAt: now,
      updatedAt: now
    };
    this._saveToStorage('cart', emptyCart);

    return { success: true, order, message: 'Order placed' };
  }

  // getCollections()
  getCollections() {
    return this._getFromStorage('collections', []);
  }

  // createCollection(name, visibility, description)
  createCollection(name, visibility, description) {
    const collections = this._getFromStorage('collections', []);
    const now = this._now();
    const collection = {
      id: this._generateId('col'),
      name,
      description: description || null,
      visibility,
      cover_photo_id: null,
      photo_count: 0,
      createdAt: now,
      updatedAt: now
    };

    collections.push(collection);
    this._saveToStorage('collections', collections);

    return { collection };
  }

  // updateCollection(collectionId, name, visibility, description)
  updateCollection(collectionId, name, visibility, description) {
    const collections = this._getFromStorage('collections', []);
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) {
      return { collection: null };
    }

    if (typeof name === 'string') collection.name = name;
    if (typeof visibility === 'string') collection.visibility = visibility;
    if (typeof description === 'string') collection.description = description;
    collection.updatedAt = this._now();

    this._saveToStorage('collections', collections);
    return { collection };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);

    const remainingCollections = collections.filter(c => c.id !== collectionId);
    const remainingItems = items.filter(it => it.collectionId !== collectionId);

    const existed = remainingCollections.length !== collections.length;
    this._saveToStorage('collections', remainingCollections);
    this._saveToStorage('collection_items', remainingItems);

    return {
      success: existed,
      message: existed ? 'Collection deleted' : 'Collection not found'
    };
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);
    const photos = this._getFromStorage('photos', []);

    const collection = collections.find(c => c.id === collectionId) || null;
    if (!collection) {
      return { collection: null, items: [] };
    }

    const collectionItems = items
      .filter(it => it.collectionId === collectionId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const enrichedItems = collectionItems.map(it => {
      const photo = photos.find(p => p.id === it.photoId) || null;
      const colSummary = {
        id: collection.id,
        name: collection.name,
        visibility: collection.visibility
      };
      const collection_item = Object.assign({}, it);
      collection_item.collection = colSummary;
      collection_item.photo = photo;
      return { collection_item, photo };
    });

    return {
      collection,
      items: enrichedItems
    };
  }

  // addPhotosToCollection(collectionId, photoIds)
  addPhotosToCollection(collectionId, photoIds) {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);

    const collection = collections.find(c => c.id === collectionId);
    if (!collection) {
      return { collection: null, added_items: [] };
    }

    const existing = items.filter(it => it.collectionId === collectionId);
    const existingPhotoIds = new Set(existing.map(it => it.photoId));
    let maxOrder = existing.reduce((max, it) => Math.max(max, it.order_index || 0), 0);

    const added_items = [];
    for (const pid of photoIds || []) {
      if (existingPhotoIds.has(pid)) continue;
      maxOrder += 1;
      const item = {
        id: this._generateId('coli'),
        collectionId,
        photoId: pid,
        order_index: maxOrder,
        addedAt: this._now()
      };
      items.push(item);
      added_items.push(item);
    }

    this._saveToStorage('collection_items', items);
    this._updateCollectionPhotoCount(collectionId);

    return {
      collection,
      added_items
    };
  }

  // removePhotoFromCollection(collectionItemId)
  removePhotoFromCollection(collectionItemId) {
    const items = this._getFromStorage('collection_items', []);
    const item = items.find(it => it.id === collectionItemId);
    const remaining = items.filter(it => it.id !== collectionItemId);
    this._saveToStorage('collection_items', remaining);

    if (item) {
      this._updateCollectionPhotoCount(item.collectionId);
    }

    return {
      success: !!item,
      message: item ? 'Removed from collection' : 'Item not found'
    };
  }

  // reorderCollectionItems(collectionId, ordered_item_ids)
  reorderCollectionItems(collectionId, ordered_item_ids) {
    const items = this._getFromStorage('collection_items', []);
    const collections = this._getFromStorage('collections', []);
    const collection = collections.find(c => c.id === collectionId) || null;

    if (!collection) {
      return { collection: null, items: [] };
    }

    const idToItem = {};
    for (const it of items) {
      if (it.collectionId === collectionId) {
        idToItem[it.id] = it;
      }
    }

    ordered_item_ids.forEach((id, index) => {
      const it = idToItem[id];
      if (it) {
        it.order_index = index;
      }
    });

    this._saveToStorage('collection_items', items);
    this._updateCollectionPhotoCount(collectionId);

    const updatedItems = items.filter(it => it.collectionId === collectionId);

    return {
      collection,
      items: updatedItems
    };
  }

  // getSlideshows()
  getSlideshows() {
    return this._getFromStorage('slideshows', []);
  }

  // createSlideshow(name, description, auto_play, transition_duration_sec, loop)
  createSlideshow(name, description, auto_play, transition_duration_sec, loop) {
    const slideshows = this._getFromStorage('slideshows', []);
    const now = this._now();
    const slideshow = {
      id: this._generateId('ss'),
      name,
      description: description || null,
      slide_count: 0,
      auto_play: auto_play != null ? auto_play : false,
      transition_duration_sec: transition_duration_sec != null ? transition_duration_sec : 3,
      loop: loop != null ? loop : false,
      createdAt: now,
      updatedAt: now
    };

    slideshows.push(slideshow);
    this._saveToStorage('slideshows', slideshows);

    return { slideshow };
  }

  // updateSlideshow(slideshowId, name, description, auto_play, transition_duration_sec, loop)
  updateSlideshow(slideshowId, name, description, auto_play, transition_duration_sec, loop) {
    const slideshows = this._getFromStorage('slideshows', []);
    const slideshow = slideshows.find(s => s.id === slideshowId);
    if (!slideshow) {
      return { slideshow: null };
    }

    if (typeof name === 'string') slideshow.name = name;
    if (typeof description === 'string') slideshow.description = description;
    if (typeof auto_play === 'boolean') slideshow.auto_play = auto_play;
    if (typeof transition_duration_sec === 'number') slideshow.transition_duration_sec = transition_duration_sec;
    if (typeof loop === 'boolean') slideshow.loop = loop;
    slideshow.updatedAt = this._now();

    this._saveToStorage('slideshows', slideshows);
    return { slideshow };
  }

  // deleteSlideshow(slideshowId)
  deleteSlideshow(slideshowId) {
    const slideshows = this._getFromStorage('slideshows', []);
    const items = this._getFromStorage('slideshow_items', []);

    const remainingShows = slideshows.filter(s => s.id !== slideshowId);
    const remainingItems = items.filter(it => it.slideshowId !== slideshowId);

    const existed = remainingShows.length !== slideshows.length;

    this._saveToStorage('slideshows', remainingShows);
    this._saveToStorage('slideshow_items', remainingItems);

    return {
      success: existed,
      message: existed ? 'Slideshow deleted' : 'Slideshow not found'
    };
  }

  // getSlideshowDetail(slideshowId)
  getSlideshowDetail(slideshowId) {
    const slideshows = this._getFromStorage('slideshows', []);
    const items = this._getFromStorage('slideshow_items', []);
    const photos = this._getFromStorage('photos', []);

    const slideshow = slideshows.find(s => s.id === slideshowId) || null;
    if (!slideshow) {
      return { slideshow: null, items: [] };
    }

    const slideshowItems = items
      .filter(it => it.slideshowId === slideshowId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const enriched = slideshowItems.map(it => {
      const photo = photos.find(p => p.id === it.photoId) || null;
      const ssSummary = {
        id: slideshow.id,
        name: slideshow.name
      };
      const slideshow_item = Object.assign({}, it);
      slideshow_item.slideshow = ssSummary;
      slideshow_item.photo = photo;
      return { slideshow_item, photo };
    });

    return {
      slideshow,
      items: enriched
    };
  }

  // addPhotosToSlideshow(slideshowId, photoIds)
  addPhotosToSlideshow(slideshowId, photoIds) {
    const slideshows = this._getFromStorage('slideshows', []);
    const items = this._getFromStorage('slideshow_items', []);

    const slideshow = slideshows.find(s => s.id === slideshowId);
    if (!slideshow) {
      return { slideshow: null, added_items: [] };
    }

    const existing = items.filter(it => it.slideshowId === slideshowId);
    let maxOrder = existing.reduce((max, it) => Math.max(max, it.order_index || 0), 0);

    const added_items = [];
    for (const pid of photoIds || []) {
      maxOrder += 1;
      const item = {
        id: this._generateId('ssi'),
        slideshowId,
        photoId: pid,
        order_index: maxOrder,
        display_duration_sec: null,
        addedAt: this._now()
      };
      items.push(item);
      added_items.push(item);
    }

    this._saveToStorage('slideshow_items', items);
    this._updateSlideshowSlideCount(slideshowId);

    return {
      slideshow,
      added_items
    };
  }

  // removePhotoFromSlideshow(slideshowItemId)
  removePhotoFromSlideshow(slideshowItemId) {
    const items = this._getFromStorage('slideshow_items', []);
    const item = items.find(it => it.id === slideshowItemId);
    const remaining = items.filter(it => it.id !== slideshowItemId);

    this._saveToStorage('slideshow_items', remaining);
    if (item) {
      this._updateSlideshowSlideCount(item.slideshowId);
    }

    return {
      success: !!item,
      message: item ? 'Removed from slideshow' : 'Item not found'
    };
  }

  // reorderSlideshowItems(slideshowId, ordered_item_ids)
  reorderSlideshowItems(slideshowId, ordered_item_ids) {
    const items = this._getFromStorage('slideshow_items', []);
    const slideshows = this._getFromStorage('slideshows', []);
    const slideshow = slideshows.find(s => s.id === slideshowId) || null;

    if (!slideshow) {
      return { slideshow: null, items: [] };
    }

    const idToItem = {};
    for (const it of items) {
      if (it.slideshowId === slideshowId) {
        idToItem[it.id] = it;
      }
    }

    ordered_item_ids.forEach((id, index) => {
      const it = idToItem[id];
      if (it) {
        it.order_index = index;
      }
    });

    this._saveToStorage('slideshow_items', items);
    this._updateSlideshowSlideCount(slideshowId);

    const updatedItems = items
      .filter(it => it.slideshowId === slideshowId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    return {
      slideshow,
      items: updatedItems
    };
  }

  // getViewingPreferences()
  getViewingPreferences() {
    return this._getDefaultViewingPreferences();
  }

  // updateViewingPreferences(default_decade_ranges, default_theme, thumbnails_per_page, default_sort_order)
  updateViewingPreferences(default_decade_ranges, default_theme, thumbnails_per_page, default_sort_order) {
    let prefs = this._getDefaultViewingPreferences();

    if (Array.isArray(default_decade_ranges)) prefs.default_decade_ranges = default_decade_ranges;
    if (typeof default_theme === 'string') prefs.default_theme = default_theme;
    if (typeof thumbnails_per_page === 'number') prefs.thumbnails_per_page = thumbnails_per_page;
    if (typeof default_sort_order === 'string') prefs.default_sort_order = default_sort_order;
    prefs.last_updated = this._now();

    this._saveToStorage('viewing_preferences', prefs);

    return { preferences: prefs };
  }

  // getAboutContent()
  getAboutContent() {
    return {
      title: 'About the Vintage Automobile Photo Gallery',
      body: 'This gallery curates historical photographs of vintage automobiles, focusing on design, culture, and motorsport heritage.',
      sections: [
        {
          heading: 'Purpose',
          content: 'To provide a visually rich archive of vintage car photography organized by decade, manufacturer, body style, and event.'
        },
        {
          heading: 'Sources',
          content: 'Images come from digitized archives, private collections, and licensed photographers, respecting rights and attributions.'
        },
        {
          heading: 'Curation Approach',
          content: 'Photos are tagged and organized by era, make, and key events such as Le Mans, enabling deep exploration of automotive history.'
        }
      ]
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    return {
      categories: [
        {
          name: 'Searching & Browsing',
          faqs: [
            {
              question: 'How do I find photos from a specific decade?',
              answer: 'Use the decade filter in the gallery or search results page to narrow results to a chosen decade range.'
            },
            {
              question: 'Can I filter by car make or body style?',
              answer: 'Yes, use the make and body style filters to focus on specific manufacturers or styles like sedans, convertibles, or race cars.'
            }
          ]
        },
        {
          name: 'Favorites & Collections',
          faqs: [
            {
              question: 'How do I favorite a photo?',
              answer: 'Click the heart icon on any photo card or its detail page to add it to your favorites list.'
            },
            {
              question: 'What are collections?',
              answer: 'Collections let you group related photos under a custom name, like a themed album you can keep private or share publicly.'
            }
          ]
        },
        {
          name: 'Slideshows',
          faqs: [
            {
              question: 'How do I create a slideshow?',
              answer: 'From the Slideshows section, create a new slideshow, then use the gallery picker to add and reorder photos.'
            }
          ]
        },
        {
          name: 'Purchasing',
          faqs: [
            {
              question: 'What print types are available?',
              answer: 'Depending on the photo, you can choose standard prints, posters, postcards, and digital downloads.'
            },
            {
              question: 'How is shipping calculated?',
              answer: 'Shipping is based on the selected method (standard, expedited, overnight) and is summarized in your cart and at checkout.'
            }
          ]
        }
      ]
    };
  }

  // getContactPageConfig()
  getContactPageConfig() {
    return {
      support_email: 'support@vintage-autos.example.com',
      support_address: 'Vintage Automobile Gallery, 123 Classic Lane, Motor City',
      intro_text: 'Have questions about photos, orders, or licensing? Use the form below to contact our support team.'
    };
  }

  // submitContactMessage(name, email, subject, message)
  submitContactMessage(name, email, subject, message) {
    if (!message || !String(message).trim()) {
      return {
        contact_message: null,
        success: false,
        message: 'Message is required'
      };
    }

    const contact_messages = this._getFromStorage('contact_messages', []);

    const contact_message = {
      id: this._generateId('cm'),
      name: name || null,
      email: email || null,
      subject: subject || null,
      message: message,
      status: 'new',
      createdAt: this._now(),
      respondedAt: null
    };

    contact_messages.push(contact_message);
    this._saveToStorage('contact_messages', contact_messages);

    return {
      contact_message,
      success: true,
      message: 'Message submitted'
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