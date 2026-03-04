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

  // ----------------------
  // Initialization & Utils
  // ----------------------

  _initStorage() {
    // Core entity tables from data model
    const arrayKeys = [
      'phase1_esa_quote_requests',
      'remediation_packages',
      'proposal_lists',
      'proposal_items',
      'offices',
      'office_notes',
      'case_studies',
      'saved_items',
      'training_courses',
      'carts',
      'cart_items',
      'cleanup_estimates',
      'compliance_audit_requests',
      'monitoring_plans',
      'newsletter_topics',
      'newsletter_subscriptions',
      'newsletter_topic_preferences',
      'content_categories',
      'tools',
      // additional non-model storage we use
      'contact_inquiries'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Legacy/example keys from template (not used but kept for compatibility)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
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

  _now() {
    return new Date().toISOString();
  }

  _toISODateTime(value) {
    if (!value) return this._now();
    if (value instanceof Date) return value.toISOString();
    const d = new Date(value);
    if (isNaN(d.getTime())) return this._now();
    return d.toISOString();
  }

  // -------------
  // Helper: Cart
  // -------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        createdAt: this._now(),
        updatedAt: this._now(),
        totalAmount: 0
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotal(cartId) {
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cart_items');
    const cart = carts.find(c => c.id === cartId);
    if (!cart) return null;

    const itemsForCart = cartItems.filter(ci => ci.cartId === cartId);
    let total = 0;
    for (const item of itemsForCart) {
      total += (item.unitPrice || 0) * (item.quantity || 0);
    }
    cart.totalAmount = total;
    cart.updatedAt = this._now();
    this._saveToStorage('carts', carts);
    return cart;
  }

  // ----------------------
  // Helper: Proposal List
  // ----------------------

  _getOrCreateProposalList() {
    let lists = this._getFromStorage('proposal_lists');
    let list = lists.find(l => l.status === 'active');
    if (!list) {
      list = {
        id: this._generateId('proposal'),
        name: 'Active proposal',
        status: 'active',
        createdAt: this._now(),
        updatedAt: this._now()
      };
      lists.push(list);
      this._saveToStorage('proposal_lists', lists);
    }
    return list;
  }

  // ------------------
  // Helper: Newsletter
  // ------------------

  _getActiveNewsletterSubscription() {
    const subs = this._getFromStorage('newsletter_subscriptions');
    return subs.find(s => s.status === 'active') || null;
  }

  // -----------------
  // Helper: OfficeNote
  // -----------------

  _getOrCreateOfficeNote(officeId) {
    let notes = this._getFromStorage('office_notes');
    let note = notes.find(n => n.officeId === officeId);
    if (!note) {
      note = {
        id: this._generateId('officenote'),
        officeId,
        noteText: '',
        createdAt: this._now(),
        updatedAt: null
      };
      notes.push(note);
      this._saveToStorage('office_notes', notes);
    }
    return note;
  }

  // -----------------
  // Helper: Cleanup Cost
  // -----------------

  _calculateCleanupCost(siteAreaAcres, primaryContaminant, treatmentMethod, disposalOption) {
    const area = Number(siteAreaAcres) || 0;
    // Base cost per acre (simple heuristic, not real-world data)
    let basePerAcre = 20000;

    // Adjust basePerAcre by contaminant type (slight multipliers)
    const contaminantFactorMap = {
      'lead_in_soil': 1.0,
      'petroleum_hydrocarbons': 0.9,
      'chlorinated_solvents': 1.2,
      'metals': 1.1,
      'vocs': 1.15,
      'svocs': 1.15,
      'pesticides': 1.05,
      'pcbs': 1.25
    };
    const contaminantFactor = contaminantFactorMap[primaryContaminant] || 1.0;

    const treatmentFactorMap = {
      'excavation_and_off_site_disposal': 1.2,
      'in_situ_treatment': 1.1,
      'pump_and_treat': 1.15,
      'soil_vapor_extraction': 1.1,
      'monitored_natural_attenuation': 0.7
    };
    const treatmentFactor = treatmentFactorMap[treatmentMethod] || 1.0;

    const disposalFactorMap = {
      'hazardous_waste_landfill': 1.6,
      'stabilization_and_local_landfill': 1.3,
      'non_hazardous_landfill': 1.1,
      'onsite_treatment_and_reuse': 0.9
    };
    const disposalFactor = disposalFactorMap[disposalOption] || 1.0;

    const baseCost = area * basePerAcre * contaminantFactor;
    const totalFactor = treatmentFactor * disposalFactor;
    const total = baseCost * totalFactor;

    // Simple breakdown ratios
    const mobilization = total * 0.1;
    const excavation = total * 0.35;
    const transportAndDisposal = total * 0.45;
    const engineeringAndReporting = total - mobilization - excavation - transportAndDisposal;

    return {
      estimatedTotalCost: total,
      costBreakdown: {
        mobilization,
        excavation,
        transportAndDisposal,
        engineeringAndReporting
      }
    };
  }

  // -------------------------
  // Helper: Monitoring Costs
  // -------------------------

  _calculateMonitoringPlanAnnualCost(numberOfWells, samplingFrequency, planDuration) {
    const wells = Number(numberOfWells) || 0;

    const eventsPerYearMap = {
      'monthly': 12,
      'quarterly': 4,
      'semi_annual': 2,
      'annual': 1
    };
    let eventsPerYear = eventsPerYearMap[samplingFrequency] || 4;

    // Base cost per sampling event per well
    let basePerEventPerWell = 500;

    // Slight adjustments by plan duration (longer plans slightly cheaper per event)
    const durationFactorMap = {
      'one_year': 1.0,
      'three_years': 0.95,
      'five_years': 0.9,
      'custom': 1.0
    };
    const durationFactor = durationFactorMap[planDuration] || 1.0;

    const costPerEvent = wells * basePerEventPerWell * durationFactor;
    const estimatedAnnualCost = costPerEvent * eventsPerYear;

    return {
      estimatedAnnualCost,
      costPerEvent,
      eventsPerYear
    };
  }

  // -----------------------------
  // Helper: Enum label formatting
  // -----------------------------

  _labelFromEnum(enumValue) {
    if (!enumValue || typeof enumValue !== 'string') return '';
    return enumValue
      .split('_')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  // ==========================================
  // Interface Implementations
  // ==========================================

  // ----------------------
  // getHomePageOverview
  // ----------------------

  getHomePageOverview() {
    const categories = this._getFromStorage('content_categories');
    const caseStudies = this._getFromStorage('case_studies');
    const trainingCourses = this._getFromStorage('training_courses');
    const offices = this._getFromStorage('offices');
    const tools = this._getFromStorage('tools');
    const newsletterTopics = this._getFromStorage('newsletter_topics');

    const serviceCategories = categories.map(cat => ({
      categoryId: cat.id,
      categoryCode: cat.code,
      categoryName: cat.name,
      description: cat.description || '',
      primaryUseCases: []
    }));

    const featuredCaseStudies = caseStudies
      .slice()
      .sort((a, b) => (b.yearCompleted || 0) - (a.yearCompleted || 0))
      .slice(0, 3)
      .map(cs => ({
        caseStudyId: cs.id,
        title: cs.title,
        industryLabel: this._labelFromEnum(cs.industry),
        regionLabel: this._labelFromEnum(cs.region),
        yearCompleted: cs.yearCompleted,
        projectCost: cs.projectCost
      }));

    const featuredTrainingCourses = trainingCourses
      .filter(c => c.isActive !== false)
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3)
      .map(c => ({
        trainingCourseId: c.id,
        title: c.title,
        audienceLabel: this._labelFromEnum(c.audience),
        price: c.price,
        rating: c.rating
      }));

    const emergencySpillContacts = offices
      .filter(o => o.hasEmergencySpillResponse === true)
      .map(o => ({
        officeId: o.id,
        officeName: o.name,
        city: o.city,
        state: o.state,
        phoneMain: o.phoneMain,
        isPrimaryOfficeForRegion: !!o.isPrimaryOfficeForRegion
      }));

    const primaryTools = tools.map(t => ({
      toolId: t.id,
      toolCode: t.toolId,
      name: t.name,
      description: t.description || ''
    }));

    const newsletterHighlights = newsletterTopics.map(t => ({
      topicId: t.id,
      name: t.name,
      code: t.code,
      description: t.description || '',
      defaultFrequency: t.defaultFrequency || null
    }));

    return {
      serviceCategories,
      featuredCaseStudies,
      featuredTrainingCourses,
      emergencySpillContacts,
      primaryTools,
      newsletterHighlights
    };
  }

  // ------------------------------
  // getServiceCategoriesOverview
  // ------------------------------

  getServiceCategoriesOverview() {
    return this._getFromStorage('content_categories');
  }

  // -------------------------------------------
  // getEnvironmentalSiteAssessmentServices
  // -------------------------------------------

  getEnvironmentalSiteAssessmentServices() {
    // Static configuration describing ESA services (not persisted data)
    return [
      {
        serviceCode: 'phase1_esa',
        name: 'Phase I Environmental Site Assessment (ESA)',
        shortDescription: 'Desktop and site reconnaissance review to identify potential environmental concerns.',
        typicalTimelineSummary: '2–3 weeks from notice-to-proceed for most commercial sites.',
        startingPriceHint: 'Typical budgets start around $2,000–$3,500 for small commercial sites.'
      },
      {
        serviceCode: 'phase2_esa',
        name: 'Phase II Environmental Site Assessment (ESA)',
        shortDescription: 'Intrusive sampling to confirm and delineate potential contamination identified in Phase I.',
        typicalTimelineSummary: '4–8 weeks depending on access and laboratory turnaround.',
        startingPriceHint: 'Budgets depend heavily on scope and access requirements.'
      },
      {
        serviceCode: 'other_assessment',
        name: 'Targeted Environmental Investigations',
        shortDescription: 'Customized investigation scopes to answer specific due diligence questions.',
        typicalTimelineSummary: 'Varies based on scope; often 2–6 weeks.',
        startingPriceHint: 'Scoping call required for budgetary estimate.'
      }
    ];
  }

  // ---------------------------------
  // getPhaseIEsaServiceDetails
  // ---------------------------------

  getPhaseIEsaServiceDetails() {
    return {
      serviceCode: 'phase1_esa',
      name: 'Phase I Environmental Site Assessment (ESA)',
      scopeDescription:
        'A Phase I ESA evaluates current and historical site conditions through records review, interviews, and a site visit to identify Recognized Environmental Conditions (RECs).',
      deliverables: [
        'ASTM-compliant Phase I ESA report',
        'Site reconnaissance findings',
        'Records review and historical research summary',
        'Recommendations and next steps, if needed'
      ],
      typicalSchedule: 'Most small commercial properties can be completed within 2–3 weeks of notice-to-proceed.',
      propertyTypeOptions: [
        'commercial',
        'industrial',
        'residential',
        'agricultural',
        'mixed_use',
        'vacant_land',
        'other'
      ],
      budgetGuidance:
        'Budgets depend on property size, access, and data availability. Small commercial properties often fall in the $2,000–$3,500 range.'
    };
  }

  // ---------------------------------
  // submitPhaseIEsaQuoteRequest
  // ---------------------------------

  submitPhaseIEsaQuoteRequest(propertyType, propertySizeAcres, maximumBudget, preferredStartDate, contactEmail) {
    const requests = this._getFromStorage('phase1_esa_quote_requests');

    const now = this._now();
    const request = {
      id: this._generateId('phase1esa'),
      serviceType: 'phase1_esa',
      propertyType: propertyType, // expect valid enum string
      propertySizeAcres: Number(propertySizeAcres),
      maximumBudget: Number(maximumBudget),
      preferredStartDate: this._toISODateTime(preferredStartDate),
      contactEmail: contactEmail,
      status: 'submitted',
      createdAt: now,
      updatedAt: now
    };

    requests.push(request);
    this._saveToStorage('phase1_esa_quote_requests', requests);

    return {
      success: true,
      quoteRequest: request,
      message: 'Phase I ESA quote request submitted.'
    };
  }

  // ------------------------------
  // getRemediationFilterOptions
  // ------------------------------

  getRemediationFilterOptions() {
    const packages = this._getFromStorage('remediation_packages');

    let budgetMin = null;
    let budgetMax = null;
    for (const p of packages) {
      if (typeof p.estimatedTotalCost === 'number') {
        if (budgetMin === null || p.estimatedTotalCost < budgetMin) budgetMin = p.estimatedTotalCost;
        if (budgetMax === null || p.estimatedTotalCost > budgetMax) budgetMax = p.estimatedTotalCost;
      }
    }

    return {
      contaminationMediaOptions: [
        { code: 'soil', label: 'Soil' },
        { code: 'groundwater', label: 'Groundwater' },
        { code: 'surface_water', label: 'Surface water' },
        { code: 'sediment', label: 'Sediment' }
      ],
      serviceFeatureOptions: [
        { code: 'regulatory_reporting', label: 'Regulatory reporting' },
        { code: 'long_term_monitoring', label: 'Long-term monitoring' },
        { code: 'turnkey_implementation', label: 'Turnkey implementation' }
      ],
      budgetMin,
      budgetMax,
      sortOptions: [
        { code: 'total_cost_low_to_high', label: 'Total Cost: Low to High' },
        { code: 'total_cost_high_to_low', label: 'Total Cost: High to Low' }
      ]
    };
  }

  // ------------------------------
  // searchRemediationPackages
  // ------------------------------

  searchRemediationPackages(treatsSoil, treatsGroundwater, includesRegulatoryReporting, maxEstimatedTotalCost, sortBy) {
    const packages = this._getFromStorage('remediation_packages');
    const categories = this._getFromStorage('content_categories');

    let results = packages.filter(p => p.isActive !== false);

    if (typeof treatsSoil === 'boolean') {
      results = results.filter(p => p.treatsSoil === treatsSoil);
    }
    if (typeof treatsGroundwater === 'boolean') {
      results = results.filter(p => p.treatsGroundwater === treatsGroundwater);
    }
    if (typeof includesRegulatoryReporting === 'boolean') {
      results = results.filter(p => p.includesRegulatoryReporting === includesRegulatoryReporting);
    }
    if (typeof maxEstimatedTotalCost === 'number') {
      results = results.filter(p => typeof p.estimatedTotalCost === 'number' && p.estimatedTotalCost <= maxEstimatedTotalCost);
    }

    if (sortBy === 'total_cost_low_to_high') {
      results = results.slice().sort((a, b) => (a.estimatedTotalCost || 0) - (b.estimatedTotalCost || 0));
    } else if (sortBy === 'total_cost_high_to_low') {
      results = results.slice().sort((a, b) => (b.estimatedTotalCost || 0) - (a.estimatedTotalCost || 0));
    }

    const wrapped = results.map(pkg => {
      const category = categories.find(c => c.id === pkg.categoryId) || null;
      const enrichedPackage = Object.assign({}, pkg, {
        category
      });
      return {
        package: enrichedPackage,
        categoryName: category ? category.name : null,
        isHighlighted: false
      };
    });

    return {
      results: wrapped,
      totalCount: wrapped.length
    };
  }

  // --------------------------------------
  // getRemediationPackageDetails
  // --------------------------------------

  getRemediationPackageDetails(remediationPackageId) {
    const packages = this._getFromStorage('remediation_packages');
    const categories = this._getFromStorage('content_categories');

    const pkg = packages.find(p => p.id === remediationPackageId) || null;
    if (!pkg) {
      return {
        package: null,
        categoryName: null,
        scopeDetails: '',
        assumptions: '',
        regulatoryReportingIncluded: false,
        timelineSummary: '',
        limitations: ''
      };
    }

    const category = categories.find(c => c.id === pkg.categoryId) || null;
    const enrichedPackage = Object.assign({}, pkg, { category });

    return {
      package: enrichedPackage,
      categoryName: category ? category.name : null,
      scopeDetails: pkg.detailedDescription || pkg.shortDescription || '',
      assumptions: '',
      regulatoryReportingIncluded: !!pkg.includesRegulatoryReporting,
      timelineSummary: '',
      limitations: ''
    };
  }

  // --------------------------------------
  // addRemediationPackageToProposal
  // --------------------------------------

  addRemediationPackageToProposal(remediationPackageId) {
    const packages = this._getFromStorage('remediation_packages');
    const pkg = packages.find(p => p.id === remediationPackageId);
    if (!pkg) {
      return {
        success: false,
        proposalList: null,
        proposalItem: null,
        message: 'Remediation package not found.'
      };
    }

    const proposalList = this._getOrCreateProposalList();
    let items = this._getFromStorage('proposal_items');

    const now = this._now();
    const proposalItem = {
      id: this._generateId('proposalitem'),
      proposalListId: proposalList.id,
      remediationPackageId: remediationPackageId,
      addedAt: now,
      notes: ''
    };

    items.push(proposalItem);
    this._saveToStorage('proposal_items', items);

    return {
      success: true,
      proposalList,
      proposalItem,
      message: 'Package added to proposal.'
    };
  }

  // --------------------------------------
  // getActiveProposalSummary
  // --------------------------------------

  getActiveProposalSummary() {
    const lists = this._getFromStorage('proposal_lists');
    const items = this._getFromStorage('proposal_items');
    const packages = this._getFromStorage('remediation_packages');

    const proposalList = lists.find(l => l.status === 'active') || null;
    if (!proposalList) {
      return {
        proposalList: null,
        items: []
      };
    }

    const relatedItems = items.filter(i => i.proposalListId === proposalList.id);
    const enrichedItems = relatedItems.map(i => ({
      proposalItem: i,
      remediationPackage: packages.find(p => p.id === i.remediationPackageId) || null
    }));

    return {
      proposalList,
      items: enrichedItems
    };
  }

  // ----------------------------
  // getLocationSearchOptions
  // ----------------------------

  getLocationSearchOptions() {
    return {
      distanceOptionsMiles: [25, 50, 100, 200, 500],
      serviceFilterOptions: [
        { code: 'emergency_spill_response', label: 'Emergency spill response' },
        { code: 'compliance_audits', label: 'Compliance audits' },
        { code: 'remediation_services', label: 'Remediation services' },
        { code: 'training', label: 'Training & workshops' }
      ]
    };
  }

  // ----------------------------
  // searchOffices
  // ----------------------------

  searchOffices(cityOrPostalCode, maxDistanceMiles, requiresEmergencySpillResponse, requiresComplianceAudits, requiresRemediationServices, requiresTraining) {
    const offices = this._getFromStorage('offices');
    const query = (cityOrPostalCode || '').toString().toLowerCase();

    let results = offices.filter(o => {
      const cityMatch = (o.city || '').toLowerCase().includes(query);
      const postalMatch = (o.postalCode || '').toLowerCase().startsWith(query);
      return cityMatch || postalMatch;
    });

    if (requiresEmergencySpillResponse) {
      results = results.filter(o => o.hasEmergencySpillResponse === true);
    }
    if (requiresComplianceAudits) {
      results = results.filter(o => o.offersComplianceAudits === true);
    }
    if (requiresRemediationServices) {
      results = results.filter(o => o.offersRemediationServices === true);
    }
    if (requiresTraining) {
      results = results.filter(o => o.offersTraining === true);
    }

    const wrapped = results.map(o => {
      const services = [];
      if (o.hasEmergencySpillResponse) services.push('Emergency spill response');
      if (o.offersComplianceAudits) services.push('Compliance audits');
      if (o.offersRemediationServices) services.push('Remediation services');
      if (o.offersTraining) services.push('Training');
      return {
        office: o,
        distanceMiles: 0, // Distance not computed without external data
        keyServicesSummary: services.join(', ')
      };
    });

    return {
      results: wrapped,
      totalCount: wrapped.length
    };
  }

  // ----------------------------
  // getOfficeDetails
  // ----------------------------

  getOfficeDetails(officeId) {
    const offices = this._getFromStorage('offices');
    const notes = this._getFromStorage('office_notes');

    const office = offices.find(o => o.id === officeId) || null;
    if (!office) {
      return {
        office: null,
        servicesOffered: [],
        mapEmbedToken: '',
        existingNote: null
      };
    }

    const servicesOffered = [];
    if (office.hasEmergencySpillResponse) servicesOffered.push('Emergency spill response');
    if (office.offersComplianceAudits) servicesOffered.push('Compliance audits');
    if (office.offersRemediationServices) servicesOffered.push('Remediation services');
    if (office.offersTraining) servicesOffered.push('Training & workshops');

    const existingNote = notes.find(n => n.officeId === officeId) || null;

    return {
      office,
      servicesOffered,
      mapEmbedToken: '',
      existingNote
    };
  }

  // ----------------------------
  // saveOfficeNote
  // ----------------------------

  saveOfficeNote(officeId, noteText) {
    const offices = this._getFromStorage('offices');
    const office = offices.find(o => o.id === officeId);
    if (!office) {
      return {
        success: false,
        officeNote: null,
        message: 'Office not found.'
      };
    }

    let notes = this._getFromStorage('office_notes');
    let note = notes.find(n => n.officeId === officeId);
    const now = this._now();

    if (!note) {
      note = {
        id: this._generateId('officenote'),
        officeId,
        noteText: noteText || '',
        createdAt: now,
        updatedAt: null
      };
      notes.push(note);
    } else {
      note.noteText = noteText || '';
      note.updatedAt = now;
    }

    this._saveToStorage('office_notes', notes);

    return {
      success: true,
      officeNote: note,
      message: 'Office note saved.'
    };
  }

  // -------------------------------
  // getCaseStudyFilterOptions
  // -------------------------------

  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies');

    let yearMin = null;
    let yearMax = null;
    let costMin = null;
    let costMax = null;

    for (const cs of caseStudies) {
      if (typeof cs.yearCompleted === 'number') {
        if (yearMin === null || cs.yearCompleted < yearMin) yearMin = cs.yearCompleted;
        if (yearMax === null || cs.yearCompleted > yearMax) yearMax = cs.yearCompleted;
      }
      if (typeof cs.projectCost === 'number') {
        if (costMin === null || cs.projectCost < costMin) costMin = cs.projectCost;
        if (costMax === null || cs.projectCost > costMax) costMax = cs.projectCost;
      }
    }

    const industryOptions = [
      { code: 'brownfield_redevelopment', label: 'Brownfield redevelopment' },
      { code: 'industrial_facilities', label: 'Industrial facilities' },
      { code: 'manufacturing', label: 'Manufacturing' },
      { code: 'oil_and_gas', label: 'Oil & gas' },
      { code: 'municipal', label: 'Municipal' },
      { code: 'commercial_real_estate', label: 'Commercial real estate' },
      { code: 'other', label: 'Other' }
    ];

    const regionOptions = [
      { code: 'midwest_us', label: 'Midwest US' },
      { code: 'northeast_us', label: 'Northeast US' },
      { code: 'southeast_us', label: 'Southeast US' },
      { code: 'southwest_us', label: 'Southwest US' },
      { code: 'west_us', label: 'West US' },
      { code: 'national', label: 'National' },
      { code: 'international', label: 'International' }
    ];

    return {
      industryOptions,
      regionOptions,
      yearMin,
      yearMax,
      projectCostMin: costMin,
      projectCostMax: costMax
    };
  }

  // -------------------------------
  // searchCaseStudies
  // -------------------------------

  searchCaseStudies(industry, yearCompletedFrom, yearCompletedTo, region, minProjectCost, maxProjectCost) {
    const caseStudies = this._getFromStorage('case_studies');

    let results = caseStudies.slice();

    if (industry) {
      results = results.filter(cs => cs.industry === industry);
    }

    if (typeof yearCompletedFrom === 'number') {
      results = results.filter(cs => typeof cs.yearCompleted === 'number' && cs.yearCompleted >= yearCompletedFrom);
    }
    if (typeof yearCompletedTo === 'number') {
      results = results.filter(cs => typeof cs.yearCompleted === 'number' && cs.yearCompleted <= yearCompletedTo);
    }

    if (region) {
      results = results.filter(cs => cs.region === region);
    }

    if (typeof minProjectCost === 'number') {
      results = results.filter(cs => typeof cs.projectCost === 'number' && cs.projectCost >= minProjectCost);
    }
    if (typeof maxProjectCost === 'number') {
      results = results.filter(cs => typeof cs.projectCost === 'number' && cs.projectCost <= maxProjectCost);
    }

    const wrapped = results.map(cs => ({
      caseStudy: cs,
      industryLabel: this._labelFromEnum(cs.industry),
      regionLabel: this._labelFromEnum(cs.region),
      costBandLabel: this._getCostBandLabel(cs.projectCost)
    }));

    return {
      results: wrapped,
      totalCount: wrapped.length
    };
  }

  _getCostBandLabel(cost) {
    if (typeof cost !== 'number') return '';
    if (cost < 250000) return '< $250k';
    if (cost < 500000) return '$250k – $500k';
    if (cost < 1000000) return '$500k – $1M';
    if (cost < 5000000) return '$1M – $5M';
    if (cost < 10000000) return '$5M – $10M';
    return '$10M+';
  }

  // -------------------------------
  // getCaseStudyDetails
  // -------------------------------

  getCaseStudyDetails(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies');
    const savedItems = this._getFromStorage('saved_items');

    const cs = caseStudies.find(c => c.id === caseStudyId) || null;

    if (!cs) {
      return {
        caseStudy: null,
        industryLabel: '',
        regionLabel: '',
        costBandLabel: '',
        outcomesSummary: '',
        relatedCaseStudies: [],
        isSaved: false
      };
    }

    const industryLabel = this._labelFromEnum(cs.industry);
    const regionLabel = this._labelFromEnum(cs.region);
    const costBandLabel = this._getCostBandLabel(cs.projectCost);

    const relatedCaseStudies = caseStudies.filter(c => c.id !== cs.id && c.industry === cs.industry && c.region === cs.region);

    const isSaved = savedItems.some(si => si.contentType === 'case_study' && si.contentId === cs.id);

    return {
      caseStudy: cs,
      industryLabel,
      regionLabel,
      costBandLabel,
      outcomesSummary: cs.summary || '',
      relatedCaseStudies,
      isSaved
    };
  }

  // --------------------------------------
  // saveCaseStudyToSavedItems
  // --------------------------------------

  saveCaseStudyToSavedItems(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies');
    const cs = caseStudies.find(c => c.id === caseStudyId);
    if (!cs) {
      return {
        success: false,
        savedItem: null,
        message: 'Case study not found.'
      };
    }

    let savedItems = this._getFromStorage('saved_items');
    let existing = savedItems.find(si => si.contentType === 'case_study' && si.contentId === caseStudyId);
    if (existing) {
      return {
        success: true,
        savedItem: existing,
        message: 'Case study already saved.'
      };
    }

    const savedItem = {
      id: this._generateId('saved'),
      contentType: 'case_study',
      contentId: caseStudyId,
      savedAt: this._now()
    };

    savedItems.push(savedItem);
    this._saveToStorage('saved_items', savedItems);

    return {
      success: true,
      savedItem,
      message: 'Case study saved.'
    };
  }

  // -------------------------------
  // getTrainingFilterOptions
  // -------------------------------

  getTrainingFilterOptions() {
    const courses = this._getFromStorage('training_courses');

    let priceMin = null;
    let priceMax = null;
    for (const c of courses) {
      if (typeof c.price === 'number') {
        if (priceMin === null || c.price < priceMin) priceMin = c.price;
        if (priceMax === null || c.price > priceMax) priceMax = c.price;
      }
    }

    const audienceOptions = [
      { code: 'construction_managers', label: 'Construction managers' },
      { code: 'ehs_managers', label: 'EHS managers' },
      { code: 'plant_operators', label: 'Plant operators' },
      { code: 'executives', label: 'Executives' },
      { code: 'general_staff', label: 'General staff' },
      { code: 'regulators', label: 'Regulators' }
    ];

    const ratingOptions = [
      { minRating: 3, label: '3 stars & up' },
      { minRating: 4, label: '4 stars & up' },
      { minRating: 4.5, label: '4.5 stars & up' }
    ];

    const sortOptions = [
      { code: 'customer_rating_high_to_low', label: 'Customer Rating: High to Low' },
      { code: 'price_low_to_high', label: 'Price: Low to High' },
      { code: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return {
      audienceOptions,
      priceMin,
      priceMax,
      ratingOptions,
      sortOptions
    };
  }

  // -------------------------------
  // searchTrainingCourses
  // -------------------------------

  searchTrainingCourses(audience, maxPrice, minRating, sortBy) {
    const courses = this._getFromStorage('training_courses');

    let results = courses.filter(c => c.isActive !== false);

    if (audience) {
      results = results.filter(c => c.audience === audience);
    }
    if (typeof maxPrice === 'number') {
      results = results.filter(c => typeof c.price === 'number' && c.price <= maxPrice);
    }
    if (typeof minRating === 'number') {
      results = results.filter(c => typeof c.rating === 'number' && c.rating >= minRating);
    }

    if (sortBy === 'customer_rating_high_to_low') {
      results = results.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price_low_to_high') {
      results = results.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      results = results.slice().sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    const wrapped = results.map(course => ({
      course,
      audienceLabel: this._labelFromEnum(course.audience)
    }));

    return {
      results: wrapped,
      totalCount: wrapped.length
    };
  }

  // -------------------------------
  // addCourseToCart
  // -------------------------------

  addCourseToCart(trainingCourseId, quantity) {
    const courses = this._getFromStorage('training_courses');
    const course = courses.find(c => c.id === trainingCourseId);
    if (!course) {
      return {
        success: false,
        cart: null,
        cartItem: null,
        message: 'Training course not found.'
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(ci => ci.cartId === cart.id && ci.trainingCourseId === trainingCourseId);
    const now = this._now();

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.addedAt = now;
    } else {
      cartItem = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        trainingCourseId: trainingCourseId,
        quantity: qty,
        unitPrice: course.price || 0,
        addedAt: now
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotal(cart.id);

    return {
      success: true,
      cart: updatedCart,
      cartItem,
      message: 'Course added to cart.'
    };
  }

  // -------------------------------
  // getCartSummary
  // -------------------------------

  getCartSummary() {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const courses = this._getFromStorage('training_courses');

    const cart = carts.find(c => c.status === 'active') || null;
    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        total: 0
      };
    }

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    let subtotal = 0;
    const items = itemsForCart.map(ci => {
      const trainingCourse = courses.find(c => c.id === ci.trainingCourseId) || null;
      subtotal += (ci.unitPrice || 0) * (ci.quantity || 0);
      return {
        cartItem: ci,
        trainingCourse
      };
    });

    const total = subtotal;

    return {
      cart,
      items,
      subtotal,
      total
    };
  }

  // -------------------------------
  // updateCartItemQuantity
  // -------------------------------

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('carts');

    const cartItem = cartItems.find(ci => ci.id === cartItemId);
    if (!cartItem) {
      return {
        success: false,
        cart: null,
        message: 'Cart item not found.'
      };
    }

    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    } else {
      cartItem.quantity = qty;
      cartItem.addedAt = this._now();
    }

    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === cartItem.cartId) || null;
    if (cart) {
      this._recalculateCartTotal(cart.id);
    }

    const updatedCarts = this._getFromStorage('carts');
    const updatedCart = cart ? updatedCarts.find(c => c.id === cart.id) : null;

    return {
      success: true,
      cart: updatedCart,
      message: 'Cart updated.'
    };
  }

  // -------------------------------
  // removeCourseFromCart
  // -------------------------------

  removeCourseFromCart(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return {
        success: false,
        cart: null,
        message: 'Cart item not found.'
      };
    }

    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cartId) || null;
    if (cart) {
      this._recalculateCartTotal(cart.id);
    }

    const updatedCarts = this._getFromStorage('carts');
    const updatedCart = cart ? updatedCarts.find(c => c.id === cart.id) : null;

    return {
      success: true,
      cart: updatedCart,
      message: 'Course removed from cart.'
    };
  }

  // ---------------------------------
  // getCleanupEstimatorOptions
  // ---------------------------------

  getCleanupEstimatorOptions() {
    return {
      primaryContaminantOptions: [
        { code: 'lead_in_soil', label: 'Lead in soil' },
        { code: 'petroleum_hydrocarbons', label: 'Petroleum hydrocarbons' },
        { code: 'chlorinated_solvents', label: 'Chlorinated solvents' },
        { code: 'metals', label: 'Metals' },
        { code: 'vocs', label: 'VOCs' },
        { code: 'svocs', label: 'SVOCs' },
        { code: 'pesticides', label: 'Pesticides' },
        { code: 'pcbs', label: 'PCBs' }
      ],
      treatmentMethodOptions: [
        { code: 'excavation_and_off_site_disposal', label: 'Excavation and off-site disposal' },
        { code: 'in_situ_treatment', label: 'In situ treatment' },
        { code: 'pump_and_treat', label: 'Pump and treat' },
        { code: 'soil_vapor_extraction', label: 'Soil vapor extraction' },
        { code: 'monitored_natural_attenuation', label: 'Monitored natural attenuation' }
      ],
      disposalOptionOptions: [
        { code: 'hazardous_waste_landfill', label: 'Hazardous waste landfill' },
        { code: 'stabilization_and_local_landfill', label: 'Stabilization and local landfill' },
        { code: 'non_hazardous_landfill', label: 'Non-hazardous landfill' },
        { code: 'onsite_treatment_and_reuse', label: 'Onsite treatment and reuse' }
      ]
    };
  }

  // ---------------------------------
  // getCleanupCostEstimate
  // ---------------------------------

  getCleanupCostEstimate(siteAreaAcres, primaryContaminant, treatmentMethod, disposalOption) {
    return this._calculateCleanupCost(siteAreaAcres, primaryContaminant, treatmentMethod, disposalOption);
  }

  // ---------------------------------
  // saveCleanupEstimate
  // ---------------------------------

  saveCleanupEstimate(siteAreaAcres, primaryContaminant, treatmentMethod, disposalOption, estimatedTotalCost, name) {
    const estimates = this._getFromStorage('cleanup_estimates');
    const savedItems = this._getFromStorage('saved_items');

    const now = this._now();
    const estimate = {
      id: this._generateId('cleanup'),
      name: name || '',
      siteAreaAcres: Number(siteAreaAcres),
      primaryContaminant,
      treatmentMethod,
      disposalOption,
      estimatedTotalCost: Number(estimatedTotalCost),
      createdAt: now,
      updatedAt: now
    };

    estimates.push(estimate);
    this._saveToStorage('cleanup_estimates', estimates);

    const savedItem = {
      id: this._generateId('saved'),
      contentType: 'cleanup_estimate',
      contentId: estimate.id,
      savedAt: now
    };

    savedItems.push(savedItem);
    this._saveToStorage('saved_items', savedItems);

    return {
      cleanupEstimate: estimate,
      savedItem
    };
  }

  // ---------------------------------
  // getComplianceAuditInfo
  // ---------------------------------

  getComplianceAuditInfo() {
    return {
      serviceOverview:
        'On-site EHS compliance audits covering RCRA, Clean Air Act, Stormwater (NPDES), and other regulatory programs.',
      regulationOptions: [
        'RCRA',
        'Clean Air Act',
        'Stormwater (NPDES)',
        'Clean Water Act',
        'EPCRA',
        'TSCA'
      ],
      industryOptions: [
        'manufacturing',
        'warehousing',
        'oil_and_gas',
        'utilities',
        'healthcare',
        'education',
        'other'
      ],
      timeOfDayOptions: [
        'morning_8_12',
        'afternoon_12_5',
        'full_day',
        'flexible'
      ]
    };
  }

  // ---------------------------------
  // submitComplianceAuditRequest
  // ---------------------------------

  submitComplianceAuditRequest(
    industry,
    employeeCount,
    focusRcra,
    focusCleanAirAct,
    focusStormwaterNpdes,
    focusOther,
    facilityName,
    facilityCity,
    facilityState,
    preferredWeekStart,
    preferredTimeOfDay,
    contactPhone
  ) {
    const requests = this._getFromStorage('compliance_audit_requests');

    const now = this._now();
    const request = {
      id: this._generateId('audit'),
      industry,
      employeeCount: Number(employeeCount),
      focusRcra: !!focusRcra,
      focusCleanAirAct: !!focusCleanAirAct,
      focusStormwaterNpdes: !!focusStormwaterNpdes,
      focusOther: focusOther || '',
      facilityName: facilityName || '',
      facilityCity: facilityCity || '',
      facilityState: facilityState || '',
      preferredWeekStart: this._toISODateTime(preferredWeekStart),
      preferredTimeOfDay,
      contactPhone,
      status: 'submitted',
      createdAt: now,
      updatedAt: now
    };

    requests.push(request);
    this._saveToStorage('compliance_audit_requests', requests);

    return {
      auditRequest: request,
      message: 'Compliance audit request submitted.'
    };
  }

  // ---------------------------------
  // getMonitoringPlanOptions
  // ---------------------------------

  getMonitoringPlanOptions() {
    return {
      samplingFrequencyOptions: [
        { code: 'monthly', label: 'Monthly' },
        { code: 'quarterly', label: 'Quarterly' },
        { code: 'semi_annual', label: 'Semi-annual' },
        { code: 'annual', label: 'Annual' }
      ],
      planDurationOptions: [
        { code: 'one_year', label: '1 year' },
        { code: 'three_years', label: '3 years' },
        { code: 'five_years', label: '5 years' },
        { code: 'custom', label: 'Custom' }
      ],
      paymentMethodOptions: [
        { code: 'invoice_annually', label: 'Invoice annually' },
        { code: 'invoice_quarterly', label: 'Invoice quarterly' },
        { code: 'pay_upfront', label: 'Pay upfront' },
        { code: 'invoice_per_event', label: 'Invoice per sampling event' }
      ]
    };
  }

  // ---------------------------------
  // getMonitoringPlanCostEstimate
  // ---------------------------------

  getMonitoringPlanCostEstimate(numberOfWells, samplingFrequency, planDuration) {
    return this._calculateMonitoringPlanAnnualCost(numberOfWells, samplingFrequency, planDuration);
  }

  // ---------------------------------
  // saveMonitoringPlan
  // ---------------------------------

  saveMonitoringPlan(numberOfWells, samplingFrequency, planDuration, estimatedAnnualCost, paymentMethod) {
    const plans = this._getFromStorage('monitoring_plans');
    const savedItems = this._getFromStorage('saved_items');

    const now = this._now();
    const plan = {
      id: this._generateId('monitoring'),
      numberOfWells: Number(numberOfWells),
      samplingFrequency,
      planDuration,
      estimatedAnnualCost: Number(estimatedAnnualCost),
      paymentMethod,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    plans.push(plan);
    this._saveToStorage('monitoring_plans', plans);

    const savedItem = {
      id: this._generateId('saved'),
      contentType: 'monitoring_plan',
      contentId: plan.id,
      savedAt: now
    };

    savedItems.push(savedItem);
    this._saveToStorage('saved_items', savedItems);

    return {
      monitoringPlan: plan,
      savedItem
    };
  }

  // ---------------------------------
  // getNewsletterTopics
  // ---------------------------------

  getNewsletterTopics() {
    return this._getFromStorage('newsletter_topics');
  }

  // ---------------------------------
  // createOrUpdateNewsletterSubscription
  // ---------------------------------

  createOrUpdateNewsletterSubscription(email, topicPreferences) {
    let subs = this._getFromStorage('newsletter_subscriptions');
    let prefs = this._getFromStorage('newsletter_topic_preferences');

    let subscription = this._getActiveNewsletterSubscription();
    const now = this._now();

    if (!subscription) {
      subscription = {
        id: this._generateId('newsletter_sub'),
        email,
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      subs.push(subscription);
    } else {
      subscription.email = email;
      subscription.updatedAt = now;
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    const updatedPreferences = [];
    const subscriptionId = subscription.id;

    if (Array.isArray(topicPreferences)) {
      for (const tp of topicPreferences) {
        if (!tp || !tp.topicId || !tp.frequency) continue;
        let pref = prefs.find(p => p.subscriptionId === subscriptionId && p.topicId === tp.topicId);
        if (!pref) {
          pref = {
            id: this._generateId('ntpref'),
            subscriptionId,
            topicId: tp.topicId,
            frequency: tp.frequency,
            createdAt: now,
            updatedAt: null
          };
          prefs.push(pref);
        } else {
          pref.frequency = tp.frequency;
          pref.updatedAt = now;
        }
        updatedPreferences.push(pref);
      }
    }

    this._saveToStorage('newsletter_topic_preferences', prefs);

    return {
      subscription,
      topicPreferences: updatedPreferences
    };
  }

  // ---------------------------------
  // getNewsletterSubscriptionStatus
  // ---------------------------------

  getNewsletterSubscriptionStatus() {
    const subscription = this._getActiveNewsletterSubscription();
    if (!subscription) {
      return {
        subscription: null,
        topicPreferences: []
      };
    }

    const prefs = this._getFromStorage('newsletter_topic_preferences');
    const topics = this._getFromStorage('newsletter_topics');

    const relevantPrefs = prefs.filter(p => p.subscriptionId === subscription.id);
    const topicPreferences = relevantPrefs.map(p => ({
      preference: p,
      topic: topics.find(t => t.id === p.topicId) || null
    }));

    return {
      subscription,
      topicPreferences
    };
  }

  // ---------------------------------
  // getCompanyProfile
  // ---------------------------------

  getCompanyProfile() {
    return {
      history:
        'Our firm has provided environmental consulting and remediation services for a broad range of industries, supporting brownfield redevelopment, compliance, and risk management.',
      mission:
        'To deliver practical, science-based solutions that protect human health and the environment while supporting our clients’ business objectives.',
      certifications: [
        'Professional Geologists (PG)',
        'Professional Engineers (PE)',
        'Certified Hazardous Materials Managers (CHMM)'
      ],
      coreExpertiseAreas: [
        'Environmental site assessments',
        'Remediation system design and implementation',
        'Regulatory compliance and permitting',
        'Long-term monitoring and data management'
      ],
      generalContactPhone: '+1 (000) 000-0000',
      generalContactEmail: 'info@example-environmental.com',
      mailingAddress: 'Environmental Consulting Co., 123 Main Street, Anytown, USA',
      emergencyContactProcedures:
        'For active clients with emergency spill response coverage, call your primary project manager or the regional emergency number listed on your contract documentation.'
    };
  }

  // ---------------------------------
  // submitContactInquiry
  // ---------------------------------

  submitContactInquiry(name, email, phone, topic, message) {
    const inquiries = this._getFromStorage('contact_inquiries');

    const inquiry = {
      id: this._generateId('contact'),
      name,
      email,
      phone: phone || '',
      topic: topic || '',
      message,
      createdAt: this._now()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Your inquiry has been submitted.'
    };
  }

  // ---------------------------------
  // getLegalAndPrivacyContent
  // ---------------------------------

  getLegalAndPrivacyContent() {
    const termsOfUseHtml = '<h1>Terms of Use</h1><p>Use of this website is subject to applicable laws and professional standards.</p>';
    const privacyPolicyHtml = '<h1>Privacy Policy</h1><p>We use your information to respond to inquiries and provide requested services.</p>';
    const cookiePolicyHtml = '<h1>Cookie Policy</h1><p>This site may use cookies or similar technologies for basic functionality and analytics.</p>';

    return {
      termsOfUseHtml,
      privacyPolicyHtml,
      cookiePolicyHtml,
      legalContactEmail: 'legal@example-environmental.com'
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
