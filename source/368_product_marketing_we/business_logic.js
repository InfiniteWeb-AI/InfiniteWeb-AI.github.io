// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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
    const arrayKeys = [
      'product_categories',
      'products',
      'inquiry_lists',
      'inquiry_list_items',
      'cnc_services',
      'quote_requests',
      'case_studies',
      'favorite_items',
      'plants',
      'plant_contact_messages',
      'finishing_processes',
      'consultation_requests',
      'injection_molding_suppliers',
      'supplier_comparisons',
      'supplier_comparison_items',
      'newsletter_subscriptions',
      'service_offerings',
      'virtual_plant_tour_bookings'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed a default pump product for the pumps category if none exist
    try {
      const productsRaw = localStorage.getItem('products');
      let products = [];
      if (productsRaw) {
        try {
          products = JSON.parse(productsRaw) || [];
        } catch (e) {
          products = [];
        }
      }
      const hasPump = products.some(function (p) { return p && p.categoryId === 'pumps'; });
      if (!hasPump) {
        products.push({
          id: this._generateId('prod'),
          name: 'Industrial Process Pump, 3 HP, Sealed Bearing',
          categoryId: 'pumps',
          description: 'General-purpose industrial process pump suitable for water and light chemicals, cast iron housing with mechanical seal.',
          price: 520,
          average_rating: 4.7,
          review_count: 24,
          rohs_compliant: false,
          image_url: '',
          sku: 'PMP-3HP-GEN-IND',
          is_inquiry_enabled: true,
          is_rfq_enabled: true
        });
        localStorage.setItem('products', JSON.stringify(products));
      }
    } catch (e) {
      // fail silently if seeding cannot be performed
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

  _nowISO() {
    return new Date().toISOString();
  }

  _truncate(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
  }

  // ----------------------
  // Code/label helpers
  // ----------------------
  _materialCodeToLabel(code) {
    if (!code) return '';
    switch (code) {
      case 'aluminum_6061':
        return 'Aluminum 6061';
      default:
        return code.replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
    }
  }

  _industryCodeToLabel(code) {
    if (!code) return '';
    switch (code) {
      case 'automotive':
        return 'Automotive';
      case 'aerospace':
        return 'Aerospace';
      case 'electronics':
        return 'Electronics';
      case 'medical_healthcare':
        return 'Medical / Healthcare';
      case 'other':
        return 'Other';
      default:
        return code.replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
    }
  }

  _certificationCodeToLabel(code) {
    if (!code) return '';
    switch (code) {
      case 'iso_9001':
        return 'ISO 9001';
      case 'iso_13485':
        return 'ISO 13485';
      default:
        return code.toUpperCase().replace(/_/g, ' ');
    }
  }

  _regionCodeToLabel(code) {
    if (!code) return '';
    switch (code) {
      case 'asia':
        return 'Asia';
      case 'europe':
        return 'Europe';
      case 'north_america':
        return 'North America';
      case 'south_america':
        return 'South America';
      case 'africa':
        return 'Africa';
      case 'middle_east':
        return 'Middle East';
      case 'oceania':
        return 'Oceania';
      default:
        return code.replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
    }
  }

  _capabilityCodeToLabel(code) {
    if (!code) return '';
    switch (code) {
      case 'plastics_manufacturing':
        return 'Plastics Manufacturing';
      case 'cnc_machining':
        return 'CNC Machining';
      default:
        return code.replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
    }
  }

  _topicCodeToLabel(code) {
    if (!code) return '';
    switch (code) {
      case 'lean_manufacturing':
        return 'Lean manufacturing';
      case 'quality_control':
        return 'Quality control';
      default:
        return code.replace(/_/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
    }
  }

  _getCaseStudyYear(cs) {
    if (typeof cs.year === 'number') return cs.year;
    if (cs.published_date) {
      const d = new Date(cs.published_date);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return null;
  }

  // ----------------------
  // Inquiry list helpers
  // ----------------------
  _getOrCreateInquiryList() {
    let lists = this._getFromStorage('inquiry_lists', []);
    let openLists = lists.filter(function (l) { return l.status === 'open'; });
    let list = null;
    if (openLists.length > 0) {
      // choose the most recently created
      openLists.sort(function (a, b) {
        return (a.created_at || '') < (b.created_at || '') ? 1 : -1;
      });
      list = openLists[0];
    } else {
      list = {
        id: this._generateId('inq_list'),
        status: 'open',
        created_at: this._nowISO(),
        updated_at: this._nowISO()
      };
      lists.push(list);
      this._saveToStorage('inquiry_lists', lists);
    }
    return list;
  }

  _calculateInquiryListSummary(inquiryListId) {
    const items = this._getFromStorage('inquiry_list_items', []).filter(function (it) {
      return it.inquiry_list_id === inquiryListId;
    });
    const products = this._getFromStorage('products', []);

    let totalItems = 0;
    const productIdsSet = {};
    let totalEstimatedValue = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qty = typeof it.quantity === 'number' ? it.quantity : 0;
      totalItems += qty;
      productIdsSet[it.product_id] = true;
      const product = products.find(function (p) { return p.id === it.product_id; });
      const price = product && typeof product.price === 'number' ? product.price : 0;
      totalEstimatedValue += price * qty;
    }

    return {
      total_items: totalItems,
      total_distinct_products: Object.keys(productIdsSet).length,
      total_estimated_value: totalEstimatedValue
    };
  }

  // Favorites helper
  _getOrCreateFavoritesStore() {
    // For this single-user implementation, favorites are stored directly in 'favorite_items'.
    // Ensure the key exists (handled in _initStorage) and return the array.
    return this._getFromStorage('favorite_items', []);
  }

  // Quote request helper
  _createQuoteRequestRecord(source_type, source_id, quantity, project_details) {
    const quoteRequests = this._getFromStorage('quote_requests', []);
    const record = {
      id: this._generateId('quote'),
      source_type: source_type,
      source_id: source_id,
      quantity: typeof quantity === 'number' ? quantity : null,
      project_details: project_details || '',
      status: 'submitted',
      created_at: this._nowISO()
    };
    quoteRequests.push(record);
    this._saveToStorage('quote_requests', quoteRequests);
    return record;
  }

  // Supplier comparison helper
  _saveSupplierComparisonEntities(name, supplierIds) {
    let comparisons = this._getFromStorage('supplier_comparisons', []);
    let comparisonItems = this._getFromStorage('supplier_comparison_items', []);

    const comparison = {
      id: this._generateId('comp'),
      name: name,
      created_at: this._nowISO()
    };
    comparisons.push(comparison);

    for (let i = 0; i < supplierIds.length; i++) {
      const item = {
        id: this._generateId('comp_item'),
        comparison_id: comparison.id,
        supplier_id: supplierIds[i],
        position: i + 1
      };
      comparisonItems.push(item);
    }

    this._saveToStorage('supplier_comparisons', comparisons);
    this._saveToStorage('supplier_comparison_items', comparisonItems);

    return comparison;
  }

  // Virtual plant tour helper
  _resolveVirtualPlantTourService() {
    const services = this._getFromStorage('service_offerings', []);
    const svc = services.find(function (s) { return s.slug === 'virtual_plant_tours'; });
    return svc ? svc.id : null;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageContent()
  getHomePageContent() {
    const productCategories = this._getFromStorage('product_categories', []);
    const services = this._getFromStorage('service_offerings', []);
    const caseStudies = this._getFromStorage('case_studies', []);

    // Hero content - static marketing copy (not entity data)
    const hero = {
      title: 'Integrated manufacturing for engineered products',
      subtitle: 'Connect with qualified plants, capabilities, and components across a global network.',
      primary_cta_label: 'Explore capabilities',
      primary_cta_destination: 'capabilities_overview',
      secondary_cta_label: 'Browse products',
      secondary_cta_destination: 'products_categories'
    };

    // Capabilities summary based on data presence
    const capabilities_summary = [];
    const cncServices = this._getFromStorage('cnc_services', []);
    const injectionSuppliers = this._getFromStorage('injection_molding_suppliers', []);
    const finishingProcesses = this._getFromStorage('finishing_processes', []);
    const plants = this._getFromStorage('plants', []);

    if (cncServices.length > 0) {
      capabilities_summary.push({
        key: 'cnc_machining',
        title: 'CNC Machining',
        description: 'Precision CNC machining for aluminum, steels, and more.',
        primary_link_destination: 'capabilities_cnc_machining'
      });
    }
    if (injectionSuppliers.length > 0) {
      capabilities_summary.push({
        key: 'injection_molding',
        title: 'Injection Molding',
        description: 'High-volume injection molding suppliers with tracked performance.',
        primary_link_destination: 'capabilities_injection_molding'
      });
    }
    if (finishingProcesses.length > 0) {
      capabilities_summary.push({
        key: 'surface_finishing',
        title: 'Surface Finishing',
        description: 'Anodizing, powder coating, and other finishing services.',
        primary_link_destination: 'capabilities_surface_finishing'
      });
    }
    if (plants.length > 0) {
      capabilities_summary.push({
        key: 'global_manufacturing',
        title: 'Global manufacturing footprint',
        description: 'Qualified plants across key manufacturing regions.',
        primary_link_destination: 'locations_overview'
      });
    }

    // Featured product categories: first few categories
    const featured_product_categories = productCategories.slice(0, 3).map(function (cat) {
      return {
        category_id: cat.id,
        category_name: cat.name,
        slug: cat.slug,
        description: cat.description || ''
      };
    });

    // Featured services: first few services
    const featured_services = services.slice(0, 3).map(function (svc) {
      return {
        service_id: svc.id,
        name: svc.name,
        slug: svc.slug,
        description: svc.description || '',
        primary_cta_label: 'View service',
        primary_cta_destination: 'service_' + svc.slug
      };
    });

    // Featured case studies: most recent by year
    const self = this;
    const sortedCaseStudies = caseStudies.slice().sort(function (a, b) {
      const ay = self._getCaseStudyYear(a) || 0;
      const by = self._getCaseStudyYear(b) || 0;
      return by - ay;
    });
    const featured_case_studies = sortedCaseStudies.slice(0, 3).map(function (cs) {
      const year = self._getCaseStudyYear(cs);
      let keyResult = '';
      if (typeof cs.cost_reduction_percent === 'number') {
        keyResult = cs.cost_reduction_percent + '% cost reduction';
      }
      return {
        case_study_id: cs.id,
        title: cs.title,
        industry_label: self._industryCodeToLabel(cs.industry),
        year: year,
        key_result_summary: keyResult
      };
    });

    return {
      hero: hero,
      capabilities_summary: capabilities_summary,
      featured_product_categories: featured_product_categories,
      featured_services: featured_services,
      featured_case_studies: featured_case_studies
    };
  }

  // getProductCategoriesOverview()
  getProductCategoriesOverview() {
    const categories = this._getFromStorage('product_categories', []);
    const products = this._getFromStorage('products', []);

    const overview = categories.map(function (cat) {
      const productCount = products.filter(function (p) { return p.categoryId === cat.id; }).length;
      return {
        category_id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        product_count: productCount,
        is_featured: productCount > 0
      };
    });

    return overview;
  }

  // getProductListingFilterOptions(categoryId)
  getProductListingFilterOptions(categoryId) {
    const products = this._getFromStorage('products', []).filter(function (p) { return p.categoryId === categoryId; });

    let minPrice = null;
    let maxPrice = null;
    let hasRoHS = false;

    for (let i = 0; i < products.length; i++) {
      const price = typeof products[i].price === 'number' ? products[i].price : null;
      if (price !== null) {
        if (minPrice === null || price < minPrice) minPrice = price;
        if (maxPrice === null || price > maxPrice) maxPrice = price;
      }
      if (products[i].rohs_compliant) {
        hasRoHS = true;
      }
    }

    const price = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      currency: 'USD'
    };

    const compliance_options = [];
    if (hasRoHS) {
      compliance_options.push({ code: 'rohs', label: 'RoHS' });
    }

    const rating_options = [
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 4, label: '4 stars & up' }
    ];

    const review_count_options = [
      { min_reviews: 10, label: '10+ reviews' },
      { min_reviews: 50, label: '50+ reviews' }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'rating_high_to_low', label: 'Rating - High to Low' }
    ];

    return {
      price: price,
      compliance_options: compliance_options,
      rating_options: rating_options,
      review_count_options: review_count_options,
      sort_options: sort_options
    };
  }

  // listProducts(categoryId, filters, page, page_size, sort)
  listProducts(categoryId, filters, page, page_size, sort) {
    filters = filters || {};
    page = typeof page === 'number' && page > 0 ? page : 1;
    page_size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;

    const allProducts = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    let filtered = allProducts.filter(function (p) { return p.categoryId === categoryId; });

    if (typeof filters.min_price === 'number') {
      filtered = filtered.filter(function (p) { return typeof p.price === 'number' && p.price >= filters.min_price; });
    }
    if (typeof filters.max_price === 'number') {
      filtered = filtered.filter(function (p) { return typeof p.price === 'number' && p.price <= filters.max_price; });
    }
    if (filters.rohs_only) {
      filtered = filtered.filter(function (p) { return !!p.rohs_compliant; });
    }
    if (typeof filters.min_rating === 'number') {
      filtered = filtered.filter(function (p) {
        const r = typeof p.average_rating === 'number' ? p.average_rating : 0;
        return r >= filters.min_rating;
      });
    }
    if (typeof filters.min_review_count === 'number') {
      filtered = filtered.filter(function (p) {
        const c = typeof p.review_count === 'number' ? p.review_count : 0;
        return c >= filters.min_review_count;
      });
    }

    if (sort === 'price_low_to_high') {
      filtered.sort(function (a, b) {
        const ap = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const bp = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        return ap - bp;
      });
    } else if (sort === 'price_high_to_low') {
      filtered.sort(function (a, b) {
        const ap = typeof a.price === 'number' ? a.price : 0;
        const bp = typeof b.price === 'number' ? b.price : 0;
        return bp - ap;
      });
    } else if (sort === 'rating_high_to_low') {
      filtered.sort(function (a, b) {
        const ar = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const br = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (br !== ar) return br - ar;
        const ac = typeof a.review_count === 'number' ? a.review_count : 0;
        const bc = typeof b.review_count === 'number' ? b.review_count : 0;
        return bc - ac;
      });
    } else {
      filtered.sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    const total_count = filtered.length;
    const total_pages = Math.max(1, Math.ceil(total_count / page_size));
    if (page > total_pages) page = total_pages;
    const start = (page - 1) * page_size;
    const pageItems = filtered.slice(start, start + page_size);

    const self = this;
    const productsResult = pageItems.map(function (p) {
      const cat = categories.find(function (c) { return c.id === p.categoryId; });
      return {
        product_id: p.id,
        name: p.name,
        category_name: cat ? cat.name : '',
        description_snippet: self._truncate(p.description || '', 160),
        price: typeof p.price === 'number' ? p.price : 0,
        currency: 'USD',
        rohs_compliant: !!p.rohs_compliant,
        average_rating: typeof p.average_rating === 'number' ? p.average_rating : 0,
        review_count: typeof p.review_count === 'number' ? p.review_count : 0,
        image_url: p.image_url || '',
        is_inquiry_enabled: !!p.is_inquiry_enabled,
        is_rfq_enabled: !!p.is_rfq_enabled
      };
    });

    return {
      products: productsResult,
      pagination: {
        page: page,
        page_size: page_size,
        total_count: total_count,
        total_pages: total_pages
      }
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const product = products.find(function (p) { return p.id === productId; });
    if (!product) {
      return null;
    }
    const category = categories.find(function (c) { return c.id === product.categoryId; }) || null;

    const specifications = product.specifications || {};

    const breadcrumbs = [
      { label: 'Products', destination: 'products_categories' }
    ];
    if (category) {
      breadcrumbs.push({ label: category.name, destination: 'products_category_' + category.slug });
    }

    const compliance_labels = [];
    if (product.rohs_compliant) {
      compliance_labels.push('RoHS');
    }

    const result = {
      product_id: product.id,
      name: product.name,
      category_id: product.categoryId,
      category_name: category ? category.name : '',
      description: product.description || '',
      price: typeof product.price === 'number' ? product.price : 0,
      currency: 'USD',
      average_rating: typeof product.average_rating === 'number' ? product.average_rating : 0,
      review_count: typeof product.review_count === 'number' ? product.review_count : 0,
      rohs_compliant: !!product.rohs_compliant,
      compliance_labels: compliance_labels,
      image_url: product.image_url || '',
      sku: product.sku || '',
      specifications: {
        dimensions: specifications.dimensions || '',
        materials: specifications.materials || '',
        technical_notes: specifications.technical_notes || ''
      },
      is_inquiry_enabled: !!product.is_inquiry_enabled,
      is_rfq_enabled: !!product.is_rfq_enabled,
      breadcrumbs: breadcrumbs
    };

    // Foreign key resolution: categoryId -> category
    result.category = category;

    return result;
  }

  // addProductToInquiryList(productId, quantity)
  addProductToInquiryList(productId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const products = this._getFromStorage('products', []);
    const product = products.find(function (p) { return p.id === productId; });
    if (!product) {
      return { success: false, message: 'Product not found', inquiry_list_item_id: null, inquiry_list_summary: { total_items: 0, total_distinct_products: 0 } };
    }

    const inquiryList = this._getOrCreateInquiryList();
    let items = this._getFromStorage('inquiry_list_items', []);

    let item = items.find(function (it) {
      return it.inquiry_list_id === inquiryList.id && it.product_id === productId && it.entry_type === 'inquiry';
    });

    if (item) {
      item.quantity = (typeof item.quantity === 'number' ? item.quantity : 0) + quantity;
    } else {
      item = {
        id: this._generateId('inq_item'),
        inquiry_list_id: inquiryList.id,
        product_id: productId,
        quantity: quantity,
        entry_type: 'inquiry',
        added_at: this._nowISO()
      };
      items.push(item);
    }

    this._saveToStorage('inquiry_list_items', items);

    // update inquiry list updated_at
    const lists = this._getFromStorage('inquiry_lists', []);
    const listIndex = lists.findIndex(function (l) { return l.id === inquiryList.id; });
    if (listIndex >= 0) {
      lists[listIndex].updated_at = this._nowISO();
      this._saveToStorage('inquiry_lists', lists);
    }

    const summary = this._calculateInquiryListSummary(inquiryList.id);

    return {
      success: true,
      message: 'Product added to inquiry list',
      inquiry_list_item_id: item.id,
      inquiry_list_summary: {
        total_items: summary.total_items,
        total_distinct_products: summary.total_distinct_products
      }
    };
  }

  // addProductToRfQ(productId, quantity)
  addProductToRfQ(productId, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const products = this._getFromStorage('products', []);
    const product = products.find(function (p) { return p.id === productId; });
    if (!product) {
      return { success: false, message: 'Product not found', rfq_item_id: null, inquiry_list_summary: { total_items: 0, total_distinct_products: 0 } };
    }

    const inquiryList = this._getOrCreateInquiryList();
    let items = this._getFromStorage('inquiry_list_items', []);

    let item = items.find(function (it) {
      return it.inquiry_list_id === inquiryList.id && it.product_id === productId && it.entry_type === 'rfq';
    });

    if (item) {
      item.quantity = quantity;
    } else {
      item = {
        id: this._generateId('rfq_item'),
        inquiry_list_id: inquiryList.id,
        product_id: productId,
        quantity: quantity,
        entry_type: 'rfq',
        added_at: this._nowISO()
      };
      items.push(item);
    }

    this._saveToStorage('inquiry_list_items', items);

    // update inquiry list updated_at
    const lists = this._getFromStorage('inquiry_lists', []);
    const listIndex = lists.findIndex(function (l) { return l.id === inquiryList.id; });
    if (listIndex >= 0) {
      lists[listIndex].updated_at = this._nowISO();
      this._saveToStorage('inquiry_lists', lists);
    }

    const summary = this._calculateInquiryListSummary(inquiryList.id);

    return {
      success: true,
      message: 'Product added to RFQ',
      rfq_item_id: item.id,
      inquiry_list_summary: {
        total_items: summary.total_items,
        total_distinct_products: summary.total_distinct_products
      }
    };
  }

  // getInquiryList()
  getInquiryList() {
    const lists = this._getFromStorage('inquiry_lists', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    let inquiryList = lists.filter(function (l) { return l.status === 'open'; });
    if (inquiryList.length > 0) {
      inquiryList.sort(function (a, b) {
        return (a.created_at || '') < (b.created_at || '') ? 1 : -1;
      });
      inquiryList = inquiryList[0];
    } else {
      // No list yet: return empty structure
      return {
        status: 'open',
        items: [],
        summary: {
          total_items: 0,
          total_distinct_products: 0,
          total_estimated_value: 0
        }
      };
    }

    const itemsAll = this._getFromStorage('inquiry_list_items', []);
    const listItems = itemsAll.filter(function (it) { return it.inquiry_list_id === inquiryList.id; });

    const self = this;
    const itemsResult = listItems.map(function (it) {
      const product = products.find(function (p) { return p.id === it.product_id; }) || null;
      const category = product ? categories.find(function (c) { return c.id === product.categoryId; }) : null;
      const price = product && typeof product.price === 'number' ? product.price : 0;
      const qty = typeof it.quantity === 'number' ? it.quantity : 0;
      const totalLine = price * qty;
      const avgRating = product && typeof product.average_rating === 'number' ? product.average_rating : 0;
      const reviewCount = product && typeof product.review_count === 'number' ? product.review_count : 0;

      const itemResult = {
        item_id: it.id,
        product_id: it.product_id,
        product_name: product ? product.name : '',
        category_name: category ? category.name : '',
        price: price,
        currency: 'USD',
        quantity: qty,
        entry_type: it.entry_type,
        total_line_price: totalLine,
        rohs_compliant: product ? !!product.rohs_compliant : false,
        average_rating: avgRating,
        review_count: reviewCount
      };

      // Foreign key resolution: product_id -> product
      itemResult.product = product;
      return itemResult;
    });

    const summary = this._calculateInquiryListSummary(inquiryList.id);

    return {
      status: inquiryList.status,
      items: itemsResult,
      summary: summary
    };
  }

  // updateInquiryListItemQuantity(inquiryListItemId, quantity)
  updateInquiryListItemQuantity(inquiryListItemId, quantity) {
    quantity = typeof quantity === 'number' ? quantity : 0;

    let items = this._getFromStorage('inquiry_list_items', []);
    const products = this._getFromStorage('products', []);

    const index = items.findIndex(function (it) { return it.id === inquiryListItemId; });
    if (index < 0) {
      return {
        success: false,
        message: 'Inquiry list item not found',
        updated_item: null,
        summary: {
          total_items: 0,
          total_estimated_value: 0
        }
      };
    }

    const listId = items[index].inquiry_list_id;

    if (quantity <= 0) {
      items.splice(index, 1);
    } else {
      items[index].quantity = quantity;
    }

    this._saveToStorage('inquiry_list_items', items);

    // update inquiry list updated_at
    const lists = this._getFromStorage('inquiry_lists', []);
    const listIndex = lists.findIndex(function (l) { return l.id === listId; });
    if (listIndex >= 0) {
      lists[listIndex].updated_at = this._nowISO();
      this._saveToStorage('inquiry_lists', lists);
    }

    const summaryFull = this._calculateInquiryListSummary(listId);

    let updated_item = null;
    if (quantity > 0) {
      const item = items.find(function (it) { return it.id === inquiryListItemId; });
      const product = item ? products.find(function (p) { return p.id === item.product_id; }) : null;
      const price = product && typeof product.price === 'number' ? product.price : 0;
      const totalLine = price * quantity;
      updated_item = {
        item_id: inquiryListItemId,
        quantity: quantity,
        total_line_price: totalLine
      };
    }

    return {
      success: true,
      message: 'Inquiry list item updated',
      updated_item: updated_item,
      summary: {
        total_items: summaryFull.total_items,
        total_estimated_value: summaryFull.total_estimated_value
      }
    };
  }

  // removeInquiryListItem(inquiryListItemId)
  removeInquiryListItem(inquiryListItemId) {
    let items = this._getFromStorage('inquiry_list_items', []);
    const index = items.findIndex(function (it) { return it.id === inquiryListItemId; });

    let listId = null;
    if (index >= 0) {
      listId = items[index].inquiry_list_id;
      items.splice(index, 1);
      this._saveToStorage('inquiry_list_items', items);

      const lists = this._getFromStorage('inquiry_lists', []);
      const listIndex = lists.findIndex(function (l) { return l.id === listId; });
      if (listIndex >= 0) {
        lists[listIndex].updated_at = this._nowISO();
        this._saveToStorage('inquiry_lists', lists);
      }
    }

    let summary = { total_items: 0, total_distinct_products: 0 };
    if (listId) {
      const fullSummary = this._calculateInquiryListSummary(listId);
      summary = {
        total_items: fullSummary.total_items,
        total_distinct_products: fullSummary.total_distinct_products
      };
    }

    return {
      success: index >= 0,
      message: index >= 0 ? 'Inquiry list item removed' : 'Inquiry list item not found',
      summary: summary
    };
  }

  // submitInquiryListAsConsolidatedRFQ(name, email, company, notes)
  submitInquiryListAsConsolidatedRFQ(name, email, company, notes) {
    const lists = this._getFromStorage('inquiry_lists', []);
    let inquiryList = lists.filter(function (l) { return l.status === 'open'; });
    if (inquiryList.length === 0) {
      return { success: false, rfq_id: null, status: 'draft', message: 'No open inquiry list to submit.' };
    }
    inquiryList.sort(function (a, b) {
      return (a.created_at || '') < (b.created_at || '') ? 1 : -1;
    });
    inquiryList = inquiryList[0];

    const items = this._getFromStorage('inquiry_list_items', []).filter(function (it) { return it.inquiry_list_id === inquiryList.id; });
    if (items.length === 0) {
      return { success: false, rfq_id: null, status: 'draft', message: 'Inquiry list is empty.' };
    }

    const contactText = 'Contact: ' + name + ' <' + email + '>' + (company ? ' | Company: ' + company : '');
    const projectDetails = contactText + (notes ? '\nNotes: ' + notes : '');

    const quote = this._createQuoteRequestRecord('generic', inquiryList.id, null, projectDetails);

    // update inquiry list status to submitted
    const listIndex = lists.findIndex(function (l) { return l.id === inquiryList.id; });
    if (listIndex >= 0) {
      lists[listIndex].status = 'submitted';
      lists[listIndex].updated_at = this._nowISO();
      this._saveToStorage('inquiry_lists', lists);
    }

    return {
      success: true,
      rfq_id: quote.id,
      status: quote.status,
      message: 'Inquiry list submitted as consolidated RFQ.'
    };
  }

  // getCncServiceFilterOptions()
  getCncServiceFilterOptions() {
    const services = this._getFromStorage('cnc_services', []);

    const materialSet = {};
    const industrySet = {};
    const certSet = {};
    let minLead = null;
    let maxLead = null;

    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      if (Array.isArray(s.materials_supported)) {
        for (let j = 0; j < s.materials_supported.length; j++) {
          materialSet[s.materials_supported[j]] = true;
        }
      }
      if (Array.isArray(s.industries_served)) {
        for (let j = 0; j < s.industries_served.length; j++) {
          industrySet[s.industries_served[j]] = true;
        }
      }
      if (Array.isArray(s.certifications)) {
        for (let j = 0; j < s.certifications.length; j++) {
          certSet[s.certifications[j]] = true;
        }
      }
      const ltMin = typeof s.lead_time_min_weeks === 'number' ? s.lead_time_min_weeks : null;
      const ltMax = typeof s.lead_time_max_weeks === 'number' ? s.lead_time_max_weeks : null;
      if (ltMin !== null) {
        if (minLead === null || ltMin < minLead) minLead = ltMin;
      }
      if (ltMax !== null) {
        if (maxLead === null || ltMax > maxLead) maxLead = ltMax;
      }
    }

    const material_options = Object.keys(materialSet).map((code) => ({ code: code, label: this._materialCodeToLabel(code) }));
    const industry_options = Object.keys(industrySet).map((code) => ({ code: code, label: this._industryCodeToLabel(code) }));
    const certification_options = Object.keys(certSet).map((code) => ({ code: code, label: this._certificationCodeToLabel(code) }));

    const lead_time_weeks_range = {
      min: minLead !== null ? minLead : 0,
      max: maxLead !== null ? maxLead : 0
    };

    const sort_options = [
      { value: 'lead_time_asc', label: 'Lead time - Shortest first' },
      { value: 'lead_time_desc', label: 'Lead time - Longest first' },
      { value: 'moq_asc', label: 'Minimum order quantity' }
    ];

    return {
      material_options: material_options,
      industry_options: industry_options,
      lead_time_weeks_range: lead_time_weeks_range,
      certification_options: certification_options,
      sort_options: sort_options
    };
  }

  // listCncServices(filters, page, page_size, sort)
  listCncServices(filters, page, page_size, sort) {
    filters = filters || {};
    page = typeof page === 'number' && page > 0 ? page : 1;
    page_size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;

    let services = this._getFromStorage('cnc_services', []);

    if (filters.material_code) {
      services = services.filter(function (s) {
        return Array.isArray(s.materials_supported) && s.materials_supported.indexOf(filters.material_code) !== -1;
      });
    }
    if (filters.industry_code) {
      services = services.filter(function (s) {
        return Array.isArray(s.industries_served) && s.industries_served.indexOf(filters.industry_code) !== -1;
      });
    }
    if (typeof filters.max_lead_time_weeks === 'number') {
      services = services.filter(function (s) {
        const lt = typeof s.lead_time_max_weeks === 'number' ? s.lead_time_max_weeks : null;
        return lt !== null && lt <= filters.max_lead_time_weeks;
      });
    }
    if (Array.isArray(filters.certification_codes) && filters.certification_codes.length > 0) {
      services = services.filter(function (s) {
        if (!Array.isArray(s.certifications)) return false;
        for (let i = 0; i < filters.certification_codes.length; i++) {
          if (s.certifications.indexOf(filters.certification_codes[i]) === -1) return false;
        }
        return true;
      });
    }

    if (sort === 'lead_time_asc') {
      services.sort(function (a, b) {
        const al = typeof a.lead_time_max_weeks === 'number' ? a.lead_time_max_weeks : Number.POSITIVE_INFINITY;
        const bl = typeof b.lead_time_max_weeks === 'number' ? b.lead_time_max_weeks : Number.POSITIVE_INFINITY;
        return al - bl;
      });
    } else if (sort === 'lead_time_desc') {
      services.sort(function (a, b) {
        const al = typeof a.lead_time_max_weeks === 'number' ? a.lead_time_max_weeks : 0;
        const bl = typeof b.lead_time_max_weeks === 'number' ? b.lead_time_max_weeks : 0;
        return bl - al;
      });
    } else if (sort === 'moq_asc') {
      services.sort(function (a, b) {
        const am = typeof a.min_order_quantity === 'number' ? a.min_order_quantity : Number.POSITIVE_INFINITY;
        const bm = typeof b.min_order_quantity === 'number' ? b.min_order_quantity : Number.POSITIVE_INFINITY;
        return am - bm;
      });
    } else {
      services.sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    const total_count = services.length;
    const total_pages = Math.max(1, Math.ceil(total_count / page_size));
    if (page > total_pages) page = total_pages;
    const start = (page - 1) * page_size;
    const pageItems = services.slice(start, start + page_size);

    const self = this;
    const servicesResult = pageItems.map(function (s) {
      const materialLabels = Array.isArray(s.materials_supported)
        ? s.materials_supported.map(function (code) { return self._materialCodeToLabel(code); })
        : [];
      const industryLabels = Array.isArray(s.industries_served)
        ? s.industries_served.map(function (code) { return self._industryCodeToLabel(code); })
        : [];
      const certLabels = Array.isArray(s.certifications)
        ? s.certifications.map(function (code) { return self._certificationCodeToLabel(code); })
        : [];
      return {
        service_id: s.id,
        name: s.name,
        description_snippet: self._truncate(s.description || '', 200),
        min_order_quantity: typeof s.min_order_quantity === 'number' ? s.min_order_quantity : 0,
        lead_time_min_weeks: typeof s.lead_time_min_weeks === 'number' ? s.lead_time_min_weeks : null,
        lead_time_max_weeks: typeof s.lead_time_max_weeks === 'number' ? s.lead_time_max_weeks : null,
        materials_supported: Array.isArray(s.materials_supported) ? s.materials_supported.slice() : [],
        materials_labels: materialLabels,
        industry_labels: industryLabels,
        certification_labels: certLabels
      };
    });

    return {
      services: servicesResult,
      pagination: {
        page: page,
        page_size: page_size,
        total_count: total_count,
        total_pages: total_pages
      }
    };
  }

  // getCncServiceDetails(serviceId)
  getCncServiceDetails(serviceId) {
    const services = this._getFromStorage('cnc_services', []);
    const service = services.find(function (s) { return s.id === serviceId; });
    if (!service) {
      return null;
    }

    const self = this;
    const materialLabels = Array.isArray(service.materials_supported)
      ? service.materials_supported.map(function (code) { return self._materialCodeToLabel(code); })
      : [];
    const industryLabels = Array.isArray(service.industries_served)
      ? service.industries_served.map(function (code) { return self._industryCodeToLabel(code); })
      : [];
    const certLabels = Array.isArray(service.certifications)
      ? service.certifications.map(function (code) { return self._certificationCodeToLabel(code); })
      : [];

    // Related services: simple heuristic - other services sharing a material
    const related = services.filter(function (s) {
      if (s.id === service.id) return false;
      if (!Array.isArray(s.materials_supported) || !Array.isArray(service.materials_supported)) return false;
      for (let i = 0; i < s.materials_supported.length; i++) {
        if (service.materials_supported.indexOf(s.materials_supported[i]) !== -1) return true;
      }
      return false;
    }).slice(0, 3).map(function (s) {
      return {
        service_id: s.id,
        name: s.name,
        description_snippet: self._truncate(s.description || '', 160),
        min_order_quantity: typeof s.min_order_quantity === 'number' ? s.min_order_quantity : 0,
        lead_time_max_weeks: typeof s.lead_time_max_weeks === 'number' ? s.lead_time_max_weeks : null
      };
    });

    const breadcrumbs = [
      { label: 'Capabilities', destination: 'capabilities_overview' },
      { label: 'CNC Machining', destination: 'capabilities_cnc_machining' }
    ];

    return {
      service_id: service.id,
      name: service.name,
      description: service.description || '',
      materials_supported: Array.isArray(service.materials_supported) ? service.materials_supported.slice() : [],
      materials_labels: materialLabels,
      industries_served: Array.isArray(service.industries_served) ? service.industries_served.slice() : [],
      industry_labels: industryLabels,
      lead_time_min_weeks: typeof service.lead_time_min_weeks === 'number' ? service.lead_time_min_weeks : null,
      lead_time_max_weeks: typeof service.lead_time_max_weeks === 'number' ? service.lead_time_max_weeks : null,
      min_order_quantity: typeof service.min_order_quantity === 'number' ? service.min_order_quantity : 0,
      certifications: Array.isArray(service.certifications) ? service.certifications.slice() : [],
      certification_labels: certLabels,
      tolerances: service.tolerances || '',
      breadcrumbs: breadcrumbs,
      related_services: related
    };
  }

  // submitCncServiceQuoteRequest(serviceId, quantity, project_details)
  submitCncServiceQuoteRequest(serviceId, quantity, project_details) {
    const services = this._getFromStorage('cnc_services', []);
    const service = services.find(function (s) { return s.id === serviceId; });
    if (!service) {
      return { success: false, quote_request_id: null, status: 'draft', message: 'CNC service not found.' };
    }

    if (!project_details) {
      return { success: false, quote_request_id: null, status: 'draft', message: 'Project details are required.' };
    }

    const qty = typeof quantity === 'number' ? quantity : null;
    const quote = this._createQuoteRequestRecord('cnc_service', serviceId, qty, project_details);

    return {
      success: true,
      quote_request_id: quote.id,
      status: quote.status,
      message: 'CNC service quote request submitted.'
    };
  }

  // getCaseStudyFilterOptions()
  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies', []);
    let minYear = null;
    let maxYear = null;
    const industrySet = {};

    for (let i = 0; i < caseStudies.length; i++) {
      const cs = caseStudies[i];
      const year = this._getCaseStudyYear(cs);
      if (year !== null) {
        if (minYear === null || year < minYear) minYear = year;
        if (maxYear === null || year > maxYear) maxYear = year;
      }
      if (cs.industry) {
        industrySet[cs.industry] = true;
      }
    }

    const industry_options = Object.keys(industrySet).map((code) => ({ code: code, label: this._industryCodeToLabel(code) }));

    const year_range = {
      min_year: minYear !== null ? minYear : null,
      max_year: maxYear !== null ? maxYear : null
    };

    const results_per_page_options = [10, 20, 50];

    return {
      industry_options: industry_options,
      year_range: year_range,
      results_per_page_options: results_per_page_options
    };
  }

  // listCaseStudies(filters, page, page_size, sort)
  listCaseStudies(filters, page, page_size, sort) {
    filters = filters || {};
    page = typeof page === 'number' && page > 0 ? page : 1;
    page_size = typeof page_size === 'number' && page_size > 0 ? page_size : 10;

    let caseStudies = this._getFromStorage('case_studies', []);

    const self = this;

    if (filters.industry_code) {
      caseStudies = caseStudies.filter(function (cs) { return cs.industry === filters.industry_code; });
    }
    if (typeof filters.year_from === 'number') {
      caseStudies = caseStudies.filter(function (cs) {
        const y = self._getCaseStudyYear(cs);
        return y !== null && y >= filters.year_from;
      });
    }
    if (typeof filters.year_to === 'number') {
      caseStudies = caseStudies.filter(function (cs) {
        const y = self._getCaseStudyYear(cs);
        return y !== null && y <= filters.year_to;
      });
    }
    if (typeof filters.min_cost_reduction_percent === 'number') {
      caseStudies = caseStudies.filter(function (cs) {
        const cr = typeof cs.cost_reduction_percent === 'number' ? cs.cost_reduction_percent : 0;
        return cr >= filters.min_cost_reduction_percent;
      });
    }

    if (sort === 'published_date_asc') {
      caseStudies.sort(function (a, b) {
        const ad = a.published_date ? new Date(a.published_date).getTime() : 0;
        const bd = b.published_date ? new Date(b.published_date).getTime() : 0;
        return ad - bd;
      });
    } else {
      // default or published_date_desc
      caseStudies.sort(function (a, b) {
        const ad = a.published_date ? new Date(a.published_date).getTime() : 0;
        const bd = b.published_date ? new Date(b.published_date).getTime() : 0;
        return bd - ad;
      });
    }

    const total_count = caseStudies.length;
    const total_pages = Math.max(1, Math.ceil(total_count / page_size));
    if (page > total_pages) page = total_pages;
    const start = (page - 1) * page_size;
    const pageItems = caseStudies.slice(start, start + page_size);

    const resultItems = pageItems.map(function (cs) {
      return {
        case_study_id: cs.id,
        title: cs.title,
        industry_code: cs.industry,
        industry_label: self._industryCodeToLabel(cs.industry),
        year: self._getCaseStudyYear(cs),
        summary: cs.summary || '',
        cost_reduction_percent: typeof cs.cost_reduction_percent === 'number' ? cs.cost_reduction_percent : null
      };
    });

    return {
      case_studies: resultItems,
      pagination: {
        page: page,
        page_size: page_size,
        total_count: total_count,
        total_pages: total_pages
      }
    };
  }

  // getCaseStudyDetails(caseStudyId)
  getCaseStudyDetails(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const cs = caseStudies.find(function (c) { return c.id === caseStudyId; });
    if (!cs) {
      return null;
    }
    const self = this;

    const breadcrumbs = [
      { label: 'Resources', destination: 'resources_overview' },
      { label: 'Case Studies', destination: 'resources_case_studies' }
    ];

    const related = caseStudies.filter(function (c) { return c.id !== cs.id && c.industry === cs.industry; }).slice(0, 3).map(function (c) {
      return {
        case_study_id: c.id,
        title: c.title,
        industry_label: self._industryCodeToLabel(c.industry)
      };
    });

    return {
      case_study_id: cs.id,
      title: cs.title,
      industry_code: cs.industry,
      industry_label: this._industryCodeToLabel(cs.industry),
      year: this._getCaseStudyYear(cs),
      published_date: cs.published_date || '',
      summary: cs.summary || '',
      content: cs.content || '',
      cost_reduction_percent: typeof cs.cost_reduction_percent === 'number' ? cs.cost_reduction_percent : null,
      breadcrumbs: breadcrumbs,
      related_case_studies: related
    };
  }

  // addItemToFavorites(target_type, target_id)
  addItemToFavorites(target_type, target_id) {
    const allowedTypes = ['case_study', 'product', 'service_offering', 'plant', 'supplier'];
    if (allowedTypes.indexOf(target_type) === -1) {
      return { success: false, favorite_id: null, message: 'Unsupported target_type', total_favorites_count: this._getFromStorage('favorite_items', []).length };
    }

    let favorites = this._getFromStorage('favorite_items', []);
    const existing = favorites.find(function (f) { return f.target_type === target_type && f.target_id === target_id; });
    if (existing) {
      return {
        success: true,
        favorite_id: existing.id,
        message: 'Already in favorites',
        total_favorites_count: favorites.length
      };
    }

    const fav = {
      id: this._generateId('fav'),
      target_type: target_type,
      target_id: target_id,
      added_at: this._nowISO()
    };
    favorites.push(fav);
    this._saveToStorage('favorite_items', favorites);

    return {
      success: true,
      favorite_id: fav.id,
      message: 'Added to favorites',
      total_favorites_count: favorites.length
    };
  }

  // getFavoritesList()
  getFavoritesList() {
    const favorites = this._getFromStorage('favorite_items', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const products = this._getFromStorage('products', []);
    const services = this._getFromStorage('service_offerings', []);
    const plants = this._getFromStorage('plants', []);
    const suppliers = this._getFromStorage('injection_molding_suppliers', []);

    const self = this;

    const items = favorites.map(function (f) {
      let title = '';
      let subtitle = '';
      let industry_label = '';
      const result = {
        favorite_id: f.id,
        target_type: f.target_type,
        target_id: f.target_id,
        added_at: f.added_at
      };

      if (f.target_type === 'case_study') {
        const cs = caseStudies.find(function (c) { return c.id === f.target_id; }) || null;
        const year = cs ? self._getCaseStudyYear(cs) : null;
        title = cs ? cs.title : '';
        industry_label = cs ? self._industryCodeToLabel(cs.industry) : '';
        subtitle = industry_label + (year ? ' • ' + year : '');
        result.case_study = cs;
      } else if (f.target_type === 'product') {
        const p = products.find(function (p0) { return p0.id === f.target_id; }) || null;
        title = p ? p.name : '';
        subtitle = 'Product';
        result.product = p;
      } else if (f.target_type === 'service_offering') {
        const s = services.find(function (s0) { return s0.id === f.target_id; }) || null;
        title = s ? s.name : '';
        subtitle = 'Service offering';
        result.service_offering = s;
      } else if (f.target_type === 'plant') {
        const pl = plants.find(function (p0) { return p0.id === f.target_id; }) || null;
        title = pl ? pl.name : '';
        subtitle = pl ? (pl.city || '') + (pl.country ? (pl.city ? ', ' : '') + pl.country : '') : 'Plant';
        result.plant = pl;
      } else if (f.target_type === 'supplier') {
        const sup = suppliers.find(function (s0) { return s0.id === f.target_id; }) || null;
        title = sup ? sup.name : '';
        subtitle = 'Injection molding supplier';
        result.supplier = sup;
      }

      result.title = title;
      result.subtitle = subtitle;
      result.industry_label = industry_label;

      return result;
    });

    return { items: items };
  }

  // removeFavoriteItem(favoriteId)
  removeFavoriteItem(favoriteId) {
    let favorites = this._getFromStorage('favorite_items', []);
    const index = favorites.findIndex(function (f) { return f.id === favoriteId; });
    if (index >= 0) {
      favorites.splice(index, 1);
      this._saveToStorage('favorite_items', favorites);
      return { success: true, message: 'Removed from favorites', total_favorites_count: favorites.length };
    }
    return { success: false, message: 'Favorite not found', total_favorites_count: favorites.length };
  }

  // getPlantFilterOptions()
  getPlantFilterOptions() {
    const plants = this._getFromStorage('plants', []);

    const regionSet = {};
    const capabilitySet = {};
    const industrySet = {};
    const certSet = {};

    for (let i = 0; i < plants.length; i++) {
      const p = plants[i];
      if (p.region) {
        regionSet[p.region] = true;
      }
      if (Array.isArray(p.capabilities)) {
        for (let j = 0; j < p.capabilities.length; j++) {
          capabilitySet[p.capabilities[j]] = true;
        }
      }
      if (Array.isArray(p.industries_served)) {
        for (let j = 0; j < p.industries_served.length; j++) {
          industrySet[p.industries_served[j]] = true;
        }
      }
      if (Array.isArray(p.certifications)) {
        for (let j = 0; j < p.certifications.length; j++) {
          certSet[p.certifications[j]] = true;
        }
      }
    }

    const region_options = Object.keys(regionSet).map((code) => ({ code: code, label: this._regionCodeToLabel(code) }));
    const capability_options = Object.keys(capabilitySet).map((code) => ({ code: code, label: this._capabilityCodeToLabel(code) }));
    const industry_options = Object.keys(industrySet).map((code) => ({ code: code, label: this._industryCodeToLabel(code) }));
    const certification_options = Object.keys(certSet).map((code) => ({ code: code, label: this._certificationCodeToLabel(code) }));

    return {
      region_options: region_options,
      capability_options: capability_options,
      industry_options: industry_options,
      certification_options: certification_options
    };
  }

  // listPlants(filters, page, page_size, sort)
  listPlants(filters, page, page_size, sort) {
    filters = filters || {};
    page = typeof page === 'number' && page > 0 ? page : 1;
    page_size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;

    let plants = this._getFromStorage('plants', []);

    if (filters.region) {
      plants = plants.filter(function (p) { return p.region === filters.region; });
    }
    if (Array.isArray(filters.capability_codes) && filters.capability_codes.length > 0) {
      plants = plants.filter(function (p) {
        if (!Array.isArray(p.capabilities)) return false;
        for (let i = 0; i < filters.capability_codes.length; i++) {
          if (p.capabilities.indexOf(filters.capability_codes[i]) === -1) return false;
        }
        return true;
      });
    }
    if (Array.isArray(filters.industry_codes) && filters.industry_codes.length > 0) {
      plants = plants.filter(function (p) {
        if (!Array.isArray(p.industries_served)) return false;
        for (let i = 0; i < filters.industry_codes.length; i++) {
          if (p.industries_served.indexOf(filters.industry_codes[i]) === -1) return false;
        }
        return true;
      });
    }
    if (Array.isArray(filters.certification_codes) && filters.certification_codes.length > 0) {
      plants = plants.filter(function (p) {
        if (!Array.isArray(p.certifications)) return false;
        for (let i = 0; i < filters.certification_codes.length; i++) {
          if (p.certifications.indexOf(filters.certification_codes[i]) === -1) return false;
        }
        return true;
      });
    }

    if (sort === 'name_asc') {
      plants.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
    } else {
      plants.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
    }

    const total_count = plants.length;
    const total_pages = Math.max(1, Math.ceil(total_count / page_size));
    if (page > total_pages) page = total_pages;
    const start = (page - 1) * page_size;
    const pageItems = plants.slice(start, start + page_size);

    const self = this;
    const resultPlants = pageItems.map(function (p) {
      const capability_labels = Array.isArray(p.capabilities)
        ? p.capabilities.map(function (code) { return self._capabilityCodeToLabel(code); })
        : [];
      const industry_labels = Array.isArray(p.industries_served)
        ? p.industries_served.map(function (code) { return self._industryCodeToLabel(code); })
        : [];
      const certification_labels = Array.isArray(p.certifications)
        ? p.certifications.map(function (code) { return self._certificationCodeToLabel(code); })
        : [];
      return {
        plant_id: p.id,
        name: p.name,
        city: p.city || '',
        state_region: p.state_region || '',
        country: p.country || '',
        region_label: self._regionCodeToLabel(p.region),
        capability_labels: capability_labels,
        industry_labels: industry_labels,
        certification_labels: certification_labels,
        description_snippet: self._truncate(p.description || '', 200)
      };
    });

    return {
      plants: resultPlants,
      pagination: {
        page: page,
        page_size: page_size,
        total_count: total_count,
        total_pages: total_pages
      }
    };
  }

  // getPlantDetails(plantId)
  getPlantDetails(plantId) {
    const plants = this._getFromStorage('plants', []);
    const plant = plants.find(function (p) { return p.id === plantId; });
    if (!plant) {
      return null;
    }
    const self = this;

    const capability_labels = Array.isArray(plant.capabilities)
      ? plant.capabilities.map(function (code) { return self._capabilityCodeToLabel(code); })
      : [];
    const industry_labels = Array.isArray(plant.industries_served)
      ? plant.industries_served.map(function (code) { return self._industryCodeToLabel(code); })
      : [];
    const certification_labels = Array.isArray(plant.certifications)
      ? plant.certifications.map(function (code) { return self._certificationCodeToLabel(code); })
      : [];

    const breadcrumbs = [
      { label: 'Locations', destination: 'locations_overview' }
    ];

    const related = plants.filter(function (p) { return p.id !== plant.id && p.region === plant.region; }).slice(0, 3).map(function (p) {
      return {
        plant_id: p.id,
        name: p.name,
        city: p.city || '',
        country: p.country || ''
      };
    });

    return {
      plant_id: plant.id,
      name: plant.name,
      address_line1: plant.address_line1 || '',
      address_line2: plant.address_line2 || '',
      city: plant.city || '',
      state_region: plant.state_region || '',
      postal_code: plant.postal_code || '',
      country: plant.country || '',
      region: plant.region || '',
      region_label: this._regionCodeToLabel(plant.region),
      capability_codes: Array.isArray(plant.capabilities) ? plant.capabilities.slice() : [],
      capability_labels: capability_labels,
      industry_codes: Array.isArray(plant.industries_served) ? plant.industries_served.slice() : [],
      industry_labels: industry_labels,
      certification_codes: Array.isArray(plant.certifications) ? plant.certifications.slice() : [],
      certification_labels: certification_labels,
      description: plant.description || '',
      equipment_summary: plant.equipment_summary || '',
      breadcrumbs: breadcrumbs,
      related_plants: related
    };
  }

  // submitPlantContactForm(plantId, name, email, message)
  submitPlantContactForm(plantId, name, email, message) {
    const plants = this._getFromStorage('plants', []);
    const plant = plants.find(function (p) { return p.id === plantId; });
    if (!plant) {
      return {
        success: false,
        plant_contact_message_id: null,
        status: 'open',
        message: 'Plant not found.'
      };
    }

    let msgs = this._getFromStorage('plant_contact_messages', []);
    const record = {
      id: this._generateId('plant_msg'),
      plant_id: plantId,
      name: name,
      email: email,
      message: message,
      status: 'open',
      created_at: this._nowISO()
    };
    msgs.push(record);
    this._saveToStorage('plant_contact_messages', msgs);

    return {
      success: true,
      plant_contact_message_id: record.id,
      status: record.status,
      message: 'Contact message submitted.'
    };
  }

  // listFinishingProcessesOverview()
  listFinishingProcessesOverview() {
    const processes = this._getFromStorage('finishing_processes', []);
    const self = this;

    const result = processes.map(function (p) {
      return {
        process_id: p.id,
        name: p.name,
        slug: p.slug,
        description_snippet: self._truncate(p.description || '', 200),
        min_order_quantity: typeof p.min_order_quantity === 'number' ? p.min_order_quantity : 0,
        typical_applications: '',
        performance_summary: ''
      };
    });

    return { processes: result };
  }

  // getFinishingProcessDetails(processSlug)
  getFinishingProcessDetails(processSlug) {
    const processes = this._getFromStorage('finishing_processes', []);
    const process = processes.find(function (p) { return p.slug === processSlug; });
    if (!process) {
      return null;
    }
    const self = this;

    const supported_material_labels = Array.isArray(process.supported_materials)
      ? process.supported_materials.map(function (code) { return self._materialCodeToLabel(code); })
      : [];
    const industry_labels = Array.isArray(process.industries_served)
      ? process.industries_served.map(function (code) { return self._industryCodeToLabel(code); })
      : [];

    const breadcrumbs = [
      { label: 'Capabilities', destination: 'capabilities_overview' },
      { label: 'Surface Finishing', destination: 'capabilities_surface_finishing' }
    ];

    const related = processes.filter(function (p) { return p.id !== process.id; }).slice(0, 3).map(function (p) {
      return {
        process_id: p.id,
        name: p.name,
        slug: p.slug,
        min_order_quantity: typeof p.min_order_quantity === 'number' ? p.min_order_quantity : 0
      };
    });

    return {
      process_id: process.id,
      name: process.name,
      slug: process.slug,
      description: process.description || '',
      capabilities_overview: process.capabilities_overview || '',
      supported_materials: Array.isArray(process.supported_materials) ? process.supported_materials.slice() : [],
      supported_material_labels: supported_material_labels,
      industries_served: Array.isArray(process.industries_served) ? process.industries_served.slice() : [],
      industry_labels: industry_labels,
      min_order_quantity: typeof process.min_order_quantity === 'number' ? process.min_order_quantity : 0,
      breadcrumbs: breadcrumbs,
      related_processes: related
    };
  }

  // requestFinishingConsultation(finishingProcessId, message)
  requestFinishingConsultation(finishingProcessId, message) {
    const processes = this._getFromStorage('finishing_processes', []);
    const process = processes.find(function (p) { return p.id === finishingProcessId; });
    if (!process) {
      return { success: false, consultation_request_id: null, status: 'open', message: 'Finishing process not found.' };
    }

    let reqs = this._getFromStorage('consultation_requests', []);
    const record = {
      id: this._generateId('consult'),
      finishing_process_id: finishingProcessId,
      message: message || '',
      status: 'open',
      created_at: this._nowISO()
    };
    reqs.push(record);
    this._saveToStorage('consultation_requests', reqs);

    return {
      success: true,
      consultation_request_id: record.id,
      status: record.status,
      message: 'Consultation request submitted.'
    };
  }

  // getInjectionMoldingSupplierFilterOptions()
  getInjectionMoldingSupplierFilterOptions() {
    const suppliers = this._getFromStorage('injection_molding_suppliers', []);

    const regionSet = {};
    let minOTD = null;
    let maxOTD = null;
    let minCap = null;
    let maxCap = null;

    for (let i = 0; i < suppliers.length; i++) {
      const s = suppliers[i];
      if (s.region) {
        regionSet[s.region] = true;
      }
      const otd = typeof s.on_time_delivery_rate === 'number' ? s.on_time_delivery_rate : null;
      const cap = typeof s.monthly_capacity_units === 'number' ? s.monthly_capacity_units : null;
      if (otd !== null) {
        if (minOTD === null || otd < minOTD) minOTD = otd;
        if (maxOTD === null || otd > maxOTD) maxOTD = otd;
      }
      if (cap !== null) {
        if (minCap === null || cap < minCap) minCap = cap;
        if (maxCap === null || cap > maxCap) maxCap = cap;
      }
    }

    const region_options = Object.keys(regionSet).map((code) => ({ code: code, label: this._regionCodeToLabel(code) }));

    const on_time_delivery_rate_range = {
      min: minOTD !== null ? minOTD : 0,
      max: maxOTD !== null ? maxOTD : 0
    };

    const monthly_capacity_range = {
      min: minCap !== null ? minCap : 0,
      max: maxCap !== null ? maxCap : 0
    };

    const sort_options = [
      { value: 'on_time_delivery_high_to_low', label: 'On-time delivery - High to Low' },
      { value: 'on_time_delivery_low_to_high', label: 'On-time delivery - Low to High' }
    ];

    return {
      region_options: region_options,
      on_time_delivery_rate_range: on_time_delivery_rate_range,
      monthly_capacity_range: monthly_capacity_range,
      sort_options: sort_options
    };
  }

  // listInjectionMoldingSuppliers(filters, page, page_size, sort)
  listInjectionMoldingSuppliers(filters, page, page_size, sort) {
    filters = filters || {};
    page = typeof page === 'number' && page > 0 ? page : 1;
    page_size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;

    let suppliers = this._getFromStorage('injection_molding_suppliers', []);

    if (filters.region) {
      suppliers = suppliers.filter(function (s) { return s.region === filters.region; });
    }
    if (typeof filters.min_on_time_delivery_rate === 'number') {
      suppliers = suppliers.filter(function (s) {
        const otd = typeof s.on_time_delivery_rate === 'number' ? s.on_time_delivery_rate : 0;
        return otd >= filters.min_on_time_delivery_rate;
      });
    }
    if (typeof filters.min_monthly_capacity_units === 'number') {
      suppliers = suppliers.filter(function (s) {
        const cap = typeof s.monthly_capacity_units === 'number' ? s.monthly_capacity_units : 0;
        return cap >= filters.min_monthly_capacity_units;
      });
    }

    if (sort === 'on_time_delivery_high_to_low') {
      suppliers.sort(function (a, b) {
        const ao = typeof a.on_time_delivery_rate === 'number' ? a.on_time_delivery_rate : 0;
        const bo = typeof b.on_time_delivery_rate === 'number' ? b.on_time_delivery_rate : 0;
        return bo - ao;
      });
    } else if (sort === 'on_time_delivery_low_to_high') {
      suppliers.sort(function (a, b) {
        const ao = typeof a.on_time_delivery_rate === 'number' ? a.on_time_delivery_rate : 0;
        const bo = typeof b.on_time_delivery_rate === 'number' ? b.on_time_delivery_rate : 0;
        return ao - bo;
      });
    } else {
      suppliers.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
    }

    const total_count = suppliers.length;
    const total_pages = Math.max(1, Math.ceil(total_count / page_size));
    if (page > total_pages) page = total_pages;
    const start = (page - 1) * page_size;
    const pageItems = suppliers.slice(start, start + page_size);

    const self = this;
    const resultSuppliers = pageItems.map(function (s) {
      const certLabels = Array.isArray(s.certifications)
        ? s.certifications.map(function (code) { return self._certificationCodeToLabel(code); })
        : [];
      return {
        supplier_id: s.id,
        name: s.name,
        region: s.region,
        region_label: self._regionCodeToLabel(s.region),
        on_time_delivery_rate: typeof s.on_time_delivery_rate === 'number' ? s.on_time_delivery_rate : 0,
        monthly_capacity_units: typeof s.monthly_capacity_units === 'number' ? s.monthly_capacity_units : 0,
        certification_labels: certLabels,
        description_snippet: self._truncate(s.description || '', 200)
      };
    });

    return {
      suppliers: resultSuppliers,
      pagination: {
        page: page,
        page_size: page_size,
        total_count: total_count,
        total_pages: total_pages
      }
    };
  }

  // getSupplierComparisonView(supplierIds)
  getSupplierComparisonView(supplierIds) {
    supplierIds = Array.isArray(supplierIds) ? supplierIds : [];
    const suppliers = this._getFromStorage('injection_molding_suppliers', []);
    const self = this;

    const resultSuppliers = supplierIds.map(function (id) {
      const s = suppliers.find(function (s0) { return s0.id === id; });
      if (!s) return null;
      const certLabels = Array.isArray(s.certifications)
        ? s.certifications.map(function (code) { return self._certificationCodeToLabel(code); })
        : [];
      return {
        supplier_id: s.id,
        name: s.name,
        region_label: self._regionCodeToLabel(s.region),
        on_time_delivery_rate: typeof s.on_time_delivery_rate === 'number' ? s.on_time_delivery_rate : 0,
        monthly_capacity_units: typeof s.monthly_capacity_units === 'number' ? s.monthly_capacity_units : 0,
        certification_labels: certLabels,
        description: s.description || ''
      };
    }).filter(function (s) { return s !== null; });

    return { suppliers: resultSuppliers };
  }

  // saveSupplierComparison(name, supplierIds)
  saveSupplierComparison(name, supplierIds) {
    supplierIds = Array.isArray(supplierIds) ? supplierIds : [];
    if (!name || supplierIds.length === 0) {
      return { success: false, comparison_id: null, message: 'Name and at least one supplier are required.' };
    }

    const comparison = this._saveSupplierComparisonEntities(name, supplierIds);
    return { success: true, comparison_id: comparison.id, message: 'Supplier comparison saved.' };
  }

  // getSavedSupplierComparison(comparisonId)
  getSavedSupplierComparison(comparisonId) {
    const comparisons = this._getFromStorage('supplier_comparisons', []);
    const comparison = comparisons.find(function (c) { return c.id === comparisonId; });
    if (!comparison) {
      return null;
    }

    const items = this._getFromStorage('supplier_comparison_items', []).filter(function (it) { return it.comparison_id === comparisonId; });
    items.sort(function (a, b) {
      const ap = typeof a.position === 'number' ? a.position : 0;
      const bp = typeof b.position === 'number' ? b.position : 0;
      return ap - bp;
    });

    const suppliersData = this._getFromStorage('injection_molding_suppliers', []);
    const self = this;

    const suppliers = items.map(function (it) {
      const s = suppliersData.find(function (s0) { return s0.id === it.supplier_id; });
      if (!s) return null;
      const certLabels = Array.isArray(s.certifications)
        ? s.certifications.map(function (code) { return self._certificationCodeToLabel(code); })
        : [];
      return {
        supplier_id: s.id,
        name: s.name,
        region_label: self._regionCodeToLabel(s.region),
        on_time_delivery_rate: typeof s.on_time_delivery_rate === 'number' ? s.on_time_delivery_rate : 0,
        monthly_capacity_units: typeof s.monthly_capacity_units === 'number' ? s.monthly_capacity_units : 0,
        certification_labels: certLabels
      };
    }).filter(function (s) { return s !== null; });

    return {
      comparison_id: comparison.id,
      name: comparison.name,
      created_at: comparison.created_at,
      suppliers: suppliers
    };
  }

  // getServicesOverview()
  getServicesOverview() {
    const services = this._getFromStorage('service_offerings', []);
    const self = this;

    const result = services.map(function (s) {
      return {
        service_id: s.id,
        name: s.name,
        slug: s.slug,
        description_snippet: self._truncate(s.description || '', 200),
        primary_cta_label: 'View service',
        primary_cta_destination: 'service_' + s.slug
      };
    });

    return { services: result };
  }

  // getVirtualPlantTourPageData()
  getVirtualPlantTourPageData() {
    const services = this._getFromStorage('service_offerings', []);
    const service = services.find(function (s) { return s.slug === 'virtual_plant_tours'; }) || null;

    const serviceObj = service
      ? {
          service_id: service.id,
          name: service.name,
          description: service.description || '',
          agenda_highlights: []
        }
      : { service_id: null, name: '', description: '', agenda_highlights: [] };

    const available_time_slots = [
      { value: '09_00_10_00', label: '09:0010:00' },
      { value: '10_00_11_00', label: '10:00 11:00' },
      { value: '13_00_14_00', label: '13:00 14:00' },
      { value: '15_00_16_00', label: '15:00 16:00' }
    ];

    const available_topics = [
      { code: 'lean_manufacturing', label: 'Lean manufacturing', description: 'Focus on waste reduction and flow.' },
      { code: 'quality_control', label: 'Quality control', description: 'Inspection, SPC, and traceability.' }
    ];

    const scheduling_constraints = {
      min_notice_days: 2,
      max_days_ahead: 365
    };

    return {
      service: serviceObj,
      available_time_slots: available_time_slots,
      available_topics: available_topics,
      scheduling_constraints: scheduling_constraints
    };
  }

  // scheduleVirtualPlantTour(tour_date, time_slot, topics, name, email)
  scheduleVirtualPlantTour(tour_date, time_slot, topics, name, email) {
    topics = Array.isArray(topics) ? topics : [];

    const serviceId = this._resolveVirtualPlantTourService();
    if (!serviceId) {
      return {
        success: false,
        booking_id: null,
        status: 'pending',
        message: 'Virtual Plant Tours service is not configured.',
        summary: null
      };
    }

    const allowedSlots = ['09_00_10_00', '10_00_11_00', '13_00_14_00', '15_00_16_00'];
    if (allowedSlots.indexOf(time_slot) === -1) {
      return {
        success: false,
        booking_id: null,
        status: 'pending',
        message: 'Invalid time slot.',
        summary: null
      };
    }

    const d = new Date(tour_date);
    if (isNaN(d.getTime())) {
      return {
        success: false,
        booking_id: null,
        status: 'pending',
        message: 'Invalid tour date.',
        summary: null
      };
    }

    const bookingDateISO = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();

    let bookings = this._getFromStorage('virtual_plant_tour_bookings', []);
    const record = {
      id: this._generateId('tour'),
      service_id: serviceId,
      tour_date: bookingDateISO,
      time_slot: time_slot,
      topics: topics.slice(),
      name: name,
      email: email,
      status: 'pending',
      created_at: this._nowISO()
    };
    bookings.push(record);
    this._saveToStorage('virtual_plant_tour_bookings', bookings);

    const slotLabels = {
      '09_00_10_00': '09:00 10:00',
      '10_00_11_00': '10:00 11:00',
      '13_00_14_00': '13:00 14:00',
      '15_00_16_00': '15:00 16:00'
    };

    const topics_labels = topics.map((code) => this._topicCodeToLabel(code));

    return {
      success: true,
      booking_id: record.id,
      status: record.status,
      message: 'Virtual plant tour scheduled (pending confirmation).',
      summary: {
        tour_date: tour_date,
        time_slot_label: slotLabels[time_slot] || '',
        topics_labels: topics_labels
      }
    };
  }

  // submitNewsletterSubscription(email, areas_of_interest, receive_monthly_technical_newsletter)
  submitNewsletterSubscription(email, areas_of_interest, receive_monthly_technical_newsletter) {
    areas_of_interest = Array.isArray(areas_of_interest) ? areas_of_interest : [];
    const receiveMonthly = !!receive_monthly_technical_newsletter;

    let subs = this._getFromStorage('newsletter_subscriptions', []);
    let sub = subs.find(function (s) { return s.email === email; });
    let created = false;

    if (!sub) {
      sub = {
        id: this._generateId('sub'),
        email: email,
        areas_of_interest: areas_of_interest.slice(),
        receive_monthly_technical_newsletter: receiveMonthly,
        status: 'active',
        created_at: this._nowISO()
      };
      subs.push(sub);
      created = true;
    } else {
      sub.areas_of_interest = areas_of_interest.slice();
      sub.receive_monthly_technical_newsletter = receiveMonthly;
      sub.status = 'active';
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription_id: sub.id,
      status: sub.status,
      message: created ? 'Subscription created.' : 'Subscription updated.'
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