// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  _initStorage() {
    const keys = [
      'users',
      'products',
      'carts',
      'cartItems',
      'service_categories',
      'services',
      'vulnerability_assessment_plans',
      'vulnerability_assessment_quote_requests',
      'consultants',
      'consultant_availability_slots',
      'consultation_bookings',
      'retainer_addons',
      'incident_response_retainer_plans',
      'training_courses',
      'course_pricing_options',
      'cart',
      'cart_items',
      'case_studies',
      'bookmarked_case_studies',
      'newsletters',
      'newsletter_topics',
      'newsletter_subscriptions',
      'iso27001_audit_packages',
      'iso27001_proposal_requests',
      'risk_questions',
      'risk_assessment_inputs',
      'risk_assessment_results',
      'risk_recommendations',
      'monitoring_plans',
      'monitoring_comparisons',
      'contact_inquiries'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('about_page_content')) {
      const about = {
        mission: '',
        history: '',
        expertise_areas: [],
        leadership: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('contact_page_content')) {
      const contact = {
        phone_numbers: [],
        emails: [],
        office_locations: []
      };
      localStorage.setItem('contact_page_content', JSON.stringify(contact));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  // ---------- Generic helpers ----------

  _findById(list, id) {
    return list.find((item) => item.id === id) || null;
  }

  _enrichServices(services) {
    const categories = this._getFromStorage('service_categories');
    return services.map((s) => ({
      ...s,
      category: categories.find((c) => c.id === s.category_id) || null
    }));
  }

  _enrichMonitoringPlans(plans) {
    const services = this._getFromStorage('services');
    return plans.map((p) => ({
      ...p,
      service: services.find((s) => s.id === p.service_id) || null
    }));
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts.find((c) => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    const cart = this._getOrCreateCart();
    if (!cart || cart.id !== cartId) {
      return;
    }
    let items = this._getFromStorage('cart_items');
    items = items.map((item) => {
      if (item.cart_id === cartId) {
        const quantity = item.quantity || 0;
        const unit = item.unit_price || 0;
        return { ...item, total_price: unit * quantity };
      }
      return item;
    });
    this._saveToStorage('cart_items', items);

    // update cart updated_at
    let carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cartId);
    if (idx !== -1) {
      carts[idx] = { ...carts[idx], updated_at: new Date().toISOString() };
      this._saveToStorage('cart', carts);
    }
  }

  _getOrCreateMonitoringComparison() {
    let comparisons = this._getFromStorage('monitoring_comparisons');
    let comparison = comparisons[0] || null;
    if (!comparison) {
      comparison = {
        id: this._generateId('moncomp'),
        plan_ids: [],
        preferred_plan_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      comparisons.push(comparison);
      this._saveToStorage('monitoring_comparisons', comparisons);
    }
    return comparison;
  }

  _calculateIncidentResponseRetainerBasePrice(
    remote_support_hours,
    onsite_support_hours,
    coverage_region,
    on_call_window,
    selectedAddonIds
  ) {
    const remoteHours = Number(remote_support_hours) || 0;
    const onsiteHours = Number(onsite_support_hours) || 0;
    let base = remoteHours * 150 + onsiteHours * 250;

    let regionMultiplier = 1;
    if (coverage_region === 'global') {
      regionMultiplier = 1.3;
    } else if (coverage_region === 'emea' || coverage_region === 'apac') {
      regionMultiplier = 1.15;
    } else if (coverage_region === 'latam') {
      regionMultiplier = 1.1;
    }

    let windowMultiplier = 1;
    if (on_call_window === 'extended_hours') {
      windowMultiplier = 1.2;
    } else if (on_call_window === 'twenty_four_seven') {
      windowMultiplier = 1.5;
    }

    base = base * regionMultiplier * windowMultiplier;

    const addons = this._getFromStorage('retainer_addons');
    const addonIds = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];
    const addonsTotal = addonIds.reduce((sum, id) => {
      const addon = addons.find((a) => a.id === id);
      return addon && addon.is_active ? sum + (addon.monthly_price || 0) : sum;
    }, 0);

    return base + addonsTotal;
  }

  _calculateRiskScore(assessmentInput) {
    const answers = Array.isArray(assessmentInput.answers) ? assessmentInput.answers : [];
    let score = 50;

    const employees = assessmentInput.employee_count || 0;
    if (employees >= 1000) score += 15;
    else if (employees >= 500) score += 10;
    else if (employees >= 200) score += 5;

    const revenue = assessmentInput.annual_revenue || 0;
    if (revenue >= 50000000) score += 10;
    else if (revenue >= 20000000) score += 5;

    answers.forEach((a) => {
      if (!a || typeof a.value === 'undefined') return;
      const v = String(a.value).toLowerCase();
      if (v === 'no' || v === 'false') {
        score += 3;
      } else if (v === 'yes' || v === 'true') {
        score -= 2;
      }
    });

    if (score < 0) score = 0;
    if (score > 100) score = 100;

    let risk_level = 'medium';
    if (score < 30) risk_level = 'low';
    else if (score < 60) risk_level = 'medium';
    else if (score < 80) risk_level = 'high';
    else risk_level = 'critical';

    return { score, risk_level };
  }

  _resolveNewsletterBySlug(slug) {
    const newsletters = this._getFromStorage('newsletters');
    return newsletters.find((n) => n.slug === slug) || null;
  }

  // ---------- Homepage interfaces ----------

  getHomeFeaturedServices() {
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    const enrichedServices = this._enrichServices(services);
    const featuredServices = enrichedServices.slice(0, 3).map((service) => {
      let primary_benefit = '';
      switch (service.service_type) {
        case 'vulnerability_assessment':
          primary_benefit = 'Identify and prioritize critical vulnerabilities before attackers do.';
          break;
        case 'iso_27001_audit':
          primary_benefit = 'Prepare for ISO 27001 certification with a structured gap assessment.';
          break;
        case 'security_monitoring':
          primary_benefit = '24/7 visibility into threats across your environment.';
          break;
        case 'incident_response_retainer':
          primary_benefit = 'Have an expert incident response team on standby when breaches occur.';
          break;
        case 'consultation':
          primary_benefit = 'Speak directly with senior security advisors about your risk posture.';
          break;
        case 'training':
          primary_benefit = 'Raise security awareness across your workforce.';
          break;
        case 'risk_tool':
          primary_benefit = 'Quantify your cyber risk with a fast, data-driven assessment.';
          break;
        case 'newsletter':
          primary_benefit = 'Stay ahead of emerging threats with curated expert insights.';
          break;
        default:
          primary_benefit = 'Learn more about this security service.';
      }

      return {
        service,
        category_name: service.category ? service.category.name : '',
        primary_benefit
      };
    });

    return { featuredServices };
  }

  getHomePrimaryCTAs() {
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    const ctas = [];

    const addCTAForType = (type, key, label, subtitle) => {
      const svc = services.find((s) => s.service_type === type);
      if (svc) {
        ctas.push({
          key,
          label,
          subtitle,
          target_page_slug: svc.slug || svc.detail_page_filename || ''
        });
      }
    };

    addCTAForType(
      'vulnerability_assessment',
      'request_vulnerability_quote',
      'Request a Vulnerability Assessment Quote',
      'Get pricing and timelines tailored to your environment.'
    );
    addCTAForType(
      'consultation',
      'book_consultation',
      'Book a Cyber Risk Consultation',
      'Schedule time with a senior security consultant.'
    );
    addCTAForType(
      'training',
      'browse_training',
      'Browse Security Awareness Training',
      'Equip your team to spot and stop modern attacks.'
    );
    addCTAForType(
      'risk_tool',
      'use_risk_calculator',
      'Run a Cyber Risk Assessment',
      'Get an instant risk score and mitigation roadmap.'
    );

    return { ctas };
  }

  getHomeQuickLinks() {
    const sections = [
      {
        key: 'managed_services',
        title: 'Managed Security Services',
        items: [
          {
            label: 'Incident Response Retainers',
            description: 'Have experts on standby before incidents occur.',
            target_page_slug: 'incident-response-retainer'
          },
          {
            label: '24/7 Security Monitoring',
            description: 'Continuous monitoring and rapid response.',
            target_page_slug: 'security-monitoring'
          }
        ]
      },
      {
        key: 'resources',
        title: 'Resources',
        items: [
          {
            label: 'Case Studies',
            description: 'See how peers reduced breach risk.',
            target_page_slug: 'resources-case-studies'
          },
          {
            label: 'Insights & Articles',
            description: 'Expert commentary on emerging threats.',
            target_page_slug: 'resources-insights'
          }
        ]
      },
      {
        key: 'newsletters',
        title: 'Newsletters',
        items: [
          {
            label: 'Executive Risk Briefing',
            description: 'Monthly briefings for senior leaders.',
            target_page_slug: 'executive-risk-briefing'
          }
        ]
      },
      {
        key: 'contact',
        title: 'Contact',
        items: [
          {
            label: 'Contact Us',
            description: 'Talk to our team about your security priorities.',
            target_page_slug: 'contact'
          }
        ]
      }
    ];
    return { sections };
  }

  // ---------- Services overview ----------

  getServiceCategories() {
    const categories = this._getFromStorage('service_categories').filter((c) => c.is_active);
    categories.sort((a, b) => {
      const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
      return ao - bo;
    });
    return categories;
  }

  getServicesByCategory(categorySlug) {
    const categories = this._getFromStorage('service_categories').filter((c) => c.is_active);
    const servicesAll = this._getFromStorage('services').filter((s) => s.is_active);

    const selectedCategories = categorySlug
      ? categories.filter((c) => c.slug === categorySlug)
      : categories;

    const result = selectedCategories.map((cat) => {
      const services = servicesAll.filter((s) => s.category_id === cat.id);
      const enriched = this._enrichServices(services);
      return {
        category: cat,
        services: enriched
      };
    });

    return result;
  }

  // ---------- Vulnerability Assessment ----------

  getVulnerabilityAssessmentServicePageData() {
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    const vulnService = services.find((s) => s.service_type === 'vulnerability_assessment') || null;
    if (!vulnService) {
      return { service: null, plans: [] };
    }
    const service = this._enrichServices([vulnService])[0];

    const plansAll = this._getFromStorage('vulnerability_assessment_plans').filter(
      (p) => p.is_active
    );
    const plans = plansAll
      .filter((p) => p.service_id === vulnService.id)
      .map((p) => ({ ...p, service }));

    return { service, plans };
  }

  submitVulnerabilityAssessmentQuoteRequest(
    planId,
    company_name,
    employee_count,
    contact_name,
    contact_email,
    contact_phone,
    project_description
  ) {
    const plans = this._getFromStorage('vulnerability_assessment_plans');
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      throw new Error('Vulnerability assessment plan not found');
    }

    const quoteRequests = this._getFromStorage('vulnerability_assessment_quote_requests');
    const quoteRequest = {
      id: this._generateId('va_quote'),
      plan_id: planId,
      company_name,
      employee_count,
      contact_name,
      contact_email,
      contact_phone: contact_phone || '',
      project_description,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    };
    quoteRequests.push(quoteRequest);
    this._saveToStorage('vulnerability_assessment_quote_requests', quoteRequests);

    return {
      quoteRequest,
      plan,
      message: 'Vulnerability assessment quote request submitted'
    };
  }

  // ---------- ISO 27001 Audit ----------

  getISO27001AuditServicePageData(employee_count) {
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    const isoService = services.find((s) => s.service_type === 'iso_27001_audit') || null;
    if (!isoService) {
      return { service: null, packages: [] };
    }
    const service = this._enrichServices([isoService])[0];

    let packages = this._getFromStorage('iso27001_audit_packages').filter(
      (p) => p.is_active && p.service_id === isoService.id
    );

    if (typeof employee_count === 'number') {
      packages.sort((a, b) => {
        const aInRange =
          (typeof a.min_employees !== 'number' || employee_count >= a.min_employees) &&
          (typeof a.max_employees !== 'number' || employee_count <= a.max_employees);
        const bInRange =
          (typeof b.min_employees !== 'number' || employee_count >= b.min_employees) &&
          (typeof b.max_employees !== 'number' || employee_count <= b.max_employees);
        if (aInRange === bInRange) return 0;
        return aInRange ? -1 : 1;
      });
    }

    packages = packages.map((p) => ({ ...p, service }));

    return { service, packages };
  }

  submitISO27001ProposalRequest(
    packageId,
    employee_count,
    company_name,
    contact_name,
    contact_email,
    contact_phone,
    project_description
  ) {
    const packages = this._getFromStorage('iso27001_audit_packages');
    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) {
      throw new Error('ISO 27001 audit package not found');
    }

    const requests = this._getFromStorage('iso27001_proposal_requests');
    const proposalRequest = {
      id: this._generateId('iso27001_req'),
      package_id: packageId,
      employee_count,
      company_name,
      contact_name,
      contact_email,
      contact_phone: contact_phone || '',
      project_description,
      status: 'submitted',
      submitted_at: new Date().toISOString()
    };
    requests.push(proposalRequest);
    this._saveToStorage('iso27001_proposal_requests', requests);

    return {
      proposalRequest,
      package: pkg,
      message: 'ISO 27001 proposal request submitted'
    };
  }

  // ---------- Managed Services & Monitoring ----------

  getManagedServicesOverview() {
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    const managedTypes = ['incident_response_retainer', 'security_monitoring'];
    const managedRaw = services.filter((s) => managedTypes.includes(s.service_type));
    const managedServices = this._enrichServices(managedRaw);

    const plansAll = this._getFromStorage('monitoring_plans').filter((p) => p.is_active);
    plansAll.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
    const monitoringPlansPreview = this._enrichMonitoringPlans(plansAll.slice(0, 3));

    return { managedServices, monitoringPlansPreview };
  }

  getMonitoringPlanFilterOptions() {
    const plans = this._getFromStorage('monitoring_plans').filter((p) => p.is_active);
    if (plans.length === 0) {
      return {
        supportsTwentyFourSevenFilter: false,
        slaResponseTimeMinMinutes: 0,
        slaResponseTimeMaxMinutes: 0,
        priceMinMonthly: 0,
        priceMaxMonthly: 0
      };
    }

    const slaTimes = plans.map((p) => p.sla_response_time_minutes || 0);
    const prices = plans.map((p) => p.monthly_price || 0);
    return {
      supportsTwentyFourSevenFilter: plans.some((p) => !!p.has_24_7_monitoring),
      slaResponseTimeMinMinutes: Math.min.apply(null, slaTimes),
      slaResponseTimeMaxMinutes: Math.max.apply(null, slaTimes),
      priceMinMonthly: Math.min.apply(null, prices),
      priceMaxMonthly: Math.max.apply(null, prices)
    };
  }

  searchMonitoringPlans(filters) {
    let plans = this._getFromStorage('monitoring_plans').filter((p) => p.is_active);
    const f = filters || {};

    if (f.requireTwentyFourSevenMonitoring) {
      plans = plans.filter((p) => !!p.has_24_7_monitoring);
    }
    if (typeof f.maxSlaResponseTimeMinutes === 'number') {
      plans = plans.filter(
        (p) =>
          typeof p.sla_response_time_minutes === 'number' &&
          p.sla_response_time_minutes <= f.maxSlaResponseTimeMinutes
      );
    }
    if (typeof f.maxMonthlyPrice === 'number') {
      plans = plans.filter(
        (p) => typeof p.monthly_price === 'number' && p.monthly_price <= f.maxMonthlyPrice
      );
    }

    return this._enrichMonitoringPlans(plans);
  }

  getMonitoringPlanDetails(planId) {
    const plans = this._getFromStorage('monitoring_plans');
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) return null;
    return this._enrichMonitoringPlans([plan])[0];
  }

  addMonitoringPlanToComparison(planId) {
    const plansAll = this._getFromStorage('monitoring_plans');
    const plan = plansAll.find((p) => p.id === planId) || null;
    if (!plan) {
      throw new Error('Monitoring plan not found');
    }

    let comparison = this._getOrCreateMonitoringComparison();

    if (!comparison.plan_ids.includes(planId)) {
      if (comparison.plan_ids.length < 3) {
        comparison.plan_ids.push(planId);
      }
      comparison.updated_at = new Date().toISOString();
      let comparisons = this._getFromStorage('monitoring_comparisons');
      const idx = comparisons.findIndex((c) => c.id === comparison.id);
      if (idx !== -1) {
        comparisons[idx] = comparison;
      } else {
        comparisons.push(comparison);
      }
      this._saveToStorage('monitoring_comparisons', comparisons);
    }

    const plans = this._enrichMonitoringPlans(
      plansAll.filter((p) => comparison.plan_ids.includes(p.id))
    );

    return {
      comparison,
      plans,
      message: 'Monitoring plan added to comparison'
    };
  }

  getMonitoringComparison() {
    const comparison = this._getOrCreateMonitoringComparison();
    const plansAll = this._getFromStorage('monitoring_plans');
    const plans = this._enrichMonitoringPlans(
      plansAll.filter((p) => comparison.plan_ids.includes(p.id))
    );
    return { comparison, plans };
  }

  setMonitoringPreferredPlan(planId) {
    let comparison = this._getOrCreateMonitoringComparison();
    if (!comparison.plan_ids.includes(planId)) {
      throw new Error('Preferred plan must be part of the comparison set');
    }
    comparison.preferred_plan_id = planId;
    comparison.updated_at = new Date().toISOString();

    let comparisons = this._getFromStorage('monitoring_comparisons');
    const idx = comparisons.findIndex((c) => c.id === comparison.id);
    if (idx !== -1) {
      comparisons[idx] = comparison;
    } else {
      comparisons.push(comparison);
    }
    this._saveToStorage('monitoring_comparisons', comparisons);

    const plansAll = this._getFromStorage('monitoring_plans');
    const plans = this._enrichMonitoringPlans(
      plansAll.filter((p) => comparison.plan_ids.includes(p.id))
    );
    return { comparison, plans };
  }

  getIncidentResponseRetainerConfiguratorData() {
    const coverageRegions = ['na', 'emea', 'apac', 'latam', 'global'];
    const onCallWindows = ['business_hours', 'extended_hours', 'twenty_four_seven'];
    const addons = this._getFromStorage('retainer_addons').filter((a) => a.is_active);
    const defaultBudgetHintMonthly = 5000;
    return { coverageRegions, onCallWindows, addons, defaultBudgetHintMonthly };
  }

  calculateIncidentResponseRetainerPrice(
    remote_support_hours,
    onsite_support_hours,
    coverage_region,
    on_call_window,
    selectedAddonIds,
    budget_cap
  ) {
    const monthly_price = this._calculateIncidentResponseRetainerBasePrice(
      remote_support_hours,
      onsite_support_hours,
      coverage_region,
      on_call_window,
      selectedAddonIds
    );
    const within_budget =
      typeof budget_cap === 'number' ? monthly_price <= budget_cap : true;
    return {
      monthly_price,
      currency: 'USD',
      within_budget
    };
  }

  saveIncidentResponseRetainerPlan(
    name,
    remote_support_hours,
    onsite_support_hours,
    coverage_region,
    on_call_window,
    selectedAddonIds,
    monthly_price,
    currency
  ) {
    const plans = this._getFromStorage('incident_response_retainer_plans');
    const plan = {
      id: this._generateId('ir_plan'),
      name,
      remote_support_hours,
      onsite_support_hours,
      coverage_region,
      on_call_window,
      selected_addon_ids: Array.isArray(selectedAddonIds) ? selectedAddonIds : [],
      monthly_price,
      currency: currency || 'USD',
      created_at: new Date().toISOString(),
      is_active: true
    };
    plans.push(plan);
    this._saveToStorage('incident_response_retainer_plans', plans);
    return plan;
  }

  // ---------- Consultations ----------

  getConsultationBookingPageOptions() {
    const consultationTypes = [
      { value: 'cyber_risk_assessment', label: 'Cyber Risk Assessment' },
      { value: 'incident_response_planning', label: 'Incident Response Planning' },
      { value: 'compliance_audit', label: 'Compliance & Audit' },
      { value: 'security_strategy', label: 'Security Strategy' },
      { value: 'training', label: 'Training & Awareness' },
      { value: 'other', label: 'Other' }
    ];

    const industries = [
      { value: 'financial_services', label: 'Financial Services' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'retail', label: 'Retail' },
      { value: 'technology', label: 'Technology' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'government', label: 'Government' },
      { value: 'education', label: 'Education' },
      { value: 'other', label: 'Other' }
    ];

    return { consultationTypes, industries };
  }

  searchConsultants(consultation_type, industry) {
    let consultants = this._getFromStorage('consultants').filter((c) => c.is_active);
    if (consultation_type) {
      consultants = consultants.filter((c) =>
        Array.isArray(c.consultation_types)
          ? c.consultation_types.includes(consultation_type)
          : false
      );
    }
    if (industry) {
      consultants = consultants.filter((c) => {
        if (c.primary_industry === industry) return true;
        if (Array.isArray(c.industries)) {
          return c.industries.includes(industry);
        }
        return false;
      });
    }

    // Prioritize consultants who actually have matching availability slots
    const slots = this._getFromStorage('consultant_availability_slots');
    consultants.sort((a, b) => {
      const countSlots = (consultant) =>
        slots.filter(
          (s) =>
            s.consultant_id === consultant.id &&
            (!consultation_type || s.consultation_type === consultation_type) &&
            (!industry || s.industry === industry)
        ).length;
      return countSlots(b) - countSlots(a);
    });

    return consultants;
  }

  getConsultantProfile(consultantId) {
    const consultants = this._getFromStorage('consultants');
    return consultants.find((c) => c.id === consultantId) || null;
  }

  getConsultantAvailability(consultantId, consultation_type, industry, start_date, end_date) {
    const slots = this._getFromStorage('consultant_availability_slots').filter(
      (s) => s.consultant_id === consultantId && !s.is_booked
    );

    const startDateObj = new Date(start_date + 'T00:00:00Z');
    const endDateObj = new Date(end_date + 'T23:59:59Z');

    const filtered = slots.filter((slot) => {
      if (consultation_type && slot.consultation_type !== consultation_type) {
        return false;
      }
      if (industry && slot.industry && slot.industry !== industry) {
        return false;
      }
      const startTime = new Date(slot.start_time);
      return startTime >= startDateObj && startTime <= endDateObj;
    });

    const consultant = this.getConsultantProfile(consultantId);
    return filtered.map((slot) => ({
      ...slot,
      consultant
    }));
  }

  createConsultationBooking(
    slotId,
    consultantId,
    consultation_type,
    industry,
    company_name,
    contact_name,
    contact_email,
    contact_phone,
    meeting_purpose
  ) {
    const slots = this._getFromStorage('consultant_availability_slots');
    const slotIndex = slots.findIndex((s) => s.id === slotId);
    if (slotIndex === -1) {
      throw new Error('Availability slot not found');
    }
    if (slots[slotIndex].is_booked) {
      throw new Error('Availability slot already booked');
    }

    const consultants = this._getFromStorage('consultants');
    const consultant = consultants.find((c) => c.id === consultantId);
    if (!consultant) {
      throw new Error('Consultant not found');
    }

    const bookings = this._getFromStorage('consultation_bookings');
    const booking = {
      id: this._generateId('consult_booking'),
      consultant_id: consultantId,
      slot_id: slotId,
      consultation_type,
      industry,
      company_name,
      contact_name,
      contact_email,
      contact_phone: contact_phone || '',
      meeting_purpose,
      status: 'scheduled',
      created_at: new Date().toISOString()
    };
    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    slots[slotIndex] = { ...slots[slotIndex], is_booked: true };
    this._saveToStorage('consultant_availability_slots', slots);

    return booking;
  }

  // ---------- Training & Cart ----------

  getTrainingCatalogFilters() {
    const courses = this._getFromStorage('training_courses').filter((c) => c.is_active);
    const topicSet = new Set();
    const formatSet = new Set();

    courses.forEach((course) => {
      if (Array.isArray(course.topic_tags)) {
        course.topic_tags.forEach((t) => topicSet.add(t));
      }
      if (course.delivery_format) {
        formatSet.add(course.delivery_format);
      }
    });

    const topicTags = Array.from(topicSet);
    const deliveryFormats = Array.from(formatSet);
    const supportsPhishingSimulationFilter = courses.length > 0;

    return { topicTags, deliveryFormats, supportsPhishingSimulationFilter };
  }

  searchTrainingCourses(query, filters) {
    let courses = this._getFromStorage('training_courses').filter((c) => c.is_active);
    const q = query ? String(query).toLowerCase() : '';

    if (q) {
      courses = courses.filter(
        (c) =>
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }

    const f = filters || {};
    if (f.includesPhishingSimulationOnly) {
      courses = courses.filter((c) => !!c.includes_phishing_simulation);
    }
    if (typeof f.minDurationHours === 'number') {
      courses = courses.filter(
        (c) => typeof c.duration_hours === 'number' && c.duration_hours >= f.minDurationHours
      );
    }
    if (typeof f.maxPricePerSeat === 'number') {
      courses = courses.filter(
        (c) =>
          typeof c.base_price_per_seat === 'number' &&
          c.base_price_per_seat <= f.maxPricePerSeat
      );
    }
    if (Array.isArray(f.topicTagsAnyOf) && f.topicTagsAnyOf.length > 0) {
      courses = courses.filter((c) => {
        if (!Array.isArray(c.topic_tags)) return false;
        return c.topic_tags.some((t) => f.topicTagsAnyOf.includes(t));
      });
    }

    courses.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return courses;
  }

  getTrainingCourseDetail(courseId) {
    const courses = this._getFromStorage('training_courses');
    const course = courses.find((c) => c.id === courseId) || null;
    if (!course) {
      return { course: null, pricingOptions: [] };
    }
    const allOptions = this._getFromStorage('course_pricing_options');
    const pricingOptions = allOptions
      .filter((o) => o.course_id === courseId && o.is_active)
      .map((o) => ({ ...o, course }));
    return { course, pricingOptions };
  }

  addCourseToCart(courseId, pricingOptionId, quantity) {
    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    const courses = this._getFromStorage('training_courses');
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      throw new Error('Training course not found');
    }

    const options = this._getFromStorage('course_pricing_options');
    let pricingOption = null;
    if (pricingOptionId) {
      pricingOption = options.find((o) => o.id === pricingOptionId) || null;
      if (!pricingOption) {
        throw new Error('Pricing option not found');
      }
      if (pricingOption.course_id !== courseId) {
        throw new Error('Pricing option does not belong to the specified course');
      }
    }

    const unit_price = pricingOption ? pricingOption.price_per_seat : course.base_price_per_seat;
    const currency = pricingOption
      ? pricingOption.currency || 'USD'
      : course.currency || 'USD';

    const cart = this._getOrCreateCart();
    let items = this._getFromStorage('cart_items');

    const existingIndex = items.findIndex(
      (item) =>
        item.cart_id === cart.id &&
        item.item_type === 'training_course' &&
        item.item_id === courseId &&
        ((item.pricing_option_id || null) === (pricingOptionId || null))
    );

    if (existingIndex !== -1) {
      const existing = items[existingIndex];
      const newQty = (existing.quantity || 0) + qty;
      items[existingIndex] = {
        ...existing,
        quantity: newQty,
        unit_price,
        currency,
        total_price: unit_price * newQty
      };
    } else {
      const item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'training_course',
        item_id: courseId,
        pricing_option_id: pricingOptionId || null,
        name: course.title,
        quantity: qty,
        unit_price,
        currency,
        total_price: unit_price * qty,
        added_at: new Date().toISOString()
      };
      items.push(item);
    }

    this._saveToStorage('cart_items', items);

    let carts = this._getFromStorage('cart');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = { ...cart, updated_at: new Date().toISOString() };
      this._saveToStorage('cart', carts);
    }

    // Enrich items for return
    items = this._getFromStorage('cart_items').filter((i) => i.cart_id === cart.id);
    const enrichedItems = this._enrichCartItems(cart, items);

    return {
      cart,
      items: enrichedItems,
      message: 'Course added to cart'
    };
  }

  _enrichCartItems(cart, items) {
    const courses = this._getFromStorage('training_courses');
    const options = this._getFromStorage('course_pricing_options');
    return items.map((item) => ({
      ...item,
      cart,
      item: courses.find((c) => c.id === item.item_id) || null,
      pricingOption: item.pricing_option_id
        ? options.find((o) => o.id === item.pricing_option_id) || null
        : null
    }));
  }

  getCart() {
    const cart = this._getOrCreateCart();
    const itemsRaw = this._getFromStorage('cart_items').filter((i) => i.cart_id === cart.id);
    const items = this._enrichCartItems(cart, itemsRaw);
    return { cart, items };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const qty = Number(quantity) || 0;
    let items = this._getFromStorage('cart_items');
    const index = items.findIndex((i) => i.id === cartItemId);
    if (index === -1) {
      throw new Error('Cart item not found');
    }

    const cartId = items[index].cart_id;

    if (qty <= 0) {
      items.splice(index, 1);
    } else {
      const item = items[index];
      items[index] = {
        ...item,
        quantity: qty,
        total_price: (item.unit_price || 0) * qty
      };
    }
    this._saveToStorage('cart_items', items);
    this._recalculateCartTotals(cartId);

    const cart = this._getOrCreateCart();
    const itemsForCart = this._getFromStorage('cart_items').filter((i) => i.cart_id === cart.id);
    const enrichedItems = this._enrichCartItems(cart, itemsForCart);

    return { cart, items: enrichedItems };
  }

  removeCartItem(cartItemId) {
    let items = this._getFromStorage('cart_items');
    const index = items.findIndex((i) => i.id === cartItemId);
    if (index === -1) {
      throw new Error('Cart item not found');
    }
    const cartId = items[index].cart_id;
    items.splice(index, 1);
    this._saveToStorage('cart_items', items);
    this._recalculateCartTotals(cartId);

    const cart = this._getOrCreateCart();
    const itemsForCart = this._getFromStorage('cart_items').filter((i) => i.cart_id === cart.id);
    const enrichedItems = this._enrichCartItems(cart, itemsForCart);
    return { cart, items: enrichedItems };
  }

  // ---------- Resources & Case Studies ----------

  getResourceFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies').filter((c) => c.is_published);
    const contentTypeSet = new Set();
    const industrySet = new Set();

    caseStudies.forEach((c) => {
      if (c.content_type) contentTypeSet.add(c.content_type);
      if (c.industry) industrySet.add(c.industry);
    });

    return {
      contentTypes: Array.from(contentTypeSet),
      industries: Array.from(industrySet)
    };
  }

  searchCaseStudies(filters) {
    let studies = this._getFromStorage('case_studies').filter((c) => c.is_published);
    const f = filters || {};

    if (f.contentTypeEquals) {
      studies = studies.filter((c) => c.content_type === f.contentTypeEquals);
    }
    if (f.industryEquals) {
      studies = studies.filter((c) => c.industry === f.industryEquals);
    }
    if (typeof f.minBreachReductionPercent === 'number') {
      studies = studies.filter(
        (c) =>
          typeof c.breach_reduction_percent === 'number' &&
          c.breach_reduction_percent >= f.minBreachReductionPercent
      );
    }
    if (typeof f.maxProjectDurationMonths === 'number') {
      studies = studies.filter(
        (c) =>
          typeof c.project_duration_months === 'number' &&
          c.project_duration_months <= f.maxProjectDurationMonths
      );
    }

    return studies;
  }

  getCaseStudyDetail(caseStudyId) {
    const studies = this._getFromStorage('case_studies');
    return studies.find((c) => c.id === caseStudyId) || null;
  }

  bookmarkCaseStudy(caseStudyId) {
    const studies = this._getFromStorage('case_studies');
    const exists = studies.some((c) => c.id === caseStudyId);
    if (!exists) {
      throw new Error('Case study not found');
    }

    let bookmarks = this._getFromStorage('bookmarked_case_studies');
    const already = bookmarks.find((b) => b.case_study_id === caseStudyId);
    if (already) {
      return already;
    }

    const bookmark = {
      id: this._generateId('bookmark_cs'),
      case_study_id: caseStudyId,
      bookmarked_at: new Date().toISOString()
    };
    bookmarks.push(bookmark);
    this._saveToStorage('bookmarked_case_studies', bookmarks);
    return bookmark;
  }

  getBookmarkedCaseStudies() {
    const bookmarks = this._getFromStorage('bookmarked_case_studies');
    const studies = this._getFromStorage('case_studies');
    const enrichedBookmarks = bookmarks.map((b) => ({
      ...b,
      caseStudy: studies.find((c) => c.id === b.case_study_id) || null
    }));
    const bookmarkedStudyIds = new Set(bookmarks.map((b) => b.case_study_id));
    const caseStudies = studies.filter((c) => bookmarkedStudyIds.has(c.id));
    return { bookmarks: enrichedBookmarks, caseStudies };
  }

  // ---------- Newsletters ----------

  getNewsletters() {
    return this._getFromStorage('newsletters').filter((n) => n.is_active);
  }

  getNewsletterDetail(newsletterSlug) {
    return this._resolveNewsletterBySlug(newsletterSlug);
  }

  getNewsletterTopics(newsletterId) {
    const newsletters = this._getFromStorage('newsletters');
    const newsletter = newsletters.find((n) => n.id === newsletterId) || null;

    const topicsRaw = this._getFromStorage('newsletter_topics').filter(
      (t) => t.is_active && (!t.newsletter_id || t.newsletter_id === newsletterId)
    );

    const topics = topicsRaw.map((t) => ({
      ...t,
      newsletter
    }));

    return topics;
  }

  subscribeNewsletter(
    newsletterId,
    email,
    name,
    company,
    frequency,
    topic_slugs,
    role_level
  ) {
    const newsletters = this._getFromStorage('newsletters');
    const newsletter = newsletters.find((n) => n.id === newsletterId);
    if (!newsletter) {
      throw new Error('Newsletter not found');
    }

    const subs = this._getFromStorage('newsletter_subscriptions');
    const subscription = {
      id: this._generateId('newsletter_sub'),
      newsletter_id: newsletterId,
      email,
      name: name || '',
      company: company || '',
      frequency,
      topic_slugs: Array.isArray(topic_slugs) ? topic_slugs : [],
      role_level: role_level || null,
      subscribed_at: new Date().toISOString(),
      is_active: true
    };
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);
    return subscription;
  }

  // ---------- Risk Calculator ----------

  getRiskCalculatorConfig() {
    const industries = [
      { value: 'financial_services', label: 'Financial Services' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'retail', label: 'Retail' },
      { value: 'technology', label: 'Technology' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'government', label: 'Government' },
      { value: 'education', label: 'Education' },
      { value: 'other', label: 'Other' }
    ];

    let questions = this._getFromStorage('risk_questions');
    questions.sort((a, b) => {
      const ao = typeof a.order === 'number' ? a.order : 0;
      const bo = typeof b.order === 'number' ? b.order : 0;
      return ao - bo;
    });

    return { industries, questions };
  }

  submitRiskAssessment(industry, employee_count, annual_revenue, answers) {
    const inputs = this._getFromStorage('risk_assessment_inputs');
    const input = {
      id: this._generateId('risk_input'),
      industry,
      employee_count,
      annual_revenue,
      answers: Array.isArray(answers) ? answers : [],
      created_at: new Date().toISOString()
    };
    inputs.push(input);
    this._saveToStorage('risk_assessment_inputs', inputs);

    const results = this._getFromStorage('risk_assessment_results');
    const { score, risk_level } = this._calculateRiskScore(input);
    const summary = 'Calculated cyber risk score based on provided inputs and controls.';
    const result = {
      id: this._generateId('risk_result'),
      input_id: input.id,
      score,
      risk_level,
      summary,
      created_at: new Date().toISOString()
    };
    results.push(result);
    this._saveToStorage('risk_assessment_results', results);

    return { input, result };
  }

  getRiskRecommendations(resultId, limit) {
    const results = this._getFromStorage('risk_assessment_results');
    const result = results.find((r) => r.id === resultId) || null;
    if (!result) {
      return { result: null, recommendations: [] };
    }

    let recsAll = this._getFromStorage('risk_recommendations').filter(
      (r) => r.result_id === resultId
    );

    const limitNum = typeof limit === 'number' && limit > 0 ? limit : 3;

    // If no recommendations exist yet for this result, generate some basic ones
    if (recsAll.length === 0) {
      const servicesAll = this._getFromStorage('services').filter((s) => s.is_active);
      const servicesForRecs = servicesAll.slice(0, limitNum);
      const allRecsStorage = this._getFromStorage('risk_recommendations');

      const newRecs = servicesForRecs.map((svc, index) => ({
        id: this._generateId('risk_rec'),
        result_id: resultId,
        service_id: svc.id,
        rank: index + 1,
        created_at: new Date().toISOString()
      }));

      recsAll = newRecs;
      this._saveToStorage('risk_recommendations', allRecsStorage.concat(newRecs));
    }

    recsAll.sort((a, b) => (a.rank || 0) - (b.rank || 0));

    const services = this._getFromStorage('services');
    const recsLimited = recsAll.slice(0, limitNum);

    const recommendations = recsLimited.map((rec) => ({
      recommendation: rec,
      service: services.find((s) => s.id === rec.service_id) || null
    }));

    return { result, recommendations };
  }

  getMonitoringComparisonView() {
    const comparison = this._getOrCreateMonitoringComparison();
    const plansAll = this._getFromStorage('monitoring_plans');
    const plansRaw = plansAll.filter((p) => comparison.plan_ids.includes(p.id));
    const plansEnriched = this._enrichMonitoringPlans(plansRaw);

    const plans = plansEnriched.map((plan) => ({
      plan,
      has_24_7_monitoring: !!plan.has_24_7_monitoring,
      sla_response_time_minutes: plan.sla_response_time_minutes,
      monthly_price: plan.monthly_price,
      included_endpoints: plan.included_endpoints
    }));

    return { comparison, plans };
  }

  // ---------- Static content: About & Contact ----------

  getAboutPageContent() {
    return this._getFromStorage('about_page_content', {
      mission: '',
      history: '',
      expertise_areas: [],
      leadership: []
    });
  }

  getContactPageContent() {
    return this._getFromStorage('contact_page_content', {
      phone_numbers: [],
      emails: [],
      office_locations: []
    });
  }

  submitContactInquiry(name, email, company, message) {
    const inquiries = this._getFromStorage('contact_inquiries');
    const inquiry = {
      id: this._generateId('contact'),
      name,
      email,
      company: company || '',
      message,
      created_at: new Date().toISOString()
    };
    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Your inquiry has been received.'
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
