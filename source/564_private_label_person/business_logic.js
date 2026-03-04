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
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------------
  // Initialization & Utilities
  // ---------------------------

  _initStorage() {
    const keys = [
      // Core catalog data
      'products',
      'case_studies',
      // Library & favorites
      'library',
      'library_items',
      'favorites',
      'favorite_items',
      // Sample kit
      'sample_kits',
      'sample_kit_items',
      // Hotel project
      'hotel_projects',
      'hotel_project_items',
      // Quotes
      'quotes',
      'quote_items',
      // Consultations & account
      'consultation_requests',
      'account_profiles',
      // Contact forms (not in data model but used by submitContactForm)
      'contact_forms'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
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

  // ---------------------------
  // Static metadata helpers
  // ---------------------------

  _getCategoryLabel(categoryId) {
    const map = {
      hair_care_bases: 'Hair Care Bases',
      face_care: 'Face Care',
      bath_body: 'Bath & Body',
      packaging: 'Packaging',
      turnkey_skincare: 'Turnkey Skincare Collections',
      turnkey_mens_grooming: "Men's Grooming Turnkey Bundles"
    };
    return map[categoryId] || categoryId || '';
  }

  _getSubcategoryLabel(subcategory) {
    const map = {
      bottles: 'Bottles',
      jars: 'Jars',
      bar_soap: 'Bar Soap',
      amenity_size: 'Amenity-size Products',
      other: 'Other'
    };
    return map[subcategory] || '';
  }

  _getProductTypeLabel(productType) {
    const map = {
      shampoo_base: 'Shampoo Base',
      cleanser: 'Cleanser',
      serum: 'Serum',
      moisturizer: 'Moisturizer',
      body_lotion: 'Body Lotion',
      shampoo: 'Shampoo',
      body_wash_shower_gel: 'Body Wash / Shower Gel',
      bar_soap: 'Bar Soap',
      turnkey_bundle: 'Turnkey Bundle',
      other: 'Other'
    };
    return map[productType] || '';
  }

  _getCurrencySymbol(currency) {
    const map = { usd: '$' };
    return map[currency] || '$';
  }

  _getLineTypeForProduct(product) {
    if (!product) return 'formulation';
    if (product.is_bundle) return 'bundle';
    if (product.category_id === 'packaging') return 'packaging';
    return 'formulation';
  }

  // ---------------------------
  // Private helpers (per spec)
  // ---------------------------

  _getOrCreateFavoritesList() {
    let lists = this._getFromStorage('favorites');
    if (!Array.isArray(lists)) lists = [];
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('favlist'),
        created_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('favorites', lists);
    }
    return list;
  }

  _getOrCreateLibrary() {
    let libs = this._getFromStorage('library');
    if (!Array.isArray(libs)) libs = [];
    let lib = libs[0] || null;
    if (!lib) {
      lib = {
        id: this._generateId('library'),
        created_at: this._nowIso()
      };
      libs.push(lib);
      this._saveToStorage('library', libs);
    }
    return lib;
  }

  _getOrCreateSampleKit() {
    let kits = this._getFromStorage('sample_kits');
    if (!Array.isArray(kits)) kits = [];
    let kit = kits.find((k) => k.status === 'draft') || kits[0] || null;
    if (!kit) {
      kit = {
        id: this._generateId('samplekit'),
        name: '',
        status: 'draft',
        created_at: this._nowIso(),
        submitted_at: null
      };
      kits.push(kit);
      this._saveToStorage('sample_kits', kits);
    }
    return kit;
  }

  _getOrCreateHotelProject() {
    let projects = this._getFromStorage('hotel_projects');
    if (!Array.isArray(projects)) projects = [];
    let project = projects.find((p) => p.status === 'draft') || projects[0] || null;
    if (!project) {
      project = {
        id: this._generateId('hotelproj'),
        name: '',
        status: 'draft',
        created_at: this._nowIso(),
        submitted_at: null,
        total_quantity_units: 0
      };
      projects.push(project);
      this._saveToStorage('hotel_projects', projects);
    }
    return project;
  }

  _getOrCreateQuote() {
    let quotes = this._getFromStorage('quotes');
    if (!Array.isArray(quotes)) quotes = [];
    let quote = quotes.find((q) => q.status === 'draft') || quotes[0] || null;
    if (!quote) {
      quote = {
        id: this._generateId('quote'),
        name: '',
        status: 'draft',
        total_quantity_units: 0,
        created_at: this._nowIso(),
        submitted_at: null
      };
      quotes.push(quote);
      this._saveToStorage('quotes', quotes);
    }
    return quote;
  }

  _updateQuoteTotals(quoteId) {
    if (!quoteId) return;
    let quotes = this._getFromStorage('quotes');
    let items = this._getFromStorage('quote_items');
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return;
    const total = items
      .filter((i) => i.quote_id === quoteId)
      .reduce((sum, i) => sum + (Number(i.quantity_units) || 0), 0);
    quote.total_quantity_units = total;
    this._saveToStorage('quotes', quotes);
  }

  _updateHotelProjectTotals(projectId) {
    if (!projectId) return;
    let projects = this._getFromStorage('hotel_projects');
    let items = this._getFromStorage('hotel_project_items');
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const total = items
      .filter((i) => i.hotel_project_id === projectId)
      .reduce((sum, i) => sum + (Number(i.quantity_units) || 0), 0);
    project.total_quantity_units = total;
    this._saveToStorage('hotel_projects', projects);
  }

  _getOrCreateAccountProfile() {
    let profiles = this._getFromStorage('account_profiles');
    if (!Array.isArray(profiles)) profiles = [];
    let profile = profiles[0] || null;
    if (!profile) {
      profile = {
        id: this._generateId('acct'),
        full_name: '',
        email: '',
        password: '',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      profiles.push(profile);
      this._saveToStorage('account_profiles', profiles);
    }
    return profile;
  }

  _validateProductFilters(filters) {
    const f = filters && typeof filters === 'object' ? filters : {};

    const normalizeNumber = (val) => {
      if (val === null || val === undefined || val === '') return undefined;
      const n = Number(val);
      return Number.isNaN(n) ? undefined : n;
    };

    const result = {
      product_types: Array.isArray(f.product_types) ? f.product_types.slice() : undefined,
      claims: {
        sulfate_free_sls_free:
          f.claims && typeof f.claims.sulfate_free_sls_free === 'boolean'
            ? f.claims.sulfate_free_sls_free
            : undefined,
        fragrance_free:
          f.claims && typeof f.claims.fragrance_free === 'boolean'
            ? f.claims.fragrance_free
            : undefined,
        palm_free:
          f.claims && typeof f.claims.palm_free === 'boolean' ? f.claims.palm_free : undefined
      },
      certifications: {
        natural_organic_certified:
          f.certifications && typeof f.certifications.natural_organic_certified === 'boolean'
            ? f.certifications.natural_organic_certified
            : undefined
      },
      sustainability: {
        plastic_free_packaging:
          f.sustainability && typeof f.sustainability.plastic_free_packaging === 'boolean'
            ? f.sustainability.plastic_free_packaging
            : undefined,
        recycled_paper_carton:
          f.sustainability && typeof f.sustainability.recycled_paper_carton === 'boolean'
            ? f.sustainability.recycled_paper_carton
            : undefined
      },
      size_volume_ml_min: normalizeNumber(f.size_volume_ml_min),
      size_volume_ml_max: normalizeNumber(f.size_volume_ml_max),
      moq_units_max: normalizeNumber(f.moq_units_max),
      unit_price_max: normalizeNumber(f.unit_price_max),
      lead_time_weeks_max: normalizeNumber(f.lead_time_weeks_max),
      number_of_skus_min: normalizeNumber(f.number_of_skus_min),
      amenity_size:
        f.amenity_size === true || f.amenity_size === false ? f.amenity_size : undefined,
      minimum_order_volume_units_max: normalizeNumber(f.minimum_order_volume_units_max)
    };

    return result;
  }

  // ---------------------------
  // Interface implementations
  // ---------------------------

  // getHomeFeaturedCategories
  getHomeFeaturedCategories() {
    return [
      {
        category_id: 'hair_care_bases',
        category_name: 'Hair Care Bases',
        category_type: 'products',
        description: 'Customizable shampoo and conditioner bases for private label hair care.',
        primary_cta_label: 'Explore hair care bases'
      },
      {
        category_id: 'face_care',
        category_name: 'Face Care',
        category_type: 'products',
        description: 'Serums, moisturizers, and treatments ready for your brand.',
        primary_cta_label: 'Browse face care formulations'
      },
      {
        category_id: 'packaging',
        category_name: 'Packaging',
        category_type: 'products',
        description: 'Bottles, jars, and sustainable packaging options.',
        primary_cta_label: 'View packaging catalog'
      },
      {
        category_id: 'turnkey_skincare',
        category_name: 'Turnkey Skincare',
        category_type: 'turnkey_collections',
        description: 'Pre-configured skincare lines with proven performance.',
        primary_cta_label: 'See skincare collections'
      },
      {
        category_id: 'turnkey_mens_grooming',
        category_name: "Men’s Grooming Bundles",
        category_type: 'turnkey_collections',
        description: 'Multi-SKU grooming programs tailored for men’s brands.',
        primary_cta_label: 'View men’s grooming bundles'
      },
      {
        category_id: 'hospitality_hotels',
        category_name: 'Hospitality & Hotels',
        category_type: 'industries',
        description: 'Amenity-size products and programs for hotels and resorts.',
        primary_cta_label: 'Explore hospitality solutions'
      }
    ];
  }

  // getHomeFeaturedProducts(category_id, limit)
  getHomeFeaturedProducts(category_id, limit) {
    const allProducts = this._getFromStorage('products');
    const active = allProducts.filter((p) => p && p.status === 'active');
    let filtered = active;
    if (category_id) {
      filtered = active.filter((p) => p.category_id === category_id);
    }
    // Sort by created_at desc (most recent first)
    filtered.sort((a, b) => {
      const ad = a.created_at ? Date.parse(a.created_at) : 0;
      const bd = b.created_at ? Date.parse(b.created_at) : 0;
      return bd - ad;
    });
    const lim = typeof limit === 'number' && limit > 0 ? limit : 6;
    return filtered.slice(0, lim);
  }

  // getWorkspaceSummary
  getWorkspaceSummary() {
    const profiles = this._getFromStorage('account_profiles');
    const hasAccount = Array.isArray(profiles) && profiles.length > 0;

    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.status === 'draft') || quotes[0] || null;
    const quoteItems = this._getFromStorage('quote_items');
    const quoteItemsCount = quote
      ? quoteItems.filter((i) => i.quote_id === quote.id).length
      : 0;

    const sampleKits = this._getFromStorage('sample_kits');
    const sampleKit = sampleKits.find((k) => k.status === 'draft') || sampleKits[0] || null;
    const sampleKitItems = this._getFromStorage('sample_kit_items');
    const sampleItemsCount = sampleKit
      ? sampleKitItems.filter((i) => i.sample_kit_id === sampleKit.id).length
      : 0;

    const hotelProjects = this._getFromStorage('hotel_projects');
    const hotelProject =
      hotelProjects.find((p) => p.status === 'draft') || hotelProjects[0] || null;
    const hotelProjectItems = this._getFromStorage('hotel_project_items');
    const hotelItemsCount = hotelProject
      ? hotelProjectItems.filter((i) => i.hotel_project_id === hotelProject.id).length
      : 0;

    const favoritesLists = this._getFromStorage('favorites');
    const favoritesList = favoritesLists[0] || null;
    const favoriteItems = this._getFromStorage('favorite_items');
    const favoritesCount = favoritesList
      ? favoriteItems.filter((i) => i.favorites_list_id === favoritesList.id).length
      : 0;

    const libraries = this._getFromStorage('library');
    const library = libraries[0] || null;
    const libraryItems = this._getFromStorage('library_items');
    const libraryItemsCount = library
      ? libraryItems.filter((i) => i.library_id === library.id).length
      : 0;

    return {
      has_account_profile: hasAccount,
      quote: {
        exists: !!quote,
        status: quote ? quote.status : '',
        items_count: quoteItemsCount,
        total_quantity_units: quote ? quote.total_quantity_units || 0 : 0
      },
      sample_kit: {
        exists: !!sampleKit,
        status: sampleKit ? sampleKit.status : '',
        items_count: sampleItemsCount
      },
      hotel_project: {
        exists: !!hotelProject,
        status: hotelProject ? hotelProject.status : '',
        items_count: hotelItemsCount,
        total_quantity_units: hotelProject ? hotelProject.total_quantity_units || 0 : 0
      },
      favorites_count: favoritesCount,
      library_items_count: libraryItemsCount
    };
  }

  // getProductCategories
  getProductCategories() {
    return [
      {
        category_id: 'hair_care_bases',
        category_name: 'Hair Care Bases',
        description: 'Bases for shampoos, conditioners, and treatments.',
        is_turnkey_collection: false
      },
      {
        category_id: 'face_care',
        category_name: 'Face Care',
        description: 'Serums, moisturizers, and facial treatments.',
        is_turnkey_collection: false
      },
      {
        category_id: 'bath_body',
        category_name: 'Bath & Body',
        description: 'Body washes, bar soaps, and lotions.',
        is_turnkey_collection: false
      },
      {
        category_id: 'packaging',
        category_name: 'Packaging',
        description: 'Primary and secondary packaging options.',
        is_turnkey_collection: false
      },
      {
        category_id: 'turnkey_skincare',
        category_name: 'Turnkey Skincare Collections',
        description: 'Ready-to-launch skincare lines.',
        is_turnkey_collection: true
      },
      {
        category_id: 'turnkey_mens_grooming',
        category_name: "Men’s Grooming Turnkey Bundles",
        description: 'Multi-SKU turnkey grooming programs for men.',
        is_turnkey_collection: true
      }
    ];
  }

  // getCatalogFilterOptions(category_id, subcategory)
  getCatalogFilterOptions(category_id, subcategory) {
    const products = this._getFromStorage('products').filter((p) => {
      if (!p || p.status !== 'active') return false;
      if (category_id && p.category_id !== category_id) return false;
      if (subcategory && p.subcategory !== subcategory) return false;
      return true;
    });

    const getRange = (field) => {
      let min = null;
      let max = null;
      products.forEach((p) => {
        const val = typeof p[field] === 'number' ? p[field] : null;
        if (val === null) return;
        if (min === null || val < min) min = val;
        if (max === null || val > max) max = val;
      });
      return {
        min: min === null ? 0 : min,
        max: max === null ? 0 : max
      };
    };

    const sizeOptionsMap = {};
    products.forEach((p) => {
      if (typeof p.size_volume_ml === 'number') {
        sizeOptionsMap[p.size_volume_ml] = true;
      }
    });
    const size_volume_ml_options = Object.keys(sizeOptionsMap)
      .map((v) => Number(v))
      .sort((a, b) => a - b)
      .map((v) => ({ value_ml: v, label: v + ' ml' }));

    const productTypeSet = {};
    products.forEach((p) => {
      if (p.product_type) productTypeSet[p.product_type] = true;
    });
    const product_types = Object.keys(productTypeSet).map((value) => ({
      value,
      label: this._getProductTypeLabel(value)
    }));

    const result = {
      category_label: this._getCategoryLabel(category_id),
      subcategory_label: this._getSubcategoryLabel(subcategory),
      product_types,
      claims: {
        sulfate_free_sls_free: 'Sulfate-free / SLS-free',
        fragrance_free: 'Fragrance-free',
        palm_free: 'Palm-free'
      },
      certifications: {
        natural_organic_certified: 'Natural / Organic Certified'
      },
      sustainability_options: {
        plastic_free_packaging: 'Plastic-free packaging',
        recycled_paper_carton: 'Recycled paper carton'
      },
      size_volume_ml_options,
      moq_units_range: getRange('moq_units'),
      unit_price_range: getRange('unit_price'),
      lead_time_weeks_range: getRange('lead_time_weeks'),
      number_of_skus_options: [
        {
          min_skus: 4,
          label: '4+ SKUs'
        }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'most_recent', label: 'Most recent' },
        { value: 'lead_time_low_to_high', label: 'Lead time: Low to High' }
      ]
    };

    return result;
  }

  // getCatalogProducts(category_id, subcategory, filters, sort_by, page, page_size)
  getCatalogProducts(category_id, subcategory, filters, sort_by, page, page_size) {
    const all = this._getFromStorage('products');
    const normalizedFilters = this._validateProductFilters(filters);

    let products = all.filter((p) => {
      if (!p || p.status !== 'active') return false;
      if (category_id && p.category_id !== category_id) return false;
      if (subcategory && p.subcategory !== subcategory) return false;

      // Product types
      if (
        normalizedFilters.product_types &&
        normalizedFilters.product_types.length > 0 &&
        (!p.product_type || !normalizedFilters.product_types.includes(p.product_type))
      ) {
        return false;
      }

      // Claims
      if (
        normalizedFilters.claims &&
        typeof normalizedFilters.claims.sulfate_free_sls_free === 'boolean'
      ) {
        if (!!p.sulfate_free_sls_free !== normalizedFilters.claims.sulfate_free_sls_free) {
          return false;
        }
      }
      if (
        normalizedFilters.claims &&
        typeof normalizedFilters.claims.fragrance_free === 'boolean'
      ) {
        if (!!p.fragrance_free !== normalizedFilters.claims.fragrance_free) {
          return false;
        }
      }
      if (normalizedFilters.claims && typeof normalizedFilters.claims.palm_free === 'boolean') {
        if (!!p.palm_free !== normalizedFilters.claims.palm_free) {
          return false;
        }
      }

      // Certifications
      if (
        normalizedFilters.certifications &&
        typeof normalizedFilters.certifications.natural_organic_certified === 'boolean'
      ) {
        if (
          !!p.natural_organic_certified !==
          normalizedFilters.certifications.natural_organic_certified
        ) {
          return false;
        }
      }

      // Sustainability
      if (
        normalizedFilters.sustainability &&
        typeof normalizedFilters.sustainability.plastic_free_packaging === 'boolean'
      ) {
        if (
          !!p.plastic_free_packaging !==
          normalizedFilters.sustainability.plastic_free_packaging
        ) {
          return false;
        }
      }
      if (
        normalizedFilters.sustainability &&
        typeof normalizedFilters.sustainability.recycled_paper_carton === 'boolean'
      ) {
        if (
          !!p.recycled_paper_carton !==
          normalizedFilters.sustainability.recycled_paper_carton
        ) {
          return false;
        }
      }

      // Size / volume
      if (typeof normalizedFilters.size_volume_ml_min === 'number') {
        const val = typeof p.size_volume_ml === 'number' ? p.size_volume_ml : null;
        if (val === null || val < normalizedFilters.size_volume_ml_min) return false;
      }
      if (typeof normalizedFilters.size_volume_ml_max === 'number') {
        const val = typeof p.size_volume_ml === 'number' ? p.size_volume_ml : null;
        if (val === null || val > normalizedFilters.size_volume_ml_max) return false;
      }

      // MOQ
      if (typeof normalizedFilters.moq_units_max === 'number') {
        const val = typeof p.moq_units === 'number' ? p.moq_units : null;
        if (val === null || val > normalizedFilters.moq_units_max) return false;
      }

      // Unit price
      if (typeof normalizedFilters.unit_price_max === 'number') {
        const val = typeof p.unit_price === 'number' ? p.unit_price : null;
        if (val === null || val > normalizedFilters.unit_price_max) return false;
      }

      // Lead time
      if (typeof normalizedFilters.lead_time_weeks_max === 'number') {
        const val = typeof p.lead_time_weeks === 'number' ? p.lead_time_weeks : null;
        if (val === null || val > normalizedFilters.lead_time_weeks_max) return false;
      }

      // Number of SKUs (for bundles)
      if (typeof normalizedFilters.number_of_skus_min === 'number') {
        const val = typeof p.number_of_skus === 'number' ? p.number_of_skus : null;
        if (val === null || val < normalizedFilters.number_of_skus_min) return false;
      }

      // Amenity size
      if (typeof normalizedFilters.amenity_size === 'boolean') {
        if (!!p.amenity_size !== normalizedFilters.amenity_size) return false;
      }

      // Minimum order volume units (for bundles)
      if (typeof normalizedFilters.minimum_order_volume_units_max === 'number') {
        const val =
          typeof p.minimum_order_volume_units === 'number'
            ? p.minimum_order_volume_units
            : null;
        if (val === null || val > normalizedFilters.minimum_order_volume_units_max) return false;
      }

      return true;
    });

    // Sorting
    const sortBy = sort_by || 'price_low_to_high';
    products.sort((a, b) => {
      if (sortBy === 'price_low_to_high') {
        return (a.unit_price || 0) - (b.unit_price || 0);
      }
      if (sortBy === 'price_high_to_low') {
        return (b.unit_price || 0) - (a.unit_price || 0);
      }
      if (sortBy === 'lead_time_low_to_high') {
        return (a.lead_time_weeks || 0) - (b.lead_time_weeks || 0);
      }
      if (sortBy === 'most_recent') {
        const ad = a.created_at ? Date.parse(a.created_at) : 0;
        const bd = b.created_at ? Date.parse(b.created_at) : 0;
        return bd - ad;
      }
      return 0;
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;

    return {
      category_label: this._getCategoryLabel(category_id),
      subcategory_label: this._getSubcategoryLabel(subcategory),
      products: products.slice(start, end),
      total_results: products.length,
      page: pg,
      page_size: ps
    };
  }

  // getProductComparison(product_ids)
  getProductComparison(product_ids) {
    const ids = Array.isArray(product_ids) ? product_ids : [];
    const all = this._getFromStorage('products');
    const products = ids
      .map((id) => all.find((p) => p.id === id))
      .filter((p) => !!p);

    // Instrumentation for task completion tracking
    try {
      const validProducts = products.filter(
        (p) =>
          p &&
          p.status === 'active' &&
          p.category_id === 'packaging' &&
          p.subcategory === 'bottles' &&
          Number(p.size_volume_ml) === 250
      );
      if (validProducts.length >= 2 && validProducts.length === products.length) {
        const payload = {
          product_ids: validProducts.map((p) => p.id),
          compared_at: this._nowIso()
        };
        localStorage.setItem('task2_comparedProductIds', JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const comparison_fields = [
      { field: 'size_volume_ml', label: 'Volume (ml)' },
      { field: 'moq_units', label: 'MOQ (units)' },
      { field: 'unit_price', label: 'Unit price' },
      { field: 'lead_time_weeks', label: 'Lead time (weeks)' }
    ];

    return { products, comparison_fields };
  }

  // getProductDetails(product_id)
  getProductDetails(product_id) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === product_id) || null;

    if (!product) {
      return {
        product: null,
        category_label: '',
        subcategory_label: '',
        product_type_label: '',
        currency_symbol: '$',
        is_in_favorites: false,
        in_quote_quantity_units: 0,
        in_sample_kit_quantity_units: 0,
        in_hotel_project_quantity_units: 0
      };
    }

    const favoritesLists = this._getFromStorage('favorites');
    const favoritesList = favoritesLists[0] || null;
    const favoriteItems = this._getFromStorage('favorite_items');
    const isInFavorites = favoritesList
      ? favoriteItems.some(
          (i) => i.favorites_list_id === favoritesList.id && i.product_id === product.id
        )
      : false;

    const quoteItems = this._getFromStorage('quote_items');
    const inQuoteQty = quoteItems
      .filter((i) => i.product_id === product.id)
      .reduce((sum, i) => sum + (Number(i.quantity_units) || 0), 0);

    const sampleKitItems = this._getFromStorage('sample_kit_items');
    const inSampleQty = sampleKitItems
      .filter((i) => i.product_id === product.id)
      .reduce((sum, i) => sum + (Number(i.quantity_units) || 0), 0);

    const hotelProjectItems = this._getFromStorage('hotel_project_items');
    const inHotelQty = hotelProjectItems
      .filter((i) => i.product_id === product.id)
      .reduce((sum, i) => sum + (Number(i.quantity_units) || 0), 0);

    return {
      product,
      category_label: this._getCategoryLabel(product.category_id),
      subcategory_label: this._getSubcategoryLabel(product.subcategory),
      product_type_label: this._getProductTypeLabel(product.product_type),
      currency_symbol: this._getCurrencySymbol(product.currency),
      is_in_favorites: isInFavorites,
      in_quote_quantity_units: inQuoteQty,
      in_sample_kit_quantity_units: inSampleQty,
      in_hotel_project_quantity_units: inHotelQty
    };
  }

  // addProductToQuote(product_id, quantity_units)
  addProductToQuote(product_id, quantity_units) {
    const qty = typeof quantity_units === 'number' && quantity_units > 0 ? quantity_units : 1;

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === product_id && p.status === 'active');
    if (!product) {
      return {
        success: false,
        message: 'Product not found or inactive',
        quote_id: null,
        quote_status: '',
        total_quantity_units: 0
      };
    }

    const quote = this._getOrCreateQuote();
    let quoteItems = this._getFromStorage('quote_items');

    const item = {
      id: this._generateId('qitem'),
      quote_id: quote.id,
      product_id: product.id,
      quantity_units: qty,
      unit_price: product.unit_price,
      line_type: this._getLineTypeForProduct(product),
      added_at: this._nowIso()
    };

    quoteItems.push(item);
    this._saveToStorage('quote_items', quoteItems);
    this._updateQuoteTotals(quote.id);

    const quotes = this._getFromStorage('quotes');
    const updatedQuote = quotes.find((q) => q.id === quote.id) || quote;

    return {
      success: true,
      message: 'Product added to quote',
      quote_id: updatedQuote.id,
      quote_status: updatedQuote.status,
      total_quantity_units: updatedQuote.total_quantity_units || 0
    };
  }

  // getActiveQuote()
  getActiveQuote() {
    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.status === 'draft') || quotes[0] || null;
    const quoteItems = this._getFromStorage('quote_items');
    const products = this._getFromStorage('products');

    if (!quote) {
      return { quote: null, items: [] };
    }

    const items = quoteItems
      .filter((i) => i.quote_id === quote.id)
      .map((i) => {
        const product = products.find((p) => p.id === i.product_id) || null;
        return {
          quote_item_id: i.id,
          product_id: i.product_id,
          product_name: product ? product.name : '',
          product_short_name: product ? product.short_name || product.name : '',
          category_label: product ? this._getCategoryLabel(product.category_id) : '',
          line_type: i.line_type || this._getLineTypeForProduct(product),
          quantity_units: i.quantity_units,
          unit_price: i.unit_price,
          moq_units: product ? product.moq_units : null,
          // Foreign key resolution
          product: product
        };
      });

    return {
      quote: {
        id: quote.id,
        name: quote.name,
        status: quote.status,
        total_quantity_units: quote.total_quantity_units || 0,
        created_at: quote.created_at,
        submitted_at: quote.submitted_at
      },
      items
    };
  }

  // updateQuoteItemQuantity(quote_item_id, quantity_units)
  updateQuoteItemQuantity(quote_item_id, quantity_units) {
    const qty = Number(quantity_units);
    let quoteItems = this._getFromStorage('quote_items');
    const item = quoteItems.find((i) => i.id === quote_item_id);
    if (!item) {
      return { success: false, quote_id: null, total_quantity_units: 0 };
    }
    item.quantity_units = qty;
    this._saveToStorage('quote_items', quoteItems);
    this._updateQuoteTotals(item.quote_id);

    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.id === item.quote_id);
    return {
      success: true,
      quote_id: item.quote_id,
      total_quantity_units: quote ? quote.total_quantity_units || 0 : 0
    };
  }

  // removeQuoteItem(quote_item_id)
  removeQuoteItem(quote_item_id) {
    let quoteItems = this._getFromStorage('quote_items');
    const item = quoteItems.find((i) => i.id === quote_item_id);
    if (!item) {
      return { success: false, quote_id: null, total_quantity_units: 0 };
    }
    quoteItems = quoteItems.filter((i) => i.id !== quote_item_id);
    this._saveToStorage('quote_items', quoteItems);
    this._updateQuoteTotals(item.quote_id);

    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.id === item.quote_id);
    return {
      success: true,
      quote_id: item.quote_id,
      total_quantity_units: quote ? quote.total_quantity_units || 0 : 0
    };
  }

  // setQuoteName(name)
  setQuoteName(name) {
    const quote = this._getOrCreateQuote();
    let quotes = this._getFromStorage('quotes');
    const existing = quotes.find((q) => q.id === quote.id);
    if (existing) {
      existing.name = name;
      this._saveToStorage('quotes', quotes);
      return { quote_id: existing.id, name: existing.name, status: existing.status };
    }
    quote.name = name;
    quotes.push(quote);
    this._saveToStorage('quotes', quotes);
    return { quote_id: quote.id, name: quote.name, status: quote.status };
  }

  // saveQuoteAsDraft()
  saveQuoteAsDraft() {
    const quote = this._getOrCreateQuote();
    let quotes = this._getFromStorage('quotes');
    const existing = quotes.find((q) => q.id === quote.id);
    if (existing) {
      existing.status = 'draft';
      existing.submitted_at = null;
      this._saveToStorage('quotes', quotes);
      return {
        quote_id: existing.id,
        status: existing.status,
        message: 'Quote saved as draft'
      };
    }
    quote.status = 'draft';
    quote.submitted_at = null;
    quotes.push(quote);
    this._saveToStorage('quotes', quotes);
    return {
      quote_id: quote.id,
      status: quote.status,
      message: 'Quote saved as draft'
    };
  }

  // submitQuote()
  submitQuote() {
    const quotes = this._getFromStorage('quotes');
    const quote = quotes.find((q) => q.status === 'draft') || quotes[0] || null;
    if (!quote) {
      return {
        quote_id: null,
        status: '',
        submitted_at: null,
        message: 'No active quote to submit'
      };
    }
    const quoteItems = this._getFromStorage('quote_items');
    const hasItems = quoteItems.some((i) => i.quote_id === quote.id);
    if (!hasItems) {
      return {
        quote_id: quote.id,
        status: quote.status,
        submitted_at: quote.submitted_at,
        message: 'Quote has no items'
      };
    }
    quote.status = 'submitted';
    quote.submitted_at = this._nowIso();
    this._saveToStorage('quotes', quotes);
    return {
      quote_id: quote.id,
      status: quote.status,
      submitted_at: quote.submitted_at,
      message: 'Quote submitted'
    };
  }

  // addProductToFavorites(product_id)
  addProductToFavorites(product_id) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === product_id);
    if (!product) {
      return { success: false, favorites_count: 0, message: 'Product not found' };
    }

    const list = this._getOrCreateFavoritesList();
    let items = this._getFromStorage('favorite_items');

    const exists = items.some(
      (i) => i.favorites_list_id === list.id && i.product_id === product_id
    );
    if (!exists) {
      items.push({
        id: this._generateId('favitem'),
        favorites_list_id: list.id,
        product_id,
        saved_at: this._nowIso()
      });
      this._saveToStorage('favorite_items', items);
    }

    const count = items.filter((i) => i.favorites_list_id === list.id).length;
    return {
      success: true,
      favorites_count: count,
      message: exists ? 'Already in favorites' : 'Added to favorites'
    };
  }

  // removeProductFromFavorites(product_id)
  removeProductFromFavorites(product_id) {
    const lists = this._getFromStorage('favorites');
    const list = lists[0] || null;
    let items = this._getFromStorage('favorite_items');
    if (!list) {
      return { success: false, favorites_count: 0 };
    }
    items = items.filter(
      (i) => !(i.favorites_list_id === list.id && i.product_id === product_id)
    );
    this._saveToStorage('favorite_items', items);
    const count = items.filter((i) => i.favorites_list_id === list.id).length;
    return { success: true, favorites_count: count };
  }

  // getFavoriteProducts()
  getFavoriteProducts() {
    const lists = this._getFromStorage('favorites');
    const list = lists[0] || null;
    if (!list) return [];

    const items = this._getFromStorage('favorite_items').filter(
      (i) => i.favorites_list_id === list.id
    );
    const products = this._getFromStorage('products');

    return items.map((i) => {
      const product = products.find((p) => p.id === i.product_id) || null;
      return {
        product_id: i.product_id,
        product_name: product ? product.name : '',
        short_name: product ? product.short_name || product.name : '',
        category_label: product ? this._getCategoryLabel(product.category_id) : '',
        unit_price: product ? product.unit_price : null,
        moq_units: product ? product.moq_units : null,
        is_bundle: product ? !!product.is_bundle : false,
        // Foreign key resolution
        product: product
      };
    });
  }

  // addProductToSampleKit(product_id, quantity_units)
  addProductToSampleKit(product_id, quantity_units) {
    const qty = typeof quantity_units === 'number' && quantity_units > 0 ? quantity_units : 1;
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === product_id && p.status === 'active');
    if (!product) {
      return { sample_kit_id: null, items_count: 0, status: 'draft' };
    }

    const kit = this._getOrCreateSampleKit();
    let items = this._getFromStorage('sample_kit_items');

    items.push({
      id: this._generateId('skitem'),
      sample_kit_id: kit.id,
      product_id,
      quantity_units: qty,
      added_at: this._nowIso()
    });

    this._saveToStorage('sample_kit_items', items);
    const count = items.filter((i) => i.sample_kit_id === kit.id).length;
    return {
      sample_kit_id: kit.id,
      items_count: count,
      status: kit.status
    };
  }

  // getSampleKit()
  getSampleKit() {
    const kits = this._getFromStorage('sample_kits');
    const kit = kits.find((k) => k.status === 'draft') || kits[0] || null;
    const itemsAll = this._getFromStorage('sample_kit_items');
    const products = this._getFromStorage('products');

    if (!kit) {
      return {
        sample_kit_id: null,
        name: '',
        status: 'draft',
        created_at: null,
        submitted_at: null,
        items: []
      };
    }

    const items = itemsAll
      .filter((i) => i.sample_kit_id === kit.id)
      .map((i) => {
        const product = products.find((p) => p.id === i.product_id) || null;
        return {
          sample_kit_item_id: i.id,
          product_id: i.product_id,
          product_name: product ? product.name : '',
          product_short_name: product ? product.short_name || product.name : '',
          category_label: product ? this._getCategoryLabel(product.category_id) : '',
          product_type: product ? product.product_type : '',
          quantity_units: i.quantity_units,
          unit_price: product ? product.unit_price : null,
          // Foreign key resolution
          product: product
        };
      });

    return {
      sample_kit_id: kit.id,
      name: kit.name || '',
      status: kit.status,
      created_at: kit.created_at,
      submitted_at: kit.submitted_at,
      items
    };
  }

  // updateSampleKitItemQuantity(sample_kit_item_id, quantity_units)
  updateSampleKitItemQuantity(sample_kit_item_id, quantity_units) {
    const qty = Number(quantity_units);
    let items = this._getFromStorage('sample_kit_items');
    const item = items.find((i) => i.id === sample_kit_item_id);
    if (!item) {
      return { sample_kit_id: null, items_count: 0 };
    }
    item.quantity_units = qty;
    this._saveToStorage('sample_kit_items', items);
    const count = items.filter((i) => i.sample_kit_id === item.sample_kit_id).length;
    return { sample_kit_id: item.sample_kit_id, items_count: count };
  }

  // removeSampleKitItem(sample_kit_item_id)
  removeSampleKitItem(sample_kit_item_id) {
    let items = this._getFromStorage('sample_kit_items');
    const item = items.find((i) => i.id === sample_kit_item_id);
    if (!item) {
      return { sample_kit_id: null, items_count: 0 };
    }
    items = items.filter((i) => i.id !== sample_kit_item_id);
    this._saveToStorage('sample_kit_items', items);
    const count = items.filter((i) => i.sample_kit_id === item.sample_kit_id).length;
    return { sample_kit_id: item.sample_kit_id, items_count: count };
  }

  // submitSampleKit(name)
  submitSampleKit(name) {
    const kit = this._getOrCreateSampleKit();
    let kits = this._getFromStorage('sample_kits');
    const existing = kits.find((k) => k.id === kit.id) || kit;
    if (name) existing.name = name;
    existing.status = 'submitted';
    existing.submitted_at = this._nowIso();
    if (!kits.find((k) => k.id === existing.id)) kits.push(existing);
    this._saveToStorage('sample_kits', kits);
    return {
      sample_kit_id: existing.id,
      status: existing.status,
      submitted_at: existing.submitted_at,
      message: 'Sample kit submitted'
    };
  }

  // addProductToHotelProject(product_id, quantity_units)
  addProductToHotelProject(product_id, quantity_units) {
    const qty = typeof quantity_units === 'number' && quantity_units >= 0 ? quantity_units : 0;
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === product_id && p.status === 'active');
    if (!product) {
      return { hotel_project_id: null, items_count: 0, status: 'draft' };
    }

    const project = this._getOrCreateHotelProject();
    let items = this._getFromStorage('hotel_project_items');

    items.push({
      id: this._generateId('hpitem'),
      hotel_project_id: project.id,
      product_id,
      quantity_units: qty,
      added_at: this._nowIso()
    });

    this._saveToStorage('hotel_project_items', items);
    const count = items.filter((i) => i.hotel_project_id === project.id).length;
    this._updateHotelProjectTotals(project.id);
    const projects = this._getFromStorage('hotel_projects');
    const updated = projects.find((p) => p.id === project.id) || project;

    return {
      hotel_project_id: updated.id,
      items_count: count,
      status: updated.status
    };
  }

  // getHotelProject()
  getHotelProject() {
    const projects = this._getFromStorage('hotel_projects');
    const project = projects.find((p) => p.status === 'draft') || projects[0] || null;
    const itemsAll = this._getFromStorage('hotel_project_items');
    const products = this._getFromStorage('products');

    if (!project) {
      return {
        hotel_project_id: null,
        name: '',
        status: 'draft',
        created_at: null,
        submitted_at: null,
        total_quantity_units: 0,
        items: []
      };
    }

    const items = itemsAll
      .filter((i) => i.hotel_project_id === project.id)
      .map((i) => {
        const product = products.find((p) => p.id === i.product_id) || null;
        return {
          hotel_project_item_id: i.id,
          product_id: i.product_id,
          product_name: product ? product.name : '',
          product_type: product ? product.product_type : '',
          size_volume_ml: product ? product.size_volume_ml : null,
          quantity_units: i.quantity_units,
          // Foreign key resolution
          product: product
        };
      });

    return {
      hotel_project_id: project.id,
      name: project.name || '',
      status: project.status,
      created_at: project.created_at,
      submitted_at: project.submitted_at,
      total_quantity_units: project.total_quantity_units || 0,
      items
    };
  }

  // updateHotelProjectItemQuantity(hotel_project_item_id, quantity_units)
  updateHotelProjectItemQuantity(hotel_project_item_id, quantity_units) {
    const qty = Number(quantity_units);
    let items = this._getFromStorage('hotel_project_items');
    const item = items.find((i) => i.id === hotel_project_item_id);
    if (!item) {
      return { hotel_project_id: null, total_quantity_units: 0 };
    }
    item.quantity_units = qty;
    this._saveToStorage('hotel_project_items', items);
    this._updateHotelProjectTotals(item.hotel_project_id);
    const projects = this._getFromStorage('hotel_projects');
    const project = projects.find((p) => p.id === item.hotel_project_id);
    return {
      hotel_project_id: item.hotel_project_id,
      total_quantity_units: project ? project.total_quantity_units || 0 : 0
    };
  }

  // removeHotelProjectItem(hotel_project_item_id)
  removeHotelProjectItem(hotel_project_item_id) {
    let items = this._getFromStorage('hotel_project_items');
    const item = items.find((i) => i.id === hotel_project_item_id);
    if (!item) {
      return { hotel_project_id: null, items_count: 0, total_quantity_units: 0 };
    }
    items = items.filter((i) => i.id !== hotel_project_item_id);
    this._saveToStorage('hotel_project_items', items);
    this._updateHotelProjectTotals(item.hotel_project_id);
    const projects = this._getFromStorage('hotel_projects');
    const project = projects.find((p) => p.id === item.hotel_project_id);
    const count = items.filter((i) => i.hotel_project_id === item.hotel_project_id).length;
    return {
      hotel_project_id: item.hotel_project_id,
      items_count: count,
      total_quantity_units: project ? project.total_quantity_units || 0 : 0
    };
  }

  // submitHotelProject(name)
  submitHotelProject(name) {
    const project = this._getOrCreateHotelProject();
    let projects = this._getFromStorage('hotel_projects');
    const existing = projects.find((p) => p.id === project.id) || project;
    if (name) existing.name = name;
    existing.status = 'submitted';
    existing.submitted_at = this._nowIso();
    if (!projects.find((p) => p.id === existing.id)) projects.push(existing);
    this._saveToStorage('hotel_projects', projects);
    return {
      hotel_project_id: existing.id,
      status: existing.status,
      submitted_at: existing.submitted_at,
      message: 'Hotel project submitted'
    };
  }

  // getHospitalityOverview()
  getHospitalityOverview() {
    const projects = this._getFromStorage('hotel_projects');
    const project = projects.find((p) => p.status === 'draft') || projects[0] || null;
    const itemsAll = this._getFromStorage('hotel_project_items');

    const itemsCount = project
      ? itemsAll.filter((i) => i.hotel_project_id === project.id).length
      : 0;
    const totalQty = project ? project.total_quantity_units || 0 : 0;

    return {
      headline: 'Hospitality & Hotels Amenity Programs',
      intro_text:
        'Support your guest experience with amenity-size shampoos, body washes, and skincare tailored for hotels and resorts.',
      supported_product_types: ['shampoo', 'body_wash_shower_gel', 'body_lotion'],
      amenity_size_ranges: [
        { min_ml: 10, max_ml: 30, label: '10–30 ml' },
        { min_ml: 30, max_ml: 50, label: '30–50 ml' },
        { min_ml: 50, max_ml: 100, label: '50–100 ml' }
      ],
      hotel_project_summary: {
        exists: !!project,
        items_count: itemsCount,
        total_quantity_units: totalQty
      }
    };
  }

  // getCaseStudyFilterOptions()
  getCaseStudyFilterOptions() {
    return {
      categories: [
        { value: 'hair_care', label: 'Hair Care' },
        { value: 'face_care', label: 'Face Care' },
        { value: 'bath_body', label: 'Bath & Body' },
        { value: 'mens_grooming', label: "Men’s Grooming" },
        { value: 'hospitality_hotels', label: 'Hospitality & Hotels' },
        { value: 'other', label: 'Other' }
      ],
      time_to_launch_ranges: [
        { id: '0_4', min_months: 0, max_months: 4, label: '0–4 months' },
        { id: '4_8', min_months: 4, max_months: 8, label: '4–8 months' },
        { id: '8_12', min_months: 8, max_months: 12, label: '8–12 months' }
      ],
      sort_options: [{ value: 'most_recent', label: 'Most recent' }]
    };
  }

  // getCaseStudies(category, time_to_launch_min_months, time_to_launch_max_months, sort_by, page, page_size)
  getCaseStudies(
    category,
    time_to_launch_min_months,
    time_to_launch_max_months,
    sort_by,
    page,
    page_size
  ) {
    let studies = this._getFromStorage('case_studies');

    if (category) {
      studies = studies.filter((c) => c.category === category);
    }

    const min =
      typeof time_to_launch_min_months === 'number' ? time_to_launch_min_months : undefined;
    const max =
      typeof time_to_launch_max_months === 'number' ? time_to_launch_max_months : undefined;

    if (typeof min === 'number') {
      studies = studies.filter((c) => {
        const val = typeof c.time_to_launch_months === 'number' ? c.time_to_launch_months : null;
        return val !== null && val >= min;
      });
    }

    if (typeof max === 'number') {
      studies = studies.filter((c) => {
        const val = typeof c.time_to_launch_months === 'number' ? c.time_to_launch_months : null;
        return val !== null && val <= max;
      });
    }

    const sortBy = sort_by || 'most_recent';
    if (sortBy === 'most_recent') {
      studies.sort((a, b) => {
        const ad = a.published_at ? Date.parse(a.published_at) : 0;
        const bd = b.published_at ? Date.parse(b.published_at) : 0;
        return bd - ad;
      });
    }

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 10;
    const start = (pg - 1) * ps;
    const end = start + ps;

    return {
      case_studies: studies.slice(start, end),
      total_results: studies.length,
      page: pg,
      page_size: ps
    };
  }

  // getCaseStudyDetails(case_study_id)
  getCaseStudyDetails(case_study_id) {
    const studies = this._getFromStorage('case_studies');
    const caseStudy = studies.find((c) => c.id === case_study_id) || null;

    const libraries = this._getFromStorage('library');
    const library = libraries[0] || null;
    const libraryItems = this._getFromStorage('library_items');

    const isInLibrary = library
      ? libraryItems.some(
          (i) => i.library_id === library.id && i.case_study_id === case_study_id
        )
      : false;

    return {
      case_study: caseStudy,
      is_in_library: isInLibrary
    };
  }

  // saveCaseStudyToLibrary(case_study_id)
  saveCaseStudyToLibrary(case_study_id) {
    const studies = this._getFromStorage('case_studies');
    const caseStudy = studies.find((c) => c.id === case_study_id);
    if (!caseStudy) {
      return { success: false, library_item_id: null, total_saved: 0 };
    }

    const library = this._getOrCreateLibrary();
    let items = this._getFromStorage('library_items');

    let existing = items.find(
      (i) => i.library_id === library.id && i.case_study_id === case_study_id
    );
    if (!existing) {
      existing = {
        id: this._generateId('libitem'),
        library_id: library.id,
        case_study_id,
        saved_at: this._nowIso()
      };
      items.push(existing);
      this._saveToStorage('library_items', items);
    }

    const total = items.filter((i) => i.library_id === library.id).length;
    return { success: true, library_item_id: existing.id, total_saved: total };
  }

  // getLibraryItems()
  getLibraryItems() {
    const libraries = this._getFromStorage('library');
    const library = libraries[0] || null;
    if (!library) return [];

    const items = this._getFromStorage('library_items').filter(
      (i) => i.library_id === library.id
    );
    const studies = this._getFromStorage('case_studies');

    return items.map((i) => {
      const cs = studies.find((c) => c.id === i.case_study_id) || null;
      return {
        case_study_id: i.case_study_id,
        title: cs ? cs.title : '',
        category_label: cs ? this._getCategoryLabel(cs.category) || cs.category : '',
        time_to_launch_months: cs ? cs.time_to_launch_months : null,
        saved_at: i.saved_at,
        // Foreign key resolution
        case_study: cs
      };
    });
  }

  // removeCaseStudyFromLibrary(case_study_id)
  removeCaseStudyFromLibrary(case_study_id) {
    const libraries = this._getFromStorage('library');
    const library = libraries[0] || null;
    if (!library) {
      return { success: false, total_saved: 0 };
    }
    let items = this._getFromStorage('library_items');
    items = items.filter(
      (i) => !(i.library_id === library.id && i.case_study_id === case_study_id)
    );
    this._saveToStorage('library_items', items);
    const total = items.filter((i) => i.library_id === library.id).length;
    return { success: true, total_saved: total };
  }

  // getCustomManufacturingOverview()
  getCustomManufacturingOverview() {
    return {
      headline: 'Custom Manufacturing for Personal Care Brands',
      intro_text:
        'From concept to scale, we manufacture custom formulations for body care, skincare, hair care, and more.',
      supported_product_categories: [
        'body_lotion',
        'hair_care',
        'face_care',
        'bath_body',
        'mens_grooming',
        'other'
      ],
      typical_volume_range_units: {
        min: 5000,
        max: 500000
      },
      process_steps: [
        'Discovery & briefing',
        'R&D and formulation',
        'Stability & compatibility testing',
        'Scale-up & pilot batches',
        'Full-scale production & filling'
      ],
      time_slot_labels: {
        nine_to_ten_am: '9:00–10:00 AM',
        ten_to_eleven_am: '10:00–11:00 AM',
        eleven_to_twelve_pm: '11:00 AM–12:00 PM',
        one_to_two_pm: '1:00–2:00 PM',
        two_to_three_pm: '2:00–3:00 PM'
      }
    };
  }

  // createConsultationRequest(full_name, email, estimated_annual_volume_units, primary_product_interest, preferred_date, time_slot)
  createConsultationRequest(
    full_name,
    email,
    estimated_annual_volume_units,
    primary_product_interest,
    preferred_date,
    time_slot
  ) {
    const requests = this._getFromStorage('consultation_requests');

    const request = {
      id: this._generateId('consult'),
      full_name,
      email,
      estimated_annual_volume_units: Number(estimated_annual_volume_units) || 0,
      primary_product_interest,
      preferred_date: preferred_date,
      time_slot,
      status: 'submitted',
      created_at: this._nowIso()
    };

    requests.push(request);
    this._saveToStorage('consultation_requests', requests);

    return {
      consultation_request_id: request.id,
      status: request.status,
      message: 'Consultation request submitted'
    };
  }

  // getAccountProfile()
  getAccountProfile() {
    const profiles = this._getFromStorage('account_profiles');
    const profile = profiles[0] || null;
    if (!profile) {
      return {
        exists: false,
        full_name: '',
        email: '',
        created_at: null
      };
    }
    return {
      exists: true,
      full_name: profile.full_name,
      email: profile.email,
      created_at: profile.created_at
    };
  }

  // createAccountProfile(full_name, email, password)
  createAccountProfile(full_name, email, password) {
    let profiles = this._getFromStorage('account_profiles');
    if (!Array.isArray(profiles)) profiles = [];
    let profile = profiles[0] || null;
    if (!profile) {
      profile = {
        id: this._generateId('acct'),
        full_name,
        email,
        password,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      profiles.push(profile);
    } else {
      profile.full_name = full_name;
      profile.email = email;
      profile.password = password;
      profile.updated_at = this._nowIso();
    }
    this._saveToStorage('account_profiles', profiles);
    return {
      success: true,
      account_profile_id: profile.id,
      full_name: profile.full_name,
      email: profile.email
    };
  }

  // updateAccountProfile(full_name, email, password)
  updateAccountProfile(full_name, email, password) {
    let profiles = this._getFromStorage('account_profiles');
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return { success: false, full_name: '', email: '' };
    }
    const profile = profiles[0];
    if (typeof full_name === 'string' && full_name) profile.full_name = full_name;
    if (typeof email === 'string' && email) profile.email = email;
    if (typeof password === 'string' && password) profile.password = password;
    profile.updated_at = this._nowIso();
    this._saveToStorage('account_profiles', profiles);
    return { success: true, full_name: profile.full_name, email: profile.email };
  }

  // getUserWorkspaceOverview()
  getUserWorkspaceOverview() {
    const summary = this.getWorkspaceSummary();
    return {
      workspace_summary: {
        quote: {
          exists: summary.quote.exists,
          status: summary.quote.status,
          total_quantity_units: summary.quote.total_quantity_units
        },
        sample_kit: {
          exists: summary.sample_kit.exists,
          status: summary.sample_kit.status,
          items_count: summary.sample_kit.items_count
        },
        hotel_project: {
          exists: summary.hotel_project.exists,
          status: summary.hotel_project.status,
          items_count: summary.hotel_project.items_count
        },
        favorites_count: summary.favorites_count,
        library_items_count: summary.library_items_count
      }
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      headline: 'Private Label & Custom Manufacturing for Personal Care Brands',
      story:
        'We are a dedicated personal care manufacturer specializing in private label, turnkey collections, and custom-formulated products for brands worldwide.',
      manufacturing_capabilities: [
        'Liquid and semi-solid filling (shampoos, lotions, serums)',
        'Hot-pour processing for balms and solid formats',
        'Small-batch pilot runs and full-scale production',
        'Secondary packaging and kitting'
      ],
      specializations: [
        'Hair care bases and custom shampoos',
        'Natural and organic skincare formulations',
        'Men’s grooming routines and kits',
        'Hospitality amenity programs'
      ],
      quality_and_compliance: [
        'cGMP-compliant manufacturing',
        'Batch-level traceability and documentation',
        'Stability and compatibility testing support'
      ],
      sustainability_commitments: [
        'Support for palm-free and sulfate-free formulations',
        'Options for plastic-free and recycled paper packaging',
        'Continuous improvement on waste reduction and energy efficiency'
      ],
      certifications: [
        {
          code: 'iso_9001',
          name: 'ISO 9001',
          description: 'Quality management system certification.'
        },
        {
          code: 'organic_partner',
          name: 'Organic Manufacturing Partner',
          description: 'Experience working with certified natural/organic standards.'
        }
      ]
    };
  }

  // getContactInfo()
  getContactInfo() {
    return {
      phone: '+1 (555) 123-4567',
      email: 'info@examplemanufacturer.com',
      address: '1234 Manufacturing Way, Suite 200, Care City, CA 90000, USA',
      office_hours: 'Monday–Friday, 9:00 AM–5:00 PM (Pacific Time)'
    };
  }

  // submitContactForm(full_name, email, company, topic, message)
  submitContactForm(full_name, email, company, topic, message) {
    const forms = this._getFromStorage('contact_forms');
    const ticket = {
      id: this._generateId('ticket'),
      full_name,
      email,
      company: company || '',
      topic: topic || '',
      message,
      created_at: this._nowIso()
    };
    forms.push(ticket);
    this._saveToStorage('contact_forms', forms);
    return {
      success: true,
      ticket_id: ticket.id,
      message: 'Your inquiry has been received'
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
