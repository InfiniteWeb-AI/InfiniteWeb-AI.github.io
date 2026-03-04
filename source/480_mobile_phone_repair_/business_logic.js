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
    this.idCounter = this._getNextIdCounter(); // advance once on construct
  }

  _initStorage() {
    // Initialize all data tables/collections in localStorage if they do not exist yet
    const arrayKeys = [
      'device_brands',
      'device_models',
      'issue_types',
      'repair_services',
      'store_locations',
      'technicians',
      'quote_options',
      'quote_requests',
      'accessory_products',
      'protection_plans',
      'repair_bundles',
      'cart_items',
      'coupons',
      'repair_orders',
      'troubleshooting_sessions',
      'favorite_locations',
      'compare_bundle_ids',
      'support_tickets'
    ];

    arrayKeys.forEach((key) => {
      if (localStorage.getItem(key) == null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // legacy keys from skeleton (not used but kept for compatibility)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
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

  _nowIso() {
    return new Date().toISOString();
  }

  // --------- Generic entity helpers ---------

  _findBrandById(id) {
    const brands = this._getFromStorage('device_brands');
    return brands.find((b) => b.id === id) || null;
  }

  _findModelById(id) {
    const models = this._getFromStorage('device_models');
    return models.find((m) => m.id === id) || null;
  }

  _findIssueTypeById(id) {
    const issues = this._getFromStorage('issue_types');
    return issues.find((i) => i.id === id) || null;
  }

  _findStoreById(id) {
    const stores = this._getFromStorage('store_locations');
    return stores.find((s) => s.id === id) || null;
  }

  _findRepairServiceById(id) {
    const services = this._getFromStorage('repair_services');
    return services.find((s) => s.id === id) || null;
  }

  _findTechnicianById(id) {
    const techs = this._getFromStorage('technicians');
    return techs.find((t) => t.id === id) || null;
  }

  _findQuoteOptionById(id) {
    const opts = this._getFromStorage('quote_options');
    return opts.find((o) => o.id === id) || null;
  }

  _findAccessoryById(id) {
    const products = this._getFromStorage('accessory_products');
    return products.find((p) => p.id === id) || null;
  }

  _findProtectionPlanById(id) {
    const plans = this._getFromStorage('protection_plans');
    return plans.find((p) => p.id === id) || null;
  }

  _findRepairBundleById(id) {
    const bundles = this._getFromStorage('repair_bundles');
    return bundles.find((b) => b.id === id) || null;
  }

  _findCouponByCode(code) {
    const coupons = this._getFromStorage('coupons');
    return coupons.find((c) => c.code === code) || null;
  }

  // --------- Cart helpers ---------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);

    // Handle legacy/invalid cart values (e.g., an empty array from older seeds)
    const isValidCartObject =
      cart &&
      typeof cart === 'object' &&
      !Array.isArray(cart) &&
      typeof cart.id === 'string';

    if (!isValidCartObject) {
      cart = {
        id: this._generateId('cart'),
        itemIds: [],
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        appliedCouponCode: null,
        appliedCouponDescription: null,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
    } else {
      // Ensure itemIds exists and is an array
      if (!Array.isArray(cart.itemIds)) {
        cart.itemIds = [];
      }
    }

    this._saveToStorage('cart', cart);
    return cart;
  }

  _computeDiscountForCart(cart, items) {
    const subtotal = items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
    let discountTotal = 0;
    let total = subtotal;

    if (cart.appliedCouponCode) {
      const coupon = this._findCouponByCode(cart.appliedCouponCode);
      if (coupon && coupon.isActive) {
        const now = new Date();
        if (coupon.validFrom) {
          const from = new Date(coupon.validFrom);
          if (now < from) {
            return { subtotal, discountTotal: 0, total: subtotal };
          }
        }
        if (coupon.validTo) {
          const to = new Date(coupon.validTo);
          if (now > to) {
            return { subtotal, discountTotal: 0, total: subtotal };
          }
        }
        if (coupon.minOrderTotal && subtotal < coupon.minOrderTotal) {
          return { subtotal, discountTotal: 0, total: subtotal };
        }

        // applicableItemTypes: 'all' or subset
        const applicable = coupon.applicableItemTypes && coupon.applicableItemTypes.length
          ? coupon.applicableItemTypes
          : ['all'];

        const hasApplicableItem = items.some((item) => {
          if (!applicable || applicable.includes('all')) return true;
          return applicable.includes(item.itemType);
        });

        if (!hasApplicableItem) {
          return { subtotal, discountTotal: 0, total: subtotal };
        }

        if (coupon.discountType === 'percentage') {
          discountTotal = subtotal * (coupon.discountValue / 100);
        } else if (coupon.discountType === 'fixed_amount') {
          discountTotal = coupon.discountValue;
        }
        if (discountTotal > subtotal) discountTotal = subtotal;
        total = subtotal - discountTotal;
      }
    }

    return { subtotal, discountTotal, total };
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const items = cartItems.filter((i) => i.cartId === cart.id);
    const discountResult = this._computeDiscountForCart(cart, items);

    cart.subtotal = discountResult.subtotal;
    cart.discountTotal = discountResult.discountTotal;
    cart.total = discountResult.total;
    cart.updatedAt = this._nowIso();

    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);
    return cart;
  }

  _validateAndApplyCoupon(cart, couponCode) {
    const coupon = this._findCouponByCode(couponCode);
    const cartItems = this._getFromStorage('cart_items').filter((i) => i.cartId === cart.id);

    if (!coupon || !coupon.isActive) {
      cart.appliedCouponCode = null;
      cart.appliedCouponDescription = null;
      cart.discountTotal = 0;
      cart.total = cart.subtotal;
      this._saveToStorage('cart', cart);
      return { success: false, message: 'Invalid or inactive coupon code.' };
    }

    const now = new Date();
    if (coupon.validFrom) {
      const from = new Date(coupon.validFrom);
      if (now < from) {
        return { success: false, message: 'Coupon is not yet valid.' };
      }
    }
    if (coupon.validTo) {
      const to = new Date(coupon.validTo);
      if (now > to) {
        return { success: false, message: 'Coupon has expired.' };
      }
    }

    const subtotal = cartItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
    if (coupon.minOrderTotal && subtotal < coupon.minOrderTotal) {
      return { success: false, message: 'Order total does not meet coupon minimum.' };
    }

    const applicable = coupon.applicableItemTypes && coupon.applicableItemTypes.length
      ? coupon.applicableItemTypes
      : ['all'];

    const hasApplicableItem = cartItems.some((item) => {
      if (!applicable || applicable.includes('all')) return true;
      return applicable.includes(item.itemType);
    });

    if (!hasApplicableItem) {
      return { success: false, message: 'Coupon does not apply to items in cart.' };
    }

    // Apply
    cart.appliedCouponCode = coupon.code;
    cart.appliedCouponDescription = coupon.description || '';
    const discountResult = this._computeDiscountForCart(cart, cartItems);
    cart.subtotal = discountResult.subtotal;
    cart.discountTotal = discountResult.discountTotal;
    cart.total = discountResult.total;
    cart.updatedAt = this._nowIso();
    this._saveToStorage('cart', cart);

    return { success: true, message: 'Coupon applied successfully.' };
  }

  // --------- Troubleshooting helpers ---------

  _getActiveTroubleshootingSession(sessionId) {
    const sessions = this._getFromStorage('troubleshooting_sessions');
    return sessions.find((s) => s.id === sessionId) || null;
  }

  _persistTroubleshootingStep(sessionId, questionId, selectedOptionId) {
    const sessions = this._getFromStorage('troubleshooting_sessions');
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) return null;
    const session = sessions[idx];
    if (!Array.isArray(session.questionAnswerSteps)) {
      session.questionAnswerSteps = [];
    }
    session.questionAnswerSteps.push({ questionId, selectedOptionId });
    sessions[idx] = session;
    this._saveToStorage('troubleshooting_sessions', sessions);
    return session;
  }

  _computeTroubleshootingRecommendation(session) {
    if (!session) return null;
    const issues = this._getFromStorage('issue_types');
    const services = this._getFromStorage('repair_services');

    let recommendedIssueTypeId = session.initialIssueTypeId || null;

    // Simple heuristic: map symptom keywords
    const symptom = (session.selectedSymptom || '').toLowerCase();
    if (!recommendedIssueTypeId) {
      if (symptom.includes('charge')) {
        const candidate = issues.find((i) =>
          (i.slug && i.slug.toLowerCase().includes('charging')) ||
          (i.name && i.name.toLowerCase().includes('charge'))
        );
        if (candidate) recommendedIssueTypeId = candidate.id;
      } else if (symptom.includes('battery')) {
        const candidate = issues.find((i) =>
          (i.slug && i.slug.toLowerCase().includes('battery')) ||
          (i.name && i.name.toLowerCase().includes('battery'))
        );
        if (candidate) recommendedIssueTypeId = candidate.id;
      }
    }

    if (!recommendedIssueTypeId && issues.length) {
      recommendedIssueTypeId = issues[0].id;
    }

    // Choose a repair service
    let recommendedServiceType = 'doorstep_pickup';
    let recommendedRepairServiceId = null;

    const matchingServices = services.filter((s) => {
      if (s.deviceType !== session.deviceType) return false;
      if (s.brandId !== session.brandId) return false;
      if (s.modelId !== session.modelId) return false;
      if (recommendedIssueTypeId && s.issueTypeId !== recommendedIssueTypeId) return false;
      return true;
    });

    // Prefer doorstep_pickup, then in_store, then others
    const preferenceOrder = ['doorstep_pickup', 'in_store', 'doorstep_repair', 'mail_in_repair'];
    for (const pref of preferenceOrder) {
      const found = matchingServices.find((s) => s.serviceType === pref);
      if (found) {
        recommendedRepairServiceId = found.id;
        recommendedServiceType = found.serviceType;
        break;
      }
    }

    if (!recommendedRepairServiceId && services.length) {
      const any = services.find((s) =>
        s.deviceType === session.deviceType &&
        s.brandId === session.brandId &&
        s.modelId === session.modelId
      );
      if (any) {
        recommendedRepairServiceId = any.id;
        recommendedServiceType = any.serviceType;
      }
    }

    const sessions = this._getFromStorage('troubleshooting_sessions');
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      sessions[idx].recommendedIssueTypeId = recommendedIssueTypeId || null;
      sessions[idx].recommendedServiceType = recommendedServiceType || null;
      sessions[idx].recommendedRepairServiceId = recommendedRepairServiceId || null;
      sessions[idx].completedAt = this._nowIso();
      this._saveToStorage('troubleshooting_sessions', sessions);
      return sessions[idx];
    }
    return null;
  }

  // --------- Compare bundle helper ---------

  _getCompareBundleList() {
    return this._getFromStorage('compare_bundle_ids', []);
  }

  _saveCompareBundleList(list) {
    this._saveToStorage('compare_bundle_ids', list || []);
  }

  // --------- Technician availability helper ---------

  _findAvailableTechnicians(repairServiceId, scheduledDate, timeWindowStart, timeWindowEnd, sortBy, minRating, minReviewCount) {
    const service = this._findRepairServiceById(repairServiceId);
    if (!service) return [];
    const techs = this._getFromStorage('technicians');
    const stores = this._getFromStorage('store_locations');

    let list = techs.filter((t) => {
      if (!t.isActive) return false;
      if (Array.isArray(t.serviceTypes) && !t.serviceTypes.includes(service.serviceType)) return false;
      if (Array.isArray(t.deviceTypes) && !t.deviceTypes.includes(service.deviceType)) return false;
      if (Array.isArray(t.brandIds) && !t.brandIds.includes(service.brandId)) return false;
      if (typeof minRating === 'number' && t.rating < minRating) return false;
      if (typeof minReviewCount === 'number' && t.reviewCount < minReviewCount) return false;
      return true;
    });

    if (sortBy === 'rating_low_to_high') {
      list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else {
      // default or 'rating_high_to_low'
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list.map((t) => {
      const store = t.primaryStoreId ? stores.find((s) => s.id === t.primaryStoreId) || null : null;
      return {
        technicianId: t.id,
        name: t.name,
        rating: t.rating,
        reviewCount: t.reviewCount,
        photoUrl: t.photoUrl || null,
        bioSnippet: t.bio ? String(t.bio).slice(0, 140) : '',
        primaryStoreName: store ? store.name : null,
        primaryStoreCity: store ? store.city : null,
        technician: t // foreign key resolution
      };
    });
  }

  // =================== CORE INTERFACE IMPLEMENTATIONS ===================

  // ---------- Homepage & Cart summary ----------

  getHomepageContent() {
    const raw = localStorage.getItem('homepage_content');
    if (!raw) {
      return {
        heroTitle: '',
        heroSubtitle: '',
        primaryCtas: [],
        highlightCards: [],
        quickLinks: []
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {
        heroTitle: '',
        heroSubtitle: '',
        primaryCtas: [],
        highlightCards: [],
        quickLinks: []
      };
    }
  }

  getCartSummary() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        itemCount: 0,
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        hasCoupon: false,
        appliedCouponCode: null
      };
    }
    const cartItems = this._getFromStorage('cart_items').filter((i) => i.cartId === cart.id);
    return {
      itemCount: cartItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
      subtotal: cart.subtotal || 0,
      discountTotal: cart.discountTotal || 0,
      total: cart.total || 0,
      hasCoupon: !!cart.appliedCouponCode,
      appliedCouponCode: cart.appliedCouponCode || null
    };
  }

  // ---------- Brand & Model listings ----------

  listBrandsByDeviceType(deviceType) {
    const brands = this._getFromStorage('device_brands');
    const models = this._getFromStorage('device_models');

    const brandIdsForType = new Set(
      models
        .filter((m) => m.deviceType === deviceType)
        .map((m) => m.brandId)
    );

    return brands
      .filter((b) => brandIdsForType.has(b.id))
      .sort((a, b) => {
        const soA = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
        const soB = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
        if (soA !== soB) return soA - soB;
        return (a.name || '').localeCompare(b.name || '');
      })
      .map((b) => ({
        brandId: b.id,
        name: b.name,
        slug: b.slug,
        logoUrl: b.logoUrl || null,
        brand: b // foreign key resolution
      }));
  }

  listModelsByBrandAndDeviceType(brandId, deviceType) {
    const models = this._getFromStorage('device_models');
    return models
      .filter((m) => m.brandId === brandId && m.deviceType === deviceType)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((m) => ({
        modelId: m.id,
        name: m.name,
        slug: m.slug,
        releaseYear: m.releaseYear,
        model: m // foreign key resolution
      }));
  }

  // ---------- Issue types ----------

  listIssueTypesForDevice(deviceType, brandId, modelId) {
    const services = this._getFromStorage('repair_services');
    const issueTypes = this._getFromStorage('issue_types');

    const issueIds = new Set(
      services
        .filter((s) =>
          s.deviceType === deviceType &&
          s.brandId === brandId &&
          s.modelId === modelId &&
          s.issueTypeId
        )
        .map((s) => s.issueTypeId)
    );

    const relevantIssues = issueTypes.filter((i) => issueIds.has(i.id));

    return relevantIssues.map((i) => ({
      issueTypeId: i.id,
      name: i.name,
      slug: i.slug,
      description: i.description || '',
      issueType: i // foreign key resolution
    }));
  }

  // ---------- Repair services: filters & search ----------

  getRepairServiceFilterOptions(deviceType, brandId, modelId, issueTypeId, serviceType) {
    let services = this._getFromStorage('repair_services');

    services = services.filter((s) => {
      if (s.deviceType !== deviceType) return false;
      if (s.brandId !== brandId) return false;
      if (s.modelId !== modelId) return false;
      if (issueTypeId && s.issueTypeId !== issueTypeId) return false;
      if (serviceType && s.serviceType !== serviceType) return false;
      return true;
    });

    const prices = services.map((s) => s.basePrice || 0);
    const distances = services
      .map((s) => (typeof s.distanceMiles === 'number' ? s.distanceMiles : null))
      .filter((v) => v != null);

    const priceRange = {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0
    };

    const distanceOptionsMiles = Array.from(new Set(distances)).sort((a, b) => a - b);

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'distance_near_to_far', label: 'Distance: Near to Far' },
      { value: 'availability', label: 'Availability' }
    ];

    const serviceTypeOptions = Array.from(new Set(services.map((s) => s.serviceType)));

    return { priceRange, distanceOptionsMiles, sortOptions, serviceTypeOptions };
  }

  searchRepairServices(deviceType, brandId, modelId, issueTypeId, serviceType, locationZip, maxDistanceMiles, minPrice, maxPrice, sortBy, sameDayOnly, page, pageSize) {
    const services = this._getFromStorage('repair_services');
    const brands = this._getFromStorage('device_brands');
    const models = this._getFromStorage('device_models');
    const issues = this._getFromStorage('issue_types');
    const stores = this._getFromStorage('store_locations');

    let filtered = services.filter((s) => {
      if (s.deviceType !== deviceType) return false;
      if (s.brandId !== brandId) return false;
      if (s.modelId !== modelId) return false;
      if (issueTypeId && s.issueTypeId !== issueTypeId) return false;
      if (serviceType && s.serviceType !== serviceType) return false;
      if (locationZip && s.locationZip && s.locationZip !== locationZip) return false;
      if (typeof maxDistanceMiles === 'number' && typeof s.distanceMiles === 'number' && s.distanceMiles > maxDistanceMiles) return false;
      if (typeof minPrice === 'number' && s.basePrice < minPrice) return false;
      if (typeof maxPrice === 'number' && s.basePrice > maxPrice) return false;
      if (sameDayOnly) {
        const hasBadge = Array.isArray(s.availabilityBadges) && s.availabilityBadges.includes('same-day');
        if (!(s.sameDayAvailable || hasBadge)) return false;
      }
      return true;
    });

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    } else if (sortBy === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'distance_near_to_far') {
      filtered.sort((a, b) => (a.distanceMiles || 0) - (b.distanceMiles || 0));
    } else if (sortBy === 'availability') {
      // same-day first, then by price
      filtered.sort((a, b) => {
        const aSame = a.sameDayAvailable || (Array.isArray(a.availabilityBadges) && a.availabilityBadges.includes('same-day')) ? 1 : 0;
        const bSame = b.sameDayAvailable || (Array.isArray(b.availabilityBadges) && b.availabilityBadges.includes('same-day')) ? 1 : 0;
        if (bSame !== aSame) return bSame - aSame;
        return (a.basePrice || 0) - (b.basePrice || 0);
      });
    }

    const total = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : total || 1;
    const start = (pg - 1) * size;
    const end = start + size;
    const slice = filtered.slice(start, end);

    return slice.map((s) => {
      const brand = brands.find((b) => b.id === s.brandId) || null;
      const model = models.find((m) => m.id === s.modelId) || null;
      const issue = issues.find((i) => i.id === s.issueTypeId) || null;
      const store = s.storeId ? stores.find((st) => st.id === s.storeId) || null : null;
      return {
        repairServiceId: s.id,
        name: s.name,
        providerName: s.providerName,
        serviceType: s.serviceType,
        deviceType: s.deviceType,
        brandName: brand ? brand.name : null,
        modelName: model ? model.name : null,
        issueName: issue ? issue.name : null,
        basePrice: s.basePrice,
        priceDescription: s.priceDescription || '',
        sameDayAvailable: !!s.sameDayAvailable,
        availabilityBadges: s.availabilityBadges || [],
        rating: s.rating || 0,
        reviewCount: s.reviewCount || 0,
        distanceMiles: s.distanceMiles != null ? s.distanceMiles : null,
        locationZip: s.locationZip || null,
        storeId: s.storeId || null,
        storeName: store ? store.name : null,
        estimatedDurationMinutes: s.estimatedDurationMinutes || null,
        // foreign key resolutions
        repairService: s,
        store: store,
        brand: brand,
        model: model,
        issueType: issue
      };
    });
  }

  getRepairServiceDetail(repairServiceId) {
    const s = this._findRepairServiceById(repairServiceId);
    if (!s) return null;
    const brand = this._findBrandById(s.brandId);
    const model = this._findModelById(s.modelId);
    const issue = this._findIssueTypeById(s.issueTypeId);
    const store = s.storeId ? this._findStoreById(s.storeId) : null;

    return {
      repairServiceId: s.id,
      name: s.name,
      description: s.description || '',
      deviceType: s.deviceType,
      brandId: s.brandId,
      brandName: brand ? brand.name : null,
      modelId: s.modelId,
      modelName: model ? model.name : null,
      issueTypeId: s.issueTypeId || null,
      issueName: issue ? issue.name : null,
      serviceType: s.serviceType,
      basePrice: s.basePrice,
      priceDescription: s.priceDescription || '',
      sameDayAvailable: !!s.sameDayAvailable,
      availabilityBadges: s.availabilityBadges || [],
      providerName: s.providerName,
      storeId: s.storeId || null,
      storeName: store ? store.name : null,
      storeCity: store ? store.city : null,
      storeZip: store ? store.zip : null,
      locationZip: s.locationZip || null,
      distanceMiles: s.distanceMiles != null ? s.distanceMiles : null,
      rating: s.rating || 0,
      reviewCount: s.reviewCount || 0,
      serviceSpeedOptions: s.serviceSpeedOptions || [],
      defaultRepairSpeed: s.defaultRepairSpeed || null,
      estimatedDurationMinutes: s.estimatedDurationMinutes || null,
      availableTimeWindows: s.availableTimeWindows || [],
      // foreign key resolutions
      repairService: s,
      brand: brand,
      model: model,
      issueType: issue,
      store: store
    };
  }

  getAvailableTimeWindowsForService(repairServiceId, date) {
    const s = this._findRepairServiceById(repairServiceId);
    if (!s || !Array.isArray(s.availableTimeWindows)) return [];

    // For now, mark all defined windows as available
    return s.availableTimeWindows.map((w) => {
      const parts = String(w).split('-');
      return {
        timeWindowStart: parts[0] || '',
        timeWindowEnd: parts[1] || '',
        isAvailable: true,
        availabilityNotes: ''
      };
    });
  }

  getAvailableTechniciansForRepair(repairServiceId, scheduledDate, timeWindowStart, timeWindowEnd, sortBy, minRating, minReviewCount) {
    return this._findAvailableTechnicians(repairServiceId, scheduledDate, timeWindowStart, timeWindowEnd, sortBy, minRating, minReviewCount);
  }

  createRepairOrderFromService(repairServiceId, scheduledDate, timeWindowStart, timeWindowEnd, repairSpeed, locationZip, technicianId, pickupStreet, pickupCity, pickupState, pickupZip, contactName, contactPhone, contactEmail, paymentMethod) {
    const service = this._findRepairServiceById(repairServiceId);
    if (!service) {
      return {
        success: false,
        message: 'Repair service not found.',
        repairOrderId: null,
        status: 'draft',
        scheduledDate,
        timeWindowStart,
        timeWindowEnd,
        serviceType: null,
        repairSpeed: repairSpeed || null,
        priceEstimate: 0,
        currency: null
      };
    }

    const orderId = this._generateId('repair_order');
    const orders = this._getFromStorage('repair_orders');

    const order = {
      id: orderId,
      source: 'repairs_page',
      deviceType: service.deviceType,
      brandId: service.brandId,
      modelId: service.modelId,
      issueTypeId: service.issueTypeId || null,
      serviceType: service.serviceType,
      repairSpeed: repairSpeed || service.defaultRepairSpeed || null,
      repairServiceId: service.id,
      bundleId: null,
      quoteOptionId: null,
      scheduledDate: new Date(scheduledDate).toISOString(),
      timeWindowStart: timeWindowStart || null,
      timeWindowEnd: timeWindowEnd || null,
      locationZip: locationZip || service.locationZip || null,
      storeId: service.storeId || null,
      technicianId: technicianId || null,
      pickupStreet: pickupStreet || null,
      pickupCity: pickupCity || null,
      pickupState: pickupState || null,
      pickupZip: pickupZip || null,
      contactName,
      contactPhone,
      contactEmail: contactEmail || null,
      paymentMethod: paymentMethod || null,
      priceEstimate: service.basePrice || 0,
      currency: null,
      status: 'confirmed',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    orders.push(order);
    this._saveToStorage('repair_orders', orders);

    return {
      success: true,
      message: 'Repair order created.',
      repairOrderId: orderId,
      status: order.status,
      scheduledDate,
      timeWindowStart,
      timeWindowEnd,
      serviceType: order.serviceType,
      repairSpeed: order.repairSpeed,
      priceEstimate: order.priceEstimate,
      currency: order.currency
    };
  }

  addRepairServiceToCart(repairServiceId, quantity) {
    const service = this._findRepairServiceById(repairServiceId);
    if (!service) {
      return { success: false, message: 'Repair service not found.', cartItemId: null, cartSummary: null };
    }
    const qty = quantity && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItemId = this._generateId('cart_item');
    const unitPrice = service.basePrice || 0;
    const totalPrice = unitPrice * qty;

    const item = {
      id: cartItemId,
      cartId: cart.id,
      itemType: 'repair_service',
      productId: null,
      repairServiceId: service.id,
      protectionPlanId: null,
      repairBundleId: null,
      planPaymentOption: null,
      quantity: qty,
      unitPrice,
      totalPrice,
      meta: null
    };

    cartItems.push(item);
    cart.itemIds.push(cartItemId);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const summary = this.getCartSummary();
    return {
      success: true,
      message: 'Repair service added to cart.',
      cartItemId,
      cartSummary: {
        itemCount: summary.itemCount,
        subtotal: summary.subtotal,
        discountTotal: summary.discountTotal,
        total: summary.total
      }
    };
  }

  // ---------- Quote options & requests ----------

  searchQuoteOptions(deviceType, brandId, modelId, issueTypeId, serviceType, maxPrice, sortBy) {
    const options = this._getFromStorage('quote_options');
    const brands = this._getFromStorage('device_brands');
    const models = this._getFromStorage('device_models');
    const issues = this._getFromStorage('issue_types');

    let filtered = options.filter((o) => {
      if (o.deviceType !== deviceType) return false;
      if (o.brandId !== brandId) return false;
      if (o.modelId !== modelId) return false;
      if (o.issueTypeId !== issueTypeId) return false;
      if (o.serviceType !== serviceType) return false;
      if (typeof maxPrice === 'number' && o.price > maxPrice) return false;
      return true;
    });

    if (sortBy === 'turnaround_fastest_first') {
      filtered.sort((a, b) => (a.turnaroundTimeHours || 0) - (b.turnaroundTimeHours || 0));
    } else if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return filtered.map((o) => {
      const brand = brands.find((b) => b.id === o.brandId) || null;
      const model = models.find((m) => m.id === o.modelId) || null;
      const issue = issues.find((i) => i.id === o.issueTypeId) || null;
      return {
        quoteOptionId: o.id,
        name: o.name,
        providerName: o.providerName || null,
        price: o.price,
        currency: o.currency || null,
        turnaroundTimeHours: o.turnaroundTimeHours,
        turnaroundTimeDescription: o.turnaroundTimeDescription || '',
        rating: o.rating || 0,
        // foreign key resolution
        quoteOption: o,
        brand: brand,
        model: model,
        issueType: issue
      };
    });
  }

  getQuoteOptionDetail(quoteOptionId) {
    const o = this._findQuoteOptionById(quoteOptionId);
    if (!o) return null;
    const brand = this._findBrandById(o.brandId);
    const model = this._findModelById(o.modelId);
    const issue = this._findIssueTypeById(o.issueTypeId);

    return {
      quoteOptionId: o.id,
      name: o.name,
      deviceType: o.deviceType,
      brandName: brand ? brand.name : null,
      modelName: model ? model.name : null,
      issueName: issue ? issue.name : null,
      serviceType: o.serviceType,
      price: o.price,
      currency: o.currency || null,
      turnaroundTimeHours: o.turnaroundTimeHours,
      turnaroundTimeDescription: o.turnaroundTimeDescription || '',
      terms: o.terms || '',
      shippingInstructions: o.shippingInstructions || '',
      providerName: o.providerName || null,
      rating: o.rating || 0,
      // foreign key resolution
      quoteOption: o,
      brand: brand,
      model: model,
      issueType: issue
    };
  }

  submitQuoteRequest(quoteOptionId, fullName, email, phone, preferredContactMethod) {
    const option = this._findQuoteOptionById(quoteOptionId);
    if (!option) {
      return { success: false, message: 'Quote option not found.', quoteRequestId: null, status: 'new' };
    }

    const requests = this._getFromStorage('quote_requests');
    const id = this._generateId('quote_request');

    const req = {
      id,
      quoteOptionId,
      fullName,
      email,
      phone,
      preferredContactMethod,
      createdAt: this._nowIso(),
      status: 'submitted'
    };

    requests.push(req);
    this._saveToStorage('quote_requests', requests);

    return {
      success: true,
      message: 'Quote request submitted.',
      quoteRequestId: id,
      status: req.status
    };
  }

  // ---------- Accessories ----------

  getAccessoryFilterOptions(brandId, modelId) {
    const accessories = this._getFromStorage('accessory_products');
    let filtered = accessories;
    if (brandId) filtered = filtered.filter((p) => p.brandId === brandId);
    if (modelId) filtered = filtered.filter((p) => p.modelId === modelId);

    const categoriesSet = new Set(filtered.map((p) => p.category));
    const categories = Array.from(categoriesSet).map((c) => ({
      value: c,
      label: c
        ? c
            .split('_')
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ')
        : ''
    }));

    const prices = filtered.map((p) => p.price || 0);
    const priceRange = {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0
    };

    const ratingOptions = [5, 4, 3, 2, 1];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'best_selling', label: 'Best selling' }
    ];

    return { categories, priceRange, ratingOptions, sortOptions };
  }

  searchAccessories(brandId, modelId, categories, minPrice, maxPrice, minRating, sortBy, isTemperedGlass, isBundle, page, pageSize) {
    const accessories = this._getFromStorage('accessory_products');
    const brands = this._getFromStorage('device_brands');
    const models = this._getFromStorage('device_models');

    let filtered = accessories.filter((p) => p.brandId === brandId && p.modelId === modelId);

    if (Array.isArray(categories) && categories.length) {
      const set = new Set(categories);
      filtered = filtered.filter((p) => set.has(p.category));
    }
    if (typeof minPrice === 'number') {
      filtered = filtered.filter((p) => p.price >= minPrice);
    }
    if (typeof maxPrice === 'number') {
      filtered = filtered.filter((p) => p.price <= maxPrice);
    }
    if (typeof minRating === 'number') {
      filtered = filtered.filter((p) => (p.averageRating || 0) >= minRating);
    }
    if (typeof isTemperedGlass === 'boolean') {
      filtered = filtered.filter((p) => !!p.isTemperedGlass === isTemperedGlass);
    }
    if (typeof isBundle === 'boolean') {
      filtered = filtered.filter((p) => !!p.isBundle === isBundle);
    }

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    }

    const total = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : total || 1;
    const start = (pg - 1) * size;
    const end = start + size;
    const slice = filtered.slice(start, end);

    return slice.map((p) => {
      const brand = brands.find((b) => b.id === p.brandId) || null;
      const model = models.find((m) => m.id === p.modelId) || null;
      return {
        productId: p.id,
        name: p.name,
        brandName: brand ? brand.name : null,
        modelName: model ? model.name : null,
        category: p.category,
        isTemperedGlass: !!p.isTemperedGlass,
        isBundle: !!p.isBundle,
        badges: p.badges || [],
        price: p.price,
        currency: p.currency || null,
        averageRating: p.averageRating || 0,
        reviewCount: p.reviewCount || 0,
        imageUrl: p.imageUrl || null,
        // foreign key resolution
        product: p,
        brand: brand,
        model: model
      };
    });
  }

  getAccessoryDetail(productId) {
    const p = this._findAccessoryById(productId);
    if (!p) return null;
    const brand = this._findBrandById(p.brandId);
    const model = this._findModelById(p.modelId);

    return {
      productId: p.id,
      name: p.name,
      slug: p.slug,
      brandName: brand ? brand.name : null,
      modelName: model ? model.name : null,
      category: p.category,
      isTemperedGlass: !!p.isTemperedGlass,
      isBundle: !!p.isBundle,
      badges: p.badges || [],
      price: p.price,
      currency: p.currency || null,
      averageRating: p.averageRating || 0,
      reviewCount: p.reviewCount || 0,
      imageUrl: p.imageUrl || null,
      description: p.description || '',
      compatibleDeviceTypes: p.compatibleDeviceTypes || [],
      stockQuantity: p.stockQuantity != null ? p.stockQuantity : null,
      // foreign key resolution
      product: p,
      brand: brand,
      model: model
    };
  }

  addAccessoryToCart(productId, quantity) {
    const product = this._findAccessoryById(productId);
    if (!product) {
      return { success: false, message: 'Accessory not found.', cartItemId: null, cartSummary: null };
    }
    const qty = quantity && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItemId = this._generateId('cart_item');
    const unitPrice = product.price || 0;
    const totalPrice = unitPrice * qty;

    const item = {
      id: cartItemId,
      cartId: cart.id,
      itemType: 'accessory',
      productId: product.id,
      repairServiceId: null,
      protectionPlanId: null,
      repairBundleId: null,
      planPaymentOption: null,
      quantity: qty,
      unitPrice,
      totalPrice,
      meta: null
    };

    cartItems.push(item);
    cart.itemIds.push(cartItemId);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const summary = this.getCartSummary();
    return {
      success: true,
      message: 'Accessory added to cart.',
      cartItemId,
      cartSummary: {
        itemCount: summary.itemCount,
        subtotal: summary.subtotal,
        discountTotal: summary.discountTotal,
        total: summary.total
      }
    };
  }

  // ---------- Cart (full) ----------

  getCart() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cartId: null,
        items: [],
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        appliedCouponCode: null,
        appliedCouponDescription: null
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter((i) => i.cartId === cart.id);
    const accessories = this._getFromStorage('accessory_products');
    const services = this._getFromStorage('repair_services');
    const plans = this._getFromStorage('protection_plans');
    const bundles = this._getFromStorage('repair_bundles');

    const items = cartItems.map((ci) => {
      let displayName = '';
      let subtitle = '';
      let imageUrl = null;
      let product = null;
      let repairService = null;
      let protectionPlan = null;
      let repairBundle = null;

      if (ci.itemType === 'accessory') {
        product = accessories.find((p) => p.id === ci.productId) || null;
        if (product) {
          displayName = product.name;
          subtitle = 'Accessory';
          imageUrl = product.imageUrl || null;
        }
      } else if (ci.itemType === 'repair_service') {
        repairService = services.find((s) => s.id === ci.repairServiceId) || null;
        if (repairService) {
          displayName = repairService.name;
          subtitle = 'Repair service';
        }
      } else if (ci.itemType === 'protection_plan') {
        protectionPlan = plans.find((p) => p.id === ci.protectionPlanId) || null;
        if (protectionPlan) {
          displayName = protectionPlan.name;
          subtitle = 'Protection plan';
        }
      } else if (ci.itemType === 'repair_bundle') {
        repairBundle = bundles.find((b) => b.id === ci.repairBundleId) || null;
        if (repairBundle) {
          displayName = repairBundle.name;
          subtitle = 'Repair bundle';
        }
      }

      return {
        cartItemId: ci.id,
        itemType: ci.itemType,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.totalPrice,
        displayName,
        subtitle,
        imageUrl,
        productId: ci.productId || null,
        repairServiceId: ci.repairServiceId || null,
        protectionPlanId: ci.protectionPlanId || null,
        repairBundleId: ci.repairBundleId || null,
        planPaymentOption: ci.planPaymentOption || null,
        // foreign key resolutions
        product,
        repairService,
        protectionPlan,
        repairBundle
      };
    });

    return {
      cartId: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      discountTotal: cart.discountTotal || 0,
      total: cart.total || 0,
      appliedCouponCode: cart.appliedCouponCode || null,
      appliedCouponDescription: cart.appliedCouponDescription || null
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { success: false, message: 'Cart not found.', cart: null };
    }
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((i) => i.id === cartItemId && i.cartId === cart.id);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    if (!quantity || quantity <= 0) {
      // remove item
      cartItems.splice(idx, 1);
      const idIdx = cart.itemIds.indexOf(cartItemId);
      if (idIdx !== -1) cart.itemIds.splice(idIdx, 1);
    } else {
      const item = cartItems[idx];
      item.quantity = quantity;
      item.totalPrice = (item.unitPrice || 0) * quantity;
      cartItems[idx] = item;
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart updated.',
      cart: {
        cartId: updatedCart.id,
        subtotal: updatedCart.subtotal,
        discountTotal: updatedCart.discountTotal,
        total: updatedCart.total
      }
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return { success: false, message: 'Cart not found.', cart: null };
    }
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((i) => i.id === cartItemId && i.cartId === cart.id);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found.', cart: null };
    }

    cartItems.splice(idx, 1);
    const idIdx = cart.itemIds.indexOf(cartItemId);
    if (idIdx !== -1) cart.itemIds.splice(idIdx, 1);
    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Item removed from cart.',
      cart: {
        cartId: updatedCart.id,
        subtotal: updatedCart.subtotal,
        discountTotal: updatedCart.discountTotal,
        total: updatedCart.total
      }
    };
  }

  applyCouponToCart(couponCode) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        message: 'Cart not found.',
        appliedCouponCode: null,
        appliedCouponDescription: null,
        subtotal: 0,
        discountTotal: 0,
        total: 0
      };
    }

    const result = this._validateAndApplyCoupon(cart, couponCode);
    const updatedCart = this._getFromStorage('cart', cart);

    return {
      success: result.success,
      message: result.message,
      appliedCouponCode: updatedCart.appliedCouponCode || null,
      appliedCouponDescription: updatedCart.appliedCouponDescription || null,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discountTotal || 0,
      total: updatedCart.total || 0
    };
  }

  // ---------- Store locations & favorites ----------

  searchStoreLocations(zip, maxDistanceMiles, storeTypeFilters, isWalkInCenterOnly, openLateAfter8pm, sortBy) {
    const stores = this._getFromStorage('store_locations');

    let filtered = stores.filter((s) => s.zip === zip);

    if (typeof maxDistanceMiles === 'number') {
      filtered = filtered.filter((s) => typeof s.distanceMiles === 'number' && s.distanceMiles <= maxDistanceMiles);
    }

    if (Array.isArray(storeTypeFilters) && storeTypeFilters.length) {
      const set = new Set(storeTypeFilters);
      filtered = filtered.filter((s) => {
        if (!Array.isArray(s.storeServices)) return false;
        return s.storeServices.some((svc) => set.has(svc));
      });
    }

    if (typeof isWalkInCenterOnly === 'boolean' && isWalkInCenterOnly) {
      filtered = filtered.filter((s) => !!s.isWalkInCenter);
    }

    if (typeof openLateAfter8pm === 'boolean' && openLateAfter8pm) {
      filtered = filtered.filter((s) => !!s.openLateAfter8pm);
    }

    if (sortBy === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'distance_near_to_far') {
      filtered.sort((a, b) => (a.distanceMiles || 0) - (b.distanceMiles || 0));
    }

    return filtered.map((s) => ({
      storeId: s.id,
      name: s.name,
      street: s.street,
      city: s.city,
      state: s.state || null,
      zip: s.zip,
      distanceMiles: s.distanceMiles != null ? s.distanceMiles : null,
      isWalkInCenter: !!s.isWalkInCenter,
      storeServices: s.storeServices || [],
      openLateAfter8pm: !!s.openLateAfter8pm,
      rating: s.rating || 0,
      reviewCount: s.reviewCount || 0,
      openHoursSummary: Array.isArray(s.openHours) ? s.openHours.join(', ') : '',
      // foreign key resolution
      store: s
    }));
  }

  getStoreDetail(storeId) {
    const s = this._findStoreById(storeId);
    if (!s) return null;

    const favorites = this._getFromStorage('favorite_locations');
    const isFavorite = favorites.some((f) => f.storeId === storeId);

    return {
      storeId: s.id,
      name: s.name,
      street: s.street,
      city: s.city,
      state: s.state || null,
      zip: s.zip,
      latitude: s.latitude != null ? s.latitude : null,
      longitude: s.longitude != null ? s.longitude : null,
      phone: s.phone || null,
      email: s.email || null,
      websiteUrl: s.websiteUrl || null,
      storeServices: s.storeServices || [],
      openHours: s.openHours || [],
      openLateAfter8pm: !!s.openLateAfter8pm,
      rating: s.rating || 0,
      reviewCount: s.reviewCount || 0,
      notes: s.notes || '',
      isFavorite,
      // foreign key resolution
      store: s
    };
  }

  saveFavoriteLocation(storeId) {
    const store = this._findStoreById(storeId);
    if (!store) {
      return { success: false, message: 'Store not found.', favoriteLocationId: null };
    }

    const favorites = this._getFromStorage('favorite_locations');
    const existing = favorites.find((f) => f.storeId === storeId);
    if (existing) {
      return { success: true, message: 'Location already in favorites.', favoriteLocationId: existing.id };
    }

    const id = this._generateId('favorite_location');
    const fav = {
      id,
      storeId,
      createdAt: this._nowIso()
    };
    favorites.push(fav);
    this._saveToStorage('favorite_locations', favorites);

    return { success: true, message: 'Location saved to favorites.', favoriteLocationId: id };
  }

  listFavoriteLocations() {
    const favorites = this._getFromStorage('favorite_locations');
    const stores = this._getFromStorage('store_locations');

    return favorites.map((f) => {
      const store = stores.find((s) => s.id === f.storeId) || null;
      return {
        favoriteLocationId: f.id,
        storeId: f.storeId,
        storeName: store ? store.name : null,
        city: store ? store.city : null,
        state: store ? store.state : null,
        rating: store ? store.rating || 0 : 0,
        reviewCount: store ? store.reviewCount || 0 : 0,
        // foreign key resolution
        store,
        favoriteLocation: f
      };
    });
  }

  // ---------- Troubleshooting wizard ----------

  startTroubleshootingSession(deviceType, brandId, modelId, selectedSymptom) {
    const brand = this._findBrandById(brandId);
    const model = this._findModelById(modelId);
    const issues = this._getFromStorage('issue_types');

    let initialIssueTypeId = null;
    const symptom = (selectedSymptom || '').toLowerCase();
    if (symptom.includes('charge')) {
      const candidate = issues.find((i) =>
        (i.slug && i.slug.toLowerCase().includes('charging')) ||
        (i.name && i.name.toLowerCase().includes('charge'))
      );
      if (candidate) initialIssueTypeId = candidate.id;
    } else if (symptom.includes('battery')) {
      const candidate = issues.find((i) =>
        (i.slug && i.slug.toLowerCase().includes('battery')) ||
        (i.name && i.name.toLowerCase().includes('battery'))
      );
      if (candidate) initialIssueTypeId = candidate.id;
    }

    const sessions = this._getFromStorage('troubleshooting_sessions');
    const sessionId = this._generateId('troubleshooting_session');

    const session = {
      id: sessionId,
      deviceType,
      brandId,
      modelId,
      selectedSymptom,
      initialIssueTypeId: initialIssueTypeId || null,
      questionAnswerSteps: [],
      recommendedIssueTypeId: null,
      recommendedServiceType: null,
      recommendedRepairServiceId: null,
      createdAt: this._nowIso(),
      completedAt: null
    };

    sessions.push(session);
    this._saveToStorage('troubleshooting_sessions', sessions);

    const firstQuestion = {
      questionId: 'q1',
      text: 'When did this issue start?',
      options: [
        { optionId: 'o1', text: 'Today' },
        { optionId: 'o2', text: 'Within the last week' },
        { optionId: 'o3', text: 'More than a week ago' }
      ]
    };

    return {
      sessionId,
      deviceType,
      brandName: brand ? brand.name : null,
      modelName: model ? model.name : null,
      selectedSymptom,
      initialIssueTypeId: initialIssueTypeId || null,
      firstQuestion,
      // foreign key resolutions
      brand,
      model,
      initialIssueType: initialIssueTypeId ? this._findIssueTypeById(initialIssueTypeId) : null
    };
  }

  answerTroubleshootingQuestion(sessionId, questionId, selectedOptionId) {
    const session = this._getActiveTroubleshootingSession(sessionId);
    if (!session) {
      return { sessionId, isComplete: true, nextQuestion: null };
    }

    const updatedSession = this._persistTroubleshootingStep(sessionId, questionId, selectedOptionId) || session;

    // For simplicity, complete after first answer
    const completed = this._computeTroubleshootingRecommendation(updatedSession);

    return {
      sessionId,
      isComplete: true,
      nextQuestion: null
    };
  }

  getTroubleshootingRecommendation(sessionId) {
    let session = this._getActiveTroubleshootingSession(sessionId);
    if (!session) return null;
    if (!session.recommendedIssueTypeId || !session.recommendedServiceType) {
      session = this._computeTroubleshootingRecommendation(session) || session;
    }

    const brand = this._findBrandById(session.brandId);
    const model = this._findModelById(session.modelId);
    const issue = session.recommendedIssueTypeId ? this._findIssueTypeById(session.recommendedIssueTypeId) : null;
    const repairService = session.recommendedRepairServiceId ? this._findRepairServiceById(session.recommendedRepairServiceId) : null;

    return {
      sessionId: session.id,
      deviceType: session.deviceType,
      brandName: brand ? brand.name : null,
      modelName: model ? model.name : null,
      selectedSymptom: session.selectedSymptom,
      recommendedIssueTypeId: session.recommendedIssueTypeId || null,
      recommendedIssueName: issue ? issue.name : null,
      recommendedServiceType: session.recommendedServiceType || null,
      recommendedRepairServiceId: session.recommendedRepairServiceId || null,
      recommendedRepairServiceName: repairService ? repairService.name : null,
      notes: '',
      // foreign key resolution
      brand,
      model,
      recommendedIssueType: issue,
      recommendedRepairService: repairService
    };
  }

  createRepairOrderFromTroubleshooting(sessionId, serviceType, repairSpeed, scheduledDate, timeWindowStart, timeWindowEnd, pickupStreet, pickupCity, pickupState, pickupZip, contactName, contactPhone, contactEmail, paymentMethod) {
    let session = this._getActiveTroubleshootingSession(sessionId);
    if (!session) {
      return {
        success: false,
        message: 'Troubleshooting session not found.',
        repairOrderId: null,
        status: 'draft',
        scheduledDate,
        timeWindowStart,
        timeWindowEnd,
        serviceType: null,
        repairSpeed: repairSpeed || null
      };
    }

    if (!session.recommendedIssueTypeId || !session.recommendedRepairServiceId) {
      session = this._computeTroubleshootingRecommendation(session) || session;
    }

    const repairService = session.recommendedRepairServiceId ? this._findRepairServiceById(session.recommendedRepairServiceId) : null;

    const orderId = this._generateId('repair_order');
    const orders = this._getFromStorage('repair_orders');

    const order = {
      id: orderId,
      source: 'troubleshooting_wizard',
      deviceType: session.deviceType,
      brandId: session.brandId,
      modelId: session.modelId,
      issueTypeId: session.recommendedIssueTypeId || null,
      serviceType: serviceType || (session.recommendedServiceType || (repairService ? repairService.serviceType : null)),
      repairSpeed: repairSpeed || (repairService ? repairService.defaultRepairSpeed : null),
      repairServiceId: repairService ? repairService.id : null,
      bundleId: null,
      quoteOptionId: null,
      scheduledDate: new Date(scheduledDate).toISOString(),
      timeWindowStart: timeWindowStart || null,
      timeWindowEnd: timeWindowEnd || null,
      locationZip: pickupZip || null,
      storeId: repairService ? repairService.storeId || null : null,
      technicianId: null,
      pickupStreet,
      pickupCity,
      pickupState: pickupState || null,
      pickupZip,
      contactName,
      contactPhone,
      contactEmail: contactEmail || null,
      paymentMethod: paymentMethod || null,
      priceEstimate: repairService ? repairService.basePrice || 0 : 0,
      currency: null,
      status: 'confirmed',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    orders.push(order);
    this._saveToStorage('repair_orders', orders);

    return {
      success: true,
      message: 'Repair order created from troubleshooting.',
      repairOrderId: orderId,
      status: order.status,
      scheduledDate,
      timeWindowStart,
      timeWindowEnd,
      serviceType: order.serviceType,
      repairSpeed: order.repairSpeed
    };
  }

  // ---------- Protection plans ----------

  searchProtectionPlans(deviceType, brandId, modelId, durationMonths, includesAccidentalDamage, minMonthlyPrice, maxMonthlyPrice, sortBy) {
    const plans = this._getFromStorage('protection_plans');
    const brands = this._getFromStorage('device_brands');
    const models = this._getFromStorage('device_models');

    let filtered = plans.filter((p) => p.deviceType === deviceType && p.brandId === brandId && p.modelId === modelId);

    if (typeof durationMonths === 'number') {
      filtered = filtered.filter((p) => p.durationMonths === durationMonths);
    }
    if (typeof includesAccidentalDamage === 'boolean') {
      filtered = filtered.filter((p) => !!p.includesAccidentalDamage === includesAccidentalDamage);
    }
    if (typeof minMonthlyPrice === 'number') {
      filtered = filtered.filter((p) => p.monthlyPrice >= minMonthlyPrice);
    }
    if (typeof maxMonthlyPrice === 'number') {
      filtered = filtered.filter((p) => p.monthlyPrice <= maxMonthlyPrice);
    }

    if (sortBy === 'monthly_price_low_to_high') {
      filtered.sort((a, b) => (a.monthlyPrice || 0) - (b.monthlyPrice || 0));
    } else if (sortBy === 'upfront_price_low_to_high') {
      filtered.sort((a, b) => (a.upfrontPrice || 0) - (b.upfrontPrice || 0));
    } else if (sortBy === 'duration_long_to_short') {
      filtered.sort((a, b) => (b.durationMonths || 0) - (a.durationMonths || 0));
    }

    return filtered.map((p) => {
      const brand = brands.find((b) => b.id === p.brandId) || null;
      const model = models.find((m) => m.id === p.modelId) || null;
      return {
        protectionPlanId: p.id,
        name: p.name,
        deviceType: p.deviceType,
        brandName: brand ? brand.name : null,
        modelName: model ? model.name : null,
        durationMonths: p.durationMonths,
        includesAccidentalDamage: !!p.includesAccidentalDamage,
        coverageFeatures: p.coverageFeatures || [],
        monthlyPrice: p.monthlyPrice,
        upfrontPrice: p.upfrontPrice,
        currency: p.currency || null,
        // foreign key resolution
        protectionPlan: p,
        brand,
        model
      };
    });
  }

  getProtectionPlanDetail(protectionPlanId) {
    const p = this._findProtectionPlanById(protectionPlanId);
    if (!p) return null;
    const brand = this._findBrandById(p.brandId);
    const model = this._findModelById(p.modelId);

    return {
      protectionPlanId: p.id,
      name: p.name,
      deviceType: p.deviceType,
      brandName: brand ? brand.name : null,
      modelName: model ? model.name : null,
      durationMonths: p.durationMonths,
      includesAccidentalDamage: !!p.includesAccidentalDamage,
      coverageFeatures: p.coverageFeatures || [],
      monthlyPrice: p.monthlyPrice,
      upfrontPrice: p.upfrontPrice,
      currency: p.currency || null,
      paymentOptions: p.paymentOptions || [],
      terms: p.terms || '',
      exclusions: p.exclusions || '',
      description: p.description || '',
      // foreign key resolution
      protectionPlan: p,
      brand,
      model
    };
  }

  addProtectionPlanToCart(protectionPlanId, paymentOption, quantity) {
    const plan = this._findProtectionPlanById(protectionPlanId);
    if (!plan) {
      return { success: false, message: 'Protection plan not found.', cartItemId: null, cartSummary: null };
    }
    if (!Array.isArray(plan.paymentOptions) || !plan.paymentOptions.includes(paymentOption)) {
      return { success: false, message: 'Payment option not available for this plan.', cartItemId: null, cartSummary: null };
    }
    const qty = quantity && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItemId = this._generateId('cart_item');
    const unitPrice = paymentOption === 'pay_upfront' ? (plan.upfrontPrice || 0) : (plan.monthlyPrice || 0);
    const totalPrice = unitPrice * qty;

    const item = {
      id: cartItemId,
      cartId: cart.id,
      itemType: 'protection_plan',
      productId: null,
      repairServiceId: null,
      protectionPlanId: plan.id,
      repairBundleId: null,
      planPaymentOption: paymentOption,
      quantity: qty,
      unitPrice,
      totalPrice,
      meta: null
    };

    cartItems.push(item);
    cart.itemIds.push(cartItemId);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const summary = this.getCartSummary();
    return {
      success: true,
      message: 'Protection plan added to cart.',
      cartItemId,
      cartSummary: {
        itemCount: summary.itemCount,
        subtotal: summary.subtotal,
        discountTotal: summary.discountTotal,
        total: summary.total
      }
    };
  }

  // ---------- Repair bundles & comparison ----------

  searchRepairBundles(deviceType, brandId, maxPrice, includedServices, sortBy) {
    const bundles = this._getFromStorage('repair_bundles');
    const brands = this._getFromStorage('device_brands');

    let filtered = bundles.filter((b) => b.deviceType === deviceType);

    if (brandId) {
      filtered = filtered.filter((b) => b.appliesToAllBrands || b.brandId === brandId);
    }
    if (typeof maxPrice === 'number') {
      filtered = filtered.filter((b) => b.price <= maxPrice);
    }
    if (Array.isArray(includedServices) && includedServices.length) {
      const set = new Set(includedServices);
      filtered = filtered.filter((b) => {
        if (!Array.isArray(b.includedServices)) return false;
        return Array.from(set).every((svc) => b.includedServices.includes(svc));
      });
    }

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return filtered.map((b) => {
      const brand = b.brandId ? brands.find((br) => br.id === b.brandId) || null : null;
      return {
        bundleId: b.id,
        name: b.name,
        deviceType: b.deviceType,
        appliesToAllBrands: !!b.appliesToAllBrands,
        brandName: brand ? brand.name : null,
        price: b.price,
        currency: b.currency || null,
        includedServices: b.includedServices || [],
        rating: b.rating || 0,
        reviewCount: b.reviewCount || 0,
        // foreign key resolution
        bundle: b,
        brand
      };
    });
  }

  getRepairBundleDetail(bundleId) {
    const b = this._findRepairBundleById(bundleId);
    if (!b) return null;
    const brands = this._getFromStorage('device_brands');
    const brand = b.brandId ? brands.find((br) => br.id === b.brandId) || null : null;

    const compareList = this._getCompareBundleList();
    const isInCompareList = compareList.includes(bundleId);

    return {
      bundleId: b.id,
      name: b.name,
      slug: b.slug,
      deviceType: b.deviceType,
      appliesToAllBrands: !!b.appliesToAllBrands,
      brandName: brand ? brand.name : null,
      price: b.price,
      currency: b.currency || null,
      includedServices: b.includedServices || [],
      description: b.description || '',
      rating: b.rating || 0,
      reviewCount: b.reviewCount || 0,
      isInCompareList,
      // foreign key resolution
      bundle: b,
      brand
    };
  }

  addRepairBundleToCompare(bundleId) {
    const bundle = this._findRepairBundleById(bundleId);
    if (!bundle) {
      return { success: false, message: 'Bundle not found.', compareCount: this._getCompareBundleList().length };
    }

    const list = this._getCompareBundleList();
    if (!list.includes(bundleId)) list.push(bundleId);
    this._saveCompareBundleList(list);

    return { success: true, message: 'Bundle added to comparison.', compareCount: list.length };
  }

  removeRepairBundleFromCompare(bundleId) {
    const list = this._getCompareBundleList();
    const idx = list.indexOf(bundleId);
    if (idx !== -1) list.splice(idx, 1);
    this._saveCompareBundleList(list);

    return { success: true, message: 'Bundle removed from comparison.', compareCount: list.length };
  }

  getRepairBundleComparison() {
    const list = this._getCompareBundleList();
    const bundles = this._getFromStorage('repair_bundles');
    const brands = this._getFromStorage('device_brands');

    return list
      .map((id) => bundles.find((b) => b.id === id))
      .filter((b) => !!b)
      .map((b) => {
        const brand = b.brandId ? brands.find((br) => br.id === b.brandId) || null : null;
        return {
          bundleId: b.id,
          name: b.name,
          deviceType: b.deviceType,
          appliesToAllBrands: !!b.appliesToAllBrands,
          brandName: brand ? brand.name : null,
          price: b.price,
          currency: b.currency || null,
          includedServices: b.includedServices || [],
          rating: b.rating || 0,
          reviewCount: b.reviewCount || 0,
          // foreign key resolution
          bundle: b,
          brand
        };
      });
  }

  createRepairOrderFromBundle(bundleId, deviceType, brandId, modelId, serviceType, scheduledDate, timeWindowStart, timeWindowEnd, locationZip, pickupStreet, pickupCity, pickupState, pickupZip, contactName, contactPhone, contactEmail, paymentMethod) {
    const bundle = this._findRepairBundleById(bundleId);
    if (!bundle) {
      return {
        success: false,
        message: 'Bundle not found.',
        repairOrderId: null,
        status: 'draft',
        scheduledDate,
        timeWindowStart,
        timeWindowEnd
      };
    }

    const orderId = this._generateId('repair_order');
    const orders = this._getFromStorage('repair_orders');

    const order = {
      id: orderId,
      source: 'bundle_page',
      deviceType,
      brandId: brandId || bundle.brandId || null,
      modelId: modelId || null,
      issueTypeId: null,
      serviceType,
      repairSpeed: null,
      repairServiceId: null,
      bundleId: bundle.id,
      quoteOptionId: null,
      scheduledDate: new Date(scheduledDate).toISOString(),
      timeWindowStart: timeWindowStart || null,
      timeWindowEnd: timeWindowEnd || null,
      locationZip: locationZip || pickupZip || null,
      storeId: null,
      technicianId: null,
      pickupStreet: pickupStreet || null,
      pickupCity: pickupCity || null,
      pickupState: pickupState || null,
      pickupZip: pickupZip || null,
      contactName,
      contactPhone,
      contactEmail: contactEmail || null,
      paymentMethod: paymentMethod || null,
      priceEstimate: bundle.price || 0,
      currency: bundle.currency || null,
      status: 'confirmed',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    orders.push(order);
    this._saveToStorage('repair_orders', orders);

    return {
      success: true,
      message: 'Repair order created from bundle.',
      repairOrderId: orderId,
      status: order.status,
      scheduledDate,
      timeWindowStart,
      timeWindowEnd
    };
  }

  // ---------- About & Support content ----------

  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (!raw) {
      return {
        headline: '',
        mission: '',
        experienceSummary: '',
        coverageAreas: [],
        differentiators: [],
        contactSummary: { phone: '', email: '' },
        relatedLinks: []
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {
        headline: '',
        mission: '',
        experienceSummary: '',
        coverageAreas: [],
        differentiators: [],
        contactSummary: { phone: '', email: '' },
        relatedLinks: []
      };
    }
  }

  getSupportContent() {
    const raw = localStorage.getItem('support_content');
    if (!raw) {
      return {
        faqs: [],
        policySummaries: [],
        contactOptions: { phone: '', email: '', supportHours: '' }
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {
        faqs: [],
        policySummaries: [],
        contactOptions: { phone: '', email: '', supportHours: '' }
      };
    }
  }

  submitSupportContactForm(name, email, phone, topic, message) {
    const tickets = this._getFromStorage('support_tickets');
    const ticketId = this._generateId('support_ticket');
    const ticket = {
      id: ticketId,
      name,
      email,
      phone: phone || null,
      topic: topic || null,
      message,
      createdAt: this._nowIso()
    };
    tickets.push(ticket);
    this._saveToStorage('support_tickets', tickets);

    return {
      success: true,
      message: 'Support request submitted.',
      ticketId
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
