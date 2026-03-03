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
  }

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    // Entity tables (arrays)
    const tableKeys = [
      'services',
      'service_material_specs',
      'service_inquiries',
      'request_quotes',
      'cost_estimates',
      'case_studies',
      'similar_project_requests',
      'machines',
      'equipment_comparisons',
      'products',
      'carts',
      'cart_items',
      'plant_tour_requests',
      'lead_time_calculations',
      'lead_time_options'
    ];

    // Optional/legacy tables (kept empty by default, not used by core logic)
    const optionalKeys = [
      'users'
    ];

    tableKeys.concat(optionalKeys).forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // Corrupted JSON: reset to default
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

  // ------------------------
  // Generic helpers
  // ------------------------

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _sortByDateDesc(arr, field) {
    return arr.slice().sort((a, b) => {
      const da = this._parseDate(a[field]);
      const db = this._parseDate(b[field]);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    });
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ------------------------
  // Cart helpers
  // ------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find((c) => c.status === 'open');
    const now = new Date().toISOString();

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        createdAt: now,
        updatedAt: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart_id) {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');

    const itemsForCart = cartItems.filter((item) => item.cart_id === cart_id);
    let subtotal = 0;
    let currency = 'usd';

    if (itemsForCart.length > 0) {
      itemsForCart.forEach((item) => {
        subtotal += Number(item.line_total) || 0;
      });
      currency = itemsForCart[0].currency || 'usd';
    }

    const cartIndex = carts.findIndex((c) => c.id === cart_id);
    if (cartIndex !== -1) {
      carts[cartIndex].updatedAt = new Date().toISOString();
      this._saveToStorage('carts', carts);
    }

    return { subtotal, currency };
  }

  // ------------------------
  // Equipment comparison helpers
  // ------------------------

  _getOrCreateActiveEquipmentComparison() {
    let comparisons = this._getFromStorage('equipment_comparisons');
    let comparison = comparisons.find((c) => c && c.email_sent === false);

    if (!comparison) {
      comparison = {
        id: this._generateId('eqcmp'),
        machine_ids: [],
        label: null,
        emailed_to: null,
        email_sent: false,
        createdAt: new Date().toISOString()
      };
      comparisons.push(comparison);
      this._saveToStorage('equipment_comparisons', comparisons);
    }

    return comparison;
  }

  // ------------------------
  // Lead time helpers
  // ------------------------

  _markSelectedLeadTimeOption(calculation_id, selected_option_id) {
    const options = this._getFromStorage('lead_time_options');
    let changed = false;

    options.forEach((opt) => {
      if (opt.calculation_id === calculation_id) {
        const shouldSelect = opt.id === selected_option_id;
        if (opt.is_selected !== shouldSelect) {
          opt.is_selected = shouldSelect;
          changed = true;
        }
      }
    });

    if (changed) {
      this._saveToStorage('lead_time_options', options);
    }
  }

  // ------------------------
  // HOME / OVERVIEW
  // ------------------------

  // getHomeOverview(): { capabilities_summary, industries_served, quality_certifications }
  getHomeOverview() {
    const stored = localStorage.getItem('home_overview');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fall through to default
      }
    }

    // Default empty structure if not configured in storage
    return {
      capabilities_summary: '',
      industries_served: [],
      quality_certifications: []
    };
  }

  // getHomePrimaryActions(): array of { id, label, target_page, priority }
  getHomePrimaryActions() {
    const stored = localStorage.getItem('home_primary_actions');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    // No mocking of domain data; simply return empty if not set
    return [];
  }

  // getHomeFeaturedContent(): { featured_services, featured_case_studies }
  getHomeFeaturedContent() {
    // Derive featured content from stored entities
    const services = this._getFromStorage('services');
    const caseStudies = this._getFromStorage('case_studies');

    const featured_services = services
      .filter((s) => s.is_active)
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        name: s.name,
        process_type: s.process_type,
        description: s.description || '',
        axes: s.axes || null,
        min_tolerance_mm: s.min_tolerance_mm || null,
        min_tolerance_in: s.min_tolerance_in || null,
        best_surface_finish_ra_um: s.best_surface_finish_ra_um || null,
        supported_industries: s.supported_industries || []
      }));

    const featured_case_studies = caseStudies
      .filter((cs) => cs.is_featured)
      .map((cs) => ({
        id: cs.id,
        title: cs.title,
        industry: cs.industry,
        summary: cs.summary,
        delivery_time_days: cs.delivery_time_days,
        lead_time_tag: cs.lead_time_tag || null,
        is_featured: !!cs.is_featured
      }));

    return {
      featured_services,
      featured_case_studies
    };
  }

  // ------------------------
  // SERVICES / CAPABILITIES
  // ------------------------

  // getServiceCategoriesOverview(): [{ process_type, name, short_description, capabilities_highlight }]
  getServiceCategoriesOverview() {
    // Static mapping based on known enum values
    const mapping = {
      cnc_turning: {
        name: 'CNC Turning',
        short_description: 'Precision turned components from bar and billet.',
        capabilities_highlight: 'High-volume shafts, bushings, and rings.'
      },
      three_axis_cnc_machining: {
        name: '3-Axis CNC Machining',
        short_description: 'Cost-effective prismatic machining.',
        capabilities_highlight: 'Brackets, housings, and simple 3D profiles.'
      },
      five_axis_cnc_machining: {
        name: '5-Axis CNC Machining',
        short_description: 'Complex multi-axis machining in one setup.',
        capabilities_highlight: 'Impellers, medical implants, and aerospace components.'
      },
      cnc_milling: {
        name: 'CNC Milling',
        short_description: 'High-precision milled features.',
        capabilities_highlight: 'Slots, pockets, and contour milling.'
      },
      prototyping: {
        name: 'Prototyping',
        short_description: 'Rapid prototype machining for design validation.',
        capabilities_highlight: 'Fast turnaround functional prototypes.'
      },
      production_run: {
        name: 'Production Runs',
        short_description: 'Scalable production for recurring parts.',
        capabilities_highlight: 'Process capability and repeatability for volume.'
      },
      other_machining: {
        name: 'Other Machining',
        short_description: 'Secondary and specialty machining services.',
        capabilities_highlight: 'Broaching, tapping, and finishing operations.'
      }
    };

    // Only include categories that actually exist in stored services
    const services = this._getFromStorage('services');
    const presentTypes = new Set(services.map((s) => s.process_type));

    const result = [];
    Object.keys(mapping).forEach((process_type) => {
      if (presentTypes.size === 0 || presentTypes.has(process_type)) {
        const cfg = mapping[process_type];
        result.push({
          process_type,
          name: cfg.name,
          short_description: cfg.short_description,
          capabilities_highlight: cfg.capabilities_highlight
        });
      }
    });

    return result;
  }

  // getCapabilitiesFilterOptions(): config for Capabilities page
  getCapabilitiesFilterOptions() {
    // Enumerations derived from data model
    const process_types = [
      { value: 'cnc_turning', label: 'CNC Turning' },
      { value: 'three_axis_cnc_machining', label: '3-Axis CNC Machining' },
      { value: 'five_axis_cnc_machining', label: '5-Axis CNC Machining' },
      { value: 'cnc_milling', label: 'CNC Milling' },
      { value: 'prototyping', label: 'Prototyping' },
      { value: 'production_run', label: 'Production Runs' },
      { value: 'other_machining', label: 'Other Machining' }
    ];

    const materials = [
      { value: 'stainless_steel_304', label: 'Stainless Steel 304' },
      { value: 'stainless_steel_316l', label: 'Stainless Steel 316L' },
      { value: 'stainless_steel_303', label: 'Stainless Steel 303' },
      { value: 'titanium_grade_5', label: 'Titanium Grade 5' },
      { value: 'titanium_grade_2', label: 'Titanium Grade 2' },
      { value: 'aluminum_6061', label: 'Aluminum 6061' },
      { value: 'aluminum_7075', label: 'Aluminum 7075' },
      { value: 'carbon_steel', label: 'Carbon Steel' },
      { value: 'tool_steel', label: 'Tool Steel' },
      { value: 'plastics_generic', label: 'Plastics (generic)' },
      { value: 'other_metal', label: 'Other Metal' }
    ];

    const industries = [
      { value: 'aerospace', label: 'Aerospace' },
      { value: 'medical', label: 'Medical' },
      { value: 'industrial', label: 'Industrial' },
      { value: 'automotive', label: 'Automotive' },
      { value: 'electronics', label: 'Electronics' },
      { value: 'energy', label: 'Energy' },
      { value: 'other', label: 'Other' }
    ];

    const tolerance_mm_ranges = [
      { max_tolerance_mm: 0.01, label: '\u2264 0.01 mm (ultra tight)' },
      { max_tolerance_mm: 0.02, label: '\u2264 0.02 mm (very tight)' },
      { max_tolerance_mm: 0.05, label: '\u2264 0.05 mm (tight)' },
      { max_tolerance_mm: 0.1, label: '\u2264 0.10 mm (standard)' }
    ];

    const tolerance_in_ranges = [
      { max_tolerance_in: 0.0005, label: '\u2264 0.0005 in (ultra tight)' },
      { max_tolerance_in: 0.001, label: '\u2264 0.001 in (very tight)' },
      { max_tolerance_in: 0.002, label: '\u2264 0.002 in (tight)' },
      { max_tolerance_in: 0.005, label: '\u2264 0.005 in (standard)' }
    ];

    const part_length_mm_presets = [50, 100, 200, 500, 1000];

    const sort_options = [
      { value: 'tolerance_tightest', label: 'Tolerance \u2013 Tightest First' },
      { value: 'lead_time_shortest', label: 'Lead Time \u2013 Shortest First' },
      { value: 'newest', label: 'Newest First' }
    ];

    return {
      process_types,
      materials,
      industries,
      tolerance_mm_ranges,
      tolerance_in_ranges,
      part_length_mm_presets,
      sort_options
    };
  }

  // searchServices(filters, sort_by, page = 1, page_size = 20)
  searchServices(filters, sort_by, page = 1, page_size = 20) {
    filters = filters || {};
    const services = this._getFromStorage('services');
    const materialSpecs = this._getFromStorage('service_material_specs');

    // Attach material specs per service
    const specsByService = {};
    materialSpecs.forEach((spec) => {
      if (!specsByService[spec.service_id]) {
        specsByService[spec.service_id] = [];
      }
      specsByService[spec.service_id].push(spec);
    });

    const filtered = services.filter((svc) => {
      if (filters.is_active_only && !svc.is_active) return false;
      if (filters.process_type && svc.process_type !== filters.process_type) return false;
      if (filters.industry && !(svc.supported_industries || []).includes(filters.industry)) return false;
      if (typeof filters.axes_min === 'number' && (typeof svc.axes !== 'number' || svc.axes < filters.axes_min)) {
        return false;
      }
      if (typeof filters.min_part_length_mm === 'number') {
        if (typeof svc.max_part_length_mm !== 'number' || svc.max_part_length_mm < filters.min_part_length_mm) {
          return false;
        }
      }

      const svcSpecs = specsByService[svc.id] || [];

      // Material + tolerance filters
      if (filters.material || typeof filters.max_tolerance_mm === 'number' || typeof filters.max_tolerance_in === 'number') {
        // If material is specified, use material-specific specs first
        let relevantSpecs = svcSpecs;
        if (filters.material) {
          relevantSpecs = svcSpecs.filter((s) => s.material === filters.material);
          if (relevantSpecs.length === 0) {
            // Service does not support this material
            return false;
          }
        }

        const meetsTolerance = (spec) => {
          let ok = true;
          if (typeof filters.max_tolerance_mm === 'number') {
            const tolMm = typeof spec.min_tolerance_mm === 'number' ? spec.min_tolerance_mm : svc.min_tolerance_mm;
            if (typeof tolMm === 'number' && tolMm > filters.max_tolerance_mm) ok = false;
          }
          if (typeof filters.max_tolerance_in === 'number') {
            const tolIn = typeof spec.min_tolerance_in === 'number' ? spec.min_tolerance_in : svc.min_tolerance_in;
            if (typeof tolIn === 'number' && tolIn > filters.max_tolerance_in) ok = false;
          }
          return ok;
        };

        const anySpecOk = relevantSpecs.length > 0 ? relevantSpecs.some(meetsTolerance) : meetsTolerance({});
        if (!anySpecOk) return false;
      }

      return true;
    });

    // Sorting
    let sorted = filtered.slice();
    if (sort_by === 'tolerance_tightest') {
      sorted.sort((a, b) => {
        const ta = typeof a.min_tolerance_mm === 'number' ? a.min_tolerance_mm : Number.POSITIVE_INFINITY;
        const tb = typeof b.min_tolerance_mm === 'number' ? b.min_tolerance_mm : Number.POSITIVE_INFINITY;
        return ta - tb;
      });
    } else if (sort_by === 'lead_time_shortest') {
      sorted.sort((a, b) => {
        const la = typeof a.typical_lead_time_days_min === 'number' ? a.typical_lead_time_days_min : Number.POSITIVE_INFINITY;
        const lb = typeof b.typical_lead_time_days_min === 'number' ? b.typical_lead_time_days_min : Number.POSITIVE_INFINITY;
        return la - lb;
      });
    } else if (sort_by === 'newest') {
      sorted = this._sortByDateDesc(sorted, 'createdAt');
    }

    const total = sorted.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = sorted.slice(start, end).map((svc) => {
      const matSpecs = (specsByService[svc.id] || []).map((spec) => ({
        material: spec.material,
        min_tolerance_mm: spec.min_tolerance_mm || null,
        min_tolerance_in: spec.min_tolerance_in || null,
        best_surface_finish_ra_um: spec.best_surface_finish_ra_um || null
      }));

      return {
        id: svc.id,
        name: svc.name,
        process_type: svc.process_type,
        description: svc.description || '',
        axes: svc.axes || null,
        supported_industries: svc.supported_industries || [],
        max_part_length_mm: svc.max_part_length_mm || null,
        max_part_width_mm: svc.max_part_width_mm || null,
        max_part_height_mm: svc.max_part_height_mm || null,
        max_part_diameter_mm: svc.max_part_diameter_mm || null,
        min_tolerance_mm: svc.min_tolerance_mm || null,
        min_tolerance_in: svc.min_tolerance_in || null,
        best_surface_finish_ra_um: svc.best_surface_finish_ra_um || null,
        typical_lead_time_days_min: svc.typical_lead_time_days_min || null,
        typical_lead_time_days_max: svc.typical_lead_time_days_max || null,
        material_specs: matSpecs
      };
    });

    return {
      total,
      page,
      page_size,
      services: pageItems
    };
  }

  // getServiceDetail(service_id)
  getServiceDetail(service_id) {
    const services = this._getFromStorage('services');
    const materialSpecs = this._getFromStorage('service_material_specs');

    const svc = services.find((s) => s.id === service_id) || null;

    const matSpecs = materialSpecs
      .filter((spec) => spec.service_id === service_id)
      .map((spec) => ({
        material: spec.material,
        min_tolerance_mm: spec.min_tolerance_mm || null,
        min_tolerance_in: spec.min_tolerance_in || null,
        best_surface_finish_ra_um: spec.best_surface_finish_ra_um || null
      }));

    if (!svc) {
      return {
        service: null,
        material_specs: []
      };
    }

    const service = {
      id: svc.id,
      name: svc.name,
      slug: svc.slug || null,
      process_type: svc.process_type,
      description: svc.description || '',
      axes: svc.axes || null,
      supported_industries: svc.supported_industries || [],
      max_part_length_mm: svc.max_part_length_mm || null,
      max_part_width_mm: svc.max_part_width_mm || null,
      max_part_height_mm: svc.max_part_height_mm || null,
      max_part_diameter_mm: svc.max_part_diameter_mm || null,
      min_tolerance_mm: svc.min_tolerance_mm || null,
      min_tolerance_in: svc.min_tolerance_in || null,
      best_surface_finish_ra_um: svc.best_surface_finish_ra_um || null,
      typical_lead_time_days_min: svc.typical_lead_time_days_min || null,
      typical_lead_time_days_max: svc.typical_lead_time_days_max || null,
      example_applications: svc.example_applications || [],
      is_active: !!svc.is_active,
      createdAt: svc.createdAt || null
    };

    return { service, material_specs: matSpecs };
  }

  // getServiceRelatedCaseStudies(service_id)
  getServiceRelatedCaseStudies(service_id) {
    const services = this._getFromStorage('services');
    const caseStudies = this._getFromStorage('case_studies');

    const svc = services.find((s) => s.id === service_id);
    if (!svc || !Array.isArray(svc.related_case_study_ids)) return [];

    const related = svc.related_case_study_ids
      .map((id) => caseStudies.find((cs) => cs.id === id))
      .filter(Boolean)
      .map((cs) => ({
        id: cs.id,
        title: cs.title,
        industry: cs.industry,
        summary: cs.summary,
        delivery_time_days: cs.delivery_time_days,
        lead_time_tag: cs.lead_time_tag || null
      }));

    return related;
  }

  // getServiceInquiryFormConfig(service_id)
  getServiceInquiryFormConfig(service_id) {
    const services = this._getFromStorage('services');
    const svc = services.find((s) => s.id === service_id) || null;

    const service = svc
      ? {
          id: svc.id,
          name: svc.name,
          process_type: svc.process_type
        }
      : null;

    const default_subject = service ? `Inquiry about ${service.name}` : 'Service Inquiry';

    const required_fields = ['subject', 'message', 'contact_name', 'contact_email'];

    return {
      service,
      default_subject,
      required_fields
    };
  }

  // submitServiceInquiry(service_id, subject, message, contact_name, contact_email, contact_phone, company)
  submitServiceInquiry(service_id, subject, message, contact_name, contact_email, contact_phone, company) {
    const inquiries = this._getFromStorage('service_inquiries');
    const services = this._getFromStorage('services');
    const svc = services.find((s) => s.id === service_id) || null;

    const id = this._generateId('inq');
    const createdAt = new Date().toISOString();

    const inquiry = {
      id,
      service_id,
      service_name: svc ? svc.name : null,
      subject,
      message,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      company: company || null,
      createdAt
    };

    inquiries.push(inquiry);
    this._saveToStorage('service_inquiries', inquiries);

    return {
      success: true,
      inquiry_id: id,
      createdAt,
      message: 'Service inquiry submitted successfully.'
    };
  }

  // ------------------------
  // REQUEST A QUOTE (RFQ)
  // ------------------------

  // getRequestQuoteFormConfig(preferred_cost_estimate_id)
  getRequestQuoteFormConfig(preferred_cost_estimate_id) {
    const machining_types = [
      { value: 'cnc_turning', label: 'CNC Turning' },
      { value: 'cnc_milling', label: 'CNC Milling' },
      { value: 'three_axis_cnc_machining', label: '3-Axis CNC Machining' },
      { value: 'five_axis_cnc_machining', label: '5-Axis CNC Machining' },
      { value: 'prototyping', label: 'Prototyping' },
      { value: 'production_run', label: 'Production Run' },
      { value: 'other_machining', label: 'Other Machining' }
    ];

    const materials = [
      { value: 'stainless_steel_304', label: 'Stainless Steel 304' },
      { value: 'stainless_steel_316l', label: 'Stainless Steel 316L' },
      { value: 'stainless_steel_303', label: 'Stainless Steel 303' },
      { value: 'titanium_grade_5', label: 'Titanium Grade 5' },
      { value: 'titanium_grade_2', label: 'Titanium Grade 2' },
      { value: 'aluminum_6061', label: 'Aluminum 6061' },
      { value: 'aluminum_7075', label: 'Aluminum 7075' },
      { value: 'carbon_steel', label: 'Carbon Steel' },
      { value: 'tool_steel', label: 'Tool Steel' },
      { value: 'plastics_generic', label: 'Plastics (generic)' },
      { value: 'other_metal', label: 'Other Metal' }
    ];

    const tolerance_options = [
      {
        label: '\u00b10.05 mm (standard)',
        value_mm: 0.05,
        value_in: 0.05 / 25.4,
        tolerance_class: 'standard'
      },
      {
        label: '\u00b10.02 mm (tight)',
        value_mm: 0.02,
        value_in: 0.02 / 25.4,
        tolerance_class: 'tight'
      },
      {
        label: '\u00b10.01 mm (tight)',
        value_mm: 0.01,
        value_in: 0.01 / 25.4,
        tolerance_class: 'tight'
      },
      {
        label: '\u00b10.005 mm (ultra tight)',
        value_mm: 0.005,
        value_in: 0.005 / 25.4,
        tolerance_class: 'ultra_tight'
      }
    ];

    const lead_time_options = [
      {
        type: 'standard',
        label: 'Standard (10-20 business days)',
        business_days_min: 10,
        business_days_max: 20
      },
      {
        type: 'expedited',
        label: 'Expedited (5-10 business days)',
        business_days_min: 5,
        business_days_max: 10
      },
      {
        type: 'express',
        label: 'Express (3-5 business days)',
        business_days_min: 3,
        business_days_max: 5
      }
    ];

    const prefill = {
      preferred_cost_estimate_id: null,
      material: null,
      quantity: null,
      surface_finish: null
    };

    if (preferred_cost_estimate_id) {
      const estimates = this._getFromStorage('cost_estimates');
      const est = estimates.find((e) => e.id === preferred_cost_estimate_id);
      if (est) {
        prefill.preferred_cost_estimate_id = est.id;
        prefill.material = est.material;
        prefill.quantity = est.quantity;
        prefill.surface_finish = est.surface_finish;
      }
    }

    return {
      machining_types,
      materials,
      tolerance_options,
      lead_time_options,
      prefill
    };
  }

  // submitRequestQuote(...)
  submitRequestQuote(
    machining_type,
    material,
    length_mm,
    width_mm,
    height_mm,
    diameter_mm,
    quantity,
    tolerance_label,
    tolerance_value_mm,
    tolerance_value_in,
    tolerance_class,
    lead_time_type,
    lead_time_business_days,
    drawing_attachment_urls,
    special_requirements,
    includes_anodizing,
    includes_dimensional_inspection,
    preferred_cost_estimate_id,
    contact_name,
    contact_email,
    contact_phone,
    company
  ) {
    const quotes = this._getFromStorage('request_quotes');

    const id = this._generateId('rfq');
    const createdAt = new Date().toISOString();

    const quote = {
      id,
      machining_type,
      material,
      length_mm: typeof length_mm === 'number' ? length_mm : null,
      width_mm: typeof width_mm === 'number' ? width_mm : null,
      height_mm: typeof height_mm === 'number' ? height_mm : null,
      diameter_mm: typeof diameter_mm === 'number' ? diameter_mm : null,
      quantity,
      tolerance_label: tolerance_label || null,
      tolerance_value_mm: typeof tolerance_value_mm === 'number' ? tolerance_value_mm : null,
      tolerance_value_in: typeof tolerance_value_in === 'number' ? tolerance_value_in : null,
      tolerance_class: tolerance_class || null,
      lead_time_type,
      lead_time_business_days,
      drawing_attachment_urls: Array.isArray(drawing_attachment_urls) ? drawing_attachment_urls : [],
      special_requirements: special_requirements || null,
      includes_anodizing: !!includes_anodizing,
      includes_dimensional_inspection: !!includes_dimensional_inspection,
      preferred_cost_estimate_id: preferred_cost_estimate_id || null,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      company: company || null,
      createdAt
    };

    quotes.push(quote);
    this._saveToStorage('request_quotes', quotes);

    return {
      success: true,
      quote_id: id,
      createdAt,
      message: 'RFQ submitted successfully.'
    };
  }

  // ------------------------
  // COST ESTIMATOR
  // ------------------------

  // getCostEstimatorFormConfig()
  getCostEstimatorFormConfig() {
    const part_types = [
      { value: 'medical_implant_component', label: 'Medical Implant / Component' },
      { value: 'aerospace_component', label: 'Aerospace Component' },
      { value: 'industrial_component', label: 'Industrial Component' },
      { value: 'general_mechanical_part', label: 'General Mechanical Part' }
    ];

    const materials = [
      { value: 'stainless_steel_304', label: 'Stainless Steel 304' },
      { value: 'stainless_steel_316l', label: 'Stainless Steel 316L' },
      { value: 'stainless_steel_303', label: 'Stainless Steel 303' },
      { value: 'titanium_grade_5', label: 'Titanium Grade 5' },
      { value: 'titanium_grade_2', label: 'Titanium Grade 2' },
      { value: 'aluminum_6061', label: 'Aluminum 6061' },
      { value: 'aluminum_7075', label: 'Aluminum 7075' },
      { value: 'carbon_steel', label: 'Carbon Steel' },
      { value: 'tool_steel', label: 'Tool Steel' },
      { value: 'plastics_generic', label: 'Plastics (generic)' },
      { value: 'other_metal', label: 'Other Metal' }
    ];

    const surface_finishes = [
      { value: 'ra_3_2_um_standard', label: 'Ra 3.2 \u00b5m (standard)' },
      { value: 'ra_1_6_um_fine', label: 'Ra 1.6 \u00b5m (fine)' },
      { value: 'ra_0_8_um_fine', label: 'Ra 0.8 \u00b5m (fine)' },
      { value: 'ra_0_4_um_superfine', label: 'Ra 0.4 \u00b5m (superfine)' }
    ];

    const quantity_defaults = {
      min: 1,
      max: 10000,
      step: 10,
      default: 100
    };

    return {
      part_types,
      materials,
      surface_finishes,
      quantity_defaults
    };
  }

  // calculateCostEstimate(part_type, quantity, material, surface_finish)
  calculateCostEstimate(part_type, quantity, material, surface_finish) {
    const estimates = this._getFromStorage('cost_estimates');

    // Simple deterministic costing model based on material and finish
    const materialBase = {
      stainless_steel_304: 20,
      stainless_steel_316l: 22,
      stainless_steel_303: 19,
      titanium_grade_5: 35,
      titanium_grade_2: 30,
      aluminum_6061: 15,
      aluminum_7075: 18,
      carbon_steel: 12,
      tool_steel: 25,
      plastics_generic: 8,
      other_metal: 20
    };

    const finishFactor = {
      ra_3_2_um_standard: 1.0,
      ra_1_6_um_fine: 1.1,
      ra_0_8_um_fine: 1.25,
      ra_0_4_um_superfine: 1.4
    };

    const base = materialBase[material] || 20;
    const fFactor = finishFactor[surface_finish] || 1.0;

    // Quantity discount: more parts -> lower unit cost
    const q = Math.max(1, quantity || 1);
    const quantityFactor = 0.6 + 0.4 / Math.log10(q + 9); // between ~0.6 and 1

    const estimated_cost_per_unit = parseFloat((base * fFactor * quantityFactor).toFixed(2));

    const id = this._generateId('ce');
    const createdAt = new Date().toISOString();

    const estimate = {
      id,
      part_type,
      quantity: q,
      material,
      surface_finish,
      estimated_cost_per_unit,
      currency: 'usd',
      is_preferred: false,
      createdAt
    };

    estimates.push(estimate);
    this._saveToStorage('cost_estimates', estimates);

    return this._clone(estimate);
  }

  // setPreferredCostEstimate(cost_estimate_id)
  setPreferredCostEstimate(cost_estimate_id) {
    const estimates = this._getFromStorage('cost_estimates');
    let updated = null;

    estimates.forEach((est) => {
      if (est.id === cost_estimate_id) {
        est.is_preferred = true;
        updated = est;
      } else if (est.is_preferred) {
        est.is_preferred = false;
      }
    });

    this._saveToStorage('cost_estimates', estimates);

    return {
      success: !!updated,
      updated_cost_estimate: updated ? this._clone(updated) : null
    };
  }

  // getPreferredCostEstimate()
  getPreferredCostEstimate() {
    const estimates = this._getFromStorage('cost_estimates');
    let preferred = estimates.find((e) => e.is_preferred);

    if (!preferred && estimates.length > 0) {
      // If none explicitly preferred, fall back to most recent
      preferred = this._sortByDateDesc(estimates, 'createdAt')[0];
    }

    return {
      cost_estimate: preferred ? this._clone(preferred) : null
    };
  }

  // ------------------------
  // CASE STUDIES
  // ------------------------

  // getCaseStudyFilterOptions()
  getCaseStudyFilterOptions() {
    const industries = [
      { value: 'aerospace', label: 'Aerospace' },
      { value: 'medical', label: 'Medical' },
      { value: 'industrial', label: 'Industrial' },
      { value: 'automotive', label: 'Automotive' },
      { value: 'electronics', label: 'Electronics' },
      { value: 'energy', label: 'Energy' },
      { value: 'other', label: 'Other' }
    ];

    const lead_time_tags = [
      { value: 'le_5_days', label: '\u2264 5 days' },
      { value: 'le_10_days', label: '\u2264 10 days' },
      { value: 'le_15_days', label: '\u2264 15 days' },
      { value: 'gt_15_days', label: '> 15 days' }
    ];

    const sort_options = [
      { value: 'fastest_delivery', label: 'Fastest Delivery First' },
      { value: 'most_recent', label: 'Most Recent First' }
    ];

    return { industries, lead_time_tags, sort_options };
  }

  // listCaseStudies(filters, sort_by, page = 1, page_size = 20)
  listCaseStudies(filters, sort_by, page = 1, page_size = 20) {
    filters = filters || {};
    const caseStudies = this._getFromStorage('case_studies');

    let filtered = caseStudies.filter((cs) => {
      if (filters.industry && cs.industry !== filters.industry) return false;
      if (filters.lead_time_tag && cs.lead_time_tag !== filters.lead_time_tag) return false;
      return true;
    });

    if (sort_by === 'fastest_delivery') {
      filtered = filtered.slice().sort((a, b) => a.delivery_time_days - b.delivery_time_days);
    } else if (sort_by === 'most_recent') {
      filtered = this._sortByDateDesc(filtered, 'createdAt');
    }

    const total = filtered.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = filtered.slice(start, end).map((cs) => ({
      id: cs.id,
      title: cs.title,
      industry: cs.industry,
      summary: cs.summary,
      part_type: cs.part_type || null,
      processes_used: cs.processes_used || [],
      materials: cs.materials || [],
      delivery_time_days: cs.delivery_time_days,
      lead_time_tag: cs.lead_time_tag || null
    }));

    return {
      total,
      page,
      page_size,
      case_studies: pageItems
    };
  }

  // getCaseStudyDetail(case_study_id)
  getCaseStudyDetail(case_study_id) {
    const caseStudies = this._getFromStorage('case_studies');
    const cs = caseStudies.find((c) => c.id === case_study_id) || null;

    if (!cs) {
      return { case_study: null };
    }

    const case_study = this._clone(cs);

    // Ensure optional fields exist
    if (!('details_body' in case_study)) case_study.details_body = '';
    if (!('image_urls' in case_study)) case_study.image_urls = [];

    return { case_study };
  }

  // getSimilarProjectFormConfig(case_study_id)
  getSimilarProjectFormConfig(case_study_id) {
    const caseStudies = this._getFromStorage('case_studies');
    const cs = caseStudies.find((c) => c.id === case_study_id) || null;

    const case_study = cs
      ? {
          id: cs.id,
          title: cs.title,
          industry: cs.industry
        }
      : null;

    const default_project_name = case_study
      ? `Project similar to ${case_study.title}`
      : 'Project similar to selected case study';

    const default_target_delivery_days = cs ? cs.delivery_time_days || 10 : 10;

    return {
      case_study,
      default_project_name,
      default_target_delivery_days
    };
  }

  // submitSimilarProjectRequest(case_study_id, project_name, description, target_delivery_days, contact_name, contact_email)
  submitSimilarProjectRequest(case_study_id, project_name, description, target_delivery_days, contact_name, contact_email) {
    const requests = this._getFromStorage('similar_project_requests');
    const caseStudies = this._getFromStorage('case_studies');
    const cs = caseStudies.find((c) => c.id === case_study_id) || null;

    const id = this._generateId('spr');
    const createdAt = new Date().toISOString();

    const req = {
      id,
      case_study_id,
      case_study_title: cs ? cs.title : null,
      project_name,
      description,
      target_delivery_days: typeof target_delivery_days === 'number' ? target_delivery_days : null,
      contact_name,
      contact_email,
      createdAt
    };

    requests.push(req);
    this._saveToStorage('similar_project_requests', requests);

    return {
      success: true,
      similar_project_request_id: id,
      createdAt,
      message: 'Similar project request submitted successfully.'
    };
  }

  // ------------------------
  // EQUIPMENT / MACHINES
  // ------------------------

  // getEquipmentFilterOptions()
  getEquipmentFilterOptions() {
    const machine_types = [
      { value: 'cnc_turning_center', label: 'CNC Turning Center' },
      { value: 'three_axis_mill', label: '3-Axis Mill' },
      { value: 'five_axis_mill', label: '5-Axis Mill' },
      { value: 'multitasking_lathe', label: 'Multitasking Lathe' },
      { value: 'inspection_cmm', label: 'Inspection CMM' },
      { value: 'other_machine', label: 'Other Machine' }
    ];

    const min_part_length_mm_presets = [100, 200, 500, 1000];
    const max_surface_roughness_ra_um_options = [3.2, 1.6, 0.8, 0.4];

    const sort_options = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'most_capable_first', label: 'Most Capable First' }
    ];

    return {
      machine_types,
      min_part_length_mm_presets,
      max_surface_roughness_ra_um_options,
      sort_options
    };
  }

  // searchMachines(filters, sort_by, page = 1, page_size = 20)
  searchMachines(filters, sort_by, page = 1, page_size = 20) {
    filters = filters || {};
    let machines = this._getFromStorage('machines');

    machines = machines.filter((m) => {
      if (filters.is_active_only && !m.is_active) return false;
      if (filters.machine_type && m.machine_type !== filters.machine_type) return false;
      if (typeof filters.axes_min === 'number' && (typeof m.axes !== 'number' || m.axes < filters.axes_min)) return false;
      if (typeof filters.min_part_length_mm === 'number') {
        if (typeof m.max_part_length_mm !== 'number' || m.max_part_length_mm < filters.min_part_length_mm) return false;
      }
      if (typeof filters.max_surface_roughness_ra_um === 'number') {
        if (typeof m.min_surface_roughness_ra_um !== 'number' || m.min_surface_roughness_ra_um > filters.max_surface_roughness_ra_um) return false;
      }
      return true;
    });

    if (sort_by === 'newest_first') {
      machines = this._sortByDateDesc(machines, 'commission_date');
    } else if (sort_by === 'most_capable_first') {
      machines = machines.slice().sort((a, b) => {
        const axesA = a.axes || 0;
        const axesB = b.axes || 0;
        if (axesA !== axesB) return axesB - axesA;
        const lenA = a.max_part_length_mm || 0;
        const lenB = b.max_part_length_mm || 0;
        if (lenA !== lenB) return lenB - lenA;
        const raA = typeof a.min_surface_roughness_ra_um === 'number' ? a.min_surface_roughness_ra_um : Number.POSITIVE_INFINITY;
        const raB = typeof b.min_surface_roughness_ra_um === 'number' ? b.min_surface_roughness_ra_um : Number.POSITIVE_INFINITY;
        return raA - raB;
      });
    }

    const total = machines.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = machines.slice(start, end).map((m) => ({
      id: m.id,
      name: m.name,
      model_number: m.model_number || null,
      manufacturer: m.manufacturer || null,
      machine_type: m.machine_type,
      axes: m.axes || null,
      max_part_length_mm: m.max_part_length_mm || null,
      max_part_width_mm: m.max_part_width_mm || null,
      max_part_height_mm: m.max_part_height_mm || null,
      max_part_diameter_mm: m.max_part_diameter_mm || null,
      min_surface_roughness_ra_um: m.min_surface_roughness_ra_um || null,
      min_tolerance_mm: m.min_tolerance_mm || null,
      min_tolerance_in: m.min_tolerance_in || null,
      is_active: !!m.is_active,
      commission_date: m.commission_date || null
    }));

    return {
      total,
      page,
      page_size,
      machines: pageItems
    };
  }

  // addMachineToComparison(machine_id)
  addMachineToComparison(machine_id) {
    const MAX_MACHINES = 3;
    const machines = this._getFromStorage('machines');
    const machineExists = machines.some((m) => m.id === machine_id);

    if (!machineExists) {
      return {
        success: false,
        comparison_id: null,
        selected_machine_ids: [],
        max_machines: MAX_MACHINES,
        message: 'Machine not found.'
      };
    }

    const comparison = this._getOrCreateActiveEquipmentComparison();
    const comparisons = this._getFromStorage('equipment_comparisons');
    const index = comparisons.findIndex((c) => c.id === comparison.id);

    if (!comparison.machine_ids.includes(machine_id)) {
      if (comparison.machine_ids.length >= MAX_MACHINES) {
        return {
          success: false,
          comparison_id: comparison.id,
          selected_machine_ids: comparison.machine_ids.slice(),
          max_machines: MAX_MACHINES,
          message: `You can compare up to ${MAX_MACHINES} machines.`
        };
      }
      comparison.machine_ids.push(machine_id);
      if (index !== -1) {
        comparisons[index] = comparison;
        this._saveToStorage('equipment_comparisons', comparisons);
      }
    }

    return {
      success: true,
      comparison_id: comparison.id,
      selected_machine_ids: comparison.machine_ids.slice(),
      max_machines: MAX_MACHINES,
      message: 'Machine added to comparison.'
    };
  }

  // getCurrentEquipmentComparisonSummary()
  getCurrentEquipmentComparisonSummary() {
    const comparison = this._getOrCreateActiveEquipmentComparison();
    const machines = this._getFromStorage('machines');

    const selectedMachines = comparison.machine_ids.map((id) => {
      const m = machines.find((mc) => mc.id === id);
      if (!m) return null;
      return {
        id: m.id,
        name: m.name,
        machine_type: m.machine_type,
        axes: m.axes || null,
        max_part_length_mm: m.max_part_length_mm || null,
        min_surface_roughness_ra_um: m.min_surface_roughness_ra_um || null
      };
    }).filter(Boolean);

    return {
      comparison_id: comparison.id,
      machine_ids: comparison.machine_ids.slice(),
      machines: selectedMachines
    };
  }

  // getEquipmentComparisonDetails(comparison_id)
  getEquipmentComparisonDetails(comparison_id) {
    const comparisons = this._getFromStorage('equipment_comparisons');
    const machines = this._getFromStorage('machines');

    const comparison = comparisons.find((c) => c.id === comparison_id) || null;

    if (!comparison) {
      return {
        comparison_id,
        label: null,
        emailed_to: null,
        email_sent: false,
        machines: []
      };
    }

    const detailedMachines = comparison.machine_ids.map((id) => {
      const m = machines.find((mc) => mc.id === id);
      if (!m) return null;
      return {
        id: m.id,
        name: m.name,
        model_number: m.model_number || null,
        manufacturer: m.manufacturer || null,
        machine_type: m.machine_type,
        axes: m.axes || null,
        max_part_length_mm: m.max_part_length_mm || null,
        max_part_width_mm: m.max_part_width_mm || null,
        max_part_height_mm: m.max_part_height_mm || null,
        max_part_diameter_mm: m.max_part_diameter_mm || null,
        min_surface_roughness_ra_um: m.min_surface_roughness_ra_um || null,
        min_tolerance_mm: m.min_tolerance_mm || null,
        min_tolerance_in: m.min_tolerance_in || null,
        commission_date: m.commission_date || null
      };
    }).filter(Boolean);

    return {
      comparison_id: comparison.id,
      label: comparison.label || null,
      emailed_to: comparison.emailed_to || null,
      email_sent: !!comparison.email_sent,
      machines: detailedMachines
    };
  }

  // saveAndEmailEquipmentComparison(comparison_id, label, email)
  saveAndEmailEquipmentComparison(comparison_id, label, email) {
    const comparisons = this._getFromStorage('equipment_comparisons');
    const idx = comparisons.findIndex((c) => c.id === comparison_id);

    if (idx === -1) {
      return {
        success: false,
        comparison_id,
        email_sent: false,
        emailed_to: null,
        message: 'Comparison not found.'
      };
    }

    const comparison = comparisons[idx];

    if (label) {
      comparison.label = label;
    }

    let email_sent = false;
    if (email) {
      comparison.emailed_to = email;
      comparison.email_sent = true;
      email_sent = true;
    }

    comparisons[idx] = comparison;
    this._saveToStorage('equipment_comparisons', comparisons);

    return {
      success: true,
      comparison_id: comparison_id,
      email_sent,
      emailed_to: email || comparison.emailed_to || null,
      message: email_sent ? 'Comparison saved and email marked as sent.' : 'Comparison saved.'
    };
  }

  // ------------------------
  // ABOUT / VISIT
  // ------------------------

  // getAboutUsContent()
  getAboutUsContent() {
    const raw = localStorage.getItem('about_us_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to default
      }
    }
    return {
      history: '',
      mission: '',
      certifications: [],
      industries_served: [],
      differentiators: []
    };
  }

  // getVisitPageContent()
  getVisitPageContent() {
    const raw = localStorage.getItem('visit_page_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to default
      }
    }
    return {
      visit_guidelines: '',
      safety_requirements: [],
      tour_types: []
    };
  }

  // getPlantTourFormConfig()
  getPlantTourFormConfig() {
    const available_time_slots = [
      { value: 'morning', label: 'Morning (8:00-12:00)' },
      { value: 'afternoon', label: 'Afternoon (12:00-17:00)' },
      { value: 'evening', label: 'Evening (17:00-20:00)' },
      { value: 'full_day', label: 'Full Day' }
    ];

    const today = new Date();
    const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());

    const toISODate = (d) => d.toISOString().split('T')[0];

    return {
      available_time_slots,
      weekday_only: true,
      min_selectable_date: toISODate(minDate),
      max_selectable_date: toISODate(maxDate)
    };
  }

  // submitPlantTourRequest(visit_date, time_slot, attendees_count, notes, contact_name, contact_email, contact_phone)
  submitPlantTourRequest(visit_date, time_slot, attendees_count, notes, contact_name, contact_email, contact_phone) {
    const requests = this._getFromStorage('plant_tour_requests');

    const id = this._generateId('tour');
    const createdAt = new Date().toISOString();

    const req = {
      id,
      visit_date, // ISO string from UI
      time_slot,
      attendees_count,
      notes: notes || null,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      createdAt
    };

    requests.push(req);
    this._saveToStorage('plant_tour_requests', requests);

    return {
      success: true,
      plant_tour_request_id: id,
      createdAt,
      message: 'Plant tour request submitted successfully.'
    };
  }

  // ------------------------
  // PRODUCTS / CATALOG / CART
  // ------------------------

  // getProductFilterOptions()
  getProductFilterOptions() {
    const categories = [
      { value: 'cnc_turning_parts', label: 'CNC Turning Parts' },
      { value: 'cnc_milling_parts', label: 'CNC Milling Parts' },
      { value: 'accessories', label: 'Accessories' },
      { value: 'other_parts', label: 'Other Parts' }
    ];

    const max_price_presets = [50, 100, 150, 200, 500];

    const materials = [
      { value: 'stainless_steel_304', label: 'Stainless Steel 304' },
      { value: 'stainless_steel_316l', label: 'Stainless Steel 316L' },
      { value: 'stainless_steel_303', label: 'Stainless Steel 303' },
      { value: 'titanium_grade_5', label: 'Titanium Grade 5' },
      { value: 'titanium_grade_2', label: 'Titanium Grade 2' },
      { value: 'aluminum_6061', label: 'Aluminum 6061' },
      { value: 'aluminum_7075', label: 'Aluminum 7075' },
      { value: 'carbon_steel', label: 'Carbon Steel' },
      { value: 'tool_steel', label: 'Tool Steel' },
      { value: 'plastics_generic', label: 'Plastics (generic)' },
      { value: 'other_metal', label: 'Other Metal' }
    ];

    const surface_finishes = [
      { value: 'ra_3_2_um_standard', label: 'Ra 3.2 \u00b5m (standard)' },
      { value: 'ra_1_6_um_fine', label: 'Ra 1.6 \u00b5m (fine)' },
      { value: 'ra_0_8_um_fine', label: 'Ra 0.8 \u00b5m (fine)' },
      { value: 'ra_0_4_um_superfine', label: 'Ra 0.4 \u00b5m (superfine)' }
    ];

    return {
      categories,
      max_price_presets,
      materials,
      surface_finishes
    };
  }

  // listProducts(filters, sort_by, page = 1, page_size = 20)
  listProducts(filters, sort_by, page = 1, page_size = 20) {
    filters = filters || {};
    let products = this._getFromStorage('products');

    products = products.filter((p) => {
      if (filters.is_active_only && !p.is_active) return false;
      if (filters.category && p.category !== filters.category) return false;
      if (typeof filters.max_price === 'number' && p.price > filters.max_price) return false;
      if (filters.material && p.material !== filters.material) return false;
      if (filters.surface_finish && p.surface_finish !== filters.surface_finish) return false;
      if (filters.search_query) {
        const q = String(filters.search_query).toLowerCase();
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        if (!name.includes(q) && !sku.includes(q)) return false;
      }
      return true;
    });

    if (sort_by === 'price_asc') {
      products = products.slice().sort((a, b) => a.price - b.price);
    } else if (sort_by === 'price_desc') {
      products = products.slice().sort((a, b) => b.price - a.price);
    } else if (sort_by === 'newest') {
      products = this._sortByDateDesc(products, 'createdAt');
    }

    const total = products.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = products.slice(start, end).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku || null,
      category: p.category,
      material: p.material || null,
      price: p.price,
      currency: p.currency || 'usd',
      image_url: p.image_url || null,
      is_active: !!p.is_active
    }));

    return {
      total,
      page,
      page_size,
      products: pageItems
    };
  }

  // getProductDetail(product_id)
  getProductDetail(product_id) {
    const products = this._getFromStorage('products');
    const p = products.find((prod) => prod.id === product_id) || null;

    if (!p) {
      return { product: null };
    }

    const product = this._clone(p);
    return { product };
  }

  // addToCart(product_id, quantity = 1)
  addToCart(product_id, quantity = 1) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === product_id);

    if (!product) {
      return {
        success: false,
        cart_id: null,
        item_count: 0,
        message: 'Product not found.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find((ci) => ci.cart_id === cart.id && ci.product_id === product_id);

    if (item) {
      item.quantity += quantity;
      item.line_total = parseFloat((item.quantity * item.unit_price).toFixed(2));
      item.addedAt = item.addedAt || new Date().toISOString();
    } else {
      item = {
        id: this._generateId('ci'),
        cart_id: cart.id,
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        quantity: quantity,
        unit_price: product.price,
        currency: product.currency || 'usd',
        line_total: parseFloat((quantity * product.price).toFixed(2)),
        addedAt: new Date().toISOString()
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart.id);

    const item_count = cartItems.filter((ci) => ci.cart_id === cart.id).length;

    return {
      success: true,
      cart_id: cart.id,
      item_count,
      message: 'Product added to cart.'
    };
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    const itemsForCart = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => {
        const product = products.find((p) => p.id === ci.product_id) || null;
        return {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: ci.product_name,
          category: ci.category,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          currency: ci.currency,
          line_total: ci.line_total,
          addedAt: ci.addedAt,
          // Foreign key resolution: include full product object
          product: product
        };
      });

    let subtotal = 0;
    let currency = 'usd';
    if (itemsForCart.length > 0) {
      itemsForCart.forEach((item) => {
        subtotal += Number(item.line_total) || 0;
      });
      currency = itemsForCart[0].currency || 'usd';
    }

    return {
      cart_id: cart.id,
      status: cart.status,
      items: itemsForCart,
      subtotal,
      currency
    };
  }

  // updateCartItemQuantity(cart_item_id, quantity)
  updateCartItemQuantity(cart_item_id, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cart_item_id);

    if (idx === -1) {
      return {
        success: false,
        cart_id: null,
        updated_item: null,
        subtotal: 0,
        currency: 'usd'
      };
    }

    const item = cartItems[idx];

    if (quantity <= 0) {
      // Remove item if quantity set to 0 or negative
      const cart_id = item.cart_id;
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      const totals = this._recalculateCartTotals(cart_id);
      return {
        success: true,
        cart_id,
        updated_item: null,
        subtotal: totals.subtotal,
        currency: totals.currency
      };
    }

    item.quantity = quantity;
    item.line_total = parseFloat((item.unit_price * item.quantity).toFixed(2));
    cartItems[idx] = item;

    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(item.cart_id);

    const updated_item = {
      cart_item_id: item.id,
      quantity: item.quantity,
      line_total: item.line_total
    };

    return {
      success: true,
      cart_id: item.cart_id,
      updated_item,
      subtotal: totals.subtotal,
      currency: totals.currency
    };
  }

  // removeCartItem(cart_item_id)
  removeCartItem(cart_item_id) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cart_item_id);

    if (idx === -1) {
      return {
        success: false,
        cart_id: null,
        subtotal: 0,
        currency: 'usd'
      };
    }

    const cart_id = cartItems[idx].cart_id;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals(cart_id);

    return {
      success: true,
      cart_id,
      subtotal: totals.subtotal,
      currency: totals.currency
    };
  }

  // ------------------------
  // LEAD TIME CALCULATOR
  // ------------------------

  // getLeadTimeCalculatorConfig()
  getLeadTimeCalculatorConfig() {
    const process_options = [
      { value: 'anodizing', label: 'Anodizing' },
      { value: 'dimensional_inspection', label: 'Dimensional Inspection' },
      { value: 'heat_treatment', label: 'Heat Treatment' },
      { value: 'passivation', label: 'Passivation' },
      { value: 'coating_other', label: 'Other Coating' }
    ];

    const quantity_defaults = {
      min: 1,
      max: 5000,
      step: 10,
      default: 100
    };

    const shipping_methods = [
      {
        value: 'standard',
        label: 'Standard Shipping',
        description: 'Economical ground service'
      },
      {
        value: 'expedited',
        label: 'Expedited Shipping',
        description: 'Faster air service'
      },
      {
        value: 'express',
        label: 'Express Shipping',
        description: 'Fastest available service'
      }
    ];

    return {
      process_options,
      quantity_defaults,
      shipping_methods
    };
  }

  // calculateLeadTimeOptions(quantity, processes)
  calculateLeadTimeOptions(quantity, processes) {
    const calculations = this._getFromStorage('lead_time_calculations');
    const optionsStorage = this._getFromStorage('lead_time_options');

    const q = Math.max(1, quantity || 1);
    const procArray = Array.isArray(processes) ? processes : [];

    const calc_id = this._generateId('ltc');
    const createdAt = new Date().toISOString();

    const calc = {
      id: calc_id,
      quantity: q,
      processes: procArray.slice(),
      createdAt
    };

    calculations.push(calc);
    this._saveToStorage('lead_time_calculations', calculations);

    // Base production days: 1 day per 100 parts, minimum 1
    let baseProductionDays = Math.max(1, Math.ceil(q / 100));

    // Additional days per process
    procArray.forEach((p) => {
      if (p === 'anodizing') baseProductionDays += 2;
      else if (p === 'dimensional_inspection') baseProductionDays += 2;
      else if (p === 'heat_treatment') baseProductionDays += 3;
      else if (p === 'passivation') baseProductionDays += 1;
      else if (p === 'coating_other') baseProductionDays += 2;
    });

    const shippingProfiles = [
      { shipping_method: 'standard', shipping_days: 5, prodOffset: 0, baseCost: 50, perPart: 0.05 },
      { shipping_method: 'expedited', shipping_days: 3, prodOffset: -2, baseCost: 100, perPart: 0.08 },
      { shipping_method: 'express', shipping_days: 1, prodOffset: -3, baseCost: 200, perPart: 0.1 }
    ];

    const options = [];

    shippingProfiles.forEach((profile) => {
      const production_days = Math.max(1, baseProductionDays + profile.prodOffset);
      const shipping_days = profile.shipping_days;
      const total_lead_time_days = production_days + shipping_days;
      const estimated_shipping_cost = parseFloat((profile.baseCost + profile.perPart * q).toFixed(2));

      const option_id = this._generateId('lto');
      const optionEntity = {
        id: option_id,
        calculation_id: calc_id,
        shipping_method: profile.shipping_method,
        production_days,
        shipping_days,
        total_lead_time_days,
        estimated_shipping_cost,
        currency: 'usd',
        is_selected: false
      };

      optionsStorage.push(optionEntity);

      options.push({
        option_id,
        shipping_method: profile.shipping_method,
        production_days,
        shipping_days,
        total_lead_time_days,
        estimated_shipping_cost,
        currency: 'usd'
      });
    });

    this._saveToStorage('lead_time_options', optionsStorage);

    return {
      calculation_id: calc_id,
      quantity: q,
      processes: procArray.slice(),
      options
    };
  }

  // selectLeadTimeOption(option_id)
  selectLeadTimeOption(option_id) {
    const options = this._getFromStorage('lead_time_options');
    const opt = options.find((o) => o.id === option_id) || null;

    if (!opt) {
      return {
        success: false,
        calculation_id: null,
        selected_option: null
      };
    }

    this._markSelectedLeadTimeOption(opt.calculation_id, option_id);

    const selected_option = {
      option_id: opt.id,
      shipping_method: opt.shipping_method,
      production_days: opt.production_days,
      shipping_days: opt.shipping_days,
      total_lead_time_days: opt.total_lead_time_days,
      estimated_shipping_cost: opt.estimated_shipping_cost,
      currency: opt.currency
    };

    return {
      success: true,
      calculation_id: opt.calculation_id,
      selected_option
    };
  }

  // getLeadTimeSummary(calculation_id)
  getLeadTimeSummary(calculation_id) {
    const calculations = this._getFromStorage('lead_time_calculations');
    const options = this._getFromStorage('lead_time_options');

    const calc = calculations.find((c) => c.id === calculation_id) || null;
    if (!calc) {
      return {
        calculation_id,
        quantity: null,
        processes: [],
        selected_option: null
      };
    }

    let opt = options.find((o) => o.calculation_id === calculation_id && o.is_selected);
    if (!opt) {
      opt = options.find((o) => o.calculation_id === calculation_id) || null;
    }

    const selected_option = opt
      ? {
          option_id: opt.id,
          shipping_method: opt.shipping_method,
          production_days: opt.production_days,
          shipping_days: opt.shipping_days,
          total_lead_time_days: opt.total_lead_time_days,
          estimated_shipping_cost: opt.estimated_shipping_cost,
          currency: opt.currency
        }
      : null;

    return {
      calculation_id: calc.id,
      quantity: calc.quantity,
      processes: calc.processes || [],
      selected_option
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
