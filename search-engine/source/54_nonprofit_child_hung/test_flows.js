class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear and init storage
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure
    this.logic._initStorage();
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      advocacy_topics: [
        {
          id: 'increase_school_breakfast_funding',
          topicCode: 'increase_school_breakfast_funding',
          name: 'Increase School Breakfast Funding',
          description: 'Support legislation that expands access to healthy, free or reduced-price school breakfasts for children in low-income communities.'
        },
        {
          id: 'child_nutrition_general',
          topicCode: 'child_nutrition_general',
          name: 'Protect and Expand Child Nutrition Programs',
          description: 'Urge lawmakers to protect and strengthen core child nutrition programs such as SNAP, WIC, and national school meals.'
        },
        {
          id: 'summer_meals_programs',
          topicCode: 'summer_meals_programs',
          name: 'Strengthen Summer Meals Programs',
          description: 'Advocate for better funding and flexibility for summer meal sites so children don\u2019t go hungry when school is out.'
        }
      ],
      fundraising_campaigns: [
        {
          id: 'summer_meals_2025',
          name: 'Summer Meals 2025',
          slug: 'summer-meals-2025',
          description: 'Help ensure children have consistent access to nutritious meals all summer long. This peer-to-peer campaign empowers supporters to create personal fundraising pages to keep kids fed when school cafeterias are closed.',
          defaultGoalAmount: 500,
          startDate: '2025-04-01T00:00:00Z',
          endDate: '2026-09-30T23:59:59Z',
          status: 'active',
          campaignType: 'peer_to_peer',
          primaryImageUrl: 'https://images.unsplash.com/photo-1602016753446-6c9f9236a353?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'school_breakfast_expansion_2026',
          name: 'School Breakfast Expansion 2026',
          slug: 'school-breakfast-expansion-2026',
          description: 'Fuel young minds by expanding universal school breakfast programs in high-need districts.',
          defaultGoalAmount: 250000,
          startDate: '2026-08-01T00:00:00Z',
          endDate: '2027-06-30T23:59:59Z',
          status: 'upcoming',
          campaignType: 'organizational',
          primaryImageUrl: 'https://www.wallpapermania.eu/images/lthumbs/2014-12/7266_Healthy-breakfast-cereals-with-milk-and-fruits.jpg'
        },
        {
          id: 'emergency_food_boxes_2026',
          name: 'Emergency Food Boxes 2026',
          slug: 'emergency-food-boxes-2026',
          description: 'Provide rapid-response food boxes to families facing sudden crises, disasters, or displacement.',
          defaultGoalAmount: 150000,
          startDate: '2025-11-01T00:00:00Z',
          endDate: '2026-12-31T23:59:59Z',
          status: 'active',
          campaignType: 'organizational',
          primaryImageUrl: 'https://images.unsplash.com/photo-1584287803388-4615a3c78a61?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      regions: [
        {
          id: 'africa_region',
          regionCode: 'africa',
          name: 'Africa',
          description: 'Countries across sub-Saharan and North Africa where we support school meals, emergency food, and nutrition programs.'
        },
        {
          id: 'central_america_region',
          regionCode: 'central_america',
          name: 'Central America',
          description: 'Central American countries where children face high rates of food insecurity and chronic malnutrition.'
        },
        {
          id: 'north_america_region',
          regionCode: 'north_america',
          name: 'North America',
          description: 'Programs in the United States, Canada, and Mexico, including school meals and family food support.'
        }
      ],
      representatives: [
        {
          id: 'rep_alexandra_ruiz',
          name: 'Alexandra Ruiz',
          title: 'U.S. Senator for New York',
          officeType: 'senator',
          email: 'ruiz.office@example.org',
          phone: '+1-202-555-0142',
          addressLine1: '123 Hart Senate Office Building',
          addressLine2: '',
          city: 'Washington',
          state: 'DC',
          postalCode: '20510',
          supportedZipCodes: ['10001', '10002', '10003', '10018'],
          districts: ['New York State']
        },
        {
          id: 'rep_michael_lee',
          name: 'Michael T. Lee',
          title: 'U.S. Senator for New York',
          officeType: 'senator',
          email: 'lee.office@example.org',
          phone: '+1-202-555-0179',
          addressLine1: '455 Russell Senate Office Building',
          addressLine2: '',
          city: 'Washington',
          state: 'DC',
          postalCode: '20510',
          supportedZipCodes: ['10001', '10004', '10005', '10006'],
          districts: ['New York State']
        },
        {
          id: 'rep_jordan_patel',
          name: 'Jordan Patel',
          title: 'U.S. Representative, New York 10th District',
          officeType: 'representative',
          email: 'jordan.patel@example.org',
          phone: '+1-202-555-0193',
          addressLine1: '1408 Longworth House Office Building',
          addressLine2: '',
          city: 'Washington',
          state: 'DC',
          postalCode: '20515',
          supportedZipCodes: ['10001', '10011', '10012', '10013'],
          districts: ['New York 10th Congressional District']
        }
      ],
      countries: [
        {
          id: 'ethiopia',
          name: 'Ethiopia',
          isoCode: 'ET',
          regionCode: 'africa',
          childMalnutritionRatePercent: 38.4,
          isDonationTarget: true,
          defaultCurrency: 'ETB',
          displayOrder: 1
        },
        {
          id: 'somalia',
          name: 'Somalia',
          isoCode: 'SO',
          regionCode: 'africa',
          childMalnutritionRatePercent: 48.2,
          isDonationTarget: true,
          defaultCurrency: 'SOS',
          displayOrder: 2
        },
        {
          id: 'niger',
          name: 'Niger',
          isoCode: 'NE',
          regionCode: 'africa',
          childMalnutritionRatePercent: 44.1,
          isDonationTarget: true,
          defaultCurrency: 'XOF',
          displayOrder: 3
        }
      ],
      children: [
        {
          id: 'child_central_1',
          firstName: 'Mar\u00eda',
          lastName: 'Lopez',
          gender: 'female',
          birthdate: '2016-08-15T00:00:00Z',
          age: 9,
          regionCode: 'central_america',
          countryId: 'guatemala',
          communityName: 'Quetzaltenango',
          waitingSince: '2024-09-10T00:00:00Z',
          daysWaiting: 540,
          isWaitingForSponsorship: true,
          profilePhotoUrl: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800&h=600&fit=crop&auto=format&q=80',
          shortBio: 'Mar\u00eda loves reading stories and wants to become a teacher. Her family often struggles to afford enough food, especially during the lean season.'
        },
        {
          id: 'child_central_2',
          firstName: 'Diego',
          lastName: 'Ramirez',
          gender: 'male',
          birthdate: '2018-01-20T00:00:00Z',
          age: 7,
          regionCode: 'central_america',
          countryId: 'honduras',
          communityName: 'San Pedro de Sula',
          waitingSince: '2024-12-01T00:00:00Z',
          daysWaiting: 460,
          isWaitingForSponsorship: true,
          profilePhotoUrl: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=800&h=600&fit=crop&auto=format&q=80',
          shortBio: 'Diego enjoys playing soccer with his cousins. A sponsorship will help ensure he gets a nutritious meal each school day.'
        },
        {
          id: 'child_central_3',
          firstName: 'Ana Sof\u00eda',
          lastName: 'Mart\u00ednez',
          gender: 'female',
          birthdate: '2020-02-10T00:00:00Z',
          age: 6,
          regionCode: 'central_america',
          countryId: 'el_salvador',
          communityName: 'Santa Ana',
          waitingSince: '2025-05-15T00:00:00Z',
          daysWaiting: 293,
          isWaitingForSponsorship: true,
          profilePhotoUrl: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=800&h=600&fit=crop&auto=format&q=80',
          shortBio: 'Ana Sof\u00eda is shy at first but loves to sing once she feels comfortable. School meals help her focus in class.'
        }
      ],
      programs: [
        {
          id: 'school_lunches_global',
          name: 'School Lunches',
          slug: 'school-lunches',
          shortDescription: 'Provide daily nutritious school lunches so children can learn, grow, and thrive.',
          longDescription: 'Our School Lunches program partners with local schools and communities to provide reliable, nutritious midday meals. For many students, this is the most substantial meal of the day. Each meal is designed with local nutritionists to include protein, whole grains, and fresh produce when available. Your support helps reduce hunger, improve attendance, and boost academic performance.',
          programType: 'school_meal_program',
          regionCode: 'global',
          countryId: 'global_programs',
          childrenServedTotal: 250000,
          childrenFedPer10: 7.5,
          isFeaturedOnDonatePage: true,
          isSchoolMealProgram: true,
          impactStories: [
            'In Guatemala, school attendance rose by 18% after lunches were introduced.',
            'In rural Kenya, teachers report students are more attentive in afternoon classes.'
          ],
          imageUrl: 'https://ewscripps.brightspotcdn.com/dims4/default/4467500/2147483647/strip/true/crop/2400x1350+0+9/resize/1280x720!/quality/90/?url=http%3A%2F%2Fewscripps-brightspot.s3.amazonaws.com%2F1b%2F6b%2Fc1e6b2194079a2010610268655ef%2Fscreen-shot-2019-06-03-at-10.28.56%20PM.png'
        },
        {
          id: 'emergency_food_boxes_global',
          name: 'Emergency Food Boxes',
          slug: 'emergency-food-boxes',
          shortDescription: 'Rapid-response food boxes for families facing sudden crises.',
          longDescription: 'When disaster, conflict, or economic shock strikes, children are often the first to feel the impact of hunger. Our Emergency Food Boxes program delivers shelf-stable staples, fortified foods, and child-friendly snacks directly to families. Boxes are tailored to local diets and can sustain a family for up to two weeks while longer-term support is organized.',
          programType: 'emergency_food_boxes',
          regionCode: 'global',
          countryId: 'global_programs',
          childrenServedTotal: 180000,
          childrenFedPer10: 6.2,
          isFeaturedOnDonatePage: true,
          isSchoolMealProgram: false,
          impactStories: [
            'Following flooding in Bangladesh, emergency boxes reached affected families within 72 hours.',
            'In Honduras, food boxes bridged the gap for families after hurricane damage destroyed crops.'
          ],
          imageUrl: 'https://pd12m.s3.us-west-2.amazonaws.com/images/f35fe65c-e2bb-5069-a433-129b4c62c43a.jpeg'
        },
        {
          id: 'maternal_nutrition_africa',
          name: 'Maternal Nutrition',
          slug: 'maternal-nutrition-africa',
          shortDescription: 'Support nutrition for pregnant women, new mothers, and infants.',
          longDescription: 'The first 1,000 days\u2014from pregnancy to a child\u2019s second birthday\u2014are critical for healthy growth. Our Maternal Nutrition program provides fortified foods, micronutrient supplements, nutrition counseling, and breastfeeding support. By improving maternal health, we protect children from the long-term consequences of malnutrition.',
          programType: 'maternal_nutrition',
          regionCode: 'africa',
          countryId: 'ethiopia',
          childrenServedTotal: 65000,
          childrenFedPer10: 4.1,
          isFeaturedOnDonatePage: true,
          isSchoolMealProgram: false,
          impactStories: [
            'In Ethiopia, mothers in the program were 35% less likely to have underweight newborns.',
            'Community health workers now use mobile tools to track infant growth regularly.'
          ],
          imageUrl: 'https://pd12m.s3.us-west-2.amazonaws.com/images/740c5f79-f4fc-5306-8a03-f5a981a9c0eb.png'
        }
      ],
      fundraising_events: [
        {
          id: 'chi_family5k_lakefront_2026_06_06',
          title: 'Chicago Family 5K \u2013 Lakefront Run',
          description: 'Bring the whole family to our Lakefront Family 5K in Chicago. Walk, jog, or run together to raise funds for summer meals for kids across the city.',
          eventType: 'run_walk',
          venueName: 'Chicago Lakefront Trail \u2013 Grant Park',
          addressLine1: '337 E Randolph St',
          addressLine2: '',
          city: 'Chicago',
          state: 'IL',
          postalCode: '60601',
          eventDate: '2026-06-06T08:00:00Z',
          startTimeOptions: ['08:00', '09:00', '10:00'],
          earliestStartTime: '08:00',
          registrationOpen: true,
          maxParticipants: 1500,
          isFamilyFriendly: true,
          keywords: ['family 5k', 'run', 'walk', 'chicago', 'summer meals', 'fundraiser'],
          participantsRegistered: 0
        },
        {
          id: 'chi_family5k_downtown_2026_06_20',
          title: 'Downtown Chicago Family 5K & Kids Dash',
          description: 'A festive family 5K and kids dash through downtown Chicago to support weekend backpack programs for local students.',
          eventType: 'run_walk',
          venueName: 'Maggie Daley Park',
          addressLine1: '337 E Randolph St',
          addressLine2: '',
          city: 'Chicago',
          state: 'IL',
          postalCode: '60601',
          eventDate: '2026-06-20T09:00:00Z',
          startTimeOptions: ['08:30', '09:30', '11:00'],
          earliestStartTime: '08:30',
          registrationOpen: true,
          maxParticipants: 1800,
          isFamilyFriendly: true,
          keywords: ['family 5k', 'kids dash', 'run', 'walk', 'chicago', 'backpack program'],
          participantsRegistered: 0
        },
        {
          id: 'chi_10k_hunger_2026_06_13',
          title: 'Chicago 10K for Hunger',
          description: 'Competitive and recreational runners take on a 10K course along the river to fight child hunger in the Midwest.',
          eventType: 'run_walk',
          venueName: 'Chicago Riverwalk',
          addressLine1: '201 E Randolph St',
          addressLine2: '',
          city: 'Chicago',
          state: 'IL',
          postalCode: '60601',
          eventDate: '2026-06-13T07:30:00Z',
          startTimeOptions: ['07:30', '08:00'],
          earliestStartTime: '07:30',
          registrationOpen: true,
          maxParticipants: 1200,
          isFamilyFriendly: false,
          keywords: ['10k', 'run', 'chicago', 'midwest', 'hunger'],
          participantsRegistered: 0
        }
      ],
      event_registrations: [
        {
          id: 'reg_chi_family5k_lakefront_001',
          fundraisingEventId: 'chi_family5k_lakefront_2026_06_06',
          selectedStartTime: '08:00',
          primaryContactName: 'Lauren Mitchell',
          primaryContactEmail: 'lauren.mitchell@example.com',
          primaryContactPhone: '312-555-0182',
          status: 'confirmed',
          registrationDate: '2026-05-10T14:22:00Z',
          totalParticipants: 0
        },
        {
          id: 'reg_chi_family5k_downtown_001',
          fundraisingEventId: 'chi_family5k_downtown_2026_06_20',
          selectedStartTime: '08:30',
          primaryContactName: 'Robert Chen',
          primaryContactEmail: 'robert.chen@example.com',
          primaryContactPhone: '773-555-0441',
          status: 'pending',
          registrationDate: '2026-05-25T09:15:00Z',
          totalParticipants: 0
        },
        {
          id: 'reg_nyc_family5k_centralpark_001',
          fundraisingEventId: 'nyc_family5k_centralpark_2026_05_16',
          selectedStartTime: '09:00',
          primaryContactName: 'Danielle Torres',
          primaryContactEmail: 'danielle.torres@example.com',
          primaryContactPhone: '646-555-0129',
          status: 'confirmed',
          registrationDate: '2026-04-20T18:40:00Z',
          totalParticipants: 0
        }
      ],
      volunteer_registrations: [
        {
          id: 'volreg_sf_meal_packing_2026_04_11_001',
          volunteerOpportunityId: 'sf_meal_packing_2026_04_11_am',
          numAdultParticipants: 3,
          numYouthParticipants: 1,
          primaryContactName: 'Caroline Hughes',
          primaryContactEmail: 'caroline.hughes@example.com',
          primaryContactPhone: '415-555-0124',
          comments: 'One youth volunteer is 14 years old and can lift light boxes.',
          status: 'confirmed',
          createdAt: '2026-02-20T16:45:00Z'
        },
        {
          id: 'volreg_sf_meal_packing_2026_04_25_001',
          volunteerOpportunityId: 'sf_meal_packing_2026_04_25_pm',
          numAdultParticipants: 1,
          numYouthParticipants: 0,
          primaryContactName: 'Jason Patel',
          primaryContactEmail: 'jason.patel@example.com',
          primaryContactPhone: '628-555-0199',
          comments: 'Happy to help with check-in or cleanup.',
          status: 'pending',
          createdAt: '2026-03-01T10:12:00Z'
        },
        {
          id: 'volreg_oakland_warehouse_2026_03_14_001',
          volunteerOpportunityId: 'oakland_warehouse_sort_2026_03_14',
          numAdultParticipants: 4,
          numYouthParticipants: 2,
          primaryContactName: 'Melissa Grant',
          primaryContactEmail: 'melissa.grant@example.com',
          primaryContactPhone: '510-555-0440',
          comments: 'Group from Lakeside Community Church youth program.',
          status: 'confirmed',
          createdAt: '2026-02-18T09:30:00Z'
        }
      ],
      volunteer_opportunities: [
        {
          id: 'sf_meal_packing_2026_04_11_am',
          title: 'San Francisco Warehouse Meal Packing (Morning Shift)',
          description: 'Help pack nutritious shelf-stable meals for local children and families. Volunteers will work on an assembly line to portion, seal, and box meals for distribution to nearby schools and community partners.',
          activityType: 'meal_packing',
          startDateTime: '2026-04-11T09:00:00Z',
          endDateTime: '2026-04-11T12:00:00Z',
          timeZone: 'America/Los_Angeles',
          locationName: 'SoMa Distribution Center',
          addressLine1: '123 Mission St',
          addressLine2: 'Suite 200',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94103',
          latitude: 37.7892,
          longitude: -122.3971,
          needLevel: 'high',
          maxVolunteers: 40,
          minAge: 12,
          maxAge: 75,
          isWeekend: true,
          tags: ['meal-packing', 'warehouse', 'saturday', 'high need', 'family-friendly', 'zip_94103'],
          regionCode: 'north_america',
          volunteersRegistered: 4
        },
        {
          id: 'sf_meal_packing_2026_04_25_pm',
          title: 'San Francisco Meal Packing (Afternoon Shift)',
          description: 'Join our afternoon shift to assemble meal kits for children who rely on school meals during the week. Tasks include labeling, packing, and staging boxes for delivery trucks.',
          activityType: 'meal_packing',
          startDateTime: '2026-04-25T13:00:00Z',
          endDateTime: '2026-04-25T16:00:00Z',
          timeZone: 'America/Los_Angeles',
          locationName: 'Bayview Community Warehouse',
          addressLine1: '2500 3rd St',
          addressLine2: '',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94107',
          latitude: 37.755,
          longitude: -122.388,
          needLevel: 'medium',
          maxVolunteers: 35,
          minAge: 14,
          maxAge: 75,
          isWeekend: true,
          tags: ['meal-packing', 'warehouse', 'saturday', 'family-friendly'],
          regionCode: 'north_america',
          volunteersRegistered: 1
        },
        {
          id: 'oakland_warehouse_sort_2026_03_14',
          title: 'Oakland Warehouse Sorting & Packing',
          description: 'Sort donated food, check expiration dates, and help pack bulk items into family-sized portions for East Bay school pantries.',
          activityType: 'meal_packing',
          startDateTime: '2026-03-14T10:00:00Z',
          endDateTime: '2026-03-14T13:00:00Z',
          timeZone: 'America/Los_Angeles',
          locationName: 'Oakland Hunger Relief Warehouse',
          addressLine1: '700 Market St',
          addressLine2: '',
          city: 'Oakland',
          state: 'CA',
          postalCode: '94607',
          latitude: 37.8044,
          longitude: -122.2712,
          needLevel: 'high',
          maxVolunteers: 50,
          minAge: 10,
          maxAge: 80,
          isWeekend: true,
          tags: ['meal-packing', 'warehouse', 'east bay', 'saturday'],
          regionCode: 'north_america',
          volunteersRegistered: 6
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:15:02.719165'
      }
    };

    // Populate localStorage using correct storage keys
    localStorage.setItem('advocacy_topics', JSON.stringify(generatedData.advocacy_topics));
    localStorage.setItem('fundraising_campaigns', JSON.stringify(generatedData.fundraising_campaigns));
    localStorage.setItem('regions', JSON.stringify(generatedData.regions));
    localStorage.setItem('representatives', JSON.stringify(generatedData.representatives));
    localStorage.setItem('countries', JSON.stringify(generatedData.countries));
    localStorage.setItem('children', JSON.stringify(generatedData.children));
    localStorage.setItem('programs', JSON.stringify(generatedData.programs));
    localStorage.setItem('fundraising_events', JSON.stringify(generatedData.fundraising_events));
    localStorage.setItem('event_registrations', JSON.stringify(generatedData.event_registrations));
    localStorage.setItem('volunteer_registrations', JSON.stringify(generatedData.volunteer_registrations));
    localStorage.setItem('volunteer_opportunities', JSON.stringify(generatedData.volunteer_opportunities));
    // Store metadata for date calculations
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));

    // Ensure other collections exist as arrays if not already
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    };

    ensureArrayKey('donations');
    ensureArrayKey('recurring_donation_schedules');
    ensureArrayKey('sponsorship_commitments');
    ensureArrayKey('event_participants');
    ensureArrayKey('personal_fundraising_pages');
    ensureArrayKey('info_kit_requests');
    ensureArrayKey('advocacy_letters');
    ensureArrayKey('programs_page_view_preferences');
  }

  // Helper: simple assert
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

  // Helper: get baseline date from metadata or fallback to today (YYYY-MM-DD)
  getBaselineDateString() {
    const metaStr = localStorage.getItem('_metadata');
    if (metaStr) {
      try {
        const meta = JSON.parse(metaStr);
        if (meta && meta.baselineDate) {
          return meta.baselineDate;
        }
      } catch (e) {
        // ignore parse errors
      }
    }
    const now = new Date();
    return this.formatDate(now);
  }

  // Helper: format Date -> 'YYYY-MM-DD'
  formatDate(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_OneTimeDonationMostChildrenFed();
    this.testTask2_MonthlyDonationHighestMalnutritionCountry();
    this.testTask3_VolunteerHighNeedSaturdayNextMonth();
    this.testTask4_ChildSponsorshipLongestWaitingCentralAmerica();
    this.testTask5_EventsFamily5KChicagoJune();
    this.testTask6_CreatePersonalFundraiserSummerMeals2025();
    this.testTask7_RequestInfoKitAfricanProgram50000Plus();
    this.testTask8_SendAdvocacyLetterSchoolBreakfastZIP10001();

    return this.results;
  }

  // Task 1: One-time $45 donation to program feeding most children per $10
  testTask1_OneTimeDonationMostChildrenFed() {
    const testName = 'Task 1: One-time $45 donation to top childrenFedPer10 program';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home.missionSummary === 'string', 'Home page content should load');

      const donateConfig = this.logic.getDonatePageConfig();
      this.assert(donateConfig && donateConfig.currency, 'Donate page config should provide currency');
      const currency = donateConfig.currency;

      const programs = this.logic.getOneTimeDonationPrograms();
      this.assert(Array.isArray(programs) && programs.length > 0, 'Should return programs for one-time donation');

      let selectedProgram = null;
      let maxChildrenFedPer10 = -Infinity;
      programs.forEach((p) => {
        if (typeof p.childrenFedPer10 === 'number' && p.childrenFedPer10 > maxChildrenFedPer10) {
          maxChildrenFedPer10 = p.childrenFedPer10;
          selectedProgram = p;
        }
      });
      this.assert(selectedProgram, 'Should select program with highest childrenFedPer10');

      const amount = 45;
      const coverProcessingFees = true;

      const preview = this.logic.previewDonationTotals(amount, coverProcessingFees, 'one_time', 'credit_debit_card');
      this.assert(preview && typeof preview.totalChargedAmount === 'number', 'previewDonationTotals should return totals');
      this.assert(preview.amount === amount, 'Preview amount should match input amount');
      this.assert(preview.processingFeeAmount >= 0, 'Processing fee should be non-negative');
      this.assert(preview.totalChargedAmount >= amount, 'Total charged should be >= base amount');

      const donationResult = this.logic.submitDonation(
        'program_restricted', // donationType
        'one_time', // frequency
        amount,
        currency,
        selectedProgram.id, // programId
        null, // countryId
        coverProcessingFees,
        null, // chargeDayOfMonth
        false, // smsOptIn
        null, // smsPhoneNumber
        'credit_debit_card',
        'Test Donor',
        '4111111111111111',
        12,
        2028,
        '123',
        '123 Main St',
        '',
        'Springfield',
        'IL',
        '62704',
        'US',
        'Test Donor',
        'test.donor@example.com'
      );

      this.assert(donationResult && donationResult.success === true, 'Donation submission should succeed');
      const donation = donationResult.donation;
      this.assert(donation && donation.id, 'Donation object with id should be returned');
      this.assert(donation.programId === selectedProgram.id, 'Donation.programId should match selected program');
      this.assert(donation.frequency === 'one_time', 'Donation frequency should be one_time');
      this.assert(donation.donationType === 'program_restricted', 'Donation type should be program_restricted');
      this.assert(donation.processingFeeCovered === true, 'processingFeeCovered should be true');
      this.assert(donation.currency === currency, 'Donation currency should match donate config');

      this.assert(
        donation.totalChargedAmount === preview.totalChargedAmount,
        'Donation totalChargedAmount should match preview total'
      );
      this.assert(
        donation.processingFeeAmount === preview.processingFeeAmount,
        'Donation processingFeeAmount should match preview fee'
      );

      const allDonations = JSON.parse(localStorage.getItem('donations') || '[]');
      const storedDonation = allDonations.find((d) => d.id === donation.id);
      this.assert(storedDonation, 'Stored donation should exist in donations storage');
      this.assert(
        storedDonation.totalChargedAmount === donation.totalChargedAmount,
        'Stored donation totalChargedAmount should match returned donation'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: $25 monthly donation to country with highest malnutrition rate
  testTask2_MonthlyDonationHighestMalnutritionCountry() {
    const testName = 'Task 2: $25 monthly donation to highest malnutrition country';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && Array.isArray(home.impactHighlights), 'Home content should load');

      const donateConfig = this.logic.getDonatePageConfig();
      this.assert(donateConfig && donateConfig.currency, 'Donate page config should provide currency');
      const currency = donateConfig.currency;

      const countries = this.logic.getMonthlyDonationCountryOptions();
      this.assert(Array.isArray(countries) && countries.length > 0, 'Should return monthly donation country options');

      let selectedCountry = null;
      let maxRate = -Infinity;
      countries.forEach((c) => {
        if (c.isDonationTarget && typeof c.childMalnutritionRatePercent === 'number') {
          if (c.childMalnutritionRatePercent > maxRate) {
            maxRate = c.childMalnutritionRatePercent;
            selectedCountry = c;
          }
        }
      });
      this.assert(selectedCountry, 'Should select country with highest malnutrition rate');

      const amount = 25;
      const coverProcessingFees = false;
      const chargeDayOfMonth = 15;

      const preview = this.logic.previewDonationTotals(amount, coverProcessingFees, 'monthly', 'credit_debit_card');
      this.assert(preview && typeof preview.totalChargedAmount === 'number', 'Preview should return totals');
      this.assert(preview.amount === amount, 'Preview amount should match input');

      const donationResult = this.logic.submitDonation(
        'country_targeted',
        'monthly',
        amount,
        currency,
        null, // programId
        selectedCountry.id,
        coverProcessingFees,
        chargeDayOfMonth,
        true, // smsOptIn
        '555-123-4567',
        'credit_debit_card',
        'Monthly Donor',
        '4111111111111111',
        11,
        2029,
        '456',
        '500 Oak Ave',
        'Unit 2',
        'Centerville',
        'CA',
        '95014',
        'US',
        'Monthly Donor',
        'monthly.donor@example.com'
      );

      this.assert(donationResult && donationResult.success === true, 'Monthly donation submission should succeed');
      const donation = donationResult.donation;
      const schedule = donationResult.recurringSchedule;

      this.assert(donation && donation.id, 'Donation object should be returned');
      this.assert(schedule && schedule.id, 'Recurring schedule should be returned for monthly gift');

      this.assert(donation.countryId === selectedCountry.id, 'Donation.countryId should target selected country');
      this.assert(donation.frequency === 'monthly', 'Donation frequency should be monthly');
      this.assert(donation.donationType === 'country_targeted', 'Donation type should be country_targeted');
      this.assert(donation.processingFeeCovered === coverProcessingFees, 'processingFeeCovered should match input');

      this.assert(
        donation.totalChargedAmount === preview.totalChargedAmount,
        'Donation totalChargedAmount should match preview'
      );

      this.assert(schedule.countryId === selectedCountry.id, 'Schedule.countryId should match selected country');
      this.assert(schedule.amount === amount, 'Schedule amount should equal monthly amount');
      this.assert(schedule.frequency === 'monthly', 'Schedule frequency should be monthly');
      this.assert(schedule.chargeDayOfMonth === chargeDayOfMonth, 'Schedule charge day should be 15');
      this.assert(schedule.smsOptIn === true, 'Schedule.smsOptIn should be true');
      this.assert(schedule.smsPhoneNumber === '555-123-4567', 'Schedule.smsPhoneNumber should match input');

      const storedDonations = JSON.parse(localStorage.getItem('donations') || '[]');
      const storedDonation = storedDonations.find((d) => d.id === donation.id);
      this.assert(storedDonation, 'Stored donation should exist');

      const storedSchedules = JSON.parse(localStorage.getItem('recurring_donation_schedules') || '[]');
      const storedSchedule = storedSchedules.find((s) => s.id === schedule.id);
      this.assert(storedSchedule, 'Stored recurring schedule should exist');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Register for earliest high-need Saturday volunteer event within 20 miles of 94103 next month
  testTask3_VolunteerHighNeedSaturdayNextMonth() {
    const testName = 'Task 3: Register for earliest high-need Saturday volunteer event next month';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && Array.isArray(home.urgentVolunteerOpportunities), 'Home should load with volunteer highlights');

      const filterOptions = this.logic.getVolunteerFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.distanceOptionsMiles), 'Volunteer filter options should load');

      const baselineDateStr = this.getBaselineDateString();
      const baseline = new Date(baselineDateStr + 'T00:00:00Z');
      const nextMonthStart = new Date(Date.UTC(baseline.getUTCFullYear(), baseline.getUTCMonth() + 1, 1));
      const nextMonthEnd = new Date(Date.UTC(baseline.getUTCFullYear(), baseline.getUTCMonth() + 2, 0));
      const nextMonthStartStr = this.formatDate(nextMonthStart);
      const nextMonthEndStr = this.formatDate(nextMonthEnd);

      const opportunities = this.logic.searchVolunteerOpportunities(
        '94103',
        20,
        nextMonthStartStr,
        nextMonthEndStr,
        'saturday',
        'high',
        'meal_packing',
        'date_asc'
      );

      this.assert(Array.isArray(opportunities) && opportunities.length > 0, 'Should find high-need Saturday opportunities next month');

      let selected = opportunities[0];
      opportunities.forEach((opp) => {
        const current = new Date(opp.startDateTime);
        const best = new Date(selected.startDateTime);
        if (current < best) {
          selected = opp;
        }
      });

      this.assert(selected.needLevel === 'high', 'Selected opportunity should be high need');

      const oppDetails = this.logic.getVolunteerOpportunityDetails(selected.id);
      this.assert(oppDetails && oppDetails.id === selected.id, 'Opportunity details should match selected id');

      const registrationResult = this.logic.registerForVolunteerOpportunity(
        oppDetails.id,
        1, // numAdultParticipants
        0, // numYouthParticipants
        'Volunteer Tester',
        'volunteer.tester@example.com',
        '415-555-0100',
        'Looking forward to helping pack meals.'
      );

      this.assert(registrationResult && registrationResult.success === true, 'Volunteer registration should succeed');
      const registration = registrationResult.registration;
      this.assert(registration && registration.id, 'Registration object with id should be returned');
      this.assert(
        registration.volunteerOpportunityId === oppDetails.id,
        'Registration.volunteerOpportunityId should match opportunity id'
      );
      this.assert(registration.numAdultParticipants === 1, 'Registration should have 1 adult participant');

      const storedRegs = JSON.parse(localStorage.getItem('volunteer_registrations') || '[]');
      const storedReg = storedRegs.find((r) => r.id === registration.id);
      this.assert(storedReg, 'Stored volunteer registration should exist');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Start $39/month sponsorship for longest-waiting child aged 6–10 in Central America
  testTask4_ChildSponsorshipLongestWaitingCentralAmerica() {
    const testName = 'Task 4: Start $39/month sponsorship for longest-waiting child 6-10 in Central America';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && Array.isArray(home.primaryCtas), 'Home content should load');

      const filterOptions = this.logic.getChildSponsorshipFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.regions), 'Child sponsorship filter options should load');

      const centralAmerica = filterOptions.regions.find((r) => r.regionCode === 'central_america');
      this.assert(centralAmerica, 'Central America region should be available');

      const children = this.logic.searchChildrenForSponsorship(6, 10, centralAmerica.regionCode, undefined, 'longest_waiting');
      this.assert(Array.isArray(children) && children.length > 0, 'Should find children aged 6-10 in Central America');

      const selectedChild = children[0];
      this.assert(selectedChild.age >= 6 && selectedChild.age <= 10, 'Selected child age should be within 6-10');
      this.assert(selectedChild.isWaitingForSponsorship === true, 'Selected child should be waiting for sponsorship');

      const childProfile = this.logic.getChildProfile(selectedChild.id);
      this.assert(childProfile && childProfile.id === selectedChild.id, 'Child profile should match selected id');

      const amount = 39;
      const currency = 'USD';

      const sponsorshipResult = this.logic.startChildSponsorship(
        childProfile.id,
        amount,
        currency,
        'Sponsoring Supporter',
        'sponsor.supporter@example.com',
        '555-777-1212',
        '900 Elm St',
        '',
        'Riverdale',
        'NY',
        '10471',
        'US',
        'credit_debit_card',
        'Sponsoring Supporter',
        '4111111111111111',
        10,
        2030,
        '789'
      );

      this.assert(sponsorshipResult && sponsorshipResult.success === true, 'Start sponsorship should succeed');
      const commitment = sponsorshipResult.sponsorshipCommitment;
      this.assert(commitment && commitment.id, 'SponsorshipCommitment with id should be returned');
      this.assert(commitment.childId === childProfile.id, 'Commitment.childId should match selected child');
      this.assert(commitment.amount === amount, 'Commitment amount should equal 39');
      this.assert(commitment.frequency === 'monthly', 'Commitment frequency should be monthly');

      const storedCommitments = JSON.parse(localStorage.getItem('sponsorship_commitments') || '[]');
      const storedCommitment = storedCommitments.find((c) => c.id === commitment.id);
      this.assert(storedCommitment, 'Stored sponsorship commitment should exist');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Register an adult and a child for earliest Family 5K run in Chicago in June
  testTask5_EventsFamily5KChicagoJune() {
    const testName = 'Task 5: Register adult and child for earliest Family 5K in Chicago in June';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && Array.isArray(home.upcomingRunWalkEvents), 'Home run/walk events should load');

      const eventFilters = this.logic.getEventFilterOptions();
      this.assert(eventFilters && Array.isArray(eventFilters.eventTypes), 'Event filter options should load');

      const baselineDateStr = this.getBaselineDateString();
      const year = parseInt(baselineDateStr.substring(0, 4), 10);
      const startDateStr = year + '-06-01';
      const endDateStr = year + '-06-30';

      const events = this.logic.searchFundraisingEvents(
        'run_walk',
        'Chicago',
        startDateStr,
        endDateStr,
        undefined,
        'date_asc'
      );

      this.assert(Array.isArray(events) && events.length > 0, 'Should find run/walk events in Chicago in June');

      const familyEvents = events.filter((e) => typeof e.title === 'string' && e.title.toLowerCase().includes('family 5k'));
      this.assert(familyEvents.length > 0, 'Should find Family 5K events in June');

      let selectedEvent = familyEvents[0];
      familyEvents.forEach((ev) => {
        const cur = new Date(ev.eventDate);
        const best = new Date(selectedEvent.eventDate);
        if (cur < best) {
          selectedEvent = ev;
        }
      });

      const eventDetails = this.logic.getFundraisingEventDetails(selectedEvent.id);
      this.assert(eventDetails && eventDetails.id === selectedEvent.id, 'Event details should match selected id');

      let selectedStartTime = eventDetails.earliestStartTime;
      if (!selectedStartTime && Array.isArray(eventDetails.startTimeOptions) && eventDetails.startTimeOptions.length > 0) {
        const optionsSorted = eventDetails.startTimeOptions.slice().sort();
        selectedStartTime = optionsSorted[0];
      }
      this.assert(selectedStartTime, 'Should determine earliest start time option');

      const participants = [
        {
          fullName: 'Adult Runner',
          age: 35,
          participantType: 'adult',
          emergencyContactName: 'Emergency Contact A',
          emergencyContactPhone: '312-555-0200'
        },
        {
          fullName: 'Child Runner',
          age: 10,
          participantType: 'child',
          emergencyContactName: 'Emergency Contact B',
          emergencyContactPhone: '312-555-0201'
        }
      ];

      const registrationResult = this.logic.registerForFundraisingEvent(
        eventDetails.id,
        selectedStartTime,
        'Primary Contact',
        'primary.contact@example.com',
        '312-555-0101',
        participants
      );

      this.assert(registrationResult && registrationResult.success === true, 'Event registration should succeed');
      const registration = registrationResult.registration;
      const returnedParticipants = registrationResult.participants;

      this.assert(registration && registration.id, 'EventRegistration with id should be returned');
      this.assert(registration.fundraisingEventId === eventDetails.id, 'Registration.fundraisingEventId should match event id');
      this.assert(registration.selectedStartTime === selectedStartTime, 'Registration.selectedStartTime should match chosen time');
      this.assert(registration.totalParticipants === participants.length, 'totalParticipants should equal number of participants');

      this.assert(Array.isArray(returnedParticipants) && returnedParticipants.length === participants.length, 'Returned participants length should match input');
      const adultCount = returnedParticipants.filter((p) => p.participantType === 'adult').length;
      const childCount = returnedParticipants.filter((p) => p.participantType === 'child').length;
      this.assert(adultCount === 1, 'Should have 1 adult participant');
      this.assert(childCount === 1, 'Should have 1 child participant');

      const storedRegs = JSON.parse(localStorage.getItem('event_registrations') || '[]');
      const storedReg = storedRegs.find((r) => r.id === registration.id);
      this.assert(storedReg, 'Stored event registration should exist');

      const storedParticipants = JSON.parse(localStorage.getItem('event_participants') || '[]');
      const storedForReg = storedParticipants.filter((p) => p.eventRegistrationId === registration.id);
      this.assert(storedForReg.length === participants.length, 'Stored event participants should match registration participants');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Create personal 'Summer Meals 2025' fundraiser with $500 goal and copy link
  testTask6_CreatePersonalFundraiserSummerMeals2025() {
    const testName = 'Task 6: Create personal Summer Meals 2025 fundraiser and copy link';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && Array.isArray(home.featuredCampaigns), 'Home campaigns should load');

      const campaigns = this.logic.getFundraisingCampaignsList();
      this.assert(Array.isArray(campaigns) && campaigns.length > 0, 'Fundraising campaigns list should load');

      let summerMealsCampaign = campaigns.find((c) => c.slug === 'summer-meals-2025');
      if (!summerMealsCampaign) {
        summerMealsCampaign = campaigns.find((c) => c.name === 'Summer Meals 2025');
      }
      this.assert(summerMealsCampaign, 'Summer Meals 2025 campaign should be available');

      const campaignDetails = this.logic.getFundraisingCampaignDetails(summerMealsCampaign.id, undefined);
      this.assert(campaignDetails && campaignDetails.id === summerMealsCampaign.id, 'Campaign details should match selected campaign');

      const goalAmount = 500;
      const title = "Alex's Summer Meals Fundraiser";
      const story =
        'This summer, too many children will face days without enough to eat when school cafeterias are closed. ' +
        'I am raising funds so kids in our community can rely on healthy meals, even during school breaks. ' +
        'Your support will help provide consistent nutrition, reduce stress for families, and give children the energy they need to learn, play, and grow.';
      const customUrlSlug = 'alex-summer-meals-500';

      const createResult = this.logic.createPersonalFundraisingPage(
        campaignDetails.id,
        title,
        story,
        goalAmount,
        customUrlSlug,
        false
      );

      this.assert(createResult && createResult.success === true, 'Personal fundraising page creation should succeed');
      const page = createResult.personalFundraisingPage;
      this.assert(page && page.id, 'PersonalFundraisingPage with id should be returned');
      this.assert(page.campaignId === campaignDetails.id, 'Page.campaignId should match campaign');
      this.assert(page.goalAmount === goalAmount, 'Page.goalAmount should equal 500');
      this.assert(page.customUrlSlug === customUrlSlug, 'Page.customUrlSlug should match requested slug');

      const copyResult = this.logic.copyPersonalFundraisingPageLink(page.id);
      this.assert(copyResult && copyResult.success === true, 'Copy link should succeed');
      this.assert(typeof copyResult.fullUrl === 'string' && copyResult.fullUrl.length > 0, 'Copy result should include fullUrl');
      this.assert(typeof copyResult.lastLinkCopiedAt === 'string', 'copyPersonalFundraisingPageLink should return lastLinkCopiedAt timestamp');

      const storedPages = JSON.parse(localStorage.getItem('personal_fundraising_pages') || '[]');
      const storedPage = storedPages.find((p) => p.id === page.id);
      this.assert(storedPage, 'Stored personal fundraising page should exist');
      this.assert(
        storedPage.lastLinkCopiedAt === copyResult.lastLinkCopiedAt,
        'Stored page.lastLinkCopiedAt should match returned timestamp'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Request postal + email info kit for African program serving at least 50,000 children
  testTask7_RequestInfoKitAfricanProgram50000Plus() {
    const testName = 'Task 7: Request info kit for African program serving 50,000+ children';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home.missionSummary === 'string', 'Home content should load');

      const overview = this.logic.getProgramsOverviewContent();
      this.assert(overview && typeof overview.overviewText === 'string', 'Programs overview content should load');

      const filterOptions = this.logic.getProgramFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.regions), 'Program filter options should load');

      const africaRegion = filterOptions.regions.find((r) => r.regionCode === 'africa');
      this.assert(africaRegion, 'Africa region should be available');

      // Adaptation: filter by Africa and minChildrenServed >= 50000, regardless of programType
      const programs = this.logic.searchPrograms(undefined, 'africa', 50000, undefined);
      this.assert(Array.isArray(programs) && programs.length > 0, 'Should find at least one African program serving 50,000+ children');

      const selectedProgram = programs[0];
      const programDetails = this.logic.getProgramDetails(selectedProgram.id);
      this.assert(programDetails && programDetails.id === selectedProgram.id, 'Program details should match selected program');

      const requestResult = this.logic.requestProgramInfoKit(
        programDetails.id,
        'postal_mail_plus_email',
        'Info Kit Requester',
        'info.requester@example.com',
        '100 Pine St',
        'Suite 500',
        'Metropolis',
        'NY',
        '10001',
        'US'
      );

      this.assert(requestResult && requestResult.success === true, 'Info kit request should succeed');
      const infoKitRequest = requestResult.infoKitRequest;
      this.assert(infoKitRequest && infoKitRequest.id, 'InfoKitRequest with id should be returned');
      this.assert(infoKitRequest.programId === programDetails.id, 'InfoKitRequest.programId should match selected program');
      this.assert(infoKitRequest.deliveryMethod === 'postal_mail_plus_email', 'Delivery method should be postal_mail_plus_email');

      const storedRequests = JSON.parse(localStorage.getItem('info_kit_requests') || '[]');
      const storedRequest = storedRequests.find((r) => r.id === infoKitRequest.id);
      this.assert(storedRequest, 'Stored info kit request should exist');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Send advocacy letter on school breakfast funding to reps for ZIP 10001 with custom text and both delivery options
  testTask8_SendAdvocacyLetterSchoolBreakfastZIP10001() {
    const testName = 'Task 8: Send advocacy letter on school breakfast funding for ZIP 10001';
    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home.missionSummary === 'string', 'Home content should load');

      const advocacyOverview = this.logic.getAdvocacyOverviewContent();
      this.assert(advocacyOverview && typeof advocacyOverview.overviewText === 'string', 'Advocacy overview content should load');

      const topics = this.logic.getAdvocacyTopics();
      this.assert(Array.isArray(topics) && topics.length > 0, 'Advocacy topics should load');

      const topic = topics.find((t) => t.topicCode === 'increase_school_breakfast_funding');
      this.assert(topic, 'Increase school breakfast funding topic should be available');

      const template = this.logic.getAdvocacyLetterTemplate(topic.id);
      this.assert(template && typeof template.bodyText === 'string', 'Letter template should load');

      const customText =
        'As a community member, I have seen firsthand how students struggle when they arrive at school hungry. ' +
        'Children cannot concentrate, participate fully in class, or grow into healthy adults without reliable access to breakfast.';

      const fullBodyText = template.bodyText + '\n\n' + customText;

      const reps = this.logic.lookupRepresentativesByZip('10001');
      this.assert(Array.isArray(reps) && reps.length > 0, 'ZIP lookup should return representatives');
      const recipientIds = reps.map((r) => r.id);

      const sendResult = this.logic.sendAdvocacyLetter(
        topic.id,
        '10001',
        fullBodyText,
        customText,
        true,
        true,
        'Advocate Sender',
        'advocate.sender@example.com',
        '200 Maple St',
        '',
        'New York',
        'NY',
        '10001',
        recipientIds
      );

      this.assert(sendResult && sendResult.success === true, 'Advocacy letter send should succeed');
      const letter = sendResult.advocacyLetter;
      this.assert(letter && letter.id, 'AdvocacyLetter with id should be returned');
      this.assert(letter.zipCode === '10001', 'Letter.zipCode should be 10001');
      this.assert(letter.topicId === topic.id, 'Letter.topicId should match selected topic');
      this.assert(letter.sendEmailThroughSite === true, 'Letter.sendEmailThroughSite should be true');
      this.assert(letter.generatePrintReadyPdf === true, 'Letter.generatePrintReadyPdf should be true');
      this.assert(Array.isArray(letter.recipientIds) && letter.recipientIds.length === recipientIds.length, 'Letter.recipientIds should match recipients');

      const storedLetters = JSON.parse(localStorage.getItem('advocacy_letters') || '[]');
      const storedLetter = storedLetters.find((l) => l.id === letter.id);
      this.assert(storedLetter, 'Stored advocacy letter should exist');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

module.exports = TestRunner;
