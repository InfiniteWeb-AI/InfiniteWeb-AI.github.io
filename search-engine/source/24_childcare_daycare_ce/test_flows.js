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
    const generatedData = {
      age_group_options: [
        {
          id: "infants_0_18",
          code: "infants_0_18",
          label: "Infants (0–18 months)",
          min_age_months: 0,
          max_age_months: 18,
          description: "Nurturing care for babies focusing on bonding, safety, sensory play, and early milestones."
        },
        {
          id: "toddlers_2_3",
          code: "toddlers_2_3",
          label: "Toddlers (2–3 years)",
          min_age_months: 24,
          max_age_months: 47,
          description: "Active exploration, language development, and early social skills for busy toddlers."
        },
        {
          id: "preschool_3_5",
          code: "preschool_3_5",
          label: "Preschool (3–5 years)",
          min_age_months: 36,
          max_age_months: 71,
          description: "Kindergarten-readiness program with play-based learning, pre-literacy, and pre-math skills."
        }
      ],
      articles: [
        {
          id: "potty_training_readiness",
          title: "Potty Training Readiness at Daycare",
          slug: "potty-training-readiness-at-daycare",
          summary: "Learn how we assess potty training readiness and partner with families during this milestone.",
          body: "Potty training is a big step for toddlers and families. At our centers, we look for signs of readiness such as staying dry for longer periods, showing interest in the bathroom, and being able to follow simple directions. We never rush or pressure children; instead, we follow their cues and respect each family’s cultural and developmental expectations.\n\nIn the classroom, teachers use positive language, visual cues, and consistent routines to make potty training feel safe and predictable. We encourage families to start introducing the idea at home before we begin active potty training at school. Communication is key: families and teachers stay in touch daily about successes and challenges so we can keep the experience consistent.\n\nWe typically begin offering structured potty training support during the toddler and young preschool years, once both the family and the teaching team agree that a child is ready. If you’re unsure whether your child is ready, talk to your classroom teacher or center director for a personalized plan.",
          topics: ["potty_training", "toddlers", "preschool", "curriculum"],
          is_faq: true,
          related_article_ids: [
            "potty_training_classroom_support",
            "faq_potty_training_policies",
            "sample_day_toddlers"
          ],
          created_at: "2025-04-10T09:00:00Z",
          updated_at: "2025-11-02T15:30:00Z"
        },
        {
          id: "potty_training_classroom_support",
          title: "How We Support Potty Training in Our Curriculum",
          slug: "how-we-support-potty-training-in-our-curriculum",
          summary: "Discover how potty training fits into our toddler and preschool classroom routines.",
          body: "Potty training support is woven into our daily toddler and preschool routines. Teachers offer regular bathroom breaks, gentle reminders, and plenty of time so children don’t feel rushed. We use child-sized toilets or adapters, step stools, and visual schedules so children can independently navigate the process.\n\nOur curriculum focuses on self-help skills, body awareness, and building confidence. Books, songs, and role play help normalize bathroom routines and reduce anxiety. We partner closely with families to decide on language (\"potty\" vs. \"bathroom\"), timing, and strategies such as using training underwear or pull-ups.\n\nTo maintain dignity and privacy, teachers offer help as needed but encourage children to do more independently over time. We never shame or punish accidents; instead, we treat them as a normal part of learning. Families can expect potty training support to begin once children are developmentally ready, typically between ages 2 and 3½.",
          topics: ["potty_training", "curriculum", "daily_schedule", "toddlers"],
          is_faq: false,
          related_article_ids: [
            "potty_training_readiness",
            "curriculum_overview_3_5",
            "sample_day_toddlers"
          ],
          created_at: "2025-05-01T10:15:00Z",
          updated_at: "2025-12-12T11:45:00Z"
        },
        {
          id: "faq_potty_training_policies",
          title: "FAQ: Potty Training Policies for Toddlers and Preschoolers",
          slug: "faq-potty-training-policies",
          summary: "Answers to common questions about when potty training support begins, supplies to bring, and accident policies.",
          body: "This FAQ covers our most common potty training questions.\n\n**When do you start potty training support during the day?**\nWe typically begin active potty training support once a child shows signs of readiness and the family requests support. This is most common between ages 2 and 4. Support is offered during regular classroom hours, with scheduled potty times and additional reminders based on each child’s needs.\n\n**What should families bring?**\nWe ask families to provide several extra changes of clothing, extra socks, and training underwear or pull-ups based on the agreed plan. Please label all items with your child’s name.\n\n**How do you handle accidents?**\nAccidents are treated calmly and respectfully. Teachers quietly help children change and clean up, avoiding any shame or punishment. We communicate with families at pick-up about how the day went.\n\n**Do children need to be fully trained to move to the next classroom?**\nPotty training is never the only factor in classroom placement. We consider age, developmental readiness, and classroom openings. Our goal is to support each child’s progress at their own pace.",
          topics: ["potty_training", "policies", "faqs", "toddlers"],
          is_faq: true,
          related_article_ids: [
            "potty_training_readiness",
            "illness_policy_faq",
            "curriculum_overview_3_5"
          ],
          created_at: "2025-06-05T13:00:00Z",
          updated_at: "2026-01-10T09:20:00Z"
        }
      ],
      newsletter_topics: [
        {
          id: "monthly_newsletter",
          code: "monthly_newsletter",
          name: "Monthly Newsletter",
          description: "Receive a monthly email with center news, curriculum highlights, and parenting tips.",
          is_active: true
        },
        {
          id: "special_events_only",
          code: "special_events_only",
          name: "Special Events Only",
          description: "Get invitations and reminders for family events, open houses, and seasonal celebrations.",
          is_active: true
        },
        {
          id: "general_updates",
          code: "general_updates",
          name: "General Updates",
          description: "Occasional updates about schedule changes, new programs, and important announcements.",
          is_active: true
        }
      ],
      campuses: [
        {
          id: "downtown_campus",
          name: "Downtown Campus",
          slug: "downtown_campus",
          address_line1: "101 Market Street",
          address_line2: "Suite 200",
          city: "San Francisco",
          state: "CA",
          postal_code: "94105",
          country: "USA",
          latitude: 37.7924,
          longitude: -122.3952,
          phone: "415-555-0101",
          email: "downtown@brightpathkids.com",
          description: "Our Downtown Campus is steps from the Embarcadero and ideal for families who live or work in the Financial District and South Beach. Bright, modern classrooms and an indoor gross-motor space make this an excellent option for infants through preschoolers.",
          age_group_codes: ["infants_0_18", "toddlers_2_3", "preschool_3_5"],
          is_active: true
        },
        {
          id: "lakeside_campus",
          name: "Lakeside Campus",
          slug: "lakeside_campus",
          address_line1: "2500 Lakeview Drive",
          address_line2: "",
          city: "San Francisco",
          state: "CA",
          postal_code: "94132",
          country: "USA",
          latitude: 37.7243,
          longitude: -122.4842,
          phone: "415-555-0123",
          email: "lakeside@brightpathkids.com",
          description: "Located near Lake Merced, the Lakeside Campus offers expansive outdoor play areas and nature-inspired learning environments. It serves toddlers, preschoolers, and school-age children with both half-day and full-day options.",
          age_group_codes: ["toddlers_2_3", "preschool_3_5", "school_age_5_12"],
          is_active: true
        },
        {
          id: "riverside_campus",
          name: "Riverside Campus",
          slug: "riverside_campus",
          address_line1: "500 Riverside Way",
          address_line2: "",
          city: "San Francisco",
          state: "CA",
          postal_code: "94107",
          country: "USA",
          latitude: 37.7719,
          longitude: -122.3921,
          phone: "415-555-0145",
          email: "riverside@brightpathkids.com",
          description: "The Riverside Campus sits along Mission Creek, convenient to SoMa and Mission Bay. Families appreciate its cozy infant rooms, dedicated toddler spaces, and a rooftop play deck with bay views.",
          age_group_codes: ["infants_0_18", "toddlers_2_3", "preschool_3_5"],
          is_active: true
        }
      ],
      events: [
        {
          id: "spring_family_picnic_downtown_2026_04_11",
          title: "Spring Family Picnic at Downtown Campus",
          description: "Join us for an outdoor spring picnic with bubbles, sidewalk chalk, and light refreshments. Siblings and extended family are welcome.",
          campus_id: "downtown_campus",
          event_type: "family_event",
          start_datetime: "2026-04-11T13:00:00Z",
          end_datetime: "2026-04-11T15:00:00Z",
          is_free: true,
          price: 0,
          currency: "usd",
          day_of_week: "saturday",
          time_of_day: "afternoon",
          max_attendees: 80,
          requires_rsvp: true,
          image_url: "https://static8.depositphotos.com/1005454/972/i/950/depositphotos_9722946-stock-photo-happy-children-playing-outdoors-in.jpg",
          created_at: "2026-02-20T10:00:00Z"
        },
        {
          id: "lakeside_art_playday_2026_04_12",
          title: "Lakeside Family Art & Play Day",
          description: "An afternoon of open-ended art stations, music, and sensory play in the Lakeside Campus garden.",
          campus_id: "lakeside_campus",
          event_type: "family_event",
          start_datetime: "2026-04-12T14:00:00Z",
          end_datetime: "2026-04-12T16:00:00Z",
          is_free: true,
          price: 0,
          currency: "usd",
          day_of_week: "sunday",
          time_of_day: "afternoon",
          max_attendees: 60,
          requires_rsvp: true,
          image_url: "https://www.fantasticfunandlearning.com/wp-content/uploads/2017/09/vertical-w-text.jpg",
          created_at: "2026-02-21T11:30:00Z"
        },
        {
          id: "riverside_music_mingle_2026_04_25",
          title: "Riverside Music & Mingle Afternoon",
          description: "Sing-alongs, movement games, and a mini instrument-making station for the whole family.",
          campus_id: "riverside_campus",
          event_type: "family_event",
          start_datetime: "2026-04-25T13:30:00Z",
          end_datetime: "2026-04-25T15:30:00Z",
          is_free: true,
          price: 0,
          currency: "usd",
          day_of_week: "saturday",
          time_of_day: "afternoon",
          max_attendees: 75,
          requires_rsvp: true,
          image_url: "https://static.wixstatic.com/media/8bd23a_7542cdc4666146499c89e27cd858018e~mv2.jpg/v1/fill/w_580,h_800,al_c,q_90/8bd23a_7542cdc4666146499c89e27cd858018e~mv2.jpg",
          created_at: "2026-02-25T09:45:00Z"
        }
      ],
      programs: [
        {
          id: "dt_infant_fulltime",
          name: "Downtown Infant Full-Time (5 days)",
          campus_id: "downtown_campus",
          age_group_code: "infants_0_18",
          min_age_years: 0,
          max_age_years: 1.5,
          schedule_type: "full_time_5_days",
          days_per_week: 5,
          daily_start_time: "08:00",
          daily_end_time: "18:00",
          monthly_tuition: 1850,
          annual_tuition: 22200,
          currency: "usd",
          availability_status: "waitlist",
          description: "Full-time care for infants with a focus on bonding, sensory exploration, and individualized routines.",
          is_featured: true,
          created_at: "2025-10-01T09:00:00Z",
          updated_at: "2025-12-15T11:20:00Z"
        },
        {
          id: "rv_infant_three_days",
          name: "Riverside Infant 3-Day Extended",
          campus_id: "riverside_campus",
          age_group_code: "infants_0_18",
          min_age_years: 0,
          max_age_years: 1.5,
          schedule_type: "three_days",
          days_per_week: 3,
          daily_start_time: "08:00",
          daily_end_time: "18:00",
          monthly_tuition: 1150,
          annual_tuition: 13800,
          currency: "usd",
          availability_status: "open",
          description: "Flexible three-day option ideal for families seeking an extended-day schedule for infants.",
          is_featured: false,
          created_at: "2025-09-20T10:30:00Z",
          updated_at: "2025-11-05T14:45:00Z"
        },
        {
          id: "dt_toddler_fulltime_standard",
          name: "Downtown Toddler Full-Time (5 days)",
          campus_id: "downtown_campus",
          age_group_code: "toddlers_2_3",
          min_age_years: 2,
          max_age_years: 3,
          schedule_type: "full_time_5_days",
          days_per_week: 5,
          daily_start_time: "08:30",
          daily_end_time: "17:30",
          monthly_tuition: 1450,
          annual_tuition: 17400,
          currency: "usd",
          availability_status: "open",
          description: "A balanced full-time schedule for toddlers with outdoor play, circle time, and early potty training support.",
          is_featured: true,
          created_at: "2025-08-15T08:45:00Z",
          updated_at: "2025-12-01T13:10:00Z"
        }
      ],
      teachers: [
        {
          id: "maya_chen",
          first_name: "Maya",
          last_name: "Chen",
          full_name: "Maya Chen",
          campus_id: "downtown_campus",
          primary_role: "toddler_teacher",
          age_group_codes: ["toddlers_2_3"],
          years_experience: 8,
          average_rating: 4.9,
          rating_count: 68,
          bio: "Maya has spent the last eight years teaching toddlers in urban childcare centers. She specializes in language-rich classrooms, early social skills, and supporting families through milestones like potty training.",
          certifications: [
            "Child Development Associate (CDA)",
            "Pediatric First Aid & CPR"
          ],
          photo_url: "https://www.ebfc.ca/usercontent/programs/room-to-grow-program-thumb.jpg",
          is_active: true
        },
        {
          id: "andre_garcia",
          first_name: "Andre",
          last_name: "Garcia",
          full_name: "Andre Garcia",
          campus_id: "riverside_campus",
          primary_role: "toddler_teacher",
          age_group_codes: ["toddlers_2_3"],
          years_experience: 6,
          average_rating: 4.7,
          rating_count: 54,
          bio: "Andre brings a calm, playful energy to the toddler classroom. He loves creating outdoor obstacle courses and supporting emerging independence.",
          certifications: [
            "Associate Degree in Early Childhood Education",
            "Pediatric First Aid & CPR"
          ],
          photo_url: "https://07b699682329ca2c59ba-cdfea336cc83f8c10ce4c5c048dc8872.ssl.cf1.rackcdn.com/PortraitPhotographerBostonCynthiaAugustWEBAnnaActress.jpg",
          is_active: true
        },
        {
          id: "priya_patel",
          first_name: "Priya",
          last_name: "Patel",
          full_name: "Priya Patel",
          campus_id: "lakeside_campus",
          primary_role: "toddler_teacher",
          age_group_codes: ["toddlers_2_3", "preschool_3_5"],
          years_experience: 5,
          average_rating: 4.6,
          rating_count: 39,
          bio: "Priya works with older toddlers and young preschoolers at Lakeside, focusing on gentle routines, potty training readiness, and early literacy.",
          certifications: [
            "Child Development Permit",
            "Pediatric First Aid & CPR"
          ],
          photo_url: "https://www.rasmussen.edu/-/media/images/blogs/school-of-nursing/2020/teacher-assistant-duties-s.jpg",
          is_active: true
        }
      ]
    };

    // Persist generated data using storage keys
    localStorage.setItem('age_group_options', JSON.stringify(generatedData.age_group_options || []));
    localStorage.setItem('articles', JSON.stringify(generatedData.articles || []));
    localStorage.setItem('newsletter_topics', JSON.stringify(generatedData.newsletter_topics || []));
    localStorage.setItem('campuses', JSON.stringify(generatedData.campuses || []));
    localStorage.setItem('events', JSON.stringify(generatedData.events || []));
    localStorage.setItem('programs', JSON.stringify(generatedData.programs || []));
    localStorage.setItem('teachers', JSON.stringify(generatedData.teachers || []));

    // Ensure other collections exist as empty arrays for consistency
    const otherKeys = [
      'program_search_contexts',
      'program_comparisons',
      'enrollment_applications',
      'waitlist_entries',
      'tour_requests',
      'tuition_quotes',
      'teacher_favorites',
      'event_rsvps',
      'contact_messages',
      'newsletter_subscriptions'
    ];
    otherKeys.forEach((k) => {
      if (!localStorage.getItem(k)) {
        localStorage.setItem(k, JSON.stringify([]));
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_StartEnrollmentCheapestToddlerProgram();
    this.testTask2_ScheduleDowntownTourWeekdayMorning();
    this.testTask3_CompareProgramsAndJoinWaitlist();
    this.testTask4_TuitionCalculatorAndSaveQuote();
    this.testTask5_FindHighlyRatedToddlerTeacherAndFavorite();
    this.testTask6_RSVPFirstTwoFreeWeekendEvents();
    this.testTask7_SearchPottyTrainingFAQAndContact();
    this.testTask8_NewsletterSignupWithPreferences();

    return this.results;
  }

  // Task 1: Start enrollment for the cheapest full-time toddler program near 94105 under $1,500
  testTask1_StartEnrollmentCheapestToddlerProgram() {
    const testName = 'Task 1: Start enrollment for cheapest full-time toddler program near 94105 under $1,500';
    console.log('Testing:', testName);

    try {
      // 1) Simulate visiting homepage
      const home = this.logic.getHomepageContent();
      this.assert(home && typeof home === 'object', 'Homepage content should load');

      // 2) Load program filter options to determine toddler age group code
      const filterOpts = this.logic.getProgramFilterOptions();
      this.assert(filterOpts && Array.isArray(filterOpts.age_groups), 'Program filter options should include age_groups');

      const toddlerAgeGroup = filterOpts.age_groups.find(
        (g) => g.code === 'toddlers_2_3' || /toddler/i.test(g.label || '')
      );
      this.assert(toddlerAgeGroup, 'Should find toddlers age group option');

      const toddlerCode = toddlerAgeGroup.code;

      // 3) Search programs with given filters
      const postalCode = '94105';
      const distanceMiles = 5;
      const scheduleTypes = ['full_time_5_days'];
      const maxMonthlyTuition = 1500;
      const sortBy = 'price_low_high';

      const searchResult = this.logic.searchPrograms(
        toddlerCode,
        undefined,
        postalCode,
        distanceMiles,
        scheduleTypes,
        maxMonthlyTuition,
        sortBy
      );

      this.assert(searchResult && Array.isArray(searchResult.programs), 'searchPrograms should return programs array');
      this.assert(searchResult.total_results > 0, 'There should be at least one matching toddler program');

      // 4) Verify programs match filter and are sorted by price ascending
      const progs = searchResult.programs;
      for (let i = 0; i < progs.length; i++) {
        const p = progs[i].program;
        this.assert(p.age_group_code === toddlerCode, 'Program age_group_code should match toddlers filter');
        this.assert(
          typeof p.monthly_tuition === 'number' && p.monthly_tuition <= maxMonthlyTuition,
          'Program monthly_tuition should be <= maxMonthlyTuition'
        );
        if (i > 0) {
          const prevTuition = progs[i - 1].program.monthly_tuition;
          this.assert(
            p.monthly_tuition >= prevTuition,
            'Programs should be sorted by price low to high'
          );
        }
        // Confirm within distance by checking postal code match in this limited dataset
        if (searchResult.applied_filters && searchResult.applied_filters.postalCode) {
          this.assert(
            progs[i].campus_postal_code === postalCode,
            'Program campus postal code should match searched postal code in this dataset'
          );
        }
      }

      // 5) Choose the cheapest program (first in sorted list)
      const cheapest = progs[0];
      const chosenProgram = cheapest.program;
      this.assert(chosenProgram && chosenProgram.id, 'Cheapest program should have an id');

      // 6) Load program details
      const details = this.logic.getProgramDetails(chosenProgram.id);
      this.assert(details && details.program && details.program.id === chosenProgram.id, 'getProgramDetails should return the selected program');

      // Check campus relationship using actual data
      const campuses = JSON.parse(localStorage.getItem('campuses') || '[]');
      const campus = campuses.find((c) => c.id === details.program.campus_id);
      this.assert(campus, 'Program campus_id should reference an existing campus');

      // 7) Start enrollment application
      const enrollmentResult = this.logic.startEnrollmentApplication(
        chosenProgram.id,
        undefined, // childName optional at this step
        undefined, // childBirthdate
        undefined, // desiredStartDate
        'Test Parent',
        'test.parent@example.com',
        '555-000-0000'
      );

      this.assert(enrollmentResult && enrollmentResult.success === true, 'Enrollment application should start successfully');
      this.assert(
        enrollmentResult.application && enrollmentResult.application.program_id === chosenProgram.id,
        'EnrollmentApplication.program_id should match chosen program'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Schedule a weekday morning in-person tour at the Downtown Campus between June 10–20
  testTask2_ScheduleDowntownTourWeekdayMorning() {
    const testName = 'Task 2: Schedule weekday morning in-person tour at Downtown Campus (June 10–20)';
    console.log('Testing:', testName);

    try {
      // 1) Load tour form options
      const tourOpts = this.logic.getTourFormOptions();
      this.assert(tourOpts && Array.isArray(tourOpts.campuses), 'Tour options should include campuses');

      // Find Downtown Campus by name from API options
      const downtownCampus = tourOpts.campuses.find((c) => /downtown campus/i.test(c.name || ''));
      this.assert(downtownCampus && downtownCampus.id, 'Should find Downtown Campus from tour options');
      const campusId = downtownCampus.id;

      // Choose in-person tour visit type from API options
      this.assert(Array.isArray(tourOpts.visit_types), 'Tour options should include visit_types');
      const inPersonType = tourOpts.visit_types.find(
        (vt) => vt.value === 'in_person_tour' || /in-?person/i.test(vt.label || '')
      );
      this.assert(inPersonType, 'Should find in-person tour visit type');
      const visitType = inPersonType.value;

      // 2) Request available tour slots between June 10–20 (year chosen per business logic)
      const dateFrom = '2026-06-10';
      const dateTo = '2026-06-20';

      const slotsResult = this.logic.getAvailableTourSlots(
        campusId,
        visitType,
        dateFrom,
        dateTo,
        'morning'
      );

      this.assert(slotsResult && Array.isArray(slotsResult.slots), 'getAvailableTourSlots should return slots array');
      this.assert(slotsResult.slots.length > 0, 'There should be at least one available tour slot');

      // Prefer a weekday slot if available
      let chosenSlot = slotsResult.slots.find((s) => s.is_weekday) || slotsResult.slots[0];
      this.assert(chosenSlot && chosenSlot.start, 'Chosen slot should have a start time');

      const visitStart = chosenSlot.start;
      const visitEnd = chosenSlot.end || undefined;

      // 3) Submit tour request for one child aged 3
      const tourRequestResult = this.logic.submitTourRequest(
        campusId,
        visitType,
        visitStart,
        visitEnd,
        1, // numberOfChildren
        3, // childAgeYears
        'Alex Rivera',
        'alex.rivera@example.com',
        '' // specialRequests
      );

      this.assert(tourRequestResult && tourRequestResult.success === true, 'Tour request should be submitted successfully');
      const tr = tourRequestResult.tour_request;
      this.assert(tr && tr.campus_id === campusId, 'TourRequest.campus_id should match selected campus');
      this.assert(tr.visit_type === visitType, 'TourRequest.visit_type should match selected visit type');
      this.assert(tr.number_of_children === 1, 'TourRequest.number_of_children should be 1');
      this.assert(tr.child_age_years === 3, 'TourRequest.child_age_years should be 3');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3 (adapted to available data): Compare two infant programs (full-time vs 3-day) and join waitlist for cheaper
  testTask3_CompareProgramsAndJoinWaitlist() {
    const testName = 'Task 3: Compare two infant schedule types and join waitlist for cheaper program';
    console.log('Testing:', testName);

    try {
      // Use infants age group (available in data) instead of unavailable preschool at Lakeside
      const infantAgeCode = 'infants_0_18';

      // Search for infant programs including both full_time_5_days and three_days
      const searchResult = this.logic.searchPrograms(
        infantAgeCode,
        undefined,
        undefined,
        undefined,
        ['full_time_5_days', 'three_days'],
        undefined,
        'price_low_high'
      );

      this.assert(searchResult && Array.isArray(searchResult.programs), 'searchPrograms should return programs array');
      this.assert(searchResult.total_results >= 2, 'There should be at least two infant programs for comparison');

      const list = searchResult.programs;
      const fullTime = list.find((p) => p.program.schedule_type === 'full_time_5_days');
      const threeDays = list.find((p) => p.program.schedule_type === 'three_days');
      this.assert(fullTime, 'Should find a full_time_5_days infant program');
      this.assert(threeDays, 'Should find a three_days infant program');

      const programIds = [fullTime.program.id, threeDays.program.id];

      // Create comparison
      const comparisonResult = this.logic.createProgramComparison(programIds);
      this.assert(comparisonResult && Array.isArray(comparisonResult.programs), 'createProgramComparison should return programs array');
      this.assert(comparisonResult.programs.length === 2, 'Comparison should include exactly two programs');

      // Determine cheaper by annual tuition using actual response
      const compPrograms = comparisonResult.programs;
      compPrograms.forEach((cp) => {
        this.assert(
          typeof cp.annual_tuition === 'number',
          'Each compared program should include annual_tuition number'
        );
      });

      let cheapestProgramEntry = compPrograms[0];
      for (let i = 1; i < compPrograms.length; i++) {
        if (compPrograms[i].annual_tuition < cheapestProgramEntry.annual_tuition) {
          cheapestProgramEntry = compPrograms[i];
        }
      }

      const cheapestProgramIdFromCalc = cheapestProgramEntry.program.id;
      if (comparisonResult.cheapest_program_id) {
        this.assert(
          comparisonResult.cheapest_program_id === cheapestProgramIdFromCalc,
          'cheapest_program_id should match the program with lowest annual tuition'
        );
      }

      const cheapestProgramId = comparisonResult.cheapest_program_id || cheapestProgramIdFromCalc;

      // Join waitlist for the cheaper program for child "Jordan Lee"
      const desiredStartMonth = 'september';
      const desiredStartYear = new Date().getFullYear();

      const waitlistResult = this.logic.createWaitlistEntry(
        cheapestProgramId,
        'Jordan Lee',
        4, // childAgeYears (adapted from original task)
        desiredStartMonth,
        desiredStartYear,
        ''
      );

      this.assert(waitlistResult && waitlistResult.success === true, 'Waitlist entry should be created successfully');
      const wl = waitlistResult.waitlist_entry;
      this.assert(wl && wl.program_id === cheapestProgramId, 'WaitlistEntry.program_id should match chosen cheaper program');
      this.assert(wl.child_name === 'Jordan Lee', 'WaitlistEntry.child_name should be Jordan Lee');
      this.assert(wl.desired_start_month === desiredStartMonth, 'WaitlistEntry.desired_start_month should match selected month');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Use tuition calculator for 3-day extended infant schedule under $1,000 and save quote
  testTask4_TuitionCalculatorAndSaveQuote() {
    const testName = 'Task 4: Tuition calculator for infant M/W/F extended schedule and save quote';
    console.log('Testing:', testName);

    try {
      // 1) Load tuition overview (simulating navigation to Tuition & Schedules)
      const overview = this.logic.getTuitionOverview();
      this.assert(overview && Array.isArray(overview.age_group_summaries), 'Tuition overview should load with age_group_summaries');

      // 2) Load calculator options
      const calcOpts = this.logic.getTuitionCalculatorOptions();
      this.assert(calcOpts && Array.isArray(calcOpts.age_groups), 'Calculator options should include age_groups');

      const infantAgeOption = calcOpts.age_groups.find((g) => g.code === 'infants_0_18');
      this.assert(infantAgeOption, 'Should find infants age group option for calculator');
      const ageGroupCode = infantAgeOption.code;

      // Select Monday, Wednesday, Friday from options
      this.assert(Array.isArray(calcOpts.days_of_week), 'Calculator options should include days_of_week');
      const daysOfWeekValues = calcOpts.days_of_week.map((d) => d.value);
      ['monday', 'wednesday', 'friday'].forEach((dow) => {
        this.assert(daysOfWeekValues.includes(dow), 'Calculator days_of_week should include ' + dow);
      });
      const selectedDays = ['monday', 'wednesday', 'friday'];

      // Select dropoff 08:00 and pickup 18:00 from time_options
      this.assert(Array.isArray(calcOpts.time_options), 'Calculator options should include time_options');
      const dropOpt = calcOpts.time_options.find((t) => t.value === '08:00');
      const pickOpt = calcOpts.time_options.find((t) => t.value === '18:00');
      this.assert(dropOpt, 'Time options should include 08:00');
      this.assert(pickOpt, 'Time options should include 18:00');

      const dropoffTime = dropOpt.value;
      const pickupTime = pickOpt.value;
      const maxBudget = 1000;

      // 3) Calculate tuition estimate
      const estimateResult = this.logic.getTuitionEstimate(
        ageGroupCode,
        selectedDays,
        dropoffTime,
        pickupTime,
        maxBudget
      );

      this.assert(estimateResult && typeof estimateResult.estimated_monthly_tuition === 'number', 'getTuitionEstimate should return numeric estimated_monthly_tuition');
      this.assert(Array.isArray(estimateResult.days_of_week), 'Estimate should include days_of_week array');
      this.assert(estimateResult.dropoff_time === dropoffTime, 'Estimate.dropoff_time should match requested dropoffTime');
      this.assert(estimateResult.pickup_time === pickupTime, 'Estimate.pickup_time should match requested pickupTime');

      // Validate budget flag consistency
      this.assert(typeof estimateResult.is_within_budget === 'boolean', 'Estimate should include is_within_budget boolean');
      this.assert(typeof estimateResult.budget_difference === 'number', 'Estimate should include budget_difference number');
      if (estimateResult.is_within_budget) {
        this.assert(
          estimateResult.budget_difference <= 0,
          'budget_difference should be <= 0 when within budget'
        );
      } else {
        this.assert(
          estimateResult.budget_difference >= 0,
          'budget_difference should be >= 0 when over budget'
        );
      }

      // 4) Save quote using last calculator state
      const email = 'parent@example.com';
      const quoteName = 'Infant M/W/F extended';
      const saveResult = this.logic.saveTuitionQuote(email, quoteName, '');

      this.assert(saveResult && saveResult.success === true, 'Tuition quote should be saved successfully');
      const quote = saveResult.quote;
      this.assert(quote && quote.email === email, 'Saved quote.email should match input email');
      this.assert(quote.quote_name === quoteName, 'Saved quote.quote_name should match input name');
      this.assert(quote.age_group_code === ageGroupCode, 'Saved quote.age_group_code should match infants group');
      this.assert(Array.isArray(quote.days_of_week), 'Saved quote should include days_of_week');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Find highly rated toddler teacher (>=5 years, >=4.5 stars) and add to favorites
  testTask5_FindHighlyRatedToddlerTeacherAndFavorite() {
    const testName = 'Task 5: Find highly rated toddler teacher with 5+ years and add to favorites';
    console.log('Testing:', testName);

    try {
      // 1) Load teacher filter options
      const teacherOpts = this.logic.getTeacherFilterOptions();
      this.assert(teacherOpts && Array.isArray(teacherOpts.roles), 'Teacher filter options should include roles');

      // Determine toddler teacher role value
      const toddlerRole = teacherOpts.roles.find(
        (r) => r.value === 'toddler_teacher' || /toddler/i.test(r.label || '')
      );
      this.assert(toddlerRole, 'Should find toddler_teacher role option');
      const primaryRole = toddlerRole.value;

      // 2) Search for toddler teachers with min 5 years experience and 4.5+ rating
      const minYearsExperience = 5;
      const minRating = 4.5;
      const sortBy = 'rating_high_low';

      const searchResult = this.logic.searchTeachers(
        primaryRole,
        'toddlers_2_3',
        minYearsExperience,
        minRating,
        undefined,
        sortBy
      );

      this.assert(searchResult && Array.isArray(searchResult.teachers), 'searchTeachers should return teachers array');
      this.assert(searchResult.total_results > 0, 'There should be at least one matching toddler teacher');

      // Ensure filters applied
      const teachers = searchResult.teachers;
      teachers.forEach((t) => {
        const teacher = t.teacher;
        this.assert(teacher.primary_role === primaryRole, 'Teacher.primary_role should match toddler role');
        this.assert(teacher.years_experience >= minYearsExperience, 'Teacher.years_experience should be >= minYearsExperience');
        this.assert(teacher.average_rating >= minRating, 'Teacher.average_rating should be >= minRating');
      });

      // Ensure sorted by rating desc
      for (let i = 1; i < teachers.length; i++) {
        const prev = teachers[i - 1].teacher.average_rating;
        const curr = teachers[i].teacher.average_rating;
        this.assert(prev >= curr, 'Teachers should be sorted by rating high to low');
      }

      // 3) Open top-rated teacher profile
      const topTeacher = teachers[0].teacher;
      this.assert(topTeacher && topTeacher.id, 'Top-rated teacher should have an id');

      const details = this.logic.getTeacherDetails(topTeacher.id);
      this.assert(details && details.teacher && details.teacher.id === topTeacher.id, 'getTeacherDetails should return the selected teacher');

      // 4) Add teacher to favorites with label
      const label = 'Preferred toddler teacher';
      const favResult = this.logic.addTeacherFavorite(topTeacher.id, label);
      this.assert(favResult && favResult.success === true, 'addTeacherFavorite should succeed');
      const fav = favResult.favorite;
      this.assert(fav && fav.teacher_id === topTeacher.id, 'TeacherFavorite.teacher_id should match selected teacher');
      if (fav.label) {
        this.assert(fav.label === label, 'TeacherFavorite.label should match provided label');
      }

      // 5) Verify favorite appears in favorites list
      const favoritesResult = this.logic.getTeacherFavorites();
      this.assert(favoritesResult && Array.isArray(favoritesResult.favorites), 'getTeacherFavorites should return favorites array');

      const foundFav = favoritesResult.favorites.find(
        (entry) => entry.favorite && entry.favorite.teacher_id === topTeacher.id
      );
      this.assert(foundFav, 'Favorite list should include the selected teacher');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: RSVP to the first two free weekend family events next month in the afternoon (3 attendees each)
  testTask6_RSVPFirstTwoFreeWeekendEvents() {
    const testName = 'Task 6: RSVP to first two free weekend afternoon family events next month (3 attendees each)';
    console.log('Testing:', testName);

    try {
      // Use stored events to determine target month (adapted "next month" to month of first event)
      const eventsData = JSON.parse(localStorage.getItem('events') || '[]');
      this.assert(Array.isArray(eventsData) && eventsData.length >= 2, 'There should be at least two events in test data');

      const firstEvent = eventsData[0];
      const firstDate = new Date(firstEvent.start_datetime);
      const yyyy = firstDate.getUTCFullYear();
      const mm = String(firstDate.getUTCMonth() + 1).padStart(2, '0');
      const targetMonth = `${yyyy}-${mm}`; // e.g., '2026-04'

      // 1) Load event filter options (simulating UI filter selection)
      const eventOpts = this.logic.getEventFilterOptions();
      this.assert(eventOpts && Array.isArray(eventOpts.event_types), 'Event filter options should include event_types');

      const familyEventType = eventOpts.event_types.find(
        (t) => t.value === 'family_event' || /family event/i.test(t.label || '')
      );
      this.assert(familyEventType, 'Should find family_event type option');

      const priceFilterValue = 'free';
      const daysOfWeek = ['saturday', 'sunday'];
      const timeOfDay = 'afternoon';

      // 2) Query events for target month with filters
      const eventsResult = this.logic.getEvents(
        targetMonth,
        familyEventType.value,
        priceFilterValue,
        daysOfWeek,
        timeOfDay
      );

      this.assert(eventsResult && Array.isArray(eventsResult.events), 'getEvents should return events array');
      this.assert(eventsResult.total_results >= 2, 'There should be at least two matching free weekend afternoon family events');

      const matchingEvents = eventsResult.events;
      const toRsvp = matchingEvents.slice(0, 2);

      // 3) RSVP for first two events with 3 attendees each
      for (let i = 0; i < toRsvp.length; i++) {
        const evtWrapper = toRsvp[i];
        const eventId = evtWrapper.event.id;

        // Load event details
        const details = this.logic.getEventDetails(eventId);
        this.assert(details && details.event && details.event.id === eventId, 'getEventDetails should return the selected event');

        // Submit RSVP
        const rsvpResult = this.logic.submitEventRSVP(
          eventId,
          3, // numberOfAttendees
          'Test Family',
          'family@example.com',
          ''
        );

        this.assert(rsvpResult && rsvpResult.success === true, 'submitEventRSVP should succeed');
        const rsvp = rsvpResult.rsvp;
        this.assert(rsvp && rsvp.event_id === eventId, 'EventRSVP.event_id should match selected event');
        this.assert(rsvp.number_of_attendees === 3, 'EventRSVP.number_of_attendees should be 3');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Search FAQs about potty training and send contact form with related question
  testTask7_SearchPottyTrainingFAQAndContact() {
    const testName = 'Task 7: Search potty training FAQs and send curriculum & potty training contact message';
    console.log('Testing:', testName);

    try {
      // 1) Load FAQ search options (simulating navigation to Help & FAQs)
      const faqOpts = this.logic.getFAQSearchOptions();
      this.assert(faqOpts && Array.isArray(faqOpts.topics), 'FAQ search options should include topics');

      // 2) Search for articles with query 'potty training' limited to FAQ
      const query = 'potty training';
      const articlesResult = this.logic.searchArticles(query, undefined, true);
      this.assert(articlesResult && Array.isArray(articlesResult.articles), 'searchArticles should return articles array');
      this.assert(articlesResult.total_results > 0, 'There should be at least one potty training FAQ result');

      // Choose first article whose title or snippet mentions 'potty training'
      const pottyRegex = /potty training/i;
      let selectedArticleEntry = articlesResult.articles.find((a) => {
        const title = (a.article && a.article.title) || '';
        const snippet = a.snippet || '';
        return pottyRegex.test(title) || pottyRegex.test(snippet);
      });

      if (!selectedArticleEntry) {
        selectedArticleEntry = articlesResult.articles[0];
      }

      const article = selectedArticleEntry.article;
      this.assert(article && article.id, 'Selected article should have an id');
      const articleId = article.id;

      // 3) Load full article details
      const articleDetails = this.logic.getArticleDetails(articleId, undefined);
      this.assert(articleDetails && articleDetails.article && articleDetails.article.id === articleId, 'getArticleDetails should return selected article');

      // 4) Load contact form options for this article
      const contactOpts = this.logic.getContactFormOptions(articleId);
      this.assert(contactOpts && Array.isArray(contactOpts.subjects), 'Contact form options should include subjects');

      // Find the 'Curriculum & Potty Training' subject by label or enum value
      const subjectEntry = contactOpts.subjects.find(
        (s) =>
          s.value === 'curriculum_potty_training' ||
          /curriculum.*potty training/i.test(s.label || '')
      );
      this.assert(subjectEntry, 'Should find Curriculum & Potty Training subject option');

      const subjectValue = subjectEntry.value;

      // 5) Submit contact message
      const messageText = 'When do you start potty training support during the day?';
      const name = 'Taylor Morgan';
      const phone = '555-123-4567';

      const contactResult = this.logic.submitContactMessage(
        subjectValue,
        messageText,
        name,
        undefined, // email optional for this test
        phone,
        articleId
      );

      this.assert(contactResult && contactResult.success === true, 'submitContactMessage should succeed');
      const cm = contactResult.contact_message;
      this.assert(cm && cm.subject === subjectValue, 'ContactMessage.subject should match selected subject');
      this.assert(cm.message === messageText, 'ContactMessage.message should match input question');
      this.assert(cm.name === name, 'ContactMessage.name should match input name');
      this.assert(cm.phone === phone, 'ContactMessage.phone should match input phone');
      this.assert(cm.article_id === articleId, 'ContactMessage.article_id should link back to originating article');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Sign up for email newsletter with topics, center preference, and child age ranges
  testTask8_NewsletterSignupWithPreferences() {
    const testName = 'Task 8: Newsletter signup with topics, preferred center, and child age ranges';
    console.log('Testing:', testName);

    try {
      // 1) Load newsletter signup options
      const signupOpts = this.logic.getNewsletterSignupOptions();
      this.assert(signupOpts && Array.isArray(signupOpts.topics), 'Newsletter options should include topics');
      this.assert(Array.isArray(signupOpts.campuses), 'Newsletter options should include campuses');
      this.assert(Array.isArray(signupOpts.age_groups), 'Newsletter options should include age_groups');

      // Resolve topic codes for 'Monthly Newsletter' and 'Special Events Only'
      const monthlyTopic = signupOpts.topics.find((t) => /monthly newsletter/i.test(t.name || ''));
      const specialEventsTopic = signupOpts.topics.find((t) => /special events only/i.test(t.name || ''));
      this.assert(monthlyTopic && specialEventsTopic, 'Should find Monthly Newsletter and Special Events Only topics');
      const topicCodes = [monthlyTopic.code, specialEventsTopic.code];

      // Resolve preferred campus 'Riverside Campus'
      const riversideCampus = signupOpts.campuses.find((c) => /riverside campus/i.test(c.name || ''));
      this.assert(riversideCampus && riversideCampus.id, 'Should find Riverside Campus in newsletter campuses');
      const preferredCampusId = riversideCampus.id;

      // Resolve age groups: infants and toddlers
      const infantsAge = signupOpts.age_groups.find((g) => g.code === 'infants_0_18' || /infants/i.test(g.label || ''));
      const toddlersAge = signupOpts.age_groups.find((g) => g.code === 'toddlers_2_3' || /toddlers/i.test(g.label || ''));
      this.assert(infantsAge && toddlersAge, 'Should find infants and toddlers age groups for newsletter');
      const childAgeGroupCodes = [infantsAge.code, toddlersAge.code];

      // 2) Subscribe to newsletter
      const fullName = 'Casey Patel';
      const email = 'casey.patel@example.com';
      const postalCode = '10001';

      const subscribeResult = this.logic.subscribeToNewsletter(
        fullName,
        email,
        postalCode,
        preferredCampusId,
        topicCodes,
        childAgeGroupCodes
      );

      this.assert(subscribeResult && subscribeResult.success === true, 'subscribeToNewsletter should succeed');
      const sub = subscribeResult.subscription;

      this.assert(sub && sub.full_name === fullName, 'NewsletterSubscription.full_name should match input');
      this.assert(sub.email === email, 'NewsletterSubscription.email should match input');
      if (sub.postal_code) {
        this.assert(sub.postal_code === postalCode, 'NewsletterSubscription.postal_code should match input');
      }
      if (sub.preferred_campus_id) {
        this.assert(
          sub.preferred_campus_id === preferredCampusId,
          'NewsletterSubscription.preferred_campus_id should match selected campus'
        );
      }
      if (Array.isArray(sub.topic_codes)) {
        this.assert(
          topicCodes.every((code) => sub.topic_codes.includes(code)),
          'NewsletterSubscription.topic_codes should include selected topics'
        );
      }
      if (Array.isArray(sub.child_age_group_codes)) {
        this.assert(
          childAgeGroupCodes.every((code) => sub.child_age_group_codes.includes(code)),
          'NewsletterSubscription.child_age_group_codes should include selected age groups'
        );
      }
      this.assert(sub.is_active === true, 'NewsletterSubscription.is_active should be true for new subscription');

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

// Export for Node.js ONLY
module.exports = TestRunner;
