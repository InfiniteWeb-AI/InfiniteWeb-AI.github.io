/*
  BusinessLogic for ventilation and airflow solutions website
  - Uses localStorage (with Node-safe polyfill) for persistence
  - No DOM access; pure business logic only
*/

// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keys = [
      // Core entities
      'products',
      'categories',
      'product_categories',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'quote_requests',
      'quote_items',
      'services',
      'appointment_requests',
      'service_time_slots',
      'garage_calculations',
      'documents',
      'document_viewer_states',
      'custom_ducting_kits',
      'product_comparisons',
      'comparison_items',
      'shipping_methods',
      'shipping_estimates',
      'navigation_links',
      'pages',
      // Additional internal tables
      'tools_calculators',
      'contact_requests'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      // Corrupt data, reset to empty array to avoid breaking all logic
      localStorage.setItem(key, JSON.stringify([]));
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

  // -------------------- Private helpers (required ones) --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    if (carts.length > 0) {
      return carts[0];
    }
    const now = this._nowIso();
    const cart = {
      id: this._generateId('cart'),
      created_at: now,
      updated_at: now
    };
    carts.push(cart);
    this._saveToStorage('carts', carts);
    return cart;
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    if (wishlists.length > 0) {
      return wishlists[0];
    }
    const now = this._nowIso();
    const wishlist = {
      id: this._generateId('wishlist'),
      created_at: now,
      updated_at: now
    };
    wishlists.push(wishlist);
    this._saveToStorage('wishlists', wishlists);
    return wishlist;
  }

  _getOrCreateQuoteDraft() {
    let quoteRequests = this._getFromStorage('quote_requests');
    let draft = quoteRequests.find(q => q.status === 'draft');
    if (draft) return draft;
    const now = this._nowIso();
    draft = {
      id: this._generateId('quote'),
      status: 'draft',
      project_name: null,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      company_name: null,
      notes: null,
      created_at: now,
      submitted_at: null
    };
    quoteRequests.push(draft);
    this._saveToStorage('quote_requests', quoteRequests);
    return draft;
  }

  _getOrCreateProductComparison() {
    let comparisons = this._getFromStorage('product_comparisons');
    if (comparisons.length > 0) {
      return comparisons[0];
    }
    const comparison = {
      id: this._generateId('cmp'),
      created_at: this._nowIso()
    };
    comparisons.push(comparison);
    this._saveToStorage('product_comparisons', comparisons);
    return comparison;
  }

  _createOrUpdateShippingEstimate(cartId, shippingMethodId, destinationZip) {
    const shippingMethods = this._getFromStorage('shipping_methods');
    const shippingMethod = shippingMethods.find(m => m.id === shippingMethodId) || null;
    let estimates = this._getFromStorage('shipping_estimates');

    let estimated_cost = 0;
    if (shippingMethod && typeof shippingMethod.base_rate === 'number') {
      estimated_cost = shippingMethod.base_rate;
    }

    const estimate = {
      id: this._generateId('ship_est'),
      cartId,
      shippingMethodId,
      destination_zip: destinationZip,
      estimated_cost,
      created_at: this._nowIso()
    };

    estimates.push(estimate);
    this._saveToStorage('shipping_estimates', estimates);
    return estimate;
  }

  _createGarageVentilationCalculationRecord(lengthFt, widthFt, heightFt, usageType, resultCfm, recommendedMinCfm, recommendedMaxCfm) {
    const calculations = this._getFromStorage('garage_calculations');
    const calc = {
      id: this._generateId('garage_calc'),
      length_ft: lengthFt,
      width_ft: widthFt,
      height_ft: heightFt,
      usage_type: usageType,
      calculated_cfm: resultCfm,
      recommended_min_cfm: recommendedMinCfm,
      recommended_max_cfm: recommendedMaxCfm,
      created_at: this._nowIso()
    };
    calculations.push(calc);
    this._saveToStorage('garage_calculations', calculations);
    return calc;
  }

  _getOrCreateDocumentViewerState(documentId) {
    const states = this._getFromStorage('document_viewer_states');
    let state = states.find(s => s.documentId === documentId);
    if (state) return state;
    state = {
      id: this._generateId('doc_view'),
      documentId,
      zoom_level: 1,
      current_page: 1,
      opened_at: this._nowIso()
    };
    states.push(state);
    this._saveToStorage('document_viewer_states', states);
    return state;
  }

  _calculateCustomDuctingKitPrice(applicationType, ductDiameterInch, ductLengthFeet, numberOfClamps, grilleStyle) {
    // Simple deterministic pricing formula based on configuration
    const basePerFoot = 2; // USD per foot of duct
    const clampPrice = 1.5; // per clamp
    let grillePrice = 10;
    if (grilleStyle === 'brushed_metal_grille') grillePrice = 18;
    else if (grilleStyle === 'wall_vent_grille') grillePrice = 12;
    else if (grilleStyle === 'other') grillePrice = 15;

    let appMultiplier = 1;
    if (applicationType === 'kitchen_exhaust') appMultiplier = 1.1;
    else if (applicationType === 'general_ventilation') appMultiplier = 0.95;

    const diameterFactor = 1 + (ductDiameterInch - 4) * 0.05; // small adjustment

    const rawPrice = (ductLengthFeet * basePerFoot + numberOfClamps * clampPrice + grillePrice) * appMultiplier * diameterFactor;
    return Math.max(0, Math.round(rawPrice * 100) / 100);
  }

  // Helper: get products by categoryUrlId (hierarchical via primary_category_id & product_categories)
  _getProductsForCategoryUrlId(categoryUrlId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const productCategories = this._getFromStorage('product_categories');

    const category = categories.find(c => c.url_category_id === categoryUrlId) || null;
    if (!category) return [];

    const categoryId = category.id;
    const productIdsInCategory = new Set(
      productCategories
        .filter(pc => pc.categoryId === categoryId)
        .map(pc => pc.productId)
    );

    return products.filter(p => {
      if (p.status !== 'active') return false;
      if (p.primary_category_id && p.primary_category_id === categoryId) return true;
      return productIdsInCategory.has(p.id);
    });
  }

  // Helper: apply filters to product list
  _filterProducts(products, filters) {
    if (!filters) return products.slice();
    return products.filter(p => {
      if (typeof filters.minPrice === 'number' && !(p.price >= filters.minPrice)) return false;
      if (typeof filters.maxPrice === 'number' && !(p.price <= filters.maxPrice)) return false;

      if (typeof filters.maxSoundLevelSones === 'number') {
        if (typeof p.sound_level_sones !== 'number' || p.sound_level_sones > filters.maxSoundLevelSones) return false;
      }
      if (typeof filters.minSoundLevelSones === 'number') {
        if (typeof p.sound_level_sones !== 'number' || p.sound_level_sones < filters.minSoundLevelSones) return false;
      }

      if (typeof filters.minCustomerRating === 'number') {
        if (typeof p.average_rating !== 'number' || p.average_rating < filters.minCustomerRating) return false;
      }

      if (typeof filters.diameterInch === 'number') {
        if (typeof p.diameter_inch !== 'number' || p.diameter_inch !== filters.diameterInch) return false;
      }

      if (typeof filters.airflowCfmMin === 'number') {
        if (typeof p.airflow_cfm !== 'number' || p.airflow_cfm < filters.airflowCfmMin) return false;
      }
      if (typeof filters.airflowCfmMax === 'number') {
        if (typeof p.airflow_cfm !== 'number' || p.airflow_cfm > filters.airflowCfmMax) return false;
      }

      if (filters.sizeLabel) {
        if (p.size_label !== filters.sizeLabel) return false;
      }

      if (typeof filters.minMervRating === 'number') {
        if (typeof p.merv_rating !== 'number' || p.merv_rating < filters.minMervRating) return false;
      }

      if (typeof filters.minPackSize === 'number') {
        if (typeof p.pack_size !== 'number' || p.pack_size < filters.minPackSize) return false;
      }

      if (filters.freeShippingOnly) {
        if (!p.is_free_shipping) return false;
      }

      if (filters.roofType) {
        if (p.roof_type !== filters.roofType) return false;
      }

      if (filters.energyRating) {
        if (p.energy_rating !== filters.energyRating) return false;
      }

      if (filters.productType) {
        if (p.product_type !== filters.productType) return false;
      }

      return true;
    });
  }

  // Helper: sort products according to sortBy
  _sortProducts(products, sortBy, defaultSort) {
    const mode = sortBy || defaultSort;
    const arr = products.slice();

    switch (mode) {
      case 'price_low_to_high':
        arr.sort((a, b) => {
          const ap = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
          const bp = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
          return ap - bp;
        });
        break;
      case 'price_high_to_low':
        arr.sort((a, b) => {
          const ap = typeof a.price === 'number' ? a.price : Number.NEGATIVE_INFINITY;
          const bp = typeof b.price === 'number' ? b.price : Number.NEGATIVE_INFINITY;
          return bp - ap;
        });
        break;
      case 'sound_level_low_to_high':
        arr.sort((a, b) => {
          const as = typeof a.sound_level_sones === 'number' ? a.sound_level_sones : Number.POSITIVE_INFINITY;
          const bs = typeof b.sound_level_sones === 'number' ? b.sound_level_sones : Number.POSITIVE_INFINITY;
          return as - bs;
        });
        break;
      case 'airflow_cfm_high_to_low':
        arr.sort((a, b) => {
          const ac = typeof a.airflow_cfm === 'number' ? a.airflow_cfm : Number.NEGATIVE_INFINITY;
          const bc = typeof b.airflow_cfm === 'number' ? b.airflow_cfm : Number.NEGATIVE_INFINITY;
          return bc - ac;
        });
        break;
      case 'customer_rating_high_to_low':
        arr.sort((a, b) => {
          const ar = typeof a.average_rating === 'number' ? a.average_rating : Number.NEGATIVE_INFINITY;
          const br = typeof b.average_rating === 'number' ? b.average_rating : Number.NEGATIVE_INFINITY;
          if (br !== ar) return br - ar;
          const ac = typeof a.rating_count === 'number' ? a.rating_count : 0;
          const bc = typeof b.rating_count === 'number' ? b.rating_count : 0;
          return bc - ac;
        });
        break;
      case 'relevance':
      case 'default':
      default:
        // keep original order
        break;
    }

    return arr;
  }

  // Helper: build product card info
  _mapProductToListingItem(product, categories) {
    const primaryCategory = categories.find(c => c.id === product.primary_category_id) || null;
    const categoryName = primaryCategory ? primaryCategory.name : null;
    const primaryImageUrl = Array.isArray(product.image_urls) && product.image_urls.length > 0 ? product.image_urls[0] : null;
    const priceDisplay = typeof product.price === 'number' ? `$${product.price.toFixed(2)}` : 'Contact for price';
    const averageRating = typeof product.average_rating === 'number' ? product.average_rating : null;
    const ratingCount = typeof product.rating_count === 'number' ? product.rating_count : 0;

    const badges = [];
    if (product.energy_rating === 'energy_star_certified') badges.push('ENERGY STAR certified');
    if (product.is_free_shipping) badges.push('Free shipping');

    return {
      product,
      categoryName,
      primaryImageUrl,
      priceDisplay,
      isFreeShipping: !!product.is_free_shipping,
      averageRating,
      ratingCount,
      badges
    };
  }

  // Helper: get latest shipping estimate for a cart and resolve its shippingMethod
  _getLatestShippingEstimateForCart(cartId) {
    const estimates = this._getFromStorage('shipping_estimates').filter(e => e.cartId === cartId);
    if (estimates.length === 0) return null;
    estimates.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    const latest = estimates[estimates.length - 1];
    const shippingMethods = this._getFromStorage('shipping_methods');
    const method = shippingMethods.find(m => m.id === latest.shippingMethodId) || null;
    return { ...latest, shippingMethod: method };
  }

  // -------------------- Core interface implementations --------------------

  // searchProducts(query, filters, sortBy, page, pageSize)
  searchProducts(query, filters = {}, sortBy = 'relevance', page = 1, pageSize = 20) {
    const productsAll = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const productCategories = this._getFromStorage('product_categories');

    const q = (query || '').trim().toLowerCase();
    // Map productId -> array of category names for hierarchical search
    const categoryMap = new Map();
    for (const pc of productCategories) {
      const cat = categories.find(c => c.id === pc.categoryId);
      if (!cat) continue;
      if (!categoryMap.has(pc.productId)) categoryMap.set(pc.productId, []);
      categoryMap.get(pc.productId).push(cat.name.toLowerCase());
    }

    let filtered = productsAll.filter(p => p.status === 'active');

    if (q) {
      filtered = filtered.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const catNames = categoryMap.get(p.id) || [];
        if (name.includes(q) || desc.includes(q)) return true;
        return catNames.some(cn => cn.includes(q));
      });
    }

    filtered = this._filterProducts(filtered, filters);
    const sorted = this._sortProducts(filtered, sortBy, 'relevance');

    const totalCount = sorted.length;
    const startIndex = (page - 1) * pageSize;
    const pageItems = sorted.slice(startIndex, startIndex + pageSize);

    const listingItems = pageItems.map(p => this._mapProductToListingItem(p, categories));

    const availableSortOptions = [
      'relevance',
      'price_low_to_high',
      'price_high_to_low',
      'sound_level_low_to_high',
      'airflow_cfm_high_to_low',
      'customer_rating_high_to_low'
    ];

    return {
      query,
      totalCount,
      page,
      pageSize,
      sortBy,
      products: listingItems,
      availableSortOptions,
      appliedFilters: { ...filters }
    };
  }

  // getProductListing(contextType, categoryUrlId, garageCalculationId, filters, sortBy, page, pageSize)
  getProductListing(contextType, categoryUrlId = null, garageCalculationId = null, filters = {}, sortBy = 'default', page = 1, pageSize = 20) {
    const categories = this._getFromStorage('categories');
    let productsBase = [];
    let contextLabel = '';

    if (contextType === 'category') {
      productsBase = this._getProductsForCategoryUrlId(categoryUrlId);
      const cat = categories.find(c => c.url_category_id === categoryUrlId) || null;
      contextLabel = cat ? cat.name : (categoryUrlId || 'Category');
    } else if (contextType === 'garage_recommendation') {
      const calculations = this._getFromStorage('garage_calculations');
      const calc = calculations.find(c => c.id === garageCalculationId) || null;
      const allProducts = this._getFromStorage('products');
      if (calc) {
        const minCfm = typeof calc.recommended_min_cfm === 'number' ? calc.recommended_min_cfm : calc.calculated_cfm;
        const maxCfm = typeof calc.recommended_max_cfm === 'number' ? calc.recommended_max_cfm : calc.calculated_cfm;
        productsBase = allProducts.filter(p => {
          if (p.status !== 'active') return false;
          if (p.product_type !== 'garage_fan') return false;
          if (typeof p.airflow_cfm !== 'number') return false;
          return p.airflow_cfm >= minCfm && p.airflow_cfm <= maxCfm;
        });
        contextLabel = 'Garage ventilation recommendations';
      } else {
        productsBase = [];
        contextLabel = 'Garage ventilation recommendations';
      }
    } else {
      // Fallback: all active products
      const all = this._getFromStorage('products');
      productsBase = all.filter(p => p.status === 'active');
      contextLabel = 'Products';
    }

    let filtered = this._filterProducts(productsBase, filters);

    const finalSortBy = sortBy === 'default' ? 'customer_rating_high_to_low' : sortBy;
    const sorted = this._sortProducts(filtered, finalSortBy, 'customer_rating_high_to_low');

    const totalCount = sorted.length;
    const startIndex = (page - 1) * pageSize;
    const pageItems = sorted.slice(startIndex, startIndex + pageSize);

    const listingItems = pageItems.map(p => this._mapProductToListingItem(p, categories));

    const availableSortOptions = [
      'default',
      'price_low_to_high',
      'price_high_to_low',
      'sound_level_low_to_high',
      'airflow_cfm_high_to_low',
      'customer_rating_high_to_low'
    ];

    return {
      contextLabel,
      totalCount,
      page,
      pageSize,
      sortBy: finalSortBy,
      products: listingItems,
      availableSortOptions,
      appliedFilters: { ...filters }
    };
  }

  // getProductFilterOptions(contextType, categoryUrlId, searchQuery, garageCalculationId)
  getProductFilterOptions(contextType, categoryUrlId = null, searchQuery = null, garageCalculationId = null) {
    let baseProducts = [];
    const productsAll = this._getFromStorage('products');

    if (contextType === 'category') {
      baseProducts = this._getProductsForCategoryUrlId(categoryUrlId);
    } else if (contextType === 'search') {
      const res = this.searchProducts(searchQuery || '', {}, 'relevance', 1, Number.MAX_SAFE_INTEGER);
      baseProducts = res.products.map(pi => pi.product);
    } else if (contextType === 'garage_recommendation') {
      const calculations = this._getFromStorage('garage_calculations');
      const calc = calculations.find(c => c.id === garageCalculationId) || null;
      if (calc) {
        const minCfm = typeof calc.recommended_min_cfm === 'number' ? calc.recommended_min_cfm : calc.calculated_cfm;
        const maxCfm = typeof calc.recommended_max_cfm === 'number' ? calc.recommended_max_cfm : calc.calculated_cfm;
        baseProducts = productsAll.filter(p => {
          if (p.status !== 'active') return false;
          if (p.product_type !== 'garage_fan') return false;
          if (typeof p.airflow_cfm !== 'number') return false;
          return p.airflow_cfm >= minCfm && p.airflow_cfm <= maxCfm;
        });
      } else {
        baseProducts = [];
      }
    } else {
      baseProducts = productsAll.filter(p => p.status === 'active');
    }

    const prices = baseProducts.map(p => p.price).filter(v => typeof v === 'number');
    const soundLevels = baseProducts.map(p => p.sound_level_sones).filter(v => typeof v === 'number');
    const diameters = [...new Set(baseProducts.map(p => p.diameter_inch).filter(v => typeof v === 'number'))];
    const airflows = baseProducts.map(p => p.airflow_cfm).filter(v => typeof v === 'number');
    const sizeLabels = [...new Set(baseProducts.map(p => p.size_label).filter(v => !!v))];
    const mervRatings = [...new Set(baseProducts.map(p => p.merv_rating).filter(v => typeof v === 'number'))];
    const packSizes = [...new Set(baseProducts.map(p => p.pack_size).filter(v => typeof v === 'number'))];
    const roofTypeOptions = [...new Set(baseProducts.map(p => p.roof_type).filter(v => !!v))];
    const energyRatingOptions = [...new Set(baseProducts.map(p => p.energy_rating).filter(v => !!v))];

    const price = {
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
      step: 1
    };

    const soundLevelSones = {
      min: soundLevels.length ? Math.min(...soundLevels) : null,
      max: soundLevels.length ? Math.max(...soundLevels) : null,
      options: [
        { label: '1.5 or less', maxValue: 1.5 },
        { label: '2.0 or less', maxValue: 2.0 },
        { label: '3.0 or less', maxValue: 3.0 }
      ]
    };

    const customerRatingBuckets = [
      { label: '4 stars & up', minValue: 4 },
      { label: '3 stars & up', minValue: 3 },
      { label: '2 stars & up', minValue: 2 },
      { label: '1 star & up', minValue: 1 }
    ];

    const airflowCfm = {
      min: airflows.length ? Math.min(...airflows) : null,
      max: airflows.length ? Math.max(...airflows) : null,
      step: 10
    };

    // Shipping options derived from product-level free shipping availability
    const anyFreeShipping = baseProducts.some(p => p.is_free_shipping);
    const shippingOptions = anyFreeShipping
      ? [
          {
            code: 'free_shipping',
            label: 'Free shipping',
            supportsFreeShipping: true
          }
        ]
      : [];

    const defaultSort = 'customer_rating_high_to_low';

    return {
      price,
      soundLevelSones,
      customerRatingBuckets,
      diameterOptionsInch: diameters,
      airflowCfm,
      sizeLabels,
      mervRatings,
      packSizeOptions: packSizes,
      shippingOptions,
      roofTypeOptions,
      energyRatingOptions,
      defaultSort
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const documents = this._getFromStorage('documents');
    const services = this._getFromStorage('services');

    const product = products.find(p => p.id === productId) || null;

    if (!product) {
      return {
        product: null,
        categoryName: null,
        detailedDescription: '',
        specifications: {
          soundLevelSones: null,
          airflowCfm: null,
          diameterInch: null,
          sizeLabel: null,
          mervRating: null,
          packSize: null,
          roofType: null,
          energyRating: null,
          powerWatts: null
        },
        documents: [],
        relatedTools: [],
        relatedServices: [],
        canAddToCart: false,
        canAddToQuote: false,
        canAddToWishlist: false,
        defaultQuantity: 1
      };
    }

    const category = categories.find(c => c.id === product.primary_category_id) || null;
    const productDocuments = documents.filter(d => d.productId === product.id);

    // Simple related services heuristic: all bookable services
    const relatedServices = services
      .filter(s => s.is_bookable)
      .map(s => ({
        service: s,
        teaser: s.description || ''
      }));

    const detailedDescription = product.description || '';
    const specifications = {
      soundLevelSones: typeof product.sound_level_sones === 'number' ? product.sound_level_sones : null,
      airflowCfm: typeof product.airflow_cfm === 'number' ? product.airflow_cfm : null,
      diameterInch: typeof product.diameter_inch === 'number' ? product.diameter_inch : null,
      sizeLabel: product.size_label || null,
      mervRating: typeof product.merv_rating === 'number' ? product.merv_rating : null,
      packSize: typeof product.pack_size === 'number' ? product.pack_size : null,
      roofType: product.roof_type || null,
      energyRating: product.energy_rating || null,
      powerWatts: typeof product.power_watts === 'number' ? product.power_watts : null
    };

    const canAddToCart = !!product.is_add_to_cart_enabled && !!product.is_available && product.status === 'active';
    const canAddToQuote = !!product.is_quote_eligible;
    const canAddToWishlist = !!product.is_wishlist_enabled;

    return {
      product,
      categoryName: category ? category.name : null,
      detailedDescription,
      specifications,
      documents: productDocuments,
      relatedTools: [], // no explicit tools catalog stored; return empty
      relatedServices,
      canAddToCart,
      canAddToQuote,
      canAddToWishlist,
      defaultQuantity: 1
    };
  }

  // addProductToCart(productId, quantity)
  addProductToCart(productId, quantity = 1) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, cart: null, cartItem: null, cartItemCount: 0, message: 'Product not found' };
    }
    if (!product.is_add_to_cart_enabled || !product.is_available || product.status !== 'active') {
      return { success: false, cart: null, cartItem: null, cartItemCount: 0, message: 'Product cannot be added to cart' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const qty = Math.max(1, Math.floor(quantity));

    let cartItem = cartItems.find(ci => ci.cartId === cart.id && ci.product_type === 'product' && ci.productId === productId);

    if (cartItem) {
      cartItem.quantity += qty;
      const unitPrice = typeof cartItem.unit_price === 'number' ? cartItem.unit_price : (typeof product.price === 'number' ? product.price : 0);
      cartItem.unit_price = unitPrice;
      cartItem.line_total = unitPrice * cartItem.quantity;
    } else {
      const unitPrice = typeof product.price === 'number' ? product.price : 0;
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        product_type: 'product',
        productId: product.id,
        customKitId: null,
        quantity: qty,
        unit_price: unitPrice,
        line_total: unitPrice * qty
      };
      cartItems.push(cartItem);
    }

    cart.updated_at = this._nowIso();

    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    const cartItemCount = cartItems.filter(ci => ci.cartId === cart.id).reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      success: true,
      cart,
      cartItem,
      cartItemCount,
      message: 'Product added to cart'
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    const products = this._getFromStorage('products');
    const kits = this._getFromStorage('custom_ducting_kits');

    const items = cartItems.map(ci => {
      const product = ci.product_type === 'product' ? (products.find(p => p.id === ci.productId) || null) : null;
      const customDuctingKit = ci.product_type === 'custom_ducting_kit' ? (kits.find(k => k.id === ci.customKitId) || null) : null;
      let displayName = '';
      if (product) displayName = product.name || 'Product';
      else if (customDuctingKit) displayName = customDuctingKit.description || 'Custom ducting kit';
      else displayName = 'Item';
      const thumbnailUrl = product && Array.isArray(product.image_urls) && product.image_urls.length > 0 ? product.image_urls[0] : null;
      const lineTotalDisplay = typeof ci.line_total === 'number' ? `$${ci.line_total.toFixed(2)}` : '$0.00';
      return {
        cartItem: ci,
        product,
        customDuctingKit,
        displayName,
        thumbnailUrl,
        lineTotalDisplay
      };
    });

    const subtotal = items.reduce((sum, it) => sum + (typeof it.cartItem.line_total === 'number' ? it.cartItem.line_total : 0), 0);
    const estimatedTax = 0;
    const subtotalDisplay = `$${subtotal.toFixed(2)}`;
    const estimatedTaxDisplay = `$${estimatedTax.toFixed(2)}`;

    const shippingEstimateResolved = this._getLatestShippingEstimateForCart(cart.id);
    const shippingCost = shippingEstimateResolved ? shippingEstimateResolved.estimated_cost : 0;

    const grandTotal = subtotal + estimatedTax + shippingCost;
    const grandTotalDisplay = `$${grandTotal.toFixed(2)}`;

    return {
      cart,
      items,
      subtotal,
      subtotalDisplay,
      estimatedTax,
      estimatedTaxDisplay,
      shippingEstimate: shippingEstimateResolved,
      grandTotal,
      grandTotalDisplay
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const kits = this._getFromStorage('custom_ducting_kits');

    const idx = cartItems.findIndex(ci => ci.id === cartItemId && ci.cartId === cart.id);
    if (idx === -1) {
      return { success: false, cart, updatedItem: null, cartItemCount: 0, message: 'Cart item not found' };
    }

    let updatedItem = cartItems[idx];
    const qty = Math.floor(quantity);

    if (qty <= 0) {
      cartItems.splice(idx, 1);
      updatedItem = null;
    } else {
      updatedItem.quantity = qty;
      if (updatedItem.product_type === 'product') {
        const product = products.find(p => p.id === updatedItem.productId) || null;
        const unitPrice = typeof product && typeof product.price === 'number' ? product.price : (updatedItem.unit_price || 0);
        updatedItem.unit_price = unitPrice;
        updatedItem.line_total = unitPrice * qty;
      } else if (updatedItem.product_type === 'custom_ducting_kit') {
        const kit = kits.find(k => k.id === updatedItem.customKitId) || null;
        const unitPrice = kit && typeof kit.price === 'number' ? kit.price : (updatedItem.unit_price || 0);
        updatedItem.unit_price = unitPrice;
        updatedItem.line_total = unitPrice * qty;
      }
      cartItems[idx] = updatedItem;
    }

    cart.updated_at = this._nowIso();

    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts');
    const cIdx = carts.findIndex(c => c.id === cart.id);
    if (cIdx >= 0) {
      carts[cIdx] = cart;
      this._saveToStorage('carts', carts);
    }

    const cartItemCount = cartItems.filter(ci => ci.cartId === cart.id).reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      success: true,
      cart,
      updatedItem,
      cartItemCount,
      message: updatedItem ? 'Cart item updated' : 'Cart item removed'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const beforeLength = cartItems.length;
    cartItems = cartItems.filter(ci => !(ci.id === cartItemId && ci.cartId === cart.id));

    const removed = cartItems.length !== beforeLength;

    if (removed) {
      cart.updated_at = this._nowIso();
      const carts = this._getFromStorage('carts');
      const cIdx = carts.findIndex(c => c.id === cart.id);
      if (cIdx >= 0) {
        carts[cIdx] = cart;
        this._saveToStorage('carts', carts);
      }
    }

    this._saveToStorage('cart_items', cartItems);

    const cartItemCount = cartItems.filter(ci => ci.cartId === cart.id).reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      success: removed,
      cart,
      cartItemCount,
      message: removed ? 'Cart item removed' : 'Cart item not found'
    };
  }

  // getShippingMethodsForCart(destinationZip)
  getShippingMethodsForCart(destinationZip) {
    const shippingMethods = this._getFromStorage('shipping_methods');
    const methods = shippingMethods.map(sm => {
      const estimatedCost = typeof sm.base_rate === 'number' ? sm.base_rate : 0;
      const estimatedCostDisplay = `$${estimatedCost.toFixed(2)}`;
      return {
        shippingMethod: sm,
        estimatedCost,
        estimatedCostDisplay
      };
    });

    return {
      destinationZip,
      methods
    };
  }

  // applyShippingMethodToCart(shippingMethodId, destinationZip)
  applyShippingMethodToCart(shippingMethodId, destinationZip) {
    const cart = this._getOrCreateCart();
    const estimate = this._createOrUpdateShippingEstimate(cart.id, shippingMethodId, destinationZip);

    return {
      success: true,
      shippingEstimate: estimate,
      cart,
      message: 'Shipping estimate applied to cart'
    };
  }

  // addProductToQuoteDraft(productId, quantity)
  addProductToQuoteDraft(productId, quantity = 1) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, quoteRequest: null, quoteItems: [], totalItems: 0, message: 'Product not found' };
    }

    const quoteRequest = this._getOrCreateQuoteDraft();
    const quoteItems = this._getFromStorage('quote_items');

    const qty = Math.max(1, Math.floor(quantity));
    let item = quoteItems.find(qi => qi.quoteRequestId === quoteRequest.id && qi.productId === productId);

    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('quote_item'),
        quoteRequestId: quoteRequest.id,
        productId: product.id,
        quantity: qty,
        unit_price: typeof product.price === 'number' ? product.price : null,
        line_total: null
      };
      if (typeof item.unit_price === 'number') {
        item.line_total = item.unit_price * item.quantity;
      }
      quoteItems.push(item);
    }

    this._saveToStorage('quote_items', quoteItems);
    const allItemsForQuote = quoteItems.filter(qi => qi.quoteRequestId === quoteRequest.id);
    const totalItems = allItemsForQuote.reduce((sum, qi) => sum + (qi.quantity || 0), 0);

    return {
      success: true,
      quoteRequest,
      quoteItems: allItemsForQuote,
      totalItems,
      message: 'Product added to quote draft'
    };
  }

  // getCurrentQuoteRequest()
  getCurrentQuoteRequest() {
    const quoteRequests = this._getFromStorage('quote_requests');
    const products = this._getFromStorage('products');

    const quoteRequest = quoteRequests.find(q => q.status === 'draft') || null;
    if (!quoteRequest) {
      return {
        quoteRequest: null,
        items: [],
        estimatedSubtotal: 0,
        estimatedSubtotalDisplay: '$0.00'
      };
    }

    const quoteItems = this._getFromStorage('quote_items').filter(qi => qi.quoteRequestId === quoteRequest.id);

    const items = quoteItems.map(qi => {
      const product = products.find(p => p.id === qi.productId) || null;
      const displayName = product ? product.name || 'Product' : 'Product';
      return {
        quoteItem: qi,
        product,
        displayName
      };
    });

    let estimatedSubtotal = 0;
    for (const it of items) {
      const qi = it.quoteItem;
      if (typeof qi.line_total === 'number') {
        estimatedSubtotal += qi.line_total;
      } else if (it.product && typeof it.product.price === 'number') {
        estimatedSubtotal += it.product.price * (qi.quantity || 0);
      }
    }

    const estimatedSubtotalDisplay = `$${estimatedSubtotal.toFixed(2)}`;

    return {
      quoteRequest,
      items,
      estimatedSubtotal,
      estimatedSubtotalDisplay
    };
  }

  // updateQuoteItemQuantity(quoteItemId, quantity)
  updateQuoteItemQuantity(quoteItemId, quantity) {
    const quoteRequests = this._getFromStorage('quote_requests');
    let quoteItems = this._getFromStorage('quote_items');
    const products = this._getFromStorage('products');

    const idx = quoteItems.findIndex(qi => qi.id === quoteItemId);
    if (idx === -1) {
      return { success: false, quoteRequest: null, updatedItem: null, message: 'Quote item not found' };
    }

    const item = quoteItems[idx];
    const quoteRequest = quoteRequests.find(q => q.id === item.quoteRequestId) || null;

    const qty = Math.floor(quantity);
    let updatedItem = item;

    if (qty <= 0) {
      quoteItems.splice(idx, 1);
      updatedItem = null;
    } else {
      updatedItem.quantity = qty;
      const product = products.find(p => p.id === updatedItem.productId) || null;
      const unitPrice = typeof product && typeof product.price === 'number' ? product.price : updatedItem.unit_price;
      updatedItem.unit_price = unitPrice;
      if (typeof unitPrice === 'number') {
        updatedItem.line_total = unitPrice * updatedItem.quantity;
      }
      quoteItems[idx] = updatedItem;
    }

    this._saveToStorage('quote_items', quoteItems);

    return {
      success: true,
      quoteRequest,
      updatedItem,
      message: updatedItem ? 'Quote item updated' : 'Quote item removed'
    };
  }

  // removeQuoteItem(quoteItemId)
  removeQuoteItem(quoteItemId) {
    const quoteRequests = this._getFromStorage('quote_requests');
    let quoteItems = this._getFromStorage('quote_items');

    const item = quoteItems.find(qi => qi.id === quoteItemId) || null;
    if (!item) {
      return { success: false, quoteRequest: null, message: 'Quote item not found' };
    }

    const quoteRequest = quoteRequests.find(q => q.id === item.quoteRequestId) || null;
    quoteItems = quoteItems.filter(qi => qi.id !== quoteItemId);
    this._saveToStorage('quote_items', quoteItems);

    return {
      success: true,
      quoteRequest,
      message: 'Quote item removed'
    };
  }

  // submitQuoteRequestDraft(projectName, contactName, contactEmail, contactPhone, companyName, notes)
  submitQuoteRequestDraft(projectName, contactName, contactEmail, contactPhone, companyName = null, notes = null) {
    let quoteRequests = this._getFromStorage('quote_requests');
    const idx = quoteRequests.findIndex(q => q.status === 'draft');
    if (idx === -1) {
      return { success: false, quoteRequest: null, message: 'No draft quote request found' };
    }

    const quoteRequest = quoteRequests[idx];
    quoteRequest.project_name = projectName;
    quoteRequest.contact_name = contactName;
    quoteRequest.contact_email = contactEmail;
    quoteRequest.contact_phone = contactPhone;
    quoteRequest.company_name = companyName;
    quoteRequest.notes = notes;
    quoteRequest.status = 'submitted';
    quoteRequest.submitted_at = this._nowIso();

    quoteRequests[idx] = quoteRequest;
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      quoteRequest,
      message: 'Quote request submitted'
    };
  }

  // requestQuoteForProduct(productId, quantity, projectName, contactName, contactEmail, contactPhone, companyName, notes)
  requestQuoteForProduct(productId, quantity = 1, projectName, contactName = null, contactEmail = null, contactPhone = null, companyName = null, notes = null) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, quoteRequest: null, message: 'Product not found' };
    }

    const now = this._nowIso();
    const quoteRequests = this._getFromStorage('quote_requests');
    const quoteItems = this._getFromStorage('quote_items');

    const quoteRequest = {
      id: this._generateId('quote'),
      status: 'submitted',
      project_name: projectName,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      company_name: companyName,
      notes,
      created_at: now,
      submitted_at: now
    };
    quoteRequests.push(quoteRequest);

    const qty = Math.max(1, Math.floor(quantity));
    const unitPrice = typeof product.price === 'number' ? product.price : null;
    const quoteItem = {
      id: this._generateId('quote_item'),
      quoteRequestId: quoteRequest.id,
      productId: product.id,
      quantity: qty,
      unit_price: unitPrice,
      line_total: unitPrice != null ? unitPrice * qty : null
    };
    quoteItems.push(quoteItem);

    this._saveToStorage('quote_requests', quoteRequests);
    this._saveToStorage('quote_items', quoteItems);

    return {
      success: true,
      quoteRequest,
      message: 'Quote request submitted'
    };
  }

  // addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { success: false, wishlist: null, wishlistItem: null, wishlistCount: 0, message: 'Product not found' };
    }
    if (!product.is_wishlist_enabled) {
      return { success: false, wishlist: null, wishlistItem: null, wishlistCount: 0, message: 'Product cannot be wishlisted' };
    }

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');

    let existing = wishlistItems.find(wi => wi.wishlistId === wishlist.id && wi.productId === productId);
    if (existing) {
      const wishlistCount = wishlistItems.filter(wi => wi.wishlistId === wishlist.id).length;
      return {
        success: true,
        wishlist,
        wishlistItem: existing,
        wishlistCount,
        message: 'Product already in wishlist'
      };
    }

    const wishlistItem = {
      id: this._generateId('wishlist_item'),
      wishlistId: wishlist.id,
      productId: product.id,
      added_at: this._nowIso()
    };
    wishlistItems.push(wishlistItem);
    wishlist.updated_at = this._nowIso();

    this._saveToStorage('wishlist_items', wishlistItems);
    const wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx] = wishlist;
      this._saveToStorage('wishlists', wishlists);
    }

    const wishlistCount = wishlistItems.filter(wi => wi.wishlistId === wishlist.id).length;

    return {
      success: true,
      wishlist,
      wishlistItem,
      wishlistCount,
      message: 'Product added to wishlist'
    };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(wi => wi.wishlistId === wishlist.id);
    const products = this._getFromStorage('products');

    const items = wishlistItems.map(wi => {
      const product = products.find(p => p.id === wi.productId) || null;
      const displayName = product ? product.name || 'Product' : 'Product';
      const thumbnailUrl = product && Array.isArray(product.image_urls) && product.image_urls.length > 0 ? product.image_urls[0] : null;
      const priceDisplay = product && typeof product.price === 'number' ? `$${product.price.toFixed(2)}` : (product ? 'Contact for price' : null);
      const averageRating = product && typeof product.average_rating === 'number' ? product.average_rating : null;
      const isAvailable = product ? !!product.is_available : false;

      return {
        wishlistItem: wi,
        product,
        displayName,
        thumbnailUrl,
        priceDisplay,
        averageRating,
        isAvailable
      };
    });

    return {
      wishlist,
      items
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');
    const beforeLength = wishlistItems.length;
    wishlistItems = wishlistItems.filter(wi => wi.id !== wishlistItemId || wi.wishlistId !== wishlist.id);
    const removed = wishlistItems.length !== beforeLength;

    if (removed) {
      wishlist.updated_at = this._nowIso();
      const wishlists = this._getFromStorage('wishlists');
      const idx = wishlists.findIndex(w => w.id === wishlist.id);
      if (idx >= 0) {
        wishlists[idx] = wishlist;
        this._saveToStorage('wishlists', wishlists);
      }
    }

    this._saveToStorage('wishlist_items', wishlistItems);
    const wishlistCount = wishlistItems.filter(wi => wi.wishlistId === wishlist.id).length;

    return {
      success: removed,
      wishlist,
      wishlistCount,
      message: removed ? 'Wishlist item removed' : 'Wishlist item not found'
    };
  }

  // moveWishlistItemToCart(wishlistItemId, quantity)
  moveWishlistItemToCart(wishlistItemId, quantity = 1) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');
    const wi = wishlistItems.find(x => x.id === wishlistItemId && x.wishlistId === wishlist.id) || null;
    if (!wi) {
      return {
        success: false,
        cart: null,
        cartItem: null,
        wishlist,
        message: 'Wishlist item not found'
      };
    }

    const resultAdd = this.addProductToCart(wi.productId, quantity);

    // Remove from wishlist
    wishlistItems = wishlistItems.filter(x => x.id !== wishlistItemId);
    wishlist.updated_at = this._nowIso();
    this._saveToStorage('wishlist_items', wishlistItems);
    const wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx] = wishlist;
      this._saveToStorage('wishlists', wishlists);
    }

    return {
      success: resultAdd.success,
      cart: resultAdd.cart,
      cartItem: resultAdd.cartItem,
      wishlist,
      message: resultAdd.success ? 'Wishlist item moved to cart' : resultAdd.message
    };
  }

  // getToolsAndCalculatorsList()
  getToolsAndCalculatorsList() {
    // Tools are stored (if present) in 'tools_calculators' as plain objects
    const tools = this._getFromStorage('tools_calculators');
    return tools;
  }

  // calculateGarageVentilation(lengthFt, widthFt, heightFt, usageType)
  calculateGarageVentilation(lengthFt, widthFt, heightFt, usageType) {
    const l = Number(lengthFt) || 0;
    const w = Number(widthFt) || 0;
    const h = Number(heightFt) || 0;
    const volume = l * w * h;

    let ach = 5; // air changes per hour default
    if (usageType === 'parking_only') ach = 6;
    else if (usageType === 'parking_and_workshop') ach = 10;
    else if (usageType === 'storage_only') ach = 3;
    else if (usageType === 'other') ach = 5;

    const resultCfmRaw = volume * ach / 60;
    const resultCfm = Math.round(resultCfmRaw);
    const recommendedMinCfm = Math.round(resultCfmRaw * 0.9);
    const recommendedMaxCfm = Math.round(resultCfmRaw * 1.1);

    const calculation = this._createGarageVentilationCalculationRecord(l, w, h, usageType, resultCfm, recommendedMinCfm, recommendedMaxCfm);

    const guidanceText = `For a garage of ${l}x${w}x${h} ft used for ${usageType.replace(/_/g, ' ')}, an airflow of around ${resultCfm} CFM is recommended (range ${recommendedMinCfm}-${recommendedMaxCfm} CFM).`;

    return {
      calculation,
      resultCfm,
      recommendedMinCfm,
      recommendedMaxCfm,
      guidanceText
    };
  }

  // getServicesOverview()
  getServicesOverview() {
    const services = this._getFromStorage('services');
    return services.map(s => ({
      service: s,
      shortDescription: s.description || '',
      keyBenefits: [],
      isFeatured: false
    }));
  }

  // getServiceDetails(serviceSlug)
  getServiceDetails(serviceSlug) {
    const services = this._getFromStorage('services');
    const service = services.find(s => s.slug === serviceSlug) || null;
    if (!service) {
      return {
        service: null,
        detailedDescription: '',
        coverageAreas: [],
        benefits: [],
        faqs: []
      };
    }

    return {
      service,
      detailedDescription: service.description || '',
      coverageAreas: [],
      benefits: [],
      faqs: []
    };
  }

  // getAvailableServiceTimeSlots(serviceId, locationType, startDate, endDate)
  getAvailableServiceTimeSlots(serviceId, locationType, startDate, endDate) {
    const slots = this._getFromStorage('service_time_slots');
    const services = this._getFromStorage('services');
    const service = services.find(s => s.id === serviceId) || null;

    const startIso = `${startDate}T00:00:00`;
    const endIso = `${endDate}T23:59:59`;

    const results = slots
      .filter(ts => ts.serviceId === serviceId && ts.location_type === locationType && ts.is_available)
      .filter(ts => {
        const sd = ts.start_datetime || ts.startDatetime;
        if (!sd) return false;
        return sd >= startIso && sd <= endIso;
      })
      .map(ts => ({
        timeSlot: ts,
        service
      }));

    return results;
  }

  // createAppointmentRequest(serviceId, locationType, startDatetime, endDatetime, contactName, contactEmail, contactPhone, streetAddress, notes)
  createAppointmentRequest(serviceId, locationType, startDatetime, endDatetime, contactName, contactEmail, contactPhone, streetAddress, notes = null) {
    const services = this._getFromStorage('services');
    const service = services.find(s => s.id === serviceId) || null;
    if (!service || !service.is_bookable) {
      return { success: false, appointmentRequest: null, message: 'Service not bookable or not found' };
    }

    const appointmentRequests = this._getFromStorage('appointment_requests');

    const appointmentRequest = {
      id: this._generateId('appt'),
      serviceId,
      location_type: locationType,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      status: 'requested',
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      street_address: streetAddress,
      notes,
      created_at: this._nowIso()
    };

    appointmentRequests.push(appointmentRequest);
    this._saveToStorage('appointment_requests', appointmentRequests);

    return {
      success: true,
      appointmentRequest,
      message: 'Appointment request submitted'
    };
  }

  // getCurrentProductComparison()
  getCurrentProductComparison() {
    const comparison = this._getOrCreateProductComparison();
    const comparisonItems = this._getFromStorage('comparison_items').filter(ci => ci.comparisonId === comparison.id);
    const products = this._getFromStorage('products');

    const items = comparisonItems.map(ci => {
      const product = products.find(p => p.id === ci.productId) || null;
      const specificationSummary = {
        price: product && typeof product.price === 'number' ? product.price : null,
        airflowCfm: product && typeof product.airflow_cfm === 'number' ? product.airflow_cfm : null,
        powerWatts: product && typeof product.power_watts === 'number' ? product.power_watts : null,
        energyRating: product ? product.energy_rating || null : null
      };
      return {
        comparisonItem: ci,
        product,
        specificationSummary,
        isMostEnergyEfficient: false
      };
    });

    // Determine most energy-efficient (lowest powerWatts > 0)
    let lowestPowerProductId = null;
    let lowestPower = Number.POSITIVE_INFINITY;
    for (const it of items) {
      const pw = it.specificationSummary.powerWatts;
      if (typeof pw === 'number' && pw > 0 && pw < lowestPower) {
        lowestPower = pw;
        lowestPowerProductId = it.product ? it.product.id : null;
      }
    }

    const updatedItems = items.map(it => ({
      ...it,
      isMostEnergyEfficient: it.product ? it.product.id === lowestPowerProductId : false
    }));

    return {
      comparison,
      items: updatedItems,
      lowestPowerProductId
    };
  }

  // addProductToComparison(productId)
  addProductToComparison(productId) {
    const comparison = this._getOrCreateProductComparison();
    let comparisonItems = this._getFromStorage('comparison_items');

    const already = comparisonItems.find(ci => ci.comparisonId === comparison.id && ci.productId === productId);
    if (!already) {
      const position = comparisonItems.filter(ci => ci.comparisonId === comparison.id).length;
      const newItem = {
        id: this._generateId('cmp_item'),
        comparisonId: comparison.id,
        productId,
        position
      };
      comparisonItems.push(newItem);
      this._saveToStorage('comparison_items', comparisonItems);
    }

    const itemsForComparison = comparisonItems.filter(ci => ci.comparisonId === comparison.id);

    return {
      comparison,
      items: itemsForComparison,
      totalItems: itemsForComparison.length,
      message: already ? 'Product already in comparison' : 'Product added to comparison'
    };
  }

  // removeProductFromComparison(comparisonItemId)
  removeProductFromComparison(comparisonItemId) {
    const comparison = this._getOrCreateProductComparison();
    let comparisonItems = this._getFromStorage('comparison_items');
    comparisonItems = comparisonItems.filter(ci => ci.id !== comparisonItemId);
    this._saveToStorage('comparison_items', comparisonItems);

    const items = comparisonItems.filter(ci => ci.comparisonId === comparison.id);

    return {
      comparison,
      items,
      message: 'Comparison item removed'
    };
  }

  // clearProductComparison()
  clearProductComparison() {
    const comparison = this._getOrCreateProductComparison();
    let comparisonItems = this._getFromStorage('comparison_items');
    comparisonItems = comparisonItems.filter(ci => ci.comparisonId !== comparison.id);
    this._saveToStorage('comparison_items', comparisonItems);

    return {
      comparison,
      items: [],
      message: 'Comparison cleared',
      success: true
    };
  }

  // openDocumentViewer(documentId)
  openDocumentViewer(documentId) {
    const documents = this._getFromStorage('documents');
    const products = this._getFromStorage('products');

    const document = documents.find(d => d.id === documentId) || null;
    if (!document) {
      return {
        document: null,
        viewerState: null,
        product: null
      };
    }

    const viewerState = this._getOrCreateDocumentViewerState(documentId);
    const product = products.find(p => p.id === document.productId) || null;

    return {
      document,
      viewerState,
      product
    };
  }

  // zoomDocumentViewer(viewerStateId, direction, step)
  zoomDocumentViewer(viewerStateId, direction, step = 1) {
    const states = this._getFromStorage('document_viewer_states');
    const idx = states.findIndex(s => s.id === viewerStateId);
    if (idx === -1) {
      return { viewerState: null };
    }
    const state = states[idx];
    const delta = Math.abs(step) || 1;
    if (direction === 'in') {
      state.zoom_level += delta;
    } else if (direction === 'out') {
      state.zoom_level -= delta;
    }
    if (state.zoom_level < 0.1) state.zoom_level = 0.1;
    states[idx] = state;
    this._saveToStorage('document_viewer_states', states);
    return { viewerState: state };
  }

  // goToDocumentPage(viewerStateId, pageNumber)
  goToDocumentPage(viewerStateId, pageNumber) {
    const states = this._getFromStorage('document_viewer_states');
    const idx = states.findIndex(s => s.id === viewerStateId);
    if (idx === -1) {
      return { viewerState: null };
    }
    const state = states[idx];
    const page = Math.max(1, Math.floor(pageNumber));
    state.current_page = page;
    states[idx] = state;
    this._saveToStorage('document_viewer_states', states);
    return { viewerState: state };
  }

  // createCustomDuctingKit(applicationType, ductDiameterInch, ductLengthFeet, numberOfClamps, grilleStyle)
  createCustomDuctingKit(applicationType, ductDiameterInch, ductLengthFeet, numberOfClamps, grilleStyle) {
    const price = this._calculateCustomDuctingKitPrice(applicationType, ductDiameterInch, ductLengthFeet, numberOfClamps, grilleStyle);
    const kits = this._getFromStorage('custom_ducting_kits');

    const description = `Custom ${applicationType.replace(/_/g, ' ')} kit: ${ductDiameterInch}\" diameter, ${ductLengthFeet} ft, ${numberOfClamps} clamps, ${grilleStyle.replace(/_/g, ' ')}.`;

    const customDuctingKit = {
      id: this._generateId('kit'),
      application_type: applicationType,
      duct_diameter_inch: ductDiameterInch,
      duct_length_feet: ductLengthFeet,
      number_of_clamps: numberOfClamps,
      grille_style: grilleStyle,
      price,
      description,
      created_at: this._nowIso()
    };

    kits.push(customDuctingKit);
    this._saveToStorage('custom_ducting_kits', kits);

    const priceDisplay = `$${price.toFixed(2)}`;
    const summary = description;

    return {
      customDuctingKit,
      priceDisplay,
      summary
    };
  }

  // addCustomDuctingKitToCart(customKitId, quantity)
  addCustomDuctingKitToCart(customKitId, quantity = 1) {
    const kits = this._getFromStorage('custom_ducting_kits');
    const kit = kits.find(k => k.id === customKitId) || null;
    if (!kit) {
      return { success: false, cart: null, cartItem: null, cartItemCount: 0, message: 'Custom kit not found' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const qty = Math.max(1, Math.floor(quantity));

    let cartItem = cartItems.find(ci => ci.cartId === cart.id && ci.product_type === 'custom_ducting_kit' && ci.customKitId === customKitId);

    if (cartItem) {
      cartItem.quantity += qty;
      const unitPrice = typeof cartItem.unit_price === 'number' ? cartItem.unit_price : (typeof kit.price === 'number' ? kit.price : 0);
      cartItem.unit_price = unitPrice;
      cartItem.line_total = unitPrice * cartItem.quantity;
    } else {
      const unitPrice = typeof kit.price === 'number' ? kit.price : 0;
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        product_type: 'custom_ducting_kit',
        productId: null,
        customKitId: kit.id,
        quantity: qty,
        unit_price: unitPrice,
        line_total: unitPrice * qty
      };
      cartItems.push(cartItem);
    }

    cart.updated_at = this._nowIso();

    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    const cartItemCount = cartItems.filter(ci => ci.cartId === cart.id).reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      success: true,
      cart,
      cartItem,
      cartItemCount,
      message: 'Custom ducting kit added to cart'
    };
  }

  // getHomePageContent()
  getHomePageContent() {
    const categories = this._getFromStorage('categories');
    const products = this._getFromStorage('products');
    const tools = this._getFromStorage('tools_calculators');
    const services = this._getFromStorage('services');

    const featuredCategories = categories.slice(0, 4).map(c => ({
      category: c,
      highlightText: `Explore ${c.name}`
    }));

    const activeProducts = products.filter(p => p.status === 'active' && p.is_available);
    const featuredProducts = activeProducts.slice(0, 4).map(p => ({
      product: p,
      highlightReason: 'Featured product'
    }));

    const promotedTools = tools;
    const promotedServices = services.slice(0, 4).map(s => ({
      service: s,
      teaser: s.description || ''
    }));

    return {
      featuredCategories,
      featuredProducts,
      promotedTools,
      promotedServices
    };
  }

  // getUserEngagementSummary()
  getUserEngagementSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    const cartItemCount = cartItems.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(wi => wi.wishlistId === wishlist.id);
    const wishlistCount = wishlistItems.length;

    const quoteRequests = this._getFromStorage('quote_requests');
    const quoteDraft = quoteRequests.find(q => q.status === 'draft') || null;
    const quoteItemsAll = this._getFromStorage('quote_items');
    const quoteItemCount = quoteDraft
      ? quoteItemsAll.filter(qi => qi.quoteRequestId === quoteDraft.id).reduce((sum, qi) => sum + (qi.quantity || 0), 0)
      : 0;

    return {
      cartItemCount,
      wishlistCount,
      quoteItemCount,
      lastUpdated: this._nowIso()
    };
  }

  // getPageContent(pageFilename)
  getPageContent(pageFilename) {
    const pages = this._getFromStorage('pages');
    const categories = this._getFromStorage('categories');
    const services = this._getFromStorage('services');

    const page = pages.find(p => p.filename === pageFilename) || null;

    if (!page) {
      return {
        page: null,
        title: '',
        sections: [],
        relatedCategories: [],
        relatedServices: [],
        contactCtaText: ''
      };
    }

    const title = page.name;
    const sections = [
      {
        heading: page.name,
        bodyHtml: page.description || ''
      }
    ];

    // No explicit relations; return empty arrays
    const relatedCategories = [];
    const relatedServices = [];

    const contactCtaText = 'Contact us for more details.';

    return {
      page,
      title,
      sections,
      relatedCategories,
      relatedServices,
      contactCtaText
    };
  }

  // submitContactRequest(name, email, phone, topic, message)
  submitContactRequest(name, email, phone = null, topic = null, messageText) {
    const contactRequests = this._getFromStorage('contact_requests');
    const ticketId = this._generateId('ticket');

    const record = {
      id: ticketId,
      name,
      email,
      phone,
      topic,
      message: messageText,
      created_at: this._nowIso()
    };

    contactRequests.push(record);
    this._saveToStorage('contact_requests', contactRequests);

    return {
      success: true,
      ticketId,
      message: 'Contact request submitted'
    };
  }

  // getShippingMethodsInfo()
  getShippingMethodsInfo() {
    const shippingMethods = this._getFromStorage('shipping_methods');
    return shippingMethods;
  }

  // -------------------- End of BusinessLogic class --------------------
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
