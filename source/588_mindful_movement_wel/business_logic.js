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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const keys = [
      'sessions',
      'instructors',
      'favorite_sessions',
      'pricing_plans',
      'checkout_sessions',
      'payment_intents',
      'routines',
      'routine_items',
      'newsletter_subscriptions',
      'followed_instructors',
      'articles',
      'reading_list_items',
      'stress_questions',
      'stress_checkin_sessions',
      'suggested_plans',
      'reminder_schedules',
      'reminder_entries',
      'corporate_inquiries'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Helper tracking keys (single values)
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('active_checkout_session_id')) {
      localStorage.setItem('active_checkout_session_id', '');
    }
    if (!localStorage.getItem('active_payment_intent_id')) {
      localStorage.setItem('active_payment_intent_id', '');
    }
    if (!localStorage.getItem('active_routine_draft_id')) {
      localStorage.setItem('active_routine_draft_id', '');
    }
    if (!localStorage.getItem('active_reminder_schedule_id')) {
      localStorage.setItem('active_reminder_schedule_id', '');
    }
    if (!localStorage.getItem('active_stress_checkin_session_id')) {
      localStorage.setItem('active_stress_checkin_session_id', '');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === '') {
      return Array.isArray(defaultValue) ? [] : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // If parsing fails, reset to default for safety
      return Array.isArray(defaultValue) ? [] : defaultValue;
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

  _safeNumber(value, fallback = 0) {
    const n = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }

  _toArray(val) {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  }

  // ----------------------
  // Helper functions (private)
  // ----------------------

  // Stress check-in helpers
  _getOrCreateStressCheckinSession() {
    const sessions = this._getFromStorage('stress_checkin_sessions');
    let activeId = localStorage.getItem('active_stress_checkin_session_id') || '';

    let existing = null;
    if (activeId) {
      existing = sessions.find(s => s.id === activeId);
    }
    if (!existing) {
      existing = sessions.find(s => !s.completed_at);
    }

    if (existing) {
      localStorage.setItem('active_stress_checkin_session_id', existing.id);
      return existing;
    }

    const newSession = {
      id: this._generateId('stress_checkin_session'),
      started_at: this._nowIso(),
      completed_at: null,
      answers: [],
      suggested_plan_id: null,
      is_plan_saved: false
    };
    sessions.push(newSession);
    this._saveToStorage('stress_checkin_sessions', sessions);
    localStorage.setItem('active_stress_checkin_session_id', newSession.id);
    return newSession;
  }

  _matchSuggestedPlanForStressAnswers(stressSession) {
    const plans = this._getFromStorage('suggested_plans');
    if (!plans.length) return null;

    // Determine stress level range from answers
    const answers = this._toArray(stressSession.answers);
    const stressAnswer = answers.find(a => a.question_key === 'stress_level' || a.question_id === 'stress_level');

    let numericLevel = null;
    if (stressAnswer) {
      const val = stressAnswer.selected_value || stressAnswer.selectedValue || stressAnswer.selected_label || stressAnswer.selectedLabel;
      const parsed = parseInt(val, 10);
      if (Number.isFinite(parsed)) numericLevel = parsed;
    }

    let targetRange = null;
    if (numericLevel !== null) {
      if (numericLevel <= 3) targetRange = 'low';
      else if (numericLevel <= 6) targetRange = 'medium';
      else targetRange = 'high';
    }

    let candidates = plans;
    if (targetRange) {
      const filtered = plans.filter(p => p.stress_level_range === targetRange);
      if (filtered.length) candidates = filtered;
    }

    // Simple choice: shortest duration among candidates
    let best = candidates[0];
    for (const p of candidates) {
      if (this._safeNumber(p.duration_minutes, Infinity) < this._safeNumber(best.duration_minutes, Infinity)) {
        best = p;
      }
    }
    return best || null;
  }

  // Routine helpers
  _getOrCreateRoutineDraft() {
    const routines = this._getFromStorage('routines');
    const routineItems = this._getFromStorage('routine_items');

    let draftId = localStorage.getItem('active_routine_draft_id') || '';
    let routine = draftId ? routines.find(r => r.id === draftId) : null;

    if (!routine) {
      // Try to find any routine marked as user_built weekly (most recent)
      const userRoutines = routines
        .filter(r => r.source === 'user_built' && r.is_weekly)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      if (userRoutines.length) {
        routine = userRoutines[0];
        localStorage.setItem('active_routine_draft_id', routine.id);
      }
    }

    if (!routine) {
      routine = {
        id: this._generateId('routine'),
        name: 'My Weekly Routine (Draft)',
        description: '',
        total_duration_minutes: 0,
        is_weekly: true,
        source: 'user_built',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      routines.push(routine);
      this._saveToStorage('routines', routines);
      localStorage.setItem('active_routine_draft_id', routine.id);
    }

    const items = routineItems.filter(ri => ri.routine_id === routine.id);
    return { routine, items };
  }

  _recalculateRoutineTotalDuration(routineId) {
    const routines = this._getFromStorage('routines');
    const routineItems = this._getFromStorage('routine_items');
    const sessions = this._getFromStorage('sessions');

    const routine = routines.find(r => r.id === routineId);
    if (!routine) return null;

    const items = routineItems.filter(ri => ri.routine_id === routineId);
    let total = 0;
    for (const item of items) {
      const session = sessions.find(s => s.id === item.session_id);
      if (session) total += this._safeNumber(session.duration_minutes, 0);
    }
    routine.total_duration_minutes = total;
    routine.updated_at = this._nowIso();
    this._saveToStorage('routines', routines);
    return routine;
  }

  // Checkout helpers
  _getOrCreateCheckoutSession() {
    const sessions = this._getFromStorage('checkout_sessions');
    let activeId = localStorage.getItem('active_checkout_session_id') || '';
    let existing = activeId ? sessions.find(s => s.id === activeId) : null;

    if (!existing) {
      // Try to find latest in_progress or payment_pending
      const open = sessions
        .filter(s => s.status === 'in_progress' || s.status === 'payment_pending')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      if (open.length) {
        existing = open[0];
        localStorage.setItem('active_checkout_session_id', existing.id);
      }
    }

    if (!existing) {
      // No active checkout; create a shell with null plan info
      const newSession = {
        id: this._generateId('checkout_session'),
        plan_id: null,
        plan_name: '',
        billing_frequency: 'monthly',
        price: 0,
        currency: 'usd',
        email: '',
        full_name: '',
        password: null,
        status: 'in_progress',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      sessions.push(newSession);
      this._saveToStorage('checkout_sessions', sessions);
      localStorage.setItem('active_checkout_session_id', newSession.id);
      return newSession;
    }

    return existing;
  }

  _getOrCreatePaymentIntent() {
    const paymentIntents = this._getFromStorage('payment_intents');
    const checkoutSessions = this._getFromStorage('checkout_sessions');

    let activeCheckoutId = localStorage.getItem('active_checkout_session_id') || '';
    let checkout = activeCheckoutId ? checkoutSessions.find(c => c.id === activeCheckoutId) : null;
    if (!checkout) {
      checkout = this._getOrCreateCheckoutSession();
      activeCheckoutId = checkout.id;
    }

    let activeIntentId = localStorage.getItem('active_payment_intent_id') || '';
    let intent = activeIntentId ? paymentIntents.find(p => p.id === activeIntentId) : null;

    if (!intent) {
      const forSession = paymentIntents
        .filter(p => p.checkout_session_id === activeCheckoutId)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      if (forSession.length) {
        intent = forSession[0];
      }
    }

    if (!intent) {
      intent = {
        id: this._generateId('payment_intent'),
        checkout_session_id: activeCheckoutId,
        payment_method: 'credit_card',
        status: 'initiated',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      paymentIntents.push(intent);
      this._saveToStorage('payment_intents', paymentIntents);
      localStorage.setItem('active_payment_intent_id', intent.id);
    }

    return intent;
  }

  // Reminder helpers
  _getOrCreateReminderSchedule() {
    const schedules = this._getFromStorage('reminder_schedules');
    const entries = this._getFromStorage('reminder_entries');

    let activeId = localStorage.getItem('active_reminder_schedule_id') || '';
    let schedule = activeId ? schedules.find(s => s.id === activeId) : null;

    let existsBefore = true;

    if (!schedule) {
      existsBefore = false;
      schedule = {
        id: this._generateId('reminder_schedule'),
        days_per_week: 3,
        selected_days: ['monday', 'wednesday', 'friday'],
        notification_in_app: true,
        notification_sms: false,
        notification_email: false,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      schedules.push(schedule);
      this._saveToStorage('reminder_schedules', schedules);
      localStorage.setItem('active_reminder_schedule_id', schedule.id);
    }

    const scheduleEntries = entries.filter(e => e.schedule_id === schedule.id);
    return { schedule, entries: scheduleEntries, existed: existsBefore };
  }

  // Article search helper
  _applyArticleSearchFilters(articles, query, filters) {
    let result = Array.isArray(articles) ? articles.slice() : [];

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      result = result.filter(a => {
        return (
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.excerpt && a.excerpt.toLowerCase().includes(q)) ||
          (a.content && a.content.toLowerCase().includes(q)) ||
          (Array.isArray(a.tags) && a.tags.some(t => String(t).toLowerCase().includes(q)))
        );
      });
    }

    if (filters && typeof filters === 'object') {
      const { dateRange, category, tags } = filters;

      if (dateRange && dateRange !== 'all_time') {
        const now = new Date();
        let days = 0;
        if (dateRange === 'last_7_days') days = 7;
        else if (dateRange === 'last_30_days') days = 30;
        else if (dateRange === 'last_90_days') days = 90;

        if (days > 0) {
          const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          result = result.filter(a => {
            const pub = new Date(a.published_at || a.publishedAt || 0);
            return pub >= cutoff;
          });
        }
      }

      if (category) {
        result = result.filter(a => a.category === category);
      }

      if (tags && Array.isArray(tags) && tags.length) {
        result = result.filter(a => {
          if (!Array.isArray(a.tags) || !a.tags.length) return false;
          return tags.some(t => a.tags.includes(t));
        });
      }
    }

    return result;
  }

  // Instructor helper (label resolution)
  _resolveInstructorStylesAndSpecialties(instructor) {
    const values = [];
    if (!instructor) return values;
    if (instructor.primary_style) values.push(instructor.primary_style);
    if (Array.isArray(instructor.specialties)) {
      for (const s of instructor.specialties) {
        if (typeof s === 'string' && !values.includes(s)) values.push(s);
      }
    }
    return values;
  }

  // Session card enrichment
  _enrichSessionCardsWithInstructor(sessions) {
    const instructors = this._getFromStorage('instructors');
    return this._toArray(sessions).map(s => {
      const inst = instructors.find(i => i.id === s.instructor_id) || null;
      return {
        session_id: s.id,
        title: s.title || '',
        subtitle: s.subtitle || '',
        level: s.level || null,
        primary_style: s.primary_style || null,
        duration_minutes: this._safeNumber(s.duration_minutes, 0),
        focus_areas: this._toArray(s.focus_areas),
        tags: this._toArray(s.tags),
        rating: typeof s.rating === 'number' ? s.rating : null,
        rating_count: this._safeNumber(s.rating_count, 0),
        popularity_score: this._safeNumber(s.popularity_score, 0),
        thumbnail_image_url: s.thumbnail_image_url || '',
        instructor_name: inst ? inst.name : null,
        is_downloadable_offline: !!s.is_downloadable_offline
      };
    });
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomeFeaturedContent
  getHomeFeaturedContent() {
    const sessions = this._getFromStorage('sessions');
    const instructors = this._getFromStorage('instructors');
    const articles = this._getFromStorage('articles');

    // Featured sessions: top 3 by popularity_score, fallback to rating
    const sortedSessions = sessions.slice().sort((a, b) => {
      const psA = this._safeNumber(a.popularity_score, 0);
      const psB = this._safeNumber(b.popularity_score, 0);
      if (psA !== psB) return psB - psA;
      const rA = this._safeNumber(a.rating, 0);
      const rB = this._safeNumber(b.rating, 0);
      return rB - rA;
    });
    const featuredSessionsRaw = sortedSessions.slice(0, 3);
    const featured_sessions = this._enrichSessionCardsWithInstructor(featuredSessionsRaw).map(s => ({
      session_id: s.session_id,
      title: s.title,
      subtitle: s.subtitle,
      level: s.level,
      primary_style: s.primary_style,
      duration_minutes: s.duration_minutes,
      tags: s.tags,
      rating: s.rating,
      instructor_name: s.instructor_name,
      thumbnail_image_url: s.thumbnail_image_url
    }));

    // Featured instructors: top 3 by years_experience then rating
    const featured_instructors = instructors
      .slice()
      .sort((a, b) => {
        const yA = this._safeNumber(a.years_experience, 0);
        const yB = this._safeNumber(b.years_experience, 0);
        if (yA !== yB) return yB - yA;
        const rA = this._safeNumber(a.rating, 0);
        const rB = this._safeNumber(b.rating, 0);
        return rB - rA;
      })
      .slice(0, 3)
      .map(i => ({
        instructor_id: i.id,
        name: i.name || '',
        primary_style: i.primary_style || null,
        specialties: this._toArray(i.specialties),
        rating: typeof i.rating === 'number' ? i.rating : null,
        years_experience: this._safeNumber(i.years_experience, 0),
        avatar_image_url: i.avatar_image_url || ''
      }));

    // Featured articles: 3 most recent
    const featured_articles = articles
      .slice()
      .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
      .slice(0, 3)
      .map(a => ({
        article_id: a.id,
        title: a.title || '',
        slug: a.slug || '',
        excerpt: a.excerpt || '',
        category: a.category || null,
        primary_topic: a.primary_topic || null,
        published_at: a.published_at || null,
        read_time_minutes: this._safeNumber(a.read_time_minutes, 0),
        image_url: a.image_url || ''
      }));

    return {
      hero: {
        headline: 'Mindful movement, made gentle.',
        subheadline: 'Short, calming sessions to ease stress, improve sleep, and move with kindness.',
        primary_cta_label: 'Explore Sessions',
        secondary_cta_label: 'Build Your Routine'
      },
      key_stats: [
        { label: 'Sessions', value: String(sessions.length) },
        { label: 'Guides', value: String(instructors.length) },
        { label: 'Articles', value: String(articles.length) }
      ],
      featured_sessions,
      featured_instructors,
      featured_articles
    };
  }

  // Newsletter options
  getNewsletterOptions() {
    const topics = [
      {
        value: 'stress_relief',
        label: 'Stress Relief',
        description: 'Breathwork, gentle movement, and tips to ease daily stress.'
      },
      {
        value: 'better_sleep',
        label: 'Better Sleep',
        description: 'Wind-down routines and science-backed guidance for deeper rest.'
      },
      {
        value: 'low_impact_fitness',
        label: 'Low-Impact Fitness',
        description: 'Joint-friendly strength and mobility sessions to build consistency.'
      }
    ];

    const frequencies = [
      { value: 'daily', label: 'Daily' },
      { value: 'two_three_times_per_week', label: '2–3 times per week' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const preferred_times_of_day = [
      { value: 'morning_6_9', label: 'Morning (6–9 am)' },
      { value: 'midday_11_2', label: 'Midday (11 am–2 pm)' },
      { value: 'afternoon_2_5', label: 'Afternoon (2–5 pm)' },
      { value: 'evening_5_9', label: 'Evening (5–9 pm)' },
      { value: 'night_9_12', label: 'Night (9 pm–12 am)' }
    ];

    const content_preferences = [
      { value: 'tips_only', label: 'Tips only' },
      { value: 'product_updates_only', label: 'Product updates only' },
      { value: 'tips_and_product_updates', label: 'Tips + product updates' },
      { value: 'all', label: 'All content' }
    ];

    const defaults = {
      frequency: 'weekly',
      preferred_time_of_day: 'morning_6_9',
      content_preference: 'tips_only'
    };

    return {
      topics,
      frequencies,
      preferred_times_of_day,
      content_preferences,
      defaults
    };
  }

  // subscribeNewsletter
  subscribeNewsletter(email, selectedTopics, frequency, preferredTimeOfDay, contentPreference, wantsBetaUpdates) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    const topics = this._toArray(selectedTopics);

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      email: email || '',
      topic_stress_relief: topics.includes('stress_relief'),
      topic_better_sleep: topics.includes('better_sleep'),
      topic_low_impact_fitness: topics.includes('low_impact_fitness'),
      frequency,
      preferred_time_of_day: preferredTimeOfDay,
      content_preference: contentPreference,
      wants_beta_updates: !!wantsBetaUpdates,
      created_at: this._nowIso()
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription_id: subscription.id,
      email: subscription.email,
      topic_stress_relief: subscription.topic_stress_relief,
      topic_better_sleep: subscription.topic_better_sleep,
      topic_low_impact_fitness: subscription.topic_low_impact_fitness,
      frequency: subscription.frequency,
      preferred_time_of_day: subscription.preferred_time_of_day,
      content_preference: subscription.content_preference,
      wants_beta_updates: subscription.wants_beta_updates,
      created_at: subscription.created_at,
      message: 'Subscribed successfully.'
    };
  }

  // startStressCheckin
  startStressCheckin() {
    const session = this._getOrCreateStressCheckinSession();
    const questions = this._getFromStorage('stress_questions').slice().sort((a, b) => this._safeNumber(a.order, 0) - this._safeNumber(b.order, 0));

    const mappedQuestions = questions.map(q => ({
      question_id: q.id,
      order: this._safeNumber(q.order, 0),
      text: q.text || '',
      question_key: q.question_key,
      input_type: q.input_type,
      choices: this._toArray(q.choices).map(ch => {
        if (typeof ch === 'string') {
          return { value: ch, label: ch };
        }
        // assume object with value/label
        return {
          value: ch.value,
          label: ch.label
        };
      })
    }));

    return {
      stress_checkin_session_id: session.id,
      started_at: session.started_at,
      questions: mappedQuestions
    };
  }

  // submitStressCheckinAnswers
  submitStressCheckinAnswers(stressCheckinSessionId, answers) {
    const stressSessions = this._getFromStorage('stress_checkin_sessions');
    const idx = stressSessions.findIndex(s => s.id === stressCheckinSessionId);
    if (idx === -1) {
      return {
        stress_checkin_session_id: null,
        completed_at: null,
        suggested_plan: null,
        is_plan_saved: false
      };
    }

    const rawAnswers = this._toArray(answers).map(a => ({
      question_id: a.questionId,
      selected_value: a.selectedValue,
      selected_label: a.selectedLabel,
      // Keep question_key if present from caller for easier matching
      question_key: a.question_key || a.questionKey || null
    }));

    stressSessions[idx].answers = rawAnswers;
    stressSessions[idx].completed_at = this._nowIso();

    // Attempt to attach question_key by looking up StressQuestion config
    const questionsConfig = this._getFromStorage('stress_questions');
    for (const ans of stressSessions[idx].answers) {
      if (!ans.question_key && ans.question_id) {
        const q = questionsConfig.find(qq => qq.id === ans.question_id);
        if (q) ans.question_key = q.question_key;
      }
    }

    const matchedPlan = this._matchSuggestedPlanForStressAnswers(stressSessions[idx]);
    stressSessions[idx].suggested_plan_id = matchedPlan ? matchedPlan.id : null;

    this._saveToStorage('stress_checkin_sessions', stressSessions);

    let suggested_plan = null;
    if (matchedPlan) {
      const allSessions = this._getFromStorage('sessions');
      const planSessions = this._toArray(matchedPlan.session_ids).map(id => allSessions.find(s => s.id === id)).filter(Boolean);
      const enriched = this._enrichSessionCardsWithInstructor(planSessions).map(s => ({
        session_id: s.session_id,
        title: s.title,
        level: s.level,
        primary_style: s.primary_style,
        duration_minutes: s.duration_minutes,
        tags: s.tags,
        thumbnail_image_url: s.thumbnail_image_url
      }));

      suggested_plan = {
        plan_id: matchedPlan.id,
        name: matchedPlan.name || '',
        description: matchedPlan.description || '',
        stress_level_range: matchedPlan.stress_level_range || null,
        duration_minutes: this._safeNumber(matchedPlan.duration_minutes, 0),
        focus_tags: this._toArray(matchedPlan.focus_tags),
        sessions: enriched
      };
    }

    return {
      stress_checkin_session_id: stressSessions[idx].id,
      completed_at: stressSessions[idx].completed_at,
      suggested_plan,
      is_plan_saved: !!stressSessions[idx].is_plan_saved
    };
  }

  // saveSuggestedPlanFromStressCheckin
  saveSuggestedPlanFromStressCheckin(stressCheckinSessionId, createWeeklyRoutine) {
    const stressSessions = this._getFromStorage('stress_checkin_sessions');
    const routines = this._getFromStorage('routines');
    const routineItems = this._getFromStorage('routine_items');
    const plans = this._getFromStorage('suggested_plans');

    const idx = stressSessions.findIndex(s => s.id === stressCheckinSessionId);
    if (idx === -1) {
      return {
        success: false,
        is_plan_saved: false,
        created_routine_id: null,
        created_routine_name: null,
        message: 'Stress check-in session not found.'
      };
    }

    const session = stressSessions[idx];
    if (!session.suggested_plan_id) {
      return {
        success: false,
        is_plan_saved: false,
        created_routine_id: null,
        created_routine_name: null,
        message: 'No suggested plan associated with this session.'
      };
    }

    const plan = plans.find(p => p.id === session.suggested_plan_id);
    if (!plan) {
      return {
        success: false,
        is_plan_saved: false,
        created_routine_id: null,
        created_routine_name: null,
        message: 'Suggested plan not found.'
      };
    }

    session.is_plan_saved = true;

    let createdRoutineId = null;
    let createdRoutineName = null;

    if (createWeeklyRoutine) {
      const newRoutine = {
        id: this._generateId('routine'),
        name: plan.name || 'Stress Check-in Plan',
        description: plan.description || '',
        total_duration_minutes: 0,
        is_weekly: true,
        source: 'suggested',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      routines.push(newRoutine);

      const sessionIds = this._toArray(plan.session_ids);
      let position = 1;
      for (const sId of sessionIds) {
        const ri = {
          id: this._generateId('routine_item'),
          routine_id: newRoutine.id,
          session_id: sId,
          position,
          day_of_week: 'unscheduled',
          notes: ''
        };
        position += 1;
        routineItems.push(ri);
      }

      this._saveToStorage('routine_items', routineItems);
      this._saveToStorage('routines', routines);
      this._recalculateRoutineTotalDuration(newRoutine.id);

      createdRoutineId = newRoutine.id;
      createdRoutineName = newRoutine.name;
    }

    this._saveToStorage('stress_checkin_sessions', stressSessions);

    return {
      success: true,
      is_plan_saved: true,
      created_routine_id: createdRoutineId,
      created_routine_name: createdRoutineName,
      message: 'Suggested plan saved successfully.'
    };
  }

  // getSessionsFilterOptions
  getSessionsFilterOptions() {
    const sessions = this._getFromStorage('sessions');

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    const duration_ranges = [
      { id: 'under_10', label: 'Under 10 min', min_minutes: 0, max_minutes: 10 },
      { id: '10_20', label: '10–20 min', min_minutes: 10, max_minutes: 20 },
      { id: '15_25', label: '15–25 min', min_minutes: 15, max_minutes: 25 },
      { id: '20_30', label: '20–30 min', min_minutes: 20, max_minutes: 30 },
      { id: '30_plus', label: '30+ min', min_minutes: 30, max_minutes: 999 }
    ];

    // Collect focus areas and tags from existing sessions
    const focusSet = new Set();
    const tagSet = new Set();
    for (const s of sessions) {
      (s.focus_areas || []).forEach(f => focusSet.add(f));
      (s.tags || []).forEach(t => tagSet.add(t));
    }

    const focus_areas = Array.from(focusSet).map(v => ({ value: v, label: String(v).replace(/_/g, ' ') }));
    const tags = Array.from(tagSet).map(v => ({ value: v, label: String(v).replace(/_/g, ' ') }));

    const sort_options = [
      { value: 'most_popular', label: 'Most popular' },
      { value: 'highest_rated', label: 'Highest rated' },
      { value: 'newest', label: 'Newest' },
      { value: 'duration_asc', label: 'Shortest first' },
      { value: 'duration_desc', label: 'Longest first' }
    ];

    const default_sort = 'most_popular';

    return {
      levels,
      duration_ranges,
      focus_areas,
      tags,
      sort_options,
      default_sort
    };
  }

  // searchSessions
  searchSessions(query, filters, sortBy, page, pageSize) {
    const allSessions = this._getFromStorage('sessions');
    let filtered = allSessions.slice();

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      filtered = filtered.filter(s => {
        return (
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.subtitle && s.subtitle.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q))
        );
      });
    }

    if (filters && typeof filters === 'object') {
      const {
        levels,
        minDurationMinutes,
        maxDurationMinutes,
        focusAreas,
        tags,
        downloadableOnly,
        instructorId
      } = filters;

      if (Array.isArray(levels) && levels.length) {
        filtered = filtered.filter(s => levels.includes(s.level));
      }

      if (typeof minDurationMinutes === 'number') {
        filtered = filtered.filter(s => this._safeNumber(s.duration_minutes, 0) >= minDurationMinutes);
      }

      if (typeof maxDurationMinutes === 'number') {
        filtered = filtered.filter(s => this._safeNumber(s.duration_minutes, 0) <= maxDurationMinutes);
      }

      if (Array.isArray(focusAreas) && focusAreas.length) {
        filtered = filtered.filter(s => {
          if (!Array.isArray(s.focus_areas)) return false;
          return focusAreas.some(f => s.focus_areas.includes(f));
        });
      }

      if (Array.isArray(tags) && tags.length) {
        filtered = filtered.filter(s => {
          if (!Array.isArray(s.tags)) return false;
          return tags.some(t => s.tags.includes(t));
        });
      }

      if (downloadableOnly) {
        filtered = filtered.filter(s => !!s.is_downloadable_offline);
      }

      if (instructorId) {
        filtered = filtered.filter(s => s.instructor_id === instructorId);
      }
    }

    const applied_sort = sortBy || 'most_popular';

    filtered.sort((a, b) => {
      switch (applied_sort) {
        case 'highest_rated': {
          const rA = this._safeNumber(a.rating, 0);
          const rB = this._safeNumber(b.rating, 0);
          if (rA !== rB) return rB - rA;
          return this._safeNumber(b.rating_count, 0) - this._safeNumber(a.rating_count, 0);
        }
        case 'newest': {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
        case 'duration_asc': {
          return this._safeNumber(a.duration_minutes, 0) - this._safeNumber(b.duration_minutes, 0);
        }
        case 'duration_desc': {
          return this._safeNumber(b.duration_minutes, 0) - this._safeNumber(a.duration_minutes, 0);
        }
        case 'most_popular':
        default: {
          const pA = this._safeNumber(a.popularity_score, 0);
          const pB = this._safeNumber(b.popularity_score, 0);
          if (pA !== pB) return pB - pA;
          const rA = this._safeNumber(a.rating, 0);
          const rB = this._safeNumber(b.rating, 0);
          return rB - rA;
        }
      }
    });

    const total = filtered.length;
    const currentPage = this._safeNumber(page, 1) || 1;
    const size = this._safeNumber(pageSize, 20) || 20;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageItems = filtered.slice(start, end);
    const sessions = this._enrichSessionCardsWithInstructor(pageItems);

    return {
      sessions,
      total,
      page: currentPage,
      page_size: size,
      has_more: end < total,
      applied_sort
    };
  }

  // getSessionDetail
  getSessionDetail(sessionId) {
    const sessions = this._getFromStorage('sessions');
    const instructors = this._getFromStorage('instructors');
    const favorites = this._getFromStorage('favorite_sessions');

    const s = sessions.find(ss => ss.id === sessionId);
    if (!s) return null;

    const instructor = instructors.find(i => i.id === s.instructor_id) || null;
    const is_favorited = favorites.some(f => f.session_id === s.id);

    // Instrumentation for task completion tracking
    try {
      if (s && s.level === 'beginner') {
        localStorage.setItem('task5_previewedBeginnerClassId', sessionId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      session_id: s.id,
      title: s.title || '',
      subtitle: s.subtitle || '',
      description: s.description || '',
      level: s.level || null,
      primary_style: s.primary_style || null,
      focus_areas: this._toArray(s.focus_areas),
      tags: this._toArray(s.tags),
      duration_minutes: this._safeNumber(s.duration_minutes, 0),
      rating: typeof s.rating === 'number' ? s.rating : null,
      rating_count: this._safeNumber(s.rating_count, 0),
      popularity_score: this._safeNumber(s.popularity_score, 0),
      created_at: s.created_at || null,
      thumbnail_image_url: s.thumbnail_image_url || '',
      video_preview_url: s.video_preview_url || '',
      is_downloadable_offline: !!s.is_downloadable_offline,
      instructor: instructor
        ? {
            instructor_id: instructor.id,
            name: instructor.name || '',
            primary_style: instructor.primary_style || null,
            specialties: this._toArray(instructor.specialties),
            rating: typeof instructor.rating === 'number' ? instructor.rating : null,
            rating_count: this._safeNumber(instructor.rating_count, 0),
            years_experience: this._safeNumber(instructor.years_experience, 0),
            avatar_image_url: instructor.avatar_image_url || '',
            location: instructor.location || ''
          }
        : null,
      is_favorited
    };
  }

  // addSessionToFavorites
  addSessionToFavorites(sessionId) {
    const sessions = this._getFromStorage('sessions');
    const favorites = this._getFromStorage('favorite_sessions');

    const existsSession = sessions.find(s => s.id === sessionId);
    if (!existsSession) {
      return {
        success: false,
        favorite_session: null,
        is_favorited: false,
        message: 'Session not found.'
      };
    }

    const existingFav = favorites.find(f => f.session_id === sessionId);
    if (existingFav) {
      return {
        success: true,
        favorite_session: {
          favorite_session_id: existingFav.id,
          session_id: existingFav.session_id,
          added_at: existingFav.added_at
        },
        is_favorited: true,
        message: 'Session already in favorites.'
      };
    }

    const fav = {
      id: this._generateId('favorite_session'),
      session_id: sessionId,
      added_at: this._nowIso()
    };
    favorites.push(fav);
    this._saveToStorage('favorite_sessions', favorites);

    return {
      success: true,
      favorite_session: {
        favorite_session_id: fav.id,
        session_id: fav.session_id,
        added_at: fav.added_at
      },
      is_favorited: true,
      message: 'Session added to favorites.'
    };
  }

  // removeSessionFromFavorites
  removeSessionFromFavorites(sessionId) {
    const favorites = this._getFromStorage('favorite_sessions');
    const index = favorites.findIndex(f => f.session_id === sessionId);

    if (index === -1) {
      return {
        success: true,
        is_favorited: false,
        message: 'Session was not in favorites.'
      };
    }

    favorites.splice(index, 1);
    this._saveToStorage('favorite_sessions', favorites);

    return {
      success: true,
      is_favorited: false,
      message: 'Session removed from favorites.'
    };
  }

  // getPricingPlans
  getPricingPlans(billingFrequency) {
    const plansRaw = this._getFromStorage('pricing_plans');
    const freq = billingFrequency === 'yearly' ? 'yearly' : 'monthly';

    const activePlans = plansRaw.filter(p => p.status === 'active');

    const plansWithDisplay = activePlans.map(p => {
      const display_price = freq === 'monthly' ? this._safeNumber(p.monthly_price, 0) : this._safeNumber(p.yearly_price, 0);
      const currency = p.currency || 'usd';
      const symbol = currency === 'eur' ? '€' : currency === 'gbp' ? '£' : '$';
      const suffix = freq === 'monthly' ? '/mo' : '/yr';

      return {
        plan_id: p.id,
        name: p.name || '',
        headline: p.headline || '',
        description: p.description || '',
        monthly_price: this._safeNumber(p.monthly_price, 0),
        yearly_price: this._safeNumber(p.yearly_price, 0),
        currency,
        display_price,
        display_price_formatted: `${symbol}${display_price}${suffix}`,
        includes_offline_downloads: !!p.includes_offline_downloads,
        features: this._toArray(p.features),
        status: p.status,
        badge_label: p.badge_label || '',
        is_cheapest_with_offline: false
      };
    });

    // Determine cheapest plan with offline downloads (by monthly_price)
    const offlinePlans = activePlans.filter(p => p.includes_offline_downloads);
    if (offlinePlans.length) {
      let cheapest = offlinePlans[0];
      for (const p of offlinePlans) {
        if (this._safeNumber(p.monthly_price, Infinity) < this._safeNumber(cheapest.monthly_price, Infinity)) {
          cheapest = p;
        }
      }
      const cheapestId = cheapest.id;
      for (const p of plansWithDisplay) {
        if (p.plan_id === cheapestId) p.is_cheapest_with_offline = true;
      }
    }

    return {
      billing_frequency: freq,
      plans: plansWithDisplay
    };
  }

  // startCheckoutForPlan
  startCheckoutForPlan(planId, billingFrequency) {
    const plans = this._getFromStorage('pricing_plans');
    const plan = plans.find(p => p.id === planId && p.status === 'active');

    if (!plan) {
      return {
        checkout_session_id: null,
        plan_id: null,
        plan_name: '',
        billing_frequency: billingFrequency || 'monthly',
        price: 0,
        currency: 'usd',
        status: 'cancelled',
        created_at: this._nowIso(),
        message: 'Plan not found or not active.'
      };
    }

    const freq = billingFrequency === 'yearly' ? 'yearly' : 'monthly';
    const price = freq === 'monthly' ? this._safeNumber(plan.monthly_price, 0) : this._safeNumber(plan.yearly_price, 0);

    const checkoutSessions = this._getFromStorage('checkout_sessions');

    const newSession = {
      id: this._generateId('checkout_session'),
      plan_id: plan.id,
      plan_name: plan.name || '',
      billing_frequency: freq,
      price,
      currency: plan.currency || 'usd',
      email: '',
      full_name: '',
      password: null,
      status: 'in_progress',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    checkoutSessions.push(newSession);
    this._saveToStorage('checkout_sessions', checkoutSessions);
    localStorage.setItem('active_checkout_session_id', newSession.id);

    return {
      checkout_session_id: newSession.id,
      plan_id: newSession.plan_id,
      plan_name: newSession.plan_name,
      billing_frequency: newSession.billing_frequency,
      price: newSession.price,
      currency: newSession.currency,
      status: newSession.status,
      created_at: newSession.created_at
    };
  }

  // getActiveCheckoutSession
  getActiveCheckoutSession() {
    const checkoutSessions = this._getFromStorage('checkout_sessions');
    const plans = this._getFromStorage('pricing_plans');

    let activeId = localStorage.getItem('active_checkout_session_id') || '';
    let session = activeId ? checkoutSessions.find(s => s.id === activeId) : null;

    if (!session) {
      // fallback: latest open session
      const open = checkoutSessions
        .filter(s => s.status === 'in_progress' || s.status === 'payment_pending')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      if (open.length) {
        session = open[0];
        localStorage.setItem('active_checkout_session_id', session.id);
      }
    }

    if (!session) {
      return {
        has_active_session: false,
        session: null
      };
    }

    const plan = session.plan_id ? plans.find(p => p.id === session.plan_id) : null;

    return {
      has_active_session: true,
      session: {
        checkout_session_id: session.id,
        plan_id: session.plan_id,
        plan_name: session.plan_name,
        billing_frequency: session.billing_frequency,
        price: this._safeNumber(session.price, 0),
        currency: session.currency || 'usd',
        email: session.email || '',
        full_name: session.full_name || '',
        status: session.status,
        created_at: session.created_at,
        updated_at: session.updated_at || null,
        // Foreign key resolution: include full plan object for convenience
        plan: plan || null
      }
    };
  }

  // updateCheckoutCustomerInfo
  updateCheckoutCustomerInfo(email, fullName, password) {
    const checkoutSessions = this._getFromStorage('checkout_sessions');
    let activeId = localStorage.getItem('active_checkout_session_id') || '';
    let sessionIndex = activeId ? checkoutSessions.findIndex(s => s.id === activeId) : -1;

    if (sessionIndex === -1) {
      return {
        success: false,
        checkout_session: null,
        message: 'No active checkout session found.'
      };
    }

    const session = checkoutSessions[sessionIndex];
    session.email = email || '';
    session.full_name = fullName || '';
    if (typeof password === 'string') {
      session.password = password;
    }
    session.status = 'payment_pending';
    session.updated_at = this._nowIso();

    checkoutSessions[sessionIndex] = session;
    this._saveToStorage('checkout_sessions', checkoutSessions);

    return {
      success: true,
      checkout_session: {
        checkout_session_id: session.id,
        plan_name: session.plan_name,
        billing_frequency: session.billing_frequency,
        price: this._safeNumber(session.price, 0),
        currency: session.currency || 'usd',
        email: session.email,
        full_name: session.full_name,
        status: session.status
      },
      message: 'Customer information updated.'
    };
  }

  // getPaymentOptions
  getPaymentOptions() {
    const { has_active_session, session } = this.getActiveCheckoutSession();
    const checkoutSessions = this._getFromStorage('checkout_sessions');
    const paymentIntents = this._getFromStorage('payment_intents');

    let selected_method = 'credit_card';

    if (has_active_session && session) {
      const activeId = localStorage.getItem('active_checkout_session_id') || '';
      const checkout = checkoutSessions.find(c => c.id === activeId);
      if (checkout) {
        const intents = paymentIntents
          .filter(p => p.checkout_session_id === checkout.id)
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        if (intents.length) {
          selected_method = intents[0].payment_method || 'credit_card';
        }
      }
    }

    const available_methods = [
      { value: 'credit_card', label: 'Credit card', description: 'Visa, Mastercard, Amex, and more.' },
      { value: 'debit_card', label: 'Debit card', description: 'Use your bank debit card.' },
      { value: 'paypal', label: 'PayPal', description: 'Pay securely with PayPal.' },
      { value: 'apple_pay', label: 'Apple Pay', description: 'Fast checkout with Apple Pay.' },
      { value: 'google_pay', label: 'Google Pay', description: 'Fast checkout with Google Pay.' }
    ];

    const order_summary = has_active_session && session
      ? {
          plan_name: session.plan_name,
          billing_frequency: session.billing_frequency,
          price: this._safeNumber(session.price, 0),
          currency: session.currency || 'usd'
        }
      : {
          plan_name: '',
          billing_frequency: 'monthly',
          price: 0,
          currency: 'usd'
        };

    return {
      available_methods,
      selected_method,
      order_summary
    };
  }

  // selectPaymentMethod
  selectPaymentMethod(paymentMethod) {
    const validMethods = ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay'];
    if (!validMethods.includes(paymentMethod)) {
      return {
        payment_intent: null,
        success: false,
        message: 'Invalid payment method.'
      };
    }

    const paymentIntents = this._getFromStorage('payment_intents');
    const checkout = this._getOrCreateCheckoutSession();

    let intent = paymentIntents
      .filter(p => p.checkout_session_id === checkout.id)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];

    if (!intent) {
      intent = {
        id: this._generateId('payment_intent'),
        checkout_session_id: checkout.id,
        payment_method: paymentMethod,
        status: 'method_selected',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      paymentIntents.push(intent);
    } else {
      intent.payment_method = paymentMethod;
      intent.status = 'method_selected';
      intent.updated_at = this._nowIso();
      const idx = paymentIntents.findIndex(p => p.id === intent.id);
      paymentIntents[idx] = intent;
    }

    this._saveToStorage('payment_intents', paymentIntents);
    localStorage.setItem('active_payment_intent_id', intent.id);

    return {
      payment_intent: {
        payment_intent_id: intent.id,
        checkout_session_id: intent.checkout_session_id,
        payment_method: intent.payment_method,
        status: intent.status,
        created_at: intent.created_at
      },
      success: true,
      message: 'Payment method selected.'
    };
  }

  // submitPayment
  submitPayment(paymentMethod, paymentDetails) {
    const validMethods = ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay'];
    if (!validMethods.includes(paymentMethod)) {
      return {
        payment_intent: null,
        checkout_session_status: 'cancelled',
        success: false,
        message: 'Invalid payment method.'
      };
    }

    const paymentIntents = this._getFromStorage('payment_intents');
    const checkoutSessions = this._getFromStorage('checkout_sessions');

    let checkout = this._getOrCreateCheckoutSession();
    const checkoutIdx = checkoutSessions.findIndex(c => c.id === checkout.id);
    if (checkoutIdx === -1) {
      return {
        payment_intent: null,
        checkout_session_status: 'cancelled',
        success: false,
        message: 'No checkout session available.'
      };
    }

    let intent = paymentIntents
      .filter(p => p.checkout_session_id === checkout.id)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];

    if (!intent) {
      intent = {
        id: this._generateId('payment_intent'),
        checkout_session_id: checkout.id,
        payment_method: paymentMethod,
        status: 'initiated',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      paymentIntents.push(intent);
    }

    // Simulate processing and success
    intent.payment_method = paymentMethod;
    intent.status = 'succeeded';
    intent.updated_at = this._nowIso();
    const piIdx = paymentIntents.findIndex(p => p.id === intent.id);
    paymentIntents[piIdx] = intent;
    this._saveToStorage('payment_intents', paymentIntents);

    checkout.status = 'completed';
    checkout.updated_at = this._nowIso();
    checkoutSessions[checkoutIdx] = checkout;
    this._saveToStorage('checkout_sessions', checkoutSessions);

    return {
      payment_intent: {
        payment_intent_id: intent.id,
        status: intent.status
      },
      checkout_session_status: checkout.status,
      success: true,
      message: 'Payment processed (simulated).'
    };
  }

  // getRoutineBuilderFilterOptions
  getRoutineBuilderFilterOptions() {
    const duration_ranges = [
      { id: 'short_10_20', label: '10–20 min', min_minutes: 10, max_minutes: 20 },
      { id: 'under_10', label: 'Under 10 min', min_minutes: 0, max_minutes: 10 },
      { id: '20_30', label: '20–30 min', min_minutes: 20, max_minutes: 30 }
    ];

    const focus_styles = [
      { value: 'gentle_movement', label: 'Gentle Movement' },
      { value: 'stretch_restore', label: 'Stretch & Restore' },
      { value: 'mindful_movement', label: 'Mindful Movement' },
      { value: 'restorative_yoga', label: 'Restorative Yoga' },
      { value: 'low_impact_fitness', label: 'Low-Impact Fitness' }
    ];

    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'all_levels', label: 'All levels' }
    ];

    // Derive tags from sessions for realism
    const sessions = this._getFromStorage('sessions');
    const tagSet = new Set();
    for (const s of sessions) {
      (s.tags || []).forEach(t => tagSet.add(t));
    }
    const tags = Array.from(tagSet).map(v => ({ value: v, label: String(v).replace(/_/g, ' ') }));

    return {
      duration_ranges,
      focus_styles,
      levels,
      tags
    };
  }

  // getRoutineDraft
  getRoutineDraft() {
    const { routine, items } = this._getOrCreateRoutineDraft();
    const sessions = this._getFromStorage('sessions');

    const mappedItems = items
      .slice()
      .sort((a, b) => this._safeNumber(a.position, 0) - this._safeNumber(b.position, 0))
      .map(ri => {
        const session = sessions.find(s => s.id === ri.session_id);
        return {
          routine_item_id: ri.id,
          session_id: ri.session_id,
          position: this._safeNumber(ri.position, 0),
          day_of_week: ri.day_of_week || 'unscheduled',
          session_summary: session
            ? {
                title: session.title || '',
                level: session.level || null,
                primary_style: session.primary_style || null,
                duration_minutes: this._safeNumber(session.duration_minutes, 0),
                tags: this._toArray(session.tags),
                thumbnail_image_url: session.thumbnail_image_url || ''
              }
            : null
        };
      });

    return {
      routine_id: routine.id,
      name: routine.name || '',
      is_weekly: !!routine.is_weekly,
      total_duration_minutes: this._safeNumber(routine.total_duration_minutes, 0),
      items: mappedItems
    };
  }

  // addSessionToRoutineDraft
  addSessionToRoutineDraft(sessionId, dayOfWeek) {
    const { routine, items } = this._getOrCreateRoutineDraft();
    const sessions = this._getFromStorage('sessions');
    const routineItems = this._getFromStorage('routine_items');

    const existsSession = sessions.find(s => s.id === sessionId);
    if (!existsSession) {
      return {
        success: false,
        routine: null,
        message: 'Session not found.'
      };
    }

    const currentItems = routineItems.filter(ri => ri.routine_id === routine.id);
    const maxPos = currentItems.reduce((max, ri) => Math.max(max, this._safeNumber(ri.position, 0)), 0);
    const newItem = {
      id: this._generateId('routine_item'),
      routine_id: routine.id,
      session_id: sessionId,
      position: maxPos + 1,
      day_of_week: dayOfWeek || 'unscheduled',
      notes: ''
    };

    routineItems.push(newItem);
    this._saveToStorage('routine_items', routineItems);
    const updatedRoutine = this._recalculateRoutineTotalDuration(routine.id) || routine;

    const updatedItems = routineItems
      .filter(ri => ri.routine_id === routine.id)
      .map(ri => ({
        routine_item_id: ri.id,
        session_id: ri.session_id,
        position: this._safeNumber(ri.position, 0),
        day_of_week: ri.day_of_week || 'unscheduled'
      }));

    return {
      success: true,
      routine: {
        routine_id: updatedRoutine.id,
        total_duration_minutes: this._safeNumber(updatedRoutine.total_duration_minutes, 0),
        items: updatedItems
      },
      message: 'Session added to routine draft.'
    };
  }

  // removeSessionFromRoutineDraft
  removeSessionFromRoutineDraft(routineItemId) {
    const routineItems = this._getFromStorage('routine_items');
    const routines = this._getFromStorage('routines');

    const idx = routineItems.findIndex(ri => ri.id === routineItemId);
    if (idx === -1) {
      return {
        success: false,
        routine: null,
        message: 'Routine item not found.'
      };
    }

    const routineId = routineItems[idx].routine_id;
    routineItems.splice(idx, 1);
    this._saveToStorage('routine_items', routineItems);

    const updatedRoutine = this._recalculateRoutineTotalDuration(routineId);
    if (!updatedRoutine) {
      return {
        success: true,
        routine: {
          routine_id: null,
          total_duration_minutes: 0
        },
        message: 'Routine item removed.'
      };
    }

    return {
      success: true,
      routine: {
        routine_id: updatedRoutine.id,
        total_duration_minutes: this._safeNumber(updatedRoutine.total_duration_minutes, 0)
      },
      message: 'Routine item removed.'
    };
  }

  // reorderRoutineDraftItems
  reorderRoutineDraftItems(newOrder) {
    const routineItems = this._getFromStorage('routine_items');
    const orderArr = this._toArray(newOrder);

    let routineId = null;

    for (const o of orderArr) {
      const item = routineItems.find(ri => ri.id === o.routineItemId);
      if (item) {
        item.position = this._safeNumber(o.position, 0);
        routineId = item.routine_id;
      }
    }

    this._saveToStorage('routine_items', routineItems);

    const updatedItems = routineItems
      .filter(ri => ri.routine_id === routineId)
      .sort((a, b) => this._safeNumber(a.position, 0) - this._safeNumber(b.position, 0))
      .map(ri => ({
        routine_item_id: ri.id,
        position: this._safeNumber(ri.position, 0)
      }));

    return {
      success: true,
      routine: {
        routine_id: routineId,
        items: updatedItems
      }
    };
  }

  // saveRoutineDraftAsWeeklyRoutine
  saveRoutineDraftAsWeeklyRoutine(name) {
    const routines = this._getFromStorage('routines');
    const { routine } = this._getOrCreateRoutineDraft();

    const idx = routines.findIndex(r => r.id === routine.id);
    if (idx === -1) {
      return {
        success: false,
        routine: null,
        message: 'Routine draft not found.'
      };
    }

    routines[idx].name = name || routines[idx].name || 'My Weekly Routine';
    routines[idx].is_weekly = true;
    routines[idx].updated_at = this._nowIso();

    this._saveToStorage('routines', routines);

    return {
      success: true,
      routine: {
        routine_id: routines[idx].id,
        name: routines[idx].name,
        is_weekly: !!routines[idx].is_weekly,
        total_duration_minutes: this._safeNumber(routines[idx].total_duration_minutes, 0),
        created_at: routines[idx].created_at
      },
      message: 'Routine saved.'
    };
  }

  // getRoutineSummary
  getRoutineSummary(routineId) {
    const routines = this._getFromStorage('routines');
    const routineItems = this._getFromStorage('routine_items');
    const sessions = this._getFromStorage('sessions');

    const routine = routines.find(r => r.id === routineId);
    if (!routine) return null;

    const items = routineItems
      .filter(ri => ri.routine_id === routine.id)
      .sort((a, b) => this._safeNumber(a.position, 0) - this._safeNumber(b.position, 0))
      .map(ri => {
        const session = sessions.find(s => s.id === ri.session_id);
        return {
          routine_item_id: ri.id,
          session_id: ri.session_id,
          position: this._safeNumber(ri.position, 0),
          day_of_week: ri.day_of_week || 'unscheduled',
          session_summary: session
            ? {
                title: session.title || '',
                level: session.level || null,
                primary_style: session.primary_style || null,
                duration_minutes: this._safeNumber(session.duration_minutes, 0)
              }
            : null
        };
      });

    return {
      routine_id: routine.id,
      name: routine.name || '',
      is_weekly: !!routine.is_weekly,
      total_duration_minutes: this._safeNumber(routine.total_duration_minutes, 0),
      items
    };
  }

  // getInstructorsFilterOptions
  getInstructorsFilterOptions() {
    const styles_or_specialties = [
      { value: 'Mindful Movement', label: 'Mindful Movement' },
      { value: 'Restorative Yoga', label: 'Restorative Yoga' },
      { value: 'Gentle Movement', label: 'Gentle Movement' },
      { value: 'Stretch & Restore', label: 'Stretch & Restore' },
      { value: 'Low-Impact Fitness', label: 'Low-Impact Fitness' }
    ];

    const rating_thresholds = [
      { min_value: 4.0, label: '4.0+' },
      { min_value: 4.5, label: '4.5+' },
      { min_value: 4.6, label: '4.6+' },
      { min_value: 4.8, label: '4.8+' }
    ];

    const sort_options = [
      { value: 'experience_desc', label: 'Experience – high to low' },
      { value: 'rating_desc', label: 'Rating – high to low' },
      { value: 'name_asc', label: 'Name A–Z' }
    ];

    return {
      styles_or_specialties,
      rating_thresholds,
      sort_options
    };
  }

  // searchInstructors
  searchInstructors(filters, sortBy, page, pageSize) {
    const instructors = this._getFromStorage('instructors');
    let result = instructors.slice();

    if (filters && typeof filters === 'object') {
      const { stylesOrSpecialties, minRating } = filters;

      if (Array.isArray(stylesOrSpecialties) && stylesOrSpecialties.length) {
        result = result.filter(inst => {
          const labels = this._resolveInstructorStylesAndSpecialties(inst).map(v => String(v));
          return stylesOrSpecialties.some(s => labels.includes(s));
        });
      }

      if (typeof minRating === 'number') {
        result = result.filter(inst => this._safeNumber(inst.rating, 0) >= minRating);
      }
    }

    const sort = sortBy || 'experience_desc';

    result.sort((a, b) => {
      switch (sort) {
        case 'rating_desc':
          return this._safeNumber(b.rating, 0) - this._safeNumber(a.rating, 0);
        case 'name_asc':
          return String(a.name || '').localeCompare(String(b.name || ''));
        case 'experience_desc':
        default:
          return this._safeNumber(b.years_experience, 0) - this._safeNumber(a.years_experience, 0);
      }
    });

    const total = result.length;
    const currentPage = this._safeNumber(page, 1) || 1;
    const size = this._safeNumber(pageSize, 20) || 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = result.slice(start, end);

    const mapped = pageItems.map(i => ({
      instructor_id: i.id,
      name: i.name || '',
      primary_style: i.primary_style || null,
      specialties: this._toArray(i.specialties),
      rating: typeof i.rating === 'number' ? i.rating : null,
      rating_count: this._safeNumber(i.rating_count, 0),
      years_experience: this._safeNumber(i.years_experience, 0),
      avatar_image_url: i.avatar_image_url || ''
    }));

    return {
      instructors: mapped,
      total,
      page: currentPage,
      page_size: size,
      has_more: end < total
    };
  }

  // getInstructorProfile
  getInstructorProfile(instructorId) {
    const instructors = this._getFromStorage('instructors');
    const sessions = this._getFromStorage('sessions');
    const follows = this._getFromStorage('followed_instructors');

    const inst = instructors.find(i => i.id === instructorId);
    if (!inst) return null;

    const instructorSessions = sessions.filter(s => s.instructor_id === inst.id);
    const is_followed = follows.some(f => f.instructor_id === inst.id);

    const classes = instructorSessions.map(s => ({
      session_id: s.id,
      title: s.title || '',
      level: s.level || null,
      duration_minutes: this._safeNumber(s.duration_minutes, 0),
      primary_style: s.primary_style || null,
      tags: this._toArray(s.tags),
      thumbnail_image_url: s.thumbnail_image_url || ''
    }));

    return {
      instructor_id: inst.id,
      name: inst.name || '',
      bio: inst.bio || '',
      primary_style: inst.primary_style || null,
      specialties: this._toArray(inst.specialties),
      rating: typeof inst.rating === 'number' ? inst.rating : null,
      rating_count: this._safeNumber(inst.rating_count, 0),
      years_experience: this._safeNumber(inst.years_experience, 0),
      avatar_image_url: inst.avatar_image_url || '',
      location: inst.location || '',
      is_followed,
      stats: {
        total_classes: instructorSessions.length,
        total_students: 0 // No student tracking in model; default to 0
      },
      classes
    };
  }

  // followInstructor
  followInstructor(instructorId) {
    const instructors = this._getFromStorage('instructors');
    const follows = this._getFromStorage('followed_instructors');

    const inst = instructors.find(i => i.id === instructorId);
    if (!inst) {
      return {
        success: false,
        followed_instructor: null,
        is_followed: false,
        message: 'Instructor not found.'
      };
    }

    const existing = follows.find(f => f.instructor_id === instructorId);
    if (existing) {
      return {
        success: true,
        followed_instructor: {
          followed_instructor_id: existing.id,
          instructor_id: existing.instructor_id,
          followed_at: existing.followed_at
        },
        is_followed: true,
        message: 'Instructor already followed.'
      };
    }

    const follow = {
      id: this._generateId('followed_instructor'),
      instructor_id: instructorId,
      followed_at: this._nowIso()
    };
    follows.push(follow);
    this._saveToStorage('followed_instructors', follows);

    return {
      success: true,
      followed_instructor: {
        followed_instructor_id: follow.id,
        instructor_id: follow.instructor_id,
        followed_at: follow.followed_at
      },
      is_followed: true,
      message: 'Instructor followed.'
    };
  }

  // unfollowInstructor
  unfollowInstructor(instructorId) {
    const follows = this._getFromStorage('followed_instructors');
    const index = follows.findIndex(f => f.instructor_id === instructorId);

    if (index === -1) {
      return {
        success: true,
        is_followed: false,
        message: 'Instructor was not followed.'
      };
    }

    follows.splice(index, 1);
    this._saveToStorage('followed_instructors', follows);

    return {
      success: true,
      is_followed: false,
      message: 'Instructor unfollowed.'
    };
  }

  // getResourcesFilterOptions
  getResourcesFilterOptions() {
    const date_ranges = [
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_90_days', label: 'Last 90 days' },
      { value: 'all_time', label: 'All time' }
    ];

    const categories = [
      { value: 'guides', label: 'Guides' },
      { value: 'stories', label: 'Stories' },
      { value: 'tips', label: 'Tips' },
      { value: 'news', label: 'News' },
      { value: 'research', label: 'Research' }
    ];

    return {
      date_ranges,
      categories
    };
  }

  // searchArticles
  searchArticles(query, filters, page, pageSize) {
    const articlesRaw = this._getFromStorage('articles');
    const filtered = this._applyArticleSearchFilters(articlesRaw, query, filters || {});

    const total = filtered.length;
    const currentPage = this._safeNumber(page, 1) || 1;
    const size = this._safeNumber(pageSize, 20) || 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end);

    const articles = pageItems.map(a => ({
      article_id: a.id,
      title: a.title || '',
      slug: a.slug || '',
      excerpt: a.excerpt || '',
      category: a.category || null,
      primary_topic: a.primary_topic || null,
      tags: this._toArray(a.tags),
      published_at: a.published_at || null,
      read_time_minutes: this._safeNumber(a.read_time_minutes, 0),
      image_url: a.image_url || '',
      is_featured: !!a.is_featured
    }));

    return {
      articles,
      total,
      page: currentPage,
      page_size: size,
      has_more: end < total
    };
  }

  // saveArticleToReadingList
  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_items');

    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return {
        success: false,
        reading_list_item: null,
        total_saved: readingList.length,
        message: 'Article not found.'
      };
    }

    const existing = readingList.find(r => r.article_id === articleId);
    if (existing) {
      return {
        success: true,
        reading_list_item: {
          reading_list_item_id: existing.id,
          article_id: existing.article_id,
          saved_at: existing.saved_at
        },
        total_saved: readingList.length,
        message: 'Article already in reading list.'
      };
    }

    const item = {
      id: this._generateId('reading_list_item'),
      article_id: articleId,
      saved_at: this._nowIso()
    };
    readingList.push(item);
    this._saveToStorage('reading_list_items', readingList);

    return {
      success: true,
      reading_list_item: {
        reading_list_item_id: item.id,
        article_id: item.article_id,
        saved_at: item.saved_at
      },
      total_saved: readingList.length,
      message: 'Article saved to reading list.'
    };
  }

  // getReadingList
  getReadingList() {
    const readingList = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const items = readingList.map(item => {
      const article = articles.find(a => a.id === item.article_id) || null;
      return {
        reading_list_item_id: item.id,
        saved_at: item.saved_at,
        article: article
          ? {
              article_id: article.id,
              title: article.title || '',
              slug: article.slug || '',
              excerpt: article.excerpt || '',
              category: article.category || null,
              primary_topic: article.primary_topic || null,
              published_at: article.published_at || null,
              read_time_minutes: this._safeNumber(article.read_time_minutes, 0),
              image_url: article.image_url || ''
            }
          : null
      };
    });

    return {
      items,
      total_saved: items.length
    };
  }

  // removeReadingListItem
  removeReadingListItem(articleId) {
    const readingList = this._getFromStorage('reading_list_items');
    const newList = readingList.filter(item => item.article_id !== articleId);
    this._saveToStorage('reading_list_items', newList);

    return {
      success: true,
      total_saved: newList.length,
      message: 'Article removed from reading list.'
    };
  }

  // getReminderDemoInitialState
  getReminderDemoInitialState() {
    const { schedule, entries, existed } = this._getOrCreateReminderSchedule();

    return {
      schedule_exists: existed,
      schedule: {
        schedule_id: schedule.id,
        days_per_week: this._safeNumber(schedule.days_per_week, 0),
        selected_days: this._toArray(schedule.selected_days),
        notification_in_app: !!schedule.notification_in_app,
        notification_sms: !!schedule.notification_sms,
        notification_email: !!schedule.notification_email,
        entries: entries
          .slice()
          .sort((a, b) => this._safeNumber(a.position, 0) - this._safeNumber(b.position, 0))
          .map(e => ({
            reminder_entry_id: e.id,
            label: e.label || '',
            time: e.time || '',
            time_of_day_bucket: e.time_of_day_bucket || null,
            position: this._safeNumber(e.position, 0)
          }))
      }
    };
  }

  // updateReminderScheduleSettings
  updateReminderScheduleSettings(daysPerWeek, selectedDays, notificationInApp, notificationSms, notificationEmail) {
    const schedules = this._getFromStorage('reminder_schedules');
    const { schedule } = this._getOrCreateReminderSchedule();
    const idx = schedules.findIndex(s => s.id === schedule.id);

    if (idx === -1) {
      return {
        schedule: null,
        success: false,
        message: 'Reminder schedule not found.'
      };
    }

    schedules[idx].days_per_week = this._safeNumber(daysPerWeek, 0);
    schedules[idx].selected_days = this._toArray(selectedDays);
    schedules[idx].notification_in_app = !!notificationInApp;
    schedules[idx].notification_sms = !!notificationSms;
    schedules[idx].notification_email = !!notificationEmail;
    schedules[idx].updated_at = this._nowIso();

    this._saveToStorage('reminder_schedules', schedules);

    const updated = schedules[idx];

    return {
      schedule: {
        schedule_id: updated.id,
        days_per_week: this._safeNumber(updated.days_per_week, 0),
        selected_days: this._toArray(updated.selected_days),
        notification_in_app: !!updated.notification_in_app,
        notification_sms: !!updated.notification_sms,
        notification_email: !!updated.notification_email
      },
      success: true,
      message: 'Reminder schedule updated.'
    };
  }

  // setReminderEntries
  setReminderEntries(entries) {
    const { schedule } = this._getOrCreateReminderSchedule();
    const allEntries = this._getFromStorage('reminder_entries');

    // Remove existing entries for this schedule
    const remaining = allEntries.filter(e => e.schedule_id !== schedule.id);

    const newEntriesInput = this._toArray(entries);
    let position = 1;
    for (const e of newEntriesInput) {
      const entry = {
        id: this._generateId('reminder_entry'),
        schedule_id: schedule.id,
        label: e.label || '',
        time: e.time || '',
        time_of_day_bucket: e.timeOfDayBucket || null,
        position
      };
      position += 1;
      remaining.push(entry);
    }

    this._saveToStorage('reminder_entries', remaining);

    const scheduleEntries = remaining
      .filter(e => e.schedule_id === schedule.id)
      .sort((a, b) => this._safeNumber(a.position, 0) - this._safeNumber(b.position, 0));

    return {
      schedule: {
        schedule_id: schedule.id,
        entries: scheduleEntries.map(e => ({
          reminder_entry_id: e.id,
          label: e.label || '',
          time: e.time || '',
          time_of_day_bucket: e.time_of_day_bucket || null,
          position: this._safeNumber(e.position, 0)
        }))
      },
      success: true,
      message: 'Reminder entries updated.'
    };
  }

  // getReminderSchedulePreview
  getReminderSchedulePreview() {
    const { schedule } = this._getOrCreateReminderSchedule();
    const entries = this._getFromStorage('reminder_entries').filter(e => e.schedule_id === schedule.id);
    const selectedDays = this._toArray(schedule.selected_days);

    const sortedEntries = entries
      .slice()
      .sort((a, b) => this._safeNumber(a.position, 0) - this._safeNumber(b.position, 0));

    const days = selectedDays.map(day => ({
      day,
      entries: sortedEntries.map(e => ({
        label: e.label || '',
        time: e.time || '',
        time_of_day_bucket: e.time_of_day_bucket || null
      }))
    }));

    return {
      schedule_id: schedule.id,
      days
    };
  }

  // getWorkplaceWellnessOverview
  getWorkplaceWellnessOverview() {
    const hero = {
      headline: 'Mindful movement for modern teams.',
      subheadline: 'Reduce burnout, improve focus, and make movement breaks a sustainable habit at work.',
      cta_label: 'Request Info'
    };

    const benefits = [
      {
        id: 'reduce_burnout',
        title: 'Reduce burnout',
        description: 'Short, guided movement and rest sessions that help teams reset during the day.',
        icon_key: 'flame_down'
      },
      {
        id: 'improve_focus',
        title: 'Improve focus',
        description: 'Science-backed practices to clear mental fog and increase focus for deep work.',
        icon_key: 'focus'
      },
      {
        id: 'movement_breaks',
        title: 'Increase movement breaks',
        description: 'Desk-friendly sequences that encourage healthy micro-movements throughout the week.',
        icon_key: 'movement'
      }
    ];

    const use_cases = [
      {
        title: 'Meeting warm-ups',
        description: '2–5 minute stretches before standups or all-hands to energize the room.'
      },
      {
        title: 'Lunch break reset',
        description: '10–15 minute mid-day movement flows to combat afternoon slumps.'
      },
      {
        title: 'End-of-day unwind',
        description: 'Gentle wind-down routines to help teams transition out of work mode.'
      }
    ];

    const outcomes = [
      { label: 'Avg. self-reported stress reduction', value: '28%' },
      { label: 'Teams scheduling weekly breaks', value: '3x more likely' }
    ];

    return {
      hero,
      benefits,
      use_cases,
      outcomes
    };
  }

  // getCorporateInquiryFormOptions
  getCorporateInquiryFormOptions() {
    const employee_ranges = [
      { value: 'range_1_50', label: '1–50', min: 1, max: 50 },
      { value: 'range_51_100', label: '51–100', min: 51, max: 100 },
      { value: 'range_101_200', label: '101–200', min: 101, max: 200 },
      { value: 'range_200_300', label: '200–300', min: 200, max: 300 },
      { value: 'range_301_500', label: '301–500', min: 301, max: 500 },
      { value: 'range_500_plus', label: '500+', min: 500, max: 1000000 }
    ];

    const priorities = [
      {
        key: 'reduce_burnout',
        label: 'Reduce burnout',
        description: 'Support emotional resilience and sustainable workloads.'
      },
      {
        key: 'improve_focus',
        label: 'Improve focus',
        description: 'Help employees reset attention between meetings and tasks.'
      },
      {
        key: 'increase_movement_breaks',
        label: 'Increase movement breaks',
        description: 'Encourage frequent, gentle movement throughout the day.'
      }
    ];

    const contact_methods = [
      { value: 'email_only', label: 'Email only' },
      { value: 'phone_only', label: 'Phone only' },
      { value: 'email_and_phone', label: 'Email and phone' }
    ];

    return {
      employee_ranges,
      priorities,
      contact_methods
    };
  }

  // submitCorporateInquiry
  submitCorporateInquiry(companyName, numEmployeesRange, preferredStartDate, monthlyBudget, selectedPriorities, contactMethod, contactEmail, contactName, message) {
    const inquiries = this._getFromStorage('corporate_inquiries');
    const priorities = this._toArray(selectedPriorities);

    const inquiry = {
      id: this._generateId('corporate_inquiry'),
      company_name: companyName || '',
      num_employees_range: numEmployeesRange,
      preferred_start_date: preferredStartDate || this._nowIso(),
      monthly_budget: this._safeNumber(monthlyBudget, 0),
      priority_reduce_burnout: priorities.includes('reduce_burnout'),
      priority_improve_focus: priorities.includes('improve_focus'),
      priority_increase_movement_breaks: priorities.includes('increase_movement_breaks'),
      priority_other: '',
      preferred_contact_method: contactMethod,
      contact_email: contactEmail || '',
      contact_name: contactName || '',
      message: message || '',
      created_at: this._nowIso()
    };

    inquiries.push(inquiry);
    this._saveToStorage('corporate_inquiries', inquiries);

    return {
      inquiry: {
        corporate_inquiry_id: inquiry.id,
        company_name: inquiry.company_name,
        num_employees_range: inquiry.num_employees_range,
        preferred_start_date: inquiry.preferred_start_date,
        monthly_budget: inquiry.monthly_budget,
        priority_reduce_burnout: inquiry.priority_reduce_burnout,
        priority_improve_focus: inquiry.priority_improve_focus,
        priority_increase_movement_breaks: inquiry.priority_increase_movement_breaks,
        preferred_contact_method: inquiry.preferred_contact_method,
        contact_email: inquiry.contact_email,
        contact_name: inquiry.contact_name,
        message: inquiry.message,
        created_at: inquiry.created_at
      },
      success: true,
      confirmation_message: 'Your workplace wellness inquiry has been submitted.'
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const mission = {
      headline: 'Movement that meets you where you are.',
      body: 'We built this mindful movement app to make it easier to care for your body and mind in the small pockets of time you already have. No perfection, no pressure—just gentle, guided support.'
    };

    const values = [
      {
        title: 'Kindness first',
        description: 'We design every practice to be compassionate, inclusive, and accessible.'
      },
      {
        title: 'Evidence-informed',
        description: 'We blend somatic practices with research on stress, sleep, and movement.'
      },
      {
        title: 'Consistency over intensity',
        description: 'Short, regular practices can create lasting change—so we focus on what’s sustainable.'
      }
    ];

    const team_members = [];

    const contact = {
      support_email: 'support@example.com',
      press_email: 'press@example.com',
      help_center_url: 'https://example.com/help'
    };

    return {
      mission,
      values,
      team_members,
      contact
    };
  }

  // getLegalDocument
  getLegalDocument(documentKey) {
    const now = this._nowIso();

    if (documentKey === 'privacy_policy') {
      return {
        document_key: 'privacy_policy',
        title: 'Privacy Policy',
        last_updated: now,
        sections: [
          {
            heading: 'Overview',
            body_html: '<p>Your privacy matters. This page explains what data we store in this demo (like your selected sessions and preferences) and how it is used.</p>',
            anchor_id: 'overview'
          },
          {
            heading: 'Local storage only',
            body_html: '<p>All demo data is stored locally in your browser or environment using localStorage. It does not leave your device.</p>',
            anchor_id: 'local-storage'
          }
        ]
      };
    }

    // Default to terms_of_use
    return {
      document_key: 'terms_of_use',
      title: 'Terms of Use',
      last_updated: now,
      sections: [
        {
          heading: 'Acceptance of terms',
          body_html: '<p>By using this demo, you understand that it is for illustrative purposes only and does not provide medical advice.</p>',
          anchor_id: 'acceptance'
        },
        {
          heading: 'Wellness content disclaimer',
          body_html: '<p>Movement and mindfulness practices should be adapted to your body. Always listen to your body and consult a professional if you have questions.</p>',
          anchor_id: 'disclaimer'
        }
      ]
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