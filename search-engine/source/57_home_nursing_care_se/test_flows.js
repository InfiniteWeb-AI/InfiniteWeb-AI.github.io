// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear storage and initialize
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
      "article_categories": [
        {
          "id": "safety_fall_prevention",
          "name": "Safety & Fall Prevention",
          "slug": "safety-fall-prevention",
          "description": "Tips, checklists, and expert guidance to reduce fall risk at home for older adults."
        },
        {
          "id": "chronic_condition_management",
          "name": "Chronic Condition Management",
          "slug": "chronic-condition-management",
          "description": "Resources to help manage chronic conditions such as diabetes, COPD, and heart disease at home."
        },
        {
          "id": "family_caregiver_support",
          "name": "Family Caregiver Support",
          "slug": "family-caregiver-support",
          "description": "Advice and emotional support for family members providing care to loved ones."
        }
      ],
      "assessment_questions": [
        {
          "id": "q_help_frequency",
          "text": "How often does your loved one need help at home?",
          "code": "help_frequency",
          "order": 1,
          "answer_type": "single_choice",
          "is_active": true
        },
        {
          "id": "q_main_concern",
          "text": "What is your main concern right now?",
          "code": "main_concern",
          "order": 2,
          "answer_type": "single_choice",
          "is_active": true
        },
        {
          "id": "q_mobility_needs",
          "text": "How would you describe your loved one\u2019s mobility?",
          "code": "mobility_needs",
          "order": 3,
          "answer_type": "single_choice",
          "is_active": true
        }
      ],
      "care_services": [
        {
          "id": "overnight_nursing_standard",
          "name": "Overnight Nursing Care",
          "service_type": "overnight_care",
          "slug": "overnight-nursing-care",
          "description": "Licensed nurse stays overnight to monitor vitals, manage medications, and provide hands-on support.",
          "base_hourly_rate": 55,
          "base_visit_duration_minutes": 720,
          "is_overnight": true,
          "is_specialized": false,
          "is_active": true,
          "created_at": "2024-01-15T10:00:00Z",
          "image": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop&auto=format&q=80"
        },
        {
          "id": "overnight_companion_care",
          "name": "Overnight Companion Care",
          "service_type": "overnight_care",
          "slug": "overnight-companion-care",
          "description": "Non-medical overnight supervision, companionship, and safety monitoring in the home.",
          "base_hourly_rate": 45,
          "base_visit_duration_minutes": 600,
          "is_overnight": true,
          "is_specialized": false,
          "is_active": true,
          "created_at": "2024-03-02T09:30:00Z",
          "image": "https://new.tamuc.edu/wp-content/uploads/2019/06/iStock-1092112802-small-scaled-e1600961600791-700x334.jpg"
        },
        {
          "id": "memory_dementia_support_basic",
          "name": "Memory & Dementia Care (Basic)",
          "service_type": "memory_dementia_care",
          "slug": "memory-dementia-care-basic",
          "description": "Structured routines, cueing, and safety support for individuals in early to mid-stage dementia.",
          "base_hourly_rate": 60,
          "base_visit_duration_minutes": 180,
          "is_overnight": false,
          "is_specialized": true,
          "is_active": true,
          "created_at": "2023-11-20T14:15:00Z",
          "image": "https://www.yanaec.com/wp-content/uploads/2020/01/love-in-senior-house.jpg"
        }
      ],
      "caregivers": [
        {
          "id": "cgr_elena_martinez",
          "full_name": "Elena Martinez, RN",
          "profile_photo_url": "https://ak.picdn.net/offset/photos/5cf58c03469b183482a193a1/medium/offset_822826.jpg?DFghwDcb",
          "bio": "Registered nurse with 8 years of experience in home health, dementia care, and chronic disease management. Known for her calm, reassuring presence and bilingual support.",
          "years_experience": 8,
          "rating": 4.8,
          "rating_count": 72,
          "primary_zip": "94105",
          "city": "San Francisco",
          "state": "CA",
          "latitude": 37.789,
          "longitude": -122.394,
          "max_service_radius_miles": 15,
          "languages": [
            "english",
            "spanish"
          ],
          "specializations": [
            "dementia_care",
            "medication_management",
            "fall_prevention"
          ],
          "is_nurse": true,
          "offers_overnight_care": true,
          "offers_post_surgery_care": false,
          "is_active": true
        },
        {
          "id": "cgr_carlos_vega",
          "full_name": "Carlos Vega, LVN",
          "profile_photo_url": "https://www.gonzaga.edu/-/media/Website/Images/Stories/Other/Body-Content/covid-nursing-bella-williams.ashx?la=en&hash=78F3FF8B8F5BF7D3C4B9C2C105BDD61E7B6A3647",
          "bio": "Licensed vocational nurse specializing in post-surgical recovery and wound care in the home setting.",
          "years_experience": 6,
          "rating": 4.6,
          "rating_count": 54,
          "primary_zip": "94107",
          "city": "San Francisco",
          "state": "CA",
          "latitude": 37.7705,
          "longitude": -122.398,
          "max_service_radius_miles": 20,
          "languages": [
            "spanish",
            "english"
          ],
          "specializations": [
            "wound_care",
            "post_surgery_care"
          ],
          "is_nurse": true,
          "offers_overnight_care": true,
          "offers_post_surgery_care": true,
          "is_active": true
        },
        {
          "id": "cgr_isabel_fernandez",
          "full_name": "Isabel Fernandez, Care Aide",
          "profile_photo_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=600&fit=crop&auto=format&q=80",
          "bio": "Compassionate caregiver providing companionship, personal care, and light housekeeping for seniors.",
          "years_experience": 4,
          "rating": 4.7,
          "rating_count": 31,
          "primary_zip": "94110",
          "city": "San Francisco",
          "state": "CA",
          "latitude": 37.7487,
          "longitude": -122.4158,
          "max_service_radius_miles": 10,
          "languages": [
            "english",
            "spanish"
          ],
          "specializations": [
            "companionship",
            "household_support"
          ],
          "is_nurse": false,
          "offers_overnight_care": false,
          "offers_post_surgery_care": false,
          "is_active": true
        }
      ],
      "consultation_time_slots": [
        {
          "id": "slot_2026_03_10_1000_phone",
          "start_datetime": "2026-03-10T10:00:00Z",
          "end_datetime": "2026-03-10T10:30:00Z",
          "channel": "phone",
          "status": "available",
          "created_at": "2026-02-15T09:00:00Z"
        },
        {
          "id": "slot_2026_03_10_1100_phone",
          "start_datetime": "2026-03-10T11:00:00Z",
          "end_datetime": "2026-03-10T11:30:00Z",
          "channel": "phone",
          "status": "booked",
          "created_at": "2026-02-15T09:05:00Z"
        },
        {
          "id": "slot_2026_03_10_1400_video",
          "start_datetime": "2026-03-10T14:00:00Z",
          "end_datetime": "2026-03-10T14:30:00Z",
          "channel": "video",
          "status": "available",
          "created_at": "2026-02-15T09:10:00Z"
        }
      ],
      "articles": [
        {
          "id": "art_home_safety_checklist_prevent_falls",
          "title": "Room-by-Room Home Safety Checklist to Prevent Falls",
          "slug": "home-safety-checklist-prevent-falls",
          "summary": "Walk through each room of the home with this practical checklist to spot and fix common fall hazards.",
          "content": "Falls are the leading cause of injury for older adults, but many risks can be reduced with simple home modifications. In this room-by-room checklist, we cover flooring, lighting, furniture placement, bathroom grab bars, and stair safety so you can confidently assess and improve your loved one\u0019s environment.",
          "primaryCategoryId": "safety_fall_prevention",
          "categoryIds": [
            "safety_fall_prevention",
            "family_caregiver_support"
          ],
          "publish_datetime": "2025-11-20T09:00:00Z",
          "author_name": "Laura Chen, RN",
          "popularity_score": 98,
          "view_count": 12540,
          "share_url": "https://www.homenursingcare.com/resources/home-safety-checklist-prevent-falls"
        },
        {
          "id": "art_bathroom_fall_hazards_7_fixes",
          "title": "Bathroom Fall Hazards: 7 Fixes You Can Do This Weekend",
          "slug": "bathroom-fall-hazards-7-fixes",
          "summary": "From non-slip mats to lighting upgrades, learn quick changes that dramatically lower bathroom fall risk.",
          "content": "Bathrooms are one of the most common places for serious falls. This article outlines seven high-impact, low-effort changes\u0014including grab bars, raised toilet seats, non-slip mats, and proper towel bar placement\u0014to help keep your loved one safe without a major remodel.",
          "primaryCategoryId": "safety_fall_prevention",
          "categoryIds": [
            "safety_fall_prevention"
          ],
          "publish_datetime": "2026-01-05T14:30:00Z",
          "author_name": "Miguel Alvarez, OT",
          "popularity_score": 76,
          "view_count": 8310,
          "share_url": "https://www.homenursingcare.com/resources/bathroom-fall-hazards-7-fixes"
        },
        {
          "id": "art_nighttime_fall_prevention_tips",
          "title": "Nighttime Fall Prevention: Safer Trips to the Bathroom",
          "slug": "nighttime-fall-prevention-tips",
          "summary": "Simple lighting, layout, and routine changes that reduce the risk of nighttime falls.",
          "content": "Many falls happen at night, when vision is reduced and medications may cause grogginess. We share practical tips on path lighting, bed height, footwear, and hydration routines to support safe nighttime bathroom trips and better sleep.",
          "primaryCategoryId": "safety_fall_prevention",
          "categoryIds": [
            "safety_fall_prevention",
            "chronic_condition_management"
          ],
          "publish_datetime": "2025-07-15T11:00:00Z",
          "author_name": "Elena Martinez, RN",
          "popularity_score": 65,
          "view_count": 5042,
          "share_url": "https://www.homenursingcare.com/resources/nighttime-fall-prevention-tips"
        }
      ],
      "assessment_options": [
        {
          "id": "opt_help_freq_24_7",
          "questionId": "q_help_frequency",
          "text": "Around-the-clock (24/7) support",
          "value_key": "help_frequency_24_7",
          "order": 1
        },
        {
          "id": "opt_help_freq_daily",
          "questionId": "q_help_frequency",
          "text": "Every day",
          "value_key": "help_frequency_daily",
          "order": 2
        },
        {
          "id": "opt_help_freq_few_per_week",
          "questionId": "q_help_frequency",
          "text": "A few times per week",
          "value_key": "help_frequency_few_times_per_week",
          "order": 3
        }
      ],
      "time_slots": [
        {
          "id": "slot_psc_carlos_2026_03_20_0900",
          "caregiverId": "cgr_carlos_vega",
          "serviceId": "post_surgery_wound_care_visit",
          "required_specialization": "wound_care",
          "start_datetime": "2026-03-20T09:00:00Z",
          "end_datetime": "2026-03-20T11:00:00Z",
          "duration_minutes": 120,
          "status": "available",
          "created_at": "2026-02-01T08:00:00Z"
        },
        {
          "id": "slot_psc_amy_2026_03_20_1000",
          "caregiverId": "cgr_amy_liu",
          "serviceId": "post_surgery_wound_care_visit",
          "required_specialization": "wound_care",
          "start_datetime": "2026-03-20T10:00:00Z",
          "end_datetime": "2026-03-20T12:00:00Z",
          "duration_minutes": 120,
          "status": "available",
          "created_at": "2026-02-01T08:05:00Z"
        },
        {
          "id": "slot_psc_carlos_2026_03_20_1130",
          "caregiverId": "cgr_carlos_vega",
          "serviceId": "post_surgery_wound_care_visit",
          "required_specialization": "post_surgery_care",
          "start_datetime": "2026-03-20T11:30:00Z",
          "end_datetime": "2026-03-20T13:30:00Z",
          "duration_minutes": 120,
          "status": "booked",
          "created_at": "2026-02-01T08:10:00Z"
        }
      ],
      "bookings": [
        {
          "id": "HN123456",
          "serviceId": "personal_care_hourly",
          "caregiverId": "cgr_elena_martinez",
          "timeSlotId": "slot_elena_2026_03_08_0900",
          "visit_date": "2026-03-08T00:00:00Z",
          "start_datetime": "2026-03-08T09:00:00Z",
          "end_datetime": "2026-03-08T10:00:00Z",
          "duration_minutes": 60,
          "specialization_required": "medication_management",
          "status": "scheduled",
          "client_first_name": "Jordan",
          "client_last_name": "Morgan",
          "client_phone": "555-010-2233",
          "client_email": "jordan.morgan@example.com",
          "notes": "Prefers a quiet morning visit and clear medication explanations.",
          "booking_source": "web_guest",
          "original_booking_id": null,
          "created_at": "2026-02-05T12:01:00Z",
          "updated_at": "2026-02-05T12:01:00Z"
        },
        {
          "id": "HN654321",
          "serviceId": "post_surgery_wound_care_visit",
          "caregiverId": "cgr_carlos_vega",
          "timeSlotId": "slot_psc_carlos_2026_03_20_1130",
          "visit_date": "2026-03-20T00:00:00Z",
          "start_datetime": "2026-03-20T11:30:00Z",
          "end_datetime": "2026-03-20T13:30:00Z",
          "duration_minutes": 120,
          "specialization_required": "post_surgery_care",
          "status": "scheduled",
          "client_first_name": "Dana",
          "client_last_name": "Lee",
          "client_phone": "555-212-3344",
          "client_email": "dana.lee@example.com",
          "notes": "Post-knee-replacement check; has stair lift at home.",
          "booking_source": "phone",
          "original_booking_id": null,
          "created_at": "2026-02-10T09:30:00Z",
          "updated_at": "2026-02-10T09:30:00Z"
        },
        {
          "id": "HN789011",
          "serviceId": "memory_dementia_support_basic",
          "caregiverId": "cgr_sophia_ramos",
          "timeSlotId": null,
          "visit_date": "2026-03-10T00:00:00Z",
          "start_datetime": "2026-03-10T13:00:00Z",
          "end_datetime": "2026-03-10T16:00:00Z",
          "duration_minutes": 180,
          "specialization_required": "dementia_care",
          "status": "rescheduled",
          "client_first_name": "Evelyn",
          "client_last_name": "Garcia",
          "client_phone": "555-303-7788",
          "client_email": "evelyn.garcia@example.com",
          "notes": "Family requested afternoons due to sleep pattern.",
          "booking_source": "web_internal",
          "original_booking_id": null,
          "created_at": "2026-02-12T14:10:00Z",
          "updated_at": "2026-02-18T10:20:00Z"
        }
      ],
      "care_plan_requests": [
        {
          "id": "CPR_OVERNIGHT_001",
          "carePlanId": "cp_overnight_companion_value",
          "requested_start_date": "2026-03-20T00:00:00Z",
          "requested_visit_frequency": "two_nights_per_week",
          "max_budget_per_night": 175,
          "status": "draft",
          "created_at": "2026-02-25T10:00:00Z",
          "estimated_nightly_price": 165.0
        },
        {
          "id": "CPR_OVERNIGHT_002",
          "carePlanId": "cp_overnight_companion_budget_3nt",
          "requested_start_date": "2026-04-15T00:00:00Z",
          "requested_visit_frequency": "three_nights_per_week",
          "max_budget_per_night": 180,
          "status": "submitted",
          "created_at": "2026-03-03T09:30:00Z",
          "estimated_nightly_price": 175.0
        },
        {
          "id": "CPR_DEMENTIA_001",
          "carePlanId": "cp_memory_basic_3visits",
          "requested_start_date": "2026-04-01T00:00:00Z",
          "requested_visit_frequency": "three_visits_per_week",
          "max_budget_per_night": 0,
          "status": "submitted",
          "created_at": "2026-03-01T14:15:00Z",
          "estimated_nightly_price": null
        }
      ],
      "care_plans": [
        {
          "id": "cp_overnight_companion_value",
          "serviceId": "overnight_companion_care",
          "name": "Overnight Companion Care \u0014 Value Plan (2 Nights/Week)",
          "description": "Affordable overnight companion support two nights per week for clients who need supervision and reassurance but minimal hands-on nursing care.",
          "plan_type": "overnight_care",
          "price_per_night": 165,
          "currency": "USD",
          "visits_per_week": null,
          "min_nights_per_week": 2,
          "max_nights_per_week": 2,
          "allowed_visit_frequencies": [
            "two_nights_per_week"
          ],
          "min_commitment_months": 1,
          "is_active": true,
          "created_at": "2024-11-01T09:00:00Z",
          "popularity_score": 1.0
        },
        {
          "id": "cp_overnight_companion_budget_3nt",
          "serviceId": "overnight_companion_care",
          "name": "Overnight Companion Care \u0014 Budget Plan (3 Nights/Week)",
          "description": "Our most budget-friendly 3-night-per-week overnight companion package, ideal for families seeking regular nighttime coverage under a set budget.",
          "plan_type": "overnight_care",
          "price_per_night": 175,
          "currency": "USD",
          "visits_per_week": null,
          "min_nights_per_week": 3,
          "max_nights_per_week": 4,
          "allowed_visit_frequencies": [
            "three_nights_per_week",
            "four_nights_per_week"
          ],
          "min_commitment_months": 1,
          "is_active": true,
          "created_at": "2025-01-15T10:30:00Z",
          "popularity_score": 1.0
        },
        {
          "id": "cp_overnight_companion_extended_5nt",
          "serviceId": "overnight_companion_care",
          "name": "Overnight Companion Care \u0014 Extended Plan (3\u00013+ Nights/Week)",
          "description": "Flexible extended overnight coverage for families who need 3 to 5 nights of non-medical supervision and support each week.",
          "plan_type": "overnight_care",
          "price_per_night": 185,
          "currency": "USD",
          "visits_per_week": null,
          "min_nights_per_week": 3,
          "max_nights_per_week": 5,
          "allowed_visit_frequencies": [
            "three_nights_per_week",
            "five_nights_per_week",
            "seven_nights_per_week"
          ],
          "min_commitment_months": 1,
          "is_active": true,
          "created_at": "2025-03-10T11:00:00Z",
          "popularity_score": 0.0
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:15:45.905466"
      }
    };

    // Copy data into localStorage using storage keys
    localStorage.setItem('article_categories', JSON.stringify(generatedData.article_categories || []));
    localStorage.setItem('assessment_questions', JSON.stringify(generatedData.assessment_questions || []));
    localStorage.setItem('care_services', JSON.stringify(generatedData.care_services || []));
    localStorage.setItem('caregivers', JSON.stringify(generatedData.caregivers || []));
    localStorage.setItem('consultation_time_slots', JSON.stringify(generatedData.consultation_time_slots || []));
    localStorage.setItem('articles', JSON.stringify(generatedData.articles || []));
    localStorage.setItem('assessment_options', JSON.stringify(generatedData.assessment_options || []));
    localStorage.setItem('time_slots', JSON.stringify(generatedData.time_slots || []));
    localStorage.setItem('bookings', JSON.stringify(generatedData.bookings || []));
    localStorage.setItem('care_plan_requests', JSON.stringify(generatedData.care_plan_requests || []));
    localStorage.setItem('care_plans', JSON.stringify(generatedData.care_plans || []));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata || {}));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RequestMostAffordableOvernightPlan();
    this.testTask2_ShortlistSpanishCaregivers();
    this.testTask3_BookEarliestWoundCareVisit();
    this.testTask4_ChooseCheaperDementiaPackage();
    this.testTask5_AssessmentAndPhoneConsultation();
    this.testTask6_SaveAndCopyMostPopularFallArticle();
    this.testTask7_CreateWeeklyCarePlanEstimate();
    this.testTask8_RescheduleExistingVisit();

    return this.results;
  }

  // Utility helpers
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

  getDateOnly(isoString) {
    if (!isoString) return null;
    return new Date(isoString).toISOString().slice(0, 10);
  }

  getUtcHour(isoString) {
    if (!isoString) return null;
    return new Date(isoString).getUTCHours();
  }

  // =====================
  // Task 1
  // =====================
  testTask1_RequestMostAffordableOvernightPlan() {
    const testName = 'Task 1: Request most affordable overnight plan under $180/night starting April 15, 2026';
    try {
      // Simulate homepage
      const homepage = this.logic.getHomepageContent();
      this.assert(homepage && typeof homepage === 'object', 'Homepage content should be returned');

      // Navigate to Services overview
      const servicesOverview = this.logic.getServicesOverview();
      this.assert(servicesOverview && Array.isArray(servicesOverview.services), 'Services overview should include services array');
      const overnightService = servicesOverview.services.find(s => s.service_type === 'overnight_care');
      this.assert(overnightService, 'There should be at least one overnight care service');

      // Open Overnight Care page
      const overnightPageData = this.logic.getOvernightCareServicePageData();
      this.assert(overnightPageData && overnightPageData.planCalculatorDefaults, 'Overnight care page should include plan calculator defaults');

      const defaults = overnightPageData.planCalculatorDefaults;
      const startDate = '2026-04-15';

      if (defaults.minStartDate) {
        this.assert(startDate >= defaults.minStartDate, 'Start date should be on or after minStartDate');
      }
      if (defaults.maxStartDate) {
        this.assert(startDate <= defaults.maxStartDate, 'Start date should be on or before maxStartDate');
      }

      // Determine visit frequency code for "3 nights per week"
      let frequencyCode = null;
      if (Array.isArray(defaults.visitFrequencyOptions)) {
        const freqMatch = defaults.visitFrequencyOptions.find(opt =>
          opt.code === 'three_nights_per_week' ||
          (opt.label && opt.label.toLowerCase().includes('3 nights')) ||
          (opt.label && opt.label.toLowerCase().includes('three nights'))
        );
        if (freqMatch) {
          frequencyCode = freqMatch.code;
        } else if (defaults.visitFrequencyOptions.length > 0) {
          frequencyCode = defaults.visitFrequencyOptions[0].code;
        }
      }

      const maxBudget = 180;

      // Search overnight care plans matching the criteria
      const planResults = this.logic.searchOvernightCarePlans(startDate, frequencyCode, maxBudget, 'price_low_to_high');
      this.assert(Array.isArray(planResults), 'searchOvernightCarePlans should return an array');
      this.assert(planResults.length > 0, 'Should return at least one overnight care plan');

      // Filter plans that meet the budget if flag is present
      let budgetPlans = planResults;
      if (typeof planResults[0].meetsBudget === 'boolean') {
        budgetPlans = planResults.filter(p => p.meetsBudget);
        this.assert(budgetPlans.length > 0, 'At least one plan should meet budget constraints');
      }

      // Ensure sorted by price (defensively sort just in case)
      budgetPlans.sort((a, b) => {
        const pa = typeof a.pricePerNight === 'number' ? a.pricePerNight : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.pricePerNight === 'number' ? b.pricePerNight : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      });

      const cheapestPlan = budgetPlans[0];
      this.assert(cheapestPlan && cheapestPlan.carePlanId, 'Cheapest plan should have a carePlanId');
      if (typeof cheapestPlan.pricePerNight === 'number') {
        this.assert(cheapestPlan.pricePerNight <= maxBudget, 'Cheapest plan pricePerNight should not exceed budget');
      }

      // Request the cheapest suitable plan
      const requestResult = this.logic.requestOvernightCarePlan(
        cheapestPlan.carePlanId,
        startDate,
        frequencyCode,
        maxBudget
      );

      this.assert(requestResult && requestResult.success === true, 'requestOvernightCarePlan should succeed');
      this.assert(!!requestResult.carePlanRequestId, 'Request should return carePlanRequestId');

      if (typeof requestResult.estimatedNightlyPrice === 'number') {
        this.assert(requestResult.estimatedNightlyPrice <= maxBudget, 'Estimated nightly price should be within budget');
      }

      // Verify CarePlanRequest stored using actual ID
      const storedRequests = JSON.parse(localStorage.getItem('care_plan_requests') || '[]');
      const storedReq = storedRequests.find(r => r.id === requestResult.carePlanRequestId);
      this.assert(!!storedReq, 'CarePlanRequest should be stored in localStorage with the returned ID');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 2
  // =====================
  testTask2_ShortlistSpanishCaregivers() {
    const testName = 'Task 2: Shortlist two Spanish-speaking caregivers with 5+ years experience and 4.5+ rating within 10 miles of 94105';
    try {
      // Simulate homepage
      const homepage = this.logic.getHomepageContent();
      this.assert(homepage && typeof homepage === 'object', 'Homepage should be accessible');

      // Get caregiver filter options
      const filterOptions = this.logic.getCaregiverFilterOptions();
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should get caregiver filter options');

      // Determine language code for Spanish
      let spanishCode = 'spanish';
      if (Array.isArray(filterOptions.languageOptions)) {
        const spanishOpt = filterOptions.languageOptions.find(opt =>
          opt.code === 'spanish' || (opt.label && opt.label.toLowerCase().includes('spanish'))
        );
        if (spanishOpt && spanishOpt.code) {
          spanishCode = spanishOpt.code;
        }
      }

      // Determine min experience and rating according to options (aiming for >=5 years and >=4.5 rating)
      let minExperienceYears = 5;
      if (Array.isArray(filterOptions.experienceOptions)) {
        const expOpt = filterOptions.experienceOptions
          .filter(opt => typeof opt.minYears === 'number' && opt.minYears >= 5)
          .sort((a, b) => a.minYears - b.minYears)[0];
        if (expOpt) {
          minExperienceYears = expOpt.minYears;
        }
      }

      let minRating = 4.5;
      if (Array.isArray(filterOptions.ratingOptions)) {
        const ratingOpt = filterOptions.ratingOptions
          .filter(opt => typeof opt.minRating === 'number' && opt.minRating >= 4.5)
          .sort((a, b) => a.minRating - b.minRating)[0];
        if (ratingOpt) {
          minRating = ratingOpt.minRating;
        }
      }

      const zipCode = '94105';
      const radiusMiles = 10;

      // Search caregivers with specified filters
      const caregivers = this.logic.searchCaregivers(
        zipCode,
        radiusMiles,
        {
          languages: [spanishCode],
          minExperienceYears: minExperienceYears,
          minRating: minRating
        },
        'best_match'
      );

      this.assert(Array.isArray(caregivers), 'searchCaregivers should return an array');
      this.assert(caregivers.length >= 2, 'Should find at least two caregivers matching filters');

      // Validate first two caregivers meet criteria
      const selected = caregivers.slice(0, 2);
      selected.forEach((c, index) => {
        this.assert(c.caregiverId, 'Caregiver result #' + (index + 1) + ' should have caregiverId');
        this.assert(Array.isArray(c.languages) && c.languages.includes(spanishCode), 'Caregiver #' + (index + 1) + ' should speak Spanish');
        this.assert(typeof c.yearsExperience === 'number' && c.yearsExperience >= minExperienceYears, 'Caregiver #' + (index + 1) + ' should have required experience');
        this.assert(typeof c.rating === 'number' && c.rating >= minRating, 'Caregiver #' + (index + 1) + ' should meet rating requirement');
        if (typeof c.distanceMiles === 'number') {
          this.assert(c.distanceMiles <= radiusMiles, 'Caregiver #' + (index + 1) + ' should be within radius');
        }
      });

      // Favorites before adding
      const favoritesBefore = this.logic.getFavoriteCaregivers() || [];
      const originalFavoriteIds = favoritesBefore.map(c => c.id);
      const originalCount = favoritesBefore.length;

      // Add first two caregivers to favorites using actual IDs
      selected.forEach(c => {
        const favResult = this.logic.favoriteCaregiver(c.caregiverId);
        this.assert(favResult && favResult.success === true, 'favoriteCaregiver should succeed for ' + c.caregiverId);
        this.assert(favResult.favoriteId, 'favoriteCaregiver should return favoriteId');
      });

      // Verify favorites list
      const favoritesAfter = this.logic.getFavoriteCaregivers() || [];
      const newFavoriteIds = favoritesAfter.map(c => c.id);

      this.assert(
        favoritesAfter.length >= originalCount + 2,
        'Favorites count should increase by at least 2'
      );

      selected.forEach(c => {
        this.assert(
          newFavoriteIds.includes(c.caregiverId),
          'Favorited caregivers should appear in favorites list: ' + c.caregiverId
        );
      });

      // If we started with 0 favorites, assert exactly two now for this flow
      if (originalCount === 0) {
        this.assert(favoritesAfter.length === 2, 'There should be exactly two favorites after this flow');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 3
  // =====================
  testTask3_BookEarliestWoundCareVisit() {
    const testName = 'Task 3: Select earliest available 2-hour post-surgery wound care visit for guest booking';
    try {
      // Simulate homepage
      const homepage = this.logic.getHomepageContent();
      this.assert(homepage && typeof homepage === 'object', 'Homepage should load');

      // Get bookable services and find Post-Surgery Care
      const bookableServices = this.logic.getBookableServices();
      this.assert(Array.isArray(bookableServices), 'getBookableServices should return an array');

      const postSurgeryService = bookableServices.find(s =>
        s.service_type === 'post_surgery_care' ||
        (s.name && s.name.toLowerCase().includes('post-surgery'))
      );
      this.assert(postSurgeryService, 'Should have a Post-Surgery Care service available for booking');

      const visitDate = '2026-03-20';
      const durationMinutes = 120;
      const requiredSpecialization = 'wound_care';

      // Search for available wound-care time slots on that date
      const timeSlots = this.logic.searchAvailableVisitTimeSlots(
        postSurgeryService.id,
        visitDate,
        durationMinutes,
        requiredSpecialization
      );

      this.assert(Array.isArray(timeSlots), 'searchAvailableVisitTimeSlots should return an array');
      this.assert(timeSlots.length > 0, 'Should return at least one available wound-care time slot');

      // Pick earliest slot by startDatetime
      timeSlots.sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime));
      const earliestSlot = timeSlots[0];
      this.assert(earliestSlot.timeSlotId, 'Earliest slot should have timeSlotId');
      this.assert(earliestSlot.durationMinutes >= durationMinutes, 'Earliest slot should be at least desired duration');
      if (earliestSlot.specialization) {
        this.assert(earliestSlot.specialization === requiredSpecialization, 'Slot specialization should be wound_care');
      }

      // Select this slot for guest booking
      const selectResult = this.logic.selectVisitTimeSlotForGuestBooking(earliestSlot.timeSlotId);
      this.assert(selectResult && selectResult.success === true, 'selectVisitTimeSlotForGuestBooking should succeed');
      this.assert(selectResult.selectedVisit, 'Should return selectedVisit details');

      // Get guest booking summary to confirm selection is persisted
      const summary = this.logic.getGuestBookingSummary();
      this.assert(summary && summary.hasSelection === true, 'Guest booking summary should indicate a selection');
      this.assert(summary.selection, 'Selection details should be present');

      const selection = summary.selection;
      this.assert(
        this.getDateOnly(selection.startDatetime) === visitDate,
        'Selected visit should be on requested date'
      );
      this.assert(selection.durationMinutes >= durationMinutes, 'Selected visit should be 2 hours or longer');
      if (selection.specialization) {
        this.assert(selection.specialization === requiredSpecialization, 'Selected visit specialization should be wound care');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 4
  // =====================
  testTask4_ChooseCheaperDementiaPackage() {
    const testName = 'Task 4: Choose cheaper dementia care package with at least 3 visits/week and schedule start date';
    try {
      // Simulate navigation to Memory & Dementia Care page
      const pageData = this.logic.getMemoryDementiaCarePageData();
      this.assert(pageData && Array.isArray(pageData.packages), 'Memory & Dementia Care page should provide packages');

      const allPackages = pageData.packages;
      this.assert(allPackages.length > 0, 'There should be at least one dementia care package');

      // Filter for dementia care packages with >= 3 visits per week
      let qualifying = allPackages.filter(p =>
        p.plan_type === 'dementia_care' && typeof p.visits_per_week === 'number' && p.visits_per_week >= 3
      );

      if (qualifying.length < 2) {
        // Relax plan_type constraint if needed
        qualifying = allPackages.filter(p => typeof p.visits_per_week === 'number' && p.visits_per_week >= 3);
      }

      this.assert(qualifying.length >= 2, 'Should have at least two dementia packages with >= 3 visits per week');

      const pkg1 = qualifying[0];
      const pkg2 = qualifying[1];

      // Compare the two packages
      const compareResult = this.logic.compareDementiaCarePackages([pkg1.id, pkg2.id]);
      this.assert(compareResult && Array.isArray(compareResult.packages), 'compareDementiaCarePackages should return packages');
      this.assert(compareResult.cheaperPackageId, 'Should identify cheaperPackageId');

      const cheaperPackage = compareResult.packages.find(p => p.id === compareResult.cheaperPackageId);
      this.assert(cheaperPackage, 'Cheaper package should be one of the compared packages');

      // Verify cheaper package really has lower or equal monthly price using actual values (if available)
      const otherPackage = compareResult.packages.find(p => p.id !== compareResult.cheaperPackageId);
      if (cheaperPackage && otherPackage &&
          typeof cheaperPackage.monthly_price === 'number' &&
          typeof otherPackage.monthly_price === 'number') {
        this.assert(
          cheaperPackage.monthly_price <= otherPackage.monthly_price,
          'Cheaper package monthly_price should be <= other package'
        );
      }

      // Select cheaper package with start date April 1, 2026
      const selectedStartDate = '2026-04-01';
      const selectionResult = this.logic.selectDementiaCarePackage(cheaperPackage.id, selectedStartDate);

      this.assert(selectionResult && selectionResult.selectionId, 'selectDementiaCarePackage should return selectionId');
      this.assert(selectionResult.carePlanId === cheaperPackage.id, 'Selection should use cheaper dementia package');
      this.assert(selectionResult.selectedStartDate === selectedStartDate, 'Selected start date should match input');
      this.assert(!!selectionResult.status, 'Selection should have a status');

      // Verify selection is stored
      const storedSelections = JSON.parse(localStorage.getItem('care_package_selections') || '[]');
      const storedSel = storedSelections.find(s => s.id === selectionResult.selectionId);
      this.assert(!!storedSel, 'CarePackageSelection should be stored in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 5
  // =====================
  testTask5_AssessmentAndPhoneConsultation() {
    const testName = 'Task 5: Complete needs assessment and schedule phone consultation on March 10, 2026';
    try {
      // Simulate homepage & start assessment
      const homepage = this.logic.getHomepageContent();
      this.assert(homepage && typeof homepage === 'object', 'Homepage should load for assessment start');

      // Load active assessment questions and options
      const questions = this.logic.getActiveAssessmentQuestions();
      this.assert(Array.isArray(questions) && questions.length > 0, 'Should load active assessment questions');

      const findQuestionByCode = code => questions.find(q => q.code === code);

      const helpFreqQ = findQuestionByCode('help_frequency');
      const mainConcernQ = findQuestionByCode('main_concern');
      const mobilityQ = findQuestionByCode('mobility_needs');

      this.assert(helpFreqQ && Array.isArray(helpFreqQ.options), 'Help frequency question with options should exist');
      this.assert(mainConcernQ && Array.isArray(mainConcernQ.options), 'Main concern question with options should exist');
      this.assert(mobilityQ && Array.isArray(mobilityQ.options), 'Mobility question with options should exist');

      const findOptionByText = (question, textFragment) => {
        return question.options.find(o => o.text && o.text.toLowerCase().includes(textFragment.toLowerCase()));
      };

      const helpFreqOpt = findOptionByText(helpFreqQ, 'A few times per week') || helpFreqQ.options[0];
      const mainConcernOpt = findOptionByText(mainConcernQ, 'Managing medications') || mainConcernQ.options[0];
      const mobilityOpt = findOptionByText(mobilityQ, 'Needs some assistance') || mobilityQ.options[0];

      const responses = [
        {
          questionId: helpFreqQ.questionId,
          selectedOptionId: helpFreqOpt.optionId,
          freeTextAnswer: null
        },
        {
          questionId: mainConcernQ.questionId,
          selectedOptionId: mainConcernOpt.optionId,
          freeTextAnswer: null
        },
        {
          questionId: mobilityQ.questionId,
          selectedOptionId: mobilityOpt.optionId,
          freeTextAnswer: null
        }
      ];

      // Submit assessment responses and get recommendations
      const assessmentResult = this.logic.submitAssessmentResponsesAndGetRecommendations(responses);
      this.assert(assessmentResult && assessmentResult.assessmentResult, 'Should return assessmentResult');
      this.assert(assessmentResult.assessmentResult.assessmentResultId, 'assessmentResultId should be present');
      this.assert(Array.isArray(assessmentResult.recommendedServices), 'Should have recommendedServices array');

      // Schedule a phone consultation on March 10, 2026
      const targetDate = '2026-03-10';
      let slots = this.logic.getConsultationTimeSlotsForAssessment(targetDate, 'phone');
      this.assert(Array.isArray(slots), 'getConsultationTimeSlotsForAssessment should return an array');

      // Filter available phone slots
      const availableSlots = slots.filter(s => s.isAvailable !== false && s.channel === 'phone');
      this.assert(availableSlots.length > 0, 'There should be at least one available phone consultation slot');

      // Prefer 3:00 PM if available, otherwise earliest
      let chosenSlot = availableSlots.find(s => this.getUtcHour(s.startDatetime) === 15);
      if (!chosenSlot) {
        availableSlots.sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime));
        chosenSlot = availableSlots[0];
      }

      this.assert(chosenSlot && chosenSlot.consultationTimeSlotId, 'Chosen slot should have an ID');

      const bookingResult = this.logic.bookConsultationFromAssessment(chosenSlot.consultationTimeSlotId);
      this.assert(bookingResult && bookingResult.success === true, 'bookConsultationFromAssessment should succeed');
      this.assert(bookingResult.consultationBooking, 'consultationBooking should be returned');

      const booking = bookingResult.consultationBooking;
      this.assert(
        this.getDateOnly(booking.startDatetime) === targetDate,
        'Consultation booking date should be March 10, 2026'
      );
      // Validate channel using actual data
      this.assert(booking.channel === chosenSlot.channel, 'Consultation channel should match chosen slot');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 6
  // =====================
  testTask6_SaveAndCopyMostPopularFallArticle() {
    const testName = 'Task 6: Save and copy link to most popular fall-prevention article from last 12 months';
    try {
      // Simulate homepage -> resources navigation
      const homepage = this.logic.getHomepageContent();
      this.assert(homepage && typeof homepage === 'object', 'Homepage should load before navigating to resources');

      const filterOptions = this.logic.getArticleFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.categories), 'Should get article filter options');

      // Find Safety & Fall Prevention category
      const fallCategory = filterOptions.categories.find(c =>
        c.slug === 'safety-fall-prevention' ||
        (c.name && c.name.toLowerCase().includes('fall prevention'))
      );
      this.assert(fallCategory, 'Safety & Fall Prevention category should exist');

      // Get date range code for last 12 months
      let dateRangeCode = 'last_12_months';
      if (Array.isArray(filterOptions.dateRanges)) {
        const dr = filterOptions.dateRanges.find(d => d.code === 'last_12_months');
        if (dr) dateRangeCode = dr.code;
      }

      // Get sort order for most popular
      let sortOrder = 'most_popular';
      if (Array.isArray(filterOptions.sortOptions)) {
        const so = filterOptions.sortOptions.find(s => s.code === 'most_popular');
        if (so) sortOrder = so.code;
      }

      // Search articles
      const articles = this.logic.searchArticles(
        fallCategory.slug,
        dateRangeCode,
        sortOrder,
        null
      );
      this.assert(Array.isArray(articles) && articles.length > 0, 'Should find fall-prevention articles from last 12 months');

      const topArticleSummary = articles[0];
      this.assert(topArticleSummary.articleId && topArticleSummary.slug, 'Top article summary should include id and slug');

      // Open article detail
      const detail = this.logic.getArticleDetail(topArticleSummary.slug);
      this.assert(detail && detail.article, 'Article detail should be returned');

      const article = detail.article;
      this.assert(article.id === topArticleSummary.articleId, 'Detail article ID should match summary');

      // Save/bookmark the article
      const saveResult = this.logic.saveArticle(article.id);
      this.assert(saveResult && saveResult.success === true, 'saveArticle should succeed');
      this.assert(saveResult.savedArticleId, 'saveArticle should return savedArticleId');

      const savedArticles = this.logic.getSavedArticles() || [];
      const savedIds = savedArticles.map(a => a.id);
      this.assert(savedIds.includes(article.id), 'Saved articles list should include the saved article');

      // Copy shareable link using API (no direct hardcoding)
      const shareResult = this.logic.getArticleShareLink(article.id);
      this.assert(shareResult && typeof shareResult.shareUrl === 'string', 'getArticleShareLink should return a URL');
      // Optional consistency check with article.share_url from detail
      if (article.share_url) {
        this.assert(
          shareResult.shareUrl === article.share_url,
          'Share URL from API should match article.share_url from detail'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 7
  // =====================
  testTask7_CreateWeeklyCarePlanEstimate() {
    const testName = 'Task 7: Create custom 10-hour weekly care plan under $700 and submit estimate request';
    try {
      // Simulate homepage -> cost estimator
      const homepage = this.logic.getHomepageContent();
      this.assert(homepage && typeof homepage === 'object', 'Homepage should load before using cost estimator');

      const config = this.logic.getCareCostEstimatorConfig();
      this.assert(config && Array.isArray(config.services), 'Cost estimator config should include services');

      // Find required services by serviceType
      const findServiceByType = serviceType => config.services.find(s => s.serviceType === serviceType);

      const personalCare = findServiceByType('personal_care');
      const medicationReminders = findServiceByType('medication_reminders');
      const householdSupport = findServiceByType('household_support');

      this.assert(personalCare, 'Personal Care service should be available in cost estimator config');
      this.assert(medicationReminders, 'Medication Reminders service should be available in cost estimator config');
      this.assert(householdSupport, 'Household Support service should be available in cost estimator config');

      // Build initial 10-hour plan: 5 + 3 + 2
      let servicesSelection = [
        { serviceId: personalCare.serviceId, hoursPerWeek: 5 },
        { serviceId: medicationReminders.serviceId, hoursPerWeek: 3 },
        { serviceId: householdSupport.serviceId, hoursPerWeek: 2 }
      ];

      let estimate = this.logic.buildWeeklyCarePlanEstimate(servicesSelection);
      this.assert(estimate && estimate.estimateId, 'buildWeeklyCarePlanEstimate should return an estimate with ID');
      this.assert(typeof estimate.totalHoursPerWeek === 'number', 'Estimate should include totalHoursPerWeek');
      this.assert(typeof estimate.totalWeeklyCost === 'number', 'Estimate should include totalWeeklyCost');

      this.assert(estimate.totalHoursPerWeek === 10, 'Initial plan should total 10 hours per week');

      // If above budget, reduce Household Support from 2 to 1 hour
      const budget = 700;
      if (estimate.totalWeeklyCost > budget) {
        servicesSelection = [
          { serviceId: personalCare.serviceId, hoursPerWeek: 5 },
          { serviceId: medicationReminders.serviceId, hoursPerWeek: 3 },
          { serviceId: householdSupport.serviceId, hoursPerWeek: 1 }
        ];
        estimate = this.logic.buildWeeklyCarePlanEstimate(servicesSelection);
        this.assert(estimate && estimate.estimateId, 'Updated estimate should still have an estimateId');
        this.assert(estimate.totalHoursPerWeek <= 10, 'Adjusted plan should not exceed 10 hours');
      }

      this.assert(estimate.totalWeeklyCost <= budget, 'Final weekly cost should not exceed $700');

      // Submit estimate request with contact details
      const submitResult = this.logic.submitEstimateRequest(
        'Alex Rivera',
        'alex@example.com',
        '555-123-4567'
      );

      this.assert(submitResult && submitResult.success === true, 'submitEstimateRequest should succeed');
      this.assert(submitResult.estimateRequestId, 'submitEstimateRequest should return estimateRequestId');

      // Verify EstimateRequest is stored in localStorage
      const storedRequests = JSON.parse(localStorage.getItem('estimate_requests') || '[]');
      const storedReq = storedRequests.find(r => r.id === submitResult.estimateRequestId);
      this.assert(!!storedReq, 'EstimateRequest should be stored with returned ID');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 8
  // =====================
  testTask8_RescheduleExistingVisit() {
    const testName = 'Task 8: Reschedule existing home visit to March 8, 2026 at 10:00 AM (or nearest available)';
    try {
      // Simulate homepage -> manage bookings
      const homepage = this.logic.getHomepageContent();
      this.assert(homepage && typeof homepage === 'object', 'Homepage should load before managing bookings');

      // Use existing bookings from localStorage to simulate user entering confirmation number + last name
      const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
      this.assert(Array.isArray(bookings) && bookings.length > 0, 'There should be at least one existing booking');

      const existing = bookings.find(b => b.status === 'scheduled') || bookings[0];
      this.assert(existing && existing.id && existing.client_last_name, 'Existing booking should have id and client_last_name');

      const bookingId = existing.id;
      const clientLastName = existing.client_last_name;

      // Lookup booking via API
      const lookupResult = this.logic.lookupBookingByConfirmation(bookingId, clientLastName);
      this.assert(lookupResult && lookupResult.found === true, 'lookupBookingByConfirmation should find the booking');
      this.assert(lookupResult.booking && lookupResult.booking.bookingId === bookingId, 'Returned booking should match requested ID');

      // Get reschedule options for March 8, 2026
      const newVisitDate = '2026-03-08';
      const options = this.logic.getRescheduleOptionsForBooking(bookingId, newVisitDate);
      this.assert(Array.isArray(options) && options.length > 0, 'Reschedule options should be available for new date');

      // Prefer 10:00 AM slot if available, else earliest
      let chosenOption = options.find(o => this.getUtcHour(o.startDatetime) === 10);
      if (!chosenOption) {
        options.sort((a, b) => new Date(a.startDatetime) - new Date(b.startDatetime));
        chosenOption = options[0];
      }

      this.assert(chosenOption && chosenOption.timeSlotId, 'Chosen reschedule option should have timeSlotId');

      // Reschedule booking
      const rescheduleResult = this.logic.rescheduleBooking(bookingId, chosenOption.timeSlotId);
      this.assert(rescheduleResult && rescheduleResult.success === true, 'rescheduleBooking should succeed');
      this.assert(rescheduleResult.booking && rescheduleResult.booking.bookingId === bookingId, 'Rescheduled booking should keep same bookingId');

      const updated = rescheduleResult.booking;
      this.assert(
        this.getDateOnly(updated.visitDate) === newVisitDate,
        'Updated booking visit date should be March 8, 2026'
      );

      const chosenHour = this.getUtcHour(chosenOption.startDatetime);
      if (chosenHour === 10) {
        this.assert(
          this.getUtcHour(updated.startDatetime) === 10,
          'Updated booking start time should be 10:00 AM if such slot was chosen'
        );
      }

      this.assert(!!updated.status, 'Updated booking should have a status');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY
module.exports = TestRunner;
