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
    // Initialize all data tables in localStorage if they do not exist
    const keys = [
      'residential_solar_packages',
      'solar_savings_estimates',
      'instant_quotes',
      'equipment_categories',
      'equipment_items',
      'project_items',
      'consultation_time_slots',
      'consultation_bookings',
      'financing_plans',
      'financing_pre_approval_applications',
      'blog_articles',
      'reading_list_items',
      'incentive_programs',
      'incentive_plans',
      'incentive_plan_items',
      'contact_tickets'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) {
        return defaultValue !== undefined ? defaultValue : [];
      }
      return parsed;
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

  _getDatePart(dateTimeStr) {
    if (!dateTimeStr) return null;
    return String(dateTimeStr).slice(0, 10);
  }

  // -------------------------
  // Internal helpers (private)
  // -------------------------

  _getOrCreateProjectWorkspace() {
    let projectItems = this._getFromStorage('project_items');
    if (!Array.isArray(projectItems)) {
      projectItems = [];
      this._saveToStorage('project_items', projectItems);
    }
    return projectItems;
  }

  _getOrCreateReadingList() {
    let items = this._getFromStorage('reading_list_items');
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('reading_list_items', items);
    }
    return items;
  }

  _getOrCreateIncentivePlanByName(planName, planDescription) {
    let plans = this._getFromStorage('incentive_plans');
    let plan = null;
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].name === planName) {
        plan = plans[i];
        break;
      }
    }
    if (!plan) {
      plan = {
        id: this._generateId('incentive_plan'),
        name: planName,
        description: planDescription || '',
        createdAt: new Date().toISOString(),
        notes: ''
      };
      plans.push(plan);
      this._saveToStorage('incentive_plans', plans);
    }
    return plan;
  }

  _reserveConsultationTimeSlot(timeSlotId) {
    let timeSlots = this._getFromStorage('consultation_time_slots');
    let reserved = null;
    for (let i = 0; i < timeSlots.length; i++) {
      if (timeSlots[i].id === timeSlotId) {
        if (!timeSlots[i].isAvailable) {
          reserved = null;
        } else {
          timeSlots[i].isAvailable = false;
          reserved = timeSlots[i];
          this._saveToStorage('consultation_time_slots', timeSlots);
        }
        break;
      }
    }
    return reserved;
  }

  _calculateSolarSavingsFromInputs(zipCode, monthlyElectricBill, homeType, roofType) {
    // Simple deterministic calculation based only on inputs
    const bill = Math.max(0, Number(monthlyElectricBill) || 0);
    const sizeKwBase = bill / 20; // approximate 20 USD per kW-month
    const estimatedSystemSizeKw = Math.min(Math.max(sizeKwBase, 3), 20);
    const costPerKw = 3000; // USD per kW
    const estimatedUpfrontCost = estimatedSystemSizeKw * costPerKw;
    const estimatedMonthlySavings = bill * 0.75; // assume 75% bill offset
    const estimatedAnnualSavings = estimatedMonthlySavings * 12;
    const paybackPeriodYears = estimatedAnnualSavings > 0 ? (estimatedUpfrontCost / estimatedAnnualSavings) : null;
    const projectedSavings20y = estimatedAnnualSavings * 20 * 1.15; // simple uplift for rate escalation
    const utilityRateEscalationPercent = 3; // % per year (informational)

    const summaryParts = [];
    summaryParts.push('Estimated ' + estimatedSystemSizeKw.toFixed(1) + ' kW system for ZIP ' + zipCode + '.');
    summaryParts.push('Approximate upfront cost $' + Math.round(estimatedUpfrontCost) + '.');
    if (paybackPeriodYears) {
      summaryParts.push('Simple payback around ' + paybackPeriodYears.toFixed(1) + ' years.');
    }

    const reportSummary = summaryParts.join(' ');
    const reportDetails = 'Home type: ' + homeType + '\n' +
      'Roof type: ' + roofType + '\n' +
      'Monthly bill: $' + bill + '\n' +
      'Estimated system size: ' + estimatedSystemSizeKw.toFixed(2) + ' kW\n' +
      'Estimated upfront cost: $' + Math.round(estimatedUpfrontCost) + '\n' +
      'Estimated monthly savings: $' + Math.round(estimatedMonthlySavings) + '\n' +
      'Estimated annual savings: $' + Math.round(estimatedAnnualSavings) + '\n' +
      'Projected 20-year savings: $' + Math.round(projectedSavings20y) + '\n' +
      'Utility rate escalation assumption: ' + utilityRateEscalationPercent + '%/year.';

    return {
      estimatedSystemSizeKw: estimatedSystemSizeKw,
      estimatedUpfrontCost: estimatedUpfrontCost,
      estimatedMonthlySavings: estimatedMonthlySavings,
      estimatedAnnualSavings: estimatedAnnualSavings,
      paybackPeriodYears: paybackPeriodYears,
      projectedSavings20y: projectedSavings20y,
      utilityRateEscalationPercent: utilityRateEscalationPercent,
      reportSummary: reportSummary,
      reportDetails: reportDetails
    };
  }

  _calculateInstantQuoteFromInputs(propertyType, roofMaterial, averageMonthlyUsageKwh, zipCode) {
    const usage = Math.max(0, Number(averageMonthlyUsageKwh) || 0);
    // Simple sizing: assume 1 kW produces ~120 kWh/month
    const sizeKwBase = usage / 120;
    const recommendedSystemSizeKw = Math.min(Math.max(sizeKwBase, 3), 25);
    const costPerKw = 2800; // USD per kW
    const estimatedSystemCost = recommendedSystemSizeKw * costPerKw;

    // Savings: very rough approximation
    const kwhRate = 0.18; // $/kWh
    const monthlyBill = usage * kwhRate;
    const estimatedMonthlySavings = monthlyBill * 0.7;
    const estimatedAnnualSavings = estimatedMonthlySavings * 12;
    const estimatedPaybackYears = estimatedAnnualSavings > 0 ? (estimatedSystemCost / estimatedAnnualSavings) : null;

    return {
      recommendedSystemSizeKw: recommendedSystemSizeKw,
      estimatedSystemCost: estimatedSystemCost,
      estimatedMonthlySavings: estimatedMonthlySavings,
      estimatedAnnualSavings: estimatedAnnualSavings,
      estimatedPaybackYears: estimatedPaybackYears
    };
  }

  // -------------------------
  // Core interface implementations
  // -------------------------

  // 1) Homepage content
  getHomepageContent() {
    const packages = this._getFromStorage('residential_solar_packages');
    const blogArticles = this._getFromStorage('blog_articles');

    const featuredPackages = packages.filter(function (p) {
      return p && p.isActive;
    }).slice(0, 3);

    const sortedArticles = blogArticles.slice().sort(function (a, b) {
      const da = a && a.publishedAt ? a.publishedAt : '';
      const db = b && b.publishedAt ? b.publishedAt : '';
      if (da < db) return 1;
      if (da > db) return -1;
      return 0;
    });
    const featuredBlogArticles = sortedArticles.slice(0, 3);

    return {
      heroTitle: 'Go solar with confidence',
      heroSubtitle: 'Custom residential and commercial solar installations with transparent pricing and expert design.',
      valueProposition: 'We design, install, and support high-performance solar and storage systems tailored to your home, your utility bill, and your budget.',
      featuredPackages: featuredPackages,
      featuredBlogArticles: featuredBlogArticles,
      featuredFaqs: [
        {
          question: 'How long does a typical residential installation take?',
          answer: 'Most residential installations are completed within 1–3 days on-site after permits and utility approvals are in place.',
          category: 'installation'
        },
        {
          question: 'What warranties are available for solar panels?',
          answer: 'Most of our panel lines include 25-year performance warranties and at least 10–15 years of product coverage.',
          category: 'equipment'
        },
        {
          question: 'Can I add battery storage later?',
          answer: 'Yes. We commonly design systems so batteries can be added in the future without replacing your solar array.',
          category: 'battery_storage'
        }
      ]
    };
  }

  // 2) Solar Savings Calculator config
  getSolarSavingsCalculatorConfig() {
    return {
      homeTypeOptions: [
        { value: 'single_family_home', label: 'Single-family home' },
        { value: 'multi_family_home', label: 'Multi-family home' },
        { value: 'townhouse', label: 'Townhouse' },
        { value: 'condo', label: 'Condo' },
        { value: 'mobile_home', label: 'Mobile home' },
        { value: 'other', label: 'Other' }
      ],
      roofTypeOptions: [
        { value: 'pitched_roof', label: 'Pitched roof' },
        { value: 'flat_roof', label: 'Flat roof' },
        { value: 'ground_mount', label: 'Ground mount' },
        { value: 'other', label: 'Other / unknown' }
      ],
      defaultMonthlyElectricBill: 120,
      exampleZipCodes: ['94110', '73301', '85001'],
      helpText: 'Enter your ZIP code and average monthly electric bill to estimate system size, costs, and long-term savings.'
    };
  }

  // 3) Calculate solar savings estimate and persist
  calculateSolarSavingsEstimate(zipCode, monthlyElectricBill, homeType, roofType) {
    const now = new Date().toISOString();
    const calc = this._calculateSolarSavingsFromInputs(zipCode, monthlyElectricBill, homeType, roofType);

    // Recommend packages close to the calculated size
    const packages = this._getFromStorage('residential_solar_packages');
    const targetSize = calc.estimatedSystemSizeKw;
    const recommended = packages.filter(function (p) {
      if (!p || !p.isActive || typeof p.systemSizeKw !== 'number') return false;
      const size = p.systemSizeKw;
      const diff = Math.abs(size - targetSize);
      return diff <= targetSize * 0.3; // within ±30%
    }).sort(function (a, b) {
      const pa = typeof a.totalPrice === 'number' ? a.totalPrice : Number.MAX_VALUE;
      const pb = typeof b.totalPrice === 'number' ? b.totalPrice : Number.MAX_VALUE;
      return pa - pb;
    }).slice(0, 3);

    const estimate = {
      id: this._generateId('solar_estimate'),
      zipCode: zipCode,
      monthlyElectricBill: Number(monthlyElectricBill) || 0,
      homeType: homeType,
      roofType: roofType,
      createdAt: now,
      estimatedSystemSizeKw: calc.estimatedSystemSizeKw,
      estimatedUpfrontCost: calc.estimatedUpfrontCost,
      estimatedMonthlySavings: calc.estimatedMonthlySavings,
      estimatedAnnualSavings: calc.estimatedAnnualSavings,
      paybackPeriodYears: calc.paybackPeriodYears,
      projectedSavings20y: calc.projectedSavings20y,
      utilityRateEscalationPercent: calc.utilityRateEscalationPercent,
      reportSummary: calc.reportSummary,
      reportDetails: calc.reportDetails,
      recommendedPackageIds: recommended.map(function (p) { return p.id; })
    };

    const estimates = this._getFromStorage('solar_savings_estimates');
    estimates.push(estimate);
    this._saveToStorage('solar_savings_estimates', estimates);

    return {
      estimate: estimate,
      recommendedPackages: recommended
    };
  }

  // 4) Get solar savings estimate details with recommended packages
  getSolarSavingsEstimateDetails(estimateId) {
    const estimates = this._getFromStorage('solar_savings_estimates');
    const estimate = estimates.find(function (e) { return e.id === estimateId; }) || null;
    if (!estimate) {
      return { estimate: null, recommendedPackages: [] };
    }
    const packages = this._getFromStorage('residential_solar_packages');
    const recommendedPackages = (estimate.recommendedPackageIds || []).map(function (pid) {
      return packages.find(function (p) { return p.id === pid; }) || null;
    }).filter(function (p) { return !!p; });

    return {
      estimate: estimate,
      recommendedPackages: recommendedPackages
    };
  }

  // 5) Residential Solar page content
  getResidentialSolarPageContent() {
    return {
      overviewText: 'Our residential solar solutions are designed around your roof, your utility, and your long-term plans. From initial assessment through installation and monitoring, we handle everything in-house.',
      benefits: [
        'Lower and stabilize your electric bill over the long term.',
        'Increase your home value with high-efficiency solar equipment.',
        'Work with a single NABCEP-certified installer from design to activation.',
        'Flexible financing options including loans, leases, and cash purchase.'
      ],
      processSteps: [
        {
          stepNumber: 1,
          title: 'Consultation & assessment',
          description: 'We review your goals, utility usage, and roof to determine whether solar is a good fit.'
        },
        {
          stepNumber: 2,
          title: 'Custom system design',
          description: 'Our engineers design a system tailored to your home, roof, and budget.'
        },
        {
          stepNumber: 3,
          title: 'Permits & approvals',
          description: 'We handle all utility interconnection paperwork and local permitting.'
        },
        {
          stepNumber: 4,
          title: 'Professional installation',
          description: 'Our in-house crews install your system and set up monitoring.'
        },
        {
          stepNumber: 5,
          title: 'Ongoing support',
          description: 'We stand behind our workmanship and equipment with robust warranties and support.'
        }
      ],
      includedInPackages: 'Typical residential packages include solar panels, inverters, racking, monitoring, standard permits, and installation labor. Exact inclusions vary by package and will be detailed on each quote.'
    };
  }

  // 6) Residential solar package filter options
  getResidentialSolarPackageFilterOptions() {
    const packages = this._getFromStorage('residential_solar_packages');
    let minSize = null;
    let maxSize = null;
    let minPrice = null;
    let maxPrice = null;
    const warrantySet = {};

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (!p) continue;
      if (typeof p.systemSizeKw === 'number') {
        if (minSize === null || p.systemSizeKw < minSize) minSize = p.systemSizeKw;
        if (maxSize === null || p.systemSizeKw > maxSize) maxSize = p.systemSizeKw;
      }
      if (typeof p.totalPrice === 'number') {
        if (minPrice === null || p.totalPrice < minPrice) minPrice = p.totalPrice;
        if (maxPrice === null || p.totalPrice > maxPrice) maxPrice = p.totalPrice;
      }
      if (typeof p.warrantyYears === 'number') {
        warrantySet[p.warrantyYears] = true;
      }
    }

    const warrantyYearOptions = Object.keys(warrantySet).map(function (k) { return Number(k); }).sort(function (a, b) { return a - b; });

    return {
      systemSizeRangeKw: {
        min: minSize !== null ? minSize : 0,
        max: maxSize !== null ? maxSize : 0
      },
      priceRange: {
        min: minPrice !== null ? minPrice : 0,
        max: maxPrice !== null ? Math.max(maxPrice, 18000) : 18000
      },
      warrantyYearOptions: warrantyYearOptions,
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'system_size_high_to_low', label: 'System Size: High to Low' },
        { value: 'warranty_longest_first', label: 'Warranty: Longest First' }
      ]
    };
  }

  // 7) Search residential solar packages
  searchResidentialSolarPackages(filters, sortBy, sortDirection) {
    const packages = this._getFromStorage('residential_solar_packages');
    filters = filters || {};
    const minSystemSizeKw = typeof filters.minSystemSizeKw === 'number' ? filters.minSystemSizeKw : null;
    const maxSystemSizeKw = typeof filters.maxSystemSizeKw === 'number' ? filters.maxSystemSizeKw : null;
    const minTotalPrice = typeof filters.minTotalPrice === 'number' ? filters.minTotalPrice : null;
    const maxTotalPrice = typeof filters.maxTotalPrice === 'number' ? filters.maxTotalPrice : null;
    const warrantyYearsArr = Array.isArray(filters.warrantyYears) ? filters.warrantyYears : null;
    const onlyActive = !!filters.onlyActive;

    let results = packages.filter(function (p) {
      if (!p) return false;
      if (onlyActive && !p.isActive) return false;

      if (minSystemSizeKw !== null && typeof p.systemSizeKw === 'number' && p.systemSizeKw < minSystemSizeKw) return false;
      if (maxSystemSizeKw !== null && typeof p.systemSizeKw === 'number' && p.systemSizeKw > maxSystemSizeKw) return false;

      if (minTotalPrice !== null && typeof p.totalPrice === 'number' && p.totalPrice < minTotalPrice) return false;
      if (maxTotalPrice !== null && typeof p.totalPrice === 'number' && p.totalPrice > maxTotalPrice) return false;

      if (warrantyYearsArr && warrantyYearsArr.length > 0) {
        if (typeof p.warrantyYears !== 'number' || warrantyYearsArr.indexOf(p.warrantyYears) === -1) return false;
      }

      return true;
    });

    const dir = sortDirection === 'desc' ? -1 : 1;

    if (sortBy === 'price') {
      results.sort(function (a, b) {
        const pa = typeof a.totalPrice === 'number' ? a.totalPrice : Number.MAX_VALUE;
        const pb = typeof b.totalPrice === 'number' ? b.totalPrice : Number.MAX_VALUE;
        if (pa === pb) return 0;
        return pa < pb ? -1 * dir : 1 * dir;
      });
    } else if (sortBy === 'system_size_kw') {
      results.sort(function (a, b) {
        const sa = typeof a.systemSizeKw === 'number' ? a.systemSizeKw : 0;
        const sb = typeof b.systemSizeKw === 'number' ? b.systemSizeKw : 0;
        if (sa === sb) return 0;
        return sa < sb ? -1 * dir : 1 * dir;
      });
    } else if (sortBy === 'warranty_years') {
      results.sort(function (a, b) {
        const wa = typeof a.warrantyYears === 'number' ? a.warrantyYears : 0;
        const wb = typeof b.warrantyYears === 'number' ? b.warrantyYears : 0;
        if (wa === wb) return 0;
        return wa < wb ? -1 * dir : 1 * dir;
      });
    }

    return results;
  }

  // 8) Get residential package details
  getResidentialSolarPackageDetails(packageId) {
    const packages = this._getFromStorage('residential_solar_packages');
    return packages.find(function (p) { return p.id === packageId; }) || null;
  }

  // 9) Add package to project/quote workspace
  addPackageToProject(packageId, quantity, note) {
    const packages = this._getFromStorage('residential_solar_packages');
    const pkg = packages.find(function (p) { return p.id === packageId; }) || null;
    if (!pkg) {
      return {
        success: false,
        projectItem: null,
        package: null,
        message: 'Package not found.'
      };
    }
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const projectItems = this._getOrCreateProjectWorkspace();
    const projectItem = {
      id: this._generateId('project_item'),
      itemType: 'package',
      refId: packageId,
      note: note || '',
      quantity: qty,
      addedAt: new Date().toISOString()
    };
    projectItems.push(projectItem);
    this._saveToStorage('project_items', projectItems);

    return {
      success: true,
      projectItem: projectItem,
      package: pkg,
      message: 'Package added to project.'
    };
  }

  // 10) Consultation booking config
  getConsultationBookingConfig() {
    return {
      consultationTypes: [
        { value: 'residential', label: 'Residential' },
        { value: 'commercial', label: 'Commercial' }
      ],
      businessHours: {
        timezone: 'America/Los_Angeles',
        startHour: 9,
        endHour: 17
      },
      minLeadDays: 1,
      maxAdvanceDays: 60
    };
  }

  // 11) Available consultation dates
  getAvailableConsultationDates(consultationType, fromDate, toDate) {
    const slots = this._getFromStorage('consultation_time_slots');
    const mapByDate = {};

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot || !slot.isAvailable) continue;
      if (slot.consultationType !== consultationType) continue;
      const dateStr = this._getDatePart(slot.startDateTime);
      if (!dateStr) continue;
      if (dateStr < fromDate || dateStr > toDate) continue;

      if (!mapByDate[dateStr]) {
        mapByDate[dateStr] = {
          date: dateStr,
          hasMorningAvailability: false,
          availableSlotCount: 0
        };
      }
      mapByDate[dateStr].availableSlotCount += 1;
      try {
        const d = new Date(slot.startDateTime);
        const hour = d.getHours();
        if (hour >= 9 && hour < 12) {
          mapByDate[dateStr].hasMorningAvailability = true;
        }
      } catch (e) {}
    }

    return Object.keys(mapByDate).sort().map(function (dateKey) {
      return mapByDate[dateKey];
    });
  }

  // 12) Available consultation time slots for a date
  getAvailableConsultationTimeSlots(consultationType, date) {
    const slots = this._getFromStorage('consultation_time_slots');
    const result = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;
      if (slot.consultationType !== consultationType) continue;
      const dateStr = this._getDatePart(slot.startDateTime);
      if (dateStr !== date) continue;
      if (!slot.isAvailable) continue;

      result.push({
        timeSlotId: slot.id,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        isAvailable: slot.isAvailable,
        // Foreign key resolution: include full timeSlot object
        timeSlot: slot
      });
    }
    return result;
  }

  // 13) Create consultation booking
  createConsultationBooking(consultationType, timeSlotId, name, phone, email, notes) {
    const slot = this._reserveConsultationTimeSlot(timeSlotId);
    if (!slot) {
      throw new Error('Time slot not available.');
    }
    // Optionally ensure types match; if not, we still record requested type
    const booking = {
      id: this._generateId('consultation_booking'),
      consultationType: consultationType,
      timeSlotId: timeSlotId,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
      name: name,
      phone: phone,
      email: email,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      notes: notes || ''
    };

    const bookings = this._getFromStorage('consultation_bookings');
    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    return booking;
  }

  // 14) Financing page content
  getFinancingPageContent() {
    return {
      overviewText: 'We offer multiple financing paths so you can go solar with payments that match your goals. Compare loans, leases, PPAs, and cash purchase options side by side.',
      financingTypes: [
        {
          type: 'loan',
          title: 'Solar loans',
          description: 'Own your system with predictable monthly payments and keep all available incentives.'
        },
        {
          type: 'lease',
          title: 'Solar leases',
          description: 'Enjoy solar power with little to no upfront cost while we own and maintain the system.'
        },
        {
          type: 'ppa',
          title: 'Power purchase agreements (PPAs)',
          description: 'Pay only for the energy your system produces at an agreed-upon rate, typically below utility prices.'
        },
        {
          type: 'cash',
          title: 'Cash purchase',
          description: 'Pay upfront, maximize long-term savings, and avoid financing costs entirely.'
        }
      ]
    };
  }

  // 15) Financing filter options
  getFinancingFilterOptions() {
    const plans = this._getFromStorage('financing_plans');
    let minPay = null;
    let maxPay = null;
    const termSet = {};

    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      if (!p) continue;
      if (typeof p.monthlyPayment === 'number') {
        if (minPay === null || p.monthlyPayment < minPay) minPay = p.monthlyPayment;
        if (maxPay === null || p.monthlyPayment > maxPay) maxPay = p.monthlyPayment;
      }
      if (typeof p.termYears === 'number') {
        termSet[p.termYears] = true;
      }
    }

    const termYearOptions = Object.keys(termSet).map(function (k) { return Number(k); }).sort(function (a, b) { return a - b; });

    return {
      monthlyPaymentRange: {
        min: minPay !== null ? minPay : 0,
        max: maxPay !== null ? maxPay : 0
      },
      termYearOptions: termYearOptions,
      downPaymentOptions: [
        { value: 'zero_down', label: '0% down / No money down' },
        { value: 'low_down_payment', label: 'Low down payment' },
        { value: 'standard', label: 'Standard down payment' }
      ],
      sortOptions: [
        { value: 'monthly_payment_low_to_high', label: 'Monthly Payment: Low to High' },
        { value: 'term_shortest_first', label: 'Term Length: Shortest First' }
      ]
    };
  }

  // 16) Search financing plans
  searchFinancingPlans(filters, sortBy, sortDirection) {
    const plans = this._getFromStorage('financing_plans');
    filters = filters || {};
    const maxMonthlyPayment = typeof filters.maxMonthlyPayment === 'number' ? filters.maxMonthlyPayment : null;
    const isZeroDown = filters.isZeroDown === true;
    const allowedTermYears = Array.isArray(filters.allowedTermYears) ? filters.allowedTermYears : null;
    const onlyActive = !!filters.onlyActive;

    let results = plans.filter(function (p) {
      if (!p) return false;
      if (onlyActive && !p.isActive) return false;
      if (maxMonthlyPayment !== null && typeof p.monthlyPayment === 'number' && p.monthlyPayment > maxMonthlyPayment) return false;
      if (isZeroDown && !p.isZeroDown) return false;
      if (allowedTermYears && allowedTermYears.length > 0) {
        if (allowedTermYears.indexOf(p.termYears) === -1) return false;
      }
      return true;
    });

    const dir = sortDirection === 'desc' ? -1 : 1;

    if (sortBy === 'monthly_payment') {
      results.sort(function (a, b) {
        const pa = typeof a.monthlyPayment === 'number' ? a.monthlyPayment : Number.MAX_VALUE;
        const pb = typeof b.monthlyPayment === 'number' ? b.monthlyPayment : Number.MAX_VALUE;
        if (pa === pb) return 0;
        return pa < pb ? -1 * dir : 1 * dir;
      });
    } else if (sortBy === 'term_years') {
      results.sort(function (a, b) {
        const ta = typeof a.termYears === 'number' ? a.termYears : 0;
        const tb = typeof b.termYears === 'number' ? b.termYears : 0;
        if (ta === tb) return 0;
        return ta < tb ? -1 * dir : 1 * dir;
      });
    }

    return results;
  }

  // 17) Financing plan details
  getFinancingPlanDetails(financingPlanId) {
    const plans = this._getFromStorage('financing_plans');
    return plans.find(function (p) { return p.id === financingPlanId; }) || null;
  }

  // 18) Start financing pre-approval application
  startFinancingPreApprovalApplication(financingPlanId) {
    const plans = this._getFromStorage('financing_plans');
    const plan = plans.find(function (p) { return p.id === financingPlanId; }) || null;
    if (!plan) {
      throw new Error('Financing plan not found.');
    }

    const application = {
      id: this._generateId('fin_pre_app'),
      financingPlanId: financingPlanId,
      createdAt: new Date().toISOString(),
      status: 'started',
      applicantName: '',
      applicantEmail: '',
      applicantPhone: '',
      notes: ''
    };

    const apps = this._getFromStorage('financing_pre_approval_applications');
    apps.push(application);
    this._saveToStorage('financing_pre_approval_applications', apps);

    return application;
  }

  // 19) Instant Quote config
  getInstantQuoteConfig() {
    return {
      propertyTypeOptions: [
        { value: 'residential', label: 'Residential' },
        { value: 'commercial', label: 'Commercial' },
        { value: 'industrial', label: 'Industrial' },
        { value: 'agricultural', label: 'Agricultural' },
        { value: 'other', label: 'Other' }
      ],
      roofMaterialOptions: [
        { value: 'asphalt_shingles', label: 'Asphalt shingles' },
        { value: 'metal', label: 'Metal' },
        { value: 'tile', label: 'Tile' },
        { value: 'flat_roof', label: 'Flat roof / membrane' },
        { value: 'other', label: 'Other / unknown' }
      ],
      defaultAverageUsageKwh: 900
    };
  }

  // 20) Generate instant quote
  generateInstantQuote(propertyType, roofMaterial, averageMonthlyUsageKwh, zipCode) {
    const calc = this._calculateInstantQuoteFromInputs(propertyType, roofMaterial, averageMonthlyUsageKwh, zipCode);

    const quote = {
      id: this._generateId('instant_quote'),
      propertyType: propertyType,
      roofMaterial: roofMaterial,
      averageMonthlyUsageKwh: Number(averageMonthlyUsageKwh) || 0,
      zipCode: zipCode,
      createdAt: new Date().toISOString(),
      recommendedSystemSizeKw: calc.recommendedSystemSizeKw,
      estimatedSystemCost: calc.estimatedSystemCost,
      estimatedMonthlySavings: calc.estimatedMonthlySavings,
      estimatedAnnualSavings: calc.estimatedAnnualSavings,
      estimatedPaybackYears: calc.estimatedPaybackYears,
      quoteName: '',
      status: 'draft'
    };

    const quotes = this._getFromStorage('instant_quotes');
    quotes.push(quote);
    this._saveToStorage('instant_quotes', quotes);

    return quote;
  }

  // 21) Save instant quote with name
  saveInstantQuote(quoteId, quoteName) {
    const quotes = this._getFromStorage('instant_quotes');
    let updated = null;
    for (let i = 0; i < quotes.length; i++) {
      if (quotes[i].id === quoteId) {
        quotes[i].quoteName = quoteName;
        quotes[i].status = 'saved';
        updated = quotes[i];
        break;
      }
    }
    this._saveToStorage('instant_quotes', quotes);
    return updated;
  }

  // 22) Project overview with resolved references
  getProjectOverview() {
    const projectItems = this._getFromStorage('project_items');
    const packages = this._getFromStorage('residential_solar_packages');
    const equipmentItems = this._getFromStorage('equipment_items');
    const quotes = this._getFromStorage('instant_quotes');
    const plans = this._getFromStorage('incentive_plans');

    const packagesOut = [];
    const equipmentOut = [];
    const quotesOut = [];
    const incentivePlansOut = [];

    for (let i = 0; i < projectItems.length; i++) {
      const item = projectItems[i];
      if (!item) continue;
      if (item.itemType === 'package') {
        const pkg = packages.find(function (p) { return p.id === item.refId; }) || null;
        packagesOut.push({
          projectItemId: item.id,
          package: pkg,
          note: item.note || '',
          quantity: typeof item.quantity === 'number' ? item.quantity : 1,
          addedAt: item.addedAt
        });
      } else if (item.itemType === 'equipment') {
        const eq = equipmentItems.find(function (e) { return e.id === item.refId; }) || null;
        equipmentOut.push({
          projectItemId: item.id,
          equipment: eq,
          note: item.note || '',
          quantity: typeof item.quantity === 'number' ? item.quantity : 1,
          addedAt: item.addedAt
        });
      } else if (item.itemType === 'quote') {
        const q = quotes.find(function (qq) { return qq.id === item.refId; }) || null;
        quotesOut.push({
          projectItemId: item.id,
          quote: q,
          note: item.note || '',
          addedAt: item.addedAt
        });
      } else if (item.itemType === 'incentive_plan') {
        const plan = plans.find(function (pl) { return pl.id === item.refId; }) || null;
        incentivePlansOut.push({
          projectItemId: item.id,
          plan: plan,
          note: item.note || '',
          addedAt: item.addedAt
        });
      }
    }

    return {
      packages: packagesOut,
      equipmentItems: equipmentOut,
      quotes: quotesOut,
      incentivePlans: incentivePlansOut
    };
  }

  // 23) Update project item note
  updateProjectItemNote(projectItemId, note) {
    const projectItems = this._getFromStorage('project_items');
    let updated = null;
    for (let i = 0; i < projectItems.length; i++) {
      if (projectItems[i].id === projectItemId) {
        projectItems[i].note = note;
        updated = projectItems[i];
        break;
      }
    }
    this._saveToStorage('project_items', projectItems);
    return updated;
  }

  // 24) Remove project item
  removeProjectItem(projectItemId) {
    let projectItems = this._getFromStorage('project_items');
    const originalLength = projectItems.length;
    projectItems = projectItems.filter(function (item) { return item.id !== projectItemId; });
    this._saveToStorage('project_items', projectItems);
    const success = projectItems.length < originalLength;
    return {
      success: success,
      message: success ? 'Project item removed.' : 'Project item not found.'
    };
  }

  // 25) Equipment categories
  getEquipmentCategories() {
    return this._getFromStorage('equipment_categories');
  }

  // 26) Equipment catalog filter options by category
  getEquipmentCatalogFilterOptions(categoryId) {
    const items = this._getFromStorage('equipment_items').filter(function (e) { return e && e.categoryId === categoryId; });
    let minPower = null;
    let maxPower = null;
    const efficiencyOptions = [
      { minEfficiencyPercent: 15, label: '15% and above' },
      { minEfficiencyPercent: 18, label: '18% and above' },
      { minEfficiencyPercent: 20, label: '20% and above' }
    ];
    const ratingOptions = [
      { minAverageRating: 3.5, label: '3.5 stars & up' },
      { minAverageRating: 4.0, label: '4.0 stars & up' },
      { minAverageRating: 4.5, label: '4.5 stars & up' }
    ];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (typeof it.powerOutputW === 'number') {
        if (minPower === null || it.powerOutputW < minPower) minPower = it.powerOutputW;
        if (maxPower === null || it.powerOutputW > maxPower) maxPower = it.powerOutputW;
      }
    }

    return {
      powerOutputRangeW: {
        min: minPower !== null ? minPower : 0,
        max: maxPower !== null ? maxPower : 0
      },
      efficiencyOptions: efficiencyOptions,
      ratingOptions: ratingOptions,
      applicationOptions: [
        { value: 'residential', label: 'Residential' },
        { value: 'commercial', label: 'Commercial' },
        { value: 'both', label: 'Residential & Commercial' }
      ],
      sortOptions: [
        { value: 'highest_rated', label: 'Highest Rated' },
        { value: 'warranty_longest_first', label: 'Warranty: Longest First' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' }
      ]
    };
  }

  // 27) Search equipment items with foreign key resolution of categoryId
  searchEquipmentItems(categoryId, filters, sortBy) {
    const allItems = this._getFromStorage('equipment_items');
    const categories = this._getFromStorage('equipment_categories');
    filters = filters || {};

    const minPowerOutputW = typeof filters.minPowerOutputW === 'number' ? filters.minPowerOutputW : null;
    const maxPowerOutputW = typeof filters.maxPowerOutputW === 'number' ? filters.maxPowerOutputW : null;
    const minEfficiencyPercent = typeof filters.minEfficiencyPercent === 'number' ? filters.minEfficiencyPercent : null;
    const minAverageRating = typeof filters.minAverageRating === 'number' ? filters.minAverageRating : null;
    const application = filters.application || null;
    const onlyActive = !!filters.onlyActive;

    let items = allItems.filter(function (e) {
      if (!e) return false;
      if (e.categoryId !== categoryId) return false;
      if (onlyActive && !e.isActive) return false;
      if (minPowerOutputW !== null && typeof e.powerOutputW === 'number' && e.powerOutputW < minPowerOutputW) return false;
      if (maxPowerOutputW !== null && typeof e.powerOutputW === 'number' && e.powerOutputW > maxPowerOutputW) return false;
      if (minEfficiencyPercent !== null && typeof e.efficiencyPercent === 'number' && e.efficiencyPercent < minEfficiencyPercent) return false;
      if (minAverageRating !== null && typeof e.averageRating === 'number' && e.averageRating < minAverageRating) return false;
      if (application && e.application && e.application !== application && e.application !== 'both') return false;
      return true;
    });

    if (sortBy === 'highest_rated') {
      items.sort(function (a, b) {
        const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
        const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
        if (ra === rb) return 0;
        return ra > rb ? -1 : 1;
      });
    } else if (sortBy === 'warranty_longest_first') {
      items.sort(function (a, b) {
        const wa = typeof a.warrantyYears === 'number' ? a.warrantyYears : 0;
        const wb = typeof b.warrantyYears === 'number' ? b.warrantyYears : 0;
        if (wa === wb) return 0;
        return wa > wb ? -1 : 1;
      });
    } else if (sortBy === 'price_low_to_high') {
      items.sort(function (a, b) {
        const pa = typeof a.price === 'number' ? a.price : Number.MAX_VALUE;
        const pb = typeof b.price === 'number' ? b.price : Number.MAX_VALUE;
        if (pa === pb) return 0;
        return pa < pb ? -1 : 1;
      });
    } else if (sortBy === 'price_high_to_low') {
      items.sort(function (a, b) {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        if (pa === pb) return 0;
        return pa > pb ? -1 : 1;
      });
    }

    // Foreign key resolution: attach category object
    return items.map(function (item) {
      const category = categories.find(function (c) { return c.id === item.categoryId; }) || null;
      const out = {};
      for (const k in item) {
        if (Object.prototype.hasOwnProperty.call(item, k)) out[k] = item[k];
      }
      out.category = category;
      return out;
    });
  }

  // 28) Equipment item details with resolved category
  getEquipmentItemDetails(equipmentItemId) {
    const items = this._getFromStorage('equipment_items');
    const categories = this._getFromStorage('equipment_categories');
    const item = items.find(function (e) { return e.id === equipmentItemId; }) || null;
    if (!item) return null;
    const category = categories.find(function (c) { return c.id === item.categoryId; }) || null;
    const out = {};
    for (const k in item) {
      if (Object.prototype.hasOwnProperty.call(item, k)) out[k] = item[k];
    }
    out.category = category;
    return out;
  }

  // 29) Add equipment item to project
  addEquipmentItemToProject(equipmentItemId, quantity, note) {
    const equipmentItems = this._getFromStorage('equipment_items');
    const item = equipmentItems.find(function (e) { return e.id === equipmentItemId; }) || null;
    if (!item) {
      return {
        success: false,
        projectItem: null,
        equipmentItem: null,
        message: 'Equipment item not found.'
      };
    }
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const projectItems = this._getOrCreateProjectWorkspace();
    const projectItem = {
      id: this._generateId('project_item'),
      itemType: 'equipment',
      refId: equipmentItemId,
      note: note || '',
      quantity: qty,
      addedAt: new Date().toISOString()
    };
    projectItems.push(projectItem);
    this._saveToStorage('project_items', projectItems);

    return {
      success: true,
      projectItem: projectItem,
      equipmentItem: item,
      message: 'Equipment item added to project.'
    };
  }

  // 30) Search blog articles
  searchBlogArticles(query, sortOrder) {
    const articles = this._getFromStorage('blog_articles');
    const q = query ? String(query).toLowerCase() : null;

    let results = articles.filter(function (a) {
      if (!a) return false;
      if (!q) return true;
      const title = (a.title || '').toLowerCase();
      const excerpt = (a.excerpt || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
      return title.indexOf(q) !== -1 ||
        excerpt.indexOf(q) !== -1 ||
        content.indexOf(q) !== -1 ||
        tags.indexOf(q) !== -1;
    });

    if (sortOrder === 'newest_first') {
      results.sort(function (a, b) {
        const da = a.publishedAt || '';
        const db = b.publishedAt || '';
        if (da === db) return 0;
        return da < db ? 1 : -1;
      });
    } else if (sortOrder === 'oldest_first') {
      results.sort(function (a, b) {
        const da = a.publishedAt || '';
        const db = b.publishedAt || '';
        if (da === db) return 0;
        return da < db ? -1 : 1;
      });
    } else if (sortOrder === 'relevance' && q) {
      // Simple relevance: newer first, already filtered by query
      results.sort(function (a, b) {
        const da = a.publishedAt || '';
        const db = b.publishedAt || '';
        if (da === db) return 0;
        return da < db ? 1 : -1;
      });
    }

    return results;
  }

  // 31) Blog article details
  getBlogArticleDetails(articleId) {
    const articles = this._getFromStorage('blog_articles');
    return articles.find(function (a) { return a.id === articleId; }) || null;
  }

  // 32) Save blog article to reading list
  saveBlogArticleToReadingList(articleId, note) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    if (!article) {
      throw new Error('Article not found.');
    }

    const items = this._getOrCreateReadingList();
    const readingListItem = {
      id: this._generateId('reading_item'),
      articleId: articleId,
      savedAt: new Date().toISOString(),
      note: note || ''
    };
    items.push(readingListItem);
    this._saveToStorage('reading_list_items', items);

    return readingListItem;
  }

  // 33) Related blog articles by shared tags
  getRelatedBlogArticles(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    if (!article) return [];

    const baseTags = Array.isArray(article.tags) ? article.tags.map(function (t) { return String(t).toLowerCase(); }) : [];
    if (baseTags.length === 0) return [];

    const results = articles.filter(function (a) {
      if (!a || a.id === articleId) return false;
      const tags = Array.isArray(a.tags) ? a.tags.map(function (t) { return String(t).toLowerCase(); }) : [];
      for (let i = 0; i < tags.length; i++) {
        if (baseTags.indexOf(tags[i]) !== -1) return true;
      }
      return false;
    }).sort(function (a, b) {
      const da = a.publishedAt || '';
      const db = b.publishedAt || '';
      if (da === db) return 0;
      return da < db ? 1 : -1;
    });

    return results.slice(0, 5);
  }

  // 34) Get reading list items with resolved articles
  getReadingListItems() {
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('blog_articles');

    return items.map(function (item) {
      const article = articles.find(function (a) { return a.id === item.articleId; }) || null;
      return {
        readingListItemId: item.id,
        article: article,
        note: item.note || '',
        savedAt: item.savedAt
      };
    });
  }

  // 35) Update reading list item note
  updateReadingListItem(readingListItemId, note) {
    const items = this._getFromStorage('reading_list_items');
    let updated = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === readingListItemId) {
        items[i].note = note;
        updated = items[i];
        break;
      }
    }
    this._saveToStorage('reading_list_items', items);
    return updated;
  }

  // 36) Remove reading list item
  removeReadingListItem(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    const originalLength = items.length;
    items = items.filter(function (item) { return item.id !== readingListItemId; });
    this._saveToStorage('reading_list_items', items);
    const success = items.length < originalLength;
    return {
      success: success,
      message: success ? 'Reading list item removed.' : 'Reading list item not found.'
    };
  }

  // 37) Incentives page content
  getIncentivesPageContent() {
    return {
      overviewText: 'Solar incentives and rebates can significantly reduce your upfront costs. Explore federal, state, and utility programs available in your area.',
      programTypeOptions: [
        { value: 'state', label: 'State programs' },
        { value: 'federal', label: 'Federal programs' },
        { value: 'utility', label: 'Utility programs' }
      ]
    };
  }

  // 38) Search incentive programs by ZIP and filters
  searchIncentivePrograms(zipCode, filters, sortBy, sortDirection) {
    const programs = this._getFromStorage('incentive_programs');
    filters = filters || {};

    const programTypes = Array.isArray(filters.programTypes) ? filters.programTypes : null;
    const onlyActive = !!filters.onlyActive;
    const minAmount = typeof filters.minIncentiveAmount === 'number' ? filters.minIncentiveAmount : null;
    const maxAmount = typeof filters.maxIncentiveAmount === 'number' ? filters.maxIncentiveAmount : null;

    let results = programs.filter(function (p) {
      if (!p) return false;
      if (onlyActive && !p.isActive) return false;
      if (programTypes && programTypes.length > 0 && programTypes.indexOf(p.programType) === -1) return false;
      if (minAmount !== null && typeof p.incentiveAmount === 'number' && p.incentiveAmount < minAmount) return false;
      if (maxAmount !== null && typeof p.incentiveAmount === 'number' && p.incentiveAmount > maxAmount) return false;
      if (Array.isArray(p.serviceZipCodes)) {
        if (p.serviceZipCodes.indexOf(zipCode) === -1) return false;
      }
      return true;
    });

    const dir = sortDirection === 'asc' ? 1 : -1;

    if (sortBy === 'incentive_amount') {
      results.sort(function (a, b) {
        const aa = typeof a.incentiveAmount === 'number' ? a.incentiveAmount : 0;
        const bb = typeof b.incentiveAmount === 'number' ? b.incentiveAmount : 0;
        if (aa === bb) return 0;
        return aa < bb ? -1 * dir : 1 * dir;
      });
    } else if (sortBy === 'expiration_date') {
      results.sort(function (a, b) {
        const da = a.expirationDate || '';
        const db = b.expirationDate || '';
        if (da === db) return 0;
        return da < db ? -1 * dir : 1 * dir;
      });
    }

    return results;
  }

  // 39) Incentive program details
  getIncentiveProgramDetails(incentiveProgramId) {
    const programs = this._getFromStorage('incentive_programs');
    return programs.find(function (p) { return p.id === incentiveProgramId; }) || null;
  }

  // 40) Add incentive program to named plan (and project workspace)
  addIncentiveProgramToNamedPlan(incentiveProgramId, planName, planDescription, projectNote) {
    const programs = this._getFromStorage('incentive_programs');
    const program = programs.find(function (p) { return p.id === incentiveProgramId; }) || null;
    if (!program) {
      throw new Error('Incentive program not found.');
    }

    const plan = this._getOrCreateIncentivePlanByName(planName, planDescription);

    // Create or reuse IncentivePlanItem
    let planItems = this._getFromStorage('incentive_plan_items');
    let planItem = planItems.find(function (pi) {
      return pi.planId === plan.id && pi.incentiveProgramId === incentiveProgramId;
    }) || null;

    if (!planItem) {
      planItem = {
        id: this._generateId('incentive_plan_item'),
        planId: plan.id,
        incentiveProgramId: incentiveProgramId,
        addedAt: new Date().toISOString()
      };
      planItems.push(planItem);
      this._saveToStorage('incentive_plan_items', planItems);
    }

    // Ensure plan is present in project workspace
    const projectItems = this._getOrCreateProjectWorkspace();
    let projectItem = projectItems.find(function (pi) {
      return pi.itemType === 'incentive_plan' && pi.refId === plan.id;
    }) || null;

    if (!projectItem) {
      projectItem = {
        id: this._generateId('project_item'),
        itemType: 'incentive_plan',
        refId: plan.id,
        note: projectNote || '',
        quantity: 1,
        addedAt: new Date().toISOString()
      };
      projectItems.push(projectItem);
    } else if (projectNote) {
      projectItem.note = projectNote;
    }
    this._saveToStorage('project_items', projectItems);

    // Foreign key resolution for planItem (planId and incentiveProgramId)
    const planItemOut = {};
    for (const k in planItem) {
      if (Object.prototype.hasOwnProperty.call(planItem, k)) planItemOut[k] = planItem[k];
    }
    planItemOut.plan = plan;
    planItemOut.incentiveProgram = program;

    return {
      incentivePlan: plan,
      planItem: planItemOut,
      projectItem: projectItem
    };
  }

  // 41) About page content
  getAboutPageContent() {
    return {
      missionStatement: 'Our mission is to make high-quality solar and storage accessible, transparent, and dependable for every homeowner we serve.',
      experienceYears: 10,
      certifications: [
        'NABCEP-certified PV Installation Professionals',
        'Licensed, bonded, and insured electrical contractors',
        'Certified battery storage installers for leading brands'
      ],
      testimonials: [
        {
          customerName: 'Maria G.',
          quote: 'The team handled everything from permits to activation. Our bill dropped dramatically and the monitoring app is great.'
        },
        {
          customerName: 'James T.',
          quote: 'Clear pricing, professional install, and they helped us navigate local incentives we did not know existed.'
        }
      ]
    };
  }

  // 42) Contact page content
  getContactPageContent() {
    return {
      phone: '(555) 555-0123',
      email: 'hello@sunpathsolar.example',
      address: '123 Solar Way, Suite 200, Solar City, CA 94000',
      businessHours: 'Monday–Friday, 9:00 AM – 5:00 PM',
      serviceAreas: [
        'Greater San Francisco Bay Area',
        'Central Texas',
        'Greater Phoenix Area'
      ]
    };
  }

  // 43) Submit contact form
  submitContactForm(name, email, phone, topic, message) {
    const tickets = this._getFromStorage('contact_tickets');
    const ticket = {
      id: this._generateId('ticket'),
      name: name,
      email: email,
      phone: phone || '',
      topic: topic || 'general_question',
      message: message,
      createdAt: new Date().toISOString(),
      status: 'open'
    };
    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);

    return {
      success: true,
      message: 'Your message has been received. Our team will follow up shortly.',
      ticketId: ticket.id
    };
  }

  // 44) FAQ list
  getFaqList() {
    return [
      {
        category: 'general',
        faqs: [
          {
            question: 'Is my roof a good candidate for solar?',
            answer: 'Most unshaded roofs in good condition with reasonable structural integrity can support solar. During your consultation we will assess shading, orientation, and roof age.'
          },
          {
            question: 'How much maintenance does a solar system require?',
            answer: 'Solar PV systems generally require minimal maintenance beyond occasional visual checks and cleaning if panels become heavily soiled.'
          }
        ]
      },
      {
        category: 'financing',
        faqs: [
          {
            question: 'Can I go solar with little or no money down?',
            answer: 'Yes. Many of our loan and lease options offer 0% down or low upfront costs, subject to credit approval.'
          },
          {
            question: 'Are incentives applied automatically?',
            answer: 'We guide you through claiming eligible tax credits and rebates, but some incentives are applied after installation when you file or submit documentation.'
          }
        ]
      },
      {
        category: 'battery_storage',
        faqs: [
          {
            question: 'Do I need batteries with my solar system?',
            answer: 'Batteries are optional but recommended if you want backup power during outages or to increase self-consumption. We can design both solar-only and solar-plus-storage systems.'
          }
        ]
      }
    ];
  }

  // 45) Policies content
  getPoliciesContent() {
    const today = new Date().toISOString().slice(0, 10);
    return [
      {
        policyType: 'privacy_policy',
        title: 'Privacy Policy',
        content: 'We respect your privacy and only use your information to deliver solar services, respond to inquiries, and improve our website. We do not sell your personal information.',
        lastUpdated: today
      },
      {
        policyType: 'terms_of_service',
        title: 'Terms of Service',
        content: 'Use of this website and our tools is provided as-is without guarantee. Final project terms, pricing, and warranties are always detailed in your signed agreement.',
        lastUpdated: today
      },
      {
        policyType: 'warranty_disclaimer',
        title: 'Warranty Disclaimer',
        content: 'Equipment warranties are provided by their respective manufacturers. Our workmanship warranty covers installation defects for the stated term in your contract.',
        lastUpdated: today
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
