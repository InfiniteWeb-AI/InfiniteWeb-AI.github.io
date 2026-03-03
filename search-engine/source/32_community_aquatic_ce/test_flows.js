// Test runner for business logic flows for community aquatic center
// Covers all specified tasks (1-8) using flow-based integration tests

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.baselineDate = null; // will be set in setupTestData

    // Clear and initialize storage once here; each test will also reset its own state
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
      membership_plans: [
        {
          id: 'family_basic_1m',
          name: 'Family Basic 1-Month',
          description: 'Affordable 1-month family membership with full pool and fitness center access during standard hours.',
          membership_type: 'family',
          duration: 'one_month',
          price: 105,
          pool_access_included: true,
          fitness_center_included: true,
          weekday_open_time: '06:00',
          weekday_close_time: '22:00',
          status: 'active'
        },
        {
          id: 'family_value_night_1m',
          name: 'Family Value Night 1-Month',
          description: 'Family membership with extended evening hours ideal for late swimmers and after-work workouts.',
          membership_type: 'family',
          duration: 'one_month',
          price: 112,
          pool_access_included: true,
          fitness_center_included: true,
          weekday_open_time: '06:00',
          weekday_close_time: '23:00',
          status: 'active'
        },
        {
          id: 'family_plus_1m',
          name: 'Family Plus 1-Month',
          description: 'Premium 1-month family membership with extended late-night access and free guest days.',
          membership_type: 'family',
          duration: 'one_month',
          price: 119,
          pool_access_included: true,
          fitness_center_included: true,
          weekday_open_time: '05:30',
          weekday_close_time: '23:00',
          status: 'active'
        }
      ],
      party_packages: [
        {
          id: 'birthday_splash_bash_basic',
          name: 'Splash Bash Basic Birthday Party',
          description: '2-hour birthday party with shared pool time, private party room, and cheese pizza for the group.',
          category: 'birthday_party',
          base_price: 260,
          included_children_count: 12,
          additional_child_fee: 6,
          min_children: 8,
          max_children: 20,
          available_days_of_week: ['saturday', 'sunday'],
          includes_private_party_room: true,
          includes_pizza: true,
          status: 'active'
        },
        {
          id: 'birthday_splash_bash_plus',
          name: 'Splash Bash Plus Birthday Party',
          description: 'Premium 2.5-hour party with private room, pool games led by a host, and pizza plus drinks for up to 15 kids.',
          category: 'birthday_party',
          base_price: 295,
          included_children_count: 15,
          additional_child_fee: 8,
          min_children: 10,
          max_children: 22,
          available_days_of_week: ['saturday'],
          includes_private_party_room: true,
          includes_pizza: true,
          status: 'active'
        },
        {
          id: 'birthday_splash_bash_deluxe',
          name: 'Splash Bash Deluxe Birthday Party',
          description: '3-hour all-inclusive party with private room, decorated tables, multiple pizza options, and goody bags.',
          category: 'birthday_party',
          base_price: 340,
          included_children_count: 15,
          additional_child_fee: 10,
          min_children: 10,
          max_children: 25,
          available_days_of_week: ['saturday', 'sunday'],
          includes_private_party_room: true,
          includes_pizza: true,
          status: 'active'
        }
      ],
      pass_products: [
        {
          id: 'digital_guest_single',
          name: 'Single-Visit Digital Guest Pass',
          description: 'One-time digital guest pass valid for a single visit to any open swim or lap swim session.',
          pass_type: 'guest_passes',
          format: 'digital_pass',
          visits_per_pass: 1,
          price: 13,
          is_active: true,
          image: 'https://theghostinmymachine.com/wp-content/uploads/2021/06/QR-code-edit-860x450.jpg'
        },
        {
          id: 'digital_guest_single_discount',
          name: 'Discount Digital Guest Pass',
          description: 'Discounted single-visit digital guest pass available during promotional periods.',
          pass_type: 'guest_passes',
          format: 'digital_pass',
          visits_per_pass: 1,
          price: 10.5,
          is_active: true,
          image: 'https://inspirabuilding.com/wp-content/uploads/2021/07/swim-therapy-swimmer-swimming-pool-indoor-swimming-pool-630x380.jpg'
        },
        {
          id: 'digital_guest_five',
          name: '5-Visit Digital Guest Pass',
          description: 'Bundle of 5 digital guest visits that can be shared among friends and family.',
          pass_type: 'guest_passes',
          format: 'digital_pass',
          visits_per_pass: 5,
          price: 52,
          is_active: true,
          image: 'https://www.olcdesigns.com/wp-content/uploads/2019/02/WCC_001a_pool.jpg'
        }
      ],
      pools: [
        {
          id: 'indoor_main_pool',
          name: 'Indoor Main Pool',
          pool_type: 'indoor',
          description: '8-lane, 25-yard competition and lap pool with starting blocks and reserved lap lanes.'
        },
        {
          id: 'outdoor_family_pool',
          name: 'Outdoor Family Pool',
          pool_type: 'outdoor',
          description: 'Seasonal outdoor leisure pool with zero-depth entry, play features, and lap lanes in the mornings.'
        },
        {
          id: 'therapy_pool',
          name: 'Warm Water Therapy Pool',
          pool_type: 'therapy',
          description: 'Small warm water pool designed for therapy, aqua fitness, and low-impact exercise.'
        }
      ],
      programs: [
        {
          id: 'kids_beg1_6to8_mar_tth_430',
          name: 'Beginner 1 Swim Lessons (Ages 6–8) – Tue/Thu 4:30 PM March',
          short_name: 'Beginner 1 6–8 T/Th 4:30 PM',
          category_id: 'swim_lessons_kids',
          subcategory: 'kids_group_lesson',
          skill_level: 'beginner_1',
          age_min: 6,
          age_max: 8,
          price: 115,
          price_resident: 110,
          price_non_resident: 130,
          resident_pricing_available: true,
          location_pool_type: 'indoor',
          includes_cpr_first_aid: false,
          total_duration_hours: 8,
          start_date: '2026-03-10T16:30:00',
          end_date: '2026-03-31T17:15:00',
          meeting_days: ['tuesday', 'thursday'],
          is_weekends_only: false,
          start_time: '16:30',
          end_time: '17:15',
          description: 'Entry-level group swim lessons for children ages 6–8 focusing on water confidence, kicking, and basic front crawl.',
          can_add_to_cart: false,
          status: 'active'
        },
        {
          id: 'kids_beg1_6to8_mar_mw_500',
          name: 'Beginner 1 Swim Lessons (Ages 6–8) – Mon/Wed 5:00 PM March',
          short_name: 'Beginner 1 6–8 M/W 5:00 PM',
          category_id: 'swim_lessons_kids',
          subcategory: 'kids_group_lesson',
          skill_level: 'beginner_1',
          age_min: 6,
          age_max: 8,
          price: 120,
          price_resident: 115,
          price_non_resident: 135,
          resident_pricing_available: true,
          location_pool_type: 'indoor',
          includes_cpr_first_aid: false,
          total_duration_hours: 8,
          start_date: '2026-03-16T17:00:00',
          end_date: '2026-04-06T17:45:00',
          meeting_days: ['monday', 'Wednesday'.toLowerCase()],
          is_weekends_only: false,
          start_time: '17:00',
          end_time: '17:45',
          description: 'Beginner 1 class for ages 6–8 offered in the early evening for school-age children.',
          can_add_to_cart: false,
          status: 'active'
        },
        {
          id: 'kids_beg1_6to8_apr_tth_430',
          name: 'Beginner 1 Swim Lessons (Ages 6–8) – Tue/Thu 4:30 PM April',
          short_name: 'Beginner 1 6–8 T/Th 4:30 PM April',
          category_id: 'swim_lessons_kids',
          subcategory: 'kids_group_lesson',
          skill_level: 'beginner_1',
          age_min: 6,
          age_max: 8,
          price: 118,
          price_resident: 112,
          price_non_resident: 138,
          resident_pricing_available: true,
          location_pool_type: 'indoor',
          includes_cpr_first_aid: false,
          total_duration_hours: 8,
          start_date: '2026-04-07T16:30:00',
          end_date: '2026-04-30T17:15:00',
          meeting_days: ['tuesday', 'thursday'],
          is_weekends_only: false,
          start_time: '16:30',
          end_time: '17:15',
          description: 'Continuation of the Beginner 1 series for ages 6–8 with additional practice on floats and glides.',
          can_add_to_cart: false,
          status: 'active'
        }
      ],
      pool_schedule_sessions: [
        {
          id: 'sess_2026_03_09_open_swim_indoor_pm',
          pool_id: 'indoor_main_pool',
          title: 'Open Swim - Indoor Evening',
          session_date: '2026-03-09T00:00:00',
          start_datetime: '2026-03-09T17:00:00',
          end_datetime: '2026-03-09T19:00:00',
          day_of_week: 'monday',
          activity_type: 'open_swim',
          pool_type: 'indoor',
          related_program_id: null
        },
        {
          id: 'sess_2026_03_09_lap_swim_morning',
          pool_id: 'indoor_main_pool',
          title: 'Lap Swim - Morning Lanes',
          session_date: '2026-03-09T00:00:00',
          start_datetime: '2026-03-09T06:00:00',
          end_datetime: '2026-03-09T08:00:00',
          day_of_week: 'monday',
          activity_type: 'lap_swim',
          pool_type: 'indoor',
          related_program_id: null
        },
        {
          id: 'sess_2026_03_10_class_kids_beg1_430',
          pool_id: 'indoor_main_pool',
          title: 'Beginner 1 Swim Lessons (Ages 6–8)',
          session_date: '2026-03-10T00:00:00',
          start_datetime: '2026-03-10T16:30:00',
          end_datetime: '2026-03-10T17:15:00',
          day_of_week: 'tuesday',
          activity_type: 'class',
          pool_type: 'indoor',
          related_program_id: 'kids_beg1_6to8_mar_tth_430'
        }
      ],
      lap_lane_reservations: [
        {
          id: 'lane_res_2026_03_04_0600_l1',
          lap_lane_slot_id: 'lane_slot_2026_03_04_indoor_l1_0600_0630',
          swimmer_name: 'Chris Johnson',
          swimmers_count: 1,
          contact_phone: '555-100-2001',
          created_at: '2026-03-01T09:15:00',
          status: 'reserved'
        },
        {
          id: 'lane_res_2026_03_04_0630_l2',
          lap_lane_slot_id: 'lane_slot_2026_03_04_indoor_l2_0630_0700',
          swimmer_name: 'Dana Smith',
          swimmers_count: 1,
          contact_phone: '555-100-2002',
          created_at: '2026-03-02T14:22:00',
          status: 'reserved'
        },
        {
          id: 'lane_res_2026_02_28_0615_l3',
          lap_lane_slot_id: 'lane_slot_2026_02_28_indoor_l3_0615_0645',
          swimmer_name: 'Jordan Lee',
          swimmers_count: 1,
          contact_phone: '555-100-2003',
          created_at: '2026-02-25T11:05:00',
          status: 'checked_in'
        }
      ],
      lap_lane_slots: [
        {
          id: 'lane_slot_2026_03_04_indoor_l1_0600_0630',
          pool_id: 'indoor_main_pool',
          lane_number: 1,
          slot_date: '2026-03-04T00:00:00',
          start_datetime: '2026-03-04T06:00:00',
          end_datetime: '2026-03-04T06:30:00',
          pool_type: 'indoor',
          price: 12,
          max_swimmers: 1,
          is_reserved: true
        },
        {
          id: 'lane_slot_2026_03_04_indoor_l2_0630_0700',
          pool_id: 'indoor_main_pool',
          lane_number: 2,
          slot_date: '2026-03-04T00:00:00',
          start_datetime: '2026-03-04T06:30:00',
          end_datetime: '2026-03-04T07:00:00',
          pool_type: 'indoor',
          price: 12,
          max_swimmers: 1,
          is_reserved: true
        },
        {
          id: 'lane_slot_2026_02_28_indoor_l3_0615_0645',
          pool_id: 'indoor_main_pool',
          lane_number: 3,
          slot_date: '2026-02-28T00:00:00',
          start_datetime: '2026-02-28T06:15:00',
          end_datetime: '2026-02-28T06:45:00',
          pool_type: 'indoor',
          price: 10,
          max_swimmers: 1,
          is_reserved: true
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:15:46.956977'
      }
    };

    // Expose baseline date for date-relative tests
    this.baselineDate = generatedData._metadata && generatedData._metadata.baselineDate;

    // Copy generated data to localStorage using storage keys
    localStorage.setItem('membership_plans', JSON.stringify(generatedData.membership_plans || []));
    localStorage.setItem('party_packages', JSON.stringify(generatedData.party_packages || []));
    localStorage.setItem('pass_products', JSON.stringify(generatedData.pass_products || []));
    localStorage.setItem('pools', JSON.stringify(generatedData.pools || []));

    // Programs: include generated plus additional lifeguard and aqua fitness classes
    const programs = (generatedData.programs || []).slice();

    // Additional lifeguard certification programs for Task 7
    programs.push(
      {
        id: 'lg_cert_weekend_short_may',
        name: 'Weekend Lifeguard Certification - Fast Track May',
        short_name: 'LG Weekend Fast Track May',
        category_id: 'training_certifications',
        subcategory: 'lifeguard_certification',
        skill_level: 'none',
        age_min: 15,
        age_max: null,
        price: 260,
        resident_pricing_available: false,
        location_pool_type: 'indoor',
        includes_cpr_first_aid: true,
        total_duration_hours: 16,
        start_date: '2026-05-10T09:00:00',
        end_date: '2026-05-24T17:00:00',
        meeting_days: ['saturday', 'sunday'],
        is_weekends_only: true,
        start_time: '09:00',
        end_time: '17:00',
        description: 'Accelerated weekend-only lifeguard certification including CPR/First Aid.',
        can_add_to_cart: false,
        status: 'active'
      },
      {
        id: 'lg_cert_weekend_standard_june',
        name: 'Weekend Lifeguard Certification - June Session',
        short_name: 'LG Weekend June',
        category_id: 'training_certifications',
        subcategory: 'lifeguard_certification',
        skill_level: 'none',
        age_min: 15,
        age_max: null,
        price: 250,
        resident_pricing_available: false,
        location_pool_type: 'indoor',
        includes_cpr_first_aid: true,
        total_duration_hours: 24,
        start_date: '2026-06-01T09:00:00',
        end_date: '2026-06-22T17:00:00',
        meeting_days: ['saturday', 'sunday'],
        is_weekends_only: true,
        start_time: '09:00',
        end_time: '17:00',
        description: 'Standard-length weekend lifeguard certification including CPR/First Aid.',
        can_add_to_cart: false,
        status: 'active'
      },
      {
        id: 'lg_cert_weekend_july_long',
        name: 'Weekend Lifeguard Certification - July Extended',
        short_name: 'LG Weekend July Extended',
        category_id: 'training_certifications',
        subcategory: 'lifeguard_certification',
        skill_level: 'none',
        age_min: 15,
        age_max: null,
        price: 280,
        resident_pricing_available: false,
        location_pool_type: 'outdoor',
        includes_cpr_first_aid: true,
        total_duration_hours: 20,
        start_date: '2026-07-01T09:00:00',
        end_date: '2026-07-20T17:00:00',
        meeting_days: ['saturday', 'sunday'],
        is_weekends_only: true,
        start_time: '09:00',
        end_time: '17:00',
        description: 'Extended schedule lifeguard course including CPR/First Aid (after June 30).',
        can_add_to_cart: false,
        status: 'active'
      }
    );

    // Additional aqua fitness evening classes for Task 8
    programs.push(
      {
        id: 'aqua_zumba_mon_1800',
        name: 'Aqua Zumba – Monday 6:00 PM',
        short_name: 'Aqua Zumba Mon 6 PM',
        category_id: 'fitness_classes',
        subcategory: 'aqua_fitness',
        skill_level: 'none',
        age_min: 16,
        age_max: null,
        price: 18,
        resident_pricing_available: false,
        location_pool_type: 'indoor',
        includes_cpr_first_aid: false,
        total_duration_hours: 1,
        start_date: '2026-03-09T18:00:00',
        end_date: '2026-03-09T19:00:00',
        meeting_days: ['monday'],
        is_weekends_only: false,
        start_time: '18:00',
        end_time: '19:00',
        description: 'High-energy dance-based aqua fitness class on Monday evenings.',
        can_add_to_cart: true,
        status: 'active'
      },
      {
        id: 'deep_water_fit_wed_1930',
        name: 'Deep Water Fitness – Wednesday 7:30 PM',
        short_name: 'Deep Water Wed 7:30 PM',
        category_id: 'fitness_classes',
        subcategory: 'aqua_fitness',
        skill_level: 'none',
        age_min: 16,
        age_max: null,
        price: 19,
        resident_pricing_available: false,
        location_pool_type: 'indoor',
        includes_cpr_first_aid: false,
        total_duration_hours: 1,
        start_date: '2026-03-11T19:30:00',
        end_date: '2026-03-11T20:30:00',
        meeting_days: ['wednesday'],
        is_weekends_only: false,
        start_time: '19:30',
        end_time: '20:30',
        description: 'Low-impact deep water conditioning class on Wednesday evenings.',
        can_add_to_cart: true,
        status: 'active'
      },
      {
        id: 'aqua_interval_fri_1830',
        name: 'Aqua Intervals – Friday 6:30 PM',
        short_name: 'Aqua Intervals Fri 6:30 PM',
        category_id: 'fitness_classes',
        subcategory: 'aqua_fitness',
        skill_level: 'none',
        age_min: 16,
        age_max: null,
        price: 17,
        resident_pricing_available: false,
        location_pool_type: 'outdoor',
        includes_cpr_first_aid: false,
        total_duration_hours: 1,
        start_date: '2026-03-13T18:30:00',
        end_date: '2026-03-13T19:30:00',
        meeting_days: ['friday'],
        is_weekends_only: false,
        start_time: '18:30',
        end_time: '19:30',
        description: 'Interval-based aqua fitness class on Friday evenings in the outdoor pool.',
        can_add_to_cart: true,
        status: 'active'
      }
    );

    localStorage.setItem('programs', JSON.stringify(programs));

    // Pool schedule sessions: generated + additional evening open swim sessions for Task 5
    const sessions = (generatedData.pool_schedule_sessions || []).slice();
    sessions.push(
      {
        id: 'sess_2026_03_11_open_swim_outdoor_pm',
        pool_id: 'outdoor_family_pool',
        title: 'Open Swim - Outdoor Evening',
        session_date: '2026-03-11T00:00:00',
        start_datetime: '2026-03-11T17:30:00',
        end_datetime: '2026-03-11T19:00:00',
        day_of_week: 'wednesday',
        activity_type: 'open_swim',
        pool_type: 'outdoor',
        related_program_id: null
      },
      {
        id: 'sess_2026_03_13_open_swim_indoor_pm',
        pool_id: 'indoor_main_pool',
        title: 'Open Swim - Indoor Late Evening',
        session_date: '2026-03-13T00:00:00',
        start_datetime: '2026-03-13T18:00:00',
        end_datetime: '2026-03-13T20:00:00',
        day_of_week: 'friday',
        activity_type: 'open_swim',
        pool_type: 'indoor',
        related_program_id: null
      }
    );
    localStorage.setItem('pool_schedule_sessions', JSON.stringify(sessions));

    // Lap lane slots: generated + one available slot for tomorrow morning for Task 2
    const lapSlots = (generatedData.lap_lane_slots || []).slice();
    lapSlots.push({
      id: 'lane_slot_2026_03_04_indoor_l4_0600_0700',
      pool_id: 'indoor_main_pool',
      lane_number: 4,
      slot_date: '2026-03-04T00:00:00',
      start_datetime: '2026-03-04T06:00:00',
      end_datetime: '2026-03-04T07:00:00',
      pool_type: 'indoor',
      price: 11,
      max_swimmers: 1,
      is_reserved: false
    });
    localStorage.setItem('lap_lane_slots', JSON.stringify(lapSlots));

    // Lap lane reservations from generated data
    localStorage.setItem('lap_lane_reservations', JSON.stringify(generatedData.lap_lane_reservations || []));

    // Initialize remaining collections if not already initialized
    const collections = [
      'program_registrations',
      'membership_purchases',
      'party_reservations',
      'my_schedule_items',
      'cart',
      'cart_items',
      'orders',
      'order_items'
    ];
    for (let i = 0; i < collections.length; i++) {
      const key = collections[i];
      if (!localStorage.getItem(key)) {
        // For 'cart' we let BusinessLogic manage structure; store null-equivalent
        if (key === 'cart') {
          localStorage.setItem(key, JSON.stringify(null));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RegisterBeginnerSwimClass();
    this.testTask2_ReserveCheapestIndoorLapLane();
    this.testTask3_PurchaseFamilyMembershipLatestClosing();
    this.testTask4_ReserveSaturdayBirthdayParty();
    this.testTask5_AddThreeEveningOpenSwimsToMySchedule();
    this.testTask6_BuyFiveDigitalGuestPasses();
    this.testTask7_EnrollWeekendLifeguardCourse();
    this.testTask8_RegisterTwoEveningAquaFitnessClasses();

    return this.results;
  }

  // Task 1: Register a 7-year-old for earliest Beginner 1 kids swim class after 4 PM under $120
  testTask1_RegisterBeginnerSwimClass() {
    const testName = 'Task 1: Register 7-year-old for earliest Beginner 1 kids swim class';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: load program categories and filters
      const categories = this.logic.getProgramCategories();
      this.assert(Array.isArray(categories), 'Program categories should be an array');

      const kidsCategory = categories.find(function (c) {
        return c.categoryId === 'swim_lessons_kids';
      });
      this.assert(!!kidsCategory, 'Should have kids swim lessons category');

      const filters = this.logic.getProgramFilterOptions('swim_lessons_kids');
      this.assert(filters && typeof filters === 'object', 'Should get program filter options');

      // Search for Beginner 1, ages 6–8, start time >= 16:00, price <= 120
      const searchResult = this.logic.searchPrograms(
        'swim_lessons_kids', // categoryId
        null,                // subcategory
        6,                   // ageMin
        8,                   // ageMax
        'beginner_1',        // skillLevel
        null,                // dayOfWeek
        '16:00',             // startTimeFrom (4:00 PM)
        null,                // startTimeTo
        120,                 // maxPrice
        false,               // includesCprFirstAid
        null,                // weekendsOnly
        null,                // locationPoolType
        'active',            // status
        'start_date_soonest',// sortBy
        1,                   // page
        20                   // pageSize
      );

      this.assert(searchResult && Array.isArray(searchResult.programs), 'searchPrograms should return programs array');
      this.assert(searchResult.programs.length > 0, 'Should find at least one matching kids Beginner 1 class');

      const programs = searchResult.programs;

      // Verify that the first program is the earliest by start_date
      let earliestProgram = programs[0];
      for (let i = 1; i < programs.length; i++) {
        if (new Date(programs[i].start_date) < new Date(earliestProgram.start_date)) {
          earliestProgram = programs[i];
        }
      }
      const chosenProgram = programs[0];
      this.assert(chosenProgram.id === earliestProgram.id, 'First program should be earliest by start date');

      // Get program detail
      const detail = this.logic.getProgramDetail(chosenProgram.id);
      this.assert(detail && detail.program, 'getProgramDetail should return program detail');
      this.assert(detail.program.id === chosenProgram.id, 'Program detail id should match chosen program id');
      this.assert(detail.registrationAllowed === true, 'Registration should be allowed for kids swim lessons');

      // Register 7-year-old child
      const dob = '2017-05-10';
      const regResult = this.logic.registerForProgram(
        chosenProgram.id,
        'Jamie Parker',
        dob,
        'resident',
        '555-123-4567',
        'parent@example.com',
        detail.waiverRequired ? true : false
      );

      this.assert(regResult && regResult.success === true, 'Registration should succeed');
      const registration = regResult.registration;
      this.assert(registration && registration.program_id === chosenProgram.id, 'ProgramRegistration.program_id should link to Program.id');
      this.assert(registration.participant_name === 'Jamie Parker', 'Participant name should match input');
      this.assert(registration.pricing_option === 'resident', 'Pricing option should be resident');

      // Registration summary to verify relationship
      const summary = this.logic.getProgramRegistrationSummary(registration.id);
      this.assert(summary && summary.registration && summary.program, 'Registration summary should include registration and program');
      this.assert(summary.registration.id === registration.id, 'Summary registration id should match');
      this.assert(summary.program.id === chosenProgram.id, 'Summary program id should match chosen program');
      this.assert(summary.registration.program_id === summary.program.id, 'Registration.program_id should equal Program.id in summary');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Reserve cheapest indoor lap lane tomorrow between 6–7 AM under $15
  testTask2_ReserveCheapestIndoorLapLane() {
    const testName = 'Task 2: Reserve cheapest indoor lap lane tomorrow 6–7 AM under $15';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: get lap lane filter options
      const filterOptions = this.logic.getLapLaneFilterOptions();
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should get lap lane filter options');

      // Determine "tomorrow" based on baselineDate metadata when available
      const baseDateStr = this.baselineDate || this.getTodayISO();
      const tomorrow = this.addDaysToISODate(baseDateStr, 1);

      // Search for indoor slots tomorrow between 06:00 and 07:00 under $15
      let searchResult = this.logic.searchLapLaneSlots(
        tomorrow,   // date
        '06:00',    // startTime
        '07:00',    // endTime
        'indoor',   // poolType
        null,       // poolId
        15,         // maxPrice
        false,      // includeReserved
        'price_low_to_high' // sortBy
      );

      this.assert(searchResult && Array.isArray(searchResult.slots), 'searchLapLaneSlots should return slots array');

      // If API didn't exclude reserved slots, we manually filter for available ones
      let availableSlots = searchResult.slots.filter(function (slot) {
        return slot.is_reserved === false;
      });

      // In case includeReserved=false returned none (defensive), retry including reserved then filter
      if (availableSlots.length === 0) {
        searchResult = this.logic.searchLapLaneSlots(
          tomorrow,
          '06:00',
          '07:00',
          'indoor',
          null,
          15,
          true,
          'price_low_to_high'
        );
        this.assert(searchResult && Array.isArray(searchResult.slots), 'searchLapLaneSlots retry should return slots array');
        availableSlots = searchResult.slots.filter(function (slot) {
          return slot.is_reserved === false;
        });
      }

      this.assert(availableSlots.length > 0, 'Should find at least one available indoor lane slot');

      // Verify that first available slot is the cheapest
      const firstAvailable = availableSlots[0];
      let cheapest = firstAvailable;
      for (let i = 1; i < availableSlots.length; i++) {
        if (availableSlots[i].price < cheapest.price) {
          cheapest = availableSlots[i];
        }
      }
      this.assert(firstAvailable.id === cheapest.id, 'First available slot should be the cheapest by price');

      // Get slot detail
      const detail = this.logic.getLapLaneSlotDetail(firstAvailable.id);
      this.assert(detail && detail.slot && detail.pool, 'Slot detail should include slot and pool');
      this.assert(detail.slot.id === firstAvailable.id, 'Detail slot id should match selected slot id');
      this.assert(detail.pool.id === detail.slot.pool_id, 'Slot.pool_id should match Pool.id');

      // Reserve lane
      const reserveResult = this.logic.reserveLapLaneSlot(
        firstAvailable.id,
        'Alex Rivera',
        1,
        '555-222-3333'
      );

      this.assert(reserveResult && reserveResult.success === true, 'Lap lane reservation should succeed');
      const reservation = reserveResult.reservation;
      const updatedSlot = reserveResult.updatedSlot;
      this.assert(reservation && reservation.lap_lane_slot_id === firstAvailable.id, 'Reservation.lap_lane_slot_id should match selected slot');
      this.assert(updatedSlot && updatedSlot.id === firstAvailable.id, 'Updated slot id should match selected slot');
      this.assert(updatedSlot.is_reserved === true, 'Updated slot should be marked reserved');

      // Reservation summary to verify relationship
      const summary = this.logic.getLapLaneReservationSummary(reservation.id);
      this.assert(summary && summary.reservation && summary.slot && summary.pool, 'Reservation summary should include reservation, slot, and pool');
      this.assert(summary.reservation.id === reservation.id, 'Summary reservation id should match');
      this.assert(summary.slot.id === firstAvailable.id, 'Summary slot id should match selected slot');
      this.assert(summary.pool.id === summary.slot.pool_id, 'Summary pool.id should equal slot.pool_id');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Purchase 1-month family membership with pool+fitness under $120, latest closing time (tie -> cheapest)
  testTask3_PurchaseFamilyMembershipLatestClosing() {
    const testName = 'Task 3: Purchase 1-month family membership with latest closing time under $120';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: get membership filter options
      const filterOptions = this.logic.getMembershipFilterOptions();
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should get membership filter options');

      // Search family 1-month plans including pool and fitness access, under $120
      const searchResult = this.logic.searchMembershipPlans(
        'family',        // membershipType
        'one_month',     // duration
        true,            // poolAccessIncluded
        true,            // fitnessCenterIncluded
        120,             // maxPrice
        'active',        // status
        'weekday_close_time_latest' // sortBy
      );

      this.assert(searchResult && Array.isArray(searchResult.plans), 'searchMembershipPlans should return plans array');
      const plans = searchResult.plans;
      this.assert(plans.length > 0, 'Should find at least one qualifying family membership plan');

      // Filter to ensure criteria and then choose with latest weekday_close_time, tie-breaker cheapest price
      const qualifying = plans.filter(function (p) {
        return p.membership_type === 'family' &&
          p.duration === 'one_month' &&
          p.pool_access_included === true &&
          p.fitness_center_included === true &&
          p.price <= 120 &&
          p.weekday_close_time && p.weekday_close_time >= '22:00';
      });
      this.assert(qualifying.length > 0, 'There should be at least one plan closing at or after 22:00 under $120');

      // Find latest close time
      let latestClose = qualifying[0].weekday_close_time;
      for (let i = 1; i < qualifying.length; i++) {
        if (qualifying[i].weekday_close_time > latestClose) {
          latestClose = qualifying[i].weekday_close_time;
        }
      }

      const latestPlans = qualifying.filter(function (p) {
        return p.weekday_close_time === latestClose;
      });
      this.assert(latestPlans.length > 0, 'Should have at least one plan with latest closing time');

      // Among latest closing, choose cheapest price
      let chosenPlan = latestPlans[0];
      for (let i = 1; i < latestPlans.length; i++) {
        if (latestPlans[i].price < chosenPlan.price) {
          chosenPlan = latestPlans[i];
        }
      }

      // Get plan detail
      const detail = this.logic.getMembershipPlanDetail(chosenPlan.id);
      this.assert(detail && detail.plan && detail.plan.id === chosenPlan.id, 'Membership plan detail should match chosen plan');

      // Compute membership start date: next upcoming Monday from baselineDate or today
      const startDateISO = this.getNextMonday(this.baselineDate || this.getTodayISO());

      const purchaseResult = this.logic.purchaseMembership(
        chosenPlan.id,
        'Jordan Lee',
        startDateISO,
        'jordan@example.com'
      );

      this.assert(purchaseResult && purchaseResult.success === true, 'Membership purchase should succeed');
      const purchase = purchaseResult.purchase;
      this.assert(purchase && purchase.membership_plan_id === chosenPlan.id, 'MembershipPurchase.membership_plan_id should match chosen plan');

      const summary = this.logic.getMembershipPurchaseSummary(purchase.id);
      this.assert(summary && summary.purchase && summary.plan, 'Membership purchase summary should include purchase and plan');
      this.assert(summary.purchase.id === purchase.id, 'Summary purchase id should match');
      this.assert(summary.plan.id === chosenPlan.id, 'Summary plan id should match chosen plan');
      this.assert(summary.plan.price <= 120, 'Chosen plan price should be under or equal to $120');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Reserve Saturday birthday party for 15 kids with private room & pizza under $350
  testTask4_ReserveSaturdayBirthdayParty() {
    const testName = 'Task 4: Reserve Saturday birthday party for 15 kids with room & pizza under $350';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: get party categories and filter options
      const categories = this.logic.getPartyCategories();
      this.assert(Array.isArray(categories), 'Party categories should be an array');

      const birthdayCategory = categories.find(function (c) {
        return c.category === 'birthday_party';
      });
      this.assert(!!birthdayCategory, 'Should include birthday party category');

      const filterOptions = this.logic.getPartyFilterOptions();
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should get party filter options');

      // Select a Saturday date, e.g., 2026-07-18 (given in task description)
      const saturdayDate = '2026-07-18';
      const partySize = 15;

      // Search for birthday packages with private room & pizza, under $350, sorted by price low-to-high
      const searchResult = this.logic.searchPartyPackages(
        'birthday_party', // category
        saturdayDate,     // selectedDate
        partySize,        // partySizeChildren
        true,             // includesPrivatePartyRoom
        true,             // includesPizza
        350,              // maxTotalPrice
        'price_low_to_high' // sortBy
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'searchPartyPackages should return results array');

      // Filter results: available on selected date and total price < 350
      const available = searchResult.results.filter(function (r) {
        return r.isAvailableOnSelectedDate === true &&
          typeof r.computedTotalPrice === 'number' &&
          r.computedTotalPrice < 350;
      });
      this.assert(available.length > 0, 'Should find at least one available party package under $350');

      // Pick cheapest by computedTotalPrice
      let cheapest = available[0];
      for (let i = 1; i < available.length; i++) {
        if (available[i].computedTotalPrice < cheapest.computedTotalPrice) {
          cheapest = available[i];
        }
      }

      const chosenPackage = cheapest.partyPackage;
      this.assert(chosenPackage && chosenPackage.id, 'Chosen party package should be defined');

      // Get party package detail with computed total price
      const detail = this.logic.getPartyPackageDetail(chosenPackage.id, saturdayDate, partySize);
      this.assert(detail && detail.partyPackage && detail.partyPackage.id === chosenPackage.id, 'Party package detail should match chosen package');
      if (typeof detail.computedTotalPrice === 'number') {
        this.assert(detail.computedTotalPrice < 350, 'Computed total price should be under $350');
      }

      // Create reservation
      const reservationResult = this.logic.createPartyReservation(
        chosenPackage.id,
        saturdayDate,
        partySize,
        'Maria Chen',
        '555-444-7777',
        'maria@example.com',
        '14:00'
      );

      this.assert(reservationResult && reservationResult.success === true, 'Party reservation should succeed');
      const reservation = reservationResult.reservation;
      this.assert(reservation && reservation.party_package_id === chosenPackage.id, 'PartyReservation.party_package_id should link to PartyPackage.id');
      this.assert(reservation.party_size_children === partySize, 'Party size in reservation should match input');

      const summary = this.logic.getPartyReservationSummary(reservation.id);
      this.assert(summary && summary.reservation && summary.partyPackage, 'Party reservation summary should include reservation and package');
      this.assert(summary.reservation.id === reservation.id, 'Summary reservation id should match');
      this.assert(summary.partyPackage.id === chosenPackage.id, 'Summary party package id should match chosen package');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Add three evening open swim sessions next week (indoor & outdoor) to My Schedule
  testTask5_AddThreeEveningOpenSwimsToMySchedule() {
    const testName = 'Task 5: Add three evening open swim sessions next week to My Schedule';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: get pool schedule filters
      const filters = this.logic.getPoolScheduleFilters();
      this.assert(filters && typeof filters === 'object', 'Should get pool schedule filters');

      // Determine next calendar week Monday from baselineDate or today
      const weekStart = this.getNextMonday(this.baselineDate || this.getTodayISO());

      // Get pool schedule for that week, Open Swim only, sessions starting at or after 17:00
      const weekSchedule = this.logic.getPoolScheduleWeek(
        weekStart,  // weekStartDate (Monday)
        'open_swim',// activityType
        null,       // poolType (both)
        '17:00',    // startTimeFrom (5:00 PM or later)
        null        // startTimeTo
      );

      this.assert(weekSchedule && Array.isArray(weekSchedule.sessions), 'getPoolScheduleWeek should return sessions array');
      const sessions = weekSchedule.sessions;

      // Find Monday indoor open swim
      const mondayIndoor = sessions.find(function (s) {
        return s.day_of_week === 'monday' && s.pool_type === 'indoor';
      });
      this.assert(!!mondayIndoor, 'Should find Monday indoor open swim session');

      // Find Wednesday outdoor open swim
      const wednesdayOutdoor = sessions.find(function (s) {
        return s.day_of_week === 'wednesday' && s.pool_type === 'outdoor';
      });
      this.assert(!!wednesdayOutdoor, 'Should find Wednesday outdoor open swim session');

      // Find Friday open swim (any pool type)
      const fridayAny = sessions.find(function (s) {
        return s.day_of_week === 'friday';
      });
      this.assert(!!fridayAny, 'Should find Friday open swim session');

      // Add three sessions to My Schedule
      const addMon = this.logic.addSessionToMySchedule(mondayIndoor.id);
      this.assert(addMon && addMon.success === true, 'Should successfully add Monday session to My Schedule');

      const addWed = this.logic.addSessionToMySchedule(wednesdayOutdoor.id);
      this.assert(addWed && addWed.success === true, 'Should successfully add Wednesday session to My Schedule');

      const addFri = this.logic.addSessionToMySchedule(fridayAny.id);
      this.assert(addFri && addFri.success === true, 'Should successfully add Friday session to My Schedule');

      // Verify My Schedule contents
      const myScheduleItems = this.logic.getMyScheduleItems();
      this.assert(Array.isArray(myScheduleItems), 'getMyScheduleItems should return an array');

      const addedIds = [mondayIndoor.id, wednesdayOutdoor.id, fridayAny.id];
      const scheduleForWeek = myScheduleItems.filter(function (item) {
        return item.pool_schedule_session_id && addedIds.indexOf(item.pool_schedule_session_id) !== -1;
      });
      this.assert(scheduleForWeek.length === 3, 'Exactly three chosen sessions should be in My Schedule');

      // Verify that MyScheduleItems link back to correct PoolScheduleSessions and include both indoor & outdoor
      const allSessions = JSON.parse(localStorage.getItem('pool_schedule_sessions') || '[]');
      let hasIndoor = false;
      let hasOutdoor = false;
      for (let i = 0; i < scheduleForWeek.length; i++) {
        const schedItem = scheduleForWeek[i];
        const session = allSessions.find(function (s) { return s.id === schedItem.pool_schedule_session_id; });
        this.assert(!!session, 'MyScheduleItem.pool_schedule_session_id should match an existing PoolScheduleSession');
        if (session.pool_type === 'indoor') {
          hasIndoor = true;
        }
        if (session.pool_type === 'outdoor') {
          hasOutdoor = true;
        }
      }
      this.assert(hasIndoor === true, 'At least one scheduled session should be indoor');
      this.assert(hasOutdoor === true, 'At least one scheduled session should be outdoor');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Buy 5 digital guest passes with lowest total price under $60
  testTask6_BuyFiveDigitalGuestPasses() {
    const testName = 'Task 6: Buy 5 digital guest passes with lowest total price under $60';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: get pass filter options
      const filterOptions = this.logic.getPassFilterOptions();
      this.assert(filterOptions && typeof filterOptions === 'object', 'Should get pass filter options');

      // Search for digital guest passes, aiming for 5 total visits under $60
      const searchResult = this.logic.searchPassProducts(
        'guest_passes',  // passType
        'digital_pass',  // format
        5,               // desiredTotalVisits
        60,              // maxTotalPrice
        'price_low_to_high', // sortBy
        true             // isActive
      );

      this.assert(searchResult && Array.isArray(searchResult.passProducts), 'searchPassProducts should return passProducts array');
      const passProducts = searchResult.passProducts;
      this.assert(passProducts.length > 0, 'Should find at least one digital guest pass product');

      // Identify options that yield exactly 5 visits under $60
      const candidateOptions = [];
      for (let i = 0; i < passProducts.length; i++) {
        const product = passProducts[i];
        // Option 1: product itself is a 5-visit pass (quantity 1)
        if (product.visits_per_pass === 5) {
          const totalPrice = product.price * 1;
          if (totalPrice < 60) {
            candidateOptions.push({
              product: product,
              quantity: 1,
              totalVisits: 5,
              totalPrice: totalPrice
            });
          }
        }
        // Option 2: product is single-visit pass, quantity 5
        if (product.visits_per_pass === 1) {
          const totalVisits = 5;
          const quantity = 5;
          const totalPrice = product.price * quantity;
          if (totalPrice < 60) {
            candidateOptions.push({
              product: product,
              quantity: quantity,
              totalVisits: totalVisits,
              totalPrice: totalPrice
            });
          }
        }
      }

      this.assert(candidateOptions.length > 0, 'Should have at least one candidate option providing 5 visits under $60');

      // Choose candidate with lowest total price
      let chosen = candidateOptions[0];
      for (let i = 1; i < candidateOptions.length; i++) {
        if (candidateOptions[i].totalPrice < chosen.totalPrice) {
          chosen = candidateOptions[i];
        }
      }

      const chosenProduct = chosen.product;
      const chosenQuantity = chosen.quantity;
      this.assert(chosen.totalVisits === 5, 'Chosen option should provide exactly 5 visits');

      // Get pass product detail
      const detail = this.logic.getPassProductDetail(chosenProduct.id);
      this.assert(detail && detail.passProduct && detail.passProduct.id === chosenProduct.id, 'Pass product detail should match chosen product');

      // Add chosen passes to cart
      const addResult = this.logic.addPassProductToCart(chosenProduct.id, chosenQuantity);
      this.assert(addResult && addResult.success === true, 'addPassProductToCart should succeed');
      const cartAfterAdd = this.logic.getCartSummary();
      this.assert(cartAfterAdd && Array.isArray(cartAfterAdd.items), 'getCartSummary should return cart items array');

      const addedItem = cartAfterAdd.items.find(function (ci) {
        return ci.pass_product_id === chosenProduct.id;
      });
      this.assert(!!addedItem, 'Cart should contain chosen pass product');
      this.assert(addedItem.quantity === chosenQuantity, 'CartItem.quantity should match chosen quantity');

      // Checkout summary and submit
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && Array.isArray(checkoutSummary.items), 'getCheckoutSummary should return items array');

      const expectedTotal = checkoutSummary.totalAmount;

      const orderResult = this.logic.submitCheckout(
        'Sam Patel',
        'sam@example.com',
        '555-000-1111',
        'credit_debit_card'
      );

      this.assert(orderResult && orderResult.success === true, 'submitCheckout should succeed for guest passes');
      const order = orderResult.order;
      const orderItems = orderResult.orderItems;
      this.assert(order && Array.isArray(orderItems), 'Order and OrderItems should be returned');
      this.assert(orderItems.length > 0, 'There should be at least one order item');

      // Verify order total matches checkout summary total
      if (typeof order.total_amount === 'number') {
        this.assert(Math.abs(order.total_amount - expectedTotal) < 0.0001, 'Order total_amount should match checkout totalAmount');
      }

      // Verify that at least one order item corresponds to the chosen pass product
      const orderPassItem = orderItems.find(function (oi) {
        return oi.pass_product_id === chosenProduct.id;
      });
      this.assert(!!orderPassItem, 'OrderItems should include the chosen pass product');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Enroll in weekend lifeguard certification under $300, ends before June 30, includes CPR, shortest duration
  testTask7_EnrollWeekendLifeguardCourse() {
    const testName = 'Task 7: Enroll in weekend lifeguard certification course under $300 with CPR before June 30';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: get program filter options for training/certifications
      const filters = this.logic.getProgramFilterOptions('training_certifications');
      this.assert(filters && typeof filters === 'object', 'Should get program filter options for training_certifications');

      // Use specialized search wrapper
      const maxEndDate = '2026-06-29';
      const maxPrice = 300;
      const searchResult = this.logic.searchLifeguardCertificationPrograms(
        maxEndDate,
        maxPrice,
        true // requiresCprFirstAid
      );

      this.assert(searchResult && Array.isArray(searchResult.programs), 'searchLifeguardCertificationPrograms should return programs array');
      const programs = searchResult.programs;
      this.assert(programs.length > 0, 'Should find at least one lifeguard certification program');

      // Filter to match criteria explicitly and choose shortest total_duration_hours (tie -> cheapest price)
      const qualifying = programs.filter(function (p) {
        const endDateOK = !p.end_date || new Date(p.end_date) <= new Date(maxEndDate + 'T23:59:59');
        return p.category_id === 'training_certifications' &&
          p.subcategory === 'lifeguard_certification' &&
          p.is_weekends_only === true &&
          p.includes_cpr_first_aid === true &&
          typeof p.price === 'number' && p.price < 300 &&
          endDateOK;
      });
      this.assert(qualifying.length > 0, 'There should be at least one qualifying lifeguard course');

      // Shortest duration
      let chosen = qualifying[0];
      for (let i = 1; i < qualifying.length; i++) {
        if (typeof qualifying[i].total_duration_hours === 'number' &&
            typeof chosen.total_duration_hours === 'number') {
          if (qualifying[i].total_duration_hours < chosen.total_duration_hours) {
            chosen = qualifying[i];
          } else if (qualifying[i].total_duration_hours === chosen.total_duration_hours &&
                     qualifying[i].price < chosen.price) {
            chosen = qualifying[i];
          }
        }
      }

      // Get program detail
      const detail = this.logic.getProgramDetail(chosen.id);
      this.assert(detail && detail.program && detail.program.id === chosen.id, 'Program detail should match chosen lifeguard program');

      // Enroll participant
      const acceptWaiver = detail.waiverRequired ? true : false;
      const regResult = this.logic.registerForProgram(
        chosen.id,
        'Taylor Brooks',
        '2005-03-15',
        'standard',
        '555-666-8888',
        'taylor@example.com',
        acceptWaiver
      );

      this.assert(regResult && regResult.success === true, 'Lifeguard course enrollment should succeed');
      const registration = regResult.registration;
      this.assert(registration && registration.program_id === chosen.id, 'ProgramRegistration.program_id should match chosen lifeguard course');

      // Registration summary and relationship checks
      const summary = this.logic.getProgramRegistrationSummary(registration.id);
      this.assert(summary && summary.registration && summary.program, 'Registration summary should include registration and program');
      this.assert(summary.registration.id === registration.id, 'Summary registration id should match');
      this.assert(summary.program.id === chosen.id, 'Summary program id should match chosen lifeguard course');
      this.assert(summary.program.includes_cpr_first_aid === true, 'Chosen course should include CPR/First Aid');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Register for two different evening aqua fitness classes on different days under $20 each, no time overlap, add both to cart and checkout
  testTask8_RegisterTwoEveningAquaFitnessClasses() {
    const testName = 'Task 8: Register for two different evening aqua fitness classes on different days under $20 each';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigation: get program categories and filters
      const categories = this.logic.getProgramCategories();
      this.assert(Array.isArray(categories), 'Program categories should be an array');

      const filters = this.logic.getProgramFilterOptions('fitness_classes');
      this.assert(filters && typeof filters === 'object', 'Should get program filter options for fitness classes');

      // Use specialized search wrapper for evening aqua fitness classes under $20
      const searchResult = this.logic.searchAquaFitnessEveningClasses(20);
      this.assert(searchResult && Array.isArray(searchResult.programs), 'searchAquaFitnessEveningClasses should return programs array');
      const programs = searchResult.programs;
      this.assert(programs.length >= 2, 'Should find at least two aqua fitness classes');

      // Choose first class on Monday or Tuesday
      const firstClass = programs.find(function (p) {
        return Array.isArray(p.meeting_days) &&
          (p.meeting_days.indexOf('monday') !== -1 || p.meeting_days.indexOf('tuesday') !== -1);
      });
      this.assert(!!firstClass, 'Should find an aqua fitness class on Monday or Tuesday');

      const firstDay = firstClass.meeting_days[0];
      const firstStart = firstClass.start_time;
      const firstEnd = firstClass.end_time;
      const firstStartMinutes = this.timeToMinutes(firstStart);
      const firstEndMinutes = this.timeToMinutes(firstEnd);

      // Choose second class on Wednesday/Thursday/Friday, different class type & non-overlapping time
      let secondClass = null;
      for (let i = 0; i < programs.length; i++) {
        const p = programs[i];
        if (p.id === firstClass.id) {
          continue;
        }
        if (!Array.isArray(p.meeting_days)) {
          continue;
        }
        const hasDesiredDay = p.meeting_days.indexOf('wednesday') !== -1 ||
          p.meeting_days.indexOf('thursday') !== -1 ||
          p.meeting_days.indexOf('friday') !== -1;
        if (!hasDesiredDay) {
          continue;
        }
        // Check for time non-overlap (within 6–8 PM window)
        const sStart = this.timeToMinutes(p.start_time);
        const sEnd = this.timeToMinutes(p.end_time);
        const overlaps = !(sEnd <= firstStartMinutes || firstEndMinutes <= sStart);
        if (!overlaps) {
          secondClass = p;
          break;
        }
      }
      this.assert(!!secondClass, 'Should find a second aqua fitness class on Wed/Thu/Fri with non-overlapping time');

      // First class detail and add to cart
      const firstDetail = this.logic.getProgramDetail(firstClass.id);
      this.assert(firstDetail && firstDetail.program && firstDetail.program.id === firstClass.id, 'First program detail should match');
      this.assert(firstDetail.canAddToCart === true || firstDetail.program.can_add_to_cart === true, 'First aqua fitness class should be addable to cart');

      const addFirst = this.logic.addProgramToCart(firstClass.id, 1);
      this.assert(addFirst && addFirst.success === true, 'addProgramToCart should succeed for first class');

      // Second class detail and add to cart
      const secondDetail = this.logic.getProgramDetail(secondClass.id);
      this.assert(secondDetail && secondDetail.program && secondDetail.program.id === secondClass.id, 'Second program detail should match');
      this.assert(secondDetail.canAddToCart === true || secondDetail.program.can_add_to_cart === true, 'Second aqua fitness class should be addable to cart');

      const addSecond = this.logic.addProgramToCart(secondClass.id, 1);
      this.assert(addSecond && addSecond.success === true, 'addProgramToCart should succeed for second class');

      // Verify cart contents: two program items
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'getCartSummary should return items array');
      const programItems = cartSummary.items.filter(function (ci) {
        return ci.program_id === firstClass.id || ci.program_id === secondClass.id;
      });
      this.assert(programItems.length === 2, 'Cart should contain two aqua fitness program items');

      // Checkout
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && Array.isArray(checkoutSummary.items), 'getCheckoutSummary should return items');

      const totalBefore = checkoutSummary.totalAmount;

      const orderResult = this.logic.submitCheckout(
        'Aqua Fitness User',
        'aquafit@example.com',
        '555-888-7777',
        'credit_debit_card'
      );

      this.assert(orderResult && orderResult.success === true, 'submitCheckout should succeed for aqua fitness classes');
      const order = orderResult.order;
      const orderItems = orderResult.orderItems;
      this.assert(order && Array.isArray(orderItems), 'Order and OrderItems should be returned for aqua fitness checkout');

      if (typeof order.total_amount === 'number') {
        this.assert(Math.abs(order.total_amount - totalBefore) < 0.0001, 'Order total_amount should match checkout totalAmount for aqua fitness');
      }

      // Ensure both program ids appear in order items
      const hasFirst = orderItems.some(function (oi) { return oi.program_id === firstClass.id; });
      const hasSecond = orderItems.some(function (oi) { return oi.program_id === secondClass.id; });
      this.assert(hasFirst && hasSecond, 'OrderItems should include both selected aqua fitness classes');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper: convert 'HH:MM' to minutes
  timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
      return 0;
    }
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  // Helper: get today in 'YYYY-MM-DD'
  getTodayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  // Helper: add days to ISO date string 'YYYY-MM-DD'
  addDaysToISODate(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // Helper: get next Monday on or after the given ISO date; if date is Monday, return that, else next one
  getNextMonday(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay(); // 0=Sun,1=Mon,...
    const daysUntilMonday = (1 - day + 7) % 7 || 7; // if today Monday (1), want next Monday => 7 days
    d.setDate(d.getDate() + daysUntilMonday);
    return d.toISOString().slice(0, 10);
  }

  // Assertions and result recording
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

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
