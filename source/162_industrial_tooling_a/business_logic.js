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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    const defaultArrays = [
      'users',
      'categories',
      'subcategories',
      'products',
      'product_variants',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'saved_lists',
      'saved_list_items',
      'quote_requests',
      'product_notes',
      'comparison_sets',
      'promotions',
      'homepage_featuredCategoryIds',
      'homepage_featuredProductIds',
      'homepage_featuredWorkflows',
      'static_pages',
      'contact_submissions'
    ];

    for (const key of defaultArrays) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // currentCartId, currentComparisonSetId, currentUserId, comparisonSourceContext
    // are created lazily when needed.
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _enumToLabel(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _filterProducts(products, filters) {
    if (!filters) return products;
    let result = products.slice();

    if (filters.minPrice != null) {
      result = result.filter(p => typeof p.price === 'number' && p.price >= filters.minPrice);
    }
    if (filters.maxPrice != null) {
      result = result.filter(p => typeof p.price === 'number' && p.price <= filters.maxPrice);
    }
    if (filters.material) {
      result = result.filter(p => p.material === filters.material);
    }
    if (filters.workpieceMaterials && Array.isArray(filters.workpieceMaterials) && filters.workpieceMaterials.length) {
      result = result.filter(p => {
        if (!Array.isArray(p.workpieceMaterials)) return false;
        return p.workpieceMaterials.some(wm => filters.workpieceMaterials.includes(wm));
      });
    }
    if (filters.jawWidthInch != null) {
      result = result.filter(p => p.jawWidthInch === filters.jawWidthInch);
    }
    if (filters.jawStyle) {
      result = result.filter(p => p.jawStyle === filters.jawStyle);
    }
    if (filters.spindleTaper) {
      result = result.filter(p => p.spindleTaper === filters.spindleTaper);
    }
    if (filters.torqueMinFtLb != null || filters.torqueMaxFtLb != null) {
      const fMin = filters.torqueMinFtLb;
      const fMax = filters.torqueMaxFtLb;
      result = result.filter(p => {
        if (typeof p.torqueMinFtLb !== 'number' || typeof p.torqueMaxFtLb !== 'number') return false;
        if (fMin != null && fMax != null) {
          return p.torqueMinFtLb <= fMin && p.torqueMaxFtLb >= fMax;
        }
        if (fMin != null) {
          return p.torqueMinFtLb <= fMin && p.torqueMaxFtLb >= fMin;
        }
        if (fMax != null) {
          return p.torqueMinFtLb <= fMax && p.torqueMaxFtLb >= fMax;
        }
        return true;
      });
    }
    if (filters.minCustomerRating != null) {
      result = result.filter(p => typeof p.customerRating === 'number' && p.customerRating >= filters.minCustomerRating);
    }
    if (filters.tSlotSizeMm != null) {
      result = result.filter(p => p.tSlotSizeMm === filters.tSlotSizeMm);
    }
    if (filters.clampingRangeMinMm != null || filters.clampingRangeMaxMm != null) {
      const fMin = filters.clampingRangeMinMm;
      const fMax = filters.clampingRangeMaxMm;
      result = result.filter(p => {
        if (typeof p.clampingRangeMinMm !== 'number' || typeof p.clampingRangeMaxMm !== 'number') return false;
        if (fMin != null && fMax != null) {
          return p.clampingRangeMinMm <= fMin && p.clampingRangeMaxMm >= fMax;
        }
        if (fMin != null) {
          return p.clampingRangeMinMm <= fMin && p.clampingRangeMaxMm >= fMin;
        }
        if (fMax != null) {
          return p.clampingRangeMinMm <= fMax && p.clampingRangeMaxMm >= fMax;
        }
        return true;
      });
    }
    if (filters.maxThreadSize) {
      result = result.filter(p => p.maxThreadSize === filters.maxThreadSize);
    }
    if (typeof filters.isCustomizable === 'boolean') {
      result = result.filter(p => p.isCustomizable === filters.isCustomizable);
    }
    if (typeof filters.freeShippingEligible === 'boolean') {
      result = result.filter(p => p.freeShippingEligible === filters.freeShippingEligible);
    }
    if (filters.componentType) {
      result = result.filter(p => p.componentType === filters.componentType);
    }
    if (filters.driveSize) {
      result = result.filter(p => p.driveSize === filters.driveSize);
    }
    if (filters.compatibleMachineType) {
      result = result.filter(p => {
        if (!Array.isArray(p.compatibleMachineTypes)) return false;
        return p.compatibleMachineTypes.includes(filters.compatibleMachineType);
      });
    }

    return result;
  }

  _sortProducts(products, sortBy) {
    const list = products.slice();
    switch (sortBy) {
      case 'price_low_to_high':
        list.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_high_to_low':
        list.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'customer_rating_high_to_low':
        list.sort((a, b) => (b.customerRating || 0) - (a.customerRating || 0));
        break;
      case 'newest':
        list.sort((a, b) => {
          const da = a.createdAt ? Date.parse(a.createdAt) : 0;
          const db = b.createdAt ? Date.parse(b.createdAt) : 0;
          return db - da;
        });
        break;
      case 'relevance':
      default:
        // Keep existing order for relevance in this simple implementation
        break;
    }
    return list;
  }

  _attachSubcategoryToProduct(product) {
    if (!product || !product.subcategoryId) return product;
    const subcategories = this._getFromStorage('subcategories');
    const subcategory = subcategories.find(s => s.id === product.subcategoryId) || null;
    return { ...product, subcategory };
  }

  // Internal helper to retrieve the current cart or create a new cart for the single-user context.
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('currentCartId');
    let cart = null;

    if (currentCartId) {
      cart = carts.find(c => c.id === currentCartId) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('currentCartId', cart.id);
    }

    return cart;
  }

  // Internal helper to calculate cart-level totals. Shipping and tax are simple estimates.
  _calculateCartTotals(cartItems) {
    const items = Array.isArray(cartItems) ? cartItems : [];
    const merchandiseSubtotal = items.reduce((sum, item) => sum + (item.lineSubtotal || 0), 0);
    const estimatedShipping = 0; // Could be enhanced with real rules
    const estimatedTax = 0; // Could be enhanced with real tax logic
    const orderTotal = merchandiseSubtotal + estimatedShipping + estimatedTax;
    return {
      merchandiseSubtotal,
      estimatedShipping,
      estimatedTax,
      orderTotal
    };
  }

  // Internal helper to retrieve the current signed-in user context.
  _getCurrentUser() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return null;
    const users = this._getFromStorage('users');
    return users.find(u => u.id === currentUserId) || null;
  }

  // Internal helper to retrieve or create the current comparison set.
  _getOrCreateComparisonSet(createIfMissing = true) {
    let sets = this._getFromStorage('comparison_sets');
    let currentId = localStorage.getItem('currentComparisonSetId');
    let set = null;

    if (currentId) {
      set = sets.find(s => s.id === currentId) || null;
    }

    if (!set && createIfMissing) {
      set = {
        id: this._generateId('cmp'),
        productIds: [],
        createdAt: this._nowIso()
      };
      sets.push(set);
      this._saveToStorage('comparison_sets', sets);
      localStorage.setItem('currentComparisonSetId', set.id);
    }

    return set || null;
  }

  // =========================
  // Core interface implementations
  // =========================

  // getNavigationCategories(): Category[]
  getNavigationCategories() {
    const categories = this._getFromStorage('categories');
    return categories.slice();
  }

  // getHomepageContent()
  getHomepageContent() {
    const categories = this._getFromStorage('categories');
    const products = this._getFromStorage('products').filter(p => p.isActive !== false);

    const featuredCategoryIds = this._getFromStorage('homepage_featuredCategoryIds');
    const featuredProductIds = this._getFromStorage('homepage_featuredProductIds');
    const promotions = this._getFromStorage('promotions');
    const featuredWorkflows = this._getFromStorage('homepage_featuredWorkflows');

    let featuredCategories;
    if (Array.isArray(featuredCategoryIds) && featuredCategoryIds.length) {
      featuredCategories = categories.filter(c => featuredCategoryIds.includes(c.id));
    } else {
      featuredCategories = categories.slice(0, 4);
    }

    let featuredProducts;
    if (Array.isArray(featuredProductIds) && featuredProductIds.length) {
      featuredProducts = products.filter(p => featuredProductIds.includes(p.id));
    } else {
      featuredProducts = this._sortProducts(products, 'customer_rating_high_to_low').slice(0, 8);
    }

    // Attach subcategory to products as foreign key resolution helper
    featuredProducts = featuredProducts.map(p => this._attachSubcategoryToProduct(p));

    return {
      featuredCategories,
      featuredProducts,
      promotions,
      featuredWorkflows
    };
  }

  // searchProducts(query, page, pageSize, sortBy, filters)
  searchProducts(query, page, pageSize, sortBy, filters) {
    if (page == null) page = 1;
    if (pageSize == null) pageSize = 20;
    if (!sortBy) sortBy = 'relevance';
    filters = filters || {};

    const allProducts = this._getFromStorage('products').filter(p => p.isActive !== false);
    const q = (query || '').trim().toLowerCase();

    let products = allProducts;
    if (q) {
      products = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const code = (p.productCode || '').toLowerCase();
        return name.includes(q) || desc.includes(q) || code.includes(q);
      });
    }

    products = this._filterProducts(products, filters);
    const sorted = this._sortProducts(products, sortBy);

    const totalResults = sorted.length;
    const start = (page - 1) * pageSize;
    const pageProducts = sorted.slice(start, start + pageSize).map(p => this._attachSubcategoryToProduct(p));

    const appliedFilters = { ...filters };

    const availableSortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'customer_rating_high_to_low', label: 'Customer Rating - High to Low' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      totalResults,
      page,
      pageSize,
      products: pageProducts,
      appliedFilters,
      availableSortOptions
    };
  }

  // getCategoryProducts(categoryKey, subcategoryId, page, pageSize, sortBy, filters)
  getCategoryProducts(categoryKey, subcategoryId, page, pageSize, sortBy, filters) {
    if (page == null) page = 1;
    if (pageSize == null) pageSize = 20;
    if (!sortBy) sortBy = 'relevance';
    filters = filters || {};

    const categories = this._getFromStorage('categories');
    const subcategories = this._getFromStorage('subcategories');
    const allProducts = this._getFromStorage('products').filter(p => p.isActive !== false);

    let products = allProducts.filter(p => p.categoryKey === categoryKey);
    if (subcategoryId) {
      products = products.filter(p => p.subcategoryId === subcategoryId);
    }

    products = this._filterProducts(products, filters);
    const sorted = this._sortProducts(products, sortBy);

    const totalResults = sorted.length;
    const start = (page - 1) * pageSize;
    const pageProducts = sorted.slice(start, start + pageSize).map(p => this._attachSubcategoryToProduct(p));

    const category = categories.find(c => c.key === categoryKey);
    const subcategory = subcategoryId ? subcategories.find(s => s.id === subcategoryId) : null;

    const appliedFilters = { ...filters };

    const availableSortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'customer_rating_high_to_low', label: 'Customer Rating - High to Low' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      categoryName: category ? category.name : '',
      subcategoryName: subcategory ? subcategory.name : '',
      totalResults,
      page,
      pageSize,
      products: pageProducts,
      appliedFilters,
      availableSortOptions
    };
  }

  // getSubcategoriesForCategory(categoryKey)
  getSubcategoriesForCategory(categoryKey) {
    const subcategories = this._getFromStorage('subcategories');
    return subcategories.filter(s => s.categoryKey === categoryKey);
  }

  // getFilterOptions(contextType, categoryKey, subcategoryId, query)
  getFilterOptions(contextType, categoryKey, subcategoryId, query) {
    let products = this._getFromStorage('products').filter(p => p.isActive !== false);

    if (contextType === 'category') {
      if (categoryKey) {
        products = products.filter(p => p.categoryKey === categoryKey);
      }
      if (subcategoryId) {
        products = products.filter(p => p.subcategoryId === subcategoryId);
      }
    } else if (contextType === 'search') {
      const q = (query || '').trim().toLowerCase();
      if (q) {
        products = products.filter(p => {
          const name = (p.name || '').toLowerCase();
          const desc = (p.description || '').toLowerCase();
          const code = (p.productCode || '').toLowerCase();
          return name.includes(q) || desc.includes(q) || code.includes(q);
        });
      }
    }

    const priceValues = products.map(p => p.price).filter(v => typeof v === 'number');
    const priceRange = {
      min: priceValues.length ? Math.min(...priceValues) : 0,
      max: priceValues.length ? Math.max(...priceValues) : 0
    };

    const materialCounts = {};
    const workpieceMaterialCounts = {};
    const jawWidthCounts = {};
    const jawStyleCounts = {};
    const spindleTaperCounts = {};
    const torqueRangeMap = {};
    const tSlotSizeCounts = {};
    const clampingRangeMap = {};
    const maxThreadSizeCounts = {};
    const componentTypeCounts = {};

    products.forEach(p => {
      if (p.material) {
        materialCounts[p.material] = (materialCounts[p.material] || 0) + 1;
      }
      if (Array.isArray(p.workpieceMaterials)) {
        p.workpieceMaterials.forEach(wm => {
          workpieceMaterialCounts[wm] = (workpieceMaterialCounts[wm] || 0) + 1;
        });
      }
      if (typeof p.jawWidthInch === 'number') {
        jawWidthCounts[p.jawWidthInch] = (jawWidthCounts[p.jawWidthInch] || 0) + 1;
      }
      if (p.jawStyle) {
        jawStyleCounts[p.jawStyle] = (jawStyleCounts[p.jawStyle] || 0) + 1;
      }
      if (p.spindleTaper) {
        spindleTaperCounts[p.spindleTaper] = (spindleTaperCounts[p.spindleTaper] || 0) + 1;
      }
      if (typeof p.torqueMinFtLb === 'number' && typeof p.torqueMaxFtLb === 'number') {
        const key = p.torqueMinFtLb + '-' + p.torqueMaxFtLb;
        if (!torqueRangeMap[key]) {
          torqueRangeMap[key] = {
            min: p.torqueMinFtLb,
            max: p.torqueMaxFtLb,
            label: p.torqueMinFtLb + '-' + p.torqueMaxFtLb + ' ft-lb',
            count: 0
          };
        }
        torqueRangeMap[key].count += 1;
      }
      if (typeof p.tSlotSizeMm === 'number') {
        tSlotSizeCounts[p.tSlotSizeMm] = (tSlotSizeCounts[p.tSlotSizeMm] || 0) + 1;
      }
      if (typeof p.clampingRangeMinMm === 'number' && typeof p.clampingRangeMaxMm === 'number') {
        const keyCr = p.clampingRangeMinMm + '-' + p.clampingRangeMaxMm;
        if (!clampingRangeMap[keyCr]) {
          clampingRangeMap[keyCr] = {
            min: p.clampingRangeMinMm,
            max: p.clampingRangeMaxMm,
            label: p.clampingRangeMinMm + '-' + p.clampingRangeMaxMm + ' mm',
            count: 0
          };
        }
        clampingRangeMap[keyCr].count += 1;
      }
      if (p.maxThreadSize) {
        maxThreadSizeCounts[p.maxThreadSize] = (maxThreadSizeCounts[p.maxThreadSize] || 0) + 1;
      }
      if (p.componentType) {
        componentTypeCounts[p.componentType] = (componentTypeCounts[p.componentType] || 0) + 1;
      }
    });

    const materials = Object.keys(materialCounts).map(value => ({
      value,
      label: this._enumToLabel(value),
      count: materialCounts[value]
    }));

    const workpieceMaterials = Object.keys(workpieceMaterialCounts).map(value => ({
      value,
      label: this._enumToLabel(value),
      count: workpieceMaterialCounts[value]
    }));

    const jawWidthsInch = Object.keys(jawWidthCounts).map(value => {
      const num = parseFloat(value);
      return { value: num, label: num + ' inch', count: jawWidthCounts[value] };
    });

    const jawStyles = Object.keys(jawStyleCounts).map(value => ({
      value,
      label: this._enumToLabel(value),
      count: jawStyleCounts[value]
    }));

    const spindleTapers = Object.keys(spindleTaperCounts).map(value => ({
      value,
      label: value.toUpperCase(),
      count: spindleTaperCounts[value]
    }));

    const torqueRangesFtLb = Object.keys(torqueRangeMap).map(key => torqueRangeMap[key]);

    const tSlotSizesMm = Object.keys(tSlotSizeCounts).map(value => {
      const num = parseFloat(value);
      return { value: num, label: num + ' mm', count: tSlotSizeCounts[value] };
    });

    const clampingRangesMm = Object.keys(clampingRangeMap).map(key => clampingRangeMap[key]);

    const maxThreadSizes = Object.keys(maxThreadSizeCounts).map(value => ({
      value,
      label: value,
      count: maxThreadSizeCounts[value]
    }));

    // Customer rating buckets: 4+, 3+, 2+, 1+
    const customerRatings = [];
    [4, 3, 2, 1].forEach(minVal => {
      const count = products.filter(p => typeof p.customerRating === 'number' && p.customerRating >= minVal).length;
      if (count > 0) {
        customerRatings.push({
          minValue: minVal,
          label: minVal + ' stars & up',
          count
        });
      }
    });

    // Shipping options: currently just free shipping eligible
    const freeShippingCount = products.filter(p => p.freeShippingEligible === true).length;
    const shippingOptions = freeShippingCount
      ? [
          {
            value: 'free_shipping_eligible',
            label: 'Free Shipping Eligible',
            count: freeShippingCount
          }
        ]
      : [];

    const customizableTrueCount = products.filter(p => p.isCustomizable === true).length;
    const customizableFalseCount = products.filter(p => p.isCustomizable === false).length;
    const customizableOptions = [];
    if (customizableTrueCount > 0) {
      customizableOptions.push({ value: true, label: 'Customizable', count: customizableTrueCount });
    }
    if (customizableFalseCount > 0) {
      customizableOptions.push({ value: false, label: 'Standard', count: customizableFalseCount });
    }

    const componentTypes = Object.keys(componentTypeCounts).map(value => ({
      value,
      label: this._enumToLabel(value),
      count: componentTypeCounts[value]
    }));

    return {
      priceRange,
      materials,
      workpieceMaterials,
      jawWidthsInch,
      jawStyles,
      spindleTapers,
      torqueRangesFtLb,
      tSlotSizesMm,
      clampingRangesMm,
      maxThreadSizes,
      customerRatings,
      shippingOptions,
      customizableOptions,
      componentTypes
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');
    const categories = this._getFromStorage('categories');
    const subcategories = this._getFromStorage('subcategories');

    const product = products.find(p => p.id === productId) || null;

    if (!product) {
      return {
        product: null,
        variants: [],
        categoryName: '',
        subcategoryName: '',
        averageRating: 0,
        reviewCount: 0,
        shipping: {
          freeShippingEligible: false,
          availableMethods: []
        },
        tabs: {
          descriptionHtml: '',
          specificationsHtml: '',
          reviewsSummaryHtml: '',
          documents: []
        }
      };
    }

    const productVariants = variants
      .filter(v => v.productId === productId)
      .map(v => ({ ...v, product })); // resolve productId -> product

    const category = categories.find(c => c.key === product.categoryKey) || null;
    const subcategory = product.subcategoryId ? subcategories.find(s => s.id === product.subcategoryId) || null : null;

    const descriptionHtml = product.description ? `<p>${product.description}</p>` : '';

    const shipping = {
      freeShippingEligible: !!product.freeShippingEligible,
      availableMethods: [
        { value: 'standard_ground', label: 'Standard Ground', estimatedDays: 5 },
        { value: 'expedited_2_day', label: 'Expedited 2-Day', estimatedDays: 2 },
        { value: 'overnight', label: 'Overnight', estimatedDays: 1 },
        { value: 'freight', label: 'Freight', estimatedDays: 7 },
        { value: 'pickup', label: 'Pickup', estimatedDays: 0 }
      ]
    };

    const enhancedProduct = this._attachSubcategoryToProduct(product);

    return {
      product: enhancedProduct,
      variants: productVariants,
      categoryName: category ? category.name : '',
      subcategoryName: subcategory ? subcategory.name : '',
      averageRating: product.customerRating || 0,
      reviewCount: product.reviewCount || 0,
      shipping,
      tabs: {
        descriptionHtml,
        specificationsHtml: '',
        reviewsSummaryHtml: '',
        documents: []
      }
    };
  }

  // addToCart(productId, variantId, quantity = 1)
  addToCart(productId, variantId, quantity) {
    if (quantity == null) quantity = 1;
    if (quantity <= 0) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Quantity must be greater than zero',
        cartItemCount: 0,
        cartSubtotal: 0
      };
    }

    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    const product = products.find(p => p.id === productId);
    if (!product) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Product not found',
        cartItemCount: 0,
        cartSubtotal: 0
      };
    }

    let variant = null;
    if (variantId) {
      variant = variants.find(v => v.id === variantId && v.productId === productId) || null;
      if (!variant) {
        return {
          success: false,
          cartId: null,
          cartItemId: null,
          message: 'Variant not found for product',
          cartItemCount: 0,
          cartSubtotal: 0
        };
      }
    }

    const unitPrice = (variant && typeof variant.priceOverride === 'number')
      ? variant.priceOverride
      : product.price || 0;

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(ci => ci.cartId === cart.id && ci.productId === productId && (ci.variantId || null) === (variantId || null));

    if (cartItem) {
      cartItem.quantity += quantity;
      cartItem.lineSubtotal = cartItem.unitPrice * cartItem.quantity;
    } else {
      cartItem = {
        id: this._generateId('cartItem'),
        cartId: cart.id,
        productId,
        variantId: variantId || null,
        quantity,
        unitPrice,
        lineSubtotal: unitPrice * quantity,
        nameSnapshot: product.name,
        productCodeSnapshot: product.productCode || null
      };
      cartItems.push(cartItem);
    }

    cart.updatedAt = this._nowIso();

    let carts = this._getFromStorage('carts');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex] = cart;
    } else {
      carts.push(cart);
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('carts', carts);

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    const totals = this._calculateCartTotals(itemsForCart);
    const cartItemCount = itemsForCart.reduce((sum, ci) => sum + ci.quantity, 0);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Item added to cart',
      cartItemCount,
      cartSubtotal: totals.merchandiseSubtotal
    };
  }

  // getCartSummary()
  getCartSummary() {
    const currentCartId = localStorage.getItem('currentCartId');
    if (!currentCartId) {
      return {
        cartId: null,
        itemCount: 0,
        subtotal: 0
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === currentCartId);
    const totals = this._calculateCartTotals(cartItems);
    const itemCount = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);

    return {
      cartId: currentCartId,
      itemCount,
      subtotal: totals.merchandiseSubtotal
    };
  }

  // getCartItems()
  getCartItems() {
    const currentCartId = localStorage.getItem('currentCartId');
    if (!currentCartId) {
      return {
        cartId: null,
        items: [],
        totals: {
          merchandiseSubtotal: 0,
          estimatedShipping: 0,
          estimatedTax: 0,
          orderTotal: 0
        }
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === currentCartId);
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    const items = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.productId) || null;
      const variant = ci.variantId ? variants.find(v => v.id === ci.variantId) || null : null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        variantId: ci.variantId,
        productName: ci.nameSnapshot,
        productCode: ci.productCodeSnapshot,
        variantLabel: variant ? variant.optionLabel : null,
        thumbnailImage: product ? product.thumbnailImage || null : null,
        unitPrice: ci.unitPrice,
        quantity: ci.quantity,
        lineSubtotal: ci.lineSubtotal,
        // Foreign key resolution
        product,
        variant
      };
    });

    const totals = this._calculateCartTotals(cartItems);

    return {
      cartId: currentCartId,
      items,
      totals
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    if (quantity == null) {
      return {
        success: false,
        cartId: null,
        updatedItem: null,
        totals: {
          merchandiseSubtotal: 0,
          estimatedShipping: 0,
          estimatedTax: 0,
          orderTotal: 0
        }
      };
    }

    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cartId: null,
        updatedItem: null,
        totals: {
          merchandiseSubtotal: 0,
          estimatedShipping: 0,
          estimatedTax: 0,
          orderTotal: 0
        }
      };
    }

    const item = cartItems[idx];
    const cartId = item.cartId;

    if (quantity <= 0) {
      // Remove item if quantity <= 0
      cartItems.splice(idx, 1);
    } else {
      item.quantity = quantity;
      item.lineSubtotal = item.unitPrice * item.quantity;
      cartItems[idx] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter(ci => ci.cartId === cartId);
    const totals = this._calculateCartTotals(itemsForCart);

    const updatedItem = quantity > 0 ? {
      cartItemId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.nameSnapshot,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineSubtotal: item.lineSubtotal
    } : null;

    return {
      success: true,
      cartId,
      updatedItem,
      totals
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cartId: null,
        itemCount: 0,
        totals: {
          merchandiseSubtotal: 0,
          estimatedShipping: 0,
          estimatedTax: 0,
          orderTotal: 0
        }
      };
    }

    const cartId = cartItems[idx].cartId;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter(ci => ci.cartId === cartId);
    const totals = this._calculateCartTotals(itemsForCart);
    const itemCount = itemsForCart.reduce((sum, ci) => sum + ci.quantity, 0);

    return {
      success: true,
      cartId,
      itemCount,
      totals
    };
  }

  // getCheckoutDetails()
  getCheckoutDetails() {
    const currentCartId = localStorage.getItem('currentCartId');
    const cartItems = currentCartId
      ? this._getFromStorage('cart_items').filter(ci => ci.cartId === currentCartId)
      : [];

    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    const items = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.productId) || null;
      const variant = ci.variantId ? variants.find(v => v.id === ci.variantId) || null : null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        variantId: ci.variantId,
        productName: ci.nameSnapshot,
        variantLabel: variant ? variant.optionLabel : null,
        unitPrice: ci.unitPrice,
        quantity: ci.quantity,
        lineSubtotal: ci.lineSubtotal,
        // Foreign key resolution
        product,
        variant
      };
    });

    const user = this._getCurrentUser();
    const shippingAddress = (user && user.defaultShippingAddress) || localStorage.getItem('defaultShippingAddress') || '';
    const billingAddress = (user && user.defaultBillingAddress) || localStorage.getItem('defaultBillingAddress') || '';

    const availableShippingMethods = [
      { value: 'standard_ground', label: 'Standard Ground', estimatedDays: 5, cost: 0 },
      { value: 'expedited_2_day', label: 'Expedited 2-Day', estimatedDays: 2, cost: 0 },
      { value: 'overnight', label: 'Overnight', estimatedDays: 1, cost: 0 },
      { value: 'freight', label: 'Freight', estimatedDays: 7, cost: 0 },
      { value: 'pickup', label: 'Pickup', estimatedDays: 0, cost: 0 }
    ];

    const selectedShippingMethod = 'standard_ground';

    const availablePaymentMethods = ['credit_card', 'purchase_order', 'wire_transfer', 'other'];
    const defaultPaymentMethod = 'credit_card';

    const totalsBase = this._calculateCartTotals(cartItems);
    const totals = {
      merchandiseSubtotal: totalsBase.merchandiseSubtotal,
      shippingCost: 0,
      taxAmount: 0,
      orderTotal: totalsBase.orderTotal
    };

    return {
      cartId: currentCartId,
      items,
      shippingAddress,
      billingAddress,
      availableShippingMethods,
      selectedShippingMethod,
      availablePaymentMethods,
      defaultPaymentMethod,
      totals
    };
  }

  // placeOrder(paymentMethod, poNumber, shippingMethod, shippingAddress, billingAddress, orderNotes)
  placeOrder(paymentMethod, poNumber, shippingMethod, shippingAddress, billingAddress, orderNotes) {
    const currentCartId = localStorage.getItem('currentCartId');
    if (!currentCartId) {
      return {
        success: false,
        order: null,
        items: [],
        message: 'No active cart to place order'
      };
    }

    const cartItemsAll = this._getFromStorage('cart_items');
    const cartItems = cartItemsAll.filter(ci => ci.cartId === currentCartId);
    if (!cartItems.length) {
      return {
        success: false,
        order: null,
        items: [],
        message: 'Cart is empty'
      };
    }

    if (paymentMethod === 'purchase_order' && !poNumber) {
      return {
        success: false,
        order: null,
        items: [],
        message: 'PO number is required for purchase order payment method'
      };
    }

    const totals = this._calculateCartTotals(cartItems);

    const orders = this._getFromStorage('orders');
    const order_items = this._getFromStorage('order_items');
    const products = this._getFromStorage('products');

    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + Date.now();

    const order = {
      id: orderId,
      orderNumber,
      createdAt: this._nowIso(),
      status: 'pending',
      subtotal: totals.merchandiseSubtotal,
      shippingCost: 0,
      taxAmount: 0,
      total: totals.orderTotal,
      paymentMethod,
      poNumber: paymentMethod === 'purchase_order' ? poNumber : null,
      shippingMethod,
      shippingAddress,
      billingAddress,
      notes: orderNotes || ''
    };

    const newOrderItems = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.productId) || {};
      return {
        id: this._generateId('orderItem'),
        orderId,
        productId: ci.productId,
        variantId: ci.variantId,
        productName: ci.nameSnapshot,
        productCode: ci.productCodeSnapshot,
        componentType: product.componentType || 'other',
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        lineSubtotal: ci.lineSubtotal
      };
    });

    orders.push(order);
    Array.prototype.push.apply(order_items, newOrderItems);

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', order_items);

    // Clear cart
    const remainingCartItems = cartItemsAll.filter(ci => ci.cartId !== currentCartId);
    this._saveToStorage('cart_items', remainingCartItems);
    localStorage.removeItem('currentCartId');

    return {
      success: true,
      order,
      items: newOrderItems,
      message: 'Order placed successfully'
    };
  }

  // getOrderConfirmation(orderId)
  getOrderConfirmation(orderId) {
    const orders = this._getFromStorage('orders');
    const order_items = this._getFromStorage('order_items');
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    const order = orders.find(o => o.id === orderId) || null;
    const itemsRaw = order_items.filter(oi => oi.orderId === orderId);

    const items = itemsRaw.map(oi => {
      const product = products.find(p => p.id === oi.productId) || null;
      const variant = oi.variantId ? variants.find(v => v.id === oi.variantId) || null : null;
      return {
        ...oi,
        product,
        variant
      };
    });

    return {
      order,
      items
    };
  }

  // signIn(username, password)
  signIn(username, password) {
    const users = this._getFromStorage('users');
    const user = users.find(u => u.username === username && u.password === password) || null;

    if (!user) {
      // Auto-provision a default demo user for tests/first-time use
      if (username === 'demo_user' && password === 'Tooling123') {
        const now = this._nowIso();
        const demoUser = {
          id: 'user_demo',
          username,
          password,
          accountName: 'Demo User',
          createdAt: now,
          lastSignInAt: now
        };
        users.push(demoUser);
        this._saveToStorage('users', users);
        localStorage.setItem('currentUserId', demoUser.id);
        return {
          success: true,
          accountName: demoUser.accountName || demoUser.username,
          message: 'Signed in successfully',
          lastSignInAt: demoUser.lastSignInAt
        };
      }

      return {
        success: false,
        accountName: null,
        message: 'Invalid username or password',
        lastSignInAt: null
      };
    }

    const now = this._nowIso();
    user.lastSignInAt = now;

    // Persist updated user
    const updatedUsers = users.map(u => (u.id === user.id ? user : u));
    this._saveToStorage('users', updatedUsers);

    localStorage.setItem('currentUserId', user.id);

    return {
      success: true,
      accountName: user.accountName || user.username,
      message: 'Signed in successfully',
      lastSignInAt: user.lastSignInAt
    };
  }

  // getAccountDashboardSummary()
  getAccountDashboardSummary() {
    const user = this._getCurrentUser();
    const orders = this._getFromStorage('orders');
    const saved_lists = this._getFromStorage('saved_lists');
    const saved_list_items = this._getFromStorage('saved_list_items');

    const recentOrders = orders
      .slice()
      .sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0))
      .slice(0, 5);

    const savedListSummary = saved_lists.map(list => {
      const itemCount = saved_list_items.filter(item => item.savedListId === list.id).length;
      return {
        id: list.id,
        name: list.name,
        itemCount,
        createdAt: list.createdAt
      };
    });

    return {
      accountName: user ? (user.accountName || user.username) : '',
      defaultShippingAddress: (user && user.defaultShippingAddress) || localStorage.getItem('defaultShippingAddress') || '',
      defaultBillingAddress: (user && user.defaultBillingAddress) || localStorage.getItem('defaultBillingAddress') || '',
      recentOrders,
      savedListSummary
    };
  }

  // getOrderHistory(page, pageSize, filters)
  getOrderHistory(page, pageSize, filters) {
    if (page == null) page = 1;
    if (pageSize == null) pageSize = 20;
    filters = filters || {};

    let orders = this._getFromStorage('orders');

    if (filters.status) {
      orders = orders.filter(o => o.status === filters.status);
    }

    if (filters.fromDate) {
      const from = Date.parse(filters.fromDate);
      orders = orders.filter(o => Date.parse(o.createdAt || 0) >= from);
    }

    if (filters.toDate) {
      const to = Date.parse(filters.toDate);
      orders = orders.filter(o => Date.parse(o.createdAt || 0) <= to);
    }

    if (filters.orderNumberContains) {
      const part = String(filters.orderNumberContains).toLowerCase();
      orders = orders.filter(o => (o.orderNumber || '').toLowerCase().includes(part));
    }

    orders = orders.slice().sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));

    const totalOrders = orders.length;
    const start = (page - 1) * pageSize;
    const paged = orders.slice(start, start + pageSize);

    return {
      orders: paged,
      totalOrders,
      page,
      pageSize
    };
  }

  // getOrderDetail(orderId)
  getOrderDetail(orderId) {
    const orders = this._getFromStorage('orders');
    const order_items = this._getFromStorage('order_items');
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    const order = orders.find(o => o.id === orderId) || null;
    const itemsRaw = order_items.filter(oi => oi.orderId === orderId);

    const items = itemsRaw.map(oi => {
      const product = products.find(p => p.id === oi.productId) || null;
      const variant = oi.variantId ? variants.find(v => v.id === oi.variantId) || null : null;
      return {
        ...oi,
        product,
        variant
      };
    });

    return {
      order,
      items
    };
  }

  // reorderOrderItem(orderItemId, quantityOverride)
  reorderOrderItem(orderItemId, quantityOverride) {
    const order_items = this._getFromStorage('order_items');
    const orderItem = order_items.find(oi => oi.id === orderItemId) || null;
    if (!orderItem) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Order item not found'
      };
    }

    const quantity = quantityOverride != null ? quantityOverride : orderItem.quantity;

    // Prefer normal addToCart path when the product still exists in the catalog
    const products = this._getFromStorage('products');
    const productExists = products.some(p => p.id === orderItem.productId);

    if (productExists) {
      const result = this.addToCart(orderItem.productId, orderItem.variantId, quantity);
      return {
        success: result.success,
        cartId: result.cartId,
        cartItemId: result.cartItemId,
        message: result.message
      };
    }

    // Fallback: product is no longer in the current catalog. Recreate a cart line
    // from the historical order item snapshot so that reordering still works.
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const unitPrice = typeof orderItem.unitPrice === 'number' ? orderItem.unitPrice : 0;

    const cartItem = {
      id: this._generateId('cartItem'),
      cartId: cart.id,
      productId: orderItem.productId,
      variantId: orderItem.variantId || null,
      quantity,
      unitPrice,
      lineSubtotal: unitPrice * quantity,
      nameSnapshot: orderItem.productName || orderItem.productId || '',
      productCodeSnapshot: orderItem.productCode || null
    };

    cartItems.push(cartItem);

    cart.updatedAt = this._nowIso();

    let carts = this._getFromStorage('carts');
    const cartIndex = carts.findIndex(c => c.id === cart.id);
    if (cartIndex >= 0) {
      carts[cartIndex] = cart;
    } else {
      carts.push(cart);
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('carts', carts);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Item added to cart from previous order'
    };
  }

  // getSavedLists()
  getSavedLists() {
    const saved_lists = this._getFromStorage('saved_lists');
    const saved_list_items = this._getFromStorage('saved_list_items');

    return saved_lists.map(list => {
      const itemCount = saved_list_items.filter(item => item.savedListId === list.id).length;
      return {
        id: list.id,
        name: list.name,
        description: list.description || '',
        itemCount,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt
      };
    });
  }

  // createSavedList(name, description)
  createSavedList(name, description) {
    if (!name) {
      return {
        success: false,
        savedList: null,
        message: 'List name is required'
      };
    }

    const saved_lists = this._getFromStorage('saved_lists');
    const now = this._nowIso();
    const savedList = {
      id: this._generateId('savedList'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    saved_lists.push(savedList);
    this._saveToStorage('saved_lists', saved_lists);

    return {
      success: true,
      savedList,
      message: 'Saved list created'
    };
  }

  // renameSavedList(savedListId, name)
  renameSavedList(savedListId, name) {
    const saved_lists = this._getFromStorage('saved_lists');
    const idx = saved_lists.findIndex(l => l.id === savedListId);
    if (idx === -1) {
      return {
        success: false,
        savedList: null
      };
    }

    saved_lists[idx].name = name;
    saved_lists[idx].updatedAt = this._nowIso();
    this._saveToStorage('saved_lists', saved_lists);

    return {
      success: true,
      savedList: saved_lists[idx]
    };
  }

  // deleteSavedList(savedListId)
  deleteSavedList(savedListId) {
    const saved_lists = this._getFromStorage('saved_lists');
    const saved_list_items = this._getFromStorage('saved_list_items');

    const listsFiltered = saved_lists.filter(l => l.id !== savedListId);
    const itemsFiltered = saved_list_items.filter(i => i.savedListId !== savedListId);

    this._saveToStorage('saved_lists', listsFiltered);
    this._saveToStorage('saved_list_items', itemsFiltered);

    return {
      success: true
    };
  }

  // getSavedListDetail(savedListId)
  getSavedListDetail(savedListId) {
    const saved_lists = this._getFromStorage('saved_lists');
    const saved_list_items = this._getFromStorage('saved_list_items');
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');

    const savedList = saved_lists.find(l => l.id === savedListId) || null;
    const itemsRaw = saved_list_items.filter(i => i.savedListId === savedListId);

    const items = itemsRaw.map(i => {
      const product = products.find(p => p.id === i.productId) || null;
      const variant = i.variantId ? variants.find(v => v.id === i.variantId) || null : null;
      return {
        savedListItemId: i.id,
        product,
        variant,
        quantityDesired: i.quantityDesired
      };
    });

    return {
      savedList,
      items
    };
  }

  // addProductToSavedList(productId, savedListId, variantId, quantityDesired)
  addProductToSavedList(productId, savedListId, variantId, quantityDesired) {
    const products = this._getFromStorage('products');
    const saved_lists = this._getFromStorage('saved_lists');

    const product = products.find(p => p.id === productId) || null;
    const list = saved_lists.find(l => l.id === savedListId) || null;

    if (!product || !list) {
      return {
        success: false,
        savedListItemId: null,
        message: 'Product or saved list not found'
      };
    }

    const saved_list_items = this._getFromStorage('saved_list_items');
    const item = {
      id: this._generateId('savedListItem'),
      savedListId,
      productId,
      variantId: variantId || null,
      quantityDesired: quantityDesired != null ? quantityDesired : 1,
      addedAt: this._nowIso()
    };

    saved_list_items.push(item);
    this._saveToStorage('saved_list_items', saved_list_items);

    // update list updatedAt
    list.updatedAt = this._nowIso();
    const updatedLists = saved_lists.map(l => (l.id === list.id ? list : l));
    this._saveToStorage('saved_lists', updatedLists);

    return {
      success: true,
      savedListItemId: item.id,
      message: 'Product added to saved list'
    };
  }

  // removeItemFromSavedList(savedListItemId)
  removeItemFromSavedList(savedListItemId) {
    const saved_list_items = this._getFromStorage('saved_list_items');
    const filtered = saved_list_items.filter(i => i.id !== savedListItemId);
    this._saveToStorage('saved_list_items', filtered);
    return {
      success: true
    };
  }

  // addSavedListItemsToCart(savedListId, itemIds)
  addSavedListItemsToCart(savedListId, itemIds) {
    const saved_list_items = this._getFromStorage('saved_list_items');
    let items = saved_list_items.filter(i => i.savedListId === savedListId);

    if (Array.isArray(itemIds) && itemIds.length) {
      items = items.filter(i => itemIds.includes(i.id));
    }

    if (!items.length) {
      return {
        success: false,
        cartId: null,
        addedCount: 0
      };
    }

    let addedCount = 0;
    let cartId = null;

    items.forEach(i => {
      const quantity = i.quantityDesired != null ? i.quantityDesired : 1;
      const result = this.addToCart(i.productId, i.variantId, quantity);
      if (result.success) {
        addedCount += 1;
        cartId = result.cartId;
      }
    });

    return {
      success: addedCount > 0,
      cartId,
      addedCount
    };
  }

  // addProductToComparison(productId)
  addProductToComparison(productId) {
    const set = this._getOrCreateComparisonSet(true);
    if (!set.productIds.includes(productId)) {
      set.productIds.push(productId);
    }

    const sets = this._getFromStorage('comparison_sets').map(s => (s.id === set.id ? set : s));
    this._saveToStorage('comparison_sets', sets);

    return {
      success: true,
      comparisonSetId: set.id,
      productIds: set.productIds.slice()
    };
  }

  // removeProductFromComparison(productId)
  removeProductFromComparison(productId) {
    const set = this._getOrCreateComparisonSet(false);
    if (!set) {
      return {
        success: false,
        comparisonSetId: null,
        productIds: []
      };
    }

    set.productIds = set.productIds.filter(id => id !== productId);
    const sets = this._getFromStorage('comparison_sets').map(s => (s.id === set.id ? set : s));
    this._saveToStorage('comparison_sets', sets);

    return {
      success: true,
      comparisonSetId: set.id,
      productIds: set.productIds.slice()
    };
  }

  // getCurrentComparisonSet()
  getCurrentComparisonSet() {
    const currentId = localStorage.getItem('currentComparisonSetId');
    if (!currentId) {
      return {
        comparisonSetId: null,
        createdAt: null,
        sourceContext: null,
        products: []
      };
    }

    const sets = this._getFromStorage('comparison_sets');
    const set = sets.find(s => s.id === currentId) || null;
    if (!set) {
      return {
        comparisonSetId: null,
        createdAt: null,
        sourceContext: null,
        products: []
      };
    }

    const productsAll = this._getFromStorage('products');
    const variantsAll = this._getFromStorage('product_variants');

    const products = set.productIds.map(pid => {
      const product = productsAll.find(p => p.id === pid) || null;
      const variants = variantsAll
        .filter(v => v.productId === pid)
        .map(v => ({ ...v, product })); // resolve productId
      return { product, variants };
    });

    const sourceContextStr = localStorage.getItem('comparisonSourceContext');
    const sourceContext = sourceContextStr ? JSON.parse(sourceContextStr) : null;

    return {
      comparisonSetId: set.id,
      createdAt: set.createdAt,
      sourceContext,
      products
    };
  }

  // requestProductQuote(productId, quantity, companyName, contactName, phone, needByDate, notes)
  requestProductQuote(productId, quantity, companyName, contactName, phone, needByDate, notes) {
    if (!productId || !quantity || !companyName || !contactName || !phone) {
      return {
        success: false,
        quoteRequest: null,
        message: 'Missing required fields for quote request'
      };
    }

    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        quoteRequest: null,
        message: 'Product not found'
      };
    }

    const quote_requests = this._getFromStorage('quote_requests');
    const qr = {
      id: this._generateId('quote'),
      productId,
      quantity,
      companyName,
      contactName,
      phone,
      needByDate: needByDate ? new Date(needByDate).toISOString() : null,
      notes: notes || '',
      status: 'submitted',
      createdAt: this._nowIso()
    };

    quote_requests.push(qr);
    this._saveToStorage('quote_requests', quote_requests);

    return {
      success: true,
      quoteRequest: qr,
      message: 'Quote request submitted'
    };
  }

  // getProductNotes(productId)
  getProductNotes(productId) {
    const product_notes = this._getFromStorage('product_notes');
    const products = this._getFromStorage('products');
    const noteRaw = product_notes.find(n => n.productId === productId) || null;
    if (!noteRaw) {
      return { note: null };
    }
    const product = products.find(p => p.id === productId) || null;
    const note = { ...noteRaw, product };
    return { note };
  }

  // saveProductNote(productId, text)
  saveProductNote(productId, text) {
    if (!productId) {
      return {
        success: false,
        note: null,
        message: 'Product ID is required'
      };
    }
    if (typeof text !== 'string') {
      return {
        success: false,
        note: null,
        message: 'Note text must be a string'
      };
    }

    let product_notes = this._getFromStorage('product_notes');
    const now = this._nowIso();
    let note = product_notes.find(n => n.productId === productId) || null;

    if (note) {
      note.text = text;
      note.updatedAt = now;
      product_notes = product_notes.map(n => (n.id === note.id ? note : n));
    } else {
      note = {
        id: this._generateId('pnote'),
        productId,
        text,
        createdAt: now,
        updatedAt: now
      };
      product_notes.push(note);
    }

    this._saveToStorage('product_notes', product_notes);

    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    const noteWithProduct = { ...note, product };

    return {
      success: true,
      note: noteWithProduct,
      message: 'Note saved'
    };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const static_pages = this._getFromStorage('static_pages');
    const page = static_pages.find(p => p.pageKey === pageKey) || null;
    if (page) {
      return {
        pageKey: page.pageKey,
        title: page.title || '',
        bodyHtml: page.bodyHtml || ''
      };
    }
    return {
      pageKey,
      title: '',
      bodyHtml: ''
    };
  }

  // submitContactForm(topic, fromName, fromEmail, phone, message, orderNumber)
  submitContactForm(topic, fromName, fromEmail, phone, message, orderNumber) {
    if (!topic || !fromName || !fromEmail || !message) {
      return {
        success: false,
        message: 'Missing required contact form fields'
      };
    }

    const submissions = this._getFromStorage('contact_submissions');
    const submission = {
      id: this._generateId('contact'),
      topic,
      fromName,
      fromEmail,
      phone: phone || null,
      message,
      orderNumber: orderNumber || null,
      createdAt: this._nowIso()
    };

    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'Contact form submitted'
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
