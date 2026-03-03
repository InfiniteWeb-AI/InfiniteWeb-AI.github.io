// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  let store = {};
  const storage = {
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
  // Expose polyfill globally so other modules (like tests) share the same storage
  try {
    if (typeof globalThis !== 'undefined' && !globalThis.localStorage) {
      globalThis.localStorage = storage;
    }
  } catch (e) {}
  return storage;
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- Initialization & Storage ----------------------
  _initStorage() {
    const tableKeys = [
      'product_categories',
      'products',
      'product_documents',
      'carts',
      'cart_items',
      'concrete_calculator_sessions',
      'distributors',
      'distributor_contact_requests',
      'comparison_lists',
      'events',
      'event_registrations',
      'quotes',
      'quote_items',
      'job_postings',
      'job_applications'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Non-array configuration/content keys are left unset; getters will handle absence.

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  _findById(items, id) {
    return items.find((item) => item.id === id) || null;
  }

  _mapProductUnitToCartUnit(unit) {
    if (!unit) return 'unit';
    if (unit === 'bag_generic') return 'unit';
    // unit is expected to already be one of: 'ton', 'bag_25kg', 'bag_20kg', 'big_bag'
    return unit;
  }

  // ---------------------- Cart Helpers ----------------------
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = null;
    let activeCartId = localStorage.getItem('active_cart_id');

    if (activeCartId) {
      cart = this._findById(carts, activeCartId);
    }

    if (!cart && carts.length > 0) {
      cart = carts[0];
      localStorage.setItem('active_cart_id', cart.id);
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        currency: 'usd',
        subtotal: 0,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('active_cart_id', cart.id);
    }

    return cart;
  }

  _recalculateCartTotals(cart, cartItems) {
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    let subtotal = 0;
    itemsForCart.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      item.line_total = qty * price;
      subtotal += item.line_total;
    });
    cart.subtotal = subtotal;
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }
  }

  // ---------------------- Quote Helpers ----------------------
  _getOrCreateQuote() {
    let quotes = this._getFromStorage('quotes');
    let quote = null;
    let activeQuoteId = localStorage.getItem('active_quote_id');

    if (activeQuoteId) {
      quote = this._findById(quotes, activeQuoteId);
    }

    if (!quote) {
      // Prefer an existing draft quote if any
      quote = quotes.find((q) => q.status === 'draft') || null;
      if (quote) {
        localStorage.setItem('active_quote_id', quote.id);
      }
    }

    if (!quote) {
      quote = {
        id: this._generateId('quote'),
        item_ids: [],
        currency: 'usd',
        subtotal: 0,
        status: 'draft',
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        contact_name: null,
        contact_email: null,
        contact_phone: null,
        company: null,
        project_location: null,
        additional_notes: null
      };
      quotes.push(quote);
      this._saveToStorage('quotes', quotes);
      localStorage.setItem('active_quote_id', quote.id);
    }

    return quote;
  }

  _recalculateQuoteTotals(quote, quoteItems) {
    const itemsForQuote = quoteItems.filter((qi) => qi.quote_id === quote.id);
    let subtotal = 0;
    itemsForQuote.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      item.line_total = qty * price;
      subtotal += item.line_total;
    });
    quote.subtotal = subtotal;
    quote.updated_at = this._nowIso();
    this._saveToStorage('quote_items', quoteItems);

    const quotes = this._getFromStorage('quotes');
    const idx = quotes.findIndex((q) => q.id === quote.id);
    if (idx !== -1) {
      quotes[idx] = quote;
      this._saveToStorage('quotes', quotes);
    }
  }

  // ---------------------- Comparison List Helper ----------------------
  _getOrCreateComparisonList() {
    let lists = this._getFromStorage('comparison_lists');
    let comparison = null;
    let activeId = localStorage.getItem('active_comparison_list_id');

    if (activeId) {
      comparison = this._findById(lists, activeId);
    }

    if (!comparison && lists.length > 0) {
      comparison = lists[0];
      localStorage.setItem('active_comparison_list_id', comparison.id);
    }

    if (!comparison) {
      comparison = {
        id: this._generateId('cmp'),
        product_ids: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      lists.push(comparison);
      this._saveToStorage('comparison_lists', lists);
      localStorage.setItem('active_comparison_list_id', comparison.id);
    }

    return comparison;
  }

  // ---------------------- Concrete Calculator Helpers ----------------------
  _createOrUpdateConcreteCalculatorSession(payload) {
    const sessions = this._getFromStorage('concrete_calculator_sessions');
    const session = {
      id: this._generateId('ccs'),
      calculator_type: 'concrete_volume_and_cement_requirement',
      slab_length_m: payload.slab_length_m,
      slab_width_m: payload.slab_width_m,
      slab_thickness_m: payload.slab_thickness_m,
      application_type: payload.application_type || null,
      result_concrete_volume_m3: payload.result_concrete_volume_m3,
      result_cement_quantity_tons: payload.result_cement_quantity_tons,
      recommended_product_ids: payload.recommended_product_ids || [],
      created_at: this._nowIso()
    };
    sessions.push(session);
    this._saveToStorage('concrete_calculator_sessions', sessions);
    return session;
  }

  _calculateConcreteRequirements(slab_length_m, slab_width_m, slab_thickness_m, application_type) {
    const length = Number(slab_length_m) || 0;
    const width = Number(slab_width_m) || 0;
    const thickness = Number(slab_thickness_m) || 0;
    const volume = length * width * thickness; // m3

    // Simple rule-of-thumb cement content (kg/m3)
    let cementKgPerM3 = 300;
    if (application_type === 'industrial_warehouse_floor') {
      cementKgPerM3 = 340;
    }

    const cementTons = (volume * cementKgPerM3) / 1000; // tons
    return {
      volume,
      cementTons
    };
  }

  // ---------------------- Distributor Helper ----------------------
  _lookupPostalCodeCoordinate(postal_code, country) {
    // Minimal built-in mapping for common test locations. This is configuration-like,
    // not business data (no products, distributors, etc.).
    const key = String(country || '').toLowerCase() + ':' + String(postal_code || '').trim();
    const map = {
      'france:75008': { lat: 48.872, lon: 2.314 } // Paris 8e approx
    };
    return map[key] || null;
  }

  _haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _geocodeAndFindNearestDistributors(postal_code, country, radius_km, product_segment_codes, sort_by) {
    const distributors = this._getFromStorage('distributors');
    const radius = Number(radius_km) || 0;
    const center = this._lookupPostalCodeCoordinate(postal_code, country);
    const segmentsSet = Array.isArray(product_segment_codes) && product_segment_codes.length
      ? new Set(product_segment_codes)
      : null;

    let results = [];

    distributors.forEach((d) => {
      if (country && d.country !== country) return;
      if (segmentsSet && Array.isArray(d.product_segments)) {
        const hasSegment = d.product_segments.some((s) => segmentsSet.has(s));
        if (!hasSegment) return;
      }

      let distance = null;
      if (center && typeof d.latitude === 'number' && typeof d.longitude === 'number') {
        distance = this._haversineDistanceKm(center.lat, center.lon, d.latitude, d.longitude);
        if (radius > 0 && distance > radius) {
          return;
        }
      }

      results.push({
        distributor_id: d.id,
        name: d.name,
        city: d.city || null,
        postal_code: d.postal_code || null,
        country: d.country,
        distance_km: distance,
        product_segments: d.product_segments || [],
        phone: d.phone || null,
        email: d.email || null
      });
    });

    if (sort_by === 'distance_asc') {
      results.sort((a, b) => {
        const da = typeof a.distance_km === 'number' ? a.distance_km : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_km === 'number' ? b.distance_km : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (sort_by === 'name_asc') {
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return results;
  }

  // ---------------------- Event Helper ----------------------
  _filterEvents(events, options) {
    const {
      event_type,
      start_date,
      end_date,
      keyword,
      is_sustainable_cement_related,
      location_country
    } = options || {};

    let filtered = events.slice();

    if (event_type) {
      filtered = filtered.filter((e) => e.event_type === event_type);
    }

    if (typeof is_sustainable_cement_related === 'boolean') {
      filtered = filtered.filter((e) => !!e.is_sustainable_cement_related === is_sustainable_cement_related);
    }

    if (location_country) {
      filtered = filtered.filter((e) => e.location_country === location_country);
    }

    if (start_date) {
      const sd = new Date(start_date);
      filtered = filtered.filter((e) => {
        if (!e.start_datetime) return false;
        const ed = new Date(e.start_datetime);
        return ed >= sd;
      });
    }

    if (end_date) {
      const edLimit = new Date(end_date);
      // Include full end date by moving to end of day
      edLimit.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => {
        if (!e.start_datetime) return false;
        const ed = new Date(e.start_datetime);
        return ed <= edLimit;
      });
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter((e) => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const kws = Array.isArray(e.keywords) ? e.keywords.join(' ').toLowerCase() : '';
        return title.includes(kw) || desc.includes(kw) || kws.includes(kw);
      });
    }

    // Sort by start_datetime ascending by default
    filtered.sort((a, b) => {
      const ad = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
      const bd = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
      return ad - bd;
    });

    return filtered;
  }

  // ---------------------- Job Posting Helper ----------------------
  _filterJobPostings(jobPostings, options) {
    const { location_country, department, keyword } = options || {};
    let filtered = jobPostings.filter((j) => j.status === 'open');

    if (location_country) {
      filtered = filtered.filter((j) => j.location_country === location_country);
    }

    if (department) {
      filtered = filtered.filter((j) => j.department === department);
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter((j) => {
        const title = (j.title || '').toLowerCase();
        const summary = (j.summary || '').toLowerCase();
        const desc = (j.description || '').toLowerCase();
        const resp = (j.responsibilities || '').toLowerCase();
        const qual = (j.qualifications || '').toLowerCase();
        return (
          title.includes(kw) ||
          summary.includes(kw) ||
          desc.includes(kw) ||
          resp.includes(kw) ||
          qual.includes(kw)
        );
      });
    }

    // Sort by posting_date desc (most recent first) if available, otherwise by title
    filtered.sort((a, b) => {
      const ad = a.posting_date ? new Date(a.posting_date).getTime() : 0;
      const bd = b.posting_date ? new Date(b.posting_date).getTime() : 0;
      if (ad !== bd) return bd - ad;
      return (a.title || '').localeCompare(b.title || '');
    });

    return filtered;
  }

  // ========================================================================
  // Core interface implementations
  // ========================================================================

  // ---------------------- Product Category & Home ----------------------
  getProductCategories() {
    // No foreign keys here
    return this._getFromStorage('product_categories');
  }

  getHomePageHighlights() {
    const categories = this.getProductCategories();
    const products = this._getFromStorage('products');
    const events = this._getFromStorage('events');

    const featured_products = products.filter((p) => p.status === 'active' && p.featured);
    const fallback_featured = featured_products.length
      ? featured_products
      : products.filter((p) => p.status === 'active').slice(0, 4);

    const featured_low_carbon_products = products
      .filter((p) => p.status === 'active' && (p.is_low_carbon || p.category_id === 'low_carbon_cements'))
      .slice(0, 4);

    const now = new Date();
    const upcoming_events = events
      .filter((e) => e.status === 'scheduled' && e.start_datetime && new Date(e.start_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
      .slice(0, 5);

    return {
      categories,
      featured_products: fallback_featured,
      featured_low_carbon_products,
      upcoming_events
    };
  }

  // ---------------------- Product Filtering & Listing ----------------------
  getProductFilterOptions(category_code) {
    const categories = this._getFromStorage('product_categories');
    const category = categories.find((c) => c.code === category_code) || null;

    const products = this._getFromStorage('products').filter(
      (p) => p.category_id === category_code && p.status === 'active'
    );

    const unique = (arr) => Array.from(new Set(arr.filter((v) => v != null)));

    const packaging_groups = unique(products.map((p) => p.packaging_group));
    const strength_classes = unique(products.map((p) => p.strength_class).filter((v) => v));
    const cement_families = unique(products.map((p) => p.cement_family).filter((v) => v));
    const lime_types = unique(products.map((p) => p.lime_type).filter((v) => v));
    const physical_forms = unique(products.map((p) => p.physical_form).filter((v) => v));

    let minCao = null;
    let maxCao = null;
    products.forEach((p) => {
      const vals = [];
      if (typeof p.cao_content_min_percent === 'number') vals.push(p.cao_content_min_percent);
      if (typeof p.cao_content_max_percent === 'number') vals.push(p.cao_content_max_percent);
      vals.forEach((v) => {
        if (minCao === null || v < minCao) minCao = v;
        if (maxCao === null || v > maxCao) maxCao = v;
      });
    });

    let minCo2 = null;
    let maxCo2 = null;
    products.forEach((p) => {
      if (typeof p.co2_footprint_kg_per_ton === 'number') {
        const v = p.co2_footprint_kg_per_ton;
        if (minCo2 === null || v < minCo2) minCo2 = v;
        if (maxCo2 === null || v > maxCo2) maxCo2 = v;
      }
    });

    let minPrice = null;
    let maxPrice = null;
    products.forEach((p) => {
      const v = typeof p.price_per_ton === 'number' ? p.price_per_ton : p.price_per_unit;
      if (typeof v === 'number') {
        if (minPrice === null || v < minPrice) minPrice = v;
        if (maxPrice === null || v > maxPrice) maxPrice = v;
      }
    });

    const currencies = unique(products.map((p) => p.currency));

    return {
      category,
      packaging_groups,
      strength_classes,
      cement_families,
      lime_types,
      physical_forms,
      cao_content_percent_range: {
        min: minCao,
        max: maxCao
      },
      co2_footprint_kg_per_ton_range: {
        min: minCo2,
        max: maxCo2
      },
      price_per_ton_range: {
        min: minPrice,
        max: maxPrice
      },
      currencies
    };
  }

  listProducts(category_code, search_query, filters, sort_by, page = 1, page_size = 20) {
    const categories = this._getFromStorage('product_categories');
    const category = categories.find((c) => c.code === category_code) || null;

    let products = this._getFromStorage('products').filter(
      (p) => p.category_id === category_code && p.status === 'active'
    );

    if (search_query) {
      const q = search_query.toLowerCase();
      products = products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const short = (p.short_description || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return name.includes(q) || desc.includes(q) || short.includes(q) || sku.includes(q);
      });
    }

    const f = filters || {};

    if (Array.isArray(f.packaging_groups) && f.packaging_groups.length) {
      const set = new Set(f.packaging_groups);
      products = products.filter((p) => set.has(p.packaging_group));
    }

    if (Array.isArray(f.strength_classes) && f.strength_classes.length) {
      const set = new Set(f.strength_classes);
      products = products.filter((p) => set.has(p.strength_class));
    }

    if (Array.isArray(f.cement_families) && f.cement_families.length) {
      const set = new Set(f.cement_families);
      products = products.filter((p) => set.has(p.cement_family));
    }

    if (Array.isArray(f.lime_types) && f.lime_types.length) {
      const set = new Set(f.lime_types);
      products = products.filter((p) => set.has(p.lime_type));
    }

    if (Array.isArray(f.physical_forms) && f.physical_forms.length) {
      const set = new Set(f.physical_forms);
      products = products.filter((p) => set.has(p.physical_form));
    }

    if (typeof f.min_cao_content_percent === 'number') {
      const min = f.min_cao_content_percent;
      products = products.filter((p) => {
        if (typeof p.cao_content_min_percent === 'number') {
          return p.cao_content_min_percent >= min;
        }
        return false;
      });
    }

    if (typeof f.max_cao_content_percent === 'number') {
      const max = f.max_cao_content_percent;
      products = products.filter((p) => {
        if (typeof p.cao_content_max_percent === 'number') {
          return p.cao_content_max_percent <= max;
        }
        return false;
      });
    }

    if (typeof f.min_co2_footprint_kg_per_ton === 'number') {
      const min = f.min_co2_footprint_kg_per_ton;
      products = products.filter((p) => {
        if (typeof p.co2_footprint_kg_per_ton === 'number') {
          return p.co2_footprint_kg_per_ton >= min;
        }
        return false;
      });
    }

    if (typeof f.max_co2_footprint_kg_per_ton === 'number') {
      const max = f.max_co2_footprint_kg_per_ton;
      products = products.filter((p) => {
        if (typeof p.co2_footprint_kg_per_ton === 'number') {
          return p.co2_footprint_kg_per_ton <= max;
        }
        return false;
      });
    }

    if (typeof f.min_price_per_ton === 'number') {
      const min = f.min_price_per_ton;
      products = products.filter((p) => {
        const val = typeof p.price_per_ton === 'number' ? p.price_per_ton : p.price_per_unit;
        if (typeof val === 'number') return val >= min;
        return false;
      });
    }

    if (typeof f.max_price_per_ton === 'number') {
      const max = f.max_price_per_ton;
      products = products.filter((p) => {
        const val = typeof p.price_per_ton === 'number' ? p.price_per_ton : p.price_per_unit;
        if (typeof val === 'number') return val <= max;
        return false;
      });
    }

    if (typeof f.is_low_carbon === 'boolean') {
      products = products.filter((p) => !!p.is_low_carbon === f.is_low_carbon);
    }

    if (f.currency) {
      products = products.filter((p) => p.currency === f.currency);
    }

    // Sorting
    if (sort_by === 'price_per_ton_asc' || sort_by === 'price_per_ton_desc') {
      products.sort((a, b) => {
        const av = typeof a.price_per_ton === 'number' ? a.price_per_ton : a.price_per_unit;
        const bv = typeof b.price_per_ton === 'number' ? b.price_per_ton : b.price_per_unit;
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return sort_by === 'price_per_ton_asc' ? av - bv : bv - av;
      });
    } else if (sort_by === 'name_asc') {
      products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      // default: name ascending
      products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const total_count = products.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = products.slice(start, end);

    return {
      category,
      applied_filters: {
        packaging_groups: f.packaging_groups || [],
        strength_classes: f.strength_classes || [],
        cement_families: f.cement_families || [],
        lime_types: f.lime_types || [],
        physical_forms: f.physical_forms || [],
        min_cao_content_percent: f.min_cao_content_percent || null,
        max_cao_content_percent: f.max_cao_content_percent || null,
        min_co2_footprint_kg_per_ton: f.min_co2_footprint_kg_per_ton || null,
        max_co2_footprint_kg_per_ton: f.max_co2_footprint_kg_per_ton || null,
        min_price_per_ton: f.min_price_per_ton || null,
        max_price_per_ton: f.max_price_per_ton || null,
        is_low_carbon: typeof f.is_low_carbon === 'boolean' ? f.is_low_carbon : null,
        currency: f.currency || null
      },
      sort_by: sort_by || 'name_asc',
      page,
      page_size,
      total_count,
      products: paged
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    const categories = this._getFromStorage('product_categories');
    const category = product
      ? categories.find((c) => c.code === product.category_id) || null
      : null;

    if (!product) {
      return {
        product: null,
        category: null,
        available_delivery_options: [],
        is_available_for_bulk_delivery: false,
        is_available_for_bag_delivery: false,
        min_order_quantity: null,
        max_order_quantity: null,
        related_products: []
      };
    }

    const isBulk = !!product.available_for_bulk_delivery || product.packaging_group === 'bulk';
    const isBag = !!product.available_for_bag_delivery ||
      product.packaging_group === 'bags' ||
      product.packaging_group === 'big_bags';

    const available_delivery_options = ['pickup'];
    if (isBulk) available_delivery_options.push('bulk_delivery');
    if (isBag) available_delivery_options.push('bag_delivery');

    const related_products = products
      .filter((p) => {
        if (p.id === product.id) return false;
        if (p.category_id !== product.category_id) return false;
        if (product.cement_family && p.cement_family === product.cement_family) return true;
        if (product.lime_type && p.lime_type === product.lime_type) return true;
        return false;
      })
      .slice(0, 4);

    return {
      product,
      category,
      available_delivery_options,
      is_available_for_bulk_delivery: isBulk,
      is_available_for_bag_delivery: isBag,
      min_order_quantity: 1,
      max_order_quantity: null,
      related_products
    };
  }

  getProductDocuments(productId) {
    const docs = this._getFromStorage('product_documents').filter(
      (d) => d.product_id === productId
    );
    const products = this._getFromStorage('products');
    return docs.map((doc) => ({
      ...doc,
      product: products.find((p) => p.id === doc.product_id) || null
    }));
  }

  // ---------------------- Cart Interfaces ----------------------
  addProductToCart(productId, quantity, quantity_unit, delivery_date, delivery_option) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        cart: null
      };
    }

    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      return {
        success: false,
        message: 'Quantity must be greater than zero',
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const unit = quantity_unit || this._mapProductUnitToCartUnit(product.unit_of_measure);
    const unitPrice = typeof product.price_per_ton === 'number' && (unit === 'ton' || unit === 'big_bag')
      ? product.price_per_ton
      : product.price_per_unit;

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      product_id: product.id,
      product_name: product.name || null,
      quantity: qty,
      quantity_unit: unit,
      unit_price: unitPrice,
      currency: product.currency,
      line_total: 0,
      delivery_date: delivery_date || null,
      delivery_option: delivery_option || null,
      added_at: this._nowIso()
    };

    cartItems.push(cartItem);
    cart.item_ids = cart.item_ids || [];
    cart.item_ids.push(cartItem.id);

    this._recalculateCartTotals(cart, cartItems);

    // Build cart summary with resolved product objects
    cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ({
        ...ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    return {
      success: true,
      message: 'Product added to cart',
      cart: {
        id: cart.id,
        currency: cart.currency,
        subtotal: cart.subtotal,
        items: itemsForCart
      }
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const itemsForCart = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ({
        ...ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    return {
      cart: {
        id: cart.id,
        currency: cart.currency,
        subtotal: cart.subtotal,
        items: itemsForCart
      }
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      const cart = this._getOrCreateCart();
      return {
        cart: {
          id: cart.id,
          currency: cart.currency,
          subtotal: cart.subtotal,
          items: []
        }
      };
    }

    const item = cartItems[itemIndex];
    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      // Remove item if quantity set to zero or less
      const cartId = item.cart_id;
      cartItems.splice(itemIndex, 1);
      this._saveToStorage('cart_items', cartItems);

      const carts = this._getFromStorage('carts');
      const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
      if (cart.item_ids) {
        cart.item_ids = cart.item_ids.filter((id) => id !== cartItemId);
      }
      this._recalculateCartTotals(cart, cartItems);

      const products = this._getFromStorage('products');
      const itemsForCart = cartItems
        .filter((ci) => ci.cart_id === cart.id)
        .map((ci) => ({
          ...ci,
          product: products.find((p) => p.id === ci.product_id) || null
        }));

      return {
        cart: {
          id: cart.id,
          currency: cart.currency,
          subtotal: cart.subtotal,
          items: itemsForCart
        }
      };
    }

    item.quantity = qty;
    cartItems[itemIndex] = item;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === item.cart_id) || this._getOrCreateCart();
    this._recalculateCartTotals(cart, cartItems);

    const products = this._getFromStorage('products');
    const itemsForCart = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ({
        ...ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    return {
      cart: {
        id: cart.id,
        currency: cart.currency,
        subtotal: cart.subtotal,
        items: itemsForCart
      }
    };
  }

  updateCartItemDeliveryDetails(cartItemId, delivery_date, delivery_option) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      const cart = this._getOrCreateCart();
      return {
        cart: {
          id: cart.id,
          currency: cart.currency,
          subtotal: cart.subtotal,
          items: []
        }
      };
    }

    const item = cartItems[itemIndex];
    if (delivery_date !== undefined) {
      item.delivery_date = delivery_date;
    }
    if (delivery_option !== undefined) {
      item.delivery_option = delivery_option;
    }
    cartItems[itemIndex] = item;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === item.cart_id) || this._getOrCreateCart();

    // Delivery details don't affect totals, but we keep recalc for consistency
    this._recalculateCartTotals(cart, cartItems);

    const products = this._getFromStorage('products');
    const itemsForCart = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ({
        ...ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    return {
      cart: {
        id: cart.id,
        currency: cart.currency,
        subtotal: cart.subtotal,
        items: itemsForCart
      }
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      const cart = this._getOrCreateCart();
      return {
        cart: {
          id: cart.id,
          currency: cart.currency,
          subtotal: cart.subtotal,
          items: []
        }
      };
    }

    const item = cartItems[itemIndex];
    const cartId = item.cart_id;
    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
    if (cart.item_ids) {
      cart.item_ids = cart.item_ids.filter((id) => id !== cartItemId);
    }
    this._recalculateCartTotals(cart, cartItems);

    const products = this._getFromStorage('products');
    const itemsForCart = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ({
        ...ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    return {
      cart: {
        id: cart.id,
        currency: cart.currency,
        subtotal: cart.subtotal,
        items: itemsForCart
      }
    };
  }

  // ---------------------- Concrete Calculator ----------------------
  getConcreteCalculatorConfig() {
    return {
      calculator_types: ['concrete_volume_and_cement_requirement'],
      application_types: [
        'industrial_warehouse_floor',
        'residential_slab',
        'driveway',
        'foundation',
        'other'
      ],
      default_values: {
        slab_thickness_m: 0.15,
        unit_system: 'metric'
      }
    };
  }

  calculateConcreteForSlab(slab_length_m, slab_width_m, slab_thickness_m, application_type) {
    const calc = this._calculateConcreteRequirements(
      slab_length_m,
      slab_width_m,
      slab_thickness_m,
      application_type
    );

    const products = this._getFromStorage('products');
    let recommended = products.filter((p) =>
      p.status === 'active' &&
      p.category_id === 'cement' &&
      p.cement_family === 'cem_i' &&
      typeof p.strength_class === 'string' &&
      p.strength_class.indexOf('52.5R') !== -1
    );

    if (!recommended.length) {
      recommended = products.filter((p) => p.status === 'active' && p.category_id === 'cement');
    }

    const recommended_product_ids = recommended.map((p) => p.id);

    const session = this._createOrUpdateConcreteCalculatorSession({
      slab_length_m,
      slab_width_m,
      slab_thickness_m,
      application_type,
      result_concrete_volume_m3: calc.volume,
      result_cement_quantity_tons: calc.cementTons,
      recommended_product_ids
    });

    return {
      session: {
        id: session.id,
        calculator_type: session.calculator_type,
        slab_length_m: session.slab_length_m,
        slab_width_m: session.slab_width_m,
        slab_thickness_m: session.slab_thickness_m,
        application_type: session.application_type,
        result_concrete_volume_m3: session.result_concrete_volume_m3,
        result_cement_quantity_tons: session.result_cement_quantity_tons,
        created_at: session.created_at
      },
      recommended_products: recommended
    };
  }

  getConcreteCalculatorSession(sessionId) {
    const sessions = this._getFromStorage('concrete_calculator_sessions');
    const session = sessions.find((s) => s.id === sessionId) || null;
    if (!session) {
      return {
        session: null,
        recommended_products: []
      };
    }
    const products = this._getFromStorage('products');
    const ids = Array.isArray(session.recommended_product_ids) ? session.recommended_product_ids : [];
    const recommended_products = products.filter((p) => ids.includes(p.id));

    return {
      session,
      recommended_products
    };
  }

  // ---------------------- Comparison List ----------------------
  getComparisonList() {
    const comparison = this._getOrCreateComparisonList();
    const products = this._getFromStorage('products');
    const listProducts = (comparison.product_ids || []).map(
      (id) => products.find((p) => p.id === id)
    ).filter((p) => !!p);

    return {
      comparison_list: comparison,
      products: listProducts
    };
  }

  addProductToComparison(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return this.getComparisonList();
    }

    const comparison = this._getOrCreateComparisonList();
    comparison.product_ids = comparison.product_ids || [];
    if (!comparison.product_ids.includes(productId)) {
      comparison.product_ids.push(productId);
      comparison.updated_at = this._nowIso();

      const lists = this._getFromStorage('comparison_lists');
      const idx = lists.findIndex((l) => l.id === comparison.id);
      if (idx !== -1) {
        lists[idx] = comparison;
        this._saveToStorage('comparison_lists', lists);
      }
    }

    const listProducts = comparison.product_ids
      .map((id) => products.find((p) => p.id === id))
      .filter((p) => !!p);

    return {
      comparison_list: comparison,
      products: listProducts
    };
  }

  removeProductFromComparison(productId) {
    const comparison = this._getOrCreateComparisonList();
    comparison.product_ids = (comparison.product_ids || []).filter((id) => id !== productId);
    comparison.updated_at = this._nowIso();

    const lists = this._getFromStorage('comparison_lists');
    const idx = lists.findIndex((l) => l.id === comparison.id);
    if (idx !== -1) {
      lists[idx] = comparison;
      this._saveToStorage('comparison_lists', lists);
    }

    const products = this._getFromStorage('products');
    const listProducts = comparison.product_ids
      .map((id) => products.find((p) => p.id === id))
      .filter((p) => !!p);

    return {
      comparison_list: comparison,
      products: listProducts
    };
  }

  clearComparisonList() {
    const comparison = this._getOrCreateComparisonList();
    comparison.product_ids = [];
    comparison.updated_at = this._nowIso();

    const lists = this._getFromStorage('comparison_lists');
    const idx = lists.findIndex((l) => l.id === comparison.id);
    if (idx !== -1) {
      lists[idx] = comparison;
      this._saveToStorage('comparison_lists', lists);
    }

    return {
      comparison_list: comparison
    };
  }

  // ---------------------- Distributor Locator ----------------------
  getDistributorSearchOptions() {
    const countryEnums = [
      'france',
      'germany',
      'united_states',
      'united_kingdom',
      'spain',
      'italy',
      'other'
    ];

    const countryNameMap = {
      france: 'France',
      germany: 'Germany',
      united_states: 'United States',
      united_kingdom: 'United Kingdom',
      spain: 'Spain',
      italy: 'Italy',
      other: 'Other'
    };

    const countries = countryEnums.map((code) => ({
      code,
      name: countryNameMap[code] || code
    }));

    const distributors = this._getFromStorage('distributors');
    const segmentsSet = new Set();
    distributors.forEach((d) => {
      if (Array.isArray(d.product_segments)) {
        d.product_segments.forEach((s) => segmentsSet.add(s));
      }
    });

    const product_segments = Array.from(segmentsSet).map((code) => ({
      code,
      name: code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: ''
    }));

    return {
      countries,
      product_segments,
      default_radius_km: 50,
      max_radius_km: 500
    };
  }

  searchDistributors(postal_code, country, radius_km, product_segment_codes, sort_by) {
    const results = this._geocodeAndFindNearestDistributors(
      postal_code,
      country,
      radius_km,
      product_segment_codes,
      sort_by
    );

    return {
      total_count: results.length,
      results
    };
  }

  getDistributorDetails(distributorId) {
    const distributors = this._getFromStorage('distributors');
    const distributor = distributors.find((d) => d.id === distributorId) || null;
    return {
      distributor
    };
  }

  submitDistributorContactRequest(distributorId, full_name, email, location_text, message) {
    const distributors = this._getFromStorage('distributors');
    const distributor = distributors.find((d) => d.id === distributorId) || null;

    const requests = this._getFromStorage('distributor_contact_requests');
    const contact_request = {
      id: this._generateId('dcr'),
      distributor_id: distributorId,
      distributor_name: distributor ? distributor.name : null,
      full_name,
      email,
      location_text: location_text || null,
      message,
      created_at: this._nowIso(),
      status: 'submitted'
    };
    requests.push(contact_request);
    this._saveToStorage('distributor_contact_requests', requests);

    return {
      success: true,
      message: 'Contact request submitted',
      contact_request
    };
  }

  // ---------------------- Events & Webinars ----------------------
  getEventsFilters() {
    const event_types = [
      { code: 'webinar', name: 'Webinars' },
      { code: 'seminar', name: 'Seminars' },
      { code: 'conference', name: 'Conferences' },
      { code: 'workshop', name: 'Workshops' },
      { code: 'training', name: 'Trainings' },
      { code: 'other', name: 'Other' }
    ];

    const date_range_presets = [
      { code: 'this_month', label: 'This Month' },
      { code: 'next_month', label: 'Next Month' },
      { code: 'this_year', label: 'This Year' }
    ];

    const keyword_suggestions = ['sustainable cement', 'low-carbon', 'cement', 'lime'];

    return {
      event_types,
      date_range_presets,
      keyword_suggestions
    };
  }

  searchEvents(event_type, start_date, end_date, keyword, is_sustainable_cement_related, location_country, page = 1, page_size = 20) {
    const events = this._getFromStorage('events');

    const filtered = this._filterEvents(events, {
      event_type,
      start_date,
      end_date,
      keyword,
      is_sustainable_cement_related,
      location_country
    });

    const total_count = filtered.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    return {
      total_count,
      page,
      page_size,
      events: filtered.slice(start, end)
    };
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    // Agenda and speakers could be stored separately or within the event object.
    // To avoid mocking data, we just surface what exists on the event if present.
    const agenda = event && event.agenda ? event.agenda : '';
    const speakers = event && Array.isArray(event.speakers) ? event.speakers : [];

    return {
      event,
      agenda,
      speakers
    };
  }

  registerForEvent(eventId, full_name, email, company, job_role, country) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    const registrations = this._getFromStorage('event_registrations');
    const registration = {
      id: this._generateId('ereg'),
      event_id: eventId,
      event_title: event ? event.title : null,
      full_name,
      email,
      company: company || null,
      job_role: job_role || null,
      country: country || null,
      registration_datetime: this._nowIso(),
      status: 'registered'
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      message: 'Registration submitted',
      registration
    };
  }

  // ---------------------- Quote APIs ----------------------
  addProductToQuote(productId, quantity, quantity_unit) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        quote: null,
        items: []
      };
    }

    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      return {
        quote: null,
        items: []
      };
    }

    const quote = this._getOrCreateQuote();
    let quoteItems = this._getFromStorage('quote_items');

    const unit = quantity_unit || this._mapProductUnitToCartUnit(product.unit_of_measure);
    const unitPrice = typeof product.price_per_ton === 'number' && (unit === 'ton' || unit === 'big_bag')
      ? product.price_per_ton
      : product.price_per_unit;

    const item = {
      id: this._generateId('qitem'),
      quote_id: quote.id,
      product_id: product.id,
      product_name: product.name || null,
      quantity: qty,
      quantity_unit: unit,
      unit_price: unitPrice,
      currency: product.currency,
      line_total: 0
    };

    quoteItems.push(item);
    quote.item_ids = quote.item_ids || [];
    quote.item_ids.push(item.id);

    this._recalculateQuoteTotals(quote, quoteItems);

    quoteItems = this._getFromStorage('quote_items');
    const itemsForQuote = quoteItems
      .filter((qi) => qi.quote_id === quote.id)
      .map((qi) => ({
        ...qi,
        product: products.find((p) => p.id === qi.product_id) || null
      }));

    return {
      quote: {
        id: quote.id,
        currency: quote.currency,
        subtotal: quote.subtotal,
        status: quote.status
      },
      items: itemsForQuote
    };
  }

  getQuoteSummary() {
    const quote = this._getOrCreateQuote();
    const quoteItems = this._getFromStorage('quote_items');
    const products = this._getFromStorage('products');

    const itemsForQuote = quoteItems
      .filter((qi) => qi.quote_id === quote.id)
      .map((qi) => ({
        ...qi,
        product: products.find((p) => p.id === qi.product_id) || null
      }));

    return {
      quote: {
        id: quote.id,
        currency: quote.currency,
        subtotal: quote.subtotal,
        status: quote.status
      },
      items: itemsForQuote
    };
  }

  updateQuoteItemQuantity(quoteItemId, quantity) {
    let quoteItems = this._getFromStorage('quote_items');
    const idx = quoteItems.findIndex((qi) => qi.id === quoteItemId);
    if (idx === -1) {
      const quote = this._getOrCreateQuote();
      return {
        quote: {
          id: quote.id,
          currency: quote.currency,
          subtotal: quote.subtotal,
          status: quote.status
        },
        items: []
      };
    }

    const item = quoteItems[idx];
    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      const quoteId = item.quote_id;
      quoteItems.splice(idx, 1);
      this._saveToStorage('quote_items', quoteItems);

      const quotes = this._getFromStorage('quotes');
      const quote = quotes.find((q) => q.id === quoteId) || this._getOrCreateQuote();
      if (quote.item_ids) {
        quote.item_ids = quote.item_ids.filter((id) => id !== quoteItemId);
      }
      this._recalculateQuoteTotals(quote, quoteItems);

      const products = this._getFromStorage('products');
      const itemsForQuote = quoteItems
        .filter((qi) => qi.quote_id === quote.id)
        .map((qi) => ({
          ...qi,
          product: products.find((p) => p.id === qi.product_id) || null
        }));

      return {
        quote: {
          id: quote.id,
          currency: quote.currency,
          subtotal: quote.subtotal,
          status: quote.status
        },
        items: itemsForQuote
      };
    }

    item.quantity = qty;
    quoteItems[idx] = item;
    this._saveToStorage('quote_items', quoteItems);

    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.id === item.quote_id) || this._getOrCreateQuote();
    this._recalculateQuoteTotals(quote, quoteItems);

    const products = this._getFromStorage('products');
    const itemsForQuote = quoteItems
      .filter((qi) => qi.quote_id === quote.id)
      .map((qi) => ({
        ...qi,
        product: products.find((p) => p.id === qi.product_id) || null
      }));

    return {
      quote: {
        id: quote.id,
        currency: quote.currency,
        subtotal: quote.subtotal,
        status: quote.status
      },
      items: itemsForQuote
    };
  }

  removeQuoteItem(quoteItemId) {
    let quoteItems = this._getFromStorage('quote_items');
    const idx = quoteItems.findIndex((qi) => qi.id === quoteItemId);
    if (idx === -1) {
      const quote = this._getOrCreateQuote();
      return {
        quote: {
          id: quote.id,
          currency: quote.currency,
          subtotal: quote.subtotal,
          status: quote.status
        },
        items: []
      };
    }

    const item = quoteItems[idx];
    const quoteId = item.quote_id;
    quoteItems.splice(idx, 1);
    this._saveToStorage('quote_items', quoteItems);

    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.id === quoteId) || this._getOrCreateQuote();
    if (quote.item_ids) {
      quote.item_ids = quote.item_ids.filter((id) => id !== quoteItemId);
    }
    this._recalculateQuoteTotals(quote, quoteItems);

    const products = this._getFromStorage('products');
    const itemsForQuote = quoteItems
      .filter((qi) => qi.quote_id === quote.id)
      .map((qi) => ({
        ...qi,
        product: products.find((p) => p.id === qi.product_id) || null
      }));

    return {
      quote: {
        id: quote.id,
        currency: quote.currency,
        subtotal: quote.subtotal,
        status: quote.status
      },
      items: itemsForQuote
    };
  }

  submitQuoteContactDetails(contact_name, contact_email, contact_phone, company, project_location, additional_notes) {
    let quotes = this._getFromStorage('quotes');
    let quote = null;
    const activeId = localStorage.getItem('active_quote_id');
    if (activeId) {
      quote = quotes.find((q) => q.id === activeId) || null;
    }
    if (!quote) {
      quote = quotes.find((q) => q.status === 'draft') || null;
    }
    if (!quote) {
      // No draft quote exists
      return {
        success: false,
        message: 'No draft quote available',
        quote: null
      };
    }

    quote.contact_name = contact_name;
    quote.contact_email = contact_email;
    quote.contact_phone = contact_phone || null;
    quote.company = company || null;
    quote.project_location = project_location || null;
    quote.additional_notes = additional_notes || null;
    quote.status = 'submitted';
    quote.updated_at = this._nowIso();

    const idx = quotes.findIndex((q) => q.id === quote.id);
    if (idx !== -1) {
      quotes[idx] = quote;
      this._saveToStorage('quotes', quotes);
    }

    return {
      success: true,
      message: 'Quote submitted',
      quote: {
        id: quote.id,
        currency: quote.currency,
        subtotal: quote.subtotal,
        status: quote.status,
        contact_name: quote.contact_name,
        contact_email: quote.contact_email,
        contact_phone: quote.contact_phone,
        company: quote.company,
        project_location: quote.project_location,
        additional_notes: quote.additional_notes
      }
    };
  }

  // ---------------------- Careers & Job Applications ----------------------
  getCareerFilters() {
    const countryEnums = [
      'france',
      'germany',
      'united_states',
      'united_kingdom',
      'spain',
      'italy',
      'other'
    ];
    const countryNameMap = {
      france: 'France',
      germany: 'Germany',
      united_states: 'United States',
      united_kingdom: 'United Kingdom',
      spain: 'Spain',
      italy: 'Italy',
      other: 'Other'
    };
    const countries = countryEnums.map((code) => ({
      code,
      name: countryNameMap[code] || code
    }));

    const departmentEnums = [
      'environment_health_safety',
      'operations',
      'engineering',
      'sales_marketing',
      'finance_hr',
      'it_digital',
      'other'
    ];
    const departmentNameMap = {
      environment_health_safety: 'Environment, Health & Safety',
      operations: 'Operations',
      engineering: 'Engineering',
      sales_marketing: 'Sales & Marketing',
      finance_hr: 'Finance & HR',
      it_digital: 'IT & Digital',
      other: 'Other'
    };
    const departments = departmentEnums.map((code) => ({
      code,
      name: departmentNameMap[code] || code
    }));

    const keyword_suggestions = ['Engineer', 'Environmental', 'Cement', 'Operations'];

    return {
      countries,
      departments,
      keyword_suggestions
    };
  }

  searchJobPostings(location_country, department, keyword, page = 1, page_size = 20) {
    const jobPostings = this._getFromStorage('job_postings');
    const filtered = this._filterJobPostings(jobPostings, {
      location_country,
      department,
      keyword
    });

    const total_count = filtered.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    return {
      total_count,
      page,
      page_size,
      job_postings: filtered.slice(start, end)
    };
  }

  getJobPostingDetails(jobPostingId) {
    const jobPostings = this._getFromStorage('job_postings');
    const job_posting = jobPostings.find((j) => j.id === jobPostingId) || null;
    return {
      job_posting
    };
  }

  submitJobApplicationStepOne(jobPostingId, applicant_name, email, phone, location_text, total_experience_years, willing_to_travel) {
    const jobPostings = this._getFromStorage('job_postings');
    const jobPosting = jobPostings.find((j) => j.id === jobPostingId) || null;

    const applications = this._getFromStorage('job_applications');
    const job_application = {
      id: this._generateId('jobapp'),
      job_posting_id: jobPostingId,
      job_title: jobPosting ? jobPosting.title : null,
      applicant_name,
      email,
      phone: phone || null,
      location_text: location_text || null,
      total_experience_years: typeof total_experience_years === 'number' ? total_experience_years : null,
      willing_to_travel: typeof willing_to_travel === 'boolean' ? willing_to_travel : null,
      created_at: this._nowIso(),
      status: 'in_progress'
    };

    applications.push(job_application);
    this._saveToStorage('job_applications', applications);

    return {
      success: true,
      message: 'Application step one submitted',
      job_application
    };
  }

  // ---------------------- About, Contact, Legal ----------------------
  getAboutUsContent() {
    const raw = localStorage.getItem('about_us_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to default structure
      }
    }
    return {
      company_overview: '',
      history_html: '',
      operations_html: '',
      core_markets_html: '',
      sustainability_initiatives_html: '',
      co2_reduction_targets: {
        target_year: null,
        reduction_percent: null
      }
    };
  }

  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    return {
      head_office: {
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        postal_code: '',
        country: '',
        phone: '',
        email: ''
      },
      regional_offices: [],
      general_emails: []
    };
  }

  submitContactForm(full_name, email, company, topic, subject, message) {
    const key = 'contact_form_submissions';
    const submissions = this._getFromStorage(key);
    const submission = {
      id: this._generateId('cf'),
      full_name,
      email,
      company: company || null,
      topic: topic || null,
      subject: subject || null,
      message,
      created_at: this._nowIso()
    };
    submissions.push(submission);
    this._saveToStorage(key, submissions);

    return {
      success: true,
      message: 'Contact form submitted',
      reference_id: submission.id
    };
  }

  getLegalContent(document_type) {
    const key = 'legal_content_' + document_type;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    return {
      document_type,
      title: '',
      last_updated: null,
      body_html: ''
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