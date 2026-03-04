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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tables = {
      // Example legacy keys from scaffold (kept harmless)
      users: [],
      products: [],
      product_categories: [],
      documents: [],
      quote_carts: [],
      quote_cart_items: [],
      quote_requests: [],
      quote_request_items: [],
      compare_lists: [],
      industries: [],
      solution_offerings: [],
      project_configurations: [],
      case_studies: [],
      faq_items: [],
      support_requests: [],
      offices: [],
      newsletter_subscriptions: [],
      departments: [],
      job_postings: [],
      job_applications: []
    };

    Object.keys(tables).forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(tables[key]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('current_quote_cart_id')) {
      localStorage.setItem('current_quote_cart_id', '');
    }
    if (!localStorage.getItem('current_compare_list_id')) {
      localStorage.setItem('current_compare_list_id', '');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
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

  // Simple mapping helpers for labels
  _categoryLabel(code) {
    const map = {
      indoor_led_displays: 'Indoor LED Displays',
      outdoor_led_displays: 'Outdoor LED Displays',
      control_room_displays: 'Control Room Displays',
      rental_staging: 'Rental & Staging',
      scoreboards: 'Scoreboards'
    };
    return map[code] || code;
  }

  _industryLabel(code) {
    const map = {
      retail_qsr: 'Retail & QSR',
      corporate: 'Corporate',
      transportation: 'Transportation',
      sports_venues: 'Sports Venues',
      control_rooms: 'Control Rooms'
    };
    return map[code] || code;
  }

  _newsletterRoleLabel(value) {
    const map = {
      installer_integrator: 'Installer / Integrator',
      consultant_designer: 'Consultant / Designer',
      end_customer: 'End customer',
      distributor_reseller: 'Distributor / Reseller',
      other: 'Other'
    };
    return map[value] || value;
  }

  _countryLabel(value) {
    const map = {
      united_states: 'United States',
      germany: 'Germany',
      france: 'France',
      united_kingdom: 'United Kingdom',
      china: 'China'
    };
    return map[value] || value;
  }

  _faqCategoryLabel(code) {
    const map = {
      indoor_led_displays: 'Indoor LED Displays',
      outdoor_led_displays: 'Outdoor LED Displays',
      control_systems: 'Control systems',
      general: 'General',
      warranty: 'Warranty'
    };
    return map[code] || code;
  }

  // -------------------------
  // Core helpers required by spec
  // -------------------------

  // Internal helper to retrieve the current quote cart for the single user, creating one if none exists.
  _getOrCreateQuoteCart() {
    let carts = this._getFromStorage('quote_carts', []);
    let currentId = localStorage.getItem('current_quote_cart_id') || '';

    let cart = null;
    if (currentId) {
      cart = carts.find((c) => c.id === currentId) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('quotecart'),
        itemIds: [],
        createdAt: this._now(),
        updatedAt: this._now()
      };
      carts.push(cart);
      this._saveToStorage('quote_carts', carts);
      localStorage.setItem('current_quote_cart_id', cart.id);
    }

    return cart;
  }

  // Internal helper to retrieve the current comparison list for the single user, creating one if needed.
  _getOrCreateCompareList() {
    let lists = this._getFromStorage('compare_lists', []);
    let currentId = localStorage.getItem('current_compare_list_id') || '';

    let list = null;
    if (currentId) {
      list = lists.find((l) => l.id === currentId) || null;
    }

    if (!list) {
      list = {
        id: this._generateId('compare'),
        productIds: [],
        createdAt: this._now(),
        updatedAt: this._now()
      };
      lists.push(list);
      this._saveToStorage('compare_lists', lists);
      localStorage.setItem('current_compare_list_id', list.id);
    }

    return list;
  }

  // Internal helper to calculate item totals and overall estimated total price for the quote cart.
  _calculateCartTotals(cart) {
    if (!cart) {
      return {
        items: [],
        estimatedTotalPrice: 0,
        currency: 'usd'
      };
    }
    const products = this._getFromStorage('products', []);
    let quoteItems = this._getFromStorage('quote_cart_items', []);

    const itemsForCart = quoteItems.filter((item) => item.cartId === cart.id);
    let estimatedTotalPrice = 0;
    let currency = null;

    const summaryItems = itemsForCart.map((item) => {
      const product = products.find((p) => p.id === item.productId) || null;
      const unitPrice = product && typeof product.price === 'number' ? product.price : 0;
      const itemCurrency = product && product.currency ? product.currency : 'usd';
      const totalPrice = unitPrice * item.quantity;

      // Update stored item prices
      item.unitPrice = unitPrice;
      item.totalPrice = totalPrice;

      estimatedTotalPrice += totalPrice;
      if (!currency) {
        currency = itemCurrency;
      }

      return {
        productId: item.productId,
        name: product ? product.name : '',
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        currency: itemCurrency,
        // Foreign key resolution
        product: product
      };
    });

    this._saveToStorage('quote_cart_items', quoteItems);

    return {
      items: summaryItems,
      estimatedTotalPrice: estimatedTotalPrice,
      currency: currency || 'usd'
    };
  }

  // Internal helper to compute estimated total price for a project configuration based on selected product and quantity.
  _calculateProjectEstimate(product, quantity) {
    const unitPrice = product && typeof product.price === 'number' ? product.price : 0;
    return unitPrice * quantity;
  }

  // Internal helper to apply filter and sort parameters to the product dataset for listings.
  _filterAndSortProducts(products, filters, sortBy) {
    let result = Array.isArray(products) ? products.slice() : [];
    const f = filters || {};

    result = result.filter((p) => {
      if (f.installationLocation && p.installationLocation !== f.installationLocation) {
        return false;
      }
      if (f.categoryCode && p.categoryCode !== f.categoryCode) {
        return false;
      }
      if (typeof f.minPixelPitchMm === 'number' && p.pixelPitchMm < f.minPixelPitchMm) {
        return false;
      }
      if (typeof f.maxPixelPitchMm === 'number' && p.pixelPitchMm > f.maxPixelPitchMm) {
        return false;
      }
      if (typeof f.minBrightnessNits === 'number') {
        if (typeof p.brightnessNits !== 'number' || p.brightnessNits < f.minBrightnessNits) {
          return false;
        }
      }
      if (typeof f.maxBrightnessNits === 'number') {
        if (typeof p.brightnessNits !== 'number' || p.brightnessNits > f.maxBrightnessNits) {
          return false;
        }
      }
      if (Array.isArray(f.ipRatings) && f.ipRatings.length > 0) {
        if (!p.ipRating || !f.ipRatings.includes(p.ipRating)) {
          return false;
        }
      }
      if (Array.isArray(f.applicationTypes) && f.applicationTypes.length > 0) {
        const appTypes = Array.isArray(p.applicationTypes) ? p.applicationTypes : [];
        const hasOverlap = appTypes.some((t) => f.applicationTypes.includes(t));
        if (!hasOverlap) {
          return false;
        }
      }
      if (typeof f.isBillboardCapable === 'boolean') {
        if (!!p.isBillboardCapable !== f.isBillboardCapable) {
          return false;
        }
      }

      // Width filters: use recommended width range
      const minWidth = typeof f.minWidthMeters === 'number' ? f.minWidthMeters : null;
      const maxWidth = typeof f.maxWidthMeters === 'number' ? f.maxWidthMeters : null;
      const pMin = typeof p.minRecommendedWidthMeters === 'number' ? p.minRecommendedWidthMeters : null;
      const pMax = typeof p.maxRecommendedWidthMeters === 'number' ? p.maxRecommendedWidthMeters : null;

      if (minWidth !== null) {
        if (pMax !== null && pMax < minWidth && (pMin === null || pMin < minWidth)) {
          return false;
        }
        if (pMax === null && pMin !== null && pMin < minWidth) {
          return false;
        }
      }
      if (maxWidth !== null) {
        if (pMin !== null && pMin > maxWidth && (pMax === null || pMax > maxWidth)) {
          return false;
        }
        if (pMin === null && pMax !== null && pMax > maxWidth) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    const sort = sortBy || 'price_asc';
    result.sort((a, b) => {
      const get = (obj, key) => (typeof obj[key] === 'number' ? obj[key] : null);
      switch (sort) {
        case 'price_asc': {
          const av = get(a, 'price');
          const bv = get(b, 'price');
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return av - bv;
        }
        case 'price_desc': {
          const av = get(a, 'price');
          const bv = get(b, 'price');
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return bv - av;
        }
        case 'brightness_desc': {
          const av = get(a, 'brightnessNits');
          const bv = get(b, 'brightnessNits');
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return bv - av;
        }
        case 'brightness_asc': {
          const av = get(a, 'brightnessNits');
          const bv = get(b, 'brightnessNits');
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return av - bv;
        }
        case 'popularity_desc': {
          // No popularity metric stored; fall back to newest first (createdAt desc)
          const ad = a.createdAt || '';
          const bd = b.createdAt || '';
          if (!ad && !bd) return 0;
          if (!ad) return 1;
          if (!bd) return -1;
          return bd.localeCompare(ad);
        }
        default:
          return 0;
      }
    });

    return result;
  }

  // Internal helper to apply filters and sorting to case studies for the listing page.
  _filterAndSortCaseStudies(caseStudies, filters, sortBy) {
    let result = Array.isArray(caseStudies) ? caseStudies.slice() : [];
    const f = filters || {};

    result = result.filter((cs) => {
      if (f.industryCode && cs.industryCode !== f.industryCode) {
        return false;
      }
      if (typeof f.minDisplayWidthMeters === 'number') {
        if (typeof cs.displayWidthMeters !== 'number' || cs.displayWidthMeters < f.minDisplayWidthMeters) {
          return false;
        }
      }
      if (f.locationCountry && cs.locationCountry !== f.locationCountry) {
        return false;
      }
      if (f.locationCity && cs.locationCity !== f.locationCity) {
        return false;
      }
      return true;
    });

    const sort = sortBy || 'newest_first';
    result.sort((a, b) => {
      const ad = a.publishedAt || '';
      const bd = b.publishedAt || '';
      if (sort === 'oldest_first') {
        if (!ad && !bd) return 0;
        if (!ad) return -1;
        if (!bd) return 1;
        return ad.localeCompare(bd);
      }
      // newest_first default
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return bd.localeCompare(ad);
    });

    return result;
  }

  // Internal helper to apply department, location, and date filters to job postings.
  _filterAndSortJobPostings(jobPostings, departmentCode, city, country, postedDateRange) {
    let result = Array.isArray(jobPostings) ? jobPostings.slice() : [];

    result = result.filter((job) => {
      if (job.status !== 'open') {
        return false;
      }
      if (departmentCode && job.departmentCode !== departmentCode) {
        return false;
      }
      if (city && job.city !== city) {
        return false;
      }
      if (country && job.country !== country) {
        return false;
      }
      if (postedDateRange && postedDateRange !== 'any_time') {
        const postedAt = job.postedAt ? new Date(job.postedAt) : null;
        if (!postedAt || isNaN(postedAt.getTime())) {
          return false;
        }
        const now = new Date();
        let days = 0;
        if (postedDateRange === 'last_7_days') days = 7;
        else if (postedDateRange === 'last_30_days') days = 30;
        else if (postedDateRange === 'last_90_days') days = 90;
        if (days > 0) {
          const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          if (postedAt < cutoff) {
            return false;
          }
        }
      }
      return true;
    });

    // Sort newest first by postedAt
    result.sort((a, b) => {
      const ad = a.postedAt || '';
      const bd = b.postedAt || '';
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return bd.localeCompare(ad);
    });

    return result;
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // getHomepageContent
  getHomepageContent() {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const solutions = this._getFromStorage('solution_offerings', []);
    const industries = this._getFromStorage('industries', []);
    const caseStudies = this._getFromStorage('case_studies', []);

    // Featured products: pick up to 4 active products
    const activeProducts = products.filter((p) => p.status === 'active');
    const featuredProductsRaw = activeProducts.slice(0, 4);
    const featuredProducts = featuredProductsRaw.map((p) => {
      const category = categories.find((c) => c.code === p.categoryCode) || null;
      return {
        productId: p.id,
        name: p.name,
        categoryCode: p.categoryCode,
        categoryName: category ? category.name : this._categoryLabel(p.categoryCode),
        installationLocation: p.installationLocation,
        pixelPitchMm: p.pixelPitchMm,
        brightnessNits: p.brightnessNits,
        price: p.price,
        currency: p.currency,
        imageUrl: p.imageUrl,
        summary: p.summary,
        // Foreign key resolution
        product: p,
        category: category
      };
    });

    // Featured solutions: solutions that have configurator, or all if none flagged
    const featuredSolutionsSource = solutions.filter((s) => s.hasConfigurator) || solutions;
    const featuredSolutions = featuredSolutionsSource.slice(0, 4).map((s) => {
      const industry = industries.find((i) => i.code === s.industryCode) || null;
      return {
        solutionCode: s.code,
        name: s.name,
        industryCode: s.industryCode,
        industryName: industry ? industry.name : this._industryLabel(s.industryCode),
        description: s.description,
        hasConfigurator: s.hasConfigurator,
        // Foreign key resolution
        solution: s,
        industry: industry
      };
    });

    // Featured case studies: newest 4
    const sortedCaseStudies = caseStudies.slice().sort((a, b) => {
      const ad = a.publishedAt || '';
      const bd = b.publishedAt || '';
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return bd.localeCompare(ad);
    });

    const featuredCaseStudies = sortedCaseStudies.slice(0, 4).map((cs) => {
      const industry = industries.find((i) => i.code === cs.industryCode) || null;
      return {
        caseStudyId: cs.id,
        title: cs.title,
        industryName: industry ? industry.name : this._industryLabel(cs.industryCode),
        summary: cs.summary,
        mainImageUrl: cs.mainImageUrl,
        publishedAt: cs.publishedAt,
        // Foreign key resolution
        caseStudy: cs,
        industry: industry
      };
    });

    return {
      heroTitle: 'LED display solutions for every environment',
      heroSubtitle: 'High-performance indoor and outdoor LED walls for corporate, retail, transportation, and more.',
      valuePropositionHtml:
        '<p>As a leading LED display manufacturer, we deliver reliable, energy-efficient displays with world-class support.</p>',
      featuredProductCategories: categories
        .filter((c) => c.isActive)
        .sort((a, b) => {
          const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
          const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
          return sa - sb;
        })
        .map((c) => ({
          code: c.code,
          name: c.name,
          description: c.description,
          primaryImageUrl: c.primaryImageUrl,
          // Foreign key resolution not needed (no *Id field here)
        })),
      featuredProducts: featuredProducts,
      featuredSolutions: featuredSolutions,
      featuredCaseStudies: featuredCaseStudies
    };
  }

  // getNewsletterFormOptions
  getNewsletterFormOptions() {
    const roles = [
      'installer_integrator',
      'consultant_designer',
      'end_customer',
      'distributor_reseller',
      'other'
    ].map((value) => ({ value, label: this._newsletterRoleLabel(value) }));

    const interests = [
      { value: 'product_updates', label: 'Product updates' },
      { value: 'company_news', label: 'Company news' },
      { value: 'events', label: 'Events' },
      { value: 'promotions', label: 'Promotions' }
    ];

    const countries = ['united_states', 'germany', 'france', 'united_kingdom', 'china'].map((value) => ({
      value,
      label: this._countryLabel(value)
    }));

    return {
      roles,
      interests,
      countries
    };
  }

  // submitNewsletterSubscription
  submitNewsletterSubscription(email, role, interests, country, consentMarketing) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);

    const subscription = {
      id: this._generateId('newsletter'),
      email: email,
      role: role,
      interests: Array.isArray(interests) ? interests.slice() : [],
      country: country,
      consentMarketing: !!consentMarketing,
      sourcePage: 'footer_form',
      subscribedAt: this._now()
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscriptionId: subscription.id,
      message: 'Subscription saved.'
    };
  }

  // getProductCategoriesForNavigation
  getProductCategoriesForNavigation() {
    const categories = this._getFromStorage('product_categories', []);
    return categories
      .filter((c) => c.isActive)
      .sort((a, b) => {
        const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        return sa - sb;
      })
      .map((c) => ({
        code: c.code,
        name: c.name,
        description: c.description,
        sortOrder: c.sortOrder,
        isActive: c.isActive
      }));
  }

  // getProductFilterOptions(categoryCode, installationLocation)
  getProductFilterOptions(categoryCode, installationLocation) {
    const products = this._getFromStorage('products', []);

    const filtered = products.filter((p) => {
      if (categoryCode && p.categoryCode !== categoryCode) return false;
      if (installationLocation && p.installationLocation !== installationLocation) return false;
      return true;
    });

    const pixelPitches = filtered.map((p) => p.pixelPitchMm).filter((v) => typeof v === 'number');
    const widthsMin = filtered
      .map((p) => p.minRecommendedWidthMeters)
      .filter((v) => typeof v === 'number');
    const widthsMax = filtered
      .map((p) => p.maxRecommendedWidthMeters)
      .filter((v) => typeof v === 'number');
    const brightnessValues = filtered
      .map((p) => p.brightnessNits)
      .filter((v) => typeof v === 'number');

    const pixelPitchRange = {
      min: pixelPitches.length ? Math.min.apply(null, pixelPitches) : null,
      max: pixelPitches.length ? Math.max.apply(null, pixelPitches) : null
    };

    const widthMetersRange = {
      min: widthsMin.length ? Math.min.apply(null, widthsMin) : null,
      max: widthsMax.length ? Math.max.apply(null, widthsMax) : null
    };

    const brightnessNitsRange = {
      min: brightnessValues.length ? Math.min.apply(null, brightnessValues) : null,
      max: brightnessValues.length ? Math.max.apply(null, brightnessValues) : null
    };

    const ipRatingsSet = new Set();
    filtered.forEach((p) => {
      if (p.ipRating) ipRatingsSet.add(p.ipRating);
    });

    const appTypesMap = new Map();
    filtered.forEach((p) => {
      if (Array.isArray(p.applicationTypes)) {
        p.applicationTypes.forEach((code) => {
          if (!appTypesMap.has(code)) {
            appTypesMap.set(code, code);
          }
        });
      }
    });

    const applicationTypes = Array.from(appTypesMap.keys()).map((code) => ({
      code,
      label: code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    }));

    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'brightness_desc', label: 'Brightness: High to Low' },
      { value: 'brightness_asc', label: 'Brightness: Low to High' },
      { value: 'popularity_desc', label: 'Most popular' }
    ];

    return {
      pixelPitchRange,
      widthMetersRange,
      brightnessNitsRange,
      ipRatings: Array.from(ipRatingsSet),
      applicationTypes,
      sortOptions
    };
  }

  // getProductListing(categoryCode, filters, sortBy, page, pageSize)
  getProductListing(categoryCode, filters, sortBy, page, pageSize) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const enrichedFilters = Object.assign({}, filters || {}, categoryCode ? { categoryCode } : {});
    const filteredSorted = this._filterAndSortProducts(products, enrichedFilters, sortBy);

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageItems = filteredSorted.slice(start, end).map((p) => {
      const category = categories.find((c) => c.code === p.categoryCode) || null;
      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        categoryCode: p.categoryCode,
        categoryName: category ? category.name : this._categoryLabel(p.categoryCode),
        installationLocation: p.installationLocation,
        pixelPitchMm: p.pixelPitchMm,
        minRecommendedWidthMeters: p.minRecommendedWidthMeters,
        maxRecommendedWidthMeters: p.maxRecommendedWidthMeters,
        brightnessNits: p.brightnessNits,
        ipRating: p.ipRating,
        maxPowerConsumptionWPerM2: p.maxPowerConsumptionWPerM2,
        price: p.price,
        currency: p.currency,
        isFinePitch: p.isFinePitch,
        isBillboardCapable: p.isBillboardCapable,
        imageUrl: p.imageUrl,
        summary: p.summary,
        canAddToQuote: p.status === 'active',
        canCompare: true,
        // Foreign key resolution
        product: p,
        category: category
      };
    });

    // Instrumentation for task completion tracking
    try {
      if (categoryCode === 'outdoor_led_displays') {
        localStorage.setItem(
          'task2_productListParams',
          JSON.stringify({ categoryCode, filters, sortBy })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      totalCount: filteredSorted.length,
      items: pageItems
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        categoryName: null,
        applicationTypeLabels: [],
        specs: {},
        relatedProductIds: []
      };
    }

    const category = categories.find((c) => c.code === product.categoryCode) || null;

    const applicationTypeLabels = Array.isArray(product.applicationTypes)
      ? product.applicationTypes.map((code) => code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()))
      : [];

    const specs = {
      pixelPitchMm: product.pixelPitchMm,
      brightnessNits: product.brightnessNits,
      minRecommendedWidthMeters: product.minRecommendedWidthMeters,
      maxRecommendedWidthMeters: product.maxRecommendedWidthMeters,
      maxPowerConsumptionWPerM2: product.maxPowerConsumptionWPerM2,
      ipRating: product.ipRating
    };

    // Related products: same category & installation location, different id
    const relatedProductIds = products
      .filter(
        (p) =>
          p.id !== product.id &&
          p.categoryCode === product.categoryCode &&
          p.installationLocation === product.installationLocation
      )
      .slice(0, 4)
      .map((p) => p.id);

    return {
      product,
      categoryName: category ? category.name : this._categoryLabel(product.categoryCode),
      applicationTypeLabels,
      specs,
      relatedProductIds
    };
  }

  // getProductDocuments(productId, documentTypes)
  getProductDocuments(productId, documentTypes) {
    const docs = this._getFromStorage('documents', []);
    const products = this._getFromStorage('products', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const solutions = this._getFromStorage('solution_offerings', []);

    const typesFilter = Array.isArray(documentTypes) && documentTypes.length > 0 ? documentTypes : null;

    const result = docs
      .filter((d) => d.relatedEntityType === 'product' && d.relatedEntityId === productId)
      .filter((d) => (typesFilter ? typesFilter.includes(d.documentType) : true))
      .map((d) => {
        let relatedEntity = null;
        if (d.relatedEntityType === 'product') {
          relatedEntity = products.find((p) => p.id === d.relatedEntityId) || null;
        } else if (d.relatedEntityType === 'case_study') {
          relatedEntity = caseStudies.find((cs) => cs.id === d.relatedEntityId) || null;
        } else if (d.relatedEntityType === 'solution') {
          relatedEntity = solutions.find((s) => s.id === d.relatedEntityId) || null;
        }
        return Object.assign({}, d, {
          // Foreign key resolution based on relatedEntityId
          relatedEntity: relatedEntity,
          product: d.relatedEntityType === 'product' ? relatedEntity : null,
          caseStudy: d.relatedEntityType === 'case_study' ? relatedEntity : null
        });
      });

    // Instrumentation for task completion tracking
    try {
      if (result && result.length > 0) {
        const docTypesIncludesSpecSheet =
          Array.isArray(documentTypes) && documentTypes.includes('spec_sheet');
        const typesFilterIsNullOrEmpty =
          !Array.isArray(documentTypes) || documentTypes.length === 0;
        const hasSpecSheetInResults = result.some(
          (d) => d.documentType === 'spec_sheet'
        );
        const hasProductRelatedEntity = result.some(
          (d) => d.relatedEntityType === 'product'
        );

        if (
          hasProductRelatedEntity &&
          (docTypesIncludesSpecSheet ||
            (typesFilterIsNullOrEmpty && hasSpecSheetInResults))
        ) {
          localStorage.setItem('task2_specSheetProductId', String(productId));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // getRelatedProducts(productId)
  getRelatedProducts(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const product = products.find((p) => p.id === productId) || null;
    if (!product) return [];

    const related = products
      .filter(
        (p) =>
          p.id !== product.id &&
          p.categoryCode === product.categoryCode &&
          p.installationLocation === product.installationLocation
      )
      .slice(0, 8);

    return related.map((p) => {
      const category = categories.find((c) => c.code === p.categoryCode) || null;
      return {
        productId: p.id,
        name: p.name,
        categoryName: category ? category.name : this._categoryLabel(p.categoryCode),
        installationLocation: p.installationLocation,
        pixelPitchMm: p.pixelPitchMm,
        brightnessNits: p.brightnessNits,
        price: p.price,
        currency: p.currency,
        imageUrl: p.imageUrl,
        // Foreign key resolution
        product: p,
        category: category
      };
    });
  }

  // addProductToQuoteCart(productId, quantity)
  addProductToQuoteCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found.',
        cartItemCount: 0,
        totalQuantity: 0,
        cartSummary: {
          items: [],
          estimatedTotalPrice: 0,
          currency: 'usd'
        }
      };
    }

    const cart = this._getOrCreateQuoteCart();
    let items = this._getFromStorage('quote_cart_items', []);

    let item = items.find((i) => i.cartId === cart.id && i.productId === productId) || null;
    if (item) {
      item.quantity += qty;
      item.addedAt = item.addedAt || this._now();
    } else {
      item = {
        id: this._generateId('qitem'),
        cartId: cart.id,
        productId: productId,
        quantity: qty,
        unitPrice: product.price || 0,
        totalPrice: (product.price || 0) * qty,
        addedAt: this._now()
      };
      items.push(item);
      cart.itemIds = cart.itemIds || [];
      cart.itemIds.push(item.id);
    }

    cart.updatedAt = this._now();

    // Persist items and cart
    this._saveToStorage('quote_cart_items', items);
    const carts = this._getFromStorage('quote_carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('quote_carts', carts);
    }

    const summary = this._calculateCartTotals(cart);
    const totalQuantity = summary.items.reduce((acc, it) => acc + it.quantity, 0);

    return {
      success: true,
      message: 'Product added to quote cart.',
      cartItemCount: summary.items.length,
      totalQuantity: totalQuantity,
      cartSummary: summary
    };
  }

  // getQuoteCartSummary()
  getQuoteCartSummary() {
    const currentId = localStorage.getItem('current_quote_cart_id') || '';
    const carts = this._getFromStorage('quote_carts', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    let cart = null;
    if (currentId) {
      cart = carts.find((c) => c.id === currentId) || null;
    }
    if (!cart) {
      return {
        items: [],
        estimatedTotalPrice: 0,
        currency: 'usd'
      };
    }

    const baseSummary = this._calculateCartTotals(cart);

    // Enrich with categoryName and additional specs
    const enrichedItems = baseSummary.items.map((it) => {
      const product = products.find((p) => p.id === it.productId) || null;
      const category = product
        ? categories.find((c) => c.code === product.categoryCode) || null
        : null;
      return Object.assign({}, it, {
        categoryName: category ? category.name : product ? this._categoryLabel(product.categoryCode) : null,
        pixelPitchMm: product ? product.pixelPitchMm : null,
        brightnessNits: product ? product.brightnessNits : null,
        maxPowerConsumptionWPerM2: product ? product.maxPowerConsumptionWPerM2 : null,
        // Foreign key resolution already: product
        product: product,
        category: category
      });
    });

    return {
      items: enrichedItems,
      estimatedTotalPrice: baseSummary.estimatedTotalPrice,
      currency: baseSummary.currency
    };
  }

  // updateQuoteCartItemQuantity(productId, quantity)
  updateQuoteCartItemQuantity(productId, quantity) {
    const qty = typeof quantity === 'number' ? quantity : 0;
    const currentId = localStorage.getItem('current_quote_cart_id') || '';
    const carts = this._getFromStorage('quote_carts', []);
    let cart = null;
    if (currentId) {
      cart = carts.find((c) => c.id === currentId) || null;
    }
    if (!cart) {
      return {
        success: false,
        message: 'No active quote cart.',
        cartSummary: {
          items: [],
          estimatedTotalPrice: 0,
          currency: 'usd'
        }
      };
    }

    let items = this._getFromStorage('quote_cart_items', []);
    const idx = items.findIndex((i) => i.cartId === cart.id && i.productId === productId);
    if (idx < 0) {
      const summary = this._calculateCartTotals(cart);
      return {
        success: false,
        message: 'Product not found in quote cart.',
        cartSummary: summary
      };
    }

    if (qty <= 0) {
      // Remove item
      const removed = items.splice(idx, 1)[0];
      if (Array.isArray(cart.itemIds)) {
        cart.itemIds = cart.itemIds.filter((id) => id !== removed.id);
      }
    } else {
      items[idx].quantity = qty;
    }

    cart.updatedAt = this._now();

    this._saveToStorage('quote_cart_items', items);
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex] = cart;
      this._saveToStorage('quote_carts', carts);
    }

    const summary = this._calculateCartTotals(cart);
    return {
      success: true,
      message: 'Quote cart updated.',
      cartSummary: summary
    };
  }

  // removeQuoteCartItem(productId)
  removeQuoteCartItem(productId) {
    return this.updateQuoteCartItemQuantity(productId, 0);
  }

  // submitQuoteRequestFromCart(contactName, contactEmail, companyName, projectNotes)
  submitQuoteRequestFromCart(contactName, contactEmail, companyName, projectNotes) {
    const currentId = localStorage.getItem('current_quote_cart_id') || '';
    const carts = this._getFromStorage('quote_carts', []);
    let cart = null;
    if (currentId) {
      cart = carts.find((c) => c.id === currentId) || null;
    }
    if (!cart) {
      return {
        success: false,
        quoteRequestId: null,
        message: 'No active quote cart to submit.'
      };
    }

    const quoteItems = this._getFromStorage('quote_cart_items', []).filter((i) => i.cartId === cart.id);
    if (quoteItems.length === 0) {
      return {
        success: false,
        quoteRequestId: null,
        message: 'Quote cart is empty.'
      };
    }

    const products = this._getFromStorage('products', []);

    const quoteRequests = this._getFromStorage('quote_requests', []);
    const quoteRequestItems = this._getFromStorage('quote_request_items', []);

    const quoteRequest = {
      id: this._generateId('qreq'),
      contactName: contactName,
      contactEmail: contactEmail,
      companyName: companyName || null,
      projectNotes: projectNotes || null,
      sourcePage: 'quote_summary',
      status: 'submitted',
      submittedAt: this._now()
    };

    quoteRequests.push(quoteRequest);

    quoteItems.forEach((item) => {
      const product = products.find((p) => p.id === item.productId) || null;
      const unitPrice = product && typeof product.price === 'number' ? product.price : 0;
      const totalPrice = unitPrice * item.quantity;
      const qItem = {
        id: this._generateId('qritem'),
        quoteRequestId: quoteRequest.id,
        productId: item.productId,
        quantity: item.quantity,
        estimatedUnitPrice: unitPrice,
        estimatedTotalPrice: totalPrice,
        notes: null
      };
      quoteRequestItems.push(qItem);
    });

    this._saveToStorage('quote_requests', quoteRequests);
    this._saveToStorage('quote_request_items', quoteRequestItems);

    // Clear cart items and current cart reference
    const allItems = this._getFromStorage('quote_cart_items', []);
    const remainingItems = allItems.filter((i) => i.cartId !== cart.id);
    this._saveToStorage('quote_cart_items', remainingItems);

    cart.itemIds = [];
    cart.updatedAt = this._now();
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex] = cart;
      this._saveToStorage('quote_carts', carts);
    }
    localStorage.setItem('current_quote_cart_id', '');

    return {
      success: true,
      quoteRequestId: quoteRequest.id,
      message: 'Quote request submitted.'
    };
  }

  // addProductToCompareList(productId)
  addProductToCompareList(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found.',
        compareListId: null,
        productCount: 0
      };
    }

    const list = this._getOrCreateCompareList();
    const compareLists = this._getFromStorage('compare_lists', []);

    const maxItems = 4;
    if (!list.productIds.includes(productId)) {
      if (list.productIds.length >= maxItems) {
        return {
          success: false,
          message: 'Maximum number of products in comparison reached.',
          compareListId: list.id,
          productCount: list.productIds.length
        };
      }
      list.productIds.push(productId);
      list.updatedAt = this._now();

      const idx = compareLists.findIndex((l) => l.id === list.id);
      if (idx >= 0) {
        compareLists[idx] = list;
        this._saveToStorage('compare_lists', compareLists);
      }
    }

    return {
      success: true,
      message: 'Product added to comparison list.',
      compareListId: list.id,
      productCount: list.productIds.length
    };
  }

  // removeProductFromCompareList(productId)
  removeProductFromCompareList(productId) {
    const currentId = localStorage.getItem('current_compare_list_id') || '';
    const compareLists = this._getFromStorage('compare_lists', []);
    const list = currentId ? compareLists.find((l) => l.id === currentId) || null : null;

    if (!list) {
      return {
        success: false,
        message: 'No active comparison list.',
        compareListId: null,
        productCount: 0
      };
    }

    list.productIds = list.productIds.filter((id) => id !== productId);
    list.updatedAt = this._now();

    const idx = compareLists.findIndex((l) => l.id === list.id);
    if (idx >= 0) {
      compareLists[idx] = list;
      this._saveToStorage('compare_lists', compareLists);
    }

    return {
      success: true,
      message: 'Product removed from comparison list.',
      compareListId: list.id,
      productCount: list.productIds.length
    };
  }

  // clearCompareList()
  clearCompareList() {
    const currentId = localStorage.getItem('current_compare_list_id') || '';
    const compareLists = this._getFromStorage('compare_lists', []);
    const list = currentId ? compareLists.find((l) => l.id === currentId) || null : null;

    if (list) {
      list.productIds = [];
      list.updatedAt = this._now();
      const idx = compareLists.findIndex((l) => l.id === list.id);
      if (idx >= 0) {
        compareLists[idx] = list;
        this._saveToStorage('compare_lists', compareLists);
      }
    }

    return {
      success: true,
      message: 'Comparison list cleared.'
    };
  }

  // getCompareListDetails()
  getCompareListDetails() {
    const currentId = localStorage.getItem('current_compare_list_id') || '';
    const compareLists = this._getFromStorage('compare_lists', []);
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);

    const list = currentId ? compareLists.find((l) => l.id === currentId) || null : null;
    if (!list || !Array.isArray(list.productIds) || list.productIds.length === 0) {
      return {
        products: [],
        comparisonTable: { specs: [] },
        energyEfficientProductId: null
      };
    }

    const productObjs = list.productIds
      .map((id) => products.find((p) => p.id === id) || null)
      .filter((p) => !!p);

    const productsOut = productObjs.map((p) => {
      const category = categories.find((c) => c.code === p.categoryCode) || null;
      return {
        productId: p.id,
        name: p.name,
        categoryName: category ? category.name : this._categoryLabel(p.categoryCode),
        installationLocation: p.installationLocation,
        pixelPitchMm: p.pixelPitchMm,
        brightnessNits: p.brightnessNits,
        ipRating: p.ipRating,
        maxPowerConsumptionWPerM2: p.maxPowerConsumptionWPerM2,
        price: p.price,
        currency: p.currency,
        imageUrl: p.imageUrl,
        summary: p.summary,
        // Foreign key resolution
        product: p,
        category: category
      };
    });

    // Build comparison table
    const specDefs = [
      { key: 'pixel_pitch_mm', label: 'Pixel pitch', unit: 'mm', field: 'pixelPitchMm' },
      { key: 'brightness_nits', label: 'Brightness', unit: 'nits', field: 'brightnessNits' },
      {
        key: 'max_power_consumption_w_per_m2',
        label: 'Max power consumption',
        unit: 'W/m²',
        field: 'maxPowerConsumptionWPerM2'
      },
      { key: 'ip_rating', label: 'IP rating', unit: '', field: 'ipRating' },
      { key: 'price', label: 'Price', unit: '', field: 'price' }
    ];

    const specs = specDefs.map((def) => ({
      key: def.key,
      label: def.label,
      unit: def.unit,
      values: productObjs.map((p) => {
        const v = p[def.field];
        return v === null || v === undefined ? '' : String(v);
      })
    }));

    // Energy efficient product: lowest maxPowerConsumptionWPerM2
    let energyEfficientProductId = null;
    let bestValue = null;
    productObjs.forEach((p) => {
      const v = typeof p.maxPowerConsumptionWPerM2 === 'number' ? p.maxPowerConsumptionWPerM2 : null;
      if (v !== null) {
        if (bestValue === null || v < bestValue) {
          bestValue = v;
          energyEfficientProductId = p.id;
        }
      }
    });

    return {
      products: productsOut,
      comparisonTable: { specs },
      energyEfficientProductId
    };
  }

  // submitQuoteRequestFromComparison(productId, quantity, contactName, contactEmail, companyName, projectNotes)
  submitQuoteRequestFromComparison(productId, quantity, contactName, contactEmail, companyName, projectNotes) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        quoteRequestId: null,
        message: 'Product not found.'
      };
    }

    const quoteRequests = this._getFromStorage('quote_requests', []);
    const quoteRequestItems = this._getFromStorage('quote_request_items', []);

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const unitPrice = typeof product.price === 'number' ? product.price : 0;
    const totalPrice = unitPrice * qty;

    const quoteRequest = {
      id: this._generateId('qreq'),
      contactName: contactName,
      contactEmail: contactEmail,
      companyName: companyName || null,
      projectNotes: projectNotes || null,
      sourcePage: 'product_comparison',
      status: 'submitted',
      submittedAt: this._now()
    };

    quoteRequests.push(quoteRequest);

    const qItem = {
      id: this._generateId('qritem'),
      quoteRequestId: quoteRequest.id,
      productId: productId,
      quantity: qty,
      estimatedUnitPrice: unitPrice,
      estimatedTotalPrice: totalPrice,
      notes: null
    };
    quoteRequestItems.push(qItem);

    this._saveToStorage('quote_requests', quoteRequests);
    this._saveToStorage('quote_request_items', quoteRequestItems);

    return {
      success: true,
      quoteRequestId: quoteRequest.id,
      message: 'Quote request submitted.'
    };
  }

  // getSolutionsOverview()
  getSolutionsOverview() {
    const industries = this._getFromStorage('industries', []);
    const solutions = this._getFromStorage('solution_offerings', []);

    const industriesOut = industries.map((ind) => {
      const highlightSolutions = solutions
        .filter((s) => s.industryCode === ind.code)
        .map((s) => ({
          solutionCode: s.code,
          name: s.name,
          description: s.description,
          hasConfigurator: s.hasConfigurator,
          // Foreign key resolution
          solution: s
        }));

      return {
        industryCode: ind.code,
        name: ind.name,
        description: ind.description,
        primaryImageUrl: ind.primaryImageUrl,
        highlightSolutions: highlightSolutions
      };
    });

    const featuredSolutions = solutions.map((s) => {
      const industry = industries.find((i) => i.code === s.industryCode) || null;
      return {
        solutionCode: s.code,
        name: s.name,
        industryCode: s.industryCode,
        industryName: industry ? industry.name : this._industryLabel(s.industryCode),
        description: s.description,
        hasConfigurator: s.hasConfigurator,
        // Foreign key resolution
        solution: s,
        industry: industry
      };
    });

    return {
      industries: industriesOut,
      featuredSolutions
    };
  }

  // getSolutionDetail(solutionCode)
  getSolutionDetail(solutionCode) {
    const solutions = this._getFromStorage('solution_offerings', []);
    const industries = this._getFromStorage('industries', []);
    const caseStudies = this._getFromStorage('case_studies', []);

    const solution = solutions.find((s) => s.code === solutionCode) || null;
    if (!solution) {
      return {
        solution: null,
        industryName: null,
        bodyHtml: '',
        subSolutions: [],
        relatedCaseStudiesPreview: []
      };
    }

    const industry = industries.find((i) => i.code === solution.industryCode) || null;

    const subSolutions = solutions
      .filter((s) => s.industryCode === solution.industryCode && s.code !== solution.code)
      .map((s) => ({
        solutionCode: s.code,
        name: s.name,
        description: s.description,
        hasConfigurator: s.hasConfigurator,
        // Foreign key resolution
        solution: s
      }));

    const relatedCaseStudies = caseStudies
      .filter((cs) => cs.industryCode === solution.industryCode)
      .sort((a, b) => {
        const ad = a.publishedAt || '';
        const bd = b.publishedAt || '';
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return bd.localeCompare(ad);
      })
      .slice(0, 4)
      .map((cs) => ({
        caseStudyId: cs.id,
        title: cs.title,
        industryName: industry ? industry.name : this._industryLabel(cs.industryCode),
        summary: cs.summary,
        mainImageUrl: cs.mainImageUrl,
        // Foreign key resolution
        caseStudy: cs,
        industry: industry
      }));

    return {
      solution,
      industryName: industry ? industry.name : this._industryLabel(solution.industryCode),
      bodyHtml: '',
      subSolutions,
      relatedCaseStudiesPreview: relatedCaseStudies
    };
  }

  // getConfiguratorOptionsForSolution(solutionCode)
  getConfiguratorOptionsForSolution(solutionCode) {
    const products = this._getFromStorage('products', []);

    const relevantProducts = products.filter((p) =>
      Array.isArray(p.supportedSolutions) && p.supportedSolutions.includes(solutionCode)
    );

    const installationSet = new Set();
    const screenSizeSet = new Set();

    relevantProducts.forEach((p) => {
      if (p.installationLocation) installationSet.add(p.installationLocation);
      if (Array.isArray(p.supportedScreenSizesInches)) {
        p.supportedScreenSizesInches.forEach((size) => {
          if (typeof size === 'number') screenSizeSet.add(size);
        });
      }
    });

    let installationLocations = Array.from(installationSet).map((value) => ({
      value,
      label: value === 'indoor' ? 'Indoor' : value === 'outdoor' ? 'Outdoor' : value
    }));

    // Fallbacks when no products are explicitly mapped to this solution
    if (installationLocations.length === 0) {
      installationLocations = [
        { value: 'indoor', label: 'Indoor' }
      ];
    }

    let screenSizesInches = Array.from(screenSizeSet).sort((a, b) => a - b);
    if (screenSizesInches.length === 0) {
      screenSizesInches = [55];
    }

    const quantityRange = {
      min: 1,
      max: 100,
      step: 1
    };

    const defaultValues = {
      installationLocation: installationLocations.length > 0 ? installationLocations[0].value : 'indoor',
      screenSizeInches: screenSizesInches.length > 0 ? screenSizesInches[0] : 55,
      quantity: 1
    };

    return {
      installationLocations,
      screenSizesInches,
      quantityRange,
      defaultValues
    };
  }

  // getConfiguratorModels(solutionCode, installationLocation, screenSizeInches, quantity, sortBy)
  getConfiguratorModels(solutionCode, installationLocation, screenSizeInches, quantity, sortBy) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('product_categories', []);
    const solutions = this._getFromStorage('solution_offerings', []);

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const solution = solutions.find((s) => s.code === solutionCode) || null;
    const relatedCategoryCodes =
      solution && Array.isArray(solution.relatedProductCategoryCodes)
        ? solution.relatedProductCategoryCodes
        : [];

    const hasDirectSolutionMatches = products.some(
      (p) => Array.isArray(p.supportedSolutions) && p.supportedSolutions.includes(solutionCode)
    );

    let models = products.filter((p) => {
      const isDirectMatch =
        Array.isArray(p.supportedSolutions) && p.supportedSolutions.includes(solutionCode);
      const isCategoryMatch =
        !hasDirectSolutionMatches &&
        relatedCategoryCodes.length > 0 &&
        relatedCategoryCodes.includes(p.categoryCode);

      if (!isDirectMatch && !isCategoryMatch) {
        return false;
      }
      if (installationLocation && p.installationLocation !== installationLocation) {
        return false;
      }
      if (typeof screenSizeInches === 'number') {
        const sizes = Array.isArray(p.supportedScreenSizesInches) ? p.supportedScreenSizesInches : [];
        // If no explicit sizes are defined, treat the model as compatible with any size
        if (sizes.length > 0 && !sizes.includes(screenSizeInches)) return false;
      }
      return true;
    });

    const sort = sortBy || 'price_asc';
    models.sort((a, b) => {
      const get = (obj, key) => (typeof obj[key] === 'number' ? obj[key] : null);
      switch (sort) {
        case 'price_desc': {
          const av = get(a, 'price');
          const bv = get(b, 'price');
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return bv - av;
        }
        case 'brightness_desc': {
          const av = get(a, 'brightnessNits');
          const bv = get(b, 'brightnessNits');
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return bv - av;
        }
        case 'price_asc':
        default: {
          const av = get(a, 'price');
          const bv = get(b, 'price');
          if (av === null && bv === null) return 0;
          if (av === null) return 1;
          if (bv === null) return -1;
          return av - bv;
        }
      }
    });

    return models.map((p) => {
      const category = categories.find((c) => c.code === p.categoryCode) || null;
      const estimatedTotalPriceForQuantity = this._calculateProjectEstimate(p, qty);
      return {
        productId: p.id,
        name: p.name,
        categoryName: category ? category.name : this._categoryLabel(p.categoryCode),
        installationLocation: p.installationLocation,
        supportedScreenSizesInches: Array.isArray(p.supportedScreenSizesInches)
          ? p.supportedScreenSizesInches.slice()
          : [],
        price: p.price,
        currency: p.currency,
        estimatedTotalPriceForQuantity,
        summary: p.summary,
        // Foreign key resolution
        product: p,
        category: category
      };
    });
  }

  // createProjectConfiguration(solutionCode, installationLocation, screenSizeInches, quantity, selectedProductId)
  createProjectConfiguration(solutionCode, installationLocation, screenSizeInches, quantity, selectedProductId) {
    const products = this._getFromStorage('products', []);
    const solutions = this._getFromStorage('solution_offerings', []);

    const product = products.find((p) => p.id === selectedProductId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Selected product not found.',
        configuration: null,
        productName: null,
        solutionName: null
      };
    }

    const solution = solutions.find((s) => s.code === solutionCode) || null;

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const estimatedTotalPrice = this._calculateProjectEstimate(product, qty);

    const configurations = this._getFromStorage('project_configurations', []);

    const configuration = {
      id: this._generateId('pcfg'),
      solutionCode: solutionCode,
      installationLocation: installationLocation,
      screenSizeInches: screenSizeInches,
      quantity: qty,
      selectedProductId: selectedProductId,
      estimatedTotalPrice: estimatedTotalPrice,
      currency: product.currency || 'usd',
      createdAt: this._now()
    };

    configurations.push(configuration);
    this._saveToStorage('project_configurations', configurations);

    return {
      success: true,
      message: 'Project configuration created.',
      configuration: Object.assign({}, configuration, {
        // Foreign key resolution for selectedProductId
        selectedProduct: product,
        solution: solution
      }),
      productName: product.name,
      solutionName: solution ? solution.name : null
    };
  }

  // getCaseStudyFilterOptions()
  getCaseStudyFilterOptions() {
    const industries = this._getFromStorage('industries', []);
    const caseStudies = this._getFromStorage('case_studies', []);

    const displayWidths = caseStudies
      .map((cs) => cs.displayWidthMeters)
      .filter((v) => typeof v === 'number');

    const displayWidthMetersRange = {
      min: displayWidths.length ? Math.min.apply(null, displayWidths) : null,
      max: displayWidths.length ? Math.max.apply(null, displayWidths) : null
    };

    const sortOptions = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' }
    ];

    const industriesOut = industries.map((ind) => ({
      industryCode: ind.code,
      name: ind.name
    }));

    return {
      industries: industriesOut,
      displayWidthMetersRange,
      sortOptions
    };
  }

  // getCaseStudies(filters, sortBy, page, pageSize)
  getCaseStudies(filters, sortBy, page, pageSize) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const industries = this._getFromStorage('industries', []);

    const filteredSorted = this._filterAndSortCaseStudies(caseStudies, filters || {}, sortBy);

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 12;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const items = filteredSorted.slice(start, end).map((cs) => {
      const industry = industries.find((i) => i.code === cs.industryCode) || null;
      return {
        caseStudyId: cs.id,
        title: cs.title,
        slug: cs.slug,
        industryCode: cs.industryCode,
        industryName: industry ? industry.name : this._industryLabel(cs.industryCode),
        summary: cs.summary,
        displayWidthMeters: cs.displayWidthMeters,
        locationCity: cs.locationCity,
        locationCountry: cs.locationCountry,
        venueName: cs.venueName,
        mainImageUrl: cs.mainImageUrl,
        publishedAt: cs.publishedAt,
        // Foreign key resolution
        caseStudy: cs,
        industry: industry
      };
    });

    // Instrumentation for task completion tracking
    try {
      if (filters && filters.industryCode === 'transportation') {
        localStorage.setItem(
          'task6_caseStudyListParams',
          JSON.stringify({ filters, sortBy })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      totalCount: filteredSorted.length,
      items
    };
  }

  // getCaseStudyDetail(caseStudyId)
  getCaseStudyDetail(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const industries = this._getFromStorage('industries', []);

    const cs = caseStudies.find((c) => c.id === caseStudyId) || null;
    if (!cs) {
      return {
        caseStudy: null,
        industryName: null,
        technicalDetails: {},
        relatedSolutions: [],
        relatedCaseStudies: []
      };
    }

    const industry = industries.find((i) => i.code === cs.industryCode) || null;

    const technicalDetails = {
      displayType: 'LED display',
      displayWidthMeters: cs.displayWidthMeters,
      resolution: null,
      brightnessNits: null,
      installationEnvironment: null
    };

    const relatedSolutions = [
      {
        industryCode: cs.industryCode,
        industryName: industry ? industry.name : this._industryLabel(cs.industryCode),
        solutionCodes: []
      }
    ];

    const relatedCaseStudies = caseStudies
      .filter((c) => c.id !== cs.id && c.industryCode === cs.industryCode)
      .slice(0, 4)
      .map((c) => ({
        caseStudyId: c.id,
        title: c.title,
        industryName: industry ? industry.name : this._industryLabel(c.industryCode),
        mainImageUrl: c.mainImageUrl,
        // Foreign key resolution
        caseStudy: c,
        industry: industry
      }));

    return {
      caseStudy: cs,
      industryName: industry ? industry.name : this._industryLabel(cs.industryCode),
      technicalDetails,
      relatedSolutions,
      relatedCaseStudies
    };
  }

  // getCaseStudyDocuments(caseStudyId, documentTypes)
  getCaseStudyDocuments(caseStudyId, documentTypes) {
    const docs = this._getFromStorage('documents', []);
    const products = this._getFromStorage('products', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const solutions = this._getFromStorage('solution_offerings', []);

    const typesFilter = Array.isArray(documentTypes) && documentTypes.length > 0 ? documentTypes : null;

    const result = docs
      .filter((d) => d.relatedEntityType === 'case_study' && d.relatedEntityId === caseStudyId)
      .filter((d) => (typesFilter ? typesFilter.includes(d.documentType) : true))
      .map((d) => {
        let relatedEntity = null;
        if (d.relatedEntityType === 'product') {
          relatedEntity = products.find((p) => p.id === d.relatedEntityId) || null;
        } else if (d.relatedEntityType === 'case_study') {
          relatedEntity = caseStudies.find((cs) => cs.id === d.relatedEntityId) || null;
        } else if (d.relatedEntityType === 'solution') {
          relatedEntity = solutions.find((s) => s.id === d.relatedEntityId) || null;
        }
        return Object.assign({}, d, {
          relatedEntity: relatedEntity,
          product: d.relatedEntityType === 'product' ? relatedEntity : null,
          caseStudy: d.relatedEntityType === 'case_study' ? relatedEntity : null
        });
      });

    // Instrumentation for task completion tracking
    try {
      if (result && result.length > 0) {
        const docTypesIncludesBrochure =
          Array.isArray(documentTypes) && documentTypes.includes('brochure');
        const typesFilterIsNullOrEmpty =
          !Array.isArray(documentTypes) || documentTypes.length === 0;
        const hasBrochureInResults = result.some(
          (d) => d.documentType === 'brochure'
        );

        if (
          docTypesIncludesBrochure ||
          (typesFilterIsNullOrEmpty && hasBrochureInResults)
        ) {
          localStorage.setItem(
            'task6_brochureCaseStudyId',
            String(caseStudyId)
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // getSupportOverview()
  getSupportOverview() {
    const faqItems = this._getFromStorage('faq_items', []);

    const popularTopics = faqItems
      .filter((f) => f.isPopular)
      .slice(0, 5)
      .map((f) => ({
        title: f.question,
        linkType: 'faq_category',
        linkTarget: f.categoryCode
      }));

    const categoryCodes = Array.from(new Set(faqItems.map((f) => f.categoryCode)));

    const faqCategories = categoryCodes.map((code) => ({
      categoryCode: code,
      name: this._faqCategoryLabel(code),
      description: ''
    }));

    const contactInfo = {
      supportEmail: 'support@example.com',
      supportPhone: '+1-000-000-0000',
      workingHours: 'Monday–Friday, 9:00–17:00 (local time)'
    };

    const resources = [
      {
        type: 'manuals',
        title: 'Product manuals',
        url: '/support/manuals'
      },
      {
        type: 'software',
        title: 'Control software downloads',
        url: '/support/software'
      },
      {
        type: 'rma',
        title: 'RMA request form',
        url: '/support/rma'
      }
    ];

    return {
      introHtml: '<p>Find answers, download resources, or contact our support team.</p>',
      popularTopics,
      faqCategories,
      contactInfo,
      resources
    };
  }

  // getFaqCategories()
  getFaqCategories() {
    const faqItems = this._getFromStorage('faq_items', []);
    const codes = Array.from(new Set(faqItems.map((f) => f.categoryCode)));

    return codes.map((code) => ({
      categoryCode: code,
      name: this._faqCategoryLabel(code),
      description: '',
      sortOrder: 0
    }));
  }

  // getFaqItemsByCategory(categoryCode)
  getFaqItemsByCategory(categoryCode) {
    const faqItems = this._getFromStorage('faq_items', []);
    return faqItems
      .filter((f) => f.categoryCode === categoryCode)
      .sort((a, b) => {
        const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        return sa - sb;
      });
  }

  // submitSupportRequest(name, email, issueType, message, sourcePage)
  submitSupportRequest(name, email, issueType, message, sourcePage) {
    const requests = this._getFromStorage('support_requests', []);

    const request = {
      id: this._generateId('support'),
      name,
      email,
      issueType,
      message,
      sourcePage,
      createdAt: this._now(),
      status: 'open'
    };

    requests.push(request);
    this._saveToStorage('support_requests', requests);

    return {
      success: true,
      supportRequestId: request.id,
      message: 'Support request submitted.'
    };
  }

  // getOfficeFilterOptions()
  getOfficeFilterOptions() {
    const offices = this._getFromStorage('offices', []);

    const regionsSet = new Set();
    const countriesMap = new Map();
    const statesMap = new Map();

    offices.forEach((o) => {
      if (o.region) regionsSet.add(o.region);
      if (o.country) {
        countriesMap.set(o.country, o.region || null);
      }
      if (o.stateProvince && o.country) {
        const key = o.stateProvince + '|' + o.country;
        statesMap.set(key, { value: o.stateProvince, country: o.country });
      }
    });

    const regions = Array.from(regionsSet).map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    }));

    const countries = Array.from(countriesMap.entries()).map(([value, region]) => ({
      value,
      label: this._countryLabel(value),
      region
    }));

    const states = Array.from(statesMap.values()).map((s) => ({
      value: s.value,
      label: s.value,
      country: s.country
    }));

    return {
      regions,
      countries,
      states
    };
  }

  // getOffices(region, country, stateProvince)
  getOffices(region, country, stateProvince) {
    const offices = this._getFromStorage('offices', []);

    const filtered = offices.filter((o) => {
      if (!o.isActive) return false;
      if (region && o.region !== region) return false;
      if (country && o.country !== country) return false;
      if (stateProvince && o.stateProvince !== stateProvince) return false;
      return true;
    });

    // Instrumentation for task completion tracking
    try {
      if (region && country && stateProvince) {
        localStorage.setItem(
          'task4_officeFilters',
          JSON.stringify({ region, country, stateProvince })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filtered.map((o) => ({
      officeId: o.id,
      name: o.name,
      region: o.region,
      country: o.country,
      stateProvince: o.stateProvince,
      city: o.city,
      addressLine1: o.addressLine1,
      addressLine2: o.addressLine2,
      postalCode: o.postalCode,
      salesPhone: o.salesPhone,
      supportPhone: o.supportPhone,
      email: o.email,
      officeType: o.officeType,
      isActive: o.isActive,
      // Foreign key resolution
      office: o
    }));
  }

  // getOfficeDetail(officeId)
  getOfficeDetail(officeId) {
    const offices = this._getFromStorage('offices', []);
    const office = offices.find((o) => o.id === officeId) || null;

    // Instrumentation for task completion tracking
    try {
      if (office) {
        localStorage.setItem('task4_officeDetailOfficeId', String(officeId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { office };
  }

  // getCareerFilterOptions()
  getCareerFilterOptions() {
    const departments = this._getFromStorage('departments', []);
    const jobPostings = this._getFromStorage('job_postings', []);

    const departmentsOut = departments.map((d) => ({
      code: d.code,
      name: d.name
    }));

    const locMap = new Map();
    jobPostings.forEach((job) => {
      if (job.city && job.country) {
        const key = job.city + '|' + job.country;
        if (!locMap.has(key)) {
          locMap.set(key, { city: job.city, country: job.country });
        }
      }
    });
    const locations = Array.from(locMap.values());

    const postedDateOptions = [
      { value: 'any_time', label: 'Any time' },
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_90_days', label: 'Last 90 days' }
    ];

    return {
      departments: departmentsOut,
      locations,
      postedDateOptions
    };
  }

  // getJobPostings(departmentCode, city, country, postedDateRange, page, pageSize)
  getJobPostings(departmentCode, city, country, postedDateRange, page, pageSize) {
    const jobPostings = this._getFromStorage('job_postings', []);
    const departments = this._getFromStorage('departments', []);

    const filteredSorted = this._filterAndSortJobPostings(
      jobPostings,
      departmentCode,
      city,
      country,
      postedDateRange
    );

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const items = filteredSorted.slice(start, end).map((job) => {
      const dept = departments.find((d) => d.code === job.departmentCode) || null;
      return {
        jobPostingId: job.id,
        title: job.title,
        departmentCode: job.departmentCode,
        departmentName: dept ? dept.name : job.departmentCode,
        city: job.city,
        country: job.country,
        locationType: job.locationType,
        employmentType: job.employmentType,
        postedAt: job.postedAt,
        status: job.status,
        summary: job.description,
        // Foreign key resolution
        jobPosting: job,
        department: dept
      };
    });

    return {
      totalCount: filteredSorted.length,
      items
    };
  }

  // getJobDetail(jobPostingId)
  getJobDetail(jobPostingId) {
    const jobPostings = this._getFromStorage('job_postings', []);
    const departments = this._getFromStorage('departments', []);

    const job = jobPostings.find((j) => j.id === jobPostingId) || null;
    if (!job) {
      return {
        job: null,
        departmentName: null,
        bodyHtml: '',
        responsibilitiesHtml: '',
        requirementsHtml: ''
      };
    }

    const dept = departments.find((d) => d.code === job.departmentCode) || null;

    return {
      job,
      departmentName: dept ? dept.name : job.departmentCode,
      bodyHtml: job.description || '',
      responsibilitiesHtml: '',
      requirementsHtml: ''
    };
  }

  // submitJobApplication(jobPostingId, fullName, email, city, howHear)
  submitJobApplication(jobPostingId, fullName, email, city, howHear) {
    const jobPostings = this._getFromStorage('job_postings', []);
    const job = jobPostings.find((j) => j.id === jobPostingId) || null;
    if (!job) {
      return {
        success: false,
        jobApplicationId: null,
        message: 'Job posting not found.'
      };
    }

    const applications = this._getFromStorage('job_applications', []);

    const application = {
      id: this._generateId('jobapp'),
      jobPostingId: jobPostingId,
      fullName,
      email,
      city: city || null,
      howHear,
      createdAt: this._now(),
      resumeUploaded: false,
      coverLetterUploaded: false,
      status: 'submitted'
    };

    applications.push(application);
    this._saveToStorage('job_applications', applications);

    return {
      success: true,
      jobApplicationId: application.id,
      message: 'Job application submitted.'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      companyHistoryHtml:
        '<p>Founded by display engineers, we have decades of experience delivering LED solutions worldwide.</p>',
      missionHtml: '<p>Our mission is to make high-performance LED displays accessible and reliable.</p>',
      visionHtml:
        '<p>We envision a world where every visual communication surface is smart, efficient, and sustainable.</p>',
      valuesHtml:
        '<ul><li>Customer focus</li><li>Engineering excellence</li><li>Integrity</li><li>Sustainability</li></ul>',
      manufacturingCapabilitiesHtml:
        '<p>Complete in-house design, SMT production, calibration, and burn-in testing.</p>',
      certifications: [
        {
          name: 'ISO 9001',
          description: 'Quality management system certified.'
        },
        {
          name: 'ISO 14001',
          description: 'Environmental management system certified.'
        }
      ],
      innovationFocusHtml:
        '<p>We continuously invest in fine-pitch, HDR, and energy-efficient display technologies.</p>',
      globalPresence: {
        officesByRegion: []
      }
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      lastUpdated: this._now().slice(0, 10),
      sections: [
        {
          id: 'data_collection',
          title: 'Information we collect',
          bodyHtml:
            '<p>We collect information you provide directly (such as contact forms) and limited technical data (such as log files and cookies).</p>'
        },
        {
          id: 'data_use',
          title: 'How we use your information',
          bodyHtml:
            '<p>We use your information to respond to inquiries, provide quotations, improve our services, and comply with legal obligations.</p>'
        },
        {
          id: 'data_storage',
          title: 'Data storage and retention',
          bodyHtml:
            '<p>Your data is stored securely and retained only as long as necessary for the purposes described in this policy.</p>'
        },
        {
          id: 'user_rights',
          title: 'Your rights',
          bodyHtml:
            '<p>You may have rights to access, correct, delete, or restrict processing of your personal data, subject to applicable law.</p>'
        }
      ]
    };
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    return {
      lastUpdated: this._now().slice(0, 10),
      sections: [
        {
          id: 'acceptable_use',
          title: 'Acceptable use',
          bodyHtml:
            '<p>You agree not to misuse the website, attempt unauthorized access, or interfere with its operation.</p>'
        },
        {
          id: 'intellectual_property',
          title: 'Intellectual property',
          bodyHtml:
            '<p>All content on this website is owned by us or our licensors and is protected by applicable laws.</p>'
        },
        {
          id: 'disclaimers',
          title: 'Disclaimers',
          bodyHtml:
            '<p>The website is provided on an "as is" basis without warranties of any kind, to the maximum extent permitted by law.</p>'
        },
        {
          id: 'governing_law',
          title: 'Governing law',
          bodyHtml:
            '<p>These terms are governed by the laws applicable in our principal place of business, without regard to conflict-of-law rules.</p>'
        }
      ]
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