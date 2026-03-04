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

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'services',
      'offerings',
      'package_quote_requests',
      'quote_drafts',
      'quote_items',
      'emergency_bookings',
      'projects',
      'favorites',
      'ev_hardware_tiers',
      'ev_cost_estimates',
      'ev_installation_consultation_requests',
      'service_areas',
      'service_requests',
      'articles',
      'article_share_emails',
      'product_categories',
      'products',
      'cart',
      'cart_items',
      'users',
      'contact_requests'
    ];

    const objectKeys = [
      'single_user_context',
      'company_info'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    objectKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return typeof defaultValue !== 'undefined' ? defaultValue : [];
      }
    }
    return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  _getSingleUserContext() {
    const ctx = this._getFromStorage('single_user_context', {});
    return ctx && typeof ctx === 'object' ? ctx : {};
  }

  _saveSingleUserContext(ctx) {
    this._saveToStorage('single_user_context', ctx || {});
  }

  // Helper to find or create the single user's cart
  _getOrCreateCart() {
    const now = this._nowIso();
    let carts = this._getFromStorage('cart', []);
    let ctx = this._getSingleUserContext();

    let cart = null;
    if (ctx.current_cart_id) {
      cart = carts.find(function (c) { return c.id === ctx.current_cart_id && c.status === 'open'; });
    }
    if (!cart) {
      cart = carts.find(function (c) { return c.status === 'open'; });
    }
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now,
        status: 'open'
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    ctx.current_cart_id = cart.id;
    this._saveSingleUserContext(ctx);
    return cart;
  }

  // Helper to fetch or create current QuoteDraft
  _getCurrentQuoteDraft() {
    const now = this._nowIso();
    let drafts = this._getFromStorage('quote_drafts', []);
    let ctx = this._getSingleUserContext();

    let draft = null;
    if (ctx.current_quote_draft_id) {
      draft = drafts.find(function (d) { return d.id === ctx.current_quote_draft_id && d.status === 'open'; });
    }
    if (!draft) {
      draft = drafts.find(function (d) { return d.status === 'open'; });
    }
    if (!draft) {
      draft = {
        id: this._generateId('quote_draft'),
        created_at: now,
        updated_at: now,
        status: 'open',
        notes: ''
      };
      drafts.push(draft);
      this._saveToStorage('quote_drafts', drafts);
    }
    ctx.current_quote_draft_id = draft.id;
    this._saveSingleUserContext(ctx);
    return draft;
  }

  // Helper for favorites store (single user)
  _getFavoritesStore() {
    return this._getFromStorage('favorites', []);
  }

  _saveFavoritesStore(favorites) {
    this._saveToStorage('favorites', favorites || []);
  }

  // ---------- Interface implementations ----------

  // getHomeOverview()
  getHomeOverview() {
    const services = this._getFromStorage('services', []);
    const offerings = this._getFromStorage('offerings', []);
    const companyInfo = this._getFromStorage('company_info', {});

    const featuredServices = services.slice(0, 5).map(function (s) {
      return {
        service_id: s.id,
        name: s.name,
        primary_audience: s.primary_audience,
        short_description: s.description || '',
        slug: s.slug || ''
      };
    });

    const highlightedOfferings = offerings
      .filter(function (o) { return o.is_active; })
      .slice(0, 6)
      .map((o) => {
        const service = services.find(function (s) { return s.id === o.service_id; }) || null;
        return {
          offering_id: o.id,
          name: o.name,
          offering_type: o.offering_type,
          service_name: service ? service.name : '',
          price_display: o.price_display || '',
          base_price_min: o.base_price_min,
          base_price_max: o.base_price_max,
          currency: o.currency,
          for_commercial: !!o.for_commercial
        };
      });

    const hasEmergencyService = services.some(function (s) { return s.is_emergency_service; });

    const emergencyBanner = {
      is_active: hasEmergencyService,
      headline: '24/7 Emergency Electrical Service',
      subheadline: 'Rapid-response commercial and residential dispatch.',
      phone_display: companyInfo.main_phone || '',
      cta_label: 'Emergency Service 24/7'
    };

    const hasAnyOffering = offerings.length > 0;
    const hasEvHardwareTiers = this._getFromStorage('ev_hardware_tiers', []).length > 0;
    const hasMaintenancePlans = offerings.some(function (o) { return o.offering_type === 'maintenance_plan'; });

    const keyTools = {
      show_request_quote: hasAnyOffering,
      show_ev_cost_calculator: hasEvHardwareTiers,
      show_maintenance_plans_cta: hasMaintenancePlans
    };

    return {
      featured_services: featuredServices,
      highlighted_offerings: highlightedOfferings,
      emergency_banner: emergencyBanner,
      key_tools: keyTools
    };
  }

  // getServicesOverview()
  getServicesOverview() {
    const services = this._getFromStorage('services', []);

    const groups = [
      { key: 'commercial', label: 'Commercial' },
      { key: 'residential', label: 'Residential' },
      { key: 'both', label: 'Commercial & Residential' }
    ];

    const serviceGroups = groups.map(function (g) {
      const groupServices = services
        .filter(function (s) { return s.primary_audience === g.key || (g.key === 'both' && s.primary_audience === 'both'); })
        .map(function (s) {
          return {
            service_id: s.id,
            name: s.name,
            slug: s.slug || '',
            description: s.description || '',
            primary_audience: s.primary_audience,
            has_offerings: !!s.has_offerings,
            is_emergency_service: !!s.is_emergency_service
          };
        });
      return {
        group_key: g.key,
        group_label: g.label,
        services: groupServices
      };
    });

    const popular_service_ctas = services.map(function (s) {
      let actionType = 'view_service';
      if (s.is_emergency_service) {
        actionType = 'book_emergency';
      } else if (s.has_offerings) {
        actionType = 'view_packages';
      }
      return {
        service_id: s.id,
        label: s.name,
        action_type: actionType
      };
    });

    return {
      service_groups: serviceGroups,
      popular_service_ctas: popular_service_ctas
    };
  }

  // getServiceDetail(serviceSlug)
  getServiceDetail(serviceSlug) {
    const services = this._getFromStorage('services', []);
    const offerings = this._getFromStorage('offerings', []);
    const service = services.find(function (s) { return s.slug === serviceSlug; }) || null;

    if (!service) {
      return {
        service_id: null,
        name: '',
        slug: serviceSlug,
        description: '',
        primary_audience: '',
        has_offerings: false,
        is_emergency_service: false,
        overview_content: '',
        example_pricing: '',
        package_comparison_available: false,
        package_summaries: []
      };
    }

    const serviceOfferings = offerings.filter(function (o) { return o.service_id === service.id && o.is_active; });
    const packageSummaries = serviceOfferings.map(function (o) {
      return {
        offering_id: o.id,
        name: o.name,
        offering_type: o.offering_type,
        price_display: o.price_display || '',
        base_price_min: o.base_price_min,
        base_price_max: o.base_price_max,
        currency: o.currency,
        feature_highlights: o.feature_list || []
      };
    });

    const hasLedPackages = serviceOfferings.some(function (o) { return o.offering_type === 'led_upgrade_package'; });

    let examplePricing = '';
    if (serviceOfferings.length > 0) {
      const mins = serviceOfferings.map(function (o) { return o.base_price_min; });
      const maxs = serviceOfferings.map(function (o) { return o.base_price_max; });
      const minPrice = Math.min.apply(null, mins);
      const maxPrice = Math.max.apply(null, maxs);
      examplePricing = 'Typical projects range from $' + minPrice + ' to $' + maxPrice + ' USD.';
    }

    return {
      service_id: service.id,
      name: service.name,
      slug: service.slug || '',
      description: service.description || '',
      primary_audience: service.primary_audience,
      has_offerings: !!service.has_offerings,
      is_emergency_service: !!service.is_emergency_service,
      overview_content: service.description || '',
      example_pricing: examplePricing,
      package_comparison_available: hasLedPackages,
      package_summaries: packageSummaries
    };
  }

  // getServicePackagesComparison(serviceId)
  getServicePackagesComparison(serviceId) {
    const offerings = this._getFromStorage('offerings', []);
    const filtered = offerings.filter(function (o) { return o.service_id === serviceId && o.is_active; });
    return filtered.map(function (o) {
      return {
        offering_id: o.id,
        name: o.name,
        offering_type: o.offering_type,
        price_display: o.price_display || '',
        base_price_min: o.base_price_min,
        base_price_max: o.base_price_max,
        currency: o.currency,
        project_type: o.project_type || '',
        feature_list: o.feature_list || [],
        includes_permit_handling: !!o.includes_permit_handling,
        warranty_years: o.warranty_years || 0,
        scheduled_visits_per_year: o.scheduled_visits_per_year || 0
      };
    });
  }

  // getOfferingDetail(offeringId)
  getOfferingDetail(offeringId) {
    const offerings = this._getFromStorage('offerings', []);
    const services = this._getFromStorage('services', []);
    const offering = offerings.find(function (o) { return o.id === offeringId; }) || null;

    if (!offering) {
      return {
        offering_id: null,
        service_id: null,
        service_name: '',
        name: '',
        slug: '',
        offering_type: '',
        description: '',
        for_commercial: false,
        for_residential: false,
        project_type: '',
        base_price_min: 0,
        base_price_max: 0,
        price_display: '',
        currency: 'usd',
        includes_permit_handling: false,
        warranty_years: 0,
        scheduled_visits_per_year: 0,
        min_locations: 0,
        max_locations: 0,
        feature_list: [],
        is_active: false,
        configurable_fields: [],
        supports_project_notes: true,
        primary_actions: []
      };
    }

    const service = services.find(function (s) { return s.id === offering.service_id; }) || null;

    // Derive configurable fields based on offering_type
    const configurableFields = [];
    if (offering.offering_type === 'led_upgrade_package') {
      configurableFields.push({
        field_name: 'number_of_fixtures',
        label: 'Number of Fixtures',
        input_type: 'number',
        required: false,
        min_value: 1,
        max_value: 10000,
        step: 1,
        placeholder: 'e.g. 20',
        help_text: 'Enter the approximate number of fixtures to upgrade.'
      });
    } else if (offering.offering_type === 'maintenance_plan') {
      configurableFields.push({
        field_name: 'locations',
        label: 'Number of Locations',
        input_type: 'number',
        required: false,
        min_value: offering.min_locations || 1,
        max_value: offering.max_locations || 100,
        step: 1,
        placeholder: 'e.g. 3',
        help_text: 'Number of sites to include in this plan.'
      });
    } else if (offering.offering_type === 'ev_installation_package') {
      configurableFields.push({
        field_name: 'preferred_date',
        label: 'Preferred Installation Date',
        input_type: 'date',
        required: false,
        min_value: null,
        max_value: null,
        step: null,
        placeholder: '',
        help_text: 'Select a preferred installation or consultation date.'
      });
    }

    let primaryActions = [];
    if (offering.offering_type === 'led_upgrade_package') {
      primaryActions = ['request_quote'];
    } else if (offering.offering_type === 'maintenance_plan') {
      primaryActions = ['add_to_quote'];
    } else if (offering.offering_type === 'ev_installation_package') {
      primaryActions = ['schedule_consultation'];
    }

    return {
      offering_id: offering.id,
      service_id: offering.service_id,
      service_name: service ? service.name : '',
      name: offering.name,
      slug: offering.slug || '',
      offering_type: offering.offering_type,
      description: offering.description || '',
      for_commercial: !!offering.for_commercial,
      for_residential: !!offering.for_residential,
      project_type: offering.project_type || '',
      base_price_min: offering.base_price_min,
      base_price_max: offering.base_price_max,
      price_display: offering.price_display || '',
      currency: offering.currency,
      includes_permit_handling: !!offering.includes_permit_handling,
      warranty_years: offering.warranty_years || 0,
      scheduled_visits_per_year: offering.scheduled_visits_per_year || 0,
      min_locations: offering.min_locations || 0,
      max_locations: offering.max_locations || 0,
      feature_list: offering.feature_list || [],
      is_active: !!offering.is_active,
      configurable_fields: configurableFields,
      supports_project_notes: true,
      primary_actions: primaryActions
    };
  }

  // submitPackageQuoteRequest(offeringId, numberOfFixtures, projectNotes)
  submitPackageQuoteRequest(offeringId, numberOfFixtures, projectNotes) {
    const offerings = this._getFromStorage('offerings', []);
    const offering = offerings.find(function (o) { return o.id === offeringId; });
    if (!offering) {
      return {
        success: false,
        package_quote_request_id: null,
        status: 'submitted',
        created_at: this._nowIso(),
        message: 'Offering not found.'
      };
    }

    const now = this._nowIso();
    const requests = this._getFromStorage('package_quote_requests', []);
    const request = {
      id: this._generateId('pkg_quote'),
      offering_id: offeringId,
      number_of_fixtures: typeof numberOfFixtures === 'number' ? numberOfFixtures : null,
      project_notes: projectNotes || '',
      created_at: now,
      status: 'submitted'
    };
    requests.push(request);
    this._saveToStorage('package_quote_requests', requests);

    return {
      success: true,
      package_quote_request_id: request.id,
      status: request.status,
      created_at: request.created_at,
      message: 'Quote request submitted.'
    };
  }

  // addOfferingToQuote(offeringId, quantity = 1)
  addOfferingToQuote(offeringId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const offerings = this._getFromStorage('offerings', []);
    const offering = offerings.find(function (o) { return o.id === offeringId; });
    if (!offering) {
      return {
        success: false,
        quote_draft_id: null,
        quote_item_id: null,
        status: 'open',
        item_count: 0,
        message: 'Offering not found.'
      };
    }

    const draft = this._getCurrentQuoteDraft();
    const now = this._nowIso();
    let quoteItems = this._getFromStorage('quote_items', []);

    const item = {
      id: this._generateId('quote_item'),
      quote_draft_id: draft.id,
      offering_id: offeringId,
      quantity: qty,
      created_at: now
    };
    quoteItems.push(item);
    this._saveToStorage('quote_items', quoteItems);

    // Update draft updated_at
    let drafts = this._getFromStorage('quote_drafts', []);
    const idx = drafts.findIndex(function (d) { return d.id === draft.id; });
    if (idx >= 0) {
      drafts[idx].updated_at = now;
      this._saveToStorage('quote_drafts', drafts);
    }

    const itemCount = quoteItems.filter(function (qi) { return qi.quote_draft_id === draft.id; }).length;

    return {
      success: true,
      quote_draft_id: draft.id,
      quote_item_id: item.id,
      status: draft.status,
      item_count: itemCount,
      message: 'Offering added to quote.'
    };
  }

  // getEmergencyServiceInfo()
  getEmergencyServiceInfo() {
    const services = this._getFromStorage('services', []);
    const companyInfo = this._getFromStorage('company_info', {});
    const emergencyServices = services.filter(function (s) { return s.is_emergency_service; });

    const headline = emergencyServices.length > 0
      ? '24/7 Emergency Electrical Services'
      : 'Emergency Electrical Services';

    const issueTypes = [
      {
        issue_type: 'complete_power_outage',
        label: 'Complete power outage',
        description: 'Full loss of power to your facility or major area.'
      },
      {
        issue_type: 'partial_power_outage',
        label: 'Partial power outage',
        description: 'Some circuits or areas have lost power.'
      },
      {
        issue_type: 'equipment_failure',
        label: 'Equipment failure',
        description: 'Critical electrical equipment is not functioning.'
      },
      {
        issue_type: 'other',
        label: 'Other urgent issue',
        description: 'Any other urgent electrical problem.'
      }
    ];

    return {
      headline: headline,
      description: 'On-call licensed electricians for commercial and residential emergencies.',
      service_types: ['commercial', 'residential'],
      issue_types: issueTypes,
      expected_response_time: 'Within 2–4 hours for most metro areas.',
      contact_phone: companyInfo.main_phone || ''
    };
  }

  // getEmergencyBookingTimeSlots(serviceType, issueType)
  getEmergencyBookingTimeSlots(serviceType, issueType) {
    const now = new Date();
    const timeSlots = [];

    // Generate 12 two-hour slots starting from next hour
    const start = new Date(now.getTime());
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);

    for (let i = 0; i < 12; i++) {
      const slotStart = new Date(start.getTime() + i * 60 * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
      const diffMs = slotStart.getTime() - now.getTime();
      const within24 = diffMs <= 24 * 60 * 60 * 1000;

      timeSlots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        is_within_24_hours: within24,
        is_available: true
      });
    }

    return {
      time_slots: timeSlots,
      generated_at: now.toISOString()
    };
  }

  // createEmergencyBooking(serviceType, issueType, scheduledStart, scheduledEnd, businessAddress, contactPhone, description)
  createEmergencyBooking(serviceType, issueType, scheduledStart, scheduledEnd, businessAddress, contactPhone, description) {
    const now = this._nowIso();
    const bookings = this._getFromStorage('emergency_bookings', []);

    const booking = {
      id: this._generateId('emergency'),
      service_type: serviceType,
      issue_type: issueType,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd || null,
      business_address: businessAddress,
      contact_phone: contactPhone,
      description: description || '',
      created_at: now,
      status: 'pending'
    };

    bookings.push(booking);
    this._saveToStorage('emergency_bookings', bookings);

    return {
      success: true,
      emergency_booking_id: booking.id,
      status: booking.status,
      scheduled_start: booking.scheduled_start,
      scheduled_end: booking.scheduled_end,
      message: 'Emergency booking submitted.'
    };
  }

  // getMaintenancePlanFilterOptions()
  getMaintenancePlanFilterOptions() {
    const offerings = this._getFromStorage('offerings', []);
    let plans = offerings.filter(function (o) { return o.offering_type === 'maintenance_plan' && o.is_active; });

    // Fallback: if no dedicated maintenance plans exist, use active commercial offerings
    if (plans.length === 0) {
      plans = offerings.filter(function (o) { return o.is_active && !!o.for_commercial; });
    }

    // Derive number_of_locations_options from plans
    const rangeMap = {};
    plans.forEach(function (p) {
      const minL = typeof p.min_locations === 'number' ? p.min_locations : 0;
      const maxL = typeof p.max_locations === 'number' ? p.max_locations : 0;
      const key = minL + '_' + maxL;
      if (!rangeMap[key]) {
        rangeMap[key] = { min: minL, max: maxL };
      }
    });

    const numberOfLocationsOptions = Object.keys(rangeMap)
      .map(function (key) { return rangeMap[key]; })
      .sort(function (a, b) { return a.min - b.min; })
      .map(function (r) {
        const label = (r.min && r.max) ? (r.min + '–' + r.max + ' locations') : 'All locations';
        return {
          value: r.min + '_' + r.max,
          label: label,
          min_locations: r.min,
          max_locations: r.max
        };
      });

    let minBudget = 0;
    let maxBudget = 0;
    if (plans.length > 0) {
      const mins = plans.map(function (p) { return p.base_price_min; });
      const maxs = plans.map(function (p) { return p.base_price_max; });
      minBudget = Math.min.apply(null, mins);
      maxBudget = Math.max.apply(null, maxs);
    }

    const annualBudgetRange = {
      min: minBudget,
      max: maxBudget,
      step: 100
    };

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'visits_desc', label: 'Visits per Year: High to Low' }
    ];

    const planTypes = ['commercial', 'residential', 'all'];

    return {
      plan_types: planTypes,
      number_of_locations_options: numberOfLocationsOptions,
      annual_budget_range: annualBudgetRange,
      sort_options: sortOptions
    };
  }

  // listMaintenancePlans(planType, numberOfLocationsOption, maxAnnualBudget, sortBy)
  listMaintenancePlans(planType, numberOfLocationsOption, maxAnnualBudget, sortBy) {
    const offerings = this._getFromStorage('offerings', []);
    let plans = offerings.filter(function (o) { return o.offering_type === 'maintenance_plan' && o.is_active; });

    // Fallback: if no dedicated maintenance plans exist, treat active commercial offerings as plans
    if (plans.length === 0) {
      plans = offerings.filter(function (o) { return o.is_active && !!o.for_commercial; });
    }

    if (planType === 'commercial') {
      plans = plans.filter(function (p) { return p.for_commercial; });
    } else if (planType === 'residential') {
      plans = plans.filter(function (p) { return p.for_residential; });
    }

    if (numberOfLocationsOption) {
      const parts = String(numberOfLocationsOption).split('_');
      const minL = parseInt(parts[0], 10) || 0;
      const maxL = parseInt(parts[1], 10) || 0;
      if (minL || maxL) {
        plans = plans.filter(function (p) {
          const pMin = typeof p.min_locations === 'number' ? p.min_locations : 0;
          const pMax = typeof p.max_locations === 'number' ? p.max_locations : 0;
          return (pMin <= maxL) && (pMax >= minL);
        });
      }
    }

    if (typeof maxAnnualBudget === 'number' && maxAnnualBudget > 0) {
      plans = plans.filter(function (p) { return p.base_price_min <= maxAnnualBudget; });
    }

    const sortKey = sortBy || 'price_low_to_high';
    plans.sort(function (a, b) {
      if (sortKey === 'price_high_to_low') {
        return b.base_price_min - a.base_price_min;
      }
      if (sortKey === 'visits_desc') {
        const av = a.scheduled_visits_per_year || 0;
        const bv = b.scheduled_visits_per_year || 0;
        return bv - av;
      }
      // default price_low_to_high
      return a.base_price_min - b.base_price_min;
    });

    return plans.map(function (p) {
      return {
        offering_id: p.id,
        name: p.name,
        description: p.description || '',
        offering_type: p.offering_type,
        price_display: p.price_display || '',
        base_price_min: p.base_price_min,
        base_price_max: p.base_price_max,
        currency: p.currency,
        scheduled_visits_per_year: (typeof p.scheduled_visits_per_year === 'number' && p.scheduled_visits_per_year > 0) ? p.scheduled_visits_per_year : 1,
        min_locations: p.min_locations || 0,
        max_locations: p.max_locations || 0,
        feature_list: p.feature_list || []
      };
    });
  }

  // getProjectFilterOptions()
  getProjectFilterOptions() {
    const projectTypes = [
      { value: 'commercial', label: 'Commercial' },
      { value: 'residential', label: 'Residential' }
    ];

    const categories = [
      { value: 'lighting', label: 'Lighting' },
      { value: 'ev_charging', label: 'EV Charging' },
      { value: 'panel_upgrade', label: 'Panel Upgrades' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'other', label: 'Other' }
    ];

    const completionDatePresets = [
      {
        value: 'last_12_months',
        label: 'Last 12 months',
        from_date: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString()
      },
      {
        value: 'last_24_months',
        label: 'Last 24 months',
        from_date: new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString()
      },
      {
        value: 'after_2023_01_01',
        label: 'After Jan 1, 2023',
        from_date: '2023-01-01T00:00:00.000Z'
      }
    ];

    const budgetTiers = [
      {
        value: 'under_25000',
        label: 'Under $25,000',
        min: 0,
        max: 24999
      },
      {
        value: '25000_to_49999',
        label: '$25,000–$49,999',
        min: 25000,
        max: 49999
      },
      {
        value: '50000_and_above',
        label: '$50,000 and above',
        min: 50000,
        max: 999999999
      }
    ];

    return {
      project_types: projectTypes,
      categories: categories,
      completion_date_presets: completionDatePresets,
      budget_tiers: budgetTiers
    };
  }

  // listProjects(filters, sortBy)
  listProjects(filters, sortBy) {
    const projects = this._getFromStorage('projects', []);
    const favorites = this._getFromStorage('favorites', []);

    const f = filters || {};
    let result = projects.slice();

    if (f.projectType) {
      result = result.filter(function (p) { return p.project_type === f.projectType; });
    }
    if (f.category) {
      result = result.filter(function (p) { return p.category === f.category; });
    }
    if (f.completionDateFrom) {
      const from = new Date(f.completionDateFrom).getTime();
      result = result.filter(function (p) { return new Date(p.completion_date).getTime() >= from; });
    }
    if (f.completionDateTo) {
      const to = new Date(f.completionDateTo).getTime();
      result = result.filter(function (p) { return new Date(p.completion_date).getTime() <= to; });
    }
    if (typeof f.budgetMin === 'number') {
      result = result.filter(function (p) { return (p.budget_max || 0) >= f.budgetMin; });
    }
    if (typeof f.budgetMax === 'number') {
      result = result.filter(function (p) { return (p.budget_min || 0) <= f.budgetMax; });
    }

    const sortKey = sortBy || 'completion_date_desc';
    result.sort(function (a, b) {
      if (sortKey === 'completion_date_asc') {
        return new Date(a.completion_date).getTime() - new Date(b.completion_date).getTime();
      }
      // default desc
      return new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime();
    });

    return result.map((p) => {
      const isFav = favorites.some(function (fItem) { return fItem.item_type === 'project' && fItem.item_id === p.id; });
      return {
        project_id: p.id,
        title: p.title,
        project_type: p.project_type,
        category: p.category,
        budget_display: p.budget_display || '',
        budget_min: p.budget_min || 0,
        budget_max: p.budget_max || 0,
        completion_date: p.completion_date,
        location: p.location || '',
        thumbnail_image: p.thumbnail_image || '',
        is_favorited: isFav
      };
    });
  }

  // addProjectToFavorites(projectId)
  addProjectToFavorites(projectId) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find(function (p) { return p.id === projectId; });
    if (!project) {
      return {
        success: false,
        favorite_item_id: null,
        created_at: this._nowIso(),
        total_favorites: this._getFavoritesStore().length,
        message: 'Project not found.'
      };
    }

    let favorites = this._getFavoritesStore();
    const existing = favorites.find(function (f) { return f.item_type === 'project' && f.item_id === projectId; });
    if (existing) {
      return {
        success: true,
        favorite_item_id: existing.id,
        created_at: existing.created_at,
        total_favorites: favorites.length,
        message: 'Project already in favorites.'
      };
    }

    const now = this._nowIso();
    const fav = {
      id: this._generateId('fav'),
      item_type: 'project',
      item_id: projectId,
      created_at: now
    };
    favorites.push(fav);
    this._saveFavoritesStore(favorites);

    return {
      success: true,
      favorite_item_id: fav.id,
      created_at: fav.created_at,
      total_favorites: favorites.length,
      message: 'Project added to favorites.'
    };
  }

  // removeFavoriteItem(favoriteItemId)
  removeFavoriteItem(favoriteItemId) {
    let favorites = this._getFavoritesStore();
    const before = favorites.length;
    favorites = favorites.filter(function (f) { return f.id !== favoriteItemId; });
    this._saveFavoritesStore(favorites);

    const removed = before !== favorites.length;
    return {
      success: removed,
      remaining_count: favorites.length,
      message: removed ? 'Favorite removed.' : 'Favorite not found.'
    };
  }

  // getFavoriteItems()
  getFavoriteItems() {
    const favorites = this._getFavoritesStore();
    const projects = this._getFromStorage('projects', []);

    return favorites
      .filter(function (f) { return f.item_type === 'project'; })
      .map(function (f) {
        const project = projects.find(function (p) { return p.id === f.item_id; }) || null;
        const base = {
          favorite_item_id: f.id,
          item_type: f.item_type,
          project_id: project ? project.id : null,
          project_title: project ? project.title : '',
          project_type: project ? project.project_type : '',
          category: project ? project.category : '',
          budget_display: project ? (project.budget_display || '') : '',
          completion_date: project ? project.completion_date : '',
          location: project ? (project.location || '') : ''
        };
        // Foreign key resolution: include full project object
        return Object.assign({}, base, {
          project: project
        });
      });
  }

  // getProjectDetail(projectId)
  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find(function (p) { return p.id === projectId; }) || null;

    if (!project) {
      return {
        project_id: null,
        title: '',
        project_type: '',
        category: '',
        description: '',
        scope: '',
        challenges: '',
        solutions: '',
        results: '',
        budget_display: '',
        completion_date: '',
        location: '',
        image_gallery: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      const favorites = this._getFromStorage('favorites', []);
      const isFavorite = favorites.some(function (f) {
        return f.item_type === 'project' && f.item_id === projectId;
      });
      if (isFavorite) {
        localStorage.setItem('task4_openedFavoriteProjectDetail', JSON.stringify({
          project_id: project.id,
          opened_at: this._nowIso()
        }));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      project_id: project.id,
      title: project.title,
      project_type: project.project_type,
      category: project.category,
      description: project.description || '',
      scope: '',
      challenges: '',
      solutions: '',
      results: '',
      budget_display: project.budget_display || '',
      completion_date: project.completion_date,
      location: project.location || '',
      image_gallery: []
    };
  }

  // getEvCostCalculatorOptions()
  getEvCostCalculatorOptions() {
    const levels = [
      { value: 'level_1', label: 'Level 1 (120V)' },
      { value: 'level_2', label: 'Level 2 (208–240V)' },
      { value: 'dc_fast', label: 'DC Fast Charging' }
    ];

    const tiers = this._getFromStorage('ev_hardware_tiers', []).map(function (t) {
      return {
        tier_code: t.tier_code,
        name: t.name,
        applicable_charger_level: t.applicable_charger_level,
        price_per_charger: t.price_per_charger,
        description: t.description || ''
      };
    });

    const defaults = {
      default_charger_level: 'level_2',
      default_number_of_chargers: 4
    };

    return {
      charger_levels: levels,
      hardware_tiers: tiers,
      defaults: defaults
    };
  }

  // calculateEvCostEstimate(numberOfChargers, chargerLevel, hardwareTierCode)
  calculateEvCostEstimate(numberOfChargers, chargerLevel, hardwareTierCode) {
    const tiers = this._getFromStorage('ev_hardware_tiers', []);
    const tier = tiers.find(function (t) { return t.tier_code === hardwareTierCode; }) || null;

    const qty = typeof numberOfChargers === 'number' && numberOfChargers > 0 ? numberOfChargers : 0;
    const pricePer = tier ? tier.price_per_charger : 0;

    const hardwareSubtotal = qty * pricePer;
    const installationAllowance = Math.round(hardwareSubtotal * 0.4);
    const permitsAllowance = Math.round(hardwareSubtotal * 0.1);
    const estimatedTotal = hardwareSubtotal + installationAllowance + permitsAllowance;

    return {
      number_of_chargers: qty,
      charger_level: chargerLevel,
      hardware_tier_code: hardwareTierCode,
      estimated_total: estimatedTotal,
      currency: 'usd',
      breakdown: {
        hardware_subtotal: hardwareSubtotal,
        installation_allowance: installationAllowance,
        permits_and_inspection_allowance: permitsAllowance
      }
    };
  }

  // saveEvCostEstimateAndCreateAccount(name, email, password, numberOfChargers, chargerLevel, hardwareTierCode)
  saveEvCostEstimateAndCreateAccount(name, email, password, numberOfChargers, chargerLevel, hardwareTierCode) {
    const users = this._getFromStorage('users', []);
    let user = users.find(function (u) { return u.email === email; }) || null;

    if (!user) {
      user = {
        id: this._generateId('user'),
        name: name,
        email: email,
        password: password
      };
      users.push(user);
      this._saveToStorage('users', users);
    }

    const estimateCalc = this.calculateEvCostEstimate(numberOfChargers, chargerLevel, hardwareTierCode);

    const estimates = this._getFromStorage('ev_cost_estimates', []);
    const estimate = {
      id: this._generateId('ev_estimate'),
      number_of_chargers: estimateCalc.number_of_chargers,
      charger_level: estimateCalc.charger_level,
      hardware_tier_code: estimateCalc.hardware_tier_code,
      estimated_total: estimateCalc.estimated_total,
      created_at: this._nowIso(),
      contact_name: name,
      contact_email: email,
      notes: ''
    };

    estimates.push(estimate);
    this._saveToStorage('ev_cost_estimates', estimates);

    const ctx = this._getSingleUserContext();
    ctx.current_user_id = user.id;
    ctx.last_ev_cost_estimate_id = estimate.id;
    this._saveSingleUserContext(ctx);

    return {
      success: true,
      ev_cost_estimate_id: estimate.id,
      estimated_total: estimate.estimated_total,
      currency: 'usd',
      message: 'Account created and estimate saved.'
    };
  }

  // getEvInstallationPackageFilterOptions()
  getEvInstallationPackageFilterOptions() {
    const projectTypeOptions = [
      { value: 'commercial_parking_lot', label: 'Commercial Parking Lot' },
      { value: 'residential_garage', label: 'Residential Garage' },
      { value: 'workplace', label: 'Workplace' },
      { value: 'fleet_depot', label: 'Fleet Depot' },
      { value: 'warehouse', label: 'Warehouse' }
    ];

    const featureOptions = [
      { value: 'permit_handling_included', label: 'Permit handling included' },
      { value: 'warranty_2_plus_years', label: '2+ year warranty' }
    ];

    const offerings = this._getFromStorage('offerings', []);
    let packages = offerings.filter(function (o) { return o.offering_type === 'ev_installation_package' && o.is_active; });

    // Fallback: if no dedicated EV installation packages exist, use active commercial offerings
    if (packages.length === 0) {
      packages = offerings.filter(function (o) { return o.is_active && !!o.for_commercial; });
    }

    let minPrice = 0;
    let maxPrice = 0;
    if (packages.length > 0) {
      const mins = packages.map(function (p) { return p.base_price_min; });
      const maxs = packages.map(function (p) { return p.base_price_max; });
      minPrice = Math.min.apply(null, mins);
      maxPrice = Math.max.apply(null, maxs);
    }

    const priceRange = {
      min: minPrice,
      max: maxPrice,
      step: 100
    };

    return {
      project_type_options: projectTypeOptions,
      feature_options: featureOptions,
      price_range: priceRange
    };
  }

  // listEvInstallationPackages(projectType, requiredFeatures, maxPrice, sortBy)
  listEvInstallationPackages(projectType, requiredFeatures, maxPrice, sortBy) {
    const offerings = this._getFromStorage('offerings', []);
    let packages = offerings.filter(function (o) { return o.offering_type === 'ev_installation_package' && o.is_active; });

    const hasRealEvPackages = packages.length > 0;

    // Fallback: if no dedicated EV installation packages exist, use active commercial offerings
    if (!hasRealEvPackages) {
      packages = offerings.filter(function (o) { return o.is_active && !!o.for_commercial; });
    }

    if (projectType && hasRealEvPackages) {
      packages = packages.filter(function (p) { return p.project_type === projectType; });
    }

    const features = requiredFeatures || [];
    if (features && features.length > 0) {
      packages = packages.filter(function (p) {
        let ok = true;
        if (features.indexOf('permit_handling_included') !== -1) {
          ok = ok && !!p.includes_permit_handling;
        }
        if (features.indexOf('warranty_2_plus_years') !== -1) {
          ok = ok && (p.warranty_years || 0) >= 2;
        }
        return ok;
      });
    }

    if (typeof maxPrice === 'number' && maxPrice > 0) {
      packages = packages.filter(function (p) { return p.base_price_max <= maxPrice; });
    }

    const sortKey = sortBy || 'price_low_to_high';
    packages.sort(function (a, b) {
      if (sortKey === 'price_high_to_low') {
        return b.base_price_min - a.base_price_min;
      }
      return a.base_price_min - b.base_price_min;
    });

    return packages.map(function (p) {
      return {
        offering_id: p.id,
        name: p.name,
        description: p.description || '',
        offering_type: p.offering_type,
        project_type: p.project_type || '',
        price_display: p.price_display || '',
        base_price_min: p.base_price_min,
        base_price_max: p.base_price_max,
        currency: p.currency,
        includes_permit_handling: !!p.includes_permit_handling,
        warranty_years: p.warranty_years || 0,
        feature_list: p.feature_list || []
      };
    });
  }

  // startEvInstallationConsultation(offeringId, preferredDatetime, notes)
  startEvInstallationConsultation(offeringId, preferredDatetime, notes) {
    const offerings = this._getFromStorage('offerings', []);
    const offering = offerings.find(function (o) { return o.id === offeringId; });
    if (!offering) {
      return {
        success: false,
        consultation_request_id: null,
        status: 'started',
        message: 'Offering not found.'
      };
    }

    const requests = this._getFromStorage('ev_installation_consultation_requests', []);
    const request = {
      id: this._generateId('ev_consult'),
      offering_id: offeringId,
      created_at: this._nowIso(),
      status: 'started',
      preferred_datetime: preferredDatetime || null,
      notes: notes || ''
    };
    requests.push(request);
    this._saveToStorage('ev_installation_consultation_requests', requests);

    return {
      success: true,
      consultation_request_id: request.id,
      status: request.status,
      message: 'Consultation request started.'
    };
  }

  // getServiceAreasOverview()
  getServiceAreasOverview() {
    const serviceAreas = this._getFromStorage('service_areas', []);
    const citiesMap = {};
    serviceAreas.forEach(function (sa) {
      if (sa.city) {
        citiesMap[sa.city] = true;
      }
    });
    const exampleCities = Object.keys(citiesMap).slice(0, 5);

    return {
      intro_text: 'We serve a wide range of commercial and industrial clients across our region.',
      example_cities: exampleCities,
      has_zip_checker: true
    };
  }

  // checkZipCoverage(zipCode)
  checkZipCoverage(zipCode) {
    const serviceAreas = this._getFromStorage('service_areas', []);
    const area = serviceAreas.find(function (sa) { return sa.zip_code === zipCode; }) || null;

    if (!area) {
      return {
        zip_code: zipCode,
        is_covered: false,
        city: '',
        state: '',
        message: 'This ZIP code is currently outside our listed service areas. Please contact us for confirmation.'
      };
    }

    return {
      zip_code: area.zip_code,
      is_covered: !!area.is_covered,
      city: area.city || '',
      state: area.state || '',
      message: area.is_covered
        ? 'Good news! We serve this ZIP code.'
        : 'This ZIP code is currently outside our standard service area.'
    };
  }

  // submitServiceRequest(zipCode, serviceNeeded, message)
  submitServiceRequest(zipCode, serviceNeeded, message) {
    const requests = this._getFromStorage('service_requests', []);
    const now = this._nowIso();
    const req = {
      id: this._generateId('service_req'),
      zip_code: zipCode,
      service_needed: serviceNeeded,
      message: message,
      created_at: now,
      status: 'new'
    };

    requests.push(req);
    this._saveToStorage('service_requests', requests);

    return {
      success: true,
      service_request_id: req.id,
      status: req.status,
      created_at: req.created_at,
      confirmation_message: 'Your service request has been received. We will contact you shortly.'
    };
  }

  // getBlogCategories()
  getBlogCategories() {
    // Based on Article.category enum
    const categories = [
      { value: 'code_updates', label: 'Code Updates' },
      { value: 'safety', label: 'Safety' },
      { value: 'ev_charging', label: 'EV Charging' },
      { value: 'projects', label: 'Projects' },
      { value: 'general', label: 'General' }
    ];
    return categories;
  }

  // searchArticles(query, category, sortBy)
  searchArticles(query, category, sortBy) {
    const articles = this._getFromStorage('articles', []);
    const q = (query || '').toLowerCase();

    let result = articles.filter(function (a) {
      if (category && a.category !== category) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = (a.title + ' ' + (a.summary || '') + ' ' + (a.content || '')).toLowerCase();
      const tokens = q.split(/\s+/).filter(function (token) { return token.length > 0; });
      if (tokens.length === 0) {
        return true;
      }
      return tokens.every(function (token) { return haystack.indexOf(token) !== -1; });
    });

    const sortKey = sortBy || 'published_at_desc';
    result.sort(function (a, b) {
      const at = new Date(a.published_at).getTime();
      const bt = new Date(b.published_at).getTime();
      if (sortKey === 'published_at_asc') {
        return at - bt;
      }
      return bt - at;
    });

    return result.map(function (a) {
      return {
        article_id: a.id,
        title: a.title,
        category: a.category || '',
        summary: a.summary || '',
        author_name: a.author_name || '',
        published_at: a.published_at
      };
    });
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(function (a) { return a.id === articleId; }) || null;

    if (!article) {
      return {
        article_id: null,
        title: '',
        category: '',
        content: '',
        summary: '',
        author_name: '',
        published_at: ''
      };
    }

    return {
      article_id: article.id,
      title: article.title,
      category: article.category || '',
      content: article.content || '',
      summary: article.summary || '',
      author_name: article.author_name || '',
      published_at: article.published_at
    };
  }

  // shareArticleByEmail(articleId, recipientEmail)
  shareArticleByEmail(articleId, recipientEmail) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    if (!article) {
      return {
        success: false,
        article_share_email_id: null,
        sent_at: this._nowIso(),
        message: 'Article not found.'
      };
    }

    const shares = this._getFromStorage('article_share_emails', []);
    const now = this._nowIso();
    const share = {
      id: this._generateId('article_share'),
      article_id: articleId,
      recipient_email: recipientEmail,
      sent_at: now
    };

    shares.push(share);
    this._saveToStorage('article_share_emails', shares);

    return {
      success: true,
      article_share_email_id: share.id,
      sent_at: share.sent_at,
      message: 'Article link sent via email (simulated).'
    };
  }

  // getProductCategories()
  getProductCategories() {
    const categories = this._getFromStorage('product_categories', []);
    return categories.map(function (c) {
      return {
        category_id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || ''
      };
    });
  }

  // getProductFilterOptions(categorySlug)
  getProductFilterOptions(categorySlug) {
    const categories = this._getFromStorage('product_categories', []);
    const products = this._getFromStorage('products', []);

    let filteredProducts = products.slice();

    if (categorySlug && categorySlug !== 'all') {
      const category = categories.find(function (c) { return c.slug === categorySlug; }) || null;
      if (category) {
        filteredProducts = filteredProducts.filter(function (p) { return p.category_id === category.id; });
      } else {
        filteredProducts = [];
      }
    }

    let minPrice = 0;
    let maxPrice = 0;
    if (filteredProducts.length > 0) {
      const mins = filteredProducts.map(function (p) { return p.price; });
      const maxs = filteredProducts.map(function (p) { return p.price; });
      minPrice = Math.min.apply(null, mins);
      maxPrice = Math.max.apply(null, maxs);
    }

    const ratingFilterOptions = [
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 2, label: '2 stars & up' }
    ];

    const priceRange = {
      min: minPrice,
      max: maxPrice,
      step: 1
    };

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Customer Rating' }
    ];

    return {
      rating_filter_options: ratingFilterOptions,
      price_range: priceRange,
      sort_options: sortOptions
    };
  }

  // listProducts(categorySlug, minRating, priceMin, priceMax, sortBy)
  listProducts(categorySlug, minRating, priceMin, priceMax, sortBy) {
    const categories = this._getFromStorage('product_categories', []);
    const products = this._getFromStorage('products', []);

    let result = products.filter(function (p) { return p.is_active; });

    if (categorySlug && categorySlug !== 'all') {
      const category = categories.find(function (c) { return c.slug === categorySlug; }) || null;
      if (category) {
        result = result.filter(function (p) { return p.category_id === category.id; });
      } else {
        result = [];
      }
    }

    if (typeof minRating === 'number') {
      result = result.filter(function (p) { return (p.rating || 0) >= minRating; });
    }

    if (typeof priceMin === 'number') {
      result = result.filter(function (p) { return p.price >= priceMin; });
    }

    if (typeof priceMax === 'number' && priceMax > 0) {
      result = result.filter(function (p) { return p.price <= priceMax; });
    }

    const sortKey = sortBy || 'price_low_to_high';
    result.sort(function (a, b) {
      if (sortKey === 'price_high_to_low') {
        return b.price - a.price;
      }
      if (sortKey === 'rating_desc') {
        return (b.rating || 0) - (a.rating || 0);
      }
      return a.price - b.price;
    });

    return result.map(function (p) {
      const category = categories.find(function (c) { return c.id === p.category_id; }) || null;
      return {
        product_id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        rating: p.rating || 0,
        rating_count: p.rating_count || 0,
        image_url: p.image_url || '',
        category_name: category ? category.name : '',
        is_active: !!p.is_active
      };
    });
  }

  // addProductToCart(productId, quantity = 1)
  addProductToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find(function (p) { return p.id === productId && p.is_active; });
    if (!product) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        item_count: 0,
        cart_total: 0,
        message: 'Product not found or inactive.'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const now = this._nowIso();

    let item = cartItems.find(function (ci) { return ci.cart_id === cart.id && ci.product_id === productId; });
    if (item) {
      item.quantity += qty;
      item.line_subtotal = item.quantity * item.unit_price;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price,
        line_subtotal: product.price * qty,
        created_at: now
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);

    // update cart updated_at
    let carts = this._getFromStorage('cart', []);
    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx >= 0) {
      carts[idx].updated_at = now;
      this._saveToStorage('cart', carts);
    }

    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });
    const cartTotal = itemsForCart.reduce(function (sum, ci) { return sum + ci.line_subtotal; }, 0);

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: item.id,
      item_count: itemsForCart.length,
      cart_total: cartTotal,
      message: 'Product added to cart.'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const items = cartItems
      .filter(function (ci) { return ci.cart_id === cart.id; })
      .map(function (ci) {
        const product = products.find(function (p) { return p.id === ci.product_id; }) || null;
        const base = {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: product ? product.name : '',
          image_url: product ? (product.image_url || '') : '',
          unit_price: ci.unit_price,
          quantity: ci.quantity,
          line_subtotal: ci.line_subtotal
        };
        // Foreign key resolution: include full product object
        return Object.assign({}, base, {
          product: product
        });
      });

    const itemsSubtotal = items.reduce(function (sum, ci) { return sum + ci.line_subtotal; }, 0);
    const taxEstimate = Math.round(itemsSubtotal * 0.08 * 100) / 100;
    const total = itemsSubtotal + taxEstimate;

    return {
      cart_id: cart.id,
      status: cart.status,
      items: items,
      totals: {
        items_subtotal: itemsSubtotal,
        tax_estimate: taxEstimate,
        total: total
      }
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = typeof quantity === 'number' ? quantity : 0;
    let cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return {
        success: false,
        cart_id: null,
        updated_item: null,
        totals: {
          items_subtotal: 0,
          tax_estimate: 0,
          total: 0
        },
        message: 'Cart item not found.'
      };
    }

    const item = cartItems[idx];

    if (qty <= 0) {
      const cartId = item.cart_id;
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      const remaining = cartItems.filter(function (ci) { return ci.cart_id === cartId; });
      const itemsSubtotal = remaining.reduce(function (sum, ci) { return sum + ci.line_subtotal; }, 0);
      const taxEstimate = Math.round(itemsSubtotal * 0.08 * 100) / 100;
      const total = itemsSubtotal + taxEstimate;

      return {
        success: true,
        cart_id: cartId,
        updated_item: null,
        totals: {
          items_subtotal: itemsSubtotal,
          tax_estimate: taxEstimate,
          total: total
        },
        message: 'Item removed from cart.'
      };
    }

    // Update quantity and subtotal
    const product = products.find(function (p) { return p.id === item.product_id; }) || null;
    const unitPrice = product ? product.price : item.unit_price;
    item.quantity = qty;
    item.unit_price = unitPrice;
    item.line_subtotal = unitPrice * qty;
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const cartId = item.cart_id;
    const remaining = cartItems.filter(function (ci) { return ci.cart_id === cartId; });
    const itemsSubtotal = remaining.reduce(function (sum, ci) { return sum + ci.line_subtotal; }, 0);
    const taxEstimate = Math.round(itemsSubtotal * 0.08 * 100) / 100;
    const total = itemsSubtotal + taxEstimate;

    return {
      success: true,
      cart_id: cartId,
      updated_item: {
        cart_item_id: item.id,
        quantity: item.quantity,
        line_subtotal: item.line_subtotal
      },
      totals: {
        items_subtotal: itemsSubtotal,
        tax_estimate: taxEstimate,
        total: total
      },
      message: 'Cart item updated.'
    };
  }

  // startCheckout()
  startCheckout() {
    const summary = this.getCartSummary();
    const cartId = summary.cart_id;

    // Instrumentation for task completion tracking
    try {
      if (summary && summary.items && summary.items.length > 0) {
        localStorage.setItem('task9_checkoutSnapshot', JSON.stringify({
          cart_id: cartId,
          created_at: this._nowIso(),
          items: summary.items.map(i => ({
            product_name: i.product_name,
            unit_price: i.unit_price,
            quantity: i.quantity,
            line_subtotal: i.line_subtotal
          })),
          totals: summary.totals
        }));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    // Do not change status to checked_out yet; just return summary
    return {
      success: true,
      cart_id: cartId,
      status: summary.status,
      items: summary.items.map(function (i) {
        return {
          product_name: i.product_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          line_subtotal: i.line_subtotal
        };
      }),
      totals: summary.totals,
      message: 'Checkout started.'
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const summary = this.getCartSummary();
    return {
      cart_id: summary.cart_id,
      status: summary.status,
      items: summary.items.map(function (i) {
        return {
          product_name: i.product_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          line_subtotal: i.line_subtotal
        };
      }),
      totals: summary.totals
    };
  }

  // getCompanyInfo()
  getCompanyInfo() {
    const info = this._getFromStorage('company_info', {});
    return {
      company_name: info.company_name || '',
      years_in_business: info.years_in_business || 0,
      license_info: info.license_info || '',
      service_focus: info.service_focus || '',
      about_text: info.about_text || '',
      office_address: info.office_address || '',
      main_phone: info.main_phone || '',
      primary_email: info.primary_email || '',
      privacy_summary: info.privacy_summary || '',
      terms_summary: info.terms_summary || ''
    };
  }

  // submitContactForm(name, email, message)
  submitContactForm(name, email, message) {
    const requests = this._getFromStorage('contact_requests', []);
    const now = this._nowIso();
    const req = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      message: message,
      created_at: now
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      contact_request_id: req.id,
      confirmation_message: 'Thank you for contacting us. We will respond shortly.'
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