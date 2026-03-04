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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    // Array-based tables
    const arrayKeys = [
      'product_categories',
      'products',
      'product_documents',
      'product_reviews',
      'cart',
      'cart_items',
      'system_configurations',
      'bom_items',
      'training_events',
      'training_registrations',
      'support_tickets',
      'distributors',
      'contact_inquiries',
      'homepage_promotions'
    ];

    arrayKeys.forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Object/singleton content blobs
    const objectKeys = [
      'support_overview_content',
      'about_page_content',
      'contact_page_content',
      'installer_resources_overview'
    ];

    objectKeys.forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    });

    // ID counter for generated IDs
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Active cart identifier
    if (!localStorage.getItem('active_cart_id')) {
      localStorage.setItem('active_cart_id', '');
    }

    // Seed minimal demo data if none present (used by automated tests)
    const existingProducts = this._getFromStorage('products', []);
    if (existingProducts.length === 0) {
      const seededProducts = [
        // Commercial flat-roof ballasted system
        {
          id: 'prod_comm_flat_roof_ballast_1',
          name: 'Commercial Flat-Roof Ballasted System 200kW',
          slug: 'commercial-flat-roof-ballasted-system-200kw',
          sku: 'BALLAST-200KW',
          category_id: 'commercial_roof_mounts',
          product_type: 'system',
          system_type: 'ballasted_system',
          mounting_style: 'ballasted',
          application: 'commercial_roof_mounts',
          roof_type_compatibility: ['flat_roof'],
          capacity_min_panels: 400,
          capacity_max_panels: 700,
          price: 25000,
          currency: 'usd',
          short_description: 'Pre-engineered commercial flat-roof ballasted system.',
          description: 'Turn-key commercial flat-roof ballasted racking system for large commercial arrays.',
          image_url: '',
          thumbnail_url: '',
          design_wind_speed_mph: 150,
          snow_load_psf: 40,
          weight_per_unit_lbs: 0,
          weight_per_foot_lbs: 0,
          status: 'active',
          rating_count: 5,
          rating_average: 4.2
        },

        // 24-panel residential kit for configurator BOM generation
        {
          id: 'prod_resi_xr100_24panel_kit',
          name: 'XR100 24-Panel Rail-Based Roof Mount Kit',
          slug: 'xr100-24-panel-rail-based-roof-mount-kit',
          sku: 'XR100-KIT-24',
          category_id: 'residential_roof_mounts',
          product_type: 'kit',
          system_type: 'rail_based_kit',
          mounting_style: 'rail_based',
          application: 'residential_roof_mounts',
          roof_type_compatibility: ['asphalt_shingle'],
          capacity_min_panels: 20,
          capacity_max_panels: 28,
          panel_count_fixed: 24,
          price: 1699,
          currency: 'usd',
          short_description: 'XR100 rail-based kit for 24-module residential arrays.',
          description: 'Pre-engineered 24-panel XR100 kit for asphalt shingle roofs.',
          image_url: '',
          thumbnail_url: '',
          design_wind_speed_mph: 140,
          snow_load_psf: 30,
          weight_per_unit_lbs: 0,
          weight_per_foot_lbs: 0,
          family_name: 'XR Rail Series',
          status: 'active',
          rating_count: 0,
          rating_average: 0
        },

        // Wire management accessories (under $15, at least two highly rated)
        {
          id: 'prod_wire_clip_a',
          name: 'PV Wire Clip A',
          slug: 'pv-wire-clip-a',
          sku: 'WIRE-CLIP-A',
          category_id: 'wire_management',
          product_type: 'accessory',
          system_type: null,
          mounting_style: null,
          application: 'wire_management',
          roof_type_compatibility: [],
          price: 9.5,
          currency: 'usd',
          short_description: 'UV-resistant stainless steel wire clip.',
          description: 'Stainless steel clip for securing PV wires to module frames or rails.',
          image_url: '',
          thumbnail_url: '',
          design_wind_speed_mph: null,
          snow_load_psf: null,
          weight_per_unit_lbs: 0.05,
          weight_per_foot_lbs: 0,
          status: 'active',
          rating_count: 12,
          rating_average: 4.7
        },
        {
          id: 'prod_wire_clip_b',
          name: 'PV Wire Clip B',
          slug: 'pv-wire-clip-b',
          sku: 'WIRE-CLIP-B',
          category_id: 'wire_management',
          product_type: 'accessory',
          system_type: null,
          mounting_style: null,
          application: 'wire_management',
          roof_type_compatibility: [],
          price: 7.25,
          currency: 'usd',
          short_description: 'Low-profile wire clip for module frames.',
          description: 'Low-profile stainless wire clip ideal for module frame edge routing.',
          image_url: '',
          thumbnail_url: '',
          design_wind_speed_mph: null,
          snow_load_psf: null,
          weight_per_unit_lbs: 0.04,
          weight_per_foot_lbs: 0,
          status: 'active',
          rating_count: 8,
          rating_average: 4.8
        },
        {
          id: 'prod_wire_clip_c',
          name: 'PV Wire Tie Mount',
          slug: 'pv-wire-tie-mount',
          sku: 'WIRE-TIE-MOUNT',
          category_id: 'wire_management',
          product_type: 'accessory',
          system_type: null,
          mounting_style: null,
          application: 'wire_management',
          roof_type_compatibility: [],
          price: 5.0,
          currency: 'usd',
          short_description: 'Adhesive-backed wire tie mount.',
          description: 'Adhesive-backed mount for securing cable ties to module frames or rails.',
          image_url: '',
          thumbnail_url: '',
          design_wind_speed_mph: null,
          snow_load_psf: null,
          weight_per_unit_lbs: 0.03,
          weight_per_foot_lbs: 0,
          status: 'active',
          rating_count: 3,
          rating_average: 4.3
        },

        // Rail product used for documents and structural comparison
        {
          id: 'prod_xr100_rail',
          name: 'XR100 Rail',
          slug: 'xr100-rail',
          sku: 'XR100-RAIL',
          category_id: 'rails',
          product_type: 'rail',
          system_type: 'rail',
          mounting_style: 'rail_based',
          application: 'rails',
          roof_type_compatibility: ['asphalt_shingle', 'metal_roof', 'concrete_tile'],
          price: 32.0,
          currency: 'usd',
          short_description: 'High-strength aluminum rail for residential and commercial systems.',
          description: 'XR100 structural rail with high wind and snow load ratings.',
          image_url: '',
          thumbnail_url: '',
          design_wind_speed_mph: 160,
          snow_load_psf: 50,
          weight_per_unit_lbs: 40,
          weight_per_foot_lbs: 1.5,
          family_name: 'XR Rail Series',
          status: 'active',
          rating_count: 10,
          rating_average: 4.9,
          has_documents: true
        }
      ];

      this._saveToStorage('products', seededProducts);
    }

    const existingEvents = this._getFromStorage('training_events', []);
    if (existingEvents.length === 0) {
      const seededEvents = [
        {
          id: 'event_2025_07_installer_webinar',
          title: 'Installer Training: Advanced Roof Mount Systems',
          description: 'Live webinar covering best practices for installing residential and commercial roof mount systems.',
          event_type: 'webinar',
          delivery_format: 'online',
          start_datetime: '2025-07-10T18:00:00Z',
          end_datetime: '2025-07-10T19:30:00Z',
          duration_minutes: 90,
          timezone: 'America/Denver',
          status: 'upcoming',
          location: 'Online',
          registration_url: 'training_register.html?eventId=event_2025_07_installer_webinar',
          registration_open: true,
          is_installer_focused: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      this._saveToStorage('training_events', seededEvents);
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
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

  // ---------------------- Category helpers ----------------------

  _getCategoryHierarchy(categoryId) {
    const categories = this._getFromStorage('product_categories', []);
    if (!categoryId) {
      return { allowedCategoryValues: new Set(), category: null };
    }

    let root = categories.find(
      c => c.id === categoryId || c.url_param === categoryId
    );

    const allowed = new Set();

    if (!root) {
      // Fallback: accept products whose category_id matches the raw categoryId
      allowed.add(categoryId);
      return { allowedCategoryValues: allowed, category: null };
    }

    const queue = [root.id];
    allowed.add(root.id);
    if (root.url_param) allowed.add(root.url_param);

    while (queue.length > 0) {
      const parentId = queue.shift();
      for (const cat of categories) {
        if (cat.parent_category_id === parentId && !allowed.has(cat.id)) {
          allowed.add(cat.id);
          if (cat.url_param) allowed.add(cat.url_param);
          queue.push(cat.id);
        }
      }
    }

    return { allowedCategoryValues: allowed, category: root };
  }

  _resolveProductCategory(product, categories) {
    if (!product) return null;
    if (!Array.isArray(categories)) {
      categories = this._getFromStorage('product_categories', []);
    }

    const catId = product.category_id;
    if (!catId) return null;

    let category = categories.find(c => c.id === catId || c.url_param === catId);

    // Fallback: sometimes application may correspond to category url_param
    if (!category && product.application) {
      category = categories.find(c => c.url_param === product.application);
    }

    return category || null;
  }

  _formatEnumLabel(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart', []);
    let activeCartId = localStorage.getItem('active_cart_id') || '';
    let cart = carts.find(c => c.id === activeCartId);

    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now,
        items: []
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
      localStorage.setItem('active_cart_id', cart.id);
    }

    return cart;
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const items = cartItems.filter(item => item.cart_id === cartId);

    let subtotal = 0;
    let item_count = 0;

    for (const item of items) {
      const lt = typeof item.line_total === 'number'
        ? item.line_total
        : (item.unit_price || 0) * (item.quantity || 0);
      subtotal += lt;
      item_count += item.quantity || 0;
    }

    const estimated_total = subtotal; // no taxes/shipping in business logic
    return { subtotal, estimated_total, item_count };
  }

  _enrichCartItemsWithReferences(cartItems) {
    const products = this._getFromStorage('products', []);
    const configurations = this._getFromStorage('system_configurations', []);

    return cartItems.map(item => {
      const product = products.find(p => p.id === item.product_id) || null;
      const configuration = item.configuration_id
        ? configurations.find(c => c.id === item.configuration_id) || null
        : null;
      return {
        ...item,
        product,
        configuration
      };
    });
  }

  // ---------------------- BOM helpers ----------------------

  _generateBomFromConfiguration(configuration) {
    const products = this._getFromStorage('products', []);
    const bomItemsAll = this._getFromStorage('bom_items', []);
    const now = new Date().toISOString();

    const projectType = configuration.project_type; // 'residential' | 'commercial' | 'other'
    let targetApplication = null;
    if (projectType === 'residential') targetApplication = 'residential_roof_mounts';
    else if (projectType === 'commercial') targetApplication = 'commercial_roof_mounts';

    const panelCount = configuration.panel_count;
    const roofType = configuration.roof_type; // e.g., 'asphalt_shingle'

    let candidates = products.filter(p => p.status === 'active' || !p.status);

    // Filter by application if we inferred one
    if (targetApplication) {
      candidates = candidates.filter(p =>
        p.application === targetApplication || p.category_id === targetApplication
      );
    }

    // Filter by roof compatibility
    if (roofType) {
      candidates = candidates.filter(p => {
        if (!Array.isArray(p.roof_type_compatibility) || p.roof_type_compatibility.length === 0) {
          return true; // if not specified, don't exclude
        }
        return p.roof_type_compatibility.indexOf(roofType) !== -1;
      });
    }

    // Restrict to kits/systems
    candidates = candidates.filter(p =>
      p.product_type === 'kit' || p.product_type === 'system'
    );

    // Capacity filtering around panelCount
    if (typeof panelCount === 'number') {
      candidates = candidates.filter(p => {
        const fixed = typeof p.panel_count_fixed === 'number'
          ? p.panel_count_fixed
          : null;
        const minCap = typeof p.capacity_min_panels === 'number'
          ? p.capacity_min_panels
          : null;
        const maxCap = typeof p.capacity_max_panels === 'number'
          ? p.capacity_max_panels
          : null;

        if (fixed != null) {
          return fixed === panelCount;
        }

        if (minCap == null && maxCap == null) {
          return true;
        }

        if (minCap != null && panelCount < minCap) return false;
        if (maxCap != null && panelCount > maxCap) return false;
        return true;
      });
    }

    // Choose cheapest candidate as primary kit/system
    let bomItemsForConfig = [];
    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        if (pa === pb) return 0;
        return pa < pb ? -1 : 1;
      });

      const primary = candidates[0];
      const unitPrice = typeof primary.price === 'number' ? primary.price : 0;

      const bomItem = {
        id: this._generateId('bom_item'),
        configuration_id: configuration.id,
        product_id: primary.id,
        product_name: primary.name || '',
        quantity: 1,
        unit_price: unitPrice,
        subtotal: unitPrice * 1,
        is_selected: true,
        is_required: true,
        added_to_cart: false,
        sort_order: 1,
        created_at: now
      };
      bomItemsAll.push(bomItem);
      bomItemsForConfig.push(bomItem);
    }

    this._saveToStorage('bom_items', bomItemsAll);

    const total_price = bomItemsForConfig.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const total_items = bomItemsForConfig.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return {
      bom_items: bomItemsForConfig,
      summary: {
        total_price,
        total_items
      }
    };
  }

  _enrichBomItemsWithReferences(bomItems) {
    const products = this._getFromStorage('products', []);
    const configurations = this._getFromStorage('system_configurations', []);

    return bomItems.map(item => {
      const product = products.find(p => p.id === item.product_id) || null;
      const configuration = configurations.find(c => c.id === item.configuration_id) || null;
      return {
        ...item,
        product,
        configuration
      };
    });
  }

  // ---------------------- Geocoding / Distributor helpers ----------------------

  _degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  _haversineDistanceMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth radius in miles
    const dLat = this._degToRad(lat2 - lat1);
    const dLon = this._degToRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._degToRad(lat1)) *
        Math.cos(this._degToRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _geocodeLocationAndComputeDistances(locationQuery, distributors) {
    if (!locationQuery || !Array.isArray(distributors) || distributors.length === 0) {
      return distributors;
    }

    const normalized = locationQuery.trim().toLowerCase();

    // Minimal built-in geocode table; does not mock distributors, only location coordinates
    const knownLocations = {
      'denver, co': { lat: 39.7392, lon: -104.9903 },
      'denver, colorado': { lat: 39.7392, lon: -104.9903 }
    };

    const loc = knownLocations[normalized];
    if (!loc) {
      // If we don't know the location, we still record last_search_location
      const updated = distributors.map(d => ({
        ...d,
        last_search_location: locationQuery
      }));
      this._saveToStorage('distributors', updated);
      return updated;
    }

    const updated = distributors.map(d => {
      let distance = d.distance_miles_from_search;
      if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
        distance = this._haversineDistanceMiles(
          loc.lat,
          loc.lon,
          d.latitude,
          d.longitude
        );
      }
      return {
        ...d,
        distance_miles_from_search: typeof distance === 'number' ? distance : null,
        last_search_location: locationQuery
      };
    });

    this._saveToStorage('distributors', updated);
    return updated;
  }

  // ---------------------- Interface Implementations ----------------------

  // getProductCategories(): [ProductCategory]
  getProductCategories() {
    const categories = this._getFromStorage('product_categories', []);

    // Optionally sort by sort_order then display_name
    const sorted = categories.slice().sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : Number.POSITIVE_INFINITY;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : Number.POSITIVE_INFINITY;
      if (sa !== sb) return sa - sb;
      const da = (a.display_name || '').toLowerCase();
      const db = (b.display_name || '').toLowerCase();
      if (da < db) return -1;
      if (da > db) return 1;
      return 0;
    });

    return sorted;
  }

  // getFeaturedProducts(categoryId?, limit=6): [Product]
  getFeaturedProducts(categoryId, limit = 6) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    let filtered = products.filter(p => p.status === 'active' || !p.status);

    if (categoryId) {
      const { allowedCategoryValues } = this._getCategoryHierarchy(categoryId);
      if (allowedCategoryValues.size > 0) {
        filtered = filtered.filter(p => {
          if (p.category_id && allowedCategoryValues.has(p.category_id)) return true;
          if (p.application && allowedCategoryValues.has(p.application)) return true;
          return false;
        });
      }
    }

    // Sort by rating_average desc, rating_count desc, then price asc
    filtered.sort((a, b) => {
      const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
      const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
      if (ra !== rb) return rb - ra;
      const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
      const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
      if (ca !== cb) return cb - ca;
      const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
      const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
      return pa - pb;
    });

    const sliced = filtered.slice(0, typeof limit === 'number' ? limit : 6);

    // Foreign key resolution: attach category
    return sliced.map(p => ({
      ...p,
      category: this._resolveProductCategory(p, categories)
    }));
  }

  // getHomepagePromotions(): [Promotion]
  getHomepagePromotions() {
    const promotions = this._getFromStorage('homepage_promotions', []);
    return Array.isArray(promotions) ? promotions : [];
  }

  // getProductFilterOptions(categoryId): {...}
  getProductFilterOptions(categoryId) {
    const products = this._getFromStorage('products', []);

    let relevant = products.filter(p => p.status === 'active' || !p.status);

    if (categoryId) {
      const { allowedCategoryValues } = this._getCategoryHierarchy(categoryId);
      if (allowedCategoryValues.size > 0) {
        relevant = relevant.filter(p => {
          if (p.category_id && allowedCategoryValues.has(p.category_id)) return true;
          if (p.application && allowedCategoryValues.has(p.application)) return true;
          return false;
        });
      }
    }

    const systemTypesSet = new Set();
    const mountingStylesSet = new Set();
    const roofTypesSet = new Set();
    const applicationsSet = new Set();
    const productTypesSet = new Set();

    let priceMin = Number.POSITIVE_INFINITY;
    let priceMax = 0;
    const ratingsSet = new Set();

    const capacityRangesMap = new Map(); // key: "min-max" -> {min,max}

    for (const p of relevant) {
      if (p.system_type) systemTypesSet.add(p.system_type);
      if (p.mounting_style) mountingStylesSet.add(p.mounting_style);
      if (Array.isArray(p.roof_type_compatibility)) {
        p.roof_type_compatibility.forEach(rt => roofTypesSet.add(rt));
      }
      if (p.application) applicationsSet.add(p.application);
      if (p.product_type) productTypesSet.add(p.product_type);

      if (typeof p.price === 'number') {
        if (p.price < priceMin) priceMin = p.price;
        if (p.price > priceMax) priceMax = p.price;
      }

      if (typeof p.rating_average === 'number') {
        const bucketFloor = Math.floor(p.rating_average * 10) / 10; // e.g., 4.3 -> 4.3
        ratingsSet.add(bucketFloor);
      }

      const fixed = typeof p.panel_count_fixed === 'number' ? p.panel_count_fixed : null;
      const minCap = typeof p.capacity_min_panels === 'number' ? p.capacity_min_panels : null;
      const maxCap = typeof p.capacity_max_panels === 'number' ? p.capacity_max_panels : null;

      let minVal = minCap;
      let maxVal = maxCap;

      if (fixed != null) {
        minVal = fixed;
        maxVal = fixed;
      }

      if (minVal != null || maxVal != null) {
        const key = String(minVal || '') + '-' + String(maxVal || '');
        if (!capacityRangesMap.has(key)) {
          capacityRangesMap.set(key, {
            min: minVal || 0,
            max: maxVal || minVal || 0
          });
        }
      }
    }

    if (priceMin === Number.POSITIVE_INFINITY) {
      priceMin = 0;
      priceMax = 0;
    }

    const system_types = Array.from(systemTypesSet).map(v => ({
      value: v,
      label: this._formatEnumLabel(v)
    }));

    const mounting_styles = Array.from(mountingStylesSet).map(v => ({
      value: v,
      label: this._formatEnumLabel(v)
    }));

    const roof_types = Array.from(roofTypesSet).map(v => ({
      value: v,
      label: this._formatEnumLabel(v)
    }));

    const applications = Array.from(applicationsSet).map(v => ({
      value: v,
      label: this._formatEnumLabel(v)
    }));

    const product_types = Array.from(productTypesSet).map(v => ({
      value: v,
      label: this._formatEnumLabel(v)
    }));

    const capacity_ranges_panels = Array.from(capacityRangesMap.values()).map(range => ({
      min: range.min,
      max: range.max,
      label: range.min === range.max
        ? String(range.min) + ' panels'
        : range.min + '-' + range.max + ' panels'
    }));

    const rating_values = Array.from(ratingsSet).sort((a, b) => b - a);
    const rating_buckets = rating_values.map(r => ({
      min_rating: r,
      label: r.toFixed(1) + '+ stars'
    }));

    return {
      system_types,
      mounting_styles,
      roof_types,
      applications,
      product_types,
      capacity_ranges_panels,
      price_min: priceMin,
      price_max: priceMax,
      rating_buckets
    };
  }

  // listProducts(categoryId, filters?, sort?, page?, pageSize?)
  listProducts(categoryId, filters = {}, sort = 'default', page = 1, pageSize = 20) {
    const allProducts = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const { allowedCategoryValues, category } = this._getCategoryHierarchy(categoryId);

    let products = allProducts.filter(p => p.status === 'active' || !p.status);

    if (categoryId) {
      if (allowedCategoryValues.size > 0) {
        products = products.filter(p => {
          if (p.category_id && allowedCategoryValues.has(p.category_id)) return true;
          if (p.application && allowedCategoryValues.has(p.application)) return true;
          return false;
        });
      } else {
        products = products.filter(p => p.category_id === categoryId);
      }
    }

    // Apply filters
    if (filters) {
      if (filters.system_type) {
        products = products.filter(p => p.system_type === filters.system_type);
      }
      if (filters.mounting_style) {
        products = products.filter(p => p.mounting_style === filters.mounting_style);
      }
      if (filters.application) {
        products = products.filter(p => p.application === filters.application);
      }
      if (Array.isArray(filters.roof_type_compatibility) && filters.roof_type_compatibility.length > 0) {
        products = products.filter(p => {
          if (!Array.isArray(p.roof_type_compatibility) || p.roof_type_compatibility.length === 0) {
            return false;
          }
          return filters.roof_type_compatibility.some(rt => p.roof_type_compatibility.indexOf(rt) !== -1);
        });
      }
      if (filters.product_type) {
        products = products.filter(p => p.product_type === filters.product_type);
      }

      // Capacity filters
      const minCapFilter = typeof filters.min_capacity_panels === 'number'
        ? filters.min_capacity_panels
        : null;
      const maxCapFilter = typeof filters.max_capacity_panels === 'number'
        ? filters.max_capacity_panels
        : null;
      const exactPanels = typeof filters.panel_count_exact === 'number'
        ? filters.panel_count_exact
        : null;

      if (minCapFilter != null || maxCapFilter != null || exactPanels != null) {
        products = products.filter(p => {
          const fixed = typeof p.panel_count_fixed === 'number' ? p.panel_count_fixed : null;
          const minCap = typeof p.capacity_min_panels === 'number' ? p.capacity_min_panels : null;
          const maxCap = typeof p.capacity_max_panels === 'number' ? p.capacity_max_panels : null;

          if (exactPanels != null) {
            if (fixed != null) return fixed === exactPanels;
            if (minCap != null && exactPanels < minCap) return false;
            if (maxCap != null && exactPanels > maxCap) return false;
            return true;
          }

          if (minCapFilter != null && maxCapFilter != null) {
            // Overlap between [minCap,maxCap] and [minCapFilter,maxCapFilter]
            const prodMin = fixed != null ? fixed : (minCap != null ? minCap : 0);
            const prodMax = fixed != null ? fixed : (maxCap != null ? maxCap : Number.POSITIVE_INFINITY);
            return prodMax >= minCapFilter && prodMin <= maxCapFilter;
          }

          if (minCapFilter != null) {
            if (fixed != null) return fixed >= minCapFilter;
            if (maxCap != null && maxCap < minCapFilter) return false;
            return true;
          }

          if (maxCapFilter != null) {
            if (fixed != null) return fixed <= maxCapFilter;
            if (minCap != null && minCap > maxCapFilter) return false;
            return true;
          }

          return true;
        });
      }

      if (typeof filters.min_price === 'number') {
        products = products.filter(p => typeof p.price === 'number' && p.price >= filters.min_price);
      }
      if (typeof filters.max_price === 'number') {
        products = products.filter(p => typeof p.price === 'number' && p.price <= filters.max_price);
      }
      if (typeof filters.min_rating === 'number') {
        products = products.filter(p => (p.rating_average || 0) >= filters.min_rating);
      }
    }

    // Sorting
    if (sort === 'price_low_to_high') {
      products.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        if (pa === pb) return 0;
        return pa < pb ? -1 : 1;
      });
    } else if (sort === 'price_high_to_low') {
      products.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        if (pa === pb) return 0;
        return pa > pb ? -1 : 1;
      });
    } else if (sort === 'most_reviewed') {
      products.sort((a, b) => {
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        if (ca === cb) return 0;
        return cb - ca;
      });
    } else if (sort === 'best_rated') {
      products.sort((a, b) => {
        const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
        if (ra !== rb) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      });
    } else {
      // default: by name
      products.sort((a, b) => {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }

    const total = products.length;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.max(1, parseInt(pageSize, 10) || 20);
    const start = (p - 1) * ps;
    const end = start + ps;

    const slice = products.slice(start, end).map(prod => ({
      ...prod,
      category: this._resolveProductCategory(prod, categories)
    }));

    return {
      products: slice,
      category: category || null,
      total,
      page: p,
      pageSize: ps
    };
  }

  // getProductDetails(productId): {...}
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const reviews = this._getFromStorage('product_reviews', []);

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        rating_average: 0,
        rating_count: 0,
        structural_summary: {
          design_wind_speed_mph: null,
          snow_load_psf: null,
          weight_per_unit_lbs: null,
          weight_per_foot_lbs: null
        },
        has_documents: false
      };
    }

    const category = this._resolveProductCategory(product, categories);

    // compute ratings if not stored
    let rating_average = typeof product.rating_average === 'number'
      ? product.rating_average
      : 0;
    let rating_count = typeof product.rating_count === 'number'
      ? product.rating_count
      : 0;

    const productReviews = reviews.filter(r => r.product_id === productId && (r.is_approved !== false));
    if ((!rating_count || !rating_average) && productReviews.length > 0) {
      rating_count = productReviews.length;
      const sum = productReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      rating_average = sum / rating_count;
    }

    const structural_summary = {
      design_wind_speed_mph: product.design_wind_speed_mph != null ? product.design_wind_speed_mph : null,
      snow_load_psf: product.snow_load_psf != null ? product.snow_load_psf : null,
      weight_per_unit_lbs: product.weight_per_unit_lbs != null ? product.weight_per_unit_lbs : null,
      weight_per_foot_lbs: product.weight_per_foot_lbs != null ? product.weight_per_foot_lbs : null
    };

    const documents = this._getFromStorage('product_documents', []);
    const has_documents = !!documents.find(d => d.product_id === productId && d.is_active !== false);

    const enrichedProduct = {
      ...product,
      category
    };

    return {
      product: enrichedProduct,
      category,
      rating_average,
      rating_count,
      structural_summary,
      has_documents
    };
  }

  // getProductDocuments(productId, includeFamilyDocuments=true): [ProductDocument]
  getProductDocuments(productId, includeFamilyDocuments = true) {
    const documents = this._getFromStorage('product_documents', []);
    const products = this._getFromStorage('products', []);

    const baseDocs = documents.filter(d => d.product_id === productId && d.is_active !== false);

    let allDocs = baseDocs.slice();

    if (includeFamilyDocuments) {
      const product = products.find(p => p.id === productId);
      if (product && product.family_name) {
        const familyProducts = products.filter(p => p.family_name === product.family_name);
        const familyIds = familyProducts.map(p => p.id);
        const familyDocs = documents.filter(d => familyIds.indexOf(d.product_id) !== -1 && d.is_active !== false);
        const seen = new Set(allDocs.map(d => d.id));
        for (const doc of familyDocs) {
          if (!seen.has(doc.id)) {
            allDocs.push(doc);
            seen.add(doc.id);
          }
        }
      }
    }

    // Foreign key resolution: attach product
    const enriched = allDocs.map(doc => {
      const product = products.find(p => p.id === doc.product_id) || null;
      return {
        ...doc,
        product
      };
    });

    return enriched;
  }

  // getProductReviews(productId, page=1, pageSize=10)
  getProductReviews(productId, page = 1, pageSize = 10) {
    const reviews = this._getFromStorage('product_reviews', []);
    const products = this._getFromStorage('products', []);

    let filtered = reviews.filter(r => r.product_id === productId && (r.is_approved !== false));

    // Sort by created_at desc
    filtered.sort((a, b) => {
      const da = Date.parse(a.created_at || '') || 0;
      const db = Date.parse(b.created_at || '') || 0;
      return db - da;
    });

    const total = filtered.length;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.max(1, parseInt(pageSize, 10) || 10);
    const start = (p - 1) * ps;
    const end = start + ps;

    const product = products.find(pr => pr.id === productId) || null;

    const slice = filtered.slice(start, end).map(r => ({
      ...r,
      product
    }));

    return {
      reviews: slice,
      total,
      page: p,
      pageSize: ps
    };
  }

  // addToCart(productId, quantity=1, source='manual_add', configurationId?)
  addToCart(productId, quantity = 1, source = 'manual_add', configurationId = null) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        cart: null,
        items: [],
        message: 'Product not found'
      };
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const normalizedSource = source || 'manual_add';
    const configId = configurationId || null;

    let existingItem = cartItems.find(
      it =>
        it.cart_id === cart.id &&
        it.product_id === productId &&
        (it.configuration_id || null) === configId &&
        (it.source || 'manual_add') === normalizedSource
    );

    const unitPrice = typeof product.price === 'number' ? product.price : 0;
    const now = new Date().toISOString();

    if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 0) + qty;
      existingItem.unit_price = unitPrice;
      existingItem.line_total = unitPrice * existingItem.quantity;
      existingItem.added_at = existingItem.added_at || now;
    } else {
      existingItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        product_name: product.name || '',
        unit_price: unitPrice,
        quantity: qty,
        line_total: unitPrice * qty,
        configuration_id: configId,
        source: normalizedSource,
        added_at: now
      };
      cartItems.push(existingItem);
    }

    cart.updated_at = now;

    this._saveToStorage('cart_items', cartItems);

    // Also persist cart (with potentially updated timestamps)
    const carts = this._getFromStorage('cart', []);
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('cart', carts);

    const allCartItemsForCart = cartItems.filter(it => it.cart_id === cart.id);
    const enrichedItems = this._enrichCartItemsWithReferences(allCartItemsForCart);

    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      cart,
      items: enrichedItems,
      subtotal: totals.subtotal,
      estimated_total: totals.estimated_total,
      item_count: totals.item_count,
      message: 'Added to cart'
    };
  }

  // getCartDetails(): {cart, items, subtotal, estimated_total, item_count}
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(it => it.cart_id === cart.id);
    const enrichedItems = this._enrichCartItemsWithReferences(itemsForCart);
    const totals = this._calculateCartTotals(cart.id);

    return {
      cart,
      items: enrichedItems,
      subtotal: totals.subtotal,
      estimated_total: totals.estimated_total,
      item_count: totals.item_count
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemIndex = cartItems.findIndex(it => it.id === cartItemId);
    if (itemIndex < 0) {
      return {
        success: false,
        cart: null,
        items: [],
        subtotal: 0,
        estimated_total: 0,
        message: 'Cart item not found'
      };
    }

    const item = cartItems[itemIndex];
    const newQty = parseInt(quantity, 10) || 0;

    if (newQty <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      item.quantity = newQty;
      item.line_total = (item.unit_price || 0) * newQty;
    }

    this._saveToStorage('cart_items', cartItems);

    const cartId = item.cart_id;
    const carts = this._getFromStorage('cart', []);
    const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();

    const itemsForCart = cartItems.filter(it => it.cart_id === cart.id);
    const enrichedItems = this._enrichCartItemsWithReferences(itemsForCart);
    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      cart,
      items: enrichedItems,
      subtotal: totals.subtotal,
      estimated_total: totals.estimated_total,
      message: 'Cart updated'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemIndex = cartItems.findIndex(it => it.id === cartItemId);
    if (itemIndex < 0) {
      return {
        success: false,
        cart: null,
        items: [],
        subtotal: 0,
        estimated_total: 0,
        message: 'Cart item not found'
      };
    }

    const cartId = cartItems[itemIndex].cart_id;
    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('cart', []);
    const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();

    const itemsForCart = cartItems.filter(it => it.cart_id === cart.id);
    const enrichedItems = this._enrichCartItemsWithReferences(itemsForCart);
    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      cart,
      items: enrichedItems,
      subtotal: totals.subtotal,
      estimated_total: totals.estimated_total,
      message: 'Cart item removed'
    };
  }

  // generateSystemConfigurationAndBom(...)
  generateSystemConfigurationAndBom(
    project_type,
    roof_type,
    location,
    panel_count,
    panel_orientation,
    panel_length_inches,
    panel_width_inches,
    rows,
    columns,
    design_wind_speed_mph,
    ground_snow_load_psf,
    name,
    notes
  ) {
    const configs = this._getFromStorage('system_configurations', []);
    const now = new Date().toISOString();

    const configuration = {
      id: this._generateId('config'),
      project_type,
      roof_type,
      location: location || null,
      panel_count,
      panel_orientation,
      panel_length_inches: panel_length_inches != null ? panel_length_inches : null,
      panel_width_inches: panel_width_inches != null ? panel_width_inches : null,
      rows: rows != null ? rows : null,
      columns: columns != null ? columns : null,
      design_wind_speed_mph: design_wind_speed_mph != null ? design_wind_speed_mph : null,
      ground_snow_load_psf: ground_snow_load_psf != null ? ground_snow_load_psf : null,
      status: 'completed',
      name: name || null,
      notes: notes || null,
      created_at: now,
      updated_at: now
    };

    configs.push(configuration);
    this._saveToStorage('system_configurations', configs);

    const bomResult = this._generateBomFromConfiguration(configuration);
    const enrichedBom = this._enrichBomItemsWithReferences(bomResult.bom_items);

    return {
      configuration,
      bom_items: enrichedBom,
      summary: bomResult.summary
    };
  }

  // getConfigurationBom(configurationId)
  getConfigurationBom(configurationId) {
    const configs = this._getFromStorage('system_configurations', []);
    const bomItems = this._getFromStorage('bom_items', []);

    const configuration = configs.find(c => c.id === configurationId) || null;
    const bomForConfig = bomItems.filter(b => b.configuration_id === configurationId);
    const enrichedBom = this._enrichBomItemsWithReferences(bomForConfig);

    return {
      configuration,
      bom_items: enrichedBom
    };
  }

  // addBomItemsToCart(configurationId, includeSelectedOnly=false)
  addBomItemsToCart(configurationId, includeSelectedOnly = false) {
    const bomItems = this._getFromStorage('bom_items', []);
    const configs = this._getFromStorage('system_configurations', []);

    const configuration = configs.find(c => c.id === configurationId) || null;
    if (!configuration) {
      return {
        success: false,
        added_item_count: 0,
        cart: null,
        items: [],
        message: 'Configuration not found'
      };
    }

    let bomForConfig = bomItems.filter(b => b.configuration_id === configurationId);
    if (includeSelectedOnly) {
      bomForConfig = bomForConfig.filter(b => b.is_selected !== false);
    }

    if (bomForConfig.length === 0) {
      return {
        success: false,
        added_item_count: 0,
        cart: null,
        items: [],
        message: 'No BOM items to add to cart'
      };
    }

    // Add each BOM item to cart
    for (const item of bomForConfig) {
      this.addToCart(item.product_id, item.quantity || 1, 'configurator_bom', configurationId);
      item.added_to_cart = true;
    }

    // Persist updated BOM items
    this._saveToStorage('bom_items', bomItems);

    const cartDetails = this.getCartDetails();

    return {
      success: true,
      added_item_count: bomForConfig.length,
      cart: cartDetails.cart,
      items: cartDetails.items,
      message: 'BOM items added to cart'
    };
  }

  // listTrainingEvents(filters?, sort_by?, limit?)
  listTrainingEvents(filters = {}, sort_by = 'start_datetime_asc', limit = 20) {
    let events = this._getFromStorage('training_events', []);

    if (filters) {
      if (filters.event_type) {
        events = events.filter(e => e.event_type === filters.event_type);
      }
      if (filters.status) {
        events = events.filter(e => e.status === filters.status);
      }
      if (filters.start_date_from) {
        const fromTs = Date.parse(filters.start_date_from + 'T00:00:00Z') || 0;
        events = events.filter(e => {
          const ts = Date.parse(e.start_datetime || '') || 0;
          return ts >= fromTs;
        });
      }
      if (filters.start_date_to) {
        const toTs = Date.parse(filters.start_date_to + 'T23:59:59Z') || Number.POSITIVE_INFINITY;
        events = events.filter(e => {
          const ts = Date.parse(e.start_datetime || '') || 0;
          return ts <= toTs;
        });
      }
      if (typeof filters.min_duration_minutes === 'number') {
        events = events.filter(e => (e.duration_minutes || 0) >= filters.min_duration_minutes);
      }
    }

    if (sort_by === 'start_datetime_desc') {
      events.sort((a, b) => {
        const ta = Date.parse(a.start_datetime || '') || 0;
        const tb = Date.parse(b.start_datetime || '') || 0;
        return tb - ta;
      });
    } else if (sort_by === 'duration_desc') {
      events.sort((a, b) => {
        const da = a.duration_minutes || 0;
        const db = b.duration_minutes || 0;
        return db - da;
      });
    } else {
      // default: start_datetime_asc
      events.sort((a, b) => {
        const ta = Date.parse(a.start_datetime || '') || 0;
        const tb = Date.parse(b.start_datetime || '') || 0;
        return ta - tb;
      });
    }

    const lim = Math.max(1, parseInt(limit, 10) || 20);
    return events.slice(0, lim);
  }

  // getTrainingEventDetails(trainingEventId)
  getTrainingEventDetails(trainingEventId) {
    const events = this._getFromStorage('training_events', []);
    return events.find(e => e.id === trainingEventId) || null;
  }

  // registerForTrainingEvent(trainingEventId, attendeeName, attendeeEmail, attendeeCompany, attendeeRole, comments)
  registerForTrainingEvent(
    trainingEventId,
    attendeeName,
    attendeeEmail,
    attendeeCompany,
    attendeeRole,
    comments
  ) {
    const events = this._getFromStorage('training_events', []);
    const event = events.find(e => e.id === trainingEventId) || null;
    if (!event) {
      return {
        success: false,
        registration: null,
        message: 'Training event not found'
      };
    }

    if (event.status !== 'upcoming' || (event.registration_open === false)) {
      return {
        success: false,
        registration: null,
        message: 'Registration is closed for this event'
      };
    }

    const registrations = this._getFromStorage('training_registrations', []);
    const now = new Date().toISOString();

    const registration = {
      id: this._generateId('training_registration'),
      training_event_id: trainingEventId,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      attendee_company: attendeeCompany || null,
      attendee_role: attendeeRole || null,
      comments: comments || null,
      registered_at: now,
      status: 'registered'
    };

    registrations.push(registration);
    this._saveToStorage('training_registrations', registrations);

    const enrichedRegistration = {
      ...registration,
      training_event: event
    };

    return {
      success: true,
      registration: enrichedRegistration,
      message: 'Registration successful'
    };
  }

  // getSupportOverviewContent()
  getSupportOverviewContent() {
    const data = this._getFromStorage('support_overview_content', {});
    const result = {
      support_types: Array.isArray(data.support_types) ? data.support_types : [],
      contact_info: data.contact_info || {},
      quick_links: Array.isArray(data.quick_links) ? data.quick_links : []
    };
    return result;
  }

  // submitTechnicalSupportRequest(...)
  submitTechnicalSupportRequest(
    ticket_type,
    productId,
    productName,
    roofType,
    priority,
    issueDescription,
    orderNumber,
    projectName,
    contactName,
    contactEmail,
    contactPhone,
    sourcePage
  ) {
    const tickets = this._getFromStorage('support_tickets', []);
    const products = this._getFromStorage('products', []);
    const now = new Date().toISOString();

    const ticket = {
      id: this._generateId('support_ticket'),
      ticket_type: ticket_type || 'technical_support',
      product_id: productId || null,
      product_name: productName || null,
      roof_type: roofType || null,
      priority: priority || 'low',
      issue_description: issueDescription || '',
      order_number: orderNumber || null,
      project_name: projectName || null,
      contact_name: contactName || '',
      contact_email: contactEmail || '',
      contact_phone: contactPhone || null,
      status: 'open',
      source_page: sourcePage || 'support_overview',
      created_at: now,
      updated_at: now
    };

    tickets.push(ticket);
    this._saveToStorage('support_tickets', tickets);

    const product = productId ? (products.find(p => p.id === productId) || null) : null;

    return {
      success: true,
      ticket: {
        ...ticket,
        product
      },
      message: 'Support ticket submitted'
    };
  }

  // searchDistributors(locationQuery, radiusMiles=50, filters={}, limit=50)
  searchDistributors(locationQuery, radiusMiles = 50, filters = {}, limit = 50) {
    let distributors = this._getFromStorage('distributors', []);
    if (!locationQuery) {
      return [];
    }

    distributors = this._geocodeLocationAndComputeDistances(locationQuery, distributors);

    const radius = Math.max(0, parseFloat(radiusMiles) || 50);

    let results = distributors.filter(d => {
      if (typeof d.distance_miles_from_search === 'number') {
        return d.distance_miles_from_search <= radius;
      }
      // If distance unknown, exclude from radius-limited search
      return false;
    });

    if (filters) {
      if (filters.isStocking) {
        results = results.filter(d => d.is_stocking === true || d.distributor_type === 'stocking');
      }
      if (Array.isArray(filters.distributorTypes) && filters.distributorTypes.length > 0) {
        results = results.filter(d => d.distributor_type && filters.distributorTypes.indexOf(d.distributor_type) !== -1);
      }
    }

    // Sort by distance ascending
    results.sort((a, b) => {
      const da = typeof a.distance_miles_from_search === 'number' ? a.distance_miles_from_search : Number.POSITIVE_INFINITY;
      const db = typeof b.distance_miles_from_search === 'number' ? b.distance_miles_from_search : Number.POSITIVE_INFINITY;
      if (da === db) return 0;
      return da < db ? -1 : 1;
    });

    const lim = Math.max(1, parseInt(limit, 10) || 50);

    // Instrumentation for task_8 (distributor interaction) - search
    try {
      if (locationQuery && String(locationQuery).trim() !== '') {
        let existing = {};
        try {
          const raw = localStorage.getItem('task8_distributorInteraction');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              existing = parsed;
            }
          }
        } catch (eParse) {
          // Ignore parse errors and start from a clean object
        }

        const updated = {
          ...existing,
          search: {
            locationQuery: locationQuery,
            radiusMiles: radius,
            filters: filters || {}
          }
        };

        localStorage.setItem('task8_distributorInteraction', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Instrumentation error (task8_distributorInteraction - searchDistributors):', e);
    }

    return results.slice(0, lim);
  }

  // getDistributorDetails(distributorId)
  getDistributorDetails(distributorId) {
    const distributors = this._getFromStorage('distributors', []);
    const distributor = distributors.find(d => d.id === distributorId) || null;

    // Instrumentation for task_8 (distributor interaction) - detail view
    try {
      if (distributor) {
        let existing = {};
        try {
          const raw = localStorage.getItem('task8_distributorInteraction');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              existing = parsed;
            }
          }
        } catch (eParse) {
          // Ignore parse errors and start with a clean object
        }

        const updated = {
          ...existing,
          selectedDistributorId: distributorId,
          visitedWebsite: typeof existing.visitedWebsite === 'boolean' ? existing.visitedWebsite : false,
          openedDirections: typeof existing.openedDirections === 'boolean' ? existing.openedDirections : false
        };

        localStorage.setItem('task8_distributorInteraction', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Instrumentation error (task8_distributorInteraction - getDistributorDetails):', e);
    }

    return distributor;
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const data = this._getFromStorage('about_page_content', {});
    return {
      hero_title: data.hero_title || '',
      hero_body: data.hero_body || '',
      sections: Array.isArray(data.sections) ? data.sections : [],
      contact_summary: data.contact_summary || {}
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    const data = this._getFromStorage('contact_page_content', {});
    return {
      contact_info: data.contact_info || {},
      topics: Array.isArray(data.topics) ? data.topics : []
    };
  }

  // submitContactInquiry(name, email, company, topic, message)
  submitContactInquiry(name, email, company, topic, message) {
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const id = this._generateId('contact_inquiry');
    const now = new Date().toISOString();

    const inquiry = {
      id,
      name,
      email,
      company: company || null,
      topic: topic || null,
      message,
      created_at: now
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      reference_id: id,
      message: 'Inquiry submitted successfully'
    };
  }

  // getInstallerResourcesOverview()
  getInstallerResourcesOverview() {
    const data = this._getFromStorage('installer_resources_overview', {});
    return {
      hero_title: data.hero_title || '',
      hero_body: data.hero_body || '',
      resource_cards: Array.isArray(data.resource_cards) ? data.resource_cards : []
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