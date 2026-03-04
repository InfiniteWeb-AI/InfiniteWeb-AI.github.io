/* eslint-disable no-var */
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
      'subscription_plans',
      'trial_signups',
      'workout_plans',
      'saved_workout_plans',
      'planner_weeks',
      'workout_session_templates',
      'weekly_workout_schedules',
      'weekly_workout_entries',
      'calorie_calculations',
      'email_plan_requests',
      'checkout_sessions',
      'live_classes',
      'live_class_bookings',
      'newsletter_subscriptions',
      'faq_items',
      'chat_sessions',
      'chat_messages',
      'contact_form_submissions'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // single_user_context is an object, initialize lazily in _getSingleUserContext
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      if (typeof defaultValue === 'undefined') {
        return [];
      }
      // Return a deep clone of defaultValue to avoid accidental mutation
      return JSON.parse(JSON.stringify(defaultValue));
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      if (typeof defaultValue !== 'undefined') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
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

  // ----------------------
  // Single-user context helpers
  // ----------------------
  _getSingleUserContext() {
    const defaultCtx = {
      id: 'single_user',
      activeCheckoutSessionId: null,
      activeSavedWorkoutPlanId: null,
      currentChatSessionId: null,
      lastCalorieCalculationId: null
    };
    const ctx = this._getFromStorage('single_user_context', defaultCtx);
    // Ensure required fields exist
    if (!ctx.id) ctx.id = 'single_user';
    if (!Object.prototype.hasOwnProperty.call(ctx, 'activeCheckoutSessionId')) ctx.activeCheckoutSessionId = null;
    if (!Object.prototype.hasOwnProperty.call(ctx, 'activeSavedWorkoutPlanId')) ctx.activeSavedWorkoutPlanId = null;
    if (!Object.prototype.hasOwnProperty.call(ctx, 'currentChatSessionId')) ctx.currentChatSessionId = null;
    if (!Object.prototype.hasOwnProperty.call(ctx, 'lastCalorieCalculationId')) ctx.lastCalorieCalculationId = null;
    this._saveToStorage('single_user_context', ctx);
    return ctx;
  }

  _saveSingleUserContext(ctx) {
    this._saveToStorage('single_user_context', ctx);
  }

  // ----------------------
  // Internal helpers
  // ----------------------
  _getOrCreateWeeklySchedule(plannerWeekId) {
    const plannerWeeks = this._getFromStorage('planner_weeks');
    const week = plannerWeeks.find((w) => w.id === plannerWeekId) || null;

    let schedules = this._getFromStorage('weekly_workout_schedules');
    let schedule = schedules.find((s) => s.plannerWeekId === plannerWeekId) || null;

    if (!schedule) {
      const title = week && week.weekLabel ? 'Week of ' + week.weekLabel : null;
      schedule = {
        id: this._generateId('wws'),
        plannerWeekId: plannerWeekId,
        title: title,
        notes: null,
        createdAt: new Date().toISOString()
      };
      schedules.push(schedule);
      this._saveToStorage('weekly_workout_schedules', schedules);
    }

    return schedule;
  }

  _getCurrentCheckoutSession() {
    const ctx = this._getSingleUserContext();
    if (!ctx.activeCheckoutSessionId) {
      return null;
    }
    const sessions = this._getFromStorage('checkout_sessions');
    const session = sessions.find((s) => s.id === ctx.activeCheckoutSessionId) || null;
    if (!session) {
      ctx.activeCheckoutSessionId = null;
      this._saveSingleUserContext(ctx);
    }
    return session;
  }

  _getOrCreateChatSession(source) {
    const ctx = this._getSingleUserContext();
    let sessions = this._getFromStorage('chat_sessions');
    let session = null;

    if (ctx.currentChatSessionId) {
      session = sessions.find((s) => s.id === ctx.currentChatSessionId) || null;
      if (!session || session.status !== 'open' || session.source !== source) {
        session = null;
      }
    }

    if (!session) {
      session = {
        id: this._generateId('chat'),
        startedAt: new Date().toISOString(),
        source: source,
        status: 'open'
      };
      sessions.push(session);
      this._saveToStorage('chat_sessions', sessions);
      ctx.currentChatSessionId = session.id;
      this._saveSingleUserContext(ctx);
    }

    return session;
  }

  _timeStringToMinutes(t) {
    if (!t || typeof t !== 'string') return null;
    const parts = t.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _getDatePartFromISO(isoString) {
    if (!isoString || typeof isoString !== 'string') return null;
    return isoString.substring(0, 10);
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1) getHomePageContent
  getHomePageContent() {
    const defaultContent = {
      heroTitle: '',
      heroSubtitle: '',
      primaryCtaLabel: '',
      keyOutcomes: [],
      featureHighlights: []
    };
    const stored = this._getFromStorage('home_page_content', defaultContent);
    // Ensure required fields exist
    stored.heroTitle = stored.heroTitle || '';
    stored.heroSubtitle = stored.heroSubtitle || '';
    stored.primaryCtaLabel = stored.primaryCtaLabel || '';
    stored.keyOutcomes = Array.isArray(stored.keyOutcomes) ? stored.keyOutcomes : [];
    stored.featureHighlights = Array.isArray(stored.featureHighlights) ? stored.featureHighlights : [];
    return stored;
  }

  // 2) getPlannerWeeks
  getPlannerWeeks() {
    return this._getFromStorage('planner_weeks');
  }

  // 3) getWeeklyPlannerSchedule(plannerWeekId)
  getWeeklyPlannerSchedule(plannerWeekId) {
    const plannerWeeks = this._getFromStorage('planner_weeks');
    const week = plannerWeeks.find((w) => w.id === plannerWeekId) || null;

    if (!week) {
      return {
        plannerWeek: null,
        schedule: null,
        days: []
      };
    }

    const schedule = this._getOrCreateWeeklySchedule(plannerWeekId);
    const entries = this._getFromStorage('weekly_workout_entries');
    const templates = this._getFromStorage('workout_session_templates');

    const scheduleEntries = entries.filter((e) => e.scheduleId === schedule.id);

    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    const days = dayOrder.map((dayKey, index) => {
      const dayEntries = scheduleEntries
        .filter((e) => e.dayOfWeek === dayKey)
        .map((e) => {
          const template = templates.find((t) => t.id === e.workoutSessionTemplateId) || null;
          let workoutSession = null;
          if (template) {
            workoutSession = {
              id: template.id,
              name: template.name,
              category: template.category,
              durationMinutes: template.durationMinutes,
              isUnder45Minutes: typeof template.isUnder45Minutes === 'boolean' ? template.isUnder45Minutes : template.durationMinutes <= 45,
              level: template.level,
              equipment: template.equipment,
              location: template.location
            };
          }
          return {
            entryId: e.id,
            addedAt: e.addedAt,
            workoutSession: workoutSession
          };
        });

      let date = null;
      if (week.startDate) {
        const start = new Date(week.startDate);
        if (!isNaN(start.getTime())) {
          const d = new Date(start.getTime());
          d.setDate(start.getDate() + index);
          date = d.toISOString();
        }
      }

      return {
        dayOfWeek: dayKey,
        date: date,
        entries: dayEntries
      };
    });

    return {
      plannerWeek: {
        id: week.id,
        weekLabel: week.weekLabel,
        startDate: week.startDate,
        endDate: week.endDate,
        isCurrentWeek: !!week.isCurrentWeek
      },
      schedule: {
        id: schedule.id,
        title: schedule.title || null,
        notes: schedule.notes || null,
        createdAt: schedule.createdAt
      },
      days: days
    };
  }

  // 4) searchPlannerWorkouts(category, maxDurationMinutes = 45, level, equipment, location)
  searchPlannerWorkouts(category, maxDurationMinutes, level, equipment, location) {
    const maxDur = typeof maxDurationMinutes === 'number' ? maxDurationMinutes : 45;
    const templates = this._getFromStorage('workout_session_templates');
    return templates.filter((t) => {
      if (t.status !== 'active') return false;
      if (t.category !== category) return false;
      if (typeof t.durationMinutes === 'number' && t.durationMinutes > maxDur) return false;
      if (level && t.level !== level) return false;
      if (equipment && t.equipment !== equipment) return false;
      if (location && t.location !== location) return false;
      return true;
    });
  }

  // 5) addWorkoutToPlanner(plannerWeekId, dayOfWeek, workoutSessionTemplateId)
  addWorkoutToPlanner(plannerWeekId, dayOfWeek, workoutSessionTemplateId) {
    const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    if (validDays.indexOf(dayOfWeek) === -1) {
      return {
        success: false,
        scheduleId: null,
        entryId: null,
        updatedDay: null,
        message: 'Invalid dayOfWeek'
      };
    }

    const templates = this._getFromStorage('workout_session_templates');
    const template = templates.find((t) => t.id === workoutSessionTemplateId) || null;
    if (!template) {
      return {
        success: false,
        scheduleId: null,
        entryId: null,
        updatedDay: null,
        message: 'Workout session template not found'
      };
    }

    const schedule = this._getOrCreateWeeklySchedule(plannerWeekId);
    const plannerWeeks = this._getFromStorage('planner_weeks');
    const week = plannerWeeks.find((w) => w.id === plannerWeekId) || null;

    const entries = this._getFromStorage('weekly_workout_entries');

    let date = null;
    if (week && week.startDate) {
      const start = new Date(week.startDate);
      if (!isNaN(start.getTime())) {
        const dayIndex = validDays.indexOf(dayOfWeek);
        const d = new Date(start.getTime());
        d.setDate(start.getDate() + dayIndex);
        date = d.toISOString();
      }
    }

    const newEntry = {
      id: this._generateId('wwe'),
      scheduleId: schedule.id,
      plannerWeekId: plannerWeekId,
      dayOfWeek: dayOfWeek,
      date: date,
      workoutSessionTemplateId: workoutSessionTemplateId,
      addedAt: new Date().toISOString()
    };

    entries.push(newEntry);
    this._saveToStorage('weekly_workout_entries', entries);

    // Build updatedDay
    const updatedEntriesRaw = entries.filter((e) => e.scheduleId === schedule.id && e.dayOfWeek === dayOfWeek);
    const updatedEntries = updatedEntriesRaw.map((e) => {
      const tmpl = templates.find((t) => t.id === e.workoutSessionTemplateId) || null;
      return {
        entryId: e.id,
        workoutSessionTemplateId: e.workoutSessionTemplateId,
        workoutName: tmpl ? tmpl.name : null,
        durationMinutes: tmpl ? tmpl.durationMinutes : null
      };
    });

    return {
      success: true,
      scheduleId: schedule.id,
      entryId: newEntry.id,
      updatedDay: {
        dayOfWeek: dayOfWeek,
        entries: updatedEntries
      },
      message: 'Workout added to planner'
    };
  }

  // 6) removeWorkoutFromPlanner(weeklyWorkoutEntryId)
  removeWorkoutFromPlanner(weeklyWorkoutEntryId) {
    let entries = this._getFromStorage('weekly_workout_entries');
    const index = entries.findIndex((e) => e.id === weeklyWorkoutEntryId);
    if (index === -1) {
      return {
        success: false,
        message: 'Entry not found'
      };
    }
    entries.splice(index, 1);
    this._saveToStorage('weekly_workout_entries', entries);
    return {
      success: true,
      message: 'Entry removed'
    };
  }

  // 7) getCalorieCalculatorOptions
  getCalorieCalculatorOptions() {
    return {
      genderOptions: [
        { value: 'female', label: 'Female' },
        { value: 'male', label: 'Male' },
        { value: 'non_binary', label: 'Non-binary' },
        { value: 'prefer_not_to_say', label: 'Prefer not to say' }
      ],
      activityLevelOptions: [
        {
          value: 'sedentary',
          label: 'Sedentary',
          description: 'Little or no exercise'
        },
        {
          value: 'lightly_active',
          label: 'Lightly active',
          description: 'Light exercise 1–3 days/week'
        },
        {
          value: 'moderately_active',
          label: 'Moderately active',
          description: 'Moderate exercise 3–5 days/week'
        },
        {
          value: 'very_active',
          label: 'Very active',
          description: 'Hard exercise 6–7 days/week'
        },
        {
          value: 'extra_active',
          label: 'Extra active',
          description: 'Very hard exercise, physical job, or training twice a day'
        }
      ],
      goalOptions: [
        { value: 'lose_0_5_kg_per_week', label: 'Lose 0.5 kg per week' },
        { value: 'lose_1_0_kg_per_week', label: 'Lose 1.0 kg per week' },
        { value: 'maintain_weight', label: 'Maintain weight' },
        { value: 'gain_0_5_kg_per_week', label: 'Gain 0.5 kg per week' },
        { value: 'gain_1_0_kg_per_week', label: 'Gain 1.0 kg per week' }
      ]
    };
  }

  // 8) calculateCaloriePlan(age, weightKg, heightCm, gender, activityLevel, goal)
  calculateCaloriePlan(age, weightKg, heightCm, gender, activityLevel, goal) {
    const a = Number(age);
    const w = Number(weightKg);
    const h = Number(heightCm);

    // Mifflin-St Jeor
    let bmrFemale = 10 * w + 6.25 * h - 5 * a - 161;
    let bmrMale = 10 * w + 6.25 * h - 5 * a + 5;
    let bmr;
    if (gender === 'female') bmr = bmrFemale;
    else if (gender === 'male') bmr = bmrMale;
    else bmr = (bmrFemale + bmrMale) / 2;

    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extra_active: 1.9
    };
    const multiplier = activityMultipliers[activityLevel] || 1.2;
    let tdee = bmr * multiplier;

    let delta = 0;
    if (goal === 'lose_0_5_kg_per_week') delta = -500;
    else if (goal === 'lose_1_0_kg_per_week') delta = -1000;
    else if (goal === 'gain_0_5_kg_per_week') delta = 500;
    else if (goal === 'gain_1_0_kg_per_week') delta = 1000;

    let calories = tdee + delta;
    if (calories < 1200) calories = 1200; // simple floor
    calories = Math.round(calories);

    // Simple macro split: protein 2g/kg, fat 0.9g/kg, rest carbs
    let proteinGrams = Math.round(w * 2);
    let fatGrams = Math.round(w * 0.9);
    let proteinCals = proteinGrams * 4;
    let fatCals = fatGrams * 9;
    let remainingCals = calories - (proteinCals + fatCals);
    if (remainingCals < 0) remainingCals = Math.round(calories * 0.3);
    let carbsGrams = Math.round(remainingCals / 4);

    const calculation = {
      id: this._generateId('calc'),
      age: a,
      weightKg: w,
      heightCm: h,
      gender: gender,
      activityLevel: activityLevel,
      goal: goal,
      calculatedCaloriesPerDay: calories,
      proteinGramsPerDay: proteinGrams,
      carbsGramsPerDay: carbsGrams,
      fatsGramsPerDay: fatGrams,
      createdAt: new Date().toISOString()
    };

    const calcs = this._getFromStorage('calorie_calculations');
    calcs.push(calculation);
    this._saveToStorage('calorie_calculations', calcs);

    const ctx = this._getSingleUserContext();
    ctx.lastCalorieCalculationId = calculation.id;
    this._saveSingleUserContext(ctx);

    const summaryText = 'Target ' + calories + ' kcal/day with approximately ' +
      proteinGrams + 'g protein, ' + carbsGrams + 'g carbs, ' + fatGrams + 'g fats.';

    return {
      calculation: calculation,
      display: {
        caloriesPerDay: calories,
        proteinGramsPerDay: proteinGrams,
        carbsGramsPerDay: carbsGrams,
        fatsGramsPerDay: fatGrams,
        summaryText: summaryText
      }
    };
  }

  // 9) emailCaloriePlan(calorieCalculationId, email)
  emailCaloriePlan(calorieCalculationId, email) {
    const calcs = this._getFromStorage('calorie_calculations');
    const calc = calcs.find((c) => c.id === calorieCalculationId) || null;
    if (!calc) {
      const failed = {
        id: this._generateId('epr'),
        calorieCalculationId: calorieCalculationId,
        email: email,
        sentAt: null,
        status: 'failed'
      };
      const reqs = this._getFromStorage('email_plan_requests');
      reqs.push(failed);
      this._saveToStorage('email_plan_requests', reqs);
      return {
        emailPlanRequest: Object.assign({}, failed, { calorieCalculation: null }),
        success: false,
        message: 'Calorie calculation not found'
      };
    }

    const request = {
      id: this._generateId('epr'),
      calorieCalculationId: calorieCalculationId,
      email: email,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };
    const requests = this._getFromStorage('email_plan_requests');
    requests.push(request);
    this._saveToStorage('email_plan_requests', requests);

    const enrichedRequest = Object.assign({}, request, { calorieCalculation: calc });

    return {
      emailPlanRequest: enrichedRequest,
      success: true,
      message: 'Plan emailed (simulated)'
    };
  }

  // 10) getNewsletterOptions
  getNewsletterOptions() {
    return {
      focusAreaOptions: [
        { value: 'strength', label: 'Strength' },
        { value: 'mobility_flexibility', label: 'Mobility & Flexibility' },
        { value: 'weight_loss', label: 'Weight loss' },
        { value: 'cardio_endurance', label: 'Cardio & Endurance' },
        { value: 'yoga_mindfulness', label: 'Yoga & Mindfulness' },
        { value: 'general_fitness', label: 'General fitness' }
      ],
      emailFrequencyOptions: [
        { value: 'once_per_week', label: 'Once per week' },
        { value: 'three_times_per_week', label: '3 times per week' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' }
      ],
      notificationTopicOptions: [
        {
          value: 'training_tips_workout_reminders',
          label: 'Training tips & workout reminders'
        },
        { value: 'promotions', label: 'Promotions' },
        { value: 'product_updates', label: 'Product updates' },
        { value: 'community_highlights', label: 'Community highlights' }
      ]
    };
  }

  // 11) subscribeToNewsletter(email, firstName, focusAreas, emailFrequency, notificationTopics)
  subscribeToNewsletter(email, firstName, focusAreas, emailFrequency, notificationTopics) {
    const subscription = {
      id: this._generateId('ns'),
      email: email,
      firstName: firstName || null,
      focusAreas: Array.isArray(focusAreas) ? focusAreas : [],
      emailFrequency: emailFrequency,
      notificationTopics: Array.isArray(notificationTopics) ? notificationTopics : [],
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    const subs = this._getFromStorage('newsletter_subscriptions');
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription: subscription,
      success: true,
      message: 'Subscribed to newsletter'
    };
  }

  // 12) getFaqPreview
  getFaqPreview() {
    const faqs = this._getFromStorage('faq_items');
    const featured = faqs
      .filter((f) => f.status === 'published' && f.isFeatured)
      .sort((a, b) => {
        const ao = typeof a.displayOrder === 'number' ? a.displayOrder : 0;
        const bo = typeof b.displayOrder === 'number' ? b.displayOrder : 0;
        return ao - bo;
      });
    return featured;
  }

  // 13) getPricingPlans(billingPeriod)
  getPricingPlans(billingPeriod) {
    const plans = this._getFromStorage('subscription_plans');
    const activePlans = plans.filter((p) => p.status === 'active');

    const result = activePlans.map((plan) => {
      let pricePerBillingPeriod;
      let equivalentMonthlyPrice;
      let priceLabel;

      if (billingPeriod === 'annual') {
        pricePerBillingPeriod = plan.annualPrice;
        equivalentMonthlyPrice = plan.annualEffectiveMonthlyPrice;
        priceLabel = '$' + pricePerBillingPeriod + ' billed annually ($' + equivalentMonthlyPrice + '/mo)';
      } else {
        pricePerBillingPeriod = plan.baseMonthlyPrice;
        equivalentMonthlyPrice = plan.baseMonthlyPrice;
        priceLabel = '$' + pricePerBillingPeriod + '/mo';
      }

      let trialLabel = '';
      if (plan.trialAvailable && plan.trialDurationDays) {
        trialLabel = plan.trialDurationDays + '-day free trial';
      }

      return {
        plan: plan,
        display: {
          billingPeriod: billingPeriod,
          pricePerBillingPeriod: pricePerBillingPeriod,
          equivalentMonthlyPrice: equivalentMonthlyPrice,
          priceLabel: priceLabel,
          trialLabel: trialLabel,
          highlightBadge: '',
          includesMealPlans: !!plan.includesMealPlans,
          oneOnOneSessionsPerMonth: plan.oneOnOneSessionsPerMonth
        }
      };
    });

    result.sort((a, b) => {
      const ao = typeof a.plan.displayOrder === 'number' ? a.plan.displayOrder : 0;
      const bo = typeof b.plan.displayOrder === 'number' ? b.plan.displayOrder : 0;
      return ao - bo;
    });

    return result;
  }

  // 14) getPlanDetail(planId)
  getPlanDetail(planId) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        plan: null,
        pricingSummary: null,
        featureHighlights: [],
        comparisonPlans: []
      };
    }

    const pricingSummary = {
      monthlyPrice: plan.baseMonthlyPrice,
      annualPrice: plan.annualPrice,
      annualEffectiveMonthlyPrice: plan.annualEffectiveMonthlyPrice
    };

    const featureHighlights = Array.isArray(plan.featureList) ? plan.featureList : [];

    const comparisonPlans = plans
      .filter((p) => p.status === 'active' && p.id !== plan.id)
      .map((other) => ({
        plan: other,
        keyDifferences: []
      }));

    return {
      plan: plan,
      pricingSummary: pricingSummary,
      featureHighlights: featureHighlights,
      comparisonPlans: comparisonPlans
    };
  }

  // 15) choosePlanForCheckout(planId, billingPeriod)
  choosePlanForCheckout(planId, billingPeriod) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        checkoutSession: null,
        success: false,
        nextStep: null,
        message: 'Plan not found'
      };
    }

    let pricePerBillingPeriod;
    let equivalentMonthlyPrice;
    if (billingPeriod === 'annual') {
      pricePerBillingPeriod = plan.annualPrice;
      equivalentMonthlyPrice = plan.annualEffectiveMonthlyPrice;
    } else {
      pricePerBillingPeriod = plan.baseMonthlyPrice;
      equivalentMonthlyPrice = plan.baseMonthlyPrice;
    }

    const session = {
      id: this._generateId('chk'),
      planId: plan.id,
      planNameSnapshot: plan.name,
      billingPeriod: billingPeriod,
      pricePerBillingPeriod: pricePerBillingPeriod,
      equivalentMonthlyPrice: equivalentMonthlyPrice,
      currency: plan.currency,
      createdAt: new Date().toISOString(),
      status: 'initiated'
    };

    const sessions = this._getFromStorage('checkout_sessions');
    sessions.push(session);
    this._saveToStorage('checkout_sessions', sessions);

    const ctx = this._getSingleUserContext();
    ctx.activeCheckoutSessionId = session.id;
    this._saveSingleUserContext(ctx);

    const enrichedSession = Object.assign({}, session, { plan: plan });

    return {
      checkoutSession: enrichedSession,
      success: true,
      nextStep: 'checkout',
      message: 'Checkout session initiated'
    };
  }

  // 16) getTrialSignupContext(planId)
  getTrialSignupContext(planId) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        plan: null,
        trialSummary: {
          trialAvailable: false,
          trialDurationDays: 0,
          priceLabel: '',
          includesMealPlans: false
        }
      };
    }

    const priceLabel = '$' + plan.baseMonthlyPrice + '/mo';

    return {
      plan: plan,
      trialSummary: {
        trialAvailable: !!plan.trialAvailable,
        trialDurationDays: plan.trialDurationDays || 0,
        priceLabel: priceLabel,
        includesMealPlans: !!plan.includesMealPlans
      }
    };
  }

  // 17) submitTrialSignup(planId, fullName, email, primaryFitnessGoal)
  submitTrialSignup(planId, fullName, email, primaryFitnessGoal) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        trialSignup: null,
        success: false,
        message: 'Plan not found',
        nextStep: null
      };
    }

    if (!plan.trialAvailable) {
      return {
        trialSignup: null,
        success: false,
        message: 'Trial not available for this plan',
        nextStep: null
      };
    }

    const signup = {
      id: this._generateId('trial'),
      planId: plan.id,
      planNameSnapshot: plan.name,
      trialDurationDaysSnapshot: plan.trialDurationDays || null,
      fullName: fullName,
      email: email,
      primaryFitnessGoal: primaryFitnessGoal,
      createdAt: new Date().toISOString(),
      status: 'submitted'
    };

    const signups = this._getFromStorage('trial_signups');
    signups.push(signup);
    this._saveToStorage('trial_signups', signups);

    const enrichedSignup = Object.assign({}, signup, { plan: plan });

    return {
      trialSignup: enrichedSignup,
      success: true,
      message: 'Trial signup submitted',
      nextStep: 'trial_confirmation'
    };
  }

  // 18) getCheckoutSummary()
  getCheckoutSummary() {
    const session = this._getCurrentCheckoutSession();
    if (!session) {
      return {
        checkoutSession: null,
        plan: null,
        pricingSummary: null,
        coachingSummary: null
      };
    }

    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find((p) => p.id === session.planId) || null;

    const pricingSummary = {
      billingPeriod: session.billingPeriod,
      pricePerBillingPeriod: session.pricePerBillingPeriod,
      equivalentMonthlyPrice: session.equivalentMonthlyPrice,
      currency: session.currency
    };

    let coachingSummary = null;
    if (plan) {
      coachingSummary = {
        oneOnOneSessionsPerMonth: plan.oneOnOneSessionsPerMonth,
        meetsTargetUnder40PerMonth: session.equivalentMonthlyPrice <= 40
      };
    }

    const enrichedSession = Object.assign({}, session, { plan: plan });

    return {
      checkoutSession: enrichedSession,
      plan: plan,
      pricingSummary: pricingSummary,
      coachingSummary: coachingSummary
    };
  }

  // 19) confirmCheckoutSelection(fullName, email)
  confirmCheckoutSelection(fullName, email) {
    const sessions = this._getFromStorage('checkout_sessions');
    const session = this._getCurrentCheckoutSession();
    if (!session) {
      return {
        checkoutSession: null,
        success: false,
        message: 'No active checkout session'
      };
    }

    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      sessions[idx].status = 'completed';
      this._saveToStorage('checkout_sessions', sessions);
    }

    const ctx = this._getSingleUserContext();
    ctx.activeCheckoutSessionId = session.id;
    this._saveSingleUserContext(ctx);

    return {
      checkoutSession: sessions[idx] || session,
      success: true,
      message: 'Checkout confirmed (simulated)'
    };
  }

  // 20) getWorkoutFilterOptions
  getWorkoutFilterOptions() {
    return {
      levelOptions: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All levels' }
      ],
      equipmentOptions: [
        { value: 'no_equipment', label: 'No equipment' },
        { value: 'minimal_equipment', label: 'Minimal equipment' },
        { value: 'full_gym', label: 'Full gym' },
        { value: 'resistance_bands', label: 'Resistance bands' },
        { value: 'dumbbells_only', label: 'Dumbbells only' }
      ],
      locationOptions: [
        { value: 'home', label: 'Home' },
        { value: 'gym', label: 'Gym' },
        { value: 'outdoor', label: 'Outdoor' },
        { value: 'studio', label: 'Studio' },
        { value: 'mixed', label: 'Mixed' }
      ],
      sessionsPerWeekOptions: [
        { value: '1_2', label: '1–2 sessions/week', minSessionsPerWeek: 1 },
        { value: '3', label: '3 sessions/week', minSessionsPerWeek: 3 },
        { value: '4_plus', label: '4+ sessions/week', minSessionsPerWeek: 4 }
      ]
    };
  }

  // 21) searchWorkoutPlans(filters)
  searchWorkoutPlans(filters) {
    const f = filters || {};

    // Instrumentation for task completion tracking (task_2)
    try {
      localStorage.setItem('task2_filterParams', JSON.stringify(filters || {}));
    } catch (e) {}

    const plans = this._getFromStorage('workout_plans');
    return plans.filter((p) => {
      if (p.status !== 'active') return false;

      if (Array.isArray(f.levels) && f.levels.length > 0 && f.levels.indexOf(p.level) === -1) {
        return false;
      }
      if (Array.isArray(f.equipments) && f.equipments.length > 0 && f.equipments.indexOf(p.equipment) === -1) {
        return false;
      }
      if (Array.isArray(f.locations) && f.locations.length > 0 && f.locations.indexOf(p.location) === -1) {
        return false;
      }
      if (typeof f.minSessionsPerWeek === 'number' && p.sessionsPerWeek < f.minSessionsPerWeek) {
        return false;
      }
      if (typeof f.maxSessionsPerWeek === 'number' && p.sessionsPerWeek > f.maxSessionsPerWeek) {
        return false;
      }
      if (f.textQuery && typeof f.textQuery === 'string' && f.textQuery.trim() !== '') {
        const q = f.textQuery.toLowerCase();
        const inName = (p.name || '').toLowerCase().indexOf(q) !== -1;
        const inSubtitle = (p.subtitle || '').toLowerCase().indexOf(q) !== -1;
        const inDesc = (p.description || '').toLowerCase().indexOf(q) !== -1;
        const inTags = Array.isArray(p.tags) && p.tags.some((t) => (t || '').toLowerCase().indexOf(q) !== -1);
        if (!inName && !inSubtitle && !inDesc && !inTags) return false;
      }

      return true;
    });
  }

  // 22) getWorkoutPlanDetail(workoutPlanId)
  getWorkoutPlanDetail(workoutPlanId) {
    const plans = this._getFromStorage('workout_plans');
    const plan = plans.find((p) => p.id === workoutPlanId) || null;
    if (!plan) {
      return {
        workoutPlan: null,
        weeklyStructure: [],
        typicalSessionDurationRange: null
      };
    }

    const typicalSessionDurationRange = {
      minMinutes: typeof plan.minSessionDurationMinutes === 'number' ? plan.minSessionDurationMinutes : null,
      maxMinutes: typeof plan.maxSessionDurationMinutes === 'number' ? plan.maxSessionDurationMinutes : null
    };

    return {
      workoutPlan: plan,
      weeklyStructure: [],
      typicalSessionDurationRange: typicalSessionDurationRange
    };
  }

  // 23) saveWorkoutPlan(workoutPlanId, notes)
  saveWorkoutPlan(workoutPlanId, notes) {
    const plans = this._getFromStorage('workout_plans');
    const plan = plans.find((p) => p.id === workoutPlanId) || null;
    if (!plan) {
      return {
        savedWorkoutPlan: null,
        success: false,
        message: 'Workout plan not found'
      };
    }

    const saved = this._getFromStorage('saved_workout_plans');
    const record = {
      id: this._generateId('swp'),
      workoutPlanId: workoutPlanId,
      savedAt: new Date().toISOString(),
      status: 'saved',
      notes: notes || null
    };
    saved.push(record);
    this._saveToStorage('saved_workout_plans', saved);

    const ctx = this._getSingleUserContext();
    if (!ctx.activeSavedWorkoutPlanId) {
      ctx.activeSavedWorkoutPlanId = record.id;
      this._saveSingleUserContext(ctx);
    }

    const enriched = Object.assign({}, record, { workoutPlan: plan });

    return {
      savedWorkoutPlan: enriched,
      success: true,
      message: 'Workout plan saved'
    };
  }

  // 24) getMySavedWorkoutPlans()
  getMySavedWorkoutPlans() {
    const saved = this._getFromStorage('saved_workout_plans');
    const plans = this._getFromStorage('workout_plans');
    const ctx = this._getSingleUserContext();

    return saved.map((s) => {
      const plan = plans.find((p) => p.id === s.workoutPlanId) || null;
      const enrichedSaved = Object.assign({}, s, { workoutPlan: plan });
      return {
        savedWorkoutPlan: enrichedSaved,
        workoutPlan: plan,
        isActive: ctx.activeSavedWorkoutPlanId === s.id
      };
    });
  }

  // 25) removeSavedWorkoutPlan(savedWorkoutPlanId)
  removeSavedWorkoutPlan(savedWorkoutPlanId) {
    let saved = this._getFromStorage('saved_workout_plans');
    const index = saved.findIndex((s) => s.id === savedWorkoutPlanId);
    if (index === -1) {
      return {
        success: false,
        message: 'Saved workout plan not found'
      };
    }
    saved.splice(index, 1);
    this._saveToStorage('saved_workout_plans', saved);

    const ctx = this._getSingleUserContext();
    if (ctx.activeSavedWorkoutPlanId === savedWorkoutPlanId) {
      ctx.activeSavedWorkoutPlanId = null;
      this._saveSingleUserContext(ctx);
    }

    return {
      success: true,
      message: 'Saved workout plan removed'
    };
  }

  // 26) setActiveWorkoutPlan(savedWorkoutPlanId)
  setActiveWorkoutPlan(savedWorkoutPlanId) {
    const saved = this._getFromStorage('saved_workout_plans');
    const exists = saved.some((s) => s.id === savedWorkoutPlanId);
    if (!exists) {
      return {
        success: false,
        message: 'Saved workout plan not found'
      };
    }
    const ctx = this._getSingleUserContext();
    ctx.activeSavedWorkoutPlanId = savedWorkoutPlanId;
    this._saveSingleUserContext(ctx);
    return {
      success: true,
      message: 'Active workout plan updated'
    };
  }

  // 27) getLiveClassFilterOptions
  getLiveClassFilterOptions() {
    return {
      startTimeRangeOptions: [
        {
          id: 'evening_6_10',
          label: '6:00 PM – 10:00 PM',
          fromTime: '18:00',
          toTime: '22:00'
        }
      ],
      durationOptions: [
        {
          id: '45_or_less',
          label: '45 minutes or less',
          maxDurationMinutes: 45
        },
        {
          id: '30_or_less',
          label: '30 minutes or less',
          maxDurationMinutes: 30
        }
      ],
      ratingOptions: [
        {
          id: '4_5_plus',
          label: '4.5+ stars',
          minRating: 4.5
        },
        {
          id: '4_plus',
          label: '4.0+ stars',
          minRating: 4.0
        }
      ],
      classTypeOptions: [
        { value: 'strength', label: 'Strength' },
        { value: 'cardio', label: 'Cardio' },
        { value: 'yoga', label: 'Yoga' },
        { value: 'mobility', label: 'Mobility' },
        { value: 'hiit', label: 'HIIT' },
        { value: 'pilates', label: 'Pilates' },
        { value: 'stretching', label: 'Stretching' },
        { value: 'meditation', label: 'Meditation' },
        { value: 'mixed', label: 'Mixed' }
      ]
    };
  }

  // 28) searchLiveClasses(date, filters)
  searchLiveClasses(date, filters) {
    const f = filters || {};
    const classes = this._getFromStorage('live_classes');
    const dateStr = (date || '').substring(0, 10);

    // Instrumentation for task completion tracking (task_6)
    try {
      localStorage.setItem('task6_searchParams', JSON.stringify({ date: date || null, filters: filters || {} }));
    } catch (e) {}

    return classes.filter((c) => {
      if (c.status !== 'scheduled') return false;

      const classDate = this._getDatePartFromISO(c.date || c.startDateTime);
      if (dateStr && classDate !== dateStr) return false;

      if (f.startTimeRange && (f.startTimeRange.fromTime || f.startTimeRange.toTime)) {
        const startIso = c.startDateTime;
        const timePart = startIso && typeof startIso === 'string' && startIso.indexOf('T') !== -1
          ? startIso.split('T')[1].substring(0, 5)
          : null;
        const startMinutes = this._timeStringToMinutes(timePart);
        const fromMinutes = this._timeStringToMinutes(f.startTimeRange.fromTime);
        const toMinutes = this._timeStringToMinutes(f.startTimeRange.toTime);
        if (startMinutes === null) return false;
        if (fromMinutes !== null && startMinutes < fromMinutes) return false;
        if (toMinutes !== null && startMinutes > toMinutes) return false;
      }

      if (typeof f.maxDurationMinutes === 'number' && c.durationMinutes > f.maxDurationMinutes) {
        return false;
      }
      if (typeof f.minRating === 'number' && c.rating < f.minRating) {
        return false;
      }
      if (Array.isArray(f.classTypes) && f.classTypes.length > 0 && f.classTypes.indexOf(c.classType) === -1) {
        return false;
      }
      return true;
    });
  }

  // 29) getLiveClassDetail(liveClassId)
  getLiveClassDetail(liveClassId) {
    const classes = this._getFromStorage('live_classes');
    const cls = classes.find((c) => c.id === liveClassId) || null;
    if (!cls) {
      return {
        liveClass: null,
        derived: null
      };
    }

    const startIso = cls.startDateTime;
    const timePart = startIso && typeof startIso === 'string' && startIso.indexOf('T') !== -1
      ? startIso.split('T')[1].substring(0, 5)
      : null;
    const minutes = this._timeStringToMinutes(timePart);
    const eveningFrom = this._timeStringToMinutes('18:00');
    const eveningTo = this._timeStringToMinutes('22:00');

    const derived = {
      isEveningClass: minutes !== null && eveningFrom !== null && eveningTo !== null && minutes >= eveningFrom && minutes <= eveningTo,
      isUnder45Minutes: cls.durationMinutes <= 45,
      hasHighRating: cls.rating >= 4.5
    };

    return {
      liveClass: cls,
      derived: derived
    };
  }

  // 30) bookLiveClass(liveClassId, attendeeName)
  bookLiveClass(liveClassId, attendeeName) {
    const classes = this._getFromStorage('live_classes');
    const clsIndex = classes.findIndex((c) => c.id === liveClassId);
    if (clsIndex === -1) {
      return {
        liveClassBooking: null,
        success: false,
        message: 'Live class not found',
        joinInstructions: null
      };
    }
    const cls = classes[clsIndex];

    if (cls.status !== 'scheduled') {
      return {
        liveClassBooking: null,
        success: false,
        message: 'Class is not available for booking',
        joinInstructions: null
      };
    }

    if (typeof cls.spotsRemaining === 'number' && cls.spotsRemaining <= 0) {
      return {
        liveClassBooking: null,
        success: false,
        message: 'No spots remaining',
        joinInstructions: null
      };
    }

    const booking = {
      id: this._generateId('lcb'),
      liveClassId: liveClassId,
      attendeeName: attendeeName,
      bookedAt: new Date().toISOString(),
      status: 'booked'
    };

    const bookings = this._getFromStorage('live_class_bookings');
    bookings.push(booking);
    this._saveToStorage('live_class_bookings', bookings);

    if (typeof cls.spotsRemaining === 'number') {
      classes[clsIndex].spotsRemaining = cls.spotsRemaining - 1;
      this._saveToStorage('live_classes', classes);
    }

    const enriched = Object.assign({}, booking, { liveClass: cls });

    return {
      liveClassBooking: enriched,
      success: true,
      message: 'Live class booked',
      joinInstructions: 'Booking confirmed. Join instructions will be sent via email (simulated).'
    };
  }

  // 31) getFaqPageContent
  getFaqPageContent() {
    const faqs = this._getFromStorage('faq_items');
    const published = faqs.filter((f) => f.status === 'published');
    const featuredItems = published.filter((f) => f.isFeatured);
    const categories = ['membership', 'billing', 'workouts', 'live_classes', 'technical', 'general'];
    const popularSearches = ['pause membership', 'billing', 'live classes'];

    return {
      featuredItems: featuredItems,
      categories: categories,
      popularSearches: popularSearches
    };
  }

  // 32) searchFaqItems(query)
  searchFaqItems(query) {
    const q = (query || '').trim().toLowerCase();

    // Instrumentation for task completion tracking (task_8)
    try {
      localStorage.setItem('task8_lastFaqSearchQuery', query || '');
    } catch (e) {}

    const faqs = this._getFromStorage('faq_items');
    const published = faqs.filter((f) => f.status === 'published');
    if (!q) return published;
    return published.filter((f) => {
      const inQuestion = (f.question || '').toLowerCase().indexOf(q) !== -1;
      const inAnswer = (f.answer || '').toLowerCase().indexOf(q) !== -1;
      const inTags = Array.isArray(f.tags) && f.tags.some((t) => (t || '').toLowerCase().indexOf(q) !== -1);
      const inKeywords = Array.isArray(f.searchKeywords) && f.searchKeywords.some((t) => (t || '').toLowerCase().indexOf(q) !== -1);
      return inQuestion || inAnswer || inTags || inKeywords;
    });
  }

  // 33) startChatFromFaq()
  startChatFromFaq() {
    const session = this._getOrCreateChatSession('faq_page');
    const welcomeMessage = 'Hi! How can we help you with your membership or training today?';
    return {
      chatSession: session,
      welcomeMessage: welcomeMessage
    };
  }

  // 34) sendChatMessage(messageText)
  sendChatMessage(messageText) {
    const session = this._getOrCreateChatSession('faq_page');
    const messages = this._getFromStorage('chat_messages');

    const userMessage = {
      id: this._generateId('chatmsg'),
      chatSessionId: session.id,
      senderType: 'user',
      messageText: messageText,
      sentAt: new Date().toISOString()
    };
    messages.push(userMessage);

    let botText = 'Thanks for your message. Our team will get back to you shortly.';
    const lower = (messageText || '').toLowerCase();
    if (lower.indexOf('pause') !== -1 && lower.indexOf('membership') !== -1) {
      botText = 'We have received your question about pausing your membership. A support agent will review your account and reply with details about pausing without losing progress data.';
    }

    const botReply = {
      id: this._generateId('chatmsg'),
      chatSessionId: session.id,
      senderType: 'bot',
      messageText: botText,
      sentAt: new Date().toISOString()
    };
    messages.push(botReply);

    this._saveToStorage('chat_messages', messages);

    return {
      userMessage: userMessage,
      botReply: botReply,
      chatSession: session
    };
  }

  // 35) getAboutPageContent
  getAboutPageContent() {
    const defaultContent = {
      mission: '',
      trainingPhilosophy: '',
      teamMembers: [],
      testimonials: [],
      partnerLogos: []
    };
    const stored = this._getFromStorage('about_page_content', defaultContent);
    stored.mission = stored.mission || '';
    stored.trainingPhilosophy = stored.trainingPhilosophy || '';
    stored.teamMembers = Array.isArray(stored.teamMembers) ? stored.teamMembers : [];
    stored.testimonials = Array.isArray(stored.testimonials) ? stored.testimonials : [];
    stored.partnerLogos = Array.isArray(stored.partnerLogos) ? stored.partnerLogos : [];
    return stored;
  }

  // 36) getContactPageContent
  getContactPageContent() {
    const defaultContent = {
      supportEmail: '',
      businessAddress: '',
      phoneNumber: '',
      socialLinks: []
    };
    const stored = this._getFromStorage('contact_page_content', defaultContent);
    stored.supportEmail = stored.supportEmail || '';
    stored.businessAddress = stored.businessAddress || '';
    stored.phoneNumber = stored.phoneNumber || '';
    stored.socialLinks = Array.isArray(stored.socialLinks) ? stored.socialLinks : [];
    return stored;
  }

  // 37) submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const record = {
      id: this._generateId('cf'),
      name: name,
      email: email,
      topic: topic || null,
      message: message,
      createdAt: new Date().toISOString(),
      status: 'received'
    };
    submissions.push(record);
    this._saveToStorage('contact_form_submissions', submissions);
    return {
      success: true,
      ticketId: record.id,
      message: 'Contact request submitted'
    };
  }

  // 38) getHowItWorksContent
  getHowItWorksContent() {
    const defaultContent = {
      steps: [],
      trialAndSubscriptionSection: '',
      workoutsAndClassesSection: '',
      progressTrackingSection: ''
    };
    const stored = this._getFromStorage('how_it_works_content', defaultContent);
    stored.steps = Array.isArray(stored.steps) ? stored.steps : [];
    stored.trialAndSubscriptionSection = stored.trialAndSubscriptionSection || '';
    stored.workoutsAndClassesSection = stored.workoutsAndClassesSection || '';
    stored.progressTrackingSection = stored.progressTrackingSection || '';
    return stored;
  }

  // 39) getTermsOfServiceContent
  getTermsOfServiceContent() {
    const defaultContent = {
      lastUpdated: '',
      sections: []
    };
    const stored = this._getFromStorage('terms_of_service_content', defaultContent);
    stored.lastUpdated = stored.lastUpdated || '';
    stored.sections = Array.isArray(stored.sections) ? stored.sections : [];
    return stored;
  }

  // 40) getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const defaultContent = {
      lastUpdated: '',
      sections: []
    };
    const stored = this._getFromStorage('privacy_policy_content', defaultContent);
    stored.lastUpdated = stored.lastUpdated || '';
    stored.sections = Array.isArray(stored.sections) ? stored.sections : [];
    return stored;
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