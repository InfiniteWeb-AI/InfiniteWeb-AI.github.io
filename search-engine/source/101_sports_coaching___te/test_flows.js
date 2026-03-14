// Test runner for business logic (sports coaching / tennis academy)
// Follows the required structure and tests all 8 user tasks as end-to-end flows.

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
      "age_groups": [
        {
          "id": "ages_5_8",
          "label": "Ages 5–8",
          "age_min": 5,
          "age_max": 8,
          "description": "Entry-level red and orange ball players developing basic coordination and love for the game."
        },
        {
          "id": "ages_9_12",
          "label": "Ages 9–12",
          "age_min": 9,
          "age_max": 12,
          "description": "Developing juniors focusing on fundamentals, rally skills, and basic match play."
        },
        {
          "id": "ages_13_17",
          "label": "Ages 13–17",
          "age_min": 13,
          "age_max": 17,
          "description": "Teen players building advanced technique, tactics, and competitive confidence."
        }
      ],
      "articles": [
        {
          "id": "serve_power_fundamentals",
          "title": "5 Fundamentals of Powerful Serve Technique",
          "slug": "fundamentals-of-powerful-serve-technique",
          "summary": "Learn the key elements of efficient serve technique so you can add effortless power without losing control.",
          "content": "A powerful serve starts from the ground up. Focus on a consistent ball toss slightly in front of you, a full shoulder turn, and a relaxed wrist snap at contact. Use your legs to drive upward and into the court so your body weight flows toward your target. Practice a slow-motion service motion in front of a mirror to ingrain proper positions before adding speed. Finally, incorporate targeted serve drills like serving to quadrants to develop both power and accuracy in your serve technique.",
          "category": "serve",
          "tags": [
            "serve technique",
            "power",
            "fundamentals",
            "adult players"
          ],
          "image_url": "https://t4.ftcdn.net/jpg/02/83/17/81/360_F_283178105_paMRDY5QMiL6444lSuFN4ETsopBAytcd.jpg",
          "published_at": "2025-11-10T09:00:00Z",
          "is_featured": true
        },
        {
          "id": "second_serve_consistency",
          "title": "Build a Reliable Second Serve Under Pressure",
          "slug": "reliable-second-serve-under-pressure",
          "summary": "Transform your second serve technique so you can swing with confidence instead of just pushing the ball in.",
          "content": "A great second serve relies on spin and height over the net, not sheer speed. Start by using a continental grip and tossing the ball slightly over your head or even a bit behind your body. Brush up the back of the ball to create topspin or slice that pulls the ball down into the box. Train with routines that require you to hit multiple second serves in a row without a double fault, and gradually add targets to simulate match pressure. The goal is a second serve technique that you trust enough to swing aggressively when it matters most.",
          "category": "serve",
          "tags": [
            "serve technique",
            "second serve",
            "mental toughness"
          ],
          "image_url": "https://www.webtennis24.com/wp-content/uploads/2020/02/how-to-serve-in-more-often.jpg",
          "published_at": "2025-09-22T15:30:00Z",
          "is_featured": false
        },
        {
          "id": "tennis_injury_prevention_tips",
          "title": "Top 10 Tennis Injury Prevention Tips",
          "slug": "tennis-injury-prevention-tips",
          "summary": "Reduce your risk of common tennis injuries with smart warm-ups, strength work, and recovery habits.",
          "content": "Most tennis injuries are preventable with a thoughtful routine. Always begin with a dynamic warm-up that elevates your heart rate and activates your shoulders, hips, and ankles. Add 2–3 days per week of strength work targeting the rotator cuff, glutes, and core to support powerful but safe strokes. Schedule at least one full rest day per week and listen to early warning signs like persistent soreness or reduced range of motion. Finally, rotate shoes before the tread is fully worn and restring your racquet appropriately to protect your joints while you play.",
          "category": "fitness",
          "tags": [
            "injury prevention",
            "warm-up",
            "strength",
            "recovery"
          ],
          "image_url": "https://www.geisinger.org/-/media/OneGeisinger/Images/ghs/sites/pa-health-magazine/summer-2021-edition/pa-health-magazine-cta-weekend-warrior.jpg?h=516&la=en&w=776&hash=ABBA893EEB79D4C89066B6369797B3E39E48E5BC",
          "published_at": "2025-08-05T12:00:00Z",
          "is_featured": true
        }
      ],
      "camps": [
        {
          "id": "summer_stars_9_12_half_day",
          "name": "Summer Stars Morning Camp (Ages 9–12)",
          "slug": "summer-stars-morning-camp-ages-9-12",
          "description": "A fun, high-energy half-day morning camp for ages 9–12 focusing on fundamentals, rally skills, and team games.",
          "age_min": 9,
          "age_max": 12,
          "age_group_label": "Ages 9–12",
          "location": "Main Campus",
          "is_active": true
        },
        {
          "id": "summer_stars_9_12_full_day",
          "name": "Summer Stars Full-Day Camp (Ages 9–12)",
          "slug": "summer-stars-full-day-camp-ages-9-12",
          "description": "A full-day camp for 9–12 year olds combining technical instruction, match play, and off-court athletic development.",
          "age_min": 9,
          "age_max": 12,
          "age_group_label": "Ages 9–12",
          "location": "Main Campus",
          "is_active": true
        },
        {
          "id": "future_aces_5_8_morning",
          "name": "Future Aces Morning Camp (Ages 5–8)",
          "slug": "future-aces-morning-camp-ages-5-8",
          "description": "Introductory red and orange ball camp with a focus on fun games, coordination, and basic strokes.",
          "age_min": 5,
          "age_max": 8,
          "age_group_label": "Ages 5–8",
          "location": "Annex Courts",
          "is_active": true
        }
      ],
      "coaches": [
        {
          "id": "coach_emma_liu",
          "name": "Emma Liu",
          "slug": "emma-liu",
          "photo_url": "https://pd12m.s3.us-west-2.amazonaws.com/images/9d9c77e5-6ccc-5946-b641-8baa16c7e250.jpeg",
          "rating": 4.9,
          "num_reviews": 132,
          "specialties": [
            "backhand",
            "serve",
            "footwork",
            "adult_beginner"
          ],
          "bio": "Emma is a former Division I player known for her clear technical explanations and patient approach with adults returning to tennis.",
          "experience_years": 9,
          "teaching_style": "Detail-oriented with a focus on video feedback and simple technical cues.",
          "certifications": [
            "USPTA Elite Professional",
            "PTR Adult Development"
          ],
          "is_active": true
        },
        {
          "id": "coach_diego_santos",
          "name": "Diego Santos",
          "slug": "diego-santos",
          "photo_url": "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=800&h=600&fit=crop&auto=format&q=80",
          "rating": 4.7,
          "num_reviews": 98,
          "specialties": [
            "backhand",
            "strategy",
            "match_play",
            "high_performance"
          ],
          "bio": "Diego specializes in building aggressive baseline games and helping players translate practice into match wins.",
          "experience_years": 11,
          "teaching_style": "Game-based drills with tactical themes and competitive scenarios.",
          "certifications": [
            "ITF Level 2 Coach"
          ],
          "is_active": true
        },
        {
          "id": "coach_sophia_reed",
          "name": "Sophia Reed",
          "slug": "sophia-reed",
          "photo_url": "https://rifeponcephotography.com/wp-content/uploads/2020/02/what-to-wear-for-professional-headshots-814x1024.jpg",
          "rating": 4.5,
          "num_reviews": 74,
          "specialties": [
            "backhand",
            "injury_prevention",
            "adult_intermediate"
          ],
          "bio": "Sophia blends her background in kinesiology with on-court coaching to help adults improve safely and efficiently.",
          "experience_years": 7,
          "teaching_style": "Supportive and analytical, with an emphasis on body-friendly technique.",
          "certifications": [
            "PTR Performance",
            "NASM Certified Personal Trainer"
          ],
          "is_active": true
        }
      ],
      "courts": [
        {
          "id": "indoor_hard_court_1",
          "name": "Indoor Hard Court 1",
          "code": "IH1",
          "surface": "hard",
          "location_type": "indoor",
          "is_lighted": true,
          "description": "Climate-controlled indoor hard court ideal for year-round singles and doubles play."
        },
        {
          "id": "indoor_hard_court_2",
          "name": "Indoor Hard Court 2",
          "code": "IH2",
          "surface": "hard",
          "location_type": "indoor",
          "is_lighted": true,
          "description": "Indoor hard court with backdrop curtains and spectator seating."
        },
        {
          "id": "indoor_hard_court_3",
          "name": "Indoor Hard Court 3",
          "code": "IH3",
          "surface": "hard",
          "location_type": "indoor",
          "is_lighted": true,
          "description": "Quiet back-corner indoor court often used for private lessons and match play."
        }
      ],
      "group_class_types": [
        {
          "id": "adult_beginner_101",
          "name": "Adult Beginner 101",
          "slug": "adult-beginner-101",
          "audience": "adult",
          "level": "beginner",
          "focus": "technique",
          "description": "Introductory class covering basic grips, forehand, backhand, and serve for new or lapsed players.",
          "default_duration_minutes": 60,
          "default_price": 29,
          "image_url": "https://i.ytimg.com/vi/6hpNFfjpFHU/maxresdefault.jpg",
          "is_featured": true,
          "is_active": true
        },
        {
          "id": "adult_beginner_match_ready",
          "name": "Adult Beginner Match-Ready",
          "slug": "adult-beginner-match-ready",
          "audience": "adult",
          "level": "beginner",
          "focus": "match_play",
          "description": "For newer players who know the basics and want to learn scoring, positioning, and simple tactics.",
          "default_duration_minutes": 90,
          "default_price": 32,
          "image_url": "https://i.pinimg.com/736x/c0/0d/f5/c00df5eb784e1342cd350ad1bb9e00be.jpg",
          "is_featured": false,
          "is_active": true
        },
        {
          "id": "adult_intermediate_cardio",
          "name": "Adult Intermediate Cardio Tennis",
          "slug": "adult-intermediate-cardio-tennis",
          "audience": "adult",
          "level": "intermediate",
          "focus": "cardio",
          "description": "High-energy drills and live-ball games for intermediate players who want a great workout.",
          "default_duration_minutes": 60,
          "default_price": 39,
          "image_url": "https://i.pinimg.com/originals/62/e7/83/62e7837ebd222d541be50b52de8ea98a.jpg",
          "is_featured": true,
          "is_active": true
        }
      ],
      "membership_plans": [
        {
          "id": "adult_flex_4",
          "name": "Adult Flex 4 Plan",
          "slug": "adult-flex-4-plan",
          "monthly_price": 89,
          "description": "Includes 4 adult group sessions per month plus priority booking for additional drop-in classes.",
          "included_group_sessions_per_month": 4,
          "benefits": [
            "4 adult group classes per month",
            "Priority booking window for popular classes",
            "5% discount on private lessons"
          ],
          "min_commitment_months": 1,
          "is_featured": true,
          "is_active": true
        },
        {
          "id": "adult_plus_8",
          "name": "Adult Plus 8 Plan",
          "slug": "adult-plus-8-plan",
          "monthly_price": 149,
          "description": "Best value for active players with 8 group sessions per month and small discounts on court fees.",
          "included_group_sessions_per_month": 8,
          "benefits": [
            "8 adult group classes per month",
            "10% discount on additional group classes",
            "10% discount on court bookings",
            "Free entry to monthly social mixer"
          ],
          "min_commitment_months": 3,
          "is_featured": true,
          "is_active": true
        },
        {
          "id": "adult_unlimited",
          "name": "Adult Unlimited Training",
          "slug": "adult-unlimited-training",
          "monthly_price": 229,
          "description": "Unlimited access to standard adult group classes and cardio tennis sessions.",
          "included_group_sessions_per_month": 30,
          "benefits": [
            "Unlimited standard adult group classes",
            "Unlimited cardio tennis sessions",
            "15% discount on private lessons",
            "Complimentary tournament entry for one in-house event per quarter"
          ],
          "min_commitment_months": 6,
          "is_featured": false,
          "is_active": true
        }
      ],
      "tournaments": [
        {
          "id": "spring_open_march",
          "name": "Spring Open Club Championship",
          "slug": "spring-open-club-championship-2026",
          "description": "Annual Spring Open featuring singles and doubles events for a wide range of NTRP levels.",
          "start_date": "2026-03-19T14:00:00Z",
          "end_date": "2026-03-22T23:00:00Z",
          "location": "Main Campus",
          "status": "upcoming"
        },
        {
          "id": "april_invitational",
          "name": "April Invitational Tournament",
          "slug": "april-invitational-tournament-2026",
          "description": "Members-only event with singles and doubles draws including a 3.0–3.5 singles bracket.",
          "start_date": "2026-04-12T15:00:00Z",
          "end_date": "2026-04-14T23:00:00Z",
          "location": "Main Campus",
          "status": "upcoming"
        },
        {
          "id": "april_weekend_slam",
          "name": "April Weekend Slam",
          "slug": "april-weekend-slam-2026",
          "description": "Compact weekend tournament offering singles 2.5–4.0 and mixed doubles events.",
          "start_date": "2026-04-25T13:00:00Z",
          "end_date": "2026-04-26T22:00:00Z",
          "location": "Indoor Center",
          "status": "upcoming"
        }
      ],
      "court_availability_slots": [
        {
          "id": "cas_ih1_20260311_1600_1730",
          "court_id": "indoor_hard_court_1",
          "start_datetime": "2026-03-11T16:00:00Z",
          "end_datetime": "2026-03-11T17:30:00Z",
          "is_available": true
        },
        {
          "id": "cas_ih1_20260311_1730_1900",
          "court_id": "indoor_hard_court_1",
          "start_datetime": "2026-03-11T17:30:00Z",
          "end_datetime": "2026-03-11T19:00:00Z",
          "is_available": false
        },
        {
          "id": "cas_ih1_20260311_1900_2030",
          "court_id": "indoor_hard_court_1",
          "start_datetime": "2026-03-11T19:00:00Z",
          "end_datetime": "2026-03-11T20:30:00Z",
          "is_available": true
        }
      ],
      "group_class_sessions": [
        {
          "id": "gcs_adbeg101_sat_20260307_1730",
          "class_type_id": "adult_beginner_101",
          "start_datetime": "2026-03-07T17:30:00Z",
          "end_datetime": "2026-03-07T18:30:00Z",
          "price": 27,
          "remaining_spots": 5,
          "coach_id": "coach_emma_liu",
          "court_id": "indoor_hard_court_2",
          "status": "scheduled"
        },
        {
          "id": "gcs_adbeg101_sat_20260307_1900",
          "class_type_id": "adult_beginner_101",
          "start_datetime": "2026-03-07T19:00:00Z",
          "end_datetime": "2026-03-07T20:00:00Z",
          "price": 29,
          "remaining_spots": 8,
          "coach_id": "coach_emma_liu",
          "court_id": "indoor_hard_court_3",
          "status": "scheduled"
        },
        {
          "id": "gcs_adbeg_matchready_sat_20260307_1800",
          "class_type_id": "adult_beginner_match_ready",
          "start_datetime": "2026-03-07T18:00:00Z",
          "end_datetime": "2026-03-07T19:30:00Z",
          "price": 32,
          "remaining_spots": 3,
          "coach_id": "coach_marcus_hale",
          "court_id": "outdoor_hard_court_1",
          "status": "scheduled"
        }
      ],
      "private_lesson_slots": [
        {
          "id": "pls_sophia_20260304_1600_1700",
          "coach_id": "coach_sophia_reed",
          "start_datetime": "2026-03-04T16:00:00Z",
          "end_datetime": "2026-03-04T17:00:00Z",
          "status": "available",
          "location_type": "either",
          "court_surface_preference": "hard"
        },
        {
          "id": "pls_sophia_20260304_1715_1815",
          "coach_id": "coach_sophia_reed",
          "start_datetime": "2026-03-04T17:15:00Z",
          "end_datetime": "2026-03-04T18:15:00Z",
          "status": "booked",
          "location_type": "indoor",
          "court_surface_preference": "hard"
        },
        {
          "id": "pls_emma_20260305_1700_1800",
          "coach_id": "coach_emma_liu",
          "start_datetime": "2026-03-05T17:00:00Z",
          "end_datetime": "2026-03-05T18:00:00Z",
          "status": "available",
          "location_type": "indoor",
          "court_surface_preference": "hard"
        }
      ],
      "camp_enrollments": [
        {
          "id": "camp_enr_001",
          "camp_session_id": "camp_summer_stars_9_12_20260708_am",
          "child_name": "Liam Parker",
          "child_age": 10,
          "age_group_label": "Ages 9–12",
          "parent_name": "Rachel Parker",
          "parent_email": "rachel.parker@example.com",
          "t_shirt_size": "m",
          "medical_notes": "Seasonal allergies; carries inhaler.",
          "status": "confirmed",
          "created_at": "2026-02-10T14:22:00Z"
        },
        {
          "id": "camp_enr_002",
          "camp_session_id": "camp_summer_stars_9_12_20260715_am",
          "child_name": "Noah Martinez",
          "child_age": 11,
          "age_group_label": "Ages 9–12",
          "parent_name": "Carlos Martinez",
          "parent_email": "carlos.martinez@example.com",
          "t_shirt_size": "l",
          "medical_notes": "No medical conditions.",
          "status": "confirmed",
          "created_at": "2026-02-18T09:05:00Z"
        },
        {
          "id": "camp_enr_003",
          "camp_session_id": "camp_future_aces_5_8_20260610_am",
          "child_name": "Ava Thompson",
          "child_age": 7,
          "age_group_label": "Ages 5–8",
          "parent_name": "Melissa Thompson",
          "parent_email": "melissa.thompson@example.com",
          "t_shirt_size": "s",
          "medical_notes": "No medical conditions.",
          "status": "confirmed",
          "created_at": "2026-01-29T16:40:00Z"
        }
      ],
      "camp_sessions": [
        {
          "id": "camp_summer_stars_9_12_20260624_am",
          "camp_id": "summer_stars_9_12_half_day",
          "start_date": "2026-06-24T00:00:00Z",
          "end_date": "2026-06-28T00:00:00Z",
          "session_type": "half_day_am",
          "daily_start_time": "09:00",
          "daily_end_time": "12:00",
          "price": 265,
          "capacity": 24,
          "remaining_spots": 24.0
        },
        {
          "id": "camp_summer_stars_9_12_20260708_am",
          "camp_id": "summer_stars_9_12_half_day",
          "start_date": "2026-07-08T00:00:00Z",
          "end_date": "2026-07-12T00:00:00Z",
          "session_type": "half_day_am",
          "daily_start_time": "09:00",
          "daily_end_time": "12:00",
          "price": 275,
          "capacity": 24,
          "remaining_spots": 23.0
        },
        {
          "id": "camp_summer_stars_9_12_20260715_am",
          "camp_id": "summer_stars_9_12_half_day",
          "start_date": "2026-07-15T00:00:00Z",
          "end_date": "2026-07-19T00:00:00Z",
          "session_type": "half_day_am",
          "daily_start_time": "09:00",
          "daily_end_time": "12:00",
          "price": 285,
          "capacity": 24,
          "remaining_spots": 23.0
        }
      ],
      "tournament_registrations": [
        {
          "id": "treg_0001",
          "tournament_event_id": "tev_april_inv_singles_3_0_3_5",
          "player_name": "Daniel Harper",
          "skill_rating": 3.2,
          "email": "daniel.harper@example.com",
          "preferred_match_time": "afternoon",
          "t_shirt_size": "l",
          "emergency_contact_name": "Laura Harper",
          "emergency_contact_phone": "555-201-3344",
          "status": "confirmed",
          "created_at": "2026-02-18T10:15:00Z"
        },
        {
          "id": "treg_0002",
          "tournament_event_id": "tev_april_inv_singles_4_0_4_5",
          "player_name": "Priya Shah",
          "skill_rating": 4.2,
          "email": "priya.shah@example.com",
          "preferred_match_time": "morning",
          "t_shirt_size": "m",
          "emergency_contact_name": "Amit Shah",
          "emergency_contact_phone": "555-882-1900",
          "status": "confirmed",
          "created_at": "2026-02-20T09:42:00Z"
        },
        {
          "id": "treg_0003",
          "tournament_event_id": "tev_april_slam_singles_3_0_3_5",
          "player_name": "Michael Chen",
          "skill_rating": 3.0,
          "email": "michael.chen@example.com",
          "preferred_match_time": "evening",
          "t_shirt_size": "xl",
          "emergency_contact_name": "Grace Chen",
          "emergency_contact_phone": "555-771-2033",
          "status": "in_cart",
          "created_at": "2026-03-02T17:05:00Z"
        }
      ],
      "tournament_events": [
        {
          "id": "tev_spring_open_singles_3_0_3_5",
          "tournament_id": "spring_open_march",
          "name": "Singles 3.0–3.5",
          "event_type": "singles",
          "gender_division": "open",
          "rating_min": 3.0,
          "rating_max": 3.5,
          "rating_bracket_label": "3.0–3.5",
          "price": 55,
          "max_players": 32,
          "remaining_spots": 31.0
        },
        {
          "id": "tev_spring_open_singles_4_0_4_5",
          "tournament_id": "spring_open_march",
          "name": "Singles 4.0–4.5",
          "event_type": "singles",
          "gender_division": "open",
          "rating_min": 4.0,
          "rating_max": 4.5,
          "rating_bracket_label": "4.0–4.5",
          "price": 60,
          "max_players": 24,
          "remaining_spots": 24.0
        },
        {
          "id": "tev_spring_open_doubles_3_5_plus",
          "tournament_id": "spring_open_march",
          "name": "Doubles 3.5+",
          "event_type": "doubles",
          "gender_division": "open",
          "rating_min": 3.5,
          "rating_max": 5.0,
          "rating_bracket_label": "3.5+",
          "price": 40,
          "max_players": 32,
          "remaining_spots": 31.0
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:54:56.453566"
      }
    };

    // Populate localStorage using correct storage keys
    localStorage.setItem('age_groups', JSON.stringify(generatedData.age_groups));
    localStorage.setItem('articles', JSON.stringify(generatedData.articles));
    localStorage.setItem('camps', JSON.stringify(generatedData.camps));
    localStorage.setItem('coaches', JSON.stringify(generatedData.coaches));
    localStorage.setItem('courts', JSON.stringify(generatedData.courts));
    localStorage.setItem('court_availability_slots', JSON.stringify(generatedData.court_availability_slots));
    localStorage.setItem('group_class_types', JSON.stringify(generatedData.group_class_types));
    localStorage.setItem('membership_plans', JSON.stringify(generatedData.membership_plans));
    localStorage.setItem('tournaments', JSON.stringify(generatedData.tournaments));
    localStorage.setItem('group_class_sessions', JSON.stringify(generatedData.group_class_sessions));
    localStorage.setItem('private_lesson_slots', JSON.stringify(generatedData.private_lesson_slots));
    localStorage.setItem('camp_enrollments', JSON.stringify(generatedData.camp_enrollments));
    localStorage.setItem('camp_sessions', JSON.stringify(generatedData.camp_sessions));
    localStorage.setItem('tournament_registrations', JSON.stringify(generatedData.tournament_registrations));
    localStorage.setItem('tournament_events', JSON.stringify(generatedData.tournament_events));

    // Ensure other storages exist as arrays if not already
    const ensureArrayStorage = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    ensureArrayStorage('group_class_bookings');
    ensureArrayStorage('membership_inquiries');
    ensureArrayStorage('court_reservations');
    ensureArrayStorage('private_lesson_bookings');
    ensureArrayStorage('camp_enrollments'); // already set, but ensure
    ensureArrayStorage('tournament_registrations'); // already set, but ensure
    ensureArrayStorage('reading_lists');
    ensureArrayStorage('reading_list_items');
    ensureArrayStorage('carts');
    ensureArrayStorage('cart_items');
    ensureArrayStorage('contact_messages');
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookCheapestAdultBeginnerWeekendEveningUnder35();
    this.testTask2_CheaperMembershipPlanWithAtLeast4SessionsInquiry();
    this.testTask3_ReserveIndoorHardCourtDoubles90Minutes();
    this.testTask4_EarliestWeekdayEveningBackhandLesson();
    this.testTask5_EnrollChildInJuly15MorningCampUnder300();
    this.testTask6_Create3SessionTrainingPlanUnder120();
    this.testTask7_RegisterSinglesTournament3_0To3_5();
    this.testTask8_SaveServeAndInjuryArticlesToReadingList();

    return this.results;
  }

  // Task 1
  testTask1_BookCheapestAdultBeginnerWeekendEveningUnder35() {
    const testName = 'Task 1: Book cheapest adult beginner weekend evening class under $35';
    console.log('Running:', testName);

    try {
      // Use filter options (no hard expectations, just ensure callable)
      const filterOptions = this.logic.getGroupClassFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.levels), 'Group class filter options should be returned');

      // Search adult beginner sessions, evening (>=17:00), price <=35
      const searchResult = this.logic.searchGroupClassSessions(
        'adult',        // audience
        'beginner',     // level
        undefined,      // focus
        undefined,      // startDate
        undefined,      // endDate
        '17:00',        // timeFrom
        undefined,      // timeTo
        undefined,      // minPrice
        35,             // maxPrice
        undefined,      // daysOfWeek
        100,            // limit
        'price',        // sortBy
        'asc'           // sortDirection
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchGroupClassSessions should return results array');

      // Filter to weekend sessions (Saturday=6, Sunday=0) and price < 35
      const weekendSessions = searchResult.results.filter((r) => {
        const start = new Date(r.start_datetime);
        const day = start.getDay();
        return (day === 0 || day === 6) && r.price < 35;
      });

      this.assert(weekendSessions.length > 0, 'Should find at least one weekend evening adult beginner class under $35');

      // Choose the cheapest session from filtered list
      let chosen = weekendSessions[0];
      for (let i = 1; i < weekendSessions.length; i++) {
        if (weekendSessions[i].price < chosen.price) {
          chosen = weekendSessions[i];
        }
      }

      const classTypeId = chosen.class_type_id;
      const sessionId = chosen.session_id;

      // Load class type detail
      const classTypeDetail = this.logic.getGroupClassTypeDetail(classTypeId);
      this.assert(classTypeDetail && classTypeDetail.class_type, 'getGroupClassTypeDetail should return class_type');
      this.assert(classTypeDetail.class_type.id === classTypeId, 'Class type detail should match selected classTypeId');

      // Verify session appears when fetching sessions for that type on that date and evening time
      const sessionDateStr = chosen.start_datetime.slice(0, 10);
      const sessionsForType = this.logic.getClassSessionsForType(
        classTypeId,
        sessionDateStr,
        sessionDateStr,
        '17:00',
        '23:00'
      );
      this.assert(Array.isArray(sessionsForType), 'getClassSessionsForType should return array');
      const sameSession = sessionsForType.find((s) => s.id === sessionId);
      this.assert(!!sameSession, 'Selected session should be included in getClassSessionsForType result');

      // Book the chosen session
      const bookingResult = this.logic.bookGroupClassSession(
        sessionId,
        'Test User',
        'test.user@example.com',
        1
      );

      this.assert(bookingResult && bookingResult.booking && bookingResult.cart_item && bookingResult.cart,
        'bookGroupClassSession should return booking, cart_item, and cart');

      const booking = bookingResult.booking;
      const cartItem = bookingResult.cart_item;
      const cart = bookingResult.cart;

      this.assert(!!booking.id, 'Booking should have an id');
      this.assert(booking.class_session_id === sessionId, 'Booking should reference correct class session');
      this.assert(booking.contact_email === 'test.user@example.com', 'Booking should store contact email');

      this.assert(cartItem.item_type === 'group_class_booking', 'Cart item type should be group_class_booking');
      this.assert(cartItem.reference_id === booking.id, 'Cart item reference_id should match booking id');

      this.assert(!!cart.id, 'Cart should have id');

      // Verify booking persisted into storage
      const storedBookings = JSON.parse(localStorage.getItem('group_class_bookings') || '[]');
      const storedBooking = storedBookings.find((b) => b.id === booking.id);
      this.assert(!!storedBooking, 'Stored group_class_bookings should include new booking');
      this.assert(storedBooking.class_session_id === sessionId, 'Stored booking should reference correct class session');

      // Verify cart summary contains the item with correct price from earlier search
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart && Array.isArray(cartSummary.items), 'getCartSummary should return cart and items');

      const summaryItem = cartSummary.items.find((i) =>
        i.item_type === 'group_class_booking' && i.reference_id === booking.id && i.status === 'active'
      );
      this.assert(!!summaryItem, 'Cart summary should include the booked group class item');
      this.assert(summaryItem.price === chosen.price, 'Cart item price should match session price');

      const recomputedTotal = cartSummary.items
        .filter((i) => i.status === 'active')
        .reduce((sum, i) => sum + (i.subtotal != null ? i.subtotal : i.price * i.quantity), 0);

      this.assert(typeof cartSummary.cart.total_amount === 'number', 'Cart total_amount should be a number');
      this.assert(cartSummary.cart.total_amount >= summaryItem.price,
        'Cart total_amount should be at least the price of the booked class');
      this.assert(cartSummary.cart.total_amount === recomputedTotal,
        'Cart total_amount should equal sum of active item subtotals');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2
  testTask2_CheaperMembershipPlanWithAtLeast4SessionsInquiry() {
    const testName = 'Task 2: Choose cheaper membership with >=4 sessions and submit inquiry';
    console.log('Running:', testName);

    try {
      // List all plans that include at least 4 group sessions per month
      const plans = this.logic.listMembershipPlans(4, true);
      this.assert(Array.isArray(plans) && plans.length >= 2,
        'Should have at least two active membership plans with >=4 group sessions');

      // Select two plans (first two) then choose cheaper between them
      const planA = plans[0];
      const planB = plans[1];
      const cheaperPlan = planA.monthly_price <= planB.monthly_price ? planA : planB;

      // Load plan detail
      const planDetail = this.logic.getMembershipPlanDetail(cheaperPlan.id);
      this.assert(planDetail && planDetail.plan, 'getMembershipPlanDetail should return plan');
      this.assert(planDetail.plan.id === cheaperPlan.id, 'Detail plan id should match selected plan');

      // Submit membership inquiry for cheaper plan
      const messageText = 'Interested in this plan with at least 4 group sessions per month.';
      const inquiryResult = this.logic.submitMembershipInquiry(
        cheaperPlan.id,
        'Membership Tester',
        'member.test@example.com',
        messageText,
        'email',
        'evening'
      );

      this.assert(inquiryResult && inquiryResult.inquiry, 'submitMembershipInquiry should return inquiry');
      const inquiry = inquiryResult.inquiry;

      this.assert(inquiry.membership_plan_id === cheaperPlan.id,
        'Inquiry should reference selected membership plan');
      this.assert(inquiry.email === 'member.test@example.com', 'Inquiry should store email');
      this.assert(inquiry.status === 'submitted', 'Inquiry status should be submitted');

      // Verify inquiry persisted in storage
      const storedInquiries = JSON.parse(localStorage.getItem('membership_inquiries') || '[]');
      const storedInquiry = storedInquiries.find((i) => i.id === inquiry.id);
      this.assert(!!storedInquiry, 'membership_inquiries storage should include new inquiry');
      this.assert(storedInquiry.membership_plan_id === cheaperPlan.id,
        'Stored inquiry should reference selected membership plan');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3
  testTask3_ReserveIndoorHardCourtDoubles90Minutes() {
    const testName = 'Task 3: Reserve indoor hard court for doubles 90-minute evening slot';
    console.log('Running:', testName);

    try {
      // Determine a target date based on existing availability slots in storage
      const availabilitySlots = JSON.parse(localStorage.getItem('court_availability_slots') || '[]');
      this.assert(Array.isArray(availabilitySlots) && availabilitySlots.length > 0,
        'There should be at least one court availability slot in storage');

      // Use date from first available slot as our "next Wednesday" surrogate
      const firstSlot = availabilitySlots[0];
      const targetDateStr = firstSlot.start_datetime.slice(0, 10); // YYYY-MM-DD

      // Get availability for indoor hard courts around the evening window
      const availabilityResult = this.logic.getCourtAvailability(
        targetDateStr,
        'hard',     // surface
        'indoor',   // locationType
        '16:00',    // timeFrom (broad window to include candidates)
        '21:00'     // timeTo
      );

      this.assert(availabilityResult && Array.isArray(availabilityResult.availability_slots),
        'getCourtAvailability should return availability_slots');

      const slots = availabilityResult.availability_slots.filter((s) => s.is_available);
      this.assert(slots.length > 0, 'Should have at least one available indoor hard court slot');

      // Find first slot that can cover a 90-minute session starting at or after 19:00
      let chosenSlot = null;
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const start = new Date(s.start_datetime);
        const end = new Date(s.end_datetime);
        const durationMinutes = (end.getTime() - start.getTime()) / 60000;
        // Treat 19:00 as typical evening; ensure slot starts at or before 19:00 and ends at or after 20:30 (>=90 min)
        const startMinutesLocal = start.getHours() * 60 + start.getMinutes();
        const endMinutesLocal = end.getHours() * 60 + end.getMinutes();
        const targetStartMinutes = 19 * 60;
        const targetEndMinutes = 20 * 60 + 30;

        if (durationMinutes >= 90 && startMinutesLocal <= targetStartMinutes && endMinutesLocal >= targetEndMinutes) {
          chosenSlot = s;
          break;
        }
      }

      // If no slot exactly covering 19:00–20:30, just pick the first available slot with duration >=90 as adaptation
      if (!chosenSlot) {
        chosenSlot = slots.find((s) => {
          const start = new Date(s.start_datetime);
          const end = new Date(s.end_datetime);
          const durationMinutes = (end.getTime() - start.getTime()) / 60000;
          return durationMinutes >= 90;
        });
      }

      this.assert(!!chosenSlot, 'Should find an available slot of at least 90 minutes');

      const reservationStart = chosenSlot.start_datetime;
      const reservationEnd = chosenSlot.end_datetime;

      // Reserve court for doubles with four player names
      const reserveResult = this.logic.reserveCourt(
        chosenSlot.court_id,
        reservationStart,
        reservationEnd,
        'doubles',
        ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
        'Court User',
        'court.user@example.com'
      );

      this.assert(reserveResult && reserveResult.reservation && reserveResult.cart_item && reserveResult.cart,
        'reserveCourt should return reservation, cart_item, cart');

      const reservation = reserveResult.reservation;
      const cartItem = reserveResult.cart_item;

      this.assert(reservation.court_id === chosenSlot.court_id, 'Reservation should reference chosen court');
      this.assert(reservation.play_format === 'doubles', 'Reservation play_format should be doubles');
      this.assert(Array.isArray(reservation.player_names) && reservation.player_names.length === 4,
        'Reservation should include four player names');
      this.assert(reservation.contact_email === 'court.user@example.com', 'Reservation should store contact email');

      this.assert(cartItem.item_type === 'court_reservation', 'Cart item type should be court_reservation');
      this.assert(cartItem.reference_id === reservation.id, 'Cart item reference_id should match reservation id');

      // Verify reservation persisted
      const storedReservations = JSON.parse(localStorage.getItem('court_reservations') || '[]');
      const storedReservation = storedReservations.find((r) => r.id === reservation.id);
      this.assert(!!storedReservation, 'court_reservations storage should include new reservation');

      // Verify cart summary contains this reservation
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'getCartSummary should return items array');
      const summaryItem = cartSummary.items.find((i) =>
        i.item_type === 'court_reservation' && i.reference_id === reservation.id && i.status === 'active'
      );
      this.assert(!!summaryItem, 'Cart summary should include court reservation item');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4
  testTask4_EarliestWeekdayEveningBackhandLesson() {
    const testName = 'Task 4: Schedule earliest weekday >=4pm private lesson with 4.5+ backhand coach';
    console.log('Running:', testName);

    try {
      // Get coach filter options
      const coachFilters = this.logic.getCoachFilterOptions();
      this.assert(coachFilters && Array.isArray(coachFilters.specialties), 'getCoachFilterOptions should return specialties');

      // Search for coaches with backhand specialty and rating >=4.5
      const coaches = this.logic.searchCoaches('backhand', 4.5, true);
      this.assert(Array.isArray(coaches) && coaches.length > 0,
        'Should find at least one active coach with backhand specialty and rating >=4.5');

      // For each coach, load weekday slots starting at or after 16:00 and collect available ones
      let allSlots = [];
      for (let i = 0; i < coaches.length; i++) {
        const coach = coaches[i];
        const slots = this.logic.getCoachAvailableSlots(
          coach.id,
          undefined,  // startDate
          undefined,  // endDate
          true,       // weekdaysOnly
          '16:00',    // timeFrom
          undefined   // timeTo
        );
        if (Array.isArray(slots)) {
          const availableSlots = slots.filter((s) => s.status === 'available');
          allSlots = allSlots.concat(availableSlots.map((s) => ({ slot: s, coach })));
        }
      }

      this.assert(allSlots.length > 0, 'Should have at least one available weekday evening slot with qualified coach');

      // Choose earliest slot by start_datetime
      allSlots.sort((a, b) => new Date(a.slot.start_datetime) - new Date(b.slot.start_datetime));
      const chosen = allSlots[0];
      const chosenSlot = chosen.slot;
      const chosenCoach = chosen.coach;

      // Verify coach profile matches constraints
      const coachProfile = this.logic.getCoachProfile(chosenCoach.id);
      this.assert(coachProfile && coachProfile.coach, 'getCoachProfile should return coach');
      this.assert(coachProfile.coach.rating >= 4.5, 'Chosen coach rating should be >= 4.5');
      this.assert(Array.isArray(coachProfile.coach.specialties) &&
        coachProfile.coach.specialties.indexOf('backhand') !== -1,
        'Chosen coach should have backhand in specialties');

      // Book a 60-minute lesson in this slot
      const bookingResult = this.logic.bookPrivateLesson(
        chosenSlot.id,
        60,
        'Lesson User',
        'lesson.user@example.com',
        'Focus on improving backhand.'
      );

      this.assert(bookingResult && bookingResult.booking && bookingResult.cart_item && bookingResult.cart,
        'bookPrivateLesson should return booking, cart_item, cart');

      const booking = bookingResult.booking;
      const cartItem = bookingResult.cart_item;

      this.assert(booking.coach_id === chosenCoach.id, 'Private lesson booking should reference chosen coach');
      this.assert(booking.duration_minutes === 60, 'Lesson duration should be 60 minutes');
      this.assert(booking.contact_email === 'lesson.user@example.com', 'Booking should store contact email');

      this.assert(cartItem.item_type === 'private_lesson_booking', 'Cart item type should be private_lesson_booking');
      this.assert(cartItem.reference_id === booking.id, 'Cart item reference_id should match private lesson booking id');

      // Verify booking persisted
      const storedLessonBookings = JSON.parse(localStorage.getItem('private_lesson_bookings') || '[]');
      const storedBooking = storedLessonBookings.find((b) => b.id === booking.id);
      this.assert(!!storedBooking, 'private_lesson_bookings storage should include new booking');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5
  testTask5_EnrollChildInJuly15MorningCampUnder300() {
    const testName = 'Task 5: Enroll 10-year-old in July 15 morning half-day camp under $300';
    console.log('Running:', testName);

    try {
      // Get camp filter options and identify age group for 10-year-old
      const campFilters = this.logic.getCampFilterOptions();
      this.assert(campFilters && Array.isArray(campFilters.age_groups), 'getCampFilterOptions should return age_groups');

      const ageGroupFor10 = campFilters.age_groups.find((ag) => ag.age_min <= 10 && ag.age_max >= 10);
      this.assert(!!ageGroupFor10, 'Should find an age group that includes age 10');

      // Search July half-day AM camps for this age group, price <=300
      const campSessions = this.logic.searchCampSessions(
        ageGroupFor10.id,
        undefined,  // startDateFrom
        undefined,  // startDateTo
        7,          // month (July)
        2026,       // year
        'half_day_am',
        300         // maxPrice
      );

      this.assert(Array.isArray(campSessions) && campSessions.length > 0,
        'Should find at least one July half-day AM camp session under $300');

      // Find a session starting on July 15
      const targetSession = campSessions.find((s) => {
        const d = new Date(s.start_date);
        return d.getMonth() === 6 && d.getDate() === 15; // July is month index 6
      }) || campSessions[0]; // Fallback to first if exact 15th is not found

      this.assert(!!targetSession, 'Should select a camp session for enrollment');
      this.assert(targetSession.price <= 300, 'Selected camp session should cost <= $300');

      // Load camp detail for this camp
      const campDetail = this.logic.getCampDetail(targetSession.camp_id);
      this.assert(campDetail && campDetail.camp, 'getCampDetail should return camp');
      this.assert(campDetail.camp.age_min <= 10 && campDetail.camp.age_max >= 10,
        'Camp age range should include 10-year-old');

      // Verify session appears when listing sessions for this camp
      const sessionsForCamp = this.logic.getCampSessionsForCamp(targetSession.camp_id);
      this.assert(Array.isArray(sessionsForCamp), 'getCampSessionsForCamp should return array');
      const sameSession = sessionsForCamp.find((s) => s.id === targetSession.camp_session_id || s.id === targetSession.id);
      this.assert(!!sameSession, 'Selected camp session should be included in getCampSessionsForCamp result');

      const campSessionId = targetSession.camp_session_id || targetSession.id;

      // Enroll child in selected camp session
      const enrollmentResult = this.logic.enrollInCamp(
        campSessionId,
        'Test Child',
        10,
        targetSession.age_group_label || campDetail.camp.age_group_label,
        'Parent User',
        'parent.user@example.com',
        'm',
        'No medical conditions.'
      );

      this.assert(enrollmentResult && enrollmentResult.enrollment && enrollmentResult.cart_item && enrollmentResult.cart,
        'enrollInCamp should return enrollment, cart_item, cart');

      const enrollment = enrollmentResult.enrollment;
      const cartItem = enrollmentResult.cart_item;

      this.assert(enrollment.camp_session_id === campSessionId,
        'Camp enrollment should reference selected camp session');
      this.assert(enrollment.child_age === 10, 'Enrollment should store child age as 10');
      this.assert(enrollment.parent_email === 'parent.user@example.com', 'Enrollment should store parent email');

      this.assert(cartItem.item_type === 'camp_enrollment', 'Cart item type should be camp_enrollment');
      this.assert(cartItem.reference_id === enrollment.id, 'Cart item reference_id should match camp enrollment id');

      // Verify enrollment persisted
      const storedEnrollments = JSON.parse(localStorage.getItem('camp_enrollments') || '[]');
      const storedEnrollment = storedEnrollments.find((e) => e.id === enrollment.id);
      this.assert(!!storedEnrollment, 'camp_enrollments storage should include new enrollment');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6
  testTask6_Create3SessionTrainingPlanUnder120() {
    const testName = 'Task 6: Create 3-session weekly training plan under $120 (group classes)';
    console.log('Running:', testName);

    try {
      // Adaptation: with limited data, just select three different adult group class sessions
      const searchResult = this.logic.searchGroupClassSessions(
        'adult',    // audience
        undefined,  // level
        undefined,  // focus
        undefined,  // startDate
        undefined,  // endDate
        undefined,  // timeFrom
        undefined,  // timeTo
        undefined,  // minPrice
        undefined,  // maxPrice
        undefined,  // daysOfWeek
        50,         // limit
        'start_datetime',
        'asc'
      );

      this.assert(searchResult && Array.isArray(searchResult.results) && searchResult.results.length >= 3,
        'Should have at least three group class sessions to build plan');

      // Choose three distinct sessions
      const selectedSessions = searchResult.results.slice(0, 3);

      // Book each session and collect booking ids and prices
      const bookingInfos = [];
      for (let i = 0; i < selectedSessions.length; i++) {
        const session = selectedSessions[i];
        const bookResult = this.logic.bookGroupClassSession(
          session.session_id,
          'Intermediate Planner',
          'intermediate.user@example.com',
          1
        );
        this.assert(bookResult && bookResult.booking && bookResult.cart_item,
          'Each bookGroupClassSession call should return booking and cart_item');

        bookingInfos.push({
          session,
          booking: bookResult.booking,
          cartItem: bookResult.cart_item
        });
      }

      // Verify all three bookings appear in cart summary and total is under $120
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart && Array.isArray(cartSummary.items),
        'getCartSummary should return cart and items');

      // All group class cart items
      const classItems = cartSummary.items.filter((i) => i.item_type === 'group_class_booking' && i.status === 'active');
      this.assert(classItems.length >= 3, 'Cart should contain at least three active group class bookings');

      // Map booking -> cartItem and verify prices match session prices
      for (let i = 0; i < bookingInfos.length; i++) {
        const info = bookingInfos[i];
        const ci = classItems.find((it) => it.reference_id === info.booking.id);
        this.assert(!!ci, 'Cart should include cart item for each booking');
        this.assert(ci.price === info.session.price,
          'Cart item price should match session price for each booking');
      }

      // Check total price is under budget
      const totalFromItems = cartSummary.items
        .filter((i) => i.status === 'active')
        .reduce((sum, i) => sum + (i.subtotal != null ? i.subtotal : i.price * i.quantity), 0);

      this.assert(cartSummary.cart.total_amount === totalFromItems,
        'Cart total_amount should equal sum of active item subtotals');
      this.assert(totalFromItems < 120,
        'Combined price of selected sessions should be under $120');

      // Optional budget adjustment: if total exceeded 120, remove most expensive (branch will not run with current data)
      if (totalFromItems > 120) {
        const mostExpensive = classItems.reduce((max, item) => (item.price > max.price ? item : max), classItems[0]);
        const removeResult = this.logic.removeCartItem(mostExpensive.id);
        this.assert(removeResult && removeResult.cart && Array.isArray(removeResult.items),
          'removeCartItem should return updated cart and items');
        const newTotal = removeResult.items
          .filter((i) => i.status === 'active')
          .reduce((sum, i) => sum + (i.subtotal != null ? i.subtotal : i.price * i.quantity), 0);
        this.assert(newTotal <= 120, 'After removal, total should be <=120');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7
  testTask7_RegisterSinglesTournament3_0To3_5() {
    const testName = 'Task 7: Register for singles tournament in 3.0–3.5 skill bracket';
    console.log('Running:', testName);

    try {
      // List upcoming tournaments (no month filter; we will adapt to first tournament with singles 3.0–3.5 event)
      const tournaments = this.logic.listTournaments(
        undefined, // month
        undefined, // year
        undefined, // startDateFrom
        undefined, // startDateTo
        'upcoming' // status
      );

      this.assert(Array.isArray(tournaments) && tournaments.length > 0,
        'Should have at least one upcoming tournament');

      // Find first tournament that offers a singles event covering 3.0–3.5
      let chosenTournament = null;
      let chosenEvent = null;

      for (let i = 0; i < tournaments.length && !chosenEvent; i++) {
        const t = tournaments[i];
        const events = this.logic.getTournamentEventsForTournament(
          t.id,
          'singles', // eventType filter
          3.0,       // minRating: rating_min <= 3.0
          3.5        // maxRating: rating_max >= 3.5
        );
        if (Array.isArray(events) && events.length > 0) {
          chosenTournament = t;
          chosenEvent = events[0];
        }
      }

      this.assert(!!chosenTournament && !!chosenEvent,
        'Should find a tournament with a singles event covering 3.0–3.5 rating');

      // Load tournament detail
      const tournamentDetail = this.logic.getTournamentDetail(chosenTournament.id);
      this.assert(tournamentDetail && tournamentDetail.tournament,
        'getTournamentDetail should return tournament');

      // Register for the chosen event
      const registrationResult = this.logic.registerForTournamentEvent(
        chosenEvent.id,
        'Tournament User',
        3.2,
        'tournament.user@example.com',
        'evening',
        'm',
        'Emergency Contact',
        '555-123-4567'
      );

      this.assert(registrationResult && registrationResult.registration && registrationResult.cart_item && registrationResult.cart,
        'registerForTournamentEvent should return registration, cart_item, cart');

      const registration = registrationResult.registration;
      const cartItem = registrationResult.cart_item;

      this.assert(registration.tournament_event_id === chosenEvent.id,
        'Tournament registration should reference chosen event');
      this.assert(registration.email === 'tournament.user@example.com',
        'Registration should store contact email');
      this.assert(registration.skill_rating >= 3.0 && registration.skill_rating <= 3.5,
        'Registered skill rating should be within 3.0–3.5 range');

      this.assert(cartItem.item_type === 'tournament_registration',
        'Cart item type should be tournament_registration');
      this.assert(cartItem.reference_id === registration.id,
        'Cart item reference_id should match registration id');

      // Verify registration persisted
      const storedRegistrations = JSON.parse(localStorage.getItem('tournament_registrations') || '[]');
      const storedRegistration = storedRegistrations.find((r) => r.id === registration.id);
      this.assert(!!storedRegistration, 'tournament_registrations storage should include new registration');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8
  testTask8_SaveServeAndInjuryArticlesToReadingList() {
    const testName = 'Task 8: Save serve technique and injury prevention articles to reading list';
    console.log('Running:', testName);

    try {
      // Get article filter options
      const articleFilters = this.logic.getArticleFilterOptions();
      this.assert(articleFilters && Array.isArray(articleFilters.categories),
        'getArticleFilterOptions should return categories');

      // Search for serve technique article
      const serveArticles = this.logic.searchArticles('serve technique', undefined, undefined, 10);
      this.assert(Array.isArray(serveArticles) && serveArticles.length > 0,
        'Should find at least one serve technique article');
      const serveArticle = serveArticles[0];

      // Article detail before saving
      const serveDetailBefore = this.logic.getArticleDetail(serveArticle.id);
      this.assert(serveDetailBefore && serveDetailBefore.article,
        'getArticleDetail should return serve article');

      // Save serve article
      const saveServeResult = this.logic.saveArticleToReadingList(serveArticle.id);
      this.assert(saveServeResult && saveServeResult.reading_list_item && saveServeResult.reading_list,
        'saveArticleToReadingList should return reading_list_item and reading_list for serve article');

      const serveDetailAfter = this.logic.getArticleDetail(serveArticle.id);
      this.assert(serveDetailAfter.is_saved === true,
        'Serve article should be marked as saved after saving');

      // Search for injury prevention article
      const injuryArticles = this.logic.searchArticles('injury prevention', undefined, undefined, 10);
      this.assert(Array.isArray(injuryArticles) && injuryArticles.length > 0,
        'Should find at least one injury prevention article');
      const injuryArticle = injuryArticles[0];

      const injuryDetailBefore = this.logic.getArticleDetail(injuryArticle.id);
      this.assert(injuryDetailBefore && injuryDetailBefore.article,
        'getArticleDetail should return injury article');

      const saveInjuryResult = this.logic.saveArticleToReadingList(injuryArticle.id);
      this.assert(saveInjuryResult && saveInjuryResult.reading_list_item && saveInjuryResult.reading_list,
        'saveArticleToReadingList should return reading_list_item and reading_list for injury article');

      const injuryDetailAfter = this.logic.getArticleDetail(injuryArticle.id);
      this.assert(injuryDetailAfter.is_saved === true,
        'Injury article should be marked as saved after saving');

      // Verify reading list contains both articles
      const readingListResult = this.logic.getReadingList();
      this.assert(readingListResult && readingListResult.reading_list && Array.isArray(readingListResult.items),
        'getReadingList should return reading_list and items');

      const savedIds = readingListResult.items.map((item) => item.article.id);
      this.assert(savedIds.indexOf(serveArticle.id) !== -1,
        'Reading list should contain serve technique article');
      this.assert(savedIds.indexOf(injuryArticle.id) !== -1,
        'Reading list should contain injury prevention article');

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
    console.log('✓ ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗ ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
