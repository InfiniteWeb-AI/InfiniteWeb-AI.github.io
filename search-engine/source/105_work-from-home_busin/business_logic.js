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

  // =========================
  // Storage helpers
  // =========================

  _initStorage() {
    // Initialize all data tables in localStorage if they don't exist
    const arrayKeys = [
      'plans',
      'plan_signups',
      'webinars',
      'webinar_registrations',
      'earnings_plans',
      'programs',
      'program_favorites',
      'success_stories',
      'story_bookmarks',
      'applications',
      'newsletter_subscriptions',
      'faq_articles',
      'contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
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
    const n = this._getNextIdCounter();
    return prefix + '_' + n;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _persistEntityToStorage(storageKey, entity) {
    const list = this._getFromStorage(storageKey, []);
    list.push(entity);
    this._saveToStorage(storageKey, list);
    return entity;
  }

  // =========================
  // Relationship helpers
  // =========================

  _resolvePlanSignup(planSignup) {
    if (!planSignup) return null;
    const plans = this._getFromStorage('plans', []);
    const plan = plans.find((p) => p.id === planSignup.plan_id) || null;
    return { ...planSignup, plan };
  }

  _resolveWebinarRegistration(reg) {
    if (!reg) return null;
    const webinars = this._getFromStorage('webinars', []);
    const webinar = webinars.find((w) => w.id === reg.webinar_id) || null;
    return { ...reg, webinar };
  }

  _resolveProgramFavorite(fav) {
    if (!fav) return null;
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === fav.program_id) || null;
    return { ...fav, program };
  }

  _resolveStory(story) {
    if (!story) return null;
    const programs = this._getFromStorage('programs', []);
    const plans = this._getFromStorage('plans', []);
    const associatedProgram = story.associated_program_id
      ? programs.find((p) => p.id === story.associated_program_id) || null
      : null;
    const associatedPlan = story.associated_plan_id
      ? plans.find((p) => p.id === story.associated_plan_id) || null
      : null;
    return {
      ...story,
      associated_program: associatedProgram,
      associated_plan: associatedPlan
    };
  }

  _resolveStoryBookmark(bookmark) {
    if (!bookmark) return null;
    const stories = this._getFromStorage('success_stories', []);
    const story = stories.find((s) => s.id === bookmark.story_id) || null;
    const resolvedStory = story ? this._resolveStory(story) : null;
    return { ...bookmark, story: resolvedStory };
  }

  // =========================
  // Earnings helper
  // =========================

  _calculateEstimatedIncomeInternal(hoursPerWeek, averageSaleValue, monthlyLeads, conversionRatePercent, goalMonthlyIncomeTarget) {
    const h = Number(hoursPerWeek) || 0;
    const asv = Number(averageSaleValue) || 0;
    const leads = Number(monthlyLeads) || 0;
    const cr = Number(conversionRatePercent) || 0;

    // Basic model: income = leads * (conversion%/100) * average sale value
    const estimatedMonthlyIncome = leads * (cr / 100) * asv;

    const goal = typeof goalMonthlyIncomeTarget === 'number' ? goalMonthlyIncomeTarget : null;
    const meetsTarget = goal != null ? estimatedMonthlyIncome >= goal : false;

    return {
      estimatedMonthlyIncome,
      goalMonthlyIncomeTarget: goal,
      meetsTarget
    };
  }

  // =========================
  // Interface implementations
  // =========================

  // getHomePageContent
  getHomePageContent() {
    // Static copy can be overridden by 'home_page_content' in localStorage
    const stored = this._getFromStorage('home_page_content', null);

    const defaultContent = {
      heroHeadline: 'Create a flexible work-from-home income',
      heroSubheadline: 'Step-by-step programs, 1-on-1 coaching, and real success stories to guide you.',
      coreBenefits: [
        {
          icon: 'clock',
          title: 'Flexible hours',
          description: 'Build a business around your existing schedule with proven systems.'
        },
        {
          icon: 'coach',
          title: 'Personal coaching',
          description: 'Get 1-on-1 guidance from experienced mentors who have done it before.'
        },
        {
          icon: 'path',
          title: 'Clear step-by-step paths',
          description: 'Follow structured programs focused on real, sustainable income.'
        }
      ]
    };

    const heroHeadline = stored && stored.heroHeadline ? stored.heroHeadline : defaultContent.heroHeadline;
    const heroSubheadline = stored && stored.heroSubheadline ? stored.heroSubheadline : defaultContent.heroSubheadline;
    const coreBenefits = stored && Array.isArray(stored.coreBenefits) && stored.coreBenefits.length
      ? stored.coreBenefits
      : defaultContent.coreBenefits;

    const programs = this._getFromStorage('programs', []);
    const activePrograms = programs.filter((p) => p.status === 'active');
    // Take up to 3 featured/most recent programs
    const featuredPrograms = activePrograms
      .slice()
      .sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 3);

    const stories = this._getFromStorage('success_stories', []);
    const featuredStoriesRaw = stories.filter((s) => s.is_featured);
    const featuredSuccessStories = featuredStoriesRaw.slice(0, 3).map((s) => this._resolveStory(s));

    const webinars = this._getFromStorage('webinars', []);
    const upcoming = webinars
      .filter((w) => w.status === 'scheduled')
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.start_datetime).getTime();
        const bDate = new Date(b.start_datetime).getTime();
        return aDate - bDate;
      });
    const featuredWebinarObj = upcoming.length
      ? {
          webinar: upcoming[0],
          isLiveSoon: new Date(upcoming[0].start_datetime).getTime() - Date.now() <= 24 * 60 * 60 * 1000
        }
      : { webinar: null, isLiveSoon: false };

    const earningsDefaults = this.getEarningsCalculatorDefaults();
    const estimate = this._calculateEstimatedIncomeInternal(
      earningsDefaults.defaultHoursPerWeek,
      earningsDefaults.defaultAverageSaleValue,
      earningsDefaults.defaultMonthlyLeads,
      earningsDefaults.defaultConversionRatePercent,
      null
    );

    const earningsCalculatorTeaser = {
      defaultHoursPerWeek: earningsDefaults.defaultHoursPerWeek,
      defaultAverageSaleValue: earningsDefaults.defaultAverageSaleValue,
      defaultMonthlyLeads: earningsDefaults.defaultMonthlyLeads,
      defaultConversionRatePercent: earningsDefaults.defaultConversionRatePercent,
      exampleEstimatedMonthlyIncome: estimate.estimatedMonthlyIncome
    };

    return {
      heroHeadline,
      heroSubheadline,
      coreBenefits,
      featuredPrograms,
      featuredSuccessStories,
      featuredWebinar: featuredWebinarObj,
      earningsCalculatorTeaser
    };
  }

  // getPlanFilterOptions
  getPlanFilterOptions() {
    const maxPricePresets = [
      { value: 50, label: 'Up to $50' },
      { value: 100, label: 'Up to $100' },
      { value: 150, label: 'Up to $150' },
      { value: 300, label: 'Up to $300' }
    ];

    const trainingModuleCountOptions = [
      { value: 1, label: '1+ modules' },
      { value: 3, label: '3+ modules' },
      { value: 5, label: '5+ modules' },
      { value: 10, label: '10+ modules' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price – Low to High' },
      { value: 'price_high_to_low', label: 'Price – High to Low' },
      { value: 'newest_first', label: 'Newest first' }
    ];

    return { maxPricePresets, trainingModuleCountOptions, sortOptions };
  }

  // searchStarterPlans(maxPrice, includesOneOnOneCoaching, minTrainingModulesCount, onlyStarterPlans, sortBy)
  searchStarterPlans(maxPrice, includesOneOnOneCoaching, minTrainingModulesCount, onlyStarterPlans = true, sortBy = 'price_low_to_high') {
    const plans = this._getFromStorage('plans', []);

    let filtered = plans.filter((plan) => plan.status === 'active');

    if (onlyStarterPlans !== false) {
      filtered = filtered.filter((p) => p.is_starter_plan === true);
    }

    if (typeof maxPrice === 'number') {
      filtered = filtered.filter((p) => typeof p.price === 'number' && p.price <= maxPrice);
    }

    if (includesOneOnOneCoaching === true) {
      filtered = filtered.filter((p) => p.includes_one_on_one_coaching === true);
    }

    if (typeof minTrainingModulesCount === 'number') {
      filtered = filtered.filter(
        (p) => typeof p.training_modules_count === 'number' && p.training_modules_count >= minTrainingModulesCount
      );
    }

    const arr = filtered.slice();

    if (sortBy === 'price_low_to_high') {
      arr.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      arr.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'newest_first') {
      arr.sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      });
    }

    // Instrumentation for task completion tracking (task_1)
    try {
      localStorage.setItem(
        'task1_planSearchParams',
        JSON.stringify({
          maxPrice,
          includesOneOnOneCoaching,
          minTrainingModulesCount,
          onlyStarterPlans,
          sortBy
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return arr;
  }

  // getPlanDetails(planId)
  getPlanDetails(planId) {
    const plans = this._getFromStorage('plans', []);
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return {
        plan: null,
        formattedPrice: '',
        currencySymbol: '',
        faqs: [],
        userReviews: []
      };
    }

    let currencySymbol = '';
    if (plan.currency === 'usd') currencySymbol = '$';
    else if (plan.currency === 'eur') currencySymbol = '€';
    else if (plan.currency === 'gbp') currencySymbol = '£';

    const priceNumber = typeof plan.price === 'number' ? plan.price : 0;
    const formattedPrice = currencySymbol + priceNumber.toFixed(2);

    // FAQ and user reviews are not modeled as separate entities here,
    // so we return empty arrays (can be enriched via other mechanisms).
    return {
      plan,
      formattedPrice,
      currencySymbol,
      faqs: [],
      userReviews: []
    };
  }

  // submitPlanSignup(planId, name, email)
  submitPlanSignup(planId, name, email) {
    const plans = this._getFromStorage('plans', []);
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return {
        success: false,
        message: 'Selected plan not found.',
        planSignup: null
      };
    }

    const signup = {
      id: this._generateId('plan_signup'),
      plan_id: plan.id,
      plan_name_snapshot: plan.name,
      price_snapshot: plan.price,
      name,
      email,
      status: 'started',
      created_at: this._nowIso()
    };

    this._persistEntityToStorage('plan_signups', signup);

    return {
      success: true,
      message: 'Plan sign-up started.',
      planSignup: this._resolvePlanSignup(signup)
    };
  }

  // getWebinarFilterOptions
  getWebinarFilterOptions() {
    const dateRangePresets = [
      { value: 'today', label: 'Today' },
      { value: 'next_7_days', label: 'Next 7 days' },
      { value: 'next_14_days', label: 'Next 14 days' },
      { value: 'this_month', label: 'This month' }
    ];

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning (8am–12pm)' },
      { value: 'afternoon', label: 'Afternoon (12pm–5pm)' },
      { value: 'evening', label: 'Evening (6pm–9pm)' },
      { value: 'late_night', label: 'Late night (9pm+)' }
    ];

    const topicTypeOptions = [
      { value: 'introductory_overview', label: 'Introductory Overview' },
      { value: 'getting_started_overview', label: 'Getting Started Overview' },
      { value: 'advanced_training', label: 'Advanced Training' },
      { value: 'q_and_a_session', label: 'Q&A Session' },
      { value: 'case_study_session', label: 'Case Study Session' }
    ];

    const sortOptions = [
      { value: 'earliest_date_first', label: 'Earliest date first' },
      { value: 'latest_date_first', label: 'Latest date first' }
    ];

    return { dateRangePresets, timeOfDayOptions, topicTypeOptions, sortOptions };
  }

  // searchWebinars(startDate, endDate, timeOfDay, topicTypes, sortBy)
  searchWebinars(startDate, endDate, timeOfDay, topicTypes, sortBy = 'earliest_date_first') {
    const webinars = this._getFromStorage('webinars', []);

    const start = startDate ? new Date(startDate).getTime() : null;
    const end = endDate ? new Date(endDate).getTime() : null;

    let filtered = webinars.filter((w) => w.status === 'scheduled');

    if (start != null) {
      filtered = filtered.filter((w) => new Date(w.start_datetime).getTime() >= start);
    }

    if (end != null) {
      filtered = filtered.filter((w) => new Date(w.start_datetime).getTime() <= end);
    }

    if (timeOfDay) {
      filtered = filtered.filter((w) => w.time_of_day === timeOfDay);
    }

    if (Array.isArray(topicTypes) && topicTypes.length) {
      filtered = filtered.filter((w) => topicTypes.includes(w.topic_type));
    }

    const arr = filtered.slice();

    if (sortBy === 'earliest_date_first') {
      arr.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
    } else if (sortBy === 'latest_date_first') {
      arr.sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());
    }

    // Instrumentation for task completion tracking (task_2)
    try {
      localStorage.setItem(
        'task2_webinarSearchParams',
        JSON.stringify({
          startDate,
          endDate,
          timeOfDay,
          topicTypes,
          sortBy
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return arr;
  }

  // getWebinarDetails(webinarId)
  getWebinarDetails(webinarId) {
    const webinars = this._getFromStorage('webinars', []);
    const webinar = webinars.find((w) => w.id === webinarId) || null;

    if (!webinar) {
      return {
        webinar: null,
        agendaItems: [],
        timeZoneNote: ''
      };
    }

    let timeZoneNote = '';
    if (webinar.time_zone === 'us_eastern') timeZoneNote = 'All times are shown in Eastern Time (ET).';
    else if (webinar.time_zone === 'us_central') timeZoneNote = 'All times are shown in Central Time (CT).';
    else if (webinar.time_zone === 'us_mountain') timeZoneNote = 'All times are shown in Mountain Time (MT).';
    else if (webinar.time_zone === 'us_pacific') timeZoneNote = 'All times are shown in Pacific Time (PT).';
    else if (webinar.time_zone === 'utc') timeZoneNote = 'All times are shown in Coordinated Universal Time (UTC).';

    // Agenda is not stored in the data model; return empty array by default.
    return {
      webinar,
      agendaItems: [],
      timeZoneNote
    };
  }

  // registerForWebinar(webinarId, name, email, selectedTimeZone, reminderPreference)
  registerForWebinar(webinarId, name, email, selectedTimeZone, reminderPreference) {
    const webinars = this._getFromStorage('webinars', []);
    const webinar = webinars.find((w) => w.id === webinarId) || null;

    if (!webinar) {
      return {
        success: false,
        message: 'Selected webinar not found.',
        registration: null
      };
    }

    const registration = {
      id: this._generateId('webinar_reg'),
      webinar_id: webinar.id,
      webinar_title_snapshot: webinar.title,
      name,
      email,
      selected_time_zone: selectedTimeZone,
      reminder_preference: reminderPreference,
      registered_at: this._nowIso(),
      confirmation_sent: false
    };

    this._persistEntityToStorage('webinar_registrations', registration);

    return {
      success: true,
      message: 'Webinar registration submitted.',
      registration: this._resolveWebinarRegistration(registration)
    };
  }

  // getEarningsCalculatorDefaults
  getEarningsCalculatorDefaults() {
    const stored = this._getFromStorage('earnings_calculator_defaults', null);

    if (stored && typeof stored === 'object') {
      return {
        defaultHoursPerWeek: stored.defaultHoursPerWeek || 20,
        defaultAverageSaleValue: stored.defaultAverageSaleValue || 200,
        defaultMonthlyLeads: stored.defaultMonthlyLeads || 50,
        defaultConversionRatePercent: stored.defaultConversionRatePercent || 20,
        minHoursPerWeek: stored.minHoursPerWeek || 1,
        maxHoursPerWeek: stored.maxHoursPerWeek || 60,
        minConversionRatePercent: stored.minConversionRatePercent || 1,
        maxConversionRatePercent: stored.maxConversionRatePercent || 100
      };
    }

    // Sensible defaults
    return {
      defaultHoursPerWeek: 20,
      defaultAverageSaleValue: 200,
      defaultMonthlyLeads: 50,
      defaultConversionRatePercent: 20,
      minHoursPerWeek: 1,
      maxHoursPerWeek: 60,
      minConversionRatePercent: 1,
      maxConversionRatePercent: 100
    };
  }

  // calculateEarningsEstimate(hoursPerWeek, averageSaleValue, monthlyLeads, conversionRatePercent, goalMonthlyIncomeTarget)
  calculateEarningsEstimate(hoursPerWeek, averageSaleValue, monthlyLeads, conversionRatePercent, goalMonthlyIncomeTarget) {
    return this._calculateEstimatedIncomeInternal(
      hoursPerWeek,
      averageSaleValue,
      monthlyLeads,
      conversionRatePercent,
      goalMonthlyIncomeTarget
    );
  }

  // saveEarningsPlan(name, email, hoursPerWeek, averageSaleValue, monthlyLeads, conversionRatePercent, goalMonthlyIncomeTarget)
  saveEarningsPlan(name, email, hoursPerWeek, averageSaleValue, monthlyLeads, conversionRatePercent, goalMonthlyIncomeTarget) {
    const calc = this._calculateEstimatedIncomeInternal(
      hoursPerWeek,
      averageSaleValue,
      monthlyLeads,
      conversionRatePercent,
      goalMonthlyIncomeTarget
    );

    const plan = {
      id: this._generateId('earnings_plan'),
      name,
      email,
      hours_per_week: Number(hoursPerWeek) || 0,
      average_sale_value: Number(averageSaleValue) || 0,
      monthly_leads: Number(monthlyLeads) || 0,
      conversion_rate_percent: Number(conversionRatePercent) || 0,
      estimated_monthly_income: calc.estimatedMonthlyIncome,
      goal_monthly_income_target: calc.goalMonthlyIncomeTarget,
      meets_target: calc.goalMonthlyIncomeTarget != null ? calc.meetsTarget : undefined,
      created_at: this._nowIso()
    };

    this._persistEntityToStorage('earnings_plans', plan);

    return {
      success: true,
      message: 'Earnings plan saved.',
      earningsPlan: plan
    };
  }

  // getProgramFilterOptions
  getProgramFilterOptions() {
    const timeCommitmentOptions = [
      { minHours: 0, maxHours: 10, label: 'Up to 10 hours/week', value: 'up_to_10' },
      { minHours: 10, maxHours: 20, label: '10–20 hours/week', value: '10_20' },
      { minHours: 20, maxHours: 30, label: '20–30 hours/week', value: '20_30' },
      { minHours: 30, maxHours: 40, label: '30–40 hours/week', value: '30_40' }
    ];

    const liveSessionsPerMonthOptions = [
      { minSessions: 1, label: '1 or more', value: '1_plus' },
      { minSessions: 3, label: '3 or more', value: '3_plus' },
      { minSessions: 5, label: '5 or more', value: '5_plus' }
    ];

    const sortOptions = [
      { value: 'average_monthly_earnings_high_to_low', label: 'Average monthly earnings – High to Low' },
      { value: 'average_monthly_earnings_low_to_high', label: 'Average monthly earnings – Low to High' }
    ];

    return { timeCommitmentOptions, liveSessionsPerMonthOptions, sortOptions };
  }

  // searchPrograms(maxHoursPerWeek, includesLiveGroupSessions, minLiveSessionsPerMonth, sortBy)
  searchPrograms(maxHoursPerWeek, includesLiveGroupSessions, minLiveSessionsPerMonth, sortBy = 'average_monthly_earnings_high_to_low') {
    const programs = this._getFromStorage('programs', []);

    let filtered = programs.filter((p) => p.status === 'active');

    if (typeof maxHoursPerWeek === 'number') {
      filtered = filtered.filter(
        (p) => typeof p.time_commitment_hours_per_week_max === 'number' && p.time_commitment_hours_per_week_max <= maxHoursPerWeek
      );
    }

    if (includesLiveGroupSessions === true) {
      filtered = filtered.filter((p) => p.includes_live_group_sessions === true);
    }

    if (typeof minLiveSessionsPerMonth === 'number') {
      filtered = filtered.filter(
        (p) => typeof p.live_sessions_per_month === 'number' && p.live_sessions_per_month >= minLiveSessionsPerMonth
      );
    }

    const arr = filtered.slice();

    if (sortBy === 'average_monthly_earnings_high_to_low') {
      arr.sort((a, b) => (b.average_monthly_earnings || 0) - (a.average_monthly_earnings || 0));
    } else if (sortBy === 'average_monthly_earnings_low_to_high') {
      arr.sort((a, b) => (a.average_monthly_earnings || 0) - (b.average_monthly_earnings || 0));
    }

    // Instrumentation for task completion tracking (task_4)
    try {
      localStorage.setItem(
        'task4_programSearchParams',
        JSON.stringify({
          maxHoursPerWeek,
          includesLiveGroupSessions,
          minLiveSessionsPerMonth,
          sortBy
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return arr;
  }

  // getProgramDetails(programId)
  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId) || null;

    if (!program) {
      return {
        program: null,
        curriculumOutline: [],
        supportDetails: '',
        expectedOutcomes: []
      };
    }

    // Curriculum, support details, and expected outcomes are not modeled; return empty structure.
    return {
      program,
      curriculumOutline: [],
      supportDetails: '',
      expectedOutcomes: []
    };
  }

  // favoriteProgramWithAccount(programId, name, email, password)
  favoriteProgramWithAccount(programId, name, email, password) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find((p) => p.id === programId) || null;

    if (!program) {
      return {
        success: false,
        message: 'Selected program not found.',
        programFavorite: null
      };
    }

    const favorite = {
      id: this._generateId('program_fav'),
      program_id: program.id,
      program_name_snapshot: program.name,
      name,
      email,
      password,
      created_at: this._nowIso()
    };

    this._persistEntityToStorage('program_favorites', favorite);

    return {
      success: true,
      message: 'Program added to favorites.',
      programFavorite: this._resolveProgramFavorite(favorite)
    };
  }

  // getSuccessStoryFilterOptions
  getSuccessStoryFilterOptions() {
    const lifestyleOptions = [
      { value: 'parents', label: 'Parents' },
      { value: 'students', label: 'Students' },
      { value: 'retirees', label: 'Retirees' },
      { value: 'side_hustlers', label: 'Side hustlers' },
      { value: 'full_time_workers', label: 'Full-time workers' }
    ];

    const minMonthlyEarningsPresets = [
      { value: 500, label: '$500+' },
      { value: 1000, label: '$1,000+' },
      { value: 2500, label: '$2,500+' },
      { value: 5000, label: '$5,000+' }
    ];

    const hoursPerWeekRangeOptions = [
      { minHours: 0, maxHours: 10, label: '0–10 hours', value: '0_10' },
      { minHours: 10, maxHours: 20, label: '10–20 hours', value: '10_20' },
      { minHours: 20, maxHours: 30, label: '20–30 hours', value: '20_30' },
      { minHours: 30, maxHours: 40, label: '30–40 hours', value: '30_40' }
    ];

    const sortOptions = [
      { value: 'most_recent', label: 'Most recent' },
      { value: 'highest_earnings', label: 'Highest earnings' }
    ];

    return { lifestyleOptions, minMonthlyEarningsPresets, hoursPerWeekRangeOptions, sortOptions };
  }

  // searchSuccessStories(lifestyle, minMonthlyEarnings, minHoursPerWeek, maxHoursPerWeek, sortBy)
  searchSuccessStories(lifestyle, minMonthlyEarnings, minHoursPerWeek, maxHoursPerWeek, sortBy = 'most_recent') {
    const stories = this._getFromStorage('success_stories', []);

    let filtered = stories.slice();

    if (lifestyle) {
      filtered = filtered.filter((s) => s.lifestyle === lifestyle);
    }

    if (typeof minMonthlyEarnings === 'number') {
      filtered = filtered.filter((s) => typeof s.monthly_earnings === 'number' && s.monthly_earnings >= minMonthlyEarnings);
    }

    if (typeof minHoursPerWeek === 'number' && typeof maxHoursPerWeek === 'number') {
      // Keep stories whose hours range is fully within the selected range
      filtered = filtered.filter(
        (s) =>
          typeof s.hours_per_week_min === 'number' &&
          typeof s.hours_per_week_max === 'number' &&
          s.hours_per_week_min >= minHoursPerWeek &&
          s.hours_per_week_max <= maxHoursPerWeek
      );
    } else if (typeof minHoursPerWeek === 'number') {
      filtered = filtered.filter(
        (s) => typeof s.hours_per_week_max === 'number' && s.hours_per_week_max >= minHoursPerWeek
      );
    } else if (typeof maxHoursPerWeek === 'number') {
      filtered = filtered.filter(
        (s) => typeof s.hours_per_week_min === 'number' && s.hours_per_week_min <= maxHoursPerWeek
      );
    }

    const arr = filtered.slice();

    if (sortBy === 'most_recent') {
      arr.sort((a, b) => new Date(b.story_date).getTime() - new Date(a.story_date).getTime());
    } else if (sortBy === 'highest_earnings') {
      arr.sort((a, b) => (b.monthly_earnings || 0) - (a.monthly_earnings || 0));
    }

    const results = arr.map((s) => this._resolveStory(s));

    // Instrumentation for task completion tracking (task_5)
    try {
      localStorage.setItem(
        'task5_successStorySearchParams',
        JSON.stringify({
          lifestyle,
          minMonthlyEarnings,
          minHoursPerWeek,
          maxHoursPerWeek,
          sortBy
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return results;
  }

  // getSuccessStoryDetails(storyId)
  getSuccessStoryDetails(storyId) {
    const stories = this._getFromStorage('success_stories', []);
    const story = stories.find((s) => s.id === storyId) || null;

    if (!story) {
      return {
        story: null,
        associatedProgram: null,
        associatedPlan: null
      };
    }

    const programs = this._getFromStorage('programs', []);
    const plans = this._getFromStorage('plans', []);

    const associatedProgram = story.associated_program_id
      ? programs.find((p) => p.id === story.associated_program_id) || null
      : null;
    const associatedPlan = story.associated_plan_id
      ? plans.find((p) => p.id === story.associated_plan_id) || null
      : null;

    return {
      story: this._resolveStory(story),
      associatedProgram,
      associatedPlan
    };
  }

  // bookmarkStoryAsGuest(storyId, email)
  bookmarkStoryAsGuest(storyId, email) {
    const stories = this._getFromStorage('success_stories', []);
    const story = stories.find((s) => s.id === storyId) || null;

    if (!story) {
      return {
        success: false,
        message: 'Success story not found.',
        bookmark: null
      };
    }

    const bookmark = {
      id: this._generateId('story_bookmark'),
      story_id: story.id,
      story_title_snapshot: story.title || story.headline || '',
      email,
      created_at: this._nowIso()
    };

    this._persistEntityToStorage('story_bookmarks', bookmark);

    return {
      success: true,
      message: 'Story saved to reading list.',
      bookmark: this._resolveStoryBookmark(bookmark)
    };
  }

  // getApplicationFormOptions
  getApplicationFormOptions() {
    const availabilityOptions = [
      {
        value: 'part_time_10_20',
        label: 'Part-time (10–20 hours/week)',
        description: 'Build your business alongside other commitments with a focused 10–20 hours each week.'
      },
      {
        value: 'full_time_30_40',
        label: 'Full-time (30–40 hours/week)',
        description: 'Treat this like a full-time business and ramp up your earnings potential.'
      },
      {
        value: 'flexible_schedule',
        label: 'Flexible schedule',
        description: 'Work in sprints or around a changing schedule with flexible weekly hours.'
      },
      {
        value: 'unsure',
        label: 'Not sure yet',
        description: 'We will help you decide what level of commitment makes sense.'
      }
    ];

    const areasOfInterestOptions = [
      { value: 'email_marketing', label: 'Email Marketing' },
      { value: 'affiliate_sales', label: 'Affiliate Sales' },
      { value: 'social_media_strategy', label: 'Social Media Strategy' },
      { value: 'content_creation', label: 'Content Creation' },
      { value: 'coaching_consulting', label: 'Coaching & Consulting' },
      { value: 'e_commerce', label: 'E-commerce' }
    ];

    // Budget bounds can be adjusted by overwriting 'application_form_options' in storage if needed
    const stored = this._getFromStorage('application_form_options', null);

    const minMonthlyBudget = stored && typeof stored.minMonthlyBudget === 'number' ? stored.minMonthlyBudget : 50;
    const maxMonthlyBudget = stored && typeof stored.maxMonthlyBudget === 'number' ? stored.maxMonthlyBudget : 5000;

    return {
      availabilityOptions,
      areasOfInterestOptions,
      minMonthlyBudget,
      maxMonthlyBudget
    };
  }

  // submitApplication(availability, monthlyBudget, preferredStartDate, areasOfInterest, fullName, email, phone, biggestGoalText, acceptedTerms)
  submitApplication(
    availability,
    monthlyBudget,
    preferredStartDate,
    areasOfInterest,
    fullName,
    email,
    phone,
    biggestGoalText,
    acceptedTerms
  ) {
    if (!acceptedTerms) {
      return {
        success: false,
        message: 'You must accept the Terms & Conditions to submit the application.',
        application: null
      };
    }

    const application = {
      id: this._generateId('application'),
      availability,
      monthly_budget: Number(monthlyBudget) || 0,
      preferred_start_date: preferredStartDate,
      areas_of_interest: Array.isArray(areasOfInterest) ? areasOfInterest.slice() : [],
      full_name: fullName,
      email,
      phone,
      biggest_goal_text: biggestGoalText,
      accepted_terms: true,
      status: 'submitted',
      submitted_at: this._nowIso()
    };

    this._persistEntityToStorage('applications', application);

    return {
      success: true,
      message: 'Application submitted.',
      application
    };
  }

  // getNewsletterPreferenceOptions
  getNewsletterPreferenceOptions() {
    const frequencyOptions = [
      { value: 'weekly_summary', label: 'Weekly summary' },
      { value: 'daily_updates', label: 'Daily updates' },
      { value: 'monthly_roundup', label: 'Monthly roundup' },
      { value: 'occasional', label: 'Occasional updates' }
    ];

    const topicOptions = [
      { value: 'email_marketing', label: 'Email Marketing' },
      { value: 'social_media_strategy', label: 'Social Media Strategy' },
      { value: 'affiliate_sales', label: 'Affiliate Sales' },
      { value: 'mindset_productivity', label: 'Mindset & Productivity' },
      { value: 'case_studies', label: 'Case Studies' }
    ];

    const bestTimeOptions = [
      { value: 'morning_8_10', label: 'Morning (8am–10am)' },
      { value: 'midday_11_1', label: 'Midday (11am–1pm)' },
      { value: 'afternoon_2_5', label: 'Afternoon (2pm–5pm)' },
      { value: 'evening_6_9', label: 'Evening (6pm–9pm)' }
    ];

    const contentTypeOptions = [
      { value: 'tips_tutorials', label: 'Tips & Tutorials' },
      { value: 'product_announcements', label: 'Product Announcements' },
      { value: 'case_studies', label: 'Case Studies' }
    ];

    return { frequencyOptions, topicOptions, bestTimeOptions, contentTypeOptions };
  }

  // saveNewsletterSubscription(email, firstName, frequency, topics, bestTimeToReceive, contentTypes)
  saveNewsletterSubscription(email, firstName, frequency, topics, bestTimeToReceive, contentTypes) {
    const subscription = {
      id: this._generateId('newsletter_sub'),
      email,
      first_name: firstName || null,
      frequency,
      topics: Array.isArray(topics) ? topics.slice() : [],
      best_time_to_receive: bestTimeToReceive,
      content_types: Array.isArray(contentTypes) ? contentTypes.slice() : [],
      subscribed_at: this._nowIso(),
      is_active: true
    };

    this._persistEntityToStorage('newsletter_subscriptions', subscription);

    return {
      success: true,
      message: 'Newsletter subscription saved.',
      subscription
    };
  }

  // searchFAQArticles(query)
  searchFAQArticles(query) {
    const faqs = this._getFromStorage('faq_articles', []);
    const q = (query || '').toLowerCase().trim();

    if (!q) {
      // Instrumentation for task completion tracking (task_8)
      try {
        localStorage.setItem('task8_faqSearchQuery', q);
      } catch (e) {
        console.error('Instrumentation error:', e);
      }

      return faqs;
    }

    const results = faqs.filter((faq) => {
      const inQuestion = faq.question && faq.question.toLowerCase().includes(q);
      const inAnswer = faq.answer && faq.answer.toLowerCase().includes(q);
      const inTags = Array.isArray(faq.tags)
        ? faq.tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(q))
        : false;
      return inQuestion || inAnswer || inTags;
    });

    // Instrumentation for task completion tracking (task_8)
    try {
      localStorage.setItem('task8_faqSearchQuery', q);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return results;
  }

  // getFAQArticleDetails(faqArticleId)
  getFAQArticleDetails(faqArticleId) {
    const faqs = this._getFromStorage('faq_articles', []);
    const article = faqs.find((f) => f.id === faqArticleId) || null;

    // Instrumentation for task completion tracking (task_8)
    try {
      if (article) {
        localStorage.setItem('task8_openedFaqArticleId', faqArticleId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return article;
  }

  // submitContactMessage(topic, subject, message, name, email)
  submitContactMessage(topic, subject, message, name, email) {
    const contactMessage = {
      id: this._generateId('contact_msg'),
      topic,
      subject,
      message,
      name,
      email,
      submitted_at: this._nowIso(),
      status: 'received'
    };

    this._persistEntityToStorage('contact_messages', contactMessage);

    return {
      success: true,
      message: 'Your message has been sent to support.',
      contactMessage
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);

    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      missionStatement: 'We help everyday people build flexible, sustainable work-from-home income streams through structured programs, hands-on coaching, and real-world support.',
      values: [
        'Honesty about the work required and realistic results',
        'Action-first training that focuses on implementation',
        'Supportive community and coaching',
        'Respect for your time, family, and priorities'
      ],
      approachSummary:
        'Our approach combines practical skill-building, simple marketing systems, and step-by-step implementation guidance so you can move from “interested” to “earning” as predictably as possible.',
      coachingAndTrainingOverview:
        'Every program includes guided curriculum, live support touchpoints, and clear exercises so you always know what to do next. Many tracks offer 1-on-1 coaching, group Q&A calls, and peer support.',
      experienceHighlights: [
        'Students from over 20 countries have gone through our programs',
        'Background across email marketing, affiliate programs, and service-based businesses',
        'Focused specifically on flexible work-from-home business models'
      ]
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_policy_content', null);

    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      lastUpdated: this._nowIso().slice(0, 10),
      contentHtml:
        '<h1>Privacy Policy</h1><p>We respect your privacy. Any information you share with us is used to provide and improve our services, communicate with you about your account or training, and comply with legal obligations. We do not sell your personal information.</p>',
      contactEmailForPrivacy: 'privacy@example.com'
    };
  }

  // getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    const stored = this._getFromStorage('terms_and_conditions_content', null);

    if (stored && typeof stored === 'object') {
      return stored;
    }

    const guaranteeSummary =
      'Most core work-from-home programs include a 30-day money-back guarantee. If you complete the required onboarding steps and are not satisfied, you can request a refund within 30 days of purchase.';

    return {
      lastUpdated: this._nowIso().slice(0, 10),
      contentHtml:
        '<h1>Terms & Conditions</h1><p>By using this site and enrolling in any program, you agree to our terms regarding payments, refunds, coaching boundaries, and acceptable use. Business results vary based on effort, skill development, and market conditions.</p><h2>Money-Back Guarantee</h2><p>' +
        guaranteeSummary +
        '</p>',
      moneyBackGuaranteeSummary: guaranteeSummary
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