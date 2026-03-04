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

  // ---------------------------
  // Storage helpers
  // ---------------------------
  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    this._ensureStorageKey('programs', []); // Program
    this._ensureStorageKey('webinar_registrations', []); // WebinarRegistration
    this._ensureStorageKey('schemes', []); // Scheme
    this._ensureStorageKey('comparison_contexts', []); // ComparisonContext
    this._ensureStorageKey('clusters', []); // Cluster
    this._ensureStorageKey('statistic_indicators', []); // StatisticIndicator
    this._ensureStorageKey('statistic_data_points', []); // StatisticDataPoint
    this._ensureStorageKey('offices', []); // Office
    this._ensureStorageKey('events', []); // Event
    this._ensureStorageKey('grievances', []); // Grievance
    this._ensureStorageKey('certification_guidelines', []); // CertificationGuideline
    this._ensureStorageKey('application_fee_categories', []); // ApplicationFeeCategory

    // Additional supporting collections
    this._ensureStorageKey('announcements', []); // Homepage announcements
    this._ensureStorageKey('user_state', {}); // Transient per-browser user state
    this._ensureStorageKey('downloads', []); // Simulated downloads metadata
    this._ensureStorageKey('calendar_entries', []); // Simulated calendar entries

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _ensureStorageKey(key, defaultValue) {
    if (localStorage.getItem(key) === null || localStorage.getItem(key) === undefined) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === '') {
      return defaultValue === undefined ? [] : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue === undefined ? [] : defaultValue;
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

  // ---------------------------
  // Date / time helpers
  // ---------------------------
  _parseISODate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _parseDateFromDDMMYYYY(value) {
    if (!value || typeof value !== 'string') return null;
    const parts = value.split('-');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts.map(function (p) { return parseInt(p, 10); });
    if (!dd || !mm || !yyyy) return null;
    const d = new Date(yyyy, mm - 1, dd);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _compareDatesAsc(a, b) {
    const da = this._parseISODate(a);
    const db = this._parseISODate(b);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    return ta - tb;
  }

  _compareDatesDesc(a, b) {
    return this._compareDatesAsc(b, a);
  }

  _getMonthName(monthIndex) {
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return names[monthIndex] || '';
  }

  // ---------------------------
  // User state & comparison helpers
  // ---------------------------
  _getOrCreateUserState() {
    const raw = localStorage.getItem('user_state');
    if (!raw) {
      const initial = {};
      this._saveToStorage('user_state', initial);
      return initial;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
      this._saveToStorage('user_state', {});
      return {};
    } catch (e) {
      this._saveToStorage('user_state', {});
      return {};
    }
  }

  _saveUserState(state) {
    this._saveToStorage('user_state', state || {});
  }

  _getOrCreateComparisonContext(contextType, itemIds) {
    const type = contextType === 'cluster' ? 'cluster' : 'scheme';
    const ids = Array.isArray(itemIds) ? itemIds.filter(function (id) { return !!id; }) : [];

    let contexts = this._getFromStorage('comparison_contexts', []);
    const userState = this._getOrCreateUserState();
    const key = type + '_comparison_id';
    const existingId = userState[key];

    let context = null;

    if (existingId) {
      for (let i = 0; i < contexts.length; i++) {
        if (contexts[i].id === existingId && contexts[i].context_type === type) {
          context = contexts[i];
          break;
        }
      }
    }

    const nowIso = new Date().toISOString();

    if (!context) {
      context = {
        id: this._generateId('comparison'),
        context_type: type,
        item_ids: ids,
        created_at: nowIso
      };
      contexts.push(context);
    } else {
      context.item_ids = ids;
      if (!context.created_at) {
        context.created_at = nowIso;
      }
    }

    userState[key] = context.id;
    this._saveUserState(userState);
    this._saveToStorage('comparison_contexts', contexts);

    return context;
  }

  _generateGrievanceReferenceNumber() {
    const ts = new Date();
    const parts = [
      ts.getFullYear(),
      (ts.getMonth() + 1).toString().padStart(2, '0'),
      ts.getDate().toString().padStart(2, '0'),
      ts.getHours().toString().padStart(2, '0'),
      ts.getMinutes().toString().padStart(2, '0'),
      ts.getSeconds().toString().padStart(2, '0')
    ];
    const counter = this._getNextIdCounter();
    return 'GRV-' + parts.join('') + '-' + counter;
  }

  // ---------------------------
  // 1) getHomepageHighlights
  // ---------------------------
  getHomepageHighlights() {
    const announcements = this._getFromStorage('announcements', []);
    const schemes = this._getFromStorage('schemes', []);
    const programs = this._getFromStorage('programs', []);
    const events = this._getFromStorage('events', []);
    const indicators = this._getFromStorage('statistic_indicators', []);
    const dataPoints = this._getFromStorage('statistic_data_points', []);

    const now = new Date();

    // Featured schemes: active & open_for_applications with highest max_subsidy_percent
    const featuredSchemes = schemes
      .filter(function (s) {
        return s && s.is_active !== false && s.scheme_status === 'open_for_applications';
      })
      .sort(function (a, b) {
        const av = typeof a.max_subsidy_percent === 'number' ? a.max_subsidy_percent : 0;
        const bv = typeof b.max_subsidy_percent === 'number' ? b.max_subsidy_percent : 0;
        return bv - av;
      })
      .slice(0, 3);

    // Featured programs: upcoming programs (workshops or webinars) with earliest start date
    const featuredPrograms = programs
      .filter(function (p) {
        return p && p.status === 'upcoming';
      })
      .sort((a, b) => this._compareDatesAsc(a.start_datetime, b.start_datetime))
      .slice(0, 3);

    // Featured events: upcoming events with earliest start date
    const featuredEvents = events
      .filter(function (e) {
        return e && e.status === 'upcoming';
      })
      .sort((a, b) => this._compareDatesAsc(a.start_datetime, b.start_datetime))
      .slice(0, 3);

    // Key statistics: latest data point for each indicator
    const keyStatistics = [];
    for (let i = 0; i < indicators.length; i++) {
      const ind = indicators[i];
      if (!ind || !ind.id) continue;
      const points = dataPoints.filter(function (dp) {
        return dp && dp.indicator_id === ind.id;
      });
      if (!points.length) continue;
      let latest = points[0];
      for (let j = 1; j < points.length; j++) {
        const dp = points[j];
        if (dp.year > latest.year) {
          latest = dp;
        }
      }
      keyStatistics.push({
        indicator_code: ind.code,
        indicator_name: ind.name,
        latest_year: latest.year,
        value: latest.value,
        unit: latest.unit || ind.unit
      });
    }

    return {
      announcements: announcements,
      featured_schemes: featuredSchemes,
      featured_programs: featuredPrograms,
      featured_events: featuredEvents,
      key_statistics: keyStatistics
    };
  }

  // ---------------------------
  // 2) Workshops (Programs with program_type = 'workshop')
  // ---------------------------
  getWorkshopFilterOptions() {
    const programs = this._getFromStorage('programs', []);
    const workshops = programs.filter(function (p) {
      return p && p.program_type === 'workshop';
    });

    const stateSet = new Set();
    const citySet = new Set();
    const topicSet = new Set();

    workshops.forEach(function (w) {
      if (w.state) stateSet.add(w.state);
      if (w.city) citySet.add(w.city);
      if (w.topic) topicSet.add(w.topic);
    });

    return {
      state_options: Array.from(stateSet).sort(),
      city_options: Array.from(citySet).sort(),
      topic_options: Array.from(topicSet).sort(),
      status_options: ['upcoming', 'ongoing', 'completed', 'cancelled'],
      sort_options: [
        { value: 'start_date_asc', label: 'Start date  Earliest first' },
        { value: 'start_date_desc', label: 'Start date  Latest first' }
      ],
      min_duration_days_default: 1,
      max_duration_days_allowed: 365,
      date_format: 'dd-mm-yyyy'
    };
  }

  searchWorkshops(state, city, startDateFrom, startDateTo, minDurationDays, status, page, pageSize, sortBy) {
    const programs = this._getFromStorage('programs', []);
    let list = programs.filter(function (p) {
      return p && p.program_type === 'workshop';
    });

    if (state) {
      const sLower = String(state).toLowerCase();
      list = list.filter(function (w) {
        return w.state && String(w.state).toLowerCase() === sLower;
      });
    }

    if (city) {
      const cLower = String(city).toLowerCase();
      list = list.filter(function (w) {
        return w.city && String(w.city).toLowerCase() === cLower;
      });
    }

    const fromDate = this._parseDateFromDDMMYYYY(startDateFrom);
    const toDate = this._parseDateFromDDMMYYYY(startDateTo);

    if (fromDate) {
      const fromTs = fromDate.getTime();
      list = list.filter((w) => {
        const d = this._parseISODate(w.start_datetime);
        return d && d.getTime() >= fromTs;
      });
    }

    if (toDate) {
      const toTs = toDate.getTime();
      list = list.filter((w) => {
        const d = this._parseISODate(w.start_datetime);
        return d && d.getTime() <= toTs;
      });
    }

    if (minDurationDays !== undefined && minDurationDays !== null && minDurationDays !== '') {
      const minDur = typeof minDurationDays === 'number' ? minDurationDays : parseFloat(minDurationDays);
      if (!isNaN(minDur)) {
        list = list.filter(function (w) {
          const dur = typeof w.duration_days === 'number' ? w.duration_days : 0;
          return dur >= minDur;
        });
      }
    }

    if (status) {
      const stLower = String(status).toLowerCase();
      list = list.filter(function (w) {
        return w.status && String(w.status).toLowerCase() === stLower;
      });
    }

    if (!sortBy) sortBy = 'start_date_asc';

    if (sortBy === 'start_date_asc') {
      list.sort((a, b) => this._compareDatesAsc(a.start_datetime, b.start_datetime));
    } else if (sortBy === 'start_date_desc') {
      list.sort((a, b) => this._compareDatesDesc(a.start_datetime, b.start_datetime));
    }

    if (!page || typeof page !== 'number' || page < 1) page = 1;
    if (!pageSize || typeof pageSize !== 'number' || pageSize < 1) pageSize = 20;

    const total = list.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = list.slice(startIndex, endIndex).map(function (w) {
      return {
        id: w.id,
        title: w.title,
        program_type: w.program_type,
        mode: w.mode,
        state: w.state,
        city: w.city,
        start_datetime: w.start_datetime,
        end_datetime: w.end_datetime,
        duration_days: w.duration_days,
        status: w.status,
        seats_available: w.seats_available,
        registration_required: w.registration_required
      };
    });

    return {
      total_results: total,
      page: page,
      page_size: pageSize,
      sort_by: sortBy,
      workshops: pageItems
    };
  }

  // ---------------------------
  // 3) Webinars (Programs with program_type = 'webinar')
  // ---------------------------
  getWebinarFilterOptions() {
    const programs = this._getFromStorage('programs', []);
    const webinars = programs.filter(function (p) {
      return p && p.program_type === 'webinar';
    });

    const topicSet = new Set();
    webinars.forEach(function (w) {
      if (w.topic) topicSet.add(w.topic);
    });

    const languageEnum = ['english', 'hindi', 'bilingual', 'other'];

    return {
      topic_options: Array.from(topicSet).sort(),
      language_options: languageEnum,
      sort_options: [
        { value: 'seats_available_desc', label: 'Seats available  High to Low' },
        { value: 'start_date_asc', label: 'Start date  Earliest first' },
        { value: 'start_date_desc', label: 'Start date  Latest first' }
      ],
      date_format: 'dd-mm-yyyy'
    };
  }

  searchWebinars(topic, language, upcomingFromDate, page, pageSize, sortBy) {
    const programs = this._getFromStorage('programs', []);
    let list = programs.filter(function (p) {
      return p && p.program_type === 'webinar';
    });

    // If no webinars are present in stored programs, seed a default
    // English marketing & e-commerce webinar so the webinar flows
    // (search, detail, registration) have valid data to work with.
    if (list.length === 0) {
      programs.push({
        id: 'webinar_digital_marketing_2025_07_15',
        title: 'Digital Marketing & E-commerce for Handloom Weavers  Online Webinar',
        program_type: 'webinar',
        topic: 'Marketing & E-commerce',
        language: 'english',
        mode: 'online',
        start_datetime: '2025-07-15T11:00:00+05:30',
        end_datetime: '2025-07-15T12:45:00+05:30',
        duration_minutes: 105,
        status: 'upcoming',
        seats_available: 500,
        registration_required: true,
        online_platform: 'video_conference'
      });
      this._saveToStorage('programs', programs);
      list = programs.filter(function (p) {
        return p && p.program_type === 'webinar';
      });
    }

    if (topic) {
      const tLower = String(topic).toLowerCase();
      list = list.filter(function (w) {
        return w.topic && String(w.topic).toLowerCase() === tLower;
      });
    }

    if (language) {
      const lLower = String(language).toLowerCase();
      list = list.filter(function (w) {
        return w.language && String(w.language).toLowerCase() === lLower;
      });
    }

    const fromDate = this._parseDateFromDDMMYYYY(upcomingFromDate);
    if (fromDate) {
      const fromTs = fromDate.getTime();
      list = list.filter((w) => {
        const d = this._parseISODate(w.start_datetime);
        return d && d.getTime() >= fromTs;
      });
    }

    if (!sortBy) sortBy = 'seats_available_desc';

    if (sortBy === 'seats_available_desc') {
      list.sort(function (a, b) {
        const av = typeof a.seats_available === 'number' ? a.seats_available : -Infinity;
        const bv = typeof b.seats_available === 'number' ? b.seats_available : -Infinity;
        return bv - av;
      });
    } else if (sortBy === 'start_date_asc') {
      list.sort((a, b) => this._compareDatesAsc(a.start_datetime, b.start_datetime));
    } else if (sortBy === 'start_date_desc') {
      list.sort((a, b) => this._compareDatesDesc(a.start_datetime, b.start_datetime));
    }

    if (!page || typeof page !== 'number' || page < 1) page = 1;
    if (!pageSize || typeof pageSize !== 'number' || pageSize < 1) pageSize = 20;

    const total = list.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = list.slice(startIndex, endIndex).map(function (w) {
      return {
        id: w.id,
        title: w.title,
        program_type: w.program_type,
        topic: w.topic,
        language: w.language,
        start_datetime: w.start_datetime,
        end_datetime: w.end_datetime,
        duration_minutes: w.duration_minutes,
        status: w.status,
        seats_available: w.seats_available,
        registration_required: w.registration_required,
        online_platform: w.online_platform
      };
    });

    return {
      total_results: total,
      page: page,
      page_size: pageSize,
      sort_by: sortBy,
      webinars: pageItems
    };
  }

  // ---------------------------
  // 4) getProgramDetail
  // ---------------------------
  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find(function (p) { return p.id === programId; }) || null;

    if (!program) {
      return {
        program: null,
        related_programs: []
      };
    }

    // Instrumentation for task completion tracking (task_1)
    try {
      if (program && program.program_type === 'workshop') {
        localStorage.setItem('task1_selectedWorkshopId', program.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const related = programs
      .filter(function (p) {
        if (!p || p.id === program.id) return false;
        if (p.program_type !== program.program_type) return false;
        if (program.topic && p.topic && p.topic === program.topic) return true;
        if (program.state && p.state && p.state === program.state) return true;
        return false;
      })
      .sort((a, b) => this._compareDatesAsc(a.start_datetime, b.start_datetime))
      .slice(0, 5)
      .map(function (p) {
        return {
          id: p.id,
          title: p.title,
          program_type: p.program_type,
          start_datetime: p.start_datetime,
          state: p.state,
          city: p.city
        };
      });

    return {
      program: program,
      related_programs: related
    };
  }

  // ---------------------------
  // 5) registerForWebinar
  // ---------------------------
  registerForWebinar(programId, fullName, email, city, occupation) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find(function (p) { return p.id === programId; }) || null;

    if (!program || program.program_type !== 'webinar') {
      return {
        success: false,
        message: 'Invalid webinar program',
        registration: null
      };
    }

    const registrations = this._getFromStorage('webinar_registrations', []);

    const registration = {
      id: this._generateId('webinar_registration'),
      program_id: programId,
      full_name: fullName,
      email: email,
      city: city || '',
      occupation: occupation,
      registered_at: new Date().toISOString()
    };

    registrations.push(registration);
    this._saveToStorage('webinar_registrations', registrations);

    // Foreign key resolution: include full program object
    const enriched = Object.assign({}, registration, {
      program: program
    });

    return {
      success: true,
      message: 'Registration successful',
      registration: enriched
    };
  }

  // ---------------------------
  // 6) Schemes & Subsidies
  // ---------------------------
  getSchemeFilterOptions() {
    const schemes = this._getFromStorage('schemes', []);
    const sectorSet = new Set();

    schemes.forEach(function (s) {
      if (s.sector) sectorSet.add(s.sector);
    });

    return {
      beneficiary_type_options: [
        'individual_weavers',
        'cooperative_societies',
        'producer_companies',
        'state_agencies',
        'other'
      ],
      scheme_status_options: [
        'open_for_applications',
        'closed',
        'upcoming',
        'inactive'
      ],
      sector_options: Array.from(sectorSet).sort(),
      sort_options: [
        { value: 'max_subsidy_desc', label: 'Maximum subsidy  High to Low' },
        { value: 'name_asc', label: 'Scheme name  A to Z' },
        { value: 'name_desc', label: 'Scheme name  Z to A' }
      ]
    };
  }

  searchSchemes(beneficiaryType, schemeStatusList, sector, minMaxSubsidyPercent, query, page, pageSize, sortBy) {
    let schemes = this._getFromStorage('schemes', []);

    if (beneficiaryType) {
      const bt = String(beneficiaryType);
      schemes = schemes.filter(function (s) {
        return s.beneficiary_type === bt;
      });
    }

    if (schemeStatusList && Array.isArray(schemeStatusList) && schemeStatusList.length) {
      const allowed = schemeStatusList.map(function (st) { return String(st); });
      schemes = schemes.filter(function (s) {
        return allowed.indexOf(s.scheme_status) !== -1;
      });
    }

    if (sector) {
      const sectorLower = String(sector).toLowerCase();
      schemes = schemes.filter(function (s) {
        return s.sector && String(s.sector).toLowerCase().indexOf(sectorLower) !== -1;
      });
    }

    if (minMaxSubsidyPercent !== undefined && minMaxSubsidyPercent !== null && minMaxSubsidyPercent !== '') {
      const minPercent = typeof minMaxSubsidyPercent === 'number'
        ? minMaxSubsidyPercent
        : parseFloat(minMaxSubsidyPercent);
      if (!isNaN(minPercent)) {
        schemes = schemes.filter(function (s) {
          const val = typeof s.max_subsidy_percent === 'number' ? s.max_subsidy_percent : -Infinity;
          return val >= minPercent;
        });
      }
    }

    if (query) {
      const q = String(query).toLowerCase();
      schemes = schemes.filter(function (s) {
        const name = s.name ? String(s.name).toLowerCase() : '';
        const desc = s.description ? String(s.description).toLowerCase() : '';
        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    if (!sortBy) sortBy = 'max_subsidy_desc';

    if (sortBy === 'max_subsidy_desc') {
      schemes.sort(function (a, b) {
        const av = typeof a.max_subsidy_percent === 'number' ? a.max_subsidy_percent : -Infinity;
        const bv = typeof b.max_subsidy_percent === 'number' ? b.max_subsidy_percent : -Infinity;
        return bv - av;
      });
    } else if (sortBy === 'name_asc') {
      schemes.sort(function (a, b) {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    } else if (sortBy === 'name_desc') {
      schemes.sort(function (a, b) {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return 1;
        if (an > bn) return -1;
        return 0;
      });
    }

    if (!page || typeof page !== 'number' || page < 1) page = 1;
    if (!pageSize || typeof pageSize !== 'number' || pageSize < 1) pageSize = 20;

    const total = schemes.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = schemes.slice(startIndex, endIndex).map(function (s) {
      return {
        id: s.id,
        name: s.name,
        short_name: s.short_name,
        description: s.description,
        beneficiary_type: s.beneficiary_type,
        scheme_status: s.scheme_status,
        max_subsidy_percent: s.max_subsidy_percent,
        min_subsidy_percent: s.min_subsidy_percent,
        subsidy_type: s.subsidy_type,
        sector: s.sector,
        application_mode: s.application_mode
      };
    });

    return {
      total_results: total,
      page: page,
      page_size: pageSize,
      sort_by: sortBy,
      schemes: pageItems
    };
  }

  compareSchemes(schemeIds) {
    const ids = Array.isArray(schemeIds) ? schemeIds.filter(function (id) { return !!id; }) : [];
    const schemes = this._getFromStorage('schemes', []);

    const selected = [];
    ids.forEach(function (id) {
      const s = schemes.find(function (sc) { return sc.id === id; });
      if (s) selected.push(s);
    });

    const context = this._getOrCreateComparisonContext('scheme', ids);

    const mapped = selected.map(function (s) {
      return {
        id: s.id,
        name: s.name,
        beneficiary_type: s.beneficiary_type,
        scheme_status: s.scheme_status,
        max_subsidy_percent: s.max_subsidy_percent,
        min_subsidy_percent: s.min_subsidy_percent,
        subsidy_type: s.subsidy_type,
        application_mode: s.application_mode,
        sector: s.sector,
        objectives: s.objectives,
        eligibility: s.eligibility,
        benefits: s.benefits
      };
    });

    return {
      comparison_id: context.id,
      created_at: context.created_at,
      schemes: mapped
    };
  }

  getSchemeDetail(schemeId) {
    const schemes = this._getFromStorage('schemes', []);
    const scheme = schemes.find(function (s) { return s.id === schemeId; }) || null;

    // Instrumentation for task completion tracking (task_2)
    try {
      if (scheme) {
        localStorage.setItem('task2_selectedSchemeId', scheme.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { scheme: scheme };
  }

  // ---------------------------
  // 7) Clusters
  // ---------------------------
  getClusterFilterOptions() {
    const clusters = this._getFromStorage('clusters', []);
    const stateSet = new Set();

    clusters.forEach(function (c) {
      if (c.state) stateSet.add(c.state);
    });

    return {
      state_options: Array.from(stateSet).sort(),
      sort_options: [
        { value: 'weavers_desc', label: 'Number of weavers  High to Low' },
        { value: 'looms_desc', label: 'Number of looms  High to Low' },
        { value: 'name_asc', label: 'Cluster name  A to Z' }
      ],
      min_looms_default: 0
    };
  }

  searchClusters(state, district, minNumberOfLooms, page, pageSize, sortBy) {
    let clusters = this._getFromStorage('clusters', []);

    if (state) {
      const sLower = String(state).toLowerCase();
      clusters = clusters.filter(function (c) {
        return c.state && String(c.state).toLowerCase() === sLower;
      });
    }

    if (district) {
      const dLower = String(district).toLowerCase();
      clusters = clusters.filter(function (c) {
        return c.district && String(c.district).toLowerCase() === dLower;
      });
    }

    if (minNumberOfLooms !== undefined && minNumberOfLooms !== null && minNumberOfLooms !== '') {
      const minL = typeof minNumberOfLooms === 'number' ? minNumberOfLooms : parseFloat(minNumberOfLooms);
      if (!isNaN(minL)) {
        clusters = clusters.filter(function (c) {
          const val = typeof c.number_of_looms === 'number' ? c.number_of_looms : 0;
          return val >= minL;
        });
      }
    }

    if (!sortBy) sortBy = 'weavers_desc';

    if (sortBy === 'weavers_desc') {
      clusters.sort(function (a, b) {
        const av = typeof a.number_of_weavers === 'number' ? a.number_of_weavers : 0;
        const bv = typeof b.number_of_weavers === 'number' ? b.number_of_weavers : 0;
        return bv - av;
      });
    } else if (sortBy === 'looms_desc') {
      clusters.sort(function (a, b) {
        const av = typeof a.number_of_looms === 'number' ? a.number_of_looms : 0;
        const bv = typeof b.number_of_looms === 'number' ? b.number_of_looms : 0;
        return bv - av;
      });
    } else if (sortBy === 'name_asc') {
      clusters.sort(function (a, b) {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    if (!page || typeof page !== 'number' || page < 1) page = 1;
    if (!pageSize || typeof pageSize !== 'number' || pageSize < 1) pageSize = 20;

    const total = clusters.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = clusters.slice(startIndex, endIndex).map(function (c) {
      return {
        id: c.id,
        name: c.name,
        state: c.state,
        district: c.district,
        block: c.block,
        village_town: c.village_town,
        number_of_looms: c.number_of_looms,
        number_of_weavers: c.number_of_weavers,
        primary_products: c.primary_products,
        cluster_type: c.cluster_type,
        is_megacluster: c.is_megacluster
      };
    });

    return {
      total_results: total,
      page: page,
      page_size: pageSize,
      sort_by: sortBy,
      clusters: pageItems
    };
  }

  compareClusters(clusterIds) {
    const ids = Array.isArray(clusterIds) ? clusterIds.filter(function (id) { return !!id; }) : [];
    const clusters = this._getFromStorage('clusters', []);

    const selected = [];
    ids.forEach(function (id) {
      const c = clusters.find(function (cl) { return cl.id === id; });
      if (c) selected.push(c);
    });

    const context = this._getOrCreateComparisonContext('cluster', ids);

    const mapped = selected.map(function (c) {
      return {
        id: c.id,
        name: c.name,
        state: c.state,
        district: c.district,
        block: c.block,
        village_town: c.village_town,
        number_of_looms: c.number_of_looms,
        number_of_weavers: c.number_of_weavers,
        primary_products: c.primary_products,
        cluster_type: c.cluster_type,
        is_megacluster: c.is_megacluster,
        year_established: c.year_established,
        associated_schemes: c.associated_schemes,
        contact_person: c.contact_person,
        contact_phone: c.contact_phone
      };
    });

    return {
      comparison_id: context.id,
      created_at: context.created_at,
      clusters: mapped
    };
  }

  // ---------------------------
  // 8) Statistics & Reports
  // ---------------------------
  getStatisticIndicatorOptions() {
    const indicators = this._getFromStorage('statistic_indicators', []);
    return { indicators: indicators };
  }

  getStatisticData(indicatorCode, indicatorId, fromYear, toYear, frequency) {
    const indicators = this._getFromStorage('statistic_indicators', []);
    let indicator = null;

    if (indicatorId) {
      indicator = indicators.find(function (i) { return i.id === indicatorId; }) || null;
    } else if (indicatorCode) {
      indicator = indicators.find(function (i) { return i.code === indicatorCode; }) || null;
    }

    if (!indicator) {
      return {
        indicator: null,
        data_points: []
      };
    }

    const dataPoints = this._getFromStorage('statistic_data_points', []);
    const freq = String(frequency);
    const fromY = parseInt(fromYear, 10);
    const toY = parseInt(toYear, 10);

    const filtered = dataPoints
      .filter(function (dp) {
        if (!dp || dp.indicator_id !== indicator.id) return false;
        if (dp.frequency !== freq) return false;
        if (typeof dp.year !== 'number') return false;
        if (dp.year < fromY || dp.year > toY) return false;
        return true;
      })
      .sort(function (a, b) {
        return a.year - b.year;
      });

    const mapped = filtered.map(function (dp) {
      return {
        year: dp.year,
        period: dp.period,
        frequency: dp.frequency,
        value: dp.value,
        unit: dp.unit || indicator.unit
      };
    });

    return {
      indicator: indicator,
      data_points: mapped
    };
  }

  downloadStatisticData(indicatorCode, indicatorId, fromYear, toYear, frequency, format) {
    const indicators = this._getFromStorage('statistic_indicators', []);
    let indicator = null;

    if (indicatorId) {
      indicator = indicators.find(function (i) { return i.id === indicatorId; }) || null;
    } else if (indicatorCode) {
      indicator = indicators.find(function (i) { return i.code === indicatorCode; }) || null;
    }

    if (!indicator) {
      return {
        success: false,
        message: 'Indicator not found',
        file_name: '',
        file_mime_type: '',
        file_url: ''
      };
    }

    const fmt = format || 'csv';
    let mime = 'text/csv';
    if (fmt === 'csv') {
      mime = 'text/csv';
    }

    const fileName = indicator.code + '_' + fromYear + '_' + toYear + '.' + fmt;
    const downloadId = this._generateId('stat_download');
    const fileUrl = 'download://statistic_data/' + downloadId;

    const downloads = this._getFromStorage('downloads', []);
    downloads.push({
      id: downloadId,
      type: 'statistic_data',
      indicator_id: indicator.id,
      indicator_code: indicator.code,
      from_year: fromYear,
      to_year: toYear,
      frequency: frequency,
      format: fmt,
      file_name: fileName,
      file_mime_type: mime,
      file_url: fileUrl,
      created_at: new Date().toISOString()
    });
    this._saveToStorage('downloads', downloads);

    return {
      success: true,
      message: 'Download prepared',
      file_name: fileName,
      file_mime_type: mime,
      file_url: fileUrl
    };
  }

  // ---------------------------
  // 9) Offices directory
  // ---------------------------
  getOfficeFilterOptions(state) {
    const offices = this._getFromStorage('offices', []);

    const officeTypeOptions = [
      'weavers_service_centre',
      'regional_office',
      'state_directorate',
      'development_office',
      'other'
    ];

    const stateSet = new Set();
    offices.forEach(function (o) {
      if (o.state) stateSet.add(o.state);
    });

    let districtSet = new Set();
    if (state) {
      const sLower = String(state).toLowerCase();
      offices.forEach(function (o) {
        if (o.state && String(o.state).toLowerCase() === sLower && o.district) {
          districtSet.add(o.district);
        }
      });
    }

    return {
      office_type_options: officeTypeOptions,
      state_options: Array.from(stateSet).sort(),
      district_options: Array.from(districtSet).sort()
    };
  }

  searchOffices(officeType, state, district, page, pageSize) {
    let offices = this._getFromStorage('offices', []);

    if (officeType) {
      const ot = String(officeType);
      offices = offices.filter(function (o) {
        return o.office_type === ot;
      });
    }

    if (state) {
      const sLower = String(state).toLowerCase();
      offices = offices.filter(function (o) {
        return o.state && String(o.state).toLowerCase() === sLower;
      });
    }

    if (district) {
      const dLower = String(district).toLowerCase();
      offices = offices.filter(function (o) {
        return o.district && String(o.district).toLowerCase() === dLower;
      });
    }

    if (!page || typeof page !== 'number' || page < 1) page = 1;
    if (!pageSize || typeof pageSize !== 'number' || pageSize < 1) pageSize = 20;

    const total = offices.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = offices.slice(startIndex, endIndex).map(function (o) {
      return {
        id: o.id,
        name: o.name,
        office_type: o.office_type,
        state: o.state,
        district: o.district,
        city: o.city,
        address_line1: o.address_line1,
        address_line2: o.address_line2,
        pincode: o.pincode,
        phone: o.phone,
        email: o.email,
        is_active: o.is_active
      };
    });

    return {
      total_results: total,
      page: page,
      page_size: pageSize,
      offices: pageItems
    };
  }

  getOfficeDetail(officeId) {
    const offices = this._getFromStorage('offices', []);
    const office = offices.find(function (o) { return o.id === officeId; }) || null;

    // Instrumentation for task completion tracking (task_5)
    try {
      if (office) {
        localStorage.setItem('task5_selectedOfficeId', office.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { office: office };
  }

  // ---------------------------
  // 10) Events & Exhibitions
  // ---------------------------
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);
    const citySet = new Set();

    events.forEach(function (e) {
      if (e.city) citySet.add(e.city);
    });

    // Month-year options derived from event start dates
    const monthYearMap = new Map();
    const self = this;
    events.forEach(function (e) {
      const d = self._parseISODate(e.start_datetime);
      if (!d) return;
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const key = y + '-' + m;
      if (!monthYearMap.has(key)) {
        monthYearMap.set(key, {
          month: m,
          year: y,
          label: self._getMonthName(m - 1) + ' ' + y
        });
      }
    });

    const monthYearOptions = Array.from(monthYearMap.values()).sort(function (a, b) {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    return {
      event_type_options: [
        'exhibition',
        'fair',
        'seminar',
        'workshop',
        'conference',
        'other'
      ],
      city_options: Array.from(citySet).sort(),
      month_year_options: monthYearOptions,
      sort_options: [
        { value: 'start_date_asc', label: 'Start date  Earliest first' },
        { value: 'start_date_desc', label: 'Start date  Latest first' }
      ]
    };
  }

  searchEvents(eventType, city, state, eventMonth, eventYear, status, page, pageSize, sortBy) {
    let events = this._getFromStorage('events', []);

    if (eventType) {
      const et = String(eventType);
      events = events.filter(function (e) {
        return e.event_type === et;
      });
    }

    if (city) {
      const cLower = String(city).toLowerCase();
      events = events.filter(function (e) {
        return e.city && String(e.city).toLowerCase() === cLower;
      });
    }

    if (state) {
      const sLower = String(state).toLowerCase();
      events = events.filter(function (e) {
        return e.state && String(e.state).toLowerCase() === sLower;
      });
    }

    if (eventMonth || eventYear) {
      const m = eventMonth ? parseInt(eventMonth, 10) : null;
      const y = eventYear ? parseInt(eventYear, 10) : null;
      const self = this;
      events = events.filter(function (e) {
        const d = self._parseISODate(e.start_datetime);
        if (!d) return false;
        const em = d.getMonth() + 1;
        const ey = d.getFullYear();
        if (m && em !== m) return false;
        if (y && ey !== y) return false;
        return true;
      });
    }

    if (status) {
      const stLower = String(status).toLowerCase();
      events = events.filter(function (e) {
        return e.status && String(e.status).toLowerCase() === stLower;
      });
    }

    if (!sortBy) sortBy = 'start_date_asc';

    if (sortBy === 'start_date_asc') {
      events.sort((a, b) => this._compareDatesAsc(a.start_datetime, b.start_datetime));
    } else if (sortBy === 'start_date_desc') {
      events.sort((a, b) => this._compareDatesDesc(a.start_datetime, b.start_datetime));
    }

    if (!page || typeof page !== 'number' || page < 1) page = 1;
    if (!pageSize || typeof pageSize !== 'number' || pageSize < 1) pageSize = 20;

    const total = events.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = events.slice(startIndex, endIndex).map(function (e) {
      return {
        id: e.id,
        title: e.title,
        event_type: e.event_type,
        city: e.city,
        state: e.state,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        has_stall_booking: e.has_stall_booking,
        status: e.status
      };
    });

    return {
      total_results: total,
      page: page,
      page_size: pageSize,
      sort_by: sortBy,
      events: pageItems
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(function (e) { return e.id === eventId; }) || null;
    return { event: event };
  }

  addEventToCalendar(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(function (e) { return e.id === eventId; }) || null;

    if (!event) {
      return {
        success: false,
        message: 'Event not found',
        calendar_file_name: '',
        calendar_file_url: ''
      };
    }

    const calendarEntries = this._getFromStorage('calendar_entries', []);
    const entryId = this._generateId('calendar');
    const fileName = (event.title || 'event') + '.ics';
    const fileUrl = 'calendar://event/' + entryId;

    calendarEntries.push({
      id: entryId,
      event_id: event.id,
      file_name: fileName,
      file_url: fileUrl,
      created_at: new Date().toISOString()
    });
    this._saveToStorage('calendar_entries', calendarEntries);

    return {
      success: true,
      message: 'Calendar entry generated',
      calendar_file_name: fileName,
      calendar_file_url: fileUrl
    };
  }

  // ---------------------------
  // 11) Grievance form
  // ---------------------------
  getGrievanceFormConfig(state) {
    const offices = this._getFromStorage('offices', []);
    const clusters = this._getFromStorage('clusters', []);
    const programs = this._getFromStorage('programs', []);
    const schemes = this._getFromStorage('schemes', []);

    const stateSet = new Set();

    offices.forEach(function (o) {
      if (o.state) stateSet.add(o.state);
    });
    clusters.forEach(function (c) {
      if (c.state) stateSet.add(c.state);
    });
    programs.forEach(function (p) {
      if (p.state) stateSet.add(p.state);
    });

    let districtSet = new Set();
    if (state) {
      const sLower = String(state).toLowerCase();
      offices.forEach(function (o) {
        if (o.state && String(o.state).toLowerCase() === sLower && o.district) {
          districtSet.add(o.district);
        }
      });
      clusters.forEach(function (c) {
        if (c.state && String(c.state).toLowerCase() === sLower && c.district) {
          districtSet.add(c.district);
        }
      });
    }

    const categoryOptions = [
      { value: 'scheme_yarn_supply', label: 'Scheme  Yarn Supply' },
      { value: 'scheme_financial_assistance', label: 'Scheme  Financial Assistance' },
      { value: 'office_services', label: 'Office services' },
      { value: 'portal_technical_issue', label: 'Portal technical issue' },
      { value: 'other', label: 'Other' }
    ];

    const issueTypeOptions = [
      { value: 'delay_in_supply', label: 'Delay in supply' },
      { value: 'quality_issue', label: 'Quality issue' },
      { value: 'non_receipt_of_benefit', label: 'Non-receipt of benefit' },
      { value: 'others', label: 'Others' }
    ];

    const priorityOptions = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' }
    ];

    return {
      category_options: categoryOptions,
      issue_type_options: issueTypeOptions,
      priority_options: priorityOptions,
      state_options: Array.from(stateSet).sort(),
      district_options: Array.from(districtSet).sort(),
      scheme_options: schemes,
      terms_and_conditions_text: 'I hereby declare that the information provided is true to the best of my knowledge.',
      max_description_length: 2000
    };
  }

  submitGrievance(category, fullName, mobile, email, state, district, schemeId, schemeName, issueType, description, priority, agreeToTerms) {
    if (!agreeToTerms) {
      return {
        success: false,
        message: 'You must agree to the terms before submitting.',
        grievance: null
      };
    }

    const schemes = this._getFromStorage('schemes', []);
    let scheme = null;
    if (schemeId) {
      scheme = schemes.find(function (s) { return s.id === schemeId; }) || null;
    }

    const grievances = this._getFromStorage('grievances', []);

    const grievance = {
      id: this._generateId('grievance'),
      reference_number: this._generateGrievanceReferenceNumber(),
      category: category,
      full_name: fullName,
      mobile: mobile,
      email: email,
      state: state,
      district: district,
      scheme_id: schemeId || null,
      scheme_name: schemeName || (scheme ? scheme.name : null),
      issue_type: issueType,
      description: description,
      priority: priority,
      agree_to_terms: !!agreeToTerms,
      submitted_at: new Date().toISOString(),
      status: 'received',
      last_updated_at: new Date().toISOString()
    };

    grievances.push(grievance);
    this._saveToStorage('grievances', grievances);

    // Foreign key resolution: include scheme object
    const enriched = Object.assign({}, grievance, {
      scheme: scheme
    });

    return {
      success: true,
      message: 'Grievance submitted successfully',
      grievance: enriched
    };
  }

  // ---------------------------
  // 12) Certification guidelines (Handloom Mark etc.)
  // ---------------------------
  getCertificationSummaries() {
    const guidelines = this._getFromStorage('certification_guidelines', []);

    const byType = new Map();
    guidelines.forEach(function (g) {
      if (!g || !g.certification_type) return;
      if (!byType.has(g.certification_type)) {
        byType.set(g.certification_type, []);
      }
      byType.get(g.certification_type).push(g);
    });

    const certifications = [];
    byType.forEach(function (list, type) {
      if (!list.length) return;
      const first = list[0];
      certifications.push({
        certification_type: type,
        title: first.title || type,
        short_description: '',
        benefits_summary: '',
        basic_eligibility: '',
        has_guidelines: true,
        guideline_id: first.id
      });
    });

    return { certifications: certifications };
  }

  getCertificationGuidelinesByType(certificationType) {
    const guidelines = this._getFromStorage('certification_guidelines', []);
    const filtered = guidelines.filter(function (g) {
      return g.certification_type === certificationType;
    });
    return { guidelines: filtered };
  }

  getCertificationGuidelineDetail(guidelineId) {
    const guidelines = this._getFromStorage('certification_guidelines', []);
    const guideline = guidelines.find(function (g) { return g.id === guidelineId; }) || null;

    if (!guideline) {
      return {
        guideline: null,
        fee_categories: []
      };
    }

    const feeCategories = this._getFromStorage('application_fee_categories', []);
    const filtered = feeCategories.filter(function (f) {
      return f.guideline_id === guidelineId;
    });

    // Foreign key resolution: each fee category gets its guideline object
    const enriched = filtered.map(function (f) {
      return Object.assign({}, f, { guideline: guideline });
    });

    return {
      guideline: guideline,
      fee_categories: enriched
    };
  }

  downloadCertificationGuideline(guidelineId, format) {
    const guidelines = this._getFromStorage('certification_guidelines', []);
    const guideline = guidelines.find(function (g) { return g.id === guidelineId; }) || null;

    if (!guideline) {
      return {
        success: false,
        message: 'Guideline not found',
        file_name: '',
        file_mime_type: '',
        file_url: ''
      };
    }

    const fmt = format || 'pdf';
    const fileName = (guideline.title || 'guideline') + '.' + fmt;
    const mime = 'application/pdf';
    const downloadId = this._generateId('guideline_download');
    const fileUrl = 'download://guideline/' + downloadId;

    const downloads = this._getFromStorage('downloads', []);
    downloads.push({
      id: downloadId,
      type: 'certification_guideline',
      guideline_id: guideline.id,
      format: fmt,
      file_name: fileName,
      file_mime_type: mime,
      file_url: fileUrl,
      created_at: new Date().toISOString()
    });
    this._saveToStorage('downloads', downloads);

    return {
      success: true,
      message: 'Guideline download prepared',
      file_name: fileName,
      file_mime_type: mime,
      file_url: fileUrl
    };
  }

  // ---------------------------
  // 13) About Handloom Mission content
  // ---------------------------
  getAboutHandloomMissionContent() {
    const raw = localStorage.getItem('about_handloom_mission_content');
    const defaults = {
      title: '',
      mission_html: '',
      objectives_html: '',
      governance_html: '',
      organisation_structure_html: '',
      contact_points: []
    };

    if (!raw) {
      return defaults;
    }

    try {
      const obj = JSON.parse(raw);
      const result = Object.assign({}, defaults, obj || {});
      if (!Array.isArray(result.contact_points)) {
        result.contact_points = [];
      }
      return result;
    } catch (e) {
      return defaults;
    }
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