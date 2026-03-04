// localStorage polyfill for Node.js and environments without localStorage
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
    this.idCounter = this._getNextIdCounter();
    this.MAX_COMPARE_ITEMS = 4;
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const ensureKey = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entities
    ensureKey('templates', []);
    ensureKey('categories', []);
    ensureKey('tags', []);

    // Single-user cart and related
    if (localStorage.getItem('cart') === null) {
      localStorage.setItem('cart', 'null');
    }
    ensureKey('cart_items', []);

    // Favorites
    ensureKey('favorites', []);

    // Collections
    ensureKey('collections', []);
    ensureKey('collection_items', []);

    // Compare list
    ensureKey('compare_items', []);

    // Promo codes
    ensureKey('promocodes', []);

    // Checkout sessions
    ensureKey('checkout_sessions', []);
    if (localStorage.getItem('current_checkout_session_id') === null) {
      localStorage.setItem('current_checkout_session_id', 'null');
    }

    // Static pages
    ensureKey('static_pages', []);

    // Contact requests
    ensureKey('contact_requests', []);

    // Orders (simple archive of placed orders)
    ensureKey('orders', []);

    // ID counter
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ----------------------
  // Single-user state helpers
  // ----------------------

  _getSingleUserState() {
    const cart = this._getFromStorage('cart', null);
    return {
      cart: cart,
      cart_items: this._getFromStorage('cart_items', []),
      favorites: this._getFromStorage('favorites', []),
      collections: this._getFromStorage('collections', []),
      collection_items: this._getFromStorage('collection_items', []),
      compare_items: this._getFromStorage('compare_items', []),
      checkout_sessions: this._getFromStorage('checkout_sessions', [])
    };
  }

  _saveSingleUserState(state) {
    if (state.cart !== undefined) {
      this._saveToStorage('cart', state.cart);
    }
    if (state.cart_items !== undefined) {
      this._saveToStorage('cart_items', state.cart_items);
    }
    if (state.favorites !== undefined) {
      this._saveToStorage('favorites', state.favorites);
    }
    if (state.collections !== undefined) {
      this._saveToStorage('collections', state.collections);
    }
    if (state.collection_items !== undefined) {
      this._saveToStorage('collection_items', state.collection_items);
    }
    if (state.compare_items !== undefined) {
      this._saveToStorage('compare_items', state.compare_items);
    }
    if (state.checkout_sessions !== undefined) {
      this._saveToStorage('checkout_sessions', state.checkout_sessions);
    }
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      const templates = this._getFromStorage('templates', []);
      const currency = templates.length > 0 && templates[0].currency ? templates[0].currency : 'USD';
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        applied_promo_code_id: null,
        subtotal: 0,
        discount_total: 0,
        tax_total: 0,
        total: 0,
        currency: currency
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const templates = this._getFromStorage('templates', []);
    const promos = this._getFromStorage('promocodes', []);

    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });

    let subtotal = 0;
    let itemCount = 0;

    for (let i = 0; i < itemsForCart.length; i++) {
      const item = itemsForCart[i];
      const lineTotal = typeof item.line_total === 'number'
        ? item.line_total
        : (item.unit_price || 0) * (item.quantity || 0);
      subtotal += lineTotal;
      itemCount += item.quantity || 0;
    }

    let discountTotal = 0;

    if (cart.applied_promo_code_id) {
      const promo = promos.find(function (p) { return p.id === cart.applied_promo_code_id; });
      const now = new Date();
      if (!promo || !promo.is_active) {
        cart.applied_promo_code_id = null;
      } else {
        if (promo.valid_from) {
          const from = new Date(promo.valid_from);
          if (now < from) {
            cart.applied_promo_code_id = null;
          }
        }
        if (promo.valid_to) {
          const to = new Date(promo.valid_to);
          if (now > to) {
            cart.applied_promo_code_id = null;
          }
        }
      }

      if (cart.applied_promo_code_id) {
        const activePromo = promos.find(function (p) { return p.id === cart.applied_promo_code_id; });
        if (activePromo) {
          let discountableSubtotal = 0;
          for (let j = 0; j < itemsForCart.length; j++) {
            const item = itemsForCart[j];
            const template = templates.find(function (t) { return t.id === item.template_id; });
            if (!template) continue;

            let categoryOk = true;
            let tagOk = true;

            if (Array.isArray(activePromo.applicable_category_ids) && activePromo.applicable_category_ids.length > 0) {
              categoryOk = activePromo.applicable_category_ids.indexOf(template.category_id) !== -1;
            }
            if (Array.isArray(activePromo.applicable_tag_ids) && activePromo.applicable_tag_ids.length > 0) {
              const tags = Array.isArray(template.tag_ids) ? template.tag_ids : [];
              tagOk = tags.some(function (tagId) {
                return activePromo.applicable_tag_ids.indexOf(tagId) !== -1;
              });
            }

            if (categoryOk && tagOk) {
              const lt = typeof item.line_total === 'number'
                ? item.line_total
                : (item.unit_price || 0) * (item.quantity || 0);
              discountableSubtotal += lt;
            }
          }

          if (discountableSubtotal > 0) {
            if (activePromo.discount_type === 'percent') {
              discountTotal = discountableSubtotal * (activePromo.discount_value / 100);
            } else if (activePromo.discount_type === 'fixed_amount') {
              discountTotal = activePromo.discount_value;
            }
          }
        }
      }
    }

    if (discountTotal < 0) discountTotal = 0;
    if (discountTotal > subtotal) discountTotal = subtotal;

    const taxTotal = 0;
    const total = Math.max(0, subtotal - discountTotal + taxTotal);

    cart.subtotal = subtotal;
    cart.discount_total = discountTotal;
    cart.tax_total = taxTotal;
    cart.total = total;
    cart.updated_at = this._nowIso();
    cart.item_count = itemCount;

    this._saveToStorage('cart', cart);
    return cart;
  }

  _validatePromoCode(code, cart) {
    const promos = this._getFromStorage('promocodes', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const templates = this._getFromStorage('templates', []);
    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });

    if (!itemsForCart.length) {
      return { success: false, message: 'Cart is empty', promo: null };
    }

    const normalized = (code || '').trim().toLowerCase();
    if (!normalized) {
      return { success: false, message: 'Promo code is empty', promo: null };
    }

    const promo = promos.find(function (p) {
      return typeof p.code === 'string' && p.code.toLowerCase() === normalized;
    });

    if (!promo || !promo.is_active) {
      return { success: false, message: 'Promo code is invalid or inactive', promo: null };
    }

    const now = new Date();
    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (now < from) {
        return { success: false, message: 'Promo code is not yet valid', promo: null };
      }
    }
    if (promo.valid_to) {
      const to = new Date(promo.valid_to);
      if (now > to) {
        return { success: false, message: 'Promo code has expired', promo: null };
      }
    }

    let discountableSubtotal = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      const item = itemsForCart[i];
      const template = templates.find(function (t) { return t.id === item.template_id; });
      if (!template) continue;

      let categoryOk = true;
      let tagOk = true;

      if (Array.isArray(promo.applicable_category_ids) && promo.applicable_category_ids.length > 0) {
        categoryOk = promo.applicable_category_ids.indexOf(template.category_id) !== -1;
      }
      if (Array.isArray(promo.applicable_tag_ids) && promo.applicable_tag_ids.length > 0) {
        const tags = Array.isArray(template.tag_ids) ? template.tag_ids : [];
        tagOk = tags.some(function (tagId) {
          return promo.applicable_tag_ids.indexOf(tagId) !== -1;
        });
      }

      if (categoryOk && tagOk) {
        const lt = typeof item.line_total === 'number'
          ? item.line_total
          : (item.unit_price || 0) * (item.quantity || 0);
        discountableSubtotal += lt;
      }
    }

    if (discountableSubtotal <= 0) {
      return { success: false, message: 'Promo code does not apply to any items in the cart', promo: null };
    }

    return { success: true, message: 'Promo code is valid', promo: promo };
  }

  // ----------------------
  // Checkout helpers
  // ----------------------

  _getCurrentCheckoutSession() {
    const cart = this._getOrCreateCart();
    let checkoutSessions = this._getFromStorage('checkout_sessions', []);
    let currentIdRaw = localStorage.getItem('current_checkout_session_id');
    let currentId = currentIdRaw !== null ? JSON.parse(currentIdRaw) : null;

    let session = null;
    if (currentId) {
      session = checkoutSessions.find(function (s) { return s.id === currentId; }) || null;
    }

    if (!session) {
      session = {
        id: this._generateId('chk'),
        cart_id: cart.id,
        full_name: '',
        email: '',
        country: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state_province: '',
        postal_code: '',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      checkoutSessions.push(session);
      this._saveToStorage('checkout_sessions', checkoutSessions);
      localStorage.setItem('current_checkout_session_id', JSON.stringify(session.id));
    }

    return session;
  }

  // ----------------------
  // Template filtering helpers
  // ----------------------

  _applyTemplateFilters(templates, filters) {
    if (!filters) return templates;

    let result = templates.slice();

    if (typeof filters.minPrice === 'number') {
      result = result.filter(function (t) { return t.price >= filters.minPrice; });
    }
    if (typeof filters.maxPrice === 'number') {
      result = result.filter(function (t) { return t.price <= filters.maxPrice; });
    }
    if (filters.isFreeOnly) {
      result = result.filter(function (t) { return t.is_free === true || t.price === 0; });
    }
    if (typeof filters.minRating === 'number') {
      result = result.filter(function (t) {
        return typeof t.average_rating === 'number' && t.average_rating >= filters.minRating;
      });
    }
    if (Array.isArray(filters.resolutionIds) && filters.resolutionIds.length > 0) {
      result = result.filter(function (t) {
        const res = Array.isArray(t.resolutions) ? t.resolutions : [];
        return filters.resolutionIds.some(function (rid) {
          return res.indexOf(rid) !== -1;
        });
      });
    }
    if (Array.isArray(filters.aspectRatioIds) && filters.aspectRatioIds.length > 0) {
      result = result.filter(function (t) {
        const ars = Array.isArray(t.aspect_ratios) ? t.aspect_ratios : [];
        return filters.aspectRatioIds.some(function (aid) {
          return ars.indexOf(aid) !== -1;
        });
      });
    }
    if (Array.isArray(filters.tagIds) && filters.tagIds.length > 0) {
      result = result.filter(function (t) {
        const tags = Array.isArray(t.tag_ids) ? t.tag_ids : [];
        return filters.tagIds.some(function (tid) {
          return tags.indexOf(tid) !== -1;
        });
      });
    }
    if (filters.dateAddedFilter && filters.dateAddedFilter !== 'any_time') {
      const now = new Date();
      let days = 0;
      if (filters.dateAddedFilter === 'last_7_days') days = 7;
      if (filters.dateAddedFilter === 'last_30_days') days = 30;
      if (filters.dateAddedFilter === 'last_90_days') days = 90;
      if (days > 0) {
        const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        result = result.filter(function (t) {
          if (!t.date_added) return false;
          const d = new Date(t.date_added);
          return d >= threshold;
        });
      }
    }

    return result;
  }

  _sortTemplates(templates, sortOption) {
    const arr = templates.slice();
    if (!sortOption) return arr;

    if (sortOption === 'price_low_to_high') {
      arr.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
    } else if (sortOption === 'price_high_to_low') {
      arr.sort(function (a, b) { return (b.price || 0) - (a.price || 0); });
    } else if (sortOption === 'newest') {
      arr.sort(function (a, b) {
        const da = a.date_added ? new Date(a.date_added).getTime() : 0;
        const db = b.date_added ? new Date(b.date_added).getTime() : 0;
        return db - da;
      });
    } else if (sortOption === 'top_rated') {
      arr.sort(function (a, b) {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      });
    }

    // For search, relevance_default can just preserve order
    return arr;
  }

  _paginate(items, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 24;
    const start = (p - 1) * size;
    const end = start + size;
    const slice = items.slice(start, end);
    const total = items.length;
    const totalPages = Math.ceil(total / size) || 1;
    return {
      items: slice,
      total_results: total,
      page: p,
      page_size: size,
      total_pages: totalPages
    };
  }

  _templateListView(template, favorites, compareItems, cartItems, categories) {
    const isFavorite = favorites.some(function (f) { return f.template_id === template.id; });
    const inCompare = compareItems.some(function (c) { return c.template_id === template.id; });
    const inCart = cartItems.some(function (ci) { return ci.template_id === template.id; });
    const category = categories.find(function (c) { return c.id === template.category_id; });
    return {
      template_id: template.id,
      title: template.title,
      slug: template.slug || null,
      category_id: template.category_id,
      category_name: category ? category.name : '',
      price: template.price,
      currency: template.currency,
      is_free: !!template.is_free,
      average_rating: typeof template.average_rating === 'number' ? template.average_rating : null,
      rating_count: typeof template.rating_count === 'number' ? template.rating_count : null,
      resolutions: Array.isArray(template.resolutions) ? template.resolutions : [],
      aspect_ratios: Array.isArray(template.aspect_ratios) ? template.aspect_ratios : [],
      thumbnail_url: template.thumbnail_url || null,
      is_favorite: isFavorite,
      in_compare: inCompare,
      is_in_cart: inCart
    };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getCategoriesForNavigation
  getCategoriesForNavigation() {
    const categories = this._getFromStorage('categories', []);
    const templates = this._getFromStorage('templates', []);

    const result = categories.map(function (cat) {
      const count = templates.filter(function (t) {
        return t.category_id === cat.id && t.status === 'active';
      }).length;
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        sort_order: typeof cat.sort_order === 'number' ? cat.sort_order : 0,
        template_count: count
      };
    });

    result.sort(function (a, b) { return a.sort_order - b.sort_order; });

    return result;
  }

  // getHomepageContent
  getHomepageContent() {
    const categories = this._getFromStorage('categories', []);
    const templates = this._getFromStorage('templates', []);
    const favorites = this._getFromStorage('favorites', []);
    const compareItems = this._getFromStorage('compare_items', []);
    const cartItems = this._getFromStorage('cart_items', []);

    // Featured categories: take first few categories that have templates
    const featured_categories = categories
      .filter(function (cat) {
        return templates.some(function (t) { return t.category_id === cat.id; });
      })
      .slice(0, 6)
      .map(function (cat) {
        const firstTemplate = templates.find(function (t) { return t.category_id === cat.id; });
        return {
          category_id: cat.id,
          name: cat.name,
          description: cat.description || '',
          thumbnail_url: firstTemplate ? (firstTemplate.thumbnail_url || null) : null
        };
      });

    // Featured templates: top rated active templates
    const activeTemplates = templates.filter(function (t) { return t.status === 'active'; });
    const sortedByRating = this._sortTemplates(activeTemplates, 'top_rated');
    const topFeatured = sortedByRating.slice(0, 10);

    const featured_templates = topFeatured.map((t) => {
      const category = categories.find(function (c) { return c.id === t.category_id; });
      return {
        template_id: t.id,
        title: t.title,
        category_name: category ? category.name : '',
        thumbnail_url: t.thumbnail_url || null,
        price: t.price,
        currency: t.currency,
        is_free: !!t.is_free,
        average_rating: typeof t.average_rating === 'number' ? t.average_rating : null
      };
    });

    // New last 30 days
    const now = new Date();
    const threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const templatesLast30 = activeTemplates.filter(function (t) {
      if (!t.date_added) return false;
      const d = new Date(t.date_added);
      return d >= threshold;
    });

    const new_last_30_days_templates = templatesLast30.slice(0, 20).map(function (t) {
      const category = categories.find(function (c) { return c.id === t.category_id; });
      return {
        template_id: t.id,
        title: t.title,
        category_name: category ? category.name : '',
        thumbnail_url: t.thumbnail_url || null,
        price: t.price,
        currency: t.currency,
        is_free: !!t.is_free,
        date_added: t.date_added
      };
    });

    return {
      featured_categories: featured_categories,
      featured_templates: featured_templates,
      new_last_30_days: {
        description: 'Templates added in the last 30 days',
        templates: new_last_30_days_templates
      }
    };
  }

  // getHeaderStatus
  getHeaderStatus() {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);
    const favorites = this._getFromStorage('favorites', []);
    const compareItems = this._getFromStorage('compare_items', []);

    const cartItemCount = cart
      ? cartItems.filter(function (ci) { return ci.cart_id === cart.id; })
          .reduce(function (sum, item) { return sum + (item.quantity || 0); }, 0)
      : 0;

    const hasActivePromo = !!(cart && cart.applied_promo_code_id);

    return {
      cart_item_count: cartItemCount,
      favorites_count: favorites.length,
      compare_count: compareItems.length,
      has_active_promo_code: hasActivePromo
    };
  }

  // getFilterOptions(context, categoryId)
  getFilterOptions(context, categoryId) {
    const templatesAll = this._getFromStorage('templates', []);
    let templates = templatesAll.filter(function (t) { return t.status === 'active'; });

    if (categoryId) {
      templates = templates.filter(function (t) { return t.category_id === categoryId; });
    }

    const resolutionLabelMap = {
      '4k_3840x2160': '4K (3840x2160)',
      'full_hd_1920x1080': 'Full HD (1920x1080)',
      'hd_1280x720': 'HD (1280x720)'
    };

    const aspectRatioLabelMap = {
      'vertical_9_16_1080x1920': 'Vertical 9:16 (1080x1920)',
      'horizontal_16_9': 'Horizontal 16:9'
    };

    const resolutionSet = {};
    const aspectRatioSet = {};
    let minPrice = null;
    let maxPrice = null;
    let hasFree = false;

    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      const res = Array.isArray(t.resolutions) ? t.resolutions : [];
      res.forEach(function (rid) { resolutionSet[rid] = true; });

      const ars = Array.isArray(t.aspect_ratios) ? t.aspect_ratios : [];
      ars.forEach(function (aid) { aspectRatioSet[aid] = true; });

      if (typeof t.price === 'number') {
        if (minPrice === null || t.price < minPrice) minPrice = t.price;
        if (maxPrice === null || t.price > maxPrice) maxPrice = t.price;
      }
      if (t.is_free || t.price === 0) {
        hasFree = true;
      }
    }

    const resolution_options = Object.keys(resolutionSet).map(function (id) {
      return { id: id, label: resolutionLabelMap[id] || id };
    });

    const aspect_ratio_options = Object.keys(aspectRatioSet).map(function (id) {
      return { id: id, label: aspectRatioLabelMap[id] || id };
    });

    const price_range = {
      min_price: minPrice !== null ? minPrice : 0,
      max_price: maxPrice !== null ? maxPrice : 0,
      has_free_option: hasFree
    };

    const rating_thresholds = [
      { min_rating: 5.0, label: '5 stars' },
      { min_rating: 4.5, label: '4.5 stars & up' },
      { min_rating: 4.0, label: '4.0 stars & up' },
      { min_rating: 3.0, label: '3.0 stars & up' }
    ];

    const tags = this._getFromStorage('tags', []);
    const tag_options = tags.map(function (tag) {
      return {
        tag_id: tag.id,
        name: tag.name,
        description: tag.description || ''
      };
    });

    const date_filters = [
      { id: 'any_time', label: 'Any time', description: 'No date filter' },
      { id: 'last_7_days', label: 'Last 7 days', description: 'Templates added in the last 7 days' },
      { id: 'last_30_days', label: 'Last 30 days', description: 'Templates added in the last 30 days' },
      { id: 'last_90_days', label: 'Last 90 days', description: 'Templates added in the last 90 days' }
    ];

    let sort_options = [];
    if (context === 'search') {
      sort_options = [
        { id: 'relevance_default', label: 'Relevance' },
        { id: 'price_low_to_high', label: 'Price: Low to High' },
        { id: 'price_high_to_low', label: 'Price: High to Low' },
        { id: 'newest', label: 'Newest' },
        { id: 'top_rated', label: 'Top Rated' }
      ];
    } else {
      sort_options = [
        { id: 'price_low_to_high', label: 'Price: Low to High' },
        { id: 'price_high_to_low', label: 'Price: High to Low' },
        { id: 'newest', label: 'Newest' },
        { id: 'top_rated', label: 'Top Rated' }
      ];
    }

    return {
      resolution_options: resolution_options,
      aspect_ratio_options: aspect_ratio_options,
      price_range: price_range,
      rating_thresholds: rating_thresholds,
      tag_options: tag_options,
      date_filters: date_filters,
      sort_options: sort_options
    };
  }

  // getBrowseTemplates(categoryId, filters, sortOption, page, pageSize)
  getBrowseTemplates(categoryId, filters, sortOption, page, pageSize) {
    const templatesAll = this._getFromStorage('templates', []);
    const categories = this._getFromStorage('categories', []);
    const favorites = this._getFromStorage('favorites', []);
    const compareItems = this._getFromStorage('compare_items', []);
    const cartItems = this._getFromStorage('cart_items', []);

    let templates = templatesAll.filter(function (t) {
      return t.status === 'active' && t.category_id === categoryId;
    });

    templates = this._applyTemplateFilters(templates, filters || {});
    templates = this._sortTemplates(templates, sortOption || 'newest');

    const paged = this._paginate(templates, page, pageSize);
    const listTemplates = paged.items.map((t) => this._templateListView(t, favorites, compareItems, cartItems, categories));

    return {
      templates: listTemplates,
      total_results: paged.total_results,
      page: paged.page,
      page_size: paged.page_size,
      total_pages: paged.total_pages
    };
  }

  // searchTemplates(query, categoryId, filters, sortOption, page, pageSize)
  searchTemplates(query, categoryId, filters, sortOption, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const templatesAll = this._getFromStorage('templates', []);
    const categories = this._getFromStorage('categories', []);
    const favorites = this._getFromStorage('favorites', []);
    const compareItems = this._getFromStorage('compare_items', []);
    const cartItems = this._getFromStorage('cart_items', []);

    let templates = templatesAll.filter(function (t) { return t.status === 'active'; });

    if (categoryId) {
      templates = templates.filter(function (t) { return t.category_id === categoryId; });
    }

    if (q) {
      templates = templates.filter(function (t) {
        const title = (t.title || '').toLowerCase();
        const shortDesc = (t.short_description || '').toLowerCase();
        const longDesc = (t.long_description || '').toLowerCase();
        return title.indexOf(q) !== -1 || shortDesc.indexOf(q) !== -1 || longDesc.indexOf(q) !== -1;
      });
    }

    templates = this._applyTemplateFilters(templates, filters || {});
    templates = this._sortTemplates(templates, sortOption || 'relevance_default');

    const paged = this._paginate(templates, page, pageSize);
    const listTemplates = paged.items.map((t) => this._templateListView(t, favorites, compareItems, cartItems, categories));

    return {
      templates: listTemplates,
      total_results: paged.total_results,
      page: paged.page,
      page_size: paged.page_size,
      total_pages: paged.total_pages
    };
  }

  // getTemplateDetail(templateId)
  getTemplateDetail(templateId) {
    const templates = this._getFromStorage('templates', []);
    const categories = this._getFromStorage('categories', []);
    const tags = this._getFromStorage('tags', []);
    const favorites = this._getFromStorage('favorites', []);
    const compareItems = this._getFromStorage('compare_items', []);

    const template = templates.find(function (t) { return t.id === templateId; }) || null;

    if (!template) {
      return { template: null, related_templates: [] };
    }

    const category = categories.find(function (c) { return c.id === template.category_id; });
    const tagNames = [];
    if (Array.isArray(template.tag_ids)) {
      template.tag_ids.forEach(function (tid) {
        const tag = tags.find(function (tg) { return tg.id === tid; });
        if (tag) tagNames.push(tag.name);
      });
    }

    const isFavorite = favorites.some(function (f) { return f.template_id === template.id; });
    const inCompare = compareItems.some(function (c) { return c.template_id === template.id; });

    const detailTemplate = {
      id: template.id,
      title: template.title,
      slug: template.slug || null,
      status: template.status,
      category_id: template.category_id,
      category_name: category ? category.name : '',
      price: template.price,
      currency: template.currency,
      is_free: !!template.is_free,
      average_rating: typeof template.average_rating === 'number' ? template.average_rating : null,
      rating_count: typeof template.rating_count === 'number' ? template.rating_count : null,
      resolutions: Array.isArray(template.resolutions) ? template.resolutions : [],
      aspect_ratios: Array.isArray(template.aspect_ratios) ? template.aspect_ratios : [],
      thumbnail_url: template.thumbnail_url || null,
      preview_video_url: template.preview_video_url || null,
      short_description: template.short_description || '',
      long_description: template.long_description || '',
      photo_placeholder_count: typeof template.photo_placeholder_count === 'number' ? template.photo_placeholder_count : null,
      text_placeholder_count: typeof template.text_placeholder_count === 'number' ? template.text_placeholder_count : null,
      transition_count: typeof template.transition_count === 'number' ? template.transition_count : null,
      is_bundle: !!template.is_bundle,
      ae_compatibility_versions: Array.isArray(template.ae_compatibility_versions) ? template.ae_compatibility_versions : [],
      includes_sound: !!template.includes_sound,
      tag_ids: Array.isArray(template.tag_ids) ? template.tag_ids : [],
      tag_names: tagNames,
      available_licenses: Array.isArray(template.available_licenses) ? template.available_licenses : [],
      default_license: template.default_license || null,
      date_added: template.date_added || null,
      is_favorite: isFavorite,
      in_compare: inCompare
    };

    const relatedRaw = templates.filter(function (t) {
      return t.id !== template.id && t.category_id === template.category_id && t.status === 'active';
    }).slice(0, 8);

    const related_templates = relatedRaw.map(function (t) {
      return {
        template_id: t.id,
        title: t.title,
        thumbnail_url: t.thumbnail_url || null,
        price: t.price,
        currency: t.currency,
        average_rating: typeof t.average_rating === 'number' ? t.average_rating : null
      };
    });

    return {
      template: detailTemplate,
      related_templates: related_templates
    };
  }

  // addToCart(templateId, selectedLicenseType, quantity)
  addToCart(templateId, selectedLicenseType, quantity) {
    const templates = this._getFromStorage('templates', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const template = templates.find(function (t) { return t.id === templateId; });
    if (!template || template.status !== 'active') {
      return { success: false, message: 'Template not found or inactive', cart: null };
    }

    const cart = this._getOrCreateCart();

    const availableLicenses = Array.isArray(template.available_licenses) ? template.available_licenses : [];
    let licenseType = selectedLicenseType || template.default_license || (availableLicenses[0] || null);
    if (licenseType && availableLicenses.length && availableLicenses.indexOf(licenseType) === -1) {
      licenseType = availableLicenses[0];
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const unitPrice = typeof template.price === 'number' ? template.price : 0;

    let existingItem = cartItems.find(function (ci) {
      return ci.cart_id === cart.id && ci.template_id === template.id && ci.selected_license_type === licenseType;
    });

    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.line_total = existingItem.unit_price * existingItem.quantity;
    } else {
      existingItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        template_id: template.id,
        selected_license_type: licenseType,
        unit_price: unitPrice,
        quantity: qty,
        line_total: unitPrice * qty,
        title_snapshot: template.title,
        thumbnail_url: template.thumbnail_url || null
      };
      cartItems.push(existingItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    const responseCart = this._buildCartResponse(updatedCart);

    return {
      success: true,
      message: 'Added to cart',
      cart: responseCart
    };
  }

  _buildCartResponse(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const templates = this._getFromStorage('templates', []);
    const promos = this._getFromStorage('promocodes', []);

    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });

    const items = itemsForCart.map(function (ci) {
      const tmpl = templates.find(function (t) { return t.id === ci.template_id; }) || null;
      return {
        cart_item_id: ci.id,
        template_id: ci.template_id,
        title: ci.title_snapshot || (tmpl ? tmpl.title : ''),
        selected_license_type: ci.selected_license_type || null,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        thumbnail_url: ci.thumbnail_url || (tmpl ? tmpl.thumbnail_url : null),
        template: tmpl
      };
    });

    let appliedPromo = null;
    if (cart.applied_promo_code_id) {
      const promo = promos.find(function (p) { return p.id === cart.applied_promo_code_id; });
      if (promo) {
        appliedPromo = {
          code: promo.code,
          description: promo.description || '',
          discount_type: promo.discount_type,
          discount_value: promo.discount_value
        };
      }
    }

    return {
      id: cart.id,
      currency: cart.currency,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      tax_total: cart.tax_total,
      total: cart.total,
      item_count: cart.item_count || 0,
      applied_promo_code: appliedPromo,
      items: items
    };
  }

  // getCart()
  getCart() {
    const cart = this._getFromStorage('cart', null) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    return this._buildCartResponse(updatedCart);
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (index === -1) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    if (!quantity || quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      cartItems[index].quantity = quantity;
      cartItems[index].line_total = cartItems[index].unit_price * quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    cart = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart updated',
      cart: this._buildCartResponse(cart)
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const newItems = cartItems.filter(function (ci) { return ci.id !== cartItemId; });

    if (newItems.length === cartItems.length) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    this._saveToStorage('cart_items', newItems);
    cart = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item removed',
      cart: this._buildCartResponse(cart)
    };
  }

  // applyPromoCode(code)
  applyPromoCode(code) {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null };
    }

    const validation = this._validatePromoCode(code, cart);
    if (!validation.success) {
      return {
        success: false,
        message: validation.message,
        cart: this._buildCartResponse(this._recalculateCartTotals(cart))
      };
    }

    cart.applied_promo_code_id = validation.promo.id;
    cart = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Promo code applied',
      cart: this._buildCartResponse(cart)
    };
  }

  // startCheckoutFromCart()
  startCheckoutFromCart() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const session = this._getCurrentCheckoutSession();

    return {
      success: true,
      message: 'Checkout started',
      checkout_session: {
        id: session.id,
        full_name: session.full_name,
        email: session.email,
        country: session.country,
        address_line1: session.address_line1,
        address_line2: session.address_line2,
        city: session.city,
        state_province: session.state_province,
        postal_code: session.postal_code,
        created_at: session.created_at,
        updated_at: session.updated_at
      },
      cart: {
        id: updatedCart.id,
        currency: updatedCart.currency,
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total,
        tax_total: updatedCart.tax_total,
        total: updatedCart.total,
        item_count: updatedCart.item_count || 0
      }
    };
  }

  // updateCheckoutDetails(fullName, email, country, addressLine1, addressLine2, city, stateProvince, postalCode)
  updateCheckoutDetails(fullName, email, country, addressLine1, addressLine2, city, stateProvince, postalCode) {
    let session = this._getCurrentCheckoutSession();
    const validation_errors = {};

    if (!fullName || !fullName.trim()) {
      validation_errors.fullName = 'Full name is required';
    }
    const emailStr = (email || '').trim();
    if (!emailStr) {
      validation_errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        validation_errors.email = 'Email is invalid';
      }
    }
    if (!country || !country.trim()) {
      validation_errors.country = 'Country is required';
    }
    if (!addressLine1 || !addressLine1.trim()) {
      validation_errors.addressLine1 = 'Address line 1 is required';
    }
    if (!city || !city.trim()) {
      validation_errors.city = 'City is required';
    }

    const hasErrors = Object.keys(validation_errors).length > 0;

    session.full_name = fullName || '';
    session.email = emailStr;
    session.country = country || '';
    session.address_line1 = addressLine1 || '';
    session.address_line2 = addressLine2 || '';
    session.city = city || '';
    session.state_province = stateProvince || '';
    session.postal_code = postalCode || '';
    session.updated_at = this._nowIso();

    let checkoutSessions = this._getFromStorage('checkout_sessions', []);
    const index = checkoutSessions.findIndex(function (s) { return s.id === session.id; });
    if (index !== -1) {
      checkoutSessions[index] = session;
    } else {
      checkoutSessions.push(session);
    }
    this._saveToStorage('checkout_sessions', checkoutSessions);

    return {
      success: !hasErrors,
      validation_errors: validation_errors,
      checkout_session: {
        id: session.id,
        full_name: session.full_name,
        email: session.email,
        country: session.country,
        address_line1: session.address_line1,
        address_line2: session.address_line2,
        city: session.city,
        state_province: session.state_province,
        postal_code: session.postal_code,
        created_at: session.created_at,
        updated_at: session.updated_at
      }
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getFromStorage('cart', null) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const cartResponse = this._buildCartResponse(updatedCart);
    const session = this._getCurrentCheckoutSession();

    return {
      checkout_session: {
        id: session.id,
        full_name: session.full_name,
        email: session.email,
        country: session.country,
        address_line1: session.address_line1,
        address_line2: session.address_line2,
        city: session.city,
        state_province: session.state_province,
        postal_code: session.postal_code
      },
      cart: {
        id: cartResponse.id,
        currency: cartResponse.currency,
        subtotal: cartResponse.subtotal,
        discount_total: cartResponse.discount_total,
        tax_total: cartResponse.tax_total,
        total: cartResponse.total,
        item_count: cartResponse.item_count,
        applied_promo_code: cartResponse.applied_promo_code,
        items: cartResponse.items.map(function (it) {
          return {
            cart_item_id: it.cart_item_id,
            template_id: it.template_id,
            title: it.title,
            selected_license_type: it.selected_license_type,
            unit_price: it.unit_price,
            quantity: it.quantity,
            line_total: it.line_total,
            template: it.template
          };
        })
      }
    };
  }

  // getOrderReview()
  getOrderReview() {
    const cart = this._getFromStorage('cart', null) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const cartResponse = this._buildCartResponse(updatedCart);
    const session = this._getCurrentCheckoutSession();

    let promoCodesBreakdown = [];
    if (cartResponse.applied_promo_code) {
      promoCodesBreakdown.push({
        code: cartResponse.applied_promo_code.code,
        savings_amount: cartResponse.discount_total
      });
    }

    const pricing_breakdown = {
      subtotal: cartResponse.subtotal,
      discount_total: cartResponse.discount_total,
      tax_total: cartResponse.tax_total,
      total: cartResponse.total,
      promo_codes: promoCodesBreakdown
    };

    // Instrumentation for task completion tracking (task_3)
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const hasValidSession =
        session &&
        session.full_name && session.full_name.trim() &&
        session.email && emailRegex.test((session.email || '').trim()) &&
        session.country && session.country.trim() &&
        session.address_line1 && session.address_line1.trim() &&
        session.city && session.city.trim();

      if (hasValidSession && cartResponse && Array.isArray(cartResponse.items) && cartResponse.items.length > 0) {
        const categories = this._getFromStorage('categories', []);
        const tags = this._getFromStorage('tags', []);

        const slideshowCategoryIds = categories
          .filter(function (c) { return c && c.name === 'Slideshows'; })
          .map(function (c) { return c.id; });

        const weddingTagIds = tags
          .filter(function (t) { return t && t.name === 'Wedding'; })
          .map(function (t) { return t.id; });

        const hasQualifyingWeddingSlideshow = cartResponse.items.some(function (it) {
          const tmpl = it.template;
          if (!tmpl) return false;

          if (slideshowCategoryIds.indexOf(tmpl.category_id) === -1) return false;

          const tagIds = Array.isArray(tmpl.tag_ids) ? tmpl.tag_ids : [];
          const hasWeddingTag = tagIds.some(function (tid) {
            return weddingTagIds.indexOf(tid) !== -1;
          });
          if (!hasWeddingTag) return false;

          const price = typeof tmpl.price === 'number' ? tmpl.price : null;
          if (price === null || price < 15 || price > 30) return false;

          const avgRating = typeof tmpl.average_rating === 'number' ? tmpl.average_rating : 0;
          if (avgRating < 4.0) return false;

          const photoCount = typeof tmpl.photo_placeholder_count === 'number' ? tmpl.photo_placeholder_count : 0;
          if (photoCount < 30) return false;

          return true;
        });

        if (hasQualifyingWeddingSlideshow) {
          const snapshot = {
            completed: true,
            timestamp: this._nowIso(),
            checkout_session_id: session.id,
            cart_id: cartResponse.id,
            template_ids: cartResponse.items.map(function (it) { return it.template_id; })
          };
          localStorage.setItem('task3_orderReviewSnapshot', JSON.stringify(snapshot));
        }
      }
    } catch (e) {
      console.error('Instrumentation error (task_3):', e);
    }

    // Instrumentation for task completion tracking (task_7)
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const hasValidSession =
        session &&
        session.full_name && session.full_name.trim() &&
        session.email && emailRegex.test((session.email || '').trim()) &&
        session.country && session.country.trim() &&
        session.address_line1 && session.address_line1.trim() &&
        session.city && session.city.trim();

      if (hasValidSession && cartResponse && Array.isArray(cartResponse.items) && cartResponse.items.length > 0) {
        const qualifyingItem = cartResponse.items.find(function (it) {
          const tmpl = it.template;
          if (!tmpl) return false;

          if (!tmpl.is_bundle) return false;

          const transitionCount = typeof tmpl.transition_count === 'number' ? tmpl.transition_count : 0;
          if (transitionCount < 50) return false;

          const price = typeof tmpl.price === 'number' ? tmpl.price : null;
          if (price === null || price < 40 || price > 60) return false;

          const avgRating = typeof tmpl.average_rating === 'number' ? tmpl.average_rating : 0;
          if (avgRating < 4.0) return false;

          if (it.selected_license_type !== 'Single Commercial License') return false;

          return true;
        });

        if (qualifyingItem) {
          const snapshot = {
            completed: true,
            timestamp: this._nowIso(),
            checkout_session_id: session.id,
            cart_id: cartResponse.id,
            template_ids: cartResponse.items.map(function (it) { return it.template_id; }),
            qualifying_template_id: qualifyingItem.template_id
          };
          localStorage.setItem('task7_orderReviewSnapshot', JSON.stringify(snapshot));
        }
      }
    } catch (e) {
      console.error('Instrumentation error (task_7):', e);
    }

    return {
      checkout_session: {
        id: session.id,
        full_name: session.full_name,
        email: session.email,
        country: session.country,
        address_line1: session.address_line1,
        address_line2: session.address_line2,
        city: session.city,
        state_province: session.state_province,
        postal_code: session.postal_code
      },
      cart: {
        id: cartResponse.id,
        currency: cartResponse.currency,
        subtotal: cartResponse.subtotal,
        discount_total: cartResponse.discount_total,
        tax_total: cartResponse.tax_total,
        total: cartResponse.total,
        item_count: cartResponse.item_count,
        applied_promo_code: cartResponse.applied_promo_code,
        items: cartResponse.items.map(function (it) {
          return {
            cart_item_id: it.cart_item_id,
            template_id: it.template_id,
            title: it.title,
            selected_license_type: it.selected_license_type,
            unit_price: it.unit_price,
            quantity: it.quantity,
            line_total: it.line_total,
            template: it.template
          };
        })
      },
      pricing_breakdown: pricing_breakdown
    };
  }

  // placeOrder()
  placeOrder() {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);

    if (!cart) {
      return {
        success: false,
        order_id: null,
        message: 'No cart to place order for',
        download_instructions: ''
      };
    }

    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });
    if (!itemsForCart.length) {
      return {
        success: false,
        order_id: null,
        message: 'Cart is empty',
        download_instructions: ''
      };
    }

    const updatedCart = this._recalculateCartTotals(cart);
    const session = this._getCurrentCheckoutSession();

    const orders = this._getFromStorage('orders', []);
    const orderId = this._generateId('order');

    const order = {
      id: orderId,
      cart_snapshot: updatedCart,
      items: itemsForCart,
      checkout_session_snapshot: session,
      created_at: this._nowIso()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    // Clear cart and current checkout session reference
    this._saveToStorage('cart', null);
    this._saveToStorage('cart_items', []);
    localStorage.setItem('current_checkout_session_id', 'null');

    return {
      success: true,
      order_id: orderId,
      message: 'Order placed successfully',
      download_instructions: 'Your downloads will be available in your account or via the confirmation email.'
    };
  }

  // toggleFavorite(templateId)
  toggleFavorite(templateId) {
    let favorites = this._getFromStorage('favorites', []);
    const existingIndex = favorites.findIndex(function (f) { return f.template_id === templateId; });

    if (existingIndex !== -1) {
      favorites.splice(existingIndex, 1);
    } else {
      favorites.push({
        id: this._generateId('fav'),
        template_id: templateId,
        added_at: this._nowIso()
      });
    }

    this._saveToStorage('favorites', favorites);

    const isFavorite = existingIndex === -1;
    return {
      is_favorite: isFavorite,
      favorites_count: favorites.length
    };
  }

  // getFavoritesList()
  getFavoritesList() {
    const favorites = this._getFromStorage('favorites', []);
    const templates = this._getFromStorage('templates', []);
    const categories = this._getFromStorage('categories', []);

    const items = favorites.map(function (fav) {
      const tmpl = templates.find(function (t) { return t.id === fav.template_id; }) || null;
      let templateObj = null;
      if (tmpl) {
        const category = categories.find(function (c) { return c.id === tmpl.category_id; });
        templateObj = {
          id: tmpl.id,
          title: tmpl.title,
          thumbnail_url: tmpl.thumbnail_url || null,
          price: tmpl.price,
          currency: tmpl.currency,
          is_free: !!tmpl.is_free,
          average_rating: typeof tmpl.average_rating === 'number' ? tmpl.average_rating : null,
          rating_count: typeof tmpl.rating_count === 'number' ? tmpl.rating_count : null,
          category_name: category ? category.name : ''
        };
      }
      return {
        favorite_id: fav.id,
        added_at: fav.added_at,
        template: templateObj
      };
    });

    return { items: items };
  }

  // getCollections()
  getCollections() {
    const collections = this._getFromStorage('collections', []);
    const collectionItems = this._getFromStorage('collection_items', []);

    const result = collections.map(function (col) {
      const count = collectionItems.filter(function (ci) { return ci.collection_id === col.id; }).length;
      return {
        id: col.id,
        name: col.name,
        description: col.description || '',
        created_at: col.created_at,
        updated_at: col.updated_at || null,
        template_count: count
      };
    });

    return { collections: result };
  }

  // createCollection(name, description)
  createCollection(name, description) {
    let collections = this._getFromStorage('collections', []);
    const now = this._nowIso();
    const collection = {
      id: this._generateId('col'),
      name: name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);

    return {
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        created_at: collection.created_at,
        updated_at: collection.updated_at,
        template_count: 0
      }
    };
  }

  // renameCollection(collectionId, newName)
  renameCollection(collectionId, newName) {
    let collections = this._getFromStorage('collections', []);
    const collectionItems = this._getFromStorage('collection_items', []);
    const index = collections.findIndex(function (c) { return c.id === collectionId; });

    if (index === -1) {
      return {
        success: false,
        message: 'Collection not found',
        collection: null
      };
    }

    collections[index].name = newName;
    collections[index].updated_at = this._nowIso();
    this._saveToStorage('collections', collections);

    const col = collections[index];
    const count = collectionItems.filter(function (ci) { return ci.collection_id === col.id; }).length;

    return {
      success: true,
      message: 'Collection renamed',
      collection: {
        id: col.id,
        name: col.name,
        description: col.description || '',
        created_at: col.created_at,
        updated_at: col.updated_at,
        template_count: count
      }
    };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    let collections = this._getFromStorage('collections', []);
    let collectionItems = this._getFromStorage('collection_items', []);

    const newCollections = collections.filter(function (c) { return c.id !== collectionId; });
    if (newCollections.length === collections.length) {
      return { success: false, message: 'Collection not found' };
    }

    const newItems = collectionItems.filter(function (ci) { return ci.collection_id !== collectionId; });

    this._saveToStorage('collections', newCollections);
    this._saveToStorage('collection_items', newItems);

    return { success: true, message: 'Collection deleted' };
  }

  // getCollectionItems(collectionId)
  getCollectionItems(collectionId) {
    const collections = this._getFromStorage('collections', []);
    const collectionItems = this._getFromStorage('collection_items', []);
    const templates = this._getFromStorage('templates', []);
    const categories = this._getFromStorage('categories', []);

    const collection = collections.find(function (c) { return c.id === collectionId; }) || null;

    if (!collection) {
      return { collection: null, items: [] };
    }

    const itemsRaw = collectionItems.filter(function (ci) { return ci.collection_id === collectionId; });

    const items = itemsRaw.map(function (ci) {
      const tmpl = templates.find(function (t) { return t.id === ci.template_id; }) || null;
      let templateObj = null;
      if (tmpl) {
        const category = categories.find(function (c) { return c.id === tmpl.category_id; });
        templateObj = {
          id: tmpl.id,
          title: tmpl.title,
          thumbnail_url: tmpl.thumbnail_url || null,
          price: tmpl.price,
          currency: tmpl.currency,
          is_free: !!tmpl.is_free,
          average_rating: typeof tmpl.average_rating === 'number' ? tmpl.average_rating : null,
          rating_count: typeof tmpl.rating_count === 'number' ? tmpl.rating_count : null,
          category_name: category ? category.name : ''
        };
      }
      return {
        collection_item_id: ci.id,
        added_at: ci.added_at,
        template: templateObj
      };
    });

    return {
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description || '',
        created_at: collection.created_at,
        updated_at: collection.updated_at || null
      },
      items: items
    };
  }

  // addTemplateToCollection(templateId, collectionId, newCollectionName, newCollectionDescription)
  addTemplateToCollection(templateId, collectionId, newCollectionName, newCollectionDescription) {
    let collections = this._getFromStorage('collections', []);
    let collectionItems = this._getFromStorage('collection_items', []);
    const now = this._nowIso();

    let collection = null;

    if (collectionId) {
      collection = collections.find(function (c) { return c.id === collectionId; }) || null;
      if (!collection) {
        return { collection: null, collection_item: null };
      }
    } else if (newCollectionName) {
      collection = {
        id: this._generateId('col'),
        name: newCollectionName,
        description: newCollectionDescription || '',
        created_at: now,
        updated_at: now
      };
      collections.push(collection);
      this._saveToStorage('collections', collections);
    } else {
      return { collection: null, collection_item: null };
    }

    const existing = collectionItems.find(function (ci) {
      return ci.collection_id === collection.id && ci.template_id === templateId;
    });

    let collectionItem;
    if (existing) {
      collectionItem = existing;
    } else {
      collectionItem = {
        id: this._generateId('coli'),
        collection_id: collection.id,
        template_id: templateId,
        added_at: now
      };
      collectionItems.push(collectionItem);
      this._saveToStorage('collection_items', collectionItems);
    }

    const templateCount = collectionItems.filter(function (ci) { return ci.collection_id === collection.id; }).length;

    return {
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description || '',
        created_at: collection.created_at,
        updated_at: collection.updated_at,
        template_count: templateCount
      },
      collection_item: {
        id: collectionItem.id,
        template_id: collectionItem.template_id,
        added_at: collectionItem.added_at
      }
    };
  }

  // removeTemplateFromCollection(collectionItemId)
  removeTemplateFromCollection(collectionItemId) {
    let collectionItems = this._getFromStorage('collection_items', []);
    const newItems = collectionItems.filter(function (ci) { return ci.id !== collectionItemId; });
    if (newItems.length === collectionItems.length) {
      return { success: false, message: 'Collection item not found' };
    }
    this._saveToStorage('collection_items', newItems);
    return { success: true, message: 'Removed from collection' };
  }

  // addToCompare(templateId)
  addToCompare(templateId) {
    let compareItems = this._getFromStorage('compare_items', []);

    const exists = compareItems.some(function (ci) { return ci.template_id === templateId; });
    if (!exists) {
      if (compareItems.length >= this.MAX_COMPARE_ITEMS) {
        // Remove the oldest item
        compareItems.sort(function (a, b) {
          const da = new Date(a.added_at).getTime();
          const db = new Date(b.added_at).getTime();
          return da - db;
        });
        compareItems.shift();
      }
      compareItems.push({
        id: this._generateId('cmp'),
        template_id: templateId,
        added_at: this._nowIso()
      });
      this._saveToStorage('compare_items', compareItems);
    }

    return {
      in_compare: true,
      compare_count: compareItems.length
    };
  }

  // removeFromCompare(templateId)
  removeFromCompare(templateId) {
    let compareItems = this._getFromStorage('compare_items', []);
    compareItems = compareItems.filter(function (ci) { return ci.template_id !== templateId; });
    this._saveToStorage('compare_items', compareItems);
    return {
      in_compare: false,
      compare_count: compareItems.length
    };
  }

  // getCompareList()
  getCompareList() {
    const compareItems = this._getFromStorage('compare_items', []);
    const templates = this._getFromStorage('templates', []);
    const categories = this._getFromStorage('categories', []);

    const templatesList = compareItems.map(function (ci) {
      const tmpl = templates.find(function (t) { return t.id === ci.template_id; }) || null;
      if (!tmpl) {
        return null;
      }
      const category = categories.find(function (c) { return c.id === tmpl.category_id; });
      return {
        template_id: tmpl.id,
        title: tmpl.title,
        thumbnail_url: tmpl.thumbnail_url || null,
        price: tmpl.price,
        currency: tmpl.currency,
        is_free: !!tmpl.is_free,
        average_rating: typeof tmpl.average_rating === 'number' ? tmpl.average_rating : null,
        rating_count: typeof tmpl.rating_count === 'number' ? tmpl.rating_count : null,
        resolutions: Array.isArray(tmpl.resolutions) ? tmpl.resolutions : [],
        photo_placeholder_count: typeof tmpl.photo_placeholder_count === 'number' ? tmpl.photo_placeholder_count : null,
        text_placeholder_count: typeof tmpl.text_placeholder_count === 'number' ? tmpl.text_placeholder_count : null,
        transition_count: typeof tmpl.transition_count === 'number' ? tmpl.transition_count : null,
        includes_sound: !!tmpl.includes_sound,
        ae_compatibility_versions: Array.isArray(tmpl.ae_compatibility_versions) ? tmpl.ae_compatibility_versions : [],
        category_name: category ? category.name : ''
      };
    }).filter(function (t) { return t !== null; });

    return {
      max_items: this.MAX_COMPARE_ITEMS,
      templates: templatesList
    };
  }

  // downloadFreeTemplate(templateId)
  downloadFreeTemplate(templateId) {
    const templates = this._getFromStorage('templates', []);
    const template = templates.find(function (t) { return t.id === templateId; }) || null;

    if (!template || !(template.is_free || template.price === 0)) {
      return {
        success: false,
        message: 'Template is not free or not found',
        download_url: ''
      };
    }

    // Simulate a download URL using slug or id
    const slug = template.slug || template.id;
    const downloadUrl = '/downloads/free/' + slug;

    // Instrumentation for task completion tracking (task_6)
    try {
      let arr = JSON.parse(localStorage.getItem('task6_freeDownloadTemplateIds') || '[]');
      if (!Array.isArray(arr)) {
        arr = [];
      }
      if (arr.indexOf(templateId) === -1) {
        arr.push(templateId);
        localStorage.setItem('task6_freeDownloadTemplateIds', JSON.stringify(arr));
      }
    } catch (e) {
      console.error('Instrumentation error (task_6):', e);
    }

    return {
      success: true,
      message: 'Download started',
      download_url: downloadUrl
    };
  }

  // getStaticPageContent(pageId)
  getStaticPageContent(pageId) {
    const pages = this._getFromStorage('static_pages', []);
    const page = pages.find(function (p) { return p.page_id === pageId; }) || null;

    if (!page) {
      return {
        page_id: pageId,
        title: '',
        html_content: '',
        last_updated: ''
      };
    }

    return {
      page_id: page.page_id,
      title: page.title || '',
      html_content: page.html_content || '',
      last_updated: page.last_updated || ''
    };
  }

  // submitContactForm(name, email, subject, message, orderReference, templateId)
  submitContactForm(name, email, subject, message, orderReference, templateId) {
    const validationErrors = [];
    if (!name || !name.trim()) validationErrors.push('Name is required');
    const emailStr = (email || '').trim();
    if (!emailStr) {
      validationErrors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        validationErrors.push('Email is invalid');
      }
    }
    if (!subject || !subject.trim()) validationErrors.push('Subject is required');
    if (!message || !message.trim()) validationErrors.push('Message is required');

    if (validationErrors.length) {
      return {
        success: false,
        message: validationErrors.join('; '),
        ticket_id: null
      };
    }

    const requests = this._getFromStorage('contact_requests', []);
    const ticketId = this._generateId('ticket');
    const req = {
      id: ticketId,
      name: name,
      email: emailStr,
      subject: subject,
      message: message,
      order_reference: orderReference || '',
      template_id: templateId || null,
      created_at: this._nowIso()
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      message: 'Your request has been submitted',
      ticket_id: ticketId
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