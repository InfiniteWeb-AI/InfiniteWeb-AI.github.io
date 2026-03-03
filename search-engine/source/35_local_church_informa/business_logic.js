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

    this._dayOfWeekNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  }

  _initStorage() {
    const arrayKeys = [
      'worship_services',
      'childrens_programs',
      'visit_plans',
      'events',
      'event_registrations',
      'saved_event_lists',
      'event_view_states',
      'rooms',
      'room_reservation_requests',
      'sermons',
      'watch_later_playlists',
      'volunteer_roles',
      'volunteer_interests',
      'funds',
      'pledges',
      'ministries',
      'pastors',
      'counseling_availability_slots',
      'counseling_appointment_requests',
      'contact_form_submissions'
    ];

    const objectKeys = [
      'home_page_content',
      'about_page_content',
      'contact_and_directions_content',
      'care_overview_content'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    objectKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '{}');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw == null) {
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

  _nowIso() {
    return new Date().toISOString();
  }

  _getDateOnlyIso(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  _parseIsoDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _combineDateAndTime(dateStr, timeStr) {
    // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM'
    if (!dateStr || !timeStr) return null;
    const dateTimeStr = dateStr + 'T' + timeStr + ':00';
    const d = new Date(dateTimeStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _getTimeFromDate(date) {
    if (!(date instanceof Date)) return null;
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  _getDayOfWeekString(date) {
    if (!(date instanceof Date)) return null;
    return this._dayOfWeekNames[date.getDay()];
  }

  _validateAndBuildDateTimeRange(dateStr, startTimeStr, endTimeStr) {
    const start = this._combineDateAndTime(dateStr, startTimeStr);
    const end = this._combineDateAndTime(dateStr, endTimeStr);
    if (!start || !end || end <= start) {
      return { valid: false, startDateTime: null, endDateTime: null };
    }
    return { valid: true, startDateTime: start, endDateTime: end };
  }

  _getOrCreateVisitPlan(serviceIdForCreation) {
    const visitPlans = this._getFromStorage('visit_plans', []);
    let plan = visitPlans.find((p) => p.status === 'planning' || p.status === 'confirmed');
    if (!plan && serviceIdForCreation) {
      const now = this._nowIso();
      plan = {
        id: this._generateId('visit_plan'),
        serviceId: serviceIdForCreation,
        childrenProgramIds: [],
        notes: '',
        createdAt: now,
        updatedAt: now,
        status: 'planning'
      };
      visitPlans.push(plan);
      this._saveToStorage('visit_plans', visitPlans);
    }
    return { plan: plan || null, visitPlans };
  }

  _getExistingVisitPlan() {
    const visitPlans = this._getFromStorage('visit_plans', []);
    const plan = visitPlans.find((p) => p.status === 'planning' || p.status === 'confirmed');
    return { plan: plan || null, visitPlans };
  }

  _getOrCreateSavedEventList() {
    const lists = this._getFromStorage('saved_event_lists', []);
    let list = lists[0];
    if (!list) {
      const now = this._nowIso();
      list = {
        id: this._generateId('saved_event_list'),
        name: 'My Events',
        eventIds: [],
        createdAt: now,
        updatedAt: now
      };
      lists.push(list);
      this._saveToStorage('saved_event_lists', lists);
    }
    return { list, lists };
  }

  _getOrCreateWatchLaterPlaylist() {
    const lists = this._getFromStorage('watch_later_playlists', []);
    let playlist = lists[0];
    if (!playlist) {
      const now = this._nowIso();
      playlist = {
        id: this._generateId('watch_later'),
        name: 'Watch Later',
        sermonIds: [],
        createdAt: now,
        updatedAt: now
      };
      lists.push(playlist);
      this._saveToStorage('watch_later_playlists', lists);
    }
    return { playlist, lists };
  }

  _findFundById(fundId) {
    const funds = this._getFromStorage('funds', []);
    return funds.find((f) => f.id === fundId) || null;
  }

  _findMinistryById(ministryId) {
    const ministries = this._getFromStorage('ministries', []);
    return ministries.find((m) => m.id === ministryId) || null;
  }

  _findPastorById(pastorId) {
    const pastors = this._getFromStorage('pastors', []);
    return pastors.find((p) => p.id === pastorId) || null;
  }

  _eventsMapById() {
    const events = this._getFromStorage('events', []);
    const map = {};
    events.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }

  _sermonsMapById() {
    const sermons = this._getFromStorage('sermons', []);
    const map = {};
    sermons.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }

  _childrensProgramsByServiceId() {
    const programs = this._getFromStorage('childrens_programs', []);
    const byService = {};
    programs.forEach((p) => {
      if (!byService[p.serviceId]) byService[p.serviceId] = [];
      byService[p.serviceId].push(p);
    });
    return byService;
  }

  // ----------------------
  // Home page / highlights
  // ----------------------

  getHomeHighlights() {
    const worshipServices = this._getFromStorage('worship_services', []);
    const events = this._getFromStorage('events', []);
    const homeContent = this._getFromStorage('home_page_content', {});
    const pastors = this._getFromStorage('pastors', []);
    const ministries = this._getFromStorage('ministries', []);

    const now = new Date();

    const upcomingServicesRaw = worshipServices
      .filter((s) => s.isActive && this._parseIsoDate(s.startDateTime) && this._parseIsoDate(s.startDateTime) >= now)
      .sort((a, b) => {
        const da = this._parseIsoDate(a.startDateTime);
        const db = this._parseIsoDate(b.startDateTime);
        return da - db;
      })
      .slice(0, 10);

    const upcomingServices = upcomingServicesRaw.map((s) => {
      const pastor = pastors.find((p) => p.id === s.teachingPastorId) || null;
      const ministry = ministries.find((m) => m.id === s.ministryId) || null;
      const start = this._parseIsoDate(s.startDateTime);
      const end = this._parseIsoDate(s.endDateTime);
      return {
        serviceId: s.id,
        name: s.name,
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
        dayOfWeek: s.dayOfWeek || (start ? this._getDayOfWeekString(start) : null),
        serviceStyle: s.serviceStyle || null,
        serviceLocation: s.serviceLocation || null,
        hasChildrenProgram: !!s.hasChildrenProgram,
        teachingPastorName: pastor ? pastor.fullName : null,
        service: s,
        teachingPastor: pastor,
        ministry: ministry
      };
    });

    const featuredEventsRaw = events
      .filter((e) => e.isActive && this._parseIsoDate(e.startDateTime) && this._parseIsoDate(e.startDateTime) >= now)
      .sort((a, b) => {
        const da = this._parseIsoDate(a.startDateTime);
        const db = this._parseIsoDate(b.startDateTime);
        return da - db;
      })
      .slice(0, 10);

    const featuredEvents = featuredEventsRaw.map((e) => {
      const ministry = ministries.find((m) => m.id === e.ministryId) || null;
      return {
        eventId: e.id,
        title: e.title,
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime,
        category: e.category,
        categoryLabel: this._formatCategoryLabel(e.category),
        location: e.location || null,
        isFree: !!e.isFree,
        price: e.price,
        event: e,
        ministry: ministry
      };
    });

    return {
      upcomingServices,
      featuredEvents,
      announcementText: homeContent.announcementText || ''
    };
  }

  // ----------------------
  // Plan a Visit / Services
  // ----------------------

  getServiceFilterOptions() {
    const childrensPrograms = this._getFromStorage('childrens_programs', []);

    const childrenAgeMap = {};
    childrensPrograms.forEach((p) => {
      if (typeof p.ageMin === 'number' && typeof p.ageMax === 'number') {
        const key = p.ageMin + '-' + p.ageMax;
        if (!childrenAgeMap[key]) {
          childrenAgeMap[key] = {
            ageMin: p.ageMin,
            ageMax: p.ageMax,
            label: 'Ages ' + p.ageMin + '' + p.ageMax
          };
        }
      }
    });

    const childrenAgeRanges = Object.values(childrenAgeMap);

    return {
      dayOfWeekOptions: this._dayOfWeekNames.slice(),
      serviceStyleOptions: ['traditional', 'contemporary', 'blended', 'family', 'youth'],
      timeRangePresets: [
        { key: 'morning', label: 'Morning', startTime: '08:00', endTime: '12:00' },
        { key: 'afternoon', label: 'Afternoon', startTime: '12:00', endTime: '17:00' },
        { key: 'evening', label: 'Evening', startTime: '17:00', endTime: '21:00' }
      ],
      childrenAgeRanges: childrenAgeRanges
    };
  }

  searchWorshipServices(dayOfWeek, startTimeFrom, startTimeTo, serviceStyle, onlyWithChildrenProgram, childrenAgeMin, childrenAgeMax, limit) {
    const worshipServices = this._getFromStorage('worship_services', []);
    const childrensPrograms = this._getFromStorage('childrens_programs', []);
    const pastors = this._getFromStorage('pastors', []);
    const ministries = this._getFromStorage('ministries', []);

    const byServiceId = {};
    childrensPrograms.forEach((cp) => {
      if (!byServiceId[cp.serviceId]) byServiceId[cp.serviceId] = [];
      byServiceId[cp.serviceId].push(cp);
    });

    const fromMinutes = this._timeToMinutes(startTimeFrom);
    const toMinutes = this._timeToMinutes(startTimeTo);

    let servicesFiltered = worshipServices.filter((s) => s.isActive);

    if (dayOfWeek) {
      servicesFiltered = servicesFiltered.filter((s) => s.dayOfWeek === dayOfWeek);
    }

    if (fromMinutes != null || toMinutes != null) {
      servicesFiltered = servicesFiltered.filter((s) => {
        const d = this._parseIsoDate(s.startDateTime);
        if (!d) return false;
        const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
        if (fromMinutes != null && minutes < fromMinutes) return false;
        if (toMinutes != null && minutes > toMinutes) return false;
        return true;
      });
    }

    if (serviceStyle) {
      servicesFiltered = servicesFiltered.filter((s) => s.serviceStyle === serviceStyle);
    }

    if (onlyWithChildrenProgram) {
      servicesFiltered = servicesFiltered.filter((s) => !!s.hasChildrenProgram);
    }

    if (childrenAgeMin != null || childrenAgeMax != null) {
      servicesFiltered = servicesFiltered.filter((s) => {
        const cps = byServiceId[s.id] || [];
        if (!cps.length) return false;
        return cps.some((cp) => {
          if (childrenAgeMin != null && cp.ageMax < childrenAgeMin) return false;
          if (childrenAgeMax != null && cp.ageMin > childrenAgeMax) return false;
          return true;
        });
      });
    }

    servicesFiltered.sort((a, b) => {
      const da = this._parseIsoDate(a.startDateTime);
      const db = this._parseIsoDate(b.startDateTime);
      return da - db;
    });

    const totalCount = servicesFiltered.length;
    const limited = typeof limit === 'number' && limit > 0 ? servicesFiltered.slice(0, limit) : servicesFiltered;

    const results = limited.map((s) => {
      const cps = byServiceId[s.id] || [];
      const pastor = pastors.find((p) => p.id === s.teachingPastorId) || null;
      const ministry = ministries.find((m) => m.id === s.ministryId) || null;
      const childrenAgeRanges = cps.map((cp) => ({
        ageMin: cp.ageMin,
        ageMax: cp.ageMax,
        label: 'Ages ' + cp.ageMin + '' + cp.ageMax
      }));
      const start = this._parseIsoDate(s.startDateTime);
      return {
        serviceId: s.id,
        name: s.name,
        description: s.description || '',
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
        dayOfWeek: s.dayOfWeek || (start ? this._getDayOfWeekString(start) : null),
        serviceStyle: s.serviceStyle || null,
        serviceLocation: s.serviceLocation || null,
        hasChildrenProgram: !!s.hasChildrenProgram,
        teachingPastorName: pastor ? pastor.fullName : null,
        childrenAgeRanges: childrenAgeRanges,
        isActive: !!s.isActive,
        service: s,
        teachingPastor: pastor,
        ministry: ministry
      };
    });

    return {
      services: results,
      totalCount: totalCount
    };
  }

  getServiceDetails(serviceId) {
    const worshipServices = this._getFromStorage('worship_services', []);
    const childrensPrograms = this._getFromStorage('childrens_programs', []);
    const pastors = this._getFromStorage('pastors', []);
    const ministries = this._getFromStorage('ministries', []);

    const service = worshipServices.find((s) => s.id === serviceId) || null;
    if (!service) {
      return {
        service: null,
        childrensPrograms: [],
        isInCurrentVisitPlan: false
      };
    }

    const { plan } = this._getExistingVisitPlan();
    const inPlan = !!(plan && plan.serviceId === serviceId);

    const pastor = pastors.find((p) => p.id === service.teachingPastorId) || null;
    const ministry = ministries.find((m) => m.id === service.ministryId) || null;

    const cpsRaw = childrensPrograms.filter((cp) => cp.serviceId === service.id && cp.isActive);

    const cps = cpsRaw.map((cp) => ({
      id: cp.id,
      name: cp.name,
      description: cp.description || '',
      ageMin: cp.ageMin,
      ageMax: cp.ageMax,
      ageRangeLabel: 'Ages ' + cp.ageMin + '' + cp.ageMax,
      checkinStartTime: cp.checkinStartTime || '',
      programStartDateTime: cp.programStartDateTime || null,
      programEndDateTime: cp.programEndDateTime || null,
      location: cp.location || '',
      capacity: cp.capacity != null ? cp.capacity : null,
      isActive: !!cp.isActive,
      isInCurrentVisitPlan: !!(plan && plan.childrenProgramIds && plan.childrenProgramIds.indexOf(cp.id) !== -1),
      serviceId: cp.serviceId,
      service: service
    }));

    const resultService = {
      id: service.id,
      name: service.name,
      description: service.description || '',
      startDateTime: service.startDateTime,
      endDateTime: service.endDateTime,
      dayOfWeek: service.dayOfWeek,
      serviceStyle: service.serviceStyle || null,
      serviceLocation: service.serviceLocation || null,
      hasChildrenProgram: !!service.hasChildrenProgram,
      teachingPastorName: pastor ? pastor.fullName : null,
      teachingPastorPhotoUrl: pastor ? pastor.photoUrl || null : null,
      isActive: !!service.isActive,
      teachingPastorId: service.teachingPastorId || null,
      teachingPastor: pastor,
      ministryId: service.ministryId || null,
      ministry: ministry
    };

    return {
      service: resultService,
      childrensPrograms: cps,
      isInCurrentVisitPlan: inPlan
    };
  }

  addServiceToVisitPlan(serviceId) {
    const worshipServices = this._getFromStorage('worship_services', []);
    const childrensPrograms = this._getFromStorage('childrens_programs', []);

    const service = worshipServices.find((s) => s.id === serviceId && s.isActive);
    if (!service) {
      return {
        success: false,
        visitPlanId: null,
        status: 'planning',
        message: 'Service not found or inactive',
        visitPlanSummary: null
      };
    }

    const existing = this._getExistingVisitPlan();
    let plan = existing.plan;
    let visitPlans = existing.visitPlans;

    if (!plan) {
      const created = this._getOrCreateVisitPlan(serviceId);
      plan = created.plan;
      visitPlans = created.visitPlans;
    } else {
      plan.serviceId = serviceId;
      const validChildren = childrensPrograms
        .filter((cp) => cp.serviceId === serviceId)
        .map((cp) => cp.id);
      plan.childrenProgramIds = (plan.childrenProgramIds || []).filter((id) => validChildren.indexOf(id) !== -1);
      plan.updatedAt = this._nowIso();
    }

    this._saveToStorage('visit_plans', visitPlans);

    const summary = {
      serviceName: service.name,
      serviceStartDateTime: service.startDateTime,
      serviceEndDateTime: service.endDateTime,
      serviceLocation: service.serviceLocation || '',
      childrenProgramsCount: plan.childrenProgramIds ? plan.childrenProgramIds.length : 0
    };

    return {
      success: true,
      visitPlanId: plan.id,
      status: plan.status,
      message: 'Service added to visit plan',
      visitPlanSummary: summary
    };
  }

  addChildrensProgramToVisitPlan(childrenProgramId) {
    const childrensPrograms = this._getFromStorage('childrens_programs', []);
    const worshipServices = this._getFromStorage('worship_services', []);

    const program = childrensPrograms.find((cp) => cp.id === childrenProgramId && cp.isActive);
    if (!program) {
      return {
        success: false,
        visitPlanId: null,
        status: 'planning',
        message: 'Childrens program not found or inactive',
        visitPlanSummary: null
      };
    }

    const service = worshipServices.find((s) => s.id === program.serviceId && s.isActive);
    if (!service) {
      return {
        success: false,
        visitPlanId: null,
        status: 'planning',
        message: 'Associated service not found or inactive',
        visitPlanSummary: null
      };
    }

    const existing = this._getExistingVisitPlan();
    let plan = existing.plan;
    let visitPlans = existing.visitPlans;

    if (!plan) {
      const created = this._getOrCreateVisitPlan(service.id);
      plan = created.plan;
      visitPlans = created.visitPlans;
    } else {
      plan.serviceId = service.id;
    }

    if (!plan.childrenProgramIds) plan.childrenProgramIds = [];
    if (plan.childrenProgramIds.indexOf(childrenProgramId) === -1) {
      plan.childrenProgramIds.push(childrenProgramId);
    }
    plan.updatedAt = this._nowIso();

    this._saveToStorage('visit_plans', visitPlans);

    const selectedPrograms = childrensPrograms.filter((cp) => plan.childrenProgramIds.indexOf(cp.id) !== -1);
    const childrenProgramsSummary = selectedPrograms.map((cp) => ({
      id: cp.id,
      name: cp.name,
      ageRangeLabel: 'Ages ' + cp.ageMin + '' + cp.ageMax,
      location: cp.location || ''
    }));

    const summary = {
      serviceName: service.name,
      serviceStartDateTime: service.startDateTime,
      childrenPrograms: childrenProgramsSummary
    };

    return {
      success: true,
      visitPlanId: plan.id,
      status: plan.status,
      message: 'Childrens program added to visit plan',
      visitPlanSummary: summary
    };
  }

  getCurrentVisitPlanSummary() {
    const { plan } = this._getExistingVisitPlan();
    if (!plan) {
      return {
        hasPlan: false,
        visitPlan: null
      };
    }

    const worshipServices = this._getFromStorage('worship_services', []);
    const childrensPrograms = this._getFromStorage('childrens_programs', []);

    const service = worshipServices.find((s) => s.id === plan.serviceId) || null;
    const children = childrensPrograms.filter((cp) => (plan.childrenProgramIds || []).indexOf(cp.id) !== -1);

    const serviceSummary = service
      ? {
          serviceId: service.id,
          name: service.name,
          startDateTime: service.startDateTime,
          endDateTime: service.endDateTime,
          dayOfWeek: service.dayOfWeek,
          serviceLocation: service.serviceLocation || ''
        }
      : null;

    const childrenSummaries = children.map((cp) => ({
      id: cp.id,
      name: cp.name,
      ageRangeLabel: 'Ages ' + cp.ageMin + '' + cp.ageMax,
      location: cp.location || ''
    }));

    return {
      hasPlan: true,
      visitPlan: {
        id: plan.id,
        status: plan.status,
        service: serviceSummary,
        childrenPrograms: childrenSummaries,
        notes: plan.notes || ''
      }
    };
  }

  // ----------------------
  // Events & Calendar
  // ----------------------

  _formatCategoryLabel(value) {
    if (!value) return '';
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  getEventFilterOptions() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const dateRangePresets = [
      {
        key: 'this_month',
        label: 'This Month',
        startDate: this._getDateOnlyIso(startOfMonth),
        endDate: this._getDateOnlyIso(endOfMonth)
      }
    ];

    return {
      categoryOptions: [
        { value: 'classes_workshops', label: 'Classes & Workshops' },
        { value: 'community', label: 'Community Events' },
        { value: 'worship_service', label: 'Worship Services' },
        { value: 'youth_ministry', label: 'Youth Ministry' },
        { value: 'volunteer_training', label: 'Volunteer Training' },
        { value: 'other', label: 'Other' }
      ],
      dateRangePresets: dateRangePresets,
      dayOfWeekOptions: this._dayOfWeekNames.slice(),
      timeRangePresets: [
        { key: 'evening', label: 'Evening (5:00pm+)', timeFrom: '17:00', timeTo: '23:59' }
      ],
      priceOptions: [
        { value: 'any', label: 'Any Price' },
        { value: 'free_only', label: 'Free Only' },
        { value: 'paid_only', label: 'Paid Only' }
      ],
      sortOptions: [
        { value: 'date_earliest', label: 'Date  Earliest First' },
        { value: 'date_latest', label: 'Date  Latest First' },
        { value: 'name_az', label: 'Name AZ' },
        { value: 'recommended', label: 'Recommended' }
      ]
    };
  }

  searchEvents(query, filters, viewType, sortBy, page, pageSize) {
    let events = this._getFromStorage('events', []);
    const { list: savedList } = this._getOrCreateSavedEventList();
    const ministries = this._getFromStorage('ministries', []);

    events = events.filter((e) => e.isActive);

    const q = query && typeof query === 'string' ? query.trim().toLowerCase() : '';
    if (q) {
      events = events.filter((e) => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    if (filters && typeof filters === 'object') {
      const f = filters;
      if (f.category) {
        events = events.filter((e) => e.category === f.category);
      }
      if (f.dateFrom) {
        const df = this._parseIsoDate(f.dateFrom);
        if (df) {
          events = events.filter((e) => {
            const d = this._parseIsoDate(e.startDateTime);
            return d && d >= df;
          });
        }
      }
      if (f.dateTo) {
        const dt = this._parseIsoDate(f.dateTo);
        if (dt) {
          events = events.filter((e) => {
            const d = this._parseIsoDate(e.startDateTime);
            return d && d <= dt;
          });
        }
      }
      if (Array.isArray(f.daysOfWeek) && f.daysOfWeek.length) {
        const allowed = new Set(f.daysOfWeek);
        events = events.filter((e) => {
          const d = this._parseIsoDate(e.startDateTime);
          if (!d) return false;
          const day = this._getDayOfWeekString(d);
          return allowed.has(day);
        });
      }
      if (f.timeFrom || f.timeTo) {
        const fromMinutes = this._timeToMinutes(f.timeFrom);
        const toMinutes = this._timeToMinutes(f.timeTo);
        events = events.filter((e) => {
          const d = this._parseIsoDate(e.startDateTime);
          if (!d) return false;
          const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
          if (fromMinutes != null && minutes < fromMinutes) return false;
          if (toMinutes != null && minutes > toMinutes) return false;
          return true;
        });
      }
      if (f.priceFilter === 'free_only') {
        events = events.filter((e) => e.isFree || e.price === 0);
      } else if (f.priceFilter === 'paid_only') {
        events = events.filter((e) => !e.isFree && e.price > 0);
      }
    }

    if (!sortBy) sortBy = 'date_earliest';

    events.sort((a, b) => {
      if (sortBy === 'name_az') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'date_latest') {
        const da = this._parseIsoDate(a.startDateTime);
        const db = this._parseIsoDate(b.startDateTime);
        return db - da;
      }
      // date_earliest or recommended
      const da = this._parseIsoDate(a.startDateTime);
      const db = this._parseIsoDate(b.startDateTime);
      return da - db;
    });

    const totalCount = events.length;
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (p - 1) * size;
    const endIndex = startIndex + size;
    const pageItems = events.slice(startIndex, endIndex);

    const savedIds = new Set(savedList.eventIds || []);

    const mapped = pageItems.map((e) => {
      const ministry = ministries.find((m) => m.id === e.ministryId) || null;
      return {
        eventId: e.id,
        title: e.title,
        descriptionSnippet: (e.description || '').slice(0, 200),
        category: e.category,
        categoryLabel: this._formatCategoryLabel(e.category),
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime,
        location: e.location || '',
        isFree: !!e.isFree,
        price: e.price,
        capacity: e.capacity != null ? e.capacity : null,
        remainingCapacity: e.remainingCapacity != null ? e.remainingCapacity : null,
        isActive: !!e.isActive,
        isSaved: savedIds.has(e.id),
        event: e,
        ministryId: e.ministryId || null,
        ministry: ministry
      };
    });

    return {
      events: mapped,
      totalCount: totalCount,
      hasMore: endIndex < totalCount
    };
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const { list: savedList } = this._getOrCreateSavedEventList();
    const ministries = this._getFromStorage('ministries', []);

    const e = events.find((ev) => ev.id === eventId) || null;
    if (!e) {
      return {
        event: null,
        isSavedToMyEvents: false
      };
    }

    const ministry = ministries.find((m) => m.id === e.ministryId) || null;
    const isSaved = (savedList.eventIds || []).indexOf(e.id) !== -1;

    return {
      event: {
        id: e.id,
        title: e.title,
        description: e.description || '',
        category: e.category,
        categoryLabel: this._formatCategoryLabel(e.category),
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime,
        location: e.location || '',
        price: e.price,
        isFree: !!e.isFree,
        capacity: e.capacity != null ? e.capacity : null,
        remainingCapacity: e.remainingCapacity != null ? e.remainingCapacity : null,
        isActive: !!e.isActive,
        ministryId: e.ministryId || null,
        ministry: ministry
      },
      isSavedToMyEvents: isSaved
    };
  }

  registerForEvent(eventId, registrantName, registrantEmail, attendeeCount, addToMyEvents) {
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const event = events.find((e) => e.id === eventId && e.isActive);
    if (!event) {
      return {
        success: false,
        registrationId: null,
        status: 'pending',
        message: 'Event not found or inactive'
      };
    }

    const count = typeof attendeeCount === 'number' && attendeeCount > 0 ? attendeeCount : 1;

    if (typeof event.remainingCapacity === 'number') {
      if (event.remainingCapacity < count) {
        return {
          success: false,
          registrationId: null,
          status: 'pending',
          message: 'Not enough capacity for requested attendees'
        };
      }
      event.remainingCapacity -= count;
      if (event.remainingCapacity < 0) event.remainingCapacity = 0;
    }

    const registration = {
      id: this._generateId('event_registration'),
      eventId: event.id,
      registrantName: registrantName,
      registrantEmail: registrantEmail,
      attendeeCount: count,
      registrationDateTime: this._nowIso(),
      status: 'confirmed'
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);
    this._saveToStorage('events', events);

    if (addToMyEvents) {
      this.saveEventToMyEvents(event.id);
    }

    return {
      success: true,
      registrationId: registration.id,
      status: registration.status,
      message: 'Registration completed'
    };
  }

  saveEventToMyEvents(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return {
        success: false,
        savedEventListId: null,
        isNewlyAdded: false,
        message: 'Event not found'
      };
    }

    const { list, lists } = this._getOrCreateSavedEventList();
    if (!list.eventIds) list.eventIds = [];

    let isNewlyAdded = false;
    if (list.eventIds.indexOf(eventId) === -1) {
      list.eventIds.push(eventId);
      list.updatedAt = this._nowIso();
      isNewlyAdded = true;
      this._saveToStorage('saved_event_lists', lists);
    }

    return {
      success: true,
      savedEventListId: list.id,
      isNewlyAdded: isNewlyAdded,
      message: isNewlyAdded ? 'Event saved to My Events' : 'Event was already in My Events'
    };
  }

  getMyEvents() {
    const { list } = this._getOrCreateSavedEventList();
    const eventsById = this._eventsMapById();

    const resultEvents = (list.eventIds || []).map((id) => {
      const e = eventsById[id];
      if (!e) return null;
      return {
        eventId: e.id,
        title: e.title,
        category: e.category,
        categoryLabel: this._formatCategoryLabel(e.category),
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime,
        location: e.location || '',
        isFree: !!e.isFree,
        price: e.price,
        event: e
      };
    }).filter(Boolean);

    return {
      savedEventListId: list.id,
      events: resultEvents
    };
  }

  removeEventFromMyEvents(eventId) {
    const { list, lists } = this._getOrCreateSavedEventList();
    if (!list.eventIds) list.eventIds = [];

    const index = list.eventIds.indexOf(eventId);
    if (index === -1) {
      return {
        success: false,
        savedEventListId: list.id,
        message: 'Event not found in My Events'
      };
    }

    list.eventIds.splice(index, 1);
    list.updatedAt = this._nowIso();
    this._saveToStorage('saved_event_lists', lists);

    return {
      success: true,
      savedEventListId: list.id,
      message: 'Event removed from My Events'
    };
  }

  // ----------------------
  // Room reservations
  // ----------------------

  searchAvailableRooms(date, startTime, endTime, expectedAttendees) {
    const rooms = this._getFromStorage('rooms', []);
    const reservations = this._getFromStorage('room_reservation_requests', []);

    const dtRange = this._validateAndBuildDateTimeRange(date, startTime, endTime);
    if (!dtRange.valid) {
      return { rooms: [] };
    }

    const start = dtRange.startDateTime;
    const end = dtRange.endDateTime;

    const availableRooms = rooms.filter((room) => {
      if (!room.isActive) return false;
      if (typeof room.capacityMin === 'number' && expectedAttendees < room.capacityMin) return false;
      if (typeof room.capacityMax === 'number' && expectedAttendees > room.capacityMax) return false;

      const conflicting = reservations.some((r) => {
        if (r.roomId !== room.id) return false;
        const rDate = this._parseIsoDate(r.date);
        if (!rDate) return false;
        const requestedDate = this._parseIsoDate(date);
        if (!requestedDate) return false;
        if (this._getDateOnlyIso(rDate) !== this._getDateOnlyIso(requestedDate)) return false;
        const rStart = this._parseIsoDate(r.startDateTime);
        const rEnd = this._parseIsoDate(r.endDateTime);
        if (!rStart || !rEnd) return false;
        return rStart < end && start < rEnd;
      });

      return !conflicting;
    });

    const mapped = availableRooms.map((room) => ({
      roomId: room.id,
      name: room.name,
      description: room.description || '',
      capacityMin: room.capacityMin,
      capacityMax: room.capacityMax,
      location: room.location || '',
      amenities: room.amenities || [],
      isActive: !!room.isActive,
      selectedDate: date,
      selectedStartTime: startTime,
      selectedEndTime: endTime,
      room: room
    }));

    return {
      rooms: mapped
    };
  }

  getRoomDetailsForReservation(roomId, date, startTime, endTime) {
    const rooms = this._getFromStorage('rooms', []);
    const room = rooms.find((r) => r.id === roomId) || null;

    if (!room) {
      return {
        room: null,
        reservationDefaults: {
          date: date,
          startTime: startTime,
          endTime: endTime,
          suggestedMinAttendees: null,
          suggestedMaxAttendees: null
        }
      };
    }

    return {
      room: {
        id: room.id,
        name: room.name,
        description: room.description || '',
        capacityMin: room.capacityMin,
        capacityMax: room.capacityMax,
        location: room.location || '',
        amenities: room.amenities || []
      },
      reservationDefaults: {
        date: date,
        startTime: startTime,
        endTime: endTime,
        suggestedMinAttendees: room.capacityMin,
        suggestedMaxAttendees: room.capacityMax
      }
    };
  }

  submitRoomReservationRequest(roomId, groupName, contactName, contactEmail, date, startTime, endTime, expectedAttendees, notes) {
    const rooms = this._getFromStorage('rooms', []);
    const reservations = this._getFromStorage('room_reservation_requests', []);

    const room = rooms.find((r) => r.id === roomId && r.isActive);
    if (!room) {
      return {
        success: false,
        reservationRequestId: null,
        status: 'pending',
        message: 'Room not found or inactive',
        reservationSummary: null
      };
    }

    const dtRange = this._validateAndBuildDateTimeRange(date, startTime, endTime);
    if (!dtRange.valid) {
      return {
        success: false,
        reservationRequestId: null,
        status: 'pending',
        message: 'Invalid date or time range',
        reservationSummary: null
      };
    }

    const start = dtRange.startDateTime;
    const end = dtRange.endDateTime;

    const conflicting = reservations.some((r) => {
      if (r.roomId !== room.id) return false;
      const rDate = this._parseIsoDate(r.date);
      if (!rDate) return false;
      const requestedDate = this._parseIsoDate(date);
      if (!requestedDate) return false;
      if (this._getDateOnlyIso(rDate) !== this._getDateOnlyIso(requestedDate)) return false;
      const rStart = this._parseIsoDate(r.startDateTime);
      const rEnd = this._parseIsoDate(r.endDateTime);
      if (!rStart || !rEnd) return false;
      return rStart < end && start < rEnd;
    });

    if (conflicting) {
      return {
        success: false,
        reservationRequestId: null,
        status: 'pending',
        message: 'Selected time is no longer available',
        reservationSummary: null
      };
    }

    const nowIso = this._nowIso();

    const reservation = {
      id: this._generateId('room_reservation'),
      roomId: room.id,
      groupName: groupName,
      contactName: contactName,
      contactEmail: contactEmail,
      date: date,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      expectedAttendees: expectedAttendees,
      status: 'pending',
      submittedAt: nowIso,
      notes: notes || ''
    };

    reservations.push(reservation);
    this._saveToStorage('room_reservation_requests', reservations);

    return {
      success: true,
      reservationRequestId: reservation.id,
      status: reservation.status,
      message: 'Reservation request submitted',
      reservationSummary: {
        roomName: room.name,
        date: date,
        startTime: startTime,
        endTime: endTime
      }
    };
  }

  // ----------------------
  // Sermons / Watch Later
  // ----------------------

  getSermonFilterOptions() {
    const sermons = this._getFromStorage('sermons', []);

    const topicSet = new Set();
    const speakerSet = new Set();
    const seriesSet = new Set();

    sermons.forEach((s) => {
      (s.topics || []).forEach((t) => {
        if (t) topicSet.add(t);
      });
      if (s.speakerName) speakerSet.add(s.speakerName);
      if (s.series) seriesSet.add(s.series);
    });

    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());

    return {
      dateRangePresets: [
        {
          key: 'last_6_months',
          label: 'Last 6 Months',
          startDate: this._getDateOnlyIso(sixMonthsAgo),
          endDate: this._getDateOnlyIso(today)
        }
      ],
      topicOptions: Array.from(topicSet),
      speakerOptions: Array.from(speakerSet),
      seriesOptions: Array.from(seriesSet),
      sortOptions: [
        { value: 'date_newest', label: 'Date  Newest First' },
        { value: 'date_oldest', label: 'Date  Oldest First' }
      ]
    };
  }

  searchSermons(query, filters, sortBy, page, pageSize) {
    let sermons = this._getFromStorage('sermons', []);
    const { playlist } = this._getOrCreateWatchLaterPlaylist();
    const pastors = this._getFromStorage('pastors', []);

    sermons = sermons.filter((s) => s.isActive);

    const q = query && typeof query === 'string' ? query.trim().toLowerCase() : '';
    if (q) {
      sermons = sermons.filter((s) => {
        const title = (s.title || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const topics = (s.topics || []).join(' ').toLowerCase();
        return title.includes(q) || desc.includes(q) || topics.includes(q);
      });
    }

    if (filters && typeof filters === 'object') {
      const f = filters;
      if (f.dateFrom) {
        const df = this._parseIsoDate(f.dateFrom);
        if (df) {
          sermons = sermons.filter((s) => {
            const d = this._parseIsoDate(s.date);
            return d && d >= df;
          });
        }
      }
      if (f.dateTo) {
        const dt = this._parseIsoDate(f.dateTo);
        if (dt) {
          sermons = sermons.filter((s) => {
            const d = this._parseIsoDate(s.date);
            return d && d <= dt;
          });
        }
      }
      if (Array.isArray(f.topics) && f.topics.length) {
        const required = new Set(f.topics);
        sermons = sermons.filter((s) => {
          const topics = s.topics || [];
          return topics.some((t) => required.has(t));
        });
      }
      if (f.speakerName) {
        sermons = sermons.filter((s) => s.speakerName === f.speakerName);
      }
      if (f.series) {
        sermons = sermons.filter((s) => s.series === f.series);
      }
    }

    if (!sortBy) sortBy = 'date_newest';

    sermons.sort((a, b) => {
      const da = this._parseIsoDate(a.date);
      const db = this._parseIsoDate(b.date);
      if (sortBy === 'date_oldest') return da - db;
      return db - da;
    });

    const totalCount = sermons.length;
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (p - 1) * size;
    const endIndex = startIndex + size;
    const pageItems = sermons.slice(startIndex, endIndex);

    const watchSet = new Set(playlist.sermonIds || []);

    const mapped = pageItems.map((s) => {
      const pastor = pastors.find((p) => p.id === s.pastorId) || null;
      return {
        sermonId: s.id,
        title: s.title,
        descriptionSnippet: (s.description || '').slice(0, 200),
        date: s.date,
        speakerName: s.speakerName,
        topics: s.topics || [],
        series: s.series || '',
        scriptureReference: s.scriptureReference || '',
        videoUrl: s.videoUrl || '',
        audioUrl: s.audioUrl || '',
        durationMinutes: s.durationMinutes != null ? s.durationMinutes : null,
        isInWatchLater: watchSet.has(s.id),
        sermon: s,
        pastorId: s.pastorId || null,
        pastor: pastor
      };
    });

    return {
      sermons: mapped,
      totalCount: totalCount,
      hasMore: endIndex < totalCount
    };
  }

  getSermonDetails(sermonId) {
    const sermons = this._getFromStorage('sermons', []);
    const { playlist } = this._getOrCreateWatchLaterPlaylist();
    const pastors = this._getFromStorage('pastors', []);

    const s = sermons.find((ser) => ser.id === sermonId) || null;
    if (!s) {
      return {
        sermon: null
      };
    }

    const inWatchLater = (playlist.sermonIds || []).indexOf(s.id) !== -1;
    const pastor = pastors.find((p) => p.id === s.pastorId) || null;

    return {
      sermon: {
        id: s.id,
        title: s.title,
        description: s.description || '',
        date: s.date,
        speakerName: s.speakerName,
        topics: s.topics || [],
        series: s.series || '',
        scriptureReference: s.scriptureReference || '',
        videoUrl: s.videoUrl || '',
        audioUrl: s.audioUrl || '',
        durationMinutes: s.durationMinutes != null ? s.durationMinutes : null,
        isInWatchLater: inWatchLater,
        pastorId: s.pastorId || null,
        pastor: pastor
      }
    };
  }

  addSermonToWatchLater(sermonId) {
    const sermons = this._getFromStorage('sermons', []);
    const sermon = sermons.find((s) => s.id === sermonId);
    if (!sermon) {
      return {
        success: false,
        playlistId: null,
        isNewlyAdded: false,
        message: 'Sermon not found'
      };
    }

    const { playlist, lists } = this._getOrCreateWatchLaterPlaylist();
    if (!playlist.sermonIds) playlist.sermonIds = [];

    let isNewlyAdded = false;
    if (playlist.sermonIds.indexOf(sermonId) === -1) {
      playlist.sermonIds.push(sermonId);
      playlist.updatedAt = this._nowIso();
      isNewlyAdded = true;
      this._saveToStorage('watch_later_playlists', lists);
    }

    return {
      success: true,
      playlistId: playlist.id,
      isNewlyAdded: isNewlyAdded,
      message: isNewlyAdded ? 'Sermon added to Watch Later' : 'Sermon was already in Watch Later'
    };
  }

  getWatchLaterPlaylist() {
    const { playlist } = this._getOrCreateWatchLaterPlaylist();
    const sermonsById = this._sermonsMapById();

    const sermons = (playlist.sermonIds || []).map((id) => {
      const s = sermonsById[id];
      if (!s) return null;
      return {
        sermonId: s.id,
        title: s.title,
        date: s.date,
        speakerName: s.speakerName,
        topics: s.topics || [],
        series: s.series || '',
        videoUrl: s.videoUrl || '',
        audioUrl: s.audioUrl || '',
        durationMinutes: s.durationMinutes != null ? s.durationMinutes : null,
        sermon: s
      };
    }).filter(Boolean);

    return {
      playlistId: playlist.id,
      name: playlist.name,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
      sermons: sermons
    };
  }

  removeSermonFromWatchLater(sermonId) {
    const { playlist, lists } = this._getOrCreateWatchLaterPlaylist();
    if (!playlist.sermonIds) playlist.sermonIds = [];

    const index = playlist.sermonIds.indexOf(sermonId);
    if (index === -1) {
      return {
        success: false,
        playlistId: playlist.id,
        message: 'Sermon not found in Watch Later'
      };
    }

    playlist.sermonIds.splice(index, 1);
    playlist.updatedAt = this._nowIso();
    this._saveToStorage('watch_later_playlists', lists);

    return {
      success: true,
      playlistId: playlist.id,
      message: 'Sermon removed from Watch Later'
    };
  }

  // ----------------------
  // Volunteer / Serve
  // ----------------------

  getVolunteerFilterOptions() {
    return {
      dayOfWeekOptions: this._dayOfWeekNames.slice(),
      timeCommitmentOptions: [
        { value: 'under_3_hours', label: 'Under 3 hours/week', maxHoursPerWeek: 3 },
        { value: '3_to_5_hours', label: '3 5 hours/week', maxHoursPerWeek: 5 },
        { value: 'over_5_hours', label: 'Over 5 hours/week', maxHoursPerWeek: null }
      ],
      categoryOptions: [
        { value: 'guest_services', label: 'Guest Services' },
        { value: 'childrens', label: 'Childrens Ministry' },
        { value: 'youth', label: 'Youth Ministry' },
        { value: 'outreach', label: 'Outreach' },
        { value: 'worship', label: 'Worship' },
        { value: 'admin', label: 'Administration' },
        { value: 'other', label: 'Other' }
      ],
      sortOptions: [
        { value: 'name_az', label: 'Name AZ' },
        { value: 'recommended', label: 'Recommended' }
      ]
    };
  }

  searchVolunteerRoles(filters, sortBy, page, pageSize) {
    let roles = this._getFromStorage('volunteer_roles', []);
    roles = roles.filter((r) => r.isActive);

    if (filters && typeof filters === 'object') {
      const f = filters;
      if (Array.isArray(f.daysOfWeek) && f.daysOfWeek.length) {
        const required = new Set(f.daysOfWeek);
        roles = roles.filter((r) => {
          const days = r.daysNeeded || [];
          return days.some((d) => required.has(d));
        });
      }
      if (typeof f.maxHoursPerWeek === 'number') {
        roles = roles.filter((r) => typeof r.hoursPerWeek === 'number' && r.hoursPerWeek <= f.maxHoursPerWeek);
      }
      if (f.category) {
        roles = roles.filter((r) => r.category === f.category);
      }
    }

    if (!sortBy) sortBy = 'name_az';

    roles.sort((a, b) => {
      if (sortBy === 'name_az') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // recommended fallback: same as name_az
      return (a.title || '').localeCompare(b.title || '');
    });

    const totalCount = roles.length;
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 50;
    const startIndex = (p - 1) * size;
    const endIndex = startIndex + size;
    const pageItems = roles.slice(startIndex, endIndex);

    const mapped = pageItems.map((r) => ({
      volunteerRoleId: r.id,
      title: r.title,
      ministryArea: r.ministryArea || null,
      category: r.category || null,
      daysNeeded: r.daysNeeded || [],
      timeWindowStart: r.timeWindowStart || null,
      timeWindowEnd: r.timeWindowEnd || null,
      hoursPerWeek: r.hoursPerWeek,
      location: r.location || '',
      isActive: !!r.isActive,
      role: r,
      ministryId: r.ministryId || null,
      ministry: r.ministryId ? this._findMinistryById(r.ministryId) : null
    }));

    return {
      roles: mapped,
      totalCount: totalCount,
      hasMore: endIndex < totalCount
    };
  }

  getVolunteerRoleDetails(volunteerRoleId) {
    const roles = this._getFromStorage('volunteer_roles', []);
    const role = roles.find((r) => r.id === volunteerRoleId) || null;

    if (!role) {
      return {
        role: null
      };
    }

    return {
      role: {
        id: role.id,
        title: role.title,
        description: role.description || '',
        ministryArea: role.ministryArea || null,
        category: role.category || null,
        daysNeeded: role.daysNeeded || [],
        timeWindowStart: role.timeWindowStart || null,
        timeWindowEnd: role.timeWindowEnd || null,
        hoursPerWeek: role.hoursPerWeek,
        requiredSkills: role.requiredSkills || '',
        location: role.location || '',
        contactName: role.contactName || '',
        contactEmail: role.contactEmail || '',
        isActive: !!role.isActive,
        ministryId: role.ministryId || null,
        ministry: role.ministryId ? this._findMinistryById(role.ministryId) : null
      }
    };
  }

  submitVolunteerInterest(volunteerRoleId, name, email, preferredDay, preferredTimeWindowStart, preferredTimeWindowEnd, notes) {
    const roles = this._getFromStorage('volunteer_roles', []);
    const interests = this._getFromStorage('volunteer_interests', []);

    const role = roles.find((r) => r.id === volunteerRoleId && r.isActive);
    if (!role) {
      return {
        success: false,
        volunteerInterestId: null,
        status: 'pending',
        message: 'Volunteer role not found or inactive'
      };
    }

    const interest = {
      id: this._generateId('volunteer_interest'),
      volunteerRoleId: role.id,
      name: name,
      email: email,
      preferredDay: preferredDay,
      preferredTimeWindowStart: preferredTimeWindowStart || null,
      preferredTimeWindowEnd: preferredTimeWindowEnd || null,
      notes: notes || '',
      submittedAt: this._nowIso(),
      status: 'pending'
    };

    interests.push(interest);
    this._saveToStorage('volunteer_interests', interests);

    return {
      success: true,
      volunteerInterestId: interest.id,
      status: interest.status,
      message: 'Volunteer interest submitted'
    };
  }

  // ----------------------
  // Giving / Pledges
  // ----------------------

  getGivingOptions() {
    const funds = this._getFromStorage('funds', []);

    const visibleFunds = funds.map((f, index) => ({
      fundId: f.id,
      name: f.name,
      description: f.description || '',
      isActive: !!f.isActive,
      isVisibleOnline: !!f.isVisibleOnline,
      isDefault: false
    }));

    const firstVisibleIndex = visibleFunds.findIndex((f) => f.isVisibleOnline && f.isActive);
    if (firstVisibleIndex !== -1) {
      visibleFunds[firstVisibleIndex].isDefault = true;
    }

    const givingTypes = [
      { value: 'pledge_only', label: 'Pledge Only (no immediate payment)' },
      { value: 'immediate_donation', label: 'Immediate Donation' }
    ];

    const frequencyOptions = [
      { value: 'one_time', label: 'One-Time' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Every 2 Weeks' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annually', label: 'Annually' }
    ];

    return {
      funds: visibleFunds,
      givingTypes: givingTypes,
      frequencyOptions: frequencyOptions,
      defaultGivingType: 'pledge_only',
      defaultFrequency: 'one_time'
    };
  }

  submitPledge(fundId, amount, givingType, frequency, donorName, donorEmail, startDate, notes) {
    const funds = this._getFromStorage('funds', []);
    const pledges = this._getFromStorage('pledges', []);

    const fund = funds.find((f) => f.id === fundId && f.isActive && f.isVisibleOnline);
    if (!fund) {
      return {
        success: false,
        pledgeId: null,
        status: 'cancelled',
        message: 'Selected fund not available online',
        summary: null
      };
    }

    const amt = typeof amount === 'number' ? amount : parseFloat(amount);
    if (!(amt > 0)) {
      return {
        success: false,
        pledgeId: null,
        status: 'cancelled',
        message: 'Invalid pledge amount',
        summary: null
      };
    }

    const nowIso = this._nowIso();
    const startDateIso = startDate || nowIso;

    const pledge = {
      id: this._generateId('pledge'),
      fundId: fund.id,
      amount: amt,
      givingType: givingType,
      frequency: frequency,
      donorName: donorName,
      donorEmail: donorEmail,
      createdAt: nowIso,
      startDate: startDateIso,
      status: 'active',
      notes: notes || ''
    };

    pledges.push(pledge);
    this._saveToStorage('pledges', pledges);

    return {
      success: true,
      pledgeId: pledge.id,
      status: pledge.status,
      message: 'Pledge submitted',
      summary: {
        fundName: fund.name,
        amount: pledge.amount,
        givingType: pledge.givingType,
        frequency: pledge.frequency
      }
    };
  }

  // ----------------------
  // Care & Counseling
  // ----------------------

  getCareOverview() {
    const careContent = this._getFromStorage('care_overview_content', {});
    const pastors = this._getFromStorage('pastors', []);

    const introText = careContent.introText || '';

    const specialtySet = new Set();
    pastors.forEach((p) => {
      (p.specialties || []).forEach((s) => {
        if (s) specialtySet.add(s);
      });
    });

    const careAreas = Array.from(specialtySet).map((key) => ({
      key: key,
      label: this._formatCategoryLabel(key),
      description: ''
    }));

    const featuredPastors = pastors
      .filter((p) => p.isCounselor && p.isActive)
      .slice(0, 5)
      .map((p) => ({
        pastorId: p.id,
        fullName: p.fullName,
        photoUrl: p.photoUrl || '',
        bioSnippet: (p.bio || '').slice(0, 200),
        specialties: p.specialties || [],
        isCounselor: !!p.isCounselor,
        pastor: p
      }));

    return {
      introText: introText,
      careAreas: careAreas,
      featuredPastors: featuredPastors
    };
  }

  getPastorFilterOptions() {
    const pastors = this._getFromStorage('pastors', []);
    const specialtySet = new Set();

    pastors.forEach((p) => {
      (p.specialties || []).forEach((s) => {
        if (s) specialtySet.add(s);
      });
    });

    return {
      specialtyOptions: Array.from(specialtySet),
      sortOptions: [
        { value: 'name_az', label: 'Name AZ' }
      ]
    };
  }

  searchPastors(filters, sortBy) {
    let pastors = this._getFromStorage('pastors', []);

    if (filters && typeof filters === 'object') {
      const f = filters;
      if (Array.isArray(f.specialties) && f.specialties.length) {
        const required = new Set(f.specialties);
        pastors = pastors.filter((p) => {
          const specs = p.specialties || [];
          return specs.some((s) => required.has(s));
        });
      }
      if (f.isCounselor === true) {
        pastors = pastors.filter((p) => p.isCounselor);
      }
    }

    if (!sortBy) sortBy = 'name_az';

    pastors.sort((a, b) => {
      if (sortBy === 'name_az') {
        return (a.fullName || '').localeCompare(b.fullName || '');
      }
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

    const mapped = pastors.map((p) => ({
      pastorId: p.id,
      fullName: p.fullName,
      photoUrl: p.photoUrl || '',
      bioSnippet: (p.bio || '').slice(0, 200),
      specialties: p.specialties || [],
      email: p.email || '',
      isCounselor: !!p.isCounselor,
      pastor: p
    }));

    return {
      pastors: mapped
    };
  }

  getPastorProfile(pastorId) {
    const pastors = this._getFromStorage('pastors', []);
    const pastor = pastors.find((p) => p.id === pastorId) || null;

    if (!pastor) {
      return {
        pastor: null
      };
    }

    return {
      pastor: {
        id: pastor.id,
        fullName: pastor.fullName,
        bio: pastor.bio || '',
        photoUrl: pastor.photoUrl || '',
        email: pastor.email || '',
        phone: pastor.phone || '',
        specialties: pastor.specialties || [],
        isCounselor: !!pastor.isCounselor,
        isActive: !!pastor.isActive
      }
    };
  }

  getCounselingAvailabilityForPastor(pastorId, dateFrom, dateTo, timeFrom, timeTo) {
    const slots = this._getFromStorage('counseling_availability_slots', []);

    const df = this._parseIsoDate(dateFrom);
    const dt = this._parseIsoDate(dateTo);
    if (!df || !dt) {
      return { slots: [] };
    }

    const fromMinutes = this._timeToMinutes(timeFrom);
    const toMinutes = this._timeToMinutes(timeTo);

    const filteredSlots = slots.filter((s) => {
      if (s.pastorId !== pastorId) return false;
      if (s.isBooked) return false;
      const start = this._parseIsoDate(s.startDateTime);
      if (!start) return false;
      if (start < df || start > dt) return false;
      if (fromMinutes != null || toMinutes != null) {
        const minutes = start.getUTCHours() * 60 + start.getUTCMinutes();
        if (fromMinutes != null && minutes < fromMinutes) return false;
        if (toMinutes != null && minutes > toMinutes) return false;
      }
      return true;
    });

    const mapped = filteredSlots.map((s) => ({
      availabilitySlotId: s.id,
      startDateTime: s.startDateTime,
      endDateTime: s.endDateTime,
      isBooked: !!s.isBooked,
      location: s.location || '',
      pastorId: s.pastorId,
      pastor: this._findPastorById(s.pastorId)
    }));

    return {
      slots: mapped
    };
  }

  submitCounselingAppointmentRequest(pastorId, availabilitySlotId, name, email, reason, notes) {
    const slots = this._getFromStorage('counseling_availability_slots', []);
    const requests = this._getFromStorage('counseling_appointment_requests', []);

    const slot = slots.find((s) => s.id === availabilitySlotId && s.pastorId === pastorId);
    if (!slot || slot.isBooked) {
      return {
        success: false,
        appointmentRequestId: null,
        status: 'pending',
        message: 'Selected time slot not available',
        slotSummary: null
      };
    }

    const nowIso = this._nowIso();

    const request = {
      id: this._generateId('counseling_request'),
      pastorId: pastorId,
      availabilitySlotId: availabilitySlotId,
      name: name,
      email: email,
      reason: reason,
      notes: notes || '',
      submittedAt: nowIso,
      status: 'pending'
    };

    requests.push(request);
    slot.isBooked = true;

    this._saveToStorage('counseling_appointment_requests', requests);
    this._saveToStorage('counseling_availability_slots', slots);

    return {
      success: true,
      appointmentRequestId: request.id,
      status: request.status,
      message: 'Counseling appointment request submitted',
      slotSummary: {
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime
      }
    };
  }

  // ----------------------
  // About / Contact / Ministries overview
  // ----------------------

  getAboutPageContent() {
    const about = this._getFromStorage('about_page_content', {});
    const pastors = this._getFromStorage('pastors', []);

    const beliefs = Array.isArray(about.beliefs) ? about.beliefs : [];
    const leadersRaw = Array.isArray(about.leaders) ? about.leaders : [];

    const leaders = leadersRaw.map((l) => {
      const leader = Object.assign({}, l);
      if (leader.pastorId) {
        leader.pastor = pastors.find((p) => p.id === leader.pastorId) || null;
      } else {
        leader.pastor = null;
      }
      return leader;
    });

    return {
      missionText: about.missionText || '',
      visionText: about.visionText || '',
      beliefs: beliefs,
      leaders: leaders
    };
  }

  getContactAndDirections() {
    const contact = this._getFromStorage('contact_and_directions_content', {});

    return {
      address: contact.address || '',
      phone: contact.phone || '',
      generalEmail: contact.generalEmail || '',
      serviceTimesSummary: Array.isArray(contact.serviceTimesSummary) ? contact.serviceTimesSummary : [],
      map: contact.map || {
        latitude: null,
        longitude: null,
        mapProvider: ''
      },
      parkingInfoText: contact.parkingInfoText || ''
    };
  }

  submitContactForm(name, email, message) {
    const submissions = this._getFromStorage('contact_form_submissions', []);

    const submission = {
      id: this._generateId('contact_form'),
      name: name,
      email: email,
      message: message,
      submittedAt: this._nowIso()
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been received'
    };
  }

  getMinistriesOverview() {
    const ministries = this._getFromStorage('ministries', []);
    const funds = this._getFromStorage('funds', []);

    const ministriesMapped = ministries.map((m) => {
      const relatedFund = funds.find((f) => f.id === m.relatedFundId) || null;
      return {
        ministryId: m.id,
        name: m.name,
        description: m.description || '',
        contactName: m.contactName || '',
        contactEmail: m.contactEmail || '',
        relatedFundId: m.relatedFundId || null,
        relatedFundName: relatedFund ? relatedFund.name : null,
        ministry: m,
        relatedFund: relatedFund
      };
    });

    return {
      ministries: ministriesMapped
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
