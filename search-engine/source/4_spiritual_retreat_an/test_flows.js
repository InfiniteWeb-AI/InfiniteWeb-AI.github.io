/*
 * Flow-based integration tests for BusinessLogic
 * Covers Tasks 1-8 using provided interfaces and generated data.
 *
 * Requirements met:
 * - Uses generated data ONLY in setupTestData()
 * - No hardcoded expected response values; always uses actual API responses
 * - Chains interface calls to simulate real user flows (happy paths)
 * - Uses simple assertions and logs
 * - CommonJS export: module.exports = TestRunner
 */

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data from prompt (used ONLY here)
    const generatedData = {
      "courses": [
        {
          "id": "course_sacred_foundations_01",
          "title": "Sacred Foundations: Introduction to Mystery School Teachings",
          "description": "A gentle, beginner-friendly overview of mystery school lineages, meditation, and energy practices designed for modern seekers.",
          "level": "beginner",
          "start_date": "2026-03-06T18:00:00Z",
          "end_date": "2026-04-03T19:30:00Z",
          "base_price": 195,
          "currency": "USD",
          "rating": 4.8,
          "has_live_qa": true,
          "delivery_format": "online_live",
          "features": [
            "includes live Q&A sessions",
            "weekly practice circles",
            "downloadable study guide"
          ],
          "is_active": true,
          "created_at": "2025-11-15T10:00:00Z"
        },
        {
          "id": "course_awakening_path_02",
          "title": "The Awakening Path: Beginner Mystery School Immersion",
          "description": "Four-week immersive journey through the basic principles of energy, archetypes, and ritual for beginners.",
          "level": "beginner",
          "start_date": "2026-03-10T19:00:00Z",
          "end_date": "2026-04-07T20:30:00Z",
          "base_price": 245,
          "currency": "USD",
          "rating": 4.9,
          "has_live_qa": true,
          "delivery_format": "hybrid",
          "features": [
            "includes live Q&A sessions",
            "lesson replays available",
            "private student forum"
          ],
          "is_active": true,
          "created_at": "2025-10-03T14:30:00Z"
        },
        {
          "id": "course_elements_beginner_03",
          "title": "Elements & Directions: Foundations of Ritual",
          "description": "Learn to work safely with the four elements and cardinal directions in simple daily rituals.",
          "level": "beginner",
          "start_date": "2026-03-15T17:00:00Z",
          "end_date": "2026-04-12T18:30:00Z",
          "base_price": 175,
          "currency": "USD",
          "rating": 4.7,
          "has_live_qa": true,
          "delivery_format": "online_live",
          "features": [
            "includes live Q&A sessions",
            "guided ritual scripts",
            "elemental meditation audios"
          ],
          "is_active": true,
          "created_at": "2025-09-21T09:15:00Z"
        }
      ],
      "faq_items": [
        {
          "id": "faq_wheelchair_access_01",
          "question": "Is your retreat center wheelchair accessible?",
          "answer": "Yes. Our main temple, dining hall, and most guest rooms are wheelchair accessible. We have step-free access to common areas, ramps at building entrances, and at least two fully accessible ground-floor rooms with roll-in showers. If you use a wheelchair or mobility aid, please let us know on your booking form so we can reserve an appropriate room and parking spot.",
          "category": "Accessibility",
          "keywords": [
            "wheelchair",
            "accessibility",
            "mobility",
            "ramps",
            "rooms"
          ],
          "created_at": "2025-06-01T09:00:00Z"
        },
        {
          "id": "faq_dietary_needs_02",
          "question": "Can you accommodate special dietary needs such as vegan, gluten-free, or dairy-free?",
          "answer": "Yes. Our kitchen prepares mostly plant-based meals and we regularly accommodate vegan, gluten-free, and dairy-free diets. When you register for a retreat, you can indicate your dietary needs on the booking form. For severe allergies, please contact us at least 7 days before arrival so our team can confirm options and discuss any limitations.",
          "category": "Meals & Dietary",
          "keywords": [
            "dietary",
            "dairy-free",
            "vegan",
            "gluten-free",
            "meals",
            "kitchen"
          ],
          "created_at": "2025-06-01T09:05:00Z"
        },
        {
          "id": "faq_mobility_paths_03",
          "question": "Are the paths around the retreat grounds suitable for guests with limited mobility?",
          "answer": "The central courtyard, main buildings, and several meditation gardens are connected by wide, mostly level stone paths suitable for wheelchairs and mobility aids. Some forest trails are uneven and not recommended for guests with limited mobility. Our staff are happy to suggest accessible walking routes when you arrive.",
          "category": "Accessibility",
          "keywords": [
            "accessibility",
            "mobility",
            "paths",
            "wheelchair",
            "grounds"
          ],
          "created_at": "2025-06-02T11:20:00Z"
        }
      ],
      "library_items": [
        {
          "id": "lib_sleep_ritual_01",
          "title": "Gentle Descent into Sleep",
          "description": "A softly guided body scan and breath practice to ease you into restful sleep.",
          "content_type": "audio",
          "primary_category": "Sleep",
          "tags": [
            "sleep",
            "rest",
            "night",
            "guided_meditation"
          ],
          "duration_minutes": 15,
          "rating": 4.8,
          "url": "https://example.com/audio/gentle-descent-into-sleep.mp3",
          "is_guided": true,
          "is_active": true,
          "created_at": "2025-08-10T20:00:00Z"
        },
        {
          "id": "lib_sleep_ritual_02",
          "title": "Moonlit Lake Sleep Journey",
          "description": "Visualize resting beside a moonlit lake as your nervous system unwinds.",
          "content_type": "audio",
          "primary_category": "Sleep",
          "tags": [
            "sleep",
            "rest",
            "visualization",
            "evening"
          ],
          "duration_minutes": 18,
          "rating": 4.9,
          "url": "https://example.com/audio/moonlit-lake-sleep-journey.mp3",
          "is_guided": true,
          "is_active": true,
          "created_at": "2025-08-12T20:30:00Z"
        },
        {
          "id": "lib_sleep_ritual_03",
          "title": "Ten Breaths to Deep Rest",
          "description": "A concise bedtime practice using ten slow breaths to reset the mind.",
          "content_type": "audio",
          "primary_category": "Sleep",
          "tags": [
            "sleep",
            "rest",
            "breathwork",
            "bedtime"
          ],
          "duration_minutes": 11,
          "rating": 4.7,
          "url": "https://example.com/audio/ten-breaths-deep-rest.mp3",
          "is_guided": true,
          "is_active": true,
          "created_at": "2025-08-15T21:10:00Z"
        }
      ],
      "mentors": [
        {
          "id": "mentor_aurora_01",
          "name": "Aurora Linden",
          "bio": "Aurora is a temple guide and meditation teacher specializing in nervous system repair, dreamwork, and gentle trauma-aware practice.",
          "specialties": [
            "meditation",
            "dreamwork",
            "trauma-informed",
            "energy_hygiene"
          ],
          "headline_rate": 110,
          "currency": "USD",
          "years_experience": 12,
          "rating": 4.9,
          "photo_url": "https://static.wixstatic.com/media/a831d0_dd763578eff64ec38715499cbb2c9120~mv2.jpeg/v1/crop/x_28,y_0,w_1844,h_1069/fill/w_980,h_568,al_c,q_85,usm_0.66_1.00_0.01/Sampriya%20Meditation%20Mentoring.jpeg",
          "is_active": true,
          "created_at": "2025-03-05T10:00:00Z"
        },
        {
          "id": "mentor_elyas_02",
          "name": "Elyas Karim",
          "bio": "Elyas supports seekers with practical energy tools, ancestral healing, and grounded spiritual mentoring.",
          "specialties": [
            "energy_work",
            "ancestral_healing",
            "men's_work"
          ],
          "headline_rate": 95,
          "currency": "USD",
          "years_experience": 8,
          "rating": 4.7,
          "photo_url": "https://lindadarin.com/wp-content/uploads/2015/03/Relationship_Guidance_Help_Spiritual_Energy_Healer-1024x682.jpg",
          "is_active": true,
          "created_at": "2025-04-12T09:30:00Z"
        },
        {
          "id": "mentor_mira_03",
          "name": "Mira Sol",
          "bio": "Mira weaves mystic traditions with somatic practices, guiding students through initiatory life transitions.",
          "specialties": [
            "mystery_school",
            "somatic",
            "initiation"
          ],
          "headline_rate": 135,
          "currency": "USD",
          "years_experience": 15,
          "rating": 4.8,
          "photo_url": "http://thecollegepeople.com/wp-content/uploads/2018/04/A-Complete-Guide-To-Somatic-Psychology-660x440.jpg",
          "is_active": true,
          "created_at": "2025-02-20T13:45:00Z"
        }
      ],
      "products": [
        {
          "id": "prod_cushion_moonstone_01",
          "name": "Moonstone Meditation Cushion",
          "description": "Round cotton meditation cushion with firm buckwheat fill for stable seated practice.",
          "category": "meditation_gear",
          "price": 54,
          "currency": "USD",
          "rating": 4.7,
          "image_url": "https://cdn.shopify.com/s/files/1/0281/2687/1636/products/natural-cotton-meditation-cushion-468402_345x345@2x.jpg?v=1594557025",
          "color_options": [
            "moonstone_grey",
            "midnight_blue",
            "rose_dawn"
          ],
          "size_options": [
            "standard",
            "wide"
          ],
          "design_options": [],
          "is_active": true,
          "created_at": "2025-06-01T10:00:00Z"
        },
        {
          "id": "prod_cushion_sand_02",
          "name": "Sand Dune Floor Cushion",
          "description": "Low-profile square floor cushion suitable for meditation or tea ceremony.",
          "category": "meditation_gear",
          "price": 42,
          "currency": "USD",
          "rating": 4.5,
          "image_url": "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?w=800&h=600&fit=crop&auto=format&q=80",
          "color_options": [
            "sand",
            "sage",
            "charcoal"
          ],
          "size_options": [
            "standard"
          ],
          "design_options": [],
          "is_active": true,
          "created_at": "2025-06-10T11:30:00Z"
        },
        {
          "id": "prod_cushion_premium_03",
          "name": "Lotus Premium Meditation Set",
          "description": "Deluxe cushion and zabuton set for advanced practitioners and longer sits.",
          "category": "meditation_gear",
          "price": 120,
          "currency": "USD",
          "rating": 4.9,
          "image_url": "https://cfs.osu.edu/sites/default/files/styles/slideshow_image/public/ZenColumbusMeditationCushionOct24.jpg?h=a5eb5da0&itok=p-QItgVA",
          "color_options": [
            "deep_plum",
            "forest_green"
          ],
          "size_options": [
            "standard"
          ],
          "design_options": [],
          "is_active": true,
          "created_at": "2025-05-05T09:10:00Z"
        }
      ],
      "retreats": [
        {
          "id": "retreat_meditation_3day_01",
          "name": "3-Day Silent Meditation Retreat",
          "type": "meditation",
          "description": "A long-weekend silent retreat focused on mindfulness, breath, and gentle yoga.",
          "location": "Main Retreat Center - Forest Wing",
          "default_duration_days": 3,
          "base_price": 420,
          "currency": "USD",
          "rating": 4.8,
          "is_active": true,
          "created_at": "2025-01-15T09:00:00Z"
        },
        {
          "id": "retreat_meditation_3day_budget_02",
          "name": "3-Day Beginner Meditation Retreat",
          "type": "meditation",
          "description": "Accessible introduction to meditation with plenty of rest and instruction.",
          "location": "Main Retreat Center - Garden Wing",
          "default_duration_days": 3,
          "base_price": 360,
          "currency": "USD",
          "rating": 4.6,
          "is_active": true,
          "created_at": "2025-02-01T10:30:00Z"
        },
        {
          "id": "retreat_meditation_5day_03",
          "name": "5-Day Deep Stillness Retreat",
          "type": "meditation",
          "description": "Extended silent retreat for practitioners wanting more time in contemplation.",
          "location": "Forest Hermitage Cabins",
          "default_duration_days": 5,
          "base_price": 720,
          "currency": "USD",
          "rating": 4.9,
          "is_active": true,
          "created_at": "2025-02-18T11:15:00Z"
        }
      ],
      "workshops": [
        {
          "id": "workshop_sound_healing_01",
          "title": "Evening Sound Healing Bath",
          "description": "Lie back and receive a soothing sound journey with crystal bowls and gentle chimes.",
          "price": 38,
          "currency": "USD",
          "category": "sound_healing",
          "duration_minutes": 75,
          "is_sound_healing": true,
          "is_active": true,
          "created_at": "2025-06-01T18:30:00Z"
        },
        {
          "id": "workshop_journal_intentions_02",
          "title": "Intention Setting & Journal Ritual",
          "description": "Create a simple written ritual to align your retreat with your deeper intentions.",
          "price": 24,
          "currency": "USD",
          "category": "ritual",
          "duration_minutes": 60,
          "is_sound_healing": false,
          "is_active": true,
          "created_at": "2025-06-05T14:00:00Z"
        },
        {
          "id": "workshop_forest_bathing_03",
          "title": "Guided Forest Bathing Walk",
          "description": "Slow, sensory walk through the forest to support nervous system reset.",
          "price": 32,
          "currency": "USD",
          "category": "nature",
          "duration_minutes": 90,
          "is_sound_healing": false,
          "is_active": true,
          "created_at": "2025-06-10T09:30:00Z"
        }
      ],
      "course_tiers": [
        {
          "id": "tier_sacred_foundations_std",
          "course_id": "course_sacred_foundations_01",
          "name": "Standard",
          "description": "Full access to all live sessions, replays, and course community.",
          "tier_type": "standard",
          "price": 195,
          "currency": "USD",
          "is_default": true,
          "is_active": true
        },
        {
          "id": "tier_sacred_foundations_prem",
          "course_id": "course_sacred_foundations_01",
          "name": "Premium + Extra Q&A",
          "description": "Includes Standard access plus two additional small-group Q&A circles.",
          "tier_type": "premium",
          "price": 295,
          "currency": "USD",
          "is_default": false,
          "is_active": true
        },
        {
          "id": "tier_awakening_path_std",
          "course_id": "course_awakening_path_02",
          "name": "Standard",
          "description": "Core 4-week immersion with live calls and practice circles.",
          "tier_type": "standard",
          "price": 245,
          "currency": "USD",
          "is_default": true,
          "is_active": true
        }
      ],
      "mentor_services": [
        {
          "id": "svc_aurora_60min_01",
          "mentor_id": "mentor_aurora_01",
          "name": "60-Minute 1:1 Spiritual Mentoring",
          "description": "A focused 60-minute session to explore your current spiritual questions, dream symbolism, or meditation practice.",
          "service_type": "one_on_one_session",
          "duration_minutes": 60,
          "price": 110,
          "currency": "USD",
          "is_active": true,
          "image": "https://static.wixstatic.com/media/637129_0ac85252cf594dedb8fb5d5ff188bce0~mv2.jpg/v1/fill/w_980,h_551,al_c,q_85,usm_0.66_1.00_0.01/637129_0ac85252cf594dedb8fb5d5ff188bce0~mv2.jpg"
        },
        {
          "id": "svc_aurora_90min_02",
          "mentor_id": "mentor_aurora_01",
          "name": "90-Minute Deep Dive Mentoring",
          "description": "Extended session for mapping larger life transitions or refining your daily practice rhythm.",
          "service_type": "one_on_one_session",
          "duration_minutes": 90,
          "price": 160,
          "currency": "USD",
          "is_active": true,
          "image": "https://static.wixstatic.com/media/637129_0ac85252cf594dedb8fb5d5ff188bce0~mv2.jpg/v1/fill/w_980,h_551,al_c,q_85,usm_0.66_1.00_0.01/637129_0ac85252cf594dedb8fb5d5ff188bce0~mv2.jpg"
        },
        {
          "id": "svc_aurora_circle_03",
          "mentor_id": "mentor_aurora_01",
          "name": "Small Group Dream Circle",
          "description": "Monthly small-group circle for practicing dream sharing and reflection.",
          "service_type": "group_session",
          "duration_minutes": 75,
          "price": 45,
          "currency": "USD",
          "is_active": true,
          "image": "http://mashruwala.org.s3-website-us-east-1.amazonaws.com/img/frontpage_me1.png"
        }
      ],
      "mentor_availability_slots": [
        {
          "id": "slot_aurora_20260304_1600",
          "mentor_id": "mentor_aurora_01",
          "mentor_service_id": "svc_aurora_60min_01",
          "start_datetime": "2026-03-04T16:00:00Z",
          "end_datetime": "2026-03-04T17:00:00Z",
          "status": "available"
        },
        {
          "id": "slot_aurora_20260305_1800",
          "mentor_id": "mentor_aurora_01",
          "mentor_service_id": "svc_aurora_60min_01",
          "start_datetime": "2026-03-05T18:00:00Z",
          "end_datetime": "2026-03-05T19:00:00Z",
          "status": "booked"
        },
        {
          "id": "slot_aurora_20260306_1600",
          "mentor_id": "mentor_aurora_01",
          "mentor_service_id": "svc_aurora_60min_01",
          "start_datetime": "2026-03-06T16:00:00Z",
          "end_datetime": "2026-03-06T17:00:00Z",
          "status": "available"
        }
      ],
      "retreat_sessions": [
        {
          "id": "rs_meditation_silent_mar15",
          "retreat_id": "retreat_meditation_3day_01",
          "title": "3-Day Silent Meditation Retreat \u2013 Late Winter",
          "start_date": "2026-03-15T16:00:00Z",
          "end_date": "2026-03-18T13:00:00Z",
          "duration_days": 3,
          "base_price": 420,
          "currency": "USD",
          "rating": 4.8,
          "available_room_types": [
            "shared_room",
            "standard_private_room",
            "deluxe_private_suite"
          ],
          "available_meal_plans": [
            "standard",
            "vegetarian",
            "vegan",
            "gluten_free"
          ],
          "includes_meals": true,
          "max_guests": 22,
          "is_active": true,
          "created_at": "2025-11-10T09:00:00Z",
          "spots_remaining": 22
        },
        {
          "id": "rs_meditation_silent_apr05",
          "retreat_id": "retreat_meditation_3day_01",
          "title": "3-Day Silent Meditation Retreat \u2013 Early Spring",
          "start_date": "2026-04-05T16:00:00Z",
          "end_date": "2026-04-08T13:00:00Z",
          "duration_days": 3,
          "base_price": 440,
          "currency": "USD",
          "rating": 4.8,
          "available_room_types": [
            "shared_room",
            "standard_private_room",
            "deluxe_private_suite"
          ],
          "available_meal_plans": [
            "standard",
            "vegetarian",
            "vegan",
            "gluten_free",
            "dairy_free_on_request"
          ],
          "includes_meals": true,
          "max_guests": 24,
          "is_active": true,
          "created_at": "2025-11-20T09:10:00Z",
          "spots_remaining": 22
        },
        {
          "id": "rs_meditation_budget_apr12",
          "retreat_id": "retreat_meditation_3day_budget_02",
          "title": "Spring Beginner 3-Day Meditation (Budget)",
          "start_date": "2026-04-12T16:00:00Z",
          "end_date": "2026-04-15T13:00:00Z",
          "duration_days": 3,
          "base_price": 340,
          "currency": "USD",
          "rating": 4.6,
          "available_room_types": [
            "shared_room",
            "standard_private_room"
          ],
          "available_meal_plans": [
            "standard",
            "vegetarian",
            "vegan"
          ],
          "includes_meals": true,
          "max_guests": 26,
          "is_active": true,
          "created_at": "2025-12-01T10:00:00Z",
          "spots_remaining": 26
        }
      ],
      "retreat_bookings": [
        {
          "id": "rbk_silent_apr05_01",
          "retreat_session_id": "rs_meditation_silent_apr05",
          "start_date": "2026-04-05T16:00:00Z",
          "end_date": "2026-04-08T13:00:00Z",
          "length_days": 3,
          "room_type": "shared_room",
          "meal_plan": "vegetarian",
          "total_price": 440,
          "currency": "USD",
          "guest_name": "Emily Carter",
          "guest_email": "emily.carter@example.com",
          "guest_phone": "+1-415-555-0198",
          "status": "confirmed",
          "created_at": "2026-02-20T10:15:00Z"
        },
        {
          "id": "rbk_silent_apr05_02",
          "retreat_session_id": "rs_meditation_silent_apr05",
          "start_date": "2026-04-05T16:00:00Z",
          "end_date": "2026-04-08T13:00:00Z",
          "length_days": 3,
          "room_type": "standard_private_room",
          "meal_plan": "standard",
          "total_price": 520,
          "currency": "USD",
          "guest_name": "Jonathan Lee",
          "guest_email": "jon.lee@example.com",
          "guest_phone": "+1-206-555-0142",
          "status": "pending",
          "created_at": "2026-02-24T14:40:00Z"
        },
        {
          "id": "rbk_budget_apr26_01",
          "retreat_session_id": "rs_meditation_budget_apr26",
          "start_date": "2026-04-26T16:00:00Z",
          "end_date": "2026-04-29T13:00:00Z",
          "length_days": 3,
          "room_type": "standard_private_room",
          "meal_plan": "vegetarian",
          "total_price": 395,
          "currency": "USD",
          "guest_name": "Sofia Martinez",
          "guest_email": "sofia.martinez@example.com",
          "guest_phone": "+1-917-555-0114",
          "status": "confirmed",
          "created_at": "2026-02-28T09:05:00Z"
        }
      ],
      "event_registrations": [
        {
          "id": "ereg_fullmoon_01",
          "event_id": "event_community_fullmoon_circle_01",
          "attendee_name": "Alice Nguyen",
          "attendee_email": "alice.nguyen@example.com",
          "attendees_count": 1,
          "communication_preference": "email",
          "created_at": "2026-02-20T18:45:00Z"
        },
        {
          "id": "ereg_fullmoon_02",
          "event_id": "event_community_fullmoon_circle_01",
          "attendee_name": "Brandon Ortiz",
          "attendee_email": "brandon.ortiz@example.com",
          "attendees_count": 2,
          "communication_preference": "sms",
          "created_at": "2026-02-22T09:10:00Z"
        },
        {
          "id": "ereg_fullmoon_03",
          "event_id": "event_community_fullmoon_circle_01",
          "attendee_name": "Chloe Martin",
          "attendee_email": "chloe.martin@example.com",
          "attendees_count": 3,
          "communication_preference": "phone_call",
          "created_at": "2026-02-25T14:32:00Z"
        }
      ],
      "events": [
        {
          "id": "event_community_fullmoon_circle_01",
          "title": "Full Moon Community Circle",
          "description": "An evening community circle with meditation, sharing, and candlelit intention ritual under the full moon.",
          "event_type": "community_circle",
          "start_datetime": "2026-03-09T19:00:00Z",
          "end_datetime": "2026-03-09T21:00:00Z",
          "location": "Main Temple Hall, Retreat Center",
          "location_type": "in_person",
          "price_type": "free",
          "price": 0,
          "currency": "USD",
          "spots_total": 40,
          "is_active": true,
          "created_at": "2026-02-10T10:00:00Z",
          "spots_remaining": 34
        },
        {
          "id": "event_community_morning_breath_02",
          "title": "Morning Community Breath Practice",
          "description": "A gentle, all-levels morning breath practice circle to begin the day in clarity and calm.",
          "event_type": "community",
          "start_datetime": "2026-03-06T07:00:00Z",
          "end_datetime": "2026-03-06T08:00:00Z",
          "location": "Garden Shala, Retreat Center",
          "location_type": "in_person",
          "price_type": "free",
          "price": 0,
          "currency": "USD",
          "spots_total": 25,
          "is_active": true,
          "created_at": "2026-02-08T08:30:00Z",
          "spots_remaining": 23
        },
        {
          "id": "event_evening_sound_journey_03",
          "title": "Evening Crystal Bowl Sound Journey",
          "description": "A deep-relaxation sound journey with crystal bowls and soft chimes to unwind after the week.",
          "event_type": "ceremony",
          "start_datetime": "2026-03-21T19:30:00Z",
          "end_datetime": "2026-03-21T21:00:00Z",
          "location": "Lakeview Shala, Retreat Center",
          "location_type": "in_person",
          "price_type": "paid_fixed",
          "price": 28,
          "currency": "USD",
          "spots_total": 32,
          "is_active": true,
          "created_at": "2026-02-12T12:00:00Z",
          "spots_remaining": 30
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:18:26.226605"
      }
    };

    // Populate localStorage using correct storage keys
    const set = (key, value) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    };

    set('courses', generatedData.courses || []);
    set('faq_items', generatedData.faq_items || []);
    set('library_items', generatedData.library_items || []);
    set('mentors', generatedData.mentors || []);
    set('products', generatedData.products || []);
    set('retreats', generatedData.retreats || []);
    set('workshops', generatedData.workshops || []);
    set('course_tiers', generatedData.course_tiers || []);
    set('mentor_services', generatedData.mentor_services || []);
    set('mentor_availability_slots', generatedData.mentor_availability_slots || []);
    set('retreat_sessions', generatedData.retreat_sessions || []);
    set('retreat_bookings', generatedData.retreat_bookings || []);
    set('event_registrations', generatedData.event_registrations || []);
    set('events', generatedData.events || []);

    // Extra storages used by flows but not present in generatedData
    set('custom_retreat_packages', []);
    set('course_enrollments', []);
    set('mentoring_appointments', []);
    set('carts', []);
    set('cart_items', []);
    set('playlists', []);
    set('playlist_items', []);
    set('contact_messages', []);

    // Store metadata to compute relative dates in tests
    set('_metadata', generatedData._metadata || {});
  }

  // --------- Helper methods ---------

  getBaselineDate() {
    try {
      const metaStr = localStorage.getItem('_metadata');
      if (metaStr) {
        const meta = JSON.parse(metaStr);
        if (meta && meta.baselineDate) {
          return new Date(meta.baselineDate);
        }
      }
    } catch (e) {}
    return new Date();
  }

  getNextMonthDateRange(baseDate) {
    const year = baseDate.getUTCFullYear();
    const month = baseDate.getUTCMonth();
    const nextMonthIndex = (month + 1) % 12;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const start = new Date(Date.UTC(nextMonthYear, nextMonthIndex, 1, 0, 0, 0));
    const end = new Date(Date.UTC(nextMonthYear, nextMonthIndex + 1, 0, 23, 59, 59));
    return { start, end };
  }

  getDateRangeWithinDays(baseDate, daysAhead) {
    const start = new Date(baseDate.getTime());
    const end = new Date(baseDate.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  getNextFridayRange(baseDate) {
    const day = baseDate.getUTCDay(); // 0=Sun..5=Fri
    let offset = (5 - day + 7) % 7;
    if (offset === 0) offset = 7; // always NEXT Friday
    const friday = new Date(baseDate.getTime() + offset * 24 * 60 * 60 * 1000);
    const start = new Date(Date.UTC(friday.getUTCFullYear(), friday.getUTCMonth(), friday.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(friday.getUTCFullYear(), friday.getUTCMonth(), friday.getUTCDate(), 23, 59, 59));
    return { start, end };
  }

  // --------- Runner ---------

  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookCheapest3DayMeditationRetreat();
    this.testTask2_EnrollHighestRatedBeginnerCourse();
    this.testTask3_BookMentoringWithMoreExperiencedMentor();
    this.testTask4_CustomizeFiveDayRetreatWithWorkshops();
    this.testTask5_ShopThreeItemsAndReviewCart();
    this.testTask6_RegisterForFreeWeekdayEveningEvent();
    this.testTask7_CreateBedtimePracticePlaylist();
    this.testTask8_FAQSearchThenAccessibilityContact();

    console.log('Flow tests complete.');
    return this.results;
  }

  // --------- Task 1 ---------
  // Book the most affordable 3-day meditation retreat next month with private room and vegetarian meals

  testTask1_BookCheapest3DayMeditationRetreat() {
    const testName = 'Task 1: Book cheapest 3-day meditation retreat next month (private room, vegetarian)';
    console.log('Testing:', testName);

    try {
      // Load filter options (simulating Retreats page initialization)
      const filterOptions = this.logic.getRetreatFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.retreat_types), 'Retreat filter options should include retreat_types');

      const baseline = this.getBaselineDate();
      const nextMonthRange = this.getNextMonthDateRange(baseline);

      const filters = {
        retreat_types: ['meditation'],
        start_date_from: nextMonthRange.start.toISOString(),
        start_date_to: nextMonthRange.end.toISOString(),
        min_duration_days: 3,
        max_duration_days: 3,
        room_type: 'standard_private_room',
        meal_plan: 'vegetarian'
      };

      const searchResult = this.logic.searchRetreatSessions(filters, 'price', 'asc', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchRetreatSessions should return results array');
      this.assert(searchResult.results.length > 0, 'At least one retreat session should match filters');

      // From actual results, pick candidate sessions meeting our constraints
      const candidateSessions = searchResult.results.filter(r => {
        const hasRoom = Array.isArray(r.available_room_types) && r.available_room_types.includes('standard_private_room');
        const hasMeals = Array.isArray(r.available_meal_plans) && r.available_meal_plans.includes('vegetarian');
        return r.duration_days === 3 && hasRoom && hasMeals;
      });
      this.assert(candidateSessions.length > 0, 'There should be at least one 3-day meditation retreat with private room & vegetarian meals');

      // Choose cheapest by actual base_price
      let cheapest = null;
      candidateSessions.forEach(s => {
        if (!cheapest || s.base_price < cheapest.base_price) {
          cheapest = s;
        }
      });
      this.assert(cheapest && cheapest.retreat_session_id, 'Cheapest matching retreat session should be selected');

      const retreatSessionId = cheapest.retreat_session_id;

      // Fetch retreat session details (simulating clicking into the retreat)
      const details = this.logic.getRetreatSessionDetails(retreatSessionId);
      this.assert(details && details.retreat_session && details.retreat_session.id === retreatSessionId, 'getRetreatSessionDetails should return the correct retreat session');

      const session = details.retreat_session;
      const sessionStart = new Date(session.start_date);
      this.assert(sessionStart >= nextMonthRange.start && sessionStart <= nextMonthRange.end, 'Chosen retreat should start next month');

      // Get booking options
      const bookingOptions = this.logic.getRetreatBookingOptions(retreatSessionId);
      this.assert(bookingOptions && Array.isArray(bookingOptions.allowed_durations_days), 'Booking options should include allowed_durations_days');

      // Pick start date from session
      const bookingStartISO = session.start_date;
      const lengthDays = 3;
      const roomType = 'standard_private_room';
      const mealPlan = 'vegetarian';

      // Quote booking price and availability
      const quote = this.logic.quoteRetreatBooking(retreatSessionId, bookingStartISO, lengthDays, roomType, mealPlan);
      this.assert(quote && quote.success === true, 'quoteRetreatBooking should succeed');
      this.assert(quote.is_available === true, 'Retreat should be available for booking');
      this.assert(typeof quote.total_price === 'number' && quote.total_price > 0, 'Quoted total_price should be positive');

      // Create retreat booking (no payment)
      const guestName = 'Test Retreat Guest';
      const guestEmail = 'retreat.guest@example.com';
      const guestPhone = '+1-555-000-0001';

      const bookingResult = this.logic.createRetreatBooking(
        retreatSessionId,
        bookingStartISO,
        lengthDays,
        roomType,
        mealPlan,
        guestName,
        guestEmail,
        guestPhone
      );

      this.assert(bookingResult && bookingResult.success === true, 'createRetreatBooking should succeed');
      const booking = bookingResult.booking;
      this.assert(booking && booking.id, 'Booking object with id should be returned');
      this.assert(booking.retreat_session_id === retreatSessionId, 'Booking should reference the chosen retreat session');
      this.assert(booking.length_days === lengthDays, 'Booking should be for 3 days');
      this.assert(booking.room_type === roomType, 'Booking room_type should be private room');
      this.assert(booking.meal_plan === mealPlan, 'Booking meal_plan should be vegetarian');
      this.assert(booking.total_price === quote.total_price, 'Booking total_price should match quoted price');

      // Verify booking persisted in storage via storage key 'retreat_bookings'
      const storedBookings = JSON.parse(localStorage.getItem('retreat_bookings') || '[]');
      const stored = storedBookings.find(b => b.id === booking.id);
      this.assert(!!stored, 'New retreat booking should be stored in retreat_bookings');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --------- Task 2 ---------
  // Enroll in the highest-rated beginner course under $300 starting within 14 days, with live Q&A, using standard/cheapest non-premium tier

  testTask2_EnrollHighestRatedBeginnerCourse() {
    const testName = 'Task 2: Enroll in highest-rated beginner course under $300 (next 14 days, live Q&A)';
    console.log('Testing:', testName);

    try {
      const courseFiltersOptions = this.logic.getCourseFilterOptions();
      this.assert(courseFiltersOptions && Array.isArray(courseFiltersOptions.levels), 'Course filter options should include levels');

      const baseline = this.getBaselineDate();
      const dateRange = this.getDateRangeWithinDays(baseline, 14);

      const filters = {
        levels: ['beginner'],
        start_date_from: dateRange.start.toISOString(),
        start_date_to: dateRange.end.toISOString(),
        max_price: 300,
        include_live_qa: true
      };

      const searchResult = this.logic.searchCourses(filters, 'rating', 'desc', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchCourses should return results array');
      this.assert(searchResult.results.length > 0, 'At least one beginner course should match filters');

      // Highest-rated is first because we sorted by rating desc
      const topCourseSummary = searchResult.results[0];
      this.assert(topCourseSummary.course_id, 'Top course should have course_id');

      // Fetch detailed course info and tiers
      const courseDetails = this.logic.getCourseDetails(topCourseSummary.course_id);
      this.assert(courseDetails && courseDetails.course && Array.isArray(courseDetails.tiers), 'getCourseDetails should return course and tiers');

      const tiers = courseDetails.tiers.filter(t => t.is_active !== false);
      this.assert(tiers.length > 0, 'Course should have at least one active tier');

      // Choose lowest-priced non-premium/non-VIP tier (standard/scholarship preferred)
      const nonPremiumTiers = tiers.filter(t => t.tier_type !== 'premium' && t.tier_type !== 'vip');
      this.assert(nonPremiumTiers.length > 0, 'Course should have a non-premium tier to choose');

      let chosenTier = null;
      nonPremiumTiers.forEach(t => {
        if (!chosenTier || t.price < chosenTier.price) {
          chosenTier = t;
        }
      });
      this.assert(chosenTier && chosenTier.id, 'Chosen tier should be determined');

      const studentName = 'Mystery Student';
      const studentEmail = 'mystery.student@example.com';

      const enrollmentResult = this.logic.enrollInCourse(
        courseDetails.course.id,
        chosenTier.id,
        studentName,
        studentEmail
      );

      this.assert(enrollmentResult && enrollmentResult.success === true, 'enrollInCourse should succeed');
      const enrollment = enrollmentResult.enrollment;
      this.assert(enrollment && enrollment.id, 'Enrollment object with id should be returned');
      this.assert(enrollment.course_id === courseDetails.course.id, 'Enrollment should reference selected course');
      this.assert(enrollment.course_tier_id === chosenTier.id, 'Enrollment should reference chosen tier');
      this.assert(enrollment.student_email === studentEmail, 'Enrollment should store student email');

      // Verify enrollment persisted
      const storedEnrollments = JSON.parse(localStorage.getItem('course_enrollments') || '[]');
      const stored = storedEnrollments.find(e => e.id === enrollment.id);
      this.assert(!!stored, 'New course enrollment should be stored in course_enrollments');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --------- Task 3 ---------
  // Book a 60-minute 1:1 mentoring session with the more experienced of two mentors under $120 on next Friday evening

  testTask3_BookMentoringWithMoreExperiencedMentor() {
    const testName = 'Task 3: Book 60-minute 1:1 mentoring with most experienced mentor under $120, next Friday 4-7pm';
    console.log('Testing:', testName);

    try {
      const mentorFilterOptions = this.logic.getMentorFilterOptions();
      this.assert(mentorFilterOptions && Array.isArray(mentorFilterOptions.session_lengths_minutes), 'Mentor filter options should include session_lengths_minutes');

      const filters = {
        session_length_minutes: 60,
        max_price: 120
      };

      const searchResult = this.logic.searchMentors(filters, 'experience', 'desc');
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchMentors should return results array');
      this.assert(searchResult.results.length > 0, 'At least one mentor should match 60-minute session under $120');

      // Take first two mentors if available, otherwise just one (dataset is limited)
      const mentorSummaries = searchResult.results.slice(0, 2);

      // Fetch full details and select the one with higher years_experience
      let chosenMentorSummary = null;
      let chosenMentorDetails = null;
      let maxExperience = -1;

      mentorSummaries.forEach(ms => {
        const detail = this.logic.getMentorDetails(ms.mentor_id);
        this.assert(detail && detail.mentor && typeof detail.mentor.years_experience === 'number', 'getMentorDetails should return mentor with years_experience');
        if (detail.mentor.years_experience > maxExperience) {
          maxExperience = detail.mentor.years_experience;
          chosenMentorSummary = ms;
          chosenMentorDetails = detail;
        }
      });

      // If for some reason only one mentor was returned, ensure we still have a chosen mentor
      if (!chosenMentorSummary) {
        const fallback = searchResult.results[0];
        chosenMentorSummary = fallback;
        chosenMentorDetails = this.logic.getMentorDetails(fallback.mentor_id);
      }

      this.assert(chosenMentorSummary && chosenMentorSummary.mentor_id, 'Chosen mentor summary should be determined');
      this.assert(chosenMentorDetails && chosenMentorDetails.mentor, 'Chosen mentor details should be available');

      const mentorId = chosenMentorSummary.mentor_id;

      // Use the matching_service from search result as our 60-min one-on-one service
      const matchingService = chosenMentorSummary.matching_service;
      this.assert(matchingService && matchingService.mentor_service_id, 'Matching 60-minute service should be present on mentor summary');

      const mentorServiceId = matchingService.mentor_service_id;

      // Compute next Friday date range and fetch availability
      const baseline = this.getBaselineDate();
      const fridayRange = this.getNextFridayRange(baseline);

      const availabilityResult = this.logic.getMentorAvailability(
        mentorId,
        mentorServiceId,
        fridayRange.start.toISOString(),
        fridayRange.end.toISOString()
      );

      this.assert(availabilityResult && Array.isArray(availabilityResult.slots), 'getMentorAvailability should return slots array');

      // Choose first available slot between 4pm and 7pm (16:00-19:00 UTC)
      const suitableSlots = availabilityResult.slots.filter(slot => {
        if (slot.status !== 'available') return false;
        const start = new Date(slot.start_datetime);
        const hour = start.getUTCHours();
        return hour >= 16 && hour < 19;
      });

      this.assert(suitableSlots.length > 0, 'At least one available mentor slot between 4pm and 7pm on next Friday');
      const chosenSlot = suitableSlots[0];

      const clientName = 'Mentoring Client';
      const clientEmail = 'mentoring.client@example.com';

      const appointmentResult = this.logic.bookMentoringAppointment(
        mentorId,
        mentorServiceId,
        chosenSlot.availability_slot_id,
        clientName,
        clientEmail
      );

      this.assert(appointmentResult && appointmentResult.success === true, 'bookMentoringAppointment should succeed');
      const appointment = appointmentResult.appointment;
      this.assert(appointment && appointment.id, 'Appointment object with id should be returned');
      this.assert(appointment.mentor_id === mentorId, 'Appointment should reference chosen mentor');
      this.assert(appointment.mentor_service_id === mentorServiceId, 'Appointment should reference chosen mentor service');
      this.assert(appointment.availability_slot_id === chosenSlot.availability_slot_id, 'Appointment should reference chosen slot');
      this.assert(appointment.client_email === clientEmail, 'Appointment should store client email');

      // Verify appointment stored in mentoring_appointments
      const storedAppointments = JSON.parse(localStorage.getItem('mentoring_appointments') || '[]');
      const stored = storedAppointments.find(a => a.id === appointment.id);
      this.assert(!!stored, 'New mentoring appointment should be stored in mentoring_appointments');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --------- Task 4 ---------
  // Customize a 5-day retreat by adding three workshops under $50 each, including Sound Healing

  testTask4_CustomizeFiveDayRetreatWithWorkshops() {
    const testName = 'Task 4: Customize 5-day retreat with three workshops (<$50, includes Sound Healing)';
    console.log('Testing:', testName);

    try {
      // Load custom retreat defaults (simulates opening builder)
      const defaults = this.logic.getCustomRetreatDefaults();
      this.assert(defaults && Array.isArray(defaults.allowed_lengths_days), 'Custom retreat defaults should include allowed_lengths_days');

      const lengthDays = 5;
      this.assert(defaults.allowed_lengths_days.indexOf(lengthDays) !== -1 || defaults.default_length_days === lengthDays,
        '5 days should be allowed for custom retreats (either explicitly or as default)');

      const baseline = this.getBaselineDate();
      const allowedRange = defaults.allowed_start_date_range;
      let startDate = baseline;
      if (allowedRange && allowedRange.start_date && allowedRange.end_date) {
        const allowedStart = new Date(allowedRange.start_date);
        const allowedEnd = new Date(allowedRange.end_date);
        // choose a start date within both baseline+7 days and allowed range
        const candidate = new Date(baseline.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (candidate < allowedStart) {
          startDate = allowedStart;
        } else if (candidate > allowedEnd) {
          startDate = allowedStart;
        } else {
          startDate = candidate;
        }
      }

      // Normalize to 12:00 UTC for clarity
      const startDateNorm = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 12, 0, 0));
      const endDateNorm = new Date(startDateNorm.getTime() + lengthDays * 24 * 60 * 60 * 1000);

      // Pick a mid-range room type (prefer standard_private_room)
      let roomTypeValue = 'standard_private_room';
      if (Array.isArray(defaults.room_types) && defaults.room_types.length > 0) {
        const std = defaults.room_types.find(rt => rt.value === 'standard_private_room');
        if (std) {
          roomTypeValue = std.value;
        } else if (defaults.room_types.length >= 3) {
          // sort by price and take middle as mid-range
          const sorted = defaults.room_types.slice().sort((a, b) => {
            const pa = typeof a.price_per_night === 'number' ? a.price_per_night : 0;
            const pb = typeof b.price_per_night === 'number' ? b.price_per_night : 0;
            return pa - pb;
          });
          roomTypeValue = sorted[1].value;
        } else {
          roomTypeValue = defaults.room_types[0].value;
        }
      }

      // Load workshop filter options (simulates viewing workshop filters)
      const workshopFilterOptions = this.logic.getWorkshopFilterOptions();
      this.assert(workshopFilterOptions && workshopFilterOptions.price_range_suggestion,
        'Workshop filter options should include price_range_suggestion');

      // Search for workshops under $50, sorted by price ascending
      const workshopFilters = {
        max_price: 50
      };
      const workshopSearch = this.logic.searchWorkshops(workshopFilters, 'price', 'asc');
      this.assert(workshopSearch && Array.isArray(workshopSearch.results), 'searchWorkshops should return results array');
      this.assert(workshopSearch.results.length >= 3,
        'There should be at least three workshops under $50 in generated data');

      // Ensure one Sound Healing workshop is included
      const soundWorkshop = workshopSearch.results.find(w => w.is_sound_healing === true);
      this.assert(soundWorkshop && soundWorkshop.workshop_id, 'At least one Sound Healing workshop under $50 should be available');

      // From remaining workshops, choose two cheapest others
      const remaining = workshopSearch.results.filter(w => w.workshop_id !== soundWorkshop.workshop_id);
      // Already sorted by price asc, so take first two
      this.assert(remaining.length >= 2, 'There should be at least two additional workshops under $50');
      const other1 = remaining[0];
      const other2 = remaining[1];

      const workshopIds = [
        soundWorkshop.workshop_id,
        other1.workshop_id,
        other2.workshop_id
      ];
      this.assert(workshopIds.length === 3, 'Exactly three workshop IDs should be selected');

      const contactName = 'Custom Retreat Guest';
      const contactEmail = 'custom.retreat.guest@example.com';
      const packageName = '5-Day Custom Retreat with Workshops';

      const saveResult = this.logic.saveCustomRetreatPackage(
        startDateNorm.toISOString(),
        endDateNorm.toISOString(),
        lengthDays,
        roomTypeValue,
        workshopIds,
        contactName,
        contactEmail,
        packageName
      );

      this.assert(saveResult && saveResult.success === true, 'saveCustomRetreatPackage should succeed');
      const pkg = saveResult.custom_retreat_package;
      this.assert(pkg && pkg.id, 'Custom retreat package object with id should be returned');
      this.assert(pkg.length_days === lengthDays, 'Custom retreat package should be 5 days long');
      this.assert(pkg.room_type === roomTypeValue, 'Custom retreat package should have chosen room_type');
      this.assert(Array.isArray(pkg.workshop_ids) && pkg.workshop_ids.length === 3,
        'Custom retreat package should include exactly three workshops');
      this.assert(pkg.total_workshop_count === 3, 'total_workshop_count should equal 3');

      // Verify package stored in custom_retreat_packages
      const storedPkgs = JSON.parse(localStorage.getItem('custom_retreat_packages') || '[]');
      const stored = storedPkgs.find(p => p.id === pkg.id);
      this.assert(!!stored, 'Custom retreat package should be stored in custom_retreat_packages');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --------- Task 5 ---------
  // Purchase three spiritual shop items with different filters and review the cart
  // Adapted: choose two cushions under $60 and one highest-rated item (rating >= 4),
  // since generated data has only meditation_gear products.

  testTask5_ShopThreeItemsAndReviewCart() {
    const testName = 'Task 5: Add three shop items (price- and rating-filtered) and review cart';
    console.log('Testing:', testName);

    try {
      // Load shop categories (simulates opening Shop page)
      const categoriesResult = this.logic.getShopCategories();
      this.assert(categoriesResult && Array.isArray(categoriesResult.categories), 'getShopCategories should return categories');

      // Ensure meditation_gear category exists
      const meditationCategory = categoriesResult.categories.find(c => c.value === 'meditation_gear') || categoriesResult.categories[0];
      this.assert(meditationCategory && meditationCategory.value, 'A product category should be available');

      // Load filter options for meditation gear
      const productFilterOptions = this.logic.getProductFilterOptions(meditationCategory.value);
      this.assert(productFilterOptions && productFilterOptions.price_range_suggestion,
        'getProductFilterOptions should return price_range_suggestion');

      // 1) First item: cheapest meditation_gear under $60 (simulates cushion under $60)
      const firstSearch = this.logic.searchProducts(meditationCategory.value, { max_price: 60 }, 'price', 'asc', 1, 20);
      this.assert(firstSearch && Array.isArray(firstSearch.results) && firstSearch.results.length > 0,
        'At least one meditation_gear product under $60 should exist');
      const firstItemSummary = firstSearch.results[0];

      // 2) Second item: another meditation_gear item (also prefer under $60 if possible)
      const allGear = this.logic.searchProducts(meditationCategory.value, undefined, 'price', 'asc', 1, 20);
      this.assert(allGear && Array.isArray(allGear.results) && allGear.results.length >= 2,
        'At least two meditation_gear products should exist');
      const secondItemSummary = allGear.results.find(p => p.product_id !== firstItemSummary.product_id) || allGear.results[0];

      // 3) Third item: highest-rated meditation_gear item (simulates incense with rating >= 4)
      const ratingSearch = this.logic.searchProducts(meditationCategory.value, { min_rating: 4 }, 'rating', 'desc', 1, 20);
      this.assert(ratingSearch && Array.isArray(ratingSearch.results) && ratingSearch.results.length > 0,
        'At least one meditation_gear product with rating >= 4 should exist');
      const thirdItemSummary = ratingSearch.results.find(p => p.product_id !== firstItemSummary.product_id && p.product_id !== secondItemSummary.product_id)
        || ratingSearch.results[0];

      const selectedSummaries = [firstItemSummary, secondItemSummary, thirdItemSummary];

      const addedProductIds = [];

      // Helper to add a product to cart with any available options
      selectedSummaries.forEach(summary => {
        const details = this.logic.getProductDetails(summary.product_id);
        this.assert(details && details.product && details.product.id === summary.product_id,
          'getProductDetails should return product for product_id ' + summary.product_id);

        const product = details.product;
        const options = {};
        if (Array.isArray(product.color_options) && product.color_options.length > 0) {
          options.color = product.color_options[0];
        }
        if (Array.isArray(product.size_options) && product.size_options.length > 0) {
          options.size = product.size_options[0];
        }
        if (Array.isArray(product.design_options) && product.design_options.length > 0) {
          options.design = product.design_options[0];
        }

        const addResult = this.logic.addProductToCart(product.id, 1, options);
        this.assert(addResult && addResult.success === true, 'addProductToCart should succeed for ' + product.name);
        this.assert(addResult.cart_item && addResult.cart_item.product_id === product.id, 'Cart item should reference correct product');
        addedProductIds.push(product.id);
      });

      // Retrieve active cart and verify it has exactly three items
      const cartResult = this.logic.getActiveCart();
      this.assert(cartResult && cartResult.cart && Array.isArray(cartResult.items), 'getActiveCart should return cart and items');
      this.assert(cartResult.items.length === 3, 'Cart should contain exactly 3 items');
      this.assert(cartResult.totals && cartResult.totals.items_count === 3, 'Cart totals items_count should be 3');

      // Verify each added product is present in the cart
      addedProductIds.forEach(pid => {
        const item = cartResult.items.find(ci => ci.product_id === pid);
        this.assert(!!item, 'Cart should contain product ' + pid);
        this.assert(item.quantity === 1, 'Each cart item should have quantity 1');
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --------- Task 6 ---------
  // Register for a free weekday evening community event this month with more than 20 spots left

  testTask6_RegisterForFreeWeekdayEveningEvent() {
    const testName = 'Task 6: Register for free weekday evening community event this month (>20 spots left)';
    console.log('Testing:', testName);

    try {
      const filterOptions = this.logic.getEventFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.event_types), 'getEventFilterOptions should return event_types');

      const baseline = this.getBaselineDate();
      const monthStr = baseline.toISOString().slice(0, 7); // e.g., '2026-03'

      const filters = {
        month: monthStr,
        event_types: ['community', 'community_circle'],
        price_types: ['free']
      };

      const eventsResult = this.logic.searchEvents(filters, 'start_datetime', 'asc');
      this.assert(eventsResult && Array.isArray(eventsResult.results), 'searchEvents should return results array');
      this.assert(eventsResult.results.length > 0, 'At least one free community event should exist this month');

      // Choose an event on a weekday (Mon-Fri) after 18:00 with spots_remaining > 20
      const suitableEvents = eventsResult.results.filter(ev => {
        if (!ev.is_active) return false;
        if (ev.price_type !== 'free') return false;
        if (typeof ev.spots_remaining !== 'number' || ev.spots_remaining <= 20) return false;
        const start = new Date(ev.start_datetime);
        const weekday = start.getUTCDay(); // 0=Sun,1=Mon...6=Sat
        const hour = start.getUTCHours();
        const isWeekday = weekday >= 1 && weekday <= 5;
        const isEvening = hour >= 18; // 18:00+ defined as evening
        return isWeekday && isEvening;
      });

      this.assert(suitableEvents.length > 0, 'There should be at least one suitable free weekday evening community event this month');
      const chosenSummary = suitableEvents[0];

      const details = this.logic.getEventDetails(chosenSummary.event_id);
      this.assert(details && details.event && details.event.id === chosenSummary.event_id,
        'getEventDetails should return the chosen event');

      const event = details.event;
      this.assert(event.price_type === 'free', 'Chosen event should be free');
      this.assert(typeof event.spots_remaining === 'number' && event.spots_remaining > 20,
        'Chosen event should have more than 20 spots remaining');

      const attendeeName = 'Community Attendee';
      const attendeeEmail = 'community.attendee@example.com';
      const attendeesCount = 1;
      const communicationPreference = 'sms'; // SMS reminder/Text message

      const registrationResult = this.logic.registerForEvent(
        event.id,
        attendeeName,
        attendeeEmail,
        attendeesCount,
        communicationPreference
      );

      this.assert(registrationResult && registrationResult.success === true, 'registerForEvent should succeed');
      const registration = registrationResult.registration;
      this.assert(registration && registration.id, 'Registration object with id should be returned');
      this.assert(registration.event_id === event.id, 'Registration should reference chosen event');
      this.assert(registration.attendees_count === attendeesCount, 'Registration attendees_count should be 1');

      // Verify registration stored in event_registrations
      const storedRegs = JSON.parse(localStorage.getItem('event_registrations') || '[]');
      const stored = storedRegs.find(r => r.id === registration.id);
      this.assert(!!stored, 'New event registration should be stored in event_registrations');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --------- Task 7 ---------
  // Create a 3-item bedtime practice playlist with guided meditations about sleep (10-20 min, rating >= 4.5)

  testTask7_CreateBedtimePracticePlaylist() {
    const testName = 'Task 7: Create 3-item "Bedtime Practice" playlist with sleep audios (10-20 min, rating >= 4.5)';
    console.log('Testing:', testName);

    try {
      const filterOptions = this.logic.getLibraryFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.content_types), 'getLibraryFilterOptions should return content_types');

      // Search for audio sleep items, 10-20 minutes, rating >= 4.5, guided
      const filters = {
        content_type: 'audio',
        primary_category: 'Sleep',
        tags: ['sleep'],
        min_duration_minutes: 10,
        max_duration_minutes: 20,
        min_rating: 4.5,
        is_guided_only: true
      };

      const searchResult = this.logic.searchLibraryItems(filters, 'rating', 'desc', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'searchLibraryItems should return results array');
      this.assert(searchResult.results.length >= 3,
        'There should be at least three guided sleep audio items between 10-20 minutes with rating >= 4.5');

      const selectedItems = searchResult.results.slice(0, 3);

      // Add first item and create playlist "Bedtime Practice"
      const firstItem = selectedItems[0];
      const firstAdd = this.logic.addLibraryItemToPlaylist(
        firstItem.library_item_id,
        undefined,
        'Bedtime Practice'
      );

      this.assert(firstAdd && firstAdd.success === true, 'First addLibraryItemToPlaylist should succeed');
      const playlist = firstAdd.playlist;
      this.assert(playlist && playlist.id, 'Playlist should be created or returned with an id');
      const playlistId = playlist.id;

      // Add remaining two items to the same playlist
      for (let i = 1; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        const addResult = this.logic.addLibraryItemToPlaylist(
          item.library_item_id,
          playlistId,
          undefined
        );
        this.assert(addResult && addResult.success === true,
          'addLibraryItemToPlaylist should succeed for item ' + item.library_item_id);
        this.assert(addResult.playlist && addResult.playlist.id === playlistId,
          'Subsequent add should reference same playlist');
      }

      // Open "My Playlists" and verify playlist exists
      const playlistsResult = this.logic.getPlaylists();
      this.assert(playlistsResult && Array.isArray(playlistsResult.playlists), 'getPlaylists should return playlists array');
      const storedPlaylist = playlistsResult.playlists.find(p => p.id === playlistId);
      this.assert(!!storedPlaylist, 'Bedtime Practice playlist should exist in playlists list');

      // View playlist details and verify it contains exactly three items
      const playlistDetails = this.logic.getPlaylistDetails(playlistId);
      this.assert(playlistDetails && Array.isArray(playlistDetails.items), 'getPlaylistDetails should include playlist items');
      this.assert(playlistDetails.items.length === 3, 'Bedtime Practice playlist should contain exactly 3 items');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --------- Task 8 ---------
  // Ask about wheelchair access and dairy-free meals after searching the FAQ for accessibility info

  testTask8_FAQSearchThenAccessibilityContact() {
    const testName = 'Task 8: Search FAQ for "wheelchair" then send accessibility & dairy-free contact message';
    console.log('Testing:', testName);

    try {
      // Load FAQ categories (simulates opening FAQ page)
      const faqCategories = this.logic.getFAQCategories();
      this.assert(faqCategories && Array.isArray(faqCategories.categories), 'getFAQCategories should return categories');

      // Search FAQ for keyword "wheelchair"
      const faqSearchResult = this.logic.searchFAQ('wheelchair', undefined, 50);
      this.assert(faqSearchResult && Array.isArray(faqSearchResult.results), 'searchFAQ should return results array');
      this.assert(faqSearchResult.results.length > 0, 'FAQ search for "wheelchair" should return at least one result');

      const firstFaq = faqSearchResult.results[0];
      this.assert(firstFaq.question && firstFaq.answer, 'FAQ result should contain question and answer');

      // After reviewing FAQ, submit contact message about accessibility & dairy-free meals
      const name = 'Accessibility Tester';
      const email = 'accessibility.tester@example.com';
      const phone = '+1-555-000-0008';
      const message = 'Hello, I read your FAQ about wheelchair accessibility and dietary options. '
        + 'Could you please confirm wheelchair access for retreat spaces and whether dairy-free meals '
        + 'are available throughout the retreat?';
      const topic = 'accessibility_dietary_needs';
      const preferredContactMethod = 'phone'; // corresponds to "Phone call"

      const contactResult = this.logic.submitContactMessage(
        topic,
        name,
        email,
        phone,
        message,
        preferredContactMethod
      );

      this.assert(contactResult && contactResult.success === true, 'submitContactMessage should succeed');
      const contactMessage = contactResult.contact_message;
      this.assert(contactMessage && contactMessage.id, 'Contact message object with id should be returned');
      this.assert(contactMessage.topic === topic, 'Contact message topic should match Accessibility & Dietary Needs');
      this.assert(contactMessage.preferred_contact_method === preferredContactMethod,
        'Preferred contact method should be stored as phone');

      // Verify contact message stored in contact_messages
      const storedMessages = JSON.parse(localStorage.getItem('contact_messages') || '[]');
      const stored = storedMessages.find(m => m.id === contactMessage.id);
      this.assert(!!stored, 'New contact message should be stored in contact_messages');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // --------- Helper methods: assert & result recording ---------

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
