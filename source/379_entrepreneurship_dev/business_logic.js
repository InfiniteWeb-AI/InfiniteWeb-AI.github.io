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
      'programmes',
      'programme_cohorts',
      'programme_applications',
      'saved_programmes',
      'courses',
      'learning_plan_items',
      'events',
      'event_registrations',
      'mentors',
      'mentor_availability_slots',
      'mentor_session_bookings',
      'budget_plans',
      'budget_expense_items',
      'articles',
      'reading_list_items',
      'quizzes',
      'quiz_questions',
      'quiz_options',
      'quiz_submissions',
      'quiz_answers',
      'faq_items',
      'contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('user_context')) {
      // Will be created lazily by _getOrCreateUserContext
      localStorage.setItem('user_context', JSON.stringify(null));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
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

  // -------------------------
  // Generic helpers
  // -------------------------
  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _stringContains(haystack, needle) {
    if (!needle) return true;
    if (!haystack) return false;
    return haystack.toLowerCase().includes(needle.toLowerCase());
  }

  _arraysIntersect(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) return false;
    const setB = new Set(b.map((x) => String(x).toLowerCase()));
    return a.some((item) => setB.has(String(item).toLowerCase()));
  }

  _ensureArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  _getOrCreateUserContext() {
    let ctx = this._getFromStorage('user_context', null);
    if (!ctx) {
      ctx = {
        id: 'user_1',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      this._saveToStorage('user_context', ctx);
    }
    return ctx;
  }

  // -------------------------
  // Persistence helpers for specific domains
  // -------------------------

  _persistSavedProgramme(saveType, programmeId, cohortId, notes) {
    const programmes = this._getFromStorage('programmes');
    const cohorts = this._getFromStorage('programme_cohorts');
    const saved = this._getFromStorage('saved_programmes');

    const programme = programmes.find((p) => p.id === programmeId) || null;
    if (!programme) {
      return { saved_programme: null, success: false, message: 'Programme not found.' };
    }

    const cohort = cohortId ? cohorts.find((c) => c.id === cohortId) || null : null;

    let record = saved.find(
      (s) =>
        s.programme_id === programmeId &&
        (s.cohort_id || null) === (cohortId || null) &&
        s.save_type === saveType
    );

    const now = this._nowIso();

    if (!record) {
      record = {
        id: this._generateId('savedprog'),
        programme_id: programmeId,
        cohort_id: cohortId || null,
        save_type: saveType,
        notes: notes || '',
        saved_at: now
      };
      saved.push(record);
    } else {
      record.notes = notes || record.notes || '';
      record.saved_at = now;
    }

    this._saveToStorage('saved_programmes', saved);

    const resolved = {
      ...record,
      programme,
      cohort
    };

    return {
      saved_programme: resolved,
      success: true,
      message: 'Programme saved successfully.'
    };
  }

  _persistLearningPlanItem(courseId, source) {
    const courses = this._getFromStorage('courses');
    const planItems = this._getFromStorage('learning_plan_items');

    const course = courses.find((c) => c.id === courseId) || null;
    if (!course) {
      return { learning_plan_item: null, success: false, total_items_in_plan: planItems.length };
    }

    let item = planItems.find((i) => i.course_id === courseId);
    const now = this._nowIso();

    if (!item) {
      item = {
        id: this._generateId('lpitem'),
        course_id: courseId,
        source: source || 'manual_selection',
        added_at: now
      };
      planItems.push(item);
    } else {
      item.source = source || item.source || 'manual_selection';
      item.added_at = item.added_at || now;
    }

    this._saveToStorage('learning_plan_items', planItems);

    const resolved = {
      ...item,
      course
    };

    return {
      learning_plan_item: resolved,
      success: true,
      total_items_in_plan: planItems.length
    };
  }

  _persistEventRegistration(eventId, registrationSource, notes) {
    const events = this._getFromStorage('events');
    const regs = this._getFromStorage('event_registrations');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { registration: null, success: false, message: 'Event not found.' };
    }

    const registration = {
      id: this._generateId('eventreg'),
      event_id: eventId,
      registration_datetime: this._nowIso(),
      registration_source: registrationSource || 'event_detail',
      notes: notes || ''
    };

    regs.push(registration);
    this._saveToStorage('event_registrations', regs);

    const resolved = {
      ...registration,
      event
    };

    return {
      registration: resolved,
      success: true,
      message: 'Registered for event.'
    };
  }

  _persistMentorSessionBooking(availabilitySlot, notes) {
    const mentors = this._getFromStorage('mentors');
    const slots = this._getFromStorage('mentor_availability_slots');
    const bookings = this._getFromStorage('mentor_session_bookings');

    if (!availabilitySlot || availabilitySlot.is_booked) {
      return { booking: null, success: false, message: 'Slot is not available.' };
    }

    const slot = slots.find((s) => s.id === availabilitySlot.id);
    if (!slot || slot.is_booked) {
      return { booking: null, success: false, message: 'Slot is not available.' };
    }

    const mentor = mentors.find((m) => m.id === slot.mentor_id) || null;
    if (!mentor) {
      return { booking: null, success: false, message: 'Mentor not found.' };
    }

    const booking = {
      id: this._generateId('mbook'),
      mentor_id: slot.mentor_id,
      availability_slot_id: slot.id,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      duration_minutes: slot.duration_minutes,
      notes: notes || '',
      status: 'booked',
      created_at: this._nowIso()
    };

    bookings.push(booking);

    // Mark slot as booked
    slot.is_booked = true;

    this._saveToStorage('mentor_session_bookings', bookings);
    this._saveToStorage('mentor_availability_slots', slots);

    const resolved = {
      ...booking,
      mentor,
      availability_slot: slot
    };

    return {
      booking: resolved,
      success: true,
      message: 'Mentor session booked.'
    };
  }

  _persistBudgetPlanWithExpenses(name, viewMode, expenses) {
    const plans = this._getFromStorage('budget_plans');
    let items = this._getFromStorage('budget_expense_items');

    const normalizedExpenses = this._ensureArray(expenses).filter((e) => e && typeof e.monthlyAmount === 'number');

    const totalMonthly = normalizedExpenses.reduce((sum, e) => sum + (e.monthlyAmount || 0), 0);
    const totalYearly = totalMonthly * 12;

    // Deactivate existing plans
    plans.forEach((p) => {
      p.is_active = false;
    });

    const plan = {
      id: this._generateId('budget'),
      name: name || 'My Budget Plan',
      view_mode: viewMode === 'yearly' ? 'yearly' : 'monthly',
      total_monthly_amount: totalMonthly,
      total_yearly_amount: totalYearly,
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      is_active: true
    };

    plans.push(plan);

    // Remove expense items for this plan id (none yet), keep others
    items = items.filter((i) => i.budget_plan_id !== plan.id);

    const newItems = normalizedExpenses.map((e, index) => ({
      id: this._generateId('bexp'),
      budget_plan_id: plan.id,
      name: e.name || '',
      monthly_amount: e.monthlyAmount || 0,
      yearly_amount: (e.monthlyAmount || 0) * 12,
      order_index: index
    }));

    items = items.concat(newItems);

    this._saveToStorage('budget_plans', plans);
    this._saveToStorage('budget_expense_items', items);

    const resolvedItems = newItems.map((it) => ({
      ...it,
      budget_plan: plan
    }));

    return {
      budget_plan: plan,
      expense_items: resolvedItems,
      success: true,
      message: 'Budget plan saved.'
    };
  }

  _persistReadingListItem(articleId, source) {
    const articles = this._getFromStorage('articles');
    const list = this._getFromStorage('reading_list_items');

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { reading_list_item: null, success: false, total_items_in_reading_list: list.length };
    }

    let item = list.find((i) => i.article_id === articleId);
    const now = this._nowIso();

    if (!item) {
      item = {
        id: this._generateId('rlist'),
        article_id: articleId,
        source: source || 'manual_bookmark',
        added_at: now
      };
      list.push(item);
    } else {
      item.source = source || item.source || 'manual_bookmark';
      item.added_at = item.added_at || now;
    }

    this._saveToStorage('reading_list_items', list);

    const resolved = {
      ...item,
      article
    };

    return {
      reading_list_item: resolved,
      success: true,
      total_items_in_reading_list: list.length
    };
  }

  _generateQuizRecommendations(quizId, answers) {
    // answers: [{questionId, selectedOptionIds}]
    const quizzes = this._getFromStorage('quizzes');
    const questions = this._getFromStorage('quiz_questions');
    const options = this._getFromStorage('quiz_options');
    const courses = this._getFromStorage('courses');
    const programmes = this._getFromStorage('programmes');

    const quiz = quizzes.find((q) => q.id === quizId) || null;

    const selectedOptionIds = [];
    (answers || []).forEach((ans) => {
      this._ensureArray(ans.selectedOptionIds).forEach((oid) => {
        if (oid) selectedOptionIds.push(oid);
      });
    });

    const selectedOptions = options.filter((o) => selectedOptionIds.includes(o.id));
    const selectedValues = selectedOptions.map((o) => o.value || '');

    let preferBeginner = false;
    let maxDuration = null;
    let ideaValidationFocus = false;

    selectedValues.forEach((val) => {
      if (val.includes('idea_stage')) {
        preferBeginner = true;
      }
      if (val.includes('5_10_hours')) {
        maxDuration = 10;
      }
      if (val.includes('validate_idea') || val.includes('product_market_fit')) {
        ideaValidationFocus = true;
      }
    });

    let filteredCourses = courses.filter((c) => c.status === 'active');

    if (preferBeginner) {
      filteredCourses = filteredCourses.filter(
        (c) => !c.level || c.level === 'beginner' || c.level === 'all_levels'
      );
    }

    if (typeof maxDuration === 'number') {
      filteredCourses = filteredCourses.filter((c) => typeof c.duration_hours === 'number' && c.duration_hours <= maxDuration);
    }

    if (ideaValidationFocus) {
      // give preference to validation-related topics / titles
      const validationCourses = filteredCourses.filter(
        (c) =>
          this._stringContains(c.topic || '', 'validation') ||
          this._stringContains(c.title || '', 'validation') ||
          this._stringContains(c.title || '', 'mvp')
      );
      if (validationCourses.length) {
        filteredCourses = validationCourses;
      }
    }

    if (!filteredCourses.length) {
      filteredCourses = courses.filter((c) => c.status === 'active');
    }

    // Simple sort: highest rating first, then shortest duration
    filteredCourses.sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      const da = typeof a.duration_hours === 'number' ? a.duration_hours : Number.MAX_SAFE_INTEGER;
      const db = typeof b.duration_hours === 'number' ? b.duration_hours : Number.MAX_SAFE_INTEGER;
      return da - db;
    });

    const recommendedCourseIds = filteredCourses.slice(0, 5).map((c) => c.id);

    // Programmes: prefer beginner-level incubators/accelerators
    let filteredProgrammes = programmes.filter((p) => p.status === 'active');
    if (preferBeginner) {
      filteredProgrammes = filteredProgrammes.filter(
        (p) => !p.level || p.level === 'beginner' || p.level === 'all_levels'
      );
    }
    const recommendedProgrammeIds = filteredProgrammes.slice(0, 5).map((p) => p.id);

    const resultSummary = quiz
      ? `Quiz "${quiz.title}" completed. Recommended ${recommendedCourseIds.length} courses and ${recommendedProgrammeIds.length} programmes.`
      : `Quiz completed. Recommended ${recommendedCourseIds.length} courses.`;

    return {
      resultSummary,
      recommendedCourseIds,
      recommendedProgrammeIds
    };
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // 1. getHomepageFeaturedContent()
  getHomepageFeaturedContent() {
    const programmes = this._getFromStorage('programmes');
    const cohorts = this._getFromStorage('programme_cohorts');
    const courses = this._getFromStorage('courses');
    const events = this._getFromStorage('events');
    const mentors = this._getFromStorage('mentors');
    const now = new Date();

    // Featured programmes: beginner/all_levels, active
    const activeProgrammes = programmes.filter((p) => p.status === 'active');
    const beginnerProgrammes = activeProgrammes.filter(
      (p) => p.level === 'beginner' || p.level === 'all_levels'
    );

    const featuredProgrammes = beginnerProgrammes
      .map((p) => {
        const progCohorts = cohorts.filter((c) => c.programme_id === p.id && c.status === 'upcoming');
        const next = progCohorts
          .filter((c) => {
            const sd = this._parseDate(c.start_date);
            return sd && sd >= now;
          })
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

        const categoryLabelMap = {
          incubator_programmes: 'Incubator',
          accelerator_programmes: 'Accelerator',
          funding_tracks: 'Funding Track'
        };

        return {
          programme_id: p.id,
          name: p.name,
          short_title: p.short_title || p.name,
          programme_category: p.programme_category,
          level: p.level,
          format: p.format,
          schedule: p.schedule,
          duration_weeks: p.duration_weeks,
          price_usd: p.price_usd,
          currency: p.currency,
          location: p.location || '',
          funding_type: p.funding_type || 'none',
          funding_amount_usd: p.funding_amount_usd || 0,
          equity_percentage: typeof p.equity_percentage === 'number' ? p.equity_percentage : 0,
          rating: typeof p.rating === 'number' ? p.rating : null,
          rating_count: typeof p.rating_count === 'number' ? p.rating_count : 0,
          next_cohort_start_date: next ? next.start_date : null,
          category_label: categoryLabelMap[p.programme_category] || ''
        };
      })
      .sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      })
      .slice(0, 10);

    const featuredCourses = courses
      .filter((c) => c.status === 'active')
      .sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      })
      .slice(0, 10)
      .map((c) => ({
        course_id: c.id,
        title: c.title,
        topic: c.topic || '',
        level: c.level || 'all_levels',
        format: c.format,
        duration_hours: c.duration_hours,
        rating: typeof c.rating === 'number' ? c.rating : null,
        rating_count: typeof c.rating_count === 'number' ? c.rating_count : 0
      }));

    const featuredEvents = events
      .filter((e) => e.status === 'scheduled')
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 10)
      .map((e) => ({
        event_id: e.id,
        title: e.title,
        event_type: e.event_type,
        format: e.format,
        start_datetime: e.start_datetime,
        duration_minutes: e.duration_minutes || null,
        price_usd: e.price_usd,
        is_free: !!e.is_free,
        location: e.location || ''
      }));

    const featuredMentors = mentors
      .filter((m) => m.status === 'active')
      .sort((a, b) => {
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        return rb - ra;
      })
      .slice(0, 10)
      .map((m) => ({
        mentor_id: m.id,
        full_name: m.full_name,
        primary_industry: m.primary_industry || (this._ensureArray(m.industries)[0] || ''),
        industries: this._ensureArray(m.industries),
        years_experience: m.years_experience,
        rating: typeof m.rating === 'number' ? m.rating : null,
        rating_count: typeof m.rating_count === 'number' ? m.rating_count : 0,
        hourly_rate_usd: m.hourly_rate_usd,
        location: m.location || ''
      }));

    return {
      featured_programmes: featuredProgrammes,
      featured_courses: featuredCourses,
      featured_events: featuredEvents,
      featured_mentors: featuredMentors
    };
  }

  // 2. globalSearch(query, scope = 'all', limitPerType = 5)
  globalSearch(query, scope, limitPerType) {
    const q = (query || '').trim();
    const effectiveScope = scope || 'all';
    const limit = typeof limitPerType === 'number' ? limitPerType : 5;

    const programmes = this._getFromStorage('programmes');
    const courses = this._getFromStorage('courses');
    const events = this._getFromStorage('events');
    const mentors = this._getFromStorage('mentors');
    const articles = this._getFromStorage('articles');

    const matchesScope = (type) => effectiveScope === 'all' || effectiveScope === type;

    let programmesResult = [];
    if (matchesScope('programmes')) {
      programmesResult = programmes
        .filter((p) =>
          this._stringContains(p.name, q) ||
          this._stringContains(p.description || '', q) ||
          this._arraysIntersect(this._ensureArray(p.tags), [q])
        )
        .slice(0, limit);
    }

    let coursesResult = [];
    if (matchesScope('courses')) {
      coursesResult = courses
        .filter((c) =>
          this._stringContains(c.title, q) ||
          this._stringContains(c.description || '', q) ||
          this._stringContains(c.topic || '', q)
        )
        .slice(0, limit);
    }

    let eventsResult = [];
    if (matchesScope('events')) {
      eventsResult = events
        .filter((e) =>
          this._stringContains(e.title, q) ||
          this._stringContains(e.description || '', q) ||
          this._stringContains(e.location || '', q)
        )
        .slice(0, limit);
    }

    let mentorsResult = [];
    if (matchesScope('mentors')) {
      mentorsResult = mentors
        .filter((m) => {
          const industries = this._ensureArray(m.industries).join(' ');
          return (
            this._stringContains(m.full_name, q) ||
            this._stringContains(m.primary_industry || '', q) ||
            this._stringContains(industries, q)
          );
        })
        .slice(0, limit);
    }

    let articlesResult = [];
    if (matchesScope('articles')) {
      articlesResult = articles
        .filter((a) =>
          this._stringContains(a.title, q) ||
          this._stringContains(a.summary || '', q) ||
          this._stringContains(a.content || '', q)
        )
        .slice(0, limit);
    }

    return {
      programmes: programmesResult,
      courses: coursesResult,
      events: eventsResult,
      mentors: mentorsResult,
      articles: articlesResult
    };
  }

  // 3. getProgrammeFilterOptions()
  getProgrammeFilterOptions() {
    return {
      levels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All levels' }
      ],
      formats: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      schedules: [
        { value: 'morning', label: 'Morning' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening', label: 'Evening' },
        { value: 'full_day', label: 'Full day' },
        { value: 'self_paced', label: 'Self-paced' },
        { value: 'flexible', label: 'Flexible' }
      ],
      programme_categories: [
        { value: 'incubator_programmes', label: 'Incubator Programmes' },
        { value: 'accelerator_programmes', label: 'Accelerator Programmes' },
        { value: 'funding_tracks', label: 'Funding Tracks' }
      ],
      funding_types: [
        { value: 'none', label: 'No funding' },
        { value: 'equity_free_grant', label: 'Equity-free grant' },
        { value: 'equity_investment', label: 'Equity investment' }
      ],
      duration_presets_weeks: [
        { value: 4, label: '4 weeks' },
        { value: 6, label: '6 weeks' },
        { value: 8, label: '8 weeks' },
        { value: 10, label: '10 weeks' },
        { value: 12, label: '12 weeks' }
      ],
      price_ranges_usd: [
        { min: 0, max: 500, label: 'Up to $500' },
        { min: 0, max: 1000, label: 'Up to $1,000' },
        { min: 0, max: 5000, label: 'Up to $5,000' }
      ],
      sort_options: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'start_date_soonest', label: 'Start Date: Soonest' }
      ]
    };
  }

  // 4. searchProgrammes(query, filters, sortBy = 'relevance', page = 1, pageSize = 20)
  searchProgrammes(query, filters, sortBy, page, pageSize) {
    const programmes = this._getFromStorage('programmes');
    const cohorts = this._getFromStorage('programme_cohorts');
    const saved = this._getFromStorage('saved_programmes');

    const q = (query || '').trim();
    const f = filters || {};
    const sort = sortBy || 'relevance';
    const currentPage = page || 1;
    const size = pageSize || 20;
    const now = new Date();

    const onlyWithUpcomingCohorts = f.onlyWithUpcomingCohorts !== false;

    let filteredProgrammes = programmes.filter((p) => p.status === 'active');

    if (q) {
      filteredProgrammes = filteredProgrammes.filter(
        (p) =>
          this._stringContains(p.name, q) ||
          this._stringContains(p.description || '', q) ||
          this._arraysIntersect(this._ensureArray(p.tags), [q])
      );
    }

    if (f.level) {
      filteredProgrammes = filteredProgrammes.filter((p) => p.level === f.level);
    }

    if (f.programmeCategory) {
      filteredProgrammes = filteredProgrammes.filter(
        (p) => p.programme_category === f.programmeCategory
      );
    }

    if (typeof f.exactDurationWeeks === 'number') {
      filteredProgrammes = filteredProgrammes.filter(
        (p) => p.duration_weeks === f.exactDurationWeeks
      );
    } else {
      if (typeof f.minDurationWeeks === 'number') {
        filteredProgrammes = filteredProgrammes.filter(
          (p) => p.duration_weeks >= f.minDurationWeeks
        );
      }
      if (typeof f.maxDurationWeeks === 'number') {
        filteredProgrammes = filteredProgrammes.filter(
          (p) => p.duration_weeks <= f.maxDurationWeeks
        );
      }
    }

    if (f.fundingType) {
      filteredProgrammes = filteredProgrammes.filter(
        (p) => (p.funding_type || 'none') === f.fundingType
      );
    }

    if (Array.isArray(f.tags) && f.tags.length) {
      filteredProgrammes = filteredProgrammes.filter((p) => {
        const ptags = this._ensureArray(p.tags).map((t) => String(t).toLowerCase());
        return f.tags.every((tag) => ptags.includes(String(tag).toLowerCase()));
      });
    }

    const startFrom = f.startDateFrom ? new Date(f.startDateFrom) : null;
    const startTo = f.startDateTo ? new Date(f.startDateTo) : null;

    const minPrice = typeof f.minPriceUsd === 'number' ? f.minPriceUsd : null;
    const maxPrice = typeof f.maxPriceUsd === 'number' ? f.maxPriceUsd : null;

    const results = [];

    filteredProgrammes.forEach((p) => {
      const progCohorts = cohorts.filter((c) => c.programme_id === p.id);

      let candidateCohorts = progCohorts;

      if (onlyWithUpcomingCohorts) {
        candidateCohorts = candidateCohorts.filter((c) => c.status === 'upcoming');
      }

      if (startFrom) {
        candidateCohorts = candidateCohorts.filter((c) => {
          const sd = this._parseDate(c.start_date);
          return sd && sd >= startFrom;
        });
      }

      if (startTo) {
        candidateCohorts = candidateCohorts.filter((c) => {
          const sd = this._parseDate(c.start_date);
          return sd && sd <= startTo;
        });
      }

      if (f.schedule) {
        candidateCohorts = candidateCohorts.filter((c) => {
          const s = c.schedule || p.schedule;
          return s === f.schedule;
        });
      }

      if (f.format) {
        candidateCohorts = candidateCohorts.filter((c) => {
          const fmt = c.format || p.format;
          return fmt === f.format;
        });
      }

      if (minPrice !== null || maxPrice !== null) {
        candidateCohorts = candidateCohorts.filter((c) => {
          const tuition = typeof c.tuition_usd === 'number' ? c.tuition_usd : p.price_usd;
          if (minPrice !== null && tuition < minPrice) return false;
          if (maxPrice !== null && tuition > maxPrice) return false;
          return true;
        });
      }

      let nextCohort = null;
      let displayPrice = p.price_usd;

      if (candidateCohorts.length) {
        nextCohort = candidateCohorts
          .filter((c) => {
            const sd = this._parseDate(c.start_date);
            return !sd || sd >= now;
          })
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

        if (!nextCohort && candidateCohorts.length) {
          nextCohort = candidateCohorts[0];
        }

        if (nextCohort) {
          displayPrice = typeof nextCohort.tuition_usd === 'number'
            ? nextCohort.tuition_usd
            : p.price_usd;
        }
      } else if (onlyWithUpcomingCohorts) {
        // No cohorts matching filters, skip programme
        return;
      } else {
        // No cohorts required, use programme-level filters for format/schedule if provided
        if (f.format && p.format !== f.format) return;
        if (f.schedule && p.schedule !== f.schedule) return;
        if (minPrice !== null && p.price_usd < minPrice) return;
        if (maxPrice !== null && p.price_usd > maxPrice) return;
      }

      const isSavedShortlist = saved.some(
        (s) => s.programme_id === p.id && s.save_type === 'programme_shortlist'
      );
      const isSavedFundingInterest = saved.some(
        (s) => s.programme_id === p.id && s.save_type === 'funding_interest'
      );

      results.push({
        programme: p,
        next_cohort: nextCohort,
        display_price_usd: displayPrice,
        is_saved_to_shortlist: isSavedShortlist,
        is_saved_to_funding_interest: isSavedFundingInterest
      });
    });

    // Sort
    if (sort === 'price_low_to_high') {
      results.sort((a, b) => {
        const pa = typeof a.display_price_usd === 'number' ? a.display_price_usd : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.display_price_usd === 'number' ? b.display_price_usd : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });
    } else if (sort === 'price_high_to_low') {
      results.sort((a, b) => {
        const pa = typeof a.display_price_usd === 'number' ? a.display_price_usd : 0;
        const pb = typeof b.display_price_usd === 'number' ? b.display_price_usd : 0;
        return pb - pa;
      });
    } else if (sort === 'start_date_soonest') {
      results.sort((a, b) => {
        const da = a.next_cohort ? new Date(a.next_cohort.start_date) : new Date('9999-12-31');
        const db = b.next_cohort ? new Date(b.next_cohort.start_date) : new Date('9999-12-31');
        return da - db;
      });
    }

    const totalCount = results.length;
    const startIndex = (currentPage - 1) * size;
    const pagedItems = results.slice(startIndex, startIndex + size);

    return {
      totalCount,
      page: currentPage,
      pageSize: size,
      items: pagedItems
    };
  }

  // 5. getProgrammeDetail(programmeId)
  getProgrammeDetail(programmeId) {
    const programmes = this._getFromStorage('programmes');
    const cohorts = this._getFromStorage('programme_cohorts');
    const saved = this._getFromStorage('saved_programmes');

    const programme = programmes.find((p) => p.id === programmeId) || null;
    if (!programme) {
      return {
        programme: null,
        cohorts: [],
        is_saved_to_shortlist: false,
        is_saved_to_funding_interest: false,
        category_label: null
      };
    }

    const progCohorts = cohorts
      .filter((c) => c.programme_id === programmeId)
      .sort((a, b) => {
        const da = this._parseDate(a.start_date);
        const db = this._parseDate(b.start_date);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da - db;
      })
      .map((c) => ({
        ...c,
        programme
      })); // FK resolution

    const isSavedShortlist = saved.some(
      (s) => s.programme_id === programmeId && s.save_type === 'programme_shortlist'
    );
    const isSavedFundingInterest = saved.some(
      (s) => s.programme_id === programmeId && s.save_type === 'funding_interest'
    );

    const categoryLabelMap = {
      incubator_programmes: 'Incubator',
      accelerator_programmes: 'Accelerator',
      funding_tracks: 'Funding Track'
    };

    // Instrumentation for task completion tracking (task_8: task8_comparedTrackIds)
    try {
      if (programme.programme_category === 'funding_tracks') {
        const existingRaw = localStorage.getItem('task8_comparedTrackIds');
        let existing = null;
        if (existingRaw) {
          try {
            existing = JSON.parse(existingRaw);
          } catch (e) {
            existing = null;
          }
        }

        const current = {
          equity_free_grant_id:
            existing && typeof existing === 'object' && 'equity_free_grant_id' in existing
              ? existing.equity_free_grant_id
              : null,
          equity_investment_id:
            existing && typeof existing === 'object' && 'equity_investment_id' in existing
              ? existing.equity_investment_id
              : null
        };

        let updated = { ...current };
        const fundingType = programme.funding_type;

        if (fundingType === 'equity_free_grant' && !updated.equity_free_grant_id) {
          updated = { ...updated, equity_free_grant_id: programme.id };
        } else if (fundingType === 'equity_investment' && !updated.equity_investment_id) {
          updated = { ...updated, equity_investment_id: programme.id };
        }

        localStorage.setItem('task8_comparedTrackIds', JSON.stringify(updated));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (task8_comparedTrackIds):', e);
      } catch (e2) {}
    }

    return {
      programme,
      cohorts: progCohorts,
      is_saved_to_shortlist: isSavedShortlist,
      is_saved_to_funding_interest: isSavedFundingInterest,
      category_label: categoryLabelMap[programme.programme_category] || null
    };
  }

  // 6. saveProgrammeToShortlist(programmeId, cohortId, notes)
  saveProgrammeToShortlist(programmeId, cohortId, notes) {
    return this._persistSavedProgramme('programme_shortlist', programmeId, cohortId, notes);
  }

  // 7. saveFundingTrackToInterestList(programmeId, notes)
  saveFundingTrackToInterestList(programmeId, notes) {
    return this._persistSavedProgramme('funding_interest', programmeId, null, notes);
  }

  // 8. getRelatedProgrammes(programmeId, limit = 4)
  getRelatedProgrammes(programmeId, limit) {
    const programmes = this._getFromStorage('programmes');
    const programme = programmes.find((p) => p.id === programmeId) || null;
    if (!programme) return [];

    const max = typeof limit === 'number' ? limit : 4;

    const others = programmes.filter((p) => p.id !== programmeId && p.status === 'active');

    others.sort((a, b) => {
      // Prefer same category, then level, then rating
      const sameCategoryA = a.programme_category === programme.programme_category ? 1 : 0;
      const sameCategoryB = b.programme_category === programme.programme_category ? 1 : 0;
      if (sameCategoryB !== sameCategoryA) return sameCategoryB - sameCategoryA;

      const sameLevelA = a.level === programme.level ? 1 : 0;
      const sameLevelB = b.level === programme.level ? 1 : 0;
      if (sameLevelB !== sameLevelA) return sameLevelB - sameLevelA;

      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      return rb - ra;
    });

    return others.slice(0, max);
  }

  // 9. getProgrammeApplicationContext(programmeId, cohortId)
  getProgrammeApplicationContext(programmeId, cohortId) {
    const programmes = this._getFromStorage('programmes');
    const cohorts = this._getFromStorage('programme_cohorts');

    const programme = programmes.find((p) => p.id === programmeId) || null;
    if (!programme) {
      return { programme: null, cohort: null, form_fields: [] };
    }

    let cohort = null;
    if (cohortId) {
      cohort = cohorts.find((c) => c.id === cohortId && c.programme_id === programmeId) || null;
    } else {
      const now = new Date();
      const progCohorts = cohorts
        .filter((c) => c.programme_id === programmeId && c.status === 'upcoming')
        .filter((c) => {
          const sd = this._parseDate(c.start_date);
          return !sd || sd >= now;
        })
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      cohort = progCohorts[0] || null;
    }

    const formFields = [
      {
        name: 'full_name',
        label: 'Full name',
        type: 'text',
        required: true
      },
      {
        name: 'email',
        label: 'Email address',
        type: 'email',
        required: true
      },
      {
        name: 'business_stage_description',
        label: 'Business stage / description',
        type: 'text',
        required: true
      },
      {
        name: 'monthly_revenue_range',
        label: 'Current monthly revenue',
        type: 'select',
        required: true,
        options: [
          { value: 'less_than_1000', label: 'Less than $1,000' },
          { value: 'between_1000_5000', label: '$1,000 - $5,000' },
          { value: 'between_5000_10000', label: '$5,000 - $10,000' },
          { value: 'more_than_10000', label: 'More than $10,000' }
        ]
      }
    ];

    return {
      programme,
      cohort: cohort ? { ...cohort, programme } : null,
      form_fields: formFields
    };
  }

  // 10. submitProgrammeApplication(...)
  submitProgrammeApplication(
    programmeId,
    cohortId,
    applicantFullName,
    applicantEmail,
    businessStageDescription,
    monthlyRevenueRange
  ) {
    const programmes = this._getFromStorage('programmes');
    const cohorts = this._getFromStorage('programme_cohorts');
    const applications = this._getFromStorage('programme_applications');

    const programme = programmes.find((p) => p.id === programmeId) || null;
    const cohort = cohorts.find((c) => c.id === cohortId && c.programme_id === programmeId) || null;

    if (!programme || !cohort) {
      return {
        application: null,
        success: false,
        message: 'Programme or cohort not found.'
      };
    }

    const allowedRanges = [
      'less_than_1000',
      'between_1000_5000',
      'between_5000_10000',
      'more_than_10000'
    ];

    if (!allowedRanges.includes(monthlyRevenueRange)) {
      return {
        application: null,
        success: false,
        message: 'Invalid monthly revenue range.'
      };
    }

    const application = {
      id: this._generateId('papp'),
      programme_id: programmeId,
      cohort_id: cohortId,
      applicant_full_name: applicantFullName,
      applicant_email: applicantEmail,
      business_stage_description: businessStageDescription,
      monthly_revenue_range: monthlyRevenueRange,
      status: 'submitted',
      submitted_at: this._nowIso()
    };

    applications.push(application);
    this._saveToStorage('programme_applications', applications);

    const resolved = {
      ...application,
      programme,
      cohort
    };

    return {
      application: resolved,
      success: true,
      message: 'Application submitted.'
    };
  }

  // 11. getCourseFilterOptions()
  getCourseFilterOptions() {
    const courses = this._getFromStorage('courses');

    const topicsSet = new Set();
    courses.forEach((c) => {
      if (c.topic) topicsSet.add(c.topic);
    });

    return {
      rating_thresholds: [
        { min_rating: 3.0, label: '3.0+' },
        { min_rating: 3.5, label: '3.5+' },
        { min_rating: 4.0, label: '4.0+' },
        { min_rating: 4.5, label: '4.5+' }
      ],
      duration_presets_hours: [
        { max_duration_hours: 2, label: 'Up to 2 hours' },
        { max_duration_hours: 5, label: 'Up to 5 hours' },
        { max_duration_hours: 10, label: 'Up to 10 hours' }
      ],
      topics: Array.from(topicsSet),
      formats: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      levels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All levels' }
      ],
      sort_options: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'duration_low_to_high', label: 'Duration: Short to Long' }
      ]
    };
  }

  // 12. searchCourses(query, filters, sortBy = 'relevance', page = 1, pageSize = 20)
  searchCourses(query, filters, sortBy, page, pageSize) {
    const courses = this._getFromStorage('courses');
    const planItems = this._getFromStorage('learning_plan_items');

    const q = (query || '').trim();
    const f = filters || {};
    const sort = sortBy || 'relevance';
    const currentPage = page || 1;
    const size = pageSize || 20;

    let filtered = courses.slice();

    const statusFilter = f.status || 'active';
    filtered = filtered.filter((c) => c.status === statusFilter);

    if (q) {
      filtered = filtered.filter(
        (c) =>
          this._stringContains(c.title, q) ||
          this._stringContains(c.description || '', q) ||
          this._stringContains(c.topic || '', q)
      );
    }

    if (typeof f.minRating === 'number') {
      filtered = filtered.filter((c) => {
        const rating = typeof c.rating === 'number' ? c.rating : 0;
        return rating >= f.minRating;
      });
    }

    if (typeof f.maxDurationHours === 'number') {
      filtered = filtered.filter(
        (c) => typeof c.duration_hours === 'number' && c.duration_hours <= f.maxDurationHours
      );
    }

    if (f.topic) {
      filtered = filtered.filter((c) => String(c.topic || '').toLowerCase() === String(f.topic).toLowerCase());
    }

    if (f.format) {
      filtered = filtered.filter((c) => c.format === f.format);
    }

    if (f.level) {
      filtered = filtered.filter((c) => c.level === f.level);
    }

    if (sort === 'rating_high_to_low') {
      filtered.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      });
    } else if (sort === 'duration_low_to_high') {
      filtered.sort((a, b) => {
        const da = typeof a.duration_hours === 'number' ? a.duration_hours : Number.MAX_SAFE_INTEGER;
        const db = typeof b.duration_hours === 'number' ? b.duration_hours : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    }

    const totalCount = filtered.length;
    const startIndex = (currentPage - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const items = pageItems.map((course) => {
      const isInPlan = planItems.some((i) => i.course_id === course.id);
      let durationLabel = '';
      if (typeof course.duration_hours === 'number') {
        durationLabel = `${course.duration_hours} hours`;
      }
      return {
        course,
        duration_label: durationLabel,
        is_in_learning_plan: isInPlan
      };
    });

    return {
      totalCount,
      page: currentPage,
      pageSize: size,
      items
    };
  }

  // 13. getCourseDetail(courseId)
  getCourseDetail(courseId) {
    const courses = this._getFromStorage('courses');
    const planItems = this._getFromStorage('learning_plan_items');

    const course = courses.find((c) => c.id === courseId) || null;
    if (!course) {
      return { course: null, is_in_learning_plan: false, related_courses: [] };
    }

    const isInPlan = planItems.some((i) => i.course_id === courseId);

    const related = courses
      .filter((c) => c.id !== courseId && c.status === 'active')
      .filter((c) => c.topic === course.topic || c.level === course.level)
      .slice(0, 5);

    return {
      course,
      is_in_learning_plan: isInPlan,
      related_courses: related
    };
  }

  // 14. addCourseToLearningPlan(courseId, source = 'manual_selection')
  addCourseToLearningPlan(courseId, source) {
    return this._persistLearningPlanItem(courseId, source || 'manual_selection');
  }

  // 15. getEventFilterOptions()
  getEventFilterOptions() {
    return {
      event_types: [
        { value: 'webinar', label: 'Webinar' },
        { value: 'workshop', label: 'Workshop' }
      ],
      formats: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      price_options: [
        { type: 'free', label: 'Free' },
        { type: 'paid', label: 'Paid' }
      ],
      date_range_presets: [
        { value: 'next_7_days', label: 'Next 7 days' },
        { value: 'next_30_days', label: 'Next 30 days' }
      ],
      sort_options: [
        { value: 'start_date_soonest', label: 'Start date: Soonest' },
        { value: 'price_low_to_high', label: 'Price: Low to High' }
      ]
    };
  }

  // 16. searchEvents(filters, sortBy = 'start_date_soonest', page = 1, pageSize = 20)
  searchEvents(filters, sortBy, page, pageSize) {
    const events = this._getFromStorage('events');
    const regs = this._getFromStorage('event_registrations');

    const f = filters || {};
    const sort = sortBy || 'start_date_soonest';
    const currentPage = page || 1;
    const size = pageSize || 20;

    let filtered = events.slice();

    const statusFilter = f.status || 'scheduled';
    filtered = filtered.filter((e) => e.status === statusFilter);

    if (f.eventType) {
      filtered = filtered.filter((e) => e.event_type === f.eventType);
    }

    if (typeof f.isFree === 'boolean') {
      filtered = filtered.filter((e) => !!e.is_free === f.isFree);
    }

    if (typeof f.minPriceUsd === 'number') {
      filtered = filtered.filter((e) => e.price_usd >= f.minPriceUsd);
    }

    if (typeof f.maxPriceUsd === 'number') {
      filtered = filtered.filter((e) => e.price_usd <= f.maxPriceUsd);
    }

    const startFrom = f.startDateFrom ? new Date(f.startDateFrom) : null;
    const startTo = f.startDateTo ? new Date(f.startDateTo) : null;

    if (startFrom) {
      filtered = filtered.filter((e) => new Date(e.start_datetime) >= startFrom);
    }

    if (startTo) {
      filtered = filtered.filter((e) => new Date(e.start_datetime) <= startTo);
    }

    if (f.format) {
      filtered = filtered.filter((e) => e.format === f.format);
    }

    if (sort === 'price_low_to_high') {
      filtered.sort((a, b) => a.price_usd - b.price_usd);
    } else {
      // start_date_soonest
      filtered.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }

    const totalCount = filtered.length;
    const startIndex = (currentPage - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const items = pageItems.map((event) => {
      const isRegistered = regs.some((r) => r.event_id === event.id);
      return { event, is_registered: isRegistered };
    });

    return {
      totalCount,
      page: currentPage,
      pageSize: size,
      items
    };
  }

  // 17. getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const regs = this._getFromStorage('event_registrations');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { event: null, is_registered: false };
    }

    const isRegistered = regs.some((r) => r.event_id === eventId);

    return {
      event,
      is_registered: isRegistered
    };
  }

  // 18. registerForEvent(eventId, registrationSource, notes)
  registerForEvent(eventId, registrationSource, notes) {
    return this._persistEventRegistration(eventId, registrationSource, notes);
  }

  // 19. getMentorFilterOptions()
  getMentorFilterOptions() {
    const mentors = this._getFromStorage('mentors');

    const industriesSet = new Set();
    mentors.forEach((m) => {
      this._ensureArray(m.industries).forEach((ind) => industriesSet.add(ind));
    });

    return {
      industries: Array.from(industriesSet),
      experience_options_years: [1, 3, 5, 10],
      rating_thresholds: [3, 4, 4.5],
      price_ranges_usd: [
        { min: 0, max: 50, label: 'Up to $50/hr' },
        { min: 0, max: 100, label: 'Up to $100/hr' },
        { min: 0, max: 200, label: 'Up to $200/hr' }
      ],
      sort_options: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'experience_high_to_low', label: 'Experience: High to Low' }
      ]
    };
  }

  // 20. searchMentors(filters, sortBy = 'price_low_to_high', page = 1, pageSize = 20)
  searchMentors(filters, sortBy, page, pageSize) {
    const mentors = this._getFromStorage('mentors');

    const f = filters || {};
    const sort = sortBy || 'price_low_to_high';
    const currentPage = page || 1;
    const size = pageSize || 20;

    let filtered = mentors.slice();

    const statusFilter = f.status || 'active';
    filtered = filtered.filter((m) => m.status === statusFilter);

    if (f.industry) {
      const target = String(f.industry).toLowerCase();
      filtered = filtered.filter((m) => {
        const industries = this._ensureArray(m.industries).map((i) => String(i).toLowerCase());
        const primary = String(m.primary_industry || '').toLowerCase();
        return industries.includes(target) || primary === target;
      });
    }

    if (typeof f.minYearsExperience === 'number') {
      filtered = filtered.filter((m) => m.years_experience >= f.minYearsExperience);
    }

    if (typeof f.minRating === 'number') {
      filtered = filtered.filter((m) => {
        const rating = typeof m.rating === 'number' ? m.rating : 0;
        return rating >= f.minRating;
      });
    }

    if (typeof f.minHourlyRateUsd === 'number') {
      filtered = filtered.filter((m) => m.hourly_rate_usd >= f.minHourlyRateUsd);
    }

    if (typeof f.maxHourlyRateUsd === 'number') {
      filtered = filtered.filter((m) => m.hourly_rate_usd <= f.maxHourlyRateUsd);
    }

    if (sort === 'rating_high_to_low') {
      filtered.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      });
    } else if (sort === 'experience_high_to_low') {
      filtered.sort((a, b) => b.years_experience - a.years_experience);
    } else {
      // price_low_to_high
      filtered.sort((a, b) => a.hourly_rate_usd - b.hourly_rate_usd);
    }

    const totalCount = filtered.length;
    const startIndex = (currentPage - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    return {
      totalCount,
      page: currentPage,
      pageSize: size,
      items: pageItems
    };
  }

  // 21. getMentorDetail(mentorId)
  getMentorDetail(mentorId) {
    const mentors = this._getFromStorage('mentors');
    const slots = this._getFromStorage('mentor_availability_slots');

    const mentor = mentors.find((m) => m.id === mentorId) || null;
    if (!mentor) {
      return { mentor: null, upcoming_availability_slots: [] };
    }

    const now = new Date();
    const upcomingSlots = slots
      .filter((s) => s.mentor_id === mentorId && !s.is_booked)
      .filter((s) => new Date(s.start_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    return {
      mentor,
      upcoming_availability_slots: upcomingSlots
    };
  }

  // 22. getMentorAvailability(mentorId, startDate, endDate)
  getMentorAvailability(mentorId, startDate, endDate) {
    const slots = this._getFromStorage('mentor_availability_slots');

    const start = new Date(startDate);
    const end = new Date(endDate);

    return slots.filter((s) => {
      if (s.mentor_id !== mentorId) return false;
      if (s.is_booked) return false;
      const sd = new Date(s.start_datetime);
      return sd >= start && sd <= end;
    });
  }

  // 23. bookMentorSession(availabilitySlotId, notes)
  bookMentorSession(availabilitySlotId, notes) {
    const slots = this._getFromStorage('mentor_availability_slots');
    const slot = slots.find((s) => s.id === availabilitySlotId) || null;
    return this._persistMentorSessionBooking(slot, notes);
  }

  // 24. getActiveBudgetPlan()
  getActiveBudgetPlan() {
    const plans = this._getFromStorage('budget_plans');
    const items = this._getFromStorage('budget_expense_items');

    let activePlan = plans.find((p) => p.is_active) || null;

    if (!activePlan) {
      const template = {
        id: null,
        name: 'My Budget Plan',
        view_mode: 'monthly',
        total_monthly_amount: 0,
        total_yearly_amount: 0,
        created_at: null,
        updated_at: null,
        is_active: false
      };
      return {
        budget_plan: template,
        expense_items: []
      };
    }

    const planItems = items
      .filter((i) => i.budget_plan_id === activePlan.id)
      .map((i) => ({
        ...i,
        budget_plan: activePlan
      }));

    return {
      budget_plan: activePlan,
      expense_items: planItems
    };
  }

  // 25. previewBudgetSummary(viewMode, expenses, budgetThreshold)
  previewBudgetSummary(viewMode, expenses, budgetThreshold) {
    const normalizedExpenses = this._ensureArray(expenses).filter((e) => e && typeof e.monthlyAmount === 'number');
    const totalMonthly = normalizedExpenses.reduce((sum, e) => sum + (e.monthlyAmount || 0), 0);
    const totalYearly = totalMonthly * 12;

    const within = typeof budgetThreshold === 'number' ? totalMonthly <= budgetThreshold : true;

    return {
      total_monthly_amount: totalMonthly,
      total_yearly_amount: totalYearly,
      within_threshold: within
    };
  }

  // 26. saveBudgetPlan(name, viewMode, expenses)
  saveBudgetPlan(name, viewMode, expenses) {
    return this._persistBudgetPlanWithExpenses(name, viewMode, expenses);
  }

  // 27. getArticleFilterOptions()
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');

    const categoriesSet = new Set();
    const tagsSet = new Set();

    articles.forEach((a) => {
      if (a.category) categoriesSet.add(a.category);
      this._ensureArray(a.tags).forEach((t) => tagsSet.add(t));
    });

    return {
      categories: Array.from(categoriesSet),
      min_reading_time_options_minutes: [3, 5, 10, 15],
      tag_suggestions: Array.from(tagsSet)
    };
  }

  // 28. searchArticles(query, filters, sortBy = 'relevance', page = 1, pageSize = 20)
  searchArticles(query, filters, sortBy, page, pageSize) {
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_items');

    const q = (query || '').trim();
    const f = filters || {};
    const sort = sortBy || 'relevance';
    const currentPage = page || 1;
    const size = pageSize || 20;

    let filtered = articles.slice();

    const statusFilter = f.status || 'published';
    filtered = filtered.filter((a) => a.status === statusFilter);

    if (q) {
      filtered = filtered.filter(
        (a) =>
          this._stringContains(a.title, q) ||
          this._stringContains(a.summary || '', q) ||
          this._stringContains(a.content || '', q)
      );
    }

    if (f.category) {
      filtered = filtered.filter((a) => a.category === f.category);
    }

    if (typeof f.minReadingTimeMinutes === 'number') {
      filtered = filtered.filter((a) => a.reading_time_minutes >= f.minReadingTimeMinutes);
    }

    if (typeof f.maxReadingTimeMinutes === 'number') {
      filtered = filtered.filter((a) => a.reading_time_minutes <= f.maxReadingTimeMinutes);
    }

    if (Array.isArray(f.tags) && f.tags.length) {
      filtered = filtered.filter((a) => {
        const tags = this._ensureArray(a.tags).map((t) => String(t).toLowerCase());
        return f.tags.every((tag) => tags.includes(String(tag).toLowerCase()));
      });
    }

    if (sort === 'publish_date_desc') {
      filtered.sort((a, b) => {
        const da = this._parseDate(a.publish_date);
        const db = this._parseDate(b.publish_date);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
      });
    } else if (sort === 'reading_time_asc') {
      filtered.sort((a, b) => a.reading_time_minutes - b.reading_time_minutes);
    }

    const totalCount = filtered.length;
    const startIndex = (currentPage - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const items = pageItems.map((article) => {
      const isBookmarked = readingList.some((i) => i.article_id === article.id);
      return { article, is_bookmarked: isBookmarked };
    });

    return {
      totalCount,
      page: currentPage,
      pageSize: size,
      items
    };
  }

  // 29. getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_items');

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { article: null, is_bookmarked: false, related_articles: [] };
    }

    const isBookmarked = readingList.some((i) => i.article_id === articleId);

    const related = articles
      .filter((a) => a.id !== articleId && a.status === 'published')
      .filter((a) => a.category === article.category || this._arraysIntersect(a.tags || [], article.tags || []))
      .slice(0, 5);

    return {
      article,
      is_bookmarked: isBookmarked,
      related_articles: related
    };
  }

  // 30. bookmarkArticle(articleId, source = 'manual_bookmark')
  bookmarkArticle(articleId, source) {
    return this._persistReadingListItem(articleId, source || 'manual_bookmark');
  }

  // 31. getReadinessQuiz()
  getReadinessQuiz() {
    const quizzes = this._getFromStorage('quizzes');
    const questionsAll = this._getFromStorage('quiz_questions');
    const optionsAll = this._getFromStorage('quiz_options');

    const quiz = quizzes.find((q) => q.status === 'active') || null;
    if (!quiz) {
      return { quiz: null, questions: [] };
    }

    const questions = questionsAll
      .filter((qst) => qst.quiz_id === quiz.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((question) => {
        const options = optionsAll
          .filter((opt) => opt.question_id === question.id)
          .sort((a, b) => a.order_index - b.order_index)
          .map((opt) => ({
            ...opt,
            question
          }));
        return {
          question: {
            ...question,
            quiz
          },
          options
        };
      });

    return {
      quiz,
      questions
    };
  }

  // 32. submitReadinessQuizAnswers(quizId, answers)
  submitReadinessQuizAnswers(quizId, answers) {
    const quizzes = this._getFromStorage('quizzes');
    const questions = this._getFromStorage('quiz_questions');
    const options = this._getFromStorage('quiz_options');
    const submissions = this._getFromStorage('quiz_submissions');
    const answersStore = this._getFromStorage('quiz_answers');

    const quiz = quizzes.find((q) => q.id === quizId) || null;
    if (!quiz) {
      return {
        submission: null,
        success: false,
        recommended_courses: []
      };
    }

    const normalizedAnswers = this._ensureArray(answers).map((ans) => ({
      questionId: ans.questionId,
      selectedOptionIds: this._ensureArray(ans.selectedOptionIds)
    }));

    const rec = this._generateQuizRecommendations(quizId, normalizedAnswers);

    const submission = {
      id: this._generateId('qsub'),
      quiz_id: quizId,
      submitted_at: this._nowIso(),
      result_summary: rec.resultSummary,
      recommended_course_ids: rec.recommendedCourseIds
    };

    submissions.push(submission);
    this._saveToStorage('quiz_submissions', submissions);

    normalizedAnswers.forEach((ans) => {
      const question = questions.find((qst) => qst.id === ans.questionId) || null;
      if (!question) return;
      const selectedOptionIds = ans.selectedOptionIds.filter((oid) =>
        options.some((o) => o.id === oid)
      );
      const answerRecord = {
        id: this._generateId('qans'),
        submission_id: submission.id,
        question_id: ans.questionId,
        selected_option_ids: selectedOptionIds
      };
      answersStore.push(answerRecord);
    });

    this._saveToStorage('quiz_answers', answersStore);

    const allCourses = this._getFromStorage('courses');
    const recommendedCourses = allCourses.filter((c) =>
      submission.recommended_course_ids && submission.recommended_course_ids.includes(c.id)
    );

    const resolvedSubmission = {
      ...submission,
      quiz
    };

    return {
      submission: resolvedSubmission,
      success: true,
      recommended_courses: recommendedCourses
    };
  }

  // 33. getQuizResults(submissionId)
  getQuizResults(submissionId) {
    const submissions = this._getFromStorage('quiz_submissions');
    const quizzes = this._getFromStorage('quizzes');
    const answersStore = this._getFromStorage('quiz_answers');
    const courses = this._getFromStorage('courses');
    const programmes = this._getFromStorage('programmes');

    const submission = submissions.find((s) => s.id === submissionId) || null;
    if (!submission) {
      return {
        submission: null,
        recommended_courses: [],
        recommended_programmes: []
      };
    }

    const quiz = quizzes.find((q) => q.id === submission.quiz_id) || null;

    const recommendedCourses = courses.filter((c) =>
      submission.recommended_course_ids && submission.recommended_course_ids.includes(c.id)
    );

    // Recompute recommendations for programmes using stored answers
    const answersForSubmission = answersStore
      .filter((a) => a.submission_id === submission.id)
      .map((a) => ({
        questionId: a.question_id,
        selectedOptionIds: this._ensureArray(a.selected_option_ids)
      }));

    const rec = this._generateQuizRecommendations(submission.quiz_id, answersForSubmission);
    const recommendedProgrammes = programmes.filter((p) => rec.recommendedProgrammeIds.includes(p.id));

    const resolvedSubmission = {
      ...submission,
      quiz
    };

    return {
      submission: resolvedSubmission,
      recommended_courses: recommendedCourses,
      recommended_programmes: recommendedProgrammes
    };
  }

  // 34. getDashboardSummary()
  getDashboardSummary() {
    const savedProgrammes = this._getFromStorage('saved_programmes');
    const programmes = this._getFromStorage('programmes');
    const cohorts = this._getFromStorage('programme_cohorts');
    const programmeApplications = this._getFromStorage('programme_applications');
    const learningPlanItems = this._getFromStorage('learning_plan_items');
    const courses = this._getFromStorage('courses');
    const eventRegistrations = this._getFromStorage('event_registrations');
    const events = this._getFromStorage('events');
    const mentorBookings = this._getFromStorage('mentor_session_bookings');
    const mentors = this._getFromStorage('mentors');
    const mentorSlots = this._getFromStorage('mentor_availability_slots');
    const budgetPlans = this._getFromStorage('budget_plans');
    const readingListItems = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const programmeShortlist = savedProgrammes
      .filter((s) => s.save_type === 'programme_shortlist')
      .map((s) => {
        const programme = programmes.find((p) => p.id === s.programme_id) || null;
        const cohort = s.cohort_id
          ? cohorts.find((c) => c.id === s.cohort_id) || null
          : null;
        const saved_programme = {
          ...s,
          programme,
          cohort
        };
        return { saved_programme, programme, cohort };
      });

    const fundingInterestTracks = savedProgrammes
      .filter((s) => s.save_type === 'funding_interest')
      .map((s) => {
        const programme = programmes.find((p) => p.id === s.programme_id) || null;
        const saved_programme = {
          ...s,
          programme
        };
        return { saved_programme, programme };
      });

    const applicationsResolved = programmeApplications.map((app) => {
      const programme = programmes.find((p) => p.id === app.programme_id) || null;
      const cohort = cohorts.find((c) => c.id === app.cohort_id) || null;
      return {
        ...app,
        programme,
        cohort
      };
    });

    const learningPlanResolved = learningPlanItems.map((item) => {
      const course = courses.find((c) => c.id === item.course_id) || null;
      const learning_plan_item = {
        ...item,
        course
      };
      return { learning_plan_item, course };
    });

    const eventRegistrationsResolved = eventRegistrations.map((reg) => {
      const event = events.find((e) => e.id === reg.event_id) || null;
      const registration = {
        ...reg,
        event
      };
      return { registration, event };
    });

    const mentorSessionsResolved = mentorBookings.map((booking) => {
      const mentor = mentors.find((m) => m.id === booking.mentor_id) || null;
      const slot = booking.availability_slot_id
        ? mentorSlots.find((s) => s.id === booking.availability_slot_id) || null
        : null;
      const resolvedBooking = {
        ...booking,
        mentor,
        availability_slot: slot
      };
      return { booking: resolvedBooking, mentor };
    });

    const readingListResolved = readingListItems.map((item) => {
      const article = articles.find((a) => a.id === item.article_id) || null;
      const reading_list_item = {
        ...item,
        article
      };
      return { reading_list_item, article };
    });

    return {
      programme_shortlist: programmeShortlist,
      funding_interest_tracks: fundingInterestTracks,
      programme_applications: applicationsResolved,
      learning_plan_items: learningPlanResolved,
      event_registrations: eventRegistrationsResolved,
      mentor_sessions: mentorSessionsResolved,
      budget_plans: budgetPlans,
      reading_list_items: readingListResolved
    };
  }

  // 35. submitContactForm(name, email, subject, message, category = 'general_enquiry')
  submitContactForm(name, email, subject, message, category) {
    const messages = this._getFromStorage('contact_messages');

    if (!name || !email || !subject || !message) {
      return {
        success: false,
        reference_id: null,
        message: 'All fields are required.'
      };
    }

    const record = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      category: category || 'general_enquiry',
      created_at: this._nowIso()
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      reference_id: record.id,
      message: 'Your message has been received.'
    };
  }

  // 36. getFAQItems()
  getFAQItems() {
    return this._getFromStorage('faq_items');
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