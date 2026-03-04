'use strict';

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

  // ------------------------------
  // Storage helpers
  // ------------------------------

  _initStorage() {
    const tables = [
      'services',
      'service_options',
      'plans',
      'plan_subscriptions',
      'property_profiles',
      'property_size_options',
      'bookings',
      'booking_visits',
      'addons',
      'visit_addons',
      'availability_slots',
      'promocodes',
      'quote_requests',
      'custom_bundles',
      'blog_articles',
      'newsletter_subscriptions',
      'policies',
      'contact_tickets'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Simple CMS-like content for pages (stored in localStorage so it still satisfies the data requirement)
    if (!localStorage.getItem('cms_home_page')) {
      const home = {
        heroTitle: 'Local Gardening & Landscaping Services',
        heroSubtitle: 'Friendly, reliable lawn care, cleanups, and more in your neighborhood.',
        primaryCtaLabel: 'Get a Quote',
        secondaryCtaLabel: 'View Services',
        specialOffersBanner: 'Use code GREEN15 on eligible hedge trimming services.'
      };
      localStorage.setItem('cms_home_page', JSON.stringify(home));
    }

    if (!localStorage.getItem('cms_about_page')) {
      const about = {
        headline: 'About Our Local Gardening Team',
        subheading: 'Family-run, eco-conscious lawn and landscape care.',
        bodyHtml: '<p>We provide lawn mowing, landscaping, cleanups, pest control and more for local homeowners. Our crew focuses on reliable schedules, clear communication, and pet-safe, eco-friendly options whenever possible.</p>',
        serviceAreas: [
          {
            label: 'Core Service Area',
            zipRangeDescription: 'Primary ZIPs within a 15-mile radius of downtown.'
          }
        ],
        contact: {
          phone: '555-000-0000',
          email: 'info@example.com',
          hours: 'Mon–Sat, 8:00 AM–6:00 PM'
        }
      };
      localStorage.setItem('cms_about_page', JSON.stringify(about));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return defaultValue !== undefined ? this._clone(defaultValue) : [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) {
        return defaultValue !== undefined ? this._clone(defaultValue) : [];
      }
      return parsed;
    } catch (e) {
      return defaultValue !== undefined ? this._clone(defaultValue) : [];
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

  _clone(obj) {
    return obj === undefined ? undefined : JSON.parse(JSON.stringify(obj));
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // ------------------------------
  // Enum label helpers
  // ------------------------------

  _formatServiceCategoryLabel(category) {
    const map = {
      recurring_service: 'Recurring Service',
      one_time_service: 'One-time Service',
      design_installation: 'Design & Installation',
      pest_control: 'Pest Control',
      cleanup: 'Cleanup',
      other: 'Other'
    };
    return map[category] || category;
  }

  _formatPlanTypeLabel(planType) {
    const map = {
      seasonal_maintenance: 'Seasonal Maintenance',
      annual_maintenance: 'Annual Maintenance',
      monthly_maintenance: 'Monthly Maintenance',
      other: 'Other Plan'
    };
    return map[planType] || planType;
  }

  _formatAddonCategoryLabel(category) {
    const map = {
      plant_soil_care: 'Plant & Soil Care',
      debris_removal: 'Debris Removal',
      pest_treatment: 'Pest Treatment',
      lawn_treatment: 'Lawn Treatment',
      gutter_cleaning: 'Gutter Cleaning',
      other: 'Other'
    };
    return map[category] || category;
  }

  _formatBlogCategoryLabel(category) {
    const map = {
      lawn_care: 'Lawn Care',
      watering: 'Watering',
      seasonal_tips: 'Seasonal Tips',
      pest_control: 'Pest Control',
      landscaping: 'Landscaping',
      company_news: 'Company News',
      other: 'Other'
    };
    return map[category] || category;
  }

  _formatPropertyTypeLabel(propertyType) {
    const map = {
      single_family_home: 'Single-family home',
      townhouse: 'Townhouse',
      condo: 'Condo',
      multi_family: 'Multi-family',
      commercial: 'Commercial',
      other: 'Other'
    };
    return map[propertyType] || propertyType;
  }

  // ------------------------------
  // Foreign key resolution helpers
  // ------------------------------

  _getServiceById(serviceId) {
    const services = this._getFromStorage('services', []);
    for (let i = 0; i < services.length; i++) {
      if (services[i].id === serviceId) return services[i];
    }
    return null;
  }

  _getPlanById(planId) {
    const plans = this._getFromStorage('plans', []);
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === planId) return plans[i];
    }
    return null;
  }

  _getServiceOptionById(serviceOptionId) {
    const options = this._getFromStorage('service_options', []);
    for (let i = 0; i < options.length; i++) {
      if (options[i].id === serviceOptionId) return options[i];
    }
    return null;
  }

  _getAddonById(addonId) {
    const addons = this._getFromStorage('addons', []);
    for (let i = 0; i < addons.length; i++) {
      if (addons[i].id === addonId) return addons[i];
    }
    return null;
  }

  _getBookingById(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    for (let i = 0; i < bookings.length; i++) {
      if (bookings[i].id === bookingId) return bookings[i];
    }
    return null;
  }

  _getBookingVisitById(visitId) {
    const visits = this._getFromStorage('booking_visits', []);
    for (let i = 0; i < visits.length; i++) {
      if (visits[i].id === visitId) return visits[i];
    }
    return null;
  }

  // ------------------------------
  // Promo code helpers
  // ------------------------------

  _findPromoByCode(code) {
    const promos = this._getFromStorage('promocodes', []);
    if (!code) return null;
    const upper = String(code).toUpperCase();
    for (let i = 0; i < promos.length; i++) {
      if (String(promos[i].code).toUpperCase() === upper) {
        return promos[i];
      }
    }
    return null;
  }

  _calculatePriceWithPromo(promo, originalPrice) {
    if (!promo || typeof originalPrice !== 'number' || originalPrice <= 0) {
      return {
        discountAmount: 0,
        finalPrice: originalPrice
      };
    }
    let discountAmount = 0;
    if (promo.discountType === 'percent') {
      discountAmount = (originalPrice * promo.discountValue) / 100;
    } else if (promo.discountType === 'fixed_amount') {
      discountAmount = promo.discountValue;
    }
    if (discountAmount < 0) discountAmount = 0;
    if (discountAmount > originalPrice) discountAmount = originalPrice;
    const finalPrice = originalPrice - discountAmount;
    return { discountAmount, finalPrice };
  }

  _incrementPromoUsage(promo) {
    const promos = this._getFromStorage('promocodes', []);
    for (let i = 0; i < promos.length; i++) {
      if (promos[i].id === promo.id) {
        const current = promos[i].usageCount || 0;
        promos[i].usageCount = current + 1;
        break;
      }
    }
    this._saveToStorage('promocodes', promos);
  }

  // ------------------------------
  // Booking helper
  // ------------------------------

  _generateBookingCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    let prefix = '';
    for (let i = 0; i < 3; i++) {
      prefix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    let suffix = '';
    for (let j = 0; j < 4; j++) {
      suffix += nums.charAt(Math.floor(Math.random() * nums.length));
    }
    return prefix + suffix;
  }

  // ------------------------------
  // Time helpers
  // ------------------------------

  _parseDateOnly(dateStr) {
    // Expect 'YYYY-MM-DD'
    return new Date(dateStr + 'T00:00:00.000Z');
  }

  _compareDateOnly(a, b) {
    const da = this._parseDateOnly(a);
    const db = this._parseDateOnly(b);
    if (da.getTime() < db.getTime()) return -1;
    if (da.getTime() > db.getTime()) return 1;
    return 0;
  }

  _timeToMinutes(timeStr) {
    // Accept 'HH:MM' or ISO string; extract time portion
    if (!timeStr) return null;
    let t = timeStr;
    const tIndex = timeStr.indexOf('T');
    if (tIndex >= 0) {
      t = timeStr.slice(tIndex + 1, tIndex + 6);
    }
    const parts = t.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  _dayOfWeekString(dateIso) {
    const d = new Date(dateIso);
    const idx = d.getUTCDay(); // 0-6
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[idx] || '';
  }

  // =============================================================
  // CORE INTERFACE IMPLEMENTATIONS
  // =============================================================

  // -------------------------------------------------------------
  // getHomePageContent
  // -------------------------------------------------------------

  getHomePageContent() {
    const cms = this._getFromStorage('cms_home_page', {
      heroTitle: '',
      heroSubtitle: '',
      primaryCtaLabel: '',
      secondaryCtaLabel: '',
      specialOffersBanner: ''
    });

    const services = this._getFromStorage('services', []);
    const plans = this._getFromStorage('plans', []);
    const articles = this._getFromStorage('blog_articles', []);

    const activeServices = services.filter(s => s.isActive);

    const featuredServices = activeServices.slice(0, 4).map(s => ({
      id: s.id,
      serviceKey: s.serviceKey,
      name: s.name,
      shortDescription: s.shortDescription || '',
      category: s.category,
      categoryLabel: this._formatServiceCategoryLabel(s.category),
      isActive: !!s.isActive,
      ecoFriendlyOptionsAvailable: !!s.ecoFriendlyOptionsAvailable,
      petSafeOptionsAvailable: !!s.petSafeOptionsAvailable
    }));

    const activePlans = plans.filter(p => p.isActive);

    const featuredPlans = activePlans.slice(0, 3).map((p, idx) => ({
      id: p.id,
      name: p.name,
      planType: p.planType,
      planTypeLabel: this._formatPlanTypeLabel(p.planType),
      monthlyPrice: p.monthlyPrice,
      visitsPerYear: p.visitsPerYear,
      highlightText: idx === 0 ? 'Most popular' : ''
    }));

    const oneTimeServices = activeServices
      .filter(s => s.supportsOneTime)
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        serviceKey: s.serviceKey,
        name: s.name,
        shortDescription: s.shortDescription || ''
      }));

    const popularRecurringServices = activeServices
      .filter(s => s.supportsRecurring)
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        serviceKey: s.serviceKey,
        name: s.name,
        shortDescription: s.shortDescription || ''
      }));

    const publishedArticles = articles.filter(a => a.isPublished);
    const featuredArticles = publishedArticles.slice(0, 3).map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt || '',
      category: a.category || 'other',
      categoryLabel: this._formatBlogCategoryLabel(a.category || 'other'),
      publishedAt: a.publishedAt || a.createdAt || ''
    }));

    return {
      heroTitle: cms.heroTitle || '',
      heroSubtitle: cms.heroSubtitle || '',
      primaryCtaLabel: cms.primaryCtaLabel || '',
      secondaryCtaLabel: cms.secondaryCtaLabel || '',
      featuredServices,
      featuredPlans,
      oneTimeServices,
      popularRecurringServices,
      featuredArticles,
      specialOffersBanner: cms.specialOffersBanner || ''
    };
  }

  // -------------------------------------------------------------
  // getServicesOverview
  // -------------------------------------------------------------

  getServicesOverview() {
    const services = this._getFromStorage('services', []);
    const byCategory = {};

    for (let i = 0; i < services.length; i++) {
      const s = services[i];
      const cat = s.category || 'other';
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(s);
    }

    const categories = Object.keys(byCategory).map(catKey => ({
      categoryKey: catKey,
      categoryLabel: this._formatServiceCategoryLabel(catKey),
      services: byCategory[catKey].map(s => ({
        id: s.id,
        serviceKey: s.serviceKey,
        name: s.name,
        shortDescription: s.shortDescription || '',
        supportsRecurring: !!s.supportsRecurring,
        supportsOneTime: !!s.supportsOneTime,
        ecoFriendlyOptionsAvailable: !!s.ecoFriendlyOptionsAvailable,
        petSafeOptionsAvailable: !!s.petSafeOptionsAvailable,
        baseMinPrice: s.baseMinPrice || 0,
        rating: s.rating || 0,
        ratingCount: s.ratingCount || 0
      }))
    }));

    return { categories };
  }

  // -------------------------------------------------------------
  // getServiceDetail(serviceKey)
  // -------------------------------------------------------------

  getServiceDetail(serviceKey) {
    const services = this._getFromStorage('services', []);
    const serviceOptions = this._getFromStorage('service_options', []);
    const sizeOptions = this._getFromStorage('property_size_options', []);

    let service = null;
    for (let i = 0; i < services.length; i++) {
      if (services[i].serviceKey === serviceKey) {
        service = services[i];
        break;
      }
    }

    if (!service) {
      return {
        service: null,
        configurator: {
          propertySizeOptions: [],
          supportedFrequencies: [],
          lengthInput: { enabled: false, unitLabel: 'ft', minFeet: 0, maxFeet: 0 },
          priceFilter: { minPricePerVisit: 0, maxPricePerVisit: 0, priceStep: 5 },
          attributeFilters: []
        },
        exampleOptions: []
      };
    }

    const optionsForService = serviceOptions.filter(
      o => o.serviceId === service.id && o.status === 'active'
    );

    // supportedFrequencies
    const freqSet = {};
    for (let i = 0; i < optionsForService.length; i++) {
      freqSet[optionsForService[i].frequency] = true;
    }
    const supportedFrequencies = Object.keys(freqSet);

    // lengthInput
    let lengthEnabled = !!service.supportsLengthInput;
    let minFeet = null;
    let maxFeet = null;
    if (lengthEnabled) {
      for (let j = 0; j < optionsForService.length; j++) {
        const o = optionsForService[j];
        if (typeof o.hedgeLengthMinFeet === 'number') {
          if (minFeet === null || o.hedgeLengthMinFeet < minFeet) {
            minFeet = o.hedgeLengthMinFeet;
          }
        }
        if (typeof o.hedgeLengthMaxFeet === 'number') {
          if (maxFeet === null || o.hedgeLengthMaxFeet > maxFeet) {
            maxFeet = o.hedgeLengthMaxFeet;
          }
        }
      }
    }

    // priceFilter
    let minPrice = null;
    let maxPrice = null;
    for (let k = 0; k < optionsForService.length; k++) {
      const price = optionsForService[k].pricePerVisit;
      if (typeof price === 'number') {
        if (minPrice === null || price < minPrice) minPrice = price;
        if (maxPrice === null || price > maxPrice) maxPrice = price;
      }
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    // attributeFilters
    const attributeFilters = [];
    if (service.ecoFriendlyOptionsAvailable) {
      attributeFilters.push({ key: 'eco_friendly', label: 'Eco-friendly' });
    }
    if (service.petSafeOptionsAvailable) {
      attributeFilters.push({ key: 'pet_safe', label: 'Pet safe' });
    }

    // Map property size options
    const propertySizeOptions = sizeOptions
      .slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(o => ({
        id: o.id,
        label: o.label,
        minSize: o.minSize,
        maxSize: o.maxSize,
        unit: o.unit,
        sortOrder: o.sortOrder || 0
      }));

    // exampleOptions from first few optionsForService
    const exampleOptions = [];
    for (let i = 0; i < optionsForService.length && i < 5; i++) {
      const opt = optionsForService[i];

      let propertySizeRangeLabel = '';
      if (opt.propertySizeMin || opt.propertySizeMax) {
        const minS = opt.propertySizeMin || 0;
        const maxS = opt.propertySizeMax || 0;
        const unitLabel = opt.propertySizeUnit === 'sq_m' ? 'sq m' : 'sq ft';
        if (minS && maxS) {
          propertySizeRangeLabel = minS + '–' + maxS + ' ' + unitLabel;
        } else if (maxS) {
          propertySizeRangeLabel = 'Up to ' + maxS + ' ' + unitLabel;
        }
      }

      let hedgeLengthRangeLabel = '';
      if (opt.hedgeLengthMinFeet || opt.hedgeLengthMaxFeet) {
        const minL = opt.hedgeLengthMinFeet || 0;
        const maxL = opt.hedgeLengthMaxFeet || 0;
        if (minL && maxL) {
          hedgeLengthRangeLabel = minL + '–' + maxL + ' ft';
        } else if (maxL) {
          hedgeLengthRangeLabel = 'Up to ' + maxL + ' ft';
        }
      }

      const eo = {
        serviceOptionId: opt.id,
        name: opt.name,
        description: opt.description || '',
        optionType: opt.optionType,
        optionTypeLabel: opt.optionType === 'eco_friendly'
          ? 'Eco-friendly'
          : opt.optionType === 'pet_safe'
            ? 'Pet safe'
            : opt.optionType === 'premium'
              ? 'Premium'
              : 'Standard',
        frequency: opt.frequency,
        frequencyLabel: opt.frequency === 'one_time'
          ? 'One-time'
          : opt.frequency === 'weekly'
            ? 'Weekly'
            : opt.frequency === 'biweekly'
              ? 'Every 2 weeks'
              : opt.frequency === 'monthly'
                ? 'Monthly'
                : opt.frequency === 'seasonal'
                  ? 'Seasonal'
                  : opt.frequency,
        pricePerVisit: opt.pricePerVisit || 0,
        monthlyPrice: opt.monthlyPrice || 0,
        minTotalPrice: opt.minTotalPrice || 0,
        currency: opt.currency || 'usd',
        propertySizeRangeLabel,
        hedgeLengthRangeLabel,
        isEcoFriendly: !!opt.isEcoFriendly,
        isPetSafe: !!opt.isPetSafe,
        visitsPerYear: opt.visitsPerYear || 0,
        includedServices: opt.includedServices || [],
        rating: opt.rating || 0,
        ratingCount: opt.ratingCount || 0,
        isDefault: !!opt.isDefault
      };

      // Foreign key resolution: serviceOptionId -> serviceOption
      eo.serviceOption = this._clone(opt);

      exampleOptions.push(eo);
    }

    const serviceResult = {
      id: service.id,
      serviceKey: service.serviceKey,
      name: service.name,
      shortDescription: service.shortDescription || '',
      longDescription: service.longDescription || '',
      category: service.category,
      categoryLabel: this._formatServiceCategoryLabel(service.category),
      supportsRecurring: !!service.supportsRecurring,
      supportsOneTime: !!service.supportsOneTime,
      supportsZipAvailability: !!service.supportsZipAvailability,
      supportsPropertySizeSelection: !!service.supportsPropertySizeSelection,
      supportsLengthInput: !!service.supportsLengthInput,
      ecoFriendlyOptionsAvailable: !!service.ecoFriendlyOptionsAvailable,
      petSafeOptionsAvailable: !!service.petSafeOptionsAvailable,
      baseMinPrice: service.baseMinPrice || 0,
      rating: service.rating || 0,
      ratingCount: service.ratingCount || 0
    };

    return {
      service: serviceResult,
      configurator: {
        propertySizeOptions,
        supportedFrequencies,
        lengthInput: {
          enabled: lengthEnabled,
          unitLabel: 'ft',
          minFeet: minFeet || 0,
          maxFeet: maxFeet || 0
        },
        priceFilter: {
          minPricePerVisit: minPrice,
          maxPricePerVisit: maxPrice,
          priceStep: 5
        },
        attributeFilters
      },
      exampleOptions
    };
  }

  // -------------------------------------------------------------
  // searchServiceOptions(serviceId, filters)
  // -------------------------------------------------------------

  searchServiceOptions(serviceId, filters) {
    filters = filters || {};
    const options = this._getFromStorage('service_options', []);
    const services = this._getFromStorage('services', []);
    const sizeOptions = this._getFromStorage('property_size_options', []);

    const service = services.find(s => s.id === serviceId) || null;

    let results = options.filter(o => o.serviceId === serviceId && o.status === 'active');

    // If no explicit options exist for certain services, synthesize reasonable defaults
    if (results.length === 0 && service) {
      // Hedge trimming is priced by hedge length; create a generic one-time option
      if (service.serviceKey === 'hedge_trimming') {
        results.push({
          id: 'synthetic_ht_one_time_0_200ft',
          serviceId: service.id,
          name: 'One-time Hedge Trimming (up to 200 ft)',
          description: 'One-time hedge trimming priced by total linear feet.',
          optionType: 'standard',
          frequency: 'one_time',
          pricePerVisit: 180,
          monthlyPrice: 0,
          minTotalPrice: 0,
          currency: 'usd',
          propertySizeMin: null,
          propertySizeMax: null,
          propertySizeUnit: null,
          hedgeLengthMinFeet: 0,
          hedgeLengthMaxFeet: 200,
          isEcoFriendly: !!service.ecoFriendlyOptionsAvailable,
          isPetSafe: !!service.petSafeOptionsAvailable,
          rating: service.rating || 4.5,
          ratingCount: service.ratingCount || 0,
          visitsPerYear: 0,
          includedServices: [],
          isDefault: true,
          status: 'active'
        });
      } else if (service.serviceKey === 'pest_control') {
        // Eco-friendly, pet-safe pest control one-time visit
        results.push({
          id: 'synthetic_pc_eco_one_time',
          serviceId: service.id,
          name: 'Eco-friendly Pest Control (one-time)',
          description: 'One-time eco-friendly, pet-safe outdoor pest treatment.',
          optionType: 'eco_friendly',
          frequency: 'one_time',
          pricePerVisit: 140,
          monthlyPrice: 0,
          minTotalPrice: 0,
          currency: 'usd',
          propertySizeMin: null,
          propertySizeMax: null,
          propertySizeUnit: null,
          hedgeLengthMinFeet: null,
          hedgeLengthMaxFeet: null,
          isEcoFriendly: true,
          isPetSafe: true,
          rating: 4.8,
          ratingCount: 0,
          visitsPerYear: 0,
          includedServices: [],
          isDefault: true,
          status: 'active'
        });
      }
    }

    if (filters.frequency) {
      results = results.filter(o => o.frequency === filters.frequency);
    }

    if (filters.propertySizeOptionId) {
      const ps = sizeOptions.find(p => p.id === filters.propertySizeOptionId);
      if (ps) {
        results = results.filter(o => {
          if (!o.propertySizeUnit || !o.propertySizeMin || !o.propertySizeMax) return true;
          if (o.propertySizeUnit !== ps.unit) return false;
          // simple containment check
          if (typeof ps.minSize === 'number' && o.propertySizeMin < ps.minSize) return false;
          if (typeof ps.maxSize === 'number' && o.propertySizeMax > ps.maxSize) return false;
          return true;
        });
      }
    }

    if (typeof filters.hedgeLengthFeet === 'number') {
      const len = filters.hedgeLengthFeet;
      results = results.filter(o => {
        if (typeof o.hedgeLengthMinFeet === 'number' && len < o.hedgeLengthMinFeet) return false;
        if (typeof o.hedgeLengthMaxFeet === 'number' && len > o.hedgeLengthMaxFeet) return false;
        return true;
      });
    }

    if (typeof filters.minPricePerVisit === 'number') {
      results = results.filter(o => (o.pricePerVisit || 0) >= filters.minPricePerVisit);
    }
    if (typeof filters.maxPricePerVisit === 'number') {
      results = results.filter(o => (o.pricePerVisit || 0) <= filters.maxPricePerVisit);
    }

    if (typeof filters.isEcoFriendly === 'boolean') {
      results = results.filter(o => !!o.isEcoFriendly === filters.isEcoFriendly);
    }
    if (typeof filters.isPetSafe === 'boolean') {
      results = results.filter(o => !!o.isPetSafe === filters.isPetSafe);
    }

    if (filters.sortBy) {
      const sortBy = filters.sortBy;
      results = results.slice();
      if (sortBy === 'price_asc') {
        results.sort((a, b) => (a.pricePerVisit || 0) - (b.pricePerVisit || 0));
      } else if (sortBy === 'price_desc') {
        results.sort((a, b) => (b.pricePerVisit || 0) - (a.pricePerVisit || 0));
      } else if (sortBy === 'rating_desc') {
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sortBy === 'rating_asc') {
        results.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      }
    }

    if (typeof filters.maxResults === 'number') {
      results = results.slice(0, filters.maxResults);
    }

    const mapped = results.map(o => {
      let propertySizeRangeLabel = '';
      if (o.propertySizeMin || o.propertySizeMax) {
        const minS = o.propertySizeMin || 0;
        const maxS = o.propertySizeMax || 0;
        const unitLabel = o.propertySizeUnit === 'sq_m' ? 'sq m' : 'sq ft';
        if (minS && maxS) {
          propertySizeRangeLabel = minS + '–' + maxS + ' ' + unitLabel;
        } else if (maxS) {
          propertySizeRangeLabel = 'Up to ' + maxS + ' ' + unitLabel;
        }
      }

      let hedgeLengthRangeLabel = '';
      if (o.hedgeLengthMinFeet || o.hedgeLengthMaxFeet) {
        const minL = o.hedgeLengthMinFeet || 0;
        const maxL = o.hedgeLengthMaxFeet || 0;
        if (minL && maxL) {
          hedgeLengthRangeLabel = minL + '–' + maxL + ' ft';
        } else if (maxL) {
          hedgeLengthRangeLabel = 'Up to ' + maxL + ' ft';
        }
      }

      const item = {
        serviceOptionId: o.id,
        serviceId: o.serviceId,
        serviceName: service ? service.name : '',
        name: o.name,
        description: o.description || '',
        optionType: o.optionType,
        optionTypeLabel: o.optionType === 'eco_friendly'
          ? 'Eco-friendly'
          : o.optionType === 'pet_safe'
            ? 'Pet safe'
            : o.optionType === 'premium'
              ? 'Premium'
              : 'Standard',
        frequency: o.frequency,
        frequencyLabel: o.frequency === 'one_time'
          ? 'One-time'
          : o.frequency === 'weekly'
            ? 'Weekly'
            : o.frequency === 'biweekly'
              ? 'Every 2 weeks'
              : o.frequency === 'monthly'
                ? 'Monthly'
                : o.frequency === 'seasonal'
                  ? 'Seasonal'
                  : o.frequency,
        pricePerVisit: o.pricePerVisit || 0,
        monthlyPrice: o.monthlyPrice || 0,
        minTotalPrice: o.minTotalPrice || 0,
        currency: o.currency || 'usd',
        propertySizeRangeLabel,
        hedgeLengthRangeLabel,
        isEcoFriendly: !!o.isEcoFriendly,
        isPetSafe: !!o.isPetSafe,
        visitsPerYear: o.visitsPerYear || 0,
        includedServices: o.includedServices || [],
        rating: o.rating || 0,
        ratingCount: o.ratingCount || 0,
        status: o.status
      };

      // Foreign key resolution
      item.serviceOption = this._clone(o);
      item.service = service || this._getServiceById(o.serviceId);

      return item;
    });

    return mapped;
  }

  // -------------------------------------------------------------
  // getPlanFilterOptions
  // -------------------------------------------------------------

  getPlanFilterOptions() {
    const plans = this._getFromStorage('plans', []);

    const typeSet = {};
    for (let i = 0; i < plans.length; i++) {
      typeSet[plans[i].planType] = true;
    }
    const planTypes = Object.keys(typeSet).map(t => ({
      value: t,
      label: this._formatPlanTypeLabel(t)
    }));

    // Derive simple price ranges from existing data
    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i].monthlyPrice;
      if (typeof p === 'number') {
        if (minPrice === null || p < minPrice) minPrice = p;
        if (maxPrice === null || p > maxPrice) maxPrice = p;
      }
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const priceRanges = [];
    if (maxPrice > 0) {
      const step = Math.max(50, Math.round((maxPrice - minPrice) / 3));
      const range1Max = minPrice + step;
      const range2Max = minPrice + step * 2;
      priceRanges.push({
        id: 'low',
        label: 'Up to $' + range1Max,
        minMonthlyPrice: 0,
        maxMonthlyPrice: range1Max
      });
      priceRanges.push({
        id: 'mid',
        label: '$' + (range1Max + 1) + '–$' + range2Max,
        minMonthlyPrice: range1Max + 1,
        maxMonthlyPrice: range2Max
      });
      priceRanges.push({
        id: 'high',
        label: '$' + (range2Max + 1) + '+',
        minMonthlyPrice: range2Max + 1,
        maxMonthlyPrice: maxPrice
      });
    }

    const includedServiceFilters = [
      { key: 'includesWeedControl', label: 'Weed control' },
      { key: 'includesGutterCleaning', label: 'Gutter cleaning' }
    ];

    return {
      planTypes,
      priceRanges,
      includedServiceFilters
    };
  }

  // -------------------------------------------------------------
  // searchPlans(filters)
  // -------------------------------------------------------------

  searchPlans(filters) {
    filters = filters || {};
    const plans = this._getFromStorage('plans', []);

    let results = plans.filter(p => p.isActive);

    if (filters.planType) {
      results = results.filter(p => p.planType === filters.planType);
    }
    if (typeof filters.minMonthlyPrice === 'number') {
      results = results.filter(p => p.monthlyPrice >= filters.minMonthlyPrice);
    }
    if (typeof filters.maxMonthlyPrice === 'number') {
      results = results.filter(p => p.monthlyPrice <= filters.maxMonthlyPrice);
    }
    if (typeof filters.includesWeedControl === 'boolean') {
      results = results.filter(p => !!p.includesWeedControl === filters.includesWeedControl);
    }
    if (typeof filters.includesGutterCleaning === 'boolean') {
      results = results.filter(p => !!p.includesGutterCleaning === filters.includesGutterCleaning);
    }
    if (typeof filters.maxResults === 'number') {
      results = results.slice(0, filters.maxResults);
    }

    const mapped = results.map(p => {
      const item = {
        planId: p.id,
        name: p.name,
        description: p.description || '',
        planType: p.planType,
        planTypeLabel: this._formatPlanTypeLabel(p.planType),
        monthlyPrice: p.monthlyPrice,
        pricePerVisitEstimate: p.pricePerVisitEstimate || 0,
        visitsPerYear: p.visitsPerYear,
        includesWeedControl: !!p.includesWeedControl,
        includesGutterCleaning: !!p.includesGutterCleaning,
        includedServices: p.includedServices || [],
        isActive: !!p.isActive
      };
      // Foreign key resolution: planId -> plan
      item.plan = this._clone(p);
      return item;
    });

    return mapped;
  }

  // -------------------------------------------------------------
  // getPlanComparison(planIds)
  // -------------------------------------------------------------

  getPlanComparison(planIds) {
    const plansTable = this._getFromStorage('plans', []);
    const selected = [];
    for (let i = 0; i < planIds.length && i < 3; i++) {
      const p = plansTable.find(pl => pl.id === planIds[i]);
      if (p) selected.push(p);
    }

    const plans = selected.map(p => ({
      planId: p.id,
      name: p.name,
      planType: p.planType,
      planTypeLabel: this._formatPlanTypeLabel(p.planType),
      monthlyPrice: p.monthlyPrice,
      pricePerVisitEstimate: p.pricePerVisitEstimate || 0,
      visitsPerYear: p.visitsPerYear,
      includesWeedControl: !!p.includesWeedControl,
      includesGutterCleaning: !!p.includesGutterCleaning,
      includedServices: p.includedServices || [],
      plan: this._clone(p) // FK resolution
    }));

    const highlightedDifferences = [];
    if (plans.length > 0) {
      // Best visitsPerYear (higher is better)
      let bestVisits = plans[0];
      for (let i = 1; i < plans.length; i++) {
        if ((plans[i].visitsPerYear || 0) > (bestVisits.visitsPerYear || 0)) {
          bestVisits = plans[i];
        }
      }
      highlightedDifferences.push({
        attributeKey: 'visitsPerYear',
        label: 'Visits per year',
        bestPlanId: bestVisits.planId,
        bestValueLabel: String(bestVisits.visitsPerYear || 0)
      });

      // Lowest monthly price (lower is better)
      let bestPrice = plans[0];
      for (let i = 1; i < plans.length; i++) {
        if ((plans[i].monthlyPrice || 0) < (bestPrice.monthlyPrice || 0)) {
          bestPrice = plans[i];
        }
      }
      highlightedDifferences.push({
        attributeKey: 'monthlyPrice',
        label: 'Monthly price',
        bestPlanId: bestPrice.planId,
        bestValueLabel: '$' + (bestPrice.monthlyPrice || 0)
      });
    }

    return {
      plans,
      highlightedDifferences
    };
  }

  // -------------------------------------------------------------
  // getPlanDetail(planId)
  // -------------------------------------------------------------

  getPlanDetail(planId) {
    const plan = this._getPlanById(planId);
    if (!plan) {
      return null;
    }
    return {
      planId: plan.id,
      name: plan.name,
      description: plan.description || '',
      planType: plan.planType,
      planTypeLabel: this._formatPlanTypeLabel(plan.planType),
      monthlyPrice: plan.monthlyPrice,
      pricePerVisitEstimate: plan.pricePerVisitEstimate || 0,
      visitsPerYear: plan.visitsPerYear,
      includedServices: plan.includedServices || [],
      includesWeedControl: !!plan.includesWeedControl,
      includesGutterCleaning: !!plan.includesGutterCleaning,
      plan: this._clone(plan) // FK resolution
    };
  }

  // -------------------------------------------------------------
  // createPlanSubscription(planId, startDate, customerInfo)
  // -------------------------------------------------------------

  createPlanSubscription(planId, startDate, customerInfo) {
    const plan = this._getPlanById(planId);
    if (!plan) {
      return {
        success: false,
        subscriptionId: null,
        bookingId: null,
        confirmationMessage: 'Plan not found.',
        planName: '',
        startDate: startDate
      };
    }

    const planSubscriptions = this._getFromStorage('plan_subscriptions', []);
    const bookings = this._getFromStorage('bookings', []);

    const subscriptionId = this._generateId('plansub');
    const bookingId = this._generateId('booking');
    const bookingCode = this._generateBookingCode();
    const createdAt = this._nowIso();

    // Create booking for the plan
    const nameParts = (customerInfo.customerName || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const booking = {
      id: bookingId,
      bookingCode: bookingCode,
      bookingType: 'plan',
      serviceId: null,
      serviceOptionId: null,
      planId: plan.id,
      bundleId: null,
      quoteRequestId: null,
      status: 'confirmed',
      totalPrice: plan.monthlyPrice || 0,
      currency: 'usd',
      promoCode: null,
      discountAmount: 0,
      contactFirstName: firstName,
      contactLastName: lastName,
      contactEmail: customerInfo.email || '',
      contactPhone: '',
      streetAddress: customerInfo.streetAddress || '',
      city: customerInfo.city || '',
      zip: customerInfo.zip || '',
      propertyType: 'single_family_home',
      yardSize: null,
      yardSizeUnit: null,
      reminderMethod: 'email',
      notes: '',
      createdAt: createdAt
    };
    bookings.push(booking);

    const subscription = {
      id: subscriptionId,
      planId: plan.id,
      bookingId: bookingId,
      propertyProfileId: null,
      startDate: startDate,
      status: 'pending',
      customerName: customerInfo.customerName || '',
      email: customerInfo.email || '',
      streetAddress: customerInfo.streetAddress || '',
      city: customerInfo.city || '',
      zip: customerInfo.zip || '',
      createdAt: createdAt
    };
    planSubscriptions.push(subscription);

    this._saveToStorage('bookings', bookings);
    this._saveToStorage('plan_subscriptions', planSubscriptions);

    return {
      success: true,
      subscriptionId: subscriptionId,
      bookingId: bookingId,
      confirmationMessage: 'Your subscription has been submitted.',
      planName: plan.name,
      startDate: startDate
    };
  }

  // -------------------------------------------------------------
  // getAvailabilitySlots(serviceId, zip, startDate, endDate, dayOfWeekFilter, timeWindowFilter)
  // -------------------------------------------------------------

  getAvailabilitySlots(serviceId, zip, startDate, endDate, dayOfWeekFilter, timeWindowFilter) {
    const slots = this._getFromStorage('availability_slots', []);
    const services = this._getFromStorage('services', []);
    const service = services.find(s => s.id === serviceId) || null;

    const startCmp = startDate;
    const endCmp = endDate;

    const dayFilterSet = {};
    if (Array.isArray(dayOfWeekFilter)) {
      for (let i = 0; i < dayOfWeekFilter.length; i++) {
        dayFilterSet[String(dayOfWeekFilter[i]).toLowerCase()] = true;
      }
    }

    const earliestMinutes = timeWindowFilter && timeWindowFilter.earliestStartTime
      ? this._timeToMinutes(timeWindowFilter.earliestStartTime)
      : null;
    const latestMinutes = timeWindowFilter && timeWindowFilter.latestEndTime
      ? this._timeToMinutes(timeWindowFilter.latestEndTime)
      : null;

    const filtered = [];
    for (let i = 0; i < slots.length; i++) {
      const sl = slots[i];
      if (sl.serviceId !== serviceId) continue;
      if (zip && sl.zip !== zip) continue;

      if (this._compareDateOnly(sl.date.slice(0, 10), startCmp) < 0) continue;
      if (this._compareDateOnly(sl.date.slice(0, 10), endCmp) > 0) continue;

      if (Object.keys(dayFilterSet).length > 0) {
        const dayStr = this._dayOfWeekString(sl.date).toLowerCase();
        if (!dayFilterSet[dayStr]) continue;
      }

      if (earliestMinutes !== null || latestMinutes !== null) {
        const slotStart = this._timeToMinutes(sl.startTime);
        const slotEnd = this._timeToMinutes(sl.endTime);
        if (earliestMinutes !== null && slotStart < earliestMinutes) continue;
        if (latestMinutes !== null && slotEnd > latestMinutes) continue;
      }

      filtered.push(sl);
    }

    const mapped = filtered.map(sl => ({
      slotId: sl.id,
      serviceId: sl.serviceId,
      date: sl.date,
      startTime: sl.startTime,
      endTime: sl.endTime,
      timeWindowLabel: sl.timeWindowLabel,
      zip: sl.zip,
      isAvailable: !!sl.isAvailable,
      remainingCapacity: sl.remainingCapacity || sl.capacity || 0,
      service: service || this._getServiceById(sl.serviceId) // FK resolution
    }));

    return mapped;
  }

  // -------------------------------------------------------------
  // getServiceExtras(serviceId)
  // -------------------------------------------------------------

  getServiceExtras(serviceId) {
    // Currently no explicit mapping between services and add-ons in the data model,
    // so we return all active add-ons.
    const addons = this._getFromStorage('addons', []);
    const active = addons.filter(a => a.status === 'active');

    return active.map(a => ({
      addonId: a.id,
      name: a.name,
      description: a.description || '',
      category: a.category,
      categoryLabel: this._formatAddonCategoryLabel(a.category),
      basePrice: a.basePrice,
      currency: a.currency || 'usd',
      unitLabel: a.unitLabel || '',
      maxQuantity: a.maxQuantity || null,
      status: a.status,
      addon: this._clone(a) // FK resolution
    }));
  }

  // -------------------------------------------------------------
  // createServiceBooking(serviceId, serviceOptionId, schedule, contact, location, extras, promoCode, reminderMethod, notes)
  // -------------------------------------------------------------

  createServiceBooking(serviceId, serviceOptionId, schedule, contact, location, extras, promoCode, reminderMethod, notes) {
    schedule = schedule || {};
    contact = contact || {};
    location = location || {};
    extras = extras || [];

    const services = this._getFromStorage('services', []);
    const options = this._getFromStorage('service_options', []);
    const addons = this._getFromStorage('addons', []);
    const bookings = this._getFromStorage('bookings', []);
    const visits = this._getFromStorage('booking_visits', []);
    const visitAddons = this._getFromStorage('visit_addons', []);

    let service = services.find(s => s.id === serviceId) || null;
    const option = serviceOptionId ? options.find(o => o.id === serviceOptionId) : null;

    if (!service) {
      // Some services (like one-time yard cleanup) may appear only in availability slots
      // and not in the main services collection. In that case, create a minimal stub so
      // that bookings can still be created.
      if (serviceId === 'yard_cleanup') {
        service = {
          id: serviceId,
          serviceKey: serviceId,
          name: 'Yard Cleanup',
          shortDescription: '',
          longDescription: '',
          category: 'cleanup',
          supportsRecurring: false,
          supportsOneTime: true,
          supportsZipAvailability: true,
          supportsPropertySizeSelection: false,
          supportsLengthInput: false,
          ecoFriendlyOptionsAvailable: false,
          petSafeOptionsAvailable: false,
          baseMinPrice: 0
        };
      } else {
        return {
          success: false,
          bookingId: null,
          bookingCode: null,
          status: 'pending',
          serviceName: '',
          visitDate: schedule.visitDate || '',
          timeWindowLabel: schedule.timeWindowLabel || '',
          totalPrice: 0,
          currency: 'usd',
          promoCode: promoCode || null,
          discountAmount: 0,
          finalPrice: 0,
          confirmationMessage: 'Service not found.'
        };
      }
    }

    let basePrice = 0;
    if (option && typeof option.pricePerVisit === 'number') {
      basePrice = option.pricePerVisit;
    } else if (option && typeof option.minTotalPrice === 'number') {
      basePrice = option.minTotalPrice;
    } else if (typeof service.baseMinPrice === 'number') {
      basePrice = service.baseMinPrice;
    }

    // Extras pricing
    let extrasTotal = 0;
    const normalizedExtras = [];
    for (let i = 0; i < extras.length; i++) {
      const e = extras[i];
      if (!e || !e.addonId) continue;
      const addon = addons.find(a => a.id === e.addonId);
      if (!addon) continue;
      const qty = typeof e.quantity === 'number' && e.quantity > 0 ? e.quantity : 1;
      const lineTotal = addon.basePrice * qty;
      extrasTotal += lineTotal;
      normalizedExtras.push({ addonId: e.addonId, quantity: qty });
    }

    // Promo code only applies to base service price
    let promoObj = null;
    let discountAmount = 0;
    let finalServicePrice = basePrice;
    if (promoCode) {
      promoObj = this._findPromoByCode(promoCode);
      if (promoObj) {
        // Validate against service option
        const fakeApply = this.applyPromoCodeToServiceOption(promoCode, serviceOptionId || '');
        if (fakeApply.valid) {
          discountAmount = fakeApply.discountAmount;
          finalServicePrice = fakeApply.finalPrice;
          this._incrementPromoUsage(promoObj);
        }
      }
    }

    const totalPrice = finalServicePrice + extrasTotal;
    const finalPrice = totalPrice;

    const bookingId = this._generateId('booking');
    const bookingCode = this._generateBookingCode();
    const createdAt = this._nowIso();

    const booking = {
      id: bookingId,
      bookingCode: bookingCode,
      bookingType: 'single_service',
      serviceId: service.id,
      serviceOptionId: option ? option.id : null,
      planId: null,
      bundleId: null,
      quoteRequestId: null,
      status: 'confirmed',
      totalPrice: finalPrice,
      currency: 'usd',
      promoCode: promoObj ? promoObj.code : promoCode || null,
      discountAmount: discountAmount,
      contactFirstName: contact.firstName || '',
      contactLastName: contact.lastName || '',
      contactEmail: contact.email || '',
      contactPhone: contact.phone || '',
      streetAddress: location.streetAddress || '',
      city: location.city || '',
      zip: location.zip || (schedule.locationZip || ''),
      propertyType: location.propertyType || 'single_family_home',
      yardSize: location.yardSize || null,
      yardSizeUnit: location.yardSizeUnit || null,
      reminderMethod: reminderMethod || 'email',
      notes: notes || '',
      createdAt: createdAt
    };

    bookings.push(booking);

    const visitId = this._generateId('visit');
    const visitDateIso = schedule.visitDate
      ? schedule.visitDate + 'T00:00:00.000Z'
      : createdAt;

    const startDateTimeIso = schedule.visitDate && schedule.startTime
      ? schedule.visitDate + 'T' + schedule.startTime + ':00.000Z'
      : createdAt;
    const endDateTimeIso = schedule.visitDate && schedule.endTime
      ? schedule.visitDate + 'T' + schedule.endTime + ':00.000Z'
      : createdAt;

    const visit = {
      id: visitId,
      bookingId: bookingId,
      serviceId: service.id,
      serviceOptionId: option ? option.id : null,
      visitDate: visitDateIso,
      startTime: startDateTimeIso,
      endTime: endDateTimeIso,
      timeWindowLabel: schedule.timeWindowLabel || '',
      locationZip: schedule.locationZip || location.zip || '',
      status: 'scheduled',
      isRecurring: !!schedule.isRecurring,
      recurrenceFrequency: schedule.recurrenceFrequency || 'one_time',
      extras: this._clone(normalizedExtras),
      createdAt: createdAt
    };
    visits.push(visit);

    // Create VisitAddon line items
    for (let i = 0; i < normalizedExtras.length; i++) {
      const ex = normalizedExtras[i];
      const addon = addons.find(a => a.id === ex.addonId);
      if (!addon) continue;
      const va = {
        id: this._generateId('visitaddon'),
        bookingVisitId: visitId,
        addonId: addon.id,
        quantity: ex.quantity,
        pricePerUnit: addon.basePrice,
        totalPrice: addon.basePrice * ex.quantity
      };
      visitAddons.push(va);
    }

    this._saveToStorage('bookings', bookings);
    this._saveToStorage('booking_visits', visits);
    this._saveToStorage('visit_addons', visitAddons);

    return {
      success: true,
      bookingId: bookingId,
      bookingCode: bookingCode,
      status: booking.status,
      serviceName: service.name,
      visitDate: schedule.visitDate || '',
      timeWindowLabel: schedule.timeWindowLabel || '',
      totalPrice: totalPrice,
      currency: 'usd',
      promoCode: booking.promoCode,
      discountAmount: discountAmount,
      finalPrice: finalPrice,
      confirmationMessage: 'Your booking is confirmed.'
    };
  }

  // -------------------------------------------------------------
  // applyPromoCodeToServiceOption(promoCode, serviceOptionId)
  // -------------------------------------------------------------

  applyPromoCodeToServiceOption(promoCode, serviceOptionId) {
    const options = this._getFromStorage('service_options', []);
    const services = this._getFromStorage('services', []);
    const promo = this._findPromoByCode(promoCode);

    const opt = options.find(o => o.id === serviceOptionId);
    if (!opt) {
      return {
        valid: false,
        message: 'Service option not found.',
        discountType: null,
        discountValue: 0,
        minServicePrice: promo && promo.minServicePrice ? promo.minServicePrice : 0,
        originalPrice: 0,
        discountAmount: 0,
        finalPrice: 0
      };
    }

    const originalPrice = typeof opt.pricePerVisit === 'number'
      ? opt.pricePerVisit
      : typeof opt.minTotalPrice === 'number'
        ? opt.minTotalPrice
        : typeof opt.monthlyPrice === 'number'
          ? opt.monthlyPrice
          : 0;

    if (!promo) {
      return {
        valid: false,
        message: 'Promo code not found.',
        discountType: null,
        discountValue: 0,
        minServicePrice: 0,
        originalPrice: originalPrice,
        discountAmount: 0,
        finalPrice: originalPrice
      };
    }

    // Check active window
    const now = new Date();
    if (promo.startDate && new Date(promo.startDate) > now) {
      return {
        valid: false,
        message: 'Promo code is not yet active.',
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        minServicePrice: promo.minServicePrice || 0,
        originalPrice: originalPrice,
        discountAmount: 0,
        finalPrice: originalPrice
      };
    }
    if (promo.endDate && new Date(promo.endDate) < now) {
      return {
        valid: false,
        message: 'Promo code has expired.',
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        minServicePrice: promo.minServicePrice || 0,
        originalPrice: originalPrice,
        discountAmount: 0,
        finalPrice: originalPrice
      };
    }

    // Usage limits
    if (typeof promo.maxUses === 'number' && typeof promo.usageCount === 'number') {
      if (promo.usageCount >= promo.maxUses) {
        return {
          valid: false,
          message: 'Promo code usage limit reached.',
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          minServicePrice: promo.minServicePrice || 0,
          originalPrice: originalPrice,
          discountAmount: 0,
          finalPrice: originalPrice
        };
      }
    }

    // minServicePrice
    if (typeof promo.minServicePrice === 'number' && originalPrice < promo.minServicePrice) {
      return {
        valid: false,
        message: 'Service price does not meet the minimum for this promo.',
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        minServicePrice: promo.minServicePrice || 0,
        originalPrice: originalPrice,
        discountAmount: 0,
        finalPrice: originalPrice
      };
    }

    // applicableServiceIds
    if (Array.isArray(promo.applicableServiceIds) && promo.applicableServiceIds.length > 0) {
      const service = services.find(s => s.id === opt.serviceId);
      if (!service || promo.applicableServiceIds.indexOf(service.id) === -1) {
        return {
          valid: false,
          message: 'Promo code is not valid for this service.',
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          minServicePrice: promo.minServicePrice || 0,
          originalPrice: originalPrice,
          discountAmount: 0,
          finalPrice: originalPrice
        };
      }
    }

    const pricing = this._calculatePriceWithPromo(promo, originalPrice);

    return {
      valid: true,
      message: 'Promo code applied.',
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minServicePrice: promo.minServicePrice || 0,
      originalPrice: originalPrice,
      discountAmount: pricing.discountAmount,
      finalPrice: pricing.finalPrice
    };
  }

  // -------------------------------------------------------------
  // lookupBookingByCode(bookingCode, lastName)
  // -------------------------------------------------------------

  lookupBookingByCode(bookingCode, lastName) {
    const bookings = this._getFromStorage('bookings', []);
    const services = this._getFromStorage('services', []);
    const plans = this._getFromStorage('plans', []);
    const bundles = this._getFromStorage('custom_bundles', []);
    const visits = this._getFromStorage('booking_visits', []);

    const lastLower = String(lastName || '').trim().toLowerCase();

    let booking = null;
    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      if (String(b.bookingCode) === String(bookingCode) &&
          String(b.contactLastName || '').trim().toLowerCase() === lastLower) {
        booking = b;
        break;
      }
    }

    if (!booking) {
      return {
        found: false,
        errorMessage: 'Booking not found.',
        bookingSummary: null
      };
    }

    const service = booking.serviceId ? services.find(s => s.id === booking.serviceId) : null;
    const plan = booking.planId ? plans.find(p => p.id === booking.planId) : null;
    const bundle = booking.bundleId ? bundles.find(b => b.id === booking.bundleId) : null;

    const upcomingVisitsRaw = visits.filter(v => v.bookingId === booking.id && v.status === 'scheduled');

    const upcomingVisits = upcomingVisitsRaw.map(v => {
      const s = services.find(srv => srv.id === v.serviceId) || null;
      const item = {
        visitId: v.id,
        serviceName: s ? s.name : '',
        visitDate: v.visitDate,
        timeWindowLabel: v.timeWindowLabel,
        status: v.status
      };
      // FK resolution
      item.visit = this._clone(v);
      return item;
    });

    const bookingSummary = {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      bookingType: booking.bookingType,
      serviceName: service ? service.name : '',
      planName: plan ? plan.name : '',
      bundleStatus: bundle ? bundle.status : '',
      streetAddress: booking.streetAddress || '',
      city: booking.city || '',
      zip: booking.zip || '',
      upcomingVisits,
      booking: this._clone(booking) // FK resolution
    };

    return {
      found: true,
      errorMessage: '',
      bookingSummary
    };
  }

  // -------------------------------------------------------------
  // getBookingSummary(bookingId)
  // -------------------------------------------------------------

  getBookingSummary(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const services = this._getFromStorage('services', []);
    const plans = this._getFromStorage('plans', []);
    const visits = this._getFromStorage('booking_visits', []);

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      return null;
    }

    const service = booking.serviceId ? services.find(s => s.id === booking.serviceId) : null;
    const plan = booking.planId ? plans.find(p => p.id === booking.planId) : null;

    const upcomingVisitsRaw = visits.filter(v => v.bookingId === booking.id && v.status === 'scheduled');

    const upcomingVisits = upcomingVisitsRaw.map(v => {
      const s = services.find(srv => srv.id === v.serviceId) || null;
      const item = {
        visitId: v.id,
        serviceName: s ? s.name : '',
        visitDate: v.visitDate,
        timeWindowLabel: v.timeWindowLabel,
        status: v.status
      };
      item.visit = this._clone(v); // FK resolution
      return item;
    });

    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      bookingType: booking.bookingType,
      serviceName: service ? service.name : '',
      planName: plan ? plan.name : '',
      customerName: (booking.contactFirstName || '') + (booking.contactLastName ? ' ' + booking.contactLastName : ''),
      contactEmail: booking.contactEmail || '',
      contactPhone: booking.contactPhone || '',
      streetAddress: booking.streetAddress || '',
      city: booking.city || '',
      zip: booking.zip || '',
      totalPrice: booking.totalPrice || 0,
      currency: booking.currency || 'usd',
      promoCode: booking.promoCode || null,
      discountAmount: booking.discountAmount || 0,
      finalPrice: booking.totalPrice || 0,
      upcomingVisits,
      booking: this._clone(booking) // FK resolution
    };
  }

  // -------------------------------------------------------------
  // getBookingVisitDetails(bookingVisitId)
  // -------------------------------------------------------------

  getBookingVisitDetails(bookingVisitId) {
    const visits = this._getFromStorage('booking_visits', []);
    const bookings = this._getFromStorage('bookings', []);
    const services = this._getFromStorage('services', []);
    const visitAddons = this._getFromStorage('visit_addons', []);
    const addons = this._getFromStorage('addons', []);

    const visitRow = visits.find(v => v.id === bookingVisitId);
    if (!visitRow) {
      return { visit: null, currentAddons: [] };
    }

    const service = services.find(s => s.id === visitRow.serviceId) || null;

    const visit = {
      visitId: visitRow.id,
      bookingId: visitRow.bookingId,
      serviceId: visitRow.serviceId,
      serviceName: service ? service.name : '',
      visitDate: visitRow.visitDate,
      startTime: visitRow.startTime,
      endTime: visitRow.endTime,
      timeWindowLabel: visitRow.timeWindowLabel,
      locationZip: visitRow.locationZip || '',
      status: visitRow.status,
      isRecurring: !!visitRow.isRecurring,
      recurrenceFrequency: visitRow.recurrenceFrequency || 'one_time'
    };

    // FK resolution for visit: booking & service
    visit.booking = bookings.find(b => b.id === visitRow.bookingId) || null;
    visit.service = service;

    const currentAddonsRows = visitAddons.filter(va => va.bookingVisitId === bookingVisitId);

    const currentAddons = currentAddonsRows.map(va => {
      const addon = addons.find(a => a.id === va.addonId) || null;
      return {
        visitAddonId: va.id,
        addonId: va.addonId,
        addonName: addon ? addon.name : '',
        category: addon ? addon.category : 'other',
        quantity: va.quantity,
        pricePerUnit: va.pricePerUnit,
        totalPrice: va.totalPrice,
        addon: addon // FK resolution
      };
    });

    return {
      visit,
      currentAddons
    };
  }

  // -------------------------------------------------------------
  // getAddonFilterOptions
  // -------------------------------------------------------------

  getAddonFilterOptions() {
    const addons = this._getFromStorage('addons', []);

    const categoriesEnum = [
      'plant_soil_care',
      'debris_removal',
      'pest_treatment',
      'lawn_treatment',
      'gutter_cleaning',
      'other'
    ];

    const categories = categoriesEnum.map(v => ({
      value: v,
      label: this._formatAddonCategoryLabel(v)
    }));

    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < addons.length; i++) {
      const p = addons[i].basePrice;
      if (typeof p === 'number') {
        if (minPrice === null || p < minPrice) minPrice = p;
        if (maxPrice === null || p > maxPrice) maxPrice = p;
      }
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    return {
      categories,
      priceRange: {
        minPrice,
        maxPrice,
        step: 5
      }
    };
  }

  // -------------------------------------------------------------
  // searchAddons(filters)
  // -------------------------------------------------------------

  searchAddons(filters) {
    filters = filters || {};
    const addons = this._getFromStorage('addons', []);

    let results = addons.slice();

    if (filters.category) {
      results = results.filter(a => a.category === filters.category);
    }
    if (typeof filters.maxPrice === 'number') {
      results = results.filter(a => a.basePrice <= filters.maxPrice);
    }
    if (filters.searchTerm) {
      const q = String(filters.searchTerm).toLowerCase();
      results = results.filter(a => {
        return (
          String(a.name || '').toLowerCase().indexOf(q) !== -1 ||
          String(a.description || '').toLowerCase().indexOf(q) !== -1
        );
      });
    }
    // filters.applicableServiceId is ignored due to missing mapping in data model

    return results.map(a => ({
      addonId: a.id,
      name: a.name,
      description: a.description || '',
      category: a.category,
      categoryLabel: this._formatAddonCategoryLabel(a.category),
      basePrice: a.basePrice,
      currency: a.currency || 'usd',
      maxQuantity: a.maxQuantity || null,
      unitLabel: a.unitLabel || '',
      status: a.status,
      addon: this._clone(a) // FK resolution
    }));
  }

  // -------------------------------------------------------------
  // updateVisitAddonsForVisit(bookingVisitId, addons)
  // -------------------------------------------------------------

  updateVisitAddonsForVisit(bookingVisitId, addonsArr) {
    addonsArr = addonsArr || [];

    const visit = this._getBookingVisitById(bookingVisitId);
    if (!visit) {
      return {
        success: false,
        bookingVisitId,
        updatedAddons: [],
        visitTotalPrice: 0,
        message: 'Visit not found.'
      };
    }

    const visitAddonsTable = this._getFromStorage('visit_addons', []);
    const addonsTable = this._getFromStorage('addons', []);
    const bookings = this._getFromStorage('bookings', []);
    const serviceOptions = this._getFromStorage('service_options', []);

    // Remove existing add-ons for this visit
    const remaining = visitAddonsTable.filter(va => va.bookingVisitId !== bookingVisitId);

    const newRows = [];
    let extrasTotal = 0;

    for (let i = 0; i < addonsArr.length; i++) {
      const item = addonsArr[i];
      if (!item || !item.addonId) continue;
      const addon = addonsTable.find(a => a.id === item.addonId);
      if (!addon) continue;

      let qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      if (typeof addon.maxQuantity === 'number' && qty > addon.maxQuantity) {
        qty = addon.maxQuantity;
      }

      const pricePerUnit = addon.basePrice;
      const totalPrice = pricePerUnit * qty;
      extrasTotal += totalPrice;

      newRows.push({
        id: this._generateId('visitaddon'),
        bookingVisitId: bookingVisitId,
        addonId: addon.id,
        quantity: qty,
        pricePerUnit: pricePerUnit,
        totalPrice: totalPrice
      });
    }

    const finalTable = remaining.concat(newRows);
    this._saveToStorage('visit_addons', finalTable);

    // Compute base visit price from service option or booking
    const booking = bookings.find(b => b.id === visit.bookingId) || null;
    let basePrice = 0;
    if (visit.serviceOptionId) {
      const opt = serviceOptions.find(o => o.id === visit.serviceOptionId);
      if (opt && typeof opt.pricePerVisit === 'number') {
        basePrice = opt.pricePerVisit;
      } else if (opt && typeof opt.minTotalPrice === 'number') {
        basePrice = opt.minTotalPrice;
      }
    }

    const visitTotalPrice = basePrice + extrasTotal;

    const updatedAddons = newRows.map(va => {
      const addon = addonsTable.find(a => a.id === va.addonId) || null;
      return {
        visitAddonId: va.id,
        addonId: va.addonId,
        addonName: addon ? addon.name : '',
        quantity: va.quantity,
        pricePerUnit: va.pricePerUnit,
        totalPrice: va.totalPrice,
        addon: addon // FK resolution
      };
    });

    return {
      success: true,
      bookingVisitId: bookingVisitId,
      updatedAddons,
      visitTotalPrice,
      message: 'Add-ons updated for visit.'
    };
  }

  // -------------------------------------------------------------
  // getQuoteFormOptions
  // -------------------------------------------------------------

  getQuoteFormOptions() {
    const services = this._getFromStorage('services', []);

    const propertyTypesEnum = [
      'single_family_home',
      'townhouse',
      'condo',
      'multi_family',
      'commercial',
      'other'
    ];

    const propertyTypes = propertyTypesEnum.map(v => ({
      value: v,
      label: this._formatPropertyTypeLabel(v)
    }));

    const designServices = services.map(s => ({
      serviceId: s.id,
      serviceKey: s.serviceKey,
      name: s.name,
      category: s.category,
      isDesignInstallation: s.category === 'design_installation'
    }));

    const budgetRanges = [
      { value: 'up_to_500', label: 'Up to $500', maxAmount: 500 },
      { value: 'up_to_1000', label: 'Up to $1,000', maxAmount: 1000 },
      { value: 'up_to_2000', label: 'Up to $2,000', maxAmount: 2000 },
      { value: 'above_2000', label: 'Above $2,000', maxAmount: null }
    ];

    // FK resolution for services (serviceId -> service)
    const servicesWithFk = designServices.map(item => ({
      serviceId: item.serviceId,
      serviceKey: item.serviceKey,
      name: item.name,
      category: item.category,
      isDesignInstallation: item.isDesignInstallation,
      service: this._getServiceById(item.serviceId)
    }));

    return {
      propertyTypes,
      services: servicesWithFk,
      budgetRanges
    };
  }

  // -------------------------------------------------------------
  // submitQuoteRequest(...)
  // -------------------------------------------------------------

  submitQuoteRequest(propertyType, yardSize, yardSizeUnit, servicesNeeded, budgetLabel, budgetMax, preferredStartDate, preferredEndDate, projectDescription, contactName, contactEmail, contactPhone, preferredContactMethod) {
    const quoteRequests = this._getFromStorage('quote_requests', []);

    const id = this._generateId('quote');
    const createdAt = this._nowIso();

    const qr = {
      id,
      propertyType,
      yardSize: typeof yardSize === 'number' ? yardSize : null,
      yardSizeUnit: yardSizeUnit || 'sq_ft',
      servicesNeeded: servicesNeeded || [],
      budgetLabel: budgetLabel || null,
      budgetMax: typeof budgetMax === 'number' ? budgetMax : null,
      preferredStartDate: preferredStartDate || null,
      preferredEndDate: preferredEndDate || null,
      projectDescription: projectDescription || '',
      contactName: contactName || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      preferredContactMethod: preferredContactMethod || 'email',
      status: 'submitted',
      createdAt
    };

    quoteRequests.push(qr);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      quoteRequestId: id,
      status: qr.status,
      confirmationMessage: 'Your quote request has been submitted.'
    };
  }

  // -------------------------------------------------------------
  // getBundleBuilderOptions
  // -------------------------------------------------------------

  getBundleBuilderOptions() {
    const services = this._getFromStorage('services', []);
    const yardSizeOptions = this._getFromStorage('property_size_options', []);

    const propertyTypesEnum = [
      'single_family_home',
      'townhouse',
      'condo',
      'multi_family',
      'commercial',
      'other'
    ];

    const propertyTypes = propertyTypesEnum.map(v => ({
      value: v,
      label: this._formatPropertyTypeLabel(v)
    }));

    const bundleServices = services.map(s => ({
      serviceId: s.id,
      serviceKey: s.serviceKey,
      name: s.name,
      category: s.category,
      isBundleEligible: true,
      baseMinPrice: s.baseMinPrice || 0,
      service: this._clone(s) // FK resolution
    }));

    const ysOptions = yardSizeOptions.map(o => ({
      id: o.id,
      label: o.label,
      minSize: o.minSize,
      maxSize: o.maxSize,
      unit: o.unit
    }));

    return {
      propertyTypes,
      yardSizeOptions: ysOptions,
      bundleServices
    };
  }

  // -------------------------------------------------------------
  // calculateBundleEstimate(propertyType, yardSizeOptionId, servicesSelected, budgetMax)
  // -------------------------------------------------------------

  calculateBundleEstimate(propertyType, yardSizeOptionId, servicesSelected, budgetMax) {
    const services = this._getFromStorage('services', []);
    const yardSizeOptions = this._getFromStorage('property_size_options', []);

    const ys = yardSizeOptions.find(o => o.id === yardSizeOptionId) || null;

    const serviceItems = [];
    let estimateTotal = 0;

    for (let i = 0; i < servicesSelected.length; i++) {
      const sid = servicesSelected[i];
      const svc = services.find(s => s.id === sid);
      if (!svc) continue;
      const base = svc.baseMinPrice || 0;
      // Simple scaling factor based on yard size range (optional, minimal)
      let factor = 1;
      if (ys && typeof ys.maxSize === 'number' && ys.maxSize > 1500) {
        factor = 1.2;
      }
      const estimatedPrice = Math.round(base * factor);
      estimateTotal += estimatedPrice;
      serviceItems.push({
        serviceId: sid,
        serviceName: svc.name,
        estimatedPrice,
        service: this._clone(svc) // FK resolution
      });
    }

    const withinBudget = typeof budgetMax === 'number' ? estimateTotal <= budgetMax : true;

    return {
      serviceItems,
      estimateTotal,
      budgetMax: typeof budgetMax === 'number' ? budgetMax : null,
      withinBudget
    };
  }

  // -------------------------------------------------------------
  // submitCustomBundleRequest(...)
  // -------------------------------------------------------------

  submitCustomBundleRequest(propertyType, yardSizeOptionId, yardSizeMin, yardSizeMax, yardSizeUnit, servicesSelected, estimateTotal, budgetMax, scheduledDate, timeWindowLabel, contactName, contactPhone, notes) {
    const customBundles = this._getFromStorage('custom_bundles', []);
    const yardSizeOptions = this._getFromStorage('property_size_options', []);

    const ys = yardSizeOptions.find(o => o.id === yardSizeOptionId) || null;

    const id = this._generateId('bundle');
    const createdAt = this._nowIso();

    const bundle = {
      id,
      propertyType,
      yardSizeOptionLabel: ys ? ys.label : null,
      yardSizeMin: typeof yardSizeMin === 'number' ? yardSizeMin : ys ? ys.minSize : null,
      yardSizeMax: typeof yardSizeMax === 'number' ? yardSizeMax : ys ? ys.maxSize : null,
      yardSizeUnit: yardSizeUnit || (ys ? ys.unit : 'sq_ft'),
      servicesSelected: servicesSelected || [],
      serviceItems: null,
      estimateTotal: typeof estimateTotal === 'number' ? estimateTotal : 0,
      budgetMax: typeof budgetMax === 'number' ? budgetMax : null,
      withinBudget: typeof budgetMax === 'number' ? estimateTotal <= budgetMax : true,
      scheduledDate: scheduledDate,
      timeWindowLabel: timeWindowLabel || '',
      contactName: contactName || '',
      contactPhone: contactPhone || '',
      status: 'submitted',
      notes: notes || '',
      createdAt
    };

    customBundles.push(bundle);
    this._saveToStorage('custom_bundles', customBundles);

    return {
      success: true,
      customBundleRequestId: id,
      status: bundle.status,
      confirmationMessage: 'Your custom bundle request has been submitted.'
    };
  }

  // -------------------------------------------------------------
  // getBlogIndexContent
  // -------------------------------------------------------------

  getBlogIndexContent() {
    const articles = this._getFromStorage('blog_articles', []);
    const published = articles.filter(a => a.isPublished);

    const sorted = published.slice().sort((a, b) => {
      const da = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const db = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return db - da;
    });

    const featuredArticles = sorted.slice(0, 3).map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt || '',
      category: a.category || 'other',
      categoryLabel: this._formatBlogCategoryLabel(a.category || 'other'),
      publishedAt: a.publishedAt || a.createdAt || ''
    }));

    const recentArticles = sorted.slice(3, 13).map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt || '',
      category: a.category || 'other',
      categoryLabel: this._formatBlogCategoryLabel(a.category || 'other'),
      publishedAt: a.publishedAt || a.createdAt || ''
    }));

    const categoryCounts = {};
    for (let i = 0; i < published.length; i++) {
      const c = published[i].category || 'other';
      if (!categoryCounts[c]) categoryCounts[c] = 0;
      categoryCounts[c]++;
    }

    const categories = Object.keys(categoryCounts).map(c => ({
      value: c,
      label: this._formatBlogCategoryLabel(c),
      articleCount: categoryCounts[c]
    }));

    return {
      featuredArticles,
      recentArticles,
      categories
    };
  }

  // -------------------------------------------------------------
  // searchBlogArticles(query, filters)
  // -------------------------------------------------------------

  searchBlogArticles(query, filters) {
    filters = filters || {};
    const articles = this._getFromStorage('blog_articles', []);

    const q = String(query || '').toLowerCase();
    let results = articles.filter(a => a.isPublished);

    if (q) {
      results = results.filter(a => {
        const h = (a.title || '') + ' ' + (a.excerpt || '') + ' ' + (a.content || '');
        return h.toLowerCase().indexOf(q) !== -1;
      });
    }

    if (filters.category) {
      results = results.filter(a => a.category === filters.category);
    }
    if (filters.tag) {
      const tagLower = String(filters.tag).toLowerCase();
      results = results.filter(a => Array.isArray(a.tags) && a.tags.some(t => String(t).toLowerCase() === tagLower));
    }

    return results.map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt || '',
      category: a.category || 'other',
      categoryLabel: this._formatBlogCategoryLabel(a.category || 'other'),
      publishedAt: a.publishedAt || a.createdAt || ''
    }));
  }

  // -------------------------------------------------------------
  // getBlogArticleBySlug(slug)
  // -------------------------------------------------------------

  getBlogArticleBySlug(slug) {
    const articles = this._getFromStorage('blog_articles', []);
    const article = articles.find(a => a.slug === slug) || null;

    if (!article) {
      return {
        article: null,
        relatedArticles: []
      };
    }

    const relatedRaw = articles.filter(
      a => a.id !== article.id && a.category === article.category && a.isPublished
    );

    const relatedArticles = relatedRaw.slice(0, 3).map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      category: a.category || 'other'
    }));

    return {
      article: {
        id: article.id,
        slug: article.slug,
        title: article.title,
        content: article.content || '',
        category: article.category || 'other',
        categoryLabel: this._formatBlogCategoryLabel(article.category || 'other'),
        tags: article.tags || [],
        isPublished: !!article.isPublished,
        publishedAt: article.publishedAt || article.createdAt || ''
      },
      relatedArticles
    };
  }

  // -------------------------------------------------------------
  // subscribeToNewsletterFromArticle(email, zip, wantsSeasonalTips, articleId)
  // -------------------------------------------------------------

  subscribeToNewsletterFromArticle(email, zip, wantsSeasonalTips, articleId) {
    const subs = this._getFromStorage('newsletter_subscriptions', []);

    const id = this._generateId('nls');
    const createdAt = this._nowIso();

    const sub = {
      id,
      email: email || '',
      zip: zip || '',
      wantsSeasonalTips: !!wantsSeasonalTips,
      source: 'blog_article',
      articleId: articleId || null,
      createdAt
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscriptionId: id,
      confirmationMessage: 'You have been subscribed to the newsletter.'
    };
  }

  // -------------------------------------------------------------
  // getAboutPageContent
  // -------------------------------------------------------------

  getAboutPageContent() {
    const about = this._getFromStorage('cms_about_page', null) || {
      headline: '',
      subheading: '',
      bodyHtml: '',
      serviceAreas: [],
      contact: { phone: '', email: '', hours: '' }
    };

    return {
      headline: about.headline || '',
      subheading: about.subheading || '',
      bodyHtml: about.bodyHtml || '',
      serviceAreas: about.serviceAreas || [],
      contact: about.contact || { phone: '', email: '', hours: '' }
    };
  }

  // -------------------------------------------------------------
  // submitContactForm
  // -------------------------------------------------------------

  submitContactForm(name, email, phone, message) {
    const tickets = this._getFromStorage('contact_tickets', []);

    const id = this._generateId('ticket');
    const createdAt = this._nowIso();

    const ticket = {
      id,
      name: name || '',
      email: email || '',
      phone: phone || '',
      message: message || '',
      status: 'open',
      createdAt
    };

    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      ticketId: id,
      confirmationMessage: 'Your message has been sent. We will get back to you soon.'
    };
  }

  // -------------------------------------------------------------
  // getPolicies(policyType)
  // -------------------------------------------------------------

  getPolicies(policyType) {
    const policies = this._getFromStorage('policies', []);
    if (policyType === 'all') {
      return policies.map(p => ({
        policyType: p.policyType,
        title: p.title,
        contentHtml: p.contentHtml || '',
        lastUpdated: p.lastUpdated || ''
      }));
    }

    return policies
      .filter(p => p.policyType === policyType)
      .map(p => ({
        policyType: p.policyType,
        title: p.title,
        contentHtml: p.contentHtml || '',
        lastUpdated: p.lastUpdated || ''
      }));
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
