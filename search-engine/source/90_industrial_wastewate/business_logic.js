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

  _initStorage() {
    const tables = [
      'equipment_categories',
      'tank_series',
      'products',
      'quote_lists',
      'quote_list_items',
      'quote_requests',
      'product_comparison_sessions',
      'product_comparison_items',
      'maintenance_plans',
      'service_inquiries',
      'service_inquiry_items',
      'resource_items',
      'reading_lists',
      'reading_list_items',
      'tools',
      'equalization_tank_calculations',
      'distributors',
      'distributor_searches',
      'webinar_registrations',
      'contact_requests'
    ];
    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
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

  // Helper: section label
  _getSectionLabel(section) {
    switch (section) {
      case 'primary_treatment':
        return 'Primary Treatment';
      case 'screens_screening':
        return 'Screens & Screening';
      case 'chemical_treatment':
        return 'Chemical Treatment';
      case 'sludge_management':
        return 'Sludge Management';
      case 'tanks':
        return 'Tanks';
      default:
        return '';
    }
  }

  _formatCountryLabel(country) {
    switch (country) {
      case 'germany': return 'Germany';
      case 'united_states': return 'United States';
      case 'france': return 'France';
      case 'united_kingdom': return 'United Kingdom';
      case 'italy': return 'Italy';
      case 'spain': return 'Spain';
      case 'other': return 'Other';
      default: return country || '';
    }
  }

  _formatEquipmentTypeLabel(type) {
    switch (type) {
      case 'membrane_bioreactor_systems': return 'Membrane Bioreactor (MBR) Systems';
      case 'daf_units': return 'DAF Units';
      case 'screening_equipment': return 'Screening Equipment';
      case 'sludge_dewatering_units': return 'Sludge Dewatering Units';
      case 'ph_neutralization_systems': return 'pH Neutralization Systems';
      case 'general_wastewater_plant': return 'General Wastewater Plant';
      default: return type || '';
    }
  }

  _formatIndustryLabel(ind) {
    switch (ind) {
      case 'food_beverage': return 'Food & Beverage';
      case 'automotive': return 'Automotive';
      case 'chemical_processing': return 'Chemical Processing';
      case 'mining_metals': return 'Mining & Metals';
      case 'textiles': return 'Textiles';
      case 'oil_gas': return 'Oil & Gas';
      case 'pfas_treatment': return 'PFAS Treatment';
      case 'general_industrial': return 'General Industrial';
      case 'other': return 'Other';
      default: return ind || '';
    }
  }

  _formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  // Helpers to get or create per-user/session records
  _getOrCreateQuoteList() {
    const quoteLists = this._getFromStorage('quote_lists');
    let currentId = localStorage.getItem('current_quote_list_id');
    let quoteList = currentId ? quoteLists.find(q => q.id === currentId) : null;
    if (!quoteList) {
      quoteList = {
        id: this._generateId('ql'),
        items: [],
        currency: null,
        subtotal: 0,
        total: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: null
      };
      quoteLists.push(quoteList);
      this._saveToStorage('quote_lists', quoteLists);
      localStorage.setItem('current_quote_list_id', quoteList.id);
    }
    return quoteList;
  }

  _saveQuoteList(quoteList) {
    const quoteLists = this._getFromStorage('quote_lists');
    const idx = quoteLists.findIndex(q => q.id === quoteList.id);
    if (idx >= 0) {
      quoteLists[idx] = quoteList;
    } else {
      quoteLists.push(quoteList);
    }
    this._saveToStorage('quote_lists', quoteLists);
  }

  _getOrCreateServiceInquiry() {
    const inquiries = this._getFromStorage('service_inquiries');
    let currentId = localStorage.getItem('current_service_inquiry_id');
    let inquiry = currentId ? inquiries.find(s => s.id === currentId) : null;
    if (!inquiry) {
      inquiry = {
        id: this._generateId('si'),
        items: [],
        total_estimated_cost: 0,
        currency: null,
        status: 'draft',
        contact_name: null,
        contact_email: null,
        contact_phone: null,
        company: null,
        country: null,
        message: null,
        preferred_contact_method: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inquiries.push(inquiry);
      this._saveToStorage('service_inquiries', inquiries);
      localStorage.setItem('current_service_inquiry_id', inquiry.id);
    }
    return inquiry;
  }

  _saveServiceInquiry(inquiry) {
    const inquiries = this._getFromStorage('service_inquiries');
    const idx = inquiries.findIndex(s => s.id === inquiry.id);
    if (idx >= 0) {
      inquiries[idx] = inquiry;
    } else {
      inquiries.push(inquiry);
    }
    this._saveToStorage('service_inquiries', inquiries);
  }

  _getOrCreateComparisonSession() {
    const sessions = this._getFromStorage('product_comparison_sessions');
    let currentId = localStorage.getItem('current_comparison_session_id');
    let session = currentId ? sessions.find(s => s.id === currentId) : null;
    if (!session) {
      session = {
        id: this._generateId('pcs'),
        created_at: new Date().toISOString()
      };
      sessions.push(session);
      this._saveToStorage('product_comparison_sessions', sessions);
      localStorage.setItem('current_comparison_session_id', session.id);
    }
    return session;
  }

  _saveComparisonSession(session) {
    const sessions = this._getFromStorage('product_comparison_sessions');
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    this._saveToStorage('product_comparison_sessions', sessions);
  }

  _getOrCreateReadingList() {
    const lists = this._getFromStorage('reading_lists');
    let currentId = localStorage.getItem('current_reading_list_id');
    let list = currentId ? lists.find(r => r.id === currentId) : null;
    if (!list) {
      list = {
        id: this._generateId('rl'),
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
      localStorage.setItem('current_reading_list_id', list.id);
    }
    return list;
  }

  _saveReadingList(list) {
    const lists = this._getFromStorage('reading_lists');
    const idx = lists.findIndex(r => r.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('reading_lists', lists);
  }

  _runEqualizationTankFormula(flow_rate_value, flow_rate_unit, peak_factor, buffer_time_hours) {
    // Very simple engineering approximation:
    // Convert flow to m3/h, then required volume = flow * peak_factor * buffer_time_hours
    let flowM3PerH;
    if (flow_rate_unit === 'm3_per_day') {
      flowM3PerH = flow_rate_value / 24;
    } else {
      // assume m3_per_h
      flowM3PerH = flow_rate_value;
    }
    const requiredVolume = flowM3PerH * peak_factor * buffer_time_hours;
    return requiredVolume;
  }

  _calculateDistributorDistances(zip_postal_code, radius_km, market_segment) {
    const distributors = this._getFromStorage('distributors');
    const results = [];
    const zipStr = zip_postal_code || '';
    const zipPrefix3 = zipStr.substring(0, 3);
    const zipPrefix2 = zipStr.substring(0, 2);

    for (const d of distributors) {
      if (!Array.isArray(d.supported_markets)) continue;
      if (!d.supported_markets.includes(market_segment)) continue;

      let distance = 300; // default far
      const dZip = d.postal_code || '';
      if (dZip.substring(0, 3) === zipPrefix3) {
        distance = 50;
      } else if (dZip.substring(0, 2) === zipPrefix2) {
        distance = 100;
      }

      if (distance <= radius_km) {
        results.push({ distributor: d, distance_km: distance });
      }
    }

    results.sort((a, b) => {
      if (a.distance_km !== b.distance_km) {
        return a.distance_km - b.distance_km;
      }
      // Prefer preferred distributors
      const aPref = a.distributor.is_preferred ? 1 : 0;
      const bPref = b.distributor.is_preferred ? 1 : 0;
      if (aPref !== bPref) return bPref - aPref;
      return (a.distributor.name || '').localeCompare(b.distributor.name || '');
    });

    return results;
  }

  // ---------- Interface implementations ----------

  // getSiteHeaderContext
  getSiteHeaderContext() {
    let quote_list_item_count = 0;
    let quote_list_total_value = 0;
    let quote_list_currency = '';

    const quoteListId = localStorage.getItem('current_quote_list_id');
    if (quoteListId) {
      const quoteLists = this._getFromStorage('quote_lists');
      const quoteList = quoteLists.find(q => q.id === quoteListId);
      if (quoteList) {
        const items = this._getFromStorage('quote_list_items')
          .filter(i => i.quote_list_id === quoteList.id);
        quote_list_item_count = items.length;
        quote_list_total_value = quoteList.total || 0;
        quote_list_currency = quoteList.currency || '';
      }
    }

    let comparison_item_count = 0;
    const compId = localStorage.getItem('current_comparison_session_id');
    if (compId) {
      const compItems = this._getFromStorage('product_comparison_items')
        .filter(i => i.comparison_session_id === compId);
      comparison_item_count = compItems.length;
    }

    let reading_list_item_count = 0;
    const rlId = localStorage.getItem('current_reading_list_id');
    if (rlId) {
      const rlItems = this._getFromStorage('reading_list_items')
        .filter(i => i.reading_list_id === rlId);
      reading_list_item_count = rlItems.length;
    }

    let service_inquiry_item_count = 0;
    const siId = localStorage.getItem('current_service_inquiry_id');
    if (siId) {
      const siItems = this._getFromStorage('service_inquiry_items')
        .filter(i => i.service_inquiry_id === siId);
      service_inquiry_item_count = siItems.length;
    }

    return {
      quote_list_item_count,
      quote_list_total_value,
      quote_list_currency,
      comparison_item_count,
      reading_list_item_count,
      service_inquiry_item_count
    };
  }

  // getHomePageContent
  getHomePageContent() {
    const categories = this._getFromStorage('equipment_categories');
    const tools = this._getFromStorage('tools');
    const resources = this._getFromStorage('resource_items');

    const featured_equipment_categories = categories; // all available
    const featured_tools = tools.filter(t => t.is_recommended);

    const nowIso = new Date().toISOString();
    const upcoming_webinars = resources
      .filter(r => r.resource_type === 'webinars' && r.start_datetime && r.start_datetime >= nowIso)
      .sort((a, b) => {
        if (a.start_datetime < b.start_datetime) return -1;
        if (a.start_datetime > b.start_datetime) return 1;
        return 0;
      });

    return {
      featured_equipment_categories,
      featured_tools,
      upcoming_webinars
    };
  }

  // getEquipmentSectionsAndCategories
  getEquipmentSectionsAndCategories() {
    const categories = this._getFromStorage('equipment_categories');
    const sectionsMap = {};
    for (const cat of categories) {
      const section = cat.section || 'other';
      if (!sectionsMap[section]) {
        sectionsMap[section] = {
          section,
          section_label: this._getSectionLabel(section),
          categories: []
        };
      }
      sectionsMap[section].categories.push(cat);
    }
    const sections = Object.values(sectionsMap);
    return { sections };
  }

  // Helper to find category by id or slug
  _findCategoryByIdentifier(categoryId) {
    const categories = this._getFromStorage('equipment_categories');
    return categories.find(
      c => c.id === categoryId || c.slug === categoryId
    ) || null;
  }

  // getEquipmentFilterOptions
  getEquipmentFilterOptions(categoryId) {
    const category = this._findCategoryByIdentifier(categoryId);
    if (!category) {
      return {
        category: null,
        price_range: null,
        flow_capacity_range_m3h: null,
        plant_flow_capacity_range_m3h: null,
        tank_volume_range_m3: null,
        sort_options: []
      };
    }
    const products = this._getFromStorage('products').filter(
      p => p.category_id === category.id
    );

    const prices = products.map(p => p.price).filter(v => typeof v === 'number');
    const flows = products.map(p => p.flow_capacity_min_m3h).filter(v => typeof v === 'number');
    const plantFlows = products.map(p => p.plant_flow_capacity_m3h).filter(v => typeof v === 'number');
    const tankVolumes = products.map(p => p.tank_volume_m3).filter(v => typeof v === 'number');

    const price_range = prices.length ? {
      min_price: Math.min.apply(null, prices),
      max_price: Math.max.apply(null, prices),
      currency: products[0] ? products[0].currency : null
    } : null;

    const flow_capacity_range_m3h = flows.length ? {
      min: Math.min.apply(null, flows),
      max: Math.max.apply(null, flows),
      step: 1
    } : null;

    const plant_flow_capacity_range_m3h = plantFlows.length ? {
      min: Math.min.apply(null, plantFlows),
      max: Math.max.apply(null, plantFlows),
      step: 1
    } : null;

    const tank_volume_range_m3 = tankVolumes.length ? {
      min: Math.min.apply(null, tankVolumes),
      max: Math.max.apply(null, tankVolumes),
      step: 1
    } : null;

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'capacity_asc', label: 'Capacity: Low to High' },
      { value: 'capacity_desc', label: 'Capacity: High to Low' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      category,
      price_range,
      flow_capacity_range_m3h,
      plant_flow_capacity_range_m3h,
      tank_volume_range_m3,
      sort_options
    };
  }

  // listProducts
  listProducts(categoryId, filters, sort_by, page, page_size) {
    const category = this._findCategoryByIdentifier(categoryId);
    if (!category) {
      return {
        category: null,
        total_results: 0,
        page: page || 1,
        page_size: page_size || 0,
        products: []
      };
    }
    const allProducts = this._getFromStorage('products').filter(
      p => p.category_id === category.id
    );

    let products = allProducts;

    if (filters) {
      if (typeof filters.min_flow_capacity_m3h === 'number') {
        products = products.filter(p =>
          typeof p.flow_capacity_min_m3h === 'number' &&
          p.flow_capacity_min_m3h >= filters.min_flow_capacity_m3h
        );
      }
      if (typeof filters.max_flow_capacity_m3h === 'number') {
        products = products.filter(p =>
          typeof p.flow_capacity_min_m3h === 'number' &&
          p.flow_capacity_min_m3h <= filters.max_flow_capacity_m3h
        );
      }
      if (typeof filters.min_plant_flow_capacity_m3h === 'number') {
        products = products.filter(p =>
          typeof p.plant_flow_capacity_m3h === 'number' &&
          p.plant_flow_capacity_m3h >= filters.min_plant_flow_capacity_m3h
        );
      }
      if (typeof filters.max_plant_flow_capacity_m3h === 'number') {
        products = products.filter(p =>
          typeof p.plant_flow_capacity_m3h === 'number' &&
          p.plant_flow_capacity_m3h <= filters.max_plant_flow_capacity_m3h
        );
      }
      if (typeof filters.min_nominal_flow_m3h === 'number') {
        products = products.filter(p =>
          typeof p.nominal_flow_m3h === 'number' &&
          p.nominal_flow_m3h >= filters.min_nominal_flow_m3h
        );
      }
      if (typeof filters.min_tank_volume_m3 === 'number') {
        products = products.filter(p =>
          typeof p.tank_volume_m3 === 'number' &&
          p.tank_volume_m3 >= filters.min_tank_volume_m3
        );
      }
      if (typeof filters.max_tank_volume_m3 === 'number') {
        products = products.filter(p =>
          typeof p.tank_volume_m3 === 'number' &&
          p.tank_volume_m3 <= filters.max_tank_volume_m3
        );
      }
      if (typeof filters.min_price === 'number') {
        products = products.filter(p => typeof p.price === 'number' && p.price >= filters.min_price);
      }
      if (typeof filters.max_price === 'number') {
        products = products.filter(p => typeof p.price === 'number' && p.price <= filters.max_price);
      }
      if (filters.tank_series_id) {
        products = products.filter(p => p.tank_series_id === filters.tank_series_id);
      }
      if (filters.search_query) {
        const q = filters.search_query.toLowerCase();
        products = products.filter(p =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.short_description && p.short_description.toLowerCase().includes(q)) ||
          (p.long_description && p.long_description.toLowerCase().includes(q))
        );
      }
    }

    if (!sort_by) sort_by = 'price_asc';
    products.sort((a, b) => {
      switch (sort_by) {
        case 'price_asc':
          return (a.price || 0) - (b.price || 0);
        case 'price_desc':
          return (b.price || 0) - (a.price || 0);
        case 'capacity_asc':
          return (a.flow_capacity_min_m3h || 0) - (b.flow_capacity_min_m3h || 0);
        case 'capacity_desc':
          return (b.flow_capacity_min_m3h || 0) - (a.flow_capacity_min_m3h || 0);
        case 'newest':
          return (b.created_at || '').localeCompare(a.created_at || '');
        default:
          return 0;
      }
    });

    const total_results = products.length;
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : total_results;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const slice = products.slice(start, end);

    const section_label = this._getSectionLabel(category.section);
    const resultProducts = slice.map(p => ({
      product: p,
      category_name: category.name,
      section_label,
      key_specs: p.spec_highlights || []
    }));

    return {
      category,
      total_results,
      page: pageNum,
      page_size: size,
      products: resultProducts
    };
  }

  // getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        section_label: '',
        is_available_for_quote: false,
        is_available_for_comparison: false,
        key_specs: []
      };
    }
    const categories = this._getFromStorage('equipment_categories');
    const category = categories.find(c => c.id === product.category_id) || null;
    const section_label = this._getSectionLabel(product.section);
    const is_available_for_quote = !!product.available_for_quote;
    const is_available_for_comparison = !!product.available_for_comparison;
    return {
      product,
      category,
      section_label,
      is_available_for_quote,
      is_available_for_comparison,
      key_specs: product.spec_highlights || []
    };
  }

  // addProductToQuoteList
  addProductToQuoteList(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product || !product.available_for_quote || product.status !== 'active') {
      return {
        success: false,
        message: 'Product not available for quote.',
        quote_list: null,
        items: [],
        quote_list_item_count: 0
      };
    }

    const quoteList = this._getOrCreateQuoteList();
    const quoteListItems = this._getFromStorage('quote_list_items');

    let item = quoteListItems.find(
      i => i.quote_list_id === quoteList.id && i.product_id === product.id
    );
    if (item) {
      item.quantity += qty;
      item.line_total = item.unit_price * item.quantity;
    } else {
      item = {
        id: this._generateId('qli'),
        quote_list_id: quoteList.id,
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        unit_price: product.price,
        currency: product.currency,
        line_total: product.price * qty,
        key_specs: product.spec_highlights || []
      };
      quoteListItems.push(item);
      if (!Array.isArray(quoteList.items)) quoteList.items = [];
      quoteList.items.push(item.id);
    }

    // Recalculate totals
    const itemsForList = quoteListItems.filter(i => i.quote_list_id === quoteList.id);
    let subtotal = 0;
    for (const it of itemsForList) {
      subtotal += it.line_total || 0;
    }
    quoteList.subtotal = subtotal;
    quoteList.total = subtotal;
    quoteList.currency = quoteList.currency || product.currency;
    quoteList.updated_at = new Date().toISOString();

    this._saveToStorage('quote_list_items', quoteListItems);
    this._saveQuoteList(quoteList);

    return {
      success: true,
      message: 'Product added to quote list.',
      quote_list: quoteList,
      items: itemsForList,
      quote_list_item_count: itemsForList.length
    };
  }

  // addProductToComparison
  addProductToComparison(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product || product.status !== 'active') {
      return {
        success: false,
        message: 'Product not available for comparison.',
        comparison_session: null,
        items: [],
        comparison_item_count: 0
      };
    }

    const session = this._getOrCreateComparisonSession();
    const items = this._getFromStorage('product_comparison_items');
    let item = items.find(
      i => i.comparison_session_id === session.id && i.product_id === product.id
    );
    if (!item) {
      const currentItems = items.filter(i => i.comparison_session_id === session.id);
      item = {
        id: this._generateId('pci'),
        comparison_session_id: session.id,
        product_id: product.id,
        display_order: currentItems.length + 1
      };
      items.push(item);
      this._saveToStorage('product_comparison_items', items);
    }

    const sessionItems = items.filter(i => i.comparison_session_id === session.id);

    return {
      success: true,
      message: 'Product added to comparison.',
      comparison_session: session,
      items: sessionItems,
      comparison_item_count: sessionItems.length
    };
  }

  // getComparisonStatus
  getComparisonStatus() {
    const sessionId = localStorage.getItem('current_comparison_session_id');
    if (!sessionId) {
      return {
        comparison_session: null,
        comparison_item_count: 0,
        products: []
      };
    }
    const sessions = this._getFromStorage('product_comparison_sessions');
    const session = sessions.find(s => s.id === sessionId) || null;
    if (!session) {
      return {
        comparison_session: null,
        comparison_item_count: 0,
        products: []
      };
    }
    const items = this._getFromStorage('product_comparison_items')
      .filter(i => i.comparison_session_id === session.id);
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('equipment_categories');

    const mapped = items.map(i => {
      const product = products.find(p => p.id === i.product_id) || null;
      const category = product
        ? categories.find(c => c.id === product.category_id) || null
        : null;
      return {
        comparison_item_id: i.id,
        product_id: i.product_id,
        product_name: product ? product.name : '',
        category_name: category ? category.name : ''
      };
    });

    return {
      comparison_session: session,
      comparison_item_count: items.length,
      products: mapped
    };
  }

  // getComparisonItems
  getComparisonItems() {
    const sessionId = localStorage.getItem('current_comparison_session_id');
    if (!sessionId) {
      return {
        comparison_session: null,
        products: [],
        highlighted_spec_rows: ['naoh_consumption_kg_per_h']
      };
    }
    const sessions = this._getFromStorage('product_comparison_sessions');
    const session = sessions.find(s => s.id === sessionId) || null;
    if (!session) {
      return {
        comparison_session: null,
        products: [],
        highlighted_spec_rows: ['naoh_consumption_kg_per_h']
      };
    }
    const items = this._getFromStorage('product_comparison_items')
      .filter(i => i.comparison_session_id === session.id);
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('equipment_categories');

    const mapped = items.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const category = product
        ? categories.find(c => c.id === product.category_id) || null
        : null;
      return {
        comparison_item: ci,
        product,
        category_name: category ? category.name : '',
        key_specs: product && product.spec_highlights ? product.spec_highlights : [],
        naoh_consumption_kg_per_h: product ? product.naoh_consumption_kg_per_h : null
      };
    });

    return {
      comparison_session: session,
      products: mapped,
      highlighted_spec_rows: ['naoh_consumption_kg_per_h']
    };
  }

  // removeProductFromComparison
  removeProductFromComparison(comparisonItemId) {
    const items = this._getFromStorage('product_comparison_items');
    const idx = items.findIndex(i => i.id === comparisonItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Comparison item not found.',
        comparison_session: null,
        items
      };
    }
    const sessionId = items[idx].comparison_session_id;
    items.splice(idx, 1);
    this._saveToStorage('product_comparison_items', items);

    const sessions = this._getFromStorage('product_comparison_sessions');
    const session = sessions.find(s => s.id === sessionId) || null;
    return {
      success: true,
      message: 'Comparison item removed.',
      comparison_session: session,
      items: items.filter(i => i.comparison_session_id === sessionId)
    };
  }

  // getQuoteList
  getQuoteList() {
    const quoteListId = localStorage.getItem('current_quote_list_id');
    if (!quoteListId) {
      return {
        quote_list: null,
        items: []
      };
    }
    const quoteLists = this._getFromStorage('quote_lists');
    const quoteList = quoteLists.find(q => q.id === quoteListId) || null;
    if (!quoteList) {
      return {
        quote_list: null,
        items: []
      };
    }
    const quoteListItems = this._getFromStorage('quote_list_items')
      .filter(i => i.quote_list_id === quoteList.id);
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('equipment_categories');

    const mapped = quoteListItems.map(item => {
      const product = products.find(p => p.id === item.product_id) || null;
      const category = product
        ? categories.find(c => c.id === product.category_id) || null
        : null;
      return {
        item,
        product,
        category_name: category ? category.name : ''
      };
    });

    return {
      quote_list: quoteList,
      items: mapped
    };
  }

  // updateQuoteListItemQuantity
  updateQuoteListItemQuantity(quoteListItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const quoteListItems = this._getFromStorage('quote_list_items');
    const item = quoteListItems.find(i => i.id === quoteListItemId) || null;
    if (!item) {
      return {
        success: false,
        quote_list: null,
        items: []
      };
    }
    item.quantity = qty;
    item.line_total = item.unit_price * qty;
    this._saveToStorage('quote_list_items', quoteListItems);

    const quoteLists = this._getFromStorage('quote_lists');
    const quoteList = quoteLists.find(q => q.id === item.quote_list_id) || null;
    if (quoteList) {
      const itemsForList = quoteListItems.filter(i => i.quote_list_id === quoteList.id);
      let subtotal = 0;
      for (const it of itemsForList) subtotal += it.line_total || 0;
      quoteList.subtotal = subtotal;
      quoteList.total = subtotal;
      quoteList.updated_at = new Date().toISOString();
      this._saveQuoteList(quoteList);

      const products = this._getFromStorage('products');
      const categories = this._getFromStorage('equipment_categories');
      const mapped = itemsForList.map(it => {
        const product = products.find(p => p.id === it.product_id) || null;
        const category = product
          ? categories.find(c => c.id === it.product_category_id) || null
          : null;
        return {
          item: it,
          product,
          category_name: category ? category.name : ''
        };
      });

      return {
        success: true,
        quote_list: quoteList,
        items: mapped
      };
    }

    return {
      success: false,
      quote_list: null,
      items: []
    };
  }

  // removeQuoteListItem
  removeQuoteListItem(quoteListItemId) {
    const quoteListItems = this._getFromStorage('quote_list_items');
    const idx = quoteListItems.findIndex(i => i.id === quoteListItemId);
    if (idx === -1) {
      return {
        success: false,
        quote_list: null,
        items: []
      };
    }
    const quote_list_id = quoteListItems[idx].quote_list_id;
    quoteListItems.splice(idx, 1);
    this._saveToStorage('quote_list_items', quoteListItems);

    const quoteLists = this._getFromStorage('quote_lists');
    const quoteList = quoteLists.find(q => q.id === quote_list_id) || null;
    if (quoteList) {
      quoteList.items = (quoteList.items || []).filter(id => id !== quoteListItemId);
      const itemsForList = quoteListItems.filter(i => i.quote_list_id === quoteList.id);
      let subtotal = 0;
      for (const it of itemsForList) subtotal += it.line_total || 0;
      quoteList.subtotal = subtotal;
      quoteList.total = subtotal;
      quoteList.updated_at = new Date().toISOString();
      this._saveQuoteList(quoteList);

      const products = this._getFromStorage('products');
      const categories = this._getFromStorage('equipment_categories');
      const mapped = itemsForList.map(it => {
        const product = products.find(p => p.id === it.product_id) || null;
        const category = product
          ? categories.find(c => c.id === it.product_category_id) || null
          : null;
        return {
          item: it,
          product,
          category_name: category ? category.name : ''
        };
      });

      return {
        success: true,
        quote_list: quoteList,
        items: mapped
      };
    }

    return {
      success: false,
      quote_list: null,
      items: []
    };
  }

  // submitQuoteRequest
  submitQuoteRequest(contact_name, contact_email, contact_phone, company, country, message) {
    const quoteListId = localStorage.getItem('current_quote_list_id');
    if (!quoteListId) {
      return {
        success: false,
        message: 'No quote list to submit.',
        quote_request: null
      };
    }
    const quoteLists = this._getFromStorage('quote_lists');
    const quoteList = quoteLists.find(q => q.id === quoteListId) || null;
    if (!quoteList) {
      return {
        success: false,
        message: 'Quote list not found.',
        quote_request: null
      };
    }
    const items = this._getFromStorage('quote_list_items')
      .filter(i => i.quote_list_id === quoteList.id);
    if (items.length === 0) {
      return {
        success: false,
        message: 'Quote list is empty.',
        quote_request: null
      };
    }

    const quoteRequests = this._getFromStorage('quote_requests');
    const quote_request = {
      id: this._generateId('qr'),
      quote_list_id: quoteList.id,
      submitted_at: new Date().toISOString(),
      status: 'submitted',
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      company: company || null,
      country: country || null,
      message: message || null
    };
    quoteRequests.push(quote_request);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      message: 'Quote request submitted.',
      quote_request
    };
  }

  // getServicesOverview
  getServicesOverview() {
    const plans = this._getFromStorage('maintenance_plans');
    const serviceTypesSet = new Set(plans.map(p => p.service_type));
    const service_categories = Array.from(serviceTypesSet).map(st => {
      let title;
      switch (st) {
        case 'maintenance_plans': title = 'Maintenance Plans'; break;
        case 'commissioning': title = 'Commissioning'; break;
        case 'audits': title = 'Audits'; break;
        case 'support': title = 'Support'; break;
        default: title = st;
      }
      return {
        service_type: st,
        title,
        description: ''
      };
    });
    return { service_categories };
  }

  // getMaintenanceFilterOptions
  getMaintenanceFilterOptions(serviceType) {
    const plans = this._getFromStorage('maintenance_plans')
      .filter(p => p.service_type === serviceType);
    const countriesSet = new Set();
    const equipmentTypesSet = new Set();
    const responseTimes = new Set();
    const costs = [];

    for (const p of plans) {
      if (p.country) countriesSet.add(p.country);
      if (p.equipment_type) equipmentTypesSet.add(p.equipment_type);
      if (typeof p.response_time_hours === 'number') responseTimes.add(p.response_time_hours);
      if (typeof p.annual_cost === 'number') costs.push(p.annual_cost);
    }

    const countries = Array.from(countriesSet).map(c => ({
      value: c,
      label: this._formatCountryLabel(c)
    }));
    const equipment_types = Array.from(equipmentTypesSet).map(t => ({
      value: t,
      label: this._formatEquipmentTypeLabel(t)
    }));

    const response_time_options = Array.from(responseTimes).sort((a, b) => a - b).map(h => ({
      max_hours: h,
      label: 'Within ' + h + ' hours'
    }));

    const annual_cost_range = costs.length ? {
      min: Math.min.apply(null, costs),
      max: Math.max.apply(null, costs),
      currency: plans[0] ? plans[0].currency : null
    } : {
      min: 0,
      max: 0,
      currency: null
    };

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'response_time_asc', label: 'Response time: Fastest first' }
    ];

    return {
      countries,
      equipment_types,
      response_time_options,
      annual_cost_range,
      sort_options
    };
  }

  // listMaintenancePlans
  listMaintenancePlans(serviceType, filters, sort_by) {
    let plans = this._getFromStorage('maintenance_plans')
      .filter(p => p.service_type === serviceType && p.status === 'active');

    if (filters) {
      if (filters.country) {
        plans = plans.filter(p => p.country === filters.country);
      }
      if (filters.equipment_type) {
        plans = plans.filter(p => p.equipment_type === filters.equipment_type);
      }
      if (typeof filters.max_response_time_hours === 'number') {
        plans = plans.filter(p =>
          typeof p.response_time_hours === 'number' &&
          p.response_time_hours <= filters.max_response_time_hours
        );
      }
      if (typeof filters.max_annual_cost === 'number') {
        plans = plans.filter(p =>
          typeof p.annual_cost === 'number' &&
          p.annual_cost <= filters.max_annual_cost
        );
      }
      if (filters.currency) {
        plans = plans.filter(p => p.currency === filters.currency);
      }
    }

    if (!sort_by) sort_by = 'price_asc';
    plans.sort((a, b) => {
      switch (sort_by) {
        case 'price_asc':
          return (a.annual_cost || 0) - (b.annual_cost || 0);
        case 'price_desc':
          return (b.annual_cost || 0) - (a.annual_cost || 0);
        case 'response_time_asc':
          return (a.response_time_hours || 0) - (b.response_time_hours || 0);
        default:
          return 0;
      }
    });

    const maintenance_plans = plans.map(plan => ({
      plan,
      country_label: this._formatCountryLabel(plan.country),
      equipment_type_label: this._formatEquipmentTypeLabel(plan.equipment_type)
    }));

    return {
      service_type: serviceType,
      total_results: plans.length,
      maintenance_plans
    };
  }

  // getMaintenancePlanDetails
  getMaintenancePlanDetails(maintenancePlanId) {
    const plans = this._getFromStorage('maintenance_plans');
    const maintenance_plan = plans.find(p => p.id === maintenancePlanId) || null;
    if (!maintenance_plan) {
      return {
        maintenance_plan: null,
        country_label: '',
        equipment_type_label: ''
      };
    }
    return {
      maintenance_plan,
      country_label: this._formatCountryLabel(maintenance_plan.country),
      equipment_type_label: this._formatEquipmentTypeLabel(maintenance_plan.equipment_type)
    };
  }

  // addMaintenancePlanToServiceInquiry
  addMaintenancePlanToServiceInquiry(maintenancePlanId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find(p => p.id === maintenancePlanId) || null;
    if (!plan || plan.status !== 'active') {
      return {
        success: false,
        message: 'Maintenance plan not available.',
        service_inquiry: null,
        items: []
      };
    }

    const inquiry = this._getOrCreateServiceInquiry();
    const items = this._getFromStorage('service_inquiry_items');

    let item = items.find(
      i => i.service_inquiry_id === inquiry.id && i.maintenance_plan_id === plan.id
    );
    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('sii'),
        service_inquiry_id: inquiry.id,
        maintenance_plan_id: plan.id,
        maintenance_plan_name: plan.name,
        quantity: qty,
        annual_cost: plan.annual_cost,
        currency: plan.currency
      };
      items.push(item);
      if (!Array.isArray(inquiry.items)) inquiry.items = [];
      inquiry.items.push(item.id);
    }

    const itemsForInquiry = items.filter(i => i.service_inquiry_id === inquiry.id);
    let total = 0;
    for (const it of itemsForInquiry) {
      total += (it.annual_cost || 0) * (it.quantity || 0);
    }
    inquiry.total_estimated_cost = total;
    inquiry.currency = inquiry.currency || plan.currency;
    inquiry.updated_at = new Date().toISOString();

    this._saveToStorage('service_inquiry_items', items);
    this._saveServiceInquiry(inquiry);

    return {
      success: true,
      message: 'Maintenance plan added to service inquiry.',
      service_inquiry: inquiry,
      items: itemsForInquiry
    };
  }

  // getServiceInquiry
  getServiceInquiry() {
    const inquiryId = localStorage.getItem('current_service_inquiry_id');
    if (!inquiryId) {
      return {
        service_inquiry: null,
        items: []
      };
    }
    const inquiries = this._getFromStorage('service_inquiries');
    const inquiry = inquiries.find(s => s.id === inquiryId) || null;
    if (!inquiry) {
      return {
        service_inquiry: null,
        items: []
      };
    }
    const items = this._getFromStorage('service_inquiry_items')
      .filter(i => i.service_inquiry_id === inquiry.id);
    const plans = this._getFromStorage('maintenance_plans');

    const mapped = items.map(item => {
      const maintenance_plan = plans.find(p => p.id === item.maintenance_plan_id) || null;
      return {
        item,
        maintenance_plan
      };
    });

    return {
      service_inquiry: inquiry,
      items: mapped
    };
  }

  // updateServiceInquiryItemQuantity
  updateServiceInquiryItemQuantity(serviceInquiryItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const items = this._getFromStorage('service_inquiry_items');
    const item = items.find(i => i.id === serviceInquiryItemId) || null;
    if (!item) {
      return {
        success: false,
        service_inquiry: null,
        items: []
      };
    }
    item.quantity = qty;
    this._saveToStorage('service_inquiry_items', items);

    const inquiries = this._getFromStorage('service_inquiries');
    const inquiry = inquiries.find(s => s.id === item.service_inquiry_id) || null;
    if (!inquiry) {
      return {
        success: false,
        service_inquiry: null,
        items: []
      };
    }
    const itemsForInquiry = items.filter(i => i.service_inquiry_id === inquiry.id);
    let total = 0;
    for (const it of itemsForInquiry) {
      total += (it.annual_cost || 0) * (it.quantity || 0);
    }
    inquiry.total_estimated_cost = total;
    inquiry.updated_at = new Date().toISOString();
    this._saveServiceInquiry(inquiry);

    const plans = this._getFromStorage('maintenance_plans');
    const mapped = itemsForInquiry.map(it => {
      const maintenance_plan = plans.find(p => p.id === it.maintenance_plan_id) || null;
      return {
        item: it,
        maintenance_plan
      };
    });

    return {
      success: true,
      service_inquiry: inquiry,
      items: mapped
    };
  }

  // removeServiceInquiryItem
  removeServiceInquiryItem(serviceInquiryItemId) {
    const items = this._getFromStorage('service_inquiry_items');
    const idx = items.findIndex(i => i.id === serviceInquiryItemId);
    if (idx === -1) {
      return {
        success: false,
        service_inquiry: null,
        items: []
      };
    }
    const inquiryId = items[idx].service_inquiry_id;
    items.splice(idx, 1);
    this._saveToStorage('service_inquiry_items', items);

    const inquiries = this._getFromStorage('service_inquiries');
    const inquiry = inquiries.find(s => s.id === inquiryId) || null;
    if (!inquiry) {
      return {
        success: false,
        service_inquiry: null,
        items: []
      };
    }
    inquiry.items = (inquiry.items || []).filter(id => id !== serviceInquiryItemId);
    const itemsForInquiry = items.filter(i => i.service_inquiry_id === inquiry.id);
    let total = 0;
    for (const it of itemsForInquiry) {
      total += (it.annual_cost || 0) * (it.quantity || 0);
    }
    inquiry.total_estimated_cost = total;
    inquiry.updated_at = new Date().toISOString();
    this._saveServiceInquiry(inquiry);

    const plans = this._getFromStorage('maintenance_plans');
    const mapped = itemsForInquiry.map(it => {
      const maintenance_plan = plans.find(p => p.id === it.maintenance_plan_id) || null;
      return {
        item: it,
        maintenance_plan
      };
    });

    return {
      success: true,
      service_inquiry: inquiry,
      items: mapped
    };
  }

  // submitServiceInquiry
  submitServiceInquiry(contact_name, contact_email, contact_phone, company, country, message, preferred_contact_method) {
    const inquiryId = localStorage.getItem('current_service_inquiry_id');
    if (!inquiryId) {
      return {
        success: false,
        message: 'No service inquiry to submit.',
        service_inquiry: null
      };
    }
    const inquiries = this._getFromStorage('service_inquiries');
    const inquiry = inquiries.find(s => s.id === inquiryId) || null;
    if (!inquiry) {
      return {
        success: false,
        message: 'Service inquiry not found.',
        service_inquiry: null
      };
    }
    const items = this._getFromStorage('service_inquiry_items')
      .filter(i => i.service_inquiry_id === inquiry.id);
    if (items.length === 0) {
      return {
        success: false,
        message: 'Service inquiry is empty.',
        service_inquiry: null
      };
    }

    inquiry.contact_name = contact_name;
    inquiry.contact_email = contact_email;
    inquiry.contact_phone = contact_phone || null;
    inquiry.company = company || null;
    inquiry.country = country || null;
    inquiry.message = message || null;
    inquiry.preferred_contact_method = preferred_contact_method || null;
    inquiry.status = 'submitted';
    inquiry.updated_at = new Date().toISOString();

    this._saveServiceInquiry(inquiry);

    return {
      success: true,
      message: 'Service inquiry submitted.',
      service_inquiry: inquiry
    };
  }

  // getResourceFilterOptions
  getResourceFilterOptions(resourceType) {
    const resources = this._getFromStorage('resource_items')
      .filter(r => r.resource_type === resourceType);

    const industriesSet = new Set();
    const yearsSet = new Set();
    const geographiesSet = new Set();
    const topicsSet = new Set();
    const monthsSet = new Set();
    const capacities = [];

    for (const r of resources) {
      if (r.industry) industriesSet.add(r.industry);
      if (typeof r.publication_year === 'number') yearsSet.add(r.publication_year);
      if (r.publication_date) {
        yearsSet.add(new Date(r.publication_date).getFullYear());
      }
      if (r.geography) geographiesSet.add(r.geography);
      if (r.topic) topicsSet.add(r.topic);
      if (typeof r.plant_capacity_m3_per_day === 'number') {
        capacities.push(r.plant_capacity_m3_per_day);
      }
      if (resourceType === 'webinars' && r.start_datetime) {
        const d = new Date(r.start_datetime);
        if (!isNaN(d.getTime())) {
          monthsSet.add(d.getMonth() + 1);
          yearsSet.add(d.getFullYear());
        }
      }
    }

    const industries = Array.from(industriesSet).map(i => ({
      value: i,
      label: this._formatIndustryLabel(i)
    }));

    const years = Array.from(yearsSet).sort((a, b) => a - b);
    const geographies = Array.from(geographiesSet);
    const topics = Array.from(topicsSet).map(t => ({
      value: t,
      label: this._formatIndustryLabel(t) || t
    }));
    const months = Array.from(monthsSet).sort((a, b) => a - b);

    const plant_capacity_range_m3_per_day = capacities.length ? {
      min: Math.min.apply(null, capacities),
      max: Math.max.apply(null, capacities)
    } : {
      min: 0,
      max: 0
    };

    const sort_options = resourceType === 'webinars'
      ? [
          { value: 'start_time_asc', label: 'Start time: Earliest first' },
          { value: 'most_recent', label: 'Most recent' }
        ]
      : [
          { value: 'most_recent', label: 'Most recent' },
          { value: 'newest_first', label: 'Newest first' }
        ];

    return {
      industries,
      years,
      plant_capacity_range_m3_per_day,
      geographies,
      topics,
      months,
      sort_options
    };
  }

  // listResources
  listResources(resourceType, filters, sort_by) {
    let resources = this._getFromStorage('resource_items')
      .filter(r => r.resource_type === resourceType);

    if (filters) {
      if (filters.industry) {
        resources = resources.filter(r => r.industry === filters.industry);
      }
      if (typeof filters.year === 'number') {
        resources = resources.filter(r => {
          if (resourceType === 'case_studies') {
            if (typeof r.publication_year === 'number') {
              return r.publication_year === filters.year;
            }
            if (r.publication_date) {
              return new Date(r.publication_date).getFullYear() === filters.year;
            }
            return false;
          } else {
            if (r.start_datetime) {
              return new Date(r.start_datetime).getFullYear() === filters.year;
            }
            return false;
          }
        });
      }
      if (typeof filters.min_plant_capacity_m3_per_day === 'number') {
        resources = resources.filter(r =>
          typeof r.plant_capacity_m3_per_day === 'number' &&
          r.plant_capacity_m3_per_day >= filters.min_plant_capacity_m3_per_day
        );
      }
      if (filters.geography) {
        resources = resources.filter(r => r.geography === filters.geography);
      }
      if (filters.topic) {
        resources = resources.filter(r => r.topic === filters.topic);
      }
      if (typeof filters.month === 'number' && resourceType === 'webinars') {
        resources = resources.filter(r => {
          if (!r.start_datetime) return false;
          const d = new Date(r.start_datetime);
          return !isNaN(d.getTime()) && (d.getMonth() + 1) === filters.month;
        });
      }
      if (filters.start_time_from && filters.start_time_to && resourceType === 'webinars') {
        const from = filters.start_time_from;
        const to = filters.start_time_to;
        resources = resources.filter(r => {
          if (!r.start_datetime) return false;
          const d = new Date(r.start_datetime);
          if (isNaN(d.getTime())) return false;
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          const timeStr = hh + ':' + mm;
          return timeStr >= from && timeStr <= to;
        });
      }
    }

    if (!sort_by) sort_by = 'most_recent';
    resources.sort((a, b) => {
      if (resourceType === 'webinars') {
        if (sort_by === 'start_time_asc') {
          return (a.start_datetime || '').localeCompare(b.start_datetime || '');
        }
        // most_recent or newest_first
        return (b.start_datetime || '').localeCompare(a.start_datetime || '');
      } else {
        // case studies
        const da = a.publication_date || '';
        const db = b.publication_date || '';
        if (sort_by === 'most_recent' || sort_by === 'newest_first') {
          return db.localeCompare(da);
        }
        return 0;
      }
    });

    const mapped = resources.map(r => {
      let date_display = '';
      if (resourceType === 'webinars') {
        date_display = r.start_datetime ? this._formatDate(r.start_datetime) : '';
      } else {
        date_display = r.publication_date ? this._formatDate(r.publication_date) : '';
      }
      let capacity_display = '';
      if (typeof r.plant_capacity_m3_per_day === 'number') {
        capacity_display = r.plant_capacity_m3_per_day + ' m3/day';
      }
      return {
        resource: r,
        industry_label: this._formatIndustryLabel(r.industry),
        date_display,
        capacity_display
      };
    });

    return {
      resource_type: resourceType,
      total_results: resources.length,
      resources: mapped
    };
  }

  // getResourceDetails
  getResourceDetails(resourceId) {
    const resources = this._getFromStorage('resource_items');
    const resource = resources.find(r => r.id === resourceId) || null;
    if (!resource) {
      return {
        resource: null,
        industry_label: '',
        formatted_date: '',
        plant_capacity_display: '',
        is_case_study: false,
        is_webinar: false
      };
    }
    const is_case_study = resource.resource_type === 'case_studies';
    const is_webinar = resource.resource_type === 'webinars';
    const formatted_date = is_webinar
      ? this._formatDate(resource.start_datetime)
      : this._formatDate(resource.publication_date);
    let plant_capacity_display = '';
    if (typeof resource.plant_capacity_m3_per_day === 'number') {
      plant_capacity_display = resource.plant_capacity_m3_per_day + ' m3/day';
    }
    return {
      resource,
      industry_label: this._formatIndustryLabel(resource.industry),
      formatted_date,
      plant_capacity_display,
      is_case_study,
      is_webinar
    };
  }

  // saveResourceToReadingList
  saveResourceToReadingList(resourceId) {
    const resources = this._getFromStorage('resource_items');
    const resource = resources.find(r => r.id === resourceId) || null;
    if (!resource) {
      return {
        success: false,
        message: 'Resource not found.',
        reading_list: null,
        items: []
      };
    }
    const list = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');

    let existing = items.find(
      i => i.reading_list_id === list.id && i.resource_id === resource.id
    );
    if (!existing) {
      existing = {
        id: this._generateId('rli'),
        reading_list_id: list.id,
        resource_id: resource.id,
        saved_at: new Date().toISOString()
      };
      items.push(existing);
      if (!Array.isArray(list.items)) list.items = [];
      list.items.push(existing.id);
      list.updated_at = new Date().toISOString();
      this._saveReadingList(list);
      this._saveToStorage('reading_list_items', items);
    }

    const itemsForList = items.filter(i => i.reading_list_id === list.id);
    return {
      success: true,
      message: 'Resource saved to reading list.',
      reading_list: list,
      items: itemsForList
    };
  }

  // getReadingList
  getReadingList() {
    const listId = localStorage.getItem('current_reading_list_id');
    if (!listId) {
      return {
        reading_list: null,
        items: []
      };
    }
    const lists = this._getFromStorage('reading_lists');
    const reading_list = lists.find(r => r.id === listId) || null;
    if (!reading_list) {
      return {
        reading_list: null,
        items: []
      };
    }
    const items = this._getFromStorage('reading_list_items')
      .filter(i => i.reading_list_id === reading_list.id);
    const resources = this._getFromStorage('resource_items');

    const mapped = items.map(item => {
      const resource = resources.find(r => r.id === item.resource_id) || null;
      return {
        item,
        resource
      };
    });

    return {
      reading_list,
      items: mapped
    };
  }

  // removeReadingListItem
  removeReadingListItem(readingListItemId) {
    const items = this._getFromStorage('reading_list_items');
    const idx = items.findIndex(i => i.id === readingListItemId);
    if (idx === -1) {
      return {
        success: false,
        reading_list: null,
        items: []
      };
    }
    const listId = items[idx].reading_list_id;
    items.splice(idx, 1);
    this._saveToStorage('reading_list_items', items);

    const lists = this._getFromStorage('reading_lists');
    const list = lists.find(r => r.id === listId) || null;
    if (list) {
      list.items = (list.items || []).filter(id => id !== readingListItemId);
      list.updated_at = new Date().toISOString();
      this._saveReadingList(list);
    }
    const itemsForList = items.filter(i => i.reading_list_id === listId);
    const resources = this._getFromStorage('resource_items');
    const mapped = itemsForList.map(item => {
      const resource = resources.find(r => r.id === item.resource_id) || null;
      return {
        item,
        resource
      };
    });

    return {
      success: true,
      reading_list: list,
      items: mapped
    };
  }

  // listTools
  listTools() {
    const tools = this._getFromStorage('tools');
    return { tools };
  }

  // runEqualizationTankCalculation
  runEqualizationTankCalculation(flow_rate_value, flow_rate_unit, peak_factor, buffer_time_hours) {
    const requiredVolume = this._runEqualizationTankFormula(
      flow_rate_value,
      flow_rate_unit,
      peak_factor,
      buffer_time_hours
    );

    const tankSeries = this._getFromStorage('tank_series');
    const recommended_configurations = [];

    for (const series of tankSeries) {
      const minV = typeof series.min_volume_m3 === 'number' ? series.min_volume_m3 : 0;
      const maxV = typeof series.max_volume_m3 === 'number' ? series.max_volume_m3 : Infinity;
      if (requiredVolume > maxV) continue;
      const recommended_volume_m3 = Math.max(requiredVolume, minV);
      recommended_configurations.push({
        recommended_volume_m3,
        is_primary_recommendation: false,
        tank_series: series
      });
    }

    recommended_configurations.sort((a, b) => a.recommended_volume_m3 - b.recommended_volume_m3);
    if (recommended_configurations.length > 0) {
      recommended_configurations[0].is_primary_recommendation = true;
    }

    const calcRecord = {
      id: this._generateId('etc'),
      flow_rate_value,
      flow_rate_unit,
      peak_factor,
      buffer_time_hours,
      calculated_required_volume_m3: requiredVolume,
      recommended_volume_m3: recommended_configurations.length
        ? recommended_configurations[0].recommended_volume_m3
        : requiredVolume,
      selected_tank_series_id: recommended_configurations.length
        ? recommended_configurations[0].tank_series.id
        : null,
      created_at: new Date().toISOString()
    };

    const calcs = this._getFromStorage('equalization_tank_calculations');
    calcs.push(calcRecord);
    this._saveToStorage('equalization_tank_calculations', calcs);

    return {
      calculation: calcRecord,
      recommended_configurations
    };
  }

  // getContactPageInfo
  getContactPageInfo() {
    const raw = localStorage.getItem('contact_page_info');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      company_name: 'Industrial Water Systems',
      phone: '',
      email: '',
      address: {
        line1: '',
        line2: '',
        city: '',
        state_region: '',
        postal_code: '',
        country: ''
      },
      regional_support: []
    };
  }

  // submitContactRequest
  submitContactRequest(name, email, phone, company, subject, message) {
    const requests = this._getFromStorage('contact_requests');
    const contact_request = {
      id: this._generateId('cr'),
      name,
      email,
      phone: phone || null,
      company: company || null,
      subject: subject || null,
      message,
      created_at: new Date().toISOString(),
      status: 'new'
    };
    requests.push(contact_request);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      message: 'Contact request submitted.',
      contact_request
    };
  }

  // searchDistributors
  searchDistributors(zip_postal_code, radius_km, market_segment) {
    const results = this._calculateDistributorDistances(
      zip_postal_code,
      radius_km,
      market_segment
    );
    const search = {
      id: this._generateId('ds'),
      zip_postal_code,
      radius_km,
      market_segment,
      result_distributor_ids: results.map(r => r.distributor.id),
      created_at: new Date().toISOString()
    };
    const searches = this._getFromStorage('distributor_searches');
    searches.push(search);
    this._saveToStorage('distributor_searches', searches);

    return {
      search,
      results
    };
  }

  // getDistributorDetails
  getDistributorDetails(distributorId) {
    const distributors = this._getFromStorage('distributors');
    const distributor = distributors.find(d => d.id === distributorId) || null;

    // Instrumentation for task completion tracking
    try {
      if (distributor) {
        localStorage.setItem(
          'task7_lastDistributorDetails',
          JSON.stringify({ "distributor_id": distributor.id, "viewed_at": new Date().toISOString() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { distributor };
  }

  // registerForWebinar
  registerForWebinar(webinarId, full_name, email, company, role, country) {
    const resources = this._getFromStorage('resource_items');
    const webinar = resources.find(
      r => r.id === webinarId
    ) || null;
    if (!webinar || webinar.registration_open === false) {
      return {
        success: false,
        message: 'Webinar not available for registration.',
        registration: null
      };
    }

    const registrations = this._getFromStorage('webinar_registrations');
    const registration = {
      id: this._generateId('wr'),
      webinar_id: webinarId,
      full_name,
      email,
      company: company || null,
      role: role || null,
      country: country || null,
      registration_datetime: new Date().toISOString(),
      status: 'submitted'
    };
    registrations.push(registration);
    this._saveToStorage('webinar_registrations', registrations);

    return {
      success: true,
      message: 'Webinar registration submitted.',
      registration
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      title: '',
      hero_text: '',
      sections: [],
      certifications: [],
      markets_served: [],
      core_product_lines: []
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      title: '',
      last_updated: '',
      sections: [],
      privacy_contact_email: ''
    };
  }

  // getTermsOfUseContent
  getTermsOfUseContent() {
    const raw = localStorage.getItem('terms_of_use_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      title: '',
      last_updated: '',
      sections: []
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