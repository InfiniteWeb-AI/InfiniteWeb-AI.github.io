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
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Core entity tables from data model
    const tables = [
      'products',
      'therapeutic_areas',
      'indications',
      'product_documents',
      'sample_carts',
      'sample_cart_items',
      'newsletter_subscriptions',
      'financial_reports',
      'job_postings',
      'job_applications',
      'events',
      'event_registrations',
      'clinical_trials',
      'trial_contact_messages',
      'sustainability_targets',
      'sustainability_feedback',
      // Additional content buckets used by some getters (kept empty unless populated elsewhere)
      'news_articles',
      'hcp_resources'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Legacy/template keys (kept for compatibility, not used by core interfaces)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      // Ensure array
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : defaultValue;
    } catch (e) {
      return defaultValue;
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

  _parseDate(value) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // ----------------------
  // Sample cart helpers
  // ----------------------

  _getOrCreateSampleCart() {
    const carts = this._getFromStorage('sample_carts');
    let cart = carts.find(function (c) { return c.status === 'active'; });
    if (!cart) {
      cart = {
        id: this._generateId('sample_cart'),
        status: 'active',
        item_ids: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('sample_carts', carts);
    }
    return cart;
  }

  _recalculateSampleCartTotals(cart, allItems, products) {
    const cartItems = allItems.filter(function (it) { return it.cart_id === cart.id; });
    let totalItems = 0;
    let cartTotal = 0;
    let currency = null;

    const enrichedItems = cartItems.map(function (item) {
      totalItems += item.quantity;
      cartTotal += item.total_price;
      if (!currency) {
        currency = item.currency;
      }
      const product = products.find(function (p) { return p.id === item.product_id; }) || null;
      return {
        item_id: item.id,
        product_id: item.product_id,
        product_name: product ? product.name : null,
        strength_display: product ? product.strength_display : null,
        pack_size: product ? product.pack_size : null,
        pack_unit: product ? product.pack_unit : null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency: item.currency,
        total_price: item.total_price,
        product: product
      };
    });

    return {
      cart_id: cart.id,
      status: cart.status,
      items: enrichedItems,
      total_items: totalItems,
      cart_total: cartTotal,
      currency: currency
    };
  }

  // ----------------------
  // Newsletter helper
  // ----------------------

  _validateNewsletterSubscription(therapeuticAreaId, region, full_name, email, email_frequency, consent_to_communications) {
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return { valid: false, message: 'Full name is required.' };
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return { valid: false, message: 'Email is required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Email format is invalid.' };
    }
    if (!therapeuticAreaId) {
      return { valid: false, message: 'Therapeutic area is required.' };
    }
    const therapeuticAreas = this._getFromStorage('therapeutic_areas');
    const taExists = therapeuticAreas.some(function (ta) { return ta.id === therapeuticAreaId; });
    if (!taExists) {
      return { valid: false, message: 'Therapeutic area not found.' };
    }
    const allowedRegions = ['north_america', 'europe', 'asia_pacific', 'latin_america', 'middle_east_africa', 'global', 'other'];
    if (allowedRegions.indexOf(region) === -1) {
      return { valid: false, message: 'Region is invalid.' };
    }
    const allowedFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'];
    if (allowedFrequencies.indexOf(email_frequency) === -1) {
      return { valid: false, message: 'Email frequency is invalid.' };
    }
    if (!consent_to_communications) {
      return { valid: false, message: 'Consent to communications is required.' };
    }
    return { valid: true, message: 'OK' };
  }

  // ----------------------
  // Date/time helpers
  // ----------------------

  _buildDateRangeFromPreset(preset) {
    const now = new Date();
    let from = null;
    let to = null;

    if (preset === 'last_7_days') {
      to = new Date(now.getTime());
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (preset === 'last_30_days') {
      to = new Date(now.getTime());
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (preset === 'next_30_days') {
      from = new Date(now.getTime());
      to = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (preset === 'this_month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (preset === 'next_month') {
      const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const endNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
      from = startNextMonth;
      to = endNextMonth;
    }

    if (!from || !to) {
      return null;
    }
    return { from: from.toISOString(), to: to.toISOString() };
  }

  _filterEventsByTimeWindow(events, time_from, time_to) {
    if (!time_from && !time_to) return events;

    function parseTimeToMinutes(str) {
      if (!str || typeof str !== 'string') return null;
      const parts = str.split(':');
      if (parts.length < 2) return null;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    }

    const startMinutes = parseTimeToMinutes(time_from) || 0;
    const endMinutes = parseTimeToMinutes(time_to) || (24 * 60 - 1);

    return events.filter(function (event) {
      const d = new Date(event.start_datetime);
      if (isNaN(d.getTime())) return false;
      const minutes = d.getHours() * 60 + d.getMinutes();
      return minutes >= startMinutes && minutes <= endMinutes;
    });
  }

  // ----------------------
  // Clinical trial helper
  // ----------------------

  _matchClinicalTrialEligibility(trial, min_age, max_age, age_unit, recruitment_status) {
    // Recruitment status
    if (recruitment_status && trial.recruitment_status !== recruitment_status) {
      return false;
    }

    // Age unit compatibility
    if (age_unit && trial.age_unit && trial.age_unit !== age_unit) {
      return false;
    }

    // Age range overlap: trial[min,max] must intersect requested [min_age,max_age]
    const reqMin = typeof min_age === 'number' ? min_age : null;
    const reqMax = typeof max_age === 'number' ? max_age : null;

    if (reqMin !== null && typeof trial.max_age === 'number' && trial.max_age < reqMin) {
      return false;
    }
    if (reqMax !== null && typeof trial.min_age === 'number' && trial.min_age > reqMax) {
      return false;
    }

    return true;
  }

  // ----------------------
  // Template/example method (not used by core interfaces)
  // ----------------------

  addToCart(userId, productId, quantity) {
    // Kept for compatibility with provided template; not used by core tasks.
    if (typeof quantity !== 'number' || quantity <= 0) quantity = 1;
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cartItems');

    let cart = carts.find(function (c) { return c.userId === userId && c.status === 'active'; });
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        userId: userId,
        status: 'active'
      };
      carts.push(cart);
    }

    let item = cartItems.find(function (ci) { return ci.cartId === cart.id && ci.productId === productId; });
    if (item) {
      item.quantity += quantity;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId: productId,
        quantity: quantity
      };
      cartItems.push(item);
    }

    this._saveToStorage('carts', carts);
    this._saveToStorage('cartItems', cartItems);

    return { success: true, cartId: cart.id };
  }

  // =====================================================
  // INTERFACE IMPLEMENTATIONS
  // =====================================================

  // ----------------------
  // Homepage
  // ----------------------

  getHomeOverview() {
    const therapeuticAreas = this._getFromStorage('therapeutic_areas');
    const focusAreas = therapeuticAreas
      .filter(function (ta) { return ta.is_active; })
      .map(function (ta) {
        return {
          therapeutic_area_id: ta.id,
          therapeutic_area_name: ta.name,
          description: ta.description || ''
        };
      });

    // Allow overriding hero text via storage if present
    const stored = this._getObjectFromStorage('home_overview', {
      hero_title: '',
      hero_subtitle: '',
      company_summary: '',
      key_messages: []
    });

    return {
      hero_title: stored.hero_title || '',
      hero_subtitle: stored.hero_subtitle || '',
      company_summary: stored.company_summary || '',
      focus_areas: focusAreas,
      key_messages: Array.isArray(stored.key_messages) ? stored.key_messages : []
    };
  }

  getHomeFeaturedContent() {
    const products = this._getFromStorage('products');
    const therapeuticAreas = this._getFromStorage('therapeutic_areas');
    const indications = this._getFromStorage('indications');
    const events = this._getFromStorage('events');
    const financialReports = this._getFromStorage('financial_reports');
    const newsArticles = this._getFromStorage('news_articles');

    const featuredProducts = products
      .filter(function (p) { return p.product_status === 'active'; })
      .slice(0, 10)
      .map(function (p) {
        const ta = therapeuticAreas.find(function (t) { return t.id === p.therapeutic_area_id; }) || null;
        const ind = indications.find(function (i) { return i.id === p.primary_indication_id; }) || null;
        return {
          product_id: p.id,
          name: p.name,
          brand_name: p.brand_name,
          therapeutic_area_name: ta ? ta.name : null,
          primary_indication_name: ind ? ind.name : null,
          strength_display: p.strength_display || null,
          price_per_pack: p.price_per_pack,
          currency: p.currency,
          product: p
        };
      });

    const featuredNews = newsArticles
      .slice()
      .sort(function (a, b) {
        const da = new Date(a.published_at || 0).getTime();
        const db = new Date(b.published_at || 0).getTime();
        return db - da;
      })
      .slice(0, 5)
      .map(function (n) {
        return {
          news_id: n.news_id || n.id || null,
          title: n.title || '',
          published_at: n.published_at || null,
          summary: n.summary || ''
        };
      });

    const upcomingEvents = events
      .filter(function (e) {
        const d = new Date(e.start_datetime);
        return e.status === 'scheduled' && !isNaN(d.getTime()) && d.getTime() >= Date.now();
      })
      .sort(function (a, b) {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        return da - db;
      })
      .slice(0, 5)
      .map(function (e) {
        return {
          event_id: e.id,
          title: e.title,
          topic: e.topic,
          start_datetime: e.start_datetime,
          timezone: e.timezone
        };
      });

    const investorHighlights = financialReports
      .slice()
      .sort(function (a, b) {
        // prioritize latest year
        return (b.year || 0) - (a.year || 0);
      })
      .slice(0, 5)
      .map(function (r) {
        return {
          report_id: r.id,
          title: r.title,
          report_type: r.report_type,
          year: r.year
        };
      });

    return {
      featured_products: featuredProducts,
      featured_news: featuredNews,
      upcoming_events: upcomingEvents,
      investor_highlights: investorHighlights
    };
  }

  // ----------------------
  // Products & sample cart
  // ----------------------

  getProductTherapeuticAreas() {
    const therapeuticAreas = this._getFromStorage('therapeutic_areas');
    const products = this._getFromStorage('products');

    return therapeuticAreas.map(function (ta) {
      const count = products.filter(function (p) {
        return p.therapeutic_area_id === ta.id && p.product_status === 'active';
      }).length;
      return {
        id: ta.id,
        name: ta.name,
        description: ta.description || '',
        is_active: !!ta.is_active,
        product_count: count
      };
    });
  }

  getProductFilterOptions(therapeuticAreaId) {
    const productsAll = this._getFromStorage('products');
    const indications = this._getFromStorage('indications');
    const therapeuticAreas = this._getFromStorage('therapeutic_areas');

    const products = productsAll.filter(function (p) {
      if (therapeuticAreaId) {
        return p.therapeutic_area_id === therapeuticAreaId;
      }
      return true;
    });

    const indicationIds = {};
    products.forEach(function (p) {
      if (p.primary_indication_id) {
        indicationIds[p.primary_indication_id] = true;
      }
      if (Array.isArray(p.indication_ids)) {
        p.indication_ids.forEach(function (id) { indicationIds[id] = true; });
      }
    });

    const indicationsOptions = indications
      .filter(function (ind) { return !!indicationIds[ind.id]; })
      .map(function (ind) {
        const ta = therapeuticAreas.find(function (t) { return t.id === ind.therapeutic_area_id; }) || null;
        return {
          id: ind.id,
          name: ind.name,
          therapeutic_area_name: ta ? ta.name : null
        };
      });

    const dosageFormsSet = {};
    const strengthsSet = {};
    let minPrice = null;
    let maxPrice = null;
    let currency = null;

    products.forEach(function (p) {
      if (p.dosage_form) {
        dosageFormsSet[p.dosage_form] = true;
      }
      if (typeof p.strength_value === 'number' && p.strength_unit === 'mg') {
        strengthsSet[p.strength_value] = true;
      }
      if (typeof p.price_per_pack === 'number') {
        if (minPrice === null || p.price_per_pack < minPrice) minPrice = p.price_per_pack;
        if (maxPrice === null || p.price_per_pack > maxPrice) maxPrice = p.price_per_pack;
        if (!currency) currency = p.currency;
      }
    });

    return {
      indications: indicationsOptions,
      dosage_forms: Object.keys(dosageFormsSet),
      strengths_mg: Object.keys(strengthsSet).map(function (v) { return Number(v); }),
      price_range: {
        min_price: minPrice,
        max_price: maxPrice,
        currency: currency
      }
    };
  }

  searchProducts(query, filters, sortBy, page, pageSize) {
    const productsAll = this._getFromStorage('products');
    const therapeuticAreas = this._getFromStorage('therapeutic_areas');
    const indications = this._getFromStorage('indications');

    page = typeof page === 'number' && page > 0 ? page : 1;
    pageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    const q = query && typeof query === 'string' ? query.trim().toLowerCase() : '';
    filters = filters || {};

    let filtered = productsAll.filter(function (p) {
      if (p.product_status && p.product_status !== 'active') return false;

      if (q) {
        const haystack = [p.name, p.brand_name, p.generic_name, p.indications_text]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }

      if (filters.therapeuticAreaId && p.therapeutic_area_id !== filters.therapeuticAreaId) {
        return false;
      }

      if (filters.indicationId) {
        const pid = p.primary_indication_id;
        const list = Array.isArray(p.indication_ids) ? p.indication_ids : [];
        if (pid !== filters.indicationId && list.indexOf(filters.indicationId) === -1) {
          return false;
        }
      }

      if (filters.dosage_form && p.dosage_form !== filters.dosage_form) return false;

      if (typeof filters.strength_value === 'number') {
        if (p.strength_value !== filters.strength_value) return false;
      }

      if (filters.strength_unit && p.strength_unit !== filters.strength_unit) return false;

      if (typeof filters.price_min === 'number' && typeof p.price_per_pack === 'number' && p.price_per_pack < filters.price_min) {
        return false;
      }
      if (typeof filters.price_max === 'number' && typeof p.price_per_pack === 'number' && p.price_per_pack > filters.price_max) {
        return false;
      }

      if (filters.currency && p.currency !== filters.currency) return false;

      if (typeof filters.is_sample_available === 'boolean' && p.is_sample_available !== filters.is_sample_available) {
        return false;
      }

      return true;
    });

    if (sortBy === 'price_asc') {
      filtered.sort(function (a, b) { return (a.price_per_pack || 0) - (b.price_per_pack || 0); });
    } else if (sortBy === 'price_desc') {
      filtered.sort(function (a, b) { return (b.price_per_pack || 0) - (a.price_per_pack || 0); });
    } else if (sortBy === 'name_asc') {
      filtered.sort(function (a, b) {
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
    } else if (sortBy === 'name_desc') {
      filtered.sort(function (a, b) {
        return String(b.name || '').localeCompare(String(a.name || ''));
      });
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end).map(function (p) {
      const ta = therapeuticAreas.find(function (t) { return t.id === p.therapeutic_area_id; }) || null;
      const ind = indications.find(function (i) { return i.id === p.primary_indication_id; }) || null;
      return {
        id: p.id,
        name: p.name,
        brand_name: p.brand_name,
        generic_name: p.generic_name,
        therapeutic_area_id: p.therapeutic_area_id,
        therapeutic_area_name: ta ? ta.name : null,
        primary_indication_id: p.primary_indication_id,
        primary_indication_name: ind ? ind.name : null,
        dosage_form: p.dosage_form,
        route_of_administration: p.route_of_administration,
        strength_display: p.strength_display,
        pack_size: p.pack_size,
        pack_unit: p.pack_unit,
        price_per_pack: p.price_per_pack,
        currency: p.currency,
        is_sample_available: p.is_sample_available,
        product_status: p.product_status,
        therapeutic_area: ta,
        primary_indication: ind
      };
    });

    return {
      total: total,
      page: page,
      pageSize: pageSize,
      products: pageItems
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const therapeuticAreas = this._getFromStorage('therapeutic_areas');
    const indications = this._getFromStorage('indications');

    const p = products.find(function (prod) { return prod.id === productId; });
    if (!p) {
      return { product: null, computed: null };
    }

    // Instrumentation for task completion tracking
    try {
      let existingRaw = localStorage.getItem('task6_comparedProductIds');
      let ids = [];
      if (existingRaw) {
        try {
          ids = JSON.parse(existingRaw);
        } catch (e2) {
          ids = [];
        }
      }
      if (!Array.isArray(ids)) {
        ids = [];
      }
      if (ids.indexOf(productId) === -1) {
        ids.push(productId);
        localStorage.setItem('task6_comparedProductIds', JSON.stringify(ids));
      }
    } catch (e) {
      console.error('Instrumentation error (task6_comparedProductIds):', e);
    }

    const ta = therapeuticAreas.find(function (t) { return t.id === p.therapeutic_area_id; }) || null;
    const ind = indications.find(function (i) { return i.id === p.primary_indication_id; }) || null;

    const product = {
      id: p.id,
      name: p.name,
      brand_name: p.brand_name,
      generic_name: p.generic_name,
      therapeutic_area_id: p.therapeutic_area_id,
      therapeutic_area_name: ta ? ta.name : null,
      primary_indication_id: p.primary_indication_id,
      primary_indication_name: ind ? ind.name : null,
      indication_ids: p.indication_ids || [],
      indications_text: p.indications_text || '',
      dosage_form: p.dosage_form,
      route_of_administration: p.route_of_administration,
      strength_value: p.strength_value,
      strength_unit: p.strength_unit,
      strength_display: p.strength_display,
      pack_size: p.pack_size,
      pack_unit: p.pack_unit,
      price_per_pack: p.price_per_pack,
      currency: p.currency,
      is_sample_available: p.is_sample_available,
      product_status: p.product_status,
      description: p.description || '',
      created_at: p.created_at || null,
      updated_at: p.updated_at || null,
      therapeutic_area: ta,
      primary_indication: ind
    };

    let totalMgPerPack = null;
    let pricePerMg = null;
    if (typeof p.strength_value === 'number' && p.strength_unit === 'mg' && typeof p.pack_size === 'number') {
      totalMgPerPack = p.strength_value * p.pack_size;
      if (totalMgPerPack > 0 && typeof p.price_per_pack === 'number') {
        pricePerMg = p.price_per_pack / totalMgPerPack;
      }
    }

    return {
      product: product,
      computed: {
        total_mg_per_pack: totalMgPerPack,
        price_per_mg: pricePerMg
      }
    };
  }

  getProductSafetyDocuments(productId, language, documentType) {
    const docsAll = this._getFromStorage('product_documents');
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; }) || null;

    const docs = docsAll.filter(function (d) {
      if (!d.is_active) return false;
      if (d.product_id !== productId) return false;
      if (language && d.language !== language) return false;
      if (documentType && d.document_type !== documentType) return false;
      return true;
    }).map(function (d) {
      return {
        id: d.id,
        product_id: d.product_id,
        title: d.title,
        document_type: d.document_type,
        language: d.language,
        file_url: d.file_url,
        uploaded_at: d.uploaded_at || null,
        is_active: d.is_active,
        product: product
      };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task2_sdsQueryParams',
        JSON.stringify({
          product_id: productId,
          language: language || null,
          document_type: documentType || null,
          docs_found: docs.length,
          timestamp: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error (task2_sdsQueryParams):', e);
    }

    return docs;
  }

  addProductToSampleCart(productId, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      quantity = 1;
    }

    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; });
    if (!product) {
      return { success: false, message: 'Product not found.', cart: null };
    }
       if (!product.is_sample_available) {
      return { success: false, message: 'Sample not available for this product.', cart: null };
    }

    const items = this._getFromStorage('sample_cart_items');
    const cart = this._getOrCreateSampleCart();
    const carts = this._getFromStorage('sample_carts');

    let item = items.find(function (it) { return it.cart_id === cart.id && it.product_id === productId; });
    if (item) {
      item.quantity += quantity;
      item.total_price = item.unit_price * item.quantity;
    } else {
      item = {
        id: this._generateId('sample_cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity,
        unit_price: product.price_per_pack,
        currency: product.currency,
        total_price: product.price_per_pack * quantity,
        added_at: this._nowIso()
      };
      items.push(item);
      if (!Array.isArray(cart.item_ids)) {
        cart.item_ids = [];
      }
      cart.item_ids.push(item.id);
    }

    cart.updated_at = this._nowIso();

    // Persist changes
    const updatedCarts = carts.map(function (c) { return c.id === cart.id ? cart : c; });
    this._saveToStorage('sample_carts', updatedCarts);
    this._saveToStorage('sample_cart_items', items);

    const cartSummary = this._recalculateSampleCartTotals(cart, items, products);

    return {
      success: true,
      message: 'Product added to sample cart.',
      cart: cartSummary
    };
  }

  getSampleCart() {
    const carts = this._getFromStorage('sample_carts');
    const items = this._getFromStorage('sample_cart_items');
    const products = this._getFromStorage('products');

    const cart = carts.find(function (c) { return c.status === 'active'; });
    if (!cart) {
      return {
        cart_id: null,
        status: 'cleared',
        items: [],
        total_items: 0,
        cart_total: 0,
        currency: null
      };
    }

    return this._recalculateSampleCartTotals(cart, items, products);
  }

  updateSampleCartItemQuantity(cartItemId, quantity) {
    const items = this._getFromStorage('sample_cart_items');
    const carts = this._getFromStorage('sample_carts');
    const products = this._getFromStorage('products');

    const itemIndex = items.findIndex(function (it) { return it.id === cartItemId; });
    if (itemIndex === -1) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    const item = items[itemIndex];
    const cart = carts.find(function (c) { return c.id === item.cart_id; });
    if (!cart) {
      return { success: false, message: 'Cart not found for item.', cart: null };
    }

    if (quantity <= 0) {
      // Remove item
      items.splice(itemIndex, 1);
      if (Array.isArray(cart.item_ids)) {
        cart.item_ids = cart.item_ids.filter(function (id) { return id !== cartItemId; });
      }
    } else {
      item.quantity = quantity;
      item.total_price = item.unit_price * item.quantity;
      items[itemIndex] = item;
    }

    cart.updated_at = this._nowIso();

    const updatedCarts = carts.map(function (c) { return c.id === cart.id ? cart : c; });
    this._saveToStorage('sample_cart_items', items);
    this._saveToStorage('sample_carts', updatedCarts);

    const cartSummary = this._recalculateSampleCartTotals(cart, items, products);

    return {
      success: true,
      message: 'Cart updated.',
      cart: cartSummary
    };
  }

  removeSampleCartItem(cartItemId) {
    const items = this._getFromStorage('sample_cart_items');
    const carts = this._getFromStorage('sample_carts');
    const products = this._getFromStorage('products');

    const itemIndex = items.findIndex(function (it) { return it.id === cartItemId; });
    if (itemIndex === -1) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    const item = items[itemIndex];
    const cart = carts.find(function (c) { return c.id === item.cart_id; });
    if (!cart) {
      return { success: false, message: 'Cart not found for item.', cart: null };
    }

    items.splice(itemIndex, 1);
    if (Array.isArray(cart.item_ids)) {
      cart.item_ids = cart.item_ids.filter(function (id) { return id !== cartItemId; });
    }
    cart.updated_at = this._nowIso();

    const updatedCarts = carts.map(function (c) { return c.id === cart.id ? cart : c; });
    this._saveToStorage('sample_cart_items', items);
    this._saveToStorage('sample_carts', updatedCarts);

    const cartSummary = this._recalculateSampleCartTotals(cart, items, products);

    return {
      success: true,
      message: 'Item removed from cart.',
      cart: cartSummary
    };
  }

  submitSampleCartRequest(contactDetails) {
    const carts = this._getFromStorage('sample_carts');
    const items = this._getFromStorage('sample_cart_items');

    const cart = carts.find(function (c) { return c.status === 'active'; });
    if (!cart) {
      return { success: false, message: 'No active cart to submit.', request_reference: null };
    }

    const hasItems = items.some(function (it) { return it.cart_id === cart.id; });
    if (!hasItems) {
      return { success: false, message: 'Cart is empty.', request_reference: null };
    }

    cart.status = 'submitted';
    cart.updated_at = this._nowIso();
    if (contactDetails && typeof contactDetails === 'object') {
      cart.request_contact = contactDetails;
    }

    const updatedCarts = carts.map(function (c) { return c.id === cart.id ? cart : c; });
    this._saveToStorage('sample_carts', updatedCarts);

    const requestRef = 'SR-' + cart.id;
    return {
      success: true,
      message: 'Sample cart submitted successfully.',
      request_reference: requestRef
    };
  }

  // ----------------------
  // HCP & newsletters
  // ----------------------

  getHealthcareProfessionalsOverview() {
    const stored = this._getObjectFromStorage('hcp_overview', {
      intro_title: '',
      intro_body: '',
      highlighted_resources: []
    });

    return {
      intro_title: stored.intro_title || '',
      intro_body: stored.intro_body || '',
      highlighted_resources: Array.isArray(stored.highlighted_resources) ? stored.highlighted_resources : []
    };
  }

  getHcpResourcesList() {
    const resources = this._getFromStorage('hcp_resources');
    return resources.map(function (r) {
      return {
        resource_id: r.resource_id || r.id || null,
        title: r.title || '',
        description: r.description || '',
        resource_type: r.resource_type || '',
        file_url: r.file_url || null
      };
    });
  }

  getNewsletterSignupOptions() {
    const therapeuticAreas = this._getFromStorage('therapeutic_areas');
    const therapeutic_areas = therapeuticAreas.map(function (ta) {
      return { id: ta.id, name: ta.name };
    });

    const regions = ['north_america', 'europe', 'asia_pacific', 'latin_america', 'middle_east_africa', 'global', 'other'];
    const email_frequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'];

    return {
      therapeutic_areas: therapeutic_areas,
      regions: regions,
      email_frequencies: email_frequencies
    };
  }

  submitNewsletterSubscription(therapeuticAreaId, region, full_name, email, email_frequency, consent_to_communications) {
    const validation = this._validateNewsletterSubscription(
      therapeuticAreaId,
      region,
      full_name,
      email,
      email_frequency,
      consent_to_communications
    );

    if (!validation.valid) {
      return {
        success: false,
        subscription_id: null,
        message: validation.message
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      therapeutic_area_id: therapeuticAreaId,
      region: region,
      full_name: full_name,
      email: email,
      email_frequency: email_frequency,
      consent_to_communications: !!consent_to_communications,
      created_at: this._nowIso(),
      is_active: true
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription_id: subscription.id,
      message: 'Subscription created successfully.'
    };
  }

  // ----------------------
  // Investors & financial reports
  // ----------------------

  getInvestorsOverviewContent() {
    const stored = this._getObjectFromStorage('investors_overview', {
      intro_title: '',
      intro_body: '',
      key_metrics: []
    });

    return {
      intro_title: stored.intro_title || '',
      intro_body: stored.intro_body || '',
      key_metrics: Array.isArray(stored.key_metrics) ? stored.key_metrics : []
    };
  }

  getFinancialReportFilterOptions() {
    const reports = this._getFromStorage('financial_reports');

    const reportTypeSet = {};
    const yearSet = {};

    reports.forEach(function (r) {
      if (r.report_type) reportTypeSet[r.report_type] = true;
      if (typeof r.year === 'number') yearSet[r.year] = true;
    });

    return {
      report_types: Object.keys(reportTypeSet),
      years: Object.keys(yearSet).map(function (v) { return Number(v); })
    };
  }

  searchFinancialReports(report_type, year, page, pageSize) {
    const reportsAll = this._getFromStorage('financial_reports');
    page = typeof page === 'number' && page > 0 ? page : 1;
    pageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    let filtered = reportsAll.filter(function (r) {
      if (report_type && r.report_type !== report_type) return false;
      if (typeof year === 'number' && r.year !== year) return false;
      return true;
    });

    filtered.sort(function (a, b) {
      const ya = a.year || 0;
      const yb = b.year || 0;
      if (ya !== yb) return yb - ya;
      const da = new Date(a.published_at || 0).getTime();
      const db = new Date(b.published_at || 0).getTime();
      return db - da;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const pageItems = filtered.slice(start, end).map(function (r) {
      return {
        id: r.id,
        title: r.title,
        report_type: r.report_type,
        year: r.year,
        published_at: r.published_at || null,
        view_online_url: r.view_online_url || null,
        download_url: r.download_url || null
      };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task4_reportSearchParams',
        JSON.stringify({
          report_type: report_type || null,
          year: typeof year === 'number' ? year : null,
          total_results: total,
          timestamp: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error (task4_reportSearchParams):', e);
    }

    return {
      total: total,
      page: page,
      pageSize: pageSize,
      reports: pageItems
    };
  }

  getFinancialReportDetails(reportId) {
    const reports = this._getFromStorage('financial_reports');
    const r = reports.find(function (rep) { return rep.id === reportId; });
    if (!r) {
      return {
        id: null,
        title: null,
        report_type: null,
        year: null,
        published_at: null,
        description: null,
        view_online_url: null,
        download_url: null
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (r.id) {
        localStorage.setItem('task4_openedReportId', reportId);
      }
    } catch (e) {
      console.error('Instrumentation error (task4_openedReportId):', e);
    }

    return {
      id: r.id,
      title: r.title,
      report_type: r.report_type,
      year: r.year,
      published_at: r.published_at || null,
      description: r.description || null,
      view_online_url: r.view_online_url || null,
      download_url: r.download_url || null
    };
  }

  // ----------------------
  // Careers & jobs
  // ----------------------

  getCareersOverviewContent() {
    const overview = this._getObjectFromStorage('careers_overview', {
      intro_title: '',
      intro_body: '',
      culture_highlights: [],
      benefits_summary: ''
    });

    const jobs = this._getFromStorage('job_postings');

    const featuredJobsRaw = jobs
      .filter(function (j) { return j.status === 'open'; })
      .sort(function (a, b) {
        const da = new Date(a.posting_date || 0).getTime();
        const db = new Date(b.posting_date || 0).getTime();
        return db - da;
      })
      .slice(0, 5);

    const featured_jobs = featuredJobsRaw.map(function (j) {
      return {
        job_posting_id: j.id,
        title: j.title,
        location_city: j.location_city || '',
        location_country: j.location_country,
        posting_date: j.posting_date || null,
        job: j
      };
    });

    return {
      intro_title: overview.intro_title || '',
      intro_body: overview.intro_body || '',
      culture_highlights: Array.isArray(overview.culture_highlights) ? overview.culture_highlights : [],
      benefits_summary: overview.benefits_summary || '',
      featured_jobs: featured_jobs
    };
  }

  getJobSearchFilterOptions() {
    const jobs = this._getFromStorage('job_postings');
    const countrySet = {};

    jobs.forEach(function (j) {
      if (j.location_country) countrySet[j.location_country] = true;
    });

    return {
      countries: Object.keys(countrySet),
      date_posted_options: ['last_7_days', 'last_30_days', 'any_time'],
      sort_options: ['posting_date_desc', 'posting_date_asc']
    };
  }

  searchJobPostings(keyword, location_country, date_posted_range, sortBy, page, pageSize) {
    const jobsAll = this._getFromStorage('job_postings');
    page = typeof page === 'number' && page > 0 ? page : 1;
    pageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    const q = keyword && typeof keyword === 'string' ? keyword.trim().toLowerCase() : '';

    let dateFrom = null;
    if (date_posted_range === 'last_7_days' || date_posted_range === 'last_30_days') {
      const range = this._buildDateRangeFromPreset(date_posted_range);
      if (range) {
        dateFrom = this._parseDate(range.from);
      }
    }

    let filtered = jobsAll.filter(function (j) {
      if (j.status !== 'open') return false;

      if (q) {
        const haystack = [j.title, j.department, j.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }

      if (location_country && j.location_country !== location_country) return false;

      if (dateFrom) {
        const jd = new Date(j.posting_date || 0);
        if (isNaN(jd.getTime()) || jd.getTime() < dateFrom.getTime()) return false;
      }

      return true;
    });

    if (sortBy === 'posting_date_asc') {
      filtered.sort(function (a, b) {
        const da = new Date(a.posting_date || 0).getTime();
        const db = new Date(b.posting_date || 0).getTime();
        return da - db;
      });
    } else {
      // default desc
      filtered.sort(function (a, b) {
        const da = new Date(a.posting_date || 0).getTime();
        const db = new Date(b.posting_date || 0).getTime();
        return db - da;
      });
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const pageItems = filtered.slice(start, end).map(function (j) {
      return {
        id: j.id,
        title: j.title,
        department: j.department || '',
        location_city: j.location_city || '',
        location_country: j.location_country,
        location_type: j.location_type,
        employment_type: j.employment_type,
        posting_date: j.posting_date || null,
        status: j.status
      };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task5_jobSearchParams',
        JSON.stringify({
          keyword: keyword || null,
          location_country: location_country || null,
          date_posted_range: date_posted_range || null,
          sort_by: sortBy || null,
          total_results: total,
          timestamp: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error (task5_jobSearchParams):', e);
    }

    return {
      total: total,
      page: page,
      pageSize: pageSize,
      jobs: pageItems
    };
  }

  getJobPostingDetails(jobPostingId) {
    const jobs = this._getFromStorage('job_postings');
    const job = jobs.find(function (j) { return j.id === jobPostingId; });

    if (!job) {
      return {
        job: null,
        application_form_fields: []
      };
    }

    const application_form_fields = [
      { field_name: 'full_name', label: 'Full Name', type: 'text', required: true },
      { field_name: 'email', label: 'Email', type: 'email', required: true },
      { field_name: 'phone', label: 'Phone', type: 'text', required: false },
      { field_name: 'resume_url', label: 'Resume URL', type: 'url', required: false },
      { field_name: 'cover_letter', label: 'Cover Letter', type: 'textarea', required: false }
    ];

    // Instrumentation for task completion tracking
    try {
      if (job.id) {
        localStorage.setItem('task5_openedJobId', jobPostingId);
      }
    } catch (e) {
      console.error('Instrumentation error (task5_openedJobId):', e);
    }

    return {
      job: {
        id: job.id,
        title: job.title,
        department: job.department || '',
        location_city: job.location_city || '',
        location_country: job.location_country,
        location_type: job.location_type,
        employment_type: job.employment_type,
        description: job.description || '',
        responsibilities: job.responsibilities || '',
        requirements: job.requirements || '',
        posting_date: job.posting_date || null,
        status: job.status,
        apply_url: job.apply_url || null
      },
      application_form_fields: application_form_fields
    };
  }

  submitJobApplication(jobPostingId, full_name, email, phone, resume_url, cover_letter) {
    const jobs = this._getFromStorage('job_postings');
    const job = jobs.find(function (j) { return j.id === jobPostingId; });
    if (!job || job.status !== 'open') {
      return { success: false, application_id: null, message: 'Job not found or not open.' };
    }

    if (!full_name || !full_name.trim()) {
      return { success: false, application_id: null, message: 'Full name is required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, application_id: null, message: 'Valid email is required.' };
    }

    const apps = this._getFromStorage('job_applications');

    const app = {
      id: this._generateId('job_application'),
      job_posting_id: jobPostingId,
      full_name: full_name,
      email: email,
      phone: phone || null,
      resume_url: resume_url || null,
      cover_letter: cover_letter || null,
      submitted_at: this._nowIso(),
      application_status: 'submitted'
    };

    apps.push(app);
    this._saveToStorage('job_applications', apps);

    return {
      success: true,
      application_id: app.id,
      message: 'Application submitted successfully.'
    };
  }

  // ----------------------
  // News & Events
  // ----------------------

  getNewsOverviewContent() {
    const stored = this._getObjectFromStorage('news_overview', {
      intro_title: '',
      intro_body: ''
    });
    const articles = this._getFromStorage('news_articles');

    const top_news = articles
      .slice()
      .sort(function (a, b) {
        const da = new Date(a.published_at || 0).getTime();
        const db = new Date(b.published_at || 0).getTime();
        return db - da;
      })
      .slice(0, 5)
      .map(function (a) {
        return {
          news_id: a.news_id || a.id || null,
          title: a.title || '',
          summary: a.summary || '',
          published_at: a.published_at || null
        };
      });

    return {
      intro_title: stored.intro_title || '',
      intro_body: stored.intro_body || '',
      top_news: top_news
    };
  }

  getLatestNewsArticles(limit) {
    const articles = this._getFromStorage('news_articles');
    const lim = typeof limit === 'number' && limit > 0 ? limit : 10;

    return articles
      .slice()
      .sort(function (a, b) {
        const da = new Date(a.published_at || 0).getTime();
        const db = new Date(b.published_at || 0).getTime();
        return db - da;
      })
      .slice(0, lim)
      .map(function (a) {
        return {
          news_id: a.news_id || a.id || null,
          title: a.title || '',
          summary: a.summary || '',
          published_at: a.published_at || null
        };
      });
  }

  getEventsFilterOptions() {
    const events = this._getFromStorage('events');
    const topicSet = {};
    events.forEach(function (e) {
      if (e.topic) topicSet[e.topic] = true;
    });

    return {
      topics: Object.keys(topicSet),
      date_range_presets: ['next_month', 'this_month', 'next_30_days'],
      time_window_presets: ['morning', 'afternoon', 'evening']
    };
  }

  searchEvents(topic, date_from, date_to, time_from, time_to, event_type, format, only_upcoming) {
    const eventsAll = this._getFromStorage('events');

    const fromDate = date_from ? this._parseDate(date_from) : null;
    const toDate = date_to ? this._parseDate(date_to) : null;

    const upcomingOnly = typeof only_upcoming === 'boolean' ? only_upcoming : true;
    const now = new Date();

    let filtered = eventsAll.filter(function (e) {
      if (e.status !== 'scheduled') return false;
      if (topic && e.topic !== topic) return false;
      if (event_type && e.event_type !== event_type) return false;
      if (format && e.format !== format) return false;

      const start = new Date(e.start_datetime);
      if (isNaN(start.getTime())) return false;

      if (upcomingOnly && start.getTime() < now.getTime()) return false;

      if (fromDate && start.getTime() < fromDate.getTime()) return false;
      if (toDate && start.getTime() > toDate.getTime()) return false;

      return true;
    });

    filtered = this._filterEventsByTimeWindow(filtered, time_from, time_to);

    return filtered.map(function (e) {
      return {
        id: e.id,
        title: e.title,
        topic: e.topic,
        event_type: e.event_type,
        format: e.format,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        timezone: e.timezone,
        description: e.description || '',
        registration_open: !!e.registration_open,
        status: e.status
      };
    });
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const therapeuticAreas = this._getFromStorage('therapeutic_areas');

    const e = events.find(function (ev) { return ev.id === eventId; });
    if (!e) {
      return { event: null };
    }

    const ta = therapeuticAreas.find(function (t) { return t.id === e.therapeutic_area_id; }) || null;

    return {
      event: {
        id: e.id,
        title: e.title,
        topic: e.topic,
        therapeutic_area_id: e.therapeutic_area_id || null,
        event_type: e.event_type,
        format: e.format,
        description: e.description || '',
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        timezone: e.timezone,
        location: e.location || '',
        registration_open: !!e.registration_open,
        status: e.status,
        therapeutic_area: ta
      }
    };
  }

  submitEventRegistration(eventId, attendee_type, full_name, email, organization) {
    const events = this._getFromStorage('events');
    const event = events.find(function (e) { return e.id === eventId; });
    if (!event || !event.registration_open || event.status !== 'scheduled') {
      return { success: false, registration_id: null, message: 'Event not available for registration.' };
    }

    const allowedTypes = ['healthcare_professional', 'patient', 'caregiver', 'student', 'media', 'other'];
    if (allowedTypes.indexOf(attendee_type) === -1) {
      return { success: false, registration_id: null, message: 'Invalid attendee type.' };
    }

    if (!full_name || !full_name.trim()) {
      return { success: false, registration_id: null, message: 'Full name is required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, registration_id: null, message: 'Valid email is required.' };
    }

    const regs = this._getFromStorage('event_registrations');

    const reg = {
      id: this._generateId('event_registration'),
      event_id: eventId,
      attendee_type: attendee_type,
      full_name: full_name,
      email: email,
      organization: organization || null,
      registered_at: this._nowIso(),
      registration_status: 'registered'
    };

    regs.push(reg);
    this._saveToStorage('event_registrations', regs);

    return {
      success: true,
      registration_id: reg.id,
      message: 'Registration submitted successfully.'
    };
  }

  // ----------------------
  // Research & Development / Clinical trials
  // ----------------------

  getResearchAndDevelopmentOverview() {
    const stored = this._getObjectFromStorage('rnd_overview', {
      intro_title: '',
      intro_body: ''
    });
    const therapeuticAreas = this._getFromStorage('therapeutic_areas');

    const therapeutic_focus_areas = therapeuticAreas
      .filter(function (ta) { return ta.is_active; })
      .map(function (ta) {
        return {
          therapeutic_area_id: ta.id,
          therapeutic_area_name: ta.name,
          description: ta.description || ''
        };
      });

    return {
      intro_title: stored.intro_title || '',
      intro_body: stored.intro_body || '',
      therapeutic_focus_areas: therapeutic_focus_areas
    };
  }

  getClinicalTrialsFilterOptions() {
    const trials = this._getFromStorage('clinical_trials');

    const conditionSet = {};
    const countrySet = {};
    const recruitmentSet = {};
    const phaseSet = {};

    trials.forEach(function (t) {
      if (t.condition) conditionSet[t.condition] = true;
      if (Array.isArray(t.location_countries)) {
        t.location_countries.forEach(function (c) {
          if (c) countrySet[c] = true;
        });
      }
      if (t.primary_country) countrySet[t.primary_country] = true;
      if (t.recruitment_status) recruitmentSet[t.recruitment_status] = true;
      if (t.phase) phaseSet[t.phase] = true;
    });

    return {
      suggested_conditions: Object.keys(conditionSet),
      countries: Object.keys(countrySet),
      recruitment_statuses: Object.keys(recruitmentSet),
      phases: Object.keys(phaseSet)
    };
  }

  searchClinicalTrials(condition, min_age, max_age, age_unit, country, recruitment_status, phase, page, pageSize) {
    const trialsAll = this._getFromStorage('clinical_trials');
    page = typeof page === 'number' && page > 0 ? page : 1;
    pageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    const q = condition && typeof condition === 'string' ? condition.trim().toLowerCase() : '';

    let filtered = trialsAll.filter(function (t) {
      if (q) {
        const haystack = String(t.condition || '').toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }

      // Age and recruitment via helper
      if (!this._matchClinicalTrialEligibility(t, min_age, max_age, age_unit, recruitment_status)) {
        return false;
      }

      if (country) {
        const list = Array.isArray(t.location_countries) ? t.location_countries : [];
        const inList = list.indexOf(country) !== -1 || t.primary_country === country;
        if (!inList) return false;
      }

      if (phase && t.phase !== phase) return false;

      return true;
    }.bind(this));

    // Sort by start date ascending
    filtered.sort(function (a, b) {
      const da = new Date(a.start_date || 0).getTime();
      const db = new Date(b.start_date || 0).getTime();
      return da - db;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const pageItems = filtered.slice(start, end).map(function (t) {
      return {
        id: t.id,
        title: t.title,
        condition: t.condition,
        phase: t.phase,
        recruitment_status: t.recruitment_status,
        min_age: t.min_age,
        max_age: t.max_age,
        age_unit: t.age_unit,
        location_countries: Array.isArray(t.location_countries) ? t.location_countries : [],
        primary_country: t.primary_country || null,
        brief_summary: t.brief_summary || ''
      };
    });

    return {
      total: total,
      page: page,
      pageSize: pageSize,
      trials: pageItems
    };
  }

  getClinicalTrialDetails(clinicalTrialId) {
    const trials = this._getFromStorage('clinical_trials');
    const t = trials.find(function (tr) { return tr.id === clinicalTrialId; });
    if (!t) {
      return { trial: null };
    }

    return {
      trial: {
        id: t.id,
        title: t.title,
        condition: t.condition,
        phase: t.phase,
        recruitment_status: t.recruitment_status,
        min_age: t.min_age,
        max_age: t.max_age,
        age_unit: t.age_unit,
        location_countries: Array.isArray(t.location_countries) ? t.location_countries : [],
        primary_country: t.primary_country || null,
        brief_summary: t.brief_summary || '',
        detailed_description: t.detailed_description || '',
        start_date: t.start_date || null,
        end_date: t.end_date || null,
        protocol_id: t.protocol_id || null
      }
    };
  }

  submitTrialContactMessage(clinicalTrialId, name, email, message) {
    const trials = this._getFromStorage('clinical_trials');
    const trial = trials.find(function (t) { return t.id === clinicalTrialId; });
    if (!trial) {
      return { success: false, trial_contact_message_id: null, message: 'Trial not found.' };
    }

    if (!name || !name.trim()) {
      return { success: false, trial_contact_message_id: null, message: 'Name is required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, trial_contact_message_id: null, message: 'Valid email is required.' };
    }
    if (!message || !message.trim()) {
      return { success: false, trial_contact_message_id: null, message: 'Message is required.' };
    }

    const msgs = this._getFromStorage('trial_contact_messages');

    const msg = {
      id: this._generateId('trial_contact_message'),
      clinical_trial_id: clinicalTrialId,
      name: name,
      email: email,
      message: message,
      submitted_at: this._nowIso()
    };

    msgs.push(msg);
    this._saveToStorage('trial_contact_messages', msgs);

    return {
      success: true,
      trial_contact_message_id: msg.id,
      message: 'Message submitted successfully.'
    };
  }

  // ----------------------
  // Sustainability
  // ----------------------

  getSustainabilityOverviewContent() {
    const stored = this._getObjectFromStorage('sustainability_overview', {
      intro_title: '',
      intro_body: '',
      environment_section_intro: ''
    });

    return {
      intro_title: stored.intro_title || '',
      intro_body: stored.intro_body || '',
      environment_section_intro: stored.environment_section_intro || ''
    };
  }

  getEnvironmentTargets() {
    const targets = this._getFromStorage('sustainability_targets');
    return targets.map(function (t) {
      return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        metric_type: t.metric_type,
        baseline_year: t.baseline_year || null,
        baseline_value: t.baseline_value || null,
        target_year: t.target_year,
        target_value: t.target_value,
        target_unit: t.target_unit,
        scope: t.scope || '',
        is_active: !!t.is_active
      };
    });
  }

  getEnvironmentFeedbackOptions() {
    return {
      stakeholder_types: ['healthcare_professional', 'patient', 'investor', 'employee', 'community_member', 'other']
    };
  }

  submitSustainabilityFeedback(subject, message, stakeholder_type, name, email, sustainabilityTargetId) {
    if (!subject || !subject.trim()) {
      return { success: false, feedback_id: null, message: 'Subject is required.' };
    }
    if (!message || !message.trim()) {
      return { success: false, feedback_id: null, message: 'Message is required.' };
    }
    const allowed = ['healthcare_professional', 'patient', 'investor', 'employee', 'community_member', 'other'];
    if (allowed.indexOf(stakeholder_type) === -1) {
      return { success: false, feedback_id: null, message: 'Invalid stakeholder type.' };
    }
    if (!name || !name.trim()) {
      return { success: false, feedback_id: null, message: 'Name is required.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, feedback_id: null, message: 'Valid email is required.' };
    }

    const targets = this._getFromStorage('sustainability_targets');
    const targetExists = sustainabilityTargetId && targets.some(function (t) { return t.id === sustainabilityTargetId; });

    const feedbacks = this._getFromStorage('sustainability_feedback');
    const fb = {
      id: this._generateId('sustainability_feedback'),
      subject: subject,
      message: message,
      stakeholder_type: stakeholder_type,
      name: name,
      email: email,
      submitted_at: this._nowIso(),
      sustainability_target_id: targetExists ? sustainabilityTargetId : null
    };

    feedbacks.push(fb);
    this._saveToStorage('sustainability_feedback', feedbacks);

    return {
      success: true,
      feedback_id: fb.id,
      message: 'Feedback submitted successfully.'
    };
  }

  // ----------------------
  // About page
  // ----------------------

  getAboutPageContent() {
    const stored = this._getObjectFromStorage('about_page_content', {
      history: '',
      mission: '',
      vision: '',
      leadership_summary: '',
      business_areas: [],
      contact_summary: ''
    });

    return {
      history: stored.history || '',
      mission: stored.mission || '',
      vision: stored.vision || '',
      leadership_summary: stored.leadership_summary || '',
      business_areas: Array.isArray(stored.business_areas) ? stored.business_areas : [],
      contact_summary: stored.contact_summary || ''
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
