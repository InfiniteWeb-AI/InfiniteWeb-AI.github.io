class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear localStorage before tests
    this.clearStorage();
    // Initialize test data
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    // Reinitialize storage structure via business logic helper
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    // and use the correct storage keys from Storage Key Mapping

    var generatedData = {
      add_ons: [
        {
          id: 'yoga_weekly_light',
          name: 'Yoga Weekly Lite Add-on',
          description: 'Add one guided studio yoga class per week to your membership. Ideal if you want a gentle, consistent practice.',
          add_on_type: 'yoga_class_pass',
          billing_period: 'monthly',
          classes_per_week: 1,
          price: 20,
          is_active: true,
          requires_membership: true,
          category: 'yoga'
        },
        {
          id: 'yoga_weekly_standard',
          name: 'Yoga Weekly Standard Add-on',
          description: 'Includes two studio yoga classes per week with access to all moderate-level classes on the timetable.',
          add_on_type: 'yoga_class_pass',
          billing_period: 'monthly',
          classes_per_week: 2,
          price: 35,
          is_active: true,
          requires_membership: true,
          category: 'yoga'
        },
        {
          id: 'yoga_unlimited_monthly',
          name: 'Unlimited Yoga Monthly Pass',
          description: 'Unlimited yoga classes each week on the regular timetable. Best for dedicated yogis.',
          add_on_type: 'yoga_class_pass',
          billing_period: 'monthly',
          classes_per_week: 5,
          price: 60,
          is_active: true,
          requires_membership: true,
          category: 'yoga'
        }
      ],
      articles: [
        {
          id: 'injury_prevention_beginner_runners',
          title: 'Injury Prevention for Beginner Runners',
          slug: 'injury-prevention-for-beginner-runners',
          summary: 'Simple technique, warm-up, and strength tips to help new runners stay injury-free.',
          content: 'Starting to run is exciting, but rapid increases in training load are a common cause of injury. Focus first on frequency over intensity: aim for 3 easy runs per week where you can hold a conversation. Add 5–10 minutes per week rather than chasing big jumps in distance.\n\nBefore each run, complete a 5–10 minute dynamic warm-up: leg swings, walking lunges, and calf raises prepare your tissues for impact. Post-run, spend a few minutes on gentle calf, hamstring, and hip flexor stretches.\n\nTwice per week, add basic strength work: bodyweight squats, glute bridges, and single-leg calf raises. Strong muscles help absorb impact and control your landing mechanics, reducing stress on joints and tendons.\n\nFinally, listen to early warning signs. Persistent one-sided pain, sharp joint pain, or pain that worsens as you run are cues to back off and, if needed, consult a running-aware health professional.',
          category: 'running',
          tags: [
            'injury prevention',
            'runners',
            'beginner',
            'running form',
            'load management'
          ],
          estimated_read_time_minutes: 8,
          published_at: '2025-09-10T09:00:00Z',
          author_name: 'Dr. Hannah Cole',
          is_published: true,
          image: 'https://images.unsplash.com/photo-1546484959-f9a9ae384058?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'mental_resilience_micro_habits',
          title: 'Micro Habits for Mental Resilience',
          slug: 'micro-habits-for-mental-resilience',
          summary: 'Build a more resilient mindset using five tiny daily habits that take less than five minutes each.',
          content: 'Mental resilience isn’t about being tough all the time; it’s about recovering your balance when life moves unexpectedly. Micro habits—actions that take 1–5 minutes—are a powerful way to train this skill.\n\nTry a 60-second check-in once per day: name one emotion you’re feeling and one need you have. This builds emotional literacy and prevents overwhelm. Add a two-minute breathing break, inhaling for four counts and exhaling for six to signal safety to your nervous system.\n\nNext, create a ‘win list’—three small things you did well today. Over time this gently shifts your brain away from threat scanning toward balanced evaluation.\n\nFinally, practice a tiny reframing habit: when a setback occurs, ask, “What is one thing this is teaching me?” You’re not denying difficulty, just expanding the story. Repetition, not intensity, is what gradually re-shapes your default responses.',
          category: 'mental_resilience',
          tags: [
            'mental resilience',
            'habits',
            'mindset',
            'breathing',
            'self-reflection'
          ],
          estimated_read_time_minutes: 7,
          published_at: '2025-08-01T12:00:00Z',
          author_name: 'Leah Morgan',
          is_published: true,
          image: 'https://www.rnz.co.nz/assets/news/100034/eight_col_nature-sky-sunset-man_crop.jpg?1487637886'
        },
        {
          id: 'nutrition_basics_for_busy_athletes',
          title: 'Nutrition Basics for Busy Athletes',
          slug: 'nutrition-basics-for-busy-athletes',
          summary: 'A simple framework to fuel training when time for cooking is limited.',
          content: 'When training and life are both full, nutrition has to be simple and repeatable. Start by building meals around the ‘3+1’ framework: a source of protein, a colorful plant, a smart carbohydrate, plus a healthy fat.\n\nFor breakfast, that might look like Greek yogurt (protein), berries (plant), oats (carbohydrate), and a sprinkle of nuts (fat). For lunch and dinner, think in bowls or plates: half the plate vegetables, a palm-sized portion of protein, and a fist of carbs.\n\nPlan 2–3 ‘default’ meals you can make on autopilot. Keep a short shopping list for these saved on your phone so you can restock quickly. Add portable snacks—fruit, trail mix, or cheese and wholegrain crackers—so you’re not relying on vending machines when hunger hits.\n\nFinally, aim to sip fluids regularly across the day. A reusable bottle kept in sight is often enough to double your usual intake without effort.',
          category: 'nutrition',
          tags: [
            'nutrition',
            'meal planning',
            'busy schedule',
            'fueling',
            'hydration'
          ],
          estimated_read_time_minutes: 9,
          published_at: '2025-06-15T08:30:00Z',
          author_name: 'Jamie Patel',
          is_published: true,
          image: 'https://cdn.shopify.com/s/files/1/0254/5942/5376/files/42.png?v=1605535285'
        }
      ],
      challenges: [
        {
          id: '7day_wellbeing_reset',
          name: '7-Day Wellbeing Reset Challenge',
          slug: '7-day-wellbeing-reset-challenge',
          description: 'A free 7-day email challenge to gently reset your sleep, stress, and daily movement habits with short, actionable prompts.',
          duration_days: 7,
          focus: 'general wellbeing reset with emphasis on sleep quality, stress management, and mindful movement.',
          price_type: 'free',
          price: 0,
          delivery_channel: 'email',
          is_active: true,
          default_themes: [
            'sleep',
            'mindfulness',
            'nutrition',
            'movement',
            'stress',
            'general_wellbeing'
          ]
        },
        {
          id: '14day_stress_less_sprint',
          name: '14-Day Stress Less Sprint',
          slug: '14-day-stress-less-sprint',
          description: 'A focused two-week mixed app and email challenge to help you downshift daily stress with micro-practices.',
          duration_days: 14,
          focus: 'stress reduction and emotional regulation for busy professionals.',
          price_type: 'paid',
          price: 29,
          delivery_channel: 'mixed',
          is_active: true,
          default_themes: [
            'stress',
            'mindfulness',
            'sleep'
          ]
        },
        {
          id: '7day_running_form_minicamp',
          name: '7-Day Running Form Mini-Camp',
          slug: '7-day-running-form-mini-camp',
          description: 'Daily cues, drills, and short videos to help you refine your running technique in just one week.',
          duration_days: 7,
          focus: 'running technique and injury prevention for recreational runners.',
          price_type: 'free',
          price: 0,
          delivery_channel: 'email',
          is_active: true,
          default_themes: [
            'movement',
            'running',
            'injury_prevention'
          ]
        }
      ],
      coaches: [
        {
          id: 'coach_amy_running',
          name: 'Amy Walters',
          bio: 'Amy is a running coach and physiotherapist with a decade of experience helping recreational and competitive runners improve technique and stay injury-free.',
          role: 'running_coach',
          specialties: [
            'running technique',
            'injury prevention',
            'return to run protocols',
            '5k to marathon plans'
          ],
          rating: 4.9,
          rating_count: 312,
          image: 'https://cdn.shortpixel.ai/client/q_glossy,ret_img,w_1024,h_684/https://www.corpus-aesthetics.com/wp-content/uploads/2021/07/3-3-1024x684.jpg'
        },
        {
          id: 'coach_dan_strength',
          name: 'Dan Mitchell',
          bio: 'Dan is a strength and conditioning coach who works with endurance athletes to build durable, powerful bodies without unnecessary bulk.',
          role: 'strength_coach',
          specialties: [
            'strength for runners',
            'power development',
            'movement screening'
          ],
          rating: 4.7,
          rating_count: 184,
          image: 'https://cdn.shopify.com/s/files/1/2559/4942/files/NJ_sports_performance_web-5.jpg?v=1589463775'
        },
        {
          id: 'coach_sophia_nutrition',
          name: 'Sophia Nguyen',
          bio: 'Sophia is a sports dietitian specialising in practical fueling strategies for busy athletes balancing training with work and family.',
          role: 'nutrition_coach',
          specialties: [
            'endurance nutrition',
            'gut training',
            'weight-neutral performance',
            'female athlete nutrition'
          ],
          rating: 4.8,
          rating_count: 221,
          image: 'https://cdn.shopify.com/s/files/1/0923/7400/articles/ashley_reaver_profile_2_2000x.jpg?v=1614103573'
        }
      ],
      membership_plans: [
        {
          id: 'monthly_gym_basic',
          name: 'Monthly Gym Basic',
          description: 'Unlimited gym floor access during staffed hours with access to cardio and strength equipment.',
          billing_period: 'monthly',
          price: 110,
          benefits: [
            'gym_access',
            'other_benefit'
          ],
          includes_gym_access: true,
          is_active: true,
          min_term_months: 1,
          max_yoga_classes_per_week: 0
        },
        {
          id: 'monthly_gym_plus_classes',
          name: 'Monthly Gym + Classes',
          description: 'Unlimited gym access plus access to all standard group fitness classes, excluding premium workshops.',
          billing_period: 'monthly',
          price: 140,
          benefits: [
            'gym_access',
            'group_classes'
          ],
          includes_gym_access: true,
          is_active: true,
          min_term_months: 1,
          max_yoga_classes_per_week: 1
        },
        {
          id: 'monthly_gym_premium',
          name: 'Monthly Gym Premium',
          description: 'Full gym access, group classes, and up to two yoga classes per week plus sauna access.',
          billing_period: 'monthly',
          price: 150,
          benefits: [
            'gym_access',
            'group_classes',
            'yoga_classes',
            'sauna_access'
          ],
          includes_gym_access: true,
          is_active: true,
          min_term_months: 3,
          max_yoga_classes_per_week: 2
        }
      ],
      programs: [
        {
          id: 'calm_in_4_weeks_core_skills',
          name: 'Calm in 4 Weeks: Core Stress Skills',
          slug: 'calm-in-4-weeks-core-stress-skills',
          category: 'stress_management',
          description: 'A 4-week, science-based stress management program combining bite-sized lessons, guided audio practices, and weekly reflection prompts.',
          duration_weeks: 4,
          delivery_format: 'self_paced',
          base_price: 99,
          rating: 4.8,
          rating_count: 417,
          is_active: true,
          image: 'https://www.cumanagement.com/sites/default/files/2020-12/AW-beating-burnout.jpg',
          tags: [
            '4_weeks',
            'stress',
            'breathing',
            'self_paced'
          ]
        },
        {
          id: 'stress_reset_4week_bootcamp',
          name: '4-Week Stress Reset Bootcamp',
          slug: '4-week-stress-reset-bootcamp',
          category: 'stress_management',
          description: 'A structured, high-support 4-week bootcamp with live cohort calls and accountability check-ins.',
          duration_weeks: 4,
          delivery_format: 'cohort_based',
          base_price: 119,
          rating: 4.7,
          rating_count: 286,
          is_active: true,
          image: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800&h=600&fit=crop&auto=format&q=80',
          tags: [
            '4_weeks',
            'stress',
            'cohort',
            'accountability'
          ]
        },
        {
          id: 'foundations_of_stress_management',
          name: 'Foundations of Stress Management',
          slug: 'foundations-of-stress-management',
          category: 'stress_management',
          description: 'A beginner-friendly introduction to stress physiology, mindset, and daily micro-practices.',
          duration_weeks: 4,
          delivery_format: 'self_paced',
          base_price: 89,
          rating: 4.6,
          rating_count: 198,
          is_active: true,
          image: 'https://www-data.fi.ncsu.edu/wp-content/uploads/2020/06/28144951/Untitled-design-1-1024x679.jpg',
          tags: [
            '4_weeks',
            'introductory',
            'stress'
          ]
        }
      ],
      workout_templates: [
        {
          id: 'cardio_easy_run_20',
          name: '20-Min Easy Run',
          description: 'A conversational-paced 20-minute run to build your aerobic base without excess fatigue.',
          workout_type: 'cardio',
          duration_minutes: 20,
          intensity: 'low',
          equipment_needed: 'Running shoes and a safe route or treadmill.',
          is_active: true
        },
        {
          id: 'cardio_brisk_walk_15',
          name: '15-Min Brisk Walk Reset',
          description: 'A short, brisk walk to break up sitting time or as a low-impact recovery session.',
          workout_type: 'cardio',
          duration_minutes: 15,
          intensity: 'low',
          equipment_needed: 'Comfortable walking shoes.',
          is_active: true
        },
        {
          id: 'cardio_bike_intervals_25',
          name: '25-Min Bike Intervals',
          description: '5-minute warm-up, 6 x 1-minute moderate-hard efforts with 2-minute easy spins, then a short cool-down.',
          workout_type: 'cardio',
          duration_minutes: 25,
          intensity: 'moderate',
          equipment_needed: 'Stationary bike or road bike on a safe route.',
          is_active: true
        }
      ],
      consultation_services: [
        {
          id: 'run_tech_60_assessment',
          name: '60-Min Running Technique Assessment',
          slug: '60-min-running-technique-assessment',
          service_type: 'running_technique',
          description: 'A comprehensive 60-minute technique assessment including gait analysis, training history review, and a personalised plan to reduce injury risk and improve efficiency.',
          duration_minutes: 60,
          base_price: 120,
          coach_id: 'coach_amy_running',
          rating: 4.9,
          rating_count: 210,
          is_active: true,
          tags: [
            'running',
            'technique',
            'video_analysis',
            'injury_prevention',
            '60_min'
          ],
          image: 'https://media.publit.io/file/w_700,h_403,c_fit,q_70/dynamicpodiatry/mymediafiles/smt-gait-full-assessment.png'
        },
        {
          id: 'run_tech_60_tune_up',
          name: '60-Min Running Form Tune-Up',
          slug: '60-min-running-form-tune-up',
          service_type: 'running_technique',
          description: 'A focused 60-minute session to refine cadence, posture, and foot strike, ideal for runners with some experience who want to run smoother and faster.',
          duration_minutes: 60,
          base_price: 95,
          coach_id: 'coach_amy_running',
          rating: 4.8,
          rating_count: 168,
          is_active: true,
          tags: [
            'running',
            'form',
            'cadence',
            '60_min',
            'performance'
          ],
          image: 'https://images.unsplash.com/photo-1546484959-f9a9ae384058?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'run_tech_60_evening_online',
          name: '60-Min Evening Online Running Technique Session',
          slug: '60-min-evening-online-running-technique-session',
          service_type: 'running_technique',
          description: 'An online 60-minute running technique consultation scheduled in evening hours, perfect for busy professionals.',
          duration_minutes: 60,
          base_price: 85,
          coach_id: 'coach_amy_running',
          rating: 4.9,
          rating_count: 142,
          is_active: true,
          tags: [
            'running',
            'technique',
            'online',
            'evening',
            '60_min'
          ],
          image: 'https://primehealthco.com.au/wp-content/uploads/2020/05/runner-web-blog.jpg'
        }
      ],
      group_classes: [
        {
          id: 'class_strength_express_30',
          name: 'Strength Express 30',
          description: 'A 30-minute full-body strength class using dumbbells and bodyweight movements, ideal for building base strength on busy days.',
          focus: 'strength',
          intensity: 'moderate',
          default_duration_minutes: 30,
          trainer_id: 'coach_li_class_trainer',
          location_type: 'gym_studio',
          is_active: true
        },
        {
          id: 'class_conditioning_circuit_40',
          name: 'Conditioning Circuit 40',
          description: 'A mixed cardio and strength circuit using intervals to improve fitness without high-impact plyometrics.',
          focus: 'conditioning',
          intensity: 'moderate',
          default_duration_minutes: 40,
          trainer_id: 'coach_li_class_trainer',
          location_type: 'gym_studio',
          is_active: true
        },
        {
          id: 'class_yoga_flow_40',
          name: 'Balanced Yoga Flow 40',
          description: 'A flowing yoga class combining gentle strength, balance work, and focused breathing.',
          focus: 'yoga',
          intensity: 'moderate',
          default_duration_minutes: 40,
          trainer_id: 'coach_raj_yoga',
          location_type: 'gym_studio',
          is_active: true
        }
      ],
      nutrition_bundles: [
        {
          id: 'nutrition_essentials_mini',
          name: 'Nutrition Essentials Mini Bundle',
          description: 'Three 30-minute sessions to review your current diet, set clear priorities, and create a simple fueling plan.',
          product_type: 'bundle',
          num_sessions: 3,
          minutes_per_session: 30,
          total_minutes: 90,
          price: 120,
          start_window_description: 'Book your first session within 30 days of purchase; remaining sessions to be used within 3 months.',
          is_active: true,
          preferred_coach_ids: [
            'coach_sophia_nutrition'
          ],
          tags: [
            'starter',
            'bundle',
            'fueling',
            'performance'
          ]
        },
        {
          id: 'nutrition_essentials_standard',
          name: 'Nutrition Essentials Standard Bundle',
          description: 'Four 40-minute sessions to build, test, and refine your everyday and training nutrition strategy.',
          product_type: 'bundle',
          num_sessions: 4,
          minutes_per_session: 40,
          total_minutes: 160,
          price: 160,
          start_window_description: 'Begin within 45 days of purchase; complete all sessions within 4 months.',
          is_active: true,
          preferred_coach_ids: [
            'coach_sophia_nutrition'
          ],
          tags: [
            'best_value',
            'bundle',
            'endurance',
            'habit_change'
          ]
        },
        {
          id: 'nutrition_race_fueling_package',
          name: 'Race Fueling Strategy Package',
          description: 'Four 45-minute consultations focused on dialing in fueling, hydration, and gut training for race day.',
          product_type: 'bundle',
          num_sessions: 4,
          minutes_per_session: 45,
          total_minutes: 180,
          price: 220,
          start_window_description: 'Ideal to start 8–12 weeks before your key race; first session within 30 days of purchase.',
          is_active: true,
          preferred_coach_ids: [
            'coach_sophia_nutrition'
          ],
          tags: [
            'race_fueling',
            'marathon',
            'bundle',
            'performance'
          ]
        }
      ],
      program_tiers: [
        {
          id: 'calm_4w_standard',
          program_id: 'calm_in_4_weeks_core_skills',
          name: 'Standard',
          tier_type: 'standard',
          description: 'Full access to all lessons, audio practices, and reflection prompts, with community discussion boards.',
          price: 99,
          is_default: true
        },
        {
          id: 'calm_4w_premium',
          program_id: 'calm_in_4_weeks_core_skills',
          name: 'Premium',
          tier_type: 'premium',
          description: 'Includes Standard access plus two live group Q&A calls with a wellbeing coach.',
          price: 139,
          is_default: false
        },
        {
          id: 'stress_reset_4w_standard',
          program_id: 'stress_reset_4week_bootcamp',
          name: 'Standard',
          tier_type: 'standard',
          description: 'Cohort-based 4-week bootcamp with weekly live calls and workbook access.',
          price: 119,
          is_default: true
        }
      ],
      consultation_time_slots: [
        {
          id: 'cts_runtech_evening_20260310_1730',
          consultation_service_id: 'run_tech_60_evening_online',
          start_datetime: '2026-03-10T17:30:00Z',
          end_datetime: '2026-03-10T18:30:00Z',
          duration_minutes: 60,
          price: 85,
          is_available: true,
          max_participants: 1,
          location_type: 'online',
          location_detail: 'Online (Zoom) - link sent after booking.',
          created_at: '2026-02-15T09:00:00Z'
        },
        {
          id: 'cts_runtech_evening_20260310_1900',
          consultation_service_id: 'run_tech_60_evening_online',
          start_datetime: '2026-03-10T19:00:00Z',
          end_datetime: '2026-03-10T20:00:00Z',
          duration_minutes: 60,
          price: 85,
          is_available: true,
          max_participants: 1,
          location_type: 'online',
          location_detail: 'Online (Zoom) - link sent after booking.',
          created_at: '2026-02-15T09:05:00Z'
        },
        {
          id: 'cts_runtech_evening_20260310_2030_full',
          consultation_service_id: 'run_tech_60_evening_online',
          start_datetime: '2026-03-10T20:30:00Z',
          end_datetime: '2026-03-10T21:30:00Z',
          duration_minutes: 60,
          price: 85,
          is_available: false,
          max_participants: 1,
          location_type: 'online',
          location_detail: 'Online (Zoom) - link sent after booking.',
          created_at: '2026-02-15T09:10:00Z'
        }
      ],
      group_class_sessions: [
        {
          id: 'gcs_cond_20260307_0800',
          group_class_id: 'class_conditioning_circuit_40',
          start_datetime: '2026-03-07T08:00:00Z',
          end_datetime: '2026-03-07T08:40:00Z',
          duration_minutes: 40,
          intensity: 'moderate',
          remaining_spots: 6,
          capacity: 16,
          is_cancelled: false,
          price: 18,
          location_room: 'Studio 1'
        },
        {
          id: 'gcs_strength_20260307_0900',
          group_class_id: 'class_strength_express_30',
          start_datetime: '2026-03-07T09:00:00Z',
          end_datetime: '2026-03-07T09:30:00Z',
          duration_minutes: 30,
          intensity: 'moderate',
          remaining_spots: 5,
          capacity: 14,
          is_cancelled: false,
          price: 18,
          location_room: 'Studio 1'
        },
        {
          id: 'gcs_yoga_20260307_1015',
          group_class_id: 'class_yoga_flow_40',
          start_datetime: '2026-03-07T10:15:00Z',
          end_datetime: '2026-03-07T10:55:00Z',
          duration_minutes: 40,
          intensity: 'moderate',
          remaining_spots: 4,
          capacity: 18,
          is_cancelled: false,
          price: 18,
          location_room: 'Studio 2'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:25:37.118270'
      }
    };

    if (typeof localStorage === 'undefined') {
      return;
    }

    // Use storage keys from Storage Key Mapping
    localStorage.setItem('add_ons', JSON.stringify(generatedData.add_ons));
    localStorage.setItem('articles', JSON.stringify(generatedData.articles));
    localStorage.setItem('challenges', JSON.stringify(generatedData.challenges));
    localStorage.setItem('coaches', JSON.stringify(generatedData.coaches));
    localStorage.setItem('membership_plans', JSON.stringify(generatedData.membership_plans));
    localStorage.setItem('programs', JSON.stringify(generatedData.programs));
    localStorage.setItem('workout_templates', JSON.stringify(generatedData.workout_templates));
    localStorage.setItem('consultation_services', JSON.stringify(generatedData.consultation_services));
    localStorage.setItem('group_classes', JSON.stringify(generatedData.group_classes));
    localStorage.setItem('nutrition_bundles', JSON.stringify(generatedData.nutrition_bundles));
    localStorage.setItem('program_tiers', JSON.stringify(generatedData.program_tiers));
    localStorage.setItem('consultation_time_slots', JSON.stringify(generatedData.consultation_time_slots));
    localStorage.setItem('group_class_sessions', JSON.stringify(generatedData.group_class_sessions));
    // Metadata for date calculations in tests
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookCheapestRunningConsultation();
    this.testTask2_PurchaseBestStressProgram();
    this.testTask3_BookTwoNonOverlappingClasses();
    this.testTask4_CreateWeeklyTrainingPlan();
    this.testTask5_AddBestValueNutritionBundle();
    this.testTask6_JoinFreeWellbeingChallenge();
    this.testTask7_SaveThreeShortArticles();
    this.testTask8_BuildMonthlyGymYogaSubscription();

    return this.results;
  }

  // ---------- Helper methods ----------

  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('OK ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('FAIL ' + testName + ': ' + error.message);
  }

  getBaselineDate() {
    if (typeof localStorage === 'undefined') return new Date();
    var metaJson = localStorage.getItem('_metadata');
    if (metaJson) {
      try {
        var meta = JSON.parse(metaJson);
        if (meta && meta.baselineDate) {
          return new Date(meta.baselineDate + 'T00:00:00Z');
        }
      } catch (e) {
        // ignore and fall through
      }
    }
    return new Date();
  }

  // targetWeekday: 0=Sunday ... 6=Saturday (UTC-based)
  getNextWeekdayDateString(baseDate, targetWeekday) {
    var date = new Date(baseDate.getTime());
    var current = date.getUTCDay();
    var diff = (targetWeekday - current + 7) % 7;
    if (diff === 0) diff = 7; // next, not today
    date.setUTCDate(date.getUTCDate() + diff);
    return date.toISOString().slice(0, 10);
  }

  formatDateYMD(date) {
    return date.toISOString().slice(0, 10);
  }

  // ---------- Task 1 ----------
  // Book the cheapest 60-minute running technique consultation after 5:00 pm next Tuesday
  testTask1_BookCheapestRunningConsultation() {
    var testName = 'Task 1: Book cheapest 60-min running consultation after 5pm next Tuesday';
    try {
      this.clearStorage();
      this.setupTestData();

      var baseline = this.getBaselineDate();
      // Tuesday = 2
      var nextTuesday = this.getNextWeekdayDateString(baseline, 2);

      var filterOptions = this.logic.getConsultationFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.service_types), 'Consultation filter options should include service_types');

      var filters = {
        service_type: 'running_technique',
        duration_minutes: 60,
        date: nextTuesday,
        earliest_start_time: '17:00'
      };
      var sort = 'price_low_to_high';

      var searchResult = this.logic.searchConsultations(filters, sort, 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchConsultations should return results array');
      this.assert(searchResult.results.length > 0, 'At least one running consultation should match filters');

      var results = searchResult.results;
      // Validate filters are respected
      for (var i = 0; i < results.length; i++) {
        var item = results[i];
        if (filters.service_type) {
          this.assert(item.service_type === filters.service_type, 'Consultation service_type should match filter');
        }
        if (filters.duration_minutes) {
          this.assert(item.duration_minutes === filters.duration_minutes, 'Consultation duration should be ' + filters.duration_minutes);
        }
      }

      // Validate ascending price order if possible
      if (results.length > 1) {
        for (var j = 1; j < results.length; j++) {
          var prevPrice = results[j - 1].next_available_price;
          var currPrice = results[j].next_available_price;
          if (typeof prevPrice === 'number' && typeof currPrice === 'number') {
            this.assert(currPrice >= prevPrice, 'Consultations should be sorted by price low to high');
          }
        }
      }

      var chosenConsultation = results[0];
      this.assert(chosenConsultation.consultation_service_id, 'Chosen consultation should have an ID');

      var detail = this.logic.getConsultationDetail(chosenConsultation.consultation_service_id, nextTuesday);
      this.assert(detail && detail.consultation, 'getConsultationDetail should return consultation detail');
      this.assert(Array.isArray(detail.available_slots), 'Consultation detail should include available_slots array');
      this.assert(detail.available_slots.length > 0, 'There should be available slots on the chosen date');

      // Choose earliest available slot at or after 17:00
      var slots = detail.available_slots.filter(function (slot) {
        if (!slot.is_available) return false;
        if (!slot.start_datetime) return false;
        var timeStr = slot.start_datetime.substring(11, 16); // HH:MM
        return timeStr >= '17:00';
      });
      this.assert(slots.length > 0, 'There should be at least one available slot at or after 17:00');

      slots.sort(function (a, b) {
        if (a.start_datetime < b.start_datetime) return -1;
        if (a.start_datetime > b.start_datetime) return 1;
        return 0;
      });

      var chosenSlot = slots[0];
      this.assert(chosenSlot.time_slot_id, 'Chosen slot should have time_slot_id');

      var addResult = this.logic.addConsultationBookingToCart(
        chosenSlot.time_slot_id,
        1,
        'Test Runner',
        'testrunner@example.com',
        '123456789'
      );

      this.assert(addResult && addResult.success === true, 'addConsultationBookingToCart should succeed');
      this.assert(addResult.cart_item_id, 'addConsultationBookingToCart should return cart_item_id');

      var cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should include items array');

      var cartItem = cartSummary.items.find(function (it) {
        return it.cart_item_id === addResult.cart_item_id;
      });
      this.assert(cartItem, 'Cart should contain the consultation booking');
      this.assert(cartItem.item_type === 'consultation', 'Cart item type should be consultation');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 2 ----------
  // Purchase the highest-rated 4-week stress management program under $120
  testTask2_PurchaseBestStressProgram() {
    var testName = 'Task 2: Purchase highest-rated 4-week stress program under $120';
    try {
      this.clearStorage();
      this.setupTestData();

      var filterOptions = this.logic.getProgramFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.categories), 'Program filter options should include categories');

      var filters = {
        category: 'stress_management',
        duration_weeks: 4,
        max_price: 120,
        min_rating: 4.5
      };

      var searchResult = this.logic.searchPrograms(filters, 'rating_high_to_low', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchPrograms should return results array');
      this.assert(searchResult.results.length > 0, 'At least one stress program should match filters');

      var results = searchResult.results;
      // Validate filters and sort
      for (var i = 0; i < results.length; i++) {
        var item = results[i];
        if (filters.category) {
          this.assert(item.category === filters.category, 'Program category should be stress_management');
        }
        if (filters.duration_weeks) {
          this.assert(item.duration_weeks === filters.duration_weeks, 'Program duration_weeks should be 4');
        }
        if (filters.max_price) {
          this.assert(item.base_price <= filters.max_price, 'Program price should be <= max_price');
        }
        if (filters.min_rating) {
          this.assert(item.rating >= filters.min_rating, 'Program rating should be >= min_rating');
        }
      }
      if (results.length > 1) {
        for (var j = 1; j < results.length; j++) {
          var prevRating = results[j - 1].rating;
          var currRating = results[j].rating;
          this.assert(currRating <= prevRating, 'Programs should be sorted by rating high to low');
        }
      }

      var chosenProgram = results[0];
      this.assert(chosenProgram.program_id, 'Chosen program should have program_id');

      var detail = this.logic.getProgramDetail(chosenProgram.program_id);
      this.assert(detail && detail.program, 'getProgramDetail should return program detail');
      this.assert(detail.program.id === chosenProgram.program_id, 'Program detail ID should match selected program');

      var tiers = detail.tiers || [];
      var selectedTierId = null;
      if (tiers.length > 0) {
        var defaultTier = null;
        for (var k = 0; k < tiers.length; k++) {
          if (tiers[k].is_default) {
            defaultTier = tiers[k];
            break;
          }
        }
        if (!defaultTier) {
          defaultTier = tiers[0];
        }
        selectedTierId = defaultTier.tier_id;
      }

      var constraints = detail.start_date_constraints || {};
      var startDateStr = null;
      if (constraints.earliest_start_date) {
        startDateStr = constraints.earliest_start_date;
      } else if (constraints.latest_start_date) {
        startDateStr = constraints.latest_start_date;
      } else {
        startDateStr = this.formatDateYMD(this.getBaselineDate());
      }

      var addResult = this.logic.addProgramEnrollmentToCart(
        chosenProgram.program_id,
        selectedTierId,
        startDateStr
      );

      this.assert(addResult && addResult.success === true, 'addProgramEnrollmentToCart should succeed');
      this.assert(addResult.cart_item_id, 'addProgramEnrollmentToCart should return cart_item_id');

      var cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should include items array');

      var cartItem = cartSummary.items.find(function (it) {
        return it.cart_item_id === addResult.cart_item_id;
      });
      this.assert(cartItem, 'Cart should contain the program enrollment');
      this.assert(cartItem.item_type === 'program_enrollment', 'Cart item type should be program_enrollment');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 3 ----------
  // Book two non-overlapping moderate-intensity morning group classes on the same day
  testTask3_BookTwoNonOverlappingClasses() {
    var testName = 'Task 3: Book two non-overlapping moderate morning classes on same Saturday';
    try {
      this.clearStorage();
      this.setupTestData();

      var baseline = this.getBaselineDate();
      // Saturday = 6
      var nextSaturday = this.getNextWeekdayDateString(baseline, 6);

      var filterOptions = this.logic.getClassScheduleFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.time_of_day_ranges), 'Class schedule filter options should include time_of_day_ranges');

      var filters = {
        start_time_from: '08:00',
        start_time_to: '12:00',
        intensity: 'moderate',
        max_duration_minutes: 45
      };

      var schedule = this.logic.getClassSchedule(nextSaturday, filters);
      this.assert(schedule && Array.isArray(schedule.sessions), 'getClassSchedule should return sessions array');
      this.assert(schedule.sessions.length >= 2, 'Should have at least two matching class sessions');

      var sessions = schedule.sessions.slice();
      sessions.sort(function (a, b) {
        if (a.start_datetime < b.start_datetime) return -1;
        if (a.start_datetime > b.start_datetime) return 1;
        return 0;
      });

      // First class between 08:00 and 10:30
      var firstSession = null;
      for (var i = 0; i < sessions.length; i++) {
        var s = sessions[i];
        var timeStr = s.start_datetime.substring(11, 16);
        if (timeStr >= '08:00' && timeStr <= '10:30') {
          firstSession = s;
          break;
        }
      }
      this.assert(firstSession !== null, 'Should find a first class between 08:00 and 10:30');

      var sessionDetail1 = this.logic.getClassSessionDetail(firstSession.group_class_session_id);
      this.assert(sessionDetail1 && sessionDetail1.session, 'getClassSessionDetail should return session detail');

      var addResult1 = this.logic.addClassSessionBookingToCart(
        firstSession.group_class_session_id,
        1,
        'Test Runner',
        'testrunner@example.com',
        '123456789'
      );
      this.assert(addResult1 && addResult1.success === true, 'First class booking should succeed');
      this.assert(addResult1.cart_item_id, 'First class booking should return cart_item_id');

      var firstEndMs = new Date(firstSession.end_datetime).getTime();
      var minSecondStartMs = firstEndMs + 30 * 60 * 1000; // +30 minutes

      var schedule2 = this.logic.getClassSchedule(nextSaturday, filters);
      this.assert(schedule2 && Array.isArray(schedule2.sessions), 'Second schedule call should return sessions');

      var secondSession = null;
      for (var j = 0; j < schedule2.sessions.length; j++) {
        var s2 = schedule2.sessions[j];
        if (s2.group_class_session_id === firstSession.group_class_session_id) {
          continue;
        }
        var startMs = new Date(s2.start_datetime).getTime();
        if (startMs >= minSecondStartMs) {
          secondSession = s2;
          break;
        }
      }
      this.assert(secondSession !== null, 'Should find a second class at least 30 minutes after the first ends');

      var sessionDetail2 = this.logic.getClassSessionDetail(secondSession.group_class_session_id);
      this.assert(sessionDetail2 && sessionDetail2.session, 'Second class detail should be returned');

      var addResult2 = this.logic.addClassSessionBookingToCart(
        secondSession.group_class_session_id,
        1,
        'Test Runner',
        'testrunner@example.com',
        '123456789'
      );
      this.assert(addResult2 && addResult2.success === true, 'Second class booking should succeed');
      this.assert(addResult2.cart_item_id, 'Second class booking should return cart_item_id');

      var cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should include items array');

      var classItems = cartSummary.items.filter(function (it) {
        return it.item_type === 'class_session';
      });
      this.assert(classItems.length >= 2, 'Cart should contain at least two class_session items');

      // Validate non-overlap and 30-minute gap using session times
      var firstStart = new Date(firstSession.start_datetime).getTime();
      var firstEnd = new Date(firstSession.end_datetime).getTime();
      var secondStart = new Date(secondSession.start_datetime).getTime();
      var secondEnd = new Date(secondSession.end_datetime).getTime();

      this.assert(secondStart >= firstEnd + 30 * 60 * 1000, 'Second class should start at least 30 minutes after first class ends');
      this.assert(secondStart >= firstEnd, 'Classes should not overlap');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 4 ----------
  // Create a weekly training plan using workout templates (adapted to available cardio templates)
  testTask4_CreateWeeklyTrainingPlan() {
    var testName = 'Task 4: Create weekly training plan with three cardio workouts';
    try {
      this.clearStorage();
      this.setupTestData();

      var initialState = this.logic.getTrainingPlannerInitialState();
      this.assert(initialState && Array.isArray(initialState.week_days), 'Training planner initial state should include week_days');

      var filterOptions = this.logic.getWorkoutTemplateFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.workout_types), 'Workout template filter options should include workout_types');

      // Adaptation: use available cardio workouts under 30 minutes for Monday, Wednesday, Friday
      var filters = {
        workout_type: 'cardio',
        max_duration_minutes: 30
      };

      var searchResult = this.logic.searchWorkoutTemplates(filters, 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchWorkoutTemplates should return results array');
      this.assert(searchResult.results.length > 0, 'At least one cardio workout template should be available');

      var results = searchResult.results;
      // Ensure all results meet filter
      for (var i = 0; i < results.length; i++) {
        var w = results[i];
        this.assert(w.workout_type === 'cardio', 'Workout type should be cardio');
        this.assert(w.duration_minutes <= 30, 'Workout duration should be <= 30 minutes');
      }

      var t1 = results[0];
      var t2 = results[1] || results[0];
      var t3 = results[2] || results[0];

      var defaultTime = initialState.default_start_time || '07:00';

      var items = [
        {
          workout_template_id: t1.workout_template_id,
          day_of_week: 'monday',
          start_time: defaultTime
        },
        {
          workout_template_id: t2.workout_template_id,
          day_of_week: 'wednesday',
          start_time: defaultTime
        },
        {
          workout_template_id: t3.workout_template_id,
          day_of_week: 'friday',
          start_time: defaultTime
        }
      ];

      var saveResult = this.logic.saveTrainingPlan('Balanced Week Plan', null, items);
      this.assert(saveResult && saveResult.success === true, 'saveTrainingPlan should succeed');
      this.assert(saveResult.training_plan_id, 'saveTrainingPlan should return training_plan_id');

      // Verify persistence via storage
      if (typeof localStorage !== 'undefined') {
        var plansJson = localStorage.getItem('training_plans') || '[]';
        var plans = JSON.parse(plansJson);
        this.assert(plans.length > 0, 'There should be at least one training plan saved');

        var itemsJson = localStorage.getItem('training_plan_items') || '[]';
        var planItems = JSON.parse(itemsJson);
        var relatedItems = planItems.filter(function (it) {
          return it.training_plan_id === saveResult.training_plan_id;
        });
        this.assert(relatedItems.length === 3, 'Training plan should have three items');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 5 ----------
  // Add the best-value nutrition coaching bundle under $250 to cart based on total minutes
  testTask5_AddBestValueNutritionBundle() {
    var testName = 'Task 5: Add best-value nutrition bundle under $250 based on total minutes';
    try {
      this.clearStorage();
      this.setupTestData();

      var overview = this.logic.getCoachingServicesOverview();
      this.assert(overview && Array.isArray(overview.categories), 'Coaching services overview should include categories');

      var nfOptions = this.logic.getNutritionBundleFilterOptions();
      this.assert(nfOptions && Array.isArray(nfOptions.product_types), 'Nutrition bundle filter options should include product_types');

      var filters = {
        product_type: 'bundle',
        max_price: 250,
        only_active: true
      };

      var searchResult = this.logic.searchNutritionBundles(filters, 'price_low_to_high', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchNutritionBundles should return results array');
      this.assert(searchResult.results.length >= 2, 'Should have at least two bundle results to compare');

      var results = searchResult.results;
      // Ensure filters and sort
      for (var i = 0; i < results.length; i++) {
        var b = results[i];
        this.assert(b.product_type === 'bundle', 'Product type should be bundle');
        this.assert(b.price <= filters.max_price, 'Bundle price should be <= max_price');
      }
      if (results.length > 1) {
        for (var j = 1; j < results.length; j++) {
          var prevPrice = results[j - 1].price;
          var currPrice = results[j].price;
          this.assert(currPrice >= prevPrice, 'Bundles should be sorted by price low to high');
        }
      }

      var firstBundle = results[0];
      var secondBundle = results[1];

      var detail1 = this.logic.getNutritionBundleDetail(firstBundle.bundle_id);
      var detail2 = this.logic.getNutritionBundleDetail(secondBundle.bundle_id);
      this.assert(detail1 && detail1.bundle, 'First bundle detail should be returned');
      this.assert(detail2 && detail2.bundle, 'Second bundle detail should be returned');

      var totalMinutes1 = detail1.bundle.total_minutes;
      var totalMinutes2 = detail2.bundle.total_minutes;

      var bestBundle = totalMinutes1 >= totalMinutes2 ? detail1.bundle : detail2.bundle;

      var preferredCoachId = null;
      var bestDetail = totalMinutes1 >= totalMinutes2 ? detail1 : detail2;
      if (Array.isArray(bestDetail.preferred_coaches) && bestDetail.preferred_coaches.length > 0) {
        preferredCoachId = bestDetail.preferred_coaches[0].coach_id;
      }

      var addResult = this.logic.addNutritionBundleToCart(
        bestBundle.id,
        preferredCoachId,
        30
      );
      this.assert(addResult && addResult.success === true, 'addNutritionBundleToCart should succeed');
      this.assert(addResult.cart_item_id, 'addNutritionBundleToCart should return cart_item_id');

      var cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should include items array');

      var cartItem = cartSummary.items.find(function (it) {
        return it.cart_item_id === addResult.cart_item_id;
      });
      this.assert(cartItem, 'Cart should contain the selected nutrition bundle');
      this.assert(cartItem.item_type === 'nutrition_bundle', 'Cart item type should be nutrition_bundle');
      this.assert(cartSummary.subtotal_one_off >= cartItem.subtotal_price, 'One-off subtotal should include bundle price');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 6 ----------
  // Join a free 7-day wellbeing email challenge starting next Monday at 8:00 am with selected themes
  testTask6_JoinFreeWellbeingChallenge() {
    var testName = 'Task 6: Join free 7-day wellbeing email challenge starting next Monday at 8:00';
    try {
      this.clearStorage();
      this.setupTestData();

      var cfOptions = this.logic.getChallengeFilterOptions();
      this.assert(cfOptions && Array.isArray(cfOptions.price_types), 'Challenge filter options should include price_types');

      var filters = {
        price_type: 'free',
        duration_days: 7,
        only_active: true
      };

      var searchResult = this.logic.searchChallenges(filters, 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchChallenges should return results array');
      this.assert(searchResult.results.length > 0, 'At least one free 7-day challenge should be available');

      var results = searchResult.results;
      var chosenChallenge = null;
      for (var i = 0; i < results.length; i++) {
        var c = results[i];
        if (c.name && c.name.toLowerCase().indexOf('wellbeing') !== -1) {
          chosenChallenge = c;
          break;
        }
      }
      if (!chosenChallenge) {
        chosenChallenge = results[0];
      }

      var detail = this.logic.getChallengeDetail(chosenChallenge.challenge_id);
      this.assert(detail && detail.challenge, 'getChallengeDetail should return challenge detail');
      this.assert(detail.challenge.delivery_channel === 'email', 'Challenge delivery_channel should be email');

      var availableThemes = detail.available_themes || [];
      var themeCodes = availableThemes.map(function (t) { return t.theme_code; });

      var selectedThemes = [];
      if (themeCodes.indexOf('sleep') !== -1) {
        selectedThemes.push('sleep');
      }
      if (themeCodes.indexOf('mindfulness') !== -1) {
        selectedThemes.push('mindfulness');
      }
      // If one of the desired themes is missing, fall back to any two themes
      if (selectedThemes.length === 0 && themeCodes.length > 0) {
        selectedThemes.push(themeCodes[0]);
      }
      if (selectedThemes.length === 1 && themeCodes.length > 1) {
        if (themeCodes[0] !== selectedThemes[0]) {
          selectedThemes.push(themeCodes[0]);
        } else {
          selectedThemes.push(themeCodes[1]);
        }
      }

      var baseline = this.getBaselineDate();
      // Monday = 1
      var nextMonday = this.getNextWeekdayDateString(baseline, 1);

      var registerResult = this.logic.registerForChallenge(
        detail.challenge.id,
        'Alex',
        'alex@example.com',
        nextMonday,
        '08:00',
        selectedThemes
      );

      this.assert(registerResult && registerResult.success === true, 'registerForChallenge should succeed');
      this.assert(registerResult.registration_id, 'registerForChallenge should return registration_id');
      this.assert(registerResult.start_date === nextMonday, 'Registered start_date should match selected date');
      this.assert(registerResult.preferred_email_time === '08:00', 'Preferred email time should be 08:00');

      // Ensure selected themes are echoed back
      if (Array.isArray(registerResult.selected_themes) && selectedThemes.length > 0) {
        for (var j = 0; j < selectedThemes.length; j++) {
          this.assert(
            registerResult.selected_themes.indexOf(selectedThemes[j]) !== -1,
            'Returned selected_themes should include ' + selectedThemes[j]
          );
        }
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 7 ----------
  // Save three short wellbeing articles from different topics to your reading list
  testTask7_SaveThreeShortArticles() {
    var testName = 'Task 7: Save three short articles (running, mental resilience, nutrition) to reading list';
    try {
      this.clearStorage();
      this.setupTestData();

      var acOptions = this.logic.getArticleCategoryOptions();
      this.assert(acOptions && Array.isArray(acOptions.categories), 'Article category options should be available');

      // 1) Injury prevention for runners, <10 min
      var search1 = this.logic.searchArticles(
        'injury prevention for runners',
        { max_read_time_minutes: 10 },
        1,
        20
      );
      this.assert(search1 && Array.isArray(search1.results), 'Article search 1 should return results');
      this.assert(search1.results.length > 0, 'At least one running injury prevention article should be found');

      var runningArticle = null;
      for (var i = 0; i < search1.results.length; i++) {
        var a = search1.results[i];
        var isRunning = a.category === 'running' || (Array.isArray(a.tags) && a.tags.indexOf('injury prevention') !== -1);
        if (isRunning && a.estimated_read_time_minutes < 10) {
          runningArticle = a;
          break;
        }
      }
      if (!runningArticle) {
        runningArticle = search1.results[0];
      }

      var runningDetail = this.logic.getArticleDetail(runningArticle.article_id);
      this.assert(runningDetail && runningDetail.article, 'Running article detail should be returned');

      var saveRes1 = this.logic.saveArticleToReadingList(runningDetail.article.id);
      this.assert(saveRes1 && saveRes1.success === true, 'First article should be saved successfully');

      // 2) Mental resilience, <10 min
      var search2 = this.logic.searchArticles(
        '',
        { category: 'mental_resilience', max_read_time_minutes: 10 },
        1,
        20
      );
      this.assert(search2 && Array.isArray(search2.results), 'Article search 2 should return results');
      this.assert(search2.results.length > 0, 'At least one mental resilience article should be found');

      var mentalArticle = search2.results[0];
      var mentalDetail = this.logic.getArticleDetail(mentalArticle.article_id);
      this.assert(mentalDetail && mentalDetail.article, 'Mental resilience article detail should be returned');

      var saveRes2 = this.logic.saveArticleToReadingList(mentalDetail.article.id);
      this.assert(saveRes2 && saveRes2.success === true, 'Second article should be saved');

      // 3) Nutrition, <10 min
      var search3 = this.logic.searchArticles(
        'nutrition',
        { category: 'nutrition', max_read_time_minutes: 10 },
        1,
        20
      );
      this.assert(search3 && Array.isArray(search3.results), 'Article search 3 should return results');
      this.assert(search3.results.length > 0, 'At least one nutrition article should be found');

      var nutritionArticle = search3.results[0];
      var nutritionDetail = this.logic.getArticleDetail(nutritionArticle.article_id);
      this.assert(nutritionDetail && nutritionDetail.article, 'Nutrition article detail should be returned');

      var saveRes3 = this.logic.saveArticleToReadingList(nutritionDetail.article.id);
      this.assert(saveRes3 && saveRes3.success === true, 'Third article should be saved');

      // Validate reading list
      var readingList = this.logic.getReadingListArticles();
      this.assert(readingList && Array.isArray(readingList.articles), 'getReadingListArticles should return articles array');
      this.assert(readingList.articles.length >= 3, 'Reading list should contain at least three articles');

      var categories = readingList.articles.map(function (a) { return a.category; });
      this.assert(categories.indexOf('running') !== -1, 'Reading list should contain a running article');
      this.assert(categories.indexOf('mental_resilience') !== -1, 'Reading list should contain a mental_resilience article');
      this.assert(categories.indexOf('nutrition') !== -1, 'Reading list should contain a nutrition article');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 8 ----------
  // Build a monthly gym + yoga subscription with combined cost under $180
  testTask8_BuildMonthlyGymYogaSubscription() {
    var testName = 'Task 8: Build monthly gym + yoga subscription under $180';
    try {
      this.clearStorage();
      this.setupTestData();

      var mfOptions = this.logic.getMembershipFilterOptions();
      this.assert(mfOptions && Array.isArray(mfOptions.billing_periods), 'Membership filter options should include billing_periods');

      var filters = {
        billing_period: 'monthly',
        requires_gym_access: true,
        max_price: 150
      };

      var mSearch = this.logic.searchMembershipPlans(filters, 1, 20);
      this.assert(mSearch && Array.isArray(mSearch.results), 'searchMembershipPlans should return results array');
      this.assert(mSearch.results.length > 0, 'At least one monthly gym membership should be available');

      // Choose cheapest membership to maximize yoga flexibility
      var memberships = mSearch.results;
      var chosenMembership = memberships[0];
      for (var i = 1; i < memberships.length; i++) {
        if (memberships[i].price < chosenMembership.price) {
          chosenMembership = memberships[i];
        }
      }

      var membershipDetail = this.logic.getMembershipPlanDetail(chosenMembership.membership_plan_id);
      this.assert(membershipDetail && membershipDetail.membership, 'getMembershipPlanDetail should return membership detail');

      var membershipPrice = membershipDetail.membership.price;

      var addMembershipRes = this.logic.addMembershipToCart(
        membershipDetail.membership.id,
        null
      );
      this.assert(addMembershipRes && addMembershipRes.success === true, 'addMembershipToCart should succeed');
      this.assert(addMembershipRes.cart_item_id, 'addMembershipToCart should return cart_item_id');

      var yoOptions = this.logic.getYogaAddOnFilterOptions();
      this.assert(yoOptions && Array.isArray(yoOptions.billing_periods), 'Yoga add-on filter options should include billing_periods');

      var ySearch = this.logic.searchYogaAddOns({ billing_period: 'monthly', min_classes_per_week: 1 }, 1, 20);
      this.assert(ySearch && Array.isArray(ySearch.results), 'searchYogaAddOns should return results array');
      this.assert(ySearch.results.length > 0, 'At least one yoga add-on should be available');

      var addOns = ySearch.results;
      // First choose the add-on with the most classes per week (may exceed budget)
      var firstAddOn = addOns[0];
      for (var j = 1; j < addOns.length; j++) {
        if (addOns[j].classes_per_week > firstAddOn.classes_per_week) {
          firstAddOn = addOns[j];
        }
      }

      var addAddOnRes1 = this.logic.addAddOnToCart(firstAddOn.add_on_id, null);
      this.assert(addAddOnRes1 && addAddOnRes1.success === true, 'First yoga add-on should be added to cart');
      this.assert(addAddOnRes1.cart_item_id, 'addAddOnToCart should return cart_item_id');

      var cartSummary1 = this.logic.getCartSummary();
      this.assert(cartSummary1 && typeof cartSummary1.subtotal_recurring_monthly === 'number', 'Cart summary should include recurring monthly subtotal');

      var totalRecurring1 = cartSummary1.subtotal_recurring_monthly;
      this.assert(totalRecurring1 >= membershipPrice + firstAddOn.price, 'Recurring subtotal should at least cover membership + first add-on');

      var finalAddOn = firstAddOn;

      // If total exceeds 180, remove current yoga add-on and choose a cheaper one
      if (totalRecurring1 > 180) {
        var addOnCartItem = cartSummary1.items.find(function (it) {
          return it.item_type === 'add_on';
        });
        this.assert(addOnCartItem, 'Cart should contain a yoga add-on item to remove');

        var removeRes = this.logic.removeCartItem(addOnCartItem.cart_item_id);
        this.assert(removeRes && removeRes.success === true, 'removeCartItem should succeed for yoga add-on');

        // Choose a cheaper yoga add-on
        var cheaperAddOns = addOns.filter(function (a) {
          return a.price < firstAddOn.price && a.classes_per_week >= 1;
        });
        this.assert(cheaperAddOns.length > 0, 'There should be at least one cheaper yoga add-on option');

        // From cheaper ones, pick the one with most classes per week while staying within budget
        var bestUnderBudget = null;
        for (var k = 0; k < cheaperAddOns.length; k++) {
          var candidate = cheaperAddOns[k];
          var combined = membershipPrice + candidate.price;
          if (combined <= 180) {
            if (!bestUnderBudget || candidate.classes_per_week > bestUnderBudget.classes_per_week) {
              bestUnderBudget = candidate;
            }
          }
        }
        // Fallback: just choose the cheapest cheaper add-on if budget condition cannot be evaluated
        if (!bestUnderBudget) {
          bestUnderBudget = cheaperAddOns[0];
        }
        finalAddOn = bestUnderBudget;

        var addAddOnRes2 = this.logic.addAddOnToCart(finalAddOn.add_on_id, null);
        this.assert(addAddOnRes2 && addAddOnRes2.success === true, 'Second yoga add-on (cheaper) should be added to cart');
        this.assert(addAddOnRes2.cart_item_id, 'Second add-on addition should return cart_item_id');
      }

      var cartSummaryFinal = this.logic.getCartSummary();
      this.assert(cartSummaryFinal && typeof cartSummaryFinal.subtotal_recurring_monthly === 'number', 'Final cart summary should have recurring subtotal');

      var totalRecurringFinal = cartSummaryFinal.subtotal_recurring_monthly;
      this.assert(totalRecurringFinal <= 180, 'Combined monthly total should be under or equal to 180');

      // Ensure membership and yoga add-on are both present
      var membershipItem = cartSummaryFinal.items.find(function (it) { return it.item_type === 'membership'; });
      var yogaItem = cartSummaryFinal.items.find(function (it) { return it.item_type === 'add_on'; });
      this.assert(membershipItem, 'Cart should contain a membership item');
      this.assert(yogaItem, 'Cart should contain a yoga add-on item');

      // Proceed to checkout summary
      var checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && Array.isArray(checkoutSummary.items), 'getCheckoutSummary should return items array');
      this.assert(checkoutSummary.subtotal_recurring_monthly === totalRecurringFinal, 'Checkout recurring subtotal should match cart recurring subtotal');

      // Place order for this subscription
      var orderRes = this.logic.placeOrder(
        'Test User',
        'testuser@example.com',
        '123456789',
        '123 Test Street',
        'card',
        'Test order for membership + yoga add-on'
      );
      this.assert(orderRes && orderRes.success === true, 'placeOrder should succeed');
      this.assert(orderRes.order_id, 'placeOrder should return order_id');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
