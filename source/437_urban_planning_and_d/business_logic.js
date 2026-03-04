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
    this._getSingleUserContext();
  }

  // ----------------------------
  // Initialization & Utilities
  // ----------------------------

  _initStorage() {
    const keys = [
      'services',
      'service_inquiries',
      'projects',
      'saved_projects',
      'insight_articles',
      'reading_list_items',
      'estimator_project_types',
      'estimator_configurations',
      'estimator_packages',
      'estimator_contact_requests',
      'events',
      'event_registrations',
      'offices',
      'office_contact_requests',
      'general_contact_submissions',
      'team_members',
      'meeting_requests',
      'resources',
      'resource_notes',
      'job_postings',
      'job_applications'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }

    if (localStorage.getItem('single_user_context') === null) {
      const ctx = {
        id: 'single_user',
        locale: 'en',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('single_user_context', JSON.stringify(ctx));
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
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

  _snakeToLabel(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  _compareAsc(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  _compareDesc(a, b) {
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // ----------------------------
  // Helper functions (private)
  // ----------------------------

  _getOrCreateSavedProjectsState() {
    // Ensures the saved_projects array exists and returns it
    const saved = this._getFromStorage('saved_projects', []);
    if (!Array.isArray(saved)) {
      this._saveToStorage('saved_projects', []);
      return [];
    }
    return saved;
  }

  _getOrCreateReadingListState() {
    const items = this._getFromStorage('reading_list_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('reading_list_items', []);
      return [];
    }
    return items;
  }

  _getOrCreateEstimatorConfiguration(region, projectType, siteAreaValue, siteAreaUnit, designPhases, notes) {
    // For a single-user context, maintain the latest configuration ID
    let configurations = this._getFromStorage('estimator_configurations', []);
    const configurationIdKey = 'current_estimator_configuration_id';
    const existingId = localStorage.getItem(configurationIdKey);

    let configuration = null;
    if (existingId) {
      configuration = configurations.find(function (c) { return c.id === existingId; }) || null;
    }

    if (!configuration) {
      configuration = {
        id: this._generateId('estconf'),
        region: region,
        projectType: projectType,
        siteAreaValue: siteAreaValue,
        siteAreaUnit: siteAreaUnit,
        designPhases: Array.isArray(designPhases) ? designPhases.slice() : [],
        notes: notes || '',
        selectedPackageId: null,
        createdAt: new Date().toISOString()
      };
      configurations.push(configuration);
      this._saveToStorage('estimator_configurations', configurations);
      localStorage.setItem(configurationIdKey, configuration.id);
    } else {
      // Update existing configuration with latest parameters
      configuration.region = region;
      configuration.projectType = projectType;
      configuration.siteAreaValue = siteAreaValue;
      configuration.siteAreaUnit = siteAreaUnit;
      configuration.designPhases = Array.isArray(designPhases) ? designPhases.slice() : [];
      configuration.notes = notes || '';
      this._saveToStorage('estimator_configurations', configurations);
    }

    return configuration;
  }

  _getSingleUserContext() {
    const ctx = this._getFromStorage('single_user_context', null);
    if (ctx) return ctx;
    const newCtx = {
      id: 'single_user',
      locale: 'en',
      createdAt: new Date().toISOString()
    };
    this._saveToStorage('single_user_context', newCtx);
    return newCtx;
  }

  _resolveOfficeForMember(member) {
    if (!member || !member.officeId) return member;
    const offices = this._getFromStorage('offices', []);
    const office = offices.find(function (o) { return o.id === member.officeId; }) || null;
    return Object.assign({}, member, { office: office });
  }

  _resolveResourceForNote(note) {
    if (!note || !note.resourceId) return note;
    const resources = this._getFromStorage('resources', []);
    const resource = resources.find(function (r) { return r.id === note.resourceId; }) || null;
    return Object.assign({}, note, { resource: resource });
  }

  // ----------------------------
  // Homepage & Static Content
  // ----------------------------

  getHomepageContent() {
    const services = this._getFromStorage('services', []);
    const projects = this._getFromStorage('projects', []);
    const articles = this._getFromStorage('insight_articles', []);
    const events = this._getFromStorage('events', []);

    const featuredServices = services.filter(function (s) { return !!s.isFeatured; });
    const featuredProjects = projects.filter(function (p) { return !!p.isFeatured; });
    const featuredArticles = articles.filter(function (a) { return !!a.isFeatured && a.status === 'published'; });

    const now = new Date();
    const upcomingCommunityEngagementWebinars = events
      .filter(function (e) {
        if (e.eventType !== 'webinar') return false;
        if (e.topic !== 'community_engagement') return false;
        if (e.registrationStatus !== 'open') return false;
        const d = new Date(e.startDateTime);
        if (isNaN(d.getTime())) return false;
        return d >= now;
      })
      .sort(function (a, b) {
        return new Date(a.startDateTime) - new Date(b.startDateTime);
      });

    return {
      heroTitle: 'Urban planning & design for people-first cities',
      heroSubtitle: 'Independent consultancy specializing in streetscapes, transit-oriented development, and community-led urbanism.',
      focusAreas: [
        {
          title: 'Streetscapes & Public Realm',
          description: 'Designing safe, vibrant streets and plazas with a people-first approach.'
        },
        {
          title: 'Transit-Oriented Development',
          description: 'Integrating housing, mobility, and public space around high-capacity transit.'
        },
        {
          title: 'Community Engagement',
          description: 'Co-creating plans with residents, businesses, and local institutions.'
        }
      ],
      featuredServices: featuredServices,
      featuredProjects: featuredProjects,
      featuredArticles: featuredArticles,
      upcomingCommunityEngagementWebinars: upcomingCommunityEngagementWebinars,
      estimatorHighlight: {
        title: 'Estimate project fees in minutes',
        blurb: 'Use our project estimator to explore fee ranges for streetscapes, masterplans, and transit-oriented developments.'
      }
    };
  }

  getAboutPageContent() {
    return {
      mission: 'We help cities, transit agencies, and communities design streets, districts, and public spaces that are safe, inclusive, and climate-resilient.',
      values: [
        'People-first design',
        'Evidence-based decisions',
        'Meaningful community engagement',
        'Interdisciplinary collaboration'
      ],
      expertiseHighlights: [
        'Streetscapes and public realm frameworks',
        'Transit-oriented development masterplanning',
        'Tactical urbanism pilots and evaluation',
        'Community engagement strategies and facilitation'
      ],
      leadershipSummary: 'Our team combines experience in urban planning, design, transport, and public policy across cities in North America, Europe, and beyond.'
    };
  }

  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01T00:00:00Z',
      content: 'This website collects only the information you choose to submit via forms (such as contact details and project information). We use this data solely to respond to your inquiries, evaluate potential projects, and improve our services. We do not sell your personal data. You may request deletion of your data at any time by contacting us via the general contact form.'
    };
  }

  getTermsOfUseContent() {
    return {
      lastUpdated: '2024-01-01T00:00:00Z',
      content: 'By using this website, you agree to use the content for informational purposes only and not as professional advice. All case studies and tools are provided “as is” without warranty. Project estimations are indicative and do not constitute a binding fee proposal. Use of any downloadable resources is subject to applicable licenses indicated within those documents.'
    };
  }

  // ----------------------------
  // Services & Service Inquiries
  // ----------------------------

  getServicesOverview() {
    const services = this._getFromStorage('services', []);
    return services;
  }

  getServiceDetail(serviceSlug) {
    const services = this._getFromStorage('services', []);
    const projects = this._getFromStorage('projects', []);

    const service = services.find(function (s) { return s.slug === serviceSlug; }) || null;
    if (!service) {
      return {
        service: null,
        relatedProjects: [],
        typicalClients: []
      };
    }

    const relatedProjects = projects.filter(function (p) {
      return Array.isArray(p.relatedServiceIds) && p.relatedServiceIds.indexOf(service.id) !== -1;
    });

    const typicalClients = [];
    return {
      service: service,
      relatedProjects: relatedProjects,
      typicalClients: typicalClients
    };
  }

  submitServiceInquiry(
    serviceId,
    budgetRange,
    budgetMin,
    budgetMax,
    budgetCurrency,
    preferredStartDate,
    projectDescription,
    clientName,
    clientEmail,
    clientOrganization
  ) {
    const services = this._getFromStorage('services', []);
    const inquiries = this._getFromStorage('service_inquiries', []);

    const service = services.find(function (s) { return s.id === serviceId; }) || null;
    if (!service) {
      return {
        success: false,
        inquiry: null,
        message: 'Service not found.'
      };
    }

    const inquiry = {
      id: this._generateId('serviceinq'),
      serviceId: serviceId,
      serviceNameSnapshot: service.name,
      budgetRange: budgetRange,
      budgetMin: typeof budgetMin === 'number' ? budgetMin : null,
      budgetMax: typeof budgetMax === 'number' ? budgetMax : null,
      budgetCurrency: budgetCurrency,
      preferredStartDate: preferredStartDate,
      projectDescription: projectDescription,
      clientName: clientName,
      clientEmail: clientEmail,
      clientOrganization: clientOrganization || null,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };

    inquiries.push(inquiry);
    this._saveToStorage('service_inquiries', inquiries);

    return {
      success: true,
      inquiry: inquiry,
      message: 'Service inquiry submitted.'
    };
  }

  // ----------------------------
  // Projects & Saved Projects
  // ----------------------------

  getProjectsFilterOptions() {
    const projects = this._getFromStorage('projects', []);

    const typologySet = {};
    const regionSet = {};
    const sectorSet = {};
    let minYear = null;
    let maxYear = null;

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      if (p.typology) typologySet[p.typology] = true;
      if (p.region) regionSet[p.region] = true;
      if (p.sector) sectorSet[p.sector] = true;
      if (typeof p.completionYear === 'number') {
        if (minYear === null || p.completionYear < minYear) minYear = p.completionYear;
        if (maxYear === null || p.completionYear > maxYear) maxYear = p.completionYear;
      }
    }

    const typologyOptions = Object.keys(typologySet).map(function (value) {
      return { value: value, label: value ? value.split('_').map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); }).join(' ') : '' };
    });

    const regionOptions = Object.keys(regionSet).map(function (value) {
      return { value: value, label: value ? value.split('_').map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); }).join(' ') : '' };
    });

    const sectorOptions = Object.keys(sectorSet);

    const sortOptions = [
      { value: 'completion_year_desc', label: 'Completion Year – Newest First' },
      { value: 'completion_year_asc', label: 'Completion Year – Oldest First' },
      { value: 'title_asc', label: 'Title A–Z' },
      { value: 'title_desc', label: 'Title Z–A' }
    ];

    return {
      typologyOptions: typologyOptions,
      regionOptions: regionOptions,
      sectorOptions: sectorOptions,
      sortOptions: sortOptions,
      completionYearRange: {
        min: minYear,
        max: maxYear
      }
    };
  }

  searchProjects(
    query,
    typology,
    region,
    sector,
    minCompletionYear,
    maxCompletionYear,
    sortBy,
    page,
    pageSize
  ) {
    const projects = this._getFromStorage('projects', []);
    const q = (query || '').trim().toLowerCase();
    const typ = typology || null;
    const reg = region || null;
    const sec = sector || null;
    const minYear = typeof minCompletionYear === 'number' ? minCompletionYear : null;
    const maxYear = typeof maxCompletionYear === 'number' ? maxCompletionYear : null;
    const sortKey = sortBy || 'completion_year_desc';
    const pg = page || 1;
    const size = pageSize || 20;

    let filtered = projects.filter(function (p) {
      if (typ && p.typology !== typ) return false;
      if (reg && p.region !== reg) return false;
      if (sec && p.sector !== sec) return false;
      if (minYear !== null && typeof p.completionYear === 'number' && p.completionYear < minYear) return false;
      if (maxYear !== null && typeof p.completionYear === 'number' && p.completionYear > maxYear) return false;
      if (q) {
        const textParts = [p.title, p.summary];
        if (Array.isArray(p.tags)) {
          for (let t = 0; t < p.tags.length; t++) {
            textParts.push(String(p.tags[t]));
          }
        }
        const combined = textParts.filter(Boolean).join(' ').toLowerCase();
        if (combined.indexOf(q) === -1) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'completion_year_asc':
          return this._compareAsc(a.completionYear || 0, b.completionYear || 0);
        case 'title_asc':
          return this._compareAsc((a.title || '').toLowerCase(), (b.title || '').toLowerCase());
        case 'title_desc':
          return this._compareDesc((a.title || '').toLowerCase(), (b.title || '').toLowerCase());
        case 'completion_year_desc':
        default:
          return this._compareDesc(a.completionYear || 0, b.completionYear || 0);
      }
    });

    const total = filtered.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const results = filtered.slice(start, end);

    return {
      results: results,
      total: total,
      page: pg,
      pageSize: size
    };
  }

  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects', []);
    const saved = this._getFromStorage('saved_projects', []);

    const project = projects.find(function (p) { return p.id === projectId; }) || null;
    const isSavedToShortlist = !!saved.find(function (s) { return s.projectId === projectId; });

    // Instrumentation for task completion tracking
    try {
      const lastShortlistViewedAt = localStorage.getItem('task2_lastShortlistViewedAt');
      if (lastShortlistViewedAt && isSavedToShortlist) {
        localStorage.setItem(
          'task2_lastShortlistProjectOpened',
          JSON.stringify({ projectId: projectId, openedAt: new Date().toISOString() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      project: project,
      isSavedToShortlist: isSavedToShortlist
    };
  }

  saveProjectToShortlist(projectId) {
    const projects = this._getFromStorage('projects', []);
    const saved = this._getOrCreateSavedProjectsState();

    const project = projects.find(function (p) { return p.id === projectId; }) || null;
    if (!project) {
      return {
        success: false,
        savedProject: null,
        message: 'Project not found.'
      };
    }

    const existing = saved.find(function (s) { return s.projectId === projectId; });
    if (existing) {
      return {
        success: true,
        savedProject: existing,
        message: 'Project already in shortlist.'
      };
    }

    const savedProject = {
      id: this._generateId('savedproj'),
      projectId: projectId,
      savedAt: new Date().toISOString()
    };

    saved.push(savedProject);
    this._saveToStorage('saved_projects', saved);

    return {
      success: true,
      savedProject: savedProject,
      message: 'Project saved to shortlist.'
    };
  }

  getSavedProjects() {
    const saved = this._getOrCreateSavedProjectsState();
    const projects = this._getFromStorage('projects', []);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task2_lastShortlistViewedAt', new Date().toISOString());
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return saved.map(function (s) {
      const project = projects.find(function (p) { return p.id === s.projectId; }) || null;
      return {
        savedProjectId: s.id,
        savedAt: s.savedAt,
        project: project
      };
    });
  }

  removeSavedProject(savedProjectId) {
    let saved = this._getOrCreateSavedProjectsState();
    const initialLength = saved.length;
    saved = saved.filter(function (s) { return s.id !== savedProjectId; });
    this._saveToStorage('saved_projects', saved);

    return {
      success: saved.length < initialLength
    };
  }

  // ----------------------------
  // Insights & Reading List
  // ----------------------------

  getInsightsFilterOptions() {
    const articles = this._getFromStorage('insight_articles', []);
    const topicSet = {};

    for (let i = 0; i < articles.length; i++) {
      const t = articles[i].primaryTopic;
      if (t) topicSet[t] = true;
    }

    const topicOptions = Object.keys(topicSet).map((value) => ({
      value: value,
      label: this._snakeToLabel(value)
    }));

    const readingTimeOptions = [
      { value: 'under_5', label: 'Under 5 minutes', maxMinutes: 5 },
      { value: 'under_10', label: 'Under 10 minutes', maxMinutes: 10 },
      { value: 'under_15', label: 'Under 15 minutes', maxMinutes: 15 }
    ];

    const sortOptions = [
      { value: 'newest', label: 'Newest first' },
      { value: 'oldest', label: 'Oldest first' },
      { value: 'reading_time_asc', label: 'Shortest reading time' }
    ];

    return {
      topicOptions: topicOptions,
      readingTimeOptions: readingTimeOptions,
      sortOptions: sortOptions
    };
  }

  searchInsightArticles(
    query,
    primaryTopic,
    minPublicationDate,
    maxPublicationDate,
    maxReadingTimeMinutes,
    sortBy,
    page,
    pageSize
  ) {
    const articles = this._getFromStorage('insight_articles', []);
    const q = (query || '').trim().toLowerCase();
    const topic = primaryTopic || null;
    const minDate = this._parseDate(minPublicationDate || null);
    const maxDate = this._parseDate(maxPublicationDate || null);
    const maxReading = typeof maxReadingTimeMinutes === 'number' ? maxReadingTimeMinutes : null;
    const sortKey = sortBy || 'newest';
    const pg = page || 1;
    const size = pageSize || 20;

    let filtered = articles.filter((a) => {
      if (a.status !== 'published') return false;
      if (topic && a.primaryTopic !== topic) return false;
      if (maxReading !== null && typeof a.readingTimeMinutes === 'number' && a.readingTimeMinutes > maxReading) return false;

      if (minDate || maxDate) {
        const pubDate = this._parseDate(a.publicationDate);
        if (!pubDate) return false;
        if (minDate && pubDate < minDate) return false;
        if (maxDate && pubDate > maxDate) return false;
      }

      if (q) {
        const textParts = [a.title, a.summary, a.content];
        if (Array.isArray(a.tags)) {
          for (let t = 0; t < a.tags.length; t++) textParts.push(String(a.tags[t]));
        }
        const combined = textParts.filter(Boolean).join(' ').toLowerCase();
        if (combined.indexOf(q) === -1) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'oldest':
          return this._compareAsc(
            this._parseDate(a.publicationDate) ? this._parseDate(a.publicationDate).getTime() : 0,
            this._parseDate(b.publicationDate) ? this._parseDate(b.publicationDate).getTime() : 0
          );
        case 'reading_time_asc':
          return this._compareAsc(a.readingTimeMinutes || 0, b.readingTimeMinutes || 0);
        case 'newest':
        default:
          return this._compareDesc(
            this._parseDate(a.publicationDate) ? this._parseDate(a.publicationDate).getTime() : 0,
            this._parseDate(b.publicationDate) ? this._parseDate(b.publicationDate).getTime() : 0
          );
      }
    });

    const total = filtered.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const results = filtered.slice(start, end);

    return {
      results: results,
      total: total,
      page: pg,
      pageSize: size
    };
  }

  getInsightArticleDetail(articleId) {
    const articles = this._getFromStorage('insight_articles', []);
    const readingList = this._getOrCreateReadingListState();

    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    const isSavedToReadingList = !!readingList.find(function (r) { return r.articleId === articleId; });

    // Instrumentation for task completion tracking
    try {
      const lastReadingListViewedAt = localStorage.getItem('task3_lastReadingListViewedAt');
      if (lastReadingListViewedAt && isSavedToReadingList) {
        localStorage.setItem(
          'task3_lastReadingListArticleOpened',
          JSON.stringify({ articleId: articleId, openedAt: new Date().toISOString() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article: article,
      isSavedToReadingList: isSavedToReadingList
    };
  }

  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('insight_articles', []);
    const readingList = this._getOrCreateReadingListState();

    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    if (!article) {
      return {
        success: false,
        item: null,
        message: 'Article not found.'
      };
    }

    const existing = readingList.find(function (r) { return r.articleId === articleId; });
    if (existing) {
      return {
        success: true,
        item: existing,
        message: 'Article already in reading list.'
      };
    }

    const item = {
      id: this._generateId('readitem'),
      articleId: articleId,
      savedAt: new Date().toISOString()
    };

    readingList.push(item);
    this._saveToStorage('reading_list_items', readingList);

    return {
      success: true,
      item: item,
      message: 'Article saved to reading list.'
    };
  }

  getReadingList() {
    const readingList = this._getOrCreateReadingListState();
    const articles = this._getFromStorage('insight_articles', []);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task3_lastReadingListViewedAt', new Date().toISOString());
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return readingList.map(function (item) {
      const article = articles.find(function (a) { return a.id === item.articleId; }) || null;
      return {
        readingListItemId: item.id,
        savedAt: item.savedAt,
        article: article
      };
    });
  }

  removeReadingListItem(readingListItemId) {
    let readingList = this._getOrCreateReadingListState();
    const initialLength = readingList.length;
    readingList = readingList.filter(function (i) { return i.id !== readingListItemId; });
    this._saveToStorage('reading_list_items', readingList);

    return {
      success: readingList.length < initialLength
    };
  }

  // ----------------------------
  // Estimator
  // ----------------------------

  getEstimatorProjectTypes() {
    const types = this._getFromStorage('estimator_project_types', []);
    return types.filter(function (t) { return t.isActive !== false; });
  }

  runProjectEstimator(
    region,
    projectType,
    siteAreaValue,
    siteAreaUnit,
    designPhases,
    notes
  ) {
    const configuration = this._getOrCreateEstimatorConfiguration(
      region,
      projectType,
      siteAreaValue,
      siteAreaUnit,
      designPhases,
      notes
    );

    let packages = this._getFromStorage('estimator_packages', []);
    // Remove any existing packages for this configuration
    packages = packages.filter(function (p) { return p.configurationId !== configuration.id; });

    // Simple fee estimation logic (purely indicative)
    const baseRatePerHectare = 8000; // arbitrary indicative rate
    const regionMultiplierMap = {
      north_america: 1.0,
      europe: 1.1,
      asia_pacific: 0.9,
      latin_america: 0.85,
      middle_east_africa: 0.95,
      global: 1.0
    };
    const regionMultiplier = regionMultiplierMap[region] || 1.0;

    const phaseCount = Array.isArray(designPhases) ? designPhases.length : 0;
    const phaseMultiplier = 1 + phaseCount * 0.2; // each phase adds 20%

    const baseFee = (siteAreaValue || 0) * baseRatePerHectare * regionMultiplier * phaseMultiplier;

    const pkgDefs = [
      { name: 'basic', multiplier: 0.8, description: 'Core scope for concept-level deliverables.' },
      { name: 'standard', multiplier: 1.0, description: 'Balanced package for most masterplans.' },
      { name: 'premium', multiplier: 1.3, description: 'Enhanced scope with additional analysis and workshops.' }
    ];

    const newPackages = [];
    for (let i = 0; i < pkgDefs.length; i++) {
      const def = pkgDefs[i];
      const pkg = {
        id: this._generateId('estpkg'),
        configurationId: configuration.id,
        name: def.name,
        description: def.description,
        totalFee: Math.round(baseFee * def.multiplier),
        currency: 'usd',
        isEligibleUnderBudget: null,
        isSelected: false
      };
      newPackages.push(pkg);
      packages.push(pkg);
    }

    this._saveToStorage('estimator_packages', packages);

    const enrichedPackages = newPackages.map(function (p) {
      return Object.assign({}, p, { configuration: configuration });
    });

    return {
      configuration: configuration,
      packages: enrichedPackages
    };
  }

  selectEstimatorPackage(configurationId, packageId) {
    const configurations = this._getFromStorage('estimator_configurations', []);
    let packages = this._getFromStorage('estimator_packages', []);

    const configuration = configurations.find(function (c) { return c.id === configurationId; }) || null;
    if (!configuration) {
      return {
        configuration: null,
        selectedPackage: null,
        success: false
      };
    }

    // Update selection flags
    packages = packages.map(function (p) {
      if (p.configurationId === configurationId) {
        return Object.assign({}, p, { isSelected: p.id === packageId });
      }
      return p;
    });

    const selectedPackage = packages.find(function (p) { return p.id === packageId && p.configurationId === configurationId; }) || null;

    configuration.selectedPackageId = selectedPackage ? selectedPackage.id : null;

    this._saveToStorage('estimator_packages', packages);
    this._saveToStorage('estimator_configurations', configurations);

    const enrichedConfiguration = Object.assign({}, configuration, {
      selectedPackage: selectedPackage
    });

    const enrichedPackage = selectedPackage
      ? Object.assign({}, selectedPackage, { configuration: configuration })
      : null;

    return {
      configuration: enrichedConfiguration,
      selectedPackage: enrichedPackage,
      success: !!selectedPackage
    };
  }

  submitEstimatorContactRequest(
    configurationId,
    selectedPackageId,
    clientName,
    clientOrganization,
    clientEmail,
    message
  ) {
    const configurations = this._getFromStorage('estimator_configurations', []);
    const packages = this._getFromStorage('estimator_packages', []);
    const contactRequests = this._getFromStorage('estimator_contact_requests', []);

    const configuration = configurations.find(function (c) { return c.id === configurationId; }) || null;
    const selectedPackage = packages.find(function (p) { return p.id === selectedPackageId; }) || null;

    if (!configuration || !selectedPackage) {
      return {
        success: false,
        contactRequest: null,
        message: 'Configuration or package not found.'
      };
    }

    const contactRequest = {
      id: this._generateId('estcontact'),
      configurationId: configurationId,
      selectedPackageId: selectedPackageId,
      clientName: clientName,
      clientOrganization: clientOrganization || null,
      clientEmail: clientEmail,
      message: message || '',
      status: 'submitted',
      createdAt: new Date().toISOString()
    };

    contactRequests.push(contactRequest);
    this._saveToStorage('estimator_contact_requests', contactRequests);

    const enrichedContactRequest = Object.assign({}, contactRequest, {
      configuration: configuration,
      selectedPackage: selectedPackage
    });

    return {
      success: true,
      contactRequest: enrichedContactRequest,
      message: 'Estimator contact request submitted.'
    };
  }

  // ----------------------------
  // Events & Registrations
  // ----------------------------

  getEventsFilterOptions() {
    const eventTypeOptions = [
      { value: 'webinar', label: 'Webinar' },
      { value: 'in_person', label: 'In-person' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'workshop', label: 'Workshop' }
    ];

    const topicOptions = [
      { value: 'community_engagement', label: 'Community Engagement' },
      { value: 'transport_mobility', label: 'Transport & Mobility' },
      { value: 'streetscapes_public_realm', label: 'Streetscapes & Public Realm' },
      { value: 'tactical_urbanism', label: 'Tactical Urbanism' },
      { value: 'policy_governance', label: 'Policy & Governance' },
      { value: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { value: 'start_datetime_asc', label: 'Date – Earliest First' },
      { value: 'start_datetime_desc', label: 'Date – Latest First' }
    ];

    return {
      eventTypeOptions: eventTypeOptions,
      topicOptions: topicOptions,
      sortOptions: sortOptions
    };
  }

  searchEvents(
    eventType,
    topic,
    startDate,
    endDate,
    includePastEvents,
    sortBy,
    page,
    pageSize
  ) {
    const events = this._getFromStorage('events', []);
    const type = eventType || null;
    const top = topic || null;
    const start = this._parseDate(startDate || null);
    const end = this._parseDate(endDate || null);
    const includePast = !!includePastEvents;
    const sortKey = sortBy || 'start_datetime_asc';
    const pg = page || 1;
    const size = pageSize || 20;

    const now = new Date();

    let filtered = events.filter((e) => {
      if (type && e.eventType !== type) return false;
      if (top && e.topic !== top) return false;

      const d = this._parseDate(e.startDateTime);
      if (!d) return false;

      if (start && d < start) return false;
      if (end && d > end) return false;
      if (!includePast && d < now) return false;

      return true;
    });

    filtered.sort((a, b) => {
      const da = this._parseDate(a.startDateTime);
      const db = this._parseDate(b.startDateTime);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      if (sortKey === 'start_datetime_desc') {
        return this._compareDesc(ta, tb);
      }
      return this._compareAsc(ta, tb);
    });

    const total = filtered.length;
    const startIndex = (pg - 1) * size;
    const endIndex = startIndex + size;
    const results = filtered.slice(startIndex, endIndex);

    return {
      results: results,
      total: total,
      page: pg,
      pageSize: size
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(function (e) { return e.id === eventId; }) || null;
    return { event: event };
  }

  registerForEvent(eventId, attendeeName, attendeeEmail, attendeeOrganization, role) {
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const event = events.find(function (e) { return e.id === eventId; }) || null;
    if (!event) {
      return {
        registration: null,
        success: false,
        message: 'Event not found.'
      };
    }

    const registration = {
      id: this._generateId('eventreg'),
      eventId: eventId,
      attendeeName: attendeeName,
      attendeeEmail: attendeeEmail,
      attendeeOrganization: attendeeOrganization || null,
      role: role,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    const enrichedRegistration = Object.assign({}, registration, { event: event });

    return {
      registration: enrichedRegistration,
      success: true,
      message: 'Event registration submitted.'
    };
  }

  // ----------------------------
  // Team & Meeting Requests
  // ----------------------------

  getTeamFilterOptions() {
    const disciplineOptions = [
      { value: 'urban_design', label: 'Urban Design' },
      { value: 'urban_planning', label: 'Urban Planning' },
      { value: 'transport_planning', label: 'Transport Planning' },
      { value: 'landscape_architecture', label: 'Landscape Architecture' },
      { value: 'architecture', label: 'Architecture' },
      { value: 'community_engagement', label: 'Community Engagement' },
      { value: 'management', label: 'Management' },
      { value: 'operations', label: 'Operations' },
      { value: 'other', label: 'Other' }
    ];

    const specializationOptions = [
      { value: 'transit_and_mobility', label: 'Transit & Mobility' },
      { value: 'tactical_urbanism', label: 'Tactical Urbanism' },
      { value: 'public_space_design', label: 'Public Space Design' },
      { value: 'community_engagement', label: 'Community Engagement' },
      { value: 'land_use_planning', label: 'Land Use Planning' },
      { value: 'housing', label: 'Housing' },
      { value: 'policy_research', label: 'Policy & Research' },
      { value: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { value: 'experience_desc', label: 'Experience – High to Low' },
      { value: 'experience_asc', label: 'Experience – Low to High' },
      { value: 'name_asc', label: 'Name A–Z' }
    ];

    return {
      disciplineOptions: disciplineOptions,
      specializationOptions: specializationOptions,
      sortOptions: sortOptions
    };
  }

  searchTeamMembers(
    discipline,
    specialization,
    officeId,
    sortBy,
    page,
    pageSize
  ) {
    const members = this._getFromStorage('team_members', []);
    const disc = discipline || null;
    const spec = specialization || null;
    const office = officeId || null;
    const sortKey = sortBy || 'experience_desc';
    const pg = page || 1;
    const size = pageSize || 50;

    let filtered = members.filter(function (m) {
      if (disc && m.discipline !== disc) return false;
      if (spec && m.specialization !== spec) return false;
      if (office && m.officeId !== office) return false;
      return true;
    });

    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'experience_asc':
          return this._compareAsc(a.yearsOfExperience || 0, b.yearsOfExperience || 0);
        case 'name_asc':
          return this._compareAsc((a.name || '').toLowerCase(), (b.name || '').toLowerCase());
        case 'experience_desc':
        default:
          return this._compareDesc(a.yearsOfExperience || 0, b.yearsOfExperience || 0);
      }
    });

    const total = filtered.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end).map((m) => this._resolveOfficeForMember(m));

    return {
      results: pageItems,
      total: total,
      page: pg,
      pageSize: size
    };
  }

  getTeamMemberProfile(memberId) {
    const members = this._getFromStorage('team_members', []);
    const member = members.find(function (m) { return m.id === memberId; }) || null;
    const enriched = this._resolveOfficeForMember(member);
    return {
      member: enriched
    };
  }

  submitMeetingRequest(
    teamMemberId,
    meetingType,
    meetingDateTime,
    requesterName,
    requesterEmail,
    message
  ) {
    const members = this._getFromStorage('team_members', []);
    const meetingRequests = this._getFromStorage('meeting_requests', []);

    const member = members.find(function (m) { return m.id === teamMemberId; }) || null;
    if (!member) {
      return {
        meetingRequest: null,
        success: false,
        message: 'Team member not found.'
      };
    }

    const meetingRequest = {
      id: this._generateId('meetreq'),
      teamMemberId: teamMemberId,
      meetingType: meetingType,
      meetingDateTime: meetingDateTime,
      requesterName: requesterName,
      requesterEmail: requesterEmail,
      message: message || '',
      status: 'submitted',
      createdAt: new Date().toISOString()
    };

    meetingRequests.push(meetingRequest);
    this._saveToStorage('meeting_requests', meetingRequests);

    const enrichedMeetingRequest = Object.assign({}, meetingRequest, {
      teamMember: member
    });

    return {
      meetingRequest: enrichedMeetingRequest,
      success: true,
      message: 'Meeting request submitted.'
    };
  }

  // ----------------------------
  // Resources & Resource Notes
  // ----------------------------

  getResourcesFilterOptions() {
    const resources = this._getFromStorage('resources', []);

    const contentTypeSet = {};
    const yearSet = {};

    for (let i = 0; i < resources.length; i++) {
      const r = resources[i];
      if (r.contentType) contentTypeSet[r.contentType] = true;
      if (typeof r.publicationYear === 'number') yearSet[r.publicationYear] = true;
    }

    const contentTypeOptions = Object.keys(contentTypeSet).map((value) => ({
      value: value,
      label: this._snakeToLabel(value)
    }));

    const yearOptions = Object.keys(yearSet)
      .map(function (y) { return parseInt(y, 10); })
      .filter(function (n) { return !isNaN(n); })
      .sort(function (a, b) { return a - b; });

    const sortOptions = [
      { value: 'publication_year_desc', label: 'Publication Year – Newest First' },
      { value: 'publication_year_asc', label: 'Publication Year – Oldest First' },
      { value: 'page_count_desc', label: 'Pages – High to Low' },
      { value: 'page_count_asc', label: 'Pages – Low to High' }
    ];

    return {
      contentTypeOptions: contentTypeOptions,
      yearOptions: yearOptions,
      sortOptions: sortOptions
    };
  }

  searchResources(
    query,
    contentType,
    minPublicationYear,
    maxPublicationYear,
    minPageCount,
    sortBy,
    page,
    pageSize
  ) {
    const resources = this._getFromStorage('resources', []);
    const q = (query || '').trim().toLowerCase();
    const ctype = contentType || null;
    const minYear = typeof minPublicationYear === 'number' ? minPublicationYear : null;
    const maxYear = typeof maxPublicationYear === 'number' ? maxPublicationYear : null;
    const minPages = typeof minPageCount === 'number' ? minPageCount : null;
    const sortKey = sortBy || 'publication_year_desc';
    const pg = page || 1;
    const size = pageSize || 20;

    let filtered = resources.filter((r) => {
      if (ctype && r.contentType !== ctype) return false;
      if (minYear !== null && typeof r.publicationYear === 'number' && r.publicationYear < minYear) return false;
      if (maxYear !== null && typeof r.publicationYear === 'number' && r.publicationYear > maxYear) return false;
      if (minPages !== null && typeof r.pageCount === 'number' && r.pageCount < minPages) return false;

      if (q) {
        const textParts = [r.title, r.summary, r.description];
        if (Array.isArray(r.tags)) {
          for (let t = 0; t < r.tags.length; t++) textParts.push(String(r.tags[t]));
        }
        const combined = textParts.filter(Boolean).join(' ').toLowerCase();
        if (combined.indexOf(q) === -1) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'publication_year_asc':
          return this._compareAsc(a.publicationYear || 0, b.publicationYear || 0);
        case 'page_count_desc':
          return this._compareDesc(a.pageCount || 0, b.pageCount || 0);
        case 'page_count_asc':
          return this._compareAsc(a.pageCount || 0, b.pageCount || 0);
        case 'publication_year_desc':
        default:
          return this._compareDesc(a.publicationYear || 0, b.publicationYear || 0);
      }
    });

    const total = filtered.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const results = filtered.slice(start, end);

    return {
      results: results,
      total: total,
      page: pg,
      pageSize: size
    };
  }

  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources', []);
    const notes = this._getFromStorage('resource_notes', []);

    const resource = resources.find(function (r) { return r.id === resourceId; }) || null;
    const resourceNotes = notes
      .filter(function (n) { return n.resourceId === resourceId; })
      .map((n) => this._resolveResourceForNote(n));

    return {
      resource: resource,
      notes: resourceNotes
    };
  }

  addResourceNote(resourceId, content) {
    const resources = this._getFromStorage('resources', []);
    const notes = this._getFromStorage('resource_notes', []);

    const resource = resources.find(function (r) { return r.id === resourceId; }) || null;
    if (!resource) {
      return {
        note: null,
        success: false
      };
    }

    const note = {
      id: this._generateId('resnote'),
      resourceId: resourceId,
      content: content,
      createdAt: new Date().toISOString()
    };

    notes.push(note);
    this._saveToStorage('resource_notes', notes);

    const enrichedNote = this._resolveResourceForNote(note);

    return {
      note: enrichedNote,
      success: true
    };
  }

  // ----------------------------
  // Careers & Job Applications
  // ----------------------------

  getCareersFilterOptions() {
    const locationOptions = [
      { value: 'new_york', label: 'New York' },
      { value: 'berlin', label: 'Berlin' },
      { value: 'london', label: 'London' },
      { value: 'paris', label: 'Paris' },
      { value: 'remote', label: 'Remote' },
      { value: 'other', label: 'Other' }
    ];

    const roleCategoryOptions = [
      { value: 'urban_planner', label: 'Urban Planner' },
      { value: 'urban_designer', label: 'Urban Designer' },
      { value: 'transport_planner', label: 'Transport Planner' },
      { value: 'landscape_architect', label: 'Landscape Architect' },
      { value: 'operations', label: 'Operations' },
      { value: 'communications', label: 'Communications' },
      { value: 'other', label: 'Other' }
    ];

    const experienceRangeOptions = [
      { value: '0_2_years', label: '0–2 years' },
      { value: '3_5_years', label: '3–5 years' },
      { value: '6_10_years', label: '6–10 years' },
      { value: '10_plus_years', label: '10+ years' }
    ];

    return {
      locationOptions: locationOptions,
      roleCategoryOptions: roleCategoryOptions,
      experienceRangeOptions: experienceRangeOptions
    };
  }

  searchJobPostings(locationKey, roleCategory, experienceRange, onlyActive) {
    const jobs = this._getFromStorage('job_postings', []);
    const loc = locationKey || null;
    const role = roleCategory || null;
    const exp = experienceRange || null;
    const activeOnly = onlyActive !== false; // default true

    return jobs.filter(function (j) {
      if (activeOnly && j.isActive === false) return false;
      if (loc && j.locationKey !== loc) return false;
      if (role && j.roleCategory !== role) return false;
      if (exp && j.experienceRange !== exp) return false;
      return true;
    });
  }

  getJobPostingDetail(jobId) {
    const jobs = this._getFromStorage('job_postings', []);
    const job = jobs.find(function (j) { return j.id === jobId; }) || null;
    return { job: job };
  }

  submitJobApplication(
    jobId,
    fullName,
    email,
    phone,
    experienceRange,
    coverLetterText,
    portfolioUrl
  ) {
    const jobs = this._getFromStorage('job_postings', []);
    const applications = this._getFromStorage('job_applications', []);

    const job = jobs.find(function (j) { return j.id === jobId; }) || null;
    if (!job) {
      return {
        application: null,
        success: false,
        message: 'Job not found.'
      };
    }

    const application = {
      id: this._generateId('jobapp'),
      jobId: jobId,
      fullName: fullName,
      email: email,
      phone: phone,
      experienceRange: experienceRange,
      coverLetterText: coverLetterText,
      portfolioUrl: portfolioUrl || null,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };

    applications.push(application);
    this._saveToStorage('job_applications', applications);

    const enrichedApplication = Object.assign({}, application, { job: job });

    return {
      application: enrichedApplication,
      success: true,
      message: 'Job application submitted.'
    };
  }

  // ----------------------------
  // Contact & Offices
  // ----------------------------

  getContactPageConfig() {
    const inquiryTypeOptions = [
      { value: 'general_inquiry', label: 'General inquiry' },
      { value: 'new_project', label: 'New project' },
      { value: 'media', label: 'Media' },
      { value: 'careers', label: 'Careers' },
      { value: 'other', label: 'Other' }
    ];

    const officeRegionOptions = [
      { value: 'north_america', label: 'North America' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia_pacific', label: 'Asia Pacific' },
      { value: 'latin_america', label: 'Latin America' },
      { value: 'middle_east_africa', label: 'Middle East & Africa' }
    ];

    const generalContactIntro = 'Use this form for general questions. For office-specific requests, select an office in the Offices tab.';

    return {
      inquiryTypeOptions: inquiryTypeOptions,
      officeRegionOptions: officeRegionOptions,
      generalContactIntro: generalContactIntro
    };
  }

  submitGeneralContactSubmission(
    inquiryType,
    name,
    email,
    organization,
    message
  ) {
    const submissions = this._getFromStorage('general_contact_submissions', []);

    const submission = {
      id: this._generateId('gencontact'),
      inquiryType: inquiryType,
      name: name,
      email: email,
      organization: organization || null,
      message: message,
      createdAt: new Date().toISOString(),
      status: 'submitted'
    };

    submissions.push(submission);
    this._saveToStorage('general_contact_submissions', submissions);

    return {
      submission: submission,
      success: true
    };
  }

  getOfficesByRegion(region) {
    const offices = this._getFromStorage('offices', []);
    if (!region) return offices;
    return offices.filter(function (o) { return o.region === region; });
  }

  getOfficeDetail(officeId) {
    const offices = this._getFromStorage('offices', []);
    const office = offices.find(function (o) { return o.id === officeId; }) || null;
    return { office: office };
  }

  submitOfficeContactRequest(
    officeId,
    inquiryType,
    preferredMonth,
    message,
    requesterName,
    requesterEmail,
    requesterOrganization
  ) {
    const offices = this._getFromStorage('offices', []);
    const requests = this._getFromStorage('office_contact_requests', []);

    const office = offices.find(function (o) { return o.id === officeId; }) || null;
    if (!office) {
      return {
        request: null,
        success: false,
        message: 'Office not found.'
      };
    }

    const request = {
      id: this._generateId('officecontact'),
      officeId: officeId,
      inquiryType: inquiryType,
      preferredMonth: preferredMonth || null,
      message: message,
      requesterName: requesterName,
      requesterEmail: requesterEmail,
      requesterOrganization: requesterOrganization || null,
      createdAt: new Date().toISOString(),
      status: 'submitted'
    };

    requests.push(request);
    this._saveToStorage('office_contact_requests', requests);

    const enrichedRequest = Object.assign({}, request, { office: office });

    return {
      request: enrichedRequest,
      success: true,
      message: 'Office contact request submitted.'
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