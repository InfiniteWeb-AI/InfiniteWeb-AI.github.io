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

  // -------------------------
  // Storage helpers
  // -------------------------
  _initStorage() {
    const keys = [
      'maintenance_contract_plans',
      'cleaning_service_packages',
      'inspection_packages',
      'spare_part_products',
      'carts',
      'cart_items',
      'service_centers',
      'bookings',
      'training_courses',
      'training_sessions',
      'training_registrations',
      'case_studies',
      'custom_maintenance_modules',
      'custom_maintenance_configurations',
      'custom_maintenance_config_modules',
      'service_requests',
      'support_requests'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('current_cart_id')) {
      localStorage.setItem('current_cart_id', '');
    }

    if (!localStorage.getItem('current_custom_maintenance_configuration_id')) {
      localStorage.setItem('current_custom_maintenance_configuration_id', '');
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

  _findById(storageKey, id) {
    const items = this._getFromStorage(storageKey);
    return items.find((item) => item.id === id) || null;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // -------------------------
  // Cart helpers
  // -------------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('current_cart_id') || '';
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _saveCart(cart) {
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    cart.updated_at = this._nowIso();
    this._saveToStorage('carts', carts);
    localStorage.setItem('current_cart_id', cart.id);
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('spare_part_products');
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cartId);

    let total_quantity = 0;
    let total_estimated_price = 0;
    let currency = null;

    const items = itemsForCart.map((item) => {
      const product = products.find((p) => p.id === item.spare_part_product_id) || null;
      const unit_price = typeof item.unit_price_snapshot === 'number'
        ? item.unit_price_snapshot
        : (product ? product.price : 0);
      const line_total = unit_price * item.quantity;
      if (!currency) {
        currency = item.currency_snapshot || (product ? product.currency : null);
      }
      total_quantity += item.quantity;
      total_estimated_price += line_total;

      return {
        cart_item_id: item.id,
        quantity: item.quantity,
        shipping_option: item.shipping_option || null,
        product: product,
        unit_price,
        line_total,
        currency
      };
    });

    return {
      items,
      total_quantity,
      total_estimated_price,
      currency
    };
  }

  // -------------------------
  // Location & distance helpers
  // -------------------------

  _resolveLocationToCoordinates(searchTerm) {
    if (!searchTerm) return null;
    const term = String(searchTerm).trim();

    // Minimal hard-coded mapping for known ZIPs / cities as needed
    // ZIP 60601 (Chicago, IL)
    if (term === '60601' || /Chicago/i.test(term)) {
      return { latitude: 41.8853, longitude: -87.6229 };
    }

    // Fallback: unknown location
    return null;
  }

  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    function toRad(v) { return (v * Math.PI) / 180; }
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // -------------------------
  // Availability helpers
  // -------------------------

  _checkCleaningAvailability(cleaningServicePackageId, dateObj) {
    const day = dateObj.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const isWeekday = day >= 1 && day <= 5;
    return {
      has_morning_slots: isWeekday,
      has_afternoon_slots: isWeekday,
      has_evening_slots: false
    };
  }

  _checkOnsiteAvailability(serviceCenterId, startDateObj, endDateObj) {
    const slots = [];
    const current = new Date(Date.UTC(startDateObj.getUTCFullYear(), startDateObj.getUTCMonth(), startDateObj.getUTCDate()));
    const end = new Date(Date.UTC(endDateObj.getUTCFullYear(), endDateObj.getUTCMonth(), endDateObj.getUTCDate()));

    while (current <= end) {
      const day = current.getUTCDay();
      const isWeekday = day >= 1 && day <= 5;
      if (isWeekday) {
        const year = current.getUTCFullYear();
        const month = current.getUTCMonth();
        const date = current.getUTCDate();

        const slot1Start = new Date(Date.UTC(year, month, date, 11, 0, 0)); // 11:00 UTC ~ morning local
        const slot1End = new Date(Date.UTC(year, month, date, 13, 0, 0));
        const slot2Start = new Date(Date.UTC(year, month, date, 14, 0, 0));
        const slot2End = new Date(Date.UTC(year, month, date, 16, 0, 0));

        slots.push({
          start_datetime: slot1Start.toISOString(),
          end_datetime: slot1End.toISOString()
        });
        slots.push({
          start_datetime: slot2Start.toISOString(),
          end_datetime: slot2End.toISOString()
        });
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return slots;
  }

  _validateCustomMaintenanceConfiguration(budgetLimit, selectedModules) {
    const validationErrors = [];
    const totalMonthlyCost = selectedModules.reduce((sum, m) => sum + (m.monthly_cost || 0), 0);
    const withinBudget = totalMonthlyCost <= budgetLimit;

    const MIN_MODULES = 1; // generic minimum; task-level flows can enforce higher if desired

    if (selectedModules.length < MIN_MODULES) {
      validationErrors.push(`At least ${MIN_MODULES} module(s) must be selected.`);
    }

    if (!withinBudget) {
      validationErrors.push('Total monthly cost exceeds the specified budget limit.');
    }

    return { withinBudget, validationErrors, totalMonthlyCost };
  }

  _createServiceRequestRecord(payload) {
    const serviceRequests = this._getFromStorage('service_requests');

    const record = {
      id: this._generateId('sr'),
      request_type: payload.request_type,
      maintenance_contract_plan_id: payload.maintenance_contract_plan_id || null,
      inspection_package_id: payload.inspection_package_id || null,
      custom_configuration_id: payload.custom_configuration_id || null,
      case_study_id: payload.case_study_id || null,
      related_service_name: payload.related_service_name || null,
      contact_name: payload.contact_name,
      contact_email: payload.contact_email,
      contact_phone: payload.contact_phone,
      company_name: payload.company_name || null,
      location: payload.location || null,
      site_address_line1: payload.site_address_line1 || null,
      site_address_line2: payload.site_address_line2 || null,
      site_city: payload.site_city || null,
      site_state_region: payload.site_state_region || null,
      site_postal_code: payload.site_postal_code || null,
      site_country: payload.site_country || null,
      subject: payload.subject || null,
      message: payload.message || null,
      equipment_details: payload.equipment_details || null,
      industry_context: payload.industry_context || null,
      number_of_machines: typeof payload.number_of_machines === 'number' ? payload.number_of_machines : null,
      preferred_start_date: payload.preferred_start_date || null,
      inquiry_type: payload.inquiry_type || null,
      status: 'submitted',
      created_at: this._nowIso(),
      updated_at: null
    };

    serviceRequests.push(record);
    this._saveToStorage('service_requests', serviceRequests);

    return record;
  }

  _createSupportRequestRecord(payload) {
    const supportRequests = this._getFromStorage('support_requests');

    const record = {
      id: this._generateId('sup'),
      contact_type: payload.contact_type,
      priority: payload.priority,
      issue_category: payload.issue_category,
      issue_description: payload.issue_description,
      contact_name: payload.contact_name,
      contact_email: payload.contact_email,
      contact_phone: payload.contact_phone,
      company_name: payload.company_name || null,
      site_address_line1: payload.site_address_line1,
      site_address_line2: payload.site_address_line2 || null,
      site_city: payload.site_city || null,
      site_state_region: payload.site_state_region || null,
      site_postal_code: payload.site_postal_code || null,
      site_country: payload.site_country || null,
      line_or_area_description: payload.line_or_area_description || null,
      request_callback_within_one_hour: !!payload.request_callback_within_one_hour,
      preferred_contact_method: payload.preferred_contact_method || null,
      status: 'submitted',
      created_at: this._nowIso(),
      updated_at: null
    };

    supportRequests.push(record);
    this._saveToStorage('support_requests', supportRequests);

    return record;
  }

  _calculateTrainingSessionAvailability(session, numberOfAttendees) {
    if (!session || session.is_active === false) return false;
    if (typeof session.available_seats !== 'number') return true; // treat undefined as unlimited
    return session.available_seats >= numberOfAttendees;
  }

  // -------------------------
  // Homepage interfaces
  // -------------------------

  getHomepageOverview() {
    return {
      headline: 'Industrial Services for Reliable, Efficient Operations',
      subheadline: 'Maintenance, cleaning, inspections, training, and parts for manufacturing, logistics, and more.',
      industries_served: [
        {
          industry_key: 'manufacturing',
          industry_label: 'Manufacturing',
          description: 'End-to-end support for discrete and process manufacturing facilities.'
        },
        {
          industry_key: 'automotive',
          industry_label: 'Automotive',
          description: 'Production line uptime services for OEM and Tier 1–3 suppliers.'
        },
        {
          industry_key: 'logistics',
          industry_label: 'Logistics',
          description: 'Conveyor, sorter, and material handling support for logistics hubs.'
        },
        {
          industry_key: 'warehousing',
          industry_label: 'Warehousing',
          description: 'Facility cleaning, inspections, and maintenance for large warehouses.'
        }
      ],
      value_propositions: [
        {
          title: '24/7 Response Options',
          description: 'Emergency support and rapid response SLAs to keep your lines running.',
          icon_key: 'clock'
        },
        {
          title: 'Certified Technicians',
          description: 'OEM-trained technicians with safety and compliance credentials.',
          icon_key: 'shield'
        },
        {
          title: 'Data-Driven Maintenance',
          description: 'Condition monitoring and inspections to reduce unplanned downtime.',
          icon_key: 'analytics'
        }
      ]
    };
  }

  getHomepageServiceHighlights() {
    return [
      { service_key: 'maintenance_contracts', title: 'Maintenance Contracts', summary: 'Preventive and emergency maintenance plans tailored to your facility.' },
      { service_key: 'cleaning_services', title: 'Cleaning & Facility Services', summary: 'Industrial cleaning, warehouse detailing, and facility hygiene services.' },
      { service_key: 'inspection_services', title: 'Inspection & Testing', summary: 'Multi-point inspections and testing for critical equipment.' },
      { service_key: 'training', title: 'Training & Certifications', summary: 'Safety and technical training programs for your teams.' },
      { service_key: 'parts', title: 'Parts & Accessories', summary: 'OEM and compatible spare parts for your equipment fleet.' },
      { service_key: 'locations', title: 'Service Centers', summary: 'Regional service centers for on-site and depot repair.' },
      { service_key: 'support', title: 'Support & Emergency', summary: 'Around-the-clock support options for critical breakdowns.' }
    ];
  }

  getHomepageQuickActions() {
    return [
      {
        action_key: 'emergency_support',
        label: 'Request Emergency Support',
        description: 'Get rapid-response help for critical breakdowns.'
      },
      {
        action_key: 'request_maintenance_quote',
        label: 'Request Maintenance Contract Quote',
        description: 'Compare plans and get a quote for your facility.'
      },
      {
        action_key: 'book_cleaning',
        label: 'Book Cleaning Service',
        description: 'Schedule a one-time or recurring facility cleaning.'
      },
      {
        action_key: 'schedule_inspection',
        label: 'Schedule Inspection',
        description: 'Book equipment inspections and testing services.'
      }
    ];
  }

  getHomepageFeaturedCaseStudies() {
    const caseStudies = this._getFromStorage('case_studies');
    return caseStudies
      .filter((cs) => cs.is_active !== false && cs.is_featured === true)
      .sort((a, b) => {
        const da = new Date(a.publication_date || 0).getTime();
        const db = new Date(b.publication_date || 0).getTime();
        return db - da;
      });
  }

  getHomepageUpcomingTrainingSessions() {
    const sessions = this._getFromStorage('training_sessions');
    const courses = this._getFromStorage('training_courses');
    const now = new Date();

    const result = sessions
      .filter((s) => s.is_active !== false && new Date(s.start_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5)
      .map((session) => {
        const course = courses.find((c) => c.id === session.training_course_id) || null;
        return { session, course };
      });

    return result;
  }

  // -------------------------
  // Maintenance Contracts
  // -------------------------

  getMaintenanceContractsFilterOptions() {
    return {
      industries: [
        { key: 'manufacturing', label: 'Manufacturing' },
        { key: 'automotive', label: 'Automotive' },
        { key: 'logistics', label: 'Logistics' },
        { key: 'warehousing', label: 'Warehousing' },
        { key: 'food_and_beverage', label: 'Food & Beverage' },
        { key: 'other', label: 'Other' }
      ],
      facility_size_ranges_sq_ft: [
        { min: 0, max: 5000, label: 'Up to 5,000 sq ft' },
        { min: 5000, max: 20000, label: '5,000–20,000 sq ft' },
        { min: 20000, max: 50000, label: '20,000–50,000 sq ft' },
        { min: 50000, max: 200000, label: '50,000–200,000 sq ft' }
      ],
      monthly_budget_presets: [
        { value: 1000, label: 'Up to $1,000/mo' },
        { value: 2000, label: 'Up to $2,000/mo' },
        { value: 5000, label: 'Up to $5,000/mo' }
      ],
      response_time_options_hours: [4, 8, 24, 48],
      sort_options: [
        { key: 'monthly_price_asc', label: 'Monthly Price – Low to High' },
        { key: 'monthly_price_desc', label: 'Monthly Price – High to Low' },
        { key: 'response_time_asc', label: 'Response Time – Fastest First' },
        { key: 'response_time_desc', label: 'Response Time – Slowest First' }
      ]
    };
  }

  searchMaintenanceContracts(filters, sortBy) {
    const plans = this._getFromStorage('maintenance_contract_plans').filter((p) => p.is_active !== false);
    let result = plans;

    if (filters && typeof filters === 'object') {
      const {
        industry,
        minFacilitySizeSqFt,
        maxFacilitySizeSqFt,
        maxMonthlyPrice,
        maxResponseTimeHours
      } = filters;

      if (industry) {
        result = result.filter((p) => p.industry === industry);
      }

      if (typeof minFacilitySizeSqFt === 'number' || typeof maxFacilitySizeSqFt === 'number') {
        result = result.filter((p) => {
          const planMin = typeof p.min_facility_size_sq_ft === 'number' ? p.min_facility_size_sq_ft : 0;
          const planMax = typeof p.max_facility_size_sq_ft === 'number' ? p.max_facility_size_sq_ft : Number.POSITIVE_INFINITY;
          const filterMin = typeof minFacilitySizeSqFt === 'number' ? minFacilitySizeSqFt : 0;
          const filterMax = typeof maxFacilitySizeSqFt === 'number' ? maxFacilitySizeSqFt : Number.POSITIVE_INFINITY;
          // overlap
          return planMax >= filterMin && planMin <= filterMax;
        });
      }

      if (typeof maxMonthlyPrice === 'number') {
        result = result.filter((p) => p.monthly_price <= maxMonthlyPrice);
      }

      if (typeof maxResponseTimeHours === 'number') {
        result = result.filter((p) => p.response_time_hours <= maxResponseTimeHours);
      }
    }

    if (sortBy) {
      result = result.slice();
      if (sortBy === 'monthly_price_asc') {
        result.sort((a, b) => a.monthly_price - b.monthly_price);
      } else if (sortBy === 'monthly_price_desc') {
        result.sort((a, b) => b.monthly_price - a.monthly_price);
      } else if (sortBy === 'response_time_asc') {
        result.sort((a, b) => a.response_time_hours - b.response_time_hours);
      } else if (sortBy === 'response_time_desc') {
        result.sort((a, b) => b.response_time_hours - a.response_time_hours);
      }
    }

    return result;
  }

  getMaintenanceContractPlanDetails(maintenanceContractPlanId) {
    const plan = this._findById('maintenance_contract_plans', maintenanceContractPlanId);
    if (!plan) return null;

    const detailed_inclusions = Array.isArray(plan.included_services) ? plan.included_services : [];
    const exclusions = [];
    const service_frequency = 'As specified in contract';

    const industryLabels = {
      manufacturing: 'Manufacturing',
      automotive: 'Automotive',
      logistics: 'Logistics',
      warehousing: 'Warehousing',
      food_and_beverage: 'Food & Beverage',
      other: 'Other'
    };

    const applicable_industries_labels = [industryLabels[plan.industry] || ''];

    return {
      plan,
      detailed_inclusions,
      exclusions,
      service_frequency,
      applicable_industries_labels
    };
  }

  createMaintenanceContractQuoteRequest(
    maintenanceContractPlanId,
    contactName,
    contactEmail,
    contactPhone,
    companyName,
    location,
    numberOfMachines,
    preferredStartDate,
    message
  ) {
    const plan = this._findById('maintenance_contract_plans', maintenanceContractPlanId);
    if (!plan) {
      return {
        success: false,
        serviceRequestId: null,
        status: 'error',
        message: 'Maintenance contract plan not found.'
      };
    }

    const record = this._createServiceRequestRecord({
      request_type: 'maintenance_contract_quote',
      maintenance_contract_plan_id: maintenanceContractPlanId,
      related_service_name: plan.name || null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      company_name: companyName,
      location: location,
      subject: 'Maintenance Contract Quote Request',
      message: message || null,
      number_of_machines: typeof numberOfMachines === 'number' ? numberOfMachines : null,
      preferred_start_date: preferredStartDate || null
    });

    return {
      success: true,
      serviceRequestId: record.id,
      status: record.status,
      message: 'Quote request submitted successfully.'
    };
  }

  // -------------------------
  // Cleaning & Facility Services
  // -------------------------

  getCleaningServiceCategories() {
    return [
      {
        category_id: 'industrial_warehouse_cleaning',
        name: 'Industrial Warehouse Cleaning',
        description: 'Deep cleaning and maintenance for industrial warehouses and distribution centers.'
      },
      {
        category_id: 'office_cleaning',
        name: 'Office Cleaning',
        description: 'Regular office and administrative area cleaning services.'
      },
      {
        category_id: 'outdoor_facility_cleaning',
        name: 'Outdoor Facility Cleaning',
        description: 'Exterior pressure washing, loading dock, and yard cleaning.'
      },
      {
        category_id: 'other_cleaning',
        name: 'Other Cleaning Services',
        description: 'Custom and specialized cleaning services.'
      }
    ];
  }

  getCleaningPackagesFilterOptions() {
    return {
      facility_size_ranges_sq_ft: [
        { min: 0, max: 10000, label: 'Up to 10,000 sq ft' },
        { min: 10000, max: 30000, label: '10,000–30,000 sq ft' },
        { min: 30000, max: 60000, label: '30,000–60,000 sq ft' },
        { min: 60000, max: 200000, label: '60,000+ sq ft' }
      ],
      price_ranges: [
        { min: 0, max: 1000, label: 'Up to $1,000' },
        { min: 1000, max: 1500, label: 'Up to $1,500' },
        { min: 1500, max: 3000, label: 'Up to $3,000' }
      ],
      eco_friendly_filter_label: 'Eco-friendly / Green cleaning products only'
    };
  }

  searchCleaningServicePackages(filters) {
    const packages = this._getFromStorage('cleaning_service_packages').filter((p) => p.is_active !== false);
    let result = packages;

    if (filters && typeof filters === 'object') {
      const {
        categoryId,
        minFacilitySizeSqFt,
        maxFacilitySizeSqFt,
        isEcoFriendly,
        isOneTimeService,
        maxPriceTotal
      } = filters;

      if (categoryId) {
        result = result.filter((p) => p.category_id === categoryId);
      }

      if (typeof minFacilitySizeSqFt === 'number' || typeof maxFacilitySizeSqFt === 'number') {
        result = result.filter((p) => {
          const pMin = typeof p.facility_size_min_sq_ft === 'number' ? p.facility_size_min_sq_ft : 0;
          const pMax = typeof p.facility_size_max_sq_ft === 'number' ? p.facility_size_max_sq_ft : Number.POSITIVE_INFINITY;
          const filterMin = typeof minFacilitySizeSqFt === 'number' ? minFacilitySizeSqFt : 0;
          const filterMax = typeof maxFacilitySizeSqFt === 'number' ? maxFacilitySizeSqFt : Number.POSITIVE_INFINITY;
          return pMax >= filterMin && pMin <= filterMax;
        });
      }

      if (typeof isEcoFriendly === 'boolean') {
        result = result.filter((p) => p.is_eco_friendly === isEcoFriendly);
      }

      if (typeof isOneTimeService === 'boolean') {
        result = result.filter((p) => p.is_one_time_service === isOneTimeService);
      }

      if (typeof maxPriceTotal === 'number') {
        result = result.filter((p) => p.price_total <= maxPriceTotal);
      }
    }

    return result;
  }

  getCleaningServicePackageDetails(cleaningServicePackageId) {
    const pkg = this._findById('cleaning_service_packages', cleaningServicePackageId);
    if (!pkg) return null;

    let scope_of_work = [];
    if (pkg.notes && typeof pkg.notes === 'string') {
      scope_of_work = pkg.notes.split('\n').map((s) => s.trim()).filter(Boolean);
    }

    const exclusions = [];

    let facility_size_label = '';
    const min = pkg.facility_size_min_sq_ft;
    const max = pkg.facility_size_max_sq_ft;
    if (typeof min === 'number' && typeof max === 'number') {
      facility_size_label = `${min.toLocaleString()}–${max.toLocaleString()} sq ft`;
    } else if (typeof min === 'number') {
      facility_size_label = `${min.toLocaleString()}+ sq ft`;
    } else if (typeof max === 'number') {
      facility_size_label = `Up to ${max.toLocaleString()} sq ft`;
    }

    return {
      package: pkg,
      scope_of_work,
      exclusions,
      facility_size_label
    };
  }

  getCleaningAvailabilityCalendar(cleaningServicePackageId, startDate, endDate) {
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    const result = [];

    const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

    while (current <= endUTC) {
      const availability = this._checkCleaningAvailability(cleaningServicePackageId, current);
      result.push({
        date: current.toISOString().slice(0, 10),
        has_morning_slots: availability.has_morning_slots,
        has_afternoon_slots: availability.has_afternoon_slots,
        has_evening_slots: availability.has_evening_slots
      });
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return result;
  }

  getCleaningAvailableTimeSlots(cleaningServicePackageId, date) {
    const dateObj = new Date(date + 'T00:00:00Z');
    const day = dateObj.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    if (!isWeekday) return [];

    const year = dateObj.getUTCFullYear();
    const month = dateObj.getUTCMonth();
    const d = dateObj.getUTCDate();

    const slots = [];

    const slot1Start = new Date(Date.UTC(year, month, d, 13, 0, 0)); // 8:00 local approx depending on TZ
    const slot1End = new Date(Date.UTC(year, month, d, 16, 0, 0));
    const slot2Start = new Date(Date.UTC(year, month, d, 17, 0, 0));
    const slot2End = new Date(Date.UTC(year, month, d, 20, 0, 0));

    slots.push({
      start_datetime: slot1Start.toISOString(),
      end_datetime: slot1End.toISOString(),
      time_window_label: 'Morning'
    });

    slots.push({
      start_datetime: slot2Start.toISOString(),
      end_datetime: slot2End.toISOString(),
      time_window_label: 'Afternoon'
    });

    return slots;
  }

  createCleaningServiceBooking(
    cleaningServicePackageId,
    scheduledStart,
    timeZone,
    contactName,
    contactEmail,
    contactPhone,
    companyName,
    serviceAddressLine1,
    serviceAddressLine2,
    serviceCity,
    serviceStateRegion,
    servicePostalCode,
    serviceCountry,
    additionalInstructions
  ) {
    const pkg = this._findById('cleaning_service_packages', cleaningServicePackageId);
    if (!pkg) {
      return {
        success: false,
        bookingId: null,
        status: 'error',
        message: 'Cleaning service package not found.'
      };
    }

    const bookings = this._getFromStorage('bookings');
    const start = new Date(scheduledStart);
    let scheduled_end = null;
    if (typeof pkg.service_duration_hours === 'number') {
      const end = new Date(start.getTime() + pkg.service_duration_hours * 60 * 60 * 1000);
      scheduled_end = end.toISOString();
    }

    const booking = {
      id: this._generateId('bk'),
      booking_type: 'cleaning_service',
      cleaning_service_package_id: cleaningServicePackageId,
      service_center_id: null,
      service_name: pkg.name || 'Cleaning Service',
      scheduled_start: start.toISOString(),
      scheduled_end,
      time_zone: timeZone || null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      company_name: companyName || null,
      service_address_line1: serviceAddressLine1,
      service_address_line2: serviceAddressLine2 || null,
      service_city: serviceCity || null,
      service_state_region: serviceStateRegion || null,
      service_postal_code: servicePostalCode || null,
      service_country: serviceCountry || null,
      additional_instructions: additionalInstructions || null,
      equipment_type: null,
      service_description: null,
      status: 'pending',
      created_at: this._nowIso(),
      updated_at: null
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      bookingId: booking.id,
      status: booking.status,
      message: 'Cleaning service booking created.'
    };
  }

  // -------------------------
  // Parts & Accessories / Spare Parts
  // -------------------------

  getPartsSearchFilterOptions() {
    const products = this._getFromStorage('spare_part_products').filter((p) => p.is_active !== false);
    const equipment_models_set = new Set();
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = 0;

    products.forEach((p) => {
      if (p.equipment_model) equipment_models_set.add(p.equipment_model);
      if (Array.isArray(p.compatible_models)) {
        p.compatible_models.forEach((m) => equipment_models_set.add(m));
      }
      if (typeof p.price === 'number') {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
    });

    if (!isFinite(minPrice)) minPrice = 0;

    return {
      equipment_models: Array.from(equipment_models_set),
      rating_thresholds: [1, 2, 3, 4, 5],
      price_range: {
        min: minPrice,
        max: maxPrice
      },
      stock_status_options: ['in_stock', 'backorder', 'out_of_stock']
    };
  }

  searchSpareParts(query, filters) {
    const all = this._getFromStorage('spare_part_products').filter((p) => p.is_active !== false);
    let result = all;

    if (query) {
      const q = String(query).toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      result = result.filter((p) => {
        const fields = [p.name, p.short_description, p.long_description]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        return fields.some((f) => tokens.some((t) => f.includes(t)));
      });
    }

    if (filters && typeof filters === 'object') {
      const { equipmentModel, inventoryStatus, minRating, maxPrice } = filters;

      if (equipmentModel) {
        result = result.filter((p) => {
          const matchesPrimary = p.equipment_model === equipmentModel;
          const matchesCompat = Array.isArray(p.compatible_models) && p.compatible_models.includes(equipmentModel);
          return matchesPrimary || matchesCompat;
        });
      }

      if (inventoryStatus) {
        result = result.filter((p) => p.inventory_status === inventoryStatus);
      }

      if (typeof minRating === 'number') {
        result = result.filter((p) => {
          const rating = typeof p.average_rating === 'number' ? p.average_rating : 0;
          return rating >= minRating;
        });
      }

      if (typeof maxPrice === 'number') {
        result = result.filter((p) => p.price <= maxPrice);
      }
    }

    return result;
  }

  getSparePartDetails(sparePartProductId) {
    return this._findById('spare_part_products', sparePartProductId);
  }

  addPartToRequestCart(sparePartProductId, quantity) {
    const product = this._findById('spare_part_products', sparePartProductId);
    if (!product) {
      return {
        success: false,
        cartItemId: null,
        totalItemsInCart: 0,
        message: 'Spare part product not found.'
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('ci'),
      cart_id: cart.id,
      spare_part_product_id: sparePartProductId,
      quantity: qty,
      shipping_option: null,
      unit_price_snapshot: product.price,
      currency_snapshot: product.currency,
      added_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    return {
      success: true,
      cartItemId: cartItem.id,
      totalItemsInCart: itemsForCart.length,
      message: 'Item added to request cart.'
    };
  }

  getRequestCart() {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart.id);
    return totals;
  }

  updateRequestCartItem(cartItemId, quantity, shippingOption) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx < 0) {
      return {
        success: false,
        updatedItem: null,
        message: 'Cart item not found.'
      };
    }

    const item = cartItems[idx];

    if (typeof quantity === 'number') {
      item.quantity = quantity > 0 ? quantity : 1;
    }

    if (typeof shippingOption === 'string') {
      item.shipping_option = shippingOption;
    }

    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      updatedItem: item,
      message: 'Cart item updated.'
    };
  }

  removeRequestCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx < 0) {
      return {
        success: false,
        message: 'Cart item not found.'
      };
    }

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      message: 'Cart item removed.'
    };
  }

  createPartsQuoteRequestFromCart(contactName, contactEmail, contactPhone, companyName, location, message) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);

    if (cartItems.length === 0) {
      return {
        success: false,
        serviceRequestId: null,
        status: 'error',
        message: 'Request cart is empty.'
      };
    }

    const record = this._createServiceRequestRecord({
      request_type: 'other',
      related_service_name: 'Spare Parts Quote Request',
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      company_name: companyName || null,
      location: location || null,
      subject: 'Spare Parts Quote Request from Cart',
      message: message || null
    });

    return {
      success: true,
      serviceRequestId: record.id,
      status: record.status,
      message: 'Parts quote request submitted.'
    };
  }

  // -------------------------
  // Service Centers & On-site Visits
  // -------------------------

  searchServiceCentersByLocation(searchTerm, radiusMiles) {
    const centers = this._getFromStorage('service_centers').filter((c) => c.is_active !== false);
    const origin = this._resolveLocationToCoordinates(searchTerm);
    const result = [];

    centers.forEach((center) => {
      let distance = null;
      if (origin && typeof center.latitude === 'number' && typeof center.longitude === 'number') {
        distance = this._calculateDistanceMiles(origin.latitude, origin.longitude, center.latitude, center.longitude);
      }

      if (typeof radiusMiles === 'number' && radiusMiles > 0 && distance !== null) {
        if (distance <= radiusMiles) {
          result.push({ service_center: center, distance_miles: distance });
        }
      } else {
        result.push({ service_center: center, distance_miles: distance });
      }
    });

    result.sort((a, b) => {
      const da = a.distance_miles;
      const db = b.distance_miles;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });

    return result;
  }

  getServiceCenterDetails(serviceCenterId) {
    return this._findById('service_centers', serviceCenterId);
  }

  getOnsiteVisitAvailability(serviceCenterId, startDate, endDate) {
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    return this._checkOnsiteAvailability(serviceCenterId, start, end);
  }

  createOnsiteServiceBooking(
    serviceCenterId,
    scheduledStart,
    timeZone,
    contactName,
    contactEmail,
    contactPhone,
    companyName,
    serviceAddressLine1,
    serviceAddressLine2,
    serviceCity,
    serviceStateRegion,
    servicePostalCode,
    serviceCountry,
    equipmentType,
    serviceDescription
  ) {
    const center = this._findById('service_centers', serviceCenterId);
    if (!center) {
      return {
        success: false,
        bookingId: null,
        status: 'error',
        message: 'Service center not found.'
      };
    }

    const bookings = this._getFromStorage('bookings');
    const start = new Date(scheduledStart);

    const booking = {
      id: this._generateId('bk'),
      booking_type: 'onsite_service_visit',
      cleaning_service_package_id: null,
      service_center_id: serviceCenterId,
      service_name: `On-site Service Visit - ${center.name}`,
      scheduled_start: start.toISOString(),
      scheduled_end: null,
      time_zone: timeZone || null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      company_name: companyName || null,
      service_address_line1: serviceAddressLine1,
      service_address_line2: serviceAddressLine2 || null,
      service_city: serviceCity || null,
      service_state_region: serviceStateRegion || null,
      service_postal_code: servicePostalCode || null,
      service_country: serviceCountry || null,
      additional_instructions: null,
      equipment_type: equipmentType || null,
      service_description: serviceDescription || null,
      status: 'pending',
      created_at: this._nowIso(),
      updated_at: null
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      bookingId: booking.id,
      status: booking.status,
      message: 'On-site service booking created.'
    };
  }

  // -------------------------
  // Inspection & Testing Services
  // -------------------------

  getInspectionFilterOptions() {
    const packages = this._getFromStorage('inspection_packages').filter((p) => p.is_active !== false);
    const industriesSet = new Set();
    const equipmentTypesSet = new Set();
    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = 0;

    packages.forEach((p) => {
      if (p.industry) industriesSet.add(p.industry);
      if (Array.isArray(p.included_equipment_types)) {
        p.included_equipment_types.forEach((t) => equipmentTypesSet.add(t));
      }
      if (typeof p.price_total === 'number') {
        if (p.price_total < minPrice) minPrice = p.price_total;
        if (p.price_total > maxPrice) maxPrice = p.price_total;
      }
    });

    if (!isFinite(minPrice)) minPrice = 0;

    return {
      inspection_types: ['standard', 'comprehensive', 'multi_point', 'other'],
      industries: Array.from(industriesSet),
      price_range: { min: minPrice, max: maxPrice },
      equipment_types: Array.from(equipmentTypesSet),
      sort_options: [
        { key: 'checkpoints_desc', label: 'Checkpoints – Most to Least' },
        { key: 'price_asc', label: 'Price – Low to High' },
        { key: 'price_desc', label: 'Price – High to Low' }
      ]
    };
  }

  searchInspectionPackages(filters, sortBy) {
    const all = this._getFromStorage('inspection_packages').filter((p) => p.is_active !== false);
    let result = all;

    if (filters && typeof filters === 'object') {
      const { industry, inspectionType, includedEquipmentType, maxPriceTotal } = filters;

      if (industry) {
        result = result.filter((p) => p.industry === industry);
      }

      if (inspectionType) {
        result = result.filter((p) => p.inspection_type === inspectionType);
      }

      if (includedEquipmentType) {
        result = result.filter((p) => {
          return Array.isArray(p.included_equipment_types) && p.included_equipment_types.includes(includedEquipmentType);
        });
      }

      if (typeof maxPriceTotal === 'number') {
        result = result.filter((p) => p.price_total <= maxPriceTotal);
      }
    }

    if (sortBy) {
      result = result.slice();
      if (sortBy === 'checkpoints_desc') {
        result.sort((a, b) => b.number_of_checkpoints - a.number_of_checkpoints);
      } else if (sortBy === 'price_asc') {
        result.sort((a, b) => a.price_total - b.price_total);
      } else if (sortBy === 'price_desc') {
        result.sort((a, b) => b.price_total - a.price_total);
      }
    }

    return result;
  }

  getInspectionPackageDetails(inspectionPackageId) {
    return this._findById('inspection_packages', inspectionPackageId);
  }

  createInspectionOrderRequest(
    inspectionPackageId,
    contactName,
    contactEmail,
    contactPhone,
    companyName,
    facilityLocation,
    equipmentDetails,
    industryContext
  ) {
    const pkg = this._findById('inspection_packages', inspectionPackageId);
    if (!pkg) {
      return {
        success: false,
        serviceRequestId: null,
        status: 'error',
        message: 'Inspection package not found.'
      };
    }

    const record = this._createServiceRequestRecord({
      request_type: 'inspection_order_request',
      inspection_package_id: inspectionPackageId,
      related_service_name: pkg.name || null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      company_name: companyName,
      location: facilityLocation,
      subject: 'Inspection Order Request',
      message: equipmentDetails || null,
      equipment_details: equipmentDetails || null,
      industry_context: industryContext || null
    });

    return {
      success: true,
      serviceRequestId: record.id,
      status: record.status,
      message: 'Inspection order request submitted.'
    };
  }

  // -------------------------
  // Custom Maintenance Contracts
  // -------------------------

  getCustomMaintenanceModulesList(filters) {
    const modules = this._getFromStorage('custom_maintenance_modules').filter((m) => m.is_active !== false);
    let result = modules;

    if (filters && typeof filters === 'object') {
      const { moduleTypes, isCoreOnly } = filters;

      if (Array.isArray(moduleTypes) && moduleTypes.length > 0) {
        const set = new Set(moduleTypes);
        result = result.filter((m) => set.has(m.module_type));
      }

      if (typeof isCoreOnly === 'boolean' && isCoreOnly) {
        result = result.filter((m) => m.is_core_module === true);
      }
    }

    return result;
  }

  createOrUpdateCustomMaintenanceConfiguration(budgetLimit, currency, selectedModuleIds) {
    const allModules = this._getFromStorage('custom_maintenance_modules').filter((m) => m.is_active !== false);
    const selectedModules = allModules.filter((m) => selectedModuleIds.includes(m.id));

    const { withinBudget, validationErrors, totalMonthlyCost } = this._validateCustomMaintenanceConfiguration(
      budgetLimit,
      selectedModules
    );

    let configurations = this._getFromStorage('custom_maintenance_configurations');
    let configModules = this._getFromStorage('custom_maintenance_config_modules');
    let currentConfigId = localStorage.getItem('current_custom_maintenance_configuration_id') || '';
    let configuration = null;

    if (currentConfigId) {
      configuration = configurations.find((c) => c.id === currentConfigId) || null;
    }

    if (!configuration) {
      configuration = {
        id: this._generateId('cmc'),
        budget_limit: budgetLimit,
        currency: currency,
        total_monthly_cost: totalMonthlyCost,
        number_of_modules: selectedModules.length,
        summary_notes: null,
        created_at: this._nowIso(),
        updated_at: null
      };
      configurations.push(configuration);
    } else {
      configuration.budget_limit = budgetLimit;
      configuration.currency = currency;
      configuration.total_monthly_cost = totalMonthlyCost;
      configuration.number_of_modules = selectedModules.length;
      configuration.updated_at = this._nowIso();
    }

    // Update join records
    configModules = configModules.filter((cm) => cm.configuration_id !== configuration.id);
    selectedModules.forEach((m) => {
      configModules.push({
        id: this._generateId('cmcm'),
        configuration_id: configuration.id,
        module_id: m.id,
        module_monthly_cost_snapshot: m.monthly_cost,
        currency_snapshot: m.currency
      });
    });

    this._saveToStorage('custom_maintenance_configurations', configurations);
    this._saveToStorage('custom_maintenance_config_modules', configModules);
    localStorage.setItem('current_custom_maintenance_configuration_id', configuration.id);

    const success = withinBudget && validationErrors.length === 0;

    return {
      success,
      configuration,
      selected_modules: selectedModules,
      withinBudget,
      validationErrors
    };
  }

  getCurrentCustomMaintenanceConfiguration() {
    const currentConfigId = localStorage.getItem('current_custom_maintenance_configuration_id') || '';
    if (!currentConfigId) {
      return {
        configuration: null,
        selected_modules: []
      };
    }

    const configurations = this._getFromStorage('custom_maintenance_configurations');
    const configModules = this._getFromStorage('custom_maintenance_config_modules');
    const modules = this._getFromStorage('custom_maintenance_modules');

    const configuration = configurations.find((c) => c.id === currentConfigId) || null;
    if (!configuration) {
      return {
        configuration: null,
        selected_modules: []
      };
    }

    const moduleLinks = configModules.filter((cm) => cm.configuration_id === configuration.id);
    const selected_modules = moduleLinks.map((link) => modules.find((m) => m.id === link.module_id)).filter(Boolean);

    return {
      configuration,
      selected_modules
    };
  }

  submitCustomMaintenanceContractRequest(
    configurationId,
    contactName,
    contactEmail,
    contactPhone,
    companyName,
    facilityAddressLine1,
    facilityAddressLine2,
    facilityCity,
    facilityStateRegion,
    facilityPostalCode,
    facilityCountry,
    comments
  ) {
    const configuration = this._findById('custom_maintenance_configurations', configurationId);
    if (!configuration) {
      return {
        success: false,
        serviceRequestId: null,
        status: 'error',
        message: 'Custom maintenance configuration not found.'
      };
    }

    const record = this._createServiceRequestRecord({
      request_type: 'custom_maintenance_contract_request',
      custom_configuration_id: configurationId,
      related_service_name: 'Custom Maintenance Contract',
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      company_name: companyName,
      site_address_line1: facilityAddressLine1,
      site_address_line2: facilityAddressLine2 || null,
      site_city: facilityCity || null,
      site_state_region: facilityStateRegion || null,
      site_postal_code: facilityPostalCode || null,
      site_country: facilityCountry || null,
      subject: 'Custom Maintenance Contract Request',
      message: comments || null
    });

    return {
      success: true,
      serviceRequestId: record.id,
      status: record.status,
      message: 'Custom maintenance contract request submitted.'
    };
  }

  // -------------------------
  // Training & Certifications
  // -------------------------

  getTrainingCategories() {
    const courses = this._getFromStorage('training_courses').filter((c) => c.is_active !== false);
    const categories = new Set();
    courses.forEach((c) => categories.add(c.category));

    const labelMap = {
      safety_training: 'Safety Training',
      technical_training: 'Technical Training',
      management_training: 'Management Training',
      other: 'Other Training'
    };

    return Array.from(categories).map((key) => ({
      category_key: key,
      label: labelMap[key] || key
    }));
  }

  getTrainingFilterOptions() {
    return {
      duration_options_hours: [2, 4, 8],
      price_ranges: [
        { min: 0, max: 100, label: 'Up to $100 per attendee' },
        { min: 100, max: 200, label: 'Up to $200 per attendee' },
        { min: 200, max: 500, label: 'Up to $500 per attendee' }
      ]
    };
  }

  searchTrainingSessions(filters) {
    const sessions = this._getFromStorage('training_sessions').filter((s) => s.is_active !== false);
    const courses = this._getFromStorage('training_courses');
    let result = sessions;

    if (filters && typeof filters === 'object') {
      const {
        category,
        searchQuery,
        maxDurationHours,
        maxPricePerAttendee,
        startDate,
        endDate
      } = filters;

      if (category) {
        const courseIds = courses.filter((c) => c.category === category).map((c) => c.id);
        const courseIdSet = new Set(courseIds);
        result = result.filter((s) => courseIdSet.has(s.training_course_id));
      }

      if (searchQuery) {
        const q = String(searchQuery).toLowerCase();
        result = result.filter((s) => {
          const course = courses.find((c) => c.id === s.training_course_id) || {};
          const title = (course.title || '').toLowerCase();
          const description = (course.description || '').toLowerCase();
          return title.includes(q) || description.includes(q);
        });
      }

      if (typeof maxDurationHours === 'number') {
        result = result.filter((s) => s.duration_hours <= maxDurationHours);
      }

      if (typeof maxPricePerAttendee === 'number') {
        result = result.filter((s) => s.price_per_attendee <= maxPricePerAttendee);
      }

      if (startDate || endDate) {
        const start = startDate ? new Date(startDate + 'T00:00:00Z') : null;
        const end = endDate ? new Date(endDate + 'T23:59:59Z') : null;
        result = result.filter((s) => {
          const dt = new Date(s.start_datetime);
          if (start && dt < start) return false;
          if (end && dt > end) return false;
          return true;
        });
      }
    }

    return result.map((session) => {
      const course = courses.find((c) => c.id === session.training_course_id) || null;
      return { session, course };
    });
  }

  getTrainingCourseDetails(trainingCourseId) {
    const course = this._findById('training_courses', trainingCourseId);
    if (!course) return null;

    const sessions = this._getFromStorage('training_sessions').filter(
      (s) => s.training_course_id === trainingCourseId && s.is_active !== false
    );

    const now = new Date();
    const upcoming_sessions = sessions.filter((s) => new Date(s.start_datetime) >= now);

    return {
      course,
      upcoming_sessions
    };
  }

  registerForTrainingSession(
    trainingSessionId,
    numberOfAttendees,
    contactName,
    contactEmail,
    contactPhone,
    companyName,
    companyLocation,
    participantNotes
  ) {
    const sessions = this._getFromStorage('training_sessions');
    const idx = sessions.findIndex((s) => s.id === trainingSessionId);
    if (idx < 0) {
      return {
        success: false,
        trainingRegistrationId: null,
        status: 'error',
        message: 'Training session not found.'
      };
    }

    const session = sessions[idx];

    const attendees = typeof numberOfAttendees === 'number' && numberOfAttendees > 0 ? numberOfAttendees : 1;

    if (!this._calculateTrainingSessionAvailability(session, attendees)) {
      return {
        success: false,
        trainingRegistrationId: null,
        status: 'error',
        message: 'Insufficient available seats for this session.'
      };
    }

    if (typeof session.available_seats === 'number') {
      session.available_seats = session.available_seats - attendees;
      sessions[idx] = session;
      this._saveToStorage('training_sessions', sessions);
    }

    const registrations = this._getFromStorage('training_registrations');
    const registration = {
      id: this._generateId('tr'),
      training_session_id: trainingSessionId,
      number_of_attendees: attendees,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      company_name: companyName || null,
      company_location: companyLocation || null,
      participant_notes: participantNotes || null,
      status: 'submitted',
      created_at: this._nowIso(),
      updated_at: null
    };

    registrations.push(registration);
    this._saveToStorage('training_registrations', registrations);

    return {
      success: true,
      trainingRegistrationId: registration.id,
      status: registration.status,
      message: 'Training registration submitted.'
    };
  }

  // -------------------------
  // Case Studies & Sales Inquiries
  // -------------------------

  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies').filter((cs) => cs.is_active !== false);
    const industries = new Set();
    const countries = new Set();

    caseStudies.forEach((cs) => {
      if (cs.industry) industries.add(cs.industry);
      if (cs.country) countries.add(cs.country);
    });

    return {
      industries: Array.from(industries),
      countries: Array.from(countries),
      sort_options: [
        { key: 'publication_date_desc', label: 'Publication Date – Newest First' },
        { key: 'publication_date_asc', label: 'Publication Date – Oldest First' },
        { key: 'energy_savings_desc', label: 'Energy Savings – High to Low' },
        { key: 'energy_savings_asc', label: 'Energy Savings – Low to High' }
      ]
    };
  }

  searchCaseStudies(filters, sortBy) {
    const all = this._getFromStorage('case_studies').filter((cs) => cs.is_active !== false);
    let result = all;

    if (filters && typeof filters === 'object') {
      const { industry, country, region, keyword } = filters;

      if (industry) {
        result = result.filter((cs) => cs.industry === industry);
      }

      if (country) {
        result = result.filter((cs) => cs.country === country);
      }

      if (region) {
        result = result.filter((cs) => cs.region === region);
      }

      if (keyword) {
        const q = String(keyword).toLowerCase();
        result = result.filter((cs) => {
          const title = (cs.title || '').toLowerCase();
          const summary = (cs.summary || '').toLowerCase();
          const content = (cs.content || '').toLowerCase();
          return title.includes(q) || summary.includes(q) || content.includes(q);
        });
      }
    }

    if (sortBy) {
      result = result.slice();
      if (sortBy === 'publication_date_desc') {
        result.sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date));
      } else if (sortBy === 'publication_date_asc') {
        result.sort((a, b) => new Date(a.publication_date) - new Date(b.publication_date));
      } else if (sortBy === 'energy_savings_desc') {
        result.sort((a, b) => {
          const ea = typeof a.energy_savings_percentage === 'number' ? a.energy_savings_percentage : -Infinity;
          const eb = typeof b.energy_savings_percentage === 'number' ? b.energy_savings_percentage : -Infinity;
          return eb - ea;
        });
      } else if (sortBy === 'energy_savings_asc') {
        result.sort((a, b) => {
          const ea = typeof a.energy_savings_percentage === 'number' ? a.energy_savings_percentage : Infinity;
          const eb = typeof b.energy_savings_percentage === 'number' ? b.energy_savings_percentage : Infinity;
          return ea - eb;
        });
      }
    }

    return result;
  }

  getCaseStudyDetails(caseStudyId) {
    return this._findById('case_studies', caseStudyId);
  }

  createCaseStudySalesInquiry(
    caseStudyId,
    contactName,
    contactEmail,
    contactPhone,
    companyName,
    location,
    message,
    inquiryType
  ) {
    const caseStudy = this._findById('case_studies', caseStudyId);
    if (!caseStudy) {
      return {
        success: false,
        serviceRequestId: null,
        status: 'error',
        message: 'Case study not found.'
      };
    }

    const record = this._createServiceRequestRecord({
      request_type: 'sales_inquiry_case_study',
      case_study_id: caseStudyId,
      related_service_name: caseStudy.title || null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      company_name: companyName || null,
      location: location || null,
      subject: 'Sales Inquiry – Case Study',
      message: message || null,
      inquiry_type: inquiryType || 'energy_optimization'
    });

    return {
      success: true,
      serviceRequestId: record.id,
      status: record.status,
      message: 'Sales inquiry submitted.'
    };
  }

  // -------------------------
  // Support & Emergency Service
  // -------------------------

  getSupportContactOptions() {
    return {
      general_support_phone: '+1-800-000-0000',
      general_support_email: 'support@example.com',
      emergency_support_phone: '+1-800-EMERGENCY',
      emergency_support_hours: '24/7 for critical production issues'
    };
  }

  createEmergencySupportRequest(
    issueCategory,
    issueDescription,
    priority,
    contactName,
    contactEmail,
    contactPhone,
    companyName,
    siteAddressLine1,
    siteAddressLine2,
    siteCity,
    siteStateRegion,
    sitePostalCode,
    siteCountry,
    lineOrAreaDescription,
    requestCallbackWithinOneHour,
    preferredContactMethod
  ) {
    const record = this._createSupportRequestRecord({
      contact_type: 'emergency',
      priority: priority || 'critical',
      issue_category: issueCategory,
      issue_description: issueDescription,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      company_name: companyName || null,
      site_address_line1: siteAddressLine1,
      site_address_line2: siteAddressLine2 || null,
      site_city: siteCity || null,
      site_state_region: siteStateRegion || null,
      site_postal_code: sitePostalCode || null,
      site_country: siteCountry || null,
      line_or_area_description: lineOrAreaDescription || null,
      request_callback_within_one_hour: !!requestCallbackWithinOneHour,
      preferred_contact_method: preferredContactMethod || 'phone'
    });

    return {
      success: true,
      supportRequestId: record.id,
      status: record.status,
      message: 'Emergency support request submitted.'
    };
  }

  createGeneralSupportRequest(subject, message, contactName, contactEmail, contactPhone, companyName) {
    const record = this._createSupportRequestRecord({
      contact_type: 'general',
      priority: 'medium',
      issue_category: 'other',
      issue_description: message,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || '',
      company_name: companyName || null,
      site_address_line1: '',
      site_address_line2: null,
      site_city: null,
      site_state_region: null,
      site_postal_code: null,
      site_country: null,
      line_or_area_description: subject || null,
      request_callback_within_one_hour: false,
      preferred_contact_method: 'email'
    });

    return {
      success: true,
      supportRequestId: record.id,
      status: record.status,
      message: 'Support request submitted.'
    };
  }

  // -------------------------
  // Company / Policies / Certifications
  // -------------------------

  getCompanyOverview() {
    return {
      about_text: 'We provide industrial maintenance, cleaning, inspection, training, and parts services to manufacturing, automotive, logistics, and warehousing customers.',
      years_of_experience: 20,
      core_markets: ['manufacturing', 'automotive', 'logistics', 'warehousing'],
      certifications_summary: 'Our teams hold relevant safety, quality, and OEM certifications to work on critical production equipment.',
      contact_summary: 'Contact us for maintenance contracts, inspections, cleaning, training, and emergency support.'
    };
  }

  getPoliciesSummary() {
    return {
      privacy_policy_summary: 'We use your data only to provide and improve our services, and we do not sell personal information to third parties.',
      terms_of_service_summary: 'Services are provided under written agreements defining scope, responsibilities, and limitations of liability.',
      other_policies: [
        {
          title: 'Health & Safety',
          summary: 'We follow strict health and safety procedures when working on customer sites.'
        },
        {
          title: 'Environmental Policy',
          summary: 'We promote eco-friendly products and processes where possible, especially for cleaning services.'
        }
      ]
    };
  }

  getCertificationsAndComplianceInfo() {
    return [
      {
        certification_name: 'ISO 9001 Quality Management',
        description: 'Quality management system for consistent service delivery.',
        applicable_services: ['maintenance_contracts', 'inspection_services']
      },
      {
        certification_name: 'ISO 45001 Occupational Health and Safety',
        description: 'Health and safety management across all field service operations.',
        applicable_services: ['maintenance_contracts', 'cleaning_services', 'inspection_services']
      },
      {
        certification_name: 'OSHA-compliant Safety Training',
        description: 'Lockout/Tagout and other safety training aligned with OSHA requirements.',
        applicable_services: ['training']
      }
    ];
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
