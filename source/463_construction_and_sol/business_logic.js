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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    const keys = [
      'solar_panel_models',
      'residential_solar_quote_requests',
      'packages',
      'package_add_ons',
      'package_bookings',
      'financing_plan_definitions',
      'financing_quotes',
      'financing_quote_options',
      'financing_applications',
      'service_locations',
      'commercial_consultation_requests',
      'energy_bundles',
      'savings_estimates',
      'bundle_quote_requests',
      'battery_products',
      'battery_installation_requests',
      'maintenance_plans',
      'maintenance_plan_enrollments',
      'articles',
      'reading_list_items',
      'newsletter_subscriptions',
      'emergency_service_requests',
      'general_contact_requests',
      'user_context'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        // user_context is an object, others are arrays
        if (key === 'user_context') {
          localStorage.setItem(key, JSON.stringify({}));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) {
      return key === 'user_context' ? {} : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // Fallback to empty on parse error
      return key === 'user_context' ? {} : [];
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

  // -------------------------
  // Generic helpers
  // -------------------------

  _formatCurrency(amount) {
    if (typeof amount !== 'number' || !isFinite(amount)) return '$0.00';
    return '$' + amount.toFixed(2);
  }

  _parseISODate(dateStr) {
    // returns Date or null
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _daysBetween(start, end) {
    const ms = end.getTime() - start.getTime();
    return ms / (1000 * 60 * 60 * 24);
  }

  _minutesBetween(start, end) {
    const ms = end.getTime() - start.getTime();
    return ms / (1000 * 60);
  }

  _findById(storageKey, id) {
    const list = this._getFromStorage(storageKey);
    return list.find(item => item.id === id) || null;
  }

  _updateInStorage(storageKey, id, updater) {
    const list = this._getFromStorage(storageKey);
    const idx = list.findIndex(item => item.id === id);
    if (idx === -1) return null;
    const updated = updater(list[idx]);
    list[idx] = updated;
    this._saveToStorage(storageKey, list);
    return updated;
  }

  // -------------------------
  // Helper functions from spec
  // -------------------------

  _getOrCreateUserContext() {
    let ctx = this._getFromStorage('user_context');
    if (!ctx || typeof ctx !== 'object') ctx = {};
    const defaults = {
      lastQuoteRequestId: null,
      lastPackageBookingId: null,
      lastFinancingQuoteId: null,
      lastSelectedFinancingOptionId: null,
      lastFinancingApplicationId: null,
      lastSavingsEstimateId: null,
      lastBundleQuoteRequestId: null,
      lastMaintenanceEnrollmentId: null,
      lastEmergencyRequestId: null,
      lastCommercialConsultationRequestId: null,
      lastBatteryInstallationRequestId: null
    };
    const merged = Object.assign({}, defaults, ctx);
    this._saveToStorage('user_context', merged);
    return merged;
  }

  _updateUserContext(patch) {
    const ctx = this._getOrCreateUserContext();
    const updated = Object.assign({}, ctx, patch || {});
    this._saveToStorage('user_context', updated);
    return updated;
  }

  _calculateFinancingOptionsFromDefinitions(financingQuote) {
    const definitions = this._getFromStorage('financing_plan_definitions').filter(d => d.isActive);
    const options = this._getFromStorage('financing_quote_options');

    const newOptions = [];
    for (const def of definitions) {
      const id = this._generateId('fopt');
      const termYears = def.termYears || 20;
      const apr = typeof def.aprPercent === 'number' ? def.aprPercent : 0;
      const principal = financingQuote.systemCost;

      const months = termYears * 12;
      let monthlyPayment;
      if (apr > 0) {
        const monthlyRate = apr / 100 / 12;
        const factor = Math.pow(1 + monthlyRate, months);
        monthlyPayment = principal * (monthlyRate * factor) / (factor - 1);
      } else {
        monthlyPayment = principal / months;
      }

      const yearsConsidered = Math.min(20, termYears);
      const totalPaidOver20Years = monthlyPayment * 12 * yearsConsidered;

      const option = {
        id,
        financingQuoteId: financingQuote.id,
        planDefinitionId: def.id,
        planType: def.planType,
        termYears,
        estimatedMonthlyPayment: monthlyPayment,
        totalPaidOver20Years,
        upfrontPayment: 0,
        isSelected: false
      };
      options.push(option);
      newOptions.push(option);
    }

    this._saveToStorage('financing_quote_options', options);

    // Attach foreign key resolutions for return
    const resolved = newOptions.map(opt => {
      const planDef = definitions.find(d => d.id === opt.planDefinitionId) || null;
      return Object.assign({}, opt, {
        planDefinition: planDef,
        financingQuote: financingQuote
      });
    });

    return resolved;
  }

  _calculateSavingsRecommendations(estimate) {
    const bundles = this._getFromStorage('energy_bundles').filter(b => b.isActive);

    // Simple strategy: recommend up to 10 bundles sorted by estimatedBillOffsetPercent descending
    const sorted = bundles.slice().sort((a, b) => {
      const ao = typeof a.estimatedBillOffsetPercent === 'number' ? a.estimatedBillOffsetPercent : 0;
      const bo = typeof b.estimatedBillOffsetPercent === 'number' ? b.estimatedBillOffsetPercent : 0;
      return bo - ao;
    });

    const recommendedBundles = sorted.slice(0, 10);
    const recommendedIds = recommendedBundles.map(b => b.id);

    // Persist on estimate
    const updatedEstimate = Object.assign({}, estimate, {
      recommendedBundleIds: recommendedIds
    });

    const allEstimates = this._getFromStorage('savings_estimates');
    const idx = allEstimates.findIndex(e => e.id === estimate.id);
    if (idx !== -1) {
      allEstimates[idx] = updatedEstimate;
      this._saveToStorage('savings_estimates', allEstimates);
    }

    return {
      estimate: updatedEstimate,
      recommendedBundles
    };
  }

  _validateInstallationDateRange(startISO, endISO, options) {
    const start = this._parseISODate(startISO);
    const end = this._parseISODate(endISO);
    if (!start || !end) {
      throw new Error('Invalid date range');
    }
    if (end.getTime() < start.getTime()) {
      throw new Error('End date must be on or after start date');
    }
    if (options && typeof options.maxRangeDays === 'number') {
      const diff = this._daysBetween(start, end);
      if (diff > options.maxRangeDays) {
        throw new Error('Selected date range exceeds allowed maximum');
      }
    }
    return true;
  }

  // -------------------------
  // Home / generic content
  // -------------------------

  getHomePageContent() {
    return {
      hero: {
        headline: 'Roofing, Solar, and Storage Built for Long-Term Performance',
        subheadline: 'One contractor for your roof, solar panels, and batteries so everything works together.',
        primaryCtas: [
          { key: 'residential_solar_quote', label: 'Get a Solar Quote' },
          { key: 'roof_solar_packages', label: 'View Roof + Solar Packages' },
          { key: 'savings_calculator', label: 'Estimate Your Savings' },
          { key: 'emergency_service', label: '24/7 Emergency Repairs' }
        ]
      },
      serviceSummaries: [
        {
          serviceKey: 'solar',
          title: 'Solar Installation',
          description: 'Grid-tied and hybrid solar systems for homes and businesses.'
        },
        {
          serviceKey: 'roofing',
          title: 'Roofing Services',
          description: 'Full roof replacements, repairs, and integrated roof + solar projects.'
        },
        {
          serviceKey: 'batteries',
          title: 'Energy Storage',
          description: 'Home batteries and backup power solutions sized to your needs.'
        },
        {
          serviceKey: 'maintenance',
          title: 'Maintenance Plans',
          description: 'Annual roof inspections and solar cleanings to protect your investment.'
        },
        {
          serviceKey: 'financing',
          title: 'Financing & Payment Options',
          description: 'Loans, leases, and payment plans to fit your budget.'
        }
      ],
      quickLinks: [
        { key: 'financing', label: 'Financing & Payment Options' },
        { key: 'maintenance_plans', label: 'Maintenance Plans' },
        { key: 'resources_blog', label: 'Resources & Learning Center' }
      ],
      trustElements: {
        certifications: [
          'Licensed, bonded, and insured contractor',
          'NABCEP-certified solar professionals'
        ],
        warrantiesSummary: 'Industry-leading workmanship and product warranties on roofing, solar, and batteries.',
        testimonials: []
      }
    };
  }

  getSolarServicesOverview() {
    return {
      introText: 'We design and install solar energy systems for both homes and businesses, integrating them with roofing and energy storage where needed.',
      residentialSummary: 'Rooftop solar, ground mounts, and solar + battery systems tailored to your home and utility.',
      commercialSummary: 'Rooftop, carport, and ground-mount solar for offices, retail centers, warehouses, and more.',
      typicalResidentialProjects: [
        'Rooftop solar for single-family homes',
        'Solar + battery backup systems',
        'Roof replacement with integrated solar'
      ],
      typicalCommercialProjects: [
        'Solar carports for parking lots and garages',
        'Commercial rooftop solar on flat or pitched roofs',
        'Ground-mount solar for large sites'
      ],
      recommendedNextSteps: [
        { key: 'go_to_residential_solar', label: 'Explore Residential Solar' },
        { key: 'go_to_commercial_solar', label: 'Explore Commercial Solar' },
        { key: 'open_savings_calculator', label: 'Estimate Your Savings' },
        { key: 'view_financing', label: 'View Financing Options' }
      ]
    };
  }

  getResidentialSolarPageContent() {
    return {
      benefits: [
        'Lower your electric bill with clean, renewable energy.',
        'Increase your home value with a professionally installed solar system.',
        'Take advantage of available tax credits and incentives.',
        'Optimize performance with high-quality panels and inverters.'
      ],
      equipmentOverview: [
        'High-efficiency solar panels from leading manufacturers.',
        'String, microinverter, and optimizer-based designs.',
        'Monitoring options to track system performance.',
        'Optional battery storage for backup and load shifting.'
      ],
      installationProcessSteps: [
        'Site evaluation and system design.',
        'Permitting and utility interconnection.',
        'Installation, inspection, and activation.',
        'Ongoing monitoring and maintenance support.'
      ],
      relatedLinks: [
        { key: 'financing', label: 'Solar Financing Options' },
        { key: 'maintenance_plans', label: 'Solar Maintenance Plans' }
      ]
    };
  }

  // -------------------------
  // Residential solar panels & quotes
  // -------------------------

  getResidentialSolarPanelFilterOptions() {
    return {
      ratingOptions: [
        { minStars: 3, label: '3+ stars' },
        { minStars: 4, label: '4+ stars' },
        { minStars: 4.5, label: '4.5+ stars' },
        { minStars: 5, label: '5 stars only' }
      ],
      systemSizeStepKw: 0.5
    };
  }

  searchResidentialSolarPanels(filters) {
    const all = this._getFromStorage('solar_panel_models');
    const f = filters || {};

    const result = all.filter(p => {
      if (f.onlyActive !== false && !p.isActive) return false;
      if (typeof f.minRatingStars === 'number' && p.ratingStars < f.minRatingStars) return false;
      if (typeof f.maxRatingStars === 'number' && p.ratingStars > f.maxRatingStars) return false;
      if (typeof f.minPowerWatts === 'number' && p.ratedPowerWatts < f.minPowerWatts) return false;
      if (typeof f.maxPowerWatts === 'number' && p.ratedPowerWatts > f.maxPowerWatts) return false;
      return true;
    });

    return result.map(panel => ({
      panel,
      powerDisplay: panel.ratedPowerWatts + ' W',
      ratingDisplay: (typeof panel.ratingStars === 'number' ? panel.ratingStars.toFixed(1) : 'N/A') + ' / 5 stars'
    }));
  }

  getResidentialSolarAppointmentAvailability(projectZipCode, month, year) {
    // Simulate availability: all weekdays in the given month/year
    const availableDates = [];
    if (!projectZipCode || !month || !year) {
      return { zipCode: projectZipCode || '', availableDates };
    }

    const firstDay = new Date(year, month - 1, 1);
    const currentMonth = firstDay.getMonth();
    let d = firstDay;
    while (d.getMonth() === currentMonth) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        availableDates.push(d.toISOString().slice(0, 10));
      }
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }

    return { zipCode: projectZipCode, availableDates };
  }

  submitResidentialSolarQuoteRequest(
    systemSizeKw,
    panelModelId,
    minPanelRatingStars,
    projectZipCode,
    preferredSiteVisitDate,
    contactName,
    contactEmail,
    contactPhone,
    sourcePage,
    notes
  ) {
    if (typeof systemSizeKw !== 'number' || systemSizeKw <= 0) {
      throw new Error('systemSizeKw must be a positive number');
    }
    if (!panelModelId) throw new Error('panelModelId is required');
    if (!projectZipCode) throw new Error('projectZipCode is required');
    if (!preferredSiteVisitDate) throw new Error('preferredSiteVisitDate is required');
    if (!contactName || !contactEmail || !contactPhone) {
      throw new Error('contactName, contactEmail, and contactPhone are required');
    }

    const panel = this._findById('solar_panel_models', panelModelId);
    if (!panel) {
      throw new Error('Selected panel model not found');
    }
    if (typeof minPanelRatingStars === 'number' && panel.ratingStars < minPanelRatingStars) {
      throw new Error('Selected panel does not meet minimum rating requirement');
    }

    const preferredDate = this._parseISODate(preferredSiteVisitDate);
    if (!preferredDate) throw new Error('Invalid preferredSiteVisitDate');

    const id = this._generateId('rsq');
    const now = new Date().toISOString();

    const quoteRequest = {
      id,
      createdAt: now,
      systemSizeKw,
      panelModelId,
      panelModelName: panel.name,
      minPanelRatingStars: typeof minPanelRatingStars === 'number' ? minPanelRatingStars : null,
      projectZipCode,
      preferredSiteVisitDate: preferredDate.toISOString(),
      contactName,
      contactEmail,
      contactPhone,
      status: 'submitted',
      notes: notes || null,
      sourcePage: sourcePage || 'solar_residential'
    };

    const all = this._getFromStorage('residential_solar_quote_requests');
    all.push(quoteRequest);
    this._saveToStorage('residential_solar_quote_requests', all);

    this._updateUserContext({ lastQuoteRequestId: id });

    const resolved = Object.assign({}, quoteRequest, {
      panelModel: panel
    });

    return {
      quoteRequest: resolved,
      message: 'Residential solar quote request submitted.'
    };
  }

  getResidentialSolarQuoteResult(quoteRequestId) {
    if (!quoteRequestId) throw new Error('quoteRequestId is required');
    const quote = this._findById('residential_solar_quote_requests', quoteRequestId);
    if (!quote) {
      throw new Error('Quote request not found');
    }
    const panel = this._findById('solar_panel_models', quote.panelModelId);

    let statusDisplay;
    switch (quote.status) {
      case 'draft':
        statusDisplay = 'Draft';
        break;
      case 'submitted':
        statusDisplay = 'Submitted - awaiting review';
        break;
      case 'in_progress':
        statusDisplay = 'In progress';
        break;
      case 'completed':
        statusDisplay = 'Completed';
        break;
      case 'cancelled':
        statusDisplay = 'Cancelled';
        break;
      default:
        statusDisplay = 'Unknown';
    }

    const resolvedQuote = Object.assign({}, quote, {
      panelModel: panel || null
    });

    return {
      quoteRequest: resolvedQuote,
      statusDisplay
    };
  }

  // -------------------------
  // Commercial solar & locations
  // -------------------------

  getCommercialSolarPageContent() {
    return {
      introText: 'From carports to rooftop systems, we design commercial solar projects that align with your operational goals.',
      serviceTypes: [
        {
          key: 'commercial_rooftop',
          label: 'Commercial Rooftop',
          description: 'Solar arrays on flat or low-slope commercial roofs.'
        },
        {
          key: 'solar_carport',
          label: 'Solar Carports',
          description: 'Covered parking structures that generate clean energy.'
        },
        {
          key: 'ground_mount',
          label: 'Ground Mount',
          description: 'Ground-mounted solar for large open areas.'
        },
        {
          key: 'battery_storage',
          label: 'Battery Storage',
          description: 'Commercial energy storage for demand management and backup.'
        }
      ],
      carportHighlight: 'Solar carports transform parking lots into energy-producing assets while providing shade and weather protection.',
      ctaOptions: [
        { key: 'request_commercial_consultation', label: 'Request a Commercial Consultation' },
        { key: 'view_service_locations', label: 'Find a Service Location' }
      ]
    };
  }

  searchServiceLocations(zipCode, city, serviceType) {
    const all = this._getFromStorage('service_locations').filter(l => l.isActive);

    let filtered = all;
    if (serviceType) {
      filtered = filtered.filter(l => Array.isArray(l.servicesOffered) && l.servicesOffered.indexOf(serviceType) !== -1);
    }

    if (zipCode) {
      filtered = filtered.filter(l => {
        if (!l.zipCode) return true;
        if (l.zipCode === zipCode) return true;
        // Fallback: treat ZIP codes with matching first 3 digits as "nearby"
        return String(l.zipCode).slice(0, 3) === String(zipCode).slice(0, 3);
      });
    } else if (city) {
      const cityLower = city.toLowerCase();
      filtered = filtered.filter(l => (l.city || '').toLowerCase() === cityLower);
    }

    let searchCenter = {
      zipCode: zipCode || '',
      latitude: null,
      longitude: null
    };

    if (zipCode) {
      const exact = all.find(l => l.zipCode === zipCode && typeof l.latitude === 'number' && typeof l.longitude === 'number');
      if (exact) {
        searchCenter = {
          zipCode,
          latitude: exact.latitude,
          longitude: exact.longitude
        };
      }
    }

    function haversineMiles(lat1, lon1, lat2, lon2) {
      if ([lat1, lon1, lat2, lon2].some(v => typeof v !== 'number')) return null;
      const R = 3958.8; // miles
      const toRad = d => (d * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    const locationsWithDistance = filtered.map(l => {
      const distanceMiles = searchCenter.latitude != null && searchCenter.longitude != null
        ? haversineMiles(searchCenter.latitude, searchCenter.longitude, l.latitude, l.longitude)
        : null;
      return { location: l, distanceMiles };
    });

    locationsWithDistance.sort((a, b) => {
      if (a.distanceMiles == null && b.distanceMiles == null) return 0;
      if (a.distanceMiles == null) return 1;
      if (b.distanceMiles == null) return -1;
      return a.distanceMiles - b.distanceMiles;
    });

    return {
      searchCenter,
      locations: locationsWithDistance
    };
  }

  getServiceLocationDetails(locationId) {
    if (!locationId) throw new Error('locationId is required');
    const location = this._findById('service_locations', locationId);
    if (!location) throw new Error('Service location not found');

    const serviceLabels = {
      commercial_solar: 'Commercial Solar',
      solar_carport: 'Solar Carports',
      roofing: 'Roofing',
      residential_solar: 'Residential Solar',
      battery_storage: 'Battery Storage'
    };

    const servicesOfferedDisplay = (location.servicesOffered || []).map(key => serviceLabels[key] || key);

    const coverageAreaDescription = location.city && location.state
      ? 'Serving ' + location.city + ', ' + location.state + ' and surrounding areas.'
      : 'Serving the local region.';

    return {
      location,
      coverageAreaDescription,
      servicesOfferedDisplay
    };
  }

  submitCommercialConsultationRequest(
    locationId,
    serviceType,
    projectZipCode,
    numberOfParkingSpaces,
    contactName,
    contactEmail,
    contactPhone,
    notes
  ) {
    if (!locationId) throw new Error('locationId is required');
    if (!serviceType) throw new Error('serviceType is required');
    if (!contactName || !contactEmail || !contactPhone) {
      throw new Error('contactName, contactEmail, and contactPhone are required');
    }

    const validServiceTypes = ['solar_carport', 'commercial_rooftop', 'ground_mount', 'battery_storage', 'other'];
    if (validServiceTypes.indexOf(serviceType) === -1) {
      throw new Error('Invalid serviceType');
    }

    const location = this._findById('service_locations', locationId);
    if (!location) throw new Error('Service location not found');

    const id = this._generateId('ccr');
    const now = new Date().toISOString();

    const request = {
      id,
      createdAt: now,
      locationId,
      serviceType,
      projectZipCode: projectZipCode || null,
      numberOfParkingSpaces: typeof numberOfParkingSpaces === 'number' ? numberOfParkingSpaces : null,
      contactName,
      contactEmail,
      contactPhone,
      status: 'submitted',
      notes: notes || null
    };

    const all = this._getFromStorage('commercial_consultation_requests');
    all.push(request);
    this._saveToStorage('commercial_consultation_requests', all);

    this._updateUserContext({ lastCommercialConsultationRequestId: id });

    const resolved = Object.assign({}, request, {
      location
    });

    return {
      consultationRequest: resolved,
      message: 'Commercial consultation request submitted.'
    };
  }

  // -------------------------
  // Packages & bookings
  // -------------------------

  getPackageFilterOptions() {
    const packages = this._getFromStorage('packages').filter(p => p.isActive);

    let minPrice = null;
    let maxPrice = null;
    for (const p of packages) {
      if (typeof p.basePrice !== 'number') continue;
      if (minPrice == null || p.basePrice < minPrice) minPrice = p.basePrice;
      if (maxPrice == null || p.basePrice > maxPrice) maxPrice = p.basePrice;
    }

    return {
      categories: [
        { key: 'roof_solar_packages', label: 'Roof + Solar Packages' }
      ],
      roofMaterials: [
        { value: 'asphalt_shingles', label: 'Asphalt Shingles' },
        { value: 'metal', label: 'Metal' },
        { value: 'tile', label: 'Tile' },
        { value: 'flat_roof_membrane', label: 'Flat Roof Membrane' },
        { value: 'wood_shingles', label: 'Wood Shingles' },
        { value: 'other', label: 'Other' }
      ],
      sortOptions: [
        { key: 'price_asc', label: 'Price: Low to High' },
        { key: 'price_desc', label: 'Price: High to Low' }
      ],
      priceRange: {
        minPrice: minPrice == null ? 0 : minPrice,
        maxPrice: maxPrice == null ? 0 : maxPrice
      }
    };
  }

  searchPackages(filters, sortKey) {
    const all = this._getFromStorage('packages');
    const f = filters || {};

    let list = all.filter(p => {
      if (f.onlyActive !== false && !p.isActive) return false;
      if (f.categoryKey && p.categoryKey !== f.categoryKey) return false;
      if (typeof f.maxPrice === 'number' && typeof p.basePrice === 'number' && p.basePrice > f.maxPrice) return false;
      if (f.roofMaterial && p.roofMaterial !== f.roofMaterial) return false;
      if (typeof f.minSolarCapacityKw === 'number' && p.solarCapacityKw < f.minSolarCapacityKw) return false;
      return true;
    });

    if (sortKey === 'price_asc') {
      list = list.slice().sort((a, b) => {
        const pa = typeof a.basePrice === 'number' ? a.basePrice : 0;
        const pb = typeof b.basePrice === 'number' ? b.basePrice : 0;
        return pa - pb;
      });
    } else if (sortKey === 'price_desc') {
      list = list.slice().sort((a, b) => {
        const pa = typeof a.basePrice === 'number' ? a.basePrice : 0;
        const pb = typeof b.basePrice === 'number' ? b.basePrice : 0;
        return pb - pa;
      });
    }

    const roofLabels = {
      asphalt_shingles: 'Asphalt Shingles',
      metal: 'Metal',
      tile: 'Tile',
      flat_roof_membrane: 'Flat Roof Membrane',
      wood_shingles: 'Wood Shingles',
      other: 'Other'
    };

    return list.map(pkg => {
      const priceDisplay = this._formatCurrency(typeof pkg.basePrice === 'number' ? pkg.basePrice : 0);
      const roofLabel = roofLabels[pkg.roofMaterial] || pkg.roofMaterial;
      const summary = pkg.solarCapacityKw + ' kW solar + ' + roofLabel + ' roof';
      return { package: pkg, priceDisplay, summary };
    });
  }

  getPackageDetailsWithAddOns(packageId) {
    if (!packageId) throw new Error('packageId is required');
    const pkg = this._findById('packages', packageId);
    if (!pkg) throw new Error('Package not found');

    const allAddOns = this._getFromStorage('package_add_ons').filter(a => a.packageId === packageId && a.isActive);

    const addOns = allAddOns.map(a => Object.assign({}, a, { package: pkg }));

    const eligibilityNotes = 'Final eligibility and pricing will be confirmed after site inspection.';

    return {
      package: pkg,
      addOns,
      eligibilityNotes
    };
  }

  createOrUpdatePackageBooking(packageId, selectedAddOnIds, installationStartDate, installationEndDate, notes) {
    if (!packageId) throw new Error('packageId is required');
    if (!installationStartDate || !installationEndDate) {
      throw new Error('installationStartDate and installationEndDate are required');
    }

    const pkg = this._findById('packages', packageId);
    if (!pkg) throw new Error('Package not found');

    this._validateInstallationDateRange(installationStartDate, installationEndDate, { maxRangeDays: 60 });

    const allBookings = this._getFromStorage('package_bookings');
    const ctx = this._getOrCreateUserContext();

    let booking = null;
    if (ctx.lastPackageBookingId) {
      booking = allBookings.find(b => b.id === ctx.lastPackageBookingId && b.packageId === packageId) || null;
    }

    const addOnIds = Array.isArray(selectedAddOnIds) ? selectedAddOnIds.slice() : [];

    const allAddOns = this._getFromStorage('package_add_ons');
    const addOnsForPackage = allAddOns.filter(a => a.packageId === packageId && a.isActive);

    const selectedAddOns = addOnIds
      .map(id => addOnsForPackage.find(a => a.id === id))
      .filter(a => !!a);

    let totalPrice = typeof pkg.basePrice === 'number' ? pkg.basePrice : 0;
    for (const addOn of selectedAddOns) {
      if (typeof addOn.price === 'number') {
        totalPrice += addOn.price;
      }
    }

    const now = new Date().toISOString();

    if (!booking) {
      const id = this._generateId('pkgbook');
      booking = {
        id,
        createdAt: now,
        packageId,
        selectedAddOnIds: addOnIds,
        installationStartDate: this._parseISODate(installationStartDate).toISOString(),
        installationEndDate: this._parseISODate(installationEndDate).toISOString(),
        totalPrice,
        status: 'in_progress',
        notes: notes || null
      };
      allBookings.push(booking);
    } else {
      booking = Object.assign({}, booking, {
        selectedAddOnIds: addOnIds,
        installationStartDate: this._parseISODate(installationStartDate).toISOString(),
        installationEndDate: this._parseISODate(installationEndDate).toISOString(),
        totalPrice,
        notes: notes || booking.notes || null
      });
      const idx = allBookings.findIndex(b => b.id === booking.id);
      allBookings[idx] = booking;
    }

    this._saveToStorage('package_bookings', allBookings);
    this._updateUserContext({ lastPackageBookingId: booking.id });

    const resolvedBooking = Object.assign({}, booking, {
      package: pkg,
      selectedAddOns: selectedAddOns.map(a => Object.assign({}, a, { package: pkg }))
    });

    return {
      booking: resolvedBooking,
      totalPriceDisplay: this._formatCurrency(totalPrice),
      message: 'Package booking saved.'
    };
  }

  getPackageBookingSummary(bookingId) {
    if (!bookingId) throw new Error('bookingId is required');
    const booking = this._findById('package_bookings', bookingId);
    if (!booking) throw new Error('Package booking not found');

    const pkg = this._findById('packages', booking.packageId);
    const allAddOns = this._getFromStorage('package_add_ons');
    const addOns = (booking.selectedAddOnIds || [])
      .map(id => allAddOns.find(a => a.id === id))
      .filter(a => !!a)
      .map(a => Object.assign({}, a, { package: pkg }));

    let totalPrice = booking.totalPrice;
    if (typeof totalPrice !== 'number') {
      totalPrice = typeof pkg.basePrice === 'number' ? pkg.basePrice : 0;
      for (const addOn of addOns) {
        if (typeof addOn.price === 'number') totalPrice += addOn.price;
      }
    }

    const resolvedBooking = Object.assign({}, booking, {
      package: pkg,
      selectedAddOns: addOns
    });

    return {
      booking: resolvedBooking,
      package: pkg,
      addOns,
      totalPriceDisplay: this._formatCurrency(totalPrice)
    };
  }

  // -------------------------
  // Savings calculator & bundles
  // -------------------------

  getSavingsCalculatorConfig() {
    return {
      minBillAmount: 0,
      maxBillAmount: 2000,
      supportedRegionsNote: 'Estimates are currently calibrated for U.S. service territories.',
      bundleTypes: [
        { key: 'solar_only', label: 'Solar Only' },
        { key: 'solar_plus_battery', label: 'Solar + Battery' }
      ]
    };
  }

  calculateSavingsEstimate(monthlyBillAmount, zipCode) {
    if (typeof monthlyBillAmount !== 'number' || monthlyBillAmount <= 0) {
      throw new Error('monthlyBillAmount must be a positive number');
    }
    if (!zipCode) throw new Error('zipCode is required');

    const id = this._generateId('se');
    const now = new Date().toISOString();

    const estimate = {
      id,
      createdAt: now,
      monthlyBillAmount,
      zipCode,
      recommendedBundleIds: [],
      selectedBundleId: null,
      estimatedOffsetPercentForSelected: null
    };

    const all = this._getFromStorage('savings_estimates');
    all.push(estimate);
    this._saveToStorage('savings_estimates', all);

    const { estimate: updatedEstimate, recommendedBundles } = this._calculateSavingsRecommendations(estimate);

    this._updateUserContext({ lastSavingsEstimateId: updatedEstimate.id });

    return {
      estimate: updatedEstimate,
      recommendedBundles
    };
  }

  setSelectedBundleForEstimate(estimateId, bundleId) {
    if (!estimateId) throw new Error('estimateId is required');
    if (!bundleId) throw new Error('bundleId is required');

    const bundles = this._getFromStorage('energy_bundles');
    const bundle = bundles.find(b => b.id === bundleId) || null;
    if (!bundle) throw new Error('Bundle not found');

    const allEstimates = this._getFromStorage('savings_estimates');
    const idx = allEstimates.findIndex(e => e.id === estimateId);
    if (idx === -1) throw new Error('Savings estimate not found');

    const estimate = Object.assign({}, allEstimates[idx], {
      selectedBundleId: bundleId,
      estimatedOffsetPercentForSelected: bundle.estimatedBillOffsetPercent
    });

    allEstimates[idx] = estimate;
    this._saveToStorage('savings_estimates', allEstimates);

    const estimateWithResolved = Object.assign({}, estimate, {
      selectedBundle: bundle
    });

    return {
      estimate: estimateWithResolved,
      selectedBundle: bundle
    };
  }

  getEnergyBundleDetails(bundleId) {
    if (!bundleId) throw new Error('bundleId is required');
    const bundle = this._findById('energy_bundles', bundleId);
    if (!bundle) throw new Error('Bundle not found');
    return bundle;
  }

  startBundleQuoteRequest(
    bundleId,
    monthlyBillAmount,
    zipCode,
    contactName,
    contactEmail,
    contactPhone,
    notes
  ) {
    if (!bundleId) throw new Error('bundleId is required');
    if (!contactName || !contactEmail || !contactPhone) {
      throw new Error('contactName, contactEmail, and contactPhone are required');
    }

    const bundle = this._findById('energy_bundles', bundleId);
    if (!bundle) throw new Error('Bundle not found');

    const id = this._generateId('bqr');
    const now = new Date().toISOString();

    const request = {
      id,
      createdAt: now,
      bundleId,
      monthlyBillAmount: typeof monthlyBillAmount === 'number' ? monthlyBillAmount : null,
      zipCode: zipCode || null,
      contactName,
      contactEmail,
      contactPhone,
      status: 'submitted',
      notes: notes || null
    };

    const all = this._getFromStorage('bundle_quote_requests');
    all.push(request);
    this._saveToStorage('bundle_quote_requests', all);

    this._updateUserContext({ lastBundleQuoteRequestId: id });

    const resolved = Object.assign({}, request, { bundle });

    return {
      bundleQuoteRequest: resolved,
      message: 'Bundle quote request submitted.'
    };
  }

  // -------------------------
  // Battery products & installation requests
  // -------------------------

  getBatteryFilterOptions() {
    const batteries = this._getFromStorage('battery_products').filter(b => b.isActive);
    let minCap = null;
    let maxCap = null;
    for (const b of batteries) {
      if (typeof b.usableCapacityKwh !== 'number') continue;
      if (minCap == null || b.usableCapacityKwh < minCap) minCap = b.usableCapacityKwh;
      if (maxCap == null || b.usableCapacityKwh > maxCap) maxCap = b.usableCapacityKwh;
    }

    return {
      minCapacityKwh: minCap == null ? 0 : minCap,
      maxCapacityKwh: maxCap == null ? 0 : maxCap,
      ratingOptions: [
        { minStars: 3, label: '3+ stars' },
        { minStars: 4, label: '4+ stars' },
        { minStars: 4.5, label: '4.5+ stars' },
        { minStars: 5, label: '5 stars only' }
      ]
    };
  }

  searchBatteryProducts(filters) {
    const all = this._getFromStorage('battery_products');
    const f = filters || {};

    return all.filter(b => {
      if (f.onlyActive !== false && !b.isActive) return false;
      if (typeof f.minUsableCapacityKwh === 'number' && b.usableCapacityKwh < f.minUsableCapacityKwh) return false;
      if (typeof f.maxUsableCapacityKwh === 'number' && b.usableCapacityKwh > f.maxUsableCapacityKwh) return false;
      if (typeof f.minRatingStars === 'number' && b.ratingStars < f.minRatingStars) return false;
      return true;
    });
  }

  getBatteryProductDetails(batteryProductId) {
    if (!batteryProductId) throw new Error('batteryProductId is required');
    const battery = this._findById('battery_products', batteryProductId);
    if (!battery) throw new Error('Battery product not found');
    return battery;
  }

  submitBatteryInstallationRequest(
    batteryProductId,
    quantity,
    projectZipCode,
    customerType,
    contactName,
    contactEmail,
    contactPhone,
    notes
  ) {
    if (!batteryProductId) throw new Error('batteryProductId is required');
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new Error('quantity must be a positive number');
    }
    if (!projectZipCode) throw new Error('projectZipCode is required');
    if (!customerType) throw new Error('customerType is required');
    if (!contactName || !contactEmail || !contactPhone) {
      throw new Error('contactName, contactEmail, and contactPhone are required');
    }

    const validCustomerTypes = ['existing_solar_customer', 'new_solar_customer', 'no_solar'];
    if (validCustomerTypes.indexOf(customerType) === -1) {
      throw new Error('Invalid customerType');
    }

    const battery = this._findById('battery_products', batteryProductId);
    if (!battery) throw new Error('Battery product not found');

    const id = this._generateId('batreq');
    const now = new Date().toISOString();

    const request = {
      id,
      createdAt: now,
      batteryProductId,
      quantity,
      projectZipCode,
      customerType,
      contactName,
      contactEmail,
      contactPhone,
      status: 'submitted',
      notes: notes || null
    };

    const all = this._getFromStorage('battery_installation_requests');
    all.push(request);
    this._saveToStorage('battery_installation_requests', all);

    this._updateUserContext({ lastBatteryInstallationRequestId: id });

    const resolved = Object.assign({}, request, {
      batteryProduct: battery
    });

    return {
      installationRequest: resolved,
      message: 'Battery installation request submitted.'
    };
  }

  // -------------------------
  // Maintenance plans & enrollments
  // -------------------------

  getMaintenancePlanFilterOptions() {
    const plans = this._getFromStorage('maintenance_plans').filter(p => p.isActive);
    let minPrice = null;
    let maxPrice = null;
    for (const p of plans) {
      if (typeof p.pricePerYear !== 'number') continue;
      if (minPrice == null || p.pricePerYear < minPrice) minPrice = p.pricePerYear;
      if (maxPrice == null || p.pricePerYear > maxPrice) maxPrice = p.pricePerYear;
    }

    return {
      serviceTypes: [
        { key: 'roof_inspection', label: 'Roof Inspection' },
        { key: 'solar_panel_cleaning', label: 'Solar Panel Cleaning' },
        { key: 'gutter_cleaning', label: 'Gutter Cleaning' }
      ],
      priceRangePerYear: {
        minPricePerYear: minPrice == null ? 0 : minPrice,
        maxPricePerYear: maxPrice == null ? 0 : maxPrice
      },
      billingFrequencies: ['annual', 'monthly', 'quarterly']
    };
  }

  searchMaintenancePlans(filters) {
    const all = this._getFromStorage('maintenance_plans');
    const f = filters || {};

    return all.filter(p => {
      if (f.onlyActive !== false && !p.isActive) return false;
      if (typeof f.maxPricePerYear === 'number' && p.pricePerYear > f.maxPricePerYear) return false;
      if (Array.isArray(f.requiredServices) && f.requiredServices.length > 0) {
        const services = p.includedServices || [];
        for (const s of f.requiredServices) {
          if (services.indexOf(s) === -1) return false;
        }
      }
      return true;
    });
  }

  getMaintenancePlanDetails(maintenancePlanId) {
    if (!maintenancePlanId) throw new Error('maintenancePlanId is required');
    const plan = this._findById('maintenance_plans', maintenancePlanId);
    if (!plan) throw new Error('Maintenance plan not found');
    return plan;
  }

  enrollInMaintenancePlan(
    maintenancePlanId,
    selectedBillingFrequency,
    firstServiceDate,
    contactName,
    contactEmail,
    notes
  ) {
    if (!maintenancePlanId) throw new Error('maintenancePlanId is required');
    if (!selectedBillingFrequency) throw new Error('selectedBillingFrequency is required');
    if (!firstServiceDate) throw new Error('firstServiceDate is required');
    if (!contactName || !contactEmail) {
      throw new Error('contactName and contactEmail are required');
    }

    const plan = this._findById('maintenance_plans', maintenancePlanId);
    if (!plan) throw new Error('Maintenance plan not found');

    const allowedFreqs = ['annual', 'monthly', 'quarterly'];
    if (allowedFreqs.indexOf(selectedBillingFrequency) === -1) {
      throw new Error('Invalid billing frequency');
    }
    if (Array.isArray(plan.availableBillingFrequencies) && plan.availableBillingFrequencies.length > 0) {
      if (plan.availableBillingFrequencies.indexOf(selectedBillingFrequency) === -1) {
        throw new Error('Selected billing frequency not available for this plan');
      }
    }

    const firstDate = this._parseISODate(firstServiceDate);
    if (!firstDate) throw new Error('Invalid firstServiceDate');
    const today = new Date();
    // Require first service date not more than 365 days in the future and not in the past
    if (firstDate.getTime() < today.getTime() - 24 * 60 * 60 * 1000) {
      throw new Error('First service date cannot be in the past');
    }
    const diffDays = this._daysBetween(today, firstDate);
    if (diffDays > 365) {
      throw new Error('First service date is too far in the future');
    }

    const id = this._generateId('mtenr');
    const now = new Date().toISOString();

    const enrollment = {
      id,
      createdAt: now,
      maintenancePlanId,
      selectedBillingFrequency,
      firstServiceDate: firstDate.toISOString(),
      contactName,
      contactEmail,
      status: 'pending',
      notes: notes || null
    };

    const all = this._getFromStorage('maintenance_plan_enrollments');
    all.push(enrollment);
    this._saveToStorage('maintenance_plan_enrollments', all);

    this._updateUserContext({ lastMaintenanceEnrollmentId: id });

    const resolved = Object.assign({}, enrollment, { maintenancePlan: plan });

    return {
      enrollment: resolved,
      message: 'Maintenance plan enrollment submitted.'
    };
  }

  getMaintenanceEnrollmentSummary(enrollmentId) {
    if (!enrollmentId) throw new Error('enrollmentId is required');
    const enrollment = this._findById('maintenance_plan_enrollments', enrollmentId);
    if (!enrollment) throw new Error('Enrollment not found');
    const plan = this._findById('maintenance_plans', enrollment.maintenancePlanId);

    const resolvedEnrollment = Object.assign({}, enrollment, {
      maintenancePlan: plan || null
    });

    return {
      enrollment: resolvedEnrollment,
      plan: plan || null
    };
  }

  // -------------------------
  // Financing
  // -------------------------

  getFinancingPageContent() {
    return {
      introText: 'We offer a range of financing options so you can go solar or replace your roof with predictable payments.',
      planTypes: [
        {
          planType: 'loan',
          title: 'Solar Loans',
          description: 'Own your system with fixed monthly payments and potential tax benefits.'
        },
        {
          planType: 'lease',
          title: 'Solar Leases',
          description: 'Pay for the power your system produces with little or no upfront cost.'
        }
      ]
    };
  }

  createFinancingQuoteWithOptions(systemCost, systemSizeKw) {
    if (typeof systemCost !== 'number' || systemCost <= 0) {
      throw new Error('systemCost must be a positive number');
    }

    const id = this._generateId('fq');
    const now = new Date().toISOString();

    const quote = {
      id,
      createdAt: now,
      systemSizeKw: typeof systemSizeKw === 'number' ? systemSizeKw : null,
      systemCost,
      notes: null
    };

    const allQuotes = this._getFromStorage('financing_quotes');
    allQuotes.push(quote);
    this._saveToStorage('financing_quotes', allQuotes);

    const options = this._calculateFinancingOptionsFromDefinitions(quote);

    this._updateUserContext({ lastFinancingQuoteId: id });

    return {
      financingQuote: quote,
      options
    };
  }

  selectFinancingQuoteOption(financingQuoteOptionId) {
    if (!financingQuoteOptionId) throw new Error('financingQuoteOptionId is required');

    const allOptions = this._getFromStorage('financing_quote_options');
    const option = allOptions.find(o => o.id === financingQuoteOptionId);
    if (!option) throw new Error('Financing quote option not found');

    const quoteId = option.financingQuoteId;

    const updatedOptions = allOptions.map(o => {
      if (o.financingQuoteId !== quoteId) return o;
      return Object.assign({}, o, {
        isSelected: o.id === financingQuoteOptionId
      });
    });

    this._saveToStorage('financing_quote_options', updatedOptions);

    const planDefinitions = this._getFromStorage('financing_plan_definitions');
    const quote = this._findById('financing_quotes', quoteId);

    const resolvedOptions = updatedOptions
      .filter(o => o.financingQuoteId === quoteId)
      .map(o => {
        const def = planDefinitions.find(d => d.id === o.planDefinitionId) || null;
        return Object.assign({}, o, {
          planDefinition: def,
          financingQuote: quote
        });
      });

    const selectedOption = resolvedOptions.find(o => o.id === financingQuoteOptionId) || null;

    this._updateUserContext({ lastSelectedFinancingOptionId: financingQuoteOptionId });

    return {
      selectedOption,
      allOptions: resolvedOptions
    };
  }

  startFinancingApplication(
    financingQuoteOptionId,
    contactName,
    contactEmail,
    contactPhone,
    notes
  ) {
    if (!financingQuoteOptionId) throw new Error('financingQuoteOptionId is required');
    if (!contactName || !contactEmail || !contactPhone) {
      throw new Error('contactName, contactEmail, and contactPhone are required');
    }

    const option = this._findById('financing_quote_options', financingQuoteOptionId);
    if (!option) throw new Error('Financing quote option not found');

    const quote = this._findById('financing_quotes', option.financingQuoteId);
    if (!quote) throw new Error('Financing quote not found for option');

    const id = this._generateId('fapp');
    const now = new Date().toISOString();

    const application = {
      id,
      createdAt: now,
      financingQuoteOptionId,
      planType: option.planType,
      systemCost: quote.systemCost,
      contactName,
      contactEmail,
      contactPhone,
      status: 'draft',
      notes: notes || null
    };

    const all = this._getFromStorage('financing_applications');
    all.push(application);
    this._saveToStorage('financing_applications', all);

    this._updateUserContext({ lastFinancingApplicationId: id });

    const nextStepHint = 'Complete your financing application by providing property and income details.';

    return {
      application,
      nextStepHint
    };
  }

  getFinancingApplicationStatus(applicationId) {
    if (!applicationId) throw new Error('applicationId is required');
    const application = this._findById('financing_applications', applicationId);
    if (!application) throw new Error('Financing application not found');

    const option = this._findById('financing_quote_options', application.financingQuoteOptionId);

    let statusDisplay;
    switch (application.status) {
      case 'draft':
        statusDisplay = 'Draft - not yet submitted';
        break;
      case 'submitted':
        statusDisplay = 'Submitted - in review';
        break;
      case 'in_review':
        statusDisplay = 'In review';
        break;
      case 'approved':
        statusDisplay = 'Approved';
        break;
      case 'declined':
        statusDisplay = 'Declined';
        break;
      case 'cancelled':
        statusDisplay = 'Cancelled';
        break;
      default:
        statusDisplay = 'Unknown';
    }

    const resolvedApplication = Object.assign({}, application, {
      financingQuoteOption: option || null
    });

    return {
      application: resolvedApplication,
      statusDisplay
    };
  }

  // -------------------------
  // Articles, reading list, newsletter
  // -------------------------

  getArticleSearchFilters() {
    const articles = this._getFromStorage('articles').filter(a => a.isPublished);
    const categorySet = {};
    const tagSet = {};

    for (const a of articles) {
      if (Array.isArray(a.categories)) {
        for (const c of a.categories) {
          if (c) categorySet[c] = true;
        }
      }
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          if (t) tagSet[t] = true;
        }
      }
    }

    return {
      categories: Object.keys(categorySet),
      tags: Object.keys(tagSet)
    };
  }

  searchArticles(query, filters) {
    const all = this._getFromStorage('articles').filter(a => a.isPublished);
    const f = filters || {};

    const q = (query || '').trim().toLowerCase();

    return all.filter(a => {
      if (q) {
        const haystack = ((a.title || '') + ' ' + (a.excerpt || '') + ' ' + (a.content || '')).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      if (f.category) {
        if (!Array.isArray(a.categories) || a.categories.indexOf(f.category) === -1) return false;
      }
      if (f.tag) {
        if (!Array.isArray(a.tags) || a.tags.indexOf(f.tag) === -1) return false;
      }
      return true;
    });
  }

  getArticleDetails(slug, articleId) {
    const all = this._getFromStorage('articles');
    let article = null;
    if (articleId) {
      article = all.find(a => a.id === articleId) || null;
    } else if (slug) {
      article = all.find(a => a.slug === slug) || null;
    }
    if (!article) throw new Error('Article not found');

    const readingItems = this._getFromStorage('reading_list_items');
    const isSavedToReadingList = readingItems.some(item => item.articleId === article.id);

    return {
      article,
      isSavedToReadingList
    };
  }

  saveArticleToReadingList(articleId, notes) {
    if (!articleId) throw new Error('articleId is required');
    const article = this._findById('articles', articleId);
    if (!article) throw new Error('Article not found');

    const id = this._generateId('rli');
    const now = new Date().toISOString();

    const item = {
      id,
      articleId,
      savedAt: now,
      notes: notes || null
    };

    const all = this._getFromStorage('reading_list_items');
    all.push(item);
    this._saveToStorage('reading_list_items', all);

    const resolved = Object.assign({}, item, {
      article
    });

    return resolved;
  }

  subscribeToNewsletterFromArticle(sourceArticleId, name, email) {
    if (!sourceArticleId) throw new Error('sourceArticleId is required');
    if (!name || !email) throw new Error('name and email are required');

    const article = this._findById('articles', sourceArticleId);
    if (!article) throw new Error('Article not found');

    const id = this._generateId('nls');
    const now = new Date().toISOString();

    const subscription = {
      id,
      createdAt: now,
      name,
      email,
      source: 'article_page',
      sourceArticleId,
      status: 'pending'
    };

    const all = this._getFromStorage('newsletter_subscriptions');
    all.push(subscription);
    this._saveToStorage('newsletter_subscriptions', all);

    return subscription;
  }

  // -------------------------
  // Emergency services
  // -------------------------

  getEmergencyServicesPageContent() {
    return {
      serviceTypes: [
        {
          serviceType: 'roof_leak_repair',
          label: 'Roof Leak Repair',
          description: 'Emergency tarping and leak repair to protect your home.'
        },
        {
          serviceType: 'solar_system_issue',
          label: 'Solar System Issue',
          description: 'Troubleshooting outages, errors, or damaged panels.'
        },
        {
          serviceType: 'electrical_hazard',
          label: 'Electrical Hazard',
          description: 'Responding to burning smells, sparking equipment, or exposed wiring.'
        },
        {
          serviceType: 'other',
          label: 'Other Emergency',
          description: 'If you are unsure which option to choose, select this one.'
        }
      ],
      urgencyOptions: [
        { urgency: 'same_day', label: 'Same-Day Service' },
        { urgency: 'next_day', label: 'Next-Day Service' },
        { urgency: 'scheduled', label: 'Schedule for a Future Date' }
      ],
      callbackWindowConfig: {
        minWindowMinutes: 60,
        maxWindowMinutes: 240
      }
    };
  }

  submitEmergencyServiceRequest(
    serviceType,
    urgency,
    callbackWindowStart,
    callbackWindowEnd,
    preferredContactMethod,
    contactName,
    contactPhone,
    contactEmail,
    zipCode,
    notes
  ) {
    if (!serviceType) throw new Error('serviceType is required');
    if (!urgency) throw new Error('urgency is required');
    if (!callbackWindowStart || !callbackWindowEnd) {
      throw new Error('callbackWindowStart and callbackWindowEnd are required');
    }
    if (!preferredContactMethod) throw new Error('preferredContactMethod is required');
    if (!contactName || !contactPhone) {
      throw new Error('contactName and contactPhone are required');
    }

    // Allow calls where contactEmail is omitted and ZIP code is passed in its place
    const zipLikeRegex = /^[0-9]{5}(?:-[0-9]{4})?$/;
    if ((!zipCode || !zipLikeRegex.test(String(zipCode))) && typeof contactEmail === 'string' && zipLikeRegex.test(contactEmail)) {
      if (!notes && zipCode && typeof zipCode === 'string') {
        notes = zipCode;
      }
      zipCode = contactEmail;
      contactEmail = null;
    }

    if (!zipCode) throw new Error('zipCode is required');

    const validServiceTypes = ['roof_leak_repair', 'solar_system_issue', 'electrical_hazard', 'other'];
    if (validServiceTypes.indexOf(serviceType) === -1) {
      throw new Error('Invalid serviceType');
    }

    const validUrgencies = ['same_day', 'next_day', 'scheduled'];
    if (validUrgencies.indexOf(urgency) === -1) {
      throw new Error('Invalid urgency');
    }

    const validContactMethods = ['phone_callback', 'email', 'sms', 'live_chat'];
    if (validContactMethods.indexOf(preferredContactMethod) === -1) {
      throw new Error('Invalid preferredContactMethod');
    }

    const start = this._parseISODate(callbackWindowStart);
    const end = this._parseISODate(callbackWindowEnd);
    if (!start || !end) throw new Error('Invalid callback window dates');
    if (end.getTime() <= start.getTime()) {
      throw new Error('Callback window end must be after start');
    }

    const config = this.getEmergencyServicesPageContent().callbackWindowConfig;
    const minutes = this._minutesBetween(start, end);
    if (typeof config.minWindowMinutes === 'number' && minutes < config.minWindowMinutes) {
      throw new Error('Callback window is too short');
    }
    if (typeof config.maxWindowMinutes === 'number' && minutes > config.maxWindowMinutes) {
      throw new Error('Callback window is too long');
    }

    const id = this._generateId('esr');
    const now = new Date().toISOString();

    const request = {
      id,
      createdAt: now,
      serviceType,
      urgency,
      preferredContactMethod,
      callbackWindowStart: start.toISOString(),
      callbackWindowEnd: end.toISOString(),
      contactName,
      contactPhone,
      contactEmail: contactEmail || null,
      zipCode,
      status: 'submitted',
      notes: notes || null
    };

    const all = this._getFromStorage('emergency_service_requests');
    all.push(request);
    this._saveToStorage('emergency_service_requests', all);

    this._updateUserContext({ lastEmergencyRequestId: id });

    return {
      emergencyRequest: request,
      message: 'Emergency service request submitted.'
    };
  }

  // -------------------------
  // Service areas, about, contact
  // -------------------------

  getServiceAreasPageContent() {
    return {
      introText: 'Use the search tools to find out if we service your area and which office will support your project.',
      usageTips: [
        'Search by ZIP code for the most accurate results.',
        'Filter by service type to find locations that handle your specific needs.',
        'Call the listed office if you have questions about coverage.'
      ]
    };
  }

  getAboutPageContent() {
    return {
      history: 'We are a regional contractor specializing in roofing and solar projects, with years of combined installation experience.',
      mission: 'To design and install durable, high-performing roof and solar systems that deliver long-term value to our customers.',
      values: [
        'Safety first on every job site',
        'Transparent pricing and communication',
        'Quality workmanship and materials',
        'Long-term customer support'
      ],
      licensesAndCertifications: [
        'Licensed roofing and electrical contractor',
        'NABCEP-certified PV professionals'
      ],
      serviceAreasSummary: 'We serve select metro areas and surrounding regions with dedicated local teams.',
      projectTypesSummary: 'From residential rooftops to large commercial carports, we handle a wide range of project types.',
      partnerLogos: []
    };
  }

  getContactPageContent() {
    return {
      phoneNumbers: ['1-800-000-0000'],
      emails: ['info@example-contractors.com'],
      officeAddresses: [],
      specializedFormLinks: [
        { key: 'solar_quote', label: 'Request a Solar Quote' },
        { key: 'maintenance_enrollment', label: 'Enroll in a Maintenance Plan' },
        { key: 'financing', label: 'Start Financing Application' },
        { key: 'emergency_service', label: '24/7 Emergency Service' }
      ]
    };
  }

  submitGeneralContactRequest(name, email, phone, message, topic) {
    if (!name || !email || !message) {
      throw new Error('name, email, and message are required');
    }

    const id = this._generateId('gcr');
    const now = new Date().toISOString();

    const request = {
      id,
      createdAt: now,
      name,
      email,
      phone: phone || null,
      message,
      topic: topic || null
    };

    const all = this._getFromStorage('general_contact_requests');
    all.push(request);
    this._saveToStorage('general_contact_requests', all);

    return {
      success: true,
      message: 'Your message has been received. We will follow up soon.'
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
