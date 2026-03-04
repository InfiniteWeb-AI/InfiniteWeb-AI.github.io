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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Generic array-based tables
    const arrayKeys = [
      // Example legacy keys from template (kept for compatibility)
      'users',
      'products',
      'carts',
      'cartItems',
      // Domain-specific keys
      'product_categories',
      'product_templates',
      'certifications',
      'factories',
      'factory_product_capabilities',
      'quote_requests',
      'fabrics',
      'sourcing_lists',
      'sourcing_list_items',
      'projects',
      'project_product_items',
      'shipping_methods',
      'consultation_types',
      'consultation_bookings',
      'favorite_factories',
      'cost_estimates',
      'cost_estimate_shipping_options',
      'suppliers',
      'shortlist_items',
      'resources',
      'reading_list_items',
      'contact_inquiries'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Home & About content defaults (only if not present)
    if (!localStorage.getItem('home_overview')) {
      const home = this._createDefaultHomeOverview();
      localStorage.setItem('home_overview', JSON.stringify(home));
    }

    if (!localStorage.getItem('about_page_content')) {
      const about = this._createDefaultAboutPageContent();
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    // Seed static configuration-like tables if empty
    // Shipping methods
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    if (!shippingMethods || shippingMethods.length === 0) {
      const seeded = [
        {
          id: 'ship_sea_standard',
          name: 'Sea Freight (4–6 weeks)',
          type: 'sea_freight',
          transit_time_min_days: 28,
          transit_time_max_days: 42,
          description: 'Cost-effective sea freight option for bulk apparel orders.',
          is_active: true
        },
        {
          id: 'ship_air_express',
          name: 'Air Freight Express (5–8 days)',
          type: 'air_freight',
          transit_time_min_days: 5,
          transit_time_max_days: 8,
          description: 'Faster air freight for urgent shipments.',
          is_active: true
        }
      ];
      this._saveToStorage('shipping_methods', seeded);
    }

    // Consultation types
    const consultationTypes = this._getFromStorage('consultation_types', []);
    if (!consultationTypes || consultationTypes.length === 0) {
      const seeded = [
        {
          id: 'consult_30_sourcing',
          code: 'sourcing_consultation_30_min',
          name: '30-minute sourcing consultation',
          duration_minutes: 30,
          description: 'Quick virtual call to review your sourcing needs and timelines.'
        },
        {
          id: 'consult_60_sourcing',
          code: 'sourcing_consultation_60_min',
          name: '60-minute sourcing consultation',
          duration_minutes: 60,
          description: 'In-depth session to map your supply chain, budgets, and roadmap.'
        },
        {
          id: 'consult_30_production',
          code: 'production_planning_30_min',
          name: '30-minute production planning',
          duration_minutes: 30,
          description: 'Discuss production timelines, MOQs, and factory capacity.'
        }
      ];
      this._saveToStorage('consultation_types', seeded);
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      return fallback !== undefined ? fallback : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
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

  // ----------------------
  // Default content creators
  // ----------------------

  _createDefaultHomeOverview() {
    return {
      hero_headline: 'Sustainable apparel sourcing & manufacturing',
      hero_subheadline: 'Connect with vetted factories, fabrics, and partners for your next collection.',
      company_summary: 'We help fashion brands of all sizes source sustainable fabrics and manufacture apparel with trusted partners worldwide.',
      sustainability_summary: 'Our network focuses on certified materials and responsible production, including GOTS, GRS, and BSCI-compliant partners.',
      primary_sections: [
        { key: 'factories', label: 'Factories', description: 'Browse vetted cut-and-sew partners by category, certification, and lead time.' },
        { key: 'fabrics', label: 'Fabrics', description: 'Source sustainable fabrics with transparent pricing and certifications.' },
        { key: 'suppliers', label: 'Suppliers & Partners', description: 'Discover print-on-demand, fulfillment, and specialty service partners.' },
        { key: 'projects', label: 'Projects', description: 'Plan and track production projects across products and factories.' },
        { key: 'consultation', label: 'Consultation', description: 'Book a virtual call to review your sourcing roadmap.' },
        { key: 'tools', label: 'Tools', description: 'Estimate landed cost and plan logistics with built-in calculators.' }
      ],
      featured_factories: [],
      featured_fabrics: [],
      featured_resources: []
    };
  }

  _createDefaultAboutPageContent() {
    return {
      company_history: 'Founded by apparel sourcing specialists, our team has helped hundreds of brands bring sustainable collections to market.',
      mission: 'To make sustainable apparel sourcing simple, transparent, and accessible to brands of all sizes.',
      expertise: 'We specialize in organic cotton, recycled synthetics, and performance fabrics across streetwear, activewear, and basics.',
      sustainability_credentials: [
        {
          title: 'Certified supply chain partners',
          description: 'We prioritize factories and mills with certifications like GOTS, GRS, and BSCI.'
        },
        {
          title: 'Material traceability',
          description: 'We work closely with suppliers to document material origin and chain-of-custody.'
        }
      ],
      key_differentiators: [
        {
          title: 'Curated network',
          description: 'We work with a curated network of vetted partners rather than a public marketplace.'
        },
        {
          title: 'End-to-end support',
          description: 'From fabric sourcing to production planning and shipping, we support your full lifecycle.'
        }
      ],
      engagement_process_steps: [
        {
          step_number: 1,
          title: 'Discovery & consultation',
          description: 'We start with a structured consultation to map your goals, volumes, and timelines.'
        },
        {
          step_number: 2,
          title: 'Sourcing & matching',
          description: 'We match you with suitable factories, mills, and partners from our network.'
        },
        {
          step_number: 3,
          title: 'Sampling & costing',
          description: 'You review samples, confirm specs, and finalize landed cost estimates.'
        },
        {
          step_number: 4,
          title: 'Production & logistics',
          description: 'We support production monitoring and logistics planning through to delivery.'
        }
      ]
    };
  }

  // ----------------------
  // Shared helpers
  // ----------------------

  _getOrCreateFavoritesStore() {
    const favorites = this._getFromStorage('favorite_factories', []);
    if (!Array.isArray(favorites)) {
      this._saveToStorage('favorite_factories', []);
      return [];
    }
    return favorites;
  }

  _getOrCreateShortlistStore() {
    const items = this._getFromStorage('shortlist_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('shortlist_items', []);
      return [];
    }
    return items;
  }

  _getReadingListStore() {
    const items = this._getFromStorage('reading_list_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('reading_list_items', []);
      return [];
    }
    return items;
  }

  _getCategoryIdsWithDescendants(rootIds) {
    const categories = this._getFromStorage('product_categories', []);
    const idSet = new Set(rootIds || []);
    let added = true;
    while (added) {
      added = false;
      for (const cat of categories) {
        if (cat.parentCategoryId && idSet.has(cat.parentCategoryId) && !idSet.has(cat.id)) {
          idSet.add(cat.id);
          added = true;
        }
      }
    }
    return Array.from(idSet);
  }

  _resolveFactoryCertifications(factory) {
    const allCerts = this._getFromStorage('certifications', []);
    const result = [];
    const raw = factory.certifications || [];
    raw.forEach((ref) => {
      let cert = allCerts.find((c) => c.id === ref || (c.code && c.code.toLowerCase() === String(ref).toLowerCase()));
      if (cert) {
        result.push({ code: cert.code, name: cert.name });
      } else {
        result.push({ code: String(ref), name: String(ref) });
      }
    });
    return result;
  }

  _resolveFabricCertifications(fabric) {
    const allCerts = this._getFromStorage('certifications', []);
    const result = [];
    const raw = fabric.certifications || [];
    raw.forEach((ref) => {
      let cert = allCerts.find((c) => c.id === ref || (c.code && c.code.toLowerCase() === String(ref).toLowerCase()));
      if (cert) {
        result.push({ code: cert.code, name: cert.name });
      } else {
        result.push({ code: String(ref), name: String(ref) });
      }
    });
    return result;
  }

  _resolveFactorySummary(factory, favoritesSet) {
    const categories = this._getFromStorage('product_categories', []);
    const productCategories = (factory.product_category_ids || []).map((id) => {
      const cat = categories.find((c) => c.id === id);
      return cat ? { id: cat.id, name: cat.name } : null;
    }).filter(Boolean);

    return {
      id: factory.id,
      name: factory.name,
      description: factory.description || '',
      country: factory.country || '',
      city: factory.city || '',
      rating: typeof factory.rating === 'number' ? factory.rating : null,
      min_overall_moq: typeof factory.min_overall_moq === 'number' ? factory.min_overall_moq : null,
      avg_lead_time_days: typeof factory.avg_lead_time_days === 'number' ? factory.avg_lead_time_days : null,
      product_categories: productCategories,
      certifications: this._resolveFactoryCertifications(factory),
      image: factory.image || '',
      is_favorited: favoritesSet ? favoritesSet.has(factory.id) : false
    };
  }

  _filterAndSortFactories(factories, filters, sortBy) {
    const categories = this._getFromStorage('product_categories', []);
    let filtered = factories.slice();

    if (filters) {
      if (filters.productCategoryIds && filters.productCategoryIds.length > 0) {
        const expandedIds = this._getCategoryIdsWithDescendants(filters.productCategoryIds);
        filtered = filtered.filter((f) => {
          const ids = f.product_category_ids || [];
          return ids.some((id) => expandedIds.includes(id));
        });
      }

      if (filters.certificationCodes && filters.certificationCodes.length > 0) {
        const wanted = filters.certificationCodes.map((c) => String(c).toLowerCase());
        const allCerts = this._getFromStorage('certifications', []);
        filtered = filtered.filter((f) => {
          const raw = f.certifications || [];
          const codes = raw.map((ref) => {
            const cert = allCerts.find((c) => c.id === ref || (c.code && c.code.toLowerCase() === String(ref).toLowerCase()));
            return cert && cert.code ? cert.code.toLowerCase() : String(ref).toLowerCase();
          });
          return wanted.every((code) => codes.includes(code));
        });
      }

      if (typeof filters.minRating === 'number') {
        filtered = filtered.filter((f) => typeof f.rating === 'number' && f.rating >= filters.minRating);
      }

      if (typeof filters.maxMoqUnits === 'number') {
        filtered = filtered.filter((f) => typeof f.min_overall_moq === 'number' && f.min_overall_moq <= filters.maxMoqUnits);
      }

      if (typeof filters.maxLeadTimeDays === 'number') {
        filtered = filtered.filter((f) => typeof f.avg_lead_time_days === 'number' && f.avg_lead_time_days <= filters.maxLeadTimeDays);
      }

      if (filters.country) {
        const wantedCountry = String(filters.country).toLowerCase();
        filtered = filtered.filter((f) => (f.country || '').toLowerCase() === wantedCountry);
      }
    }

    // Sorting
    const sortKey = sortBy || 'name_asc';
    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'moq_asc': {
          const am = typeof a.min_overall_moq === 'number' ? a.min_overall_moq : Infinity;
          const bm = typeof b.min_overall_moq === 'number' ? b.min_overall_moq : Infinity;
          return am - bm;
        }
        case 'moq_desc': {
          const am = typeof a.min_overall_moq === 'number' ? a.min_overall_moq : -Infinity;
          const bm = typeof b.min_overall_moq === 'number' ? b.min_overall_moq : -Infinity;
          return bm - am;
        }
        case 'lead_time_asc': {
          const al = typeof a.avg_lead_time_days === 'number' ? a.avg_lead_time_days : Infinity;
          const bl = typeof b.avg_lead_time_days === 'number' ? b.avg_lead_time_days : Infinity;
          return al - bl;
        }
        case 'rating_desc': {
          const ar = typeof a.rating === 'number' ? a.rating : -Infinity;
          const br = typeof b.rating === 'number' ? b.rating : -Infinity;
          return br - ar;
        }
        case 'name_asc':
        default: {
          return (a.name || '').localeCompare(b.name || '');
        }
      }
    });

    return filtered;
  }

  _filterAndSortFabrics(fabrics, filters, sortBy) {
    let filtered = fabrics.slice();

    if (filters) {
      if (filters.certificationCodes && filters.certificationCodes.length > 0) {
        const wanted = filters.certificationCodes.map((c) => String(c).toLowerCase());
        const allCerts = this._getFromStorage('certifications', []);
        filtered = filtered.filter((fabric) => {
          const raw = fabric.certifications || [];
          const codes = raw.map((ref) => {
            const cert = allCerts.find((c) => c.id === ref || (c.code && c.code.toLowerCase() === String(ref).toLowerCase()));
            return cert && cert.code ? cert.code.toLowerCase() : String(ref).toLowerCase();
          });
          return wanted.every((code) => codes.includes(code));
        });
      }

      if (filters.compositionContains) {
        const needle = String(filters.compositionContains).toLowerCase();
        filtered = filtered.filter((f) => (f.composition || '').toLowerCase().includes(needle));
      }

      if (typeof filters.minWeightGsm === 'number') {
        filtered = filtered.filter((f) => typeof f.weight_gsm === 'number' && f.weight_gsm >= filters.minWeightGsm);
      }

      if (typeof filters.maxWeightGsm === 'number') {
        filtered = filtered.filter((f) => typeof f.weight_gsm === 'number' && f.weight_gsm <= filters.maxWeightGsm);
      }

      if (typeof filters.minPricePerMeter === 'number') {
        filtered = filtered.filter((f) => typeof f.price_per_meter === 'number' && f.price_per_meter >= filters.minPricePerMeter);
      }

      if (typeof filters.maxPricePerMeter === 'number') {
        filtered = filtered.filter((f) => typeof f.price_per_meter === 'number' && f.price_per_meter <= filters.maxPricePerMeter);
      }

      if (filters.color) {
        const wantedColor = String(filters.color).toLowerCase();
        filtered = filtered.filter((f) =>
          (f.available_colors || []).some((c) => String(c).toLowerCase() === wantedColor)
        );
      }

      if (typeof filters.maxLeadTimeDays === 'number') {
        filtered = filtered.filter((f) => typeof f.lead_time_days === 'number' && f.lead_time_days <= filters.maxLeadTimeDays);
      }
    }

    const sortKey = sortBy || 'name_asc';
    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'price_asc': {
          const ap = typeof a.price_per_meter === 'number' ? a.price_per_meter : Infinity;
          const bp = typeof b.price_per_meter === 'number' ? b.price_per_meter : Infinity;
          return ap - bp;
        }
        case 'price_desc': {
          const ap = typeof a.price_per_meter === 'number' ? a.price_per_meter : -Infinity;
          const bp = typeof b.price_per_meter === 'number' ? b.price_per_meter : -Infinity;
          return bp - ap;
        }
        case 'lead_time_asc': {
          const al = typeof a.lead_time_days === 'number' ? a.lead_time_days : Infinity;
          const bl = typeof b.lead_time_days === 'number' ? b.lead_time_days : Infinity;
          return al - bl;
        }
        case 'rating_desc': {
          const ar = typeof a.rating === 'number' ? a.rating : -Infinity;
          const br = typeof b.rating === 'number' ? b.rating : -Infinity;
          return br - ar;
        }
        case 'name_asc':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

    return filtered;
  }

  _getOrCreateSourcingList(sourcingListId, newList) {
    let lists = this._getFromStorage('sourcing_lists', []);
    let list = null;

    if (sourcingListId) {
      list = lists.find((l) => l.id === sourcingListId) || null;
    }

    if (!list && newList && newList.name) {
      const now = new Date().toISOString();
      list = {
        id: this._generateId('slist'),
        name: newList.name,
        description: newList.description || '',
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('sourcing_lists', lists);
    }

    if (!list) {
      // Fallback general list
      const now = new Date().toISOString();
      list = {
        id: this._generateId('slist'),
        name: 'General Sourcing List',
        description: '',
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage('sourcing_lists', lists);
    }

    return list;
  }

  _calculateLandedCostAndShippingOptions(productType, quantity, fobPricePerUnit, destinationRegion, currency) {
    const totalFob = quantity * fobPricePerUnit;

    // Simple heuristic shipping cost model (non-persistent, purely algorithmic)
    const baseMultiplier = 0.1; // 10% of FOB for baseline sea freight
    const regionFactorMap = {
      usa_west_coast: 1,
      usa_east_coast: 1.05,
      europe: 1.1,
      asia: 0.9,
      australia: 1.2,
      other: 1.15
    };
    const regionFactor = regionFactorMap[destinationRegion] || 1.15;

    const seaCost = totalFob * baseMultiplier * regionFactor;
    const airCost = totalFob * baseMultiplier * 3 * regionFactor;
    const expressCost = totalFob * baseMultiplier * 4.5 * regionFactor;

    const shippingOptions = [
      {
        name: 'Sea Freight Standard',
        method_type: 'sea_freight',
        carrier_name: '',
        cost_total: seaCost,
        cost_per_unit: seaCost / quantity,
        transit_time_min_days: 28,
        transit_time_max_days: 45
      },
      {
        name: 'Air Freight Economy',
        method_type: 'air_freight',
        carrier_name: '',
        cost_total: airCost,
        cost_per_unit: airCost / quantity,
        transit_time_min_days: 7,
        transit_time_max_days: 12
      },
      {
        name: 'Express Courier',
        method_type: 'express_courier',
        carrier_name: '',
        cost_total: expressCost,
        cost_per_unit: expressCost / quantity,
        transit_time_min_days: 3,
        transit_time_max_days: 6
      }
    ];

    return {
      total_fob_value: totalFob,
      currency: currency,
      shipping_options: shippingOptions
    };
  }

  _generateConsultationSlots(consultationTypeCode, date) {
    const types = this._getFromStorage('consultation_types', []);
    const type = types.find((t) => t.code === consultationTypeCode) || null;
    const duration = type ? type.duration_minutes : 30;

    const bookings = this._getFromStorage('consultation_bookings', []);
    const dayBookings = bookings.filter((b) =>
      b.consultation_type_code === consultationTypeCode &&
      b.status !== 'cancelled' &&
      typeof b.scheduled_start === 'string' &&
      b.scheduled_start.startsWith(date)
    );

    const takenStarts = new Set(dayBookings.map((b) => b.scheduled_start));

    // Generate slots from 09:00 to 17:00 local, step by duration
    const slots = [];
    const [year, month, day] = date.split('-').map((s) => parseInt(s, 10));
    if (!year || !month || !day) {
      return [];
    }

    const startHour = 9;
    const endHour = 17;
    let current = new Date(Date.UTC(year, month - 1, day, startHour, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, endHour, 0, 0));

    while (current < end) {
      const startIso = current.toISOString();
      const endDate = new Date(current.getTime() + duration * 60000);
      const endIso = endDate.toISOString();
      const isAvailable = !takenStarts.has(startIso);
      slots.push({ start: startIso, end: endIso, is_available: isAvailable });
      current = endDate;
    }

    return slots;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomeOverview
  getHomeOverview() {
    // Base content from storage
    const base = this._getFromStorage('home_overview', this._createDefaultHomeOverview());

    const factories = this._getFromStorage('factories', []);
    const fabrics = this._getFromStorage('fabrics', []);
    const resources = this._getFromStorage('resources', []);
    const favorites = this._getOrCreateFavoritesStore();
    const favoritesSet = new Set(favorites.map((f) => f.factoryId));

    // Featured factories: top 3 by rating
    const factoriesSorted = factories.slice().sort((a, b) => {
      const ar = typeof a.rating === 'number' ? a.rating : -Infinity;
      const br = typeof b.rating === 'number' ? b.rating : -Infinity;
      return br - ar;
    });

    const featuredFactories = factoriesSorted.slice(0, 3).map((f) => {
      const summary = this._resolveFactorySummary(f, favoritesSet);
      // remove is_favorited property to match homepage schema
      return {
        id: summary.id,
        name: summary.name,
        country: summary.country,
        city: summary.city,
        rating: summary.rating,
        min_overall_moq: summary.min_overall_moq,
        avg_lead_time_days: summary.avg_lead_time_days,
        product_categories: summary.product_categories,
        certifications: summary.certifications,
        image: summary.image
      };
    });

    // Featured fabrics: top 3 by rating or lowest price
    const fabricsSorted = fabrics.slice().sort((a, b) => {
      const ar = typeof a.rating === 'number' ? a.rating : 0;
      const br = typeof b.rating === 'number' ? b.rating : 0;
      if (ar === 0 && br === 0) {
        const ap = typeof a.price_per_meter === 'number' ? a.price_per_meter : Infinity;
        const bp = typeof b.price_per_meter === 'number' ? b.price_per_meter : Infinity;
        return ap - bp;
      }
      return br - ar;
    });

    const featuredFabrics = fabricsSorted.slice(0, 3).map((fab) => ({
      id: fab.id,
      name: fab.name,
      composition: fab.composition,
      price_per_meter: fab.price_per_meter,
      available_colors: fab.available_colors || [],
      certifications: this._resolveFabricCertifications(fab),
      rating: typeof fab.rating === 'number' ? fab.rating : null
    }));

    // Featured resources: latest 3
    const resourcesSorted = resources.slice().sort((a, b) => {
      const ad = a.published_at ? Date.parse(a.published_at) : 0;
      const bd = b.published_at ? Date.parse(b.published_at) : 0;
      return bd - ad;
    });

    const featuredResources = resourcesSorted.slice(0, 3).map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary || '',
      content_type: r.content_type,
      topics: r.topics || [],
      published_at: r.published_at || ''
    }));

    return {
      hero_headline: base.hero_headline,
      hero_subheadline: base.hero_subheadline,
      company_summary: base.company_summary,
      sustainability_summary: base.sustainability_summary,
      primary_sections: base.primary_sections || [],
      featured_factories: featuredFactories,
      featured_fabrics: featuredFabrics,
      featured_resources: featuredResources
    };
  }

  // getProductCategories
  getProductCategories() {
    const categories = this._getFromStorage('product_categories', []);
    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      parentCategoryId: cat.parentCategoryId || null,
      parentCategory: cat.parentCategoryId
        ? categories.find((c) => c.id === cat.parentCategoryId) || null
        : null
    }));
  }

  // getCertifications
  getCertifications() {
    const certs = this._getFromStorage('certifications', []);
    return certs.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description || '',
      standard_url: c.standard_url || ''
    }));
  }

  // getFactoryFilterOptions
  getFactoryFilterOptions() {
    const factories = this._getFromStorage('factories', []);
    const categories = this._getFromStorage('product_categories', []);
    const certs = this._getFromStorage('certifications', []);

    let minMoq = Infinity;
    let maxMoq = 0;
    let minLead = Infinity;
    let maxLead = 0;
    const countriesSet = new Set();

    factories.forEach((f) => {
      if (typeof f.min_overall_moq === 'number') {
        minMoq = Math.min(minMoq, f.min_overall_moq);
        maxMoq = Math.max(maxMoq, f.min_overall_moq);
      }
      if (typeof f.avg_lead_time_days === 'number') {
        minLead = Math.min(minLead, f.avg_lead_time_days);
        maxLead = Math.max(maxLead, f.avg_lead_time_days);
      }
      if (f.country) {
        countriesSet.add(f.country);
      }
    });

    if (!isFinite(minMoq)) minMoq = 0;
    if (!isFinite(maxMoq)) maxMoq = 0;
    if (!isFinite(minLead)) minLead = 0;
    if (!isFinite(maxLead)) maxLead = 0;

    return {
      product_categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
      certification_options: certs.map((c) => ({ code: c.code, name: c.name })),
      rating_options: [
        { value: 3, label: '3.0+' },
        { value: 4, label: '4.0+' },
        { value: 4.5, label: '4.5+' }
      ],
      moq_range: { min: minMoq, max: maxMoq },
      lead_time_range_days: { min: minLead, max: maxLead },
      countries: Array.from(countriesSet),
      sort_options: [
        { value: 'moq_asc', label: 'Minimum Order Quantity: Low to High' },
        { value: 'moq_desc', label: 'Minimum Order Quantity: High to Low' },
        { value: 'lead_time_asc', label: 'Lead Time: Short to Long' },
        { value: 'rating_desc', label: 'Rating: High to Low' },
        { value: 'name_asc', label: 'Name: A to Z' }
      ]
    };
  }

  // searchFactories(query, filters, sortBy, page, pageSize)
  searchFactories(query, filters, sortBy, page, pageSize) {
    const factories = this._getFromStorage('factories', []);
    const favorites = this._getOrCreateFavoritesStore();
    const favoritesSet = new Set(favorites.map((f) => f.factoryId));

    let filtered = factories.slice();

    // Text search
    if (query) {
      const q = String(query).toLowerCase();
      filtered = filtered.filter((f) => {
        return (
          (f.name || '').toLowerCase().includes(q) ||
          (f.description || '').toLowerCase().includes(q) ||
          (f.city || '').toLowerCase().includes(q) ||
          (f.country || '').toLowerCase().includes(q)
        );
      });
    }

    filtered = this._filterAndSortFactories(filtered, filters || null, sortBy || 'name_asc');

    const total = filtered.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = filtered.slice(start, start + ps);

    const results = paged.map((f) => this._resolveFactorySummary(f, favoritesSet));

    return {
      total_results: total,
      page: p,
      page_size: ps,
      factories: results
    };
  }

  // getFactoryProfile(factoryId)
  getFactoryProfile(factoryId) {
    const factories = this._getFromStorage('factories', []);
    const capabilities = this._getFromStorage('factory_product_capabilities', []);
    const categories = this._getFromStorage('product_categories', []);
    const favorites = this._getOrCreateFavoritesStore();
    const favoritesSet = new Set(favorites.map((f) => f.factoryId));

    const factory = factories.find((f) => f.id === factoryId);
    if (!factory) {
      return null;
    }

    const factoryCaps = capabilities.filter((c) => c.factoryId === factoryId);

    const productCapabilities = factoryCaps.map((cap) => {
      const cat = categories.find((c) => c.id === cap.productCategoryId) || null;
      const certs = (cap.certifications || []).map((ref) => {
        const allCerts = this._getFromStorage('certifications', []);
        const cert = allCerts.find((c) => c.id === ref || (c.code && c.code.toLowerCase() === String(ref).toLowerCase()));
        return cert ? { code: cert.code, name: cert.name } : { code: String(ref), name: String(ref) };
      });

      return {
        product_category: cat ? { id: cat.id, name: cat.name } : null,
        moq_units: cap.moq_units,
        lead_time_days: cap.lead_time_days,
        price_range_min: cap.price_range_min !== undefined ? cap.price_range_min : null,
        price_range_max: cap.price_range_max !== undefined ? cap.price_range_max : null,
        certifications: certs,
        rating_override: cap.rating_override !== undefined ? cap.rating_override : null,
        notes: cap.notes || ''
      };
    });

    return {
      id: factory.id,
      name: factory.name,
      description: factory.description || '',
      country: factory.country || '',
      city: factory.city || '',
      address: factory.address || '',
      rating: typeof factory.rating === 'number' ? factory.rating : null,
      min_overall_moq: typeof factory.min_overall_moq === 'number' ? factory.min_overall_moq : null,
      avg_lead_time_days: typeof factory.avg_lead_time_days === 'number' ? factory.avg_lead_time_days : null,
      certifications: this._resolveFactoryCertifications(factory),
      product_capabilities: productCapabilities,
      contact_email: factory.contact_email || '',
      contact_phone: factory.contact_phone || '',
      website: factory.website || '',
      image: factory.image || '',
      gallery_images: factory.gallery_images || [],
      is_favorited: favoritesSet.has(factory.id)
    };
  }

  // createQuoteRequest(factoryId, productName, quantity, specifications, targetPricePerUnit, incoterm, shippingDestination)
  createQuoteRequest(factoryId, productName, quantity, specifications, targetPricePerUnit, incoterm, shippingDestination) {
    const validIncoterms = ['fob', 'cif', 'exw', 'dap'];
    const term = String(incoterm || '').toLowerCase();
    if (!validIncoterms.includes(term)) {
      return {
        success: false,
        message: 'Invalid incoterm. Must be one of fob, cif, exw, dap.',
        quote_request: null
      };
    }

    const factories = this._getFromStorage('factories', []);
    const factory = factories.find((f) => f.id === factoryId) || null;

    const now = new Date().toISOString();
    const quoteRequests = this._getFromStorage('quote_requests', []);

    const qr = {
      id: this._generateId('qr'),
      factoryId: factoryId,
      product_name: productName,
      quantity: quantity,
      specifications: specifications,
      target_price_per_unit: targetPricePerUnit,
      incoterm: term,
      shipping_destination: shippingDestination || '',
      status: 'submitted',
      created_at: now,
      updated_at: null
    };

    quoteRequests.push(qr);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      message: 'Quote request submitted successfully.',
      quote_request: {
        id: qr.id,
        factory_id: qr.factoryId,
        factory_name: factory ? factory.name : '',
        product_name: qr.product_name,
        quantity: qr.quantity,
        specifications: qr.specifications,
        target_price_per_unit: qr.target_price_per_unit,
        incoterm: qr.incoterm,
        shipping_destination: qr.shipping_destination,
        status: qr.status,
        created_at: qr.created_at
      }
    };
  }

  // toggleFavoriteFactory(factoryId, isFavorite)
  toggleFavoriteFactory(factoryId, isFavorite) {
    let favorites = this._getOrCreateFavoritesStore();
    const exists = favorites.find((f) => f.factoryId === factoryId);

    if (isFavorite) {
      if (!exists) {
        favorites.push({
          id: this._generateId('favfac'),
          factoryId: factoryId,
          created_at: new Date().toISOString()
        });
      }
      this._saveToStorage('favorite_factories', favorites);
      return { success: true, is_favorited: true, message: 'Factory added to favorites.' };
    } else {
      favorites = favorites.filter((f) => f.factoryId !== factoryId);
      this._saveToStorage('favorite_factories', favorites);
      return { success: true, is_favorited: false, message: 'Factory removed from favorites.' };
    }
  }

  // getFavoriteFactories()
  getFavoriteFactories() {
    const favorites = this._getOrCreateFavoritesStore();
    const factories = this._getFromStorage('factories', []);
    const categories = this._getFromStorage('product_categories', []);

    const favoriteFactories = favorites.map((fav) => {
      const factory = factories.find((f) => f.id === fav.factoryId);
      if (!factory) return null;
      const summary = this._resolveFactorySummary(factory, null);
      // Remove is_favorited (always true here)
      delete summary.is_favorited;
      return summary;
    }).filter(Boolean);

    return favoriteFactories;
  }

  // getFactoryComparison(factoryIds)
  getFactoryComparison(factoryIds) {
    const factories = this._getFromStorage('factories', []);
    const categories = this._getFromStorage('product_categories', []);
    const certs = this._getFromStorage('certifications', []);

    const selectedFactories = (factoryIds || []).map((id) => factories.find((f) => f.id === id)).filter(Boolean);

    const factoriesForReturn = selectedFactories.map((factory) => {
      const productCategories = (factory.product_category_ids || []).map((cid) => {
        const cat = categories.find((c) => c.id === cid);
        return cat ? { id: cat.id, name: cat.name } : null;
      }).filter(Boolean);

      const factoryCerts = (factory.certifications || []).map((ref) => {
        const cert = certs.find((c) => c.id === ref || (c.code && c.code.toLowerCase() === String(ref).toLowerCase()));
        return cert ? { code: cert.code, name: cert.name } : { code: String(ref), name: String(ref) };
      });

      return {
        id: factory.id,
        name: factory.name,
        country: factory.country || '',
        city: factory.city || '',
        rating: typeof factory.rating === 'number' ? factory.rating : null,
        min_overall_moq: typeof factory.min_overall_moq === 'number' ? factory.min_overall_moq : null,
        avg_lead_time_days: typeof factory.avg_lead_time_days === 'number' ? factory.avg_lead_time_days : null,
        price_range_min: null,
        price_range_max: null,
        certifications: factoryCerts,
        product_categories: productCategories
      };
    });

    let bestId = null;
    let bestLead = Infinity;
    factoriesForReturn.forEach((f) => {
      if (typeof f.avg_lead_time_days === 'number' && f.avg_lead_time_days < bestLead) {
        bestLead = f.avg_lead_time_days;
        bestId = f.id;
      }
    });

    if (!isFinite(bestLead)) bestId = null;

    return {
      factories: factoriesForReturn,
      best_by_lead_time_factory_id: bestId
    };
  }

  // getFabricFilterOptions
  getFabricFilterOptions() {
    const fabrics = this._getFromStorage('fabrics', []);
    const certs = this._getFromStorage('certifications', []);

    let minWeight = Infinity;
    let maxWeight = 0;
    let minPrice = Infinity;
    let maxPrice = 0;
    const compositionSet = new Set();
    const colorSet = new Set();
    const patternSet = new Set();

    fabrics.forEach((f) => {
      if (f.composition) compositionSet.add(f.composition);
      if (typeof f.weight_gsm === 'number') {
        minWeight = Math.min(minWeight, f.weight_gsm);
        maxWeight = Math.max(maxWeight, f.weight_gsm);
      }
      if (typeof f.price_per_meter === 'number') {
        minPrice = Math.min(minPrice, f.price_per_meter);
        maxPrice = Math.max(maxPrice, f.price_per_meter);
      }
      (f.available_colors || []).forEach((c) => colorSet.add(c));
      if (f.pattern) patternSet.add(f.pattern);
    });

    if (!isFinite(minWeight)) minWeight = 0;
    if (!isFinite(maxWeight)) maxWeight = 0;
    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = 0;

    return {
      certification_options: certs.map((c) => ({ code: c.code, name: c.name })),
      composition_options: Array.from(compositionSet),
      weight_range_gsm: { min: minWeight, max: maxWeight },
      price_range_per_meter: { min: minPrice, max: maxPrice },
      color_options: Array.from(colorSet),
      pattern_options: Array.from(patternSet),
      sort_options: [
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'lead_time_asc', label: 'Lead Time: Short to Long' },
        { value: 'rating_desc', label: 'Rating: High to Low' },
        { value: 'name_asc', label: 'Name: A to Z' }
      ]
    };
  }

  // searchFabrics(query, filters, sortBy, page, pageSize)
  searchFabrics(query, filters, sortBy, page, pageSize) {
    let fabrics = this._getFromStorage('fabrics', []);

    if (query) {
      const q = String(query).toLowerCase();
      fabrics = fabrics.filter((f) => {
        return (
          (f.name || '').toLowerCase().includes(q) ||
          (f.description || '').toLowerCase().includes(q) ||
          (f.composition || '').toLowerCase().includes(q) ||
          (f.supplier_name || '').toLowerCase().includes(q)
        );
      });
    }

    const filteredSorted = this._filterAndSortFabrics(fabrics, filters || null, sortBy || 'name_asc');

    const total = filteredSorted.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = filteredSorted.slice(start, start + ps);

    const results = paged.map((fab) => ({
      id: fab.id,
      name: fab.name,
      description: fab.description || '',
      composition: fab.composition,
      certifications: this._resolveFabricCertifications(fab),
      weight_gsm: fab.weight_gsm !== undefined ? fab.weight_gsm : null,
      width_cm: fab.width_cm !== undefined ? fab.width_cm : null,
      price_per_meter: fab.price_per_meter,
      min_order_meters: fab.min_order_meters !== undefined ? fab.min_order_meters : null,
      available_colors: fab.available_colors || [],
      pattern: fab.pattern || '',
      supplier_name: fab.supplier_name || '',
      lead_time_days: fab.lead_time_days !== undefined ? fab.lead_time_days : null,
      rating: fab.rating !== undefined ? fab.rating : null
    }));

    return {
      total_results: total,
      page: p,
      page_size: ps,
      fabrics: results
    };
  }

  // getFabricDetail(fabricId)
  getFabricDetail(fabricId) {
    const fabrics = this._getFromStorage('fabrics', []);
    const fabric = fabrics.find((f) => f.id === fabricId);
    if (!fabric) return null;

    return {
      id: fabric.id,
      name: fabric.name,
      description: fabric.description || '',
      composition: fabric.composition,
      certifications: this._resolveFabricCertifications(fabric),
      weight_gsm: fabric.weight_gsm !== undefined ? fabric.weight_gsm : null,
      width_cm: fabric.width_cm !== undefined ? fabric.width_cm : null,
      price_per_meter: fabric.price_per_meter,
      min_order_meters: fabric.min_order_meters !== undefined ? fabric.min_order_meters : null,
      available_colors: fabric.available_colors || [],
      color_images: fabric.color_images || [],
      pattern: fabric.pattern || '',
      supplier_name: fabric.supplier_name || '',
      lead_time_days: fabric.lead_time_days !== undefined ? fabric.lead_time_days : null,
      rating: fabric.rating !== undefined ? fabric.rating : null
    };
  }

  // getSourcingLists
  getSourcingLists() {
    const lists = this._getFromStorage('sourcing_lists', []);
    const items = this._getFromStorage('sourcing_list_items', []);

    return lists.map((list) => {
      const listItems = items.filter((it) => it.sourcingListId === list.id);
      const totalItems = listItems.length;
      const totalQty = listItems.reduce((sum, it) => sum + (Number(it.quantity_meters) || 0), 0);
      return {
        id: list.id,
        name: list.name,
        description: list.description || '',
        created_at: list.created_at || '',
        updated_at: list.updated_at || '',
        total_items: totalItems,
        total_quantity_meters: totalQty
      };
    });
  }

  // addFabricToSourcingList(fabricId, color, quantityMeters, sourcingListId, newList)
  addFabricToSourcingList(fabricId, color, quantityMeters, sourcingListId, newList) {
    const fabrics = this._getFromStorage('fabrics', []);
    const fabric = fabrics.find((f) => f.id === fabricId);
    if (!fabric) {
      return { success: false, message: 'Fabric not found.', sourcing_list: null, item: null };
    }

    if (!color) {
      return { success: false, message: 'Color is required.', sourcing_list: null, item: null };
    }

    if (!quantityMeters || quantityMeters <= 0) {
      return { success: false, message: 'Quantity in meters must be greater than zero.', sourcing_list: null, item: null };
    }

    const list = this._getOrCreateSourcingList(sourcingListId, newList || null);
    const items = this._getFromStorage('sourcing_list_items', []);

    const unitPrice = fabric.price_per_meter !== undefined ? fabric.price_per_meter : null;
    const totalPrice = unitPrice !== null ? unitPrice * quantityMeters : null;

    const now = new Date().toISOString();
    const item = {
      id: this._generateId('sitem'),
      sourcingListId: list.id,
      fabricId: fabricId,
      color: color,
      quantity_meters: quantityMeters,
      unit_price: unitPrice,
      total_price: totalPrice,
      notes: '',
      created_at: now
    };

    items.push(item);
    this._saveToStorage('sourcing_list_items', items);

    return {
      success: true,
      message: 'Fabric added to sourcing list.',
      sourcing_list: {
        id: list.id,
        name: list.name,
        description: list.description || ''
      },
      item: {
        id: item.id,
        fabric_id: fabricId,
        fabric_name: fabric.name,
        color: item.color,
        quantity_meters: item.quantity_meters,
        unit_price: item.unit_price,
        total_price: item.total_price,
        created_at: item.created_at
      }
    };
  }

  // getSourcingListDetails(sourcingListId)
  getSourcingListDetails(sourcingListId) {
    const lists = this._getFromStorage('sourcing_lists', []);
    const items = this._getFromStorage('sourcing_list_items', []);
    const fabrics = this._getFromStorage('fabrics', []);

    const list = lists.find((l) => l.id === sourcingListId);
    if (!list) return null;

    const listItems = items.filter((it) => it.sourcingListId === sourcingListId);

    const itemsWithFabric = listItems.map((it) => {
      const fabric = fabrics.find((f) => f.id === it.fabricId) || null;
      return {
        id: it.id,
        fabric_id: it.fabricId,
        fabric_name: fabric ? fabric.name : '',
        color: it.color,
        quantity_meters: it.quantity_meters,
        unit_price: it.unit_price,
        total_price: it.total_price,
        fabric: fabric
      };
    });

    return {
      id: list.id,
      name: list.name,
      description: list.description || '',
      created_at: list.created_at || '',
      updated_at: list.updated_at || '',
      items: itemsWithFabric
    };
  }

  // getProjectsOverview
  getProjectsOverview() {
    const projects = this._getFromStorage('projects', []);
    const items = this._getFromStorage('project_product_items', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    return projects.map((proj) => {
      const projItems = items.filter((it) => it.projectId === proj.id);
      const totalItems = projItems.length;
      const totalQty = projItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
      const shipping = shippingMethods.find((s) => s.id === proj.shipping_method_id) || null;
      return {
        id: proj.id,
        name: proj.name,
        description: proj.description || '',
        status: proj.status,
        shipping_method: shipping ? { id: shipping.id, name: shipping.name } : null,
        created_at: proj.created_at || '',
        updated_at: proj.updated_at || '',
        total_items: totalItems,
        total_quantity: totalQty
      };
    });
  }

  // getProductTemplatesForCategory(productCategoryId)
  getProductTemplatesForCategory(productCategoryId) {
    const templates = this._getFromStorage('product_templates', []);
    const categories = this._getFromStorage('product_categories', []);
    const category = categories.find((c) => c.id === productCategoryId) || null;

    return templates
      .filter((tpl) => tpl.categoryId === productCategoryId)
      .map((tpl) => ({
        id: tpl.id,
        name: tpl.name,
        description: tpl.description || '',
        image: tpl.image || '',
        default_quality_tiers: tpl.default_quality_tiers || [],
        category: category
      }));
  }

  // getShippingMethods
  getShippingMethods() {
    const methods = this._getFromStorage('shipping_methods', []);
    return methods.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      transit_time_min_days: m.transit_time_min_days,
      transit_time_max_days: m.transit_time_max_days,
      description: m.description || '',
      is_active: !!m.is_active
    }));
  }

  // createProjectWithProducts(name, description, shippingMethodId, products)
  createProjectWithProducts(name, description, shippingMethodId, products) {
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const categories = this._getFromStorage('product_categories', []);
    const templates = this._getFromStorage('product_templates', []);

    const shipping = shippingMethods.find((s) => s.id === shippingMethodId);
    if (!shipping) {
      return { success: false, message: 'Invalid shipping method.', project: null, products: [] };
    }

    const now = new Date().toISOString();
    const projects = this._getFromStorage('projects', []);
    const projectItems = this._getFromStorage('project_product_items', []);

    const project = {
      id: this._generateId('proj'),
      name: name,
      description: description || '',
      status: 'draft',
      shipping_method_id: shippingMethodId,
      notes: '',
      created_at: now,
      updated_at: now
    };

    projects.push(project);
    this._saveToStorage('projects', projects);

    const createdItems = [];
    (products || []).forEach((p) => {
      const item = {
        id: this._generateId('ppitem'),
        projectId: project.id,
        productCategoryId: p.productCategoryId,
        productTemplateId: p.productTemplateId,
        product_name: p.productName || '',
        quality_tier: p.qualityTier,
        quantity: p.quantity,
        unit_price_estimate: p.unitPriceEstimate !== undefined ? p.unitPriceEstimate : null,
        notes: p.notes || ''
      };
      projectItems.push(item);
      createdItems.push(item);
    });

    this._saveToStorage('project_product_items', projectItems);

    const productsForReturn = createdItems.map((it) => {
      const cat = categories.find((c) => c.id === it.productCategoryId) || null;
      const tpl = templates.find((t) => t.id === it.productTemplateId) || null;
      return {
        id: it.id,
        product_category: cat ? { id: cat.id, name: cat.name } : null,
        product_template: tpl ? { id: tpl.id, name: tpl.name, image: tpl.image || '' } : null,
        product_name: it.product_name,
        quality_tier: it.quality_tier,
        quantity: it.quantity,
        unit_price_estimate: it.unit_price_estimate
      };
    });

    return {
      success: true,
      message: 'Project created successfully.',
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        shipping_method: {
          id: shipping.id,
          name: shipping.name,
          type: shipping.type,
          transit_time_min_days: shipping.transit_time_min_days,
          transit_time_max_days: shipping.transit_time_max_days
        },
        created_at: project.created_at
      },
      products: productsForReturn
    };
  }

  // getProjectSummary(projectId)
  getProjectSummary(projectId) {
    const projects = this._getFromStorage('projects', []);
    const items = this._getFromStorage('project_product_items', []);
    const categories = this._getFromStorage('product_categories', []);
    const templates = this._getFromStorage('product_templates', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    const project = projects.find((p) => p.id === projectId);
    if (!project) return null;

    const shipping = shippingMethods.find((s) => s.id === project.shipping_method_id) || null;
    const projectItems = items.filter((it) => it.projectId === project.id);

    const productsForReturn = projectItems.map((it) => {
      const cat = categories.find((c) => c.id === it.productCategoryId) || null;
      const tpl = templates.find((t) => t.id === it.productTemplateId) || null;
      return {
        id: it.id,
        product_category: cat ? { id: cat.id, name: cat.name } : null,
        product_template: tpl ? { id: tpl.id, name: tpl.name, image: tpl.image || '' } : null,
        product_name: it.product_name,
        quality_tier: it.quality_tier,
        quantity: it.quantity,
        unit_price_estimate: it.unit_price_estimate
      };
    });

    const totalItems = productsForReturn.length;
    const totalQty = productsForReturn.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description || '',
        status: project.status,
        shipping_method: shipping
          ? {
              id: shipping.id,
              name: shipping.name,
              type: shipping.type,
              transit_time_min_days: shipping.transit_time_min_days,
              transit_time_max_days: shipping.transit_time_max_days
            }
          : null,
        notes: project.notes || '',
        created_at: project.created_at || '',
        updated_at: project.updated_at || ''
      },
      products: productsForReturn,
      totals: {
        total_items: totalItems,
        total_quantity: totalQty
      }
    };
  }

  // getConsultationTypes
  getConsultationTypes() {
    const types = this._getFromStorage('consultation_types', []);
    return types.map((t) => ({
      code: t.code,
      name: t.name,
      duration_minutes: t.duration_minutes,
      description: t.description || ''
    }));
  }

  // getAvailableConsultationSlots(consultationTypeCode, date)
  getAvailableConsultationSlots(consultationTypeCode, date) {
    return this._generateConsultationSlots(consultationTypeCode, date);
  }

  // bookConsultation(consultationTypeCode, scheduledStart, name, email, businessType, estimatedAnnualUnits, additionalDetails)
  bookConsultation(consultationTypeCode, scheduledStart, name, email, businessType, estimatedAnnualUnits, additionalDetails) {
    const validBusinessTypes = [
      'activewear_brand',
      'fashion_brand',
      'ecommerce_brand',
      'wholesaler',
      'retailer',
      'agency',
      'other'
    ];

    if (!validBusinessTypes.includes(businessType)) {
      return { success: false, message: 'Invalid business type.', booking: null };
    }

    const types = this._getFromStorage('consultation_types', []);
    const type = types.find((t) => t.code === consultationTypeCode);
    if (!type) {
      return { success: false, message: 'Invalid consultation type.', booking: null };
    }

    if (!scheduledStart) {
      return { success: false, message: 'scheduledStart is required.', booking: null };
    }

    const datePart = String(scheduledStart).slice(0, 10);
    const slots = this._generateConsultationSlots(consultationTypeCode, datePart);
    const slot = slots.find((s) => s.start === scheduledStart);

    if (!slot || !slot.is_available) {
      return { success: false, message: 'Selected time slot is not available.', booking: null };
    }

    const bookings = this._getFromStorage('consultation_bookings', []);
    const now = new Date().toISOString();

    const booking = {
      id: this._generateId('cbook'),
      consultation_type_code: consultationTypeCode,
      scheduled_start: scheduledStart,
      duration_minutes: type.duration_minutes,
      name: name,
      email: email,
      business_type: businessType,
      estimated_annual_units: estimatedAnnualUnits !== undefined ? estimatedAnnualUnits : null,
      additional_details: additionalDetails || '',
      status: 'pending',
      created_at: now,
      updated_at: now
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    return {
      success: true,
      message: 'Consultation booked successfully.',
      booking: booking
    };
  }

  // getSupplierFilterOptions
  getSupplierFilterOptions() {
    const suppliers = this._getFromStorage('suppliers', []);

    let minMoq = Infinity;
    let maxMoq = 0;
    suppliers.forEach((s) => {
      if (typeof s.moq_min_units === 'number') {
        minMoq = Math.min(minMoq, s.moq_min_units);
        maxMoq = Math.max(maxMoq, s.moq_min_units);
      }
    });
    if (!isFinite(minMoq)) minMoq = 0;
    if (!isFinite(maxMoq)) maxMoq = 0;

    return {
      service_types: [
        { value: 'print_on_demand', label: 'Print-on-Demand' },
        { value: 'fabric_sourcing', label: 'Fabric Sourcing' },
        { value: 'cut_and_sew', label: 'Cut & Sew' },
        { value: 'fulfillment', label: 'Fulfillment' },
        { value: 'dyeing', label: 'Dyeing' },
        { value: 'printing_only', label: 'Printing Only' },
        { value: 'other', label: 'Other' }
      ],
      printing_methods: [
        { value: 'dtg', label: 'DTG (Direct-to-Garment)' },
        { value: 'screen_print', label: 'Screen Print' },
        { value: 'sublimation', label: 'Sublimation' },
        { value: 'embroidery', label: 'Embroidery' },
        { value: 'heat_transfer', label: 'Heat Transfer' },
        { value: 'none', label: 'None' }
      ],
      materials: [
        { value: 'organic_cotton', label: 'Organic Cotton' },
        { value: 'recycled_polyester', label: 'Recycled Polyester' },
        { value: 'cotton', label: 'Cotton' },
        { value: 'polyester', label: 'Polyester' },
        { value: 'mixed', label: 'Mixed' },
        { value: 'other', label: 'Other' }
      ],
      moq_range: { min: minMoq, max: maxMoq },
      rating_options: [
        { value: 3, label: '3.0+' },
        { value: 4, label: '4.0+' },
        { value: 4.5, label: '4.5+' }
      ],
      sort_options: [
        { value: 'rating_desc', label: 'Rating: High to Low' },
        { value: 'moq_asc', label: 'MOQ: Low to High' },
        { value: 'lead_time_asc', label: 'Lead Time: Short to Long' },
        { value: 'name_asc', label: 'Name: A to Z' }
      ]
    };
  }

  // searchSuppliers(query, filters, sortBy, page, pageSize)
  searchSuppliers(query, filters, sortBy, page, pageSize) {
    const suppliers = this._getFromStorage('suppliers', []);
    const shortlist = this._getOrCreateShortlistStore();
    const shortlistSet = new Set(shortlist.map((s) => s.supplierId));

    let filtered = suppliers.slice();

    if (query) {
      const q = String(query).toLowerCase();
      filtered = filtered.filter((s) => {
        return (
          (s.name || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q)
        );
      });
    }

    if (filters) {
      if (filters.serviceTypes && filters.serviceTypes.length > 0) {
        const wanted = filters.serviceTypes;
        filtered = filtered.filter((s) => {
          const primary = s.primary_service_type;
          const others = s.other_service_types || [];
          return wanted.some((w) => primary === w || others.includes(w));
        });
      }

      if (filters.printingMethods && filters.printingMethods.length > 0) {
        const wanted = filters.printingMethods;
        filtered = filtered.filter((s) => {
          const primary = s.primary_printing_method;
          const others = s.other_printing_methods || [];
          return wanted.some((w) => primary === w || others.includes(w));
        });
      }

      if (filters.materials && filters.materials.length > 0) {
        const wanted = filters.materials;
        filtered = filtered.filter((s) => {
          const primary = s.primary_material;
          const others = s.other_materials || [];
          return wanted.some((w) => primary === w || others.includes(w));
        });
      }

      if (typeof filters.maxMoqUnits === 'number') {
        filtered = filtered.filter((s) => typeof s.moq_min_units === 'number' && s.moq_min_units <= filters.maxMoqUnits);
      }

      if (typeof filters.minRating === 'number') {
        filtered = filtered.filter((s) => typeof s.rating === 'number' && s.rating >= filters.minRating);
      }

      if (typeof filters.maxLeadTimeDays === 'number') {
        filtered = filtered.filter((s) => typeof s.lead_time_days === 'number' && s.lead_time_days <= filters.maxLeadTimeDays);
      }
    }

    const sortKey = sortBy || 'rating_desc';
    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'rating_desc': {
          const ar = typeof a.rating === 'number' ? a.rating : -Infinity;
          const br = typeof b.rating === 'number' ? b.rating : -Infinity;
          return br - ar;
        }
        case 'moq_asc': {
          const am = typeof a.moq_min_units === 'number' ? a.moq_min_units : Infinity;
          const bm = typeof b.moq_min_units === 'number' ? b.moq_min_units : Infinity;
          return am - bm;
        }
        case 'lead_time_asc': {
          const al = typeof a.lead_time_days === 'number' ? a.lead_time_days : Infinity;
          const bl = typeof b.lead_time_days === 'number' ? b.lead_time_days : Infinity;
          return al - bl;
        }
        case 'name_asc':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

    const total = filtered.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = filtered.slice(start, start + ps);

    const results = paged.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      primary_service_type: s.primary_service_type,
      primary_printing_method: s.primary_printing_method || '',
      primary_material: s.primary_material || '',
      moq_min_units: s.moq_min_units !== undefined ? s.moq_min_units : null,
      rating: s.rating !== undefined ? s.rating : null,
      lead_time_days: s.lead_time_days !== undefined ? s.lead_time_days : null,
      price_range_min: s.price_range_min !== undefined ? s.price_range_min : null,
      price_range_max: s.price_range_max !== undefined ? s.price_range_max : null,
      location_country: s.location_country || '',
      is_shortlisted: shortlistSet.has(s.id)
    }));

    return {
      total_results: total,
      page: p,
      page_size: ps,
      suppliers: results
    };
  }

  // getSupplierProfile(supplierId)
  getSupplierProfile(supplierId) {
    const suppliers = this._getFromStorage('suppliers', []);
    const shortlist = this._getOrCreateShortlistStore();
    const shortlistSet = new Set(shortlist.map((s) => s.supplierId));

    const s = suppliers.find((sup) => sup.id === supplierId);
    if (!s) return null;

    return {
      id: s.id,
      name: s.name,
      description: s.description || '',
      primary_service_type: s.primary_service_type,
      primary_printing_method: s.primary_printing_method || '',
      primary_material: s.primary_material || '',
      other_service_types: s.other_service_types || [],
      other_printing_methods: s.other_printing_methods || [],
      other_materials: s.other_materials || [],
      moq_min_units: s.moq_min_units !== undefined ? s.moq_min_units : null,
      rating: s.rating !== undefined ? s.rating : null,
      lead_time_days: s.lead_time_days !== undefined ? s.lead_time_days : null,
      price_range_min: s.price_range_min !== undefined ? s.price_range_min : null,
      price_range_max: s.price_range_max !== undefined ? s.price_range_max : null,
      website: s.website || '',
      contact_email: s.contact_email || '',
      location_country: s.location_country || '',
      integration_notes: s.integration_notes || '',
      is_shortlisted: shortlistSet.has(s.id)
    };
  }

  // toggleShortlistSupplier(supplierId, isShortlisted)
  toggleShortlistSupplier(supplierId, isShortlisted) {
    let shortlist = this._getOrCreateShortlistStore();
    const exists = shortlist.find((s) => s.supplierId === supplierId);

    if (isShortlisted) {
      if (!exists) {
        shortlist.push({
          id: this._generateId('short'),
          supplierId: supplierId,
          created_at: new Date().toISOString()
        });
      }
      this._saveToStorage('shortlist_items', shortlist);
      return { success: true, is_shortlisted: true, message: 'Supplier added to shortlist.' };
    } else {
      shortlist = shortlist.filter((s) => s.supplierId !== supplierId);
      this._saveToStorage('shortlist_items', shortlist);
      return { success: true, is_shortlisted: false, message: 'Supplier removed from shortlist.' };
    }
  }

  // getShortlistSuppliers
  getShortlistSuppliers() {
    const shortlist = this._getOrCreateShortlistStore();
    const suppliers = this._getFromStorage('suppliers', []);

    return shortlist
      .map((item) => {
        const s = suppliers.find((sup) => sup.id === item.supplierId);
        if (!s) return null;
        return {
          id: s.id,
          name: s.name,
          primary_service_type: s.primary_service_type,
          primary_printing_method: s.primary_printing_method || '',
          primary_material: s.primary_material || '',
          moq_min_units: s.moq_min_units !== undefined ? s.moq_min_units : null,
          rating: s.rating !== undefined ? s.rating : null,
          lead_time_days: s.lead_time_days !== undefined ? s.lead_time_days : null,
          location_country: s.location_country || ''
        };
      })
      .filter(Boolean);
  }

  // getResourceFilterOptions
  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources', []);

    const topicsSet = new Set();
    const tagsSet = new Set();

    resources.forEach((r) => {
      (r.topics || []).forEach((t) => topicsSet.add(t));
      (r.tags || []).forEach((t) => tagsSet.add(t));
    });

    return {
      content_types: [
        { value: 'article', label: 'Articles' },
        { value: 'guide', label: 'Guides' },
        { value: 'checklist', label: 'Checklists' },
        { value: 'video', label: 'Videos' },
        { value: 'webinar', label: 'Webinars' },
        { value: 'case_study', label: 'Case Studies' },
        { value: 'report', label: 'Reports' }
      ],
      topics: Array.from(topicsSet),
      tag_options: Array.from(tagsSet)
    };
  }

  // searchResources(query, filters, sortBy, page, pageSize)
  searchResources(query, filters, sortBy, page, pageSize) {
    const resources = this._getFromStorage('resources', []);
    const readingList = this._getReadingListStore();
    const savedSet = new Set(readingList.map((r) => r.resourceId));

    let filtered = resources.slice();

    if (query) {
      const q = String(query).toLowerCase();
      filtered = filtered.filter((r) => {
        return (
          (r.title || '').toLowerCase().includes(q) ||
          (r.summary || '').toLowerCase().includes(q)
        );
      });
    }

    if (filters) {
      if (filters.contentTypes && filters.contentTypes.length > 0) {
        const wanted = filters.contentTypes;
        filtered = filtered.filter((r) => wanted.includes(r.content_type));
      }

      if (filters.topics && filters.topics.length > 0) {
        const wanted = filters.topics.map((t) => String(t).toLowerCase());
        filtered = filtered.filter((r) => {
          const topics = (r.topics || []).map((t) => String(t).toLowerCase());
          return wanted.every((w) => topics.includes(w));
        });
      }

      if (filters.tags && filters.tags.length > 0) {
        const wanted = filters.tags.map((t) => String(t).toLowerCase());
        filtered = filtered.filter((r) => {
          const tags = (r.tags || []).map((t) => String(t).toLowerCase());
          return wanted.every((w) => tags.includes(w));
        });
      }
    }

    const sortKey = sortBy || 'published_at_desc';
    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'published_at_asc': {
          const ad = a.published_at ? Date.parse(a.published_at) : 0;
          const bd = b.published_at ? Date.parse(b.published_at) : 0;
          return ad - bd;
        }
        case 'title_asc': {
          return (a.title || '').localeCompare(b.title || '');
        }
        case 'published_at_desc':
        default: {
          const ad = a.published_at ? Date.parse(a.published_at) : 0;
          const bd = b.published_at ? Date.parse(b.published_at) : 0;
          return bd - ad;
        }
      }
    });

    const total = filtered.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = filtered.slice(start, start + ps);

    const results = paged.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      summary: r.summary || '',
      content_type: r.content_type,
      topics: r.topics || [],
      tags: r.tags || [],
      published_at: r.published_at || '',
      is_saved: savedSet.has(r.id)
    }));

    return {
      total_results: total,
      page: p,
      page_size: ps,
      resources: results
    };
  }

  // getResourceDetail(resourceId)
  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources', []);
    const readingList = this._getReadingListStore();
    const savedSet = new Set(readingList.map((r) => r.resourceId));

    const r = resources.find((res) => res.id === resourceId);
    if (!r) return null;

    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      summary: r.summary || '',
      content: r.content || '',
      content_type: r.content_type,
      topics: r.topics || [],
      tags: r.tags || [],
      published_at: r.published_at || '',
      url: r.url || '',
      is_saved: savedSet.has(r.id)
    };
  }

  // toggleReadingListResource(resourceId, isSaved)
  toggleReadingListResource(resourceId, isSaved) {
    let list = this._getReadingListStore();
    const exists = list.find((r) => r.resourceId === resourceId);

    if (isSaved) {
      if (!exists) {
        list.push({
          id: this._generateId('read'),
          resourceId: resourceId,
          created_at: new Date().toISOString()
        });
      }
      this._saveToStorage('reading_list_items', list);
      return { success: true, is_saved: true, message: 'Resource saved to reading list.' };
    } else {
      list = list.filter((r) => r.resourceId !== resourceId);
      this._saveToStorage('reading_list_items', list);
      return { success: true, is_saved: false, message: 'Resource removed from reading list.' };
    }
  }

  // getReadingListItems
  getReadingListItems() {
    const list = this._getReadingListStore();
    const resources = this._getFromStorage('resources', []);

    return list
      .map((item) => {
        const r = resources.find((res) => res.id === item.resourceId);
        if (!r) return null;
        return {
          id: r.id,
          title: r.title,
          content_type: r.content_type,
          topics: r.topics || [],
          tags: r.tags || [],
          saved_at: item.created_at || ''
        };
      })
      .filter(Boolean);
  }

  // getCostCalculatorDefaults
  getCostCalculatorDefaults() {
    return {
      product_types: [
        { value: 'hoodie', label: 'Hoodie' },
        { value: 't_shirt', label: 'T-Shirt' },
        { value: 'joggers', label: 'Joggers' },
        { value: 'sweatshirt', label: 'Sweatshirt' },
        { value: 'leggings', label: 'Leggings' },
        { value: 'other', label: 'Other' }
      ],
      destination_regions: [
        { value: 'usa_west_coast', label: 'USA - West Coast' },
        { value: 'usa_east_coast', label: 'USA - East Coast' },
        { value: 'europe', label: 'Europe' },
        { value: 'asia', label: 'Asia' },
        { value: 'australia', label: 'Australia' },
        { value: 'other', label: 'Other' }
      ],
      default_currency: 'usd'
    };
  }

  // previewCostEstimate(productType, quantity, fobPricePerUnit, destinationRegion, currency)
  previewCostEstimate(productType, quantity, fobPricePerUnit, destinationRegion, currency) {
    const result = this._calculateLandedCostAndShippingOptions(
      productType,
      quantity,
      fobPricePerUnit,
      destinationRegion,
      currency
    );

    return {
      total_fob_value: result.total_fob_value,
      shipping_options: result.shipping_options
    };
  }

  // saveCostEstimate(name, productType, quantity, fobPricePerUnit, destinationRegion, currency, selectedShippingOption)
  saveCostEstimate(name, productType, quantity, fobPricePerUnit, destinationRegion, currency, selectedShippingOption) {
    const totalFob = quantity * fobPricePerUnit;

    const estimates = this._getFromStorage('cost_estimates', []);
    const options = this._getFromStorage('cost_estimate_shipping_options', []);

    const now = new Date().toISOString();

    const estimate = {
      id: this._generateId('ce'),
      name: name,
      product_type: productType,
      quantity: quantity,
      fob_price_per_unit: fobPricePerUnit,
      destination_region: destinationRegion,
      currency: currency,
      total_fob_value: totalFob,
      selected_shipping_option_id: null,
      created_at: now,
      updated_at: now
    };

    estimates.push(estimate);

    const opt = {
      id: this._generateId('ceso'),
      costEstimateId: estimate.id,
      name: selectedShippingOption.name,
      method_type: selectedShippingOption.method_type,
      carrier_name: selectedShippingOption.carrier_name || '',
      cost_total: selectedShippingOption.cost_total,
      cost_per_unit: selectedShippingOption.cost_per_unit,
      transit_time_min_days: selectedShippingOption.transit_time_min_days,
      transit_time_max_days: selectedShippingOption.transit_time_max_days,
      is_selected: true
    };

    options.push(opt);
    estimate.selected_shipping_option_id = opt.id;

    this._saveToStorage('cost_estimates', estimates);
    this._saveToStorage('cost_estimate_shipping_options', options);

    return {
      success: true,
      message: 'Cost estimate saved successfully.',
      cost_estimate: {
        id: estimate.id,
        name: estimate.name,
        product_type: estimate.product_type,
        quantity: estimate.quantity,
        fob_price_per_unit: estimate.fob_price_per_unit,
        destination_region: estimate.destination_region,
        currency: estimate.currency,
        total_fob_value: estimate.total_fob_value,
        selected_shipping_option_id: estimate.selected_shipping_option_id,
        created_at: estimate.created_at
      },
      shipping_options: [opt]
    };
  }

  // submitContactInquiry(inquiryType, name, brandCompany, email, phone, message, estimatedAnnualVolume, desiredLaunchDate, interestedInSustainableMaterials)
  submitContactInquiry(inquiryType, name, brandCompany, email, phone, message, estimatedAnnualVolume, desiredLaunchDate, interestedInSustainableMaterials) {
    const validTypes = ['new_brand', 'new_customer', 'existing_customer', 'general_question', 'other'];
    if (!validTypes.includes(inquiryType)) {
      return { success: false, message: 'Invalid inquiry type.', inquiry: null };
    }

    const inquiries = this._getFromStorage('contact_inquiries', []);
    const now = new Date().toISOString();

    const inquiry = {
      id: this._generateId('inq'),
      inquiry_type: inquiryType,
      name: name,
      brand_company: brandCompany || '',
      email: email,
      phone: phone || '',
      message: message,
      estimated_annual_volume: estimatedAnnualVolume !== undefined ? estimatedAnnualVolume : null,
      desired_launch_date: desiredLaunchDate || null,
      interested_in_sustainable_materials: !!interestedInSustainableMaterials,
      status: 'received',
      created_at: now
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted successfully.',
      inquiry: inquiry
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const about = this._getFromStorage('about_page_content', this._createDefaultAboutPageContent());
    return about;
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
