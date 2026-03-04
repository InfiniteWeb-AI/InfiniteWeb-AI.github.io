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

  _initStorage() {
    // Entity tables (arrays)
    const arrayKeys = [
      'categories',
      'products',
      'quote_baskets',
      'quote_basket_items',
      'instant_quote_requests',
      'quote_enquiries',
      'consultation_bookings',
      'finance_plans',
      'finance_applications',
      'service_areas',
      'coverage_check_results',
      'callback_requests',
      'reviews',
      'aftercare_issues',
      'offers',
      'offer_enquiries',
      'product_comparisons',
      'contact_enquiries'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Config / singleton-style objects
    const objectKeysWithDefaults = {
      homepage_content: {
        heroTitle: '',
        heroSubtitle: '',
        primaryCtas: [],
        trustBadges: []
      },
      finance_overview: {
        summaryText: '',
        representativeExampleText: ''
      },
      service_areas_overview: {
        descriptionText: ''
      },
      aftercare_overview: {
        overviewText: '',
        warrantySummaryText: ''
      },
      about_us_content: {
        companyHistoryHtml: '',
        missionStatement: '',
        experienceSummary: '',
        teamHighlights: [],
        accreditations: []
      },
      contact_page_info: {
        phoneNumbers: [],
        emailAddresses: [],
        officeAddress: '',
        mapEmbedToken: '',
        openingHours: [],
        generalEnquiryPurposeOptions: []
      },
      legal_content: {}
    };

    Object.keys(objectKeysWithDefaults).forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(objectKeysWithDefaults[key]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (typeof defaultValue !== 'undefined') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      if (typeof defaultValue !== 'undefined') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
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

  _formatPriceGBP(value) {
    if (typeof value !== 'number' || isNaN(value)) return '';
    return '£' + value.toFixed(2);
  }

  _enumLabel(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _energyRatingRank(value) {
    const order = ['a_plus_plus', 'a_plus', 'a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const idx = order.indexOf(value);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  }

  _compareEnergyRatings(a, b) {
    return this._energyRatingRank(a) - this._energyRatingRank(b);
  }

  _normalizePostcode(postcode) {
    return (postcode || '')
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  // ===== Quote basket helpers =====

  _getOrCreateQuoteBasket() {
    const baskets = this._getFromStorage('quote_baskets');
    let basket = baskets.find((b) => b.status === 'open');
    const now = this._nowIso();

    if (!basket) {
      basket = {
        id: this._generateId('basket'),
        status: 'open',
        items: [],
        total_estimated_price: 0,
        notes: '',
        created_at: now,
        updated_at: now
      };
      baskets.push(basket);
      this._saveToStorage('quote_baskets', baskets);
    }

    return basket;
  }

  _recalculateQuoteBasketTotals(basketId) {
    const baskets = this._getFromStorage('quote_baskets');
    const items = this._getFromStorage('quote_basket_items');

    const basket = baskets.find((b) => b.id === basketId);
    if (!basket) return null;

    const basketItems = items.filter((it) => it.basket_id === basket.id);
    let total = 0;
    basketItems.forEach((it) => {
      if (typeof it.line_total_estimate === 'number') {
        total += it.line_total_estimate;
      } else if (typeof it.unit_price_estimate === 'number' && typeof it.quantity === 'number') {
        total += it.unit_price_estimate * it.quantity;
      }
    });

    basket.total_estimated_price = total;
    basket.updated_at = this._nowIso();

    this._saveToStorage('quote_baskets', baskets);
    return basket;
  }

  // ===== Finance helpers =====

  _calculateFinanceRepaymentForPlan(financePlan, purchaseAmount, termMonths) {
    const apr = typeof financePlan.apr_percentage === 'number' ? financePlan.apr_percentage : 0;
    const monthlyRate = apr / 100 / 12;
    let monthlyRepayment;

    if (monthlyRate === 0) {
      monthlyRepayment = purchaseAmount / termMonths;
    } else {
      const factor = Math.pow(1 + monthlyRate, -termMonths);
      monthlyRepayment = (purchaseAmount * monthlyRate) / (1 - factor);
    }

    const totalPayable = monthlyRepayment * termMonths;
    return {
      monthlyRepayment,
      totalPayable,
      representativeApr: apr
    };
  }

  // ===== Service area helpers =====

  _matchServiceAreaForPostcode(postcode) {
    const normalized = this._normalizePostcode(postcode);
    const serviceAreas = this._getFromStorage('service_areas');
    let bestMatch = null;
    let bestPatternLength = -1;

    serviceAreas
      .filter((sa) => sa.is_active)
      .forEach((sa) => {
        const rawPattern = (sa.postcode_pattern || '').toString().trim().toUpperCase();
        if (!rawPattern) return;
        const hasWildcard = rawPattern.endsWith('*');
        const pattern = hasWildcard ? rawPattern.slice(0, -1) : rawPattern;
        if (!pattern) return;
        if (normalized.startsWith(pattern) && pattern.length > bestPatternLength) {
          bestMatch = sa;
          bestPatternLength = pattern.length;
        }
      });

    if (bestMatch) {
      return {
        serviceArea: bestMatch,
        coverageStatus: bestMatch.coverage_status,
        notes: bestMatch.notes || ''
      };
    }

    return {
      serviceArea: null,
      coverageStatus: 'not_covered',
      notes: ''
    };
  }

  // ===== Offer helpers =====

  _isOfferApplicableToInterest(applicableTo, interestType) {
    // applicableTo: 'windows','doors','windows_and_doors','all_products'
    // interestType: 'windows_only','doors_only','windows_and_doors','other'
    if (applicableTo === 'all_products') return true;

    if (interestType === 'windows_only') {
      return applicableTo === 'windows' || applicableTo === 'windows_and_doors';
    }

    if (interestType === 'doors_only') {
      return applicableTo === 'doors' || applicableTo === 'windows_and_doors';
    }

    if (interestType === 'windows_and_doors') {
      return (
        applicableTo === 'windows_and_doors' ||
        applicableTo === 'windows' ||
        applicableTo === 'doors'
      );
    }

    // 'other' -> allow only if all_products
    return applicableTo === 'all_products';
  }

  _validateAndApplyOfferPromoCode(offerId, enteredPromoCode, interestType, numberOfWindows, numberOfDoors) {
    const offers = this._getFromStorage('offers');
    const offer = offers.find((o) => o.id === offerId);

    if (!offer) {
      return { valid: false, offer: null, message: 'Offer not found.' };
    }

    const now = new Date();
    const start = offer.start_date ? new Date(offer.start_date) : null;
    const end = offer.end_date ? new Date(offer.end_date) : null;

    if (!offer.is_active || (start && now < start) || (end && now > end)) {
      return { valid: false, offer: null, message: 'This offer is not currently active.' };
    }

    const entered = (enteredPromoCode || '').toString().trim().toUpperCase();
    const actual = (offer.promo_code || '').toString().trim().toUpperCase();

    if (!entered || entered !== actual) {
      return { valid: false, offer: null, message: 'Promo code is invalid for this offer.' };
    }

    if (!this._isOfferApplicableToInterest(offer.applicable_to, interestType)) {
      return { valid: false, offer, message: 'This offer does not apply to the selected products.' };
    }

    const winCount = typeof numberOfWindows === 'number' ? numberOfWindows : 0;
    const doorCount = typeof numberOfDoors === 'number' ? numberOfDoors : 0;
    const totalQty = winCount + doorCount;

    if (typeof offer.min_quantity === 'number' && offer.min_quantity > 0) {
      if (totalQty < offer.min_quantity) {
        return {
          valid: false,
          offer,
          message: `Minimum quantity for this offer is ${offer.min_quantity}.`
        };
      }
    }

    return { valid: true, offer, message: 'Offer code applied successfully.' };
  }

  // ===== Foreign key resolution helpers =====

  _attachCategoryToProduct(product, categories) {
    if (!product) return product;
    const category = categories.find((c) => c.id === product.category_id) || null;
    return { ...product, category };
  }

  _attachRelationsToCoverageCheck(coverageCheck, serviceAreas) {
    if (!coverageCheck) return null;
    const serviceArea = coverageCheck.service_area_id
      ? serviceAreas.find((s) => s.id === coverageCheck.service_area_id) || null
      : null;
    return { ...coverageCheck, serviceArea };
  }

  _attachRelationsToCallbackRequest(callbackRequest, coverageChecks, serviceAreas) {
    if (!callbackRequest) return null;
    const coverageCheck = callbackRequest.coverage_check_result_id
      ? coverageChecks.find((c) => c.id === callbackRequest.coverage_check_result_id) || null
      : null;
    const enrichedCoverageCheck = coverageCheck
      ? this._attachRelationsToCoverageCheck(coverageCheck, serviceAreas)
      : null;
    return { ...callbackRequest, coverageCheckResult: enrichedCoverageCheck };
  }

  _attachOfferToOfferEnquiry(offerEnquiry, offers) {
    if (!offerEnquiry) return null;
    const offer = offers.find((o) => o.id === offerEnquiry.offer_id) || null;
    return { ...offerEnquiry, offer };
  }

  // ===================== Interface Implementations =====================

  // 1. getHomepageContent
  getHomepageContent() {
    const homepage = this._getFromStorage('homepage_content', {
      heroTitle: '',
      heroSubtitle: '',
      primaryCtas: [],
      trustBadges: []
    });

    const categories = this._getFromStorage('categories');
    const offers = this._getFromStorage('offers');

    const now = new Date();
    const activeOffers = offers.filter((o) => {
      if (!o.is_active) return false;
      const start = o.start_date ? new Date(o.start_date) : null;
      const end = o.end_date ? new Date(o.end_date) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    });

    const featuredCategories = categories.map((c) => ({
      category: c,
      highlightText: ''
    }));

    return {
      heroTitle: homepage.heroTitle || '',
      heroSubtitle: homepage.heroSubtitle || '',
      primaryCtas: Array.isArray(homepage.primaryCtas) ? homepage.primaryCtas : [],
      trustBadges: Array.isArray(homepage.trustBadges) ? homepage.trustBadges : [],
      featuredCategories,
      featuredOffers: activeOffers
    };
  }

  // 2. getPrimaryCategoriesForNavigation
  getPrimaryCategoriesForNavigation() {
    const categories = this._getFromStorage('categories');
    return categories;
  }

  // 3. getQuoteBasketSummary
  getQuoteBasketSummary() {
    const baskets = this._getFromStorage('quote_baskets');
    const items = this._getFromStorage('quote_basket_items');

    const basket = baskets.find((b) => b.status === 'open');
    if (!basket) {
      return {
        hasOpenBasket: false,
        basketId: '',
        itemCount: 0,
        totalEstimatedPrice: 0
      };
    }

    const basketItems = items.filter((it) => it.basket_id === basket.id);
    const itemCount = basketItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const updatedBasket = this._recalculateQuoteBasketTotals(basket.id) || basket;

    return {
      hasOpenBasket: true,
      basketId: updatedBasket.id,
      itemCount,
      totalEstimatedPrice: updatedBasket.total_estimated_price || 0
    };
  }

  // 4. getProductFilterOptions
  getProductFilterOptions(categoryCode) {
    const productsAll = this._getFromStorage('products');
    const products = productsAll.filter((p) => p.category_code === categoryCode);

    const unique = (arr) => Array.from(new Set(arr.filter((v) => v != null)));

    const styles = unique(products.map((p) => p.style)).map((value) => ({
      value,
      label: this._enumLabel(value)
    }));

    const materials = unique(products.map((p) => p.material)).map((value) => ({
      value,
      label: this._enumLabel(value)
    }));

    const colours = unique(products.map((p) => p.colour)).map((value) => ({
      value,
      label: this._enumLabel(value)
    }));

    const glazingTypes = unique(products.map((p) => p.glazing_type)).map((value) => ({
      value,
      label: this._enumLabel(value)
    }));

    const securityFeaturesSet = new Set();
    products.forEach((p) => {
      if (Array.isArray(p.security_features)) {
        p.security_features.forEach((sf) => securityFeaturesSet.add(sf));
      }
    });
    const securityFeatures = Array.from(securityFeaturesSet).map((value) => ({
      value,
      label: this._enumLabel(value)
    }));

    let minPrice = 0;
    let maxPrice = 0;
    if (products.length > 0) {
      const prices = products.map((p) => p.price_per_unit || 0);
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }

    const priceRangeDefaults = {
      minPrice,
      maxPrice,
      step: 10
    };

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'most_popular', label: 'Most popular' }
    ];

    return {
      availableStyles: styles,
      availableMaterials: materials,
      availableColours: colours,
      availableGlazingTypes: glazingTypes,
      availableSecurityFeatures: securityFeatures,
      priceRangeDefaults,
      sortOptions
    };
  }

  // 5. listProductsForCategory
  listProductsForCategory(categoryCode, filters = {}, sortBy = 'relevance', page = 1, pageSize = 20) {
    const allProductsRaw = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    let products = allProductsRaw.filter((p) => p.category_code === categoryCode && p.is_active !== false);

    // Instrumentation for task completion tracking
    try {
      if (categoryCode === 'doors') {
        const instrumentationValue = {
          categoryCode,
          filters,
          sortBy,
          page,
          pageSize,
          timestamp: this._nowIso()
        };
        localStorage.setItem('task2_doorsFilterParams', JSON.stringify(instrumentationValue));
      }
      if (categoryCode === 'windows') {
        const instrumentationValue = {
          categoryCode,
          filters,
          sortBy,
          page,
          pageSize,
          timestamp: this._nowIso()
        };
        localStorage.setItem('task3_windowsFilterParams', JSON.stringify(instrumentationValue));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    // Filters
    if (filters.style) {
      products = products.filter((p) => p.style === filters.style);
    }
    if (filters.material) {
      products = products.filter((p) => p.material === filters.material);
    }
    if (filters.colour) {
      products = products.filter((p) => p.colour === filters.colour);
    }
    if (filters.glazingType) {
      products = products.filter((p) => p.glazing_type === filters.glazingType);
    }
    if (typeof filters.hasMultiPointLocking === 'boolean') {
      if (filters.hasMultiPointLocking) {
        products = products.filter((p) => p.has_multi_point_locking === true);
      }
    }

    if (typeof filters.minPrice === 'number') {
      products = products.filter((p) => (p.price_per_unit || 0) >= filters.minPrice);
    }
    if (typeof filters.maxPrice === 'number') {
      products = products.filter((p) => (p.price_per_unit || 0) <= filters.maxPrice);
    }

    if (filters.minEnergyRating) {
      const minRank = this._energyRatingRank(filters.minEnergyRating);
      products = products.filter((p) => this._energyRatingRank(p.energy_rating) <= minRank);
    }

    // Sorting
    if (sortBy === 'price_low_to_high') {
      products.sort((a, b) => (a.price_per_unit || 0) - (b.price_per_unit || 0));
    } else if (sortBy === 'price_high_to_low') {
      products.sort((a, b) => (b.price_per_unit || 0) - (a.price_per_unit || 0));
    } else if (sortBy === 'most_popular') {
      products.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }

    const totalCount = products.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedProductsRaw = products.slice(startIndex, endIndex);

    const pagedProducts = pagedProductsRaw.map((p) => this._attachCategoryToProduct(p, categories));

    return {
      products: pagedProducts,
      totalCount,
      page,
      pageSize,
      sortBy,
      appliedFilters: {
        style: filters.style || null,
        material: filters.material || null,
        colour: filters.colour || null,
        glazingType: filters.glazingType || null,
        hasMultiPointLocking: typeof filters.hasMultiPointLocking === 'boolean' ? filters.hasMultiPointLocking : null,
        minPrice: typeof filters.minPrice === 'number' ? filters.minPrice : null,
        maxPrice: typeof filters.maxPrice === 'number' ? filters.maxPrice : null,
        minEnergyRating: filters.minEnergyRating || null
      }
    };
  }

  // 6. getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    const productRaw = products.find((p) => p.id === productId) || null;
    if (!productRaw) {
      return {
        product: null,
        category: null,
        uiDetails: {
          primaryImageUrl: '',
          additionalImageUrls: [],
          pricePerUnitFormatted: '',
          energyRatingLabel: '',
          securityFeatureLabels: [],
          guaranteeSummary: '',
          installationTimeSummary: ''
        }
      };
    }

    const product = this._attachCategoryToProduct(productRaw, categories);
    const category = product.category || null;

    const primaryImageUrl = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '';
    const additionalImageUrls = Array.isArray(product.images) && product.images.length > 1 ? product.images.slice(1) : [];

    const energyRatingLabel = this._enumLabel(product.energy_rating);

    const securityFeatureLabels = Array.isArray(product.security_features)
      ? product.security_features.map((sf) => this._enumLabel(sf))
      : [];

    let guaranteeSummary = '';
    if (typeof product.guarantee_years === 'number') {
      guaranteeSummary = `${product.guarantee_years}-year guarantee`;
    }

    let installationTimeSummary = '';
    if (typeof product.estimated_installation_days === 'number') {
      installationTimeSummary = `${product.estimated_installation_days} day installation (estimate)`;
    }

    const uiDetails = {
      primaryImageUrl,
      additionalImageUrls,
      pricePerUnitFormatted: this._formatPriceGBP(product.price_per_unit || 0),
      energyRatingLabel,
      securityFeatureLabels,
      guaranteeSummary,
      installationTimeSummary
    };

    return {
      product,
      category,
      uiDetails
    };
  }

  // 7. createProductComparisonSession
  createProductComparisonSession(productIds) {
    const productsAll = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const comparisonSessions = this._getFromStorage('product_comparisons');

    const now = this._nowIso();
    const session = {
      id: this._generateId('comparison'),
      product_ids: Array.isArray(productIds) ? productIds.slice() : [],
      selected_product_id: null,
      created_at: now
    };

    comparisonSessions.push(session);
    this._saveToStorage('product_comparisons', comparisonSessions);

    const products = session.product_ids
      .map((id) => productsAll.find((p) => p.id === id) || null)
      .filter((p) => p != null)
      .map((p) => this._attachCategoryToProduct(p, categories));

    const attrCodes = [
      'price_per_unit',
      'energy_rating',
      'material',
      'colour',
      'glazing_type',
      'has_multi_point_locking'
    ];

    const comparisonAttributes = attrCodes.map((code) => {
      const values = products.map((p) => p[code]);
      const first = values[0];
      const isKeyDifference = values.some((v) => v !== first);
      return {
        attributeCode: code,
        label: this._enumLabel(code),
        isKeyDifference
      };
    });

    return {
      comparisonSession: session,
      products,
      comparisonAttributes
    };
  }

  // 8. selectProductFromComparison
  selectProductFromComparison(comparisonSessionId, selectedProductId) {
    const comparisonSessions = this._getFromStorage('product_comparisons');
    const productsAll = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    const session = comparisonSessions.find((s) => s.id === comparisonSessionId) || null;
    if (!session) {
      return {
        comparisonSession: null,
        selectedProduct: null
      };
    }

    session.selected_product_id = selectedProductId;
    this._saveToStorage('product_comparisons', comparisonSessions);

    const productRaw = productsAll.find((p) => p.id === selectedProductId) || null;
    const selectedProduct = productRaw ? this._attachCategoryToProduct(productRaw, categories) : null;

    return {
      comparisonSession: session,
      selectedProduct
    };
  }

  // 9. addConfiguredProductToQuoteBasket
  addConfiguredProductToQuoteBasket(productId, configurationName, configurationDetails, quantity = 1) {
    const products = this._getFromStorage('products');
    const items = this._getFromStorage('quote_basket_items');

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { success: false, basket: null, addedItem: null, message: 'Product not found.' };
    }

    const basket = this._getOrCreateQuoteBasket();

    const unitPrice = typeof product.price_per_unit === 'number' ? product.price_per_unit : 0;

    const item = {
      id: this._generateId('basket_item'),
      basket_id: basket.id,
      source_type: 'product',
      product_id: productId,
      instant_quote_request_id: null,
      offer_id: null,
      configuration_name: configurationName || '',
      configuration_details: configurationDetails || '',
      quantity: quantity || 1,
      unit_price_estimate: unitPrice,
      line_total_estimate: unitPrice * (quantity || 1),
      added_at: this._nowIso()
    };

    items.push(item);

    const baskets = this._getFromStorage('quote_baskets');
    const basketIndex = baskets.findIndex((b) => b.id === basket.id);
    if (basketIndex !== -1) {
      const basketItems = items.filter((it) => it.basket_id === basket.id);
      baskets[basketIndex].items = basketItems.map((it) => it.id);
      this._saveToStorage('quote_baskets', baskets);
    }

    this._saveToStorage('quote_basket_items', items);
    const updatedBasket = this._recalculateQuoteBasketTotals(basket.id) || basket;

    return {
      success: true,
      basket: updatedBasket,
      addedItem: item,
      message: 'Item added to quote basket.'
    };
  }

  // 10. getQuoteBasketDetails
  getQuoteBasketDetails() {
    const baskets = this._getFromStorage('quote_baskets');
    const items = this._getFromStorage('quote_basket_items');
    const products = this._getFromStorage('products');
    const instantQuotes = this._getFromStorage('instant_quote_requests');
    const offers = this._getFromStorage('offers');
    const categories = this._getFromStorage('categories');

    const basket = baskets.find((b) => b.status === 'open');
    if (!basket) {
      return {
        basket: null,
        itemsDetailed: []
      };
    }

    const basketItems = items.filter((it) => it.basket_id === basket.id);

    const itemsDetailed = basketItems.map((it) => {
      const productRaw = it.product_id ? products.find((p) => p.id === it.product_id) || null : null;
      const product = productRaw ? this._attachCategoryToProduct(productRaw, categories) : null;
      const instantQuote = it.instant_quote_request_id
        ? instantQuotes.find((q) => q.id === it.instant_quote_request_id) || null
        : null;
      const offer = it.offer_id ? offers.find((o) => o.id === it.offer_id) || null : null;

      const itemWithRelations = {
        ...it,
        product,
        instantQuoteRequest: instantQuote,
        offer,
        basket
      };

      let sourceSummary = '';
      if (it.source_type === 'product') {
        sourceSummary = 'Product';
      } else if (it.source_type === 'instant_quote') {
        sourceSummary = 'Instant quote';
      } else if (it.source_type === 'offer') {
        sourceSummary = 'Offer';
      }

      return {
        item: itemWithRelations,
        product,
        sourceSummary
      };
    });

    const updatedBasket = this._recalculateQuoteBasketTotals(basket.id) || basket;

    return {
      basket: updatedBasket,
      itemsDetailed
    };
  }

  // 11. updateQuoteBasketItemQuantity
  updateQuoteBasketItemQuantity(quoteBasketItemId, quantity) {
    const items = this._getFromStorage('quote_basket_items');
    const products = this._getFromStorage('products');

    const itemIndex = items.findIndex((it) => it.id === quoteBasketItemId);
    if (itemIndex === -1) {
      return { success: false, basket: null, updatedItem: null, message: 'Item not found.' };
    }

    const item = items[itemIndex];
    const product = item.product_id ? products.find((p) => p.id === item.product_id) || null : null;
    const unitPrice = item.unit_price_estimate != null
      ? item.unit_price_estimate
      : product && typeof product.price_per_unit === 'number'
        ? product.price_per_unit
        : 0;

    const qty = quantity || 1;
    item.quantity = qty;
    item.line_total_estimate = unitPrice * qty;

    items[itemIndex] = item;
    this._saveToStorage('quote_basket_items', items);

    const updatedBasket = this._recalculateQuoteBasketTotals(item.basket_id);

    return {
      success: true,
      basket: updatedBasket,
      updatedItem: item,
      message: 'Quote basket item updated.'
    };
  }

  // 12. removeQuoteBasketItem
  removeQuoteBasketItem(quoteBasketItemId) {
    const items = this._getFromStorage('quote_basket_items');
    const item = items.find((it) => it.id === quoteBasketItemId) || null;
    if (!item) {
      return { success: false, basket: null, message: 'Item not found.' };
    }

    const newItems = items.filter((it) => it.id !== quoteBasketItemId);
    this._saveToStorage('quote_basket_items', newItems);

    const baskets = this._getFromStorage('quote_baskets');
    const basketIndex = baskets.findIndex((b) => b.id === item.basket_id);
    let basket = basketIndex !== -1 ? baskets[basketIndex] : null;

    if (basket) {
      const basketItems = newItems.filter((it) => it.basket_id === basket.id);
      basket.items = basketItems.map((it) => it.id);
      this._saveToStorage('quote_baskets', baskets);
      basket = this._recalculateQuoteBasketTotals(basket.id);
    }

    return {
      success: true,
      basket,
      message: 'Item removed from quote basket.'
    };
  }

  // 13. submitQuoteBasketAsEnquiry
  submitQuoteBasketAsEnquiry(contactName, contactEmail, contactPhone, contactPostcode, additionalNotes) {
    const baskets = this._getFromStorage('quote_baskets');
    const items = this._getFromStorage('quote_basket_items');

    const basket = baskets.find((b) => b.status === 'open');
    if (!basket) {
      return { success: false, enquiry: null, message: 'No open quote basket to submit.' };
    }

    const updatedBasket = this._recalculateQuoteBasketTotals(basket.id) || basket;

    const basketItems = items.filter((it) => it.basket_id === basket.id);
    const totalQty = basketItems.reduce((sum, it) => sum + (it.quantity || 0), 0);

    const enquiry = {
      id: this._generateId('quote_enquiry'),
      source_type: 'quote_basket',
      basket_id: basket.id,
      instant_quote_request_id: null,
      offer_id: null,
      property_type: null,
      budget: null,
      total_estimated_price: updatedBasket.total_estimated_price || 0,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || '',
      contact_postcode: contactPostcode || '',
      additional_notes: additionalNotes || '',
      status: 'submitted',
      created_at: this._nowIso()
    };

    const enquiries = this._getFromStorage('quote_enquiries');
    enquiries.push(enquiry);
    this._saveToStorage('quote_enquiries', enquiries);

    const basketIndex = baskets.findIndex((b) => b.id === basket.id);
    if (basketIndex !== -1) {
      baskets[basketIndex].status = 'submitted';
      baskets[basketIndex].updated_at = this._nowIso();
      this._saveToStorage('quote_baskets', baskets);
    }

    const message = `Quote enquiry submitted with ${totalQty} item(s) in the basket.`;

    return {
      success: true,
      enquiry,
      message
    };
  }

  // 14. getInstantQuoteFormOptions
  getInstantQuoteFormOptions() {
    const propertyTypes = [
      'house',
      'bungalow',
      'flat',
      'apartment',
      'maisonette',
      'other'
    ].map((value) => ({ value, label: this._enumLabel(value) }));

    const windowStyles = [
      'casement',
      'sash',
      'tilt_and_turn',
      'bay',
      'other'
    ].map((value) => ({ value, label: this._enumLabel(value) }));

    const materials = [
      'upvc',
      'aluminium',
      'timber',
      'composite',
      'steel',
      'other'
    ].map((value) => ({ value, label: this._enumLabel(value) }));

    const colours = [
      'white',
      'black',
      'grey',
      'brown',
      'cream',
      'other'
    ].map((value) => ({ value, label: this._enumLabel(value) }));

    const glazingTypes = [
      'single_glazed',
      'double_glazed',
      'triple_glazed'
    ].map((value) => ({ value, label: this._enumLabel(value) }));

    const energyRatings = [
      'a_plus_plus',
      'a_plus',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g'
    ].map((value) => ({ value, label: this._enumLabel(value) }));

    const quantityDefaults = {
      min: 1,
      max: 50,
      default: 4
    };

    const budgetDefaults = {
      min: 500,
      max: 50000,
      step: 100
    };

    return {
      propertyTypes,
      windowStyles,
      materials,
      colours,
      glazingTypes,
      energyRatings,
      quantityDefaults,
      budgetDefaults
    };
  }

  // 15. calculateInstantQuoteEstimate
  calculateInstantQuoteEstimate(
    propertyType,
    windowStyle,
    material,
    colour,
    glazingType,
    energyRating,
    quantity,
    maxBudget
  ) {
    const products = this._getFromStorage('products');

    // Consider only window products in the 'windows' category
    let candidates = products.filter(
      (p) =>
        p.category_code === 'windows' &&
        p.style === windowStyle &&
        p.material === material &&
        p.colour === colour &&
        p.glazing_type === glazingType
    );

    // Treat requested energyRating as minimum requirement
    const minRank = this._energyRatingRank(energyRating);
    candidates = candidates.filter((p) => this._energyRatingRank(p.energy_rating) <= minRank);

    let estimated_price_min = null;
    let estimated_price_max = null;
    let message = '';

    if (candidates.length === 0) {
      message = 'We could not find matching products for this configuration. A consultant will provide a custom quote.';
    } else {
      const avgUnitPrice =
        candidates.reduce((sum, p) => sum + (p.price_per_unit || 0), 0) / candidates.length;
      const qty = quantity || 1;
      const total = avgUnitPrice * qty;
      estimated_price_min = total * 0.9;
      estimated_price_max = total * 1.1;

      if (typeof maxBudget === 'number') {
        if (estimated_price_min <= maxBudget) {
          message = 'Your budget should be sufficient for this configuration.';
        } else {
          message = 'This configuration is likely to exceed your budget. We can still provide a tailored quote.';
        }
      } else {
        message = 'Instant estimate calculated based on similar installations.';
      }
    }

    const can_meet_budget =
      typeof maxBudget === 'number' && estimated_price_min != null
        ? estimated_price_min <= maxBudget
        : null;

    const instantQuoteRequest = {
      id: this._generateId('instant_quote'),
      property_type: propertyType,
      window_style: windowStyle,
      material,
      colour,
      glazing_type: glazingType,
      energy_rating: energyRating,
      quantity: quantity || 1,
      max_budget: typeof maxBudget === 'number' ? maxBudget : null,
      estimated_price_min,
      estimated_price_max,
      can_meet_budget,
      status: 'estimated',
      contact_name: '',
      contact_email: '',
      contact_postcode: '',
      contact_phone: '',
      additional_notes: '',
      created_at: this._nowIso()
    };

    const requests = this._getFromStorage('instant_quote_requests');
    requests.push(instantQuoteRequest);
    this._saveToStorage('instant_quote_requests', requests);

    return {
      instantQuoteRequest,
      message
    };
  }

  // 16. submitInstantQuoteEnquiry
  submitInstantQuoteEnquiry(
    instantQuoteRequestId,
    contactName,
    contactEmail,
    contactPostcode,
    contactPhone,
    additionalNotes
  ) {
    const requests = this._getFromStorage('instant_quote_requests');
    const enquiries = this._getFromStorage('quote_enquiries');

    const requestIndex = requests.findIndex((r) => r.id === instantQuoteRequestId);
    if (requestIndex === -1) {
      return {
        success: false,
        instantQuoteRequest: null,
        enquiry: null,
        message: 'Instant quote request not found.'
      };
    }

    const request = requests[requestIndex];
    request.contact_name = contactName;
    request.contact_email = contactEmail;
    request.contact_postcode = contactPostcode || '';
    request.contact_phone = contactPhone || '';
    request.additional_notes = additionalNotes || '';
    request.status = 'enquiry_submitted';

    requests[requestIndex] = request;
    this._saveToStorage('instant_quote_requests', requests);

    const enquiry = {
      id: this._generateId('quote_enquiry'),
      source_type: 'instant_quote',
      basket_id: null,
      instant_quote_request_id: request.id,
      offer_id: null,
      property_type: request.property_type,
      budget: request.max_budget || null,
      total_estimated_price: request.estimated_price_max || null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || '',
      contact_postcode: contactPostcode || '',
      additional_notes: additionalNotes || '',
      status: 'submitted',
      created_at: this._nowIso()
    };

    enquiries.push(enquiry);
    this._saveToStorage('quote_enquiries', enquiries);

    return {
      success: true,
      instantQuoteRequest: request,
      enquiry,
      message: 'Instant quote enquiry submitted.'
    };
  }

  // 17. getConsultationBookingOptions
  getConsultationBookingOptions() {
    const serviceInterestOptions = [
      { value: 'windows', label: 'Windows' },
      { value: 'doors', label: 'Doors' },
      { value: 'windows_and_doors', label: 'Windows & Doors' },
      { value: 'conservatories', label: 'Conservatories' },
      { value: 'other', label: 'Other' }
    ];

    const timeSlotOptions = [
      '08_00_10_00',
      '10_00_12_00',
      '12_00_14_00',
      '14_00_16_00',
      '16_00_18_00',
      '18_00_20_00'
    ].map((value) => ({
      value,
      label: value.replace(/_/g, ':').replace(':00:00', ':00 - ').replace(':00', '').replace(' ', '') // simple label
    }));

    const today = new Date();
    const earliestAvailableDate = today.toISOString().slice(0, 10);

    const infoText = 'Choose a convenient date and time for your free home consultation.';

    return {
      serviceInterestOptions,
      timeSlotOptions,
      earliestAvailableDate,
      infoText
    };
  }

  // 18. submitConsultationBooking
  submitConsultationBooking(
    serviceInterests,
    postcode,
    appointmentDate,
    timeSlot,
    contactName,
    contactPhone,
    contactEmail,
    additionalNotes
  ) {
    const bookings = this._getFromStorage('consultation_bookings');

    const booking = {
      id: this._generateId('consultation'),
      service_interests: Array.isArray(serviceInterests) ? serviceInterests.slice() : [],
      postcode,
      appointment_date: new Date(appointmentDate).toISOString(),
      time_slot: timeSlot,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      additional_notes: additionalNotes || '',
      status: 'requested',
      created_at: this._nowIso()
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    return {
      success: true,
      booking,
      message: 'Consultation request submitted.'
    };
  }

  // 19. getFinanceOverview
  getFinanceOverview() {
    const overview = this._getFromStorage('finance_overview', {
      summaryText: '',
      representativeExampleText: ''
    });
    const plans = this._getFromStorage('finance_plans');
    const activePlans = plans.filter((p) => p.is_active);

    return {
      summaryText: overview.summaryText || '',
      representativeExampleText: overview.representativeExampleText || '',
      activePlans
    };
  }

  // 20. calculateFinanceOptions
  calculateFinanceOptions(purchaseAmount, termMonths) {
    const plans = this._getFromStorage('finance_plans');
    const activePlans = plans.filter((p) => {
      if (!p.is_active) return false;
      if (typeof p.min_amount === 'number' && purchaseAmount < p.min_amount) return false;
      if (typeof p.max_amount === 'number' && purchaseAmount > p.max_amount) return false;
      if (false && typeof p.min_term_months === 'number' && termMonths < p.min_term_months) return false;
      if (false && typeof p.max_term_months === 'number' && termMonths > p.max_term_months) return false;
      return true;
    });

    const options = activePlans.map((plan) => {
      const calc = this._calculateFinanceRepaymentForPlan(plan, purchaseAmount, termMonths);
      return {
        financePlan: plan,
        monthlyRepayment: calc.monthlyRepayment,
        totalPayable: calc.totalPayable,
        representativeApr: calc.representativeApr
      };
    });

    return {
      purchaseAmount,
      termMonths,
      options
    };
  }

  // 21. startFinanceApplication
  startFinanceApplication(financePlanId, purchaseAmount, termMonths, monthlyRepayment) {
    const plans = this._getFromStorage('finance_plans');
    const applications = this._getFromStorage('finance_applications');

    const plan = plans.find((p) => p.id === financePlanId) || null;
    if (!plan) {
      return { success: false, application: null, message: 'Finance plan not found.' };
    }

    const application = {
      id: this._generateId('finance_app'),
      finance_plan_id: financePlanId,
      purchase_amount: purchaseAmount,
      term_months: termMonths,
      monthly_repayment: monthlyRepayment,
      customer_type: 'new_customer',
      applicant_name: '',
      applicant_email: '',
      applicant_phone: '',
      applicant_postcode: '',
      status: 'started',
      created_at: this._nowIso()
    };

    applications.push(application);
    this._saveToStorage('finance_applications', applications);

    return {
      success: true,
      application,
      message: 'Finance application started.'
    };
  }

  // 22. updateFinanceApplicationApplicant
  updateFinanceApplicationApplicant(
    financeApplicationId,
    customerType,
    applicantName,
    applicantEmail,
    applicantPhone,
    applicantPostcode
  ) {
    const applications = this._getFromStorage('finance_applications');
    const index = applications.findIndex((a) => a.id === financeApplicationId);

    if (index === -1) {
      return { success: false, application: null, message: 'Finance application not found.' };
    }

    const app = applications[index];
    app.customer_type = customerType;
    app.applicant_name = applicantName;
    app.applicant_email = applicantEmail;
    app.applicant_phone = applicantPhone || '';
    app.applicant_postcode = applicantPostcode || '';

    // Move to submitted status when applicant details are provided
    app.status = 'submitted';

    applications[index] = app;
    this._saveToStorage('finance_applications', applications);

    return {
      success: true,
      application: app,
      message: 'Finance application updated.'
    };
  }

  // 23. getServiceAreasOverview
  getServiceAreasOverview() {
    const overview = this._getFromStorage('service_areas_overview', { descriptionText: '' });
    const serviceAreas = this._getFromStorage('service_areas');

    return {
      descriptionText: overview.descriptionText || '',
      serviceAreas
    };
  }

  // 24. checkServiceCoverage
  checkServiceCoverage(postcode) {
    const serviceAreas = this._getFromStorage('service_areas');
    const coverageResults = this._getFromStorage('coverage_check_results');

    const matched = this._matchServiceAreaForPostcode(postcode);

    const coverageCheck = {
      id: this._generateId('coverage'),
      postcode,
      coverage_status: matched.coverageStatus,
      service_area_id: matched.serviceArea ? matched.serviceArea.id : null,
      notes: matched.notes || '',
      checked_at: this._nowIso()
    };

    coverageResults.push(coverageCheck);
    this._saveToStorage('coverage_check_results', coverageResults);

    let userMessage = '';
    if (coverageCheck.coverage_status === 'covered') {
      userMessage = 'Good news – we cover your area.';
    } else if (coverageCheck.coverage_status === 'partially_covered') {
      userMessage = 'We partially cover your area. Please request a callback to confirm availability.';
    } else {
      userMessage = 'Sorry, we do not currently cover this postcode.';
    }

    const coverageCheckWithRelations = this._attachRelationsToCoverageCheck(coverageCheck, serviceAreas);

    return {
      coverageCheck: coverageCheckWithRelations,
      matchedServiceArea: matched.serviceArea || null,
      userMessage
    };
  }

  // 25. requestCoverageCallback
  requestCoverageCallback(coverageCheckResultId, postcode, preferredTimeSlot, contactName, contactPhone) {
    const coverageChecks = this._getFromStorage('coverage_check_results');
    const serviceAreas = this._getFromStorage('service_areas');
    const callbacks = this._getFromStorage('callback_requests');

    const coverageCheck = coverageChecks.find((c) => c.id === coverageCheckResultId) || null;
    if (!coverageCheck) {
      return {
        success: false,
        callbackRequest: null,
        message: 'Coverage check result not found.'
      };
    }

    const effectivePostcode = postcode || coverageCheck.postcode;

    const callbackRequest = {
      id: this._generateId('callback'),
      postcode: effectivePostcode,
      coverage_check_result_id: coverageCheck.id,
      preferred_time_slot: preferredTimeSlot,
      contact_name: contactName,
      contact_phone: contactPhone,
      source: 'service_area_page',
      status: 'requested',
      created_at: this._nowIso()
    };

    callbacks.push(callbackRequest);
    this._saveToStorage('callback_requests', callbacks);

    const enriched = this._attachRelationsToCallbackRequest(callbackRequest, coverageChecks, serviceAreas);

    return {
      success: true,
      callbackRequest: enriched,
      message: 'Callback request submitted.'
    };
  }

  // 26. getReviewFilterOptions
  getReviewFilterOptions() {
    const reviews = this._getFromStorage('reviews');

    const unique = (arr) => Array.from(new Set(arr.filter((v) => v != null)));

    const serviceTypes = unique(reviews.map((r) => r.service_type));
    const serviceTypeOptions = serviceTypes.map((value) => ({
      value,
      label: this._enumLabel(value)
    }));

    const locations = unique(reviews.map((r) => r.location_city));
    const locationOptions = locations.map((value) => ({
      value,
      label: value
    }));

    const ratingFilterOptions = [
      { minRating: 5, label: '5 stars' },
      { minRating: 4, label: '4 stars & up' },
      { minRating: 3, label: '3 stars & up' }
    ];

    const sortOptions = [
      { value: 'most_recent', label: 'Most recent' },
      { value: 'highest_rated', label: 'Highest rated' },
      { value: 'lowest_rated', label: 'Lowest rated' }
    ];

    return {
      serviceTypeOptions,
      locationOptions,
      ratingFilterOptions,
      sortOptions
    };
  }

  // 27. listReviews
  listReviews(filters = {}, sortBy = 'most_recent', page = 1, pageSize = 20) {
    let reviews = this._getFromStorage('reviews');

    if (filters.serviceType) {
      reviews = reviews.filter((r) => r.service_type === filters.serviceType);
    }
    if (filters.locationCity) {
      reviews = reviews.filter((r) => r.location_city === filters.locationCity);
    }
    if (typeof filters.minRating === 'number') {
      reviews = reviews.filter((r) => (r.rating || 0) >= filters.minRating);
    }

    if (sortBy === 'most_recent') {
      reviews.sort((a, b) => new Date(b.review_date) - new Date(a.review_date));
    } else if (sortBy === 'highest_rated') {
      reviews.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'lowest_rated') {
      reviews.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }

    const totalCount = reviews.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedReviews = reviews.slice(startIndex, endIndex);

    // Instrumentation for task completion tracking
    try {
      const instrumentationValue = {
        filters,
        sortBy,
        page,
        pageSize,
        timestamp: this._nowIso()
      };
      localStorage.setItem('task7_reviewListParams', JSON.stringify(instrumentationValue));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      reviews: pagedReviews,
      totalCount,
      page,
      pageSize,
      sortBy,
      appliedFilters: {
        serviceType: filters.serviceType || null,
        locationCity: filters.locationCity || null,
        minRating: typeof filters.minRating === 'number' ? filters.minRating : null
      }
    };
  }

  // 28. getReviewDetails
  getReviewDetails(reviewId) {
    const reviews = this._getFromStorage('reviews');
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    const review = reviews.find((r) => r.id === reviewId) || null;
    if (!review) {
      return {
        review: null,
        relatedProducts: []
      };
    }

    const relatedProducts = Array.isArray(review.product_ids)
      ? review.product_ids
          .map((id) => products.find((p) => p.id === id) || null)
          .filter((p) => p != null)
          .map((p) => this._attachCategoryToProduct(p, categories))
      : [];

    // Instrumentation for task completion tracking
    try {
      const instrumentationValue = {
        reviewId,
        openedAt: this._nowIso()
      };
      localStorage.setItem('task7_openedReviewId', JSON.stringify(instrumentationValue));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      review,
      relatedProducts
    };
  }

  // 29. getAftercareOverview
  getAftercareOverview() {
    const overview = this._getFromStorage('aftercare_overview', {
      overviewText: '',
      warrantySummaryText: ''
    });

    const issueTypes = [
      'condensation_between_panes',
      'difficulty_opening_or_closing',
      'lock_or_handle_issue',
      'drafts_or_leaks',
      'glass_damage',
      'frame_or_seal_damage',
      'other'
    ];

    const issueTypeOptions = issueTypes.map((value) => ({
      value,
      label: this._enumLabel(value),
      description: ''
    }));

    return {
      overviewText: overview.overviewText || '',
      warrantySummaryText: overview.warrantySummaryText || '',
      issueTypeOptions
    };
  }

  // 30. submitAftercareIssue
  submitAftercareIssue(
    issueType,
    installationMonth,
    installationYear,
    numberOfAffectedWindows,
    contactName,
    contactEmail,
    contactPostcode,
    issueDescription
  ) {
    const issues = this._getFromStorage('aftercare_issues');

    const installationDate = new Date(installationYear, installationMonth - 1, 1).toISOString();

    const issue = {
      id: this._generateId('aftercare'),
      issue_type: issueType,
      installation_date: installationDate,
      number_of_affected_windows:
        typeof numberOfAffectedWindows === 'number' ? numberOfAffectedWindows : null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_postcode: contactPostcode,
      issue_description: issueDescription,
      status: 'submitted',
      submitted_at: this._nowIso()
    };

    issues.push(issue);
    this._saveToStorage('aftercare_issues', issues);

    return {
      success: true,
      aftercareIssue: issue,
      message: 'Aftercare issue submitted.'
    };
  }

  // 31. listActiveOffers
  listActiveOffers(applicableToFilter) {
    const offers = this._getFromStorage('offers');
    const now = new Date();

    const isApplicable = (offer, filter) => {
      if (!filter) return true;
      if (offer.applicable_to === 'all_products') return true;
      if (filter === offer.applicable_to) return true;
      if (filter === 'windows' && offer.applicable_to === 'windows_and_doors') return true;
      if (filter === 'doors' && offer.applicable_to === 'windows_and_doors') return true;
      if (filter === 'windows_and_doors' && (offer.applicable_to === 'windows' || offer.applicable_to === 'doors')) return true;
      return false;
    };

    const activeOffers = offers.filter((o) => {
      if (!o.is_active) return false;
      const start = o.start_date ? new Date(o.start_date) : null;
      const end = o.end_date ? new Date(o.end_date) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      if (!isApplicable(o, applicableToFilter)) return false;
      return true;
    });

    return {
      offers: activeOffers
    };
  }

  // 32. getOfferDetails
  getOfferDetails(offerId) {
    const offers = this._getFromStorage('offers');
    const offer = offers.find((o) => o.id === offerId) || null;

    if (!offer) {
      return {
        offer: null,
        isCurrentlyActive: false,
        userMessage: 'Offer not found.'
      };
    }

    const now = new Date();
    const start = offer.start_date ? new Date(offer.start_date) : null;
    const end = offer.end_date ? new Date(offer.end_date) : null;

    const isCurrentlyActive =
      offer.is_active && (!start || now >= start) && (!end || now <= end);

    let userMessage = '';
    if (isCurrentlyActive) {
      userMessage = 'This offer is currently available.';
    } else if (!offer.is_active) {
      userMessage = 'This offer is no longer active.';
    } else if (start && now < start) {
      userMessage = 'This offer is not yet active.';
    } else if (end && now > end) {
      userMessage = 'This offer has expired.';
    }

    return {
      offer,
      isCurrentlyActive,
      userMessage
    };
  }

  // 33. submitOfferEnquiry
  submitOfferEnquiry(
    offerId,
    interestType,
    numberOfWindows,
    numberOfDoors,
    enteredPromoCode,
    contactName,
    contactEmail,
    contactPhone
  ) {
    const offers = this._getFromStorage('offers');
    const offerEnquiries = this._getFromStorage('offer_enquiries');

    const validation = this._validateAndApplyOfferPromoCode(
      offerId,
      enteredPromoCode,
      interestType,
      numberOfWindows,
      numberOfDoors
    );

    if (!validation.valid) {
      return {
        success: false,
        offerEnquiry: null,
        message: validation.message
      };
    }

    const offer = validation.offer;

    const enquiry = {
      id: this._generateId('offer_enquiry'),
      offer_id: offer.id,
      interest_type: interestType,
      number_of_windows: typeof numberOfWindows === 'number' ? numberOfWindows : null,
      number_of_doors: typeof numberOfDoors === 'number' ? numberOfDoors : null,
      entered_promo_code: enteredPromoCode,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || '',
      status: 'submitted',
      submitted_at: this._nowIso()
    };

    offerEnquiries.push(enquiry);
    this._saveToStorage('offer_enquiries', offerEnquiries);

    const enrichedEnquiry = this._attachOfferToOfferEnquiry(enquiry, offers);

    return {
      success: true,
      offerEnquiry: enrichedEnquiry,
      message: 'Offer enquiry submitted.'
    };
  }

  // 34. getAboutUsContent
  getAboutUsContent() {
    const about = this._getFromStorage('about_us_content', {
      companyHistoryHtml: '',
      missionStatement: '',
      experienceSummary: '',
      teamHighlights: [],
      accreditations: []
    });

    return {
      companyHistoryHtml: about.companyHistoryHtml || '',
      missionStatement: about.missionStatement || '',
      experienceSummary: about.experienceSummary || '',
      teamHighlights: Array.isArray(about.teamHighlights) ? about.teamHighlights : [],
      accreditations: Array.isArray(about.accreditations) ? about.accreditations : []
    };
  }

  // 35. getContactPageInfo
  getContactPageInfo() {
    const contact = this._getFromStorage('contact_page_info', {
      phoneNumbers: [],
      emailAddresses: [],
      officeAddress: '',
      mapEmbedToken: '',
      openingHours: [],
      generalEnquiryPurposeOptions: []
    });

    return {
      phoneNumbers: Array.isArray(contact.phoneNumbers) ? contact.phoneNumbers : [],
      emailAddresses: Array.isArray(contact.emailAddresses) ? contact.emailAddresses : [],
      officeAddress: contact.officeAddress || '',
      mapEmbedToken: contact.mapEmbedToken || '',
      openingHours: Array.isArray(contact.openingHours) ? contact.openingHours : [],
      generalEnquiryPurposeOptions: Array.isArray(contact.generalEnquiryPurposeOptions)
        ? contact.generalEnquiryPurposeOptions
        : []
    };
  }

  // 36. submitContactEnquiry
  submitContactEnquiry(subject, enquiryType, message, contactName, contactEmail, contactPhone) {
    const enquiries = this._getFromStorage('contact_enquiries');

    const referenceId = this._generateId('contact');
    const record = {
      id: referenceId,
      subject,
      enquiry_type: enquiryType,
      message,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || '',
      created_at: this._nowIso()
    };

    enquiries.push(record);
    this._saveToStorage('contact_enquiries', enquiries);

    return {
      success: true,
      referenceId,
      message: 'Your message has been sent.'
    };
  }

  // 37. getLegalContent
  getLegalContent(sectionCode) {
    const legalContent = this._getFromStorage('legal_content', {});
    const section = legalContent[sectionCode] || null;

    if (!section) {
      return {
        sectionCode,
        title: '',
        lastUpdated: '',
        contentHtml: '',
        downloadable: false
      };
    }

    return {
      sectionCode,
      title: section.title || '',
      lastUpdated: section.lastUpdated || '',
      contentHtml: section.contentHtml || '',
      downloadable: !!section.downloadable
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