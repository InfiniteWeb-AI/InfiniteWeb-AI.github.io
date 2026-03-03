class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data - used ONLY here for initial localStorage population
    const generatedData = {
      campus_sites: [
        {
          id: 'midtown_atlanta_campus',
          name: 'Midtown Atlanta Children\'s Ministry Center',
          campus_type: 'main_campus',
          address_line1: '1200 Peachtree St NE',
          address_line2: 'Suite 300',
          city: 'Atlanta',
          state: 'GA',
          postal_code: '30309',
          country: 'USA',
          latitude: 33.7886,
          longitude: -84.3835
        },
        {
          id: 'northside_family_campus',
          name: 'Northside Family Campus',
          campus_type: 'satellite_campus',
          address_line1: '4555 Roswell Rd NE',
          address_line2: '',
          city: 'Atlanta',
          state: 'GA',
          postal_code: '30342',
          country: 'USA',
          latitude: 33.8762,
          longitude: -84.3793
        },
        {
          id: 'westside_community_center',
          name: 'Westside Kids Community Center',
          campus_type: 'community_center',
          address_line1: '880 Donald Lee Hollowell Pkwy NW',
          address_line2: '',
          city: 'Atlanta',
          state: 'GA',
          postal_code: '30318',
          country: 'USA',
          latitude: 33.7768,
          longitude: -84.4233
        }
      ],
      child_profiles: [
        {
          id: 'cp_anna_7_kenya',
          display_name: 'Anna',
          age: 7,
          gender: 'female',
          country: 'Kenya',
          region: 'Nakuru County',
          bio: 'Anna loves listening to Bible stories with her grandmother and enjoys reading picture books about Jesus.',
          default_monthly_amount: 35,
          monthly_amount_options: [30, 35, 40],
          profile_image_url: 'https://www.pvnccdsb.on.ca/wp-content/uploads/2018/07/iStock-175408075-2000x750.jpg',
          date_listed: '2023-02-10T09:00:00Z',
          status: 'available'
        },
        {
          id: 'cp_david_8_philippines',
          display_name: 'David',
          age: 8,
          gender: 'male',
          country: 'Philippines',
          region: 'Cebu',
          bio: 'David is in second grade and his favorite time of day is when his teacher reads Bible stories to the class.',
          default_monthly_amount: 32,
          monthly_amount_options: [30, 32, 36, 40],
          profile_image_url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=600&fit=crop&auto=format&q=80',
          date_listed: '2022-11-05T14:30:00Z',
          status: 'available'
        },
        {
          id: 'cp_mia_6_guatemala',
          display_name: 'Mia',
          age: 6,
          gender: 'female',
          country: 'Guatemala',
          region: 'Alta Verapaz',
          bio: 'Mia has just started learning to read and loves picture Bibles and singing simple Scripture songs.',
          default_monthly_amount: 30,
          monthly_amount_options: [30, 33, 37],
          profile_image_url: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=800&h=600&fit=crop&auto=format&q=80',
          date_listed: '2021-09-18T10:15:00Z',
          status: 'available'
        }
      ],
      craft_activities: [
        {
          id: 'easter_cross_suncatcher',
          title: 'Easter Cross Tissue Paper Suncatcher',
          summary: 'Kids create a colorful cross-shaped suncatcher to remember Jesus\' resurrection.',
          min_age: 6,
          max_age: 8,
          seasonal_topic: 'easter',
          topic_tags: ['easter', 'cross', 'resurrection', 'craft'],
          estimated_duration_minutes: 20,
          difficulty_level: 'easy',
          download_count: 1842,
          thumbnail_image_url: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&h=600&fit=crop&auto=format&q=80',
          resource_file_url: 'https://arxiv.org/pdf/2404.07972',
          status: 'active'
        },
        {
          id: 'easter_empty_tomb_garden',
          title: 'Mini \u0022Empty Tomb\u0022 Easter Garden',
          summary: 'Build a small Easter garden with an empty tomb to visualize the resurrection story.',
          min_age: 6,
          max_age: 8,
          seasonal_topic: 'easter',
          topic_tags: ['easter', 'resurrection', 'empty tomb', 'hands-on'],
          estimated_duration_minutes: 30,
          difficulty_level: 'medium',
          download_count: 1720,
          thumbnail_image_url: 'https://www.tilledsoil.org/wp-content/uploads/2016/03/Resurrection_Easter_scene_feature.jpg',
          resource_file_url: 'https://arxiv.org/pdf/2404.07972',
          status: 'active'
        },
        {
          id: 'easter_he_is_risen_card',
          title: '\u0022He Is Risen\u0022 Pop-Up Easter Card',
          summary: 'Children make a simple pop-up card to share the Easter message with family and friends.',
          min_age: 6,
          max_age: 8,
          seasonal_topic: 'easter',
          topic_tags: ['easter', 'card', 'sharing faith'],
          estimated_duration_minutes: 25,
          difficulty_level: 'easy',
          download_count: 1655,
          thumbnail_image_url: 'https://cheerfully-given.imgix.net/vendors/ZOE/Files/C413D134-BDB4-43FE-9B2D-110D6C92C356.jpeg?auto=format%2Ccompression&fit=clip&h=1000&ixlib=php-1.1.0&q=&s=6445739db139f30bff3e63f8f8241252',
          resource_file_url: 'https://arxiv.org/pdf/2404.07972',
          status: 'active'
        }
      ],
      donation_funds: [
        {
          id: 'childrens_bible_story_kits',
          name: 'Children\'s Bible Story Kits',
          slug: 'childrens-bible-story-kits',
          description: 'Provides illustrated Bibles, story cards, and activity guides for children to explore God\'s Word at home and in church.',
          default_amount_suggestions: [25, 35, 50, 75],
          status: 'active'
        },
        {
          id: 'summer_bible_camp_scholarships',
          name: 'Summer Bible Camp Scholarships',
          slug: 'summer-bible-camp-scholarships',
          description: 'Helps children from low-income families attend summer Bible camp and hear about Jesus.',
          default_amount_suggestions: [50, 100, 150, 200],
          status: 'active'
        },
        {
          id: 'general_childrens_ministry',
          name: 'General Children\'s Ministry Fund',
          slug: 'general-childrens-ministry',
          description: 'Supports ongoing children\'s ministry programs, volunteer training, and resource development.',
          default_amount_suggestions: [20, 40, 75, 100],
          status: 'active'
        }
      ],
      lesson_plans: [
        {
          id: 'lp_parables_lost_sheep_5_7',
          title: 'Parable of the Lost Sheep (Ages 5\u20137)',
          topic_category: 'teachings_of_jesus',
          topic_subcategory: 'parables',
          scripture_reference: 'Luke 15:1\u20137',
          summary: 'Children learn how God lovingly seeks each one of us, like a shepherd searching for a lost sheep.',
          min_age: 5,
          max_age: 7,
          estimated_duration_minutes: 30,
          download_count: 980,
          status: 'active'
        },
        {
          id: 'lp_parables_good_samaritan_5_7',
          title: 'Parable of the Good Samaritan (Ages 5\u20137)',
          topic_category: 'teachings_of_jesus',
          topic_subcategory: 'parables',
          scripture_reference: 'Luke 10:25\u201337',
          summary: 'Kids explore what it means to love their neighbor through the story of the Good Samaritan.',
          min_age: 5,
          max_age: 7,
          estimated_duration_minutes: 35,
          download_count: 1125,
          status: 'active'
        },
        {
          id: 'lp_parables_sower_5_7',
          title: 'Parable of the Sower (Ages 5\u20137)',
          topic_category: 'teachings_of_jesus',
          topic_subcategory: 'parables',
          scripture_reference: 'Mark 4:1\u201320',
          summary: 'Through hands-on activities, children discover how God\'s Word can grow in their hearts.',
          min_age: 5,
          max_age: 7,
          estimated_duration_minutes: 30,
          download_count: 890,
          status: 'active'
        }
      ],
      product_categories: [
        {
          id: 'curriculum_sets',
          name: 'Curriculum Sets',
          slug: 'curriculum-sets',
          description: 'Multi-week children\'s ministry curriculum sets organized by age group and theme.',
          image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'devotional_books',
          name: 'Devotional Books',
          slug: 'devotional-books',
          description: 'Print and digital devotionals designed for children and families.',
          image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'activity_packs',
          name: 'Activity Packs',
          slug: 'activity-packs',
          description: 'Printable activity packs including games, puzzles, and take-home sheets.',
          image: 'https://images.unsplash.com/photo-1545235617-9465c4b8ba60?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      child_interest_tags: [
        {
          id: 'cit_anna_reading_bible',
          child_profile_id: 'cp_anna_7_kenya',
          interest: 'reading_and_bible_stories'
        },
        {
          id: 'cit_anna_music',
          child_profile_id: 'cp_anna_7_kenya',
          interest: 'music'
        },
        {
          id: 'cit_david_reading_bible',
          child_profile_id: 'cp_david_8_philippines',
          interest: 'reading_and_bible_stories'
        }
      ],
      events: [
        {
          id: 'midtown_summer_bible_camp_week1_2025',
          title: 'Summer Bible Camp Week 1 \u2013 \u0022Shine for Jesus\u0022',
          event_type: 'summer_bible_camp',
          description: 'A five-morning Bible camp with worship, small groups, games, and Bible stories for ages 7\u201310.',
          start_date: '2025-07-07T09:00:00Z',
          end_date: '2025-07-11T12:00:00Z',
          min_age: 7,
          max_age: 10,
          base_price_per_child: 165,
          location_name: 'Midtown Atlanta Children\'s Ministry Center',
          campus_site_id: 'midtown_atlanta_campus',
          address_line1: '1200 Peachtree St NE',
          address_city: 'Atlanta',
          address_state: 'GA',
          address_postal_code: '30309',
          status: 'published',
          max_capacity_total: 80,
          created_at: '2025-01-15T15:00:00Z'
        },
        {
          id: 'midtown_summer_bible_camp_week2_2025',
          title: 'Summer Bible Camp Week 2 \u2013 \u0022Faith Builders\u0022',
          event_type: 'summer_bible_camp',
          description: 'Hands-on Bible lessons and creative activities for kids, with a focus on building strong faith foundations.',
          start_date: '2025-07-14T09:00:00Z',
          end_date: '2025-07-18T12:00:00Z',
          min_age: 7,
          max_age: 10,
          base_price_per_child: 185,
          location_name: 'Midtown Atlanta Children\'s Ministry Center',
          campus_site_id: 'midtown_atlanta_campus',
          address_line1: '1200 Peachtree St NE',
          address_city: 'Atlanta',
          address_state: 'GA',
          address_postal_code: '30309',
          status: 'published',
          max_capacity_total: 80,
          created_at: '2025-01-20T14:00:00Z'
        },
        {
          id: 'northside_summer_bible_camp_2025',
          title: 'Northside Summer Bible Camp \u2013 Adventure with Jesus',
          event_type: 'summer_bible_camp',
          description: 'A full-week Bible camp with outdoor games, crafts, and interactive Bible teaching for upper elementary kids.',
          start_date: '2025-07-21T09:00:00Z',
          end_date: '2025-07-25T15:00:00Z',
          min_age: 9,
          max_age: 12,
          base_price_per_child: 210,
          location_name: 'Northside Family Campus',
          campus_site_id: 'northside_family_campus',
          address_line1: '4555 Roswell Rd NE',
          address_city: 'Atlanta',
          address_state: 'GA',
          address_postal_code: '30342',
          status: 'published',
          max_capacity_total: 100,
          created_at: '2025-01-22T16:30:00Z'
        }
      ],
      products: [
        {
          id: 'fruit_spirit_preschool_core_3_5',
          category_id: 'curriculum_sets',
          name: 'Fruit of the Spirit Curriculum \u2013 Preschool Core (Ages 3\u20135)',
          slug: 'fruit-of-the-spirit-preschool-core-3-5',
          description: 'A four-week preschool curriculum introducing each fruit of the Spirit with simple stories, songs, and activities.',
          min_age: 3,
          max_age: 5,
          price: 19.99,
          sku: 'FOS-PRE-CORE-001',
          format_type: 'digital',
          tags: ['fruit_of_the_spirit', 'preschool', '4-week_series'],
          rating_average: 4.9,
          rating_count: 124,
          thumbnail_image_url: 'https://cdn.statically.io/img/i.pinimg.com/originals/26/e7/a5/26e7a54fe8479edf1f2ef8e3f2b3c560.jpg',
          status: 'active'
        },
        {
          id: 'fruit_spirit_preschool_games_3_5',
          category_id: 'curriculum_sets',
          name: 'Fruit of the Spirit Curriculum \u2013 Games & Activities Pack (Ages 3\u20135)',
          slug: 'fruit-of-the-spirit-preschool-games-3-5',
          description: 'Supplemental games, craft ideas, and take-home pages to reinforce the Fruit of the Spirit for preschoolers.',
          min_age: 3,
          max_age: 5,
          price: 23.5,
          sku: 'FOS-PRE-GAME-002',
          format_type: 'digital',
          tags: ['fruit_of_the_spirit', 'games', 'preschool'],
          rating_average: 4.7,
          rating_count: 88,
          thumbnail_image_url: 'http://www.stockicons.info/wp-content/uploads/2020/03/fruit-of-the-spirit-coloring-page-fruits-of-the-spirit-bible-coloring-pages-christian-fruit-coloring-of-page-spirit-the-.jpg',
          status: 'active'
        },
        {
          id: 'fruit_spirit_kids_6_8',
          category_id: 'curriculum_sets',
          name: 'Fruit of the Spirit Curriculum \u2013 Elementary (Ages 6\u20138)',
          slug: 'fruit-of-the-spirit-elementary-6-8',
          description: 'Six-session curriculum helping younger elementary kids discover how the Holy Spirit grows fruit in their lives.',
          min_age: 6,
          max_age: 8,
          price: 27.0,
          sku: 'FOS-ELEM-6-8-003',
          format_type: 'digital',
          tags: ['fruit_of_the_spirit', 'elementary'],
          rating_average: 4.8,
          rating_count: 97,
          thumbnail_image_url: 'https://www.mccu.com/assets/files/r8Zq0mZ5/banner_banzai.jpg',
          status: 'active'
        }
      ],
      volunteer_opportunities: [
        {
          id: 'midtown_sunday_kids_helper_9am',
          title: 'Midtown Sunday Children\'s Class Helper \u2013 9:00am',
          summary: 'Serve in the elementary classroom at the 9:00am Sunday service helping kids engage with Bible lessons and activities.',
          serve_type: 'in_person',
          role_focus: 'work_directly_with_children',
          campus_site_id: 'midtown_atlanta_campus',
          location_description: 'Midtown Atlanta Children\'s Ministry Center \u2013 Elementary Room 2',
          age_group_served_min: 6,
          age_group_served_max: 10,
          background_check_required: true,
          distance_miles_from_search: 0.4,
          status: 'open'
        },
        {
          id: 'midtown_sunday_kids_helper_11am',
          title: 'Midtown Sunday Children\'s Class Helper \u2013 11:00am',
          summary: 'Assist the lead teacher with check-in, small group discussion, and crafts during the 11:00am service.',
          serve_type: 'in_person',
          role_focus: 'work_directly_with_children',
          campus_site_id: 'midtown_atlanta_campus',
          location_description: 'Midtown Atlanta Children\'s Ministry Center \u2013 Elementary Room 3',
          age_group_served_min: 7,
          age_group_served_max: 12,
          background_check_required: true,
          distance_miles_from_search: 0.4,
          status: 'open'
        },
        {
          id: 'northside_sunday_kids_large_group',
          title: 'Northside Large Group Host \u2013 Sunday Mornings',
          summary: 'Welcome kids, lead games, and help with large-group worship for Sunday morning services.',
          serve_type: 'in_person',
          role_focus: 'work_directly_with_children',
          campus_site_id: 'northside_family_campus',
          location_description: 'Northside Family Campus \u2013 Kids Auditorium',
          age_group_served_min: 6,
          age_group_served_max: 11,
          background_check_required: true,
          distance_miles_from_search: 6.8,
          status: 'open'
        }
      ],
      volunteer_time_slots: [
        {
          id: 'vts_midtown_9am_sun',
          volunteer_opportunity_id: 'midtown_sunday_kids_helper_9am',
          day_of_week: 'sunday',
          time_block: 'morning_8_12',
          service_label: 'Sunday 9:00am service',
          start_time: '2025-03-02T09:00:00Z',
          end_time: '2025-03-02T10:30:00Z'
        },
        {
          id: 'vts_midtown_11am_sun',
          volunteer_opportunity_id: 'midtown_sunday_kids_helper_11am',
          day_of_week: 'sunday',
          time_block: 'morning_8_12',
          service_label: 'Sunday 11:00am service',
          start_time: '2025-03-02T11:00:00Z',
          end_time: '2025-03-02T12:30:00Z'
        },
        {
          id: 'vts_northside_930am_sun',
          volunteer_opportunity_id: 'northside_sunday_kids_large_group',
          day_of_week: 'sunday',
          time_block: 'morning_8_12',
          service_label: 'Sunday 9:30am service',
          start_time: '2025-03-02T09:30:00Z',
          end_time: '2025-03-02T11:00:00Z'
        }
      ],
      event_sessions: [
        {
          id: 'es_midtown_w1_morning',
          event_id: 'midtown_summer_bible_camp_week1_2025',
          name: 'Morning Session',
          session_type: 'morning',
          start_time: '2025-07-07T09:00:00Z',
          end_time: '2025-07-07T12:00:00Z',
          capacity: 80,
          current_registered_count: 3
        },
        {
          id: 'es_midtown_w2_morning',
          event_id: 'midtown_summer_bible_camp_week2_2025',
          name: 'Morning Session',
          session_type: 'morning',
          start_time: '2025-07-14T09:00:00Z',
          end_time: '2025-07-14T12:00:00Z',
          capacity: 80,
          current_registered_count: 2
        },
        {
          id: 'es_northside_full_day',
          event_id: 'northside_summer_bible_camp_2025',
          name: 'Full-Day Camp Session',
          session_type: 'full_day',
          start_time: '2025-07-21T09:00:00Z',
          end_time: '2025-07-21T15:00:00Z',
          capacity: 100,
          current_registered_count: 1
        }
      ],
      registration_children: [
        {
          id: 'rc_midtown_w1_smith_amy',
          event_registration_id: 'er_midtown_w1_smith_family',
          event_session_id: 'es_midtown_w1_morning',
          first_name: 'Amy',
          last_name: 'Smith',
          age: 8,
          special_needs_notes: ''
        },
        {
          id: 'rc_midtown_w1_smith_ben',
          event_registration_id: 'er_midtown_w1_smith_family',
          event_session_id: 'es_midtown_w1_morning',
          first_name: 'Ben',
          last_name: 'Smith',
          age: 7,
          special_needs_notes: 'Mild peanut allergy \u0010 snacks must be nut-free.'
        },
        {
          id: 'rc_midtown_w1_lee_chloe',
          event_registration_id: 'er_midtown_w1_lee_family',
          event_session_id: 'es_midtown_w1_morning',
          first_name: 'Chloe',
          last_name: 'Lee',
          age: 9,
          special_needs_notes: ''
        }
      ],
      event_registrations: [
        {
          id: 'er_midtown_w1_smith_family',
          event_id: 'midtown_summer_bible_camp_week1_2025',
          registration_date: '2025-04-10T18:30:00Z',
          guardian_first_name: 'Laura',
          guardian_last_name: 'Smith',
          guardian_email: 'laura.smith@example.com',
          guardian_phone: '404-555-0134',
          payment_method: 'pay_at_check_in',
          registration_status: 'confirmed',
          notes: 'Prefers to finalize payment at Monday morning check-in.',
          total_children: 2,
          total_amount_due: 330.0
        },
        {
          id: 'er_midtown_w1_lee_family',
          event_id: 'midtown_summer_bible_camp_week1_2025',
          registration_date: '2025-04-15T14:05:00Z',
          guardian_first_name: 'Michael',
          guardian_last_name: 'Lee',
          guardian_email: 'michael.lee@example.com',
          guardian_phone: '404-555-0172',
          payment_method: 'online_card',
          registration_status: 'confirmed',
          notes: '',
          total_children: 1,
          total_amount_due: 165.0
        },
        {
          id: 'er_midtown_w2_johnson_family',
          event_id: 'midtown_summer_bible_camp_week2_2025',
          registration_date: '2025-04-20T09:45:00Z',
          guardian_first_name: 'Rachel',
          guardian_last_name: 'Johnson',
          guardian_email: 'rachel.johnson@example.com',
          guardian_phone: '770-555-0198',
          payment_method: 'bill_me_by_mail',
          registration_status: 'pending',
          notes: 'Requested mailed invoice; will submit medical forms at orientation.',
          total_children: 2,
          total_amount_due: 370.0
        }
      ]
    };

    // Write generated data to localStorage using storage keys
    const setArray = (key, value) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    };

    setArray('campus_sites', generatedData.campus_sites);
    setArray('child_profiles', generatedData.child_profiles);
    setArray('craft_activities', generatedData.craft_activities);
    setArray('donation_funds', generatedData.donation_funds);
    setArray('lesson_plans', generatedData.lesson_plans);
    setArray('product_categories', generatedData.product_categories);
    setArray('child_interest_tags', generatedData.child_interest_tags);
    setArray('events', generatedData.events);
    setArray('products', generatedData.products);
    setArray('volunteer_opportunities', generatedData.volunteer_opportunities);
    setArray('volunteer_time_slots', generatedData.volunteer_time_slots);
    setArray('event_sessions', generatedData.event_sessions);
    setArray('registration_children', generatedData.registration_children);
    setArray('event_registrations', generatedData.event_registrations);

    // Initialize empty arrays for entities without pre-generated data
    const ensureArray = (key) => {
      if (typeof localStorage === 'undefined') return;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    };

    ensureArray('saved_resources');
    ensureArray('resource_collections');
    ensureArray('collection_items');
    ensureArray('carts');
    ensureArray('cart_items');
    ensureArray('volunteer_applications');
    ensureArray('lesson_series');
    ensureArray('series_lesson_assignments');
    ensureArray('newsletter_subscriptions');
    ensureArray('newsletter_child_ages');
    ensureArray('newsletter_topic_preferences');
    ensureArray('donations');
    ensureArray('sponsorships');
  }

  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RegisterTwoChildrenForCamp();
    this.testTask2_MonthlyDonationForStoryKits();
    this.testTask3_SaveEasterCraftsCollection();
    this.testTask4_AddFruitOfSpiritCurriculumToCart();
    this.testTask5_ApplyForSundayMorningVolunteerRole();
    this.testTask6_CreateApril2025ParablesSeries();
    this.testTask7_SubscribeParentNewsletter();
    this.testTask8_SponsorChildReadingBibleStories();

    return this.results;
  }

  // Task 1: Register two children for July summer Bible camp morning session
  testTask1_RegisterTwoChildrenForCamp() {
    const testName = 'Task 1: Register two children for July 2025 morning summer Bible camp under $200';
    console.log('Running', testName);

    try {
      // Search for July 2025 summer Bible camp events for ages 7-10, morning session, price <= 200
      const filters = {
        event_type: 'summer_bible_camp',
        start_date: '2025-07-01',
        end_date: '2025-07-31',
        min_age: 7,
        max_age: 10,
        max_price_per_child: 200,
        session_type: 'morning'
      };

      const searchResult = this.logic.searchEvents(filters, 'price_low_to_high', 1, 10);
      this.assert(searchResult && Array.isArray(searchResult.events), 'searchEvents should return events array');
      this.assert(searchResult.events.length > 0, 'There should be at least one matching summer Bible camp event');

      const selectedEvent = searchResult.events[0];
      const eventId = selectedEvent.id;
      this.assert(eventId, 'Selected event should have an id');

      // Get event details including sessions
      const details = this.logic.getEventDetails(eventId);
      this.assert(details && details.sessions && Array.isArray(details.sessions), 'getEventDetails should return sessions array');

      const morningSession = details.sessions.find((s) => s.session_type === 'morning');
      this.assert(morningSession, 'Event should have a morning session');

      const sessionId = morningSession.id;
      this.assert(sessionId, 'Morning session should have an id');

      // Create registration for two children ages 7 and 10, both in morning session, pay-at-check-in
      const guardianDetails = {
        first_name: 'Grace',
        last_name: 'Parker',
        email: 'grace.parker@example.com',
        phone: '404-555-0200',
        notes: 'Please keep siblings together in the same group.'
      };

      const children = [
        {
          first_name: 'Liam',
          last_name: 'Parker',
          age: 7,
          event_session_id: sessionId,
          special_needs_notes: ''
        },
        {
          first_name: 'Emma',
          last_name: 'Parker',
          age: 10,
          event_session_id: sessionId,
          special_needs_notes: 'Mild dairy sensitivity.'
        }
      ];

      const registrationResult = this.logic.createEventRegistration(
        eventId,
        guardianDetails,
        children,
        'pay_at_check_in'
      );

      this.assert(registrationResult && registrationResult.success === true, 'Registration should succeed');
      const registration = registrationResult.registration;
      this.assert(registration, 'Registration object should be returned');

      this.assert(registration.event_id === eventId, 'Registration event_id should match selected event');
      this.assert(registration.payment_method === 'pay_at_check_in', 'Payment method should be pay_at_check_in');
      this.assert(registration.total_children === children.length, 'total_children should equal number of children registered');
      this.assert(registration.total_amount_due > 0, 'total_amount_due should be positive');

      // Verify registration children link to the correct registration and session
      const regChildren = registrationResult.children;
      this.assert(Array.isArray(regChildren) && regChildren.length === children.length, 'Returned children array should match number of children');

      regChildren.forEach((childRecord, index) => {
        this.assert(childRecord.event_registration_id === registration.id, 'Child record should reference registration id');
        this.assert(childRecord.event_session_id === sessionId, 'Child should be assigned to selected morning session');
        this.assert(childRecord.age === children[index].age, 'Child age should be persisted correctly');
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 2: Set up a $35 monthly donation for Children\'s Bible Story Kits
  testTask2_MonthlyDonationForStoryKits() {
    const testName = 'Task 2: Create $35 monthly donation to Children\'s Bible Story Kits with dedication and offline payment';
    console.log('Running', testName);

    try {
      const config = this.logic.getDonationPageConfig();
      this.assert(config && Array.isArray(config.funds), 'getDonationPageConfig should return funds array');

      const targetFund = config.funds.find((f) => f.name === 'Children\'s Bible Story Kits');
      this.assert(targetFund, 'Should find Children\'s Bible Story Kits fund');

      const amount = 35;

      // Choose an offline payment method from allowed_payment_methods (not online_card)
      this.assert(Array.isArray(config.allowed_payment_methods), 'allowed_payment_methods should be an array');
      let paymentMethod = config.allowed_payment_methods.find((m) => m !== 'online_card');
      if (!paymentMethod) {
        // Fallback to bill_me_by_mail if only online_card is present
        paymentMethod = 'bill_me_by_mail';
      }

      const dedication = {
        enabled: true,
        dedication_type: 'in_honor_of',
        honoree_name: 'Grandma Mary',
        message: 'Thank you for reading Bible stories with us each night.'
      };

      const donorInfo = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'donor@example.com',
        address_line1: '123 Maple St',
        address_line2: '',
        city: 'Atlanta',
        state: 'GA',
        postal_code: '30309',
        country: 'USA'
      };

      const donationResult = this.logic.createDonation(
        'monthly',
        amount,
        targetFund.id,
        true, // cover_processing_fee
        dedication,
        donorInfo,
        paymentMethod,
        null // start_date optional for this flow
      );

      this.assert(donationResult && donationResult.success === true, 'Donation creation should succeed');
      const donation = donationResult.donation;
      this.assert(donation, 'Donation object should be returned');

      this.assert(donation.donation_type === 'monthly', 'Donation type should be monthly');
      this.assert(donation.amount === amount, 'Donation amount should match selected amount');
      this.assert(donation.fund_id === targetFund.id, 'fund_id should match selected fund id');
      this.assert(donation.cover_processing_fee === true, 'cover_processing_fee should be true');
      this.assert(donation.payment_method === paymentMethod, 'Payment method should match selected offline method');
      this.assert(donation.dedication_enabled === true, 'Dedication should be enabled');
      this.assert(donation.dedication_type === 'in_honor_of', 'Dedication type should be in_honor_of');
      this.assert(donation.honoree_name === dedication.honoree_name, 'Honoree name should be saved');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 3: Save three Easter crafts for ages 6-8 under 30 minutes into a collection
  testTask3_SaveEasterCraftsCollection() {
    const testName = 'Task 3: Save three Easter crafts (ages 6-8, <=30 min) into a collection';
    console.log('Running', testName);

    try {
      const filters = {
        min_age: 6,
        max_age: 8,
        seasonal_topic: 'easter',
        max_duration_minutes: 30
      };

      const searchResult = this.logic.searchCraftActivities(filters, 'most_downloaded', 1, 10);
      this.assert(searchResult && Array.isArray(searchResult.activities), 'searchCraftActivities should return activities array');
      this.assert(searchResult.activities.length > 0, 'There should be at least one Easter craft for ages 6-8');

      const activities = searchResult.activities;
      const toSaveCount = Math.min(3, activities.length);
      this.assert(toSaveCount > 0, 'At least one craft must be available to save');

      const savedResourceIds = [];

      for (let i = 0; i < toSaveCount; i++) {
        const act = activities[i];
        const saveResult = this.logic.saveResource('craft_activity', act.id);
        this.assert(saveResult && saveResult.success === true, 'saveResource should succeed for craft ' + act.id);
        this.assert(saveResult.saved_resource && saveResult.saved_resource.id, 'saved_resource should have an id');
        savedResourceIds.push(saveResult.saved_resource.id);
      }

      // Verify saved resources overview
      const overview = this.logic.getSavedResourcesOverview();
      this.assert(overview && Array.isArray(overview.saved_resources), 'getSavedResourcesOverview should return saved_resources array');

      const overviewIds = overview.saved_resources.map((sr) => sr.saved_resource.id);
      savedResourceIds.forEach((id) => {
        this.assert(overviewIds.includes(id), 'Saved resources overview should include saved resource ' + id);
      });

      // Create new collection
      const collectionName = 'Easter 6-8 Crafts';
      const createColResult = this.logic.createResourceCollection(collectionName, 'Auto-created by integration test');
      this.assert(createColResult && createColResult.success === true, 'createResourceCollection should succeed');
      const collection = createColResult.collection;
      this.assert(collection && collection.id, 'Collection should have an id');
      this.assert(collection.name === collectionName, 'Collection name should match requested name');

      // Add saved resources to the collection
      const addToColResult = this.logic.addSavedResourcesToCollection(collection.id, savedResourceIds);
      this.assert(addToColResult && addToColResult.success === true, 'addSavedResourcesToCollection should succeed');

      // Verify collection detail contains the items
      const detail = this.logic.getCollectionDetail(collection.id);
      this.assert(detail && detail.collection && Array.isArray(detail.items), 'getCollectionDetail should return collection and items');

      const collectionSavedIds = detail.items.map((item) => item.saved_resource.id);
      savedResourceIds.forEach((id) => {
        this.assert(collectionSavedIds.includes(id), 'Collection should contain saved resource ' + id);
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 4: Add two Fruit of the Spirit curriculum sets under $25 for different age groups to the cart
  // Adapted: use ages 3-5 (<=$25) and ages 6-8 (<=$30) based on available data
  testTask4_AddFruitOfSpiritCurriculumToCart() {
    const testName = 'Task 4: Add two Fruit of the Spirit curriculum sets for two age groups to cart';
    console.log('Running', testName);

    try {
      // Find Curriculum Sets category
      const categories = this.logic.getProductCategories();
      this.assert(Array.isArray(categories), 'getProductCategories should return array');
      const curriculumCategory = categories.find((c) => c.name === 'Curriculum Sets');
      this.assert(curriculumCategory, 'Should find Curriculum Sets category');

      // First search: Ages 3-5, max price 25, Fruit of the Spirit
      const filtersFirst = {
        category_id: curriculumCategory.id,
        min_age: 3,
        max_age: 5,
        min_price: 0,
        max_price: 25,
        tags: ['fruit_of_the_spirit']
      };

      const firstSearch = this.logic.searchProducts('Fruit of the Spirit', filtersFirst, 'rating_high_to_low', 1, 10);
      this.assert(firstSearch && Array.isArray(firstSearch.products), 'searchProducts should return products array for first search');
      this.assert(firstSearch.products.length > 0, 'At least one Fruit of the Spirit product for ages 3-5 should be found');

      const firstProduct = firstSearch.products[0];
      const firstProductId = firstProduct.id;
      this.assert(firstProductId, 'First product should have an id');

      const firstDetails = this.logic.getProductDetails(firstProductId);
      this.assert(firstDetails && firstDetails.product, 'getProductDetails should return product for first item');

      const addFirst = this.logic.addToCart(firstProductId, 1);
      this.assert(addFirst && addFirst.success === true, 'addToCart should succeed for first product');

      // Second search: Ages 6-8, max price 30, Fruit of the Spirit (adapted from 9-11 to available 6-8)
      const filtersSecond = {
        category_id: curriculumCategory.id,
        min_age: 6,
        max_age: 8,
        min_price: 0,
        max_price: 30,
        tags: ['fruit_of_the_spirit']
      };

      const secondSearch = this.logic.searchProducts('Fruit of the Spirit', filtersSecond, 'rating_high_to_low', 1, 10);
      this.assert(secondSearch && Array.isArray(secondSearch.products), 'searchProducts should return products array for second search');
      this.assert(secondSearch.products.length > 0, 'At least one Fruit of the Spirit product for ages 6-8 should be found');

      const secondProduct = secondSearch.products[0];
      const secondProductId = secondProduct.id;
      this.assert(secondProductId, 'Second product should have an id');

      const secondDetails = this.logic.getProductDetails(secondProductId);
      this.assert(secondDetails && secondDetails.product, 'getProductDetails should return product for second item');

      const addSecond = this.logic.addToCart(secondProductId, 1);
      this.assert(addSecond && addSecond.success === true, 'addToCart should succeed for second product');

      // Verify cart has at least two items and includes the selected products
      const cartView = this.logic.getCart();
      this.assert(cartView && cartView.cart && Array.isArray(cartView.items), 'getCart should return cart and items');

      const cartProductIds = cartView.items.map((line) => line.product.id);
      this.assert(cartProductIds.includes(firstProductId), 'Cart should contain first curriculum set');
      this.assert(cartProductIds.includes(secondProductId), 'Cart should contain second curriculum set');
      this.assert(cartView.total > 0, 'Cart total should be positive');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 5: Apply for an in-person Sunday morning children\'s volunteer role within 10 miles of ZIP 30309
  testTask5_ApplyForSundayMorningVolunteerRole() {
    const testName = 'Task 5: Apply for in-person Sunday morning kids volunteer role within 10 miles of 30309';
    console.log('Running', testName);

    try {
      const filters = {
        serve_type: 'in_person',
        role_focus: 'work_directly_with_children',
        location_postal_code: '30309',
        distance_miles: 10,
        day_of_week: 'sunday',
        time_block: 'morning_8_12'
      };

      const searchResult = this.logic.searchVolunteerOpportunities(filters, 'distance', 1, 10);
      this.assert(searchResult && Array.isArray(searchResult.opportunities), 'searchVolunteerOpportunities should return opportunities array');
      this.assert(searchResult.opportunities.length > 0, 'At least one matching volunteer opportunity should be found');

      const opportunity = searchResult.opportunities[0];
      const oppId = opportunity.id;
      this.assert(oppId, 'Volunteer opportunity should have an id');

      const oppDetails = this.logic.getVolunteerOpportunityDetails(oppId);
      this.assert(oppDetails && Array.isArray(oppDetails.time_slots), 'getVolunteerOpportunityDetails should return time_slots');

      const timeSlot = oppDetails.time_slots.find(
        (ts) => ts.day_of_week === 'sunday' && ts.time_block === 'morning_8_12'
      );
      this.assert(timeSlot, 'Opportunity should have a Sunday morning time slot');

      const campusSiteId = opportunity.campus_site_id || (oppDetails.campus_site && oppDetails.campus_site.id) || null;

      const applicationResult = this.logic.submitVolunteerApplication(
        oppId,
        campusSiteId,
        timeSlot.id,
        'Sarah Johnson',
        'sarah.johnson@example.com',
        '404-555-0300',
        'Available every Sunday morning; prefer the ' + (timeSlot.service_label || 'listed service')
      );

      this.assert(applicationResult && applicationResult.success === true, 'submitVolunteerApplication should succeed');
      const app = applicationResult.volunteer_application;
      this.assert(app && app.id, 'Volunteer application should have an id');
      this.assert(app.volunteer_opportunity_id === oppId, 'Application should reference selected opportunity');
      if (campusSiteId) {
        this.assert(app.campus_site_id === campusSiteId, 'Application campus_site_id should match selected campus');
      }
      if (timeSlot.id) {
        this.assert(app.selected_time_slot_id === timeSlot.id, 'Application selected_time_slot_id should match chosen slot');
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 6: Create a four-week April 2025 parables lesson series for ages 5-7
  testTask6_CreateApril2025ParablesSeries() {
    const testName = 'Task 6: Create April 2025 Parables lesson series for ages 5-7 and order weeks';
    console.log('Running', testName);

    try {
      // Get calendar Sundays for April 2025
      const calendar = this.logic.getLessonPlannerCalendar(4, 2025);
      this.assert(calendar && Array.isArray(calendar.sundays), 'getLessonPlannerCalendar should return sundays array');
      this.assert(calendar.sundays.length >= 4, 'April 2025 should have at least four Sundays');

      // Create lesson series
      const seriesName = 'April 2025 Parables (Ages 5-7)';
      const seriesResult = this.logic.createLessonSeries(
        seriesName,
        'Parables of Jesus for ages 5-7',
        5,
        7,
        4,
        2025,
        4
      );

      this.assert(seriesResult && seriesResult.success === true, 'createLessonSeries should succeed');
      const lessonSeries = seriesResult.lesson_series;
      this.assert(lessonSeries && lessonSeries.id, 'Lesson series should have an id');

      // Search for parables lesson plans ages 5-7
      const filters = {
        min_age: 5,
        max_age: 7,
        topic_category: 'teachings_of_jesus',
        topic_subcategory: 'parables'
      };

      const lpSearch = this.logic.searchLessonPlans(filters, 'most_downloaded', 1, 10);
      this.assert(lpSearch && Array.isArray(lpSearch.lesson_plans), 'searchLessonPlans should return lesson_plans array');
      this.assert(lpSearch.lesson_plans.length > 0, 'At least one parables lesson plan for ages 5-7 should exist');

      const plans = lpSearch.lesson_plans;
      const desiredWeeks = 4;
      const assignments = [];

      // Add up to 4 lessons; if fewer lesson plans exist, reuse from the start to still create 4 weeks
      for (let i = 0; i < desiredWeeks; i++) {
        const plan = plans[i] || plans[0];
        const addResult = this.logic.addLessonToSeries(lessonSeries.id, plan.id, i + 1);
        this.assert(addResult && addResult.success === true, 'addLessonToSeries should succeed for week ' + (i + 1));
        this.assert(addResult.series_lesson_assignment && addResult.series_lesson_assignment.id, 'SeriesLessonAssignment should have an id');
        assignments.push(addResult.series_lesson_assignment);
      }

      // Verify series detail and re-order lessons
      const seriesDetail = this.logic.getLessonSeriesDetail(lessonSeries.id);
      this.assert(seriesDetail && Array.isArray(seriesDetail.assignments), 'getLessonSeriesDetail should return assignments');
      this.assert(seriesDetail.assignments.length === assignments.length, 'Number of assignments in detail should match added assignments');

      const currentAssignments = seriesDetail.assignments.map((item) => item.assignment);

      // Build a new order: reverse the assignments and set week_numbers sequentially, optionally map first Sundays
      const newOrder = [];
      const reversed = currentAssignments.slice().reverse();
      for (let i = 0; i < reversed.length; i++) {
        const assignment = reversed[i];
        const weekNumber = i + 1;
        const update = {
          assignment_id: assignment.id,
          week_number: weekNumber,
          display_order: weekNumber
        };
        if (Array.isArray(seriesDetail.calendar_sundays) && seriesDetail.calendar_sundays[i]) {
          update.scheduled_date = seriesDetail.calendar_sundays[i];
        }
        newOrder.push(update);
      }

      const updateResult = this.logic.updateSeriesLessonOrder(lessonSeries.id, newOrder);
      this.assert(updateResult && updateResult.success === true, 'updateSeriesLessonOrder should succeed');
      this.assert(Array.isArray(updateResult.updated_assignments), 'updated_assignments should be an array');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 7: Subscribe to weekly parent newsletter for ages 8-10 focused on family devotions
  testTask7_SubscribeParentNewsletter() {
    const testName = 'Task 7: Subscribe to weekly parent newsletter for ages 8-10 with devotions topics';
    console.log('Running', testName);

    try {
      const options = this.logic.getNewsletterOptions();
      this.assert(options, 'getNewsletterOptions should return options');

      const email = 'parent@example.com';
      const childAges = [8, 9, 10];
      const topics = ['family_devotions', 'helping_kids_pray'];
      const emailFrequency = 'weekly';
      const communicationPreference = 'email_only';

      const subResult = this.logic.createNewsletterSubscription(
        email,
        childAges,
        topics,
        emailFrequency,
        communicationPreference,
        true
      );

      this.assert(subResult && subResult.success === true, 'createNewsletterSubscription should succeed');
      const sub = subResult.subscription;
      this.assert(sub && sub.id, 'Newsletter subscription should have an id');
      this.assert(sub.email === email, 'Subscription email should match input');
      this.assert(sub.email_frequency === emailFrequency, 'Email frequency should be weekly');
      this.assert(sub.communication_preference === communicationPreference, 'Communication preference should be email_only');
      this.assert(sub.send_age_specific_ideas === true, 'send_age_specific_ideas should be true');

      // Verify child ages and topic preferences relationships
      this.assert(Array.isArray(subResult.child_age_records), 'child_age_records should be an array');
      const returnedAges = subResult.child_age_records.map((rec) => rec.child_age).sort();
      const expectedAgesSorted = childAges.slice().sort();
      this.assert(
        returnedAges.length === expectedAgesSorted.length &&
          returnedAges.every((age, idx) => age === expectedAgesSorted[idx]),
        'All selected child ages should be saved'
      );

      this.assert(Array.isArray(subResult.topic_preferences), 'topic_preferences should be an array');
      const returnedTopics = subResult.topic_preferences.map((rec) => rec.topic).sort();
      const expectedTopicsSorted = topics.slice().sort();
      this.assert(
        returnedTopics.length === expectedTopicsSorted.length &&
          returnedTopics.every((t, idx) => t === expectedTopicsSorted[idx]),
        'All selected topics should be saved'
      );

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 8: Sponsor a child aged 6-9 with $30-$40 monthly pledge focused on reading & Bible stories
  testTask8_SponsorChildReadingBibleStories() {
    const testName = 'Task 8: Sponsor child aged 6-9 interested in reading & Bible stories with $30-40 monthly pledge';
    console.log('Running', testName);

    try {
      const filters = {
        min_age: 6,
        max_age: 9,
        min_monthly_amount: 30,
        max_monthly_amount: 40,
        interests: ['reading_and_bible_stories']
      };

      const searchResult = this.logic.searchChildProfiles(filters, 'longest_waiting', 1, 10);
      this.assert(searchResult && Array.isArray(searchResult.child_profiles), 'searchChildProfiles should return child_profiles array');
      this.assert(searchResult.child_profiles.length > 0, 'At least one matching child profile should be found');

      const child = searchResult.child_profiles[0];
      const childId = child.id;
      this.assert(childId, 'Child profile should have an id');
      this.assert(child.age >= 6 && child.age <= 9, 'Child age should be within 6-9');

      const childDetails = this.logic.getChildProfileDetails(childId);
      this.assert(childDetails && Array.isArray(childDetails.interests), 'getChildProfileDetails should return interests array');
      const hasReadingInterest = childDetails.interests.some(
        (tag) => tag.interest === 'reading_and_bible_stories'
      );
      this.assert(hasReadingInterest, 'Child should have reading_and_bible_stories interest');

      const monthlyAmount = child.default_monthly_amount;
      this.assert(monthlyAmount >= 30 && monthlyAmount <= 40, 'Default monthly amount should be between 30 and 40');

      // Start date: first day of next month (UTC)
      const now = new Date();
      const currentMonth = now.getUTCMonth() + 1;
      const currentYear = now.getUTCFullYear();
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const startDateStr =
        nextYear.toString().padStart(4, '0') +
        '-' +
        nextMonth.toString().padStart(2, '0') +
        '-01';

      const sponsorshipResult = this.logic.createSponsorship(
        childId,
        monthlyAmount,
        startDateStr,
        'bill_me_by_mail',
        'Karen Miller',
        'karen.miller@example.com'
      );

      this.assert(sponsorshipResult && sponsorshipResult.success === true, 'createSponsorship should succeed');
      const sponsorship = sponsorshipResult.sponsorship;
      this.assert(sponsorship && sponsorship.id, 'Sponsorship should have an id');
      this.assert(sponsorship.child_profile_id === childId, 'sponsorship.child_profile_id should match selected child');
      this.assert(sponsorship.monthly_amount === monthlyAmount, 'Monthly amount should match selected amount');
      this.assert(sponsorship.payment_method === 'bill_me_by_mail', 'Payment method should be bill_me_by_mail');
      this.assert(sponsorship.start_date.indexOf(startDateStr) === 0, 'Start date should begin with first day of next month');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Helper assertion and result recording
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

module.exports = TestRunner;
