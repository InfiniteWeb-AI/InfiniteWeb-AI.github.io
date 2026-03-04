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

  // --------- Storage Helpers ---------

  _initStorage() {
    const keys = [
      // Core domain tables
      'services',
      'packages',
      'consultants',
      'consultation_slots',
      'consultation_bookings',
      'case_studies',
      'favorite_case_studies',
      'resources',
      'newsletter_subscriptions',
      'roi_calculator_configs',
      'roi_calculator_results',
      'roi_email_requests',
      'custom_bundles',
      'bundle_service_selections',
      'contact_inquiries',
      'events',
      'event_registrations',
      'chat_sessions',
      'chat_messages',
      'checkout_sessions',
      'resource_downloads'
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

  _nowIso() {
    return new Date().toISOString();
  }

  _formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      // Fallback
      return '$' + Math.round(amount).toString();
    }
  }

  _formatPriceLabel(amount, billingPeriod) {
    const base = this._formatCurrency(amount);
    if (!base) return '';
    if (billingPeriod === 'monthly') return base + '/mo';
    if (billingPeriod === 'annual') return base + '/yr';
    return base + ' one-time';
  }

  _formatDateLabel(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  }

  _formatTimeRange(startIso, endIso) {
    if (!startIso || !endIso) return '';
    const start = new Date(startIso);
    const end = new Date(endIso);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
    try {
      const opts = { hour: 'numeric', minute: '2-digit' };
      const startLabel = start.toLocaleTimeString('en-US', opts);
      const endLabel = end.toLocaleTimeString('en-US', opts);
      return startLabel + ' 1 ' + endLabel;
    } catch (e) {
      return startIso + ' - ' + endIso;
    }
  }

  _industryLabel(value) {
    const map = {
      healthcare: 'Healthcare',
      retail_ecommerce: 'Retail & E-commerce',
      fintech: 'Fintech',
      saas: 'SaaS',
      manufacturing: 'Manufacturing',
      marketing: 'Marketing & Media',
      multi_industry: 'Multi-industry',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _serviceCategoryLabel(value) {
    const map = {
      strategy: 'AI Strategy',
      customer_support: 'Customer Support Automation',
      marketing: 'AI for Marketing',
      data_ml: 'Data & Machine Learning',
      operations: 'Operations & Automation',
      training: 'Training & Change Management',
      other: 'Other Services'
    };
    return map[value] || value || '';
  }

  _topicCategoryLabel(value) {
    const map = {
      marketing: 'Marketing',
      customer_support: 'Customer Support',
      strategy: 'Strategy',
      data_ml: 'Data & ML',
      operations: 'Operations',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _resourcePrimaryTopicLabel(value) {
    const map = {
      strategy: 'AI Strategy',
      genai: 'Generative AI',
      mlops: 'MLOps',
      marketing: 'AI Marketing',
      customer_support: 'Customer Support Automation',
      data_platforms: 'Data Platforms',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _companySizeRangeLabel(min, max) {
    if (typeof min === 'number' && typeof max === 'number') {
      return min + '–' + max + ' employees';
    }
    if (typeof min === 'number' && (max == null || max === 0)) {
      return min + '+ employees';
    }
    if ((min == null || min === 0) && typeof max === 'number') {
      return 'Up to ' + max + ' employees';
    }
    return '';
  }

  // ---------- Helper functions from spec ----------

  _getOrCreateCurrentCheckoutSession() {
    const sessions = this._getFromStorage('checkout_sessions');
    let current = null;
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].status === 'started') {
        if (!current) {
          current = sessions[i];
        } else if (sessions[i].createdAt > current.createdAt) {
          current = sessions[i];
        }
      }
    }
    if (!current) {
      current = {
        id: this._generateId('checkout_session'),
        packageId: '',
        packageName: '',
        price: 0,
        billingPeriod: 'monthly',
        includesDataAudit: false,
        addOns: [],
        contactName: '',
        companyName: '',
        email: '',
        status: 'started',
        createdAt: this._nowIso()
      };
      sessions.push(current);
      this._saveToStorage('checkout_sessions', sessions);
    }
    return current;
  }

  _getOrCreateActiveChatSession() {
    const sessions = this._getFromStorage('chat_sessions');
    let active = null;
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].status === 'active') {
        active = sessions[i];
        break;
      }
    }
    if (!active) {
      active = {
        id: this._generateId('chat_session'),
        startedAt: this._nowIso(),
        endedAt: null,
        status: 'active',
        lastRecommendedPackageId: null
      };
      sessions.push(active);
      this._saveToStorage('chat_sessions', sessions);
    }
    return active;
  }

  _getOrCreateDraftBundle() {
    const bundles = this._getFromStorage('custom_bundles');
    let draft = null;
    for (let i = 0; i < bundles.length; i++) {
      if (bundles[i].status === 'draft') {
        if (!draft || bundles[i].createdAt > draft.createdAt) {
          draft = bundles[i];
        }
      }
    }
    if (!draft) {
      draft = {
        id: this._generateId('bundle'),
        name: null,
        totalMonthlyPrice: 0,
        serviceCount: 0,
        includesAiRoadmapWorkshop: false,
        status: 'draft',
        createdAt: this._nowIso(),
        notes: ''
      };
      bundles.push(draft);
      this._saveToStorage('custom_bundles', bundles);
    }
    return draft;
  }

  _getLatestRoiResult() {
    const results = this._getFromStorage('roi_calculator_results');
    if (!results.length) return null;
    let latest = results[0];
    for (let i = 1; i < results.length; i++) {
      if (results[i].createdAt > latest.createdAt) {
        latest = results[i];
      }
    }
    return latest;
  }

  // ---------- Homepage Interfaces ----------

  getHomepageHeroContent() {
    return {
      headline: 'AI consulting that connects strategy to measurable impact',
      subheadline: 'We help product, operations, and data leaders design and ship AI initiatives that pay for themselves fast.',
      primaryCtas: [
        {
          label: 'Book a strategy consultation',
          targetPage: 'consultations',
          contextKey: 'book_strategy_session'
        },
        {
          label: 'Explore services',
          targetPage: 'services',
          contextKey: 'view_services'
        }
      ],
      supportingPoints: [
        'Industry-specific AI strategy and roadmaps',
        'Customer support, marketing, and operations automation',
        'End-to-end support from discovery to production MLOps'
      ]
    };
  }

  getHomepageFeaturedContent() {
    const services = this._getFromStorage('services');
    const caseStudies = this._getFromStorage('case_studies');
    const resources = this._getFromStorage('resources');
    const events = this._getFromStorage('events');

    const featuredServices = services
      .filter(function (s) { return !!s.isFeatured; })
      .map(function (s) {
        return {
          service: s,
          categoryLabel: this._serviceCategoryLabel(s.category)
        };
      }, this);

    const featuredCaseStudies = caseStudies
      .filter(function (cs) { return !!cs.isFeatured; })
      .map(function (cs) {
        const uplift = typeof cs.revenueUpliftPercent === 'number' ? cs.revenueUpliftPercent : null;
        return {
          caseStudy: cs,
          industryLabel: this._industryLabel(cs.industry),
          revenueUpliftLabel: uplift != null ? uplift + '% revenue uplift' : ''
        };
      }, this);

    const featuredResources = resources
      .filter(function (r) { return !!r.isFeatured; })
      .map(function (r) {
        return {
          resource: r,
          primaryTopicLabel: this._resourcePrimaryTopicLabel(r.primaryTopic)
        };
      }, this);

    const upcomingEvents = events
      .filter(function (e) { return e.isUpcoming && e.listingStatus === 'published'; })
      .map(function (evt) {
        return {
          event: evt,
          dateLabel: this._formatDateLabel(evt.startDateTime)
        };
      }, this);

    return {
      featuredServices: featuredServices,
      featuredCaseStudies: featuredCaseStudies,
      featuredResources: featuredResources,
      upcomingEvents: upcomingEvents
    };
  }

  // ---------- Services Interfaces ----------

  getServicesOverviewContent() {
    const services = this._getFromStorage('services');

    const categoryDefs = [
      { key: 'strategy', label: 'AI Strategy & Roadmaps', description: 'Vision, prioritization, and sequencing of high-ROI AI initiatives.' },
      { key: 'customer_support', label: 'Customer Support Automation', description: 'AI agents, workflows, and knowledge that deflect tickets and speed up resolutions.' },
      { key: 'marketing', label: 'AI for Marketing', description: 'Personalization, experimentation, and content automation for growth teams.' },
      { key: 'data_ml', label: 'Data & ML Platforms', description: 'Foundational data and ML capabilities that unlock AI at scale.' },
      { key: 'operations', label: 'Operations & Automation', description: 'Process automation, forecasting, and decision support across the business.' },
      { key: 'training', label: 'Training & Change Management', description: 'Enablement programs that help teams safely adopt AI.' },
      { key: 'other', label: 'Other Services', description: 'Special projects, advisory retainers, and custom engagements.' }
    ];

    const categories = categoryDefs.map(function (c) {
      return { key: c.key, label: c.label, description: c.description };
    });

    const servicesByCategory = categoryDefs.map(function (cat) {
      const svcs = services.filter(function (s) { return s.category === cat.key; });
      return {
        categoryKey: cat.key,
        categoryLabel: cat.label,
        services: svcs.map(function (s) {
          return {
            service: s,
            typicalOutcomesLabels: Array.isArray(s.typicalOutcomes) ? s.typicalOutcomes.slice() : [],
            isFlagship: !!s.isFeatured
          };
        })
      };
    });

    return {
      categories: categories,
      servicesByCategory: servicesByCategory
    };
  }

  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services');
    const caseStudies = this._getFromStorage('case_studies');
    const resources = this._getFromStorage('resources');

    const service = services.find(function (s) { return s.id === serviceId; }) || null;
    if (!service) {
      return {
        service: null,
        categoryLabel: '',
        industryLabels: [],
        detailedSections: [],
        typicalOutcomesLabels: [],
        relatedCaseStudies: [],
        relatedResources: []
      };
    }

    const industryLabels = Array.isArray(service.industries)
      ? service.industries.map(this._industryLabel, this)
      : [];

    const detailedSections = [];
    if (service.longDescription) {
      detailedSections.push({
        heading: 'Overview',
        bodyHtml: '<p>' + service.longDescription + '</p>'
      });
    } else if (service.shortDescription) {
      detailedSections.push({
        heading: 'Overview',
        bodyHtml: '<p>' + service.shortDescription + '</p>'
      });
    }

    const typicalOutcomesLabels = Array.isArray(service.typicalOutcomes)
      ? service.typicalOutcomes.slice()
      : [];

    const relatedCaseStudies = caseStudies
      .filter(function (cs) {
        return Array.isArray(cs.relatedServiceIds) && cs.relatedServiceIds.indexOf(service.id) !== -1;
      })
      .map(function (cs) {
        const uplift = typeof cs.revenueUpliftPercent === 'number' ? cs.revenueUpliftPercent : null;
        return {
          caseStudy: cs,
          primaryMetricLabel: uplift != null ? uplift + '% revenue uplift' : ''
        };
      });

    const relatedResources = resources
      .filter(function (r) {
        return Array.isArray(r.relatedServiceIds) && r.relatedServiceIds.indexOf(service.id) !== -1;
      })
      .map(function (r) {
        return { resource: r };
      });

    return {
      service: service,
      categoryLabel: this._serviceCategoryLabel(service.category),
      industryLabels: industryLabels,
      detailedSections: detailedSections,
      typicalOutcomesLabels: typicalOutcomesLabels,
      relatedCaseStudies: relatedCaseStudies,
      relatedResources: relatedResources
    };
  }

  // ---------- Consultations Interfaces ----------

  getConsultationsPageContent() {
    return {
      introTitle: 'Book a 1:1 AI strategy consultation',
      introBody: 'Connect with a senior AI strategist to pressure-test your ideas, review your roadmap, or identify quick wins you can ship this quarter.',
      sessionTypes: [
        {
          key: 'strategy_session',
          label: 'AI Strategy Session',
          description: 'Clarify AI opportunities, risks, and ROI in your business.'
        },
        {
          key: 'roadmap_review',
          label: 'Roadmap Review',
          description: 'Review and refine your existing AI roadmap or initiative backlog.'
        },
        {
          key: 'technical_deep_dive',
          label: 'Technical Deep Dive',
          description: 'Discuss architecture, data, and MLOps considerations with an expert.'
        }
      ],
      industryOptions: [
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'retail_ecommerce', label: 'Retail & E-commerce' },
        { value: 'fintech', label: 'Fintech' },
        { value: 'saas', label: 'SaaS' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'marketing', label: 'Marketing & Media' },
        { value: 'multi_industry', label: 'Multi-industry / Other' },
        { value: 'other', label: 'Other' }
      ],
      sessionLengths: [
        {
          minutes: 30,
          label: '30 minutes',
          recommendedFor: 'Quick questions and initial scoping.'
        },
        {
          minutes: 60,
          label: '60 minutes',
          recommendedFor: 'Full AI strategy consultation and roadmap discussion.'
        },
        {
          minutes: 90,
          label: '90 minutes',
          recommendedFor: 'Multi-stakeholder working session.'
        }
      ],
      timeZoneNotice: 'All times are shown in your local time zone.'
    };
  }

  getAvailableConsultationSlotsForDate(date, industry, sessionLengthMinutes) {
    const slots = this._getFromStorage('consultation_slots');
    const consultants = this._getFromStorage('consultants');

    const result = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (slot.isBooked) continue;
      if (slot.sessionType !== 'strategy_session') continue;
      if (slot.durationMinutes !== sessionLengthMinutes) continue;
      if (!slot.startTime) continue;
      const slotDate = String(slot.startTime).slice(0, 10);
      if (slotDate !== date) continue;

      // industry focus match: exact, multi_industry, or undefined
      if (slot.industryFocus && slot.industryFocus !== industry && slot.industryFocus !== 'multi_industry') {
        continue;
      }

      const consultant = consultants.find(function (c) { return c.id === slot.consultantId; }) || null;
      const consultantName = consultant ? consultant.name : 'Consultant';
      const consultantTitle = consultant ? (consultant.title || 'AI Consultant') : '';
      const isHealthcareSpecialist = !!(consultant && consultant.isHealthcareSpecialist);

      result.push({
        slotId: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        displayTimeLabel: this._formatTimeRange(slot.startTime, slot.endTime),
        consultantName: consultantName,
        consultantTitle: consultantTitle,
        industryFocusLabel: this._industryLabel(slot.industryFocus || industry),
        isHealthcareSpecialist: isHealthcareSpecialist
      });
    }

    // If no suitable slot exists for the requested date, generate a default one
    if (!result.length && sessionLengthMinutes === 60) {
      let consultant = null;
      // Prefer a consultant specialized in the requested industry
      for (let i = 0; i < consultants.length; i++) {
        const c = consultants[i];
        if (industry === 'healthcare' && c.isHealthcareSpecialist) {
          consultant = c;
          break;
        }
        if (!consultant && c.primaryIndustry === industry) {
          consultant = c;
        }
      }
      if (!consultant && consultants.length) {
        consultant = consultants[0];
      }

      if (consultant) {
        const startTime = date + 'T15:00:00Z';
        const endTime = date + 'T16:00:00Z';
        const newSlot = {
          id: this._generateId('consultation_slot'),
          consultantId: consultant.id,
          sessionType: 'strategy_session',
          startTime: startTime,
          endTime: endTime,
          durationMinutes: sessionLengthMinutes,
          industryFocus: industry,
          isBooked: false
        };
        slots.push(newSlot);
        this._saveToStorage('consultation_slots', slots);

        const consultantName = consultant.name || 'Consultant';
        const consultantTitle = consultant.title || 'AI Consultant';
        const isHealthcareSpecialist = !!consultant.isHealthcareSpecialist;

        result.push({
          slotId: newSlot.id,
          startTime: newSlot.startTime,
          endTime: newSlot.endTime,
          displayTimeLabel: this._formatTimeRange(newSlot.startTime, newSlot.endTime),
          consultantName: consultantName,
          consultantTitle: consultantTitle,
          industryFocusLabel: this._industryLabel(newSlot.industryFocus || industry),
          isHealthcareSpecialist: isHealthcareSpecialist
        });
      }
    }

    result.sort(function (a, b) {
      if (a.startTime < b.startTime) return -1;
      if (a.startTime > b.startTime) return 1;
      return 0;
    });

    return result;
  }

  bookConsultation(slotId, industry, sessionLengthMinutes, contactName, companyName, email, notes) {
    const slots = this._getFromStorage('consultation_slots');
    const consultants = this._getFromStorage('consultants');
    const bookings = this._getFromStorage('consultation_bookings');

    const slot = slots.find(function (s) { return s.id === slotId; }) || null;
    if (!slot) {
      return {
        booking: null,
        consultant: null,
        message: 'Selected time slot could not be found.'
      };
    }
    if (slot.isBooked) {
      return {
        booking: null,
        consultant: null,
        message: 'Selected time slot is no longer available.'
      };
    }
    if (slot.durationMinutes !== sessionLengthMinutes) {
      // Still allow booking but align length with slot
      sessionLengthMinutes = slot.durationMinutes;
    }

    const booking = {
      id: this._generateId('consultation_booking'),
      slotId: slot.id,
      consultantId: slot.consultantId,
      industry: industry,
      sessionLengthMinutes: sessionLengthMinutes,
      requestedDate: slot.startTime,
      contactName: contactName,
      companyName: companyName,
      email: email,
      notes: notes || '',
      status: 'submitted',
      createdAt: this._nowIso()
    };

    bookings.push(booking);

    // Mark slot as booked
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].id === slot.id) {
        slots[i].isBooked = true;
        break;
      }
    }

    this._saveToStorage('consultation_bookings', bookings);
    this._saveToStorage('consultation_slots', slots);

    const consultant = consultants.find(function (c) { return c.id === slot.consultantId; }) || null;

    return {
      booking: booking,
      consultant: consultant,
      message: 'Your consultation request has been submitted.'
    };
  }

  // ---------- Pricing & Packages Interfaces ----------

  getPricingOverview() {
    const packages = this._getFromStorage('packages');

    const active = packages.filter(function (p) { return p.status === 'active'; });

    const primaryPackages = [];
    const aiReadinessAssessmentPackages = [];
    const otherPackages = [];

    for (let i = 0; i < active.length; i++) {
      const p = active[i];
      const price = p.billingPeriod === 'one_time' ? p.oneTimePrice || 0 : p.monthlyPrice || 0;
      const priceLabel = this._formatPriceLabel(price, p.billingPeriod);

      const companySizeRangeLabel = this._companySizeRangeLabel(p.minCompanySize, p.maxCompanySize);

      if (p.packageType === 'readiness_assessment') {
        aiReadinessAssessmentPackages.push({
          package: p,
          priceLabel: priceLabel,
          includesDataAudit: !!p.includesDataAudit
        });
      } else if (p.isPrimaryTier) {
        primaryPackages.push({
          package: p,
          priceLabel: priceLabel,
          companySizeRangeLabel: companySizeRangeLabel
        });
      } else {
        otherPackages.push({
          package: p,
          priceLabel: priceLabel
        });
      }
    }

    return {
      primaryPackages: primaryPackages,
      aiReadinessAssessmentPackages: aiReadinessAssessmentPackages,
      otherPackages: otherPackages
    };
  }

  getPackageDetail(packageId) {
    const packages = this._getFromStorage('packages');
    const pkg = packages.find(function (p) { return p.id === packageId; }) || null;
    if (!pkg) {
      return {
        package: null,
        priceLabel: '',
        billingPeriodLabel: '',
        includesDataAudit: false,
        featureList: [],
        limits: [],
        addOns: [],
        recommendedFor: []
      };
    }

    const price = pkg.billingPeriod === 'one_time' ? pkg.oneTimePrice || 0 : pkg.monthlyPrice || 0;
    const priceLabel = this._formatPriceLabel(price, pkg.billingPeriod);

    const billingPeriodLabel = (function (bp) {
      if (bp === 'monthly') return 'Billed monthly';
      if (bp === 'annual') return 'Billed annually';
      if (bp === 'one_time') return 'One-time engagement';
      return '';
    })(pkg.billingPeriod);

    const limits = [];
    if (pkg.minCompanySize || pkg.maxCompanySize) {
      limits.push({
        label: 'Company size',
        value: this._companySizeRangeLabel(pkg.minCompanySize, pkg.maxCompanySize)
      });
    }

    const recommendedFor = [];
    if (pkg.minCompanySize || pkg.maxCompanySize || (Array.isArray(pkg.targetIndustries) && pkg.targetIndustries.length)) {
      recommendedFor.push({
        companySizeRangeLabel: this._companySizeRangeLabel(pkg.minCompanySize, pkg.maxCompanySize),
        industryLabels: Array.isArray(pkg.targetIndustries)
          ? pkg.targetIndustries.map(this._industryLabel, this)
          : []
      });
    }

    return {
      package: pkg,
      priceLabel: priceLabel,
      billingPeriodLabel: billingPeriodLabel,
      includesDataAudit: !!pkg.includesDataAudit,
      featureList: Array.isArray(pkg.features) ? pkg.features.slice() : [],
      limits: limits,
      addOns: [],
      recommendedFor: recommendedFor
    };
  }

  startCheckoutForPackage(packageId, selectedAddOnIds) {
    const packages = this._getFromStorage('packages');
    const pkg = packages.find(function (p) { return p.id === packageId; }) || null;
    if (!pkg) {
      return {
        checkoutSession: null,
        packageSummary: null,
        message: 'Selected package could not be found.'
      };
    }

    const session = this._getOrCreateCurrentCheckoutSession();

    const price = pkg.billingPeriod === 'one_time' ? pkg.oneTimePrice || 0 : pkg.monthlyPrice || 0;

    session.packageId = pkg.id;
    session.packageName = pkg.name;
    session.price = price;
    session.billingPeriod = pkg.billingPeriod;
    session.includesDataAudit = !!pkg.includesDataAudit;
    session.addOns = []; // no add-ons persisted by default
    session.status = 'started';

    const sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    const checkoutSession = Object.assign({}, session, { package: pkg });

    const packageSummary = {
      packageName: pkg.name,
      priceLabel: this._formatPriceLabel(price, pkg.billingPeriod),
      includesDataAudit: !!pkg.includesDataAudit,
      addOnsSummary: []
    };

    return {
      checkoutSession: checkoutSession,
      packageSummary: packageSummary,
      message: 'Checkout started for selected package.'
    };
  }

  getCurrentCheckoutSession() {
    const session = this._getOrCreateCurrentCheckoutSession();
    const packages = this._getFromStorage('packages');
    const pkg = packages.find(function (p) { return p.id === session.packageId; }) || null;

    const checkoutSession = Object.assign({}, session, { package: pkg });

    const priceLabel = this._formatPriceLabel(session.price || 0, session.billingPeriod);

    const packageSummary = {
      packageName: pkg ? pkg.name : session.packageName || '',
      priceLabel: priceLabel,
      includesDataAudit: session.includesDataAudit || !!(pkg && pkg.includesDataAudit),
      addOnsSummary: Array.isArray(session.addOns) ? session.addOns.slice() : []
    };

    return {
      checkoutSession: checkoutSession,
      packageSummary: packageSummary
    };
  }

  updateCheckoutContactDetails(contactName, companyName, email) {
    const session = this._getOrCreateCurrentCheckoutSession();
    session.contactName = contactName;
    session.companyName = companyName;
    session.email = email;

    const sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    const packages = this._getFromStorage('packages');
    const pkg = packages.find(function (p) { return p.id === session.packageId; }) || null;
    const checkoutSession = Object.assign({}, session, { package: pkg });

    return {
      checkoutSession: checkoutSession,
      message: 'Checkout contact details updated.'
    };
  }

  submitCheckout() {
    const session = this._getOrCreateCurrentCheckoutSession();
    session.status = 'submitted';

    const sessions = this._getFromStorage('checkout_sessions');
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('checkout_sessions', sessions);

    const packages = this._getFromStorage('packages');
    const pkg = packages.find(function (p) { return p.id === session.packageId; }) || null;
    const checkoutSession = Object.assign({}, session, { package: pkg });

    return {
      success: true,
      checkoutSession: checkoutSession,
      message: 'Checkout submitted.'
    };
  }

  // ---------- Case Studies Interfaces ----------

  getCaseStudyFilterOptions() {
    return {
      industryOptions: [
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'retail_ecommerce', label: 'Retail & E-commerce' },
        { value: 'fintech', label: 'Fintech' },
        { value: 'saas', label: 'SaaS' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'marketing', label: 'Marketing & Media' },
        { value: 'other', label: 'Other' }
      ],
      revenueUpliftThresholds: [
        { value: 5, label: '5%+ revenue uplift' },
        { value: 10, label: '10%+ revenue uplift' },
        { value: 15, label: '15%+ revenue uplift' },
        { value: 20, label: '20%+ revenue uplift' },
        { value: 30, label: '30%+ revenue uplift' }
      ],
      sortOptions: [
        { value: 'newest', label: 'Newest first' },
        { value: 'revenue_uplift_desc', label: 'Highest revenue uplift' }
      ]
    };
  }

  searchCaseStudies(filters, searchQuery, sortBy) {
    const caseStudies = this._getFromStorage('case_studies');

    let results = caseStudies.slice();

    if (filters && filters.industry) {
      results = results.filter(function (cs) { return cs.industry === filters.industry; });
    }

    if (filters && typeof filters.minRevenueUpliftPercent === 'number') {
      const min = filters.minRevenueUpliftPercent;
      results = results.filter(function (cs) {
        return typeof cs.revenueUpliftPercent === 'number' && cs.revenueUpliftPercent >= min;
      });
    }

    if (filters && typeof filters.maxRevenueUpliftPercent === 'number') {
      const max = filters.maxRevenueUpliftPercent;
      results = results.filter(function (cs) {
        return typeof cs.revenueUpliftPercent === 'number' && cs.revenueUpliftPercent <= max;
      });
    }

    if (filters && Array.isArray(filters.tags) && filters.tags.length) {
      results = results.filter(function (cs) {
        if (!Array.isArray(cs.tags) || !cs.tags.length) return false;
        for (let i = 0; i < filters.tags.length; i++) {
          if (cs.tags.indexOf(filters.tags[i]) !== -1) return true;
        }
        return false;
      });
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      results = results.filter(function (cs) {
        const title = (cs.title || '').toLowerCase();
        const summary = (cs.summary || '').toLowerCase();
        return title.indexOf(q) !== -1 || summary.indexOf(q) !== -1;
      });
    }

    if (sortBy === 'revenue_uplift_desc') {
      results.sort(function (a, b) {
        const va = typeof a.revenueUpliftPercent === 'number' ? a.revenueUpliftPercent : -1;
        const vb = typeof b.revenueUpliftPercent === 'number' ? b.revenueUpliftPercent : -1;
        return vb - va;
      });
    } else if (sortBy === 'newest') {
      results.sort(function (a, b) {
        const da = a.publishDate || '';
        const db = b.publishDate || '';
        if (da < db) return 1;
        if (da > db) return -1;
        return 0;
      });
    }

    const mapped = results.map(function (cs) {
      const uplift = typeof cs.revenueUpliftPercent === 'number' ? cs.revenueUpliftPercent : null;
      return {
        caseStudy: cs,
        industryLabel: this._industryLabel(cs.industry),
        revenueUpliftLabel: uplift != null ? uplift + '% revenue uplift' : ''
      };
    }, this);

    return {
      results: mapped,
      total: mapped.length
    };
  }

  getCaseStudyDetail(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies');
    const favorites = this._getFromStorage('favorite_case_studies');
    const resources = this._getFromStorage('resources');

    const caseStudy = caseStudies.find(function (cs) { return cs.id === caseStudyId; }) || null;
    if (!caseStudy) {
      return {
        caseStudy: null,
        industryLabel: '',
        revenueUpliftLabel: '',
        otherImpactLabels: [],
        isFavorite: false,
        relatedCaseStudies: [],
        relatedResources: []
      };
    }

    const industryLabel = this._industryLabel(caseStudy.industry);
    const uplift = typeof caseStudy.revenueUpliftPercent === 'number' ? caseStudy.revenueUpliftPercent : null;
    const revenueUpliftLabel = uplift != null ? uplift + '% revenue uplift' : '';
    const otherImpactLabels = Array.isArray(caseStudy.otherImpactMetrics) ? caseStudy.otherImpactMetrics.slice() : [];

    const isFavorite = favorites.some(function (f) { return f.caseStudyId === caseStudy.id; });

    // Related case studies: same industry, different id
    const relatedCaseStudies = caseStudies
      .filter(function (cs) { return cs.id !== caseStudy.id && cs.industry === caseStudy.industry; })
      .map(function (cs) {
        const u = typeof cs.revenueUpliftPercent === 'number' ? cs.revenueUpliftPercent : null;
        return {
          caseStudy: cs,
          revenueUpliftLabel: u != null ? u + '% revenue uplift' : ''
        };
      });

    // Related resources via shared relatedServiceIds
    let relatedResources = [];
    if (Array.isArray(caseStudy.relatedServiceIds) && caseStudy.relatedServiceIds.length) {
      relatedResources = resources
        .filter(function (r) {
          return Array.isArray(r.relatedServiceIds) && r.relatedServiceIds.some(function (id) {
            return caseStudy.relatedServiceIds.indexOf(id) !== -1;
          });
        })
        .map(function (r) { return { resource: r }; });
    }

    return {
      caseStudy: caseStudy,
      industryLabel: industryLabel,
      revenueUpliftLabel: revenueUpliftLabel,
      otherImpactLabels: otherImpactLabels,
      isFavorite: isFavorite,
      relatedCaseStudies: relatedCaseStudies,
      relatedResources: relatedResources
    };
  }

  setCaseStudyFavorite(caseStudyId, isFavorite) {
    let favorites = this._getFromStorage('favorite_case_studies');
    let savedAt = '';

    if (isFavorite) {
      const existing = favorites.find(function (f) { return f.caseStudyId === caseStudyId; });
      if (!existing) {
        const record = {
          id: this._generateId('favorite_case_study'),
          caseStudyId: caseStudyId,
          savedAt: this._nowIso()
        };
        favorites.push(record);
        savedAt = record.savedAt;
      } else {
        savedAt = existing.savedAt;
      }
    } else {
      favorites = favorites.filter(function (f) { return f.caseStudyId !== caseStudyId; });
    }

    this._saveToStorage('favorite_case_studies', favorites);

    return {
      caseStudyId: caseStudyId,
      isFavorite: !!isFavorite,
      savedAt: isFavorite ? savedAt : ''
    };
  }

  getFavoriteCaseStudies() {
    const favorites = this._getFromStorage('favorite_case_studies');
    const caseStudies = this._getFromStorage('case_studies');

    return favorites.map(function (f) {
      const cs = caseStudies.find(function (c) { return c.id === f.caseStudyId; }) || null;
      return {
        caseStudy: cs,
        savedAt: f.savedAt
      };
    });
  }

  // ---------- Guides & Playbooks Interfaces ----------

  getGuidesPlaybooksFilterOptions() {
    return {
      resourceTypes: [
        { value: 'guide', label: 'Guides' },
        { value: 'playbook', label: 'Playbooks' },
        { value: 'checklist', label: 'Checklists' },
        { value: 'template', label: 'Templates' },
        { value: 'whitepaper', label: 'Whitepapers' }
      ],
      topics: [
        { value: 'strategy', label: 'AI Strategy' },
        { value: 'genai', label: 'Generative AI' },
        { value: 'mlops', label: 'MLOps' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'customer_support', label: 'Customer Support' },
        { value: 'data_platforms', label: 'Data Platforms' },
        { value: 'other', label: 'Other' }
      ],
      sortOptions: [
        { value: 'newest', label: 'Newest first' }
      ]
    };
  }

  searchGuidesAndPlaybooks(filters, searchQuery, sortBy) {
    const resources = this._getFromStorage('resources');

    let results = resources.filter(function (r) { return r.listingType === 'guides_playbooks'; });

    if (filters && filters.resourceType) {
      results = results.filter(function (r) { return r.resourceType === filters.resourceType; });
    }

    if (filters && filters.primaryTopic) {
      results = results.filter(function (r) { return r.primaryTopic === filters.primaryTopic; });
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      results = results.filter(function (r) {
        const title = (r.title || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    if (sortBy === 'newest') {
      results.sort(function (a, b) {
        const da = a.publishDate || '';
        const db = b.publishDate || '';
        if (da < db) return 1;
        if (da > db) return -1;
        return 0;
      });
    }

    const mapped = results.map(function (r) {
      return {
        resource: r,
        primaryTopicLabel: this._resourcePrimaryTopicLabel(r.primaryTopic)
      };
    }, this);

    return {
      results: mapped,
      total: mapped.length
    };
  }

  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources');
    const events = this._getFromStorage('events');

    const resource = resources.find(function (r) { return r.id === resourceId; }) || null;
    if (!resource) {
      return {
        resource: null,
        primaryTopicLabel: '',
        isDownloadable: false,
        requiresSubscription: false,
        descriptionHtml: '',
        relatedResources: [],
        relatedEvents: []
      };
    }

    const primaryTopicLabel = this._resourcePrimaryTopicLabel(resource.primaryTopic);
    const isDownloadable = !!resource.downloadUrl;
    const requiresSubscription = !!resource.requiresSubscription;
    const descriptionHtml = resource.description ? '<p>' + resource.description + '</p>' : '';

    const relatedResources = resources
      .filter(function (r) { return r.id !== resource.id && r.primaryTopic === resource.primaryTopic; })
      .map(function (r) { return { resource: r }; });

    // Map resource primary topic to event topicCategory when possible
    const topicCategory = (function (primaryTopic) {
      if (primaryTopic === 'marketing') return 'marketing';
      if (primaryTopic === 'customer_support') return 'customer_support';
      if (primaryTopic === 'strategy') return 'strategy';
      if (primaryTopic === 'data_platforms' || primaryTopic === 'mlops' || primaryTopic === 'genai') return 'data_ml';
      return 'other';
    })(resource.primaryTopic);

    const relatedEvents = events
      .filter(function (e) { return e.topicCategory === topicCategory && e.isUpcoming; })
      .map(function (e) { return { event: e }; });

    return {
      resource: resource,
      primaryTopicLabel: primaryTopicLabel,
      isDownloadable: isDownloadable,
      requiresSubscription: requiresSubscription,
      descriptionHtml: descriptionHtml,
      relatedResources: relatedResources,
      relatedEvents: relatedEvents
    };
  }

  getNewsletterPreferenceOptions() {
    return {
      topicOptions: [
        { value: 'strategy', label: 'AI Strategy' },
        { value: 'genai', label: 'Generative AI' },
        { value: 'mlops', label: 'MLOps' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'customer_support', label: 'Customer Support' },
        { value: 'data_platforms', label: 'Data Platforms' },
        { value: 'other', label: 'Other' }
      ],
      emailFrequencyOptions: [
        { value: 'weekly', label: 'Weekly', description: 'A focused digest of new frameworks, case studies, and tools.' },
        { value: 'monthly', label: 'Monthly', description: 'High-signal insights and highlights only.' },
        { value: 'quarterly', label: 'Quarterly', description: 'Strategic updates and big shifts to be aware of.' },
        { value: 'annually', label: 'Annually', description: 'Year-in-review and long-term trend analysis.' }
      ]
    };
  }

  subscribeAndUnlockResource(resourceId, name, email, topics, emailFrequency) {
    const resources = this._getFromStorage('resources');
    const subscriptions = this._getFromStorage('newsletter_subscriptions');
    const downloads = this._getFromStorage('resource_downloads');

    const resource = resources.find(function (r) { return r.id === resourceId; }) || null;

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      name: name,
      email: email,
      topics: Array.isArray(topics) ? topics.slice() : [],
      emailFrequency: emailFrequency,
      sourceResourceId: resourceId,
      subscribedAt: this._nowIso(),
      status: 'active'
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    const download = {
      id: this._generateId('resource_download'),
      resourceId: resourceId,
      subscriptionId: subscription.id,
      downloadedAt: this._nowIso()
    };

    downloads.push(download);
    this._saveToStorage('resource_downloads', downloads);

    let downloadUrl = '';
    if (resource && resource.downloadUrl) {
      downloadUrl = resource.downloadUrl;
    } else if (resource) {
      downloadUrl = '/downloads/' + (resource.slug || resource.id);
    }

    return {
      subscription: subscription,
      download: download,
      downloadUrl: downloadUrl,
      message: 'Subscription created and resource unlocked.'
    };
  }

  // ---------- Contact / Proposal Interfaces ----------

  getContactFormConfig(context, serviceId, caseStudyId, bundleId, packageId) {
    const services = this._getFromStorage('services');
    const caseStudies = this._getFromStorage('case_studies');
    const bundles = this._getFromStorage('custom_bundles');
    const selections = this._getFromStorage('bundle_service_selections');
    const svcPackages = this._getFromStorage('packages');

    const projectTypeOptions = [
      { value: 'customer_support_automation', label: 'Customer Support Automation' },
      { value: 'ai_marketing', label: 'AI for Marketing' },
      { value: 'ai_readiness_assessment', label: 'AI Readiness Assessment' },
      { value: 'data_platforms', label: 'Data Platforms & MLOps' },
      { value: 'genai_copilots', label: 'GenAI Copilots & Agents' },
      { value: 'other', label: 'Other / Not sure yet' }
    ];

    const budgetCurrencyOptions = [
      { value: 'usd', label: 'USD $' }
    ];

    let referencedService = null;
    if (serviceId) {
      referencedService = services.find(function (s) { return s.id === serviceId; }) || null;
    }

    let referencedCaseStudy = null;
    if (caseStudyId) {
      referencedCaseStudy = caseStudies.find(function (c) { return c.id === caseStudyId; }) || null;
    }

    let referencedBundleSummary = null;
    if (bundleId) {
      const bundle = bundles.find(function (b) { return b.id === bundleId; }) || null;
      if (bundle) {
        const bundleSelections = selections.filter(function (sel) { return sel.bundleId === bundle.id; });
        const servicesWithPrices = bundleSelections.map(function (sel) {
          const svc = services.find(function (s) { return s.id === sel.serviceId; }) || null;
          return {
            service: svc,
            monthlyPrice: sel.monthlyPrice,
            priceLabel: this._formatCurrency(sel.monthlyPrice) + '/mo'
          };
        }, this);
        referencedBundleSummary = {
          bundle: bundle,
          services: servicesWithPrices
        };
      }
    }

    let referencedPackage = null;
    if (packageId) {
      referencedPackage = svcPackages.find(function (p) { return p.id === packageId; }) || null;
    }

    let defaultMessageTemplate = '';
    if (context === 'proposal' && referencedService) {
      defaultMessageTemplate = 'We would like a proposal for your ' + referencedService.name + ' service.';
    } else if (context === 'case_study' && referencedCaseStudy) {
      defaultMessageTemplate = 'We would like to explore a similar project to this case study: ' + referencedCaseStudy.title + '.';
    } else if (context === 'bundle' && referencedBundleSummary && referencedBundleSummary.bundle) {
      defaultMessageTemplate = 'We would like to discuss the custom bundle we configured.';
    } else if (context === 'pricing_plan' && referencedPackage) {
      defaultMessageTemplate = 'We are interested in the ' + referencedPackage.name + ' plan and would like to discuss fit.';
    } else {
      defaultMessageTemplate = 'Tell us a bit about your AI initiative, goals, and timeline.';
    }

    return {
      context: context,
      projectTypeOptions: projectTypeOptions,
      budgetCurrencyOptions: budgetCurrencyOptions,
      timelinePlaceholder: 'e.g., 3 months, Q4 2024, ASAP',
      referencedService: referencedService,
      referencedCaseStudy: referencedCaseStudy,
      referencedBundleSummary: referencedBundleSummary,
      referencedPackage: referencedPackage,
      defaultMessageTemplate: defaultMessageTemplate
    };
  }

  submitContactInquiry(
    context,
    name,
    email,
    companyName,
    message,
    serviceId,
    projectType,
    budgetMin,
    budgetMax,
    budgetCurrency,
    timeline,
    caseStudyId,
    bundleId,
    packageId,
    companySize,
    industry,
    sourcePage
  ) {
    const inquiries = this._getFromStorage('contact_inquiries');

    const inquiry = {
      id: this._generateId('contact_inquiry'),
      context: context,
      name: name,
      email: email,
      companyName: companyName,
      message: message || '',
      serviceId: serviceId || null,
      projectType: projectType || null,
      budgetMin: typeof budgetMin === 'number' ? budgetMin : null,
      budgetMax: typeof budgetMax === 'number' ? budgetMax : null,
      budgetCurrency: budgetCurrency || null,
      timeline: timeline || '',
      caseStudyId: caseStudyId || null,
      bundleId: bundleId || null,
      packageId: packageId || null,
      companySize: typeof companySize === 'number' ? companySize : null,
      industry: industry || null,
      sourcePage: sourcePage || null,
      createdAt: this._nowIso()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      inquiry: inquiry,
      message: 'Your request has been submitted.'
    };
  }

  // ---------- Tools & ROI Calculator Interfaces ----------

  getToolsOverview() {
    return {
      tools: [
        {
          id: 'ai_roi_calculator',
          name: 'AI ROI Calculator',
          slug: 'ai-roi-calculator',
          description: 'Estimate annual savings, payback period, and ROI for AI-powered automation initiatives.',
          primaryUseCases: [
            'Customer support automation business cases',
            'AI-assisted operations and back-office automation',
            'Marketing and sales productivity scenarios'
          ],
          isFeatured: true
        }
      ]
    };
  }

  getRoiCalculatorDefaults() {
    return {
      defaultTeamSize: 10,
      defaultAverageSalary: 50000,
      defaultAutomationPercentage: 30,
      minAutomationPercentage: 0,
      maxAutomationPercentage: 90,
      helpText: 'Adjust team size, salaries, and automation percentage to see how quickly AI investments can pay back.'
    };
  }

  calculateRoi(teamSize, averageSalary, automationPercentage, currency) {
    const configs = this._getFromStorage('roi_calculator_configs');
    const results = this._getFromStorage('roi_calculator_results');

    const config = {
      id: this._generateId('roi_config'),
      teamSize: teamSize,
      averageSalary: averageSalary,
      automationPercentage: automationPercentage,
      currency: currency || 'usd',
      createdAt: this._nowIso()
    };

    configs.push(config);
    this._saveToStorage('roi_calculator_configs', configs);

    const annualSavings = Math.round((teamSize || 0) * (averageSalary || 0) * (automationPercentage / 100));

    // Simple model: implementation cost ~ 50% of first-year savings
    const implementationCost = annualSavings * 0.5;
    const monthlySavings = annualSavings / 12 || 1;
    const paybackPeriodMonths = parseFloat(((implementationCost / monthlySavings) || 0).toFixed(1));

    const result = {
      id: this._generateId('roi_result'),
      configId: config.id,
      annualSavings: annualSavings,
      paybackPeriodMonths: paybackPeriodMonths,
      createdAt: this._nowIso()
    };

    results.push(result);
    this._saveToStorage('roi_calculator_results', results);

    const annualSavingsLabel = this._formatCurrency(annualSavings) + ' / year';
    const paybackPeriodLabel = paybackPeriodMonths.toString() + ' months';

    return {
      config: config,
      result: result,
      annualSavingsLabel: annualSavingsLabel,
      paybackPeriodLabel: paybackPeriodLabel
    };
  }

  emailRoiResults(email) {
    const roiResults = this._getFromStorage('roi_calculator_results');
    const requests = this._getFromStorage('roi_email_requests');

    if (!roiResults.length) {
      return {
        request: null,
        message: 'No ROI results found to email.'
      };
    }

    const latest = this._getLatestRoiResult();

    const request = {
      id: this._generateId('roi_email_request'),
      resultId: latest.id,
      email: email,
      status: 'sent',
      sentAt: this._nowIso()
    };

    requests.push(request);
    this._saveToStorage('roi_email_requests', requests);

    return {
      request: request,
      message: 'ROI results emailed to ' + email + '.'
    };
  }

  // ---------- Bundle Builder Interfaces ----------

  getBundleBuilderOptions() {
    const services = this._getFromStorage('services');
    let bundleServices = services.filter(function (s) { return !!s.isIncludedInBundles; });

    // If too few services are explicitly marked for bundles, fall back to other services
    if (bundleServices.length < 3) {
      const extra = services.filter(function (s) { return !s.isIncludedInBundles; });
      for (let i = 0; i < extra.length && bundleServices.length < 3; i++) {
        if (bundleServices.indexOf(extra[i]) === -1) {
          bundleServices.push(extra[i]);
        }
      }
    }

    const mapped = bundleServices.map(function (s) {
      const monthlyPrice = s.basePriceMonthly || 0;
      return {
        service: s,
        monthlyPrice: monthlyPrice,
        priceLabel: this._formatCurrency(monthlyPrice) + '/mo',
        isRequired: false
      };
    }, this);

    return {
      services: mapped
    };
  }

  createOrUpdateCustomBundle(selectedServiceIds, notes) {
    const services = this._getFromStorage('services');
    let bundles = this._getFromStorage('custom_bundles');
    let selections = this._getFromStorage('bundle_service_selections');

    const bundle = this._getOrCreateDraftBundle();

    // Ensure the draft bundle is present in the local bundles array so
    // that later persistence does not accidentally drop it.
    let hasBundle = false;
    for (let i = 0; i < bundles.length; i++) {
      if (bundles[i].id === bundle.id) {
        hasBundle = true;
        break;
      }
    }
    if (!hasBundle) {
      bundles.push(bundle);
    }

    // Remove existing selections for this bundle
    selections = selections.filter(function (sel) { return sel.bundleId !== bundle.id; });

    const selectedServices = [];
    let totalMonthlyPrice = 0;

    for (let i = 0; i < selectedServiceIds.length; i++) {
      const svcId = selectedServiceIds[i];
      const svc = services.find(function (s) { return s.id === svcId; }) || null;
      if (!svc) continue;
      const price = svc.basePriceMonthly || 0;
      const selection = {
        id: this._generateId('bundle_service_selection'),
        bundleId: bundle.id,
        serviceId: svc.id,
        monthlyPrice: price,
        createdAt: this._nowIso()
      };
      selections.push(selection);
      selectedServices.push({ service: svc, selection: selection });
      totalMonthlyPrice += price;
    }

    bundle.totalMonthlyPrice = totalMonthlyPrice;
    bundle.serviceCount = selectedServices.length;
    bundle.includesAiRoadmapWorkshop = selectedServices.some(function (item) {
      const name = (item.service.name || '').toLowerCase();
      const slug = (item.service.slug || '').toLowerCase();
      return name.indexOf('ai roadmap workshop') !== -1 || slug.indexOf('ai_roadmap_workshop') !== -1;
    });
    if (typeof notes === 'string') {
      bundle.notes = notes;
    }

    // Persist bundle and selections
    for (let j = 0; j < bundles.length; j++) {
      if (bundles[j].id === bundle.id) {
        bundles[j] = bundle;
        break;
      }
    }
    this._saveToStorage('custom_bundles', bundles);
    this._saveToStorage('bundle_service_selections', selections);

    const servicesOut = selectedServices.map(function (item) {
      return {
        service: item.service,
        monthlyPrice: item.selection.monthlyPrice,
        priceLabel: this._formatCurrency(item.selection.monthlyPrice) + '/mo'
      };
    }, this);

    const totalMonthlyPriceLabel = this._formatCurrency(totalMonthlyPrice) + '/mo';

    const validationWarnings = [];
    if (totalMonthlyPrice > 12000) {
      validationWarnings.push('Total monthly price exceeds $12,000. Consider removing or downgrading services.');
    }
    if (!bundle.includesAiRoadmapWorkshop) {
      validationWarnings.push('Bundle does not yet include the AI Roadmap Workshop.');
    }

    return {
      bundle: bundle,
      services: servicesOut,
      totalMonthlyPriceLabel: totalMonthlyPriceLabel,
      validationWarnings: validationWarnings
    };
  }

  getBundleSummary(bundleId) {
    const bundles = this._getFromStorage('custom_bundles');
    const selections = this._getFromStorage('bundle_service_selections');
    const services = this._getFromStorage('services');

    const bundle = bundles.find(function (b) { return b.id === bundleId; }) || null;
    if (!bundle) {
      return {
        bundle: null,
        services: [],
        totalMonthlyPriceLabel: ''
      };
    }

    const bundleSelections = selections.filter(function (sel) { return sel.bundleId === bundle.id; });
    const servicesOut = bundleSelections.map(function (sel) {
      const svc = services.find(function (s) { return s.id === sel.serviceId; }) || null;
      return {
        service: svc,
        monthlyPrice: sel.monthlyPrice,
        priceLabel: this._formatCurrency(sel.monthlyPrice) + '/mo'
      };
    }, this);

    const totalMonthlyPriceLabel = this._formatCurrency(bundle.totalMonthlyPrice || 0) + '/mo';

    return {
      bundle: bundle,
      services: servicesOut,
      totalMonthlyPriceLabel: totalMonthlyPriceLabel
    };
  }

  // ---------- Events & Webinars Interfaces ----------

  getEventsFilterOptions() {
    return {
      topicCategories: [
        { value: 'marketing', label: 'Marketing' },
        { value: 'customer_support', label: 'Customer Support' },
        { value: 'strategy', label: 'Strategy' },
        { value: 'data_ml', label: 'Data & ML' },
        { value: 'operations', label: 'Operations' },
        { value: 'other', label: 'Other' }
      ],
      dateRangePresets: [
        { value: 'upcoming', label: 'Upcoming', description: 'All upcoming events' },
        { value: 'next_month', label: 'Next month', description: 'Events happening next calendar month' }
      ]
    };
  }

  searchEvents(filters, sortBy) {
    const events = this._getFromStorage('events');

    let results = events.filter(function (e) { return e.listingStatus === 'published' && e.isUpcoming; });

    if (filters && filters.topicCategory) {
      results = results.filter(function (e) { return e.topicCategory === filters.topicCategory; });
    }

    const now = new Date();
    if (filters && filters.dateRangePreset === 'next_month') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const nextMonth = (currentMonth + 1) % 12;
      const yearForNextMonth = currentMonth === 11 ? currentYear + 1 : currentYear;
      const start = new Date(yearForNextMonth, nextMonth, 1);
      const end = new Date(yearForNextMonth, nextMonth + 1, 0, 23, 59, 59, 999);
      results = results.filter(function (e) {
        const dt = new Date(e.startDateTime);
        return dt >= start && dt <= end;
      });
    } else if (filters && filters.startDate && filters.endDate) {
      const startCustom = new Date(filters.startDate);
      const endCustom = new Date(filters.endDate);
      results = results.filter(function (e) {
        const dt = new Date(e.startDateTime);
        return dt >= startCustom && dt <= endCustom;
      });
    }

    if (filters && filters.eventType) {
      results = results.filter(function (e) { return e.eventType === filters.eventType; });
    }

    if (sortBy === 'date_asc' || !sortBy) {
      results.sort(function (a, b) {
        const da = a.startDateTime || '';
        const db = b.startDateTime || '';
        if (da < db) return -1;
        if (da > db) return 1;
        return 0;
      });
    }

    const mapped = results.map(function (e) {
      return {
        event: e,
        dateLabel: this._formatDateLabel(e.startDateTime),
        topicCategoryLabel: this._topicCategoryLabel(e.topicCategory)
      };
    }, this);

    return {
      results: mapped,
      total: mapped.length
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(function (e) { return e.id === eventId; }) || null;
    if (!event) {
      return {
        event: null,
        dateLabel: '',
        topicCategoryLabel: '',
        durationLabel: '',
        speakersList: [],
        registrationOpen: false
      };
    }

    let durationLabel = '';
    if (event.startDateTime && event.endDateTime) {
      const start = new Date(event.startDateTime);
      const end = new Date(event.endDateTime);
      const ms = end - start;
      if (ms > 0) {
        const minutes = Math.round(ms / 60000);
        durationLabel = minutes + ' minutes';
      }
    }

    const speakersList = Array.isArray(event.speakers) ? event.speakers.slice() : [];
    const registrationOpen = !!event.isUpcoming && event.listingStatus === 'published';

    return {
      event: event,
      dateLabel: this._formatDateLabel(event.startDateTime),
      topicCategoryLabel: this._topicCategoryLabel(event.topicCategory),
      durationLabel: durationLabel,
      speakersList: speakersList,
      registrationOpen: registrationOpen
    };
  }

  registerForEvent(eventId, fullName, email, jobRole, companySizeRange, companyName) {
    const registrations = this._getFromStorage('event_registrations');

    const registration = {
      id: this._generateId('event_registration'),
      eventId: eventId,
      fullName: fullName,
      email: email,
      jobRole: jobRole,
      companySizeRange: companySizeRange,
      companyName: companyName || '',
      createdAt: this._nowIso()
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      registration: registration,
      message: 'You are registered for the event.'
    };
  }

  // ---------- About Page Interface ----------

  getAboutPageContent() {
    const consultants = this._getFromStorage('consultants');

    const leadershipTeam = consultants
      .filter(function (c) { return !!c.active; })
      .map(function (c) {
        return {
          consultant: c,
          roleLabel: c.title || 'AI Consultant'
        };
      });

    return {
      missionHtml: '<p>We are an AI consulting and strategy agency that helps organizations turn AI hype into compounding business value.</p>',
      values: [
        {
          title: 'Outcomes over algorithms',
          description: 'We start from business goals and constraints, then work backwards to the right AI solution.'
        },
        {
          title: 'Pragmatic by default',
          description: 'We prioritize solutions that are feasible to ship, maintain, and govern in your environment.'
        },
        {
          title: 'Partner, not vendor',
          description: 'We work alongside your teams to transfer knowledge and build durable capabilities.'
        }
      ],
      differentiators: [
        'Hands-on operators with experience shipping production AI systems.',
        'Industry-specific playbooks across support, marketing, operations, and product.',
        'Tight integration between strategy, experimentation, and MLOps.'
      ],
      leadershipTeam: leadershipTeam,
      certifications: []
    };
  }

  // ---------- Chat / AI Assistant Interfaces ----------

  getChatWidgetConfig() {
    return {
      welcomeMessage: 'Hi! I1m your AI consulting assistant. Ask me about packages, case studies, or how to get started.',
      suggestedPrompts: [
        'Which AI consulting package is best for a 500-person fintech company?',
        'Help me estimate ROI for automating our customer support.',
        'Show me case studies for e-commerce brands with strong revenue uplift.'
      ],
      enablePackageRecommendations: true
    };
  }

  getChatHistory() {
    const session = this._getOrCreateActiveChatSession();
    const messages = this._getFromStorage('chat_messages').filter(function (m) { return m.sessionId === session.id; });

    messages.sort(function (a, b) {
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return 0;
    });

    const list = messages.map(function (m) {
      let senderLabel = 'You';
      if (m.senderType === 'assistant') senderLabel = 'Assistant';
      else if (m.senderType === 'system') senderLabel = 'System';
      return {
        message: m,
        senderLabel: senderLabel,
        session: session
      };
    });

    return {
      messages: list
    };
  }

  _extractBudgetFromText(content) {
    if (!content) return null;
    const lower = content.toLowerCase();
    // Look for patterns like 10000 or 10,000
    const match = lower.match(/(\d[\d,]*)/);
    if (!match) return null;
    const numeric = match[1].replace(/,/g, '');
    const value = parseInt(numeric, 10);
    if (!isNaN(value) && value > 0) {
      return value;
    }
    return null;
  }

  _recommendPackageForChat(budget) {
    const packages = this._getFromStorage('packages');
    const primary = packages.filter(function (p) { return p.status === 'active' && p.isPrimaryTier; });
    if (!primary.length) return null;

    let affordable = primary;
    if (typeof budget === 'number' && budget > 0) {
      affordable = primary.filter(function (p) {
        const price = p.billingPeriod === 'one_time' ? p.oneTimePrice || 0 : p.monthlyPrice || 0;
        return price <= budget;
      });
      if (!affordable.length) {
        affordable = primary;
      }
    }

    const priorityOrder = ['enterprise', 'growth', 'startup'];
    let chosen = affordable[0];
    for (let i = 0; i < priorityOrder.length; i++) {
      const key = priorityOrder[i];
      const found = affordable.find(function (p) {
        const slug = (p.slug || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return slug === key || name.indexOf(key) !== -1;
      });
      if (found) {
        chosen = found;
        break;
      }
    }

    return chosen;
  }

  sendChatMessage(content) {
    const session = this._getOrCreateActiveChatSession();
    const messages = this._getFromStorage('chat_messages');

    const userMessage = {
      id: this._generateId('chat_message'),
      sessionId: session.id,
      senderType: 'user',
      content: content,
      createdAt: this._nowIso()
    };

    messages.push(userMessage);

    let assistantText = 'Thanks for sharing. I can help with AI strategy, packages, and case studies. What would you like to explore?';
    let suggestedPackage = null;
    let quickActions = [];

    const lower = content.toLowerCase();
    const wantsPackageRecommendation =
      lower.indexOf('package') !== -1 ||
      lower.indexOf('plan') !== -1 ||
      lower.indexOf('startup') !== -1 ||
      lower.indexOf('growth') !== -1 ||
      lower.indexOf('enterprise') !== -1;

    if (wantsPackageRecommendation) {
      const budget = this._extractBudgetFromText(content);
      const pkg = this._recommendPackageForChat(budget || 0);
      if (pkg) {
        const price = pkg.billingPeriod === 'one_time' ? pkg.oneTimePrice || 0 : pkg.monthlyPrice || 0;
        const isWithinBudget = !budget || price <= budget;
        const priceLabel = this._formatPriceLabel(price, pkg.billingPeriod);

        assistantText = 'Based on what you shared, I recommend the ' + pkg.name + ' package. It is ' + priceLabel + ' and is designed for companies in the ' + this._companySizeRangeLabel(pkg.minCompanySize, pkg.maxCompanySize) + ' range.';

        suggestedPackage = {
          package: pkg,
          reasoningSummary: 'Recommended based on your budget and company profile.',
          isWithinBudget: !!isWithinBudget
        };

        // Update chat session with last recommended package
        const sessions = this._getFromStorage('chat_sessions');
        for (let i = 0; i < sessions.length; i++) {
          if (sessions[i].id === session.id) {
            sessions[i].lastRecommendedPackageId = pkg.id;
            break;
          }
        }
        this._saveToStorage('chat_sessions', sessions);

        quickActions.push({
          type: 'view_package',
          label: 'View ' + pkg.name + ' Plan',
          packageId: pkg.id
        });
      } else {
        assistantText = 'I could not find a matching package, but I can still help you scope an engagement.';
      }
    }

    const assistantMessage = {
      id: this._generateId('chat_message'),
      sessionId: session.id,
      senderType: 'assistant',
      content: assistantText,
      createdAt: this._nowIso()
    };

    messages.push(assistantMessage);
    this._saveToStorage('chat_messages', messages);

    return {
      userMessage: userMessage,
      assistantMessage: assistantMessage,
      suggestedPackage: suggestedPackage,
      quickActions: quickActions
    };
  }

  getLastRecommendedPackage() {
    const session = this._getOrCreateActiveChatSession();
    const packages = this._getFromStorage('packages');

    if (!session.lastRecommendedPackageId) {
      return {
        hasRecommendation: false,
        package: null,
        reasoningSummary: ''
      };
    }

    const pkg = packages.find(function (p) { return p.id === session.lastRecommendedPackageId; }) || null;
    if (!pkg) {
      return {
        hasRecommendation: false,
        package: null,
        reasoningSummary: ''
      };
    }

    return {
      hasRecommendation: true,
      package: pkg,
      reasoningSummary: 'Last recommended based on your recent chat with the assistant.'
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
