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

  // -------------------------
  // Storage helpers
  // -------------------------
  _initStorage() {
    const arrayKeys = [
      'programs',
      'courses',
      'course_offerings',
      'saved_programs',
      'schedule_plans',
      'schedule_plan_course_items',
      'events',
      'event_registrations',
      'scholarships',
      'favorite_scholarships',
      'residencies',
      'residency_plans',
      'residency_plan_items',
      'advisors',
      'advisor_availability_slots',
      'advisor_appointments',
      'alumni',
      'alumni_contacts',
      'tuition_estimates',
      'applications',
      'admissions_deadlines'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // Draft/current pointers are created lazily when needed
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseIsoDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _compareDates(a, b) {
    // a, b are ISO strings
    const da = this._parseIsoDate(a);
    const db = this._parseIsoDate(b);
    if (!da && !db) return 0;
    if (!da) return -1;
    if (!db) return 1;
    return da.getTime() - db.getTime();
  }

  // -------------------------
  // Private helpers required by spec
  // -------------------------

  // Schedule planner draft helper
  _getOrCreateCurrentSchedulePlanDraft() {
    let draftRaw = localStorage.getItem('current_schedule_plan_draft');
    if (draftRaw) {
      try {
        return JSON.parse(draftRaw);
      } catch (e) {
        // fall through to recreate
      }
    }
    const draft = {
      temporary_plan_id: this._generateId('schedDraft'),
      name: '',
      program_type: null,
      year_term_label: null,
      campus: null,
      courses: []
    };
    localStorage.setItem('current_schedule_plan_draft', JSON.stringify(draft));
    return draft;
  }

  _persistSchedulePlan(draft, plan_name) {
    const schedule_plans = this._getFromStorage('schedule_plans');
    const schedule_plan_course_items = this._getFromStorage('schedule_plan_course_items');

    const createdAt = this._nowIso();
    const planId = this._generateId('scheduleplan');
    const plan = {
      id: planId,
      name: plan_name || (draft.year_term_label ? `Plan for ${draft.year_term_label}` : 'My Schedule Plan'),
      program_type: draft.program_type,
      year_term_label: draft.year_term_label,
      campus: draft.campus,
      created_at: createdAt,
      last_updated_at: createdAt
    };
    schedule_plans.push(plan);

    const courseItemsOut = [];
    const now = this._nowIso();
    draft.courses.forEach((c) => {
      const itemId = this._generateId('spcourse');
      const item = {
        id: itemId,
        schedule_plan_id: planId,
        course_offering_id: c.course_offering_id,
        is_core: c.course_type === 'core',
        is_elective: c.course_type === 'elective',
        added_at: now
      };
      schedule_plan_course_items.push(item);
      courseItemsOut.push(item);
    });

    this._saveToStorage('schedule_plans', schedule_plans);
    this._saveToStorage('schedule_plan_course_items', schedule_plan_course_items);

    // Clear draft after persisting
    localStorage.removeItem('current_schedule_plan_draft');

    return { plan, courseItems: courseItemsOut };
  }

  // Residency plan helper
  _getOrCreateResidencyPlan() {
    const residency_plans = this._getFromStorage('residency_plans');
    if (residency_plans.length > 0) {
      return residency_plans[0];
    }
    const now = this._nowIso();
    const plan = {
      id: this._generateId('resplan'),
      name: 'My Residency Plan',
      created_at: now,
      last_updated_at: now
    };
    residency_plans.push(plan);
    this._saveToStorage('residency_plans', residency_plans);
    return plan;
  }

  // Tuition helper
  _calculateTuitionTotal(program, study_pace, include_housing, housing_monthly_cost, housing_months, include_residencies, number_of_international_residencies, travel_cost_per_residency) {
    const base_tuition = program && typeof program.total_tuition === 'number' ? program.total_tuition : 0;

    // Derive default housing months from study pace if not provided
    let derivedHousingMonths = housing_months;
    if (!derivedHousingMonths) {
      if (study_pace === 'full_time_12_months') derivedHousingMonths = 12;
      else if (study_pace === 'part_time_24_months') derivedHousingMonths = 24;
      else if (study_pace === 'part_time_30_months') derivedHousingMonths = 30;
      else derivedHousingMonths = 12;
    }

    const housing_total = include_housing
      ? (Number(housing_monthly_cost) || 0) * (Number(derivedHousingMonths) || 0)
      : 0;

    const residencies_total = include_residencies
      ? (Number(number_of_international_residencies) || 0) * (Number(travel_cost_per_residency) || 0)
      : 0;

    const total = base_tuition + housing_total + residencies_total;

    return {
      base_tuition_amount: base_tuition,
      housing_total,
      residencies_total,
      total_estimated_cost: total
    };
  }

  // Current application helper
  _getOrCreateCurrentApplication() {
    const apps = this._getFromStorage('applications');
    const currentId = localStorage.getItem('current_application_id');
    if (currentId) {
      const existing = apps.find((a) => a.id === currentId);
      if (existing) {
        return existing;
      }
    }
    // If not found, create a default in-progress dual_degree_emba application
    const now = this._nowIso();
    const app = {
      id: this._generateId('app'),
      application_type: 'dual_degree_emba',
      intended_start_term: '',
      preferred_campus: 'downtown_campus',
      first_name: '',
      last_name: '',
      email: '',
      mobile_phone: '',
      total_years_experience: 0,
      current_job_level: 'other',
      sponsorship_type: 'none',
      sponsorship_percent_tuition: 0,
      has_uploaded_test_scores: false,
      has_uploaded_other_documents: false,
      application_status: 'in_progress',
      current_step: 'landing',
      created_at: now,
      last_updated_at: now
    };
    apps.push(app);
    this._saveToStorage('applications', apps);
    localStorage.setItem('current_application_id', app.id);
    return app;
  }

  // Validate adding course offering to plan (simple conflict & duplicate check)
  _validateCourseOfferingAddToPlan(draft, offering) {
    const warnings = [];
    if (!draft || !offering) return warnings;

    const existing = draft.courses || [];

    // Duplicate check
    if (existing.some((c) => c.course_offering_id === offering.id)) {
      warnings.push('Course offering is already in the current plan.');
      return warnings;
    }

    // Simple time conflict: overlapping times on any shared day
    if (offering.start_time && offering.end_time) {
      const newStart = offering.start_time;
      const newEnd = offering.end_time;
      const newDays = offering.days_of_week || [];

      existing.forEach((c) => {
        const overlapDay = (c.days_of_week || []).some((d) => newDays.includes(d));
        if (!overlapDay) return;
        if (c.start_time && c.end_time) {
          if (!(c.end_time <= newStart || c.start_time >= newEnd)) {
            warnings.push(`Time conflict with ${c.course_title || 'another course'}.`);
          }
        }
      });
    }

    return warnings;
  }

  // Dashboard aggregator
  _getDashboardState() {
    const programs = this._getFromStorage('programs');
    const saved_programs = this._getFromStorage('saved_programs');
    const schedule_plans = this._getFromStorage('schedule_plans');
    const schedule_plan_course_items = this._getFromStorage('schedule_plan_course_items');
    const tuition_estimates = this._getFromStorage('tuition_estimates');
    const scholarships = this._getFromStorage('scholarships');
    const favorite_scholarships = this._getFromStorage('favorite_scholarships');
    const residencies = this._getFromStorage('residencies');
    const residency_plans = this._getFromStorage('residency_plans');
    const residency_plan_items = this._getFromStorage('residency_plan_items');
    const alumni = this._getFromStorage('alumni');
    const alumni_contacts = this._getFromStorage('alumni_contacts');
    const applications = this._getFromStorage('applications');
    const advisors = this._getFromStorage('advisors');
    const advisor_appointments = this._getFromStorage('advisor_appointments');

    // Saved programs with program resolution
    const savedProgramsOut = saved_programs.map((sp) => {
      const program = programs.find((p) => p.id === sp.program_id) || null;
      return {
        saved_program_id: sp.id,
        program_id: sp.program_id,
        program_name: program ? program.name : null,
        program_type: program ? program.program_type : null,
        total_tuition: program ? program.total_tuition : null,
        currency: program ? program.currency : null,
        saved_at: sp.saved_at,
        program
      };
    });

    // Schedule plans summary
    const schedulePlansOut = schedule_plans.map((sp) => {
      const courseCount = schedule_plan_course_items.filter((ci) => ci.schedule_plan_id === sp.id).length;
      return {
        schedule_plan_id: sp.id,
        name: sp.name,
        program_type: sp.program_type,
        year_term_label: sp.year_term_label,
        campus: sp.campus,
        course_count: courseCount,
        last_updated_at: sp.last_updated_at
      };
    });

    // Tuition estimates with program resolution
    const tuitionEstimatesOut = tuition_estimates.map((te) => {
      const program = programs.find((p) => p.id === te.program_id) || null;
      return {
        tuition_estimate_id: te.id,
        program_name_snapshot: te.program_name_snapshot,
        start_term: te.start_term,
        study_pace: te.study_pace,
        total_estimated_cost: te.total_estimated_cost,
        currency: te.currency,
        created_at: te.created_at,
        program
      };
    });

    // Favorite scholarships with scholarship resolution
    const favoriteScholarshipsOut = favorite_scholarships.map((fs) => {
      const schol = scholarships.find((s) => s.id === fs.scholarship_id) || null;
      return {
        favorite_scholarship_id: fs.id,
        scholarship_id: fs.scholarship_id,
        scholarship_name: schol ? schol.name : null,
        max_award_amount: schol ? schol.max_award_amount : null,
        currency: schol ? schol.currency : null,
        deadline_date: schol ? schol.deadline_date : null,
        scholarship: schol
      };
    });

    // Residency plan summary
    let residencyPlanOut = {
      has_residency_plan: false,
      plan_id: null,
      name: null,
      items_count: 0,
      upcoming_residencies: []
    };
    if (residency_plans.length > 0) {
      const plan = residency_plans[0];
      const items = residency_plan_items.filter((i) => i.residency_plan_id === plan.id);
      const upcoming = items
        .map((i) => {
          const res = residencies.find((r) => r.id === i.residency_id) || null;
          return res
            ? {
                residency_id: res.id,
                title: res.title,
                region: res.region,
                month: res.month,
                program_fee: res.program_fee,
                currency: res.currency,
                residency: res
              }
            : null;
        })
        .filter(Boolean);

      residencyPlanOut = {
        has_residency_plan: true,
        plan_id: plan.id,
        name: plan.name,
        items_count: items.length,
        upcoming_residencies: upcoming
      };
    }

    // Alumni contacts with alumni resolution
    const alumniContactsOut = alumni_contacts.map((ac) => {
      const al = alumni.find((a) => a.id === ac.alumni_id) || null;
      return {
        alumni_contact_id: ac.id,
        alumni_id: ac.alumni_id,
        full_name: al ? al.full_name : null,
        graduation_year: al ? al.graduation_year : null,
        industry: al ? al.industry : null,
        current_job_title: al ? al.current_job_title : null,
        location_region: al ? al.location_region : null,
        alumni: al
      };
    });

    // Applications list (no foreign keys)
    const applicationsOut = applications.map((a) => ({
      application_id: a.id,
      application_type: a.application_type,
      intended_start_term: a.intended_start_term,
      preferred_campus: a.preferred_campus,
      application_status: a.application_status,
      current_step: a.current_step,
      last_updated_at: a.last_updated_at
    }));

    // Advisor appointments with advisor resolution
    const advisorAppointmentsOut = advisor_appointments.map((ap) => {
      const adv = advisors.find((a) => a.id === ap.advisor_id) || null;
      return {
        advisor_appointment_id: ap.id,
        advisor_id: ap.advisor_id,
        advisor_name: adv ? adv.full_name : null,
        appointment_type: ap.appointment_type,
        start_datetime: ap.start_datetime,
        end_datetime: ap.end_datetime,
        status: ap.status,
        advisor: adv
      };
    });

    return {
      saved_programs: savedProgramsOut,
      schedule_plans: schedulePlansOut,
      tuition_estimates: tuitionEstimatesOut,
      favorite_scholarships: favoriteScholarshipsOut,
      residency_plan: residencyPlanOut,
      alumni_contacts: alumniContactsOut,
      applications: applicationsOut,
      advisor_appointments: advisorAppointmentsOut
    };
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // 1) getHomeOverviewContent
  getHomeOverviewContent() {
    return {
      hero_title: 'Dual-Degree EMBA Programs',
      hero_subtitle: 'Accelerate your executive trajectory with integrated management and specialty degrees.',
      intro_paragraphs: [
        'Explore flexible dual-degree Executive MBA programs designed for experienced professionals balancing career, study, and global responsibilities.',
        'Customize your pathway with global residencies, data-driven electives, and industry-aligned experiences.'
      ],
      key_highlights: [
        { label: 'Average work experience', value: '10+ years' },
        { label: 'Program formats', value: 'In-person, hybrid, and online' },
        { label: 'Global residencies', value: 'Across Asia, Europe, and the Americas' }
      ],
      primary_sections: [
        {
          section_code: 'programs',
          title: 'Programs',
          description: 'Compare EMBA and dual-degree EMBA options by duration, campus, and tuition.'
        },
        {
          section_code: 'curriculum_and_courses',
          title: 'Curriculum & Courses',
          description: 'Review core curriculum, electives, and plan your schedule by campus.'
        },
        {
          section_code: 'events_and_info_sessions',
          title: 'Events & Info Sessions',
          description: 'Join live online or on-campus sessions to connect with our team.'
        },
        {
          section_code: 'tuition_and_funding',
          title: 'Tuition & Funding',
          description: 'Estimate your total cost and explore scholarships and sponsorship options.'
        },
        {
          section_code: 'admissions',
          title: 'Admissions',
          description: 'Understand admissions criteria, timelines, and how to connect with an advisor.'
        },
        {
          section_code: 'apply_now',
          title: 'Apply Now',
          description: 'Begin or continue your dual-degree EMBA application.'
        },
        {
          section_code: 'my_dashboard',
          title: 'My Dashboard',
          description: 'Return to your saved programs, schedules, estimates, and applications.'
        }
      ]
    };
  }

  // 2) getHomeFeaturedPrograms
  getHomeFeaturedPrograms() {
    const programs = this._getFromStorage('programs').filter((p) => p && p.is_active);

    // Simple heuristic: take up to 5 active programs, preferring dual-degree EMBA
    const sorted = programs.sort((a, b) => {
      const aScore = a.program_type === 'dual_degree_emba' ? 0 : 1;
      const bScore = b.program_type === 'dual_degree_emba' ? 0 : 1;
      if (aScore !== bScore) return aScore - bScore;
      return (a.duration_months || 0) - (b.duration_months || 0);
    });

    const featured_programs = sorted.slice(0, 5).map((p, idx) => ({
      program_id: p.id,
      name: p.name,
      program_type: p.program_type,
      is_dual_degree: !!p.is_dual_degree,
      primary_campus: p.primary_campus,
      format: p.format,
      duration_months: p.duration_months,
      total_tuition: p.total_tuition,
      currency: p.currency,
      tagline: `${p.duration_months || ''} month ${p.format || ''} program`.trim(),
      highlight_badge: idx === 0 ? 'most_popular' : ''
    }));

    return { featured_programs };
  }

  // 3) getHomeFeaturedEventsAndDeadlines
  getHomeFeaturedEventsAndDeadlines() {
    const events = this._getFromStorage('events');
    const now = new Date();

    const upcoming_info_sessions = events
      .filter((e) => {
        if (!e || !e.start_datetime) return false;
        const start = new Date(e.start_datetime);
        return (
          e.event_type === 'online_info_session' &&
          start >= now &&
          e.is_registration_open === true
        );
      })
      .sort((a, b) => this._compareDates(a.start_datetime, b.start_datetime))
      .slice(0, 5)
      .map((e) => ({
        event_id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        event_type: e.event_type,
        location_type: e.location_type,
        is_registration_open: e.is_registration_open
      }));

    const admissions_deadlines = this._getFromStorage('admissions_deadlines');

    return { upcoming_info_sessions, admissions_deadlines };
  }

  // 4) getProgramFilterOptions
  getProgramFilterOptions() {
    const programs = this._getFromStorage('programs');

    const programTypeSet = new Set();
    const campusSet = new Set();
    const formatSet = new Set();
    let minDuration = Infinity;
    let maxDuration = 0;
    let minTuition = Infinity;
    let maxTuition = 0;
    let currency = 'usd';

    programs.forEach((p) => {
      if (!p) return;
      if (p.program_type) programTypeSet.add(p.program_type);
      if (p.primary_campus) campusSet.add(p.primary_campus);
      if (p.format) formatSet.add(p.format);
      if (typeof p.duration_months === 'number') {
        minDuration = Math.min(minDuration, p.duration_months);
        maxDuration = Math.max(maxDuration, p.duration_months);
      }
      if (typeof p.total_tuition === 'number') {
        minTuition = Math.min(minTuition, p.total_tuition);
        maxTuition = Math.max(maxTuition, p.total_tuition);
      }
      if (p.currency) currency = p.currency;
    });

    if (!isFinite(minDuration)) minDuration = 6;
    if (!isFinite(maxDuration)) maxDuration = 36;
    if (!isFinite(minTuition)) minTuition = 0;
    if (!isFinite(maxTuition)) maxTuition = 200000;

    const capitalizeLabel = (str) =>
      str
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

    const program_type_options = Array.from(programTypeSet).map((v) => ({
      value: v,
      label: capitalizeLabel(v)
    }));

    const campus_options = Array.from(campusSet).map((v) => ({
      value: v,
      label: capitalizeLabel(v)
    }));

    const format_options = Array.from(formatSet).map((v) => ({
      value: v,
      label: capitalizeLabel(v)
    }));

    const duration_slider = {
      min_months: minDuration,
      max_months: maxDuration,
      step: 1
    };

    const tuition_slider = {
      min_amount: minTuition,
      max_amount: maxTuition,
      step: 1000,
      currency
    };

    const sort_options = [
      { value: 'tuition_low_to_high', label: 'Total tuition: Low to High' },
      { value: 'tuition_high_to_low', label: 'Total tuition: High to Low' },
      { value: 'duration_short_to_long', label: 'Program length: Short to Long' },
      { value: 'name_a_to_z', label: 'Program name: A to Z' }
    ];

    return {
      program_type_options,
      campus_options,
      format_options,
      duration_slider,
      tuition_slider,
      sort_options
    };
  }

  // 5) searchPrograms(filters = {}, sort_by, page = 1, page_size = 20)
  searchPrograms(filters, sort_by, page, page_size) {
    const programs = this._getFromStorage('programs');
    const f = filters || {};
    const p = typeof page === 'number' ? page : 1;
    const ps = typeof page_size === 'number' ? page_size : 20;

    let results = programs.filter((prg) => {
      if (!prg) return false;
      if (f.program_type && prg.program_type !== f.program_type) return false;
      if (typeof f.is_dual_degree === 'boolean' && prg.is_dual_degree !== f.is_dual_degree) return false;
      if (f.primary_campus && prg.primary_campus !== f.primary_campus) return false;
      if (f.format && prg.format !== f.format) return false;
      if (f.currency && prg.currency !== f.currency) return false;
      if (f.only_active && !prg.is_active) return false;

      const duration = typeof prg.duration_months === 'number' ? prg.duration_months : null;
      if (typeof f.min_duration_months === 'number' && duration !== null && duration < f.min_duration_months) return false;
      if (typeof f.max_duration_months === 'number' && duration !== null && duration > f.max_duration_months) return false;

      if (typeof f.max_total_tuition === 'number' && typeof prg.total_tuition === 'number') {
        if (prg.total_tuition > f.max_total_tuition) return false;
      }

      return true;
    });

    if (sort_by === 'tuition_low_to_high') {
      results.sort((a, b) => (a.total_tuition || 0) - (b.total_tuition || 0));
    } else if (sort_by === 'tuition_high_to_low') {
      results.sort((a, b) => (b.total_tuition || 0) - (a.total_tuition || 0));
    } else if (sort_by === 'duration_short_to_long') {
      results.sort((a, b) => (a.duration_months || 0) - (b.duration_months || 0));
    } else if (sort_by === 'name_a_to_z') {
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const total_count = results.length;
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    const applied_filters_summary = JSON.stringify(f);

    return { results: paged, total_count, applied_filters_summary };
  }

  // 6) getProgramDetail(programId)
  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs');
    const saved_programs = this._getFromStorage('saved_programs');
    const program = programs.find((p) => p.id === programId) || null;

    const is_saved_to_my_programs = !!saved_programs.find((sp) => sp.program_id === programId);

    const tuition_section = program
      ? {
          total_tuition: program.total_tuition,
          currency: program.currency,
          duration_months: program.duration_months,
          fees_breakdown: []
        }
      : {
          total_tuition: 0,
          currency: 'usd',
          duration_months: 0,
          fees_breakdown: []
        };

    return {
      program,
      curriculum_overview: '',
      structure_summary: '',
      key_outcomes: [],
      tuition_section,
      is_saved_to_my_programs
    };
  }

  // 7) saveProgramToMyPrograms(programId)
  saveProgramToMyPrograms(programId) {
    const programs = this._getFromStorage('programs');
    const saved_programs = this._getFromStorage('saved_programs');

    const program = programs.find((p) => p.id === programId) || null;
    if (!program) {
      return { success: false, saved_program: null, message: 'Program not found.' };
    }

    let existing = saved_programs.find((sp) => sp.program_id === programId);
    if (!existing) {
      existing = {
        id: this._generateId('savedprog'),
        program_id: programId,
        saved_at: this._nowIso()
      };
      saved_programs.push(existing);
      this._saveToStorage('saved_programs', saved_programs);
    }

    const saved_program = {
      id: existing.id,
      program_id: existing.program_id,
      program_name: program.name,
      total_tuition: program.total_tuition,
      currency: program.currency,
      saved_at: existing.saved_at,
      program
    };

    return { success: true, saved_program, message: 'Program saved to My Programs.' };
  }

  // 8) getCurriculumOverview(program_type)
  getCurriculumOverview(program_type) {
    const pt = program_type || 'dual_degree_emba';
    let overview_text = '';
    let core_modules = [];
    let elective_themes = [];
    let sample_sequences = [];

    if (pt === 'dual_degree_emba') {
      overview_text = 'The dual-degree EMBA combines advanced management fundamentals with specialized graduate-level coursework.';
      core_modules = [
        { title: 'Strategic Management', summary: 'Frameworks for competitive analysis and corporate strategy.' },
        { title: 'Financial Accounting & Valuation', summary: 'Executive-level financial reporting and valuation techniques.' }
      ];
      elective_themes = [
        { theme_name: 'Data & Analytics', summary: 'Courses in analytics, AI, and decision modeling.' },
        { theme_name: 'Global Leadership', summary: 'Residency-based courses focused on cross-cultural leadership.' }
      ];
      sample_sequences = [
        {
          sequence_name: 'Standard dual-degree track',
          year_term_label: 'Year 1 - Academic Year',
          description: 'Evening core courses with weekend electives and one international residency.'
        }
      ];
    }

    return {
      program_type: pt,
      overview_text,
      core_modules,
      elective_themes,
      sample_sequences
    };
  }

  // 9) getSchedulePlannerConfig()
  getSchedulePlannerConfig() {
    const program_options = [
      { program_type: 'dual_degree_emba', label: 'Dual-Degree EMBA' },
      { program_type: 'single_emba', label: 'Executive MBA' },
      { program_type: 'global_emba', label: 'Global EMBA' }
    ];

    const year_term_options = [
      { year_term_label: 'Year 1 - Academic Year', year_number: 1 },
      { year_term_label: 'Year 2 - Academic Year', year_number: 2 }
    ];

    const campus_options = [
      { value: 'downtown_campus', label: 'Downtown Campus' },
      { value: 'uptown_campus', label: 'Uptown Campus' },
      { value: 'online_only', label: 'Online' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening (after 6:00 PM)' },
      { value: 'weekend', label: 'Weekend' }
    ];

    const day_of_week_options = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const course_type_options = [
      { value: 'core', label: 'Core' },
      { value: 'elective', label: 'Elective' }
    ];

    return {
      program_options,
      year_term_options,
      campus_options,
      time_of_day_options,
      day_of_week_options,
      course_type_options
    };
  }

  // 10) searchCourseOfferingsForPlanner(filters)
  searchCourseOfferingsForPlanner(filters) {
    const f = filters || {};
    const offerings = this._getFromStorage('course_offerings');
    const courses = this._getFromStorage('courses');

    let results = offerings.filter((o) => {
      if (!o) return false;
      if (f.program_type && o.program_type !== f.program_type) return false;
      if (f.year_term_label && o.year_term_label !== f.year_term_label) return false;
      if (f.campus && o.campus !== f.campus) return false;
      if (f.time_of_day && o.time_of_day !== f.time_of_day) return false;
      if (f.course_type && o.course_type !== f.course_type) return false;
      if (f.only_open_for_planning && !o.is_open_for_planning) return false;

      if (Array.isArray(f.days_of_week) && f.days_of_week.length > 0) {
        const days = o.days_of_week || [];
        const hasOverlap = days.some((d) => f.days_of_week.includes(d));
        if (!hasOverlap) return false;
      }
      return true;
    });

    const resultsWithCourses = results.map((o) => {
      const course = courses.find((c) => c.id === o.course_id) || {};
      return {
        course_offering_id: o.id,
        course_id: o.course_id,
        course_code: course.course_code,
        course_title: course.title,
        course_type: o.course_type,
        program_type: o.program_type,
        year_term_label: o.year_term_label,
        campus: o.campus,
        time_of_day: o.time_of_day,
        days_of_week: o.days_of_week,
        start_time: o.start_time,
        end_time: o.end_time,
        meets_on_saturday: o.meets_on_saturday,
        location_room: o.location_room,
        is_open_for_planning: o.is_open_for_planning
      };
    });

    return { results: resultsWithCourses, total_count: resultsWithCourses.length };
  }

  // 11) addCourseOfferingToCurrentPlan(courseOfferingId)
  addCourseOfferingToCurrentPlan(courseOfferingId) {
    const offerings = this._getFromStorage('course_offerings');
    const courses = this._getFromStorage('courses');
    const offering = offerings.find((o) => o.id === courseOfferingId) || null;
    if (!offering) {
      return {
        success: false,
        current_plan: null,
        validation_warnings: ['Course offering not found.'],
        message: 'Course offering not found.'
      };
    }

    let draft = this._getOrCreateCurrentSchedulePlanDraft();

    // If draft has no meta, set from this offering
    if (!draft.program_type || !draft.year_term_label || !draft.campus) {
      draft.program_type = offering.program_type;
      draft.year_term_label = offering.year_term_label;
      draft.campus = offering.campus;
    }

    const warnings = this._validateCourseOfferingAddToPlan(draft, offering);
    if (warnings.some((w) => w.toLowerCase().includes('already in'))) {
      return {
        success: false,
        current_plan: draft,
        validation_warnings: warnings,
        message: 'Course already in plan.'
      };
    }

    const course = courses.find((c) => c.id === offering.course_id) || {};

    const courseEntry = {
      course_offering_id: offering.id,
      course_title: course.title || '',
      course_type: offering.course_type,
      time_of_day: offering.time_of_day,
      days_of_week: offering.days_of_week || [],
      start_time: offering.start_time || null,
      end_time: offering.end_time || null
    };

    draft.courses.push(courseEntry);
    localStorage.setItem('current_schedule_plan_draft', JSON.stringify(draft));

    return {
      success: true,
      current_plan: draft,
      validation_warnings: warnings,
      message: 'Course added to current plan.'
    };
  }

  // 12) removeCourseOfferingFromCurrentPlan(courseOfferingId)
  removeCourseOfferingFromCurrentPlan(courseOfferingId) {
    let draftRaw = localStorage.getItem('current_schedule_plan_draft');
    if (!draftRaw) {
      return {
        success: false,
        current_plan: null,
        message: 'No active schedule plan draft.'
      };
    }
    let draft;
    try {
      draft = JSON.parse(draftRaw);
    } catch (e) {
      draft = this._getOrCreateCurrentSchedulePlanDraft();
    }

    const beforeCount = (draft.courses || []).length;
    draft.courses = (draft.courses || []).filter((c) => c.course_offering_id !== courseOfferingId);
    const afterCount = draft.courses.length;

    localStorage.setItem('current_schedule_plan_draft', JSON.stringify(draft));

    return {
      success: beforeCount !== afterCount,
      current_plan: {
        temporary_plan_id: draft.temporary_plan_id,
        courses: draft.courses
      },
      message: beforeCount !== afterCount ? 'Course removed from plan.' : 'Course was not in plan.'
    };
  }

  // 13) getCurrentSchedulePlanDraft()
  getCurrentSchedulePlanDraft() {
    const draftRaw = localStorage.getItem('current_schedule_plan_draft');
    if (!draftRaw) {
      return { has_active_draft: false, draft_plan: null };
    }
    let draft;
    try {
      draft = JSON.parse(draftRaw);
    } catch (e) {
      return { has_active_draft: false, draft_plan: null };
    }
    return {
      has_active_draft: true,
      draft_plan: draft
    };
  }

  // 14) saveCurrentSchedulePlan(plan_name)
  saveCurrentSchedulePlan(plan_name) {
    const draftRaw = localStorage.getItem('current_schedule_plan_draft');
    if (!draftRaw) {
      return {
        success: false,
        schedule_plan: null,
        course_items: [],
        message: 'No active schedule plan draft to save.'
      };
    }
    let draft;
    try {
      draft = JSON.parse(draftRaw);
    } catch (e) {
      return {
        success: false,
        schedule_plan: null,
        course_items: [],
        message: 'Invalid schedule plan draft.'
      };
    }

    const { plan, courseItems } = this._persistSchedulePlan(draft, plan_name);

    // Resolve course_offerings and courses for response
    const course_offerings = this._getFromStorage('course_offerings');
    const courses = this._getFromStorage('courses');

    const course_items = courseItems.map((ci) => {
      const offering = course_offerings.find((o) => o.id === ci.course_offering_id) || null;
      const course = offering ? courses.find((c) => c.id === offering.course_id) || null : null;
      return {
        schedule_plan_course_item_id: ci.id,
        course_offering_id: ci.course_offering_id,
        course_title: course ? course.title : null,
        is_core: ci.is_core,
        is_elective: ci.is_elective,
        course_offering: offering,
        course
      };
    });

    const schedule_plan = {
      id: plan.id,
      name: plan.name,
      program_type: plan.program_type,
      year_term_label: plan.year_term_label,
      campus: plan.campus,
      created_at: plan.created_at,
      last_updated_at: plan.last_updated_at
    };

    return {
      success: true,
      schedule_plan,
      course_items,
      message: 'Schedule plan saved.'
    };
  }

  // 15) getEventFilterOptions()
  getEventFilterOptions() {
    const event_type_options = [
      { value: 'online_info_session', label: 'Online Info Session' },
      { value: 'on_campus_info_session', label: 'On-Campus Info Session' },
      { value: 'webinar', label: 'Webinar' },
      { value: 'class_visit', label: 'Class Visit' },
      { value: 'other', label: 'Other' }
    ];

    const start_time_filter_options = [
      { value: '18_00_or_later', label: '6:00 PM or later' },
      { value: '17_00_or_later', label: '5:00 PM or later' }
    ];

    const sort_options = [
      { value: 'soonest_first', label: 'Soonest first' },
      { value: 'latest_first', label: 'Latest first' }
    ];

    return { event_type_options, start_time_filter_options, sort_options };
  }

  // 16) searchEvents(filters, sort_by)
  searchEvents(filters, sort_by) {
    const events = this._getFromStorage('events');
    const f = filters || {};

    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [hh, mm] = timeStr.split(':').map((x) => parseInt(x, 10));
      return hh * 60 + (mm || 0);
    };

    let results = events.filter((e) => {
      if (!e) return false;
      if (f.event_type && e.event_type !== f.event_type) return false;
      if (f.only_registration_open && !e.is_registration_open) return false;

      if (f.date_start || f.date_end) {
        const d = this._parseIsoDate(e.start_datetime);
        if (!d) return false;
        if (f.date_start) {
          const ds = new Date(f.date_start + 'T00:00:00Z');
          if (d < ds) return false;
        }
        if (f.date_end) {
          const de = new Date(f.date_end + 'T23:59:59Z');
          if (d > de) return false;
        }
      }

      if (f.min_start_time) {
        const d = this._parseIsoDate(e.start_datetime);
        if (!d) return false;
        const eventMinutes = d.getHours() * 60 + d.getMinutes();
        const filterMinutes = parseTimeToMinutes(f.min_start_time);
        if (eventMinutes < filterMinutes) return false;
      }

      return true;
    });

    if (sort_by === 'soonest_first') {
      results.sort((a, b) => this._compareDates(a.start_datetime, b.start_datetime));
    } else if (sort_by === 'latest_first') {
      results.sort((a, b) => this._compareDates(b.start_datetime, a.start_datetime));
    }

    return { results, total_count: results.length };
  }

  // 17) getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    return {
      event,
      how_to_join_instructions: event && event.location_type === 'online'
        ? 'You will receive a confirmation email with a join link closer to the session date.'
        : 'Location details and check-in instructions will be shared in your confirmation email.'
    };
  }

  // 18) registerForEvent(eventId, full_name, email, job_title, work_experience_range, sms_consent, phone_number)
  registerForEvent(eventId, full_name, email, job_title, work_experience_range, sms_consent, phone_number) {
    const events = this._getFromStorage('events');
    const registrations = this._getFromStorage('event_registrations');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { success: false, registration: null, message: 'Event not found.' };
    }
    if (!event.is_registration_open) {
      return { success: false, registration: null, message: 'Registration is closed for this event.' };
    }

    const reg = {
      id: this._generateId('eventreg'),
      event_id: eventId,
      full_name,
      email,
      job_title: job_title || '',
      work_experience_range: work_experience_range || null,
      sms_consent: !!sms_consent,
      phone_number: phone_number || '',
      registered_at: this._nowIso()
    };

    registrations.push(reg);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      registration: {
        ...reg,
        event
      },
      message: 'Registration submitted.'
    };
  }

  // 19) getTuitionOverview(program_type)
  getTuitionOverview(program_type) {
    const programs = this._getFromStorage('programs');
    const filtered = programs.filter((p) => {
      if (!p) return false;
      if (program_type && p.program_type !== program_type) return false;
      return true;
    });

    const program_tuitions = filtered.map((p) => ({
      program_id: p.id,
      program_name: p.name,
      program_type: p.program_type,
      total_tuition: p.total_tuition,
      currency: p.currency,
      standard_duration_months: p.duration_months,
      notes: ''
    }));

    const tuition_summary_text = 'Review standard tuition and fees for EMBA and dual-degree EMBA programs.';

    return { tuition_summary_text, program_tuitions };
  }

  // 20) getTuitionCalculatorConfig()
  getTuitionCalculatorConfig() {
    const programs = this._getFromStorage('programs').filter((p) => p && p.is_active);

    const program_options = programs.map((p) => ({
      program_id: p.id,
      program_name: p.name,
      program_type: p.program_type
    }));

    const startTermSet = new Set();
    programs.forEach((p) => {
      (p.start_terms || []).forEach((t) => startTermSet.add(t));
    });
    const start_term_options = Array.from(startTermSet);

    const study_pace_options = [
      { value: 'full_time_12_months', label: 'Full-time (12 months)', duration_months: 12 },
      { value: 'part_time_24_months', label: 'Part-time (24 months)', duration_months: 24 },
      { value: 'part_time_30_months', label: 'Part-time (30 months)', duration_months: 30 },
      { value: 'self_paced', label: 'Self-paced', duration_months: 0 }
    ];

    const housing_defaults = {
      suggested_monthly_cost: 1800,
      suggested_months: 24
    };

    const residency_defaults = {
      default_number_of_international_residencies: 1,
      default_travel_cost_per_residency: 2500
    };

    return {
      program_options,
      start_term_options,
      study_pace_options,
      housing_defaults,
      residency_defaults
    };
  }

  // 21) calculateTuitionEstimatePreview(programId, ...)
  calculateTuitionEstimatePreview(programId, start_term, study_pace, include_housing, housing_monthly_cost, housing_months, include_residencies, number_of_international_residencies, travel_cost_per_residency) {
    const programs = this._getFromStorage('programs');
    const program = programs.find((p) => p.id === programId) || null;

    const totals = this._calculateTuitionTotal(
      program,
      study_pace,
      !!include_housing,
      housing_monthly_cost,
      housing_months,
      !!include_residencies,
      number_of_international_residencies,
      travel_cost_per_residency
    );

    return {
      program_name: program ? program.name : null,
      base_tuition_amount: totals.base_tuition_amount,
      housing_total: totals.housing_total,
      residencies_total: totals.residencies_total,
      total_estimated_cost: totals.total_estimated_cost,
      currency: program ? program.currency : 'usd'
    };
  }

  // 22) saveTuitionEstimateFromInputs(programId, ...)
  saveTuitionEstimateFromInputs(programId, start_term, study_pace, include_housing, housing_monthly_cost, housing_months, include_residencies, number_of_international_residencies, travel_cost_per_residency) {
    const programs = this._getFromStorage('programs');
    const tuition_estimates = this._getFromStorage('tuition_estimates');
    const program = programs.find((p) => p.id === programId) || null;

    if (!program) {
      return { success: false, tuition_estimate: null, message: 'Program not found.' };
    }

    const totals = this._calculateTuitionTotal(
      program,
      study_pace,
      !!include_housing,
      housing_monthly_cost,
      housing_months,
      !!include_residencies,
      number_of_international_residencies,
      travel_cost_per_residency
    );

    const now = this._nowIso();
    const estimate = {
      id: this._generateId('tuitionest'),
      program_id: program.id,
      program_name_snapshot: program.name,
      start_term,
      study_pace,
      include_housing: !!include_housing,
      housing_monthly_cost: include_housing ? Number(housing_monthly_cost) || 0 : 0,
      housing_months: include_housing ? Number(housing_months) || 0 : 0,
      include_residencies: !!include_residencies,
      number_of_international_residencies: include_residencies ? Number(number_of_international_residencies) || 0 : 0,
      travel_cost_per_residency: include_residencies ? Number(travel_cost_per_residency) || 0 : 0,
      base_tuition_amount: totals.base_tuition_amount,
      total_estimated_cost: totals.total_estimated_cost,
      currency: program.currency,
      created_at: now
    };

    tuition_estimates.push(estimate);
    this._saveToStorage('tuition_estimates', tuition_estimates);

    return {
      success: true,
      tuition_estimate: {
        ...estimate,
        program
      },
      message: 'Tuition estimate saved to your account.'
    };
  }

  // 23) getScholarshipFilterOptions()
  getScholarshipFilterOptions() {
    const scholarships = this._getFromStorage('scholarships');

    const eligible_program_type_options = [
      { value: 'dual_degree_emba', label: 'Dual-Degree EMBA' },
      { value: 'single_emba', label: 'Executive MBA' },
      { value: 'global_emba', label: 'Global EMBA' }
    ];

    let minAmount = Infinity;
    let maxAmount = 0;
    let currency = 'usd';
    scholarships.forEach((s) => {
      if (!s) return;
      if (typeof s.max_award_amount === 'number') {
        minAmount = Math.min(minAmount, s.max_award_amount);
        maxAmount = Math.max(maxAmount, s.max_award_amount);
      }
      if (s.currency) currency = s.currency;
    });
    if (!isFinite(minAmount)) minAmount = 0;
    if (!isFinite(maxAmount)) maxAmount = 50000;

    const minimum_award_slider = {
      min_amount: minAmount,
      max_amount: maxAmount,
      step: 1000,
      currency
    };

    const deadline_presets = [
      {
        label: 'Upcoming year',
        start_date: new Date(new Date().getFullYear(), 0, 1).toISOString(),
        end_date: new Date(new Date().getFullYear(), 11, 31).toISOString()
      }
    ];

    const sort_options = [
      { value: 'award_high_to_low', label: 'Award amount: High to Low' },
      { value: 'award_low_to_high', label: 'Award amount: Low to High' },
      { value: 'deadline_soonest_first', label: 'Deadline: Soonest first' }
    ];

    return {
      eligible_program_type_options,
      minimum_award_slider,
      deadline_presets,
      sort_options
    };
  }

  // 24) searchScholarships(filters, sort_by)
  searchScholarships(filters, sort_by) {
    const scholarships = this._getFromStorage('scholarships');
    const f = filters || {};

    let results = scholarships.filter((s) => {
      if (!s) return false;

      if (f.eligible_program_type) {
        const eligible = s.eligible_program_types || [];
        if (!eligible.includes(f.eligible_program_type)) return false;
      }

      if (typeof f.min_award_amount === 'number') {
        if (typeof s.max_award_amount !== 'number' || s.max_award_amount < f.min_award_amount) return false;
      }

      if (f.only_active && !s.is_active) return false;

      if (f.deadline_start_date || f.deadline_end_date) {
        const d = this._parseIsoDate(s.deadline_date);
        if (!d) return false;
        if (f.deadline_start_date) {
          const ds = new Date(f.deadline_start_date);
          if (d < ds) return false;
        }
        if (f.deadline_end_date) {
          const de = new Date(f.deadline_end_date);
          if (d > de) return false;
        }
      }

      return true;
    });

    if (sort_by === 'award_high_to_low') {
      results.sort((a, b) => (b.max_award_amount || 0) - (a.max_award_amount || 0));
    } else if (sort_by === 'award_low_to_high') {
      results.sort((a, b) => (a.max_award_amount || 0) - (b.max_award_amount || 0));
    } else if (sort_by === 'deadline_soonest_first') {
      results.sort((a, b) => this._compareDates(a.deadline_date, b.deadline_date));
    }

    return { results, total_count: results.length };
  }

  // 25) getScholarshipDetail(scholarshipId)
  getScholarshipDetail(scholarshipId) {
    const scholarships = this._getFromStorage('scholarships');
    const favorite_scholarships = this._getFromStorage('favorite_scholarships');

    const scholarship = scholarships.find((s) => s.id === scholarshipId) || null;
    const is_favorited = !!favorite_scholarships.find((fs) => fs.scholarship_id === scholarshipId);

    return { scholarship, is_favorited };
  }

  // 26) addScholarshipToFavorites(scholarshipId)
  addScholarshipToFavorites(scholarshipId) {
    const scholarships = this._getFromStorage('scholarships');
    const favorite_scholarships = this._getFromStorage('favorite_scholarships');

    const scholarship = scholarships.find((s) => s.id === scholarshipId) || null;
    if (!scholarship) {
      return { success: false, favorite_scholarship: null, message: 'Scholarship not found.' };
    }

    let fav = favorite_scholarships.find((fs) => fs.scholarship_id === scholarshipId);
    if (!fav) {
      fav = {
        id: this._generateId('favschol'),
        scholarship_id: scholarshipId,
        favorited_at: this._nowIso()
      };
      favorite_scholarships.push(fav);
      this._saveToStorage('favorite_scholarships', favorite_scholarships);
    }

    const favorite_scholarship = {
      id: fav.id,
      scholarship_id: fav.scholarship_id,
      scholarship_name: scholarship.name,
      max_award_amount: scholarship.max_award_amount,
      currency: scholarship.currency,
      deadline_date: scholarship.deadline_date,
      favorited_at: fav.favorited_at,
      scholarship
    };

    return { success: true, favorite_scholarship, message: 'Scholarship added to favorites.' };
  }

  // 27) getResidencyFilterOptions()
  getResidencyFilterOptions() {
    const residencies = this._getFromStorage('residencies');

    const region_options = [
      { value: 'asia', label: 'Asia' },
      { value: 'europe', label: 'Europe' },
      { value: 'north_america', label: 'North America' },
      { value: 'south_america', label: 'South America' },
      { value: 'africa', label: 'Africa' },
      { value: 'middle_east', label: 'Middle East' },
      { value: 'oceania', label: 'Oceania' }
    ];

    const duration_range_options = [
      { min_days: 7, max_days: 10, label: '7-10 days' },
      { min_days: 11, max_days: 14, label: '11-14 days' }
    ];

    const month_options = [
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
    ].map((m) => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }));

    let minFee = Infinity;
    let maxFee = 0;
    let currency = 'usd';
    residencies.forEach((r) => {
      if (!r) return;
      if (typeof r.program_fee === 'number') {
        minFee = Math.min(minFee, r.program_fee);
        maxFee = Math.max(maxFee, r.program_fee);
      }
      if (r.currency) currency = r.currency;
    });
    if (!isFinite(minFee)) minFee = 0;
    if (!isFinite(maxFee)) maxFee = 15000;

    const max_fee_slider = {
      min_amount: minFee,
      max_amount: maxFee,
      step: 500,
      currency
    };

    const sort_options = [
      { value: 'fee_low_to_high', label: 'Program fee: Low to High' },
      { value: 'fee_high_to_low', label: 'Program fee: High to Low' }
    ];

    return {
      region_options,
      duration_range_options,
      month_options,
      max_fee_slider,
      sort_options
    };
  }

  // 28) searchResidencies(filters, sort_by)
  searchResidencies(filters, sort_by) {
    const residencies = this._getFromStorage('residencies');
    const f = filters || {};

    let results = residencies.filter((r) => {
      if (!r) return false;
      if (f.region && r.region !== f.region) return false;
      if (typeof f.min_duration_days === 'number' && r.duration_days < f.min_duration_days) return false;
      if (typeof f.max_duration_days === 'number' && r.duration_days > f.max_duration_days) return false;
      if (Array.isArray(f.months) && f.months.length > 0 && !f.months.includes(r.month)) return false;
      if (typeof f.max_program_fee === 'number' && r.program_fee > f.max_program_fee) return false;
      if (f.only_open_for_dual_degree_emba && !r.is_open_for_dual_degree_emba) return false;
      if (f.only_active && !r.is_active) return false;
      return true;
    });

    if (sort_by === 'fee_low_to_high') {
      results.sort((a, b) => (a.program_fee || 0) - (b.program_fee || 0));
    } else if (sort_by === 'fee_high_to_low') {
      results.sort((a, b) => (b.program_fee || 0) - (a.program_fee || 0));
    }

    return { results, total_count: results.length };
  }

  // 29) getResidencyDetail(residencyId)
  getResidencyDetail(residencyId) {
    const residencies = this._getFromStorage('residencies');
    const residency_plan_items = this._getFromStorage('residency_plan_items');

    const residency = residencies.find((r) => r.id === residencyId) || null;
    const already_in_plan = !!residency_plan_items.find((i) => i.residency_id === residencyId);

    return {
      residency,
      itinerary_summary: '',
      already_in_plan
    };
  }

  // 30) addResidencyToPlan(residencyId)
  addResidencyToPlan(residencyId) {
    const residencies = this._getFromStorage('residencies');
    const residency_plan_items = this._getFromStorage('residency_plan_items');

    const residency = residencies.find((r) => r.id === residencyId) || null;
    if (!residency) {
      return { success: false, residency_plan: null, plan_items: [], message: 'Residency not found.' };
    }

    const plan = this._getOrCreateResidencyPlan();

    let existing = residency_plan_items.find(
      (i) => i.residency_plan_id === plan.id && i.residency_id === residencyId
    );
    if (!existing) {
      existing = {
        id: this._generateId('resitem'),
        residency_plan_id: plan.id,
        residency_id: residencyId,
        added_at: this._nowIso()
      };
      residency_plan_items.push(existing);

      // update plan last_updated_at
      const residency_plans = this._getFromStorage('residency_plans');
      const idx = residency_plans.findIndex((p) => p.id === plan.id);
      if (idx >= 0) {
        residency_plans[idx].last_updated_at = this._nowIso();
        this._saveToStorage('residency_plans', residency_plans);
      }

      this._saveToStorage('residency_plan_items', residency_plan_items);
    }

    const itemsForPlan = residency_plan_items
      .filter((i) => i.residency_plan_id === plan.id)
      .map((i) => {
        const res = residencies.find((r) => r.id === i.residency_id) || null;
        return {
          residency_plan_item_id: i.id,
          residency_id: i.residency_id,
          residency_title: res ? res.title : null,
          added_at: i.added_at,
          residency: res
        };
      });

    const residency_plan = {
      id: plan.id,
      name: plan.name,
      created_at: plan.created_at,
      last_updated_at: plan.last_updated_at
    };

    return {
      success: true,
      residency_plan,
      plan_items: itemsForPlan,
      message: 'Residency added to your plan.'
    };
  }

  // 31) getResidencyPlan()
  getResidencyPlan() {
    const residency_plans = this._getFromStorage('residency_plans');
    const residency_plan_items = this._getFromStorage('residency_plan_items');
    const residencies = this._getFromStorage('residencies');

    if (residency_plans.length === 0) {
      return {
        has_residency_plan: false,
        residency_plan: null,
        items: []
      };
    }

    const plan = residency_plans[0];
    const items = residency_plan_items
      .filter((i) => i.residency_plan_id === plan.id)
      .map((i) => {
        const res = residencies.find((r) => r.id === i.residency_id) || null;
        return {
          residency_plan_item_id: i.id,
          residency_id: i.residency_id,
          residency_title: res ? res.title : null,
          region: res ? res.region : null,
          month: res ? res.month : null,
          duration_days: res ? res.duration_days : null,
          program_fee: res ? res.program_fee : null,
          currency: res ? res.currency : null,
          added_at: i.added_at,
          residency: res
        };
      });

    return {
      has_residency_plan: true,
      residency_plan: {
        id: plan.id,
        name: plan.name,
        created_at: plan.created_at,
        last_updated_at: plan.last_updated_at
      },
      items
    };
  }

  // 32) getDashboardOverview()
  getDashboardOverview() {
    return this._getDashboardState();
  }

  // 33) getAdmissionsOverviewContent()
  getAdmissionsOverviewContent() {
    const admissions_deadlines = this._getFromStorage('admissions_deadlines');

    const intro_text = 'Our dual-degree EMBA admissions process is designed for experienced leaders seeking to advance their impact.';

    const criteria_sections = [
      {
        title: 'Professional experience',
        body: 'Most successful candidates have at least 7–10 years of progressive full-time work experience, including significant leadership responsibility.'
      },
      {
        title: 'Academic background',
        body: 'A prior bachelor’s degree or equivalent is required. Graduate study or professional certifications are valued but not required.'
      }
    ];

    const application_deadlines = admissions_deadlines.map((d) => ({
      application_type: d.application_type,
      round_label: d.label,
      deadline_date: d.deadline_date
    }));

    const connection_options = [
      {
        option_code: 'info_sessions',
        title: 'Attend an info session',
        description: 'Join online or on-campus sessions to learn about curriculum, format, and admissions.'
      },
      {
        option_code: 'advisor_consultation',
        title: 'Meet an advisor',
        description: 'Schedule a one-on-one consultation to discuss your background and goals.'
      },
      {
        option_code: 'email_contact',
        title: 'Email our team',
        description: 'Send questions anytime and an admissions representative will respond.'
      }
    ];

    return {
      intro_text,
      criteria_sections,
      application_deadlines,
      connection_options
    };
  }

  // 34) getAdvisorFilterOptions()
  getAdvisorFilterOptions() {
    const region_options = [
      { value: 'north_america', label: 'North America' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia', label: 'Asia' },
      { value: 'south_america', label: 'South America' },
      { value: 'africa', label: 'Africa' },
      { value: 'middle_east', label: 'Middle East' },
      { value: 'oceania', label: 'Oceania' }
    ];

    const industry_experience_options = [
      { value: 'technology', label: 'Technology' },
      { value: 'finance', label: 'Finance' },
      { value: 'consulting', label: 'Consulting' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'other', label: 'Other' }
    ];

    return { region_options, industry_experience_options };
  }

  // 35) searchAdvisors(filters)
  searchAdvisors(filters) {
    const advisors = this._getFromStorage('advisors');
    const f = filters || {};

    const results = advisors.filter((a) => {
      if (!a) return false;
      if (f.region && a.region !== f.region) return false;
      if (f.industry_experience) {
        const industries = a.industry_experience || [];
        if (!industries.includes(f.industry_experience)) return false;
      }
      if (f.only_active && !a.is_active) return false;
      return true;
    });

    return { results, total_count: results.length };
  }

  // 36) getAdvisorDetail(advisorId)
  getAdvisorDetail(advisorId) {
    const advisors = this._getFromStorage('advisors');
    const advisor = advisors.find((a) => a.id === advisorId) || null;
    return { advisor };
  }

  // 37) getAdvisorAvailabilitySlots(advisorId, date_start, date_end, location_type)
  getAdvisorAvailabilitySlots(advisorId, date_start, date_end, location_type) {
    const slots = this._getFromStorage('advisor_availability_slots');

    const results = slots.filter((s) => {
      if (!s) return false;
      if (s.advisor_id !== advisorId) return false;

      const d = this._parseIsoDate(s.start_datetime);
      if (!d) return false;

      if (date_start) {
        const ds = new Date(date_start + 'T00:00:00Z');
        if (d < ds) return false;
      }
      if (date_end) {
        const de = new Date(date_end + 'T23:59:59Z');
        if (d > de) return false;
      }

      if (location_type && s.location_type !== location_type) return false;

      return !s.is_booked;
    });

    return { slots: results };
  }

  // 38) bookAdvisorAppointment(availabilitySlotId, appointment_type, requester_name, requester_email)
  bookAdvisorAppointment(availabilitySlotId, appointment_type, requester_name, requester_email) {
    const slots = this._getFromStorage('advisor_availability_slots');
    const advisors = this._getFromStorage('advisors');
    const appointments = this._getFromStorage('advisor_appointments');

    const slotIndex = slots.findIndex((s) => s.id === availabilitySlotId);
    if (slotIndex === -1) {
      return { success: false, appointment: null, message: 'Availability slot not found.' };
    }
    const slot = slots[slotIndex];
    if (slot.is_booked) {
      return { success: false, appointment: null, message: 'This time slot is already booked.' };
    }

    const advisor = advisors.find((a) => a.id === slot.advisor_id) || null;

    const appointment = {
      id: this._generateId('advappt'),
      advisor_id: slot.advisor_id,
      availability_slot_id: slot.id,
      appointment_type,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      requester_name,
      requester_email,
      status: 'booked',
      created_at: this._nowIso()
    };

    appointments.push(appointment);
    this._saveToStorage('advisor_appointments', appointments);

    // mark slot as booked
    slots[slotIndex].is_booked = true;
    this._saveToStorage('advisor_availability_slots', slots);

    return {
      success: true,
      appointment: {
        ...appointment,
        advisor,
        availability_slot: slot
      },
      message: 'Advisor appointment booked.'
    };
  }

  // 39) getAlumniFilterOptions()
  getAlumniFilterOptions() {
    const alumni = this._getFromStorage('alumni');

    const industry_options = [
      { value: 'technology', label: 'Technology' },
      { value: 'finance', label: 'Finance' },
      { value: 'consulting', label: 'Consulting' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'other', label: 'Other' }
    ];

    const location_region_options = [
      { value: 'north_america', label: 'North America' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia', label: 'Asia' },
      { value: 'south_america', label: 'South America' },
      { value: 'africa', label: 'Africa' },
      { value: 'middle_east', label: 'Middle East' },
      { value: 'oceania', label: 'Oceania' }
    ];

    const role_seniority_sort_options = [
      { value: 'role_seniority_high_to_low', label: 'Current role seniority: High to Low' },
      { value: 'graduation_year_newest_first', label: 'Graduation year: Newest first' }
    ];

    let minYear = Infinity;
    let maxYear = 0;
    alumni.forEach((a) => {
      if (!a) return;
      if (typeof a.graduation_year === 'number') {
        minYear = Math.min(minYear, a.graduation_year);
        maxYear = Math.max(maxYear, a.graduation_year);
      }
    });
    if (!isFinite(minYear)) minYear = 0;
    if (!isFinite(maxYear)) maxYear = 0;

    const graduation_year_range = {
      min_year: minYear,
      max_year: maxYear
    };

    return {
      industry_options,
      location_region_options,
      role_seniority_sort_options,
      graduation_year_range
    };
  }

  // 40) searchAlumni(filters, sort_by)
  searchAlumni(filters, sort_by) {
    const alumni = this._getFromStorage('alumni');
    const f = filters || {};

    const seniorityRank = {
      entry: 1,
      mid: 2,
      senior: 3,
      director: 4,
      vp: 5,
      c_level: 6,
      founder: 7
    };

    let results = alumni.filter((a) => {
      if (!a) return false;
      if (f.industry && a.industry !== f.industry) return false;
      if (f.location_region && a.location_region !== f.location_region) return false;
      if (typeof f.min_graduation_year === 'number' && a.graduation_year < f.min_graduation_year) return false;
      if (typeof f.max_graduation_year === 'number' && a.graduation_year > f.max_graduation_year) return false;
      return true;
    });

    if (sort_by === 'role_seniority_high_to_low') {
      results.sort((a, b) => (seniorityRank[b.role_seniority] || 0) - (seniorityRank[a.role_seniority] || 0));
    } else if (sort_by === 'graduation_year_newest_first') {
      results.sort((a, b) => (b.graduation_year || 0) - (a.graduation_year || 0));
    }

    return { results, total_count: results.length };
  }

  // 41) getAlumniProfile(alumniId)
  getAlumniProfile(alumniId) {
    const alumni = this._getFromStorage('alumni');
    const alumni_contacts = this._getFromStorage('alumni_contacts');

    const al = alumni.find((a) => a.id === alumniId) || null;
    const is_in_contacts = !!alumni_contacts.find((c) => c.alumni_id === alumniId);

    return { alumni: al, is_in_contacts };
  }

  // 42) saveAlumniToContacts(alumniId, notes)
  saveAlumniToContacts(alumniId, notes) {
    const alumni = this._getFromStorage('alumni');
    const alumni_contacts = this._getFromStorage('alumni_contacts');

    const al = alumni.find((a) => a.id === alumniId) || null;
    if (!al) {
      return { success: false, alumni_contact: null, message: 'Alumni profile not found.' };
    }

    let contact = alumni_contacts.find((c) => c.alumni_id === alumniId);
    if (!contact) {
      contact = {
        id: this._generateId('alcontact'),
        alumni_id: alumniId,
        added_at: this._nowIso(),
        notes: notes || ''
      };
      alumni_contacts.push(contact);
    } else if (typeof notes === 'string') {
      contact.notes = notes;
    }

    this._saveToStorage('alumni_contacts', alumni_contacts);

    return {
      success: true,
      alumni_contact: {
        ...contact,
        alumni: al
      },
      message: 'Alumni added to your contacts.'
    };
  }

  // 43) getApplicationTypes()
  getApplicationTypes() {
    const application_types = [
      {
        code: 'dual_degree_emba',
        label: 'Dual-Degree EMBA Application',
        description: 'Apply to a dual-degree EMBA combining management with an additional graduate credential.'
      },
      {
        code: 'single_emba',
        label: 'Executive MBA Application',
        description: 'Apply to the standalone Executive MBA program.'
      },
      {
        code: 'ms_program',
        label: 'Master’s Program Application',
        description: 'Apply to specialized master’s programs.'
      },
      {
        code: 'other',
        label: 'Other Application',
        description: 'For other graduate or certificate programs.'
      }
    ];

    return { application_types };
  }

  // 44) startApplication(application_type)
  startApplication(application_type) {
    const apps = this._getFromStorage('applications');
    const now = this._nowIso();

    const app = {
      id: this._generateId('app'),
      application_type: application_type || 'dual_degree_emba',
      intended_start_term: '',
      preferred_campus: 'downtown_campus',
      first_name: '',
      last_name: '',
      email: '',
      mobile_phone: '',
      total_years_experience: 0,
      current_job_level: 'other',
      sponsorship_type: 'none',
      sponsorship_percent_tuition: 0,
      has_uploaded_test_scores: false,
      has_uploaded_other_documents: false,
      application_status: 'in_progress',
      current_step: 'personal_info',
      created_at: now,
      last_updated_at: now
    };

    apps.push(app);
    this._saveToStorage('applications', apps);
    localStorage.setItem('current_application_id', app.id);

    return { application: app };
  }

  // 45) getCurrentApplication()
  getCurrentApplication() {
    const apps = this._getFromStorage('applications');
    const currentId = localStorage.getItem('current_application_id');
    if (!currentId) {
      return { has_application: false, application: null };
    }
    const app = apps.find((a) => a.id === currentId) || null;
    if (!app) {
      return { has_application: false, application: null };
    }
    return { has_application: true, application: app };
  }

  // 46) updateCurrentApplication(fields)
  updateCurrentApplication(fields) {
    const apps = this._getFromStorage('applications');
    const currentApp = this._getOrCreateCurrentApplication();

    const idx = apps.findIndex((a) => a.id === currentApp.id);
    if (idx === -1) {
      apps.push(currentApp);
    }

    const up = fields || {};

    const updateField = (key) => {
      if (Object.prototype.hasOwnProperty.call(up, key) && up[key] !== undefined) {
        currentApp[key] = up[key];
      }
    };

    updateField('intended_start_term');
    updateField('preferred_campus');
    updateField('first_name');
    updateField('last_name');
    updateField('email');
    updateField('mobile_phone');
    updateField('total_years_experience');
    updateField('current_job_level');
    updateField('sponsorship_type');
    updateField('sponsorship_percent_tuition');
    updateField('has_uploaded_test_scores');
    updateField('has_uploaded_other_documents');
    updateField('current_step');
    updateField('application_status');

    currentApp.last_updated_at = this._nowIso();

    const indexInArray = apps.findIndex((a) => a.id === currentApp.id);
    if (indexInArray >= 0) {
      apps[indexInArray] = currentApp;
    } else {
      apps.push(currentApp);
    }

    this._saveToStorage('applications', apps);
    localStorage.setItem('current_application_id', currentApp.id);

    return { application: currentApp };
  }

  // 47) saveAndExitCurrentApplication()
  saveAndExitCurrentApplication() {
    const apps = this._getFromStorage('applications');
    const currentApp = this._getOrCreateCurrentApplication();

    currentApp.current_step = 'review';
    if (!currentApp.application_status || currentApp.application_status !== 'submitted') {
      currentApp.application_status = 'in_progress';
    }
    currentApp.last_updated_at = this._nowIso();

    const idx = apps.findIndex((a) => a.id === currentApp.id);
    if (idx >= 0) {
      apps[idx] = currentApp;
    } else {
      apps.push(currentApp);
    }

    this._saveToStorage('applications', apps);
    localStorage.setItem('current_application_id', currentApp.id);

    return {
      application: currentApp,
      message: 'Application saved. You can return later to complete and submit.'
    };
  }

  // 48) getAboutContentAndContactInfo()
  getAboutContentAndContactInfo() {
    const about_sections = [
      {
        title: 'About the University',
        body: 'Our university brings together world-class faculty, industry practitioners, and a global alumni network to deliver rigorous executive education.'
      },
      {
        title: 'Dual-Degree EMBA Approach',
        body: 'Dual-degree EMBA pathways integrate advanced management training with specialized expertise in fields such as data analytics, finance, and technology leadership.'
      }
    ];

    const contact_methods = [
      {
        type: 'email',
        label: 'Admissions Email',
        value: 'emba-admissions@example.edu'
      },
      {
        type: 'phone',
        label: 'Admissions Phone',
        value: '+1 (555) 010-0000'
      }
    ];

    const policies_summaries = [
      {
        policy_name: 'Non-discrimination policy',
        summary: 'The university does not discriminate on the basis of race, color, national origin, sex, disability, or age in any of its programs.'
      },
      {
        policy_name: 'Privacy policy',
        summary: 'Applicant data is used solely for admissions evaluation and communication, in accordance with applicable privacy laws.'
      }
    ];

    return { about_sections, contact_methods, policies_summaries };
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
