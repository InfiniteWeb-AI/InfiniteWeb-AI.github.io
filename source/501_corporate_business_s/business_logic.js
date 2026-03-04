'use strict';

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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    // Initialize all entity tables in localStorage if not exist
    const keys = [
      'hrplans',
      'quoterequests',
      'consultationbookings',
      'casestudies',
      'readinglists',
      'courses',
      'trainingplans',
      'trainingplanitems',
      'payrollproposalrequests',
      'itsupportplans',
      'itsalesinquiries',
      'clientaccounts',
      'newsletters',
      'emailsubscriptions',
      'roicalculations',
      'roiscenarios',
      'contactforms'
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

  _formatPrice(amount, currency, periodLabel) {
    if (typeof amount !== 'number' || !isFinite(amount)) {
      return '';
    }
    let symbol = '';
    switch (currency) {
      case 'usd':
        symbol = '$';
        break;
      case 'eur':
        symbol = '€';
        break;
      case 'gbp':
        symbol = '£';
        break;
      default:
        symbol = '';
    }
    const rounded = Math.round(amount);
    const formatted = rounded.toLocaleString('en-US');
    let suffix = '';
    if (periodLabel === 'month') suffix = ' / month';
    else if (periodLabel === 'course') suffix = ' per course';
    else if (periodLabel === 'bundle') suffix = ' total';
    return symbol + formatted + suffix;
  }

  _ensureArray(val) {
    return Array.isArray(val) ? val : [];
  }

  // -------------------- Private helpers from spec --------------------

  // QuoteRequest / HRPlan
  _getOrCreateQuoteRequest() {
    const storageKey = 'quoterequests';
    const requests = this._getFromStorage(storageKey);
    let draft = requests.find(r => r.status === 'draft');
    if (!draft) {
      draft = {
        id: this._generateId('quotereq'),
        hr_plan_id: null,
        status: 'draft',
        created_at: new Date().toISOString(),
        notes: ''
      };
      requests.push(draft);
      this._saveToStorage(storageKey, requests);
    }
    return draft;
  }

  // TrainingPlan
  _getOrCreateTrainingPlan() {
    const storageKey = 'trainingplans';
    const plans = this._getFromStorage(storageKey);
    if (plans.length > 0) {
      // Use the most recently created plan
      let latest = plans[0];
      for (const p of plans) {
        if (p.created_at && latest.created_at && p.created_at > latest.created_at) {
          latest = p;
        }
      }
      return latest;
    }
    const now = new Date().toISOString();
    const plan = {
      id: this._generateId('trainplan'),
      name: 'Corporate Training Bundle',
      created_at: now,
      updated_at: now
    };
    plans.push(plan);
    this._saveToStorage(storageKey, plans);
    return plan;
  }

  // ReadingList
  _getOrCreateReadingList() {
    const storageKey = 'readinglists';
    const lists = this._getFromStorage(storageKey);
    if (lists.length > 0) {
      return lists[0];
    }
    const now = new Date().toISOString();
    const list = {
      id: this._generateId('readinglist'),
      name: 'My Reading List',
      case_study_ids: [],
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage(storageKey, lists);
    return list;
  }

  // HRPlan filters
  _applyHRPlanFilters(plans, filters, sortBy) {
    let results = Array.isArray(plans) ? plans.slice() : [];
    const f = filters || {};

    if (f.onlyActive === true) {
      results = results.filter(p => p.is_active);
    }

    if (typeof f.companySizeEmployees === 'number') {
      const employees = f.companySizeEmployees;
      results = results.filter(p =>
        typeof p.company_size_min === 'number' &&
        typeof p.company_size_max === 'number' &&
        p.company_size_min <= employees &&
        p.company_size_max >= employees
      );
    }

    if (typeof f.maxMonthlyPrice === 'number') {
      const maxPrice = f.maxMonthlyPrice;
      results = results.filter(p => typeof p.monthly_price === 'number' && p.monthly_price <= maxPrice);
    }

    if (typeof f.minMonthlyPrice === 'number') {
      const minPrice = f.minMonthlyPrice;
      results = results.filter(p => typeof p.monthly_price === 'number' && p.monthly_price >= minPrice);
    }

    if (typeof f.currency === 'string') {
      results = results.filter(p => p.currency === f.currency);
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        results.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
        break;
      case 'price_desc':
        results.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
        break;
      case 'name_asc':
        results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name_desc':
        results.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'created_at_desc':
        results.sort((a, b) => {
          const aTime = a.created_at ? Date.parse(a.created_at) : 0;
          const bTime = b.created_at ? Date.parse(b.created_at) : 0;
          return bTime - aTime;
        });
        break;
      default:
        break;
    }

    return results;
  }

  // Course filters
  _applyCourseFilters(courses, filters) {
    let results = Array.isArray(courses) ? courses.slice() : [];
    const f = filters || {};

    if (typeof f.deliveryFormat === 'string') {
      results = results.filter(c => c.delivery_format === f.deliveryFormat);
    }

    if (typeof f.minDurationHours === 'number') {
      const minH = f.minDurationHours;
      results = results.filter(c => typeof c.duration_hours === 'number' && c.duration_hours >= minH);
    }

    if (typeof f.maxDurationHours === 'number') {
      const maxH = f.maxDurationHours;
      results = results.filter(c => typeof c.duration_hours === 'number' && c.duration_hours <= maxH);
    }

    if (typeof f.maxParticipants === 'number') {
      const maxP = f.maxParticipants;
      results = results.filter(c => typeof c.max_participants === 'number' && c.max_participants >= maxP);
    }

    if (typeof f.maxPricePerCourse === 'number') {
      const maxPrice = f.maxPricePerCourse;
      results = results.filter(c => typeof c.price_per_course === 'number' && c.price_per_course <= maxPrice);
    }

    if (typeof f.currency === 'string') {
      results = results.filter(c => c.currency === f.currency);
    }

    if (f.onlyActive === true) {
      results = results.filter(c => c.is_active);
    }

    return results;
  }

  // IT Support plan filters
  _applyITSupportPlanFilters(plans, filters, sortBy) {
    let results = Array.isArray(plans) ? plans.slice() : [];
    const f = filters || {};

    if (f.require247Support === true) {
      results = results.filter(p => p.has_24_7_support);
    }

    if (typeof f.maxResponseTimeHours === 'number') {
      const maxH = f.maxResponseTimeHours;
      results = results.filter(p => typeof p.response_time_hours === 'number' && p.response_time_hours <= maxH);
    }

    if (typeof f.maxMonthlyPrice === 'number') {
      const maxPrice = f.maxMonthlyPrice;
      results = results.filter(p => typeof p.monthly_price === 'number' && p.monthly_price <= maxPrice);
    }

    if (typeof f.currency === 'string') {
      results = results.filter(p => p.currency === f.currency);
    }

    if (f.onlyActive === true) {
      results = results.filter(p => p.is_active);
    }

    switch (sortBy) {
      case 'monthly_price_asc':
        results.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
        break;
      case 'monthly_price_desc':
        results.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
        break;
      case 'name_asc':
        results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name_desc':
        results.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      default:
        break;
    }

    return results;
  }

  // CaseStudy filters
  _applyCaseStudyFilters(caseStudies, filters, sortBy) {
    let results = Array.isArray(caseStudies) ? caseStudies.slice() : [];
    const f = filters || {};

    if (typeof f.industry === 'string' && f.industry) {
      results = results.filter(c => c.industry === f.industry);
    }

    if (typeof f.publishedDateRange === 'string') {
      const now = new Date();
      let threshold = null;
      if (f.publishedDateRange === 'last_12_months') {
        threshold = new Date(now.getTime());
        threshold.setFullYear(threshold.getFullYear() - 1);
      } else if (f.publishedDateRange === 'last_3_years') {
        threshold = new Date(now.getTime());
        threshold.setFullYear(threshold.getFullYear() - 3);
      }
      if (threshold) {
        const tTime = threshold.getTime();
        results = results.filter(c => {
          if (!c.publish_date) return false;
          const time = Date.parse(c.publish_date);
          if (Number.isNaN(time)) return false;
          return time >= tTime;
        });
      }
    }

    if (typeof sortBy === 'string') {
      if (sortBy === 'newest_first') {
        results.sort((a, b) => {
          const aTime = a.publish_date ? Date.parse(a.publish_date) : 0;
          const bTime = b.publish_date ? Date.parse(b.publish_date) : 0;
          return bTime - aTime;
        });
      } else if (sortBy === 'oldest_first') {
        results.sort((a, b) => {
          const aTime = a.publish_date ? Date.parse(a.publish_date) : 0;
          const bTime = b.publish_date ? Date.parse(b.publish_date) : 0;
          return aTime - bTime;
        });
      }
    }

    return results;
  }

  // Consultation booking creator
  _createConsultationBooking(serviceCategory, durationMinutes, startDatetime, contactMethod, name, email) {
    const storageKey = 'consultationbookings';
    const bookings = this._getFromStorage(storageKey);
    const booking = {
      id: this._generateId('consult'),
      service_category: serviceCategory,
      duration_minutes: durationMinutes,
      start_datetime: typeof startDatetime === 'string' ? startDatetime : new Date(startDatetime).toISOString(),
      contact_method: contactMethod,
      name: name,
      email: email,
      status: 'scheduled',
      created_at: new Date().toISOString()
    };
    bookings.push(booking);
    this._saveToStorage(storageKey, bookings);
    return booking;
  }

  // Payroll proposal creator
  _createPayrollProposalRequest(payload) {
    const storageKey = 'payrollproposalrequests';
    const requests = this._getFromStorage(storageKey);
    const request = {
      id: this._generateId('payrollprop'),
      number_of_employees: payload.numberOfEmployees,
      countries: this._ensureArray(payload.countries),
      payroll_frequency: payload.payrollFrequency,
      target_go_live_date: payload.targetGoLiveDate,
      estimated_monthly_budget: payload.estimatedMonthlyBudget,
      currency: payload.currency,
      company_name: payload.companyName,
      contact_name: payload.contactName,
      email: payload.email,
      phone: payload.phone,
      preferred_contact_method: payload.preferredContactMethod,
      status: 'submitted',
      additional_notes: payload.additionalNotes || '',
      created_at: new Date().toISOString()
    };
    requests.push(request);
    this._saveToStorage(storageKey, requests);
    return request;
  }

  // IT sales inquiry creator
  _createITSalesInquiry(itSupportPlanId, name, email, companySizeLabel, message) {
    const storageKey = 'itsalesinquiries';
    const inquiries = this._getFromStorage(storageKey);
    const inquiry = {
      id: this._generateId('itsales'),
      it_support_plan_id: itSupportPlanId,
      name: name,
      email: email,
      company_size_label: companySizeLabel,
      message: message || '',
      status: 'submitted',
      created_at: new Date().toISOString()
    };
    inquiries.push(inquiry);
    this._saveToStorage(storageKey, inquiries);
    return inquiry;
  }

  // ROI calculation + scenarios
  _calculateROIScenariosInternal(annualRevenue, numberOfEmployees, serviceType) {
    const calcStorageKey = 'roicalculations';
    const scenStorageKey = 'roiscenarios';

    const calculations = this._getFromStorage(calcStorageKey);
    const scenariosAll = this._getFromStorage(scenStorageKey);

    const calculation = {
      id: this._generateId('roicalc'),
      annual_revenue: annualRevenue,
      number_of_employees: numberOfEmployees,
      service_type: serviceType,
      created_at: new Date().toISOString()
    };
    calculations.push(calculation);
    this._saveToStorage(calcStorageKey, calculations);

    // Simple deterministic scenario generation ensuring at least one > 15%
    const base = 5 + (annualRevenue / 10000000) * 3 + (numberOfEmployees / 250) * 2;
    const conservative = Math.max(8, Math.min(base, 15));
    const expected = Math.max(16, conservative + 4);
    const aggressive = Math.min(expected * 1.5, 50);

    const now = new Date().toISOString();

    const scenarios = [
      {
        id: this._generateId('roiscen'),
        calculation_id: calculation.id,
        name: null,
        estimated_annual_savings_percent: conservative,
        description: 'Conservative adoption scenario',
        is_saved: false,
        created_at: now
      },
      {
        id: this._generateId('roiscen'),
        calculation_id: calculation.id,
        name: null,
        estimated_annual_savings_percent: expected,
        description: 'Most likely adoption scenario',
        is_saved: false,
        created_at: now
      },
      {
        id: this._generateId('roiscen'),
        calculation_id: calculation.id,
        name: null,
        estimated_annual_savings_percent: aggressive,
        description: 'Aggressive optimization scenario',
        is_saved: false,
        created_at: now
      }
    ];

    for (const s of scenarios) {
      scenariosAll.push(s);
    }
    this._saveToStorage(scenStorageKey, scenariosAll);

    return { calculation, scenarios };
  }

  // Client account creator
  _createClientAccount(companyName, workEmail, password, confirmPassword, role, companySizeRange, prefServiceUpdates, prefBillingNotices, prefMarketingPromotions) {
    if (password !== confirmPassword) {
      return {
        success: false,
        message: 'Passwords do not match.',
        clientAccount: null
      };
    }

    const storageKey = 'clientaccounts';
    const accounts = this._getFromStorage(storageKey);

    const existing = accounts.find(a => a.work_email === workEmail);
    if (existing) {
      return {
        success: false,
        message: 'An account with this email already exists.',
        clientAccount: null
      };
    }

    const account = {
      id: this._generateId('clientacct'),
      company_name: companyName,
      work_email: workEmail,
      password: password,
      role: role,
      company_size_range: companySizeRange,
      pref_service_updates: !!prefServiceUpdates,
      pref_billing_notices: !!prefBillingNotices,
      pref_marketing_promotions: !!prefMarketingPromotions,
      created_at: new Date().toISOString(),
      is_active: true
    };

    accounts.push(account);
    this._saveToStorage(storageKey, accounts);

    return {
      success: true,
      message: 'Client portal account created successfully.',
      clientAccount: account
    };
  }

  // -------------------- Interface implementations --------------------

  // Homepage
  getHomepageContent() {
    const hrPlans = this.getHRPlans({ onlyActive: true }, 'price_asc').slice(0, 3);
    const itPlans = this.getITSupportPlans({ onlyActive: true }, 'monthly_price_asc').slice(0, 3);

    return {
      hero: {
        headline: 'Integrated Business Services for Growing Companies',
        subheadline: 'HR outsourcing, global payroll, IT support, training, and cybersecurity expertise under one roof.'
      },
      serviceSummaries: [
        {
          key: 'hr_outsourcing',
          name: 'HR Outsourcing',
          description: 'Flexible HR outsourcing plans for growing teams.'
        },
        {
          key: 'global_payroll',
          name: 'Global Payroll',
          description: 'Compliant payroll operations across multiple countries.'
        },
        {
          key: 'managed_it_support',
          name: 'Managed IT Support',
          description: '24/7 managed IT services tailored to your business.'
        },
        {
          key: 'training_workshops',
          name: 'Training & Workshops',
          description: 'Virtual and in-person courses for teams of all sizes.'
        },
        {
          key: 'it_cybersecurity',
          name: 'IT & Cybersecurity',
          description: 'Security assessments and remediation support.'
        }
      ],
      featuredSections: {
        hrOutsourcingPlans: hrPlans.map(p => ({
          id: p.id,
          name: p.name,
          monthlyPrice: p.monthlyPrice,
          currency: p.currency,
          priceDisplay: p.priceDisplay,
          companySizeLabel: p.companySizeLabel
        })),
        itSupportPlans: itPlans.map(p => ({
          id: p.id,
          name: p.name,
          monthlyPrice: p.monthlyPrice,
          currency: p.currency,
          priceDisplay: p.priceDisplay,
          has247Support: p.has247Support,
          responseTimeLabel: p.responseTimeLabel
        })),
        globalPayrollHighlight: {
          title: 'Global Payroll Made Simple',
          summary: 'Consolidate multi-country payroll into a single, compliant process for your distributed teams.'
        }
      },
      primaryCtas: [
        {
          key: 'book_consultation',
          label: 'Book a Consultation',
          targetPage: 'contact'
        },
        {
          key: 'request_payroll_proposal',
          label: 'Request a Global Payroll Proposal',
          targetPage: 'global_payroll'
        }
      ]
    };
  }

  getServicesOverview() {
    return {
      serviceCards: [
        {
          key: 'hr_outsourcing',
          name: 'HR Outsourcing',
          shortDescription: 'End-to-end HR operations for small to mid-sized companies.',
          engagementModel: 'monthly_plans'
        },
        {
          key: 'global_payroll',
          name: 'Global Payroll',
          shortDescription: 'Multi-country payroll administration and compliance.',
          engagementModel: 'custom_proposals'
        },
        {
          key: 'managed_it_support',
          name: 'Managed IT Support',
          shortDescription: 'Proactive monitoring and helpdesk for your workforce.',
          engagementModel: 'monthly_plans'
        },
        {
          key: 'training_workshops',
          name: 'Training & Workshops',
          shortDescription: 'Virtual and on-site training for leaders and teams.',
          engagementModel: 'consultations'
        },
        {
          key: 'it_cybersecurity',
          name: 'IT & Cybersecurity',
          shortDescription: 'Assessments, hardening, and incident response readiness.',
          engagementModel: 'consultations'
        }
      ]
    };
  }

  // HR Outsourcing / Quote
  getHROutsourcingPageContent() {
    return {
      introHeading: 'HR Outsourcing Services',
      introBody: 'Scale your HR operations with flexible outsourcing plans designed for growing organizations.',
      useCasesByCompanySize: [
        {
          companySizeLabel: '1–50 employees',
          description: 'Foundational HR support to establish core processes.'
        },
        {
          companySizeLabel: '51–200 employees',
          description: 'Dedicated HR specialists and advanced compliance support.'
        },
        {
          companySizeLabel: '201–500 employees',
          description: 'Strategic HR partnership with analytics and workforce planning.'
        }
      ]
    };
  }

  getHRPlanFilterOptions() {
    const plans = this._getFromStorage('hrplans');
    const companySizeOptions = [];
    const rangesMap = {};

    for (const p of plans) {
      if (typeof p.company_size_min === 'number' && typeof p.company_size_max === 'number') {
        const key = p.company_size_min + '-' + p.company_size_max;
        if (!rangesMap[key]) {
          rangesMap[key] = true;
          companySizeOptions.push({
            label: p.company_size_min + '–' + p.company_size_max + ' employees',
            minEmployees: p.company_size_min,
            maxEmployees: p.company_size_max
          });
        }
      }
    }

    if (companySizeOptions.length === 0) {
      companySizeOptions.push(
        { label: '1–50 employees', minEmployees: 1, maxEmployees: 50 },
        { label: '51–100 employees', minEmployees: 51, maxEmployees: 100 },
        { label: '101–200 employees', minEmployees: 101, maxEmployees: 200 },
        { label: '201–500 employees', minEmployees: 201, maxEmployees: 500 }
      );
    }

    let minPrice = null;
    let maxPrice = null;
    let currency = 'usd';
    for (const p of plans) {
      if (typeof p.monthly_price === 'number') {
        if (minPrice === null || p.monthly_price < minPrice) minPrice = p.monthly_price;
        if (maxPrice === null || p.monthly_price > maxPrice) maxPrice = p.monthly_price;
      }
      if (p.currency) currency = p.currency;
    }

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 10000;

    return {
      companySizeOptions,
      priceFilter: {
        minPrice,
        maxPrice,
        currency
      },
      sortOptions: [
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
        { value: 'name_asc', label: 'Name: A to Z' },
        { value: 'name_desc', label: 'Name: Z to A' },
        { value: 'created_at_desc', label: 'Newest plans' }
      ]
    };
  }

  getHRPlans(filters, sortBy) {
    const rawPlans = this._getFromStorage('hrplans');
    const filtered = this._applyHRPlanFilters(rawPlans, filters || {}, sortBy);

    return filtered.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      companySizeMin: p.company_size_min,
      companySizeMax: p.company_size_max,
      companySizeLabel: (typeof p.company_size_min === 'number' && typeof p.company_size_max === 'number')
        ? p.company_size_min + '-' + p.company_size_max + ' employees'
        : '',
      monthlyPrice: p.monthly_price,
      currency: p.currency,
      priceDisplay: this._formatPrice(p.monthly_price, p.currency, 'month'),
      isActive: !!p.is_active
    }));
  }

  getHRPlanDetails(hrPlanId) {
    const plans = this._getFromStorage('hrplans');
    const plan = plans.find(p => p.id === hrPlanId) || null;
    return plan;
  }

  addHRPlanToQuote(hrPlanId, notes) {
    const plans = this._getFromStorage('hrplans');
    const plan = plans.find(p => p.id === hrPlanId) || null;

    const requests = this._getFromStorage('quoterequests');
    const draft = this._getOrCreateQuoteRequest();

    draft.hr_plan_id = hrPlanId;
    if (typeof notes === 'string') {
      draft.notes = notes;
    }

    const idx = requests.findIndex(r => r.id === draft.id);
    if (idx === -1) {
      requests.push(draft);
    } else {
      requests[idx] = draft;
    }
    this._saveToStorage('quoterequests', requests);

    const quoteRequestWithFK = Object.assign({}, draft, {
      hrPlan: plan
    });

    return {
      success: !!plan,
      message: plan ? 'HR plan added to quote request.' : 'HR plan not found.',
      quoteRequest: quoteRequestWithFK,
      selectedPlan: plan
    };
  }

  getCurrentQuoteRequestSummary() {
    const requests = this._getFromStorage('quoterequests');
    const draft = requests.find(r => r.status === 'draft') || null;
    const plans = this._getFromStorage('hrplans');
    let hrPlan = null;
    if (draft && draft.hr_plan_id) {
      hrPlan = plans.find(p => p.id === draft.hr_plan_id) || null;
    }
    const quoteRequestWithFK = draft ? Object.assign({}, draft, { hrPlan }) : null;
    return {
      quoteRequest: quoteRequestWithFK,
      hrPlan
    };
  }

  // Training & Workshops / TrainingPlan
  getTrainingAndWorkshopsPageContent() {
    return {
      introHeading: 'Corporate Training & Workshops',
      introBody: 'Build a tailored training program for your organization with virtual and in-person courses.',
      featuredTopics: [
        {
          topicKey: 'leadership',
          title: 'Leadership & Management',
          description: 'Develop people managers and future leaders.'
        },
        {
          topicKey: 'compliance',
          title: 'Compliance & Risk',
          description: 'Keep teams current on regulatory and policy requirements.'
        },
        {
          topicKey: 'productivity',
          title: 'Productivity & Collaboration',
          description: 'Improve communication, focus, and collaboration across teams.'
        }
      ]
    };
  }

  getCourseFilterOptions() {
    const courses = this._getFromStorage('courses');

    let minHours = null;
    let maxHours = null;
    let minPrice = null;
    let maxPrice = null;
    let currency = 'usd';
    const participantSet = new Set();

    for (const c of courses) {
      if (typeof c.duration_hours === 'number') {
        if (minHours === null || c.duration_hours < minHours) minHours = c.duration_hours;
        if (maxHours === null || c.duration_hours > maxHours) maxHours = c.duration_hours;
      }
      if (typeof c.price_per_course === 'number') {
        if (minPrice === null || c.price_per_course < minPrice) minPrice = c.price_per_course;
        if (maxPrice === null || c.price_per_course > maxPrice) maxPrice = c.price_per_course;
      }
      if (typeof c.max_participants === 'number') {
        participantSet.add(c.max_participants);
      }
      if (c.currency) currency = c.currency;
    }

    if (minHours === null) minHours = 1;
    if (maxHours === null) maxHours = 8;
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 10000;

    const participantOptions = Array.from(participantSet)
      .sort((a, b) => a - b)
      .map(v => ({ label: 'Up to ' + v + ' employees', maxParticipants: v }));

    if (participantOptions.length === 0) {
      participantOptions.push(
        { label: 'Up to 25 employees', maxParticipants: 25 },
        { label: 'Up to 50 employees', maxParticipants: 50 },
        { label: 'Up to 100 employees', maxParticipants: 100 }
      );
    }

    return {
      deliveryFormats: [
        { value: 'virtual_online', label: 'Virtual / Online' },
        { value: 'in_person', label: 'In-person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      durationRange: {
        minHours,
        maxHours
      },
      participantOptions,
      priceFilter: {
        minPrice,
        maxPrice,
        currency
      }
    };
  }

  getCourses(filters) {
    const raw = this._getFromStorage('courses');
    const filtered = this._applyCourseFilters(raw, filters || {});

    return filtered.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description || '',
      deliveryFormat: c.delivery_format,
      deliveryFormatLabel:
        c.delivery_format === 'virtual_online' ? 'Virtual / Online' :
        c.delivery_format === 'in_person' ? 'In-person' :
        c.delivery_format === 'hybrid' ? 'Hybrid' : '',
      durationHours: c.duration_hours,
      durationLabel: (typeof c.duration_hours === 'number' ? c.duration_hours + ' hours' : ''),
      maxParticipants: c.max_participants,
      pricePerCourse: c.price_per_course,
      currency: c.currency,
      priceDisplay: this._formatPrice(c.price_per_course, c.currency, 'course'),
      topic: c.topic || '',
      isActive: !!c.is_active
    }));
  }

  addCourseToTrainingPlan(courseId) {
    const trainingPlan = this._getOrCreateTrainingPlan();
    const items = this._getFromStorage('trainingplanitems');
    const planItems = items.filter(i => i.training_plan_id === trainingPlan.id);
    const orderIndex = planItems.length; // 0-based

    const newItem = {
      id: this._generateId('tpi'),
      training_plan_id: trainingPlan.id,
      course_id: courseId,
      order_index: orderIndex
    };

    items.push(newItem);
    this._saveToStorage('trainingplanitems', items);

    // Update training plan updated_at
    const plans = this._getFromStorage('trainingplans');
    const idx = plans.findIndex(p => p.id === trainingPlan.id);
    if (idx !== -1) {
      trainingPlan.updated_at = new Date().toISOString();
      plans[idx] = trainingPlan;
      this._saveToStorage('trainingplans', plans);
    }

    const courses = this._getFromStorage('courses');
    const course = courses.find(c => c.id === courseId) || null;

    const addedItemWithFK = Object.assign({}, newItem, {
      trainingPlan: trainingPlan,
      course: course
    });

    return {
      success: !!course,
      message: course ? 'Course added to training plan.' : 'Course not found.',
      trainingPlan,
      addedItem: addedItemWithFK
    };
  }

  getTrainingPlanSummary() {
    const trainingPlan = this._getOrCreateTrainingPlan();
    const items = this._getFromStorage('trainingplanitems').filter(i => i.training_plan_id === trainingPlan.id);
    items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const coursesAll = this._getFromStorage('courses');
    const courses = [];
    for (const item of items) {
      const course = coursesAll.find(c => c.id === item.course_id);
      if (course) {
        courses.push(course);
      }
    }

    const courseCount = courses.length;
    let totalDurationHours = 0;
    let totalPrice = 0;
    let currency = 'usd';

    for (const c of courses) {
      if (typeof c.duration_hours === 'number') totalDurationHours += c.duration_hours;
      if (typeof c.price_per_course === 'number') totalPrice += c.price_per_course;
      if (c.currency) currency = c.currency;
    }

    const totalPriceDisplay = this._formatPrice(totalPrice, currency, 'bundle');

    return {
      trainingPlan,
      courses,
      courseCount,
      totalDurationHours,
      totalPrice,
      currency,
      totalPriceDisplay
    };
  }

  // Global Payroll
  getGlobalPayrollPageContent() {
    return {
      introHeading: 'Global Payroll Services',
      introBody: 'Operate compliant payroll across multiple countries with a single point of coordination.',
      supportedCountriesSummary: 'We support payroll operations in North America, Europe, and additional markets on request.'
    };
  }

  getPayrollProposalFormOptions() {
    return {
      availableCountries: [
        { name: 'United States', code: 'US' },
        { name: 'United Kingdom', code: 'GB' },
        { name: 'Germany', code: 'DE' },
        { name: 'Canada', code: 'CA' },
        { name: 'France', code: 'FR' }
      ],
      payrollFrequencies: [
        { value: 'weekly', label: 'Weekly' },
        { value: 'bi_weekly_26', label: 'Bi-weekly (26 runs/year)' },
        { value: 'semi_monthly', label: 'Semi-monthly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'other', label: 'Other' }
      ],
      preferredContactMethods: [
        { value: 'phone_call', label: 'Phone call' },
        { value: 'email', label: 'Email' },
        { value: 'video_call', label: 'Video call' }
      ],
      supportedCurrencies: ['usd', 'eur', 'gbp']
    };
  }

  submitPayrollProposalRequest(numberOfEmployees, countries, payrollFrequency, targetGoLiveDate, estimatedMonthlyBudget, currency, companyName, contactName, email, phone, preferredContactMethod, additionalNotes) {
    const payload = {
      numberOfEmployees,
      countries,
      payrollFrequency,
      targetGoLiveDate,
      estimatedMonthlyBudget,
      currency,
      companyName,
      contactName,
      email,
      phone,
      preferredContactMethod,
      additionalNotes
    };

    const proposalRequest = this._createPayrollProposalRequest(payload);

    return {
      success: true,
      message: 'Payroll proposal request submitted.',
      proposalRequest
    };
  }

  // Managed IT Support
  getManagedITSupportPageContent() {
    return {
      introHeading: 'Managed IT Support',
      introBody: 'Keep your workforce productive with proactive monitoring, helpdesk, and rapid incident response.',
      tierSummaries: [
        {
          tierName: 'Essential',
          description: 'Business-hours helpdesk and basic monitoring for small teams.'
        },
        {
          tierName: 'Business',
          description: 'Extended hours, device management, and on-site options.'
        },
        {
          tierName: 'Enterprise',
          description: '24/7 coverage, advanced security, and custom SLAs.'
        }
      ]
    };
  }

  getITSupportFilterOptions() {
    const plans = this._getFromStorage('itsupportplans');
    let minPrice = null;
    let maxPrice = null;
    let currency = 'usd';

    for (const p of plans) {
      if (typeof p.monthly_price === 'number') {
        if (minPrice === null || p.monthly_price < minPrice) minPrice = p.monthly_price;
        if (maxPrice === null || p.monthly_price > maxPrice) maxPrice = p.monthly_price;
      }
      if (p.currency) currency = p.currency;
    }

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 10000;

    return {
      responseTimeOptions: [
        { label: '4 hours or less', maxHours: 4 },
        { label: '2 hours or less', maxHours: 2 },
        { label: '1 hour or less', maxHours: 1 }
      ],
      priceFilter: {
        minPrice,
        maxPrice,
        currency
      },
      sortOptions: [
        { value: 'monthly_price_asc', label: 'Monthly price: Low to High' },
        { value: 'monthly_price_desc', label: 'Monthly price: High to Low' },
        { value: 'name_asc', label: 'Name: A to Z' },
        { value: 'name_desc', label: 'Name: Z to A' }
      ]
    };
  }

  getITSupportPlans(filters, sortBy) {
    const raw = this._getFromStorage('itsupportplans');
    const filtered = this._applyITSupportPlanFilters(raw, filters || {}, sortBy);

    return filtered.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      monthlyPrice: p.monthly_price,
      currency: p.currency,
      priceDisplay: this._formatPrice(p.monthly_price, p.currency, 'month'),
      has247Support: !!p.has_24_7_support,
      responseTimeHours: p.response_time_hours,
      responseTimeLabel: (typeof p.response_time_hours === 'number' ? p.response_time_hours + ' hour' + (p.response_time_hours === 1 ? '' : 's') + ' or less' : ''),
      isActive: !!p.is_active
    }));
  }

  getITSupportPlanDetails(itSupportPlanId) {
    const plans = this._getFromStorage('itsupportplans');
    const plan = plans.find(p => p.id === itSupportPlanId) || null;
    return plan;
  }

  submitITSupportSalesInquiry(itSupportPlanId, name, email, companySizeLabel, message) {
    const inquiry = this._createITSalesInquiry(itSupportPlanId, name, email, companySizeLabel, message);
    const plans = this._getFromStorage('itsupportplans');
    const plan = plans.find(p => p.id === itSupportPlanId) || null;

    const inquiryWithFK = Object.assign({}, inquiry, {
      itSupportPlan: plan
    });

    return {
      success: !!plan,
      message: plan ? 'IT support sales inquiry submitted.' : 'IT support plan not found.',
      salesInquiry: inquiryWithFK
    };
  }

  // Contact & Consultations
  getContactPageContent() {
    return {
      introHeading: 'Contact Our Team',
      introBody: 'Tell us about your organization and we will connect you with the right specialist.',
      showConsultationCta: true
    };
  }

  submitContactForm(name, email, message) {
    const storageKey = 'contactforms';
    const forms = this._getFromStorage(storageKey);
    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      message,
      created_at: new Date().toISOString()
    };
    forms.push(submission);
    this._saveToStorage(storageKey, forms);
    return {
      success: true,
      message: 'Your message has been received.'
    };
  }

  getConsultationBookingOptions() {
    return {
      serviceCategories: [
        { value: 'it_cybersecurity', label: 'IT & Cybersecurity' },
        { value: 'hr_outsourcing', label: 'HR Outsourcing' },
        { value: 'global_payroll', label: 'Global Payroll' },
        { value: 'managed_it_support', label: 'Managed IT Support' },
        { value: 'training_workshops', label: 'Training & Workshops' },
        { value: 'other_consulting', label: 'Other consulting' }
      ],
      durations: [
        { minutes: 30, label: '30 minutes' },
        { minutes: 60, label: '60 minutes' },
        { minutes: 90, label: '90 minutes' }
      ],
      contactMethods: [
        { value: 'video_call', label: 'Video call' },
        { value: 'online_meeting', label: 'Online meeting' },
        { value: 'phone_call', label: 'Phone call' },
        { value: 'email', label: 'Email' },
        { value: 'in_person', label: 'In-person' }
      ]
    };
  }

  getConsultationAvailability(serviceCategory, durationMinutes, year, month) {
    const key = 'consultationAvailability_' + serviceCategory + '_' + durationMinutes + '_' + year + '_' + month;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached) || [];
      } catch (e) {
        // fall through to regenerate
      }
    }

    const slots = [];
    const jsMonth = month - 1; // JS Date month index
    const date = new Date(Date.UTC(year, jsMonth, 1));

    while (date.getUTCMonth() === jsMonth) {
      const day = date.getUTCDay(); // 0=Sun,6=Sat
      if (day !== 0 && day !== 6) {
        const yyyy = date.getUTCFullYear();
        const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const dd = date.getUTCDate().toString().padStart(2, '0');
        const dayStr = yyyy + '-' + mm + '-' + dd;

        const daySlots = [
          { label: '10:00 AM', hour: 10 },
          { label: '2:00 PM', hour: 14 },
          { label: '4:00 PM', hour: 16 }
        ];

        const timeSlots = daySlots.map(s => ({
          time: s.label,
          startDatetime: new Date(Date.UTC(yyyy, jsMonth, date.getUTCDate(), s.hour, 0, 0)).toISOString()
        }));

        slots.push({
          date: dayStr,
          timeSlots
        });
      }
      date.setUTCDate(date.getUTCDate() + 1);
    }

    localStorage.setItem(key, JSON.stringify(slots));
    return slots;
  }

  scheduleConsultation(serviceCategory, durationMinutes, startDatetime, contactMethod, name, email) {
    const booking = this._createConsultationBooking(serviceCategory, durationMinutes, startDatetime, contactMethod, name, email);
    return {
      success: true,
      message: 'Consultation scheduled.',
      booking
    };
  }

  // Resources / Case Studies / Reading List
  getResourcesOverviewContent() {
    const allCaseStudies = this._getFromStorage('casestudies');
    const sorted = allCaseStudies.slice().sort((a, b) => {
      const aTime = a.publish_date ? Date.parse(a.publish_date) : 0;
      const bTime = b.publish_date ? Date.parse(b.publish_date) : 0;
      return bTime - aTime;
    });
    const featuredCaseStudies = sorted.slice(0, 3);

    return {
      introHeading: 'Resources & Case Studies',
      introBody: 'Explore how organizations like yours leverage our services to drive measurable results.',
      resourceTypes: [
        { key: 'case_studies', name: 'Case Studies', description: 'Real-world outcomes from client engagements.' },
        { key: 'whitepapers', name: 'Whitepapers', description: 'Deep dives into best practices and trends.' },
        { key: 'tools', name: 'Tools & Calculators', description: 'Interactive tools to quantify impact.' }
      ],
      featuredCaseStudies
    };
  }

  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('casestudies');
    const industriesSet = new Set();
    for (const c of caseStudies) {
      if (c.industry) industriesSet.add(c.industry);
    }
    const industries = Array.from(industriesSet).sort();

    return {
      industries,
      dateRanges: [
        { value: 'last_12_months', label: 'Last 12 months' },
        { value: 'last_3_years', label: 'Last 3 years' },
        { value: 'all_time', label: 'All time' }
      ],
      sortOptions: [
        { value: 'newest_first', label: 'Newest first' },
        { value: 'oldest_first', label: 'Oldest first' }
      ]
    };
  }

  getCaseStudies(filters, sortBy) {
    const raw = this._getFromStorage('casestudies');
    const filtered = this._applyCaseStudyFilters(raw, filters || {}, sortBy || 'newest_first');
    return filtered;
  }

  saveCaseStudyToReadingList(caseStudyId) {
    const list = this._getOrCreateReadingList();
    const lists = this._getFromStorage('readinglists');

    if (!Array.isArray(list.case_study_ids)) {
      list.case_study_ids = [];
    }
    if (!list.case_study_ids.includes(caseStudyId)) {
      list.case_study_ids.push(caseStudyId);
      list.updated_at = new Date().toISOString();
    }

    const idx = lists.findIndex(l => l.id === list.id);
    if (idx === -1) {
      lists.push(list);
    } else {
      lists[idx] = list;
    }
    this._saveToStorage('readinglists', lists);

    return {
      success: true,
      message: 'Case study saved to reading list.',
      readingList: list
    };
  }

  getReadingList() {
    const list = this._getOrCreateReadingList();
    const allCaseStudies = this._getFromStorage('casestudies');
    const ids = Array.isArray(list.case_study_ids) ? list.case_study_ids : [];
    const caseStudies = ids
      .map(id => allCaseStudies.find(c => c.id === id))
      .filter(c => !!c);

    return {
      readingList: list,
      caseStudies
    };
  }

  // Client Portal
  getClientPortalPageContent() {
    return {
      introHeading: 'Client Portal',
      introBody: 'Access service dashboards, billing, and support from a single secure portal.',
      benefitsList: [
        'View and download invoices and billing history.',
        'Track support tickets and service status.',
        'Manage user access and communication preferences.'
      ]
    };
  }

  createClientPortalAccount(companyName, workEmail, password, confirmPassword, role, companySizeRange, prefServiceUpdates, prefBillingNotices, prefMarketingPromotions) {
    return this._createClientAccount(
      companyName,
      workEmail,
      password,
      confirmPassword,
      role,
      companySizeRange,
      prefServiceUpdates,
      prefBillingNotices,
      prefMarketingPromotions
    );
  }

  // Email Preferences / Newsletters
  getEmailPreferencesSummary(emailAddress) {
    const newsletters = this._getFromStorage('newsletters');
    const subs = this._getFromStorage('emailsubscriptions');

    const items = newsletters.map(nl => {
      const sub = subs.find(s => s.email_address === emailAddress && s.newsletter_id === nl.id);
      return {
        newsletter: nl,
        isSubscribed: sub ? !!sub.is_subscribed : false,
        frequency: sub ? (sub.frequency || nl.default_frequency || null) : (nl.default_frequency || null)
      };
    });

    return {
      emailAddress,
      newsletters: items
    };
  }

  updateEmailPreferences(emailAddress, preferences) {
    const prefs = Array.isArray(preferences) ? preferences : [];
    const subs = this._getFromStorage('emailsubscriptions');
    const newsletters = this._getFromStorage('newsletters');
    const now = new Date().toISOString();

    for (const pref of prefs) {
      const newsletterId = pref.newsletterId;
      const isSubscribed = !!pref.isSubscribed;
      const frequency = typeof pref.frequency === 'string' ? pref.frequency : null;

      let sub = subs.find(s => s.email_address === emailAddress && s.newsletter_id === newsletterId);
      if (!sub) {
        sub = {
          id: this._generateId('emailsub'),
          email_address: emailAddress,
          newsletter_id: newsletterId,
          is_subscribed: isSubscribed,
          frequency: frequency,
          created_at: now,
          updated_at: now
        };
        subs.push(sub);
      } else {
        sub.is_subscribed = isSubscribed;
        sub.frequency = frequency;
        sub.updated_at = now;
      }
    }

    this._saveToStorage('emailsubscriptions', subs);

    const updated = subs.filter(s => s.email_address === emailAddress && prefs.some(p => p.newsletterId === s.newsletter_id));
    const updatedWithFK = updated.map(s => ({
      id: s.id,
      email_address: s.email_address,
      newsletter_id: s.newsletter_id,
      is_subscribed: s.is_subscribed,
      frequency: s.frequency,
      created_at: s.created_at,
      updated_at: s.updated_at,
      newsletter: newsletters.find(n => n.id === s.newsletter_id) || null
    }));

    return {
      success: true,
      message: 'Email preferences updated.',
      updatedSubscriptions: updatedWithFK
    };
  }

  // ROI Calculator
  getROICalculatorPageContent() {
    return {
      introHeading: 'ROI Calculator',
      introBody: 'Estimate the annual savings you can achieve by implementing our services.',
      serviceTypeOptions: [
        { value: 'process_automation', label: 'Process Automation' },
        { value: 'hr_outsourcing', label: 'HR Outsourcing' },
        { value: 'managed_it_support', label: 'Managed IT Support' },
        { value: 'global_payroll', label: 'Global Payroll' },
        { value: 'training_workshops', label: 'Training & Workshops' }
      ]
    };
  }

  calculateROIScenarios(annualRevenue, numberOfEmployees, serviceType) {
    const { calculation, scenarios } = this._calculateROIScenariosInternal(annualRevenue, numberOfEmployees, serviceType);
    const scenariosWithFK = scenarios.map(s => Object.assign({}, s, { calculation }));
    return {
      calculation,
      scenarios: scenariosWithFK
    };
  }

  getROIScenarioDetails(roiScenarioId) {
    const scenarios = this._getFromStorage('roiscenarios');
    const calculations = this._getFromStorage('roicalculations');

    const scenario = scenarios.find(s => s.id === roiScenarioId) || null;
    if (!scenario) return null;
    const calculation = calculations.find(c => c.id === scenario.calculation_id) || null;
    return Object.assign({}, scenario, { calculation });
  }

  saveROIScenario(roiScenarioId, name) {
    const scenarios = this._getFromStorage('roiscenarios');
    const calculations = this._getFromStorage('roicalculations');

    const idx = scenarios.findIndex(s => s.id === roiScenarioId);
    if (idx === -1) {
      return null;
    }

    const scenario = scenarios[idx];
    scenario.name = name;
    scenario.is_saved = true;
    scenarios[idx] = scenario;
    this._saveToStorage('roiscenarios', scenarios);

    const calculation = calculations.find(c => c.id === scenario.calculation_id) || null;
    return Object.assign({}, scenario, { calculation });
  }

  listSavedROIScenarios() {
    const scenarios = this._getFromStorage('roiscenarios');
    const calculations = this._getFromStorage('roicalculations');

    const saved = scenarios.filter(s => s.is_saved);
    return saved.map(s => ({
      id: s.id,
      calculation_id: s.calculation_id,
      name: s.name,
      estimated_annual_savings_percent: s.estimated_annual_savings_percent,
      description: s.description,
      is_saved: s.is_saved,
      created_at: s.created_at,
      calculation: calculations.find(c => c.id === s.calculation_id) || null
    }));
  }

  // About / Legal
  getAboutPageContent() {
    return {
      history: 'Founded to help growing companies unify their HR, payroll, and IT operations, our team brings decades of cross-functional expertise.',
      mission: 'To make complex business operations simple, transparent, and scalable for mid-market organizations worldwide.',
      leadership: [
        {
          name: 'Alex Morgan',
          title: 'Chief Executive Officer',
          bio: 'Alex has led global operations and transformation programs across multiple industries.'
        },
        {
          name: 'Jamie Lee',
          title: 'Chief Operating Officer',
          bio: 'Jamie oversees service delivery, client success, and continuous improvement initiatives.'
        }
      ],
      credibilityIndicators: [
        'Trusted by organizations across technology, logistics, and financial services sectors.',
        'Certified in major compliance frameworks and partnered with leading technology vendors.'
      ]
    };
  }

  getPrivacyPolicyContent() {
    return {
      lastUpdated: new Date('2024-01-01T00:00:00.000Z').toISOString(),
      content: 'We collect and process personal data solely for the purpose of providing and improving our services. We use cookies and similar technologies to understand usage patterns. You may request access, correction, or deletion of your personal data in accordance with applicable laws.',
      privacyContactEmail: 'privacy@example.com'
    };
  }

  getTermsOfServiceContent() {
    return {
      lastUpdated: new Date('2024-01-01T00:00:00.000Z').toISOString(),
      content: 'By using this website and requesting services, you agree to our terms governing acceptable use, limitations of liability, and payment obligations where applicable. Service-specific agreements and statements of work take precedence over these general terms in case of conflict.'
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
