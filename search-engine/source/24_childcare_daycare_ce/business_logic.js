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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keys = [
      'campuses',
      'age_group_options',
      'programs',
      'program_search_contexts',
      'program_comparisons',
      'enrollment_applications',
      'waitlist_entries',
      'tour_requests',
      'tuition_quotes',
      'teachers',
      'teacher_favorites',
      'events',
      'event_rsvps',
      'articles',
      'contact_messages',
      'newsletter_topics',
      'newsletter_subscriptions',
      // helper/state tables
      'tuition_calculator_state'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        // Use empty array for collections, null for single-state tables
        const isStateTable = key === 'tuition_calculator_state';
        localStorage.setItem(key, JSON.stringify(isStateTable ? null : []));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  _nowISO() {
    return new Date().toISOString();
  }

  _formatCurrencyUSD(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    return '$' + amount.toFixed(2);
  }

  _scheduleTypeLabel(value) {
    const map = {
      full_time_5_days: 'Full-time (5 days/week)',
      half_day: 'Half-day',
      full_day: 'Full-day',
      three_days: '3 days/week',
      extended_day: 'Extended day'
    };
    return map[value] || value || '';
  }

  _timeOfDayLabel(value) {
    const map = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      full_day: 'Full day'
    };
    return map[value] || value || '';
  }

  _parseTimeToMinutes(timeStr) {
    // expects 'HH:MM'
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  }

  _classifyTimeOfDay(hour24) {
    if (hour24 === null || hour24 === undefined || isNaN(hour24)) return null;
    if (hour24 < 12) return 'morning';
    if (hour24 < 17) return 'afternoon';
    return 'evening';
  }

  // -------------------- Helper functions from spec --------------------

  // Internal helper to resolve a postal code to latitude and longitude for distance-based program searches.
  _resolvePostalCodeToCoordinates(postalCode) {
    if (!postalCode) return null;
    const campuses = this._getFromStorage('campuses', []);
    const matches = campuses.filter(
      (c) => c && c.postal_code === postalCode && typeof c.latitude === 'number' && typeof c.longitude === 'number'
    );
    if (!matches.length) return null;
    const avgLat = matches.reduce((sum, c) => sum + c.latitude, 0) / matches.length;
    const avgLon = matches.reduce((sum, c) => sum + c.longitude, 0) / matches.length;
    return { latitude: avgLat, longitude: avgLon };
  }

  // Internal helper to calculate distance in miles between two coordinate pairs.
  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    if (
      [lat1, lon1, lat2, lon2].some(
        (v) => v === null || v === undefined || typeof v !== 'number' || isNaN(v)
      )
    ) {
      return null;
    }
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Internal helper to store and retrieve the most recent tuition calculator configuration and estimate for the current user.
  _getOrUpdateTuitionCalculatorState(action, payload) {
    const key = 'tuition_calculator_state';
    const current = this._getFromStorage(key, null);
    if (action === 'get') {
      return current;
    }
    if (action === 'set') {
      this._saveToStorage(key, payload);
      return payload;
    }
    return current;
  }

  // Internal helper to manage the local storage of TeacherFavorite records for the single user.
  _getOrCreateTeacherFavoritesStore() {
    let favorites = this._getFromStorage('teacher_favorites', []);
    if (!Array.isArray(favorites)) {
      favorites = [];
      this._saveToStorage('teacher_favorites', favorites);
    }
    return favorites;
  }

  // Internal helper to expand a 'YYYY-MM' month string into a concrete start and end date range for event queries.
  _normalizeEventDateRangeForMonth(monthStr) {
    // monthStr: 'YYYY-MM'
    if (!monthStr || typeof monthStr !== 'string') return null;
    const parts = monthStr.split('-');
    if (parts.length !== 2) return null;
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1; // 0-based
    if (isNaN(year) || isNaN(monthIndex)) return null;
    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    return {
      startISO: start.toISOString(),
      endISO: end.toISOString()
    };
  }

  // -------------------- Interface implementations --------------------

  // getHomepageContent
  getHomepageContent() {
    const hero_sections = [
      {
        headline: 'Nurturing care for every child',
        subheadline: 'Discover play-based learning at our campuses.',
        primary_cta_key: 'find_program',
        secondary_cta_key: 'schedule_tour'
      }
    ];

    const programs = this._getFromStorage('programs', []);
    const campuses = this._getFromStorage('campuses', []);
    const ageGroups = this._getFromStorage('age_group_options', []);

    const featured_programs = programs
      .filter((p) => p && p.is_featured)
      .map((program) => {
        const campus = campuses.find((c) => c.id === program.campus_id) || null;
        const ageGroup = ageGroups.find((a) => a.code === program.age_group_code) || null;
        return {
          program,
          campus_name: campus ? campus.name : '',
          age_group_label: ageGroup ? ageGroup.label : '',
          starting_at_monthly: program.monthly_tuition || 0,
          availability_status_label: program.availability_status || ''
        };
      });

    const now = new Date();
    const events = this._getFromStorage('events', []);
    const upcoming_family_events = events
      .filter((e) => {
        if (!e || e.event_type !== 'family_event') return false;
        const start = e.start_datetime ? new Date(e.start_datetime) : null;
        return start && start >= now;
      })
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5)
      .map((event) => {
        const campus = campuses.find((c) => c.id === event.campus_id) || null;
        const start = new Date(event.start_datetime);
        const formatted_date = start.toISOString().slice(0, 10);
        return {
          event,
          campus_name: campus ? campus.name : '',
          formatted_date,
          time_of_day_label: this._timeOfDayLabel(event.time_of_day)
        };
      });

    const testimonials = [];

    return {
      hero_sections,
      featured_programs,
      upcoming_family_events,
      testimonials
    };
  }

  // getProgramFilterOptions
  getProgramFilterOptions() {
    const age_groups = this._getFromStorage('age_group_options', []);
    const campuses = this._getFromStorage('campuses', []);

    const schedule_types = [
      {
        value: 'full_time_5_days',
        label: 'Full-time (5 days/week)',
        description: 'Monday–Friday full-day care.'
      },
      {
        value: 'half_day',
        label: 'Half-day',
        description: 'Shorter day, typically mornings.'
      },
      {
        value: 'full_day',
        label: 'Full-day',
        description: 'Single full day option.'
      },
      {
        value: 'three_days',
        label: '3 days/week',
        description: 'Three set days per week.'
      },
      {
        value: 'extended_day',
        label: 'Extended day',
        description: 'Longer coverage beyond standard hours.'
      }
    ];

    const distance_options = [
      { value_miles: 5, label: 'Within 5 miles' },
      { value_miles: 10, label: 'Within 10 miles' },
      { value_miles: 20, label: 'Within 20 miles' }
    ];

    const tuition_ranges = [
      { min: 0, max: 1000, label: 'Up to $1,000/month' },
      { min: 1000, max: 1500, label: '$1,000–$1,500/month' },
      { min: 1500, max: 2000, label: '$1,500–$2,000/month' },
      { min: 2000, max: 999999, label: '$2,000+/month' }
    ];

    const sort_options = [
      { value: 'price_low_high', label: 'Price: Low to High' },
      { value: 'price_high_low', label: 'Price: High to Low' },
      { value: 'name_az', label: 'Name: A to Z' },
      { value: 'distance_near_far', label: 'Distance: Near to Far' }
    ];

    return {
      age_groups,
      schedule_types,
      campuses,
      distance_options,
      tuition_ranges,
      sort_options
    };
  }

  // searchPrograms
  searchPrograms(
    ageGroupCode,
    campusId,
    postalCode,
    distanceMiles,
    scheduleTypes,
    maxMonthlyTuition,
    sortBy
  ) {
    const programs = this._getFromStorage('programs', []);
    const campuses = this._getFromStorage('campuses', []);
    const ageGroups = this._getFromStorage('age_group_options', []);

    let filtered = programs.slice();

    if (ageGroupCode && ageGroupCode !== 'all') {
      filtered = filtered.filter((p) => p.age_group_code === ageGroupCode);
    }

    if (campusId) {
      filtered = filtered.filter((p) => p.campus_id === campusId);
    }

    if (Array.isArray(scheduleTypes) && scheduleTypes.length) {
      const set = new Set(scheduleTypes);
      filtered = filtered.filter((p) => set.has(p.schedule_type));
    }

    if (typeof maxMonthlyTuition === 'number') {
      filtered = filtered.filter(
        (p) => typeof p.monthly_tuition === 'number' && p.monthly_tuition <= maxMonthlyTuition
      );
    }

    let searchCoords = null;
    if (postalCode && typeof distanceMiles === 'number') {
      searchCoords = this._resolvePostalCodeToCoordinates(postalCode);
    }

    const resultItems = filtered.map((program) => {
      const campus = campuses.find((c) => c.id === program.campus_id) || null;
      const ageGroup = ageGroups.find((a) => a.code === program.age_group_code) || null;
      let distance_miles = null;
      if (searchCoords && campus && typeof campus.latitude === 'number' && typeof campus.longitude === 'number') {
        distance_miles = this._calculateDistanceMiles(
          searchCoords.latitude,
          searchCoords.longitude,
          campus.latitude,
          campus.longitude
        );
      } else if (postalCode && campus && campus.postal_code === postalCode) {
        distance_miles = 0;
      }
      return {
        program,
        campus_name: campus ? campus.name : '',
        campus_city: campus ? campus.city : '',
        campus_postal_code: campus ? campus.postal_code : '',
        age_group_label: ageGroup ? ageGroup.label : '',
        schedule_type_label: this._scheduleTypeLabel(program.schedule_type),
        formatted_monthly_tuition: this._formatCurrencyUSD(program.monthly_tuition || 0),
        distance_miles: distance_miles
      };
    });

    let finalItems = resultItems;

    if (postalCode && typeof distanceMiles === 'number') {
      finalItems = finalItems.filter((item) => {
        if (item.distance_miles === null || item.distance_miles === undefined) return false;
        return item.distance_miles <= distanceMiles;
      });
    }

    const sort = sortBy || 'price_low_high';
    finalItems.sort((a, b) => {
      switch (sort) {
        case 'price_high_low':
          return (b.program.monthly_tuition || 0) - (a.program.monthly_tuition || 0);
        case 'name_az': {
          const an = (a.program.name || '').toLowerCase();
          const bn = (b.program.name || '').toLowerCase();
          if (an < bn) return -1;
          if (an > bn) return 1;
          return 0;
        }
        case 'distance_near_far': {
          const ad = a.distance_miles == null ? Number.POSITIVE_INFINITY : a.distance_miles;
          const bd = b.distance_miles == null ? Number.POSITIVE_INFINITY : b.distance_miles;
          return ad - bd;
        }
        case 'price_low_high':
        default:
          return (a.program.monthly_tuition || 0) - (b.program.monthly_tuition || 0);
      }
    });

    const applied_filters = {
      ageGroupCode: ageGroupCode || null,
      campusId: campusId || null,
      postalCode: postalCode || null,
      distanceMiles: typeof distanceMiles === 'number' ? distanceMiles : null,
      scheduleTypes: Array.isArray(scheduleTypes) ? scheduleTypes : [],
      maxMonthlyTuition: typeof maxMonthlyTuition === 'number' ? maxMonthlyTuition : null,
      sortBy: sort
    };

    // Instrumentation for task completion tracking (Task 1)
    try {
      localStorage.setItem(
        'task1_programSearchParams',
        JSON.stringify({
          ageGroupCode,
          campusId,
          postalCode,
          distanceMiles,
          scheduleTypes,
          maxMonthlyTuition,
          sortBy,
          timestamp: this._nowISO()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      total_results: finalItems.length,
      applied_filters,
      programs: finalItems
    };
  }

  // getProgramDetails
  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs', []);
    const campuses = this._getFromStorage('campuses', []);
    const ageGroups = this._getFromStorage('age_group_options', []);

    const program = programs.find((p) => p.id === programId) || null;

    if (!program) {
      return {
        program: null,
        campus: null,
        age_group: null,
        schedule_type_label: '',
        formatted_monthly_tuition: '',
        formatted_annual_tuition: '',
        availability_badge: 'Unavailable',
        can_start_enrollment: false,
        can_join_waitlist: false,
        highlights: []
      };
    }

    const campus = campuses.find((c) => c.id === program.campus_id) || null;
    const age_group = ageGroups.find((a) => a.code === program.age_group_code) || null;

    const schedule_type_label = this._scheduleTypeLabel(program.schedule_type);
    const formatted_monthly_tuition = this._formatCurrencyUSD(program.monthly_tuition || 0);
    const formatted_annual_tuition = this._formatCurrencyUSD(
      program.annual_tuition || (program.monthly_tuition ? program.monthly_tuition * 12 : 0)
    );

    let availability_badge = 'Unavailable';
    switch (program.availability_status) {
      case 'open':
        availability_badge = 'Open';
        break;
      case 'waitlist':
        availability_badge = 'Waitlist';
        break;
      case 'full':
        availability_badge = 'Full';
        break;
      case 'closed':
        availability_badge = 'Closed';
        break;
      default:
        availability_badge = 'Unavailable';
    }

    const can_start_enrollment = program.availability_status === 'open';
    const can_join_waitlist =
      program.availability_status === 'waitlist' || program.availability_status === 'full';

    const highlights = [];
    if (age_group && age_group.label) {
      highlights.push('Age group: ' + age_group.label);
    }
    if (campus && campus.name) {
      highlights.push('Campus: ' + campus.name);
    }
    highlights.push('Schedule: ' + schedule_type_label);

    return {
      program,
      campus,
      age_group,
      schedule_type_label,
      formatted_monthly_tuition,
      formatted_annual_tuition,
      availability_badge,
      can_start_enrollment,
      can_join_waitlist,
      highlights
    };
  }

  // startEnrollmentApplication
  startEnrollmentApplication(
    programId,
    childName,
    childBirthdate,
    desiredStartDate,
    parentName,
    parentEmail,
    parentPhone
  ) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return {
        success: false,
        application: null,
        message: 'Program not found.'
      };
    }

    let child_age_years = null;
    let child_birthdate_dt = null;
    if (childBirthdate) {
      const d = new Date(childBirthdate);
      if (!isNaN(d.getTime())) {
        child_birthdate_dt = d.toISOString();
        const diffMs = Date.now() - d.getTime();
        const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
        child_age_years = Math.floor(years * 10) / 10; // 1 decimal
      }
    }

    let desired_start_date_dt = null;
    if (desiredStartDate) {
      const d = new Date(desiredStartDate);
      if (!isNaN(d.getTime())) {
        desired_start_date_dt = d.toISOString();
      }
    }

    const application = {
      id: this._generateId('enroll'),
      program_id: programId,
      child_name: childName || null,
      child_birthdate: child_birthdate_dt,
      child_age_years: child_age_years,
      desired_start_date: desired_start_date_dt,
      parent_name: parentName || null,
      parent_email: parentEmail || null,
      parent_phone: parentPhone || null,
      status: 'started',
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };

    const applications = this._getFromStorage('enrollment_applications', []);
    applications.push(application);
    this._saveToStorage('enrollment_applications', applications);

    return {
      success: true,
      application,
      message: 'Enrollment application started.'
    };
  }

  // createWaitlistEntry
  createWaitlistEntry(
    programId,
    childName,
    childAgeYears,
    desiredStartMonth,
    desiredStartYear,
    notes
  ) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return {
        success: false,
        waitlist_entry: null,
        message: 'Program not found.'
      };
    }

    const validMonths = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december'
    ];
    const monthLower = (desiredStartMonth || '').toLowerCase();
    const monthValue = validMonths.includes(monthLower) ? monthLower : null;

    if (!monthValue) {
      return {
        success: false,
        waitlist_entry: null,
        message: 'Invalid desired start month.'
      };
    }

    const entry = {
      id: this._generateId('wait'),
      program_id: programId,
      child_name: childName,
      child_age_years: typeof childAgeYears === 'number' ? childAgeYears : null,
      desired_start_month: monthValue,
      desired_start_year: typeof desiredStartYear === 'number' ? desiredStartYear : null,
      notes: notes || null,
      status: 'pending',
      created_at: this._nowISO(),
      updated_at: this._nowISO()
    };

    const entries = this._getFromStorage('waitlist_entries', []);
    entries.push(entry);
    this._saveToStorage('waitlist_entries', entries);

    return {
      success: true,
      waitlist_entry: entry,
      message: 'Added to waitlist.'
    };
  }

  // createProgramComparison
  createProgramComparison(programIds) {
    const ids = Array.isArray(programIds) ? programIds : [];
    const programsAll = this._getFromStorage('programs', []);
    const campuses = this._getFromStorage('campuses', []);
    const ageGroups = this._getFromStorage('age_group_options', []);

    const comparisonPrograms = ids
      .map((id) => programsAll.find((p) => p.id === id) || null)
      .filter((p) => !!p);

    const comparison_id = this._generateId('cmp');
    const comparisonRecord = {
      id: comparison_id,
      program_ids: comparisonPrograms.map((p) => p.id),
      created_at: this._nowISO()
    };

    const stored = this._getFromStorage('program_comparisons', []);
    stored.push(comparisonRecord);
    this._saveToStorage('program_comparisons', stored);

    const programs = comparisonPrograms.map((program) => {
      const campus = campuses.find((c) => c.id === program.campus_id) || null;
      const age_group = ageGroups.find((a) => a.code === program.age_group_code) || null;
      const annual = program.annual_tuition || (program.monthly_tuition ? program.monthly_tuition * 12 : 0);
      return {
        program,
        campus,
        age_group,
        schedule_type_label: this._scheduleTypeLabel(program.schedule_type),
        annual_tuition: annual,
        formatted_annual_tuition: this._formatCurrencyUSD(annual),
        monthly_tuition: program.monthly_tuition || 0,
        formatted_monthly_tuition: this._formatCurrencyUSD(program.monthly_tuition || 0),
        availability_status_label: program.availability_status || ''
      };
    });

    let cheapest_program_id = null;
    let cheapestAnnual = null;
    programs.forEach((p) => {
      const val = typeof p.annual_tuition === 'number' ? p.annual_tuition : 0;
      if (cheapestAnnual === null || val < cheapestAnnual) {
        cheapestAnnual = val;
        cheapest_program_id = p.program.id;
      }
    });

    return {
      comparison_id,
      programs,
      cheapest_program_id,
      created_at: comparisonRecord.created_at
    };
  }

  // getTourFormOptions
  getTourFormOptions() {
    const campuses = this._getFromStorage('campuses', []);

    const visit_types = [
      { value: 'in_person_tour', label: 'In-person tour' },
      { value: 'virtual_tour', label: 'Virtual tour' }
    ];

    const default_duration_minutes = 60;

    const time_of_day_options = [
      { value: 'morning', label: 'Morning', start_hour: 9, end_hour: 12 },
      { value: 'afternoon', label: 'Afternoon', start_hour: 12, end_hour: 17 }
    ];

    return {
      campuses,
      visit_types,
      default_duration_minutes,
      time_of_day_options
    };
  }

  // getAvailableTourSlots
  getAvailableTourSlots(campusId, visitType, dateFrom, dateTo, timeOfDay) {
    const campus_id = campusId;
    const visit_type = visitType;

    const startDate = new Date(dateFrom + 'T00:00:00');
    const endDate = new Date(dateTo + 'T23:59:59');
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { campus_id, visit_type, slots: [] };
    }

    const slots = [];
    const current = new Date(startDate.getTime());

    while (current <= endDate) {
      const day = current.getDay(); // 0=Sun, 1=Mon,...
      const is_weekday = day >= 1 && day <= 5;

      const dateStr = current.toISOString().slice(0, 10);

      const baseSlots = [
        { start: '10:00', end: '10:30' },
        { start: '11:00', end: '11:30' },
        { start: '14:00', end: '14:30' }
      ];

      baseSlots.forEach((slot) => {
        const startDT = new Date(dateStr + 'T' + slot.start + ':00');
        const endDT = new Date(dateStr + 'T' + slot.end + ':00');
        const hour = startDT.getHours();
        const tod = this._classifyTimeOfDay(hour);
        if (timeOfDay && tod !== timeOfDay) {
          return;
        }
        slots.push({
          start: startDT.toISOString(),
          end: endDT.toISOString(),
          is_weekday
        });
      });

      current.setDate(current.getDate() + 1);
    }

    return { campus_id, visit_type, slots };
  }

  // submitTourRequest
  submitTourRequest(
    campusId,
    visitType,
    visitStart,
    visitEnd,
    numberOfChildren,
    childAgeYears,
    parentName,
    parentEmail,
    specialRequests
  ) {
    const campuses = this._getFromStorage('campuses', []);
    const campus = campuses.find((c) => c.id === campusId) || null;
    if (!campus) {
      return {
        success: false,
        tour_request: null,
        message: 'Campus not found.'
      };
    }

    const start = new Date(visitStart);
    const end = visitEnd ? new Date(visitEnd) : null;

    if (isNaN(start.getTime())) {
      return {
        success: false,
        tour_request: null,
        message: 'Invalid visit start date/time.'
      };
    }

    const req = {
      id: this._generateId('tour'),
      campus_id: campusId,
      visit_type: visitType,
      visit_start: start.toISOString(),
      visit_end: end && !isNaN(end.getTime()) ? end.toISOString() : null,
      number_of_children: numberOfChildren,
      child_age_years: typeof childAgeYears === 'number' ? childAgeYears : null,
      parent_name: parentName,
      parent_email: parentEmail,
      special_requests: specialRequests || null,
      status: 'requested',
      created_at: this._nowISO()
    };

    const stored = this._getFromStorage('tour_requests', []);
    stored.push(req);
    this._saveToStorage('tour_requests', stored);

    return {
      success: true,
      tour_request: req,
      message: 'Tour request submitted.'
    };
  }

  // getTuitionOverview
  getTuitionOverview() {
    const ageGroups = this._getFromStorage('age_group_options', []);
    const programs = this._getFromStorage('programs', []);

    const age_group_summaries = ageGroups.map((ageGroup) => {
      const relatedPrograms = programs.filter((p) => p.age_group_code === ageGroup.code);

      const scheduleMap = new Map();
      relatedPrograms.forEach((p) => {
        const existing = scheduleMap.get(p.schedule_type) || [];
        existing.push(p);
        scheduleMap.set(p.schedule_type, existing);
      });

      const schedule_summaries = Array.from(scheduleMap.entries()).map(([schedule_type, progs]) => {
        const monthlyVals = progs
          .map((p) => p.monthly_tuition)
          .filter((v) => typeof v === 'number' && !isNaN(v));
        const annualVals = progs
          .map((p) => p.annual_tuition)
          .filter((v) => typeof v === 'number' && !isNaN(v));

        const sample_monthly_from =
          monthlyVals.length ? Math.min.apply(null, monthlyVals) : 0;
        const sample_annual_from =
          annualVals.length
            ? Math.min.apply(null, annualVals)
            : sample_monthly_from * 12;

        let typical_days_per_week = 5;
        if (schedule_type === 'three_days') typical_days_per_week = 3;

        return {
          schedule_type,
          label: this._scheduleTypeLabel(schedule_type),
          description: '',
          typical_days_per_week,
          sample_monthly_from,
          sample_annual_from
        };
      });

      return {
        age_group: ageGroup,
        schedule_summaries
      };
    });

    const billing_faq = [
      {
        question: 'How often is tuition billed?',
        answer: 'Tuition is typically billed monthly. Exact billing dates may vary by campus.'
      }
    ];

    const discount_notes =
      'Sibling and employer-partner discounts may be available at select campuses.';
    const additional_fees_summary =
      'Registration and materials fees may apply. Field trips and special events could incur additional costs.';

    return {
      age_group_summaries,
      billing_faq,
      discount_notes,
      additional_fees_summary
    };
  }

  // getTuitionCalculatorOptions
  getTuitionCalculatorOptions() {
    const age_groups = this._getFromStorage('age_group_options', []);

    const days_of_week = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' }
    ];

    const time_options = [];
    for (let h = 7; h <= 18; h++) {
      ['00', '30'].forEach((m) => {
        const value = (h < 10 ? '0' + h : '' + h) + ':' + m;
        let labelHour = h % 12;
        if (labelHour === 0) labelHour = 12;
        const ampm = h < 12 ? 'AM' : 'PM';
        const label = labelHour + ':' + m + ' ' + ampm;
        time_options.push({ value, label });
      });
    }

    const default_max_budget = 1500;

    return {
      age_groups,
      days_of_week,
      time_options,
      default_max_budget
    };
  }

  // getTuitionEstimate
  getTuitionEstimate(ageGroupCode, daysOfWeek, dropoffTime, pickupTime, maxMonthlyBudget) {
    const programs = this._getFromStorage('programs', []);

    const relevantPrograms = programs.filter((p) => p.age_group_code === ageGroupCode);

    let baseMonthly = 0;
    const monthlyVals = relevantPrograms
      .map((p) => p.monthly_tuition)
      .filter((v) => typeof v === 'number' && !isNaN(v));
    if (monthlyVals.length) {
      const sum = monthlyVals.reduce((s, v) => s + v, 0);
      baseMonthly = sum / monthlyVals.length;
    }

    const daysPerWeek = Array.isArray(daysOfWeek) ? daysOfWeek.length : 0;
    const dropMinutes = this._parseTimeToMinutes(dropoffTime);
    const pickupMinutes = this._parseTimeToMinutes(pickupTime);
    const minutesPerDay = Math.max(pickupMinutes - dropMinutes, 0);
    const hoursPerDay = minutesPerDay / 60;

    const baselineDays = 5;
    const baselineHoursPerDay = 9;
    const baselineHoursPerWeek = baselineDays * baselineHoursPerDay;
    const hoursPerWeek = daysPerWeek * hoursPerDay;

    let estimated_monthly_tuition = 0;
    if (baseMonthly > 0 && baselineHoursPerWeek > 0) {
      const ratio = hoursPerWeek / baselineHoursPerWeek;
      estimated_monthly_tuition = Math.round(baseMonthly * ratio);
    }

    let is_within_budget = false;
    let budget_difference = 0;
    if (typeof maxMonthlyBudget === 'number') {
      is_within_budget = estimated_monthly_tuition <= maxMonthlyBudget;
      budget_difference = estimated_monthly_tuition - maxMonthlyBudget;
    }

    const included_items = ['Daily reports', 'Snacks (where provided)', 'Age-appropriate curriculum'];

    const notes =
      'This is an estimate based on typical schedules and may vary by campus and availability.';

    const result = {
      age_group_code: ageGroupCode,
      days_of_week: Array.isArray(daysOfWeek) ? daysOfWeek : [],
      dropoff_time: dropoffTime,
      pickup_time: pickupTime,
      estimated_monthly_tuition,
      is_within_budget,
      budget_difference,
      included_items,
      notes
    };

    this._getOrUpdateTuitionCalculatorState('set', {
      lastEstimate: result,
      maxMonthlyBudget: typeof maxMonthlyBudget === 'number' ? maxMonthlyBudget : null,
      created_at: this._nowISO()
    });

    return result;
  }

  // saveTuitionQuote
  saveTuitionQuote(email, quoteName, notes) {
    const state = this._getOrUpdateTuitionCalculatorState('get');
    if (!state || !state.lastEstimate) {
      return {
        success: false,
        quote: null,
        message: 'No tuition estimate available to save.'
      };
    }

    const est = state.lastEstimate;
    const quote = {
      id: this._generateId('tq'),
      age_group_code: est.age_group_code,
      days_of_week: est.days_of_week,
      dropoff_time: est.dropoff_time,
      pickup_time: est.pickup_time,
      max_monthly_budget: state.maxMonthlyBudget,
      estimated_monthly_tuition: est.estimated_monthly_tuition,
      is_within_budget: est.is_within_budget,
      quote_name: quoteName,
      email: email,
      notes: notes || null,
      created_at: this._nowISO()
    };

    const quotes = this._getFromStorage('tuition_quotes', []);
    quotes.push(quote);
    this._saveToStorage('tuition_quotes', quotes);

    return {
      success: true,
      quote,
      message: 'Tuition quote saved.'
    };
  }

  // getTeacherFilterOptions
  getTeacherFilterOptions() {
    const age_groups = this._getFromStorage('age_group_options', []);
    const teachers = this._getFromStorage('teachers', []);

    const roles = [
      { value: 'infant_teacher', label: 'Infant teachers' },
      { value: 'toddler_teacher', label: 'Toddler teachers' },
      { value: 'preschool_teacher', label: 'Preschool teachers' },
      { value: 'assistant_teacher', label: 'Assistant teachers' },
      { value: 'director', label: 'Directors' },
      { value: 'staff', label: 'Staff' }
    ];

    let min_years = null;
    let max_years = null;
    teachers.forEach((t) => {
      if (typeof t.years_experience === 'number') {
        if (min_years === null || t.years_experience < min_years) min_years = t.years_experience;
        if (max_years === null || t.years_experience > max_years) max_years = t.years_experience;
      }
    });

    const experience_range = {
      min_years: min_years === null ? 0 : min_years,
      max_years: max_years === null ? 0 : max_years
    };

    const rating_filter_options = [
      { min_rating: 4.5, label: '4.5 stars & up' },
      { min_rating: 4.0, label: '4.0 stars & up' },
      { min_rating: 3.5, label: '3.5 stars & up' }
    ];

    const sort_options = [
      { value: 'rating_high_low', label: 'Rating: High to Low' },
      { value: 'experience_high_low', label: 'Experience: High to Low' },
      { value: 'name_az', label: 'Name: A to Z' }
    ];

    return {
      roles,
      age_groups,
      experience_range,
      rating_filter_options,
      sort_options
    };
  }

  // searchTeachers
  searchTeachers(primaryRole, ageGroupCode, minYearsExperience, minRating, campusId, sortBy) {
    const teachers = this._getFromStorage('teachers', []);
    const campuses = this._getFromStorage('campuses', []);
    const ageGroups = this._getFromStorage('age_group_options', []);

    let filtered = teachers.filter((t) => t && t.is_active !== false);

    if (primaryRole) {
      filtered = filtered.filter((t) => t.primary_role === primaryRole);
    }

    if (ageGroupCode) {
      filtered = filtered.filter(
        (t) => Array.isArray(t.age_group_codes) && t.age_group_codes.includes(ageGroupCode)
      );
    }

    if (typeof minYearsExperience === 'number') {
      filtered = filtered.filter(
        (t) => typeof t.years_experience === 'number' && t.years_experience >= minYearsExperience
      );
    }

    if (typeof minRating === 'number') {
      filtered = filtered.filter(
        (t) => typeof t.average_rating === 'number' && t.average_rating >= minRating
      );
    }

    if (campusId) {
      filtered = filtered.filter((t) => t.campus_id === campusId);
    }

    const sort = sortBy || 'rating_high_low';
    filtered.sort((a, b) => {
      switch (sort) {
        case 'experience_high_low':
          return (b.years_experience || 0) - (a.years_experience || 0);
        case 'name_az': {
          const an = (a.full_name || (a.first_name || '') + ' ' + (a.last_name || '')).toLowerCase();
          const bn = (b.full_name || (b.first_name || '') + ' ' + (b.last_name || '')).toLowerCase();
          if (an < bn) return -1;
          if (an > bn) return 1;
          return 0;
        }
        case 'rating_high_low':
        default:
          return (b.average_rating || 0) - (a.average_rating || 0);
      }
    });

    const items = filtered.map((teacher) => {
      const campus = campuses.find((c) => c.id === teacher.campus_id) || null;
      const age_group_labels = Array.isArray(teacher.age_group_codes)
        ? teacher.age_group_codes
            .map((code) => {
              const ag = ageGroups.find((a) => a.code === code);
              return ag ? ag.label : null;
            })
            .filter((v) => !!v)
        : [];
      return {
        teacher,
        campus_name: campus ? campus.name : '',
        age_group_labels
      };
    });

    const applied_filters = {
      primaryRole: primaryRole || null,
      ageGroupCode: ageGroupCode || null,
      minYearsExperience: typeof minYearsExperience === 'number' ? minYearsExperience : null,
      minRating: typeof minRating === 'number' ? minRating : null,
      campusId: campusId || null,
      sortBy: sort
    };

    return {
      total_results: items.length,
      applied_filters,
      teachers: items
    };
  }

  // getTeacherDetails
  getTeacherDetails(teacherId) {
    const teachers = this._getFromStorage('teachers', []);
    const campuses = this._getFromStorage('campuses', []);
    const ageGroups = this._getFromStorage('age_group_options', []);
    const favorites = this._getOrCreateTeacherFavoritesStore();

    const teacher = teachers.find((t) => t.id === teacherId) || null;
    if (!teacher) {
      return {
        teacher: null,
        campus: null,
        age_groups: [],
        reviews: [],
        is_favorite: false,
        related_teachers: []
      };
    }

    const campus = campuses.find((c) => c.id === teacher.campus_id) || null;

    const age_groups = Array.isArray(teacher.age_group_codes)
      ? teacher.age_group_codes
          .map((code) => ageGroups.find((a) => a.code === code) || null)
          .filter((a) => !!a)
      : [];

    const is_favorite = favorites.some((f) => f.teacher_id === teacher.id);

    const related_teachers = teachers
      .filter((t) => t.id !== teacherId && t.primary_role === teacher.primary_role)
      .slice(0, 3);

    const reviews = [];

    return {
      teacher,
      campus,
      age_groups,
      reviews,
      is_favorite,
      related_teachers
    };
  }

  // addTeacherFavorite
  addTeacherFavorite(teacherId, label) {
    const teachers = this._getFromStorage('teachers', []);
    const teacher = teachers.find((t) => t.id === teacherId) || null;
    if (!teacher) {
      return {
        success: false,
        favorite: null,
        message: 'Teacher not found.'
      };
    }

    let favorites = this._getOrCreateTeacherFavoritesStore();

    let favorite = favorites.find((f) => f.teacher_id === teacherId) || null;
    if (favorite) {
      favorite.label = label || favorite.label || null;
      favorite.created_at = favorite.created_at || this._nowISO();
    } else {
      favorite = {
        id: this._generateId('tfav'),
        teacher_id: teacherId,
        label: label || null,
        created_at: this._nowISO()
      };
      favorites.push(favorite);
    }

    this._saveToStorage('teacher_favorites', favorites);

    return {
      success: true,
      favorite,
      message: 'Teacher added to favorites.'
    };
  }

  // getTeacherFavorites
  getTeacherFavorites() {
    const favorites = this._getOrCreateTeacherFavoritesStore();
    const teachers = this._getFromStorage('teachers', []);

    const items = favorites.map((favorite) => {
      const teacher = teachers.find((t) => t.id === favorite.teacher_id) || null;
      return { favorite, teacher };
    });

    return {
      favorites: items
    };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const event_types = [
      { value: 'family_event', label: 'Family events' },
      { value: 'parent_workshop', label: 'Parent workshops' },
      { value: 'open_house', label: 'Open houses' },
      { value: 'holiday', label: 'Holidays' },
      { value: 'other', label: 'Other' }
    ];

    const price_options = [
      { value: 'all', label: 'All' },
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' }
    ];

    const days_of_week = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full day' }
    ];

    return {
      event_types,
      price_options,
      days_of_week,
      time_of_day_options
    };
  }

  // getEvents
  getEvents(month, eventType, priceFilter, daysOfWeek, timeOfDay) {
    const range = this._normalizeEventDateRangeForMonth(month);
    const eventsAll = this._getFromStorage('events', []);
    const campuses = this._getFromStorage('campuses', []);
    const rsvps = this._getFromStorage('event_rsvps', []);

    if (!range) {
      return {
        month,
        total_results: 0,
        events: []
      };
    }

    const start = new Date(range.startISO);
    const end = new Date(range.endISO);

    const daysSet = Array.isArray(daysOfWeek) && daysOfWeek.length
      ? new Set(daysOfWeek)
      : null;

    const filtered = eventsAll.filter((event) => {
      if (!event || !event.start_datetime) return false;
      const dt = new Date(event.start_datetime);
      if (dt < start || dt > end) return false;

      if (eventType && event.event_type !== eventType) return false;

      if (priceFilter === 'free' && !event.is_free) return false;
      if (priceFilter === 'paid' && event.is_free) return false;

      if (daysSet) {
        let dayName = event.day_of_week;
        if (!dayName) {
          const dow = dt.getUTCDay();
          const names = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday'
          ];
          dayName = names[dow];
        }
        if (!daysSet.has(dayName)) return false;
      }

      if (timeOfDay) {
        let tod = event.time_of_day;
        if (!tod) {
          const hour = dt.getUTCHours();
          tod = this._classifyTimeOfDay(hour);
        }
        if (tod !== timeOfDay) return false;
      }

      return true;
    });

    const items = filtered.map((event) => {
      const campus = campuses.find((c) => c.id === event.campus_id) || null;
      const dt = new Date(event.start_datetime);
      const formatted_date = dt.toISOString().slice(0, 10);

      const totalAttendees = rsvps
        .filter((r) => r.event_id === event.id && r.status !== 'canceled')
        .reduce((sum, r) => sum + (r.number_of_attendees || 0), 0);
      const remaining_capacity =
        typeof event.max_attendees === 'number'
          ? Math.max(event.max_attendees - totalAttendees, 0)
          : null;
      const is_full = remaining_capacity !== null && remaining_capacity <= 0;

      return {
        event,
        campus_name: campus ? campus.name : '',
        formatted_date,
        time_of_day_label: this._timeOfDayLabel(event.time_of_day),
        is_full
      };
    });

    return {
      month,
      total_results: items.length,
      events: items
    };
  }

  // getEventDetails
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const campuses = this._getFromStorage('campuses', []);
    const rsvps = this._getFromStorage('event_rsvps', []);

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        campus: null,
        description_html: '',
        is_rsvp_open: false,
        remaining_capacity: 0
      };
    }

    const campus = campuses.find((c) => c.id === event.campus_id) || null;

    const description_html = event.description
      ? '<p>' + String(event.description) + '</p>'
      : '';

    const totalAttendees = rsvps
      .filter((r) => r.event_id === event.id && r.status !== 'canceled')
      .reduce((sum, r) => sum + (r.number_of_attendees || 0), 0);
    const remaining_capacity =
      typeof event.max_attendees === 'number'
        ? Math.max(event.max_attendees - totalAttendees, 0)
        : null;

    const now = new Date();
    const start = event.start_datetime ? new Date(event.start_datetime) : null;

    const is_rsvp_open =
      event.requires_rsvp &&
      (!start || now <= start) &&
      (remaining_capacity === null || remaining_capacity > 0);

    return {
      event,
      campus,
      description_html,
      is_rsvp_open,
      remaining_capacity
    };
  }

  // submitEventRSVP
  submitEventRSVP(eventId, numberOfAttendees, contactName, contactEmail, notes) {
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        rsvp: null,
        message: 'Event not found.'
      };
    }

    const rsvps = this._getFromStorage('event_rsvps', []);

    const totalAttendees = rsvps
      .filter((r) => r.event_id === event.id && r.status !== 'canceled')
      .reduce((sum, r) => sum + (r.number_of_attendees || 0), 0);
    const remaining_capacity =
      typeof event.max_attendees === 'number'
        ? Math.max(event.max_attendees - totalAttendees, 0)
        : null;

    if (
      remaining_capacity !== null &&
      typeof numberOfAttendees === 'number' &&
      numberOfAttendees > remaining_capacity
    ) {
      return {
        success: false,
        rsvp: null,
        message: 'Not enough remaining capacity for this event.'
      };
    }

    const rsvp = {
      id: this._generateId('rsvp'),
      event_id: eventId,
      number_of_attendees: numberOfAttendees,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      notes: notes || null,
      status: 'submitted',
      created_at: this._nowISO()
    };

    rsvps.push(rsvp);
    this._saveToStorage('event_rsvps', rsvps);

    return {
      success: true,
      rsvp,
      message: 'RSVP submitted.'
    };
  }

  // getFAQSearchOptions
  getFAQSearchOptions() {
    const articles = this._getFromStorage('articles', []);

    const topicSet = new Set();
    articles.forEach((a) => {
      if (Array.isArray(a.topics)) {
        a.topics.forEach((t) => topicSet.add(t));
      }
    });

    const topics = Array.from(topicSet).map((code) => {
      const parts = String(code)
        .split('_')
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ''));
      const name = parts.join(' ');
      return { code, name };
    });

    const popular_queries = [];

    return {
      topics,
      popular_queries
    };
  }

  // searchArticles
  searchArticles(query, topicCodes, isFaq) {
    const articles = this._getFromStorage('articles', []);

    const q = query ? String(query).toLowerCase() : '';
    const topicsSet = Array.isArray(topicCodes) && topicCodes.length
      ? new Set(topicCodes)
      : null;

    const filtered = articles.filter((article) => {
      if (!article) return false;
      if (typeof isFaq === 'boolean' && !!article.is_faq !== isFaq) return false;
      if (topicsSet) {
        const artTopics = Array.isArray(article.topics) ? article.topics : [];
        const has = artTopics.some((t) => topicsSet.has(t));
        if (!has) return false;
      }
      if (q) {
        const haystack = (
          (article.title || '') + ' ' + (article.summary || '') + ' ' + (article.body || '')
        ).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const items = filtered.map((article) => {
      const text = article.summary || article.body || '';
      const snippet = text.length > 200 ? text.slice(0, 200) + '…' : text;
      const highlighted_terms = q
        ? Array.from(
            new Set(
              q
                .split(/\s+/)
                .map((w) => w.trim())
                .filter((w) => w)
            )
          )
        : [];
      return {
        article,
        snippet,
        highlighted_terms
      };
    });

    // Instrumentation for task completion tracking (Task 7)
    try {
      if (isFaq === true && query && String(query).trim().length > 0) {
        localStorage.setItem(
          'task7_faqSearchParams',
          JSON.stringify({
            query,
            topicCodes,
            isFaq,
            timestamp: this._nowISO()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      total_results: items.length,
      articles: items
    };
  }

  // getArticleDetails
  getArticleDetails(articleId, slug) {
    const articles = this._getFromStorage('articles', []);

    let article = null;
    if (articleId) {
      article = articles.find((a) => a.id === articleId) || null;
    } else if (slug) {
      article = articles.find((a) => a.slug === slug) || null;
    }

    if (!article) {
      return {
        article: null,
        related_articles: [],
        default_contact_subject: 'general_question'
      };
    }

    let related_articles = [];
    if (Array.isArray(article.related_article_ids) && article.related_article_ids.length) {
      const idSet = new Set(article.related_article_ids);
      related_articles = articles.filter((a) => idSet.has(a.id));
    } else if (Array.isArray(article.topics) && article.topics.length) {
      const mainTopic = article.topics[0];
      related_articles = articles
        .filter((a) => a.id !== article.id && Array.isArray(a.topics) && a.topics.includes(mainTopic))
        .slice(0, 3);
    }

    let default_contact_subject = 'general_question';
    if (Array.isArray(article.topics)) {
      if (article.topics.includes('potty_training') || article.topics.includes('curriculum')) {
        default_contact_subject = 'curriculum_potty_training';
      } else if (article.topics.includes('health_safety')) {
        default_contact_subject = 'health_safety';
      } else if (article.topics.includes('billing_tuition')) {
        default_contact_subject = 'billing_tuition';
      }
    }

    return {
      article,
      related_articles,
      default_contact_subject
    };
  }

  // getContactFormOptions
  getContactFormOptions(articleId) {
    let default_subject = 'general_question';
    if (articleId) {
      const details = this.getArticleDetails(articleId, null);
      if (details && details.default_contact_subject) {
        default_subject = details.default_contact_subject;
      }
    }

    const subjects = [
      { value: 'general_question', label: 'General question' },
      { value: 'curriculum_potty_training', label: 'Curriculum & Potty Training' },
      { value: 'billing_tuition', label: 'Billing & Tuition' },
      { value: 'health_safety', label: 'Health & Safety' },
      { value: 'technical_support', label: 'Technical support' }
    ];

    const support_email = 'support@example.com';
    const support_phone = '555-000-0000';

    return {
      subjects,
      default_subject,
      support_email,
      support_phone
    };
  }

  // submitContactMessage
  submitContactMessage(subject, message, name, email, phone, articleId) {
    const validSubjects = new Set([
      'general_question',
      'curriculum_potty_training',
      'billing_tuition',
      'health_safety',
      'technical_support'
    ]);

    const subj = validSubjects.has(subject) ? subject : 'general_question';

    const msg = {
      id: this._generateId('msg'),
      subject: subj,
      message: message,
      name: name,
      email: email || null,
      phone: phone || null,
      article_id: articleId || null,
      status: 'submitted',
      created_at: this._nowISO()
    };

    const messages = this._getFromStorage('contact_messages', []);
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      contact_message: msg,
      confirmation_message: 'Your message has been received. We will get back to you soon.'
    };
  }

  // getNewsletterSignupOptions
  getNewsletterSignupOptions() {
    const topics = this._getFromStorage('newsletter_topics', []);
    const campuses = this._getFromStorage('campuses', []);
    const age_groups = this._getFromStorage('age_group_options', []);

    return {
      topics,
      campuses,
      age_groups
    };
  }

  // subscribeToNewsletter
  subscribeToNewsletter(fullName, email, postalCode, preferredCampusId, topicCodes, childAgeGroupCodes) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);

    let subscription = subscriptions.find((s) => s.email === email) || null;
    if (subscription) {
      subscription.full_name = fullName;
      subscription.postal_code = postalCode || null;
      subscription.preferred_campus_id = preferredCampusId || null;
      subscription.topic_codes = Array.isArray(topicCodes) ? topicCodes : [];
      subscription.child_age_group_codes = Array.isArray(childAgeGroupCodes)
        ? childAgeGroupCodes
        : [];
      subscription.is_active = true;
    } else {
      subscription = {
        id: this._generateId('nsub'),
        full_name: fullName,
        email: email,
        postal_code: postalCode || null,
        preferred_campus_id: preferredCampusId || null,
        topic_codes: Array.isArray(topicCodes) ? topicCodes : [],
        child_age_group_codes: Array.isArray(childAgeGroupCodes) ? childAgeGroupCodes : [],
        is_active: true,
        created_at: this._nowISO()
      };
      subscriptions.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription,
      message: 'Subscription saved.'
    };
  }

  // getAboutUsContent
  getAboutUsContent() {
    const campuses = this._getFromStorage('campuses', []);
    const ageGroups = this._getFromStorage('age_group_options', []);

    const mission = 'To provide a safe, nurturing, and play-based environment where children can grow, learn, and explore at their own pace.';

    const values = [
      'Safety and well-being first',
      'Partnership with families',
      'Play-based, child-led learning',
      'Inclusive and welcoming community'
    ];

    const philosophy =
      'We believe young children learn best through hands-on exploration, caring relationships, and consistent routines.';

    const history =
      'Our centers have grown from a single classroom to multiple campuses, while keeping a warm, family-like atmosphere.';

    const leadership_team = [];

    const campus_overview = campuses.map((campus) => {
      const age_group_labels = Array.isArray(campus.age_group_codes)
        ? campus.age_group_codes
            .map((code) => {
              const ag = ageGroups.find((a) => a.code === code);
              return ag ? ag.label : null;
            })
            .filter((v) => !!v)
        : [];
      return {
        campus,
        age_group_labels
      };
    });

    return {
      mission,
      values,
      philosophy,
      history,
      leadership_team,
      campus_overview
    };
  }

  // getCampusList
  getCampusList() {
    const campuses = this._getFromStorage('campuses', []);
    const ageGroups = this._getFromStorage('age_group_options', []);

    const items = campuses.map((campus) => {
      const groups = Array.isArray(campus.age_group_codes)
        ? campus.age_group_codes
            .map((code) => ageGroups.find((a) => a.code === code) || null)
            .filter((a) => !!a)
        : [];
      return {
        campus,
        age_groups: groups
      };
    });

    return {
      campuses: items
    };
  }

  // getCampusDetails
  getCampusDetails(campusId) {
    const campuses = this._getFromStorage('campuses', []);
    const ageGroups = this._getFromStorage('age_group_options', []);
    const programs = this._getFromStorage('programs', []);

    const campus = campuses.find((c) => c.id === campusId) || null;
    if (!campus) {
      return {
        campus: null,
        age_groups: [],
        programs_summary: [],
        contact_info: { phone: null, email: null },
        map_coordinates: { latitude: null, longitude: null }
      };
    }

    const age_groups = Array.isArray(campus.age_group_codes)
      ? campus.age_group_codes
          .map((code) => ageGroups.find((a) => a.code === code) || null)
          .filter((a) => !!a)
      : [];

    const programsByAge = new Map();
    programs
      .filter((p) => p.campus_id === campusId)
      .forEach((p) => {
        const ag = ageGroups.find((a) => a.code === p.age_group_code);
        const label = ag ? ag.label : p.age_group_code;
        const existing = programsByAge.get(label) || [];
        existing.push(p);
        programsByAge.set(label, existing);
      });

    const programs_summary = Array.from(programsByAge.entries()).map(([age_label, progs]) => {
      const schedule_types = Array.from(new Set(progs.map((p) => p.schedule_type)));
      const monthlyVals = progs
        .map((p) => p.monthly_tuition)
        .filter((v) => typeof v === 'number' && !isNaN(v));
      const starting_from_monthly = monthlyVals.length
        ? Math.min.apply(null, monthlyVals)
        : 0;
      return {
        age_group_label: age_label,
        schedule_types,
        starting_from_monthly
      };
    });

    const contact_info = {
      phone: campus.phone || null,
      email: campus.email || null
    };

    const map_coordinates = {
      latitude: typeof campus.latitude === 'number' ? campus.latitude : null,
      longitude: typeof campus.longitude === 'number' ? campus.longitude : null
    };

    return {
      campus,
      age_groups,
      programs_summary,
      contact_info,
      map_coordinates
    };
  }

  // getPoliciesContent
  getPoliciesContent() {
    const sections = [
      {
        id: 'attendance',
        title: 'Attendance & Hours',
        body: 'We encourage consistent attendance to support your child’s routine and learning.'
      },
      {
        id: 'illness',
        title: 'Illness Policy',
        body: 'Children who are ill must stay home until they are symptom-free for 24 hours without medication.'
      }
    ];

    const potty_training_policy_summary =
      'We partner with families to support potty training when children show readiness, typically in the toddler and preschool classrooms.';
    const tuition_policy_summary =
      'Tuition is billed monthly. Late payments and returned payments may incur additional fees.';
    const waitlist_policy_summary =
      'Waitlist priority may consider sibling status, staff families, and date of application.';
    const health_safety_summary =
      'Our centers follow state licensing regulations and maintain health and safety procedures, including regular cleaning and emergency drills.';

    return {
      sections,
      potty_training_policy_summary,
      tuition_policy_summary,
      waitlist_policy_summary,
      health_safety_summary
    };
  }

  // getHandbookDocuments
  getHandbookDocuments() {
    const documents = [];
    return { documents };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const last_updated = new Date().toISOString().slice(0, 10);

    const sections = [
      {
        id: 'collection',
        title: 'Information We Collect',
        body: 'We collect information you provide (such as contact details and child information) and basic usage data when you use our website.'
      },
      {
        id: 'use',
        title: 'How We Use Information',
        body: 'We use your information to provide childcare services, respond to inquiries, and improve our programs and website.'
      },
      {
        id: 'security',
        title: 'Data Security',
        body: 'We take reasonable measures to protect your information, though no system can be guaranteed 100% secure.'
      }
    ];

    return {
      last_updated,
      sections
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
