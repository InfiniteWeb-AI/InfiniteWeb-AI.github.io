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
    const tableKeys = [
      'service_categories',
      'services',
      'earthworks_packages',
      'earthworks_package_items',
      'pile_estimates',
      'quote_requests',
      'equipment',
      'hire_bookings',
      'hire_booking_items',
      'projects',
      'project_shortlists',
      'certifications',
      'resource_articles',
      'contact_enquiries',
      'callback_requests',
      'branches',
      'site_inspection_bookings'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Meta keys
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('current_hire_booking_id')) {
      localStorage.setItem('current_hire_booking_id', '');
    }
    if (!localStorage.getItem('current_project_shortlist_id')) {
      localStorage.setItem('current_project_shortlist_id', '');
    }

    // Optional content containers (kept minimal to avoid mocked business data)
    if (!localStorage.getItem('about_us_content')) {
      localStorage.setItem(
        'about_us_content',
        JSON.stringify({
          headline: '',
          body: '',
          years_experience: 0,
          regions_served: [],
          capabilities_summary: ''
        })
      );
    }
    if (!localStorage.getItem('safety_quality_overview')) {
      localStorage.setItem(
        'safety_quality_overview',
        JSON.stringify({
          safety_overview: '',
          quality_overview: '',
          environmental_overview: ''
        })
      );
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
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
    const currentRaw = localStorage.getItem('idCounter');
    const current = parseInt(currentRaw || '1000', 10);
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

  // ----------------------
  // Private helpers
  // ----------------------

  _getOrCreateHireBooking() {
    const bookingId = localStorage.getItem('current_hire_booking_id') || '';
    let bookings = this._getFromStorage('hire_bookings', []);

    let booking = null;
    if (bookingId) {
      booking = bookings.find((b) => b.id === bookingId) || null;
    }

    if (!booking || booking.status !== 'draft') {
      const newBooking = {
        id: this._generateId('hire_booking'),
        item_ids: [],
        site_postcode: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        total_days: 0,
        total_cost: 0,
        currency: 'AUD',
        status: 'draft',
        createdAt: this._now()
      };
      bookings.push(newBooking);
      this._saveToStorage('hire_bookings', bookings);
      localStorage.setItem('current_hire_booking_id', newBooking.id);
      booking = newBooking;
    }

    return booking;
  }

  _updateHireBookingTotals(booking) {
    const items = this._getFromStorage('hire_booking_items', []);
    const relatedItems = items.filter((it) => it.booking_id === booking.id);
    const totalDays = relatedItems.reduce((sum, it) => sum + (Number(it.hire_days) || 0), 0);
    const totalCost = relatedItems.reduce((sum, it) => sum + (Number(it.line_total_cost) || 0), 0);

    booking.total_days = totalDays;
    booking.total_cost = totalCost;
    if (!booking.currency) booking.currency = 'AUD';

    let bookings = this._getFromStorage('hire_bookings', []);
    bookings = bookings.map((b) => (b.id === booking.id ? booking : b));
    this._saveToStorage('hire_bookings', bookings);

    return booking;
  }

  _getOrCreateProjectShortlist() {
    let shortlistId = localStorage.getItem('current_project_shortlist_id') || '';
    let shortlists = this._getFromStorage('project_shortlists', []);

    let shortlist = null;
    if (shortlistId) {
      shortlist = shortlists.find((s) => s.id === shortlistId) || null;
    }

    if (!shortlist) {
      const newShortlist = {
        id: this._generateId('project_shortlist'),
        project_ids: [],
        createdAt: this._now(),
        updatedAt: this._now()
      };
      shortlists.push(newShortlist);
      this._saveToStorage('project_shortlists', shortlists);
      localStorage.setItem('current_project_shortlist_id', newShortlist.id);
      shortlist = newShortlist;
    }

    return shortlist;
  }

  _calculateBranchDistances(site_postcode, branches) {
    const sitePostInt = parseInt(site_postcode || '0', 10);
    return branches.map((branch) => {
      const branchPostInt = parseInt(branch.postcode || '0', 10);
      let distance = null;
      if (!isNaN(sitePostInt) && !isNaN(branchPostInt)) {
        distance = Math.abs(sitePostInt - branchPostInt);
      }
      return {
        ...branch,
        distance_km: distance
      };
    });
  }

  _persistPileEstimate(estimate) {
    const estimates = this._getFromStorage('pile_estimates', []);
    const id = this._generateId('pile_estimate');
    const record = {
      id,
      building_length_m: estimate.building_length_m,
      building_width_m: estimate.building_width_m,
      soil_type: estimate.soil_type,
      building_use_type: estimate.building_use_type,
      project_type: estimate.project_type || null,
      estimated_pile_quantity: estimate.estimated_pile_quantity,
      estimated_total_cost: estimate.estimated_total_cost,
      currency: estimate.currency || 'AUD',
      notes: estimate.notes || '',
      createdAt: this._now()
    };
    estimates.push(record);
    this._saveToStorage('pile_estimates', estimates);
    return id;
  }

  _buildEarthworksPackageConfiguration(items, hours_limit, budget_limit) {
    const safeItems = Array.isArray(items) ? items : [];
    let totalHours = 0;
    let totalCost = 0;

    safeItems.forEach((it) => {
      const hours = Number(it.machine_hours) || 0;
      const rate = Number(it.rate_per_hour) || 0;
      totalHours += hours;
      totalCost += hours * rate;
    });

    const config = {
      total_machine_hours: totalHours,
      estimated_total_cost: totalCost,
      currency: 'AUD',
      hours_limit: typeof hours_limit === 'number' ? hours_limit : null,
      budget_limit: typeof budget_limit === 'number' ? budget_limit : null,
      is_within_hours_limit:
        typeof hours_limit === 'number' ? totalHours <= hours_limit : null,
      is_within_budget_limit:
        typeof budget_limit === 'number' ? totalCost <= budget_limit : null
    };

    return config;
  }

  // ----------------------
  // Home / Services Overview
  // ----------------------

  // getHomeOverview()
  getHomeOverview() {
    const categories = this._getFromStorage('service_categories', []);
    const active = categories.filter((c) => c.is_active !== false);
    active.sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));

    const hasPiling = active.some((c) => c.code === 'piling');
    const hasEarthworks = active.some((c) => c.code === 'earthworks');
    const hasEquipmentHire = active.some((c) => c.code === 'equipment_hire');

    return {
      highlighted_service_categories: active.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        description: c.description || '',
        display_order: c.display_order || 0
      })),
      show_pile_estimator_cta: hasPiling,
      show_site_inspection_cta: true,
      show_general_quote_cta: hasPiling || hasEarthworks || hasEquipmentHire
    };
  }

  // getServiceCategoriesForOverview()
  getServiceCategoriesForOverview() {
    const categories = this._getFromStorage('service_categories', []);
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      description: c.description || '',
      display_order: c.display_order || 0,
      is_active: c.is_active !== false
    }));
  }

  // submitGeneralQuoteRequest(project_name, project_description, site_postcode, project_type, contact_name, contact_email, contact_phone, budget_cap, source_page)
  submitGeneralQuoteRequest(
    project_name,
    project_description,
    site_postcode,
    project_type,
    contact_name,
    contact_email,
    contact_phone,
    budget_cap,
    source_page
  ) {
    if (!project_description || !site_postcode || !contact_name || !contact_email) {
      return {
        quote_request_id: null,
        status: 'new',
        success: false,
        message: 'Missing required fields for quote request.'
      };
    }

    const quoteRequests = this._getFromStorage('quote_requests', []);
    const id = this._generateId('quote_request');

    const record = {
      id,
      source_type: 'other',
      source_page: source_page || 'other',
      related_service_id: null,
      related_pile_estimate_id: null,
      related_earthworks_package_id: null,
      project_name: project_name || null,
      project_description,
      site_postcode,
      project_type: project_type || null,
      soil_type: null,
      project_start_timeframe: 'unspecified',
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      budget_cap: typeof budget_cap === 'number' ? budget_cap : null,
      status: 'new',
      createdAt: this._now()
    };

    quoteRequests.push(record);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      quote_request_id: id,
      status: record.status,
      success: true,
      message: 'Quote request submitted.'
    };
  }

  // ----------------------
  // Piling Services & Service Detail
  // ----------------------

  // getPilingServiceFilterOptions()
  getPilingServiceFilterOptions() {
    const services = this._getFromStorage('services', []).filter(
      (s) => s.service_type === 'piling' && s.is_active !== false
    );

    const projectTypeSet = new Set();
    services.forEach((s) => {
      if (Array.isArray(s.project_types)) {
        s.project_types.forEach((pt) => projectTypeSet.add(pt));
      }
    });

    const pileTypeSet = new Set();
    services.forEach((s) => {
      if (s.pile_type) pileTypeSet.add(s.pile_type);
    });

    let minDepth = null;
    let maxDepth = null;
    services.forEach((s) => {
      if (typeof s.min_recommended_depth_m === 'number') {
        if (minDepth === null || s.min_recommended_depth_m < minDepth) {
          minDepth = s.min_recommended_depth_m;
        }
      }
      if (typeof s.max_recommended_depth_m === 'number') {
        if (maxDepth === null || s.max_recommended_depth_m > maxDepth) {
          maxDepth = s.max_recommended_depth_m;
        }
      }
    });

    const project_types = Array.from(projectTypeSet).map((pt) => ({
      value: pt,
      label: pt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const pile_types = Array.from(pileTypeSet).map((pt) => ({
      value: pt,
      label: pt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    return {
      project_types,
      pile_types,
      depth_range_m: {
        min: minDepth !== null ? minDepth : 0,
        max: maxDepth !== null ? maxDepth : 0
      },
      search_placeholder: 'Search piling services'
    };
  }

  // listPilingServices(project_type, pile_type, min_max_depth_m, search_query, page, page_size)
  listPilingServices(project_type, pile_type, min_max_depth_m, search_query, page, page_size) {
    let services = this._getFromStorage('services', []).filter(
      (s) => s.service_type === 'piling' && s.is_active !== false
    );
    const categories = this._getFromStorage('service_categories', []);

    if (project_type) {
      services = services.filter((s) =>
        Array.isArray(s.project_types) && s.project_types.includes(project_type)
      );
    }

    if (pile_type) {
      services = services.filter((s) => s.pile_type === pile_type);
    }

    if (min_max_depth_m && (min_max_depth_m.min != null || min_max_depth_m.max != null)) {
      const minReq =
        typeof min_max_depth_m.min === 'number' ? min_max_depth_m.min : null;
      const maxReq =
        typeof min_max_depth_m.max === 'number' ? min_max_depth_m.max : null;
      services = services.filter((s) => {
        const minS = typeof s.min_recommended_depth_m === 'number'
          ? s.min_recommended_depth_m
          : null;
        const maxS = typeof s.max_recommended_depth_m === 'number'
          ? s.max_recommended_depth_m
          : null;
        if (minReq !== null && (maxS === null || maxS < minReq)) return false;
        if (maxReq !== null && (minS === null || minS > maxReq)) return false;
        return true;
      });
    }

    if (search_query) {
      const q = search_query.toLowerCase();
      services = services.filter((s) => {
        return (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.short_description && s.short_description.toLowerCase().includes(q)) ||
          (s.full_description && s.full_description.toLowerCase().includes(q))
        );
      });
    }

    const total_results = services.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const paged = services.slice(start, end);

    const mapped = paged.map((s) => {
      const category = categories.find((c) => c.id === s.category_id) || null;
      return {
        id: s.id,
        name: s.name,
        short_description: s.short_description || '',
        service_type: s.service_type,
        project_types: Array.isArray(s.project_types) ? s.project_types : [],
        pile_type: s.pile_type || null,
        max_recommended_depth_m:
          typeof s.max_recommended_depth_m === 'number'
            ? s.max_recommended_depth_m
            : null,
        min_recommended_depth_m:
          typeof s.min_recommended_depth_m === 'number'
            ? s.min_recommended_depth_m
            : null,
        is_featured: s.is_featured || false,
        category_name: category ? category.name : null
      };
    });

    return {
      total_results,
      page: p,
      page_size: ps,
      services: mapped
    };
  }

  // getServiceDetail(serviceId)
  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);
    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) return null;

    const category = categories.find((c) => c.id === service.category_id) || null;

    // Static enumerations for quote form options
    const projectTypesEnum = [
      'residential',
      'commercial',
      'industrial',
      'subdivision',
      'basement_excavation',
      'infrastructure',
      'other'
    ];
    const soilTypesEnum = [
      'sandy_soil',
      'firm_clay',
      'stiff_clay',
      'rock',
      'mixed_fill',
      'unknown'
    ];
    const timeframesEnum = [
      'immediately',
      'within_1_month',
      'within_3_months',
      'within_6_months',
      'flexible',
      'unspecified'
    ];

    return {
      id: service.id,
      name: service.name,
      category_name: category ? category.name : null,
      service_type: service.service_type,
      short_description: service.short_description || '',
      full_description: service.full_description || '',
      project_types: Array.isArray(service.project_types)
        ? service.project_types
        : [],
      pile_type: service.pile_type || null,
      max_recommended_depth_m:
        typeof service.max_recommended_depth_m === 'number'
          ? service.max_recommended_depth_m
          : null,
      min_recommended_depth_m:
        typeof service.min_recommended_depth_m === 'number'
          ? service.min_recommended_depth_m
          : null,
      suitable_soil_types: Array.isArray(service.suitable_soil_types)
        ? service.suitable_soil_types
        : [],
      typical_applications: service.typical_applications || '',
      typical_duration_description: service.typical_duration_description || '',
      quote_form_options: {
        project_types: projectTypesEnum.map((pt) => ({
          value: pt,
          label: pt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        })),
        soil_types: soilTypesEnum.map((st) => ({
          value: st,
          label: st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        })),
        project_start_timeframes: timeframesEnum.map((tf) => ({
          value: tf,
          label: tf.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        }))
      }
    };
  }

  // submitServiceQuoteRequest(serviceId, project_description, site_postcode, project_type, soil_type, project_start_timeframe, contact_name, contact_email, contact_phone, budget_cap)
  submitServiceQuoteRequest(
    serviceId,
    project_description,
    site_postcode,
    project_type,
    soil_type,
    project_start_timeframe,
    contact_name,
    contact_email,
    contact_phone,
    budget_cap
  ) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return {
        quote_request_id: null,
        status: 'new',
        success: false,
        message: 'Service not found.'
      };
    }

    if (!project_description || !site_postcode || !project_type || !contact_name || !contact_email) {
      return {
        quote_request_id: null,
        status: 'new',
        success: false,
        message: 'Missing required fields for service quote request.'
      };
    }

    const quoteRequests = this._getFromStorage('quote_requests', []);
    const id = this._generateId('quote_request');

    const record = {
      id,
      source_type: 'service',
      source_page: 'service_detail',
      related_service_id: serviceId,
      related_pile_estimate_id: null,
      related_earthworks_package_id: null,
      project_name: service.name || null,
      project_description,
      site_postcode,
      project_type,
      soil_type: soil_type || null,
      project_start_timeframe: project_start_timeframe || 'unspecified',
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      budget_cap: typeof budget_cap === 'number' ? budget_cap : null,
      status: 'new',
      createdAt: this._now()
    };

    quoteRequests.push(record);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      quote_request_id: id,
      status: record.status,
      success: true,
      message: 'Service quote request submitted.'
    };
  }

  // ----------------------
  // Earthworks services & packages
  // ----------------------

  // getEarthworksServiceFilterOptions()
  getEarthworksServiceFilterOptions() {
    const services = this._getFromStorage('services', []).filter(
      (s) => s.service_type === 'earthworks' && s.is_active !== false
    );

    const projectTypeSet = new Set();
    services.forEach((s) => {
      if (Array.isArray(s.project_types)) {
        s.project_types.forEach((pt) => projectTypeSet.add(pt));
      }
    });

    const project_types = Array.from(projectTypeSet).map((pt) => ({
      value: pt,
      label: pt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    return { project_types };
  }

  // listEarthworksServices(project_type, page, page_size)
  listEarthworksServices(project_type, page, page_size) {
    let services = this._getFromStorage('services', []).filter(
      (s) => s.service_type === 'earthworks' && s.is_active !== false
    );
    const categories = this._getFromStorage('service_categories', []);

    if (project_type) {
      services = services.filter((s) =>
        Array.isArray(s.project_types) && s.project_types.includes(project_type)
      );
    }

    const total_results = services.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const paged = services.slice(start, end);

    const mapped = paged.map((s) => {
      const category = categories.find((c) => c.id === s.category_id) || null;
      return {
        id: s.id,
        name: s.name,
        short_description: s.short_description || '',
        project_types: Array.isArray(s.project_types) ? s.project_types : [],
        typical_duration_description: s.typical_duration_description || '',
        category_name: category ? category.name : null
      };
    });

    return {
      total_results,
      services: mapped
    };
  }

  // previewEarthworksPackageConfiguration(items, hours_limit, budget_limit)
  previewEarthworksPackageConfiguration(items, hours_limit, budget_limit) {
    const cfg = this._buildEarthworksPackageConfiguration(items, hours_limit, budget_limit);
    return {
      total_machine_hours: cfg.total_machine_hours,
      estimated_total_cost: cfg.estimated_total_cost,
      currency: cfg.currency,
      hours_limit: cfg.hours_limit,
      budget_limit: cfg.budget_limit,
      is_within_hours_limit: cfg.is_within_hours_limit,
      is_within_budget_limit: cfg.is_within_budget_limit
    };
  }

  // submitEarthworksPackageQuoteRequest(configuration_name, items, hours_limit, budget_limit, project_name, project_description, site_postcode, project_type, contact_name, contact_email, contact_phone, budget_cap)
  submitEarthworksPackageQuoteRequest(
    configuration_name,
    items,
    hours_limit,
    budget_limit,
    project_name,
    project_description,
    site_postcode,
    project_type,
    contact_name,
    contact_email,
    contact_phone,
    budget_cap
  ) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        package_configuration: null,
        quote_request_id: null,
        status: 'new',
        success: false,
        message: 'No items provided for earthworks package.'
      };
    }

    if (!project_name || !project_description || !site_postcode || !contact_name || !contact_email) {
      return {
        package_configuration: null,
        quote_request_id: null,
        status: 'new',
        success: false,
        message: 'Missing required fields for earthworks package quote.'
      };
    }

    const cfgCore = this._buildEarthworksPackageConfiguration(items, hours_limit, budget_limit);
    const packages = this._getFromStorage('earthworks_packages', []);
    const packageItems = this._getFromStorage('earthworks_package_items', []);

    const packageId = this._generateId('earthworks_package');
    const now = this._now();

    const itemIds = [];
    items.forEach((it) => {
      const id = this._generateId('earthworks_package_item');
      const hours = Number(it.machine_hours) || 0;
      const rate = Number(it.rate_per_hour) || 0;
      const lineTotal = hours * rate;
      const record = {
        id,
        package_id: packageId,
        item_type: it.item_type,
        label: it.label,
        machine_hours: hours,
        rate_per_hour: rate,
        line_total_cost: lineTotal,
        notes: it.notes || ''
      };
      packageItems.push(record);
      itemIds.push(id);
    });

    const packageRecord = {
      id: packageId,
      item_ids: itemIds,
      configuration_name: configuration_name || null,
      total_machine_hours: cfgCore.total_machine_hours,
      estimated_total_cost: cfgCore.estimated_total_cost,
      currency: cfgCore.currency,
      hours_limit: cfgCore.hours_limit,
      budget_limit: cfgCore.budget_limit,
      is_within_hours_limit: cfgCore.is_within_hours_limit,
      is_within_budget_limit: cfgCore.is_within_budget_limit,
      createdAt: now
    };

    packages.push(packageRecord);
    this._saveToStorage('earthworks_packages', packages);
    this._saveToStorage('earthworks_package_items', packageItems);

    const quoteRequests = this._getFromStorage('quote_requests', []);
    const quoteId = this._generateId('quote_request');

    const quoteRecord = {
      id: quoteId,
      source_type: 'earthworks_package',
      source_page: 'earthworks_configurator',
      related_service_id: null,
      related_pile_estimate_id: null,
      related_earthworks_package_id: packageId,
      project_name,
      project_description,
      site_postcode,
      project_type: project_type || null,
      soil_type: null,
      project_start_timeframe: 'unspecified',
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      budget_cap: typeof budget_cap === 'number' ? budget_cap : null,
      status: 'new',
      createdAt: now
    };

    quoteRequests.push(quoteRecord);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      package_configuration: {
        id: packageRecord.id,
        configuration_name: packageRecord.configuration_name,
        total_machine_hours: packageRecord.total_machine_hours,
        estimated_total_cost: packageRecord.estimated_total_cost,
        currency: packageRecord.currency,
        hours_limit: packageRecord.hours_limit,
        budget_limit: packageRecord.budget_limit,
        is_within_hours_limit: packageRecord.is_within_hours_limit,
        is_within_budget_limit: packageRecord.is_within_budget_limit
      },
      quote_request_id: quoteId,
      status: quoteRecord.status,
      success: true,
      message: 'Earthworks package quote request submitted.'
    };
  }

  // ----------------------
  // Pile Estimator
  // ----------------------

  // calculatePileEstimate(building_length_m, building_width_m, soil_type, building_use_type, project_type, budget_threshold)
  calculatePileEstimate(
    building_length_m,
    building_width_m,
    soil_type,
    building_use_type,
    project_type,
    budget_threshold
  ) {
    const length = Number(building_length_m) || 0;
    const width = Number(building_width_m) || 0;

    // Basic validation
    if (!length || !width || !soil_type || !building_use_type) {
      const estimate = {
        building_length_m: length,
        building_width_m: width,
        soil_type,
        building_use_type,
        project_type: project_type || null,
        estimated_pile_quantity: 0,
        estimated_total_cost: 0,
        currency: 'AUD',
        notes: 'Invalid or incomplete input.'
      };
      const id = this._persistPileEstimate(estimate);
      return {
        estimate_id: id,
        building_length_m: length,
        building_width_m: width,
        soil_type,
        building_use_type,
        project_type: project_type || null,
        estimated_pile_quantity: 0,
        estimated_total_cost: 0,
        currency: 'AUD',
        budget_threshold: typeof budget_threshold === 'number' ? budget_threshold : null,
        is_under_budget_threshold: false
      };
    }

    const area = length * width; // m2
    // Base spacing 3m x 3m grid
    let basePileCount = Math.ceil(area / 9);

    // Soil factor
    const soilFactorMap = {
      sandy_soil: 1.0,
      firm_clay: 0.9,
      stiff_clay: 0.8,
      rock: 0.7,
      mixed_fill: 1.2,
      unknown: 1.1
    };
    const soilFactor = soilFactorMap[soil_type] || 1.0;

    // Use factor
    const useFactorMap = {
      residential_house: 1.0,
      apartment_block: 1.3,
      office_building: 1.2,
      light_industrial_warehouse: 1.1,
      heavy_industrial: 1.5,
      retail: 1.1,
      other: 1.0
    };
    const useFactor = useFactorMap[building_use_type] || 1.0;

    let estimated_pile_quantity = Math.ceil(basePileCount * soilFactor * useFactor);

    // Cost per pile base
    let costPerPile = 1200; // AUD
    if (building_use_type === 'light_industrial_warehouse') costPerPile = 850;
    if (building_use_type === 'heavy_industrial') costPerPile = 1800;

    if (soil_type === 'rock') costPerPile += 300;
    if (soil_type === 'mixed_fill') costPerPile += 200;

    const estimated_total_cost = estimated_pile_quantity * costPerPile;

    const estimate = {
      building_length_m: length,
      building_width_m: width,
      soil_type,
      building_use_type,
      project_type: project_type || null,
      estimated_pile_quantity,
      estimated_total_cost,
      currency: 'AUD',
      notes: ''
    };

    const id = this._persistPileEstimate(estimate);

    const budgetTh = typeof budget_threshold === 'number' ? budget_threshold : null;

    return {
      estimate_id: id,
      building_length_m: length,
      building_width_m: width,
      soil_type,
      building_use_type,
      project_type: project_type || null,
      estimated_pile_quantity,
      estimated_total_cost,
      currency: 'AUD',
      budget_threshold: budgetTh,
      is_under_budget_threshold:
        budgetTh != null ? estimated_total_cost <= budgetTh : false
    };
  }

  // submitPileEstimatorQuoteRequest(estimate_id, project_name, site_postcode, project_type, contact_email, contact_phone, contact_name, budget_cap)
  submitPileEstimatorQuoteRequest(
    estimate_id,
    project_name,
    site_postcode,
    project_type,
    contact_email,
    contact_phone,
    contact_name,
    budget_cap
  ) {
    const estimates = this._getFromStorage('pile_estimates', []);
    const estimate = estimates.find((e) => e.id === estimate_id) || null;
    if (!estimate) {
      return {
        quote_request_id: null,
        status: 'new',
        success: false,
        message: 'Pile estimate not found.'
      };
    }

    if (!project_name || !site_postcode || !project_type || !contact_email || !contact_phone) {
      return {
        quote_request_id: null,
        status: 'new',
        success: false,
        message: 'Missing required fields for pile estimator quote.'
      };
    }

    const quoteRequests = this._getFromStorage('quote_requests', []);
    const id = this._generateId('quote_request');

    const record = {
      id,
      source_type: 'pile_estimator',
      source_page: 'pile_estimator',
      related_service_id: null,
      related_pile_estimate_id: estimate_id,
      related_earthworks_package_id: null,
      project_name,
      project_description: 'Quote based on pile estimate ' + estimate_id,
      site_postcode,
      project_type,
      soil_type: estimate.soil_type || null,
      project_start_timeframe: 'unspecified',
      contact_name: contact_name || '',
      contact_email,
      contact_phone,
      budget_cap: typeof budget_cap === 'number' ? budget_cap : null,
      status: 'new',
      createdAt: this._now()
    };

    quoteRequests.push(record);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      quote_request_id: id,
      status: record.status,
      success: true,
      message: 'Pile estimator quote request submitted.'
    };
  }

  // ----------------------
  // Equipment Hire
  // ----------------------

  // getEquipmentFilterOptions()
  getEquipmentFilterOptions() {
    // Static filter config (not persisted data)
    const categories = [
      'piling_rigs',
      'excavators',
      'trucks',
      'rollers',
      'cranes',
      'other_equipment'
    ].map((c) => ({
      value: c,
      label: c.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
    }));

    const rating_thresholds = [3, 4, 4.5, 5];

    const price_ranges = [
      { max_daily_rate: 500, label: 'Up to $500/day' },
      { max_daily_rate: 1000, label: 'Up to $1,000/day' },
      { max_daily_rate: 2000, label: 'Up to $2,000/day' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' }
    ];

    return { categories, rating_thresholds, price_ranges, sort_options };
  }

  // listEquipment(category, min_rating, max_daily_rate, only_available, sort_by, page, page_size)
  listEquipment(category, min_rating, max_daily_rate, only_available, sort_by, page, page_size) {
    let equipment = this._getFromStorage('equipment', []);

    if (category) {
      equipment = equipment.filter((e) => e.category === category);
    }

    if (typeof min_rating === 'number') {
      equipment = equipment.filter(
        (e) => typeof e.average_rating === 'number' && e.average_rating >= min_rating
      );
    }

    if (typeof max_daily_rate === 'number') {
      equipment = equipment.filter(
        (e) => typeof e.daily_rate === 'number' && e.daily_rate <= max_daily_rate
      );
    }

    const onlyAvail = only_available === false ? false : true;
    if (onlyAvail) {
      equipment = equipment.filter((e) => e.is_available !== false);
    }

    if (sort_by === 'price_asc') {
      equipment.sort((a, b) => (a.daily_rate || 0) - (b.daily_rate || 0));
    } else if (sort_by === 'price_desc') {
      equipment.sort((a, b) => (b.daily_rate || 0) - (a.daily_rate || 0));
    } else if (sort_by === 'rating_desc') {
      equipment.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }

    const total_results = equipment.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const paged = equipment.slice(start, end);

    const mapped = paged.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      description: e.description || '',
      daily_rate: e.daily_rate || 0,
      currency: e.currency || 'AUD',
      average_rating: typeof e.average_rating === 'number' ? e.average_rating : null,
      rating_count: typeof e.rating_count === 'number' ? e.rating_count : 0,
      is_available: e.is_available !== false,
      image_url: e.image_url || ''
    }));

    return {
      total_results,
      equipment: mapped
    };
  }

  // getEquipmentDetail(equipmentId)
  getEquipmentDetail(equipmentId) {
    const equipment = this._getFromStorage('equipment', []);
    const item = equipment.find((e) => e.id === equipmentId) || null;
    if (!item) return null;

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description || '',
      daily_rate: item.daily_rate || 0,
      currency: item.currency || 'AUD',
      average_rating: typeof item.average_rating === 'number' ? item.average_rating : null,
      rating_count: typeof item.rating_count === 'number' ? item.rating_count : 0,
      is_available: item.is_available !== false,
      min_hire_days: typeof item.min_hire_days === 'number' ? item.min_hire_days : null,
      max_hire_days: typeof item.max_hire_days === 'number' ? item.max_hire_days : null,
      image_url: item.image_url || '',
      specifications: item.specifications || ''
    };
  }

  // addEquipmentToHireBooking(equipmentId, hire_days)
  addEquipmentToHireBooking(equipmentId, hire_days) {
    const hireDays = Number(hire_days) || 0;
    if (!hireDays || hireDays <= 0) {
      return {
        booking_id: null,
        status: 'draft',
        total_days: 0,
        total_cost: 0,
        currency: 'AUD',
        items: [],
        success: false,
        message: 'Invalid hire_days.'
      };
    }

    const equipmentList = this._getFromStorage('equipment', []);
    const eq = equipmentList.find((e) => e.id === equipmentId) || null;
    if (!eq) {
      return {
        booking_id: null,
        status: 'draft',
        total_days: 0,
        total_cost: 0,
        currency: 'AUD',
        items: [],
        success: false,
        message: 'Equipment not found.'
      };
    }

    const booking = this._getOrCreateHireBooking();
    let items = this._getFromStorage('hire_booking_items', []);

    const bookingItemId = this._generateId('hire_booking_item');
    const dailyRate = Number(eq.daily_rate) || 0;
    const lineTotal = dailyRate * hireDays;

    const bookingItem = {
      id: bookingItemId,
      booking_id: booking.id,
      equipment_id: equipmentId,
      equipment_name: eq.name,
      daily_rate: dailyRate,
      hire_days: hireDays,
      line_total_cost: lineTotal
    };

    items.push(bookingItem);
    this._saveToStorage('hire_booking_items', items);

    booking.item_ids = Array.isArray(booking.item_ids) ? booking.item_ids : [];
    booking.item_ids.push(bookingItemId);
    const updatedBooking = this._updateHireBookingTotals(booking);

    // Build items with foreign key resolution for equipment
    const bookingItemsForBooking = items
      .filter((it) => it.booking_id === updatedBooking.id)
      .map((it) => {
        const equipmentObj = equipmentList.find((e) => e.id === it.equipment_id) || null;
        return {
          booking_item_id: it.id,
          equipment_id: it.equipment_id,
          equipment_name: it.equipment_name,
          daily_rate: it.daily_rate,
          hire_days: it.hire_days,
          line_total_cost: it.line_total_cost,
          equipment: equipmentObj
        };
      });

    return {
      booking_id: updatedBooking.id,
      status: updatedBooking.status,
      total_days: updatedBooking.total_days,
      total_cost: updatedBooking.total_cost,
      currency: updatedBooking.currency || 'AUD',
      items: bookingItemsForBooking
    };
  }

  // getHireBookingSummary()
  getHireBookingSummary() {
    const bookingId = localStorage.getItem('current_hire_booking_id') || '';
    const bookings = this._getFromStorage('hire_bookings', []);
    const items = this._getFromStorage('hire_booking_items', []);
    const equipmentList = this._getFromStorage('equipment', []);

    const booking = bookingId
      ? bookings.find((b) => b.id === bookingId) || null
      : null;

    if (!booking) {
      return {
        booking_id: null,
        status: 'draft',
        site_postcode: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        total_days: 0,
        total_cost: 0,
        currency: 'AUD',
        items: []
      };
    }

    const relatedItems = items
      .filter((it) => it.booking_id === booking.id)
      .map((it) => {
        const equipmentObj = equipmentList.find((e) => e.id === it.equipment_id) || null;
        return {
          booking_item_id: it.id,
          equipment_id: it.equipment_id,
          equipment_name: it.equipment_name,
          daily_rate: it.daily_rate,
          hire_days: it.hire_days,
          line_total_cost: it.line_total_cost,
          equipment: equipmentObj
        };
      });

    return {
      booking_id: booking.id,
      status: booking.status,
      site_postcode: booking.site_postcode || '',
      contact_name: booking.contact_name || '',
      contact_email: booking.contact_email || '',
      contact_phone: booking.contact_phone || '',
      total_days: booking.total_days || 0,
      total_cost: booking.total_cost || 0,
      currency: booking.currency || 'AUD',
      items: relatedItems
    };
  }

  // updateHireBookingItemDuration(booking_item_id, hire_days)
  updateHireBookingItemDuration(booking_item_id, hire_days) {
    const newDays = Number(hire_days) || 0;
    let items = this._getFromStorage('hire_booking_items', []);
    const equipmentList = this._getFromStorage('equipment', []);

    const itemIndex = items.findIndex((it) => it.id === booking_item_id);
    if (itemIndex === -1) {
      return {
        booking_id: null,
        total_days: 0,
        total_cost: 0,
        currency: 'AUD'
      };
    }

    const item = items[itemIndex];
    const equipmentObj = equipmentList.find((e) => e.id === item.equipment_id) || null;
    const dailyRate = item.daily_rate || (equipmentObj ? equipmentObj.daily_rate || 0 : 0);
    item.hire_days = newDays;
    item.line_total_cost = (Number(dailyRate) || 0) * newDays;
    items[itemIndex] = item;
    this._saveToStorage('hire_booking_items', items);

    const bookings = this._getFromStorage('hire_bookings', []);
    const booking = bookings.find((b) => b.id === item.booking_id) || null;
    if (!booking) {
      return {
        booking_id: null,
        total_days: 0,
        total_cost: 0,
        currency: 'AUD'
      };
    }

    const updatedBooking = this._updateHireBookingTotals(booking);

    return {
      booking_id: updatedBooking.id,
      total_days: updatedBooking.total_days,
      total_cost: updatedBooking.total_cost,
      currency: updatedBooking.currency || 'AUD'
    };
  }

  // submitHireBooking(site_postcode, contact_name, contact_email, contact_phone)
  submitHireBooking(site_postcode, contact_name, contact_email, contact_phone) {
    const booking = this._getOrCreateHireBooking();
    if (!site_postcode || !contact_name || !contact_email || !contact_phone) {
      return {
        booking_id: booking.id,
        status: booking.status,
        success: false,
        message: 'Missing required fields for hire booking submission.'
      };
    }

    if (!Array.isArray(booking.item_ids) || booking.item_ids.length === 0) {
      return {
        booking_id: booking.id,
        status: booking.status,
        success: false,
        message: 'No items in hire booking.'
      };
    }

    booking.site_postcode = site_postcode;
    booking.contact_name = contact_name;
    booking.contact_email = contact_email;
    booking.contact_phone = contact_phone;
    booking.status = 'submitted';

    let bookings = this._getFromStorage('hire_bookings', []);
    bookings = bookings.map((b) => (b.id === booking.id ? booking : b));
    this._saveToStorage('hire_bookings', bookings);

    return {
      booking_id: booking.id,
      status: booking.status,
      success: true,
      message: 'Hire booking submitted.'
    };
  }

  // ----------------------
  // Projects & Shortlists
  // ----------------------

  // getProjectFilterOptions()
  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects', []);

    const projectTypeSet = new Set();
    const locationSet = new Set();
    let minYear = null;
    let maxYear = null;

    projects.forEach((p) => {
      if (p.project_type) projectTypeSet.add(p.project_type);
      if (p.location_region) locationSet.add(p.location_region);
      if (typeof p.completion_year === 'number') {
        if (minYear === null || p.completion_year < minYear) minYear = p.completion_year;
        if (maxYear === null || p.completion_year > maxYear) maxYear = p.completion_year;
      }
    });

    const project_types = Array.from(projectTypeSet).map((pt) => ({
      value: pt,
      label: pt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const locations = Array.from(locationSet).map((loc) => ({
      value: loc,
      label: loc.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    return {
      project_types,
      locations,
      completion_year_range: {
        min_year: minYear || null,
        max_year: maxYear || null
      }
    };
  }

  // listProjects(project_type, location_region, completion_year_from, completion_year_to, page, page_size)
  listProjects(
    project_type,
    location_region,
    completion_year_from,
    completion_year_to,
    page,
    page_size
  ) {
    let projects = this._getFromStorage('projects', []);
    const shortlist = this._getOrCreateProjectShortlist();
    const shortlistedIds = new Set(shortlist.project_ids || []);

    if (project_type) {
      projects = projects.filter((p) => p.project_type === project_type);
    }

    if (location_region) {
      projects = projects.filter((p) => {
        if (!p.location_region) return false;
        if (location_region === 'melbourne') {
          return (
            p.location_region === 'melbourne' ||
            p.location_region === 'vic_melbourne_region'
          );
        }
        if (location_region === 'vic_melbourne_region') {
          return (
            p.location_region === 'melbourne' ||
            p.location_region === 'vic_melbourne_region'
          );
        }
        return p.location_region === location_region;
      });
    }

    if (typeof completion_year_from === 'number') {
      projects = projects.filter(
        (p) => typeof p.completion_year === 'number' && p.completion_year >= completion_year_from
      );
    }

    if (typeof completion_year_to === 'number') {
      projects = projects.filter(
        (p) => typeof p.completion_year === 'number' && p.completion_year <= completion_year_to
      );
    }

    const total_results = projects.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const paged = projects.slice(start, end);

    const mapped = paged.map((proj) => ({
      id: proj.id,
      title: proj.title,
      project_type: proj.project_type,
      location_city: proj.location_city || '',
      location_region: proj.location_region || '',
      completion_year: proj.completion_year,
      summary: proj.summary || '',
      featured_image_url: proj.featured_image_url || '',
      is_shortlisted: shortlistedIds.has(proj.id)
    }));

    return {
      total_results,
      projects: mapped
    };
  }

  // addProjectToShortlist(projectId)
  addProjectToShortlist(projectId) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) {
      return {
        shortlist_id: null,
        project_ids: []
      };
    }

    const shortlist = this._getOrCreateProjectShortlist();
    shortlist.project_ids = Array.isArray(shortlist.project_ids)
      ? shortlist.project_ids
      : [];
    if (!shortlist.project_ids.includes(projectId)) {
      shortlist.project_ids.push(projectId);
      shortlist.updatedAt = this._now();

      let shortlists = this._getFromStorage('project_shortlists', []);
      shortlists = shortlists.map((s) => (s.id === shortlist.id ? shortlist : s));
      this._saveToStorage('project_shortlists', shortlists);
    }

    return {
      shortlist_id: shortlist.id,
      project_ids: shortlist.project_ids.slice()
    };
  }

  // getProjectShortlistDetails()
  getProjectShortlistDetails() {
    const shortlist = this._getOrCreateProjectShortlist();
    const projects = this._getFromStorage('projects', []);

    const selectedProjects = (shortlist.project_ids || []).map((id) =>
      projects.find((p) => p.id === id) || null
    ).filter((p) => p !== null);

    const mappedProjects = selectedProjects.map((proj) => ({
      id: proj.id,
      title: proj.title,
      project_type: proj.project_type,
      location_city: proj.location_city || '',
      location_region: proj.location_region || '',
      completion_year: proj.completion_year,
      summary: proj.summary || ''
    }));

    return {
      shortlist_id: shortlist.id,
      projects: mappedProjects
    };
  }

  // removeProjectFromShortlist(projectId)
  removeProjectFromShortlist(projectId) {
    const shortlist = this._getOrCreateProjectShortlist();
    shortlist.project_ids = (shortlist.project_ids || []).filter((id) => id !== projectId);
    shortlist.updatedAt = this._now();

    let shortlists = this._getFromStorage('project_shortlists', []);
    shortlists = shortlists.map((s) => (s.id === shortlist.id ? shortlist : s));
    this._saveToStorage('project_shortlists', shortlists);

    return {
      shortlist_id: shortlist.id,
      project_ids: shortlist.project_ids.slice()
    };
  }

  // ----------------------
  // About / Safety & Certifications
  // ----------------------

  // getAboutUsContent()
  getAboutUsContent() {
    const content = this._getFromStorage('about_us_content', {
      headline: '',
      body: '',
      years_experience: 0,
      regions_served: [],
      capabilities_summary: ''
    });
    return {
      headline: content.headline || '',
      body: content.body || '',
      years_experience: content.years_experience || 0,
      regions_served: Array.isArray(content.regions_served)
        ? content.regions_served
        : [],
      capabilities_summary: content.capabilities_summary || ''
    };
  }

  // listCertifications()
  listCertifications() {
    const certs = this._getFromStorage('certifications', []);
    return certs.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code || null,
      type: c.type,
      description: c.description || '',
      issuing_body: c.issuing_body || '',
      certificate_number: c.certificate_number || '',
      valid_from: c.valid_from || null,
      valid_to: c.valid_to || null,
      is_active: c.is_active !== false
    }));
  }

  // getSafetyAndQualityOverview()
  getSafetyAndQualityOverview() {
    const overview = this._getFromStorage('safety_quality_overview', {
      safety_overview: '',
      quality_overview: '',
      environmental_overview: ''
    });
    return {
      safety_overview: overview.safety_overview || '',
      quality_overview: overview.quality_overview || '',
      environmental_overview: overview.environmental_overview || ''
    };
  }

  // ----------------------
  // Resources & FAQs
  // ----------------------

  // searchResources(query, category, topic, page, page_size)
  searchResources(query, category, topic, page, page_size) {
    let articles = this._getFromStorage('resource_articles', []);

    if (category) {
      articles = articles.filter((a) => a.category === category);
    }

    if (topic) {
      articles = articles.filter((a) =>
        Array.isArray(a.topics) && a.topics.includes(topic)
      );
    }

    if (query) {
      const q = query.toLowerCase();
      articles = articles.filter((a) => {
        const inTitle = a.title && a.title.toLowerCase().includes(q);
        const inSummary = a.summary && a.summary.toLowerCase().includes(q);
        const inContent = a.content && a.content.toLowerCase().includes(q);
        const inTopics =
          Array.isArray(a.topics) &&
          a.topics.some((t) => t && t.toLowerCase().includes(q));
        return inTitle || inSummary || inContent || inTopics;
      });
    }

    const total_results = articles.length;
    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const paged = articles.slice(start, end);

    const mapped = paged.map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      topics: Array.isArray(a.topics) ? a.topics : [],
      summary: a.summary || '',
      typical_duration_description: a.typical_duration_description || ''
    }));

    return {
      total_results,
      articles: mapped
    };
  }

  // getResourceArticleDetail(articleId)
  getResourceArticleDetail(articleId) {
    const articles = this._getFromStorage('resource_articles', []);
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) return null;

    return {
      id: article.id,
      title: article.title,
      category: article.category,
      topics: Array.isArray(article.topics) ? article.topics : [],
      content: article.content || '',
      typical_duration_description: article.typical_duration_description || ''
    };
  }

  // ----------------------
  // Contact & Callback
  // ----------------------

  // submitContactEnquiry(enquiry_type, subject, message, contact_name, contact_email, contact_phone, related_certification_code)
  submitContactEnquiry(
    enquiry_type,
    subject,
    message,
    contact_name,
    contact_email,
    contact_phone,
    related_certification_code
  ) {
    if (!enquiry_type || !message || !contact_name || !contact_email) {
      return {
        enquiry_id: null,
        status: 'new',
        success: false,
        message: 'Missing required fields for contact enquiry.'
      };
    }

    const enquiries = this._getFromStorage('contact_enquiries', []);
    const id = this._generateId('contact_enquiry');

    const record = {
      id,
      enquiry_type,
      subject: subject || '',
      message,
      contact_name,
      contact_email,
      contact_phone: contact_phone || '',
      related_certification_code: related_certification_code || null,
      status: 'new',
      createdAt: this._now()
    };

    enquiries.push(record);
    this._saveToStorage('contact_enquiries', enquiries);

    return {
      enquiry_id: id,
      status: record.status,
      success: true,
      message: 'Contact enquiry submitted.'
    };
  }

  // submitCallbackRequest(name, phone, email, project_description, preferred_contact_time_window, preferred_contact_date)
  submitCallbackRequest(
    name,
    phone,
    email,
    project_description,
    preferred_contact_time_window,
    preferred_contact_date
  ) {
    if (!name || !phone) {
      return {
        callback_request_id: null,
        status: 'new',
        success: false,
        message: 'Missing required fields for callback request.'
      };
    }

    const callbacks = this._getFromStorage('callback_requests', []);
    const id = this._generateId('callback_request');

    const record = {
      id,
      name,
      phone,
      email: email || '',
      project_description: project_description || '',
      preferred_contact_time_window: preferred_contact_time_window || '',
      preferred_contact_date: preferred_contact_date || null,
      status: 'new',
      createdAt: this._now()
    };

    callbacks.push(record);
    this._saveToStorage('callback_requests', callbacks);

    return {
      callback_request_id: id,
      status: record.status,
      success: true,
      message: 'Callback request submitted.'
    };
  }

  // ----------------------
  // Site Inspection Booking
  // ----------------------

  // getNearestBranches(site_postcode)
  getNearestBranches(site_postcode) {
    const branches = this._getFromStorage('branches', []);
    const withDistances = this._calculateBranchDistances(site_postcode, branches);

    withDistances.sort((a, b) => {
      const da = a.distance_km;
      const db = b.distance_km;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });

    return withDistances.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code || '',
      address_line1: b.address_line1 || '',
      city: b.city || '',
      state: b.state || '',
      postcode: b.postcode || '',
      region: b.region || '',
      phone: b.phone || '',
      email: b.email || '',
      distance_km: b.distance_km
    }));
  }

  // getSiteInspectionServiceTypes()
  getSiteInspectionServiceTypes() {
    const values = [
      'retaining_wall_piling',
      'new_house_piling',
      'earthworks_assessment',
      'basement_excavation_inspection',
      'subdivision_earthworks_inspection',
      'other'
    ];
    return values.map((v) => ({
      value: v,
      label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));
  }

  // getAvailableInspectionTimeSlots(branchId, service_type, date)
  getAvailableInspectionTimeSlots(branchId, service_type, date) {
    const slots = [
      '9:00 AM',
      '10:00 AM',
      '11:00 AM',
      '1:00 PM',
      '2:00 PM',
      '3:00 PM'
    ];

    const bookings = this._getFromStorage('site_inspection_bookings', []);
    const dayStr = (date || '').substring(0, 10); // yyyy-mm-dd

    const takenSlots = new Set(
      bookings
        .filter((b) => {
          if (b.branch_id !== branchId) return false;
          if (b.service_type !== service_type) return false;
          const bDay = (b.inspection_date || '').substring(0, 10);
          if (bDay !== dayStr) return false;
          if (b.status === 'cancelled') return false;
          return true;
        })
        .map((b) => b.time_slot)
        .filter((ts) => !!ts)
    );

    return slots.map((slot) => ({
      time_slot: slot,
      is_available: !takenSlots.has(slot)
    }));
  }

  // createSiteInspectionBooking(site_postcode, branchId, service_type, inspection_datetime, time_slot, contact_name, contact_phone, contact_email, notes)
  createSiteInspectionBooking(
    site_postcode,
    branchId,
    service_type,
    inspection_datetime,
    time_slot,
    contact_name,
    contact_phone,
    contact_email,
    notes
  ) {
    if (!site_postcode || !branchId || !service_type || !inspection_datetime || !contact_name || !contact_phone) {
      return {
        booking_id: null,
        status: 'requested',
        success: false,
        message: 'Missing required fields for site inspection booking.'
      };
    }

    const branches = this._getFromStorage('branches', []);
    const branch = branches.find((b) => b.id === branchId) || null;
    if (!branch) {
      return {
        booking_id: null,
        status: 'requested',
        success: false,
        message: 'Branch not found.'
      };
    }

    const bookings = this._getFromStorage('site_inspection_bookings', []);
    const id = this._generateId('site_inspection_booking');

    const record = {
      id,
      site_postcode,
      branch_id: branchId,
      service_type,
      inspection_date: inspection_datetime,
      time_slot: time_slot || null,
      contact_name,
      contact_phone,
      contact_email: contact_email || '',
      notes: notes || '',
      status: 'requested',
      createdAt: this._now()
    };

    bookings.push(record);
    this._saveToStorage('site_inspection_bookings', bookings);

    return {
      booking_id: id,
      status: record.status,
      success: true,
      message: 'Site inspection booking requested.'
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
