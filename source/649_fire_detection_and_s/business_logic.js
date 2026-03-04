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

  // ---------- Storage Helpers ----------

  _initStorage() {
    const keysWithDefaults = {
      products: [
        {
          id: 'prod_hd50',
          name: 'SafeHome Fixed-Temperature Heat Detector',
          category: 'heat_detectors',
          model_number: 'HD-50',
          price: 54.99,
          status: 'active',
          description:
            'Fixed-temperature heat detector suitable for kitchens, garages, and utility areas.',
          image_url: '',
          rating: 4.5,
          rating_count: 42,
          free_shipping_eligible: false,
          usage_location: 'indoor',
          battery_type: null,
          is_wireless: false,
          detector_type: 'heat',
          shipping_estimate: '35 business days',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'prod_cp4',
          name: 'FireCore FC-4Z Conventional Control Panel',
          category: 'control_panels',
          model_number: 'FC-4Z',
          price: 999.0,
          status: 'active',
          description:
            '4-zone fire alarm control panel suitable for small commercial installations.',
          image_url: '',
          rating: 4.8,
          rating_count: 58,
          free_shipping_eligible: false,
          usage_location: 'indoor',
          battery_type: null,
          is_wireless: false,
          detector_type: null,
          zones_supported: 4,
          device_capacity: 32,
          shipping_estimate: '35 business days',
          created_at: '2023-08-01T09:00:00Z'
        },
        {
          id: 'prod_fx_abc7',
          name: 'ShieldGuard 7 lb ABC Fire Extinguisher',
          category: 'fire_extinguishers',
          model_number: 'FX-ABC7',
          price: 74.99,
          status: 'active',
          description:
            'Multipurpose 7 lb ABC dry chemical fire extinguisher for offices and shops.',
          image_url: '',
          rating: 5,
          rating_count: 120,
          free_shipping_eligible: false,
          usage_location: 'indoor',
          extinguisher_class: 'abc',
          extinguisher_weight_lb: 7,
          shipping_estimate: '35 business days',
          created_at: '2024-03-10T10:00:00Z'
        },
        {
          id: 'prod_fx_k6',
          name: 'ShieldGuard 6 L Class K Kitchen Extinguisher',
          category: 'fire_extinguishers',
          model_number: 'FX-K6',
          price: 189.0,
          status: 'active',
          description: 'Wet chemical Class K fire extinguisher for commercial kitchens.',
          image_url: '',
          rating: 4.9,
          rating_count: 75,
          free_shipping_eligible: false,
          usage_location: 'indoor',
          extinguisher_class: 'k',
          extinguisher_weight_lb: 6,
          shipping_estimate: '35 business days',
          created_at: '2024-03-11T10:00:00Z'
        },
        {
          id: 'prod_exit_led1',
          name: 'EverLite LED Exit Sign',
          category: 'exit_signs',
          model_number: 'EXIT-LED1',
          price: 49.99,
          status: 'active',
          description: 'Energy-efficient LED exit sign with universal mounting kit.',
          image_url: '',
          rating: 4.7,
          rating_count: 88,
          free_shipping_eligible: false,
          usage_location: 'indoor',
          exit_sign_type: 'led',
          shipping_estimate: '35 business days',
          created_at: '2023-09-05T12:00:00Z'
        },
        {
          id: 'prod_blanket1',
          name: 'SafeKitchen Fire Blanket  1m x 1m',
          category: 'fire_blankets',
          model_number: 'FB-1x1',
          price: 39.99,
          status: 'active',
          description: 'Compact fire blanket suitable for small kitchens and labs.',
          image_url: '',
          rating: 4.4,
          rating_count: 37,
          free_shipping_eligible: false,
          usage_location: 'indoor',
          fire_blanket_size: '1m x 1m',
          shipping_estimate: '35 business days',
          created_at: '2023-10-12T11:00:00Z'
        }
      ],
      product_documents: [],
      cart: null,
      cart_items: [],
      shipping_methods: [],
      packages: [],
      quote_requests: [],
      maintenance_plans: [],
      maintenance_enrollments: [],
      inspection_bookings: [],
      articles: [],
      compliance_guides: [],
      consultation_requests: [],
      system_designs: [],
      system_design_device_recommendations: [],
      support_requests: [],
      orders: []
    };

    Object.keys(keysWithDefaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(keysWithDefaults[key]));
      }
    });

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
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  // ---------- Cart Helpers ----------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of cart_item IDs
        selected_shipping_method_id: null,
        subtotal: 0,
        shipping_cost: 0,
        total: 0,
        has_free_shipping: false,
        created_at: this._now(),
        updated_at: this._now()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let subtotal = 0;
    let allFreeShippingEligible = itemsForCart.length > 0;

    itemsForCart.forEach((item) => {
      subtotal += item.line_subtotal || 0;
      const product = products.find((p) => p.id === item.product_id);
      if (!product || !product.free_shipping_eligible) {
        allFreeShippingEligible = false;
      }
    });

    cart.subtotal = subtotal;

    let shipping_cost = 0;
    let has_free_shipping = false;
    let shippingMethod = null;
    if (cart.selected_shipping_method_id) {
      shippingMethod = shippingMethods.find(
        (sm) => sm.id === cart.selected_shipping_method_id
      );
    }

    if (shippingMethod) {
      if (shippingMethod.is_free || shippingMethod.code === 'free_economy' || allFreeShippingEligible) {
        shipping_cost = 0;
        has_free_shipping = true;
      } else {
        // No explicit price field, keep as 0 to avoid mocking pricing data
        shipping_cost = 0;
        has_free_shipping = false;
      }
    } else {
      if (allFreeShippingEligible && itemsForCart.length > 0) {
        has_free_shipping = true;
      }
      shipping_cost = 0;
    }

    cart.shipping_cost = shipping_cost;
    cart.has_free_shipping = has_free_shipping;
    cart.total = subtotal + shipping_cost;
    cart.updated_at = this._now();

    this._saveToStorage('cart', cart);
    return cart;
  }

  _buildCartItemsDetailed(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    return itemsForCart.map((item) => {
      const product = products.find((p) => p.id === item.product_id) || null;
      return {
        cart_item_id: item.id,
        product_id: item.product_id,
        product_name: product ? product.name : null,
        product_image_url: product ? product.image_url : null,
        product_category: product ? product.category : null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_subtotal: item.line_subtotal,
        // Foreign key resolution
        product: product
      };
    });
  }

  _buildCartResponse(cart) {
    const detailedItems = this._buildCartItemsDetailed(cart);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingMethod = cart.selected_shipping_method_id
      ? shippingMethods.find((sm) => sm.id === cart.selected_shipping_method_id) || null
      : null;

    return {
      id: cart.id,
      items: detailedItems,
      subtotal: cart.subtotal,
      shipping_cost: cart.shipping_cost,
      total: cart.total,
      has_free_shipping: cart.has_free_shipping,
      selected_shipping_method_id: cart.selected_shipping_method_id,
      // Foreign key resolution
      selected_shipping_method: shippingMethod
    };
  }

  _resetCartAfterOrder() {
    const newCart = {
      id: this._generateId('cart'),
      items: [],
      selected_shipping_method_id: null,
      subtotal: 0,
      shipping_cost: 0,
      total: 0,
      has_free_shipping: false,
      created_at: this._now(),
      updated_at: this._now()
    };
    this._saveToStorage('cart', newCart);
    this._saveToStorage('cart_items', []);
    return newCart;
  }

  // ---------- Generic Helpers ----------

  _filterAndSortProducts(filters, sort_by) {
    const allProducts = this._getFromStorage('products', []);

    let items = allProducts.filter((p) => p.status === 'active');

    const f = filters || {};

    if (f.category) {
      items = items.filter((p) => p.category === f.category);
    }
    if (typeof f.min_price === 'number') {
      items = items.filter((p) => p.price >= f.min_price);
    }
    if (typeof f.max_price === 'number') {
      items = items.filter((p) => p.price <= f.max_price);
    }
    if (typeof f.min_rating === 'number') {
      items = items.filter((p) => (p.rating || 0) >= f.min_rating);
    }
    if (f.battery_type) {
      items = items.filter((p) => p.battery_type === f.battery_type);
    }
    if (typeof f.free_shipping_only === 'boolean' && f.free_shipping_only) {
      items = items.filter((p) => !!p.free_shipping_eligible);
    }
    if (f.usage_location) {
      items = items.filter((p) => p.usage_location === f.usage_location);
    }
    if (typeof f.is_wireless === 'boolean') {
      items = items.filter((p) => !!p.is_wireless === f.is_wireless);
    }
    if (f.detector_type) {
      items = items.filter((p) => p.detector_type === f.detector_type);
    }
    if (typeof f.min_zones_supported === 'number') {
      items = items.filter(
        (p) => typeof p.zones_supported === 'number' && p.zones_supported >= f.min_zones_supported
      );
    }
    if (f.extinguisher_class) {
      items = items.filter((p) => p.extinguisher_class === f.extinguisher_class);
    }
    if (typeof f.min_extinguisher_weight_lb === 'number') {
      items = items.filter(
        (p) => typeof p.extinguisher_weight_lb === 'number' && p.extinguisher_weight_lb >= f.min_extinguisher_weight_lb
      );
    }
    if (typeof f.max_extinguisher_weight_lb === 'number') {
      items = items.filter(
        (p) => typeof p.extinguisher_weight_lb === 'number' && p.extinguisher_weight_lb <= f.max_extinguisher_weight_lb
      );
    }
    if (f.exit_sign_type) {
      items = items.filter((p) => p.exit_sign_type === f.exit_sign_type);
    }

    const sortBy = sort_by || 'relevance';

    if (sortBy === 'price_low_to_high') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'rating_high_to_low') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'newest') {
      items.sort((a, b) => {
        const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bd - ad;
      });
    }

    return items;
  }

  _validateDateRange(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) {
      return { valid: false, message: 'Both start and end dates are required.' };
    }
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, message: 'Invalid date format.' };
    }
    if (end.getTime() < start.getTime()) {
      return { valid: false, message: 'End date must be on or after start date.' };
    }
    return {
      valid: true,
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  _persistSystemDesign(config) {
    const systemDesigns = this._getFromStorage('system_designs', []);
    const deviceRecsAll = this._getFromStorage('system_design_device_recommendations', []);

    const designId = this._generateId('systemdesign');
    const createdAt = this._now();

    const design = {
      id: designId,
      name: config.name,
      property_type: config.property_type,
      num_floors: config.num_floors,
      rooms_per_floor: config.rooms_per_floor,
      system_type: config.system_type,
      risk_level: config.risk_level || null,
      device_recommendation_ids: [],
      created_at: createdAt,
      updated_at: createdAt
    };

    const savedDeviceRecs = [];

    (config.device_recommendations || []).forEach((dr) => {
      const recId = this._generateId('sddr');
      const rec = {
        id: recId,
        system_design_id: designId,
        device_type: dr.device_type,
        quantity: dr.quantity,
        notes: dr.notes || null
      };
      design.device_recommendation_ids.push(recId);
      deviceRecsAll.push(rec);
      savedDeviceRecs.push(rec);
    });

    systemDesigns.push(design);

    this._saveToStorage('system_designs', systemDesigns);
    this._saveToStorage('system_design_device_recommendations', deviceRecsAll);

    return { design, savedDeviceRecs };
  }

  _extractKeyTakeaways(content) {
    if (!content || typeof content !== 'string') return [];
    const sentences = content
      .split(/\.(\s+|$)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return sentences.slice(0, 3);
  }

  // ---------- Interface Implementations ----------
  // 1) getHomepageContent

  getHomepageContent() {
    const products = this._getFromStorage('products', []);
    const packages = this._getFromStorage('packages', []);
    const articles = this._getFromStorage('articles', []);
    const guides = this._getFromStorage('compliance_guides', []);

    const activeProducts = products.filter((p) => p.status === 'active');

    const featured_products = activeProducts
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4)
      .map((p) => ({
        product: {
          id: p.id,
          name: p.name,
          price: p.price,
          image_url: p.image_url || null,
          rating: p.rating || 0,
          rating_count: p.rating_count || 0,
          category: p.category
        },
        highlight_reason: 'Top rated product'
      }));

    const activePackages = packages.filter((pkg) => pkg.status === 'active');
    const featured_packages = activePackages.slice(0, 4);

    const publishedArticles = articles.filter((a) => a.status === 'published');
    const featured_articles = publishedArticles
      .slice()
      .sort((a, b) => {
        const ad = new Date(a.publication_date).getTime() || 0;
        const bd = new Date(b.publication_date).getTime() || 0;
        return bd - ad;
      })
      .slice(0, 4);

    const publishedGuides = guides.filter((g) => g.status === 'published');
    const featured_compliance_guides = publishedGuides.slice(0, 4);

    return {
      hero_summary: {
        headline: 'Fire Detection & Safety Systems',
        subheadline: 'Protection for homes, offices, warehouses, and commercial kitchens',
        key_offerings: [
          'UL-listed fire alarm products',
          'Design, installation, and inspections',
          '24/7 monitoring and maintenance plans'
        ]
      },
      featured_products,
      featured_packages,
      featured_articles,
      featured_compliance_guides
    };
  }

  // 2) getProductCategories

  getProductCategories() {
    const products = this._getFromStorage('products', []);
    const categories = new Set();
    products.forEach((p) => {
      if (p.category) categories.add(p.category);
    });

    const labelMap = {
      smoke_detectors: 'Smoke Detectors',
      heat_detectors: 'Heat Detectors',
      control_panels: 'Control Panels',
      fire_extinguishers: 'Fire Extinguishers',
      exit_signs: 'Exit Signs',
      fire_blankets: 'Fire Blankets',
      accessories: 'Accessories',
      other_products: 'Other Products'
    };

    const descriptionMap = {
      smoke_detectors: 'Photoelectric and ionization smoke alarms for residential and commercial use.',
      heat_detectors: 'Fixed temperature and rate-of-rise heat detectors.',
      control_panels: 'Fire alarm control panels and annunciators.',
      fire_extinguishers: 'Portable fire extinguishers for multiple hazard classes.',
      exit_signs: 'LED and photoluminescent exit signs.',
      fire_blankets: 'Fire blankets for kitchens and labs.',
      accessories: 'Mounting hardware, batteries, and accessories.',
      other_products: 'Additional fire safety products.'
    };

    return Array.from(categories).map((cat) => ({
      category: cat,
      display_name: labelMap[cat] || cat,
      description: descriptionMap[cat] || ''
    }));
  }

  // 3) getProductFilterOptions

  getProductFilterOptions(category) {
    const productsAll = this._getFromStorage('products', []);
    const products = category
      ? productsAll.filter((p) => p.category === category)
      : productsAll;

    let min_price = null;
    let max_price = null;
    let min_weight = null;
    let max_weight = null;
    const battery_typesSet = new Set();
    const usage_locationsSet = new Set();
    const detector_typesSet = new Set();
    const extinguisher_classesSet = new Set();
    const exit_sign_typesSet = new Set();
    const zonesSet = new Set();
    let supportsFreeShippingFilter = false;

    products.forEach((p) => {
      if (typeof p.price === 'number') {
        if (min_price === null || p.price < min_price) min_price = p.price;
        if (max_price === null || p.price > max_price) max_price = p.price;
      }
      if (p.battery_type) battery_typesSet.add(p.battery_type);
      if (p.usage_location) usage_locationsSet.add(p.usage_location);
      if (p.detector_type) detector_typesSet.add(p.detector_type);
      if (p.extinguisher_class) extinguisher_classesSet.add(p.extinguisher_class);
      if (typeof p.extinguisher_weight_lb === 'number') {
        if (min_weight === null || p.extinguisher_weight_lb < min_weight) {
          min_weight = p.extinguisher_weight_lb;
        }
        if (max_weight === null || p.extinguisher_weight_lb > max_weight) {
          max_weight = p.extinguisher_weight_lb;
        }
      }
      if (typeof p.zones_supported === 'number') zonesSet.add(p.zones_supported);
      if (p.free_shipping_eligible) supportsFreeShippingFilter = true;
    });

    const rating_options = [
      { value: 4, label: '4 stars & up' },
      { value: 3, label: '3 stars & up' },
      { value: 2, label: '2 stars & up' }
    ];

    return {
      price_range: {
        min_price: min_price !== null ? min_price : 0,
        max_price: max_price !== null ? max_price : 0
      },
      rating_options,
      battery_types: Array.from(battery_typesSet),
      usage_locations: Array.from(usage_locationsSet),
      detector_types: Array.from(detector_typesSet),
      extinguisher_classes: Array.from(extinguisher_classesSet),
      exit_sign_types: Array.from(exit_sign_typesSet),
      wireless_options: [
        { value: true, label: 'Wireless only' },
        { value: false, label: 'Wired only' }
      ],
      shipping_filters: {
        supports_free_shipping_filter: supportsFreeShippingFilter
      },
      zones_supported_options: Array.from(zonesSet).sort((a, b) => a - b),
      extinguisher_weight_range: {
        min_weight_lb: min_weight !== null ? min_weight : 0,
        max_weight_lb: max_weight !== null ? max_weight : 0
      }
    };
  }

  // 4) listProducts

  listProducts(filters, sort_by, page = 1, page_size = 20) {
    const filtered = this._filterAndSortProducts(filters || {}, sort_by);
    const total_count = filtered.length;

    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const pageItems = filtered.slice(start, end);

    const items = pageItems.map((pItem) => ({
      id: pItem.id,
      name: pItem.name,
      category: pItem.category,
      category_label: pItem.category,
      price: pItem.price,
      image_url: pItem.image_url || null,
      rating: pItem.rating || 0,
      rating_count: pItem.rating_count || 0,
      free_shipping_eligible: !!pItem.free_shipping_eligible,
      usage_location: pItem.usage_location || null,
      battery_type: pItem.battery_type || null,
      detector_type: pItem.detector_type || null,
      zones_supported: typeof pItem.zones_supported === 'number' ? pItem.zones_supported : null,
      extinguisher_class: pItem.extinguisher_class || null,
      extinguisher_weight_lb:
        typeof pItem.extinguisher_weight_lb === 'number' ? pItem.extinguisher_weight_lb : null,
      exit_sign_type: pItem.exit_sign_type || null,
      shipping_estimate: pItem.shipping_estimate || null
    }));

    return {
      items,
      total_count,
      page: p,
      page_size: ps
    };
  }

  // 5) getProductDetail

  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      return {
        product: null,
        category_label: null,
        usage_location_label: null,
        battery_type_label: null,
        detector_type_label: null,
        shipping_info: {
          free_shipping_eligible: false,
          shipping_estimate: null
        },
        specifications: {},
        related_products: []
      };
    }

    const category_label = product.category || null;
    const usage_location_label = product.usage_location || null;
    const battery_type_label = product.battery_type || null;
    const detector_type_label = product.detector_type || null;

    const specifications = {
      zones_supported:
        typeof product.zones_supported === 'number' ? product.zones_supported : null,
      device_capacity:
        typeof product.device_capacity === 'number' ? product.device_capacity : null,
      extinguisher_class: product.extinguisher_class || null,
      extinguisher_weight_lb:
        typeof product.extinguisher_weight_lb === 'number'
          ? product.extinguisher_weight_lb
          : null,
      exit_sign_type: product.exit_sign_type || null,
      fire_blanket_size: product.fire_blanket_size || null,
      is_wireless: !!product.is_wireless
    };

    const shipping_info = {
      free_shipping_eligible: !!product.free_shipping_eligible,
      shipping_estimate: product.shipping_estimate || null
    };

    const related_products = products
      .filter((p) => p.id !== product.id && p.category === product.category && p.status === 'active')
      .slice(0, 4);

    return {
      product,
      category_label,
      usage_location_label,
      battery_type_label,
      detector_type_label,
      shipping_info,
      specifications,
      related_products
    };
  }

  // 6) getProductDocuments

  getProductDocuments(productId) {
    const docs = this._getFromStorage('product_documents', []);
    const products = this._getFromStorage('products', []);

    const filteredDocs = docs.filter((d) => d.product_id === productId);

    // Instrumentation for task completion tracking (Task 6 - downloaded manual)
    try {
      const manualDoc = filteredDocs.find((d) => {
        if (d && d.type === 'installation_manual') {
          return true;
        }
        const title =
          (d && (d.title || d.name || d.label) ? d.title || d.name || d.label : '') || '';
        return title.toLowerCase().includes('installation manual');
      });

      if (manualDoc) {
        localStorage.setItem(
          'task6_downloadedManualInfo',
          JSON.stringify({
            product_id: productId,
            manual_document_id: manualDoc.id,
            manual_title: manualDoc.title || manualDoc.name || null,
            timestamp: this._now()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filteredDocs.map((d) => ({
      ...d,
      // Foreign key resolution
      product: products.find((p) => p.id === d.product_id) || null
    }));
  }

  // 7) addToCart

  addToCart(productId, quantity = 1) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId && p.status === 'active');
    if (!product) {
      const existingCart = this._getFromStorage('cart', null);
      return {
        success: false,
        cart: existingCart ? this._buildCartResponse(existingCart) : null,
        message: 'Product not found or inactive.'
      };
    }

    let qty = parseInt(quantity, 10);
    if (!qty || qty < 1) qty = 1;

    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let cartItem = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId
    );

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.line_subtotal = cartItem.quantity * cartItem.unit_price;
    } else {
      const cartItemId = this._generateId('cartitem');
      cartItem = {
        id: cartItemId,
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price,
        line_subtotal: product.price * qty
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      cart.items.push(cartItemId);
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);

    cart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: this._buildCartResponse(cart),
      message: 'Product added to cart.'
    };
  }

  // 8) getCart

  getCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return {
        cart: null,
        items: []
      };
    }

    cart = this._recalculateCartTotals(cart);
    const items = this._buildCartItemsDetailed(cart);

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingMethod = cart.selected_shipping_method_id
      ? shippingMethods.find((sm) => sm.id === cart.selected_shipping_method_id) || null
      : null;

    return {
      cart: {
        ...cart,
        selected_shipping_method: shippingMethod
      },
      items
    };
  }

  // 9) updateCartItemQuantity

  updateCartItemQuantity(cartItemId, quantity) {
    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return {
        success: false,
        cart: this._buildCartResponse(cart)
      };
    }

    let qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      // Remove item if quantity is zero or invalid
      const removed = cartItems.splice(idx, 1)[0];
      if (removed && Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== removed.id);
      }
    } else {
      const item = cartItems[idx];
      item.quantity = qty;
      item.line_subtotal = item.unit_price * qty;
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);

    cart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: this._buildCartResponse(cart)
    };
  }

  // 10) removeCartItem

  removeCartItem(cartItemId) {
    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return {
        success: false,
        cart: this._buildCartResponse(cart)
      };
    }

    const removed = cartItems.splice(idx, 1)[0];
    if (removed && Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== removed.id);
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);

    cart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: this._buildCartResponse(cart)
    };
  }

  // 11) getShippingMethods

  getShippingMethods() {
    return this._getFromStorage('shipping_methods', []);
  }

  // 12) setCartShippingMethod

  setCartShippingMethod(shippingMethodId) {
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const method = shippingMethods.find((sm) => sm.id === shippingMethodId);
    if (!method) {
      const cartExisting = this._getFromStorage('cart', null);
      return {
        success: false,
        cart: cartExisting ? this._buildCartResponse(cartExisting) : null
      };
    }

    let cart = this._getOrCreateCart();
    cart.selected_shipping_method_id = shippingMethodId;
    this._saveToStorage('cart', cart);

    cart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: this._buildCartResponse(cart)
    };
  }

  // 13) getCheckoutSummary

  getCheckoutSummary() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return {
        cart: null,
        items: [],
        available_shipping_methods: this._getFromStorage('shipping_methods', [])
      };
    }

    cart = this._recalculateCartTotals(cart);
    const detailedItems = this._buildCartItemsDetailed(cart).map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_subtotal: i.line_subtotal
    }));

    const available_shipping_methods = this._getFromStorage('shipping_methods', []);

    const shippingMethods = available_shipping_methods;
    const shippingMethod = cart.selected_shipping_method_id
      ? shippingMethods.find((sm) => sm.id === cart.selected_shipping_method_id) || null
      : null;

    return {
      cart: {
        ...cart,
        selected_shipping_method: shippingMethod
      },
      items: detailedItems,
      available_shipping_methods
    };
  }

  // 14) placeOrder

  placeOrder(customer, shipping_address, shippingMethodId) {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);

    if (!cart || !cart.id || cartItems.filter((ci) => ci.cart_id === cart.id).length === 0) {
      return {
        success: false,
        order_id: null,
        message: 'Cart is empty.',
        estimated_delivery: null
      };
    }

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    let methodId = shippingMethodId || cart.selected_shipping_method_id || null;
    let shippingMethod = methodId
      ? shippingMethods.find((sm) => sm.id === methodId) || null
      : null;

    const orders = this._getFromStorage('orders', []);
    const orderId = this._generateId('order');

    const order = {
      id: orderId,
      cart_id: cart.id,
      items: cartItems.filter((ci) => ci.cart_id === cart.id),
      customer: customer || null,
      shipping_address: shipping_address || null,
      shipping_method_id: shippingMethod ? shippingMethod.id : null,
      total: cart.total,
      created_at: this._now()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    const estimated_delivery = shippingMethod
      ? shippingMethod.estimated_transit_time || null
      : null;

    this._resetCartAfterOrder();

    return {
      success: true,
      order_id: orderId,
      message: 'Order placed successfully.',
      estimated_delivery
    };
  }

  // 15) getSolutionCategories

  getSolutionCategories() {
    const packages = this._getFromStorage('packages', []);
    const activePackages = packages.filter((p) => p.status === 'active');

    const typeSet = new Set();
    activePackages.forEach((p) => typeSet.add(p.property_type));

    const displayMap = {
      home: 'Home',
      office: 'Office',
      warehouse: 'Warehouse',
      apartment_building: 'Apartment Building',
      retail_store: 'Retail Store',
      restaurant: 'Restaurant',
      commercial_kitchen: 'Commercial Kitchen',
      other_property: 'Other Property Types'
    };

    const descriptionMap = {
      home: 'Packages tailored for single-family homes and condos.',
      office: 'Solutions for small to large office spaces.',
      warehouse: 'Fire detection for warehouses and industrial buildings.',
      apartment_building: 'Multi-story apartment and condo buildings.',
      retail_store: 'Retail and storefront fire alarm solutions.',
      restaurant: 'Dining areas with occupant safety requirements.',
      commercial_kitchen: 'Kitchens with hood suppression and high grease loads.',
      other_property: 'Other commercial and special-use properties.'
    };

    return Array.from(typeSet).map((t) => ({
      property_type: t,
      display_name: displayMap[t] || t,
      description: descriptionMap[t] || ''
    }));
  }

  // 16) getPackageFilterOptions

  getPackageFilterOptions() {
    const packages = this._getFromStorage('packages', []);

    const property_types = Array.from(new Set(packages.map((p) => p.property_type).filter(Boolean)));

    let min_upfront_price = null;
    let max_upfront_price = null;
    const capacity_labelsSet = new Set();

    packages.forEach((p) => {
      if (typeof p.upfront_price === 'number') {
        if (min_upfront_price === null || p.upfront_price < min_upfront_price) {
          min_upfront_price = p.upfront_price;
        }
        if (max_upfront_price === null || p.upfront_price > max_upfront_price) {
          max_upfront_price = p.upfront_price;
        }
      }
      if (p.capacity_label) capacity_labelsSet.add(p.capacity_label);
    });

    return {
      property_types,
      price_range: {
        min_upfront_price: min_upfront_price !== null ? min_upfront_price : 0,
        max_upfront_price: max_upfront_price !== null ? max_upfront_price : 0
      },
      capacity_labels: Array.from(capacity_labelsSet)
    };
  }

  // 17) listPackages

  listPackages(filters, sort_by) {
    const all = this._getFromStorage('packages', []);
    const f = filters || {};

    let items = all.filter((p) => p.status === 'active');

    if (f.property_type) {
      items = items.filter((p) => p.property_type === f.property_type);
    }

    if (typeof f.min_rooms === 'number') {
      items = items.filter((p) => {
        if (typeof p.max_rooms === 'number') {
          return p.max_rooms >= f.min_rooms;
        }
        return true;
      });
    }

    if (typeof f.max_rooms === 'number') {
      items = items.filter((p) => {
        if (typeof p.min_rooms === 'number') {
          return p.min_rooms <= f.max_rooms;
        }
        return true;
      });
    }

    if (typeof f.min_supported_device_count === 'number') {
      items = items.filter(
        (p) => typeof p.supported_device_count === 'number' && p.supported_device_count >= f.min_supported_device_count
      );
    }

    if (typeof f.max_upfront_price === 'number') {
      items = items.filter(
        (p) => typeof p.upfront_price === 'number' && p.upfront_price <= f.max_upfront_price
      );
    }

    const sortBy = sort_by || 'relevance';
    if (sortBy === 'upfront_cost_low_to_high') {
      items.sort((a, b) => (a.upfront_price || 0) - (b.upfront_price || 0));
    } else if (sortBy === 'upfront_cost_high_to_low') {
      items.sort((a, b) => (b.upfront_price || 0) - (a.upfront_price || 0));
    }

    return items;
  }

  // 18) getPackageDetail

  getPackageDetail(packageId) {
    const packages = this._getFromStorage('packages', []);
    const pkg = packages.find((p) => p.id === packageId) || null;

    if (!pkg) {
      return {
        package: null,
        included_devices: [],
        suitability: {
          recommended_property_types: [],
          recommended_rooms_range: ''
        }
      };
    }

    const included_devices = pkg.features || [];

    let recommended_rooms_range = '';
    if (pkg.capacity_label) {
      recommended_rooms_range = pkg.capacity_label;
    } else if (typeof pkg.min_rooms === 'number' || typeof pkg.max_rooms === 'number') {
      const parts = [];
      if (typeof pkg.min_rooms === 'number') parts.push('from ' + pkg.min_rooms);
      if (typeof pkg.max_rooms === 'number') parts.push('up to ' + pkg.max_rooms);
      recommended_rooms_range = parts.join(' ');
    }

    return {
      package: pkg,
      included_devices,
      suitability: {
        recommended_property_types: [pkg.property_type],
        recommended_rooms_range
      }
    };
  }

  // 19) submitQuoteRequest

  submitQuoteRequest(
    packageId,
    business_name,
    property_type,
    num_rooms,
    num_hallways,
    preferred_installation_date,
    contact_name,
    contact_email,
    contact_phone
  ) {
    const packages = this._getFromStorage('packages', []);
    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return {
        quote_request: null,
        success: false,
        message: 'Package not found.'
      };
    }

    const quoteRequests = this._getFromStorage('quote_requests', []);
    const id = this._generateId('quotereq');

    const preferredDateIso = preferred_installation_date
      ? new Date(preferred_installation_date).toISOString()
      : null;

    const qr = {
      id,
      package_id: packageId,
      business_name,
      property_type: property_type || pkg.property_type,
      num_rooms: typeof num_rooms === 'number' ? num_rooms : null,
      num_hallways: typeof num_hallways === 'number' ? num_hallways : null,
      preferred_installation_date: preferredDateIso,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      status: 'new',
      submitted_at: this._now()
    };

    quoteRequests.push(qr);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      quote_request: {
        ...qr,
        // Foreign key resolution
        package: pkg
      },
      success: true,
      message: 'Quote request submitted.'
    };
  }

  // 20) getServicesOverview

  getServicesOverview() {
    const plans = this._getFromStorage('maintenance_plans', []);
    const activePlans = plans.filter((p) => p.status === 'active');

    const featured_maintenance_plans = activePlans
      .slice()
      .sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return (a.monthly_price || 0) - (b.monthly_price || 0);
      })
      .slice(0, 3);

    const service_categories = [
      {
        code: 'maintenance_plans',
        display_name: 'Maintenance Plans',
        description: 'Recurring inspections, testing, and monitoring services.'
      },
      {
        code: 'inspections',
        display_name: 'Inspections',
        description: 'Annual and periodic fire system inspections.'
      },
      {
        code: 'monitoring',
        display_name: 'Monitoring',
        description: '24/7 central station monitoring options.'
      }
    ];

    const inspection_summary = {
      description: 'Schedule annual or periodic fire system inspections for any property type.',
      common_inspection_types: [
        'Annual fire system inspection',
        'Semi-annual inspection',
        'Commissioning and acceptance testing'
      ]
    };

    return {
      service_categories,
      featured_maintenance_plans,
      inspection_summary
    };
  }

  // 21) listMaintenancePlans

  listMaintenancePlans(filters) {
    const plans = this._getFromStorage('maintenance_plans', []);
    const f = filters || {};

    let items = plans.filter((p) => p.status === 'active');

    if (typeof f.monitoring_required === 'boolean' && f.monitoring_required) {
      items = items.filter((p) => !!p.monitoring_included);
    }

    if (typeof f.min_inspections_per_year === 'number') {
      items = items.filter((p) => p.inspections_per_year >= f.min_inspections_per_year);
    }

    if (typeof f.max_monthly_price === 'number') {
      items = items.filter((p) => p.monthly_price <= f.max_monthly_price);
    }

    return items;
  }

  // 22) getMaintenancePlanDetail

  getMaintenancePlanDetail(maintenancePlanId) {
    const plans = this._getFromStorage('maintenance_plans', []);
    const plan = plans.find((p) => p.id === maintenancePlanId) || null;

    if (!plan) {
      return {
        plan: null,
        monitoring_type_label: null,
        meets_two_inspections_per_year: false,
        within_budget_under_100: false
      };
    }

    const monitoringTypeLabels = {
      none: 'No monitoring',
      basic: 'Basic monitoring',
      twenty_four_seven: '24/7 monitoring'
    };

    const monitoring_type_label = plan.monitoring_type
      ? monitoringTypeLabels[plan.monitoring_type] || plan.monitoring_type
      : null;

    const meets_two_inspections_per_year = plan.inspections_per_year >= 2;
    const within_budget_under_100 = plan.monthly_price < 100;

    return {
      plan,
      monitoring_type_label,
      meets_two_inspections_per_year,
      within_budget_under_100
    };
  }

  // 23) submitMaintenanceEnrollment

  submitMaintenanceEnrollment(
    maintenance_plan_id,
    business_name,
    property_type,
    zip_code,
    floors_covered,
    preferred_start_date,
    billing_preference
  ) {
    const plans = this._getFromStorage('maintenance_plans', []);
    const plan = plans.find((p) => p.id === maintenance_plan_id) || null;
    if (!plan) {
      return {
        enrollment: null,
        success: false,
        message: 'Maintenance plan not found.'
      };
    }

    const enrollments = this._getFromStorage('maintenance_enrollments', []);
    const id = this._generateId('maintenroll');

    const preferredStartIso = preferred_start_date
      ? new Date(preferred_start_date).toISOString()
      : null;

    const enrollment = {
      id,
      maintenance_plan_id,
      business_name,
      property_type,
      zip_code,
      floors_covered,
      preferred_start_date: preferredStartIso,
      billing_preference,
      status: 'new',
      submitted_at: this._now()
    };

    enrollments.push(enrollment);
    this._saveToStorage('maintenance_enrollments', enrollments);

    return {
      enrollment: {
        ...enrollment,
        // Foreign key resolution
        maintenance_plan: plan
      },
      success: true,
      message: 'Maintenance enrollment submitted.'
    };
  }

  // 24) getInspectionConfig

  getInspectionConfig() {
    const property_types = [
      'warehouse',
      'office',
      'residential',
      'apartment_building',
      'retail_store',
      'restaurant',
      'other_property'
    ];

    const inspection_types = [
      'annual_fire_system_inspection',
      'quarterly_inspection',
      'semi_annual_inspection',
      'commissioning',
      'other'
    ];

    const time_slots = [
      { code: 'morning', label: '8:00 AM – 12:00 PM' },
      { code: 'afternoon', label: '12:00 PM – 4:00 PM' },
      { code: 'evening', label: '4:00 PM – 7:00 PM' },
      { code: 'full_day', label: 'Full-day window' }
    ];

    return {
      property_types,
      inspection_types,
      time_slots
    };
  }

  // 25) submitInspectionBooking

  submitInspectionBooking(
    property_type,
    floor_area_sq_ft,
    inspection_type,
    date_range_start,
    date_range_end,
    preferred_time_slot,
    street_address,
    zip_code
  ) {
    const validation = this._validateDateRange(date_range_start, date_range_end);
    if (!validation.valid) {
      return {
        inspection_booking: null,
        success: false,
        message: validation.message
      };
    }

    const bookings = this._getFromStorage('inspection_bookings', []);
    const id = this._generateId('inspect');

    const booking = {
      id,
      property_type,
      floor_area_sq_ft,
      inspection_type,
      date_range_start: validation.start,
      date_range_end: validation.end,
      preferred_time_slot,
      street_address,
      zip_code,
      status: 'pending',
      submitted_at: this._now()
    };

    bookings.push(booking);
    this._saveToStorage('inspection_bookings', bookings);

    return {
      inspection_booking: booking,
      success: true,
      message: 'Inspection booking submitted.'
    };
  }

  // 26) searchArticles

  searchArticles(query, section, published_after) {
    const articles = this._getFromStorage('articles', []);
    const q = (query || '').toLowerCase().trim();
    const sectionFilter = section || null;
    const after = published_after ? new Date(published_after) : null;

    const results = articles.filter((a) => {
      if (a.status !== 'published') return false;
      if (sectionFilter && a.section !== sectionFilter) return false;
      if (after && new Date(a.publication_date) < after) return false;
      if (!q) return true;
      const text = (a.title + ' ' + a.content + ' ' + (a.tags || []).join(' ')).toLowerCase();
      return text.indexOf(q) !== -1;
    });

    // Instrumentation for task completion tracking (Task 5 - article search params)
    try {
      const normalizedQuery = q; // already lowercased and trimmed
      const hasSmoke = normalizedQuery.includes('smoke');
      const hasHeat = normalizedQuery.includes('heat');
      const normalizedSection = (section || '').toLowerCase();
      const isArticlesSection =
        !normalizedSection || normalizedSection === 'articles' || normalizedSection === 'blog';

      if (hasSmoke && hasHeat && isArticlesSection) {
        localStorage.setItem(
          'task5_articleSearchParams',
          JSON.stringify({ query, section, published_after })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return results;
  }

  // 27) getArticleDetail

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const products = this._getFromStorage('products', []);

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        related_products: [],
        key_takeaways: []
      };
    }

    const related_products = (article.related_product_ids || [])
      .map((pid) => products.find((p) => p.id === pid))
      .filter((p) => !!p);

    const key_takeaways = this._extractKeyTakeaways(article.content);

    // Instrumentation for task completion tracking (Task 5 - viewed comparison article)
    try {
      if (article && article.status === 'published') {
        const parts = [];
        if (article.title) parts.push(article.title);
        if (article.content) parts.push(article.content);
        if (Array.isArray(article.tags)) parts.push(article.tags.join(' '));
        const combinedText = parts.join(' ').toLowerCase();

        if (combinedText.includes('smoke') && combinedText.includes('heat')) {
          localStorage.setItem(
            'task5_viewedComparisonArticle',
            JSON.stringify({
              article_id: article.id,
              title: article.title,
              publication_date: article.publication_date,
              related_product_ids: article.related_product_ids || []
            })
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article,
      related_products,
      key_takeaways
    };
  }

  // 28) listComplianceGuides

  listComplianceGuides(property_type) {
    const guides = this._getFromStorage('compliance_guides', []);

    return guides.filter((g) => {
      if (g.status !== 'published') return false;
      if (property_type && g.property_type !== property_type) return false;
      return true;
    });
  }

  // 29) getComplianceGuideDetail

  getComplianceGuideDetail(guideId) {
    const guides = this._getFromStorage('compliance_guides', []);
    const guide = guides.find((g) => g.id === guideId) || null;

    if (!guide) {
      return {
        guide: null,
        applicable_codes: [],
        recommended_practices: []
      };
    }

    // Basic heuristics could be added here; keep empty to avoid mocking details.
    return {
      guide,
      applicable_codes: [],
      recommended_practices: []
    };
  }

  // 30) submitConsultationRequest

  submitConsultationRequest(
    guide_id,
    business_name,
    business_type,
    seating_capacity,
    kitchen_hood_count,
    preferred_contact_method,
    email,
    phone,
    preferred_contact_time_window
  ) {
    const guides = this._getFromStorage('compliance_guides', []);
    const guide = guides.find((g) => g.id === guide_id) || null;
    if (!guide) {
      return {
        consultation_request: null,
        success: false,
        message: 'Compliance guide not found.'
      };
    }

    const requests = this._getFromStorage('consultation_requests', []);
    const id = this._generateId('consult');

    const req = {
      id,
      guide_id,
      business_name,
      business_type,
      seating_capacity: typeof seating_capacity === 'number' ? seating_capacity : null,
      kitchen_hood_count: typeof kitchen_hood_count === 'number' ? kitchen_hood_count : null,
      preferred_contact_method,
      email: email || null,
      phone: phone || null,
      preferred_contact_time_window: preferred_contact_time_window || null,
      status: 'new',
      submitted_at: this._now()
    };

    requests.push(req);
    this._saveToStorage('consultation_requests', requests);

    return {
      consultation_request: {
        ...req,
        // Foreign key resolution
        guide
      },
      success: true,
      message: 'Consultation request submitted.'
    };
  }

  // 31) getSystemDesignerOptions

  getSystemDesignerOptions() {
    const property_types = [
      'apartment_building',
      'office',
      'warehouse',
      'restaurant',
      'residential',
      'other_property'
    ];

    const system_types = ['addressable', 'conventional', 'wireless', 'hybrid'];

    const risk_levels = ['low', 'standard_residential', 'high', 'very_high'];

    return {
      property_types,
      system_types,
      risk_levels
    };
  }

  // 32) previewSystemDesign

  previewSystemDesign(property_type, num_floors, rooms_per_floor, system_type, risk_level) {
    const floors = num_floors || 0;
    const rooms = rooms_per_floor || 0;
    const totalRooms = floors * rooms;

    const device_recommendations = [];

    if (totalRooms > 0) {
      device_recommendations.push({
        device_type: 'smoke_detector',
        quantity: totalRooms,
        notes: 'One smoke detector per room.'
      });

      const heatQty = Math.max(1, Math.ceil(totalRooms / 5));
      device_recommendations.push({
        device_type: 'heat_detector',
        quantity: heatQty,
        notes: 'Heat detectors for kitchens or high-risk areas (estimated).'
      });
    }

    device_recommendations.push({
      device_type: 'control_panel',
      quantity: 1,
      notes: 'Single main fire alarm control panel.'
    });

    if (floors > 0) {
      const sirenQty = Math.max(1, floors);
      device_recommendations.push({
        device_type: 'siren',
        quantity: sirenQty,
        notes: 'At least one audible device per floor.'
      });
      device_recommendations.push({
        device_type: 'strobe',
        quantity: sirenQty,
        notes: 'Visual notification per floor.'
      });
    }

    return {
      device_recommendations
    };
  }

  // 33) saveSystemDesign

  saveSystemDesign(
    name,
    property_type,
    num_floors,
    rooms_per_floor,
    system_type,
    risk_level,
    device_recommendations
  ) {
    const result = this._persistSystemDesign({
      name,
      property_type,
      num_floors,
      rooms_per_floor,
      system_type,
      risk_level,
      device_recommendations: device_recommendations || []
    });

    return {
      system_design: result.design,
      device_recommendations: result.savedDeviceRecs,
      success: true
    };
  }

  // 34) getSupportTopics

  getSupportTopics() {
    return [
      {
        topic_id: 'false_alarms',
        title: 'Troubleshooting false alarms',
        related_issue_types: ['false_alarm']
      },
      {
        topic_id: 'no_power',
        title: 'Device shows no power',
        related_issue_types: ['no_power']
      },
      {
        topic_id: 'connectivity',
        title: 'Wireless connectivity issues',
        related_issue_types: ['connectivity']
      },
      {
        topic_id: 'configuration',
        title: 'Configuration and programming',
        related_issue_types: ['configuration']
      }
    ];
  }

  // 35) submitSupportRequest

  submitSupportRequest(
    product_category,
    product_model,
    issue_type,
    description,
    priority,
    preferred_contact_method,
    phone,
    email
  ) {
    const requests = this._getFromStorage('support_requests', []);
    const id = this._generateId('support');

    const req = {
      id,
      product_category,
      product_model: product_model || null,
      issue_type,
      description,
      priority,
      preferred_contact_method,
      phone: phone || null,
      email: email || null,
      status: 'new',
      submitted_at: this._now()
    };

    requests.push(req);
    this._saveToStorage('support_requests', requests);

    return {
      support_request: req,
      success: true,
      message: 'Support request submitted.'
    };
  }

  // 36) getAboutInfo

  getAboutInfo() {
    return {
      mission: 'To provide reliable fire detection, suppression, and life safety solutions.',
      experience_summary:
        'Our team has extensive experience designing, installing, and maintaining fire protection systems for residential and commercial properties.',
      certifications: [
        'NICET-certified technicians',
        'Factory-trained on leading fire alarm brands'
      ],
      coverage_areas: ['Local region and surrounding communities'],
      contact_details: {
        phone: '',
        email: '',
        address: ''
      }
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