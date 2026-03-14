// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    // Simple localStorage polyfill for Node.js if not provided
    if (typeof localStorage === 'undefined') {
      global.localStorage = {
        _data: {},
        setItem(key, value) {
          this._data[key] = String(value);
        },
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(this._data, key)
            ? this._data[key]
            : null;
        },
        removeItem(key) {
          delete this._data[key];
        },
        clear() {
          this._data = {};
        }
      };
    }

    this.logic = businessLogic || new BusinessLogic();
    this.results = [];

    // Clear storage and set up baseline data
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure via business logic helper
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      faq_items: [
        {
          id: 'pause_membership_progress',
          question: 'Can I pause my membership without losing my progress data?',
          answer: 'Yes. You can pause your membership for up to 4 weeks at a time without losing any progress data. During a pause, you won\'t be billed, but you\'ll still be able to log in and view your history (workouts completed, streaks, body metrics, and meal plans). You won\'t be able to start new guided programs until you reactivate. To pause, go to Settings \u2192 Membership \u2192 Pause membership, choose your pause dates (e.g., a 2-week break starting next Monday), and confirm. Your data and streaks will resume where you left off when you reactivate.',
          category: 'membership',
          tags: [
            'pause membership',
            'freeze account',
            'hold membership',
            'progress data'
          ],
          searchKeywords: [
            'pause membership',
            'freeze',
            'hold',
            'suspend',
            'keep progress',
            'progress data',
            'streak',
            'vacation'
          ],
          isFeatured: true,
          status: 'published',
          displayOrder: 1
        },
        {
          id: 'cancel_membership',
          question: 'How do I cancel my membership?',
          answer: 'You can cancel anytime from your account settings. Go to Settings \u2192 Membership \u2192 Manage plan and click \u201cCancel membership\u201d. Your access will continue until the end of your current billing period. You will receive a confirmation email once the cancellation is processed.',
          category: 'membership',
          tags: [
            'cancel membership',
            'end subscription'
          ],
          searchKeywords: [
            'cancel',
            'stop subscription',
            'end membership',
            'close account'
          ],
          isFeatured: false,
          status: 'published',
          displayOrder: 2
        },
        {
          id: 'trial_billing',
          question: 'Will I be charged at the end of my free trial?',
          answer: 'If you start a free trial on any paid plan, you won\'t be charged until your trial ends. We\'ll send you a reminder email 3 days before your trial expires. If you don\'t cancel, your membership will automatically convert to a paid subscription at the plan\'s standard price.',
          category: 'billing',
          tags: [
            'free trial',
            'billing',
            'charges'
          ],
          searchKeywords: [
            'free trial',
            'trial charge',
            'when am I billed',
            'subscription start'
          ],
          isFeatured: true,
          status: 'published',
          displayOrder: 3
        }
      ],
      planner_weeks: [
        {
          id: 'week_2026_03_02',
          weekLabel: 'Mon 2 \u2013 Sun 8',
          startDate: '2026-03-02T00:00:00Z',
          endDate: '2026-03-08T23:59:59Z',
          displayOrder: 1,
          isCurrentWeek: true
        },
        {
          id: 'week_2026_03_09',
          weekLabel: 'Mon 9 \u2013 Sun 15',
          startDate: '2026-03-09T00:00:00Z',
          endDate: '2026-03-15T23:59:59Z',
          displayOrder: 2,
          isCurrentWeek: false
        },
        {
          id: 'week_mon_4_sun_10',
          weekLabel: 'Mon 4 \u2013 Sun 10',
          startDate: '2026-05-04T00:00:00Z',
          endDate: '2026-05-10T23:59:59Z',
          displayOrder: 3,
          isCurrentWeek: false
        }
      ],
      subscription_plans: [
        {
          id: 'basic_fit',
          name: 'Basic Fit',
          description: 'Essential access to workouts and basic tracking for getting started with fitness.',
          status: 'active',
          baseMonthlyPrice: 12,
          annualPrice: 108,
          annualEffectiveMonthlyPrice: 9,
          currency: 'usd',
          includesMealPlans: false,
          trialAvailable: true,
          trialDurationDays: 7,
          oneOnOneSessionsPerMonth: 0,
          featureList: [
            'Access to all basic workouts',
            'Weekly progress tracking',
            'Community challenges',
            '7-day free trial'
          ],
          displayOrder: 1
        },
        {
          id: 'nutrition_lite',
          name: 'Nutrition Lite',
          description: 'Simple meal plans and calorie guidance to support your training.',
          status: 'active',
          baseMonthlyPrice: 15,
          annualPrice: 144,
          annualEffectiveMonthlyPrice: 12,
          currency: 'usd',
          includesMealPlans: true,
          trialAvailable: true,
          trialDurationDays: 14,
          oneOnOneSessionsPerMonth: 0,
          featureList: [
            'Meal Plans',
            'Personalized calorie targets',
            'Email nutrition tips',
            '14-day free trial'
          ],
          displayOrder: 2
        },
        {
          id: 'smart_shred',
          name: 'Smart Shred',
          description: 'Balanced training and nutrition for effective fat loss.',
          status: 'active',
          baseMonthlyPrice: 19,
          annualPrice: 192,
          annualEffectiveMonthlyPrice: 16,
          currency: 'usd',
          includesMealPlans: true,
          trialAvailable: true,
          trialDurationDays: 7,
          oneOnOneSessionsPerMonth: 1,
          featureList: [
            'All Basic Fit features',
            'Meal Plans',
            'Smart weight-loss programs',
            '1:1 coaching session per month',
            '7-day free trial'
          ],
          displayOrder: 3
        }
      ],
      workout_plans: [
        {
          id: 'beginner_home_bodyweight_3x',
          name: 'Beginner Home Bodyweight',
          subtitle: '3 sessions/week \u2022 No equipment',
          description: 'A simple 3-day-per-week bodyweight program you can do at home to build strength and confidence.',
          level: 'beginner',
          equipment: 'no_equipment',
          location: 'home',
          sessionsPerWeek: 3,
          minSessionDurationMinutes: 20,
          maxSessionDurationMinutes: 30,
          tags: [
            'beginner',
            'no equipment',
            'home',
            'strength',
            'weight loss'
          ],
          image: 'https://i.pinimg.com/originals/b9/db/11/b9db11829b45e35a02adc3983bf428e7.jpg',
          status: 'active'
        },
        {
          id: 'beginner_home_bodyweight_4x',
          name: 'Home Starter: 4-Day Bodyweight',
          subtitle: '4 sessions/week \u2022 No equipment',
          description: 'A 4-day plan focused on short, effective home workouts with no equipment required.',
          level: 'beginner',
          equipment: 'no_equipment',
          location: 'home',
          sessionsPerWeek: 4,
          minSessionDurationMinutes: 25,
          maxSessionDurationMinutes: 35,
          tags: [
            'beginner',
            'no equipment',
            'home',
            'toning'
          ],
          image: 'https://images.unsplash.com/photo-1546484959-f9a9ae384058?w=800&h=600&fit=crop&auto=format&q=80',
          status: 'active'
        },
        {
          id: 'beginner_home_cardio_3x',
          name: 'Beginner Low-Impact Cardio at Home',
          subtitle: '3 sessions/week \u2022 No equipment',
          description: 'Low-impact cardio routines designed for small spaces and joint-friendly movement.',
          level: 'beginner',
          equipment: 'no_equipment',
          location: 'home',
          sessionsPerWeek: 3,
          minSessionDurationMinutes: 20,
          maxSessionDurationMinutes: 30,
          tags: [
            'beginner',
            'cardio',
            'no equipment',
            'home',
            'weight loss'
          ],
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/c97db1b4-0633-57e2-9d5e-a220fa575c5e.jpeg',
          status: 'active'
        }
      ],
      workout_session_templates: [
        {
          id: 'strength_home_30',
          name: 'Home Strength Basics (Full Body)',
          description: 'A 30-minute full-body strength session using bodyweight only.',
          category: 'strength',
          level: 'beginner',
          equipment: 'no_equipment',
          location: 'home',
          durationMinutes: 30,
          isUnder45Minutes: true,
          tags: [
            'strength',
            'full body',
            'no equipment',
            'home'
          ],
          status: 'active'
        },
        {
          id: 'strength_home_dumbbells_40',
          name: 'Dumbbell Strength Circuit',
          description: 'A 40-minute strength circuit using a pair of dumbbells.',
          category: 'strength',
          level: 'intermediate',
          equipment: 'dumbbells_only',
          location: 'home',
          durationMinutes: 40,
          isUnder45Minutes: true,
          tags: [
            'strength',
            'dumbbells',
            'circuit'
          ],
          status: 'active'
        },
        {
          id: 'strength_gym_60',
          name: 'Gym Barbell Strength',
          description: 'A 60-minute heavy lifting session for compound strength.',
          category: 'strength',
          level: 'advanced',
          equipment: 'full_gym',
          location: 'gym',
          durationMinutes: 60,
          isUnder45Minutes: false,
          tags: [
            'barbell',
            'strength',
            'gym'
          ],
          status: 'active'
        }
      ],
      live_classes: [
        {
          id: 'class_20260304_strength_1815',
          title: 'Evening Full-Body Strength',
          description: 'A 40-minute full-body strength session using bodyweight, perfect for winding down your day.',
          classType: 'strength',
          level: 'all_levels',
          instructorName: 'Taylor Reed',
          date: '2026-03-04T00:00:00Z',
          startDateTime: '2026-03-04T18:15:00Z',
          endDateTime: '2026-03-04T18:55:00Z',
          durationMinutes: 40,
          rating: 4.8,
          locationType: 'online',
          maxParticipants: 80,
          status: 'scheduled',
          spotsRemaining: 80
        },
        {
          id: 'class_20260304_yoga_1900',
          title: 'Calm & Stretch Evening Yoga',
          description: 'A gentle 45-minute yoga flow focusing on hips, hamstrings, and lower back.',
          classType: 'yoga',
          level: 'all_levels',
          instructorName: 'Maya Chen',
          date: '2026-03-04T00:00:00Z',
          startDateTime: '2026-03-04T19:00:00Z',
          endDateTime: '2026-03-04T19:45:00Z',
          durationMinutes: 45,
          rating: 4.6,
          locationType: 'online',
          maxParticipants: 120,
          status: 'scheduled',
          spotsRemaining: 120
        },
        {
          id: 'class_20260304_hiit_2030',
          title: 'Night HIIT Power',
          description: 'High-energy 45-minute HIIT session with low-impact alternatives provided.',
          classType: 'hiit',
          level: 'intermediate',
          instructorName: 'Jordan Smith',
          date: '2026-03-04T00:00:00Z',
          startDateTime: '2026-03-04T20:30:00Z',
          endDateTime: '2026-03-04T21:15:00Z',
          durationMinutes: 45,
          rating: 4.7,
          locationType: 'online',
          maxParticipants: 100,
          status: 'scheduled',
          spotsRemaining: 100
        }
      ],
      live_class_bookings: [
        {
          id: 'booking_1',
          liveClassId: 'class_20260303_strength_1900',
          attendeeName: 'Jamie Parker',
          bookedAt: '2026-03-02T15:20:00Z',
          status: 'booked'
        },
        {
          id: 'booking_2',
          liveClassId: 'class_20260303_cardio_1200',
          attendeeName: 'Taylor Green',
          bookedAt: '2026-03-01T10:05:00Z',
          status: 'attended'
        },
        {
          id: 'booking_3',
          liveClassId: 'class_20260302_hiit_1800',
          attendeeName: 'Morgan Lee',
          bookedAt: '2026-02-28T18:45:00Z',
          status: 'no_show'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:13:22.248647'
      }
    };

    // Populate localStorage using storage keys
    localStorage.setItem('faq_items', JSON.stringify(generatedData.faq_items));
    localStorage.setItem('planner_weeks', JSON.stringify(generatedData.planner_weeks));
    localStorage.setItem('subscription_plans', JSON.stringify(generatedData.subscription_plans));
    localStorage.setItem('workout_plans', JSON.stringify(generatedData.workout_plans));
    localStorage.setItem('workout_session_templates', JSON.stringify(generatedData.workout_session_templates));
    localStorage.setItem('live_classes', JSON.stringify(generatedData.live_classes));
    localStorage.setItem('live_class_bookings', JSON.stringify(generatedData.live_class_bookings));

    // Ensure other collections exist as empty arrays if not already
    const keysToEnsure = [
      'trial_signups',
      'saved_workout_plans',
      'weekly_workout_schedules',
      'weekly_workout_entries',
      'calorie_calculations',
      'email_plan_requests',
      'checkout_sessions',
      'newsletter_subscriptions',
      'chat_sessions',
      'chat_messages'
    ];
    keysToEnsure.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_Start14DayTrialCheapestMealPlan();
    this.testTask2_SaveBeginnerNoEquipmentHomeWorkoutPlan();
    this.testTask3_Create3DayWeeklyScheduleUnder45Minutes();
    this.testTask4_CalculateWeightLossCaloriesAndEmail();
    this.testTask5_SelectAnnualPlanUnder40WithMostCoaching();
    this.testTask6_BookEveningLiveClassTomorrowUnder45();
    this.testTask7_SubscribeToTrainingTipsNewsletter();
    this.testTask8_AskChatAboutPausingMembership();

    return this.results;
  }

  // Task 1: Start a 14-day trial of the cheapest plan with meal plans between $15-25/month
  testTask1_Start14DayTrialCheapestMealPlan() {
    const testName = 'Task 1 - Start trial for cheapest meal-plan between $15-25/month';
    console.log('Testing:', testName);

    try {
      // Get pricing plans in monthly view
      const pricingMonthly = this.logic.getPricingPlans('monthly');
      this.assert(Array.isArray(pricingMonthly) && pricingMonthly.length > 0, 'Monthly pricing plans should be returned');

      // Identify candidate plans: price between 15 and 25 and includes meal plans
      const candidates = pricingMonthly.filter((item) => {
        const price = item.display && typeof item.display.equivalentMonthlyPrice === 'number'
          ? item.display.equivalentMonthlyPrice
          : item.plan.baseMonthlyPrice;
        const includesMeal = (item.display && item.display.includesMealPlans) || item.plan.includesMealPlans;
        return price >= 15 && price <= 25 && includesMeal;
      });

      this.assert(candidates.length > 0, 'Should find at least one plan between $15 and $25 with meal plans');

      // Choose the cheapest candidate based on actual pricing data
      const selected = candidates.reduce((cheapest, current) => {
        const cheapestPrice = (cheapest.display && cheapest.display.equivalentMonthlyPrice) || cheapest.plan.baseMonthlyPrice;
        const currentPrice = (current.display && current.display.equivalentMonthlyPrice) || current.plan.baseMonthlyPrice;
        return currentPrice < cheapestPrice ? current : cheapest;
      }, candidates[0]);

      const selectedPlanId = selected.plan.id;
      this.assert(selectedPlanId, 'Selected plan should have an id');

      // Verify trial context for selected plan
      const trialContext = this.logic.getTrialSignupContext(selectedPlanId);
      this.assert(trialContext && trialContext.plan && trialContext.plan.id === selectedPlanId, 'Trial context should match selected plan');
      this.assert(trialContext.trialSummary && trialContext.trialSummary.trialAvailable === true, 'Selected plan should have trial available');

      // Submit trial signup using actual plan id
      const fullName = 'Alex Trial';
      const email = 'alex.trial@example.com';
      const primaryGoal = 'lose_weight';
      const signupResult = this.logic.submitTrialSignup(selectedPlanId, fullName, email, primaryGoal);

      this.assert(signupResult && signupResult.success === true, 'Trial signup should succeed');
      this.assert(signupResult.trialSignup && signupResult.trialSignup.id, 'Trial signup should return an id');
      this.assert(signupResult.trialSignup.planId === selectedPlanId, 'Trial signup should be linked to the selected plan');
      this.assert(signupResult.trialSignup.fullName === fullName, 'Full name should be stored correctly');
      this.assert(signupResult.trialSignup.email === email, 'Email should be stored correctly');
      this.assert(signupResult.trialSignup.primaryFitnessGoal === primaryGoal, 'Primary fitness goal should be stored correctly');

      // Verify persistence in localStorage
      const trialSignups = JSON.parse(localStorage.getItem('trial_signups') || '[]');
      const storedSignup = trialSignups.find((s) => s.id === signupResult.trialSignup.id);
      this.assert(!!storedSignup, 'Trial signup should be persisted in localStorage');
      this.assert(storedSignup.planId === selectedPlanId, 'Stored trial signup should reference the correct plan');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Save a beginner, no-equipment home workout plan with at least 3 weekly sessions
  testTask2_SaveBeginnerNoEquipmentHomeWorkoutPlan() {
    const testName = 'Task 2 - Save beginner no-equipment home workout plan (>=3 sessions/week)';
    console.log('Testing:', testName);

    try {
      // Get filter options (sanity check)
      const filterOptions = this.logic.getWorkoutFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.levelOptions), 'Workout filter options should be available');

      // Apply filters: beginner, no equipment, home, min 3 sessions/week
      const filters = {
        levels: ['beginner'],
        equipments: ['no_equipment'],
        locations: ['home'],
        minSessionsPerWeek: 3
      };

      const plans = this.logic.searchWorkoutPlans(filters);
      this.assert(Array.isArray(plans) && plans.length > 0, 'Should return at least one filtered workout plan');

      // From filtered results, pick first plan with sessions/week >= 3
      const selectedPlan = plans.find((p) => typeof p.sessionsPerWeek === 'number' && p.sessionsPerWeek >= 3) || plans[0];
      this.assert(selectedPlan && selectedPlan.id, 'Selected workout plan should have an id');

      // Load details to verify attributes
      const planDetail = this.logic.getWorkoutPlanDetail(selectedPlan.id);
      this.assert(planDetail && planDetail.workoutPlan && planDetail.workoutPlan.id === selectedPlan.id, 'Workout plan detail should match selected plan');
      this.assert(planDetail.workoutPlan.level === 'beginner', 'Selected plan should be beginner');
      this.assert(planDetail.workoutPlan.equipment === 'no_equipment', 'Selected plan should require no equipment');
      this.assert(planDetail.workoutPlan.location === 'home', 'Selected plan should be for home');
      this.assert(planDetail.workoutPlan.sessionsPerWeek >= 3, 'Selected plan should have at least 3 sessions per week');

      // Save the workout plan
      const saveResult = this.logic.saveWorkoutPlan(selectedPlan.id, null);
      this.assert(saveResult && saveResult.success === true, 'Saving workout plan should succeed');
      this.assert(saveResult.savedWorkoutPlan && saveResult.savedWorkoutPlan.id, 'Saved workout plan should have an id');
      this.assert(saveResult.savedWorkoutPlan.workoutPlanId === selectedPlan.id, 'Saved workout should reference the correct plan');

      // Verify persistence via localStorage
      const savedList = JSON.parse(localStorage.getItem('saved_workout_plans') || '[]');
      const stored = savedList.find((s) => s.id === saveResult.savedWorkoutPlan.id);
      this.assert(!!stored, 'Saved workout plan should be persisted in localStorage');

      // Verify through My Plans API
      const myPlans = this.logic.getMySavedWorkoutPlans();
      this.assert(Array.isArray(myPlans), 'My saved workout plans should return an array');
      const myPlanEntry = myPlans.find((entry) => entry.savedWorkoutPlan && entry.savedWorkoutPlan.id === saveResult.savedWorkoutPlan.id);
      this.assert(!!myPlanEntry, 'Saved workout should appear in My Plans');
      this.assert(myPlanEntry.workoutPlan && myPlanEntry.workoutPlan.id === selectedPlan.id, 'My Plans entry should be linked to the correct workout plan');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Create a 3-day weekly schedule with strength, cardio, and yoga sessions under 45 minutes
  testTask3_Create3DayWeeklyScheduleUnder45Minutes() {
    const testName = 'Task 3 - Create 3-day weekly schedule (Mon/Wed/Fri) with sessions under 45 minutes';
    console.log('Testing:', testName);

    try {
      // Get available planner weeks and pick the one labeled 'Mon 4 \u2013 Sun 10'
      const weeks = this.logic.getPlannerWeeks();
      this.assert(Array.isArray(weeks) && weeks.length > 0, 'Planner weeks should be available');

      const targetWeek = weeks.find((w) => w.weekLabel && w.weekLabel.indexOf('Mon 4') !== -1) || weeks[0];
      this.assert(targetWeek && targetWeek.id, 'Target planner week should be found');

      // Load existing schedule for this week
      const initialSchedule = this.logic.getWeeklyPlannerSchedule(targetWeek.id);
      this.assert(initialSchedule && initialSchedule.plannerWeek && initialSchedule.plannerWeek.id === targetWeek.id, 'Initial weekly planner schedule should load correctly');

      // Helper to add a workout for a day with fallback when category templates are limited
      const addWorkoutForDay = (dayOfWeek, primaryCategory, fallbackTemplate) => {
        const maxDuration = 45;
        let sessions = this.logic.searchPlannerWorkouts(primaryCategory, maxDuration);

        if (!Array.isArray(sessions)) {
          sessions = [];
        }

        let chosen = sessions[0];
        if (!chosen && fallbackTemplate) {
          chosen = fallbackTemplate;
        }

        this.assert(chosen && chosen.id, 'Should find at least one workout session template for ' + primaryCategory + ' or fallback');
        this.assert(chosen.durationMinutes <= maxDuration, 'Chosen session for ' + primaryCategory + ' should be <= 45 minutes');

        const addResult = this.logic.addWorkoutToPlanner(targetWeek.id, dayOfWeek, chosen.id);
        this.assert(addResult && addResult.success === true, 'addWorkoutToPlanner should succeed for ' + dayOfWeek);
        this.assert(addResult.entryId, 'addWorkoutToPlanner should return an entryId for ' + dayOfWeek);
        this.assert(addResult.updatedDay && addResult.updatedDay.dayOfWeek === dayOfWeek, 'Updated day should match ' + dayOfWeek);

        const dayEntries = addResult.updatedDay.entries || [];
        const matchingEntry = dayEntries.find((e) => e.entryId === addResult.entryId);
        this.assert(!!matchingEntry, 'Updated day should include the newly added entry for ' + dayOfWeek);

        return { template: chosen, entryId: addResult.entryId };
      };

      // First, get at least one strength template to use as fallback if cardio/yoga are missing in test data
      const strengthTemplates = this.logic.searchPlannerWorkouts('strength', 45);
      this.assert(Array.isArray(strengthTemplates) && strengthTemplates.length > 0, 'There should be at least one strength template under 45 minutes');
      const fallbackStrength = strengthTemplates[0];

      // Monday: Strength
      const monday = addWorkoutForDay('mon', 'strength', fallbackStrength);

      // Wednesday: Cardio (fallback to strength if needed)
      const wednesday = addWorkoutForDay('wed', 'cardio', fallbackStrength);

      // Friday: Yoga (fallback to strength if needed)
      const friday = addWorkoutForDay('fri', 'yoga', fallbackStrength);

      // Verify schedule after adding workouts
      const updatedSchedule = this.logic.getWeeklyPlannerSchedule(targetWeek.id);
      this.assert(updatedSchedule && Array.isArray(updatedSchedule.days), 'Updated weekly schedule should return days array');

      const getDay = (dayOfWeek) => updatedSchedule.days.find((d) => d.dayOfWeek === dayOfWeek);

      const monDay = getDay('mon');
      const wedDay = getDay('wed');
      const friDay = getDay('fri');

      this.assert(monDay && Array.isArray(monDay.entries) && monDay.entries.length > 0, 'Monday should have at least one scheduled workout');
      this.assert(wedDay && Array.isArray(wedDay.entries) && wedDay.entries.length > 0, 'Wednesday should have at least one scheduled workout');
      this.assert(friDay && Array.isArray(friDay.entries) && friDay.entries.length > 0, 'Friday should have at least one scheduled workout');

      // Verify that each scheduled workout is <=45 minutes using actual workoutSession details
      const checkEntriesUnder45 = (day) => {
        day.entries.forEach((entry) => {
          if (entry.workoutSession) {
            const duration = entry.workoutSession.durationMinutes;
            this.assert(duration <= 45, 'Workout on ' + day.dayOfWeek + ' should be <= 45 minutes');
          }
        });
      };

      checkEntriesUnder45(monDay);
      checkEntriesUnder45(wedDay);
      checkEntriesUnder45(friDay);

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Calculate a weight-loss calorie target and email it
  testTask4_CalculateWeightLossCaloriesAndEmail() {
    const testName = 'Task 4 - Calculate weight-loss calories and email plan';
    console.log('Testing:', testName);

    try {
      // Get calculator options to ensure enums and labels are correctly wired
      const options = this.logic.getCalorieCalculatorOptions();
      this.assert(options && Array.isArray(options.genderOptions), 'Calorie calculator options should be available');

      const femaleOption = options.genderOptions.find((o) => o.value === 'female');
      this.assert(!!femaleOption, 'Female gender option should exist');

      const moderateActivityOption = options.activityLevelOptions.find((o) => o.value === 'moderately_active');
      this.assert(!!moderateActivityOption, 'Moderately active option should exist');

      const loseHalfKgOption = options.goalOptions.find((o) => o.value === 'lose_0_5_kg_per_week');
      this.assert(!!loseHalfKgOption, 'Lose 0.5 kg/week goal option should exist');

      // Perform calculation using actual enum values from options
      const age = 30;
      const weightKg = 65;
      const heightCm = 170;
      const calcResult = this.logic.calculateCaloriePlan(
        age,
        weightKg,
        heightCm,
        femaleOption.value,
        moderateActivityOption.value,
        loseHalfKgOption.value
      );

      this.assert(calcResult && calcResult.calculation && calcResult.calculation.id, 'Calorie calculation should return a calculation with id');
      const calc = calcResult.calculation;
      this.assert(calc.age === age, 'Age should be stored correctly in calculation');
      this.assert(calc.weightKg === weightKg, 'Weight should be stored correctly in calculation');
      this.assert(calc.heightCm === heightCm, 'Height should be stored correctly in calculation');
      this.assert(typeof calc.calculatedCaloriesPerDay === 'number' && calc.calculatedCaloriesPerDay > 0, 'Calculated calories per day should be a positive number');

      // Email this plan
      const email = 'cal.plan@example.com';
      const emailResult = this.logic.emailCaloriePlan(calc.id, email);
      this.assert(emailResult && emailResult.success === true, 'Emailing calorie plan should succeed');
      this.assert(emailResult.emailPlanRequest && emailResult.emailPlanRequest.id, 'Email plan request should have an id');
      this.assert(emailResult.emailPlanRequest.calorieCalculationId === calc.id, 'Email plan should be linked to correct calculation');
      this.assert(emailResult.emailPlanRequest.email === email, 'Email should be stored correctly in email plan request');

      // Verify persistence
      const storedCalcs = JSON.parse(localStorage.getItem('calorie_calculations') || '[]');
      const storedCalc = storedCalcs.find((c) => c.id === calc.id);
      this.assert(!!storedCalc, 'Calorie calculation should be persisted in localStorage');

      const storedEmailPlans = JSON.parse(localStorage.getItem('email_plan_requests') || '[]');
      const storedEmail = storedEmailPlans.find((e) => e.id === emailResult.emailPlanRequest.id);
      this.assert(!!storedEmail, 'Email plan request should be persisted in localStorage');
      this.assert(storedEmail.calorieCalculationId === calc.id, 'Stored email plan should reference correct calculation');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Select an annual plan under $40/month with the most 1:1 coaching sessions
  testTask5_SelectAnnualPlanUnder40WithMostCoaching() {
    const testName = 'Task 5 - Select annual plan under $40/month with most 1:1 coaching';
    console.log('Testing:', testName);

    try {
      // Get pricing plans for annual billing
      const pricingAnnual = this.logic.getPricingPlans('annual');
      this.assert(Array.isArray(pricingAnnual) && pricingAnnual.length > 0, 'Annual pricing plans should be returned');

      // Filter plans with equivalent monthly price <= 40
      const under40 = pricingAnnual.filter((item) => {
        const eqMonthly = (item.display && item.display.equivalentMonthlyPrice) || item.plan.annualEffectiveMonthlyPrice;
        return typeof eqMonthly === 'number' && eqMonthly <= 40;
      });

      this.assert(under40.length > 0, 'Should find at least one annual plan under or equal to $40/month');

      // Choose the plan with the highest number of 1:1 coaching sessions per month
      const bestPlanItem = under40.reduce((best, current) => {
        const bestSessions = (best.display && best.display.oneOnOneSessionsPerMonth != null)
          ? best.display.oneOnOneSessionsPerMonth
          : best.plan.oneOnOneSessionsPerMonth;
        const currentSessions = (current.display && current.display.oneOnOneSessionsPerMonth != null)
          ? current.display.oneOnOneSessionsPerMonth
          : current.plan.oneOnOneSessionsPerMonth;
        return currentSessions > bestSessions ? current : best;
      }, under40[0]);

      const bestPlanId = bestPlanItem.plan.id;
      this.assert(bestPlanId, 'Best annual plan should have an id');

      const bestEqMonthly = (bestPlanItem.display && bestPlanItem.display.equivalentMonthlyPrice) || bestPlanItem.plan.annualEffectiveMonthlyPrice;
      this.assert(bestEqMonthly <= 40, 'Best plan effective monthly price should be <= 40');

      const bestSessions = (bestPlanItem.display && bestPlanItem.display.oneOnOneSessionsPerMonth != null)
        ? bestPlanItem.display.oneOnOneSessionsPerMonth
        : bestPlanItem.plan.oneOnOneSessionsPerMonth;

      // Confirm that no other under-40 plan has more sessions per month
      under40.forEach((item) => {
        const sessions = (item.display && item.display.oneOnOneSessionsPerMonth != null)
          ? item.display.oneOnOneSessionsPerMonth
          : item.plan.oneOnOneSessionsPerMonth;
        this.assert(bestSessions >= sessions, 'Selected plan should have at least as many 1:1 sessions as other under-$40 plans');
      });

      // Optionally load plan detail for additional verification
      const planDetail = this.logic.getPlanDetail(bestPlanId);
      this.assert(planDetail && planDetail.plan && planDetail.plan.id === bestPlanId, 'Plan detail should match selected plan');

      // Initiate checkout for this plan with annual billing
      const checkoutSelect = this.logic.choosePlanForCheckout(bestPlanId, 'annual');
      this.assert(checkoutSelect && checkoutSelect.success === true, 'Choosing plan for checkout should succeed');
      this.assert(checkoutSelect.checkoutSession && checkoutSelect.checkoutSession.id, 'Checkout session should have an id');

      const checkoutSessionId = checkoutSelect.checkoutSession.id;

      // Get checkout summary to verify linkage and pricing
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.checkoutSession && checkoutSummary.checkoutSession.id === checkoutSessionId, 'Checkout summary should reference the correct session');
      this.assert(checkoutSummary.plan && checkoutSummary.plan.id === bestPlanId, 'Checkout summary should reference the selected plan');

      const summaryEqMonthly = checkoutSummary.pricingSummary && checkoutSummary.pricingSummary.equivalentMonthlyPrice;
      if (typeof summaryEqMonthly === 'number') {
        this.assert(summaryEqMonthly <= 40, 'Checkout summary equivalent monthly price should be <= 40');
      }

      if (checkoutSummary.coachingSummary) {
        const summarySessions = checkoutSummary.coachingSummary.oneOnOneSessionsPerMonth;
        this.assert(summarySessions === bestSessions, 'Coaching sessions per month in summary should match selected plan');
        if (typeof checkoutSummary.coachingSummary.meetsTargetUnder40PerMonth === 'boolean') {
          this.assert(checkoutSummary.coachingSummary.meetsTargetUnder40PerMonth === true, 'meetsTargetUnder40PerMonth flag should be true for selected plan');
        }
      }

      // Confirm checkout selection (simulate proceeding)
      const confirmResult = this.logic.confirmCheckoutSelection('Annual Tester', 'annual.tester@example.com');
      this.assert(confirmResult && confirmResult.success === true, 'Confirming checkout selection should succeed');
      this.assert(confirmResult.checkoutSession && confirmResult.checkoutSession.id === checkoutSessionId, 'Confirmed checkout session id should match the one created earlier');

      // Verify persistence in localStorage
      const storedSessions = JSON.parse(localStorage.getItem('checkout_sessions') || '[]');
      const storedSession = storedSessions.find((s) => s.id === checkoutSessionId);
      this.assert(!!storedSession, 'Checkout session should be persisted in localStorage');
      this.assert(storedSession.planId === bestPlanId, 'Stored checkout session should reference correct plan');
      this.assert(storedSession.billingPeriod === 'annual', 'Stored checkout session billing period should be annual');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Book an evening live class for tomorrow under 45 minutes with rating 4.5+
  testTask6_BookEveningLiveClassTomorrowUnder45() {
    const testName = 'Task 6 - Book evening live class under 45 minutes with rating 4.5+';
    console.log('Testing:', testName);

    try {
      // Determine target date from existing live_classes data (acts as "tomorrow" for this test)
      const liveClassesData = JSON.parse(localStorage.getItem('live_classes') || '[]');
      this.assert(Array.isArray(liveClassesData) && liveClassesData.length > 0, 'There should be at least one live class in test data');

      // Choose the earliest available date from live classes
      const sortedByDate = liveClassesData.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const targetDate = sortedByDate[0].date;
      const targetDateIso = new Date(targetDate).toISOString().slice(0, 10); // YYYY-MM-DD

      // Get live class filter options
      const options = this.logic.getLiveClassFilterOptions();
      this.assert(options && Array.isArray(options.startTimeRangeOptions), 'Live class filter options should be available');

      // Find a time range covering 6:00 PM - 10:00 PM if available, otherwise fallback to the first evening-like range
      let timeRangeOption = options.startTimeRangeOptions.find((opt) => opt.fromTime === '18:00' && opt.toTime === '22:00');
      if (!timeRangeOption) {
        timeRangeOption = options.startTimeRangeOptions[0];
      }
      this.assert(timeRangeOption && timeRangeOption.fromTime && timeRangeOption.toTime, 'A start time range option should be selected');

      // Find duration option for 45 minutes or less
      this.assert(Array.isArray(options.durationOptions), 'Duration options should be available');
      let durationOption = options.durationOptions.find((opt) => typeof opt.maxDurationMinutes === 'number' && opt.maxDurationMinutes <= 45);
      if (!durationOption) {
        durationOption = options.durationOptions[0];
      }
      this.assert(durationOption && typeof durationOption.maxDurationMinutes === 'number', 'A duration option should be selected');

      // Find rating option for 4.5+ stars
      this.assert(Array.isArray(options.ratingOptions), 'Rating options should be available');
      let ratingOption = options.ratingOptions.find((opt) => typeof opt.minRating === 'number' && opt.minRating >= 4.5);
      if (!ratingOption) {
        ratingOption = options.ratingOptions[0];
      }
      this.assert(ratingOption && typeof ratingOption.minRating === 'number', 'A rating option should be selected');

      const filters = {
        startTimeRange: {
          fromTime: timeRangeOption.fromTime,
          toTime: timeRangeOption.toTime
        },
        maxDurationMinutes: durationOption.maxDurationMinutes,
        minRating: ratingOption.minRating
      };

      const classes = this.logic.searchLiveClasses(targetDateIso, filters);
      this.assert(Array.isArray(classes) && classes.length > 0, 'Should find at least one live class matching filters');

      const selectedClass = classes[0];
      this.assert(selectedClass && selectedClass.id, 'Selected live class should have an id');

      // Verify details and derived properties
      const classDetail = this.logic.getLiveClassDetail(selectedClass.id);
      this.assert(classDetail && classDetail.liveClass && classDetail.liveClass.id === selectedClass.id, 'Live class detail should match selected class');
      this.assert(classDetail.liveClass.durationMinutes <= filters.maxDurationMinutes, 'Selected live class should be within duration limit');
      this.assert(classDetail.liveClass.rating >= filters.minRating, 'Selected live class should meet rating requirement');

      if (classDetail.derived) {
        if (typeof classDetail.derived.isEveningClass === 'boolean') {
          this.assert(classDetail.derived.isEveningClass === true, 'Derived isEveningClass should be true for selected class');
        }
        if (typeof classDetail.derived.isUnder45Minutes === 'boolean') {
          this.assert(classDetail.derived.isUnder45Minutes === true, 'Derived isUnder45Minutes should be true for selected class');
        }
        if (typeof classDetail.derived.hasHighRating === 'boolean') {
          this.assert(classDetail.derived.hasHighRating === true, 'Derived hasHighRating should be true for selected class');
        }
      }

      // Book the class
      const attendeeName = 'Sam Evening';
      const bookingResult = this.logic.bookLiveClass(selectedClass.id, attendeeName);
      this.assert(bookingResult && bookingResult.success === true, 'Booking live class should succeed');
      this.assert(bookingResult.liveClassBooking && bookingResult.liveClassBooking.id, 'Booking should have an id');
      this.assert(bookingResult.liveClassBooking.liveClassId === selectedClass.id, 'Booking should be linked to the selected live class');
      this.assert(bookingResult.liveClassBooking.attendeeName === attendeeName, 'Attendee name should be stored correctly');

      // Verify booking persistence
      const bookings = JSON.parse(localStorage.getItem('live_class_bookings') || '[]');
      const storedBooking = bookings.find((b) => b.id === bookingResult.liveClassBooking.id);
      this.assert(!!storedBooking, 'New live class booking should be persisted in localStorage');
      this.assert(storedBooking.liveClassId === selectedClass.id, 'Stored booking should reference correct class');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Subscribe to training tips emails 3 times per week focused on strength and mobility
  testTask7_SubscribeToTrainingTipsNewsletter() {
    const testName = 'Task 7 - Subscribe to training tips newsletter (3x/week, strength & mobility)';
    console.log('Testing:', testName);

    try {
      // Get newsletter options
      const options = this.logic.getNewsletterOptions();
      this.assert(options && Array.isArray(options.focusAreaOptions), 'Newsletter focus area options should be available');
      this.assert(Array.isArray(options.emailFrequencyOptions), 'Newsletter email frequency options should be available');
      this.assert(Array.isArray(options.notificationTopicOptions), 'Newsletter topic options should be available');

      const strengthFocus = options.focusAreaOptions.find((o) => o.value === 'strength');
      const mobilityFocus = options.focusAreaOptions.find((o) => o.value === 'mobility_flexibility');
      this.assert(!!strengthFocus, 'Strength focus area should exist');
      this.assert(!!mobilityFocus, 'Mobility/Flexibility focus area should exist');

      const threePerWeek = options.emailFrequencyOptions.find((o) => o.value === 'three_times_per_week');
      this.assert(!!threePerWeek, 'Email frequency three_times_per_week should exist');

      const trainingTipsTopic = options.notificationTopicOptions.find((o) => o.value === 'training_tips_workout_reminders');
      this.assert(!!trainingTipsTopic, 'Training tips & workout reminders topic should exist');

      const email = 'strength.mobility@example.com';
      const firstName = 'Jordan';
      const focusAreas = [strengthFocus.value, mobilityFocus.value];
      const notificationTopics = [trainingTipsTopic.value];

      const subscribeResult = this.logic.subscribeToNewsletter(
        email,
        firstName,
        focusAreas,
        threePerWeek.value,
        notificationTopics
      );

      this.assert(subscribeResult && subscribeResult.success === true, 'Newsletter subscription should succeed');
      this.assert(subscribeResult.subscription && subscribeResult.subscription.id, 'Newsletter subscription should have an id');
      const sub = subscribeResult.subscription;

      this.assert(sub.email === email, 'Subscription email should match');
      this.assert(sub.firstName === firstName, 'Subscription firstName should match');
      this.assert(sub.emailFrequency === threePerWeek.value, 'Subscription emailFrequency should match selected option');
      this.assert(Array.isArray(sub.focusAreas) && sub.focusAreas.includes(strengthFocus.value) && sub.focusAreas.includes(mobilityFocus.value), 'Subscription focusAreas should include strength and mobility');
      this.assert(Array.isArray(sub.notificationTopics) && sub.notificationTopics.length === 1 && sub.notificationTopics[0] === trainingTipsTopic.value, 'Subscription notificationTopics should only include training tips & workout reminders');

      // Verify persistence
      const storedSubs = JSON.parse(localStorage.getItem('newsletter_subscriptions') || '[]');
      const storedSub = storedSubs.find((s) => s.id === sub.id);
      this.assert(!!storedSub, 'Newsletter subscription should be persisted in localStorage');
      this.assert(storedSub.email === email, 'Stored subscription email should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Ask via chat if membership can be paused for 2 weeks without losing progress
  testTask8_AskChatAboutPausingMembership() {
    const testName = 'Task 8 - Ask via chat about pausing membership without losing progress';
    console.log('Testing:', testName);

    try {
      // Load FAQ page content (preview for context)
      const faqPage = this.logic.getFaqPageContent();
      this.assert(faqPage && Array.isArray(faqPage.featuredItems), 'FAQ page content should load with featured items');

      // Search FAQ items for "pause membership"
      const query = 'pause membership';
      const searchResults = this.logic.searchFaqItems(query);
      this.assert(Array.isArray(searchResults) && searchResults.length > 0, 'FAQ search for "pause membership" should return results');

      const matchingItem = searchResults.find((item) => {
        const inQuestion = item.question && item.question.toLowerCase().indexOf('pause') !== -1;
        const hasTag = Array.isArray(item.tags) && item.tags.includes('pause membership');
        return inQuestion || hasTag;
      }) || searchResults[0];

      this.assert(!!matchingItem, 'Should find at least one FAQ item related to pausing membership');

      // Start chat from FAQ
      const chatStart = this.logic.startChatFromFaq();
      this.assert(chatStart && chatStart.chatSession && chatStart.chatSession.id, 'Starting chat from FAQ should return a chat session');
      const chatSession = chatStart.chatSession;

      this.assert(chatSession.source === 'faq_page', 'Chat session source should be faq_page');
      this.assert(chatSession.status === 'open', 'Chat session should be open');

      // Send the question message via chat
      const messageText = 'Can I pause my membership for 2 weeks starting next Monday without losing my progress data?';
      const sendResult = this.logic.sendChatMessage(messageText);
      this.assert(sendResult && sendResult.userMessage && sendResult.userMessage.id, 'Sending chat message should return a user message');
      this.assert(sendResult.chatSession && sendResult.chatSession.id === chatSession.id, 'Chat session should remain the same after sending message');

      const userMessage = sendResult.userMessage;
      this.assert(userMessage.chatSessionId === chatSession.id, 'User message should be linked to chat session');
      this.assert(userMessage.senderType === 'user', 'User message senderType should be user');
      this.assert(userMessage.messageText === messageText, 'User message text should match the sent text');

      // Bot reply (if present) should be linked to the same session
      if (sendResult.botReply) {
        this.assert(sendResult.botReply.chatSessionId === chatSession.id, 'Bot reply should be linked to same chat session');
        this.assert(sendResult.botReply.senderType === 'bot' || sendResult.botReply.senderType === 'agent', 'Bot reply senderType should be bot or agent');
      }

      // Verify chat data persistence
      const chatSessions = JSON.parse(localStorage.getItem('chat_sessions') || '[]');
      const storedSession = chatSessions.find((s) => s.id === chatSession.id);
      this.assert(!!storedSession, 'Chat session should be persisted in localStorage');
      this.assert(storedSession.source === 'faq_page', 'Stored chat session source should be faq_page');

      const chatMessages = JSON.parse(localStorage.getItem('chat_messages') || '[]');
      const storedUserMessage = chatMessages.find((m) => m.id === userMessage.id);
      this.assert(!!storedUserMessage, 'User chat message should be persisted in localStorage');
      this.assert(storedUserMessage.messageText === messageText, 'Stored user message text should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper methods
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('\u2713 ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
