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
  }

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    const keys = [
      'coaching_plans',
      'plan_subscriptions',
      'challenges',
      'challenge_registrations',
      'quizzes',
      'quiz_questions',
      'quiz_answer_options',
      'quiz_attempts',
      'quiz_answers',
      'notes',
      'routines',
      'routine_activities',
      'activity_library_items',
      'articles',
      'reading_list_items',
      'reminder_schedules',
      'courses',
      'course_enrollments',
      'success_stories',
      'strategies',
      'plan_items',
      'faq_items',
      'contact_messages'
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

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) return Array.isArray(defaultValue) ? [] : defaultValue;
    try {
      const parsed = JSON.parse(raw);
      return parsed == null ? (Array.isArray(defaultValue) ? [] : defaultValue) : parsed;
    } catch (e) {
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

  _getEntityById(storageKey, id) {
    const list = this._getFromStorage(storageKey, []);
    return list.find((item) => item.id === id) || null;
  }

  _ensureSingleUserContext() {
    // Single-user environment; no-op placeholder for future scoping.
    return true;
  }

  // Create a PlanItem for an entity and persist it
  _addPlanItemForEntity(itemType, entity, options) {
    this._ensureSingleUserContext();
    const planItems = this._getFromStorage('plan_items', []);

    let title = '';
    let summary = '';

    if (itemType === 'strategy') {
      title = entity.title || 'Strategy';
      summary = (entity.description || '').slice(0, 160);
    } else if (itemType === 'course') {
      const course = entity;
      title = course.title || 'Course';
      summary = course.description || '';
    } else if (itemType === 'challenge') {
      const challenge = entity;
      title = challenge.title || 'Challenge';
      summary = challenge.summary || '';
    } else if (itemType === 'routine') {
      const routine = entity;
      title = routine.name || 'Routine';
      summary = options && options.summary ? options.summary : (routine.description || '');
    } else if (itemType === 'note') {
      title = entity.title || 'Note';
      summary = (entity.content || '').slice(0, 160);
    } else if (itemType === 'quiz_result') {
      title = 'Quiz Result';
      summary = entity.result_summary || '';
    } else if (itemType === 'plan_subscription') {
      const subscription = entity;
      const plan = this._getEntityById('coaching_plans', subscription.plan_id);
      title = plan ? `Coaching Plan: ${plan.name}` : 'Coaching Plan Subscription';
      if (subscription.trial_ends_at) {
        summary = `Trial active until ${subscription.trial_ends_at}`;
      } else {
        summary = 'Trial active';
      }
    } else if (itemType === 'reminder_schedule') {
      title = 'Reminder Schedule';
      summary = entity.message || '';
    } else if (itemType === 'article') {
      title = entity.title || 'Article';
      summary = entity.summary || '';
    } else {
      title = options && options.title ? options.title : 'Plan Item';
      summary = options && options.summary ? options.summary : '';
    }

    const planItem = {
      id: this._generateId('planitem'),
      item_type: itemType,
      item_ref_id: entity.id,
      title,
      summary,
      added_at: new Date().toISOString(),
      is_pinned: options && typeof options.is_pinned === 'boolean' ? options.is_pinned : false
    };

    planItems.push(planItem);
    this._saveToStorage('plan_items', planItems);
    return planItem;
  }

  // Compute quiz results from answers; simple placeholder logic
  _computeQuizResults(attemptId) {
    const answers = this._getFromStorage('quiz_answers', []).filter(
      (a) => a.attempt_id === attemptId
    );

    // Simple heuristic: use average slider score if any; otherwise generic
    const sliderValues = answers
      .map((a) => (typeof a.slider_value === 'number' ? a.slider_value : null))
      .filter((v) => v != null);

    let primaryFocusArea = 'Overall Balance';
    if (sliderValues.length) {
      const avg = sliderValues.reduce((s, v) => s + v, 0) / sliderValues.length;
      if (avg < 4) primaryFocusArea = 'Stress Management';
      else if (avg < 7) primaryFocusArea = 'Work-Life Balance';
      else primaryFocusArea = 'Growth & Stretch Goals';
    }

    const resultSummary = `Primary focus area: ${primaryFocusArea}. This result is based on your latest quiz responses.`;

    return { primary_focus_area: primaryFocusArea, result_summary: resultSummary };
  }

  // Helper: resolve *_id foreign keys in generic fashion if needed
  _resolveForeignKey(item, mapping) {
    // mapping: { fieldName: { storageKey, propName? } }
    const result = { ...item };
    Object.keys(mapping).forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(item, field)) {
        const config = mapping[field];
        const propName = config.propName || field.replace(/_id$/, '').replace(/Id$/, '');
        const ref = this._getEntityById(config.storageKey, item[field]);
        result[propName] = ref || null;
      }
    });
    return result;
  }

  // ---------------------- Home Content ----------------------

  // getHomeContent()
  getHomeContent() {
    // Static configuration; no entity data is mocked here.
    return {
      brandTagline: 'Build habits, boost confidence, own your mornings.',
      introHeadline: 'Design a life you feel proud to wake up to.',
      introBody:
        'This space helps you turn motivation into momentum with focused coaching, challenges, and tools that fit your real life.',
      coreBenefits: [
        {
          headline: 'Tiny actions, big progress',
          description: 'Create routines, challenges, and reminders that keep you moving without burning out.'
        },
        {
          headline: 'Clarity on what matters',
          description:
            'Use self-assessments and reflection tools to choose one primary focus area for the next 30 days.'
        },
        {
          headline: 'Stay accountable',
          description: 'Weekly reminders and success stories keep your goals visible and actionable.'
        }
      ],
      heroCta: {
        title: 'Join a guided 30-day challenge',
        subtitle: 'Build momentum with daily prompts, email tips, and simple commitments.',
        primaryButtonLabel: 'Join 30-Day Challenge',
        linkedChallengeId: null // can be wired by UI from available challenges
      },
      quickSections: [
        {
          sectionKey: 'programs_pricing',
          title: 'Coaching Programs & Pricing',
          description: 'Compare flexible coaching plans and start a free trial when you are ready.'
        },
        {
          sectionKey: 'challenges',
          title: '30-Day Challenges',
          description: 'Guided challenges to help you build focus, confidence, and productivity.'
        },
        {
          sectionKey: 'self_assessment',
          title: 'Self-Assessment Hub',
          description: 'Use the Life Balance Quiz to clarify where to focus next.'
        },
        {
          sectionKey: 'tools',
          title: 'Tools & Builders',
          description: 'Create morning routines, reflection rituals, and more.'
        },
        {
          sectionKey: 'resources',
          title: 'Resources Library',
          description: 'Browse practical articles on motivation, productivity, and personal growth.'
        },
        {
          sectionKey: 'courses',
          title: 'Courses Catalog',
          description: 'Mini-courses and deeper trainings for every level.'
        }
      ]
    };
  }

  // ---------------------- Coaching Plans ----------------------

  // getCoachingPlanFilterOptions()
  getCoachingPlanFilterOptions() {
    const plans = this._getFromStorage('coaching_plans', []);
    const monthlyPlans = plans.filter((p) => p.billing_type === 'monthly');
    const prices = monthlyPlans.map((p) => p.price_per_month).filter((v) => typeof v === 'number');
    const minPricePerMonth = prices.length ? Math.min(...prices) : 0;
    const maxPricePerMonth = prices.length ? Math.max(...prices) : 0;

    return {
      billingTypes: [
        { value: 'monthly', label: 'Monthly Plans' },
        { value: 'annual', label: 'Annual Plans' },
        { value: 'one_time', label: 'One-time Programs' }
      ],
      sessionFrequencyOptions: [
        { minSessionsPerWeek: 1, label: '1+ sessions per week' },
        { minSessionsPerWeek: 2, label: '2+ sessions per week' },
        { minSessionsPerWeek: 3, label: '3+ sessions per week' }
      ],
      sortOptions: [
        { value: 'featured_first', label: 'Featured first' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        {
          value: 'session_frequency_high_to_low',
          label: 'Session frequency: High to Low'
        }
      ],
      priceRange: {
        minPricePerMonth,
        maxPricePerMonth
      }
    };
  }

  // listCoachingPlans(filters, sortBy)
  listCoachingPlans(filters, sortBy) {
    this._ensureSingleUserContext();
    const plansRaw = this._getFromStorage('coaching_plans', []);
    const f = filters || {};
    const sortKey = sortBy || 'featured_first';

    let plans = plansRaw.slice();

    // onlyActive default true
    if (!(f.onlyActive === false)) {
      plans = plans.filter((p) => p.is_active !== false);
    }

    if (f.billingType) {
      plans = plans.filter((p) => p.billing_type === f.billingType);
    }

    if (typeof f.maxPricePerMonth === 'number') {
      plans = plans.filter((p) => {
        if (p.billing_type === 'monthly' && typeof p.price_per_month === 'number') {
          return p.price_per_month <= f.maxPricePerMonth;
        }
        return true;
      });
    }

    if (typeof f.minSessionFrequencyPerWeek === 'number') {
      plans = plans.filter(
        (p) => (p.session_frequency_per_week || 0) >= f.minSessionFrequencyPerWeek
      );
    }

    // Sorting
    const byPriceAsc = (a, b) => (a.price_per_month || 0) - (b.price_per_month || 0);
    const byPriceDesc = (a, b) => (b.price_per_month || 0) - (a.price_per_month || 0);
    const bySessionDesc = (a, b) =>
      (b.session_frequency_per_week || 0) - (a.session_frequency_per_week || 0);

    if (sortKey === 'price_low_to_high') {
      plans.sort(byPriceAsc);
    } else if (sortKey === 'price_high_to_low') {
      plans.sort(byPriceDesc);
    } else if (sortKey === 'session_frequency_high_to_low') {
      plans.sort(bySessionDesc);
    } else {
      // featured_first default
      plans.sort((a, b) => {
        const featA = a.is_featured ? 1 : 0;
        const featB = b.is_featured ? 1 : 0;
        if (featA !== featB) return featB - featA;
        const sortOrderA = typeof a.sort_order === 'number' ? a.sort_order : Number.MAX_SAFE_INTEGER;
        const sortOrderB = typeof b.sort_order === 'number' ? b.sort_order : Number.MAX_SAFE_INTEGER;
        if (sortOrderA !== sortOrderB) return sortOrderA - sortOrderB;
        return byPriceAsc(a, b);
      });
    }

    const viewPlans = plans.map((p) => {
      const priceDisplay =
        typeof p.price_per_month === 'number'
          ? `$${p.price_per_month}/month`
          : '';
      const billingTypeLabel =
        p.billing_type === 'monthly'
          ? 'Monthly'
          : p.billing_type === 'annual'
          ? 'Annual'
          : 'One-time';
      const sessionFrequencyLabel = p.session_frequency_per_week
        ? `${p.session_frequency_per_week} sessions / week`
        : '';
      const freeTrialBadge = p.free_trial_available
        ? `${p.free_trial_days || ''}`.trim()
          ? `${p.free_trial_days}-day free trial`
          : 'Free trial available'
        : '';

      return {
        id: p.id,
        name: p.name,
        tagline: p.tagline || '',
        price_per_month: p.price_per_month,
        price_display: priceDisplay,
        billing_type: p.billing_type,
        billing_type_label: billingTypeLabel,
        currency: p.currency,
        session_frequency_per_week: p.session_frequency_per_week,
        session_frequency_label: sessionFrequencyLabel,
        session_length_minutes: p.session_length_minutes,
        features: p.features || [],
        badge_label: p.badge_label || '',
        is_featured: !!p.is_featured,
        free_trial_available: !!p.free_trial_available,
        free_trial_badge: freeTrialBadge
      };
    });

    return { plans: viewPlans, totalCount: viewPlans.length };
  }

  // getCoachingPlanDetail(planId)
  getCoachingPlanDetail(planId) {
    this._ensureSingleUserContext();
    const plans = this._getFromStorage('coaching_plans', []);
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return { plan: null, relatedPlans: [] };
    }

    const billingTypeLabel =
      plan.billing_type === 'monthly'
        ? 'Monthly'
        : plan.billing_type === 'annual'
        ? 'Annual'
        : 'One-time';

    const priceDisplay =
      typeof plan.price_per_month === 'number'
        ? `$${plan.price_per_month}/month`
        : '';

    const sessionFrequencyLabel = plan.session_frequency_per_week
      ? `${plan.session_frequency_per_week} sessions / week`
      : '';

    const viewPlan = {
      id: plan.id,
      name: plan.name,
      tagline: plan.tagline || '',
      description: plan.description || '',
      price_per_month: plan.price_per_month,
      price_display: priceDisplay,
      billing_type: plan.billing_type,
      billing_type_label: billingTypeLabel,
      currency: plan.currency,
      session_frequency_per_week: plan.session_frequency_per_week,
      session_frequency_label: sessionFrequencyLabel,
      session_length_minutes: plan.session_length_minutes,
      max_clients: plan.max_clients,
      features: plan.features || [],
      badge_label: plan.badge_label || '',
      is_featured: !!plan.is_featured,
      free_trial_available: !!plan.free_trial_available,
      free_trial_days: plan.free_trial_days
    };

    const relatedPlans = plans
      .filter((p) => p.id !== plan.id && p.is_active !== false)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price_display:
          typeof p.price_per_month === 'number'
            ? `$${p.price_per_month}/month`
            : '',
        billing_type_label:
          p.billing_type === 'monthly'
            ? 'Monthly'
            : p.billing_type === 'annual'
            ? 'Annual'
            : 'One-time',
        badge_label: p.badge_label || ''
      }));

    return { plan: viewPlan, relatedPlans };
  }

  // startCoachingPlanFreeTrial(planId)
  startCoachingPlanFreeTrial(planId) {
    this._ensureSingleUserContext();
    const plans = this._getFromStorage('coaching_plans', []);
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return {
        subscription: null,
        planItem: null,
        message: 'Plan not found',
        success: false
      };
    }

    const subscriptions = this._getFromStorage('plan_subscriptions', []);
    const now = new Date();

    let trialEndsAt = null;
    if (plan.free_trial_available && typeof plan.free_trial_days === 'number') {
      const end = new Date(now.getTime() + plan.free_trial_days * 24 * 60 * 60 * 1000);
      trialEndsAt = end.toISOString();
    }

    const subscription = {
      id: this._generateId('plansub'),
      plan_id: plan.id,
      status: 'trial_active',
      is_trial: true,
      started_at: now.toISOString(),
      trial_ends_at: trialEndsAt,
      cancelled_at: null,
      notes: ''
    };

    subscriptions.push(subscription);
    this._saveToStorage('plan_subscriptions', subscriptions);

    const planItem = this._addPlanItemForEntity('plan_subscription', subscription);

    const resultSubscription = this._resolveForeignKey(subscription, {
      plan_id: { storageKey: 'coaching_plans', propName: 'plan' }
    });

    return {
      subscription: resultSubscription,
      planItem,
      message: 'Free trial started',
      success: true
    };
  }

  // ---------------------- Challenges ----------------------

  // getChallengeFilterOptions()
  getChallengeFilterOptions() {
    const challenges = this._getFromStorage('challenges', []);

    const durationSet = new Set();
    const focusAreaSet = new Set();
    const difficultyLevels = ['beginner', 'intermediate', 'advanced'];

    challenges.forEach((c) => {
      if (typeof c.duration_days === 'number') durationSet.add(c.duration_days);
      if (c.focus_area) focusAreaSet.add(c.focus_area);
    });

    const durationOptions = Array.from(durationSet)
      .sort((a, b) => a - b)
      .map((d) => ({ days: d, label: `${d} days` }));

    const focusAreas = Array.from(focusAreaSet).map((fa) => ({ value: fa, label: fa }));

    return {
      durationOptions,
      focusAreas,
      difficultyLevels: difficultyLevels.map((lvl) => ({
        value: lvl,
        label: lvl.charAt(0).toUpperCase() + lvl.slice(1)
      })),
      featureFlags: [
        { key: 'daily_email_tips', label: 'Daily email tips included' }
      ]
    };
  }

  // listChallenges(filters, sortBy)
  listChallenges(filters, sortBy) {
    this._ensureSingleUserContext();
    const list = this._getFromStorage('challenges', []);
    const f = filters || {};
    const sortKey = sortBy || 'recommended_first';

    let challenges = list.slice();

    if (!(f.onlyActive === false)) {
      challenges = challenges.filter((c) => c.is_active !== false);
    }

    if (typeof f.durationDays === 'number') {
      challenges = challenges.filter((c) => c.duration_days === f.durationDays);
    }

    if (f.focusArea) {
      challenges = challenges.filter((c) => c.focus_area === f.focusArea);
    }

    if (f.difficulty) {
      challenges = challenges.filter((c) => c.difficulty === f.difficulty);
    }

    if (typeof f.hasDailyEmailTips === 'boolean') {
      challenges = challenges.filter(
        (c) => !!c.has_daily_email_tips === f.hasDailyEmailTips
      );
    }

    if (sortKey === 'soonest_start_date') {
      challenges.sort((a, b) => {
        const da = a.start_date ? Date.parse(a.start_date) : Number.MAX_SAFE_INTEGER;
        const db = b.start_date ? Date.parse(b.start_date) : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    } else {
      // recommended_first: prioritize active daily-email challenges, then earliest start
      challenges.sort((a, b) => {
        const scoreA = (a.has_daily_email_tips ? 1 : 0) + (a.is_active ? 1 : 0);
        const scoreB = (b.has_daily_email_tips ? 1 : 0) + (b.is_active ? 1 : 0);
        if (scoreA !== scoreB) return scoreB - scoreA;
        const da = a.start_date ? Date.parse(a.start_date) : Number.MAX_SAFE_INTEGER;
        const db = b.start_date ? Date.parse(b.start_date) : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    }

    const viewChallenges = challenges.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary || '',
      duration_days: c.duration_days,
      duration_label: `${c.duration_days} days`,
      focus_area: c.focus_area,
      difficulty: c.difficulty,
      difficulty_label:
        c.difficulty && c.difficulty.length
          ? c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1)
          : '',
      has_daily_email_tips: !!c.has_daily_email_tips,
      daily_email_tips_badge: c.has_daily_email_tips ? 'Daily email tips included' : '',
      image_url: c.image_url || ''
    }));

    return { challenges: viewChallenges, totalCount: viewChallenges.length };
  }

  // getChallengeDetail(challengeId)
  getChallengeDetail(challengeId) {
    const challenges = this._getFromStorage('challenges', []);
    const challenge = challenges.find((c) => c.id === challengeId) || null;

    if (!challenge) {
      return { challenge: null, registrationForm: { fields: [], primaryButtonLabel: 'Join Challenge' } };
    }

    const difficultyLabel = challenge.difficulty
      ? challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)
      : '';

    const viewChallenge = {
      id: challenge.id,
      title: challenge.title,
      summary: challenge.summary || '',
      description: challenge.description || '',
      duration_days: challenge.duration_days,
      focus_area: challenge.focus_area,
      difficulty: challenge.difficulty,
      difficulty_label: difficultyLabel,
      has_daily_email_tips: !!challenge.has_daily_email_tips,
      daily_email_tips_badge: challenge.has_daily_email_tips
        ? 'Daily email tips included'
        : '',
      start_date: challenge.start_date || null,
      end_date: challenge.end_date || null,
      tags: challenge.tags || [],
      image_url: challenge.image_url || ''
    };

    const registrationForm = {
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        {
          name: 'goalIntent',
          label: 'Goal or Intent',
          type: 'textarea',
          required: true
        }
      ],
      primaryButtonLabel: 'Join Challenge'
    };

    return { challenge: viewChallenge, registrationForm };
  }

  // registerForChallenge(challengeId, name, email, goalIntent)
  registerForChallenge(challengeId, name, email, goalIntent) {
    this._ensureSingleUserContext();
    const challenges = this._getFromStorage('challenges', []);
    const challenge = challenges.find((c) => c.id === challengeId) || null;

    if (!challenge) {
      return {
        registration: null,
        planItem: null,
        success: false,
        message: 'Challenge not found'
      };
    }

    const regs = this._getFromStorage('challenge_registrations', []);
    const now = new Date().toISOString();

    const registration = {
      id: this._generateId('chalreg'),
      challenge_id: challengeId,
      name,
      email,
      goal_intent: goalIntent,
      registered_at: now,
      status: 'active'
    };

    regs.push(registration);
    this._saveToStorage('challenge_registrations', regs);

    const planItem = this._addPlanItemForEntity('challenge', challenge);

    const registrationWithChallenge = this._resolveForeignKey(registration, {
      challenge_id: { storageKey: 'challenges', propName: 'challenge' }
    });

    return {
      registration: registrationWithChallenge,
      planItem,
      success: true,
      message: 'Registered for challenge'
    };
  }

  // ---------------------- Self Assessments & Quizzes ----------------------

  // listSelfAssessments()
  listSelfAssessments() {
    const quizzes = this._getFromStorage('quizzes', []);
    const assessments = quizzes
      .filter((q) => q.is_active !== false)
      .map((q) => ({
        quiz_id: q.id,
        title: q.title,
        slug: q.slug || '',
        description: q.description || '',
        estimated_duration_minutes: q.estimated_duration_minutes || null,
        is_life_balance_quiz:
          (q.slug && q.slug.toLowerCase().includes('life-balance')) ||
          (q.title && q.title.toLowerCase().includes('life balance'))
      }));

    return { assessments };
  }

  // beginQuizAttempt(quizId)
  beginQuizAttempt(quizId) {
    this._ensureSingleUserContext();
    const quizzes = this._getFromStorage('quizzes', []);
    const quiz = quizzes.find((q) => q.id === quizId) || null;

    if (!quiz) {
      return { attempt: null };
    }

    const attempts = this._getFromStorage('quiz_attempts', []);
    const attempt = {
      id: this._generateId('quizatt'),
      quiz_id: quizId,
      started_at: new Date().toISOString(),
      completed_at: null,
      status: 'in_progress',
      primary_focus_area: null,
      result_summary: null
    };

    attempts.push(attempt);
    this._saveToStorage('quiz_attempts', attempts);

    return { attempt };
  }

  // getQuizQuestions(quizId)
  getQuizQuestions(quizId) {
    const questionsAll = this._getFromStorage('quiz_questions', []);
    const optionsAll = this._getFromStorage('quiz_answer_options', []);

    const questions = questionsAll
      .filter((q) => q.quiz_id === quizId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map((q) => {
        let answerOptions = optionsAll
          .filter((o) => o.question_id === q.id)
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map((o) => ({
            option_id: o.id,
            text: o.text,
            order_index: o.order_index
          }));

        // Ensure multiple choice questions always have at least one option
        // even if no options were provided in storage.
        if (q.question_type === 'multiple_choice' && answerOptions.length === 0) {
          answerOptions = [
            { option_id: `${q.id}_opt1`, text: 'Strongly disagree', order_index: 1 },
            { option_id: `${q.id}_opt2`, text: 'Neutral', order_index: 2 },
            { option_id: `${q.id}_opt3`, text: 'Strongly agree', order_index: 3 }
          ];
        }

        const sliderConfig =
          q.question_type === 'slider'
            ? {
                min_value: typeof q.min_value === 'number' ? q.min_value : 0,
                max_value: typeof q.max_value === 'number' ? q.max_value : 10,
                step: typeof q.step === 'number' ? q.step : 1
              }
            : null;

        return {
          question_id: q.id,
          text: q.text,
          question_type: q.question_type,
          order_index: q.order_index,
          answer_options: answerOptions,
          slider_config: sliderConfig
        };
      });

    return { questions };
  }

  // submitQuizAttempt(attemptId, answers)
  submitQuizAttempt(attemptId, answers) {
    this._ensureSingleUserContext();
    const attempts = this._getFromStorage('quiz_attempts', []);
    const attemptIndex = attempts.findIndex((a) => a.id === attemptId);

    if (attemptIndex === -1) {
      return { attempt: null };
    }

    const attempt = attempts[attemptIndex];
    const answersStorage = this._getFromStorage('quiz_answers', []);

    (answers || []).forEach((ans) => {
      const answerRecord = {
        id: this._generateId('quizans'),
        attempt_id: attemptId,
        question_id: ans.questionId,
        selected_option_id: ans.selectedOptionId || null,
        slider_value:
          typeof ans.sliderValue === 'number' ? ans.sliderValue : null,
        text_answer: ans.textAnswer || null
      };
      answersStorage.push(answerRecord);
    });

    this._saveToStorage('quiz_answers', answersStorage);

    const results = this._computeQuizResults(attemptId);

    attempt.status = 'completed';
    attempt.completed_at = new Date().toISOString();
    attempt.primary_focus_area = results.primary_focus_area;
    attempt.result_summary = results.result_summary;

    attempts[attemptIndex] = attempt;
    this._saveToStorage('quiz_attempts', attempts);

    return { attempt };
  }

  // addQuizResultNote(attemptId, content)
  addQuizResultNote(attemptId, content) {
    this._ensureSingleUserContext();
    const attempts = this._getFromStorage('quiz_attempts', []);
    const attempt = attempts.find((a) => a.id === attemptId) || null;

    if (!attempt) {
      return { note: null, planItem: null, success: false };
    }

    const notes = this._getFromStorage('notes', []);
    const now = new Date().toISOString();

    const title = attempt.primary_focus_area
      ? `Focus: ${attempt.primary_focus_area}`
      : 'Quiz Result Note';

    const note = {
      id: this._generateId('note'),
      title,
      content,
      context_type: 'quiz_result',
      context_id: attemptId,
      created_at: now,
      updated_at: null
    };

    notes.push(note);
    this._saveToStorage('notes', notes);

    const planItem = this._addPlanItemForEntity('note', note);

    return { note, planItem, success: true };
  }

  // ---------------------- Routine Builder ----------------------

  // getRoutineBuilderConfig()
  getRoutineBuilderConfig() {
    return {
      routineTypes: [
        { value: 'morning', label: 'Morning Routine' },
        { value: 'evening', label: 'Evening Routine' },
        { value: 'custom', label: 'Custom Routine' }
      ],
      activityCategories: [
        { value: 'energy', label: 'Energy' },
        { value: 'focus', label: 'Focus' },
        { value: 'mindfulness', label: 'Mindfulness' },
        { value: 'planning', label: 'Planning' },
        { value: 'fitness', label: 'Fitness' },
        { value: 'reflection', label: 'Reflection' }
      ],
      defaultDurationsMinutes: [5, 10, 15, 20, 30, 45, 60]
    };
  }

  // listActivityLibraryItems(category)
  listActivityLibraryItems(category) {
    const items = this._getFromStorage('activity_library_items', []);
    let activities = items.filter((a) => a.is_active !== false);
    if (category) {
      activities = activities.filter((a) => a.category === category);
    }

    return {
      activities: activities.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description || '',
        category: a.category,
        default_duration_minutes: a.default_duration_minutes || null,
        duration_options_minutes: a.duration_options_minutes || []
      }))
    };
  }

  // createRoutine(name, routineType, description, activities)
  createRoutine(name, routineType, description, activities) {
    this._ensureSingleUserContext();
    const routines = this._getFromStorage('routines', []);
    const routineActivitiesStore = this._getFromStorage('routine_activities', []);

    const totalDuration = (activities || []).reduce(
      (sum, a) => sum + (a.durationMinutes || 0),
      0
    );

    const routine = {
      id: this._generateId('routine'),
      name,
      routine_type: routineType,
      description: description || '',
      total_duration_minutes: totalDuration,
      created_at: new Date().toISOString(),
      updated_at: null,
      is_pinned_to_dashboard: false,
      pinned_at: null
    };

    routines.push(routine);
    this._saveToStorage('routines', routines);

    const routineActivities = (activities || []).map((a) => {
      const ra = {
        id: this._generateId('ract'),
        routine_id: routine.id,
        activity_id: a.activityId,
        custom_name: a.customName || null,
        duration_minutes: a.durationMinutes,
        order_index: a.orderIndex
      };
      routineActivitiesStore.push(ra);
      return ra;
    });

    this._saveToStorage('routine_activities', routineActivitiesStore);

    const summary = `${routine.total_duration_minutes || 0} minute routine`;
    const planItem = this._addPlanItemForEntity('routine', routine, { summary });

    return { routine, routineActivities, planItem };
  }

  // pinRoutineToDashboard(routineId)
  pinRoutineToDashboard(routineId) {
    this._ensureSingleUserContext();
    const routines = this._getFromStorage('routines', []);
    const idx = routines.findIndex((r) => r.id === routineId);

    if (idx === -1) {
      return { routine: null, success: false };
    }

    const now = new Date().toISOString();
    routines[idx].is_pinned_to_dashboard = true;
    routines[idx].pinned_at = now;
    this._saveToStorage('routines', routines);

    return {
      routine: {
        id: routines[idx].id,
        is_pinned_to_dashboard: routines[idx].is_pinned_to_dashboard,
        pinned_at: routines[idx].pinned_at
      },
      success: true
    };
  }

  // ---------------------- Articles & Reading List ----------------------

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles', []);
    const topicSet = new Set();
    articles.forEach((a) => {
      if (a.topic) topicSet.add(a.topic);
    });

    const topics = Array.from(topicSet).map((t) => ({ value: t, label: t }));

    return {
      topics,
      readingTimeOptions: [
        { maxMinutes: 5, label: 'Under 5 minutes' },
        { maxMinutes: 8, label: 'Under 8 minutes' },
        { maxMinutes: 15, label: 'Under 15 minutes' }
      ],
      sortOptions: [
        { value: 'most_popular', label: 'Most Popular' },
        { value: 'newest_first', label: 'Newest first' },
        { value: 'shortest_first', label: 'Shortest reading time' }
      ]
    };
  }

  // listArticles(filters, sortBy)
  listArticles(filters, sortBy) {
    const f = filters || {};
    const sortKey = sortBy || 'most_popular';
    const articlesAll = this._getFromStorage('articles', []);
    let articles = articlesAll.slice();

    if (!(f.onlyPublished === false)) {
      articles = articles.filter((a) => a.is_published !== false);
    }

    if (f.topic) {
      articles = articles.filter((a) => a.topic === f.topic);
    }

    if (typeof f.maxReadingTimeMinutes === 'number') {
      articles = articles.filter(
        (a) => (a.reading_time_minutes || 0) <= f.maxReadingTimeMinutes
      );
    }

    if (sortKey === 'newest_first') {
      articles.sort((a, b) => {
        const da = a.published_at ? Date.parse(a.published_at) : 0;
        const db = b.published_at ? Date.parse(b.published_at) : 0;
        return db - da;
      });
    } else if (sortKey === 'shortest_first') {
      articles.sort(
        (a, b) => (a.reading_time_minutes || 0) - (b.reading_time_minutes || 0)
      );
    } else {
      // most_popular default
      articles.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }

    const viewArticles = articles.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      topic: a.topic,
      reading_time_minutes: a.reading_time_minutes,
      reading_time_label: a.reading_time_minutes
        ? `${a.reading_time_minutes} min read`
        : '',
      tags: a.tags || [],
      image_url: a.image_url || '',
      popularity_score: a.popularity_score || 0
    }));

    return { articles: viewArticles, totalCount: viewArticles.length };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const article = this._getEntityById('articles', articleId);
    if (!article) {
      return { article: null, isInReadingList: false };
    }

    const readingListItems = this._getFromStorage('reading_list_items', []);
    const isInReadingList = readingListItems.some((i) => i.article_id === articleId);

    const viewArticle = {
      id: article.id,
      title: article.title,
      summary: article.summary || '',
      content: article.content || '',
      topic: article.topic,
      reading_time_minutes: article.reading_time_minutes,
      reading_time_label: article.reading_time_minutes
        ? `${article.reading_time_minutes} min read`
        : '',
      tags: article.tags || [],
      published_at: article.published_at || null
    };

    return { article: viewArticle, isInReadingList };
  }

  // saveArticleToReadingList(articleId)
  saveArticleToReadingList(articleId) {
    this._ensureSingleUserContext();
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        readingListItem: null,
        planItem: null,
        alreadySaved: false,
        success: false
      };
    }

    const items = this._getFromStorage('reading_list_items', []);
    const existing = items.find((i) => i.article_id === articleId);
    if (existing) {
      const readingListItem = existing;
      const planItem = null; // do not duplicate plan items on repeated save
      return { readingListItem, planItem, alreadySaved: true, success: true };
    }

    const readingListItem = {
      id: this._generateId('rlist'),
      article_id: articleId,
      saved_at: new Date().toISOString(),
      notes: ''
    };

    items.push(readingListItem);
    this._saveToStorage('reading_list_items', items);

    const planItem = this._addPlanItemForEntity('article', article);

    return {
      readingListItem,
      planItem,
      alreadySaved: false,
      success: true
    };
  }

  // listReadingListItems()
  listReadingListItems() {
    this._ensureSingleUserContext();
    const items = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const resultItems = items.map((i) => {
      const article = articles.find((a) => a.id === i.article_id) || null;
      return {
        reading_list_item_id: i.id,
        article_id: i.article_id,
        title: article ? article.title : '',
        topic: article ? article.topic : '',
        reading_time_minutes: article ? article.reading_time_minutes : null,
        reading_time_label:
          article && article.reading_time_minutes
            ? `${article.reading_time_minutes} min read`
            : '',
        saved_at: i.saved_at,
        article
      };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task5_readingListOpened', 'true');
    } catch (e) {}

    return { items: resultItems };
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    this._ensureSingleUserContext();
    const items = this._getFromStorage('reading_list_items', []);
    const idx = items.findIndex((i) => i.id === readingListItemId);
    if (idx === -1) return { success: false };
    items.splice(idx, 1);
    this._saveToStorage('reading_list_items', items);
    return { success: true };
  }

  // ---------------------- Reminder Schedules ----------------------

  // listReminderSchedules()
  listReminderSchedules() {
    this._ensureSingleUserContext();
    const schedules = this._getFromStorage('reminder_schedules', []);
    return {
      schedules: schedules.map((s) => ({
        id: s.id,
        frequency: s.frequency,
        weekdays: s.weekdays || [],
        time_of_day: s.time_of_day,
        timezone: s.timezone || 'UTC',
        channels: s.channels || [],
        message: s.message,
        status: s.status,
        created_at: s.created_at
      }))
    };
  }

  // createReminderSchedule(frequency, weekdays, timeOfDay, timezone, channels, message, status)
  createReminderSchedule(
    frequency,
    weekdays,
    timeOfDay,
    timezone,
    channels,
    message,
    status
  ) {
    this._ensureSingleUserContext();
    const schedules = this._getFromStorage('reminder_schedules', []);

    const schedule = {
      id: this._generateId('rem'),
      frequency,
      weekdays: weekdays || [],
      time_of_day: timeOfDay,
      timezone: timezone || 'UTC',
      channels: channels || [],
      message,
      status,
      created_at: new Date().toISOString(),
      updated_at: null
    };

    schedules.push(schedule);
    this._saveToStorage('reminder_schedules', schedules);

    const summary = `${frequency} reminder at ${timeOfDay}`;
    const planItem = this._addPlanItemForEntity('reminder_schedule', schedule, {
      summary
    });

    return { schedule, planItem, success: true };
  }

  // updateReminderScheduleStatus(scheduleId, status)
  updateReminderScheduleStatus(scheduleId, status) {
    this._ensureSingleUserContext();
    const schedules = this._getFromStorage('reminder_schedules', []);
    const idx = schedules.findIndex((s) => s.id === scheduleId);
    if (idx === -1) return { schedule: null, success: false };

    schedules[idx].status = status;
    schedules[idx].updated_at = new Date().toISOString();
    this._saveToStorage('reminder_schedules', schedules);

    return {
      schedule: {
        id: schedules[idx].id,
        status: schedules[idx].status,
        updated_at: schedules[idx].updated_at
      },
      success: true
    };
  }

  // ---------------------- Courses ----------------------

  // getCourseFilterOptions()
  getCourseFilterOptions() {
    const courses = this._getFromStorage('courses', []);
    const prices = courses.map((c) => c.price).filter((v) => typeof v === 'number');
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    return {
      levels: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All levels' }
      ],
      formats: [
        { value: 'mini_course_under_2_hours', label: 'Mini-course (under 2 hours)' },
        { value: 'full_course', label: 'Full course' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'webinar', label: 'Webinar' }
      ],
      sortOptions: [
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'most_popular', label: 'Most Popular' },
        { value: 'shortest_first', label: 'Shortest duration' }
      ],
      priceRange: {
        minPrice,
        maxPrice
      }
    };
  }

  // listCourses(filters, sortBy)
  listCourses(filters, sortBy) {
    const f = filters || {};
    const sortKey = sortBy || 'recommended_first';
    const all = this._getFromStorage('courses', []);
    let courses = all.slice();

    if (!(f.onlyActive === false)) {
      courses = courses.filter((c) => c.is_active !== false);
    }

    if (typeof f.maxPrice === 'number') {
      courses = courses.filter((c) => (c.price || 0) <= f.maxPrice);
    }

    if (f.level) {
      courses = courses.filter((c) => c.level === f.level);
    }

    if (f.format) {
      courses = courses.filter((c) => c.format === f.format);
    }

    if (sortKey === 'price_low_to_high') {
      courses.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortKey === 'shortest_first') {
      courses.sort(
        (a, b) => (a.total_duration_minutes || 0) - (b.total_duration_minutes || 0)
      );
    } else {
      // recommended_first or most_popular -> approximate by price ascending
      courses.sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    const viewCourses = courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description || '',
      price: c.price,
      price_display: typeof c.price === 'number' ? `$${c.price}` : '',
      currency: c.currency,
      level: c.level,
      level_label:
        c.level && c.level.length
          ? c.level.charAt(0).toUpperCase() + c.level.slice(1).replace('_', ' ')
          : '',
      format: c.format,
      format_label:
        c.format === 'mini_course_under_2_hours'
          ? 'Mini-course (under 2 hours)'
          : c.format === 'full_course'
          ? 'Full course'
          : c.format === 'workshop'
          ? 'Workshop'
          : c.format === 'webinar'
          ? 'Webinar'
          : '',
      lessons_count: c.lessons_count,
      total_duration_minutes: c.total_duration_minutes || null,
      thumbnail_url: c.thumbnail_url || ''
    }));

    return { courses: viewCourses, totalCount: viewCourses.length };
  }

  // getCourseDetail(courseId)
  getCourseDetail(courseId) {
    const course = this._getEntityById('courses', courseId);
    if (!course) {
      return { course: null, isEnrolled: false };
    }

    const enrollments = this._getFromStorage('course_enrollments', []);
    const isEnrolled = enrollments.some((e) => e.course_id === courseId);

    const viewCourse = {
      id: course.id,
      title: course.title,
      description: course.description || '',
      price: course.price,
      price_display: typeof course.price === 'number' ? `$${course.price}` : '',
      currency: course.currency,
      level: course.level,
      level_label:
        course.level && course.level.length
          ? course.level.charAt(0).toUpperCase() + course.level.slice(1).replace('_', ' ')
          : '',
      format: course.format,
      format_label:
        course.format === 'mini_course_under_2_hours'
          ? 'Mini-course (under 2 hours)'
          : course.format === 'full_course'
          ? 'Full course'
          : course.format === 'workshop'
          ? 'Workshop'
          : course.format === 'webinar'
          ? 'Webinar'
          : '',
      lessons_count: course.lessons_count,
      total_duration_minutes: course.total_duration_minutes || null,
      thumbnail_url: course.thumbnail_url || '',
      tags: course.tags || []
    };

    return { course: viewCourse, isEnrolled };
  }

  // enrollInCourse(courseId)
  enrollInCourse(courseId) {
    this._ensureSingleUserContext();
    const course = this._getEntityById('courses', courseId);
    if (!course) {
      return {
        enrollment: null,
        planItem: null,
        success: false,
        message: 'Course not found'
      };
    }

    const enrollments = this._getFromStorage('course_enrollments', []);
    const now = new Date().toISOString();
    const enrollment = {
      id: this._generateId('cenroll'),
      course_id: courseId,
      enrolled_at: now,
      price_paid: course.price || 0,
      status: 'active'
    };

    enrollments.push(enrollment);
    this._saveToStorage('course_enrollments', enrollments);

    const planItem = this._addPlanItemForEntity('course', course);

    const enrollmentWithCourse = this._resolveForeignKey(enrollment, {
      course_id: { storageKey: 'courses', propName: 'course' }
    });

    return {
      enrollment: enrollmentWithCourse,
      planItem,
      success: true,
      message: 'Enrolled in course'
    };
  }

  // ---------------------- Success Stories & Strategies ----------------------

  // getSuccessStoryFilterOptions()
  getSuccessStoryFilterOptions() {
    const stories = this._getFromStorage('success_stories', []);
    const tagsSet = new Set();

    stories.forEach((s) => {
      (s.tags || []).forEach((t) => tagsSet.add(t));
    });

    const categories = [
      { value: 'career_growth', label: 'Career Growth' },
      { value: 'health_wellness', label: 'Health & Wellness' },
      { value: 'relationships', label: 'Relationships' },
      { value: 'productivity', label: 'Productivity' },
      { value: 'general_personal_growth', label: 'General Personal Growth' }
    ];

    const tags = Array.from(tagsSet).map((t) => ({ value: t, label: t }));

    return { categories, tags };
  }

  // listSuccessStories(filters)
  listSuccessStories(filters) {
    const f = filters || {};
    const all = this._getFromStorage('success_stories', []);
    let stories = all.slice();

    if (!(f.onlyPublished === false)) {
      stories = stories.filter((s) => s.is_published !== false);
    }

    if (f.category) {
      stories = stories.filter((s) => s.category === f.category);
    }

    if (f.tag) {
      stories = stories.filter((s) => (s.tags || []).includes(f.tag));
    }

    stories.sort((a, b) => {
      const da = a.published_at ? Date.parse(a.published_at) : 0;
      const db = b.published_at ? Date.parse(b.published_at) : 0;
      return db - da;
    });

    const viewStories = stories.map((s) => ({
      id: s.id,
      title: s.title,
      summary: s.summary || '',
      category: s.category,
      category_label:
        s.category === 'career_growth'
          ? 'Career Growth'
          : s.category === 'health_wellness'
          ? 'Health & Wellness'
          : s.category === 'relationships'
          ? 'Relationships'
          : s.category === 'productivity'
          ? 'Productivity'
          : s.category === 'general_personal_growth'
          ? 'General Personal Growth'
          : '',
      tags: s.tags || [],
      image_url: s.image_url || '',
      published_at: s.published_at || null
    }));

    return { stories: viewStories, totalCount: viewStories.length };
  }

  // getSuccessStoryDetail(storyId)
  getSuccessStoryDetail(storyId) {
    const story = this._getEntityById('success_stories', storyId);
    if (!story) {
      return { story: null, keyStrategies: [] };
    }

    const strategies = this._getFromStorage('strategies', [])
      .filter((st) => st.story_id === storyId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map((st) => ({
        strategy_id: st.id,
        title: st.title,
        description: st.description || '',
        tags: st.tags || []
      }));

    const viewStory = {
      id: story.id,
      title: story.title,
      summary: story.summary || '',
      content: story.content || '',
      category: story.category,
      category_label:
        story.category === 'career_growth'
          ? 'Career Growth'
          : story.category === 'health_wellness'
          ? 'Health & Wellness'
          : story.category === 'relationships'
          ? 'Relationships'
          : story.category === 'productivity'
          ? 'Productivity'
          : story.category === 'general_personal_growth'
          ? 'General Personal Growth'
          : '',
      tags: story.tags || [],
      image_url: story.image_url || '',
      published_at: story.published_at || null
    };

    return { story: viewStory, keyStrategies: strategies };
  }

  // addStrategyToMyPlan(strategyId)
  addStrategyToMyPlan(strategyId) {
    this._ensureSingleUserContext();
    const strategy = this._getEntityById('strategies', strategyId);
    if (!strategy) {
      return { planItem: null, success: false };
    }

    const planItem = this._addPlanItemForEntity('strategy', strategy);
    return { planItem, success: true };
  }

  // ---------------------- FAQ & Contact ----------------------

  // searchFAQItems(query)
  searchFAQItems(query) {
    const q = (query || '').toLowerCase();
    const faqItems = this._getFromStorage('faq_items', []);

    if (!q) {
      return { results: [] };
    }

    const results = faqItems
      .filter((f) => f.is_active !== false)
      .filter((f) => {
        const text = `${f.question || ''} ${f.answer || ''} ${(f.tags || []).join(' ')}`.toLowerCase();
        return text.includes(q);
      })
      .map((f) => ({
        faq_id: f.id,
        question: f.question,
        answer: f.answer,
        tags: f.tags || []
      }));

    return { results };
  }

  // createContactMessage(topic, priority, email, message, relatedFaqId)
  createContactMessage(topic, priority, email, message, relatedFaqId) {
    this._ensureSingleUserContext();
    const messages = this._getFromStorage('contact_messages', []);

    const contactMessage = {
      id: this._generateId('contact'),
      topic,
      priority,
      email,
      message,
      related_faq_id: relatedFaqId || null,
      submitted_at: new Date().toISOString(),
      status: 'open'
    };

    messages.push(contactMessage);
    this._saveToStorage('contact_messages', messages);

    return {
      contactMessage,
      success: true,
      confirmationMessage: 'Your message has been sent. We will reply via email.'
    };
  }

  // ---------------------- My Plan ----------------------

  // listMyPlanItems(filterByType)
  listMyPlanItems(filterByType) {
    this._ensureSingleUserContext();
    const items = this._getFromStorage('plan_items', []);

    let filtered = items.slice();
    if (filterByType) {
      filtered = filtered.filter((i) => i.item_type === filterByType);
    }

    const strategies = this._getFromStorage('strategies', []);
    const courses = this._getFromStorage('courses', []);
    const challenges = this._getFromStorage('challenges', []);
    const routines = this._getFromStorage('routines', []);
    const notes = this._getFromStorage('notes', []);
    const quizAttempts = this._getFromStorage('quiz_attempts', []);
    const planSubs = this._getFromStorage('plan_subscriptions', []);
    const reminderSchedules = this._getFromStorage('reminder_schedules', []);
    const articles = this._getFromStorage('articles', []);

    const mapped = filtered.map((pi) => {
      let contextEntity = null;
      let contextBadge = '';

      if (pi.item_type === 'strategy') {
        contextEntity = strategies.find((s) => s.id === pi.item_ref_id) || null;
        const tags = (contextEntity && contextEntity.tags) || [];
        if (tags.includes('Confidence')) contextBadge = 'Confidence Strategy';
        else contextBadge = 'Key Strategy';
      } else if (pi.item_type === 'course') {
        contextEntity = courses.find((c) => c.id === pi.item_ref_id) || null;
        contextBadge = 'Course';
      } else if (pi.item_type === 'challenge') {
        contextEntity = challenges.find((c) => c.id === pi.item_ref_id) || null;
        if (contextEntity && contextEntity.duration_days) {
          contextBadge = `${contextEntity.duration_days}-Day Challenge`;
        } else {
          contextBadge = 'Challenge';
        }
      } else if (pi.item_type === 'routine') {
        contextEntity = routines.find((r) => r.id === pi.item_ref_id) || null;
        contextBadge = 'Routine';
      } else if (pi.item_type === 'note') {
        contextEntity = notes.find((n) => n.id === pi.item_ref_id) || null;
        contextBadge = 'Note';
      } else if (pi.item_type === 'quiz_result') {
        contextEntity = quizAttempts.find((qa) => qa.id === pi.item_ref_id) || null;
        contextBadge = 'Quiz Result';
      } else if (pi.item_type === 'plan_subscription') {
        contextEntity = planSubs.find((ps) => ps.id === pi.item_ref_id) || null;
        contextBadge = 'Coaching Plan';
      } else if (pi.item_type === 'reminder_schedule') {
        contextEntity =
          reminderSchedules.find((rs) => rs.id === pi.item_ref_id) || null;
        contextBadge = 'Reminder Schedule';
      } else if (pi.item_type === 'article') {
        contextEntity = articles.find((a) => a.id === pi.item_ref_id) || null;
        contextBadge = 'Article';
      }

      const resolved = { ...pi };
      if (pi.item_type === 'strategy') resolved.strategy = contextEntity;
      if (pi.item_type === 'course') resolved.course = contextEntity;
      if (pi.item_type === 'challenge') resolved.challenge = contextEntity;
      if (pi.item_type === 'routine') resolved.routine = contextEntity;
      if (pi.item_type === 'note') resolved.note = contextEntity;
      if (pi.item_type === 'quiz_result') resolved.quiz_attempt = contextEntity;
      if (pi.item_type === 'plan_subscription')
        resolved.plan_subscription = this._resolveForeignKey(contextEntity || {}, {
          plan_id: { storageKey: 'coaching_plans', propName: 'plan' }
        });
      if (pi.item_type === 'reminder_schedule')
        resolved.reminder_schedule = contextEntity;
      if (pi.item_type === 'article') resolved.article = contextEntity;

      return {
        plan_item_id: pi.id,
        item_type: pi.item_type,
        item_ref_id: pi.item_ref_id,
        title: pi.title,
        summary: pi.summary,
        added_at: pi.added_at,
        is_pinned: !!pi.is_pinned,
        context_badge: contextBadge,
        ...resolved
      };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task8_myPlanOpened', 'true');
    } catch (e) {}

    return { items: mapped };
  }

  // removePlanItem(planItemId)
  removePlanItem(planItemId) {
    this._ensureSingleUserContext();
    const items = this._getFromStorage('plan_items', []);
    const idx = items.findIndex((i) => i.id === planItemId);
    if (idx === -1) return { success: false };
    items.splice(idx, 1);
    this._saveToStorage('plan_items', items);
    return { success: true };
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