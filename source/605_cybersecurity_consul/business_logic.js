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

  // ------------------ Storage Helpers ------------------

  _initStorage() {
    const arrayKeys = [
      // Entity tables
      'services',
      'managed_security_plans',
      'managed_security_plan_signups',
      'service_quote_requests',
      'consultation_time_slots',
      'consultation_bookings',
      'compliance_frameworks',
      'compliance_services',
      'compliance_packages',
      'training_courses',
      'training_plans',
      'case_studies',
      'case_study_comparisons',
      'risk_assessment_runs',
      'risk_follow_up_requests',
      'newsletter_subscriptions',
      'policy_library_plans',
      'policy_library_trials',
      // Additional collections
      'contact_inquiries'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singleton/static content objects
    if (!localStorage.getItem('about_page_content')) {
      const about = {
        companyHistory: 'Founded to help organizations navigate cybersecurity and compliance with pragmatic guidance.',
        mission: 'Enable secure, compliant digital transformation for organizations of all sizes.',
        values: ['Pragmatism', 'Transparency', 'Security by design'],
        leadershipTeam: [],
        certifications: [],
        partnerships: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('contact_page_content')) {
      const contact = {
        primaryEmail: 'contact@example.com',
        primaryPhone: '+1-000-000-0000',
        officeLocations: [],
        inquiryCategories: [
          { value: 'general_question', label: 'General question', description: 'Ask us anything about our services.' },
          { value: 'sales', label: 'Sales', description: 'Talk to sales about pricing and proposals.' },
          { value: 'support', label: 'Support', description: 'Get help with an existing engagement.' },
          { value: 'partnership', label: 'Partnership', description: 'Discuss partnerships or alliances.' },
          { value: 'other', label: 'Other', description: 'Anything else that does not fit the above.' }
        ]
      };
      localStorage.setItem('contact_page_content', JSON.stringify(contact));
    }

    if (!localStorage.getItem('privacy_policy_content')) {
      const privacy = {
        lastUpdated: new Date().toISOString().slice(0, 10),
        sections: [
          {
            id: 'introduction',
            title: 'Introduction',
            bodyHtml: '<p>We take your privacy seriously. This policy describes how we handle your data.</p>'
          }
        ]
      };
      localStorage.setItem('privacy_policy_content', JSON.stringify(privacy));
    }

    if (!localStorage.getItem('terms_of_service_content')) {
      const terms = {
        lastUpdated: new Date().toISOString().slice(0, 10),
        sections: [
          {
            id: 'introduction',
            title: 'Introduction',
            bodyHtml: '<p>By using this site, you agree to these terms of service.</p>'
          }
        ]
      };
      localStorage.setItem('terms_of_service_content', JSON.stringify(terms));
    }

    if (!localStorage.getItem('session_context')) {
      const ctx = {
        sessionId: 'session_1',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('session_context', JSON.stringify(ctx));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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

  // ------------------ Enum / Label Helpers ------------------

  _serviceCategoryLabel(categoryCode) {
    const map = {
      compliance: 'Compliance',
      managed_security: 'Managed Security',
      consulting: 'Consulting',
      training: 'Training & Awareness',
      product: 'Products'
    };
    return map[categoryCode] || categoryCode;
  }

  _supportHoursLabel(value) {
    const map = {
      business_hours: 'Business hours',
      extended_business_hours: 'Extended business hours',
      twenty_four_seven: '24/7 monitoring'
    };
    return map[value] || value;
  }

  _companySizeLabel(value) {
    const map = {
      size_1_49: '1–49 employees',
      size_50_199: '50–199 employees',
      size_200_499: '200–499 employees',
      size_500_999: '500–999 employees',
      size_1000_plus: '1000+ employees'
    };
    return map[value] || value;
  }

  _trainingCategoryLabel(value) {
    const map = {
      employee_awareness: 'Employee Awareness',
      technical_training: 'Technical Training',
      compliance_training: 'Compliance Training',
      phishing_simulation: 'Phishing Simulation',
      privacy_training: 'Privacy Training'
    };
    return map[value] || value;
  }

  _trainingLevelLabel(value) {
    const map = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      all_levels: 'All levels'
    };
    return map[value] || value;
  }

  _caseStudyIndustryLabel(value) {
    const map = {
      healthcare: 'Healthcare',
      saas_software: 'SaaS / Software',
      financial_services: 'Financial services',
      ecommerce: 'E-commerce',
      manufacturing: 'Manufacturing',
      government: 'Government',
      education: 'Education',
      technology: 'Technology',
      other: 'Other'
    };
    return map[value] || value;
  }

  _caseStudyComplianceFocusLabel(value) {
    const map = {
      soc_2: 'SOC 2',
      iso_27001: 'ISO 27001',
      pci_dss: 'PCI DSS',
      hipaa: 'HIPAA',
      gdpr: 'GDPR',
      multiple: 'Multiple frameworks'
    };
    return map[value] || value;
  }

  _regionLabel(value) {
    const map = {
      north_america: 'North America',
      europe: 'Europe',
      asia_pacific: 'Asia Pacific',
      latin_america: 'Latin America',
      middle_east_africa: 'Middle East & Africa',
      global: 'Global'
    };
    return map[value] || value;
  }

  _securityMaturityLabel(value) {
    const map = {
      no_formal_controls: 'No formal controls',
      basic_controls_in_place: 'Basic controls in place',
      defined_security_program: 'Defined security program',
      optimized_automated: 'Optimized / automated'
    };
    return map[value] || value;
  }

  _riskToleranceLabel(value) {
    const map = { low: 'Low', medium: 'Medium', high: 'High' };
    return map[value] || value;
  }

  _newsletterJobRoleLabel(value) {
    const map = {
      ciso_security_leader: 'CISO / Security leader',
      security_manager: 'Security manager',
      security_analyst: 'Security analyst',
      it_manager: 'IT manager',
      compliance_officer: 'Compliance officer',
      developer_engineer: 'Developer / Engineer',
      executive_leadership: 'Executive leadership',
      other: 'Other'
    };
    return map[value] || value;
  }

  // ------------------ Session / Draft Helpers ------------------

  _getSessionContext() {
    return this._getFromStorage('session_context', {
      sessionId: 'session_1',
      createdAt: new Date().toISOString()
    });
  }

  _getOrCreateDraftCompliancePackage() {
    const ctx = this._getSessionContext();
    const key = 'draft_compliance_package_' + ctx.sessionId;
    let draft = this._getFromStorage(key, null);
    if (!draft) {
      draft = {
        name: '',
        primaryFrameworkCode: null,
        annualBudgetMax: 0,
        annualBudgetCurrency: 'usd',
        serviceIds: [],
        totalEstimatedAnnualCost: 0,
        remainingBudget: 0
      };
      this._saveToStorage(key, draft);
    }
    return draft;
  }

  _saveDraftCompliancePackage(draft) {
    const ctx = this._getSessionContext();
    const key = 'draft_compliance_package_' + ctx.sessionId;
    this._saveToStorage(key, draft);
  }

  _recalculateCompliancePackageTotals(draft) {
    const services = this._getFromStorage('compliance_services', []);
    let total = 0;
    if (Array.isArray(draft.serviceIds)) {
      draft.serviceIds.forEach((id) => {
        const svc = services.find((s) => s.id === id);
        if (svc && typeof svc.annualPriceEstimate === 'number') {
          total += svc.annualPriceEstimate;
        }
      });
    }
    draft.totalEstimatedAnnualCost = total;
    draft.remainingBudget = draft.annualBudgetMax - total;
    if (draft.remainingBudget < 0) {
      draft.remainingBudget = draft.remainingBudget; // negative is allowed to show over-budget
    }
    return draft;
  }

  _getOrCreateDraftTrainingPlan() {
    const ctx = this._getSessionContext();
    const key = 'draft_training_plan_' + ctx.sessionId;
    let draft = this._getFromStorage(key, null);
    if (!draft) {
      draft = {
        name: '',
        courseIds: [],
        learnersCount: 0,
        deliveryMethod: 'online_self_paced',
        totalDurationMinutes: 0
      };
      this._saveToStorage(key, draft);
    }
    return draft;
  }

  _saveDraftTrainingPlan(draft) {
    const ctx = this._getSessionContext();
    const key = 'draft_training_plan_' + ctx.sessionId;
    this._saveToStorage(key, draft);
  }

  _getCurrentRiskAssessmentRun() {
    const ctx = this._getSessionContext();
    const key = 'current_risk_assessment_id_' + ctx.sessionId;
    const currentId = localStorage.getItem(key);
    if (!currentId) return null;
    const runs = this._getFromStorage('risk_assessment_runs', []);
    return runs.find((r) => r.id === currentId) || null;
  }

  _setCurrentRiskAssessmentRunId(id) {
    const ctx = this._getSessionContext();
    const key = 'current_risk_assessment_id_' + ctx.sessionId;
    localStorage.setItem(key, id);
  }

  _getOrCreateCaseStudyComparisonDraft() {
    const ctx = this._getSessionContext();
    const key = 'draft_case_study_comparison_' + ctx.sessionId;
    let draft = this._getFromStorage(key, null);
    if (!draft) {
      draft = {
        caseStudyIds: [],
        comparisonName: '',
        isSaved: false,
        savedComparisonId: null
      };
      this._saveToStorage(key, draft);
    }
    return draft;
  }

  _saveCaseStudyComparisonDraft(draft) {
    const ctx = this._getSessionContext();
    const key = 'draft_case_study_comparison_' + ctx.sessionId;
    this._saveToStorage(key, draft);
  }

  // ------------------ 1. getHomePageOverview ------------------

  getHomePageOverview() {
    const services = this._getFromStorage('services', []);
    const caseStudies = this._getFromStorage('case_studies', []);

    const activeServices = services.filter((s) => s.isActive);

    const coreOfferingsMap = {};
    activeServices.forEach((svc) => {
      const cat = svc.category;
      if (!coreOfferingsMap[cat]) {
        coreOfferingsMap[cat] = {
          categoryCode: cat,
          categoryLabel: this._serviceCategoryLabel(cat),
          services: []
        };
      }
      coreOfferingsMap[cat].services.push({
        serviceCode: svc.code,
        name: svc.name,
        shortDescription: svc.shortDescription || '',
        primaryActionType:
          svc.code === 'soc2_compliance'
            ? 'request_quote'
            : svc.code === 'managed_security_monitoring'
            ? 'view_plans'
            : svc.code === 'penetration_testing'
            ? 'schedule_consultation'
            : 'contact',
        primaryActionLabel:
          svc.code === 'soc2_compliance'
            ? 'Request a SOC 2 quote'
            : svc.code === 'managed_security_monitoring'
            ? 'View monitoring plans'
            : svc.code === 'penetration_testing'
            ? 'Schedule a consultation'
            : 'Contact us'
      });
    });

    const coreOfferings = Object.values(coreOfferingsMap);

    const primaryCallsToAction = [
      {
        id: 'cta_soc2_quote',
        label: 'Request SOC 2 audit quote',
        targetType: 'soc2_quote'
      },
      {
        id: 'cta_managed_security',
        label: 'Explore Managed Security Monitoring',
        targetType: 'managed_security_plans'
      },
      {
        id: 'cta_pentest_consultation',
        label: 'Schedule Penetration Testing Consultation',
        targetType: 'schedule_consultation'
      },
      {
        id: 'cta_risk_estimator',
        label: 'Run Security Risk Estimator',
        targetType: 'risk_estimator'
      },
      {
        id: 'cta_newsletter',
        label: 'Subscribe to Security Newsletter',
        targetType: 'newsletter_signup'
      }
    ];

    const featuredResources = [];

    // Featured case studies (if any)
    caseStudies
      .filter((c) => c.isFeatured)
      .slice(0, 3)
      .forEach((cs) => {
        featuredResources.push({
          type: 'case_study',
          title: cs.title,
          description: cs.summary || '',
          referenceType: 'case_study',
          referenceId: cs.id
        });
      });

    // Risk estimator tool
    featuredResources.push({
      type: 'tool',
      title: 'Security Risk Estimator',
      description: 'Estimate your organization\'s security risk in minutes.',
      referenceType: 'tool',
      referenceId: 'security_risk_estimator'
    });

    // Newsletter
    featuredResources.push({
      type: 'newsletter',
      title: 'Security & Compliance Newsletter',
      description: 'Monthly digest of cloud security and compliance updates.',
      referenceType: 'newsletter',
      referenceId: 'security_newsletter'
    });

    return {
      coreOfferings,
      primaryCallsToAction,
      featuredResources
    };
  }

  // ------------------ 2. getServicesOverviewPageData ------------------

  getServicesOverviewPageData() {
    const services = this._getFromStorage('services', []);
    const activeServices = services.filter((s) => s.isActive);

    const categoryMap = {};
    activeServices.forEach((svc) => {
      const cat = svc.category;
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          categoryCode: cat,
          categoryLabel: this._serviceCategoryLabel(cat),
          description: '',
          services: []
        };
      }
      categoryMap[cat].services.push({
        id: svc.id,
        code: svc.code,
        name: svc.name,
        shortDescription: svc.shortDescription || '',
        isActive: !!svc.isActive
      });
    });

    const serviceCategories = Object.values(categoryMap);

    const secondaryCallsToAction = [
      { label: 'Contact sales', targetType: 'contact_sales' },
      { label: 'General inquiry', targetType: 'general_inquiry' }
    ];

    return { serviceCategories, secondaryCallsToAction };
  }

  // ------------------ 3. getServiceDetail ------------------

  getServiceDetail(serviceCode) {
    const services = this._getFromStorage('services', []);
    const svc = services.find((s) => s.code === serviceCode) || null;

    if (!svc) {
      return {
        service: null,
        benefits: [],
        processSteps: [],
        primaryActions: []
      };
    }

    const benefits = [
      'Reduce risk with expert-led guidance.',
      'Align with industry-standard security frameworks.',
      'Demonstrate compliance to customers and auditors.'
    ];

    const processSteps = [
      {
        order: 1,
        title: 'Discovery',
        description: 'Understand your environment, objectives, and constraints.'
      },
      {
        order: 2,
        title: 'Execution',
        description: 'Deliver assessments, monitoring, or testing based on your needs.'
      },
      {
        order: 3,
        title: 'Report & Next steps',
        description: 'Provide findings, remediation roadmap, and optional ongoing support.'
      }
    ];

    const primaryActions = [];
    if (svc.code === 'soc2_compliance') {
      primaryActions.push({ actionType: 'request_quote', label: 'Request a SOC 2 quote' });
    } else if (svc.code === 'managed_security_monitoring') {
      primaryActions.push({ actionType: 'view_plans', label: 'View monitoring plans' });
    } else if (svc.code === 'penetration_testing') {
      primaryActions.push({ actionType: 'schedule_consultation', label: 'Schedule a consultation' });
    } else {
      primaryActions.push({ actionType: 'contact', label: 'Contact us about this service' });
    }

    const service = {
      id: svc.id,
      code: svc.code,
      name: svc.name,
      category: svc.category,
      categoryLabel: this._serviceCategoryLabel(svc.category),
      shortDescription: svc.shortDescription || '',
      longDescription: svc.longDescription || '',
      detailPageFilename: svc.detailPageFilename,
      isActive: !!svc.isActive
    };

    return { service, benefits, processSteps, primaryActions };
  }

  // ------------------ 4. Managed Security Plans ------------------

  getManagedSecurityPlanFilterOptions() {
    const supportHoursOptions = [
      { value: 'business_hours', label: 'Business hours' },
      { value: 'extended_business_hours', label: 'Extended business hours' },
      { value: 'twenty_four_seven', label: '24/7 monitoring' }
    ];

    const endpointRangePresets = [
      { min: 1, max: 49, label: 'Up to 49 endpoints' },
      { min: 50, max: 199, label: '50–199 endpoints' },
      { min: 200, max: 499, label: '200–499 endpoints' },
      { min: 500, max: 999, label: '500–999 endpoints' },
      { min: 1000, max: 0, label: '1000+ endpoints' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return { supportHoursOptions, endpointRangePresets, sortOptions };
  }

  listManagedSecurityPlans(filters, sortBy) {
    const plans = this._getFromStorage('managed_security_plans', []);
    const services = this._getFromStorage('services', []);

    const activePlans = plans.filter((p) => p.isActive);

    const f = filters || {};
    let result = activePlans.filter((plan) => {
      // Respect service hierarchy: only plans whose service exists and is active
      const svc = services.find((s) => s.id === plan.serviceId && s.isActive);
      if (!svc) return false;

      if (Array.isArray(f.supportHours) && f.supportHours.length > 0) {
        if (!f.supportHours.includes(plan.supportHours)) return false;
      }

      if (typeof f.minEndpoints === 'number') {
        const max = plan.maxEndpoints && plan.maxEndpoints > 0 ? plan.maxEndpoints : Infinity;
        if (max < f.minEndpoints) return false;
      }

      if (typeof f.maxEndpoints === 'number') {
        if (plan.minEndpoints > f.maxEndpoints) return false;
      }

      if (typeof f.maxMonthlyPrice === 'number') {
        if (plan.monthlyPrice > f.maxMonthlyPrice) return false;
      }

      if (f.currency && plan.currency !== f.currency) {
        return false;
      }

      return true;
    });

    const sort = sortBy || 'price_low_to_high';
    result.sort((a, b) => {
      if (sort === 'price_high_to_low') {
        return b.monthlyPrice - a.monthlyPrice;
      }
      // default price_low_to_high
      return a.monthlyPrice - b.monthlyPrice;
    });

    return result.map((plan) => {
      const svc = services.find((s) => s.id === plan.serviceId) || null;
      const serviceName = svc ? svc.name : null;
      return {
        id: plan.id,
        serviceId: plan.serviceId,
        serviceName,
        service: svc, // foreign key resolution
        name: plan.name,
        shortDescription: plan.shortDescription || '',
        monthlyPrice: plan.monthlyPrice,
        currency: plan.currency,
        supportHours: plan.supportHours,
        supportHoursLabel: this._supportHoursLabel(plan.supportHours),
        minEndpoints: plan.minEndpoints,
        maxEndpoints: plan.maxEndpoints,
        recommendedCompanySize: plan.recommendedCompanySize || null,
        recommendedCompanySizeLabel: plan.recommendedCompanySize
          ? this._companySizeLabel(plan.recommendedCompanySize)
          : null,
        features: Array.isArray(plan.features) ? plan.features : [],
        isFeatured: !!plan.isFeatured,
        isActive: !!plan.isActive
      };
    });
  }

  getManagedSecurityPlanDetail(planId) {
    const plans = this._getFromStorage('managed_security_plans', []);
    const services = this._getFromStorage('services', []);
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return { plan: null };
    }

    const svc = services.find((s) => s.id === plan.serviceId) || null;
    const serviceName = svc ? svc.name : null;

    return {
      plan: {
        id: plan.id,
        serviceId: plan.serviceId,
        serviceName,
        service: svc, // foreign key resolution
        name: plan.name,
        shortDescription: plan.shortDescription || '',
        detailedDescription: plan.detailedDescription || '',
        monthlyPrice: plan.monthlyPrice,
        currency: plan.currency,
        supportHours: plan.supportHours,
        supportHoursLabel: this._supportHoursLabel(plan.supportHours),
        minEndpoints: plan.minEndpoints,
        maxEndpoints: plan.maxEndpoints,
        recommendedCompanySize: plan.recommendedCompanySize || null,
        recommendedCompanySizeLabel: plan.recommendedCompanySize
          ? this._companySizeLabel(plan.recommendedCompanySize)
          : null,
        features: Array.isArray(plan.features) ? plan.features : [],
        isFeatured: !!plan.isFeatured
      }
    };
  }

  startManagedSecurityPlanSignup(planId, fullName, workEmail, desiredStartDate, referralSource, additionalNotes) {
    const plans = this._getFromStorage('managed_security_plans', []);
    const signups = this._getFromStorage('managed_security_plan_signups', []);

    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        success: false,
        signupId: null,
        createdAt: null,
        planSummary: null,
        message: 'Managed security plan not found.'
      };
    }

    const id = this._generateId('msp_signup');
    const createdAt = new Date().toISOString();

    signups.push({
      id,
      planId,
      fullName,
      workEmail,
      desiredStartDate,
      referralSource: referralSource || null,
      additionalNotes: additionalNotes || '',
      createdAt
    });

    this._saveToStorage('managed_security_plan_signups', signups);

    return {
      success: true,
      signupId: id,
      createdAt,
      planSummary: {
        planId,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        currency: plan.currency
      },
      message: 'Managed security plan signup started.'
    };
  }

  // ------------------ 5. submitSoc2QuoteRequest ------------------

  submitSoc2QuoteRequest(
    serviceCode,
    companyName,
    industry,
    organizationSize,
    soc2ServiceType,
    timeline,
    projectDetails
  ) {
    const services = this._getFromStorage('services', []);
    const quotes = this._getFromStorage('service_quote_requests', []);

    const svc = services.find((s) => s.code === serviceCode) || null;
    if (!svc) {
      return {
        success: false,
        quoteRequestId: null,
        status: null,
        createdAt: null,
        message: 'Service not found for SOC 2 quote request.'
      };
    }

    const id = this._generateId('quote');
    const createdAt = new Date().toISOString();

    quotes.push({
      id,
      serviceId: svc.id,
      companyName,
      industry,
      organizationSize,
      soc2ServiceType: soc2ServiceType || null,
      timeline,
      projectDetails: projectDetails || '',
      status: 'new',
      createdAt
    });

    this._saveToStorage('service_quote_requests', quotes);

    return {
      success: true,
      quoteRequestId: id,
      status: 'new',
      createdAt,
      message: 'SOC 2 quote request submitted.'
    };
  }

  // ------------------ 6. Consultation scheduling ------------------

  getConsultationTimeSlotsForDate(serviceCode, date, timezone) {
    const services = this._getFromStorage('services', []);
    const slots = this._getFromStorage('consultation_time_slots', []);

    const svc = services.find((s) => s.code === serviceCode) || null;
    if (!svc) return [];

    const targetDate = date;

    return slots.filter((slot) => {
      if (slot.serviceId !== svc.id) return false;
      const slotDate = new Date(slot.startAt).toISOString().slice(0, 10);
      if (slotDate !== targetDate) return false;
      // timezone parameter is informational for this implementation
      return true;
    });
  }

  createConsultationBooking(timeSlotId, serviceCode, meetingType, name, email, company, agenda) {
    const services = this._getFromStorage('services', []);
    const slots = this._getFromStorage('consultation_time_slots', []);
    const bookings = this._getFromStorage('consultation_bookings', []);

    const svc = services.find((s) => s.code === serviceCode) || null;
    if (!svc) {
      return {
        success: false,
        bookingId: null,
        status: null,
        startAt: null,
        endAt: null,
        timezone: null,
        meetingType: null,
        message: 'Service not found for consultation booking.'
      };
    }

    const slotIndex = slots.findIndex((s) => s.id === timeSlotId);
    if (slotIndex === -1) {
      return {
        success: false,
        bookingId: null,
        status: null,
        startAt: null,
        endAt: null,
        timezone: null,
        meetingType: null,
        message: 'Time slot not found.'
      };
    }

    const slot = slots[slotIndex];
    if (slot.isBooked) {
      return {
        success: false,
        bookingId: null,
        status: null,
        startAt: slot.startAt,
        endAt: slot.endAt,
        timezone: slot.timezone || null,
        meetingType: meetingType,
        message: 'Time slot is already booked.'
      };
    }

    const id = this._generateId('consultation_booking');
    const createdAt = new Date().toISOString();

    bookings.push({
      id,
      serviceId: svc.id,
      timeSlotId,
      meetingType,
      name,
      email,
      company: company || '',
      agenda: agenda || '',
      status: 'pending',
      createdAt
    });

    // Mark slot as booked
    slots[slotIndex] = Object.assign({}, slot, { isBooked: true });
    this._saveToStorage('consultation_bookings', bookings);
    this._saveToStorage('consultation_time_slots', slots);

    return {
      success: true,
      bookingId: id,
      status: 'pending',
      startAt: slot.startAt,
      endAt: slot.endAt,
      timezone: slot.timezone || null,
      meetingType,
      message: 'Consultation booking created.'
    };
  }

  // ------------------ 7. Compliance Bundles & Services ------------------

  getComplianceBundlesOverview() {
    const frameworks = this._getFromStorage('compliance_frameworks', []);
    const packages = this._getFromStorage('compliance_packages', []);

    const frameworksOut = frameworks.map((f) => ({
      code: f.code,
      name: f.name,
      description: f.description || ''
    }));

    const predefinedBundles = packages.map((pkg) => {
      const fw = frameworks.find((f) => f.code === pkg.primaryFrameworkCode) || null;
      return {
        id: pkg.id,
        name: pkg.name,
        primaryFrameworkCode: pkg.primaryFrameworkCode,
        primaryFrameworkName: fw ? fw.name : pkg.primaryFrameworkCode,
        targetCompanySize: '',
        annualPriceEstimate: pkg.totalEstimatedAnnualCost,
        currency: pkg.annualBudgetCurrency,
        shortDescription: ''
      };
    });

    return { frameworks: frameworksOut, predefinedBundles };
  }

  setDraftCompliancePackageFramework(primaryFrameworkCode, annualBudgetMax, annualBudgetCurrency) {
    const frameworks = this._getFromStorage('compliance_frameworks', []);
    let draft = this._getOrCreateDraftCompliancePackage();

    draft.primaryFrameworkCode = primaryFrameworkCode;
    draft.annualBudgetMax = typeof annualBudgetMax === 'number' ? annualBudgetMax : 0;
    draft.annualBudgetCurrency = annualBudgetCurrency || 'usd';
    draft.serviceIds = [];
    draft = this._recalculateCompliancePackageTotals(draft);
    this._saveDraftCompliancePackage(draft);

    const fw = frameworks.find((f) => f.code === primaryFrameworkCode) || null;

    return {
      primaryFrameworkCode,
      primaryFrameworkName: fw ? fw.name : primaryFrameworkCode,
      annualBudgetMax: draft.annualBudgetMax,
      annualBudgetCurrency: draft.annualBudgetCurrency,
      totalEstimatedAnnualCost: draft.totalEstimatedAnnualCost,
      remainingBudget: draft.remainingBudget,
      serviceCount: draft.serviceIds.length
    };
  }

  getComplianceServiceFilterOptions(primaryFrameworkCode) {
    const services = this._getFromStorage('compliance_services', []);
    const relevant = services.filter((s) => {
      if (!s.isActive) return false;
      if (primaryFrameworkCode) {
        return Array.isArray(s.frameworkCodes) && s.frameworkCodes.includes(primaryFrameworkCode);
      }
      return true;
    });

    const categorySet = {};
    relevant.forEach((s) => {
      categorySet[s.category] = true;
    });

    const categoryLabelMap = {
      assessments: 'Assessments',
      documentation: 'Documentation',
      training: 'Training',
      advisory: 'Advisory',
      managed_services: 'Managed services',
      technical_controls: 'Technical controls'
    };

    const categories = Object.keys(categorySet).map((value) => ({
      value,
      label: categoryLabelMap[value] || value
    }));

    const durationOptions = [
      { maxHours: 8, label: '1 day or less' },
      { maxHours: 40, label: 'Up to 1 week' },
      { maxHours: 160, label: 'Up to 1 month' }
    ];

    const budgetPresets = [
      { maxAnnualPrice: 10000, label: 'Up to $10,000/year' },
      { maxAnnualPrice: 25000, label: 'Up to $25,000/year' },
      { maxAnnualPrice: 50000, label: 'Up to $50,000/year' }
    ];

    return { categories, durationOptions, budgetPresets };
  }

  listComplianceServicesForFramework(primaryFrameworkCode, category, maxAnnualPrice, durationMaxHours, searchTerm) {
    const services = this._getFromStorage('compliance_services', []);

    const categoryLabelMap = {
      assessments: 'Assessments',
      documentation: 'Documentation',
      training: 'Training',
      advisory: 'Advisory',
      managed_services: 'Managed services',
      technical_controls: 'Technical controls'
    };

    const term = searchTerm ? String(searchTerm).toLowerCase() : null;

    const result = services.filter((s) => {
      if (!s.isActive) return false;
      if (primaryFrameworkCode) {
        if (!Array.isArray(s.frameworkCodes) || !s.frameworkCodes.includes(primaryFrameworkCode)) {
          return false;
        }
      }
      if (category && s.category !== category) return false;
      if (typeof maxAnnualPrice === 'number' && s.annualPriceEstimate > maxAnnualPrice) return false;
      if (typeof durationMaxHours === 'number' && typeof s.durationHours === 'number') {
        if (s.durationHours > durationMaxHours) return false;
      }
      if (term) {
        const text = ((s.name || '') + ' ' + (s.description || '')).toLowerCase();
        if (!text.includes(term)) return false;
      }
      return true;
    });

    return result.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      categoryLabel: categoryLabelMap[s.category] || s.category,
      description: s.description || '',
      annualPriceEstimate: s.annualPriceEstimate,
      currency: s.currency,
      durationHours: s.durationHours,
      frameworkCodes: Array.isArray(s.frameworkCodes) ? s.frameworkCodes : []
    }));
  }

  updateDraftCompliancePackageBudget(annualBudgetMax, annualBudgetCurrency) {
    let draft = this._getOrCreateDraftCompliancePackage();
    draft.annualBudgetMax = typeof annualBudgetMax === 'number' ? annualBudgetMax : 0;
    draft.annualBudgetCurrency = annualBudgetCurrency || 'usd';
    draft = this._recalculateCompliancePackageTotals(draft);
    this._saveDraftCompliancePackage(draft);

    return {
      annualBudgetMax: draft.annualBudgetMax,
      annualBudgetCurrency: draft.annualBudgetCurrency,
      totalEstimatedAnnualCost: draft.totalEstimatedAnnualCost,
      remainingBudget: draft.remainingBudget,
      isWithinBudget: draft.totalEstimatedAnnualCost <= draft.annualBudgetMax
    };
  }

  addServiceToDraftCompliancePackage(serviceId) {
    const allServices = this._getFromStorage('compliance_services', []);
    let draft = this._getOrCreateDraftCompliancePackage();

    if (!Array.isArray(draft.serviceIds)) {
      draft.serviceIds = [];
    }

    const svc = allServices.find((s) => s.id === serviceId);
    if (!svc) {
      // no change
    } else if (!draft.serviceIds.includes(serviceId)) {
      draft.serviceIds.push(serviceId);
    }

    draft = this._recalculateCompliancePackageTotals(draft);
    this._saveDraftCompliancePackage(draft);

    const selectedServices = draft.serviceIds.map((id) => {
      const s = allServices.find((cs) => cs.id === id);
      return s
        ? {
            id: s.id,
            name: s.name,
            category: s.category,
            annualPriceEstimate: s.annualPriceEstimate,
            currency: s.currency
          }
        : null;
    }).filter(Boolean);

    return {
      selectedServices,
      totalEstimatedAnnualCost: draft.totalEstimatedAnnualCost,
      annualBudgetMax: draft.annualBudgetMax,
      annualBudgetCurrency: draft.annualBudgetCurrency,
      remainingBudget: draft.remainingBudget,
      isWithinBudget: draft.totalEstimatedAnnualCost <= draft.annualBudgetMax
    };
  }

  removeServiceFromDraftCompliancePackage(serviceId) {
    const allServices = this._getFromStorage('compliance_services', []);
    let draft = this._getOrCreateDraftCompliancePackage();

    if (!Array.isArray(draft.serviceIds)) {
      draft.serviceIds = [];
    }

    draft.serviceIds = draft.serviceIds.filter((id) => id !== serviceId);
    draft = this._recalculateCompliancePackageTotals(draft);
    this._saveDraftCompliancePackage(draft);

    const selectedServices = draft.serviceIds.map((id) => {
      const s = allServices.find((cs) => cs.id === id);
      return s
        ? {
            id: s.id,
            name: s.name,
            category: s.category,
            annualPriceEstimate: s.annualPriceEstimate,
            currency: s.currency
          }
        : null;
    }).filter(Boolean);

    return {
      selectedServices,
      totalEstimatedAnnualCost: draft.totalEstimatedAnnualCost,
      annualBudgetMax: draft.annualBudgetMax,
      annualBudgetCurrency: draft.annualBudgetCurrency,
      remainingBudget: draft.remainingBudget,
      isWithinBudget: draft.totalEstimatedAnnualCost <= draft.annualBudgetMax
    };
  }

  getDraftCompliancePackageSummary() {
    const frameworks = this._getFromStorage('compliance_frameworks', []);
    const allServices = this._getFromStorage('compliance_services', []);
    const draft = this._getOrCreateDraftCompliancePackage();

    const fw = frameworks.find((f) => f.code === draft.primaryFrameworkCode) || null;

    const categoryLabelMap = {
      assessments: 'Assessments',
      documentation: 'Documentation',
      training: 'Training',
      advisory: 'Advisory',
      managed_services: 'Managed services',
      technical_controls: 'Technical controls'
    };

    const selectedServices = (draft.serviceIds || []).map((id) => {
      const s = allServices.find((cs) => cs.id === id);
      return s
        ? {
            id: s.id,
            name: s.name,
            category: s.category,
            categoryLabel: categoryLabelMap[s.category] || s.category,
            annualPriceEstimate: s.annualPriceEstimate,
            currency: s.currency
          }
        : null;
    }).filter(Boolean);

    return {
      name: draft.name || '',
      primaryFrameworkCode: draft.primaryFrameworkCode,
      primaryFrameworkName: fw ? fw.name : draft.primaryFrameworkCode,
      annualBudgetMax: draft.annualBudgetMax,
      annualBudgetCurrency: draft.annualBudgetCurrency,
      totalEstimatedAnnualCost: draft.totalEstimatedAnnualCost,
      remainingBudget: draft.remainingBudget,
      isWithinBudget: draft.totalEstimatedAnnualCost <= draft.annualBudgetMax,
      selectedServices
    };
  }

  saveCompliancePackage(name) {
    const packages = this._getFromStorage('compliance_packages', []);
    const draft = this._getOrCreateDraftCompliancePackage();
    const updatedDraft = this._recalculateCompliancePackageTotals(draft);

    const id = this._generateId('compliance_package');
    const createdAt = new Date().toISOString();

    const pkg = {
      id,
      name,
      primaryFrameworkCode: updatedDraft.primaryFrameworkCode,
      annualBudgetMax: updatedDraft.annualBudgetMax,
      annualBudgetCurrency: updatedDraft.annualBudgetCurrency,
      serviceIds: Array.isArray(updatedDraft.serviceIds) ? updatedDraft.serviceIds.slice() : [],
      totalEstimatedAnnualCost: updatedDraft.totalEstimatedAnnualCost,
      createdAt
    };

    packages.push(pkg);
    this._saveToStorage('compliance_packages', packages);

    // also update draft name
    draft.name = name;
    this._saveDraftCompliancePackage(draft);

    return {
      id,
      name,
      primaryFrameworkCode: pkg.primaryFrameworkCode,
      annualBudgetMax: pkg.annualBudgetMax,
      annualBudgetCurrency: pkg.annualBudgetCurrency,
      serviceIds: pkg.serviceIds,
      totalEstimatedAnnualCost: pkg.totalEstimatedAnnualCost,
      createdAt
    };
  }

  // ------------------ 8. Training & Awareness ------------------

  getTrainingOverview() {
    const courses = this._getFromStorage('training_courses', []);
    const activeCourses = courses.filter((c) => c.isActive);

    const sorted = activeCourses.slice().sort((a, b) => b.rating - a.rating);
    const featuredCourses = sorted.slice(0, 3).map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      categoryLabel: this._trainingCategoryLabel(c.category),
      rating: c.rating,
      durationMinutes: c.durationMinutes
    }));

    const introText = 'Raise security awareness across your organization with role-based training.';
    const keyBenefits = [
      'Beginner to advanced cybersecurity training for all roles.',
      'Bite-sized courses designed for busy employees.',
      'Track completion and measure risk reduction over time.'
    ];

    return { introText, keyBenefits, featuredCourses };
  }

  getTrainingCatalogFilterOptions() {
    const courses = this._getFromStorage('training_courses', []);

    const categorySet = {};
    const languageSet = {};
    const levelSet = {};

    courses.forEach((c) => {
      if (c.category) categorySet[c.category] = true;
      if (c.language) languageSet[c.language] = true;
      if (c.level) levelSet[c.level] = true;
    });

    const categories = Object.keys(categorySet).map((value) => ({
      value,
      label: this._trainingCategoryLabel(value)
    }));

    const languageLabelMap = {
      english: 'English',
      spanish: 'Spanish',
      french: 'French',
      german: 'German',
      portuguese: 'Portuguese',
      japanese: 'Japanese',
      chinese: 'Chinese',
      other: 'Other'
    };

    const languages = Object.keys(languageSet).map((value) => ({
      value,
      label: languageLabelMap[value] || value
    }));

    const levels = Object.keys(levelSet).map((value) => ({
      value,
      label: this._trainingLevelLabel(value)
    }));

    const ratingOptions = [
      { minRating: 3.5, label: '3.5 stars & up' },
      { minRating: 4.0, label: '4.0 stars & up' },
      { minRating: 4.5, label: '4.5 stars & up' }
    ];

    const durationOptions = [
      { maxMinutes: 30, label: 'Up to 30 minutes' },
      { maxMinutes: 60, label: 'Up to 1 hour' },
      { maxMinutes: 120, label: 'Up to 2 hours' },
      { maxMinutes: 240, label: 'Up to 4 hours' }
    ];

    return { categories, languages, levels, ratingOptions, durationOptions };
  }

  listTrainingCourses(filters, sortBy) {
    const courses = this._getFromStorage('training_courses', []);
    const f = filters || {};

    let result = courses.filter((c) => c.isActive);

    if (f.category) {
      result = result.filter((c) => c.category === f.category);
    }
    if (f.language) {
      result = result.filter((c) => c.language === f.language);
    }
    if (f.level) {
      result = result.filter((c) => c.level === f.level);
    }
    if (typeof f.minRating === 'number') {
      result = result.filter((c) => c.rating >= f.minRating);
    }
    if (typeof f.maxDurationMinutes === 'number') {
      result = result.filter((c) => c.durationMinutes <= f.maxDurationMinutes);
    }

    const sort = sortBy || 'rating_desc';
    result.sort((a, b) => {
      if (sort === 'duration_asc') {
        return a.durationMinutes - b.durationMinutes;
      }
      if (sort === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // default rating_desc
      if (b.rating === a.rating) {
        return (a.title || '').localeCompare(b.title || '');
      }
      return b.rating - a.rating;
    });

    return result.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      categoryLabel: this._trainingCategoryLabel(c.category),
      language: c.language,
      level: c.level,
      levelLabel: this._trainingLevelLabel(c.level),
      rating: c.rating,
      durationMinutes: c.durationMinutes,
      shortDescription: c.shortDescription || '',
      isActive: !!c.isActive
    }));
  }

  addCourseToDraftTrainingPlan(courseId) {
    const allCourses = this._getFromStorage('training_courses', []);
    const draft = this._getOrCreateDraftTrainingPlan();

    if (!Array.isArray(draft.courseIds)) {
      draft.courseIds = [];
    }

    const course = allCourses.find((c) => c.id === courseId);
    if (course && !draft.courseIds.includes(courseId)) {
      draft.courseIds.push(courseId);
    }

    // recalc duration
    let total = 0;
    draft.courseIds.forEach((id) => {
      const c = allCourses.find((tc) => tc.id === id);
      if (c) total += c.durationMinutes;
    });
    draft.totalDurationMinutes = total;

    this._saveDraftTrainingPlan(draft);

    const coursesOut = draft.courseIds.map((id) => {
      const c = allCourses.find((tc) => tc.id === id);
      return c
        ? {
            id: c.id,
            title: c.title,
            durationMinutes: c.durationMinutes
          }
        : null;
    }).filter(Boolean);

    return {
      courseCount: draft.courseIds.length,
      totalDurationMinutes: draft.totalDurationMinutes,
      courses: coursesOut
    };
  }

  removeCourseFromDraftTrainingPlan(courseId) {
    const allCourses = this._getFromStorage('training_courses', []);
    const draft = this._getOrCreateDraftTrainingPlan();

    if (!Array.isArray(draft.courseIds)) {
      draft.courseIds = [];
    }

    draft.courseIds = draft.courseIds.filter((id) => id !== courseId);

    let total = 0;
    draft.courseIds.forEach((id) => {
      const c = allCourses.find((tc) => tc.id === id);
      if (c) total += c.durationMinutes;
    });
    draft.totalDurationMinutes = total;

    this._saveDraftTrainingPlan(draft);

    const coursesOut = draft.courseIds.map((id) => {
      const c = allCourses.find((tc) => tc.id === id);
      return c
        ? {
            id: c.id,
            title: c.title,
            durationMinutes: c.durationMinutes
          }
        : null;
    }).filter(Boolean);

    return {
      courseCount: draft.courseIds.length,
      totalDurationMinutes: draft.totalDurationMinutes,
      courses: coursesOut
    };
  }

  getDraftTrainingPlan() {
    const allCourses = this._getFromStorage('training_courses', []);
    const draft = this._getOrCreateDraftTrainingPlan();

    const deliveryLabelMap = {
      online_self_paced: 'Online self-paced',
      virtual_instructor_led: 'Virtual instructor-led',
      in_person: 'In-person',
      blended: 'Blended'
    };

    const coursesOut = (draft.courseIds || []).map((id) => {
      const c = allCourses.find((tc) => tc.id === id);
      return c
        ? {
            id: c.id,
            title: c.title,
            category: c.category,
            categoryLabel: this._trainingCategoryLabel(c.category),
            durationMinutes: c.durationMinutes
          }
        : null;
    }).filter(Boolean);

    return {
      name: draft.name || '',
      courses: coursesOut,
      learnersCount: draft.learnersCount || 0,
      deliveryMethod: draft.deliveryMethod || 'online_self_paced',
      deliveryMethodLabel: deliveryLabelMap[draft.deliveryMethod || 'online_self_paced'],
      totalDurationMinutes: draft.totalDurationMinutes || 0
    };
  }

  updateDraftTrainingPlanSettings(learnersCount, deliveryMethod, name) {
    const draft = this._getOrCreateDraftTrainingPlan();

    draft.learnersCount = typeof learnersCount === 'number' ? learnersCount : 0;
    draft.deliveryMethod = deliveryMethod || 'online_self_paced';
    if (name) draft.name = name;

    this._saveDraftTrainingPlan(draft);

    const deliveryLabelMap = {
      online_self_paced: 'Online self-paced',
      virtual_instructor_led: 'Virtual instructor-led',
      in_person: 'In-person',
      blended: 'Blended'
    };

    return {
      name: draft.name || '',
      learnersCount: draft.learnersCount,
      deliveryMethod: draft.deliveryMethod,
      deliveryMethodLabel: deliveryLabelMap[draft.deliveryMethod]
    };
  }

  saveTrainingPlan(name) {
    const plans = this._getFromStorage('training_plans', []);
    const draft = this._getOrCreateDraftTrainingPlan();

    const id = this._generateId('training_plan');
    const createdAt = new Date().toISOString();

    const plan = {
      id,
      name,
      courseIds: Array.isArray(draft.courseIds) ? draft.courseIds.slice() : [],
      learnersCount: draft.learnersCount || 0,
      deliveryMethod: draft.deliveryMethod || 'online_self_paced',
      totalDurationMinutes: draft.totalDurationMinutes || 0,
      createdAt
    };

    plans.push(plan);
    this._saveToStorage('training_plans', plans);

    // Update draft name as well
    draft.name = name;
    this._saveDraftTrainingPlan(draft);

    return {
      id,
      name,
      courseIds: plan.courseIds,
      learnersCount: plan.learnersCount,
      deliveryMethod: plan.deliveryMethod,
      totalDurationMinutes: plan.totalDurationMinutes,
      createdAt
    };
  }

  // ------------------ 9. Case Studies & Comparison ------------------

  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies', []);

    const industriesSet = {};
    const focusSet = {};

    caseStudies.forEach((c) => {
      industriesSet[c.industry] = true;
      focusSet[c.complianceFocus] = true;
    });

    const industries = Object.keys(industriesSet).map((value) => ({
      value,
      label: this._caseStudyIndustryLabel(value)
    }));

    const complianceFocuses = Object.keys(focusSet).map((value) => ({
      value,
      label: this._caseStudyComplianceFocusLabel(value)
    }));

    const sortOptions = [
      { value: 'project_duration_longest_first', label: 'Project duration: longest first' },
      { value: 'project_duration_shortest_first', label: 'Project duration: shortest first' }
    ];

    return { industries, complianceFocuses, sortOptions };
  }

  listCaseStudies(filters, sortBy) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const f = filters || {};

    let result = caseStudies.slice();

    if (f.industry) {
      result = result.filter((c) => c.industry === f.industry);
    }
    if (f.complianceFocus) {
      result = result.filter((c) => c.complianceFocus === f.complianceFocus);
    }

    const sort = sortBy || 'project_duration_longest_first';
    result.sort((a, b) => {
      if (sort === 'project_duration_shortest_first') {
        return a.projectDurationMonths - b.projectDurationMonths;
      }
      // default longest_first
      return b.projectDurationMonths - a.projectDurationMonths;
    });

    return result.map((c) => ({
      id: c.id,
      title: c.title,
      industry: c.industry,
      industryLabel: this._caseStudyIndustryLabel(c.industry),
      complianceFocus: c.complianceFocus,
      complianceFocusLabel: this._caseStudyComplianceFocusLabel(c.complianceFocus),
      projectDurationMonths: c.projectDurationMonths,
      clientSize: c.clientSize || null,
      clientSizeLabel: c.clientSize ? this._companySizeLabel(c.clientSize) : null,
      summary: c.summary || '',
      isFeatured: !!c.isFeatured
    }));
  }

  addCaseStudyToComparison(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const draft = this._getOrCreateCaseStudyComparisonDraft();

    const maxSelectable = 3;

    if (!Array.isArray(draft.caseStudyIds)) {
      draft.caseStudyIds = [];
    }

    const cs = caseStudies.find((c) => c.id === caseStudyId);
    if (cs && !draft.caseStudyIds.includes(caseStudyId) && draft.caseStudyIds.length < maxSelectable) {
      draft.caseStudyIds.push(caseStudyId);
    }

    this._saveCaseStudyComparisonDraft(draft);

    const selected = draft.caseStudyIds.map((id) => {
      const c = caseStudies.find((cs2) => cs2.id === id);
      return c
        ? {
            id: c.id,
            title: c.title
          }
        : null;
    }).filter(Boolean);

    return {
      caseStudies: selected,
      maxSelectable,
      canAddMore: draft.caseStudyIds.length < maxSelectable
    };
  }

  removeCaseStudyFromComparison(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const draft = this._getOrCreateCaseStudyComparisonDraft();

    const maxSelectable = 3;

    if (!Array.isArray(draft.caseStudyIds)) {
      draft.caseStudyIds = [];
    }

    draft.caseStudyIds = draft.caseStudyIds.filter((id) => id !== caseStudyId);

    this._saveCaseStudyComparisonDraft(draft);

    const selected = draft.caseStudyIds.map((id) => {
      const c = caseStudies.find((cs2) => cs2.id === id);
      return c
        ? {
            id: c.id,
            title: c.title
          }
        : null;
    }).filter(Boolean);

    return {
      caseStudies: selected,
      maxSelectable,
      canAddMore: draft.caseStudyIds.length < maxSelectable
    };
  }

  getCurrentCaseStudyComparison() {
    const caseStudies = this._getFromStorage('case_studies', []);
    const draft = this._getOrCreateCaseStudyComparisonDraft();

    const selected = (draft.caseStudyIds || []).map((id) => {
      const c = caseStudies.find((cs) => cs.id === id);
      if (!c) return null;
      return {
        id: c.id,
        title: c.title,
        industry: c.industry,
        industryLabel: this._caseStudyIndustryLabel(c.industry),
        complianceFocus: c.complianceFocus,
        complianceFocusLabel: this._caseStudyComplianceFocusLabel(c.complianceFocus),
        projectDurationMonths: c.projectDurationMonths,
        clientSize: c.clientSize || null,
        clientSizeLabel: c.clientSize ? this._companySizeLabel(c.clientSize) : null,
        summary: c.summary || '',
        results: c.results || ''
      };
    }).filter(Boolean);

    return {
      comparisonName: draft.comparisonName || '',
      isSaved: !!draft.isSaved,
      caseStudies: selected
    };
  }

  saveCaseStudyComparison(name, notes) {
    const comparisons = this._getFromStorage('case_study_comparisons', []);
    const draft = this._getOrCreateCaseStudyComparisonDraft();

    const id = this._generateId('case_study_comparison');
    const createdAt = new Date().toISOString();

    const comparison = {
      id,
      name,
      caseStudyIds: Array.isArray(draft.caseStudyIds) ? draft.caseStudyIds.slice() : [],
      notes: notes || '',
      createdAt
    };

    comparisons.push(comparison);
    this._saveToStorage('case_study_comparisons', comparisons);

    draft.comparisonName = name;
    draft.isSaved = true;
    draft.savedComparisonId = id;
    this._saveCaseStudyComparisonDraft(draft);

    return {
      id,
      name,
      caseStudyIds: comparison.caseStudyIds,
      notes: comparison.notes,
      createdAt
    };
  }

  // ------------------ 10. Security Risk Estimator ------------------

  getRiskEstimatorInitialOptions() {
    const industries = [
      'healthcare',
      'saas_software',
      'financial_services',
      'ecommerce',
      'manufacturing',
      'government',
      'education',
      'technology',
      'other'
    ].map((value) => ({
      value,
      label: this._caseStudyIndustryLabel(value)
    }));

    const organizationSizes = [
      'size_1_49',
      'size_50_199',
      'size_200_499',
      'size_500_999',
      'size_1000_plus'
    ].map((value) => ({
      value,
      label: this._companySizeLabel(value)
    }));

    const regions = [
      'north_america',
      'europe',
      'asia_pacific',
      'latin_america',
      'middle_east_africa',
      'global'
    ].map((value) => ({
      value,
      label: this._regionLabel(value)
    }));

    const securityMaturities = [
      'no_formal_controls',
      'basic_controls_in_place',
      'defined_security_program',
      'optimized_automated'
    ].map((value) => ({
      value,
      label: this._securityMaturityLabel(value)
    }));

    const riskToleranceOptions = ['low', 'medium', 'high'].map((value) => ({
      value,
      label: this._riskToleranceLabel(value)
    }));

    return { industries, organizationSizes, regions, securityMaturities, riskToleranceOptions };
  }

  setRiskEstimatorIndustry(industry) {
    const runs = this._getFromStorage('risk_assessment_runs', []);

    const id = this._generateId('risk_run');
    const createdAt = new Date().toISOString();

    const run = {
      id,
      industry,
      organizationSize: null,
      region: null,
      securityMaturity: null,
      riskTolerance: null,
      overallRiskScore: 0,
      overallRiskLevel: 'low',
      notes: '',
      createdAt
    };

    runs.push(run);
    this._saveToStorage('risk_assessment_runs', runs);
    this._setCurrentRiskAssessmentRunId(id);

    return {
      industry,
      createdAt,
      currentStep: 'organization_size'
    };
  }

  setRiskEstimatorOrganizationSize(organizationSize) {
    const runs = this._getFromStorage('risk_assessment_runs', []);
    let run = this._getCurrentRiskAssessmentRun();

    if (!run) {
      // create a new minimal run if none exists
      const id = this._generateId('risk_run');
      const createdAt = new Date().toISOString();
      run = {
        id,
        industry: 'other',
        organizationSize,
        region: null,
        securityMaturity: null,
        riskTolerance: null,
        overallRiskScore: 0,
        overallRiskLevel: 'low',
        notes: '',
        createdAt
      };
      runs.push(run);
      this._saveToStorage('risk_assessment_runs', runs);
      this._setCurrentRiskAssessmentRunId(id);
    } else {
      const idx = runs.findIndex((r) => r.id === run.id);
      if (idx !== -1) {
        runs[idx].organizationSize = organizationSize;
        run = runs[idx];
        this._saveToStorage('risk_assessment_runs', runs);
      }
    }

    return {
      industry: run.industry,
      organizationSize,
      currentStep: 'context'
    };
  }

  calculateRiskScore(region, securityMaturity, riskTolerance) {
    const runs = this._getFromStorage('risk_assessment_runs', []);
    let run = this._getCurrentRiskAssessmentRun();

    if (!run) {
      const id = this._generateId('risk_run');
      const createdAt = new Date().toISOString();
      run = {
        id,
        industry: 'other',
        organizationSize: 'size_1_49',
        region,
        securityMaturity,
        riskTolerance,
        overallRiskScore: 0,
        overallRiskLevel: 'low',
        notes: '',
        createdAt
      };
      runs.push(run);
      this._saveToStorage('risk_assessment_runs', runs);
      this._setCurrentRiskAssessmentRunId(id);
    }

    const idx = runs.findIndex((r) => r.id === run.id);
    if (idx === -1) {
      return {
        overallRiskScore: 0,
        overallRiskLevel: 'low',
        explanation: 'Risk assessment run not found.',
        breakdown: [],
        createdAt: run.createdAt
      };
    }

    // Update context
    runs[idx].region = region;
    runs[idx].securityMaturity = securityMaturity;
    runs[idx].riskTolerance = riskTolerance;

    // Simple scoring model
    let score = 50;

    const sizeFactorMap = {
      size_1_49: -5,
      size_50_199: 0,
      size_200_499: 5,
      size_500_999: 10,
      size_1000_plus: 15
    };

    const maturityFactorMap = {
      no_formal_controls: 20,
      basic_controls_in_place: 10,
      defined_security_program: -5,
      optimized_automated: -10
    };

    const toleranceFactorMap = {
      low: -10,
      medium: 0,
      high: 10
    };

    const regionFactorMap = {
      north_america: 0,
      europe: 0,
      asia_pacific: 2,
      latin_america: 3,
      middle_east_africa: 4,
      global: 1
    };

    const sizeFactor = sizeFactorMap[runs[idx].organizationSize] || 0;
    const maturityFactor = maturityFactorMap[securityMaturity] || 0;
    const toleranceFactor = toleranceFactorMap[riskTolerance] || 0;
    const regionFactor = regionFactorMap[region] || 0;

    score += sizeFactor + maturityFactor + toleranceFactor + regionFactor;

    if (score < 0) score = 0;
    if (score > 100) score = 100;

    let level = 'low';
    if (score >= 75) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 25) level = 'medium';

    runs[idx].overallRiskScore = score;
    runs[idx].overallRiskLevel = level;

    this._saveToStorage('risk_assessment_runs', runs);

    const breakdown = [
      {
        dimension: 'organization_size',
        score: score,
        weight: 0.25,
        description: 'Impact of company size on overall risk.'
      },
      {
        dimension: 'security_maturity',
        score: score,
        weight: 0.4,
        description: 'Influence of current security controls and program maturity.'
      },
      {
        dimension: 'risk_tolerance',
        score: score,
        weight: 0.2,
        description: 'Adjustment based on your stated risk tolerance.'
      },
      {
        dimension: 'region',
        score: score,
        weight: 0.15,
        description: 'Regional regulatory and threat landscape factors.'
      }
    ];

    const explanation =
      'Your risk score reflects your organization size, security maturity, risk tolerance, and regional context.';

    return {
      overallRiskScore: score,
      overallRiskLevel: level,
      explanation,
      breakdown,
      createdAt: runs[idx].createdAt
    };
  }

  updateRiskAssessmentNotes(notes) {
    const runs = this._getFromStorage('risk_assessment_runs', []);
    const run = this._getCurrentRiskAssessmentRun();

    if (!run) {
      return {
        overallRiskScore: 0,
        overallRiskLevel: 'low',
        notes: notes || '',
        updatedAt: new Date().toISOString()
      };
    }

    const idx = runs.findIndex((r) => r.id === run.id);
    if (idx === -1) {
      return {
        overallRiskScore: 0,
        overallRiskLevel: 'low',
        notes: notes || '',
        updatedAt: new Date().toISOString()
      };
    }

    runs[idx].notes = notes || '';
    const updatedAt = new Date().toISOString();
    this._saveToStorage('risk_assessment_runs', runs);

    return {
      overallRiskScore: runs[idx].overallRiskScore,
      overallRiskLevel: runs[idx].overallRiskLevel,
      notes: runs[idx].notes,
      updatedAt
    };
  }

  requestRiskAssessmentFollowUp(name, email, preferredContactMethod) {
    const run = this._getCurrentRiskAssessmentRun();
    if (!run) {
      return {
        success: false,
        followUpRequestId: null,
        message: 'No risk assessment run found to attach follow-up to.'
      };
    }

    const requests = this._getFromStorage('risk_follow_up_requests', []);
    const id = this._generateId('risk_followup');
    const createdAt = new Date().toISOString();

    requests.push({
      id,
      riskAssessmentId: run.id,
      name,
      email,
      preferredContactMethod,
      createdAt
    });

    this._saveToStorage('risk_follow_up_requests', requests);

    return {
      success: true,
      followUpRequestId: id,
      message: 'Risk assessment follow-up request submitted.'
    };
  }

  // ------------------ 11. Newsletter ------------------

  getNewsletterOptions() {
    const jobRoles = [
      'ciso_security_leader',
      'security_manager',
      'security_analyst',
      'it_manager',
      'compliance_officer',
      'developer_engineer',
      'executive_leadership',
      'other'
    ].map((value) => ({
      value,
      label: this._newsletterJobRoleLabel(value)
    }));

    const companySizes = [
      'size_1_49',
      'size_50_199',
      'size_200_499',
      'size_500_999',
      'size_1000_plus'
    ].map((value) => ({
      value,
      label: this._companySizeLabel(value)
    }));

    const regions = [
      'north_america',
      'europe',
      'asia_pacific',
      'latin_america',
      'middle_east_africa',
      'global'
    ].map((value) => ({
      value,
      label: this._regionLabel(value)
    }));

    const topics = [
      { value: 'cloud_security', label: 'Cloud Security' },
      { value: 'compliance_updates', label: 'Compliance updates' },
      { value: 'threat_intelligence', label: 'Threat intelligence' },
      { value: 'training_awareness', label: 'Training & awareness' }
    ];

    const emailFrequencies = [
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Every 2 weeks' },
      { value: 'monthly_digest', label: 'Monthly digest' },
      { value: 'quarterly', label: 'Quarterly' }
    ];

    const contactChannels = [
      { value: 'email_only', label: 'Email only' },
      { value: 'email_and_phone', label: 'Email and phone' },
      { value: 'phone_only', label: 'Phone only' },
      { value: 'none', label: 'No additional contact' }
    ];

    return {
      jobRoles,
      companySizes,
      regions,
      topics,
      emailFrequencies,
      contactChannels
    };
  }

  createNewsletterSubscription(email, jobRole, companySize, region, topics, emailFrequency, preferredContactChannel) {
    const subs = this._getFromStorage('newsletter_subscriptions', []);

    const now = new Date().toISOString();
    let existing = subs.find((s) => s.email === email) || null;
    let isNewSubscriber = false;

    if (!existing) {
      const id = this._generateId('newsletter_sub');
      existing = {
        id,
        email,
        jobRole,
        companySize: companySize || null,
        region: region || null,
        topics: Array.isArray(topics) ? topics : [],
        emailFrequency,
        preferredContactChannel,
        createdAt: now,
        isActive: true
      };
      subs.push(existing);
      isNewSubscriber = true;
    } else {
      existing.jobRole = jobRole;
      existing.companySize = companySize || null;
      existing.region = region || null;
      existing.topics = Array.isArray(topics) ? topics : [];
      existing.emailFrequency = emailFrequency;
      existing.preferredContactChannel = preferredContactChannel;
      existing.isActive = true;
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscriptionId: existing.id,
      isNewSubscriber,
      message: isNewSubscriber ? 'Subscription created.' : 'Subscription updated.'
    };
  }

  // ------------------ 12. Policy Template Library ------------------

  getPolicyLibraryOverview() {
    const plans = this._getFromStorage('policy_library_plans', []);
    const activePlans = plans.filter((p) => p.isActive);

    const introText = 'Access a curated library of security and compliance policy templates with version history.';
    const keyFeatures = [
      '100+ professionally written policy templates.',
      'Version history and change tracking.',
      'Export in multiple formats for auditors and stakeholders.'
    ];

    const highlightedPlanCodes = activePlans
      .filter((p) => p.hasVersionHistory)
      .sort((a, b) => b.templatesIncluded - a.templatesIncluded)
      .slice(0, 2)
      .map((p) => p.code);

    return { introText, keyFeatures, highlightedPlanCodes };
  }

  getPolicyLibraryPlanFilterOptions() {
    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'templates_high_to_low', label: 'Templates: High to Low' }
    ];

    return {
      supportsVersionHistoryFilter: true,
      sortOptions
    };
  }

  listPolicyLibraryPlans(filters, sortBy) {
    const plans = this._getFromStorage('policy_library_plans', []);
    const f = filters || {};

    let result = plans.filter((p) => p.isActive);

    if (f.hasVersionHistoryOnly) {
      result = result.filter((p) => p.hasVersionHistory);
    }
    if (typeof f.minTemplatesIncluded === 'number') {
      result = result.filter((p) => p.templatesIncluded >= f.minTemplatesIncluded);
    }
    if (typeof f.maxMonthlyPrice === 'number') {
      result = result.filter((p) => p.monthlyPrice <= f.maxMonthlyPrice);
    }
    if (f.currency) {
      result = result.filter((p) => p.currency === f.currency);
    }

    const sort = sortBy || 'price_low_to_high';
    result.sort((a, b) => {
      if (sort === 'templates_high_to_low') {
        return b.templatesIncluded - a.templatesIncluded;
      }
      // default price_low_to_high
      return a.monthlyPrice - b.monthlyPrice;
    });

    return result.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description || '',
      monthlyPrice: p.monthlyPrice,
      currency: p.currency,
      templatesIncluded: p.templatesIncluded,
      hasVersionHistory: !!p.hasVersionHistory,
      maxUsers: p.maxUsers || null,
      isActive: !!p.isActive
    }));
  }

  startPolicyLibraryTrial(planId, fullName, workEmail, teamSize, intendedUse, includeMarketingUpdates) {
    const plans = this._getFromStorage('policy_library_plans', []);
    const trials = this._getFromStorage('policy_library_trials', []);

    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        success: false,
        trialId: null,
        planSummary: null,
        trialLengthDays: null,
        message: 'Policy library plan not found.'
      };
    }

    const id = this._generateId('policy_trial');
    const createdAt = new Date().toISOString();
    const trialLengthDays = 14;

    trials.push({
      id,
      planId,
      fullName,
      workEmail,
      teamSize,
      intendedUse,
      includeMarketingUpdates: !!includeMarketingUpdates,
      trialLengthDays,
      createdAt
    });

    this._saveToStorage('policy_library_trials', trials);

    return {
      success: true,
      trialId: id,
      planSummary: {
        planId,
        name: plan.name,
        monthlyPrice: plan.monthlyPrice,
        currency: plan.currency
      },
      trialLengthDays,
      message: 'Policy library trial started.'
    };
  }

  // ------------------ 13. Static / Semi-static pages ------------------

  getAboutPageContent() {
    return this._getFromStorage('about_page_content', {
      companyHistory: '',
      mission: '',
      values: [],
      leadershipTeam: [],
      certifications: [],
      partnerships: []
    });
  }

  getContactPageContent() {
    return this._getFromStorage('contact_page_content', {
      primaryEmail: '',
      primaryPhone: '',
      officeLocations: [],
      inquiryCategories: []
    });
  }

  submitContactInquiry(name, email, company, inquiryCategory, subject, message, preferredContactMethod) {
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const id = this._generateId('contact_inquiry');
    const createdAt = new Date().toISOString();

    inquiries.push({
      id,
      name,
      email,
      company: company || '',
      inquiryCategory: inquiryCategory || 'other',
      subject,
      message,
      preferredContactMethod: preferredContactMethod || 'email',
      createdAt
    });

    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      ticketId: id,
      message: 'Your inquiry has been submitted.'
    };
  }

  getPrivacyPolicyContent() {
    return this._getFromStorage('privacy_policy_content', {
      lastUpdated: new Date().toISOString().slice(0, 10),
      sections: []
    });
  }

  getTermsOfServiceContent() {
    return this._getFromStorage('terms_of_service_content', {
      lastUpdated: new Date().toISOString().slice(0, 10),
      sections: []
    });
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
