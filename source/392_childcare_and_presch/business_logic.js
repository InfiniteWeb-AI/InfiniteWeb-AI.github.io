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
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize entity tables if not present. Do not seed with mock data.
    const tables = [
      'campuses',
      'programs',
      'pre_enrollments',
      'waitlist_requests',
      'enrichment_enrollments',
      'tour_slots',
      'tour_requests',
      'tuition_rates',
      'tuition_plans',
      'events',
      'my_schedules',
      'scheduled_events',
      'meal_preferences',
      'teachers',
      'preferred_teacher_preferences',
      'prek_applications',
      'newsletter_subscriptions',
      'contact_inquiries'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
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

  // ---------- Utility helpers ----------

  _labelizeAgeGroup(value) {
    if (!value) return '';
    // Simple mappings for better labels where common
    const map = {
      'infant': 'Infant',
      'toddler_18_36_months': 'Toddler (18–36 months)',
      'age_2_years': '2 years',
      'ages_3_4_years': 'Ages 3–4 years',
      'age_4_years': '4 years',
      'age_5_years': '5 years',
      'ages_3_5_years': 'Ages 3–5 years',
      'prek_4_years': 'Pre-K (4 years)',
      'prek_5_years': 'Pre-K (5 years)'
    };
    if (map[value]) return map[value];
    return value.replace(/_/g, ' ');
  }

  _labelizeScheduleType(value) {
    if (!value) return '';
    const map = {
      'full_day': 'Full Day',
      'half_day': 'Half Day',
      'school_day': 'School Day',
      'extended_day': 'Extended Day',
      'enrichment_session': 'Enrichment Session'
    };
    return map[value] || value.replace(/_/g, ' ');
  }

  _labelizeTimeOfDay(value) {
    if (!value) return '';
    const map = {
      'morning': 'Morning',
      'afternoon': 'Afternoon',
      'evening': 'Evening',
      'full_day': 'Full Day'
    };
    return map[value] || value;
  }

  _labelizeMonth(yearMonth) {
    if (!yearMonth) return '';
    const parts = yearMonth.split('-');
    if (parts.length !== 2) return yearMonth;
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    if (isNaN(year) || isNaN(monthIndex)) return yearMonth;
    const date = new Date(year, monthIndex, 1);
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    return monthName + ' ' + year;
  }

  _parseISODate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _dateToYMD(date) {
    // Use UTC components to avoid timezone-related off-by-one-day errors
    const iso = date.toISOString();
    return iso.slice(0, 10);
  }

  _compareTimeStrings(a, b) {
    // HH:MM string comparison
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }

  _dayOfWeekFromDateString(dateStr) {
    const d = this._parseISODate(dateStr);
    if (!d) return '';
    const idx = d.getDay();
    const names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return names[idx];
  }

  _haversineMiles(lat1, lon1, lat2, lon2) {
    const toRad = function (v) { return v * Math.PI / 180; };
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ---------- HelperFunctions from spec ----------

  _getOrCreateMySchedule() {
    let schedules = this._getFromStorage('my_schedules', []);
    if (schedules.length > 0) {
      return schedules[0];
    }
    const schedule = {
      id: this._generateId('myschedule'),
      name: 'My Schedule',
      created_at: new Date().toISOString()
    };
    schedules.push(schedule);
    this._saveToStorage('my_schedules', schedules);
    return schedule;
  }

  _getCurrentMealPreferencesOrDefault() {
    const prefs = this._getFromStorage('meal_preferences', []);
    if (prefs.length > 0) {
      return prefs[0];
    }
    return {
      id: null,
      child_full_name: '',
      allergies: [],
      diet_preferences: [],
      monday_lunch_option: 'school_lunch',
      tuesday_lunch_option: 'school_lunch',
      wednesday_lunch_option: 'school_lunch',
      thursday_lunch_option: 'school_lunch',
      friday_lunch_option: 'school_lunch',
      last_updated: null
    };
  }

  _calculateTuitionFromRates(age_group, days_per_week, include_extended_care_evening) {
    const rates = this._getFromStorage('tuition_rates', []);
    const rate = rates.find(function (r) {
      return r.age_group === age_group && r.days_per_week === days_per_week;
    }) || null;
    if (!rate) {
      return {
        tuition_rate_id: null,
        age_group: age_group,
        age_group_label: this._labelizeAgeGroup(age_group),
        days_per_week: days_per_week,
        base_monthly_tuition: 0,
        extended_care_evening_addon: 0,
        include_extended_care_evening: !!include_extended_care_evening,
        estimated_monthly_tuition: 0,
        currency: ''
      };
    }
    const addon = include_extended_care_evening ? (rate.extended_care_evening_monthly_addon || 0) : 0;
    const estimated = (rate.base_monthly_tuition || 0) + addon;
    return {
      tuition_rate_id: rate.id,
      age_group: rate.age_group,
      age_group_label: this._labelizeAgeGroup(rate.age_group),
      days_per_week: rate.days_per_week,
      base_monthly_tuition: rate.base_monthly_tuition || 0,
      extended_care_evening_addon: addon,
      include_extended_care_evening: !!include_extended_care_evening,
      estimated_monthly_tuition: estimated,
      currency: rate.currency || ''
    };
  }

  _geocodeZipToCoordinates(zip) {
    if (!zip) return null;
    const mapping = this._getFromStorage('zip_geocodes', {});
    if (mapping && mapping[zip]) {
      return mapping[zip];
    }
    return null;
  }

  _getOrCreatePreferredTeacherPreference(teacherId) {
    let prefs = this._getFromStorage('preferred_teacher_preferences', []);
    let pref = prefs.length > 0 ? prefs[0] : null;
    const now = new Date().toISOString();
    if (!pref) {
      pref = {
        id: this._generateId('pref_teacher'),
        teacherId: teacherId,
        program_type: 'core',
        created_at: now,
        notes: ''
      };
      prefs.push(pref);
    } else {
      pref.teacherId = teacherId;
      pref.program_type = 'core';
      pref.created_at = now;
    }
    this._saveToStorage('preferred_teacher_preferences', prefs);
    return pref;
  }

  _getOrCreatePreKApplicationDraft() {
    let apps = this._getFromStorage('prek_applications', []);
    let draft = apps.find(function (a) { return a.status === 'in_progress'; }) || null;
    const now = new Date().toISOString();
    if (!draft) {
      draft = {
        id: this._generateId('prek_app'),
        child_full_name: '',
        child_age_years: null,
        child_age_group: null,
        preferred_teacher_id: null,
        campusId: null,
        desired_start_date: null,
        desired_start_timeframe: null,
        status: 'in_progress',
        created_at: now,
        updated_at: now
      };
      apps.push(draft);
      this._saveToStorage('prek_applications', apps);
    }
    return draft;
  }

  // ---------- Interface implementations ----------

  // getHomeOverview()
  getHomeOverview() {
    const campuses = this._getFromStorage('campuses', []);
    const stored = this._getFromStorage('home_overview', null);
    const result = stored || {
      mission_heading: '',
      mission_body: '',
      age_groups_summary: [],
      campuses: []
    };

    // Resolve campus foreign keys in result.campuses if present
    if (result && result.campuses && result.campuses.length) {
      result.campuses = result.campuses.map((c) => {
        const campus = campuses.find((cp) => cp.id === c.campus_id) || null;
        return Object.assign({}, c, { campus: campus });
      });
    }

    return result;
  }

  // getHomeFeaturedContent()
  getHomeFeaturedContent() {
    const programs = this._getFromStorage('programs', []);
    const events = this._getFromStorage('events', []);
    const campuses = this._getFromStorage('campuses', []);

    const stored = this._getFromStorage('home_featured_content', null);
    const result = stored || {
      featured_programs: [],
      upcoming_events: [],
      announcements: []
    };

    // Resolve program references
    if (result.featured_programs && result.featured_programs.length) {
      result.featured_programs = result.featured_programs.map((fp) => {
        const program = programs.find((p) => p.id === fp.program_id) || null;
        let campus = null;
        if (program) {
          campus = campuses.find((c) => c.id === program.campusId) || null;
        }
        return Object.assign({}, fp, {
          program: program,
          campus: campus
        });
      });
    }

    // Resolve event references
    if (result.upcoming_events && result.upcoming_events.length) {
      result.upcoming_events = result.upcoming_events.map((ue) => {
        const event = events.find((e) => e.id === ue.event_id) || null;
        let campus = null;
        if (event && event.campusId) {
          campus = campuses.find((c) => c.id === event.campusId) || null;
        }
        return Object.assign({}, ue, {
          event: event,
          campus: campus
        });
      });
    }

    return result;
  }

  // getProgramFilterOptions()
  getProgramFilterOptions() {
    const programs = this._getFromStorage('programs', []);

    const ageGroupSet = {};
    const scheduleTypeSet = {};
    const timeOfDaySet = {};
    const dayOfWeekSet = {};
    const startMonthSet = {};

    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];
      if (p.age_group) ageGroupSet[p.age_group] = true;
      if (p.schedule_type) scheduleTypeSet[p.schedule_type] = true;
      if (p.time_of_day) timeOfDaySet[p.time_of_day] = true;
      if (Array.isArray(p.days_of_week)) {
        for (let j = 0; j < p.days_of_week.length; j++) {
          dayOfWeekSet[p.days_of_week[j]] = true;
        }
      }
      if (Array.isArray(p.start_dates)) {
        for (let k = 0; k < p.start_dates.length; k++) {
          const d = this._parseISODate(p.start_dates[k]);
          if (!d) continue;
          const ym = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
          startMonthSet[ym] = true;
        }
      }
    }

    const age_groups = Object.keys(ageGroupSet).sort().map((v) => ({
      value: v,
      label: this._labelizeAgeGroup(v)
    }));

    const schedule_types = Object.keys(scheduleTypeSet).sort().map((v) => ({
      value: v,
      label: this._labelizeScheduleType(v)
    }));

    const time_of_day_options = Object.keys(timeOfDaySet).sort().map((v) => ({
      value: v,
      label: this._labelizeTimeOfDay(v)
    }));

    const day_of_week_order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const day_of_week_options = day_of_week_order
      .filter((d) => dayOfWeekSet[d])
      .map((d) => ({
        value: d,
        label: d.charAt(0).toUpperCase() + d.slice(1)
      }));

    const start_months = Object.keys(startMonthSet).sort().map((ym) => ({
      year_month: ym,
      label: this._labelizeMonth(ym)
    }));

    return {
      age_groups: age_groups,
      schedule_types: schedule_types,
      time_of_day_options: time_of_day_options,
      day_of_week_options: day_of_week_options,
      start_months: start_months,
      schedule_labels_help_text: 'Full day, half day, school day, extended day, and enrichment session options are available depending on program.'
    };
  }

  // searchPrograms(program_type, age_group, schedule_type, min_end_time, zip_code, radius_miles, start_month, day_of_week, time_of_day, sort_by, limit, offset)
  searchPrograms(program_type, age_group, schedule_type, min_end_time, zip_code, radius_miles, start_month, day_of_week, time_of_day, sort_by, limit, offset) {
    const programs = this._getFromStorage('programs', []);
    const campuses = this._getFromStorage('campuses', []);

    let filtered = programs.filter(function (p) { return p.is_active !== false; });

    if (program_type) {
      filtered = filtered.filter(function (p) { return p.program_type === program_type; });
    }
    if (age_group) {
      filtered = filtered.filter(function (p) { return p.age_group === age_group; });
    }
    if (schedule_type) {
      filtered = filtered.filter(function (p) { return p.schedule_type === schedule_type; });
    }
    if (min_end_time) {
      const self = this;
      filtered = filtered.filter(function (p) {
        if (!p.end_time) return false;
        return self._compareTimeStrings(p.end_time, min_end_time) >= 0;
      }.bind(this));
    }

    // Location filtering by ZIP and optional radius
    if (zip_code) {
      const zipCoord = this._geocodeZipToCoordinates(zip_code);
      filtered = filtered.filter(function (p) {
        const campus = campuses.find(function (c) { return c.id === p.campusId; }) || null;
        if (!campus) return false;
        // If we have coordinates and radius, use haversine
        if (zipCoord && typeof campus.latitude === 'number' && typeof campus.longitude === 'number' && typeof radius_miles === 'number') {
          const dist = this._haversineMiles(zipCoord.latitude, zipCoord.longitude, campus.latitude, campus.longitude);
          return dist <= radius_miles;
        }
        // Fallback: match zip codes directly if radius can't be computed
        return campus.zip_code === zip_code;
      }.bind(this));
    }

    if (start_month) {
      filtered = filtered.filter(function (p) {
        if (!Array.isArray(p.start_dates) || p.start_dates.length === 0) return false;
        for (let i = 0; i < p.start_dates.length; i++) {
          const d = this._parseISODate(p.start_dates[i]);
          if (!d) continue;
          const ym = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
          if (ym === start_month) return true;
        }
        return false;
      }.bind(this));
    }

    if (day_of_week) {
      filtered = filtered.filter(function (p) {
        if (!Array.isArray(p.days_of_week)) return false;
        return p.days_of_week.indexOf(day_of_week) >= 0;
      });
    }

    if (time_of_day) {
      filtered = filtered.filter(function (p) { return p.time_of_day === time_of_day; });
    }

    // Sorting
    if (sort_by === 'monthly_tuition_low_to_high') {
      filtered.sort(function (a, b) {
        const at = typeof a.monthly_tuition === 'number' ? a.monthly_tuition : Number.POSITIVE_INFINITY;
        const bt = typeof b.monthly_tuition === 'number' ? b.monthly_tuition : Number.POSITIVE_INFINITY;
        return at - bt;
      });
    } else if (sort_by === 'start_date_soonest_first') {
      const self = this;
      filtered.sort(function (a, b) {
        const aDates = Array.isArray(a.start_dates) ? a.start_dates : [];
        const bDates = Array.isArray(b.start_dates) ? b.start_dates : [];
        const aMin = self._getEarliestDateFromArray(aDates);
        const bMin = self._getEarliestDateFromArray(bDates);
        if (!aMin && !bMin) return 0;
        if (!aMin) return 1;
        if (!bMin) return -1;
        return aMin.getTime() - bMin.getTime();
      });
    } else if (sort_by === 'price_low_to_high') {
      filtered.sort(function (a, b) {
        const aPrice = typeof a.session_price === 'number' ? a.session_price : (typeof a.monthly_tuition === 'number' ? a.monthly_tuition : Number.POSITIVE_INFINITY);
        const bPrice = typeof b.session_price === 'number' ? b.session_price : (typeof b.monthly_tuition === 'number' ? b.monthly_tuition : Number.POSITIVE_INFINITY);
        return aPrice - bPrice;
      });
    }

    const total_results = filtered.length;

    // Pagination
    const off = typeof offset === 'number' && offset > 0 ? offset : 0;
    let paged = filtered;
    if (typeof limit === 'number' && limit > 0) {
      paged = filtered.slice(off, off + limit);
    } else if (off > 0) {
      paged = filtered.slice(off);
    }

    const programsOut = paged.map(function (p) {
      const campus = campuses.find(function (c) { return c.id === p.campusId; }) || null;
      const earliestDateObj = this._getEarliestDateFromArray(Array.isArray(p.start_dates) ? p.start_dates : []);
      const earliest_start_date = earliestDateObj ? earliestDateObj.toISOString() : null;
      return {
        program_id: p.id,
        name: p.name,
        short_name: p.short_name || '',
        program_type: p.program_type,
        age_group: p.age_group,
        age_group_label: this._labelizeAgeGroup(p.age_group),
        schedule_type: p.schedule_type,
        schedule_type_label: this._labelizeScheduleType(p.schedule_type),
        days_of_week: Array.isArray(p.days_of_week) ? p.days_of_week.slice() : [],
        start_time: p.start_time || null,
        end_time: p.end_time || null,
        time_of_day: p.time_of_day || null,
        monthly_tuition: typeof p.monthly_tuition === 'number' ? p.monthly_tuition : null,
        session_price: typeof p.session_price === 'number' ? p.session_price : null,
        currency: p.currency || '',
        campus_id: campus ? campus.id : null,
        campus_name: campus ? campus.name : '',
        campus_city: campus ? campus.city : '',
        campus_zip_code: campus ? campus.zip_code : '',
        earliest_start_date: earliest_start_date,
        is_waitlist_available: !!p.is_waitlist_available,
        is_pre_enrollment_available: !!p.is_pre_enrollment_available,
        is_enrichment_enrollment_available: !!p.is_enrichment_enrollment_available,
        campus: campus
      };
    }.bind(this));

    return {
      total_results: total_results,
      programs: programsOut
    };
  }

  _getEarliestDateFromArray(dateStrings) {
    let min = null;
    for (let i = 0; i < dateStrings.length; i++) {
      const d = this._parseISODate(dateStrings[i]);
      if (!d) continue;
      if (!min || d.getTime() < min.getTime()) {
        min = d;
      }
    }
    return min;
  }

  // getProgramDetails(programId)
  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs', []);
    const campuses = this._getFromStorage('campuses', []);

    const program = programs.find(function (p) { return p.id === programId; }) || null;
    if (!program) {
      return {
        program_id: null,
        name: '',
        short_name: '',
        description: '',
        program_type: '',
        age_group: '',
        age_group_label: '',
        age_min_months: null,
        age_max_months: null,
        schedule_type: '',
        schedule_type_label: '',
        days_of_week: [],
        start_time: null,
        end_time: null,
        time_of_day: null,
        monthly_tuition: null,
        session_price: null,
        currency: '',
        campus_id: null,
        campus_name: '',
        campus_address_line1: '',
        campus_city: '',
        campus_state: '',
        campus_zip_code: '',
        available_start_dates: [],
        is_waitlist_available: false,
        is_pre_enrollment_available: false,
        is_enrichment_enrollment_available: false,
        campus: null
      };
    }

    const campus = campuses.find(function (c) { return c.id === program.campusId; }) || null;

    return {
      program_id: program.id,
      name: program.name,
      short_name: program.short_name || '',
      description: program.description || '',
      program_type: program.program_type,
      age_group: program.age_group,
      age_group_label: this._labelizeAgeGroup(program.age_group),
      age_min_months: typeof program.age_min_months === 'number' ? program.age_min_months : null,
      age_max_months: typeof program.age_max_months === 'number' ? program.age_max_months : null,
      schedule_type: program.schedule_type,
      schedule_type_label: this._labelizeScheduleType(program.schedule_type),
      days_of_week: Array.isArray(program.days_of_week) ? program.days_of_week.slice() : [],
      start_time: program.start_time || null,
      end_time: program.end_time || null,
      time_of_day: program.time_of_day || null,
      monthly_tuition: typeof program.monthly_tuition === 'number' ? program.monthly_tuition : null,
      session_price: typeof program.session_price === 'number' ? program.session_price : null,
      currency: program.currency || '',
      campus_id: campus ? campus.id : null,
      campus_name: campus ? campus.name : '',
      campus_address_line1: campus ? campus.address_line1 : '',
      campus_city: campus ? campus.city : '',
      campus_state: campus ? campus.state : '',
      campus_zip_code: campus ? campus.zip_code : '',
      available_start_dates: Array.isArray(program.start_dates) ? program.start_dates.slice() : [],
      is_waitlist_available: !!program.is_waitlist_available,
      is_pre_enrollment_available: !!program.is_pre_enrollment_available,
      is_enrichment_enrollment_available: !!program.is_enrichment_enrollment_available,
      campus: campus
    };
  }

  // startPreEnrollment(programId, child_full_name, child_age_years, child_age_group, preferred_start_date, notes)
  startPreEnrollment(programId, child_full_name, child_age_years, child_age_group, preferred_start_date, notes) {
    const programs = this._getFromStorage('programs', []);
    const preEnrollments = this._getFromStorage('pre_enrollments', []);

    const program = programs.find(function (p) { return p.id === programId; }) || null;
    const now = new Date().toISOString();
    const preEnrollment = {
      id: this._generateId('preenroll'),
      programId: programId,
      child_full_name: child_full_name,
      child_age_years: child_age_years,
      child_age_group: child_age_group || (program ? program.age_group : null),
      preferred_start_date: preferred_start_date,
      notes: notes || '',
      status: 'in_progress',
      created_at: now,
      updated_at: now
    };

    preEnrollments.push(preEnrollment);
    this._saveToStorage('pre_enrollments', preEnrollments);

    return {
      pre_enrollment_id: preEnrollment.id,
      status: preEnrollment.status,
      program_id: programId,
      program_name: program ? program.name : '',
      child_full_name: child_full_name,
      child_age_years: child_age_years,
      preferred_start_date: preferred_start_date,
      created_at: now,
      message: 'Pre-enrollment started.'
    };
  }

  // submitWaitlistRequest(programId, campusId, child_full_name, child_date_of_birth, notes)
  submitWaitlistRequest(programId, campusId, child_full_name, child_date_of_birth, notes) {
    const programs = this._getFromStorage('programs', []);
    const campuses = this._getFromStorage('campuses', []);
    const waitlists = this._getFromStorage('waitlist_requests', []);

    const program = programs.find(function (p) { return p.id === programId; }) || null;
    const campus = campuses.find(function (c) { return c.id === campusId; }) || null;

    const now = new Date().toISOString();
    const wr = {
      id: this._generateId('waitlist'),
      programId: programId,
      campusId: campusId,
      child_full_name: child_full_name,
      child_date_of_birth: child_date_of_birth,
      notes: notes || '',
      status: 'pending',
      created_at: now
    };

    waitlists.push(wr);
    this._saveToStorage('waitlist_requests', waitlists);

    return {
      waitlist_request_id: wr.id,
      status: wr.status,
      program_id: programId,
      program_name: program ? program.name : '',
      campus_id: campusId,
      campus_name: campus ? campus.name : '',
      child_full_name: child_full_name,
      child_date_of_birth: child_date_of_birth,
      created_at: now,
      message: 'Waitlist request submitted.'
    };
  }

  // startEnrichmentEnrollment(programId, child_full_name, selected_start_date)
  startEnrichmentEnrollment(programId, child_full_name, selected_start_date) {
    const programs = this._getFromStorage('programs', []);
    const enrollments = this._getFromStorage('enrichment_enrollments', []);

    const program = programs.find(function (p) { return p.id === programId; }) || null;
    const now = new Date().toISOString();

    const ee = {
      id: this._generateId('enrich_enroll'),
      programId: programId,
      child_full_name: child_full_name,
      selected_start_date: selected_start_date,
      status: 'in_progress',
      created_at: now
    };

    enrollments.push(ee);
    this._saveToStorage('enrichment_enrollments', enrollments);

    return {
      enrichment_enrollment_id: ee.id,
      status: ee.status,
      program_id: programId,
      program_name: program ? program.name : '',
      child_full_name: child_full_name,
      selected_start_date: selected_start_date,
      created_at: now,
      message: 'Enrichment enrollment started.'
    };
  }

  // getTourCampuses()
  getTourCampuses() {
    const campuses = this._getFromStorage('campuses', []);
    return campuses.map(function (c) {
      return {
        campus_id: c.id,
        name: c.name,
        address_line1: c.address_line1,
        city: c.city,
        state: c.state,
        zip_code: c.zip_code
      };
    });
  }

  // getTourCalendar(campusId, start_date, end_date)
  getTourCalendar(campusId, start_date, end_date) {
    const tourSlots = this._getFromStorage('tour_slots', []);
    const campuses = this._getFromStorage('campuses', []);
    const campus = campuses.find(function (c) { return c.id === campusId; }) || null;

    const start = this._parseISODate(start_date + 'T00:00:00');
    const end = this._parseISODate(end_date + 'T23:59:59');

    const slots = tourSlots.filter(function (ts) {
      if (ts.campusId !== campusId) return false;
      const d = this._parseISODate(ts.date);
      if (!d) return false;
      if (start && d.getTime() < start.getTime()) return false;
      if (end && d.getTime() > end.getTime()) return false;
      return true;
    }.bind(this));

    const daysMap = {};
    for (let i = 0; i < slots.length; i++) {
      const ts = slots[i];
      const dateStr = this._dateToYMD(this._parseISODate(ts.date));
      if (!daysMap[dateStr]) {
        const dow = this._dayOfWeekFromDateString(dateStr + 'T00:00:00');
        daysMap[dateStr] = {
          date: dateStr,
          day_of_week: dow,
          slots: []
        };
      }
      daysMap[dateStr].slots.push({
        tour_slot_id: ts.id,
        start_time: ts.start_time,
        end_time: ts.end_time,
        is_available: !!ts.is_available
      });
    }

    const days = Object.keys(daysMap).sort().map(function (k) { return daysMap[k]; });

    return {
      campus_id: campus ? campus.id : campusId,
      campus_name: campus ? campus.name : '',
      days: days,
      campus: campus
    };
  }

  // submitTourRequest(campusId, tourSlotId, parent_guardian_name, email, num_adults, num_children, notes)
  submitTourRequest(campusId, tourSlotId, parent_guardian_name, email, num_adults, num_children, notes) {
    const campuses = this._getFromStorage('campuses', []);
    const slots = this._getFromStorage('tour_slots', []);
    const requests = this._getFromStorage('tour_requests', []);

    const campus = campuses.find(function (c) { return c.id === campusId; }) || null;
    const slot = slots.find(function (s) { return s.id === tourSlotId; }) || null;

    const now = new Date().toISOString();
    const tr = {
      id: this._generateId('tour_req'),
      campusId: campusId,
      tourSlotId: tourSlotId,
      parent_guardian_name: parent_guardian_name,
      email: email,
      num_adults: num_adults,
      num_children: num_children,
      notes: notes || '',
      status: 'requested',
      created_at: now
    };

    requests.push(tr);
    this._saveToStorage('tour_requests', requests);

    const dateStr = slot ? this._dateToYMD(this._parseISODate(slot.date)) : null;

    return {
      tour_request_id: tr.id,
      status: tr.status,
      campus_id: campusId,
      campus_name: campus ? campus.name : '',
      tour_slot_id: tourSlotId,
      date: dateStr,
      start_time: slot ? slot.start_time : null,
      end_time: slot ? slot.end_time : null,
      parent_guardian_name: parent_guardian_name,
      email: email,
      num_adults: num_adults,
      num_children: num_children,
      created_at: now,
      message: 'Tour request submitted.',
      campus: campus,
      tour_slot: slot
    };
  }

  // getTuitionInfo()
  getTuitionInfo() {
    const stored = this._getFromStorage('tuition_info', null);
    if (stored) return stored;
    return {
      overview_heading: '',
      overview_body: '',
      fee_policies: '',
      refund_policies: '',
      included_in_tuition: ''
    };
  }

  // getTuitionCalculatorOptions()
  getTuitionCalculatorOptions() {
    const rates = this._getFromStorage('tuition_rates', []);
    const ageSet = {};
    const daysSet = {};

    for (let i = 0; i < rates.length; i++) {
      const r = rates[i];
      if (r.age_group) ageSet[r.age_group] = true;
      if (typeof r.days_per_week === 'number') daysSet[r.days_per_week] = true;
    }

    const age_groups = Object.keys(ageSet).sort().map((v) => ({
      value: v,
      label: this._labelizeAgeGroup(v)
    }));

    const days_per_week_options = Object.keys(daysSet).map((d) => parseInt(d, 10)).sort(function (a, b) { return a - b; });

    const add_ons = [
      {
        key: 'extended_care_evening',
        label: 'Extended Care (Evening)',
        description: 'Add evening extended care to your plan.'
      }
    ];

    return {
      age_groups: age_groups,
      days_per_week_options: days_per_week_options,
      add_ons: add_ons
    };
  }

  // getTuitionEstimate(age_group, days_per_week, include_extended_care_evening)
  getTuitionEstimate(age_group, days_per_week, include_extended_care_evening) {
    return this._calculateTuitionFromRates(age_group, days_per_week, include_extended_care_evening);
  }

  // saveTuitionPlan(age_group, days_per_week, include_extended_care_evening, estimated_monthly_tuition, currency, tuitionRateId)
  saveTuitionPlan(age_group, days_per_week, include_extended_care_evening, estimated_monthly_tuition, currency, tuitionRateId) {
    const plans = this._getFromStorage('tuition_plans', []);
    const now = new Date().toISOString();

    const plan = {
      id: this._generateId('tuition_plan'),
      age_group: age_group,
      days_per_week: days_per_week,
      include_extended_care_evening: !!include_extended_care_evening,
      estimated_monthly_tuition: estimated_monthly_tuition,
      currency: currency || '',
      tuitionRateId: tuitionRateId || null,
      created_at: now
    };

    plans.push(plan);
    this._saveToStorage('tuition_plans', plans);

    return {
      tuition_plan_id: plan.id,
      age_group: age_group,
      days_per_week: days_per_week,
      include_extended_care_evening: !!include_extended_care_evening,
      estimated_monthly_tuition: estimated_monthly_tuition,
      currency: currency || '',
      created_at: now,
      message: 'Tuition plan saved.'
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    const ageSet = {};
    const priceSet = {};
    const timeSet = {};
    const daySet = {};

    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.age_group) ageSet[e.age_group] = true;
      if (e.price_type) priceSet[e.price_type] = true;
      if (e.time_of_day) timeSet[e.time_of_day] = true;
      if (e.day_of_week) daySet[e.day_of_week] = true;
    }

    const age_groups = Object.keys(ageSet).sort().map((v) => ({
      value: v,
      label: this._labelizeAgeGroup(v)
    }));

    const price_types = Object.keys(priceSet).sort().map((v) => ({
      value: v,
      label: v === 'free' ? 'Free' : 'Paid'
    }));

    const time_of_day_options = Object.keys(timeSet).sort().map((v) => ({
      value: v,
      label: this._labelizeTimeOfDay(v)
    }));

    const day_of_week_order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const day_of_week_options = day_of_week_order
      .filter((d) => daySet[d])
      .map((d) => ({
        value: d,
        label: d.charAt(0).toUpperCase() + d.slice(1)
      }));

    return {
      age_groups: age_groups,
      price_types: price_types,
      time_of_day_options: time_of_day_options,
      day_of_week_options: day_of_week_options
    };
  }

  // searchEvents(date_from, date_to, age_group, price_type, time_of_day, weekday_only, days_of_week)
  searchEvents(date_from, date_to, age_group, price_type, time_of_day, weekday_only, days_of_week) {
    const events = this._getFromStorage('events', []);
    const campuses = this._getFromStorage('campuses', []);
    const schedule = this._getOrCreateMySchedule();
    const scheduledEvents = this._getFromStorage('scheduled_events', []);

    const start = date_from ? this._parseISODate(date_from + 'T00:00:00') : null;
    const end = date_to ? this._parseISODate(date_to + 'T23:59:59') : null;

    let filtered = events.filter(function (e) { return e.is_active !== false; });

    filtered = filtered.filter(function (e) {
      const d = this._parseISODate(e.start_datetime);
      if (!d) return false;
      if (start && d.getTime() < start.getTime()) return false;
      if (end && d.getTime() > end.getTime()) return false;
      return true;
    }.bind(this));

    if (age_group) {
      filtered = filtered.filter(function (e) { return e.age_group === age_group; });
    }
    if (price_type) {
      filtered = filtered.filter(function (e) { return e.price_type === price_type; });
    }
    if (time_of_day) {
      filtered = filtered.filter(function (e) { return e.time_of_day === time_of_day; });
    }
    if (weekday_only) {
      filtered = filtered.filter(function (e) {
        if (typeof e.is_weekday === 'boolean') return e.is_weekday;
        if (e.day_of_week) {
          return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].indexOf(e.day_of_week) >= 0;
        }
        const d = this._parseISODate(e.start_datetime);
        if (!d) return false;
        const dow = d.getDay();
        return dow >= 1 && dow <= 5;
      }.bind(this));
    }
    if (Array.isArray(days_of_week) && days_of_week.length > 0) {
      filtered = filtered.filter(function (e) {
        if (!e.day_of_week) return false;
        return days_of_week.indexOf(e.day_of_week) >= 0;
      });
    }

    // Sort by start_datetime ascending
    filtered.sort(function (a, b) {
      const ad = this._parseISODate(a.start_datetime);
      const bd = this._parseISODate(b.start_datetime);
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return ad.getTime() - bd.getTime();
    }.bind(this));

    // Build set of eventIds in current schedule
    const inSchedule = {};
    for (let i = 0; i < scheduledEvents.length; i++) {
      const se = scheduledEvents[i];
      if (se.scheduleId === schedule.id) {
        inSchedule[se.eventId] = true;
      }
    }

    const eventsOut = filtered.map(function (e) {
      const campus = e.campusId ? campuses.find(function (c) { return c.id === e.campusId; }) || null : null;
      return {
        event_id: e.id,
        title: e.title,
        description: e.description || '',
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime || null,
        campus_name: campus ? campus.name : '',
        age_range_label: this._labelizeAgeGroup(e.age_group || ''),
        price_type: e.price_type,
        price: typeof e.price === 'number' ? e.price : null,
        time_of_day: e.time_of_day || null,
        day_of_week: e.day_of_week || null,
        is_weekday: typeof e.is_weekday === 'boolean' ? e.is_weekday : null,
        is_in_my_schedule: !!inSchedule[e.id],
        campus: campus
      };
    }.bind(this));

    return {
      total_results: eventsOut.length,
      events: eventsOut
    };
  }

  // addEventToMySchedule(eventId)
  addEventToMySchedule(eventId) {
    const schedule = this._getOrCreateMySchedule();
    const scheduledEvents = this._getFromStorage('scheduled_events', []);

    let existing = scheduledEvents.find(function (se) {
      return se.scheduleId === schedule.id && se.eventId === eventId;
    });

    const now = new Date().toISOString();

    if (!existing) {
      existing = {
        id: this._generateId('sched_event'),
        scheduleId: schedule.id,
        eventId: eventId,
        added_at: now,
        notes: ''
      };
      scheduledEvents.push(existing);
      this._saveToStorage('scheduled_events', scheduledEvents);
    }

    const total = scheduledEvents.filter(function (se) { return se.scheduleId === schedule.id; }).length;

    return {
      scheduled_event_id: existing.id,
      schedule_id: schedule.id,
      event_id: eventId,
      added_at: existing.added_at,
      total_events_in_schedule: total,
      message: 'Event added to My Schedule.'
    };
  }

  // getMySchedule()
  getMySchedule() {
    const schedule = this._getOrCreateMySchedule();
    const scheduledEvents = this._getFromStorage('scheduled_events', []);
    const events = this._getFromStorage('events', []);
    const campuses = this._getFromStorage('campuses', []);

    const items = [];
    for (let i = 0; i < scheduledEvents.length; i++) {
      const se = scheduledEvents[i];
      if (se.scheduleId !== schedule.id) continue;
      const event = events.find(function (e) { return e.id === se.eventId; }) || null;
      const campus = event && event.campusId ? campuses.find(function (c) { return c.id === event.campusId; }) || null : null;
      items.push({
        scheduled_event_id: se.id,
        event_id: se.eventId,
        title: event ? event.title : '',
        start_datetime: event ? event.start_datetime : null,
        campus_name: campus ? campus.name : '',
        event: event,
        campus: campus
      });
    }

    return {
      schedule_id: schedule.id,
      name: schedule.name,
      created_at: schedule.created_at,
      events: items
    };
  }

  // getMealPreferences()
  getMealPreferences() {
    const pref = this._getCurrentMealPreferencesOrDefault();

    const allergy_options = [
      { value: 'peanuts', label: 'Peanuts' },
      { value: 'tree_nuts', label: 'Tree Nuts' },
      { value: 'dairy', label: 'Dairy' },
      { value: 'eggs', label: 'Eggs' },
      { value: 'soy', label: 'Soy' },
      { value: 'gluten', label: 'Gluten' },
      { value: 'shellfish', label: 'Shellfish' }
    ];

    const diet_options = [
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'vegan', label: 'Vegan' },
      { value: 'kosher', label: 'Kosher' },
      { value: 'halal', label: 'Halal' },
      { value: 'gluten_free', label: 'Gluten-free' }
    ];

    const lunch_option_labels = {
      school_lunch: 'School Lunch',
      home_lunch: 'Bringing Lunch from Home',
      no_lunch: 'No Lunch'
    };

    return {
      meal_preference_id: pref.id,
      child_full_name: pref.child_full_name || '',
      allergies: Array.isArray(pref.allergies) ? pref.allergies.slice() : [],
      diet_preferences: Array.isArray(pref.diet_preferences) ? pref.diet_preferences.slice() : [],
      monday_lunch_option: pref.monday_lunch_option || 'school_lunch',
      tuesday_lunch_option: pref.tuesday_lunch_option || 'school_lunch',
      wednesday_lunch_option: pref.wednesday_lunch_option || 'school_lunch',
      thursday_lunch_option: pref.thursday_lunch_option || 'school_lunch',
      friday_lunch_option: pref.friday_lunch_option || 'school_lunch',
      last_updated: pref.last_updated || null,
      allergy_options: allergy_options,
      diet_options: diet_options,
      lunch_option_labels: lunch_option_labels
    };
  }

  // saveMealPreferences(child_full_name, allergies, diet_preferences, monday_lunch_option, tuesday_lunch_option, wednesday_lunch_option, thursday_lunch_option, friday_lunch_option)
  saveMealPreferences(child_full_name, allergies, diet_preferences, monday_lunch_option, tuesday_lunch_option, wednesday_lunch_option, thursday_lunch_option, friday_lunch_option) {
    let prefs = this._getFromStorage('meal_preferences', []);
    let pref = prefs.length > 0 ? prefs[0] : null;
    const now = new Date().toISOString();

    if (!pref) {
      pref = {
        id: this._generateId('meal_pref'),
        child_full_name: child_full_name || '',
        allergies: Array.isArray(allergies) ? allergies.slice() : [],
        diet_preferences: Array.isArray(diet_preferences) ? diet_preferences.slice() : [],
        monday_lunch_option: monday_lunch_option,
        tuesday_lunch_option: tuesday_lunch_option,
        wednesday_lunch_option: wednesday_lunch_option,
        thursday_lunch_option: thursday_lunch_option,
        friday_lunch_option: friday_lunch_option,
        last_updated: now
      };
      prefs.push(pref);
    } else {
      pref.child_full_name = child_full_name || pref.child_full_name || '';
      pref.allergies = Array.isArray(allergies) ? allergies.slice() : [];
      pref.diet_preferences = Array.isArray(diet_preferences) ? diet_preferences.slice() : [];
      pref.monday_lunch_option = monday_lunch_option;
      pref.tuesday_lunch_option = tuesday_lunch_option;
      pref.wednesday_lunch_option = wednesday_lunch_option;
      pref.thursday_lunch_option = thursday_lunch_option;
      pref.friday_lunch_option = friday_lunch_option;
      pref.last_updated = now;
    }

    this._saveToStorage('meal_preferences', prefs);

    return {
      meal_preference_id: pref.id,
      last_updated: pref.last_updated,
      message: 'Meal preferences saved.'
    };
  }

  // getAboutCenterContent()
  getAboutCenterContent() {
    const stored = this._getFromStorage('about_center_content', null);
    if (stored) return stored;
    return {
      mission: '',
      educational_philosophy: '',
      age_groups_overview: '',
      programs_overview: '',
      core_strengths: []
    };
  }

  // getTeacherFilterOptions()
  getTeacherFilterOptions() {
    const campuses = this._getFromStorage('campuses', []);
    const teachers = this._getFromStorage('teachers', []);

    const campusOptions = campuses.map(function (c) {
      return { campus_id: c.id, name: c.name };
    });

    const ageSet = {};
    for (let i = 0; i < teachers.length; i++) {
      const t = teachers[i];
      if (t.age_group) ageSet[t.age_group] = true;
    }
    const age_groups = Object.keys(ageSet).sort().map((v) => ({
      value: v,
      label: this._labelizeAgeGroup(v)
    }));

    return {
      campuses: campusOptions,
      age_groups: age_groups
    };
  }

  // searchTeachers(campusId, age_group, is_prek_teacher)
  searchTeachers(campusId, age_group, is_prek_teacher) {
    const teachers = this._getFromStorage('teachers', []);
    const campuses = this._getFromStorage('campuses', []);

    let filtered = teachers.slice();
    if (campusId) {
      filtered = filtered.filter(function (t) { return t.campusId === campusId; });
    }
    if (age_group) {
      filtered = filtered.filter(function (t) { return t.age_group === age_group; });
    }
    if (typeof is_prek_teacher === 'boolean') {
      filtered = filtered.filter(function (t) { return !!t.is_prek_teacher === is_prek_teacher; });
    }

    const out = filtered.map(function (t) {
      const campus = campuses.find(function (c) { return c.id === t.campusId; }) || null;
      return {
        teacher_id: t.id,
        full_name: t.full_name,
        campus_name: campus ? campus.name : '',
        age_group: t.age_group,
        age_group_label: this._labelizeAgeGroup(t.age_group),
        classroom_name: t.classroom_name || '',
        years_of_experience: t.years_of_experience,
        is_prek_teacher: !!t.is_prek_teacher,
        campus: campus
      };
    }.bind(this));

    return {
      total_results: out.length,
      teachers: out
    };
  }

  // getTeacherProfile(teacherId)
  getTeacherProfile(teacherId) {
    const teachers = this._getFromStorage('teachers', []);
    const campuses = this._getFromStorage('campuses', []);
    const prefs = this._getFromStorage('preferred_teacher_preferences', []);

    const teacher = teachers.find(function (t) { return t.id === teacherId; }) || null;
    if (!teacher) {
      return {
        teacher_id: null,
        full_name: '',
        first_name: '',
        last_name: '',
        campus_id: null,
        campus_name: '',
        age_group: '',
        age_group_label: '',
        classroom_name: '',
        years_of_experience: null,
        biography: '',
        certifications: [],
        photo_url: '',
        is_prek_teacher: false,
        is_currently_preferred_for_application: false,
        campus: null
      };
    }

    const campus = campuses.find(function (c) { return c.id === teacher.campusId; }) || null;
    const preferred = prefs.length > 0 ? prefs[0] : null;
    const isPreferred = preferred && preferred.teacherId === teacherId;

    return {
      teacher_id: teacher.id,
      full_name: teacher.full_name,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      campus_id: campus ? campus.id : null,
      campus_name: campus ? campus.name : '',
      age_group: teacher.age_group,
      age_group_label: this._labelizeAgeGroup(teacher.age_group),
      classroom_name: teacher.classroom_name || '',
      years_of_experience: teacher.years_of_experience,
      biography: teacher.biography || '',
      certifications: Array.isArray(teacher.certifications) ? teacher.certifications.slice() : [],
      photo_url: teacher.photo_url || '',
      is_prek_teacher: !!teacher.is_prek_teacher,
      is_currently_preferred_for_application: !!isPreferred,
      campus: campus
    };
  }

  // setPreferredTeacherForPreKApplication(teacherId)
  setPreferredTeacherForPreKApplication(teacherId) {
    const teachers = this._getFromStorage('teachers', []);
    const campuses = this._getFromStorage('campuses', []);

    const teacher = teachers.find(function (t) { return t.id === teacherId; }) || null;
    const pref = this._getOrCreatePreferredTeacherPreference(teacherId);

    let campus = null;
    if (teacher) {
      campus = campuses.find(function (c) { return c.id === teacher.campusId; }) || null;
    }

    return {
      preferred_teacher_preference_id: pref.id,
      teacher_id: teacherId,
      teacher_full_name: teacher ? teacher.full_name : '',
      campus_name: campus ? campus.name : '',
      created_at: pref.created_at,
      message: 'Preferred teacher set for Pre-K application.',
      show_start_application_banner: true,
      teacher: teacher,
      campus: campus
    };
  }

  // getPreferredTeacherForPreKApplication()
  getPreferredTeacherForPreKApplication() {
    const prefs = this._getFromStorage('preferred_teacher_preferences', []);
    const teachers = this._getFromStorage('teachers', []);
    const campuses = this._getFromStorage('campuses', []);

    if (prefs.length === 0) {
      return {
        preferred_teacher_preference_id: null,
        teacher_id: null,
        teacher_full_name: '',
        campus_id: null,
        campus_name: '',
        created_at: null,
        teacher: null,
        campus: null
      };
    }

    const pref = prefs[0];
    const teacher = teachers.find(function (t) { return t.id === pref.teacherId; }) || null;
    let campus = null;
    if (teacher) {
      campus = campuses.find(function (c) { return c.id === teacher.campusId; }) || null;
    }

    return {
      preferred_teacher_preference_id: pref.id,
      teacher_id: pref.teacherId,
      teacher_full_name: teacher ? teacher.full_name : '',
      campus_id: campus ? campus.id : null,
      campus_name: campus ? campus.name : '',
      created_at: pref.created_at,
      teacher: teacher,
      campus: campus
    };
  }

  // startOrUpdatePreKApplication(application_id, child_full_name, child_age_years, child_age_group, campusId, desired_start_date, desired_start_timeframe, preferred_teacher_id, submit)
  startOrUpdatePreKApplication(application_id, child_full_name, child_age_years, child_age_group, campusId, desired_start_date, desired_start_timeframe, preferred_teacher_id, submit) {
    let apps = this._getFromStorage('prek_applications', []);
    const campuses = this._getFromStorage('campuses', []);
    const teachers = this._getFromStorage('teachers', []);
    const prefs = this._getFromStorage('preferred_teacher_preferences', []);

    let app = null;
    if (application_id) {
      app = apps.find(function (a) { return a.id === application_id; }) || null;
    }
    if (!app) {
      app = this._getOrCreatePreKApplicationDraft();
      // refresh apps in case draft was added
      apps = this._getFromStorage('prek_applications', []);
    }

    app.child_full_name = child_full_name;
    app.child_age_years = child_age_years;
    if (child_age_group) {
      app.child_age_group = child_age_group;
    } else if (!app.child_age_group) {
      // simple inference: 4->prek_4_years, 5->prek_5_years
      if (child_age_years === 4) app.child_age_group = 'prek_4_years';
      if (child_age_years === 5) app.child_age_group = 'prek_5_years';
    }

    if (campusId) {
      app.campusId = campusId;
    }

    if (desired_start_date) {
      app.desired_start_date = desired_start_date;
    }
    if (desired_start_timeframe) {
      app.desired_start_timeframe = desired_start_timeframe;
    }

    if (preferred_teacher_id) {
      app.preferred_teacher_id = preferred_teacher_id;
    } else if (!app.preferred_teacher_id && prefs.length > 0) {
      app.preferred_teacher_id = prefs[0].teacherId;
    }

    app.status = submit ? 'submitted' : 'in_progress';
    app.updated_at = new Date().toISOString();

    // persist
    const idx = apps.findIndex(function (a) { return a.id === app.id; });
    if (idx >= 0) {
      apps[idx] = app;
    } else {
      apps.push(app);
    }
    this._saveToStorage('prek_applications', apps);

    const campus = app.campusId ? campuses.find(function (c) { return c.id === app.campusId; }) || null : null;
    const teacher = app.preferred_teacher_id ? teachers.find(function (t) { return t.id === app.preferred_teacher_id; }) || null : null;

    return {
      application_id: app.id,
      status: app.status,
      child_full_name: app.child_full_name,
      child_age_years: app.child_age_years,
      child_age_group: app.child_age_group || null,
      campus_id: campus ? campus.id : null,
      campus_name: campus ? campus.name : '',
      desired_start_date: app.desired_start_date || null,
      desired_start_timeframe: app.desired_start_timeframe || null,
      preferred_teacher_id: app.preferred_teacher_id || null,
      preferred_teacher_full_name: teacher ? teacher.full_name : '',
      created_at: app.created_at,
      updated_at: app.updated_at,
      message: submit ? 'Pre-K application submitted.' : 'Pre-K application saved.',
      campus: campus,
      preferred_teacher: teacher
    };
  }

  // subscribeToNewsletter(email, first_name, topics, email_frequency, sms_updates_enabled, mobile_number)
  subscribeToNewsletter(email, first_name, topics, email_frequency, sms_updates_enabled, mobile_number) {
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    const now = new Date().toISOString();

    const sub = {
      id: this._generateId('newsletter_sub'),
      email: email,
      first_name: first_name || '',
      topics: Array.isArray(topics) ? topics.slice() : [],
      email_frequency: email_frequency,
      sms_updates_enabled: !!sms_updates_enabled,
      mobile_number: mobile_number || '',
      created_at: now
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription_id: sub.id,
      email: sub.email,
      first_name: sub.first_name,
      topics: sub.topics,
      email_frequency: sub.email_frequency,
      sms_updates_enabled: sub.sms_updates_enabled,
      mobile_number: sub.mobile_number,
      created_at: sub.created_at,
      message: 'Subscription saved.'
    };
  }

  // listCampusesWithSummary()
  listCampusesWithSummary() {
    const campuses = this._getFromStorage('campuses', []);
    const programs = this._getFromStorage('programs', []);
    const tourSlots = this._getFromStorage('tour_slots', []);

    return campuses.map(function (c) {
      const campusPrograms = programs.filter(function (p) { return p.campusId === c.id; });
      const ageSet = {};
      for (let i = 0; i < campusPrograms.length; i++) {
        const p = campusPrograms[i];
        if (p.age_group) ageSet[p.age_group] = true;
      }
      const age_groups_offered = Object.keys(ageSet);
      const has_tour_availability = tourSlots.some(function (ts) {
        return ts.campusId === c.id && ts.is_available;
      });
      return {
        campus_id: c.id,
        name: c.name,
        description: c.description || '',
        address_line1: c.address_line1,
        address_line2: c.address_line2 || '',
        city: c.city,
        state: c.state,
        zip_code: c.zip_code,
        phone: c.phone || '',
        email: c.email || '',
        hours: c.hours || '',
        age_groups_offered: age_groups_offered,
        has_tour_availability: has_tour_availability
      };
    });
  }

  // getCampusPrograms(campusId)
  getCampusPrograms(campusId) {
    const campuses = this._getFromStorage('campuses', []);
    const programs = this._getFromStorage('programs', []);

    const campus = campuses.find(function (c) { return c.id === campusId; }) || null;
    const campusPrograms = programs.filter(function (p) { return p.campusId === campusId; });

    const groupMap = {};
    for (let i = 0; i < campusPrograms.length; i++) {
      const p = campusPrograms[i];
      const ag = p.age_group || 'unknown';
      if (!groupMap[ag]) {
        groupMap[ag] = [];
      }
      groupMap[ag].push(p.name);
    }

    const age_group_programs = Object.keys(groupMap).map(function (ag) {
      return {
        age_group: ag,
        age_group_label: this._labelizeAgeGroup(ag),
        program_names: groupMap[ag]
      };
    }.bind(this));

    return {
      campus_id: campus ? campus.id : campusId,
      campus_name: campus ? campus.name : '',
      age_group_programs: age_group_programs,
      campus: campus
    };
  }

  // getContactInfo()
  getContactInfo() {
    const campuses = this._getFromStorage('campuses', []);
    const stored = this._getFromStorage('contact_info', null);

    const campus_contacts = campuses.map(function (c) {
      return {
        campus_id: c.id,
        campus_name: c.name,
        phone: c.phone || '',
        email: c.email || ''
      };
    });

    if (stored) {
      return {
        main_phone: stored.main_phone || '',
        main_email: stored.main_email || '',
        office_hours: stored.office_hours || '',
        campus_contacts: campus_contacts
      };
    }

    return {
      main_phone: '',
      main_email: '',
      office_hours: '',
      campus_contacts: campus_contacts
    };
  }

  // submitContactInquiry(name, email, phone, campusId, subject, message)
  submitContactInquiry(name, email, phone, campusId, subject, message) {
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const campuses = this._getFromStorage('campuses', []);
    const now = new Date().toISOString();

    const inquiry = {
      id: this._generateId('contact_inquiry'),
      name: name,
      email: email,
      phone: phone || '',
      campusId: campusId || null,
      subject: subject,
      message: message,
      created_at: now
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    const campus = campusId ? campuses.find(function (c) { return c.id === campusId; }) || null : null;

    return {
      inquiry_id: inquiry.id,
      created_at: now,
      message: 'Inquiry submitted.',
      campus: campus
    };
  }

  // getPoliciesContent()
  getPoliciesContent() {
    const stored = this._getFromStorage('policies_content', null);
    if (stored) return stored;
    return {
      privacy_policy: '',
      terms_of_use: '',
      enrollment_policies: '',
      tuition_and_refund_policies: '',
      waitlist_rules: '',
      health_and_safety_policies: '',
      allergy_and_meal_policies: ''
    };
  }

  // getFaqEntries()
  getFaqEntries() {
    const stored = this._getFromStorage('faq_entries', []);
    return stored;
  }

  // NO test methods in this class
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
