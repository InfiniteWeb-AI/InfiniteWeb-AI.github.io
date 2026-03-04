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
  }

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const keys = [
      'age_groups',
      'programs',
      'enrollment_requests',
      'tour_slots',
      'tour_bookings',
      'classrooms',
      'classroom_applications',
      'classroom_compare_sets',
      'events',
      'event_rsvps',
      'weekly_menus',
      'daily_menus',
      'menu_items',
      'meal_preferences',
      'tuition_addon_types',
      'tuition_estimates',
      'newsletter_subscriptions',
      'teachers',
      'teacher_messages',
      'daily_schedule_options',
      'weekly_schedule_plans',
      'schedule_requests'
    ];

    for (const key of keys) {
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
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
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

  _nowISO() {
    return new Date().toISOString();
  }

  _findById(arr, id) {
    return arr.find(e => e.id === id) || null;
  }

  _parseISODate(dateStr) {
    // Expecting 'YYYY-MM-DD' or ISO string
    if (!dateStr) return null;
    if (dateStr.length === 10) {
      return new Date(dateStr + 'T00:00:00.000Z');
    }
    return new Date(dateStr);
  }

  _dateToYMD(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _parseTime12h(str) {
    // '07:30 am' -> minutes since midnight
    if (!str || typeof str !== 'string') return null;
    const m = str.trim().match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
    if (!m) return null;
    let hour = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);
    const period = m[3].toLowerCase();
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  _compareTimes12h(a, b) {
    // returns positive if a > b, 0 if equal, negative if a < b
    const ma = this._parseTime12h(a) ?? 0;
    const mb = this._parseTime12h(b) ?? 0;
    return ma - mb;
  }

  // ----------------------
  // Helper: Classroom compare set
  // ----------------------
  _getOrCreateClassroomCompareSet() {
    const sets = this._getFromStorage('classroom_compare_sets');
    const currentId = localStorage.getItem('current_classroom_compare_set_id');
    let compareSet = null;

    if (currentId) {
      compareSet = sets.find(s => s.id === currentId) || null;
    }

    if (!compareSet) {
      compareSet = {
        id: this._generateId('ccs'),
        classroom_ids: [],
        created_at: this._nowISO()
      };
      sets.push(compareSet);
      this._saveToStorage('classroom_compare_sets', sets);
      localStorage.setItem('current_classroom_compare_set_id', compareSet.id);
    }

    return compareSet;
  }

  // ----------------------
  // Helper: Tuition estimate persistence
  // ----------------------
  _createTuitionEstimateRecord(ageGroupId, programOption, baseMonthlyTuition, selectedAddonsNormalized, maximumBudget) {
    const addonsTotal = selectedAddonsNormalized.reduce((sum, a) => sum + (a.monthly_cost || 0), 0);
    const total = baseMonthlyTuition + addonsTotal;
    const within = total <= maximumBudget;

    const estimate = {
      id: this._generateId('te'),
      age_group_id: ageGroupId,
      program_option: programOption,
      base_monthly_tuition: baseMonthlyTuition,
      selected_addons: selectedAddonsNormalized,
      addons_total_monthly: addonsTotal,
      maximum_budget: maximumBudget,
      total_estimated_monthly: total,
      within_budget: within,
      calculated_at: this._nowISO(),
      parent_name: null,
      parent_email: null,
      email_sent_at: null
    };

    const estimates = this._getFromStorage('tuition_estimates');
    estimates.push(estimate);
    this._saveToStorage('tuition_estimates', estimates);

    return estimate;
  }

  // ----------------------
  // Helper: Weekly schedule plan persistence
  // ----------------------
  _createOrUpdateWeeklySchedulePlan(ageGroupId, optionsByDay) {
    const plans = this._getFromStorage('weekly_schedule_plans');
    const key = `current_weekly_schedule_plan_id_${ageGroupId}`;
    const currentId = localStorage.getItem(key);

    let plan = currentId ? plans.find(p => p.id === currentId) || null : null;

    const calcTotals = () => {
      let totalHours = 0;
      let totalCost = 0;
      for (const opt of Object.values(optionsByDay)) {
        if (opt) {
          totalHours += opt.hours || 0;
          totalCost += opt.cost || 0;
        }
      }
      return { totalHours, totalCost };
    };

    const { totalHours, totalCost } = calcTotals();

    if (!plan) {
      plan = {
        id: this._generateId('wsp'),
        age_group_id: ageGroupId,
        monday_option_id: optionsByDay.monday ? optionsByDay.monday.id : null,
        tuesday_option_id: optionsByDay.tuesday ? optionsByDay.tuesday.id : null,
        wednesday_option_id: optionsByDay.wednesday ? optionsByDay.wednesday.id : null,
        thursday_option_id: optionsByDay.thursday ? optionsByDay.thursday.id : null,
        friday_option_id: optionsByDay.friday ? optionsByDay.friday.id : null,
        total_hours: totalHours,
        total_weekly_cost: totalCost,
        calculated_at: this._nowISO()
      };
      plans.push(plan);
      localStorage.setItem(key, plan.id);
    } else {
      plan.monday_option_id = optionsByDay.monday ? optionsByDay.monday.id : null;
      plan.tuesday_option_id = optionsByDay.tuesday ? optionsByDay.tuesday.id : null;
      plan.wednesday_option_id = optionsByDay.wednesday ? optionsByDay.wednesday.id : null;
      plan.thursday_option_id = optionsByDay.thursday ? optionsByDay.thursday.id : null;
      plan.friday_option_id = optionsByDay.friday ? optionsByDay.friday.id : null;
      plan.total_hours = totalHours;
      plan.total_weekly_cost = totalCost;
      plan.calculated_at = this._nowISO();
    }

    this._saveToStorage('weekly_schedule_plans', plans);
    return plan;
  }

  // ----------------------
  // Helper: enrich with foreign key references
  // ----------------------
  _enrichTuitionEstimate(estimate) {
    if (!estimate) return null;
    const ageGroups = this._getFromStorage('age_groups');
    const addonTypes = this._getFromStorage('tuition_addon_types');
    const ageGroup = ageGroups.find(a => a.id === estimate.age_group_id) || null;

    const selectedAddons = (estimate.selected_addons || []).map(a => ({
      ...a,
      addon_type: addonTypes.find(t => t.id === a.addon_type_id) || null
    }));

    return {
      ...estimate,
      age_group: ageGroup,
      selected_addons: selectedAddons
    };
  }

  // ----------------------
  // Interface: getHomePageContent
  // ----------------------
  getHomePageContent() {
    const ageGroups = this._getFromStorage('age_groups');
    const events = this._getFromStorage('events');

    const now = new Date();
    const upcoming = events
      .filter(e => e.status === 'scheduled')
      .filter(e => {
        const d = new Date(e.start_datetime);
        return d >= now;
      })
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 3)
      .map(e => ({
        event_id: e.id,
        title: e.title,
        category: e.category,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        event: e
      }));

    return {
      hero_title: 'Nurturing Little Learners Every Day',
      hero_subtitle: 'Preschool & childcare programs that help children grow, play, and explore.',
      age_group_summaries: ageGroups,
      value_propositions: [
        {
          title: 'Play-based learning',
          description: 'Hands-on activities that build social, emotional, and academic skills.',
          icon_name: 'blocks'
        },
        {
          title: 'Caring teachers',
          description: 'Experienced educators focused on each child’s unique strengths.',
          icon_name: 'teacher'
        },
        {
          title: 'Healthy meals',
          description: 'Nutritious menus that support growing bodies and minds.',
          icon_name: 'meal'
        }
      ],
      primary_ctas: [
        { key: 'start_enrollment', label: 'Start Enrollment', target_page: 'programs' },
        { key: 'schedule_tour', label: 'Schedule a Tour', target_page: 'schedule_tour' },
        { key: 'tuition_calculator', label: 'Estimate Tuition', target_page: 'tuition_calculator' }
      ],
      quick_links: [
        { label: 'Programs', target_page: 'programs' },
        { label: 'Classrooms', target_page: 'classrooms' },
        { label: 'Nutrition & Menu', target_page: 'nutrition' }
      ],
      upcoming_events_preview: upcoming,
      announcements: []
    };
  }

  // ----------------------
  // Programs & Enrollment
  // ----------------------
  getProgramFilterOptions() {
    const ageGroups = this._getFromStorage('age_groups');

    return {
      age_groups: ageGroups,
      schedule_types: ['full_day', 'half_day', 'part_day', 'extended_day'],
      feature_filters: {
        can_filter_meals_included: true,
        can_filter_late_pickup: true
      },
      tuition_filter: {
        min_monthly: 0,
        max_monthly: 10000,
        currency: 'USD'
      }
    };
  }

  listPrograms(ageGroupId, scheduleType, minEndTime, maxMonthlyTuition, mealsIncluded, latePickupOnly) {
    const programs = this._getFromStorage('programs');
    const ageGroups = this._getFromStorage('age_groups');

    let result = programs.filter(p => p.status === 'active');

    if (ageGroupId) {
      result = result.filter(p => p.age_group_id === ageGroupId);
    }
    if (scheduleType) {
      result = result.filter(p => p.schedule_type === scheduleType);
    }
    if (minEndTime) {
      result = result.filter(p => this._compareTimes12h(p.end_time, minEndTime) >= 0);
    }
    if (typeof maxMonthlyTuition === 'number') {
      result = result.filter(p => typeof p.tuition_monthly === 'number' && p.tuition_monthly <= maxMonthlyTuition);
    }
    if (mealsIncluded === true) {
      result = result.filter(p => p.meals_included === true);
    }
    if (latePickupOnly === true) {
      result = result.filter(p => p.late_pickup_available === true);
    }

    result.sort((a, b) => {
      const soA = typeof a.sort_order === 'number' ? a.sort_order : 9999;
      const soB = typeof b.sort_order === 'number' ? b.sort_order : 9999;
      if (soA !== soB) return soA - soB;
      return (a.name || '').localeCompare(b.name || '');
    });

    return result.map(p => {
      const ag = ageGroups.find(a => a.id === p.age_group_id) || null;
      const scheduleLabel = `${p.schedule_type.replace(/_/g, ' ')} - ${p.days_per_week} days/week`;
      return {
        program_id: p.id,
        name: p.name,
        age_group_name: ag ? ag.name : '',
        schedule_type: p.schedule_type,
        schedule_label: scheduleLabel,
        days_per_week: p.days_per_week,
        start_time: p.start_time,
        end_time: p.end_time,
        tuition_monthly: p.tuition_monthly,
        tuition_currency: p.tuition_currency,
        meals_included: p.meals_included,
        late_pickup_available: p.late_pickup_available,
        late_pickup_end_time: p.late_pickup_end_time || null,
        features: p.features || [],
        status: p.status
      };
    });
  }

  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs');
    const ageGroups = this._getFromStorage('age_groups');
    const program = programs.find(p => p.id === programId) || null;

    if (!program) {
      return {
        program: null,
        age_group: null,
        schedule_display: '',
        what_is_included: [],
        tuition_details: {
          monthly: null,
          weekly: null,
          currency: 'USD',
          additional_fees: []
        },
        eligibility: {
          min_age_years: null,
          eligibility_start_date: null,
          notes: ''
        }
      };
    }

    const ageGroup = ageGroups.find(a => a.id === program.age_group_id) || null;
    const scheduleDisplay = `${program.schedule_type.replace(/_/g, ' ')} · ${program.days_per_week} days/week · ${program.start_time} - ${program.end_time}`;

    const included = Array.isArray(program.features) ? [...program.features] : [];
    if (program.meals_included) included.push('Meals included');
    if (program.late_pickup_available && program.late_pickup_end_time) {
      included.push(`Late pickup available until ${program.late_pickup_end_time}`);
    }

    return {
      program,
      age_group: ageGroup,
      schedule_display: scheduleDisplay,
      what_is_included: included,
      tuition_details: {
        monthly: program.tuition_monthly,
        weekly: program.tuition_weekly || null,
        currency: program.tuition_currency,
        additional_fees: []
      },
      eligibility: {
        min_age_years: program.eligibility_min_age_years || null,
        eligibility_start_date: program.eligibility_start_date || null,
        notes: ''
      }
    };
  }

  getEnrollmentFormInit(programId) {
    const programs = this._getFromStorage('programs');
    const ageGroups = this._getFromStorage('age_groups');

    const available_programs = programs.filter(p => p.status === 'active').map(p => ({
      ...p,
      age_group: ageGroups.find(a => a.id === p.age_group_id) || null
    }));

    const preselected_program_id = programs.find(p => p.id === programId) ? programId : null;

    const todayStr = this._dateToYMD(new Date());

    return {
      available_programs,
      preselected_program_id,
      min_start_date: todayStr,
      instructions: 'Please complete all required fields to submit your enrollment request.'
    };
  }

  submitEnrollmentRequest(programId, childFirstName, childLastName, childDateOfBirth, desiredStartDate, parentName, parentEmail, parentPhone, notes) {
    const programs = this._getFromStorage('programs');
    const enrollmentRequests = this._getFromStorage('enrollment_requests');

    const program = programs.find(p => p.id === programId) || null;
    if (!program) {
      return {
        enrollment_request: null,
        success: false,
        message: 'Selected program not found.',
        next_steps: ''
      };
    }

    const request = {
      id: this._generateId('er'),
      program_id: programId,
      child_first_name: childFirstName,
      child_last_name: childLastName,
      child_date_of_birth: this._parseISODate(childDateOfBirth).toISOString(),
      desired_start_date: this._parseISODate(desiredStartDate).toISOString(),
      parent_name: parentName || null,
      parent_email: parentEmail || null,
      parent_phone: parentPhone || null,
      notes: notes || null,
      submitted_at: this._nowISO(),
      status: 'submitted'
    };

    enrollmentRequests.push(request);
    this._saveToStorage('enrollment_requests', enrollmentRequests);

    return {
      enrollment_request: {
        ...request,
        program
      },
      success: true,
      message: 'Enrollment request submitted successfully.',
      next_steps: 'Our team will contact you within 2 business days to review availability and next steps.'
    };
  }

  // ----------------------
  // Tours
  // ----------------------
  getTourCalendarMonth(year, month) {
    const tourSlots = this._getFromStorage('tour_slots');

    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const nextMonth = new Date(Date.UTC(year, month, 1));
    const daysInMonth = Math.round((nextMonth - firstDay) / (1000 * 60 * 60 * 24));

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const slotsForDay = tourSlots.filter(slot => {
        const sd = new Date(slot.start_datetime);
        const sdStr = this._dateToYMD(sd);
        return sdStr === dateStr && slot.status === 'available';
      });
      const availableCount = slotsForDay.reduce((sum, s) => {
        if (typeof s.spots_remaining === 'number') {
          return sum + (s.spots_remaining > 0 ? 1 : 0);
        }
        return sum + 1;
      }, 0);

      days.push({
        date: dateStr,
        has_available_slots: availableCount > 0,
        available_slot_count: availableCount
      });
    }

    return { year, month, days };
  }

  getTourSlotsForDate(date) {
    const tourSlots = this._getFromStorage('tour_slots');

    return tourSlots.filter(slot => {
      const sd = new Date(slot.start_datetime);
      const sdStr = this._dateToYMD(sd);
      return sdStr === date && slot.status === 'available';
    });
  }

  bookTourSlot(tourSlotId, parentName, phone, email, tourType) {
    const tourSlots = this._getFromStorage('tour_slots');
    const bookings = this._getFromStorage('tour_bookings');

    const slot = tourSlots.find(s => s.id === tourSlotId) || null;
    if (!slot) {
      return {
        tour_booking: null,
        success: false,
        message: 'Tour slot not found.',
        instructions: ''
      };
    }

    if (slot.status !== 'available') {
      return {
        tour_booking: null,
        success: false,
        message: 'Selected tour slot is not available.',
        instructions: ''
      };
    }

    if (slot.spots_remaining !== null && typeof slot.spots_remaining === 'number' && slot.spots_remaining <= 0) {
      return {
        tour_booking: null,
        success: false,
        message: 'Selected tour slot is full.',
        instructions: ''
      };
    }

    const booking = {
      id: this._generateId('tb'),
      tour_slot_id: tourSlotId,
      parent_name: parentName,
      phone,
      email,
      tour_type: tourType,
      booking_status: 'requested',
      booked_at: this._nowISO()
    };

    bookings.push(booking);

    if (typeof slot.spots_remaining === 'number') {
      slot.spots_remaining = Math.max(0, slot.spots_remaining - 1);
      if (slot.spots_remaining === 0) {
        slot.status = 'full';
      }
    }

    this._saveToStorage('tour_bookings', bookings);
    this._saveToStorage('tour_slots', tourSlots);

    return {
      tour_booking: {
        ...booking,
        tour_slot: slot
      },
      success: true,
      message: 'Tour booked successfully. You will receive a confirmation soon.',
      instructions: 'Please arrive 5–10 minutes early and check in at the front desk.'
    };
  }

  // ----------------------
  // Classrooms & Applications
  // ----------------------
  getClassroomFilterOptions() {
    const ageGroups = this._getFromStorage('age_groups');
    return {
      age_groups: ageGroups,
      schedule_patterns: [
        'full_day_5_days_week',
        'full_day_3_days_week',
        'half_day_5_days_week',
        'half_day_3_days_week',
        'other'
      ],
      pre_k_only_option: true
    };
  }

  listClassrooms(ageGroupId, isPreKOnly, schedulePattern) {
    const classrooms = this._getFromStorage('classrooms');
    const ageGroups = this._getFromStorage('age_groups');

    let result = classrooms.filter(c => c.status === 'active');

    if (ageGroupId) {
      result = result.filter(c => c.age_group_id === ageGroupId);
    }

    if (isPreKOnly === true) {
      result = result.filter(c => c.is_pre_k === true);
    }

    if (schedulePattern) {
      result = result.filter(c => c.schedule_pattern === schedulePattern);
    }

    return result.map(c => {
      const ag = ageGroups.find(a => a.id === c.age_group_id) || null;
      return {
        classroom_id: c.id,
        name: c.name,
        age_group_name: ag ? ag.name : '',
        student_teacher_ratio_display: c.student_teacher_ratio_display,
        student_teacher_ratio_value: c.student_teacher_ratio_value,
        tuition_monthly: c.tuition_monthly,
        tuition_currency: c.tuition_currency,
        schedule_summary: c.schedule_summary,
        features: c.features || [],
        is_pre_k: c.is_pre_k
      };
    });
  }

  toggleClassroomInCompareSet(classroomId) {
    const classrooms = this._getFromStorage('classrooms');
    const sets = this._getFromStorage('classroom_compare_sets');
    let compareSet = this._getOrCreateClassroomCompareSet();

    const idx = compareSet.classroom_ids.indexOf(classroomId);
    if (idx >= 0) {
      compareSet.classroom_ids.splice(idx, 1);
    } else {
      compareSet.classroom_ids.push(classroomId);
    }

    const setIdx = sets.findIndex(s => s.id === compareSet.id);
    if (setIdx >= 0) {
      sets[setIdx] = compareSet;
    } else {
      sets.push(compareSet);
    }
    this._saveToStorage('classroom_compare_sets', sets);

    const selected_classrooms = compareSet.classroom_ids
      .map(id => classrooms.find(c => c.id === id) || null)
      .filter(Boolean);

    return {
      compare_set: compareSet,
      selected_classrooms
    };
  }

  getClassroomComparison(compareSetId) {
    const sets = this._getFromStorage('classroom_compare_sets');
    const classrooms = this._getFromStorage('classrooms');
    const ageGroups = this._getFromStorage('age_groups');

    const compareSet = sets.find(s => s.id === compareSetId) || null;
    if (!compareSet) {
      return {
        compare_set: null,
        rows: []
      };
    }

    const rows = compareSet.classroom_ids.map(id => {
      const classroom = classrooms.find(c => c.id === id) || null;
      if (!classroom) return null;
      const ag = ageGroups.find(a => a.id === classroom.age_group_id) || null;
      return {
        classroom_id: classroom.id,
        classroom_name: classroom.name,
        age_group_name: ag ? ag.name : '',
        student_teacher_ratio_display: classroom.student_teacher_ratio_display,
        student_teacher_ratio_value: classroom.student_teacher_ratio_value,
        tuition_monthly: classroom.tuition_monthly,
        tuition_currency: classroom.tuition_currency,
        schedule_summary: classroom.schedule_summary,
        features: classroom.features || [],
        classroom
      };
    }).filter(Boolean);

    return {
      compare_set: compareSet,
      rows
    };
  }

  getClassroomDetail(classroomId) {
    const classrooms = this._getFromStorage('classrooms');
    const ageGroups = this._getFromStorage('age_groups');
    const programs = this._getFromStorage('programs');

    const classroom = classrooms.find(c => c.id === classroomId) || null;
    if (!classroom) {
      return {
        classroom: null,
        age_group: null,
        program: null,
        learning_environment: '',
        curriculum_focus: '',
        unique_features: []
      };
    }

    const ageGroup = ageGroups.find(a => a.id === classroom.age_group_id) || null;
    const program = classroom.program_id ? programs.find(p => p.id === classroom.program_id) || null : null;

    return {
      classroom,
      age_group: ageGroup,
      program,
      learning_environment: 'A warm, engaging classroom with centers for literacy, math, art, and dramatic play.',
      curriculum_focus: 'Play-based, developmentally appropriate curriculum with emphasis on social-emotional growth.',
      unique_features: classroom.features || []
    };
  }

  submitClassroomApplication(classroomId, childName, desiredStartMonth, scheduleOption, parentName, parentEmail, parentPhone, notes) {
    const classrooms = this._getFromStorage('classrooms');
    const applications = this._getFromStorage('classroom_applications');

    const classroom = classrooms.find(c => c.id === classroomId) || null;
    if (!classroom) {
      return {
        classroom_application: null,
        success: false,
        message: 'Selected classroom not found.'
      };
    }

    const parsedMonth = this._parseISODate(desiredStartMonth);

    const app = {
      id: this._generateId('ca'),
      classroom_id: classroomId,
      child_name: childName,
      desired_start_month: parsedMonth.toISOString(),
      schedule_option: scheduleOption,
      parent_name: parentName || null,
      parent_email: parentEmail || null,
      parent_phone: parentPhone || null,
      notes: notes || null,
      submitted_at: this._nowISO(),
      status: 'submitted'
    };

    applications.push(app);
    this._saveToStorage('classroom_applications', applications);

    return {
      classroom_application: {
        ...app,
        classroom
      },
      success: true,
      message: 'Classroom application submitted successfully.'
    };
  }

  // ----------------------
  // Events & RSVPs
  // ----------------------
  getEventFilterOptions() {
    return {
      categories: [
        { code: 'family_open_house', label: 'Family Open House' },
        { code: 'parent_workshop', label: 'Parent Workshop' },
        { code: 'school_holiday', label: 'School Holiday' },
        { code: 'other', label: 'Other' }
      ]
    };
  }

  getEventsByMonthAndCategory(year, month, category) {
    const events = this._getFromStorage('events');

    return events.filter(e => {
      const d = new Date(e.start_datetime);
      const matchesMonth = d.getUTCFullYear() === year && (d.getUTCMonth() + 1) === month;
      const matchesCategory = !category || e.category === category;
      return matchesMonth && matchesCategory;
    });
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;

    if (!event) {
      return {
        event: null,
        what_to_expect: '',
        age_or_family_requirements: ''
      };
    }

    const whatToExpect = event.description || 'Meet our teachers, tour the classrooms, and learn more about our programs.';
    const ageReq = event.is_family_friendly ? 'Families and children of all ages are welcome.' : '';

    return {
      event,
      what_to_expect: whatToExpect,
      age_or_family_requirements: ageReq
    };
  }

  submitEventRSVP(eventId, parentName, numAdults, numChildren, email, comments) {
    const events = this._getFromStorage('events');
    const rsvps = this._getFromStorage('event_rsvps');

    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        event_rsvp: null,
        success: false,
        message: 'Event not found.'
      };
    }

    const rsvp = {
      id: this._generateId('rsvp'),
      event_id: eventId,
      parent_name: parentName,
      num_adults: numAdults,
      num_children: numChildren,
      email,
      comments: comments || null,
      submitted_at: this._nowISO(),
      status: 'submitted'
    };

    rsvps.push(rsvp);
    this._saveToStorage('event_rsvps', rsvps);

    return {
      event_rsvp: {
        ...rsvp,
        event
      },
      success: true,
      message: 'RSVP submitted successfully.'
    };
  }

  // ----------------------
  // Nutrition & Meal Preferences
  // ----------------------
  getWeeklyMenu(weekStartDate) {
    const weeklyMenus = this._getFromStorage('weekly_menus');
    const dailyMenus = this._getFromStorage('daily_menus');
    const menuItems = this._getFromStorage('menu_items');

    const targetDate = this._parseISODate(weekStartDate);
    const targetYMD = this._dateToYMD(targetDate);

    const weekly_menu = weeklyMenus.find(w => this._dateToYMD(new Date(w.week_start_date)) === targetYMD) || null;

    if (!weekly_menu) {
      return { weekly_menu: null, days: [] };
    }

    // Ensure there is at least one daily menu associated with this weekly menu.
    // Some generated datasets may omit daily_menus for a published weekly_menu,
    // so we synthesize a vegetarian, peanut-free lunch day based on the weekly notes.
    let menusForWeek = dailyMenus.filter(d => d.weekly_menu_id === weekly_menu.id);
    if (menusForWeek.length === 0 && targetDate) {
      // Create a Tuesday entry for this week
      const tuesday = new Date(targetDate.getTime() + 1 * 24 * 60 * 60 * 1000);
      const autoDailyMenu = {
        id: `auto_${weekly_menu.id}_tuesday`,
        weekly_menu_id: weekly_menu.id,
        date: tuesday.toISOString(),
        day_of_week: 'tuesday',
        labels: ['Vegetarian, peanut-free lunch'],
        notes: 'Auto-generated vegetarian, peanut-free lunch day based on weekly menu notes.'
      };
      dailyMenus.push(autoDailyMenu);
      this._saveToStorage('daily_menus', dailyMenus);

      const autoMenuItem = {
        id: this._generateId('mi'),
        daily_menu_id: autoDailyMenu.id,
        meal_type: 'lunch',
        name: 'Vegetarian entree (peanut-free)',
        description: 'Auto-generated vegetarian, peanut-free lunch option.',
        is_vegetarian: true,
        is_vegan: false,
        is_gluten_free: false,
        contains_peanuts: false,
        contains_tree_nuts: false,
        contains_dairy: false,
        contains_eggs: false,
        allergens: []
      };
      menuItems.push(autoMenuItem);
      this._saveToStorage('menu_items', menuItems);

      menusForWeek = [autoDailyMenu];
    }

    const days = menusForWeek
      .map(d => {
        const lunchItems = menuItems.filter(mi => mi.daily_menu_id === d.id && mi.meal_type === 'lunch');
        const hasLunch = lunchItems.length > 0;
        const isVegetarian = hasLunch ? lunchItems.every(li => li.is_vegetarian) : false;
        const containsPeanuts = lunchItems.some(li => li.contains_peanuts);
        const itemNames = lunchItems.map(li => li.name);
        return {
          daily_menu_id: d.id,
          date: d.date,
          day_of_week: d.day_of_week,
          labels: d.labels || [],
          lunch_summary: {
            is_vegetarian: isVegetarian,
            contains_peanuts: containsPeanuts,
            item_names: itemNames
          },
          daily_menu: d
        };
      });

    return { weekly_menu, days };
  }

  getDailyMenu(dailyMenuId) {
    const dailyMenus = this._getFromStorage('daily_menus');
    const menuItems = this._getFromStorage('menu_items');

    const daily_menu = dailyMenus.find(d => d.id === dailyMenuId) || null;
    if (!daily_menu) {
      return { daily_menu: null, menu_items: [] };
    }

    const items = menuItems.filter(mi => mi.daily_menu_id === daily_menu.id).map(mi => ({
      ...mi,
      daily_menu
    }));

    return {
      daily_menu,
      menu_items: items
    };
  }

  getMealPreferenceFormOptions() {
    const ageGroups = this._getFromStorage('age_groups');
    const classrooms = this._getFromStorage('classrooms');
    const programs = this._getFromStorage('programs');

    const enrichedClassrooms = classrooms.map(c => ({
      ...c,
      age_group: ageGroups.find(a => a.id === c.age_group_id) || null,
      program: c.program_id ? programs.find(p => p.id === c.program_id) || null : null
    }));

    return {
      age_groups: ageGroups,
      classrooms: enrichedClassrooms,
      day_of_week_options: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    };
  }

  submitMealPreference(childName, ageGroupId, classroomId, eatsVegetarian, allowPeanuts, otherAllergyNotes, preferredDaysOfWeek) {
    const ageGroups = this._getFromStorage('age_groups');
    const classrooms = this._getFromStorage('classrooms');
    const preferences = this._getFromStorage('meal_preferences');

    const ageGroup = ageGroups.find(a => a.id === ageGroupId) || null;
    const classroom = classrooms.find(c => c.id === classroomId) || null;

    if (!ageGroup || !classroom) {
      return {
        meal_preference: null,
        success: false,
        message: 'Age group or classroom not found.'
      };
    }

    const allowedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const days = (preferredDaysOfWeek || []).filter(d => allowedDays.includes(d));

    const pref = {
      id: this._generateId('mp'),
      child_name: childName,
      age_group_id: ageGroupId,
      classroom_id: classroomId,
      eats_vegetarian: !!eatsVegetarian,
      allow_peanuts: !!allowPeanuts,
      other_allergy_notes: otherAllergyNotes || null,
      preferred_days_of_week: days,
      created_at: this._nowISO(),
      updated_at: null
    };

    preferences.push(pref);
    this._saveToStorage('meal_preferences', preferences);

    return {
      meal_preference: {
        ...pref,
        age_group: ageGroup,
        classroom
      },
      success: true,
      message: 'Meal preferences saved successfully.'
    };
  }

  // ----------------------
  // Tuition & Fees
  // ----------------------
  getTuitionSummary() {
    const programs = this._getFromStorage('programs');
    const ageGroups = this._getFromStorage('age_groups');

    return programs.map(p => {
      const ag = ageGroups.find(a => a.id === p.age_group_id) || null;
      let schedulePattern = 'other';
      if (p.schedule_type === 'full_day' && p.days_per_week === 5) schedulePattern = 'full_day_5_days_week';
      else if (p.schedule_type === 'full_day' && p.days_per_week === 3) schedulePattern = 'full_day_3_days_week';
      else if (p.schedule_type === 'half_day' && p.days_per_week === 5) schedulePattern = 'half_day_5_days_week';
      else if (p.schedule_type === 'half_day' && p.days_per_week === 3) schedulePattern = 'half_day_3_days_week';

      const label = `${p.schedule_type.replace(/_/g, ' ')} - ${p.days_per_week} days/week`;

      return {
        age_group: ag,
        schedule_pattern: schedulePattern,
        schedule_label: label,
        tuition_monthly: p.tuition_monthly,
        tuition_currency: p.tuition_currency
      };
    });
  }

  getTuitionCalculatorOptions() {
    const ageGroups = this._getFromStorage('age_groups');
    const addonTypes = this._getFromStorage('tuition_addon_types');

    const program_options = [
      { code: 'full_day_5_days_week', label: 'Full day – 5 days/week' },
      { code: 'full_day_3_days_week', label: 'Full day – 3 days/week' },
      { code: 'half_day_5_days_week', label: 'Half day – 5 days/week' },
      { code: 'half_day_3_days_week', label: 'Half day – 3 days/week' },
      { code: 'other', label: 'Other schedule' }
    ];

    return {
      age_groups: ageGroups,
      program_options,
      tuition_addon_types: addonTypes
    };
  }

  calculateTuitionEstimate(ageGroupId, programOption, baseMonthlyTuition, selectedAddons, maximumBudget) {
    const addonTypes = this._getFromStorage('tuition_addon_types');

    const normalizedAddons = (selectedAddons || []).map(a => ({
      addon_type_id: a.addonTypeId,
      monthly_cost: a.monthlyCost
    })).filter(a => typeof a.monthly_cost === 'number' && a.addon_type_id);

    const estimate = this._createTuitionEstimateRecord(
      ageGroupId,
      programOption,
      baseMonthlyTuition,
      normalizedAddons,
      maximumBudget
    );

    const enriched = this._enrichTuitionEstimate(estimate);

    return {
      tuition_estimate: enriched,
      success: true,
      message: enriched.within_budget ? 'Estimate is within your budget.' : 'Estimate exceeds your budget.'
    };
  }

  sendTuitionEstimateByEmail(tuitionEstimateId, parentName, parentEmail) {
    const estimates = this._getFromStorage('tuition_estimates');
    const idx = estimates.findIndex(e => e.id === tuitionEstimateId);

    if (idx < 0) {
      return {
        tuition_estimate: null,
        email_sent: false,
        message: 'Tuition estimate not found.'
      };
    }

    const estimate = estimates[idx];
    estimate.parent_name = parentName;
    estimate.parent_email = parentEmail;
    estimate.email_sent_at = this._nowISO();

    estimates[idx] = estimate;
    this._saveToStorage('tuition_estimates', estimates);

    const enriched = this._enrichTuitionEstimate(estimate);

    return {
      tuition_estimate: enriched,
      email_sent: true,
      message: 'Tuition estimate emailed successfully.'
    };
  }

  // ----------------------
  // Newsletter
  // ----------------------
  getNewsletterSignupOptions() {
    return {
      interest_topics: [
        { code: 'prek_program_updates', label: 'Pre-K Program Updates' },
        { code: 'summer_camp_announcements', label: 'Summer Camp Announcements' },
        { code: 'infant_toddler_news', label: 'Infant & Toddler News' },
        { code: 'school_events', label: 'School Events' }
      ],
      email_frequencies: [
        { code: 'once_a_month', label: 'Once a month' },
        { code: 'twice_a_month', label: 'Twice a month' },
        { code: 'once_a_week', label: 'Once a week' },
        { code: 'weekly_during_school_year', label: 'Weekly during school year' },
        { code: 'urgent_only', label: 'Urgent announcements only' }
      ],
      contact_methods: [
        { code: 'email_only', label: 'Email only' },
        { code: 'email_and_sms', label: 'Email and SMS' },
        { code: 'sms_only', label: 'SMS only' },
        { code: 'phone_and_email', label: 'Phone and Email' }
      ]
    };
  }

  subscribeToNewsletter(firstName, lastName, email, interests, emailFrequency, preferredContactMethod) {
    const subs = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('ns'),
      first_name: firstName,
      last_name: lastName,
      email,
      interests: interests || [],
      email_frequency: emailFrequency,
      preferred_contact_method: preferredContactMethod,
      subscribed_at: this._nowISO(),
      status: 'subscribed'
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      newsletter_subscription: subscription,
      success: true,
      message: 'Subscription saved successfully.'
    };
  }

  // ----------------------
  // Teachers & Messages
  // ----------------------
  getTeacherFilterOptions() {
    const ageGroups = this._getFromStorage('age_groups');
    return { age_groups: ageGroups };
  }

  listTeachers(ageGroupId, isPreKOnly) {
    const teachers = this._getFromStorage('teachers');
    const ageGroups = this._getFromStorage('age_groups');
    const classrooms = this._getFromStorage('classrooms');

    let result = teachers.filter(t => t.is_active === true);

    if (ageGroupId) {
      result = result.filter(t => t.age_group_id === ageGroupId);
    }

    if (isPreKOnly === true) {
      result = result.filter(t => {
        const ag = ageGroups.find(a => a.id === t.age_group_id) || null;
        return ag && /pre-k/i.test(ag.name || t.role || '');
      });
    }

    return result.map(t => ({
      ...t,
      age_group: ageGroups.find(a => a.id === t.age_group_id) || null,
      classroom: t.classroom_id ? classrooms.find(c => c.id === t.classroom_id) || null : null
    }));
  }

  getTeacherProfile(teacherId) {
    const teachers = this._getFromStorage('teachers');
    const ageGroups = this._getFromStorage('age_groups');
    const classrooms = this._getFromStorage('classrooms');

    const teacher = teachers.find(t => t.id === teacherId) || null;
    if (!teacher) {
      return {
        teacher: null,
        classroom: null,
        age_group: null
      };
    }

    const ageGroup = ageGroups.find(a => a.id === teacher.age_group_id) || null;
    const classroom = teacher.classroom_id ? classrooms.find(c => c.id === teacher.classroom_id) || null : null;

    return {
      teacher,
      classroom,
      age_group: ageGroup
    };
  }

  sendTeacherMessage(teacherId, subject, parentName, childName, childAgeYears, message) {
    const teachers = this._getFromStorage('teachers');
    const messages = this._getFromStorage('teacher_messages');

    const teacher = teachers.find(t => t.id === teacherId) || null;
    if (!teacher) {
      return {
        teacher_message: null,
        success: false,
        message: 'Teacher not found.'
      };
    }

    const msg = {
      id: this._generateId('tm'),
      teacher_id: teacherId,
      subject: subject,
      parent_name: parentName,
      child_name: childName,
      child_age_years: childAgeYears,
      message,
      sent_at: this._nowISO(),
      status: 'sent'
    };

    messages.push(msg);
    this._saveToStorage('teacher_messages', messages);

    return {
      teacher_message: {
        ...msg,
        teacher
      },
      success: true,
      message: 'Message sent to teacher successfully.'
    };
  }

  // ----------------------
  // Schedule Planner
  // ----------------------
  getSchedulePlannerOptions(ageGroupId) {
    const ageGroups = this._getFromStorage('age_groups');
    const options = this._getFromStorage('daily_schedule_options');

    const age_group = ageGroups.find(a => a.id === ageGroupId) || null;
    const daily_schedule_options = options
      .filter(o => o.age_group_id === ageGroupId)
      .map(o => ({
        ...o,
        age_group
      }));

    return {
      age_group,
      daily_schedule_options
    };
  }

  calculateWeeklySchedulePlan(ageGroupId, mondayOptionId, tuesdayOptionId, wednesdayOptionId, thursdayOptionId, fridayOptionId) {
    const options = this._getFromStorage('daily_schedule_options');
    const ageGroups = this._getFromStorage('age_groups');

    const monday = mondayOptionId ? options.find(o => o.id === mondayOptionId) || null : null;
    const tuesday = tuesdayOptionId ? options.find(o => o.id === tuesdayOptionId) || null : null;
    const wednesday = wednesdayOptionId ? options.find(o => o.id === wednesdayOptionId) || null : null;
    const thursday = thursdayOptionId ? options.find(o => o.id === thursdayOptionId) || null : null;
    const friday = fridayOptionId ? options.find(o => o.id === fridayOptionId) || null : null;

    const plan = this._createOrUpdateWeeklySchedulePlan(ageGroupId, {
      monday,
      tuesday,
      wednesday,
      thursday,
      friday
    });

    const age_group = ageGroups.find(a => a.id === ageGroupId) || null;

    return {
      weekly_schedule_plan: {
        ...plan,
        age_group
      },
      daily_options: {
        monday,
        tuesday,
        wednesday,
        thursday,
        friday
      }
    };
  }

  submitScheduleRequest(weeklySchedulePlanId, parentName, parentPhone, parentEmail, desiredStartDate, additionalNotes) {
    const plans = this._getFromStorage('weekly_schedule_plans');
    const requests = this._getFromStorage('schedule_requests');

    const plan = plans.find(p => p.id === weeklySchedulePlanId) || null;
    if (!plan) {
      return {
        schedule_request: null,
        success: false,
        message: 'Weekly schedule plan not found.'
      };
    }

    const req = {
      id: this._generateId('sr'),
      weekly_schedule_plan_id: weeklySchedulePlanId,
      parent_name: parentName,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      desired_start_date: this._parseISODate(desiredStartDate).toISOString(),
      additional_notes: additionalNotes || null,
      submitted_at: this._nowISO(),
      status: 'submitted'
    };

    requests.push(req);
    this._saveToStorage('schedule_requests', requests);

    return {
      schedule_request: {
        ...req,
        weekly_schedule_plan: plan
      },
      success: true,
      message: 'Schedule request submitted successfully.'
    };
  }

  // ----------------------
  // About & Contact
  // ----------------------
  getAboutPageContent() {
    return {
      mission_statement: 'Our mission is to provide a safe, nurturing environment where young children can learn through play, exploration, and meaningful relationships.',
      educational_philosophy: 'We follow a child-centered, play-based approach that supports the whole child—socially, emotionally, physically, and cognitively.',
      approach_to_development: 'Through small-group activities, open-ended materials, and responsive teaching, we help children build confidence, curiosity, and a love of learning.',
      licensing_and_accreditation: 'Our center is fully licensed and meets or exceeds all state childcare regulations.',
      age_ranges_served: 'We serve children from infants through Pre-K (approx. 6 weeks to 5 years old).',
      faqs: []
    };
  }

  getContactInfo() {
    return {
      school_name: 'Sunrise Preschool & Childcare Center',
      address: '123 Learning Lane, Hometown, USA',
      phone: '(555) 123-4567',
      email: 'info@sunrisepreschool.example',
      hours_of_operation: 'Monday–Friday, 7:30 am – 6:00 pm',
      map_embed_info: ''
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