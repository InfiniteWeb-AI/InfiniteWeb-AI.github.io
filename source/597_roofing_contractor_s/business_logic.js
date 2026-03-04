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

  // -------------------- Storage & ID helpers --------------------

  _initStorage() {
    const arrayKeys = [
      'site_pages',
      'navigation_links',
      'services',
      'roofing_materials',
      'preferred_material_selections',
      'project_quote_requests',
      'inspection_slots',
      'inspection_appointments',
      'financing_term_options',
      'financing_estimates',
      'financing_applications',
      'emergency_repair_requests',
      'reviews',
      'saved_reviews',
      'faq_articles',
      'insurance_assistance_requests',
      'maintenance_addons',
      'maintenance_plan_configurations',
      'promotions'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Optional object-based content; do not pre-populate domain data
    if (!localStorage.getItem('home_page_content')) {
      // Leave unset; getter will fall back to empty strings/arrays
    }

    if (!localStorage.getItem('anonymous_user_context')) {
      // Will be created lazily when needed
    }

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

  // -------------------- Internal helpers --------------------

  _getOrCreateAnonymousUserContext() {
    let ctx = this._getFromStorage('anonymous_user_context', null);
    if (!ctx || typeof ctx !== 'object') {
      ctx = {
        id: 'anon_' + this._getNextIdCounter(),
        createdAt: new Date().toISOString()
      };
      this._saveToStorage('anonymous_user_context', ctx);
    }
    return ctx;
  }

  _calculateMonthlyPayment(projectCost, termOption) {
    const n = termOption.term_months;
    if (!n || n <= 0) {
      return {
        monthlyPayment: projectCost,
        totalPayment: projectCost,
        totalInterest: 0
      };
    }
    const apr = typeof termOption.apr_percentage === 'number' ? termOption.apr_percentage : 0;
    const monthlyRate = apr > 0 ? (apr / 100) / 12 : 0;

    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = projectCost / n;
    } else {
      const factor = Math.pow(1 + monthlyRate, -n);
      monthlyPayment = projectCost * (monthlyRate / (1 - factor));
    }

    const totalPayment = monthlyPayment * n;
    const totalInterest = totalPayment - projectCost;

    const round2 = (v) => Math.round(v * 100) / 100;

    return {
      monthlyPayment: round2(monthlyPayment),
      totalPayment: round2(totalPayment),
      totalInterest: round2(totalInterest)
    };
  }

  _linkMaintenancePlanToQuote(configurationId, quoteId) {
    if (!configurationId || !quoteId) return;
    const configs = this._getFromStorage('maintenance_plan_configurations', []);
    const idx = configs.findIndex((c) => c.id === configurationId);
    if (idx === -1) return;
    const config = configs[idx];
    config.included_in_quote_request_id = quoteId;
    configs[idx] = config;
    this._saveToStorage('maintenance_plan_configurations', configs);
  }

  _reserveInspectionSlot(inspectionSlotId) {
    const slots = this._getFromStorage('inspection_slots', []);
    const idx = slots.findIndex((s) => s.id === inspectionSlotId);
    if (idx === -1) {
      return { success: false, message: 'Inspection slot not found.' };
    }
    const slot = slots[idx];
    if (!slot.available) {
      return { success: false, message: 'Inspection slot is not available.' };
    }
    const max = typeof slot.max_appointments === 'number' && slot.max_appointments > 0 ? slot.max_appointments : 1;
    const booked = typeof slot.booked_appointments === 'number' ? slot.booked_appointments : 0;
    if (booked >= max) {
      slot.available = false;
      slots[idx] = slot;
      this._saveToStorage('inspection_slots', slots);
      return { success: false, message: 'Inspection slot is fully booked.' };
    }
    slot.booked_appointments = booked + 1;
    if (slot.booked_appointments >= max) {
      slot.available = false;
    }
    slots[idx] = slot;
    this._saveToStorage('inspection_slots', slots);
    return { success: true, slot: slot };
  }

  _parseISODate(dateString) {
    if (!dateString) return null;
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
  }

  _startOfDay(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  _endOfDay(date) {
    const d = new Date(date.getTime());
    d.setHours(23, 59, 59, 999);
    return d;
  }

  _getWeekRangeFromStart(startIsoDate) {
    let start;
    if (startIsoDate) {
      const parsed = this._parseISODate(startIsoDate);
      start = parsed ? this._startOfDay(parsed) : this._startOfDay(new Date());
    } else {
      const today = new Date();
      const day = today.getDay(); // 0=Sun
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(today.getTime());
      monday.setDate(today.getDate() + diffToMonday);
      start = this._startOfDay(monday);
    }
    const end = new Date(start.getTime());
    end.setDate(start.getDate() + 7);
    return { start, end };
  }

  // -------------------- Interfaces --------------------
  // 1) getHomePageContent

  getHomePageContent() {
    const homeContent = this._getFromStorage('home_page_content', null);
    const services = this._getFromStorage('services', []);
    const pages = this._getFromStorage('site_pages', []);

    const activeServices = services.filter((s) => s.is_active);
    const featuredServices = activeServices.map((s) => ({
      ...s,
      page: s.page_id ? (pages.find((p) => p.id === s.page_id) || null) : null
    }));

    const heroTitle = homeContent && homeContent.heroTitle ? homeContent.heroTitle : '';
    const heroSubtitle = homeContent && homeContent.heroSubtitle ? homeContent.heroSubtitle : '';
    const tagline = homeContent && homeContent.tagline ? homeContent.tagline : '';
    const highlightedMessages = homeContent && Array.isArray(homeContent.highlightedMessages)
      ? homeContent.highlightedMessages
      : [];

    return {
      heroTitle,
      heroSubtitle,
      tagline,
      featuredServices,
      highlightedMessages
    };
  }

  // 2) getServicesOverview

  getServicesOverview() {
    const services = this._getFromStorage('services', []);
    const pages = this._getFromStorage('site_pages', []);
    const activeServices = services.filter((s) => s.is_active);
    const resolved = activeServices.map((s) => ({
      ...s,
      page: s.page_id ? (pages.find((p) => p.id === s.page_id) || null) : null
    }));

    return {
      services: resolved
    };
  }

  // 3) getServiceDetail(serviceId)

  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services', []);
    const pages = this._getFromStorage('site_pages', []);
    const svc = services.find((s) => s.id === serviceId) || null;
    if (!svc) return null;
    return {
      ...svc,
      page: svc.page_id ? (pages.find((p) => p.id === svc.page_id) || null) : null
    };
  }

  // 4) getRoofingMaterialsList(onlyActive = true, materialTypes = undefined)

  getRoofingMaterialsList(onlyActive, materialTypes) {
    const materials = this._getFromStorage('roofing_materials', []);
    let filtered = materials;
    if (onlyActive === undefined || onlyActive === true) {
      filtered = filtered.filter((m) => m.status === 'active');
    }
    if (Array.isArray(materialTypes) && materialTypes.length > 0) {
      filtered = filtered.filter((m) => materialTypes.indexOf(m.material_type) !== -1);
    }
    return filtered;
  }

  // 5) getRoofingMaterialDetail(materialId)

  getRoofingMaterialDetail(materialId) {
    const materials = this._getFromStorage('roofing_materials', []);
    return materials.find((m) => m.id === materialId) || null;
  }

  // 6) selectPreferredRoofingMaterial(materialId, notes)

  selectPreferredRoofingMaterial(materialId, notes) {
    const materials = this._getFromStorage('roofing_materials', []);
    const material = materials.find((m) => m.id === materialId && m.status === 'active');
    if (!material) {
      return {
        selectionId: null,
        materialId: materialId,
        createdAt: null,
        success: false,
        message: 'Roofing material not found or inactive.'
      };
    }

    this._getOrCreateAnonymousUserContext();

    const selections = this._getFromStorage('preferred_material_selections', []);
    const selectionId = this._generateId('prefmat');
    const createdAt = new Date().toISOString();
    selections.push({
      id: selectionId,
      material_id: materialId,
      createdAt: createdAt,
      notes: notes || ''
    });
    this._saveToStorage('preferred_material_selections', selections);

    return {
      selectionId,
      materialId,
      createdAt,
      success: true,
      message: 'Preferred roofing material selected.'
    };
  }

  // 7) getEmergencyRepairPageContent

  getEmergencyRepairPageContent() {
    return {
      pageIntro: 'If your roof is leaking or has suffered sudden damage, our emergency team is available 24/7 to help prevent further damage to your home or business.',
      commonScenarios: [
        {
          title: 'Active leaks during heavy rain',
          description: 'Rapid response to locate the source of the leak and perform temporary or permanent repairs.'
        },
        {
          title: 'Storm or wind damage',
          description: 'Shingle blow-offs, fallen branches, and other storm-related roof emergencies.'
        },
        {
          title: 'Tree or debris impact',
          description: 'Emergency tarping and structural assessments after a tree or heavy debris impacts your roof.'
        }
      ],
      problemTypeOptions: [
        { code: 'active_leak', label: 'Active leak', description: 'Water is currently entering the property.' },
        { code: 'storm_damage', label: 'Storm or wind damage', description: 'Damage from hail, wind, or heavy rain.' },
        { code: 'tree_impact', label: 'Tree or debris impact', description: 'Tree or other object has struck the roof.' },
        { code: 'missing_shingles', label: 'Missing shingles', description: 'Sections of shingles are missing or displaced.' },
        { code: 'other', label: 'Other emergency issue', description: 'Any other urgent roof problem.' }
      ],
      urgencyOptions: [
        { code: 'within_24_hours', label: 'Within 24 hours', description: 'Highest priority emergency response.' },
        { code: 'within_48_hours', label: 'Within 48 hours', description: 'Urgent but slightly flexible scheduling.' },
        { code: 'this_week', label: 'This week', description: 'Important but not immediately critical.' },
        { code: 'flexible', label: 'Flexible', description: 'Schedule at the next convenient opening.' }
      ]
    };
  }

  // 8) submitEmergencyRepairRequest(problemType, urgency, name, phone, email, addressLine1, addressLine2, city, state, zipCode, preferredContactTimeWindow)

  submitEmergencyRepairRequest(problemType, urgency, name, phone, email, addressLine1, addressLine2, city, state, zipCode, preferredContactTimeWindow) {
    const allowedProblems = ['active_leak', 'storm_damage', 'tree_impact', 'missing_shingles', 'other'];
    const allowedUrgencies = ['within_24_hours', 'within_48_hours', 'this_week', 'flexible'];

    if (allowedProblems.indexOf(problemType) === -1) {
      return { requestId: null, status: null, createdAt: null, success: false, message: 'Invalid problem type.' };
    }
    if (allowedUrgencies.indexOf(urgency) === -1) {
      return { requestId: null, status: null, createdAt: null, success: false, message: 'Invalid urgency value.' };
    }
    if (!name || !phone || !addressLine1) {
      return { requestId: null, status: null, createdAt: null, success: false, message: 'Name, phone, and address are required.' };
    }

    const requests = this._getFromStorage('emergency_repair_requests', []);
    const requestId = this._generateId('emerg');
    const createdAt = new Date().toISOString();

    const record = {
      id: requestId,
      problem_type: problemType,
      urgency: urgency,
      name: name,
      phone: phone,
      email: email || null,
      address_line1: addressLine1,
      address_line2: addressLine2 || null,
      city: city || null,
      state: state || null,
      zip_code: zipCode || null,
      preferred_contact_time_window: preferredContactTimeWindow || null,
      status: 'submitted',
      createdAt: createdAt
    };

    requests.push(record);
    this._saveToStorage('emergency_repair_requests', requests);

    return {
      requestId,
      status: record.status,
      createdAt,
      success: true,
      message: 'Emergency repair request submitted.'
    };
  }

  // 9) getMaintenancePlansOverview

  getMaintenancePlansOverview() {
    return {
      overviewText: 'Regular roof maintenance helps prevent leaks, extends the life of your roof, and catches small issues before they become costly repairs.',
      sampleTiers: [
        {
          name: 'Basic Annual Checkup',
          description: 'One visit per year to inspect key roof components and seal minor issues.',
          visitFrequencyLabel: 'Once per year',
          startingPriceEstimate: 199
        },
        {
          name: 'Standard Roof Care',
          description: 'Spring and fall visits for inspection, debris removal, and minor sealing.',
          visitFrequencyLabel: 'Twice per year',
          startingPriceEstimate: 349
        },
        {
          name: 'Premium Protection',
          description: 'Quarterly visits with detailed inspection, documentation, and priority scheduling.',
          visitFrequencyLabel: 'Quarterly',
          startingPriceEstimate: 599
        }
      ]
    };
  }

  // 10) getMaintenancePlanBuilderOptions

  getMaintenancePlanBuilderOptions() {
    const propertyTypes = [
      { code: 'residential', label: 'Residential' },
      { code: 'commercial', label: 'Commercial' },
      { code: 'multi_family', label: 'Multi-family' },
      { code: 'industrial', label: 'Industrial' },
      { code: 'other', label: 'Other' }
    ];

    const roofSizeRanges = [
      { code: 'lt_1500_sq_ft', label: '< 1,500 sq ft', description: 'Smaller roofs, such as compact homes or garages.' },
      { code: '1500_1999_sq_ft', label: '1,500 – 1,999 sq ft', description: 'Average-sized residential roofs.' },
      { code: '2000_2499_sq_ft', label: '2,000 – 2,499 sq ft', description: 'Larger homes with more roof area.' },
      { code: 'ge_2500_sq_ft', label: '2,500+ sq ft', description: 'Very large residential or light commercial roofs.' }
    ];

    const visitFrequencies = [
      { code: 'once_per_year', label: 'Once per year', description: 'Annual maintenance visit.' },
      { code: 'twice_per_year', label: 'Twice per year', description: 'Every 6 months (recommended for most homes).' },
      { code: 'quarterly', label: 'Quarterly', description: 'Every 3 months for maximum protection.' },
      { code: 'custom', label: 'Custom schedule', description: 'We will design a schedule with you.' }
    ];

    const addons = this._getFromStorage('maintenance_addons', []);
    const activeAddons = addons.filter((a) => a.is_active);

    return {
      propertyTypes,
      roofSizeRanges,
      visitFrequencies,
      availableAddons: activeAddons
    };
  }

  // 11) createMaintenancePlanConfiguration(propertyType, roofSizeRange, visitFrequency, addonIds)

  createMaintenancePlanConfiguration(propertyType, roofSizeRange, visitFrequency, addonIds) {
    const allowedPropertyTypes = ['residential', 'commercial', 'multi_family', 'industrial', 'other'];
    const allowedRoofSizes = ['lt_1500_sq_ft', '1500_1999_sq_ft', '2000_2499_sq_ft', 'ge_2500_sq_ft'];
    const allowedVisitFrequencies = ['once_per_year', 'twice_per_year', 'quarterly', 'custom'];

    if (allowedPropertyTypes.indexOf(propertyType) === -1) {
      return { configurationId: null, estimatedAnnualPrice: 0, summary: '', createdAt: null, success: false, message: 'Invalid property type.' };
    }
    if (allowedRoofSizes.indexOf(roofSizeRange) === -1) {
      return { configurationId: null, estimatedAnnualPrice: 0, summary: '', createdAt: null, success: false, message: 'Invalid roof size range.' };
    }
    if (allowedVisitFrequencies.indexOf(visitFrequency) === -1) {
      return { configurationId: null, estimatedAnnualPrice: 0, summary: '', createdAt: null, success: false, message: 'Invalid visit frequency.' };
    }

    const addonsAll = this._getFromStorage('maintenance_addons', []);
    const selectedAddonIds = Array.isArray(addonIds) ? addonIds : [];
    const selectedAddons = addonsAll.filter((a) => selectedAddonIds.indexOf(a.id) !== -1 && a.is_active);

    let basePerVisit = 150;
    if (roofSizeRange === '1500_1999_sq_ft') basePerVisit = 180;
    if (roofSizeRange === '2000_2499_sq_ft') basePerVisit = 210;
    if (roofSizeRange === 'ge_2500_sq_ft') basePerVisit = 250;

    let visitsPerYear = 1;
    if (visitFrequency === 'twice_per_year') visitsPerYear = 2;
    if (visitFrequency === 'quarterly') visitsPerYear = 4;
    if (visitFrequency === 'custom') visitsPerYear = 2;

    const addonCostPerVisit = selectedAddons.reduce((sum, a) => {
      const val = typeof a.price_per_visit === 'number' ? a.price_per_visit : 0;
      return sum + val;
    }, 0);

    const annualPrice = (basePerVisit + addonCostPerVisit) * visitsPerYear;
    const round2 = (v) => Math.round(v * 100) / 100;
    const estimatedAnnualPrice = round2(annualPrice);

    const configId = this._generateId('mntconf');
    const createdAt = new Date().toISOString();

    const configuration = {
      id: configId,
      property_type: propertyType,
      roof_size_range: roofSizeRange,
      visit_frequency: visitFrequency,
      addon_ids: selectedAddons.map((a) => a.id),
      estimated_annual_price: estimatedAnnualPrice,
      included_in_quote_request_id: null,
      notes: null,
      createdAt: createdAt
    };

    const configs = this._getFromStorage('maintenance_plan_configurations', []);
    configs.push(configuration);
    this._saveToStorage('maintenance_plan_configurations', configs);

    const summary = propertyType + ' | ' + roofSizeRange + ' | ' + visitFrequency + ' | ' + configuration.addon_ids.length + ' addons';

    return {
      configurationId: configId,
      estimatedAnnualPrice,
      summary,
      createdAt,
      success: true,
      message: 'Maintenance plan configuration created.'
    };
  }

  // 12) getInspectionSchedulingOptions

  getInspectionSchedulingOptions() {
    const propertyTypes = [
      { code: 'residential', label: 'Residential' },
      { code: 'commercial', label: 'Commercial' },
      { code: 'multi_family', label: 'Multi-family' },
      { code: 'industrial', label: 'Industrial' },
      { code: 'other', label: 'Other' }
    ];

    const inspectionReasons = [
      { code: 'leak_or_water_damage', label: 'Leak or water damage', description: 'Active or recent leaks or water stains.' },
      { code: 'routine_inspection', label: 'Routine inspection', description: 'Periodic check-up for peace of mind.' },
      { code: 'storm_damage', label: 'Storm damage', description: 'Hail, wind, or debris damage after a storm.' },
      { code: 'real_estate_transaction', label: 'Real estate transaction', description: 'Inspection for buying or selling a property.' },
      { code: 'other', label: 'Other concern', description: 'Any other reason for a roof inspection.' }
    ];

    const timeOfDayOptions = [
      { code: 'morning', label: 'Morning (8 am – 12 pm)', timeWindow: '8 am – 12 pm' },
      { code: 'afternoon', label: 'Afternoon (12 pm – 4 pm)', timeWindow: '12 pm – 4 pm' },
      { code: 'evening', label: 'Evening (4 pm – 7 pm)', timeWindow: '4 pm – 7 pm' }
    ];

    return {
      propertyTypes,
      inspectionReasons,
      timeOfDayOptions
    };
  }

  // 13) searchInspectionSlots(zipCode, weekStartDate, timeOfDay, propertyType, inspectionReason)

  searchInspectionSlots(zipCode, weekStartDate, timeOfDay, propertyType, inspectionReason) {
    const slots = this._getFromStorage('inspection_slots', []);
    if (!zipCode) return [];

    const { start, end } = this._getWeekRangeFromStart(weekStartDate);

    const results = slots.filter((slot) => {
      if (!slot.available) return false;
      if (!Array.isArray(slot.service_area_zip_codes)) return false;
      if (slot.service_area_zip_codes.indexOf(zipCode) === -1) return false;

      const slotStart = this._parseISODate(slot.start_datetime);
      if (!slotStart) return false;
      if (!(slotStart >= start && slotStart < end)) return false;

      if (timeOfDay && slot.time_of_day !== timeOfDay) return false;

      if (propertyType && Array.isArray(slot.property_types_allowed) && slot.property_types_allowed.length > 0) {
        if (slot.property_types_allowed.indexOf(propertyType) === -1) return false;
      }

      if (inspectionReason && Array.isArray(slot.inspection_reasons_allowed) && slot.inspection_reasons_allowed.length > 0) {
        if (slot.inspection_reasons_allowed.indexOf(inspectionReason) === -1) return false;
      }

      return true;
    });

    return results;
  }

  // 14) bookInspectionSlot(inspectionSlotId, zipCode, propertyType, inspectionReason, notes)

  bookInspectionSlot(inspectionSlotId, zipCode, propertyType, inspectionReason, notes) {
    if (!inspectionSlotId || !zipCode || !propertyType || !inspectionReason) {
      return {
        appointmentId: null,
        confirmationNumber: null,
        slotStart: null,
        slotEnd: null,
        status: null,
        success: false,
        message: 'inspectionSlotId, zipCode, propertyType, and inspectionReason are required.'
      };
    }

    const reserveResult = this._reserveInspectionSlot(inspectionSlotId);
    if (!reserveResult.success) {
      return {
        appointmentId: null,
        confirmationNumber: null,
        slotStart: null,
        slotEnd: null,
        status: null,
        success: false,
        message: reserveResult.message
      };
    }

    const slot = reserveResult.slot;
    const appointments = this._getFromStorage('inspection_appointments', []);
    const appointmentId = this._generateId('inspappt');
    const confirmationNumber = 'CONF-' + this._getNextIdCounter();
    const createdAt = new Date().toISOString();

    const appointment = {
      id: appointmentId,
      inspection_slot_id: inspectionSlotId,
      zip_code: zipCode,
      property_type: propertyType,
      inspection_reason: inspectionReason,
      status: 'confirmed',
      confirmation_number: confirmationNumber,
      notes: notes || null,
      createdAt: createdAt
    };

    appointments.push(appointment);
    this._saveToStorage('inspection_appointments', appointments);

    return {
      appointmentId,
      confirmationNumber,
      slotStart: slot.start_datetime,
      slotEnd: slot.end_datetime,
      status: appointment.status,
      success: true,
      message: 'Inspection slot booked.'
    };
  }

  // 15) getFinancingOverview

  getFinancingOverview() {
    const termOptions = this._getFromStorage('financing_term_options', []);
    const activeTerms = termOptions.filter((t) => t.is_active);
    return {
      overviewText: 'Spread the cost of your roofing project over time with our flexible financing options.',
      availableTerms: activeTerms
    };
  }

  // 16) calculateFinancingEstimates(projectCost, targetMonthlyPayment)

  calculateFinancingEstimates(projectCost, targetMonthlyPayment) {
    if (typeof projectCost !== 'number' || projectCost <= 0) {
      return {
        projectCost: projectCost,
        targetMonthlyPayment: targetMonthlyPayment || null,
        estimates: [],
        highlightedTermOptionIds: []
      };
    }

    const termOptions = this._getFromStorage('financing_term_options', []);
    const activeTerms = termOptions.filter((t) => t.is_active);

    const nowIso = new Date().toISOString();
    const estimatesStorage = this._getFromStorage('financing_estimates', []);

    const estimates = [];
    for (let i = 0; i < activeTerms.length; i++) {
      const term = activeTerms[i];

      if (typeof term.min_project_cost === 'number' && projectCost < term.min_project_cost) {
        continue;
      }
      if (typeof term.max_project_cost === 'number' && projectCost > term.max_project_cost) {
        continue;
      }

      const calc = this._calculateMonthlyPayment(projectCost, term);
      const estimateId = this._generateId('finest');

      const estimateRecord = {
        id: estimateId,
        term_option_id: term.id,
        project_cost: projectCost,
        estimated_monthly_payment: calc.monthlyPayment,
        total_payment: calc.totalPayment,
        total_interest: calc.totalInterest,
        createdAt: nowIso
      };
      estimatesStorage.push(estimateRecord);
      estimates.push(estimateRecord);
    }

    this._saveToStorage('financing_estimates', estimatesStorage);

    const highlightedTermOptionIds = [];
    if (typeof targetMonthlyPayment === 'number' && targetMonthlyPayment > 0) {
      for (let i = 0; i < estimates.length; i++) {
        if (estimates[i].estimated_monthly_payment <= targetMonthlyPayment) {
          highlightedTermOptionIds.push(estimates[i].term_option_id);
        }
      }
    }

    const resolvedEstimates = estimates.map((e) => ({
      ...e,
      term_option: termOptions.find((t) => t.id === e.term_option_id) || null
    }));

    return {
      projectCost,
      targetMonthlyPayment: typeof targetMonthlyPayment === 'number' ? targetMonthlyPayment : null,
      estimates: resolvedEstimates,
      highlightedTermOptionIds
    };
  }

  // 17) startFinancingApplication(termOptionId, projectCost, estimatedMonthlyPayment, applicantName, applicantEmail, sourcePage)

  startFinancingApplication(termOptionId, projectCost, estimatedMonthlyPayment, applicantName, applicantEmail, sourcePage) {
    if (!termOptionId || !applicantName || !applicantEmail || !sourcePage) {
      return {
        applicationId: null,
        status: null,
        createdAt: null,
        success: false,
        message: 'termOptionId, applicantName, applicantEmail, and sourcePage are required.'
      };
    }
    if (typeof projectCost !== 'number' || projectCost <= 0) {
      return {
        applicationId: null,
        status: null,
        createdAt: null,
        success: false,
        message: 'Invalid project cost.'
      };
    }

    const termOptions = this._getFromStorage('financing_term_options', []);
    const term = termOptions.find((t) => t.id === termOptionId && t.is_active);
    if (!term) {
      return {
        applicationId: null,
        status: null,
        createdAt: null,
        success: false,
        message: 'Financing term option not found or inactive.'
      };
    }

    const applications = this._getFromStorage('financing_applications', []);
    const applicationId = this._generateId('finapp');
    const createdAt = new Date().toISOString();

    const application = {
      id: applicationId,
      term_option_id: termOptionId,
      project_cost: projectCost,
      estimated_monthly_payment: typeof estimatedMonthlyPayment === 'number' ? estimatedMonthlyPayment : null,
      applicant_name: applicantName,
      applicant_email: applicantEmail,
      source_page: sourcePage,
      status: 'started',
      notes: null,
      createdAt: createdAt,
      updatedAt: null
    };

    applications.push(application);
    this._saveToStorage('financing_applications', applications);

    return {
      applicationId,
      status: application.status,
      createdAt,
      success: true,
      message: 'Financing application started.'
    };
  }

  // 18) getReviewFilterOptions

  getReviewFilterOptions() {
    const serviceTypes = [
      { code: 'roof_replacement', label: 'Roof replacement' },
      { code: 'roof_repair', label: 'Roof repair' },
      { code: 'maintenance_plan', label: 'Maintenance plans' },
      { code: 'emergency_repair', label: 'Emergency repair' },
      { code: 'inspection', label: 'Inspections' },
      { code: 'insurance_assistance', label: 'Insurance assistance' },
      { code: 'financing', label: 'Financing' },
      { code: 'general_service', label: 'General services' },
      { code: 'other', label: 'Other' }
    ];

    const ratingOptions = [
      { minRating: 1, label: '1 star & up' },
      { minRating: 2, label: '2 stars & up' },
      { minRating: 3, label: '3 stars & up' },
      { minRating: 4, label: '4 stars & up' },
      { minRating: 5, label: '5 stars only' }
    ];

    const dateRangePresets = [
      { code: 'last_3_months', label: 'Last 3 months', description: 'Reviews from the past 3 months.' },
      { code: 'last_6_months', label: 'Last 6 months', description: 'Reviews from the past 6 months.' },
      { code: 'last_12_months', label: 'Last 12 months', description: 'Reviews from the past year.' },
      { code: 'all_time', label: 'All time', description: 'All published reviews.' }
    ];

    const sortOptions = [
      { code: 'newest_first', label: 'Newest first' },
      { code: 'highest_rating', label: 'Highest rating' },
      { code: 'lowest_rating', label: 'Lowest rating' }
    ];

    return {
      serviceTypes,
      ratingOptions,
      dateRangePresets,
      sortOptions
    };
  }

  // 19) searchReviews(serviceType, minRating, dateFrom, dateTo, sortBy, page = 1, pageSize = 10)

  searchReviews(serviceType, minRating, dateFrom, dateTo, sortBy, page, pageSize) {
    const reviews = this._getFromStorage('reviews', []);
    const materials = this._getFromStorage('roofing_materials', []);

    let filtered = reviews.slice();

    if (serviceType) {
      filtered = filtered.filter((r) => r.service_type === serviceType);
    }

    if (typeof minRating === 'number') {
      filtered = filtered.filter((r) => typeof r.rating === 'number' && r.rating >= minRating);
    }

    const fromDate = dateFrom ? this._parseISODate(dateFrom) : null;
    const toDate = dateTo ? this._endOfDay(this._parseISODate(dateTo) || new Date()) : null;

    if (fromDate) {
      filtered = filtered.filter((r) => {
        const created = this._parseISODate(r.createdAt);
        return created && created >= fromDate;
      });
    }

    if (toDate) {
      filtered = filtered.filter((r) => {
        const created = this._parseISODate(r.createdAt);
        return created && created <= toDate;
      });
    }

    const sort = sortBy || 'newest_first';
    filtered.sort((a, b) => {
      if (sort === 'highest_rating') {
        if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
        const da = this._parseISODate(a.createdAt) || new Date(0);
        const db = this._parseISODate(b.createdAt) || new Date(0);
        return db - da;
      }
      if (sort === 'lowest_rating') {
        if (a.rating !== b.rating) return (a.rating || 0) - (b.rating || 0);
        const da = this._parseISODate(a.createdAt) || new Date(0);
        const db = this._parseISODate(b.createdAt) || new Date(0);
        return db - da;
      }
      const da = this._parseISODate(a.createdAt) || new Date(0);
      const db = this._parseISODate(b.createdAt) || new Date(0);
      return db - da;
    });

    const totalResults = filtered.length;
    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;
    const startIndex = (pageNum - 1) * size;
    const paged = filtered.slice(startIndex, startIndex + size);

    const resolved = paged.map((r) => ({
      ...r,
      reviewed_material: r.reviewed_material_id ? (materials.find((m) => m.id === r.reviewed_material_id) || null) : null
    }));

    return {
      reviews: resolved,
      totalResults,
      page: pageNum,
      pageSize: size
    };
  }

  // 20) getReviewDetail(reviewId)

  getReviewDetail(reviewId) {
    const reviews = this._getFromStorage('reviews', []);
    const materials = this._getFromStorage('roofing_materials', []);
    const review = reviews.find((r) => r.id === reviewId) || null;
    if (!review) return null;
    return {
      ...review,
      reviewed_material: review.reviewed_material_id ? (materials.find((m) => m.id === review.reviewed_material_id) || null) : null
    };
  }

  // 21) saveReview(reviewId, notes)

  saveReview(reviewId, notes) {
    if (!reviewId) {
      return {
        savedReviewId: null,
        reviewId: null,
        savedAt: null,
        success: false,
        message: 'reviewId is required.'
      };
    }
    const reviews = this._getFromStorage('reviews', []);
    const review = reviews.find((r) => r.id === reviewId);
    if (!review) {
      return {
        savedReviewId: null,
        reviewId: reviewId,
        savedAt: null,
        success: false,
        message: 'Review not found.'
      };
    }

    this._getOrCreateAnonymousUserContext();

    const savedReviews = this._getFromStorage('saved_reviews', []);
    const savedReviewId = this._generateId('savrev');
    const savedAt = new Date().toISOString();

    savedReviews.push({
      id: savedReviewId,
      review_id: reviewId,
      savedAt: savedAt,
      notes: notes || null
    });

    this._saveToStorage('saved_reviews', savedReviews);

    return {
      savedReviewId,
      reviewId,
      savedAt,
      success: true,
      message: 'Review saved.'
    };
  }

  // 22) getFaqCategoriesAndPopularArticles

  getFaqCategoriesAndPopularArticles() {
    const categories = [
      { code: 'services', label: 'Services', description: 'Learn about our roofing services and processes.' },
      { code: 'warranties', label: 'Warranties', description: 'Coverage information and warranty terms.' },
      { code: 'financing', label: 'Financing', description: 'Options to pay over time.' },
      { code: 'insurance', label: 'Insurance & claims', description: 'Working with your insurance company on roof damage.' },
      { code: 'general', label: 'General questions', description: 'Common questions about roofing and our company.' },
      { code: 'promotions', label: 'Promotions', description: 'Current discounts and special offers.' }
    ];

    const articles = this._getFromStorage('faq_articles', []);
    const popularArticles = articles.filter((a) => a.is_popular);

    return {
      categories,
      popularArticles
    };
  }

  // 23) searchFaqArticles(query, category)

  searchFaqArticles(query, category) {
    const articles = this._getFromStorage('faq_articles', []);
    if (!query) {
      return { results: [] };
    }
    const q = String(query).toLowerCase();

    let filtered = articles.filter((a) => {
      const title = (a.title || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      const keywords = Array.isArray(a.keywords) ? a.keywords.join(' ').toLowerCase() : '';
      return title.indexOf(q) !== -1 || content.indexOf(q) !== -1 || keywords.indexOf(q) !== -1;
    });

    if (category) {
      filtered = filtered.filter((a) => a.category === category);
    }

    return { results: filtered };
  }

  // 24) getFaqArticleDetail(articleId)

  getFaqArticleDetail(articleId) {
    const articles = this._getFromStorage('faq_articles', []);
    const article = articles.find((a) => a.id === articleId) || null;
    return article;
  }

  // 25) requestInsuranceAssistance(name, email, insurerName, description, relatedArticleId)

  requestInsuranceAssistance(name, email, insurerName, description, relatedArticleId) {
    if (!name || !email || !insurerName || !description) {
      return {
        assistanceRequestId: null,
        status: null,
        createdAt: null,
        success: false,
        message: 'name, email, insurerName, and description are required.'
      };
    }

    const articles = this._getFromStorage('faq_articles', []);
    let articleIdToStore = null;
    if (relatedArticleId && articles.find((a) => a.id === relatedArticleId)) {
      articleIdToStore = relatedArticleId;
    }

    const requests = this._getFromStorage('insurance_assistance_requests', []);
    const assistanceRequestId = this._generateId('insassist');
    const createdAt = new Date().toISOString();

    const record = {
      id: assistanceRequestId,
      name: name,
      email: email,
      insurer_name: insurerName,
      description: description,
      related_article_id: articleIdToStore,
      status: 'submitted',
      createdAt: createdAt
    };

    requests.push(record);
    this._saveToStorage('insurance_assistance_requests', requests);

    return {
      assistanceRequestId,
      status: record.status,
      createdAt,
      success: true,
      message: 'Insurance assistance request submitted.'
    };
  }

  // 26) getActivePromotions(serviceTypeFilter, onlyActive = true)

  getActivePromotions(serviceTypeFilter, onlyActive) {
    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();

    let filtered = promotions.slice();

    if (onlyActive === undefined || onlyActive === true) {
      filtered = filtered.filter((p) => p.is_active);
    }

    filtered = filtered.filter((p) => {
      const start = p.start_date ? this._parseISODate(p.start_date) : null;
      const end = p.end_date ? this._parseISODate(p.end_date) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      return true;
    });

    if (serviceTypeFilter) {
      filtered = filtered.filter((p) => Array.isArray(p.applicable_services) && p.applicable_services.indexOf(serviceTypeFilter) !== -1);
    }

    return filtered;
  }

  // 27) getPromotionDetail(promotionId)

  getPromotionDetail(promotionId) {
    const promotions = this._getFromStorage('promotions', []);
    return promotions.find((p) => p.id === promotionId) || null;
  }

  // 28) startQuoteFromPromotion(promotionId, serviceType, projectDescription, name, email)

  startQuoteFromPromotion(promotionId, serviceType, projectDescription, name, email) {
    if (!promotionId || !serviceType || !projectDescription || !name || !email) {
      return {
        quoteId: null,
        status: null,
        promotionId: promotionId || null,
        createdAt: null,
        success: false,
        message: 'promotionId, serviceType, projectDescription, name, and email are required.'
      };
    }

    const promotions = this._getFromStorage('promotions', []);
    const promo = promotions.find((p) => p.id === promotionId && p.is_active);
    if (!promo) {
      return {
        quoteId: null,
        status: null,
        promotionId: promotionId,
        createdAt: null,
        success: false,
        message: 'Promotion not found or inactive.'
      };
    }

    const quoteRequests = this._getFromStorage('project_quote_requests', []);
    const quoteId = this._generateId('quote');
    const createdAt = new Date().toISOString();

    const record = {
      id: quoteId,
      source_page: 'promotions_page',
      service_type: serviceType,
      roofing_material_id: null,
      property_type: null,
      project_description: projectDescription,
      budget_min: null,
      budget_max: null,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      zip_code: null,
      phone: null,
      email: email,
      promotion_id: promotionId,
      maintenance_plan_configuration_id: null,
      financing_term_months: null,
      has_financing_interest: null,
      preferred_start_date: null,
      status: 'submitted',
      internal_notes: 'Contact name: ' + name,
      createdAt: createdAt,
      updatedAt: null
    };

    quoteRequests.push(record);
    this._saveToStorage('project_quote_requests', quoteRequests);

    return {
      quoteId,
      status: record.status,
      promotionId: promotionId,
      createdAt,
      success: true,
      message: 'Quote request created from promotion.'
    };
  }

  // 29) getProjectQuoteFormOptions

  getProjectQuoteFormOptions() {
    const serviceTypes = [
      { code: 'roof_replacement', label: 'Roof replacement' },
      { code: 'roof_repair', label: 'Roof repair' },
      { code: 'maintenance_plan', label: 'Maintenance plan' },
      { code: 'emergency_repair', label: 'Emergency repair' },
      { code: 'inspection', label: 'Roof inspection' },
      { code: 'insurance_assistance', label: 'Insurance assistance', },
      { code: 'financing', label: 'Financing', },
      { code: 'general_service', label: 'General roofing service' },
      { code: 'other', label: 'Other' }
    ];

    const propertyTypes = [
      { code: 'residential', label: 'Residential' },
      { code: 'commercial', label: 'Commercial' },
      { code: 'multi_family', label: 'Multi-family' },
      { code: 'industrial', label: 'Industrial' },
      { code: 'other', label: 'Other' }
    ];

    const budgetRanges = [
      { id: 'under_5000', label: 'Under $5,000', min: 0, max: 4999 },
      { id: '5000_9999', label: '$5,000 – $9,999', min: 5000, max: 9999 },
      { id: '10000_14999', label: '$10,000 – $14,999', min: 10000, max: 14999 },
      { id: '15000_19999', label: '$15,000 – $19,999', min: 15000, max: 19999 },
      { id: '20000_plus', label: '$20,000+', min: 20000, max: null }
    ];

    const preferredStartDateHelpText = 'Select your ideal start date. Actual scheduling will be confirmed after we review your project.';

    return {
      serviceTypes,
      propertyTypes,
      budgetRanges,
      preferredStartDateHelpText
    };
  }

  // 30) submitProjectQuoteRequest(sourcePage, serviceType, roofingMaterialId, propertyType, projectDescription, budgetMin, budgetMax, addressLine1, addressLine2, city, state, zipCode, phone, email, promotionId, maintenancePlanConfigurationId, financingTermMonths, hasFinancingInterest, preferredStartDate)

  submitProjectQuoteRequest(
    sourcePage,
    serviceType,
    roofingMaterialId,
    propertyType,
    projectDescription,
    budgetMin,
    budgetMax,
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
    phone,
    email,
    promotionId,
    maintenancePlanConfigurationId,
    financingTermMonths,
    hasFinancingInterest,
    preferredStartDate
  ) {
    if (!sourcePage || !serviceType) {
      return {
        quoteId: null,
        status: null,
        createdAt: null,
        success: false,
        message: 'sourcePage and serviceType are required.'
      };
    }

    const quoteRequests = this._getFromStorage('project_quote_requests', []);
    const quoteId = this._generateId('quote');
    const createdAt = new Date().toISOString();

    const record = {
      id: quoteId,
      source_page: sourcePage,
      service_type: serviceType,
      roofing_material_id: roofingMaterialId || null,
      property_type: propertyType || null,
      project_description: projectDescription || null,
      budget_min: typeof budgetMin === 'number' ? budgetMin : null,
      budget_max: typeof budgetMax === 'number' ? budgetMax : null,
      address_line1: addressLine1 || null,
      address_line2: addressLine2 || null,
      city: city || null,
      state: state || null,
      zip_code: zipCode || null,
      phone: phone || null,
      email: email || null,
      promotion_id: promotionId || null,
      maintenance_plan_configuration_id: maintenancePlanConfigurationId || null,
      financing_term_months: typeof financingTermMonths === 'number' ? financingTermMonths : null,
      has_financing_interest: typeof hasFinancingInterest === 'boolean' ? hasFinancingInterest : null,
      preferred_start_date: preferredStartDate || null,
      status: 'submitted',
      internal_notes: null,
      createdAt: createdAt,
      updatedAt: null
    };

    quoteRequests.push(record);
    this._saveToStorage('project_quote_requests', quoteRequests);

    if (maintenancePlanConfigurationId) {
      this._linkMaintenancePlanToQuote(maintenancePlanConfigurationId, quoteId);
    }

    return {
      quoteId,
      status: record.status,
      createdAt,
      success: true,
      message: 'Project quote request submitted.'
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