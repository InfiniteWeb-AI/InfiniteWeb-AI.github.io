// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      "blog_articles": [
        {
          "id": "ba_productivity_routines",
          "title": "Designing Your 90-Minute Productivity Sprint",
          "slug": "designing-your-90-minute-productivity-sprint",
          "excerpt": "Learn how to structure a 90-minute productivity sprint so you can make consistent progress without burning out.",
          "body": "A 90-minute productivity sprint is long enough to enter deep focus, but short enough to be repeatable.\n\nStart by choosing one clearly defined outcome. Write it as a finish line, not a task list. For example, \"Draft the first section of my presentation\" is clearer than \"Work on presentation.\"\n\nNext, remove friction. Close extra tabs, silence notifications, and gather everything you need before the timer starts. Use the first five minutes to outline your steps, then work in 25\u201330 minute blocks with short breaks.\n\nEnd every sprint by capturing notes: what worked, where you got stuck, and what your very next action will be. Over time, these small reflections turn into a powerful self-designed system.",
          "topic_tags": [
            "productivity",
            "focus",
            "time_management"
          ],
          "audience_tags": [
            "knowledge_workers",
            "students"
          ],
          "publish_date": "2026-02-10T09:00:00Z",
          "read_time_minutes": 7,
          "is_featured": true
        },
        {
          "id": "ba_productivity_mindset",
          "title": "Productivity Without Burnout: A Gentle Approach",
          "slug": "productivity-without-burnout-a-gentle-approach",
          "excerpt": "Shift from harsh self-criticism to sustainable rhythms that make productivity feel lighter.",
          "body": "Many productivity systems quietly assume you should operate like a machine. Real humans have energy cycles, emotions, and responsibilities that don't fit into a perfect schedule.\n\nSustainable productivity starts with honest capacity. Before planning your week, decide how many truly focused hours you have\u2014then plan for less than that. The margin you create is what protects you from burnout.\n\nNext, replace all-or-nothing thinking with experiments. Instead of \"I must wake up at 5 AM every day,\" try \"For the next seven days, I'll test a 20-minute morning focus block.\" At the end, keep what worked and adjust what didn't. Gentle, iterative change is far more effective than perfectionism.",
          "topic_tags": [
            "productivity",
            "stress_management",
            "mindset"
          ],
          "audience_tags": [
            "professionals",
            "working_parents"
          ],
          "publish_date": "2025-12-01T10:30:00Z",
          "read_time_minutes": 6,
          "is_featured": false
        },
        {
          "id": "ba_productivity_systems",
          "title": "Build a Simple Weekly Review That Actually Sticks",
          "slug": "build-a-simple-weekly-review-that-actually-sticks",
          "excerpt": "A 25-minute weekly review can keep your projects on track and your mind much calmer.",
          "body": "A weekly review is not about reorganizing your entire life\u2014it is about clearing mental clutter and deciding what matters next.\n\nKeep your review to three parts: capture, clean, and choose. First, capture anything still in your head: loose tasks, ideas, and worries. Second, clean up your system by checking your calendar, closing out completed tasks, and deferring anything that doesn't belong to the coming week.\n\nFinally, choose up to three priorities for the week. These are outcomes, not vague intentions. When your review is this simple, it becomes easy to repeat and easier to trust.",
          "topic_tags": [
            "productivity",
            "time_management",
            "planning"
          ],
          "audience_tags": [
            "professionals"
          ],
          "publish_date": "2025-10-15T14:00:00Z",
          "read_time_minutes": 5,
          "is_featured": false
        }
      ],
      "group_workshops": [
        {
          "id": "gw_productivity_power_hour",
          "title": "Productivity Power Hour: Get More Done With Less Stress",
          "topic": "productivity",
          "description": "A live group workshop that teaches a simple, repeatable system for planning your day and protecting your focus.",
          "price": 60,
          "duration_minutes": 90,
          "max_participants": 20,
          "format": "online_group"
        },
        {
          "id": "gw_focus_deep_work",
          "title": "Deep Work Lab: Focus Training for Busy Brains",
          "topic": "focus",
          "description": "Practice deep work techniques in real time with guided focus sprints and reflection.",
          "price": 75,
          "duration_minutes": 120,
          "max_participants": 18,
          "format": "online_group"
        },
        {
          "id": "gw_stress_reset",
          "title": "Stress Reset Evening Retreat",
          "topic": "stress_management",
          "description": "An in-person evening retreat with breathing practices, nervous system education, and stress reset planning.",
          "price": 85,
          "duration_minutes": 150,
          "max_participants": 25,
          "format": "in_person_group"
        }
      ],
      "individual_session_offerings": [
        {
          "id": "iso_stress_60_standard",
          "title": "60-Minute Stress Management Session",
          "topic": "stress_management",
          "description": "A focused 60-minute coaching session to understand your stress patterns and create a practical calming plan.",
          "price": 110,
          "duration_minutes": 60
        },
        {
          "id": "iso_stress_45_refresh",
          "title": "45-Minute Stress Reset",
          "topic": "stress_management",
          "description": "A shorter session ideal for quick check-ins and tuning your stress management tools.",
          "price": 90,
          "duration_minutes": 45
        },
        {
          "id": "iso_goal_setting_60",
          "title": "60-Minute Goal Setting Clarity Session",
          "topic": "goal_setting",
          "description": "Clarify your top priorities and translate them into realistic goals for the next 3 months.",
          "price": 95,
          "duration_minutes": 60
        }
      ],
      "worksheets": [
        {
          "id": "ws_tm_working_parents_5day",
          "title": "5-Day Time Management Reset for Working Parents",
          "description": "A guided 5-day worksheet to help working parents redesign mornings, evenings, and handoffs.",
          "topic": "time_management",
          "audience": "working_parents",
          "page_count": 8,
          "format": "pdf",
          "download_url": "https://arxiv.org/pdf/2404.07972",
          "is_active": true
        },
        {
          "id": "ws_tm_daily_planner",
          "title": "Daily Focus Planner",
          "description": "A printable planner for prioritizing your daily highlight and managing your top tasks.",
          "topic": "time_management",
          "audience": "professionals",
          "page_count": 2,
          "format": "pdf",
          "download_url": "https://arxiv.org/pdf/2404.07972",
          "is_active": true
        },
        {
          "id": "ws_productivity_sprint",
          "title": "90-Minute Productivity Sprint Worksheet",
          "description": "Plan, run, and review a focused 90-minute work sprint.",
          "topic": "productivity",
          "audience": "professionals",
          "page_count": 3,
          "format": "worksheet",
          "download_url": "https://arxiv.org/pdf/2404.07972",
          "is_active": true
        }
      ],
      "assessments": [
        {
          "id": "life_balance_snapshot_16q",
          "title": "Life Balance Snapshot (16 Questions)",
          "category": "life_balance",
          "description": "A gentle 16-question life balance wheel assessment that helps you quickly rate key areas of your life\u0014work, health, relationships, growth, rest, and fun\u0014and choose one or two focus areas for the next month.",
          "estimated_time_minutes": 12,
          "is_active": true,
          "question_count": 16
        },
        {
          "id": "life_balance_deep_dive_28q",
          "title": "Deep Life Balance Audit (28 Questions)",
          "category": "life_balance",
          "description": "A more detailed 28-question assessment that walks you through finances, career, creativity, community, and self-care so you can spot subtle imbalances and design a realistic rebalancing plan.",
          "estimated_time_minutes": 20,
          "is_active": true,
          "question_count": 0
        },
        {
          "id": "stress_triggers_checkup_18q",
          "title": "Stress Triggers & Habits Checkup",
          "category": "stress_management",
          "description": "An 18-question checkup that helps you identify your main stress triggers, current coping habits, and early warning signs so you can intervene before you hit overwhelm.",
          "estimated_time_minutes": 10,
          "is_active": true,
          "question_count": 4
        }
      ],
      "assessment_questions": [
        {
          "id": "lb16_q1",
          "assessmentId": "life_balance_snapshot_16q",
          "order": 1,
          "text": "Overall, how satisfied are you with the balance of your life right now?",
          "response_type": "scale_1_10",
          "options": [],
          "min_value": 1,
          "max_value": 10
        },
        {
          "id": "lb16_q2",
          "assessmentId": "life_balance_snapshot_16q",
          "order": 2,
          "text": "How satisfied are you with the balance between your work (or studies) and the rest of your life?",
          "response_type": "scale_1_10",
          "options": [],
          "min_value": 1,
          "max_value": 10
        },
        {
          "id": "lb16_q3",
          "assessmentId": "life_balance_snapshot_16q",
          "order": 3,
          "text": "How energized do you feel in your body on a typical weekday?",
          "response_type": "scale_1_10",
          "options": [],
          "min_value": 1,
          "max_value": 10
        }
      ],
      "coaching_packages": [
        {
          "id": "cp_career_change_budget_4",
          "name": "Career Change Starter Pack (4 Sessions)",
          "topic": "career_change",
          "description": "A focused 4-session package to help you clarify your direction, map your transferable skills, and design safe mini-experiments before making a big move.",
          "sessions_count": 4,
          "price": 260,
          "is_active": true,
          "created_at": "2025-10-10T09:00:00Z",
          "popularity_score": 1
        },
        {
          "id": "cp_career_change_foundations_4",
          "name": "Career Change Foundations (4 Sessions)",
          "topic": "career_change",
          "description": "Work through your values, strengths, and options in a structured 4-session process, ending with a 90-day transition plan.",
          "sessions_count": 4,
          "price": 320,
          "is_active": true,
          "created_at": "2025-06-20T14:30:00Z",
          "popularity_score": 0
        },
        {
          "id": "cp_career_change_premium_6",
          "name": "Career Pivot Premium (6 Sessions)",
          "topic": "career_change",
          "description": "Six deep-dive sessions combining narrative career coaching, experiment design, and accountability for your next professional chapter.",
          "sessions_count": 6,
          "price": 660,
          "is_active": true,
          "created_at": "2024-11-05T16:45:00Z",
          "popularity_score": 0
        }
      ],
      "cart_items": [
        {
          "id": "ci_cart_user123_career_budget4",
          "cartId": "cart_user123",
          "packageId": "cp_career_change_budget_4",
          "quantity": 1,
          "added_at": "2026-02-20T10:15:00Z",
          "name_snapshot": "Career Change Starter Pack (4 Sessions)",
          "unit_price": 260.0
        },
        {
          "id": "ci_cart_user123_stress_reset4",
          "cartId": "cart_user123",
          "packageId": "cp_stress_reset_4",
          "quantity": 1,
          "added_at": "2026-02-20T10:16:00Z",
          "name_snapshot": "Stress Reset Intensive (4 Sessions)",
          "unit_price": 340.0
        },
        {
          "id": "ci_cart_demo_stress_tm",
          "cartId": "cart_demo",
          "packageId": "cp_tm_working_parents_4",
          "quantity": 1,
          "added_at": "2026-01-15T09:05:00Z",
          "name_snapshot": "Time Management for Working Parents (4 Sessions)",
          "unit_price": 280.0
        }
      ],
      "challenges": [
        {
          "id": "ch_selfdiscipline_14_march10",
          "title": "14-Day Self-Discipline Reset",
          "topic": "self_discipline",
          "description": "A focused 14-day reset to help you follow through on one meaningful habit with gentle accountability and clear structure.",
          "duration_days": 14,
          "start_date": "2026-03-10T00:00:00Z",
          "end_date": "2026-03-23T23:59:59Z",
          "goals_overview": "Choose one specific, realistic daily habit and complete it for 14 consecutive days while learning how to plan for friction and recover from missed days.",
          "daily_activities_overview": "Each day you\u0019ll receive a short prompt, a 5-minute reflection question, and a tiny planning step for tomorrow related to your chosen habit.",
          "is_active": true,
          "popularity_score": 1
        },
        {
          "id": "ch_selfdiscipline_14_march15",
          "title": "14-Day Self-Discipline Starter Challenge",
          "topic": "self_discipline",
          "description": "A beginner-friendly self-discipline challenge designed for busy people who want to rebuild trust with themselves one small promise at a time.",
          "duration_days": 14,
          "start_date": "2026-03-15T00:00:00Z",
          "end_date": "2026-03-28T23:59:59Z",
          "goals_overview": "Practice keeping one simple daily promise, track your streak, and learn quick reset rituals when you feel like giving up.",
          "daily_activities_overview": "Daily check-in with a yes/no completion question, a short coaching tip, and an optional 2-minute journaling prompt.",
          "is_active": true,
          "popularity_score": 1
        },
        {
          "id": "ch_selfdiscipline_21_april",
          "title": "21-Day Self-Discipline Deep Dive",
          "topic": "self_discipline",
          "description": "A 21-day program that combines habit design, mindset work, and accountability to strengthen your follow-through on medium-sized goals.",
          "duration_days": 21,
          "start_date": "2026-04-05T00:00:00Z",
          "end_date": "2026-04-25T23:59:59Z",
          "goals_overview": "Design and execute a 21-day project with clear milestones, while experimenting with supportive environments and routines.",
          "daily_activities_overview": "Short daily lessons, reflection questions, and a structured end-of-week review to adjust your plan.",
          "is_active": true,
          "popularity_score": 0
        }
      ],
      "challenge_enrollments": [
        {
          "id": "ce_jordan_selfdisc_march10",
          "challengeId": "ch_selfdiscipline_14_march10",
          "name": "Jordan Blake",
          "email": "jordan@example.com",
          "reminder_email_enabled": true,
          "reminder_sms_enabled": false,
          "reminder_frequency": "daily",
          "reminder_time": "08:00",
          "enrolled_at": "2026-03-01T09:15:00Z",
          "status": "active"
        },
        {
          "id": "ce_alex_selfdisc_march15",
          "challengeId": "ch_selfdiscipline_14_march15",
          "name": "Alex Rivera",
          "email": "alex.r@example.com",
          "reminder_email_enabled": true,
          "reminder_sms_enabled": true,
          "reminder_frequency": "daily",
          "reminder_time": "07:30",
          "enrolled_at": "2026-03-02T18:40:00Z",
          "status": "active"
        },
        {
          "id": "ce_sam_productivity10",
          "challengeId": "ch_productivity_10_sprint",
          "name": "Sam Lee",
          "email": "sam.lee@example.com",
          "reminder_email_enabled": false,
          "reminder_sms_enabled": false,
          "reminder_frequency": "none",
          "reminder_time": null,
          "enrolled_at": "2026-02-27T12:05:00Z",
          "status": "active"
        }
      ],
      "coaches": [
        {
          "id": "coach_stress_elena_top",
          "name": "Elena Marquez",
          "bio": "Elena is a certified stress management and burnout prevention coach who blends nervous-system education with highly practical planning tools. She specializes in helping busy professionals and working parents design calmer weeks without sacrificing ambition.",
          "photo_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=600&fit=crop&auto=format&q=80",
          "specialties": [
            "stress_management",
            "productivity",
            "life_balance"
          ],
          "price_per_session": 145,
          "session_lengths_minutes": [
            45,
            60
          ],
          "offers_free_consultation": false,
          "location": "Remote (based in Austin, TX)",
          "is_active": true,
          "review_count": 3,
          "average_rating": 5.0
        },
        {
          "id": "coach_stress_max",
          "name": "Max Holden",
          "bio": "Max works with high-performing professionals who feel constantly \"on\". His coaching focuses on simple nervous system resets, boundary scripts, and realistic routines that make stress feel far more manageable.",
          "photo_url": "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&h=600&fit=crop&auto=format&q=80",
          "specialties": [
            "stress_management",
            "boundaries"
          ],
          "price_per_session": 135,
          "session_lengths_minutes": [
            30,
            60
          ],
          "offers_free_consultation": true,
          "location": "New York, NY & online",
          "is_active": true,
          "review_count": 2,
          "average_rating": 4.5
        },
        {
          "id": "coach_stress_budget",
          "name": "Priya Nair",
          "bio": "Priya supports clients experiencing day-to-day overwhelm to build simple, sustainable stress management habits. Her style is warm, practical, and especially supportive for those new to coaching.",
          "photo_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop&auto=format&q=80",
          "specialties": [
            "stress_management",
            "time_management"
          ],
          "price_per_session": 95,
          "session_lengths_minutes": [
            45,
            60
          ],
          "offers_free_consultation": false,
          "location": "Remote (based in Toronto, Canada)",
          "is_active": true,
          "review_count": 1,
          "average_rating": 4.0
        }
      ],
      "coach_reviews": [
        {
          "id": "rev_jamie_1",
          "coachId": "coach_relationship_jamie_top",
          "rating": 5,
          "title": "Huge shift in how we communicate",
          "body": "Jamie helped us create a simple weekly check-in that has completely changed how we talk about hard topics. We both feel heard instead of defensive.",
          "created_at": "2025-11-05T18:20:00Z"
        },
        {
          "id": "rev_jamie_2",
          "coachId": "coach_relationship_jamie_top",
          "rating": 5,
          "title": "Practical and compassionate",
          "body": "Sessions were structured but never rigid. Jamie gave us scripts we could actually use in real arguments without feeling fake.",
          "created_at": "2025-11-19T17:45:00Z"
        },
        {
          "id": "rev_jamie_3",
          "coachId": "coach_relationship_jamie_top",
          "rating": 4,
          "title": "We feel closer and safer",
          "body": "It took a few sessions to warm up, but by the end we were having much calmer conversations about long-standing issues.",
          "created_at": "2025-12-02T20:10:00Z"
        }
      ],
      "coach_availability_slots": [
        {
          "id": "cas_elena_20260304_1800",
          "coachId": "coach_stress_elena_top",
          "start_datetime": "2026-03-04T18:00:00Z",
          "end_datetime": "2026-03-04T19:00:00Z",
          "is_booked": true
        },
        {
          "id": "cas_elena_20260305_1830",
          "coachId": "coach_stress_elena_top",
          "start_datetime": "2026-03-05T18:30:00Z",
          "end_datetime": "2026-03-05T19:30:00Z",
          "is_booked": false
        },
        {
          "id": "cas_elena_20260306_1900",
          "coachId": "coach_stress_elena_top",
          "start_datetime": "2026-03-06T19:00:00Z",
          "end_datetime": "2026-03-06T20:00:00Z",
          "is_booked": false
        }
      ],
      "session_bookings": [
        {
          "id": "sb_elena_20260304_1800",
          "coachId": "coach_stress_elena_top",
          "availabilitySlotId": "cas_elena_20260304_1800",
          "session_length_minutes": 60,
          "topic": "stress_management",
          "start_datetime": "2026-03-04T18:00:00Z",
          "price": 145,
          "client_name": "Chris Nolan",
          "client_email": "chris.nolan@example.com",
          "goals_notes": "I want to understand why my stress spikes so quickly in the afternoons and leave with a simple plan I can actually follow during busy workweeks.",
          "status": "confirmed",
          "created_at": "2026-02-28T09:45:00Z"
        },
        {
          "id": "sb_priya_20260305_1600",
          "coachId": "coach_stress_budget",
          "availabilitySlotId": "cas_priya_20260305_1600",
          "session_length_minutes": 60,
          "topic": "stress_management",
          "start_datetime": "2026-03-05T16:00:00Z",
          "price": 95,
          "client_name": "Alexis Moore",
          "client_email": "alexis.moore@example.com",
          "goals_notes": "Looking for beginner-friendly tools to manage day-to-day overwhelm while juggling a new job and caregiving responsibilities.",
          "status": "confirmed",
          "created_at": "2026-02-27T14:20:00Z"
        },
        {
          "id": "sb_jamie_20260306_1000",
          "coachId": "coach_relationship_jamie_top",
          "availabilitySlotId": "cas_jamie_20260306_1000",
          "session_length_minutes": 60,
          "topic": "relationships",
          "start_datetime": "2026-03-06T10:00:00Z",
          "price": 150,
          "client_name": "Taylor Brooks",
          "client_email": "taylor.brooks@example.com",
          "goals_notes": "My partner and I keep circling around the same arguments. I want support creating communication rituals so we can talk about hard topics without shutting down.",
          "status": "confirmed",
          "created_at": "2026-02-25T18:05:00Z"
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:53:27.462774"
      }
    };

    // Copy generated data to localStorage using correct storage keys
    localStorage.setItem('blog_articles', JSON.stringify(generatedData.blog_articles || []));
    localStorage.setItem('group_workshops', JSON.stringify(generatedData.group_workshops || []));
    localStorage.setItem('individual_session_offerings', JSON.stringify(generatedData.individual_session_offerings || []));
    localStorage.setItem('worksheets', JSON.stringify(generatedData.worksheets || []));
    localStorage.setItem('assessments', JSON.stringify(generatedData.assessments || []));
    localStorage.setItem('assessment_questions', JSON.stringify(generatedData.assessment_questions || []));
    localStorage.setItem('coaching_packages', JSON.stringify(generatedData.coaching_packages || []));
    localStorage.setItem('cart_items', JSON.stringify(generatedData.cart_items || []));
    localStorage.setItem('challenges', JSON.stringify(generatedData.challenges || []));
    localStorage.setItem('challenge_enrollments', JSON.stringify(generatedData.challenge_enrollments || []));
    localStorage.setItem('coaches', JSON.stringify(generatedData.coaches || []));
    localStorage.setItem('coach_reviews', JSON.stringify(generatedData.coach_reviews || []));
    localStorage.setItem('coach_availability_slots', JSON.stringify(generatedData.coach_availability_slots || []));
    localStorage.setItem('session_bookings', JSON.stringify(generatedData.session_bookings || []));

    // Store metadata for date calculations in tests
    localStorage.setItem('test_metadata', JSON.stringify(generatedData._metadata || null));

    // Initialize empty collections for other storage keys used by the logic
    const emptyKeys = [
      'cart',
      'saved_articles',
      'reading_lists',
      'reading_list_items',
      'coach_contact_messages',
      'assessment_instances',
      'saved_worksheets',
      'custom_plans',
      'custom_plan_items'
    ];
    emptyKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });
  }

  // Helper: get baseline "today" from metadata
  getBaselineDate() {
    const metaRaw = localStorage.getItem('test_metadata');
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw);
        if (meta && meta.baselineDate) {
          return new Date(meta.baselineDate + 'T00:00:00Z');
        }
      } catch (e) {
        // fall through
      }
    }
    return new Date();
  }

  // Helper: format Date -> 'YYYY-MM-DD'
  formatDateISO(dateObj) {
    return dateObj.toISOString().slice(0, 10);
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookStressManagementSession();
    this.testTask2_AddCheapestCareerPackageToCart();
    this.testTask3_CreateProductivityReadingList();
    this.testTask4_JoinSelfDisciplineChallenge();
    this.testTask5_CompleteLifeBalanceAssessment();
    this.testTask6_ContactHighRatedCoachWithFreeConsult();
    this.testTask7_BookmarkPostsAndWorksheetForWorkingParents();
    this.testTask8_BuildAndSaveCustomPlanUnder300();

    return this.results;
  }

  // Task 1: Book a 60-minute stress management session within 7 days under $150 with the highest-rated coach
  testTask1_BookStressManagementSession() {
    const testName = 'Task 1: Book stress management session with top-rated coach';
    try {
      this.logic.getHomePageOverview();

      // Use coach filters: stress management, 60 min, <=150, active
      const filters = {
        specialty: 'stress_management',
        maxPrice: 150,
        sessionLengthMinutes: 60,
        onlyActive: true
      };
      const coachSearch = this.logic.searchCoaches(filters, 'highest_rated', 1, 20);
      this.assert(coachSearch && Array.isArray(coachSearch.results), 'Coach search should return results array');
      this.assert(coachSearch.results.length > 0, 'Should find at least one matching coach');

      const topCoach = coachSearch.results[0];
      this.assert(topCoach.price_per_session <= 150, 'Coach price should be <= 150');
      this.assert(
        Array.isArray(topCoach.session_lengths_minutes) &&
          topCoach.session_lengths_minutes.indexOf(60) !== -1,
        'Coach should support 60-minute sessions'
      );

      const coachId = topCoach.id;

      // Get availability within next 7 days based on baseline date
      const today = this.getBaselineDate();
      const endDateObj = new Date(today.getTime());
      endDateObj.setDate(endDateObj.getDate() + 7);
      const startDateStr = this.formatDateISO(today);
      const endDateStr = this.formatDateISO(endDateObj);

      const availability = this.logic.getCoachAvailability(
        coachId,
        startDateStr,
        endDateStr,
        60
      );
      this.assert(Array.isArray(availability), 'Availability should be an array');

      // Choose first free evening slot between 18:00 and 21:00
      const freeEveningSlot = availability.find((slot) => {
        if (!slot || slot.is_booked) return false;
        const start = new Date(slot.start_datetime);
        const hour = start.getUTCHours();
        return hour >= 18 && hour <= 21;
      });
      this.assert(freeEveningSlot, 'Should find a free evening slot between 18:00 and 21:00');

      const slotStart = new Date(freeEveningSlot.start_datetime);
      this.assert(
        slotStart >= today && slotStart <= endDateObj,
        'Booked slot should be within next 7 days'
      );

      // Book session
      const clientName = 'Test User Task1';
      const clientEmail = 'user@example.com';
      const goalsNotes = 'I want support creating a sustainable stress management routine for my evenings.';

      const bookingResult = this.logic.bookCoachSession(
        coachId,
        freeEveningSlot.id,
        60,
        'stress_management',
        clientName,
        clientEmail,
        goalsNotes
      );

      this.assert(bookingResult && bookingResult.success === true, 'Booking should succeed');
      this.assert(bookingResult.booking, 'Booking result should include booking object');

      const booking = bookingResult.booking;
      this.assert(booking.coachId === coachId, 'Booking coachId should match selected coach');
      this.assert(
        booking.availabilitySlotId === freeEveningSlot.id,
        'Booking availabilitySlotId should match chosen slot'
      );
      this.assert(
        booking.session_length_minutes === 60,
        'Booked session should be 60 minutes'
      );
      this.assert(booking.price <= 150, 'Booked session price should be <= 150');

      const bookedStart = new Date(booking.start_datetime);
      const bookedHour = bookedStart.getUTCHours();
      this.assert(
        bookedHour >= 18 && bookedHour <= 21,
        'Booked session should start between 18:00 and 21:00 UTC'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Add the cheapest 4-session career change coaching package under $400 to cart
  testTask2_AddCheapestCareerPackageToCart() {
    const testName = 'Task 2: Add cheapest 4-session career change package under $400 to cart';
    try {
      this.logic.getHomePageOverview();
      this.logic.getPackageFilterOptions();

      const filters = {
        topic: 'career_change',
        exactSessionsCount: 4,
        maxPrice: 400,
        onlyActive: true
      };

      const pkgSearch = this.logic.searchCoachingPackages(filters, 'price_low_to_high', 1, 20);
      this.assert(pkgSearch && Array.isArray(pkgSearch.results), 'Package search should return results array');
      this.assert(pkgSearch.results.length > 0, 'Should find at least one matching package');

      const cheapestPackage = pkgSearch.results[0];
      this.assert(cheapestPackage.sessions_count === 4, 'Package should have 4 sessions');
      this.assert(cheapestPackage.price <= 400, 'Package price should be <= 400');

      const addResult = this.logic.addPackageToCart(cheapestPackage.id, 1);
      this.assert(addResult && addResult.success === true, 'addPackageToCart should succeed');
      this.assert(addResult.cart, 'addPackageToCart should return a cart');

      const cartFromAdd = addResult.cart;
      const itemsFromAdd = addResult.items || [];
      const addedItem = itemsFromAdd.find((pair) => pair && pair.package && pair.package.id === cheapestPackage.id);
      this.assert(addedItem, 'Cart items should include the added package');

      // subtotal should be at least the package price
      if (typeof addResult.cart.subtotal === 'number') {
        this.assert(
          addResult.cart.subtotal >= cheapestPackage.price,
          'Cart subtotal should be >= package price'
        );
      }

      // View cart
      const cartView = this.logic.getCart();
      this.assert(cartView && cartView.cart, 'getCart should return cart');
      const itemsView = cartView.items || [];
      const viewItem = itemsView.find((pair) => pair && pair.package && pair.package.id === cheapestPackage.id);
      this.assert(viewItem, 'Cart view should contain the added package');

      if (typeof cartView.subtotal === 'number') {
        this.assert(
          cartView.subtotal >= cheapestPackage.price,
          'Cart view subtotal should be >= package price'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Create a reading list with 3 productivity articles (4+ minutes, last 6 months)
  testTask3_CreateProductivityReadingList() {
    const testName = 'Task 3: Create reading list with 3 productivity articles';
    try {
      this.logic.getHomePageOverview();
      this.logic.getBlogFilterOptions();

      const today = this.getBaselineDate();
      const from = new Date(today.getTime());
      from.setMonth(from.getMonth() - 6);
      const dateFrom = this.formatDateISO(from);
      const dateTo = this.formatDateISO(today);

      const filters = {
        topicTags: ['productivity'],
        dateFrom: dateFrom,
        dateTo: dateTo,
        minReadTimeMinutes: 4
      };

      const searchResult = this.logic.searchBlogArticles('productivity', filters, 'newest', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchBlogArticles should return results array');
      this.assert(searchResult.results.length >= 3, 'Should find at least 3 productivity articles');

      const articles = searchResult.results.slice(0, 3);

      // Create new reading list
      const listName = 'Productivity Sprint';
      const readingList = this.logic.createReadingList(listName, 'Auto-created in Task 3 flow test');
      this.assert(readingList && readingList.id, 'createReadingList should return a list with id');

      const listId = readingList.id;

      // Add 3 articles
      articles.forEach((article) => {
        const addRes = this.logic.addArticleToReadingList(listId, article.id);
        this.assert(addRes && addRes.success === true, 'addArticleToReadingList should succeed');
        this.assert(addRes.item && addRes.item.readingListId === listId, 'ReadingListItem should reference correct list');
      });

      // Verify via getReadingLists
      const listsOverview = this.logic.getReadingLists();
      this.assert(Array.isArray(listsOverview), 'getReadingLists should return an array');

      const createdListSummary = listsOverview.find((entry) => entry.readingList && entry.readingList.id === listId);
      this.assert(createdListSummary, 'Created reading list should appear in overview');
      this.assert(
        typeof createdListSummary.articleCount === 'number' &&
          createdListSummary.articleCount >= 3,
        'Reading list should have at least 3 articles'
      );

      // Verify via detail
      const listDetail = this.logic.getReadingListDetail(listId);
      this.assert(listDetail && listDetail.readingList && Array.isArray(listDetail.articles), 'getReadingListDetail should return list and articles');
      this.assert(listDetail.readingList.name === listName, 'Reading list name should match');

      const detailArticleIds = listDetail.articles.map((a) => a.id);
      articles.forEach((a) => {
        this.assert(
          detailArticleIds.indexOf(a.id) !== -1,
          'Reading list detail should include article ' + a.id
        );
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Join a 14-day self-discipline challenge starting in the next 14 days with daily email reminders only
  testTask4_JoinSelfDisciplineChallenge() {
    const testName = 'Task 4: Join 14-day self-discipline challenge with daily email reminders only';
    try {
      this.logic.getHomePageOverview();
      this.logic.getChallengeFilterOptions();

      const today = this.getBaselineDate();
      const to = new Date(today.getTime());
      to.setDate(to.getDate() + 14);
      const startDateFrom = this.formatDateISO(today);
      const startDateTo = this.formatDateISO(to);

      const filters = {
        topic: 'self_discipline',
        minDurationDays: 14,
        maxDurationDays: 14,
        startDateFrom: startDateFrom,
        startDateTo: startDateTo,
        onlyActive: true
      };

      const searchRes = this.logic.searchChallenges(filters, 'start_date_asc', 1, 20);
      this.assert(searchRes && Array.isArray(searchRes.results), 'searchChallenges should return results array');
      this.assert(searchRes.results.length > 0, 'Should find at least one 14-day self-discipline challenge');

      const challenge = searchRes.results[0];
      this.assert(challenge.duration_days === 14, 'Challenge duration should be 14 days');

      const startDt = new Date(challenge.start_date);
      this.assert(startDt >= today && startDt <= to, 'Challenge start date should be within next 14 days');

      const detail = this.logic.getChallengeDetail(challenge.id);
      this.assert(detail && detail.id === challenge.id, 'getChallengeDetail should return selected challenge');

      const name = 'Task 4 Tester';
      const email = 'user@example.com';
      const reminderEmailEnabled = true;
      const reminderSmsEnabled = false;
      const reminderFrequency = 'daily';
      const reminderTime = '08:00';

      const enrollRes = this.logic.enrollInChallenge(
        challenge.id,
        name,
        email,
        reminderEmailEnabled,
        reminderSmsEnabled,
        reminderFrequency,
        reminderTime
      );

      this.assert(enrollRes && enrollRes.success === true, 'enrollInChallenge should succeed');
      this.assert(enrollRes.enrollment, 'Enrollment object should be returned');

      const enrollment = enrollRes.enrollment;
      this.assert(enrollment.challengeId === challenge.id, 'Enrollment should reference correct challenge');
      this.assert(enrollment.name === name, 'Enrollment name should match input');
      this.assert(enrollment.email === email, 'Enrollment email should match input');
      this.assert(enrollment.reminder_email_enabled === true, 'Email reminders should be enabled');
      this.assert(enrollment.reminder_sms_enabled === false, 'SMS reminders should be disabled');
      this.assert(enrollment.reminder_frequency === 'daily', 'Reminder frequency should be daily');
      if (enrollment.reminder_time) {
        this.assert(enrollment.reminder_time === reminderTime, 'Reminder time should match input');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Complete a life balance self-assessment and save the results to dashboard
  testTask5_CompleteLifeBalanceAssessment() {
    const testName = 'Task 5: Complete life balance assessment and save results to dashboard';
    try {
      this.logic.getHomePageOverview();
      this.logic.getAssessmentFilterOptions();

      const filters = {
        category: 'life_balance',
        minQuestions: 10,
        maxQuestions: 30,
        onlyActive: true
      };

      const searchRes = this.logic.searchAssessments(filters, 'question_count_asc', 1, 20);
      this.assert(searchRes && Array.isArray(searchRes.results), 'searchAssessments should return results array');
      this.assert(searchRes.results.length > 0, 'Should find at least one life balance assessment');

      const assessment = searchRes.results[0];
      this.assert(
        typeof assessment.question_count === 'number' &&
          assessment.question_count >= 10 &&
          assessment.question_count <= 30,
        'Assessment question_count should be between 10 and 30'
      );

      const detail = this.logic.getAssessmentDetail(assessment.id);
      this.assert(detail && detail.assessment && Array.isArray(detail.questions), 'getAssessmentDetail should return assessment and questions');
      const questions = detail.questions;
      this.assert(questions.length > 0, 'Assessment should have at least one question');

      // Start assessment
      const instance = this.logic.startAssessment(assessment.id);
      this.assert(instance && instance.id, 'startAssessment should return an instance with id');
      const instanceId = instance.id;

      // Build responses with mid-to-high values
      const responses = questions.map((q) => {
        const resp = { questionId: q.id, response: {} };
        if (q.response_type === 'scale_1_10') {
          const min = typeof q.min_value === 'number' ? q.min_value : 1;
          const max = typeof q.max_value === 'number' ? q.max_value : 10;
          const midHigh = Math.round((min + max * 1.5) / 2);
          const value = Math.min(max, Math.max(min, midHigh));
          resp.response.scaleValue = value;
        } else if (q.response_type === 'multiple_choice_single') {
          const options = Array.isArray(q.options) ? q.options : [];
          const idx = options.length > 0 ? Math.min(options.length - 1, Math.floor(options.length / 2)) : 0;
          resp.response.selectedOptionIndexes = [idx];
        } else if (q.response_type === 'multiple_choice_multi') {
          const options = Array.isArray(q.options) ? q.options : [];
          if (options.length > 0) {
            const lastIdx = options.length - 1;
            resp.response.selectedOptionIndexes = [lastIdx];
          } else {
            resp.response.selectedOptionIndexes = [];
          }
        }
        return resp;
      });

      const completeRes = this.logic.completeAssessment(instanceId, responses);
      this.assert(completeRes && completeRes.success === true, 'completeAssessment should succeed');
      this.assert(completeRes.instance, 'completeAssessment should return updated instance');

      const completedInstance = completeRes.instance;
      this.assert(
        typeof completedInstance.score === 'number' || completedInstance.score !== undefined,
        'Completed instance should have a score (or defined score field)'
      );
      this.assert(
        completedInstance.saved_to_dashboard === false,
        'Newly completed assessment should not yet be saved to dashboard'
      );

      // Save to dashboard
      const savedInstance = this.logic.saveAssessmentResultToDashboard(instanceId);
      this.assert(savedInstance && savedInstance.id === instanceId, 'saveAssessmentResultToDashboard should return same instance');
      this.assert(savedInstance.saved_to_dashboard === true, 'Instance should be marked saved_to_dashboard');

      // Verify via dashboard
      const dashboard = this.logic.getDashboardOverview();
      this.assert(dashboard && Array.isArray(dashboard.savedAssessments), 'Dashboard overview should include savedAssessments');

      const dashboardInstance = dashboard.savedAssessments.find((inst) => inst.id === instanceId);
      this.assert(dashboardInstance, 'Saved assessment should appear on dashboard');

      if (dashboard.stats && typeof dashboard.stats.assessmentCount === 'number') {
        this.assert(dashboard.stats.assessmentCount >= 1, 'Dashboard assessmentCount should be >= 1');
      }

      const detailRes = this.logic.getAssessmentResultDetail(instanceId);
      this.assert(detailRes && detailRes.instance && detailRes.assessment, 'getAssessmentResultDetail should return instance and assessment');
      this.assert(detailRes.assessment.id === assessment.id, 'Result detail should reference correct assessment');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Contact a coach with free consultation, rating >=4.5 (adapted: any specialty, >=1 review)
  testTask6_ContactHighRatedCoachWithFreeConsult() {
    const testName = 'Task 6: Contact high-rated coach with free consultation (morning, communication message)';
    try {
      this.logic.getHomePageOverview();
      this.logic.getCoachFilterOptions();

      // Adapted: Any coach offering free consultation with rating >=4.5 and at least 1 review
      const filters = {
        offersFreeConsultation: true,
        minRating: 4.5,
        minReviewCount: 1,
        onlyActive: true
      };

      const searchRes = this.logic.searchCoaches(filters, 'most_reviews', 1, 20);
      this.assert(searchRes && Array.isArray(searchRes.results), 'searchCoaches should return results array');
      this.assert(searchRes.results.length > 0, 'Should find at least one coach offering free consultation with rating >=4.5');

      const coach = searchRes.results[0];
      this.assert(coach.offers_free_consultation === true, 'Coach should offer free consultation');
      this.assert(coach.average_rating >= 4.5, 'Coach rating should be >= 4.5');
      this.assert(coach.review_count >= 1, 'Coach should have at least 1 review (adapted from 10+)');

      const profile = this.logic.getCoachProfile(coach.id);
      this.assert(profile && profile.coach && profile.coach.id === coach.id, 'getCoachProfile should return selected coach');

      const name = 'Task 6 Tester';
      const email = 'user@example.com';
      const preferredTimeOfDay = 'morning';
      const messageText = 'I would like a free consultation focused on improving our communication and understanding around daily routines. My partner and I often struggle with communication when we are both stressed.';

      const contactRes = this.logic.sendCoachContactMessage(
        coach.id,
        name,
        email,
        preferredTimeOfDay,
        messageText,
        true // isFreeConsultationRequest
      );

      this.assert(contactRes && contactRes.success === true, 'sendCoachContactMessage should succeed');
      this.assert(contactRes.contactMessage, 'Contact message object should be returned');

      const contact = contactRes.contactMessage;
      this.assert(contact.coachId === coach.id, 'Contact message should reference correct coach');
      this.assert(contact.name === name, 'Contact name should match input');
      this.assert(contact.email === email, 'Contact email should match input');
      this.assert(contact.preferred_time_of_day === 'morning', 'Preferred time of day should be morning');
      this.assert(contact.is_free_consultation_request === true, 'Should be marked as free consultation request');
      this.assert(
        typeof contact.message === 'string' && contact.message.toLowerCase().indexOf('communication') !== -1,
        'Message should contain the word "communication"'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Bookmark two time management posts and one worksheet for working parents (<=10 pages)
  testTask7_BookmarkPostsAndWorksheetForWorkingParents() {
    const testName = 'Task 7: Bookmark two time management posts and one working-parents worksheet';
    try {
      this.logic.getHomePageOverview();
      this.logic.getBlogFilterOptions();

      // Find time management-related posts
      const blogSearch = this.logic.searchBlogArticles('time management', null, 'newest', 1, 20);
      this.assert(blogSearch && Array.isArray(blogSearch.results), 'searchBlogArticles should return results array');

      // Adaptation: choose first two articles that have 'time_management' in topic_tags
      const timeMgmtArticles = blogSearch.results.filter((a) =>
        Array.isArray(a.topic_tags) && a.topic_tags.indexOf('time_management') !== -1
      );
      this.assert(timeMgmtArticles.length >= 2, 'Should have at least two time management articles');

      const article1 = timeMgmtArticles[0];
      const article2 = timeMgmtArticles[1];

      // Bookmark both articles
      const bm1 = this.logic.bookmarkArticle(article1.id);
      this.assert(bm1 && bm1.success === true, 'First bookmarkArticle call should succeed');
      this.assert(bm1.savedArticle && bm1.savedArticle.articleId === article1.id, 'SavedArticle should reference first article');

      const bm2 = this.logic.bookmarkArticle(article2.id);
      this.assert(bm2 && bm2.success === true, 'Second bookmarkArticle call should succeed');
      this.assert(bm2.savedArticle && bm2.savedArticle.articleId === article2.id, 'SavedArticle should reference second article');

      // Verify bookmark state for at least one article via detail (if supported)
      const detail1 = this.logic.getBlogArticleDetail(article1.id);
      if (detail1 && typeof detail1.isBookmarked === 'boolean') {
        this.assert(detail1.isBookmarked === true, 'Article detail should show bookmarked state');
      }

      // Now handle worksheet for working parents (time management, <=10 pages)
      this.logic.getWorksheetFilterOptions();

      const wsFilters = {
        topic: 'time_management',
        audience: 'working_parents',
        maxPages: 10,
        onlyActive: true
      };

      const wsSearch = this.logic.searchWorksheets(wsFilters, 'page_count_asc', 1, 20);
      this.assert(wsSearch && Array.isArray(wsSearch.results), 'searchWorksheets should return results array');
      this.assert(wsSearch.results.length > 0, 'Should find at least one worksheet for working parents');

      const worksheet = wsSearch.results[0];
      this.assert(worksheet.page_count <= 10, 'Worksheet page_count should be <= 10');

      const saveRes = this.logic.saveWorksheet(worksheet.id, 'resources_page');
      this.assert(saveRes && saveRes.success === true, 'saveWorksheet should succeed');
      this.assert(saveRes.savedWorksheet && saveRes.savedWorksheet.worksheetId === worksheet.id, 'SavedWorksheet should reference chosen worksheet');

      // Verify via worksheet detail (if isSaved field is maintained)
      const wsDetail = this.logic.getWorksheetDetail(worksheet.id);
      if (wsDetail && typeof wsDetail.isSaved === 'boolean') {
        this.assert(wsDetail.isSaved === true, 'Worksheet detail should indicate saved');
      }

      // Verify via dashboard overview
      const dashboard = this.logic.getDashboardOverview();
      this.assert(dashboard && Array.isArray(dashboard.savedWorksheets), 'Dashboard overview should include savedWorksheets');

      const savedWsEntry = dashboard.savedWorksheets.find((entry) =>
        entry.worksheet && entry.worksheet.id === worksheet.id
      );
      this.assert(savedWsEntry, 'Saved worksheet should appear on dashboard');

      if (dashboard.stats && typeof dashboard.stats.worksheetCount === 'number') {
        this.assert(dashboard.stats.worksheetCount >= 1, 'Dashboard worksheetCount should be >= 1');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Build and save a custom coaching plan with 2 individual sessions and 1 group workshop under $300 total
  testTask8_BuildAndSaveCustomPlanUnder300() {
    const testName = 'Task 8: Build and save custom plan with 2 sessions + 1 workshop under $300';
    try {
      this.logic.getHomePageOverview();

      // Get builder options (not strictly needed but simulates page load)
      this.logic.getCustomPlanBuilderOptions();

      // Filter individual sessions with max price 120, sort by price asc
      const sessionFilters = {
        maxPrice: 120
      };
      const sessionSearch = this.logic.searchIndividualSessions(sessionFilters, 'price_asc');
      this.assert(sessionSearch && Array.isArray(sessionSearch.results), 'searchIndividualSessions should return results array');
      this.assert(sessionSearch.results.length >= 2, 'Should have at least two affordable individual sessions');

      const session1 = sessionSearch.results[0];
      const session2 = sessionSearch.results[1];

      // Filter group workshops by topic productivity and price <=80
      const workshopFilters = {
        topic: 'productivity',
        maxPrice: 80
      };
      let workshopSearch = this.logic.searchGroupWorkshops(workshopFilters, 'price_asc');
      this.assert(workshopSearch && Array.isArray(workshopSearch.results), 'searchGroupWorkshops should return results array');

      // If none found with topic filter, relax topic but keep price
      if (workshopSearch.results.length === 0) {
        const relaxedFilters = {
          maxPrice: 80
        };
        workshopSearch = this.logic.searchGroupWorkshops(relaxedFilters, 'price_asc');
      }

      this.assert(workshopSearch.results.length > 0, 'Should have at least one workshop with price <= 80');
      const workshop = workshopSearch.results[0];

      // Compute naive total cost from returned prices
      const naiveTotal = (session1.price || 0) + (session2.price || 0) + (workshop.price || 0);
      this.assert(naiveTotal <= 300, 'Selected items naive total cost should be <= $300');

      const items = [
        {
          item_type: 'individual_session',
          individualSessionId: session1.id
        },
        {
          item_type: 'individual_session',
          individualSessionId: session2.id
        },
        {
          item_type: 'group_workshop',
          groupWorkshopId: workshop.id
        }
      ];

      const planName = 'March Focus';
      const saveRes = this.logic.saveCustomPlan(planName, items);
      this.assert(saveRes && saveRes.success === true, 'saveCustomPlan should succeed');
      this.assert(saveRes.plan && saveRes.plan.id, 'saveCustomPlan should return a plan with id');

      const plan = saveRes.plan;
      this.assert(plan.name === planName, 'Plan name should match input');
      this.assert(typeof plan.total_cost === 'number', 'Plan should have total_cost number');
      this.assert(plan.total_cost <= 300, 'Plan total_cost should be <= $300');

      // Verify via My Plans
      const plans = this.logic.getCustomPlans();
      this.assert(Array.isArray(plans), 'getCustomPlans should return an array');
      const createdPlan = plans.find((p) => p.id === plan.id);
      this.assert(createdPlan, 'Created plan should appear in getCustomPlans');

      // Verify via plan detail
      const planDetail = this.logic.getCustomPlanDetail(plan.id);
      this.assert(planDetail && planDetail.plan && Array.isArray(planDetail.items), 'getCustomPlanDetail should return plan and items');
      this.assert(planDetail.plan.id === plan.id, 'Plan detail should reference correct plan');

      const detailItems = planDetail.items;
      const sessionItems = detailItems.filter((it) => it.planItem && it.planItem.item_type === 'individual_session');
      const workshopItems = detailItems.filter((it) => it.planItem && it.planItem.item_type === 'group_workshop');
      this.assert(sessionItems.length === 2, 'Plan should contain exactly 2 individual session items');
      this.assert(workshopItems.length === 1, 'Plan should contain exactly 1 workshop item');

      // Verify plan appears in dashboard overview
      const dashboard = this.logic.getDashboardOverview();
      this.assert(dashboard && Array.isArray(dashboard.savedPlans), 'Dashboard overview should include savedPlans');
      const dashboardPlan = dashboard.savedPlans.find((p) => p.id === plan.id);
      this.assert(dashboardPlan, 'Plan should appear in dashboard savedPlans');

      if (dashboard.stats && typeof dashboard.stats.planCount === 'number') {
        this.assert(dashboard.stats.planCount >= 1, 'Dashboard planCount should be >= 1');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Assertion helper
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

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
