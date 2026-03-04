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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const tables = [
      'consultation_types',
      'consultation_time_slots',
      'consultation_bookings',
      'service_offerings',
      'consulting_packages',
      'package_inquiries',
      'case_studies',
      'articles',
      'saved_items',
      'newsletter_subscriptions',
      'project_proposals',
      'pricing_estimates',
      'events',
      'webinar_registrations',
      'testimonials',
      'testimonial_comparisons',
      'custom_bundles',
      'custom_bundle_items'
    ];

    tables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Ephemeral/aux stores
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('testimonial_comparison_selection')) {
      localStorage.setItem('testimonial_comparison_selection', JSON.stringify([]));
    }
    if (!localStorage.getItem('consultation_booking_state')) {
      localStorage.setItem('consultation_booking_state', JSON.stringify({}));
    }
    if (!localStorage.getItem('current_custom_bundle_id')) {
      localStorage.setItem('current_custom_bundle_id', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  _findById(arr, id) {
    return arr.find((item) => item.id === id) || null;
  }

  // -------------------- Private helpers from spec --------------------

  _getOrCreateNewsletterSubscriptionRecord(email) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    let sub = subs.find((s) => s.email === email) || null;
    if (!sub) {
      sub = {
        id: this._generateId('nls'),
        email,
        frequency: 'weekly',
        topics: [],
        job_title: null,
        industry: null,
        created_at: this._nowIso(),
        is_confirmed: false
      };
      subs.push(sub);
      this._saveToStorage('newsletter_subscriptions', subs);
    }
    return sub;
  }

  _getOrCreateSavedItemsStore() {
    // Ensured by _initStorage, but keep for clarity
    return this._getFromStorage('saved_items');
  }

  _getOrCreateCurrentCustomBundle() {
    let currentId = localStorage.getItem('current_custom_bundle_id') || '';
    let bundles = this._getFromStorage('custom_bundles');
    let bundle = bundles.find((b) => b.id === currentId && b.status === 'draft') || null;

    if (!bundle) {
      bundle = {
        id: this._generateId('cb'),
        items: [],
        total_hours: 0,
        status: 'draft',
        contact_name: null,
        contact_email: null,
        company_name: null,
        created_at: this._nowIso()
      };
      bundles.push(bundle);
      this._saveToStorage('custom_bundles', bundles);
      localStorage.setItem('current_custom_bundle_id', bundle.id);
    }

    return bundle;
  }

  _calculatePricingEstimateInternal(serviceType, projectDurationMonths, numberOfConsultants, deliveryMode, supportLevel, addOns) {
    const duration = Number(projectDurationMonths) || 0;
    const consultants = Number(numberOfConsultants) || 0;
    const addOnList = Array.isArray(addOns) ? addOns : [];

    // Base rate per consultant per month. Tuned so 3 months * 2 consultants is < 30000 with minimal options.
    let baseRatePerConsultantPerMonth = 4000;

    // Slight adjustments by service type (business logic, not mocked data)
    switch (serviceType) {
      case 'digital_transformation':
        baseRatePerConsultantPerMonth = 5000;
        break;
      case 'operations_consulting':
      case 'process_optimization':
        baseRatePerConsultantPerMonth = 4200;
        break;
      case 'sales_enablement':
        baseRatePerConsultantPerMonth = 3800;
        break;
      case 'strategy':
        baseRatePerConsultantPerMonth = 4500;
        break;
      default:
        baseRatePerConsultantPerMonth = 4000;
    }

    // Delivery mode modifier
    let deliveryMultiplier = 1;
    if (deliveryMode === 'onsite') {
      deliveryMultiplier = 1.2;
    } else if (deliveryMode === 'hybrid') {
      deliveryMultiplier = 1.1;
    }

    const baseCost = baseRatePerConsultantPerMonth * duration * consultants * deliveryMultiplier;

    // Support cost as a percentage of base
    let supportPercent = 0;
    if (supportLevel === 'standard') {
      supportPercent = 0.1;
    } else if (supportLevel === 'premium') {
      supportPercent = 0.25;
    }
    const supportCost = baseCost * supportPercent;

    // Add-ons flat costs (example logic)
    let addOnsCost = 0;
    if (addOnList.includes('extra_workshops')) {
      addOnsCost += 1500 * duration; // per month
    }
    if (addOnList.includes('extended_support')) {
      addOnsCost += 1000 * duration;
    }

    const estimatedCost = Math.round(baseCost + supportCost + addOnsCost);

    return {
      estimatedCost,
      currency: 'usd',
      breakdown: {
        baseCost: Math.round(baseCost),
        addOnsCost: Math.round(addOnsCost),
        supportCost: Math.round(supportCost)
      }
    };
  }

  _getOrCreateQuoteSummaryStore() {
    // pricing_estimates is the quote summary store
    return this._getFromStorage('pricing_estimates');
  }

  _getCurrentTestimonialComparisonSelection() {
    const raw = localStorage.getItem('testimonial_comparison_selection');
    try {
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  _setCurrentTestimonialComparisonSelection(ids) {
    this._saveToStorage('testimonial_comparison_selection', Array.isArray(ids) ? ids : []);
  }

  _getOrCreateConsultationBookingState() {
    const raw = localStorage.getItem('consultation_booking_state');
    try {
      const obj = raw ? JSON.parse(raw) : {};
      if (obj && typeof obj === 'object') return obj;
      return {};
    } catch (e) {
      return {};
    }
  }

  _setConsultationBookingState(state) {
    this._saveToStorage('consultation_booking_state', state || {});
  }

  // Helper to build custom bundle state with FK resolution
  _buildCustomBundleState(bundle) {
    const allItems = this._getFromStorage('custom_bundle_items');
    const services = this._getFromStorage('service_offerings');
    const bundles = this._getFromStorage('custom_bundles');

    const itemsForBundle = allItems.filter((it) => it.custom_bundle_id === bundle.id);
    const totalHours = itemsForBundle.reduce((sum, it) => sum + (Number(it.hours) || 0), 0);

    bundle.total_hours = totalHours;

    // Persist updated bundle total_hours
    const updatedBundles = bundles.map((b) => (b.id === bundle.id ? bundle : b));
    this._saveToStorage('custom_bundles', updatedBundles);

    const resolvedItems = itemsForBundle.map((it) => ({
      ...it,
      custom_bundle: bundle,
      service_offering: services.find((s) => s.id === it.service_offering_id) || null
    }));

    const isValidTotalHours = totalHours >= 40 && totalHours <= 60;
    let validationMessage = '';
    if (!isValidTotalHours) {
      if (totalHours < 40) {
        validationMessage = 'Total hours must be at least 40.';
      } else if (totalHours > 60) {
        validationMessage = 'Total hours must be no more than 60.';
      }
    }

    return {
      bundle,
      bundleItems: resolvedItems,
      totalHours,
      isValidTotalHours,
      validationMessage
    };
  }

  // -------------------- Interface implementations --------------------
  // 1) getHomePageContent

  getHomePageContent() {
    const services = this._getFromStorage('service_offerings');
    const caseStudies = this._getFromStorage('case_studies');
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('events');
    const testimonials = this._getFromStorage('testimonials');

    const featuredServices = services.filter((s) => s.is_active).slice(0, 4);
    const featuredCaseStudies = caseStudies.filter((c) => c.is_featured).slice(0, 3);
    const featuredArticles = articles.filter((a) => a.is_featured).slice(0, 3);

    const now = new Date();
    const featuredEvents = events
      .filter((e) => {
        const start = new Date(e.start_datetime);
        return e.is_open_for_registration && start >= now;
      })
      .slice(0, 3);

    const featuredTestimonials = testimonials
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    return {
      heroTitle: 'Unlock Measurable Impact Across Your Business Operations',
      heroSubtitle: 'Strategy, operations, and digital consulting for growth-focused organizations.',
      keyBenefits: [
        'Translate strategy into execution with measurable outcomes.',
        'Streamline operations and improve margin without sacrificing experience.',
        'De-risk digital transformation with proven playbooks.'
      ],
      featuredServices,
      featuredCaseStudies,
      featuredArticles,
      featuredEvents,
      featuredTestimonials
    };
  }

  // 2) getNewsletterSignupConfig

  getNewsletterSignupConfig() {
    return {
      frequencies: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'biweekly', label: 'Every 2 Weeks' },
        { value: 'monthly', label: 'Monthly' }
      ],
      topics: [
        { value: 'leadership', label: 'Leadership' },
        { value: 'change_management', label: 'Change Management' },
        { value: 'remote_work', label: 'Remote Work' },
        { value: 'operations', label: 'Operations' },
        { value: 'customer_experience', label: 'Customer Experience' },
        { value: 'digital_transformation', label: 'Digital Transformation' },
        { value: 'strategy', label: 'Strategy' },
        { value: 'ai', label: 'AI' }
      ],
      industries: [
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'financial_services', label: 'Financial Services' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'tech_software', label: 'Tech / Software' },
        { value: 'professional_services', label: 'Professional Services' },
        { value: 'retail', label: 'Retail' },
        { value: 'public_sector', label: 'Public Sector' },
        { value: 'other', label: 'Other' }
      ],
      defaultFrequency: 'weekly'
    };
  }

  // 3) subscribeToNewsletter

  subscribeToNewsletter(email, frequency, topics, jobTitle, industry) {
    if (!email || !frequency) {
      return { success: false, subscription: null, message: 'email and frequency are required.' };
    }

    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly'];
    if (!validFrequencies.includes(frequency)) {
      return { success: false, subscription: null, message: 'Invalid frequency value.' };
    }

    const subs = this._getFromStorage('newsletter_subscriptions');
    let subscription = subs.find((s) => s.email === email) || null;

    if (!subscription) {
      subscription = {
        id: this._generateId('nls'),
        email,
        frequency,
        topics: Array.isArray(topics) ? topics : [],
        job_title: jobTitle || null,
        industry: industry || null,
        created_at: this._nowIso(),
        is_confirmed: false
      };
      subs.push(subscription);
    } else {
      subscription.frequency = frequency;
      subscription.topics = Array.isArray(topics) ? topics : [];
      subscription.job_title = jobTitle || null;
      subscription.industry = industry || null;
      // keep created_at and is_confirmed as-is
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return { success: true, subscription: this._clone(subscription), message: 'Subscription saved.' };
  }

  // 4) getServicesOverview

  getServicesOverview() {
    const services = this._getFromStorage('service_offerings');
    const featuredServices = services.filter((s) => s.is_active).slice(0, 6);

    const serviceCategories = [
      { code: 'strategy', name: 'Strategy', description: 'Corporate, business unit, and go-to-market strategy.' },
      { code: 'operations', name: 'Operations', description: 'Process optimization and operating model design.' },
      { code: 'sales', name: 'Sales', description: 'Sales enablement and revenue operations.' },
      { code: 'digital', name: 'Digital', description: 'Digital transformation and technology-enabled change.' },
      { code: 'leadership', name: 'Leadership', description: 'Leadership development and change management.' },
      { code: 'other', name: 'Other', description: 'Bespoke consulting support.' }
    ];

    const engagementModels = [
      {
        id: 'project_based',
        name: 'project_based',
        description: 'Fixed-scope projects with defined outcomes over a set timeframe.'
      },
      {
        id: 'hourly_blocks',
        name: 'hourly_blocks',
        description: 'Blocks of consulting hours you can flex across initiatives.'
      },
      {
        id: 'retainer',
        name: 'retainer',
        description: 'Ongoing advisory support with predictable monthly investment.'
      }
    ];

    return {
      serviceCategories,
      featuredServices,
      engagementModels
    };
  }

  // 5) getOperationsConsultingPageContent

  getOperationsConsultingPageContent() {
    const allServices = this._getFromStorage('service_offerings');
    const allPackages = this._getFromStorage('consulting_packages');

    // Operations-focused packages only
    const opsPackages = allPackages.filter((p) => p.package_type === 'operations_consulting' && p.is_active);

    const packagesWithFK = opsPackages.map((p) => ({
      ...p,
      service_offering: allServices.find((s) => s.id === p.service_offering_id) || null
    }));

    return {
      overviewTitle: 'Operations Consulting',
      overviewBody:
        'We help you design and optimize processes, teams, and technology to deliver consistent, scalable performance.',
      focusAreas: [
        'Process optimization and Lean operations',
        'Capacity planning and workforce management',
        'Operating model and governance design',
        'Performance measurement and continuous improvement'
      ],
      packages: packagesWithFK
    };
  }

  // 6) getOperationsPackagesForComparison

  getOperationsPackagesForComparison() {
    const allServices = this._getFromStorage('service_offerings');
    const allPackages = this._getFromStorage('consulting_packages');

    const opsPackages = allPackages.filter((p) => p.package_type === 'operations_consulting' && p.is_active);

    return opsPackages.map((p) => ({
      ...p,
      service_offering: allServices.find((s) => s.id === p.service_offering_id) || null
    }));
  }

  // 7) getConsultingPackageDetails

  getConsultingPackageDetails(consultingPackageId) {
    const allServices = this._getFromStorage('service_offerings');
    const allPackages = this._getFromStorage('consulting_packages');

    const pkg = allPackages.find((p) => p.id === consultingPackageId) || null;
    if (!pkg) {
      return { package: null, serviceOffering: null };
    }

    const serviceOffering = allServices.find((s) => s.id === pkg.service_offering_id) || null;
    const pkgWithFK = {
      ...pkg,
      service_offering: serviceOffering
    };

    return {
      package: pkgWithFK,
      serviceOffering
    };
  }

  // 8) submitPackageInquiry

  submitPackageInquiry(consultingPackageId, contactName, contactEmail, companyName, needsDescription) {
    if (!consultingPackageId || !contactName || !contactEmail) {
      return { success: false, packageInquiry: null, message: 'consultingPackageId, contactName, and contactEmail are required.' };
    }

    const packages = this._getFromStorage('consulting_packages');
    const pkg = packages.find((p) => p.id === consultingPackageId) || null;
    if (!pkg) {
      return { success: false, packageInquiry: null, message: 'Selected package does not exist.' };
    }

    const inquiries = this._getFromStorage('package_inquiries');
    const inquiry = {
      id: this._generateId('pqi'),
      consulting_package_id: consultingPackageId,
      contact_name: contactName,
      contact_email: contactEmail,
      company_name: companyName || null,
      needs_description: needsDescription || null,
      created_at: this._nowIso(),
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('package_inquiries', inquiries);

    const inquiryWithFK = {
      ...inquiry,
      consulting_package: pkg
    };

    return { success: true, packageInquiry: this._clone(inquiryWithFK), message: 'Package inquiry submitted.' };
  }

  // 9) getCaseStudyFilterOptions

  getCaseStudyFilterOptions() {
    return {
      industries: [
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'financial_services', label: 'Financial Services' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'tech_software', label: 'Tech / Software' },
        { value: 'professional_services', label: 'Professional Services' },
        { value: 'retail', label: 'Retail' },
        { value: 'public_sector', label: 'Public Sector' },
        { value: 'other', label: 'Other' }
      ],
      companySizeRanges: [
        { id: '1_49', label: '1–49 employees', minEmployees: 1, maxEmployees: 49 },
        { id: '50_99', label: '50–99 employees', minEmployees: 50, maxEmployees: 99 },
        { id: '100_500', label: '100–500 employees', minEmployees: 100, maxEmployees: 500 },
        { id: '100_199', label: '100–199 employees', minEmployees: 100, maxEmployees: 199 },
        { id: '200_499', label: '200–499 employees', minEmployees: 200, maxEmployees: 499 },
        { id: '500_999', label: '500–999 employees', minEmployees: 500, maxEmployees: 999 },
        { id: '1000_plus', label: '1000+ employees', minEmployees: 1000, maxEmployees: Number.MAX_SAFE_INTEGER }
      ]
    };
  }

  // 10) searchCaseStudies

  searchCaseStudies(industry, minEmployees, maxEmployees, sortOrder) {
    let results = this._getFromStorage('case_studies');

    if (industry) {
      results = results.filter((c) => c.industry === industry);
    }

    const minEmp = typeof minEmployees === 'number' ? minEmployees : null;
    const maxEmp = typeof maxEmployees === 'number' ? maxEmployees : null;

    if (minEmp != null || maxEmp != null) {
      results = results.filter((c) => {
        const min = typeof c.company_size_min_employees === 'number' ? c.company_size_min_employees : 0;
        const max = typeof c.company_size_max_employees === 'number' ? c.company_size_max_employees : Number.MAX_SAFE_INTEGER;
        if (minEmp != null && max < minEmp) return false;
        if (maxEmp != null && min > maxEmp) return false;
        return true;
      });
    }

    // sortOrder currently ignored; default is storage order
    return this._clone(results);
  }

  // 11) saveCaseStudyToSaved

  saveCaseStudyToSaved(caseStudyId) {
    if (!caseStudyId) {
      return { success: false, savedItem: null, message: 'caseStudyId is required.' };
    }

    const savedItems = this._getOrCreateSavedItemsStore();
    const caseStudies = this._getFromStorage('case_studies');
    const articles = this._getFromStorage('articles');

    let existing = savedItems.find((s) => s.content_type === 'case_study' && s.content_id === caseStudyId) || null;

    if (!existing) {
      const item = {
        id: this._generateId('sv'),
        content_type: 'case_study',
        content_id: caseStudyId,
        saved_at: this._nowIso()
      };
      savedItems.push(item);
      this._saveToStorage('saved_items', savedItems);
      existing = item;
    }

    const content = caseStudies.find((c) => c.id === existing.content_id) || null;
    const savedItemWithFK = {
      ...existing,
      content
    };

    return { success: true, savedItem: this._clone(savedItemWithFK), message: 'Case study saved.' };
  }

  // 12) getArticleFilterOptions

  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');
    const yearsSet = new Set();
    articles.forEach((a) => {
      if (a.published_at) {
        const d = new Date(a.published_at);
        if (!isNaN(d.getTime())) {
          yearsSet.add(d.getUTCFullYear());
        }
      }
    });

    const yearsArr = Array.from(yearsSet).sort((a, b) => b - a).map((y) => ({ value: y, label: String(y) }));

    return {
      topics: [
        { value: 'customer_experience', label: 'Customer Experience' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'change_management', label: 'Change Management' },
        { value: 'remote_work', label: 'Remote Work' },
        { value: 'operations', label: 'Operations' },
        { value: 'digital_transformation', label: 'Digital Transformation' },
        { value: 'strategy', label: 'Strategy' },
        { value: 'ai', label: 'AI' },
        { value: 'other', label: 'Other' }
      ],
      years: yearsArr
    };
  }

  // 13) searchArticles

  searchArticles(query, primaryTopic, year, sortOrder) {
    let results = this._getFromStorage('articles');

    if (query) {
      const q = String(query).toLowerCase();
      results = results.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        return title.includes(q) || summary.includes(q);
      });
    }

    if (primaryTopic) {
      results = results.filter((a) => a.primary_topic === primaryTopic);
    }

    if (typeof year === 'number') {
      results = results.filter((a) => {
        if (!a.published_at) return false;
        const d = new Date(a.published_at);
        if (isNaN(d.getTime())) return false;
        return d.getUTCFullYear() === year;
      });
    }

    const order = sortOrder || 'newest_first';
    if (order === 'newest_first') {
      results = results.slice().sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      });
    }

    return this._clone(results);
  }

  // 14) saveArticleToReadingList

  saveArticleToReadingList(articleId) {
    if (!articleId) {
      return { success: false, savedItem: null, message: 'articleId is required.' };
    }

    const savedItems = this._getOrCreateSavedItemsStore();
    const caseStudies = this._getFromStorage('case_studies');
    const articles = this._getFromStorage('articles');

    let existing = savedItems.find((s) => s.content_type === 'article' && s.content_id === articleId) || null;

    if (!existing) {
      const item = {
        id: this._generateId('sv'),
        content_type: 'article',
        content_id: articleId,
        saved_at: this._nowIso()
      };
      savedItems.push(item);
      this._saveToStorage('saved_items', savedItems);
      existing = item;
    }

    let content = null;
    if (existing.content_type === 'article') {
      content = articles.find((a) => a.id === existing.content_id) || null;
    } else if (existing.content_type === 'case_study') {
      content = caseStudies.find((c) => c.id === existing.content_id) || null;
    }

    const savedItemWithFK = {
      ...existing,
      content
    };

    return { success: true, savedItem: this._clone(savedItemWithFK), message: 'Article saved to reading list.' };
  }

  // 15) getSavedItemsOverview

  getSavedItemsOverview() {
    const savedItems = this._getFromStorage('saved_items');
    const caseStudies = this._getFromStorage('case_studies');
    const articles = this._getFromStorage('articles');

    const savedCaseStudies = savedItems
      .filter((s) => s.content_type === 'case_study')
      .map((s) => caseStudies.find((c) => c.id === s.content_id))
      .filter(Boolean);

    const readingListArticles = savedItems
      .filter((s) => s.content_type === 'article')
      .map((s) => articles.find((a) => a.id === s.content_id))
      .filter(Boolean);

    return {
      savedCaseStudies: this._clone(savedCaseStudies),
      readingListArticles: this._clone(readingListArticles)
    };
  }

  // 16) getEventsFilterOptions

  getEventsFilterOptions() {
    return {
      datePresets: [
        { code: 'this_month', label: 'This Month' },
        { code: 'next_month', label: 'Next Month' },
        { code: 'all_future', label: 'All Upcoming' }
      ],
      topics: [
        { value: 'ai', label: 'AI' },
        { value: 'digital_transformation', label: 'Digital Transformation' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'operations', label: 'Operations' },
        { value: 'strategy', label: 'Strategy' }
      ],
      eventTypes: [
        { value: 'webinar', label: 'Webinar' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'conference', label: 'Conference' },
        { value: 'meetup', label: 'Meetup' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  // 17) searchEvents

  searchEvents(query, datePreset, startDate, endDate, type) {
    let events = this._getFromStorage('events');

    if (type) {
      events = events.filter((e) => e.type === type);
    }

    const now = new Date();
    let rangeStart = null;
    let rangeEnd = null;

    if (datePreset === 'this_month' || datePreset === 'next_month') {
      const year = now.getUTCFullYear();
      const monthIndex = now.getUTCMonth();
      const targetMonthIndex = datePreset === 'this_month' ? monthIndex : monthIndex + 1;

      const start = new Date(Date.UTC(year, targetMonthIndex, 1));
      const end = new Date(Date.UTC(year, targetMonthIndex + 1, 0, 23, 59, 59));
      rangeStart = start;
      rangeEnd = end;
    } else if (datePreset === 'all_future') {
      rangeStart = now;
    } else if (startDate || endDate) {
      if (startDate) rangeStart = new Date(startDate + 'T00:00:00Z');
      if (endDate) rangeEnd = new Date(endDate + 'T23:59:59Z');
    }

    if (rangeStart || rangeEnd) {
      events = events.filter((e) => {
        const start = new Date(e.start_datetime);
        if (rangeStart && start < rangeStart) return false;
        if (rangeEnd && start > rangeEnd) return false;
        return true;
      });
    }

    if (query) {
      const q = String(query).toLowerCase();
      events = events.filter((e) => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const tags = Array.isArray(e.tags) ? e.tags.join(' ').toLowerCase() : '';
        return title.includes(q) || desc.includes(q) || tags.includes(q);
      });
    }

    return this._clone(events);
  }

  // 18) getEventDetails

  getEventDetails(eventId) {
    if (!eventId) return null;
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;
    return this._clone(event);
  }

  // 19) registerForWebinar

  registerForWebinar(eventId, attendeeName, attendeeEmail, companyName, consentGiven) {
    if (!eventId || !attendeeName || !attendeeEmail) {
      return { success: false, registration: null, message: 'eventId, attendeeName, and attendeeEmail are required.' };
    }
    if (!consentGiven) {
      return { success: false, registration: null, message: 'Consent must be given.' };
    }

    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;
    if (!event || event.type !== 'webinar' || !event.is_open_for_registration) {
      return { success: false, registration: null, message: 'Webinar is not available for registration.' };
    }

    const registrations = this._getFromStorage('webinar_registrations');
    const registration = {
      id: this._generateId('wr'),
      event_id: eventId,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      company_name: companyName || null,
      consent_given: !!consentGiven,
      registered_at: this._nowIso()
    };

    registrations.push(registration);
    this._saveToStorage('webinar_registrations', registrations);

    const registrationWithFK = {
      ...registration,
      event
    };

    return { success: true, registration: this._clone(registrationWithFK), message: 'Webinar registration completed.' };
  }

  // 20) getTestimonialsFilterOptions

  getTestimonialsFilterOptions() {
    return {
      industries: [
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'financial_services', label: 'Financial Services' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'tech_software', label: 'Tech / Software' },
        { value: 'professional_services', label: 'Professional Services' },
        { value: 'retail', label: 'Retail' },
        { value: 'public_sector', label: 'Public Sector' },
        { value: 'other', label: 'Other' }
      ],
      minRatingOptions: [
        { value: 1, label: '1+ stars' },
        { value: 2, label: '2+ stars' },
        { value: 3, label: '3+ stars' },
        { value: 4, label: '4+ stars' },
        { value: 5, label: '5 stars' }
      ]
    };
  }

  // 21) searchTestimonials

  searchTestimonials(industry, minRating) {
    let testimonials = this._getFromStorage('testimonials');

    if (industry) {
      testimonials = testimonials.filter((t) => t.industry === industry);
    }

    const min = typeof minRating === 'number' ? minRating : 0;
    if (min > 0) {
      testimonials = testimonials.filter((t) => (Number(t.rating) || 0) >= min);
    }

    return this._clone(testimonials);
  }

  // 22) createTestimonialComparison

  createTestimonialComparison(testimonialIds) {
    const ids = Array.isArray(testimonialIds) ? testimonialIds : [];
    const testimonials = this._getFromStorage('testimonials');

    const selectedTestimonials = testimonials.filter((t) => ids.includes(t.id));

    const comparisons = this._getFromStorage('testimonial_comparisons');
    const comparison = {
      id: this._generateId('tc'),
      testimonial_ids: ids,
      created_at: this._nowIso()
    };

    comparisons.push(comparison);
    this._saveToStorage('testimonial_comparisons', comparisons);
    this._setCurrentTestimonialComparisonSelection(ids);

    return {
      comparison: this._clone(comparison),
      testimonials: this._clone(selectedTestimonials)
    };
  }

  // 23) getPricingCalculatorConfig

  getPricingCalculatorConfig() {
    return {
      serviceTypes: [
        {
          value: 'process_optimization',
          label: 'Process Optimization',
          description: 'Streamline workflows and reduce operational waste.'
        },
        {
          value: 'digital_transformation',
          label: 'Digital Transformation',
          description: 'Modernize technology and processes end-to-end.'
        },
        {
          value: 'strategy',
          label: 'Strategy',
          description: 'Strategic planning and execution support.'
        },
        {
          value: 'operations_consulting',
          label: 'Operations Consulting',
          description: 'Broader operations consulting engagements.'
        },
        {
          value: 'sales_enablement',
          label: 'Sales Enablement',
          description: 'Improve sales productivity and revenue operations.'
        },
        {
          value: 'other',
          label: 'Other',
          description: 'Custom scope or not listed above.'
        }
      ],
      deliveryModes: [
        { value: 'remote', label: 'Remote' },
        { value: 'onsite', label: 'Onsite' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      supportLevels: [
        { value: 'none', label: 'No Ongoing Support' },
        { value: 'standard', label: 'Standard Support' },
        { value: 'premium', label: 'Premium Support' }
      ],
      addOns: [
        { code: 'extra_workshops', label: 'Additional Workshops', description: 'Extend the engagement with extra facilitated workshops.' },
        { code: 'extended_support', label: 'Extended Support', description: 'Post-project support and coaching.' }
      ],
      defaultCurrency: 'usd'
    };
  }

  // 24) calculatePricingEstimatePreview

  calculatePricingEstimatePreview(serviceType, projectDurationMonths, numberOfConsultants, deliveryMode, supportLevel, addOns) {
    const result = this._calculatePricingEstimateInternal(
      serviceType,
      projectDurationMonths,
      numberOfConsultants,
      deliveryMode,
      supportLevel,
      addOns
    );
    return result;
  }

  // 25) savePricingEstimate

  savePricingEstimate(serviceType, projectDurationMonths, numberOfConsultants, deliveryMode, supportLevel, addOns, notes) {
    if (!serviceType || !projectDurationMonths || !numberOfConsultants || !deliveryMode || !supportLevel) {
      return { success: false, estimate: null, message: 'Missing required fields for pricing estimate.' };
    }

    const preview = this._calculatePricingEstimateInternal(
      serviceType,
      projectDurationMonths,
      numberOfConsultants,
      deliveryMode,
      supportLevel,
      addOns
    );

    const services = this._getFromStorage('service_offerings');
    const serviceOffering = services.find((s) => s.code === serviceType) || null;

    const estimates = this._getOrCreateQuoteSummaryStore();

    const estimate = {
      id: this._generateId('pe'),
      service_type: serviceType,
      service_offering_id: serviceOffering ? serviceOffering.id : null,
      project_duration_months: Number(projectDurationMonths) || 0,
      number_of_consultants: Number(numberOfConsultants) || 0,
      delivery_mode: deliveryMode,
      add_ons: Array.isArray(addOns) ? addOns : [],
      support_level: supportLevel,
      estimated_cost: preview.estimatedCost,
      currency: preview.currency,
      created_at: this._nowIso(),
      notes: notes || null
    };

    estimates.push(estimate);
    this._saveToStorage('pricing_estimates', estimates);

    const estimateWithFK = {
      ...estimate,
      service_offering: serviceOffering
    };

    return { success: true, estimate: this._clone(estimateWithFK), message: 'Pricing estimate saved.' };
  }

  // 26) getQuoteSummary

  getQuoteSummary() {
    const estimates = this._getFromStorage('pricing_estimates');
    const services = this._getFromStorage('service_offerings');

    const resolved = estimates.map((e) => ({
      ...e,
      service_offering: e.service_offering_id
        ? services.find((s) => s.id === e.service_offering_id) || null
        : services.find((s) => s.code === e.service_type) || null
    }));

    return this._clone(resolved);
  }

  // 27) getConsultationTypes

  getConsultationTypes() {
    const types = this._getFromStorage('consultation_types');
    return this._clone(types);
  }

  // 28) getConsultationAvailability

  getConsultationAvailability(consultationTypeId, month, year) {
    if (!consultationTypeId || !month || !year) {
      return { month, year, days: [] };
    }

    const slots = this._getFromStorage('consultation_time_slots').filter(
      (s) => s.consultation_type_id === consultationTypeId
    );

    const monthIndex = month - 1; // JS Date month index
    const numDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const days = [];
    for (let day = 1; day <= numDays; day++) {
      const dateObj = new Date(Date.UTC(year, monthIndex, day));
      const weekday = dateObj.getUTCDay(); // 0-6, Sunday=0
      const isWeekday = weekday >= 1 && weekday <= 5;

      const yyyy = year.toString().padStart(4, '0');
      const mm = (month).toString().padStart(2, '0');
      const dd = day.toString().padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const availableSlots = slots.filter((s) => {
        const start = new Date(s.start_datetime);
        if (isNaN(start.getTime())) return false;
        const sy = start.getUTCFullYear();
        const sm = start.getUTCMonth();
        const sd = start.getUTCDate();
        const sameDate = sy === year && sm === monthIndex && sd === day;
        return sameDate && !s.is_booked;
      });

      days.push({
        date: dateStr,
        isWeekday,
        hasAvailableSlots: availableSlots.length > 0,
        totalAvailableSlots: availableSlots.length
      });
    }

    return { month, year, days };
  }

  // 29) getConsultationTimeSlotsForDate

  getConsultationTimeSlotsForDate(consultationTypeId, date, timezone) {
    if (!consultationTypeId || !date) return [];

    const slots = this._getFromStorage('consultation_time_slots');
    const types = this._getFromStorage('consultation_types');

    const dateParts = date.split('-');
    const year = parseInt(dateParts[0], 10);
    const monthIndex = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);

    const filtered = slots.filter((s) => {
      if (s.consultation_type_id !== consultationTypeId) return false;
      if (s.is_booked) return false;
      if (timezone && s.timezone && s.timezone !== timezone) return false;
      const start = new Date(s.start_datetime);
      if (isNaN(start.getTime())) return false;
      return (
        start.getUTCFullYear() === year &&
        start.getUTCMonth() === monthIndex &&
        start.getUTCDate() === day
      );
    });

    const type = types.find((t) => t.id === consultationTypeId) || null;

    const withFK = filtered.map((s) => ({
      ...s,
      consultation_type: type
    }));

    return this._clone(withFK);
  }

  // 30) createConsultationBooking

  createConsultationBooking(consultationTypeId, consultationTimeSlotId, clientName, clientEmail, businessDescription, industry) {
    if (!consultationTypeId || !consultationTimeSlotId || !clientName || !clientEmail || !industry) {
      return { success: false, booking: null, message: 'Missing required fields for consultation booking.' };
    }

    const types = this._getFromStorage('consultation_types');
    const slots = this._getFromStorage('consultation_time_slots');
    const bookings = this._getFromStorage('consultation_bookings');

    const type = types.find((t) => t.id === consultationTypeId) || null;
    if (!type) {
      return { success: false, booking: null, message: 'Consultation type not found.' };
    }

    const slot = slots.find((s) => s.id === consultationTimeSlotId) || null;
    if (!slot || slot.consultation_type_id !== consultationTypeId) {
      return { success: false, booking: null, message: 'Selected time slot is invalid.' };
    }
    if (slot.is_booked) {
      return { success: false, booking: null, message: 'Selected time slot is already booked.' };
    }

    const booking = {
      id: this._generateId('cbk'),
      consultation_type_id: consultationTypeId,
      consultation_time_slot_id: consultationTimeSlotId,
      client_name: clientName,
      client_email: clientEmail,
      business_description: businessDescription || null,
      industry,
      status: 'confirmed',
      created_at: this._nowIso()
    };

    bookings.push(booking);

    // Mark slot as booked
    const updatedSlots = slots.map((s) => (s.id === consultationTimeSlotId ? { ...s, is_booked: true } : s));

    this._saveToStorage('consultation_bookings', bookings);
    this._saveToStorage('consultation_time_slots', updatedSlots);

    const bookingWithFK = {
      ...booking,
      consultation_type: type,
      consultation_time_slot: updatedSlots.find((s) => s.id === consultationTimeSlotId) || slot
    };

    // Update ephemeral booking state
    const state = {
      last_booking_id: booking.id,
      last_consultation_type_id: consultationTypeId,
      last_time_slot_id: consultationTimeSlotId
    };
    this._setConsultationBookingState(state);

    return { success: true, booking: this._clone(bookingWithFK), message: 'Consultation booked.' };
  }

  // 31) getCustomBundleConfiguratorState

  getCustomBundleConfiguratorState() {
    const bundle = this._getOrCreateCurrentCustomBundle();
    const services = this._getFromStorage('service_offerings');
    const state = this._buildCustomBundleState(bundle);

    const availableServices = services.filter((s) => s.is_active !== false);

    return {
      availableServices: this._clone(availableServices),
      bundle: this._clone(state.bundle),
      bundleItems: this._clone(state.bundleItems),
      totalHours: state.totalHours,
      isValidTotalHours: state.isValidTotalHours,
      validationMessage: state.validationMessage
    };
  }

  // 32) addServiceToCustomBundle

  addServiceToCustomBundle(serviceOfferingId) {
    if (!serviceOfferingId) {
      return {
        bundle: null,
        bundleItems: [],
        totalHours: 0,
        isValidTotalHours: false,
        validationMessage: 'serviceOfferingId is required.'
      };
    }

    const bundle = this._getOrCreateCurrentCustomBundle();
    const items = this._getFromStorage('custom_bundle_items');

    const alreadyExists = items.some(
      (it) => it.custom_bundle_id === bundle.id && it.service_offering_id === serviceOfferingId
    );

    if (!alreadyExists) {
      const newItem = {
        id: this._generateId('cbi'),
        custom_bundle_id: bundle.id,
        service_offering_id: serviceOfferingId,
        hours: 0
      };
      items.push(newItem);
      this._saveToStorage('custom_bundle_items', items);

      // Update bundle.items list
      const bundles = this._getFromStorage('custom_bundles');
      const updatedBundles = bundles.map((b) => {
        if (b.id === bundle.id) {
          const itemIds = Array.isArray(b.items) ? b.items.slice() : [];
          itemIds.push(newItem.id);
          return { ...b, items: itemIds };
        }
        return b;
      });
      this._saveToStorage('custom_bundles', updatedBundles);
    }

    const freshBundleList = this._getFromStorage('custom_bundles');
    const freshBundle = freshBundleList.find((b) => b.id === bundle.id) || bundle;
    const state = this._buildCustomBundleState(freshBundle);

    return {
      bundle: this._clone(state.bundle),
      bundleItems: this._clone(state.bundleItems),
      totalHours: state.totalHours,
      isValidTotalHours: state.isValidTotalHours,
      validationMessage: state.validationMessage
    };
  }

  // 33) updateCustomBundleItemHours

  updateCustomBundleItemHours(bundleItemId, hours) {
    if (!bundleItemId) {
      return {
        bundle: null,
        bundleItems: [],
        totalHours: 0,
        isValidTotalHours: false,
        validationMessage: 'bundleItemId is required.'
      };
    }

    const hrs = Number(hours) || 0;
    const items = this._getFromStorage('custom_bundle_items');
    let bundleId = null;

    const updatedItems = items.map((it) => {
      if (it.id === bundleItemId) {
        bundleId = it.custom_bundle_id;
        return { ...it, hours: hrs };
      }
      return it;
    });

    this._saveToStorage('custom_bundle_items', updatedItems);

    if (!bundleId) {
      return {
        bundle: null,
        bundleItems: [],
        totalHours: 0,
        isValidTotalHours: false,
        validationMessage: 'Bundle item not found.'
      };
    }

    const bundles = this._getFromStorage('custom_bundles');
    const bundle = bundles.find((b) => b.id === bundleId) || null;
    if (!bundle) {
      return {
        bundle: null,
        bundleItems: [],
        totalHours: 0,
        isValidTotalHours: false,
        validationMessage: 'Bundle not found.'
      };
    }

    const state = this._buildCustomBundleState(bundle);

    return {
      bundle: this._clone(state.bundle),
      bundleItems: this._clone(state.bundleItems),
      totalHours: state.totalHours,
      isValidTotalHours: state.isValidTotalHours,
      validationMessage: state.validationMessage
    };
  }

  // 34) submitCustomBundleInquiry

  submitCustomBundleInquiry(contactName, contactEmail, companyName) {
    if (!contactName || !contactEmail) {
      return { success: false, bundle: null, message: 'contactName and contactEmail are required.' };
    }

    const bundle = this._getOrCreateCurrentCustomBundle();
    const state = this._buildCustomBundleState(bundle);

    if (!state.isValidTotalHours) {
      return {
        success: false,
        bundle: this._clone(state.bundle),
        message: state.validationMessage || 'Total hours must be between 40 and 60.'
      };
    }

    const bundles = this._getFromStorage('custom_bundles');
    const updatedBundles = bundles.map((b) => {
      if (b.id === bundle.id) {
        return {
          ...b,
          contact_name: contactName,
          contact_email: contactEmail,
          company_name: companyName || null,
          status: 'submitted'
        };
      }
      return b;
    });
    this._saveToStorage('custom_bundles', updatedBundles);

    // Clear current bundle pointer so next visit starts fresh
    localStorage.setItem('current_custom_bundle_id', '');

    const submittedBundle = updatedBundles.find((b) => b.id === bundle.id) || bundle;
    const finalState = this._buildCustomBundleState(submittedBundle);

    return {
      success: true,
      bundle: this._clone(finalState.bundle),
      message: 'Custom bundle inquiry submitted.'
    };
  }

  // 35) getContactPageConfig

  getContactPageConfig() {
    return {
      industries: [
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'financial_services', label: 'Financial Services' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'tech_software', label: 'Tech / Software' },
        { value: 'professional_services', label: 'Professional Services' },
        { value: 'retail', label: 'Retail' },
        { value: 'public_sector', label: 'Public Sector' },
        { value: 'other', label: 'Other' }
      ],
      companySizeRanges: [
        { value: '1_49', label: '1–49 employees' },
        { value: '50_99', label: '50–99 employees' },
        { value: '100_199', label: '100–199 employees' },
        { value: '200_499', label: '200–499 employees' },
        { value: '500_999', label: '500–999 employees' },
        { value: '1000_plus', label: '1000+ employees' }
      ],
      projectTypes: [
        { value: 'digital_transformation', label: 'Digital Transformation' },
        { value: 'process_optimization', label: 'Process Optimization' },
        { value: 'strategy', label: 'Strategy' },
        { value: 'operations_consulting', label: 'Operations Consulting' },
        { value: 'sales_enablement', label: 'Sales Enablement' },
        { value: 'other', label: 'Other' }
      ],
      budgetRanges: [
        { value: 'under_50000', label: 'Under $50,000', min: 0, max: 49999 },
        { value: '50000_to_100000', label: '$50,000–$100,000', min: 50000, max: 100000 },
        { value: '100000_to_250000', label: '$100,000–$250,000', min: 100000, max: 250000 },
        { value: 'over_250000', label: 'Over $250,000', min: 250000, max: Number.MAX_SAFE_INTEGER }
      ],
      defaultDurationMonths: 6
    };
  }

  // 36) submitProjectProposal

  submitProjectProposal(contactName, contactEmail, companyName, industry, companySizeRange, projectType, projectDurationMonths, budgetRange, description) {
    if (!contactName || !contactEmail || !industry || !companySizeRange || !projectType || !projectDurationMonths || !budgetRange) {
      return { success: false, proposal: null, message: 'Missing required fields for project proposal.' };
    }

    const proposals = this._getFromStorage('project_proposals');

    const proposal = {
      id: this._generateId('pp'),
      contact_name: contactName,
      contact_email: contactEmail,
      company_name: companyName || null,
      industry,
      company_size_range: companySizeRange,
      project_type: projectType,
      project_duration_months: Number(projectDurationMonths) || 0,
      budget_range: budgetRange,
      description: description || null,
      created_at: this._nowIso(),
      status: 'submitted'
    };

    proposals.push(proposal);
    this._saveToStorage('project_proposals', proposals);

    return { success: true, proposal: this._clone(proposal), message: 'Project proposal submitted.' };
  }

  // 37) getAboutPageContent

  getAboutPageContent() {
    return {
      headline: 'Independent consultants focused on practical, measurable change.',
      mission:
        'We help leadership teams translate strategy into execution by combining rigorous analysis, empathetic stakeholder engagement, and pragmatic delivery.',
      overview:
        'Our team brings experience across strategy, operations, digital transformation, and change management. We partner with clients from mid-sized growth companies to complex global organizations, helping them build capabilities that last beyond any single project.',
      leadershipTeam: [
        {
          name: 'Taylor Morgan',
          title: 'Managing Partner',
          bio: 'Taylor leads the firm and specializes in large-scale transformation and operating model design across industries.'
        },
        {
          name: 'Riley Chen',
          title: 'Partner, Operations & CX',
          bio: 'Riley focuses on process optimization and customer experience, with a background in manufacturing and services.'
        },
        {
          name: 'Jamie Patel',
          title: 'Partner, Digital & Data',
          bio: 'Jamie advises clients on digital strategy, AI adoption, and data-enabled decision making.'
        }
      ],
      industriesServedSummary:
        'We support organizations in manufacturing, financial services, healthcare, tech and software, professional services, retail, and the public sector.'
    };
  }

  // 38) getPrivacyPolicyContent

  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          title: 'Overview',
          body:
            'This Privacy Policy explains how we collect, use, and protect personal information submitted through our website, including forms for consultations, proposals, events, and newsletters.'
        },
        {
          title: 'Data We Collect',
          body:
            'We collect information such as your name, contact details, company information, and engagement preferences when you submit forms or interact with our content. We also collect limited analytics data to understand website usage.'
        },
        {
          title: 'How We Use Your Data',
          body:
            'We use your information to respond to inquiries, deliver services, send requested communications, and improve our offerings. We do not sell your personal data.'
        },
        {
          title: 'Your Choices',
          body:
            'You may update your communication preferences or request deletion of your data by contacting us using the details provided on the Contact page.'
        }
      ]
    };
  }

  // 39) getTermsAndConditionsContent

  getTermsAndConditionsContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          title: 'Use of Website',
          body:
            'By accessing this website, you agree to use it only for lawful purposes and in accordance with these Terms & Conditions.'
        },
        {
          title: 'No Professional Advice',
          body:
            'Content on this website is for general information only and does not constitute professional advice. Engagement terms are defined in separate written agreements.'
        },
        {
          title: 'Intellectual Property',
          body:
            'All content, trademarks, and logos on this site are owned by us or our licensors and may not be reused without permission.'
        },
        {
          title: 'Limitation of Liability',
          body:
            'To the fullest extent permitted by law, we are not liable for any indirect or consequential loss arising from the use of this website.'
        }
      ]
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
