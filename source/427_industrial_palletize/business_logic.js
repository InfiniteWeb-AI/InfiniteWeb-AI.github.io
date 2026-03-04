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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const ensureKey = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core data tables
    ensureKey('product_categories', []); // ProductCategory
    ensureKey('products', []); // Product
    ensureKey('product_comparisons', []); // ProductComparisonSession
    ensureKey('spare_parts', []); // SparePart
    ensureKey('cart', null); // single Cart object or null
    ensureKey('cart_items', []); // CartItem[]
    ensureKey('quotes', []); // Quote[]
    ensureKey('quote_items', []); // QuoteItem[]
    ensureKey('documents', []); // Document[]
    ensureKey('service_centers', []); // ServiceCenter[]
    ensureKey('service_requests', []); // ServiceRequest[]
    ensureKey('demo_requests', []); // DemoRequest[]
    ensureKey('roi_calculations', []); // ROICalculation[]
    ensureKey('roi_inquiries', []); // ROIInquiry[]
    ensureKey('industries', []); // Industry[]
    ensureKey('system_solutions', []); // SystemSolution[]
    ensureKey('system_components', []); // SystemComponent[]
    ensureKey('case_studies', []); // CaseStudy[]
    ensureKey('contact_inquiries', []); // ContactInquiry[]

    // Optional CMS-ish content used by some getters (kept empty by default)
    ensureKey('support_services', []);
    ensureKey('support_tools', []);
    ensureKey('primary_support_contact', null);
    ensureKey('about_page_content', null);
    ensureKey('tool_shortcuts', []);

    // Seed a small set of robotic palletizer products if none exist yet
    try {
      const productsRaw = localStorage.getItem('products');
      let products = [];
      if (productsRaw) {
        try {
          products = JSON.parse(productsRaw);
          if (!Array.isArray(products)) {
            products = [];
          }
        } catch (e) {
          products = [];
        }
      }

      const hasRobotic = products.some((p) => p && p.product_type === 'robotic_palletizer');
      if (!hasRobotic) {
        const nowIso = new Date().toISOString();
        products = products.concat([
          {
            id: 'prod_rp300',
            category_id: 'robotic_palletizers',
            name: 'RP-300 Medium-Payload Robotic Palletizer',
            model_number: 'RP-300',
            product_type: 'robotic_palletizer',
            throughput_cases_per_min: 40,
            throughput_pallets_per_hour: 20,
            footprint_m2: 14.0,
            payload_kg: 80,
            price_usd: 135000,
            short_description:
              'Compact 4-axis robotic palletizer for cases and bags up to 80 kg payload.',
            long_description: '',
            image_url: '',
            spec_sheet_url: '',
            is_active: true,
            created_at: nowIso
          },
          {
            id: 'prod_rp320',
            category_id: 'robotic_palletizers',
            name: 'RP-320 High-Payload Robotic Palletizer',
            model_number: 'RP-320',
            product_type: 'robotic_palletizer',
            throughput_cases_per_min: 45,
            throughput_pallets_per_hour: 22,
            footprint_m2: 16.0,
            payload_kg: 120,
            price_usd: 148000,
            short_description:
              'High-payload robotic palletizer for demanding multi-line applications.',
            long_description: '',
            image_url: '',
            spec_sheet_url: '',
            is_active: true,
            created_at: nowIso
          }
        ]);
        localStorage.setItem('products', JSON.stringify(products));
      }
    } catch (e) {
      // If seeding fails, continue with existing data.
    }

    // ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
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

  // ------------------------
  // Cart helpers
  // ------------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    const nowIso = new Date().toISOString();

    if (!cart || typeof cart !== 'object' || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem ids (denormalized)
        total_amount_usd: 0,
        created_at: nowIso,
        updated_at: nowIso
      };
      this._saveToStorage('cart', cart);
    }

    return cart;
  }

  _recalculateCartTotals(cartId) {
    const cart = this._getFromStorage('cart', null);
    if (!cart || cart.id !== cartId) {
      return 0;
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const relevantItems = cartItems.filter((ci) => ci.cart_id === cartId);
    const total = relevantItems.reduce((sum, item) => sum + (item.line_total_usd || 0), 0);

    cart.total_amount_usd = total;
    cart.items = relevantItems.map((item) => item.id);
    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);

    return total;
  }

  // ------------------------
  // Quote helpers
  // ------------------------

  _getOrCreateDraftQuote() {
    let quotes = this._getFromStorage('quotes', []);
    let draftQuoteId = localStorage.getItem('currentDraftQuoteId');
    let draft = null;

    if (draftQuoteId) {
      draft = quotes.find((q) => q.id === draftQuoteId && q.status === 'draft') || null;
    }

    if (!draft) {
      draft = quotes.find((q) => q.status === 'draft') || null;
      if (draft) {
        localStorage.setItem('currentDraftQuoteId', draft.id);
      }
    }

    if (!draft) {
      const nowIso = new Date().toISOString();
      draft = {
        id: this._generateId('quote'),
        status: 'draft',
        project_name: null,
        quote_notes: null,
        company_name: null,
        company_city: null,
        production_volume_description: null,
        total_estimated_price_usd: 0,
        created_at: nowIso,
        submitted_at: null
      };
      quotes.push(draft);
      this._saveToStorage('quotes', quotes);
      localStorage.setItem('currentDraftQuoteId', draft.id);
    }

    return draft;
  }

  _recalculateQuoteTotals(quoteId) {
    let quotes = this._getFromStorage('quotes', []);
    const quoteItems = this._getFromStorage('quote_items', []);

    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) {
      return 0;
    }

    const relevantItems = quoteItems.filter((qi) => qi.quote_id === quoteId);
    const total = relevantItems.reduce((sum, item) => sum + (item.estimated_price_usd || 0), 0);

    quote.total_estimated_price_usd = total;
    this._saveToStorage('quotes', quotes);
    return total;
  }

  // ------------------------
  // ROI helpers
  // ------------------------

  _calculateRoiMetrics(numOperators, hourlyWage, hoursPerDay, daysPerYear, equipmentCost) {
    const annualHours = hoursPerDay * daysPerYear;
    const annualCostPerOperator = hourlyWage * annualHours;
    const estimatedAnnualSavings = annualCostPerOperator * numOperators;

    let paybackMonths = null;
    if (estimatedAnnualSavings > 0) {
      const paybackYears = equipmentCost / estimatedAnnualSavings;
      paybackMonths = paybackYears * 12;
    }

    return {
      estimatedAnnualSavings,
      paybackMonths
    };
  }

  // ------------------------
  // Filtering helpers
  // ------------------------

  _applyProductFiltersAndSorting(products, filters = {}, sort_by) {
    let result = Array.isArray(products) ? products.slice() : [];
    const f = filters || {};

    result = result.filter((p) => {
      if (!p.is_active) return false;

      if (f.min_throughput_cases_per_min != null) {
        if (p.throughput_cases_per_min == null || p.throughput_cases_per_min < f.min_throughput_cases_per_min) {
          return false;
        }
      }
      if (f.max_throughput_cases_per_min != null) {
        if (p.throughput_cases_per_min == null || p.throughput_cases_per_min > f.max_throughput_cases_per_min) {
          return false;
        }
      }
      if (f.min_throughput_pallets_per_hour != null) {
        if (p.throughput_pallets_per_hour == null || p.throughput_pallets_per_hour < f.min_throughput_pallets_per_hour) {
          return false;
        }
      }
      if (f.max_throughput_pallets_per_hour != null) {
        if (p.throughput_pallets_per_hour == null || p.throughput_pallets_per_hour > f.max_throughput_pallets_per_hour) {
          return false;
        }
      }
      if (f.max_footprint_m2 != null) {
        if (p.footprint_m2 == null || p.footprint_m2 > f.max_footprint_m2) {
          return false;
        }
      }
      if (f.min_payload_kg != null) {
        if (p.payload_kg == null || p.payload_kg < f.min_payload_kg) {
          return false;
        }
      }
      if (f.min_price_usd != null) {
        if (p.price_usd == null || p.price_usd < f.min_price_usd) {
          return false;
        }
      }
      if (f.max_price_usd != null) {
        if (p.price_usd == null || p.price_usd > f.max_price_usd) {
          return false;
        }
      }

      return true;
    });

    const sb = sort_by || '';
    const numberOrZero = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0);

    result.sort((a, b) => {
      switch (sb) {
        case 'speed_desc':
          return numberOrZero(b.throughput_cases_per_min) - numberOrZero(a.throughput_cases_per_min);
        case 'speed_asc':
          return numberOrZero(a.throughput_cases_per_min) - numberOrZero(b.throughput_cases_per_min);
        case 'price_desc':
          return numberOrZero(b.price_usd) - numberOrZero(a.price_usd);
        case 'price_asc':
          return numberOrZero(a.price_usd) - numberOrZero(b.price_usd);
        case 'throughput_pallets_desc':
          return numberOrZero(b.throughput_pallets_per_hour) - numberOrZero(a.throughput_pallets_per_hour);
        case 'throughput_pallets_asc':
          return numberOrZero(a.throughput_pallets_per_hour) - numberOrZero(b.throughput_pallets_per_hour);
        case 'name_desc':
          return String(b.name || '').localeCompare(String(a.name || ''));
        case 'name_asc':
        default:
          return String(a.name || '').localeCompare(String(b.name || ''));
      }
    });

    return result;
  }

  _applySparePartFiltersAndSorting(spareParts, filters = {}, sort_by) {
    const parts = Array.isArray(spareParts) ? spareParts.slice() : [];
    const products = this._getFromStorage('products', []);
    const f = filters || {};

    const filtered = parts.filter((part) => {
      if (part.is_active === false) return false;

      // Filter by machine_model_number compatibility
      if (f.machine_model_number) {
        const mmn = String(f.machine_model_number).toLowerCase();
        let compatible = false;

        if (Array.isArray(part.compatible_model_numbers)) {
          compatible = part.compatible_model_numbers.some(
            (m) => String(m).toLowerCase() === mmn
          );
        }

        if (!compatible && Array.isArray(part.compatible_product_ids)) {
          const matchedProducts = products.filter((p) =>
            part.compatible_product_ids.indexOf(p.id) !== -1 &&
            String(p.model_number || '').toLowerCase() === mmn
          );
          if (matchedProducts.length > 0) compatible = true;
        }

        if (!compatible) return false;
      }

      if (f.min_rating != null) {
        if (part.average_rating == null || part.average_rating < f.min_rating) {
          return false;
        }
      }

      if (f.max_unit_price_usd != null) {
        if (part.price_usd == null || part.price_usd > f.max_unit_price_usd) {
          return false;
        }
      }

      return true;
    });

    const sb = sort_by || '';
    const numberOrZero = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0);

    filtered.sort((a, b) => {
      switch (sb) {
        case 'price_desc':
          return numberOrZero(b.price_usd) - numberOrZero(a.price_usd);
        case 'rating_desc':
          return numberOrZero(b.average_rating) - numberOrZero(a.average_rating);
        case 'name_asc':
          return String(a.name || '').localeCompare(String(b.name || ''));
        case 'price_asc':
        default:
          return numberOrZero(a.price_usd) - numberOrZero(b.price_usd);
      }
    });

    return filtered;
  }

  _applySystemSolutionFiltersAndSorting(systemSolutions, filters = {}, sort_by) {
    let result = Array.isArray(systemSolutions) ? systemSolutions.slice() : [];
    const f = filters || {};

    result = result.filter((s) => {
      if (!s.is_active) return false;

      if (f.industry_code && s.industry_code !== f.industry_code) {
        return false;
      }

      const minTh = f.min_throughput_pallets_per_hour;
      const maxTh = f.max_throughput_pallets_per_hour;

      if (minTh != null && s.throughput_max_pallets_per_hour < minTh) {
        return false;
      }

      if (maxTh != null && s.throughput_min_pallets_per_hour > maxTh) {
        return false;
      }

      if (f.max_total_system_price_usd != null) {
        if (s.total_system_price_usd == null || s.total_system_price_usd > f.max_total_system_price_usd) {
          return false;
        }
      }

      return true;
    });

    const sb = sort_by || '';
    const numberOrZero = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0);

    result.sort((a, b) => {
      switch (sb) {
        case 'throughput_desc': {
          const aTh = numberOrZero(a.throughput_max_pallets_per_hour);
          const bTh = numberOrZero(b.throughput_max_pallets_per_hour);
          return bTh - aTh;
        }
        case 'throughput_asc': {
          const aTh = numberOrZero(a.throughput_min_pallets_per_hour);
          const bTh = numberOrZero(b.throughput_min_pallets_per_hour);
          return aTh - bTh;
        }
        case 'price_desc':
          return numberOrZero(b.total_system_price_usd) - numberOrZero(a.total_system_price_usd);
        case 'price_asc':
          return numberOrZero(a.total_system_price_usd) - numberOrZero(b.total_system_price_usd);
        case 'name_desc':
          return String(b.name || '').localeCompare(String(a.name || ''));
        case 'name_asc':
        default:
          return String(a.name || '').localeCompare(String(b.name || ''));
      }
    });

    return result;
  }

  // ------------------------
  // Service center helpers
  // ------------------------

  _findNearestServiceCenters(postal_code, radius_miles, centers) {
    // In absence of geocoding data, we preserve any existing distance_miles if present
    // and leave it null otherwise. We then sort by distance when available.
    const withDistances = (centers || []).map((c) => {
      const distance = typeof c.distance_miles === 'number' ? c.distance_miles : null;
      return { ...c, distance_miles: distance };
    });

    withDistances.sort((a, b) => {
      const da = a.distance_miles != null ? a.distance_miles : Number.POSITIVE_INFINITY;
      const db = b.distance_miles != null ? b.distance_miles : Number.POSITIVE_INFINITY;
      return da - db;
    });

    // Optionally filter by radius when distance is known
    return withDistances.filter((c) => {
      if (c.distance_miles == null) return true; // keep when unknown
      return c.distance_miles <= radius_miles;
    });
  }

  // ------------------------
  // Homepage helper
  // ------------------------

  _getFeaturedHomepageContent() {
    const categories = this._getFromStorage('product_categories', []);
    const products = this._getFromStorage('products', []);
    const systemSolutions = this._getFromStorage('system_solutions', []);
    const industries = this._getFromStorage('industries', []);

    const featured_product_categories = categories
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .slice(0, 4)
      .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description || '',
        sort_order: c.sort_order || 0
      }));

    const featured_products = products
      .filter((p) => p.is_active)
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        name: p.name,
        model_number: p.model_number,
        category_name: (categories.find((c) => c.id === p.category_id) || {}).name || '',
        product_type: p.product_type,
        throughput_cases_per_min: p.throughput_cases_per_min,
        throughput_pallets_per_hour: p.throughput_pallets_per_hour,
        footprint_m2: p.footprint_m2,
        payload_kg: p.payload_kg,
        price_usd: p.price_usd,
        short_description: p.short_description || '',
        image_url: p.image_url || ''
      }));

    const featured_system_solutions = systemSolutions
      .filter((s) => s.is_active)
      .slice(0, 6)
      .map((s) => ({
        id: s.id,
        name: s.name,
        industry_name: (industries.find((i) => i.code === s.industry_code) || {}).name || '',
        throughput_min_pallets_per_hour: s.throughput_min_pallets_per_hour,
        throughput_max_pallets_per_hour: s.throughput_max_pallets_per_hour,
        total_system_price_usd: s.total_system_price_usd,
        is_recommended_on_industry_page: !!s.is_recommended_on_industry_page
      }));

    // Tool shortcuts can be configured in localStorage; default to a sensible set
    let tool_shortcuts = this._getFromStorage('tool_shortcuts', null);
    if (!Array.isArray(tool_shortcuts) || tool_shortcuts.length === 0) {
      tool_shortcuts = [
        {
          code: 'roi_calculator',
          title: 'ROI Calculator',
          description: 'Estimate payback for automating your palletizing.',
          target_page_code: 'roi_calculator'
        },
        {
          code: 'service_centers',
          title: 'Service Centers',
          description: 'Find authorized service near your plant.',
          target_page_code: 'service_centers'
        },
        {
          code: 'downloads_manuals',
          title: 'Downloads & Manuals',
          description: 'Access operator and maintenance manuals.',
          target_page_code: 'downloads_manuals'
        },
        {
          code: 'equipment_demos',
          title: 'Equipment Demos',
          description: 'Schedule an on-site, in-house, or virtual demo.',
          target_page_code: 'equipment_demos'
        }
      ];
      this._saveToStorage('tool_shortcuts', tool_shortcuts);
    }

    return {
      featured_product_categories,
      featured_products,
      featured_system_solutions,
      tool_shortcuts
    };
  }

  // ------------------------
  // Date validation helpers
  // ------------------------

  _validateDemoDate(dateString) {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const demoMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return demoMidnight >= todayMidnight;
  }

  _validateServiceRequestDate(dateString) {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const visitMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return visitMidnight >= todayMidnight;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomepageContent
  getHomepageContent() {
    return this._getFeaturedHomepageContent();
  }

  // getProductCategories
  getProductCategories() {
    const categories = this._getFromStorage('product_categories', []);
    return categories.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description || '',
      sort_order: c.sort_order || 0
    }));
  }

  // getProductFilterOptions(categoryId)
  getProductFilterOptions(categoryId) {
    const products = this._getFromStorage('products', []).filter(
      (p) => p.category_id === categoryId && p.is_active
    );

    const gatherRange = (items, field) => {
      const values = items
        .map((it) => it[field])
        .filter((v) => typeof v === 'number' && !isNaN(v));
      if (values.length === 0) return { min: null, max: null };
      return {
        min: Math.min.apply(null, values),
        max: Math.max.apply(null, values)
      };
    };

    const throughputCases = gatherRange(products, 'throughput_cases_per_min');
    const throughputPallets = gatherRange(products, 'throughput_pallets_per_hour');
    const footprint = gatherRange(products, 'footprint_m2');
    const price = gatherRange(products, 'price_usd');
    const payload = gatherRange(products, 'payload_kg');

    return {
      throughput_cases_per_min: {
        min: throughputCases.min,
        max: throughputCases.max,
        step: 1,
        presets: [
          { label: '0-30 cpm', min: 0, max: 30 },
          { label: '30-60 cpm', min: 30, max: 60 },
          { label: '60-90 cpm', min: 60, max: 90 }
        ]
      },
      throughput_pallets_per_hour: {
        min: throughputPallets.min,
        max: throughputPallets.max,
        step: 1
      },
      footprint_m2: {
        min: footprint.min,
        max: footprint.max,
        step: 0.5,
        presets: [
          { label: 'Up to 12 m²', max: 12 },
          { label: 'Up to 20 m²', max: 20 }
        ]
      },
      price_usd: {
        min: price.min,
        max: price.max,
        step: 1000
      },
      payload_kg: {
        min: payload.min,
        max: payload.max,
        step: 5
      }
    };
  }

  // listProducts(categoryId, filters, sort_by, page, page_size)
  listProducts(categoryId, filters, sort_by, page = 1, page_size = 20) {
    const allProducts = this._getFromStorage('products', []).filter(
      (p) => p.category_id === categoryId && p.is_active
    );
    const categories = this._getFromStorage('product_categories', []);

    const filteredSorted = this._applyProductFiltersAndSorting(allProducts, filters, sort_by);
    const total_count = filteredSorted.length;

    const pg = page || 1;
    const ps = page_size || 20;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = filteredSorted.slice(start, end).map((p) => ({
      id: p.id,
      name: p.name,
      model_number: p.model_number,
      category_name: (categories.find((c) => c.id === p.category_id) || {}).name || '',
      product_type: p.product_type,
      throughput_cases_per_min: p.throughput_cases_per_min,
      throughput_pallets_per_hour: p.throughput_pallets_per_hour,
      footprint_m2: p.footprint_m2,
      payload_kg: p.payload_kg,
      price_usd: p.price_usd,
      short_description: p.short_description || '',
      image_url: p.image_url || '',
      is_active: !!p.is_active
    }));

    return {
      items,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const documents = this._getFromStorage('documents', []);
    const spareParts = this._getFromStorage('spare_parts', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const systemSolutions = this._getFromStorage('system_solutions', []);

    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      return {
        product: null,
        related_documents: [],
        related_spare_parts: [],
        related_case_studies: [],
        primary_system_solutions: []
      };
    }

    const category = categories.find((c) => c.id === product.category_id) || {};

    const productDetails = {
      id: product.id,
      category_id: product.category_id,
      category_name: category.name || '',
      name: product.name,
      model_number: product.model_number,
      product_type: product.product_type,
      throughput_cases_per_min: product.throughput_cases_per_min,
      throughput_pallets_per_hour: product.throughput_pallets_per_hour,
      footprint_m2: product.footprint_m2,
      payload_kg: product.payload_kg,
      price_usd: product.price_usd,
      short_description: product.short_description || '',
      long_description: product.long_description || '',
      image_url: product.image_url || '',
      spec_sheet_url: product.spec_sheet_url || '',
      is_active: !!product.is_active,
      created_at: product.created_at
    };

    const related_documents = documents
      .filter((d) => d.is_active && d.model_number === product.model_number)
      .map((d) => ({
        id: d.id,
        title: d.title,
        document_type: d.document_type,
        language_code: d.language_code,
        file_url: d.file_url,
        file_size_kb: d.file_size_kb
      }));

    const related_spare_parts = spareParts
      .filter((sp) => {
        if (sp.is_active === false) return false;
        let compatible = false;
        if (Array.isArray(sp.compatible_product_ids)) {
          compatible = sp.compatible_product_ids.indexOf(product.id) !== -1;
        }
        if (!compatible && Array.isArray(sp.compatible_model_numbers)) {
          compatible = sp.compatible_model_numbers.indexOf(product.model_number) !== -1;
        }
        return compatible;
      })
      .map((sp) => ({
        id: sp.id,
        name: sp.name,
        part_number: sp.part_number,
        price_usd: sp.price_usd,
        average_rating: sp.average_rating,
        rating_count: sp.rating_count
      }));

    const related_case_studies = caseStudies
      .filter((cs) => {
        if (product.product_type === 'robotic_palletizer') {
          return cs.product_technology === 'robotic_palletizers';
        }
        if (product.product_type === 'conventional_palletizer') {
          return cs.product_technology === 'conventional_palletizers';
        }
        return true;
      })
      .map((cs) => ({
        id: cs.id,
        title: cs.title,
        summary: cs.summary || '',
        implementation_year: cs.implementation_year,
        industry_code: cs.industry_code,
        product_technology: cs.product_technology
      }));

    const primary_system_solutions = systemSolutions
      .filter((ss) => ss.primary_palletizer_product_id === product.id && ss.is_active)
      .map((ss) => ({
        id: ss.id,
        name: ss.name,
        industry_code: ss.industry_code,
        throughput_min_pallets_per_hour: ss.throughput_min_pallets_per_hour,
        throughput_max_pallets_per_hour: ss.throughput_max_pallets_per_hour,
        total_system_price_usd: ss.total_system_price_usd
      }));

    return {
      product: productDetails,
      related_documents,
      related_spare_parts,
      related_case_studies,
      primary_system_solutions
    };
  }

  // createProductComparisonSession(productIds)
  createProductComparisonSession(productIds) {
    const ids = Array.isArray(productIds) ? Array.from(new Set(productIds)) : [];
    const products = this._getFromStorage('products', []);

    const validProducts = products.filter((p) => ids.indexOf(p.id) !== -1);
    const session = {
      id: this._generateId('product_comparison'),
      product_ids: validProducts.map((p) => p.id),
      created_at: new Date().toISOString()
    };

    const sessions = this._getFromStorage('product_comparisons', []);
    sessions.push(session);
    this._saveToStorage('product_comparisons', sessions);

    const mappedProducts = validProducts.map((p) => ({
      id: p.id,
      name: p.name,
      model_number: p.model_number,
      product_type: p.product_type,
      throughput_cases_per_min: p.throughput_cases_per_min,
      throughput_pallets_per_hour: p.throughput_pallets_per_hour,
      footprint_m2: p.footprint_m2,
      payload_kg: p.payload_kg,
      price_usd: p.price_usd,
      image_url: p.image_url || ''
    }));

    return {
      comparison_session_id: session.id,
      created_at: session.created_at,
      products: mappedProducts
    };
  }

  // getProductComparison(comparisonSessionId)
  getProductComparison(comparisonSessionId) {
    const sessions = this._getFromStorage('product_comparisons', []);
    const products = this._getFromStorage('products', []);

    const session = sessions.find((s) => s.id === comparisonSessionId) || null;
    if (!session) {
      return {
        comparison_session_id: null,
        created_at: null,
        products: []
      };
    }

    const mappedProducts = products
      .filter((p) => session.product_ids.indexOf(p.id) !== -1)
      .map((p) => ({
        id: p.id,
        name: p.name,
        model_number: p.model_number,
        product_type: p.product_type,
        throughput_cases_per_min: p.throughput_cases_per_min,
        throughput_pallets_per_hour: p.throughput_pallets_per_hour,
        footprint_m2: p.footprint_m2,
        payload_kg: p.payload_kg,
        price_usd: p.price_usd,
        image_url: p.image_url || ''
      }));

    return {
      comparison_session_id: session.id,
      created_at: session.created_at,
      products: mappedProducts
    };
  }

  // submitSingleProductQuoteRequest(productId, equipment_of_interest, company_name, company_city, production_volume_description, additional_notes)
  submitSingleProductQuoteRequest(
    productId,
    equipment_of_interest,
    company_name,
    company_city,
    production_volume_description,
    additional_notes
  ) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;

    const quotes = this._getFromStorage('quotes', []);
    const quoteItems = this._getFromStorage('quote_items', []);

    const nowIso = new Date().toISOString();
    const quoteId = this._generateId('quote');

    const estimatedPrice = product && typeof product.price_usd === 'number'
      ? product.price_usd
      : 0;

    const quote = {
      id: quoteId,
      status: 'submitted',
      project_name: null,
      quote_notes: additional_notes || null,
      company_name,
      company_city,
      production_volume_description,
      total_estimated_price_usd: estimatedPrice,
      created_at: nowIso,
      submitted_at: nowIso
    };

    quotes.push(quote);

    const quoteItem = {
      id: this._generateId('quote_item'),
      quote_id: quoteId,
      source_type: 'product',
      product_id: productId,
      system_solution_id: null,
      equipment_label: equipment_of_interest,
      quantity: 1,
      estimated_price_usd: estimatedPrice,
      is_system_bundle: false,
      included_components: null,
      notes: additional_notes || ''
    };

    quoteItems.push(quoteItem);

    this._saveToStorage('quotes', quotes);
    this._saveToStorage('quote_items', quoteItems);

    return {
      success: true,
      quote_id: quoteId,
      message: 'Quote request submitted.',
      submitted_quote: {
        status: quote.status,
        company_name: quote.company_name,
        company_city: quote.company_city,
        production_volume_description: quote.production_volume_description,
        total_estimated_price_usd: quote.total_estimated_price_usd,
        submitted_at: quote.submitted_at
      }
    };
  }

  // addProductToQuote(productId, quantity = 1, notes)
  addProductToQuote(productId, quantity = 1, notes) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        quote_id: null,
        message: 'Product not found.',
        quote_item: null,
        quote_summary: null
      };
    }

    const quote = this._getOrCreateDraftQuote();
    const quoteItems = this._getFromStorage('quote_items', []);

    const qty = quantity != null ? quantity : 1;
    const unitPrice = typeof product.price_usd === 'number' ? product.price_usd : 0;
    const linePrice = unitPrice * qty;

    const quoteItemId = this._generateId('quote_item');
    const quoteItem = {
      id: quoteItemId,
      quote_id: quote.id,
      source_type: 'product',
      product_id: productId,
      system_solution_id: null,
      equipment_label: product.name || product.model_number,
      quantity: qty,
      estimated_price_usd: linePrice,
      is_system_bundle: false,
      included_components: null,
      notes: notes || ''
    };

    quoteItems.push(quoteItem);
    this._saveToStorage('quote_items', quoteItems);
    const total = this._recalculateQuoteTotals(quote.id);

    const totalItems = quoteItems.filter((qi) => qi.quote_id === quote.id).length;

    return {
      success: true,
      quote_id: quote.id,
      message: 'Product added to quote.',
      quote_item: {
        quote_item_id: quoteItem.id,
        equipment_label: quoteItem.equipment_label,
        product_id: quoteItem.product_id,
        quantity: quoteItem.quantity,
        estimated_price_usd: quoteItem.estimated_price_usd,
        is_system_bundle: quoteItem.is_system_bundle,
        included_components: quoteItem.included_components,
        notes: quoteItem.notes
      },
      quote_summary: {
        total_items: totalItems,
        total_estimated_price_usd: total
      }
    };
  }

  // getQuoteSummary()
  getQuoteSummary() {
    const quotes = this._getFromStorage('quotes', []);
    const quoteItems = this._getFromStorage('quote_items', []);
    const products = this._getFromStorage('products', []);
    const systemSolutions = this._getFromStorage('system_solutions', []);

    let quote = null;
    let draftQuoteId = localStorage.getItem('currentDraftQuoteId');

    if (draftQuoteId) {
      quote = quotes.find((q) => q.id === draftQuoteId) || null;
    }

    if (!quote) {
      // Prefer draft quote, else last created
      const drafts = quotes.filter((q) => q.status === 'draft');
      if (drafts.length > 0) {
        quote = drafts[0];
      } else if (quotes.length > 0) {
        quote = quotes[quotes.length - 1];
      }
    }

    if (!quote) {
      return {
        has_quote: false,
        quote: null
      };
    }

    const itemsRaw = quoteItems.filter((qi) => qi.quote_id === quote.id);

    const items = itemsRaw.map((qi) => {
      const product = qi.product_id
        ? products.find((p) => p.id === qi.product_id) || null
        : null;
      const system_solution = qi.system_solution_id
        ? systemSolutions.find((s) => s.id === qi.system_solution_id) || null
        : null;

      return {
        quote_item_id: qi.id,
        source_type: qi.source_type,
        product_id: qi.product_id || null,
        system_solution_id: qi.system_solution_id || null,
        equipment_label: qi.equipment_label,
        quantity: qi.quantity,
        estimated_price_usd: qi.estimated_price_usd,
        is_system_bundle: !!qi.is_system_bundle,
        included_components: qi.included_components || [],
        notes: qi.notes || '',
        product,
        system_solution
      };
    });

    return {
      has_quote: true,
      quote: {
        quote_id: quote.id,
        status: quote.status,
        project_name: quote.project_name || '',
        quote_notes: quote.quote_notes || '',
        company_name: quote.company_name || '',
        company_city: quote.company_city || '',
        production_volume_description: quote.production_volume_description || '',
        total_estimated_price_usd: quote.total_estimated_price_usd || 0,
        created_at: quote.created_at,
        submitted_at: quote.submitted_at,
        items
      }
    };
  }

  // updateQuoteMetadata(project_name, quote_notes, company_name, company_city, production_volume_description)
  updateQuoteMetadata(
    project_name,
    quote_notes,
    company_name,
    company_city,
    production_volume_description
  ) {
    const quote = this._getOrCreateDraftQuote();
    let quotes = this._getFromStorage('quotes', []);
    const q = quotes.find((x) => x.id === quote.id);

    if (!q) {
      return {
        success: false,
        quote_id: null,
        updated_quote: null
      };
    }

    if (project_name !== undefined) q.project_name = project_name;
    if (quote_notes !== undefined) q.quote_notes = quote_notes;
    if (company_name !== undefined) q.company_name = company_name;
    if (company_city !== undefined) q.company_city = company_city;
    if (production_volume_description !== undefined) {
      q.production_volume_description = production_volume_description;
    }

    this._saveToStorage('quotes', quotes);

    return {
      success: true,
      quote_id: q.id,
      updated_quote: {
        project_name: q.project_name || '',
        quote_notes: q.quote_notes || '',
        company_name: q.company_name || '',
        company_city: q.company_city || '',
        production_volume_description: q.production_volume_description || ''
      }
    };
  }

  // updateQuoteItem(quoteItemId, quantity, notes)
  updateQuoteItem(quoteItemId, quantity, notes) {
    let quoteItems = this._getFromStorage('quote_items', []);
    const products = this._getFromStorage('products', []);
    const systemSolutions = this._getFromStorage('system_solutions', []);

    const item = quoteItems.find((qi) => qi.id === quoteItemId);
    if (!item) {
      return {
        success: false,
        quote_id: null,
        updated_item: null,
        quote_total_estimated_price_usd: null
      };
    }

    if (quantity != null) {
      item.quantity = quantity;

      // Recalculate estimated_price_usd based on product/system price
      let unitPrice = 0;
      if (item.source_type === 'product' && item.product_id) {
        const p = products.find((pr) => pr.id === item.product_id);
        unitPrice = p && typeof p.price_usd === 'number' ? p.price_usd : 0;
      } else if (item.source_type === 'system_solution' && item.system_solution_id) {
        const s = systemSolutions.find((ss) => ss.id === item.system_solution_id);
        unitPrice = s && typeof s.total_system_price_usd === 'number' ? s.total_system_price_usd : 0;
      }
      item.estimated_price_usd = unitPrice * item.quantity;
    }

    if (notes !== undefined) {
      item.notes = notes;
    }

    this._saveToStorage('quote_items', quoteItems);
    const total = this._recalculateQuoteTotals(item.quote_id);

    return {
      success: true,
      quote_id: item.quote_id,
      updated_item: {
        quote_item_id: item.id,
        quantity: item.quantity,
        notes: item.notes || '',
        estimated_price_usd: item.estimated_price_usd
      },
      quote_total_estimated_price_usd: total
    };
  }

  // removeQuoteItem(quoteItemId)
  removeQuoteItem(quoteItemId) {
    let quoteItems = this._getFromStorage('quote_items', []);
    const idx = quoteItems.findIndex((qi) => qi.id === quoteItemId);

    if (idx === -1) {
      return {
        success: false,
        quote_id: null,
        quote_total_estimated_price_usd: null,
        message: 'Quote item not found.'
      };
    }

    const quoteId = quoteItems[idx].quote_id;
    quoteItems.splice(idx, 1);
    this._saveToStorage('quote_items', quoteItems);
    const total = this._recalculateQuoteTotals(quoteId);

    return {
      success: true,
      quote_id: quoteId,
      quote_total_estimated_price_usd: total,
      message: 'Quote item removed.'
    };
  }

  // submitQuote()
  submitQuote() {
    let quotes = this._getFromStorage('quotes', []);
    let quote = null;
    let draftQuoteId = localStorage.getItem('currentDraftQuoteId');

    if (draftQuoteId) {
      quote = quotes.find((q) => q.id === draftQuoteId && q.status === 'draft') || null;
    }

    if (!quote) {
      quote = quotes.find((q) => q.status === 'draft') || null;
    }

    if (!quote) {
      return {
        success: false,
        quote_id: null,
        status: null,
        submitted_at: null,
        message: 'No draft quote to submit.'
      };
    }

    quote.status = 'submitted';
    quote.submitted_at = new Date().toISOString();
    this._saveToStorage('quotes', quotes);

    // Clear the current draft reference
    localStorage.removeItem('currentDraftQuoteId');

    return {
      success: true,
      quote_id: quote.id,
      status: quote.status,
      submitted_at: quote.submitted_at,
      message: 'Quote submitted.'
    };
  }

  // getSparePartsMachineOptions(search)
  getSparePartsMachineOptions(search) {
    const products = this._getFromStorage('products', []);
    const term = search ? String(search).toLowerCase() : null;

    const filtered = products.filter((p) => {
      if (!p.is_active) return false;
      const type = p.product_type;
      if (
        type !== 'conventional_palletizer' &&
        type !== 'robotic_palletizer' &&
        type !== 'system_solution'
      ) {
        return false;
      }
      if (!term) return true;
      const inName = String(p.name || '').toLowerCase().indexOf(term) !== -1;
      const inModel = String(p.model_number || '').toLowerCase().indexOf(term) !== -1;
      return inName || inModel;
    });

    return filtered.map((p) => ({
      product_id: p.id,
      name: p.name,
      model_number: p.model_number,
      product_type: p.product_type
    }));
  }

  // getSparePartsFilterOptions()
  getSparePartsFilterOptions() {
    const spareParts = this._getFromStorage('spare_parts', []);

    const ratingValues = spareParts
      .map((sp) => sp.average_rating)
      .filter((v) => typeof v === 'number' && !isNaN(v));

    const priceValues = spareParts
      .map((sp) => sp.price_usd)
      .filter((v) => typeof v === 'number' && !isNaN(v));

    const ratingRange = {
      min: ratingValues.length ? Math.min.apply(null, ratingValues) : null,
      max: ratingValues.length ? Math.max.apply(null, ratingValues) : null
    };

    const priceRange = {
      min: priceValues.length ? Math.min.apply(null, priceValues) : null,
      max: priceValues.length ? Math.max.apply(null, priceValues) : null
    };

    return {
      rating: {
        min: ratingRange.min,
        max: ratingRange.max,
        step: 0.5,
        presets: [
          { label: '4 stars & up', min_rating: 4 },
          { label: '3 stars & up', min_rating: 3 },
          { label: '2 stars & up', min_rating: 2 }
        ]
      },
      price_usd: {
        min: priceRange.min,
        max: priceRange.max,
        step: 10
      }
    };
  }

  // listSpareParts(machine_model_number, min_rating, max_unit_price_usd, sort_by, page, page_size)
  listSpareParts(
    machine_model_number,
    min_rating,
    max_unit_price_usd,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const spareParts = this._getFromStorage('spare_parts', []);

    const filters = {
      machine_model_number,
      min_rating,
      max_unit_price_usd
    };

    const filteredSorted = this._applySparePartFiltersAndSorting(spareParts, filters, sort_by);
    const total_count = filteredSorted.length;

    const pg = page || 1;
    const ps = page_size || 20;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = filteredSorted.slice(start, end).map((sp) => ({
      id: sp.id,
      name: sp.name,
      part_number: sp.part_number,
      description: sp.description || '',
      price_usd: sp.price_usd,
      average_rating: sp.average_rating,
      rating_count: sp.rating_count,
      compatible_model_numbers: Array.isArray(sp.compatible_model_numbers)
        ? sp.compatible_model_numbers.slice()
        : []
    }));

    return {
      items,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // getSparePartDetails(sparePartId)
  getSparePartDetails(sparePartId) {
    const spareParts = this._getFromStorage('spare_parts', []);
    const products = this._getFromStorage('products', []);

    const sp = spareParts.find((s) => s.id === sparePartId) || null;
    if (!sp) {
      return {
        spare_part: null,
        compatible_products: []
      };
    }

    const spare_part = {
      id: sp.id,
      name: sp.name,
      part_number: sp.part_number,
      description: sp.description || '',
      price_usd: sp.price_usd,
      average_rating: sp.average_rating,
      rating_count: sp.rating_count,
      compatible_model_numbers: Array.isArray(sp.compatible_model_numbers)
        ? sp.compatible_model_numbers.slice()
        : [],
      image_url: sp.image_url || '',
      is_active: sp.is_active !== false,
      created_at: sp.created_at
    };

    const compatibleProductsMap = {};

    if (Array.isArray(sp.compatible_product_ids)) {
      sp.compatible_product_ids.forEach((pid) => {
        const p = products.find((prod) => prod.id === pid);
        if (p && !compatibleProductsMap[p.id]) {
          compatibleProductsMap[p.id] = {
            product_id: p.id,
            name: p.name,
            model_number: p.model_number
          };
        }
      });
    }

    if (Array.isArray(sp.compatible_model_numbers)) {
      sp.compatible_model_numbers.forEach((modelNum) => {
        products
          .filter((p) => p.model_number === modelNum)
          .forEach((p) => {
            if (!compatibleProductsMap[p.id]) {
              compatibleProductsMap[p.id] = {
                product_id: p.id,
                name: p.name,
                model_number: p.model_number
              };
            }
          });
      });
    }

    const compatible_products = Object.keys(compatibleProductsMap).map(
      (id) => compatibleProductsMap[id]
    );

    return {
      spare_part,
      compatible_products
    };
  }

  // addSparePartToCart(sparePartId, quantity = 1)
  addSparePartToCart(sparePartId, quantity = 1) {
    const spareParts = this._getFromStorage('spare_parts', []);
    const sp = spareParts.find((s) => s.id === sparePartId);
    if (!sp) {
      return {
        success: false,
        cart_id: null,
        message: 'Spare part not found.',
        cart_item: null,
        cart_total_amount_usd: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const existing = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.spare_part_id === sparePartId
    );

    const qty = quantity != null ? quantity : 1;

    if (existing) {
      existing.quantity += qty;
      existing.line_total_usd = (sp.price_usd || 0) * existing.quantity;
    } else {
      const cartItemId = this._generateId('cart_item');
      const newItem = {
        id: cartItemId,
        cart_id: cart.id,
        spare_part_id: sparePartId,
        part_name: sp.name,
        unit_price_usd: sp.price_usd || 0,
        quantity: qty,
        line_total_usd: (sp.price_usd || 0) * qty,
        added_at: new Date().toISOString()
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const total = this._recalculateCartTotals(cart.id);

    const effectiveItem = existing || cartItems.find((ci) => ci.cart_id === cart.id && ci.spare_part_id === sparePartId);

    return {
      success: true,
      cart_id: cart.id,
      message: 'Spare part added to cart.',
      cart_item: effectiveItem
        ? {
            cart_item_id: effectiveItem.id,
            spare_part_id: effectiveItem.spare_part_id,
            part_name: effectiveItem.part_name,
            unit_price_usd: effectiveItem.unit_price_usd,
            quantity: effectiveItem.quantity,
            line_total_usd: effectiveItem.line_total_usd
          }
        : null,
      cart_total_amount_usd: total
    };
  }

  // getCart()
  getCart() {
    const cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      return {
        has_cart: false,
        cart: null
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const spareParts = this._getFromStorage('spare_parts', []);

    const itemsRaw = cartItems.filter((ci) => ci.cart_id === cart.id);
    if (itemsRaw.length === 0) {
      return {
        has_cart: false,
        cart: null
      };
    }

    const items = itemsRaw.map((ci) => {
      const spare_part = spareParts.find((sp) => sp.id === ci.spare_part_id) || null;
      return {
        cart_item_id: ci.id,
        spare_part_id: ci.spare_part_id,
        part_name: ci.part_name,
        unit_price_usd: ci.unit_price_usd,
        quantity: ci.quantity,
        line_total_usd: ci.line_total_usd,
        added_at: ci.added_at,
        spare_part
      };
    });

    return {
      has_cart: true,
      cart: {
        cart_id: cart.id,
        total_amount_usd: cart.total_amount_usd || 0,
        created_at: cart.created_at,
        updated_at: cart.updated_at,
        items
      }
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const item = cartItems.find((ci) => ci.id === cartItemId);

    if (!item) {
      return {
        success: false,
        cart_id: null,
        updated_item: null,
        total_amount_usd: null
      };
    }

    if (quantity <= 0) {
      // Remove item if quantity is zero or negative
      cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
      this._saveToStorage('cart_items', cartItems);
      const total = this._recalculateCartTotals(item.cart_id);
      return {
        success: true,
        cart_id: item.cart_id,
        updated_item: null,
        total_amount_usd: total
      };
    }

    item.quantity = quantity;
    item.line_total_usd = (item.unit_price_usd || 0) * item.quantity;

    this._saveToStorage('cart_items', cartItems);
    const total = this._recalculateCartTotals(item.cart_id);

    return {
      success: true,
      cart_id: item.cart_id,
      updated_item: {
        cart_item_id: item.id,
        quantity: item.quantity,
        line_total_usd: item.line_total_usd
      },
      total_amount_usd: total
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (idx === -1) {
      return {
        success: false,
        cart_id: null,
        total_amount_usd: null,
        message: 'Cart item not found.'
      };
    }

    const cartId = cartItems[idx].cart_id;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);
    const total = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cart_id: cartId,
      total_amount_usd: total,
      message: 'Cart item removed.'
    };
  }

  // getSupportOverview()
  getSupportOverview() {
    const support_services = this._getFromStorage('support_services', []);
    const support_tools = this._getFromStorage('support_tools', []);
    const primary_support_contact = this._getFromStorage('primary_support_contact', null) || {
      phone_number: '',
      email: ''
    };

    return {
      support_services,
      support_tools,
      primary_support_contact
    };
  }

  // getDocumentTypeOptions()
  getDocumentTypeOptions() {
    const document_types = [
      { code: 'operator_manual', label: 'Operator Manual' },
      { code: 'maintenance_manual', label: 'Maintenance Manual' },
      { code: 'installation_guide', label: 'Installation Guide' },
      { code: 'brochure', label: 'Brochure' },
      { code: 'other', label: 'Other' }
    ];

    const languages = [
      { code: 'en', label: 'English' },
      { code: 'es', label: 'Spanish' },
      { code: 'fr', label: 'French' },
      { code: 'de', label: 'German' },
      { code: 'zh', label: 'Chinese' },
      { code: 'other', label: 'Other' }
    ];

    return {
      document_types,
      languages
    };
  }

  // searchDocuments(model_number, document_type, language_code, page, page_size)
  searchDocuments(model_number, document_type, language_code, page = 1, page_size = 20) {
    const documents = this._getFromStorage('documents', []);

    const filtered = documents.filter((d) => {
      if (d.is_active === false) return false;
      if (model_number && d.model_number !== model_number) return false;
      if (document_type && d.document_type !== document_type) return false;
      if (language_code && d.language_code !== language_code) return false;
      return true;
    });

    // Instrumentation for task completion tracking (task3_operatorManualLocated)
    try {
      if (
        model_number === 'AP-4000' &&
        document_type === 'operator_manual' &&
        filtered.some((d) => d.language_code === 'en')
      ) {
        localStorage.setItem('task3_operatorManualLocated', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    filtered.sort((a, b) => {
      const da = a.uploaded_at || '';
      const db = b.uploaded_at || '';
      return String(db).localeCompare(String(da));
    });

    const total_count = filtered.length;
    const pg = page || 1;
    const ps = page_size || 20;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = filtered.slice(start, end).map((d) => ({
      id: d.id,
      title: d.title,
      model_number: d.model_number,
      document_type: d.document_type,
      language_code: d.language_code,
      file_url: d.file_url,
      file_size_kb: d.file_size_kb,
      uploaded_at: d.uploaded_at,
      is_active: d.is_active !== false
    }));

    // Instrumentation for task completion tracking (task3_searchParams)
    try {
      localStorage.setItem(
        'task3_searchParams',
        JSON.stringify({
          model_number,
          document_type,
          language_code,
          result_ids: items.map((d) => d.id)
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      items,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // searchServiceCenters(postal_code, radius_miles)
  searchServiceCenters(postal_code, radius_miles) {
    const centersRaw = this._getFromStorage('service_centers', []);
    const centers = this._findNearestServiceCenters(postal_code, radius_miles, centersRaw);

    return {
      search_postal_code: postal_code,
      radius_miles,
      centers: centers.map((c) => ({
        id: c.id,
        name: c.name,
        address_line1: c.address_line1 || '',
        city: c.city || '',
        state_region: c.state_region || '',
        postal_code: c.postal_code || '',
        country: c.country || '',
        phone_number: c.phone_number || '',
        email: c.email || '',
        distance_miles: c.distance_miles != null ? c.distance_miles : null,
        capabilities: Array.isArray(c.capabilities) ? c.capabilities.slice() : [],
        is_authorized: c.is_authorized !== false
      }))
    };
  }

  // getServiceCenterDetails(serviceCenterId)
  getServiceCenterDetails(serviceCenterId) {
    const centers = this._getFromStorage('service_centers', []);
    const c = centers.find((sc) => sc.id === serviceCenterId) || null;

    if (!c) {
      return {
        service_center: null
      };
    }

    return {
      service_center: {
        id: c.id,
        name: c.name,
        address_line1: c.address_line1 || '',
        address_line2: c.address_line2 || '',
        city: c.city || '',
        state_region: c.state_region || '',
        postal_code: c.postal_code || '',
        country: c.country || '',
        phone_number: c.phone_number || '',
        email: c.email || '',
        capabilities: Array.isArray(c.capabilities) ? c.capabilities.slice() : [],
        is_authorized: c.is_authorized !== false
      }
    };
  }

  // createServiceRequest(preferred_service_center_id, machine_model, issue_description, preferred_visit_date, contact_name, contact_phone, contact_email)
  createServiceRequest(
    preferred_service_center_id,
    machine_model,
    issue_description,
    preferred_visit_date,
    contact_name,
    contact_phone,
    contact_email
  ) {
    const centers = this._getFromStorage('service_centers', []);
    const center = centers.find((c) => c.id === preferred_service_center_id);

    if (!center) {
      return {
        success: false,
        service_request_id: null,
        status: null,
        message: 'Service center not found.'
      };
    }

    if (!this._validateServiceRequestDate(preferred_visit_date)) {
      return {
        success: false,
        service_request_id: null,
        status: null,
        message: 'Invalid preferred visit date.'
      };
    }

    const serviceRequests = this._getFromStorage('service_requests', []);
    const nowIso = new Date().toISOString();
    const reqId = this._generateId('service_request');

    const request = {
      id: reqId,
      preferred_service_center_id,
      machine_model,
      issue_description,
      preferred_visit_date: new Date(preferred_visit_date).toISOString(),
      contact_name,
      contact_phone,
      contact_email: contact_email || null,
      status: 'submitted',
      created_at: nowIso,
      submitted_at: nowIso
    };

    serviceRequests.push(request);
    this._saveToStorage('service_requests', serviceRequests);

    return {
      success: true,
      service_request_id: reqId,
      status: 'submitted',
      message: 'Service request submitted.'
    };
  }

  // getDemoOptionsOverview()
  getDemoOptionsOverview() {
    const demo_types = [
      { code: 'on_site_demo', name: 'On-site Demo', description: 'Demo at your facility.' },
      { code: 'in_house_demo', name: 'In-house Demo', description: 'Demo at our test center.' },
      { code: 'virtual_demo', name: 'Virtual Demo', description: 'Remote online demonstration.' }
    ];

    const equipment_types = [
      { code: 'conventional_palletizer', name: 'Conventional Palletizer', description: '' },
      { code: 'robotic_palletizer', name: 'Robotic Palletizer', description: '' },
      { code: 'system_solution', name: 'System Solution', description: '' },
      { code: 'other', name: 'Other', description: '' }
    ];

    return {
      demo_types,
      equipment_types
    };
  }

  // createDemoRequest(demo_type, equipment_type, preferred_demo_date, company_name, plant_location, production_line_description)
  createDemoRequest(
    demo_type,
    equipment_type,
    preferred_demo_date,
    company_name,
    plant_location,
    production_line_description
  ) {
    if (!this._validateDemoDate(preferred_demo_date)) {
      return {
        success: false,
        demo_request_id: null,
        status: null,
        message: 'Invalid preferred demo date.'
      };
    }

    const demoRequests = this._getFromStorage('demo_requests', []);
    const nowIso = new Date().toISOString();
    const id = this._generateId('demo_request');

    const req = {
      id,
      demo_type,
      equipment_type,
      preferred_demo_date: new Date(preferred_demo_date).toISOString(),
      company_name,
      plant_location,
      production_line_description,
      status: 'submitted',
      created_at: nowIso,
      submitted_at: nowIso
    };

    demoRequests.push(req);
    this._saveToStorage('demo_requests', demoRequests);

    return {
      success: true,
      demo_request_id: id,
      status: 'submitted',
      message: 'Demo request submitted.'
    };
  }

  // createROICalculation(num_operators_replaced, hourly_wage_usd, hours_per_day, days_per_year, equipment_investment_cost_usd)
  createROICalculation(
    num_operators_replaced,
    hourly_wage_usd,
    hours_per_day,
    days_per_year,
    equipment_investment_cost_usd
  ) {
    const { estimatedAnnualSavings, paybackMonths } = this._calculateRoiMetrics(
      num_operators_replaced,
      hourly_wage_usd,
      hours_per_day,
      days_per_year,
      equipment_investment_cost_usd
    );

    const roiCalcs = this._getFromStorage('roi_calculations', []);
    const nowIso = new Date().toISOString();
    const id = this._generateId('roi_calc');

    const rec = {
      id,
      num_operators_replaced,
      hourly_wage_usd,
      hours_per_day,
      days_per_year,
      equipment_investment_cost_usd,
      calculated_payback_months: paybackMonths,
      estimated_annual_savings_usd: estimatedAnnualSavings,
      created_at: nowIso
    };

    roiCalcs.push(rec);
    this._saveToStorage('roi_calculations', roiCalcs);

    return {
      roi_calculation_id: id,
      num_operators_replaced,
      hourly_wage_usd,
      hours_per_day,
      days_per_year,
      equipment_investment_cost_usd,
      calculated_payback_months: paybackMonths,
      estimated_annual_savings_usd: estimatedAnnualSavings,
      created_at: nowIso
    };
  }

  // createROIInquiry(roi_calculation_id, project_notes, contact_name, contact_email)
  createROIInquiry(roi_calculation_id, project_notes, contact_name, contact_email) {
    const roiCalcs = this._getFromStorage('roi_calculations', []);
    const calc = roiCalcs.find((r) => r.id === roi_calculation_id);

    if (!calc) {
      return {
        success: false,
        roi_inquiry_id: null,
        message: 'ROI calculation not found.'
      };
    }

    const roiInquiries = this._getFromStorage('roi_inquiries', []);
    const id = this._generateId('roi_inquiry');
    const nowIso = new Date().toISOString();

    const rec = {
      id,
      roi_calculation_id,
      project_notes,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      created_at: nowIso
    };

    roiInquiries.push(rec);
    this._saveToStorage('roi_inquiries', roiInquiries);

    return {
      success: true,
      roi_inquiry_id: id,
      message: 'ROI inquiry submitted.'
    };
  }

  // getIndustries()
  getIndustries() {
    const industries = this._getFromStorage('industries', []);
    return industries.map((i) => ({
      id: i.id,
      code: i.code,
      name: i.name,
      description: i.description || ''
    }));
  }

  // getIndustryOverview(industry_code)
  getIndustryOverview(industry_code) {
    const industries = this._getFromStorage('industries', []);
    const systemSolutions = this._getFromStorage('system_solutions', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const systemComponents = this._getFromStorage('system_components', []);
    const products = this._getFromStorage('products', []);

    const industry = industries.find((i) => i.code === industry_code) || null;

    const recommended_system_solutions = systemSolutions
      .filter((ss) => ss.industry_code === industry_code && ss.is_active)
      .map((ss) => ({
        id: ss.id,
        name: ss.name,
        throughput_min_pallets_per_hour: ss.throughput_min_pallets_per_hour,
        throughput_max_pallets_per_hour: ss.throughput_max_pallets_per_hour,
        total_system_price_usd: ss.total_system_price_usd,
        is_recommended_on_industry_page: !!ss.is_recommended_on_industry_page
      }));

    const highlighted_case_studies = caseStudies
      .filter((cs) => cs.industry_code === industry_code)
      .map((cs) => ({
        id: cs.id,
        title: cs.title,
        summary: cs.summary || '',
        implementation_year: cs.implementation_year,
        product_technology: cs.product_technology,
        is_frozen_food_related: !!cs.is_frozen_food_related
      }));

    // Featured products: any primary palletizers used in system solutions for this industry
    const featuredProductsMap = {};
    systemSolutions
      .filter((ss) => ss.industry_code === industry_code && ss.primary_palletizer_product_id)
      .forEach((ss) => {
        const p = products.find((pr) => pr.id === ss.primary_palletizer_product_id);
        if (p && !featuredProductsMap[p.id]) {
          featuredProductsMap[p.id] = {
            id: p.id,
            name: p.name,
            model_number: p.model_number,
            product_type: p.product_type,
            short_description: p.short_description || '',
            throughput_pallets_per_hour: p.throughput_pallets_per_hour
          };
        }
      });

    const featured_products = Object.keys(featuredProductsMap).map(
      (id) => featuredProductsMap[id]
    );

    return {
      industry: industry
        ? {
            id: industry.id,
            code: industry.code,
            name: industry.name,
            description: industry.description || ''
          }
        : null,
      recommended_system_solutions,
      highlighted_case_studies,
      featured_products
    };
  }

  // listSystemSolutions(industry_code, min_throughput_pallets_per_hour, max_throughput_pallets_per_hour, max_total_system_price_usd, sort_by, page, page_size)
  listSystemSolutions(
    industry_code,
    min_throughput_pallets_per_hour,
    max_throughput_pallets_per_hour,
    max_total_system_price_usd,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const systemSolutions = this._getFromStorage('system_solutions', []);
    const industries = this._getFromStorage('industries', []);
    const products = this._getFromStorage('products', []);

    const filters = {
      industry_code,
      min_throughput_pallets_per_hour,
      max_throughput_pallets_per_hour,
      max_total_system_price_usd
    };

    const filteredSorted = this._applySystemSolutionFiltersAndSorting(
      systemSolutions,
      filters,
      sort_by
    );

    const total_count = filteredSorted.length;
    const pg = page || 1;
    const ps = page_size || 20;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = filteredSorted.slice(start, end).map((ss) => {
      const industry = industries.find((i) => i.code === ss.industry_code) || {};
      const primaryProduct = products.find((p) => p.id === ss.primary_palletizer_product_id);
      return {
        id: ss.id,
        name: ss.name,
        industry_code: ss.industry_code,
        industry_name: industry.name || '',
        throughput_min_pallets_per_hour: ss.throughput_min_pallets_per_hour,
        throughput_max_pallets_per_hour: ss.throughput_max_pallets_per_hour,
        total_system_price_usd: ss.total_system_price_usd,
        primary_palletizer_product_name: primaryProduct ? primaryProduct.name : '',
        is_recommended_on_industry_page: !!ss.is_recommended_on_industry_page
      };
    });

    return {
      items,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // getSystemSolutionDetail(systemSolutionId)
  getSystemSolutionDetail(systemSolutionId) {
    const systemSolutions = this._getFromStorage('system_solutions', []);
    const systemComponents = this._getFromStorage('system_components', []);
    const products = this._getFromStorage('products', []);

    const ss = systemSolutions.find((s) => s.id === systemSolutionId) || null;

    if (!ss) {
      return {
        system_solution: null,
        components: []
      };
    }

    const primaryProduct = ss.primary_palletizer_product_id
      ? products.find((p) => p.id === ss.primary_palletizer_product_id) || null
      : null;

    const system_solution = {
      id: ss.id,
      name: ss.name,
      industry_code: ss.industry_code,
      description: ss.description || '',
      throughput_min_pallets_per_hour: ss.throughput_min_pallets_per_hour,
      throughput_max_pallets_per_hour: ss.throughput_max_pallets_per_hour,
      total_system_price_usd: ss.total_system_price_usd,
      primary_palletizer_product_id: ss.primary_palletizer_product_id || null,
      primary_palletizer_product_name: primaryProduct ? primaryProduct.name : '',
      is_recommended_on_industry_page: !!ss.is_recommended_on_industry_page
    };

    const components = systemComponents
      .filter((c) => c.system_solution_id === systemSolutionId)
      .map((c) => {
        const product = c.product_id
          ? products.find((p) => p.id === c.product_id) || null
          : null;
        return {
          id: c.id,
          component_type: c.component_type,
          name: c.name,
          product_id: c.product_id || null,
          product_model_number: product ? product.model_number : null,
          quantity: c.quantity,
          product
        };
      });

    return {
      system_solution,
      components
    };
  }

  // addSystemSolutionToQuote(systemSolutionId, quantity = 1, notes)
  addSystemSolutionToQuote(systemSolutionId, quantity = 1, notes) {
    const systemSolutions = this._getFromStorage('system_solutions', []);
    const systemComponents = this._getFromStorage('system_components', []);
    const ss = systemSolutions.find((s) => s.id === systemSolutionId);

    if (!ss) {
      return {
        success: false,
        quote_id: null,
        message: 'System solution not found.',
        quote_item: null,
        quote_summary: null
      };
    }

    const quote = this._getOrCreateDraftQuote();
    const quoteItems = this._getFromStorage('quote_items', []);

    const qty = quantity != null ? quantity : 1;
    const unitPrice = typeof ss.total_system_price_usd === 'number' ? ss.total_system_price_usd : 0;
    const linePrice = unitPrice * qty;

    const componentNames = systemComponents
      .filter((c) => c.system_solution_id === systemSolutionId)
      .map((c) => c.name || c.component_type);

    const id = this._generateId('quote_item');
    const item = {
      id,
      quote_id: quote.id,
      source_type: 'system_solution',
      product_id: null,
      system_solution_id: systemSolutionId,
      equipment_label: ss.name,
      quantity: qty,
      estimated_price_usd: linePrice,
      is_system_bundle: true,
      included_components: componentNames,
      notes: notes || ''
    };

    quoteItems.push(item);
    this._saveToStorage('quote_items', quoteItems);
    const total = this._recalculateQuoteTotals(quote.id);

    const totalItems = quoteItems.filter((qi) => qi.quote_id === quote.id).length;

    return {
      success: true,
      quote_id: quote.id,
      message: 'System solution added to quote.',
      quote_item: {
        quote_item_id: item.id,
        source_type: item.source_type,
        system_solution_id: item.system_solution_id,
        equipment_label: item.equipment_label,
        quantity: item.quantity,
        estimated_price_usd: item.estimated_price_usd,
        is_system_bundle: item.is_system_bundle,
        included_components: item.included_components,
        notes: item.notes
      },
      quote_summary: {
        total_items: totalItems,
        total_estimated_price_usd: total
      }
    };
  }

  // listCaseStudies(industry_code, product_technology, from_year, to_year, is_frozen_food_related, search_text, sort_by, page, page_size)
  listCaseStudies(
    industry_code,
    product_technology,
    from_year,
    to_year,
    is_frozen_food_related,
    search_text,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    const caseStudies = this._getFromStorage('case_studies', []);

    const term = search_text ? String(search_text).toLowerCase() : null;

    const filtered = caseStudies.filter((cs) => {
      if (industry_code && cs.industry_code !== industry_code) return false;
      if (product_technology && cs.product_technology !== product_technology) return false;
      if (from_year != null && cs.implementation_year < from_year) return false;
      if (to_year != null && cs.implementation_year > to_year) return false;
      if (typeof is_frozen_food_related === 'boolean') {
        if (!!cs.is_frozen_food_related !== is_frozen_food_related) return false;
      }
      if (term) {
        const title = String(cs.title || '').toLowerCase();
        const summary = String(cs.summary || '').toLowerCase();
        if (title.indexOf(term) === -1 && summary.indexOf(term) === -1) return false;
      }
      return true;
    });

    const sb = sort_by || 'year_desc';

    filtered.sort((a, b) => {
      switch (sb) {
        case 'year_asc':
          return a.implementation_year - b.implementation_year;
        case 'title_asc':
          return String(a.title || '').localeCompare(String(b.title || ''));
        case 'year_desc':
        default:
          return b.implementation_year - a.implementation_year;
      }
    });

    const total_count = filtered.length;
    const pg = page || 1;
    const ps = page_size || 20;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const items = filtered.slice(start, end).map((cs) => ({
      id: cs.id,
      title: cs.title,
      summary: cs.summary || '',
      implementation_year: cs.implementation_year,
      industry_code: cs.industry_code,
      product_technology: cs.product_technology,
      client_name: cs.client_name || '',
      plant_location: cs.plant_location || '',
      is_frozen_food_related: !!cs.is_frozen_food_related
    }));

    return {
      items,
      total_count,
      page: pg,
      page_size: ps
    };
  }

  // getCaseStudyDetail(caseStudyId)
  getCaseStudyDetail(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const cs = caseStudies.find((c) => c.id === caseStudyId) || null;

    if (!cs) {
      return {
        case_study: null
      };
    }

    return {
      case_study: {
        id: cs.id,
        title: cs.title,
        summary: cs.summary || '',
        content: cs.content || '',
        client_name: cs.client_name || '',
        plant_location: cs.plant_location || '',
        implementation_year: cs.implementation_year,
        industry_code: cs.industry_code,
        product_technology: cs.product_technology,
        is_frozen_food_related: !!cs.is_frozen_food_related,
        created_at: cs.created_at
      }
    };
  }

  // createContactInquiryFromCaseStudy(caseStudyId, subject, message, contact_name, contact_email, company_name, phone_number)
  createContactInquiryFromCaseStudy(
    caseStudyId,
    subject,
    message,
    contact_name,
    contact_email,
    company_name,
    phone_number
  ) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const cs = caseStudies.find((c) => c.id === caseStudyId) || null;

    const inquiries = this._getFromStorage('contact_inquiries', []);
    const id = this._generateId('contact_inquiry');
    const nowIso = new Date().toISOString();

    const rec = {
      id,
      source_page: 'case_study_detail',
      inquiry_type: 'talk_to_expert',
      subject: subject || (cs ? cs.title : ''),
      message,
      case_study_id: caseStudyId,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      company_name: company_name || null,
      phone_number: phone_number || null,
      created_at: nowIso
    };

    inquiries.push(rec);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      contact_inquiry_id: id,
      message: 'Inquiry submitted.'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', null);
    if (!content) {
      return {
        company_name: '',
        tagline: '',
        history_html: '',
        mission_html: '',
        manufacturing_capabilities: [],
        global_footprint: {
          regions_served: [],
          number_of_installations: 0
        },
        certifications: [],
        leadership_team: []
      };
    }

    return {
      company_name: content.company_name || '',
      tagline: content.tagline || '',
      history_html: content.history_html || '',
      mission_html: content.mission_html || '',
      manufacturing_capabilities: Array.isArray(content.manufacturing_capabilities)
        ? content.manufacturing_capabilities
        : [],
      global_footprint: {
        regions_served: content.global_footprint && Array.isArray(content.global_footprint.regions_served)
          ? content.global_footprint.regions_served
          : [],
        number_of_installations: content.global_footprint && content.global_footprint.number_of_installations
          ? content.global_footprint.number_of_installations
          : 0
      },
      certifications: Array.isArray(content.certifications) ? content.certifications : [],
      leadership_team: Array.isArray(content.leadership_team) ? content.leadership_team : []
    };
  }

  // createContactInquiry(inquiry_type, subject, message, contact_name, contact_email, company_name, phone_number, source_page)
  createContactInquiry(
    inquiry_type,
    subject,
    message,
    contact_name,
    contact_email,
    company_name,
    phone_number,
    source_page
  ) {
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const id = this._generateId('contact_inquiry');
    const nowIso = new Date().toISOString();

    const rec = {
      id,
      source_page: source_page || 'contact_page',
      inquiry_type,
      subject: subject || null,
      message,
      case_study_id: null,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      company_name: company_name || null,
      phone_number: phone_number || null,
      created_at: nowIso
    };

    inquiries.push(rec);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      contact_inquiry_id: id,
      message: 'Inquiry submitted.'
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