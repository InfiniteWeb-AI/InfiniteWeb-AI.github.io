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
    const keys = [
      'service_categories',
      'service_types',
      'service_packages',
      'maintenance_plans',
      'parking_lot_size_options',
      'quote_requests',
      'package_requests',
      'maintenance_plan_enrollments',
      'service_appointments',
      'availability_slots',
      'locations',
      'blog_posts',
      'business_infos',
      'contact_messages',
      'emergency_requests',
      'estimate_sessions',
      // additional tables for non-entity-based features
      'faq_entries',
      'legal_contents'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
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

  _getEntityById(storageKey, id) {
    if (!id) return null;
    const items = this._getFromStorage(storageKey);
    return items.find((item) => item.id === id) || null;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _todayISODate() {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  _addDaysToToday(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  // -------------------- Internal Helper Functions --------------------

  // _getOrCreateEstimateSession: create a new EstimateSession and return its id
  _getOrCreateEstimateSession(sessionData) {
    const sessions = this._getFromStorage('estimate_sessions');
    const id = this._generateId('est');
    const now = new Date().toISOString();
    const session = Object.assign(
      {
        id,
        created_at: now
      },
      sessionData
    );
    sessions.push(session);
    this._saveToStorage('estimate_sessions', sessions);
    return id;
  }

  // _markAvailabilitySlotBooked: mark slot as booked and persist
  _markAvailabilitySlotBooked(timeSlotId) {
    const slots = this._getFromStorage('availability_slots');
    const idx = slots.findIndex((s) => s.id === timeSlotId);
    if (idx === -1) return null;
    if (slots[idx].is_booked) return slots[idx];
    slots[idx].is_booked = true;
    this._saveToStorage('availability_slots', slots);
    return slots[idx];
  }

  // _detectEmergencyPhoneInMessage: check if official emergency phone is in message
  _detectEmergencyPhoneInMessage(message) {
    const businessInfos = this._getFromStorage('business_infos');
    const info = businessInfos[0];
    if (!info || !info.emergency_phone || !message) return false;
    return message.indexOf(info.emergency_phone) !== -1;
  }

  // _applyServicePackageFilters: shared helper for repair/sealcoating package filtering
  _applyServicePackageFilters(packages, options) {
    const {
      primary_customer_type,
      max_price_total,
      include_crack_sealing,
      include_pothole_patching,
      max_price_per_sq_ft,
      min_warranty_years
    } = options || {};

    return packages.filter((pkg) => {
      if (!pkg.is_active) return false;

      if (primary_customer_type && pkg.primary_customer_type !== primary_customer_type && pkg.primary_customer_type !== 'both') {
        return false;
      }

      if (typeof max_price_total === 'number') {
        if (typeof pkg.price_total !== 'number') return false;
        if (pkg.price_total > max_price_total) return false;
      }

      if (typeof max_price_per_sq_ft === 'number') {
        if (typeof pkg.price_per_sq_ft !== 'number') return false;
        if (pkg.price_per_sq_ft > max_price_per_sq_ft) return false;
      }

      if (typeof min_warranty_years === 'number') {
        if (typeof pkg.warranty_years !== 'number') return false;
        if (pkg.warranty_years < min_warranty_years) return false;
      }

      if (include_crack_sealing && !pkg.includes_crack_sealing) return false;
      if (include_pothole_patching && !pkg.includes_pothole_patching) return false;

      return true;
    });
  }

  // _ensureSealcoatingPackages: seed at least one sealcoating package if none exist
  _ensureSealcoatingPackages() {
    const packages = this._getFromStorage('service_packages');
    if (packages.some((p) => p && p.package_type === 'sealcoating')) {
      return;
    }

    const categories = this._getFromStorage('service_categories');
    const sealCategory = categories.find((c) => c && c.code === 'sealcoating') || null;
    const categoryId = sealCategory ? sealCategory.id : null;

    const id = this._generateId('sp');
    const now = new Date().toISOString();

    const defaultPackage = {
      id,
      name: 'Standard Commercial Sealcoating Package',
      package_type: 'sealcoating',
      categoryId,
      primary_customer_type: 'commercial',
      description: 'Standard commercial sealcoating package with 3-year warranty.',
      features: ['sealcoating'],
      includes_crack_sealing: false,
      includes_pothole_patching: false,
      includes_line_striping: false,
      includes_snow_removal: false,
      price_total: null,
      price_per_sq_ft: 0.2,
      price_unit: 'per_sq_ft',
      warranty_years: 3,
      is_active: true,
      created_at: now
    };

    packages.push(defaultPackage);
    this._saveToStorage('service_packages', packages);
  }

  // _applyMaintenancePlanFilters: filter MaintenancePlan list
  _applyMaintenancePlanFilters(plans, filters) {
    const {
      customer_type,
      min_lot_size_sq_ft,
      max_lot_size_sq_ft,
      includes_snow_removal,
      max_monthly_price
    } = filters || {};

    return plans.filter((plan) => {
      if (!plan.is_active) return false;

      if (customer_type && plan.customer_type !== customer_type && plan.customer_type !== 'both') {
        return false;
      }

      if (typeof includes_snow_removal === 'boolean') {
        if (plan.includes_snow_removal !== includes_snow_removal) return false;
      }

      if (typeof max_monthly_price === 'number' && plan.monthly_price > max_monthly_price) {
        return false;
      }

      if (typeof min_lot_size_sq_ft === 'number') {
        const maxCoverage = typeof plan.coverage_lot_size_max_sq_ft === 'number' ? plan.coverage_lot_size_max_sq_ft : Infinity;
        if (maxCoverage < min_lot_size_sq_ft) return false;
      }

      if (typeof max_lot_size_sq_ft === 'number') {
        const minCoverage = typeof plan.coverage_lot_size_min_sq_ft === 'number' ? plan.coverage_lot_size_min_sq_ft : 0;
        if (minCoverage > max_lot_size_sq_ft) return false;
      }

      return true;
    });
  }

  // -------------------- Interface Implementations --------------------

  // getHomepageOverview
  getHomepageOverview() {
    const serviceCategories = this._getFromStorage('service_categories').filter((c) => c.is_active);
    const serviceTypesRaw = this._getFromStorage('service_types');
    const maintenancePlans = this._getFromStorage('maintenance_plans').filter((p) => p.is_active);
    const businessInfos = this._getFromStorage('business_infos');
    const emergencyInfo = businessInfos[0] || null;

    const categoriesById = {};
    for (const c of serviceCategories) {
      categoriesById[c.id] = c;
    }

    // Choose a few featured service types
    const featuredRaw = serviceTypesRaw.slice(0, 5);
    const featured_service_types = featuredRaw.map((st) => ({
      ...st,
      category: categoriesById[st.categoryId] || null
    }));

    const maintenance_plans_preview = maintenancePlans.slice(0, 3);

    return {
      hero_heading: 'Asphalt Paving & Parking Lot Services',
      hero_subheading: 'Professional paving, repairs, sealcoating, and maintenance for commercial and residential properties.',
      core_service_categories: serviceCategories.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        description: c.description || '',
        is_active: !!c.is_active
      })),
      featured_service_types,
      emergency_highlight: emergencyInfo
        ? {
            emergency_phone: emergencyInfo.emergency_phone,
            emergency_description: emergencyInfo.emergency_description || ''
          }
        : {
            emergency_phone: '',
            emergency_description: ''
          },
      maintenance_plans_preview
    };
  }

  // getServiceCategoriesOverview
  getServiceCategoriesOverview() {
    const categories = this._getFromStorage('service_categories');
    return categories;
  }

  // getCommercialRepairOverview
  getCommercialRepairOverview() {
    const categories = this._getFromStorage('service_categories');
    const serviceTypes = this._getFromStorage('service_types');

    const repairCategory = categories.find((c) => c.code === 'commercial_repair') || null;
    const available_service_types_raw = repairCategory
      ? serviceTypes.filter((st) => st.categoryId === repairCategory.id)
      : serviceTypes.filter((st) => st.code === 'parking_lot_repair' || st.code === 'crack_sealing' || st.code === 'pothole_patching');

    const categoriesById = {};
    for (const c of categories) {
      categoriesById[c.id] = c;
    }

    const available_service_types = available_service_types_raw.map((st) => ({
      ...st,
      category: categoriesById[st.categoryId] || null
    }));

    return {
      intro_heading: 'Commercial Asphalt & Parking Lot Repair',
      intro_body:
        'Restore safety, extend pavement life, and protect your investment with professional crack sealing, pothole patching, and surface repairs.',
      benefit_bullets: [
        'Minimize liability from trip hazards and potholes',
        'Extend the life of your parking lot with proactive maintenance',
        'Reduce downtime with efficient scheduling around your business hours'
      ],
      available_service_types
    };
  }

  // getRepairPackageFilters
  getRepairPackageFilters() {
    const packages = this._getFromStorage('service_packages').filter((p) => p.package_type === 'repair');
    let min = Infinity;
    let max = 0;
    for (const p of packages) {
      if (typeof p.price_total === 'number') {
        if (p.price_total < min) min = p.price_total;
        if (p.price_total > max) max = p.price_total;
      }
    }
    if (!isFinite(min)) min = 0;
    if (max === 0) max = 10000;

    return {
      price_total_range: {
        min,
        max,
        step: 100,
        default_max: max
      },
      customer_types: [
        { value: 'commercial', label: 'Commercial' },
        { value: 'residential', label: 'Residential' },
        { value: 'both', label: 'Both' }
      ],
      feature_filters: {
        includes_crack_sealing_label: 'Includes crack sealing',
        includes_pothole_patching_label: 'Includes pothole patching'
      },
      default_filters: {
        primary_customer_type: 'commercial',
        max_price_total: max
      }
    };
  }

  // getRepairPackages
  getRepairPackages(primary_customer_type, max_price_total, include_crack_sealing, include_pothole_patching) {
    const categories = this._getFromStorage('service_categories');
    const allPackages = this._getFromStorage('service_packages');

    const repairCategory = categories.find((c) => c.code === 'commercial_repair') || null;
    let repairPackages = allPackages.filter((p) => p.package_type === 'repair');
    if (repairCategory) {
      repairPackages = repairPackages.filter((p) => p.categoryId === repairCategory.id);
    }

    const filtered = this._applyServicePackageFilters(repairPackages, {
      primary_customer_type,
      max_price_total,
      include_crack_sealing,
      include_pothole_patching
    });

    const categoriesById = {};
    for (const c of categories) {
      categoriesById[c.id] = c;
    }

    return filtered.map((pkg) => ({
      package: pkg,
      category: categoriesById[pkg.categoryId] || null
    }));
  }

  // getSealcoatingOverview
  getSealcoatingOverview() {
    return {
      intro_heading: 'Professional Asphalt Sealcoating',
      intro_body:
        'Sealcoating protects your asphalt from UV rays, water intrusion, and chemicals, helping your pavement look great and last longer.',
      recommended_cycle_years: 3,
      benefit_bullets: [
        'Extend pavement life and delay costly replacement',
        'Improve curb appeal with a rich, dark finish',
        'Protect against oxidation, moisture, and oil spills'
      ]
    };
  }

  // getSealcoatingPackageFilters
  getSealcoatingPackageFilters() {
    this._ensureSealcoatingPackages();
    const packages = this._getFromStorage('service_packages').filter((p) => p.package_type === 'sealcoating');

    let minPrice = Infinity;
    let maxPrice = 0;
    let minWarranty = Infinity;
    let maxWarranty = 0;

    for (const p of packages) {
      if (typeof p.price_per_sq_ft === 'number') {
        if (p.price_per_sq_ft < minPrice) minPrice = p.price_per_sq_ft;
        if (p.price_per_sq_ft > maxPrice) maxPrice = p.price_per_sq_ft;
      }
      if (typeof p.warranty_years === 'number') {
        if (p.warranty_years < minWarranty) minWarranty = p.warranty_years;
        if (p.warranty_years > maxWarranty) maxWarranty = p.warranty_years;
      }
    }

    if (!isFinite(minPrice)) minPrice = 0;
    if (maxPrice === 0) maxPrice = 1;
    if (!isFinite(minWarranty)) minWarranty = 1;
    if (maxWarranty === 0) maxWarranty = 5;

    return {
      price_per_sq_ft_range: {
        min: minPrice,
        max: maxPrice,
        step: 0.01,
        default_max: maxPrice
      },
      warranty_years_range: {
        min: minWarranty,
        max: maxWarranty,
        step: 1,
        default_min: minWarranty
      },
      customer_types: [
        { value: 'commercial', label: 'Commercial' },
        { value: 'residential', label: 'Residential' },
        { value: 'both', label: 'Both' }
      ]
    };
  }

  // getSealcoatingPackages
  getSealcoatingPackages(max_price_per_sq_ft, min_warranty_years, primary_customer_type) {
    this._ensureSealcoatingPackages();
    const categories = this._getFromStorage('service_categories');
    const allPackages = this._getFromStorage('service_packages');

    const sealCategory = categories.find((c) => c.code === 'sealcoating') || null;
    let sealPackages = allPackages.filter((p) => p.package_type === 'sealcoating');
    if (sealCategory) {
      sealPackages = sealPackages.filter((p) => p.categoryId === sealCategory.id);
    }

    const filtered = this._applyServicePackageFilters(sealPackages, {
      primary_customer_type,
      max_price_per_sq_ft,
      min_warranty_years
    });

    const categoriesById = {};
    for (const c of categories) {
      categoriesById[c.id] = c;
    }

    return filtered.map((pkg) => ({
      package: pkg,
      category: categoriesById[pkg.categoryId] || null
    }));
  }

  // getMaintenancePlansOverview
  getMaintenancePlansOverview() {
    return {
      intro_heading: 'Parking Lot Maintenance Plans',
      intro_body:
        'Keep your parking lot safe, clean, and looking its best year-round with a structured maintenance plan tailored to your property.',
      benefit_bullets: [
        'Proactive repairs that reduce long-term capital costs',
        'Flexible options including snow removal and sweeping',
        'Predictable monthly budgeting for property managers'
      ]
    };
  }

  // getMaintenancePlanFilters
  getMaintenancePlanFilters() {
    const plans = this._getFromStorage('maintenance_plans');

    let minPrice = Infinity;
    let maxPrice = 0;
    for (const p of plans) {
      if (typeof p.monthly_price === 'number') {
        if (p.monthly_price < minPrice) minPrice = p.monthly_price;
        if (p.monthly_price > maxPrice) maxPrice = p.monthly_price;
      }
    }
    if (!isFinite(minPrice)) minPrice = 0;
    if (maxPrice === 0) maxPrice = 2000;

    // Generic lot size ranges (independent of data, for UI convenience)
    const lot_size_ranges = [
      { id: 'small', label: 'Up to 10,000 sq ft', min_sq_ft: 0, max_sq_ft: 10000 },
      { id: 'medium', label: '10,001–30,000 sq ft', min_sq_ft: 10001, max_sq_ft: 30000 },
      { id: 'large', label: '30,001–60,000 sq ft', min_sq_ft: 30001, max_sq_ft: 60000 },
      { id: 'xl', label: '60,001+ sq ft', min_sq_ft: 60001, max_sq_ft: 9999999 }
    ];

    const feature_options = [
      {
        code: 'snow_removal',
        label: 'Includes snow removal',
        description: 'Show only plans that include snow plowing and de-icing.'
      },
      {
        code: 'general_maintenance',
        label: 'General maintenance',
        description: 'Sweeping, inspections, and minor repairs.'
      }
    ];

    return {
      customer_types: [
        { value: 'commercial', label: 'Commercial' },
        { value: 'residential', label: 'Residential' },
        { value: 'both', label: 'Both' }
      ],
      lot_size_ranges,
      feature_options,
      price_ceiling: {
        min: minPrice,
        max: maxPrice,
        step: 50,
        default_max: maxPrice
      }
    };
  }

  // getMaintenancePlans
  getMaintenancePlans(customer_type, min_lot_size_sq_ft, max_lot_size_sq_ft, includes_snow_removal, max_monthly_price) {
    const plans = this._getFromStorage('maintenance_plans');
    const filtered = this._applyMaintenancePlanFilters(plans, {
      customer_type,
      min_lot_size_sq_ft,
      max_lot_size_sq_ft,
      includes_snow_removal,
      max_monthly_price
    });
    return filtered;
  }

  // enrollInMaintenancePlan
  enrollInMaintenancePlan(maintenancePlanId, company_name, contact_name, contact_email, contact_phone, billing_frequency, billing_start_date) {
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find((p) => p.id === maintenancePlanId && p.is_active);
    if (!plan) {
      return {
        success: false,
        message: 'Selected maintenance plan not found or inactive.',
        enrollment: null
      };
    }

    const enrollments = this._getFromStorage('maintenance_plan_enrollments');
    const id = this._generateId('mpe');
    const now = new Date().toISOString();

    const enrollment = {
      id,
      created_at: now,
      maintenancePlanId,
      company_name,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      billing_frequency,
      billing_start_date: billing_start_date || null,
      status: 'submitted'
    };

    enrollments.push(enrollment);
    this._saveToStorage('maintenance_plan_enrollments', enrollments);

    return {
      success: true,
      message: 'Maintenance plan enrollment submitted.',
      enrollment
    };
  }

  // getQuoteFormConfig
  getQuoteFormConfig(context, project_category, locationId) {
    const project_types = [
      { value: 'commercial', label: 'Commercial' },
      { value: 'residential', label: 'Residential' }
    ];

    const project_categories = [
      { value: 'parking_lot', label: 'Parking lot' },
      { value: 'driveway', label: 'Driveway' },
      { value: 'roadway', label: 'Roadway' },
      { value: 'other', label: 'Other' }
    ];

    const parking_lot_size_options = this._getFromStorage('parking_lot_size_options');
    const serviceTypes = this._getFromStorage('service_types');
    const categories = this._getFromStorage('service_categories');

    const categoriesById = {};
    for (const c of categories) {
      categoriesById[c.id] = c;
    }

    const service_options = serviceTypes.map((st) => ({
      ...st,
      category: categoriesById[st.categoryId] || null
    }));

    const overlay_thickness_options = [
      { value_inches: 1.5, label: '1.5 inches' },
      { value_inches: 2, label: '2 inches' },
      { value_inches: 3, label: '3 inches' }
    ];

    const asphalt_depth_options = [
      { value_inches: 2, label: '2 inches' },
      { value_inches: 3, label: '3 inches' },
      { value_inches: 4, label: '4 inches' }
    ];

    const budget_presets = [
      { label: 'Up to $5,000', value: 5000 },
      { label: 'Up to $10,000', value: 10000 },
      { label: 'Up to $15,000', value: 15000 },
      { label: 'Up to $25,000', value: 25000 }
    ];

    const today = new Date();
    const min_date = today.toISOString().split('T')[0];
    const maxDateObj = new Date();
    maxDateObj.setMonth(maxDateObj.getMonth() + 6);
    const max_date = maxDateObj.toISOString().split('T')[0];

    const contact_requirements = {
      email_required: true,
      phone_required: false
    };

    let location = null;
    let note = '';
    if (locationId) {
      location = this._getEntityById('locations', locationId);
      if (location) {
        note = 'Quote will be routed to the ' + location.name + ' branch.';
      }
    }

    return {
      project_types,
      project_categories,
      parking_lot_size_options,
      service_options,
      overlay_thickness_options,
      asphalt_depth_options,
      budget_presets,
      preferred_start_date_constraints: {
        min_date,
        max_date
      },
      contact_requirements,
      location_context: {
        location,
        note
      }
    };
  }

  // submitQuoteRequest
  submitQuoteRequest(
    source,
    project_type,
    project_category,
    parkingLotSizeOptionId,
    parking_lot_spaces_estimate,
    selected_services,
    overlay_thickness_inches,
    asphalt_depth_inches,
    maximum_budget,
    preferred_start_date,
    contact_email,
    contact_phone,
    contact_name,
    company_name,
    project_address,
    project_city,
    project_state,
    project_zip,
    locationId,
    project_description
  ) {
    const quoteRequests = this._getFromStorage('quote_requests');
    const id = this._generateId('qr');
    const now = new Date().toISOString();

    const quoteRequest = {
      id,
      created_at: now,
      source,
      project_type,
      project_category,
      parkingLotSizeOptionId: parkingLotSizeOptionId || null,
      parking_lot_spaces_estimate: typeof parking_lot_spaces_estimate === 'number' ? parking_lot_spaces_estimate : null,
      selected_services: Array.isArray(selected_services) ? selected_services : [],
      overlay_thickness_inches: typeof overlay_thickness_inches === 'number' ? overlay_thickness_inches : null,
      asphalt_depth_inches: typeof asphalt_depth_inches === 'number' ? asphalt_depth_inches : null,
      maximum_budget: typeof maximum_budget === 'number' ? maximum_budget : null,
      preferred_start_date: preferred_start_date || null,
      contact_email,
      contact_phone: contact_phone || null,
      contact_name: contact_name || null,
      company_name: company_name || null,
      project_address: project_address || null,
      project_city: project_city || null,
      project_state: project_state || null,
      project_zip: project_zip || null,
      locationId: locationId || null,
      project_description: project_description || null,
      status: 'submitted'
    };

    quoteRequests.push(quoteRequest);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      message: 'Quote request submitted.',
      quoteRequest
    };
  }

  // getServicePackageDetail
  getServicePackageDetail(packageId) {
    const packages = this._getFromStorage('service_packages');
    const categories = this._getFromStorage('service_categories');
    const serviceTypes = this._getFromStorage('service_types');

    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return {
        package: null,
        category: null,
        included_service_types: []
      };
    }

    const category = categories.find((c) => c.id === pkg.categoryId) || null;

    let included_service_types = [];
    if (Array.isArray(pkg.features) && pkg.features.length > 0) {
      const categoriesById = {};
      for (const c of categories) {
        categoriesById[c.id] = c;
      }
      included_service_types = serviceTypes
        .filter((st) => pkg.features.indexOf(st.code) !== -1)
        .map((st) => ({
          ...st,
          category: categoriesById[st.categoryId] || null
        }));
    }

    return {
      package: pkg,
      category,
      included_service_types
    };
  }

  // submitPackageRequest
  submitPackageRequest(packageId, source, project_description, contact_name, contact_email, contact_phone) {
    const packages = this._getFromStorage('service_packages');
    const pkg = packages.find((p) => p.id === packageId) || null;

    if (!pkg) {
      return {
        success: false,
        message: 'Selected package not found.',
        packageRequest: null
      };
    }

    const requests = this._getFromStorage('package_requests');
    const id = this._generateId('pr');
    const now = new Date().toISOString();

    const packageRequest = {
      id,
      created_at: now,
      source,
      packageId,
      project_description: project_description || null,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      status: 'submitted'
    };

    requests.push(packageRequest);
    this._saveToStorage('package_requests', requests);

    return {
      success: true,
      message: 'Package request submitted.',
      packageRequest
    };
  }

  // getSchedulingConfig
  getSchedulingConfig() {
    const customer_types = [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' }
    ];

    const service_types = [
      {
        value: 'driveway_installation',
        label: 'New asphalt driveway installation',
        allowed_customer_types: ['residential']
      },
      {
        value: 'parking_lot_repair',
        label: 'Parking lot repair',
        allowed_customer_types: ['commercial']
      },
      {
        value: 'sealcoating',
        label: 'Sealcoating',
        allowed_customer_types: ['residential', 'commercial']
      },
      {
        value: 'maintenance',
        label: 'Ongoing maintenance',
        allowed_customer_types: ['commercial']
      },
      {
        value: 'other',
        label: 'Other service',
        allowed_customer_types: ['residential', 'commercial']
      }
    ];

    return {
      customer_types,
      service_types,
      default_appointment_duration_minutes: 60,
      booking_window_days: 60
    };
  }

  // getAvailabilitySlots
  getAvailabilitySlots(customer_type, service_type, start_date, end_date) {
    const slots = this._getFromStorage('availability_slots');

    const start = start_date ? this._parseDate(start_date) : null;
    const end = end_date ? this._parseDate(end_date) : null;

    return slots.filter((slot) => {
      if (slot.is_booked) return false;

      if (
        slot.customer_type !== 'both' &&
        slot.customer_type !== customer_type
      ) {
        return false;
      }

      if (service_type && slot.service_type && slot.service_type !== service_type) {
        return false;
      }

      const slotStart = this._parseDate(slot.start_datetime);
      if (!slotStart) return false;

      if (start && slotStart < start) return false;
      if (end && slotStart > end) return false;

      return true;
    });
  }

  // bookServiceAppointment
  bookServiceAppointment(
    customer_type,
    service_type,
    timeSlotId,
    contact_name,
    contact_phone,
    contact_email,
    address_line1,
    address_line2,
    city,
    state,
    zip
  ) {
    const slots = this._getFromStorage('availability_slots');
    const slot = slots.find((s) => s.id === timeSlotId) || null;

    if (!slot) {
      return {
        success: false,
        message: 'Selected time slot not found.',
        appointment: null
      };
    }

    if (slot.is_booked) {
      return {
        success: false,
        message: 'Selected time slot is already booked.',
        appointment: null
      };
    }

    if (
      slot.customer_type !== 'both' &&
      slot.customer_type !== customer_type
    ) {
      return {
        success: false,
        message: 'Selected time slot is not available for this customer type.',
        appointment: null
      };
    }

    // Mark slot as booked
    this._markAvailabilitySlotBooked(timeSlotId);

    const appointments = this._getFromStorage('service_appointments');
    const id = this._generateId('appt');
    const now = new Date().toISOString();

    const appointment = {
      id,
      created_at: now,
      customer_type,
      service_type,
      start_datetime: slot.start_datetime,
      timeSlotId,
      contact_name,
      contact_phone,
      contact_email: contact_email || null,
      address_line1,
      address_line2: address_line2 || null,
      city,
      state: state || null,
      zip: zip || null,
      status: 'scheduled'
    };

    appointments.push(appointment);
    this._saveToStorage('service_appointments', appointments);

    return {
      success: true,
      message: 'Service appointment scheduled.',
      appointment
    };
  }

  // getEstimatorConfig
  getEstimatorConfig() {
    const project_types = [
      { value: 'parking_lot', label: 'Parking lot' },
      { value: 'driveway', label: 'Driveway' },
      { value: 'roadway', label: 'Roadway' },
      { value: 'other', label: 'Other' }
    ];

    const service_types = [
      { value: 'mill_and_pave', label: 'Mill & pave' },
      { value: 'overlay', label: 'Asphalt overlay' },
      { value: 'sealcoating', label: 'Sealcoating' },
      { value: 'other', label: 'Other' }
    ];

    const depth_options_inches = [1.5, 2, 3, 4];

    const add_on_options = [
      {
        code: 'line_striping',
        label: 'Line striping',
        description: 'Layout and painting of parking lot lines and markings.'
      }
    ];

    return {
      project_types,
      service_types,
      depth_options_inches,
      add_on_options,
      default_zip: '00000',
      area_constraints: {
        min_area_sq_ft: 100,
        max_area_sq_ft: 200000
      }
    };
  }

  // calculateEstimate
  calculateEstimate(project_type, length_feet, width_feet, service_type, asphalt_depth_inches, add_ons, zip) {
    const area_sq_ft = (Number(length_feet) || 0) * (Number(width_feet) || 0);

    // Basic unit pricing logic (purely algorithmic, not persisted)
    let baseUnitPrice = 2; // default per sq ft
    if (service_type === 'mill_and_pave') {
      baseUnitPrice = 4 + 0.5 * (asphalt_depth_inches || 0); // e.g., 3" ~ $5.5/sq ft
    } else if (service_type === 'overlay') {
      baseUnitPrice = 2.5 + 0.3 * (asphalt_depth_inches || 0);
    } else if (service_type === 'sealcoating') {
      baseUnitPrice = 0.15;
    }

    const base_cost = area_sq_ft * baseUnitPrice;

    let add_ons_total = 0;
    const addOnsArray = Array.isArray(add_ons) ? add_ons : [];
    if (addOnsArray.indexOf('line_striping') !== -1) {
      // simple rule: $0.20 per sq ft for striping impact
      add_ons_total += area_sq_ft * 0.2;
    }

    const estimated_cost = base_cost + add_ons_total;

    const estimateSessionId = this._getOrCreateEstimateSession({
      project_type,
      length_feet: Number(length_feet) || 0,
      width_feet: Number(width_feet) || 0,
      area_sq_ft,
      service_type,
      asphalt_depth_inches: Number(asphalt_depth_inches) || 0,
      add_ons: addOnsArray,
      zip: zip || null,
      estimated_cost
    });

    return {
      estimateSessionId,
      area_sq_ft,
      estimated_cost,
      breakdown: {
        base_cost,
        add_ons_total,
        unit_price_per_sq_ft: baseUnitPrice
      }
    };
  }

  // getLocationSearchConfig
  getLocationSearchConfig() {
    return {
      default_radius_miles: 25,
      radius_options: [
        { value: 10, label: '10 miles' },
        { value: 25, label: '25 miles' },
        { value: 50, label: '50 miles' }
      ],
      supported_states: []
    };
  }

  // searchLocationsByZip
  searchLocationsByZip(zip, radius_miles) {
    const locations = this._getFromStorage('locations');
    const config = this.getLocationSearchConfig();
    const radius = typeof radius_miles === 'number' ? radius_miles : config.default_radius_miles;

    // Instrumentation for task completion tracking (task_6)
    try {
      const isTargetZip = String(zip) === '30309';
      const isRadiusNullish = radius_miles === undefined || radius_miles === null;
      const isRadiusSmall = typeof radius_miles === 'number' && radius_miles <= 25;
      if (isTargetZip && (isRadiusNullish || isRadiusSmall)) {
        localStorage.setItem('task6_searchBy30309Performed', 'true');
      }
    } catch (e) {}

    const updatedLocations = [];

    for (const loc of locations) {
      let distance;
      if (loc.zip === zip) {
        distance = 0;
      } else if (typeof loc.distance_from_search_zip === 'number') {
        distance = loc.distance_from_search_zip;
      } else if (typeof loc.coverage_radius_miles === 'number') {
        // If coverage radius exists, treat distance as that radius (approximate)
        distance = loc.coverage_radius_miles;
      } else {
        // Fallback: approximate using zip code numeric difference (crude but deterministic)
        const zipNum = parseInt(String(zip), 10);
        const locZipNum = parseInt(String(loc.zip || '0'), 10);
        if (!isNaN(zipNum) && !isNaN(locZipNum)) {
          distance = Math.abs(zipNum - locZipNum) / 100; // arbitrary scaling
        } else {
          distance = Infinity;
        }
      }

      const updatedLoc = { ...loc, distance_from_search_zip: distance };
      updatedLocations.push(updatedLoc);
    }

    // Persist updated distances
    this._saveToStorage('locations', updatedLocations);

    const filtered = updatedLocations.filter((loc) => loc.distance_from_search_zip <= radius);

    return {
      search_zip: zip,
      radius_miles: radius,
      locations: filtered
    };
  }

  // getLocationDetail
  getLocationDetail(locationId) {
    const locations = this._getFromStorage('locations');
    return locations.find((l) => l.id === locationId) || null;
  }

  // getBlogSearchConfig
  getBlogSearchConfig() {
    const now = new Date();
    const to_date = now.toISOString().split('T')[0];

    const from12 = new Date();
    from12.setMonth(from12.getMonth() - 12);
    const from_12_months = from12.toISOString().split('T')[0];

    const from24 = new Date();
    from24.setMonth(from24.getMonth() - 24);
    const from_24_months = from24.toISOString().split('T')[0];

    const date_filter_presets = [
      {
        id: 'last_12_months',
        label: 'Last 12 months',
        from_date: from_12_months,
        to_date
      },
      {
        id: 'last_24_months',
        label: 'Last 24 months',
        from_date: from_24_months,
        to_date
      }
    ];

    const categories = [
      { value: 'blog', label: 'Blog' },
      { value: 'resource', label: 'Resources' },
      { value: 'checklist', label: 'Checklists' },
      { value: 'news', label: 'News' }
    ];

    const tag_suggestions = [
      { value: 'winter asphalt', label: 'Winter asphalt' },
      { value: 'checklist', label: 'Checklist' },
      { value: 'maintenance', label: 'Maintenance' }
    ];

    return {
      categories,
      date_filter_presets,
      tag_suggestions
    };
  }

  // searchBlogPosts
  searchBlogPosts(query, category, from_date, to_date, tags) {
    const posts = this._getFromStorage('blog_posts');
    const q = (query || '').toLowerCase();
    const tagsArray = Array.isArray(tags) ? tags : [];

    const from = from_date ? this._parseDate(from_date) : null;
    const to = to_date ? this._parseDate(to_date) : null;

    return posts.filter((post) => {
      if (!post.is_published) return false;

      if (category && post.category !== category) return false;

      if (from || to) {
        const pub = this._parseDate(post.published_at);
        if (!pub) return false;
        if (from && pub < from) return false;
        if (to && pub > to) return false;
      }

      if (q) {
        const haystack = (
          (post.title || '') +
          ' ' +
          (post.summary || '') +
          ' ' +
          (post.content || '')
        ).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }

      if (tagsArray.length > 0) {
        const postTags = Array.isArray(post.tags) ? post.tags : [];
        const lowerTags = postTags.map((t) => String(t).toLowerCase());
        for (const t of tagsArray) {
          if (lowerTags.indexOf(String(t).toLowerCase()) === -1) {
            return false;
          }
        }
      }

      return true;
    });
  }

  // getBlogPostDetail
  getBlogPostDetail(postId) {
    const posts = this._getFromStorage('blog_posts');
    const post = posts.find((p) => p.id === postId) || null;

    // Instrumentation for task completion tracking (task_8)
    try {
      if (post) {
        const existingRaw = localStorage.getItem('task8_viewedBlogPostIds');
        let viewedIds;
        try {
          viewedIds = existingRaw ? JSON.parse(existingRaw) : [];
        } catch (e) {
          viewedIds = [];
        }
        if (!Array.isArray(viewedIds)) {
          viewedIds = [];
        }
        if (viewedIds.indexOf(postId) === -1) {
          viewedIds.push(postId);
          localStorage.setItem('task8_viewedBlogPostIds', JSON.stringify(viewedIds));
        }
      }
    } catch (e) {}

    return post;
  }

  // getContactPageInfo
  getContactPageInfo() {
    const businessInfos = this._getFromStorage('business_infos');
    const business_info = businessInfos[0] || null;

    const contact_form_config = {
      subject_suggestions: [
        'Quote request',
        'Service question',
        'Billing',
        'Other'
      ],
      message_min_length: 10
    };

    const emergency_section = business_info
      ? {
          emergency_phone: business_info.emergency_phone,
          emergency_description: business_info.emergency_description || '',
          instructions: 'For urgent safety issues, call the 24/7 emergency number first, then submit this form.'
        }
      : {
          emergency_phone: '',
          emergency_description: '',
          instructions: 'Emergency contact information is not configured.'
        };

    return {
      business_info,
      contact_form_config,
      emergency_section
    };
  }

  // submitContactMessage
  submitContactMessage(source, name, email, subject, message, related_url) {
    const config = this.getContactPageInfo();
    const minLen = (config.contact_form_config && config.contact_form_config.message_min_length) || 0;

    if (!message || message.length < minLen) {
      return {
        success: false,
        message: 'Message is too short.',
        contactMessage: null
      };
    }

    const messages = this._getFromStorage('contact_messages');
    const id = this._generateId('cm');
    const now = new Date().toISOString();

    const contactMessage = {
      id,
      created_at: now,
      source,
      name: name || null,
      email: email || null,
      subject: subject || null,
      message,
      related_url: related_url || null,
      status: 'submitted'
    };

    messages.push(contactMessage);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Contact message submitted.',
      contactMessage
    };
  }

  // submitEmergencyRequest
  submitEmergencyRequest(name, email, subject, message) {
    const requests = this._getFromStorage('emergency_requests');
    const id = this._generateId('er');
    const now = new Date().toISOString();

    const included_emergency_phone = this._detectEmergencyPhoneInMessage(message);

    const emergencyRequest = {
      id,
      created_at: now,
      name,
      email,
      subject,
      message,
      included_emergency_phone,
      status: 'submitted'
    };

    requests.push(emergencyRequest);
    this._saveToStorage('emergency_requests', requests);

    return {
      success: true,
      message: 'Emergency request submitted.',
      emergencyRequest
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return {
      company_history:
        'Founded by paving professionals, our company has focused exclusively on asphalt paving, repairs, and maintenance for years, serving commercial and residential customers across the region.',
      mission_statement:
        'Our mission is to deliver safe, long-lasting pavement solutions with clear communication, dependable scheduling, and uncompromising workmanship.',
      experience_summary:
        'Our team brings decades of combined experience in asphalt paving, parking lot design, maintenance planning, and winter operations.',
      certifications_and_insurance:
        'We maintain full liability insurance and workers’ compensation coverage, and our crews are trained in industry best practices and safety standards.',
      safety_practices:
        'We follow strict traffic control plans, PPE requirements, and site-specific safety checks on every job.',
      team_members: []
    };
  }

  // getFaqEntries
  getFaqEntries(category) {
    const faqs = this._getFromStorage('faq_entries');
    if (!category) return faqs;
    return faqs.filter((f) => f.category === category);
  }

  // getLegalContent
  getLegalContent(document) {
    const legal = this._getFromStorage('legal_contents');
    const entry = legal.find((d) => d.document === document) || null;

    if (!entry) {
      return {
        document,
        title: document === 'privacy_policy' ? 'Privacy Policy' : document === 'terms_of_use' ? 'Terms of Use' : 'Legal Document',
        content_html: '<p>Legal content has not been configured yet.</p>',
        last_updated: this._todayISODate()
      };
    }

    return entry;
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