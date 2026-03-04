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

  // =========================
  // Storage helpers & init
  // =========================

  _initStorage() {
    const tables = [
      'jobs',
      'job_applications',
      'job_saved_collections',
      'job_saved_items',
      'job_alerts',
      'talent_requests',
      'engagement_models',
      'engagement_model_inquiries',
      'developer_profiles',
      'talent_shortlists',
      'talent_shortlist_items',
      'case_studies',
      'case_study_similar_project_requests',
      'project_estimates',
      'estimate_contact_requests',
      'consultation_bookings'
    ];

    for (const key of tables) {
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

  // =========================
  // Formatting helpers
  // =========================

  _formatExperienceLevel(value) {
    const map = {
      internship: 'Internship',
      junior: 'Junior',
      mid_level: 'Mid-level',
      senior: 'Senior',
      lead: 'Lead',
      manager: 'Manager',
      director: 'Director'
    };
    return map[value] || value || '';
  }

  _formatEmploymentType(value) {
    const map = {
      full_time: 'Full-time',
      part_time: 'Part-time',
      contract: 'Contract',
      contract_to_hire: 'Contract-to-hire',
      internship: 'Internship',
      temporary: 'Temporary'
    };
    return map[value] || value || '';
  }

  _formatRemoteLabel(job) {
    if (!job) return '';
    if (job.isRemote || job.remoteWorkType === 'remote_only') {
      return 'Remote';
    }
    const map = {
      remote_only: 'Remote',
      hybrid: 'Hybrid',
      on_site: 'On-site'
    };
    return map[job.remoteWorkType] || '';
  }

  _formatCurrencySymbol(currency) {
    const map = {
      usd: '$',
      eur: '€',
      gbp: '£',
      cad: 'CA$',
      aud: 'A$',
      nzd: 'NZ$',
      inr: '₹'
    };
    return map[currency] || '';
  }

  _formatSalaryDisplay(job) {
    if (!job) return '';
    const { salaryMin, salaryMax, salaryCurrency, salaryPeriod } = job;
    if (salaryMin == null && salaryMax == null) return '';
    const symbol = this._formatCurrencySymbol(salaryCurrency || 'usd');
    const periodMap = {
      per_year: 'per year',
      per_month: 'per month',
      per_day: 'per day',
      per_hour: 'per hour'
    };
    const period = periodMap[salaryPeriod] || '';
    const fmt = (n) => {
      if (typeof n !== 'number') return '';
      try {
        return n.toLocaleString('en-US');
      } catch (e) {
        return String(n);
      }
    };
    if (salaryMin != null && salaryMax != null) {
      return symbol + fmt(salaryMin) + '–' + symbol + fmt(salaryMax) + (period ? ' ' + period : '');
    }
    if (salaryMin != null) {
      return 'From ' + symbol + fmt(salaryMin) + (period ? ' ' + period : '');
    }
    return 'Up to ' + symbol + fmt(salaryMax) + (period ? ' ' + period : '');
  }

  _formatLocation(city, country) {
    if (city && country) return city + ', ' + country;
    if (country) return country;
    if (city) return city;
    return '';
  }

  _formatHourlyRateDisplay(profile) {
    if (!profile || profile.hourlyRate == null) return '';
    const symbol = this._formatCurrencySymbol(profile.hourlyRateCurrency || 'usd');
    const rate = profile.hourlyRate;
    let rateStr;
    try {
      rateStr = rate.toLocaleString('en-US');
    } catch (e) {
      rateStr = String(rate);
    }
    return symbol + rateStr + ' / hr';
  }

  _formatRatingDisplay(profile) {
    if (!profile || profile.rating == null) return '';
    return profile.rating.toFixed(1) + ' / 5';
  }

  _formatCaseStudyIndustry(industry) {
    const map = {
      fintech: 'Fintech',
      ecommerce: 'E-commerce',
      healthcare: 'Healthcare',
      education: 'Education',
      enterprise_software: 'Enterprise Software',
      saas: 'SaaS',
      other: 'Other'
    };
    return map[industry] || industry || '';
  }

  _formatCaseStudyPlatform(platform) {
    const map = {
      web: 'Web',
      mobile: 'Mobile',
      desktop: 'Desktop',
      backend: 'Backend',
      multi_platform: 'Multi-platform'
    };
    return map[platform] || platform || '';
  }

  _formatEngagementModelPriceDisplay(model) {
    if (!model || model.startingPriceMonthly == null) return '';
    const symbol = this._formatCurrencySymbol(model.startingPriceCurrency || 'usd');
    let amount;
    try {
      amount = model.startingPriceMonthly.toLocaleString('en-US');
    } catch (e) {
      amount = String(model.startingPriceMonthly);
    }
    const periodMap = {
      per_month: 'per month',
      per_project: 'per project'
    };
    const period = periodMap[model.billingPeriod] || 'per month';
    return 'From ' + symbol + amount + ' ' + period;
  }

  // =========================
  // Helper: collections & shortlists
  // =========================

  _getOrCreateJobSavedCollectionByName(name, description) {
    const collections = this._getFromStorage('job_saved_collections');
    const existing = collections.find((c) => c.name.toLowerCase() === String(name).toLowerCase());
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const collection = {
      id: this._generateId('jobSavedCollection'),
      name: name,
      description: description || '',
      createdAt: now
    };
    collections.push(collection);
    this._saveToStorage('job_saved_collections', collections);
    return collection;
  }

  _getOrCreateTalentShortlistByName(name, description) {
    const shortlists = this._getFromStorage('talent_shortlists');
    const existing = shortlists.find((s) => s.name.toLowerCase() === String(name).toLowerCase());
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const shortlist = {
      id: this._generateId('talentShortlist'),
      name: name,
      description: description || '',
      createdAt: now
    };
    shortlists.push(shortlist);
    this._saveToStorage('talent_shortlists', shortlists);
    return shortlist;
  }

  // =========================
  // Helper: Project estimate
  // =========================

  _createAndStoreProjectEstimate(projectType, scope, integrationsCount, timeline, currency) {
    const estimates = this._getFromStorage('project_estimates');
    const now = new Date().toISOString();

    // Simple deterministic cost model
    let base = 0;
    if (scope === 'pages_1_4') base = 8000;
    else if (scope === 'pages_5_10') base = 15000;
    else if (scope === 'pages_11_20') base = 25000;
    else base = 10000; // custom

    const integrationCost = (integrationsCount || 0) * 2000;

    let multiplier = 1;
    if (timeline === 'one_month') multiplier = 1.5;
    else if (timeline === 'three_months') multiplier = 1;
    else if (timeline === 'six_months') multiplier = 0.9;
    else if (timeline === 'twelve_months') multiplier = 0.8;

    const estimatedCost = Math.round((base * multiplier + integrationCost) / 100) * 100;

    const estimate = {
      id: this._generateId('estimate'),
      projectType: projectType,
      scope: scope,
      integrationsCount: integrationsCount,
      timeline: timeline,
      estimatedCost: estimatedCost,
      currency: currency || 'usd',
      notes: 'Auto-calculated using base scope, integrations, and timeline multipliers.',
      createdAt: now
    };

    estimates.push(estimate);
    this._saveToStorage('project_estimates', estimates);
    return estimate;
  }

  // =========================
  // Helper: Consultation validation
  // =========================

  _validateConsultationSlot(consultationType, startDateTime, durationMinutes) {
    if (!startDateTime) return { valid: false, reason: 'Missing startDateTime' };
    const start = new Date(startDateTime);
    if (Number.isNaN(start.getTime())) {
      return { valid: false, reason: 'Invalid startDateTime' };
    }
    const duration = durationMinutes || 60;
    const end = new Date(start.getTime() + duration * 60000);

    const hour = start.getUTCHours();
    // Allow slots between 09:00 and 18:00 UTC to avoid timezone-related shifts
    if (hour < 9 || hour >= 18) {
      return { valid: false, reason: 'Outside business hours' };
    }

    // Check overlap with existing bookings of same type
    const bookings = this._getFromStorage('consultation_bookings');
    const overlap = bookings.some((b) => {
      if (b.consultationType !== consultationType) return false;
      if (b.status === 'cancelled') return false;
      const bStart = new Date(b.startDateTime);
      const bEnd = new Date(bStart.getTime() + (b.durationMinutes || 60) * 60000);
      return start < bEnd && end > bStart;
    });

    if (overlap) {
      return { valid: false, reason: 'Slot already booked' };
    }

    return { valid: true };
  }

  // =========================
  // Interface: Homepage content
  // =========================

  getHomePageContent() {
    const jobs = this._getFromStorage('jobs');
    const developerProfiles = this._getFromStorage('developer_profiles');
    const caseStudies = this._getFromStorage('case_studies');
    const engagementModels = this._getFromStorage('engagement_models');

    const featuredJobs = jobs
      .filter((j) => j.isFeatured && j.status === 'open')
      .sort((a, b) => {
        const aDate = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const bDate = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 5)
      .map((job) => ({
        job: job,
        locationDisplay: this._formatLocation(job.locationCity, job.locationCountry),
        salaryDisplay: this._formatSalaryDisplay(job),
        experienceLevelLabel: this._formatExperienceLevel(job.experienceLevel),
        employmentTypeLabel: this._formatEmploymentType(job.employmentType),
        remoteLabel: this._formatRemoteLabel(job)
      }));

    const featuredDeveloperProfiles = developerProfiles
      .filter((p) => p.isAvailable !== false)
      .sort((a, b) => {
        const ar = a.rating != null ? a.rating : 0;
        const br = b.rating != null ? b.rating : 0;
        return br - ar;
      })
      .slice(0, 5)
      .map((profile) => ({
        profile: profile,
        locationDisplay: this._formatLocation(profile.locationCity, profile.locationCountry),
        hourlyRateDisplay: this._formatHourlyRateDisplay(profile),
        ratingDisplay: this._formatRatingDisplay(profile)
      }));

    const featuredCaseStudies = caseStudies
      .filter((c) => c.isFeatured)
      .sort((a, b) => {
        const ay = a.year || 0;
        const by = b.year || 0;
        return by - ay;
      })
      .slice(0, 6)
      .map((caseStudy) => ({
        caseStudy: caseStudy,
        industryLabel: this._formatCaseStudyIndustry(caseStudy.industry),
        platformLabel: this._formatCaseStudyPlatform(caseStudy.platform)
      }));

    const featuredEngagementModels = engagementModels
      .filter((m) => m.isActive)
      .map((model) => ({
        model: model,
        priceDisplay: this._formatEngagementModelPriceDisplay(model)
      }));

    return {
      hero: {
        headline: 'Hire vetted engineering talent and ship software faster',
        subheadline: 'Remote developers and delivery teams for product companies and ambitious startups.',
        primaryCtas: [
          { label: 'Find Jobs', targetPage: 'jobs' },
          { label: 'Hire Talent', targetPage: 'hire_talent' },
          { label: 'View Services', targetPage: 'services' }
        ]
      },
      highlightedServices: [
        {
          serviceId: 'service_custom_dev',
          name: 'Custom Software Development',
          shortDescription: 'End-to-end product delivery for web and mobile.',
          targetPage: 'services'
        },
        {
          serviceId: 'service_dedicated_teams',
          name: 'Dedicated Engineering Teams',
          shortDescription: 'Scalable squads of backend, frontend, and QA engineers.',
          targetPage: 'engagement_models'
        },
        {
          serviceId: 'service_hiring',
          name: 'Technical Recruitment',
          shortDescription: 'Match with pre-vetted developers across the globe.',
          targetPage: 'hire_talent'
        }
      ],
      featuredJobs: featuredJobs,
      featuredDeveloperProfiles: featuredDeveloperProfiles,
      featuredCaseStudies: featuredCaseStudies,
      featuredEngagementModels: featuredEngagementModels
    };
  }

  // =========================
  // Interfaces: Job search & detail
  // =========================

  getJobSearchFilterOptions() {
    return {
      salaryCurrencies: [
        { code: 'usd', label: 'USD ($)' },
        { code: 'eur', label: 'EUR (€)' },
        { code: 'gbp', label: 'GBP (£)' },
        { code: 'cad', label: 'CAD (CA$)' },
        { code: 'aud', label: 'AUD (A$)' },
        { code: 'nzd', label: 'NZD (NZ$)' },
        { code: 'inr', label: 'INR (₹)' },
        { code: 'other', label: 'Other' }
      ],
      employmentTypes: [
        { value: 'full_time', label: 'Full-time' },
        { value: 'part_time', label: 'Part-time' },
        { value: 'contract', label: 'Contract' },
        { value: 'contract_to_hire', label: 'Contract-to-hire' },
        { value: 'internship', label: 'Internship' },
        { value: 'temporary', label: 'Temporary' }
      ],
      experienceLevels: [
        { value: 'internship', label: 'Internship' },
        { value: 'junior', label: 'Junior' },
        { value: 'mid_level', label: 'Mid-level' },
        { value: 'senior', label: 'Senior' },
        { value: 'lead', label: 'Lead' },
        { value: 'manager', label: 'Manager' },
        { value: 'director', label: 'Director' }
      ],
      sortOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'salary_high_to_low', label: 'Salary: High to Low' },
        { value: 'salary_low_to_high', label: 'Salary: Low to High' },
        { value: 'newest', label: 'Newest' }
      ],
      remoteOptions: [
        { value: 'remote_only', label: 'Remote only' },
        { value: 'hybrid', label: 'Hybrid' },
        { value: 'on_site', label: 'On-site' }
      ]
    };
  }

  searchJobs(
    keywords,
    locationCountry,
    locationCity,
    remoteOnly,
    salaryMin,
    salaryMax,
    salaryCurrency,
    employmentTypes,
    experienceLevels,
    startDateFrom,
    startDateTo,
    sortBy,
    page,
    pageSize
  ) {
    const allJobs = this._getFromStorage('jobs');
    let jobs = allJobs.filter((j) => j.status === 'open');

    if (keywords) {
      const kw = String(keywords).toLowerCase();
      jobs = jobs.filter((j) => {
        const fields = [
          j.title,
          j.companyName,
          j.summary,
          j.description,
          (j.primarySkills || []).join(' '),
          (j.secondarySkills || []).join(' ')
        ];
        return fields.some((f) => (f || '').toString().toLowerCase().indexOf(kw) !== -1);
      });
    }

    if (locationCountry) {
      const lc = String(locationCountry).toLowerCase();
      jobs = jobs.filter((j) => (j.locationCountry || '').toString().toLowerCase() === lc);
    }

    if (locationCity) {
      const lcity = String(locationCity).toLowerCase();
      jobs = jobs.filter((j) => (j.locationCity || '').toString().toLowerCase() === lcity);
    }

    if (remoteOnly) {
      jobs = jobs.filter((j) => j.isRemote || j.remoteWorkType === 'remote_only');
    }

    if (salaryMin != null) {
      jobs = jobs.filter((j) => {
        if (j.salaryMin == null) return false;
        if (salaryCurrency && j.salaryCurrency && j.salaryCurrency !== salaryCurrency) return false;
        return j.salaryMin >= salaryMin;
      });
    }

    if (salaryMax != null) {
      jobs = jobs.filter((j) => {
        if (j.salaryMax == null) return false;
        if (salaryCurrency && j.salaryCurrency && j.salaryCurrency !== salaryCurrency) return false;
        return j.salaryMax <= salaryMax;
      });
    }

    if (Array.isArray(employmentTypes) && employmentTypes.length > 0) {
      const set = employmentTypes;
      jobs = jobs.filter((j) => set.indexOf(j.employmentType) !== -1);
    }

    if (Array.isArray(experienceLevels) && experienceLevels.length > 0) {
      const set = experienceLevels;
      jobs = jobs.filter((j) => set.indexOf(j.experienceLevel) !== -1);
    }

    if (startDateFrom) {
      const fromTs = new Date(startDateFrom).getTime();
      if (!Number.isNaN(fromTs)) {
        jobs = jobs.filter((j) => {
          if (!j.startDate) return false;
          return new Date(j.startDate).getTime() >= fromTs;
        });
      }
    }

    if (startDateTo) {
      const toTs = new Date(startDateTo).getTime();
      if (!Number.isNaN(toTs)) {
        jobs = jobs.filter((j) => {
          if (!j.startDate) return false;
          return new Date(j.startDate).getTime() <= toTs;
        });
      }
    }

    const sort = sortBy || 'relevance';
    if (sort === 'salary_high_to_low') {
      jobs.sort((a, b) => {
        const av = a.salaryMax != null ? a.salaryMax : a.salaryMin || 0;
        const bv = b.salaryMax != null ? b.salaryMax : b.salaryMin || 0;
        return bv - av;
      });
    } else if (sort === 'salary_low_to_high') {
      jobs.sort((a, b) => {
        const av = a.salaryMin != null ? a.salaryMin : a.salaryMax || 0;
        const bv = b.salaryMin != null ? b.salaryMin : b.salaryMax || 0;
        return av - bv;
      });
    } else if (sort === 'newest') {
      jobs.sort((a, b) => {
        const at = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const bt = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        return bt - at;
      });
    } else {
      // relevance fallback: newest first
      jobs.sort((a, b) => {
        const at = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const bt = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        return bt - at;
      });
    }

    const total = jobs.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (p - 1) * ps;
    const paged = jobs.slice(startIndex, startIndex + ps);

    const resultJobs = paged.map((job) => ({
      job: job,
      locationDisplay: this._formatLocation(job.locationCity, job.locationCountry),
      salaryDisplay: this._formatSalaryDisplay(job),
      experienceLevelLabel: this._formatExperienceLevel(job.experienceLevel),
      employmentTypeLabel: this._formatEmploymentType(job.employmentType),
      remoteLabel: this._formatRemoteLabel(job)
    }));

    return {
      jobs: resultJobs,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  getJobDetail(jobId) {
    const jobs = this._getFromStorage('jobs');
    const job = jobs.find((j) => j.id === jobId) || null;
    const job_saved_items = this._getFromStorage('job_saved_items');
    const isSaved = !!job_saved_items.find((item) => item.jobId === jobId);

    return {
      job: job,
      locationDisplay: job ? this._formatLocation(job.locationCity, job.locationCountry) : '',
      salaryDisplay: job ? this._formatSalaryDisplay(job) : '',
      experienceLevelLabel: job ? this._formatExperienceLevel(job.experienceLevel) : '',
      employmentTypeLabel: job ? this._formatEmploymentType(job.employmentType) : '',
      remoteLabel: job ? this._formatRemoteLabel(job) : '',
      isSaved: isSaved
    };
  }

  applyToJob(jobId, candidateName, candidateEmail, candidateLinkedinUrl, coverMessage) {
    const jobs = this._getFromStorage('jobs');
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      return { success: false, message: 'Job not found', application: null };
    }

    const applications = this._getFromStorage('job_applications');
    const now = new Date().toISOString();

    const application = {
      id: this._generateId('jobApplication'),
      jobId: jobId,
      candidateName: candidateName,
      candidateEmail: candidateEmail,
      candidateLinkedinUrl: candidateLinkedinUrl || '',
      coverMessage: coverMessage,
      applicationStatus: 'submitted',
      submittedAt: now
    };

    applications.push(application);
    this._saveToStorage('job_applications', applications);

    return {
      success: true,
      message: 'Application submitted successfully',
      application: application
    };
  }

  saveJobToNamedCollection(jobId, collectionName, collectionDescription) {
    const jobs = this._getFromStorage('jobs');
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      return { success: false, message: 'Job not found', collection: null, savedItem: null };
    }

    const collection = this._getOrCreateJobSavedCollectionByName(collectionName, collectionDescription);
    const items = this._getFromStorage('job_saved_items');

    let savedItem = items.find((i) => i.collectionId === collection.id && i.jobId === jobId);
    if (!savedItem) {
      const now = new Date().toISOString();
      savedItem = {
        id: this._generateId('jobSavedItem'),
        collectionId: collection.id,
        jobId: jobId,
        savedAt: now
      };
      items.push(savedItem);
      this._saveToStorage('job_saved_items', items);
    }

    return {
      success: true,
      message: 'Job saved to collection',
      collection: collection,
      savedItem: savedItem
    };
  }

  // =========================
  // Interfaces: Job alerts
  // =========================

  getJobAlertFormOptions() {
    return {
      employmentTypes: [
        { value: 'full_time', label: 'Full-time' },
        { value: 'part_time', label: 'Part-time' },
        { value: 'contract', label: 'Contract' },
        { value: 'contract_to_hire', label: 'Contract-to-hire' },
        { value: 'internship', label: 'Internship' },
        { value: 'temporary', label: 'Temporary' }
      ],
      alertFrequencies: [
        { value: 'instant', label: 'Instant' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' }
      ],
      salaryCurrencies: [
        { code: 'usd', label: 'USD ($)' },
        { code: 'eur', label: 'EUR (€)' },
        { code: 'gbp', label: 'GBP (£)' },
        { code: 'cad', label: 'CAD (CA$)' },
        { code: 'aud', label: 'AUD (A$)' },
        { code: 'nzd', label: 'NZD (NZ$)' },
        { code: 'inr', label: 'INR (₹)' },
        { code: 'other', label: 'Other' }
      ]
    };
  }

  createJobAlert(
    keywords,
    location,
    remoteOnly,
    salaryMin,
    salaryMax,
    salaryCurrency,
    employmentType,
    alertFrequency,
    email
  ) {
    const alerts = this._getFromStorage('job_alerts');
    const now = new Date().toISOString();

    const alert = {
      id: this._generateId('jobAlert'),
      keywords: keywords,
      location: location || '',
      remoteOnly: !!remoteOnly,
      salaryMin: salaryMin != null ? salaryMin : null,
      salaryMax: salaryMax != null ? salaryMax : null,
      salaryCurrency: salaryCurrency || null,
      employmentType: employmentType || null,
      alertFrequency: alertFrequency,
      email: email,
      isActive: true,
      createdAt: now,
      lastSentAt: null
    };

    alerts.push(alert);
    this._saveToStorage('job_alerts', alerts);

    return {
      success: true,
      message: 'Job alert created',
      alert: alert
    };
  }

  listJobAlerts() {
    const alerts = this._getFromStorage('job_alerts');
    return { alerts: alerts };
  }

  // =========================
  // Interfaces: Hire Talent
  // =========================

  getHireTalentPageContent() {
    return {
      introText: 'Tell us what kind of developers you need and we will match you with vetted talent.',
      processOverview: 'Share your requirements, interview pre-vetted candidates, and start working within days.',
      benefits: [
        'Access to a vetted global talent pool',
        'Flexible engagement models: contract, contract-to-hire, and permanent',
        'Dedicated account manager and technical screening'
      ],
      experienceLevels: [
        { value: 'internship', label: 'Internship' },
        { value: 'junior', label: 'Junior (0–2 years)' },
        { value: 'mid_level', label: 'Mid-level (3–5 years)' },
        { value: 'senior', label: 'Senior (6–9 years)' },
        { value: 'lead', label: 'Lead' },
        { value: 'manager', label: 'Manager' },
        { value: 'director', label: 'Director' }
      ],
      engagementTypes: [
        { value: 'contract', label: 'Contract' },
        { value: 'contract_to_hire', label: 'Contract-to-hire' },
        { value: 'permanent', label: 'Permanent' },
        { value: 'temporary', label: 'Temporary' }
      ],
      budgetCurrencies: [
        { code: 'usd', label: 'USD ($)' },
        { code: 'eur', label: 'EUR (€)' },
        { code: 'gbp', label: 'GBP (£)' },
        { code: 'cad', label: 'CAD (CA$)' },
        { code: 'aud', label: 'AUD (A$)' },
        { code: 'nzd', label: 'NZD (NZ$)' },
        { code: 'inr', label: 'INR (₹)' },
        { code: 'other', label: 'Other' }
      ]
    };
  }

  submitTalentRequest(
    roleOrSkills,
    experienceLevel,
    headcount,
    startDate,
    engagementType,
    monthlyBudget,
    budgetCurrency,
    additionalDetails,
    contactName,
    contactEmail,
    contactJobTitle,
    companyName
  ) {
    const requests = this._getFromStorage('talent_requests');
    const now = new Date().toISOString();

    const request = {
      id: this._generateId('talentRequest'),
      roleOrSkills: roleOrSkills,
      experienceLevel: experienceLevel,
      headcount: headcount,
      startDate: startDate || null,
      engagementType: engagementType,
      monthlyBudget: monthlyBudget != null ? monthlyBudget : null,
      budgetCurrency: budgetCurrency || null,
      additionalDetails: additionalDetails || '',
      contactName: contactName,
      contactEmail: contactEmail,
      contactJobTitle: contactJobTitle,
      companyName: companyName || '',
      status: 'submitted',
      submittedAt: now
    };

    requests.push(request);
    this._saveToStorage('talent_requests', requests);

    return {
      success: true,
      message: 'Talent request submitted',
      request: request
    };
  }

  // =========================
  // Interfaces: Services & Engagement models
  // =========================

  getServicesOverviewContent() {
    return {
      services: [
        {
          serviceId: 'custom_web_mobile',
          name: 'Custom Web & Mobile Development',
          shortDescription: 'Cross-functional teams to design, build, and launch your product.',
          targetPage: 'engagement_models'
        },
        {
          serviceId: 'dedicated_team',
          name: 'Dedicated Team',
          shortDescription: 'Longer-term squads embedded into your workflows.',
          targetPage: 'engagement_models'
        },
        {
          serviceId: 'mvp_discovery',
          name: 'MVP Discovery & Delivery',
          shortDescription: 'Validate ideas quickly with a pragmatic MVP scope.',
          targetPage: 'consultation'
        }
      ],
      ctaBlocks: [
        {
          headline: 'Need a flexible way to scale engineering?',
          body: 'Explore our engagement models to see which structure fits your roadmap and budget.',
          ctaLabel: 'View Engagement Models',
          targetPage: 'engagement_models'
        },
        {
          headline: 'Not sure where to start?',
          body: 'Book a consultation with our team to discuss your product, hiring, or replatforming plans.',
          ctaLabel: 'Schedule Consultation',
          targetPage: 'consultation'
        }
      ]
    };
  }

  getEngagementModelsOverview() {
    const models = this._getFromStorage('engagement_models').filter((m) => m.isActive);
    const result = models.map((model) => ({
      model: model,
      priceDisplay: this._formatEngagementModelPriceDisplay(model)
    }));
    return { models: result };
  }

  getEngagementModelDetail(slug) {
    const models = this._getFromStorage('engagement_models');
    const model = models.find((m) => m.slug === slug) || null;

    let highlights = [];
    let typicalTimelines = [];
    let typicalUseCases = [];

    if (model) {
      if (model.slug === 'dedicated_team') {
        highlights = [
          'Long-term collaboration with a stable team',
          'Flexible scope and priorities sprint by sprint',
          'Great for product companies with evolving roadmaps'
        ];
        typicalTimelines = ['6+ months', 'Ongoing'];
        typicalUseCases = ['Growing SaaS products', 'Platform rebuilds', 'Multi-team initiatives'];
      } else if (model.slug === 'fixed_price_project') {
        highlights = [
          'Clear scope and fixed budget',
          'Predictable delivery milestones',
          'Ideal for well-defined MVPs and replatforming projects']
        ;
        typicalTimelines = ['2–6 months'];
        typicalUseCases = ['Greenfield MVPs', 'Migration projects', 'Proof-of-concept builds'];
      }
    }

    return {
      model: model,
      highlights: highlights,
      typicalTimelines: typicalTimelines,
      typicalUseCases: typicalUseCases,
      priceDisplay: model ? this._formatEngagementModelPriceDisplay(model) : ''
    };
  }

  submitEngagementModelInquiry(engagementModelSlug, projectTitle, projectDescription, contactName, contactEmail) {
    const models = this._getFromStorage('engagement_models');
    const model = models.find((m) => m.slug === engagementModelSlug);
    if (!model) {
      return {
        success: false,
        message: 'Engagement model not found',
        inquiry: null
      };
    }

    const inquiries = this._getFromStorage('engagement_model_inquiries');
    const now = new Date().toISOString();

    const inquiry = {
      id: this._generateId('engagementModelInquiry'),
      engagementModelId: model.id,
      projectTitle: projectTitle,
      projectDescription: projectDescription,
      contactName: contactName,
      contactEmail: contactEmail,
      status: 'submitted',
      createdAt: now
    };

    inquiries.push(inquiry);
    this._saveToStorage('engagement_model_inquiries', inquiries);

    return {
      success: true,
      message: 'Engagement model inquiry submitted',
      inquiry: inquiry
    };
  }

  // =========================
  // Interfaces: Developer / Talent search
  // =========================

  getDeveloperSearchFilterOptions() {
    return {
      skillsExamples: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'Go'],
      regions: ['Europe', 'North America', 'Latin America', 'Asia', 'Africa', 'Oceania'],
      ratingThresholds: [3.0, 4.0, 4.5, 4.8],
      hourlyRateCurrencies: [
        { code: 'usd', label: 'USD ($)' },
        { code: 'eur', label: 'EUR (€)' },
        { code: 'gbp', label: 'GBP (£)' },
        { code: 'cad', label: 'CAD (CA$)' },
        { code: 'aud', label: 'AUD (A$)' },
        { code: 'nzd', label: 'NZD (NZ$)' },
        { code: 'inr', label: 'INR (₹)' },
        { code: 'other', label: 'Other' }
      ],
      sortOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'hourly_rate_low_to_high', label: 'Hourly rate: Low to High' },
        { value: 'hourly_rate_high_to_low', label: 'Hourly rate: High to Low' }
      ]
    };
  }

  searchDeveloperProfiles(
    primarySkill,
    locationRegion,
    locationCountries,
    hourlyRateMin,
    hourlyRateMax,
    hourlyRateCurrency,
    ratingMin,
    experienceLevels,
    sortBy,
    page,
    pageSize
  ) {
    const allProfiles = this._getFromStorage('developer_profiles');
    let profiles = allProfiles.slice();

    if (primarySkill) {
      const skill = String(primarySkill).toLowerCase();
      profiles = profiles.filter((p) => {
        const prim = (p.primarySkills || []).map((s) => String(s).toLowerCase());
        const sec = (p.secondarySkills || []).map((s) => String(s).toLowerCase());
        return prim.indexOf(skill) !== -1 || sec.indexOf(skill) !== -1;
      });
    }

    if (locationRegion) {
      const region = String(locationRegion).toLowerCase();
      profiles = profiles.filter((p) => (p.locationRegion || '').toString().toLowerCase() === region);
    }

    if (Array.isArray(locationCountries) && locationCountries.length > 0) {
      const set = locationCountries.map((c) => String(c).toLowerCase());
      profiles = profiles.filter((p) => set.indexOf((p.locationCountry || '').toString().toLowerCase()) !== -1);
    }

    if (hourlyRateMin != null) {
      profiles = profiles.filter((p) => p.hourlyRate != null && p.hourlyRate >= hourlyRateMin);
    }

    if (hourlyRateMax != null) {
      profiles = profiles.filter((p) => p.hourlyRate != null && p.hourlyRate <= hourlyRateMax);
    }

    if (hourlyRateCurrency) {
      profiles = profiles.filter((p) => p.hourlyRateCurrency === hourlyRateCurrency);
    }

    if (ratingMin != null) {
      profiles = profiles.filter((p) => p.rating != null && p.rating >= ratingMin);
    }

    if (Array.isArray(experienceLevels) && experienceLevels.length > 0) {
      const set = experienceLevels;
      profiles = profiles.filter((p) => p.experienceLevel && set.indexOf(p.experienceLevel) !== -1);
    }

    const sort = sortBy || 'relevance';
    if (sort === 'rating_high_to_low') {
      profiles.sort((a, b) => {
        const ar = a.rating != null ? a.rating : 0;
        const br = b.rating != null ? b.rating : 0;
        return br - ar;
      });
    } else if (sort === 'hourly_rate_low_to_high') {
      profiles.sort((a, b) => {
        const av = a.hourlyRate != null ? a.hourlyRate : Number.MAX_SAFE_INTEGER;
        const bv = b.hourlyRate != null ? b.hourlyRate : Number.MAX_SAFE_INTEGER;
        return av - bv;
      });
    } else if (sort === 'hourly_rate_high_to_low') {
      profiles.sort((a, b) => {
        const av = a.hourlyRate != null ? a.hourlyRate : 0;
        const bv = b.hourlyRate != null ? b.hourlyRate : 0;
        return bv - av;
      });
    } else {
      // relevance fallback: rating then hourly rate
      profiles.sort((a, b) => {
        const ar = a.rating != null ? a.rating : 0;
        const br = b.rating != null ? b.rating : 0;
        if (br !== ar) return br - ar;
        const av = a.hourlyRate != null ? a.hourlyRate : Number.MAX_SAFE_INTEGER;
        const bv = b.hourlyRate != null ? b.hourlyRate : Number.MAX_SAFE_INTEGER;
        return av - bv;
      });
    }

    const total = profiles.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (p - 1) * ps;
    const paged = profiles.slice(startIndex, startIndex + ps);

    const resultProfiles = paged.map((profile) => ({
      profile: profile,
      locationDisplay: this._formatLocation(profile.locationCity, profile.locationCountry),
      hourlyRateDisplay: this._formatHourlyRateDisplay(profile),
      ratingDisplay: this._formatRatingDisplay(profile)
    }));

    return {
      profiles: resultProfiles,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  getDeveloperProfileDetail(developerProfileId) {
    const profiles = this._getFromStorage('developer_profiles');
    const profile = profiles.find((p) => p.id === developerProfileId) || null;
    const skillsDisplay = [];
    if (profile) {
      (profile.primarySkills || []).forEach((s) => {
        if (skillsDisplay.indexOf(s) === -1) skillsDisplay.push(s);
      });
      (profile.secondarySkills || []).forEach((s) => {
        if (skillsDisplay.indexOf(s) === -1) skillsDisplay.push(s);
      });
    }
    return {
      profile: profile,
      locationDisplay: profile ? this._formatLocation(profile.locationCity, profile.locationCountry) : '',
      hourlyRateDisplay: profile ? this._formatHourlyRateDisplay(profile) : '',
      ratingDisplay: profile ? this._formatRatingDisplay(profile) : '',
      skillsDisplay: skillsDisplay
    };
  }

  addDeveloperToShortlistByName(developerProfileId, shortlistName, shortlistDescription) {
    const profiles = this._getFromStorage('developer_profiles');
    const profile = profiles.find((p) => p.id === developerProfileId);
    if (!profile) {
      return {
        success: false,
        message: 'Developer profile not found',
        shortlist: null,
        shortlistItem: null
      };
    }

    const shortlist = this._getOrCreateTalentShortlistByName(shortlistName, shortlistDescription);
    const items = this._getFromStorage('talent_shortlist_items');

    let item = items.find((i) => i.shortlistId === shortlist.id && i.developerProfileId === developerProfileId);
    if (!item) {
      const now = new Date().toISOString();
      item = {
        id: this._generateId('talentShortlistItem'),
        shortlistId: shortlist.id,
        developerProfileId: developerProfileId,
        addedAt: now
      };
      items.push(item);
      this._saveToStorage('talent_shortlist_items', items);
    }

    return {
      success: true,
      message: 'Developer added to shortlist',
      shortlist: shortlist,
      shortlistItem: item
    };
  }

  // =========================
  // Interfaces: Case studies
  // =========================

  getCaseStudyFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies');
    const yearsSet = {};
    caseStudies.forEach((c) => {
      if (typeof c.year === 'number') {
        yearsSet[c.year] = true;
      }
    });
    const years = Object.keys(yearsSet)
      .map((y) => parseInt(y, 10))
      .sort((a, b) => b - a);

    return {
      industries: [
        { value: 'fintech', label: 'Fintech' },
        { value: 'ecommerce', label: 'E-commerce' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'education', label: 'Education' },
        { value: 'enterprise_software', label: 'Enterprise Software' },
        { value: 'saas', label: 'SaaS' },
        { value: 'other', label: 'Other' }
      ],
      platforms: [
        { value: 'web', label: 'Web' },
        { value: 'mobile', label: 'Mobile' },
        { value: 'desktop', label: 'Desktop' },
        { value: 'backend', label: 'Backend' },
        { value: 'multi_platform', label: 'Multi-platform' }
      ],
      years: years
    };
  }

  searchCaseStudies(industry, platform, yearFrom, yearTo, sortBy, page, pageSize) {
    const all = this._getFromStorage('case_studies');
    let list = all.slice();

    if (industry) {
      list = list.filter((c) => c.industry === industry);
    }
    if (platform) {
      list = list.filter((c) => c.platform === platform);
    }
    if (yearFrom != null) {
      list = list.filter((c) => typeof c.year === 'number' && c.year >= yearFrom);
    }
    if (yearTo != null) {
      list = list.filter((c) => typeof c.year === 'number' && c.year <= yearTo);
    }

    const sort = sortBy || 'newest';
    if (sort === 'oldest') {
      list.sort((a, b) => {
        const ay = a.year || 0;
        const by = b.year || 0;
        return ay - by;
      });
    } else {
      list.sort((a, b) => {
        const ay = a.year || 0;
        const by = b.year || 0;
        return by - ay;
      });
    }

    const total = list.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (p - 1) * ps;
    const paged = list.slice(startIndex, startIndex + ps);

    const caseStudies = paged.map((caseStudy) => ({
      caseStudy: caseStudy,
      industryLabel: this._formatCaseStudyIndustry(caseStudy.industry),
      platformLabel: this._formatCaseStudyPlatform(caseStudy.platform)
    }));

    return {
      caseStudies: caseStudies,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  getCaseStudyDetail(caseStudyId) {
    const all = this._getFromStorage('case_studies');
    const caseStudy = all.find((c) => c.id === caseStudyId) || null;
    return {
      caseStudy: caseStudy,
      industryLabel: caseStudy ? this._formatCaseStudyIndustry(caseStudy.industry) : '',
      platformLabel: caseStudy ? this._formatCaseStudyPlatform(caseStudy.platform) : ''
    };
  }

  submitCaseStudySimilarProjectRequest(caseStudyId, projectTitle, projectDescription, contactName, contactEmail) {
    const caseStudies = this._getFromStorage('case_studies');
    const caseStudy = caseStudies.find((c) => c.id === caseStudyId);
    if (!caseStudy) {
      return {
        success: false,
        message: 'Case study not found',
        request: null
      };
    }

    const requests = this._getFromStorage('case_study_similar_project_requests');
    const now = new Date().toISOString();

    const request = {
      id: this._generateId('caseStudySimilarRequest'),
      caseStudyId: caseStudyId,
      projectTitle: projectTitle,
      projectDescription: projectDescription,
      contactName: contactName,
      contactEmail: contactEmail,
      status: 'submitted',
      createdAt: now
    };

    requests.push(request);
    this._saveToStorage('case_study_similar_project_requests', requests);

    return {
      success: true,
      message: 'Similar project request submitted',
      request: request
    };
  }

  // =========================
  // Interfaces: Project cost calculator
  // =========================

  getProjectCostCalculatorOptions() {
    return {
      projectTypes: [
        { value: 'web_application', label: 'Web Application' },
        { value: 'mobile_application', label: 'Mobile Application' },
        { value: 'api_backend', label: 'API / Backend Service' },
        { value: 'desktop_application', label: 'Desktop Application' },
        { value: 'other', label: 'Other' }
      ],
      scopes: [
        { value: 'pages_1_4', label: '1–4 pages' },
        { value: 'pages_5_10', label: '5–10 pages' },
        { value: 'pages_11_20', label: '11–20 pages' },
        { value: 'custom', label: 'Custom scope' }
      ],
      timelines: [
        { value: 'one_month', label: '1 month' },
        { value: 'three_months', label: '3 months' },
        { value: 'six_months', label: '6 months' },
        { value: 'twelve_months', label: '12 months' }
      ],
      currencies: [
        { code: 'usd', label: 'USD ($)' },
        { code: 'eur', label: 'EUR (€)' },
        { code: 'gbp', label: 'GBP (£)' },
        { code: 'cad', label: 'CAD (CA$)' },
        { code: 'aud', label: 'AUD (A$)' },
        { code: 'nzd', label: 'NZD (NZ$)' },
        { code: 'inr', label: 'INR (₹)' },
        { code: 'other', label: 'Other' }
      ]
    };
  }

  calculateProjectEstimate(projectType, scope, integrationsCount, timeline, currency) {
    const estimate = this._createAndStoreProjectEstimate(
      projectType,
      scope,
      integrationsCount,
      timeline,
      currency || 'usd'
    );
    return { estimate: estimate };
  }

  sendEstimateContactRequest(estimateId, name, email, message) {
    const estimates = this._getFromStorage('project_estimates');
    let estimate = null;

    if (estimateId) {
      estimate = estimates.find((e) => e.id === estimateId) || null;
    } else if (estimates.length > 0) {
      // Most recent by createdAt
      estimate = estimates
        .slice()
        .sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        })[0];
    }

    if (!estimate) {
      return {
        success: false,
        message: 'No project estimate found to reference',
        contactRequest: null,
        estimate: null
      };
    }

    const requests = this._getFromStorage('estimate_contact_requests');
    const now = new Date().toISOString();

    const contactRequest = {
      id: this._generateId('estimateContactRequest'),
      estimateId: estimate.id,
      name: name,
      email: email,
      message: message,
      status: 'submitted',
      submittedAt: now
    };

    requests.push(contactRequest);
    this._saveToStorage('estimate_contact_requests', requests);

    // Foreign key resolution for getter-style return: include full estimate
    return {
      success: true,
      message: 'Estimate contact request submitted',
      contactRequest: contactRequest,
      estimate: estimate
    };
  }

  // =========================
  // Interfaces: Consultation / Booking
  // =========================

  getConsultationPageContent() {
    return {
      introText: 'Book a consultation to discuss your MVP, hiring plans, or product roadmap.',
      consultationTypes: [
        {
          value: 'mvp_development',
          label: 'MVP Development',
          description: 'Clarify scope, timeline, and budget for a pragmatic MVP release.'
        },
        {
          value: 'product_discovery',
          label: 'Product Discovery',
          description: 'Explore user needs, market fit, and experiment with solution ideas.'
        },
        {
          value: 'hiring_consultation',
          label: 'Hiring Consultation',
          description: 'Define roles, seniority mix, and interview process for your team.'
        },
        {
          value: 'other',
          label: 'Other',
          description: 'Discuss anything related to engineering capacity and delivery.'
        }
      ],
      defaultDurationMinutes: 60
    };
  }

  getConsultationAvailability(consultationType, weekStartDate) {
    const slots = [];
    if (!weekStartDate) {
      return { slots: slots };
    }
    const startOfWeek =
      typeof weekStartDate === 'string' && weekStartDate.length === 10 && !weekStartDate.includes('T')
        ? new Date(weekStartDate + 'T00:00:00Z')
        : new Date(weekStartDate);
    if (Number.isNaN(startOfWeek.getTime())) {
      return { slots: slots };
    }

    const defaultDuration = 60;

    for (let day = 0; day < 5; day += 1) {
      const dayDate = new Date(startOfWeek.getTime());
      dayDate.setUTCDate(dayDate.getUTCDate() + day);
      for (let hour = 9; hour <= 17; hour += 1) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = new Date(dayDate.getTime());
          slotStart.setUTCHours(hour, minute, 0, 0);
          const validation = this._validateConsultationSlot(
            consultationType,
            slotStart.toISOString(),
            defaultDuration
          );
          if (validation.valid) {
            slots.push({
              startDateTime: slotStart.toISOString(),
              durationMinutes: defaultDuration
            });
          }
        }
      }
    }

    return { slots: slots };
  }

  bookConsultation(
    consultationType,
    startDateTime,
    durationMinutes,
    name,
    email,
    company,
    roleTitle,
    notes
  ) {
    const defaultDuration = 60;
    const duration = durationMinutes || defaultDuration;
    const validation = this._validateConsultationSlot(consultationType, startDateTime, duration);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.reason || 'Slot not available',
        booking: null
      };
    }

    const bookings = this._getFromStorage('consultation_bookings');
    const now = new Date().toISOString();

    const booking = {
      id: this._generateId('consultationBooking'),
      consultationType: consultationType,
      startDateTime: startDateTime,
      durationMinutes: duration,
      name: name,
      email: email,
      company: company || '',
      roleTitle: roleTitle || '',
      notes: notes || '',
      status: 'scheduled',
      createdAt: now
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    return {
      success: true,
      message: 'Consultation booked',
      booking: booking
    };
  }

  // =========================
  // Interfaces: Static content pages
  // =========================

  getAboutPageContent() {
    return {
      mission:
        'We connect ambitious companies with vetted engineering talent and ship high-quality software with predictable delivery.',
      teamExperience:
        'Our core team has led engineering and product delivery across startups, scale-ups, and global enterprises in the US and Europe.',
      marketsServed:
        'We primarily serve clients in North America and Europe, with distributed teams across multiple time zones.',
      processOverview:
        'We start with a discovery call, propose the right engagement model, then match you with developers or assemble a delivery team. You interview the talent, we align on scope and success metrics, and then we get to work.',
      secondaryCtas: [
        { label: 'View Services', targetPage: 'services' },
        { label: 'Browse Case Studies', targetPage: 'case_studies' },
        { label: 'Book a Consultation', targetPage: 'consultation' }
      ]
    };
  }

  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01',
      contentHtml:
        '<h1>Privacy Policy</h1>' +
        '<p>We collect and process your personal data to provide recruitment and software development services.</p>' +
        '<p>Data you provide via forms (such as job applications, talent requests, and consultations) is stored securely and used only for the purposes described at the point of collection.</p>' +
        '<p>You may request access, correction, or deletion of your data at any time by contacting our support team.</p>'
    };
  }

  getTermsOfServiceContent() {
    return {
      lastUpdated: '2024-01-01',
      contentHtml:
        '<h1>Terms of Service</h1>' +
        '<p>These terms govern your use of our recruitment and software development services.</p>' +
        '<p>Candidates agree to provide accurate information in job applications. Employers agree to use candidate data solely for legitimate hiring purposes.</p>' +
        '<p>All software development engagements are governed by separate service agreements that define scope, deliverables, and payment terms.</p>'
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
