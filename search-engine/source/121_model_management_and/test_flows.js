// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear storage and seed with generated data
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
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      subscription_plans: [
        {
          id: 'ts_basic_local',
          name: 'Basic Talent Scouting  Local',
          plan_code: 'TS_BASIC_LOCAL',
          description: 'Entry-level talent scouting plan for local searches and occasional bookings.',
          plan_type: 'talent_scouting',
          plan_tier: 'basic',
          price_monthly: 49,
          price_annual: 499,
          currency: 'USD',
          supports_monthly_billing: true,
          supports_annual_billing: true,
          is_active: true,
          features: [
            'Search and view up to 200 talent profiles per month',
            'Basic filters: location, category, gender, age',
            'Create and manage 2 favorites lists',
            'Shortlist up to 25 talents per list',
            'In-site messaging with up to 20 talents per month'
          ]
        },
        {
          id: 'ts_basic_plus',
          name: 'Basic Talent Scouting  Plus',
          plan_code: 'TS_BASIC_PLUS',
          description: 'Enhanced basic plan for small agencies needing more outreach capacity.',
          plan_type: 'talent_scouting',
          plan_tier: 'basic',
          price_monthly: 79,
          price_annual: 799,
          currency: 'USD',
          supports_monthly_billing: true,
          supports_annual_billing: true,
          is_active: true,
          features: [
            'Search and view up to 500 talent profiles per month',
            'Advanced filters including rating and hourly rate',
            'Create and manage 5 favorites lists',
            'Shortlist up to 50 talents per list',
            'Unlimited in-site messaging',
            'Export shortlisted talent as CSV'
          ]
        },
        {
          id: 'ts_standard',
          name: 'Standard Talent Scouting',
          plan_code: 'TS_STANDARD',
          description: 'For casting directors and brands running recurring campaigns.',
          plan_type: 'talent_scouting',
          plan_tier: 'standard',
          price_monthly: 129,
          price_annual: 1290,
          currency: 'USD',
          supports_monthly_billing: true,
          supports_annual_billing: true,
          is_active: true,
          features: [
            'Unlimited profile views',
            'Full filter access including social reach and language',
            'Create and manage 20 favorites lists',
            'Collaborative shortlists with team comments',
            'Priority support',
            'Basic analytics on casting performance'
          ]
        }
      ],
      talent_lists: [
        {
          id: 'shortlist_default',
          name: 'Shortlist',
          list_type: 'shortlist',
          description: 'Default shortlist for saving models and actors you are considering.',
          is_default: true,
          created_at: '2026-01-10T14:25:00Z'
        },
        {
          id: 'favorites_general',
          name: 'General Favorites',
          list_type: 'favorites_list',
          description: 'Mixed favorites list for frequently booked talent.',
          is_default: false,
          created_at: '2026-01-15T09:10:00Z'
        },
        {
          id: 'favorites_miami_campaigns',
          name: 'Miami Campaigns',
          list_type: 'favorites_list',
          description: 'Go-to Miami-based talent for seasonal and resort campaigns.',
          is_default: false,
          created_at: '2026-02-01T18:45:00Z'
        }
      ],
      talent_reviews: [],
      talent_profiles: [
        {
          id: 'talent_ny_fashion_amelia_chen',
          full_name: 'Amelia Chen',
          display_name: 'Amelia C.',
          gender: 'female',
          talent_role: 'model',
          primary_category: 'Fashion Model',
          categories: [
            'Runway',
            'Editorial',
            'Commercial Model'
          ],
          location_city: 'New York',
          location_state: 'NY',
          location_country: 'USA',
          location_display: 'New York, NY',
          age: 26,
          date_of_birth: '1999-01-18T00:00:00Z',
          languages: [
            'English',
            'Mandarin'
          ],
          experience_level: 'advanced',
          bio: 'New York-based fashion model with a strong runway and editorial background, experienced in major fashion weeks and lookbook campaigns.',
          hourly_rate: 140,
          currency: 'USD',
          instagram_followers: 120000,
          social_reach_total: 180000,
          profile_photo: 'https://www.followmeaway.com/wp-content/uploads/2020/08/New-York-in-Winter-Fashion.jpg',
          portfolio_photos: [
            'https://picsum.photos/800/600?random=201',
            'https://picsum.photos/800/600?random=202',
            'https://picsum.photos/800/600?random=203',
            'https://picsum.photos/800/600?random=204'
          ],
          is_featured: true,
          profile_status: 'active',
          created_at: '2025-06-10T12:00:00Z',
          updated_at: '2026-02-20T09:30:00Z',
          rating_count: 0,
          rating_overall: 0.0
        },
        {
          id: 'talent_ny_fashion_sofia_martinez',
          full_name: 'Sofia Martinez',
          display_name: 'Sofia M.',
          gender: 'female',
          talent_role: 'model',
          primary_category: 'Fashion Model',
          categories: [
            'Commercial Model',
            'Lifestyle',
            'Beauty'
          ],
          location_city: 'New York',
          location_state: 'NY',
          location_country: 'USA',
          location_display: 'New York, NY',
          age: 24,
          date_of_birth: '2001-04-05T00:00:00Z',
          languages: [
            'English',
            'Spanish'
          ],
          experience_level: 'intermediate',
          bio: 'Versatile fashion and lifestyle model specializing in e-commerce, catalog, and beauty campaigns for emerging and established brands.',
          hourly_rate: 120,
          currency: 'USD',
          instagram_followers: 80000,
          social_reach_total: 95000,
          profile_photo: 'https://www.pageantplanet.com/images/uploaded/products/4892/396401626832093.jpg',
          portfolio_photos: [
            'https://picsum.photos/800/600?random=205',
            'https://picsum.photos/800/600?random=206',
            'https://picsum.photos/800/600?random=207'
          ],
          is_featured: true,
          profile_status: 'active',
          created_at: '2025-07-22T15:10:00Z',
          updated_at: '2026-02-18T11:45:00Z',
          rating_count: 0,
          rating_overall: 0.0
        },
        {
          id: 'talent_ny_fashion_elena_rossi',
          full_name: 'Elena Rossi',
          display_name: 'Elena R.',
          gender: 'female',
          talent_role: 'model',
          primary_category: 'Fashion Model',
          categories: [
            'Runway',
            'High Fashion'
          ],
          location_city: 'New York',
          location_state: 'NY',
          location_country: 'USA',
          location_display: 'New York, NY',
          age: 28,
          date_of_birth: '1997-02-12T00:00:00Z',
          languages: [
            'English',
            'Italian'
          ],
          experience_level: 'expert',
          bio: 'High-fashion runway model with international agency representation and campaigns for luxury brands.',
          hourly_rate: 180,
          currency: 'USD',
          instagram_followers: 150000,
          social_reach_total: 210000,
          profile_photo: 'https://asset1.modelmanagement.com/mm-eyJ0Ijp7InIiOnsibCI6/IjU1MSJ9LCJ3Ijp7InR4/IjoiRWxlbmEgIEtyYXV6/ZVxubW9kZWxtYW5hZ2Vt/ZW50LmNvbVwvbW9kZWxc/L2VsZW5hLWtyYXV6ZSIsInR4byI6eyJsIjoiNTUx/IiwiaCI6IjcxMCJ9fSwi/MCI6eyJ3Ijp7ImxnIjoi/MSIsImxnaCI6IjE4OSIs/ImxnZyI6ImYifX19LCJp/ZCI6ImkxODAwODA5Iiwi/ZiI6ImpwZyJ9.jpg',
          portfolio_photos: [
            'https://picsum.photos/800/600?random=208',
            'https://picsum.photos/800/600?random=209',
            'https://picsum.photos/800/600?random=210'
          ],
          is_featured: true,
          profile_status: 'active',
          created_at: '2024-11-03T10:00:00Z',
          updated_at: '2026-01-25T16:20:00Z',
          rating_count: 0,
          rating_overall: 0.0
        }
      ],
      talent_availability_slots: [
        {
          id: 'avail_amelia_2026_09_10',
          talent_id: 'talent_ny_fashion_amelia_chen',
          date: '2026-09-10T00:00:00Z',
          is_available: true,
          created_at: '2026-02-15T10:00:00Z'
        },
        {
          id: 'avail_amelia_2026_09_09',
          talent_id: 'talent_ny_fashion_amelia_chen',
          date: '2026-09-09T00:00:00Z',
          is_available: false,
          created_at: '2026-02-15T10:02:00Z'
        },
        {
          id: 'avail_amelia_2026_12_01',
          talent_id: 'talent_ny_fashion_amelia_chen',
          date: '2026-12-01T00:00:00Z',
          is_available: true,
          created_at: '2026-02-15T10:05:00Z'
        }
      ],
      talent_list_items: [
        {
          id: 'tli_shortlist_amelia',
          list_id: 'shortlist_default',
          talent_id: 'talent_ny_fashion_amelia_chen',
          added_at: '2026-02-22T14:00:00Z',
          selected_date: '2026-09-10T00:00:00Z',
          notes: 'Shortlisted for NYC fashion campaign on Sept 10, 2026.'
        },
        {
          id: 'tli_shortlist_sofia',
          list_id: 'shortlist_default',
          talent_id: 'talent_ny_fashion_sofia_martinez',
          added_at: '2026-02-22T14:05:00Z',
          selected_date: null,
          notes: 'Backup option for upcoming New York fashion shoots.'
        },
        {
          id: 'tli_shortlist_harper',
          list_id: 'shortlist_default',
          talent_id: 'talent_la_fashion_harper_nguyen',
          added_at: '2026-02-23T09:20:00Z',
          selected_date: null,
          notes: 'Consider for LA-based editorial campaign.'
        }
      ],
      events: [
        {
          id: 'event_ny_intro_modeling_2026_06_20',
          title: 'Intro to Modeling: New Faces Bootcamp',
          description: 'A one-day intensive for aspiring models covering posing, walking, and working with photographers. Ideal for beginners building their first portfolio.',
          event_type: 'workshop',
          category: 'Intro to Modeling',
          location_city: 'New York',
          location_state: 'NY',
          location_country: 'USA',
          location_display: 'New York, NY',
          venue_name: 'Midtown Studio Loft',
          start_datetime: '2026-06-20T10:00:00Z',
          end_datetime: '2026-06-20T16:00:00Z',
          capacity_total: 25,
          price_per_seat: 95,
          currency: 'USD',
          payment_options: [
            'card_online',
            'pay_on_site'
          ],
          is_published: true,
          created_at: '2026-02-01T09:00:00Z',
          capacity_remaining: 24
        },
        {
          id: 'event_ny_intro_modeling_2026_08_10',
          title: 'Intro to Modeling: Foundations Workshop',
          description: 'Learn the fundamentals of professional modeling, including runway basics, posing for e-commerce, and working with casting directors. Includes mini test shoot with a staff photographer.',
          event_type: 'workshop',
          category: 'Intro to Modeling',
          location_city: 'New York',
          location_state: 'NY',
          location_country: 'USA',
          location_display: 'New York, NY',
          venue_name: 'Chelsea Creative Studios',
          start_datetime: '2026-08-10T10:00:00Z',
          end_datetime: '2026-08-10T16:00:00Z',
          capacity_total: 30,
          price_per_seat: 120,
          currency: 'USD',
          payment_options: [
            'card_online',
            'pay_on_site',
            'pay_at_event'
          ],
          is_published: true,
          created_at: '2026-03-01T12:00:00Z',
          capacity_remaining: 27
        },
        {
          id: 'event_ny_intro_modeling_2026_09_15',
          title: 'Intro to Modeling: Runway & Print Intensive',
          description: 'Intermediate-level workshop focusing on runway walk refinement, expression for beauty and fashion print, and agency expectations. Includes feedback from a guest casting director.',
          event_type: 'workshop',
          category: 'Intro to Modeling',
          location_city: 'New York',
          location_state: 'NY',
          location_country: 'USA',
          location_display: 'New York, NY',
          venue_name: 'SoHo Fashion Lab',
          start_datetime: '2026-09-15T11:00:00Z',
          end_datetime: '2026-09-15T17:30:00Z',
          capacity_total: 35,
          price_per_seat: 145,
          currency: 'USD',
          payment_options: [
            'card_online',
            'pay_on_site'
          ],
          is_published: true,
          created_at: '2026-03-02T10:30:00Z',
          capacity_remaining: 35
        }
      ],
      event_registrations: [
        {
          id: 'reg_ny_intro_2026_06_20_001',
          event_id: 'event_ny_intro_modeling_2026_06_20',
          seats_reserved: 1,
          payment_option: 'pay_online',
          currency: 'USD',
          registered_at: '2026-02-05T10:15:00Z',
          status: 'confirmed',
          total_price: 95.0
        },
        {
          id: 'reg_ny_intro_2026_08_10_001',
          event_id: 'event_ny_intro_modeling_2026_08_10',
          seats_reserved: 3,
          payment_option: 'pay_on_site',
          currency: 'USD',
          registered_at: '2026-03-02T09:30:00Z',
          status: 'pending',
          total_price: 360.0
        },
        {
          id: 'reg_miami_test_2026_05_18_001',
          event_id: 'event_miami_summer_test_shoot_2026_05_18',
          seats_reserved: 2,
          payment_option: 'pay_online',
          currency: 'USD',
          registered_at: '2026-02-10T14:45:00Z',
          status: 'confirmed',
          total_price: 320.0
        }
      ]
    };

    // Copy all generated data into localStorage using correct storage keys
    localStorage.setItem('subscription_plans', JSON.stringify(generatedData.subscription_plans || []));
    localStorage.setItem('talent_lists', JSON.stringify(generatedData.talent_lists || []));
    localStorage.setItem('talent_reviews', JSON.stringify(generatedData.talent_reviews || []));
    localStorage.setItem('talent_profiles', JSON.stringify(generatedData.talent_profiles || []));
    localStorage.setItem('talent_availability_slots', JSON.stringify(generatedData.talent_availability_slots || []));
    localStorage.setItem('talent_list_items', JSON.stringify(generatedData.talent_list_items || []));
    localStorage.setItem('events', JSON.stringify(generatedData.events || []));
    localStorage.setItem('event_registrations', JSON.stringify(generatedData.event_registrations || []));

    // Ensure other storages exist as empty arrays
    const ensureArrayStorage = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    };
    ensureArrayStorage('casting_calls');
    ensureArrayStorage('booking_requests');
    ensureArrayStorage('messages');
    ensureArrayStorage('subscription_checkout_sessions');
    ensureArrayStorage('contact_inquiries');
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_ShortlistFashionModel();
    this.testTask2_PostCastingCallFitnessModels();
    this.testTask3_RegisterTalentAndSetAvailability();
    this.testTask4_BookMoreInfluentialModelWithinBudget();
    this.testTask5_CreateSummerCampaignFavoritesList();
    this.testTask6_MessageBilingualCommercialActors();
    this.testTask7_ChooseCheapestBasicSubscription();
    this.testTask8_RegisterSeatsForIntroToModelingWorkshop();

    return this.results;
  }

  // Task 1: Shortlist a female fashion model in New York under $150/hour for specific date
  testTask1_ShortlistFashionModel() {
    const testName = 'Task 1: Shortlist NY female fashion model under $150/hour';
    console.log('Testing:', testName);

    try {
      // Get filter options (simulates opening search page)
      const filters = this.logic.getTalentSearchFilters();
      this.assert(filters != null, 'Should get talent search filters');

      const location = 'New York, NY';
      const primaryCategory = 'Fashion Model';
      const gender = 'female';
      const maxRate = 150;
      const minRating = 0; // dataset has 0 ratings; still exercise parameter

      // Search talent with filters and sort by rating desc
      const searchResult = this.logic.searchTalent(
        undefined,          // query
        location,           // location
        primaryCategory,    // primary_category
        gender,             // gender
        undefined,          // min_age
        undefined,          // max_age
        undefined,          // languages_any
        undefined,          // languages_all
        undefined,          // min_hourly_rate
        maxRate,            // max_hourly_rate
        minRating,          // min_rating
        'rating_desc',      // sort_by
        1,                  // page
        20                  // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Search results should be an array');
      const candidates = searchResult.results;
      this.assert(candidates.length > 0, 'Should have at least one matching model');

      // Ensure all candidates match key filters
      candidates.forEach((t) => {
        this.assert(t.location_display === location, 'Talent location should match filter');
        this.assert(t.primary_category === primaryCategory, 'Talent primary category should match filter');
        this.assert(t.gender === gender, 'Talent gender should match filter');
        this.assert(t.hourly_rate <= maxRate, 'Talent rate should be <= max');
      });

      const targetDate = '2026-09-10';

      // Find first candidate that is available on the target date
      let selected = null;
      for (const talent of candidates) {
        const availability = this.logic.getTalentAvailability(
          talent.id,
          targetDate,
          targetDate
        );
        this.assert(Array.isArray(availability), 'Availability should be an array');
        const availableSlot = availability.find((slot) => slot.is_available === true);
        if (availableSlot) {
          selected = { talent, availableSlot };
          break;
        }
      }

      this.assert(selected != null, 'Should find a talent available on the target date');

      // Add selected model to default shortlist for that date
      const shortlistNote = 'Shortlisted for campaign on ' + targetDate;
      const addResult = this.logic.addTalentToShortlist(selected.talent.id, targetDate, shortlistNote);

      this.assert(addResult && addResult.success === true, 'addTalentToShortlist should succeed');
      this.assert(!!addResult.list_id, 'Should return a shortlist ID');
      this.assert(!!addResult.list_item_id, 'Should return a list item ID');

      const shortlistId = addResult.list_id;

      // Verify via API: getTalentListItems
      const listData = this.logic.getTalentListItems(shortlistId);
      this.assert(listData && listData.list, 'Should load shortlist details');
      this.assert(Array.isArray(listData.items), 'Shortlist items should be an array');

      const foundItem = listData.items.find((item) => item.talent && item.talent.id === selected.talent.id);
      this.assert(foundItem, 'Selected talent should be present in shortlist items');

      if (foundItem.list_item && foundItem.list_item.selected_date) {
        this.assert(
          foundItem.list_item.selected_date.startsWith(targetDate),
          'Shortlist item selected_date should include target date'
        );
      }

      // Verify relationship in raw storage
      const rawListItems = JSON.parse(localStorage.getItem('talent_list_items') || '[]');
      const storedItem = rawListItems.find((li) => li.id === addResult.list_item_id);
      this.assert(storedItem != null, 'Stored TalentListItem should exist for added item');
      this.assert(
        storedItem.list_id === shortlistId && storedItem.talent_id === selected.talent.id,
        'Stored list item should reference correct list and talent'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Post a casting call for 3 male fitness models in Los Angeles at $100/hour
  testTask2_PostCastingCallFitnessModels() {
    const testName = 'Task 2: Post casting call for 3 male fitness models in LA at $100/hour';
    console.log('Testing:', testName);

    try {
      const formOptions = this.logic.getCastingFormOptions();
      this.assert(formOptions != null, 'Should get casting form options');

      const title = 'Fitness Campaign Shoot';
      const locationDisplay = 'Los Angeles, CA';
      const talentCategory = 'Fitness Model';
      const talentRole = 'model';
      const gender = 'male';
      const numNeeded = 3;
      const rateType = 'per_hour';
      const rateAmount = 100;
      const currency = 'USD';
      const projectDate = '2026-10-05';
      const description = 'Seeking 3 male fitness models for a one-day brand campaign shoot';
      const visibility = 'public';
      const applicationDeadline = '2026-09-20';
      const creatorRole = 'client';
      const status = 'published';

      const createResult = this.logic.createCastingCall(
        title,
        locationDisplay,
        talentCategory,
        talentRole,
        gender,
        numNeeded,
        rateType,
        rateAmount,
        currency,
        projectDate,
        description,
        visibility,
        applicationDeadline,
        creatorRole,
        status
      );

      this.assert(createResult && createResult.casting_call, 'Casting call should be created');
      const casting = createResult.casting_call;
      this.assert(!!casting.id, 'Casting call should have an ID');

      // Verify persistence in storage
      const rawCastings = JSON.parse(localStorage.getItem('casting_calls') || '[]');
      const storedCasting = rawCastings.find((c) => c.id === casting.id);
      this.assert(storedCasting != null, 'Stored casting call should exist');
      this.assert(storedCasting.num_talent_needed === numNeeded, 'Stored casting num_talent_needed should match input');
      this.assert(storedCasting.rate_type === rateType, 'Stored casting rate_type should match input');
      this.assert(storedCasting.rate_amount === rateAmount, 'Stored casting rate_amount should match input');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Register as a new model and set availability for specific dates
  testTask3_RegisterTalentAndSetAvailability() {
    const testName = 'Task 3: Register new model and set availability';
    console.log('Testing:', testName);

    try {
      const signupOptions = this.logic.getTalentSignupOptions();
      this.assert(signupOptions != null, 'Should get talent signup options');

      const fullName = 'Alex Jordan';
      const displayName = 'Alex Jordan';
      const email = 'alex.jordan@example.com';
      const password = 'TestPass123!';
      const locationDisplay = 'Chicago, IL';
      const primaryCategory = 'Fashion Model';
      const talentRole = 'model';
      const experienceLevel = 'intermediate';
      const languages = ['English', 'Spanish'];
      const bio = 'Test profile for Alex Jordan';

      const registerResult = this.logic.registerTalentProfile(
        fullName,
        displayName,
        email,
        password,
        locationDisplay,
        primaryCategory,
        talentRole,
        experienceLevel,
        languages,
        bio
      );

      this.assert(registerResult && registerResult.success === true, 'registerTalentProfile should succeed');
      this.assert(registerResult.talent_profile, 'registerTalentProfile should return talent_profile');

      const talentProfile = registerResult.talent_profile;
      const talentId = talentProfile.id;
      this.assert(!!talentId, 'New talent profile should have an ID');

      // Verify profile persists via getMyTalentProfile
      const myProfileResult = this.logic.getMyTalentProfile();
      this.assert(myProfileResult && myProfileResult.exists === true, 'Current user should now have a talent profile');
      this.assert(myProfileResult.talent_profile.id === talentId, 'getMyTalentProfile should return the newly created profile');

      // Set availability for two specific dates
      const date1 = '2026-11-12';
      const date2 = '2026-11-13';

      const availabilityResult = this.logic.setMyTalentAvailability([
        { date: date1, is_available: true },
        { date: date2, is_available: true }
      ]);

      this.assert(availabilityResult && availabilityResult.success === true, 'setMyTalentAvailability should succeed');
      this.assert(Array.isArray(availabilityResult.updated_slots), 'updated_slots should be an array');

      const slots = availabilityResult.updated_slots;
      const slot1 = slots.find((s) => s.date && s.date.startsWith(date1));
      const slot2 = slots.find((s) => s.date && s.date.startsWith(date2));
      this.assert(slot1 && slot1.is_available === true, 'Date 1 should be marked available');
      this.assert(slot2 && slot2.is_available === true, 'Date 2 should be marked available');

      // Cross-check via getTalentAvailability using the newly created talent ID
      const fetchedSlots = this.logic.getTalentAvailability(talentId, date1, date2);
      this.assert(Array.isArray(fetchedSlots), 'getTalentAvailability should return an array');
      const f1 = fetchedSlots.find((s) => s.date && s.date.startsWith(date1));
      const f2 = fetchedSlots.find((s) => s.date && s.date.startsWith(date2));
      this.assert(f1 && f1.is_available === true, 'Fetched availability for date 1 should be available');
      this.assert(f2 && f2.is_available === true, 'Fetched availability for date 2 should be available');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Book the more socially influential model under a 4-hour budget of $600
  testTask4_BookMoreInfluentialModelWithinBudget() {
    const testName = 'Task 4: Book more socially influential model within 4h/$600 budget';
    console.log('Testing:', testName);

    try {
      // Get all talent lists and locate default shortlist
      const lists = this.logic.getTalentListsSummary();
      this.assert(Array.isArray(lists), 'getTalentListsSummary should return an array');

      const shortlist = lists.find((l) => l.is_default === true || l.list_type === 'shortlist');
      this.assert(shortlist != null, 'Default shortlist should exist');

      // Load shortlist items with talent summaries
      const listData = this.logic.getTalentListItems(shortlist.id);
      this.assert(listData && Array.isArray(listData.items), 'Shortlist items should be returned');

      // Filter talents whose hourly rate is <= 150
      const affordableItems = listData.items.filter((item) =>
        item.talent && typeof item.talent.hourly_rate === 'number' && item.talent.hourly_rate <= 150
      );

      this.assert(affordableItems.length >= 2, 'Need at least two shortlist talents with hourly rate <= 150');

      // Take first two affordable models
      const firstTwo = affordableItems.slice(0, 2);

      // Determine which has higher social reach
      const moreInfluentialItem = firstTwo.reduce((best, current) => {
        const bestReach = best.talent.social_reach_total || 0;
        const currentReach = current.talent.social_reach_total || 0;
        return currentReach > bestReach ? current : best;
      });

      const selectedTalent = moreInfluentialItem.talent;
      const selectedTalentId = selectedTalent.id;
      this.assert(!!selectedTalentId, 'Selected talent should have an ID');

      const bookingDate = '2026-12-01';
      const durationHours = 4;
      const budgetLimit = 600;

      // Get booking quote and ensure within budget
      const quote = this.logic.getBookingQuote(
        selectedTalentId,
        bookingDate,
        durationHours,
        budgetLimit
      );

      this.assert(quote != null, 'getBookingQuote should return a quote');
      this.assert(quote.talent_id === selectedTalentId, 'Quote should reference selected talent');
      this.assert(quote.duration_hours === durationHours, 'Quote duration should match requested hours');
      this.assert(typeof quote.total_cost === 'number', 'Quote total_cost should be a number');
      this.assert(quote.within_budget === true, 'Quote should be within the specified budget');
      this.assert(quote.total_cost <= budgetLimit, 'Quote total_cost should be <= budget limit');

      // Create booking request enforcing the same budget
      const notes = 'Booking for a 4-hour campaign shoot on ' + bookingDate;
      const bookingResult = this.logic.createBookingRequest(
        selectedTalentId,
        bookingDate,
        durationHours,
        budgetLimit,
        notes
      );

      this.assert(bookingResult && bookingResult.success === true, 'createBookingRequest should succeed');
      this.assert(bookingResult.booking, 'Booking object should be returned');
      const booking = bookingResult.booking;

      this.assert(booking.talent_id === selectedTalentId, 'Booking should reference selected talent');
      this.assert(booking.duration_hours === durationHours, 'Booking duration should match requested hours');
      this.assert(booking.total_cost <= budgetLimit, 'Booking total_cost should be <= budget limit');

      // Cross-check with quote using actual values (no hardcoded totals)
      this.assert(
        booking.hourly_rate_snapshot === quote.hourly_rate_snapshot,
        'Booking hourly_rate_snapshot should match quote'
      );
      this.assert(
        booking.total_cost === quote.total_cost,
        'Booking total_cost should match quote total_cost'
      );

      // Verify in raw storage
      const rawBookings = JSON.parse(localStorage.getItem('booking_requests') || '[]');
      const storedBooking = rawBookings.find((b) => b.id === booking.id);
      this.assert(storedBooking != null, 'Stored booking should exist');
      this.assert(storedBooking.talent_id === selectedTalentId, 'Stored booking should reference correct talent');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Create a 'Summer Campaign' favorites list with models aged 2030 (adapted to available data)
  testTask5_CreateSummerCampaignFavoritesList() {
    const testName = 'Task 5: Create "Summer Campaign" favorites list with age/location filters';
    console.log('Testing:', testName);

    try {
      const listName = 'Summer Campaign';
      const listDescription = 'Summer campaign favorites list';

      // Create the favorites list
      const createListResult = this.logic.createTalentList(listName, 'favorites_list', listDescription);
      this.assert(createListResult && createListResult.list, 'createTalentList should return the created list');
      const summerList = createListResult.list;
      const listId = summerList.id;
      this.assert(!!listId, 'New favorites list should have an ID');

      // We adapt location to New York, where generated talent exists
      const searchLocation = 'New York, NY';
      const minAge = 20;
      const maxAge = 30;

      // First, find female models in the age range and location
      const femaleGender = 'female';
      const femaleSearch = this.logic.searchTalent(
        undefined,          // query
        searchLocation,     // location
        undefined,          // primary_category (any)
        femaleGender,       // gender
        minAge,             // min_age
        maxAge,             // max_age
        undefined,          // languages_any
        undefined,          // languages_all
        undefined,          // min_hourly_rate
        undefined,          // max_hourly_rate
        undefined,          // min_rating
        'relevance',        // sort_by
        1,                  // page
        20                  // page_size
      );

      this.assert(Array.isArray(femaleSearch.results), 'Female search results should be an array');
      const femaleResults = femaleSearch.results;
      this.assert(femaleResults.length > 0, 'Should have at least one female model in NY 20-30');

      // Add up to two female models to the Summer Campaign list
      let addedCount = 0;
      const femalesToAdd = femaleResults.slice(0, 2);
      femalesToAdd.forEach((talent) => {
        const addResult = this.logic.addTalentToList(
          listId,
          talent.id,
          undefined,
          'Summer Campaign female talent'
        );
        this.assert(addResult && addResult.success === true, 'addTalentToList for female talent should succeed');
        this.assert(!!addResult.list_item_id, 'addTalentToList should return list_item_id');
        addedCount += 1;
      });

      // Attempt to search for male models in same age/location; may yield none in generated data
      const maleGender = 'male';
      const maleSearch = this.logic.searchTalent(
        undefined,          // query
        searchLocation,     // location
        undefined,          // primary_category
        maleGender,         // gender
        minAge,             // min_age
        maxAge,             // max_age
        undefined,          // languages_any
        undefined,          // languages_all
        undefined,          // min_hourly_rate
        undefined,          // max_hourly_rate
        undefined,          // min_rating
        'relevance',        // sort_by
        1,                  // page
        20                  // page_size
      );

      this.assert(Array.isArray(maleSearch.results), 'Male search results should be an array');
      const maleResults = maleSearch.results;

      if (maleResults.length > 0) {
        const malesToAdd = maleResults.slice(0, 2);
        malesToAdd.forEach((talent) => {
          const addResult = this.logic.addTalentToList(
            listId,
            talent.id,
            undefined,
            'Summer Campaign male talent'
          );
          this.assert(addResult && addResult.success === true, 'addTalentToList for male talent should succeed');
          this.assert(!!addResult.list_item_id, 'addTalentToList should return list_item_id');
          addedCount += 1;
        });
      }

      // Verify contents of the Summer Campaign list
      const listData = this.logic.getTalentListItems(listId);
      this.assert(listData && listData.list, 'Should load Summer Campaign list details');
      this.assert(listData.list.name === listName, 'List name should match created name');
      this.assert(Array.isArray(listData.items), 'List items should be an array');

      const items = listData.items;
      this.assert(items.length === addedCount, 'List item count should equal number of added talents');

      let femaleCount = 0;
      let maleCount = 0;

      items.forEach((item) => {
        const t = item.talent;
        this.assert(t.location_display === searchLocation, 'Talent location should match filter location');
        this.assert(
          typeof t.age === 'number' && t.age >= minAge && t.age <= maxAge,
          'Talent age should be within requested range'
        );
        if (t.gender === 'female') femaleCount += 1;
        if (t.gender === 'male') maleCount += 1;
      });

      // We log gender distribution rather than asserting exact 2/2 due to limited generated data
      console.log('Summer Campaign list gender counts:', { femaleCount, maleCount });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Message the first 3 bilingual commercial actors in Los Angeles (adapted; create talents via API)
  testTask6_MessageBilingualCommercialActors() {
    const testName = 'Task 6: Message first 3 bilingual commercial actors in Los Angeles';
    console.log('Testing:', testName);

    try {
      const locationDisplay = 'Los Angeles, CA';
      const primaryCategory = 'Commercial Actor';
      const languagesAll = ['English', 'Spanish'];

      // Create 3 bilingual commercial actor profiles in LA via registerTalentProfile
      const createdTalentIds = [];
      for (let i = 1; i <= 3; i += 1) {
        const fullName = 'LA Bilingual Actor ' + i;
        const displayName = fullName;
        const email = 'la.actor' + i + '@example.com';
        const password = 'TestPass123!';
        const experienceLevel = 'intermediate';
        const bio = 'Auto-generated bilingual commercial actor profile ' + i;

        const registerResult = this.logic.registerTalentProfile(
          fullName,
          displayName,
          email,
          password,
          locationDisplay,
          primaryCategory,
          'actor',
          experienceLevel,
          languagesAll,
          bio
        );

        this.assert(registerResult && registerResult.success === true, 'registerTalentProfile for actor should succeed');
        this.assert(registerResult.talent_profile, 'registerTalentProfile should return talent_profile');
        createdTalentIds.push(registerResult.talent_profile.id);
      }

      // Search for bilingual commercial actors in LA (rating filter adapted to 0+ because dataset has no ratings)
      const searchResult = this.logic.searchTalent(
        undefined,          // query
        locationDisplay,    // location
        primaryCategory,    // primary_category
        undefined,          // gender (any)
        undefined,          // min_age
        undefined,          // max_age
        undefined,          // languages_any
        languagesAll,       // languages_all
        undefined,          // min_hourly_rate
        undefined,          // max_hourly_rate
        0,                  // min_rating
        'relevance',        // sort_by
        1,                  // page
        10                  // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Search results should be an array');
      const actors = searchResult.results;

      // Ensure that at least 3 actors were found (the ones we created)
      this.assert(actors.length >= 3, 'Should find at least 3 bilingual commercial actors in LA');

      const firstThree = actors.slice(0, 3);
      const recipientIds = firstThree.map((t) => t.id);

      // Send single casting inquiry message to these three actors
      const subject = 'Bilingual Commercial Casting Inquiry';
      const body = 'Casting for a bilingual commercial shoot in LA next month';

      const sendResult = this.logic.sendMessageToTalents(
        subject,
        body,
        recipientIds,
        undefined,
        undefined,
        undefined
      );

      this.assert(sendResult && sendResult.success === true, 'sendMessageToTalents should succeed');
      this.assert(!!sendResult.message_id, 'sendMessageToTalents should return message_id');

      // Verify message stored and recipients match
      const rawMessages = JSON.parse(localStorage.getItem('messages') || '[]');
      const storedMessage = rawMessages.find((m) => m.id === sendResult.message_id);
      this.assert(storedMessage != null, 'Stored message should exist');
      this.assert(Array.isArray(storedMessage.recipient_talent_ids), 'Message recipient_talent_ids should be an array');
      this.assert(
        storedMessage.recipient_talent_ids.length === recipientIds.length,
        'Stored message should have same number of recipients as requested'
      );

      // All requested recipients should be included
      recipientIds.forEach((id) => {
        this.assert(
          storedMessage.recipient_talent_ids.indexOf(id) !== -1,
          'Stored message should include recipient ' + id
        );
      });

      // Optionally verify via getMessages in sent folder
      const sentMessages = this.logic.getMessages('sent', 20, 0);
      this.assert(Array.isArray(sentMessages), 'getMessages should return an array');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Choose the cheapest monthly 'Basic' talent scouting subscription under $100 and proceed to review
  testTask7_ChooseCheapestBasicSubscription() {
    const testName = 'Task 7: Choose cheapest monthly Basic talent scouting subscription under $100 and proceed to review';
    console.log('Testing:', testName);

    try {
      const planType = 'talent_scouting';
      const planTier = 'basic';
      const billingFrequency = 'monthly';
      const priceMaxMonthly = 100;

      // Get filtered subscription plans
      const plans = this.logic.getSubscriptionPlans(
        planType,
        planTier,
        billingFrequency,
        priceMaxMonthly
      );

      this.assert(Array.isArray(plans), 'getSubscriptionPlans should return an array');
      const eligiblePlans = plans.filter((p) =>
        p.plan_type === planType &&
        p.plan_tier === planTier &&
        p.supports_monthly_billing === true &&
        typeof p.price_monthly === 'number' &&
        p.price_monthly < priceMaxMonthly &&
        p.is_active === true
      );

      this.assert(eligiblePlans.length > 0, 'Should have at least one eligible Basic monthly plan under price limit');

      // Choose plan with lowest monthly price among eligible
      const selectedPlan = eligiblePlans.reduce((best, current) => {
        return current.price_monthly < best.price_monthly ? current : best;
      });

      const planId = selectedPlan.id;
      this.assert(!!planId, 'Selected plan should have an ID');

      // Start subscription checkout session
      const checkoutStart = this.logic.startSubscriptionCheckoutSession(planId, billingFrequency);
      this.assert(checkoutStart && checkoutStart.checkoutId, 'startSubscriptionCheckoutSession should return checkoutId');
      const checkoutId = checkoutStart.checkoutId;

      // Update billing information
      const contactEmail = 'billing@example.com';
      const companyName = 'Test Casting Co';
      const billingAddressLine1 = '123 Test St';
      const billingCity = 'Test City';
      const billingState = 'CA';
      const billingPostalCode = '90001';
      const billingCountry = 'USA';

      const billingUpdate = this.logic.updateSubscriptionCheckoutBilling(
        checkoutId,
        companyName,
        contactEmail,
        billingAddressLine1,
        undefined,            // billing_address_line2
        billingCity,
        billingState,
        billingPostalCode,
        billingCountry
      );

      this.assert(billingUpdate && billingUpdate.success === true, 'updateSubscriptionCheckoutBilling should succeed');
      this.assert(billingUpdate.checkoutId === checkoutId, 'Billing update should reference same checkoutId');

      // Proceed to review step and verify summary
      const review = this.logic.proceedSubscriptionCheckoutToReview(checkoutId);
      this.assert(review && review.checkoutId === checkoutId, 'Review response should reference same checkoutId');
      this.assert(review.status === 'review', 'Checkout status should be moved to review');
      this.assert(review.summary && review.summary.plan, 'Review summary should include plan');

      const summaryPlan = review.summary.plan;
      this.assert(summaryPlan.id === planId, 'Summary plan ID should match selected plan');
      this.assert(
        review.summary.price_per_interval === selectedPlan.price_monthly,
        'Summary price_per_interval should equal selected plan monthly price'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Register 2 seats for the next 'Intro to Modeling' workshop in New York after August 1, 2026 with pay-on-site
  testTask8_RegisterSeatsForIntroToModelingWorkshop() {
    const testName = 'Task 8: Register 2 seats for next Intro to Modeling workshop in New York after 2026-08-01 with pay-on-site';
    console.log('Testing:', testName);

    try {
      const locationDisplay = 'New York, NY';
      const eventType = 'workshop';
      const titleQuery = 'Intro to Modeling';
      const startDateFilter = '2026-08-02'; // strictly after August 1, 2026

      // Get events filtered for Intro to Modeling workshops in NY after 2026-08-01
      const eventsResult = this.logic.getEvents(
        locationDisplay,
        eventType,
        titleQuery,
        startDateFilter,
        undefined,          // end_date
        'date_asc',         // sort_by
        1,                  // page
        20                  // page_size
      );

      this.assert(eventsResult && Array.isArray(eventsResult.results), 'getEvents should return results array');
      const events = eventsResult.results;
      this.assert(events.length > 0, 'Should find at least one matching Intro to Modeling workshop in NY after 2026-08-01');

      // Identify earliest upcoming matching event (results already sorted ascending by date)
      const selectedEvent = events[0];
      const eventId = selectedEvent.id;
      this.assert(!!eventId, 'Selected event should have an ID');

      // Get full event details
      const eventDetails = this.logic.getEventDetails(eventId);
      this.assert(eventDetails && eventDetails.event, 'getEventDetails should return event');

      const eventObj = eventDetails.event;
      this.assert(eventObj.location_display === locationDisplay, 'Event location should match filter');

      // Ensure pay-on-site (or equivalent) is allowed
      const allowedPaymentOptions = eventObj.payment_options || [];
      this.assert(Array.isArray(allowedPaymentOptions), 'Event payment_options should be an array');
      this.assert(
        allowedPaymentOptions.indexOf('pay_on_site') !== -1,
        'Event should allow pay_on_site as a payment option'
      );

      // Register 2 seats with pay_on_site
      const seatsReserved = 2;
      const paymentOption = 'pay_on_site';

      const registrationResult = this.logic.createEventRegistration(
        eventId,
        seatsReserved,
        paymentOption
      );

      this.assert(registrationResult && registrationResult.success === true, 'createEventRegistration should succeed');
      this.assert(registrationResult.registration, 'createEventRegistration should return registration');

      const registration = registrationResult.registration;
      this.assert(registration.event_id === eventId, 'Registration should reference selected event');
      this.assert(registration.seats_reserved === seatsReserved, 'Registration should reserve requested number of seats');
      this.assert(registration.payment_option === paymentOption, 'Registration payment_option should match requested option');

      // Verify persistence in storage
      const rawRegs = JSON.parse(localStorage.getItem('event_registrations') || '[]');
      const storedReg = rawRegs.find((r) => r.id === registration.id);
      this.assert(storedReg != null, 'Stored event registration should exist');
      this.assert(storedReg.event_id === eventId, 'Stored registration should reference correct event');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper: simple assertion
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  // Helper: record success
  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('', testName);
  }

  // Helper: record failure
  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log(' ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
