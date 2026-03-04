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

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    const tableKeys = [
      'service_categories',
      'services',
      'service_options',
      'plumbers',
      'plans',
      'coupons',
      'visit_options',
      'bookings',
      'quote_requests',
      'zip_coverages',
      'estimates',
      'estimate_items',
      'faq_articles',
      'carts',
      'cart_items',
      'orders',
      'saved_quotes',
      'bundle_requests',
      'bundle_items',
      // Config/meta tables
      'home_page_config',
      'about_info'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        // Config tables default to object, others to array
        if (key === 'home_page_config' || key === 'about_info') {
          localStorage.setItem(key, JSON.stringify({}));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Current workspace identifiers (cart, estimate, bundle) are optional
    if (!localStorage.getItem('currentCartId')) {
      localStorage.setItem('currentCartId', '');
    }
    if (!localStorage.getItem('currentEstimateId')) {
      localStorage.setItem('currentEstimateId', '');
    }
    if (!localStorage.getItem('currentBundleRequestId')) {
      localStorage.setItem('currentBundleRequestId', '');
    }

    // Seed core catalog data needed for higher-level flows if missing
    const services = this._getFromStorage('services', []);
    const serviceOptions = this._getFromStorage('service_options', []);

    const ensureService = (svc) => {
      if (!services.find(s => s.id === svc.id)) {
        services.push(svc);
      }
    };

    const ensureOption = (opt) => {
      if (!serviceOptions.find(o => o.id === opt.id)) {
        serviceOptions.push(opt);
      }
    };

    // Core services
    ensureService({
      id: 'standard_drain_cleaning',
      name: 'Standard Drain Cleaning',
      categoryId: 'drain_cleaning',
      slug: 'standard-drain-cleaning',
      shortDescription: 'Non-emergency standard drain cleaning service.',
      longDescription: '',
      isInstallService: false,
      isRepairService: true,
      isBookable: true,
      isQuotedOnly: false,
      defaultDurationMinutes: 60,
      isActive: true
    });

    ensureService({
      id: 'bathroom_remodel_consultation',
      name: 'Bathroom Remodel Consultation',
      categoryId: 'bathroom_services',
      slug: 'bathroom-remodel-consultation',
      shortDescription: 'Planning consultation for bathroom remodel projects.',
      longDescription: '',
      isInstallService: false,
      isRepairService: false,
      isBookable: true,
      isQuotedOnly: false,
      defaultDurationMinutes: 90,
      isActive: true
    });

    ensureService({
      id: 'basic_sewer_line_inspection',
      name: 'Basic Sewer Line Inspection',
      categoryId: 'sewer_and_main_line',
      slug: 'basic-sewer-line-inspection',
      shortDescription: 'Basic camera inspection of the main sewer line.',
      longDescription: '',
      isInstallService: false,
      isRepairService: false,
      isBookable: true,
      isQuotedOnly: false,
      defaultDurationMinutes: 90,
      isActive: true
    });

    ensureService({
      id: 'standard_toilet_installation',
      name: 'Standard Toilet Installation',
      categoryId: 'toilet_installation',
      slug: 'standard-toilet-installation',
      shortDescription: 'Standard toilet installation service.',
      longDescription: '',
      isInstallService: true,
      isRepairService: false,
      isBookable: true,
      isQuotedOnly: false,
      defaultDurationMinutes: 90,
      isActive: true
    });

    ensureService({
      id: 'garbage_disposal_installation',
      name: 'Garbage Disposal Installation',
      categoryId: 'kitchen_plumbing',
      slug: 'garbage-disposal-installation',
      shortDescription: 'Installation of a new garbage disposal.',
      longDescription: '',
      isInstallService: true,
      isRepairService: false,
      isBookable: true,
      isQuotedOnly: false,
      defaultDurationMinutes: 90,
      isActive: true
    });

    ensureService({
      id: 'faucet_replacement',
      name: 'Faucet Replacement',
      categoryId: 'bathroom_services',
      slug: 'faucet-replacement',
      shortDescription: 'Replacement of an existing faucet.',
      longDescription: '',
      isInstallService: true,
      isRepairService: false,
      isBookable: true,
      isQuotedOnly: false,
      defaultDurationMinutes: 60,
      isActive: true
    });

    // Core service options
    ensureOption({
      id: 'opt_drain_cleaning_basic',
      serviceId: 'standard_drain_cleaning',
      name: 'Basic Drain Cleaning',
      shortName: 'Basic Drain',
      categoryId: 'drain_cleaning',
      tier: 'basic',
      price: 250,
      callOutFee: 0,
      minPrice: 200,
      maxPrice: 300,
      isEmergencyEligible: false,
      isSameDayEligible: true,
      isConsultationOption: false,
      warrantyLaborYears: 0,
      warrantyPartsYears: 0,
      description: 'Basic non-emergency drain cleaning service.',
      features: [],
      isDrainCleaningOption: true,
      requiresQuoteRequest: false,
      status: 'active'
    });

    ensureOption({
      id: 'opt_basic_sewer_inspection',
      serviceId: 'basic_sewer_line_inspection',
      name: 'Basic Sewer Line Inspection',
      shortName: 'Basic Sewer Inspection',
      categoryId: 'sewer_and_main_line',
      tier: 'basic',
      price: 350,
      callOutFee: 0,
      minPrice: 300,
      maxPrice: 450,
      isEmergencyEligible: false,
      isSameDayEligible: false,
      isConsultationOption: false,
      warrantyLaborYears: 0,
      warrantyPartsYears: 0,
      description: 'Entry-level video inspection of the main sewer line.',
      features: [],
      isDrainCleaningOption: false,
      requiresQuoteRequest: false,
      status: 'active'
    });

    ensureOption({
      id: 'opt_bathroom_remodel_consult_morning',
      serviceId: 'bathroom_remodel_consultation',
      name: 'Bathroom Remodel Consultation - Morning',
      shortName: 'Morning Remodel Consult',
      categoryId: 'bathroom_services',
      tier: 'standard',
      price: 0,
      callOutFee: 0,
      minPrice: 0,
      maxPrice: 0,
      isEmergencyEligible: false,
      isSameDayEligible: false,
      isConsultationOption: true,
      warrantyLaborYears: 0,
      warrantyPartsYears: 0,
      description: 'In-home bathroom remodel planning consultation.',
      features: [],
      isDrainCleaningOption: false,
      requiresQuoteRequest: false,
      status: 'active'
    });

    ensureOption({
      id: 'opt_toilet_install_standard',
      serviceId: 'standard_toilet_installation',
      name: 'Standard Toilet Installation',
      shortName: 'Standard Toilet',
      categoryId: 'toilet_installation',
      tier: 'standard',
      price: 450,
      callOutFee: 0,
      minPrice: 400,
      maxPrice: 500,
      isEmergencyEligible: false,
      isSameDayEligible: false,
      isConsultationOption: false,
      warrantyLaborYears: 1,
      warrantyPartsYears: 1,
      description: 'Standard toilet installation package.',
      features: [],
      isDrainCleaningOption: false,
      requiresQuoteRequest: false,
      status: 'active'
    });

    ensureOption({
      id: 'opt_toilet_install_premium',
      serviceId: 'standard_toilet_installation',
      name: 'Premium Toilet Installation',
      shortName: 'Premium Toilet',
      categoryId: 'toilet_installation',
      tier: 'premium',
      price: 550,
      callOutFee: 0,
      minPrice: 500,
      maxPrice: 600,
      isEmergencyEligible: false,
      isSameDayEligible: false,
      isConsultationOption: false,
      warrantyLaborYears: 3,
      warrantyPartsYears: 3,
      description: 'Premium toilet installation package with extended labor warranty.',
      features: [],
      isDrainCleaningOption: false,
      requiresQuoteRequest: false,
      status: 'active'
    });

    ensureOption({
      id: 'opt_faucet_replacement_basic',
      serviceId: 'faucet_replacement',
      name: 'Basic Faucet Replacement',
      shortName: 'Basic Faucet',
      categoryId: 'bathroom_services',
      tier: 'basic',
      price: 200,
      callOutFee: 0,
      minPrice: 180,
      maxPrice: 250,
      isEmergencyEligible: false,
      isSameDayEligible: false,
      isConsultationOption: false,
      warrantyLaborYears: 1,
      warrantyPartsYears: 1,
      description: 'Replacement of an existing standard faucet.',
      features: [],
      isDrainCleaningOption: false,
      requiresQuoteRequest: false,
      status: 'active'
    });

    ensureOption({
      id: 'opt_disposal_install_basic',
      serviceId: 'garbage_disposal_installation',
      name: 'Basic Garbage Disposal Installation',
      shortName: 'Basic Disposal Install',
      categoryId: 'kitchen_plumbing',
      tier: 'basic',
      price: 300,
      callOutFee: 0,
      minPrice: 280,
      maxPrice: 350,
      isEmergencyEligible: false,
      isSameDayEligible: false,
      isConsultationOption: false,
      warrantyLaborYears: 1,
      warrantyPartsYears: 1,
      description: 'Installation of a standard garbage disposal.',
      features: [],
      isDrainCleaningOption: false,
      requiresQuoteRequest: false,
      status: 'active'
    });

    this._saveToStorage('services', services);
    this._saveToStorage('service_options', serviceOptions);
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
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

  _nowISO() {
    return new Date().toISOString();
  }

  _normalizeDateOnly(dateString) {
    if (!dateString) return null;
    // If it's already a simple date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  _findById(list, id) {
    if (!Array.isArray(list)) return null;
    return list.find(item => item && item.id === id) || null;
  }

  // -------------------- Helper Workspaces --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let currentCartId = localStorage.getItem('currentCartId') || '';
    let cart = carts.find(c => c.id === currentCartId) || null;

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._nowISO(),
        updatedAt: null
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('currentCartId', cart.id);
    }

    return cart;
  }

  _getOrCreateEstimate() {
    let estimates = this._getFromStorage('estimates', []);
    let currentEstimateId = localStorage.getItem('currentEstimateId') || '';
    let estimate = estimates.find(e => e.id === currentEstimateId) || null;

    if (!estimate) {
      estimate = {
        id: this._generateId('estimate'),
        label: null,
        itemsCount: 0,
        totalEstimatedPrice: 0,
        isSaved: false,
        createdAt: this._nowISO(),
        updatedAt: null
      };
      estimates.push(estimate);
      this._saveToStorage('estimates', estimates);
      localStorage.setItem('currentEstimateId', estimate.id);
    }

    return estimate;
  }

  _getOrCreateBundleRequest() {
    let bundleRequests = this._getFromStorage('bundle_requests', []);
    let currentBundleRequestId = localStorage.getItem('currentBundleRequestId') || '';
    let bundleRequest = bundleRequests.find(b => b.id === currentBundleRequestId) || null;

    if (!bundleRequest) {
      bundleRequest = {
        id: this._generateId('bundle'),
        budgetLimit: null,
        totalEstimatedPrice: 0,
        isWithinBudget: null,
        status: 'draft',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        createdAt: this._nowISO()
      };
      bundleRequests.push(bundleRequest);
      this._saveToStorage('bundle_requests', bundleRequests);
      localStorage.setItem('currentBundleRequestId', bundleRequest.id);
    }

    return bundleRequest;
  }

  // -------------------- Foreign key resolution helpers --------------------

  _resolveServiceCategoryBySlug(slug) {
    const categories = this._getFromStorage('service_categories', []);
    return categories.find(c => c.slug === slug) || null;
  }

  _resolveServiceById(id) {
    const services = this._getFromStorage('services', []);
    return services.find(s => s.id === id) || null;
  }

  _resolveServiceOptionById(id) {
    const options = this._getFromStorage('service_options', []);
    return options.find(o => o.id === id) || null;
  }

  _resolvePlumberById(id) {
    const plumbers = this._getFromStorage('plumbers', []);
    return plumbers.find(p => p.id === id) || null;
  }

  _resolvePlanById(id) {
    const plans = this._getFromStorage('plans', []);
    return plans.find(p => p.id === id) || null;
  }

  _resolveCouponById(id) {
    const coupons = this._getFromStorage('coupons', []);
    return coupons.find(c => c.id === id) || null;
  }

  _resolveEstimateById(id) {
    const estimates = this._getFromStorage('estimates', []);
    return estimates.find(e => e.id === id) || null;
  }

  _resolveBundleRequestById(id) {
    const bundles = this._getFromStorage('bundle_requests', []);
    return bundles.find(b => b.id === id) || null;
  }

  // -------------------- Interface Implementations --------------------

  // getHomePageContent()
  getHomePageContent() {
    const homeConfig = this._getFromStorage('home_page_config', {});

    const categories = this._getFromStorage('service_categories', []);
    const services = this._getFromStorage('services', []);
    const coupons = this._getFromStorage('coupons', []);
    const plans = this._getFromStorage('plans', []);

    const featuredCategories = categories
      .slice()
      .sort((a, b) => {
        const ao = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const bo = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        return ao - bo;
      })
      .map(c => ({
        categoryId: c.id,
        categoryName: c.name,
        categorySlug: c.slug,
        description: c.description || '',
        sortOrder: c.sortOrder || 0
      }));

    const featuredServices = services
      .filter(s => s.isActive)
      .map(s => {
        const category = this._resolveServiceCategoryBySlug(s.categoryId);
        return {
          serviceId: s.id,
          serviceName: s.name,
          slug: s.slug || '',
          shortDescription: s.shortDescription || '',
          categorySlug: s.categoryId,
          categoryName: category ? category.name : '',
          isInstallService: !!s.isInstallService,
          isRepairService: !!s.isRepairService,
          isBookable: !!s.isBookable,
          isQuotedOnly: !!s.isQuotedOnly,
          icon: s.icon || ''
        };
      });

    const now = new Date();

    const topCoupons = coupons
      .filter(c => c.isActive)
      .filter(c => {
        // Filter by validity dates if present
        const start = c.startDate ? new Date(c.startDate) : null;
        const end = c.expirationDate ? new Date(c.expirationDate) : null;
        if (start && now < start) return false;
        if (end && now > end) return false;
        return true;
      })
      .sort((a, b) => {
        const ad = a.expirationDate ? new Date(a.expirationDate) : new Date('9999-12-31');
        const bd = b.expirationDate ? new Date(b.expirationDate) : new Date('9999-12-31');
        return ad - bd;
      })
      .map(c => {
        const categorySlugs = Array.isArray(c.applicableCategoryIds) ? c.applicableCategoryIds : [];
        const categoryNames = categories
          .filter(cat => categorySlugs.includes(cat.slug))
          .map(cat => cat.name);
        return {
          couponId: c.id,
          code: c.code,
          name: c.name,
          discountType: c.discountType,
          discountValue: c.discountValue,
          maxDiscountAmount: c.maxDiscountAmount || null,
          applicableCategoryNames: categoryNames,
          shortDescription: c.description || '',
          expirationDate: c.expirationDate || null
        };
      });

    const topPlans = plans
      .filter(p => p.status === 'active')
      .map(p => ({
        planId: p.id,
        name: p.name,
        priceAnnual: p.priceAnnual,
        includesDrainCleaningVisitsPerYear: p.includesDrainCleaningVisitsPerYear || 0
      }));

    const quickLinks = Array.isArray(homeConfig.quickLinks) ? homeConfig.quickLinks : [];

    return {
      emergencyContact: {
        phone: homeConfig.emergencyContact && homeConfig.emergencyContact.phone ? homeConfig.emergencyContact.phone : '',
        label: homeConfig.emergencyContact && homeConfig.emergencyContact.label ? homeConfig.emergencyContact.label : '',
        hours: homeConfig.emergencyContact && homeConfig.emergencyContact.hours ? homeConfig.emergencyContact.hours : '',
        note: homeConfig.emergencyContact && homeConfig.emergencyContact.note ? homeConfig.emergencyContact.note : ''
      },
      featuredCategories,
      featuredServices,
      topCoupons,
      topPlans,
      quickLinks
    };
  }

  // getPrimaryServiceCategories()
  getPrimaryServiceCategories() {
    const categories = this._getFromStorage('service_categories', []);
    // Return as stored; ServiceCategory has no foreign keys
    return categories.slice();
  }

  // getServicesByCategory(categorySlug)
  getServicesByCategory(categorySlug) {
    const categories = this._getFromStorage('service_categories', []);
    const services = this._getFromStorage('services', []);

    const category = categories.find(c => c.slug === categorySlug) || null;

    return services
      .filter(s => s.isActive && s.categoryId === categorySlug)
      .map(s => ({
        serviceId: s.id,
        serviceName: s.name,
        slug: s.slug || '',
        shortDescription: s.shortDescription || '',
        categorySlug: s.categoryId,
        categoryName: category ? category.name : '',
        isInstallService: !!s.isInstallService,
        isRepairService: !!s.isRepairService,
        isBookable: !!s.isBookable,
        isQuotedOnly: !!s.isQuotedOnly,
        icon: s.icon || ''
      }));
  }

  // getServiceListingFilters(categorySlug, serviceId)
  getServiceListingFilters(categorySlug, serviceId) {
    const options = this._getFromStorage('service_options', []);

    let filtered = options.filter(o => o.status === 'active' && o.categoryId === categorySlug);
    if (serviceId) {
      filtered = filtered.filter(o => o.serviceId === serviceId);
    }

    const prices = filtered
      .map(o => (typeof o.price === 'number' ? o.price : (typeof o.minPrice === 'number' ? o.minPrice : null)))
      .filter(v => v !== null);

    const warrantyValues = filtered
      .map(o => (typeof o.warrantyLaborYears === 'number' ? o.warrantyLaborYears : null))
      .filter(v => v !== null);

    const supportsPriceRange = prices.length > 0;
    const priceMin = supportsPriceRange ? Math.min.apply(null, prices) : 0;
    const priceMax = supportsPriceRange ? Math.max.apply(null, prices) : 0;

    const supportsWarrantyLaborYears = warrantyValues.length > 0;
    const warrantyLaborMin = supportsWarrantyLaborYears ? Math.min.apply(null, warrantyValues) : 0;
    const warrantyLaborMax = supportsWarrantyLaborYears ? Math.max.apply(null, warrantyValues) : 0;

    const supportsSameDay = filtered.some(o => !!o.isSameDayEligible);
    const supportsEmergency = filtered.some(o => !!o.isEmergencyEligible);

    const sortOptions = [];
    if (supportsPriceRange) {
      sortOptions.push(
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' }
      );
    }
    if (supportsWarrantyLaborYears) {
      sortOptions.push({ value: 'warranty_longest_first', label: 'Warranty: Longest First' });
    }

    const featureFilters = [];
    if (supportsWarrantyLaborYears && warrantyLaborMax >= 5) {
      featureFilters.push({ key: 'warranty_5_plus_years', label: '5+ year labor warranty' });
    }

    return {
      supportsPriceRange,
      priceMin,
      priceMax,
      supportsWarrantyLaborYears,
      warrantyLaborMin,
      warrantyLaborMax,
      supportsSameDay,
      supportsEmergency,
      sortOptions,
      featureFilters
    };
  }

  // getServiceOptionsForListing(categorySlug, serviceId, filters, sortBy)
  getServiceOptionsForListing(categorySlug, serviceId, filters, sortBy) {
    const categories = this._getFromStorage('service_categories', []);
    const services = this._getFromStorage('services', []);
    const options = this._getFromStorage('service_options', []);

    let list = options.filter(o => o.status === 'active' && o.categoryId === categorySlug);
    if (serviceId) {
      list = list.filter(o => o.serviceId === serviceId);
    }

    filters = filters || {};

    if (typeof filters.minPrice === 'number') {
      list = list.filter(o => {
        const price = typeof o.price === 'number' ? o.price : (typeof o.minPrice === 'number' ? o.minPrice : null);
        return price === null ? false : price >= filters.minPrice;
      });
    }
    if (typeof filters.maxPrice === 'number') {
      list = list.filter(o => {
        const price = typeof o.price === 'number' ? o.price : (typeof o.minPrice === 'number' ? o.minPrice : null);
        return price === null ? false : price <= filters.maxPrice;
      });
    }
    if (typeof filters.minWarrantyLaborYears === 'number') {
      list = list.filter(o => typeof o.warrantyLaborYears === 'number' && o.warrantyLaborYears >= filters.minWarrantyLaborYears);
    }
    if (typeof filters.isSameDayEligible === 'boolean') {
      list = list.filter(o => !!o.isSameDayEligible === filters.isSameDayEligible);
    }
    if (typeof filters.isEmergencyEligible === 'boolean') {
      list = list.filter(o => !!o.isEmergencyEligible === filters.isEmergencyEligible);
    }
    if (typeof filters.requiresQuoteRequest === 'boolean') {
      list = list.filter(o => !!o.requiresQuoteRequest === filters.requiresQuoteRequest);
    }

    if (sortBy === 'price_low_to_high') {
      list.sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : (typeof a.minPrice === 'number' ? a.minPrice : Number.MAX_VALUE);
        const bp = typeof b.price === 'number' ? b.price : (typeof b.minPrice === 'number' ? b.minPrice : Number.MAX_VALUE);
        return ap - bp;
      });
    } else if (sortBy === 'price_high_to_low') {
      list.sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : (typeof a.minPrice === 'number' ? a.minPrice : 0);
        const bp = typeof b.price === 'number' ? b.price : (typeof b.minPrice === 'number' ? b.minPrice : 0);
        return bp - ap;
      });
    } else if (sortBy === 'warranty_longest_first') {
      list.sort((a, b) => {
        const aw = typeof a.warrantyLaborYears === 'number' ? a.warrantyLaborYears : 0;
        const bw = typeof b.warrantyLaborYears === 'number' ? b.warrantyLaborYears : 0;
        return bw - aw;
      });
    }

    return list.map(o => {
      const service = services.find(s => s.id === o.serviceId) || null;
      const category = categories.find(c => c.slug === o.categoryId) || null;
      const dto = {
        serviceOptionId: o.id,
        name: o.name,
        shortName: o.shortName || '',
        description: o.description || '',
        categorySlug: o.categoryId,
        categoryName: category ? category.name : '',
        serviceId: o.serviceId,
        serviceName: service ? service.name : '',
        tier: o.tier || null,
        price: typeof o.price === 'number' ? o.price : null,
        minPrice: typeof o.minPrice === 'number' ? o.minPrice : null,
        maxPrice: typeof o.maxPrice === 'number' ? o.maxPrice : null,
        callOutFee: typeof o.callOutFee === 'number' ? o.callOutFee : null,
        isEmergencyEligible: !!o.isEmergencyEligible,
        isSameDayEligible: !!o.isSameDayEligible,
        isConsultationOption: !!o.isConsultationOption,
        warrantyLaborYears: typeof o.warrantyLaborYears === 'number' ? o.warrantyLaborYears : null,
        warrantyPartsYears: typeof o.warrantyPartsYears === 'number' ? o.warrantyPartsYears : null,
        features: Array.isArray(o.features) ? o.features : [],
        requiresQuoteRequest: !!o.requiresQuoteRequest
      };
      // Foreign key resolution: include service object
      dto.service = service;
      return dto;
    });
  }

  // getServiceDetail(serviceId)
  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);
    const options = this._getFromStorage('service_options', []);

    const service = services.find(s => s.id === serviceId) || null;
    if (!service) {
      return { service: null, options: [], recommendedActions: [] };
    }

    const category = categories.find(c => c.slug === service.categoryId) || null;

    const serviceDto = {
      id: service.id,
      name: service.name,
      slug: service.slug || '',
      categorySlug: service.categoryId,
      categoryName: category ? category.name : '',
      shortDescription: service.shortDescription || '',
      longDescription: service.longDescription || '',
      isInstallService: !!service.isInstallService,
      isRepairService: !!service.isRepairService,
      isBookable: !!service.isBookable,
      isQuotedOnly: !!service.isQuotedOnly,
      defaultDurationMinutes: service.defaultDurationMinutes || null
    };

    const optionDtos = options
      .filter(o => o.status === 'active' && o.serviceId === service.id)
      .map(o => ({
        serviceOptionId: o.id,
        name: o.name,
        tier: o.tier || null,
        price: typeof o.price === 'number' ? o.price : null,
        minPrice: typeof o.minPrice === 'number' ? o.minPrice : null,
        maxPrice: typeof o.maxPrice === 'number' ? o.maxPrice : null,
        warrantyLaborYears: typeof o.warrantyLaborYears === 'number' ? o.warrantyLaborYears : null,
        warrantyPartsYears: typeof o.warrantyPartsYears === 'number' ? o.warrantyPartsYears : null,
        features: Array.isArray(o.features) ? o.features : [],
        isEmergencyEligible: !!o.isEmergencyEligible,
        isSameDayEligible: !!o.isSameDayEligible,
        isConsultationOption: !!o.isConsultationOption,
        requiresQuoteRequest: !!o.requiresQuoteRequest
      }));

    const recommendedActions = [];
    if (service.isBookable) {
      recommendedActions.push({ actionType: 'book_now', label: 'Book Now' });
    }
    const hasQuoteOnly = service.isQuotedOnly || optionDtos.some(o => o.requiresQuoteRequest);
    if (hasQuoteOnly) {
      recommendedActions.push({ actionType: 'request_quote', label: 'Request Quote' });
    }

    return {
      service: serviceDto,
      options: optionDtos,
      recommendedActions
    };
  }

  // getServiceOptionDetail(serviceOptionId)
  getServiceOptionDetail(serviceOptionId) {
    const options = this._getFromStorage('service_options', []);
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);

    const option = options.find(o => o.id === serviceOptionId) || null;
    if (!option) {
      return {
        serviceOptionId: null,
        name: '',
        shortName: '',
        description: '',
        tier: null,
        price: null,
        minPrice: null,
        maxPrice: null,
        warrantyLaborYears: null,
        warrantyPartsYears: null,
        features: [],
        serviceId: null,
        serviceName: '',
        categorySlug: '',
        categoryName: '',
        isEmergencyEligible: false,
        isSameDayEligible: false,
        isConsultationOption: false,
        requiresQuoteRequest: false
      };
    }

    const service = services.find(s => s.id === option.serviceId) || null;
    const category = categories.find(c => c.slug === option.categoryId) || null;

    const dto = {
      serviceOptionId: option.id,
      name: option.name,
      shortName: option.shortName || '',
      description: option.description || '',
      tier: option.tier || null,
      price: typeof option.price === 'number' ? option.price : null,
      minPrice: typeof option.minPrice === 'number' ? option.minPrice : null,
      maxPrice: typeof option.maxPrice === 'number' ? option.maxPrice : null,
      warrantyLaborYears: typeof option.warrantyLaborYears === 'number' ? option.warrantyLaborYears : null,
      warrantyPartsYears: typeof option.warrantyPartsYears === 'number' ? option.warrantyPartsYears : null,
      features: Array.isArray(option.features) ? option.features : [],
      serviceId: option.serviceId || null,
      serviceName: service ? service.name : '',
      categorySlug: option.categoryId,
      categoryName: category ? category.name : '',
      isEmergencyEligible: !!option.isEmergencyEligible,
      isSameDayEligible: !!option.isSameDayEligible,
      isConsultationOption: !!option.isConsultationOption,
      requiresQuoteRequest: !!option.requiresQuoteRequest
    };

    // Foreign key resolution
    dto.service = service;
    dto.category = category;

    return dto;
  }

  // submitQuoteRequest(serviceOptionId, description, contactName, contactEmail, contactPhone)
  submitQuoteRequest(serviceOptionId, description, contactName, contactEmail, contactPhone) {
    const serviceOption = this._resolveServiceOptionById(serviceOptionId);
    if (!serviceOption) {
      return {
        quoteRequest: null,
        message: 'Invalid service option.'
      };
    }

    const quoteRequests = this._getFromStorage('quote_requests', []);

    const quoteRequest = {
      id: this._generateId('quote'),
      serviceId: serviceOption.serviceId || null,
      serviceOptionId: serviceOptionId,
      sourcePage: 'service_detail',
      description: description || '',
      contactName,
      contactEmail,
      contactPhone: contactPhone || '',
      status: 'open',
      createdAt: this._nowISO()
    };

    quoteRequests.push(quoteRequest);
    this._saveToStorage('quote_requests', quoteRequests);

    const service = this._resolveServiceById(quoteRequest.serviceId);

    const enriched = Object.assign({}, quoteRequest, {
      service: service || null,
      serviceOption: serviceOption
    });

    return {
      quoteRequest: enriched,
      message: 'Quote request submitted.'
    };
  }

  // addServiceOptionToEstimate(serviceOptionId, quantity = 1, notes)
  addServiceOptionToEstimate(serviceOptionId, quantity, notes) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      quantity = 1;
    }
    const estimate = this._getOrCreateEstimate();
    const estimateItems = this._getFromStorage('estimate_items', []);
    const serviceOption = this._resolveServiceOptionById(serviceOptionId);

    if (!serviceOption) {
      return {
        estimate,
        items: [],
        message: 'Invalid service option.'
      };
    }

    const unitPrice = typeof serviceOption.price === 'number'
      ? serviceOption.price
      : (typeof serviceOption.minPrice === 'number' ? serviceOption.minPrice : 0);

    let existing = estimateItems.find(i => i.estimateId === estimate.id && i.serviceOptionId === serviceOptionId);
    if (existing) {
      existing.quantity += quantity;
      existing.estimatedPrice = unitPrice * existing.quantity;
      if (notes) {
        existing.notes = notes;
      }
    } else {
      existing = {
        id: this._generateId('estimate_item'),
        estimateId: estimate.id,
        serviceId: serviceOption.serviceId || null,
        serviceOptionId: serviceOptionId,
        quantity,
        estimatedPrice: unitPrice * quantity,
        notes: notes || ''
      };
      estimateItems.push(existing);
    }

    // Recalculate estimate totals
    const relatedItems = estimateItems.filter(i => i.estimateId === estimate.id);
    estimate.itemsCount = relatedItems.length;
    estimate.totalEstimatedPrice = relatedItems.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);
    estimate.updatedAt = this._nowISO();

    // Persist
    const estimates = this._getFromStorage('estimates', []);
    const idx = estimates.findIndex(e => e.id === estimate.id);
    if (idx >= 0) {
      estimates[idx] = estimate;
      this._saveToStorage('estimates', estimates);
    }
    this._saveToStorage('estimate_items', estimateItems);

    const services = this._getFromStorage('services', []);

    const enrichedItems = relatedItems.map(i => ({
      id: i.id,
      estimateId: i.estimateId,
      serviceId: i.serviceId,
      serviceOptionId: i.serviceOptionId,
      quantity: i.quantity,
      estimatedPrice: i.estimatedPrice,
      notes: i.notes || '',
      // Foreign key resolution
      estimate: estimate,
      service: services.find(s => s.id === i.serviceId) || null,
      serviceOption: serviceOption && i.serviceOptionId === serviceOption.id ? serviceOption : this._resolveServiceOptionById(i.serviceOptionId)
    }));

    return {
      estimate,
      items: enrichedItems,
      message: 'Service option added to estimate.'
    };
  }

  // saveServiceOptionQuote(serviceOptionId, deliveryMethod, email, label)
  saveServiceOptionQuote(serviceOptionId, deliveryMethod, email, label) {
    const serviceOption = this._resolveServiceOptionById(serviceOptionId);
    if (!serviceOption) {
      return {
        savedQuote: null,
        message: 'Invalid service option.'
      };
    }

    const savedQuotes = this._getFromStorage('saved_quotes', []);

    const savedQuote = {
      id: this._generateId('saved_quote'),
      serviceId: serviceOption.serviceId || null,
      serviceOptionId: serviceOptionId,
      email: deliveryMethod === 'email' ? (email || '') : '',
      label: label || '',
      deliveryMethod: deliveryMethod,
      createdAt: this._nowISO()
    };

    savedQuotes.push(savedQuote);
    this._saveToStorage('saved_quotes', savedQuotes);

    const service = this._resolveServiceById(savedQuote.serviceId);

    const enriched = Object.assign({}, savedQuote, {
      service: service || null,
      serviceOption: serviceOption
    });

    return {
      savedQuote: enriched,
      message: 'Quote saved.'
    };
  }

  // getBookingContext(serviceId, serviceOptionId, plumberId, bookingMode)
  getBookingContext(serviceId, serviceOptionId, plumberId, bookingMode) {
    const services = this._getFromStorage('services', []);
    const options = this._getFromStorage('service_options', []);
    const plumbers = this._getFromStorage('plumbers', []);

    let service = null;
    let serviceOption = null;
    let plumber = null;

    if (serviceOptionId) {
      serviceOption = options.find(o => o.id === serviceOptionId) || null;
      if (serviceOption && serviceOption.serviceId) {
        service = services.find(s => s.id === serviceOption.serviceId) || null;
      }
    }

    if (!service && serviceId) {
      service = services.find(s => s.id === serviceId) || null;
    }

    if (plumberId) {
      plumber = plumbers.find(p => p.id === plumberId) || null;
    }

    // If only a plumber is provided, try to infer a suitable service/option
    if (!serviceOption && plumber && Array.isArray(plumber.serviceOptionIds)) {
      const plumberOptions = options.filter(o => plumber.serviceOptionIds.includes(o.id));
      let inferredOption = null;

      if (bookingMode === 'consultation') {
        inferredOption = plumberOptions.find(o => !!o.isConsultationOption) || null;
      }

      if (!inferredOption) {
        inferredOption = plumberOptions[0] || null;
      }

      if (inferredOption) {
        serviceOption = inferredOption;
        if (!service && inferredOption.serviceId) {
          service = services.find(s => s.id === inferredOption.serviceId) || null;
        }
      }
    }

    let resolvedBookingMode = bookingMode || null;
    if (!resolvedBookingMode) {
      if (serviceOption && serviceOption.isConsultationOption) {
        resolvedBookingMode = 'consultation';
      } else if ((service && service.categoryId === 'emergency_services') || (serviceOption && serviceOption.isEmergencyEligible)) {
        resolvedBookingMode = 'emergency';
      } else {
        resolvedBookingMode = 'standard';
      }
    }

    const serviceDto = service
      ? {
          serviceId: service.id,
          serviceName: service.name,
          categorySlug: service.categoryId,
          categoryName: (this._resolveServiceCategoryBySlug(service.categoryId) || {}).name || ''
        }
      : null;

    const serviceOptionDto = serviceOption
      ? {
          serviceOptionId: serviceOption.id,
          name: serviceOption.name,
          tier: serviceOption.tier || null,
          price: typeof serviceOption.price === 'number' ? serviceOption.price : null,
          callOutFee: typeof serviceOption.callOutFee === 'number' ? serviceOption.callOutFee : null
        }
      : null;

    const plumberDto = plumber
      ? {
          plumberId: plumber.id,
          name: plumber.name,
          averageRating: plumber.averageRating,
          reviewCount: plumber.reviewCount
        }
      : null;

    return {
      resolvedBookingMode,
      service: serviceDto,
      serviceOption: serviceOptionDto,
      plumber: plumberDto
    };
  }

  // getAvailableVisitOptions(zipCode, serviceId, serviceOptionId, plumberId, date, bookingMode, isSameDay, isEmergency, maxCallOutFee, sortBy)
  getAvailableVisitOptions(zipCode, serviceId, serviceOptionId, plumberId, date, bookingMode, isSameDay, isEmergency, maxCallOutFee, sortBy) {
    const visitOptions = this._getFromStorage('visit_options', []);
    const services = this._getFromStorage('services', []);
    const serviceOptions = this._getFromStorage('service_options', []);
    const plumbers = this._getFromStorage('plumbers', []);

    const targetDate = this._normalizeDateOnly(date);

    let list = visitOptions.filter(v => v.zipCode === zipCode && v.serviceId === serviceId);

    if (serviceOptionId) {
      list = list.filter(v => v.serviceOptionId === serviceOptionId);
    }
    if (plumberId) {
      list = list.filter(v => v.plumberId === plumberId);
    }
    if (targetDate) {
      list = list.filter(v => this._normalizeDateOnly(v.date) === targetDate);
    }

    if (bookingMode === 'emergency' || isEmergency === true) {
      list = list.filter(v => !!v.isEmergency);
    }
    if (typeof isSameDay === 'boolean') {
      list = list.filter(v => !!v.isSameDay === isSameDay);
    }
    if (typeof maxCallOutFee === 'number') {
      list = list.filter(v => typeof v.callOutFee === 'number' && v.callOutFee <= maxCallOutFee);
    }

    if (sortBy === 'soonest_arrival') {
      list.sort((a, b) => {
        const ar = typeof a.estimatedArrivalRank === 'number' ? a.estimatedArrivalRank : Number.MAX_VALUE;
        const br = typeof b.estimatedArrivalRank === 'number' ? b.estimatedArrivalRank : Number.MAX_VALUE;
        if (ar !== br) return ar - br;
        const at = new Date(a.timeWindowStart).getTime();
        const bt = new Date(b.timeWindowStart).getTime();
        return at - bt;
      });
    } else if (sortBy === 'price_low_to_high') {
      list.sort((a, b) => (a.callOutFee || 0) - (b.callOutFee || 0));
    } else {
      // Default: by time window start
      list.sort((a, b) => {
        const at = new Date(a.timeWindowStart).getTime();
        const bt = new Date(b.timeWindowStart).getTime();
        return at - bt;
      });
    }

    return list.map(v => {
      const service = services.find(s => s.id === v.serviceId) || null;
      const option = serviceOptions.find(o => o.id === v.serviceOptionId) || null;
      const plumber = plumbers.find(p => p.id === v.plumberId) || null;

      return {
        visitOptionId: v.id,
        serviceId: v.serviceId,
        serviceName: service ? service.name : '',
        serviceOptionId: v.serviceOptionId || null,
        serviceOptionName: option ? option.name : '',
        plumberId: v.plumberId || null,
        plumberName: plumber ? plumber.name : '',
        zipCode: v.zipCode,
        date: v.date,
        timeWindowStart: v.timeWindowStart,
        timeWindowEnd: v.timeWindowEnd,
        timeWindowLabel: v.timeWindowLabel || '',
        callOutFee: v.callOutFee,
        estimatedArrivalRank: typeof v.estimatedArrivalRank === 'number' ? v.estimatedArrivalRank : null,
        isEmergency: !!v.isEmergency,
        isSameDay: !!v.isSameDay,
        availableCapacity: typeof v.availableCapacity === 'number' ? v.availableCapacity : null,
        // Foreign key resolution
        service,
        serviceOption: option,
        plumber,
        visitOption: v
      };
    });
  }

  // validateCouponCodeForService(couponCode, categorySlug, serviceId, serviceOptionId, orderAmount)
  validateCouponCodeForService(couponCode, categorySlug, serviceId, serviceOptionId, orderAmount) {
    const coupons = this._getFromStorage('coupons', []);
    const now = new Date();
    const normalizedCode = (couponCode || '').trim().toUpperCase();

    const coupon = coupons.find(c => (c.code || '').toUpperCase() === normalizedCode) || null;
    if (!coupon) {
      return {
        isValid: false,
        normalizedCode,
        message: 'Coupon not found.',
        discountType: null,
        discountValue: 0,
        discountAmount: 0,
        maxDiscountAmount: null
      };
    }

    if (!coupon.isActive) {
      return {
        isValid: false,
        normalizedCode: coupon.code,
        message: 'Coupon is inactive.',
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: 0,
        maxDiscountAmount: coupon.maxDiscountAmount || null
      };
    }

    const start = coupon.startDate ? new Date(coupon.startDate) : null;
    const end = coupon.expirationDate ? new Date(coupon.expirationDate) : null;
    if (start && now < start) {
      return {
        isValid: false,
        normalizedCode: coupon.code,
        message: 'Coupon not yet valid.',
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: 0,
        maxDiscountAmount: coupon.maxDiscountAmount || null
      };
    }
    if (end && now > end) {
      return {
        isValid: false,
        normalizedCode: coupon.code,
        message: 'Coupon has expired.',
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: 0,
        maxDiscountAmount: coupon.maxDiscountAmount || null
      };
    }

    // Check applicability by category/service/service option
    if (categorySlug && Array.isArray(coupon.applicableCategoryIds) && coupon.applicableCategoryIds.length > 0) {
      if (!coupon.applicableCategoryIds.includes(categorySlug)) {
        return {
          isValid: false,
          normalizedCode: coupon.code,
          message: 'Coupon not applicable for this category.',
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: 0,
          maxDiscountAmount: coupon.maxDiscountAmount || null
        };
      }
    }

    if (serviceId && Array.isArray(coupon.applicableServiceIds) && coupon.applicableServiceIds.length > 0) {
      if (!coupon.applicableServiceIds.includes(serviceId)) {
        return {
          isValid: false,
          normalizedCode: coupon.code,
          message: 'Coupon not applicable for this service.',
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: 0,
          maxDiscountAmount: coupon.maxDiscountAmount || null
        };
      }
    }

    if (serviceOptionId && Array.isArray(coupon.applicableServiceOptionIds) && coupon.applicableServiceOptionIds.length > 0) {
      if (!coupon.applicableServiceOptionIds.includes(serviceOptionId)) {
        return {
          isValid: false,
          normalizedCode: coupon.code,
          message: 'Coupon not applicable for this option.',
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: 0,
          maxDiscountAmount: coupon.maxDiscountAmount || null
        };
      }
    }

    if (typeof coupon.minOrderAmount === 'number' && typeof orderAmount === 'number') {
      if (orderAmount < coupon.minOrderAmount) {
        return {
          isValid: false,
          normalizedCode: coupon.code,
          message: 'Order amount is below coupon minimum.',
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: 0,
          maxDiscountAmount: coupon.maxDiscountAmount || null
        };
      }
    }

    let discountAmount = 0;
    if (typeof orderAmount === 'number' && orderAmount > 0) {
      if (coupon.discountType === 'percentage') {
        discountAmount = (orderAmount * coupon.discountValue) / 100;
      } else if (coupon.discountType === 'fixed_amount') {
        discountAmount = coupon.discountValue;
      }
      if (typeof coupon.maxDiscountAmount === 'number') {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
      if (discountAmount > orderAmount) {
        discountAmount = orderAmount;
      }
    }

    return {
      isValid: true,
      normalizedCode: coupon.code,
      message: 'Coupon applied.',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: discountAmount,
      maxDiscountAmount: coupon.maxDiscountAmount || null
    };
  }

  // createBooking(...)
  createBooking(
    serviceId,
    serviceOptionId,
    plumberId,
    visitOptionId,
    bookingMode,
    zipCode,
    addressLine1,
    addressLine2,
    city,
    state,
    appointmentDate,
    timeWindowStart,
    timeWindowEnd,
    isSameDay,
    maxPreferredCallOutFee,
    appliedCouponCode,
    contactName,
    contactPhone,
    contactEmail,
    projectDescription
  ) {
    const bookings = this._getFromStorage('bookings', []);

    const booking = {
      id: this._generateId('booking'),
      serviceId: serviceId,
      serviceOptionId: serviceOptionId || null,
      plumberId: plumberId || null,
      visitOptionId: visitOptionId || null,
      bookingMode: bookingMode,
      status: 'pending',
      zipCode: zipCode,
      addressLine1: addressLine1 || '',
      addressLine2: addressLine2 || '',
      city: city || '',
      state: state || '',
      appointmentDate: appointmentDate,
      timeWindowStart: timeWindowStart,
      timeWindowEnd: timeWindowEnd,
      isSameDay: !!isSameDay,
      maxPreferredCallOutFee: typeof maxPreferredCallOutFee === 'number' ? maxPreferredCallOutFee : null,
      appliedCouponCode: appliedCouponCode || '',
      contactName,
      contactPhone,
      contactEmail,
      projectDescription: projectDescription || '',
      createdAt: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    const service = this._resolveServiceById(serviceId);
    const serviceOption = serviceOptionId ? this._resolveServiceOptionById(serviceOptionId) : null;
    const plumber = plumberId ? this._resolvePlumberById(plumberId) : null;
    const visitOptions = this._getFromStorage('visit_options', []);
    const visitOption = visitOptionId ? visitOptions.find(v => v.id === visitOptionId) : null;

    const enriched = Object.assign({}, booking, {
      service: service || null,
      serviceOption: serviceOption,
      plumber: plumber,
      visitOption: visitOption || null
    });

    return {
      booking: enriched,
      message: 'Booking created.'
    };
  }

  // getPlanFilterOptions()
  getPlanFilterOptions() {
    const plans = this._getFromStorage('plans', []);
    const activePlans = plans.filter(p => p.status === 'active');

    if (activePlans.length === 0) {
      return {
        priceMin: 0,
        priceMax: 0,
        supportsDrainCleaningsFilter: false,
        drainCleaningVisitsMin: 0
      };
    }

    const prices = activePlans.map(p => p.priceAnnual || 0);
    const drainValues = activePlans
      .map(p => (typeof p.includesDrainCleaningVisitsPerYear === 'number' ? p.includesDrainCleaningVisitsPerYear : null))
      .filter(v => v !== null);

    const priceMin = Math.min.apply(null, prices);
    const priceMax = Math.max.apply(null, prices);
    const supportsDrainCleaningsFilter = drainValues.length > 0;
    const drainCleaningVisitsMin = supportsDrainCleaningsFilter ? Math.min.apply(null, drainValues) : 0;

    return {
      priceMin,
      priceMax,
      supportsDrainCleaningsFilter,
      drainCleaningVisitsMin
    };
  }

  // listPlans(filters)
  listPlans(filters) {
    const plans = this._getFromStorage('plans', []);
    filters = filters || {};

    const activePlans = plans.filter(p => p.status === 'active');

    const filtered = activePlans.filter(p => {
      if (typeof filters.maxAnnualPrice === 'number' && p.priceAnnual > filters.maxAnnualPrice) {
        return false;
      }
      if (typeof filters.minDrainCleaningsPerYear === 'number') {
        const visits = typeof p.includesDrainCleaningVisitsPerYear === 'number' ? p.includesDrainCleaningVisitsPerYear : 0;
        if (visits < filters.minDrainCleaningsPerYear) return false;
      }
      return true;
    });

    return filtered.map(p => ({
      planId: p.id,
      name: p.name,
      description: p.description || '',
      priceAnnual: p.priceAnnual,
      includesDrainCleaningVisitsPerYear: p.includesDrainCleaningVisitsPerYear || 0,
      includesPriorityScheduling: !!p.includesPriorityScheduling,
      includesEmergencyDiscount: !!p.includesEmergencyDiscount,
      // Foreign key-like resolution: include full plan for convenience
      plan: p
    }));
  }

  // getPlanDetail(planId)
  getPlanDetail(planId) {
    const plans = this._getFromStorage('plans', []);
    const services = this._getFromStorage('services', []);

    const plan = plans.find(p => p.id === planId) || null;
    if (!plan) {
      return { plan: null, includedServices: [] };
    }

    const includedServices = Array.isArray(plan.includedServiceIds)
      ? services.filter(s => plan.includedServiceIds.includes(s.id))
      : [];

    return {
      plan,
      includedServices
    };
  }

  // addPlanToCart(planId, quantity = 1)
  addPlanToCart(planId, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      quantity = 1;
    }

    const plan = this._resolvePlanById(planId);
    if (!plan) {
      return {
        cart: null,
        items: [],
        message: 'Invalid plan.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = plan.priceAnnual || 0;
    let item = cartItems.find(i => i.cartId === cart.id && i.itemType === 'plan' && i.planId === planId);

    if (item) {
      item.quantity += quantity;
      item.lineTotal = item.quantity * unitPrice;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'plan',
        planId: planId,
        serviceId: null,
        serviceOptionId: null,
        quantity: quantity,
        unitPrice: unitPrice,
        lineTotal: unitPrice * quantity
      };
      cartItems.push(item);
    }

    cart.updatedAt = this._nowISO();
    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }
    this._saveToStorage('cart_items', cartItems);

    return this.getCartSummary();
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const plans = this._getFromStorage('plans', []);
    const services = this._getFromStorage('services', []);
    const serviceOptions = this._getFromStorage('service_options', []);

    const itemsForCart = cartItems.filter(i => i.cartId === cart.id);

    const totalAmount = itemsForCart.reduce((sum, i) => sum + (i.lineTotal || 0), 0);

    const enrichedItems = itemsForCart.map(i => ({
      id: i.id,
      cartId: i.cartId,
      itemType: i.itemType,
      planId: i.planId || null,
      serviceId: i.serviceId || null,
      serviceOptionId: i.serviceOptionId || null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      // Foreign key resolution
      cart: cart,
      plan: i.planId ? plans.find(p => p.id === i.planId) || null : null,
      service: i.serviceId ? services.find(s => s.id === i.serviceId) || null : null,
      serviceOption: i.serviceOptionId ? serviceOptions.find(o => o.id === i.serviceOptionId) || null : null
    }));

    return {
      cart,
      items: enrichedItems,
      totalAmount
    };
  }

  // submitCheckout(orderType, contactName, contactPhone, contactEmail, serviceAddressLine1, serviceAddressLine2, city, state, zipCode, paymentMethod)
  submitCheckout(orderType, contactName, contactPhone, contactEmail, serviceAddressLine1, serviceAddressLine2, city, state, zipCode, paymentMethod) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const orders = this._getFromStorage('orders', []);

    const itemsForCart = cartItems.filter(i => i.cartId === cart.id);

    const totalAmount = itemsForCart.reduce((sum, i) => sum + (i.lineTotal || 0), 0);

    const orderItems = itemsForCart.map(i => ({
      itemType: i.itemType,
      planId: i.planId || null,
      serviceId: i.serviceId || null,
      serviceOptionId: i.serviceOptionId || null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal
    }));

    const order = {
      id: this._generateId('order'),
      cartId: cart.id,
      orderType: orderType,
      status: 'pending',
      items: orderItems,
      contactName,
      contactPhone,
      contactEmail,
      serviceAddressLine1: serviceAddressLine1 || '',
      serviceAddressLine2: serviceAddressLine2 || '',
      city: city || '',
      state: state || '',
      zipCode: zipCode || '',
      paymentMethod: paymentMethod,
      totalAmount: totalAmount,
      createdAt: this._nowISO()
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    // Foreign key resolution: include cart in order
    const enrichedOrder = Object.assign({}, order, { cart: cart });

    return {
      order: enrichedOrder,
      message: 'Checkout submitted.'
    };
  }

  // listCoupons(filters)
  listCoupons(filters) {
    filters = filters || {};
    const coupons = this._getFromStorage('coupons', []);
    const categories = this._getFromStorage('service_categories', []);
    const now = new Date();

    let list = coupons.slice();

    const onlyActive = typeof filters.onlyActive === 'boolean' ? filters.onlyActive : true;
    if (onlyActive) {
      list = list.filter(c => c.isActive);
      list = list.filter(c => {
        const start = c.startDate ? new Date(c.startDate) : null;
        const end = c.expirationDate ? new Date(c.expirationDate) : null;
        if (start && now < start) return false;
        if (end && now > end) return false;
        return true;
      });
    }

    if (filters.categorySlug) {
      list = list.filter(c => {
        if (!Array.isArray(c.applicableCategoryIds) || c.applicableCategoryIds.length === 0) return false;
        return c.applicableCategoryIds.includes(filters.categorySlug);
      });
    }

    return list.map(c => {
      const applicableSlugs = Array.isArray(c.applicableCategoryIds) ? c.applicableCategoryIds : [];
      const applicableCategoryNames = categories
        .filter(cat => applicableSlugs.includes(cat.slug))
        .map(cat => cat.name);
      return {
        couponId: c.id,
        code: c.code,
        name: c.name,
        description: c.description || '',
        discountType: c.discountType,
        discountValue: c.discountValue,
        maxDiscountAmount: c.maxDiscountAmount || null,
        applicableCategorySlugs: applicableSlugs,
        applicableCategoryNames,
        startDate: c.startDate || null,
        expirationDate: c.expirationDate || null,
        isActive: !!c.isActive,
        coupon: c
      };
    });
  }

  // getCouponDetail(couponId)
  getCouponDetail(couponId) {
    const coupons = this._getFromStorage('coupons', []);
    const categories = this._getFromStorage('service_categories', []);
    const services = this._getFromStorage('services', []);
    const serviceOptions = this._getFromStorage('service_options', []);

    const coupon = coupons.find(c => c.id === couponId) || null;
    if (!coupon) {
      return {
        coupon: null,
        applicableCategories: [],
        applicableServices: [],
        applicableServiceOptions: []
      };
    }

    const applicableCategories = Array.isArray(coupon.applicableCategoryIds)
      ? categories.filter(cat => coupon.applicableCategoryIds.includes(cat.slug))
      : [];

    const applicableServices = Array.isArray(coupon.applicableServiceIds)
      ? services.filter(s => coupon.applicableServiceIds.includes(s.id))
      : [];

    const applicableServiceOptions = Array.isArray(coupon.applicableServiceOptionIds)
      ? serviceOptions.filter(o => coupon.applicableServiceOptionIds.includes(o.id))
      : [];

    return {
      coupon,
      applicableCategories,
      applicableServices,
      applicableServiceOptions
    };
  }

  // searchPlumbers(zipCode, specialization, radiusMiles, minRating, sortBy)
  searchPlumbers(zipCode, specialization, radiusMiles, minRating, sortBy) {
    const plumbers = this._getFromStorage('plumbers', []);
    const serviceOptions = this._getFromStorage('service_options', []);

    let list = plumbers.filter(p => {
      const coversZip = (Array.isArray(p.coverageZipCodes) && p.coverageZipCodes.includes(zipCode)) || p.primaryZip === zipCode;
      if (!coversZip) return false;

      if (typeof radiusMiles === 'number') {
        // Approximation: plumber's service radius must be at least the requested radius
        if (typeof p.serviceRadiusMiles === 'number' && p.serviceRadiusMiles < radiusMiles) {
          return false;
        }
      }

      if (typeof minRating === 'number' && typeof p.averageRating === 'number') {
        if (p.averageRating < minRating) return false;
      }

      if (specialization && Array.isArray(p.specializations) && p.specializations.length > 0) {
        if (!p.specializations.includes(specialization)) return false;
      } else if (specialization && (!p.specializations || p.specializations.length === 0)) {
        // If plumber has no specialization listed, treat as not matching specific filter
        return false;
      }

      return true;
    });

    if (sortBy === 'rating_high_to_low') {
      list.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else if (sortBy === 'distance_low_to_high') {
      // Without coordinates, approximate by serviceRadiusMiles ascending
      list.sort((a, b) => (a.serviceRadiusMiles || 0) - (b.serviceRadiusMiles || 0));
    }

    return list.map(p => ({
      id: p.id,
      name: p.name,
      primaryZip: p.primaryZip,
      serviceRadiusMiles: p.serviceRadiusMiles,
      coverageZipCodes: Array.isArray(p.coverageZipCodes) ? p.coverageZipCodes : [],
      specializations: Array.isArray(p.specializations) ? p.specializations : [],
      averageRating: p.averageRating,
      reviewCount: p.reviewCount,
      yearsOfExperience: p.yearsOfExperience || null,
      bio: p.bio || '',
      phone: p.phone || '',
      email: p.email || '',
      isEmergencyAvailable: !!p.isEmergencyAvailable,
      serviceOptionIds: Array.isArray(p.serviceOptionIds) ? p.serviceOptionIds : [],
      // Foreign key resolution: service options
      serviceOptions: Array.isArray(p.serviceOptionIds)
        ? p.serviceOptionIds.map(id => serviceOptions.find(o => o.id === id) || null).filter(o => o)
        : []
    }));
  }

  // getPlumberProfile(plumberId)
  getPlumberProfile(plumberId) {
    const plumbers = this._getFromStorage('plumbers', []);
    const serviceOptions = this._getFromStorage('service_options', []);
    const services = this._getFromStorage('services', []);

    const plumber = plumbers.find(p => p.id === plumberId) || null;
    if (!plumber) {
      return {
        plumber: null,
        serviceOptions: []
      };
    }

    const plumberOptions = Array.isArray(plumber.serviceOptionIds)
      ? serviceOptions.filter(o => plumber.serviceOptionIds.includes(o.id))
      : [];

    const enrichedOptions = plumberOptions.map(o => ({
      ...o,
      service: services.find(s => s.id === o.serviceId) || null
    }));

    return {
      plumber,
      serviceOptions: enrichedOptions
    };
  }

  // searchFaqArticles(query, tags)
  searchFaqArticles(query, tags) {
    const faqs = this._getFromStorage('faq_articles', []);
    const services = this._getFromStorage('services', []);

    const q = (query || '').toLowerCase();
    const tagFilter = Array.isArray(tags) ? tags : [];

    let list = faqs.filter(a => {
      const matchQuery = !q
        ? true
        : ((a.title || '').toLowerCase().includes(q) ||
           (a.excerpt || '').toLowerCase().includes(q) ||
           (a.body || '').toLowerCase().includes(q) ||
           (Array.isArray(a.searchKeywords) && a.searchKeywords.some(k => (k || '').toLowerCase().includes(q))));

      if (!matchQuery) return false;

      if (tagFilter.length > 0) {
        const tagsArr = Array.isArray(a.tags) ? a.tags : [];
        if (!tagsArr.some(t => tagFilter.includes(t))) {
          return false;
        }
      }

      return true;
    });

    // Instrumentation for task completion tracking (task_6: FAQ search)
    try {
      const originalQuery = query || '';
      if (
        originalQuery &&
        typeof originalQuery === 'string' &&
        originalQuery.toLowerCase().includes('slow draining sink') &&
        Array.isArray(list) &&
        list.length > 0
      ) {
        localStorage.setItem(
          'task6_faqSearchParams',
          JSON.stringify({ query, resultArticleIds: list.map(a => a.id), timestamp: this._nowISO() })
        );
      }
    } catch (e) {}

    return list.map(a => {
      const relatedService = a.relatedServiceId ? services.find(s => s.id === a.relatedServiceId) || null : null;
      const recommendedBookingService = a.recommendedBookingServiceId
        ? services.find(s => s.id === a.recommendedBookingServiceId) || null
        : null;

      return {
        ...a,
        relatedService,
        recommendedBookingService
      };
    });
  }

  // getFaqArticleDetail(faqArticleId)
  getFaqArticleDetail(faqArticleId) {
    const faqs = this._getFromStorage('faq_articles', []);
    const services = this._getFromStorage('services', []);

    const article = faqs.find(a => a.id === faqArticleId) || null;
    if (!article) {
      return {
        article: null,
        relatedService: null,
        recommendedBookingService: null
      };
    }

    const relatedService = article.relatedServiceId ? services.find(s => s.id === article.relatedServiceId) || null : null;
    const recommendedBookingService = article.recommendedBookingServiceId
      ? services.find(s => s.id === article.recommendedBookingServiceId) || null
      : null;

    const enrichedArticle = {
      ...article,
      relatedService,
      recommendedBookingService
    };

    // Instrumentation for task completion tracking (task_6: FAQ article viewed)
    try {
      if (article) {
        const title = (article.title || '').toLowerCase();
        const excerpt = (article.excerpt || '').toLowerCase();
        const body = (article.body || '').toLowerCase();
        const keywords = Array.isArray(article.searchKeywords)
          ? article.searchKeywords.map(k => (k || '').toLowerCase()).join(' ')
          : '';
        const combined = [title, excerpt, body, keywords].join(' ');
        if (combined.includes('slow draining') && combined.includes('sink')) {
          localStorage.setItem(
            'task6_faqArticleViewed',
            JSON.stringify({
              faqArticleId: article.id,
              recommendedBookingServiceId: article.recommendedBookingServiceId || null,
              timestamp: this._nowISO()
            })
          );
        }
      }
    } catch (e) {}

    return {
      article: enrichedArticle,
      relatedService,
      recommendedBookingService
    };
  }

  // checkZipCoverage(zipCode)
  checkZipCoverage(zipCode) {
    const zipCoverages = this._getFromStorage('zip_coverages', []);
    const categories = this._getFromStorage('service_categories', []);
    const services = this._getFromStorage('services', []);

    const zipCoverage = zipCoverages.find(z => z.zipCode === zipCode) || null;
    if (!zipCoverage) {
      return {
        zipCoverage: null,
        supportedCategories: [],
        supportedServices: []
      };
    }

    const supportedCategories = Array.isArray(zipCoverage.supportedCategoryIds)
      ? categories.filter(c => zipCoverage.supportedCategoryIds.includes(c.slug))
      : [];

    const supportedServices = Array.isArray(zipCoverage.supportedServiceIds)
      ? services.filter(s => zipCoverage.supportedServiceIds.includes(s.id))
      : [];

    const enrichedZipCoverage = {
      ...zipCoverage,
      supportedCategories,
      supportedServices
    };

    return {
      zipCoverage: enrichedZipCoverage,
      supportedCategories,
      supportedServices
    };
  }

  // getCoverageServicesByCategory(zipCode, categorySlug)
  getCoverageServicesByCategory(zipCode, categorySlug) {
    const zipCoverages = this._getFromStorage('zip_coverages', []);
    const services = this._getFromStorage('services', []);

    const coverage = zipCoverages.find(z => z.zipCode === zipCode) || null;
    if (!coverage || !coverage.isServiceable) {
      return [];
    }

    let list = services.filter(s => s.isActive && s.categoryId === categorySlug);

    if (Array.isArray(coverage.supportedServiceIds) && coverage.supportedServiceIds.length > 0) {
      list = list.filter(s => coverage.supportedServiceIds.includes(s.id));
    }

    return list;
  }

  // getEstimateSummary()
  getEstimateSummary() {
    const estimate = this._getOrCreateEstimate();
    const estimateItems = this._getFromStorage('estimate_items', []);
    const services = this._getFromStorage('services', []);
    const serviceOptions = this._getFromStorage('service_options', []);

    const itemsForEstimate = estimateItems.filter(i => i.estimateId === estimate.id);

    const enrichedItems = itemsForEstimate.map(i => ({
      id: i.id,
      estimateId: i.estimateId,
      serviceId: i.serviceId,
      serviceOptionId: i.serviceOptionId,
      quantity: i.quantity,
      estimatedPrice: i.estimatedPrice,
      notes: i.notes || '',
      // Foreign key resolution
      estimate,
      service: i.serviceId ? services.find(s => s.id === i.serviceId) || null : null,
      serviceOption: i.serviceOptionId ? serviceOptions.find(o => o.id === i.serviceOptionId) || null : null
    }));

    return {
      estimate,
      items: enrichedItems
    };
  }

  // saveEstimate(label)
  saveEstimate(label) {
    const estimate = this._getOrCreateEstimate();
    estimate.isSaved = true;
    if (label) {
      estimate.label = label;
    }
    estimate.updatedAt = this._nowISO();

    const estimates = this._getFromStorage('estimates', []);
    const idx = estimates.findIndex(e => e.id === estimate.id);
    if (idx >= 0) {
      estimates[idx] = estimate;
      this._saveToStorage('estimates', estimates);
    }

    return {
      estimate,
      message: 'Estimate saved.'
    };
  }

  // getBundleEligibleServices()
  getBundleEligibleServices() {
    const services = this._getFromStorage('services', []);
    return services.filter(s => s.isActive);
  }

  // getBundleDraft()
  getBundleDraft() {
    const bundleRequest = this._getOrCreateBundleRequest();
    const bundleItems = this._getFromStorage('bundle_items', []);
    const services = this._getFromStorage('services', []);
    const serviceOptions = this._getFromStorage('service_options', []);

    const itemsForBundle = bundleItems.filter(i => i.bundleRequestId === bundleRequest.id);

    const enrichedItems = itemsForBundle.map(i => ({
      id: i.id,
      bundleRequestId: i.bundleRequestId,
      serviceId: i.serviceId,
      serviceOptionId: i.serviceOptionId || null,
      tier: i.tier || null,
      quantity: i.quantity,
      estimatedPrice: i.estimatedPrice,
      // Foreign key resolution
      bundleRequest,
      service: services.find(s => s.id === i.serviceId) || null,
      serviceOption: i.serviceOptionId ? serviceOptions.find(o => o.id === i.serviceOptionId) || null : null
    }));

    return {
      bundleRequest,
      items: enrichedItems
    };
  }

  // setBundleItem(serviceId, tier, quantity, budgetLimit)
  setBundleItem(serviceId, tier, quantity, budgetLimit) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      quantity = 1;
    }

    const bundleRequest = this._getOrCreateBundleRequest();
    const services = this._getFromStorage('services', []);
    const serviceOptions = this._getFromStorage('service_options', []);
    const bundleItems = this._getFromStorage('bundle_items', []);

    const service = services.find(s => s.id === serviceId) || null;
    if (!service) {
      return {
        bundleRequest,
        items: [],
        message: 'Invalid service.'
      };
    }

    // Choose appropriate service option based on tier (basic/standard/premium) and lowest price
    let optionsForService = serviceOptions.filter(o => o.status === 'active' && o.serviceId === serviceId);
    if (tier) {
      optionsForService = optionsForService.filter(o => o.tier === tier);
    }

    let chosenOption = null;
    if (optionsForService.length > 0) {
      optionsForService.sort((a, b) => {
        const ap = typeof a.price === 'number' ? a.price : (typeof a.minPrice === 'number' ? a.minPrice : Number.MAX_VALUE);
        const bp = typeof b.price === 'number' ? b.price : (typeof b.minPrice === 'number' ? b.minPrice : Number.MAX_VALUE);
        return ap - bp;
      });
      chosenOption = optionsForService[0];
    }

    const unitPrice = chosenOption
      ? (typeof chosenOption.price === 'number'
          ? chosenOption.price
          : (typeof chosenOption.minPrice === 'number' ? chosenOption.minPrice : 0))
      : 0;

    let item = bundleItems.find(i => i.bundleRequestId === bundleRequest.id && i.serviceId === serviceId);

    if (item) {
      item.tier = tier || item.tier || null;
      item.quantity = quantity;
      item.serviceOptionId = chosenOption ? chosenOption.id : item.serviceOptionId || null;
      item.estimatedPrice = unitPrice * quantity;
    } else {
      item = {
        id: this._generateId('bundle_item'),
        bundleRequestId: bundleRequest.id,
        serviceId: serviceId,
        serviceOptionId: chosenOption ? chosenOption.id : null,
        tier: tier || null,
        quantity: quantity,
        estimatedPrice: unitPrice * quantity
      };
      bundleItems.push(item);
    }

    // Recalculate bundle totals
    const itemsForBundle = bundleItems.filter(i => i.bundleRequestId === bundleRequest.id);
    const totalEstimatedPrice = itemsForBundle.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);

    if (typeof budgetLimit === 'number') {
      bundleRequest.budgetLimit = budgetLimit;
    }
    bundleRequest.totalEstimatedPrice = totalEstimatedPrice;
    if (typeof bundleRequest.budgetLimit === 'number') {
      bundleRequest.isWithinBudget = totalEstimatedPrice <= bundleRequest.budgetLimit;
    } else {
      bundleRequest.isWithinBudget = null;
    }

    const bundleRequests = this._getFromStorage('bundle_requests', []);
    const idx = bundleRequests.findIndex(b => b.id === bundleRequest.id);
    if (idx >= 0) {
      bundleRequests[idx] = bundleRequest;
      this._saveToStorage('bundle_requests', bundleRequests);
    }
    this._saveToStorage('bundle_items', bundleItems);

    const enrichedItems = itemsForBundle.map(i => ({
      id: i.id,
      bundleRequestId: i.bundleRequestId,
      serviceId: i.serviceId,
      serviceOptionId: i.serviceOptionId || null,
      tier: i.tier || null,
      quantity: i.quantity,
      estimatedPrice: i.estimatedPrice,
      // Foreign key resolution
      bundleRequest,
      service: services.find(s => s.id === i.serviceId) || null,
      serviceOption: i.serviceOptionId ? serviceOptions.find(o => o.id === i.serviceOptionId) || null : null
    }));

    return {
      bundleRequest,
      items: enrichedItems,
      message: 'Bundle item set.'
    };
  }

  // submitBundleRequest(budgetLimit, contactName, contactPhone, contactEmail)
  submitBundleRequest(budgetLimit, contactName, contactPhone, contactEmail) {
    const bundleRequest = this._getOrCreateBundleRequest();
    const bundleItems = this._getFromStorage('bundle_items', []);

    const itemsForBundle = bundleItems.filter(i => i.bundleRequestId === bundleRequest.id);
    const totalEstimatedPrice = itemsForBundle.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);

    if (typeof budgetLimit === 'number') {
      bundleRequest.budgetLimit = budgetLimit;
    }
    bundleRequest.contactName = contactName;
    bundleRequest.contactPhone = contactPhone;
    bundleRequest.contactEmail = contactEmail;
    bundleRequest.totalEstimatedPrice = totalEstimatedPrice;
    if (typeof bundleRequest.budgetLimit === 'number') {
      bundleRequest.isWithinBudget = totalEstimatedPrice <= bundleRequest.budgetLimit;
    } else {
      bundleRequest.isWithinBudget = null;
    }
    bundleRequest.status = 'submitted';

    const bundleRequests = this._getFromStorage('bundle_requests', []);
    const idx = bundleRequests.findIndex(b => b.id === bundleRequest.id);
    if (idx >= 0) {
      bundleRequests[idx] = bundleRequest;
      this._saveToStorage('bundle_requests', bundleRequests);
    }

    return {
      bundleRequest,
      message: 'Bundle request submitted.'
    };
  }

  // getAboutInfo()
  getAboutInfo() {
    const about = this._getFromStorage('about_info', {});
    return {
      companyName: about.companyName || '',
      description: about.description || '',
      serviceAreas: Array.isArray(about.serviceAreas) ? about.serviceAreas : [],
      certifications: Array.isArray(about.certifications) ? about.certifications : [],
      contactPhone: about.contactPhone || '',
      contactEmail: about.contactEmail || '',
      officeAddress: about.officeAddress || '',
      emergencyBookingGuidance: about.emergencyBookingGuidance || '',
      standardBookingGuidance: about.standardBookingGuidance || '',
      quoteRequestGuidance: about.quoteRequestGuidance || ''
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