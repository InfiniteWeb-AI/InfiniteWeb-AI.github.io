class TestRunner {
  constructor(businessLogic) {
    // Simple localStorage polyfill for Node.js
    if (typeof localStorage === 'undefined') {
      global.localStorage = {
        _data: {},
        setItem(key, value) { this._data[key] = String(value); },
        getItem(key) { return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null; },
        removeItem(key) { delete this._data[key]; },
        clear() { this._data = {}; }
      };
    }

    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    localStorage.clear();
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data from prompt (used ONLY here) ---------------------------------
    const generatedData = {
      faq_articles: [
        {
          id: 'faq_30_day_money_back_guarantee',
          question: 'What is your 30-day money-back guarantee?',
          answer: `We want you to feel confident getting started with your work-from-home business. That’s why we offer a 30-day money-back guarantee on all core programs and starter plans.

Here’s how it works:
- The 30-day period begins on the date of your purchase.
- If you decide the program isn’t right for you within those 30 days, contact our support team and request a refund.
- We may ask a few brief questions about your experience so we can improve, but your refund is not conditional on completing any specific assignments.
- Refunds are typically processed within 5–7 business days back to your original payment method.

Exceptions:
- One-on-one coaching sessions that have already been delivered are non-refundable.
- Any third-party tools, software, or services you purchase outside of our platform are not covered.

If you still have questions or want to confirm whether a specific plan is covered, use the "Contact support" link below and our billing team will be happy to help.`,
          slug: '30-day-money-back-guarantee',
          category: 'billing_refunds',
          tags: [
            'refund',
            'money-back guarantee',
            '30-day guarantee',
            'billing',
            'cancellation'
          ],
          guarantee_period_days: 30,
          has_contact_support_link: true,
          created_at: '2025-10-15T10:00:00Z',
          updated_at: '2026-01-10T09:30:00Z'
        },
        {
          id: 'faq_how_to_get_started',
          question: 'How do I get started with the work-from-home program?',
          answer: `You can get started in three simple steps:

1. Choose a starter plan on the Plans & Pricing page that matches your budget and support needs.
2. Complete the short application so we can understand your goals and recommended track.
3. Check your email for login details and follow the "Week 1" onboarding checklist.

Most members complete onboarding in under 60 minutes and book their first coaching session within the first week.`,
          slug: 'how-to-get-started',
          category: 'getting_started',
          tags: [
            'getting started',
            'onboarding',
            'new members'
          ],
          has_contact_support_link: true,
          created_at: '2025-09-01T14:20:00Z',
          updated_at: '2026-01-05T11:05:00Z'
        },
        {
          id: 'faq_billing_how_refunds_work',
          question: 'How do refunds and cancellations work?',
          answer: `You can cancel any recurring subscription from your account settings at any time. When you cancel, you will retain access until the end of your current billing period.

If you are within the 30-day money-back guarantee window for an eligible purchase, you may request a refund by contacting support and including your order number. Once approved, refunds are typically processed within 5–7 business days.

Please note that any bonuses, templates, or downloads you’ve already redeemed may not be available after a refund is issued.`,
          slug: 'how-refunds-and-cancellations-work',
          category: 'billing_refunds',
          tags: [
            'refund',
            'cancellation',
            'billing',
            'subscription'
          ],
          guarantee_period_days: 30,
          has_contact_support_link: true,
          created_at: '2025-11-02T16:45:00Z',
          updated_at: '2026-02-20T08:55:00Z'
        }
      ],
      plans: [
        {
          id: 'plan_quickstart_89',
          name: 'Quickstart Coaching Lite',
          slug: 'quickstart-coaching-lite',
          short_label: 'Quickstart Lite',
          description: 'Entry-level work-from-home starter plan with focused training and a dedicated kick-off coaching call.',
          price: 89,
          currency: 'usd',
          is_starter_plan: true,
          includes_one_on_one_coaching: true,
          training_modules_count: 5,
          training_modules_titles: [
            'Mindset & Time Blocking',
            'Choosing Your First Offer',
            'Simple Online Funnel Setup',
            'Getting Your First 10 Leads',
            'Weekly Action Planning'
          ],
          highlighted_features: [
            '1 x 30-minute 1-on-1 kickoff call',
            '5 core implementation modules',
            'Email support for 30 days',
            'Access on desktop and mobile'
          ],
          status: 'active',
          created_at: '2025-11-10T09:00:00Z',
          updated_at: '2026-02-28T10:15:00Z'
        },
        {
          id: 'plan_quickstart_129',
          name: 'Quickstart Coaching Plus',
          slug: 'quickstart-coaching-plus',
          short_label: 'Quickstart Plus',
          description: 'Starter plan with extra accountability and deeper training for launching your first work-from-home offer.',
          price: 129,
          currency: 'usd',
          is_starter_plan: true,
          includes_one_on_one_coaching: true,
          training_modules_count: 6,
          training_modules_titles: [
            'Clarity & Goal Setting',
            'Offer Design Workshop',
            'Messaging & Simple Sales Pages',
            'Lead Generation Fundamentals',
            'Follow-Up & Nurture Sequences',
            '90-Day Launch Roadmap'
          ],
          highlighted_features: [
            '2 x 30-minute 1-on-1 coaching calls',
            '6 step-by-step training modules',
            'Private community access for 60 days',
            'Downloadable scripts and templates'
          ],
          status: 'active',
          created_at: '2025-10-25T11:30:00Z',
          updated_at: '2026-02-20T14:45:00Z'
        },
        {
          id: 'plan_quickstart_149',
          name: 'Quickstart Coaching Pro',
          slug: 'quickstart-coaching-pro',
          short_label: 'Quickstart Pro',
          description: 'Our most complete starter plan under $150, combining 1-on-1 coaching, group Q&A, and a full implementation curriculum.',
          price: 149,
          currency: 'usd',
          is_starter_plan: true,
          includes_one_on_one_coaching: true,
          training_modules_count: 8,
          training_modules_titles: [
            'Finding Your Profitable Niche',
            'Designing Your Signature Offer',
            'Creating a Simple Sales Page',
            'Lead Magnet & List Building',
            'Email Follow-Up Blueprint',
            'Social Media Foundations',
            'Client Onboarding Systems',
            '30-Day Launch Action Plan'
          ],
          highlighted_features: [
            '3 x 30-minute 1-on-1 coaching calls',
            'Weekly live group Q&A',
            'Full 8-module implementation track',
            'Templates for emails, posts, and funnels'
          ],
          status: 'active',
          created_at: '2025-12-01T13:15:00Z',
          updated_at: '2026-02-18T09:20:00Z'
        }
      ],
      programs: [
        {
          id: 'program_email_freedom_builder',
          name: 'Email Freedom Builder',
          slug: 'email-freedom-builder',
          tagline: 'Build a simple, email-first business from home.',
          description: 'Learn how to create and sell a simple offer using nothing but email. Perfect for introverts and those who prefer writing over video.',
          time_commitment_hours_per_week_min: 5,
          time_commitment_hours_per_week_max: 8,
          includes_live_group_sessions: true,
          live_sessions_per_month: 3,
          average_monthly_earnings: 3500,
          focus_area: 'Email Marketing',
          level: 'beginner',
          status: 'active',
          created_at: '2025-09-10T10:00:00Z',
          updated_at: '2026-02-24T09:30:00Z'
        },
        {
          id: 'program_affiliate_authority_sprint',
          name: 'Affiliate Authority Sprint',
          slug: 'affiliate-authority-sprint',
          tagline: 'Promote high-converting offers in just a few focused hours per week.',
          description: 'Step-by-step system for building an affiliate income stream through curated recommendations, simple funnels, and consistent content.',
          time_commitment_hours_per_week_min: 6,
          time_commitment_hours_per_week_max: 10,
          includes_live_group_sessions: true,
          live_sessions_per_month: 4,
          average_monthly_earnings: 4200,
          focus_area: 'Affiliate Sales',
          level: 'beginner',
          status: 'active',
          created_at: '2025-10-01T11:20:00Z',
          updated_at: '2026-02-26T14:10:00Z'
        },
        {
          id: 'program_social_content_mini_studio',
          name: 'Social Content Mini-Studio',
          slug: 'social-content-mini-studio',
          tagline: 'Turn short-form content into consistent clients.',
          description: 'Learn how to batch-create social content, drive followers to your offers, and convert them into paying clients with a simple DM and email process.',
          time_commitment_hours_per_week_min: 4,
          time_commitment_hours_per_week_max: 9,
          includes_live_group_sessions: true,
          live_sessions_per_month: 3,
          average_monthly_earnings: 2800,
          focus_area: 'Social Media Strategy',
          level: 'beginner',
          status: 'active',
          created_at: '2025-09-20T13:45:00Z',
          updated_at: '2026-02-19T16:00:00Z'
        }
      ],
      webinars: [
        {
          id: 'webinar_intro_20260304_1900',
          title: 'Work-From-Home Getting Started Overview',
          subtitle: 'How to launch your first income stream in the next 30 days',
          description: 'In this introductory overview, we’ll walk through the core building blocks of a simple work-from-home business, show real-world examples, and outline a 30-day action plan you can follow.',
          topic_type: 'getting_started_overview',
          start_datetime: '2026-03-04T19:00:00Z',
          end_datetime: '2026-03-04T20:00:00Z',
          duration_minutes: 60,
          time_of_day: 'evening',
          time_zone: 'us_eastern',
          presenter_name: 'Dana Collins',
          max_attendees: 300,
          status: 'scheduled',
          created_at: '2026-02-20T12:00:00Z',
          updated_at: '2026-03-01T09:15:00Z'
        },
        {
          id: 'webinar_intro_20260307_1800',
          title: 'Introductory Overview: Earning Your First $500 From Home',
          subtitle: 'A simple path for beginners with limited time',
          description: 'Learn the key steps to earning your first $500 online, including choosing a profitable idea, getting your first leads, and avoiding common beginner mistakes.',
          topic_type: 'introductory_overview',
          start_datetime: '2026-03-07T18:00:00Z',
          end_datetime: '2026-03-07T19:00:00Z',
          duration_minutes: 60,
          time_of_day: 'evening',
          time_zone: 'us_eastern',
          presenter_name: 'Marcus Lee',
          max_attendees: 250,
          status: 'scheduled',
          created_at: '2026-02-18T10:30:00Z',
          updated_at: '2026-02-28T16:45:00Z'
        },
        {
          id: 'webinar_intro_20260309_2000',
          title: 'Getting Started Overview: Part-Time Path to $2K/Month',
          subtitle: 'Build a part-time friendly business from home',
          description: 'This webinar is ideal if you can only commit 10–20 hours per week. We’ll show you a realistic path to $2k/month with examples from real students.',
          topic_type: 'getting_started_overview',
          start_datetime: '2026-03-09T20:00:00Z',
          end_datetime: '2026-03-09T21:00:00Z',
          duration_minutes: 60,
          time_of_day: 'evening',
          time_zone: 'us_eastern',
          presenter_name: 'Sarah Nguyen',
          max_attendees: 300,
          status: 'scheduled',
          created_at: '2026-02-22T14:10:00Z',
          updated_at: '2026-03-01T09:20:00Z'
        }
      ],
      success_stories: [
        {
          id: 'success_parent_lena_2700',
          title: 'From Naptime Experiments to a Steady $2,700/Month',
          person_name: 'Lena',
          headline: 'Busy mom of two builds an email-based side business working 22–28 hours per week',
          lifestyle: 'parents',
          monthly_earnings: 2700,
          hours_per_week_min: 22,
          hours_per_week_max: 28,
          story_date: '2026-02-26T10:00:00Z',
          summary: 'Lena, a former teacher and mom of two, used the Email Freedom Builder program and the Side Hustle Builder plan to create a simple email-based service that now brings in around $2,700 each month.',
          content: `When Lena left her full-time teaching job to be home with her two kids, she knew she still wanted to contribute financially. The problem was that traditional part-time work didn’t fit around school pickups and a toddler who refused to nap on schedule.

She discovered our Email Freedom Builder program and enrolled using the Side Hustle Builder plan. For the first two weeks, she focused on the step-by-step modules: clarifying her offer, writing her first 7-day email sequence, and setting up a simple landing page. She scheduled all of this between 9–11am and a few evenings after bedtime.

By week four, Lena had her first three paying clients for a done-for-you email welcome series. Within three months, she was averaging $2,700 per month in revenue, working between 22–28 hours per week. She keeps Mondays and Fridays mostly free for family time and batches her client work on Tuesdays–Thursdays.

“Knowing exactly what to do with the hours I do have has been life-changing,” Lena says. “I’m present with my kids, and I still feel like I have a career I’m proud of.”`,
          associated_program_id: 'program_email_freedom_builder',
          associated_plan_id: 'plan_side_hustle_139',
          image_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=600&fit=crop&auto=format&q=80',
          is_featured: true
        },
        {
          id: 'success_parent_michael_3200',
          title: 'Side-Hustle Dad Replaces Car Payment in 60 Days',
          person_name: 'Michael',
          headline: 'Parent of three earns around $3,200/month promoting affiliate offers in 20–25 hours per week',
          lifestyle: 'parents',
          monthly_earnings: 3200,
          hours_per_week_min: 20,
          hours_per_week_max: 25,
          story_date: '2026-02-15T09:30:00Z',
          summary: 'Michael used the Affiliate Authority Sprint program and a Quickstart Pro plan to turn product recommendations into a consistent affiliate income stream that covers his family’s car payment and daycare bill.',
          content: `Michael works full time in IT and has three kids under ten. When unexpected daycare costs hit, he needed a flexible way to earn more without sacrificing evenings and weekends with his family.

He joined our Affiliate Authority Sprint program through the Quickstart Coaching Pro plan. In his first week, he used the coaching calls to narrow down a profitable niche: tools and software for remote workers. He followed the program’s templates to create a simple review newsletter and a one-page “tools we actually use” guide.

For the first month, Michael committed 20–25 hours per week, mostly in the early mornings before the kids were up. He focused on publishing one useful piece of content per week and building his email list.

After 60 days, his affiliate commissions averaged about $3,200 per month. “We paid off a car loan early, and now that money goes straight to our savings,” he explains. “The structure of the sprint and having clear weekly targets made it possible to fit this around family life.”`,
          associated_program_id: 'program_affiliate_authority_sprint',
          associated_plan_id: 'plan_quickstart_149',
          image_url: 'https://simplifyingfamily.com/wp-content/uploads/2020/05/online-side-hustles-work-from-home.jpg',
          is_featured: true
        },
        {
          id: 'success_parent_alejandra_4100',
          title: 'From Burned-Out Manager to Flexible Email Strategist',
          person_name: 'Alejandra',
          headline: 'Single mom transitions from corporate to earning $4,100/month working 25–30 hours weekly',
          lifestyle: 'parents',
          monthly_earnings: 4100,
          hours_per_week_min: 25,
          hours_per_week_max: 30,
          story_date: '2025-12-10T14:15:00Z',
          summary: 'Alejandra left a stressful management role and used our programs to build a client roster as an email marketing strategist, hitting roughly $4,100/month within six months.',
          content: `Alejandra spent a decade as a retail store manager before deciding the schedule was no longer compatible with raising her eight-year-old daughter on her own. She needed something more flexible, but she worried about giving up a stable paycheck.

She started with the Quickstart Coaching Plus plan and the Email Freedom Builder program. With guidance from her coach, she positioned herself as an “on-demand email strategist” for local service businesses. The training modules helped her design a clear offer, write persuasive email sequences, and price her packages confidently.

For the first three months, she devoted 25–30 hours per week, mostly during school hours. By month four, Alejandra had signed four recurring clients and was averaging $4,100 in monthly revenue. She now schedules all calls between 10am and 2pm and never misses school events.

“My daughter noticed first,” she says. “She said, ‘You’re not tired all the time anymore.’ That alone made the transition worth it—$4,000 a month is just the bonus.”`,
          associated_program_id: 'program_email_freedom_builder',
          associated_plan_id: 'plan_quickstart_129',
          image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop&auto=format&q=80',
          is_featured: false
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:10:41.092259'
      }
    };

    // Persist initial data to localStorage using storage keys
    localStorage.setItem('faq_articles', JSON.stringify(generatedData.faq_articles));
    localStorage.setItem('plans', JSON.stringify(generatedData.plans));
    localStorage.setItem('programs', JSON.stringify(generatedData.programs));
    localStorage.setItem('webinars', JSON.stringify(generatedData.webinars));
    localStorage.setItem('success_stories', JSON.stringify(generatedData.success_stories));
    // No initial records for these collections
    localStorage.setItem('plan_signups', JSON.stringify([]));
    localStorage.setItem('webinar_registrations', JSON.stringify([]));
    localStorage.setItem('earnings_plans', JSON.stringify([]));
    localStorage.setItem('program_favorites', JSON.stringify([]));
    localStorage.setItem('story_bookmarks', JSON.stringify([]));
    localStorage.setItem('applications', JSON.stringify([]));
    localStorage.setItem('newsletter_subscriptions', JSON.stringify([]));
    localStorage.setItem('contact_messages', JSON.stringify([]));
  }

  // Run all tests --------------------------------------------------------------
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SelectCheapestStarterPlanUnder150WithCoaching();
    this.testTask2_RegisterEarliestEveningIntroWebinarNext14Days();
    this.testTask3_CreateAndSaveEarningsPlanAtLeast2000PerMonth();
    this.testTask4_ChooseHighestEarningProgramUnder10HoursWith3PlusLive();
    this.testTask5_SaveMostRecentParentSuccessStory2500Plus_20to30Hours();
    this.testTask6_SubmitPartTimeApplicationBudget300StartingApril1_2026();
    this.testTask7_SubscribeWeeklyNewsletterEmailAndSocial();
    this.testTask8_AskSupportExtend30DayGuaranteeTo60Days();

    return this.results;
  }

  // Task 1 --------------------------------------------------------------------
  testTask1_SelectCheapestStarterPlanUnder150WithCoaching() {
    const testName = 'Task 1: Select cheapest starter plan < $150 with 1-on-1 coaching & 5+ modules';
    console.log('Running:', testName);

    try {
      const maxPrice = 150;
      const includesOneOnOneCoaching = true;
      const minTrainingModulesCount = 5;
      const onlyStarterPlans = true;
      const sortBy = 'price_low_to_high';

      const plans = this.logic.searchStarterPlans(
        maxPrice,
        includesOneOnOneCoaching,
        minTrainingModulesCount,
        onlyStarterPlans,
        sortBy
      );

      this.assert(Array.isArray(plans) && plans.length > 0, 'Should return at least one starter plan');

      const selectedPlan = plans[0];

      // Validate selected plan meets filter criteria based on actual data
      this.assert(selectedPlan.price <= maxPrice, 'Selected plan price should be <= maxPrice');
      this.assert(selectedPlan.includes_one_on_one_coaching === true, 'Selected plan should include 1-on-1 coaching');
      this.assert(selectedPlan.training_modules_count >= minTrainingModulesCount, 'Selected plan should have >= minimum modules');

      // Fetch plan details using actual plan id
      const planDetailsResult = this.logic.getPlanDetails(selectedPlan.id);
      this.assert(planDetailsResult && planDetailsResult.plan, 'Plan details should be returned');
      this.assert(planDetailsResult.plan.id === selectedPlan.id, 'Plan details id should match selected plan id');

      // Submit plan signup with actual plan id
      const name = 'Alex Rivera';
      const email = 'alex@example.com';
      const signupResult = this.logic.submitPlanSignup(selectedPlan.id, name, email);

      this.assert(signupResult && signupResult.success === true, 'Plan signup should succeed');
      this.assert(signupResult.planSignup, 'planSignup object should be returned');

      const signup = signupResult.planSignup;
      this.assert(signup.plan_id === selectedPlan.id, 'Signup.plan_id should match selected plan id');
      this.assert(signup.plan_name_snapshot === selectedPlan.name, 'Signup plan_name_snapshot should match plan name');
      this.assert(signup.name === name, 'Signup name should match input');
      this.assert(signup.email === email, 'Signup email should match input');

      // Verify persistence via storage
      const storedSignups = JSON.parse(localStorage.getItem('plan_signups') || '[]');
      const stored = storedSignups.find(s => s.id === signup.id);
      this.assert(!!stored, 'Signup should be persisted in storage');
      this.assert(stored.plan_id === selectedPlan.id, 'Stored signup plan_id should match');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 2 --------------------------------------------------------------------
  testTask2_RegisterEarliestEveningIntroWebinarNext14Days() {
    const testName = 'Task 2: Register for earliest evening intro webinar in next 14 days';
    console.log('Running:', testName);

    try {
      // Compute date range for next 14 days from now
      const now = new Date();
      const startDate = now.toISOString();
      const end = new Date(now.getTime());
      end.setDate(end.getDate() + 14);
      const endDate = end.toISOString();

      const timeOfDay = 'evening';
      const topicTypes = ['introductory_overview', 'getting_started_overview'];
      const sortBy = 'earliest_date_first';

      const webinars = this.logic.searchWebinars(
        startDate,
        endDate,
        timeOfDay,
        topicTypes,
        sortBy
      );

      this.assert(Array.isArray(webinars) && webinars.length > 0, 'Should find at least one matching webinar');

      const selectedWebinar = webinars[0];

      // Basic sanity checks on selected webinar
      this.assert(selectedWebinar.time_of_day === 'evening', 'Selected webinar should be in the evening');
      this.assert(
        topicTypes.indexOf(selectedWebinar.topic_type) !== -1,
        'Selected webinar topic_type should be one of the introductory types'
      );

      // Get details for the selected webinar
      const webinarDetailsResult = this.logic.getWebinarDetails(selectedWebinar.id);
      this.assert(webinarDetailsResult && webinarDetailsResult.webinar, 'Webinar details should be returned');
      this.assert(webinarDetailsResult.webinar.id === selectedWebinar.id, 'Webinar details id should match selection');

      // Register for the webinar
      const name = 'Pat Morgan';
      const email = 'pat@example.com';
      const selectedTimeZone = 'us_eastern';
      const reminderPreference = 'email_only';

      const registrationResult = this.logic.registerForWebinar(
        selectedWebinar.id,
        name,
        email,
        selectedTimeZone,
        reminderPreference
      );

      this.assert(registrationResult && registrationResult.success === true, 'Webinar registration should succeed');
      this.assert(registrationResult.registration, 'Registration object should be returned');

      const reg = registrationResult.registration;
      this.assert(reg.webinar_id === selectedWebinar.id, 'Registration webinar_id should match selected webinar id');
      this.assert(reg.webinar_title_snapshot === selectedWebinar.title, 'Title snapshot should match webinar title');
      this.assert(reg.name === name, 'Registration name should match input');
      this.assert(reg.email === email, 'Registration email should match input');
      this.assert(reg.selected_time_zone === selectedTimeZone, 'Selected time zone should match input');
      this.assert(reg.reminder_preference === reminderPreference, 'Reminder preference should match input');

      // Verify persisted registration
      const storedRegs = JSON.parse(localStorage.getItem('webinar_registrations') || '[]');
      const stored = storedRegs.find(r => r.id === reg.id);
      this.assert(!!stored, 'Registration should be persisted in storage');
      this.assert(stored.webinar_id === selectedWebinar.id, 'Stored registration webinar_id should match');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 3 --------------------------------------------------------------------
  testTask3_CreateAndSaveEarningsPlanAtLeast2000PerMonth() {
    const testName = 'Task 3: Create and save earnings plan targeting >= $2,000/month';
    console.log('Running:', testName);

    try {
      // Optionally get calculator defaults (not strictly required for flow)
      const defaults = this.logic.getEarningsCalculatorDefaults();
      this.assert(defaults && typeof defaults.defaultHoursPerWeek === 'number', 'Should return calculator defaults');

      const hoursPerWeek = 20;
      const averageSaleValue = 200;
      const monthlyLeads = 50;
      const conversionRatePercent = 20;
      const goalMonthlyIncomeTarget = 2000;

      const estimateResult = this.logic.calculateEarningsEstimate(
        hoursPerWeek,
        averageSaleValue,
        monthlyLeads,
        conversionRatePercent,
        goalMonthlyIncomeTarget
      );

      this.assert(estimateResult, 'Estimate result should be returned');
      this.assert(estimateResult.estimatedMonthlyIncome > 0, 'Estimated monthly income should be positive');
      this.assert(
        estimateResult.goalMonthlyIncomeTarget === goalMonthlyIncomeTarget,
        'Goal target in result should echo input target'
      );

      // Save the plan using the same configuration
      const name = 'Jordan Lee';
      const email = 'planner@example.com';

      const saveResult = this.logic.saveEarningsPlan(
        name,
        email,
        hoursPerWeek,
        averageSaleValue,
        monthlyLeads,
        conversionRatePercent,
        goalMonthlyIncomeTarget
      );

      this.assert(saveResult && saveResult.success === true, 'Saving earnings plan should succeed');
      this.assert(saveResult.earningsPlan, 'earningsPlan object should be returned');

      const plan = saveResult.earningsPlan;
      this.assert(plan.name === name, 'Saved plan name should match input');
      this.assert(plan.email === email, 'Saved plan email should match input');
      this.assert(plan.hours_per_week === hoursPerWeek, 'Saved hours_per_week should match input');
      this.assert(plan.average_sale_value === averageSaleValue, 'Saved average_sale_value should match input');
      this.assert(plan.monthly_leads === monthlyLeads, 'Saved monthly_leads should match input');
      this.assert(plan.conversion_rate_percent === conversionRatePercent, 'Saved conversion_rate_percent should match input');
      if (typeof plan.goal_monthly_income_target === 'number') {
        this.assert(
          plan.goal_monthly_income_target === goalMonthlyIncomeTarget,
          'Saved goal_monthly_income_target should match input'
        );
      }

      // Verify persistence
      const storedPlans = JSON.parse(localStorage.getItem('earnings_plans') || '[]');
      const stored = storedPlans.find(p => p.id === plan.id);
      this.assert(!!stored, 'Earnings plan should be persisted in storage');
      this.assert(stored.hours_per_week === hoursPerWeek, 'Stored plan hours_per_week should match');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 4 --------------------------------------------------------------------
  testTask4_ChooseHighestEarningProgramUnder10HoursWith3PlusLive() {
    const testName = 'Task 4: Choose highest-earning program under 10 hours/week with 3+ live sessions';
    console.log('Running:', testName);

    try {
      const maxHoursPerWeek = 10;
      const includesLiveGroupSessions = true;
      const minLiveSessionsPerMonth = 3;
      const sortBy = 'average_monthly_earnings_high_to_low';

      const programs = this.logic.searchPrograms(
        maxHoursPerWeek,
        includesLiveGroupSessions,
        minLiveSessionsPerMonth,
        sortBy
      );

      this.assert(Array.isArray(programs) && programs.length > 0, 'Should return at least one qualifying program');

      const selectedProgram = programs[0];

      // Validate time commitment and live sessions based on actual data
      this.assert(
        selectedProgram.time_commitment_hours_per_week_max <= maxHoursPerWeek,
        'Selected program should require up to maxHoursPerWeek'
      );
      this.assert(
        selectedProgram.includes_live_group_sessions === true,
        'Selected program should include live group sessions'
      );
      this.assert(
        selectedProgram.live_sessions_per_month >= minLiveSessionsPerMonth,
        'Selected program should have at least min live sessions per month'
      );

      // Ensure descending earnings order
      for (let i = 1; i < programs.length; i++) {
        this.assert(
          selectedProgram.average_monthly_earnings >= programs[i].average_monthly_earnings,
          'First program should have earnings >= subsequent programs'
        );
      }

      // Get program details
      const detailsResult = this.logic.getProgramDetails(selectedProgram.id);
      this.assert(detailsResult && detailsResult.program, 'Program details should be returned');
      this.assert(detailsResult.program.id === selectedProgram.id, 'Details program id should match selection');

      // Favorite program with lightweight account
      const name = 'Riley Chen';
      const email = 'riley@example.com';
      const password = 'DemoPass123';

      const favoriteResult = this.logic.favoriteProgramWithAccount(
        selectedProgram.id,
        name,
        email,
        password
      );

      this.assert(favoriteResult && favoriteResult.success === true, 'Favoriting program should succeed');
      this.assert(favoriteResult.programFavorite, 'programFavorite object should be returned');

      const favorite = favoriteResult.programFavorite;
      this.assert(favorite.program_id === selectedProgram.id, 'Favorite program_id should match selected program id');
      this.assert(favorite.program_name_snapshot === selectedProgram.name, 'Favorite name snapshot should match program name');
      this.assert(favorite.name === name, 'Favorite account name should match input');
      this.assert(favorite.email === email, 'Favorite account email should match input');

      // Verify persistence
      const storedFavorites = JSON.parse(localStorage.getItem('program_favorites') || '[]');
      const stored = storedFavorites.find(f => f.id === favorite.id);
      this.assert(!!stored, 'Program favorite should be persisted in storage');
      this.assert(stored.program_id === selectedProgram.id, 'Stored favorite program_id should match');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 5 --------------------------------------------------------------------
  testTask5_SaveMostRecentParentSuccessStory2500Plus_20to30Hours() {
    const testName = 'Task 5: Save most recent parent success story $2,500+ working 20–30 hours/week';
    console.log('Running:', testName);

    try {
      const lifestyle = 'parents';
      const minMonthlyEarnings = 2500;
      const minHoursPerWeek = 20;
      const maxHoursPerWeek = 30;
      const sortBy = 'most_recent';

      const stories = this.logic.searchSuccessStories(
        lifestyle,
        minMonthlyEarnings,
        minHoursPerWeek,
        maxHoursPerWeek,
        sortBy
      );

      this.assert(Array.isArray(stories) && stories.length > 0, 'Should find at least one matching success story');

      const selectedStory = stories[0];

      // Validate filters using actual data
      this.assert(selectedStory.lifestyle === lifestyle, 'Selected story lifestyle should match filter');
      this.assert(selectedStory.monthly_earnings >= minMonthlyEarnings, 'Selected story earnings should meet minimum');
      this.assert(
        selectedStory.hours_per_week_min >= minHoursPerWeek &&
          selectedStory.hours_per_week_max <= maxHoursPerWeek,
        'Selected story hours range should fall within filter range'
      );

      // Get story details
      const storyDetailsResult = this.logic.getSuccessStoryDetails(selectedStory.id);
      this.assert(storyDetailsResult && storyDetailsResult.story, 'Story details should be returned');
      this.assert(storyDetailsResult.story.id === selectedStory.id, 'Details story id should match selection');

      // Bookmark as guest
      const email = 'reader@example.com';
      const bookmarkResult = this.logic.bookmarkStoryAsGuest(selectedStory.id, email);

      this.assert(bookmarkResult && bookmarkResult.success === true, 'Bookmarking story should succeed');
      this.assert(bookmarkResult.bookmark, 'Bookmark object should be returned');

      const bookmark = bookmarkResult.bookmark;
      this.assert(bookmark.story_id === selectedStory.id, 'Bookmark story_id should match selected story');
      this.assert(bookmark.email === email, 'Bookmark email should match input');

      // Verify persistence
      const storedBookmarks = JSON.parse(localStorage.getItem('story_bookmarks') || '[]');
      const stored = storedBookmarks.find(b => b.id === bookmark.id);
      this.assert(!!stored, 'Story bookmark should be persisted in storage');
      this.assert(stored.story_id === selectedStory.id, 'Stored bookmark story_id should match');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 6 --------------------------------------------------------------------
  testTask6_SubmitPartTimeApplicationBudget300StartingApril1_2026() {
    const testName = 'Task 6: Submit part-time application with $300 budget starting 2026-04-01';
    console.log('Running:', testName);

    try {
      // Optionally fetch form options
      const formOptions = this.logic.getApplicationFormOptions();
      this.assert(formOptions && Array.isArray(formOptions.availabilityOptions), 'Application form options should be returned');

      const availability = 'part_time_10_20';
      const monthlyBudget = 300;
      const preferredStartDate = '2026-04-01T00:00:00.000Z';
      const areasOfInterest = ['email_marketing', 'affiliate_sales'];
      const fullName = 'Taylor Morgan';
      const email = 'taylor@example.com';
      const phone = '5551237890';
      const biggestGoalText = 'I want to replace at least half of my current income within 12 months.';
      const acceptedTerms = true;

      const applicationResult = this.logic.submitApplication(
        availability,
        monthlyBudget,
        preferredStartDate,
        areasOfInterest,
        fullName,
        email,
        phone,
        biggestGoalText,
        acceptedTerms
      );

      this.assert(applicationResult && applicationResult.success === true, 'Application submission should succeed');
      this.assert(applicationResult.application, 'Application object should be returned');

      const app = applicationResult.application;
      this.assert(app.availability === availability, 'Application availability should match input');
      this.assert(app.monthly_budget === monthlyBudget, 'Application monthly_budget should match input');
      this.assert(typeof app.preferred_start_date === 'string', 'Application preferred_start_date should be set');
      this.assert(Array.isArray(app.areas_of_interest), 'Application areas_of_interest should be an array');
      this.assert(app.areas_of_interest.length === areasOfInterest.length, 'Application should have exactly two areas of interest');
      this.assert(app.full_name === fullName, 'Application full_name should match input');
      this.assert(app.email === email, 'Application email should match input');
      this.assert(app.phone === phone, 'Application phone should match input');
      this.assert(app.biggest_goal_text === biggestGoalText, 'Application biggest_goal_text should match input');
      this.assert(app.accepted_terms === true, 'Application must have accepted_terms true');

      // Verify persistence
      const storedApps = JSON.parse(localStorage.getItem('applications') || '[]');
      const stored = storedApps.find(a => a.id === app.id);
      this.assert(!!stored, 'Application should be persisted in storage');
      this.assert(stored.availability === availability, 'Stored application availability should match');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 7 --------------------------------------------------------------------
  testTask7_SubscribeWeeklyNewsletterEmailAndSocial() {
    const testName = 'Task 7: Subscribe to weekly newsletter for Email Marketing and Social Media Strategy';
    console.log('Running:', testName);

    try {
      // Get preference options
      const prefOptions = this.logic.getNewsletterPreferenceOptions();
      this.assert(prefOptions && Array.isArray(prefOptions.frequencyOptions), 'Newsletter preference options should be returned');

      const email = 'subscriber@example.com';
      const firstName = 'Morgan';
      const frequency = 'weekly_summary';
      const topics = ['email_marketing', 'social_media_strategy'];
      const bestTimeToReceive = 'morning_8_10';
      const contentTypes = ['tips_tutorials']; // Product announcements unchecked

      const subscriptionResult = this.logic.saveNewsletterSubscription(
        email,
        firstName,
        frequency,
        topics,
        bestTimeToReceive,
        contentTypes
      );

      this.assert(subscriptionResult && subscriptionResult.success === true, 'Newsletter subscription should succeed');
      this.assert(subscriptionResult.subscription, 'Subscription object should be returned');

      const sub = subscriptionResult.subscription;
      this.assert(sub.email === email, 'Subscription email should match input');
      this.assert(sub.first_name === firstName || sub.first_name === undefined || sub.first_name === null, 'First name should match input if stored');
      this.assert(sub.frequency === frequency, 'Subscription frequency should match input');
      this.assert(Array.isArray(sub.topics), 'Subscription topics should be an array');
      this.assert(sub.topics.length === topics.length, 'Subscription should have exactly two topics');
      this.assert(sub.best_time_to_receive === bestTimeToReceive, 'Subscription best_time_to_receive should match input');
      this.assert(Array.isArray(sub.content_types), 'Subscription content_types should be an array');

      // Verify persistence
      const storedSubs = JSON.parse(localStorage.getItem('newsletter_subscriptions') || '[]');
      const stored = storedSubs.find(s => s.id === sub.id);
      this.assert(!!stored, 'Newsletter subscription should be persisted in storage');
      this.assert(stored.email === email, 'Stored subscription email should match');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 8 --------------------------------------------------------------------
  testTask8_AskSupportExtend30DayGuaranteeTo60Days() {
    const testName = 'Task 8: Ask support about extending 30-day money-back guarantee to 60 days';
    console.log('Running:', testName);

    try {
      const query = 'refund';
      const faqResults = this.logic.searchFAQArticles(query);

      this.assert(Array.isArray(faqResults) && faqResults.length > 0, 'FAQ search should return at least one article');

      // Find the specific 30-day money-back guarantee article if present
      let selectedFaq = faqResults.find(a =>
        typeof a.question === 'string' &&
        a.question.toLowerCase().indexOf('30-day money-back guarantee') !== -1
      );

      if (!selectedFaq) {
        // Fallback to first result if exact match not found
        selectedFaq = faqResults[0];
      }

      this.assert(!!selectedFaq, 'A FAQ article should be selected');

      // Get article details
      const faqDetails = this.logic.getFAQArticleDetails(selectedFaq.id);
      this.assert(faqDetails && faqDetails.id === selectedFaq.id, 'FAQ details id should match selected article');

      // Submit contact message about extending guarantee
      const topic = 'billing_refunds';
      const subject = 'Question about extending 30-day guarantee.';
      const message = 'I see that you offer a 30-day money-back guarantee. Is it possible to extend this guarantee to 60 days for the work-from-home program I am considering?';
      const name = 'Jamie Lee';
      const email = 'jamie@example.com';

      const contactResult = this.logic.submitContactMessage(
        topic,
        subject,
        message,
        name,
        email
      );

      this.assert(contactResult && contactResult.success === true, 'Contact message submission should succeed');
      this.assert(contactResult.contactMessage, 'contactMessage object should be returned');

      const cm = contactResult.contactMessage;
      this.assert(cm.topic === topic, 'Contact message topic should match input');
      this.assert(cm.subject === subject, 'Contact message subject should match input');
      this.assert(cm.message === message, 'Contact message body should match input');
      this.assert(cm.name === name, 'Contact message name should match input');
      this.assert(cm.email === email, 'Contact message email should match input');

      // Verify persistence
      const storedMessages = JSON.parse(localStorage.getItem('contact_messages') || '[]');
      const stored = storedMessages.find(m => m.id === cm.id);
      this.assert(!!stored, 'Contact message should be persisted in storage');
      this.assert(stored.topic === topic, 'Stored contact message topic should match');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Helper methods -----------------------------------------------------------
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('✓ ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗ ' + testName + ': ' + error.message);
  }
}

module.exports = TestRunner;
