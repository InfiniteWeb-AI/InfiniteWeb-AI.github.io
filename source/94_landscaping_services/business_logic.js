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

  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core domain tables (arrays)
    ensureArrayKey('service_categories');
    ensureArrayKey('yard_size_options');
    ensureArrayKey('service_features');
    ensureArrayKey('services');
    ensureArrayKey('maintenance_plans');
    ensureArrayKey('promotions');
    ensureArrayKey('cart');
    ensureArrayKey('cart_items');
    ensureArrayKey('orders');
    ensureArrayKey('custom_packages');
    ensureArrayKey('custom_package_service_items');
    ensureArrayKey('bookings');
    ensureArrayKey('time_slots');
    ensureArrayKey('quote_requests');
    ensureArrayKey('consultation_requests');
    ensureArrayKey('projects');
    ensureArrayKey('favorite_projects');
    ensureArrayKey('project_design_requests');
    ensureArrayKey('faq_articles');
    ensureArrayKey('service_areas');
    ensureArrayKey('contact_form_submissions');

    // Generic/example tables from template (not used but kept for compatibility)
    ensureArrayKey('users');
    ensureArrayKey('products');

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Meta keys for single-user/session state
    if (!localStorage.getItem('activeCartId')) {
      localStorage.setItem('activeCartId', '');
    }
    if (!localStorage.getItem('activeOrderId')) {
      localStorage.setItem('activeOrderId', '');
    }
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
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ---------- Private helpers specific to this domain ----------

  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    let activeCartId = localStorage.getItem('activeCartId') || '';
    let cart = carts.find((c) => c.id === activeCartId) || null;

    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        discountTotal: 0,
        promotionCode: null,
        promotionDescription: null,
        total: 0,
        createdAt: now,
        updatedAt: now
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
      localStorage.setItem('activeCartId', cart.id);
    }

    return cart;
  }

  _recalculateCartTotals() {
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const activeCartId = localStorage.getItem('activeCartId') || '';
    const cart = carts.find((c) => c.id === activeCartId) || null;
    if (!cart) {
      return;
    }

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    let subtotal = 0;
    itemsForCart.forEach((item) => {
      const lineSubtotal = (item.unitPrice || 0) * (item.quantity || 0);
      item.lineSubtotal = lineSubtotal;
      // Reset discounts before applying promotion
      item.lineDiscount = 0;
      item.lineTotal = lineSubtotal;
      subtotal += lineSubtotal;
    });

    cart.subtotal = subtotal;

    const promoResult = this._validatePromotionForCart(cart, itemsForCart);
    cart.discountTotal = promoResult.discountTotal;

    // lineDiscount & lineTotal already adjusted in _validatePromotionForCart
    cart.total = Math.max(0, (cart.subtotal || 0) - (cart.discountTotal || 0));
    cart.updatedAt = new Date().toISOString();

    // Persist
    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cartItems);
  }

  _getActiveOrder() {
    const orders = this._getFromStorage('orders');
    const activeOrderId = localStorage.getItem('activeOrderId') || '';
    let order = orders.find((o) => o.id === activeOrderId && o.status === 'pending_payment');

    if (!order) {
      // Fallback: most recent pending order
      order = orders
        .filter((o) => o.status === 'pending_payment')
        .sort((a, b) => {
          const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
          const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
          return bTime - aTime;
        })[0];
    }

    return order || null;
  }

  _getOrCreateFavoriteProjectsRecord() {
    const favoritesArr = this._getFromStorage('favorite_projects');
    let record = favoritesArr.find((f) => f.id === 'default_favorites') || null;

    if (!record) {
      record = {
        id: 'default_favorites',
        projectIds: [],
        updatedAt: new Date().toISOString()
      };
      favoritesArr.push(record);
      this._saveToStorage('favorite_projects', favoritesArr);
    }

    return record;
  }

  _getOrCreateActiveCustomPackage() {
    const packages = this._getFromStorage('custom_packages');
    const items = this._getFromStorage('custom_package_service_items');

    // Prefer an existing in_builder package
    let pkg = packages
      .filter((p) => p.status === 'in_builder')
      .sort((a, b) => {
        const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        return bTime - aTime;
      })[0];

    if (!pkg) {
      const now = new Date().toISOString();
      pkg = {
        id: this._generateId('pkg'),
        label: null,
        items: [],
        targetPriceMin: null,
        targetPriceMax: null,
        totalEstimatedPrice: 0,
        billingFrequency: 'monthly',
        status: 'in_builder',
        createdAt: now,
        updatedAt: now
      };
      packages.push(pkg);
      this._saveToStorage('custom_packages', packages);
    }

    const pkgItems = items.filter((it) => it.packageId === pkg.id);
    return { package: pkg, items: pkgItems };
  }

  _recalculateCustomPackageEstimate(pkg, allItems) {
    const packages = this._getFromStorage('custom_packages');
    const items = allItems || this._getFromStorage('custom_package_service_items');

    const itemsForPkg = items.filter((it) => it.packageId === pkg.id);
    const total = itemsForPkg.reduce((sum, it) => sum + (it.estimatedPrice || 0), 0);

    const pkgIndex = packages.findIndex((p) => p.id === pkg.id);
    if (pkgIndex !== -1) {
      packages[pkgIndex].totalEstimatedPrice = total;
      packages[pkgIndex].updatedAt = new Date().toISOString();
      this._saveToStorage('custom_packages', packages);
    }
  }

  _validatePromotionForCart(cart, itemsForCart) {
    const promotions = this._getFromStorage('promotions');
    const now = Date.now();
    let discountTotal = 0;

    if (!cart.promotionCode) {
      // Ensure lineDiscount/lineTotal are just subtotal values
      itemsForCart.forEach((item) => {
        item.lineDiscount = 0;
        item.lineTotal = item.lineSubtotal || 0;
      });
      return { promotion: null, discountTotal: 0 };
    }

    const promoCode = (cart.promotionCode || '').trim();
    const promotion = promotions.find(
      (p) => p.isActive && typeof p.promoCode === 'string' && p.promoCode.trim().toLowerCase() === promoCode.toLowerCase()
    );

    if (!promotion) {
      // Invalid/expired code
      itemsForCart.forEach((item) => {
        item.lineDiscount = 0;
        item.lineTotal = item.lineSubtotal || 0;
      });
      return { promotion: null, discountTotal: 0 };
    }

    // Check date range
    if (promotion.validFrom) {
      const fromTime = Date.parse(promotion.validFrom);
      if (!Number.isNaN(fromTime) && fromTime > now) {
        itemsForCart.forEach((item) => {
          item.lineDiscount = 0;
          item.lineTotal = item.lineSubtotal || 0;
        });
        return { promotion: null, discountTotal: 0 };
      }
    }
    if (promotion.validTo) {
      const toTime = Date.parse(promotion.validTo);
      if (!Number.isNaN(toTime) && toTime < now) {
        itemsForCart.forEach((item) => {
          item.lineDiscount = 0;
          item.lineTotal = item.lineSubtotal || 0;
        });
        return { promotion: null, discountTotal: 0 };
      }
    }

    // Determine eligible items
    const applicableServiceIds = promotion.applicableServiceIds || [];
    const applicablePlanIds = promotion.applicablePlanIds || [];

    const eligibleItems = itemsForCart.filter((item) => {
      if (item.sourceType === 'service') {
        if (applicableServiceIds.length === 0) return true;
        return applicableServiceIds.includes(item.sourceId);
      }
      if (item.sourceType === 'maintenance_plan') {
        if (applicablePlanIds.length === 0) return true;
        return applicablePlanIds.includes(item.sourceId);
      }
      // custom_package: if no specific applicable IDs, treat as eligible
      if (item.sourceType === 'custom_package') {
        return applicableServiceIds.length === 0 && applicablePlanIds.length === 0;
      }
      return false;
    });

    if (eligibleItems.length === 0) {
      // No eligible items; zero discount
      itemsForCart.forEach((item) => {
        item.lineDiscount = 0;
        item.lineTotal = item.lineSubtotal || 0;
      });
      return { promotion: null, discountTotal: 0 };
    }

    if (promotion.discountType === 'percentage') {
      const pct = promotion.discountValue || 0;
      eligibleItems.forEach((item) => {
        const lineSubtotal = item.lineSubtotal || 0;
        const lineDiscount = (lineSubtotal * pct) / 100;
        item.lineDiscount = lineDiscount;
        item.lineTotal = Math.max(0, lineSubtotal - lineDiscount);
        discountTotal += lineDiscount;
      });
    } else if (promotion.discountType === 'fixed_amount') {
      // Spread fixed amount across eligible items proportionally
      const totalEligibleSubtotal = eligibleItems.reduce((sum, it) => sum + (it.lineSubtotal || 0), 0);
      const maxDiscount = promotion.discountValue || 0;
      if (totalEligibleSubtotal <= 0 || maxDiscount <= 0) {
        eligibleItems.forEach((item) => {
          item.lineDiscount = 0;
          item.lineTotal = item.lineSubtotal || 0;
        });
        return { promotion, discountTotal: 0 };
      }

      let remainingDiscount = maxDiscount;
      eligibleItems.forEach((item, index) => {
        const lineSubtotal = item.lineSubtotal || 0;
        let lineDiscount = 0;
        if (index === eligibleItems.length - 1) {
          lineDiscount = remainingDiscount;
        } else {
          const proportion = lineSubtotal / totalEligibleSubtotal;
          lineDiscount = Math.min(lineSubtotal, maxDiscount * proportion);
          remainingDiscount -= lineDiscount;
        }
        item.lineDiscount = lineDiscount;
        item.lineTotal = Math.max(0, lineSubtotal - lineDiscount);
        discountTotal += lineDiscount;
      });
    }

    // Non-eligible items stay with no discount
    itemsForCart.forEach((item) => {
      if (item.lineDiscount == null) {
        item.lineDiscount = 0;
        item.lineTotal = item.lineSubtotal || 0;
      }
    });

    return { promotion, discountTotal };
  }

  _findAvailableTimeSlotsForServiceAndDate(serviceId, dateStr) {
    const slots = this._getFromStorage('time_slots');
    const targetDate = dateStr;
    return slots.filter((slot) => {
      if (!slot.isAvailable) return false;
      if (slot.serviceId !== serviceId) return false;
      if (!slot.date) return false;
      const slotDate = new Date(slot.date);
      const slotDateStr = slotDate.toISOString().slice(0, 10);
      return slotDateStr === targetDate;
    });
  }

  _humanizeEnum(enumValue) {
    if (!enumValue || typeof enumValue !== 'string') return '';
    const withSpaces = enumValue.replace(/_/g, ' ');
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  }

  _estimateServicePriceForFrequency(service, frequency) {
    if (!service) return 0;
    const base = service.basePrice || service.minPrice || 0;
    let multiplier = 1;
    if (frequency === 'once_per_month') {
      multiplier = 1;
    } else if (frequency === 'every_2_weeks') {
      multiplier = 2;
    } else if (frequency === 'weekly') {
      multiplier = 4;
    } else if (frequency === 'one_time') {
      multiplier = 1;
    }
    return base * multiplier;
  }

  _resolveCartItemsWithSources(cart, items) {
    const services = this._getFromStorage('services');
    const plans = this._getFromStorage('maintenance_plans');
    const packages = this._getFromStorage('custom_packages');

    return items.map((item) => {
      const extended = { ...item };
      extended.cart = cart;
      if (item.sourceType === 'service') {
        extended.service = services.find((s) => s.id === item.sourceId) || null;
      } else if (item.sourceType === 'maintenance_plan') {
        extended.maintenance_plan = plans.find((p) => p.id === item.sourceId) || null;
      } else if (item.sourceType === 'custom_package') {
        extended.custom_package = packages.find((p) => p.id === item.sourceId) || null;
      }
      return extended;
    });
  }

  _getPackageByStatusForReview() {
    const packages = this._getFromStorage('custom_packages');
    // Prefer ready_for_checkout, then saved, then in_builder (latest updated)
    const candidates = packages
      .filter((p) => p.status === 'ready_for_checkout' || p.status === 'saved' || p.status === 'in_builder')
      .sort((a, b) => {
        const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
        const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
        return bTime - aTime;
      });
    return candidates[0] || null;
  }

  // ---------- Interface implementations ----------

  // getHomePageContent
  getHomePageContent() {
    const categories = this._getFromStorage('service_categories');
    const services = this._getFromStorage('services');
    const plans = this._getFromStorage('maintenance_plans');
    const projects = this._getFromStorage('projects');

    const activeServices = services.filter((s) => s.isActive);
    const activePlans = plans.filter((p) => p.isActive);

    const featuredServiceCategories = categories.map((c) => ({
      id: c.id,
      name: c.name,
      categoryParam: c.categoryParam,
      description: c.description || ''
    }));

    const featuredServices = activeServices
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10)
      .map((s) => {
        const cat = categories.find((c) => c.id === s.categoryId) || {};
        return {
          serviceId: s.id,
          name: s.name,
          categoryName: cat.name || null,
          categoryParam: cat.categoryParam || null,
          shortDescription: s.description || '',
          priceUnit: s.priceUnit,
          basePrice: s.basePrice || null,
          rating: s.rating || null,
          ratingCount: s.ratingCount || 0,
          imageUrl: s.imageUrl || null,
          isBookableOnline: !!s.isBookableOnline,
          canBeAddedToCart: !!s.canBeAddedToCart,
          supportsQuoteRequest: !!s.supportsQuoteRequest,
          supportsConsultationRequest: !!s.supportsConsultationRequest,
          service: s
        };
      });

    const featuredMaintenancePlans = activePlans
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10)
      .map((p) => ({
        planId: p.id,
        name: p.name,
        planType: p.planType,
        pricePerMonth: p.pricePerMonth,
        visitsPerMonth: p.visitsPerMonth,
        rating: p.rating || null,
        ratingCount: p.ratingCount || 0,
        imageUrl: p.imageUrl || null,
        plan: p
      }));

    const seasonalHighlights = categories
      .filter((c) => c.categoryParam === 'seasonal_cleanups')
      .map((c) => ({
        title: c.name,
        description: c.description || '',
        categoryParam: c.categoryParam
      }));

    const allRatings = [
      ...activeServices.map((s) => s.rating || 0),
      ...activePlans.map((p) => p.rating || 0)
    ].filter((r) => r > 0);
    const averageRating = allRatings.length
      ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
      : 0;

    const stats = {
      yearsInBusiness: 0, // Not stored anywhere; default to 0
      averageRating,
      totalProjectsCompleted: projects.length
    };

    return {
      featuredServiceCategories,
      featuredServices,
      featuredMaintenancePlans,
      seasonalHighlights,
      stats
    };
  }

  // getServiceCategories
  getServiceCategories() {
    return this._getFromStorage('service_categories');
  }

  // getServiceListFilterOptions(categoryParam)
  getServiceListFilterOptions(categoryParam) {
    const categories = this._getFromStorage('service_categories');
    const yardSizes = this._getFromStorage('yard_size_options');
    const features = this._getFromStorage('service_features');
    const services = this._getFromStorage('services');

    let filteredServices = services.filter((s) => s.isActive);
    if (categoryParam && categoryParam !== 'all_services') {
      const cat = categories.find((c) => c.categoryParam === categoryParam);
      if (cat) {
        filteredServices = filteredServices.filter((s) => s.categoryId === cat.id);
      }
    }

    const serviceTypeSet = new Set();
    filteredServices.forEach((s) => {
      if (s.serviceType) serviceTypeSet.add(s.serviceType);
    });

    const serviceTypes = Array.from(serviceTypeSet).map((st) => ({
      value: st,
      label: this._humanizeEnum(st)
    }));

    // Price range
    let minPrice = null;
    let maxPrice = null;
    filteredServices.forEach((s) => {
      const values = [];
      if (typeof s.basePrice === 'number') values.push(s.basePrice);
      if (typeof s.minPrice === 'number') values.push(s.minPrice);
      if (typeof s.maxPrice === 'number') values.push(s.maxPrice);
      values.forEach((v) => {
        if (minPrice == null || v < minPrice) minPrice = v;
        if (maxPrice == null || v > maxPrice) maxPrice = v;
      });
    });

    const priceRange = {
      min: minPrice != null ? minPrice : 0,
      max: maxPrice != null ? maxPrice : 0,
      currency: 'USD'
    };

    const ratingOptions = [
      { value: 4, label: '4 stars & up' },
      { value: 3, label: '3 stars & up' },
      { value: 2, label: '2 stars & up' },
      { value: 1, label: '1 star & up' }
    ];

    return {
      serviceTypes,
      yardSizes: yardSizes.map((y) => ({
        code: y.code,
        label: y.label,
        minAcres: y.minAcres || null,
        maxAcres: y.maxAcres || null
      })),
      priceRange,
      ratingOptions,
      featureOptions: features
    };
  }

  // listServices(categoryParam, query, filters, sortBy, page, pageSize)
  listServices(categoryParam, query, filters, sortBy, page = 1, pageSize = 20) {
    const categories = this._getFromStorage('service_categories');
    const yardSizes = this._getFromStorage('yard_size_options');
    const features = this._getFromStorage('service_features');
    const services = this._getFromStorage('services').filter((s) => s.isActive);

    let result = services.slice();

    if (categoryParam && categoryParam !== 'all_services') {
      const cat = categories.find((c) => c.categoryParam === categoryParam);
      if (cat) {
        result = result.filter((s) => s.categoryId === cat.id);
      }
    }

    if (query && typeof query === 'string' && query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((s) => {
        const name = (s.name || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const keywords = Array.isArray(s.searchKeywords)
          ? s.searchKeywords.join(' ').toLowerCase()
          : '';
        return name.includes(q) || desc.includes(q) || keywords.includes(q);
      });
    }

    if (filters && typeof filters === 'object') {
      if (filters.serviceType) {
        result = result.filter((s) => s.serviceType === filters.serviceType);
      }
      if (filters.propertySizeCode) {
        result = result.filter((s) => {
          const sizes = s.availablePropertySizes || [];
          return sizes.includes(filters.propertySizeCode);
        });
      }
      if (typeof filters.minPrice === 'number') {
        result = result.filter((s) => {
          const price = typeof s.basePrice === 'number' ? s.basePrice : s.minPrice;
          if (price == null) return false;
          return price >= filters.minPrice;
        });
      }
      if (typeof filters.maxPrice === 'number') {
        result = result.filter((s) => {
          const price = typeof s.basePrice === 'number' ? s.basePrice : s.maxPrice;
          if (price == null) return false;
          return price <= filters.maxPrice;
        });
      }
      if (typeof filters.minRating === 'number') {
        result = result.filter((s) => (s.rating || 0) >= filters.minRating);
      }
      if (filters.featureCodes && Array.isArray(filters.featureCodes) && filters.featureCodes.length) {
        result = result.filter((s) => {
          const sf = s.featureCodes || [];
          return filters.featureCodes.every((code) => sf.includes(code));
        });
      }
      if (filters.onlyBookableOnline) {
        result = result.filter((s) => !!s.isBookableOnline);
      }
      if (filters.priceUnit) {
        result = result.filter((s) => s.priceUnit === filters.priceUnit);
      }
    }

    if (sortBy === 'rating_high_to_low') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price_low_to_high') {
      result.sort((a, b) => {
        const aPrice = typeof a.basePrice === 'number' ? a.basePrice : a.minPrice || 0;
        const bPrice = typeof b.basePrice === 'number' ? b.basePrice : b.minPrice || 0;
        return aPrice - bPrice;
      });
    } else if (sortBy === 'price_high_to_low') {
      result.sort((a, b) => {
        const aPrice = typeof a.basePrice === 'number' ? a.basePrice : a.maxPrice || 0;
        const bPrice = typeof b.basePrice === 'number' ? b.basePrice : b.maxPrice || 0;
        return bPrice - aPrice;
      });
    }

    const total = result.length;
    const start = (page - 1) * pageSize;
    const paged = result.slice(start, start + pageSize);

    const servicesDto = paged.map((s) => {
      const cat = categories.find((c) => c.id === s.categoryId) || {};
      const sizeLabels = (s.availablePropertySizes || []).map((code) => {
        const ys = yardSizes.find((y) => y.code === code);
        return ys ? ys.label : code;
      });
      const featureNames = (s.featureCodes || []).map((code) => {
        const f = features.find((ft) => ft.code === code);
        return f ? f.name : code;
      });
      return {
        serviceId: s.id,
        name: s.name,
        description: s.description || '',
        categoryName: cat.name || null,
        categoryParam: cat.categoryParam || null,
        serviceType: s.serviceType,
        priceUnit: s.priceUnit,
        basePrice: s.basePrice || null,
        minPrice: s.minPrice || null,
        maxPrice: s.maxPrice || null,
        rating: s.rating || null,
        ratingCount: s.ratingCount || 0,
        availablePropertySizeLabels: sizeLabels,
        featureNames,
        isBookableOnline: !!s.isBookableOnline,
        canBeAddedToCart: !!s.canBeAddedToCart,
        supportsQuoteRequest: !!s.supportsQuoteRequest,
        supportsConsultationRequest: !!s.supportsConsultationRequest,
        imageUrl: s.imageUrl || null,
        service: s
      };
    });

    return {
      total,
      page,
      pageSize,
      services: servicesDto
    };
  }

  // getServiceDetail(serviceId)
  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services');
    const categories = this._getFromStorage('service_categories');
    const yardSizes = this._getFromStorage('yard_size_options');
    const features = this._getFromStorage('service_features');

    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return {
        service: null,
        categoryName: null,
        categoryParam: null,
        yardSizes: [],
        features: [],
        averageRating: null,
        ratingCount: 0,
        isBookableOnline: false,
        canBeAddedToCart: false,
        supportsQuoteRequest: false,
        supportsConsultationRequest: false
      };
    }

    const cat = categories.find((c) => c.id === service.categoryId) || {};
    const yardSizeList = (service.availablePropertySizes || []).map((code) => {
      const ys = yardSizes.find((y) => y.code === code);
      return {
        code,
        label: ys ? ys.label : code
      };
    });

    const featureList = (service.featureCodes || []).map((code) => {
      const f = features.find((ft) => ft.code === code);
      return f || null;
    }).filter(Boolean);

    return {
      service,
      categoryName: cat.name || null,
      categoryParam: cat.categoryParam || null,
      yardSizes: yardSizeList,
      features: featureList,
      averageRating: service.rating || null,
      ratingCount: service.ratingCount || 0,
      isBookableOnline: !!service.isBookableOnline,
      canBeAddedToCart: !!service.canBeAddedToCart,
      supportsQuoteRequest: !!service.supportsQuoteRequest,
      supportsConsultationRequest: !!service.supportsConsultationRequest
    };
  }

  // getMaintenancePlanListFilterOptions
  getMaintenancePlanListFilterOptions() {
    const plans = this._getFromStorage('maintenance_plans');
    const features = this._getFromStorage('service_features');
    const yardSizes = this._getFromStorage('yard_size_options');

    const activePlans = plans.filter((p) => p.isActive);

    const planTypeSet = new Set();
    activePlans.forEach((p) => planTypeSet.add(p.planType));
    const planTypes = Array.from(planTypeSet).map((pt) => ({
      value: pt,
      label: this._humanizeEnum(pt)
    }));

    let maxPriceDefault = 0;
    activePlans.forEach((p) => {
      if (typeof p.pricePerMonth === 'number' && p.pricePerMonth > maxPriceDefault) {
        maxPriceDefault = p.pricePerMonth;
      }
    });

    return {
      planTypes,
      maxPriceDefault,
      featureOptions: features,
      yardSizes: yardSizes.map((y) => ({ code: y.code, label: y.label }))
    };
  }

  // listMaintenancePlans(planType, maxMonthlyPrice, includesLawnMowing, includesLeafRemoval, includedFeatureCodes, sortBy, page, pageSize)
  listMaintenancePlans(
    planType,
    maxMonthlyPrice,
    includesLawnMowing,
    includesLeafRemoval,
    includedFeatureCodes,
    sortBy,
    page = 1,
    pageSize = 20
  ) {
    const plans = this._getFromStorage('maintenance_plans').filter((p) => p.isActive);
    const features = this._getFromStorage('service_features');
    const yardSizes = this._getFromStorage('yard_size_options');

    let result = plans.slice();

    if (planType) {
      result = result.filter((p) => p.planType === planType);
    }
    if (typeof maxMonthlyPrice === 'number') {
      result = result.filter((p) => p.pricePerMonth <= maxMonthlyPrice);
    }
    if (includesLawnMowing) {
      result = result.filter((p) => !!p.includesLawnMowing);
    }
    if (includesLeafRemoval) {
      result = result.filter((p) => !!p.includesLeafRemoval);
    }
    if (includedFeatureCodes && Array.isArray(includedFeatureCodes) && includedFeatureCodes.length) {
      result = result.filter((p) => {
        const pf = p.includedFeatureCodes || [];
        return includedFeatureCodes.every((code) => pf.includes(code));
      });
    }

    if (sortBy === 'price_low_to_high') {
      result.sort((a, b) => a.pricePerMonth - b.pricePerMonth);
    } else if (sortBy === 'price_high_to_low') {
      result.sort((a, b) => b.pricePerMonth - a.pricePerMonth);
    } else if (sortBy === 'visits_high_to_low') {
      result.sort((a, b) => (b.visitsPerMonth || 0) - (a.visitsPerMonth || 0));
    } else if (sortBy === 'rating_high_to_low') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total = result.length;
    const start = (page - 1) * pageSize;
    const paged = result.slice(start, start + pageSize);

    const dtoPlans = paged.map((p) => {
      const featureNames = (p.includedFeatureCodes || []).map((code) => {
        const f = features.find((ft) => ft.code === code);
        return f ? f.name : code;
      });
      const ys = yardSizes.find((y) => y.code === p.maxPropertySizeCode);
      return {
        planId: p.id,
        name: p.name,
        description: p.description || '',
        planType: p.planType,
        pricePerMonth: p.pricePerMonth,
        visitsPerMonth: p.visitsPerMonth,
        includesLawnMowing: !!p.includesLawnMowing,
        includesLeafRemoval: !!p.includesLeafRemoval,
        includedFeatureNames: featureNames,
        maxPropertySizeLabel: ys ? ys.label : null,
        rating: p.rating || null,
        ratingCount: p.ratingCount || 0,
        imageUrl: p.imageUrl || null,
        plan: p
      };
    });

    return {
      total,
      page,
      pageSize,
      plans: dtoPlans
    };
  }

  // getMaintenancePlanDetail(planId)
  getMaintenancePlanDetail(planId) {
    const plans = this._getFromStorage('maintenance_plans');
    const features = this._getFromStorage('service_features');
    const yardSizes = this._getFromStorage('yard_size_options');

    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        plan: null,
        includedFeatures: [],
        maxPropertySizeLabel: null,
        availableBillingFrequencies: []
      };
    }

    const includedFeatures = (plan.includedFeatureCodes || []).map((code) => {
      const f = features.find((ft) => ft.code === code);
      return f || null;
    }).filter(Boolean);

    const ys = yardSizes.find((y) => y.code === plan.maxPropertySizeCode);

    return {
      plan,
      includedFeatures,
      maxPropertySizeLabel: ys ? ys.label : null,
      availableBillingFrequencies: plan.availableBillingFrequencies || []
    };
  }

  // getBookableServiceCategories
  getBookableServiceCategories() {
    const categories = this._getFromStorage('service_categories');
    const services = this._getFromStorage('services').filter((s) => s.isActive && s.isBookableOnline);

    const categoryIds = new Set(services.map((s) => s.categoryId));
    const result = categories
      .filter((c) => categoryIds.has(c.id))
      .map((c) => ({
        categoryParam: c.categoryParam,
        name: c.name,
        description: c.description || ''
      }));

    return result;
  }

  // getBookableServicesForCategory(categoryParam)
  getBookableServicesForCategory(categoryParam) {
    const categories = this._getFromStorage('service_categories');
    const services = this._getFromStorage('services').filter((s) => s.isActive && s.isBookableOnline);

    const cat = categories.find((c) => c.categoryParam === categoryParam);
    if (!cat) return [];

    return services
      .filter((s) => s.categoryId === cat.id)
      .map((s) => ({
        serviceId: s.id,
        name: s.name,
        description: s.description || '',
        defaultDurationMinutes: s.defaultDurationMinutes || null,
        imageUrl: s.imageUrl || null,
        service: s
      }));
  }

  // getAvailableTimeSlots(serviceId, date)
  getAvailableTimeSlots(serviceId, date) {
    const slots = this._findAvailableTimeSlotsForServiceAndDate(serviceId, date);
    const services = this._getFromStorage('services');
    const service = services.find((s) => s.id === serviceId) || null;

    return slots.map((slot) => ({
      ...slot,
      service
    }));
  }

  // createBooking(serviceId, scheduledDate, timeSlotId, customerName, address, zipCode, phone, email, paymentOption)
  createBooking(
    serviceId,
    scheduledDate,
    timeSlotId,
    customerName,
    address,
    zipCode,
    phone,
    email,
    paymentOption
  ) {
    const services = this._getFromStorage('services');
    const bookings = this._getFromStorage('bookings');
    const timeSlots = this._getFromStorage('time_slots');

    const service = services.find((s) => s.id === serviceId) || null;
    const timeSlot = timeSlots.find((t) => t.id === timeSlotId) || null;

    // Allow booking to proceed even if the service is not present in the services list,
    // as long as the referenced time slot exists. This supports scenarios where
    // bookable services are defined only via time slot data.
    if (!timeSlot) {
      return {
        success: false,
        bookingId: null,
        status: 'cancelled',
        message: 'Invalid time slot'
      };
    }

    const now = new Date().toISOString();
    const bookingId = this._generateId('booking');

    const booking = {
      id: bookingId,
      serviceId,
      serviceName: service ? service.name : null,
      scheduledDate: new Date(scheduledDate).toISOString(),
      timeSlotId: timeSlotId,
      timeSlotStart: timeSlot.startTime,
      timeSlotEnd: timeSlot.endTime,
      customerName,
      address,
      zipCode,
      phone,
      email,
      paymentOption,
      status: 'pending',
      createdAt: now
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    // Mark timeslot as unavailable
    const tsIndex = timeSlots.findIndex((t) => t.id === timeSlotId);
    if (tsIndex !== -1) {
      timeSlots[tsIndex].isAvailable = false;
      this._saveToStorage('time_slots', timeSlots);
    }

    return {
      success: true,
      bookingId,
      status: 'pending',
      message: 'Booking created successfully'
    };
  }

  // getPackageBuilderServiceOptions(query, featureCodes)
  getPackageBuilderServiceOptions(query, featureCodes) {
    const services = this._getFromStorage('services').filter((s) => s.isActive);
    const features = this._getFromStorage('service_features');

    let result = services.slice();

    if (query && typeof query === 'string' && query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((s) => {
        const name = (s.name || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (featureCodes && Array.isArray(featureCodes) && featureCodes.length) {
      result = result.filter((s) => {
        const sf = s.featureCodes || [];
        return featureCodes.every((code) => sf.includes(code));
      });
    }

    return result.map((s) => {
      const featureNames = (s.featureCodes || []).map((code) => {
        const f = features.find((ft) => ft.code === code);
        return f ? f.name : code;
      });
      return {
        serviceId: s.id,
        name: s.name,
        description: s.description || '',
        priceUnit: s.priceUnit,
        basePrice: s.basePrice || null,
        minPrice: s.minPrice || null,
        maxPrice: s.maxPrice || null,
        featureNames,
        service: s
      };
    });
  }

  // getActiveCustomPackage
  getActiveCustomPackage() {
    const { package: pkg, items } = this._getOrCreateActiveCustomPackage();
    return {
      package: pkg,
      items
    };
  }

  // addServiceToActiveCustomPackage(serviceId, frequency)
  addServiceToActiveCustomPackage(serviceId, frequency) {
    const services = this._getFromStorage('services');
    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      const current = this._getOrCreateActiveCustomPackage();
      return current;
    }

    const { package: pkg } = this._getOrCreateActiveCustomPackage();
    const items = this._getFromStorage('custom_package_service_items');

    const estimatedPrice = this._estimateServicePriceForFrequency(service, frequency);
    const item = {
      id: this._generateId('pkg_item'),
      packageId: pkg.id,
      serviceId: serviceId,
      serviceName: service.name,
      frequency,
      estimatedPrice
    };

    items.push(item);
    this._saveToStorage('custom_package_service_items', items);

    this._recalculateCustomPackageEstimate(pkg, items);

    const updatedItems = items.filter((it) => it.packageId === pkg.id);
    return {
      package: this._getFromStorage('custom_packages').find((p) => p.id === pkg.id) || pkg,
      items: updatedItems
    };
  }

  // updateCustomPackageItemFrequency(packageItemId, frequency)
  updateCustomPackageItemFrequency(packageItemId, frequency) {
    const items = this._getFromStorage('custom_package_service_items');
    const services = this._getFromStorage('services');

    const itemIndex = items.findIndex((it) => it.id === packageItemId);
    if (itemIndex === -1) {
      return this.getActiveCustomPackage();
    }

    const item = items[itemIndex];
    const service = services.find((s) => s.id === item.serviceId) || null;
    const estimatedPrice = this._estimateServicePriceForFrequency(service, frequency);

    items[itemIndex].frequency = frequency;
    items[itemIndex].estimatedPrice = estimatedPrice;

    this._saveToStorage('custom_package_service_items', items);

    const pkgId = item.packageId;
    const pkg = this._getFromStorage('custom_packages').find((p) => p.id === pkgId);
    if (pkg) {
      this._recalculateCustomPackageEstimate(pkg, items);
    }

    const updatedPackage = this._getFromStorage('custom_packages').find((p) => p.id === pkgId) || pkg;
    const updatedItems = items.filter((it) => it.packageId === pkgId);

    return {
      package: updatedPackage,
      items: updatedItems
    };
  }

  // finalizeCustomPackageForReview(targetPriceMin, targetPriceMax)
  finalizeCustomPackageForReview(targetPriceMin, targetPriceMax) {
    const { package: pkg, items } = this._getOrCreateActiveCustomPackage();
    const packages = this._getFromStorage('custom_packages');
    const index = packages.findIndex((p) => p.id === pkg.id);
    if (index !== -1) {
      packages[index].targetPriceMin = typeof targetPriceMin === 'number' ? targetPriceMin : packages[index].targetPriceMin;
      packages[index].targetPriceMax = typeof targetPriceMax === 'number' ? targetPriceMax : packages[index].targetPriceMax;
      packages[index].status = 'saved';
      packages[index].updatedAt = new Date().toISOString();
      this._saveToStorage('custom_packages', packages);
    }
    const updatedPkg = packages.find((p) => p.id === pkg.id) || pkg;
    return {
      package: updatedPkg,
      items
    };
  }

  // getCustomPackageReview
  getCustomPackageReview() {
    const pkg = this._getPackageByStatusForReview();
    if (!pkg) {
      return {
        package: null,
        items: [],
        meetsServiceCountCriteria: false,
        meetsPriceRangeCriteria: false,
        validationMessages: ['No custom package found']
      };
    }

    const items = this._getFromStorage('custom_package_service_items').filter((it) => it.packageId === pkg.id);

    const meetsServiceCountCriteria = items.length === 3;
    let meetsPriceRangeCriteria = false;
    if (typeof pkg.targetPriceMin === 'number' && typeof pkg.targetPriceMax === 'number') {
      const total = pkg.totalEstimatedPrice || 0;
      meetsPriceRangeCriteria = total >= pkg.targetPriceMin && total <= pkg.targetPriceMax;
    }

    const validationMessages = [];
    if (!meetsServiceCountCriteria) {
      validationMessages.push('Package must include exactly three services.');
    }
    if (!meetsPriceRangeCriteria) {
      validationMessages.push('Package total is outside the target price range.');
    }

    return {
      package: pkg,
      items,
      meetsServiceCountCriteria,
      meetsPriceRangeCriteria,
      validationMessages
    };
  }

  // saveCustomPackageForCheckout(label)
  saveCustomPackageForCheckout(label) {
    const pkg = this._getPackageByStatusForReview();
    if (!pkg) {
      return {
        success: false,
        packageId: null,
        message: 'No custom package to save.'
      };
    }

    const packages = this._getFromStorage('custom_packages');
    const index = packages.findIndex((p) => p.id === pkg.id);
    if (index !== -1) {
      if (label) {
        packages[index].label = label;
      }
      packages[index].status = 'ready_for_checkout';
      packages[index].updatedAt = new Date().toISOString();
      this._saveToStorage('custom_packages', packages);
    }

    return {
      success: true,
      packageId: pkg.id,
      message: 'Custom package saved and ready for checkout.'
    };
  }

  // addCustomPackageToCart(packageId)
  addCustomPackageToCart(packageId) {
    const cart = this._getOrCreateCart();
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const packages = this._getFromStorage('custom_packages');

    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return this.getCartSummary();
    }

    const unitPrice = pkg.totalEstimatedPrice || 0;
    const billingFrequency = pkg.billingFrequency || 'monthly';

    const item = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      sourceType: 'custom_package',
      sourceId: packageId,
      name: pkg.label || 'Custom Package',
      quantity: 1,
      unitPrice,
      billingFrequency,
      isRecurring: billingFrequency === 'monthly',
      lineSubtotal: unitPrice,
      lineDiscount: 0,
      lineTotal: unitPrice
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    this._recalculateCartTotals();

    return this.getCartSummary();
  }

  // listPromotions(onlyActive = true)
  listPromotions(onlyActive = true) {
    const promotions = this._getFromStorage('promotions');
    if (!onlyActive) return promotions;
    const now = Date.now();
    return promotions.filter((p) => {
      if (!p.isActive) return false;
      if (p.validFrom) {
        const from = Date.parse(p.validFrom);
        if (!Number.isNaN(from) && from > now) return false;
      }
      if (p.validTo) {
        const to = Date.parse(p.validTo);
        if (!Number.isNaN(to) && to < now) return false;
      }
      return true;
    });
  }

  // addServiceToCart(serviceId, quantity = 1, billingFrequency, isRecurring)
  addServiceToCart(serviceId, quantity = 1, billingFrequency, isRecurring) {
    const cart = this._getOrCreateCart();
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const services = this._getFromStorage('services');

    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return this.getCartSummary();
    }

    let unitPrice = service.basePrice;
    if (typeof unitPrice !== 'number') {
      if (typeof service.minPrice === 'number') unitPrice = service.minPrice;
      else unitPrice = 0;
    }

    let bf = billingFrequency;
    if (!bf) {
      if (service.serviceType === 'ongoing_lawn_mowing') bf = 'monthly';
      else bf = 'one_time';
    }

    const recurring = typeof isRecurring === 'boolean' ? isRecurring : bf !== 'one_time';

    const lineSubtotal = unitPrice * quantity;

    const item = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      sourceType: 'service',
      sourceId: serviceId,
      name: service.name,
      quantity,
      unitPrice,
      billingFrequency: bf,
      isRecurring: recurring,
      lineSubtotal,
      lineDiscount: 0,
      lineTotal: lineSubtotal
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals();

    return this.getCartSummary();
  }

  // addMaintenancePlanToCart(planId, billingFrequency, quantity = 1)
  addMaintenancePlanToCart(planId, billingFrequency, quantity = 1) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const plans = this._getFromStorage('maintenance_plans');

    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return this.getCartSummary();
    }

    const unitPrice = plan.pricePerMonth || 0;
    const bf = billingFrequency || 'monthly';

    const item = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      sourceType: 'maintenance_plan',
      sourceId: planId,
      name: plan.name,
      quantity,
      unitPrice,
      billingFrequency: bf,
      isRecurring: bf !== 'one_time',
      lineSubtotal: unitPrice * quantity,
      lineDiscount: 0,
      lineTotal: unitPrice * quantity
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals();

    return this.getCartSummary();
  }

  // getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');

    const currentCart = carts.find((c) => c.id === cart.id) || cart;
    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    // Ensure totals are up to date
    this._recalculateCartTotals();
    const updatedCarts = this._getFromStorage('cart');
    const updatedItems = this._getFromStorage('cart_items').filter((ci) => ci.cartId === cart.id);
    const updatedCart = updatedCarts.find((c) => c.id === cart.id) || currentCart;

    const resolvedItems = this._resolveCartItemsWithSources(updatedCart, updatedItems);

    return {
      cart: updatedCart,
      items: resolvedItems
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return this.getCartSummary();
    }

    if (quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      cartItems[index].quantity = quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals();

    return this.getCartSummary();
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index !== -1) {
      cartItems.splice(index, 1);
      this._saveToStorage('cart_items', cartItems);
      this._recalculateCartTotals();
    }
    return this.getCartSummary();
  }

  // applyPromotionCode(promoCode)
  applyPromotionCode(promoCode) {
    const cart = this._getOrCreateCart();
    const carts = this._getFromStorage('cart');
    const promotions = this._getFromStorage('promotions');

    const code = (promoCode || '').trim();
    if (!code) {
      return {
        success: false,
        message: 'Promotion code is empty.',
        appliedPromotionId: null,
        ...this.getCartSummary()
      };
    }

    const promotion = promotions.find(
      (p) => p.isActive && typeof p.promoCode === 'string' && p.promoCode.trim().toLowerCase() === code.toLowerCase()
    );

    if (!promotion) {
      return {
        success: false,
        message: 'Promotion code not found or inactive.',
        appliedPromotionId: null,
        ...this.getCartSummary()
      };
    }

    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex].promotionCode = promotion.promoCode;
      carts[cartIndex].promotionDescription = promotion.title || '';
      this._saveToStorage('cart', carts);
    }

    this._recalculateCartTotals();
    const summary = this.getCartSummary();

    return {
      success: true,
      message: 'Promotion applied successfully.',
      appliedPromotionId: promotion.id,
      cart: summary.cart,
      items: summary.items
    };
  }

  // createOrderFromCurrentCart
  createOrderFromCurrentCart() {
    const cart = this._getOrCreateCart();
    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const orders = this._getFromStorage('orders');

    const currentCart = carts.find((c) => c.id === cart.id) || cart;
    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    const orderId = this._generateId('order');
    const now = new Date().toISOString();

    const order = {
      id: orderId,
      cartId: currentCart.id,
      status: 'pending_payment',
      itemsSnapshot: JSON.parse(JSON.stringify(itemsForCart)),
      subtotal: currentCart.subtotal || 0,
      discountTotal: currentCart.discountTotal || 0,
      total: currentCart.total || 0,
      promotionCode: currentCart.promotionCode || null,
      paymentMethod: null,
      billingName: null,
      billingAddress: null,
      billingZip: null,
      billingPhone: null,
      billingEmail: null,
      createdAt: now,
      paidAt: null
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    localStorage.setItem('activeOrderId', orderId);

    return {
      order
    };
  }

  // getCheckoutSummary(orderId?)
  getCheckoutSummary(orderId) {
    const orders = this._getFromStorage('orders');
    let order = null;

    if (orderId) {
      order = orders.find((o) => o.id === orderId) || null;
    } else {
      order = this._getActiveOrder();
    }

    if (!order) {
      return {
        order: null,
        availablePaymentMethods: []
      };
    }

    const carts = this._getFromStorage('cart');
    const cartItems = this._getFromStorage('cart_items');
    const services = this._getFromStorage('services');
    const plans = this._getFromStorage('maintenance_plans');
    const packages = this._getFromStorage('custom_packages');

    const cart = carts.find((c) => c.id === order.cartId) || null;

    // Resolve itemsSnapshot foreign keys
    const resolvedSnapshot = (order.itemsSnapshot || []).map((item) => {
      const extended = { ...item };
      if (item.sourceType === 'service') {
        extended.service = services.find((s) => s.id === item.sourceId) || null;
      } else if (item.sourceType === 'maintenance_plan') {
        extended.maintenance_plan = plans.find((p) => p.id === item.sourceId) || null;
      } else if (item.sourceType === 'custom_package') {
        extended.custom_package = packages.find((p) => p.id === item.sourceId) || null;
      }
      return extended;
    });

    const orderWithResolved = {
      ...order,
      cart,
      itemsSnapshot: resolvedSnapshot
    };

    const availablePaymentMethods = ['card', 'cash_on_site', 'bank_transfer', 'paypal', 'other'];

    return {
      order: orderWithResolved,
      availablePaymentMethods
    };
  }

  // updateOrderBillingDetails(orderId, billingName, billingAddress, billingZip, billingPhone, billingEmail)
  updateOrderBillingDetails(orderId, billingName, billingAddress, billingZip, billingPhone, billingEmail) {
    const orders = this._getFromStorage('orders');
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) {
      return {
        order: null
      };
    }

    orders[index].billingName = billingName;
    orders[index].billingAddress = billingAddress;
    orders[index].billingZip = billingZip;
    orders[index].billingPhone = billingPhone;
    orders[index].billingEmail = billingEmail;

    this._saveToStorage('orders', orders);

    return {
      order: orders[index]
    };
  }

  // setOrderPaymentMethod(orderId, paymentMethod)
  setOrderPaymentMethod(orderId, paymentMethod) {
    const orders = this._getFromStorage('orders');
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) {
      return {
        order: null
      };
    }

    orders[index].paymentMethod = paymentMethod;
    this._saveToStorage('orders', orders);

    return {
      order: orders[index]
    };
  }

  // finalizeOrderPayment(orderId)
  finalizeOrderPayment(orderId) {
    const orders = this._getFromStorage('orders');
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) {
      return {
        success: false,
        status: 'cancelled',
        paidAt: null,
        message: 'Order not found.'
      };
    }

    const now = new Date().toISOString();
    orders[index].status = 'paid';
    orders[index].paidAt = now;
    this._saveToStorage('orders', orders);

    return {
      success: true,
      status: 'paid',
      paidAt: now,
      message: 'Order marked as paid.'
    };
  }

  // getGalleryFilterOptions
  getGalleryFilterOptions() {
    const yardSizes = this._getFromStorage('yard_size_options');
    const features = this._getFromStorage('service_features');

    const spaceTypesValues = ['backyard', 'front_yard', 'side_yard', 'courtyard', 'rooftop', 'mixed'];
    const spaceTypes = spaceTypesValues.map((st) => ({
      value: st,
      label: this._humanizeEnum(st)
    }));

    return {
      spaceTypes,
      yardSizes,
      featureOptions: features
    };
  }

  // listProjects(filters, sortBy, page, pageSize)
  listProjects(filters, sortBy, page = 1, pageSize = 24) {
    const projects = this._getFromStorage('projects');
    const yardSizes = this._getFromStorage('yard_size_options');
    const features = this._getFromStorage('service_features');

    let result = projects.slice();

    if (filters && typeof filters === 'object') {
      if (filters.spaceType) {
        result = result.filter((p) => p.spaceType === filters.spaceType);
      }
      if (filters.yardSizeCode) {
        result = result.filter((p) => p.yardSizeCode === filters.yardSizeCode);
      }
      if (filters.featureCodes && Array.isArray(filters.featureCodes) && filters.featureCodes.length) {
        result = result.filter((p) => {
          const pf = p.featureCodes || [];
          return filters.featureCodes.every((code) => pf.includes(code));
        });
      }
      if (typeof filters.isFeatured === 'boolean') {
        result = result.filter((p) => !!p.isFeatured === filters.isFeatured);
      }
    }

    if (sortBy === 'featured_first') {
      result.sort((a, b) => (b.isFeatured === true) - (a.isFeatured === true));
    } else if (sortBy === 'recent_first') {
      // No explicit date field; keep insertion order
    }

    const total = result.length;
    const start = (page - 1) * pageSize;
    const paged = result.slice(start, start + pageSize);

    const dtoProjects = paged.map((p) => {
      const ys = yardSizes.find((y) => y.code === p.yardSizeCode);
      const featureNames = (p.featureCodes || []).map((code) => {
        const f = features.find((ft) => ft.code === code);
        return f ? f.name : code;
      });
      return {
        projectId: p.id,
        referenceCode: p.referenceCode,
        title: p.title,
        spaceType: p.spaceType,
        yardSizeLabel: ys ? ys.label : null,
        featureNames,
        imageUrl: Array.isArray(p.imageUrls) && p.imageUrls.length ? p.imageUrls[0] : null,
        isFeatured: !!p.isFeatured,
        project: p
      };
    });

    return {
      total,
      page,
      pageSize,
      projects: dtoProjects
    };
  }

  // getProjectDetail(projectId)
  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects');
    const yardSizes = this._getFromStorage('yard_size_options');
    const features = this._getFromStorage('service_features');

    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) {
      return {
        project: null,
        yardSizeLabel: null,
        featureNames: [],
        isFavorited: false
      };
    }

    const ys = yardSizes.find((y) => y.code === project.yardSizeCode);
    const featureNames = (project.featureCodes || []).map((code) => {
      const f = features.find((ft) => ft.code === code);
      return f ? f.name : code;
    });

    const favoritesRecord = this._getOrCreateFavoriteProjectsRecord();
    const isFavorited = favoritesRecord.projectIds.includes(project.id);

    return {
      project,
      yardSizeLabel: ys ? ys.label : null,
      featureNames,
      isFavorited
    };
  }

  // addProjectToFavorites(projectId)
  addProjectToFavorites(projectId) {
    const favoritesArr = this._getFromStorage('favorite_projects');
    let record = favoritesArr.find((f) => f.id === 'default_favorites');

    if (!record) {
      record = {
        id: 'default_favorites',
        projectIds: [],
        updatedAt: new Date().toISOString()
      };
      favoritesArr.push(record);
    }

    const idx = record.projectIds.indexOf(projectId);
    let isFavorited = false;
    if (idx === -1) {
      record.projectIds.push(projectId);
      isFavorited = true;
    } else {
      record.projectIds.splice(idx, 1);
      isFavorited = false;
    }

    record.updatedAt = new Date().toISOString();

    const recordIndex = favoritesArr.findIndex((f) => f.id === record.id);
    if (recordIndex !== -1) {
      favoritesArr[recordIndex] = record;
    }

    this._saveToStorage('favorite_projects', favoritesArr);

    return {
      projectId,
      isFavorited,
      favorites: record
    };
  }

  // getFavoriteProjects
  getFavoriteProjects() {
    const favoritesArr = this._getFromStorage('favorite_projects');
    let record = favoritesArr.find((f) => f.id === 'default_favorites');
    if (!record) {
      record = {
        id: 'default_favorites',
        projectIds: [],
        updatedAt: new Date().toISOString()
      };
      favoritesArr.push(record);
      this._saveToStorage('favorite_projects', favoritesArr);
    }

    const projects = this._getFromStorage('projects');
    const favProjects = record.projectIds
      .map((pid) => projects.find((p) => p.id === pid) || null)
      .filter(Boolean);

    return {
      favorites: record,
      projects: favProjects
    };
  }

  // requestProjectDesign(projectId, requestedProjectType, name, email, zipCode, message)
  requestProjectDesign(projectId, requestedProjectType, name, email, zipCode, message) {
    const projects = this._getFromStorage('projects');
    const designRequests = this._getFromStorage('project_design_requests');

    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) {
      return {
        success: false,
        requestId: null,
        message: 'Project not found.'
      };
    }

    const id = this._generateId('proj_design');
    const now = new Date().toISOString();

    const request = {
      id,
      projectId,
      projectReferenceCode: project.referenceCode,
      requestedProjectType: requestedProjectType || null,
      name,
      email,
      zipCode,
      message,
      createdAt: now
    };

    designRequests.push(request);
    this._saveToStorage('project_design_requests', designRequests);

    return {
      success: true,
      requestId: id,
      message: 'Project design request submitted.'
    };
  }

  // createQuoteRequest(serviceId, propertySizeCode, maxMonthlyPrice, name, streetAddress, zipCode, phone, preferredContactMethod, notes)
  createQuoteRequest(
    serviceId,
    propertySizeCode,
    maxMonthlyPrice,
    name,
    streetAddress,
    zipCode,
    phone,
    preferredContactMethod,
    notes
  ) {
    const services = this._getFromStorage('services');
    const quoteRequests = this._getFromStorage('quote_requests');

    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return {
        success: false,
        quoteRequestId: null,
        message: 'Service not found.'
      };
    }

    const id = this._generateId('quote');
    const now = new Date().toISOString();

    const request = {
      id,
      serviceId,
      serviceName: service.name,
      propertySizeCode: propertySizeCode || null,
      maxMonthlyPrice: typeof maxMonthlyPrice === 'number' ? maxMonthlyPrice : null,
      name,
      streetAddress,
      zipCode,
      phone,
      preferredContactMethod,
      notes: notes || null,
      createdAt: now
    };

    quoteRequests.push(request);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      quoteRequestId: id,
      message: 'Quote request submitted.'
    };
  }

  // createConsultationRequest(serviceId, name, address, zipCode, phone, email, preferredTimeOfDay, message)
  createConsultationRequest(
    serviceId,
    name,
    address,
    zipCode,
    phone,
    email,
    preferredTimeOfDay,
    message
  ) {
    const services = this._getFromStorage('services');
    const consultationRequests = this._getFromStorage('consultation_requests');

    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return {
        success: false,
        consultationRequestId: null,
        message: 'Service not found.'
      };
    }

    const id = this._generateId('consult');
    const now = new Date().toISOString();

    const request = {
      id,
      serviceId,
      serviceName: service.name,
      name,
      address,
      zipCode,
      phone: phone || null,
      email: email || null,
      preferredTimeOfDay: preferredTimeOfDay || null,
      message: message || null,
      createdAt: now
    };

    consultationRequests.push(request);
    this._saveToStorage('consultation_requests', consultationRequests);

    return {
      success: true,
      consultationRequestId: id,
      message: 'Consultation request submitted.'
    };
  }

  // searchFAQArticles(query)
  searchFAQArticles(query) {
    const faqArticles = this._getFromStorage('faq_articles');
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const results = faqArticles
      .filter((a) => {
        const title = (a.title || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        return title.includes(q) || content.includes(q);
      })
      .map((a) => ({
        id: a.id,
        articleId: a.articleId,
        title: a.title,
        excerpt: (a.content || '').slice(0, 200),
        category: a.category || ''
      }));

    // Instrumentation for task completion tracking (task_8 FAQ searches)
    try {
      const normalizedQuery = q;
      if (normalizedQuery.includes('service area') && results && results.length > 0) {
        localStorage.setItem(
          'task8_serviceAreaFAQSearch',
          JSON.stringify({
            query: normalizedQuery,
            resultArticleIds: results.map((r) => r.articleId)
          })
        );
      }
      if (normalizedQuery.includes('cancellation') && results && results.length > 0) {
        localStorage.setItem(
          'task8_cancellationFAQSearch',
          JSON.stringify({
            query: normalizedQuery,
            resultArticleIds: results.map((r) => r.articleId)
          })
        );
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {}
    }

    return results;
  }

  // getFAQArticle(articleId)
  getFAQArticle(articleId) {
    const faqArticles = this._getFromStorage('faq_articles');
    const article = faqArticles.find((a) => a.articleId === articleId) || null;

    // Instrumentation for task completion tracking (task_8 FAQ article views)
    try {
      if (article) {
        const title = (article.title || '').toLowerCase();
        const content = (article.content || '').toLowerCase();

        // Service area related article viewed
        if (
          title.includes('service area') ||
          content.includes('service area') ||
          title.includes('where do you operate') ||
          content.includes('where do you operate')
        ) {
          localStorage.setItem(
            'task8_serviceAreaFAQArticleViewed',
            String(article.articleId)
          );
        }

        // Cancellation related article viewed
        if (
          title.includes('cancellation policy') ||
          content.includes('cancellation policy') ||
          title.includes('cancellation') ||
          content.includes('cancellation')
        ) {
          localStorage.setItem(
            'task8_cancellationFAQArticleViewed',
            String(article.articleId)
          );
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {}
    }

    return {
      article
    };
  }

  // sendContactFormMessage(subject, name, email, phone, message)
  sendContactFormMessage(subject, name, email, phone, message) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const id = this._generateId('contact');
    const now = new Date().toISOString();

    const submission = {
      id,
      subject,
      name,
      email,
      phone: phone || null,
      message,
      createdAt: now
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      submissionId: id,
      message: 'Contact form submitted.'
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const services = this._getFromStorage('services');
    const plans = this._getFromStorage('maintenance_plans');
    const projects = this._getFromStorage('projects');

    const allRatings = [
      ...services.filter((s) => s.rating).map((s) => s.rating),
      ...plans.filter((p) => p.rating).map((p) => p.rating)
    ];
    const customerSatisfactionRating = allRatings.length
      ? allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length
      : 0;

    return {
      headline: 'About Our Landscaping Services',
      subheadline: 'Local, reliable, and detail-focused lawn and landscape care.',
      body:
        'We provide lawn care, seasonal cleanups, and custom landscape design for residential and commercial properties. All content and pricing on this site comes directly from the services and plans stored in the system, so what you see is always current.',
      yearsInBusiness: 0,
      certifications: [],
      customerSatisfactionRating,
      testimonialSnippets: []
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