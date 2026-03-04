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
  // Initialization & Storage
  // =========================

  _initStorage() {
    const tables = [
      'center_locations',
      'programs',
      'program_plans',
      'schools',
      'program_pickup_locations',
      'classrooms',
      'tour_time_slots',
      'tour_requests',
      'enrollment_applications',
      'contact_inquiries',
      'menu_days',
      'menu_items',
      'events',
      'event_rsvps',
      'faqs',
      'communication_preferences'
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

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue !== undefined ? defaultValue : [];
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

  _findById(list, id) {
    return list.find((item) => item.id === id) || null;
  }

  // =========================
  // Helpers: Labels & Formatting
  // =========================

  _ageGroupLabel(value) {
    const map = {
      infant: 'Infant',
      toddler: 'Toddler',
      preschool_3_4: 'Preschool (3–4 years)',
      pre_k: 'Pre-K',
      school_age: 'School Age',
      ages_2_3: 'Ages 2–3',
      ages_3_4: 'Ages 3–4',
      all_ages: 'All Ages'
    };
    return map[value] || value || '';
  }

  _programTypeLabel(value) {
    const map = {
      infant_care: 'Infant Care',
      toddler_care: 'Toddler Care',
      preschool: 'Preschool',
      pre_k: 'Pre-K',
      after_school_care: 'After-School Care',
      before_school_care: 'Before-School Care',
      camp: 'Camp',
      other: 'Other Program'
    };
    return map[value] || value || '';
  }

  _dayLengthLabel(value) {
    const map = {
      full_day: 'Full-day',
      half_day: 'Half-day',
      extended_hours: 'Extended Hours',
      after_school_only: 'After-school Only',
      before_school_only: 'Before-school Only'
    };
    return map[value] || value || '';
  }

  _weekdayLabel(value) {
    const map = {
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
      sunday: 'Sun'
    };
    return map[value] || value || '';
  }

  _weekdayOrder(value) {
    const order = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 7
    };
    return order[value] || 99;
  }

  _formatWeekdayList(weekdays) {
    if (!Array.isArray(weekdays) || weekdays.length === 0) return '';
    const unique = Array.from(new Set(weekdays));
    unique.sort((a, b) => this._weekdayOrder(a) - this._weekdayOrder(b));

    const labels = unique.map((w) => this._weekdayLabel(w));
    if (labels.length === 5 &&
      unique[0] === 'monday' &&
      unique[4] === 'friday') {
      return 'Mon–Fri';
    }
    return labels.join('/');
  }

  _formatTime(timeStr) {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayHour = ((h + 11) % 12) + 1;
    const mm = m.toString().padStart(2, '0');
    return displayHour + ':' + mm + ' ' + suffix;
  }

  _formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  _formatTimeRangeDisplay(startStr, endStr) {
    if (!startStr || !endStr) return '';
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
    const fmt = (d) => {
      const h = d.getHours();
      const m = d.getMinutes();
      const suffix = h >= 12 ? 'PM' : 'AM';
      const displayHour = ((h + 11) % 12) + 1;
      const mm = m.toString().padStart(2, '0');
      return displayHour + ':' + mm + ' ' + suffix;
    };
    return fmt(start) + ' – ' + fmt(end);
  }

  _normalizeDateOnly(dateInput) {
    if (!dateInput) return null;

    // If it's already an ISO date-only string, return as-is
    if (typeof dateInput === 'string') {
      const m = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        return m[1] + '-' + m[2] + '-' + m[3];
      }
    }

    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return null;
    // Use UTC components to avoid timezone-dependent date shifts
    const year = d.getUTCFullYear();
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = d.getUTCDate().toString().padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  // =========================
  // Helper functions (per spec)
  // =========================

  _getPrimaryCenterLocation() {
    const centers = this._getFromStorage('center_locations', []);
    if (!centers.length) return null;
    const primary = centers.find((c) => c.is_primary === true);
    return primary || centers[0] || null;
  }

  _mapPostalCodeToLocation(postalCode) {
    if (!postalCode) return this._getPrimaryCenterLocation();
    const centers = this._getFromStorage('center_locations', []);
    const match = centers.find((c) => c.postal_code === postalCode);
    return match || this._getPrimaryCenterLocation();
  }

  _filterProgramPlansForSchedule(age_group, day_length, days_per_week, weekdays, center_location_id) {
    let plans = this._getFromStorage('program_plans', []);
    plans = plans.filter((p) => p.is_available !== false);

    if (age_group) {
      plans = plans.filter((p) => p.age_group === age_group);
    }
    if (day_length) {
      plans = plans.filter((p) => p.day_length === day_length);
    }
    if (typeof days_per_week === 'number') {
      plans = plans.filter((p) => p.days_per_week === days_per_week);
    }
    if (center_location_id) {
      plans = plans.filter((p) => p.center_location_id === center_location_id);
    }
    if (Array.isArray(weekdays) && weekdays.length) {
      plans = plans.filter((p) => {
        if (!Array.isArray(p.weekdays)) return false;
        const set = new Set(p.weekdays);
        return weekdays.every((w) => set.has(w));
      });
    }
    return plans;
  }

  _calculateChildAgeYears(birthdateStr) {
    const birth = new Date(birthdateStr);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  _getAvailableTourSlotsForDate(dateStr, center_location_id) {
    const targetDate = this._normalizeDateOnly(dateStr);
    if (!targetDate) return [];
    let slots = this._getFromStorage('tour_time_slots', []);

    slots = slots.filter((s) => {
      if (s.is_available === false) return false;
      const slotDate = this._normalizeDateOnly(s.start_datetime);
      if (slotDate !== targetDate) return false;
      if (center_location_id && s.center_location_id !== center_location_id) return false;
      if (typeof s.capacity === 'number') {
        const booked = typeof s.slots_booked === 'number' ? s.slots_booked : 0;
        if (booked >= s.capacity) return false;
      }
      return true;
    });

    // Resolve foreign keys
    const centers = this._getFromStorage('center_locations', []);
    return slots.map((slot) => ({
      ...slot,
      center_location: centers.find((c) => c.id === slot.center_location_id) || null
    }));
  }

  _getOrCreateCommunicationPreferenceRecord(email) {
    let prefs = this._getFromStorage('communication_preferences', []);
    let pref = prefs.find((p) => p.email === email) || null;
    const now = new Date().toISOString();

    if (!pref) {
      pref = {
        id: this._generateId('comm_pref'),
        email: email,
        age_group_interest: null,
        frequency: 'monthly_updates',
        topic_curriculum_updates: false,
        topic_events_and_workshops: false,
        topic_general_news: false,
        topic_menus_and_nutrition: false,
        channel_email_enabled: true,
        channel_sms_enabled: false,
        created_at: now,
        updated_at: null
      };
      prefs.push(pref);
      this._saveToStorage('communication_preferences', prefs);
    }

    return pref;
  }

  // =========================
  // Foreign key resolution helper
  // =========================

  _attachCenterLocation(entity) {
    if (!entity || !entity.center_location_id) return entity;
    const centers = this._getFromStorage('center_locations', []);
    const center = centers.find((c) => c.id === entity.center_location_id) || null;
    return { ...entity, center_location: center };
  }

  _attachProgramToPlan(plan) {
    if (!plan) return plan;
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === plan.program_id) || null;
    const planWithCenter = this._attachCenterLocation(plan);
    return { ...planWithCenter, program };
  }

  // =========================
  // INTERFACE IMPLEMENTATIONS
  // =========================

  // 1) getHomePageContent()
  getHomePageContent() {
    const programs = this._getFromStorage('programs', []).filter((p) => p.is_active !== false);
    const centers = this._getFromStorage('center_locations', []);
    const plans = this._getFromStorage('program_plans', []).filter((pl) => pl.is_available !== false);
    const events = this._getFromStorage('events', []);

    // Age group highlights based on available programs
    const ageGroupMap = {};
    for (const p of programs) {
      if (!ageGroupMap[p.age_group]) {
        ageGroupMap[p.age_group] = {
          age_group: p.age_group,
          label: this._ageGroupLabel(p.age_group),
          description: 'Programs designed for ' + this._ageGroupLabel(p.age_group) + ' children.'
        };
      }
    }
    const ageGroupHighlights = Object.values(ageGroupMap);

    // Featured programs: pick up to 3 cheapest programs by default plan tuition
    const programSummaries = programs.map((program) => {
      const programPlans = plans.filter((pl) => pl.program_id === program.id);
      if (!programPlans.length) return null;
      let defaultPlan = programPlans.find((pl) => pl.is_default_for_program === true) || null;
      if (!defaultPlan) {
        defaultPlan = programPlans.reduce((acc, pl) => (acc && acc.monthly_tuition <= pl.monthly_tuition ? acc : pl));
      }
      const center = centers.find((c) => c.id === program.center_location_id) || null;
      const weekdayList = this._formatWeekdayList(defaultPlan.weekdays || []);
      const schedule_summary = this._dayLengthLabel(defaultPlan.day_length) +
        (weekdayList ? ', ' + weekdayList : '') +
        (defaultPlan.start_time && defaultPlan.end_time
          ? ', ' + this._formatTime(defaultPlan.start_time) + '–' + this._formatTime(defaultPlan.end_time)
          : '');

      return {
        program_id: program.id,
        program_name: program.name,
        age_group_label: this._ageGroupLabel(program.age_group),
        program_type_label: this._programTypeLabel(program.program_type),
        location_name: center ? center.name : '',
        schedule_summary,
        tuition_starting_at: defaultPlan.monthly_tuition,
        tuition_currency: defaultPlan.currency,
        featured_image_url: program.featured_image_url || ''
      };
    }).filter(Boolean);

    programSummaries.sort((a, b) => a.tuition_starting_at - b.tuition_starting_at);
    const featuredPrograms = programSummaries.slice(0, 3);

    // Primary actions
    const primaryActions = [
      {
        action_key: 'view_programs',
        label: 'Explore Programs',
        description: 'Browse infant, toddler, preschool, and after-school options.'
      },
      {
        action_key: 'schedule_tour',
        label: 'Schedule a Tour',
        description: 'Visit our center and meet our teachers.'
      },
      {
        action_key: 'view_tuition',
        label: 'View Tuition & Fees',
        description: 'Estimate tuition by age group and schedule.'
      },
      {
        action_key: 'start_enrollment',
        label: 'Start Enrollment',
        description: 'Begin your child’s enrollment application online.'
      }
    ];

    // Upcoming events teaser (next 30 days)
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingEventsTeaser = events
      .filter((e) => e.status === 'scheduled')
      .filter((e) => {
        const start = new Date(e.start_datetime);
        return !Number.isNaN(start.getTime()) && start >= now && start <= in30;
      })
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5)
      .map((e) => ({
        event_id: e.id,
        title: e.title,
        date_display: this._formatDateDisplay(e.start_datetime),
        time_range_display: this._formatTimeRangeDisplay(e.start_datetime, e.end_datetime),
        age_group_label: this._ageGroupLabel(e.age_group),
        requires_rsvp: e.requires_rsvp
      }));

    return {
      heroTitle: 'Nurturing childcare and preschool programs for every stage',
      heroSubtitle: 'Infant, toddler, preschool, and after-school programs designed to support your whole family.',
      ageGroupHighlights,
      featuredPrograms,
      primaryActions,
      upcomingEventsTeaser
    };
  }

  // 2) getProgramsFilterOptions()
  getProgramsFilterOptions() {
    const programs = this._getFromStorage('programs', []);
    const plans = this._getFromStorage('program_plans', []);
    const centers = this._getFromStorage('center_locations', []);
    const schools = this._getFromStorage('schools', []);

    const ageGroupSet = new Set(programs.map((p) => p.age_group));
    const programTypeSet = new Set(programs.map((p) => p.program_type));
    const dayLengthSet = new Set(plans.map((pl) => pl.day_length));

    const ageGroupOptions = Array.from(ageGroupSet).filter(Boolean).map((value) => ({
      value,
      label: this._ageGroupLabel(value)
    }));
    const programTypeOptions = Array.from(programTypeSet).filter(Boolean).map((value) => ({
      value,
      label: this._programTypeLabel(value)
    }));
    const dayLengthOptions = Array.from(dayLengthSet).filter(Boolean).map((value) => ({
      value,
      label: this._dayLengthLabel(value)
    }));

    const weekdayValues = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekdayOptions = weekdayValues.map((value) => ({
      value,
      label: this._weekdayLabel(value)
    }));

    return {
      ageGroupOptions,
      programTypeOptions,
      dayLengthOptions,
      weekdayOptions,
      locationOptions: centers,
      pickupSchoolOptions: schools
    };
  }

  // 3) searchPrograms(filters)
  searchPrograms(filters) {
    filters = filters || {};
    const programs = this._getFromStorage('programs', []).filter((p) => p.is_active !== false);
    const centers = this._getFromStorage('center_locations', []);
    const plans = this._getFromStorage('program_plans', []).filter((pl) => pl.is_available !== false);
    const pickups = this._getFromStorage('program_pickup_locations', []);

    let results = programs;

    if (filters.age_group) {
      results = results.filter((p) => p.age_group === filters.age_group);
    }
    if (filters.program_type) {
      results = results.filter((p) => p.program_type === filters.program_type);
    }
    if (filters.center_location_id) {
      results = results.filter((p) => p.center_location_id === filters.center_location_id);
    }
    if (typeof filters.has_extended_hours === 'boolean') {
      results = results.filter((p) => !!p.has_extended_hours === filters.has_extended_hours);
    }
    if (typeof filters.is_after_school === 'boolean') {
      results = results.filter((p) => !!p.is_after_school === filters.is_after_school);
    }

    // Filters that depend on ProgramPlans
    if (filters.day_lengths || filters.min_days_per_week || filters.weekdays) {
      results = results.filter((program) => {
        const programPlans = plans.filter((pl) => pl.program_id === program.id);
        if (!programPlans.length) return false;

        return programPlans.some((pl) => {
          if (filters.day_lengths && filters.day_lengths.length) {
            if (!filters.day_lengths.includes(pl.day_length)) return false;
          }
          if (typeof filters.min_days_per_week === 'number') {
            if (pl.days_per_week < filters.min_days_per_week) return false;
          }
          if (filters.weekdays && filters.weekdays.length) {
            if (!Array.isArray(pl.weekdays)) return false;
            const set = new Set(pl.weekdays);
            if (!filters.weekdays.every((w) => set.has(w))) return false;
          }
          return true;
        });
      });
    }

    // pickup_school filter through ProgramPickupLocation
    if (filters.pickup_school_id) {
      results = results.filter((program) => {
        return pickups.some((pp) =>
          pp.program_id === program.id &&
          pp.school_id === filters.pickup_school_id &&
          (pp.transportation_type === 'pickup_only' || pp.transportation_type === 'pickup_and_dropoff')
        );
      });
    }

    return results.map((program) => {
      const center = centers.find((c) => c.id === program.center_location_id) || null;
      const programPlans = plans.filter((pl) => pl.program_id === program.id);
      let defaultPlan = programPlans.find((pl) => pl.is_default_for_program === true) || null;
      if (!defaultPlan && programPlans.length) {
        defaultPlan = programPlans.reduce((acc, pl) => (acc && acc.monthly_tuition <= pl.monthly_tuition ? acc : pl));
      }

      let headline_schedule = '';
      let days_per_week = null;
      let weekday_list = '';
      let end_time = '';
      let headline_monthly_tuition = null;
      let tuition_currency = '';
      let has_extended_hours = !!program.has_extended_hours;
      let is_after_school = !!program.is_after_school;

      if (defaultPlan) {
        const weekdayListStr = this._formatWeekdayList(defaultPlan.weekdays || []);
        headline_schedule = this._dayLengthLabel(defaultPlan.day_length);
        if (weekdayListStr) headline_schedule += ', ' + weekdayListStr;
        if (defaultPlan.start_time && defaultPlan.end_time) {
          headline_schedule += ', ' + this._formatTime(defaultPlan.start_time) + '–' + this._formatTime(defaultPlan.end_time);
        }
        days_per_week = defaultPlan.days_per_week;
        weekday_list = weekdayListStr;
        end_time = defaultPlan.end_time;
        headline_monthly_tuition = defaultPlan.monthly_tuition;
        tuition_currency = defaultPlan.currency;
        if (defaultPlan.day_length === 'extended_hours') has_extended_hours = true;
        if (defaultPlan.day_length === 'after_school_only') is_after_school = true;
      }

      const supports_pickup_from_schools = pickups.some((pp) =>
        pp.program_id === program.id &&
        (pp.transportation_type === 'pickup_only' || pp.transportation_type === 'pickup_and_dropoff')
      );

      return {
        program_id: program.id,
        program_name: program.name,
        program_type_label: this._programTypeLabel(program.program_type),
        age_group_label: this._ageGroupLabel(program.age_group),
        center_location_name: center ? center.name : '',
        center_city: center ? center.city : '',
        center_state: center ? center.state : '',
        headline_schedule,
        days_per_week,
        weekday_list,
        end_time,
        has_extended_hours,
        headline_monthly_tuition,
        tuition_currency,
        is_after_school,
        supports_pickup_from_schools
      };
    });
  }

  // 4) getProgramDetail(programId)
  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs', []);
    const centers = this._getFromStorage('center_locations', []);
    const plans = this._getFromStorage('program_plans', []);
    const pickups = this._getFromStorage('program_pickup_locations', []);
    const schools = this._getFromStorage('schools', []);

    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return {
        program: null,
        centerLocation: null,
        curriculum_highlights: '',
        eligibility_notes: '',
        defaultPlan: null,
        availablePlans: [],
        transportationPickupSchools: [],
        scheduleSummaryText: '',
        tuitionSummaryText: '',
        primaryCallToActionLabel: 'Enroll Now'
      };
    }

    const centerLocation = centers.find((c) => c.id === program.center_location_id) || null;
    const programPlansRaw = plans.filter((pl) => pl.program_id === program.id && pl.is_available !== false);
    const availablePlans = programPlansRaw.map((pl) => this._attachProgramToPlan(pl));

    let defaultPlan = programPlansRaw.find((pl) => pl.is_default_for_program === true) || null;
    if (!defaultPlan && programPlansRaw.length) {
      defaultPlan = programPlansRaw.reduce((acc, pl) => (acc && acc.monthly_tuition <= pl.monthly_tuition ? acc : pl));
    }
    const defaultPlanResolved = defaultPlan ? this._attachProgramToPlan(defaultPlan) : null;

    const weekdayList = defaultPlan ? this._formatWeekdayList(defaultPlan.weekdays || []) : '';
    const scheduleSummaryText = defaultPlan
      ? this._dayLengthLabel(defaultPlan.day_length) +
        (weekdayList ? ', ' + weekdayList : '') +
        (defaultPlan.start_time && defaultPlan.end_time
          ? ', ' + this._formatTime(defaultPlan.start_time) + '–' + this._formatTime(defaultPlan.end_time)
          : '')
      : '';

    const tuitionSummaryText = defaultPlan
      ? 'Starting at ' + defaultPlan.currency + ' ' + defaultPlan.monthly_tuition + ' per month.'
      : '';

    const pickupSchools = pickups
      .filter((pp) => pp.program_id === program.id)
      .map((pp) => schools.find((s) => s.id === pp.school_id))
      .filter(Boolean);

    const curriculum_highlights = program.description || '';
    const eligibility_notes = 'Age group: ' + this._ageGroupLabel(program.age_group) + '.';

    const programWithCenter = this._attachCenterLocation(program);

    return {
      program: programWithCenter,
      centerLocation,
      curriculum_highlights,
      eligibility_notes,
      defaultPlan: defaultPlanResolved,
      availablePlans,
      transportationPickupSchools: pickupSchools,
      scheduleSummaryText,
      tuitionSummaryText,
      primaryCallToActionLabel: program.program_type === 'after_school_care' ? 'Register Interest' : 'Enroll Now'
    };
  }

  // 5) getProgramEnrollmentContext(programId, programPlanId, applicationType)
  getProgramEnrollmentContext(programId, programPlanId, applicationType) {
    const programs = this._getFromStorage('programs', []);
    const plans = this._getFromStorage('program_plans', []);

    const program = programs.find((p) => p.id === programId) || null;
    let selectedPlan = null;

    const programPlans = plans.filter((pl) => pl.program_id === programId && pl.is_available !== false);

    if (programPlanId) {
      selectedPlan = programPlans.find((pl) => pl.id === programPlanId) || null;
    }
    if (!selectedPlan && programPlans.length) {
      selectedPlan = programPlans.find((pl) => pl.is_default_for_program === true) || null;
    }
    if (!selectedPlan && programPlans.length) {
      selectedPlan = programPlans.reduce((acc, pl) => (acc && acc.monthly_tuition <= pl.monthly_tuition ? acc : pl));
    }

    const selectedPlanResolved = selectedPlan ? this._attachProgramToPlan(selectedPlan) : null;

    const schedule_display = selectedPlan
      ? this._dayLengthLabel(selectedPlan.day_length) +
        ' · ' + this._formatWeekdayList(selectedPlan.weekdays || []) +
        ' · ' + this._formatTime(selectedPlan.start_time) + '–' + this._formatTime(selectedPlan.end_time)
      : '';

    const tuition_display = selectedPlan
      ? selectedPlan.currency + ' ' + selectedPlan.monthly_tuition + ' per month'
      : '';

    const weekdayOptions = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((value) => ({
      value,
      label: this._weekdayLabel(value)
    }));

    const programWithCenter = program ? this._attachCenterLocation(program) : null;

    return {
      program: programWithCenter,
      selectedPlan: selectedPlanResolved,
      application_type: applicationType || 'enrollment',
      age_group_label: program ? this._ageGroupLabel(program.age_group) : '',
      schedule_display,
      tuition_display,
      weekdayOptions
    };
  }

  // 6) submitEnrollmentApplication(...)
  submitEnrollmentApplication(
    applicationType,
    programId,
    programPlanId,
    childFullName,
    childBirthdate,
    currentGrade,
    desiredStartDate,
    attendanceWeekdays,
    parentName,
    parentEmail,
    parentPhone,
    allergiesOrDietaryNeeds
  ) {
    const applications = this._getFromStorage('enrollment_applications', []);

    const child_current_age_years = this._calculateChildAgeYears(childBirthdate);

    const application = {
      id: this._generateId('enroll_app'),
      application_type: applicationType,
      program_id: programId,
      program_plan_id: programPlanId || null,
      child_full_name: childFullName,
      child_birthdate: new Date(childBirthdate).toISOString(),
      child_current_age_years,
      current_grade: currentGrade || null,
      desired_start_date: new Date(desiredStartDate).toISOString(),
      attendance_weekdays: Array.isArray(attendanceWeekdays) ? attendanceWeekdays : [],
      parent_name: parentName,
      parent_email: parentEmail,
      parent_phone: parentPhone || null,
      allergies_or_dietary_needs: allergiesOrDietaryNeeds || null,
      created_at: new Date().toISOString(),
      status: 'submitted'
    };

    applications.push(application);
    this._saveToStorage('enrollment_applications', applications);

    return {
      success: true,
      application,
      message: 'Application submitted successfully.'
    };
  }

  // 7) getClassroomFilterOptions()
  getClassroomFilterOptions() {
    const classrooms = this._getFromStorage('classrooms', []);
    const centers = this._getFromStorage('center_locations', []);

    const ageGroupSet = new Set(classrooms.map((c) => c.age_group));
    const ageGroupOptions = Array.from(ageGroupSet).filter(Boolean).map((value) => ({
      value,
      label: this._ageGroupLabel(value)
    }));

    return {
      ageGroupOptions,
      locationOptions: centers
    };
  }

  // 8) searchClassrooms(age_group, center_location_id)
  searchClassrooms(age_group, center_location_id) {
    let classrooms = this._getFromStorage('classrooms', []).filter((c) => c.is_active !== false);

    if (age_group) {
      classrooms = classrooms.filter((c) => c.age_group === age_group);
    }
    if (center_location_id) {
      classrooms = classrooms.filter((c) => c.center_location_id === center_location_id);
    }

    return classrooms.map((c) => this._attachCenterLocation(c));
  }

  // 9) getClassroomDetail(classroomId)
  getClassroomDetail(classroomId) {
    const classrooms = this._getFromStorage('classrooms', []);
    const programs = this._getFromStorage('programs', []);

    const classroomRaw = classrooms.find((c) => c.id === classroomId) || null;
    if (!classroomRaw) {
      return {
        classroom: null,
        ratioDisplay: '',
        groupSizeDisplay: '',
        environmentDescription: '',
        dailyRhythmDescription: '',
        photos: [],
        relatedPrograms: []
      };
    }

    const classroom = this._attachCenterLocation(classroomRaw);

    const ratioDisplay = classroom.student_to_teacher_ratio_children +
      ' children : ' +
      classroom.student_to_teacher_ratio_teachers +
      ' teacher' +
      (classroom.student_to_teacher_ratio_teachers > 1 ? 's' : '');

    const groupSizeDisplay = classroom.max_group_size
      ? 'Max group size: ' + classroom.max_group_size
      : '';

    const environmentDescription = classroom.description || 'A warm, engaging classroom environment designed for ' + this._ageGroupLabel(classroom.age_group) + ' learners.';
    const dailyRhythmDescription = 'Daily rhythm includes play, learning activities, meals, and rest appropriate for ' + this._ageGroupLabel(classroom.age_group) + ' children.';

    const relatedProgramsRaw = programs
      .filter((p) => p.age_group === classroom.age_group)
      .filter((p) => !classroom.center_location_id || p.center_location_id === classroom.center_location_id)
      .filter((p) => p.is_active !== false);

    const relatedPrograms = relatedProgramsRaw.map((p) => this._attachCenterLocation(p));

    return {
      classroom,
      ratioDisplay,
      groupSizeDisplay,
      environmentDescription,
      dailyRhythmDescription,
      photos: classroom.photo_urls || [],
      relatedPrograms
    };
  }

  // 10) getTuitionSummary()
  getTuitionSummary() {
    const plans = this._getFromStorage('program_plans', []).filter((pl) => pl.is_available !== false);

    // Group by age_group
    const byAgeGroup = {};
    for (const pl of plans) {
      if (!byAgeGroup[pl.age_group]) {
        byAgeGroup[pl.age_group] = [];
      }
      byAgeGroup[pl.age_group].push(pl);
    }

    const result = [];
    for (const age_group of Object.keys(byAgeGroup)) {
      const agePlans = byAgeGroup[age_group];
      const combosMap = {};

      for (const pl of agePlans) {
        const key = pl.day_length + '|' + pl.days_per_week;
        if (!combosMap[key]) {
          combosMap[key] = [];
        }
        combosMap[key].push(pl);
      }

      const plansSummary = Object.keys(combosMap).map((key) => {
        const list = combosMap[key];
        const sample = list[0];
        const minTuition = list.reduce((acc, pl) => (acc && acc <= pl.monthly_tuition ? acc : pl.monthly_tuition), list[0].monthly_tuition);
        const plan_examples = list.slice(0, 3).map((pl) => this._attachProgramToPlan(pl));
        return {
          day_length: sample.day_length,
          days_per_week: sample.days_per_week,
          tuition_from: minTuition,
          tuition_currency: sample.currency,
          plan_examples
        };
      });

      result.push({
        age_group,
        age_group_label: this._ageGroupLabel(age_group),
        plans: plansSummary
      });
    }

    return result;
  }

  // 11) getTuitionCalculatorOptions()
  getTuitionCalculatorOptions() {
    const plans = this._getFromStorage('program_plans', []);
    const centers = this._getFromStorage('center_locations', []);

    const ageGroupSet = new Set(plans.map((pl) => pl.age_group));
    const dayLengthSet = new Set(plans.map((pl) => pl.day_length));
    const daysPerWeekSet = new Set(plans.map((pl) => pl.days_per_week));

    const ageGroupOptions = Array.from(ageGroupSet).filter(Boolean).map((value) => ({
      value,
      label: this._ageGroupLabel(value)
    }));

    const dayLengthOptions = Array.from(dayLengthSet).filter(Boolean).map((value) => ({
      value,
      label: this._dayLengthLabel(value)
    }));

    const daysPerWeekOptions = Array.from(daysPerWeekSet).filter((v) => typeof v === 'number').sort((a, b) => a - b);

    return {
      ageGroupOptions,
      locationOptions: centers,
      dayLengthOptions,
      daysPerWeekOptions
    };
  }

  // 12) calculateTuitionEstimate(age_group, postalCode, center_location_id, days_per_week, day_length)
  calculateTuitionEstimate(age_group, postalCode, center_location_id, days_per_week, day_length) {
    let location = null;
    if (center_location_id) {
      const centers = this._getFromStorage('center_locations', []);
      location = centers.find((c) => c.id === center_location_id) || null;
    }
    if (!location) {
      location = this._mapPostalCodeToLocation(postalCode || null);
    }

    const locId = location ? location.id : null;
    const plans = this._filterProgramPlansForSchedule(age_group, day_length, days_per_week, null, locId);
    const programs = this._getFromStorage('programs', []);
    const centers = this._getFromStorage('center_locations', []);

    return plans.map((pl) => {
      const program = programs.find((p) => p.id === pl.program_id) || null;
      const center = centers.find((c) => c.id === pl.center_location_id) || null;
      return {
        program_plan_id: pl.id,
        program_id: pl.program_id,
        program_name: program ? program.name : '',
        center_location_name: center ? center.name : '',
        age_group_label: this._ageGroupLabel(pl.age_group),
        day_length: pl.day_length,
        days_per_week: pl.days_per_week,
        weekday_list: this._formatWeekdayList(pl.weekdays || []),
        start_time: pl.start_time,
        end_time: pl.end_time,
        monthly_tuition: pl.monthly_tuition,
        currency: pl.currency,
        program,
        center_location: center
      };
    });
  }

  // 13) getTourCalendar(month, year, center_location_id)
  getTourCalendar(month, year, center_location_id) {
    const location = center_location_id
      ? (this._getFromStorage('center_locations', []).find((c) => c.id === center_location_id) || this._getPrimaryCenterLocation())
      : this._getPrimaryCenterLocation();

    const locId = location ? location.id : null;

    const slots = this._getFromStorage('tour_time_slots', []);

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const has_available_slots = slots.some((s) => {
        if (s.is_available === false) return false;
        if (locId && s.center_location_id !== locId) return false;
        const slotDate = this._normalizeDateOnly(s.start_datetime);
        if (slotDate !== dateStr) return false;
        if (typeof s.capacity === 'number') {
          const booked = typeof s.slots_booked === 'number' ? s.slots_booked : 0;
          if (booked >= s.capacity) return false;
        }
        return true;
      });
      days.push({ date: dateStr, has_available_slots });
    }

    return { month, year, days };
  }

  // 14) getTourTimeSlotsForDate(date, center_location_id)
  getTourTimeSlotsForDate(date, center_location_id) {
    const location = center_location_id
      ? (this._getFromStorage('center_locations', []).find((c) => c.id === center_location_id) || this._getPrimaryCenterLocation())
      : this._getPrimaryCenterLocation();

    const locId = location ? location.id : null;
    return this._getAvailableTourSlotsForDate(date, locId);
  }

  // 15) submitTourRequest(...)
  submitTourRequest(
    tourTimeSlotId,
    parentName,
    parentEmail,
    parentPhone,
    childName,
    childAgeGroup,
    programInterestAgeGroup,
    specialRequests
  ) {
    const slots = this._getFromStorage('tour_time_slots', []);
    let requests = this._getFromStorage('tour_requests', []);

    const slotIndex = slots.findIndex((s) => s.id === tourTimeSlotId);
    if (slotIndex === -1) {
      return { success: false, tourRequest: null, message: 'Selected tour time slot not found.' };
    }

    const slot = slots[slotIndex];

    if (slot.is_available === false) {
      return { success: false, tourRequest: null, message: 'Selected tour time slot is not available.' };
    }

    if (typeof slot.capacity === 'number') {
      const booked = typeof slot.slots_booked === 'number' ? slot.slots_booked : 0;
      if (booked >= slot.capacity) {
        return { success: false, tourRequest: null, message: 'Selected tour time slot is fully booked.' };
      }
      slot.slots_booked = booked + 1;
    }

    const now = new Date().toISOString();

    const tourRequest = {
      id: this._generateId('tour_req'),
      tour_time_slot_id: tourTimeSlotId,
      parent_name: parentName,
      parent_email: parentEmail,
      parent_phone: parentPhone || null,
      child_name: childName || null,
      child_age_group: childAgeGroup || null,
      program_interest_age_group: programInterestAgeGroup || null,
      special_requests: specialRequests || null,
      created_at: now,
      status: 'requested'
    };

    requests.push(tourRequest);
    this._saveToStorage('tour_requests', requests);
    this._saveToStorage('tour_time_slots', slots);

    // Attach foreign key resolution for immediate response
    const centers = this._getFromStorage('center_locations', []);
    const slotWithCenter = {
      ...slot,
      center_location: centers.find((c) => c.id === slot.center_location_id) || null
    };

    const tourRequestWithSlot = {
      ...tourRequest,
      tour_time_slot: slotWithCenter
    };

    return {
      success: true,
      tourRequest: tourRequestWithSlot,
      message: 'Tour request submitted successfully.'
    };
  }

  // 16) getContactOptions()
  getContactOptions() {
    const classrooms = this._getFromStorage('classrooms', []).filter((c) => c.is_active !== false).map((c) => this._attachCenterLocation(c));
    const programs = this._getFromStorage('programs', []).filter((p) => p.is_active !== false).map((p) => this._attachCenterLocation(p));

    const reasonOptions = [
      { value: 'general_question', label: 'General Question' },
      { value: 'program_classroom_inquiry', label: 'Program or Classroom Inquiry' },
      { value: 'billing_question', label: 'Billing Question' },
      { value: 'technical_issue', label: 'Technical Issue' },
      { value: 'other', label: 'Other' }
    ];

    const classroomTypeOptions = [
      { value: 'infant', label: 'Infant' },
      { value: 'toddler', label: 'Toddler' },
      { value: 'preschool', label: 'Preschool' },
      { value: 'pre_k', label: 'Pre-K' },
      { value: 'school_age', label: 'School Age' },
      { value: 'none', label: 'No Preference' }
    ];

    return {
      reasonOptions,
      classroomTypeOptions,
      classroomOptions: classrooms,
      programOptions: programs
    };
  }

  // 17) submitContactInquiry(...)
  submitContactInquiry(
    reasonForContact,
    preferredClassroomType,
    preferredClassroomId,
    preferredProgramId,
    parentName,
    parentEmail,
    parentPhone,
    message,
    sourcePage
  ) {
    let inquiries = this._getFromStorage('contact_inquiries', []);

    const inquiry = {
      id: this._generateId('contact_inq'),
      reason_for_contact: reasonForContact,
      preferred_classroom_type: preferredClassroomType || 'none',
      preferred_classroom_id: preferredClassroomId || null,
      preferred_program_id: preferredProgramId || null,
      parent_name: parentName,
      parent_email: parentEmail,
      parent_phone: parentPhone || null,
      message,
      source_page: sourcePage || 'other',
      created_at: new Date().toISOString(),
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      inquiry,
      message: 'Inquiry submitted successfully.'
    };
  }

  // 18) getNutritionAndMenuContent()
  getNutritionAndMenuContent() {
    return {
      nutritionPhilosophy: 'We provide balanced meals with a focus on whole grains, lean proteins, fruits, and vegetables suitable for young children.',
      allergyPolicy: 'We follow strict allergy-aware practices and clearly label menu items. Please share your child\'s allergies so we can partner with you.',
      labelingConventions: 'Menu items are labeled with dietary tags such as "vegetarian", "nut_free", and "gluten_free" where applicable.'
    };
  }

  // 19) getMenuCalendar(month, year, center_location_id)
  getMenuCalendar(month, year, center_location_id) {
    const location = center_location_id
      ? (this._getFromStorage('center_locations', []).find((c) => c.id === center_location_id) || this._getPrimaryCenterLocation())
      : this._getPrimaryCenterLocation();
    const locId = location ? location.id : null;

    const menuDays = this._getFromStorage('menu_days', []).filter((md) => md.is_published !== false);

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');

      const menuDay = menuDays.find((md) => {
        if (locId && md.center_location_id !== locId) return false;
        const d = this._normalizeDateOnly(md.date);
        return d === dateStr;
      });

      days.push({
        date: dateStr,
        has_menu: !!menuDay,
        notes: menuDay ? menuDay.notes || '' : ''
      });
    }

    return { month, year, days };
  }

  // 20) getMenuForDate(date, center_location_id)
  getMenuForDate(date, center_location_id) {
    const location = center_location_id
      ? (this._getFromStorage('center_locations', []).find((c) => c.id === center_location_id) || this._getPrimaryCenterLocation())
      : this._getPrimaryCenterLocation();
    const locId = location ? location.id : null;

    const menuDays = this._getFromStorage('menu_days', []);
    const items = this._getFromStorage('menu_items', []);

    const targetDate = this._normalizeDateOnly(date);

    const menuDay = menuDays.find((md) => {
      if (locId && md.center_location_id !== locId) return false;
      const d = this._normalizeDateOnly(md.date);
      return d === targetDate;
    }) || null;

    if (!menuDay) {
      return {
        menuDay: null,
        items: []
      };
    }

    let dayItems = items.filter((it) => it.menu_day_id === menuDay.id);

    // If no items are explicitly defined for this menu day, fall back to
    // other items for the same center location so the UI still has
    // representative menu content for the selected date.
    if (!dayItems.length) {
      const relatedDayIds = menuDays
        .filter((md) => md.center_location_id === menuDay.center_location_id)
        .map((md) => md.id);
      dayItems = items.filter((it) => relatedDayIds.includes(it.menu_day_id));
    }

    dayItems = dayItems.map((it) => ({
      ...it,
      menu_day: menuDay
    }));

    return {
      menuDay,
      items: dayItems
    };
  }

  // 21) getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    const ageGroupSet = new Set(events.map((e) => e.age_group));
    const ageGroupOptions = Array.from(ageGroupSet).filter(Boolean).map((value) => ({
      value,
      label: this._ageGroupLabel(value)
    }));

    const timeOfDaySet = new Set(events.map((e) => e.time_of_day));
    const timeOfDayOptions = Array.from(timeOfDaySet).filter(Boolean).map((value) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1)
    }));

    const dateRangePresets = [
      { key: 'next_7_days', label: 'Next 7 Days', days_ahead: 7 },
      { key: 'next_30_days', label: 'Next 30 Days', days_ahead: 30 },
      { key: 'next_90_days', label: 'Next 90 Days', days_ahead: 90 }
    ];

    return {
      ageGroupOptions,
      timeOfDayOptions,
      dateRangePresets
    };
  }

  // 22) searchEvents(filters)
  searchEvents(filters) {
    filters = filters || {};
    const events = this._getFromStorage('events', []);

    let results = events.filter((e) => e.status === 'scheduled');

    if (filters.age_group) {
      results = results.filter((e) => e.age_group === filters.age_group);
    }

    if (filters.start_date) {
      const start = new Date(filters.start_date + 'T00:00:00');
      results = results.filter((e) => new Date(e.start_datetime) >= start);
    }

    if (filters.end_date) {
      const end = new Date(filters.end_date + 'T23:59:59');
      results = results.filter((e) => new Date(e.start_datetime) <= end);
    }

    if (filters.time_of_day) {
      results = results.filter((e) => e.time_of_day === filters.time_of_day);
    }

    if (typeof filters.requires_rsvp === 'boolean') {
      results = results.filter((e) => !!e.requires_rsvp === filters.requires_rsvp);
    }

    results.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    return results.map((e) => ({
      event_id: e.id,
      title: e.title,
      date_display: this._formatDateDisplay(e.start_datetime),
      time_range_display: this._formatTimeRangeDisplay(e.start_datetime, e.end_datetime),
      age_group_label: this._ageGroupLabel(e.age_group),
      time_of_day: e.time_of_day || null,
      requires_rsvp: e.requires_rsvp,
      status: e.status
    }));
  }

  // 23) getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const centers = this._getFromStorage('center_locations', []);

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) return null;

    const center = centers.find((c) => c.id === event.center_location_id) || null;
    return {
      ...event,
      center_location: center
    };
  }

  // 24) submitEventRSVP(...)
  submitEventRSVP(eventId, parentName, parentEmail, numberOfChildrenAttending, comments) {
    let rsvps = this._getFromStorage('event_rsvps', []);

    const rsvp = {
      id: this._generateId('event_rsvp'),
      event_id: eventId,
      parent_name: parentName,
      parent_email: parentEmail,
      number_of_children_attending: numberOfChildrenAttending,
      comments: comments || null,
      created_at: new Date().toISOString()
    };

    rsvps.push(rsvp);
    this._saveToStorage('event_rsvps', rsvps);

    return {
      success: true,
      rsvp,
      message: 'RSVP submitted successfully.'
    };
  }

  // 25) getParentResourcesOverview()
  getParentResourcesOverview() {
    const resourceSections = [
      {
        key: 'faqs',
        title: 'Frequently Asked Questions',
        description: 'Find answers about schedules, tuition, enrollment, holidays, and more.'
      },
      {
        key: 'nutrition_menu',
        title: 'Nutrition & Menu',
        description: 'View our daily menus and learn about our nutrition philosophy.'
      },
      {
        key: 'events',
        title: 'Events & Workshops',
        description: 'See upcoming family events and parent workshops.'
      },
      {
        key: 'tuition',
        title: 'Tuition & Fees',
        description: 'Explore tuition information by age group and schedule.'
      }
    ];

    const seasonalHighlights = [
      {
        title: 'Holiday Schedules & Closures',
        summary: 'Review our holiday calendar and closure policies for the current school year.',
        related_resource_key: 'holidays'
      }
    ];

    return {
      resourceSections,
      seasonalHighlights
    };
  }

  // 26) getFaqCategories()
  getFaqCategories() {
    const faqs = this._getFromStorage('faqs', []).filter((f) => f.is_published !== false);
    const map = {};

    for (const f of faqs) {
      const cat = f.category || 'other';
      if (!map[cat]) {
        map[cat] = 0;
      }
      map[cat]++;
    }

    return Object.keys(map).map((category) => ({
      category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      count: map[category]
    }));
  }

  // 27) searchFaqs(query, category, tags)
  searchFaqs(query, category, tags) {
    let faqs = this._getFromStorage('faqs', []).filter((f) => f.is_published !== false);

    if (category) {
      faqs = faqs.filter((f) => f.category === category);
    }

    if (query) {
      const q = query.toLowerCase();
      faqs = faqs.filter((f) =>
        (f.title && f.title.toLowerCase().includes(q)) ||
        (f.answer && f.answer.toLowerCase().includes(q))
      );
    }

    if (Array.isArray(tags) && tags.length) {
      const tagSet = tags.map((t) => String(t).toLowerCase());
      faqs = faqs.filter((f) => {
        if (!Array.isArray(f.tags) || !f.tags.length) return false;
        const faqTags = f.tags.map((t) => String(t).toLowerCase());
        return tagSet.every((t) => faqTags.includes(t));
      });
    }

    return faqs;
  }

  // 28) subscribeToNewsletter(...)
  subscribeToNewsletter(
    email,
    age_group_interest,
    frequency,
    topic_curriculum_updates,
    topic_events_and_workshops,
    topic_general_news,
    topic_menus_and_nutrition
  ) {
    let prefs = this._getFromStorage('communication_preferences', []);
    let pref = prefs.find((p) => p.email === email) || null;
    const now = new Date().toISOString();

    if (!pref) {
      pref = {
        id: this._generateId('comm_pref'),
        email,
        age_group_interest: age_group_interest || null,
        frequency: frequency || 'monthly_updates',
        topic_curriculum_updates: !!topic_curriculum_updates,
        topic_events_and_workshops: !!topic_events_and_workshops,
        topic_general_news: !!topic_general_news,
        topic_menus_and_nutrition: !!topic_menus_and_nutrition,
        channel_email_enabled: true,
        channel_sms_enabled: false,
        created_at: now,
        updated_at: null
      };
      prefs.push(pref);
    } else {
      // Update existing preference
      pref.age_group_interest = age_group_interest || pref.age_group_interest || null;
      pref.frequency = frequency || pref.frequency || 'monthly_updates';
      if (typeof topic_curriculum_updates === 'boolean') {
        pref.topic_curriculum_updates = topic_curriculum_updates;
      }
      if (typeof topic_events_and_workshops === 'boolean') {
        pref.topic_events_and_workshops = topic_events_and_workshops;
      }
      if (typeof topic_general_news === 'boolean') {
        pref.topic_general_news = topic_general_news;
      }
      if (typeof topic_menus_and_nutrition === 'boolean') {
        pref.topic_menus_and_nutrition = topic_menus_and_nutrition;
      }
      pref.channel_email_enabled = true;
      pref.updated_at = now;
    }

    this._saveToStorage('communication_preferences', prefs);

    return {
      success: true,
      preference: pref,
      message: 'Subscription preferences saved.'
    };
  }

  // 29) getCommunicationPreferences(email)
  getCommunicationPreferences(email) {
    const prefs = this._getFromStorage('communication_preferences', []);
    const pref = prefs.find((p) => p.email === email) || null;
    return {
      found: !!pref,
      preference: pref || null
    };
  }

  // 30) updateCommunicationPreferences(...)
  updateCommunicationPreferences(
    email,
    age_group_interest,
    frequency,
    topic_curriculum_updates,
    topic_events_and_workshops,
    topic_general_news,
    topic_menus_and_nutrition,
    channel_email_enabled,
    channel_sms_enabled
  ) {
    let prefs = this._getFromStorage('communication_preferences', []);
    let pref = prefs.find((p) => p.email === email) || null;
    const now = new Date().toISOString();

    if (!pref) {
      // Create if not exist
      pref = {
        id: this._generateId('comm_pref'),
        email,
        age_group_interest: age_group_interest || null,
        frequency: frequency || 'monthly_updates',
        topic_curriculum_updates: !!topic_curriculum_updates,
        topic_events_and_workshops: !!topic_events_and_workshops,
        topic_general_news: !!topic_general_news,
        topic_menus_and_nutrition: !!topic_menus_and_nutrition,
        channel_email_enabled: !!channel_email_enabled,
        channel_sms_enabled: !!channel_sms_enabled,
        created_at: now,
        updated_at: null
      };
      prefs.push(pref);
    } else {
      if (age_group_interest) pref.age_group_interest = age_group_interest;
      if (frequency) pref.frequency = frequency;
      if (typeof topic_curriculum_updates === 'boolean') {
        pref.topic_curriculum_updates = topic_curriculum_updates;
      }
      if (typeof topic_events_and_workshops === 'boolean') {
        pref.topic_events_and_workshops = topic_events_and_workshops;
      }
      if (typeof topic_general_news === 'boolean') {
        pref.topic_general_news = topic_general_news;
      }
      if (typeof topic_menus_and_nutrition === 'boolean') {
        pref.topic_menus_and_nutrition = topic_menus_and_nutrition;
      }
      pref.channel_email_enabled = !!channel_email_enabled;
      if (typeof channel_sms_enabled === 'boolean') {
        pref.channel_sms_enabled = channel_sms_enabled;
      }
      pref.updated_at = now;
    }

    this._saveToStorage('communication_preferences', prefs);

    return {
      success: true,
      preference: pref,
      message: 'Communication preferences updated.'
    };
  }

  // 31) getAboutUsContent()
  getAboutUsContent() {
    return {
      missionStatement: 'To provide a safe, nurturing, and engaging environment where every child can grow, learn, and thrive.',
      educationalPhilosophy: 'We blend play-based learning with age-appropriate curriculum to support the whole child—socially, emotionally, physically, and cognitively.',
      staffMembers: [],
      accreditations: []
    };
  }

  // 32) getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      lastUpdated: this._normalizeDateOnly(new Date()) || '',
      contentHtml: '<p>We value your privacy. This website collects only the information you provide in forms (such as tour requests, enrollment applications, and contact inquiries) and uses it solely to respond to your requests and manage your relationship with our center. Data may be stored in secure systems and is not sold to third parties.</p>'
    };
  }

  // 33) getTermsAndPoliciesContent()
  getTermsAndPoliciesContent() {
    return {
      lastUpdated: this._normalizeDateOnly(new Date()) || '',
      contentHtml: '<p>By using this website, you agree to our terms of use and center policies, including enrollment, tuition, and behavior guidelines. Policies may change, and updated terms will be posted on this page.</p>'
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
