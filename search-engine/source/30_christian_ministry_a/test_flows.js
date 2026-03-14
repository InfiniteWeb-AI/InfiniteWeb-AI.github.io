class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data - used ONLY here for initial localStorage population
    const generatedData = {
      devotionals: [
        {
          id: 'dev_anxiety_casting_cares',
          title: 'Casting Your Cares on Him',
          slug: 'casting-your-cares-on-him',
          content: 'Anxiety often whispers that everything depends on you. Peter reminds us that we can cast all our anxieties on the Lord because He cares for us (1 Peter 5:7). To cast means to throw off, to transfer the weight from your shoulders to His.\n\nTake a moment today to name the specific worries on your heart. Picture placing each one into the hands of Jesus. Pray, "Lord, I give You my fear about ________. I trust that You are stronger than what I fear and kinder than I can imagine."\n\nAs you release these burdens in prayer, expect that God will meet you with sustaining grace, even if your circumstances do not change immediately.',
          excerpt: 'Name your worries and place them into the caring hands of Jesus, who invites you to cast every anxiety on Him.',
          topic_tags: ['anxiety', 'peace', 'trust', 'hope'],
          reading_time_minutes: 7,
          date_published: '2026-02-10T09:00:00Z',
          scripture_references: ['1 Peter 5:6-7', 'Matthew 11:28-30'],
          image_url: 'https://sharingthegoodnews.files.wordpress.com/2013/04/surrender.jpg?w=788&h=568',
          author_name: 'Sarah Thompson',
          status: 'published',
          created_at: '2026-01-20T08:30:00Z',
          updated_at: '2026-02-10T08:45:00Z'
        },
        {
          id: 'dev_anxiety_be_still',
          title: 'Be Still in the Middle of the Storm',
          slug: 'be-still-in-the-middle-of-the-storm',
          content: 'When anxiety surges, stillness can feel impossible. Yet Gods command, "Be still, and know that I am God" is not a suggestion for the calm days only. It is an invitation to anchor your heart in who He is, even when waves crash around you.\n\nToday, pause for five minutes of quiet before God. Slowly repeat, "You are God. You are with me." Let each breath become a prayerful surrender of control.\n\nYour circumstances may not quiet immediately, but your soul can learn to rest in the faithful presence of the Lord.',
          excerpt: 'In anxious moments, God invites you to stillness rooted in the unshakable truth of who He is.',
          topic_tags: ['anxiety', 'rest', 'presence_of_god'],
          reading_time_minutes: 5,
          date_published: '2025-11-05T07:30:00Z',
          scripture_references: ['Psalm 46:1-11', 'Mark 4:35-41'],
          image_url: 'https://herway.net/wp-content/uploads/2017/09/7-Ways-How-Girls-With-Anxiety-Love-Differently.jpg',
          author_name: 'Daniel Kim',
          status: 'published',
          created_at: '2025-10-15T10:15:00Z',
          updated_at: '2025-11-05T07:45:00Z'
        },
        {
          id: 'dev_anxiety_midnight_prayers',
          title: 'Midnight Prayers for the Anxious Heart',
          slug: 'midnight-prayers-for-the-anxious-heart',
          content: 'Some of our fiercest battles with anxiety come in the middle of the night. The Bible tells us that God gives songs in the night (Job 35:10). When sleep wont come, you are not abandoned; you are invited into a deeper conversation with your Father.\n\nTurn your anxious thoughts into prayers. For every "what if," respond with "Even then, Lord, You will be with me." Let Scripture become your lullaby, repeating Gods promises until your heart slowly rests.\n\nThe same God who watches over the stars also watches over you. He does not sleep, so you can entrust the night to Him.',
          excerpt: 'When anxiety keeps you awake, turn your "what ifs" into prayers and let Gods promises sing you back to rest.',
          topic_tags: ['anxiety', 'night', 'prayer'],
          reading_time_minutes: 9,
          date_published: '2025-06-15T21:00:00Z',
          scripture_references: ['Psalm 4:8', 'Psalm 121:1-8', 'Job 35:10'],
          image_url: 'https://3968546ec6d3d471b4de-1c4643f32e32d96560b7ddb26b3f0835.ssl.cf2.rackcdn.com/uploaded/p/0e4364006_1436813059_prayer.jpg',
          author_name: 'Emily Rivera',
          status: 'published',
          created_at: '2025-05-30T13:20:00Z',
          updated_at: '2025-06-15T21:10:00Z'
        }
      ],
      donation_funds: [
        {
          id: 'missions_fund',
          code: 'missions_fund',
          name: 'Missions Fund',
          description: 'Supports local and global mission partners, church planting, and outreach projects.',
          is_active: true,
          sort_order: 1
        },
        {
          id: 'general_fund',
          code: 'general_fund',
          name: 'General Ministry Fund',
          description: 'Covers ongoing ministry expenses, staff support, and operations.',
          is_active: true,
          sort_order: 2
        },
        {
          id: 'building_fund',
          code: 'building_fund',
          name: 'Building & Facilities Fund',
          description: 'Provides for facility maintenance, improvements, and future building projects.',
          is_active: true,
          sort_order: 3
        }
      ],
      resource_categories: [
        {
          id: 'all_resources',
          code: 'all_resources',
          name: 'All Resources',
          description: 'Browse all books, devotionals, media, and ministry resources.',
          parent_id: null,
          is_active: true,
          sort_order: 0
        },
        {
          id: 'marriage',
          code: 'marriage',
          name: 'Marriage',
          description: 'Books and resources to encourage couples and strengthen marriages.',
          parent_id: 'all_resources',
          is_active: true,
          sort_order: 1
        },
        {
          id: 'free_devotionals',
          code: 'free_devotionals',
          name: 'Free Devotional Resources',
          description: 'Free downloadable devotional guides, PDFs, and studies.',
          parent_id: 'all_resources',
          is_active: true,
          sort_order: 2
        }
      ],
      sermons: [
        {
          id: 'sermon_forgiveness_freedom_chain_breaker',
          title: 'Forgiveness: Freedom from the Chains',
          slug: 'forgiveness-freedom-from-the-chains',
          description: 'A message on how Gods forgiveness empowers us to release others and walk in freedom.',
          date_published: '2025-09-14T15:00:00Z',
          duration_minutes: 32,
          rating_average: 4.9,
          rating_count: 284,
          topics: ['forgiveness', 'grace', 'relationships'],
          speaker_name: 'Pastor James Carter',
          series_title: 'Living the Gospel',
          thumbnail_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/1189bb4d-3f2c-5d0d-8105-c64c155c85c7.jpeg',
          media_url: 'https://www.youtube.com/watch?v=Yy5hH9w2GxQ',
          status: 'published'
        },
        {
          id: 'sermon_forgiveness_seventy_times_seven',
          title: 'Seventy Times Seven: The Call to Forgive',
          slug: 'seventy-times-seven-the-call-to-forgive',
          description: 'Exploring Jesus call to radical forgiveness in Matthew 18 and what it means for us today.',
          date_published: '2024-11-03T16:00:00Z',
          duration_minutes: 28,
          rating_average: 4.8,
          rating_count: 197,
          topics: ['forgiveness', 'discipleship'],
          speaker_name: 'Pastor Lisa Nguyen',
          series_title: 'Parables of the Kingdom',
          thumbnail_url: 'https://christiancliparts.net/clips/images/i06064.jpg',
          media_url: 'https://www.youtube.com/watch?v=r2Jg3c8Z0Kk',
          status: 'published'
        },
        {
          id: 'sermon_forgiveness_healing_heart',
          title: 'Healing the Wounded Heart Through Forgiveness',
          slug: 'healing-the-wounded-heart-through-forgiveness',
          description: 'A pastoral look at how the Holy Spirit brings healing as we forgive deep hurts.',
          date_published: '2025-04-20T14:30:00Z',
          duration_minutes: 30,
          rating_average: 4.9,
          rating_count: 321,
          topics: ['forgiveness', 'inner_healing', 'holy_spirit'],
          speaker_name: 'Pastor Maria Gomez',
          series_title: 'Heart Matters',
          thumbnail_url: 'https://atccf.org/portals/atccommunityfund/Images/homeHeartHands.jpg',
          media_url: 'https://www.youtube.com/watch?v=3Qgrm5w7Z1E',
          status: 'published'
        }
      ],
      shipping_options: [
        {
          id: 'standard_shipping',
          code: 'standard_shipping',
          name: 'Standard Shipping',
          description: 'Delivers in 58 business days.',
          cost: 6.99,
          is_free: false,
          min_order_total_for_free: null,
          estimated_days_min: 5,
          estimated_days_max: 8,
          is_active: true
        },
        {
          id: 'expedited_shipping',
          code: 'expedited_shipping',
          name: 'Expedited Shipping',
          description: 'Delivers in 23 business days.',
          cost: 14.99,
          is_free: false,
          min_order_total_for_free: null,
          estimated_days_min: 2,
          estimated_days_max: 3,
          is_active: true
        },
        {
          id: 'free_shipping_over_30',
          code: 'free_shipping',
          name: 'Free Shipping',
          description: 'Free standard shipping on qualifying orders.',
          cost: 0,
          is_free: true,
          min_order_total_for_free: 30,
          estimated_days_min: 5,
          estimated_days_max: 8,
          is_active: true
        }
      ],
      small_groups: [
        {
          id: 'group_ya_wed_online_earliest',
          name: 'Young Adults Online Bible Study',
          description: 'A weekly online Bible study for young adults focusing on practical discipleship and community.',
          audience: 'young_adults',
          meeting_format: 'online',
          meeting_day: 'wednesday',
          meeting_time_start: '18:30',
          meeting_time_end: '19:45',
          start_date: '2026-03-11T18:30:00Z',
          end_date: '2026-06-10T19:45:00Z',
          meeting_link: 'https://zoom.us/j/1234567890',
          location_name: 'Online via Zoom',
          location_address: '',
          leader_name: 'Anna Johnson',
          leader_email: 'anna.johnson@example.org',
          capacity: 18,
          status: 'open',
          created_at: '2026-02-01T10:00:00Z'
        },
        {
          id: 'group_ya_wed_online_second',
          name: 'Young Adults Midweek Group',
          description: 'Connect with other young adults for discussion, prayer, and encouragement.',
          audience: 'young_adults',
          meeting_format: 'online',
          meeting_day: 'wednesday',
          meeting_time_start: '19:00',
          meeting_time_end: '20:00',
          start_date: '2026-04-01T19:00:00Z',
          end_date: '2026-07-01T20:00:00Z',
          meeting_link: 'https://zoom.us/j/2233445566',
          location_name: 'Online via Zoom',
          location_address: '',
          leader_name: 'David Chen',
          leader_email: 'david.chen@example.org',
          capacity: 15,
          status: 'open',
          created_at: '2026-02-10T11:00:00Z'
        },
        {
          id: 'group_ya_wed_online_third',
          name: 'Young Adults Prayer & Scripture Night',
          description: 'An online gathering for young adults centered on prayer, Scripture, and mutual support.',
          audience: 'young_adults',
          meeting_format: 'online',
          meeting_day: 'wednesday',
          meeting_time_start: '18:00',
          meeting_time_end: '19:15',
          start_date: '2026-05-06T18:00:00Z',
          end_date: '2026-08-05T19:15:00Z',
          meeting_link: 'https://zoom.us/j/3344556677',
          location_name: 'Online via Zoom',
          location_address: '',
          leader_name: 'Samantha Lee',
          leader_email: 'samantha.lee@example.org',
          capacity: 20,
          status: 'open',
          created_at: '2026-02-15T12:00:00Z'
        }
      ],
      products: [
        {
          id: 'prod_marriage_book_grace_filled',
          title: 'Grace-Filled Marriage: 30-Day Journey for Couples',
          description: 'A 30-day, Scripture-based devotional journey designed to help couples grow in grace, communication, and Christ-centered intimacy.',
          price: 16.99,
          is_free: false,
          format: 'physical',
          type: 'book',
          category_id: 'marriage',
          sku: 'MAR-001',
          stock_quantity: 48,
          is_physical_shippable: true,
          weight_oz: 12,
          image_url: 'https://avirtuouswoman.org/wp-content/uploads/2019/07/A-Grace-Filled-Marriage_featured.jpg',
          status: 'active',
          created_at: '2025-09-01T10:00:00Z',
          updated_at: '2025-09-10T10:00:00Z'
        },
        {
          id: 'prod_marriage_book_faithful_together',
          title: 'Faithful Together: Building a Christ-Centered Marriage',
          description: 'A practical guide for husbands and wives who want to build a resilient, Christ-centered marriage through everyday habits of love and service.',
          price: 17.99,
          is_free: false,
          format: 'physical',
          type: 'book',
          category_id: 'marriage',
          sku: 'MAR-002',
          stock_quantity: 35,
          is_physical_shippable: true,
          weight_oz: 14,
          image_url: 'https://www.edithouse.ie/wp-content/uploads/Wedding-video-from-Tankardstown-House.jpg',
          status: 'active',
          created_at: '2025-11-15T09:30:00Z',
          updated_at: '2025-11-20T09:30:00Z'
        },
        {
          id: 'prod_marriage_book_covenant_love',
          title: 'Covenant Love: A Biblical Study for Married Couples',
          description: 'An 8-week inductive Bible study exploring Gods design for covenant love in marriage, ideal for couples or small groups.',
          price: 21.99,
          is_free: false,
          format: 'physical',
          type: 'book',
          category_id: 'marriage',
          sku: 'MAR-003',
          stock_quantity: 22,
          is_physical_shippable: true,
          weight_oz: 16,
          image_url: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=800&h=600&fit=crop&auto=format&q=80',
          status: 'active',
          created_at: '2024-06-10T08:00:00Z',
          updated_at: '2024-06-12T08:00:00Z'
        }
      ],
      sunday_services: [
        {
          id: 'svc_2026_02_15_0900',
          title: 'Sunday Worship Gathering - 9:00 AM',
          description: 'A blended worship gathering with teaching from our current Romans series and full kids ministry.',
          start_datetime: '2026-02-15T09:00:00Z',
          end_datetime: '2026-02-15T10:15:00Z',
          start_time_label: '9:00 AM',
          service_series: 'Romans: Good News for All',
          location_name: 'Main Worship Center',
          location_address: '123 Hope Street, Springfield, USA',
          childcare_available: true,
          capacity: 275,
          status: 'completed',
          image: 'https://d113wk4ga3f0l0.cloudfront.net/c?o=eJw1jcsOgyAURP-FtcELtrX6Iy4NhatQpBAeMU3Tfy99zWYyyZyZB0m-RImzxTsZyallrOc9tBxYBwMDztmBQQsfzZOPSZtAr2ElzZ-8FGkxV1h6Rzez6pyyl5YaJ1ZMtITNC5VoiF4VmY2_VfT7thyXpRtq3I3KmoznARqi8T3xCxld2ETGWt6rRSeiRQWMPF_0Azs8&s=724f72fc07941963564fdb68c9630c19af041204',
          reserved_seats: 0
        },
        {
          id: 'svc_2026_02_15_1100',
          title: 'Sunday Worship Gathering - 11:00 AM',
          description: 'Late-morning worship gathering with contemporary music and teaching from our Romans series.',
          start_datetime: '2026-02-15T11:00:00Z',
          end_datetime: '2026-02-15T12:15:00Z',
          start_time_label: '11:00 AM',
          service_series: 'Romans: Good News for All',
          location_name: 'Main Worship Center',
          location_address: '123 Hope Street, Springfield, USA',
          childcare_available: true,
          capacity: 275,
          status: 'completed',
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/2c11ea1f-ad85-55c8-bea2-03e72a4ea1d7.jpeg',
          reserved_seats: 0
        },
        {
          id: 'svc_2026_02_22_0900',
          title: 'Sunday Worship Gathering - 9:00 AM',
          description: 'A Scripture-centered gathering with congregational singing, prayer, and expository teaching.',
          start_datetime: '2026-02-22T09:00:00Z',
          end_datetime: '2026-02-22T10:15:00Z',
          start_time_label: '9:00 AM',
          service_series: 'Romans: Good News for All',
          location_name: 'Main Worship Center',
          location_address: '123 Hope Street, Springfield, USA',
          childcare_available: true,
          capacity: 275,
          status: 'completed',
          image: 'https://static.wixstatic.com/media/f99c91_f40ef0bb3c2f4bd8bcd253648ec59b56~mv2.jpg',
          reserved_seats: 5
        }
      ],
      service_reservations: [
        {
          id: 'res_2026_03_08_0900_smith',
          sunday_service_id: 'svc_2026_03_08_0900',
          num_adults: 2,
          num_children: 2,
          children_ages: [4, 9],
          seating_preference: 'middle_section',
          contact_full_name: 'Laura Smith',
          contact_email: 'laura.smith@example.com',
          contact_phone: '5551239876',
          notes: 'Please seat us near an aisle if possible.',
          created_at: '2026-02-28T14:05:00Z',
          status: 'confirmed',
          image: 'https://storage.googleapis.com/incmedia2019/2020/09/79e406ce-photo_2020-09-24-10.24.38-576x1024.jpeg'
        },
        {
          id: 'res_2026_03_08_0900_jones',
          sunday_service_id: 'svc_2026_03_08_0900',
          num_adults: 1,
          num_children: 1,
          children_ages: [6],
          seating_preference: 'back_section',
          contact_full_name: 'Marcus Jones',
          contact_email: 'marcus.jones@example.com',
          contact_phone: '5558824411',
          notes: 'Child is shy; back row preferred.',
          created_at: '2026-03-01T09:30:00Z',
          status: 'confirmed',
          image: 'https://cdn.shopify.com/s/files/1/0468/4270/8124/articles/2559477084_17550210_2000x.jpg?v=1608170023'
        },
        {
          id: 'res_2026_03_15_0900_wilson',
          sunday_service_id: 'svc_2026_03_15_0900',
          num_adults: 3,
          num_children: 0,
          children_ages: [],
          seating_preference: 'front_section',
          contact_full_name: 'Evelyn Wilson',
          contact_email: 'evelyn.wilson@example.com',
          contact_phone: '5553342200',
          notes: 'Sitting together as a small group.',
          created_at: '2026-03-02T12:10:00Z',
          status: 'confirmed',
          image: 'https://bluemusemagdotcom.files.wordpress.com/2016/12/in-article-photo1.jpg?w=950'
        }
      ]
    };

    // Populate localStorage with generated data using storage keys
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.setItem('devotionals', JSON.stringify(generatedData.devotionals));
      localStorage.setItem('donation_funds', JSON.stringify(generatedData.donation_funds));
      localStorage.setItem('resource_categories', JSON.stringify(generatedData.resource_categories));
      localStorage.setItem('sermons', JSON.stringify(generatedData.sermons));
      localStorage.setItem('shipping_options', JSON.stringify(generatedData.shipping_options));
      localStorage.setItem('small_groups', JSON.stringify(generatedData.small_groups));
      localStorage.setItem('products', JSON.stringify(generatedData.products));
      localStorage.setItem('sunday_services', JSON.stringify(generatedData.sunday_services));
      localStorage.setItem('service_reservations', JSON.stringify(generatedData.service_reservations));
      // Other storage keys (reading_lists, carts, etc.) are initialized by _initStorage
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveRecentAnxietyDevotionalsToReadingList();
    this.testTask2_ReserveSundayServiceSeats();
    this.testTask3_CreateOldTestamentReadingPlan();
    this.testTask4_SubmitAnonymousHealthPrayerRequest();
    this.testTask5_MakeDonationToMissionsFund();
    this.testTask6_JoinOnlineWednesdayYoungAdultGroup();
    this.testTask7_AddHighestRatedForgivenessSermonToWatchLater();
    this.testTask8_AddMarriageBooksAndSelectFreeShipping();

    return this.results;
  }

  // Task 1: Save 3 recent devotionals about anxiety under 10 minutes to reading list
  testTask1_SaveRecentAnxietyDevotionalsToReadingList() {
    const testName = 'Task 1: Save recent anxiety devotionals to reading list';
    try {
      this.clearStorage();
      this.setupTestData();

      const homepage = this.logic.getHomepageHighlights();
      this.assert(homepage && typeof homepage === 'object', 'Homepage highlights should be returned');

      const filterOptions = this.logic.getDevotionalFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.topic_tags), 'Devotional filter options should include topic_tags');

      const searchResult = this.logic.searchDevotionals(
        'anxiety',
        {
          topic_tag: 'anxiety',
          max_reading_time_minutes: 10,
          date_range_preset: 'last_12_months'
        },
        'date_desc',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'searchDevotionals should return items array');
      this.assert(searchResult.items.length >= 1, 'There should be at least one anxiety devotional');

      const desiredCount = Math.min(3, searchResult.items.length);
      const selectedItems = searchResult.items.slice(0, desiredCount);
      const selectedDevotionalIds = selectedItems.map(function (i) { return i.devotional_id; });

      const readingListItemIds = [];

      for (let i = 0; i < selectedItems.length; i++) {
        const devotionalId = selectedItems[i].devotional_id;
        const detail = this.logic.getDevotionalDetail(devotionalId);
        this.assert(detail && detail.devotional, 'getDevotionalDetail should return devotional');
        this.assert(detail.devotional.id === devotionalId, 'Returned devotional id should match requested id');

        const saveResult = this.logic.saveDevotionalToReadingList(devotionalId);
        this.assert(saveResult && saveResult.success === true, 'saveDevotionalToReadingList should succeed');
        this.assert(!!saveResult.reading_list_item_id, 'Reading list item id should be returned');
        readingListItemIds.push(saveResult.reading_list_item_id);
      }

      const readingList = this.logic.getReadingListItems();
      this.assert(readingList && Array.isArray(readingList.items), 'getReadingListItems should return items');

      const readingListDevotionalIds = readingList.items.map(function (item) { return item.devotional_id; });
      for (let i = 0; i < selectedDevotionalIds.length; i++) {
        const id = selectedDevotionalIds[i];
        this.assert(
          readingListDevotionalIds.indexOf(id) !== -1,
          'Reading list should contain devotional ' + id
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Reserve seats for a 9:00 AM Sunday service for family
  testTask2_ReserveSundayServiceSeats() {
    const testName = 'Task 2: Reserve seats for 9:00 AM Sunday service';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate navigating to Sunday Services schedule from a past date where data exists
      const schedule = this.logic.getUpcomingSundayServices('2026-02-01', 20);
      this.assert(schedule && Array.isArray(schedule.services), 'getUpcomingSundayServices should return services array');
      this.assert(schedule.services.length > 0, 'There should be at least one Sunday service');

      // Find 9:00 AM Sunday services
      const nineAmServices = schedule.services.filter(function (svc) {
        return svc.start_time_label === '9:00 AM';
      });
      this.assert(nineAmServices.length > 0, 'There should be at least one 9:00 AM service');

      // Choose the earliest by start_datetime
      let chosenService = null;
      for (let i = 0; i < nineAmServices.length; i++) {
        const svc = nineAmServices[i];
        if (!chosenService) {
          chosenService = svc;
        } else {
          const svcTime = new Date(svc.start_datetime).getTime();
          const chosenTime = new Date(chosenService.start_datetime).getTime();
          if (svcTime < chosenTime) {
            chosenService = svc;
          }
        }
      }

      this.assert(chosenService && chosenService.id, 'A 9:00 AM Sunday service should be selected');

      const detail = this.logic.getSundayServiceDetail(chosenService.id);
      this.assert(detail && detail.service, 'getSundayServiceDetail should return service');
      this.assert(detail.service.id === chosenService.id, 'Service detail id should match selected service');

      const reservationResult = this.logic.createServiceReservation(
        chosenService.id,
        2, // numAdults
        1, // numChildren
        [7], // childrenAges
        'front_section',
        'Alex Parker',
        'alex.parker@example.com',
        '5551234567',
        ''
      );

      this.assert(reservationResult && reservationResult.success === true, 'createServiceReservation should succeed');
      this.assert(!!reservationResult.reservation_id, 'Reservation id should be returned');

      const confirmation = this.logic.getServiceReservationConfirmation(reservationResult.reservation_id);
      this.assert(confirmation && confirmation.reservation && confirmation.service, 'Reservation confirmation should include reservation and service');
      this.assert(
        confirmation.reservation.sunday_service_id === chosenService.id,
        'Reservation should reference the correct Sunday service'
      );
      this.assert(
        confirmation.reservation.num_adults === 2 && confirmation.reservation.num_children === 1,
        'Reservation should have 2 adults and 1 child'
      );
      this.assert(
        confirmation.reservation.seating_preference === 'front_section',
        'Seating preference should be front_section'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Create a 30-day Old Testament Bible reading plan starting on June 1, 2026 with daily reminders
  testTask3_CreateOldTestamentReadingPlan() {
    const testName = 'Task 3: Create 30-day Old Testament reading plan with reminders';
    try {
      this.clearStorage();
      this.setupTestData();

      const builderDefaults = this.logic.getReadingPlanBuilderDefaults();
      this.assert(builderDefaults && Array.isArray(builderDefaults.available_content_scopes), 'Builder defaults should include content scopes');

      // Create plan per task
      const createResult = this.logic.createBibleReadingPlan(
        '30-Day Old Testament Plan',
        'Auto-generated plan for testing',
        'old_testament',
        30,
        4,
        '2026-06-01',
        true,
        '07:00'
      );

      this.assert(createResult && createResult.success === true, 'createBibleReadingPlan should succeed');
      this.assert(createResult.plan && createResult.plan.id, 'Created plan should have an id');

      const plan = createResult.plan;
      const days = createResult.days || [];

      this.assert(plan.content_scope === 'old_testament', 'Plan content scope should be old_testament');
      this.assert(plan.duration_days === 30, 'Plan duration should be 30 days');
      this.assert(plan.chapters_per_day === 4, 'Plan should have 4 chapters per day');
      this.assert(plan.daily_reminder_enabled === true, 'Daily reminders should be enabled');
      this.assert(plan.daily_reminder_time === '07:00', 'Daily reminder time should be 07:00');

      // Verify start date matches requested date (ignoring time component)
      const planStartDate = new Date(plan.start_date);
      const planStartDateStr = planStartDate.toISOString().slice(0, 10);
      this.assert(planStartDateStr === '2026-06-01', 'Plan start_date should be 2026-06-01');

      this.assert(Array.isArray(days) && days.length === 30, 'Plan should have 30 ReadingPlanDay entries');
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        this.assert(day.plan_id === plan.id, 'ReadingPlanDay should reference the correct plan id');
        this.assert(typeof day.day_number === 'number', 'ReadingPlanDay should have a numeric day_number');
      }

      // Confirm plan appears in list
      const listResult = this.logic.getBibleReadingPlansList();
      this.assert(listResult && Array.isArray(listResult.plans), 'getBibleReadingPlansList should return plans array');

      const listedPlan = listResult.plans.find(function (p) { return p.plan_id === plan.id; });
      this.assert(!!listedPlan, 'Created plan should appear in plans list');
      this.assert(listedPlan.daily_reminder_enabled === true, 'Listed plan should have reminders enabled');

      // Confirm detail fetch
      const detailResult = this.logic.getReadingPlanDetail(plan.id);
      this.assert(detailResult && detailResult.plan && Array.isArray(detailResult.days), 'getReadingPlanDetail should return plan and days');
      this.assert(detailResult.plan.id === plan.id, 'Detail plan id should match created plan');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Submit an anonymous health-related prayer request and opt into weekly prayer newsletter
  testTask4_SubmitAnonymousHealthPrayerRequest() {
    const testName = 'Task 4: Submit anonymous health prayer request with newsletter opt-in';
    try {
      this.clearStorage();
      this.setupTestData();

      const pageContent = this.logic.getPrayerPageContent();
      this.assert(pageContent && typeof pageContent === 'object', 'Prayer page content should be returned');

      const categoryOptions = this.logic.getPrayerRequestCategoryOptions();
      this.assert(categoryOptions && Array.isArray(categoryOptions.categories), 'Prayer categories should be returned');

      const hasHealthCategory = categoryOptions.categories.some(function (c) { return c.value === 'health'; });
      this.assert(hasHealthCategory, 'Health category should be available');

      const requestText = 'Please pray for healing and strength during an upcoming medical procedure.';

      const submitResult = this.logic.submitPrayerRequest(
        'health',
        requestText,
        true,
        true,
        'anonymous.requester@example.com'
      );

      this.assert(submitResult && submitResult.success === true, 'submitPrayerRequest should succeed');
      this.assert(submitResult.prayer_request && submitResult.prayer_request.id, 'PrayerRequest should be returned with id');

      const pr = submitResult.prayer_request;
      this.assert(pr.category === 'health', 'PrayerRequest category should be health');
      this.assert(pr.is_anonymous === true, 'PrayerRequest should be anonymous');
      this.assert(pr.newsletter_opt_in === true, 'PrayerRequest should have newsletter_opt_in true');

      const sub = submitResult.newsletter_subscription;
      this.assert(sub && sub.id, 'NewsletterSubscription should be returned');
      this.assert(sub.newsletter_type === 'weekly_prayer', 'Newsletter type should be weekly_prayer');
      this.assert(sub.is_subscribed === true, 'Newsletter subscription should be active');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Make a one-time $50 donation to the Missions Fund and cover the 2.5% processing fee
  testTask5_MakeDonationToMissionsFund() {
    const testName = 'Task 5: Make one-time $50 Missions Fund donation with processing fee coverage';
    try {
      this.clearStorage();
      this.setupTestData();

      const fundsResult = this.logic.getDonationFunds();
      this.assert(fundsResult && Array.isArray(fundsResult.funds), 'getDonationFunds should return funds array');

      const missionsFund = fundsResult.funds.find(function (f) { return f.code === 'missions_fund'; });
      this.assert(missionsFund && missionsFund.id, 'Missions Fund should be available');

      const defaults = this.logic.getDonationDefaults();
      this.assert(defaults && typeof defaults.processing_fee_percent === 'number', 'Donation defaults should include processing_fee_percent');

      const processingFeePercent = defaults.processing_fee_percent;

      const createResult = this.logic.createDonation(
        missionsFund.id,
        50,
        'one_time',
        true,
        'in_honor_of',
        'John Smith',
        'credit_card',
        '4111111111111111',
        12,
        2028,
        '123',
        '12345',
        'Alex Donor',
        'alex.donor@example.com',
        '5559876543',
        '123 Hope Street',
        '',
        'Springfield',
        'CA',
        '12345',
        'USA'
      );

      this.assert(createResult && createResult.success === true, 'createDonation should succeed');
      this.assert(createResult.donation && createResult.donation.id, 'Donation should be returned with id');

      const donation = createResult.donation;
      this.assert(donation.fund_id === missionsFund.id, 'Donation fund_id should match Missions Fund id');
      this.assert(donation.frequency === 'one_time', 'Donation frequency should be one_time');
      this.assert(donation.cover_processing_fee === true, 'cover_processing_fee should be true');
      this.assert(donation.dedication_type === 'in_honor_of', 'Dedication type should be in_honor_of');
      this.assert(donation.dedication_name === 'John Smith', 'Dedication name should be John Smith');
      this.assert(donation.payment_method === 'credit_card', 'Payment method should be credit_card');

      // Verify processing fee fields are consistent with defaults
      if (typeof donation.processing_fee_percent === 'number') {
        this.assert(
          Math.abs(donation.processing_fee_percent - processingFeePercent) < 0.0001,
          'processing_fee_percent should match defaults'
        );
      }

      if (typeof donation.processing_fee_amount === 'number' && typeof donation.total_charge_amount === 'number') {
        const expectedTotal = donation.amount + donation.processing_fee_amount;
        const diff = Math.abs(donation.total_charge_amount - expectedTotal);
        this.assert(diff < 0.01, 'total_charge_amount should equal amount + processing_fee_amount (within rounding)');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Join an online Wednesday small group for young adults that starts the soonest
  testTask6_JoinOnlineWednesdayYoungAdultGroup() {
    const testName = 'Task 6: Join earliest online Wednesday young adult group';
    try {
      this.clearStorage();
      this.setupTestData();

      const filterOptions = this.logic.getSmallGroupFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.audiences), 'Small group filter options should be returned');

      const searchResult = this.logic.searchSmallGroups(
        {
          audience: 'young_adults',
          meetingFormat: 'online',
          meetingDay: 'wednesday',
          meetingTimeStartFrom: '18:00',
          meetingTimeStartTo: '20:00',
          status: 'open'
        },
        'start_date_asc'
      );

      this.assert(searchResult && Array.isArray(searchResult.groups), 'searchSmallGroups should return groups array');
      this.assert(searchResult.groups.length > 0, 'There should be at least one matching small group');

      // Pick group with earliest start_date
      let chosenGroup = null;
      for (let i = 0; i < searchResult.groups.length; i++) {
        const group = searchResult.groups[i];
        if (!chosenGroup) {
          chosenGroup = group;
        } else {
          const groupStart = new Date(group.start_date).getTime();
          const chosenStart = new Date(chosenGroup.start_date).getTime();
          if (groupStart < chosenStart) {
            chosenGroup = group;
          }
        }
      }

      this.assert(chosenGroup && chosenGroup.id, 'A small group should be selected');

      const detail = this.logic.getSmallGroupDetail(chosenGroup.id);
      this.assert(detail && detail.group, 'getSmallGroupDetail should return group');
      this.assert(detail.group.id === chosenGroup.id, 'Detail group id should match selected group');

      const registrationResult = this.logic.registerForSmallGroup(
        chosenGroup.id,
        'Test Participant',
        'test.participant@example.com',
        '5551122334',
        'Looking forward to joining this group.'
      );

      this.assert(registrationResult && registrationResult.success === true, 'registerForSmallGroup should succeed');
      this.assert(registrationResult.group_registration && registrationResult.group_registration.id, 'GroupRegistration should be returned with id');
      this.assert(
        registrationResult.group_registration.small_group_id === chosenGroup.id,
        'GroupRegistration small_group_id should match selected group id'
      );

      const confirmation = this.logic.getGroupRegistrationConfirmation(registrationResult.group_registration.id);
      this.assert(confirmation && confirmation.group_registration && confirmation.group, 'Group registration confirmation should include registration and group');
      this.assert(
        confirmation.group_registration.small_group_id === chosenGroup.id,
        'Confirmation registration should reference the correct small group'
      );
      this.assert(confirmation.group.id === chosenGroup.id, 'Confirmation group id should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Add highest-rated recent forgiveness sermon under 35 minutes to Watch Later list
  testTask7_AddHighestRatedForgivenessSermonToWatchLater() {
    const testName = 'Task 7: Add highest-rated forgiveness sermon under 35 minutes to Watch Later';
    try {
      this.clearStorage();
      this.setupTestData();

      const filterOptions = this.logic.getSermonFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.topics), 'Sermon filter options should be returned');

      const searchResult = this.logic.searchSermons(
        'forgiveness',
        {
          topic: 'forgiveness',
          date_range_preset: 'last_2_years',
          min_rating: 4.5,
          max_duration_minutes: 35
        },
        'rating_desc',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'searchSermons should return items array');
      this.assert(searchResult.items.length > 0, 'There should be at least one forgiveness sermon matching filters');

      // Identify highest-rated sermon; if tie, pick first in list
      let bestItem = null;
      for (let i = 0; i < searchResult.items.length; i++) {
        const item = searchResult.items[i];
        if (!bestItem) {
          bestItem = item;
        } else if (item.rating_average > bestItem.rating_average) {
          bestItem = item;
        }
      }

      this.assert(bestItem && bestItem.sermon_id, 'A sermon should be selected as highest-rated');

      const detail = this.logic.getSermonDetail(bestItem.sermon_id);
      this.assert(detail && detail.sermon, 'getSermonDetail should return sermon');
      this.assert(detail.sermon.id === bestItem.sermon_id, 'Detail sermon id should match selected sermon');

      const addResult = this.logic.addSermonToWatchLater(bestItem.sermon_id);
      this.assert(addResult && addResult.success === true, 'addSermonToWatchLater should succeed');
      this.assert(addResult.watch_later_item_id, 'WatchLater item id should be returned');

      const watchLater = this.logic.getWatchLaterList();
      this.assert(watchLater && Array.isArray(watchLater.items), 'getWatchLaterList should return items array');

      const savedItem = watchLater.items.find(function (i) { return i.sermon_id === bestItem.sermon_id; });
      this.assert(!!savedItem, 'Watch Later list should contain the selected sermon');
      this.assert(savedItem.title === detail.sermon.title, 'Saved sermon title should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Add 2 marriage books under $20 to cart and select free shipping (adapted: no free devotional product in data)
  testTask8_AddMarriageBooksAndSelectFreeShipping() {
    const testName = 'Task 8: Add marriage books under $20 and select free shipping';
    try {
      this.clearStorage();
      this.setupTestData();

      const categoriesResult = this.logic.getStoreCategories();
      this.assert(categoriesResult && Array.isArray(categoriesResult.categories), 'getStoreCategories should return categories array');

      const marriageCategory = categoriesResult.categories.find(function (c) { return c.code === 'marriage'; });
      this.assert(marriageCategory && marriageCategory.id, 'Marriage category should be available');

      const filterOptions = this.logic.getProductFilterOptions(marriageCategory.id);
      this.assert(filterOptions && typeof filterOptions.price_max === 'number', 'Product filter options should include price range');

      const productsResult = this.logic.listProductsByCategory(
        marriageCategory.id,
        {
          minPrice: 0,
          maxPrice: 20,
          formats: ['physical'],
          types: ['book'],
          isFree: false,
          isPhysicalShippable: true
        },
        'price_asc',
        1,
        20
      );

      this.assert(productsResult && Array.isArray(productsResult.items), 'listProductsByCategory should return items array');
      this.assert(productsResult.items.length >= 2, 'There should be at least two marriage books priced at or under $20');

      const firstTwo = productsResult.items.slice(0, 2);
      const productIds = firstTwo.map(function (p) { return p.product_id; });

      let cartId = null;
      for (let i = 0; i < productIds.length; i++) {
        const productId = productIds[i];
        const addResult = this.logic.addProductToCart(productId, 1);
        this.assert(addResult && addResult.success === true, 'addProductToCart should succeed');
        this.assert(addResult.cart_id, 'Cart id should be returned when adding to cart');
        cartId = addResult.cart_id;
      }

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart_id === cartId, 'getCartSummary should return current cart with expected id');
      this.assert(Array.isArray(cartSummary.items) && cartSummary.items.length >= 2, 'Cart should contain at least two items');

      // Verify items are physical, shippable books and subtotal >= 30 for free shipping eligibility
      let subtotalFromItems = 0;
      for (let i = 0; i < cartSummary.items.length; i++) {
        const item = cartSummary.items[i];
        subtotalFromItems += item.total_price;
        if (productIds.indexOf(item.product_id) !== -1) {
          this.assert(item.is_physical_shippable === true, 'Marriage books should be physical shippable items');
        }
      }

      this.assert(
        Math.abs(cartSummary.subtotal - subtotalFromItems) < 0.01,
        'Cart subtotal should equal sum of item totals (within rounding)'
      );
      this.assert(cartSummary.subtotal >= 30, 'Subtotal should meet or exceed $30 threshold for free shipping');
      this.assert(cartSummary.eligible_for_free_shipping === true, 'Cart should be eligible for free shipping');

      const shippingOptionsResult = this.logic.getAvailableShippingOptionsForCart();
      this.assert(shippingOptionsResult && Array.isArray(shippingOptionsResult.options), 'getAvailableShippingOptionsForCart should return options array');

      const freeOption = shippingOptionsResult.options.find(function (opt) {
        return opt.code === 'free_shipping' && opt.is_eligible_for_free === true;
      });
      this.assert(freeOption && freeOption.shipping_option_id, 'Free shipping option should be available and eligible');
      this.assert(freeOption.cost === 0, 'Free shipping option cost should be 0');

      const setResult = this.logic.setCartShippingOption(freeOption.shipping_option_id);
      this.assert(setResult && setResult.success === true, 'setCartShippingOption should succeed');
      this.assert(setResult.shipping_option && setResult.shipping_option.id === freeOption.shipping_option_id, 'Applied shipping option id should match selected free option');
      this.assert(setResult.shipping_cost === 0, 'Applied shipping cost should be 0 for free shipping');

      const totalExpected = setResult.subtotal + setResult.shipping_cost;
      const totalDiff = Math.abs(setResult.total - totalExpected);
      this.assert(totalDiff < 0.01, 'Cart total should equal subtotal plus shipping cost (within rounding)');

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
    console.log('PASS: ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('FAIL: ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY
module.exports = TestRunner;
