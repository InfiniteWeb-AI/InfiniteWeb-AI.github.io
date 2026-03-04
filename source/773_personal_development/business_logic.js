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
  }

  // -------------------- init & core storage helpers --------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'programs',
      'program_enrollments',
      'program_reviews',
      'coaches',
      'coach_reviews',
      'coach_availability_slots',
      'coaching_session_bookings',
      'goals',
      'habit_templates',
      'habit_routines',
      'habit_routine_items',
      'habit_schedule_entries',
      'articles',
      'reading_list_items',
      'assessments',
      'assessment_questions',
      'assessment_attempts',
      'assessment_responses',
      'subscription_plans',
      'active_subscriptions',
      'challenge_templates',
      'challenge_day_templates',
      'challenge_instances',
      'challenge_day_notes',
      'forum_threads',
      'forum_replies',
      'bookmarked_threads',
      'contact_messages'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    // Static content containers
    if (!localStorage.getItem('about_content')) {
      this._saveToStorage('about_content', {
        headline: '',
        mission: '',
        approach: '',
        team_members: []
      });
    }

    if (!localStorage.getItem('help_center_content')) {
      this._saveToStorage('help_center_content', {
        faq_sections: [],
        guides: []
      });
    }

    if (!localStorage.getItem('privacy_policy')) {
      this._saveToStorage('privacy_policy', {
        last_updated: '',
        content_html: ''
      });
    }

    if (!localStorage.getItem('terms_of_use')) {
      this._saveToStorage('terms_of_use', {
        last_updated: '',
        content_html: ''
      });
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
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

  _nowIso() {
    return new Date().toISOString();
  }

  _addMonths(dateIso, months) {
    const d = new Date(dateIso);
    const m = d.getMonth();
    d.setMonth(m + months);
    return d.toISOString();
  }

  _addYears(dateIso, years) {
    const d = new Date(dateIso);
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString();
  }

  // -------------------- helper: foreign key resolution --------------------

  _indexById(items) {
    const map = {};
    for (const it of items) {
      if (it && it.id) {
        map[it.id] = it;
      }
    }
    return map;
  }

  _attachProgramToEnrollment(enrollment) {
    if (!enrollment) return null;
    const programs = this._getFromStorage('programs');
    const program = programs.find(p => p.id === enrollment.programId) || null;
    return Object.assign({}, enrollment, { program });
  }

  _attachAssessmentToAttempt(attempt) {
    if (!attempt) return null;
    const assessments = this._getFromStorage('assessments');
    const assessment = assessments.find(a => a.id === attempt.assessmentId) || null;
    return Object.assign({}, attempt, { assessment });
  }

  // -------------------- helper functions from spec --------------------

  _getOrCreateDefaultHabitRoutine() {
    const routines = this._getFromStorage('habit_routines');
    let routine = routines.find(r => r.is_default === true) || null;
    if (!routine) {
      routine = {
        id: this._generateId('habit_routine'),
        name: 'My Routine',
        description: '',
        created_at: this._nowIso(),
        updated_at: null,
        is_default: true
      };
      routines.push(routine);
      this._saveToStorage('habit_routines', routines);
    }
    return routine;
  }

  _calculateAssessmentOverallScore(attemptId) {
    const responses = this._getFromStorage('assessment_responses').filter(r => r.attemptId === attemptId);
    const numeric = responses.map(r => typeof r.numeric_answer === 'number' ? r.numeric_answer : null).filter(v => v !== null);
    if (numeric.length === 0) return null;
    const sum = numeric.reduce((acc, v) => acc + v, 0);
    return sum / numeric.length;
  }

  _updateCoachAvailabilitySlotsAsBooked(slotIds) {
    if (!Array.isArray(slotIds) || slotIds.length === 0) return;
    const slots = this._getFromStorage('coach_availability_slots');
    let changed = false;
    for (const slot of slots) {
      if (slotIds.includes(slot.id)) {
        if (!slot.is_booked) {
          slot.is_booked = true;
          changed = true;
        }
      }
    }
    if (changed) {
      this._saveToStorage('coach_availability_slots', slots);
    }
  }

  _getHabitWeeklySummary(routine) {
    if (!routine) {
      return [];
    }
    const routineItems = this._getFromStorage('habit_routine_items').filter(it => it.routineId === routine.id && it.is_active);
    const templatesIndex = this._indexById(this._getFromStorage('habit_templates'));
    const scheduleEntries = this._getFromStorage('habit_schedule_entries').filter(se => se.is_enabled);

    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const summary = [];

    for (const day of weekdays) {
      const habits = [];
      for (const item of routineItems) {
        const entriesFor = scheduleEntries.filter(se => se.routineItemId === item.id && se.weekday === day && se.is_enabled);
        for (const se of entriesFor) {
          const tmpl = templatesIndex[item.habitTemplateId] || null;
          habits.push({
            routine_item_id: item.id,
            habit_name: item.custom_title || (tmpl ? tmpl.name : ''),
            reminder_time: se.reminder_time
          });
        }
      }
      summary.push({ weekday: day, habits });
    }
    return summary;
  }

  // -------------------- Interface implementations --------------------

  // getHomeOverview
  getHomeOverview() {
    const programs = this._getFromStorage('programs');
    const enrollments = this._getFromStorage('program_enrollments');
    const coaches = this._getFromStorage('coaches');
    const coachAvailability = this._getFromStorage('coach_availability_slots');
    const bookings = this._getFromStorage('coaching_session_bookings');
    const goals = this._getFromStorage('goals');
    const habitRoutine = this._getOrCreateDefaultHabitRoutine();
    const habitSummary = this._getHabitWeeklySummary(habitRoutine);
    const readingListItems = this._getFromStorage('reading_list_items');
    const assessments = this._getFromStorage('assessments');
    const attempts = this._getFromStorage('assessment_attempts');
    const challengeTemplates = this._getFromStorage('challenge_templates');
    const challengeInstances = this._getFromStorage('challenge_instances');
    const subscriptionPlans = this._getFromStorage('subscription_plans');
    const activeSubscriptions = this._getFromStorage('active_subscriptions');
    const bookmarkedThreads = this._getFromStorage('bookmarked_threads');

    // Featured programs: pick active, is_featured true (or top rated fallback)
    const featuredProgramsRaw = programs.filter(p => p.status === 'active' && p.is_featured);
    const featured_programs = featuredProgramsRaw.map(p => {
      const isEnrolled = enrollments.some(e => e.programId === p.id && e.status === 'active');
      return {
        program: {
          id: p.id,
          name: p.name,
          category: p.category,
          category_label: p.category,
          price: p.price,
          currency: p.currency,
          duration_weeks: p.duration_weeks,
          rating: p.rating,
          rating_count: p.rating_count,
          is_featured: !!p.is_featured
        },
        enrolled: isEnrolled
      };
    });

    // Featured coaches: is_accepting_new_clients, highest rating
    const featuredCoachesRaw = coaches
      .filter(c => c.is_accepting_new_clients)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);

    const featured_coaches = featuredCoachesRaw.map(c => ({
      coach: {
        id: c.id,
        name: c.name,
        primary_specialization: c.primary_specialization,
        rating: c.rating,
        rating_count: c.rating_count,
        price_per_session: c.price_per_session,
        currency: c.currency
      },
      is_accepting_new_clients: c.is_accepting_new_clients
    }));

    // Featured challenges: active templates
    const featuredChallengesRaw = challengeTemplates.filter(ct => ct.status === 'active').slice(0, 5);
    const featured_challenges = featuredChallengesRaw.map(t => {
      const hasInstanceStarted = challengeInstances.some(ci => ci.challengeTemplateId === t.id && (ci.status === 'active' || ci.status === 'completed'));
      return {
        template: {
          id: t.id,
          title: t.title,
          category: t.category,
          duration_days: t.duration_days
        },
        has_instance_started: hasInstanceStarted
      };
    });

    // Quick links counts
    const inProgressProgramsCount = enrollments.filter(e => e.status === 'active').length;
    const upcomingSessionsCount = bookings.filter(b => {
      if (b.status !== 'scheduled') return false;
      const start = new Date(b.start_datetime);
      return start >= new Date();
    }).length;
    const activeGoalsCount = goals.filter(g => g.status === 'active').length;
    const activeChallengesCount = challengeInstances.filter(ci => ci.status === 'active').length;
    const unreadArticlesCount = readingListItems.filter(ri => !ri.is_read).length;

    const activeAssessmentIds = assessments.filter(a => a.status === 'active').map(a => a.id);
    const completedAssessmentIds = new Set(
      attempts.filter(at => at.status === 'completed').map(at => at.assessmentId)
    );
    const pendingAssessmentsCount = activeAssessmentIds.filter(id => !completedAssessmentIds.has(id)).length;

    const quick_links = {
      in_progress_programs_count: inProgressProgramsCount,
      upcoming_sessions_count: upcomingSessionsCount,
      active_goals_count: activeGoalsCount,
      active_challenges_count: activeChallengesCount,
      unread_articles_count: unreadArticlesCount,
      pending_assessments_count: pendingAssessmentsCount
    };

    return {
      featured_programs,
      featured_coaches,
      featured_challenges,
      quick_links
    };
  }

  // getProgramsFilterOptions
  getProgramsFilterOptions() {
    const programs = this._getFromStorage('programs');

    const categoryValues = [
      'productivity',
      'health',
      'career',
      'relationships',
      'confidence',
      'mindfulness',
      'stress_management',
      'general_personal_development'
    ];

    const categories = categoryValues.map(v => ({ value: v, label: v.replace(/_/g, ' ') }));

    let minPrice = null;
    let maxPrice = null;
    let minDuration = null;
    let maxDuration = null;

    for (const p of programs) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (typeof p.duration_weeks === 'number') {
        if (minDuration === null || p.duration_weeks < minDuration) minDuration = p.duration_weeks;
        if (maxDuration === null || p.duration_weeks > maxDuration) maxDuration = p.duration_weeks;
      }
    }

    const sort_options = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'duration_short_to_long', label: 'Duration: Short to Long' },
      { value: 'duration_long_to_short', label: 'Duration: Long to Short' }
    ];

    return {
      categories,
      price_range: {
        min: minPrice !== null ? minPrice : 0,
        max: maxPrice !== null ? maxPrice : 0
      },
      duration_range_weeks: {
        min: minDuration !== null ? minDuration : 0,
        max: maxDuration !== null ? maxDuration : 0
      },
      sort_options
    };
  }

  // searchPrograms(category, maxPrice, minDurationWeeks, sortBy, limit, offset)
  searchPrograms(category, maxPrice, minDurationWeeks, sortBy, limit, offset) {
    const programs = this._getFromStorage('programs');
    const enrollments = this._getFromStorage('program_enrollments');
    const limitVal = typeof limit === 'number' ? limit : 50;
    const offsetVal = typeof offset === 'number' ? offset : 0;

    let filtered = programs.filter(p => p.status === 'active');

    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }
    if (typeof maxPrice === 'number') {
      filtered = filtered.filter(p => typeof p.price === 'number' && p.price <= maxPrice);
    }
    if (typeof minDurationWeeks === 'number') {
      filtered = filtered.filter(p => typeof p.duration_weeks === 'number' && p.duration_weeks >= minDurationWeeks);
    }

    if (sortBy === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'duration_short_to_long') {
      filtered.sort((a, b) => (a.duration_weeks || 0) - (b.duration_weeks || 0));
    } else if (sortBy === 'duration_long_to_short') {
      filtered.sort((a, b) => (b.duration_weeks || 0) - (a.duration_weeks || 0));
    }

    const total = filtered.length;
    const paged = filtered.slice(offsetVal, offsetVal + limitVal);

    const items = paged.map(p => {
      const is_enrolled = enrollments.some(e => e.programId === p.id && e.status === 'active');
      return {
        program: {
          id: p.id,
          name: p.name,
          category: p.category,
          category_label: p.category,
          overview: p.overview || '',
          price: p.price,
          currency: p.currency,
          duration_weeks: p.duration_weeks,
          intensity_level: p.intensity_level || null,
          rating: p.rating,
          rating_count: p.rating_count,
          is_featured: !!p.is_featured,
          status: p.status
        },
        is_enrolled
      };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task1_programSearchParams',
        JSON.stringify({
          category,
          maxPrice,
          minDurationWeeks,
          sortBy,
          limit,
          offset,
          timestamp: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { total, items };
  }

  // getProgramDetails(programId)
  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs');
    const reviewsAll = this._getFromStorage('program_reviews');
    const enrollments = this._getFromStorage('program_enrollments');

    const p = programs.find(x => x.id === programId) || null;
    if (!p) {
      return {
        program: null,
        syllabus: [],
        reviews: [],
        enrollment: {
          is_enrolled: false,
          enrollment_id: null,
          status: null,
          progress_percent: 0
        }
      };
    }

    const program = {
      id: p.id,
      name: p.name,
      slug: p.slug || null,
      category: p.category,
      category_label: p.category,
      overview: p.overview || '',
      description: p.description || '',
      price: p.price,
      currency: p.currency,
      duration_weeks: p.duration_weeks,
      intensity_level: p.intensity_level || null,
      rating: p.rating,
      rating_count: p.rating_count,
      status: p.status,
      created_at: p.created_at || null
    };

    const reviews = reviewsAll
      .filter(r => r.programId === programId)
      .map(r => Object.assign({}, r, { program }));

    const enr = enrollments.find(e => e.programId === programId) || null;
    const enrollment = {
      is_enrolled: !!enr,
      enrollment_id: enr ? enr.id : null,
      status: enr ? enr.status : null,
      progress_percent: enr && typeof enr.progress_percent === 'number' ? enr.progress_percent : 0
    };

    // No syllabus stored in model; return empty array
    const syllabus = [];

    return { program, syllabus, reviews, enrollment };
  }

  // enrollInProgram(programId)
  enrollInProgram(programId) {
    const programs = this._getFromStorage('programs');
    const program = programs.find(p => p.id === programId && p.status === 'active');
    if (!program) {
      return { success: false, enrollment: null, message: 'Program not found or not active.' };
    }

    const enrollments = this._getFromStorage('program_enrollments');
    let enrollment = enrollments.find(e => e.programId === programId);

    if (enrollment) {
      // Reactivate existing enrollment
      enrollment.status = 'active';
      if (typeof enrollment.progress_percent !== 'number') {
        enrollment.progress_percent = 0;
      }
      this._saveToStorage('program_enrollments', enrollments);
    } else {
      enrollment = {
        id: this._generateId('program_enrollment'),
        programId: programId,
        enrollment_date: this._nowIso(),
        status: 'active',
        progress_percent: 0,
        last_accessed_at: null
      };
      enrollments.push(enrollment);
      this._saveToStorage('program_enrollments', enrollments);
    }

    return {
      success: true,
      enrollment: {
        id: enrollment.id,
        programId: enrollment.programId,
        enrollment_date: enrollment.enrollment_date,
        status: enrollment.status,
        progress_percent: enrollment.progress_percent
      },
      message: 'Enrolled in program.'
    };
  }

  // getMyPrograms()
  getMyPrograms() {
    const enrollments = this._getFromStorage('program_enrollments');
    const programs = this._getFromStorage('programs');
    const programIndex = this._indexById(programs);

    return enrollments.map(e => {
      const program = programIndex[e.programId] || null;
      const enrollmentWithProgram = Object.assign({}, e, { program });
      return {
        enrollment: {
          id: e.id,
          programId: e.programId,
          enrollment_date: e.enrollment_date,
          status: e.status,
          progress_percent: e.progress_percent || 0,
          last_accessed_at: e.last_accessed_at || null,
          program
        },
        program: program
          ? {
              id: program.id,
              name: program.name,
              category: program.category,
              category_label: program.category,
              duration_weeks: program.duration_weeks,
              price: program.price,
              currency: program.currency,
              rating: program.rating
            }
          : null
      };
    });
  }

  // getCoachesFilterOptions
  getCoachesFilterOptions() {
    const coaches = this._getFromStorage('coaches');

    const specializationsValues = [
      'career_change',
      'productivity',
      'life_balance',
      'relationships',
      'confidence',
      'stress_management',
      'health_wellness',
      'general_life_coaching'
    ];

    const specializations = specializationsValues.map(v => ({ value: v, label: v.replace(/_/g, ' ') }));

    let minRating = null;
    let maxRating = null;
    let minPrice = null;
    let maxPrice = null;

    for (const c of coaches) {
      if (typeof c.rating === 'number') {
        if (minRating === null || c.rating < minRating) minRating = c.rating;
        if (maxRating === null || c.rating > maxRating) maxRating = c.rating;
      }
      if (typeof c.price_per_session === 'number') {
        if (minPrice === null || c.price_per_session < minPrice) minPrice = c.price_per_session;
        if (maxPrice === null || c.price_per_session > maxPrice) maxPrice = c.price_per_session;
      }
    }

    return {
      specializations,
      rating_range: {
        min: minRating !== null ? minRating : 0,
        max: maxRating !== null ? maxRating : 5
      },
      price_range: {
        min: minPrice !== null ? minPrice : 0,
        max: maxPrice !== null ? maxPrice : 0
      }
    };
  }

  // searchCoaches(specialization, minRating, maxPricePerSession, limit, offset)
  searchCoaches(specialization, minRating, maxPricePerSession, limit, offset) {
    const coaches = this._getFromStorage('coaches');
    const limitVal = typeof limit === 'number' ? limit : 50;
    const offsetVal = typeof offset === 'number' ? offset : 0;

    let filtered = coaches.slice();

    if (specialization) {
      filtered = filtered.filter(c => c.primary_specialization === specialization);
    }
    if (typeof minRating === 'number') {
      filtered = filtered.filter(c => typeof c.rating === 'number' && c.rating >= minRating);
    }
    if (typeof maxPricePerSession === 'number') {
      filtered = filtered.filter(c => typeof c.price_per_session === 'number' && c.price_per_session <= maxPricePerSession);
    }

    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    const total = filtered.length;
    const paged = filtered.slice(offsetVal, offsetVal + limitVal);

    const items = paged.map(c => ({
      coach: {
        id: c.id,
        name: c.name,
        primary_specialization: c.primary_specialization,
        rating: c.rating,
        rating_count: c.rating_count,
        price_per_session: c.price_per_session,
        currency: c.currency,
        is_accepting_new_clients: c.is_accepting_new_clients
      },
      primary_specialization_label: c.primary_specialization.replace(/_/g, ' ')
    }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task2_coachSearchParams',
        JSON.stringify({
          specialization,
          minRating,
          maxPricePerSession,
          limit,
          offset,
          timestamp: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { total, items };
  }

  // getCoachDetails(coachId)
  getCoachDetails(coachId) {
    const coaches = this._getFromStorage('coaches');
    const reviewsAll = this._getFromStorage('coach_reviews');
    const availabilitySlots = this._getFromStorage('coach_availability_slots');

    const c = coaches.find(x => x.id === coachId) || null;
    if (!c) {
      return {
        coach: null,
        reviews: [],
        availability_summary: {
          next_available_date: null,
          slots_next_30_days_count: 0
        }
      };
    }

    const coach = {
      id: c.id,
      name: c.name,
      slug: c.slug || null,
      bio: c.bio || '',
      primary_specialization: c.primary_specialization,
      primary_specialization_label: c.primary_specialization.replace(/_/g, ' '),
      specializations: c.specializations || [],
      rating: c.rating,
      rating_count: c.rating_count,
      price_per_session: c.price_per_session,
      currency: c.currency,
      session_duration_minutes: c.session_duration_minutes,
      is_accepting_new_clients: c.is_accepting_new_clients,
      timezone: c.timezone || null,
      profile_image_url: c.profile_image_url || null
    };

    const reviews = reviewsAll
      .filter(r => r.coachId === coachId)
      .map(r => Object.assign({}, r, { coach }));

    const now = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);

    const upcomingSlots = availabilitySlots.filter(s => {
      if (s.coachId !== coachId) return false;
      if (s.is_booked) return false;
      const start = new Date(s.start_datetime);
      return start >= now && start <= in30;
    });

    let nextDate = null;
    if (upcomingSlots.length > 0) {
      upcomingSlots.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      nextDate = upcomingSlots[0].start_datetime;
    }

    const availability_summary = {
      next_available_date: nextDate,
      slots_next_30_days_count: upcomingSlots.length
    };

    return { coach, reviews, availability_summary };
  }

  // getCoachAvailability(coachId, startDate, endDate)
  getCoachAvailability(coachId, startDate, endDate) {
    const slots = this._getFromStorage('coach_availability_slots');
    const coaches = this._getFromStorage('coaches');
    const coach = coaches.find(c => c.id === coachId) || null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    const result = slots.filter(s => {
      if (s.coachId !== coachId) return false;
      const slotStart = new Date(s.start_datetime);
      return slotStart >= start && slotStart <= end && !s.is_booked;
    }).map(s => Object.assign({}, s, { coach }));

    return result;
  }

  // bookCoachSessions(coachId, availabilitySlotIds, notes)
  bookCoachSessions(coachId, availabilitySlotIds, notes) {
    const slots = this._getFromStorage('coach_availability_slots');
    const bookings = this._getFromStorage('coaching_session_bookings');

    const nowIso = this._nowIso();
    const createdBookings = [];

    for (const slotId of availabilitySlotIds || []) {
      const slot = slots.find(s => s.id === slotId && s.coachId === coachId && !s.is_booked);
      if (!slot) continue;

      const booking = {
        id: this._generateId('coaching_session_booking'),
        coachId: coachId,
        availabilitySlotId: slot.id,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        status: 'scheduled',
        created_at: nowIso,
        notes: notes || ''
      };
      bookings.push(booking);
      createdBookings.push(booking);
    }

    this._saveToStorage('coaching_session_bookings', bookings);
    this._updateCoachAvailabilitySlotsAsBooked((availabilitySlotIds || []).slice());

    const success = createdBookings.length > 0;
    return {
      success,
      bookings: createdBookings,
      message: success ? 'Sessions booked.' : 'No sessions booked.'
    };
  }

  // getUpcomingCoachingSessions()
  getUpcomingCoachingSessions() {
    const bookings = this._getFromStorage('coaching_session_bookings');
    const coaches = this._getFromStorage('coaches');
    const coachIndex = this._indexById(coaches);

    const now = new Date();

    const upcoming = bookings.filter(b => {
      if (b.status !== 'scheduled') return false;
      const start = new Date(b.start_datetime);
      return start >= now;
    }).sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    return upcoming.map(b => {
      const coach = coachIndex[b.coachId] || null;
      const bookingWithCoach = Object.assign({}, b, { coach });
      return {
        booking: bookingWithCoach,
        coach_name: coach ? coach.name : null,
        coach_primary_specialization_label: coach ? coach.primary_specialization.replace(/_/g, ' ') : null
      };
    });
  }

  // getGoalsOverview()
  getGoalsOverview() {
    return this._getFromStorage('goals');
  }

  // createGoal(title, category, measurable_target, description, deadline)
  createGoal(title, category, measurable_target, description, deadline) {
    const goals = this._getFromStorage('goals');
    const goal = {
      id: this._generateId('goal'),
      title: title,
      category: category,
      measurable_target: measurable_target,
      description: description || '',
      deadline: deadline,
      created_at: this._nowIso(),
      completed_at: null,
      status: 'active',
      progress_percent: 0
    };
    goals.push(goal);
    this._saveToStorage('goals', goals);
    return { goal };
  }

  // updateGoal(goalId, ...)
  updateGoal(goalId, title, category, measurable_target, description, deadline, status, progress_percent) {
    const goals = this._getFromStorage('goals');
    const goal = goals.find(g => g.id === goalId);
    if (!goal) {
      return { goal: null };
    }

    if (title !== undefined) goal.title = title;
    if (category !== undefined) goal.category = category;
    if (measurable_target !== undefined) goal.measurable_target = measurable_target;
    if (description !== undefined) goal.description = description;
    if (deadline !== undefined) goal.deadline = deadline;
    if (status !== undefined) {
      goal.status = status;
      if (status === 'completed' && !goal.completed_at) {
        goal.completed_at = this._nowIso();
      }
    }
    if (progress_percent !== undefined) goal.progress_percent = progress_percent;

    this._saveToStorage('goals', goals);
    return { goal };
  }

  // deleteGoal(goalId)
  deleteGoal(goalId) {
    const goals = this._getFromStorage('goals');
    const idx = goals.findIndex(g => g.id === goalId);
    if (idx === -1) {
      return { success: false, message: 'Goal not found.' };
    }
    goals.splice(idx, 1);
    this._saveToStorage('goals', goals);
    return { success: true, message: 'Goal deleted.' };
  }

  // getHabitTagFilterOptions()
  getHabitTagFilterOptions() {
    const primaryTags = [
      'mindfulness',
      'productivity',
      'health',
      'relationships',
      'career',
      'confidence',
      'stress_management',
      'general_personal_development'
    ];

    return primaryTags.map(t => ({ value: t, label: t.replace(/_/g, ' ') }));
  }

  // getHabitLibrary(primaryTags)
  getHabitLibrary(primaryTags) {
    const templates = this._getFromStorage('habit_templates');
    let filtered = templates.filter(t => t.is_active);

    if (Array.isArray(primaryTags) && primaryTags.length > 0) {
      const set = new Set(primaryTags);
      filtered = filtered.filter(t => set.has(t.primary_tag));
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task4_habitFilterParams',
        JSON.stringify({
          primaryTags,
          timestamp: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filtered;
  }

  // addHabitToRoutine(habitTemplateId, custom_title)
  addHabitToRoutine(habitTemplateId, custom_title) {
    const templates = this._getFromStorage('habit_templates');
    const tmpl = templates.find(t => t.id === habitTemplateId && t.is_active);
    if (!tmpl) {
      return { routine_item: null, routine_created: false };
    }

    const routine = this._getOrCreateDefaultHabitRoutine();
    const items = this._getFromStorage('habit_routine_items');

    const routine_item = {
      id: this._generateId('habit_routine_item'),
      routineId: routine.id,
      habitTemplateId: habitTemplateId,
      custom_title: custom_title || '',
      is_active: true,
      created_at: this._nowIso()
    };

    items.push(routine_item);
    this._saveToStorage('habit_routine_items', items);

    return { routine_item, routine_created: false };
  }

  // getMyRoutine()
  getMyRoutine() {
    const routine = this._getOrCreateDefaultHabitRoutine();
    const itemsAll = this._getFromStorage('habit_routine_items');
    const templates = this._getFromStorage('habit_templates');
    const schedulesAll = this._getFromStorage('habit_schedule_entries');
    const tmplIndex = this._indexById(templates);

    const items = itemsAll
      .filter(it => it.routineId === routine.id)
      .map(it => {
        const habit_template = tmplIndex[it.habitTemplateId] || null;
        const scheduleEntries = schedulesAll
          .filter(se => se.routineItemId === it.id)
          .map(se => Object.assign({}, se, { routineItem: it }));
        return {
          routine_item: it,
          habit_template,
          schedule_entries: scheduleEntries
        };
      });

    return { routine, items };
  }

  // updateHabitSchedule(routineItemId, weekdays, reminder_time)
  updateHabitSchedule(routineItemId, weekdays, reminder_time) {
    const entries = this._getFromStorage('habit_schedule_entries');

    // Remove existing entries for this routine item
    const remaining = entries.filter(e => e.routineItemId !== routineItemId);

    const newEntries = [];
    const nowEnabled = Array.isArray(weekdays) ? weekdays : [];

    for (const day of nowEnabled) {
      const entry = {
        id: this._generateId('habit_schedule_entry'),
        routineItemId: routineItemId,
        weekday: day,
        reminder_time: reminder_time,
        is_enabled: true
      };
      newEntries.push(entry);
    }

    const all = remaining.concat(newEntries);
    this._saveToStorage('habit_schedule_entries', all);

    return newEntries;
  }

  // saveHabitRoutine()
  saveHabitRoutine() {
    const routine = this._getOrCreateDefaultHabitRoutine();
    const routines = this._getFromStorage('habit_routines');
    const idx = routines.findIndex(r => r.id === routine.id);
    if (idx !== -1) {
      routines[idx].updated_at = this._nowIso();
      this._saveToStorage('habit_routines', routines);
    }

    const weekly_summary = this._getHabitWeeklySummary(routine);
    return { routine, weekly_summary };
  }

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const topicsValues = [
      'stress_management',
      'productivity',
      'mindfulness',
      'confidence',
      'relationships',
      'career',
      'health',
      'general_personal_development',
      'habits',
      'goals',
      'assessments'
    ];

    const topics = topicsValues.map(v => ({ value: v, label: v.replace(/_/g, ' ') }));

    return {
      topics,
      max_reading_time_default: 15
    };
  }

  // searchArticles(query, topic, publishedAfter, maxReadingTimeMinutes, limit, offset)
  searchArticles(query, topic, publishedAfter, maxReadingTimeMinutes, limit, offset) {
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_items');
    const savedSet = new Set(readingList.map(r => r.articleId));

    const limitVal = typeof limit === 'number' ? limit : 50;
    const offsetVal = typeof offset === 'number' ? offset : 0;

    let filtered = articles.filter(a => a.status === 'published');

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(a => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const primaryTopic = ((a.primary_topic || '').replace(/_/g, ' ')).toLowerCase();
        const topicTags = Array.isArray(a.topic_tags)
          ? a.topic_tags.map(t => String(t).replace(/_/g, ' ').toLowerCase()).join(' ')
          : '';
        const haystack = `${title} ${summary} ${primaryTopic} ${topicTags}`;
        return haystack.includes(q);
      });
    }

    if (topic) {
      filtered = filtered.filter(a => a.primary_topic === topic);
    }

    if (publishedAfter) {
      const afterDate = new Date(publishedAfter);
      filtered = filtered.filter(a => new Date(a.published_at) >= afterDate);
    }

    if (typeof maxReadingTimeMinutes === 'number') {
      filtered = filtered.filter(a => typeof a.reading_time_minutes === 'number' && a.reading_time_minutes <= maxReadingTimeMinutes);
    }

    filtered.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    const total = filtered.length;
    const paged = filtered.slice(offsetVal, offsetVal + limitVal);

    const items = paged.map(a => ({
      article: {
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        primary_topic: a.primary_topic || null,
        published_at: a.published_at,
        reading_time_minutes: a.reading_time_minutes,
        is_featured: !!a.is_featured
      },
      is_saved: savedSet.has(a.id)
    }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task5_articleSearchParams',
        JSON.stringify({
          query,
          topic,
          publishedAfter,
          maxReadingTimeMinutes,
          limit,
          offset,
          timestamp: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { total, items };
  }

  // saveArticleToReadingList(articleId)
  saveArticleToReadingList(articleId) {
    const readingList = this._getFromStorage('reading_list_items');
    let item = readingList.find(r => r.articleId === articleId);
    if (!item) {
      item = {
        id: this._generateId('reading_list_item'),
        articleId: articleId,
        saved_at: this._nowIso(),
        is_read: false,
        notes: ''
      };
      readingList.push(item);
      this._saveToStorage('reading_list_items', readingList);
    }

    return {
      reading_list_item: item,
      message: 'Article saved to reading list.'
    };
  }

  // getMyReadingList()
  getMyReadingList() {
    const readingList = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');
    const articleIndex = this._indexById(articles);

    const sorted = readingList.slice().sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));

    return sorted.map(ri => {
      const article = articleIndex[ri.articleId] || null;
      const reading_list_item = Object.assign({}, ri, { article });
      return { reading_list_item, article };
    });
  }

  // updateReadingListItemStatus(readingListItemId, is_read, notes)
  updateReadingListItemStatus(readingListItemId, is_read, notes) {
    const readingList = this._getFromStorage('reading_list_items');
    const item = readingList.find(r => r.id === readingListItemId);
    if (!item) {
      return { reading_list_item: null };
    }
    if (typeof is_read === 'boolean') item.is_read = is_read;
    if (notes !== undefined) item.notes = notes;
    this._saveToStorage('reading_list_items', readingList);
    return { reading_list_item: item };
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    const readingList = this._getFromStorage('reading_list_items');
    const idx = readingList.findIndex(r => r.id === readingListItemId);
    if (idx === -1) {
      return { success: false, message: 'Reading list item not found.' };
    }
    readingList.splice(idx, 1);
    this._saveToStorage('reading_list_items', readingList);
    return { success: true, message: 'Reading list item removed.' };
  }

  // getAssessmentsList()
  getAssessmentsList() {
    return this._getFromStorage('assessments');
  }

  // startAssessment(assessmentId)
  startAssessment(assessmentId) {
    const assessments = this._getFromStorage('assessments');
    const assessment = assessments.find(a => a.id === assessmentId && a.status === 'active');
    if (!assessment) {
      return { attempt: null, questions: [] };
    }

    const attempts = this._getFromStorage('assessment_attempts');

    const attempt = {
      id: this._generateId('assessment_attempt'),
      assessmentId: assessmentId,
      started_at: this._nowIso(),
      completed_at: null,
      status: 'in_progress',
      reflection_text: '',
      overall_score: null
    };

    attempts.push(attempt);
    this._saveToStorage('assessment_attempts', attempts);

    const questions = this._getFromStorage('assessment_questions')
      .filter(q => q.assessmentId === assessmentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    return { attempt, questions };
  }

  // submitAssessment(attemptId, responses, reflection_text)
  submitAssessment(attemptId, responses, reflection_text) {
    const attempts = this._getFromStorage('assessment_attempts');
    const attempt = attempts.find(a => a.id === attemptId);
    if (!attempt) {
      return { attempt: null, responses: [], result_summary: { overall_score: null, completed_at: null } };
    }

    const allResponses = this._getFromStorage('assessment_responses');

    const newResponses = [];
    for (const r of responses || []) {
      const res = {
        id: this._generateId('assessment_response'),
        attemptId: attemptId,
        questionId: r.questionId,
        numeric_answer: typeof r.numeric_answer === 'number' ? r.numeric_answer : null,
        text_answer: r.text_answer !== undefined ? r.text_answer : null
      };
      allResponses.push(res);
      newResponses.push(res);
    }

    this._saveToStorage('assessment_responses', allResponses);

    attempt.status = 'completed';
    attempt.completed_at = this._nowIso();
    if (reflection_text !== undefined) {
      attempt.reflection_text = reflection_text;
    }
    attempt.overall_score = this._calculateAssessmentOverallScore(attemptId);

    this._saveToStorage('assessment_attempts', attempts);

    const result_summary = {
      overall_score: attempt.overall_score,
      completed_at: attempt.completed_at
    };

    return { attempt, responses: newResponses, result_summary };
  }

  // getCompletedAssessmentsSummary()
  getCompletedAssessmentsSummary() {
    const attempts = this._getFromStorage('assessment_attempts');
    const completed = attempts.filter(a => a.status === 'completed');
    return completed.map(a => this._attachAssessmentToAttempt(a));
  }

  // getAssessmentAttemptDetails(attemptId)
  getAssessmentAttemptDetails(attemptId) {
    const attempts = this._getFromStorage('assessment_attempts');
    const attempt = attempts.find(a => a.id === attemptId) || null;
    if (!attempt) {
      return { attempt: null, assessment: null, responses: [] };
    }
    const assessments = this._getFromStorage('assessments');
    const assessment = assessments.find(a => a.id === attempt.assessmentId) || null;

    const questions = this._getFromStorage('assessment_questions').filter(q => q.assessmentId === attempt.assessmentId);
    const qIndex = this._indexById(questions);

    const responsesRaw = this._getFromStorage('assessment_responses').filter(r => r.attemptId === attemptId);
    const responses = responsesRaw.map(r => Object.assign({}, r, { question: qIndex[r.questionId] || null, attempt }));

    const attemptWithAssessment = Object.assign({}, attempt, { assessment });

    return { attempt: attemptWithAssessment, assessment, responses };
  }

  // getSubscriptionPlans(billing_period)
  getSubscriptionPlans(billing_period) {
    const plansAll = this._getFromStorage('subscription_plans');
    let plans = plansAll.filter(p => p.status === 'active');

    if (billing_period) {
      plans = plans.filter(p => Array.isArray(p.billing_periods_available) && p.billing_periods_available.includes(billing_period));
    }

    const billingPeriodsAvailableSet = new Set();
    for (const p of plansAll.filter(p => p.status === 'active')) {
      for (const bp of p.billing_periods_available || []) {
        billingPeriodsAvailableSet.add(bp);
      }
    }

    const billing_periods_available = Array.from(billingPeriodsAvailableSet);

    return { plans, billing_periods_available };
  }

  // activateSubscriptionPlan(planId, billing_period)
  activateSubscriptionPlan(planId, billing_period) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find(p => p.id === planId && p.status === 'active');
    if (!plan) {
      return { active_subscription: null, plan: null, message: 'Plan not found or not active.' };
    }
    if (!plan.billing_periods_available || !plan.billing_periods_available.includes(billing_period)) {
      return { active_subscription: null, plan: null, message: 'Billing period not available for this plan.' };
    }

    const activeSubs = this._getFromStorage('active_subscriptions');
    const nowIso = this._nowIso();

    // Mark existing active as cancelled
    for (const s of activeSubs) {
      if (s.status === 'active' || s.status === 'trial') {
        s.status = 'cancelled';
        s.cancelled_at = nowIso;
      }
    }

    const active_subscription = {
      id: this._generateId('active_subscription'),
      planId: planId,
      billing_period: billing_period,
      started_at: nowIso,
      renewal_date: billing_period === 'yearly' ? this._addYears(nowIso, 1) : this._addMonths(nowIso, 1),
      status: 'active',
      cancelled_at: null
    };

    activeSubs.push(active_subscription);
    this._saveToStorage('active_subscriptions', activeSubs);

    return {
      active_subscription,
      plan,
      message: 'Subscription activated.'
    };
  }

  // getActiveSubscription()
  getActiveSubscription() {
    const activeSubs = this._getFromStorage('active_subscriptions');
    const plans = this._getFromStorage('subscription_plans');

    let active = activeSubs.find(s => s.status === 'active') || null;
    if (!active) {
      active = activeSubs.find(s => s.status === 'trial') || null;
    }

    if (!active) {
      return { active_subscription: null, plan: null };
    }

    const plan = plans.find(p => p.id === active.planId) || null;
    const active_subscription = Object.assign({}, active, { plan });

    return { active_subscription, plan };
  }

  // getChallengeTemplates(category)
  getChallengeTemplates(category) {
    const templates = this._getFromStorage('challenge_templates');
    let filtered = templates.filter(t => t.status === 'active');
    if (category) {
      filtered = filtered.filter(t => t.category === category);
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task8_challengeFilterParams',
        JSON.stringify({
          category,
          timestamp: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return filtered;
  }

  // getChallengeTemplateDetails(challengeTemplateId)
  getChallengeTemplateDetails(challengeTemplateId) {
    const templates = this._getFromStorage('challenge_templates');
    const template = templates.find(t => t.id === challengeTemplateId) || null;
    if (!template) {
      return { template: null, days: [] };
    }
    const days = this._getFromStorage('challenge_day_templates')
      .filter(d => d.challengeTemplateId === challengeTemplateId)
      .sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
    return { template, days };
  }

  // createChallengeInstanceFromTemplate(challengeTemplateId, title, description, start_date)
  createChallengeInstanceFromTemplate(challengeTemplateId, title, description, start_date) {
    const templates = this._getFromStorage('challenge_templates');
    const template = templates.find(t => t.id === challengeTemplateId && t.status === 'active');
    if (!template) {
      return { challenge_instance: null };
    }

    const instances = this._getFromStorage('challenge_instances');
    const instance = {
      id: this._generateId('challenge_instance'),
      challengeTemplateId: challengeTemplateId,
      title: title || template.title,
      description: description || template.description || '',
      start_date: start_date || null,
      created_at: this._nowIso(),
      status: 'not_started',
      daily_task_duration_minutes: template.default_daily_task_duration_minutes,
      added_to_dashboard: false
    };

    instances.push(instance);
    this._saveToStorage('challenge_instances', instances);

    return { challenge_instance: instance };
  }

  // updateChallengeInstanceSettings(challengeInstanceId, daily_task_duration_minutes, status, added_to_dashboard)
  updateChallengeInstanceSettings(challengeInstanceId, daily_task_duration_minutes, status, added_to_dashboard) {
    const instances = this._getFromStorage('challenge_instances');
    const instance = instances.find(ci => ci.id === challengeInstanceId);
    if (!instance) {
      return { challenge_instance: null };
    }

    if (daily_task_duration_minutes !== undefined) {
      instance.daily_task_duration_minutes = daily_task_duration_minutes;
    }
    if (status !== undefined) {
      instance.status = status;
    }
    if (added_to_dashboard !== undefined) {
      instance.added_to_dashboard = added_to_dashboard;
    }

    this._saveToStorage('challenge_instances', instances);
    return { challenge_instance: instance };
  }

  // addOrUpdateChallengeDayNote(challengeInstanceId, day_number, custom_note)
  addOrUpdateChallengeDayNote(challengeInstanceId, day_number, custom_note) {
    const notes = this._getFromStorage('challenge_day_notes');
    let note = notes.find(n => n.challengeInstanceId === challengeInstanceId && n.day_number === day_number);
    if (note) {
      note.custom_note = custom_note;
      note.created_at = this._nowIso();
    } else {
      note = {
        id: this._generateId('challenge_day_note'),
        challengeInstanceId: challengeInstanceId,
        day_number: day_number,
        custom_note: custom_note,
        created_at: this._nowIso()
      };
      notes.push(note);
    }
    this._saveToStorage('challenge_day_notes', notes);
    return { day_note: note };
  }

  // getMyChallengesOverview()
  getMyChallengesOverview() {
    const instances = this._getFromStorage('challenge_instances');
    const templates = this._getFromStorage('challenge_templates');
    const tmplIndex = this._indexById(templates);

    return instances.map(ci => {
      const template = tmplIndex[ci.challengeTemplateId] || null;
      let progress_percent = 0;
      if (ci.status === 'completed') progress_percent = 100;
      else if (ci.status === 'active') progress_percent = 50;
      else if (ci.status === 'cancelled') progress_percent = 0;
      else progress_percent = 0;

      const challenge_instance = Object.assign({}, ci, { template });
      return { challenge_instance, template, progress_percent };
    });
  }

  // getForumTagOptions()
  getForumTagOptions() {
    const tags = [
      'imposter_syndrome',
      'productivity',
      'mindfulness',
      'confidence',
      'relationships',
      'career',
      'health',
      'stress_management',
      'general_discussion',
      'goals',
      'habits',
      'challenges'
    ];

    return tags.map(t => ({ value: t, label: t.replace(/_/g, ' ') }));
  }

  // getForumThreads(tag, minReplies, limit, offset)
  getForumThreads(tag, minReplies, limit, offset) {
    const threads = this._getFromStorage('forum_threads');
    const limitVal = typeof limit === 'number' ? limit : 50;
    const offsetVal = typeof offset === 'number' ? offset : 0;

    let filtered = threads.slice();

    if (tag) {
      filtered = filtered.filter(th => {
        if (th.primary_tag === tag) return true;
        if (Array.isArray(th.tags)) {
          return th.tags.includes(tag);
        }
        return false;
      });
    }

    if (typeof minReplies === 'number') {
      filtered = filtered.filter(th => (th.reply_count || 0) >= minReplies);
    }

    filtered.sort((a, b) => {
      const aTime = a.last_activity_at || a.created_at;
      const bTime = b.last_activity_at || b.created_at;
      return new Date(bTime) - new Date(aTime);
    });

    const paged = filtered.slice(offsetVal, offsetVal + limitVal);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task9_forumFilterParams',
        JSON.stringify({
          tag,
          minReplies,
          limit,
          offset,
          timestamp: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return paged;
  }

  // getForumThreadDetails(threadId)
  getForumThreadDetails(threadId) {
    const threads = this._getFromStorage('forum_threads');
    const thread = threads.find(t => t.id === threadId) || null;
    if (!thread) {
      return { thread: null, replies: [], is_bookmarked: false };
    }
    const replies = this._getFromStorage('forum_replies')
      .filter(r => r.threadId === threadId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const bookmarks = this._getFromStorage('bookmarked_threads');
    const is_bookmarked = bookmarks.some(b => b.threadId === threadId);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task9_openedThreadSnapshot',
        JSON.stringify({
          threadId: thread.id,
          primary_tag: thread.primary_tag || null,
          tags: Array.isArray(thread.tags) ? thread.tags : [],
          reply_count_at_open: (typeof thread.reply_count === 'number' ? thread.reply_count : replies.length),
          opened_at: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { thread, replies, is_bookmarked };
  }

  // bookmarkForumThread(threadId, bookmark)
  bookmarkForumThread(threadId, bookmark) {
    const bookmarks = this._getFromStorage('bookmarked_threads');
    const existing = bookmarks.find(b => b.threadId === threadId);

    let bookmarked = false;
    let bookmark_record = null;

    if (bookmark) {
      if (existing) {
        bookmarked = true;
        bookmark_record = existing;
      } else {
        bookmark_record = {
          id: this._generateId('bookmarked_thread'),
          threadId: threadId,
          bookmarked_at: this._nowIso()
        };
        bookmarks.push(bookmark_record);
        this._saveToStorage('bookmarked_threads', bookmarks);
        bookmarked = true;
      }
    } else {
      if (existing) {
        const idx = bookmarks.findIndex(b => b.threadId === threadId);
        bookmarks.splice(idx, 1);
        this._saveToStorage('bookmarked_threads', bookmarks);
      }
      bookmarked = false;
    }

    return { bookmarked, bookmark_record };
  }

  // getBookmarkedThreads()
  getBookmarkedThreads() {
    const bookmarks = this._getFromStorage('bookmarked_threads');
    const threads = this._getFromStorage('forum_threads');
    const threadIndex = this._indexById(threads);

    return bookmarks.map(b => {
      const thread = threadIndex[b.threadId] || null;
      const bookmark = Object.assign({}, b, { thread });
      return { bookmark, thread };
    });
  }

  // postForumReply(threadId, body)
  postForumReply(threadId, body) {
    const threads = this._getFromStorage('forum_threads');
    const thread = threads.find(t => t.id === threadId);
    if (!thread) {
      return { reply: null };
    }

    const replies = this._getFromStorage('forum_replies');
    const nowIso = this._nowIso();

    const reply = {
      id: this._generateId('forum_reply'),
      threadId: threadId,
      body: body,
      created_at: nowIso,
      updated_at: null,
      is_edited: false
    };

    replies.push(reply);
    this._saveToStorage('forum_replies', replies);

    thread.reply_count = (thread.reply_count || 0) + 1;
    thread.last_activity_at = nowIso;
    this._saveToStorage('forum_threads', threads);

    return { reply };
  }

  // getDashboardOverview()
  getDashboardOverview() {
    const enrollments = this._getFromStorage('program_enrollments');
    const programs = this._getFromStorage('programs');
    const programIndex = this._indexById(programs);

    const coachingBookings = this._getFromStorage('coaching_session_bookings');
    const coaches = this._getFromStorage('coaches');
    const coachIndex = this._indexById(coaches);

    const goals = this._getFromStorage('goals');

    const routine = this._getOrCreateDefaultHabitRoutine();
    const habit_routine_summary = {
      routine,
      weekly_summary: this._getHabitWeeklySummary(routine)
    };

    const readingList = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');
    const articleIndex = this._indexById(articles);

    const recent_saved_articles = readingList
      .slice()
      .sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))
      .slice(0, 10)
      .map(ri => {
        const article = articleIndex[ri.articleId] || null;
        const reading_list_item = Object.assign({}, ri, { article });
        return { reading_list_item, article };
      });

    const attempts = this._getFromStorage('assessment_attempts');
    const completed_assessments = attempts
      .filter(a => a.status === 'completed')
      .map(a => this._attachAssessmentToAttempt(a));

    const challengeInstances = this._getFromStorage('challenge_instances');
    const challengeTemplates = this._getFromStorage('challenge_templates');
    const tmplIndex = this._indexById(challengeTemplates);

    const challenges = challengeInstances.map(ci => {
      const template = tmplIndex[ci.challengeTemplateId] || null;
      let progress_percent = 0;
      if (ci.status === 'completed') progress_percent = 100;
      else if (ci.status === 'active') progress_percent = 50;
      const challenge_instance = Object.assign({}, ci, { template });
      return { challenge_instance, template, progress_percent };
    });

    const activeSubs = this._getFromStorage('active_subscriptions');
    const plans = this._getFromStorage('subscription_plans');
    let active = activeSubs.find(s => s.status === 'active') || null;
    if (!active) active = activeSubs.find(s => s.status === 'trial') || null;
    let subscription = { active_subscription: null, plan: null };
    if (active) {
      const plan = plans.find(p => p.id === active.planId) || null;
      const active_subscription = Object.assign({}, active, { plan });
      subscription = { active_subscription, plan };
    }

    const bookmarkedThreads = this._getFromStorage('bookmarked_threads');
    const forumThreads = this._getFromStorage('forum_threads');
    const forumIndex = this._indexById(forumThreads);

    const bookmarked_threads = bookmarkedThreads.map(b => {
      const thread = forumIndex[b.threadId] || null;
      const bookmark = Object.assign({}, b, { thread });
      return { bookmark, thread };
    });

    const programsSummary = enrollments.map(e => {
      const program = programIndex[e.programId] || null;
      const enrollmentWithProgram = Object.assign({}, e, { program });
      return { enrollment: enrollmentWithProgram, program };
    });

    const now = new Date();
    const upcoming_sessions = coachingBookings
      .filter(b => b.status === 'scheduled' && new Date(b.start_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .map(b => {
        const coach = coachIndex[b.coachId] || null;
        const booking = Object.assign({}, b, { coach });
        return {
          booking,
          coach_name: coach ? coach.name : null
        };
      });

    return {
      programs: programsSummary,
      upcoming_sessions,
      goals,
      habit_routine_summary,
      recent_saved_articles,
      completed_assessments,
      challenges,
      subscription,
      bookmarked_threads
    };
  }

  // getAboutContent()
  getAboutContent() {
    return this._getFromStorage('about_content', {
      headline: '',
      mission: '',
      approach: '',
      team_members: []
    });
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    const messages = this._getFromStorage('contact_messages');
    const record = {
      id: this._generateId('contact_message'),
      name: name,
      email: email,
      topic: topic || '',
      message: message,
      created_at: this._nowIso()
    };
    messages.push(record);
    this._saveToStorage('contact_messages', messages);
    return { success: true, message: 'Contact form submitted.' };
  }

  // getHelpCenterContent()
  getHelpCenterContent() {
    return this._getFromStorage('help_center_content', {
      faq_sections: [],
      guides: []
    });
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return this._getFromStorage('privacy_policy', {
      last_updated: '',
      content_html: ''
    });
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    return this._getFromStorage('terms_of_use', {
      last_updated: '',
      content_html: ''
    });
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
